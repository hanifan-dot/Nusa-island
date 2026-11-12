# Worker 02 (klien) — STATUS
Diperbarui: 2026-11-12 (PR-A3). Basis produksi `435c63d`. PR-A1 = #131 (`fitur/pelabuhan-pengiriman-20261112`); PR-A2 = branch `fitur/kapal-kemudi-damar-20261112` (bertingkat di atas A1).

## PR-A2 — selesai (Draft, semua flag OFF)
- Adapter klien ke kontrak Worker 01: `gameFlags.pakDamar` (gerbang server), `ecoDamarState/Load/Unload` dipakai; `Sail/Abort/Deliver` tersedia di adapter, belum dipanggil UI.
- `NUSA_DELIVERY` hanya memuat modul; server OFF = tidak ada meja/panel/akses. Adapter uji `window` dihapus.
- Dua kotak terisi (status server) tampak fisik di kapal (digambar mengikuti arah/goyangan kapal).
- UI Kemudi (`kemudi/*`, flag `NUSA_KEMUDI`): setir kembali ke tengah, tuas MAJU/NETRAL/MUNDUR, knot, arah, jangkar, Peta Laut, memancing, ke dermaga, tujuan, status muatan; joystick+kolom tombol lama disembunyikan saat naik kapal dan kembali saat turun. Fisika kapal tidak berubah.
- Titik perjalanan: penanda tujuan "Pelabuhan Kota (belum dibuka)"; tanpa hadiah dari klien.
- Kapal Rombongan: dikerjakan di PR-A3 (di bawah).

## PR-A3 — Kapal Rombongan (visual + klien) — Draft, bertingkat di atas `integrasi/fase-a-20261112`
Branch `fitur/kapal-rombongan-visual-20261112`. Semua flag tetap OFF. Pelabuhan Kota / angkat kotak / mobil Pak Damar / Sail-Abort-Deliver TIDAK ada di PR ini (PR terpisah).
- Protokol: memakai #132 apa adanya (`NW.mp.boats/boatMine/onBoat/boatNew/boatJoin/boatLeave/boatSteer/boatAnchor/boatGo`). TIDAK ada perubahan kontrak server; yang ditambah hanya dua pembaca klien kecil di `mp/client.js` (`NW.mp.player(id)`, `NW.mp.setSeatedSkip(fn)`) dan filter gambar.
- Gerbang: `NUSA_ROMBONGAN` (klien, bawaan false) HANYA memuat `rombongan/*`. Akses = `gameFlags.kapalRombongan===true` DAN welcome `bo===1` (`NW.mp.boatOn()`). Flag OFF → modul tak diunduh, kapal tunggal lama utuh. Server ON tetapi realtime OFF → keadaan gagal aman (titik "Kapal Rombongan" hanya menampilkan penjelasan; tanpa kapal/kursi palsu).
- Gambar: satu kapal per baris server, tiga awak nyata di kursi (0 kapten di kemudi, 1 penumpang depan, 2 penumpang belakang) dengan nama panggilan, pakaian & topi PUBLIK (kode penampilan multiplayer yang sudah ada). Posisi kursi = fungsi murni dari baris server → sama di semua klien.
- Animasi: naik (melompat dari dermaga), duduk, kapal bergerak, turun (melompat ke titik turun), pergantian kapten (geser kursi), kursi tertahan (⏳) lalu sambung ulang = duduk kembali di kursi yang sama (bukan naik lagi).
- Kontrol: hanya kapten (joystick → niat `steer`, tombol ⚓). Penumpang tidak bisa mengemudi; tetap bisa obrolan, emoji, peta. Memancing dari kursi hanya saat jangkar turun & kapal berhenti (memakai alur memancing laut yang sudah ada; posisi = kapal server). Pindah lokasi lewat peta ditolak selama duduk.
- Privasi: `NW.rombongan.state()` & DOM hanya id publik + nama panggilan; tes memastikan tak ada UID/token.
- Hook minimal di kode lama: `world/boat.js` (drawVessel: `opt.spec/opt.remote/opt.crew`), `world/world.js` (candidates/interact/draw/update, `pri` pada titik), `mp/client.js`, `game.js` (enterFishing/landBtn/travel), `index.html` (loader), `cloud/config.js`, `build-hosting.sh`.
### Tes PR-A3
unit-rombongan 11; browser test_rombongan 51 (3 klien bersamaan dengan pakaian berbeda, rebutan kursi, kapten pergi→promosi, putus/sambung ulang ≤20 dtk, pindah area (`go`/`arrive`), 360×740 / 412×915 / 740×360, privasi state/DOM, flag OFF, server OFF, realtime OFF).
### Batasan jujur
- Pindah area penuh (merender area tujuan untuk kru) BELUM: saat kapten `go`, kru tetap di adegan Muara dan kapal ditampilkan memudar + pesan "Berlayar…"; tampilan area tujuan = PR Pelabuhan Kota.
- Server tidak menahan kapten mengangkat jangkar saat penumpang sedang di layar memancing; penumpang tetap kembali ke kursi saat menutup layar. Perlu keputusan Worker 01 bila ingin dilarang di server.
- Tes memakai server dev (`mp-dev-server`) dan gameFlags tiruan; belum diuji di Cloudflare/Hosting produksi.

## Tes
unit-delivery 7, unit-kemudi 5, browser test_delivery 35 (flag OFF = nol unduhan & nol panggilan server; server OFF = tak ada akses; server ON = muat/bongkar; kemudi; 360×740, 412×915, 740×360, desktop). Regresi: bumbu24 104, bumbu241 83 (kapal), podium 24, quest_owner 48. Build + cek-rilis OK (delivery & kemudi ikut disalin). test_multiplayer gagal juga di basis (butuh server WS), unit-username gagal juga di basis.

## Belum / risiko
Pelabuhan Kota, mobil pendingin, animasi angkat kotak, bunyi kotak (PR-A3); Kapal Rombongan (menunggu protokol); screenshot bukti final (menunggu A3). Kemudi memakai arah-layar (8 mata angin), bukan kompas geografis. Hubungan basis #130/#131: bersaudara; konflik berkas docs perlu diselesaikan saat penggabungan.
