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
- `world/look.js`: 10 model joran (punggung, tangan, pratinjau katalog), gelar tangkapan, label nama, dan nama pemain lokal.
- `world/inventory.js`: menu Inventaris (daftar virtual) dan Pasar Bu Sari (jual per kelangkaan dengan konfirmasi).
- `world/hold.js`: pamer ikan (pose menurut berat, tombol berhenti, berhenti otomatis).
- `fishmath.js`: berat ikan, harga, tekanan fight, dan kelelahan sebagai fungsi murni (bisa diuji dengan Node).
- `world/story.js`: cerita 4 bab, keahlian nelayan, obrolan NPC yang diingat, sudut dermaga, dan petunjuk pemain baru.
- `tests/`: uji logika (Node) dan uji browser (Playwright). Lihat `tests/README.md`.
- `game.js`: sistem mancing lama, pasar, toko, koleksi, simpanan, event, dan perpindahan mode pulau ↔ mancing.

## Bumbu 1.2 — Nelayan Sultan: inventaris, pasar, pamer ikan & 10 joran
- **Coolbox sampai 200 ikan** (kapasitas = jumlah ikan, bukan kg; HUD menampilkan misalnya `18/40`). Tingkat 1–5 tidak berubah dari versi lama, jadi simpanan lama tetap valid.

  | Tingkat | Nama | Muat | Harga |
  |---|---|---|---|
  | 1 | Ember Bekas | 8 | gratis |
  | 2 | Coolbox Kecil | 15 | 250 |
  | 3 | Coolbox Besar | 25 | 1.100 |
  | 4 | Palka Kapal | 40 | 4.200 |
  | 5 | Gudang Es | 70 | 13.000 |
  | 6 | Palka Samudra | 100 | 19.000 |
  | 7 | Gudang Pendingin | 125 | 27.000 |
  | 8 | Pabrik Es Mini | 150 | 37.000 |
  | 9 | Gudang Beku Kampung | 175 | 49.000 |
  | 10 | Gudang Beku Raya | 200 | 65.000 |
- **Menu Inventaris** (ketuk chip 🧊): daftar virtual (hanya ±18 baris yang ada di DOM walau isinya 200), urut Kelangkaan/Nama/Berat/Harga, pencarian, filter kelangkaan, dan 🔒. Gambar ikan di-cache satu per spesies. Ketuk ikan untuk kartu detail: gambar, nama, kelangkaan, berat asli, harga, kunci, dan **🐟 Pamerkan Ikan**. Ikan terkunci tidak ikut terjual massal dan tidak dipakai misi/cerita.
- **Pasar Bu Sari**: jual cepat per kelangkaan (Biasa/Common, Langka/Uncommon, Epik/Epic, Legenda/Legendary, Sampah/Trash) dan "semua yang tidak dikunci". Selalu lewat konfirmasi (jumlah, perkiraan koin, daftar ringkas, Konfirmasi/Batal), memakai harga pasar harian. Koin dan statistik ditambah satu kali (klik ganda aman). Ikan akuarium tidak ikut terjual. Ada peringatan bila ikan yang dijual dibutuhkan misi harian atau cerita aktif. Jual satuan tetap seperti dulu.
- **Pamer ikan** (`world/hold.js`): karakter memegang ikan pilihan di Muara Kampung. Hanya tampilan, ikan tetap di coolbox (tidak digandakan, tidak mengubah statistik, tidak disimpan ke save). Pose menurut berat: ≤2 kg didekap di dada, >2–10 dua tangan ke depan, >10–30 diangkat dengan badan menahan beban, >30–100 di atas dada/bahu, >100–250 pose kemenangan, >250–500 pose legenda (ikan di atas kepala, berjuang lucu), >500 pajangan khusus. Skala ikan logaritmik dan dibatasi supaya tidak memenuhi layar. Terbaca dari 8 arah, ada tangan/badan/ekspresi/keringat/kilau, label nama + berat, dan tombol **✋ Berhenti Memegang** di antara joystick dan tombol aksi. Berhenti otomatis bila ikan terjual, masuk akuarium, tidak lagi dimiliki, atau mulai memancing. Ikan sampah dan ikan dilindungi (Hiu Paus) tidak bisa dipamerkan.
- **10 joran** (katalog di Toko Pak Bono dengan pratinjau, harga, kemampuan, deskripsi, dan penanda "Dipakai"). Kepemilikan lama (level 1–5) tidak berubah; pembelian tetap berurutan dan dijaga dari potong koin ganda.

  | # | Joran | Harga | Ikan nyaman hingga | Kuat | Tarik |
  |---|---|---|---|---|---|
  | 1 | Joran Bambu Kampung | gratis | 8 kg | 1× | 1× |
  | 2 | Joran Fiber Muara | 400 | 18 kg | 1,25× | 1,2× |
  | 3 | Joran Karbon Sungai | 1.800 | 40 kg | 1,55× | 1,4× |
  | 4 | Joran Titanium Pesisir | 6.500 | 80 kg | 1,9× | 1,65× |
  | 5 | Joran Legenda Nusa | 22.000 | 150 kg | 2,4× | 1,95× |
  | 6 | Joran Baja Samudra | 32.000 | 200 kg | 2,75× | 2,2× |
  | 7 | Joran Arus Dalam | 46.000 | 260 kg | 3,1× | 2,45× |
  | 8 | Joran Titan Nelayan | 62.000 | 330 kg | 3,45× | 2,7× |
  | 9 | Joran Raja Laut | 80.000 | 420 kg | 3,8× | 2,95× |
  | 10 | Joran Penakluk Samudra | 110.000 | 500 kg | 4,2× | 3,2× |
- **Ikan raksasa**: spesies yang sudah ada punya ekor ekstrem sangat langka (marlin sampai 500 kg dengan peluang ±1,4% per marlin, kerapu raksasa 260, tuna 200, napoleon 190, GT 80, layaran 110); ikan kecil tetap paling sering dan peluang legenda tidak naik. Berat >100 kg dihargai dengan kompresi (eksponen 0,7): marlin 500 kg ±29 ribu koin pada harga pasar tertinggi (rumus lama: 87 ribu), jadi tidak membeli semua upgrade otomatis.
- **Perlawanan menurut ukuran** (`fishmath.js`, fungsi murni): makin berat ikan, makin kuat dan sering menyentak, makin lama sentakannya, dan gulungan saat sentakan malah menyeret (harus membaca aba-aba). Ikan ≤20 kg tidak terpengaruh ukuran (Pak Darto tetap bisa diselesaikan). Ikan lelah seiring waktu agar fight tidak berlarut. Joran di luar toleransi 2× kapasitas memberi peringatan dan risiko senar putus; senar putus hanya kehilangan ikan, tanpa kerusakan permanen. Joran terbaik menaikkan peluang tetapi tidak menjamin raksasa. Penyetelan dilakukan dengan `tests/browser/balance_sim.py`.
- Simpanan versi 6 (`nusa-island-v1` tetap). Cadangan otomatis: `nusa-island-v1-backup-v5` (dan v4 untuk simpanan yang lebih lama). Tingkat joran/coolbox lama tidak pernah diturunkan.

## Bumbu 2 — Petualangan Nusantara: Kampung Tepian Toba
Setelah Muara Kampung, kini ada **satu daerah baru yang bisa dijelajahi**: **Kampung Tepian Toba**, kampung kecil di tepi Danau Toba.

- **Perjalanan**: di dermaga Muara, dekati ⛵ **Kapal** → Peta → **Danau Toba** (syarat lama tetap: **Perahu Motor**; harga kapal tidak berubah, tanpa mata uang/tiket baru). Layar berlayar singkat (±2,7 dtk, ketuk untuk mempercepat), lalu pemain turun di papan **Dermaga Tepian Toba**. Untuk pulang, dekati kapal di sisi timur dermaga Toba → **⛵ Pulang ke Muara Kampung** (atau buka Peta). Pemain muncul lagi di dekat dermaga Muara. Selat Sunda, Raja Ampat, dan Laut Banda tetap lokasi mancing seperti dulu.
- **Mancing di Toba** memakai **lokasi mancing Danau Toba yang sudah ada** (data `LOCATIONS`, ikan, rarity, pemandangan) — tidak diduplikasi. Titik 🎣 ada di ujung dermaga Toba; **🏝️ Ke Darat** mengembalikan pemain ke kampung Toba.
- **Isi kampung**: danau luas dengan kabut pagi, perbukitan pinus di barat dan bukit di seberang danau, dermaga kayu, kapal & solu (perahu kayu ramping), keramba jaring apung, jalan setapak, 5 rumah tepi danau beratap pelana melengkung (terinspirasi rumah di sekitar Danau Toba, **tanpa ornamen/simbol adat** supaya tidak asal tempel), Pasar Kecil, Pondok Kumpul dengan pohon besar & bangku, kebun warga, Bukit Pandang yang bisa didaki, Sudut Tenang Danau, dan Pancuran Batu. Cahaya pagi/siang/sore/malam mengikuti jam game (lampu jalan, jendela, lentera pondok; kabut pagi 05:00–09:00).
- **NPC Toba** (hanya aktif di Toba): **Pak Raka** (pemandu dermaga), **Bu Maya** (pedagang tepian danau — info ikan danau & titip jual ke Pasar Bu Sari, *satu pasar & satu harga*, bukan pasar baru), **Nala** (penjelajah muda). Masing-masing berpenampilan beda, punya jadwal harian, animasi diam (menoleh), menghadap pemain saat diajak bicara, tidak menembus bangunan/menumpuk, dan kalimat pembuka yang bergiliran (tidak mengulang).
- **Cerita "Rahasia Tepian Danau"** (3 bab, tanpa batas waktu): Bab 1 *Tamu dari Muara* (Pak Raka, dermaga, pasar, Bu Maya, titik mancing → +200 koin & catatan perjalanan), Bab 2 *Jejak di Tepi Danau* (tiga tanda Ompung Nala di Bukit Pandang, Sudut Tenang, Pancuran Batu + **menambal jaring keramba**: aktivitas sentuh & amati, tanpa gagal/tenggat → +250 koin, catatan penemuan, lencana non-ekonomi), Bab 3 *Pesan dari Danau* (tantangan **Ikan Jurung** dengan mekanik mancing asli → +350 koin, gelar petualangan **Penjelajah Tepian Toba** yang terpisah dari 8 gelar tangkapan, animasi cahaya & kartu penghargaan). Hadiah sekali per bab; cerita tidak butuh ikan legenda atau joran 10; bisa ditinggal ke Muara dan dilanjutkan kapan saja; malam hari NPC bisa didatangi lewat pintu rumah.
- **📖 Buku Petualangan** (tombol 🧭 di atas): daftar daerah dengan ilustrasi kecil, status dikunjungi, titik penemuan (Muara 4, Toba 5), cerita daerah, catatan perjalanan, dan penghargaan petualangan. Penemuan tempat memunculkan "✨ Lokasi ditemukan: …" **sekali saja**.
- **Interaksi santai**: duduk di bangku (berdiri dengan joystick/tombol), membaca papan informasi, memandang danau lewat teropong Bukit Pandang, memeriksa solu, membasuh tangan di pancuran, melempar batu ceper. Tidak ada stamina/lapar/energi atau login harian.
- **Arsitektur multilokasi**: `world/areas.js` (registry area + getter kompatibel `NW.tileAt`, `NW.walkable`, `NW.objects`, … yang menunjuk ke area aktif), `world/map.js` & `world/areas/muara.js` (Muara), `world/areas/toba-map.js` / `toba-draw.js` / `toba.js` (Toba), `world/adventure.js` (penemuan, buku, perjalanan), `world/world.js` (mesin umum). Daerah baru cukup menambah satu set file area.
- Simpanan **versi 7** (`nusa-island-v1` tetap, cadangan otomatis `nusa-island-v1-backup-v6`). Data baru di `S.adv` (area terakhir, posisi per area, penemuan, catatan, penghargaan, cerita Toba) hanya mengisi yang kosong — progres lama tidak pernah ditimpa.

## Bumbu 2.1 — Suara Nusantara
Musik, ambience, dan efek suara dibuat **prosedural lewat Web Audio** (tanpa file audio, tanpa aset pihak ketiga; komposisi orisinal).
- `audio/synth.js` (petik Karplus–Strong, seruling/sulim, pad, ogung, drum kecil, dll), `music.js` (tema), `ambient.js` (angin, air, daun, jangkrik, pasar, burung/katak/burung hantu), `sfx.js`, `manager.js` (satu AudioContext, crossfade, volume, mute, tab tersembunyi), `triggers.js` (pengarah: area/waktu/mancing/rumah/kapal/cerita), `panel.js` (UI).
- Tema: Muara pagi/siang/sore/malam (4/4), Toba pagi/siang/sore/malam (6/8, ogung/drum/hasapi-sulim), Rumahku, Kapal, Cerita, Mancing Muara & Toba.
- **Pengaturan Suara**: panel Peta → 🔊 Pengaturan Suara, atau menu 🎯 → 🎚️ Atur, atau tahan tombol 🔊 (layar lebar). 4 slider (Utama 70 / Musik 35 / Ambience 50 / Efek 70), "Matikan semua suara", menu "🎧 Dengarkan tema & efek" untuk mendengar tiap tema.
- Batas jujur: bunyi sintetis (bukan rekaman, bukan alat asli), kualitas prototipe; belum didengar lewat speaker/HP fisik. Tema Muara & Toba berbagi kosakata nada yang berkerabat; bedanya di meter, tempo, drone/ogung/drum, dan timbre.

## Bumbu 2.2 — Rahasia Tangkapan: varian ikan, spot tersembunyi & momen legendaris
- **Varian ikan** (atribut terpisah dari kelangkaan, tersimpan di item sebagai `vr`; tidak ada = Normal): Normal, **Sisik Perak**, **Corak Senja**, **Mutiara Nusantara**. Tidak berlaku untuk Sampah/ikan terlindungi. Tampilan memakai renderer ikan yang sama (warna digeser, spesies tetap dikenali), tanpa gambar besar.
- **Peluang** (satu tabel di `world/variants.js`, diundi **sekali** per tangkapan sukses): Normal 91,5% · Perak 6% · Senja 2% · Mutiara 0,5% (total 100). Peluang ikan legenda/raksasa tidak diubah. Di spot rahasia: Perak/Senja sedikit lebih besar (×1,25–1,5), +20% bila lemparan tepat di riak; **Mutiara tidak pernah dinaikkan**. Bonus harga varian: 0 (hanya tampilan & koleksi). Tanpa gacha, tanpa streak/FOMO.
- **Spot rahasia** (ditemukan dengan berjalan, tersimpan, muncul di Buku Petualangan dengan petunjuk samar): **Lubuk Bambu Muara** (pantai barat laut, dekat rumpun bambu) dan **Teluk Sunyi Toba** (teluk kecil di balik jalan setapak; baru bisa ditemukan setelah mengunjungi Bukit Pandang). Memakai mekanik mancing yang sama (joran, Strike, tegangan tali); titik dermaga biasa tetap ada.
- **Momen istimewa**: kilau perak, transisi hangat senja, cahaya + nama untuk Mutiara, percikan untuk ikan raksasa (+ "Pamerkan di tangan"). Semua bisa dilewati (tombol Lewati). Jingle lewat AudioManager yang sama (ikut slider/mute; satu jingle per tangkapan).
- **Koleksi**: setiap spesies di Koleksi Ikan menampilkan ✓/? per varian, rekor berat & lokasi pertama. Mutiara otomatis terkunci (tidak ikut jual massal). Akuarium & pamer di tangan menampilkan varian yang sama (UID tetap, tidak ada duplikasi).
- **Data**: kunci tetap `nusa-island-v1`, SAVE_VERSION 8; migrasi aman (koin, joran, ikan, akuarium, progres tetap; ikan lama = Normal).
- Batas jujur: diuji hanya di Chromium headless (emulasi HP), bukan HP Android fisik; jingle sintetis hanya dievaluasi objektif (level/klip), belum didengar lewat speaker HP.

## Bumbu 2.3 — Langit Nusantara: cuaca dinamis & kehidupan alam
Cuaca adalah **simulasi di dalam game** (tanpa API cuaca nyata, tanpa server, tanpa biaya baru). Modul: `world/weather.js` (`NW.weather`).
- **Empat kondisi**: Cerah, Mendung, Hujan (ringan ↔ deras), Kabut; **angin** adalah parameter (bukan jenis kelima). Nilai yang tampil (awan, hujan, kabut, angin, tanah basah) bergerak halus menuju target, sehingga Cerah → Mendung → Hujan → Mendung → Cerah terjadi bertahap; hujan baru turun setelah langit cukup tertutup.
- **Stabil & tidak acak per refresh**: kondisi dihitung dari *seed tersimpan* (`S.wx.seed`, dibuat sekali) + wilayah + hari + jam, per segmen 6 jam game (±2 menit nyata; episode rata-rata ±2,5 segmen). Hari pertama sebelum siang selalu cerah.
- **Per wilayah** (`CFG` di `weather.js`): Muara — hujan khas kampung tropis, jarang berkabut; Toba — kabut pagi lembut, kabut lebih sering & lebih kuat, angin danau lebih besar, warna langit/air beda. Menambah Selat Sunda/Raja Ampat/Laut Banda cukup menambah satu entri `CFG`. Model murni `forecast(area, hari, jam, seed)` dapat diganti (`NW.weather.source`) dengan sumber server di masa depan — server **belum** diimplementasikan.
- **Visual** (Canvas 2D, pool tetap, tanpa alokasi per frame): tetes hujan tipis mengikuti arah angin, riak di air, percik di tanah, jalan/pasir/dermaga tampak basah, genangan kecil di jalan tanah, tetes dari atap bangunan, pantulan lampu di tanah basah (malam), kabut berlapis (tengah layar tetap jernih) dan kabut Toba yang sudah ada ikut cuaca, ikon cuaca di jam HUD, kilat jauh yang lembut (opsional). Tampilan mancing: langit & air bergeser mendung, awan lebih gelap, hujan + riak, kabut tebal di cakrawala dan tipis di dekat pelampung. Rumahku: halaman luar mengikuti cuaca; interior tidak diberi tetesan, hanya kaca jendela abu-abu bertetes.
- **Mancing**: cuaca hanya mengubah *waktu tunggu gigitan* dengan pengali kecil terbatas **0,88–1,08** (hujan ringan sedikit lebih cepat, hujan deras/kabut sedikit lebih lambat), dihitung saat lemparan mendarat. Tidak menyentuh pemilihan ikan, kelangkaan, varian & spot rahasia Bumbu 2.2, batas sepuluh joran, berat ikan, atau pertarungan (fase Strike memakai parameter yang sudah tetap). Angin/hujan membuat air & pelampung lebih hidup (visual).
- **NPC**: saat hujan sebagian NPC berjalan ke tempat berteduh lewat jaringan jalan (NAV) yang sudah ada (Pak Darto → teras rumah, Dika → teras, Pak Raka/Nala/Bu Maya → Pondok), tanpa menembus bangunan & tanpa menghilang tiba-tiba; Bu Sari tetap berjualan; cerita & misi tetap didahulukan (komentar hujan hanya pada percakapan biasa, sekali per episode); setelah reda mereka kembali ke jadwal.
- **Suara** (AudioManager 2.1, tanpa AudioContext baru): tiga lapisan tetap dibuat sekali (hujan ringan, hujan deras, tetes atap) + guruh jauh yang jarang & lembut; masuk/keluar bertahap; musik area tetap sama tetapi turun sedikit (maks. −20%); burung/jangkrik mereda; di Rumahku suara hujan luar teredam dan atap terdengar lembut; saat mancing ambience hujan dikecilkan agar isyarat mancing tetap jelas; mute & slider tetap berlaku.
- **Pengaturan** (🎵 → panel suara → 🌦️ *Efek Cuaca*): Tinggi / Sedang / Rendah + "Kurangi kilatan & gerakan"; disimpan lokal (`nusa-island-wxfx-v1`, terpisah dari progres). Cuaca tetap terjadi di semua tingkat; hanya partikel/efek yang berkurang. Tidak ada pengaruh pada peluang ikan. Default: Sedang di layar sentuh, Tinggi di desktop.
- **Data**: SAVE_VERSION 9 menambah `S.wx = {seed, v}`; migrasi berantai aman (koin, joran, ikan, akuarium, rumah, progres tidak berubah); tidak ada transaksi koin baru.
- Batas jujur: diuji di Chromium headless (emulasi HP, termasuk CPU 4× lebih lambat), **belum** di Android fisik; suara hujan sintetis (bukan rekaman) dan belum didengar lewat speaker HP.

## Bumbu 2.4 — Samudra Nusantara: berlayar, menjelajah laut & memancing di tengah samudra
Pemain kini **mengemudikan kapal sendiri**. Modul: `world/boat.js` (`NW.boat`, mekanik & gambar kapal), `world/sea.js` (`NW.sea`, spot laut, kelompok ikan, peta), `world/areas/laut.js` (laut lepas), `world/areas/selat-map.js` + `world/areas/selat.js` (Pelabuhan Selat Sunda).
- **Naik / turun kapal**: dekati kapalmu di dermaga Muara → tombol **⛵ Naik Kapal**. Pemain duduk di buritan memegang kemudi (tidak tertinggal di dermaga, tidak digambar dua kali), kamera mengikuti kapal sedikit ke depan haluan. **⚓ Turun Kapal** hanya muncul di titik sandar yang disediakan (Dermaga Muara, Pantai Selatan Muara, Dermaga Pelabuhan Selat Sunda) dan saat kapal pelan. Tidak ada cara berjalan di tengah laut.
- **Kontrol HP** (joystick yang sama, kiri bawah): ATAS = maju, BAWAH = mengerem lalu mundur, KIRI/KANAN = membelok (lebih tajam saat melaju). Akselerasi & pengereman halus; kapal meluncur pendek lalu berhenti (tidak licin). Tombol kanan (pil besar, di luar zona joystick): **⚓ Jangkar / ⛵ Angkat Jangkar**, **🎣 Memancing**, **🗺️ Peta Laut**, **🛟 Ke Dermaga** (pemulihan bila tersangkut/tersesat: kapal ditarik aman ke dermaga terdekat, ikan & progres utuh). Kompas di atas layar selalu menunjuk dermaga terdekat + jarak & kecepatan.
- **Kapal kayu 2.5D** digambar per frame dari bentuk lambung (sisi luar/dalam, lantai papan, bangku, mesin tempel & tuas kemudi, joran tersimpan di dudukan, coolbox, bendera merah-putih, terpal untuk kapal tingkat 3+), bergoyang mengikuti ombak (sedikit lebih besar saat berangin/hujan), bayangan di air, jejak buih & air terbelah di haluan, lampu kapal di malam hari. Warna & kecepatan mengikuti 5 tingkat kapal lama (harga & syarat tidak berubah).
- **Laut yang hidup**: area **Perairan Selat Sunda** (80×52 tile) dengan Pulau Kelapa, Pulau Batu, gunung api kecil berasap, gosong karang berair toska, arus bergaris, laut dalam biru gelap; warna air mengikuti kedalaman, kilau ombak, burung laut, siang/senja/malam. Batas eksplorasi yang wajar (pesan ramah di tepi). Jalur: dermaga Muara → tepi timur perairan Muara → laut lepas → Pelabuhan Selat Sunda (dan sebaliknya), perpindahan area di balik layar pudar singkat. Laut lepas menuju Selat Sunda mengikuti syarat lama **Kapal Nelayan**; perairan Muara bisa dilayari semua kapal.
- **Cuaca 2.3 di laut**: cerah (air tenang, kilau), mendung (laut lebih gelap, angin), hujan (tetes & riak di permukaan, suara hujan), kabut (jarak pandang berkurang, kompas & peta tetap memandu). Iklim pelabuhan dan laut lepas Selat Sunda sama (`CFG.selat`/`CFG.laut`). Tidak ada badai yang merusak kapal atau menghilangkan ikan/progres; cuaca tidak pernah menjebak pemain.
- **Memancing di tengah laut**: pasang jangkar → 🎣 Memancing → **sistem mancing lama** (isi kekuatan, lempar, tunggu, Strike, tegangan, bertarung). Tampilan dari atas kapal yang bergoyang pelan, senar ke permukaan air, percikan saat ikan menyentak. Kapal tidak bergerak selama mode mancing. **⛵ Ke Kapal** kembali ke posisi semula. Semua ikan masuk inventaris utama dengan UID & atribut sama seperti biasa; ikan dilindungi tetap dilepas + hadiah konservasi; "Pamerkan" dilakukan setelah turun.
- **Spot laut** (ditemukan dengan menjelajah, tidak ditampilkan di peta sebelum ditemukan): **Perairan Pesisir** (Muara — burung berputar & riak), **Karang Dangkal** (air toska, bintik karang, bayangan ikan karang), **Arus Selat** (riak putih bergaris), **Laut Dalam** (biru gelap, lingkaran besar, bayangan ikan raksasa sesekali). Masuk ke 🧭 Buku Petualangan & Peta Laut, diberi pelampung penanda. Spot rahasia Bumbu 2.2 tidak berubah.
- **Ikan**: 3 spesies baru khas Selat Sunda tanpa duplikasi ID — **Tongkol** (biasa), **Kerapu Macan** (langka), **Kuwe Biru** (epik). Kembung, Tenggiri, Kakap Merah, Barakuda, Kerapu Raksasa memakai data lama; **Marlin Biru** (data lama Laut Banda) bisa muncul di Laut Dalam dengan peluang sangat kecil (< 0,6% per gigitan, siang). Kelompok ikan per spot memakai pengali hoki yang sama dengan mancing biasa; rata-rata nilai tangkapan spot laut ≤ 1,5× dermaga Selat Sunda. Tanpa peluang berbayar, gacha, atau perjudian.
- **Pelabuhan Selat Sunda** (lokasi ketiga yang bisa dijelajahi; memakai ulang lokasi `selat` di `LOCATIONS`): dermaga kayu panjang, dermaga kecil berisi perahu warga, Pasar Ikan, Gudang Peralatan, Warung Kopi, mercusuar merah-putih, pantai berbatu dengan pemecah ombak, pelampung alur. NPC orisinal **Pak Hasan** (nelayan senior), **Bu Ratna** (pedagang ikan), **Arif** (pemuda pelabuhan) dengan jadwal harian & dialog bergiliran (ikut berteduh saat hujan).
- **Cerita "Jejak Arus Selat"** (3 bagian, tanpa menunggu lama): Pelabuhan Baru → Tanda dari Laut (temukan 2 spot laut) → Arus Selat (pancing seekor ikan di Arus Selat). Hadiah wajar: total 800 koin, lencana *Mata Laut*, gelar petualangan *Pelaut Selat Sunda*, catatan perjalanan. Tidak ada ikan legenda otomatis.
- **Peta Laut** (🗺️): peta buatan dari koordinat dunia game (bukan GPS) yang menyatukan perairan Muara, laut lepas, dan pelabuhan; posisi & arah kapal, dermaga, garis pantai, area yang sudah dilayari (sisanya berkabut), spot yang sudah ditemukan, garis putus-putus & jarak ke dermaga terdekat, tombol **Perjalanan Cepat (rute lama)**. Perjalanan cepat lama tetap ada (papan 🧭 Rute Kapal di dermaga Muara & Selat, dialog kapal di Toba); kapal ikut bersandar di dermaga tujuan.
- **Audio samudra** (AudioManager 2.1, tanpa AudioContext baru, lapisan dibuat sekali): ombak laut, mesin tempel (nada naik saat melaju, mati saat berjangkar/turun), air terbelah, angin laut, burung camar, lonceng pelampung, suasana pelabuhan; musik orisinal *Layar Terkembang* (berlayar), *Laut Malam*, *Pelabuhan Pagi*, *Lampu Dermaga*, *Mancing · Laut*; efek naik kapal, jangkar, benturan lembut. Mute & slider berlaku.
- **Data**: SAVE_VERSION **10** menambah `S.sea` (di kapal atau tidak, area & posisi/arah kapal atau titik sandar, jangkar, area peta yang sudah dilayari) dan `S.adv.selat` (cerita). Wilayah yang dibuka & spot yang ditemukan memakai `S.adv.visited`/`S.adv.found`. Migrasi aman (cadangan v9 dibuat); simpanan lama mulai di darat dengan kapal di dermaga Muara; data kapal rusak → nilai aman (tidak pernah mereset save, tidak pernah muncul di laut tanpa kapal). Struktur data kapal & lokasi dipisah per modul supaya nanti bisa dipindah ke akun (Tahap 3–4) — server **tidak** mempercayai data klien; belum ada Firebase/multiplayer, belum ada Event Megalodon/Monster Dunia.
- **Performa** (Canvas 2D): partikel jejak dibatasi 64 / 40 / 18 mengikuti pengaturan **Efek Cuaca** Tinggi / Sedang / Rendah (Bumbu 2.3), garis arus juga berkurang di Rendah, cache terrain laut dibatasi ±5,5 juta piksel, pulau & petunjuk spot hanya digambar saat terlihat, satu peta chart dibuat sekali saat panel dibuka. Diuji di Chromium headless (emulasi HP, termasuk CPU 4× lebih lambat) — **belum** di Android fisik.

## Cara mancing
1. **Tahan layar** untuk mengayun joran, **lepas** untuk melempar. Lepas di zona atas meteran untuk *Lemparan Sempurna* (lebih hoki). Ketuk sisi kiri atau kanan layar untuk mengarahkan lemparan.
2. Tunggu sampai pelampung **tenggelam** dan muncul tanda **!**, lalu ketuk secepatnya.
3. **Tarik-ulur**: tahan untuk menggulung, lepas supaya senar kendur. Kalau tegangan terlalu tinggi, senar putus. Kalau terlalu lama kendur, ikannya lepas.
4. Jual tangkapan di **Pasar**. Harga berubah setiap hari, jadi jual saat harga sedang naik.
5. Upgrade **joran, umpan, coolbox, dan kapal** di **Toko**. Kapal baru membuka pulau baru.
6. Lengkapi **Koleksi** 36 ikan dan barang dari 5 lokasi. Beberapa ikan hanya muncul malam atau siang.
7. Tekan **📸 Simpan Kartu** untuk menyimpan kartu tangkapan (1080×1350) yang siap diposting ke Instagram.

## Lokasi
| Lokasi | Kapal | Ikan legenda |
|---|---|---|
| Muara Kampung | Sampan Kayu | Arwana Super Red 🌙 |
| Danau Toba (+ Kampung Tepian Toba) | Perahu Motor | Ikan Dewa ☀️ |
| Selat Sunda (+ Pelabuhan Selat Sunda & laut lepas) | Kapal Nelayan | Kerapu Raksasa 🌙 (Marlin sangat jarang di Laut Dalam) |
| Raja Ampat | Speedboat | Napoleon (dilindungi) |
| Laut Banda | Kapal Ekspedisi | Marlin Biru, Hiu Paus 🌙 |

Ikan yang dilindungi otomatis dilepas lagi, dan pemain mendapat hadiah konservasi.

## Teknis
- HTML, CSS, dan JavaScript murni dengan Canvas 2D. Tanpa library dan tanpa build.
- Progres disimpan di `localStorage` browser.
- File: `index.html`, `style.css`, `data.js` (ikan, lokasi, upgrade), `game.js` (mesin game & mancing), `world/` (dunia jelajah: area, gambar, NPC, cerita, rumah).
- Menambah ikan cukup lewat `data.js`.

## Online-kan dengan GitHub Pages
Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / root → Save.
Game akan tersedia di `https://hanifan-dot.github.io/Nusa-island/`.
