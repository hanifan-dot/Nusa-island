// NUSA ISLAND — Kapal Rombongan (inti murni, tanpa DOM/jaringan). Geometri kursi, mesin animasi naik/duduk/pindah kapten/turun/sambung ulang,
// penyaring tampilan (hanya data publik). Kapal & kursi = keadaan SERVER (#132); modul ini hanya MENGGAMBAR dan menerjemahkan masukan.
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.NusaRombonganCore = factory(); })(typeof self !== "undefined" ? self : this, function () {
"use strict";
const HW = 32, HH = 16;                        // setengah tile isometrik (NW.TW/2, NW.TH/2)
const DIR_PI4 = Math.PI / 4;
// kursi: 0 = kapten di kemudi (tengah), 1 = penumpang depan (haluan), 2 = penumpang belakang (buritan). u: -1 buritan … +1 haluan.
const SEATS = [
  { u: -0.05, v: 0, role: "Kapten", short: "Kemudi" },
  { u: 0.55, v: 0, role: "Penumpang depan", short: "Depan" },
  { u: -0.62, v: 0, role: "Penumpang belakang", short: "Belakang" },
];
const T = { BOARD: 0.85, LEAVE: 0.8, SWAP: 0.55, RETURN: 0.5, FADE: 0.45 };   // detik
const HOP = 9, SEAT_Z = 13;                   // tinggi lompatan naik; tinggi dudukan di atas air (px)
const DISEMBARK = { x: 35.5, y: 20.6 };       // titik turun Muara (kontrak #132)
const REASONS = {                              // alasan penolakan server → pesan aman
  off: "Kapal Rombongan sedang tidak aktif.", hidden: "Kamu belum terlihat di Muara.", aboard: "Kamu sudah berada di kapal.", full: "Kapal ini sudah penuh.",
  far: "Terlalu jauh. Dekati dermaga atau kapalnya dulu.", none: "Kapal itu sudah tidak ada.", away: "Kapal sedang berlayar.", moving: "Tunggu kapal berhenti dulu.",
  seat: "Kursi itu baru saja diambil orang lain.", captain: "Hanya kapten yang bisa melakukan itu.", anchor: "Turunkan jangkar dulu.", early: "Kapal belum boleh kembali secepat itu.", same: "Kamu sudah di tujuan itu.",
};
const reasonText = (r) => REASONS[r] || "Aksi kapal ditolak. Coba lagi sebentar lagi.";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const angleOf = (d) => ((d | 0) & 7) * DIR_PI4;
function fwd(a) { const x = (Math.cos(a) / HW + Math.sin(a) / HH) / 2, y = (Math.sin(a) / HH - Math.cos(a) / HW) / 2, k = Math.hypot(x, y) || 1; return { x: x / k, y: y / k }; }
// posisi tile sebuah kursi pada badan kapal (pose {x,y,d}); L, B = setengah panjang/lebar (tile)
function seatTile(pose, s, L, Bm) {
  const f = fwd(pose.a != null ? pose.a : angleOf(pose.d)), q = SEATS[s] || SEATS[0];
  return { x: pose.x + f.x * q.u * L - f.y * q.v * Bm, y: pose.y + f.y * q.u * L + f.x * q.v * Bm };
}
// arah server (0..7, sudut layar) → arah karakter (0 E,1 SE,2 S,…): sama.
const charDir = (d) => (d | 0) & 7;
// masukan joystick (vektor layar) → niat kemudi {d, th}; th: 0 berhenti, 1 pelan, 2 kencang
function steerFrom(v) {
  if (!v || !(v.m > 0.28)) return { d: null, th: 0 };
  const d = ((Math.round(Math.atan2(v.y, v.x) / DIR_PI4) % 8) + 8) % 8;
  return { d, th: v.m > 0.62 ? 2 : 1 };
}
// ---------- ringkasan baris kapal (tanpa UID; hanya id publik) ----------
function crewOf(boat) { const out = []; if (!boat || !Array.isArray(boat.seats)) return out; boat.seats.forEach((pid, s) => { if (pid) out.push({ s, pid }); }); return out; }
const seatFree = (boat, s) => !!boat && !boat.away && !boat.seats[s];
const boardable = (boat) => !!boat && !boat.away && !!boat.anchor && !(boat.v > 0.05);
// ---------- pelacak animasi ----------
// sync(now, boats, present, fromOf): bandingkan isi kursi sekarang vs sebelumnya → catat naik / pindah / turun / sambung ulang.
// present(pid) = pemain itu terlihat/terhubung (diri sendiri selalu true). fromOf(pid) = {x,y,z} titik asal naik (boleh null).
function tracker() {
  const seatOf = new Map();                    // pid → {b, s, t0, kind, from, fromSeat}
  const prev = new Map();                      // "b:s" → pid sebelumnya
  const ghosts = [];                           // animasi turun yang sedang berjalan
  const held = new Map();                      // "b:s" → waktu mulai kursi tertahan (pemain lama tidak terlihat)
  let first = true;                            // sinkron pertama (masuk/sambung ulang): yang sudah duduk langsung tampil duduk, tanpa animasi
  return {
    seatOf, ghosts, held,
    sync(now, boats, present, fromOf, lastPose) {
      const init = first, cur = new Map(); first = false;
      for (const b of boats) for (let s = 0; s < 3; s++) { const pid = b.seats[s] || 0; if (pid) cur.set(pid, { b: b.id, s }); }
      const oldPid = new Map(prev);                                    // "b:s" → pid sebelumnya
      for (const [key, pid] of oldPid) { const e = cur.get(pid); if (!e || e.b + ":" + e.s !== key) prev.delete(key); }
      // turun: yang tadinya duduk lalu hilang dari semua kursi. Kursi tertahan (pemain tak terlihat) tidak memunculkan animasi turun.
      for (const [pid, e] of [...seatOf]) if (!cur.has(pid)) {
        const key = e.b + ":" + e.s, wasHeld = held.has(key) || !present(pid);
        seatOf.delete(pid); held.delete(key);
        if (!wasHeld) ghosts.push({ pid, b: e.b, kind: "leave", t0: now, from: lastPose && lastPose(pid), s: e.s });
      }
      for (const [pid, e] of cur) {
        const key = e.b + ":" + e.s, old = seatOf.get(pid), before = oldPid.get(key);
        if (old && old.b === e.b && old.s === e.s) continue;
        if (old && old.b === e.b) { seatOf.set(pid, { b: e.b, s: e.s, t0: now, kind: "swap", from: lastPose && lastPose(pid), fromSeat: old.s }); }
        else if (init) seatOf.set(pid, { b: e.b, s: e.s, t0: now, kind: "sit", from: null, fromSeat: -1 });
        else seatOf.set(pid, { b: e.b, s: e.s, t0: now, kind: before && before !== pid && !present(before) ? "return" : "board", from: fromOf && fromOf(pid), fromSeat: -1 });
        prev.set(key, pid);
      }
      for (const [pid, e] of cur) { const key = e.b + ":" + e.s; if (!present(pid)) { if (!held.has(key)) held.set(key, now); } else held.delete(key); }
      for (const k of [...held.keys()]) { const [bid, ss] = k.split(":"), bb = boats.find((x) => x.id === bid); if (!bb || !bb.seats[+ss]) held.delete(k); }
      for (let i = ghosts.length - 1; i >= 0; i--) if (now - ghosts[i].t0 > T.LEAVE + 0.05) ghosts.splice(i, 1);
    },
    // pose awal → akhir; seatXY = posisi kursi sekarang. Hasil: {x,y,z,mode,k}. mode: board|swap|return|sit
    pose(pid, now, seatXY, seatZ) {
      const e = seatOf.get(pid); if (!e) return null;
      const dt = now - e.t0;
      if (e.kind === "board" && dt < T.BOARD) {
        const k = ease(dt / T.BOARD), f = e.from || seatXY;
        return { x: f.x + (seatXY.x - f.x) * k, y: f.y + (seatXY.y - f.y) * k, z: (f.z || 0) * (1 - k) + seatZ * k + Math.sin(k * Math.PI) * HOP, mode: "board", k };
      }
      if (e.kind === "swap" && dt < T.SWAP && e.from) {
        const k = ease(dt / T.SWAP);
        return { x: e.from.x + (seatXY.x - e.from.x) * k, y: e.from.y + (seatXY.y - e.from.y) * k, z: seatZ + Math.sin(k * Math.PI) * 3, mode: "swap", k };
      }
      if (e.kind === "return" && dt < T.RETURN) { const k = ease(dt / T.RETURN); return { x: seatXY.x, y: seatXY.y, z: seatZ + (1 - k) * 6, mode: "return", k, alpha: k }; }
      return { x: seatXY.x, y: seatXY.y, z: seatZ, mode: "sit", k: 1 };
    },
    ghostPose(g, now, to) {
      const dt = now - g.t0, k = ease(dt / T.LEAVE), f = g.from; if (!f || dt > T.LEAVE) return null;
      return { x: f.x + (to.x - f.x) * k, y: f.y + (to.y - f.y) * k, z: (f.z || SEAT_Z) * (1 - k) + (to.z || 0) * k + Math.sin(k * Math.PI) * HOP, mode: "leave", k };
    },
    isHeld(bid, s) { return held.has(bid + ":" + s); },
    clear() { seatOf.clear(); prev.clear(); ghosts.length = 0; held.clear(); first = true; },
  };
}
// ---------- tampilan publik (tak pernah memuat UID / data pemain) ----------
function publicBoat(b, nameOf) {
  if (!b) return null;
  return { id: String(b.id), anchor: !!b.anchor, away: !!b.away, d: b.d | 0, v: +(+b.v || 0).toFixed(2), seats: (b.seats || []).slice(0, 3).map((pid, s) => (pid ? { s, pid: String(pid), name: nameOf ? String(nameOf(pid) || "Pemancing").slice(0, 16) : "Pemancing" } : { s, pid: null, name: null })) };
}
const PALETTE = [
  { hull: "#2f7a8c", trim: "#f0d58a", inner: "#b07c48" }, { hull: "#c9553b", trim: "#f3e7c9", inner: "#b07c48" },
  { hull: "#e9e4d8", trim: "#d14a3a", inner: "#b8875a" }, { hull: "#3d6b4a", trim: "#f0d58a", inner: "#a8743f" },
];
function styleFor(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
const HINT = { 0: "Kapten: geser joystick untuk berlayar", 1: "Penumpang depan", 2: "Penumpang belakang" };
return { SEATS, T, HOP, SEAT_Z, DISEMBARK, REASONS, reasonText, ease, angleOf, fwd, seatTile, charDir, steerFrom, crewOf, seatFree, boardable, tracker, publicBoat, styleFor, HINT, HW, HH };
});
