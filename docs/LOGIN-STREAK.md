# Hadiah Login 7 Hari (Login Streak)

Status: **kode selesai dan diuji dengan penyimpanan simulasi; BELUM diuji di Firebase asli.** Aturan Firestore (`firebase/firestore.rules`, blok
`users/{uid}/streak/state`) belum dideploy dan belum dijalankan di emulator maupun Firestore sungguhan (paket npm dan emulator tidak
tersedia di lingkungan pengembangan). Tidak ada layanan berbayar yang diaktifkan; mode Spark cukup (tanpa Cloud Functions).

## Hadiah

| Siklus | Hari 1 | 2 | 3 | 4 | 5 | 6 | Hari 7 |
|---|---|---|---|---|---|---|---|
| 1 (Hari 1–7) | 20 koin | 3 umpan | 35 koin | Peti Hadiah Kecil (40 koin + 2 umpan) | 5 umpan | 50 koin | **Kapal Perintis Eksklusif** (permanen) |
| 2 (Hari 8–14) | 25 koin | 3 umpan | 40 koin | 30 koin + 2 umpan | 4 umpan | 60 koin | **Joran Pelaut Eksklusif** (permanen) |
| 3 dan seterusnya | sama seperti siklus 2 | | | | | | **1 perabot acak** untuk Rumahku |

Hari 1–6 siklus 2+ ≈ 205 koin + 9 umpan per siklus (kecil dibanding harga upgrade 300 sampai 110.000 koin).

**Umpan Hadiah** adalah stok habis pakai (di game ini "umpan" aslinya level upgrade): satu umpan dipakai otomatis tiap lemparan, hoki ×1,25 dan gigitan ×1,15 lebih cepat.
**Kapal Perintis**: kapal pemain berwarna toska-emas; memancing dari kapal hoki ×1,05. Tidak menggantikan tingkat kapal dan tidak membuka pulau.
**Joran Pelaut**: tampilan toska-emas; kuat ×1,12, tarik ×1,1, batas ikan +15% dari joran biasa yang sedang kamu pakai. Keduanya bisa Dipakai/Dilepas di kalender.
Angka-angka ini ada di `streak/streak.js` (SHIP, ROD, BAIT_*) dan `streak/core.js` (tabel hadiah) dan mudah disetel.

### Perabot (siklus 3+)
13 jenis baru, tidak ada di katalog toko (`streak/core.js` → `FURN_POOL`): biasa 55%, langka 30%, epik 12%, legenda 3%.
Mereka didaftarkan ke `NW.HD.FURN` sehingga masuk `home.furniture` / `home.stored`, bisa digeser, diputar, disimpan, dan ikut Cloud Save.
Perabot yang belum dimiliki selalu dipilih lebih dulu (dihitung dari isi Rumahku DAN daftar pemberian di server). Duplikat baru muncul setelah ke-13 jenis dimiliki.

## Aturan login
1. Satu klaim per hari kalender **Asia/Jakarta** (UTC+7). Hari = `floor((jam server + 7 jam) / 24 jam)`, dihitung Firestore Rules dari `request.time`, bukan jam HP.
2. Melewatkan ≥1 hari kalender: kembali ke Hari 1 pada siklus yang sedang dikerjakan. Siklus yang sudah tamat (Hari 7 diklaim) berlanjut ke siklus berikutnya Hari 1 berapa pun lama bolosnya.
3. Kapal, joran, dan perabot tidak pernah dicabut; kepemilikannya dicatat di buku server dan disinkronkan ulang ke simpanan setiap game dibuka (idempotent).
4. Klaim ganda lewat ubah jam HP, refresh, logout, atau login ulang ditolak karena keputusan ada di server.
5. Tamu / tanpa Firebase: tombol klaim **mati** dengan penjelasan. Tidak ada hadiah lokal yang berpura-pura tersinkron.

## Cara kerja (Spark, tanpa Cloud Functions)
`users/{uid}/streak/state` = `{ total, cycle, pos, lastDay, ship, rod, furn[], last:{cycle,pos,fid}, at }`.
Klien membaca dokumen dari server, menyusun dokumen berikutnya (`Core.planClaim`), lalu menulisnya lewat transaksi Firestore. Rules menerima hanya
transisi yang persis sah (hari = hari server, urutan hari/siklus, kapal/joran/perabot hanya di hari dan siklus yang benar, daftar perabot tanpa duplikat sebelum 13 habis).
Browser tidak mengirim tanggal, hadiah, atau jumlah koin. `Core.validateTransition` (JS) mencerminkan Rules dan dipakai pengujian.

Koin/umpan dikreditkan sekali per klaim: `S.streak.applied` = jumlah klaim yang sudah dikreditkan. Bila simpanan lama dimuat, hadiah klaim terakhir yang belum masuk dipulihkan satu kali.

## Batasan keamanan (jujur)
- Rules memverifikasi **buku klaim** (hari, urutan, kapal, joran, daftar perabot). Rules **tidak** bisa memverifikasi bahwa pemilihan perabot "acak" benar-benar acak (hanya sah/tidak sah), dan jumlah koin/umpan tidak ada di buku server: dikreditkan klien dari tabel tetap ke simpanan yang, seperti seluruh simpanan di mode Spark, bisa diubah pemain di perangkatnya sendiri (lihat `docs/TAHAP3.md`). Pemberian koin yang sepenuhnya tepercaya butuh server yang menghitung ekonomi (pekerjaan PR ekonomi server / Blaze), bukan bagian dari tahap ini.
- Pemain bisa memilih perabot langka tertentu sendiri di buku, tetapi hanya satu per siklus Hari 7 dan tidak bisa duplikat; efek maksimal = urutan perabot, bukan jumlah.
- Penyimpanan palsu (`window.NUSA_STREAK_STORE`) hanya dipakai di mode `?cloud=demo` dan ditandai "MODE DEMO" di layar; di Firebase asli diabaikan.
- Jam yang ditampilkan di layar adalah perkiraan (header `Date` dari host game). Bila meleset di sekitar 00:00 WIB, klaim ditolak server lalu dicoba sekali lagi dengan data segar.

## Yang harus dilakukan pemilik proyek untuk mengaktifkan
1. Deploy Rules (tidak dilakukan otomatis): `cd firebase && firebase deploy --only firestore:rules`.
2. Bangun ulang hosting: `bash firebase/scripts/build-hosting.sh` (sudah menyertakan folder `streak/`) lalu deploy hosting.
3. Uji di Firebase asli (lihat daftar di bawah) dan laporkan hasilnya.

### Daftar uji Firebase asli (belum dilakukan)
- Login Google, buka 🎁, klaim Hari 1: dokumen `users/{uid}/streak/state` muncul, koin +20.
- Klaim kedua di hari sama: ditolak (permission-denied), koin tetap.
- Ubah jam HP: tetap tidak bisa klaim ganda.
- Klaim di dua perangkat bersamaan: salah satu ditolak.
- Lewati satu hari WIB: kembali ke Hari 1.
- Klaim sampai Hari 7: kapal; Hari 14: joran; Hari 21: perabot muncul di Rumahku.
- Aturan ditolak dengan benar bila dokumen dipalsukan lewat konsol (mis. `ship:true` di hari 3).

## Pengujian
- `node tests/unit-streak.js` — 299 pemeriksaan logika murni: hari Jakarta, tabel hadiah, siklus 1/2/3+, reset, 13 perabot tanpa duplikat, distribusi kelangkaan, pemalsuan ditolak, pemeriksaan statis teks Rules.
- `python tests/browser/test_streak.py` — 63 pemeriksaan di browser (UI, klaim, anti-duplikasi, jam HP, putus streak, kapal/joran/perabot, Rumahku, gambar perabot, pemulihan, Cloud Save demo, layar 360 px). Memakai penyimpanan simulasi.
- **Belum teruji:** Firestore Rules di emulator/asli, Firebase asli, Android fisik (Chromium headless = emulasi).
