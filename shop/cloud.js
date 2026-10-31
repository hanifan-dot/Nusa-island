// NUSA ISLAND — Tahap 3.6: klien PEMBAYARAN NYATA (Cloud Functions shop_*). Aktif hanya bila NUSA_SHOP.backend === "cloud".
// Klien TIDAK punya fungsi untuk menandai PAID/menyetujui; ownerApprove dst. hanya dipanggil Payment Center (Owner) — bukan game.
(function () {
"use strict";
window.NW = window.NW || {};
const CFG = window.NUSA_SHOP || {};
if (CFG.backend !== "cloud") return;
const load = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error("Gagal memuat Firebase")); document.head.appendChild(s); });
let fnP = null;
function fns() {
  if (fnP) return fnP;
  fnP = (async () => {
    const t0 = Date.now(); while (!(window.firebase && window.firebase.apps && window.firebase.apps.length) && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 100));
    if (!window.firebase || !window.firebase.apps.length) throw new Error("Firebase belum siap");
    if (!window.firebase.functions) await load("https://www.gstatic.com/firebasejs/10.14.1/firebase-functions-compat.js");
    return window.firebase.app().functions((window.NUSA_FIREBASE && window.NUSA_FIREBASE.functionsRegion) || "asia-southeast2");
  })();
  fnP.catch(() => { fnP = null; });
  return fnP;
}
const call = (name) => async (data) => {
  try { const f = await fns(); const r = await f.httpsCallable("shop_" + name)(data || {}); return r.data; }
  catch (e) { const m = String((e && e.code) || ""); throw Object.assign(new Error(e && e.message ? e.message : "Gagal menghubungi server toko."), { code: m.replace("functions/", "") || "internal" }); }
};
const signedIn = () => !!(NW.cloud && NW.cloud.user && NW.cloud.user.uid);
const needLogin = () => { throw Object.assign(new Error("Masuk dengan akun Google dulu untuk membeli."), { code: "unauthenticated" }); };
const authed = (name) => (d) => (signedIn() ? call(name)(d) : needLogin());
NW.shopApi = {
  sim: false, live: true, isGuest: () => !signedIn(), uid: () => (NW.cloud && NW.cloud.user && NW.cloud.user.uid) || null,
  getCatalog: call("getCatalog"), getTime: call("getTime"),
  createOrder: authed("createOrder"), cancelOrder: authed("cancelOrder"), claimPaid: authed("claimPaid"),
  listOrders: (d) => (signedIn() ? call("listOrders")(d) : { orders: [] }), getEntitlements: (d) => (signedIn() ? call("getEntitlements")(d) : { products: {}, owned: {}, wallet: { SIMULASI: 0, NYATA: 0 }, pending: null, env: "SIMULASI" }),
  listLedger: authed("listLedger"), redeemCoins: authed("redeemCoins"), ackDelivery: authed("ackDelivery"),
};
})();
