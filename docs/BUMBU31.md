# Bumbu 3.1 — Kedai Atuk Bahar 👴🥥

Cabang: `fitur/bumbu-3-1-kedai-atuk` (dari `fitur/tahap-3-google-cloud-save`). PR berbasis cabang Tahap 3, **bukan** `main`. Tidak ada merge/deploy.

## Isi
- **Kedai kayu** (rumah panggung, atap tanduk, lampu gantung, kain/bendera tali, gasing & kelereng gantung, meja permainan, 2 bangku bambu, 2 warga duduk) di sisi selatan Muara Kampung, dekat toko pancing. Pohon/batu acak di tapak dipindahkan; **tata letak peta lama tidak diubah** (bangunan dipasang setelah peta dibuat), dan semua tempat penting tetap terjangkau (diuji BFS).
- **Atuk Bahar**: kakek ramah berkumis putih, peci, baju koko + sarung. Animasi duduk, bicara, menggerakkan tangan, tertawa ("HAHAHA!") — digambar dengan kanvas, tanpa gambar luar.
- Tombol aksi **Bermain dengan Atuk** → dialog pembuka → **Ayo main!** → menu Kedai.
- **5 permainan**: Batok Kelapa Misterius, Duel Gasing Atuk, Congklak Sang Juara, Lempar Gelang Bambu, Kelereng Jagoan Atuk — masing-masing dengan **Mulai, Ulangi, Cara Bermain, Keluar**.
- **4 kesulitan**: Mudah / Normal / Sulit / GOAT → hadiah 5 / 10 / 20 / 35 Koin Kedai.
- **Gelar rahasia PENAKLUK ATUK BAHAR 🐐**: menang tingkat GOAT di kelima permainan. Permanen, sekali klaim, lencana khusus di Profil, konfeti + suara, dialog Atuk mengakui kekalahan, catatan di Buku Petualangan.
- Dialog Atuk bervariasi (menang/kalah/GOAT/gelar/batas harian/pamit), tidak merendahkan. Suara (tawa, tok kayu, biji, menang, kalah, GOAT) lewat **AudioManager lama** → ikut volume/mute.

## Cara kerja tiap permainan (jujur & adil)
| Permainan | Kontrol | Keadilan |
|---|---|---|
| Batok | ketuk batok | kelereng ikut batok yang sama (animasi = logika); posisi diperlihatkan dulu; tukar tidak saling membatalkan; kecepatan & jumlah tukar naik per kesulitan |
| Gasing | tarik-lepas dari gasing (arah+kekuatan) | fisika sederhana deterministik; **setiap ronde dijamin punya aksi menang** (diuji sebelum dimulai) |
| Congklak | ketuk lubang | aturan konsisten, total biji selalu 98; AI: asal-asalan → serakah → hitung 2/3 langkah dengan sesekali salah (manusiawi) |
| Gelang | tarik-lepas, cincin putih = titik jatuh | lemparan sempurna selalu menang, termasuk tiang bergoyang (GOAT) |
| Kelereng | tarik-lepas, garis titik = lintasan perkiraan | tiap ronde dijamin punya sentilan menang; lintasan makin pendek di kesulitan tinggi |

## Ekonomi & BATASAN KEAMANAN (penting)
- **Koin Kedai = dompet SIMULASI LOKAL terpisah** (`S.kedai.koin`). **Tidak** menambah `S.money`, tidak mengubah ekonomi utama/cloud. Tidak ada taruhan, biaya masuk, atau pengurangan saat kalah. Tidak ada mata uang premium / Gamepass.
- Aturan (di `world/kedai/data.js`, diuji): maks **100/hari**; hadiah **hanya kemenangan pertama per permainan per hari**; setelah batas tetap boleh main tanpa koin; tanggal hanya maju (memundurkan jam perangkat tidak mereset).
- **Mengapa bukan saldo utama:** pada Firebase **Spark** tidak ada server yang memeriksa hasil minigame; semuanya dihitung di browser, sehingga pemain yang memodifikasi klien bisa mengaku menang. Karena itu hadiah **tidak dipercaya** sebagai bukti server dan **tidak** dikreditkan ke ekonomi cloud.
- Konsekuensi yang jujur: pemain yang sengaja mengubah data lokal bisa mengubah Koin Kedai/rekor/gelar **miliknya sendiri** (sama seperti semua data lokal). Gelar GOAT hanya diberikan oleh logika game dari 5 kemenangan GOAT, tapi **tidak diverifikasi server**. Cloud Save hanya memeriksa **bentuk & batas wajar** data Kedai (`validateSave`), bukan kebenaran hasil.
- Dua perangkat: memuat progres dari Cloud membawa tanda klaim hari itu → tidak ada hadiah ganda. Jika pemain menimpa dengan salinan lama, klaim lama ikut (tidak ada penambahan).
- Untuk membuat hadiah koin utama aman nanti diperlukan server yang menjalankan permainan/menerima bukti (Cloud Functions, paket Blaze) — di luar cakupan ini.

## Data
- Kunci simpanan tetap `nusa-island-v1`. `SAVE_VERSION` 10 → **11**; migrasi hanya membuat/merapikan `S.kedai` (tidak menambah koin/gelar). Cadangan `…-backup-v10` dibuat otomatis seperti biasa.
- `S.kedai = { v, koin, life, day, earned, claimed{game}, rec{game{diff{plays,wins,streak,best,bestStreak}}}, goat{game}, title, plays }`.
- `cloud/core.js` (disalin dari `firebase/functions/lib/core.js`) memvalidasi bentuk `kedai`.

## Berkas
`world/kedai/` — `engines.js` (logika 5 permainan), `data.js` (ekonomi, gelar, dialog), `art.js` (gambar), `games.js` (kontrol sentuh), `ui.js` (menu/hasil), `kedai.js` (integrasi dunia). Tes: `tests/unit-kedai.js`, `tests/browser/test_bumbu31.py`.
