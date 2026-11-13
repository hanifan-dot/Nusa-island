# Multiplayer Kota Nusa (Ide 04, bagian multiplayer) — STATUS

Worker 02 (klien game/visual). Cabang `fitur/multiplayer-kota-20261113`, **Draft PR** bertumpuk di atas PR #140 (`fitur/visual-kota-nusa-20261113`).
**Basis wajib:** `e6ab91ea7a69737b3cfa69879b73aba7761a42bc` (Visual Kota, PR #140 — tidak diubah/di-force-push/ditutup). Tidak menyentuh PR #137, #138, #139 maupun cabang Ide 08.
Semua flag tetap **OFF**. Tidak ada merge, deploy, menyalakan flag, migrasi, perubahan produksi/Firebase/data pemain.

## Ringkas
Pemain asli di area `selat` (Kota Nusa) kini saling melihat dan berjalan bersama secara realtime lewat WebSocket/Durable Object multiplayer yang sudah ada. Satu ruang (`muara-N`) melayani dua area; setiap pemain punya `area` yang **ditetapkan server** (`muara` | `selat`). Posisi, chat, emoji, outfit, masuk/keluar hanya disiarkan ke pemain di ruang **dan** area yang sama. Kapal Rombongan kini bisa tiba di Pelabuhan Kota sebagai **pemain terlihat**: kapten + penumpang turun, berjalan, naik lagi, pulang. NPC dan kendaraan kota tetap lokal & deterministik (tidak lewat jaringan, tidak ada tulis Firestore/D1 per frame).

## Gerbang (semua bawaan OFF; ketiganya harus ON)
| Lapisan | Flag | Bawaan | Fungsi |
|---|---|---|---|
| Klien (build) | `window.NUSA_KOTA` | `false` | HANYA mengunduh `kota/*` (kini termasuk `kota/mp.js`). Bukan otorisasi. |
| Server nusa-api | `gameFlags.kotaNusa` | `false` (gagal-tertutup) | Dibaca `kota/mp.js` sekali per sesi masuk. **Backend: PR baru di atas #59** (lihat bawah). |
| Server realtime | env `NUSA_KOTA` (`wrangler.toml`) | `"tidak"` | Room melayani area per pemain; welcome membawa `ko:1`. |
Salah satu OFF → perilaku lama persis: pemain di selat tidak disiarkan (klien menyembunyikan diri), kapal ke Pelabuhan Kota memakai jalur "pergi" lama. Tidak ada pesan `ar`/`ko` dikirim saat flag klien OFF.

## Penambahan protokol (hanya menambah; kontrak lama tidak berubah)
- `hello` + `ko:1`, `ar:"muara"|"selat"` (klien mengumumkan dukungan kota & area).
- `{t:"ar",a,x,y,d}` pindah area tanpa kapal → server membalas `w` baru (sukses) atau `{t:"an",r}` (`off|hidden|boat|same|hop`).
- `w` + `ko:1`, `ar`; baris kapal bendera bit 4 = kapal berlabuh di kota; `bv depart/arrive` + `ko:1`.
- Klien lama mengabaikan field baru; server tanpa `NUSA_KOTA` mengabaikan `ko/ar`.

## Validasi di server (`mp/room-core.js`)
- **Autentikasi:** uid hanya dari token (header); uid/email/role/saldo/inventaris/save/Cloud Save **tidak pernah** ada di protokol; field asing & `role`/`uid` palsu diabaikan.
- **Area:** hanya `muara`/`selat`; klien tanpa `ko` tidak bisa masuk kota; pindah area ditolak saat tersembunyi/di kapal.
- **Batas peta per area** (selat 92×48) dan **kecepatan = anggaran jarak** di kota: rata-rata ≤ 8 petak/dtk, lonjakan ≤ 5 petak, tidak bergantung laju pesan; bendera TP tidak berlaku di kota.
- **Teleport:** pindah area dengan jeda ≥ 6 dtk, masuk lewat titik pelabuhan (klaim jauh dipaksa ke titik masuk); `hello` ulang di kota dan sambung ulang langsung ke kota dibatasi jarak yang bisa ditempuh sejak posisi terakhir (posisi terakhir hanya di memori DO, 5 menit).
- **Spam:** ember per pemain untuk posisi/chat/emoji/outfit/hold/pindah area; pelanggaran berulang → putus 4005.
- **Muara–kapal–selat:** kapal berlabuh di kota hanya bila **semua awak** mendukung kota (kalau tidak → jalur "pergi" lama); hanya kapten yang memberangkatkan/pulang; pulang butuh ≥ 8 dtk; naik hanya dari area tempat kapal berada; kapal kosong di kota bubar setelah 5 menit; snapshot DO memuat area, dukungan kota, kapal kota (server kota dimatikan → kapal kota dibaca sebagai "pergi", awak aman).

## Alur Kapal Rombongan
1. Muara: kapten `go selat` → kapal bertambat di `[13.6, 21.95]` (Pelabuhan Kota); semua awak pindah ke area selat; pemain Muara melihat kapal & awak hilang, pemain kota melihat kapal tiba dengan tiga awak di kursi.
2. Turun: tiap awak `leave` → berdiri di dermaga `[13.1, 20.45]` sebagai pemain berjalan (kapal kosong tetap ada).
3. Naik lagi: `join` (kapal kota tanpa kapten → yang pertama naik jadi kapten); kapten keluar → penumpang berkursi terkecil dipromosikan; putus → kursi ditahan 20 dtk dan kembali ke kursi (di area kota).
4. Pulang: kapten `go muara` → awak yang duduk ikut kembali ke Muara; yang masih berjalan di kota tetap di kota.

## Berkas
Baru: `kota/mp.js` · `tests/unit-mp-kota.js` · `tests/browser/test_kota_mp.py` · dokumen ini.
Diubah (kecil): `mp/proto.js`, `mp/room-core.js`, `mp/client.js`, `rombongan/client.js`, `rombongan/core.js` (satu alasan penolakan), `cf-multiplayer/src/index.js` + `wrangler.toml` (env `NUSA_KOTA`), `tests/dev/mp-dev-server.js`, `index.html` (satu tag `kota/mp.js` di blok `NUSA_KOTA`), `tests/browser/kota_lib.py` + `test_kota.py` (mock `kotaNusa`, 4 berkas kota), `tests/run-fase-a.sh` (+1 suite), `docs/ai-handoff/CONTRACTS.md` (§A baris flag, §D baru).

## Backend (repo `nusa-island-control-center`)
PR baru, bertumpuk di atas #59 (`fitur/fase-a-kontrak-20261112`), cabang `fitur/kota-nusa-flag-backend-20261113`: saklar Owner `kotaNusa` (bawaan MATI, gagal-tertutup) di `server/features.js`, `gameFlags` di `worker/index.js`, 2 tes baru + 4 asersi lama disesuaikan, kontrak §A/§D. **Tidak** menyentuh PR #60/#61.

## Tes (semua berurutan, tidak paralel)
| Suite | Hasil |
|---|---|
| `unit-mp-kota` (baru, Room saja: area, spoof, kecepatan, teleport, spam, hop, kapal kota, reconnect, snapshot, kota OFF) | 91 lolos |
| unit lain (47 berkas; `unit-mp` 193, `unit-boat` 105, `unit-rombongan` 11, `unit-kota` 22) | semua lolos; `unit-username` = baseline lama |
| `test_kota_mp` (baru; 4 klien Chromium nyata + server dev memakai `room-core` asli) | 58/58 |
| `test_kota` (Visual Kota) | 38/38 |
| Pak Damar: `test_delivery` 35, `test_port` 41, `test_port_polish` 49, `test_port_rombongan` 16 | semua lolos |
| `test_rombongan` 51 · `test_kemudi_rombongan` 72 (1 kali K16 gagal waktu-tunggu di pelari penuh, ulang sendiri 72/72) | lolos |
| Rumahku: `test_house` 83, `test_rumahku_sosial` 25, `test_rumahku_flag_server` 2 · `test_quest_owner` 48 · `test_podium` 24 · `test_pilih_dunia` 43 · `test_ekonomi` 22 · `test_bumbu24` 104 · `test_bumbu241` 83 · `test_boat` 17 | lolos |
| `test_kota_regresi` (NUSA_KOTA=true): `test_port` 41, `test_port_rombongan` 16, `test_rombongan` 51 | lolos |
| `build-hosting.sh`, `cek-rilis.js` | exit 0 |
Cakupan `test_kota_mp`: empat klien/empat outfit saling terlihat di pusat kota; jalan, berhenti, berbelok, chat, emoji; server lain (muara-2) dan area Muara tidak terlihat (dua arah); spoof UID/role diabaikan; lalu lintas jaringan tidak memuat uid/email/saldo/role/save; teleport, kecepatan berlebih, spam chat/posisi, area palsu ditolak; kapal tiba → tiga awak turun → berjalan bersama; naik lagi; kapten keluar → promosi; reconnect; pulang ke Muara; flag klien OFF (tanpa unduhan `kota/*`, tanpa `ko/ar`); flag server OFF (kapal memakai jalur lama).

## Bukti visual (`docs/ai-handoff/ide-04/shots-mp/`)
1. `kmp-01-pusat-kota-siang.png` — tiga pemain asli (+ pemain kamera) berjalan di pusat kota siang.
2. `kmp-02a-kapal-tiba.png` (kapal rombongan tiba, tiga awak di kursi) dan `kmp-02b-tiga-awak-turun.png` (ketiganya turun, berdiri di dermaga).
3. `kmp-03-taman-malam.png` — tiga pemain di taman kota malam (fountain, lampu menyala).
4. `kmp-04-flag-off-klien.png` — flag OFF: tidak ada unduhan `kota/*`, tidak ada `NW.kota`/`NW.mpKota`, tidak ada `ko/ar`, tidak ada pesan `ar`, selat tetap 40×40 (angka diukur tes dan dicetak di gambar).

## Risiko & hal yang BELUM teruji
- **Belum diuji di Cloudflare/Durable Object nyata, Android/iOS nyata, Firebase Hosting/Firestore produksi.** Semua tes memakai server dev Node (logika `room-core` yang sama) dan `gameFlags` tiruan.
- Hibernasi DO: snapshot/restore diuji di unit test saja; posisi terakhir anti-teleport (`recent`) hanya di memori — setelah DO restart sambung ulang langsung ke kota diterima pada posisi klaim (dalam batas peta).
- Sesi baru yang langsung masuk kota (`hello` pertama dengan `ar:selat`) diterima di posisi klaim bila tak ada catatan; klien hanya melakukan ini bila `R.kota` pernah dikonfirmasi server. Pemain yang memuat ulang halaman saat berada di selat baru tersambung setelah kembali ke Muara bila `R.kota` belum diketahui.
- Selama server belum mengonfirmasi pindah area (maks ~3 dtk, jeda 6 dtk), posisi tidak dikirim; pemain bisa terlihat "menyusul" setelah konfirmasi.
- Klien yang posisinya ditahan server (anggaran jarak) bisa tertinggal dari posisi lokal; server mengejar ≤ 8 petak/dtk (tidak ada pesan koreksi posisi).
- Kapal kota tanpa kapten dan kapal kosong: bubar 5 menit; awak yang berjalan di kota saat kapal bubar tidak punya kapal untuk kembali (harus memakai jalur kapal tunggal lama).
- Pengiriman Pak Damar di mode kota: titik antar tetap di Pelabuhan Kota lama; alur kirim kotak dengan kapal yang berlabuh sebagai pemain terlihat **hanya diuji lewat regresi** (`test_port_rombongan` dengan NUSA_KOTA=true, flag server kota OFF), tidak diuji dengan flag server kota ON.
- Tes `test_kota_mp` memakai sebagian pergerakan lewat pengaturan posisi langsung (kecepatan wajar 4–6 petak/dtk) untuk menempuh jarak jauh; jalan dengan keyboard hanya diuji sebentar.
- Anggaran jarak (8 petak/dtk, lonjakan 5) memakai kecepatan jalan ≈ 4–6 petak/dtk sebagai acuan; bila kelak ada kendaraan pemain di kota, angka ini harus ditinjau.

## Irisan dengan Ide 08 / pekerjaan lain (berkas bersama)
`mp/client.js`, `mp/room-core.js`, `mp/proto.js`, `rombongan/client.js`, `rombongan/core.js`, `index.html`, `cloud/config.js` (tidak diubah di PR ini), `cf-multiplayer/src/index.js`, `cf-multiplayer/wrangler.toml`, `tests/dev/mp-dev-server.js`, `tests/run-fase-a.sh`, `tests/browser/kota_lib.py`, `docs/ai-handoff/CONTRACTS.md`. Perubahan di berkas bersama dibuat sekecil mungkin (penambahan, bukan penulisan ulang); semua logika kota ada di `kota/mp.js` dan cabang `kota`/`ar` yang tidak aktif saat flag OFF. Backend: sentuh hanya `server/features.js`, `worker/index.js` (satu baris `gameFlags`), 3 berkas tes, `docs/ai-handoff/CONTRACTS.md` — berpotensi bentrok dengan PR #60/#61 bila mereka mengubah baris yang sama.

## Cara mundur (cepat, tanpa deploy)
`gameFlags.kotaNusa=false` (Owner) dan/atau env `NUSA_KOTA="tidak"` → seluruh siaran area kota berhenti; kapal rombongan kembali ke jalur "pergi" lama; awak yang sedang berlabuh di kota dikembalikan lewat snapshot sebagai "pergi" (aman). Build klien tanpa `NUSA_KOTA` tidak mengunduh `kota/*`.
