// =========================================================
//  NUSA ISLAND — Tahap 4: PINTU MASUK (lobby) — logika murni, diuji di Node.
//  Tugas: (1) memilih instance Muara yang masih ada tempat dalam SATU permintaan (bukan menebak satu per satu),
//  (2) membatasi laju masuk per akun / per IP / global supaya satu orang tidak bisa menghabiskan kuota gratis harian,
//  (3) mengetahui akun yang sudah ada di instance lain agar sesi lamanya ditutup (tanpa "hantu" ganda).
//  Keadaan hanya di memori: bila Durable Object lobby tidur, hitungan hilang dan dipulihkan lewat 409 "penuh" + sync dari instance.
// =========================================================
(function (root) {
"use strict";
const P = (typeof module !== "undefined" && module.exports) ? require("./proto.js") : root.NW.MPProto;
const LIM = { perUid: 8, perIp: 30, global: 300, houseUid: 12, houseIp: 40, houseGlobal: 400, windowMs: 60000 };

class Lobby {
  constructor(opts) { this.lim = Object.assign({}, LIM, (opts && opts.lim) || {}); this.cap = (opts && opts.cap) || P.ROOM_CAP; this.max = (opts && opts.max) || P.MAX_ROOMS; this.now = (opts && opts.now) || (() => Date.now()); this.rnd = (opts && opts.rnd) || Math.random; this.occ = new Map(); this.lastRoom = new Map(); this.houses = new Map(); this.hits = { uid: new Map(), ip: new Map(), list: new Map(), all: [] }; }
  prune(arr, now) { while (arr.length && now - arr[0] > this.lim.windowMs) arr.shift(); return arr; }
  hit(map, key, limit, now) { if (!key) return true; const a = this.prune(map.get(key) || [], now); map.set(key, a); if (a.length >= limit) return false; a.push(now); return true; }
  where(uid, except) { for (const [k, s] of this.occ) if (k !== except && s.has(uid)) return k; return null; }
  parent(uid) {
    const live = this.where(uid); if (live != null) return live;
    const remembered = this.lastRoom.get(uid);
    if (!remembered || this.now() - remembered.at > 120000) { this.lastRoom.delete(uid); return null; }
    return remembered.room;
  }
  // Setiap rumah melaporkan seluruh penghuninya. TTL membuang catatan jika DO rumah terhenti.
  houseSync(house, rows) {
    if (!/^rumah-[A-Z2-9]{8}$/.test(house) || !Array.isArray(rows)) return;
    const users = new Map();
    for (const row of rows.slice(0, P.HOUSE.CAP)) {
      const room = P.roomId(row && row.room);
      if (row && typeof row.uid === "string" && room != null) users.set(row.uid, room);
    }
    if (users.size) { this.houses.set(house, { users, at: this.now() }); for (const [uid, room] of users) this.lastRoom.set(uid, { room, at: this.now() }); } else this.houses.delete(house);
  }
  activeHouses() {
    for (const [house, record] of this.houses) if (this.now() - record.at > 45000) this.houses.delete(house);
    return this.houses.values();
  }
  size(k) {
    const users = new Set(this.occ.get(k) || []);
    for (const record of this.activeHouses()) for (const [uid, room] of record.users) if (room === k && (this.where(uid) == null || this.where(uid) === k)) users.add(uid);
    return users.size;
  }
  hasSpace(k, uid) {
    if (this.size(k) < this.cap || !!(this.occ.get(k) && this.occ.get(k).has(uid))) return true;
    for (const record of this.activeHouses()) if (record.users.get(uid) === k) return true;
    return false;
  }
  // Ruang 1–12 selalu tersedia. Bila seluruh ruang yang terbuka penuh,
  // tambah satu nomor berikutnya, tanpa membuat Durable Object kosong.
  // Jangan sembunyikan nomor server tambahan yang masih ditempati pemain.
  openMax() {
    let n = Math.min(this.max, P.MIN_ROOMS || 12);
    for (const [k, users] of this.occ) if (k > n && k <= this.max && users.size > 0) n = k;
    for (const record of this.activeHouses()) for (const room of record.users.values()) if (room > n && room <= this.max) n = room;
    if (n < this.max) {
      let allFull = true;
      for (let k = 1; k <= n; k++) if (this.hasSpace(k, null)) { allFull = false; break; }
      if (allFull) n++;
    }
    return n;
  }
  // opt = { room: 1..max | null, mode: "auto" | "random" }. Validasi nomor server SELALU di sini (server), bukan percaya klien.
  assign(uid, ip, exclude, opt) {
    opt = opt || {}; const now = this.now(), ex = new Set(exclude || []);
    if (!ex.size) {                                             // percobaan ulang karena 409 tidak dihitung sebagai masuk baru
      if (this.prune(this.hits.all, now).length >= this.lim.global) return { error: "busy" };
      if (!this.hit(this.hits.uid, uid, this.lim.perUid, now)) return { error: "rate" };
      if (!this.hit(this.hits.ip, ip, this.lim.perIp, now)) return { error: "rate" };
      this.hits.all.push(now);
    }
    const before = this.where(uid);
    const ok = (k) => ({ room: k, kick: before && before !== k ? before : null });
    if (opt.room != null) {                                      // masuk dengan ID tertentu
      const k = P.roomId(opt.room); if (k == null || k > this.max) return { error: "bad_room" };
      if (ex.has(k) || !this.hasSpace(k, uid)) return { error: "full", room: k };
      return ok(k);
    }
    const opened = this.openMax();
    if (opt.mode === "random") {                                 // acak hanya di antara server terbuka (bukan server sekarang)
      const c = []; for (let k = 1; k <= opened; k++) if (!ex.has(k) && k !== before && this.hasSpace(k, uid)) c.push(k);
      if (!c.length) return { error: "full" };
      return ok(c[Math.min(c.length - 1, Math.floor(this.rnd() * c.length))]);
    }
    for (let k = 1; k <= opened; k++) { if (!ex.has(k) && this.hasSpace(k, uid)) return ok(k); }   // otomatis: server bernomor terkecil yang ada tempat (teman berkumpul)
    return { error: "full" };
  }
  // pintu rumah: hanya pembatas laju (per akun / per IP / global); ruang rumah tidak dipilih lobi
  gate(uid, ip) {
    const now = this.now(); this.hits.house = this.hits.house || { uid: new Map(), ip: new Map(), all: [] };
    const h = this.hits.house;
    if (this.prune(h.all, now).length >= LIM.houseGlobal) return { error: "busy" };
    if (!this.hit(h.uid, uid, LIM.houseUid, now) || !this.hit(h.ip, ip, LIM.houseIp, now)) return { error: "rate" };
    h.all.push(now); return { ok: true };
  }
  joined(k, uid) { this.lastRoom.set(uid, { room: k, at: this.now() }); if (!this.occ.has(k)) this.occ.set(k, new Set()); this.occ.get(k).add(uid); for (const [j, s] of this.occ) if (j !== k) s.delete(uid); }
  left(k, uid) { const s = this.occ.get(k); if (s) { s.delete(uid); if (!s.size) this.occ.delete(k); } }
  // instance melaporkan DAFTAR LENGKAP anggotanya tiap kali berubah → hitungan tidak bisa drift. Mengembalikan sesi ganda yang harus ditutup.
  sync(k, uids) {
    const prev = this.occ.get(k) || new Set(), dups = [];
    for (const u of uids) if (!prev.has(u)) { const j = this.where(u, k); if (j != null) dups.push({ room: j, uid: u }); }
    for (const uid of uids) this.lastRoom.set(uid, { room: k, at: this.now() });
    if (this.lastRoom.size > 2048) for (const [uid, entry] of this.lastRoom) if (this.now() - entry.at > 120000) this.lastRoom.delete(uid);
    if (uids.length) this.occ.set(k, new Set(uids)); else this.occ.delete(k);
    for (const d of dups) this.left(d.room, d.uid);
    return dups;
  }
  // daftar server untuk menu (hanya angka; tanpa nama/uid). Dibatasi laju per IP.
  list(ip) { if (!this.hit(this.hits.list, ip, 30, this.now())) return { error: "rate" }; const rooms = []; const open = this.openMax(); for (let k = 1; k <= open; k++) rooms.push([k, this.size(k)]); return { rooms, cap: this.cap, open, max: this.max }; }
  stats() { return [...this.occ].map(([k, s]) => [k, s.size]); }
}
const API = { Lobby, LIM };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.MPLobby = API; }
})(typeof window !== "undefined" ? window : globalThis);
