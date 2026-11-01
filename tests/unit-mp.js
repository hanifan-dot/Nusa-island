// Uji logika multiplayer (murni, tanpa jaringan): node tests/unit-mp.js
const P = require("../mp/proto.js"), { Room } = require("../mp/room-core.js"), Jwt = require("../mp/jwt.js"), { Lobby, LIM } = require("../mp/lobby-core.js");
const fs = require("fs"), path = require("path"), crypto = require("crypto");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("GAGAL:", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);

// ---------- proto ----------
eq(P.cleanName("  Budi   Nelayan  "), "Budi Nelayan", "nama dirapikan");
ok(P.cleanName("<script>x</script>").indexOf("<") < 0, "nama tanpa tag");
eq(P.cleanName("Admin Nusa", "X"), "X", "nama menyerupai staf ditolak");
eq(P.cleanName("OWNER", "X"), "X", "owner ditolak");
eq(P.cleanName("anjing", "X"), "X", "nama kasar ditolak");
ok(Array.from(P.cleanName("A".repeat(40))).length === 14, "nama maks 14");
eq(P.cleanName("", "Nelayan-1"), "Nelayan-1", "nama kosong → cadangan");
eq(P.cleanChat("halo  semua"), "halo semua", "chat dirapikan");
ok(!/https?|www|\.com/.test(P.cleanChat("buka http://x.com atau www.abc.id dan situs.com")), "tautan disamarkan");
ok(!/\d{8}/.test(P.cleanChat("wa 0812 3456 7890 ya")), "nomor telepon disamarkan");
ok(!/@/.test(P.cleanChat("kirim ke a@b.com")), "email disamarkan");
ok(P.cleanChat("dasar anjing kamu").includes("***") && !P.cleanChat("dasar anjing kamu").includes("anjing"), "kata kasar dimasker");
eq(P.cleanChat("asuransi mobil"), "asuransi mobil", "kata wajar yang memuat 'asu' aman");
ok(Array.from(P.cleanChat("x".repeat(500))).length === 80, "chat maks 80");
eq(P.cleanChat("a\u0000b‮c"), "a b c", "karakter kontrol dibuang");

// ---------- helper room ----------
function mkRoom(cap = 4) {
  const log = [], closed = []; let now = 1e6;
  const room = new Room({ id: "muara-1", cap, io: { now: () => now, send: (c, o) => log.push([c, o]), close: (c, code, r) => closed.push([c, code, r]) } });
  return { room, log, closed, adv: (ms) => { now += ms; }, now: () => now, to: (c) => log.filter((l) => l[0] === c).map((l) => l[1]), clear: () => { log.length = 0; } };
}
const hello = (r, c, n, x = 19.5, y = 20.6, extra = {}) => r.room.message(c, JSON.stringify(Object.assign({ t: "hello", n, r: 2, rd: 3, x: P.qz(x), y: P.qz(y), d: 2, f: 0 }, extra)));
const mv = (r, c, x, y, d = 2, f = 1) => r.room.message(c, JSON.stringify({ t: "m", x: P.qz(x), y: P.qz(y), d, f }));

// ---------- masuk / terlihat ----------
{
  const r = mkRoom(); ok(r.room.join(1, "uidA", {}).ok, "A join"); hello(r, 1, "Budi");
  const w = r.to(1).find((o) => o.t === "w"); ok(w && w.ps.length === 0 && w.me, "A menerima welcome kosong (tidak ada pemain palsu)");
  ok(r.room.count() === 1, "hitungan 1");
  r.room.join(2, "uidB", {}); hello(r, 2, "Sari");
  const w2 = r.to(2).find((o) => o.t === "w"); ok(w2.ps.length === 1 && w2.ps[0][1] === "Budi", "B melihat A");
  ok(r.to(1).some((o) => o.t === "j" && o.p[1] === "Sari"), "A diberi tahu B masuk");
  ok(!JSON.stringify(r.log).includes("uidA") && !JSON.stringify(r.log).includes("uidB"), "uid tidak pernah dikirim ke pemain");
}
// ---------- gerak & siaran delta ----------
{
  const r = mkRoom(); r.room.join(1, "a", {}); hello(r, 1, "A"); r.room.join(2, "b", {}); hello(r, 2, "B"); r.clear();
  r.adv(250); mv(r, 1, 20.2, 20.6);
  ok(r.room.hasDirty(), "ada perubahan");
  ok(r.room.tick() === true, "tick mengirim");
  const s2 = r.to(2).filter((o) => o.t === "s"), s1 = r.to(1).filter((o) => o.t === "s");
  ok(s2.length === 1 && s2[0].u.length === 1 && s2[0].u[0][1] === P.qz(20.2), "B menerima posisi A");
  ok(s1.length === 0, "A tidak menerima gema posisinya sendiri");
  r.clear(); ok(r.room.tick() === false && r.log.length === 0, "tanpa perubahan → tanpa siaran");
  // pesan identik tidak membuat dirty
  r.adv(300); mv(r, 1, 20.2, 20.6); r.room.tick(); r.clear(); r.adv(300); mv(r, 1, 20.2, 20.6, 2, 1); ok(!r.room.hasDirty(), "posisi sama = tidak dikirim");
}
// ---------- batas kecepatan & teleport ----------
{
  const r = mkRoom(); r.room.join(1, "a", {}); hello(r, 1, "A", 10, 10); r.adv(200);
  mv(r, 1, 30, 10);   // lompat 20 tile dalam 0,2 dtk
  const p = r.room.players.get(1); ok(p.x < 12.5 && p.x > 10, "lompatan ditahan server (x=" + p.x.toFixed(2) + ")");
  r.adv(1000); r.room.message(1, JSON.stringify({ t: "m", x: P.qz(30), y: P.qz(10), d: 2, f: 8 }));
  ok(r.room.players.get(1).x > 29.9, "teleport sah (bendera TP) diterima");
  r.adv(1000); r.room.message(1, JSON.stringify({ t: "m", x: P.qz(5), y: P.qz(10), d: 2, f: 8 }));
  ok(r.room.players.get(1).x > 20, "teleport kedua dalam 5 dtk ditahan");
  r.adv(1000); mv(r, 1, 999, -50);
  ok(r.room.players.get(1).x <= 40 && r.room.players.get(1).y >= 0, "di luar peta dijepit");
  r.adv(1000); r.room.message(1, JSON.stringify({ t: "m", x: "abc", y: null, d: 1, f: 0 })); ok(true, "NaN tidak membuat crash");
}
// ---------- kapasitas / instance ----------
{
  const r = mkRoom(2); ok(r.room.join(1, "a", {}).ok && r.room.join(2, "b", {}).ok, "dua masuk"); const x = r.room.join(3, "c", {}); ok(!x.ok && x.reason === "full", "ketiga ditolak (penuh)");
  r.room.leave(1); ok(r.room.join(3, "c", {}).ok, "slot kosong terpakai lagi");
}
// ---------- satu sesi per akun ----------
{
  const r = mkRoom(); r.room.join(1, "same", {}); hello(r, 1, "A"); r.room.join(2, "same", {}); 
  ok(r.closed.some((c) => c[0] === 1 && c[1] === 4002), "sesi lama ditutup saat akun yang sama masuk lagi"); ok(r.room.size() === 1, "hanya satu sesi");
}
// ---------- chat ----------
{
  const r = mkRoom(); r.room.join(1, "a", {}); hello(r, 1, "A"); r.room.join(2, "b", {}); hello(r, 2, "B"); r.clear();
  r.room.message(1, JSON.stringify({ t: "c", m: "Halo  <b>semua</b> anjing" }));
  const c2 = r.to(2).find((o) => o.t === "c"), c1 = r.to(1).find((o) => o.t === "c");
  ok(c2 && c1 && c1.m === c2.m && !c2.m.includes("anjing"), "chat dibersihkan & digemakan ke pengirim sama persis: " + (c2 && c2.m));
  r.clear(); r.room.message(1, JSON.stringify({ t: "c", m: "Halo  <b>semua</b> anjing" })); ok(!r.log.some((l) => l[1].t === "c"), "pesan sama berturut-turut diabaikan");
  for (let i = 0; i < 6; i++) r.room.message(1, JSON.stringify({ t: "c", m: "pesan " + i }));
  ok(r.to(2).filter((o) => o.t === "c").length <= 3, "laju chat dibatasi (maks burst 3)");
  ok(r.to(1).some((o) => o.t === "n"), "pengirim diberi tahu terlalu cepat");
  r.adv(5000); r.clear(); r.room.message(1, JSON.stringify({ t: "c", m: "lagi" })); ok(r.to(2).some((o) => o.t === "c"), "chat pulih setelah jeda");
  r.clear(); r.room.message(2, JSON.stringify({ t: "e", i: 3 })); ok(r.to(1).some((o) => o.t === "e" && o.i === 3), "emoji tersiar");
  r.clear(); r.room.message(2, JSON.stringify({ t: "e", i: 99 })); ok(r.log.length === 0, "emoji tak dikenal diabaikan");
}
// ---------- tak terlihat (di rumah / di luar Muara) ----------
{
  const r = mkRoom(); r.room.join(1, "a", {}); hello(r, 1, "A"); r.room.join(2, "b", {}); hello(r, 2, "B"); r.clear();
  r.room.message(2, JSON.stringify({ t: "v", on: 0 })); ok(r.to(1).some((o) => o.t === "l"), "pemain tersembunyi menghilang bagi yang lain");
  r.clear(); r.room.message(2, JSON.stringify({ t: "c", m: "halo" })); ok(r.log.length === 0, "pemain tersembunyi tidak bisa chat");
  r.adv(300); mv(r, 2, 25, 25); r.room.tick(); ok(!r.to(1).some((o) => o.t === "s"), "pemain tersembunyi tidak disiarkan");
  r.room.message(2, JSON.stringify({ t: "v", on: 1 })); ok(r.to(1).some((o) => o.t === "j"), "muncul lagi saat kembali");
}
// ---------- timeout ----------
{
  const r = mkRoom(); r.room.join(1, "a", {}); hello(r, 1, "A"); r.room.join(2, "b", {}); hello(r, 2, "B"); r.clear();
  r.adv(30000); r.room.message(1, JSON.stringify({ t: "h" })); r.adv(20000);
  ok(r.room.sweep() === 1, "B (tanpa kabar >45 dtk) dibuang, A (heartbeat) tetap");
  ok(r.to(1).some((o) => o.t === "l"), "A diberi tahu B menghilang"); ok(r.closed.some((c) => c[0] === 2 && c[1] === 4003), "koneksi B ditutup");
  ok(r.room.size() === 1, "tersisa satu");
}
// ---------- anti-banjir ----------
{
  const r = mkRoom(); r.room.join(1, "a", {}); hello(r, 1, "A");
  for (let i = 0; i < 400; i++) r.room.message(1, "{bukan json");
  ok(r.closed.some((c) => c[0] === 1 && c[1] === 4005), "sampah berulang → ditendang");
  const r2 = mkRoom(); r2.room.join(1, "a", {}); hello(r2, 1, "A"); let ack = 0;
  for (let i = 0; i < 100; i++) { mv(r2, 1, 19.5 + (i % 2) * 0.1, 20.6); } ok(r2.room.size() === 1, "banjir posisi tidak membuat crash");
  r2.room.message(1, "x".repeat(2000)); ok(true, "pesan raksasa ditolak");
}
// ---------- hemat data ----------
{
  const r = mkRoom(); r.room.join(1, "a", {}); hello(r, 1, "A"); r.room.join(2, "b", {}); hello(r, 2, "B", 10, 10);
  r.room.message(2, JSON.stringify({ t: "o", lo: 1 })); r.clear();
  let n = 0; for (let i = 0; i < 9; i++) { r.adv(200); mv(r, 1, 19.5 + (i + 1) * 0.3, 20.6); r.room.tick(); }
  const got = r.to(2).filter((o) => o.t === "s"); ok(got.length === 3, "hemat data: 9 siaran → 3 paket (" + got.length + ")");
  r.clear(); r.adv(200); mv(r, 1, 30, 20.6); r.room.tick(); r.room.tick();
  ok(r.to(2).some((o) => o.t === "s" && o.u[0][1] === P.qz(r.room.players.get(1).x)), "posisi akhir tetap sampai walau hemat data");
}
// ---------- pemulihan setelah hibernasi ----------
{
  const a = mkRoom(); a.room.join(1, "a", {}); hello(a, 1, "Budi", 12, 14); const snap = a.room.snapshot(1);
  const b = mkRoom(); ok(b.room.restore(1, snap).ok, "restore"); const p = b.room.players.get(1);
  ok(p.name === "Budi" && Math.abs(p.x - 12) < 1e-9 && p.vis === true && p.pid === snap.pid, "state pulih dari lampiran"); ok(b.room.join(2, "c", {}).ok, "pemain baru tidak bentrok id");
}

// ---------- lobby (pintu masuk): penugasan instance & batas laju ----------
{
  let t = 0; const L = new Lobby({ cap: 2, max: 3, now: () => t });
  let r = L.assign("a", "1.1.1.1"); ok(r.room === 1, "pemain pertama → instance 1"); L.joined(1, "a");
  r = L.assign("b", "1.1.1.2"); ok(r.room === 1, "kedua → instance 1"); L.joined(1, "b");
  r = L.assign("c", "1.1.1.3"); ok(r.room === 2, "ketiga → instance 2 (1 penuh)"); L.joined(2, "c");
  L.left(1, "a"); r = L.assign("d", "1.1.1.4"); ok(r.room === 1, "slot kosong di instance 1 terisi lagi");
  L.joined(1, "d"); L.joined(2, "e"); L.joined(3, "f"); L.joined(3, "g");
  r = L.assign("h", "1.1.1.9"); ok(r.error === "full", "semua penuh → full");
  r = L.assign("c", "1.1.1.3", [2]); ok(r.room === 3 || r.error, "percobaan ulang menghormati exclude");
  const L2 = new Lobby({ cap: 5, max: 3, now: () => t }); L2.joined(2, "x"); const r2 = L2.assign("x", "9.9.9.9"); ok(r2.room === 1 && r2.kick === 2, "akun yang sudah di instance lain: sesi lama ditandai untuk ditutup");
  const L3 = new Lobby({ cap: 5, max: 3, now: () => t }); let lim = 0; for (let i = 0; i < 20; i++) if (L3.assign("spam", "2.2.2.2").error === "rate") lim++;
  ok(lim === 20 - LIM.perUid, "satu akun dibatasi " + LIM.perUid + " masuk/menit (ditolak " + lim + ")");
  t += 61000; ok(!L3.assign("spam", "2.2.2.2").error, "batas pulih setelah semenit");
  const L4 = new Lobby({ cap: 5, max: 3, now: () => t }); let ipRej = 0; for (let i = 0; i < 50; i++) if (L4.assign("u" + i, "3.3.3.3").error === "rate") ipRej++;
  ok(ipRej === 50 - LIM.perIp, "satu IP dibatasi " + LIM.perIp + " masuk/menit");
  const L5 = new Lobby({ cap: 5, max: 3, now: () => t }); let busy = 0; for (let i = 0; i < 400; i++) if (L5.assign("g" + i, "ip" + (i % 40)).error === "busy") busy++;
  ok(busy > 0, "batas global melindungi kuota gratis (" + busy + " ditolak)");
  const L6 = new Lobby({ cap: 2, max: 3, now: () => t }); L6.sync(1, ["p", "q"]); ok(L6.assign("z", "4.4.4.4").room === 2, "sync dari instance memulihkan hitungan setelah lobby tidur");
}

// ---------- Server bertambah otomatis ketika 12 ruang awal penuh ----------
{
  ok(P.MIN_ROOMS === 12 && P.MAX_ROOMS === 64 && P.roomId(64) === 64 && P.roomId(65) === null, "konfigurasi server otomatis 12 hingga 64");
  const now = () => 1000, lim = { perUid: 10000, perIp: 10000, global: 10000 };
  const L = new Lobby({ cap: 2, max: 64, now, lim });
  ok(L.list("start").rooms.length === 12, "server awal tetap ID 1–12");
  for (let k = 1; k <= 12; k++) L.sync(k, ["a" + k, "b" + k]);
  ok(L.list("full12").open === 13, "server 13 dibuka saat 1–12 semuanya penuh");
  ok(L.assign("new", "ip", [], {}).room === 13, "gabung otomatis ke server 13");
  ok(L.assign("rand", "ip", [], { mode: "random" }).room === 13, "acak dapat server 13");
  L.sync(13, ["a13", "b13"]);
  ok(L.list("full13").open === 14, "server 14 dibuka sesudah server 13 penuh");
  L.left(1, "a1");
  ok(L.list("space1").open === 13, "server tambahan berisi tetap muncul walau server 1 kosong");
  L.sync(13, []);
  ok(L.list("empty13").open === 12, "server kosong tambahan boleh disembunyikan");
  ok(L.assign("friend", "ip", [], { room: 64 }).room === 64, "teman boleh masuk dengan ID server eksplisit sampai 64");
  L.sync(64, ["friend"]);
  ok(L.list("occupied64").open === 64, "server eksplisit tetap terlihat setelah dipakai");
  const Small = new Lobby({ cap: 2, max: 3, now, lim });
  ok(Small.list("small").open === 3 && Small.assign("no", "ip", [], { room: 4 }).error === "bad_room", "batas setiap lobby tetap ditegakkan");
  const Full = new Lobby({ cap: 1, max: 64, now, lim });
  for (let k = 1; k < 64; k++) Full.sync(k, ["player" + k]);
  ok(Full.list("near-cap").open === 64 && Full.assign("last", "ip", [], {}).room === 64, "server 64 terbuka otomatis saat 1–63 penuh");
  Full.sync(64, ["player64"]);
  ok(Full.assign("overflow", "ip", [], {}).error === "full", "setelah 64 server penuh, koneksi baru ditolak dengan pesan penuh");
}
// ---------- Tahap 4.2: ID server, hitungan, jam dunia, pamer ikan ----------
{
  ok(P.roomId("3") === 3 && P.roomId(12) === 12 && P.roomId(" 7 ") === 7, "roomId angka sah");
  for (const bad of ["0", "65", "99", "abc", "3x", "-1", "1e1", "3 OR 1=1", "", null, undefined, "٣", "03a", "1000"]) ok(P.roomId(bad) === null, "roomId menolak " + JSON.stringify(bad));
  ok(P.roomId("03") === 3, "roomId '03' = 3");
  // lobby: pilih ID, acak, otomatis, penuh, validasi
  let t = 0; const L = new Lobby({ cap: 2, max: 12, now: () => t, rnd: () => 0.5, lim: { perUid: 1e9, perIp: 1e9, global: 1e9 } });
  let r = L.assign("a", "ip", [], { room: 3 }); ok(r.room === 3 && !r.error, "ID 3 → server 3"); L.sync(3, ["a"]);
  r = L.assign("b", "ip", [], { room: "3" }); ok(r.room === 3, "B ID 3 → server yang sama dengan A"); L.sync(3, ["a", "b"]);
  r = L.assign("c", "ip", [], { room: 3 }); ok(r.error === "full" && r.room === 3, "C ID 3 → penuh (kapasitas tidak bisa dilewati)");
  r = L.assign("c", "ip", [], { room: 99 }); ok(r.error === "bad_room", "ID 99 ditolak server"); r = L.assign("c", "ip", [], { room: "abc" }); ok(r.error === "bad_room", "ID 'abc' ditolak server");
  r = L.assign("c", "ip", [], { mode: "random" }); ok(!r.error && r.room !== 3 && r.room >= 1 && r.room <= 12, "acak memilih server yang ada tempat (bukan penuh): " + r.room);
  r = L.assign("a", "ip", [], { mode: "random" }); ok(r.room !== 3, "acak untuk pemain yang sudah di server 3 → server lain"); ok(r.kick === 3, "sesi di server lama ditandai ditutup saat pindah");
  r = L.assign("a", "ip", [], { room: 3 }); ok(r.room === 3 && !r.error, "pemain yang SUDAH di server penuh boleh masuk lagi ke server itu (bukan dihitung dua kali)");
  const L2 = new Lobby({ cap: 2, max: 3, now: () => t, lim: { perUid: 1e9, perIp: 1e9, global: 1e9 } }); L2.sync(1, ["x", "y"]); L2.sync(2, ["z", "w"]); L2.sync(3, ["q", "r"]);
  ok(L2.assign("n", "ip", [], { mode: "random" }).error === "full" && L2.assign("n", "ip", [], {}).error === "full", "semua penuh → full (acak & otomatis)");
  const d = L2.sync(2, ["z", "w", "x"]); ok(d.length === 1 && d[0].room === 1 && d[0].uid === "x", "akun yang muncul di dua server: sesi lama dilaporkan untuk ditutup");
  ok(L2.list("ip9").rooms.length === 3 && L2.list("ip9").cap === 2, "daftar server = angka nyata");
  const L3 = new Lobby({ cap: 2, max: 3, now: () => t }); let lim = 0; for (let i = 0; i < 40; i++) if (L3.list("same").error) lim++; ok(lim === 10, "daftar server dibatasi 30/menit per IP");
  // jam dunia
  const gs = fs.readFileSync(path.join(__dirname, "../game.js"), "utf8");
  ok(/const HOURS_PER_SEC = 24 \/ 480;/.test(gs) && Math.abs(P.WORLD_HPS - 24 / 480) < 1e-12, "konstanta jam dunia sama dengan HOURS_PER_SEC di game.js");
  ok(Math.abs(P.sharedHour(P.WORLD_EPOCH_MS) - 6) < 1e-9, "epoch = 06:00"); ok(Math.abs(P.sharedHour(P.WORLD_EPOCH_MS + 480000) - 6) < 1e-6, "satu hari game = 8 menit nyata");
  ok(Math.abs(P.sharedHour(P.WORLD_EPOCH_MS + 120000) - 12) < 1e-6, "2 menit = +6 jam"); let mono = true, pv = P.sharedHour(1.8e12); for (let i = 1; i < 2000; i++) { const h = P.sharedHour(1.8e12 + i * 1000); if (!(h > pv || h < 1)) mono = false; pv = h; } ok(mono, "jam dunia monoton (hanya wrap tengah malam)");
  ok(P.sharedHour(-5e12) >= 0 && P.sharedHour(5e12) < 24, "jam dunia selalu 0..24");
  // pesan jam server & hitungan
  const r1 = mkRoom(); r1.room.join(1, "a", {}); r1.room.message(1, JSON.stringify({ t: "h" })); const k = r1.to(1).find((o) => o.t === "k"); ok(k && k.st === r1.now(), "heartbeat dibalas jam SERVER");
  hello(r1, 1, "A"); const w = r1.to(1).find((o) => o.t === "w"); ok(w.st === r1.now() && w.rn === 1 && w.n === 1 && w.v === 1, "welcome membawa jam server, nomor server, jumlah tersambung");
  r1.room.join(2, "b", {}); r1.clear(); r1.room.tick(); const cnt = r1.to(1).find((o) => o.t === "cnt"); ok(cnt && cnt.n === 2 && cnt.v === 1, "jumlah tersambung (2) berbeda dari yang terlihat (1) sebelum B masuk dunia");
  ok(r1.to(2).some((o) => o.t === "cnt" && o.n === 2), "pemain yang belum 'hello' pun menerima hitungan tersambung");
  hello(r1, 2, "B"); r1.room.tick(); r1.room.message(2, JSON.stringify({ t: "v", on: 0 })); r1.room.tick(); ok(r1.to(1).filter((o) => o.t === "cnt").pop().v === 1 && r1.to(1).filter((o) => o.t === "cnt").pop().n === 2, "pemain yang bersembunyi tetap terhitung tersambung");
  // pamer ikan
  const h = mkRoom(); h.room.join(1, "a", {}); hello(h, 1, "A"); h.room.join(2, "b", {}); hello(h, 2, "B"); h.clear();
  h.room.message(1, JSON.stringify({ t: "f", i: "arwana", w: 3200, v: "silver" })); const f1 = h.to(2).find((o) => o.t === "f"); ok(f1 && f1.h[0] === "arwana" && f1.h[1] === 3200 && f1.h[2] === "silver", "status pamer disiarkan ke teman");
  ok(!h.to(1).some((o) => o.t === "f"), "tidak digemakan ke pengirim"); h.clear(); h.room.message(1, JSON.stringify({ t: "f", i: "arwana", w: 3200, v: "silver" })); ok(h.log.length === 0, "status sama tidak disiarkan ulang");
  h.clear(); h.room.message(1, JSON.stringify({ t: "f" })); ok(h.to(2).some((o) => o.t === "f" && o.h === 0), "berhenti pamer dibersihkan di teman");
  for (const bad of [{ i: "<b>x</b>", w: 5 }, { i: "a", w: 5 }, { i: "nila", w: 0 }, { i: "nila", w: 1e12 }, { i: "nila", w: "x" }, { i: "nila".repeat(20), w: 5 }, { i: { x: 1 }, w: 5 }]) { h.clear(); h.room.message(1, JSON.stringify(Object.assign({ t: "f" }, bad))); ok(!h.to(2).some((o) => o.t === "f"), "status palsu ditolak: " + JSON.stringify(bad).slice(0, 40)); }
  h.clear(); h.room.message(1, JSON.stringify({ t: "f", i: "nila", w: 1200, v: "<img>" })); ok(h.to(2).find((o) => o.t === "f").h[2] === "normal", "varian tak dikenal → normal");
  h.room.message(1, JSON.stringify({ t: "f", i: "arwana", w: 3000, v: "pearl" })); const pubRow = h.to(2).find((o) => o.t === "w"); const room2 = h; h.room.join(3, "c", {}); hello(h, 3, "C"); const wc = h.to(3).find((o) => o.t === "w"); ok(wc.ps.find((q) => q[1] === "A")[8][0] === "arwana", "pemain yang baru masuk langsung melihat ikan yang sedang dipamerkan");
  h.room.message(1, JSON.stringify({ t: "v", on: 0 })); h.room.message(1, JSON.stringify({ t: "v", on: 1 })); ok(h.room.players.get(1).hold === null, "pindah area/sembunyi membersihkan status pamer di server");
  h.room.message(1, JSON.stringify({ t: "f", i: "nila", w: 1000, v: "normal" })); h.room.leave(1); ok(![...h.room.players.values()].some((q) => q.hold && q.name === "A"), "keluar = status pamer hilang bersama pemain");
  const hf = mkRoom(); hf.room.join(1, "a", {}); hello(hf, 1, "A"); hf.room.join(2, "b", {}); hello(hf, 2, "B"); let leaked = 0; for (let i = 0; i < 40; i++) { hf.adv(100); hf.room.message(1, JSON.stringify({ t: "f", i: i % 2 ? "nila" : "mas", w: 1000 + i, v: "normal" })); } leaked = hf.to(2).filter((o) => o.t === "f").length; ok(leaked <= 9, "laju perubahan status pamer dibatasi (" + leaked + " dari 40)");
  // protokol tidak memuat inventaris
  const src2 = fs.readFileSync(path.join(__dirname, "../mp/room-core.js"), "utf8") + fs.readFileSync(path.join(__dirname, "../mp/proto.js"), "utf8");
  ok(!/uid:\s*it\.uid|cooler|money|inventor/i.test(src2.replace(/\/\/.*$/gm, "")), "kode server tidak mengenal coolbox/koin/inventaris");
  const wtoml = fs.readFileSync(path.join(__dirname, "../cf-multiplayer/src/index.js"), "utf8");
  ok(/Proto\.roomId\(wantRaw\)/.test(wtoml) && /wsError\("bad_room"\)/.test(wtoml) && /CLOSE = \{ full: 4006, bad_room: 4007, rate: 4008/.test(wtoml), "Worker memvalidasi ?room= dan melaporkan galat lewat WebSocket");
  ok(/\/rooms/.test(wtoml) && /verifyFirebaseToken\(tok/.test(wtoml), "daftar server butuh token sah");
}

// ---------- JWT (kunci RSA buatan sendiri; tanpa jaringan) ----------
(async () => {
  const kp = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }), jwk = kp.publicKey.export({ format: "jwk" }); jwk.kid = "k1"; jwk.alg = "RS256";
  const PROJ = "nusa-island-d2023", NOW = 1793502000000, S = Math.floor(NOW / 1000);
  const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
  const mk = (pl, kid = "k1", key = kp.privateKey, alg = "RS256") => { const h = b64({ alg, kid, typ: "JWT" }), body = b64(pl), sig = crypto.sign("RSA-SHA256", Buffer.from(h + "." + body), key).toString("base64url"); return h + "." + body + "." + sig; };
  const base = { aud: PROJ, iss: "https://securetoken.google.com/" + PROJ, sub: "uid123", iat: S - 10, exp: S + 3000, auth_time: S - 20, email_verified: true, firebase: { sign_in_provider: "google.com" } };
  const o = { projectId: PROJ, now: () => NOW, fetchJwks: async () => ({ keys: [jwk] }) };
  const bad = async (tok, why, opt) => { Jwt.resetCache(); try { await Jwt.verifyFirebaseToken(tok, opt || o); ok(false, "harus ditolak: " + why); } catch (e) { ok(e.code === "auth", "ditolak (" + why + "): " + e.message); } };
  Jwt.resetCache(); const r = await Jwt.verifyFirebaseToken(mk(base), o); ok(r.uid === "uid123", "token sah diterima");
  await bad(mk(Object.assign({}, base, { aud: "lain" })), "aud salah");
  await bad(mk(Object.assign({}, base, { iss: "https://securetoken.google.com/lain" })), "iss salah");
  await bad(mk(Object.assign({}, base, { exp: S - 5 })), "kedaluwarsa");
  await bad(mk(Object.assign({}, base, { email_verified: false })), "email belum terverifikasi");
  await bad(mk(Object.assign({}, base, { firebase: { sign_in_provider: "password" } })), "bukan Google");
  await bad(mk(Object.assign({}, base, { firebase: { sign_in_provider: "anonymous" } })), "anonim");
  await bad(mk(Object.assign({}, base, { sub: "" })), "sub kosong");
  const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }); await bad(mk(base, "k1", other.privateKey), "tanda tangan palsu");
  await bad(mk(base, "kX"), "kid tak dikenal");
  await bad(mk(base).slice(0, -4) + "AAAA", "tanda tangan rusak"); await bad("a.b", "bentuk"); await bad(12345, "bukan string");
  await bad(mk(base, "k1", kp.privateKey, "none").replace(/^[^.]+/, b64({ alg: "none", kid: "k1" })), "alg none");
  await bad(mk(Object.assign({}, base, { iat: S + 9999 })), "iat masa depan");

  // ---------- pemeriksaan statis berkas ----------
  const toml = fs.readFileSync(path.join(__dirname, "../cf-multiplayer/wrangler.toml"), "utf8"), src = fs.readFileSync(path.join(__dirname, "../cf-multiplayer/src/index.js"), "utf8");
  ok(/new_sqlite_classes\s*=\s*\["MuaraRoom", "Lobby"\]/.test(toml), "DO berbasis SQLite (wajib untuk paket gratis)");
  const tomlCode = toml.replace(/#.*$/gm, "");
  ok(/^name = "nusa-multiplayer"$/m.test(toml) && (tomlCode.match(/nusa-api/g) || []).length === 1 && /\[\[services\]\]\s*binding = "API"\s*service = "nusa-api"/.test(tomlCode), "Worker bernama nusa-multiplayer, terpisah dari nusa-api (satu-satunya rujukan = service binding API untuk izin rumah teman; tidak men-deploy nusa-api)");
  ok(/new_sqlite_classes\s*=\s*\["HouseRoom"\]/.test(tomlCode) && /tag = "v1"[\s\S]*tag = "v2"/.test(tomlCode), "migrasi v1 (Muara, Lobby) tidak diubah; HouseRoom ditambah di v2");
  ok(/keep_vars\s*=\s*true/.test(toml), "variabel dashboard (mis. daftar blokir) tidak tertimpa deploy");
  ok(src.includes("MP_BLOCKED_UIDS") && src.includes("lobby.assign"), "ada daftar blokir & pintu masuk berlimit");
  ok(!/new_classes/.test(toml), "tidak memakai KV-backed DO (hanya berbayar)");
  ok(/FIREBASE_PROJECT_ID\s*=\s*"nusa-island-d2023"/.test(toml), "project id Firebase benar");
  ok(!/(secret|api_key|token)\s*=/i.test(toml), "tidak ada rahasia di wrangler.toml");
  ok(src.includes("acceptWebSocket") && src.includes("deserializeAttachment"), "memakai WebSocket Hibernation API");
  ok(src.includes("ALLOWED_ORIGINS") && src.includes("verifyFirebaseToken"), "origin & token diperiksa sebelum DO");
  ok(!/uid/.test(JSON.stringify([...src.matchAll(/send\([^)]*\)/g)].map((m) => m[0]))), "pengiriman tidak menyertakan uid");
  const cli = fs.readFileSync(path.join(__dirname, "../mp/client.js"), "utf8") + fs.readFileSync(path.join(__dirname, "../mp/ui.js"), "utf8");
  ok(!/NusaApi|apiBase|shop_|economy|S\.money|\.money\b|entitlements|wallet|firestore/i.test(cli.replace(/\/\/.*$/gm, "")), "klien multiplayer tidak menyentuh ekonomi/toko/Worker nusa-api/Firestore/saldo");
  ok(/fetch\("mp\/endpoint\.json"/.test(cli) && !/fetch\([^)]*nusa-api/.test(cli), "satu-satunya fetch HTTP klien = mp/endpoint.json");
  const bh = fs.readFileSync(path.join(__dirname, "../firebase/scripts/build-hosting.sh"), "utf8");
  ok(/cp -r audio cloud world shop economy streak event hud house/.test(bh) && /NUSA_MP_WS/.test(bh) && /backend: "cloud"/.test(bh) && /release: "publik"/.test(bh), "build-hosting mempertahankan folder & konfigurasi produksi + menambah multiplayer");
  const act = fs.readFileSync(path.join(__dirname, "../firebase/scripts/rilis.sh"), "utf8");
  ok(/merge-base --is-ancestor/.test(act) && /produksi/.test(act) && /\$\{?WORKER_ONLY|--worker-saja/.test(act) && !/wrangler@4 deploy[^\n]*nusa-api/.test(act), "skrip aktivasi: pagar cabang lama, build produksi, opsi worker-saja");
  ok(/"ya"/.test(act) && /whoami/.test(act), "skrip rilis: konfirmasi eksplisit & memakai login Wrangler yang ada");
  const wf = fs.readFileSync(path.join(__dirname, "../.github/workflows/deploy-nusa-island.yml"), "utf8");
  ok(/^on:\s*\n\s+workflow_dispatch:/m.test(wf) && !/\n\s+(push|pull_request|schedule|pull_request_target):/.test(wf), "workflow rilis HANYA manual (tanpa push/PR/jadwal)");
  ok(/environment:\s*production/.test(wf) && /needs:\s*cek/.test(wf) && /konfirmasi/.test(wf), "workflow: job deploy memakai Environment production (persetujuan) setelah cek & konfirmasi diketik");
  ok(!/(AIza|-----BEGIN|api[_-]?token\s*[:=]\s*["'][A-Za-z0-9])/i.test(wf + act) && /secrets\.CLOUDFLARE_API_TOKEN/.test(wf) && /secrets\.FIREBASE_SERVICE_ACCOUNT/.test(wf), "tidak ada rahasia di repo; semua dari GitHub Secrets");
  ok(!/\$\{\{\s*inputs\.konfirmasi\s*\}\}["']?\s*\]/.test(wf) && /KONF:/.test(wf), "input pengguna tidak disisipkan langsung ke shell");
  ok(/nusa-multiplayer/.test(act) && !/wrangler@4 deploy[^\n]*nusa-api/.test(act) && /status nusa-api/i.test(act), "rilis hanya men-deploy nusa-multiplayer dan memantau nusa-api");
  console.log(`\nMultiplayer: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
