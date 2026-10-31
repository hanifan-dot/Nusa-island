# Protokol multiplayer v1 — panduan integrasi (untuk WORKING 01 / kunjungan rumah)

Sumber kebenaran: `mp/proto.js` (konstanta, pembersih), `mp/room-core.js` (aturan satu instance), `mp/lobby-core.js` (pintu masuk), `cf-multiplayer/src/index.js` (pembungkus Cloudflare), `mp/client.js` (klien). Semua logika murni diuji di Node (`tests/unit-mp.js`).

## Pesan (JSON; klien → server)
| t | Isi | Catatan |
|---|---|---|
| `hello` | `n,r,rd,x,y,d,f` | profil + posisi awal (x,y = tile×20); membuat pemain terlihat |
| `m` | `x,y,d,f` | posisi; `f` = bit (1 jalan, 2 duduk, 4 memancing, 8 teleport sah) |
| `h` | – | heartbeat; dibalas `k` berisi jam server `st` |
| `v` | `on` | tampil/sembunyi (di luar Muara) — menyembunyikan juga menghapus status pamer |
| `p` | `n,r,rd` | ubah nama/gelar/joran (kosmetik) |
| `c` / `e` | `m` / `i` | chat (disaring server) / emoji |
| `f` | `i,w,v` atau kosong | **pamer ikan**: spesies, berat (gram), varian. Tanpa uid/inventaris. Kosong = berhenti |
| `o` | `lo` | mode hemat data |
Server → klien: `w` (welcome: `me,room,rn,n,v,cap,ps[],st`), `cnt` (`n` tersambung, `v` terlihat), `j`/`l` (masuk/keluar; baris pemain = `[id,nama,rank,rod,x,y,d,f,hold|0]`), `s` (delta posisi), `f` (`id,h`), `c`, `e`, `k` (`st`), `n` (catatan sistem), `x` (`e`: full/bad_room/rate/busy/disabled).
Penutupan: 4002 sesi ganda, 4003 timeout, 4005 pelanggaran, 4006 server penuh, 4007 ID salah, 4008 terlalu sering, 4009 tidak tersedia. Galat masuk dikirim LEWAT WebSocket karena browser tidak bisa membaca status HTTP jabat tangan.
Koneksi: `wss://…/ws?room=<1..12>` atau `?mode=random`; subprotocol `nusa.v1, <token ID Firebase>`; daftar server `GET /rooms` (Bearer token).

## Aturan tak tertulis yang dijaga
- Protokol TIDAK pernah membawa koin, item, uid, email, atau isi coolbox. Klien tidak dipercaya untuk apa pun selain tampilan.
- uid hanya ada di server (peta `byUid`), tidak pernah dikirim ke pemain lain.
- Kapasitas, ID server, kecepatan, laju pesan, dan sanitasi diputuskan SERVER. Jam dunia = fungsi murni waktu server (`P.sharedHour`), bukan jam HP.

## Menambah fitur kunjungan rumah tanpa saling menimpa (saran)
1. **Jangan ubah** `Room`/`Lobby`/pesan yang ada. Tambah keluarga pesan baru berawalan sendiri (mis. `rm_*`) dan DO kelas baru (mis. `RumahRoom` dikunci id pemilik) di `cf-multiplayer/src/`; pakai ulang `mp/jwt.js` dan pembersih di `mp/proto.js`.
2. `wrangler.toml`: tambah binding + **migrasi baru** (`tag = "v2"`, `new_sqlite_classes = ["RumahRoom"]`). Jangan mengedit migrasi `v1`.
3. Satu Worker `nusa-multiplayer` dan satu workflow rilis; konfirmasi urutan merge lewat PR bertingkat.
4. Titik sentuh bersama yang rawan konflik git: `index.html` (tag script), `game.js` (satu baris `NW.mp.hook()` + `stepHour`), `world/world.js` (hook bertanda "Dunia Bersama"), `world/hold.js` (fungsi `snapshot/remoteFrame/liftFor/drawRemoteTag`), `firebase/scripts/build-hosting.sh`, `hud/menu.js` (daftar `KNOWN`). Perubahan saya pada file-file itu kecil dan bertanda komentar "Dunia Bersama / Tahap 4.x".
5. Rumah tamu = area berbeda dari Muara: pemain di rumah tetap "tersembunyi" dari dunia Muara (`v:0`); kunjungan butuh konsep room/scene baru, bukan memakai ulang `muara-N`.
