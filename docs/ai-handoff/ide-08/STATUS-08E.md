# STATUS 08E — Dekorasi Halaman Rumahku + uji E2E Ide 08 (Worker 01)

Draft. Semua flag tetap **OFF**. Tidak ada merge, deploy, flag ON, atau perubahan data pemain. Harga = nilai uji (menunggu Owner).

## Hubungan PR / SHA
| Lapisan | PR | Branch | Basis | Head saat ditulis |
|---|---|---|---|---|
| Backend 08A | #60 | `fitur/ide08a-dapur-backend-20261112` | `fitur/fase-a-kontrak-20261112` | `51084f3` |
| Backend 08D | #61 | `fitur/ide08d-sosial-backend-20261112` | #60 | `3737f3e` |
| **Backend 08E (turunan #61)** | **#63** | `fitur/ide08e-halaman-backend-20261113` | #61 | `02bfb68` |
| Game 08D | #141 | `fitur/ide08d-sosial-meja-makan-20261113` | #139 | `5012126` |
| **Game 08E** | (PR ini) | `fitur/ide08e-dekorasi-halaman-20261113` | #141 | lihat PR |

Game 08E butuh backend #63 (fungsi `dapurHalamanSimpan`, `halaman` di tampilan meja). Backend #63 membawa salinan byte-identik `server/vendor/dapur-halaman-geo.cjs` dari `dapur/halaman-geo.js` (sidik SHA-256 16 hex `f2e53b5bafd6ffcd`, diperiksa di kedua repo).

## Yang dibangun
- **Sumber kebenaran = server.** Pemilik menyimpan hanya selisih dari bawaan lewat `dapurHalamanSimpan {opId, items}` (semua-atau-tidak). Tidak ada posisi di penyimpanan lokal browser. Tamu mendapat `halaman {rev, lv, items}` dari server dan tidak punya jalur ubah (fungsi hanya terdaftar untuk pemilik; tanpa parameter target).
- **Geometri bersama** `dapur/halaman-geo.js` (klien & server memakai kode yang sama): batas area, benda dasar (rumah, kebun, kolam, dll.), zona terlarang (belakang rumah, depan pintu, gerbang, papan, kotak surat), tabrakan antar benda, bangku tidak boleh tertutup, dan jangkauan gerbang → pintu & semua titik pakai (BFS). 13 benda: meja makan, 6 kursi, bangku, meja kopi, payung, lampu, 2 tanaman.
- **UI HP**: tab "🛠 Atur" di sheet meja (pemilik saja): chip benda, pad panah (×1 / ×4), geser dengan jari langsung di halaman (tidak mengaktifkan joystick), pratinjau langsung, status ✅/⛔ + benda merah, Simpan (nonaktif bila tak sah), Batal, Bawaan. Target sentuh ≥ 40 px di semua ukuran layar.
- Perbaikan yang ditemukan uji E2E: tamu memilih kursi **dekat meja** (bukan sekadar terdekat dari tamu) supaya tidak makan di bangku jauh bila meja digeser; susunan dievaluasi ulang bila level lokal berubah.

## Hasil tes (satu run, bisa diulang)
Perintah dasar: `NUSA_BACKEND=<path control-center> python3 tests/browser/<file>.py`
| Tes | Hasil |
|---|---|
| `test_dapur_sosial.py` (default, tanpa `shots`) | **169 PASS / 0 FAIL** = 125 (bagian 08D) + 44 (08E: nomor 30–39 + 0f) |
| `test_dapur_sosial.py shots` (jalan terpisah) | 6 PASS / 0 FAIL (3 gerbang + 3 bukti visual) |
| `test_ide08_e2e.py` (alur penuh Ide 08) | **33 PASS / 0 FAIL** |
| `tests/unit-halaman-geo.js` | 13 PASS (termasuk fuzz 6000) |
| Semua `tests/unit-*.js` | 45 dari 47 file lulus; 2 gagal sudah ada sebelumnya (`unit-leaderboard-stats`, `unit-username`) |
| Backend `npm test` (control-center) | 383 tes: 380 lulus, 3 dilewati, 0 gagal (11 tes baru `dapur-halaman.test.js`) |
| Regresi browser | `test_dapur` 59/0, `test_dapur_masak` 133/0, `test_rombongan` 51/0, `test_house` 83/0, `test_rumahku_sosial` 25/25, `test_kemudi_rombongan` 72/0, serta `test_port_rombongan`, `test_ekonomi`, `test_delivery`, `test_kedai_hidup`, `test_rumahku_flag_server` exit 0 |
| `gen_halaman_geo.py --check`, `cek-rilis.js` | OK |

**Meluruskan angka 08D.** "125/125" = jalankan default (`test_dapur_sosial.py`, tanpa `shots`). "128/128" = 125 + 3 tes bukti visual dari bagian `shots` yang dijalankan terpisah. Keduanya benar untuk perintah masing-masing; angka resmi 08D: **125 (default) + 3 (`shots`)**. Pada 08E run default menjadi 169 karena 44 tes baru.

Catatan kestabilan: `test_kemudi_rombongan` sekali gagal (K6c) saat dijalankan bersamaan beban lain; dijalankan sendiri 72/0 (dua kali). Tes E2E & sosial sensitif beban; jalankan sendiri-sendiri.

## Alur E2E (satu run, 33 cek)
Kedai Bu Indah → keranjang → bayar (klik ganda: koin turun sekali; jaringan putus + coba lagi dengan opId sama: stok & koin tidak ganda) → masak ikan goreng (klik ganda Mulai: bahan −1 dan ikan −1 tepat sekali) → hasil enak → masak kedua dibiarkan gosong (reaksi karakter batuk, tak ada koin/buff) → cuci alat (kotor −1 di server) → hidangkan di meja halaman (retry opId sama tidak menggandakan) → pemilik menata halaman → dua tamu melihat susunan identik & semua titik terjangkau → tamu tidak bisa membuka dapur/mengatur dekorasi → tawaran ke dua tamu → keduanya makan (porsi turun tepat 2) → keluar → masuk lagi (izin tetap, porsi tidak kembali/ganda).
Rebutan porsi/kursi terakhir, kedaluwarsa, klik ganda tawaran, retry, reconnect, empat ukuran layar (360×740, 412×915, 740×360, 1280×800), flag OFF: tercakup di bagian 0–22 dan 39.

Bukti visual: `docs/ide08e/01-kedai`, `02-proses-masak`, `03-masak-gagal-reaksi`, `04-cuci-alat`, `05-halaman-dua-tamu`.

## Batas yang jujur
- **Kursi hanya penanda di klien.** "Terisi" ditentukan dari bendera duduk pemain di server realtime + status lokal; server dapur **tidak** mengunci kursi. Dua klien yang berebut kursi bisa sama-sama duduk jika sinyalnya terlambat. Yang **dikunci server** adalah porsi makanan (transaksi, satu pemenang), izin tamu, dan susunan halaman.
- Animasi "tamu makan" di layar pemilik adalah perkiraan tampilan (membaca meja tiap ~4 dtk); hasil sebenarnya dari server.
- Level halaman di server berasal dari simpanan awan pemilik (`home.level`). Susunan dievaluasi ulang di klien pada level lokal/kunjungan; bila level lokal & server belum sinkron sesaat, tampilan memakai susunan bawaan level itu. Di harness uji level server diset manual (`/__homepub`).
- Belum ada pengubah "putar" benda (hanya posisi). Sudut/arah kursi mengikuti meja.

## Belum terbukti
- **HP sungguhan**: semua uji di Chromium headless dengan sentuhan simulasi. Belum diuji jari nyata (geser benda, panel Atur di berbagai HP, performa/FPS, audio, notch/safe-area).
- **Server produksi**: semua uji memakai kode Worker asli tetapi dengan Firestore tiruan dan data sintetis. Belum diuji pada Firestore/Worker produksi, latensi nyata, beban banyak pemain, jam server asli, atau data pemain nyata. Flag `dapurRumahku`/`socialHome` masih OFF; belum ada rollout.
- Harga bahan/alat masih nilai uji; keseimbangan ekonomi belum diputuskan Owner.
- Server realtime multiplayer diuji lewat server dev (`tests/dev/mp-dev-server.js`), bukan Durable Object produksi.

## Integrasi Worker 02 (belum dikerjakan)
Branch/PR Worker 02 (#145 `fitur/multiplayer-kota-20261113`, basis #140 visual Kota) **tidak diubah**. Dry-run `git merge-tree` terhadap head mereka saat itu (`c6af54b`) menunjukkan konflik teks di `index.html`, `firebase/scripts/build-hosting.sh`, `mp/client.js`, `rombongan/client.js`. Integrasi akan dibuat di branch terpisah **setelah SHA final Worker 02 ada**, lalu semua tes di atas diulang dan `python3 tests/dev/gen_halaman_geo.py --check` dijalankan (mendeteksi bila perubahan Rumahku/Kota menggeser geometri halaman; bila "BEDA", data GEO digenerate ulang di game DAN salinan backend).

## Cara mengulang
1. Backend: `cd nusa-island-control-center && npm test`.
2. Game: `export NUSA_BACKEND=<path control-center>`; `python3 tests/browser/test_dapur_sosial.py` (≈11 mnt), `python3 tests/browser/test_dapur_sosial.py shots`, `python3 tests/browser/test_ide08_e2e.py` (≈4 mnt), `node tests/unit-halaman-geo.js`.
