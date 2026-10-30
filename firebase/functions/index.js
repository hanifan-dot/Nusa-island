// NUSA ISLAND — Tahap 3: Cloud Functions (callable, Gen 2).
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
const server = core.makeServer(db);

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
