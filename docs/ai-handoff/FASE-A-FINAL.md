# Fase A — Checkpoint Integrasi Final (13 Nov 2026)

Dokumen serah-terima untuk Owner. Tidak menimpa `worker-01/STATUS.md` maupun `worker-02/STATUS.md`. Tidak ada fitur baru; tidak ada merge, deploy, flag ON, migrasi atau perubahan data pemain.

## 1. Basis dan SHA
| | |
|---|---|
| Basis produksi game | `hotfix/tes-recovery-4h-20261109` @ `435c63d` |
| Basis isi checkpoint (satu-satunya) | `fd803a3f45a9b76fb2daef3b4619bc38acd13c8b` (`fitur/pelabuhan-kota-20261112`, PR #136) |
| Branch checkpoint | `integrasi/fase-a-final-20261113` (dari `fd803a3`; commit di atasnya hanya: pengembalian 14 PNG, pelari tes, skrip bukti, 4 gambar bukti, tes + integrasi Kemudi kapten rombongan, dokumen ini) |
| SHA checkpoint | commit teratas branch ini (dilaporkan di Draft PR; sebuah dokumen tidak bisa memuat SHA commit-nya sendiri) |
| Backend pasangan | `nusa-island-control-center` PR #59 (backend `ef985de` saat diverifikasi) — **tidak diubah dari repo game** |

`435c63d` adalah leluhur langsung `fd803a3` (0 commit produksi tertinggal, 18 commit Fase A di depan).

## 2. Fitur dalam checkpoint
1. **Pengiriman Segar Pak Damar** — panel kemas 6 ikan → 2 kotak (3+3), `ecoDamarState/Load/Unload/Sail/Abort/Deliver`, hasil & hadiah hanya dari server.
2. **UI Kemudi** — setir + tuas + knot + kompas + jangkar + Peta Laut + status muatan + tombol memancing. Dipakai **kapal tunggal** (`NW.boat`, fisika tidak berubah, tuas MAJU/NETRAL/MUNDUR) **dan kapten Kapal Rombongan** (lewat "host" `NW.kemudi.show(host)`; lihat §9 untuk batas MUNDUR).
3. **Kotak di kapal** — kotak pendingin digambar di kapal tunggal (`NW.delivery.drawCargo`).
4. **Kapal Rombongan 3 pemain** — server-authoritative lewat WebSocket multiplayer yang ada; kursi kapten + 2 penumpang; kapal & awak digambar; hanya kapten mengemudi — lewat **UI Kemudi** bila `NUSA_KEMUDI` ON, atau joystick/HUD lama bila OFF — mengantar dan menerima hadiah.
5. **Pelabuhan Kota (dasar)** — area `selat` yang sudah ada (tanpa ID area baru): dermaga, gudang, pasar, warung, kotak, papan tujuan.
6. **Mobil pendingin Pak Damar + animasi** — mobil boks baru, pintu belakang, angkat kotak, mobil berangkat hanya setelah Deliver terakhir dikonfirmasi server (tepat sekali), lot kosong + "Pengiriman hari ini selesai" setelah itu.
7. **Ketahanan** — hasil tak pasti (`unavailable`, `auth_unavailable`, `internal`, …) memakai ulang `opId`; ditolak → `opId` baru; 409 "belum sampai" dideteksi dari state (`sailMs`/`minTripMs` + resync), bukan teks; dua pemilik quest bersamaan lokal per pemain; atap, mobil, dan polesan visual selat.

**Belum / bukan bagian Fase A:** Visual Kota penuh, Ide 08 (Worker 01: 08B), animasi/pasar kota lanjutan, gigi MUNDUR untuk Kapal Rombongan (butuh perubahan kontrak server, lihat §9).

## 3. Flag (semua bawaan MATI)
| Flag | Lokasi | Bawaan di checkpoint | Terverifikasi |
|---|---|---|---|
| `window.NUSA_DELIVERY` | `cloud/config.js` (klien) | `false` — `delivery/*` tidak diunduh | build `firebase/public/cloud/config.js` + tes nol-unduhan (test_delivery) |
| `window.NUSA_KEMUDI` | `cloud/config.js` | `false` — `kemudi/*` tidak diunduh | idem + test_delivery E-seri |
| `window.NUSA_ROMBONGAN` | `cloud/config.js` | `false` — `rombongan/*` tidak diunduh | idem + test_rombongan |
| `NUSA_BOAT` | `cf-multiplayer/wrangler.toml` (env Worker `nusa-multiplayer`) | `"tidak"` (kapal hanya jika `"ya"`) | `wrangler.toml` baris 17; `roomOpts()` membandingkan `=== "ya"`; unit-boat |
| `gameFlags.pakDamar` | **backend #59** (`shop_config/main.features`) | `false` (gagal-tertutup; `ecoDamar*` → 404) | kontrak `CONTRACTS.md` §A; **tidak ada di repo game** |
| `gameFlags.kapalRombongan` | **backend #59** | `false` | idem |

Catatan keamanan flag klien: `window.NUSA_*` boleh dipasang pemain lewat konsol, tetapi hanya mengunduh kode UI. Server tetap menolak (`pakDamar=false` → 404; kapal butuh `bo:1` dari welcome). Tidak ada adapter/bypass `window` di kode produk (adapter uji lama sudah dihapus); `NW.delivery/port/rombongan/kemudi` hanya namespace modul biasa (`_st`/`_gate` = pegangan tes read-only seperti modul lain). Klien tidak pernah menghitung koin/hadiah; `Core.hasForbidden` menjaga request tak memuat uang/uid/role.

## 4. Ketergantungan backend #59 (Worker 01)
Harus sudah live **sebelum** flag klien/server apa pun dinyalakan:
- Fungsi `ecoDamarState|Load|Unload|Sail|Abort|Deliver` (`POST /fn/<nama>`), logika dari `economy/damar-core.js` yang disalin ke `firebase/functions/lib/damar-core.js` oleh `firebase/scripts/sync-economy.js` (salinan sudah ikut di repo game ini).
- `gameFlags` mengembalikan `{leaderboard, socialHome, pakDamar, kapalRombongan}`; `POST /api/features` untuk Owner.
- Rate limit 240 permintaan/menit/pemain; hari = jam server WIB (reset 00:00 UTC+7); pelayaran minimal 45 dtk; segar ≤20 mnt.
- **Angka hadiah (900 + maks 300) adalah ANGKA UJI** (Worker 01) — butuh persetujuan Owner sebelum `pakDamar` dinyalakan. Angka 777 di bukti visual hanyalah angka server tiruan.
Perubahan backend untuk checkpoint ini: **tidak ada**.

## 5. Ketergantungan multiplayer (`nusa-multiplayer`)
- Berkas: `mp/proto.js`, `mp/room-core.js`, `mp/client.js`, `cf-multiplayer/src/index.js`, `cf-multiplayer/wrangler.toml`.
- Kapal hanya diproses/disiarkan bila env `NUSA_BOAT="ya"` (welcome membawa `bo:1`). Kapal **juga** butuh `gameFlags.kapalRombongan=true` — kedua sisi harus ON.
- DO menyimpan struktur kapal (`storage "boats"`) hanya saat berubah (bukan per frame; bukan D1/Firestore); dipulihkan lewat `blockConcurrencyWhile` saat DO bangun.
- Allowlist area kapal: `muara, laut, selat, toba, sf2`; area lain ditolak (`bn`).
- Klien lama tetap melihat pemain yang duduk di kapal server; `vis:false` lama diganti aturan itu. Worker multiplayer harus di-deploy **sebelum/bersama** game agar klien baru dan server sepakat (dengan `NUSA_BOAT="tidak"` perilaku identik produksi).

## 6. Urutan deploy yang disarankan (semua dengan flag OFF)
1. Backend #59 (Worker nusa-api + Functions) dengan `pakDamar=false`, `kapalRombongan=false`. Verifikasi `gameFlags` → keduanya `false`.
2. `nusa-multiplayer` dengan `NUSA_BOAT="tidak"` (default). Verifikasi welcome tanpa `bo:1`.
3. Game (Hosting) dari checkpoint ini: `bash firebase/scripts/build-hosting.sh` + `node firebase/scripts/cek-rilis.js`; lewat workflow manual "Deploy Nusa Island" (pemilik + ketik `deploy`). Verifikasi: tidak ada unduhan `delivery/`, `kemudi/`, `rombongan/`; Muara & kapal lama identik.
4. Soak semalam (hari WIB berganti) sebelum menyalakan apa pun.

## 7. Urutan menyalakan flag, satu per satu (jeda dan pantau di antara langkah)
1. **UI Kemudi** — ubah `NUSA_KEMUDI=true` di `cloud/config.js`, build + deploy Hosting. Hanya klien (tanpa server/hadiah); paling rendah risikonya. Pantau error kapal tunggal; bila `NUSA_ROMBONGAN` juga ON, kapten rombongan otomatis memakai Kemudi (kirim hanya `steer{d,th}`/`anchor` yang sudah ada di protokol).
2. **Pengiriman Pak Damar** — setelah angka hadiah disetujui: `pakDamar=true` di server **dan** `NUSA_DELIVERY=true` (build Hosting). Uji dengan akun Owner dulu: kemas → muat → berlayar solo → antar → hadiah tepat sekali. Pantau 409/429 dan jumlah panggilan `ecoDamar*`.
3. **Kapal Rombongan** — `NUSA_BOAT="ya"` (Worker), `kapalRombongan=true` (server), `NUSA_ROMBONGAN=true` (build Hosting). Uji 2–3 akun nyata; pantau DO (`storage`), latensi, kursi tertahan saat putus-sambung.
(`NUSA_DELIVERY` hanya benar-benar menyala bila langkah 2 di server juga ON; tiap tombol klien membutuhkan build ulang karena nilai ada di `cloud/config.js`.)

## 8. Rollback
- **Cepat tanpa deploy (server):** `pakDamar=false` → `ecoDamar*` → 404 dan UI menyembunyikan titik masuk pada `gameFlags` berikutnya; `kapalRombongan=false` dan/atau `NUSA_BOAT="tidak"` → kapal tidak muncul/ditolak, awak turun. Data `boats` di DO tidak dipakai lagi (aman dibiarkan).
- **Klien:** set `NUSA_*=false` di `cloud/config.js` lalu deploy ulang, atau gunakan Firebase Hosting rollback ke rilis sebelumnya.
- **Worker multiplayer:** `wrangler rollback` / deploy versi sebelumnya; dengan `NUSA_BOAT="tidak"` perilakunya identik produksi.
- **Data:** tidak ada migrasi/backfill. Menurut kontrak, ikan yang sedang di kotak server kembali ke inventaris pada pergantian hari WIB; **konfirmasikan dengan Worker 01** perilaku bila flag dimatikan di tengah hari (belum diuji di Firestore nyata).
- Hadiah yang sudah dibayar server tidak ditarik oleh rollback (server-authoritative).

## 9. Keputusan terbuka untuk Owner
- **UI Kemudi untuk kapten Kapal Rombongan — TERPASANG** (checkpoint ini). Syarat otoritas: hanya kapten melihat/memakai Kemudi; penumpang tak bisa mengirim gerak/jangkar (klien tak mengirim; klien yang dipalsukan ditolak server `captain`); posisi/kecepatan tetap dari server; kontrak Worker 01 **tidak diubah** (hanya `steer{d,th}` dan `anchor` yang sudah ada). Pemetaan: setir → arah (langkah 45°, niat klien; server yang menentukan), tuas MAJU → `th=2`, NETRAL → `th=0`; knot dari kecepatan server.
- **Keterbatasan yang butuh keputusan Owner/Worker 01: gigi MUNDUR.** Protokol kapal (`steer.th ∈ {0,1,2}`, kecepatan `SPD=[0,1.6,3.2]`) tidak punya gigi mundur dan kecepatan negatif. Sesuai instruksi (server tidak boleh diubah bila protokol tak cukup), tuas MUNDUR pada Kapal Rombongan **ditampilkan nonaktif** (kapal tunggal tetap bisa mundur). Menambahkannya = perubahan kontrak server (mis. `th=-1`, validasi arah/kecepatan, uji DO) — **dilaporkan, tidak dikerjakan**.
- Perilaku sengaja: tuas hanya punya dua posisi efektif pada rombongan (`th=1` tak terjangkau dari tuas); kapal berhenti di dinding jalur (geometri server) walau tuas masih MAJU — label tuas mengikuti niat klien, kecepatan/knot mengikuti server.
- Kontrak server yang diamati tes: bila kapten putus dan ada penumpang terhubung, penumpang berkursi terkecil **langsung** dipromosikan (jangkar turun); kursi ditahan 20 dtk hanya berarti bila tak ada penumpang terhubung. Kapten lama yang kembali menjadi penumpang tanpa kontrol.
- Persetujuan angka hadiah Pak Damar (lihat §4).

## 10. Tes (berurutan; `bash tests/run-fase-a.sh`)
Dijalankan satu per satu di SHA `fd803a3` + dokumen (kode produk identik). Tidak ada suite yang dijalankan paralel; CI repo (`.github/workflows/*`) hanya menjalankan unit test + `cek-rilis` dan tidak menjalankan suite Playwright, jadi tidak ada konfigurasi paralel yang menghasilkan kegagalan palsu. Suite sensitif beban (`test_bumbu24`, port*) **jangan** diparalelkan.

| Suite | Hasil |
|---|---|
| Unit (45 berkas `tests/unit-*.js`) | 44 lulus; 1 baseline: `unit-username` (`unit-kemudi` kini 8 uji: +gas/setir/knot rombongan) |
| test_ekonomi | 22/22 |
| test_bumbu24 | 104/104 |
| test_bumbu241 | 83/83 |
| test_boat (kapal) | 17/17 |
| test_delivery (Pengiriman + Kemudi) | 35/35 × 3 run |
| test_rombongan | 51/51 × 3 run |
| **test_kemudi_rombongan** (baru: tiga klien, kapten + Kemudi) | 72/72 — 3 run berturut-turut sesudah menstabilkan tes (lihat catatan) |
| test_port | 41/41 × 3 run |
| test_port_polish | 49/49 × 3 run |
| test_port_rombongan | 16/16 × 3 run |
| test_quest_owner | 48/48 |
| test_house (Rumahku) | 83/83 |
| test_rumahku_sosial | 25/25 |
| test_rumahku_flag_server | 2/2 |
| test_podium | 24/24 |
| test_pilih_dunia | 43/43 pada 2 run terpisah; di dalam pelari penuh 42/43 (6c, cloud-save counter, tak terulang) — lihat catatan |
| build-hosting | OK |
| cek-rilis | OK — 22 fitur wajib, 135 aset index |
| Scan rahasia (diff vs produksi) | bersih: tanpa token/kunci privat/UID/email/`.env`/berkas sementara |

Sebelumnya (hardening PR #136): `test_delivery` 10× berturut-turut 35/35 setelah akar penyebab A3 ditemukan (panggilan `gameFlags` sah dari `house/social.js`, bukan dari pengiriman).

### Catatan hasil terbaru (penutupan celah Kemudi kapten rombongan)
- Suite penuh dijalankan ulang berurutan pada kode final. `test_delivery` sempat gagal 4 uji tata letak (tombol "Pulang" tersembunyi berukuran 0×0 merusak uji target sentuh kapal tunggal) — **diperbaiki di produk**: tombol dibuat di DOM hanya saat dibutuhkan; lalu 35/35 × 3.
- `test_kemudi_rombongan` di pelari sempat gagal 1 uji pada 2 dari 3 run (K10c, K12): pemeriksaan keadaan UI yang tak menunggu pembaruan 200 ms. Tes diberi penantian; 3 run berturut-turut sesudahnya 72/72. Bukan perubahan perilaku produk.
- `test_pilih_dunia` kini 43/43 (2 run); langkah 6a/6b yang dulu gagal sama dengan produksi tidak gagal lagi pada run ini (penyebab belum diselidiki; tidak terkait Kemudi). Satu kegagalan 6c muncul sekali di dalam pelari penuh dan tak terulang pada 2 run terpisah — flake waktu; dicatat apa adanya.
- Cakupan tes baru (tiga klien): hanya kapten punya kontrol; penumpang (UI dan klien dipalsukan) ditolak server `captain`; setir/tuas/knot/kompas/jangkar; memancing hanya saat jangkar turun & kapal berhenti, dan ditutup aman (tanpa hasil ikan klien) bila jangkar diangkat; pergantian kapten tanpa reload; kapten lama kembali sebagai penumpang tanpa kontrol; putus-sambung 20 dtk (kapten sendirian: kursi ditahan lalu dilepas); kapten keluar; pindah area & Pelabuhan Kota; flag klien/server/`NUSA_BOAT` OFF; kapal tunggal tak berubah; tata letak 360×740, 412×915, 740×360, 1280×800 tanpa menutupi chat/indikator pemain/HUD/status muatan/tombol.

### Kegagalan baseline (identik dengan produksi `435c63d`, dari checkpoint sebelumnya)
- `unit-username` — keluaran byte-identik di produksi dan checkpoint (exit 1).
- `test_pilih_dunia` langkah **6a** ("setelah refresh: tetap Singleplayer") dan **6b** ("progres sama setelah refresh") — gagal sama persis pada 2 run di worktree produksi dan 2 run di checkpoint (daftar PASS/FAIL identik).
- `test_multiplayer.py` — di luar daftar checkpoint dan tidak dijalankan ulang; Worker 01 mencatat gagal identik di basis tanpa perubahan (`#gwContinue` timeout, akun uji kedua).
Tidak ada kegagalan baru yang disamarkan sebagai baseline.

## 11. Bukti visual (data dev/mock; pita merah "DEV/MOCK" di tiap gambar)
Folder `docs/ai-handoff/fase-a-final/` (dibuat ulang oleh `python3 tests/browser/shots_fase_a.py`):
1. `fase-a-1-enam-ikan-dua-kotak.png` — enam ikan dipilih dan mengisi dua kotak (3+3), tombol "Muat ke kapal".
2. `fase-a-2-kapal-rombongan-tiga-pemain-berlayar.png` — tiga pemain di satu kapal berlayar (tiga layar): **kapten memakai UI Kemudi** (setir, tuas MAJU, knot, kompas, jangkar, Peta Laut, status muatan), dua penumpang tanpa Kemudi.
3. `fase-a-3-kapal-tiba-membawa-kotak-ke-mobil.png` — kapal berlabuh di Pelabuhan Kota, kapten membawa kotak ke mobil.
4. `fase-a-4-mobil-berangkat-hasil-server.png` — mobil melaju (kiri) dan panel hasil dari respons server tiruan (kanan). Panel hasil memang baru tampil setelah mobil pergi.
Angka 777 = angka server tiruan lokal, bukan produksi.

## 12. Inventaris diff vs produksi (`435c63d..checkpoint`)
- **Kode produk (29):** `audio/sfx.js`; `cf-multiplayer/src/index.js`; `cf-multiplayer/wrangler.toml`; `cloud/config.js`; `delivery/{client,core,port}.js` + `delivery.css`; `economy/core.js`; `economy/damar-core.js`; `firebase/functions/lib/{damar-core,economy-core}.js` (salinan otomatis); `firebase/scripts/{build-hosting.sh,sync-economy.js}`; `game.js`; `index.html`; `kemudi/{client,core}.js` + `kemudi.css`; `mp/{client,proto,room-core}.js`; `rombongan/{client,core}.js` + `rombongan.css`; `world/{areas/muara,areas/selat,boat,world}.js`.
- **Kontrak backend:** `economy/damar-core.js` + hook `opts.damar` di `economy/core.js` (+ salinan Functions); `docs/ai-handoff/CONTRACTS.md`.
- **Kontrak multiplayer:** `mp/proto.js`, `mp/room-core.js`, `mp/client.js`, `cf-multiplayer/*`.
- **Tes (14 + pelari):** `tests/browser/test_{boat,delivery,kemudi_rombongan,port,port_polish,port_rombongan,rombongan}.py`; `tests/dev/mp-dev-server.js`; `tests/unit-{boat,damar,delivery,kemudi,port,rombongan}.js`; baru di checkpoint: `tests/run-fase-a.sh`, `tests/browser/shots_fase_a.py`.
- **Dokumen:** `docs/ai-handoff/{CONTRACTS,DECISIONS,MASTER-PLAN-IDE-01-09}.md`, `codex/REVIEW.md`, `worker-01/STATUS.md`, `worker-02/STATUS.md`, `FASE-A-FINAL.md` (ini).
- **Aset/audio:** tidak ada berkas aset biner baru di kode produk; hanya 4 efek suara sintetis di `audio/sfx.js` (`kotak_angkat`, `mobil_pintu`, `mobil_mesin`, `kirim_selesai`). 4 PNG bukti di `docs/ai-handoff/fase-a-final/`.
- **Dikembalikan ke produksi:** 14 PNG `docs/kunjungi-rumah/*` dan `docs/rumahku-sosial/*` yang ikut berubah (hasil regenerasi tes) di commit `9ca3aa2`.
- **Tidak ada:** kode Ide 08, Visual Kota penuh, secret/token, data pemain, berkas sementara, fixture tes dalam build (`firebase/public` tidak memuat `tests/`/`docs/`), adapter/bypass `window`, hadiah/koin dihitung klien, flag menyala bawaan.
- `firebase/public` (hasil build) tidak dilacak git.

## 13. Risiko yang belum terbukti di Firestore/Cloudflare nyata
Seluruh tes memakai server tiruan lokal (route Playwright mengikuti kontrak) dan dev server multiplayer lokal. **Belum terbukti:**
- Transaksi Firestore `ecoDamar*` sungguhan: kontensi, idempotensi `opId` di bawah beban, pemindahan ikan kotak↔inventaris, pergantian hari WIB, kuota baca/tulis.
- Rate limit 240/menit dan `429` pada pemakaian nyata; jam server vs jam klien untuk `minTripMs`/kesegaran.
- Durable Object nyata: hibernasi + `blockConcurrencyWhile` memulihkan kapal, ukuran/biaya `storage.put`, latensi WebSocket 3 pemain lintas jaringan dan ISP, putus-sambung 20 dtk di jaringan seluler.
- Auth sungguhan (`auth_unavailable` hanya disimulasikan), CORS/`ALLOWED_ORIGINS` untuk jalur baru.
- Perilaku di perangkat Android/iOS nyata (viewport 360×740, 412×915, 740×360 hanya emulasi); performa render selat di HP lama.
- Perilaku bila flag dimatikan di tengah perjalanan/pesanan (lihat §8).
- Angka hadiah dan keseimbangan ekonomi (masih angka uji).
