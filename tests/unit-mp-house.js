// Ruang multiplayer RUMAH (Kunjungi Rumah Teman) — logika murni: node tests/unit-mp-house.js
const P = require("../mp/proto.js"), { Room } = require("../mp/room-core.js");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("GAGAL:", m); } };
function mk(cap) {
  const log = [], closed = [], ejected = []; let now = 1e6;
  const room = new Room({ id: "rumah-ABCDEFGH", kind: "house", cap: cap || P.HOUSE.CAP, io: { now: () => now, send: (c, o) => log.push([c, o]), close: (c, code, r) => closed.push([c, code, r]), onEject: (q) => ejected.push(q.hid) } });
  return { room, log, closed, ejected, adv: (ms) => { now += ms; }, to: (c) => log.filter((l) => l[0] === c).map((l) => l[1]) };
}
const msg = (r, c, o) => r.room.message(c, JSON.stringify(o));
const hello = (r, c, n, x, y, f) => msg(r, c, { t: "hello", n, r: 1, rd: 1, x: P.qz(x), y: P.qz(y), d: 2, f: f || 0 });
const mv = (r, c, x, y, f, d) => msg(r, c, { t: "m", x: P.qz(x), y: P.qz(y), d: d == null ? 2 : d, f: f || 0 });

{ // dua pemain saling melihat; peran dari server
  const r = mk();
  ok(r.room.join(1, "uidOwner", {}, null, { role: "owner", hid: "OWNERPID" }).ok, "pemilik join");
  hello(r, 1, "Budi", 5, 5);
  const w1 = r.to(1).find((o) => o.t === "w");
  ok(w1 && w1.k === "house" && w1.own === 1 && w1.ps.length === 0, "pemilik: welcome house, own=1, tidak ada pemain palsu");
  r.room.join(2, "uidTamu", {}, null, { role: "visitor", hid: "TAMUPID2" }); hello(r, 2, "Sari", 6, 6);
  const w2 = r.to(2).find((o) => o.t === "w");
  ok(w2.own === 0 && w2.ps.length === 1 && w2.ps[0][1] === "Budi" && w2.ps[0][9] === 1, "tamu melihat pemilik (baris menandai pemilik)");
  const j = r.to(1).find((o) => o.t === "j");
  ok(j && j.p[1] === "Sari" && j.p[9] === 0 && j.p[10] === "TAMUPID2", "pemilik melihat tamu + id publik tamu (bukan uid)");
  ok(!JSON.stringify(r.log).includes("uidOwner") && !JSON.stringify(r.log).includes("uidTamu"), "uid tidak pernah dikirim");
  r.log.length = 0; r.adv(300); mv(r, 2, 7, 6, 1); r.adv(250); r.room.tick();
  const s = r.to(1).find((o) => o.t === "s"); ok(s && s.u[0][1] === P.qz(7), "pemilik melihat tamu berjalan");
  msg(r, 2, { t: "c", m: "halo Budi" });
  ok(r.to(1).some((o) => o.t === "c" && o.m === "halo Budi") && r.to(2).some((o) => o.t === "c"), "bubble chat sampai ke pemilik & gema ke pengirim");
  msg(r, 1, { t: "e", i: 0 }); ok(r.to(2).some((o) => o.t === "e" && o.i === 0), "emoji sampai");
}
{ // bendera IN & koordinat; lewat pintu bukan teleport ilegal; di halaman tetap dibatasi kecepatan
  const r = mk(); r.room.join(1, "a", {}, null, { role: "owner", hid: "AAAAAAAA" }); hello(r, 1, "A", 4, 4);
  r.adv(300); mv(r, 1, 25, 25, 1); const p = r.room.players.get(1);
  ok(Math.hypot(p.x - 4, p.y - 4) < 4, "lompat jauh ditahan (anti teleport)");
  r.adv(300); mv(r, 1, 3, 3, 17);   // masuk rumah: flag IN berubah, koordinat berganti ruang dalam satu langkah
  ok(p.f === 17 && p.x === 3 && p.y === 3, "lewat pintu: flag IN & koordinat dalam diterima");
  r.adv(300); mv(r, 1, 99, 99, 17); ok(p.x <= 32 && p.y <= 32, "peta rumah dibatasi 32×32");
}
{ // tamu tidak bisa mengeluarkan; pemilik bisa; tamu keluar tak bisa jadi pemilik
  const r = mk(); r.room.join(1, "o", {}, null, { role: "owner", hid: "OOOOOOOO" }); hello(r, 1, "Budi", 5, 5);
  r.room.join(2, "t", {}, null, { role: "visitor", hid: "TTTTTTT2" }); hello(r, 2, "Sari", 6, 5);
  r.room.join(3, "u", {}, null, { role: "visitor", hid: "UUUUUUU3" }); hello(r, 3, "Joko", 7, 5);
  const tid = r.room.players.get(2).pid, oid = r.room.players.get(1).pid;
  msg(r, 2, { t: "k", id: oid }); msg(r, 2, { t: "k", id: "*" });
  ok(r.room.players.size === 3 && r.closed.length === 0, "tamu tidak bisa mengeluarkan siapa pun");
  r.adv(100); msg(r, 1, { t: "k", id: tid });
  ok(!r.room.players.has(2) && r.room.players.has(3) && r.room.players.has(1), "pemilik mengeluarkan satu tamu saja");
  ok(r.closed.some((c) => c[0] === 2 && c[1] === P.HOUSE.KICK_CODE), "kode tutup khusus (4010)");
  ok(r.ejected.length === 1 && r.ejected[0] === "TTTTTTT2", "pencatat larangan dipanggil dengan id publik tamu");
  ok(r.to(1).some((o) => o.t === "l" && o.id === tid), "pemain lain diberi tahu tamu pergi");
  r.adv(60000); msg(r, 1, { t: "k", id: oid }); ok(r.room.players.has(1), "pemilik tidak bisa mengeluarkan dirinya");
  r.adv(60000); msg(r, 1, { t: "k", id: "*" }); ok(r.room.players.size === 1, "'*' mengeluarkan semua tamu");
}
{ // pesan 'k' di ruang Muara tidak berfungsi; kapasitas; satu sesi per akun; pulih setelah hibernasi
  const m = new Room({ id: "muara-1", io: { now: () => 1, send() {}, close() {} } });
  m.join(1, "a", {}); m.join(2, "b", {}); m.message(1, JSON.stringify({ t: "hello", n: "A", x: 1, y: 1 })); m.message(2, JSON.stringify({ t: "hello", n: "B", x: 1, y: 1 }));
  m.message(1, JSON.stringify({ t: "k", id: "*" })); ok(m.players.size === 2, "ruang Muara: 'k' tidak mengeluarkan siapa pun");
  ok(m.pub(m.players.get(1)).length === 9, "baris Muara = kolom 4.2 (9, kolom ke-9 = pamer ikan), tanpa kolom rumah");
  const r = mk(2); r.room.join(1, "o", {}, null, { role: "owner", hid: "OOOOOOOO" }); r.room.join(2, "t", {}, null, { role: "visitor", hid: "TTTTTTT2" });
  ok(!r.room.join(3, "x", {}, null, { role: "visitor", hid: "XXXXXXX3" }).ok, "rumah penuh menolak");
  r.room.join(4, "t", {}, null, { role: "visitor", hid: "TTTTTTT2" }); ok(r.closed.some((c) => c[0] === 2 && c[1] === 4002), "satu sesi per akun");
  const snap = r.room.snapshot(1), r2 = mk(); r2.room.restore(9, snap);
  const q = r2.room.players.get(9); ok(q && q.role === "owner" && q.hid === "OOOOOOOO", "peran & id publik pulih setelah hibernasi");
}
console.log(`Ruang rumah: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
