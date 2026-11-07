# Integrasi final game: Leaderboard + penghitung + Kolam + Fashion + Nama + Pulihkan + Pilih Dunia

Status: **uji-coba integrasi, BELUM merge/deploy.** Branch `integrasi/final-leaderboard-20261107` = jalur Worker 02 `integrasi/pra-rilis-20261107` (PR #43: #41 ⊃ #39 ⊃ #37, + #38 Kolam, + #40 Fashion) + `fitur/leaderboard-penghitung-20261107` (PR #44 ⊃ #42 Podium). Tidak menyentuh `main`.

## Konflik & penyelesaian (3 berkas)
- `economy/core.js` (`ecoCatch`): pertahankan baris `lbCount(...)` + baris `{ reward, skipped }` milik #38.
- `firebase/scripts/build-hosting.sh`: tambah `podium` pada daftar direktori.
- `firebase/functions/lib/economy-core.js`: salinan diregenerasi (`node firebase/scripts/sync-economy.js`).
`index.html`, `hud/menu.js`, `game.js` otomatis bersih (urutan muat: `username/core.js` → `podium/core.js` → `podium/client.js`, sesudah `avatar/*`).

## Hasil uji (pohon final)
`cek-rilis` OK (14 fitur, 105 aset) · unit: rilis 21, economy 29, cloud 71, username 13, podium 26, leaderboard-stats 7, pond 24, fashion 12, mp 193, shop 21, recovery-ui 9, house 76 · browser: podium 24 (termasuk kostum asli), pilih-dunia 43, avatar 35, pond 58, pulihkan 63 — semua lulus (satu kegagalan sekali pada pulihkan 3d tidak berulang; basis #43 dan pohon final sama-sama 63/63 pada 3 kali jalan: flake lama).
Kostum juara: `docs/leaderboard/6-integrasi-final-kostum-asli.png` (Juara 1 kostum kucing, Juara 2 topi kapten + baju/celana asli).

## Belum teruji
Firestore/Cloudflare asli; Android fisik; PR #45 (Rumahku Sosial, basis #43) belum digabung ke jalur ini; merge ke `main`.
