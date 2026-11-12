# Worker 02 (klien) — STATUS
Diperbarui: 2026-11-12. Basis produksi `435c63d`. PR-A1 = #131 (`fitur/pelabuhan-pengiriman-20261112`); PR-A2 = branch `fitur/kapal-kemudi-damar-20261112` (bertingkat di atas A1).

## PR-A2 — selesai (Draft, semua flag OFF)
- Adapter klien ke kontrak Worker 01: `gameFlags.pakDamar` (gerbang server), `ecoDamarState/Load/Unload` dipakai; `Sail/Abort/Deliver` tersedia di adapter, belum dipanggil UI.
- `NUSA_DELIVERY` hanya memuat modul; server OFF = tidak ada meja/panel/akses. Adapter uji `window` dihapus.
- Dua kotak terisi (status server) tampak fisik di kapal (digambar mengikuti arah/goyangan kapal).
- UI Kemudi (`kemudi/*`, flag `NUSA_KEMUDI`): setir kembali ke tengah, tuas MAJU/NETRAL/MUNDUR, knot, arah, jangkar, Peta Laut, memancing, ke dermaga, tujuan, status muatan; joystick+kolom tombol lama disembunyikan saat naik kapal dan kembali saat turun. Fisika kapal tidak berubah.
- Titik perjalanan: penanda tujuan "Pelabuhan Kota (belum dibuka)"; tanpa hadiah dari klien.
- Kapal Rombongan: TIDAK dikerjakan (protokol server belum ada; tanpa multiplayer palsu).

## Tes
unit-delivery 7, unit-kemudi 5, browser test_delivery 35 (flag OFF = nol unduhan & nol panggilan server; server OFF = tak ada akses; server ON = muat/bongkar; kemudi; 360×740, 412×915, 740×360, desktop). Regresi: bumbu24 104, bumbu241 83 (kapal), podium 24, quest_owner 48. Build + cek-rilis OK (delivery & kemudi ikut disalin). test_multiplayer gagal juga di basis (butuh server WS), unit-username gagal juga di basis.

## Belum / risiko
Pelabuhan Kota, mobil pendingin, animasi angkat kotak, bunyi kotak (PR-A3); Kapal Rombongan (menunggu protokol); screenshot bukti final (menunggu A3). Kemudi memakai arah-layar (8 mata angin), bukan kompas geografis. Hubungan basis #130/#131: bersaudara; konflik berkas docs perlu diselesaikan saat penggabungan.
