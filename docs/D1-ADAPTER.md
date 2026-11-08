# Adapter D1 (game) — mode OFF bawaan

Kontrak: backend PR #46 (`docs/D1-FONDASI.md`, commit 60bf828, Draft, belum deploy/bind).

- `d1/core.js` (murni) + `d1/client.js` (`NW.d1`). Pengait: `index.html` (2 script), `cloud/config.js` (`NUSA_D1_MODE` = "off"), `build-hosting.sh` (`d1`), `podium/client.js` (3 panggilan dari aksi UI), `sf2/sf2.js` (1 baris). Cabut = hapus `d1/` + baris tersebut.
- **off** (bawaan; nilai apa pun selain "shadow", termasuk "on", = off): nol request, nol `getToken`.
- **shadow**: hanya GET (Podium, SF, Cloud Save meta) untuk dibandingkan di memori; UI/ekonomi/save lama tidak berubah. `PUT /save` terkunci (nol request). Mode "on"/cutover tidak ada.
- Identitas = Firebase ID token (Bearer). Klien tak pernah mengirim uid/skor/rank/Pity/koin/role; isi PUT di-whitelist `{baseRev,opId,deviceId,data,sha256}`; `confirmOverwrite` tidak pernah dikirim; `sf.refs` dibuang & tak diminta.
- Podium: `GET /podium/top?board=catch|species`, cache ≥60 dtk, hanya saat Podium dibuka/ganti tab/Muat Ulang; interval 20 dtk lama tidak memicu D1. Baris dibersihkan ke `{rank,name,score,outfit}`.
- SF: `GET /sf` saat login + setelah refresh SF lama; cache ≥5 mnt; tanpa polling.
- Cloud Save (disiapkan): GET dengan ETag/`If-None-Match` + 304; PUT hanya jika sha256 berubah & ≥5 mnt sejak PUT terakhir; 409 disimpan sebagai konflik, tidak diulang/ditimpa; 429/503 = `Retry-After` + backoff 2 dtk×2ⁿ (maks 300 dtk, jitter 30%); 404 = server D1 off → berhenti 30 mnt; offline tidak melempar dan tak menyentuh data lokal.

## Perkiraan request per pemain per jam (shadow, model)
Login 2 (sekali/sesi) + SF ≤12 (cache 5 mnt, hanya bila refresh SF lama terjadi) + Podium ≤1/menit hanya saat dibuka (biasa ≤6). Casual ≈ 4–10, aktif ≈ 15–25. Mode off: 0.

## Belum teruji
Worker/D1 sungguhan (belum dibind), token Firebase asli, kuota Cloudflare, Android fisik. Uji memakai Worker tiruan (route Playwright).
