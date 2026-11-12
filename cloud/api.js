// NUSA ISLAND — klien backend Cloudflare Worker (tanpa Blaze). Aktif hanya bila window.NUSA_FIREBASE.apiBase terisi (cloud/config.js).
// Mengirim ID token Firebase (Bearer) ke /fn/<nama>. Tidak ada rahasia di browser: kunci akun layanan hanya ada di secret Worker.
(function () {
"use strict";
const base = () => String((window.NUSA_FIREBASE && window.NUSA_FIREBASE.apiBase) || "").replace(/\/+$/, "");
async function call(name, data, needAuth) {
  let token = null;
  try { const u = window.firebase && window.firebase.apps && window.firebase.apps.length && window.firebase.auth().currentUser; if (u) token = await u.getIdToken(); } catch (e) { /* tanpa token */ }
  if (needAuth && !token) throw Object.assign(new Error("Masuk dulu dengan akun Google."), { code: "unauthenticated" });
  let res;
  try { res = await fetch(base() + "/fn/" + name, { method: "POST", headers: Object.assign({ "content-type": "application/json" }, token ? { authorization: "Bearer " + token } : {}), body: JSON.stringify({ data: data || {} }) }); }
  catch (e) { throw Object.assign(new Error("Jaringan bermasalah."), { code: "unavailable" }); }
  let j = null; try { j = await res.json(); } catch (e) { /* bukan JSON */ }
  if (res.ok && j && "result" in j) return j.result;
  const er = (j && j.error) || {}; throw Object.assign(new Error(er.message || "Gagal menghubungi server."), { code: er.status || (res.status >= 500 ? "internal" : "unavailable") });
}
window.NusaApi = { enabled: () => !!base(), call };
})();
