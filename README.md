# 🏝️ Nusa Island

Game kehidupan pulau dan mancing 2.5D keliling Nusantara, dari kreator **Kota Nusa**. Main langsung di browser, di HP maupun laptop.

## Island Life — Muara Kampung (Tahap 1)
Pemain sekarang mulai di pulau **Muara Kampung** yang bisa dijelajahi dalam tampilan isometrik.
- **Joystick** di kiri bawah (atau WASD/panah di laptop) untuk berjalan 8 arah. Kamera mengikuti pemain.
- **Tombol aksi** kuning muncul di kanan bawah saat dekat sesuatu (atau tekan E/Spasi).
- **Ujung dermaga 🎣**: mulai mancing. Sistem mancing lama berjalan seperti biasa. Tombol *Ke Darat* untuk kembali.
- **Pasar Ikan Bu Sari 🏪**: jual tangkapan. **Toko Pancing Pak Bono 🛠️**: upgrade alat.
- **Kapal ⛵** di samping dermaga: buka peta untuk berlayar ke pulau lain (masih berupa lokasi mancing).
- **NPC**: Pak Darto (nelayan yang bolak-balik ke dermaga), Bu Sari (pedagang di pasar), Dika (anak yang jalan-jalan di kampung). Ajak bicara untuk tips.
- Siang, sore, dan malam dengan lampu jalan dan jendela yang menyala.

## Tahap 2A — Rumahku, misi harian, aktivitas NPC
- **Rumahku** ada di halaman pribadi (lewat **gapura Rumahku** di barat laut kampung). Isinya kasur untuk **tidur sampai pagi** (mulai 18:00) atau tidur siang (11:00–17:00), akuarium, dan **katalog perabot** di meja. Beberapa perabot butuh ⭐ reputasi.
- **Misi harian**: maksimal 3 misi per hari, berganti pukul 00:00 waktu perangkat (bukan hari di dalam game). Dilihat di papan misi dekat jalan utama atau tombol 📋. Jenisnya antara lain tangkap ikan, tangkap jenis tertentu, jual, lemparan sempurna, antar ikan ke warga, ngobrol, mancing malam, dan bersihkan sampah. Hadiahnya koin dan ⭐ reputasi (Pendatang → Legenda Muara), dan setiap hadiah hanya bisa diklaim sekali.

### Rumahku 10 level (rumah kampung Nusantara)
| Lv | Nama | Ruangan | Ciri eksterior |
|---|---|---|---|
| 1 | Gubuk Nelayan | 4×4 | dinding bambu, atap rumbia, jemuran & jaring |
| 2 | Rumah Papan | 5×4 | dinding papan, atap sirap, teras kecil |
| 3 | Rumah Kebun | 5×5 | atap genteng, pagar bambu, kebun, rak perabot |
| 4 | Rumah Panggung | 6×5 | tiang kayu, tangga, kolong berisi perahu |
| 5 | Rumah Nelayan Makmur | 7×5 | teras lebar di bawah atap, lentera, ruang keluarga |
| 6 | Rumah Adat Sederhana | 7×6 | dinding berukir, ornamen silang di bubungan, pintu ganda |
| 7 | Rumah Saudagar Kampung | 8×6 | serambi besar, gudang, jalan batu, ruang tamu |
| 8 | Rumah Panggung Megah | 8×7 | atap bertingkat, balkon, tangga lebar, tiang ukir |
| 9 | Rumah Bangsawan Desa | 9×7 | paviliun, taman bunga, lemari pamer tangkapan |
| 10 | Rumah Legenda Nusantara | 10×8 | atap gonjong berukir emas, obor, kolam koi, dinding legenda |

- Renovasi lewat **papan Renovasi** di halaman. Papan itu menampilkan pratinjau level sekarang dan berikutnya, daftar perubahan, harga, dan syarat ⭐. Ada animasi perancah saat renovasi.
- **Mode Tata Ruang** (tombol 🛠️ di dalam rumah): ketuk lalu geser perabot di grid. Perabot bisa diputar atau disimpan ke gudang. Game menolak posisi yang keluar ruangan, menghalangi pintu, menabrak perabot lain, atau menutup jalan.
- Setelah upgrade, perabot dipindah otomatis ke tempat valid. Yang tidak muat masuk gudang, tidak pernah dihapus.

### Data & kompatibilitas
- Simpanan tetap di `nusa-island-v1` dengan field versi `v` (1 = Tahap 1, 2 = Tahap 2A, 3 = sekarang). Sebelum migrasi, data lama disalin ke `nusa-island-v1-backup-v1/v2`.
- Rumah Tahap 2A otomatis menjadi Level 4 (Rumah Panggung) agar tidak mengecil, dan semua perabot tetap ada.
- Data rumah sudah disiapkan untuk kunjungan teman nanti: `version`, `ownerId`, `houseId`, `level`, `furniture`, `decorations`, `placedFish`, dan `permissions`. `ownerId` hanya penanda lokal, bukan bukti kepemilikan. Perubahan oleh pengunjung selalu ditolak sampai ada validasi server.
- **Aktivitas NPC mengikuti jam**: Pak Darto mancing pagi, istirahat di taman, memperbaiki jaring sore, lalu tidur. Bu Sari berjualan 06–17, menyapu halaman, lalu pulang. Dika mengejar kupu-kupu, main layangan di pantai, dan mengambil air di sumur. Malam hari mereka tidur di rumah masing-masing.
- **Pertemanan** ❤️ naik saat ngobrol (sekali sehari) dan saat mengantar ikan. Teman dekat punya obrolan khusus.
- Malam hari pasar tutup, tapi **kotak titipan** tetap bisa dipakai untuk menjual.

Struktur kode dunia pulau ada di folder `world/`:
- `world/map.js`: bentuk pulau, jalan, jaringan jalur NPC, dermaga, bangunan, objek, dan collision.
- `world/draw.js`: semua gambar isometrik (terrain, air, bangunan, pohon, karakter, properti NPC).
- `world/world.js`: pemain, joystick, kamera, jadwal & jalur NPC, dialog, dan interaksi.
- `world/life.js`: misi harian, reputasi, dan pertemanan.
- `world/home-data.js`: logika Rumahku tanpa tampilan (10 level, penempatan perabot, migrasi, inventaris ikan aman). Bisa diuji dengan Node.
- `world/house-draw.js`: gambar 10 rumah, halaman, interior, dan perabot.
- `world/home.js`: halaman pribadi & interior, Mode Tata Ruang, renovasi, dan katalog.
- `game.js`: sistem mancing lama, pasar, toko, koleksi, simpanan, event, dan perpindahan mode pulau ↔ mancing.

## Cara mancing
1. **Tahan layar** untuk mengayun joran, **lepas** untuk melempar. Lepas di zona atas meteran untuk *Lemparan Sempurna* (lebih hoki). Ketuk sisi kiri atau kanan layar untuk mengarahkan lemparan.
2. Tunggu sampai pelampung **tenggelam** dan muncul tanda **!**, lalu ketuk secepatnya.
3. **Tarik-ulur**: tahan untuk menggulung, lepas supaya senar kendur. Kalau tegangan terlalu tinggi, senar putus. Kalau terlalu lama kendur, ikannya lepas.
4. Jual tangkapan di **Pasar**. Harga berubah setiap hari, jadi jual saat harga sedang naik.
5. Upgrade **joran, umpan, coolbox, dan kapal** di **Toko**. Kapal baru membuka pulau baru.
6. Lengkapi **Koleksi** 33 ikan dan barang dari 5 lokasi. Beberapa ikan hanya muncul malam atau siang.
7. Tekan **📸 Simpan Kartu** untuk menyimpan kartu tangkapan (1080×1350) yang siap diposting ke Instagram.

## Lokasi
| Lokasi | Kapal | Ikan legenda |
|---|---|---|
| Muara Kampung | Sampan Kayu | Arwana Super Red 🌙 |
| Danau Toba | Perahu Motor | Ikan Dewa ☀️ |
| Selat Sunda | Kapal Nelayan | Kerapu Raksasa 🌙 |
| Raja Ampat | Speedboat | Napoleon (dilindungi) |
| Laut Banda | Kapal Ekspedisi | Marlin Biru, Hiu Paus 🌙 |

Ikan yang dilindungi otomatis dilepas lagi, dan pemain mendapat hadiah konservasi.

## Teknis
- HTML, CSS, dan JavaScript murni dengan Canvas 2D. Tanpa library dan tanpa build.
- Progres disimpan di `localStorage` browser.
- File: `index.html`, `style.css`, `data.js` (ikan, lokasi, upgrade), `game.js` (mesin game).
- Menambah ikan cukup lewat `data.js`.

## Online-kan dengan GitHub Pages
Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / root → Save.
Game akan tersedia di `https://hanifan-dot.github.io/Nusa-island/`.
