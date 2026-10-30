# Tahap 3 — Google Login, Cloud Save & Akun Owner

Status: **kode selesai dan diuji dengan adapter demo + SDK Firebase palsu; BELUM terhubung ke proyek Firebase sungguhan.**
Proyek Firebase untuk Nusa Island belum ada, dan paket npm/Firebase Emulator tidak tersedia di lingkungan pengembangan
(jaringan dibatasi). Tidak ada proyek Firebase yang dibuat atau diubah (termasuk proyek Kota Nusa).

## Cara kerja singkat

| Bagian | Berkas | Keterangan |
|---|---|---|
| Layar login, peringatan tamu, pilihan progres, Profil Nelayan | `cloud/ui.js`, `cloud/cloud.css` | CSS saja (tanpa loop JS), animasi dimatikan setelah gerbang ditutup |
| Logika sinkronisasi | `cloud/cloud.js` (`NW.cloud`) | rev + konflik + offline + cadangan; kunci simpanan lama `nusa-island-v1` **tidak berubah**, `SAVE_VERSION` tetap 10 |
| Adapter Firebase | `cloud/adapter-firebase.js` | memuat SDK 10.14.1 dari gstatic.com hanya bila `cloud/config.js` terisi |
| Adapter demo | `cloud/adapter-demo.js` | hanya dengan `?cloud=demo`; "server"-nya menjalankan kode yang sama dengan Cloud Functions |
| Logika server (satu sumber) | `firebase/functions/lib/core.js` (salinan: `cloud/core.js`) | validasi, konflik, cadangan, guard Owner |
| Cloud Functions | `firebase/functions/index.js` | jembatan tipis ke Admin SDK |
| Rules | `firebase/firestore.rules` | tolak semua; pemain hanya boleh **membaca** save miliknya; tidak ada tulis dari klien |
| Daftarkan Owner | `firebase/scripts/set-owner.js` | dijalankan administrator, bukan dari game |

Bila `cloud/config.js` kosong (keadaan sekarang) dan tidak ada `?cloud=demo`, fitur cloud **non-aktif total**: tidak ada layar login, tidak ada
request jaringan, game persis seperti Bumbu 2.4.1 (ditambah tombol 👤 Profil Nelayan yang berfungsi lokal).

### Alur pemain
1. Layar login: **Login dengan Google** atau **Main sebagai Tamu**.
2. Tamu → popup *PERINGATAN DATA TAMU* (teks persis dari spesifikasi) dengan **Lanjut Main**, **Kembali Login Google**, dan **X** (menutup & kembali ke login). Pemain tidak masuk game sebelum menekan *Lanjut Main*.
3. Login Google → UID Firebase menjadi UID pemain. Cloud Save berjalan otomatis (tunda 6 dtk setelah perubahan, saat tab disembunyikan, saat kembali online).
4. Tamu → Google (tombol di Profil atau di layar login):
   - cloud kosong + progres tamu → progres **diunggah** (cadangan tamu dibuat dulu);
   - cloud berisi + perangkat kosong → cloud dimuat;
   - **keduanya berisi → dialog pilihan** (Pakai Cloud / Pakai Perangkat / Batal). **Tidak pernah digabung atau dijumlahkan.** Yang tidak dipilih tetap dicadangkan (di perangkat dan, untuk cloud, di server);
   - hasil ditampilkan lewat notifikasi.
5. Logout: data akun diamankan sebagai cadangan lokal lalu kunci utama dikosongkan, sehingga pemain tamu/akun berikutnya di perangkat yang sama **tidak mewarisi** progres akun sebelumnya.

### Model data cloud
`users/{uid}/saves/current` = `{ rev, savedAt, deviceId, opId, hash, summary, flags, data }` (`data` = teks JSON simpanan persis seperti di `localStorage`).
`users/{uid}/backups/s0..s4` = 5 cadangan bergilir (dibuat server sebelum setiap penimpaan). `owners/{uid}`, `ownerSandbox/{uid}` = hanya server.
Email **tidak** disimpan di Firestore dan **tidak** ditampilkan di UI.

### Konflik & ketahanan
- Setiap tulis membawa `baseRev`; server menolak (`conflict`) bila cloud sudah maju, tanpa menimpa. Menimpa hanya dengan `confirmOverwrite` dari pilihan eksplisit pemain.
- `opId` membuat percobaan ulang aman (tidak menggandakan). Jeda minimum 1,5 dtk/akun (anti-banjir).
- Offline: progres tetap tersimpan lokal, status "Offline", sinkron otomatis saat online (backoff 2→60 dtk).
- Data ditolak server (mis. koin > 1 miliar, UID ikan ganda, kunci terlarang) **tidak menghapus** data lokal; pemain diberi tahu.

## Akun Owner (tambahan Tahap 3)

Prinsip: **hak Owner tidak pernah ditentukan oleh teks email di JavaScript.** Server (`requireOwner` di `core.js`) menuntut SEMUA:
custom claim `role == "owner"` **dan** dokumen `owners/{uid}` aktif (didaftarkan administrator) **dan** `email_verified == true` **dan** penyedia `google.com`.
Pesan penolakan seragam ("Akses ditolak") agar tidak membocorkan syarat yang gagal. Semua callable Owner (`ownerAccess`, `ownerSandboxLoad/Save`) memeriksa ini di backend.

**Mode Uji Owner** (sandbox): membuka semua kapal, rumah (Lv 10), wilayah (lewat level kapal), joran, umpan, dan coolbox. Koin simulasi (9×10⁹, terisi ulang)
berada di **penyimpanan terpisah**: kunci lokal `nusa-island-v1-owner-sandbox` dan dokumen server `ownerSandbox/{uid}`. Save ekonomi normal (`nusa-island-v1`, `users/{uid}/saves/current`)
tidak disentuh, dan `writeSave` menolak data sandbox (kunci `sandbox`/`owner`, koin di atas 1 miliar). Tidak ada fungsi transfer koin antarpemain di backend.
Pembayaran asli tidak ada dan `ownerAccess` mengembalikan `realPayments:false`. Skin premium belum ada sistemnya (Tahap 4): sandbox hanya memasang penanda `owner.premium = "all"`.
Akses Control Center disiapkan (`ownerAccess` → `controlCenter.phase = "3.5"`); halamannya dikembangkan di Tahap 3.5.

### Mendaftarkan akun Owner (dilakukan administrator, sekali)
1. Login ke game dengan akun Google Owner **sekali** agar akun terbentuk di Firebase Authentication; salin **UID**-nya dari Firebase Console → Authentication → Users.
2. Di komputer administrator (kredensial di luar repo):
   ```bash
   cd firebase/scripts && npm i firebase-admin
   export GOOGLE_APPLICATION_CREDENTIALS=/jalur/aman/di-luar-repo/service-account.json
   export OWNER_EMAIL="email-akun-owner@gmail.com"      # dibaca dari lingkungan; TIDAK disimpan di repo
   node set-owner.js --uid <UID_OWNER>
   ```
   Skrip memeriksa email akun = `OWNER_EMAIL`, email terverifikasi, dan penyedia Google, lalu memasang claim dan mencatat `owners/{uid}` **tanpa email**.
   Cabut: `node set-owner.js --uid <UID> --revoke`.
3. Owner login ulang (atau tunggu token menyegarkan) agar claim berlaku.

## Konfigurasi Firebase yang masih harus dilakukan pemilik proyek
1. Buat proyek Firebase **baru** untuk Nusa Island (jangan memakai proyek Kota Nusa) dan paket Blaze (Cloud Functions membutuhkannya).
2. Authentication → Sign-in method → aktifkan **Google**. Authorized domains: tambahkan domain tempat game di-host.
3. Firestore Database (mode produksi), pilih region (disarankan `asia-southeast2`, sesuaikan `NUSA_REGION`/`functionsRegion`).
4. `cp firebase/.firebaserc.example firebase/.firebaserc` lalu isi ID proyek. Deploy dari `firebase/`: `firebase deploy --only firestore:rules,functions`
   (di `functions/` jalankan `npm i` dulu). **Belum pernah dijalankan.**
5. Isi `cloud/config.js` dengan konfigurasi web app (apiKey web bersifat publik; keamanan ada di Rules + Functions).
6. Sangat disarankan: aktifkan **App Check** (lalu ubah `enforceAppCheck: true` di `index.js`), batasi apiKey ke domain game, atur anggaran/alert.
7. Daftarkan Owner (bagian di atas).
8. Opsional: tambahkan *Subresource Integrity* untuk skrip gstatic dan Content-Security-Policy yang mengizinkan `www.gstatic.com`, `*.googleapis.com`, `*.firebaseapp.com`.

## Batasan keamanan (jujur)
Game berjalan di browser. Pemain tetap bisa mengubah koin/item **di perangkatnya sendiri** (DevTools). Yang dilakukan server:
UID dari token terverifikasi, validasi struktur & batas wajar, penolakan data mustahil, penandaan lonjakan koin (`flags`: `lonjakan-koin`, `penghitung-mundur`, hanya dicatat),
cadangan bergilir, anti-banjir, dan isolasi akun. Itu **bukan** anti-cheat penuh: tanpa simulasi game di server, nilai yang tampak wajar tetap diterima.
Untuk ekonomi yang benar-benar tepercaya (mis. Premium Shop/QRIS, Tahap berikutnya) transaksi harus dihitung server.
Memaksa mode sandbox lewat storage hanya mengubah salinan lokal di perangkat itu sendiri; server menolak dan menutup mode itu, dan tidak ada yang tersinkron.

## Pengujian
- `node tests/unit-cloud.js` — 69 pemeriksaan logika server (validasi, isolasi akun, konflik, cadangan, guard Owner, sandbox terpisah, rules statis, tidak ada email/kunci di repo).
- `python tests/browser/test_tahap3.py` — 114 pemeriksaan di browser (login/logout, tamu & popup, save/load, migrasi tamu→Google & v4, konflik, offline, isolasi akun, Owner & pemalsuan, adapter Firebase dengan **SDK palsu**, layar HP, performa-emulasi).
- **Belum teruji:** Google Sign-In sungguhan, Firebase Auth/Firestore/Functions/Security Rules sungguhan, Admin SDK & `set-owner.js` (membutuhkan proyek & kredensial), App Check, perilaku popup/redirect Google di Android fisik. Rules hanya diperiksa secara statis (teks), bukan dijalankan di emulator.
