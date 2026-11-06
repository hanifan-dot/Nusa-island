# Nama Pemain Permanen (TUGAS 2.5) — catatan hasil

Status: **selesai dikode & diuji; menunggu review Owner. Belum merge, belum deploy.**
Game: cabang `fitur/nama-pemain-permanen-20261106` (dasar: `fitur/pulihkan-data-menu-20261106`, PR #37). Worker: repo `nusa-island-control-center`, cabang `fitur/nama-pemain-permanen-20261106` (dasar: `fitur/kunjungi-rumah-teman`).

## Cara kerja
- Setelah login Google selesai & data akun diperiksa (tidak ada dialog pilihan data terbuka), game menanyakan `nameGet`. Belum punya nama → modal **"SELAMAT DATANG DI NUSA ISLAND!"** (tidak bisa ditutup): kolom *Masukkan Nama Pemain*, 🔍 *Periksa Nama*, ✅ *Konfirmasi Nama*, pesan tersedia/tidak. Konfirmasi → langkah "Pakai nama ini?" (permanen) → `nameClaim`.
- Aturan (satu inti `username/core.js`, dipakai game & Worker): 3–16 karakter, A–Z 0–9 `_`, tanpa spasi, huruf besar/kecil sama, minimal 1 huruf; nama staf/sistem (admin, owner, system, staff, mod, gm, nusa, "official", dst., termasuk samaran `0wner`, `4dmin`, `Admin_Nusa`) dan kata tidak pantas (Indonesia+Inggris, termasuk samaran/huruf berulang) diblokir.
- Keunikan global: dokumen `usernames/<huruf-kecil>` {uid,nama,waktu} + `users/<uid>/profile/username`, ditulis dalam **satu transaksi** (dua pemain berebut → tepat satu menang). Tanpa data pribadi.
- Nama dipakai: `Nama sudah dipakai` → pesan persis dari spesifikasi + 3 saran bernomor (Hanifan → Hanifan28) yang HANYA ditawarkan; pemain memilih sendiri.
- Permanen: satu akun satu kali. Klaim kedua/penggantian ditolak server (`failed-precondition`); panel profil menampilkan "🔒 Nama permanen" tanpa kolom ganti nama. Nama resmi dipakai di nama karakter (label), profil, profil multiplayer, dan salinan publik rumah.
- Server (Worker) penentu tunggal. Penanda `profile.uname` di simpanan lokal tidak dipercaya: bila server bilang belum ada nama, penanda dibersihkan dan modal tampil.
- Server lama tanpa fungsi nama / offline → **pemain tidak dikunci** (modal tidak muncul, dicoba lagi tiap ±45 dtk).

## Batas & catatan
- Tamu (mode lokal) tidak punya username resmi (tidak ada akun); Leaderboard nanti hanya untuk akun.
- Pemain lama juga memilih nama saat login berikutnya.
- Panjang nama 14→16 di `world/look.js`, `house/core.js` (+vendor Worker), `mp/proto.js` (tes diperbarui). Durable Object multiplayer yang sudah live masih memotong 14 sampai di-redeploy; nama di multiplayer dikirim klien (tampilan saja) — Leaderboard harus membaca `usernames`/profil dari server.
- Pengubahan nama oleh Owner (mis. nama menyinggung) belum ada UI; perlu tugas terpisah di Dashboard.
- Aturan Firestore tidak berubah (`usernames/*`, `users/*/profile/*` tertutup oleh aturan tolak-semua).
- Mode demo: fitur aktif hanya dengan `window.__demoAskName=true` (agar tes lama tidak terhalang modal).
- Belum diuji: Firestore/Cloudflare sungguhan, HP Android fisik.

## File
Game baru: `username/core.js`, `username/client.js`, `username/username.css`, `tests/unit-username.js`, `tests/browser/test_username.py`, `firebase/functions/lib/name-core.js` (salinan). Diubah: `index.html`, `game.js`, `world/look.js`, `cloud/ui.js`, `cloud/adapter-demo.js`, `house/core.js`, `mp/proto.js`, `tests/unit-mp.js`, manifest rilis, build-hosting, sync-economy.
Worker: `server/vendor/name-core.cjs`, `server/vendor/house-core.cjs`, `worker/index.js` (nameGet/nameCheck/nameClaim), `scripts/sync-economy.mjs`, `test/worker.test.js`.

## Tes
- Game: unit-username 13, browser test_username 47 (HP 360×740). Regresi: unit-mp 180, unit-house 76, unit-mp-house 23, unit-cloud 71, unit-rilis 21, unit-recovery-ui 9, cek-rilis OK, browser test_house 83, test_ui41 40, test_pulihkan 63.
- Worker: `node --test test/*.test.js` 126 lulus (termasuk uji nama via Firestore tiruan, termasuk balapan).
- Catatan: uji demo reload kadang kehilangan tulisan localStorage terakhir (terjadi juga tanpa fitur ini; 3/10 pada login+reload tanpa fitur nama) — bukan regresi.
