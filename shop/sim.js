// =========================================================
//  NUSA ISLAND — Tahap 3.5: BACKEND SIMULASI Premium Shop (mode Spark / tanpa uang).
//  Memakai NusaShopCore.makeShopServer yang SAMA dengan backend nyata nanti. Data di localStorage per UID (hanya contoh).
//  realEnabled SELALU false di sini → pembayaran nyata mustahil dari browser. Semua pesanan bertanda SIMULASI.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const KEY = "nusa-shop-sim-v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
let mem = load();
const flush = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} };
const db = {
  get: async (p) => (mem[p] === undefined ? null : JSON.parse(JSON.stringify(mem[p]))),
  tx: async (f) => { const draft = {}; const r = await f({ get: async (p) => (draft[p] !== undefined ? JSON.parse(JSON.stringify(draft[p])) : mem[p] === undefined ? null : JSON.parse(JSON.stringify(mem[p]))), set: async (p, v) => { draft[p] = JSON.parse(JSON.stringify(v)); } }); Object.assign(mem, draft); flush(); return r; },
};
const server = NusaShopCore.makeShopServer(db, { realEnabled: false });
// uid: akun Google bila masuk, kalau tidak "tamu" (tamu hanya di perangkat ini; tidak bisa dipulihkan di perangkat lain)
const uid = () => (NW.cloud && NW.cloud.user && NW.cloud.user.uid) || "tamu-lokal";
const auth = () => ({ uid: uid() });
const test = /[?&]shoptest=1/.test(location.search);
// pembungkus yang mengisi auth otomatis — pemain TIDAK bisa memilih uid
const call = (n) => (p) => server[n](auth(), p);
NW.shopApi = {
  sim: true, isGuest: () => !(NW.cloud && NW.cloud.user && NW.cloud.user.uid), uid,
  getCatalog: () => server.getCatalog(), getTime: () => server.getTime(),
  createOrder: call("createOrder"), cancelOrder: call("cancelOrder"), claimPaid: call("claimPaid"), simulatePayment: call("simulatePayment"),
  listOrders: call("listOrders"), getEntitlements: call("getEntitlements"), listLedger: call("listLedger"),
};
// alat uji Owner — HANYA aktif bila URL memuat ?shoptest=1 (bukan untuk pemain)
if (test) NW.shopTest = {
  owner: { uid: "owner-uji", token: { role: "owner" } }, server,
  setLaunch: (ms, days) => server.ownerSetLaunch({ uid: "owner-uji", token: { role: "owner" } }, { launchAt: ms, promoDays: days }),
  reset: () => { mem = {}; flush(); },
};
})();
