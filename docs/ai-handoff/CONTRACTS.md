# Kontrak API (Worker 01 → Worker 02) — RESMI

Sumber kebenaran: kode di backend PR #59 (`worker/index.js`, `server/features.js`, `server/vendor/damar-core.cjs`) dan game PR #130 (`economy/damar-core.js`, `economy/core.js`). Bila dokumen ini berbeda dari kode, KODE yang benar — laporkan ke Worker 01.
Semua fungsi lewat `POST /fn/<nama>` dengan `{data:{...}}` dan token pemain. Sukses: `{result:{...}}`. Galat: HTTP 400 `invalid-argument`, 404 `not_found` (flag mati), 409 `failed-precondition`, 429 `rate_limited` (240 permintaan/menit/pemain). Tanpa UID/email/token/payment ID di respons ke klien lain.

## A. Feature flag — SERVER adalah sumber status aktif
| Flag | Di mana | Pemilik | Arti |
|---|---|---|---|
| `pakDamar` | server (`shop_config/main.features`, lewat `POST /api/features`, bawaan MATI, gagal-tertutup) | Owner | Saat false, SEMUA `ecoDamar*` → 404. Dibaca klien lewat `gameFlags` → `{leaderboard, socialHome, pakDamar, kapalRombongan}`. |
| `window.NUSA_DELIVERY` | klien (`cloud/config.js`, bawaan `false`) | build/uji | HANYA saklar unduh kode UI (`delivery/*` lazy-load). Bukan otorisasi, bukan status fitur. |
| `kapalRombongan` | server nusa-api (`features`, bawaan MATI) | Owner | Dibaca klien lewat `gameFlags`. Dipasangkan dengan saklar realtime di bawah. |
| `NUSA_BOAT` | env Worker `nusa-multiplayer` (`"tidak"` bawaan, `"ya"` = ON) | Owner | Server realtime baru memproses/menyiarkan kapal bila `ya`; welcome membawa `bo:1`. |
| `kotaNusa` | server nusa-api (`features`, bawaan MATI, gagal-tertutup) | Owner | Dibaca klien lewat `gameFlags` → `{leaderboard, socialHome, pakDamar, kapalRombongan, kotaNusa}`. Dipasangkan dengan saklar realtime di bawah. Backend: PR baru di atas #59 (repo `nusa-island-control-center`). |
| `window.NUSA_KOTA` | klien (`cloud/config.js`, bawaan `false`) | build/uji | HANYA saklar unduh modul visual `kota/*` (termasuk `kota/mp.js`). Bukan otorisasi. |
| `NUSA_KOTA` (env) | env Worker `nusa-multiplayer` (`"tidak"` bawaan, `"ya"` = ON) | Owner | Server realtime baru melayani area Kota (`selat`) per pemain bila `ya`; welcome membawa `ko:1`. |

**Aturan hubungan flag (wajib dipatuhi klien):**
1. Pengiriman Pak Damar aktif untuk pemain hanya bila `NUSA_DELIVERY===true` (kode UI ada) **DAN** `gameFlags.pakDamar===true` (server mengizinkan). Salah satu mati → UI tidak menampilkan titik masuk quest / menampilkan "belum tersedia"; tidak boleh memanggil `ecoDamar*` bila `pakDamar=false`.
2. Server tetap menolak walau klien memaksa: `NUSA_DELIVERY=true` + `pakDamar=false` → 404. Klien TIDAK boleh menyimpulkan status aktif dari flag lokal, cache, atau dari keberhasilan panggilan lama; status = `gameFlags` terbaru.
3. Kapal Rombongan aktif hanya bila `gameFlags.kapalRombongan===true` **DAN** welcome multiplayer `bo===1` (`NW.mp.boatOn()`). Owner menyalakan kedua sisi (seperti `mpUpdated` pada Rumahku Sosial); bila hanya salah satu → fitur tidak muncul.

## B. Pengiriman Segar Pak Damar (flag `pakDamar`)
Hari = jam SERVER WIB (reset 00:00 UTC+7); klien tidak mengirim hari/waktu/hadiah/harga (field itu diabaikan). Pesanan 6 ikan/hari; 2 kotak × maks 3; ikan bukan sampah/terlindungi; ikan dipindah dari kotak server (`box`) → kotak pendingin → terkirim (dikonsumsi tepat sekali); pelayaran minimal 45 dtk; segar bila ≤20 mnt sejak muat; hadiah tepat sekali per hari. **Angka hadiah 900 + maks 300 = ANGKA UJI, bukan keputusan Owner; jangan dijanjikan di UI produksi.**
`opId` wajib untuk semua aksi ubah: `^[A-Za-z0-9_-]{8,60}$`; opId sama → `duplicate:true`, tanpa efek ganda. `box` = 0 atau 1. `uids` = 1–3 uid ITEM ikan (bukan uid pemain), unik, ada di `box` server pemain.

| Fungsi | Body | Hasil khusus (selain `damar` + tampilan ekonomi) | Penolakan khas |
|---|---|---|---|
| `ecoDamarState` | `{}` | — (ganti hari mengembalikan ikan kotak ke inventaris) | — |
| `ecoDamarLoad` | `{opId, box, uids}` | `loaded:n` | 409 ikan tak ada/sampah/kotak penuh/>6 total |
| `ecoDamarUnload` | `{opId, box}` | `returned:n` | 409 bila kotak berlayar |
| `ecoDamarSail` | `{opId, box}` | `sailing:box` | 409 kotak kosong/sudah berlayar |
| `ecoDamarAbort` | `{opId, box}` | `aborted:box` — ikan TETAP di kotak | 409 bila tidak berlayar |
| `ecoDamarDeliver` | `{opId, box}` | `moved, fresh, reward` (reward>0 hanya saat pesanan ke-6) | 409 "belum sampai" bila <45 dtk |

Setiap respons memuat `ok:true`, `damar`, dan tampilan ekonomi (`balance`, `own`, `topup`, `box`, `up`, `homeLv`, `cat`, `claimed`, `troph`, …).
`damar`: `{day, need:6, per:3, delivered, paid, reward|null, preview:{base,freshBonus}, freshMs, minTripMs, boxes:[{st:'idle'|'sailing', n, fish:[{u,id,w}], freshLeftMs|null, sailMs}]}`.

**Peta adapter klien (`NW.deliveryApi`, PR #131 `submit({v:1,opId,boxes:[[uid×3],[uid×3]]})`)** — server TIDAK punya satu panggilan `submit`; adapter menyusunnya dari: `ecoDamarLoad`(kotak 0) → `ecoDamarLoad`(kotak 1) → `ecoDamarSail`×2 (di dermaga) → `ecoDamarDeliver`×2 (di Pelabuhan Kota). Setiap langkah punya `opId` sendiri (turunan `opId` induk + akhiran langkah agar retry aman). Kegagalan pelayaran → `ecoDamarAbort`, bukan membuang progres. Hasil/hadiah selalu dari respons server.

## C. Kapal Rombongan (flag `kapalRombongan` + `NUSA_BOAT=ya`) — diimplementasi di PR kapal
Jalur: WebSocket multiplayer yang ada (`cf-multiplayer` DO; logika di `mp/room-core.js`, protokol `mp/proto.js`). Tanpa D1/Firestore per frame; DO hanya menyimpan struktur kapal saat berubah.
Kursi: 0 = kapten, 1–2 = penumpang; maks 3 total. Isi kursi = id publik pemain (`pid`, bukan UID). Geometri (Muara): dermaga x32–40,y20–21; tambatan `[37.2,23.4]` dst (`P.BOAT.SLOTS`); jalur air `x34–39.6, y22.4–50.5`; titik turun `[35.5,20.6]`.

**Klien → server** (`{t:"bt", a:...}`, hanya NIAT; posisi/kecepatan/hadiah tidak pernah dipercaya):
`new` (buat kapal dekat dermaga, jadi kapten) · `join{b,s∈{1,2}}` · `leave` · `steer{d:0..7, th:0..2}` (kapten; butuh jangkar naik) · `anchor{on}` (kapten) · `go{ar}` (kapten; jangkar turun & berhenti; `ar`=id area `^[a-z][a-z0-9_]{1,23}$`).
**Server → klien:** welcome `w` + `bo:1`, `bs:[baris]`, `mb:[id,kursi]` (kapalku setelah reconnect) · `bs{q,u:[baris]}` (≤5 Hz) · `bd{id}` (bubar/berangkat) · `bv{ev,b,p,s,ar}` dengan `ev` = `board|leave|cap|depart|arrive|area` (untuk animasi naik/turun/ganti kapten/berangkat/tiba) · `bn{r}` alasan penolakan: `off,hidden,aboard,full,far,none,away,moving,seat,captain,anchor,early,same`.
**Baris kapal:** `[id, x×20, y×20, arah0-7, kecepatan×10, bendera(1=jangkar,2=pergi), kursi0, kursi1, kursi2]` (kursi 0 = kosong; pid tanpa pemain di daftar = kursi tertahan/menunggu reconnect).
**Aturan server:** naik/turun hanya saat jangkar turun & kapal berhenti; kursi rebutan → yang pertama diproses menang, lainnya `bn seat`; satu pemain satu kapal; pemain di kapal tidak bisa menggerakkan dirinya sendiri (posisi mengikuti kapal; klien lama tetap melihatnya duduk di kapal); kapten pergi/putus → penumpang terhubung berkursi terkecil jadi kapten, jangkar turun; putus → kursi ditahan 20 dtk untuk reconnect (kursi sama, pid baru) lalu bebas; kapal tanpa kru terhubung & tanpa kursi tertahan bubar; `go` keluar Muara = kapal & kru hilang dari pandangan pemain Muara (kru tetap duduk dan saling melihat), kembali ke Muara paling cepat 8 dtk (jam server) dengan peristiwa `arrive`.
**API klien (`mp/client.js`) untuk Worker 02:** `NW.mp.boatOn()`, `boats()` (id,x,y,tx,ty,d,v,anchor,away,seats — x,y dihaluskan), `boatMine()`, `onBoat(fn)` (peristiwa `sync,state,gone,board,leave,cap,depart,arrive,area,note`), `boatNew()`, `boatJoin(b,s)`, `boatLeave()`, `boatSteer(d,th)`, `boatAnchor(on)`, `boatGo(ar)`. Perilaku lama `vis:false` saat `NW.boat.on` DIGANTI: pemain yang duduk di kapal server tetap tampak (`vis` tetap true); kapal tunggal lama (`NW.boat`, tanpa kapal server) tidak berubah.
**Belum (Worker 02):** menggambar kapal/kursi/animasi, UI kemudi, UI naik/turun, penempatan titik interaksi.

## D. Multiplayer Kota Nusa (flag `kotaNusa` + env `NUSA_KOTA=ya` + klien `NUSA_KOTA`) — PR multiplayer kota (di atas Visual Kota #140)
Jalur: WebSocket/DO multiplayer yang ada. SATU ruang (`muara-N`) melayani dua area; tiap pemain punya `area` ∈ {`muara`,`selat`} yang DITETAPKAN SERVER. Siaran posisi/chat/emoji/outfit/masuk/keluar hanya ke pemain di ruang DAN area yang sama. Tidak ada tulis D1/Firestore per frame. NPC & kendaraan kota tetap lokal deterministik (`NW.kota`), tidak dikirim lewat jaringan.
**Aktif hanya bila ketiganya ON:** klien `NUSA_KOTA===true` (kode ada) · `gameFlags.kotaNusa===true` · welcome `ko===1` (`NW.mp.kotaLive()`). Salah satu mati → perilaku lama persis (selat tidak disiarkan; kapal ke Pelabuhan Kota memakai jalur "pergi" lama).
**Penambahan protokol (hanya menambah, kontrak lama tak berubah):** `hello` + `ko:1`, `ar` (klien mengumumkan dukungan kota & area saat ini) · `{t:"ar",a,x,y,d}` (pindah area tanpa kapal) → server membalas `w` baru (sukses) atau `{t:"an",r}` (`off|hidden|boat|same|hop`) · `w` + `ko:1`, `ar` · baris kapal bendera bit 4 = kapal berlabuh di kota · `bv depart/arrive` + `ko:1`.
**Validasi server:** autentikasi (token → uid, hanya di header; uid/email/role/saldo/inventaris/save TIDAK pernah ada di protokol; field asing diabaikan); area ∈ daftar; batas peta per area (selat 92×48); kecepatan = anggaran jarak (rata-rata ≤ `KOTA.SPEED`=8 petak/dtk, lonjakan ≤ `KOTA.BURST`=5), bendera TP tidak berlaku di kota; pindah area: jeda ≥ 6 dtk, titik masuk pelabuhan (klaim jauh dari titik masuk dipaksa ke titik masuk), tidak saat di kapal/tersembunyi; spam posisi/chat/emoji/pesan (ember per pemain, pelanggaran berulang → putus 4005); kapal: dermaga/lepas landas hanya oleh kapten dan hanya bila SEMUA awak mendukung kota (kalau tidak → jalur "pergi" lama).
**Kapal Rombongan:** kapten `go selat` → kapal bertambat di tambatan Pelabuhan Kota `[13.6,21.95]` sebagai pemain terlihat; awak masih duduk, boleh `leave` (turun di `[13.1,20.45]`, jadi pemain berjalan) dan `join` lagi (kapal kota tanpa kapten: yang pertama naik jadi kapten). Kapten keluar → promosi seperti biasa. Putus → kursi ditahan 20 dtk. Kapal kosong di kota bubar setelah 5 menit. Pulang: kapten `go muara` (≥ 8 dtk). Snapshot DO memuat area, dukungan kota, dan kapal kota.

## Catatan pemakaian klien (dari #133, informatif)
Klien memakai `ecoDamarState/Load/Unload` (UI pengepakan). `Sail/Abort/Deliver` ada di adapter tetapi belum dipanggil UI (menunggu Pelabuhan Kota). Klien tidak menghitung hadiah/saldo; semua dari respons server. UI Kemudi memakai flag klien `NUSA_KEMUDI` (hanya pemuatan). Bila ada beda dengan bagian di atas, bagian di atas (#132) yang resmi.
