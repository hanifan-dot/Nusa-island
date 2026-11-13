# Ide 08D — Halaman Sosial Rumahku, Meja Makan, Tamu & Multiplayer (Worker 01)

Status: **Draft PR, flag MATI.** Tidak ada merge, deploy, migrasi, atau perubahan produksi. Harga/porsi/kualitas = nilai uji dari server, menunggu Owner.

## Basis
- Branch: `fitur/ide08d-sosial-meja-makan-20261113`, dibuat dari head PR #139 (08C) setelah pembersihan screenshot (`2885761`).
- Draft PR bertingkat: base = `fitur/ide08c-masak-cuci-20261113` (#139).
- PR #61 (backend, `3737f3e`), #139 dan #138 **tidak diubah**.

## Kontrak backend PR #61 yang dipakai
`dapurMejaState`, `dapurMejaTaruh`, `dapurMejaAmbil`, `dapurMejaBersih`, `dapurMejaTawar`, `dapurMejaBatal`, `dapurMejaTutup` (pemilik) dan `dapurMejaLihat`, `dapurTawaranJawab`, `dapurMejaKeluar` (tamu). Klien hanya mengirim niat + `opId` + pid publik (`dish`, `slot`, `to`, `owner`, `offer`, `accept`). Porsi, kualitas, kedaluwarsa 60 dtk, izin tamu, pengurangan porsi atomik = server. Flag klien: `gameFlags.dapurRumahku` + `socialHome` (keduanya mati bawaan). Kontrak lengkap: `CONTRACT-08D.md` di repo backend.

## File yang berubah
| File | Isi |
|---|---|
| `dapur/halaman.js` (baru) | Tata letak tetap halaman depan (meja makan 6 slot, 4–8 kursi/bangku, meja kopi, payung, lampu gantung, tanaman, nampan), geometri, gambar, lampu hangat malam. Diverifikasi tidak menimpa pintu/jalur/objek lama Lv1–10 |
| `dapur/sosial.js` (baru) | Logika & UI: sinkron pemilik/tamu, taruh/ambil/bersihkan, tawaran, kartu tawaran, animasi (duduk, bawa piring, makan, seruput, reaksi), presence, kursi, siang/malam |
| `world/home.js` | Kait `hooks.halaman` (blocked, candidates, interact, items, glow, camTarget, update) — tanpa variabel global baru |
| `dapur/room.js` | Getter `inset` (kamera bergeser agar sheet tak menutup pemain) |
| `dapur/client.js` | Metode API sosial, `st.social`, pemasangan kait; gerbang `gameFlags` kini dicoba ulang ≤3× bila gagal sementara |
| `dapur/audio.js` | `dapur_seruput`, `dapur_burung`, `dapur_jangkrik` (sintetis, lazy) |
| `dapur/dapur.css` | Blok `.hl-*` (sheet ≤45%, kartu tawaran, reduced motion) |
| `index.html` | Muat `halaman.js`, `sosial.js` |
| `tests/dev/mp-dev-server.js` | Opsi `NUSA_HOUSE_API` (minta izin ruang ke Worker asli) |
| `tests/browser/test_dapur_sosial.py`, `sosial_bridge.mjs` | Tes 08D (Worker sungguhan lewat jembatan, Firestore tiruan, jam bisa dimajukan) |

## Presence realtime
- Posisi, duduk, chat, emoji, outfit memakai multiplayer Rumahku yang ada (`NW.mp`). **Tidak ada penulisan posisi per frame ke Firestore.**
- Sinkron meja: polling ringan (pemilik 4 dtk saat ada tamu/panel terbuka; tamu 4 dtk, 2,5 dtk saat ada tawaran).
- Tawaran hanya tampil bila tamu benar-benar di halaman pemilik (`presentGuest`: mode tamu + di halaman + ruang tersambung + pemilik hadir). Tamu keluar / pindah area / terputus / dikeluarkan → kartu ditutup di klien dan `dapurMejaKeluar` dikirim; pemilik keluar → `dapurMejaTutup`, kartu tamu tertutup. Backend tetap lapisan izin.
- Kursi: tidak bisa dihuni dua pemain (kursi terpakai disembunyikan; tie-break id bila duduk bersamaan). **Kunci kursi hanya di klien** (bukan server).
- Animasi makan pemain lain **diperkirakan** dari berkurangnya porsi + pemain duduk terdekat (tidak ada kanal baru); hasil sebenarnya tetap dari server.
- Reconnect: `opId` dipakai ulang sampai ada jawaban pasti; transaksi server membuat retry tidak menggandakan porsi; kartu lama yang sudah dijawab/habis tidak muncul lagi.

## Privasi
Jawaban tamu tidak berisi UID, email, token, inventaris, saldo, atau daftar masakan pemilik; permintaan hanya memuat kunci niat. Diperiksa otomatis atas seluruh lalu lintas uji (tes 20a–d).

## Dekorasi — keterbatasan
Sistem dekorasi lama (`furn` Rumahku) tidak punya slot tervalidasi untuk set meja makan, sehingga 08D memakai **tata letak tetap yang rapi**. Penempatan bebas oleh pemilik (slot tervalidasi lewat mekanisme Rumahku) dilaporkan sebagai **08E**. Tidak ada pembelian/harga baru; tamu tidak bisa memindah dekorasi.

## Tes (semua lulus)
- `tests/browser/test_dapur_sosial.py`: **125 PASS / 0 FAIL** (flag OFF; tata letak & jangkauan Lv1–10; enam makanan, slot penuh, ambil kembali, bersihkan makanan tersentuh; tamu tanpa izin/ditolak/diterima; tamu tak bisa buka kulkas/ambil bahan/pakai dapur/pindah dekorasi/ambil tanpa tawaran; tawaran terima/tolak/kedaluwarsa; klik ganda; retry opId saat balasan hilang; rebutan porsi terakhir; tamu keluar/dikeluarkan/pemilik keluar/reconnect; privasi; chat & emoji; kursi; outfit; siang/malam; gerak berkurang; 4 ukuran layar 360×740, 412×915, 740×360, 1280×800 termasuk joystick saat sheet terbuka).
- Regresi lulus: `test_dapur`, `test_dapur_masak` (133/133), `test_rombongan` (51), `test_kemudi_rombongan` (72), `test_port_rombongan`, `test_ekonomi`, `test_house`, `test_rumahku_sosial` (25/25), `test_rumahku_flag_server`, `test_delivery`, `test_kedai_hidup`; unit 44/46 (2 gagal = bawaan lama: `unit-leaderboard-stats`, `unit-username`); `build-hosting` memuat `halaman.js`/`sosial.js` (docs tidak ikut); `cek-rilis` OK.
- Gagal bawaan lama yang tidak terkait: `test_multiplayer` (`#gwContinue`), `test_rumah_akuarium`.

## Bukti visual (`docs/ide08d/`)
`d01-halaman-rumahku-siang.png`, `d02-pemilik-menawarkan-tamu-menerima.png`, `d03-tiga-pemain-makan-bersama.png`, `d04-malam-lampu-halaman-kopi.png`.

## Temuan & catatan
- Perbaikan sepanjang uji: sheet tidak dibangun ulang saat hanya hitung mundur berubah (ketukan Terima bisa hilang); tawaran yang sudah dijawab/habis tidak muncul lagi; pencocokan animasi makan tamu yang baru duduk; gerbang flag dicoba ulang.
- Audio halaman tetap **lazy** (kontrak 08C): suasana burung/jangkrik baru berbunyi saat ada "nongkrong" (duduk, panel meja, tamu, tawaran).
- Pengamatan lama (bukan 08D): `a` (outfit) yang terkirim persis saat hello ruang rumah masih menunggu izin bisa terbuang di server dev, sehingga outfit baru tampil setelah dikirim ulang. Tes mengirim ulang; layak ditinjau di jalur Rumahku Sosial.
- Popup undangan lama (`#invPop`) bisa menutupi tombol chat di layar portrait sampai ditutup — perilaku lama.

## Risiko integrasi dengan Visual Kota (Worker 02)
- `world/home.js` disentuh hanya di titik kait `hooks.halaman`; bila Worker 02 mengubah gambar/urutan kedalaman adegan halaman Rumahku atau `drawScene`, periksa ulang `items`/`glow`/`camTarget`.
- `HL.blocked` menambah objek padat di halaman (meja, kursi, payung); aset/dekor baru dari Worker 02 di area depan rumah harus diuji ulang terhadap `halaman.js` (zona kiri/kanan pintu) agar jalur pemain tak tertutup.
- Pencahayaan malam memakai `NW.lightAt` (3 lampu halaman); perubahan pencahayaan kota global akan memengaruhi tampilan.
- Dokumen Worker 02 tidak disentuh.

## Tidak dilakukan (sengaja)
Penempatan dekorasi bebas (08E), harga/koin/buff baru, kanal jaringan baru untuk animasi makan, penguncian kursi di server. 08E tidak dimulai sebelum 08D diterima.
