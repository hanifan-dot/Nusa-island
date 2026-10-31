# Koordinasi WORKING 02 ⇄ WORKING 01 (kunjungan rumah teman)

Sesi WORKING 01 terpisah; koordinasi lewat repo/PR ini.
**Aturan:**
1. **Satu Worker `nusa-multiplayer`, satu workflow, satu skrip rilis.** Jangan membuat workflow deploy lain atau Worker lain untuk Hosting yang sama. Worker `nusa-api` tidak disentuh siapa pun lewat tombol ini.
2. **Pesan baru = keluarga `rm_*`** (additive). Jenis pesan lama (`firebase/release-manifest.json` → `protocol_contract`) tidak boleh diubah/dihapus; tes `tests/unit-rilis.js` dan `cek-rilis.js` akan menolak.
3. **Rumah = Durable Object baru** (kelas baru + migrasi `v2` di `wrangler.toml`, jangan ubah `v1`). `MuaraRoom`/`Lobby` hanya diubah bila perlu dan tetap kompatibel (ID server, kapasitas, `/rooms`).
4. **Berkas rawan bentrok:** `mp/client.js`, `mp/ui.js`, `mp/room-core.js`, `mp/lobby-core.js`, `cf-multiplayer/src/index.js`, `hud/menu.js` (+ `game.js` urutan hook). Gabungkan kecil & sering; rebase dari `fitur/tahap-4-2-server-browser`.
5. **Fitur baru** ditambahkan ke `firebase/release-manifest.json` (berkas, tag index, penanda) agar ikut dijaga setiap rilis.
6. Tidak ada rahasia di repo; rilis hanya lewat tombol "Deploy Nusa Island" dengan persetujuan pemilik. Detail pesan: `docs/MP-PROTOKOL.md`.
