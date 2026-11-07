# KANDIDAT RILIS PUBLIK — Nusa Island (2026-11-07)

**Status: KANDIDAT. Belum di-merge, belum di-deploy, `main` tidak disentuh. Menunggu pemeriksaan final & persetujuan spesifik Owner.**

## Paket (satu kandidat)
| Repo | Branch kandidat | Isi |
|---|---|---|
| game `Nusa-island` | `rilis/kandidat-20261107` | #43 (Pilih Dunia, Kolam, Fashion, Nama Permanen, Pulihkan) + #46 (Podium, penghitung) + #47 (Samudra Follower, pratinjau) + #48 (gerbang server SF) + #45 (Rumahku Sosial) + koreksi alur izin berkunjung |
| backend `nusa-island-control-center` | `rilis/backend-kandidat-20261107` | #20 (leaderboardTop + Kolam/Fashion/pemulihan/nama) + #19 (Rumahku Sosial) + koreksi alur + `sf-core` terpasang; vendor = sumber game |

## Siap / belum siap
| Fitur | Status | Catatan |
|---|---|---|
| Pilih Dunia, Nama Permanen, Pulihkan Data | **SIAP** | tes lolos (pilih-dunia 43, username 47, pulihkan 63) |
| Kolam Ikan, Avatar/Fashion | **SIAP** | pond 58, avatar 35; backend `ecoPond*`/`ecoFashion*` ada di kandidat backend |
| Podium Juara + penghitung | **KODE SIAP, flag MATI** | `NUSA_LEADERBOARD` tetap "tidak"; backend `leaderboardTop` bawaan mati |
| Rumahku Sosial (minta izin berkunjung) | **KODE SIAP, flag MATI** | alur sudah dibalik & teruji; `NUSA_SOCIAL_HOME=false` sampai uji layanan nyata |
| Samudra Follower | **TERKUNCI (aman)** | pratinjau mati di produksi; ikan belum bisa dipancing; server menolak `sf_*` sampai Owner menulis `shop_config/main.sf`; **jalur klien (lempar peluang bonus, kartu & inventaris ikan SF) BELUM dibangun** |
| Koin, Top Up, QRIS, inventaris, Cloud Save | tidak diubah | unit shop 21, economy 29, cloud 71; browser ekonomi 22, tahap36 33/34 |
| Multiplayer | tidak diubah (selain kolom `hid` aditif) | unit-mp 193, mp-house 23; server42 47/49 (2 gagal sama di baseline) |

## Yang SENGAJA belum (butuh keputusan/aksi Owner)
1. **Samudra Follower**: Owner belum memutuskan harga & peluang (rekomendasi di `docs/SAMUDRA-FOLLOWER.md`, `docs/samudra-follower/rekomendasi.html`). Setelah setuju: tulis `shop_config/main.sf`, lalu butuh PR klien (peluang bonus + inventaris/jual/kartu ikan SF) — tidak dikerjakan agar tidak merusak inventaris/jual yang ada.
2. Prabowo: hanya aktif bila `sf.eventOn:true` (saklar Owner).
3. Uji layanan NYATA (Firebase/Cloudflare): **tidak bisa dari sandbox** (jaringan keluar ke `*.web.app`/`workers.dev` ditolak proxy, 403). Skrip tersedia untuk dijalankan Owner/dengan kredensial: `scripts/functions-live-test.mjs`, `scripts/firestore-live-test.mjs` (backend). Belum dijalankan oleh saya.
4. Tidak diuji di Android fisik.
5. Tes browser lama yang macet di baseline juga (tombol HUD lama): `test_tahap35`, `test_tahap3`, `test_multiplayer`, `test_rumah_akuarium`; `test_tahap36` 2d (QRIS). Bukan regresi kandidat.
6. Tes kadang acak (lulus saat diulang): `test_username` 8a/8b, `test_pilih_dunia` 6a/6b, `test_server42` 9b/10a/10b (CPU sandbox).

## Urutan deploy tersingkat (SETELAH persetujuan Owner)
1. **Backend dulu** — Worker `nusa-api` dari `rilis/backend-kandidat-20261107` (additif: fungsi baru, `sf` terkunci, fungsi lama tidak berubah; fungsi `homeInvite/homeRespond` tidak pernah dideploy).
2. **Hosting game** — `NUSA_API_BASE=https://nusa-api.<akun>.workers.dev bash firebase/scripts/build-hosting.sh produksi` dari `rilis/kandidat-20261107`, lalu `firebase deploy --only hosting` (cek-rilis sudah OK: 16 fitur).
3. (Hanya sebelum membuka Rumahku Sosial) `nusa-multiplayer` dari kandidat — menambah kolom `hid` aditif; tidak perlu untuk rilis dengan flag mati.
4. Semua flag baru tetap MATI. Membuka satu per satu terpisah, dengan persetujuan Owner: `NUSA_SOCIAL_HOME`, `NUSA_LEADERBOARD`, `shop_config/main.sf`.
Tidak ada perubahan Firestore Rules, mode toko, atau data produksi.

## Rencana rollback
- **Hosting**: `firebase hosting:rollback` (atau deploy ulang build rilis sebelumnya) — satu perintah; Cloud Save/Firestore tidak berubah oleh kandidat.
- **Worker**: `wrangler rollback` ke versi sebelumnya (kandidat additif → klien lama tetap jalan).
- **Data**: kandidat hanya menambah dokumen baru (`homeinbox/*`, `eco.sf` bila SF dibuka) — mengabaikannya aman; tidak ada migrasi skema.
- **Matikan fitur tanpa rollback**: flag (`NUSA_SOCIAL_HOME`, `NUSA_LEADERBOARD`) / hapus blok `sf` di `shop_config/main` (SF langsung terkunci lagi, ikan SF di kotak tetap tersimpan tapi tak bisa diperoleh baru).
- Titik kembali git: `main` tidak berubah; commit sebelum kandidat = ujung `integrasi/final-leaderboard-20261107` (#46).

## Bukti
Screenshot nyata: `docs/rumahku-sosial/` (7: daftar online, permintaan izin ke pemilik, jawaban diterima + MASUK, tamu di rumah, pemilik melihat tamu, keluarkan, senyap), `docs/samudra-follower/` (koleksi, 4 detail ikan, kartu tangkapan, layar kecil; laporan ekonomi 8–11).
