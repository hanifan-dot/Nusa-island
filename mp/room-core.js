// =========================================================
//  NUSA ISLAND — Tahap 4: logika SATU INSTANCE dunia (tanpa jaringan, tanpa timer). Murni & dapat diuji di Node.
//  Dipakai oleh Durable Object Cloudflare (cf-multiplayer/) dan server uji lokal (tests/dev/). Tidak ada pemain palsu:
//  isi instance = koneksi nyata yang lolos verifikasi token Firebase (dilakukan Worker sebelum sampai sini).
//
//  Yang SERVER putuskan: siapa ada di instance (kapasitas), batas peta, batas kecepatan, laju pesan, pembersihan chat,
//  satu sesi per akun, timeout. Yang server TIDAK terima/simpan: koin, item, inventaris, save game, uid/email (tidak pernah dikirim ke pemain lain).
// =========================================================
(function (root) {
"use strict";
const P = (typeof module !== "undefined" && module.exports) ? require("./proto.js") : root.NW.MPProto;
const { F } = P;

class Bucket { // ember token sederhana
  constructor(rate, burst, now) { this.rate = rate; this.burst = burst; this.tokens = burst; this.t = now; }
  take(now, n = 1) { this.tokens = Math.min(this.burst, this.tokens + ((now - this.t) / 1000) * this.rate); this.t = now; if (this.tokens >= n) { this.tokens -= n; return true; } return false; }
}

class Room {
  // io = { send(connId, obj), close(connId, code, reason), now() }
  constructor(opts) {
    this.id = opts.id || "muara-1"; this.cap = opts.cap || P.ROOM_CAP; this.io = opts.io;
    // kind "house" = ruang rumah teman (Kunjungi Rumah Teman): peta kecil, peran pemilik/tamu ditetapkan SERVER (pintu masuk), bendera IN, pemilik bisa mengeluarkan tamu
    this.kind = opts.kind === "house" ? "house" : "world"; this.house = this.kind === "house";
    this.mapW = opts.mapW || (this.house ? P.HOUSE.MAP_W : P.MAP_W); this.mapH = opts.mapH || (this.house ? P.HOUSE.MAP_H : P.MAP_H);
    this.fMask = this.house ? 31 : 15;
    this.players = new Map();          // connId → pemain
    this.byUid = new Map();            // uid → connId (satu sesi per akun; uid TIDAK pernah dikirim ke klien)
    this.seq = 0; this.nextId = 1; this.violations = new Map();
  }
  now() { return this.io.now(); }
  count() { let n = 0; for (const p of this.players.values()) if (p.vis) n++; return n; }
  size() { return this.players.size; }
  full() { return this.players.size >= this.cap; }
  hasDirty() { for (const p of this.players.values()) if (p.dirty || (p.pend && p.pend.size)) return true; return false; }

  pub(p) { const r = [p.pid, p.name, p.rank, p.rod, P.qz(p.x), P.qz(p.y), p.d, p.f]; if (this.house) r.push(p.role === "owner" ? 1 : 0, p.hid || ""); return r; }
  send(c, o) { try { this.io.send(c, o); } catch (e) { /* koneksi sudah mati: dibersihkan lewat leave() */ } }
  bcast(o, exceptConn) { for (const [c, p] of this.players) if (c !== exceptConn && p.vis) this.send(c, o); }

  // ---- masuk ----
  join(conn, uid, profile, startPos, extra) {
    const now = this.now();
    if (this.byUid.has(uid)) { const old = this.byUid.get(uid); this.kick(old, 4002, "Akunmu masuk dari perangkat lain."); }
    if (this.players.size >= this.cap) return { ok: false, reason: "full" };
    const pid = "p" + (this.nextId++).toString(36);
    const prof = profile || {};
    const x = Number.isFinite(startPos && startPos.x) ? startPos.x : 19.5, y = Number.isFinite(startPos && startPos.y) ? startPos.y : 20.6;
    const p = { conn, uid, pid, name: P.cleanName(prof.n, "Nelayan-" + pid.slice(1)), rank: P.clampInt(prof.r, 0, 8, 0), rod: P.clampInt(prof.rd, 0, 9, 0),
      x: Math.max(0, Math.min(this.mapW, x)), y: Math.max(0, Math.min(this.mapH, y)), d: 2, f: 0, vis: false, role: (extra && extra.role) === "owner" ? "owner" : "visitor", hid: String((extra && extra.hid) || "").slice(0, 8), bKick: new Bucket(0.2, 3, now), dirty: false, last: now, lastMove: now, lastTp: 0,
      lo: false, tickN: 0, bMove: new Bucket(10, 14, now), bChat: new Bucket(0.5, 3, now), bEmote: new Bucket(1, 2, now), bProf: new Bucket(0.2, 2, now), bAny: new Bucket(25, 40, now), lastChat: "", viol: 0 };
    this.players.set(conn, p); this.byUid.set(uid, conn);
    return { ok: true, pid };
  }
  // dipanggil setelah klien mengirim 'hello' (profil + posisi awal) → pemain tampak oleh yang lain
  hello(conn, m) {
    const p = this.players.get(conn); if (!p) return;
    p.name = P.cleanName(m.n, p.name); p.rank = P.clampInt(m.r, 0, 8, 0); p.rod = P.clampInt(m.rd, 0, 9, 0);
    const x = Number(m.x) / P.Q, y = Number(m.y) / P.Q;
    if (Number.isFinite(x) && Number.isFinite(y)) { p.x = Math.max(0, Math.min(this.mapW, x)); p.y = Math.max(0, Math.min(this.mapH, y)); }
    p.d = P.clampInt(m.d, 0, 7, 2); p.f = P.clampInt(m.f, 0, 7 | (this.house ? F.IN : 0), 0) & ~F.TP; p.lastMove = this.now();
    this.show(conn);
  }
  show(conn) {
    const p = this.players.get(conn); if (!p) return;
    const was = p.vis; p.vis = true; p.dirty = false;
    const list = []; for (const [c, q] of this.players) if (c !== conn && q.vis) list.push(this.pub(q));
    const w = { t: "w", me: p.pid, room: this.id, n: this.count(), cap: this.cap, ps: list, hz: Math.round(1000 / P.TICK_MS) };
    if (this.house) { w.k = "house"; w.own = p.role === "owner" ? 1 : 0; }
    this.send(conn, w);
    if (!was) this.bcast({ t: "j", p: this.pub(p) }, conn);
  }
  hide(conn) { const p = this.players.get(conn); if (p && p.vis) { p.vis = false; this.bcast({ t: "l", id: p.pid }, conn); } }

  leave(conn) {
    const p = this.players.get(conn); if (!p) return;
    this.players.delete(conn); if (this.byUid.get(p.uid) === conn) this.byUid.delete(p.uid);
    if (p.vis) this.bcast({ t: "l", id: p.pid }, conn);
  }
  kick(conn, code, reason) {
    this.send(conn, { t: "x", r: reason });
    try { this.io.close(conn, code, reason); } catch (e) {}
    this.leave(conn);
  }
  strike(conn, p) { if (++p.viol > 200) this.kick(conn, 4005, "Terlalu banyak pesan tidak sah."); }

  // ---- pesan dari klien (string JSON) ----
  message(conn, raw) {
    const p = this.players.get(conn); if (!p) return;
    const now = this.now();
    if (typeof raw !== "string" || raw.length > 600) return this.strike(conn, p);
    if (!p.bAny.take(now)) return this.strike(conn, p);
    let m; try { m = JSON.parse(raw); } catch (e) { return this.strike(conn, p); }
    if (!m || typeof m !== "object") return this.strike(conn, p);
    p.last = now;
    switch (m.t) {
      case "hello": return this.hello(conn, m);                    // profil + posisi awal → tampak oleh pemain lain
      case "h": return;                                            // heartbeat
      case "o": p.lo = !!m.lo; return;                              // mode hemat data: siaran lebih jarang
      case "v": return m.on ? (p.vis ? undefined : this.show(conn)) : this.hide(conn);
      case "p": { // perbarui profil (nama/gelar/joran), jarang saja
        if (!p.bProf.take(now)) return;
        const nn = P.cleanName(m.n, p.name), ch = nn !== p.name || p.rank !== P.clampInt(m.r, 0, 8, p.rank) || p.rod !== P.clampInt(m.rd, 0, 9, p.rod);
        p.name = nn; p.rank = P.clampInt(m.r, 0, 8, p.rank); p.rod = P.clampInt(m.rd, 0, 9, p.rod);
        if (ch && p.vis) { this.bcast({ t: "j", p: this.pub(p) }, conn); }
        return;
      }
      case "m": return this.move(conn, p, m, now);
      case "k": return this.house ? this.ejectMsg(conn, p, m, now) : this.strike(conn, p);
      case "c": {
        if (!p.vis) return;
        if (!p.bChat.take(now)) { this.send(conn, { t: "n", r: "Pelan-pelan ya, chat-mu terlalu cepat." }); return; }
        const text = P.cleanChat(m.m); if (!text || /^(\*|\s)+$/.test(text)) return;
        if (text === p.lastChat) return;                           // tanpa spam pesan sama berturut-turut
        p.lastChat = text;
        this.send(conn, { t: "c", id: p.pid, m: text });           // gema ke pengirim: yang dia lihat = yang orang lain lihat
        this.bcast({ t: "c", id: p.pid, m: text }, conn);
        return;
      }
      case "e": {
        if (!p.vis || !p.bEmote.take(now)) return;
        const i = m.i; if (!Number.isInteger(i) || i < 0 || i >= P.EMOTES.length) return;
        this.send(conn, { t: "e", id: p.pid, i }); this.bcast({ t: "e", id: p.pid, i }, conn); return;
      }
      default: return this.strike(conn, p);
    }
  }
  move(conn, p, m, now) {
    if (!p.bMove.take(now)) return;                                 // kelebihan pesan posisi dibuang diam-diam
    let x = Number(m.x), y = Number(m.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return this.strike(conn, p);
    x /= P.Q; y /= P.Q;
    x = Math.max(0, Math.min(this.mapW, x)); y = Math.max(0, Math.min(this.mapH, y));
    const d = P.clampInt(m.d, 0, 7, p.d); let f = P.clampInt(m.f, 0, this.fMask, 0);
    const dt = Math.max(0.1, Math.min(2.5, (now - p.lastMove) / 1000)), dist = Math.hypot(x - p.x, y - p.y), lim = P.MAX_SPEED * dt + 0.5;
    const door = this.house && ((f ^ p.f) & F.IN);                  // lewat pintu rumah (halaman ↔ dalam): koordinat berganti ruang, lompatan sah
    if (dist > lim && !door) {
      if ((f & F.TP) && now - p.lastTp > 5000) p.lastTp = now;     // lompatan sah (mis. kembali dari rumah), dibatasi 1× / 5 detik
      else { const k = lim / dist; x = p.x + (x - p.x) * k; y = p.y + (y - p.y) * k; }   // ditahan: tidak bisa teleport/speedhack
    }
    f &= ~F.TP;
    if (x === p.x && y === p.y && d === p.d && f === p.f) { p.lastMove = now; return; }
    p.x = x; p.y = y; p.d = d; p.f = f; p.lastMove = now; p.dirty = true;
  }

  // pemilik rumah mengeluarkan tamu (id = id pemain di ruang ini, atau "*" = semua tamu). Hanya peran pemilik yang ditetapkan SERVER; tamu mengirim "k" = diabaikan.
  ejectMsg(conn, p, m, now) {
    if (p.role !== "owner") return this.strike(conn, p);
    if (!p.bKick.take(now)) return;
    const id = String(m.id || "");
    for (const [c, q] of [...this.players]) {
      if (c === conn || q.role === "owner") continue;
      if (id !== "*" && q.pid !== id) continue;
      if (this.io.onEject && !m.soft) { try { this.io.onEject(q); } catch (e) {} }   // soft = pemilik mengganti privasi: tamu dikeluarkan tanpa larangan 1 jam
      this.kick(c, P.HOUSE.KICK_CODE, "Pemilik rumah mengeluarkanmu.");
    }
  }

  // ---- siaran berkala (dipanggil oleh alarm/timer pembungkus) ----
  // Mengirim hanya pemain yang BERUBAH sejak siaran terakhir. Penerima "hemat data" menerima gabungan tiap 3 siaran, dan sisa
  // yang tertunda dikirim begitu gerakan berhenti (posisi akhir selalu sampai). Mengembalikan true bila masih ada gerakan.
  tick() {
    const dirty = []; for (const p of this.players.values()) if (p.vis && p.dirty) dirty.push(p);
    let pending = false; for (const p of this.players.values()) if (p.pend && p.pend.size) pending = true;
    if (!dirty.length && !pending) return false;
    if (dirty.length) this.seq++;
    for (const [c, me] of this.players) {
      if (!me.vis) continue;
      const rows = dirty.filter((p) => p !== me).map((p) => [p.pid, P.qz(p.x), P.qz(p.y), p.d, p.f]);
      if (!me.lo) { if (rows.length) this.send(c, { t: "s", q: this.seq, u: rows }); continue; }
      me.pend = me.pend || new Map(); for (const r of rows) me.pend.set(r[0], r);
      me.tickN = (me.tickN || 0) + (dirty.length ? 1 : 0);
      if (me.pend.size && (!dirty.length || me.tickN % 3 === 0)) { this.send(c, { t: "s", q: this.seq, u: [...me.pend.values()] }); me.pend.clear(); }
    }
    for (const p of dirty) p.dirty = false;
    return dirty.length > 0;
  }
  // buang pemain yang tak memberi kabar > TIMEOUT. Mengembalikan jumlah yang dibuang.
  sweep() {
    const now = this.now(); let n = 0;
    for (const [c, p] of [...this.players]) if (now - p.last > P.TIMEOUT_MS) { this.kick(c, 4003, "Terputus (tidak ada kabar)."); n++; }
    return n;
  }

  // ---- pemulihan setelah Durable Object hibernasi ----
  snapshot(conn) { const p = this.players.get(conn); if (!p) return null; const s = { pid: p.pid, uid: p.uid, n: p.name, r: p.rank, rd: p.rod, x: p.x, y: p.y, d: p.d, f: p.f, v: p.vis ? 1 : 0, l: p.last, lo: p.lo ? 1 : 0 }; if (this.house) { s.ro = p.role; s.h = p.hid; } return s; }
  restore(conn, s) {
    const now = this.now();
    const r = this.join(conn, s.uid, { n: s.n, r: s.r, rd: s.rd }, { x: s.x, y: s.y }, { role: s.ro, hid: s.h }); if (!r.ok) return r;
    const p = this.players.get(conn); p.pid = s.pid; p.d = s.d; p.f = s.f; p.vis = !!s.v; p.last = Math.max(s.l || 0, now - 1000); p.lo = !!s.lo;
    const n = parseInt(String(s.pid).slice(1), 36); if (Number.isFinite(n) && n >= this.nextId) this.nextId = n + 1;
    return r;
  }
}

const API = { Room, Bucket };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.MPRoom = API; }
})(typeof window !== "undefined" ? window : globalThis);
