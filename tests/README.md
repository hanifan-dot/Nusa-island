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
python tests/browser/test_bumbu2.py           # Bumbu 2: Kampung Tepian Toba, perjalanan dua arah, collision, NPC sehari penuh, cerita 3 bab, penemuan, Buku Petualangan, mancing/inventaris, migrasi v6→v7, pamer ikan lintas area, kontrol HP, performa
python tests/browser/test_bumbu21.py          # Bumbu 2.1: 17 skenario suara (musik per waktu/area, crossfade, kapal, mancing, rumah, slider, mute, simpan, tab tersembunyi, AudioContext ditolak, kebocoran node, ambience spasial, regresi)
python tests/browser/test_bumbu22.py         # Bumbu 2.2: 87 pemeriksaan (20 skenario wajib: varian, peluang, roll sekali, migrasi v8, dua spot rahasia, kartu momen, jingle/mute, jual/kunci, akuarium)
node tests/unit-variants.js                   # simulasi statistik peluang varian (24 pemeriksaan)
python tests/visual_bumbu22.py <folder>       # tangkapan layar bukti visual (varian, spot, kartu, inventaris, koleksi)
python tests/audio_eval.py <folder>           # evaluasi OBJEKTIF musik/efek/ambience offline (RMS, puncak, klip, centroid, kemiripan Muara vs Toba) + ekspor WAV/MP3
python tests/browser/balance_sim.py           # alat penyetelan (bukan tes): peluang menangkap per joran/berat dengan pemain berreaksi acak
```
Simulasi fight di `test_bumbu12.py` memakai `startFight/updateFight` asli dengan `Math.random` deterministik (seed tetap) sehingga hasilnya stabil.

Simpanan lama ditanam lewat `add_init_script` sebelum game dimuat. Kalau ditulis lalu
`reload()`, game akan menimpanya dengan state yang sedang berjalan saat `pagehide`.

`test_bumbu11.py` & `test_bumbu12.py` kini mengharapkan simpanan versi 8 (Bumbu 2.2) pada uji migrasinya.

Catatan uji NPC Dika (`test_tahap2a.py`): dulu kadang gagal bila dijalankan paralel. Penyebabnya Dika terus
mengejar kupu-kupu; bila ada jeda >0,5 dtk antara mendekat dan menekan tombol (beban CPU), Dika sudah
pindah dan tombol 💬 hilang. Sejak Bumbu 2, NPC yang sedang berkeliling berhenti & menoleh saat pemain
mendekat (≤1 tile), jadi masalah ini teratasi di game (bukan dengan mengulang tes).

Semua uji berjalan di Chromium headless di server, termasuk "HP-emulasi" (viewport
kecil, DPR 2, sentuh). Angka FPS di sana **bukan** bukti performa di HP Android asli.

Bumbu 2.1 (suara): uji lama membisukan game (`S.muted=true`) agar cepat & deterministik. Jalankan dengan
`NUSA_AUDIO=1` agar audio benar-benar aktif. Chromium headless TIDAK mengeluarkan suara ke speaker; uji
mengukur graf Web Audio (penguatan bus, jumlah sumber, jalur musik) dan render offline. Kualitas bunyi
di speaker/HP fisik belum pernah didengar atau diuji.

Catatan keandalan (Bumbu 2.2): `test_bumbu2.py` dulu kadang gagal bila dijalankan bersamaan dengan suite lain.
Akar masalah yang ditemukan: (1) tes menghapus `S.adv` pada state game yang masih hidup sehingga loop game sempat
membaca `undefined.found` — kini tes menghapusnya pada salinan; (2) jeda tidur tetap di sekitar animasi
pelayaran/finale — kini memakai `wait_for` yang menunggu kondisi. Sendirian, suite ini lulus 106/106 berulang kali.
Bila beberapa suite Chromium dijalankan paralel di mesin yang CPU-nya jenuh, langkah yang bergantung waktu
(finale Bab 3) masih bisa gagal; jalankan suite secara berurutan.
