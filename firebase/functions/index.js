// NUSA ISLAND — Tahap 3: Cloud Functions (callable, Gen 2). TIDAK DIPAKAI di mode Spark (lihat docs/TAHAP3.md); disimpan untuk
// kalau nanti memakai paket Blaze (dengan firestore.rules.blaze-functions).
// Semua logika ada di lib/core.js (diuji di tests/unit-cloud.js). File ini hanya jembatan ke Firebase:
//   - mengambil identitas dari request.auth (token TERVERIFIKASI oleh Firebase, bukan dari isi permintaan),
//   - membungkus Firestore Admin SDK sebagai `db`,
//   - menerjemahkan CloudError → HttpsError.
// BELUM DIUJI terhadap Firebase sungguhan (emulator & paket npm tidak tersedia saat pengembangan). Lihat docs/TAHAP3.md.
"use strict";
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const core = require("./lib/core");

admin.initializeApp();
setGlobalOptions({ region: process.env.NUSA_REGION || "asia-southeast2", maxInstances: 10 });
const fs = admin.firestore();

const docRef = (path) => fs.doc(path);
const db = {
  get: async (path) => { const s = await docRef(path).get(); return s.exists ? s.data() : null; },
  tx: (fn) => fs.runTransaction(async (t) => fn({
    get: async (path) => { const s = await t.get(docRef(path)); return s.exists ? s.data() : null; },
    set: async (path, obj) => { t.set(docRef(path), obj); },
  })),
};
let ecoApi = null;   // diisi di bagian ekonomi (di bawah); overlay dipanggil saat runtime, jadi urutan definisi aman
const server = core.makeServer(db, {
  overlay: (uid) => (ecoApi ? ecoApi.authoritative(uid) : null),
  enforce: (save, au) => require("./lib/economy-core").enforce(save, au),
});

const authOf = (req) => (req.auth ? { uid: req.auth.uid, token: req.auth.token } : null);
const wrap = (name) => onCall({ enforceAppCheck: false /* aktifkan App Check setelah dikonfigurasi pemilik proyek */ }, async (req) => {
  try { return await server[name](authOf(req), req.data || {}); }
  catch (e) {
    if (e instanceof core.CloudError) throw new HttpsError(e.code, e.message);
    console.error(name, e);
    throw new HttpsError("internal", "Terjadi kesalahan server.");
  }
});

exports.loadSave = wrap("loadSave");
exports.writeSave = wrap("writeSave");
exports.listBackups = wrap("listBackups");
exports.restoreBackup = wrap("restoreBackup");
exports.ownerAccess = wrap("ownerAccess");
exports.ownerSandboxLoad = wrap("ownerSandboxLoad");
exports.ownerSandboxSave = wrap("ownerSandboxSave");

// =====================================================================================================
//  Tahap 3.6 — PREMIUM SHOP NYATA (butuh paket Blaze). Logika = shop/core.js (disalin ke lib/shop-core.js).
//  Pembayaran nyata HANYA hidup bila variabel lingkungan NUSA_SHOP_LIVE=1 dipasang saat deploy DAN Owner menyetel mode "nyata".
//  Tanpa itu semua pesanan = SIMULASI dan confirmPayment menolak. Status PAID hanya bisa ditulis oleh ownerApprove (klaim role=owner
//  dari token terverifikasi) — tidak ada jalur dari browser pemain.
// =====================================================================================================
const shopCore = require("./lib/shop-core");
// Path logis "shop/orders/ID" (3 segmen) → dokumen Firestore "shop_orders/ID" (2 segmen)
const sp = (p) => { const a = p.split("/"); return a.length === 3 ? `${a[0]}_${a[1] === "userOrders" ? "user_orders" : a[1]}/${a[2]}` : p; }; // sama dengan dashboard (server/shop/db.js)
const shopDb = {
  get: async (p) => { const s = await fs.doc(sp(p)).get(); return s.exists ? s.data() : null; },
  tx: (fn) => fs.runTransaction(async (t) => {
    // Firestore melarang membaca setelah menulis di satu transaksi → tulisan ditahan dulu (baca-tulis-sendiri tetap konsisten) lalu diterapkan di akhir.
    const buf = new Map();
    const out = await fn({
      get: async (p) => { if (buf.has(p)) return JSON.parse(JSON.stringify(buf.get(p))); const s = await t.get(fs.doc(sp(p))); return s.exists ? s.data() : null; },
      set: async (p, o) => { buf.set(p, JSON.parse(JSON.stringify(o))); },
    });
    for (const [p, o] of buf) t.set(fs.doc(sp(p)), o);
    return out;
  }),
  async queryOrders({ status, q, limit }) {
    const col = fs.collection("shop_orders");
    if (q && /^NI-/i.test(q)) { const s = await col.doc(q.toUpperCase()).get(); return s.exists && (!status || s.data().status === status) ? [s.data()] : []; }
    let ref = col;
    if (q) { ref = ref.where("nickLower", "==", q.toLowerCase()); if (status) ref = ref.where("status", "==", status); const snap = await ref.limit(100).get(); return snap.docs.map((d) => d.data()).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit); }
    if (status) ref = ref.where("status", "==", status);
    const snap = await ref.orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data());
  },
};
const LIVE = process.env.NUSA_SHOP_LIVE === "1";
const shop = shopCore.makeShopServer(shopDb, { realEnabled: LIVE });
const shopWrap = (name, publicOk) => onCall({ enforceAppCheck: false }, async (req) => {
  try {
    const a = authOf(req);
    if (!a && !publicOk) throw new shopCore.ShopError("unauthenticated", "Masuk dulu.");
    // Pemain tidak pernah mengirim uid/role: identitas hanya dari token. Klaim 'owner' hanya diset lewat Admin SDK (firebase/scripts/set-owner.js).
    return JSON.parse(JSON.stringify(await shop[name](a, req.data || {})));
  } catch (e) {
    if (e instanceof shopCore.ShopError) throw new HttpsError(e.code, e.message);
    console.error("shop:" + name, e.message); throw new HttpsError("internal", "Terjadi kesalahan server.");
  }
});
for (const n of ["getCatalog", "getTime"]) exports["shop_" + n] = shopWrap(n, true);
for (const n of ["createOrder", "cancelOrder", "claimPaid", "listOrders", "getEntitlements", "listLedger", "spendCoins"
]) exports["shop_" + n] = shopWrap(n, false);
// SENGAJA tidak ada fungsi Owner (setujui/tolak/mode/pilot) di sini: satu-satunya jalur persetujuan = server dashboard (Cloud Run) yang memeriksa
// token + claim role=owner + owners/{uid}.active dan memeriksa integritas pesanan. Mengurangi permukaan serangan pada fungsi yang bisa dipanggil publik.
// NB: simulatePayment sengaja TIDAK diekspor — pada produksi tidak ada jalur "anggap dibayar".

// =====================================================================================================
//  Ekonomi server-otoritatif (lib/economy-core.js): SATU dompet koin; tangkapan/jual/hadiah/belanja dihitung & dicatat server.
//  writeSave/loadSave menimpa money/up/home.level dengan nilai server (lihat overlay di atas). Koleksi Firestore: shop_economy (hanya Admin SDK).
// =====================================================================================================
const ecoCore = require("./lib/economy-core");
ecoApi = ecoCore.makeEconomyServer(shopDb, {
  tables: require("./lib/economy-tables"), fishmath: require("./lib/fishmath"), streak: require("./lib/streak-core"),
  initCap: process.env.NUSA_ECO_INIT_CAP !== undefined ? Number(process.env.NUSA_ECO_INIT_CAP) : 20000,   // saat rilis resmi: NUSA_ECO_INIT_CAP=0
});
const ecoWrap = (name) => onCall({ enforceAppCheck: false }, async (req) => {
  try {
    const a = authOf(req); if (!a) throw new ecoCore.EcoError("unauthenticated", "Masuk dulu.");
    return JSON.parse(JSON.stringify(await ecoApi[name](a, req.data || {})));
  } catch (e) {
    if (e instanceof ecoCore.EcoError) throw new HttpsError(e.code, e.message);
    console.error("eco:" + name, e.message); throw new HttpsError("internal", "Terjadi kesalahan server.");
  }
});
for (const n of ["ecoState", "ecoInit", "ecoCatch", "ecoSell", "ecoDrop", "ecoReward", "ecoMission", "ecoBuy", "ecoStreakState", "ecoStreakClaim"]) exports[n] = ecoWrap(n);
