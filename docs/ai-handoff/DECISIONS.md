# Keputusan
- 2026-11-12: Basis produksi diverifikasi sekali (backend `ef985de`; game dari `hotfix/tes-recovery-4h-20261109`). `main` game hanya cangkang deploy.
- Logika ekonomi Pak Damar hidup di repo GAME (`economy/damar-core.js` + hook `opts.damar` di `economy/core.js`), disalin ke backend lewat skrip sinkron yang sudah ada — bukan jalur palsu di backend.
- Pak Damar dikunci flag `pakDamar` di Worker (404 saat mati), bawaan OFF. Angka hadiah (900 + 300) adalah USULAN yang butuh persetujuan Owner.
- Kegagalan perjalanan tidak menghapus ikan/progres: ikan menetap di kotak pendingin; hanya bonus segar yang bisa hilang. Ganti hari mengembalikan ikan ke inventaris.
- Kapal Rombongan dipisah sebagai PR kedua Fase A (butuh perubahan Durable Object + protokol di repo game).

## Kapal Rombongan (12 Nov 2026)
- Lewat WebSocket multiplayer yang ada, bukan D1/Firestore per frame; DO menyimpan struktur kapal hanya saat berubah.
- Server pemegang kebenaran: klien kirim niat saja; `vis:false` lama diganti aturan "pemain di kapal server tetap tampak".
- Dua saklar OFF: `NUSA_BOAT` (realtime) + `kapalRombongan` (server). Keduanya harus ON.
- `pakDamar` = sumber status aktif; `NUSA_DELIVERY` hanya saklar muat UI (lihat CONTRACTS.md A).
