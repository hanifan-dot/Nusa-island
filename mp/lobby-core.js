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
const LIM = { perUid: 8, perIp: 30, global: 300, windowMs: 60000 };

class Lobby {
  constructor(opts) { this.cap = (opts && opts.cap) || P.ROOM_CAP; this.max = (opts && opts.max) || P.MAX_ROOMS; this.now = (opts && opts.now) || (() => Date.now()); this.occ = new Map(); this.hits = { uid: new Map(), ip: new Map(), all: [] }; }
  prune(arr, now) { while (arr.length && now - arr[0] > LIM.windowMs) arr.shift(); return arr; }
  hit(map, key, limit, now) { if (!key) return true; const a = this.prune(map.get(key) || [], now); map.set(key, a); if (a.length >= limit) return false; a.push(now); return true; }
  where(uid) { for (const [k, s] of this.occ) if (s.has(uid)) return k; return null; }
  assign(uid, ip, exclude) {
    const now = this.now(), ex = new Set(exclude || []);
    if (!ex.size) {                                             // percobaan ulang karena 409 tidak dihitung sebagai masuk baru
      if (this.prune(this.hits.all, now).length >= LIM.global) return { error: "busy" };
      if (!this.hit(this.hits.uid, uid, LIM.perUid, now)) return { error: "rate" };
      if (!this.hit(this.hits.ip, ip, LIM.perIp, now)) return { error: "rate" };
      this.hits.all.push(now);
    }
    const before = this.where(uid);
    for (let k = 1; k <= this.max; k++) {
      if (ex.has(k)) continue;
      const s = this.occ.get(k); if ((s ? s.size : 0) >= this.cap && !(s && s.has(uid))) continue;
      return { room: k, kick: before && before !== k ? before : null };
    }
    return { error: "full" };
  }
  joined(k, uid) { if (!this.occ.has(k)) this.occ.set(k, new Set()); this.occ.get(k).add(uid); for (const [j, s] of this.occ) if (j !== k) s.delete(uid); }
  left(k, uid) { const s = this.occ.get(k); if (s) { s.delete(uid); if (!s.size) this.occ.delete(k); } }
  sync(k, uids) { this.occ.set(k, new Set(uids)); if (!uids.length) this.occ.delete(k); }
  stats() { return [...this.occ].map(([k, s]) => [k, s.size]); }
}
const API = { Lobby, LIM };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.MPLobby = API; }
})(typeof window !== "undefined" ? window : globalThis);
