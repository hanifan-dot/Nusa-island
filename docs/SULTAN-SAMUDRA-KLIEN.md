# Sultan Samudra — Mercusuar Emas (klien)
Simbol penghargaan koleksi (+10 Poin Koleksi per item Premium Shop permanen unik, dihitung SERVER). **Tidak memberi kekuatan, bonus memancing, atau keuntungan permainan.** Terpisah dari Podium Juara/Podium Pemancing.

## Yang ditambahkan
- `sultan/core.js` — penyaring respons murni: hanya `{rank,name,points,title}` (maks 3). Bidang lain dibuang; nama menyerupai email/uid/token/id pembayaran/nominal → "Sultan Anonim"; gelar hanya 4 gelar resmi (10 Pendukung Pulau, 30 Saudagar Laut, 50 Sultan Samudra, 100 Legenda Samudra).
- `sultan/client.js` — objek fisik 2.5D (pulau karang, 3 tabung batu bernomor, menara merah-putih, lentera, sinar lembut) di **pantai utara Muara, pusat (21.6, 8.1)**; titik interaksi `sultan` ("Mercusuar Sultan"); panel Top 3 + Poinmu + pilihan Sultan Anonim.
- `sultan/sultan.css`, wiring: `index.html` (3 tag), `game.js` (1 baris `NW.sultan.hook()`), `world/areas/muara.js` (1 baris interaksi), `firebase/release-manifest.json` + `firebase/scripts/build-hosting.sh` (agar folder ikut rilis), `cloud/adapter-demo.js` (jawaban uji; tanpa `window.__demoSultan` = "inactive").

## Perilaku
- Objek, titik interaksi, solid, dan tombol **hanya dipasang bila server menjawab aktif** (`status:"ok"`). `inactive`/galat/belum login → peta Muara persis seperti semula (tanaman yang dipindah dikembalikan).
- Tanpa polling: satu pemeriksaan saat masuk akun (dan saat status akun berubah); panel memakai data itu; muat-ulang paling cepat tiap 5 menit (server juga cache 5 menit).
- Fungsi server: `sultanTop`, `sultanMe`, `sultanPrefs {anon:boolean}`. Tidak ada panggilan lain; tidak menyentuh Premium Shop, harga, pembayaran, QRIS, Cloud Save, SF2, multiplayer, Podium Juara, atau data pemain.

## Uji
`node tests/unit-sultan.js` · `python3 tests/browser/test_sultan.py` (screenshot di `/tmp/nusa-sultan/`).
