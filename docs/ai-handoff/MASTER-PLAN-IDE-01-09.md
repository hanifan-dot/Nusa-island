# Master Plan — 9 ide Nusa Island (Worker 01 = backend/kontrak, Worker 02 = visual/UI klien)

Aturan tetap: tanpa merge/deploy/flag ON/migrasi produksi/backfill/ubah data pemain tanpa Owner. Semua flag baru bawaan OFF. Migrasi hanya di `migrations-pending`. Tanpa UID/email/token/payment ID ke klien lain.

| # | Ide | Fase | Backend (Worker 01) | Status W01 |
|---|-----|------|---------------------|-----------|
| 1 | Pengiriman Segar Pak Damar | A | `ecoDamar*` + flag `pakDamar` | **Selesai (server); UI pengepakan + adapter = #131/#133 (flag OFF)** |
| 2 | UI Kemudi Kapal | A | data status kapal (bagian kontrak kapal) | Server selesai; UI Kemudi lokal (#133, flag OFF); render kapal server menyusul |
| 7 | Kapal Rombongan (3 orang) | A | state kapal di jalur multiplayer realtime + flag `kapalRombongan` | Kode selesai di PR draft kapal (flag OFF); render = Worker 02 |
| 4 | Pelabuhan Kota | B | kontrak lokasi, pasar/permintaan harian | Belum |
| 5 | Eksplorasi Kepulauan | B | pulau/spot ditemukan per pemain, idempoten | Belum |
| 6 | Latar Mancing per Lokasi | B | ID area/spot/cuaca/waktu + tabel ikan sah | Belum |
| 3 | NusaPhone (+ sosial, PlayGame) | C | pembelian, kapasitas, sosial, moderasi | Belum |
| 8 | Dapur Rumahku + Kedai Bu Indah | D | bahan, resep, tamu | Belum |
| 9 | Intro Sinematik (`introSeen`) | E | per-akun lewat Cloud Save | Belum |

Urutan PR: satu PR per fase/rangkaian. Basis produksi terverifikasi 12 Nov 2026: backend `ef985de` (deploy D1 Tahap 11 Nov), game dari cabang `hotfix/tes-recovery-4h-20261109` (`main` game hanya cangkang deploy).

## Catatan klien (Worker 02)
Basis klien `435c63d`. Aturan klien: visual & UI saja; tidak ada transaksi/saldo/hadiah tepercaya dari klien; semua fitur di balik flag MATI; lazy-load. Pelabuhan Kota (4) bagian klien dikerjakan di #131/#133 (flag OFF). Bukti visual menyusul setelah fitur ada.
