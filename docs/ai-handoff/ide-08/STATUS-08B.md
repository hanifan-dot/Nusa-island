# Ide 08B — Kedai Bu Indah + interior Dapur Rumahku (game, klien)

Pemilik: Worker 01 (kepemilikan penuh Ide 08). Status: **Draft PR, semua flag MATI**. Tidak mengubah PR #136 / #59 / #60 / #61.
File ini baru; tidak menimpa status Worker 02 (`docs/ai-handoff/worker-02/STATUS.md`).

## Basis
- Base commit: `fd803a3f45a9b76fb2daef3b4619bc38acd13c8b` (SHA final PR #136, persis).
- Branch: `fitur/ide08b-kedai-dapur-20261113`.
- Backend yang dipakai: PR #60 (08A), kontrak `CONTRACT-08A.md` di repo `nusa-island-control-center`.

## Yang dikerjakan (08B saja)
1. **Kedai Bu Indah** — bangunan yang bisa dimasuki di Muara, di bekas lahan kosong dekat NUSA STYLE (papan "Lahan Pengembangan" + pagar bambu dipindah; lampu jalan, NUSA STYLE, Kedai Atuk Bahar tidak disentuh).
   Interior: rak beras/bumbu, keranjang sayur, kulkas telur/susu, meja tempe, etalase kaca, keranjang belanja, meja kasir, Bu Indah (rute 3 titik tetap, tanpa pathfinding), pintu, struk, kucing "Si Mbul".
2. **Alur belanja bukan modal**: rak → keranjang sementara (lokal) → kasir Bu Indah → `dapurBuy` → struk dari jawaban server. Gagal = keranjang & koin utuh; coba lagi dengan `opId` sama tidak ganda.
3. **Interior Dapur Rumahku** — pintu di dinding kiri Rumahku (di atas pintu keluar); kompor 2 tungku + wajan + panci, pemanggang (terpal bila belum dibuka), talenan + pisau, bak cuci + rak piring, kulkas, meja persiapan, tempat sampah, lemari bahan, rak piring/gelas/sendok, gantungan celemek. Lemari/kulkas menampilkan **isi nyata dari server**.
4. **Mesin adegan baru `NW.room`** (`dapur/room.js`) dengan antarmuka sama seperti `NW.home`; `world/world.js` memilih adegan aktif. Cangkang ruangan di-cache ke canvas luring (hanya benda dinamis digambar ulang tiap bingkai); kolam partikel terbang 12.

## Cakupan yang BUKAN 08B (jujur)
- Memasak interaktif, hasil masakan, cuci piring, audio → **08C** (kompor/talenan/bak cuci hanya memberi dialog "segera hadir").
- Tamu/halaman sosial/multiplayer di dalam dapur → **08D** (selama di dalam Kedai/Dapur, `homeScene()` multiplayer null; pemain lain tidak melihat ruangan ini).
- Bukti visual 4 gambar akhir, tes performa HP nyata → **08E**.

## Flag & gerbang
- `NUSA_DAPUR=false` (default, `cloud/config.js`): hanya saklar muat modul. **Mati ⇒ `dapur/*` tidak diunduh** (tes A1), dunia lama persis (A2–A5).
- Nyala di klien tetap belum cukup: setelah login `gameFlags.dapurRumahku===true` dari server baru memasang bangunan + pintu dapur (server OFF ⇒ tak ada bangunan/titik/pintu, nol panggilan `dapur*`; tes B1–B4).
- Tidak ada flag yang dinyalakan, tidak ada deploy/merge.
- `firebase/scripts/build-hosting.sh`: ditambahkan folder `dapur` ke daftar salin (tanpa ini modul 404 saat flag nyala).

## Kontrak API yang dipakai (tidak mengubah backend)
`gameFlags`, `dapurState {}`, `dapurBuy {opId, items:[{id,n}]}`, `dapurUnlock {opId, tool:"pemanggang"}` lewat `NusaApi.call`.
- Body beli hanya `{opId, items:[{id,n}]}` — tanpa harga/saldo/UID/email (tes C18).
- Harga, saldo, stok **selalu dari jawaban server**; klien tidak menghitung otoritatif (total yang tampil = penjumlahan harga katalog server, hanya untuk tampilan).
- `opId` dipakai ulang selama isi keranjang sama dan kegagalan belum "pasti"; setelah gagal pasti (409/400) keranjang boleh diubah.
- Saldo: jawaban dapur hanya memberi `own`; `Core.mergeEco` menjaga sisa Top-Up.

## Nilai uji (menunggu Owner)
Harga bahan, pemanggang 250, dan angka kualitas adalah **nilai uji**, bukan keputusan Owner. Klien tidak menanam angka harga; semua dari katalog server.

## Tes
- `node tests/unit-dapur.js` — 17 lulus (keranjang, batas, opId, layout, jangkauan, kolisi).
- `python3 tests/browser/test_dapur.py` — **59 lulus, 0 gagal** (flag off, server off, alur Kedai termasuk gagal 409 dan jaringan putus + retry opId sama, Dapur, 4 layar 360×740 / 412×915 / 740×360 / desktop).
- Regresi lulus: unit-* (kecuali 2 yang sudah gagal di basis `fd803a3`: `unit-leaderboard-stats`, `unit-username`), `unit-mp` 193, `test_ekonomi` 22, `test_house` 83, `test_rumahku_sosial` 25, `test_rumahku_flag_server`, `test_delivery` 35, `test_kedai_hidup` 16, `cek-rilis` OK (22 fitur).
- Gagal yang SUDAH ada di basis (bukan dari PR ini): `test_rumah_akuarium` (klik `#misiBtn` timeout), `unit-leaderboard-stats`, `unit-username`.
- Pindai rahasia pada berkas baru: bersih.
- Peringatan: tes di Chromium headless; FPS-nya BUKAN bukti performa HP (Galaxy M15 5G belum diuji fisik).

## Screenshot (`docs/ide08b/`)
01 luar kedai · 02 interior · 03 rak sayur · 05 kasir · 07 struk · 09 pintu dapur di Rumahku · 10 interior dapur · 21 kasir 740×360 · 22 dapur 360×740.

## Keterbatasan
- Saat sheet kasir terbuka, sebagian ruangan tertutup (kamera belum bergeser).
- Petunjuk tutorial global (`setHint`) bisa menimpa area atas layar di ruangan.
- Tanpa audio (08C). Bu Indah hanya rute tetap + ucapan.
- Pemanggang: pembukaan 2 langkah sudah ada; dipakai memasak di 08C.

## Risiko integrasi
- `world/world.js` kini lewat `scene()`; semua hook `inHome()` ikut. Diuji lewat tes Rumahku/mp/rombongan, tetapi area ini paling rawan konflik dengan PR lain yang menyentuh `world.js`/`home.js`.
- `HD.extraClear` (area bebas pintu dapur) mengubah `canPlace` hanya bila diisi; kosong = perilaku lama.
- Pindah ke Kedai/Dapur menyembunyikan tombol Rumahku (`body.room-active`).
