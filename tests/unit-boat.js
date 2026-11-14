// Uji KAPAL ROMBONGAN (mp/room-core.js + mp/proto.js), murni tanpa jaringan: node tests/unit-boat.js
const P = require("../mp/proto.js"), { Room } = require("../mp/room-core.js");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("GAGAL:", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
function mk(opts = { boat: true }) {
  const log = []; let now = 1e6;
  const room = new Room(Object.assign({ id: "muara-1", cap: 8, io: { now: () => now, send: (c, o) => log.push([c, o]), close: () => {} } }, opts));
  const adv = (ms) => { now += ms; };
  const tick = (n = 1, ms = 200) => { for (let i = 0; i < n; i++) { adv(ms); room.tick(); } };
  const add = (c, uid, x = 37.2, y = 22.0) => { room.join(c, uid, { n: "P" + c, r: 0, rd: 0 }, { x, y }); room.hello(c, { n: "P" + c, r: 0, rd: 0, x: P.qz(x), y: P.qz(y), d: 2, f: 0 }); return room.players.get(c).pid; };
  const send = (c, o) => room.message(c, JSON.stringify(o));
  const bt = (c, o) => send(c, Object.assign({ t: "bt" }, o));
  const to = (c) => log.filter((l) => l[0] === c).map((l) => l[1]);
  const last = (c, t) => { const a = to(c).filter((m) => m.t === t); return a[a.length - 1]; };
  const notes = (c) => to(c).filter((m) => m.t === "bn").map((m) => m.r);
  return { room, log, adv, tick, add, send, bt, to, last, notes, now: () => now, clear: () => { log.length = 0; } };
}
const row = (r, c) => { const m = r.to(c).filter((x) => x.t === "bs").flatMap((x) => x.u); return m[m.length - 1]; };

// ---- protokol ----
eq(P.cleanBoat({ a: "join", b: "b1", s: 1 }), { a: "join", b: "b1", s: 1 }, "join sah");
for (const bad of [null, {}, { a: "hack" }, { a: "join", b: "b1", s: 0 }, { a: "join", b: "b1", s: 3 }, { a: "join", b: "<x>", s: 1 }, { a: "steer", d: 8, th: 1 }, { a: "steer", d: 1, th: 3 }, { a: "steer", d: 1.5, th: 1 }, { a: "anchor", on: "ya" }, { a: "go", ar: "../x" }, { a: "go", ar: "A" }])
  ok(P.cleanBoat(bad) === null, "pesan kapal tidak sah ditolak: " + JSON.stringify(bad));
ok(!("x" in P.cleanBoat({ a: "steer", d: 1, th: 1, x: 99, y: 99, v: 99 })), "klien tidak bisa menyisipkan posisi/kecepatan");
eq(P.BOAT.CAP, 3, "maks 3 orang total"); ok(P.BOAT.SLOTS.every(([x, y]) => x >= P.BOAT.LANE.x0 && x <= P.BOAT.LANE.x1 && y >= P.BOAT.LANE.y0), "tambatan di dalam jalur air");

// ---- bawaan MATI ----
{ const r = mk({}); r.add(1, "u1"); r.clear(); r.bt(1, { a: "new" }); eq(r.notes(1), ["off"], "boat OFF: ditolak, tanpa kapal"); ok(r.room.boats.size === 0, "tidak ada kapal");
  const r2 = mk({}); r2.add(1, "u1"); ok(!r2.to(1).some((m) => m.t === "w" && "bo" in m), "welcome tanpa 'bo' saat OFF"); }

// ---- buat, naik, kursi ----
{ const r = mk(); const p1 = r.add(1, "u1"), p2 = r.add(2, "u2"), p3 = r.add(3, "u3"), p4 = r.add(4, "u4"); r.clear();
  r.bt(1, { a: "new" }); const bid = [...r.room.boats.keys()][0]; ok(!!bid, "kapal dibuat"); eq(r.room.boats.get(bid).seats, [p1, null, null], "pembuat = kapten (kursi 0)");
  ok(r.to(2).some((m) => m.t === "bv" && m.ev === "board" && m.s === 0), "pemain lain melihat peristiwa naik"); ok(row(r, 2)[0] === bid, "pemain lain menerima baris kapal");
  r.bt(2, { a: "join", b: bid, s: 1 }); r.bt(3, { a: "join", b: bid, s: 1 }); eq(r.notes(3), ["seat"], "dua pemain rebut kursi sama: yang kedua ditolak");
  r.bt(3, { a: "join", b: bid, s: 2 }); r.bt(4, { a: "join", b: bid, s: 2 }); eq(r.notes(4), ["seat"], "kursi penuh ditolak (maks 3)");
  eq(r.room.boats.get(bid).seats, [p1, p2, p3], "tiga kursi terisi"); r.bt(2, { a: "new" }); eq(r.notes(2).slice(-1), ["aboard"], "tidak bisa masuk dua kapal");
  const far = mk(); far.add(1, "a"); far.add(2, "b", 20, 10); far.bt(1, { a: "new" }); const fb = [...far.room.boats.keys()][0]; far.bt(2, { a: "join", b: fb, s: 1 }); eq(far.notes(2), ["far"], "terlalu jauh dari kapal ditolak");
  const nf = mk(); nf.add(1, "a", 10, 10); nf.bt(1, { a: "new" }); eq(nf.notes(1), ["far"], "buat kapal jauh dari dermaga ditolak"); }

// ---- kendali, posisi server ----
{ const r = mk(); const p1 = r.add(1, "u1"), p2 = r.add(2, "u2"); r.bt(1, { a: "new" }); const bid = [...r.room.boats.keys()][0]; r.bt(2, { a: "join", b: bid, s: 1 }); r.clear();
  r.bt(2, { a: "steer", d: 2, th: 2 }); eq(r.notes(2), ["captain"], "penumpang tidak bisa mengemudi");
  r.bt(1, { a: "steer", d: 2, th: 2 }); eq(r.notes(1), ["anchor"], "jangkar turun: tidak bisa mengemudi");
  r.bt(1, { a: "anchor", on: false }); r.bt(1, { a: "steer", d: 3, th: 2 });
  const b = r.room.boats.get(bid), y0 = b.y; r.tick(2); ok(b.v > 0 && b.v < P.BOAT.SPD[2] && b.y > y0, "kapal bergerak, percepatan bertahap (bukan lompat ke kecepatan penuh)"); r.tick(8); ok(b.v <= P.BOAT.SPD[2] + 1e-9 && b.v > 0, "kecepatan tak melebihi batas server");
  r.send(2, { t: "m", x: P.qz(5), y: P.qz(5), d: 0, f: 0 }); const q2 = r.room.players.get(2); ok(Math.abs(q2.x - b.x) < 1e-9, "posisi penumpang dari klien diabaikan (mengikuti kapal)");
  r.send(1, { t: "m", x: P.qz(5), y: P.qz(5), d: 0, f: 0 }); ok(Math.abs(r.room.players.get(1).x - b.x) < 1e-9, "posisi kapten dari klien diabaikan");
  ok(r.to(2).some((m) => m.t === "bs") && r.to(1).some((m) => m.t === "bs"), "semua awak menerima pembaruan kapal");
  r.add(3, "u3"); r.bt(3, { a: "join", b: bid, s: 2 }); eq(r.notes(3).slice(-1), ["moving"], "tidak bisa naik saat kapal berjalan");
  r.bt(2, { a: "leave" }); eq(r.notes(2).slice(-1), ["moving"], "tidak bisa turun saat kapal berjalan");
  r.tick(200); const L = P.BOAT.LANE; ok(b.x >= L.x0 && b.x <= L.x1 && b.y >= L.y0 && b.y <= L.y1, "kapal tak keluar jalur air"); ok(b.v === 0 && b.th === 0, "menabrak batas: berhenti");
  r.bt(1, { a: "anchor", on: true }); r.tick(20); ok(r.room.boats.get(bid).v === 0, "jangkar: kapal berhenti"); }

// ---- semua pemain melihat yang sama ----
{ const r = mk(); r.add(1, "u1"); r.add(2, "u2"); r.add(3, "u3"); r.add(4, "u4"); r.bt(1, { a: "new" }); const bid = [...r.room.boats.keys()][0]; r.bt(2, { a: "join", b: bid, s: 1 }); r.bt(1, { a: "anchor", on: false }); r.bt(1, { a: "steer", d: 3, th: 1 }); r.tick(8);
  const rows = [1, 2, 3, 4].map((c) => JSON.stringify(row(r, c))); ok(new Set(rows).size === 1, "baris kapal identik di semua klien: " + rows.join(" / "));
  const rr = row(r, 4); eq([rr[3], rr[5] & 1], [3, 0], "arah & jangkar tersinkron"); ok(rr[4] > 0, "kecepatan tersinkron");
  const late = mk(); late.add(1, "x"); late.bt(1, { a: "new" }); late.add(2, "y"); const w = late.to(2).find((m) => m.t === "w"); ok(w && w.bo === 1 && w.bs.length === 1, "pemain yang baru masuk menerima kapal yang sudah ada"); }

// ---- turun, kapten pergi, bubar ----
{ const r = mk(); const p1 = r.add(1, "u1"), p2 = r.add(2, "u2"), p3 = r.add(3, "u3"); r.bt(1, { a: "new" }); const bid = [...r.room.boats.keys()][0]; r.bt(2, { a: "join", b: bid, s: 1 }); r.bt(3, { a: "join", b: bid, s: 2 }); r.clear();
  r.bt(3, { a: "leave" }); eq(r.room.boats.get(bid).seats, [p1, p2, null], "penumpang turun: kursi bebas"); ok(!r.room.players.get(3).boat && Math.hypot(r.room.players.get(3).x - P.BOAT.LAND[0], r.room.players.get(3).y - P.BOAT.LAND[1]) < 1e-9, "diturunkan di dermaga");
  r.bt(1, { a: "leave" }); eq(r.room.boats.get(bid).seats, [p2, null, null], "kapten keluar: penumpang jadi kapten"); ok(r.room.boats.get(bid).anchor === true, "jangkar turun saat pergantian kapten"); ok(r.to(2).some((m) => m.t === "bv" && m.ev === "cap" && m.p === p2), "peristiwa pergantian kapten");
  r.bt(2, { a: "leave" }); ok(r.room.boats.size === 0 && r.to(3).some((m) => m.t === "bd"), "kru terakhir turun: kapal bubar"); }

// ---- putus sambungan & reconnect ----
{ const r = mk(); const p1 = r.add(1, "u1"), p2 = r.add(2, "u2"); r.bt(1, { a: "new" }); const bid = [...r.room.boats.keys()][0]; r.bt(2, { a: "join", b: bid, s: 1 }); const b = r.room.boats.get(bid);
  r.room.leave(2); eq(b.seats[1], p2, "penumpang putus: kursi DITAHAN"); r.add(3, "u3"); r.bt(3, { a: "join", b: bid, s: 1 }); eq(r.notes(3).slice(-1), ["seat"], "kursi tertahan tak bisa direbut");
  r.adv(5000); r.room.join(9, "u2", { n: "P2", r: 0, rd: 0 }, { x: 37.2, y: 22 }); r.room.hello(9, { n: "P2", r: 0, rd: 0, x: P.qz(37.2), y: P.qz(22), d: 2, f: 0 });
  const np = r.room.players.get(9); ok(np.boat && np.boat.s === 1 && b.seats[1] === np.pid, "reconnect dalam masa tunggu: kembali ke kursi (pid baru)"); const w = r.to(9).find((m) => m.t === "w"); ok(w && w.mb && w.mb[0] === bid, "welcome memberi tahu kapalku");
  r.room.leave(9); r.adv(P.BOAT.GRACE_MS + 1000); r.room.sweep(); ok(b.seats[1] === null && !r.room.holds.size, "lewat masa tunggu: kursi bebas");
  const c = mk(); const q1 = c.add(1, "c1"), q2 = c.add(2, "c2"); c.bt(1, { a: "new" }); const cb = [...c.room.boats.keys()][0]; c.bt(2, { a: "join", b: cb, s: 1 }); const B = c.room.boats.get(cb);
  c.bt(1, { a: "anchor", on: false }); c.bt(1, { a: "steer", d: 2, th: 2 }); c.tick(3); c.room.leave(1);
  eq(B.seats[0], q2, "kapten putus: penumpang langsung jadi kapten"); ok(B.anchor && c.room.holds.get("c1").s === 1, "kapal berhenti; kapten lama dapat kursi penumpang bila kembali");
  c.tick(15); ok(B.v === 0, "kapal berhenti total");
  c.room.join(5, "c1", { n: "P1", r: 0, rd: 0 }, { x: 37, y: 22 }); c.room.hello(5, { n: "P1", r: 0, rd: 0, x: P.qz(37), y: P.qz(22), d: 2, f: 0 }); ok(c.room.players.get(5).boat.s === 1, "kapten lama kembali sebagai penumpang");
  const d = mk(); d.add(1, "d1"); d.bt(1, { a: "new" }); d.room.leave(1); d.adv(P.BOAT.GRACE_MS + 1000); d.room.sweep(); ok(d.room.boats.size === 0, "semua kru putus & masa tunggu habis: kapal bubar"); }

// ---- pindah area ----
{ const r = mk(); const p1 = r.add(1, "u1"), p2 = r.add(2, "u2"), p3 = r.add(3, "u3"); r.bt(1, { a: "new" }); const bid = [...r.room.boats.keys()][0]; r.bt(2, { a: "join", b: bid, s: 1 }); const b = r.room.boats.get(bid);
  r.bt(2, { a: "go", ar: "laut" }); eq(r.notes(2).slice(-1), ["captain"], "hanya kapten boleh pindah area");
  r.bt(1, { a: "anchor", on: false }); r.bt(1, { a: "steer", d: 2, th: 1 }); r.tick(2); r.bt(1, { a: "go", ar: "laut" }); eq(r.notes(1).slice(-1), ["moving"], "pindah area butuh jangkar & berhenti");
  r.bt(1, { a: "anchor", on: true }); r.tick(10); r.clear(); r.bt(1, { a: "go", ar: "laut" });
  ok(b.away && b.area === "laut", "kapal pergi ke area lain"); ok(r.to(3).some((m) => m.t === "bd" && m.id === bid) && r.to(3).some((m) => m.t === "l" && m.id === p1), "pemain Muara melihat kapal & kru berangkat (hilang)");
  ok(!r.to(2).some((m) => m.t === "l" && m.id === p1), "antar-kru tidak saling dihapus"); ok(r.to(3).some((m) => m.t === "bv" && m.ev === "depart"), "animasi berangkat");
  eq(b.seats, [p1, p2, null], "kru tetap di kursi"); r.bt(1, { a: "steer", d: 0, th: 1 }); eq(r.notes(1).slice(-1), ["away"], "tidak bisa menyetir saat di area lain"); r.bt(1, { a: "go", ar: "muara" }); eq(r.notes(1).slice(-1), ["early"], "kembali terlalu cepat ditolak (jam server)");
  r.adv(P.BOAT.MIN_AWAY_MS + 100); r.clear(); r.bt(1, { a: "go", ar: "muara" }); ok(!b.away && b.area === "muara", "kapal kembali ke Muara"); ok(r.to(3).some((m) => m.t === "bv" && m.ev === "arrive") && r.to(3).some((m) => m.t === "j" && m.p[0] === p1), "pemain Muara melihat kapal & kru tiba");
  const w = mk(); w.add(1, "w1"); w.bt(1, { a: "new" }); const wb = [...w.room.boats.keys()][0]; w.bt(1, { a: "go", ar: "laut" }); w.add(2, "w2"); ok(w.to(2).find((m) => m.t === "w").bs.length === 0, "pendatang baru tak melihat kapal yang sedang di area lain"); }

// ---- tanpa D1/Firestore, hibernasi, privasi, laju ----
{ const r = mk(); r.add(1, "UID-CANARY-1"); r.add(2, "UID-CANARY-2"); r.bt(1, { a: "new" }); const bid = [...r.room.boats.keys()][0]; r.bt(2, { a: "join", b: bid, s: 1 }); r.bt(1, { a: "anchor", on: false }); r.bt(1, { a: "steer", d: 2, th: 2 }); r.tick(10);
  ok(!/CANARY|uid/i.test(JSON.stringify(r.log)), "tidak ada UID di paket mana pun"); ok(JSON.stringify(r.room.boatsSnapshot()).length < 400, "snapshot kapal kecil (hanya saat perubahan struktur)");
  const s1 = r.room.snapshot(1), s2 = r.room.snapshot(2), bs = r.room.boatsSnapshot();
  const h = mk(); h.room.restoreBoats(JSON.parse(JSON.stringify(bs))); h.room.restore(1, JSON.parse(JSON.stringify(s1))); h.room.restore(2, JSON.parse(JSON.stringify(s2)));
  const b = h.room.boats.get(bid); ok(b && b.seats[0] === s1.pid && b.seats[1] === s2.pid, "hibernasi DO: kapal & kursi pulih"); ok(h.room.players.get(2).boat && h.room.players.get(2).boat.s === 1, "hibernasi: pemain tetap berkursi");
  const sp = mk(); sp.add(1, "s1"); let n0 = 0; for (let i = 0; i < 60; i++) sp.bt(1, { a: "new" }); ok(sp.room.boats.size === 1, "spam 'new' tidak membuat banyak kapal"); }
{ const r = mk(); r.add(1, "z1"); for (let i = 0; i < 12; i++) r.bt(1, { a: i % 2 ? "anchor" : "steer", on: true, d: 1, th: 1 }); ok(true, "tak crash oleh banjir pesan"); }
// ---- allowlist area: hanya ID area nyata; yang tak dikenal ditolak ----
{ for (const bad of ["pasir", "hack", "pulau_x", "MUARA", "muara2", "", "sf", "a"]) ok(P.cleanBoat({ a: "go", ar: bad }) === null, "area tak dikenal ditolak: " + JSON.stringify(bad));
  for (const good of P.BOAT.AREAS) ok(P.cleanBoat({ a: "go", ar: good }) !== null, "area nyata diterima: " + good);
  const fs = require("fs"), path = require("path"), reg = new Set();
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "tests") continue; const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.js$/.test(e.name)) { const t = fs.readFileSync(f, "utf8"); const m = t.match(/areas\.register\(\{\s*id:\s*"([a-z0-9_]+)"/g); if (m) m.forEach((x) => reg.add(x.match(/"([a-z0-9_]+)"/)[1])); } } })(path.join(__dirname, ".."));
  ok(reg.size >= 5, "pindai area terdaftar di kode: " + [...reg].join(","));
  for (const id of reg) ok(P.BOAT.AREAS.indexOf(id) >= 0, "area terdaftar masuk allowlist: " + id);
  for (const id of P.BOAT.AREAS) ok(reg.has(id), "allowlist tidak punya ID hantu: " + id);
  const r = mk(); r.add(1, "q1"); r.bt(1, { a: "new" }); r.bt(1, { a: "go", ar: "pasir" }); ok(![...r.room.boats.values()][0].away, "go area palsu tidak memindahkan kapal");
  const h = mk(); h.room.restoreBoats([{ id: "bz", x: 37.2, y: 23.4, d: 0, se: [null, null, null], aw: true, ar: "pasir", at: 1, sl: 0 }]); ok(!h.room.boats.size || [...h.room.boats.values()].every((b) => P.BOAT.AREAS.indexOf(b.area) >= 0), "restore: area tak dikenal jatuh ke Muara"); }

console.log(`unit-boat: ${pass} lolos, ${fail} gagal`); process.exit(fail ? 1 : 0);
