# Kontrak API (Worker 01 → Worker 02)

Semua lewat `POST /fn/<nama>` dengan `{data:{...}}`, token pemain. Respons sukses: `{result:{...}}`. Tanpa UID/email/token/payment ID.

## Feature flag (Owner saja, `POST /api/features`, bawaan SEMUA MATI)
`gameFlags` (pemain masuk) → `{leaderboard, socialHome, pakDamar, kapalRombongan}` (boolean). Gagal baca = false (gagal-tertutup). Saat `pakDamar=false`, semua `ecoDamar*` → 404 `not_found`.

## 1. Pengiriman Segar Pak Damar (flag `pakDamar`)
Server: `economy/damar-core.js` (game) disalin ke backend `server/vendor/damar-core.cjs`. Hari = jam SERVER WIB (UTC+7, reset 00:00). Klien tidak mengirim hari/waktu/hadiah (field itu diabaikan).
Aturan: pesanan 6 ikan/hari; 2 kotak × maks 3 ikan; ikan bukan sampah/terlindungi; ikan dipindah dari kotak server (`box`) → kotak pendingin → terkirim (dikonsumsi tepat sekali); pelayaran minimal 45 dtk; segar bila ≤20 mnt sejak muat; hadiah dibayar tepat sekali per hari (USULAN: 900 + hingga 300 bonus segar — butuh persetujuan Owner sebelum flag ON).

| Fungsi | Body | Catatan |
|---|---|---|
| `ecoDamarState` | `{}` | baca; ganti hari mengembalikan ikan kotak ke inventaris |
| `ecoDamarLoad` | `{opId, box:0\|1, uids:[1..3]}` | ikan harus ada di `box` server pemain |
| `ecoDamarUnload` | `{opId, box}` | hanya kotak yang belum berlayar |
| `ecoDamarSail` | `{opId, box}` | kotak tak kosong |
| `ecoDamarAbort` | `{opId, box}` | pelayaran gagal/batal: ikan TETAP di kotak, progres tidak hilang |
| `ecoDamarDeliver` | `{opId, box}` | di Pelabuhan Kota; terlalu cepat → 409; hadiah di `reward` hanya saat pesanan ke-6 |

Respons selalu memuat `damar`: `{day,need,per,delivered,paid,reward,preview:{base,freshBonus},freshMs,minTripMs,boxes:[{st:'idle'|'sailing',n,fish:[{u,id,w}],freshLeftMs,sailMs}]}` + tampilan ekonomi (`balance`, `box`, …). `opId` wajib (8–64 karakter); retry opId sama → `duplicate:true`, tanpa efek ganda. Error: 409 `failed-precondition` (aturan), 400 `invalid-argument`, 404 (flag mati).

## 7/2. Kapal Rombongan + UI Kemudi (flag `kapalRombongan`) — KONTRAK, belum ada kode
Jalur: multiplayer realtime yang ada (`cf-multiplayer` Durable Object; kode di repo GAME `mp/` + `cf-multiplayer/`). TIDAK memakai D1/Firestore per frame.
- Entitas kapal di ruang: `{bid, area, x, y, dir, spd, anchor:bool, seats:[captain, p1, p2]}` — kursi berisi ID publik pemain (`pid`, bukan UID akun) atau kosong. Maks 3 total.
- Pesan klien→server: `boat.board{bid,seat}`, `boat.leave`, `boat.steer{dir,thr}` (hanya kapten), `boat.anchor{on}`. Server menurunkan posisi dari input kapten dengan batas kecepatan; posisi/kecepatan klien tidak dipercaya.
- Server→semua: snapshot kapal + delta kursi (naik/turun beranimasi), area aktif, tujuan. Penumpang: chat/emote/peta; memancing hanya bila `anchor=true`.
- Kasus: kapten keluar/putus → pelimpahan ke penumpang tertua atau kapal bubar (penumpang diturunkan di dermaga); satu pemain hanya satu kapal; pindah server = turun dari kapal; kursi kosong boleh diisi; timeout sambungan 20 dtk → kursi dilepas.
- Hadiah/ikan penumpang tetap lewat ekonomi server (`ecoCatch`), bukan lewat kapal.

### Diagnosis: kenapa teman tidak melihat pemain naik kapal (dugaan kuat, dari kode)
1. `mp/client.js` (`mp/client.js:54`): `vis = … && !(NW.boat && NW.boat.on)` → saat pemain di atas kapal, klien mengirim `vis:false`; pemain HILANG dari semua teman.
2. Protokol multiplayer tidak punya entitas kapal/kursi; hanya `x,y,dir,flags` per pemain dan `AREA` tetap Muara, sehingga kapal tidak ada untuk teman dan perpindahan area membuat pemain lenyap dari ruang.
3. Server membatasi `MAX_SPEED = 9` tile/dtk per pemain; posisi kapal yang digerakkan klien bisa tertahan/terpental.
Perbaikan = entitas kapal server-side di atas (bukan memperbaiki flag `vis`).
