// Uji server Joran Kopdes: terkunci bawaan, gerbang config Owner, harga dari tabel server, SATU kali, saldo, klien tak bisa memalsukan.
const assert = require("assert"), fs = require("fs"), path = require("path");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 3).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, o) => { buf.set(p, JSON.stringify(o)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12, n = 0; const op = () => "op" + (++n) + "xxxxxxxx", U = { uid: "u1" };
const mk = (cfg) => { const db = mkdb(); if (cfg) db.m.set("shop/config", JSON.stringify(cfg)); return { db, e: EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true }) }; };
(async () => {
  await t("tabel: Joran Kopdes 1.000 koin, 250 kg", () => { assert.deepStrictEqual(JSON.parse(JSON.stringify(T.KOP)), { price: 1000, capKg: 250 }); });
  await t("salinan Functions sama dengan sumber", () => { for (const [a, b] of [["economy/core.js", "economy-core.js"], ["economy/tables.js", "economy-tables.js"]]) assert.ok(fs.readFileSync(path.join(__dirname, "../firebase/functions/lib", b), "utf8").endsWith(fs.readFileSync(path.join(__dirname, "..", a), "utf8").slice(-400))); });
  for (const [nm, cfg] of [["tanpa config", null], ["kopdes:false", { kopdes: false }], ["kopdes string 'true'", { kopdes: "true" }]])
    await t("bendera MATI (" + nm + ") → beli ditolak, koin utuh", async () => { const { e } = mk(cfg); await e.ecoInit(U, { money: 5000 }); await assert.rejects(() => e.ecoBuy(U, { opId: op(), kind: "kop" }), /belum dibuka/); const s = await e.ecoState(U); assert.equal(!!s.kop, false); assert.equal(s.balance, 5000); });
  await t("bendera NYALA: beli 1.000 (harga server, klien tak bisa mengubah), kop=true, saldo turun", async () => { const { e } = mk({ kopdes: true }); await e.ecoInit(U, { money: 5000 });
    const r = await e.ecoBuy(U, { opId: op(), kind: "kop", price: 1, cost: 1 }); assert.equal(r.price, 1000); assert.equal(r.kop, true); const s = await e.ecoState(U); assert.equal(s.balance, 4000); assert.equal(s.kop, true); });
  await t("beli kedua ditolak (milik selamanya, satu kali); koin tidak berkurang lagi", async () => { const { e } = mk({ kopdes: true }); await e.ecoInit(U, { money: 5000 }); await e.ecoBuy(U, { opId: op(), kind: "kop" });
    await assert.rejects(() => e.ecoBuy(U, { opId: op(), kind: "kop" }), /sudah dimiliki/); assert.equal((await e.ecoState(U)).balance, 4000); });
  await t("saldo kurang → ditolak, kop tetap false", async () => { const { e } = mk({ kopdes: true }); await e.ecoInit(U, { money: 999 }); await assert.rejects(() => e.ecoBuy(U, { opId: op(), kind: "kop" }), /tidak cukup/); assert.equal(!!(await e.ecoState(U)).kop, false); });
  await t("opId yang sama (klik ganda) → hanya satu pembelian", async () => { const { e } = mk({ kopdes: true }); await e.ecoInit(U, { money: 5000 }); const id = op();
    const rs = await Promise.allSettled([e.ecoBuy(U, { opId: id, kind: "kop" }), e.ecoBuy(U, { opId: id, kind: "kop" })]); assert.equal((await e.ecoState(U)).balance, 4000); assert.ok(rs.some((x) => x.status === "fulfilled")); });
  await t("pembelian lama (up/home/cat) tidak berubah", async () => { const { e } = mk({ kopdes: true }); await e.ecoInit(U, { money: 3000 }); const a = await e.ecoBuy(U, { opId: op(), kind: "up", k: "rod", lv: 1 }); assert.equal(a.price, T.UP.rod.cost[1]); await assert.rejects(() => e.ecoBuy(U, { opId: op(), kind: "zzz" }), /tidak dikenal/); });
  console.log(`unit-kopdes: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
