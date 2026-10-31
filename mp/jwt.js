// =========================================================
//  NUSA ISLAND — verifikasi ID token Firebase di Worker (tanpa rahasia, tanpa Admin SDK, tanpa Blaze)
//  Token RS256 diverifikasi dengan kunci publik Google (JWKS securetoken). Hanya akun Google dengan email terverifikasi yang lolos.
//  Murni WebCrypto: berjalan di Cloudflare Workers dan Node ≥ 20 (untuk pengujian).
// =========================================================
(function (root) {
"use strict";
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const b64u = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const jsonOf = (s) => JSON.parse(new TextDecoder().decode(b64u(s)));
const fail = (why) => { const e = new Error("token: " + why); e.code = "auth"; e.why = why; throw e; };

let cache = { keys: null, exp: 0 };
async function getKeys(opts) {
  const now = opts.now(); if (cache.keys && now < cache.exp && !opts.noCache) return cache.keys;
  const res = await (opts.fetchJwks ? opts.fetchJwks() : fetch(JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } }).then((r) => { if (!r.ok) throw new Error("jwks"); return r.json(); }));
  if (!res || !Array.isArray(res.keys)) fail("jwks-bentuk");
  cache = { keys: res.keys, exp: now + 3600 * 1000 }; return cache.keys;
}
function resetCache() { cache = { keys: null, exp: 0 }; }

// Mengembalikan { uid } bila sah; melempar Error (code "auth") bila tidak.
async function verifyFirebaseToken(token, opts) {
  opts = Object.assign({ now: () => Date.now() }, opts || {});
  if (!opts.projectId) fail("projectId-kosong");
  if (typeof token !== "string" || token.length > 4096) fail("bentuk");
  const parts = token.split("."); if (parts.length !== 3) fail("bentuk");
  let h, pl; try { h = jsonOf(parts[0]); pl = jsonOf(parts[1]); } catch (e) { fail("dekode"); }
  if (h.alg !== "RS256" || typeof h.kid !== "string") fail("alg");
  let keys = await getKeys(opts), jwk = keys.find((k) => k.kid === h.kid);
  if (!jwk) { resetCache(); keys = await getKeys(Object.assign({}, opts, { noCache: true })); jwk = keys.find((k) => k.kid === h.kid); }   // rotasi kunci
  if (!jwk) fail("kid");
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) fail("tanda-tangan");
  const nowS = Math.floor(opts.now() / 1000);
  if (pl.aud !== opts.projectId) fail("aud");
  if (pl.iss !== "https://securetoken.google.com/" + opts.projectId) fail("iss");
  if (typeof pl.exp !== "number" || pl.exp <= nowS) fail("kedaluwarsa");
  if (typeof pl.iat !== "number" || pl.iat > nowS + 300) fail("iat");
  if (typeof pl.auth_time === "number" && pl.auth_time > nowS + 300) fail("auth_time");
  if (typeof pl.sub !== "string" || !pl.sub || pl.sub.length > 128) fail("sub");
  const fb = pl.firebase || {};
  if (fb.sign_in_provider !== "google.com") fail("penyedia");          // sama dengan Rules Cloud Save: hanya Google
  if (pl.email_verified !== true) fail("email-belum-terverifikasi");
  return { uid: pl.sub };
}

const API = { JWKS_URL, verifyFirebaseToken, resetCache };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.MPJwt = API; }
})(typeof window !== "undefined" ? window : globalThis);
