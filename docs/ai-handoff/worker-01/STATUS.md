# Worker 01 — STATUS (12 Nov 2026)
**Fase A selesai (2 PR draft game + 1 PR draft backend). Tidak lanjut ke Fase B.**
- PR Pak Damar: game #130 (`fitur/fase-a-damar-20261112`) + backend #59 (`fitur/fase-a-kontrak-20261112`).
- PR Kapal Rombongan: `fitur/fase-a-kapal-20261112` (bertumpu di atas cabang #130, hanya untuk berbagi docs/kontrak; berkas kodenya terpisah).
- Kapal — berkas: `mp/proto.js`, `mp/room-core.js`, `mp/client.js`, `cf-multiplayer/src/index.js`, `cf-multiplayer/wrangler.toml`, `tests/dev/mp-dev-server.js`, `tests/unit-boat.js`, `tests/browser/test_boat.py`.
- Flag (semua MATI): `pakDamar=false`, `kapalRombongan=false` (server nusa-api), `NUSA_BOAT="tidak"` (env nusa-multiplayer). Migrasi pending: tidak ada.
- Tes: unit-boat 79/79; browser test_boat 17/17; unit-mp 193, unit-mp-house 23, semua unit lain hijau. `test_multiplayer.py` GAGAL di langkah 2 (`#gwContinue` timeout, akun uji kedua) — GAGAL IDENTIK di basis tanpa perubahan saya (baseline lama, bukan regresi).
- Risiko/blocker: kapal belum digambar (Worker 02); daftar area belum di-whitelist (hanya regex); DO menyimpan struktur kapal kasar saat berubah saja; konstanta jalur air diturunkan dari peta di basis 435c63d; hadiah Pak Damar 900+300 hanya angka uji, butuh persetujuan Owner.
- Urutan deploy bila Owner setuju: backend #59 → game #130 → `nusa-multiplayer` (`NUSA_BOAT=ya`) → flag server satu per satu. Tidak ada merge/deploy/migrasi/backfill/perubahan data pemain.
