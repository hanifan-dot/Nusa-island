# Audit pembayaran — NusaPhone (Ide 07, Tahap 6)
Status: **Draft untuk Owner**. Semua flag MATI. Tidak ada pembayaran uang asli yang diuji (lingkungan uji = Worker asli + Firestore TIRUAN). Dokumen ini hanya mengklaim apa yang ada buktinya di kode/tes.

## 1. Kesimpulan singkat
1. NusaPhone **tidak punya jalur pembayaran sendiri**. Model premium (s3/s4/s5/Nusa Crown 17) tidak pernah dibeli, diberikan, atau dikonfirmasi oleh kode ponsel — baik klien maupun server.
2. Satu-satunya tambahan di sisi pembayaran = **adaptor BACA-SAJA** (`server/phone-payment.js`, backend PR #66) yang bertanya ke Payment Center lama: "apakah uang nyata aktif untuk pemain ini, dan model mana yang memang dijual di katalognya?". Jawaban ragu/gagal = **tidak tersedia**.
3. **Saat ini model premium belum bisa dibeli sama sekali**, dan itu disengaja: katalog Payment Center lama (`shop-core`) belum memuat produk `phone_*`. Menambahkannya berarti **mengubah Payment Center lama** — di luar kontrak Ide 07 dan butuh persetujuan Owner (lihat §6).
4. Kode Payment Center/Premium Shop/QRIS lama **tidak diubah** (bukti §5).

## 2. Alur pembayaran lama (tidak disentuh)
Pesanan dibuat pemain → pembayaran QRIS → pesanan `PENDING` → Owner mencocokkan mutasi merchant → `confirmPayment` (backend, `server/vendor/shop-core.cjs`) memverifikasi nominal = harga + kode unik, `env === 'NYATA'`, `providerRef` unik → `grant()` menulis `ent.products[id]` dan `ent.owned[grant]` (`{from, at, env}`) atau menambah `ent.wallet.NYATA` untuk paket koin. Kunci server: `NUSA_SHOP_LIVE` (uang nyata), `ENABLE_SHOP_PRODUCTION` (tulis), mode `nyata` di `shop_config/main`, daftar `pilot`, `NUSA_PUBLIC_OPEN` (pilot kosong ≠ terbuka umum tanpa kunci ini).

## 3. Yang ditambahkan Ide 07 di sisi pembayaran
| Komponen | Isi | Bukti |
|---|---|---|
| `server/phone-payment.js` | `makePhonePayment({shop, db, publicOpen})` → `({uid}) → {available, models[]}`. `available` = katalog lama melaporkan `live:true` **dan** `shop_config.mode==='nyata'` **dan** pemain boleh (pilot berisi uid, atau pilot kosong + `NUSA_PUBLIC_OPEN=ya`). `models` = id premium yang ADA dan `enabled` di katalog sebagai produk `phone_<id>`. Cache 15 dtk; kegagalan tidak di-cache. | uji `nusaphone-payment` #1 (matriks kasus + cache) |
| `server/phone-server.js` | Adaptor dipanggil SEBELUM transaksi ponsel (`pay$`), hasilnya dinormalisasi gagal-tertutup (`normPay`). `buyable` premium hanya bila `pay.available` **dan** model ada di `pay.models`; alasan: "Pembayaran belum tersedia" / "Belum dijual di Payment Center". `phoneBuy` untuk premium **selalu menolak (409)**. Kepemilikan premium dibaca dari `ent.owned['phone_'+id]` (hanya BACA). | uji #2, #3, #5, #6 |
| `worker/index.js` | Merangkai adaptor ke server ponsel memakai `shop` (server toko lama) dan `NUSA_PUBLIC_OPEN`. | uji #3, #4 (Worker asli) |
| Klien `phone/store.js`, `phone/dompet.js` | Tombol premium aktif hanya bila server mengirim `buyable:true`, dan hanya membuka `NW.shopUI.open("topup")` (Payment Center lama). "Isi Koin" aktif hanya bila `pay.available`. Tidak ada permintaan `phoneBuy` untuk premium. | `test_phone_store.py` R1–R7, `test_phone_social.py` dompet D1–D5 |

## 4. Matriks bukti (tes yang dijalankan)
Backend (`node --test test/*.test.js`): **418 tes, 415 lulus, 0 gagal, 3 dilewati** (sebelum Tahap 6: 410/407). Uji baru `test/nusaphone-payment.test.js` (7):
1. Adaptor unit: tersedia hanya bila live **dan** diizinkan; model hanya yang ada & aktif; pilot kosong tanpa kunci publik = tidak; simulasi/uid hilang/uid bukan string/katalog atau config melempar/katalog kosong = tidak; cache TTL.
2. Worker asli, bawaan: semua premium "Pembayaran belum tersedia"; `phoneBuy` (walau klien mengirim `paid:true, price:0, status:'PAID', orderId`) → 409; koin tidak berubah; **tidak ada dokumen entitlement terbentuk**.
3. Worker asli, Payment Center nyata aktif tapi katalog lama tanpa `phone_*`: `pay.available=true` namun semua premium "Belum dijual di Payment Center"; `phoneBuy` 409.
4. Kunci server: nyata tanpa `NUSA_PUBLIC_OPEN` & tanpa pilot = tidak; uid pilot = ya; bukan pilot = tidak; simulasi = tidak; `NUSA_SHOP_LIVE=0` = tidak.
5. Kepemilikan: klien tidak bisa memalsukan (`owned`, `ent`, `paid` di parameter diabaikan → 409); hak milik sah (`ent.owned.phone_s3` seperti hasil `grant()` lama) langsung terbaca, hanya model itu yang dimiliki, bisa dipakai (penyimpanan 48.000 MB), dan ponsel tidak menulis entitlement.
6. Per-model dengan adaptor tiruan: hanya model yang dijual punya `buyable`; adaptor rusak/aneh (`throw`, `null`, `available:'true'`, `models:'semua'`) = tidak ada yang bisa dibeli; `phoneBuy` tetap menolak.
7. Audit statis: `phone-payment.js` tanpa `.set(`/`.update(`/`.delete(`/`.bal`/`credit`/`createOrder`/`confirmPayment`/`.owned`/`wallet`/`NYATA`/`grant`/`providerRef`; `phone-server.js` tidak menulis `ent.*` / `ENT` / `ORD` / `REF` dan tidak memanggil jalur pembayaran; **katalog lama tidak memuat `phone_*`**.

Klien (Playwright, server tiruan): `test_phone_store.py` premium **10/10** — pembayaran belum tersedia → tombol & "Isi Koin" nonaktif, mengeklik tidak mengirim apa pun; server menolak premium walau klien mengaku sudah bayar (4 model); saat backend menyatakan tersedia → "Beli di Payment Center" menutup toko dan membuka Payment Center LAMA tanpa permintaan `phoneBuy`/kepemilikan; "Isi Koin" hanya membuka Payment Center lama; live-tapi-belum-dijual → "Belum dijual di Payment Center". (Catatan jujur: kondisi "pembayaran tersedia" di sisi klien diuji dengan mengubah jawaban `phoneState` di lapisan jaringan uji; keputusan nyata tetap di server dan dibuktikan oleh uji backend di atas.)
Regresi klien: `unit-shop` 21/0, `unit-economy` 29/0, `unit-rilis` 21/0, `unit-cf-auth` 20/0, `test_phone_social.py` regresi R1 (berkas Payment Center tidak berubah) dan Dompet D5 (Payment Center lama terbuka normal dari game).

## 5. Bukti Payment Center lama tidak berubah
Perintah (dapat diulang):
- Game: `git diff --stat origin/integrasi/final-kota-ide08-20261114 -- shop firebase/functions firebase/firestore.rules` → **kosong** (0 berkas).
- Backend: `git diff --stat 3bbe95a -- server/vendor server/shop/service.js server/shop/integrity.js server/shop/store.js worker/recovery.js` → **kosong**. (`3bbe95a` = ujung cabang dasar backend.)
- Satu-satunya perubahan di `server/shop/` = `db.js`, **+2/-2 baris, hanya aditif**: menambah koleksi `phone` dan `klippy` ke pemetaan jalur logis→Firestore (dibutuhkan agar dokumen ponsel/Klippy bisa disimpan). Tidak mengubah `core`, pesanan, entitlement, ledger, atau verifikasi.
- Uang top-up (`ent.wallet.NYATA`) hanya DIBACA oleh `phoneState` (Dompet Nusa). Koin bermain (`eco.bal`) tidak pernah naik karena top-up; kode ponsel/Ocean Spin hanya membelanjakan `eco.bal` (uji `nusaphone-sumber-koin`).

## 6. Yang BELUM ada / butuh keputusan Owner
1. **Produk premium belum ada di katalog Payment Center.** Agar model premium bisa dibeli lewat jalur lama, katalog (`shop/core.js` di game + salinan `server/vendor/shop-core.cjs`) perlu 4 produk, usulan: `phone_s3` (Rp5.000), `phone_s4` (Rp10.000), `phone_s5` (Rp15.000), `phone_crown17` (Rp25.000), masing-masing `grants: ["phone_<id>"]`, kategori sendiri, `cosmetic:true, power:false`. Ini **mengubah Payment Center lama** (katalog, harga, tampilan toko, uji harga/kode unik) — **tidak saya kerjakan** tanpa persetujuan Owner; setelah itu adaptor di atas otomatis menyala (tanpa kode baru) bila uang nyata aktif.
2. **Belum ada bukti pembayaran sungguhan** (QRIS asli, Owner menyetujui, `grant` produk phone). Setelah katalog diperluas perlu uji pilot terkendali (daftar `pilot` 1 akun milik Owner) sebelum dibuka umum.
3. Pembelian tanpa pengelakan anak: toko menampilkan imbauan izin orang tua/wali, tetapi **tidak ada verifikasi usia** di sistem — keputusan kebijakan Owner. Model hanya kosmetik + penyimpanan (bukan kekuatan), tetapi Ocean Spin memakai koin bermain (bukan top-up); ini pembatas pembayaran yang sudah diuji, bukan pengganti kebijakan loot-box/anak.
4. Harga, kapasitas, lini, nama lima model = angka uji "menunggu Owner" (lihat STATUS).

## 7. Cara memverifikasi ulang
```
# backend (cabang fitur/nusaphone-ide07-backend-20261114)
npm test                      # 418 tes
node --test test/nusaphone-payment.test.js
# game (cabang fitur/nusaphone-ide07-20261114)
NUSA_BACKEND=<jalur backend> PT_ONLY=premium python3 tests/browser/test_phone_store.py
NUSA_BACKEND=<jalur backend> PS_ONLY=regresi python3 tests/browser/test_phone_social.py
git diff --stat origin/integrasi/final-kota-ide08-20261114 -- shop firebase/functions firebase/firestore.rules
```
