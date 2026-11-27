# SAR Laut — "Panggilan Darurat Nusa" (PROTOTIPE LOKAL)

Status: **dibangun & diuji lokal. BELUM di-push, BELUM di-merge, BELUM di-deploy, BELUM live.** Menunggu izin Owner.
Cabang kerja: `fitur/sar-laut-prototipe-20261128` (dasar: `origin/hotfix/tes-recovery-4h-20261109` @ `e4508f6`, basis game live).

## Saklar (semua MATI)
- Klien: `window.NUSA_SAR` (bawaan `false`, `cloud/config.js`). `sar/*` tidak diunduh bila false.
- Wajib juga: NusaPhone menyala dari server (`gameFlags.nusaPhone`). Tanpa itu SAR diam (tidak ada dering, tidak ada objek dunia).
- Tidak ada perubahan backend/Worker/Firestore. Tidak ada field ekonomi.

## Berkas
- `sar/core.js` — inti murni (aturan anti-spam, mesin keadaan, skor, migrasi simpanan). Waktu selalu disuntik.
- `sar/client.js` — ketukan 1 dtk (tanpa jaringan), layar NusaPhone tersembunyi, korban/petunjuk/Pos SAR/kabut (gambar), hint, kartu hasil.
- `sar/sar.css` — gaya (tombol ≥44 px).
- Kait kecil: `game.js` (migrate + hook), `world/world.js` (kandidat interaksi, layer, kabut layar), `world/boat.js` (gambar korban di kapal pemain), `phone/core.js` + `phone/client.js` (layar tersembunyi `sar`, `toastMs`, `quiet`), `index.html` (pemuat), `firebase/scripts/build-hosting.sh` (salin `sar/`).
- Uji: `tests/unit-sar.js`, `tests/browser/test_sar.py`, `tests/browser/test_sar_mp.py`.

## Aturan anti-spam (semua di `sar/core.js: canOffer/offer`)
7 menit bermain aktif (per sesi; sentuhan/tombol ≤60 dtk, layar terlihat) · maks 1 panggilan per sesi (dering sekali) · jeda 4 jam (jam tepercaya) · maks 2 tawaran/hari WIB · satu misi aktif · "Nanti" = tetap di NusaPhone, tak berdering lagi · "Tolak" = misi sama tak ditawarkan lagi · ditunda (tanpa menghabiskan jatah) saat cutscene/dialog/memancing/Rumahku/toko/Kedai/Dapur/Cloud Save berjalan/belum punya kapal ke Selat · tawaran kedaluwarsa 3 jam, misi aktif 40 menit.

## Penyimpanan
`S.sar` (field tambahan, `v:1`), terpisah dari ekonomi/ikan/inventaris/QRIS/event. Simpanan lama tanpa `S.sar` atau dengan `S.sar` rusak → keadaan awal yang sah. Ikut Cloud Save yang sudah ada (tanpa permintaan baru, tanpa polling).

## Jam tepercaya & keterbatasan jujur
Jam = jam server multiplayer yang sudah ada (`NW.mp._serverNow`) + pengganti monoton `performance.now()`. Tanpa jam itu tidak ada tawaran baru (gagal-aman). Artinya SAR hanya berdering bila Dunia Bersama pernah tersambung di sesi itu.
`S.sar` ada di Cloud Save yang bisa ditulis klien → jeda/batas harian bisa diakali oleh yang memanipulasi simpanannya. Buku besar sisi-server (backend) perlu PR terpisah bila anti-akal-akalan wajib.

## Belum ada / diketahui
- Misi PRIBADI (bukan misi bersama). Pemain lain tidak melihat korban/petugas. Misi bersama BELUM diimplementasi.
- Hanya satu misi (`nelayan-biru-1`). Setelah selesai/ditolak tidak ada tawaran lagi (daftar misi baru = pekerjaan lanjutan).
- Aset visual sederhana (digambar kode), belum diolah art.
- Notifikasi NusaPhone disimpan di memori (aturan NusaPhone); tawaran dipulihkan dari `S.sar` setelah muat ulang tanpa bunyi.
- Kedai Bu Indah & Dapur: ditunda lewat `NW.room.active` — diuji lewat pemetaan unit, belum di ruangan sungguhan.
