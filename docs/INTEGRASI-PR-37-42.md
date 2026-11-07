# Rencana integrasi PR game #37–#42 (+ penghitung leaderboard) dan backend #15–#17

Status: **rencana, belum ada merge/deploy.** Semua keputusan merge/deploy ada pada Owner. Peta konflik diperoleh dari penggabungan percobaan di worktree sementara (tidak di-push, tidak menyentuh `main`).

## Struktur cabang (fakta)
- `rilis-login-cepat-owner-20261101` ⊂ `portal-pemulihan-20261103` ⊂ #37 ⊂ #39 ⊂ #41 ⊂ #42 ⊂ **PR penghitung** (rantai Worker 01).
- #38 (Kolam Ikan) dan #40 (Avatar/Fashion) langsung di atas `rilis-login-cepat-owner-20261101` (rantai Worker 02), masing-masing 1 dan 4 commit di depan.
- Backend: #15 (nama) ⊂ #16 (kolam+fashion, Worker 02) ⊂ #17 (leaderboard).

## Urutan yang disarankan
1. **Game rantai Worker 01 (satu per satu, retarget basis setelah tiap merge):** #37 → #39 → #41 → #42 → PR penghitung. Tiap PR hanya menambah; tidak saling konflik karena sudah berantai.
2. **Game Worker 02:** #38 lalu #40 (atau sebaliknya) setelah rantai di atas, atau sebelum — hasil konflik sama, hanya sisi yang menyelesaikan berbeda. Disarankan Worker 02 yang rebase/merge kedua PR itu ke cabang gabungan karena #38×#40 sendiri sudah saling konflik.
3. **Sinkron vendor backend:** setelah game ter-merge, jalankan `node scripts/sync-economy.mjs <repo game>` di control-center; vendor harus sama dengan sumber (blok `lbCount` identik, kolam & fashion tetap).
4. **Backend:** #15 → #16 → #17 (berantai). Deploy Worker lama dulu dengan `NUSA_LEADERBOARD="tidak"`; aktivasi leaderboard terpisah, belum diputuskan.
5. **Hosting game** baru di-deploy setelah semua klien & backend di atas lolos cek-rilis (`firebase/scripts/cek-rilis.js`).

## Peta konflik (hasil penggabungan percobaan)
| Penggabungan | Konflik | Penyelesaian |
|---|---|---|
| rantai (#42/penghitung) + **#38** | `index.html` (daftar `<link>`/`<script>`), `firebase/scripts/build-hosting.sh`, `firebase/scripts/sync-economy.js`, **`economy/core.js` 1 hunk** (baris `t.set`/`return` di `ecoCatch`), `firebase/functions/lib/economy-core.js` (salinan) | gabungkan (union) daftar berkas & direktori; di `ecoCatch` pertahankan baris `lbCount(...)` DAN baris `{ reward, skipped }` milik #38; regenerasi salinan dengan `node firebase/scripts/sync-economy.js`. Hasil diuji: `cek-rilis` OK (100 aset), `unit-economy` 29, `unit-pond` 24, `unit-leaderboard-stats`, `unit-podium`, `unit-username` lulus. |
| rantai + **#40** | `index.html`, `build-hosting.sh`, `sync-economy.js`, `hud/menu.js` (daftar tombol menu: sisipkan `["avatarBtn", "Edit Avatar & Fashion"]`) | gabungkan daftar. **`economy/core.js` otomatis bersih.** Diuji: podium menampilkan kostum asli top-3 (test_podium F1–F4 lulus). |
| **#38 × #40** (milik Worker 02) | `economy/core.js`, `firebase/functions/index.js`, `firebase/functions/lib/economy-core.js`, `build-hosting.sh`, `rilis.sh`, `sync-economy.js`, `index.html` | sudah diselesaikan 3-arah di backend #16 (vendor); sumber game perlu diselaraskan oleh Worker 02. |
| rantai ⟷ main | tidak diuji ke `main` (tidak disentuh) | — |

Risiko residual: daftar berkas/`<script>` urutan muat (podium/core.js harus setelah `username/core.js`); `release-manifest.json` perlu fitur `kolam-ikan`/`avatar-fashion` ditambahkan Worker 02 bila `cek-rilis` mewajibkan (belum ada di #38/#40 saat ini — tidak konflik, tapi tidak tercakup cek).

## Kompatibilitas yang dijaga
- **#38 Kolam:** ikan yang sudah di kolam dilewati `ecoCatch` dan **tidak dihitung** leaderboard.
- **#40 Avatar:** podium memakai `NW.avatarDraw.styleFor(code, base)`; kode outfit dari server (`fash.code`, item milik pemain). Tanpa #40, podium memakai gaya bawaan (diuji tanpa error).
- **#16 backend:** `fash.code`/`fash.own` dibaca apa adanya; tidak ada perubahan pada kolam/fashion.
- Username (identitas publik, #39) dan avatar (milik UID) tetap terpisah: papan memakai nama permanen + outfit.

## Tes yang dijalankan (terarah)
Game: `unit-leaderboard-stats` (regresi identik vs inti lama), `unit-economy`, `unit-cloud`, `unit-rilis`, `cek-rilis`, `unit-podium`, `test_podium` (24 dengan #40), `test_pilih_dunia`. Backend: `npm test` 150 (147 lulus, 3 dilewati, 0 gagal), scan rahasia bersih.
## Belum teruji
Firestore/Cloudflare asli; perangkat Android fisik; penggabungan #38×#40 pada sumber game; merge ke `main`.
