# Integrasi final — Multiplayer/Visual Kota (#150) + Ide 08A–08E (#149)

Status: **Draft, belum di-merge, belum di-deploy, semua saklar MATI.**

## Sumber & basis (diverifikasi ulang via `git ls-remote`, tidak berubah)
| Sumber | SHA |
|---|---|
| game #150 (Multiplayer/Visual Kota) | 18cf26a |
| game #149 (Ide 08, tumpukan 08A–08E) | 0306242 |
| backend #62 | 58df80e |
| backend #63 | 02bfb68 |
| `origin/main` | c0e890a — cabang pemicu deploy (hanya workflow), BUKAN sumber kode game |
| basis live game | **02368ed** (#146; dipin sebagai `GAME_SHA` di workflow deploy) |
| basis backend | #59 (be5f851) |

Cabang integrasi game dibuat dari 02368ed lalu menggabung #150 dan #149. Cabang integrasi backend dari #59 menggabung #62 dan #63. Cabang sumber (Worker 01, #145/#149/#150/#62/#63) tidak disentuh.

## Konflik yang diselesaikan (gabungan kedua sisi)
- `index.html` — pemuat lazy: kemudi → rombongan → `NUSA_KOTA` → delivery → `NUSA_DAPUR`.
- `firebase/scripts/build-hosting.sh` — daftar salin memuat `dapur`, `kemudi`, `rombongan`, `kota`, `delivery`.
- `mp/client.js` — `inMuara` mempertahankan selat/kapal dan menambah `!NW.room.active`; `homeScene` juga mengecualikan `NW.room`.
- `rombongan/client.js` — `inMuara` mempertahankan `kotaLive()` dan menambah `!NW.room.active`.
- Backend `server/features.js`, `worker/index.js`, tes: `kotaNusa` + `dapurRumahku` digabung (enam boolean `gameFlags`, semua default false).

## Perubahan baru di cabang integrasi
- `kemudi/kemudi.css`: panel Kemudi turun di bawah dock pemain di layar sempit (≤480px portrait) dan disembunyikan saat panel obrolan terbuka (tombol Kemudi disembunyikan di landscape pendek).
- `tests/browser/test_integrasi_final.py` + `integrasi_bridge.mjs`: satu tes lintas fitur (Worker asli via jembatan, Firestore tiruan).
- `tests/browser/test_integrasi_layout.py`: tumpang tindih Kemudi/obrolan/indikator pemain/Kedai/Dapur/joystick di 4 ukuran layar.
- `test_online_status.py`: state tiruan memuat `serverCount` (basal usang sejak #146); `test_kota_presence.py` P19: ambang 9.5 → 13.0 (anggaran server SPEED 8 + BURST 5).
- `run-fase-a.sh`: menambah suite multiplayer, dapur, E2E Ide 08, dan tes integrasi.

## Hasil tes (berurutan, di keadaan akhir kecuali disebut)
| Tes | Hasil |
|---|---|
| Backend seluruh suite (incl. konkurensi/transaksi), pindai rahasia | 382 lulus / 0 gagal / 3 dilewati |
| test_integrasi_final (lintas fitur) | 69 / 0 (satu run lain 68/1: E5h, lihat bawah) |
| test_integrasi_layout (4 ukuran: 1280×800, 412×915, 360×740, 740×360) | 20 / 0 |
| test_kemudi_rombongan | 72 / 0 |
| test_ide08_e2e | 33 / 0 |
| test_kota_presence | 22 / 0 |
| test_online_status | 11 / 0 |
| build-hosting, cek-rilis | exit 0 |
Runner penuh `run-fase-a` dijalankan pada keadaan merge sebelum edit akhir tes/CSS; tes yang terdampak edit itu dijalankan ulang satu per satu (tabel di atas).

### Basal vs regresi (dibandingkan keluaran sebenarnya di 02368ed)
- test_pilih_dunia: baris PASS identik byte-per-byte dengan basal.
- test_multiplayer: gagal pada assertion/timeout yang sama di basal 02368ed.
- test_online_status versi lama: gagal sama di basal; sudah diperbaiki di cabang ini.
- `unit-username`: gagal di basal.
- E5h ("pemilik melihat tamu makan") = flake waktu: lulus pada ulang, gagal sesekali di dalam pemuatan integrasi.

## Tes lintas fitur (cakupan)
Empat pemain terhitung di angka server; pemilik + 2 tamu masuk Rumahku; beli bahan, masak, cuci, sajikan, makan; keluar ke Muara; naik kapal rombongan ke Kota; selesaikan Pak Damar; pemain lain tetap terlihat, angka server tidak turun/ganda; refresh/reconnect tidak menggandakan koin, bahan, ikan, porsi, hadiah, atau pemain.

## Risiko nyata / batas pengujian
- Tidak diuji di Cloudflare Durable Object asli, Android/iOS asli, atau Firebase/Firestore produksi (Worker diuji lewat jembatan + Firestore tiruan).
- Gerbang `gameFlags` dibaca sekali per modul: kegagalan panggilan pertama menjaga fitur MATI sampai muat ulang (aman tapi lengket).
- Endpoint `/rooms` lobi terkena batas laju (429) di server dev.
- 3 tes backend dilewati (butuh repo game berdampingan).
- Worker 01 E2E memanggil `leaveVisit()` / `NW.room.exit()` tanpa argumen pemain; ditambal hanya di pemuat tes saya, bukan di berkas mereka.
- Ambang P19 diselaraskan ke anggaran server (bukan kelonggaran tanpa dasar).

## Urutan merge/deploy/saklar yang disarankan (TIDAK dijalankan)
1. Merge PR backend integrasi → deploy backend (saklar MATI, tanpa migrasi).
2. Merge PR game integrasi → deploy worker multiplayer + Hosting dari SHA terpin lewat workflow utama seperti #147.
3. Verifikasi semua saklar MATI (klien dan server).
4. Owner menyalakan bertahap: pakDamar + kapalRombongan (`NUSA_BOAT=ya`) → kotaNusa (`NUSA_KOTA=ya`) → dapurRumahku + socialHome.
5. Setelah stabil: tutup/supersede #145/#150/#149/#62/#63.

## Keputusan yang masih perlu Owner
- Cabang dasar PR (lihat badan PR) dan kapan merge/deploy.
- Urutan/jadwal penyalaan saklar.
