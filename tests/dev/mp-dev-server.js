// SERVER UJI LOKAL (hanya untuk pengembangan/pengujian; BUKAN dipakai di produksi).
// Menjalankan logika instance YANG SAMA (mp/room-core.js) di atas WebSocket Node murni (tanpa paket npm), supaya klien game bisa diuji
// dengan beberapa browser sungguhan. Perbedaan dari produksi: token dev "dev.<uid>" (tanpa verifikasi Firebase) dan timer biasa,
// bukan Durable Object. Jalankan: node tests/dev/mp-dev-server.js [port]   (cap kamar: env ROOM_CAP)
const http = require("http"), crypto = require("crypto");
const P = require("../../mp/proto.js"), { Room } = require("../../mp/room-core.js"), { Lobby } = require("../../mp/lobby-core.js");
const PORT = +(process.argv[2] || process.env.PORT || 8799), CAP = +(process.env.ROOM_CAP || P.ROOM_CAP);
const rooms = new Map(), conns = new Map(); let nextConn = 1;
const lobby = new Lobby({ cap: CAP, lim: process.env.NUSA_DEV_NO_RATE ? { perUid: 1e9, perIp: 1e9, global: 1e9 } : undefined });
const stats = { joins: 0, msgsIn: 0, bytesOut: 0, msgsOut: 0 };

function frame(op, payload) {
  const b = Buffer.isBuffer(payload) ? payload : Buffer.from(payload || "");
  const h = b.length < 126 ? Buffer.from([0x80 | op, b.length]) : b.length < 65536 ? Buffer.from([0x80 | op, 126, b.length >> 8, b.length & 255]) : (() => { const x = Buffer.alloc(10); x[0] = 0x80 | op; x[1] = 127; x.writeBigUInt64BE(BigInt(b.length), 2); return x; })();
  return Buffer.concat([h, b]);
}
function getRoom(k) {
  const name = "muara-" + k; if (rooms.has(name)) return rooms.get(name);
  const room = new Room({ id: name, cap: CAP, io: {
    now: () => Date.now(),
    send: (c, o) => { const s = conns.get(c); if (s && !s.dead) { const t = JSON.stringify(o); stats.msgsOut++; stats.bytesOut += t.length; s.write(frame(1, t)); } },
    close: (c, code, reason) => { const s = conns.get(c); if (s) { s.write(frame(8, Buffer.concat([Buffer.from([code >> 8, code & 255]), Buffer.from(String(reason || "").slice(0, 100))]))); s.end(); } },
  } });
  rooms.set(name, room); return room;
}
const sig = new Map();
function memberSync(room, force) {   // sama dengan Durable Object: laporan daftar lengkap anggota ke lobby; sesi ganda lintas instance ditutup
  const u = room.uids().sort(), key = u.join("|"), k = room.number(); if (!force && sig.get(k) === key) return; sig.set(k, key);
  for (const d of lobby.sync(k, u)) { const r = rooms.get("muara-" + d.room); const c = r && r.byUid.get(d.uid); if (c != null) { r.kick(c, 4002, "Akunmu masuk dari perangkat lain."); memberSync(r); } }
}
setInterval(() => { for (const r of rooms.values()) { r.sweep(); r.tick(); memberSync(r); } }, P.TICK_MS);

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization" }); return res.end(); }
  if (req.url === "/health") { res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" }); return res.end(JSON.stringify({ ok: true, dev: true })); }
  if (req.url.startsWith("/rooms")) { const r = lobby.list(req.socket.remoteAddress); res.writeHead(r.error ? 429 : 200, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization" }); return res.end(JSON.stringify(r)); }
  if (req.url === "/stats") { res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" }); return res.end(JSON.stringify(Object.assign({}, stats, { rooms: [...rooms].map(([n, r]) => [n, r.size(), r.count()]) }))); }
  res.writeHead(404); res.end();
});
server.on("upgrade", (req, sock) => {
  const url = new URL(req.url, "http://x"), key = req.headers["sec-websocket-key"], offered = String(req.headers["sec-websocket-protocol"] || "").split(",").map((s) => s.trim());
  const CLOSE = { full: 4006, bad_room: 4007, rate: 4008, busy: 4009 };
  const fail = (code, err, extra) => {   // sama dengan Worker: galat dikirim lewat WebSocket (browser tak bisa membaca status HTTP handshake)
    if (code === 401 || !key) { sock.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n"); return sock.destroy(); }
    const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64"), c = CLOSE[err] || 4009;
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\nSec-WebSocket-Protocol: ${P.SUBPROTOCOL}\r\n\r\n`);
    sock.write(frame(1, JSON.stringify({ t: "x", e: err, ...(extra || {}) }))); sock.write(frame(8, Buffer.concat([Buffer.from([c >> 8, c & 255]), Buffer.from(err)]))); sock.end();
  };
  if (!key || offered[0] !== P.SUBPROTOCOL || !/^dev\.[\w-]+$/.test(offered[1] || "")) return fail(401, "unauthorized");
  const uid = offered[1].slice(4), wantRaw = url.searchParams.get("room"), want = P.roomId(wantRaw);
  if (wantRaw != null && wantRaw !== "" && want == null) return fail(400, "bad_room");
  let room = null, conn = nextConn++; const exclude = [];
  for (let i = 0; i < P.MAX_ROOMS && !room; i++) {
    const r = lobby.assign(uid, req.socket.remoteAddress, exclude, { room: want, mode: url.searchParams.get("mode") === "random" ? "random" : "auto" });
    if (r.error === "rate") return fail(429, "rate"); if (r.error === "bad_room") return fail(400, "bad_room");
    if (r.error === "full") return fail(409, "full", { room: r.room || want || null }); if (r.error) return fail(503, r.error);
    if (r.kick) { const old = rooms.get("muara-" + r.kick), c = old && old.byUid.get(uid); if (c != null) { old.kick(c, 4002, "Akunmu masuk dari perangkat lain."); memberSync(old); } lobby.left(r.kick, uid); }
    const cand = getRoom(r.room);
    if (cand.size() < cand.cap || cand.byUid.has(uid)) room = cand; else { if (want) return fail(409, "full", { room: want }); exclude.push(r.room); lobby.sync(r.room, cand.uids()); }
  }
  if (!room) return fail(503, "full");
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\nSec-WebSocket-Protocol: ${P.SUBPROTOCOL}\r\n\r\n`);
  sock.setNoDelay(true); conns.set(conn, sock);
  const r = room.join(conn, uid, {}, null); if (!r.ok) { sock.end(); conns.delete(conn); return; }
  stats.joins++; memberSync(room, true);
  let buf = Buffer.alloc(0);
  const done = () => { sock.dead = true; conns.delete(conn); room.leave(conn); memberSync(room); };
  sock.on("data", (d) => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
      if (buf.length < 2) return;
      const op = buf[0] & 15, masked = !!(buf[1] & 128); let len = buf[1] & 127, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; } else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > 65536) return sock.destroy();
      if (buf.length < off + (masked ? 4 : 0) + len) return;
      let payload = buf.subarray(off + (masked ? 4 : 0), off + (masked ? 4 : 0) + len);
      if (masked) { const m = buf.subarray(off, off + 4); payload = Buffer.from(payload.map((b, i) => b ^ m[i % 4])); }
      buf = buf.subarray(off + (masked ? 4 : 0) + len);
      if (op === 8) { sock.write(frame(8, payload)); sock.end(); return; }
      if (op === 9) { sock.write(frame(10, payload)); continue; }
      if (op === 1) { stats.msgsIn++; room.message(conn, payload.toString("utf8")); }
    }
  });
  sock.on("close", done); sock.on("error", done);
});
server.listen(PORT, "127.0.0.1", () => console.log("mp-dev-server di port " + PORT));
