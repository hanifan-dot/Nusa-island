# Rilis tanpa Google Cloud Shell: tombol "Deploy Nusa Island" di GitHub

Setelah disiapkan SEKALI (±5 menit, semuanya lewat browser HP), setiap update cukup: **GitHub → Actions → Deploy Nusa Island → Run workflow → pilih cabang → ketik `deploy` → setujui**. Tidak ada Cloud Shell, tidak ada perintah.

## Yang dilakukan tombol ini (dan yang TIDAK)
- Hanya berjalan bila kamu menekan **Run workflow** (`workflow_dispatch`). Tidak pernah otomatis pada push, PR, atau jadwal.
- Tahap 1 "Cek cepat" (tanpa rahasia): konfirmasi `deploy` diketik benar, cabang memuat produksi terbaru (`uji/gabungan-kedai-ekonomi`), tes logika multiplayer lulus.
- Tahap 2 "Deploy" memakai **Environment `production`**. Bila kamu menambahkan dirimu sebagai *Required reviewer* (langkah 3), tahap ini **menunggu persetujuanmu** dulu; rahasia baru bisa dibaca setelah kamu menyetujui.
- `firebase/scripts/rilis.sh` (skrip yang sama dengan yang dulu dipakai di Cloud Shell) menjalankan pagar pengaman, men-deploy HANYA Worker `nusa-multiplayer` (target `semua`/`server`), membangun game mode `produksi` (QRIS, Worker ekonomi, Login 7 Hari, Cloud Save, Kedai, Event, Menu ☰), menayangkan ke Firebase Hosting (target `semua`/`game`), lalu memeriksa bahwa konfigurasi toko live tidak berubah.
- TIDAK menyentuh Worker `nusa-api`, Firestore Rules, atau pembayaran. Tidak memakai Blaze.
- Pilihan **target**: `semua` (server + game), `server` (hanya Worker multiplayer, game live tidak berubah), `game` (hanya Hosting).

## Penyiapan satu kali (tindakan yang memang butuh kamu)
Rahasia tidak boleh ditulis di repo atau chat, jadi 3 nilai ini harus kamu tempel sendiri ke GitHub. Login Wrangler di Cloud Shell tidak bisa dipakai GitHub, jadi token baru memang diperlukan sekali ini.

1. **Cloudflare** (dashboard.cloudflare.com di browser HP): *My Profile → API Tokens → Create Token → template "Edit Cloudflare Workers" → Create* → salin token. **Account ID**: halaman utama akun → ⋮ di samping nama akun → *Copy account ID*.
2. **Firebase** (console.firebase.google.com, bukan Google Cloud Console): proyek `nusa-island-d2023` → ⚙ *Project settings → Service accounts → Generate new private key* → berkas JSON terunduh; buka isinya dan salin SEMUA teks. Bila deploy Hosting nanti ditolak karena izin, di *Project settings → Users and permissions* beri akun layanan itu peran *Firebase Hosting Admin*.
3. **GitHub** (repo `hanifan-dot/Nusa-island`): *Settings → Environments → New environment → `production`* → centang **Required reviewers** → pilih dirimu → Save. Di halaman environment yang sama, *Add environment secret* tiga kali: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `FIREBASE_SERVICE_ACCOUNT` (isi JSON dari langkah 2).
   Untuk rilis `target=server` saja, dua secret Cloudflare sudah cukup.

Catatan jujur: workflow ini belum pernah dijalankan di GitHub sungguhan (tidak bisa dari lingkungan pengembangan). Berkasnya divalidasi sintaksnya dan `rilis.sh` diuji dengan alat palsu untuk mode CI; kegagalan pertama yang mungkin terjadi: izin akun layanan Firebase (lihat langkah 2) atau versi alat di runner. Aman diulang: tidak ada yang berubah di game live sebelum langkah "Tayangkan".

## Cara memakai
1. GitHub → *Actions* → **Deploy Nusa Island** → *Run workflow*.
2. Pilih **cabang** (harus turunan produksi terbaru), **target**, ketik `deploy` → *Run workflow*.
3. Tunggu notifikasi "Review deployments" → buka → *Approve and deploy*.
4. Selesai: log menampilkan alamat server dan hasil pemeriksaan akhir.

## Keamanan
- Rahasia hanya tersimpan sebagai *Environment secrets*; dibaca hanya oleh job deploy setelah persetujuan; kredensial Firebase ditulis ke berkas sementara runner dan dihapus di akhir; log GitHub menyamarkan nilai secret.
- Setelah selesai, kamu bisa mencabut token Cloudflare / menghapus kunci akun layanan kapan saja; rilis berikutnya tinggal menempel yang baru.
- Rollback: Firebase Console → Hosting → Riwayat rilis → Kembalikan. Matikan multiplayer darurat: Cloudflare → Workers → nusa-multiplayer → Variables → `MP_ENABLED = 0`.

## Koordinasi dengan WORKING 01
Hanya ada SATU workflow rilis (`.github/workflows/deploy-nusa-island.yml`) dan SATU skrip (`firebase/scripts/rilis.sh`). Fitur lain (mis. kunjungan rumah) cukup menambah kode; jangan membuat workflow deploy kedua untuk Worker/Hosting yang sama (dua deploy berebut). Tidak ada workflow lain di repo saat ini.
