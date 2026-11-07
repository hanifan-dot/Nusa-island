// NUSA ISLAND — gambar ikan/makhluk Samudra Follower V2 (Canvas 2D, 2.5D: gradasi + sorot + bayangan; ORISINAL, prosedural, tanpa gambar eksternal → ringan untuk Android).
// Satu fungsi per KELUARGA BENTUK; warna & ukuran datang dari katalog (sf2-core). Semua menghadap KIRI. draw(c, id, cx, cy, L, t): L ≈ lebar sprite (px), t = detik.
// Makhluk mitos (Leviathan, Kraken, Naga, Mosasaurus) adalah desain orisinal Nusa Island (bukan salinan karya pihak lain).
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const C = window.NusaSF2Core; if (!C) return;
const TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
const lit = (h, k) => mixc(h, "#ffffff", k), dark = (h, k) => mixc(h, "#000000", k);
const OUT = "rgba(24,20,16,.55)";
function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
function lg(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function eye(c, x, y, r, glow) {
  ell(c, x, y, r, r); c.fillStyle = glow || "#fff"; c.fill(); c.lineWidth = 1; c.strokeStyle = OUT; c.stroke();
  ell(c, x - r * 0.1, y + r * 0.1, r * 0.62, r * 0.62); c.fillStyle = "#15100c"; c.fill(); ell(c, x - r * 0.3, y - r * 0.2, r * 0.22, r * 0.22); c.fillStyle = "rgba(255,255,255,.9)"; c.fill();
}
function body(c, rx, ry, k, pal, tailLen, sway) {   // badan lonjong + gradasi punggung→perut + ekor
  const g = lg(c, 0, -ry, 0, ry, [[0, dark(pal[0], 0.12)], [0.55, pal[0]], [0.6, pal[1]], [1, lit(pal[1], 0.2)]]);
  c.fillStyle = pal[2]; c.beginPath(); c.moveTo(rx * 0.8, 0); c.quadraticCurveTo(rx + tailLen * 0.6, -ry * 0.2 + sway, rx + tailLen, -ry * 0.95 + sway); c.lineTo(rx + tailLen * 0.82, sway * 0.6); c.lineTo(rx + tailLen, ry * 0.95 + sway); c.quadraticCurveTo(rx + tailLen * 0.6, ry * 0.2 + sway, rx * 0.8, 0); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
  ell(c, 0, 0, rx, ry); c.fillStyle = g; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
  c.save(); ell(c, -rx * 0.15, -ry * 0.45, rx * 0.5, ry * 0.2, -0.05); c.fillStyle = "rgba(255,255,255,.28)"; c.fill(); c.restore();
}
const F = {
  ikan(c, s, t, pal) { const sw = sin(t * 5) * s * 0.03, rx = s * 0.36, ry = s * 0.17; body(c, rx, ry, 0, pal, s * 0.18, sw);
    c.fillStyle = pal[2]; c.beginPath(); c.moveTo(-rx * 0.1, -ry * 0.95); c.quadraticCurveTo(rx * 0.2, -ry * 1.7, rx * 0.5, -ry * 0.8); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-rx * 0.1, ry * 0.9); c.quadraticCurveTo(rx * 0.1, ry * 1.5, rx * 0.35, ry * 0.8); c.fill(); c.stroke(); eye(c, -rx * 0.62, -ry * 0.2, ry * 0.3); },
  channa(c, s, t, pal) { const sw = sin(t * 4) * s * 0.025, rx = s * 0.4, ry = s * 0.11; body(c, rx, ry, 0, pal, s * 0.1, sw);
    c.fillStyle = pal[2]; c.beginPath(); c.moveTo(-rx * 0.5, -ry); c.lineTo(rx * 0.7, -ry * 1.7); c.lineTo(rx * 0.8, -ry * 0.6); c.closePath(); c.fill(); c.stroke();
    ell(c, -rx * 0.88, ry * 0.15, rx * 0.12, ry * 0.4); c.fillStyle = dark(pal[0], 0.2); c.fill(); eye(c, -rx * 0.74, -ry * 0.25, ry * 0.3); },
  bulat(c, s, t, pal) { const sw = sin(t * 6) * s * 0.025, r = s * 0.27; const g = lg(c, 0, -r, 0, r, [[0, dark(pal[0], 0.1)], [0.6, pal[0]], [0.62, pal[1]], [1, lit(pal[1], 0.2)]]);
    c.fillStyle = pal[2]; c.beginPath(); c.moveTo(r * 0.8, 0); c.lineTo(r + s * 0.15, -r * 0.5 + sw); c.lineTo(r + s * 0.15, r * 0.5 + sw); c.closePath(); c.fill(); c.stroke();
    ell(c, 0, 0, r * 1.12, r); c.fillStyle = g; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = pal[2]; for (let i = 0; i < 9; i++) { const a = -2.6 + i * 0.4; ell(c, cos(a) * r * 0.85, sin(a) * r * 0.7, 1.6, 1.6); c.fill(); }
    ell(c, 0, r * 0.15, r * 0.18, r * 0.1, sin(t * 8) * 0.5); c.fillStyle = pal[2]; c.fill(); eye(c, -r * 0.62, -r * 0.2, r * 0.22); },
  pipih(c, s, t, pal) { const f = sin(t * 2.4) * s * 0.04, w = s * 0.46, h = s * 0.22; const g = lg(c, 0, -h, 0, h, [[0, pal[0]], [1, pal[1]]]);
    c.fillStyle = g; c.beginPath(); c.moveTo(-w * 0.55, 0); c.quadraticCurveTo(-w * 0.1, -h * 1.6 - f, w * 0.5, -h * 0.2); c.quadraticCurveTo(w * 0.1, 0, w * 0.5, h * 0.2); c.quadraticCurveTo(-w * 0.1, h * 1.6 + f, -w * 0.55, 0); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = pal[2]; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.5, 0); c.quadraticCurveTo(w * 0.8, sin(t * 4) * 6, w * 1.05, sin(t * 4) * 9); c.stroke(); eye(c, -w * 0.34, -h * 0.28, h * 0.15); },
  tuna(c, s, t, pal) { const sw = sin(t * 7) * s * 0.03, rx = s * 0.38, ry = s * 0.15; body(c, rx, ry, 0, pal, s * 0.2, sw);
    c.fillStyle = pal[2]; for (let i = 0; i < 5; i++) { const x = rx * (0.35 + i * 0.13); c.beginPath(); c.moveTo(x, -ry * 0.5); c.lineTo(x + 5, -ry * 0.9); c.lineTo(x + 8, -ry * 0.4); c.fill(); }
    c.beginPath(); c.moveTo(-rx * 0.1, -ry * 0.9); c.quadraticCurveTo(rx * 0.15, -ry * 2.1, rx * 0.4, -ry * 0.8); c.fill(); c.stroke(); eye(c, -rx * 0.66, -ry * 0.15, ry * 0.26); },
  hiu(c, s, t, pal) { const sw = sin(t * 3) * s * 0.03, rx = s * 0.4, ry = s * 0.13; const g = lg(c, 0, -ry, 0, ry, [[0, dark(pal[0], 0.1)], [0.6, pal[0]], [0.64, pal[1]], [1, lit(pal[1], 0.15)]]);
    c.fillStyle = pal[0]; c.beginPath(); c.moveTo(rx * 0.7, 0); c.lineTo(rx + s * 0.16, -ry * 2 + sw); c.lineTo(rx + s * 0.06, sw * 0.5); c.lineTo(rx + s * 0.12, ry * 1.1 + sw); c.closePath(); c.fill(); c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(-rx, 0); c.quadraticCurveTo(-rx * 0.5, -ry * 1.3, rx * 0.2, -ry); c.lineTo(rx * 0.75, 0); c.quadraticCurveTo(-rx * 0.4, ry * 1.3, -rx, 0); c.fillStyle = g; c.fill(); c.stroke();
    c.fillStyle = pal[0]; c.beginPath(); c.moveTo(-rx * 0.1, -ry * 1.05); c.lineTo(rx * 0.12, -ry * 2.7); c.lineTo(rx * 0.35, -ry * 0.9); c.fill(); c.stroke(); eye(c, -rx * 0.62, -ry * 0.25, ry * 0.2); },
  paus(c, s, t, pal) { const sw = sin(t * 2.2) * s * 0.03, rx = s * 0.38, ry = s * 0.19; const g = lg(c, 0, -ry, 0, ry, [[0, pal[0]], [0.7, dark(pal[0], 0.05)], [1, pal[0]]]);
    c.fillStyle = pal[0]; c.beginPath(); c.moveTo(rx * 0.8, 0); c.quadraticCurveTo(rx + s * 0.1, -ry * 0.7 + sw, rx + s * 0.18, -ry * 1.5 + sw); c.lineTo(rx + s * 0.1, sw); c.lineTo(rx + s * 0.18, ry * 1.2 + sw); c.quadraticCurveTo(rx + s * 0.1, ry * 0.5, rx * 0.8, 0); c.fill(); c.stroke();
    ell(c, 0, 0, rx, ry); c.fillStyle = g; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke();
    ell(c, -rx * 0.1, ry * 0.45, rx * 0.62, ry * 0.4); c.fillStyle = pal[1]; c.fill(); ell(c, -rx * 0.5, -ry * 0.3, rx * 0.16, ry * 0.12, -0.3); c.fillStyle = pal[1]; c.fill();
    c.fillStyle = pal[0]; c.beginPath(); c.moveTo(-rx * 0.05, -ry * 0.95); c.lineTo(rx * 0.12, -ry * 2.2); c.lineTo(rx * 0.32, -ry * 0.85); c.fill(); c.stroke(); ell(c, -rx * 0.2, ry * 0.85, rx * 0.2, ry * 0.12, 0.6); c.fillStyle = pal[0]; c.fill(); eye(c, -rx * 0.72, -ry * 0.1, ry * 0.12); },
  narwhal(c, s, t, pal) { const sw = sin(t * 2.2) * s * 0.03, rx = s * 0.3, ry = s * 0.15; c.save(); c.translate(s * 0.05, 0); body(c, rx, ry, 0, [pal[0], pal[1], dark(pal[0], 0.1)], s * 0.14, sw);
    c.fillStyle = "rgba(60,70,80,.35)"; for (let i = 0; i < 10; i++) { ell(c, -rx * 0.6 + i * rx * 0.15, -ry * 0.3 + sin(i * 2.1) * ry * 0.3, 2.2, 1.6); c.fill(); } eye(c, -rx * 0.7, -ry * 0.1, ry * 0.12); c.restore();
    c.strokeStyle = pal[2]; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(-rx * 0.95 + s * 0.05, ry * 0.05); c.lineTo(-s * 0.5, ry * 0.05 - 3); c.stroke(); c.lineCap = "butt"; },
  ular(c, s, t, pal) { const n = 22, pts = []; for (let i = 0; i < n; i++) { const k = i / (n - 1); pts.push([(-0.5 + k) * s * 0.9, sin(k * 7 - t * 2.2) * s * 0.09 * (0.4 + k)]); }
    for (let pass = 0; pass < 2; pass++) for (let i = n - 1; i >= 0; i--) { const k = i / (n - 1), r = (1 - k * 0.78) * s * 0.07 + 2; ell(c, pts[i][0], pts[i][1], r * (pass ? 0.55 : 1), r * (pass ? 0.55 : 1)); c.fillStyle = pass ? lit(pal[1], 0.08) : lg(c, 0, pts[i][1] - r, 0, pts[i][1] + r, [[0, dark(pal[0], 0.1)], [0.6, pal[0]], [1, pal[1]]]); c.fill(); if (!pass) { c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke(); } if (pass && i % 3 === 0) { c.fillStyle = pal[2]; c.beginPath(); c.moveTo(pts[i][0] - 3, pts[i][1] - r * 0.5); c.lineTo(pts[i][0], pts[i][1] - r * 1.6); c.lineTo(pts[i][0] + 3, pts[i][1] - r * 0.5); c.fill(); } }
    const h = pts[0], hr = s * 0.085; ell(c, h[0] - hr * 0.5, h[1], hr * 1.5, hr); c.fillStyle = pal[0]; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke(); ell(c, h[0] - hr * 0.7, h[1] + hr * 0.5, hr * 0.9, hr * 0.3); c.fillStyle = dark(pal[0], 0.3); c.fill(); eye(c, h[0] - hr * 0.3, h[1] - hr * 0.3, hr * 0.35, pal[2]); },
  reptil(c, s, t, pal) { const sw = sin(t * 3) * s * 0.03, rx = s * 0.36, ry = s * 0.12; body(c, rx, ry, 0, pal, s * 0.22, sw);
    c.fillStyle = dark(pal[0], 0.15); for (const x of [-0.25, 0.3]) { c.save(); c.translate(rx * x, ry * 0.7); c.rotate(0.5 + sin(t * 3 + x) * 0.2); ell(c, 0, s * 0.06, s * 0.025, s * 0.08); c.fill(); c.stroke(); c.restore(); }
    ell(c, -rx * 0.95, ry * 0.15, rx * 0.34, ry * 0.5); c.fillStyle = pal[0]; c.fill(); c.stroke(); c.fillStyle = "#fff"; for (let i = 0; i < 7; i++) { c.beginPath(); const x = -rx * 1.25 + i * rx * 0.11; c.moveTo(x, ry * 0.5); c.lineTo(x + 2, ry * 0.85); c.lineTo(x + 4, ry * 0.5); c.fill(); } eye(c, -rx * 0.9, -ry * 0.2, ry * 0.25, pal[2]);
    c.fillStyle = pal[2]; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-rx * 0.5 + i * rx * 0.2, -ry * 0.9); c.lineTo(-rx * 0.45 + i * rx * 0.2, -ry * 1.5); c.lineTo(-rx * 0.4 + i * rx * 0.2, -ry * 0.9); c.fill(); } },
  gurita(c, s, t, pal) { const hr = s * 0.17; for (let i = 0; i < 8; i++) { const a = Math.PI * 0.12 + i * 0.36 - 0.3, sw = sin(t * 2.5 + i) * s * 0.03; c.strokeStyle = i % 2 ? pal[0] : dark(pal[0], 0.1); c.lineCap = "round"; c.lineWidth = s * 0.045; c.beginPath(); c.moveTo(-hr * 0.5 + i * hr * 0.15, hr * 0.5); c.bezierCurveTo(-s * 0.1 + i * s * 0.04, hr * 1.7, -s * 0.28 + i * s * 0.08 + sw, hr * 2.1, -s * 0.4 + i * s * 0.12 + sw, hr * 1.5 + sin(i) * 8); c.stroke(); c.strokeStyle = pal[2]; c.lineWidth = 1.4; c.stroke(); }
    c.lineCap = "butt"; const g = lg(c, 0, -hr, 0, hr, [[0, lit(pal[0], 0.12)], [0.6, pal[0]], [1, dark(pal[0], 0.15)]]); ell(c, 0, -hr * 0.35, hr * 1.1, hr * 1.2); c.fillStyle = g; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = pal[2]; for (let i = 0; i < 8; i++) { ell(c, -hr * 0.6 + sin(i * 2.3) * hr * 0.5, -hr * 0.6 + cos(i * 1.7) * hr * 0.5, 2.4, 2.4); c.fill(); } eye(c, -hr * 0.4, -hr * 0.1, hr * 0.28, pal[1]); eye(c, hr * 0.25, -hr * 0.1, hr * 0.28, pal[1]); },
};
function draw(c, id, cx, cy, L, t) {
  const sp = C.BY_ID[id]; if (!sp) return; const fn = F[sp.shape] || F.ikan, s = L * 1.05;
  c.save(); c.translate(cx, cy); c.save(); c.fillStyle = "rgba(10,40,60,.16)"; ell(c, 0, s * 0.3, s * 0.38, s * 0.04); c.fill(); c.restore();
  c.lineJoin = "round"; fn(c, s, t || 0, sp.col); c.restore();
}
const cache = {};
function sprite(id, w = 200, h = 110) { const k = id + "|" + w; if (cache[k]) return cache[k]; const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), id, w * 0.52, h * 0.5, w * 0.8, 0.6); return (cache[k] = cv.toDataURL()); }
NW.sf2Draw = { draw, sprite };
// game.js memanggil NW.sfDraw.draw(c, id, ...) untuk semua ikan bertanda sf → arahkan id sf2_* ke gambar baru, sisanya tetap ikan lama.
const wrap = () => { const o = NW.sfDraw; if (!o || o._w2) return !!(o && o._w2); const od = o.draw, os = o.sprite; o.draw = (c, id, x, y, L, t) => (C.isSpecies(id) ? draw(c, id, x, y, L, t) : od(c, id, x, y, L, t)); o.sprite = (id, ...a) => (C.isSpecies(id) ? sprite(id, ...a) : os(id, ...a)); o._w2 = true; return true; };
if (!wrap()) { const iv = setInterval(() => { if (wrap()) clearInterval(iv); }, 100); setTimeout(() => clearInterval(iv), 15000); }
})();
