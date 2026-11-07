// Uji Quest Owner (inti + server ekonomi): buka → tunggu → klaim sekali; koin 25.000 tepat sekali; Joran WhatsApp tepat sekali; anti-dobel (opId baru, banyak panggilan, akun lain terpisah).
const assert = require("assert"), fs = require("fs"), path = require("path");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), QK = require("../economy/quest-core.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 3).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, v) => { buf.set(p, JSON.stringify(v)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12, n = 0; const op = () => "q" + (++n) + "xxxxxxxxxx";
const mk = (o) => { const db = mkdb(); return { db, e: EC.makeEconomyServer(db, Object.assign({ clock: () => now, tables: T, fishmath: FM, trustClientInit: true, initCap: 0, quest: QK }, o || {})) }; };
const A = { uid: "u1" }, B = { uid: "u2" };
(async () => {
  await t("inti: tautan resmi + hadiah sesuai permintaan", () => {
    assert.equal(QK.QUESTS.ig.url, "https://www.instagram.com/nusa_islandd?dlrf=MWF2Z2E2N3dubHI5bg=="); assert.equal(QK.QUESTS.wa.url, "https://chat.whatsapp.com/FtZDVA66ogELWSYACMy45F?s=cl&p=a&iam=2");
    assert.equal(QK.QUESTS.ig.reward.coin, 25000); assert.equal(QK.QUESTS.wa.reward.rod, "wa"); assert.equal(QK.ROD.capKg, 100); });
  await t("inti: status belum → proses → selesai → klaim; klaim terlalu cepat/tanpa buka ditolak", () => {
    let d = null; assert.equal(QK.status(d, "ig", now), "belum"); assert.ok(QK.planClaim(d, "ig", now).notOpened);
    d = QK.planOpen(d, "ig", now).doc; assert.equal(QK.status(d, "ig", now + 1000), "proses"); assert.ok(QK.planClaim(d, "ig", now + 1000).wait > 0);
    assert.equal(QK.status(d, "ig", now + QK.MIN_AWAY_MS), "selesai"); const c = QK.planClaim(d, "ig", now + QK.MIN_AWAY_MS); assert.ok(c.ok); assert.equal(QK.status(c.doc, "ig", now), "klaim");
    assert.ok(QK.planClaim(c.doc, "ig", now + 1e6).already); assert.ok(QK.planOpen(c.doc, "ig", now + 1e6).already); });
  await t("inti: buka ulang tidak mengundurkan waktu buka; quest tidak dikenal ditolak", () => { let d = QK.planOpen(null, "wa", 1000).doc; d = QK.planOpen(d, "wa", 9000).doc; assert.equal(d.wa.o, 1000); assert.ok(QK.planOpen(null, "x", 1).error); });
  await t("inti: data buku rusak tidak membuat klaim (string/NaN diabaikan)", () => { assert.equal(QK.status({ ig: { o: "x", c: NaN } }, "ig", now), "belum"); assert.equal(QK.claimedCount("abc"), 0); });
  await t("server: tanpa opts.quest ditolak (server lama aman)", async () => { const { e } = mk({ quest: null }); await e.ecoInit(A, {}); await assert.rejects(() => e.ecoQuestState(A), /belum aktif/); });
  await t("server: keadaan awal bersih, belum ada klaim", async () => { const { e } = mk(); await e.ecoInit(A, {}); const r = await e.ecoQuestState(A); assert.equal(r.doc.ig.c, 0); assert.equal(r.qo.wa.c, 0); });
  await t("server: klaim tanpa buka / terlalu cepat ditolak, koin tidak berubah", async () => { const { e } = mk(); await e.ecoInit(A, {}); const b0 = (await e.ecoState(A)).balance;
    await assert.rejects(() => e.ecoQuestClaim(A, { opId: op(), q: "ig" }), /Buka tautannya/);
    await e.ecoQuestOpen(A, { q: "ig" }); now += 3000; await assert.rejects(() => e.ecoQuestClaim(A, { opId: op(), q: "ig" }), /Tunggu/); assert.equal((await e.ecoState(A)).balance, b0); });
  await t("server: IG klaim → +25.000 tepat sekali; opId sama, opId baru, 20 panggilan paralel → tidak dobel", async () => { const { e } = mk(); await e.ecoInit(A, {}); const b0 = (await e.ecoState(A)).balance;
    await e.ecoQuestOpen(A, { q: "ig" }); now += QK.MIN_AWAY_MS + 1; const id = op(); const r = await e.ecoQuestClaim(A, { opId: id, q: "ig" }); assert.equal(r.balance, b0 + 25000); assert.equal(r.doc.ig.c > 0, true);
    const dup = await e.ecoQuestClaim(A, { opId: id, q: "ig" }); assert.ok(dup.duplicate); assert.equal(dup.balance, b0 + 25000);
    const again = await e.ecoQuestClaim(A, { opId: op(), q: "ig" }); assert.ok(again.already); assert.equal(again.balance, b0 + 25000);
    await Promise.all(Array.from({ length: 20 }, () => e.ecoQuestClaim(A, { opId: op(), q: "ig" }).catch(() => {}))); assert.equal((await e.ecoState(A)).balance, b0 + 25000); });
  await t("server: WA klaim → joran tercatat sekali, TANPA koin; klaim ulang tidak mengubah apa pun", async () => { const { e } = mk(); await e.ecoInit(A, {}); const b0 = (await e.ecoState(A)).balance;
    await e.ecoQuestOpen(A, { q: "wa" }); now += QK.MIN_AWAY_MS + 1; const r = await e.ecoQuestClaim(A, { opId: op(), q: "wa" }); assert.equal(r.balance, b0); assert.ok(r.doc.wa.c > 0); assert.equal(r.reward.rod, "wa");
    const c1 = r.doc.wa.c; now += 5e6; const again = await e.ecoQuestClaim(A, { opId: op(), q: "wa" }); assert.ok(again.already); assert.equal(again.doc.wa.c, c1); assert.equal((await e.ecoQuestState(A)).qo.wa.c, c1); });
  await t("server: akun lain terpisah (tidak ikut terklaim / tidak bisa klaim punya orang)", async () => { const { e } = mk(); await e.ecoInit(A, {}); await e.ecoInit(B, {}); await e.ecoQuestOpen(A, { q: "ig" }); now += QK.MIN_AWAY_MS + 1;
    await assert.rejects(() => e.ecoQuestClaim(B, { opId: op(), q: "ig" }), /Buka tautannya/); assert.equal((await e.ecoQuestState(B)).doc.ig.o, 0); });
  await t("server: klien tidak bisa mengirim jumlah/hadiah/waktu — input aneh diabaikan atau ditolak", async () => { const { e } = mk(); await e.ecoInit(A, {}); const b0 = (await e.ecoState(A)).balance;
    await assert.rejects(() => e.ecoQuestOpen(A, { q: "__proto__" }), /tidak dikenal/); await assert.rejects(() => e.ecoQuestClaim(A, { opId: op(), q: "diamond" }), /tidak dikenal/);
    await e.ecoQuestOpen(A, { q: "ig", o: 0, c: 1, coin: 1e9, at: 1 }); await assert.rejects(() => e.ecoQuestClaim(A, { opId: op(), q: "ig", coin: 1e9, reward: { coin: 1e9 }, at: 1 }), /Tunggu/); assert.equal((await e.ecoState(A)).balance, b0);
    await assert.rejects(() => e.ecoQuestClaim({ uid: "" }, { opId: op(), q: "ig" }), /Masuk dulu/); });
  await t("server: dua quest selesai → allDone; state setelah 'restart' (db sama) tetap terklaim", async () => { const { e, db } = mk(); await e.ecoInit(A, {});
    for (const q of ["ig", "wa"]) { await e.ecoQuestOpen(A, { q }); now += QK.MIN_AWAY_MS + 1; await e.ecoQuestClaim(A, { opId: op(), q }); }
    const e2 = EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true, initCap: 0, quest: QK }); const s = await e2.ecoQuestState(A); assert.ok(QK.allDone(s.doc));
    const b = (await e2.ecoState(A)).balance; await e2.ecoQuestClaim(A, { opId: op(), q: "ig" }); assert.equal((await e2.ecoState(A)).balance, b); });
  await t("server: Pakai/Lepaskan joran disahkan server — tanpa memiliki ditolak; cap 100 hanya bila dimiliki+dipakai; ganti perangkat/restart tetap", async () => { const { e, db } = mk(); await e.ecoInit(A, {});
    await assert.rejects(() => e.ecoQuestEquip(A, { opId: op(), on: true }), /belum dimiliki/); assert.equal((await e.ecoQuestState(A)).doc.cap, 0);
    await e.ecoQuestOpen(A, { q: "wa" }); now += QK.MIN_AWAY_MS + 1; await e.ecoQuestClaim(A, { opId: op(), q: "wa" });
    assert.equal((await e.ecoQuestState(A)).doc.cap, 100); await assert.rejects(() => e.ecoQuestEquip(A, { opId: op(), on: "ya" }), /tidak dikenal/);
    const id = op(); const off = await e.ecoQuestEquip(A, { opId: id, on: false }); assert.equal(off.doc.cap, 0); assert.equal(off.doc.eq, false); assert.ok((await e.ecoQuestEquip(A, { opId: id, on: false })).duplicate);
    const e2 = EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true, initCap: 0, quest: QK }); const s2 = await e2.ecoQuestState(A); assert.equal(s2.doc.eq, false); assert.equal(s2.doc.wa.c > 0, true);      // "perangkat lain"
    assert.equal((await e2.ecoQuestEquip(A, { opId: op(), on: true })).doc.cap, 100); assert.equal((await e2.ecoQuestState(B)).doc.cap, 0);
    await e.ecoQuestOpen(A, { q: "ig" }); assert.equal((await e.ecoQuestState(A)).doc.eq, true, "membuka quest lain tidak mengubah status joran"); });
  await t("server: klaim paralel dari dua 'perangkat' (WA) → tepat satu hadiah; ekonomi lain tidak terganggu", async () => { const { e } = mk(); await e.ecoInit(A, {}); const b0 = (await e.ecoState(A)).balance;
    await e.ecoQuestOpen(A, { q: "wa" }); await e.ecoQuestOpen(A, { q: "ig" }); now += QK.MIN_AWAY_MS + 1;
    const rs = await Promise.all([...Array.from({ length: 10 }, () => e.ecoQuestClaim(A, { opId: op(), q: "wa" })), ...Array.from({ length: 10 }, () => e.ecoQuestClaim(A, { opId: op(), q: "ig" }))].map((p) => p.catch(() => null)));
    assert.equal(rs.filter((r) => r && !r.already && !r.duplicate).length, 2); assert.equal((await e.ecoState(A)).balance, b0 + 25000); });
  await t("Functions lib quest-core sama dengan sumber", () => { const f = path.join(__dirname, "../firebase/functions/lib/quest-core.js"); assert.ok(fs.existsSync(f) && fs.readFileSync(f, "utf8").endsWith(fs.readFileSync(path.join(__dirname, "../economy/quest-core.js"), "utf8"))); });
  console.log(`unit quest: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
