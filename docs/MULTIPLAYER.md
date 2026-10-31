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

## Integrasi dengan produksi (cabang `uji/gabungan-kedai-ekonomi`)
Cabang `fitur/tahap-4-multiplayer-produksi` = produksi terbaru + Tahap 4. Yang ditambahkan ke file produksi hanya hook kecil bertanda "Dunia Bersama/Tahap 4" di `index.html`, `game.js`, `world/world.js`, `cloud/adapter-firebase.js` (satu fungsi `idToken`), dan `build-hosting.sh`. Premium Shop QRIS, Worker ekonomi `nusa-api`, Login 7 Hari, Cloud Save, ekonomi server, dan Kedai Atuk Bahar tidak diubah; klien multiplayer tidak memakai `NusaApi`, `apiBase`, saldo, toko, atau Firestore (dicek otomatis di `tests/unit-mp.js`).
- **Worker terpisah:** `nusa-multiplayer` (nama, Durable Object, dan binding sendiri). `nusa-api` tidak pernah di-deploy ulang oleh skrip ini; statusnya dicek sebelum dan sesudah.
- **`build-hosting.sh`:** semua folder (`shop`, `economy`, `streak`, …) dan mode `produksi` (apiBase, `backend: "cloud"`, `release: "publik"`, QRIS) tetap. Tambahan: folder `mp/` dan, bila `NUSA_MP_WS=wss://nusa-multiplayer.<akun>.workers.dev` diisi, `mp/endpoint.json`. Alamat `nusa-api` ditolak sebagai alamat multiplayer.
- **Autentikasi:** token ID Firebase yang sama dengan Cloud Save/Rules (Google, email terverifikasi, project `nusa-island-d2023`) diverifikasi di Worker dengan kunci publik Google; tidak ada rahasia dan tidak ada panggilan ke `nusa-api`.

## Perlindungan penyalahgunaan
Sebelum token diverifikasi: Origin harus domain game, subprotocol & ukuran token dicek. Setelah itu: akun dalam daftar `MP_BLOCKED_UIDS` ditolak; **pintu masuk (lobby)** membatasi masuk ≤8/menit per akun, ≤30/menit per IP, ≤300/menit global (melindungi kuota gratis harian dari banjir sambungan) dan menutup sesi lama bila akun yang sama masuk ke instance lain. Di dalam instance: batas peta & kecepatan, laju pesan (token bucket), chat disaring (tautan/email/telepon/kata kasar), spam sama diabaikan, nama menyerupai staf ditolak, pelanggar berat ditendang. Memblokir pelaku: dashboard Cloudflare → Workers → nusa-multiplayer → Settings → Variables → `MP_BLOCKED_UIDS` = uid (tidak tertimpa deploy berikutnya).
Batas jujur: belum ada tombol lapor/blokir per pemain di dalam game; penyaring kata bukan moderasi manusia; satu orang dengan banyak akun Google tetap dibatasi laju per IP.

## Aktifkan (setelah kamu menyetujui rilis) — SATU perintah
Di Cloud Shell, dari folder repo, pada cabang `fitur/tahap-4-multiplayer-produksi`:
```
git fetch origin && git checkout fitur/tahap-4-multiplayer-produksi && git pull && bash firebase/scripts/aktifkan-multiplayer.sh
```
Skrip: (1) menolak berjalan bila cabang tidak memuat produksi terbaru atau ada perubahan lokal; (2) membaca alamat `nusa-api` dari situs live; (3) memakai login Wrangler/Cloudflare yang sudah ada (token baru hanya diminta bila memang belum ada login sama sekali); (4) men-deploy HANYA `nusa-multiplayer` dan mengecek `/health`; (5) membangun game dengan mode `produksi`; (6) menayangkan ke Firebase Hosting hanya setelah kamu mengetik `ya`, lalu memeriksa bahwa konfigurasi toko live tidak berubah. `--worker-saja` mengaktifkan server tanpa menyentuh game live. Batal/rollback: Firebase Console → Hosting → Riwayat rilis → Kembalikan; matikan darurat: `MP_ENABLED = 0`.
Skrip diuji dengan alat palsu (curl/npx/firebase) untuk alur normal, batal, cabang lama, pohon kotor, dan tanpa login Cloudflare; **belum dijalankan terhadap Cloudflare/Firebase asli**.

## Pengujian
- `node tests/unit-mp.js` (102, termasuk lobby & pemeriksaan integrasi produksi): pembersih nama/chat, logika instance (gabung, delta, kecepatan/teleport, kapasitas, satu sesi per akun, chat+rate limit, tersembunyi, timeout, anti-banjir, hemat data, pemulihan hibernasi), verifikasi JWT dengan kunci RSA buatan (aud/iss/exp/provider/email/tanda tangan palsu/alg none), pemeriksaan statis `wrangler.toml` & Worker.
- `python tests/browser/test_multiplayer.py` (42): beberapa browser sungguhan ↔ server uji lokal (`tests/dev/mp-dev-server.js`, logika instance sama, token `dev.<uid>` hanya di mode demo): persetujuan, tamu tidak tersambung, bertemu, berjalan real-time, label nama, chat tersaring & digema, spam dibatasi, duduk & memancing bersama, menghilang saat pindah area/keluar, sesi ganda, instance kapasitas 2, hemat data, sambung ulang setelah server mati, panel & pengaturan.
- **Belum teruji:** Worker/Durable Object di runtime Cloudflare asli (kelas `MuaraRoom` hanya pembungkus tipis atas `room-core.js`; rawan salah ketik API Cloudflare yang baru ketahuan saat deploy pertama), verifikasi token dengan JWKS Google asli, Firebase Hosting, Android fisik, jaringan seluler, beban banyak pemain.

## Tahap 4.2 (server browser, jam dunia, pamer ikan)
- **Menu 🌐 Server** di ☰: ID server, pemain n/16 (hitungan SERVER dari anggota nyata), status, Gabung Server Acak, Masuk dengan ID (1–12), Salin ID Server, Keluar Server, daftar 12 server, daftar pemain dengan arah/jarak; panah di tepi layar menunjuk teman yang di luar pandangan (Muara 40×40 tile).
- **ID server sungguhan:** `?room=N` divalidasi di Worker (`Proto.roomId`), Lobby, dan Room; penuh → kode 4006 + pesan jelas; ID salah → 4007; terlalu sering → 4008. Hitungan lobby kini disinkronkan dari DAFTAR LENGKAP anggota instance (tidak bisa drift); akun yang sama di dua server ditutup sesi lamanya. Putus → sambung ulang ke server pilihan sebelumnya.
- **Jam dunia:** `S.hour` mengikuti jam SERVER (`P.sharedHour`) hanya saat tersambung & terlihat di Muara; halus (maks ±50% kecepatan), lompatan besar saat masuk tidak menambah hari, offline = jam lokal berlanjut. Jam HP tidak dipakai (performance.now + jam server dari welcome/heartbeat). Cuaca TIDAK disinkronkan (seed lokal per pemain) — batas jujur.
- **Pamer ikan:** hanya `{spesies, gram, varian}` yang dikirim; server memvalidasi bentuk & laju, membersihkan saat sembunyi/keluar; klien menggambar dengan `NW.hold.remoteFrame`. Klaim ini kosmetik (tidak diverifikasi terhadap inventaris, tidak memberi apa pun).
- Rilis tanpa Cloud Shell: `docs/RILIS-GITHUB.md`. Panduan integrasi protokol: `docs/MP-PROTOKOL.md`.
