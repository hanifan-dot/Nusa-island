# KANDIDAT RILIS AKHIR — Nusa Island (2026-11-07)

**Status: KANDIDAT. Belum merge, belum deploy, `main` tidak disentuh. Menunggu pemeriksaan & persetujuan spesifik Owner.**

| Repo | Branch | PR |
|---|---|---|
| game | `rilis/kandidat-akhir-20261107` | lihat PR game akhir |
| backend | `rilis/backend-kandidat-akhir-20261107` | lihat PR backend akhir |

Isi = kandidat final (#51 / backend #23: kandidat Worker 01 + Gamepass Aurora) **+ Samudra Follower tuntas (#52 / backend #24)**. Konflik hanya di `economy/core.js`, `economy/client.js` dan vendor `economy-core` (diselesaikan: Aurora dan SF berjalan berdampingan; vendor disinkron dari sumber).

## Samudra Follower — keamanan peluang (sesuai instruksi Owner)
- **Undian dilakukan SERVER** (`economy/core.js` → `sfRoll`, acak `crypto.getRandomValues`; bila crypto tidak ada → gagal-tertutup, tidak pernah mengundi). Klien tidak melempar apa pun dan **tidak bisa mengirim ikan `sf_*`** (server menjawab "Ikan tidak dikenal").
- Server memvalidasi tangkapan biasa dulu (spesies, berat, UID, laju) baru menjalankan bonus. **Satu ikan biasa sah = satu kesempatan**; satu lemparan = paling banyak satu ikan SF.
- Idempoten: `opId` sama → hasil sama (tidak ada ikan kedua). UID ikan biasa yang sudah diundi tidak diundi ulang (daftar 60 terakhir; anti jual-lalu-kirim-ulang).
- Batas harian per ikan (dan total ≤4/hari) menurut jam server (UTC-hari). Transaksi gagal (berat palsu, terlalu cepat, kotak penuh) tidak menyisakan ikan/koin.
- Berat, UID ikan SF, dan harga/kg (dikunci saat tangkap, `sp`) semuanya dibuat server. Jual: tanpa pengali harian; jual dua kali tidak membayar lagi.
- Tidak mengubah peluang ikan lama / Megalodon / Aurora (SF dilempar terpisah setelah pendaratan, di luar tabel peluang lama). Prabowo hanya bila `sf.eventOn=true` oleh Owner.
- **Batas keamanan yang tersisa (jujur):** server memercayai laporan "ikan biasa X mendarat" dari klien (sama seperti seluruh ekonomi memancing lama). Penyerang yang memalsukan laporan hanya dibatasi oleh laju tangkapan (jeda 1,5 dtk, 400/jam), UID unik, kotak ≤400 dan batas harian SF; ia tidak bisa memaksa hasil undian, berat, atau harga SF. Ini **bukan** anti-cheat sempurna.

## Tes pada pohon akhir
- Unit game: semua `tests/unit-*.js` lulus (sf-server 21, aurora 14, economy 29, shop 21, cloud 71, house 150, house-social 54, mp 193, podium 26, pond 24, username 13, rilis 21, dst.). `cek-rilis`: 17 fitur wajib, 112 aset.
- Backend `npm test`: **169 lulus, 0 gagal** (3 dilewati sejak awal).
- Browser (Playwright Chromium): sf_play 24/24, sf 21/21, aurora 21/21, ekonomi 22/22, kolam 58/58, avatar 35/35, podium 24/24, rumah 83/83, Rumahku Sosial 25/25, pulihkan 63/63, event 58/58, worker_client 7/7.
- `test_streak.py` gagal (menunggu `#gwContinue`) — **gagal identik di kandidat final #51 sebelum perubahan ini** (pra-ada; tes usang terhadap layar masuk tamu), bukan regresi.
- Semua tes layanan memakai **server tiruan di dalam halaman / mock** — BUKAN Firebase/Cloudflare nyata dan bukan produksi.

## Bukti screenshot (simulasi pengujian, BUKAN produksi)
`docs/samudra-follower/`: `14-koleksi-tertangkap` (4 ikan di Koleksi, Tempe tertangkap), `12-kartu-tangkapan-asli` (ikan diperoleh lewat undian server dalam alur uji + kredit @mlfs_05), `13-coolbox-ikan-tempe` (inventaris, lencana MYTHICAL, harga terkunci server), `15-kartu-prabowo-event` (Prabowo hanya saat event Owner dinyalakan, kredit @akhmadraffa123), `16-setelah-jual-validasi-server` (saldo setelah jual; harga dibayar server). Aurora: `docs/gamepass-aurora/`. Rumahku Sosial: `docs/rumahku-sosial/`.

## Siap / terkunci
| Fitur | Status |
|---|---|
| Pilih Dunia, Nama Permanen, Pulihkan Data, Kolam, Avatar/Fashion, Cloud Save, Coin/Top Up/QRIS, multiplayer | tidak diubah; regresi lulus |
| Samudra Follower (4 ikan: memancing, inventaris, koleksi, kartu, jual) | **kode tuntas, TERKUNCI** sampai Owner menulis `shop_config/main.sf` (tabel usulan di `docs/SAMUDRA-FOLLOWER.md`) |
| Gamepass Aurora | kode siap, **terkunci** sampai Owner |
| Rumahku Sosial | kode siap, **flag MATI** (`NUSA_SOCIAL_HOME=false`) |
| Podium Juara | kode siap, **flag MATI** (`NUSA_LEADERBOARD`) |
| Uji Firebase/Cloudflare nyata, Android fisik | **BELUM** (sandbox tanpa jaringan ke layanan; perlu akun uji + izin Owner) |

## Urutan deploy tersingkat (SETELAH izin Owner)
1. Worker `nusa-api` dari `rilis/backend-kandidat-akhir-20261107` (`wrangler deploy`). Fitur baru terkunci → aman.
2. Hosting: `NUSA_API_BASE=https://nusa-api.<akun>.workers.dev bash firebase/scripts/build-hosting.sh produksi` dari `rilis/kandidat-akhir-20261107`, lalu `firebase deploy --only hosting`.
3. `firebase deploy --only functions` hanya bila jalur Functions dipakai produksi (ecoCatch/ecoSfInfo/Aurora).
4. `nusa-multiplayer` hanya sebelum membuka Rumahku Sosial.
5. Aktivasi satu per satu, keputusan Owner: `shop_config/main.sf` (SF), produk Aurora, `NUSA_SOCIAL_HOME`, `NUSA_LEADERBOARD`.

## Pemeriksaan keamanan konfigurasi (sebelum deploy)
- `cek-rilis.js`: 17 fitur wajib, 112 aset. Flag `NUSA_SF_PREVIEW=false`, `NUSA_SOCIAL_HOME=false`, `NUSA_LEADERBOARD="tidak"`.
- Tanpa `main.sf`: `ecoSfInfo` → `{on:false}`; tak ada ikan SF yang bisa muncul.
- Tidak ada kunci/rahasia di repo; `shop_config/main` ditulis hanya oleh Owner (aturan Firestore tidak diubah).

## Rollback
- Hosting: `firebase hosting:rollback`. Worker: `wrangler rollback`. Functions: deploy ulang versi sebelumnya.
- Matikan tanpa rollback: hapus blok `sf` di `shop_config/main` (SF mati seketika; ikan SF yang sudah dimiliki tetap bisa dijual di harga terkunci). Aurora/Rumahku/Podium: flag/produk.
- Data: hanya field baru (`eco.sf`, `eco.aur`, `homeinbox/*`); mengabaikannya aman, tanpa migrasi. Git: `main` tidak berubah.

## Rencana uji setelah deploy (akun uji, bukan pemain nyata)
1. Login Google → progres tetap. 2. Pancing ikan biasa → koin/kotak normal. 3. Owner aktifkan `main.sf` untuk 1 ikan dgn peluang uji di akun uji → tangkap, cek kartu + kredit, jual, saldo naik sekali. 4. Panggil `ecoCatch` dengan `sf_tempe` dari konsol → harus ditolak. 5. Kunjungan Rumahku (bila flag dibuka), Payment Center, Cloud Save. 6. Android: buka via Chrome HP, ulangi 2–3.

## Penghalang yang benar-benar tersisa
1. Persetujuan Owner atas tabel SF + penulisan `shop_config/main.sf` + sakelar event Prabowo (tidak ada UI Owner).
2. Uji Firebase/Cloudflare nyata dan Android fisik (butuh akun uji + izin Owner).
3. Keputusan Owner: buka Aurora, Rumahku Sosial, Podium.
4. Residu keamanan di atas (server percaya laporan pendaratan klien).
