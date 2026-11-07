# Tahap 3 — Leaderboard Fisik (Podium Juara)

Status: **selesai di sisi klien, menunggu server `leaderboardTop`.** Branch `fitur/leaderboard-fisik-20261107` (basis PR #41). Belum di-merge / deploy.

## Yang dibuat
- Podium isometrik 2.5D di Muara Kampung (utara Pasar Ikan, dekat papan Misi): 3 balok bertingkat — Juara 1 tengah & tertinggi (emas, mahkota, kilau), Juara 2 kanan (perak), Juara 3 kiri (perunggu); tiang bendera sebagai monumen.
- Karakter pemain berdiri di tiap balok; di bawahnya papan nama: medali peringkat, **nama permanen**, **gelar**.
- Tanpa data server: siluet samar + "Belum ada Juara N". Tidak ada karakter/nama palsu.
- Dekat podium → tombol "Podium Juara"; menekannya membuka panel peringkat lengkap (tab Tangkapan/Koleksi, top-10, peringkatku, Muat Ulang dengan jeda 15 dtk, tombol X).
- Gelar: `NusaPodiumCore.TITLES` (default) atau `title` dari server — ubah dari data, tanpa kode.
- Ringan untuk Android: papan nama di-cache sebagai canvas; tanpa partikel berat (3 titik kilau); data diambil malas (hanya saat panel dibuka atau pemain di dekat podium), cache 60 dtk.

## Berkas penting
`podium/core.js` (kontrak + validasi, UMD), `podium/client.js` (gambar, panel, fetch), `podium/podium.css`; sambungan kecil: `world/areas/muara.js` (interact + drawOver), `game.js` (hook), `index.html`, `build-hosting.sh`, `release-manifest.json`, `cloud/adapter-demo.js` (rute uji `window.__demoLeaderboard`, nonaktif bila tidak di-set). Kontrak: `docs/LEADERBOARD-KONTRAK.md`.

## Keamanan / tidak disentuh
Tidak mengubah multiplayer, Cloud Save, ekonomi, rules Firestore, atau server produksi. Modul hanya membaca. Peringkat tidak pernah dari data browser.

## Tes
- `node tests/unit-podium.js` → 26 lulus; `tests/browser/test_podium.py` → 20/20 (placeholder, live, tombol interaksi, data invalid ditolak, tamu, 360×740, tak ada perubahan uang/statistik).
- Regresi: `cek-rilis` OK (14 fitur), `unit-rilis` 21, `unit-username` 13, `unit-mp` 180, `test_pilih_dunia` 43, `test_kedai_hidup` 16, `test_ekonomi` 22 — semua lulus.
- `test_tahap36` 2d gagal: mengharapkan kotak QRIS kosong padahal `shop/qris.png` sudah ada (sudah gagal sebelum fitur ini; tak terkait).
- Screenshot: `docs/leaderboard/`.

## Batas jujur
Server peringkat belum ada → belum teruji dengan data nyata; Android fisik belum diuji (hanya Chromium 360×740).
