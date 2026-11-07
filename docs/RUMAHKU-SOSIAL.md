# Rumahku Sosial (Tahap 4) — undangan kunjungan

Dibangun DI ATAS sistem Kunjungi Rumah Teman yang sudah ada (tidak dibangun ulang). Status: **MATI** (`window.NUSA_SOCIAL_HOME = false` di cloud/config.js) sampai backend Tahap 4 di-deploy atas izin Owner.

## Fitur
1. **Daftar online** (👥 di ☰ menu): pemain di ruang dunia yang sama, dengan avatar mini (kostum asli dari server MP), nama (nama permanen dari profil) dan ID pendek.
2. **Undangan**: tombol *Undang* → server → kotak masuk tujuan. Notifikasi **TERIMA / TOLAK** muncul dalam ≤20 dtk (polling 1 baca).
3. **Masuk & chat**: TERIMA memberi izin masuk sementara (2 jam) ke rumah pengundang, termasuk rumah privat; lalu `homeVisit` + ruang rumah multiplayer + chat yang sudah ada.
4. **Senyap, blokir, cooldown, keluarkan**: senyap = undangan tidak sampai (pengundang tak diberi tahu); blokir = tidak bisa mengundang/masuk, izin & tamu dicabut; cooldown 60 dtk per pengundang→tujuan, 5 menit setelah ditolak; ≤8 undangan/menit/akun; Keluarkan (yang lama) kini juga mencabut izin tamu.
5. **Server yang memutuskan** (house/core.js: `homeInvite`, `homeInbox`, `homeRespond`, `homePrefs`; `denial()` memeriksa ban > blokir > izin/undangan). Klien hanya mengirim ID publik (hash satu arah dari UID).

## Perubahan di luar house/
- `mp/room-core.js`: baris pemain di dunia kini membawa ID publik di kolom tambahan (klien lama mengabaikan); snapshot menyimpan `h`.
- `cf-multiplayer/src/index.js`: Muara mengisi `hid` dari header uid terverifikasi (butuh deploy Worker multiplayer; tanpa itu daftar online kosong dan fitur tak bisa dipakai).

## Keamanan data
Tidak ada jalur ke koin, kolam, inventaris, atau Cloud Save: fungsi baru hanya menulis `homepub/{pid}` milik pemanggil, kotak masuk tujuan (`homeinbox/{pid}`), dan `guests` pengundang saat TERIMA (divalidasi oleh id undangan yang ada di kotak masuk penerima). Diuji: pihak ketiga tidak bisa menjawab undangan orang lain; id sekali pakai; kedaluwarsa 5 menit.

## Tes
`node tests/unit-house-social.js` (45), `python tests/browser/test_rumahku_sosial.py` (22, tangkapan layar di docs/rumahku-sosial/), regresi `tests/unit-mp.js`, `unit-house.js`, `browser/test_house.py`.

## Syarat aktif (Owner)
Deploy backend (nusa-api PLAYER_FN + core) → deploy nusa-multiplayer → ubah flag → hosting. Tidak diaktifkan di sini. Backend belum terverifikasi di Firestore/Cloudflare asli.


---
## KOREKSI ALUR (kandidat rilis 2026-11-07)
Alur awal terbalik. **Alur benar:** Budi memilih Rudi dari daftar online → tombol "Minta izin berkunjung" → Rudi (pemilik) melihat "Budi ingin berkunjung ke Rumahku milikmu" → TERIMA/TOLAK → bila TERIMA, Budi mendapat jawaban + tombol MASUK (tidak ada teleport otomatis; Rudi tetap di rumahnya, tetap pemilik, bisa kick/blokir/senyap).
API: `homeVisitRequest`, `homeInbox` (`requests` + `answers`), `homeVisitRespond`, `homePrefs` (menggantikan `homeInvite`/`homeRespond`). Tes: `tests/unit-house-social.js` (54), `tests/browser/test_rumahku_sosial.py` (25, dua akun Budi→Rudi: request, accept, masuk, decline, kick, senyap, blokir), screenshot `docs/rumahku-sosial/`.
Nama permanen vs `profile.name`: hanya andalkan `profile.name` bila `profile.uname` ada; selain itu nama lokal bebas (server memakai nama dari Cloud Save pemilik, bukan dari klien).
Flag `NUSA_SOCIAL_HOME` tetap `false`.
