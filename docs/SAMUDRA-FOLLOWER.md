# Samudra Follower (Tahap 8)

Koleksi 4 ikan spesial dari ide pengikut Instagram Nusa Island. **Semua nonaktif secara bawaan; tidak bisa dipancing; tidak ada harga/peluang final.**

| Ikan | Rarity | Kredit |
|---|---|---|
| Ikan Tempe | MYTHICAL | @mlfs_05 |
| Cupang Slayer | EPIC | @agusii.55 |
| Ikan Prabowo | MYTHICAL EVENT | @akhmadraffa123 |
| Arapaima Gigas | LEGENDARY | @alanaimroni |

Tidak ada ikan kelima (butuh persetujuan Owner). Komentar Instagram tidak bisa diakses dari sini.

## Arsitektur
- `sf/catalog.js` katalog (UMD, juga dipakai tes/backend nanti): `price:null`, `chance:null`, `enabled:false`, `final:false`; `checkCatch()` menolak semuanya.
- `sf/draw.js` gambar Canvas 2D + animasi berenang per karakter (Tempe mengikuti bentuk gambar referensi Owner), sprite statis di-cache.
- `sf/ui.js` + `sf/sf.css` tab "Samudra Follower" di Koleksi, layar detail (kredit IG selalu tampil), pratinjau kartu tangkapan khusus. Animasi (rAF) hanya jalan saat layar terbuka; ikuti reduced-motion.
- Hook di `game.js` hanya 2 baris di `dexHTML` (tab + grid). **Tidak** menyentuh `data.js`/`FISH`, ekonomi, inventaris, penjualan, Cloud Save, atau `showCatchCard`.
- Mode: `off` (bawaan, tab tidak muncul) · `?sf=preview` (lihat/periksa saja; tidak menambah ikan/koin, tidak menulis save).

## Hambatan backend / keputusan Owner sebelum diaktifkan
1. Harga jual & peluang tangkap tiap ikan (Owner).
2. Tabel ekonomi server (`ecoCatch`/`FISH`) harus memvalidasi ID, rarity, berat, harga; sekarang ID `sf_*` ditolak "Ikan tidak dikenal" (sengaja aman).
3. Data tangkapan dari browser tidak dipercaya; perlu jalur server + anti-duplikasi.
4. Ikan Prabowo: harus lewat event-core (saklar event aman) — belum disambungkan.
5. Ikan Prabowo menyebut figur publik nyata: dibuat kartun generik berpeci/berjas, deskripsi netral, ditandai parodi fiktif — mohon tinjauan Owner.
6. Bobot di katalog hanya placeholder.

## Pengujian
`node tests/unit-sf.js`, `python3 tests/browser/test_sf.py` (21/21), `cek-rilis` OK, unit-rilis/economy/cloud/fishmath/podium lolos. Screenshot di `docs/samudra-follower/`. Belum diuji di Android fisik. test_pilih_dunia & test_bumbu1 kadang gagal acak (timing online/refresh), tidak terkait SF.
