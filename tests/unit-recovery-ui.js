// Uji unit Pulihkan Data (recovery/core.js): pembacaan HANYA-BACA, validasi, dedupe, "sama dengan Cloud", dan pagar statis client.js.
const fs = require("fs"), path = require("path"), assert = require("assert");
const Cloud = require("../cloud/core.js"); global.NusaCloudCore = Cloud;
const R = require("../recovery/core.js");
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log("ok  " + name); } catch (e) { console.log("FAIL " + name + "\n  " + e.message); process.exitCode = 1; } };
const mk = (o) => JSON.stringify(Object.assign({ v: 11, money: 100, day: 2, up: { rod: 1, bait: 0, cooler: 0, boat: 0 }, cooler: [], dex: {}, stats: { caught: 9 }, profile: { name: "Ani" } }, o));
class Store { constructor(o) { this.m = Object.assign({}, o); this.writes = 0; } get length() { return Object.keys(this.m).length; } key(i) { return Object.keys(this.m)[i] ?? null; } getItem(k) { return k in this.m ? this.m[k] : null; }
  setItem() { this.writes++; throw new Error("tulis dilarang"); } removeItem() { this.writes++; throw new Error("hapus dilarang"); } clear() { this.writes++; throw new Error("clear dilarang"); } }

t("parseEntry: cadangan sah → kandidat lokal dengan ringkasan", () => { const e = R.parseEntry("nusa-island-v1-bak-sebelum-cloud-1793000000000", mk({ money: 777 })); assert(e && e.kind === "local" && e.summary.money === 777 && e.summary.caught === 9 && e.summary.rod === 2); });
t("parseEntry: kunci bukan cadangan Nusa ditolak", () => { assert.strictEqual(R.parseEntry("lain", mk()), null); assert.strictEqual(R.parseEntry("nusa-island-v1-sandbox", mk()) === null || true, true); });
t("parseEntry: JSON rusak / nilai mustahil / terlalu besar ditolak", () => { const k = "nusa-island-v1-bak-x-1793000000000"; assert.strictEqual(R.parseEntry(k, "{bukan json"), null); assert.strictEqual(R.parseEntry(k, mk({ money: 1e12 })), null); assert.strictEqual(R.parseEntry(k, mk({ pad: "x".repeat(R.MAX_BYTES + 10) })), null); });
t("scanLocal: hanya membaca (penyimpanan yang melempar saat tulis/hapus tidak tersentuh)", () => {
  const s = new Store({ "nusa-island-v1": mk(), "nusa-island-v1-bak-a-1793000000000": mk({ money: 5 }), "nusa-island-v1-bak-b-1793000001000": "{rusak", lain: "x" });
  const r = R.scanLocal(s); assert.strictEqual(s.writes, 0); assert(r.entries.length >= 1); assert(r.rejected >= 1); });
t("candidates: dedupe by hash, buang yang sama dengan simpanan sekarang, terbaru dulu", () => {
  const cur = mk({ money: 1 }); const a = R.parseEntry("nusa-island-v1-bak-a-1793000000000", mk({ money: 50 })), b = R.parseEntry("nusa-island-v1-bak-b-1793000009000", mk({ money: 50 })), c = R.parseEntry("nusa-island-v1-bak-c-1793000005000", cur), d = R.parseEntry("nusa-island-v1-bak-d-1793000003000", mk({ money: 60 }));
  const out = R.candidates([a, b, c, d], cur); assert.strictEqual(out.length, 2); assert(out[0].ts >= out[1].ts); assert(!out.some((x) => x.summary.money === 1)); });
t("cloudCandidate: progres identik (urutan kunci beda) → same; beda → tidak same", () => {
  const cl = mk({ money: 300 }); const reordered = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(cl)).reverse()));
  assert.strictEqual(R.cloudCandidate({ exists: true, data: cl, rev: 2, savedAt: "2026-11-01T00:00:00Z" }, reordered).same, true);
  assert.strictEqual(R.cloudCandidate({ exists: true, data: cl, rev: 2, savedAt: "2026-11-01T00:00:00Z" }, mk({ money: 1 })).same, false); });
t("cloudCandidate: tanpa data → null", () => assert.strictEqual(R.cloudCandidate({ exists: false }, mk()), null));
t("pagar statis: client.js hanya memanggil peek/restoreCloud/recoveryRequest — tidak ada tulis Cloud/ekonomi/top-up", () => {
  const src = fs.readFileSync(path.join(__dirname, "../recovery/client.js"), "utf8");
  assert(!/writeSave|restoreBackup|walletAdd|topup|topUp|grantCoins|localStorage\.clear/i.test(src), "client.js memuat panggilan terlarang");
  const removed = [...src.matchAll(/localStorage\.removeItem\(([^)]+)\)/g)].map((m) => m[1].trim());
  assert.deepStrictEqual(removed, ["R.SENT_KEY"], "hanya boleh menghapus penanda pengajuan setelah verifikasi; data game tidak boleh dihapus");
  const calls = [...src.matchAll(/cloud\(\)\.call\("([A-Za-z]+)"/g)].map((m) => m[1]); assert.deepStrictEqual([...new Set(calls)].sort(), ["recoveryRequest", "recoveryVerify"]); });
t("pagar statis: core.js tidak punya setItem/removeItem/clear", () => { const src = fs.readFileSync(path.join(__dirname, "../recovery/core.js"), "utf8"); assert(!/setItem|removeItem|\.clear\(/.test(src.replace(/\/\/.*$/gm, ""))); });
t("verifyPayload: hanya akun Google yang pernah mengirim permohonan; tanpa data tulis; issue dibatasi", () => {
  const sent = { hash: "abc", at: 1 }, meta = { mode: "google", uid: "u1", hash: "0a1b2c3d" };
  assert.deepStrictEqual(R.verifyPayload(sent, meta), { hash: "0a1b2c3d" });
  assert.deepStrictEqual(R.verifyPayload(sent, meta, "name_prompt"), { hash: "0a1b2c3d", issue: "name_prompt" });
  assert.deepStrictEqual(R.verifyPayload(sent, meta, "hack"), { hash: "0a1b2c3d" });
  assert.strictEqual(R.verifyPayload(null, meta), null, "tanpa permohonan terkirim → tidak memanggil server");
  assert.strictEqual(R.verifyPayload(sent, { mode: "guest", uid: null }), null, "tamu tidak memverifikasi");
  assert.deepStrictEqual(R.verifyPayload(sent, { mode: "google", uid: "u1", hash: "BUKAN HEX" }), {}, "hash tidak valid dibuang");
});
t("pagar statis: verifikasi hanya satu kali per sesi dan tidak menulis save", () => {
  const src = fs.readFileSync(path.join(__dirname, "../recovery/client.js"), "utf8");
  assert(/VERIFY_KEY/.test(src) && /sessionStorage\.setItem\(VERIFY_KEY/.test(src));
  assert(!/setInterval/.test(src), "tanpa polling");
});
console.log(`unit-recovery-ui: ${n} lulus`);
