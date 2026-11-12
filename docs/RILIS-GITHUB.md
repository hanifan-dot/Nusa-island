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

## Perbaikan Error Cloudflare 9106 (deploy kandidat terpadu)
**Gejala (run #2–#4):** `Cloudflare API HTTP 400 — 9106: Authentication failed` pada pembacaan pengaturan Worker `nusa-api`, sebelum ada perubahan produksi. (Kode sebenarnya **9106**, bukan 9016.)

**Arti:** 9106 = Cloudflare tidak menerima header `Authorization` (hilang/cacat), HTTP 400. Ini **bukan** "token ditolak karena izin" (itu 403/10000) dan bukan "token dicabut" (401/1000). Jadi yang salah hampir pasti **bentuk nilai secret** `CLOUDFLARE_API_TOKEN`, bukan izin. Pengujian lokal: nilai berakhiran baris baru membuat curl mengirim header cacat (`Authorization: Bearer TOKEN\n`); awalan `Bearer ` atau tanda kutip membuat token ganda/salah. Penyebab pasti pada secret Anda **tidak bisa dibaca dari luar** (nilai tidak pernah terlihat), karena itu skrip kini mengklasifikasikannya sendiri.

**Perubahan:** `firebase/scripts/cf-auth-check.sh` (read-only) dijalankan sebelum deploy: membersihkan spasi/baris baru/`Bearer `/kutip/`NAMA=` dari secret, memeriksa `/user/tokens/verify` (lalu `/accounts/ID/tokens/verify` untuk token akun), lalu membaca Worker untuk memisahkan penyebab. Hanya KATEGORI + kode Cloudflare yang disamarkan yang dicetak; token memakai berkas konfigurasi curl (tidak muncul di daftar proses) dan `::add-mask::`.

| Kategori | Arti | Tindakan Owner |
|---|---|---|
| `TOKEN_FORMAT_RUSAK` (10) | header/format cacat | simpan ulang secret persis dari dasbor (tanpa spasi/baris baru) |
| `TOKEN_TIDAK_VALID` (11) | dicabut/bukan token API | baru di sini buat token baru (template *Edit Cloudflare Workers*) |
| `TOKEN_KEDALUWARSA` (12) | status expired | perpanjang/buat ulang |
| `IZIN_KURANG` (13) | akun benar, izin kurang | tambah Account → Workers Scripts → Edit |
| `IZIN_KURANG_ATAU_ACCOUNT_SALAH` (13) | tak bisa dibedakan | cocokkan Account ID, lalu izin |
| `ACCOUNT_ID_SALAH` (14) | ID tak ada di akun token | perbaiki secret `CLOUDFLARE_ACCOUNT_ID` |
| `WORKER_TIDAK_DITEMUKAN` (15) | `nusa-api` tak ada di akun itu | cek Account ID |
| `JARINGAN` (16) / `ACCOUNT_ID_FORMAT` (17) / `SECRET_KOSONG` (18) / `SKRIP` (19) | — | ulang / perbaiki secret |

Pengaman produksi tidak diubah: pin SHA, pembekuan `[vars]`, `--keep-vars`, verifikasi binding sebelum/sesudah, QRIS, vendor, Hosting hanya setelah API sukses, rollback `wrangler rollback`/`hosting:rollback`.
