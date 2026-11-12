# Keputusan
- 2026-11-12: basis = `435c63d` (pin Hosting produksi terakhir). `main` hanya berisi CI.
- Flag `window.NUSA_DELIVERY` bawaan `false`; bila false, `delivery/*` tidak diunduh (tes: nol unduhan, dunia identik).
- Klien hanya mengirim uid item ikan + opId; `Core.hasForbidden` menjaga tidak ada field uang/uid/role.
- Tanpa adapter server, tombol Kirim jujur: "belum dibuka server", ikan tetap di Tas.
- Satu fase kecil per Draft PR; fitur berat (interior, minigame, pulau) wajib lazy-load.
- 2026-11-12 (PR-A2): PR #131 dan PR #130 sama-sama bercabang dari `435c63d` (bersaudara, bukan bertingkat). Tidak ada cherry-pick/rebase. Klien hanya bergantung pada KONTRAK (`ecoDamar*`, `gameFlags`), bukan pada kode #130; tes memakai server tiruan sesuai kontrak. Berkas docs yang sama di kedua PR (`worker-01/STATUS`, `codex/REVIEW`) disalin persis dari #130 agar tidak konflik; `MASTER-PLAN`, `DECISIONS`, `CONTRACTS`, `worker-02/STATUS` berbeda isi → perlu penyelesaian saat penggabungan (Owner/Codex).
- Gerbang fitur Pak Damar = `gameFlags.pakDamar` (server). `NUSA_DELIVERY` = hanya pemuatan modul. Adapter uji lewat `window` DIHAPUS (celah akses).
- UI Kemudi: flag terpisah `NUSA_KEMUDI` (hanya pemuatan; bawaan false). Fisika kapal tidak diubah.
- Pelabuhan Kota belum ada → Sail/Deliver belum dipanggil; penanda tujuan "Pelabuhan Kota (belum dibuka)".
