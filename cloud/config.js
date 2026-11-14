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

// Rumahku Sosial (minta izin berkunjung → pemilik TERIMA/TOLAK, blokir, senyap): MATI sampai Owner menyetujui deploy backend Tahap 4 (fungsi homeVisitRequest/homeInbox/homeVisitRespond/homePrefs di nusa-api).
window.NUSA_SOCIAL_HOME = false;
// Samudra Follower: pratinjau koleksi (?sf=preview) MATI di produksi. Ikan belum bisa dipancing sampai Owner menyetujui harga/peluang (shop_config/main.sf) dan jalur klien selesai.
if (window.NUSA_SF_PREVIEW !== true) window.NUSA_SF_PREVIEW = false;   // (uji boleh menyalakannya sebelum halaman dimuat)

// Pengiriman Segar Pak Damar (Fase A): MATI. Modul delivery/* tidak diunduh sama sekali bila false. Dinyalakan hanya oleh Owner setelah kontrak server Worker 01 siap.
// UI Kemudi Kapal (setir + tuas): MATI. kemudi/* tidak diunduh bila false; UI lama tetap.
if (window.NUSA_KEMUDI !== true) window.NUSA_KEMUDI = false;
if (window.NUSA_KOTA !== true) window.NUSA_KOTA = false;   // Visual Kota Nusa (Ide 04): MATI. kota/* tidak diunduh bila false; area Selat identik dengan sebelumnya. Hanya visual lokal: tanpa ekonomi, tanpa server.
if (window.NUSA_ROMBONGAN !== true) window.NUSA_ROMBONGAN = false;   // Kapal Rombongan (visual + klien): MATI. rombongan/* tidak diunduh bila false; kapal tunggal lama tidak berubah. Akses tetap dikunci server (kapalRombongan + NUSA_BOAT).
if (window.NUSA_DELIVERY !== true) window.NUSA_DELIVERY = false;   // (uji boleh menyalakannya sebelum halaman dimuat)
if (window.NUSA_PHONE !== true) window.NUSA_PHONE = false;   // NusaPhone (Ide 07): MATI. phone/* tidak diunduh bila false. HANYA saklar muat modul; akses = server (gameFlags.nusaPhone).
if (window.NUSA_DAPUR !== true) window.NUSA_DAPUR = false;   // Ide 08 Dapur Rumahku + Kedai Bu Indah (klien): MATI. dapur/* tidak diunduh bila false. HANYA saklar muat modul; akses = server (gameFlags.dapurRumahku).
