# Nusa Premium Gamepass — Pancing Aurora Samudra

Rp20.000, sekali beli permanen. Produk `gamepass_aurora` → grant `pancing_aurora`.

## Isi
- Pancing biru-ungu: cahaya aurora, partikel bintang, petir kecil, efek air; animasi lempar & tarik khusus.
- Efek Rendah / Sedang / Tinggi (disimpan per perangkat, default Rendah-Sedang di Android).
- Bonus peluang +1 **poin persentase** untuk kelompok ikan Langka (bukan +1% tiap spesies).
- Dikecualikan: Megalodon & ikan event (tak ada di tabel ikan server), mistik, epik/legenda, sampah, ikan dilindungi.
- Tidak menaikkan harga jual, berat, atau hadiah koin.

## Cara bonus bekerja (server)
Pemilihan ikan dilakukan klien; klien melapor lewat `ecoCatch`. Server (`economy/core.js`, `aurora-core.js`)
hanya bila `shop/entitlements/{uid}.owned.pancing_aurora.env === "NYATA"` mengubah laporan ikan **Biasa** menjadi
**Langka** di lokasi & mode (laut/darat) yang sama dengan peluang q = 1% ÷ porsi Biasa di kolam itu (≈1,7%),
lalu mengundi ulang berat di server. Klaim klien tidak berpengaruh. Hasil `swaps` dikirim balik dan diterapkan ke coolbox.
`SIMULASI`, tanpa pemilikan, atau modul backend belum terpasang → tanpa bonus.

## Kunci Owner
Produk `lockedUntilOwner`: tombol beli terkunci sampai Owner membukanya (`ownerSetEnabled`). Tidak ada auto-grant,
transaksi lama & harga produk lama tidak diubah.

## Tes
`node tests/unit-aurora.js` (14), `tests/unit-shop.js`, `unit-economy`, `unit-fashion`, `unit-pond`, `unit-rilis`,
`python3 tests/browser/test_aurora.py`. Gambar: `docs/gamepass-aurora/`.

## Rollback
Kosongkan opsi `aurora` pada `makeEconomyServer` (bonus mati) / biarkan produk terkunci.
