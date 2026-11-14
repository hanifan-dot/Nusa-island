# STATUS Ide 07 NusaPhone (Draft, semua flag MATI)
Kontrak: [CONTRACT-NUSAPHONE.md](CONTRACT-NUSAPHONE.md). Urutan: UI HP → PlayGame+5 game → NusaWeb/Zentro → sosial → toko 6 model → Payment Center.

| Tahap | Status |
|---|---|
| 1. UI perangkat HP (HUD, animasi karakter, kunci/home, tema, 4 ukuran layar, putus koneksi, flag OFF = tidak diunduh) | Selesai di cabang (uji unit + browser) |
| 2. PlayGame + 5 game + Ocean Spin (server) | Belum |
| 3. NusaWeb + Zentro + NusaOcean | Belum |
| 4. Klippy, NusaChat, Dompet Nusa | Belum |
| 5. Toko 6 model + toko fisik Kota | Belum |
| 6. Integrasi Payment Center/QRIS | Belum |

## Menunggu keputusan Owner
- **Nama lima model** (sementara: `Model Sementara 1–5`; hanya Nusa Crown 17 bernama) dan pemetaan **empat lini** (usulan: A = s1,s2 [koin]; B = s3; C = s4,s5; D = Nusa Crown 17).
- **Harga**: dua model koin (harga koin = angka uji); premium s3/s4/s5/Crown = Rp5.000/Rp10.000/Rp15.000/Rp25.000 (urutan model→harga = usulan).
- **Kapasitas (GB virtual, usulan)**: Dasar 16 · s1 24 · s2 32 · s3 48 · s4 64 · s5 96 · Crown 17 128. Aplikasi inti 3 GB; lima game total 5,55 GB.
- **Peluang & tabel hadiah Ocean Spin** selain Zeus Petir (0,050%, 100 kg) dan biaya 500 koin/spin = angka uji "menunggu Owner".
- Ocean Spin & ledger koin bermain: butuh kontrak backend (`eco.pg`); tanpa itu tetap TERKUNCI.
