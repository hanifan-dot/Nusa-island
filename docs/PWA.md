# Nusa Island sebagai PWA (dapat dipasang di HP)

Status: DRAFT di branch `feat/pwa-installable-20261127`. Belum di-push, di-merge, atau di-deploy.

## Penyebab sebelumnya belum installable
Tidak ada `manifest.webmanifest`, tidak ada service worker, dan tidak ada ikon 192/512. Chrome Android hanya menawarkan instalasi bila ketiganya ada (di bawah HTTPS, `start_url` dalam `scope`).

## Berkas
Baru: `manifest.webmanifest`, `sw.js`, `pwa/pwa.js`, `pwa/pwa.css`, `pwa/icons/*.png` (192, 512, maskable 512, apple-touch 180), `scripts/make-pwa-icons.py`, `tests/browser/test_pwa.py`, dokumen ini.
Diubah: `index.html` (tautan manifest, ikon Apple, pwa.css, pwa.js), `firebase/scripts/build-hosting.sh` (salin `manifest.webmanifest`, `sw.js`, `pwa/`; menulis versi build ke `sw.js`), `firebase/firebase.json` (header manifest dan sw.js), `firebase/release-manifest.json` (fitur wajib "pwa" untuk gerbang `cek-rilis`).
Tidak diubah: gameplay, ekonomi, peluang ikan, Firebase Auth, Cloud Save, multiplayer, QRIS, data pemain.

## Strategi cache (`sw.js`)
- Hanya GET, satu origin, tanpa header `Range`. Selain itu SW tidak memanggil `respondWith` sama sekali (permintaan berjalan normal).
- TIDAK pernah dicegat: `/__/` (Firebase Auth), `/api/`, QRIS/dompet, `mp/endpoint.json`, dan semua origin lain (Firestore, googleapis, Worker API/multiplayer/QRIS, WebSocket).
- Kode (html/js/css/json): jaringan dulu. Cache dipakai hanya bila jaringan gagal total, sehingga pemain tidak memakai kode lama.
- Media (png/jpg/webp/svg/audio/font): cache dulu di dalam versi yang sama. Nama cache `nusa-island-<commit game>`, jadi media tidak basi lintas rilis.
- Respons hanya disimpan bila 200, `basic`, tanpa `no-store`/`private`/`set-cookie`.
- Saat versi baru aktif, cache `nusa-island-*` versi lama dihapus.
- Tidak ada `skipWaiting` otomatis: versi baru menunggu pesan `SKIP_WAITING` dari pemain.

## Pembaruan
Setiap rilis menulis commit game ke `sw.js` saat build, jadi tiap rilis memunculkan SW baru. `pwa.js` memeriksa pembaruan saat dimuat, tiap 30 menit, dan saat tab kembali aktif. Modal "Pembaruan Nusa Island tersedia." punya tombol "Perbarui Sekarang" (aktifkan SW baru, muat ulang satu kali, dijaga flag dan jeda 15 dtk) dan "Nanti" (game jalan terus; pengingat muncul lagi setelah ≥15 menit).

## Tombol instal
Event `beforeinstallprompt` disimpan (preventDefault). Tombol "📲 Instal Nusa Island" hanya muncul bila event itu ada dan app belum terpasang atau standalone; hilang setelah dipakai, setelah `appinstalled`, atau bila ditutup (✕, disembunyikan 7 hari). Browser HP tanpa prompt otomatis (mis. Safari iOS, Firefox) mendapat tombol "Cara pasang" yang membuka petunjuk: "Buka menu browser lalu pilih Tambahkan ke layar utama."

## Pengujian
`python tests/browser/test_pwa.py` (Chromium emulasi HP, server lokal meniru hosting). Rincian dan batasannya ada di laporan PR.
