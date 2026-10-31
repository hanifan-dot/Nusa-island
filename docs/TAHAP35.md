# Tahap 3.5 — Nusa Premium (Premium Shop, Gamepass Sultan, Top Up Koin, QRIS)

**Status: MODE SIMULASI. Tidak ada uang sungguhan yang diproses. Pembayaran nyata TIDAK aktif dan tidak bisa dinyalakan dari browser.**
Cabang: `fitur/tahap-3-5-premium-shop` (dari `fitur/bumbu-3-1-kedai-atuk`). Tidak ada merge/deploy/perubahan `main`.

## 1. Yang dibangun
| Bagian | Berkas |
|---|---|
| Inti toko (katalog, harga, promo, pesanan, ledger, hak milik, audit, endpoint Owner) — logika murni, **dipakai ulang oleh backend nyata** | `shop/core.js` (`NusaShopCore.makeShopServer`) |
| Backend SIMULASI di browser (localStorage per-UID; `realEnabled=false` permanen) | `shop/sim.js` |
| Gambar: bangunan NUSA PREMIUM, penjaga Bu Laksmi, pratinjau animasi tiap produk/paket | `shop/art.js` |
| Antarmuka (satu katalog; tab Gamepass, Skin Kapal, Kostum, Dekorasi Rumah, Efek Nama, TOP UP KOIN 🪙, Riwayat) + layar pembayaran | `shop/ui.js`, `shop/shop.css` |
| Bangunan di Muara (utara pasar), tombol "Buka Toko", ikon mahkota 👑 di HUD, pemakaian kosmetik | `shop/shop.js` |
| Cloud Save: `S.shop` = hanya pilihan "sedang dipakai" (divalidasi bentuknya) | `firebase/functions/lib/core.js` + `cloud/core.js` |
| Uji | `tests/unit-shop.js`, `tests/browser/test_tahap35.py` |

Kosmetik yang tampil di dunia: **kostum** (Sultan/Nelayan), **gelar** "Sultan Samudra", **efek nama** (emas/gelombang), **skin kapal** (kapal tertambat di dermaga), **dekorasi rumah** (lampion di halaman Rumahku)., dan **lencana Sultan** di layar Profil (hanya bila dimiliki & dipakai).

Semua produk **kosmetik saja** (`power:false`) — tidak mengubah kekuatan, kecepatan kapal, peluang ikan mistis, atau peluang menang minigame.

## 2. Harga & promo
Harga perkenalan / reguler: Gamepass Sultan 15.000/25.000, Skin Kapal 5.000/8.000, Kostum 3.000/5.000, Dekorasi Rumah 5.000/8.000, Efek Nama 2.000/4.000.
- Tanggal mulai promo = konfigurasi Owner (`ownerSetLaunch`), **tidak otomatis**. Sebelum diatur: UI menulis "30 hari sejak peluncuran resmi (tanggal diumumkan Owner)".
- Selama promo: label PROMO PELUNCURAN, harga perkenalan, info "Harga reguler setelah promo: …" (tanpa coretan / tanpa klaim "harga lama"), tanggal-jam berakhir (WIB), hitung mundur.
- Waktu: harga & fase dihitung **server** (`getCatalog().now`); UI memakai selisih jam server–perangkat saat toko dibuka. Pada mode simulasi, "server" = jam perangkat (jujur: bukan waktu tepercaya sampai backend nyata ada).
- Setelah 30 hari harga reguler berlaku otomatis; hak milik yang dibeli saat promo permanen (entitlement tidak punya masa berlaku).

## 3. Top Up Koin
| Paket | Rupiah | Koin | Dasar (200/Rp1.000) | Bonus |
|---|---|---|---|---|
| Pemula | 2.000 | 400 | 400 | 0 |
| Nelayan | 5.000 | 1.100 | 1.000 | +100 (+10%) |
| Juragan | 10.000 | 2.300 | 2.000 | +300 (+15%) |
| Sultan | 20.000 | 4.800 | 4.000 | +800 (+20%) |
Dihitung otomatis dari satu konstanta (`COINS_PER_1000=200`) dan diuji (unit test).

**Dompet:** pada SIMULASI, koin top up masuk saldo **"koin simulasi" terpisah** (`wallet.SIMULASI`), TIDAK menambah `S.money`, supaya ekonomi pemain & mode uji Owner tidak tercampur. Koin dari memancing tetap berjalan normal. Pada mode nyata nanti, saldo `wallet.NYATA` dipindahkan ke koin utama lewat satu endpoint server (`claimCoins`, belum dibuat — lihat §7) agar tidak bisa diklaim dua kali. Tidak ada gacha/acak berbayar; koin tidak membuka ikan mistis, monster dunia, atau kemenangan kompetitif.

### Evaluasi ekonomi (angka dari `data.js`)
Total harga semua upgrade (joran 9 tingkat berbayar 360.700 + umpan 22.700 + coolbox 215.550) ≈ **598.950 koin**.
- Rp20.000 (4.800 koin) ≈ 0,8% dari seluruh progres; Rp100.000 (≈ 24.000 koin) ≈ 4%.
- Tetapi upgrade awal murah (joran 400/1.800/6.500; umpan 300/1.400/5.000): satu paket Sultan sudah menutup hampir seluruh tingkat awal. Ini mempercepat **awal** progres, bukan akhir.
- **Rekomendasi (belum diterapkan, perlu keputusan Owner):** (a) batas pembelian koin per hari/pekan per akun, (b) koin top up hanya bisa dipakai untuk upgrade sampai tingkat tertentu, atau (c) turunkan koin per Rp1.000. Tanpa batas, pemain berbayar melewati bagian awal permainan dengan cepat. Karena itu dompet top up sengaja belum tersambung ke koin utama.

## 4. QRIS
- Foto QRIS yang kamu kirim **tidak dimasukkan ke repository** (gambar pembayaran tidak boleh dikomit). Nama merchant tampil: **"Kotanusa, Pakaian"** — yang tertulis di QRIS-mu; periksa ulang sebelum aktivasi. Kategori merchant "Pakaian" berbeda dari barang digital game: tanyakan ke penyedia QRIS/bank apakah penjualan item digital diizinkan dengan merchant ini.
- UI memakai **kotak penanda tempat** bertuliskan "Tempat QRIS resmi", **bukan** QR yang bisa dipindai. Tidak ada QR palsu/modifikasi. Saat diaktifkan, gambar asli diletakkan utuh (jangan diubah/kompres; tampilkan ≥ 220 px CSS, latar putih, margin tenang).
- Nominal tagihan = harga + **kode unik Rp1–99** (supaya pembayaran bisa dicocokkan di mutasi/catatan merchant). Selisihnya ditampilkan jelas.
- Nomor pesanan `NI-YYMMDD-XXXXXX`; status `PENDING | PAID | FAILED | CANCELLED`; pesanan PENDING kedaluwarsa 24 jam → `FAILED`.
- **QRIS statis tidak punya konfirmasi otomatis.** "Saya Sudah Bayar" hanya mencatat klaim (`claimedAt`), **tidak memberi apa pun**. Screenshot tidak dipakai sebagai bukti.

## 5. Audit keamanan Firebase Spark (hasil)
1. **Pemain bisa mengedit simpanannya sendiri.** `S.money` ada di save yang ditulis klien; aturan hanya membatasi ≤ 1e9. Maka *koin berbayar yang disimpan di save pemain bisa dipalsukan* → top up nyata dengan pemberian ke `S.money` **tidak aman** di Spark.
2. Spark **tidak punya Cloud Functions** (butuh Blaze) → tidak ada kode tepercaya untuk: memverifikasi pembayaran, menerima webhook, menulis hak milik.
3. Kepemilikan di save (`S.shop`) bisa dipalsukan. Karena itu `S.shop` hanya menyimpan pilihan "dipakai"; **hak milik selalu dicek ke server toko** (`owned`), dan UI mengabaikan pilihan untuk item yang tidak dimiliki (diuji).
4. Browser tidak punya API untuk menandai PAID: `NW.shopApi` hanya berisi fungsi pemain; `confirmPayment/failOrder/owner*` hanya ada di `core.js` dan menolak non-Owner/non-sistem (diuji). `simulatePayment` hanya hidup bila `realEnabled=false` & pesanan `SIMULASI`.
5. **Keputusan: pembayaran nyata TIDAK diaktifkan.** Aktivasi butuh backend tepercaya (§7).

## 6. Kontrak integrasi Nusa Command Center (rancangan; repo dashboard TIDAK diubah)
Semua endpoint Owner memeriksa `auth.token.role === "owner"` di server. Callable (Cloud Functions) atau REST di backend nyata; fungsinya sama dengan `makeShopServer`:
| Endpoint | Input | Hasil / fungsi |
|---|---|---|
| `ownerCatalog` | — | katalog + harga efektif + fase promo + produk nonaktif |
| `ownerSetLaunch` | `{launchAt(ms), promoDays=30 (1–90)}` | menetapkan mulai promo; audit dicatat |
| `ownerSetEnabled` | `{productId, enabled}` | aktif/nonaktifkan produk |
| `ownerSetMode` | `{mode:"simulasi"|"nyata"}` | `nyata` ditolak sampai backend pembayaran siap |
| `ownerListOrders` | `{status?, env?, uid?, from?, to?, cursor?}` | **(belum diimplementasikan di core; butuh koleksi/indeks lintas-pengguna di Firestore)** |
| `confirmPayment` | `{orderId, providerRef, paidAmount(int)}` | PAID bila nominal = `payAmount` persis, belum kedaluwarsa, `providerRef` belum dipakai; idempoten |
| `failOrder` | `{orderId, reason}` | menolak pesanan |
| `ownerUserReport` | `{uid}` | total NYATA vs SIMULASI per pemain |
| `ownerAudit` | — | log audit (≤ 500 entri; aktor, aksi, orderId, detail tanpa data pribadi) |
Laporan penjualan = agregasi `ledger` (hanya `env=NYATA` dihitung pendapatan).

### Skema data (path Firestore yang disarankan)
`shop/config` (launchAt, promoDays, mode, disabled{}), `shop/orders/{orderId}` (uid, productId, kind, rupiah, uniqueCode, payAmount, coins, bonus, status, env, createdAt, expiresAt, paidAt, claimedAt, events[]), `shop/userOrders/{uid}`, `shop/entitlements/{uid}` (products{}, owned{}, wallet{SIMULASI,NYATA}), `shop/ledger/{uid}` (entri `L-{orderId}`), `shop/refs/{providerRef}`, `shop/audit`, `shop/counters`.
### Draf Firestore Rules
```
match /shop/orders/{id}        { allow read: if request.auth.uid == resource.data.uid; allow write: if false; }
match /shop/userOrders/{uid}   { allow read: if request.auth.uid == uid; allow write: if false; }
match /shop/entitlements/{uid} { allow read: if request.auth.uid == uid; allow write: if false; }
match /shop/ledger/{uid}       { allow read: if request.auth.uid == uid; allow write: if false; }
match /shop/{doc=**}           { allow read, write: if false; }   // config/refs/audit/counters: hanya server
```
Semua tulis lewat server (Admin SDK melewati rules). Owner memakai custom claim `role=owner` yang diset lewat Admin SDK, bukan dari klien.

## 7. Yang harus disiapkan sebelum pembayaran resmi diaktifkan
1. **Backend tepercaya**: upgrade ke Blaze (Cloud Functions) *atau* penyedia pembayaran resmi (payment gateway QRIS dinamis) yang mengirim webhook bertanda tangan. QRIS statis saja = hanya verifikasi manual.
2. Jika manual: Owner mencocokkan mutasi rekening/riwayat merchant dengan `payAmount` (kode unik) lalu menekan konfirmasi di Command Center (`confirmPayment` oleh Owner). Beri SLA & batas nominal.
3. Menulis `claimCoins` server-authoritative + dompet koin tepercaya, dan memutuskan batas harian (§3) — **sebelum** koin berbayar menyentuh `S.money`.
4. Memasang custom claim `owner`, Firestore Rules §6, dan indeks `ownerListOrders`.
5. Memastikan merchant/QRIS boleh untuk barang digital; kebijakan refund, bukti transaksi, syarat & ketentuan, serta kepatuhan pajak/perlindungan konsumen.
6. Tentukan `launchAt` resmi (Owner) dan uji ulang dengan data nyata bernilai kecil.
7. Pengamanan: rotasi kunci, tanpa kredensial di repository, log tanpa data pribadi, pemantauan lonjakan pesanan.

## 8. Batasan & belum selesai (jujur)
- Pemulihan di perangkat lain **nyata** hanya bila backend nyata menyimpan `shop/*` di cloud. Pada simulasi data toko ada di localStorage perangkat; uji "perangkat lain" memindahkan data itu secara manual untuk meniru backend.
- Tamu (tanpa login) memakai UID `tamu-lokal` — hanya di perangkat itu.
- `ownerListOrders` & laporan lintas-pengguna: hanya kontrak (butuh Firestore).
- Kapal yang sedang berlayar (bukan tertambat) belum memakai skin.
- Uji = emulasi Chromium, bukan Android fisik.
