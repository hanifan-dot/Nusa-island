// NUSA ISLAND — konfigurasi Firebase (dibaca frontend).
// Proyek: "Nusa island" (ID nusa-island-d2023), proyek BARU khusus Nusa Island (bukan Kota Nusa).
// Nilai ini BUKAN rahasia: apiKey web Firebase memang publik. Keamanan ada di Firestore Rules + Cloud Functions + (nanti) App Check
// dan pembatasan apiKey ke domain game. Jangan pernah menaruh private key / service account di sini atau di repo.
// Untuk mematikan cloud sementara (mis. pengujian): buka game dengan ?cloud=off
window.NUSA_FIREBASE = {
  apiKey: "AIzaSyD7IVR0VJJUAAEy3Z0YY9uvhIoOVd89iiw",
  authDomain: "nusa-island-d2023.firebaseapp.com",
  projectId: "nusa-island-d2023",
  storageBucket: "nusa-island-d2023.firebasestorage.app",
  messagingSenderId: "866857686204",
  appId: "1:866857686204:web:0bc82d863b5687ddd3acb9",
  functionsRegion: "asia-southeast2",  // Jakarta; Firestore juga akan dibuat di asia-southeast2
  apiBase: ""                          // alamat Cloudflare Worker (tanpa Blaze), mis. "https://nusa-api.<akun>.workers.dev". Kosong = mode lama.
};
