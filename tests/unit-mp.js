// Uji logika multiplayer (murni, tanpa jaringan): node tests/unit-mp.js
const P = require("../mp/proto.js"), { Room } = require("../mp/room-core.js"), Jwt = require("../mp/jwt.js");
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
  ok(/new_sqlite_classes\s*=\s*\["MuaraRoom"\]/.test(toml), "DO berbasis SQLite (wajib untuk paket gratis)");
  ok(!/new_classes/.test(toml), "tidak memakai KV-backed DO (hanya berbayar)");
  ok(/FIREBASE_PROJECT_ID\s*=\s*"nusa-island-d2023"/.test(toml), "project id Firebase benar");
  ok(!/(secret|api_key|token)\s*=/i.test(toml), "tidak ada rahasia di wrangler.toml");
  ok(src.includes("acceptWebSocket") && src.includes("deserializeAttachment"), "memakai WebSocket Hibernation API");
  ok(src.includes("ALLOWED_ORIGINS") && src.includes("verifyFirebaseToken"), "origin & token diperiksa sebelum DO");
  ok(!/uid/.test(JSON.stringify([...src.matchAll(/send\([^)]*\)/g)].map((m) => m[0]))), "pengiriman tidak menyertakan uid");
  console.log(`\nMultiplayer: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
