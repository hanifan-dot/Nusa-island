# Koordinasi WORKING 02 ⇄ WORKING 01 (kunjungan rumah teman)

Sesi WORKING 01 terpisah; koordinasi lewat repo/PR ini.
**Aturan:**
1. **Satu Worker `nusa-multiplayer`, satu workflow, satu skrip rilis.** Jangan membuat workflow deploy lain atau Worker lain untuk Hosting yang sama. Worker `nusa-api` tidak disentuh siapa pun lewat tombol ini.
2. **Pesan baru = keluarga `rm_*`** (additive). Jenis pesan lama (`firebase/release-manifest.json` → `protocol_contract`) tidak boleh diubah/dihapus; tes `tests/unit-rilis.js` dan `cek-rilis.js` akan menolak.
3. **Rumah = Durable Object baru** (kelas baru + migrasi `v2` di `wrangler.toml`, jangan ubah `v1`). `MuaraRoom`/`Lobby` hanya diubah bila perlu dan tetap kompatibel (ID server, kapasitas, `/rooms`).
4. **Berkas rawan bentrok:** `mp/client.js`, `mp/ui.js`, `mp/room-core.js`, `mp/lobby-core.js`, `cf-multiplayer/src/index.js`, `hud/menu.js` (+ `game.js` urutan hook). Gabungkan kecil & sering; rebase dari `fitur/tahap-4-2-server-browser`.
5. **Fitur baru** ditambahkan ke `firebase/release-manifest.json` (berkas, tag index, penanda) agar ikut dijaga setiap rilis.
6. Tidak ada rahasia di repo; rilis hanya lewat tombol "Deploy Nusa Island" dengan persetujuan pemilik. Detail pesan: `docs/MP-PROTOKOL.md`.

## Integrasi 4.2 ⇄ Kunjungi Rumah (diselesaikan WORKING 01, 1 Nov 2026)
Cabang `fitur/kunjungi-rumah-teman` sekarang memuat `fitur/tahap-4-2-server-browser` (PR #23) utuh. Kesepakatan yang dijaga:
* **Protokol:** tidak ada jenis pesan lama yang diubah/dihapus (`protocol_contract` utuh). Tambahan hanya di ruang rumah: bendera tampilan `F.IN` (16), pesan `k` dari pemilik dipakai "keluarkan tamu" (hanya di `HouseRoom`; di Muara tetap pelanggaran biasa), kolom baris pemain ke-10/11 (pemilik, id publik) **hanya** di ruang rumah. Kolom ke-9 (pamer ikan, 4.2) tetap untuk semua ruang.
* **Durable Object:** `MuaraRoom`/`Lobby` kompatibel (ID 1–12, kapasitas, `/rooms`, `sync` daftar anggota). `HouseRoom` = kelas baru + migrasi `v2`; `lobbyCall` dimatikan di `HouseRoom` sehingga ruang rumah tidak pernah masuk hitungan server Muara.
* **Klien:** satu WebSocket. Masuk rumah → pindah ke ruang rumah; keluar → kembali ke server Muara yang SAMA yang dipilih pemain (`R.resume` dipertahankan). Panah teman, jam dunia, pamer ikan tidak aktif di dalam rumah (interior).
* **Rilis:** fitur `kunjungi-rumah` ditambahkan ke `firebase/release-manifest.json`. Rilis rumah butuh Worker `nusa-api` (endpoint rumah) — di luar tombol GitHub; dijalankan lewat skrip rilis di repo dashboard dengan persetujuan pemilik.
* **Privasi bawaan rumah = PRIVAT**, tidak masuk pencarian nama; ditemukan lewat kode teman 8 huruf.
