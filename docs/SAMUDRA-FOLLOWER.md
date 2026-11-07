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

---
# Tahap 8b — Integrasi server (PR terpisah, branch `backend/samudra-follower-20261107`)

Ekonomi server ada di repo game (`economy/core.js` → Cloud Functions), bukan di control-center. Semua ikan **tetap terkunci**.

## Yang dibangun
- `economy/sf-core.js` (disalin ke `firebase/functions/lib/` oleh `sync-economy.js`): gerbang + validasi. Tidak membawa harga/peluang final.
- `ecoCatch` menerima ikan `sf_*` **hanya jika** `shop/config.sf` memuat persetujuan Owner (`on:true`, `approvedBy`, `approvedAt`, harga & peluang di dalam pagar). Selain itu: "Ikan tidak dikenal" (identik dengan perilaku sebelum fitur → tidak membocorkan).
- Validasi: ID (daftar tetap 4), berat (rentang resmi ±1%), harga (hanya dari config; field harga dari klien diabaikan; harga/kg dikunci di kotak server saat tangkap), maks 1 ikan SF per paket, batas harian per ikan (≤3) dan total (≤4), UID unik + opId idempoten (tidak ada penggandaan), ikan SF tidak masuk hitungan Podium, tidak bisa masuk Kolam, dijual tanpa pengali harian.
- Ikan Prabowo: butuh `sf.eventOn:true` (saklar Owner terpisah). Jadwal/peluang Megalodon (event-core) **tidak disentuh**.
- Tangkapan biasa tidak membaca config tambahan (diuji: 0 baca).
- `economy/sf-rekomendasi.js` menghitung dampak rekomendasi vs ikan lama (read-only).

## Rekomendasi (BUKAN final — keputusan Owner)
Model **bonus**: peluang SF dilempar sebagai bonus setelah ikan biasa mendarat, jadi tabel ikan lama tidak berubah sama sekali.

| Ikan | Rarity | Koin/kg | Peluang | 1 dari | Jual rata² | Maks/hari |
|---|---|---|---|---|---|---|
| Ikan Tempe | MYTHICAL | 7.400 | 0,10% | 1000 | ≈12.092 | 1 |
| Cupang Slayer | EPIC | 3.800 | 0,30% | 333 | ≈1.530 | 2 |
| Ikan Prabowo | MYTHICAL EVENT | 750 | 0,30% (hanya event) | 333 | ≈12.255 | 2 |
| Arapaima Gigas | LEGENDARY | 30 | 0,12% | 833 | ≈8.086 | 1 |

Ikan lama rata-rata ≈524 koin/pendaratan; tambahan permanen ≈5%, saat event ≈12%. Visual: `docs/samudra-follower/rekomendasi.html` (+ `.json`, screenshot 8–11).

## Batas jujur
Server tidak bisa melihat pemain memancing; yang dijamin: nilai sesuai persetujuan Owner, berat resmi, laju & batas harian, tanpa duplikasi. **Klien belum melempar bonus SF** — game belum memanggil ecoCatch untuk ikan SF (sengaja; tahap berikut setelah Owner setuju). Owner perlu alat menulis `shop/config.sf` (belum ada UI; sekarang lewat dokumen config).

Tes: `node tests/unit-sf-server.js` (20), unit-economy/cloud/event/pond/rilis/leaderboard-stats, cek-rilis.
