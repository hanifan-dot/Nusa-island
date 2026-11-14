# KONTRAK RESMI — Ide 07 NusaPhone (Worker 02 = klien/visual, backend = cabang NusaPhone di repo control-center)

Status: **Draft, semua flag MATI.** Dokumen ini adalah kontrak resmi dari Owner (koreksi 14 Nov 2026 12:27 WIB). **Dilarang** mengganti, mengurangi, atau menambah isi daftar di bawah tanpa keputusan Owner. Perubahan wajib lewat Owner.

## 1. Urutan kerja (wajib)
1) UI perangkat HP → 2) PlayGame + lima game → 3) NusaWeb + Zentro → 4) aplikasi sosial (Klippy, NusaChat, Dompet Nusa) → 5) toko enam model (+ toko fisik Kota) → 6) integrasi Payment Center. Audit pembayaran berjalan di latar.

## 2. Aplikasi di layar utama (tetap)
Klippy · NusaChat · PlayGame · Dompet Nusa · Peta · Pengaturan · **NusaWeb** · **Zentro**. Aplikasi inti memakai **3 GB** penyimpanan virtual.
Aplikasi jaringan (Klippy, NusaChat, Dompet Nusa, NusaWeb, Zentro) TERKUNCI saat koneksi putus ("Koneksi terputus"); tidak ada mode offline palsu.

## 3. PlayGame = toko aplikasi internal
Instal, hapus, kapasitas penyimpanan (terpakai/total), progres unduhan, tombol **Main**. Status terpasang & penyimpanan dicatat SERVER per akun (idempoten `opId`, kapasitas divalidasi server).
**TEPAT LIMA game** (tidak boleh lebih/kurang tanpa keputusan Owner), semuanya bisa dimainkan:

| id | Nama | Ukuran virtual | Jenis |
|---|---|---|---|
| `oceanspin` | Ocean Spin | 0,8 GB | cascade/combo simbol ikan (lihat §4) |
| `balapperahu` | Balap Perahu | 1,2 GB | balap perahu |
| `nusarush` | Nusa Rush | 1,4 GB | endless runner |
| `karangblast` | Karang Blast | 0,35 GB | puzzle blok |
| `penjagalaut` | Penjaga Laut | 1,8 GB | menembak perompak kartun, tanpa kekerasan grafis |

Wajib di tiap game: tutorial, jeda (pause), audio OFF, reduced motion, skor, game over, main ulang, kontrol sentuh HP. Empat game selain Ocean Spin **tidak memberi/mengambil koin, diamond, ikan, inventaris, quest, Cloud Save, atau ekonomi utama.** Tidak ada game lain, tidak ada slot "Segera Hadir", tidak ada "Tangkap Ikan Kilat".

## 4. Ocean Spin (koreksi Owner)
Memakai **koin bermain sebagai biaya spin**. Mekanisme wajib:
- Biaya **tepat 500 koin per spin**. Pemain memilih **1–10 spin** sekaligus. Tombol auto-spin hanya menjalankan jumlah yang sudah dipilih (tidak pernah tanpa batas).
- Papan **5×3** berisi simbol ikan. Simbol cocok menghilang, gelembung pecah, simbol baru jatuh (cascade). Combo dalam satu spin ×1, ×2, ×3, ×4, **maks ×5**; kembali ×1 saat spin baru.
- Seluruh biaya 1–10 spin dipotong **atomik oleh server sebelum** rangkaian dimulai. Saldo tidak cukup → tidak ada spin, saldo tidak berubah. Putus koneksi/refresh/klik ganda/retry dengan `opId` sama → tidak memotong atau memberi hadiah dua kali (hasil yang sama dikembalikan).
- Tiga simbol Megalodon → tulisan **BOOM**, layar bergetar ringan, animasi ikan berputar cepat. Menang → kartu hadiah ikan. Zonk → sindiran lucu yang tidak menghina.
- Hadiah utama **Ikan Zeus Petir** (efek petir, **100 kg**, peluang **0,050%**). **Semua peluang & tabel hadiah terlihat SEBELUM tombol SPIN.**
- Hasil, peluang, biaya, combo, berat ikan, hadiah = **server**; klien hanya animasi. Ikan hadiah masuk inventaris server **tepat sekali**, tunduk pada kapasitas inventaris nyata (spin ditolak sebelum dipotong bila slot kosong < jumlah spin).
- **Tidak ada**: manipulasi near-miss, pencairan uang, perdagangan hadiah, transfer koin antarpemain, penukaran ke Rupiah, deposit, pembelian spin dengan uang nyata.
- **BATAS PEMBAYARAN (wajib):** koin dari top-up QRIS/Rupiah **tidak boleh** dipakai di Ocean Spin. Hanya koin yang terbukti dari permainan. Backend menyimpan sumber saldo server-side (ledger `pg`, lihat §7). Jika sumber tidak terbukti → Ocean Spin tetap TERKUNCI dan dilaporkan sebagai kebutuhan kontrak backend. Tampilan tetap "koin" (bukan tiket baru).
- Akses: dipasang lewat PlayGame (0,8 GB) → bisa dibuka sebagai aplikasi. NusaWeb punya bookmark **NusaOcean** di `nusaocean.nusa` yang membuka Ocean Spin YANG SAMA (satu ekonomi, bukan salinan).
- Angka peluang/tabel di data uji berstatus **"menunggu Owner"** (kecuali Zeus Petir 0,050%, 100 kg, dan biaya 500).

## 5. NusaWeb & Zentro
- **NusaWeb**: browser internal — address bar, Kembali, Home, tab, bookmark. Hanya halaman fiktif dunia Nusa; **tidak membuka internet umum** (tidak ada iframe/fetch keluar).
- **Zentro**: mesin pencari internal untuk halaman fiktif Nusa saja.
- Bookmark bawaan: **NusaOcean** → `nusaocean.nusa`.

## 6. Sistem HP: enam model, empat lini
- **Dua HP** dibeli dengan **koin bermain**. **Empat HP premium** berharga server: **Rp5.000, Rp10.000, Rp15.000, dan Nusa Crown 17 Rp25.000.**
- Hanya **"Nusa Crown 17"** yang sudah bernama (Owner). **Lima model lain BELUM bernama** — dipakai label sementara di data uji (`Model Sementara …`). Pemetaan lini ke model = data uji, "menunggu Owner".
- Premium **hanya lewat Payment Center/QRIS lama yang terverifikasi**. Pembayaran nyata belum aktif → pembelian TIDAK TERSEDIA ("Pembayaran belum tersedia"); tidak ada simulasi sukses.
- Perbedaan harga HANYA kosmetik + kapasitas penyimpanan; bukan akses sosial atau kekuatan permainan. Semua pemain memegang NusaPhone dasar (loaner) agar aplikasi sosial tidak terkunci.
- Kapasitas tiap model **diusulkan ke Owner sebelum dikunci** (usulan di `STATUS-NUSAPHONE.md`).

## 7. Backend
- Flag server `gameFlags.nusaPhone` (bawaan false); flag klien `NUSA_PHONE=false` (modul tidak diunduh); env multiplayer `NUSA_PHONE=ya` (hanya bendera tampilan "memegang ponsel").
- Semua transaksi pakai `opId` + idempotensi; Owner diverifikasi server-side; tidak ada adapter uji lewat `window`; tanpa secret/QR produksi/data merchant di fixture.
- Koin Ocean Spin & model-koin dipotong HANYA dari koin bermain (`eco.bal` yang terbukti `eco.pg`), bukan `wallet.NYATA`/`SIMULASI`.
