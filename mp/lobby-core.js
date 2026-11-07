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
  constructor(opts) { this.lim = Object.assign({}, LIM, (opts && opts.lim) || {}); this.cap = (opts && opts.cap) || P.ROOM_CAP; this.max = (opts && opts.max) || P.MAX_ROOMS; this.now = (opts && opts.now) || (() => Date.now()); this.rnd = (opts && opts.rnd) || Math.random; this.occ = new Map(); this.hits = { uid: new Map(), ip: new Map(), list: new Map(), all: [] }; }
  prune(arr, now) { while (arr.length && now - arr[0] > this.lim.windowMs) arr.shift(); return arr; }
  hit(map, key, limit, now) { if (!key) return true; const a = this.prune(map.get(key) || [], now); map.set(key, a); if (a.length >= limit) return false; a.push(now); return true; }
  where(uid, except) { for (const [k, s] of this.occ) if (k !== except && s.has(uid)) return k; return null; }
  size(k) { const s = this.occ.get(k); return s ? s.size : 0; }
  hasSpace(k, uid) { const s = this.occ.get(k); return (s ? s.size : 0) < this.cap || !!(s && s.has(uid)); }
  // Ruang 1–12 selalu tersedia. Bila seluruh ruang yang terbuka penuh,
  // tambah satu nomor berikutnya, tanpa membuat Durable Object kosong.
  // Jangan sembunyikan nomor server tambahan yang masih ditempati pemain.
  openMax() {
    let n = Math.min(this.max, P.MIN_ROOMS || 12);
    for (const [k, users] of this.occ) if (k > n && k <= this.max && users.size > 0) n = k;
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
  joined(k, uid) { if (!this.occ.has(k)) this.occ.set(k, new Set()); this.occ.get(k).add(uid); for (const [j, s] of this.occ) if (j !== k) s.delete(uid); }
  left(k, uid) { const s = this.occ.get(k); if (s) { s.delete(uid); if (!s.size) this.occ.delete(k); } }
  // instance melaporkan DAFTAR LENGKAP anggotanya tiap kali berubah → hitungan tidak bisa drift. Mengembalikan sesi ganda yang harus ditutup.
  sync(k, uids) {
    const prev = this.occ.get(k) || new Set(), dups = [];
    for (const u of uids) if (!prev.has(u)) { const j = this.where(u, k); if (j != null) dups.push({ room: j, uid: u }); }
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
