# KANDIDAT RILIS FINAL — Nusa Island (2026-11-07)

**Status: KANDIDAT. Belum merge, belum deploy, `main` tidak disentuh. Menunggu pemeriksaan final & persetujuan spesifik Owner.**

| Repo | Branch | PR |
|---|---|---|
| game | `rilis/kandidat-final-20261107` | (draft, lihat PR game final) |
| backend | `rilis/backend-kandidat-final-20261107` | nusa-island-control-center#23 |

Isi = kandidat Worker 01 (`rilis/kandidat-20261107` / backend `rilis/backend-kandidat-20261107`; #43 #46 #47 #48 #45 + koreksi izin berkunjung) **+ Gamepass Pancing Aurora** (#49 / backend #21). Dokumen kandidat Worker 01: `docs/RILIS-KANDIDAT-20261107.md` (tetap berlaku).

## Siap / belum siap
| Fitur | Status |
|---|---|
| Pilih Dunia, Nama Permanen, Pulihkan Data, Kolam Ikan, Avatar/Fashion | SIAP (tes lulus) |
| Koin, Diamond/Top Up, QRIS, inventaris, Cloud Save, multiplayer | tidak diubah; regresi lulus |
| Podium Juara | kode siap, **flag MATI** (`NUSA_LEADERBOARD`) |
| Rumahku Sosial (pemohon minta izin → pemilik TERIMA/TOLAK → pemohon MASUK) | kode siap & teruji 2 akun, **flag MATI** (`NUSA_SOCIAL_HOME=false`) |
| Samudra Follower | **TERKUNCI**: pratinjau mati, server menolak `sf_*` tanpa `shop_config/main.sf`. Belum bisa dimainkan: butuh keputusan harga/peluang Owner + PR klien (bonus peluang, inventaris/jual ikan SF). Tidak dibangun tanpa angka Owner agar tidak mengarang ekonomi |
| Gamepass Pancing Aurora (Rp20.000) | kode siap, **TERKUNCI sampai Owner** (`lockedUntilOwner`); bonus Langka +1 poin persentase hanya untuk kepemilikan NYATA, dihitung server |
| Uji layanan nyata Firebase/Cloudflare/QRIS | **BELUM**: sandbox tidak bisa menjangkau `*.web.app`/`workers.dev`. Skrip siap dijalankan Owner: `scripts/functions-live-test.mjs`, `scripts/firestore-live-test.mjs` |
| Android fisik | belum diuji |

## Tes pada pohon final
Unit: aurora 14, shop 21, economy 29, fashion 12, pond 24, rilis 21, podium 26, sf-server 20, sf OK, house-social 54, mp-house 23, cloud 71, username 13. `cek-rilis`: 17 fitur wajib lengkap. Browser: aurora (semua lulus), sf 21/21, rumahku-sosial 25/25, ekonomi, podium, avatar, pond tanpa gagal. Backend: `node --test` 169 lulus, 0 gagal, 3 dilewati; scan-secrets bersih. Kegagalan lama yang sudah ada di baseline (daftar di dokumen Worker 01) bukan regresi.

## Screenshot asli
`docs/rumahku-sosial/` (7: daftar online, permintaan izin, diterima + MASUK, tamu di rumah, keluarkan, senyap), `docs/gamepass-aurora/` (preview & Premium Shop terkunci/dimiliki, efek Rendah/Sedang/Tinggi, hasil bonus server), `docs/samudra-follower/`.

## Urutan deploy tersingkat (SETELAH persetujuan Owner)
1. Backend: Worker `nusa-api` dari `rilis/backend-kandidat-final-20261107` (additif; semua fitur baru terkunci/mati).
2. Hosting game: `NUSA_API_BASE=https://nusa-api.<akun>.workers.dev bash firebase/scripts/build-hosting.sh produksi` dari `rilis/kandidat-final-20261107`, lalu `firebase deploy --only hosting`.
3. Firebase Functions (`ecoCatch` dengan Aurora) hanya bila jalur Functions dipakai produksi: `firebase deploy --only functions`.
4. `nusa-multiplayer` hanya sebelum membuka Rumahku Sosial.
5. Setelah itu, satu per satu dan terpisah, atas keputusan Owner: buka produk Aurora (`ownerSetEnabled`), `NUSA_SOCIAL_HOME`, `NUSA_LEADERBOARD`, `shop_config/main.sf`.

## Rollback
- Hosting: `firebase hosting:rollback` (Cloud Save/Firestore tidak diubah kandidat).
- Worker: `wrangler rollback` (kandidat additif, klien lama tetap jalan). Functions: deploy ulang versi sebelumnya.
- Matikan tanpa rollback: Aurora = biarkan/kembalikan produk terkunci atau hapus opsi `aurora` dari `makeEconomyServer` (ikan hasil swap tetap valid); Rumahku/Podium = flag; SF = hapus blok `sf` di `shop_config/main`.
- Data: hanya dokumen baru (`homeinbox/*`, `eco.aur`, `eco.sf`); mengabaikannya aman, tanpa migrasi skema. Titik kembali git: `main` tidak berubah.
