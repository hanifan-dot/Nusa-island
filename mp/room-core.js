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
    this.boat = opts.boat === true; this.boats = new Map(); this.nextBoat = 1; this.holds = new Map(); this.lastBt = 0; this.boatDirty = false; this.btN = 0;   // Kapal Rombongan: bawaan MATI
    this.seq = 0; this.nextId = 1; this.violations = new Map(); this.countDirty = false;
  }
  now() { return this.io.now(); }
  count() { let n = 0; for (const p of this.players.values()) if (p.vis && !p.off) n++; return n; }
  size() { return this.players.size; }
  full() { return this.players.size >= this.cap; }
  hasDirty() { if (this.countDirty || this.boatDirty || this.boatsMoving()) return true; for (const p of this.players.values()) if (p.dirty || (p.pend && p.pend.size)) return true; return false; }
  number() { return parseInt(String(this.id).split("-")[1], 10) || 1; }
  uids() { return [...this.byUid.keys()]; }

  pub(p) { const r = [p.pid, p.name, p.rank, p.rod, P.qz(p.x), P.qz(p.y), p.d, p.f, p.hold ? [p.hold.i, p.hold.w, p.hold.v] : 0]; if (this.house) r.push(p.role === "owner" ? 1 : 0, p.hid || ""); else if (p.hid) r.push(0, p.hid); return r; }   // ID publik pemain (hash satu arah, tanpa uid) — dipakai daftar online & undangan rumah
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
    const p = { conn, uid, pid, name: P.cleanName(prof.n, "Nelayan-" + pid.slice(1)), rank: P.clampInt(prof.r, 0, 8, 0), rod: P.clampInt(prof.rd, 0, 19, 0),
      x: Math.max(0, Math.min(this.mapW, x)), y: Math.max(0, Math.min(this.mapH, y)), d: 2, f: 0, vis: false, role: (extra && extra.role) === "owner" ? "owner" : "visitor", hid: String((extra && extra.hid) || "").slice(0, 8), bKick: new Bucket(0.2, 3, now), dirty: false, last: now, lastMove: now, lastTp: 0,
      lo: false, tickN: 0, bMove: new Bucket(10, 14, now), bChat: new Bucket(0.5, 3, now), bEmote: new Bucket(1, 2, now), bProf: new Bucket(0.2, 2, now), bAny: new Bucket(25, 40, now), bHold: new Bucket(1, 4, now), bOutfit: new Bucket(0.5, 3, now), outfit: "", hold: null, lastChat: "", viol: 0 };
    this.players.set(conn, p); this.byUid.set(uid, conn); this.countDirty = true;
    return { ok: true, pid };
  }
  // dipanggil setelah klien mengirim 'hello' (profil + posisi awal) → pemain tampak oleh yang lain
  hello(conn, m) {
    const p = this.players.get(conn); if (!p) return;
    p.name = P.cleanName(m.n, p.name); p.rank = P.clampInt(m.r, 0, 8, 0); p.rod = P.clampInt(m.rd, 0, 19, 0);
    const x = Number(m.x) / P.Q, y = Number(m.y) / P.Q;
    if (Number.isFinite(x) && Number.isFinite(y)) { p.x = Math.max(0, Math.min(this.mapW, x)); p.y = Math.max(0, Math.min(this.mapH, y)); }
    p.d = P.clampInt(m.d, 0, 7, 2); p.f = P.clampInt(m.f, 0, 7 | (this.house ? F.IN : 0), 0) & ~F.TP; p.lastMove = this.now();
    this.show(conn);
  }
  show(conn) {
    const p = this.players.get(conn); if (!p) return;
    const was = p.vis; p.vis = true; p.dirty = false;
    this.resume(conn, p);
    const list = []; for (const [c, q] of this.players) if (c !== conn && q.vis && !q.off) list.push(this.pub(q));
    const w = { t: "w", me: p.pid, room: this.id, rn: this.number(), n: this.size(), v: this.count(), cap: this.cap, ps: list, hz: Math.round(1000 / P.TICK_MS), st: this.now() };
    if (this.house) { w.k = "house"; w.own = p.role === "owner" ? 1 : 0; }
    if (this.boat) { w.bo = 1; w.bs = this.boatRows(p); if (p.boat) w.mb = [p.boat.id, p.boat.s]; }   // bo = server mendukung kapal; bs = kapal terlihat; mb = kapalku (setelah reconnect)
    const ou = {}; let nou = 0; for (const [c, q] of this.players) if (c !== conn && q.vis && !q.off && q.outfit) { ou[q.pid] = q.outfit; nou++; } if (nou) w.ou = ou;     // penampilan pemain yang sudah ada (tambahan; klien lama mengabaikan)
    this.send(conn, w);
    if (!was && !p.off) { this.bcast({ t: "j", p: this.pub(p) }, conn); this.countDirty = true; if (p.outfit) this.bcast({ t: "a", id: p.pid, o: p.outfit }, conn); }
  }
  hide(conn) { const p = this.players.get(conn); if (p && p.vis) { p.vis = false; p.hold = null; p.outfit = ""; this.bcast({ t: "l", id: p.pid }, conn); this.countDirty = true; } }

  leave(conn) {
    const p = this.players.get(conn); if (!p) return;
    if (p.boat) this.dropAboard(p);
    this.players.delete(conn); if (this.byUid.get(p.uid) === conn) this.byUid.delete(p.uid); this.countDirty = true;
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
      case "h": this.send(conn, { t: "k", st: now }); return;       // heartbeat + jam server (untuk sinkron siang/malam; klien tidak memakai jam HP)
      case "f": {                                                  // pamer ikan: HANYA status tampilan (spesies, berat, varian)
        if (!p.vis) return;
        const h = m.i == null ? null : P.cleanHold(m);
        if (m.i != null && !h) return this.strike(conn, p);
        if (JSON.stringify(h) === JSON.stringify(p.hold)) return;      // sama dengan status sekarang: abaikan tanpa memakai jatah
        if (!p.bHold.take(now)) return;
        p.hold = h; this.bcast({ t: "f", id: p.pid, h: h ? [h.i, h.w, h.v] : 0 }, conn); return;
      }
      case "a": {                                                  // penampilan avatar (kosmetik): kode pendek berisi ID item; tanpa gambar
        if (!p.vis) return;
        const o = P.cleanOutfit(m.o); if (o === null) return this.strike(conn, p);
        if (o === p.outfit) return;
        if (!p.bOutfit.take(now)) return;
        p.outfit = o; this.bcast({ t: "a", id: p.pid, o }, conn); return;
      }
      case "o": p.lo = !!m.lo; return;                              // mode hemat data: siaran lebih jarang
      case "v": return m.on ? (p.vis ? undefined : this.show(conn)) : this.hide(conn);
      case "p": { // perbarui profil (nama/gelar/joran), jarang saja
        if (!p.bProf.take(now)) return;
        const nn = P.cleanName(m.n, p.name), ch = nn !== p.name || p.rank !== P.clampInt(m.r, 0, 8, p.rank) || p.rod !== P.clampInt(m.rd, 0, 19, p.rod);
        p.name = nn; p.rank = P.clampInt(m.r, 0, 8, p.rank); p.rod = P.clampInt(m.rd, 0, 19, p.rod);
        if (ch && p.vis) { this.bcast({ t: "j", p: this.pub(p) }, conn); }
        return;
      }
      case "bt": return this.boatMsg(conn, p, m, now);
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
    if (p.boat) return;                                              // di atas kapal: posisi mengikuti kapal (server), gerak sendiri diabaikan
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
    if (this.countDirty) { this.countDirty = false; const n = this.size(), v = this.count(); for (const c of this.players.keys()) this.send(c, { t: "cnt", n, v }); }   // jumlah tersambung nyata (server yang menghitung)
    const bmore = this.tickBoats();
    const dirty = []; for (const p of this.players.values()) if (p.vis && p.dirty && !p.off) dirty.push(p);
    let pending = false; for (const p of this.players.values()) if (p.pend && p.pend.size) pending = true;
    if (!dirty.length && !pending) return bmore;
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
    return dirty.length > 0 || bmore;
  }
  // buang pemain yang tak memberi kabar > TIMEOUT. Mengembalikan jumlah yang dibuang.
  sweep() {
    const now = this.now(); let n = 0; this.expireHolds(now);
    for (const [c, p] of [...this.players]) if (now - p.last > P.TIMEOUT_MS) { this.kick(c, 4003, "Terputus (tidak ada kabar)."); n++; }
    return n;
  }


  // =====================================================================================================================
  //  KAPAL ROMBONGAN (Fase A). Server memegang: entitas kapal, 3 kursi (0 kapten, 1–2 penumpang), kecepatan, jangkar, area, waktu.
  //  Klien hanya mengirim NIAT (buat/naik/turun/arah+gas/jangkar/pergi); posisi & kecepatan dihitung di sini (tidak dipercaya dari klien).
  //  Tanpa D1/Firestore: seluruh keadaan di memori ruang (+ penyimpanan DO hanya saat perubahan struktur, bukan per frame).
  //  uid TIDAK pernah dikirim; kursi memuat id publik pemain (pid) saja. Baris kapal: [id, x, y, arah, kecepatan×10, bendera(1 jangkar|2 pergi), kursi0, kursi1, kursi2].
  // =====================================================================================================================
  bn(conn, r) { this.send(conn, { t: "bn", r }); }
  connOfPid(pid) { for (const [c, q] of this.players) if (q.pid === pid) return c; return null; }
  playerOfPid(pid) { for (const q of this.players.values()) if (q.pid === pid) return q; return null; }
  boatRow(b) { return [b.id, P.qz(b.x), P.qz(b.y), b.d, Math.round(b.v * 10), (b.anchor ? 1 : 0) | (b.away ? 2 : 0), b.seats[0] || 0, b.seats[1] || 0, b.seats[2] || 0]; }
  boatRows(viewer) { const out = []; for (const b of this.boats.values()) if (!b.away || (viewer && viewer.boat && viewer.boat.id === b.id)) out.push(this.boatRow(b)); return out; }
  crewOf(b) { const out = []; for (const pid of b.seats) { if (!pid) continue; const q = this.playerOfPid(pid); if (q) out.push(q); } return out; }
  boatsMoving() { for (const b of this.boats.values()) if (!b.away && (b.v > 0 || (!b.anchor && P.BOAT.SPD[b.th] > 0))) return true; return false; }
  bcastBoat(o, only) { for (const [c, q] of this.players) if ((q.vis || q.boat) && (!only || only(q))) this.send(c, o); }   // awak selalu menerima kabar kapalnya
  boardable(b) { return !b.away && b.anchor && b.v < 0.05; }
  placeAboard(p, b, seat) { b.seats[seat] = p.pid; p.boat = { id: b.id, s: seat }; p.x = b.x; p.y = b.y; p.d = b.d; p.f = P.F.SIT; p.dirty = true; this.holds.delete(p.uid); this.boatDirty = true; }
  // keluarkan pemain dari kursinya. toDock = diturunkan di dermaga (pergi lewat 'leave'); false = koneksi putus (kursi DITAHAN GRACE_MS untuk reconnect)
  vacate(p, toDock) {
    const b = this.boats.get(p.boat.id), seat = p.boat.s; p.boat = null;
    if (!b) return;
    if (toDock) { b.seats[seat] = null; p.x = P.BOAT.LAND[0]; p.y = P.BOAT.LAND[1]; p.f = 0; p.d = 2; p.dirty = true; if (p.off) { p.off = false; this.rejoinView(p); } }
    else { this.holds.set(p.uid, { b: b.id, s: seat, until: this.now() + P.BOAT.GRACE_MS }); b.hold = b.hold || {}; b.hold[seat] = p.uid; if (seat === 0) { b.anchor = true; b.th = 0; } }   // kapten putus: kapal berhenti & jangkar turun
    this.afterSeat(b, seat, p.pid);
  }
  dropAboard(p) { this.vacate(p, false); }
  afterSeat(b, seat, pid) {
    this.boatDirty = true;
    if (seat === 0) this.promote(b);
    if (!this.boats.has(b.id)) return;
    this.bcastBoat({ t: "bv", ev: "leave", b: b.id, p: pid, s: seat });
    this.bcastBoat({ t: "bs", q: ++this.seq, u: [this.boatRow(b)] });
    this.tidy(b);
  }
  // kapten pergi → penumpang terhubung berkursi terkecil jadi kapten; kapal berhenti & jangkar turun demi keamanan
  promote(b) {
    const held = (i) => b.hold && b.hold[i];
    const next = [1, 2].find((i) => b.seats[i] && !held(i));
    if (!b.seats[0] || held(0)) {
      if (next === undefined) return;
      b.seats[0] = b.seats[next]; b.seats[next] = null; const q = this.playerOfPid(b.seats[0]); if (q && q.boat) q.boat.s = 0; b.anchor = true; b.th = 0;
      if (held(0)) { const u = b.hold[0]; delete b.hold[0]; b.hold[next] = u; const h = this.holds.get(u); if (h) h.s = next; }   // kapten lama yang kembali nanti duduk sebagai penumpang di kursi yang dikosongkan
      this.bcastBoat({ t: "bv", ev: "cap", b: b.id, p: b.seats[0] });
    }
  }
  // kapal tanpa kru terhubung dan tanpa kursi tertahan → bubar
  tidy(b) {
    if (!this.boats.has(b.id)) return;
    const connected = b.seats.some((pid, i) => pid && !(b.hold && b.hold[i])), held = b.hold && Object.keys(b.hold).length;
    if (connected || held) return;
    this.boats.delete(b.id); this.boatDirty = true; this.bcastBoat({ t: "bd", id: b.id });
  }
  expireHolds(now) {
    for (const [uid, h] of [...this.holds]) {
      if (h.until > now) continue;
      this.holds.delete(uid); const b = this.boats.get(h.b); if (!b) continue;
      const pid = b.seats[h.s]; b.seats[h.s] = null; if (b.hold) delete b.hold[h.s];
      if (h.s === 0) { b.anchor = true; b.th = 0; }
      this.afterSeat(b, h.s, pid);
    }
  }
  // dipanggil saat pemain tampak (hello/show): pemain yang kembali dalam masa tunggu menempati kursinya lagi (pid baru, kursi sama)
  resume(conn, p) {
    if (!this.boat || p.boat) return;
    const h = this.holds.get(p.uid); if (!h) return;
    const b = this.boats.get(h.b); this.holds.delete(p.uid);
    if (b && b.hold) delete b.hold[h.s];
    if (!b || h.until < this.now() || (b.seats[h.s] && this.playerOfPid(b.seats[h.s]))) { if (b) { b.seats[h.s] = b.seats[h.s] && this.playerOfPid(b.seats[h.s]) ? b.seats[h.s] : null; this.afterSeat(b, h.s, null); } return; }
    b.seats[h.s] = p.pid; p.boat = { id: b.id, s: h.s }; p.x = b.x; p.y = b.y; p.d = b.d; p.f = P.F.SIT; p.off = !!b.away; this.boatDirty = true;
    this.bcastBoat({ t: "bs", q: ++this.seq, u: [this.boatRow(b)] });
  }
  rejoinView(p) { this.bcast({ t: "j", p: this.pub(p) }, this.connOfPid(p.pid)); if (p.outfit) this.bcast({ t: "a", id: p.pid, o: p.outfit }, this.connOfPid(p.pid)); }
  boatMsg(conn, p, m, now) {
    if (!this.boat) return this.bn(conn, "off");
    if (!p.bBoat) p.bBoat = new Bucket(6, 12, now);
    if (!p.bBoat.take(now)) return;
    const c = P.cleanBoat(m); if (!c) return this.strike(conn, p);
    if (!p.vis) return this.bn(conn, "hidden");
    this.expireHolds(now);
    const mine = p.boat ? this.boats.get(p.boat.id) : null;
    switch (c.a) {
      case "new": {
        if (p.boat) return this.bn(conn, "aboard");
        if (this.boats.size >= P.BOAT.MAX_BOATS) return this.bn(conn, "full");
        const used = new Set([...this.boats.values()].map((x) => x.slot)); let slot = 0; while (used.has(slot)) slot++;
        const [sx, sy] = P.BOAT.SLOTS[slot]; if (Math.hypot(p.x - sx, p.y - sy) > P.BOAT.BOARD_R + 6) return this.bn(conn, "far");
        const b = { id: "b" + (this.nextBoat++).toString(36), x: sx, y: sy, d: 0, th: 0, v: 0, anchor: true, seats: [null, null, null], hold: {}, away: false, area: P.BOAT.HOME, awayAt: 0, slot };
        this.boats.set(b.id, b); this.placeAboard(p, b, 0);
        this.bcastBoat({ t: "bs", q: ++this.seq, u: [this.boatRow(b)] }); this.bcastBoat({ t: "bv", ev: "board", b: b.id, p: p.pid, s: 0 }); return;
      }
      case "join": {
        if (p.boat) return this.bn(conn, "aboard");
        const b = this.boats.get(c.b); if (!b) return this.bn(conn, "none");
        if (!this.boardable(b)) return this.bn(conn, b.away ? "away" : "moving");
        if (b.seats[c.s] || (b.hold && b.hold[c.s])) return this.bn(conn, "seat");          // dua pemain, satu kursi: yang pertama diproses server menang
        if (Math.hypot(p.x - b.x, p.y - b.y) > P.BOAT.BOARD_R) return this.bn(conn, "far");
        this.placeAboard(p, b, c.s);
        this.bcastBoat({ t: "bs", q: ++this.seq, u: [this.boatRow(b)] }); this.bcastBoat({ t: "bv", ev: "board", b: b.id, p: p.pid, s: c.s }); return;
      }
      case "leave": {
        if (!mine) return this.bn(conn, "none");
        if (!this.boardable(mine)) return this.bn(conn, mine.away ? "away" : "moving");        // turun hanya saat jangkar turun & kapal berhenti
        this.vacate(p, true); return;
      }
      case "steer": {
        if (!mine || p.boat.s !== 0) return this.bn(conn, "captain");
        if (mine.away) return this.bn(conn, "away");
        if (mine.anchor) return this.bn(conn, "anchor");
        mine.d = c.d; mine.th = c.th; this.boatDirty = true; return;
      }
      case "anchor": {
        if (!mine || p.boat.s !== 0) return this.bn(conn, "captain");
        if (mine.away) return this.bn(conn, "away");
        mine.anchor = c.on; if (c.on) mine.th = 0; this.boatDirty = true; this.bcastBoat({ t: "bs", q: ++this.seq, u: [this.boatRow(mine)] }); return;
      }
      case "go": return this.boatGo(conn, p, mine, c, now);
    }
  }
  // pindah area: kapten saja, jangkar turun & kapal berhenti. Ruang ini hanya Muara: keluar dari Muara = kapal & kru HILANG dari pandangan pemain Muara (kru tetap duduk, tidak ikut dihapus);
  // kembali ke Muara baru boleh ≥ MIN_AWAY_MS (jam server) dan muncul di tambatan dengan animasi tiba.
  boatGo(conn, p, b, c, now) {
    if (!b || p.boat.s !== 0) return this.bn(conn, "captain");
    if (!b.anchor || b.v >= 0.05) return this.bn(conn, "moving");
    const home = P.BOAT.HOME;
    if (!b.away && c.ar !== home) {
      b.away = true; b.area = c.ar; b.awayAt = now; b.v = 0; this.boatDirty = true;
      const crew = this.crewOf(b); for (const q of crew) { q.off = true; this.bcastBoat({ t: "l", id: q.pid }, (r) => !r.boat || r.boat.id !== b.id); }   // kru hilang dari pandangan non-kru; antar-kru tetap saling tahu
      this.bcastBoat({ t: "bv", ev: "depart", b: b.id, ar: c.ar }); this.bcastBoat({ t: "bd", id: b.id }, (q) => !q.boat || q.boat.id !== b.id);
      for (const q of crew) this.send(this.connOfPid(q.pid), { t: "bs", q: ++this.seq, u: [this.boatRow(b)] });
      return;
    }
    if (b.away && c.ar === home) {
      if (now - b.awayAt < P.BOAT.MIN_AWAY_MS) return this.bn(conn, "early");
      b.away = false; b.area = home; const [sx, sy] = P.BOAT.SLOTS[b.slot]; b.x = sx; b.y = sy; b.d = 0; b.v = 0; b.anchor = true; this.boatDirty = true;
      const crew = this.crewOf(b); for (const q of crew) { q.off = false; q.x = b.x; q.y = b.y; q.d = b.d; q.dirty = true; this.rejoinView(q); }
      this.bcastBoat({ t: "bv", ev: "arrive", b: b.id, ar: home }); this.bcastBoat({ t: "bs", q: ++this.seq, u: [this.boatRow(b)] }); return;
    }
    if (b.away) { b.area = c.ar; this.bcastBoat({ t: "bv", ev: "area", b: b.id, ar: c.ar }, (q) => q.boat && q.boat.id === b.id); return; }   // dari area jauh ke area jauh lain
    this.bn(conn, "same");
  }
  // simulasi kapal (dipanggil tick ~5 Hz, waktu SERVER). Mengembalikan true bila masih ada gerak.
  tickBoats() {
    if (!this.boat || !this.boats.size) { this.boatDirty = false; return false; }
    const now = this.now(), dt = this.lastBt ? Math.max(0.05, Math.min(0.5, (now - this.lastBt) / 1000)) : 0.2; this.lastBt = now;
    const rows = []; let more = false;
    for (const b of this.boats.values()) {
      if (b.away) continue;
      const tgt = b.anchor ? 0 : P.BOAT.SPD[b.th], ov = b.v, ox = b.x, oy = b.y;
      b.v = b.v < tgt ? Math.min(tgt, b.v + P.BOAT.ACC * dt) : Math.max(tgt, b.v - P.BOAT.ACC * dt);
      if (b.v > 0) {
        const L = P.BOAT.LANE, [vx, vy] = P.BOAT.DIRV[b.d]; let nx = b.x + vx * b.v * dt, ny = b.y + vy * b.v * dt;
        if (nx < L.x0 || nx > L.x1 || ny < L.y0 || ny > L.y1) { nx = Math.max(L.x0, Math.min(L.x1, nx)); ny = Math.max(L.y0, Math.min(L.y1, ny)); b.v = 0; b.th = 0; }   // batas jalur air: berhenti, tidak menembus
        b.x = nx; b.y = ny;
      }
      if (b.v !== ov || b.x !== ox || b.y !== oy || this.boatDirty) rows.push(this.boatRow(b));
      if (b.v > 0 || (!b.anchor && tgt > 0)) more = true;
      if (b.v !== ov || b.x !== ox || b.y !== oy) for (const q of this.crewOf(b)) { q.x = b.x; q.y = b.y; q.d = b.d; q.dirty = true; }
    }
    this.boatDirty = false;
    if (rows.length) { this.btN++; const lo = this.btN % 3 === 0 || !more; for (const [c, q] of this.players) if (q.vis && (!q.lo || lo)) this.send(c, { t: "bs", q: ++this.seq, u: rows }); }
    return more;
  }
  boatsSnapshot() { return [...this.boats.values()].map((b) => ({ id: b.id, x: b.x, y: b.y, d: b.d, sl: b.slot, se: b.seats, aw: b.away ? 1 : 0, ar: b.area, at: b.awayAt, hd: b.hold || {} })); }
  restoreBoats(arr) {
    if (!this.boat || !Array.isArray(arr)) return;
    for (const s of arr) { if (!s || typeof s.id !== "string" || this.boats.has(s.id)) continue; const n = parseInt(s.id.slice(1), 36); if (Number.isFinite(n) && n >= this.nextBoat) this.nextBoat = n + 1;
      this.boats.set(s.id, { id: s.id, x: s.x, y: s.y, d: s.d | 0, th: 0, v: 0, anchor: true, seats: Array.isArray(s.se) ? s.se.slice(0, 3) : [null, null, null], hold: s.hd || {}, away: !!s.aw, area: s.ar || P.BOAT.HOME, awayAt: s.at || 0, slot: s.sl | 0 });
      for (const [seat, uid] of Object.entries(s.hd || {})) this.holds.set(uid, { b: s.id, s: Number(seat), until: this.now() + P.BOAT.GRACE_MS }); }
  }

  // ---- pemulihan setelah Durable Object hibernasi ----
  snapshot(conn) { const p = this.players.get(conn); if (!p) return null; const s = { pid: p.pid, uid: p.uid, n: p.name, r: p.rank, rd: p.rod, x: p.x, y: p.y, d: p.d, f: p.f, v: p.vis ? 1 : 0, l: p.last, lo: p.lo ? 1 : 0, hd: p.hold || null, oc: p.outfit || "", bt: p.boat ? [p.boat.id, p.boat.s] : 0, of: p.off ? 1 : 0 }; if (this.house) s.ro = p.role; if (p.hid) s.h = p.hid; return s; }
  restore(conn, s) {
    const now = this.now();
    const r = this.join(conn, s.uid, { n: s.n, r: s.r, rd: s.rd }, { x: s.x, y: s.y }, { role: s.ro, hid: s.h }); if (!r.ok) return r;
    const p = this.players.get(conn); p.pid = s.pid; p.d = s.d; p.f = s.f; p.vis = !!s.v; p.last = Math.max(s.l || 0, now - 1000); p.lo = !!s.lo; p.hold = s.hd || null; p.outfit = typeof s.oc === "string" ? s.oc : ""; if (Array.isArray(s.bt) && this.boats.has(s.bt[0])) { p.boat = { id: s.bt[0], s: s.bt[1] }; p.off = !!s.of; }
    const n = parseInt(String(s.pid).slice(1), 36); if (Number.isFinite(n) && n >= this.nextId) this.nextId = n + 1;
    return r;
  }
}

const API = { Room, Bucket };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.MPRoom = API; }
})(typeof window !== "undefined" ? window : globalThis);
