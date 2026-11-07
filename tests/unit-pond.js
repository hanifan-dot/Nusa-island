// Uji inti KOLAM IKAN (economy/pond-core.js + ecoPond* di economy/core.js): waktu server, kenyang, kematian idempoten, pakan, upgrade, anti-duplikasi.
const assert = require("assert"), fs = require("fs"), path = require("path");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), PC = require("../economy/pond-core.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 3).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, o) => { buf.set(p, JSON.stringify(o)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12; const H = 3600000, STEP = PC.STEP_MS;
const mk = (o) => { const db = mkdb(); return { db, e: EC.makeEconomyServer(db, Object.assign({ clock: () => now, tables: T, fishmath: FM, pond: PC, trustClientInit: true, initCap: 1e9 }, o || {})) }; };
const U = { uid: "user1" }, V = { uid: "user2" };
let n = 0; const op = () => "op" + (++n) + "xxxxxxxx";
const setCoins = (db, uid, v) => { const k = "shop/economy/" + uid; const d = JSON.parse(db.m.get(k)); d.bal = v; db.m.set(k, JSON.stringify(d)); };
const FISH = (id) => T.FISH.find((f) => f.id === id);
async function boot(o, money) { const x = mk(o); await x.e.ecoInit(U, { money: money == null ? 1e6 : money }); await x.e.ecoInit(V, { money: 1e6 }); return x; }
async function catchFish(e, A, id, w, uid) { now += 2000; uid = uid || "fk" + Math.random().toString(36).slice(2, 10); await e.ecoCatch(A, { opId: op(), id, w, uid }); return uid; }
const putOne = (e, A, u, extra) => e.ecoPondPut(A, { opId: op(), items: [Object.assign({ u }, extra || {})] });
(async () => {
  await t("inti: 100→0 butuh 25 hari; 1% tiap 6 jam; peringatan 30/15/5", () => {
    assert.equal(PC.STEP_MS, 6 * H); const f = { s0: 100, t0: 0 };
    assert.equal(PC.satAt(f, 0), 100); assert.equal(PC.satAt(f, 6 * H - 1), 100); assert.equal(PC.satAt(f, 6 * H), 99);
    assert.equal(PC.deathAt(f), 100 * 6 * H); assert.equal(PC.deathAt(f) / (24 * H), 25); assert.equal(PC.satAt(f, PC.deathAt(f)), 0);
    assert.equal(PC.levelOf(31), "ok"); assert.equal(PC.levelOf(30), "notice"); assert.equal(PC.levelOf(15), "serious"); assert.equal(PC.levelOf(5), "critical"); assert.equal(PC.levelOf(0), "dead");
  });
  await t("kapasitas & harga upgrade sesuai tabel (20/50/100/150/200 KG; 10k/35k/75k/150k)", () => {
    assert.deepEqual(PC.LEVELS.slice(1).map((l) => l.cap), [20, 50, 100, 150, 200]); assert.deepEqual(PC.LEVELS.slice(2).map((l) => l.cost), [10000, 35000, 75000, 150000]);
    assert.deepEqual([PC.FEED.pelet.price, PC.FEED.nutrisi.price, PC.FEED.premium.price], [500, 2000, 5000]);
  });
  await t("tanpa PondCore di server: ecoPond* ditolak (fail-closed) dan ekonomi lama utuh", async () => { const { e } = mk({ pond: null }); await e.ecoInit(U, {}); await assert.rejects(() => e.ecoPondState(U, {}), /belum diaktifkan/); assert.ok((await e.ecoState(U)).init); });
  await t("masuk kolam: pindah atomik dari kotak ikan (tidak bisa dijual lagi), kenyang 100%", async () => { const { e } = await boot(); const u = await catchFish(e, U, "nila", 1.1);
    const r = await putOne(e, U, u); assert.equal(r.pond.fish.length, 1); assert.equal(r.pond.fish[0].sat, 100); assert.ok(!r.box.includes(u));
    const s = await e.ecoSell(U, { opId: op(), uids: [u], day: 3 }); assert.equal(s.total, 0); assert.deepEqual(s.unknown, [u]); });
  await t("ikan orang lain / palsu / sampah / dobel ditolak; akun lain tidak melihat kolamku", async () => { const { e } = await boot(); const u = await catchFish(e, U, "nila", 1.1);
    await assert.rejects(() => putOne(e, V, u), /tidak ada di kotak/); await assert.rejects(() => putOne(e, U, "hantu12345"), /tidak ada di kotak/);
    const sm = await catchFish(e, U, "sandal", 0.2); await assert.rejects(() => putOne(e, U, sm), /Sampah/);
    await assert.rejects(() => e.ecoPondPut(U, { opId: op(), items: [{ u }, { u }] }), /tidak valid/);
    await putOne(e, U, u); assert.equal((await e.ecoPondState(V, {})).pond.fish.length, 0); assert.equal((await e.ecoPondState(U, {})).pond.fish.length, 1); });
  await t("berat & spesies dari server (klien tidak bisa mengirim w/id/kenyang)", async () => { const { e } = await boot(); const u = await catchFish(e, U, "nila", 1.1);
    const r = await e.ecoPondPut(U, { opId: op(), items: [{ u, w: 9999, id: "kerapu_raksasa", s0: 100, t0: 0, sat: 100 }] }); assert.equal(r.pond.fish[0].w, 1.1); assert.equal(r.pond.fish[0].id, "nila"); assert.equal(r.pond.fish[0].t0, now); });
  await t("kapasitas: lv1 20 KG ditegakkan (batas tepat boleh); upgrade menaikkan sampai 200 KG", async () => { const { e } = await boot();
    const mk8 = async () => catchFish(e, U, "patin", 8); const a = await mk8(), b = await mk8(), c = await mk8(), d = await catchFish(e, U, "patin", 4);
    await putOne(e, U, a); await putOne(e, U, b); await assert.rejects(() => putOne(e, U, c), /Kapasitas/); const ok = await putOne(e, U, d); assert.equal(ok.pond.used, 20);       // 8+8+4 = 20 tepat
    const x = await catchFish(e, U, "patin", 1); await assert.rejects(() => putOne(e, U, x), /Kapasitas/);
    for (let lv = 2; lv <= 5; lv++) { const r = await e.ecoPondUpgrade(U, { opId: op(), lv }); assert.equal(r.pond.cap, PC.LEVELS[lv].cap); }
    assert.equal((await e.ecoPondState(U, {})).pond.cap, 200); await putOne(e, U, c); await assert.rejects(() => e.ecoPondUpgrade(U, { opId: op(), lv: 6 }), /maksimum|tidak sesuai/); });
  await t("upgrade: berurutan, harga dari server, koin tidak cukup tidak memotong, opId idempoten", async () => { const { e, db } = await boot({}, 20000);
    await assert.rejects(() => e.ecoPondUpgrade(U, { opId: op(), lv: 3 }), /tidak sesuai/); const id = op(), b0 = (await e.ecoState(U)).balance;
    const r = await e.ecoPondUpgrade(U, { opId: id, lv: 2 }); assert.equal(r.balance, b0 - 10000); const r2 = await e.ecoPondUpgrade(U, { opId: id, lv: 2 }); assert.ok(r2.duplicate); assert.equal(r2.balance, b0 - 10000);
    await assert.rejects(() => e.ecoPondUpgrade(U, { opId: op(), lv: 3 }), /Koin tidak cukup/); assert.equal((await e.ecoState(U)).balance, b0 - 10000); assert.equal((await e.ecoPondState(U, {})).pond.lv, 2); });
  await t("beli pakan: harga server × jumlah, stok bertambah, gagal tidak memotong, spam opId sama tidak menggandakan", async () => { const { e } = await boot({}, 10000); const b0 = (await e.ecoState(U)).balance;
    const id = op(); const r = await e.ecoPondBuy(U, { opId: id, item: "pelet", qty: 4 }); assert.equal(r.price, 2000); assert.equal(r.pond.feed.pelet, 4); assert.equal(r.balance, b0 - 2000);
    for (let i = 0; i < 5; i++) { const d = await e.ecoPondBuy(U, { opId: id, item: "pelet", qty: 4 }); assert.ok(d.duplicate); } const s = await e.ecoPondState(U, {}); assert.equal(s.pond.feed.pelet, 4); assert.equal(s.balance, b0 - 2000);
    await assert.rejects(() => e.ecoPondBuy(U, { opId: op(), item: "premium", qty: 3 }), /Koin tidak cukup/); assert.equal((await e.ecoPondState(U, {})).balance, b0 - 2000);
    await assert.rejects(() => e.ecoPondBuy(U, { opId: op(), item: "emas", qty: 1 }), /tidak dikenal/); await assert.rejects(() => e.ecoPondBuy(U, { opId: op(), item: "pelet", qty: 0 }), /Jumlah/); await assert.rejects(() => e.ecoPondBuy(U, { opId: op(), item: "pelet", qty: 1.5 }), /Jumlah/); });
  await t("pembelian paralel dengan opId berbeda tidak melebihi saldo", async () => { const { e, db } = await boot({}, 1200); const rs = await Promise.allSettled([1, 2, 3, 4].map(() => e.ecoPondBuy(U, { opId: op(), item: "pelet", qty: 1 })));
    const okN = rs.filter((r) => r.status === "fulfilled").length; assert.equal(okN, 2); assert.equal((await e.ecoState(U)).balance, 200); assert.equal((await e.ecoPondState(U, {})).pond.feed.pelet, 2); });
  await t("perlengkapan: batas kepemilikan (aerator/lampu 1, tanaman 3)", async () => { const { e } = await boot(); await e.ecoPondBuy(U, { opId: op(), item: "aerator", qty: 1 }); await assert.rejects(() => e.ecoPondBuy(U, { opId: op(), item: "aerator", qty: 1 }), /maksimal/);
    await e.ecoPondBuy(U, { opId: op(), item: "tanaman", qty: 3 }); await assert.rejects(() => e.ecoPondBuy(U, { opId: op(), item: "tanaman", qty: 1 }), /maksimal/); const s = await e.ecoPondState(U, {}); assert.deepEqual(s.pond.gear, { aerator: 1, tanaman: 3, lampu: 0 }); });
  await t("beri makan: +20/+50/penuh untuk semua ikan, maks 100%, stok -1, tak terpakai bila semua penuh", async () => { const { e } = await boot(); const a = await catchFish(e, U, "nila", 1), b = await catchFish(e, U, "nila", 1); await e.ecoPondPut(U, { opId: op(), items: [{ u: a }, { u: b }] });
    await e.ecoPondBuy(U, { opId: op(), item: "pelet", qty: 2 }); await e.ecoPondBuy(U, { opId: op(), item: "nutrisi", qty: 1 }); await e.ecoPondBuy(U, { opId: op(), item: "premium", qty: 1 });
    await assert.rejects(() => e.ecoPondFeed(U, { opId: op(), kind: "pelet" }), /sudah kenyang 100%/); assert.equal((await e.ecoPondState(U, {})).pond.feed.pelet, 2);
    now += 100 * H; let s = await e.ecoPondState(U, {}); assert.equal(s.pond.fish[0].sat, 100 - Math.floor(100 / 6));     // 16 langkah → 84
    let r = await e.ecoPondFeed(U, { opId: op(), kind: "pelet" }); assert.equal(r.pond.fish[0].sat, 100); assert.equal(r.pond.feed.pelet, 1);
    now += 300 * H; s = await e.ecoPondState(U, {}); assert.equal(s.pond.fish[0].sat, 50); r = await e.ecoPondFeed(U, { opId: op(), kind: "nutrisi" }); assert.equal(r.pond.fish[0].sat, 100);
    now += 590 * H; s = await e.ecoPondState(U, {}); assert.ok(s.pond.fish[0].sat < 100 && s.pond.fish[0].sat > 0); r = await e.ecoPondFeed(U, { opId: op(), kind: "premium" }); assert.equal(r.pond.fish[0].sat, 100); assert.equal(r.pond.feed.premium, 0); });
  await t("stok habis / kolam kosong ditolak tanpa mengurangi apa pun; opId sama tidak mengurangi dua kali", async () => { const { e } = await boot(); await assert.rejects(() => e.ecoPondFeed(U, { opId: op(), kind: "pelet" }), /Kolam kosong/);
    const u = await catchFish(e, U, "nila", 1); await putOne(e, U, u); await assert.rejects(() => e.ecoPondFeed(U, { opId: op(), kind: "pelet" }), /Stok/); await e.ecoPondBuy(U, { opId: op(), item: "pelet", qty: 3 }); now += 12 * H;
    const id = op(); await e.ecoPondFeed(U, { opId: id, kind: "pelet" }); const d = await e.ecoPondFeed(U, { opId: id, kind: "pelet" }); assert.ok(d.duplicate); assert.equal(d.pond.feed.pelet, 2); await assert.rejects(() => e.ecoPondFeed(U, { opId: op(), kind: "ikan" }), /tidak dikenal/); });
  await t("sisa pecahan 6 jam dipertahankan saat memberi makan (tidak merugikan pemain)", async () => { const { e } = await boot(); const u = await catchFish(e, U, "nila", 1); await putOne(e, U, u); await e.ecoPondBuy(U, { opId: op(), item: "pelet", qty: 1 });
    now += 5 * H + 59 * 60000; const s = await e.ecoPondState(U, {}); assert.equal(s.pond.fish[0].sat, 100); await e.ecoPondFeed(U, { opId: op(), kind: "pelet" }).catch(() => {}); /* penuh → ditolak */ now += 2 * 60000; assert.equal((await e.ecoPondState(U, {})).pond.fish[0].sat, 99); });
  await t("kematian: tepat saat 0%, bukan sebelum; waktu mati = t0+s0×6j walau login jauh sesudahnya; riwayat tercatat; ikan lain & inventaris utuh", async () => { const { e } = await boot(); const a = await catchFish(e, U, "nila", 1), keep = await catchFish(e, U, "patin", 2); const t0 = now + 1; now = t0; await putOne(e, U, a);
    const inv = (await e.ecoState(U)).box.slice(); now = t0 + 100 * STEP - 1; let s = await e.ecoPondState(U, {}); assert.equal(s.pond.fish.length, 1); assert.equal(s.pond.fish[0].sat, 1); assert.ok(s.pond.fish[0].eta <= 1);
    now = t0 + 100 * STEP; s = await e.ecoPondState(U, {}); assert.equal(s.pond.fish.length, 0); assert.deepEqual(s.died, [a]); assert.equal(s.pond.hist.length, 1); assert.equal(s.pond.hist[0].at, t0 + 100 * STEP); assert.equal(s.pond.hist[0].u, a); assert.equal(s.pond.deaths, 1);
    assert.deepEqual(s.box.slice().sort(), inv.slice().sort()); assert.ok(s.box.includes(keep)); });
  await t("kematian idempoten: dipanggil berulang/paralel/login ulang hanya sekali tercatat", async () => { const { e } = await boot(); const a = await catchFish(e, U, "nila", 1), b = await catchFish(e, U, "nila", 1); await e.ecoPondPut(U, { opId: op(), items: [{ u: a }, { u: b }] }); now += 101 * STEP;
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => e.ecoPondState(U, {}))); const s = await e.ecoPondState(U, {}); assert.equal(s.pond.deaths, 2); assert.equal(s.pond.hist.length, 2); assert.equal(rs.filter((r) => r.died.length).length, 1); assert.deepEqual(s.died, []); });
  await t("ikan yang mati tidak bisa 'dihidupkan' lewat simpanan lama (ecoCatch melewati uid kolam/riwayat) — tak ada duplikasi/jual", async () => { const { e } = await boot(); const a = await catchFish(e, U, "nila", 1), b = await catchFish(e, U, "nila", 1); await putOne(e, U, a); now += 101 * STEP; await e.ecoPondState(U, {});
    const r = await e.ecoCatch(U, { opId: op(), items: [{ id: "nila", w: 1, uid: a }] }); assert.deepEqual(r.skipped, [a]); assert.ok(!r.box.includes(a)); const s = await e.ecoSell(U, { opId: op(), uids: [a], day: 2 }); assert.equal(s.total, 0);
    now += 2000; await putOne(e, U, b); now += 2000; const c = await e.ecoCatch(U, { opId: op(), items: [{ id: "nila", w: 1, uid: b }] }); assert.deepEqual(c.skipped, [b]); });
  await t("ubah jam HP / login ulang / refresh tidak mempercepat: klien tidak punya jalur kirim waktu; state berulang tak mengubah data", async () => { const { e, db } = await boot(); const u = await catchFish(e, U, "nila", 1); await putOne(e, U, u); now += 10 * H;
    const before = JSON.stringify(await e.ecoPondState(U, { now: 9e15, t0: 0, sat: 1, s0: 1 })); for (let i = 0; i < 20; i++) await e.ecoPondState(U, { now: 0, sat: 0 }); assert.equal(JSON.stringify(await e.ecoPondState(U, {})), before);
    const s = await e.ecoPondState(U, {}); assert.equal(s.pond.fish[0].sat, 99); });
  await t("state hanya menulis saat ada perubahan (hemat kuota Firestore)", async () => { const { e, db } = await boot(); const u = await catchFish(e, U, "nila", 1); await putOne(e, U, u); let w = 0; const orig = db.tx; db.tx = (fn) => orig((t) => fn({ get: t.get, set: (...a) => { w++; return t.set(...a); } }));
    for (let i = 0; i < 5; i++) await e.ecoPondState(U, {}); assert.equal(w, 0); });
  await t("ambil ikan: kembali ke kotak (bisa dijual lagi), limbo sampai 'got', tidak ganda; ikan orang lain ditolak", async () => { const { e } = await boot(); const u = await catchFish(e, U, "nila", 1.2); await putOne(e, U, u, { vr: "emas", t: 5 });
    await assert.rejects(() => e.ecoPondTake(V, { opId: op(), uids: [u] }), /sudah tidak ada/); const id = op(); const r = await e.ecoPondTake(U, { opId: id, uids: [u] }); assert.equal(r.took[0].vr, "emas"); assert.ok(r.box.includes(u)); assert.equal(r.pond.fish.length, 0); assert.equal(r.pond.limbo.length, 1);
    const d = await e.ecoPondTake(U, { opId: id, uids: [u] }); assert.ok(d.duplicate); await assert.rejects(() => e.ecoPondTake(U, { opId: op(), uids: [u] }), /sudah tidak ada/);
    let s = await e.ecoPondState(U, {}); assert.equal(s.pond.limbo.length, 1); s = await e.ecoPondState(U, { got: [u] }); assert.equal(s.pond.limbo.length, 0); const sold = await e.ecoSell(U, { opId: op(), uids: [u], day: 4 }); assert.ok(sold.total > 0); });
  await t("masuk-ambil berulang: kenyang direset ke 100% saat masuk lagi (aturan 'ikan baru dimasukkan 100%')", async () => { const { e } = await boot(); const u = await catchFish(e, U, "nila", 1); await putOne(e, U, u); now += 60 * H; await e.ecoPondTake(U, { opId: op(), uids: [u] });
    const r = await putOne(e, U, u); assert.equal(r.pond.fish[0].sat, 100); });
  await t("paralel: masuk-ambil bersamaan tidak membuat ikan di dua tempat", async () => { const { e } = await boot(); const u = await catchFish(e, U, "nila", 1); await putOne(e, U, u);
    const rs = await Promise.allSettled([e.ecoPondTake(U, { opId: op(), uids: [u] }), e.ecoPondTake(U, { opId: op(), uids: [u] }), putOne(e, U, u)]); const s = await e.ecoPondState(U, {});
    const inBox = s.box.includes(u), inPond = s.pond.fish.some((f) => f.u === u); assert.ok(inBox !== inPond, "ikan tepat di satu tempat"); });
  await t("riwayat kematian: tanda 'seen' lewat ack; batas panjang riwayat", async () => { const { e } = await boot(); const u = await catchFish(e, U, "nila", 1); await putOne(e, U, u); now += 101 * STEP; let s = await e.ecoPondState(U, {}); assert.equal(s.pond.hist[0].seen, false);
    s = await e.ecoPondState(U, { seen: [u] }); assert.equal(s.pond.hist[0].seen, true); });
  await t("sinkron Functions lib = sumber; sync-economy menyertakan pond-core; callable terdaftar", () => { const r = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8"); assert.ok(r("firebase/functions/lib/pond-core.js").endsWith(r("economy/pond-core.js"))); assert.ok(r("firebase/functions/lib/economy-core.js").endsWith(r("economy/core.js")));
    const idx = r("firebase/functions/index.js"); for (const f of ["ecoPondState", "ecoPondPut", "ecoPondTake", "ecoPondFeed", "ecoPondBuy", "ecoPondUpgrade"]) assert.ok(idx.includes('"' + f + '"'), f); assert.ok(/pond: require\("\.\/lib\/pond-core"\)/.test(idx)); });
  console.log(`unit-pond: ${pass} lolos, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
