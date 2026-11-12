# Kontrak klien ↔ server (dipakai Worker 02)
Sumber resmi: backend PR #59 (`docs/ai-handoff/CONTRACTS.md`) + game PR #130 (`economy/damar-core.js`, hook `ecoDamar*`). Status: ✅ dipakai · ⏳ belum ada.

## Pengiriman Segar Pak Damar — ✅ dipakai (PR-A2)
- Status aktif = SERVER: `gameFlags` → `pakDamar`. `NUSA_DELIVERY` hanya mengontrol apakah modul diunduh; server OFF/404/gagal → meja & panel tidak muncul (gagal-tertutup).
- Dipakai: `ecoDamarState {}`, `ecoDamarLoad {opId, box, uids[1..3]}`, `ecoDamarUnload {opId, box}`. Tersedia di adapter tetapi BELUM dipanggil UI (menunggu Pelabuhan Kota, PR-A3): `ecoDamarSail`, `ecoDamarAbort`, `ecoDamarDeliver`.
- Tampilan `damar` dari server disaring (`Core.view`); tahap & kotak di kapal diturunkan dari server. Hadiah/koin hanya dari server (`reward`, `balance`); klien tidak menghitung apa pun.
- Catatan: `ecoDamarLoad` memindahkan ikan dari kotak server; Tas lokal ikut dikurangi (cermin) dan dikembalikan saat `ecoDamarUnload`. `view.box` dari server hanya uid, jadi nama/berat dibaca dari Tas lokal / `damar.boxes[].fish`.
- Angka hadiah (900 + 300) = usulan, butuh persetujuan Owner (Worker 01); klien tidak menampilkan angka sebelum server mengirim `reward`.

## Kapal Rombongan (flag `kapalRombongan`) — ⏳ kontrak ada, kode server belum
Pesan `boat.board/leave/steer/anchor`, entitas kapal di `cf-multiplayer`. Klien belum membuat apa pun (tanpa multiplayer palsu). UI Kemudi (PR-A2) bersifat lokal dan akan memakai protokol ini setelah tersedia.

## Lain-lain — ⏳
NusaPhone/Klippy/NusaChat, harga Kedai Bu Indah, penanda intro per akun.
