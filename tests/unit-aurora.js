// Gamepass Pancing Aurora Samudra (server): node tests/unit-aurora.js
const assert = require("assert"), fs = require("fs");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), AU = require("../economy/aurora-core.js"), MK = require("../economy/make-aurora.js"), SC = require("../shop/core.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 3).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, o) => { buf.set(p, JSON.stringify(o)); } }); for (const [k, v] of buf) m.set(k, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12, n = 0; const op = () => "op" + (++n) + "xxxxxxxx", U = { uid: "u1" };
const FISH = Object.fromEntries(T.FISH.map((f) => [f.id, f]));
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const mk = (own, rng) => { const db = mkdb(); const e = EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, aurora: AU, rng: rng || seeded(7), trustClientInit: true, initCap: 1e9 });
  if (own) db.m.set("shop/entitlements/u1", JSON.stringify({ products: { gamepass_aurora: { orderId: "X", at: 1, env: own } }, owned: { pancing_aurora: { from: "gamepass_aurora", at: 1, env: own } }, wallet: { SIMULASI: 0, NYATA: 0 } }));
  return { db, e, init: () => e.ecoInit(U, { money: 1000 }) }; };
let fu = 0; const fid = () => "f" + (++fu).toString(36) + "abcdefgh";
const catchOne = async (e, id, w) => { now += 20000; return e.ecoCatch(U, { opId: op(), id, w: w || FISH[id].wMin, uid: fid() }); };
(async () => {
  await t("tabel POOL tidak basi terhadap data.js", () => { assert.deepStrictEqual(JSON.parse(JSON.stringify(AU.POOL)), JSON.parse(JSON.stringify(MK.build(require("path").join(__dirname, ".."))))); });
  await t("salinan Functions sinkron", () => { assert.equal(fs.readFileSync(__dirname + "/../firebase/functions/lib/aurora-core.js", "utf8").split("\n").slice(1).join("\n"), fs.readFileSync(__dirname + "/../economy/aurora-core.js", "utf8")); });
  await t("produk: Rp20.000, permanen, terkunci sampai Owner buka, bukan 'kosmetik murni' (bonus transparan)", () => { const p = SC.PRODUCTS.find((x) => x.id === "gamepass_aurora"); assert.equal(p.intro, 20000); assert.equal(p.regular, 20000); assert.equal(p.permanent, true); assert.equal(p.lockedUntilOwner, true); assert.deepEqual(p.grants, ["pancing_aurora"]); assert.equal(p.bonus, "langka_1pp"); });
  await t("peluang: +1 POIN PERSENTASE pada kelompok Langka (bukan +1% per spesies), model peluang dasar", () => {
    const W = { sampah: 8, biasa: 60, langka: 24, epik: 9, legenda: 2.2 }, tot = 103.2, r = seeded(11), N = 600000; let base = 0, bonus = 0;
    for (let i = 0; i < N; i++) { const u = r() * tot; let a = 0, tier = "legenda"; for (const k of ["sampah", "biasa", "langka", "epik", "legenda"]) { a += W[k]; if (u <= a) { tier = k; break; } }
      if (tier === "langka") base++; const f = tier === "biasa" ? FISH.nila : null; if (tier === "langka" || (f && AU.roll(f, r))) bonus++; }
    const d = (bonus - base) / N; assert.ok(d > 0.0085 && d < 0.0115, "selisih " + d); });
  await t("tiap lokasi: q = 1 poin ÷ porsi Biasa; tujuan hanya Langka satu lokasi/mode", () => { for (const [k, P] of Object.entries(AU.POOL)) { assert.ok(P.q > 0.015 && P.q < 0.02, k); const [loc, sea] = k.split("#"); for (const id of P.to) { assert.equal(FISH[id].rarity, "langka"); assert.equal(FISH[id].loc, loc); } for (const id of P.src) assert.equal(FISH[id].rarity, "biasa"); } });
  await t("server menerapkan bonus untuk pemilik NYATA (terukur)", async () => { const { e, init } = mk("NYATA", seeded(3)); await init(); let up = 0, nn = 0;
    for (let i = 0; i < 400; i++) { const r = await catchOne(e, "nila", 1); nn++; up += r.swaps.length; if (r.swaps.length) { const s = r.swaps[0]; assert.equal(FISH[s.id].rarity, "langka"); assert.equal(FISH[s.id].loc, "muara"); assert.ok(s.w >= FISH[s.id].wMin && s.w <= (FISH[s.id].xMax || FISH[s.id].wMax)); } }
    assert.ok(up > 0 && up / nn < 0.05, "upgrade " + up + "/" + nn); const v = await e.ecoState(U); assert.equal(v.aur.up, up); assert.equal(v.aur.n, nn); assert.equal(v.aur.live, true); });
  await t("TANPA bonus: tidak punya, SIMULASI, atau klaim klien palsu", async () => { for (const own of [null, "SIMULASI"]) { const { e, init } = mk(own, () => 0); await init();   // rng=0 → akan selalu naik JIKA bonus aktif
      for (let i = 0; i < 20; i++) { now += 20000; const r = await e.ecoCatch(U, { opId: op(), id: "nila", w: 1, uid: fid(), aurora: true, owner: true, bonus: 1 }); assert.deepEqual(r.swaps, []); }
      const v = await e.ecoState(U); assert.equal(v.aur.live, false); assert.equal(v.aur.up, 0); } });
  await t("pengecualian: epik/legenda/sampah/dilindungi/mistis & Megalodon/ikan event tidak pernah disentuh", async () => { const { e, init } = mk("NYATA", () => 0); await init();
    for (const id of ["toman", "arwana", "sandal", "napoleon", "hiu_paus", "lentera_arwah", "pari_bayang", "patin"]) { const r = await catchOne(e, id, FISH[id].wMin); assert.deepEqual(r.swaps, [], id); }
    await assert.rejects(() => catchOne(e, "megalodon", 50), /tidak dikenal/); await assert.rejects(() => catchOne(e, "monster_naga", 50), /tidak dikenal/);
    for (const P of Object.values(AU.POOL)) for (const id of P.src.concat(P.to)) assert.ok(!FISH[id].protected && !["lentera_arwah", "pari_bayang"].includes(id)); });
  await t("mode laut vs darat: biasa darat tak jadi langka laut, dan sebaliknya", () => { const sea = AU.POOL["selat#s"], land = AU.POOL.selat; for (const id of sea.src) assert.ok(!land.src.includes(id)); for (const id of sea.to) assert.ok(!land.to.includes(id)); assert.equal(AU.roll(FISH.baronang, () => 0) && sea.to.includes(AU.roll(FISH.baronang, () => 0)), false); });
  await t("harga jual, berat, & hadiah koin TIDAK berubah: harga = rumus lama untuk ikan hasil", async () => { const { e, init } = mk("NYATA", () => 0); await init(); const r = await catchOne(e, "nila", 1); assert.equal(r.swaps.length, 1); assert.equal(r.reward, 0);
    const s = r.swaps[0]; assert.equal((await e.ecoState(U)).own, 1000); now += 1000; const sold = await e.ecoSell(U, { opId: op(), uids: [s.u], day: 1 });
    const exp = FM.priceFor(FISH[s.id], s.w, 0.7 + 0.75 * 0, 3); assert.ok(sold.total >= Math.round(exp), "harga memakai rumus lama"); assert.equal(sold.sold.length, 1); });
  await t("idempoten: opId sama = hasil sama, tanpa undian ulang / hitung ganda", async () => { const { e, init } = mk("NYATA", () => 0); await init(); now += 20000; const id = op(), u = fid();
    const a = await e.ecoCatch(U, { opId: id, id: "nila", w: 1, uid: u }); const b = await e.ecoCatch(U, { opId: id, id: "nila", w: 1, uid: u }); assert.ok(b.duplicate); assert.deepEqual(b.swaps, a.swaps); assert.equal((await e.ecoState(U)).aur.n, 1); });
  await t("paket tangkapan: hanya ikan Biasa ikut diundi", async () => { const { e, init } = mk("NYATA", () => 0); await init(); now += 200000;
    const r = await e.ecoCatch(U, { opId: op(), items: [{ id: "nila", w: FISH.nila.wMin, uid: fid() }, { id: "toman", w: FISH.toman.wMin, uid: fid() }, { id: "mujair", w: FISH.mujair.wMin, uid: fid() }] }); assert.equal(r.swaps.length, 2); assert.deepEqual(r.swaps.map((s) => s.from).sort(), ["mujair", "nila"]); });
  await t("view tanpa modul aurora: tidak ada bonus & tidak ada kolom aur", async () => { const db = mkdb(); const e = EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true, initCap: 1e9 }); db.m.set("shop/entitlements/u1", JSON.stringify({ products: {}, owned: { pancing_aurora: { env: "NYATA" } }, wallet: { SIMULASI: 0, NYATA: 0 } })); await e.ecoInit(U, { money: 5 });
    now += 20000; const r = await e.ecoCatch(U, { opId: op(), id: "nila", w: 1, uid: fid() }); assert.deepEqual(r.swaps, []); assert.equal(r.aur, undefined); });
  await t("Owner harus membuka produk: katalog menandai terkunci; pembelian ditolak sampai dibuka", async () => { const m = new Map(), rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); const db = { get: async (p) => rd(p), tx: async (fn) => fn({ get: async (p) => rd(p), set: async (p, o) => { m.set(p, JSON.stringify(o)); } }) };
    const S = SC.makeShopServer(db, { clock: () => now }), OW = { uid: "own", token: { role: "owner" } }, PL = { uid: "pl1" };
    let cat = await S.getCatalog(PL); assert.equal(cat.items.find((i) => i.id === "gamepass_aurora").enabled, false); assert.equal(cat.items.find((i) => i.id === "gamepass_sultan").enabled, true);
    await assert.rejects(() => S.createOrder(PL, { productId: "gamepass_aurora", opId: "abcdefgh", nick: "x" }), /dinonaktifkan/);
    await S.ownerSetEnabled(OW, { productId: "gamepass_aurora", enabled: true }); cat = await S.getCatalog(PL); assert.equal(cat.items.find((i) => i.id === "gamepass_aurora").enabled, true); assert.equal(cat.items.find((i) => i.id === "gamepass_aurora").price, 20000);
    await S.ownerSetEnabled(OW, { productId: "gamepass_aurora", enabled: false }); assert.equal((await S.getCatalog(PL)).items.find((i) => i.id === "gamepass_aurora").enabled, false); });
  console.log(`unit-aurora: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
