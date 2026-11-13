// Uji MULTIPLAYER KOTA NUSA (mp/room-core.js + mp/proto.js), murni tanpa jaringan: node tests/unit-mp-kota.js
// Area pemain, visibilitas per area, validasi (autentikasi lewat room, batas peta, kecepatan, teleport, spam, pindah area), dan kapal rombongan di Pelabuhan Kota.
const P = require("../mp/proto.js"), { Room } = require("../mp/room-core.js"), K = P.KOTA;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("GAGAL:", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
function mk(opts = { boat: true, kota: true }) {
  const log = [], view = new Map(), boatsSeen = new Map(); let now = 1e6;
  const track = (c, o) => { let v = view.get(c); if (!v) view.set(c, v = new Map()); let bv = boatsSeen.get(c); if (!bv) boatsSeen.set(c, bv = new Map());
    if (o.t === "w") { v.clear(); for (const r of o.ps) v.set(r[0], r[1]); bv.clear(); for (const r of o.bs || []) bv.set(r[0], r); if (o.mb) bv.set(o.mb[0], o.mb); }
    else if (o.t === "j") v.set(o.p[0], o.p[1]); else if (o.t === "l") v.delete(o.id);
    else if (o.t === "bs") for (const r of o.u || []) bv.set(r[0], r); else if (o.t === "bd") bv.delete(o.id); };
  const room = new Room(Object.assign({ id: "muara-1", cap: 12, io: { now: () => now, send: (c, o) => { log.push([c, o]); track(c, o); }, close: () => {} } }, opts));
  const adv = (ms) => { now += ms; };
  const tick = (n = 1, ms = 200) => { for (let i = 0; i < n; i++) { adv(ms); room.tick(); } };
  const add = (c, uid, o = {}) => { const x = o.x == null ? 20 : o.x, y = o.y == null ? 20 : o.y; room.join(c, uid, { n: o.n || "P" + c, r: 0, rd: 0 }, { x, y }); room.hello(c, Object.assign({ n: o.n || "P" + c, r: 0, rd: 0, x: P.qz(x), y: P.qz(y), d: 2, f: 0 }, o.kc === false ? {} : { ko: 1, ar: o.ar || "muara" }, o.hello || {})); return room.players.get(c).pid; };
  const send = (c, o) => room.message(c, JSON.stringify(o));
  const bt = (c, o) => send(c, Object.assign({ t: "bt" }, o));
  const to = (c) => log.filter((l) => l[0] === c).map((l) => l[1]);
  const last = (c, t) => { const a = to(c).filter((m) => m.t === t); return a[a.length - 1]; };
  const notes = (c) => to(c).filter((m) => m.t === "bn").map((m) => m.r);
  const names = (c) => [...(view.get(c) || new Map()).values()].sort();
  const boatSeen = (c) => { const m = boatsSeen.get(c); return m ? [...m.values()][0] : undefined; };
  return { room, log, boatSeen, adv, tick, add, send, bt, to, last, notes, names, now: () => now, clear: () => { log.length = 0; } };
}
const boatRowOf = (r, c) => r.boatSeen(c);
const pos = (r, c) => { const p = r.room.players.get(c); return [p.x, p.y]; };

// ---- bawaan MATI ----
{ const r = mk({ boat: true }); r.add(1, "u1"); r.add(2, "u2", { ar: "selat" }); ok(r.room.players.get(2).area === "muara", "kota OFF: hello ar=selat diabaikan, tetap Muara");
  ok(!r.to(1).some((m) => m.t === "w" && "ko" in m), "kota OFF: welcome tanpa 'ko'"); r.clear(); r.send(1, { t: "ar", a: "selat" }); eq(r.to(1).filter((m) => m.t === "an").map((m) => m.r), ["off"], "kota OFF: pesan ar ditolak");
  ok(r.names(1).includes("P2"), "kota OFF: perilaku lama — semua pemain terlihat satu sama lain"); }
// ---- visibilitas per area ----
{ const r = mk(); r.add(1, "a", { n: "Aji" }); r.add(2, "b", { n: "Bayu", ar: "selat", x: 12, y: 21 }); r.add(3, "c", { n: "Citra", ar: "selat", x: 14, y: 21 }); r.add(4, "d", { n: "Dewi", ar: "muara" });
  eq(r.names(1), ["Dewi"], "Muara hanya melihat Muara (A tidak melihat B,C di kota)"); eq(r.names(2), ["Citra"], "Kota hanya melihat Kota (B melihat C saja)"); eq(r.names(3), ["Bayu"], "C melihat B saja");
  ok(r.last(2, "w").ar === "selat" && r.last(2, "w").ko === 1, "welcome membawa ko & ar");
  r.clear(); r.send(2, { t: "m", x: P.qz(12.8), y: P.qz(21), d: 0, f: 1 }); r.tick(2); ok(r.to(3).some((m) => m.t === "s") && !r.to(1).some((m) => m.t === "s") && !r.to(4).some((m) => m.t === "s"), "posisi hanya sampai pemain di area sama");
  r.clear(); r.send(2, { t: "c", m: "halo kota" }); r.send(2, { t: "e", i: 1 }); ok(r.to(3).some((m) => m.t === "c") && r.to(3).some((m) => m.t === "e") && !r.to(1).some((m) => m.t === "c" || m.t === "e"), "chat & emoji hanya di area sama");
  r.clear(); r.send(2, { t: "a", o: "t:kaos_x:1" }); ok(r.to(3).some((m) => m.t === "a") && !r.to(1).some((m) => m.t === "a"), "outfit publik hanya di area sama");
  const wB = r.last(2, "w"); r.room.leave(3); ok(r.to(2).some((m) => m.t === "l"), "keluar → pemain kota diberi tahu"); ok(!r.to(1).some((m) => m.t === "l"), "pemain Muara tidak menerima 'l' dari kota"); }
// ---- pemain tanpa dukungan kota tidak pernah masuk kota ----
{ const r = mk(); r.add(1, "a", { kc: false }); r.add(2, "b", { ar: "selat" }); r.add(3, "c", { kc: false, hello: { ar: "selat" } }); ok(r.room.players.get(3).area === "muara", "klien tanpa ko tidak bisa mengklaim area selat");
  r.clear(); r.send(1, { t: "ar", a: "selat" }); eq(r.to(1).filter((m) => m.t === "an").map((m) => m.r), ["off"], "klien tanpa ko: pindah area ditolak"); }
// ---- pindah area (kapal tunggal lama): jeda, titik masuk, batas ----
{ const r = mk(); r.add(1, "a", { x: 20, y: 20 }); r.add(2, "b", { n: "Bayu", ar: "selat", x: 11, y: 21 }); r.clear();
  r.send(1, { t: "ar", a: "selat", x: P.qz(11), y: P.qz(20.8), d: 1 }); eq(r.room.players.get(1).area, "selat", "pindah ke kota sah"); ok(Math.hypot(pos(r, 1)[0] - 11, pos(r, 1)[1] - 20.8) < 0.01, "posisi klaim dalam radius titik masuk dipakai");
  ok(r.last(1, "w").ar === "selat" && r.names(1).includes("Bayu"), "setelah pindah menerima daftar pemain kota"); ok(r.to(2).some((m) => m.t === "j"), "pemain kota melihat pendatang");
  r.clear(); r.adv(1000); r.send(1, { t: "ar", a: "muara", x: P.qz(20), y: P.qz(20) }); ok(r.to(1).some((m) => m.t === "an" && m.r === "hop") && r.room.players.get(1).area === "selat", "bolak-balik terlalu cepat ditolak");
  r.adv(7000); r.send(1, { t: "ar", a: "muara", x: P.qz(20), y: P.qz(20) }); eq(r.room.players.get(1).area, "muara", "kembali ke Muara setelah jeda"); ok(r.to(2).some((m) => m.t === "l"), "pemain kota diberi tahu pendatang pergi");
  const r2 = mk(); r2.add(1, "a"); r2.send(1, { t: "ar", a: "selat", x: P.qz(70), y: P.qz(40) }); ok(Math.hypot(pos(r2, 1)[0] - K.ENTRY[0], pos(r2, 1)[1] - K.ENTRY[1]) < 0.01, "klaim tiba di tengah kota (teleport) dipindah ke titik masuk pelabuhan");
  const r3 = mk(); r3.add(1, "a"); r3.send(1, { t: "ar", a: "neraka" }); ok(r3.room.players.get(1).viol === 1, "area tak dikenal = pelanggaran"); r3.send(1, { t: "ar", a: "muara" }); ok(r3.to(1).some((m) => m.t === "an" && m.r === "same"), "area sama: tak berubah");
  const r4 = mk(); r4.add(1, "a"); r4.add(2, "b"); r4.send(1, { t: "v", on: 0 }); r4.clear(); r4.send(1, { t: "ar", a: "selat" }); ok(r4.to(1).some((m) => m.t === "an" && m.r === "hidden"), "pindah area saat tersembunyi ditolak");
  // hello kedua yang berbeda area = pindah tervalidasi (jalur kapal tunggal: sembunyi lalu tampil di area lain)
  const r5 = mk(); r5.add(1, "a"); r5.send(1, { t: "v", on: 0 }); r5.send(1, { t: "hello", n: "P1", r: 0, rd: 0, x: P.qz(70), y: P.qz(40), d: 2, f: 0, ko: 1, ar: "selat" }); ok(r5.room.players.get(1).area === "selat" && Math.hypot(pos(r5, 1)[0] - K.ENTRY[0], pos(r5, 1)[1] - K.ENTRY[1]) < 0.01, "hello berbeda area: masuk lewat titik masuk, bukan teleport");
  r5.send(1, { t: "v", on: 0 }); r5.adv(500); r5.send(1, { t: "hello", n: "P1", r: 0, rd: 0, x: P.qz(20), y: P.qz(20), d: 2, f: 0, ko: 1, ar: "muara" }); eq(r5.room.players.get(1).area, "selat", "hello berbeda area terlalu cepat: tetap di area lama (jeda)"); }
// ---- batas peta, kecepatan, teleport, spam ----
{ const r = mk(); r.add(1, "a", { ar: "selat", x: 20, y: 21 }); r.adv(1000);
  r.send(1, { t: "m", x: P.qz(500), y: P.qz(500), d: 0, f: 0 }); ok(pos(r, 1)[0] <= 92 && pos(r, 1)[1] <= 48, "di luar batas peta kota ditolak/dijepit"); ok(Math.hypot(pos(r, 1)[0] - 20, pos(r, 1)[1] - 21) < P.MAX_SPEED * 1.1 + 0.6, "dan tidak lebih cepat dari batas kecepatan");
  const r2 = mk(); r2.add(1, "a", { ar: "selat", x: 20, y: 21 }); r2.adv(500); r2.send(1, { t: "m", x: P.qz(80), y: P.qz(40), d: 0, f: P.F.TP }); ok(Math.hypot(pos(r2, 1)[0] - 20, pos(r2, 1)[1] - 21) < 6, "bendera TP tidak membuka teleport di kota");
  const rm = mk(); rm.add(1, "a", { x: 20, y: 21 }); rm.adv(500); rm.send(1, { t: "m", x: P.qz(30), y: P.qz(21), d: 0, f: P.F.TP }); ok(pos(rm, 1)[0] > 29.9, "di Muara lompatan sah lama tetap bekerja (tak berubah)");
  const r3 = mk(); r3.add(1, "a", { ar: "selat", x: 20, y: 21 }); r3.add(2, "b", { ar: "selat", x: 22, y: 21 }); r3.clear(); for (let i = 0; i < 80; i++) r3.send(1, { t: "m", x: P.qz(20 + (i % 2) * 0.1), y: P.qz(21), d: 0, f: 0 }); ok(r3.room.players.has(1) && Math.hypot(pos(r3, 1)[0] - 20, pos(r3, 1)[1] - 21) < 1, "spam posisi: dibuang (lewat batas jatah) dan pemain tetap di tempat"); 
  const r4 = mk(); r4.add(1, "a", { ar: "selat" }); r4.add(2, "b", { ar: "selat" }); r4.clear(); for (let i = 0; i < 12; i++) r4.send(1, { t: "c", m: "pesan nomor " + i }); ok(r4.to(2).filter((m) => m.t === "c").length <= 4, "spam chat dibatasi (" + r4.to(2).filter((m) => m.t === "c").length + ")");
  const r5 = mk(); r5.add(1, "a", { ar: "selat" }); let kicked = false; r5.room.kick = () => { kicked = true; }; for (let i = 0; i < 400; i++) r5.send(1, { t: "zzz" }); ok(kicked, "pesan sampah berulang → ditendang"); }
// ---- sambung ulang di kota tidak bisa dipakai teleport ----
{ const r = mk(); r.add(1, "a", { ar: "selat", x: 20, y: 21 }); r.room.leave(1); r.adv(2000);
  r.add(7, "a", { ar: "selat", x: 70, y: 40 }); const q = pos(r, 7); ok(Math.hypot(q[0] - 20, q[1] - 21) <= K.BURST + K.SPEED * 2 + 0.5, "sambung ulang 2 dtk kemudian dengan klaim 60 petak jauhnya: ditahan ≤ anggaran (" + q + ")");
  r.room.leave(7); r.adv(15000); r.add(8, "a", { ar: "selat", x: 70, y: 40 }); const q2 = pos(r, 8); ok(Math.abs(q2[0] - 70) < 1.5 || Math.hypot(q2[0] - q[0], q2[1] - q[1]) <= K.BURST + K.SPEED * 15 + 0.5, "setelah jeda cukup lama, jarak yang bisa ditempuh jalan kaki diizinkan");
  const r2 = mk(); r2.add(1, "z", { ar: "selat", x: 40, y: 20 }); r2.send(1, { t: "v", on: 0 }); r2.adv(500); r2.send(1, { t: "hello", n: "P1", r: 0, rd: 0, x: P.qz(80), y: P.qz(40), d: 2, f: 0, ko: 1, ar: "selat" }); const q3 = pos(r2, 1); ok(Math.hypot(q3[0] - 40, q3[1] - 20) < K.BURST + K.SPEED * 1.5, "hello ulang di kota tidak jadi teleport (" + q3 + ")"); }
// ---- tidak ada uid/email/role/saldo di jaringan; spoof ditolak ----
{ const r = mk(); r.add(1, "uid-rahasia-1", { n: "Aji", hello: { uid: "uid-owner", role: "owner", email: "x@y.z", money: 99999, inv: [1], save: { a: 1 } } }); r.add(2, "uid-rahasia-2", { n: "Bayu", ar: "selat", hello: { uid: "uid-owner", role: "owner", owner: 1 } });
  r.send(2, { t: "p", n: "Bayu", r: 3, rd: 2, uid: "x", role: "owner", money: 5 }); r.send(2, { t: "m", x: P.qz(10), y: P.qz(21), d: 1, f: 1, uid: "y", role: "owner" }); r.send(2, { t: "c", m: "hai", uid: "z" }); r.tick(3);
  const all = JSON.stringify(r.log); ok(!/uid-rahasia|uid-owner|x@y\.z|99999|\"money\"|\"email\"|\"save\"/.test(all), "tidak ada uid/email/saldo/inventaris/save di keluaran server");
  ok(r.room.players.get(2).role === "visitor", "role pemain ditetapkan server (header), bukan klien"); const rows = r.last(1, "w").ps.concat(r.to(1).filter((m) => m.t === "j").map((m) => m.p)); ok(rows.every((x) => x.length <= 10 && (x[9] === undefined || x[9] === 0)), "baris pemain publik: tanpa penanda pemilik palsu"); }
// ---- kapal rombongan di Pelabuhan Kota ----
function crew3(r) { const a = r.add(1, "cap", { n: "Kapten", x: 37.2, y: 22 }), b = r.add(2, "pn1", { n: "Penumpang1", x: 37.2, y: 22.4 }), c = r.add(3, "pn2", { n: "Penumpang2", x: 37.2, y: 22.8 });
  r.bt(1, { a: "new" }); const bid = [...r.room.boats.keys()][0]; r.bt(2, { a: "join", b: bid, s: 1 }); r.bt(3, { a: "join", b: bid, s: 2 }); return { a, b, c, bid }; }
{ const r = mk(); const { a, b, c, bid } = crew3(r); r.add(4, "mur", { n: "DiMuara", x: 30, y: 20 }); r.add(5, "kot", { n: "DiKota", ar: "selat", x: 15, y: 21 }); const B = r.room.boats.get(bid); eq(B.seats, [a, b, c], "tiga awak naik di Muara");
  ok(r.names(4).includes("Kapten") && boatRowOf(r, 4) && boatRowOf(r, 4)[0] === bid, "pemain Muara melihat kapal & awak sebelum berangkat"); ok(!boatRowOf(r, 5), "pemain kota belum melihat kapal Muara");
  r.clear(); r.bt(1, { a: "go", ar: "selat" });
  eq([B.kota, B.area, B.away], [true, "selat", false], "kapal tiba di Pelabuhan Kota (mode kota, bukan 'pergi')"); ok(Math.hypot(B.x - K.BERTH[0], B.y - K.BERTH[1]) < 1e-9, "bertambat di tambatan Pelabuhan Kota");
  eq([1, 2, 3].map((c2) => r.room.players.get(c2).area), ["selat", "selat", "selat"], "ketiga awak pindah ke area selat (server)");
  ok(r.to(4).some((m) => m.t === "bd" && m.id === bid) && r.to(4).filter((m) => m.t === "l").length === 3, "pemain Muara: kapal & tiga awak hilang"); ok(r.names(5).join() === "Kapten,Penumpang1,Penumpang2", "pemain kota: tiga awak muncul (" + r.names(5) + ")");
  const rb = boatRowOf(r, 5); ok(rb && rb[0] === bid && (rb[5] & 4) === 4 && (rb[5] & 2) === 0, "pemain kota menerima baris kapal bertanda 'kota' (bit 4), bukan 'pergi'"); ok(r.to(1).some((m) => m.t === "bv" && m.ev === "depart" && m.ar === "selat"), "awak menerima peristiwa depart");
  ok(r.last(1, "w").ar === "selat" && r.names(1).includes("DiKota") && !r.names(1).includes("DiMuara") && r.last(1, "w").mb[0] === bid, "awak menerima daftar pemain kota + kapalnya");
  r.clear(); r.bt(1, { a: "steer", d: 2, th: 2 }); eq(r.notes(1), ["port"], "tidak bisa berlayar saat berlabuh di kota"); r.bt(1, { a: "anchor", on: false }); ok(r.notes(1).includes("port"), "jangkar tak bisa diangkat di kota");
  // turun: tiga awak jadi pemain berjalan
  r.clear(); r.bt(1, { a: "leave" }); r.bt(2, { a: "leave" }); r.bt(3, { a: "leave" });
  ok([1, 2, 3].every((c2) => !r.room.players.get(c2).boat && r.room.players.get(c2).area === "selat"), "ketiganya turun sebagai pemain berjalan di kota"); ok(pos(r, 1)[0] === K.LAND[0] && pos(r, 1)[1] === K.LAND[1], "turun di dermaga Pelabuhan Kota (titik server)");
  ok(r.room.boats.has(bid), "kapal tetap ada (kosong) supaya awak bisa kembali"); ok(r.names(5).length === 3 && r.names(1).includes("DiKota") && r.names(2).includes("Kapten"), "mereka saling terlihat berjalan bersama pemain kota");
  r.clear(); r.send(1, { t: "m", x: P.qz(14.2), y: P.qz(20.6), d: 3, f: 1 }); r.tick(2); ok(r.to(2).some((m) => m.t === "s" && m.u.some((u) => u[0] === a)) && r.to(5).some((m) => m.t === "s"), "gerak awak terlihat pemain kota lain"); ok(!r.to(4).some((m) => m.t === "s"), "…tetapi tidak oleh pemain Muara");
  // kembali naik: yang pertama naik jadi kapten
  r.send(1, { t: "m", x: P.qz(13.6), y: P.qz(21.6), d: 3, f: 0 }); r.adv(1000); r.send(2, { t: "m", x: P.qz(13.4), y: P.qz(21.4), d: 3, f: 0 }); r.adv(1000);
  r.clear(); r.bt(2, { a: "join", b: bid, s: 1 }); eq(B.seats[0], b, "kapal kota tanpa kapten: yang pertama naik jadi kapten"); ok(r.to(2).some((m) => m.t === "bv" && m.ev === "board" && m.s === 0), "peristiwa naik sebagai kapten");
  r.bt(1, { a: "join", b: bid, s: 1 }); eq(B.seats[1], a, "pemain kedua duduk sebagai penumpang"); r.bt(5, { a: "join", b: bid, s: 2 }); eq(B.seats[2], r.room.players.get(5).pid, "pemain kota lain bisa ikut naik");
  r.bt(5, { a: "leave" }); r.bt(4, { a: "join", b: bid, s: 2 }); ok(r.notes(4).includes("far"), "pemain Muara tidak bisa naik kapal yang ada di kota");
  // kapten keluar → penumpang dipromosikan
  r.clear(); r.bt(2, { a: "leave" }); eq(B.seats[0], a, "kapten turun di kota: penumpang berkursi terkecil jadi kapten"); ok(r.to(1).some((m) => m.t === "bv" && m.ev === "cap" && m.p === a), "peristiwa pergantian kapten");
  // pulang ke Muara
  r.bt(2, { a: "join", b: bid, s: 1 }); r.adv(9000); r.clear(); r.bt(1, { a: "go", ar: "muara" });
  eq([B.kota, B.area], [false, "muara"], "kapal kembali ke Muara"); ok(r.room.players.get(1).area === "muara" && r.room.players.get(2).area === "muara", "awak ikut pulang ke Muara"); ok(r.room.players.get(3).area === "selat", "awak yang tertinggal berjalan tetap di kota");
  ok(r.to(5).some((m) => m.t === "bd" && m.id === bid) && !r.names(5).includes("Kapten"), "pemain kota: kapal & awak yang pulang hilang"); ok(r.names(4).includes("Kapten") && boatRowOf(r, 4)[0] === bid, "pemain Muara: kapal & awak muncul kembali"); }
// jeda minimal sebelum pulang
{ const r = mk(); const { bid } = crew3(r); r.bt(1, { a: "go", ar: "selat" }); r.clear(); r.bt(1, { a: "go", ar: "muara" }); eq(r.notes(1), ["early"], "pulang terlalu cepat ditolak"); r.bt(1, { a: "go", ar: "laut" }); ok(r.notes(1).includes("port"), "dari kota tidak bisa langsung ke area lain"); }
// awak lama (tanpa dukungan kota) → jalur 'pergi' yang lama; tak ada yang dipindah
{ const r = mk(); const a = r.add(1, "cap", { x: 37.2, y: 22 }), b = r.add(2, "pn", { x: 37.2, y: 22.4, kc: false }); r.bt(1, { a: "new" }); const bid = [...r.room.boats.keys()][0]; r.bt(2, { a: "join", b: bid, s: 1 }); r.bt(1, { a: "go", ar: "selat" }); const B = r.room.boats.get(bid);
  eq([!!B.kota, B.away], [false, true], "awak campuran: jalur lama (pergi)"); ok(r.room.players.get(1).area === "muara" && r.room.players.get(2).area === "muara", "tidak ada yang masuk kota"); }
// kapal kosong di kota bubar setelah jeda; kapal Muara tak terpengaruh
{ const r = mk(); const { bid } = crew3(r); r.add(5, "kot", { ar: "selat", x: 15, y: 21 }); r.bt(1, { a: "go", ar: "selat" }); r.bt(1, { a: "leave" }); r.bt(2, { a: "leave" }); r.bt(3, { a: "leave" }); ok(r.room.boats.has(bid), "kosong tapi ada");
  for (let i = 0; i < 40; i++) { r.adv(10000); for (const c of [1, 2, 3, 5]) r.send(c, { t: "h" }); r.room.sweep(); } ok(!r.room.boats.has(bid), "kapal kosong bubar setelah ±5 menit"); ok(r.to(5).some((m) => m.t === "bd" && m.id === bid), "pemain kota diberi tahu kapal bubar"); }
// reconnect: putus di kapal (kota) → kapten digantikan, kursi ditahan → kembali ke kursi & area
{ const r = mk(); const { a, b, bid } = crew3(r); r.bt(1, { a: "go", ar: "selat" }); const B = r.room.boats.get(bid); r.room.leave(1);
  eq(B.seats[0], b, "kapten putus di kota: penumpang berikutnya jadi kapten"); ok(B.hold && Object.values(B.hold).includes("cap"), "kursi kapten lama ditahan untuk sambung ulang"); ok(B.anchor && B.kota, "kapal tetap berjangkar di kota");
  r.adv(2000); r.add(6, "cap", { n: "Kapten", ar: "selat", x: 12, y: 21 }); const p = r.room.players.get(6); ok(p.boat && p.area === "selat" && p.boat.s !== 0, "sambung ulang: kembali ke kursi (sebagai penumpang) di kota"); ok(Math.hypot(p.x - B.x, p.y - B.y) < 1e-6, "dan posisi mengikuti kapal");
  const r2 = mk(); crew3(r2); r2.bt(1, { a: "go", ar: "selat" }); r2.bt(2, { a: "leave" }); r2.room.leave(2); r2.adv(1000); r2.add(7, "pn1", { n: "P", ar: "selat", x: 12, y: 21 }); ok(!r2.room.players.get(7).boat && r2.room.players.get(7).area === "selat", "yang sudah turun lalu putus: kembali sebagai pemain berjalan (bukan kursi)"); }
// hibernasi: area, dukungan kota, kapal kota dipulihkan
{ const r = mk(); const { bid } = crew3(r); r.add(5, "kot", { ar: "selat", x: 15, y: 21 }); r.bt(1, { a: "go", ar: "selat" }); r.bt(3, { a: "leave" });
  const snaps = [1, 2, 3, 5].map((c) => [c, r.room.snapshot(c)]), boats = r.room.boatsSnapshot(); ok(snaps.every(([, s]) => s.ar === "selat" && s.kc === 1), "snapshot memuat area & dukungan kota");
  const r2 = mk(); r2.room.restoreBoats(JSON.parse(JSON.stringify(boats))); for (const [c, s] of snaps) r2.room.restore(c, JSON.parse(JSON.stringify(s))); const B2 = r2.room.boats.get(bid);
  ok(B2 && B2.kota && B2.area === "selat" && !B2.away, "kapal kota dipulihkan"); ok([1, 2, 3, 5].every((c) => r2.room.players.get(c).area === "selat"), "area pemain dipulihkan"); ok(r2.room.players.get(1).boat && !r2.room.players.get(3).boat, "kursi dipulihkan, yang sudah turun tetap berjalan");
  const r3 = mk({ boat: true }); r3.room.restoreBoats(JSON.parse(JSON.stringify(boats))); ok(r3.room.boats.get(bid).away === true && r3.room.boats.get(bid).kota === false, "server kota dimatikan: kapal kota dibaca sebagai 'pergi' (awak aman)"); }
// area Muara tak berubah: kapal & pemain lama (regresi singkat)
{ const r = mk(); const { bid } = crew3(r); r.add(4, "mur", { n: "DiMuara", x: 30, y: 20 }); r.clear(); r.bt(1, { a: "anchor", on: false }); r.bt(1, { a: "steer", d: 2, th: 1 }); r.tick(8); ok(r.to(4).some((m) => m.t === "bs") && r.room.boats.get(bid).v > 0, "berlayar di Muara tetap berjalan"); }
console.log(`unit-mp-kota: ${pass} lolos, ${fail} gagal`); process.exit(fail ? 1 : 0);
