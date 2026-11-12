// =========================================================
//  NUSA ISLAND — gambar Kolam Ikan Rumahku (2.5D isometrik, Canvas 2D prosedural, ringan untuk Android).
//  Hanya MENGGAMBAR dari data tampilan (NW.pond.drawState()); tidak mengubah data apa pun.
//  Posisi: pojok kanan-bawah halaman, jauh dari pintu rumah, gerbang, NPC, dan jalan setapak.
// =========================================================
(() => {
"use strict";
window.NW = window.NW || {};
const P = (x, y, z) => NW.P(x, y, z || 0), mix = (a, b, k) => NW.mix(a, b, k);
const R = { x0: 9.6, y0: 11.8, x1: 14.4, y1: 13.4 };                 // lahan kolam (tile halaman 16×14)
const CX = (R.x0 + R.x1) / 2, CY = (R.y0 + R.y1) / 2;
const SPOT = { x: 9.0, y: 12.6 };                                    // titik berdiri pemain (sisi barat)
// gaya per level: makin tinggi makin bagus
const LV = [null,
  { rim: "#7a5a3a", top: "#9a7650", h: 5, deck: false, lilies: 0, fountain: false, stones: 0 },
  { rim: "#7d8283", top: "#a8aeb0", h: 6, deck: false, lilies: 1, fountain: false, stones: 3 },
  { rim: "#7d8283", top: "#b7bdbf", h: 7, deck: true, lilies: 2, fountain: false, stones: 4 },
  { rim: "#8a8f90", top: "#cfd4d5", h: 8, deck: true, lilies: 4, fountain: false, stones: 6 },
  { rim: "#b9a468", top: "#efe2b0", h: 9, deck: true, lilies: 6, fountain: true, stones: 6 }];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y); c.closePath(); };
const rect = (r, z) => [P(r.x0, r.y0, z), P(r.x1, r.y0, z), P(r.x1, r.y1, z), P(r.x0, r.y1, z)];
const inset = (r, k) => ({ x0: r.x0 + k, y0: r.y0 + k, x1: r.x1 - k, y1: r.y1 - k });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const EMPTY = { lv: 1, gear: { aerator: 0, tanaman: 0, lampu: 0 }, fish: [], warn: false };

// ---- efek pemberian makan (ringan: ≤8 butir pakan) ----
let fx = null;
function startFeed(player, kind) {
  const n = kind === "premium" ? 8 : kind === "nutrisi" ? 6 : 4, w = inset(R, 0.35), pel = [];
  for (let i = 0; i < n; i++) pel.push({ x: w.x0 + (w.x1 - w.x0) * (0.12 + 0.76 * Math.random()), y: w.y0 + (w.y1 - w.y0) * (0.15 + 0.7 * Math.random()), d: Math.random() * 0.18 });
  fx = { t0: null, pel, from: player ? { x: player.x, y: player.y, shirt: player.style && player.style.shirt, dir: player.dir } : { x: SPOT.x, y: SPOT.y } };
}
const fxDone = () => !fx;
const FX = { throwT: 0.5, eatT: 1.6, endT: 3.2 };

function fishPos(f, i, t, dt0) {
  const sp = 0.25 + hash(f.u + "s") * 0.3, ph = hash(f.u + "p") * 6.28, ay = 0.28 + hash(f.u + "y") * 0.18, ax = 1.7 + hash(f.u + "x") * 0.5;
  const slow = f.sat <= 15 ? 0.6 : 1, tt = t * sp * slow + ph;
  const x = CX + Math.sin(tt) * ax, y = CY + Math.sin(tt * 1.37 + ph) * ay, vx = Math.cos(tt) * ax * sp * slow;
  return { x, y, vx };
}
function drawPond(c, t, night, S) {
  const L = LV[clamp(S.lv, 1, 5)], H = L.h, W = inset(R, 0.22);
  // dinding tepi (dua sisi yang menghadap kamera)
  c.fillStyle = L.rim;
  poly(c, [P(R.x0, R.y1, 0), P(R.x1, R.y1, 0), P(R.x1, R.y1, H), P(R.x0, R.y1, H)]); c.fill();
  c.fillStyle = mix(L.rim, "#000000", 0.18);
  poly(c, [P(R.x1, R.y0, 0), P(R.x1, R.y1, 0), P(R.x1, R.y1, H), P(R.x1, R.y0, H)]); c.fill();
  c.fillStyle = L.top; poly(c, rect(R, H)); c.fill();
  if (S.lv >= 5) { c.strokeStyle = "#d9b84a"; c.lineWidth = 1.6; poly(c, rect(inset(R, 0.06), H)); c.stroke(); }
  // air
  const wz = H - 3, deep = mix("#2d93ad", "#0b2a4a", clamp(night, 0, 1) * 0.85), shallow = mix("#58c3d4", "#173e66", clamp(night, 0, 1) * 0.85);
  const a = P(W.x0, W.y0, wz), b = P(W.x1, W.y1, wz), g = c.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, shallow); g.addColorStop(1, deep);
  c.fillStyle = g; poly(c, rect(W, wz)); c.fill();
  // kilau & riak (sedikit garis saja)
  c.strokeStyle = `rgba(255,255,255,${0.16 + 0.1 * Math.sin(t * 1.7)})`; c.lineWidth = 1;
  for (let i = 0; i < 3; i++) { const k = (t * 0.12 + i / 3) % 1, p = P(W.x0 + 0.4 + (W.x1 - W.x0 - 0.8) * k, CY + Math.sin(k * 6 + i) * 0.18, wz); c.beginPath(); c.ellipse(p.x, p.y, 7 + i * 2, 2.6, 0, 0, 7); c.stroke(); }
  if (S.lv >= 5) { const p = P(CX, CY, wz); const hgt = 12 + Math.sin(t * 3) * 2; c.strokeStyle = "rgba(220,245,255,.8)"; c.lineWidth = 1.4; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x + k * 6, p.y - hgt - 6, p.x + k * 12, p.y + 1); c.stroke(); } }
  // batu hias di tepi
  for (let i = 0; i < L.stones; i++) { const q = P(R.x0 + 0.25 + (R.x1 - R.x0 - 0.5) * hash("st" + i), R.y1 - 0.12, H), s = 3 + hash("sz" + i) * 3; c.fillStyle = i % 2 ? "#8f9595" : "#a6acac"; c.beginPath(); c.ellipse(q.x, q.y - s * 0.4, s * 1.3, s * 0.8, 0, 0, 7); c.fill(); }
  // teratai
  for (let i = 0; i < L.lilies; i++) { const q = P(W.x0 + 0.5 + (W.x1 - W.x0 - 1) * hash("ly" + i), W.y0 + 0.2 + (W.y1 - W.y0 - 0.4) * hash("lz" + i), wz), r = 6 + hash("lr" + i) * 3; c.fillStyle = "#4f9a46"; c.beginPath(); c.ellipse(q.x, q.y, r, r * 0.45, 0, 0.35, 6.0); c.fill(); if (i % 2 === 0) { c.fillStyle = "#f6a6b2"; c.beginPath(); c.arc(q.x + 1, q.y - 2, 2.2, 0, 7); c.fill(); } }
  // dek kayu (lv3+) di sisi barat tempat berdiri
  if (L.deck) { c.fillStyle = "#9b6e41"; poly(c, [P(R.x0 - 0.7, R.y0 + 0.2, 4), P(R.x0, R.y0 + 0.2, H), P(R.x0, R.y1 - 0.2, H), P(R.x0 - 0.7, R.y1 - 0.2, 4)]); c.fill(); c.strokeStyle = "#6f4a28"; c.lineWidth = 1; for (let i = 1; i < 4; i++) { const k = i / 4, p1 = P(R.x0 - 0.7, R.y0 + 0.2 + (R.y1 - R.y0 - 0.4) * k, 4), p2 = P(R.x0, R.y0 + 0.2 + (R.y1 - R.y0 - 0.4) * k, H); c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke(); } }
  const bubbles = [];
  // ikan
  const fish = S.fish.slice(0, 14);
  for (let i = 0; i < fish.length; i++) {
    const f = fish[i], def = NW.HD_FISH && NW.HD_FISH(f.id); if (!def) continue;
    let ps = fishPos(f, i, t);
    if (fx && fx.t0 != null) {                                                    // ikan mendekati pakan
      const e = t - fx.t0, k = clamp((e - FX.throwT) / 0.9, 0, 1) * (e < FX.eatT + 0.6 ? 1 : clamp(1 - (e - FX.eatT - 0.6) / 0.8, 0, 1));
      if (k > 0 && fx.pel.length) { const q = fx.pel[i % fx.pel.length]; ps = { x: ps.x + (q.x - ps.x) * k, y: ps.y + (q.y - ps.y) * k, vx: q.x - ps.x }; }
    }
    const p = P(ps.x, ps.y, wz - 2), size = Math.max(11, (NW.pondSizeOf ? NW.pondSizeOf(f) : 16));
    c.save(); c.translate(p.x, p.y - 2); c.globalAlpha = f.sat <= 15 ? 0.72 : 0.92; c.scale(ps.vx > 0 ? -1 : 1, 1);
    NW.drawFishSprite(c, def, 0, 0, size, f.vr); c.restore();
    if (i < 3 && !(S.gear.aerator)) bubbles.push({ x: p.x + 4, y: p.y - 6, ph: i });
  }
  // gelembung: aerator (aliran) atau gelembung kecil sesekali
  if (S.gear.aerator) { const a0 = P(R.x0 + 0.9, CY, wz), a1 = P(R.x1 - 0.9, CY, wz); for (const q of [a0, a1]) { c.fillStyle = "#33414a"; c.fillRect(q.x - 3, q.y - 2, 6, 3); for (let i = 0; i < 6; i++) { const k = (t * 0.7 + i / 6 + (q === a1 ? 0.3 : 0)) % 1; c.strokeStyle = `rgba(255,255,255,${0.75 * (1 - k)})`; c.lineWidth = 1; c.beginPath(); c.arc(q.x + Math.sin(k * 9 + i) * 3, q.y - 3 - k * 20, 1.2 + (1 - k) * 1.3, 0, 7); c.stroke(); } } }
  else for (const b0 of bubbles) { const k = (t * 0.5 + b0.ph * 0.37) % 1; if (k < 0.5) { c.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k * 2)})`; c.lineWidth = 1; c.beginPath(); c.arc(b0.x, b0.y - k * 14, 1.6, 0, 7); c.stroke(); } }
  // efek pakan di air
  if (fx && fx.t0 != null) {
    const e = t - fx.t0;
    for (const q of fx.pel) { const e2 = e - FX.throwT - q.d; if (e2 < 0 || e2 > FX.eatT) continue; const p = P(q.x, q.y, wz); const fade = clamp(1 - (e2 - 0.9) / 0.7, 0, 1);
      c.strokeStyle = `rgba(255,255,255,${0.5 * (1 - clamp(e2 / 0.8, 0, 1))})`; c.lineWidth = 1; c.beginPath(); c.ellipse(p.x, p.y, 3 + e2 * 14, 1.4 + e2 * 6, 0, 0, 7); c.stroke();
      if (fade > 0) { c.fillStyle = `rgba(122,84,45,${fade})`; c.beginPath(); c.arc(p.x, p.y + Math.sin(e2 * 7) * 0.6, 2, 0, 7); c.fill(); } }
    if (e > FX.eatT - 0.3 && e < FX.endT) {                                       // ikon hati melayang
      const n = Math.min(S.fish.length, 5); c.font = "13px sans-serif"; c.textAlign = "center";
      for (let i = 0; i < n; i++) { const ps = fishPos(S.fish[i], i, t), p = P(ps.x, ps.y, wz), k = clamp((e - FX.eatT + 0.3) / 1.4, 0, 1); c.globalAlpha = 1 - k; c.fillText("❤️", p.x + (i - 2) * 3, p.y - 10 - k * 24); c.globalAlpha = 1; }
    }
  }
}
function drawArm(c, t) {                                                           // lengan melempar di atas karakter pemain
  if (!fx || fx.t0 == null || !fx.from.shirt) return; const e = t - fx.t0; if (e < 0 || e > FX.throwT + 0.2) return;
  const b = P(fx.from.x, fx.from.y, 0), k = clamp(e / FX.throwT, 0, 1), ang = -1.2 + k * 1.9, dirx = 1;       // pond di timur-laut layar dari titik berdiri
  c.save(); c.translate(b.x, b.y - 22); c.strokeStyle = fx.from.shirt; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang) * 9 * dirx, Math.sin(ang) * 9); c.stroke();
  c.fillStyle = "#e8b88a"; c.beginPath(); c.arc(Math.cos(ang) * 9 * dirx, Math.sin(ang) * 9, 2.4, 0, 7); c.fill(); c.restore();
  for (const q of fx.pel) {                                                         // butir pakan melayang (parabola) dari tangan ke air
    const e2 = (e - 0.18 - q.d) / 0.5; if (e2 < 0 || e2 > 1) continue; const s = b, d = P(q.x, q.y, 6);
    c.fillStyle = "#7a542d"; c.beginPath(); c.arc(s.x + (d.x - s.x) * e2, (s.y - 24) + (d.y - (s.y - 24)) * e2 - Math.sin(e2 * Math.PI) * 18, 2, 0, 7); c.fill();
  }
}
function lampPost(c, t, night, S) {
  const p = P(R.x1 + 0.25, R.y0 + 0.1, 0); c.fillStyle = "#5b4a39"; c.fillRect(p.x - 1.5, p.y - 34, 3, 34); c.fillStyle = "#33414a"; c.fillRect(p.x - 5, p.y - 40, 10, 6);
  const on = night > 0.25; c.fillStyle = on ? "#fff1b8" : "#d9d3c0"; c.beginPath(); c.arc(p.x, p.y - 37, 3.2, 0, 7); c.fill();
}
function reeds(c, t, n) {
  for (let i = 0; i < n; i++) { const p = P(R.x0 + 0.5 + i * 1.5, R.y0 - 0.05, 5), sw = Math.sin(t * 1.3 + i * 2) * 2; c.strokeStyle = "#5e9a4a"; c.lineWidth = 1.6; for (let j = -1; j <= 1; j++) { c.beginPath(); c.moveTo(p.x + j * 3, p.y); c.quadraticCurveTo(p.x + j * 4 + sw, p.y - 9, p.x + j * 6 + sw * 1.4, p.y - 17 - (j === 0 ? 4 : 0)); c.stroke(); } c.fillStyle = "#7a4a2a"; c.fillRect(p.x + 1.5 + sw, p.y - 22, 2.4, 6); }
}
function warnChip(c, t, S) {
  if (!S.warn) return; const p = P(CX, CY, 34 + Math.sin(t * 3) * 2); c.font = "bold 11px sans-serif"; c.textAlign = "center";
  const label = S.warn === "critical" ? "🐟 KRITIS" : S.warn === "serious" ? "🐟 lapar!" : "🐟 mulai lapar";
  const w = c.measureText(label).width + 10; c.fillStyle = S.warn === "critical" ? "rgba(190,40,40,.92)" : "rgba(214,140,30,.92)"; c.beginPath(); c.roundRect ? c.roundRect(p.x - w / 2, p.y - 11, w, 15, 7) : c.rect(p.x - w / 2, p.y - 11, w, 15); c.fill(); c.fillStyle = "#fff"; c.fillText(label, p.x, p.y);
}
// daftar objek untuk diurutkan kedalaman oleh adegan halaman (home.js)
function items(t, night, S, player) {
  S = S || EMPTY; if (fx && fx.t0 == null) fx.t0 = t; if (fx && t - fx.t0 > FX.endT) fx = null;
  const out = [{ d: -3, draw: (c) => drawPond(c, t, night, S) },
    { d: R.x1 + R.y0 + 0.2, draw: (c) => { reeds(c, t, S.lv >= 2 ? 2 : 1); if (S.gear.lampu) lampPost(c, t, night, S); for (let i = 0; i < Math.min(3, S.gear.tanaman); i++) { const p = P(R.x0 + 0.6 + i * 1.6, R.y1 + 0.02, LV[clamp(S.lv, 1, 5)].h); const sw = Math.sin(t * 1.5 + i) * 1.5; c.strokeStyle = "#4f9a46"; c.lineWidth = 1.8; for (let j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(p.x + j * 2, p.y); c.quadraticCurveTo(p.x + j * 3 + sw, p.y - 7, p.x + j * 4 + sw * 1.5, p.y - 12 - Math.abs(j)); c.stroke(); } } } },
    { d: CX + R.y1 + 0.3, draw: (c) => warnChip(c, t, S) }];
  if (fx) out.push({ d: (player ? player.x + player.y : 0) + 0.02, draw: (c) => drawArm(c, t) });
  return out;
}
// cahaya malam (lampu kolam)
function glow(c, a, S) {
  S = S || EMPTY; if (!S.gear.lampu) return; const p = P(CX, CY, 20), r = 130, g = c.createRadialGradient(p.x, p.y, 4, p.x, p.y, r);
  g.addColorStop(0, `rgba(255,224,150,${0.5 * a})`); g.addColorStop(1, "rgba(255,224,150,0)"); c.fillStyle = g; c.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  const q = P(R.x1 + 0.25, R.y0 + 0.1, 37); const g2 = c.createRadialGradient(q.x, q.y, 1, q.x, q.y, 60); g2.addColorStop(0, `rgba(255,236,170,${0.7 * a})`); g2.addColorStop(1, "rgba(255,236,170,0)"); c.fillStyle = g2; c.fillRect(q.x - 60, q.y - 60, 120, 120);
}
const solid = (x, y, r) => x > R.x0 - r && x < R.x1 + r && y > R.y0 - r && y < R.y1 + r;
NW.pondSizeOf = (f) => { const d = NW.HD_FISH && NW.HD_FISH(f.id); if (!d) return 16; const k = clamp((f.w - d.wMin) / Math.max(0.01, d.wMax - d.wMin), 0, 1); return 14 * (0.8 + k * 0.5) * (0.85 + (d.shape ? d.shape[0] - 1 : 0) * 0.35); };
NW.pondDraw = { RECT: R, SPOT, items, glow, solid, startFeed, fxActive: () => !!fx, LEVELS: LV, EMPTY };
})();
