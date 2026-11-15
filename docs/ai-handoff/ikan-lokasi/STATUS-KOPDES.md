# Kopdes di Samudra Follower (Pulau Para Legenda) · STATUS

Cabang `fitur/kopdes-sf2-20261115` (bertingkat di atas Ide 07B). **Draft. Belum merge/deploy. Flag `NUSA_KOPDES` MATI bawaan.**

- Bangunan gudang beratap seng (tepi biru), 5 pintu gulung merah-bata, panel papan nama "KOPDES · Koperasi Desa · Pulau Para Legenda", bay pintu ganda di ujung. Gambar prosedural orisinal (dicache sekali ke kanvas luar-layar); **tanpa logo/merek pihak lain**.
- Tapak (33,0–39,0 × 24,7–26,3) dibersihkan dari dekor, ditambah tabrakan, titik interaksi "Kopdes" di depan papan nama, dan lampu malam.
- Isi: dialog → panel **joran** = katalog, harga, urutan level, dan pembayaran **sama persis** dengan Toko Pak Bono (`Nusa.rodShopHTML` → `buy()` → `ecoBuy` server). Tidak ada joran/harga baru dan **tidak ada perubahan backend**.
- Flag mati: pulau identik dengan sebelumnya (tidak ada objek, titik, atau lampu tambahan).
- Uji: `tests/browser/test_kopdes.py` (26), `tests/unit-kopdes.js` (10), `test_sf2.py` (32) hijau; unit economy/ikanloc/sf-server/aurora/quest/sf2 hijau; backend `npm test` 420 lulus; build Hosting (uji+produksi) & `cek-rilis` hijau.
- Pilihan awal: rak = joran yang sudah ada, hanya di Pulau Para Legenda.

## Pembaruan 15 Nov 2026 (permintaan Owner)
- **Atap**: dinding ujung kanan kini menyentuh sisi bawah atap (tidak ada celah hijau), rusuk atap dilembutkan + garis bubungan. Tidak ada lagi kesan "bolong".
- **Joran Kopdes** (`KOPDES_ROD` di `data.js`): merah, pita emas, plakat KOPDES, kilau & percik merah saat dipakai. **1.000 koin**, angkat ikan sampai **250 kg**, Kuat 3×, Tarik 2,4×. Dibeli SATU kali di luar tangga 20 joran (`ecoBuy` kind `kop`, `eco.kop`), TERKUNCI sampai Owner menyalakan `shop/config.kopdes` (bawaan MATI, ditolak "belum dibuka"). Harga datang dari tabel server (klien tak bisa mengubah). Bisa Lepas/Pakai.
- **Pasukan Kopdes** (`kopdes/crew.js`): 5 pegawai berseragam merah + 1 pemimpin orisinal (seragam hijau zaitun, baret marun, selempang emas). Siklus 210 dtk: tiba berbaris, pemimpin memberi perintah (gelembung teks), pegawai bergiliran angkut peti dari tumpukan ke gudang (3 putaran), peti habis → pemimpin pergi → 5 pegawai berbaris tegap di depan Kopdes. Hanya tampil jika `NUSA_KOPDES` nyala. Murni visual (tidak mengubah ekonomi).
- **Tidak dibuat**: karakter yang menyerupai tokoh politik asli pada foto, dan suara/rekaman 3 berkas mp3 tersebut (suara orang nyata). Pemimpin = karakter orisinal, tanpa audio.
- **Perlu keputusan Owner**: (1) harga/kapasitas Joran Kopdes (1.000 koin untuk 250 kg jauh lebih murah dari joran tangga ke-7: 260 kg / 46.000), (2) menyalakan `NUSA_KOPDES` (klien) + `shop/config.kopdes` (server), (3) audio pemimpin dari sumber non-tokoh-nyata bila diinginkan.
- Backend: `server/vendor/economy-core.cjs` & `economy-tables.cjs` hasil `sync-economy` (cabang backend bertingkat).
