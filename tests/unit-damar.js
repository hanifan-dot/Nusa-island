// Uji inti PAK DAMAR (economy/damar-core.js + ecoDamar* di economy/core.js): jam server WIB, kepemilikan ikan, konsumsi tepat sekali, hadiah tepat sekali, retry, kegagalan perjalanan, privasi.
const assert = require("assert");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), DM = require("../economy/damar-core.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 3).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, o) => { buf.set(p, JSON.stringify(o)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
const H = 3600000, WIB0 = Date.UTC(2026, 10, 12, 0, 0, 0) - 7 * H;   // 12 Nov 2026 00:00 WIB
const DAY = 86400000; let now = WIB0 + 10 * H;
const mk = (o) => { const db = mkdb(); return { db, e: EC.makeEconomyServer(db, Object.assign({ clock: () => now, tables: T, fishmath: FM, damar: DM, trustClientInit: true, initCap: 1e9 }, o || {})) }; };
const U = { uid: "user1" }, V = { uid: "user2" };
let n = 0; const op = () => "op" + (++n) + "xxxxxxxx";
const NONJUNK = T.FISH.filter((f) => DM.fishOk(f)), JUNK = T.FISH.find((f) => f.rarity === "sampah");
async function boot(o) { const x = mk(o); await x.e.ecoInit(U, { money: 1000 }); await x.e.ecoInit(V, { money: 1000 }); return x; }
async function fish(e, A, k) { now += 2000; const f = NONJUNK[k % NONJUNK.length], uid = "fk" + (A === U ? "a" : "b") + k + Math.random().toString(36).slice(2, 7); await e.ecoCatch(A, { opId: op(), id: f.id, w: Math.round(((f.wMin + f.wMax) / 2) * 100) / 100, uid }); return uid; }
const six = async (e, A) => { const u = []; for (let k = 0; k < 6; k++) u.push(await fish(e, A, k)); return u; };
const bal = async (e, A) => (await e.ecoDamarState(A, {})).balance;
(async () => {
  await t("hari memakai jam SERVER WIB: 23:59 vs 00:00 beda hari; klien tidak bisa mengirim hari", () => { assert.notEqual(DM.dayOf(WIB0 - 1), DM.dayOf(WIB0)); assert.equal(DM.dayOf(WIB0), DM.dayOf(WIB0 + DAY - 1)); });
  await t("tanpa DamarCore di server: ecoDamar* ditolak dan ekonomi lama utuh", async () => { const { e } = mk({ damar: null }); await e.ecoInit(U, {}); await assert.rejects(() => e.ecoDamarState(U, {}), /belum diaktifkan/); assert.equal((await e.ecoSell(U, { opId: op(), uids: ["fkzzzzzz"], day: 1 })).total, 0); });
  await t("alur penuh: muat 3+3, berlayar, terlalu cepat ditolak, sampai → hadiah TEPAT SEKALI (dasar+bonus segar)", async () => {
    const { e } = await boot(); const u = await six(e, U), b0 = await bal(e, U);
    await e.ecoDamarLoad(U, { opId: op(), box: 0, uids: u.slice(0, 3) }); await e.ecoDamarLoad(U, { opId: op(), box: 1, uids: u.slice(3) });
    await e.ecoDamarSail(U, { opId: op(), box: 0 }); await e.ecoDamarSail(U, { opId: op(), box: 1 });
    await assert.rejects(() => e.ecoDamarDeliver(U, { opId: op(), box: 0 }), /belum sampai/); now += DM.MIN_TRIP_MS;
    const r1 = await e.ecoDamarDeliver(U, { opId: op(), box: 0 }); assert.equal(r1.reward, 0); assert.equal(r1.damar.delivered, 3);
    const o2 = op(), r2 = await e.ecoDamarDeliver(U, { opId: o2, box: 1 }); assert.equal(r2.reward, DM.BASE + DM.FRESH_BONUS); assert.equal(r2.damar.paid, true); assert.equal(r2.balance, b0 + DM.BASE + DM.FRESH_BONUS);
    const dup = await e.ecoDamarDeliver(U, { opId: o2, box: 1 }); assert.equal(dup.duplicate, true); assert.equal(dup.balance, r2.balance);
    await assert.rejects(() => e.ecoDamarDeliver(U, { opId: op(), box: 1 }), /belum berlayar/); assert.equal(await bal(e, U), r2.balance); });
  await t("kepemilikan: ikan tak ada / milik pemain lain / duplikat / sampah / lebih dari 3 per kotak / lebih dari 6 total ditolak", async () => {
    const { e } = await boot(); const a = await six(e, U), v = await fish(e, V, 0);
    await assert.rejects(() => e.ecoDamarLoad(U, { opId: op(), box: 0, uids: ["fkhantu0000"] }), /tidak ada di inventaris/);
    await assert.rejects(() => e.ecoDamarLoad(U, { opId: op(), box: 0, uids: [v] }), /tidak ada di inventaris/);
    await assert.rejects(() => e.ecoDamarLoad(U, { opId: op(), box: 0, uids: [a[0], a[0]] }), /tidak valid/);
    await assert.rejects(() => e.ecoDamarLoad(U, { opId: op(), box: 0, uids: a.slice(0, 4) }), /tidak valid|maksimal/);
    if (JUNK) { const j = "fkjunk" + Math.random().toString(36).slice(2, 7); now += 2000; await e.ecoCatch(U, { opId: op(), id: JUNK.id, w: Math.max(JUNK.wMin, 0.1), uid: j }); await assert.rejects(() => e.ecoDamarLoad(U, { opId: op(), box: 0, uids: [j] }), /tidak bisa dikirim/); }
    await assert.rejects(() => e.ecoDamarLoad(U, { opId: op(), box: 2, uids: [a[0]] }), /tidak valid/);
    await e.ecoDamarLoad(U, { opId: op(), box: 0, uids: a.slice(0, 3) }); await e.ecoDamarLoad(U, { opId: op(), box: 1, uids: a.slice(3, 6) });
    const x = await fish(e, U, 9); await assert.rejects(() => e.ecoDamarLoad(U, { opId: op(), box: 1, uids: [x] }), /maksimal|hanya 6/); });
  await t("ikan dikonsumsi tepat sekali: setelah dimuat tak bisa dijual/dimuat lagi; retry opId sama tidak menggandakan", async () => {
    const { e } = await boot(); const u = await fish(e, U, 1), o = op();
    const r1 = await e.ecoDamarLoad(U, { opId: o, box: 0, uids: [u] }), r2 = await e.ecoDamarLoad(U, { opId: o, box: 0, uids: [u] });
    assert.equal(r2.duplicate, true); assert.equal(r2.damar.boxes[0].n, 1); assert.ok(!r1.box.includes(u));
    const s = await e.ecoSell(U, { opId: op(), uids: [u], day: 3 }); assert.equal(s.total, 0); assert.deepEqual(s.unknown, [u]);
    await assert.rejects(() => e.ecoDamarLoad(U, { opId: op(), box: 1, uids: [u] }), /tidak ada di inventaris/); });
  await t("gagal pelayaran TIDAK menghapus progres: batal → ikan tetap di kotak; telat dari 20 menit → hanya bonus segar hilang", async () => {
    const { e } = await boot(); const u = await six(e, U);
    await e.ecoDamarLoad(U, { opId: op(), box: 0, uids: u.slice(0, 3) }); await e.ecoDamarLoad(U, { opId: op(), box: 1, uids: u.slice(3) });
    await e.ecoDamarSail(U, { opId: op(), box: 0 }); const ab = await e.ecoDamarAbort(U, { opId: op(), box: 0 }); assert.equal(ab.damar.boxes[0].n, 3); assert.equal(ab.damar.boxes[0].st, "idle");
    now += DM.FRESH_MS + 60000; await e.ecoDamarSail(U, { opId: op(), box: 0 }); await e.ecoDamarSail(U, { opId: op(), box: 1 }); now += DM.MIN_TRIP_MS;
    await e.ecoDamarDeliver(U, { opId: op(), box: 0 }); const r = await e.ecoDamarDeliver(U, { opId: op(), box: 1 }); assert.equal(r.reward, DM.BASE); assert.equal(r.damar.delivered, 6); });
  await t("ganti hari (server): ikan di kotak dikembalikan ke inventaris, bukan hilang; quest baru bisa dibayar lagi", async () => {
    const { e } = await boot(); const u = await six(e, U);
    await e.ecoDamarLoad(U, { opId: op(), box: 0, uids: u.slice(0, 3) }); await e.ecoDamarSail(U, { opId: op(), box: 0 });
    now = WIB0 + DAY + H; const s = await e.ecoDamarState(U, {}); assert.equal(s.damar.delivered, 0); assert.equal(s.damar.boxes[0].n, 0); for (const x of u.slice(0, 3)) assert.ok(s.box.includes(x));
    const u2 = await six(e, U); await e.ecoDamarLoad(U, { opId: op(), box: 0, uids: u2.slice(0, 3) }); await e.ecoDamarLoad(U, { opId: op(), box: 1, uids: u2.slice(3) }); await e.ecoDamarSail(U, { opId: op(), box: 0 }); await e.ecoDamarSail(U, { opId: op(), box: 1 }); now += DM.MIN_TRIP_MS;
    await e.ecoDamarDeliver(U, { opId: op(), box: 0 }); assert.equal((await e.ecoDamarDeliver(U, { opId: op(), box: 1 })).reward, DM.BASE + DM.FRESH_BONUS); });
  await t("bongkar kotak (belum berlayar) mengembalikan ikan; kotak berlayar tak bisa dibongkar/dimuat", async () => {
    const { e } = await boot(); const u = await fish(e, U, 2); await e.ecoDamarLoad(U, { opId: op(), box: 0, uids: [u] });
    const r = await e.ecoDamarUnload(U, { opId: op(), box: 0 }); assert.equal(r.returned, 1); assert.ok(r.box.includes(u));
    await e.ecoDamarLoad(U, { opId: op(), box: 0, uids: [u] }); await e.ecoDamarSail(U, { opId: op(), box: 0 });
    await assert.rejects(() => e.ecoDamarUnload(U, { opId: op(), box: 0 }), /berlayar/); });
  await t("klien tidak bisa menentukan hari/hadiah/waktu: field tambahan diabaikan; opId wajib", async () => {
    const { e } = await boot(); const u = await fish(e, U, 3); const r = await e.ecoDamarLoad(U, { opId: op(), box: 0, uids: [u], day: 999999, reward: 1e9, now: 1, fresh: true });
    assert.equal(r.damar.day, DM.dayOf(now)); await assert.rejects(() => e.ecoDamarSail(U, { box: 0 }), /opId/); });
  await t("privasi: respons tanpa UID akun/email/token; pemain lain tidak terpengaruh", async () => {
    const { e } = await boot(); const u = await fish(e, U, 4); const r = await e.ecoDamarLoad(U, { opId: op(), box: 0, uids: [u] }); const js = JSON.stringify(r);
    const m = js.match(/user1|user2|@|token/i); assert.ok(!m, m && js.slice(Math.max(0, m.index - 40), m.index + 40)); assert.equal((await e.ecoDamarState(V, {})).damar.boxes[0].n, 0); });
  console.log(`unit-damar: ${pass} lolos, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
