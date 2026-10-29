# Pengujian Nusa Island

## Uji logika (tanpa browser)
```
node tests/unit-home.js
```
Menguji 10 level rumah, relokasi perabot saat upgrade, migrasi rumah Tahap 2A,
inventaris ikan (pindah tanpa duplikasi, kapasitas, tukar, ambil), aturan habitat,
penempatan perabot (pintu, tabrakan, jalan), dan izin pengunjung.

## Uji browser (Playwright, Chromium headless)
```
pip install playwright && python -m playwright install chromium
python tests/browser/test_rumah_akuarium.py   # penyempurnaan 2A: rumah 10 level, tata ruang, akuarium, misi, NPC, simpanan lama
python tests/browser/test_tahap2a.py          # regresi Tahap 2A: misi, NPC, Rumahku, tidur, kartu tangkapan
python tests/browser/test_tahap1.py           # regresi Tahap 1: berjalan, collision, pasar, toko, mancing, kapal, joystick
```
Catatan: cek pertama di `test_tahap1.py` ("save lama") memuat ulang halaman setelah
menulis simpanan, sehingga game menimpanya saat `pagehide`. Itu batasan skrip uji;
pemuatan simpanan lama diuji dengan benar di `test_rumah_akuarium.py` (A1–A3).
