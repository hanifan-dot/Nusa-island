// Uji unit Nama Pemain Permanen (username/core.js): aturan, filter, unik global, atomik, terkunci, saran, pagar statis klien.
const fs = require("fs"), path = require("path"), assert = require("assert");
const U = require("../username/core.js");
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("FAIL " + name + "\n  " + e.message); process.exitCode = 1; } };
function memdb() { const d = {}; let chain = Promise.resolve(); return { d, get: async (p) => (d[p] ? JSON.parse(JSON.stringify(d[p])) : null),
  tx: (fn) => { const run = chain.then(async () => { const w = {}; const out = await fn({ get: async (p) => (p in w ? JSON.parse(JSON.stringify(w[p])) : d[p] ? JSON.parse(JSON.stringify(d[p])) : null), set: async (p, o) => { w[p] = o; } }); Object.assign(d, w); return out; }); chain = run.catch(() => {}); return run; } }; }
const A = { uid: "ua" }, B = { uid: "ub" }, C = { uid: "uc" };
(async () => {
  await t("validate: nama sah", () => { for (const x of ["Hanifan", "abc", "Nelayan_Sunda", "x".repeat(16), "Budi28", "A1_"]) assert.ok(U.validate(x).ok, x); });
  await t("validate: panjang 3–16", () => { assert.strictEqual(U.validate("ab").code, "short"); assert.strictEqual(U.validate("x".repeat(17)).code, "long"); assert.strictEqual(U.validate("").code, "empty"); });
  await t("validate: spasi & karakter di luar A-Z0-9_ ditolak", () => { for (const x of ["a b", " abc", "abc "]) assert.strictEqual(U.validate(x).code, "space"); for (const x of ["Budi-1", "Bûdi", "ab😀c", "a.b", "<b>x</b>"]) assert.strictEqual(U.validate(x).code, "chars", x); assert.strictEqual(U.validate("123456").code, "noletter"); });
  await t("validate: nama staf/sistem & penyamaran diblokir", () => { for (const x of ["admin", "ADMIN", "Owner", "system", "adm1n", "4dmin", "0wner", "Admin_Nusa", "SystemBot", "Nusa_Staff", "GM_Sari", "mod", "nusa", "Pemancing", "Official_Nusa", "a_d_m_i_n"]) assert.strictEqual(U.validate(x).code, "reserved", x); });
  await t("validate: kata tidak pantas diblokir (termasuk samaran), kata wajar lolos", () => { for (const x of ["anjing", "Anj1ng99", "aaanjing", "f_u_c_k", "kontol_01", "bokep"]) assert.strictEqual(U.validate(x).code, "bad", x); for (const x of ["Tailor", "Model", "Classic", "passion", "Scunthorpe", "Budi_Nelayan", "player_one", "Kapal12"]) assert.ok(U.validate(x).ok, x); });
  await t("validate: lower = huruf kecil (kunci unik)", () => assert.strictEqual(U.validate("HaNiFaN").lower, "hanifan"));
  await t("nameCheck: tersedia / tidak mengubah apa pun", async () => { const db = memdb(), S = U.makeNameServer(db); const r = await S.nameCheck(A, { name: "Hanifan" }); assert.deepStrictEqual([r.ok, r.available], [true, true]); assert.deepStrictEqual(Object.keys(db.d), []); });
  await t("nameClaim: menetapkan, dokumen hanya uid/nama/waktu, nameGet mengembalikan", async () => {
    const db = memdb(), S = U.makeNameServer(db, { clock: () => 1000 }); const r = await S.nameClaim(A, { name: "Hanifan" });
    assert.strictEqual(r.name, "Hanifan"); assert.deepStrictEqual(Object.keys(db.d["usernames/hanifan"]).sort(), ["at", "name", "uid"]); assert.deepStrictEqual(Object.keys(db.d).sort(), ["users/ua/profile/username", "usernames/hanifan"].sort());
    const g = await S.nameGet(A); assert.deepStrictEqual([g.has, g.name], [true, "Hanifan"]); assert.deepStrictEqual(await S.nameGet(B), { has: false }); });
  await t("unik global tanpa beda huruf; pesan persis + saran nomor; TIDAK otomatis diambil", async () => {
    const db = memdb(), S = U.makeNameServer(db, { rand: () => 0.3 }); await S.nameClaim(A, { name: "Hanifan" });
    const c = await S.nameCheck(B, { name: "HANIFAN" }); assert.strictEqual(c.available, false); assert.strictEqual(c.message, "❌ Nama sudah dipakai! Coba tambahkan nomor atau cari ide nama baru."); assert.ok(c.suggestions.length >= 1 && c.suggestions.every((x) => U.validate(x).ok && x.toLowerCase().startsWith("hanifan")), JSON.stringify(c.suggestions));
    await assert.rejects(S.nameClaim(B, { name: "hanifan" }), (e) => e.code === "already-exists" && e.message.startsWith("❌ Nama sudah dipakai!")); assert.deepStrictEqual(await S.nameGet(B), { has: false }); });
  await t("saran tidak menawarkan nama yang sudah dipakai", async () => { const db = memdb(), S = U.makeNameServer(db, { rand: () => 0.3 }); await S.nameClaim(A, { name: "Hanifan" }); await S.nameClaim(C, { name: "Hanifan37" }); const c = await S.nameCheck(B, { name: "Hanifan" }); assert.ok(!c.suggestions.some((x) => x.toLowerCase() === "hanifan37")); });
  await t("permanen: akun yang sudah punya nama tidak bisa ganti; klaim ulang sama = aman; nama lama tetap milik akun", async () => {
    const db = memdb(), S = U.makeNameServer(db); await S.nameClaim(A, { name: "Hanifan" });
    await assert.rejects(S.nameClaim(A, { name: "Hanifan28" }), (e) => e.code === "failed-precondition"); assert.ok(!db.d["usernames/hanifan28"]);
    assert.strictEqual((await S.nameClaim(A, { name: "HANIFAN" })).already, true); assert.strictEqual((await S.nameCheck(A, { name: "Lain123" })).code, "locked"); assert.strictEqual((await S.nameGet(A)).name, "Hanifan"); });
  await t("balapan: banyak akun berebut nama yang sama → tepat satu menang", async () => {
    const db = memdb(), S = U.makeNameServer(db); const res = await Promise.allSettled(["u1", "u2", "u3", "u4", "u5"].map((u, i) => S.nameClaim({ uid: u }, { name: i % 2 ? "RACE_one" : "race_ONE" })));
    assert.strictEqual(res.filter((r) => r.status === "fulfilled").length, 1); assert.ok(res.filter((r) => r.status === "rejected").every((r) => r.reason.code === "already-exists")); });
  await t("tanpa login ditolak; klaim tidak sah ditolak; batas laju", async () => {
    const S = U.makeNameServer(memdb()); for (const f of ["nameGet", "nameCheck", "nameClaim"]) await assert.rejects(S[f](null, { name: "Abc" }), (e) => e.code === "unauthenticated");
    await assert.rejects(S.nameClaim(A, { name: "admin" }), (e) => e.code === "invalid-argument");
    let lim = false; for (let i = 0; i < 40; i++) { try { await S.nameCheck(B, { name: "Ab" + i }); } catch (e) { if (e.code === "resource-exhausted") lim = true; } } assert.ok(lim); });
  await t("pagar statis klien: hanya nameGet/nameCheck/nameClaim; tidak ada panggilan tulis lain", () => {
    const src = fs.readFileSync(path.join(__dirname, "../username/client.js"), "utf8"); const calls = [...src.matchAll(/call\("([A-Za-z]+)"/g)].map((m) => m[1]); assert.deepStrictEqual([...new Set(calls)].sort(), ["nameCheck", "nameClaim", "nameGet"]);
    assert.ok(!/writeSave|restoreBackup|ecoReward|walletAdd|topup/i.test(src)); });
  console.log(`unit-username: ${n} lulus`);
})();
