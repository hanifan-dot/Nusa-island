# STATUS Ide 07 NusaPhone (Draft, semua flag MATI)
Kontrak: [CONTRACT-NUSAPHONE.md](CONTRACT-NUSAPHONE.md). Urutan: UI HP → PlayGame+5 game → NusaWeb/Zentro → sosial → toko 6 model → Payment Center.

| Tahap | Status |
|---|---|
| 1. UI perangkat HP (HUD, animasi karakter, kunci/home, tema, 4 ukuran layar, putus koneksi, flag OFF = tidak diunduh) | Selesai di cabang (uji unit + browser) |
| 2. PlayGame (toko aplikasi) + TEPAT 5 game + Ocean Spin (klien + server) | Selesai di cabang (backend: `nusaphone-server` 15/15, `nusaphone-sumber-koin` 2/2, suite penuh 400 lulus/0 gagal; klien: `test_phone_games.py` store 12 · games 55 · ocean 24 · offline 3, semua lulus) |
| 3. NusaWeb + Zentro + NusaOcean | Selesai di cabang (`test_phone_web.py` 45 lulus: alamat/Kembali/Beranda/tab ≤3/markah, alamat non-.nusa & HTML ditolak tanpa permintaan jaringan, Zentro hanya indeks lokal, NusaOcean = Ocean Spin yang sama) |
| 4. Klippy, NusaChat, Dompet Nusa | Belum |
| 5. Toko 6 model + toko fisik Kota | Belum |
| 6. Integrasi Payment Center/QRIS | Belum |

## Menunggu keputusan Owner
- **Nama lima model** (sementara: `Model Sementara 1–5`; hanya Nusa Crown 17 bernama) dan pemetaan **empat lini** (usulan: A = s1,s2 [koin]; B = s3; C = s4,s5; D = Nusa Crown 17).
- **Harga**: dua model koin (harga koin = angka uji); premium s3/s4/s5/Crown = Rp5.000/Rp10.000/Rp15.000/Rp25.000 (urutan model→harga = usulan).
- **Kapasitas (GB virtual, usulan)**: Dasar 16 · s1 24 · s2 32 · s3 48 · s4 64 · s5 96 · Crown 17 128. Aplikasi inti 3 GB; lima game total 5,55 GB.
- **Peluang & tabel hadiah Ocean Spin** selain Zeus Petir (0,050%, 100 kg) dan biaya 500 koin/spin = angka uji "menunggu Owner".
- Ocean Spin & ledger koin bermain: **terjawab di tahap 2** tanpa bidang baru — `eco.bal` = koin bermain (hanya naik lewat gameplay `credit()`/migrasi `ecoInit`), top-up = `ent.wallet.NYATA`; kode ponsel/Ocean Spin hanya membelanjakan `eco.bal` (uji statis menjaga: tepat 2 titik `.bal +=/=`, tidak ada rujukan NYATA/wallet/spendFrom). Bila asal koin tak terbukti, Ocean Spin tetap terkunci (saklar server `oceanSpin`, MATI bawaan, tidak ada di `gameFlags` publik).

## Keputusan desain Tahap 3 (NusaWeb/Zentro)
- Layar utama kini 8 ikon (urutan: Klippy, NusaChat, PlayGame, NusaWeb, Zentro, Dompet Nusa, Peta, Pengaturan). NusaWeb & Zentro = aplikasi jaringan (terkunci saat putus koneksi); modul diunduh malas hanya saat dibuka.
- NusaWeb membuka HANYA 10 halaman fiktif bawaan (`*.nusa`, isi di `phone/nusaweb.js`); alamat lain → halaman galat; tidak ada fetch/iframe/tautan keluar. Kata biasa di bilah alamat → Zentro (indeks lokal). Markah disimpan lokal (bawaan: NusaOcean, Kabar, Resep). Isi halaman = teks contoh, menunggu tinjauan Owner.
- Bookmark `nusaocean.nusa` memuat modul Ocean Spin yang SAMA (`oceanspin.js`) — aturan, biaya, dan server identik; bila belum terpasang tampil ajakan ke PlayGame.

## Keputusan desain Tahap 2 (untuk ditinjau Owner)
- **Ikan hadiah** = spesies `os_kecil/os_sedang/os_langka/os_epik/os_zeus` (label sementara "Ikan Hadiah …"; Zeus bernama). Tidak dikenal tabel `FISH` ekonomi lama → dijual 1 koin, tak bisa dimasak/kolam/damar, tak bisa dipalsukan lewat `ecoCatch`. Masuk `eco.box` tepat sekali per spin (uid `osp-…`), memakai kapasitas Coolbox nyata; tampil di "Koleksi hadiah" dengan tombol Lepas (`ecoDrop` lama).
- **Aturan kapasitas** (hasil diundi lebih dulu): bila hadiah yang akan masuk > ruang kosong → seluruh permintaan ditolak SEBELUM potong koin. Catatan: jalur ini praktis belum bisa tercapai bila kapasitas Coolbox ≥ jumlah maksimum hadiah per permintaan.
- **Peluang uji** (menunggu Owner): zonk 80% · kecil 14% · sedang 4,5% · langka 1,2% · epik 0,25% · Zeus Petir 0,050%; kombo ×1…×5 per spin menang (55/25/12/5/3%). Tampil penuh sebelum SPIN.
- **Uji animasi BOOM/Zeus** memaksa hasil hanya di lapisan jaringan uji (peluang Zeus 0,05% tak bisa dipancing); keputusan tetap di server dan diuji di backend. Lingkungan: Worker asli + Firestore TIRUAN (bukan bukti produksi).
- **Risiko untuk dipertimbangkan Owner**: mekanik berhadiah-acak berbayar-koin-bermain (mirip loot box) — pertimbangkan batas usia/kebijakan toko aplikasi sebelum flag dinyalakan.
