# Rilis tanpa Cloud Shell: tombol "Deploy Nusa Island" di GitHub

**Rilis lewat HP (setelah penyiapan sekali):** buka github.com di browser HP → repo → *Actions* → **Deploy Nusa Island** → *Run workflow* → pilih cabang & target → ketik `deploy` → *Run workflow* → buka notifikasi/halaman run → *Review deployments* → **Approve and deploy**. Selesai. (Bila tombol Run tak tampak di tampilan HP, pilih menu browser "Situs desktop". Persetujuan juga bisa lewat aplikasi GitHub Mobile; menjalankan workflow dari aplikasi itu belum saya pastikan — pakai browser.)

## Syarat agar tombol muncul
GitHub hanya menampilkan **Run workflow** bila berkas workflow ada di **cabang default (`main`)**. Karena itu berkas ini dipasang lewat **PR terpisah ke `main`** yang hanya menambah `.github/workflows/deploy-nusa-island.yml`. Memasangnya TIDAK merilis apa pun (hanya `workflow_dispatch`). Saat dijalankan kamu memilih cabang rilis; GitHub memakai berkas workflow dari cabang itu. Bila yang dipilih `main`, workflow berhenti aman di "Cek cepat" (main tidak memuat cabang produksi).

## Pengaman berlapis
1. Hanya pemilik repo (`github.actor == pemilik`) yang lolos; selain itu gagal.
2. Wajib mengetik `deploy`.
3. Cabang harus turunan `uji/gabungan-kedai-ekonomi` terbaru, tes multiplayer lulus.
4. **Pemeriksaan versi** (`firebase/scripts/cek-rilis.js`, daftar di `firebase/release-manifest.json`): rilis DITOLAK bila kehilangan Event Megalodon (banner 5 dtk), HUD 4.1, toko QRIS (build harus mode produksi, apiBase terpasang), ekonomi server, Login 7 Hari, Cloud Save, Kedai, Rumahku, atau multiplayer; bila **situs live** memuat aset yang tak ada di calon rilis (artinya akan menimpa fitur live); atau bila kontrak pesan multiplayer berubah. Berjalan di Cek cepat DAN lagi pada hasil build sebelum tayang. Menghapus fitur live harus disengaja (daftar `retired`).
5. Job Deploy memakai Environment `production` → menunggu persetujuanmu; rahasia/variabel hanya terbaca setelah itu.
6. Tidak menyentuh Worker `nusa-api`, Rules, pembayaran; tidak memakai Blaze.

## Dukungan Required reviewers (sudah diperiksa)
Repo ini **publik** (akun pribadi `hanifan-dot`): *Required reviewers* dan *Deployment branches* tersedia di semua paket, termasuk Free. Bila suatu saat repo **privat**, fitur itu hanya ada di GitHub Pro/Team; kamu TIDAK perlu membuatnya publik — pengaman 1–4 dan 6 tetap berlaku tanpa persetujuan (workflow menampilkan peringatan), jadi hindari memberi akses tulis ke orang lain. Saya tidak bisa membuat Environment/secret dari sini (API diblokir), jadi langkah di bawah dilakukan olehmu.

## Penyiapan sekali (tidak bisa saya lakukan)
**A. GitHub → Settings → Environments → New environment `production`:** centang *Required reviewers* (dirimu); *Deployment branches → Selected branches*: tambah `fitur/*` dan `uji/*`.
**B. Cloudflare** (dashboard di HP): *My Profile → API Tokens → template "Edit Cloudflare Workers"* → salin token + Account ID. Tempel di Environment `production` → *Environment secrets*: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. (Cloudflare tidak punya OIDC untuk ini; token tetap perlu, hanya di secret, tidak di chat/repo.)
**C. Login Firebase — pilih salah satu:**
- **Disarankan, tanpa kunci:** jalankan SEKALI di Cloud Shell: `bash <(curl -fsSL https://raw.githubusercontent.com/hanifan-dot/Nusa-island/main/firebase/scripts/siapkan-oidc.sh)` (setelah skrip ada di `main`; atau tempel isi `firebase/scripts/siapkan-oidc.sh`). Skrip tidak membuat kunci; hanya akun layanan `nusa-deploy` berperan Firebase Hosting Admin yang hanya bisa dipakai repo ini. Ia mencetak 2 nilai non-rahasia → tempel di *Environment variables*: `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`. Setelah itu Cloud Shell tidak dipakai lagi.
- **Cadangan tanpa Cloud Shell:** Firebase Console → Project settings → Service accounts → Generate new private key → tempel seluruh JSON ke secret `FIREBASE_SERVICE_ACCOUNT` (jangan kirim ke chat/repo; hapus kunci bila tak dipakai).

Rilis `target=server` hanya perlu langkah A dan B.

## Jujur soal verifikasi
Workflow belum pernah dijalankan di GitHub sungguhan, dan OIDC/izin Firebase belum diuji terhadap proyek live. YAML divalidasi, `cek-rilis.js` diuji (21 kasus lolos/gagal), `rilis.sh` diuji dengan alat palsu. Kegagalan pertama yang mungkin: izin akun layanan atau nilai variabel OIDC; tidak ada yang berubah di game live sebelum langkah "Tayangkan".

## Rollback & darurat
Firebase Console → Hosting → Riwayat rilis → Kembalikan. Matikan multiplayer: Cloudflare → Workers → `nusa-multiplayer` → Variables → `MP_ENABLED = 0`.

## Koordinasi dengan WORKING 01
Satu workflow & satu skrip rilis; jangan buat workflow deploy kedua. Aturan lengkap: `docs/KOORDINASI-WORKING-01.md`.
