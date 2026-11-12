# Keputusan
<<<<<<< HEAD
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
=======
- 2026-11-12: basis = `435c63d` (pin Hosting produksi terakhir). `main` hanya berisi CI.
- Flag `window.NUSA_DELIVERY` bawaan `false`; bila false, `delivery/*` tidak diunduh (tes: nol unduhan, dunia identik).
- Klien hanya mengirim uid item ikan + opId; `Core.hasForbidden` menjaga tidak ada field uang/uid/role.
- Tanpa adapter server, tombol Kirim jujur: "belum dibuka server", ikan tetap di Tas.
- Satu fase kecil per Draft PR; fitur berat (interior, minigame, pulau) wajib lazy-load.
>>>>>>> o/pelabuhan-pengiriman-20261112

## Keputusan Worker 02 (klien)
- Basis klien = `435c63d`; `main` hanya berisi CI.
- `window.NUSA_DELIVERY` bawaan `false`; bila false, `delivery/*` tidak diunduh (tes: nol unduhan).
- Klien hanya mengirim uid item ikan + opId; `Core.hasForbidden` menjaga tidak ada field uang/uid/role.
- Tanpa adapter server, tombol Kirim jujur "belum dibuka server"; ikan tetap di Tas.
- Satu fase kecil per Draft PR; fitur berat wajib lazy-load.

## Keputusan Worker 02 tambahan (#133)
- (Worker 02) 2026-11-12 (PR-A2): PR #131 dan PR #130 sama-sama bercabang dari `435c63d` (bersaudara, bukan bertingkat). Tidak ada cherry-pick/rebase. Klien hanya bergantung pada KONTRAK (`ecoDamar*`, `gameFlags`), bukan pada kode #130; tes memakai server tiruan sesuai kontrak. Berkas docs yang sama di kedua PR (`worker-01/STATUS`, `codex/REVIEW`) disalin persis dari #130 agar tidak konflik; `MASTER-PLAN`, `DECISIONS`, `CONTRACTS`, `worker-02/STATUS` berbeda isi → perlu penyelesaian saat penggabungan (Owner/Codex).
- (Worker 02) Gerbang fitur Pak Damar = `gameFlags.pakDamar` (server). `NUSA_DELIVERY` = hanya pemuatan modul. Adapter uji lewat `window` DIHAPUS (celah akses).
- (Worker 02) UI Kemudi: flag terpisah `NUSA_KEMUDI` (hanya pemuatan; bawaan false). Fisika kapal tidak diubah.
- (Worker 02) Pelabuhan Kota belum ada → Sail/Deliver belum dipanggil; penanda tujuan "Pelabuhan Kota (belum dibuka)".
