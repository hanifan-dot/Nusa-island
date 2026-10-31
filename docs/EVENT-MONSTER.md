# Event 5 Monster Legenda

Status: **kode selesai & lulus tes lokal; BELUM diuji di Firebase/Cloudflare sungguhan** (belum ada yang di-deploy; saklar Owner masih mati sampai kamu menyetujui rilis).

## Ringkasan
Setiap **Minggu 19.00–19.20 WIB** satu monster raksasa muncul di satu lokasi. **Minggu ke-0 = PEMBUKAAN PUBLIK: Megalodon Bayangan Purba** (spesial, diputuskan server di `event/core.js` → `PREMIERE`). Setelah itu rotasi mingguan (lalu mengulang): 

| Minggu (setelah pembukaan) | Monster | Bobot (fantasi) | Lokasi | Hadiah ikut / taklukkan / juara |
|---|---|---|---|---|
| 1 | Toman Purba | 800 kg | Muara Kampung | 200 / 300 / 1.500 |
| 2 | Jurung Mahkota | 2 ton | Danau Toba | 300 / 600 / 3.000 |
| 3 | Barakuda Guntur | 5 ton | Selat Sunda | 450 / 1.200 / 5.500 |
| 4 | Kuwe Titan | 12 ton | Raja Ampat | 700 / 2.000 / 9.000 |
| 5 | Megalodon Bayangan Purba | 50 ton | Laut Banda | 1.000 / 3.500 / 16.000 |

Pembukaan 1 Nov 2026 = Megalodon (Laut Banda); 8 Nov = Toman Purba; 15 Nov = Jurung Mahkota; … Jadwal sepenuhnya dari server (`eventInfo`), bukan dari HP.

Angka hadiah ada di `event/core.js` (`MONSTERS[].rw`) dan hanya server yang membacanya. Mudah diubah sebelum rilis.

Lima lokasi **sudah ada** di game (`data.js` LOCATIONS). Muara/Toba/Selat = area darat + dermaga; Raja Ampat/Laut Banda = lokasi memancing dari kapal (syarat kapal level 4/5 dari sistem lama, **tidak diubah**). Panel event menampilkan "Menuju …" bila kapal cukup. Bila kapal belum cukup, ada **akses event khusus (tiket)**: selama event LIVE (jam server) dan saklar server `eventPass` aktif, pemain berakun dibawa ke lokasi monster hanya untuk menantang monster itu. Syarat kapal untuk perjalanan biasa **tidak berubah** (`canSail`/`travel` tetap menolak); di lokasi tiket ikan biasa tidak menggigit (tidak bisa dipakai memancing lokasi terkunci); tiket gugur saat event selesai/pemain pindah dan pemain dikembalikan ke lokasi semula; tamu tidak mendapat tiket. Mematikan tiket: `toko.js event-pass tidak`. Tidak ada lokasi baru dan tidak ada tombol ke tempat yang belum ada.

## Cara kerja
1. **Jadwal & jam = jam server WIB.** `eventInfo` (publik, tanpa data pribadi) mengembalikan jam server + jadwal. Game memakai jam monoton `performance.now()` sejak jawaban terakhir, jadi mengubah jam HP tidak menggeser event (diuji).
2. **Monster sama untuk semua pemain/room.** Lintasan renang adalah fungsi deterministik dari `(id event, detik sejak mulai)` (`EventCore.swimAt`) — tidak perlu pesan jaringan per frame. Karena itu **`cf-multiplayer`/`nusa-multiplayer` sengaja tidak diubah** (menghindari bentrok dengan UI Tahap 4.1 milik WORKING 02 dan tidak menambah biaya Durable Object).
3. **Memancing sungguhan.** Lempar kail di lokasi event: monster berpatroli, berbelok, mempercepat, menyelam; bila umpan jatuh di dekatnya ia mendekat (± 2 detik, gigitan ikan biasa ditahan sebentar) lalu **duel** dimulai. Memancing biasa tidak berubah.
4. **Duel (20 langkah/detik, maks 60 dtk).** Tahan layar = gulung, lepas = kendurkan. Jaga tegangan di zona hijau; aba-aba ⚡ muncul sebelum monster mengamuk (lepas!) atau menyelam (tarik-lepas pelan); setelah mengamuk monster lelah (gulung dua kali lebih efektif). Senar putus (tegangan ≥ 100%), terlalu kendur > 1,2 dtk, atau lewat 60 dtk = kalah.
5. **Server yang menilai.** `ecoEventStart` membuat seed acak di server → game memainkan duel → `ecoEventFinish` mengirim **log tombol** (kapan ditekan/dilepas) → server memainkan ulang dengan inti yang sama (`EventCore.simulate`), memeriksa waktu (tidak bisa selesai lebih cepat dari waktu nyata), menghitung skor, membayar hadiah, dan memperbarui juara.
6. **Satu juara global.** Satu dokumen `shop_event/{idEvent}` memegang `top` (skor tertinggi dari duel **berhasil**; seri → selesai paling awal → uid). Semua room/pemain menulis ke dokumen yang sama lewat transaksi Firestore, jadi tidak mungkin ada dua juara. Hasil diumumkan setelah masa tutup (19.20 + 90 dtk); juara menerima hadiah lewat klaim otomatis (`ecoEventClaim`, sekali). Bila tak ada yang menaklukkan monster, tidak ada juara minggu itu.
7. **Hadiah ke dompet utama** lewat inti ekonomi yang sama (`credit`, idempotent `opId`): partisipasi (sekali per event, bahkan bila kalah), menaklukkan (sekali per event), juara (sekali). Trofi per monster (`👁️ Saksi → 🏆 Penakluk → 👑 Juara`) disimpan server di dokumen ekonomi pemain dan tampil di panel "Koleksi Monster".

## Keamanan (diuji di `tests/unit-event.js` & `tests/browser/test_event.py`)
- Klien tidak pernah mengirim "menang", skor, atau koin. Kiriman seperti itu diabaikan; hanya log tombol yang dinilai.
- Maksimal **3 duel** per pemain per event; memulai duel baru menghanguskan yang belum selesai (tidak bisa latihan dengan seed yang sama).
- Duel hanya dapat dimulai saat event LIVE (jam server) dan harus selesai paling lambat 90 dtk setelah 19.20.
- `opId` idempotent: kirim ulang karena jaringan tidak menggandakan hadiah; hasil tertunda disimpan di localStorage dan dikirim ulang.
- Saklar Owner `shop_config/main.eventOn`: **mati secara bawaan** → server menolak duel dan game menyembunyikan semua elemen event.
- **Batas jujur:** server tidak bisa membedakan jari manusia dari skrip yang memainkan log sempurna (sama seperti game real-time mana pun). Yang dijamin: tidak ada kemenangan tanpa duel valid menurut simulasi, tidak ada hadiah ganda, hadiah dibatasi tabel server, hanya satu juara. Skrip pemain-otomatis hanya bisa dibatasi oleh batas 3 kesempatan, jeda minimal antar-ketukan, dan pemeriksaan waktu; Owner dapat menutup event dengan `event-tutup`.

## Kuota & biaya (semua tetap di paket gratis/Spark + Workers Free)
- Per pemain per event: ≤ 3 `Start` + ≤ 3 `Finish` + 1 `Claim` = ≤ 7 tulis dokumen ekonomi; dokumen global hanya ditulis saat skor tertinggi baru. 1.000 pemain aktif ≈ ≤ 7.000 tulis (kuota Spark 20.000/hari).
- `eventInfo`: 2 baca Firestore, dipanggil ±1× per 5 menit per pemain (1× per menit mendekati/selama event). Tidak ada polling per frame, tidak ada WebSocket tambahan, **tidak ada layanan berbayar baru**, tidak ada proyek Firebase/Cloudflare baru.

## File
- `event/core.js` — jadwal, tabel monster, lintasan, simulasi duel, aturan juara (UMD; dipakai game, Worker, Functions).
- `event/draw.js` — gambar 5 monster di Canvas 2D (badan berombak, sirip, efek kemunculan/menghilang, riak, gelembung, petir/kilau/kabut khas).
- `event/client.js`, `event/ui.js`, `event/event.css` — jadwal dari server, monster di air, duel, panel, hitung mundur, kartu hasil.
- `economy/core.js` — endpoint `eventInfo`, `ecoEventState/Start/Finish/Claim`. Salinan: `firebase/functions/lib/*` (`node firebase/scripts/sync-economy.js`), dashboard `server/vendor/*` (`node scripts/sync-economy.mjs`).
- Hook di `game.js` (±12 baris): gambar monster sebelum perahu, `onWaiting` saat menunggu gigitan, fase `"event"` untuk duel, API `Nusa.fish`.

## Operasi
```
node firebase/scripts/toko.js event-buka 2026-11-01   # buka event; tanggal = Minggu pembukaan (Megalodon). Target terlewat? ganti ke Minggu berikutnya.
node firebase/scripts/toko.js event-pass ya|tidak     # akses event khusus (tiket) — bawaan ya
node firebase/scripts/toko.js event-tutup              # matikan seketika
node firebase/scripts/toko.js status                   # termasuk status event
```

## Pengujian
`node tests/unit-event.js` (22 tes: jadwal WIB, rotasi, lintasan, duel, semua aturan server, anti-curang, juara tunggal, klaim) · `python tests/browser/test_event.py` (game asli + inti produksi di dalam halaman) · `python tests/browser/shots_event.py` (5 foto asli).
Belum diuji: Firestore/Cloudflare/Functions sungguhan, beban banyak pemain bersamaan, perangkat Android sungguhan (FPS).

## Rilis
Satu perintah dari repo dashboard: `scripts/rilis-event.sh --saya-setuju` — membaca konfigurasi produksi live (variabel Worker, alamat nusa-api, endpoint multiplayer), memasangnya ulang, memverifikasi sebelum/sesudah, dan memeriksa build memuat `hud/`, menu ☰ 4.1, `event/`, `mp/endpoint.json`.
