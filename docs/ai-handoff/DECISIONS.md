# Keputusan
- 2026-11-12: Basis produksi diverifikasi sekali (backend `ef985de`; game dari `hotfix/tes-recovery-4h-20261109`). `main` game hanya cangkang deploy.
- Logika ekonomi Pak Damar hidup di repo GAME (`economy/damar-core.js` + hook `opts.damar` di `economy/core.js`), disalin ke backend lewat skrip sinkron yang sudah ada — bukan jalur palsu di backend.
- Pak Damar dikunci flag `pakDamar` di Worker (404 saat mati), bawaan OFF. Angka hadiah (900 + 300) adalah USULAN yang butuh persetujuan Owner.
- Kegagalan perjalanan tidak menghapus ikan/progres: ikan menetap di kotak pendingin; hanya bonus segar yang bisa hilang. Ganti hari mengembalikan ikan ke inventaris.
- Kapal Rombongan dipisah sebagai PR kedua Fase A (butuh perubahan Durable Object + protokol di repo game).
