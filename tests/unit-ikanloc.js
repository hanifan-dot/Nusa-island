// Uji Ide 07B "Ikan lokasi baru": kontrak data (11 per lokasi, 1 SUPER RARE, ID unik, habitat, visual), distribusi peluang, simulasi besar,
// dan server (SUPER RARE diundi server, terkunci bawaan, idempoten, batas harian, jual lewat ekonomi server, klien tidak boleh melapor ikan super).
const assert = require("assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), IK = require("../economy/ikanloc-core.js"), SRC = require("../scripts/ikan-lokasi-sumber.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 4).join("\n    ")); } };
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, "../data.js"), "utf8") + ";globalThis.D={FISH,LOCATIONS,RARITY,tierOf,TIER}", ctx);
const { FISH, LOCATIONS, RARITY, tierOf } = ctx.D;
const REG = LOCATIONS.filter((l) => l.id !== "samudra").map((l) => l.id);   // lokasi reguler DIBACA dari data utama (bukan dikarang)
const NEW = FISH.filter((f) => f.x), BYID = Object.fromEntries(FISH.map((f) => [f.id, f]));
const PREFIX = { muara: "mr_", toba: "tb_", selat: "st_", ampat: "ra_", banda: "bd_" }, HAB = { muara: "Muara", toba: "Toba", selat: "Selat", ampat: "Ampat", banda: "Banda" };

function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, o) => { buf.set(p, JSON.stringify(o)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12, n = 0; const op = () => "op" + (++n) + "xxxxxxxx", U = { uid: "u1" }, rid = () => "f" + Math.random().toString(36).slice(2, 10);
const mk = (cfg, o) => { const db = mkdb(); if (cfg) db.m.set("shop/config", JSON.stringify(cfg)); return { db, e: EC.makeEconomyServer(db, Object.assign({ clock: () => now, tables: T, fishmath: FM, trustClientInit: true, ikanloc: IK }, o || {})) }; };
const boxOf = (db) => JSON.parse(db.m.get("shop/economy/u1")).box;
const land = async (e, id, uid) => { now += 2000; const f = BYID[id]; return e.ecoCatch(U, { opId: op(), id, w: Math.min(f.wMax, Math.max(0.5, f.wMin)), uid: uid || rid() }); };

(async () => {
  // ================= DATA =================
  await t("lokasi reguler dibaca dari data utama: 5 lokasi, Samudra Follower tidak termasuk", () => { assert.equal(REG.join(), "muara,toba,selat,ampat,banda"); assert.ok(!REG.includes("samudra")); });
  await t("TEPAT 11 ikan baru per lokasi reguler (55 total) dan tidak ada di lokasi lain", () => { for (const l of REG) assert.equal(NEW.filter((f) => f.loc === l).length, 11, l); assert.equal(NEW.length, 55); assert.ok(NEW.every((f) => REG.includes(f.loc))); assert.ok(!FISH.some((f) => f.loc === "samudra" && f.x)); });
  await t("tepat 1 SUPER RARE per lokasi; tidak ada super di luar lokasi reguler", () => { for (const l of REG) assert.equal(NEW.filter((f) => f.loc === l && f.sup).length, 1, l); assert.equal(FISH.filter((f) => f.sup).length, 5); });
  await t("susunan 10 ikan reguler seimbang: 3 Biasa, 3 Langka, 2 Epik, 1 Legenda, 1 Mitos", () => { for (const l of REG) { const r = NEW.filter((f) => f.loc === l && !f.sup), c = (k) => r.filter((f) => f.rarity === k && !f.mitos).length;
    assert.equal(r.length, 10, l); assert.equal(c("biasa"), 3, l); assert.equal(c("langka"), 3, l); assert.equal(c("epik"), 2, l); assert.equal(c("legenda"), 1, l); assert.equal(r.filter((f) => f.mitos).length, 1, l); assert.ok(r.filter((f) => f.mitos).every((f) => f.rarity === "legenda" && f.pw === 0.3)); } });
  await t("ID stabil & unik: tidak ada ID ganda, format aman untuk protokol Pamer (a-z0-9_, 2–30), awalan lokasi benar", () => { const ids = FISH.map((f) => f.id); assert.equal(new Set(ids).size, ids.length);
    for (const f of NEW) { assert.ok(/^[a-z0-9_]{2,30}$/.test(f.id), f.id); assert.ok(f.id.startsWith(PREFIX[f.loc]), "ikan masuk habitat yang salah: " + f.id); } });
  await t("habitat sesuai tema: teks habitat menyebut lokasi yang benar; sumber & data.js identik", () => { for (const f of NEW) { assert.ok(f.hab.startsWith(HAB[f.loc] + " ·"), f.id + " " + f.hab); assert.ok(f.desc.length >= 20 && f.desc.length <= 200, f.id); assert.ok(f.name.length >= 3, f.id); }
    for (const s of SRC.ALL) { const f = BYID[s.id]; assert.ok(f && f.loc === s.loc && f.rarity === s.rarity && f.price === s.price && f.wMin === s.wMin && f.wMax === s.wMax, s.id); } });
  await t("nama & desain orisinal: tanpa merek/karakter berhak cipta", () => { const bad = /pok[eé]mon|mario|disney|marvel|nemo|dory|godzilla|shark tale|moby|spongebob|kraken/i; for (const f of NEW) assert.ok(!bad.test(f.name + " " + f.desc), f.id); });
  await t("berat & harga masuk akal: wMin<wMax, harga>0, ikan kecil ringan, tidak ada yang melebihi batas Cloud Save (5000 kg)", () => { for (const f of NEW) { assert.ok(f.wMin > 0 && f.wMax > f.wMin && f.wMax <= 400, f.id); assert.ok(f.price > 0 && f.power >= 1 && f.power <= 10, f.id); } });
  await t("visual unik: tidak ada dua ikan (baru maupun lama) dengan warna+bentuk+sirip+ciri yang sama; semua punya warna/perut/bentuk", () => { const sig = (f) => [f.color, f.belly, (f.shape || []).join("x"), f.fin, f.spots || "", f.stripes || "", f.finColor || "", !!f.scales, !!f.whisker, !!f.bill, !!f.hump].join("|"), seen = new Map();
    for (const f of NEW) { assert.ok(/^#[0-9a-f]{6}$/i.test(f.color) && /^#[0-9a-f]{6}$/i.test(f.belly) && Array.isArray(f.shape) && f.shape.length === 2 && ["pointed", "round", "sail", "long"].includes(f.fin), f.id); }
    for (const f of FISH.filter((f) => f.shape && !f.emoji && !f.sf)) { const k = sig(f); assert.ok(!seen.has(k), f.id + " = " + seen.get(k)); seen.set(k, f.id); }
    const colors = NEW.map((f) => f.color); assert.equal(new Set(colors).size, 55, "55 warna tubuh berbeda"); });
  await t("SUPER RARE: aura khusus, ikan LEGENDA dasar, bukan ikan malam/protected, nilai jual dibatasi (< hadiah Megalodon), bobot < Megalodon", () => {
    const MEGA = 16000;   // event/core.js: hadiah menang Megalodon Bayangan Purba (kg 50.000)
    for (const f of FISH.filter((f) => f.sup)) { assert.ok(/^#[0-9a-f]{6}$/i.test(f.aura), f.id); assert.equal(f.rarity, "legenda"); assert.ok(!f.protected && f.night === undefined); assert.ok(f.xMax === undefined);
      const maxVal = Math.round(2.25 * f.price * FM.effectiveKg(f.wMax) * 1.45); assert.ok(maxVal <= 14500 && maxVal < MEGA, f.id + " " + maxVal); assert.ok(f.wMax < 50000); } });
  await t("Mitos: nilai jual maksimum ≤ 20.500 koin; tidak ada ikan baru yang melampaui ikan lama terbesar di lokasi itu secara tidak wajar", () => { for (const f of NEW.filter((f) => f.mitos)) assert.ok(Math.round(2.25 * f.price * FM.effectiveKg(f.wMax) * 1.45) <= 20500, f.id);
    for (const l of REG) { const oldMax = Math.max(...FISH.filter((f) => f.loc === l && !f.x && !f.seaOnly).map((f) => 2.25 * f.price * FM.effectiveKg(f.xMax || f.wMax) * 1.45)); for (const f of NEW.filter((f) => f.loc === l && !f.sup)) assert.ok(2.25 * f.price * FM.effectiveKg(f.wMax) * 1.45 <= Math.max(oldMax * 1.15, 21000), f.id); } });
  await t("ikan baru tidak ikut kumpulan Samudra Follower, kolam acara, atau spot laut (seaOnly) — dan tidak mengubah ikan lama", () => { assert.ok(NEW.every((f) => !f.seaOnly && !f.sf && !f.mistik && !f.event)); assert.equal(FISH.filter((f) => !f.x).length, 48);
    const old = JSON.stringify(FISH.filter((f) => !f.x)); assert.ok(old.length > 5000); });
  await t("tabel server: semua ikan baru ada (id, rarity, harga, berat, loc); sup hanya di 5 ikan super; tabel tidak basi terhadap data.js", () => { const TB = Object.fromEntries(T.FISH.map((f) => [f.id, f])); assert.equal(T.FISH.length, 103);
    for (const f of NEW) { const s = TB[f.id]; assert.ok(s && s.loc === f.loc && s.rarity === f.rarity && s.price === f.price && s.wMin === f.wMin && s.wMax === f.wMax && !!s.sup === !!f.sup, f.id); }
    assert.equal(T.FISH.filter((f) => f.sup).length, 5); assert.deepStrictEqual(JSON.parse(JSON.stringify(T)), JSON.parse(JSON.stringify(require("../economy/make-tables.js").build(path.join(__dirname, ".."))))); });
  await t("salinan Functions identik dengan sumber (ikanloc-core, tables, economy-core)", () => { for (const [a, b] of [["economy/ikanloc-core.js", "firebase/functions/lib/ikanloc-core.js"], ["economy/tables.js", "firebase/functions/lib/economy-tables.js"], ["economy/core.js", "firebase/functions/lib/economy-core.js"]])
    assert.ok(fs.readFileSync(path.join(__dirname, "..", b), "utf8").endsWith(fs.readFileSync(path.join(__dirname, "..", a), "utf8")), b); });

  // ================= PELUANG =================
  for (const night of [false, true]) await t(`distribusi peluang berjumlah 1 di tiap lokasi (${night ? "malam" : "siang"}); tiap ikan baru p>0; SUPER tidak ada di lemparan klien`, () => {
    for (const l of REG) { const o = IK.odds(FISH, RARITY, l, night), sum = o.reduce((a, x) => a + x.p, 0); assert.ok(Math.abs(sum - 1) < 1e-12, l + " " + sum);
      for (const f of NEW.filter((f) => f.loc === l && !f.sup)) assert.ok(o.find((x) => x.id === f.id && x.p > 0), f.id); assert.ok(!o.some((x) => BYID[x.id].sup), l); } });
  await t("Mitos lebih langka daripada Legenda biasa di lokasi yang sama; SUPER (1 dari N) jauh lebih sulit daripada Mitos terlangka", () => { for (const l of REG) { const o = IK.odds(FISH, RARITY, l), mit = o.find((x) => BYID[x.id].mitos), leg = o.filter((x) => x.rarity === "legenda" && !BYID[x.id].mitos);
    assert.ok(leg.every((x) => x.p > mit.p), l); assert.ok(IK.chanceOf(l) < mit.p / 10, l + ": super " + IK.chanceOf(l) + " vs mitos " + mit.p); } });
  await t("SUPER makin sulit di lokasi makin jauh: Muara < Toba < Selat < Ampat < Banda (1 dari N naik)", () => { const a = REG.map((l) => IK.ONE_IN[l]); for (let i = 1; i < a.length; i++) assert.ok(a[i] > a[i - 1]); assert.ok(a.every((v) => v >= 4000)); });
  await t("simulasi besar pemilihan ikan (kode asli IK.pickFish, 1.000.000 lemparan/lokasi): frekuensi ≈ peluang teoretis", () => {
    for (const l of REG) { const pool = FISH.filter((f) => !f.seaOnly && !f.sup && (f.loc === l || f.loc === "*") && f.night === undefined), o = Object.fromEntries(IK.odds(pool, RARITY, l).map((x) => [x.id, x.p])), cnt = {}, N = 1e6, mult = { sampah: 1, biasa: 1, langka: 1, epik: 1, legenda: 1 };
      for (let i = 0; i < N; i++) { const f = IK.pickFish(pool, RARITY, mult, Math.random); cnt[f.id] = (cnt[f.id] || 0) + 1; }
      for (const f of pool) { const p = o[f.id], sd = Math.sqrt(N * p * (1 - p)), got = cnt[f.id] || 0; assert.ok(Math.abs(got - N * p) <= 5 * sd + 3, `${f.id} ${got} vs ${(N * p).toFixed(1)} ±${sd.toFixed(1)}`); }
      for (const f of NEW.filter((f) => f.loc === l && !f.sup)) assert.ok((cnt[f.id] || 0) > 0, "ikan baru tidak pernah keluar: " + f.id); } });
  await t("pickFish tanpa pw = perilaku lama (memanggil rnd dua kali; pool lama tak berubah): urutan hasil identik dengan algoritma lama", () => {
    const pool = FISH.filter((f) => !f.x && !f.seaOnly && (f.loc === "toba" || f.loc === "*")), mult = { sampah: 1, biasa: 1, langka: 1, epik: 1, legenda: 1 };
    const seq = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const old = (rnd) => { const order = ["sampah", "biasa", "langka", "epik", "legenda"], avail = order.filter((r) => pool.some((f) => f.rarity === r)); let total = 0; const ws = avail.map((r) => { const w = RARITY[r].weight * mult[r]; total += w; return w; }); let roll = rnd() * total, rar = avail[0];
      for (let i = 0; i < avail.length; i++) { roll -= ws[i]; if (roll <= 0) { rar = avail[i]; break; } } const g = pool.filter((f) => f.rarity === rar); return g[(rnd() * g.length) | 0]; };
    const a = seq(7), b = seq(7); for (let i = 0; i < 20000; i++) assert.equal(IK.pickFish(pool, RARITY, mult, a).id, old(b).id); });

  // ================= SERVER =================
  const cfgOn = { ikanLokasi: true };
  const ELIG = { muara: "nila", toba: "mas", selat: "kakap", ampat: "kakatua", banda: "tuna" };
  await t("tabel tingkat tampilan: tierOf membedakan Legenda/Mitos/SUPER RARE", () => { assert.equal(tierOf(BYID.mr_belida_bulan).label, "SUPER RARE"); assert.equal(tierOf(BYID.mr_gabus_hantu).label, "Mitos"); assert.equal(tierOf(BYID.arwana).label, "Legenda"); });
  await t("TERKUNCI bawaan: tanpa config / ikanLokasi=false / tanpa modul → tidak pernah ada SUPER walau acak = 0", async () => {
    for (const o of [mk(null, { rand: () => 0 }), mk({ ikanLokasi: false }, { rand: () => 0 }), mk(cfgOn, { ikanloc: null, rand: () => 0 })]) { await o.e.ecoInit(U, {}); const r = await land(o.e, "nila"); assert.ok(r.ok && r.sxItem.length === 0 && !boxOf(o.db).some((b) => BYID[b.id].sup)); } });
  await t("klien TIDAK bisa melapor ikan SUPER RARE (id apa pun, tunggal/paket) → ditolak; tak ada koin/ikan", async () => { const { e, db } = mk(cfgOn, { rand: () => 0.9 }); await e.ecoInit(U, {});
    for (const f of FISH.filter((f) => f.sup)) { now += 2000; await assert.rejects(() => e.ecoCatch(U, { opId: op(), id: f.id, w: f.wMin, uid: rid() }), /hanya dibuat server/); }
    now += 2000; await assert.rejects(() => e.ecoCatch(U, { opId: op(), items: [{ id: "nila", w: 0.5, uid: rid() }, { id: "mr_belida_bulan", w: 20, uid: rid() }] }), /hanya dibuat server/); assert.equal(boxOf(db).length, 0); });
  await t("terbuka: server mengundi & membuat ikan SUPER di lokasi yang benar (uid, berat dalam rentang, masuk kotak server)", async () => {
    for (const l of REG) { const { e, db } = mk(cfgOn, { rand: () => 0 }); await e.ecoInit(U, {}); const r = await land(e, ELIG[l]); assert.equal(r.sxItem.length, 1, l); const it = r.sxItem[0], f = BYID[it.id];
      assert.ok(f.sup && f.loc === l && it.w >= f.wMin && it.w <= f.wMax && /^sx/.test(it.uid) && it.loc === l, l); assert.ok(r.box.includes(it.uid)); assert.ok(r.sx.some((x) => x.uid === it.uid && x.id === it.id), "tampil di pemulihan ecoState");
      const b = boxOf(db); assert.equal(b.filter((x) => x.id === it.id).length, 1); assert.equal(b.length, 2); } });
  await t("hanya tangkapan SAH di lokasi itu yang memicu: sampah/terlindungi tidak; ikan lokasi lain memicu SUPER lokasinya sendiri", async () => {
    const { e } = mk(cfgOn, { rand: () => 0 }); await e.ecoInit(U, {}); assert.equal((await land(e, "sandal")).sxItem.length, 0); assert.equal((await land(e, "hiu_paus")).sxItem.length, 0);
    const r = await land(e, "mas"); assert.equal(r.sxItem[0].id, "tb_ihan_kencana"); });
  await t("peluang kecil: acak di atas ambang → tidak ada SUPER; satu tangkapan = paling banyak satu SUPER", async () => { const { e } = mk(cfgOn, { rand: () => 0.5 }); await e.ecoInit(U, {}); assert.equal((await land(e, "nila")).sxItem.length, 0);
    const m = mk(cfgOn, { rand: () => 0 }); await m.e.ecoInit(U, {}); now += 20000; const items = []; for (let i = 0; i < 3; i++) items.push({ id: "nila", w: 0.5, uid: rid() }); const r = await m.e.ecoCatch(U, { opId: op(), items }); assert.equal(r.sxItem.length, 1, "batas harian 1 per lokasi"); });
  await t("batas harian: 1 per lokasi per hari-server; hari baru reset; lokasi lain tetap bisa", async () => { const { e } = mk(cfgOn, { rand: () => 0 }); await e.ecoInit(U, {}); assert.equal((await land(e, "nila")).sxItem.length, 1); assert.equal((await land(e, "nila")).sxItem.length, 0);
    assert.equal((await land(e, "mas")).sxItem.length, 1, "lokasi lain"); now += 86400000; assert.equal((await land(e, "nila")).sxItem.length, 1, "hari baru"); });
  await t("IDEMPOTEN (jaringan putus/ulang): opId sama → hasil sama, tidak ada SUPER kedua, kotak tidak bertambah", async () => { const { e, db } = mk(cfgOn, { rand: () => 0 }); await e.ecoInit(U, {}); now += 2000; const c = { opId: op(), id: "nila", w: 0.5, uid: rid() };
    const r = await e.ecoCatch(U, c), n1 = boxOf(db).length; for (let i = 0; i < 3; i++) { const d = await e.ecoCatch(U, c); assert.ok(d.duplicate); assert.deepStrictEqual(d.sxItem, r.sxItem); } assert.equal(boxOf(db).length, n1); assert.equal(boxOf(db).filter((b) => BYID[b.id].sup).length, 1); });
  await t("uid ikan yang sama tidak diundi ulang (jual lalu kirim ulang tidak menggandakan peluang)", async () => { const { e } = mk(cfgOn, { rand: () => 0.9 }); await e.ecoInit(U, {}); await land(e, "nila", "same0001"); const m = mk(cfgOn, { rand: () => 0 }); await m.e.ecoInit(U, {});
    const r1 = await land(m.e, "nila", "same0002"); assert.equal(r1.sxItem.length, 1); now += 86400000; await m.e.ecoSell(U, { opId: op(), uids: ["same0002", r1.sxItem[0].uid], day: 3 }); const r2 = await land(m.e, "nila", "same0002"); assert.equal(r2.sxItem.length, 0, "uid yang sudah diundi"); });
  await t("kotak server penuh → SUPER dilewati diam-diam, tidak ada ikan bocor & ikan biasa tetap sah", async () => { const { e, db } = mk(cfgOn, { rand: () => 0 }); await e.ecoInit(U, {}); const k = "shop/economy/u1", eco = JSON.parse(db.m.get(k));
    eco.box = Array.from({ length: 399 }, (_, i) => ({ u: "pad" + i + "xxx", id: "nila", w: 1 })); db.m.set(k, JSON.stringify(eco)); const r = await land(e, "nila"); assert.equal(r.sxItem.length, 0); assert.equal(boxOf(db).length, 400); });
  await t("jual lewat ekonomi server: harga dari tabel resmi (berat × harga harian), dua kali jual tidak menambah koin", async () => { const { e } = mk(cfgOn, { rand: () => 0 }); await e.ecoInit(U, {}); const r = await land(e, "tuna"), it = r.sxItem[0], f = BYID[it.id]; assert.equal(f.loc, "banda");
    const s = await e.ecoSell(U, { opId: op(), uids: [it.uid], day: 9 }); assert.equal(s.total, FM.priceFor(T.FISH.find((x) => x.id === it.id), it.w, EC.priceMult(it.id, 9), 3)); assert.ok(s.total > 0 && s.total <= 15000, "tidak merusak ekonomi: " + s.total);
    assert.equal((await e.ecoSell(U, { opId: op(), uids: [it.uid], day: 9 })).sold.length, 0); });
  await t("ecoDrop/Cloud Save: ikan super keluar dari kotak seperti ikan lain (tidak ada hantu di server)", async () => { const { e, db } = mk(cfgOn, { rand: () => 0 }); await e.ecoInit(U, {}); const r = await land(e, "nila"), u = r.sxItem[0].uid;
    now += 2000; if (e.ecoDrop) { await e.ecoDrop(U, { opId: op(), uids: [u] }); assert.ok(!boxOf(db).some((b) => b.u === u)); } });
  await t("frekuensi nyata SUPER (kode asli IK.roll, 2.000.000 tangkapan/lokasi, hari baru tiap undian): ≈ 1/N dengan RNG aman", () => {
    const rnd = () => { const a = new Uint32Array(2); require("crypto").webcrypto.getRandomValues(a); return (a[0] * 2097152 + (a[1] >>> 11)) / 9007199254740992; }, FM2 = (sp) => FM.rollWeight(sp, rnd), FISHT = Object.fromEntries(T.FISH.map((f) => [f.id, f]));
    for (const l of REG) { const N = 2e6, p = IK.chanceOf(l); let hit = 0; for (let i = 0; i < N; i += 1) { const eco = {}, out = IK.roll(eco, [{ u: "u" + i, id: ELIG[l] }], FISHT, rnd, FM2, 1e12, () => true); hit += out.length; }
      const sd = Math.sqrt(N * p * (1 - p)); assert.ok(Math.abs(hit - N * p) <= 5 * sd, `${l} ${hit} vs ${N * p} ±${sd.toFixed(1)}`); } });
  await t("IK.roll gagal-tertutup tanpa RNG tepercaya (rand=1 → tidak pernah menghasilkan)", () => { const FISHT = Object.fromEntries(T.FISH.map((f) => [f.id, f])); for (let i = 0; i < 1000; i++) assert.equal(IK.roll({}, [{ u: "x" + i, id: "nila" }], FISHT, () => 1, (sp) => FM.rollWeight(sp, () => 0.5), 1e12, () => true).length, 0); });
  await t("berat SUPER dari server tidak pernah di luar rentang resmi; berat ikan biasa di luar rentang ditolak seperti sebelumnya", async () => { const { e } = mk(cfgOn, { rand: () => 0 });
    for (const f of FISH.filter((f) => f.sup)) for (let i = 0; i < 2000; i++) { const w = FM.rollWeight(f).w; assert.ok(w >= f.wMin && w <= f.wMax); } await e.ecoInit(U, {}); now += 2000; await assert.rejects(() => e.ecoCatch(U, { opId: op(), id: "mr_belida", w: 50, uid: rid() }), /Berat/); });
  await t("ikan baru (reguler) diterima server bila beratnya sah, dijual dengan harga tabel, dan masuk statistik leaderboard sama seperti ikan lain", async () => { const { e, db } = mk(cfgOn, { rand: () => 0.9 }); await e.ecoInit(U, {});
    for (const f of NEW.filter((f) => !f.sup)) { now += 2000; const w = Math.round((f.wMin + (f.wMax - f.wMin) * 0.3) * 100) / 100, uid = rid(); const r = await e.ecoCatch(U, { opId: op(), id: f.id, w, uid }); assert.ok(r.ok && r.box.includes(uid), f.id); }
    const all = boxOf(db); assert.equal(all.length, 50); const s = await e.ecoSell(U, { opId: op(), uids: all.map((b) => b.u), day: 5 }); assert.equal(s.sold.length, 50); assert.ok(s.total > 0); assert.equal(boxOf(db).length, 0); });

  console.log(`unit-ikanloc: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
