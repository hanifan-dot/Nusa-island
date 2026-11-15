# Kopdes di Samudra Follower (Pulau Para Legenda) · STATUS

Cabang `fitur/kopdes-sf2-20261115` (bertingkat di atas Ide 07B). **Draft. Belum merge/deploy. Flag `NUSA_KOPDES` MATI bawaan.**

- Bangunan gudang beratap seng (tepi biru), 5 pintu gulung merah-bata, panel papan nama "KOPDES · Koperasi Desa · Pulau Para Legenda", bay pintu ganda di ujung. Gambar prosedural orisinal (dicache sekali ke kanvas luar-layar); **tanpa logo/merek pihak lain**.
- Tapak (33,0–39,0 × 24,7–26,3) dibersihkan dari dekor, ditambah tabrakan, titik interaksi "Kopdes" di depan papan nama, dan lampu malam.
- Isi: dialog → panel **joran** = katalog, harga, urutan level, dan pembayaran **sama persis** dengan Toko Pak Bono (`Nusa.rodShopHTML` → `buy()` → `ecoBuy` server). Tidak ada joran/harga baru dan **tidak ada perubahan backend**.
- Flag mati: pulau identik dengan sebelumnya (tidak ada objek, titik, atau lampu tambahan).
- Uji: `tests/browser/test_kopdes.py` (13), `test_sf2.py` (32) tetap hijau; build Hosting & `cek-rilis` hijau.
- Pilihan yang dipakai: rak = joran yang sudah ada (opsi 1), hanya di Pulau Para Legenda. Joran khusus Kopdes / diskon / stok harian belum dibuat (butuh keputusan Owner).
