# Tahap 3.7 — Dompet tunggal berjangkar server

- Satu angka koin di HUD = `S.money` (hasil bermain, di perangkat) + saldo Top Up di server (`shop_entitlements.wallet.NYATA`).
- Koin Top Up TIDAK dipindah ke `S.money`. Belanja (peningkatan alat/kapal, rumah, dekorasi) memakai saldo server lebih dulu lewat `shop_spendCoins` (idempoten per opId, tak bisa minus/ganda), sisanya dari `S.money`. Barang diberikan hanya setelah server membenarkan potongan.
- Tamu / simulasi / tanpa saldo Top Up: perilaku lama.
- Cloud Functions hanya berisi jalur pemain; persetujuan Owner hanya lewat dashboard.
- Batas jujur: koin hasil bermain masih di perangkat (lihat rancangan di repo dashboard `docs/PRODUKSI-PEMBAYARAN.md`).
- Uji: `node tests/unit-shop.js` (21), `python tests/browser/test_tahap36.py` (34), `python tests/browser/test_rumah_akuarium.py` (51, jalur belanja rumah).
