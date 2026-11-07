# Pilih Dunia Bermain — Multiplayer / Singleplayer (catatan hasil)

Status: **selesai dikode & diuji; menunggu review Owner. Belum merge, belum deploy.** Cabang `fitur/pilih-dunia-20261106` (dasar: `fitur/nama-pemain-permanen-20261106`, PR #39).

## Cara kerja (tanpa sistem jaringan baru)
- Menu ☰ → ubin **Bermain di Dunia** (ikon SVG) → panel **PILIH DUNIA BERMAIN**: dua kartu (ilustrasi SVG orisinal), tombol X, status koneksi + info server (Server N · pemain/kapasitas). Tanpa emoji.
- **Multiplayer** = `NW.mp.setPref("on", true)` (+ persetujuan privasi yang sama dengan panel Server) → tersambung lewat jalur resmi `eligible()` → `netTick()` → `connect()` (satu koneksi). Belum login → tombol "Masuk dengan Google"; belum setuju → penjelasan privasi dulu.
- **Singleplayer** = `NW.mp.setPref("on", false)` → `disconnect()` resmi (soket ditutup, pemain lain dikosongkan, server melepas koneksi). Dari sesi aktif **wajib konfirmasi** ("Keluar dari sesi Multiplayer?") agar tidak keluar tak sengaja.
- Pilihan tersimpan di `nusa-mp-prefs-v1` (sama dengan sakelar "Aktifkan Dunia Bersama"), bertahan setelah refresh; tidak menyambung diam-diam di Singleplayer.
- Perlindungan: jeda 3 dtk antar-perpindahan (anti ketuk beruntun/koneksi ganda); satu akun, satu dompet, satu Cloud Save — mode tidak menyentuh koin, ikan, Premium Shop, Payment Center, Rumahku.
- Kegagalan: server tak terjangkau → pesan "Belum tersambung…" + coba otomatis; server penuh/ID salah → pesan dari `NW.mp.ERR`; tetap bisa pindah ke Singleplayer.

## Batas jujur
- Singleplayer **bukan offline**: Cloud Save, toko, dan server waktu tetap butuh internet (tertulis di kartu).
- Saat di ruang rumah (ruang multiplayer privat), keluar ke Singleplayer memutus ruang itu (konfirmasi menyebut "ruang rumah").
- Lonjakan perpindahan juga dibatasi lobi server (batas laju per akun).
- Tidak diuji: Cloudflare Durable Object asli, Android fisik. Uji memakai server uji lokal dengan logika ruang yang sama.

## File
Baru: `worldmode/client.js`, `worldmode/worldmode.css`, `tests/browser/test_pilih_dunia.py`, `docs/PILIH-DUNIA.md`, `docs/pilih-dunia/*.png`. Diubah: `hud/menu.js` (+entri `worldBtn`, ubin boleh memakai SVG), `hud/menu.css`, `index.html`, `game.js` (1 baris), `firebase/scripts/build-hosting.sh`, `firebase/release-manifest.json`. **`mp/*` tidak diubah.**

## Tes
- Browser `test_pilih_dunia.py`: 43 lulus (HP 360×740, 2 pemain + server uji): menu, panel buka/tutup (X/Escape), multiplayer tersambung & saling melihat, Singleplayer memutus & menyembunyikan pemain (server melepas koneksi, B tidak melihat A), bolak-balik 5× tanpa koneksi ganda (total koneksi tetap 2), progres/dompet identik, refresh tetap Singleplayer, Cloud Save tidak berubah, tamu, persetujuan, server mati.
- Regresi: unit-mp 180, unit-cloud 71, unit-rilis 21, unit-username 13, cek-rilis OK; browser test_ui41 40, test_username 47, test_house 83.
- Catatan: `test_multiplayer.py` gagal di langkah tamu (`#gwContinue` tidak ada — alur "MAIN SEKARANG" baru) dan `test_pulihkan.py` 6l/6m kadang gagal karena reload demo kehilangan localStorage; keduanya gagal juga sebelum perubahan ini (bukan regresi).
