# Paket Rilis Final Nusa Island (kandidat 2026-11-07)

Status: **kandidat, BELUM di-merge / di-deploy.** Semua fitur baru **MATI bawaan**; dibuka Owner lewat Nusa Control Center tanpa deploy ulang.

## Isi paket
- Game: `rilis/paket-final-20261107` (219d7d9, dari 3cc759d). Backend: `rilis/backend-paket-final-20261107` (8992c70, dari 44eebd3 + panel SF #26 + Saklar Fitur).
- Samudra Follower: panel Owner (harga/peluang/batas/toggle, Prabowo event MATI), roll di server.
- Podium Juara: papan peringkat server+klien, MATI sampai saklar Owner.
- Pancing Aurora Rp20.000: produk di Premium Shop, kunci Owner, gamepass permanen, +1 poin persentase grup Langka (bukan Megalodon).
- Rumahku Sosial: fungsi server ditutup (404) sampai saklar `socialHome` dibuka; klien membaca `gameFlags`.

## Urutan deploy (workflow `Deploy Kandidat Terpadu`, setelah Owner setuju)
1. nusa-api (backend) → 2. Firebase Hosting (game) → 3. nusa-multiplayer **hanya** jika input `multiplayer=ya`.
Cek sebelum: shell, vendor identik, `cek-rilis`, tes backend, scan rahasia, flag statis MATI. Cek sesudah: `/api/health`, flag statis MATI di situs live.

## Aktivasi (Owner, tanpa deploy)
- Menu **Saklar Fitur**: leaderboard, Rumahku Sosial (butuh konfirmasi `mpUpdated`: nusa-multiplayer sudah ter-deploy).
- Menu **Samudra Follower**: nilai awal usulan menunggu persetujuan Owner.
- **Premium Shop**: aktifkan Aurora (butuh `NUSA_SHOP_LIVE` + `ENABLE_SHOP_PRODUCTION`).

## Rollback
Jalankan ulang workflow dengan SHA lama (game 3cc759d, backend 44eebd3). Fitur baru bisa juga dimatikan lewat Saklar Fitur/panel tanpa deploy.

## Bukti tes
Backend 175 tes (172 lulus, 0 gagal, 3 dilewati); e2e paket-final 14/14; game: Rumahku Sosial 25, SF play 24, Aurora 21, Podium 24, SF 21, ekonomi 22 lulus; cek-rilis OK. Screenshot: `docs/paket-final/` (backend), `docs/rumahku-sosial/` (game).

## Penghalang jujur
- Belum diuji pada Firebase/Cloudflare/login Google asli dan perangkat Android fisik (hanya emulasi/mock).
- Sandbox tak bisa menjangkau api.cloudflare.com; akar galat 9106 hanya disimpulkan.
- Server memercayai laporan klien "ikan normal didapat" (risiko residual SF).
- Nilai SF & event Prabowo butuh persetujuan Owner; Aurora butuh variabel produksi Shop.
- Tes lama `browser.cjs` 1 FAIL & `test_streak.py` gagal sudah ada sebelum paket ini.
