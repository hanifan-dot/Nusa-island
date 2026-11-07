# 🔄 Pulihkan Data (menu ☰) — catatan hasil tugas

Status: **selesai dikode & diuji; menunggu review Owner. Belum merge, belum deploy.**
Cabang: `fitur/pulihkan-data-menu-20261106` (dasar: `fitur/portal-pemulihan-20261103`).

## Cara kerja
- Menu ☰ → ubin "🔄 Pulihkan Data" (setelah Profil & Akun) → panel bergaya Nusa Island (bottom-sheet HP).
- "🔍 Cari & Pulihkan Data": (0%) mulai → (5–25%) cek akun → (30–50%) baca cadangan lokal (HANYA BACA) → (55%, indikator tanpa persen) tanya Cloud Save akun sendiri → (75%) selesai mencari, belum ada yang dipulihkan. **100% hanya setelah pemulihan Cloud benar-benar selesai dan terverifikasi.**
- **Cloud Save akun sendiri** (diverifikasi server lewat token): konfirmasi → simpanan lokal dicadangkan dulu (`nusa-island-v1-backup-pulih-<ts>`) → ditulis → dibaca ulang & dicocokkan (gagal = dikembalikan) → "✅ DATA BERHASIL DIPULIHKAN!" + tombol "🔄 REFRESH GAME SEKARANG". Tidak menulis ke server (rev Cloud tetap).
- **Cadangan lokal browser** = bukti lemah (localStorage bisa diedit) → TIDAK dipasang langsung. Hanya bisa diajukan ke Owner lewat endpoint `recoveryRequest` yang sudah ada (perlu login Google; 1 permohonan; hasil "⏳ PERMOHONAN PEMULIHAN DIKIRIM", tanpa klaim berhasil).
- Tanpa cadangan: info jelas + tautan `ajukan-pemulihan.html`; tanpa janji pengembalian otomatis.
- Tamu: cadangan terlihat, tombol "Hubungkan / Masuk Google" (alur migrasi yang sudah ada); kirim permohonan dinonaktifkan.

## Batas pemulihan otomatis
Hanya Cloud Save milik akun yang sedang login yang dipulihkan otomatis. Progres dari UID lain / cadangan lokal selalu lewat persetujuan Owner. Ketersediaan endpoint Worker `recoveryRequest` di produksi belum diverifikasi (gagal ditangani: "belum terkirim" + portal).

## File
Baru: `recovery/core.js`, `recovery/client.js`, `recovery/recovery.css`, `tests/unit-recovery-ui.js`, `tests/browser/test_pulihkan.py`, `docs/PULIHKAN-DATA.md`.
Diubah: `cloud/cloud.js` (`cloud.peek`, `cloud.restoreCloud`), `hud/menu.js`, `game.js` (1 baris hook), `index.html`, `firebase/scripts/build-hosting.sh`, `firebase/release-manifest.json`.

## Pengujian
- `node tests/unit-recovery-ui.js` 9 lulus; browser `tests/browser/test_pulihkan.py` 63 lulus (HP 360×740, adapter demo + inti server sama dengan produksi).
- Regresi minimum: unit-cloud 71, unit-guest-entry, unit-recovery-portal, unit-rescue-page, unit-rilis 21, cek-rilis OK, test_ui41 40 lulus.
- Belum diuji: Firestore/Cloudflare nyata, HP Android fisik.
