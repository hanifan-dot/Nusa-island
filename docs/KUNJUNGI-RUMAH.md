# Kunjungi Rumah Teman

Pemain bisa membuka **Rumahku → 🏠 Kunjungi Rumah Teman**, mengetik nama teman, memilih akun, lalu masuk ke **rumah asli** temannya (level, perabot, dekorasi, ikan di akuarium sama persis dengan Cloud Save pemilik). Kalau pemilik sedang online di rumahnya, keduanya saling melihat, berjalan, chat, dan kirim emoji.

## Cara kerjanya (singkat)

```
Cloud Save pemilik ──(server menyalin tata rumah saat menyimpan)──> homepub/{id-publik}  +  homeidx/{2 huruf nama}
Pencarian  : homeSearch  (nama → nama, level, ID pendek; tanpa email/UID)
Masuk      : homeVisit   (server periksa privasi/izin/larangan → kirim salinan rumah, hanya-lihat)
Multiplayer: Worker nusa-multiplayer  /ws?h=<id-publik>  → tanya izin ke nusa-api (service binding) → Durable Object "HouseRoom" (satu per rumah)
```

* **Tidak ada daftar pemain di game.** Hasil pencarian = jawaban server dari akun yang benar-benar menyimpan data.
* **ID publik** (8 huruf, mis. `ARYSVGBB`; tampil `#ARYSV`) = hash satu arah dari UID. Tidak bisa dipakai untuk menulis apa pun. Browser **tidak pernah** mengirim `ownerId`/`houseId`/UID; hanya ID publik rumah yang ingin dilihat. Server menghitung identitas pemanggil dari token Google yang diverifikasi.
* **Salinan rumah dibuat server** dari simpanan pemilik sendiri (level sudah dikoreksi ekonomi server). Pengunjung tidak punya jalur tulis: setiap fungsi hanya menulis dokumen milik pemanggil (ID dihitung dari token, bukan dari kiriman).
* **Yang dibagikan:** nama panggilan, level rumah, perabot (jenis/posisi), dekorasi, ikan yang dipajang, daftar ikan yang pernah ditemukan (untuk replika trofi). **Tidak** ada email, UID, saldo, pembayaran.
* **Hanya-lihat.** Di rumah teman: Tata Ruang, Renovasi, Katalog, Akuarium (ambil/taruh ikan), tidur, dll ditolak oleh game; data rumah pengunjung sendiri tidak disentuh. Boleh: berjalan, melihat, radio (suara lokal), elus kucing, lihat isi akuarium/trofi, chat & emoji.

## Privasi & keamanan

| Hal | Perilaku |
|---|---|
| Publik / Privat | Pemilik memilih di ☰ → 🏠 Kunjungi Rumah Teman → ⚙️ Rumahku. **Bawaan: Publik** (lihat catatan keputusan di bawah). |
| Privat | Server menolak `homeVisit` dan `homeAccess` (pintu multiplayer) untuk siapa pun yang tidak ada di daftar izin. Menjadikan rumah privat otomatis mengeluarkan tamu yang sedang di dalam (tanpa larangan). |
| Daftar izin | Hingga 12 teman (dipilih dari hasil pencarian). Bisa dicabut. |
| Keluarkan tamu | Tombol **Keluarkan** → tamu langsung ditutup koneksinya (kode 4010), kembali ke rumahnya sendiri; larangan 1 jam dicatat di server **dan** di ruang rumah. Larangan menang atas izin. |
| Pemain tanpa login / token palsu | Ditolak (401) oleh nusa-api dan oleh pintu multiplayer. |
| JavaScript dimanipulasi | Klien yang memaksa "masuk" ke rumah privat hanya melihat tampilan lokal buatannya sendiri: tidak bisa tersambung ke ruang itu dan tidak terlihat/mengobrol dengan siapa pun (diuji). Tidak ada perubahan data di server. |
| Peran pemilik/tamu di ruang | Ditetapkan **server** saat izin masuk (dari token); pesan "keluarkan" dari tamu diabaikan. |
| Laju | Pencarian ≤30/menit, kunjungan ≤20/menit per akun; masuk ruang rumah dibatasi per akun/IP/global. |
| Kuota Firebase/Cloudflare | Cari/kunjungi/akses = **1 baca Firestore**. Simpan game: tanpa operasi tambahan bila rumah tidak berubah; bila berubah +2–4 operasi (terukur: 8 panggilan Firestore untuk simpanan pertama yang menerbitkan rumah). Tanpa layanan baru, tanpa proyek baru. |

## Multiplayer rumah

* Satu Durable Object per rumah (`HouseRoom`, kapasitas 12), terpisah total dari Muara. Muara tidak berubah (uji lama tetap lulus).
* Klien hanya punya **satu** koneksi: di Muara → ruang Muara; masuk Rumahku (sendiri atau rumah teman) → pindah ke ruang rumah; keluar → kembali ke Muara.
* Pemilik yang online di Rumahku-nya otomatis berada di ruang rumahnya (butuh Dunia Bersama aktif). Pemain di halaman vs dalam rumah saling terlihat hanya bila di adegan yang sama.
* Pemilik offline → rumah tetap bisa dikunjungi (data dari server), hanya tanpa pemain lain.

## Yang berubah di kode

Game: `house/core.js` (inti server, UMD), `house/client.js` + `house/house.css` (tombol/panel/label), `world/home.js` (mode kunjungan hanya-lihat), `mp/proto.js` `mp/room-core.js` `mp/client.js` `mp/ui.js` (ruang rumah), `cf-multiplayer/` (pintu + `HouseRoom`), `firebase/functions/lib/core.js` → `cloud/core.js` (kait `publish` saat Cloud Save). Dashboard/Worker: `worker/index.js` + vendor + `scripts/rilis-rumah.sh`.

## Uji

`node tests/unit-house.js` (64) · `node tests/unit-mp-house.js` (23) · `node tests/unit-mp.js` (103) · `python tests/browser/test_house.py` (74, browser asli + server uji) · dashboard `npm test` (114).

## Catatan jujur

* Diuji dengan **inti server yang sama** (cloud/core, house/core, room-core) di atas basis data memori + Chromium sungguhan. **Belum** diuji di Firestore/Cloudflare/Durable Object produksi dan di HP Android fisik.
* Rumah pemain lama muncul di pencarian setelah **simpanan berikutnya** (otomatis saat bermain); tidak ada data pemain yang dibaca-massal atau diubah saat rilis.
* Satu "kotak" indeks nama memuat maksimal 3000 pemain per 2 huruf awal; selebihnya tidak tercantum di pencarian (batas aman ukuran dokumen).
* Keputusan produk yang perlu disetujui pemilik game: **bawaan Publik** (nama panggilan + level rumah bisa dicari semua pemain yang login). Jika ingin bawaan Privat, ubah `privacy: "public"` menjadi `"private"` pada `house/core.js` (`publish`) sebelum rilis.
