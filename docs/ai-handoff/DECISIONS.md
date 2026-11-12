# Keputusan
- 2026-11-12: basis = `435c63d` (pin Hosting produksi terakhir). `main` hanya berisi CI.
- Flag `window.NUSA_DELIVERY` bawaan `false`; bila false, `delivery/*` tidak diunduh (tes: nol unduhan, dunia identik).
- Klien hanya mengirim uid item ikan + opId; `Core.hasForbidden` menjaga tidak ada field uang/uid/role.
- Tanpa adapter server, tombol Kirim jujur: "belum dibuka server", ikan tetap di Tas.
- Satu fase kecil per Draft PR; fitur berat (interior, minigame, pulau) wajib lazy-load.
