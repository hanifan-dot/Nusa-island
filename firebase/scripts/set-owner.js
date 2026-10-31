// Memberi klaim role=owner ke SATU akun Google (UID) — dijalankan Owner di Cloud Shell. Klaim ini yang dipakai Payment Center.
// Pakai: node firebase/scripts/set-owner.js <UID>      (UID ada di Firebase Console → Authentication → Users)
// Butuh: npm i firebase-admin  dan  gcloud auth application-default login (di Cloud Shell sudah siap).
const admin = require("firebase-admin"); const uid = process.argv[2];
if (!uid) { console.error("Isi UID: node set-owner.js <UID>"); process.exit(1); }
admin.initializeApp({ projectId: "nusa-island-d2023" });
admin.auth().setCustomUserClaims(uid, { role: "owner" }).then(() => { console.log("Selesai. Akun itu harus keluar-masuk (login ulang) agar klaim berlaku."); process.exit(0); }).catch((e) => { console.error(e.message); process.exit(1); });
