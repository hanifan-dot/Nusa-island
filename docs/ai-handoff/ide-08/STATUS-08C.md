# Ide 08C — Memasak interaktif, audio ASMR, cuci peralatan, sheet kasir ≤45% (game, klien)

Pemilik: Worker 01 (Ide 08). Status: **Draft PR bertingkat di atas #137, semua flag MATI**. Tidak mengubah #136, #137, #59, #60, #61.

## Basis
- Fase A final: `25b71fe936038bd577dc7ab6d97c11e26b4b63c8` (branch `integrasi/fase-a-final-20261113`).
- #137 (08B) di-rebase oleh sesi ini ke `25b71fe`: head baru `530b1dfe2f854f89993da3ecf2c31e59ab957afc` (dulu `86bb876`), `--force-with-lease`, base PR #137 kini `integrasi/fase-a-final-20261113`. Rebase tanpa konflik; tambahan `!(NW.room && NW.room.active)` di `rombongan/client.js` DAN Kemudi Rombongan (Fase A) sama-sama utuh (diff `rombongan/` terhadap #137 = 0).
- Branch 08C: `fitur/ide08c-masak-cuci-20261113`, di-rebase di atas head #137 baru. PR dasar = branch #137 (bukan `main`), jadi diff hanya memuat 08C.
- Backend: PR #60 (08A), kontrak `CONTRACT-08A.md`. Tidak ada perubahan backend.

## Workstation jarak dekat (tambahan wajib) — `dapur/bench.js`
Saat panel dapur terbuka, bagian atas layar (di sisi kiri pada lanskap) berubah menjadi **kanvas workstation jarak dekat**, bukan daftar tombol/progress bar. Panel bawah tetap ada sebagai jalur cadangan (papan ketik / pembaca layar).
- **Kompor/wajan**: wajan besar, api kecil/sedang/besar (tombol api di kanvas), baki bahan (ketuk bahan = "masukkan ke wajan", tampilan saja), spatula (balik), gagang wajan (angkat), sendok kayu (aduk), garam (bumbu), piring (sajikan).
- **Talenan**: kupas (bawang), potong **dan iris** (ketuk atau geser jari melintasi talenan = irisan), cuci di basin, pecah telur ke mangkuk, aduk, bumbu. Adegan berpindah otomatis sesuai langkah resep; ada tombol pindah "Talenan ⇄ Kompor".
- **Panci**: teko "isi air" (tahan), air + gelembung mendidih + uap, angkat. **Pemanggang**: arang menyala mengikuti panas, jeruji, ikan + jeruk, balik ikan. **Gelas**: teko tuang, sendok aduk, sajikan.
- **Meja saji**: masakan di piring (resep → gambar bahan; tier → gosong/mentah/aneh/tidak layak), nampan: ketuk masakan untuk menatanya di piring.
- **Wastafel**: pilih alat kotor, lalu sabun → gosok → bilas → taruh ke rak langsung di kanvas.
- **Petunjuk kematangan**: warna makanan (pucat → keemasan → cokelat → hitam), asap (putih → pekat), gelembung & desis minyak (suara), api; potret karakter di pojok bereaksi (puas/biasa/ragu/bingung/batuk/mual + animasi muntah kartun, blur ikut menutup kanvas). Terlalu cepat → **mentah**, terlambat → **gosong** — **ditentukan server**, bukan kanvas.
- **Nyaman di HP**: sasaran sentuh ≥ 38×34 px, ketuk di mana saja pada kanvas dihitung untuk gerakan ketuk; putar/gosok menghitung jarak jari di mana pun (tidak perlu presisi); mode Tenang mengurangi gerak.
- Tidak ada perubahan backend/kontrak: kanvas hanya memanggil aksi yang sama (nama langkah); langkah `tuang` untuk panci ("isi air") adalah langkah resmi server yang opsional.

## Perbaikan kecil 08B (dikerjakan lebih dulu)
- Sheet kasir HP: bottom sheet **maks 45% tinggi layar**, ada pegangan; **ketuk = diperkecil/dibuka**, **tarik = ubah tinggi** (64 px – 45%), Enter/Spasi juga bekerja.
- Kamera ruangan mengikuti area yang masih terlihat (`NW.room.setInset`), sehingga Bu Indah, kasir dan sebagian interior tetap terlihat (diuji dengan proyeksi kamera, bukan hanya mata).
- Lanskap 740×360: panel pindah ke sisi kanan (≤46% lebar, tinggi penuh); ruangan tetap terlihat di kiri.

## Yang dikerjakan
1. **Memasak interaktif (semua dari hasil server)** — `dapur/masak.js` (`NW.dapurMasak`). Panel Resep / Masak bebas, pilih alat (wajan, panci, pemanggang, gelas) dan ikan dari Tas (maks 2).
   12 interaksi nyata lewat gerakan jari: cuci, kupas, potong, pecah telur, aduk (putar), bumbui, tuang (tahan), taruh di api, atur api 1–3, balik, angkat, sajikan. Klien hanya mengirim **nama langkah**; kualitas, kematangan, resep rahasia, penemuan resep, penalti kotor dan ekonomi **seluruhnya dari server**.
2. **10 resep + masak bebas**: 4 resep awal terlihat; 6 resep rahasia tampil hanya sebagai hitungan sampai ditemukan lewat masak bebas dengan bahan persis resep (server yang mengenali & mencatat), lalu muncul di tab Resep.
3. **Hasil gagal (kartun)**: gosong = asap ringan + batuk; mentah = ragu; aneh = bingung (tanda tanya); tidak layak = boleh **Buang** atau **Tetap makan** (pilihan pemain). Makan hasil buruk → efek dari server: mual 4000 ms = blur ringan 4 dtk + wajah mual + animasi muntah singkat ke ember kecil (kartun, tidak menjijikkan). Tidak ada koin hilang, kerusakan permanen atau hukuman berat.
4. **Mode Tenang** (kurangi blur/gerak): tombol di setiap panel, disimpan di perangkat (`nusa-dapur-tenang`), default mengikuti `prefers-reduced-motion`. Tenang = tanpa blur, tanpa animasi muntah (hanya emote + teks), tanpa animasi pantul.
5. **Audio ASMR** — `dapur/audio.js`, sintesis prosedural (tanpa berkas suara): potong, kupas, cuci, telur pecah, aduk, minyak mendesis, air mendidih, bumbu, balik, taruh, piring, gelas, sendok, wastafel, sabun, gosok, ding/puas/batuk/ragu/mual/buang.
   Semua lewat `NW.audio.sfx` (ikut mute, slider, bus SFX). **Lazy**: `audio.js` baru diunduh pada bunyi pertama dan **hanya bila suara menyala** (tidak mute, master & efek > 0).
6. **Cuci peralatan**: bak cuci → pilih alat kotor → sabun → gosok → bilas → taruh di rak (rak = tampilan saja). `dapurWash` dipanggil **sekali** di akhir dengan `steps:[sabun,gosok,bilas]`. **Percepat** (`quick:true`) baru muncul setelah cuci lengkap pertama; server juga menolak lebih awal (409). Alat kotor hanya memengaruhi kualitas lewat batas server (maks 6).
7. **Ikan dikonsumsi tepat sekali**: server mengurangi saat mulai; klien membuang dari Tas hanya setelah jawaban sukses; batal sebelum di atas api mengembalikan ikan sekali; `reconcileFish()` mencegah ikan yang sedang dimasak tersisa di Tas setelah muat ulang.
8. **Ketahanan**: `opId` dipakai ulang sampai server menjawab pasti (409/400/404/401); klik ganda dikunci (`busy`); jaringan putus → pesan ramah, bahan & masakan aman, ulang dengan `opId` sama.

## Kontrak API yang dipakai
`dapurState`, `dapurCookStart {opId,tool,rec|null,ing?,fish?}`, `dapurCookStep {opId,step,arg?}`, `dapurCookFinish`, `dapurCookAbort`, `dapurEat`, `dapurDiscard`, `dapurWash {item,steps|quick}`.
Tidak ada UID, email, token, harga, saldo, kualitas, tier atau hasil ekonomi dalam body (diuji: `NS()` memeriksa semua body).
Warna matang/asap di layar adalah **perkiraan tampilan** dari jendela waktu katalog; penilaian akhir hanya dari server.

## Nilai uji (menunggu Owner)
Harga bahan, harga pemanggang 250 dan angka kualitas adalah **nilai uji** — belum disetujui Owner. Klien tidak menanam angka itu.

## Tes
- `node tests/unit-dapur.js` — **26 lulus** (17 dari 08B + 9 baru: tingkat hasil/efek, pad, badan Mulai/Cuci, batas masak bebas, Percepat, alat kotor tanpa penilaian di klien, perkiraan visual, fishPool, galat).
- `python3 tests/browser/test_dapur_masak.py` — **133 lulus, 0 gagal** (termasuk 26 uji workstation `WB*` dan 14 uji ukuran layar `WS-*`), dengan **backend ASLI (PR #60)** lewat jembatan lokal `tests/browser/dapur_bridge.mjs` (Firestore tiruan, jam bisa dimajukan, data sintetis). Butuh `NUSA_BACKEND=/jalur/nusa-island-control-center`; tanpa itu uji DILEWATI, bukan lulus palsu.
  Cakupan: 10 resep (4 awal + 6 rahasia ditemukan lewat masak bebas), gosong / mentah / aneh / tidak layak, makan & buang, blur 4 dtk dan hilangnya, mode tenang & reduced-motion, retry & klik ganda & putus koneksi (mulai, langkah, api, sajikan, makan) dengan jawaban hilang, ikan tepat sekali (mulai & batal), audio mute / slider 0 / lazy, cuci normal & percepat (+ 409 dari server), layar 360×740 / 412×915 / 740×360 / 1280×800 (panel & sheet kasir ≤45%, bisa diperkecil/ditarik, Bu Indah & kasir tidak tertutup).
- `python3 tests/browser/test_dapur.py` (08B) — 59 lulus, 0 gagal setelah perubahan sheet.
- Regresi lulus: semua `unit-*` (kecuali 2 yang sudah gagal di basis: `unit-leaderboard-stats`, `unit-username`), `test_ekonomi` 22, `test_house` 83, `test_rumahku_sosial` 25, `test_rumahku_flag_server` 2, `test_delivery` 35, `test_kedai_hidup` 16, `test_rombongan` 51.
- Gagal yang SUDAH ada di basis (bukan dari PR ini): `test_rumah_akuarium` (timeout `#misiBtn`), `unit-leaderboard-stats`, `unit-username`, `test_multiplayer` (`#gwContinue`).
- Bug nyata yang ditemukan & diperbaiki oleh uji: katalog ikan salah sumber (`FISH_BY_ID`), `setData` Rumahku tidak diekspor (pemanggang terbuka terdeteksi tertutup), keranjang masak bebas tidak dikosongkan setelah mulai, judul panel terpotong di lanskap.
- Build: `bash firebase/scripts/build-hosting.sh` dan `node firebase/scripts/cek-rilis.js` (lihat laporan PR). Pindai rahasia: bersih.

## Screenshot (`docs/ide08c/`)
Dipertahankan (sisanya dihapus lewat commit Git, bisa dipulihkan dari riwayat PR #139 sebelum pembersihan, commit `f817af7`):
1. `c01-menyiapkan-bahan.png` menyiapkan bahan (talenan).
2. `c02-menggoreng.png` menggoreng (kompor).
3. `c03-gagal-gosong.png` masakan gagal (gosong) dan reaksi karakter.
4. `c08-cuci-bilas.png` mencuci peralatan (langkah bilas).
5. `c-semua-workstation.png` gambar gabungan: talenan, kompor/wajan, panci, pemanggang, meja saji, wastafel.

## Keterbatasan (jujur)
- Tes di Chromium headless; FPS BUKAN bukti performa HP (Galaxy M15 5G belum diuji fisik). Audio sintetis belum didengar di perangkat nyata; mixing/volume butuh telinga Owner.
- Efek visual (asap, api, muntah kartun) digambar di kanvas ruangan; belum ada animasi karakter penuh (08D visual).
- Satu masakan aktif per pemain (aturan server); masakan di nampan maks 12.
- Multiplayer/tamu di dalam dapur tetap 08D: selama di dalam Kedai/Dapur pemain lain tidak melihat ruangan.
- Gestur pad memakai pointer events; layar sentuh nyata belum diuji (mouse Playwright). Ada fallback papan ketik (Enter/Spasi).

## Risiko integrasi
- `dapur/room.js` dan `dapur/kedai.js` diubah (sheet + inset kamera); PR ini bertumpu pada #137 — jika #137 berubah, rebase 08C.
- `index.html`: urutan muat `core, art, room, kedai, masak, rumah, client` (masak.js sebelum rumah.js).
- Semua flag tetap MATI: `NUSA_DAPUR=false` di klien dan `dapurRumahku` di server.
