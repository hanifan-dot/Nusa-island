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

### Akuarium interaktif
- Dekati akuarium lalu tekan Interaksi. **Geser ikan** dari coolbox ke akuarium, atau ketuk ikan lalu tekan **Masukkan**. Ikan juga bisa diambil kembali, atau ditukar saat akuarium penuh.
- Akuarium kecil muat 3 ikan (maks 2,5 kg per ikan), akuarium besar 6 ikan (maks 12 kg).
- Satu akuarium hanya untuk satu jenis air (tawar atau laut). Ikan yang dilindungi, perenang samudra (tuna, marlin, layaran, dan lainnya), dan sampah tidak bisa dipelihara.
- Ikan **dipindah, bukan disalin**. Setiap tangkapan punya ID unik, jadi ikan yang dipajang tidak bisa dijual, dan saat diambil kembali yang kembali adalah ikan yang sama dengan berat yang sama.

### Data & kompatibilitas
- Simpanan tetap di `nusa-island-v1` dengan field versi `v` (1 = Tahap 1, 2 = Tahap 2A, 3 = penyempurnaan 2A, 4 = Bumbu 1, 5 = Bumbu 1.1). Sebelum migrasi, data lama disalin ke `nusa-island-v1-backup-v{versi}`.
- Rumah Tahap 2A otomatis menjadi Level 4 (Rumah Panggung) agar tidak mengecil, dan semua perabot tetap ada.
- Data rumah sudah disiapkan untuk kunjungan teman nanti: `version`, `ownerId`, `houseId`, `level`, `furniture`, `decorations`, `placedFish`, dan `permissions`. `ownerId` hanya penanda lokal, bukan bukti kepemilikan. Perubahan oleh pengunjung selalu ditolak sampai ada validasi server.
- **Aktivitas NPC mengikuti jam**: Pak Darto mancing pagi, istirahat di taman, memperbaiki jaring sore, lalu tidur. Bu Sari berjualan 06–17, menyapu halaman, lalu pulang. Dika mengejar kupu-kupu, main layangan di pantai, dan mengambil air di sumur. Malam hari mereka tidur di rumah masing-masing.
- **Pertemanan** ❤️ naik saat ngobrol (sekali sehari) dan saat mengantar ikan. Teman dekat punya obrolan khusus.
- Malam hari pasar tutup, tapi **kotak titipan** tetap bisa dipakai untuk menjual.

## Bumbu 1 — Jiwa Kampung & Keahlian Nelayan
### Cerita: Pak Darto dan Joran Warisan
Cerita dimulai dengan bicara ke Pak Darto (tanda ❗ di atas kepalanya). Progres tersimpan otomatis setiap langkah, tidak terikat login harian, dan boleh dilanjutkan kapan saja. Misi harian terpisah, jadi pergantian misi tidak menyentuh cerita.
| Bab | Isi | Hadiah (sekali saja) |
|---|---|---|
| 1 · Nelayan Baru | Kenalan dengan Pak Darto dan sejarah nelayan Muara. Tangkap 2 ikan di Muara, lalu belajar **Lemparan Presisi** dan lempar tepat ke riak ikan. | 150 koin |
| 2 · Joran Lama | Kumpulkan bahan untuk memperbaiki joran tua: benang dari Toko Pak Bono (120 koin), ruas bambu dari rumpun dekat gapura Rumahku, dan damar dari Bu Sari (ditukar 1 ikan nila/mujair dari coolbox). | 200 koin, ❤️ Pak Darto, sudut dermaga mulai rapi |
| 3 · Pelajaran Nelayan | Belajar **Membaca Tarikan**, baca 3 sentakan. Belajar **Kendali Senar**, gulung 4 kali saat ikan lelah. | 250 koin, gelar *Nelayan Muda* |
| 4 · Warisan Muara | Ujian terakhir di Muara: lemparan sempurna memanggil gabus besar. Berhasil kalau ikan tertangkap dengan minimal 2 baca sentakan dan 2 gulungan lelah. | 300 koin, gelar *Penerus Muara*, dekorasi **Joran Warisan** di dinding Rumahku, Papan Kenangan di dermaga |

Bahan cerita tidak pernah mengambil barang secara diam-diam. Benang dan tukar ikan hanya terjadi saat tombolnya ditekan. Tombol tukar menyebut ikan mana yang diberikan (yang paling ringan), dan ikan di akuarium tidak ikut terpakai.

### Keahlian Nelayan (menu 🎯)
Tiga keahlian, masing-masing dipelajari sekali lewat cerita. Tidak ada level tanpa batas.
- **Lemparan Presisi**: muncul riak ikan di air dan penanda kekuatan di meteran. Lemparan yang jatuh di riak membuat ikan menggigit lebih cepat dan sedikit lebih hoki (×1,1).
- **Membaca Tarikan**: pelampung beriak kuning sesaat sebelum ikan menyentak ("lepas!"). Selama sentakan, senar boleh kendur tanpa ikan lepas.
- **Kendali Senar**: setelah sentakan, ikan lelah sebentar (riak hijau, "gulung!"). Menggulung saat itu lebih cepat dan tegangan naik lebih pelan. Bar tegangan menampilkan zona ideal.
Tanpa keahlian, mancing berjalan persis seperti dulu.

### Kampung yang berubah, dialog, dan pemain baru
- **Sudut Nelayan** di dermaga berubah mengikuti progres pribadi: perlengkapan tua → rak jaring rapi → Papan Kenangan dengan lentera dan nama gelarmu. Ini hanya lapisan gambar lokal; tapak collision-nya sama di semua tahap, dan peta umum tidak berubah.
- Pak Darto, Bu Sari, dan Dika punya kumpulan obrolan yang diingat (tidak diulang sampai semua sudah didengar) dan berubah sesuai bab cerita.
- Pemain baru mendapat satu petunjuk singkat dalam satu waktu: jalan → bicara dengan Pak Darto → mancing → jual → Rumahku. Petunjuk yang sudah dipahami tidak muncul lagi, dan pemain lama tidak diminta mengulang.
- Tidak ada hukuman absen, streak wajib, timer yang menekan, atau hadiah acak berbayar.
- Data baru berversi: `story`, `skills`, `onboard`, dan `npcMem` (masing-masing punya `v: 1`) di dalam `nusa-island-v1`.

## Bumbu 1.1 — Visual Nelayan
- **Panel Strike lebih ringkas**: tinggi turun dari ±139px ke ±80px, berlatar semi-transparan di bawah layar. Pelampung dan tali tetap terlihat di HP 390×844. Indikator Tegangan dan Jarak serta petunjuk situasional (senar kendur, menyentak, tegangan tinggi, ikan lelah) tetap ada. Mekanik mancing tidak diubah.
- **Joran di punggung** karakter di kampung. Bentuk dan warna mengikuti level joran aktif (`S.up.rod`): bambu beruas tanpa reel, fiber dengan reel kecil, karbon gelap, titanium perak-biru, dan emas Legenda Nusa. Posisinya benar di 8 arah (di belakang badan, atau di depan badan saat membelakangi kamera), ikut berayun saat berjalan, dan hilang dari punggung selama joran dipegang. Joran Warisan Pak Darto hanyalah dekorasi, bukan joran aktif. Renderer berbasis data di `NW.look.RODS`, jadi tingkat joran baru cukup menambah baris data.
- **8 gelar pemancing** dari jumlah ikan sungguhan yang berhasil ditangkap: Pemancing Baru (1), Anak Muara (10), Pencari Tangkapan (30), Nelayan Muda (50), Pemburu Muara (100), Ahli Pancing (150), Juragan Kail (200), Legenda Muara (300+). Sampah tidak dihitung. Menjual, memajang di akuarium, dan memamerkan ikan tidak mengubah hitungan. Naik gelar menampilkan satu notifikasi dan tidak muncul lagi setelah refresh. Gelar ini terpisah dari penghargaan cerita Pak Darto.
- **Label nama dan gelar** di atas kepala (maksimal dua baris, latar tipis). Dirender sekali lalu di-cache. Ikut urutan kedalaman sehingga tidak menembus bangunan. Nama lokal bisa diganti di menu 🎯 (tersimpan di perangkat, bukan akun online).
- Data baru berversi: `titles` dan `profile` (`v: 1`). Simpanan lama dimigrasi sekali dari koleksi (ikan sungguhan per spesies); `stats.caught` tidak diubah. Cadangan: `nusa-island-v1-backup-v4`.

Struktur kode dunia pulau ada di folder `world/`:
- `world/map.js`: bentuk pulau, jalan, jaringan jalur NPC, dermaga, bangunan, objek, dan collision.
- `world/draw.js`: semua gambar isometrik (terrain, air, bangunan, pohon, karakter, properti NPC).
- `world/world.js`: pemain, joystick, kamera, jadwal & jalur NPC, dialog, dan interaksi.
- `world/life.js`: misi harian, reputasi, dan pertemanan.
- `world/home-data.js`: logika Rumahku tanpa tampilan (10 level, penempatan perabot, migrasi, inventaris ikan aman). Bisa diuji dengan Node.
- `world/house-draw.js`: gambar 10 rumah, halaman, interior, dan perabot.
- `world/home.js`: halaman pribadi & interior, Mode Tata Ruang, renovasi, dan katalog.
- `world/aquarium.js`: menu akuarium dengan drag-and-drop (Pointer Events).
- `world/look.js`: joran di punggung, gelar tangkapan, label nama, dan nama pemain lokal.
- `world/story.js`: cerita 4 bab, keahlian nelayan, obrolan NPC yang diingat, sudut dermaga, dan petunjuk pemain baru.
- `tests/`: uji logika (Node) dan uji browser (Playwright). Lihat `tests/README.md`.
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
