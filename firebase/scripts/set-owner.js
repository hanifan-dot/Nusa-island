#!/usr/bin/env node
// NUSA ISLAND — mendaftarkan / mencabut akun Owner. DIJALANKAN ADMINISTRATOR secara lokal, TIDAK PERNAH dari frontend.
//
//   export GOOGLE_APPLICATION_CREDENTIALS=/jalur/aman/di-luar-repo/service-account.json
//   export OWNER_EMAIL="email-owner@contoh.com"          # dibaca dari lingkungan; email TIDAK disimpan di repo
//   node set-owner.js --uid <FIREBASE_UID_OWNER>          # daftarkan
//   node set-owner.js --uid <FIREBASE_UID_OWNER> --revoke # cabut
//
// Syarat sebelum claim dipasang (semua diperiksa lewat Firebase Admin SDK):
//   1. Akun dengan UID itu ada dan emailnya sama dengan OWNER_EMAIL,
//   2. email sudah terverifikasi,
//   3. penyedia login Google (google.com).
// Pasangan UID↔akun inilah yang "didaftarkan administrator"; mengetahui/mengetik email di game tidak memberi apa pun.
// Setelah dijalankan, pengguna harus login ulang atau menyegarkan token agar claim berlaku.
"use strict";
const admin = require("firebase-admin");
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const revoke = args.includes("--revoke"), uid = flag("--uid"), email = process.env.OWNER_EMAIL;

(async () => {
  if (!uid || (!revoke && !email)) { console.error("Pakai: OWNER_EMAIL=... node set-owner.js --uid <UID> [--revoke]"); process.exit(2); }
  admin.initializeApp();
  const user = await admin.auth().getUser(uid);
  const claims = Object.assign({}, user.customClaims || {});
  if (revoke) {
    delete claims.role;
    await admin.auth().setCustomUserClaims(uid, claims);
    await admin.firestore().doc(`owners/${uid}`).set({ active: false, revokedAt: new Date().toISOString() }, { merge: true });
    await admin.auth().revokeRefreshTokens(uid);
    console.log("Owner dicabut untuk", uid); return;
  }
  const google = user.providerData.some((p) => p.providerId === "google.com");
  if (!user.email || user.email.toLowerCase() !== email.toLowerCase()) throw new Error("Email akun tidak cocok dengan OWNER_EMAIL.");
  if (!user.emailVerified) throw new Error("Email belum terverifikasi.");
  if (!google) throw new Error("Akun bukan login Google.");
  claims.role = "owner";
  await admin.auth().setCustomUserClaims(uid, claims);
  await admin.firestore().doc(`owners/${uid}`).set({ active: true, registeredAt: new Date().toISOString() });   // tanpa email
  console.log("Owner terdaftar untuk UID", uid, "(email tidak disimpan di Firestore)");
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
