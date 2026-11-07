# Kolam Ikan Rumahku (Tugas 2)

Kolam pribadi di halaman Rumahku (pojok kanan-bawah, jauh dari pintu/gerbang/jalan setapak; tidak menghalangi jalan — diuji BFS di rumah Lv1/5/10). Tombol interaksi **🐟 Kelola Kolam** → panel *Kolam Ikanku*: kapasitas, daftar ikan (nama, berat, rarity, % kenyang, perkiraan waktu habis), Masukkan Ikan, Ambil Ikan, Beri Makan, Toko Kolam, Upgrade Kolam.

## Aturan (semua dihitung SERVER, `economy/pond-core.js` + `ecoPond*` di `economy/core.js`)
- Kapasitas: Lv1 20 KG (gratis) · Lv2 50 (10.000) · Lv3 100 (35.000) · Lv4 150 (75.000) · Lv5 200 KG (150.000). Tampilan kolam makin bagus tiap level.
- Kenyang 100% saat masuk; −1% / 6 jam (100→0 ≈ 25 hari). Peringatan di ≤30% (mulai lapar), ≤15% (lapar!), ≤5% (KRITIS). Di 0% ikan mati: "X_X Ikannya meningoy karena kelaparan! Jangan lupa kasih makan, bos!"
- Waktu = jam server (`t0` + `s0` per ikan). Klien tidak mengirim waktu/kenyang/berat/harga. Refresh, login ulang, atau ubah jam HP tidak mengubah apa pun. Waktu mati = `t0 + s0×6 jam` (bukan saat login). Pemrosesan kematian idempoten dalam transaksi yang sama dengan pencatatan riwayat (`hist`, 40 terakhir) → bisa diaudit; ikan lain & inventaris tidak tersentuh.
- Satu pakan memberi makan **semua** ikan di kolam; pakan tidak terpakai bila semua sudah 100%. Sisa waktu pecahan (<6 jam) dipertahankan saat memberi makan.
- Toko Kolam: Pelet 500 (+20%) · Nutrisi 2.000 (+50%) · Premium 5.000 (penuh). Perlengkapan (harga usulan): Aerator 3.500 (maks 1) · Tanaman Air 1.500 (maks 3) · Lampu Kolam 2.500 (maks 1). Jumlah dipilih pemain, ada konfirmasi transaksi, memakai dompet tunggal (koin bermain dulu, lalu Top Up).

## Keamanan
- Data kolam terikat UID di dokumen ekonomi (`eco.pond`); akun lain tidak punya jalur akses.
- Masuk/ambil ikan **atomik** dengan kotak ikan server (satu transaksi): ikan di kolam otomatis tak bisa dijual/dipakai (`ecoSell` hanya menjual isi kotak). Ikan sampah/dilindungi ditolak. Berat & spesies dari server.
- Anti-duplikasi: `opId` idempoten (spam/ulang jaringan tidak menggandakan koin/pakan/ikan); transaksi paralel serial; uid ikan di kolam/riwayat dilewati `ecoCatch` sehingga simpanan lama yang dipulihkan tidak bisa "menghidupkan"/menggandakan ikan. Ikan yang diambil dipulihkan ke coolbox lewat `limbo` bila aplikasi tertutup di tengah jalan (hanya jika masih ada di kotak server).
- Cloud Save tidak berubah (data kolam di server) → kompatibel dengan progres lama. Payment Center/Premium Shop/multiplayer tidak disentuh.
- `state` hanya menulis bila ada perubahan (hemat kuota tulis).

## Batas jujur / syarat aktif
1. **Kode Worker `nusa-api` TIDAK ada di repo ini.** Server kolam sudah ada di `economy/core.js` + callable Functions (`firebase/functions/index.js`, lib disinkronkan), tetapi Worker yang live harus memuat `pond-core.js` dan mendaftarkan `ecoPondState/Put/Take/Feed/Buy/Upgrade` (opsi `pond: PondCore` pada `makeEconomyServer`). **Sampai itu dilakukan, kolam TERKUNCI** ("belum diaktifkan di server") — tidak ada transaksi lokal rawan curang. Tamu/offline: terkunci juga (tidak ada waktu tepercaya).
2. Belum diuji ke Firebase/Cloudflare sungguhan; diuji dengan inti server yang sama di dalam halaman.
3. Performa Android: diukur di Chromium dengan CPU diperlambat 4× (bukan perangkat nyata).
4. Keseimbangan: pakan Nutrisi (40 koin/%) kurang efisien dari Pelet (25 koin/%) sesuai harga yang ditetapkan; disarankan Nutrisi ±1.200. Upgrade total 270.000 setara joran maks (110.000) + rumah maks (55.000) ×~1,6; ikan legenda bernilai ≤16.600.
5. Ikan di aquarium dalam rumah belum bisa langsung masuk kolam (ambil ke coolbox dulu).

Tes: `node tests/unit-pond.js` (24), `python tests/browser/test_pond.py` (58). Gambar: `docs/kolam-ikan/`.
