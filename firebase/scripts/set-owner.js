// Menjadikan SATU akun Google (UID) sebagai Owner — dijalankan Owner di Cloud Shell. Dua syarat yang dipakai Payment Center/backend:
//   (1) klaim token role=owner   (2) dokumen registri owners/{uid}.active=true   (keduanya wajib; klaim saja tidak cukup)
// Pakai: node firebase/scripts/set-owner.js <UID>      (UID ada di Firebase Console → Authentication → Users)
//        node firebase/scripts/set-owner.js <UID> --cabut   (mencabut keduanya)
// Butuh: npm i firebase-admin  dan  gcloud auth application-default login (di Cloud Shell sudah siap). Berjalan di paket Spark.
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const uid = process.argv[2], revoke = process.argv.includes("--cabut");
if (!uid || !/^[A-Za-z0-9_-]{6,128}$/.test(uid)) { console.error("Isi UID: node set-owner.js <UID> [--cabut]"); process.exit(1); }
initializeApp({ projectId: "nusa-island-d2023" });
(async () => {
  const u = await getAuth().getUser(uid);
  if (!revoke && !u.emailVerified) throw new Error("Email akun ini belum terverifikasi; Owner harus akun Google terverifikasi.");
  await getAuth().setCustomUserClaims(uid, revoke ? {} : { role: "owner" });
  await getFirestore().doc(`owners/${uid}`).set({ active: !revoke, email: u.email || null, updatedAt: Date.now() });
  console.log(revoke ? "Akses Owner dicabut." : `Selesai: ${u.email} jadi Owner. Akun itu harus keluar-masuk (login ulang) agar klaim berlaku.`);
})().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
