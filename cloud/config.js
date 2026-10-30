// NUSA ISLAND — konfigurasi Firebase (dibaca frontend).
// Nilai di bawah ini BUKAN rahasia (apiKey web Firebase memang publik; keamanan ada di Rules + Cloud Functions),
// tetapi proyek Firebase untuk Nusa Island BELUM dibuat, jadi dibiarkan kosong. Selama null, Cloud Save non-aktif dan
// game berjalan seperti sebelumnya (tanpa layar login). Cara mengisinya: docs/TAHAP3.md.
//
// Jangan menaruh private key / service account di sini atau di mana pun dalam repo.
window.NUSA_FIREBASE = null;
/* Contoh (isi dari Firebase Console → Project settings → Your apps → Web app):
window.NUSA_FIREBASE = {
  apiKey: "...", authDomain: "PROYEK.firebaseapp.com", projectId: "PROYEK", appId: "...",
  functionsRegion: "asia-southeast2"
};
*/
