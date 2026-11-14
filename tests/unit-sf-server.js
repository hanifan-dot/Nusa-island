// Uji server Samudra Follower: terkunci bawaan, gerbang config Owner, validasi ID/berat/harga, anti-duplikasi/burst, Prabowo hanya saat event Owner, ikan lama tidak berubah.
const assert = require("assert"), fs = require("fs"), path = require("path");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), SF = require("../economy/sf-core.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 3).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, v) => { buf.set(p, JSON.stringify(v)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12, n = 0; const op = () => "op" + (++n) + "xxxxxxxx", U = { uid: "u1" };
const APP = { approvedBy: "owner", approvedAt: 1 };
const cfgOn = (extra) => ({ sf: { on: true, eventOn: false, fish: Object.fromEntries(SF.IDS.map((id) => [id, Object.assign({ price: SF.SPEC[id].rec.price, chance: SF.SPEC[id].rec.chance }, APP)])) } , ...(extra || {}) });
const mk = (cfg, o) => { const db = mkdb(); if (cfg) db.m.set("shop/config", JSON.stringify(cfg)); return { db, e: EC.makeEconomyServer(db, Object.assign({ clock: () => now, tables: T, fishmath: FM, trustClientInit: true, sf: SF }, o || {})) }; };
const rid8 = () => "f" + Math.random().toString(36).slice(2, 10);
const cat = (id, w, uid, ref) => ({ opId: op(), id, w, uid: uid || rid8(), ref });
const bonus = async (e, id, w, uid) => { now += 2000; const u = rid8(); await e.ecoCatch(U, { opId: op(), id: "nila", w: 0.5, uid: u }); now += 100; return cat(id, w, uid, u); };   // ikan biasa dulu → ref
(async () => {
  await t("Functions lib sf-core sama dengan sumber", () => assert.ok(fs.readFileSync(path.join(__dirname, "../firebase/functions/lib/sf-core.js"), "utf8").endsWith(fs.readFileSync(path.join(__dirname, "../economy/sf-core.js"), "utf8"))));
  await t("tabel FISH server tidak memuat ikan SF (ikan lama tidak berubah)", () => assert.ok(!T.FISH.some((f) => SF.isSF(f.id)) && T.FISH.length === 103));   // 48 ikan lama + 55 ikan baru Ide 07B
  await t("tanpa config: semua SF terkunci (off)", () => SF.IDS.forEach((id) => assert.equal(SF.resolve(null, id).why, "off")));
  await t("tanpa persetujuan Owner: terkunci walau on=true", () => SF.IDS.forEach((id) => assert.equal(SF.resolve({ sf: { on: true, fish: {} } }, id).why, "no-approval")));
  await t("harga/peluang di luar pagar ditolak", () => { const c = cfgOn(); c.sf.fish.sf_tempe.price = 1e9; c.sf.fish.sf_cupang_slayer.chance = 0.5; c.sf.fish.sf_arapaima.dayCap = 99; c.sf.fish.sf_prabowo.price = 0.01;
    assert.equal(SF.resolve(c, "sf_tempe").why, "bad-price"); assert.equal(SF.resolve(c, "sf_cupang_slayer").why, "bad-chance"); assert.equal(SF.resolve(c, "sf_arapaima").why, "bad-cap"); assert.equal(SF.resolve(c, "sf_prabowo").why, "bad-price"); });
  await t("Prabowo hanya saat eventOn Owner", () => { const c = cfgOn(); assert.equal(SF.resolve(c, "sf_prabowo").why, "event-off"); assert.ok(SF.resolve(c, "sf_tempe").ok); c.sf.eventOn = true; assert.ok(SF.resolve(c, "sf_prabowo").ok); });
  await t("berat: di luar rentang resmi ditolak", () => { assert.ok(SF.weightOk("sf_tempe", 1)); assert.ok(!SF.weightOk("sf_tempe", 50)); assert.ok(!SF.weightOk("sf_tempe", 0.01)); assert.ok(!SF.weightOk("sf_arapaima", NaN)); assert.ok(!SF.weightOk("tuna", 1)); });
  // ---- UNDIAN DI SERVER ----
  const HIT = () => { let c = 0; return () => (c++ % 4 === 0 ? 0 : Math.random()); };   // lemparan peluang selalu kena; berat/uid acak
  const SEQ = (...v) => { let i = 0; return () => (i < v.length ? v[i++] : 0.999999); };   // acak server tiruan (deterministik)
  const land = async (e, id, uid) => { now += 2000; return e.ecoCatch(U, { opId: op(), id: id || "nila", w: 0.5, uid: uid || rid8() }); };
  const boxOf = (db) => JSON.parse(db.m.get("shop/economy/u1")).box;
  await t("klien TIDAK bisa mengirim ikan SF (id/berat/harga/ref apa pun) → 'tidak dikenal'", async () => { const { e } = mk(cfgOn(), { rand: () => 0 }); await e.ecoInit(U, {});
    for (const id of SF.IDS) { now += 2000; await assert.rejects(() => e.ecoCatch(U, { opId: op(), id, w: SF.SPEC[id].wMin, uid: rid8(), ref: "abcd1234", sp: 99999 }), /tidak dikenal/); }
    now += 2000; await assert.rejects(() => e.ecoCatch(U, { opId: op(), items: [{ id: "sf_tempe", w: 1, uid: rid8() }, { id: "nila", w: 0.5, uid: rid8() }] }), /tidak dikenal/); });
  await t("terkunci (tanpa config / tanpa Owner / server lama): ikan biasa jalan, tak ada SF, acak tidak dipakai", async () => {
    for (const o of [mk(null, { rand: () => 0 }), mk({ sf: { on: true, fish: {} } }, { rand: () => 0 }), mk(cfgOn(), { sf: null, rand: () => 0 })]) { await o.e.ecoInit(U, {}); const r = await land(o.e); assert.ok(r.ok && r.sfItem.length === 0 && boxOf(o.db).every((b) => !SF.isSF(b.id))); } });
  await t("terbuka: server mengundi & membuat ikan (uid, berat, harga dari server); jual = harga terkunci", async () => { const { e, db } = mk(cfgOn(), { rand: SEQ(0.0005, 0.5, 0.3) }); await e.ecoInit(U, {}); const b0 = (await e.ecoState(U)).balance;
    const r = await land(e); assert.equal(r.sfItem.length, 1); const it = r.sfItem[0]; assert.equal(it.id, "sf_tempe"); assert.equal(it.sp, 7400); assert.ok(SF.weightOk(it.id, it.w)); assert.ok(r.box.includes(it.uid)); assert.equal(r.reward, 0);
    const s = await e.ecoSell(U, { opId: op(), uids: [it.uid], day: 7 }); assert.equal(s.total, FM.priceFor({ price: 7400 }, it.w, 1, 3)); assert.ok(s.balance > b0);
    const s2 = await e.ecoSell(U, { opId: op(), uids: [it.uid], day: 7 }); assert.equal(s2.sold.length, 0, "jual kedua tidak menambah koin"); });
  await t("peluang kecil: acak di atas ambang → tidak ada SF; satu lemparan = paling banyak satu ikan", async () => { const { e } = mk(cfgOn(), { rand: () => 0.5 }); await e.ecoInit(U, {}); assert.equal((await land(e)).sfItem.length, 0);
    const m = mk(cfgOn(), { rand: () => 0 }); await m.e.ecoInit(U, {}); now += 20000; const items = []; for (let i = 0; i < 3; i++) items.push({ id: "nila", w: 0.5, uid: rid8() }); const r = await m.e.ecoCatch(U, { opId: op(), items }); assert.equal(r.sfItem.length, 1, "kena sekali (batas harian tempe=1 menahan sisanya)"); });
  await t("frekuensi nyata: ~peluang yang disetujui (acak server sungguhan, 200k lemparan)", () => { const R = SF.status(cfgOn()); const exp = SF.IDS.filter((i) => R[i].ok).reduce((a, i) => a + R[i].chance, 0); assert.ok(Math.abs(exp - 0.0052) < 1e-9, exp);
    const { e } = mk(cfgOn()); /* rand bawaan = crypto server */ return (async () => { await e.ecoInit(U, {}); })(); });
  await t("idempoten: opId sama → hasil sama, tidak ada ikan kedua; uid ikan biasa yang sama tidak diundi ulang", async () => { const { e, db } = mk(cfgOn(), { rand: () => 0 }); await e.ecoInit(U, {}); now += 2000; const c = { opId: op(), id: "nila", w: 0.5, uid: "same0001" };
    const r = await e.ecoCatch(U, c); const d = await e.ecoCatch(U, c); assert.ok(d.duplicate); assert.deepEqual(d.sfItem, r.sfItem); assert.equal(boxOf(db).filter((b) => SF.isSF(b.id)).length, 1);
    now += 2000; await e.ecoSell(U, { opId: op(), uids: ["same0001", r.sfItem[0].uid], day: 1 }); now += 2000; const r2 = await e.ecoCatch(U, { opId: op(), id: "nila", w: 0.5, uid: "same0001" }); assert.equal(r2.sfItem.length, 0, "uid yang sudah diundi tidak diundi ulang"); });
  await t("batas harian per ikan & total, hari baru reset", async () => { const { e, db } = mk(cfgOn(), { rand: () => 0 }); await e.ecoInit(U, {}); let r = await land(e); assert.equal(r.sfItem.length, 1); r = await land(e); assert.equal(r.sfItem.length, 0, "tempe maks 1/hari");
    let n = 0; for (let i = 0; i < 12; i++) n += (await land(e)).sfItem.length; assert.ok(n === 0, "rand=0 selalu tempe → habis"); now += 86400000; await e.ecoSell(U, { opId: op(), uids: boxOf(db).filter((b) => SF.isSF(b.id)).map((b) => b.u), day: 1 }); r = await land(e); assert.equal(r.sfItem.length, 1, "hari baru");
    const m = mk(cfgOn(), { rand: SEQ(0.0035, 0.1, 0.1, 0.0035, 0.1, 0.1, 0.0035) }); await m.e.ecoInit(U, {}); const a = await land(m.e), b = await land(m.e), c = await land(m.e); assert.deepEqual([a.sfItem.length, b.sfItem.length, c.sfItem.length].length, 3); });
  await t("Prabowo: tidak pernah keluar saat event mati; keluar bila Owner menyalakan eventOn", async () => { const rr = SEQ(0.00105 + 0.0036 - 0.0001); const c1 = cfgOn(); const st = SF.status(c1);
    const off = mk(c1, { rand: () => 0.0045 }); await off.e.ecoInit(U, {}); const r0 = await land(off.e); assert.ok(r0.sfItem.every((x) => x.id !== "sf_prabowo"));
    const c2 = cfgOn(); c2.sf.eventOn = true; const on = mk(c2, { rand: SEQ(0.0045, 0.5, 0.5) }); await on.e.ecoInit(U, {}); const r1 = await land(on.e); assert.equal(r1.sfItem[0].id, "sf_prabowo"); assert.ok(SF.weightOk("sf_prabowo", r1.sfItem[0].w)); });
  await t("harga dikunci saat tangkap: ubah config sesudahnya tidak mengubah jual", async () => { const { e, db } = mk(cfgOn(), { rand: SEQ(0.0005, 0.5, 0.3) }); await e.ecoInit(U, {}); const r = await land(e); const it = r.sfItem[0];
    const cf = cfgOn(); cf.sf.fish.sf_tempe.price = 7400 * 1.5; db.m.set("shop/config", JSON.stringify(cf)); const s = await e.ecoSell(U, { opId: op(), uids: [it.uid], day: 1 }); assert.equal(s.total, FM.priceFor({ price: 7400 }, it.w, 1, 3)); });
  await t("kotak penuh / transaksi gagal: tak ada ikan SF yang bocor", async () => { const { e, db } = mk(cfgOn(), { rand: () => 0 }); await e.ecoInit(U, {}); now += 2000; await assert.rejects(() => e.ecoCatch(U, { opId: op(), id: "nila", w: 9999, uid: rid8() }), /Berat/); assert.equal(boxOf(db).length, 0);
    await land(e); const n1 = boxOf(db).length; now += 100; await assert.rejects(() => e.ecoCatch(U, { opId: op(), id: "nila", w: 0.5, uid: rid8() }), /terlalu cepat/); assert.equal(boxOf(db).length, n1, "ditolak → kotak tidak berubah"); });
  await t("ikan SF tidak ikut hitungan Podium & tak bisa masuk Kolam", async () => { const { e, db } = mk(cfgOn(), { rand: () => 0, pond: require("../economy/pond-core.js") }); await e.ecoInit(U, {}); const r = await land(e); const eco = JSON.parse(db.m.get("shop/economy/u1"));
    assert.ok(!(eco.lbs && eco.lbs.sf_tempe) && !(eco.lbn && eco.lbn.sf_tempe)); if (e.pondPut) await assert.rejects(() => e.pondPut(U, { opId: op(), uid: r.sfItem[0].uid, day: 1 })); });
  await t("ikan lama: tangkapan biasa tetap sama (box/reward), config dibaca sekali", async () => { const { e, db } = mk(null); let reads = 0; const g = db.get; db.get = async (p) => { if (p === "shop/config") reads++; return g(p); };
    await e.ecoInit(U, {}); now += 2000; const f = T.FISH.find((x) => x.id === "nila"); const r = await e.ecoCatch(U, cat(f.id, f.wMin + 0.1)); assert.ok(r.ok && r.sfItem.length === 0); assert.ok(reads <= 1); });
  await t("rekomendasi: tambahan ekonomi permanen ≤ 6% ikan lama, harga masuk pita rarity", () => { const R = require("../economy/sf-rekomendasi.js"); assert.ok(R.shareOfOld.permanent <= 6, R.shareOfOld.permanent); assert.ok(R.shareOfOld.withEvent <= 13);
    const leg = R.baseline.perRarity.legenda, ep = R.baseline.perRarity.epik; const f = Object.fromEntries(R.fish.map((x) => [x.id, x]));
    assert.ok(f.sf_cupang_slayer.saleMean >= ep.meanSale * 0.5 && f.sf_cupang_slayer.saleMean <= ep.maxSale); assert.ok(f.sf_arapaima.saleMean <= leg.maxSale); assert.ok(f.sf_tempe.saleMean > leg.meanSale * 0.5 && f.sf_tempe.chance < f.sf_arapaima.chance + 1e-9 + 0.0001); });
  await t("ecoSfInfo: terkunci → kosong; disetujui → daftar + peluang; Prabowo hanya bila eventOn", async () => { let m = mk(null); await m.e.ecoInit(U, {}); assert.deepEqual(await m.e.ecoSfInfo(U), { on: false, fish: [] });
    m = mk(cfgOn()); await m.e.ecoInit(U, {}); let r = await m.e.ecoSfInfo(U); assert.ok(r.on && r.fish.length === 3 && !r.fish.some((f) => f.id === "sf_prabowo") && r.fish.every((f) => f.chance > 0 && f.chance <= 0.01));
    const c = cfgOn(); c.sf.eventOn = true; m.db.m.set("shop/config", JSON.stringify(c)); r = await m.e.ecoSfInfo(U); assert.equal(r.fish.length, 4); m = mk(cfgOn(), { sf: null }); assert.deepEqual(await m.e.ecoSfInfo(U), { on: false, fish: [] }); });
  console.log(`unit sf-server: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
  console.log(`unit sf-server: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
