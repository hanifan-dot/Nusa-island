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

---

## Tahap 9 — Integrasi selesai (TERKUNCI sampai Owner setuju)

**Sudah terintegrasi:** memancing (bonus setelah ikan biasa mendarat; peluang ikan lama & Megalodon tidak berubah), kotak pancing/inventaris, koleksi (Samudra Follower), kartu tangkapan asli, dan penjualan. Server (`ecoCatch`/`ecoSell`/`ecoSfInfo`) MENGUNDI sendiri (acak server) satu kesempatan per ikan biasa sah, lalu membuat ikan SF (uid, berat, harga dikunci); klien tidak bisa mengirim ikan `sf_*`. Batas harian, idempoten per `opId`, uid yang sudah diundi tidak diundi ulang. Ikan Prabowo hanya jika `sf.eventOn=true`. Kredit pengusul tetap di keempat ikan. Tidak masuk akuarium/kolam/pamer/Podium.

### USULAN nilai final (BELUM AKTIF — menunggu persetujuan Owner)
| Ikan | Rarity | Berat | Harga/kg | Peluang | Batas/hari |
|---|---|---|---|---|---|
| Ikan Tempe | Mythical | 0,3–1,4 kg | 7.400 | 0,10% | 1 |
| Cupang Slayer | Epic | 0,05–0,4 kg | 3.800 | 0,30% | 2 |
| Ikan Prabowo | Mythical Event | 3–14 kg | 750 | 0,30% | 2 (hanya event) |
| Arapaima Gigas | Legendary | 60–220 kg | 30 | 0,12% | 1 |

Dampak ± +5% ekonomi (±12% saat event) dibanding ±524 koin/pendaratan.

Untuk mengaktifkan (Owner), tulis ke `shop/config` (Worker: `shop_config/main`):
```json
{"sf":{"on":true,"eventOn":false,"fish":{
 "sf_tempe":{"price":7400,"chance":0.001,"dayCap":1,"approvedBy":"owner","approvedAt":0},
 "sf_cupang_slayer":{"price":3800,"chance":0.003,"dayCap":2,"approvedBy":"owner","approvedAt":0},
 "sf_prabowo":{"price":750,"chance":0.003,"dayCap":2,"approvedBy":"owner","approvedAt":0},
 "sf_arapaima":{"price":30,"chance":0.0012,"dayCap":1,"approvedBy":"owner","approvedAt":0}}}}
```
(isi `approvedAt` dengan timestamp; sesuaikan id dengan katalog `sf/`.)

### Masih menghalangi rilis
1. Persetujuan Owner atas tabel di atas + penulisan `sf` ke config (belum ada UI Owner).
2. Sakelar event Prabowo (`sf.eventOn`) oleh Owner.
3. Belum diuji di Firebase/Cloudflare nyata (sandbox tanpa jaringan) dan belum di Android.
4. Undian sudah di server, tetapi server masih memercayai laporan 'ikan biasa mendarat' dari klien (dibatasi laju 1,5 dtk/400 per jam, uid unik, batas harian ≤4/hari). Bukan anti-cheat sempurna.
5. Kecil: `cloud/core.js` dexCount menghitung id SF di ringkasan simpanan.

---

## Tambahan 20 Nov 2026 — 17 ikan dari komentar pengikut (Draft, belum deploy)

Disetujui Owner ("Ya semua benar gaskan"). Total ikan SF = **21** (4 awal + 17). Semua bawaan **MATI**: tetap butuh `shop_config.sf` (on, approvedBy, approvedAt, harga & peluang per ikan) dari Owner di panel backend.

| Rarity | Ikan (rata-rata jual ≈) | Peluang bonus / ikan biasa |
|---|---|---|
| Biasa | Ikan Lele 150, Ikan Emas 130, Ikan Kurame 200 (usulan @2gdkingpangeranwisata) | 0,8–1% |
| Langka | Ikan Badut 270, Lele Berkumis, Ikan Kepala Lele, Ikan Robot | 0,35–0,6% |
| Epik | Piranha Purba (@nanasmuda_____), Ikan Aligator, Hiu Ekor Gurita, Ikan Lampu Ekor Mekar, Marlin Biru | 0,1–0,15% |
| Legenda | Arwana Hitam Merah ≈20.000 (@rinodefa), Ikan Galactic, The Bloop | 0,04–0,06% |
| Mythical | Paus 0,00037% | 0,00037% |
| Secret (baru) | Megalodon Secret ≈60.000 | 0,0008% |

- **Tidak dikunci:** ikan SF masuk Coolbox tanpa `lock`, bisa **dipamerkan (pamer)** dan dijual (harga terkunci server tetap berlaku). Pajangan akuarium rumah (`home-data.js`) masih menolak ikan SF.
- **El Gran Maja tidak digandakan:** sudah ada sebagai `sf2_el_gran_maja` (Pulau Para Legenda). Ikan Badut dan Marlin Biru senama dengan ikan biasa di game utama, tetapi id/gambar/rarity/ekonominya terpisah (`sf_badut`, `sf_marlin_biru`).
- **Ekonomi (jujur):** 4 ikan awal ≈ +5%, 17 ikan baru ≈ +12%, total permanen ≈ +17% dari ekonomi ikan lama (≈ +24% bila event Prabowo hidup). Ini lebih tinggi dari perkiraan awal ±10%; Owner dapat menurunkan peluang per ikan di panel. Batas keras: peluang ≤1%, `totalDayMax` 10/hari.
- **Gambar:** `sf/draw-more.js` (mesin badan lentur + 17 sprite); bukti `docs/samudra-follower/17-lembar-17-ikan-komentar.png`.
- **Tes:** unit-sf, unit-sf-server, unit-sf2, unit-ikanloc, unit-economy, unit-owner-fish, browser test_sf (26) dan test_sf_play (24), semua dengan server TIRUAN (bukan produksi). Backend: 419 lulus; 1 gagal lama (salinan vendor vs repo game) tidak terkait.
