# Worker 01 — STATUS (12 Nov 2026)
- Tugas: Fase A. Selesai: flag + Pak Damar server. Belum: kapal rombongan (kontrak ditulis di CONTRACTS.md).
- Game (PR draft): `economy/damar-core.js`, `economy/core.js` (hook `ecoDamar*`), `firebase/scripts/sync-economy.js`, salinan `firebase/functions/lib/*`, `tests/unit-damar.js`.
- Backend (PR draft): `server/features.js`, `worker/index.js`, `server/vendor/{damar-core,economy-core}.cjs`, `scripts/sync-economy.mjs`, `test/damar.test.js`, tes gameFlags diperbarui.
- Flag baru: `pakDamar=false`, `kapalRombongan=false`. Migrasi pending: tidak ada.
- Blocker: hadiah Pak Damar perlu persetujuan Owner; kapal butuh perubahan `cf-multiplayer` (repo game).
