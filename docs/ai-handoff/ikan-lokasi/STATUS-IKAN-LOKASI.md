# Ide 07B — Ikan lokasi baru (55 ikan) · STATUS

Cabang: game `fitur/ikan-lokasi-ide07-20261114` (bertingkat di atas NusaPhone), backend `fitur/ikan-lokasi-ide07-backend-20261114`.
**Draft. Belum merge/deploy. Semua flag MATI bawaan.** Bukti uji = emulasi Chromium + Worker asli + Firestore TIRUAN, bukan produksi.

## Isi
- 5 lokasi reguler DIBACA dari `LOCATIONS` (Muara, Toba, Selat, Raja Ampat, Banda). Samudra Follower, kolam Rumahku, ikan event & monster dunia **tidak disentuh**.
- Tiap lokasi: 11 ikan baru = 3 Biasa, 3 Langka, 2 Epik, 1 Legenda, 1 **Mitos** (tier tampilan di atas Legenda) + 1 **SUPER RARE**. Total 55 (`data.js`, ditandai `x:true`). Sumber data & generator: `scripts/ikan-lokasi-sumber.js`; tabel lengkap: `docs/IKAN-LOKASI-TABEL.md` (`node scripts/ikan-lokasi-tabel.js`).
- Visual berbeda per ikan (warna, perut, siluet, sirip, ciri) lewat `drawFish`; SUPER RARE punya aura emas ringan (satu gradien radial) + kilau berputar saat dipamerkan.

## Cara kerja (jujur)
| Hal | Perilaku |
|---|---|
| 10 ikan reguler baru | **Diundi KLIEN** seperti ikan lama (kelompok rarity berbobot, lalu ikan; Mitos berbobot `pw` 0,3). Server hanya memeriksa id/berat masuk akal, batas laju, idempotensi (`opId`). Ini batas yang sama dengan seluruh ikan lama — bukan klaim baru. |
| SUPER RARE | **Diundi SERVER** (`economy/ikanloc-core.js`) pada tangkapan sah di lokasinya: peluang 1 : N per tangkapan (muara 4.000, toba 5.000, selat 6.500, ampat 8.000, banda 10.000), maks 1 per lokasi per hari server, RNG aman. Klien yang melapor ikan super **ditolak**. Ikan dibuat dengan uid server `sx…`, dikunci di Coolbox, dipulihkan dari `ecoState.sx` bila balasan hilang/refresh. |
| Flag server | `shop_config/main.ikanLokasi===true` (bawaan MATI) → tanpa itu server tidak pernah membuat SUPER RARE. |
| Flag klien | `window.NUSA_IKAN_LOKASI` (bawaan `false`) → ikan baru tidak masuk lemparan, Koleksi, info peta. |
| Jual / Tas / Kolam / Dapur / Cloud Save | Generik per rarity & id (tak ada daftar ikan terkode): ikan baru otomatis lolos; SUPER RARE bisa dijual lewat server (≤ ~14.000 < Megalodon 16.000). |
| Pamer Ikan | **Tanpa protokol baru.** Pesan `f` yang ada `{i,w,v}`; pemain lain menggambar dari data ikan. Label sekarang memuat kelangkaan + varian. Berhenti saat dilepas, pindah area, naik kapal, **masuk/berkunjung Rumahku (perbaikan baru: `world/home.js`)**, putus koneksi (server). |

## Perubahan penting lain
- `economy/core.js`: opsi `ikanloc`; `ecoCatch` menolak `f.sup`; `view().sx`.
- `economy/make-tables.js`/`tables.js`: 103 ikan, `sup` ikut tabel server. `make-aurora.js` melewati ikan `sup` (Aurora tidak bisa menukar ke super).
- Backend: `server/vendor/ikanloc-core.cjs`, `server/gamedata.json` (103 ikan), `worker/index.js` memasang `ikanloc`.

## Uji
`tests/unit-ikanloc.js` 36 (data 11/lokasi, 1 super, ID unik, habitat, distribusi = 1, simulasi 1 juta lemparan per lokasi, super 2 juta undian, harian, idempoten, kotak penuh, jual). `tests/browser/test_ikan_lokasi.py` (dex, alur server, super, pamer dua pemain + galeri). Backend: `test/ikan-lokasi.test.js`.

## Butuh keputusan Owner
1. Peluang SUPER RARE (`ONE_IN`) dan batas harian.
2. Harga dasar 55 ikan (tabel) — dikalibrasi ke rumus ekonomi yang ada.
3. Urutan menyalakan: `ikanLokasi` (server) lalu `NUSA_IKAN_LOKASI` (klien).
4. Apakah 10 ikan reguler perlu diundi server juga (perubahan lebih besar, di luar permintaan ini).
