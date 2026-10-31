# Tahap 4 — Dunia Bersama (multiplayer Muara Kampung)

Status: **kode selesai dan diuji dengan beberapa browser sungguhan terhadap server uji lokal; BELUM diuji di Cloudflare/Firebase asli** (tidak ada akses jaringan ke layanan itu dari lingkungan pengembangan, dan tidak ada yang di-deploy).

## Fitur
1. Pemain yang login Google (dan menyetujui) bertemu di Muara Kampung.
2. Karakter pemain lain tampil berjalan real-time (interpolasi halus, ≤5 pembaruan/detik).
3. Nama panggilan + gelar di atas karakter (nama diatur di Profil Nelayan; BUKAN nama/email akun Google).
4. Bubble chat (maks 80 huruf, disaring) + 6 emoji cepat; log chat singkat; bisa disembunyikan.
5. Memancing bersama: pemain di dermaga terlihat memegang joran dengan pelampung, dan tetap bisa chat dari layar memancing. Nongkrong bersama: duduk di bangku terlihat oleh yang lain.
6. Pemain yang keluar/offline menghilang: segera bila koneksi ditutup, atau setelah timeout 45 detik bila koneksi mati diam-diam (heartbeat tiap 15 detik).
7. Instance: satu instance Muara = 16 pemain, hingga 12 instance (192 pemain). Pemain baru masuk instance bernomor terkecil yang masih ada tempat.
8. Hemat HP & data: lihat "Optimasi".

## Arsitektur (tidak ada backend duplikat)
| Kebutuhan | Dipakai | Alasan |
|---|---|---|
| Identitas | **Firebase Auth** (Google) yang sudah ada | token ID diverifikasi server dengan kunci publik Google (`mp/jwt.js`), tanpa rahasia & tanpa Admin SDK |
| Server realtime | **Cloudflare Workers + Durable Object** (paket gratis, SQLite-backed, WebSocket Hibernation) | Firebase Spark tidak punya server realtime; Firestore pada 5 Hz akan menghabiskan kuota harian (50 rb baca/20 rb tulis) dalam hitungan menit dan Cloud Functions butuh Blaze |
| Data pemain | tidak disimpan | presence hanya di memori/lampiran socket; Firestore, Cloud Save, Rules, Premium Shop, Login 7 Hari, ekonomi **tidak disentuh** |

Catatan: Worker ekonomi yang direncanakan PR #15 (`apiBase`) tidak ada kodenya di repo ini, jadi tidak ada yang bisa dipakai ulang; server multiplayer adalah layanan terpisah yang tidak menyentuh koin/item.

Berkas: `mp/proto.js` (protokol + pembersih nama/chat), `mp/room-core.js` (logika satu instance, murni), `mp/jwt.js` (verifikasi token), `cf-multiplayer/` (Worker + DO + `wrangler.toml`), `mp/client.js` + `mp/ui.js` + `mp/mp.css` (klien), hook kecil di `world/world.js`, `game.js`, `index.html`, `cloud/adapter-firebase.js` (`idToken`), `firebase/scripts/build-hosting.sh`.

## Keamanan & anti-curang
- Tidak ada pemain/bot palsu: isi instance = koneksi nyata yang lolos token. Pemain sendirian melihat dunia kosong.
- Protokol **tidak membawa saldo, item, atau save**. Yang dikirim: posisi, arah, bendera (jalan/duduk/memancing), nama panggilan, gelar & joran (angka kosmetik, dijepit ke rentang sah), chat, emoji. Browser tidak bisa memalsukan koin/item lewat jalur ini karena tidak ada jalur ke sana.
- Server: token Firebase Google terverifikasi (email terverifikasi, project benar, belum kedaluwarsa), Origin harus domain game, satu sesi per akun (sesi lama ditutup), kapasitas, batas peta, batas kecepatan 9 tile/dtk (lompatan ditahan; teleport sah dibatasi 1×/5 dtk), laju pesan (token bucket), chat dibersihkan (tautan, email, nomor telepon, kata kasar dimasker; spam sama diabaikan), nama yang menyerupai staf (admin/owner/…) ditolak, pelanggar berat ditendang.
- Privasi: `uid` dan email tidak pernah dikirim ke pemain lain; chat tidak disimpan; ada persetujuan sekali (kartu ajakan) sebelum terhubung; bisa keluar kapan saja di 👥 Dunia Bersama.
- **Batasan jujur:** gelar/joran/nama adalah klaim klien (kosmetik; tidak memberi apa pun). Pemain bisa mengubah posisinya sendiri sampai batas kecepatan. Penyaring kata kasar bukan filter sempurna; belum ada tombol lapor/blokir per pemain (chat bisa disembunyikan total). Pesan chat tidak dimoderasi manusia.

## Optimasi HP Android & internet biasa
- Kirim posisi hanya saat berubah, ≤4/detik (hemat data: 2/detik); diam = hanya heartbeat 15 detik. Posisi dikuantisasi (tile×20, bilangan bulat).
- Server hanya menyiarkan **delta** (pemain yang berubah) ≤5×/detik; mode hemat data ≈1,7×/detik dengan posisi akhir selalu dikirim.
- Tab tersembunyi 20 detik → disembunyikan dari dunia; 90 detik → koneksi ditutup (hemat baterai). Sambung ulang otomatis dengan backoff 1–30 detik.
- Tergambar maksimal 12 pemain terdekat (8 di mode hemat data), tanpa loop animasi baru; label memakai cache yang sudah ada.
- Terukur di uji: A berjalan 3 detik → server menerima ≤20 pesan dan B menerima <4 KB.
- Penghitung data sesi (↑/↓) tampil di panel 👥.

## Kuota gratis Cloudflare (hitungan jujur)
Paket Workers Free: Durable Objects 100 rb permintaan/hari (pesan masuk WebSocket dihitung 20:1; pesan keluar gratis) dan 13.000 GB-detik/hari ≈ **28 jam-instance aktif per hari**. Instance yang tidak ada gerakan/chat bisa hibernasi (tidak ditagih durasi); sapuan timeout hanya membangunkan ±sekian milidetik tiap 15 detik. Cukup untuk komunitas kecil (puluhan pemain, beberapa jam ramai per hari). Bila kuota habis, Cloudflare menolak operasi sampai 00:00 UTC: game tampil "tidak tersambung" dan permainan tunggal tetap normal; tidak ada biaya otomatis. Jika kelak ramai, naik ke Workers Paid ($5/bulan) tanpa mengubah kode. Saklar darurat: variabel `MP_ENABLED = "0"` di dashboard Cloudflare mematikan semuanya tanpa deploy.

## Aktifkan (setelah kamu menyetujui rilis)
Yang tidak bisa dilakukan dari luar akunmu hanya membuat token Cloudflare (sekali, ±1 menit):
1. Dashboard Cloudflare → My Profile → API Tokens → **Create Token** → template **Edit Cloudflare Workers** → Continue → Create Token → salin.
2. Di Cloud Shell, dari folder repo pada cabang ini, jalankan SATU perintah:
   `bash firebase/scripts/aktifkan-multiplayer.sh`
   (tempel token saat diminta). Skrip membuat alamat workers.dev bila belum ada, men-deploy Worker, mengecek `/health`, menulis `mp/endpoint.json`, dan (bila kamu jawab y) membangun + men-deploy game ke Firebase Hosting.
3. Buka game dengan dua akun Google di Muara Kampung; ketuk "Ikut" pada kartu 👥.
Tidak ada perubahan Firebase Console, Rules, Blaze, atau Authorized domains yang diperlukan (Auth tetap di domain game).

## Pengujian
- `node tests/unit-mp.js` (82): pembersih nama/chat, logika instance (gabung, delta, kecepatan/teleport, kapasitas, satu sesi per akun, chat+rate limit, tersembunyi, timeout, anti-banjir, hemat data, pemulihan hibernasi), verifikasi JWT dengan kunci RSA buatan (aud/iss/exp/provider/email/tanda tangan palsu/alg none), pemeriksaan statis `wrangler.toml` & Worker.
- `python tests/browser/test_multiplayer.py` (42): beberapa browser sungguhan ↔ server uji lokal (`tests/dev/mp-dev-server.js`, logika instance sama, token `dev.<uid>` hanya di mode demo): persetujuan, tamu tidak tersambung, bertemu, berjalan real-time, label nama, chat tersaring & digema, spam dibatasi, duduk & memancing bersama, menghilang saat pindah area/keluar, sesi ganda, instance kapasitas 2, hemat data, sambung ulang setelah server mati, panel & pengaturan.
- **Belum teruji:** Worker/Durable Object di runtime Cloudflare asli (kelas `MuaraRoom` hanya pembungkus tipis atas `room-core.js`; rawan salah ketik API Cloudflare yang baru ketahuan saat deploy pertama), verifikasi token dengan JWKS Google asli, Firebase Hosting, Android fisik, jaringan seluler, beban banyak pemain.
