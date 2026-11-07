// Tes cf-auth-check.sh terhadap Cloudflare TIRUAN lokal (tanpa jaringan, tanpa rahasia asli).
const http = require("http"), { spawn } = require("child_process"), assert = require("assert"), path = require("path");
const SH = path.join(__dirname, "..", "firebase", "scripts", "cf-auth-check.sh");
const TOK = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-Zz", ACC = "0123456789abcdef0123456789abcdef";   // contoh palsu 40/32 karakter
const err = (code, message) => ({ success: false, errors: [{ code, message }], messages: [], result: null });
const ok = (result) => ({ success: true, errors: [], messages: [], result });
let pass = 0, fail = 0;
function mockServer(mode) {
  return new Promise((res) => { const s = http.createServer((q, r) => {
    const auth = q.headers.authorization || ""; const good = auth === "Bearer " + TOK; const send = (c, b) => { r.writeHead(c, { "content-type": "application/json" }); r.end(JSON.stringify(b)); };
    if (!good && mode.strictHeader !== false) return send(400, err(9106, "Authentication failed"));   // meniru: header rusak/tak ada → 400 9106
    const u = q.url;
    if (u === "/user/tokens/verify") return mode.user ? mode.user(send) : send(200, ok({ id: "x", status: "active" }));
    if (u === `/accounts/${ACC}/tokens/verify`) return mode.acct ? mode.acct(send) : send(401, err(1000, "Invalid API Token"));
    if (u === `/accounts/${ACC}/workers/scripts/nusa-api/settings`) return mode.settings ? mode.settings(send) : send(200, ok({ bindings: [] }));
    if (u === "/accounts") return mode.list ? mode.list(send) : send(403, err(10000, "Authentication error"));
    send(404, err(7003, "No route"));
  }).listen(0, "127.0.0.1", () => res(s)); });
}
function run(env, base) { return new Promise((res) => { const p = spawn("bash", [SH], { env: { PATH: process.env.PATH, CF_API_BASE: base, ...env } }); let o = ""; p.stdout.on("data", (d) => (o += d)); p.stderr.on("data", (d) => (o += d)); p.on("close", (code) => res({ code, out: o })); }); }
async function t(name, mode, env, want, kat, extra) {
  const s = await mockServer(mode || {}); const base = "http://127.0.0.1:" + s.address().port;
  try { const r = await run({ CLOUDFLARE_API_TOKEN: TOK, CLOUDFLARE_ACCOUNT_ID: ACC, ...env }, base);
    assert.equal(r.code, want, r.out); assert.ok(r.out.includes("KATEGORI: " + kat), r.out);
    const bare = (env.CLOUDFLARE_API_TOKEN || TOK).replace(/\s/g, ""); assert.ok(!r.out.includes(TOK) && !r.out.includes(ACC) && !r.out.includes(bare.replace(/^Bearer/i, "")), "RAHASIA BOCOR di log");
    if (extra) extra(r.out); pass++; console.log("  ok  " + name); } catch (e) { fail++; console.log("  GAGAL " + name + "\n" + String(e.message).split("\n").slice(0, 6).join("\n")); } finally { s.close(); }
}
(async () => {
  await t("token bersih valid → SIAP", {}, {}, 0, "SIAP");
  await t("token + baris baru (LF) di ujung → dibersihkan, SIAP, tak bocor", {}, { CLOUDFLARE_API_TOKEN: TOK + "\n" }, 0, "SIAP", (o) => assert.match(o, /spasi\/baris-baru=ya/));
  await t("token + CRLF + spasi → SIAP", {}, { CLOUDFLARE_API_TOKEN: " " + TOK + "\r\n" }, 0, "SIAP");
  await t("token berawalan 'Bearer ' → dibersihkan, SIAP", {}, { CLOUDFLARE_API_TOKEN: "Bearer " + TOK }, 0, "SIAP", (o) => assert.match(o, /awalan-Bearer=ya/));
  await t("token dikutip \"…\" → SIAP", {}, { CLOUDFLARE_API_TOKEN: '"' + TOK + '"' }, 0, "SIAP");
  await t("token berawalan NAMA=… → SIAP", {}, { CLOUDFLARE_API_TOKEN: "CLOUDFLARE_API_TOKEN=" + TOK }, 0, "SIAP");
  await t("token akun (bukan pengguna): /user gagal, /accounts/ID/tokens/verify sukses → SIAP", { user: (s) => s(401, err(1000, "Invalid API Token")), acct: (s) => s(200, ok({ status: "active" })) }, {}, 0, "SIAP", (o) => assert.match(o, /jenis token akun/));
  await t("token berisi karakter terlarang di tengah → TOKEN_FORMAT_RUSAK (10)", {}, { CLOUDFLARE_API_TOKEN: TOK.slice(0, 20) + "!" + TOK.slice(21) }, 10, "TOKEN_FORMAT_RUSAK");
  await t("Cloudflare membalas 400/9106 untuk token berbentuk benar → TOKEN_FORMAT_RUSAK (10)", { strictHeader: false, user: (s) => s(400, err(9106, "Authentication failed")), acct: (s) => s(400, err(9106, "Authentication failed")) }, {}, 10, "TOKEN_FORMAT_RUSAK");
  await t("token dicabut/tak valid (401/1000) → TOKEN_TIDAK_VALID (11), bukan 'izin kurang'", { user: (s) => s(401, err(1000, "Invalid API Token")), acct: (s) => s(401, err(1000, "Invalid API Token")) }, {}, 11, "TOKEN_TIDAK_VALID");
  await t("token kedaluwarsa → 12", { user: (s) => s(200, ok({ status: "expired" })) }, {}, 12, "TOKEN_KEDALUWARSA");
  await t("izin kurang: settings 403, /accounts memuat akun → IZIN_KURANG (13)", { settings: (s) => s(403, err(10000, "Authentication error")), list: (s) => s(200, ok([{ id: ACC }])) }, {}, 13, "IZIN_KURANG");
  await t("Account ID salah PASTI: settings 403, /accounts tanpa akun itu → ACCOUNT_ID_SALAH (14)", { settings: (s) => s(403, err(10000, "Authentication error")), list: (s) => s(200, ok([{ id: "f".repeat(32) }])) }, {}, 14, "ACCOUNT_ID_SALAH");
  await t("403 dan daftar akun tertutup → IZIN_KURANG_ATAU_ACCOUNT_SALAH (13), jujur ambigu", { settings: (s) => s(403, err(10000, "Authentication error")) }, {}, 13, "IZIN_KURANG_ATAU_ACCOUNT_SALAH");
  await t("Worker tak ada → WORKER_TIDAK_DITEMUKAN (15)", { settings: (s) => s(404, err(10007, "This Worker does not exist")) }, {}, 15, "WORKER_TIDAK_DITEMUKAN");
  await t("Account ID bentuk salah → 17", {}, { CLOUDFLARE_ACCOUNT_ID: "bukan-id" }, 17, "ACCOUNT_ID_FORMAT");
  await t("secret kosong → 18", {}, { CLOUDFLARE_API_TOKEN: "" }, 18, "SECRET_KOSONG");
  // dipakai lewat `source` dari deploy-api-kandidat.sh (set -euo pipefail): token bersih terekspor; kegagalan menghentikan deploy
  const wrap = (body) => new Promise((res) => { const p = spawn("bash", ["-c", `set -euo pipefail; . "${SH}"; ${body}`], { env: { PATH: process.env.PATH, CF_API_BASE: wrap.base, CLOUDFLARE_API_TOKEN: TOK + "\n", CLOUDFLARE_ACCOUNT_ID: ACC } }); let o = ""; p.stdout.on("data", (d) => (o += d)); p.stderr.on("data", (d) => (o += d)); p.on("close", (code) => res({ code, out: o })); });
  { const s = await mockServer({}); wrap.base = "http://127.0.0.1:" + s.address().port; const r = await wrap('[ "$CLOUDFLARE_API_TOKEN" = "' + TOK + '" ] && echo LANJUT-DEPLOY'); s.close(); try { assert.equal(r.code, 0, r.out); assert.ok(r.out.includes("LANJUT-DEPLOY")); pass++; console.log("  ok  di-source dari deploy: token bersih terekspor, deploy lanjut"); } catch (e) { fail++; console.log("  GAGAL source\n" + r.out); } }
  { const s = await mockServer({ settings: (x) => x(403, err(10000, "Authentication error")) }); wrap.base = "http://127.0.0.1:" + s.address().port; const r = await wrap("echo TIDAK-BOLEH-LANJUT"); s.close(); try { assert.equal(r.code, 13); assert.ok(!r.out.includes("TIDAK-BOLEH-LANJUT")); pass++; console.log("  ok  di-source: kegagalan autentikasi menghentikan deploy (kode 13)"); } catch (e) { fail++; console.log("  GAGAL source-stop\n" + r.out); } }
  { const r = await run({ CLOUDFLARE_API_TOKEN: TOK, CLOUDFLARE_ACCOUNT_ID: ACC }, "http://127.0.0.1:1"); try { assert.equal(r.code, 16); assert.ok(r.out.includes("KATEGORI: JARINGAN")); pass++; console.log("  ok  jaringan mati → JARINGAN (16)"); } catch (e) { fail++; console.log("  GAGAL jaringan\n" + r.out); } }
  console.log(`unit cf-auth: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
