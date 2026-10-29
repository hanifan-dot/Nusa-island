# Pengujian Nusa Island

## Uji logika (tanpa browser)
```
node tests/unit-home.js
```
Menguji 10 level rumah, relokasi perabot saat upgrade, migrasi rumah Tahap 2A,
inventaris ikan (pindah tanpa duplikasi, kapasitas, tukar, ambil), aturan habitat,
penempatan perabot (pintu, tabrakan, jalan), dan izin pengunjung.
```
node tests/unit-fishmath.js
```
Bumbu 1.2: harga (kompresi >100 kg), sebaran berat ikan (ekor ekstrem langka), tekanan fight
(nol untuk ikan ≤20 kg), kelelahan ikan, dan beban joran.

## Uji browser (Playwright, Chromium headless)
```
pip install playwright && python -m playwright install chromium
python tests/browser/test_rumah_akuarium.py   # penyempurnaan 2A: rumah 10 level, tata ruang, akuarium, misi, NPC, simpanan lama
python tests/browser/test_tahap2a.py          # regresi Tahap 2A: misi, NPC, Rumahku, tidur, kartu tangkapan
python tests/browser/test_tahap1.py           # regresi Tahap 1: berjalan, collision, pasar, toko, mancing, kapal, joystick
python tests/browser/test_bumbu1.py           # Bumbu 1: cerita 4 bab, 3 keahlian, dialog NPC, sudut dermaga, petunjuk, migrasi v3→v4
python tests/browser/test_bumbu11.py          # Bumbu 1.1: panel Strike (HP & desktop), joran di punggung 8 arah, 8 gelar, label nama, migrasi v4→v5
python tests/browser/test_bumbu12.py          # Bumbu 1.2: kapasitas 8→200, inventaris 200 ikan, pasar, pamer ikan, 10 joran, fight ikan besar, ekonomi, migrasi v5→v6
python tests/browser/balance_sim.py           # alat penyetelan (bukan tes): peluang menangkap per joran/berat dengan pemain berreaksi acak
```
Simulasi fight di `test_bumbu12.py` memakai `startFight/updateFight` asli dengan `Math.random` deterministik (seed tetap) sehingga hasilnya stabil.

Simpanan lama ditanam lewat `add_init_script` sebelum game dimuat. Kalau ditulis lalu
`reload()`, game akan menimpanya dengan state yang sedang berjalan saat `pagehide`.

Semua uji berjalan di Chromium headless di server, termasuk "HP-emulasi" (viewport
kecil, DPR 2, sentuh). Angka FPS di sana **bukan** bukti performa di HP Android asli.
