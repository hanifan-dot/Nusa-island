# Visual Kota Nusa (Ide 04, bagian visual) — STATUS

Worker 02 (klien game/visual). Cabang `fitur/visual-kota-nusa-20261113`, **Draft PR** bertumpuk di atas `integrasi/fase-a-final-20261113`.
**Basis:** `25b71fe936038bd577dc7ab6d97c11e26b4b63c8`. Semua flag tetap **OFF**; tidak ada merge, deploy, migrasi, perubahan produksi/Firebase/data pemain.

## Ringkas
Area nyata `selat` diperluas dari 40×40 menjadi **92×48** dengan kota di x ≥ 37. Pemain **berjalan** dari Pelabuhan Kota lewat gerbang barat (koridor y 19–23) ke pusat kota — tanpa teleport. Dermaga Pak Damar tidak diubah. Tanpa ID area server baru.
Hanya visual: **tanpa** pembelian, hadiah, pekerjaan, quest, koin (tidak ada perhitungan koin di klien), NusaPhone tidak fungsional (hanya tampak luar + papan "SEGERA HADIR"). Tidak menyentuh Kedai Bu Indah, dapur, Rumahku, PR #137/#138 maupun kode Ide 08.

## Flag
- `window.NUSA_KOTA` (default `false`, diset di `cloud/config.js`). Hanya bila `true`, `index.html` menulis tag `kota/core.js`, `kota/art.js`, `kota/client.js`. Flag OFF = modul **tidak diunduh** dan area selat identik dengan basis (dibuktikan dengan hash ubin/objek/solid/bangunan, test K1c).
- Server: belum ada. Untuk integrasi nanti perlu flag server **`kotaNusa`** (di `gameFlags`) yang menyalakan `NUSA_KOTA`; saat ini sengaja tidak ada (tidak menyentuh backend Worker 01).

## Tata letak (urut sesuai perintah)
1. **Pelabuhan & industri:** Dermaga Pak Damar utuh, gudang ikan, gudang logistik, 5 truk parkir (lahan parkir), pos gerbang, jalan keluar pelabuhan.
2. **Pasar & niaga:** Pasar Kota Nusa (gapura + 8 lapak), ruko 2–3 lantai (4), warung makan, toko kelontong, bengkel, NusaPhone (tampak luar).
3. **Pusat kota:** kantor Nusa (7 lantai), hotel (8), kantor 5 lantai, apartemen (7), balai kota (4); persimpangan utama; 9 simpang berlampu lalu lintas + 1 penyeberangan tengah blok; zebra cross; trotoar; 36 lampu jalan.
4. **Taman kota:** pohon rindang (10), bangku (6+), air mancur, jalur lari, jalur sepeda, pedagang kecil (gerobak), warga duduk.
5. **Permukiman:** 12 rumah kecil/sedang berbeda bentuk (atap pelana/limas), pagar, beranda, jemuran, tanaman, gang kecil.
Total: 28 bangunan, 168 objek, 199 solid kolisi. Gaya 2.5D isometrik Nusa Island (bukan 3D berat).

## Kendaraan (24, tanpa logo merek nyata)
Mobil pribadi 9, truk boks 3, truk pendingin 2, tangki 2, truk sawit 2, pengangkut motor 1, motor/bebek 5; sepeda dipakai NPC pesepeda. 10 rute tetap (lajur kiri), **tanpa pathfinding**. Simulasi mikro offline-deterministik (langkah 0,1 dtk, periode 150 dtk) — berhenti di lampu merah, melambat di persimpangan, menjaga jarak, tak bertumpuk; di klien menahan laju bila pemain/kendaraan di depan (tidak pernah menabrak pemain). Lampu depan/rem, bayangan, arah hadap benar. Di luar kamera tidak digambar; kumpulan (pool) tetap.

## NPC (25)
25 NPC berskrip keyframe (aktivitas: keluar-masuk pintu, belanja, lapak, duduk, ngobrol, lari, bersepeda, angkut barang, bengkel, sopir, menyeberang, patroli). Menyeberang hanya pada fase pejalan lampu (kendaraan semua berhenti). Dialog singkat "Sapa" saat didekati (tanpa quest/ekonomi).

## Mekanisme siang–malam (jam game yang sudah ada, `Nusa.S.hour`)
| Waktu | NPC dijadwalkan | Kendaraan | Lainnya |
|---|---|---|---|
| Pagi/siang 7–16 | 20–25 | padat (24) | toko buka, pasar ramai |
| Sore ~18 | ±17 | sedikit lebih ramai | cahaya hangat, pekerja pulang, lampu jalan & toko menyala, pedagang tutup |
| Malam 22–04 | 5–8 | jauh lebih sedikit (≈4) | sebagian toko tutup, jendela gedung tinggi menyala, pantulan lembut, jangkrik, angin, ombak jauh |
Posisi NPC/kendaraan/lampu adalah fungsi murni dari jam dinding `(Date.now()-EPOCH)/1000 mod 150` + seed kota → semua pemain melihat jadwal sama; **tidak ada tulis Firestore/D1** (kode `kota/*` tidak memuat panggilan jaringan; diuji). Kepadatan malam diatur `Core.density(hour)` dan `npcActive`.

## Performa (target Galaxy M15 5G / Android rendah)
- Hanya NPC/kendaraan di dekat kamera digambar (culling + LOD); pool NPC, kendaraan, lampu, partikel; tanpa bayangan mahal; tanpa pathfinding berat; audio dimuat malas.
- 3 tingkat kualitas (`NW.kota.setQuality`, override `?kotaq=0|1|2`): NPC tergambar ≤ 25/17/11, kendaraan 24/16/9 (×kepadatan 1/0,66/0,38), lampu dinamis 12/6/0. **Tata letak tidak berubah** (diuji). Penurunan otomatis memakai jam dinding bila rata-rata frame < ±27 fps selama ±2,5 dtk.
- Ukuran: `kota/` ±105 KB tidak terkompresi (hanya diunduh bila flag ON). Nyaman portrait & landscape.
- **Belum diuji di perangkat Android sungguhan**; yang diuji: Chromium headless + throttling CPU 12×.

## Audio
Ringan, mengikuti pengaturan suara game (`Nusa.sfx`), didaftarkan malas saat masuk kota: pasar, kendaraan lewat, bel sepeda, taman, kantor, jangkrik, angin malam, ombak jauh. Hanya diuji terdaftar & terpanggil, bukan kualitas suara.

## Multiplayer — HARUS DICATAT JUJUR
- Kota tidak mengirim data apa pun ke jaringan; protokol Kapal Rombongan tidak diubah; `NW.home.active`, `NW.boat.on` tidak terganggu (K11). (Repo ini tidak punya `NW.room`; ekuivalennya `NW.mp` / `NW.home` / `NW.boat` — diperiksa.)
- **Permintaan "pemain lain tetap terlihat di kota" TIDAK dapat dipenuhi dengan sistem multiplayer yang ada**: `mp/client.js` (`inMuara`) hanya menggambar pemain lain di Muara/di atas kapal; di area `selat` (termasuk kota) pemain lain memang tidak digambar — perilaku basis yang sama sebelum PR ini. Menampilkannya membutuhkan perubahan protokol/server (instans per area + flag server `kotaNusa`), di luar wewenang worker klien. Perlu keputusan Owner / koordinasi Worker 01.

## Pengujian
Unit: `node tests/unit-kota.js` (22 uji: 5 kawasan, 25 NPC, rumah beragam, konektivitas BFS tanpa pemain terjebak, lampu merah/kuning/pejalan, tak ada penerobosan lampu, tak bertumpuk, deterministik, tanpa jaringan/ekonomi, kepadatan siang/malam).
Browser: `python3 tests/browser/test_kota.py` (38 uji) — K1 flag OFF identik; K2 flag ON; K3 25 NPC & kepadatan; K4 kendaraan/lampu/penyeberang; K5 kolisi (termasuk papan ketik sungguhan); K6 tak ada kantong terjebak; K7 culling; K8 kualitas rendah & otomatis saat lambat; K9 pagi/sore/malam; K10 360×740, 412×915, 740×360, desktop; K11 multiplayer 3 pemain.
Regresi dengan `NUSA_KOTA=true`: `tests/browser/test_kota_regresi.py` menjalankan `test_port` (41 PASS), `test_port_rombongan` (16 PASS), `test_rombongan` (51 PASS) — Pak Damar dan Kapal Rombongan tiba/kembali tetap jalan. Semua suite baru ditambahkan ke `tests/run-fase-a.sh` (berurutan). Hasil regresi penuh Fase A + build Hosting + `cek-rilis` + pemindai rahasia: lihat bagian "Hasil akhir" di bawah.

**Tidak diuji dari sandbox:** Android fisik/Galaxy M15, Cloudflare Workers/Firestore sungguhan, kualitas audio nyata, dan multiplayer lintas-area nyata.

## Bukti visual (`docs/ai-handoff/ide-04/shots/`)
1. `1-pusat-kota-siang.png` — pusat kota siang (gedung, lalu lintas, NPC)
2. `2-pasar-dan-ruko.png` — pasar dan ruko
3. `3-taman-kota.png` — taman (pelari, pesepeda, warga duduk)
4. `4-pusat-kota-malam.png` — malam: jendela menyala, jalan sepi
5. `5-peta-seluruh-kota.png` — seluruh kota (render nyata dengan kamera menjauh)
Dibuat ulang dengan `python3 tests/browser/shots_kota.py` (flag hanya dipasang di sesi uji).

## Berkas & kemungkinan tumpang tindih dengan Ide 08
Baru: `kota/core.js`, `kota/art.js`, `kota/client.js`, `tests/unit-kota.js`, `tests/browser/{kota_lib,test_kota,test_kota_regresi,shots_kota}.py`, folder ini.
Diubah minimal (**potensi konflik rebase dengan Ide 08**): `index.html` (1 baris di blok skrip Fase A), `cloud/config.js` (1 baris default flag), `firebase/scripts/build-hosting.sh` (tambah `kota` ke daftar salin), `tests/run-fase-a.sh` (suite baru). Tidak mengubah `world/*`, `world/areas/selat.js`, `mp/*`, backend, atau dokumen status Worker 01.

## Keterbatasan
- Pemain lain tidak terlihat di kota (lihat Multiplayer).
- MUNDUR Kapal Rombongan tetap nonaktif (PR #138, tak terkait).
- NusaPhone hanya eksterior; gedung hanya dapat dilihat/ditanya (dialog info), tanpa interior.
- Ledakan jumlah NPC > 25 / interior / pekerjaan sengaja di luar lingkup.

## Hasil akhir
Regresi penuh Fase A dijalankan berurutan (`bash tests/run-fase-a.sh`, flag semua default OFF), semuanya **0 FAIL**:
unit 46 berkas (hanya baseline `unit-username` yang sudah gagal di basis/produksi) · ekonomi 22 · bumbu24 104 · bumbu241 83 · boat 17 · delivery 35×3 · rombongan 51×3 · kemudi_rombongan 72×3 · port 41×3 · port_polish 49×3 · port_rombongan 16×3 · quest_owner 48 · house 83 · rumahku_sosial 25 · rumahku_flag_server 2 · pilih_dunia 43 (lulus penuh kali ini) · podium 24 · **test_kota 38** · regresi `NUSA_KOTA=true`: port 41, port_rombongan 16, rombongan 51.
`bash firebase/scripts/build-hosting.sh` exit 0 (153 berkas, termasuk `kota/`), `node firebase/scripts/cek-rilis.js` exit 0. Pemindai rahasia pada berkas yang saya tambah/ubah: bersih (satu-satunya kecocokan adalah kunci web Firebase publik yang sudah ada di `cloud/config.js`, bukan bagian diff saya).
