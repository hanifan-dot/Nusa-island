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
  gendut(c, s, t, pal) {   // ikan KARTUN gendut-lonjong (siluet dari sketsa komunitas, digambar ulang orisinal): kepala bulat di kiri, ekor bercagak berlekuk. Menghadap KIRI.
    const sw = sin(t * 3.2) * s * 0.04, fl = sin(t * 5) * 0.35, rx = s * 0.4, ry = s * 0.15, tx = rx * 0.8, tl = s * 0.2;
    c.fillStyle = lg(c, tx, 0, rx + tl, 0, [[0, pal[2]], [1, lit(pal[2], 0.3)]]);   // ekor bercagak
    c.beginPath(); c.moveTo(tx, -ry * 0.2); c.quadraticCurveTo(rx + tl * 0.45, -ry * 0.9 + sw, rx + tl, -ry * 1.6 + sw * 1.5); c.quadraticCurveTo(rx + tl * 0.95, -ry * 0.25 + sw, rx + tl * 0.45, sw * 0.5);
    c.quadraticCurveTo(rx + tl * 0.95, ry * 0.25 + sw, rx + tl, ry * 1.5 + sw * 1.5); c.quadraticCurveTo(rx + tl * 0.45, ry * 0.9 + sw, tx, ry * 0.2); c.closePath(); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = pal[2]; c.beginPath(); c.moveTo(-rx * 0.05, -ry * 0.95); c.quadraticCurveTo(rx * 0.15, -ry * 1.85 + sw * 0.4, rx * 0.45, -ry * 0.85); c.closePath(); c.fill(); c.stroke();   // sirip punggung
    const g = lg(c, 0, -ry, 0, ry, [[0, dark(pal[0], 0.1)], [0.55, pal[0]], [0.6, pal[1]], [1, lit(pal[1], 0.2)]]);   // badan
    ell(c, 0, 0, rx, ry); c.fillStyle = g; c.fill(); ell(c, -rx * 0.62, 0, rx * 0.42, ry * 1.06); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
    c.save(); ell(c, 0, 0, rx, ry); c.clip(); c.fillStyle = "rgba(255,255,255,.22)"; for (let i = 0; i < 4; i++) { ell(c, rx * (0.05 + i * 0.2), -ry * 0.35 + (i % 2) * ry * 0.2, ry * 0.12, ry * 0.12); c.fill(); } c.restore();   // bintik lucu
    c.save(); ell(c, -rx * 0.1, -ry * 0.55, rx * 0.5, ry * 0.18, -0.05); c.fillStyle = "rgba(255,255,255,.3)"; c.fill(); c.restore();   // kilau
    c.strokeStyle = dark(pal[0], 0.35); c.lineWidth = 1.3; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-rx * (0.34 - i * 0.07), ry * 0.05, ry * (0.78 - i * 0.04), -0.95, 0.95); c.stroke(); }   // insang
    c.save(); c.translate(-rx * 0.22, ry * 0.45); c.rotate(fl); c.fillStyle = pal[2]; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(rx * 0.14, ry * 0.7, rx * 0.2, ry * 0.5); c.quadraticCurveTo(rx * 0.14, ry * 0.1, 0, 0); c.fill(); c.stroke(); c.restore();   // sirip dada
    ell(c, -rx * 0.78, ry * 0.32, ry * 0.2, ry * 0.15, 0.4); c.fillStyle = "rgba(255,120,110,.32)"; c.fill();   // pipi merona
    eye(c, -rx * 0.74, -ry * 0.22, ry * 0.4);   // mata besar
    c.strokeStyle = "#2b1a14"; c.lineWidth = 1.4; c.lineCap = "round"; c.beginPath(); c.arc(-rx * 0.9, ry * 0.38, ry * 0.34, 0.25, 1.9); c.stroke();   // senyum
    ell(c, -rx * 0.96, ry * 0.66, ry * 0.14, ry * 0.1); c.fillStyle = dark(pal[0], 0.1); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke(); },
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
// ---- Update Komunitas: Leviathan (desain baru, orisinal), Udang Jala, El Gran Maja ----
// LEVIATHAN: ular laut raksasa berkepala naga laut: rahang & gigi, mata menyala, jumbai tanduk, sirip punggung besar membran cyan, sisik biru tua, bintik cyan bercahaya, pose melengkung.
F.leviatan = function (c, s, t, pal) {
  const n = 26, pts = [], rad = [];
  for (let i = 0; i < n; i++) {   // k=0 kepala (kiri-atas) → k=1 ekor; busur tinggi di depan, lembah di tengah, punuk lalu ekor melengkung naik
    const k = i / (n - 1), x = (-0.47 + k * 0.94) * s, base = -s * 0.15 * Math.cos(k * 9.2 + 0.1) * (1.0 - 0.3 * k) + s * 0.03 + k * s * 0.02, w = sin(k * 5.2 - t * 1.9) * s * 0.02 * (0.25 + k);
    pts.push([x, base + w]); rad.push(s * 0.1 * (k < 0.1 ? 0.62 + k * 3.8 : Math.max(0.2, 1.0 - (k - 0.1) * 0.78)) + 1.4);
  }
  const col = pal[0], bel = pal[1], glow = pal[2];
  // sirip ekor
  { const e = pts[n - 1], d = [e[0] - pts[n - 3][0], e[1] - pts[n - 3][1]], a = Math.atan2(d[1], d[0]), wv = sin(t * 3.2) * 0.18;
    c.save(); c.translate(e[0], e[1]); c.rotate(a + wv); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.06, -s * 0.12, s * 0.16, -s * 0.15); c.quadraticCurveTo(s * 0.1, -s * 0.03, s * 0.12, 0); c.quadraticCurveTo(s * 0.1, s * 0.03, s * 0.16, s * 0.15); c.quadraticCurveTo(s * 0.06, s * 0.12, 0, 0);
    c.fillStyle = lg(c, 0, 0, s * 0.16, 0, [[0, col], [1, glow]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke(); c.restore(); }
  // sirip punggung besar (membran + duri), di belakang badan
  for (let i = 3; i < n - 3; i += 2) { const k = i / (n - 1), p = pts[i], q = pts[i + 1], nx = -(q[1] - p[1]), ny = q[0] - p[0], L = Math.hypot(nx, ny) || 1, h = rad[i] * (1.9 - k * 0.9) + s * 0.03 * (1 - k);
    const ux = -ny / L * -1, uy = nx / L * -1; const tx = p[0] + (nx / L) * -h * 1.0, ty = p[1] + (ny / L) * -h * 1.0; // arah "atas" punggung = normal ke atas
    const up = nx / L * (ny <= 0 ? 1 : -1); void ux; void uy; void up;
    const dx = q[0] - p[0], dy = q[1] - p[1], dl = Math.hypot(dx, dy) || 1, ox = dy / dl, oy = -dx / dl; // normal ke atas (y negatif)
    c.beginPath(); c.moveTo(p[0] - dx * 0.4, p[1] - dy * 0.4); c.lineTo(p[0] + ox * h - dx * 0.2, p[1] + oy * h - dy * 0.2 - 0); c.lineTo(q[0] + dx * 0.9, q[1] + dy * 0.9); c.closePath();
    c.fillStyle = lg(c, p[0], p[1], p[0] + ox * h, p[1] + oy * h, [[0, dark(col, 0.1)], [1, glow]]); c.globalAlpha = 0.92; c.fill(); c.globalAlpha = 1; c.strokeStyle = OUT; c.lineWidth = 0.9; c.stroke(); void tx; void ty; }
  // badan (ekor → kepala)
  for (let i = n - 1; i >= 1; i--) { const p = pts[i], r = rad[i];
    ell(c, p[0], p[1], r, r); c.fillStyle = lg(c, 0, p[1] - r, 0, p[1] + r, [[0, dark(col, 0.18)], [0.55, col], [0.62, lit(bel, 0.0)], [1, lit(bel, 0.25)]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    if (i % 2 === 0) { c.strokeStyle = "rgba(160,235,255,.35)"; c.lineWidth = 0.8; c.beginPath(); c.arc(p[0], p[1] - r * 0.2, r * 0.62, 3.3, 5.9); c.stroke(); }
    if (i % 3 === 1) { ell(c, p[0] - r * 0.1, p[1] - r * 0.1, r * 0.2, r * 0.2); c.fillStyle = glow; c.globalAlpha = 0.55 + 0.35 * sin(t * 2.2 + i); c.fill(); c.globalAlpha = 1; }
    c.fillStyle = "rgba(255,255,255,.18)"; ell(c, p[0] - r * 0.15, p[1] - r * 0.5, r * 0.45, r * 0.18); c.fill(); }
  // kepala naga laut
  { const h = pts[0], b = pts[2], a = Math.atan2(h[1] - b[1], h[0] - b[0]), hr = rad[2] * 1.15, open = 0.18 + 0.1 * (0.5 + 0.5 * sin(t * 1.6));
    c.save(); c.translate(h[0], h[1]); c.rotate(a);
    // jumbai tanduk/sirip belakang kepala
    for (let j = 0; j < 4; j++) { const ang = -0.55 - j * 0.28; c.beginPath(); c.moveTo(-hr * 0.2, -hr * 0.55); c.quadraticCurveTo(-hr * (1.0 + j * 0.25), -hr * (0.9 + j * 0.55) + sin(t * 2 + j) * 2, -hr * (1.7 + j * 0.28), -hr * (0.3 + j * 0.62) + sin(t * 2 + j) * 3); c.lineTo(-hr * 0.5, -hr * 0.3); c.closePath(); c.fillStyle = j % 2 ? glow : dark(glow, 0.35); c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1; c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke(); void ang; }
    // rahang bawah (membuka)
    c.save(); c.translate(-hr * 0.1, hr * 0.28); c.rotate(open); c.beginPath(); c.moveTo(0, 0); c.lineTo(hr * 1.95, hr * 0.05); c.quadraticCurveTo(hr * 2.05, hr * 0.42, hr * 1.6, hr * 0.55); c.lineTo(hr * 0.1, hr * 0.62); c.closePath();
    c.fillStyle = lg(c, 0, 0, 0, hr * 0.62, [[0, bel], [1, dark(col, 0.1)]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    c.fillStyle = "#f4f6f0"; for (let g = 0; g < 5; g++) { const gx = hr * (0.55 + g * 0.3); c.beginPath(); c.moveTo(gx, hr * 0.02); c.lineTo(gx + hr * 0.07, -hr * 0.27); c.lineTo(gx + hr * 0.15, hr * 0.02); c.fill(); }
    ell(c, hr * 0.9, hr * 0.12, hr * 0.7, hr * 0.1); c.fillStyle = "rgba(180,40,60,.7)"; c.fill(); c.restore();
    // tengkorak atas + moncong
    c.beginPath(); c.moveTo(-hr * 0.9, -hr * 0.5); c.quadraticCurveTo(-hr * 0.1, -hr * 1.25, hr * 1.1, -hr * 0.75); c.quadraticCurveTo(hr * 2.2, -hr * 0.45, hr * 2.15, hr * 0.08); c.lineTo(hr * 0.2, hr * 0.3); c.quadraticCurveTo(-hr * 0.9, hr * 0.5, -hr * 0.9, -hr * 0.5); c.closePath();
    c.fillStyle = lg(c, 0, -hr * 1.1, 0, hr * 0.4, [[0, dark(col, 0.2)], [0.6, col], [1, lit(col, 0.18)]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = "#f4f6f0"; for (let g = 0; g < 5; g++) { const gx = hr * (0.6 + g * 0.3); c.beginPath(); c.moveTo(gx, hr * 0.2); c.lineTo(gx + hr * 0.08, hr * 0.5); c.lineTo(gx + hr * 0.16, hr * 0.18); c.fill(); }
    c.strokeStyle = glow; c.lineWidth = 1.4; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(hr * 0.2, -hr * 0.62); c.quadraticCurveTo(hr * 1.2, -hr * 0.55, hr * 2.0, -hr * 0.2); c.stroke(); c.globalAlpha = 1;   // garis cahaya di dahi
    ell(c, hr * 1.9, -hr * 0.12, hr * 0.07, hr * 0.05); c.fillStyle = "#06141c"; c.fill();   // lubang hidung
    // mata menyala
    ell(c, hr * 0.62, -hr * 0.28, hr * 0.28, hr * 0.2, -0.2); c.fillStyle = glow; c.shadowColor = glow; c.shadowBlur = 8; c.fill(); c.shadowBlur = 0; c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    ell(c, hr * 0.66, -hr * 0.28, hr * 0.06, hr * 0.17, 0); c.fillStyle = "#04121a"; c.fill();
    c.restore(); }
};
// UDANG JALA: udang muara berbadan melengkung, karapas, rostrum, antena panjang, kaki renang, ekor kipas (menghadap kiri).
F.udang = function (c, s, t, pal) {
  const sw = sin(t * 4) * 0.08, n = 7; c.save(); c.scale(1.25, 1.25);
  // antena panjang
  c.strokeStyle = dark(pal[2], 0.05); c.lineWidth = 1.2; c.lineCap = "round";
  for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(-s * 0.26, -s * 0.03 + sg * s * 0.015); c.quadraticCurveTo(-s * 0.42, -s * (0.12 + sg * 0.05) + sin(t * 3 + sg) * 3, -s * 0.56, -s * (0.05 + sg * 0.1) + sin(t * 2.4 + sg) * 4); c.stroke(); }
  // kaki renang di bawah badan
  c.strokeStyle = pal[2]; c.lineWidth = 1.1; for (let i = 0; i < 5; i++) { const x = -s * 0.18 + i * s * 0.07, y = s * 0.075 - Math.abs(i - 2) * 0.004 * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x - s * 0.02, y + s * 0.055 + sin(t * 7 + i) * 2); c.stroke(); }
  // ekor kipas
  c.save(); c.translate(s * 0.31, s * 0.055); c.rotate(0.5 + sw); for (const [a, l] of [[-0.55, 0.12], [0, 0.15], [0.55, 0.12]]) { c.save(); c.rotate(a); ell(c, l * s * 0.5, 0, l * s * 0.5, s * 0.035); c.fillStyle = lg(c, 0, 0, l * s, 0, [[0, pal[0]], [1, pal[2]]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.9; c.stroke(); c.restore(); } c.restore();
  // ruas perut (melengkung naik ke ekor)
  for (let i = n - 1; i >= 0; i--) { const k = i / (n - 1), x = -s * 0.1 + k * s * 0.4, y = -s * 0.01 + Math.pow(k, 1.6) * s * 0.08 + sin(k * 2 + t * 4) * 0.8, r = s * (0.105 - k * 0.04);
    ell(c, x, y, r * 0.8, r); c.fillStyle = lg(c, 0, y - r, 0, y + r, [[0, lit(pal[0], 0.1)], [0.6, pal[0]], [1, pal[1]]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    c.strokeStyle = pal[2]; c.lineWidth = 1.1; c.beginPath(); c.arc(x, y, r * 0.95, -1.2, 1.2); c.stroke(); }
  // karapas (kepala-dada) + rostrum
  ell(c, -s * 0.16, -s * 0.01, s * 0.15, s * 0.115); c.fillStyle = lg(c, 0, -s * 0.12, 0, s * 0.1, [[0, lit(pal[0], 0.12)], [0.65, pal[0]], [1, pal[1]]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
  c.beginPath(); c.moveTo(-s * 0.28, -s * 0.045); c.lineTo(-s * 0.4, -s * 0.085); c.lineTo(-s * 0.285, -s * 0.0); c.closePath(); c.fillStyle = pal[2]; c.fill(); c.strokeStyle = OUT; c.stroke();
  c.fillStyle = "rgba(255,255,255,.35)"; ell(c, -s * 0.2, -s * 0.06, s * 0.07, s * 0.025, -0.2); c.fill();
  eye(c, -s * 0.255, -s * 0.045, s * 0.03); c.restore();
};
// EL GRAN MAJA: hiu purba raksasa orisinal Nusa Island — badan pasir-emas, deretan guratan "prasasti" emas di sisi, rahang bergigi, mata menyala keemasan.
F.maja = function (c, s, t, pal) {
  const sw = sin(t * 2.6) * s * 0.03, rx = s * 0.42, ry = s * 0.15;
  c.fillStyle = dark(pal[0], 0.1); c.beginPath(); c.moveTo(rx * 0.72, 0); c.quadraticCurveTo(rx + s * 0.04, -ry * 0.9 + sw, rx + s * 0.17, -ry * 2.5 + sw); c.lineTo(rx + s * 0.07, sw * 0.5); c.lineTo(rx + s * 0.13, ry * 1.4 + sw); c.quadraticCurveTo(rx + s * 0.03, ry * 0.4, rx * 0.72, 0); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.1; c.stroke();
  const g = lg(c, 0, -ry, 0, ry, [[0, dark(pal[0], 0.2)], [0.58, pal[0]], [0.64, pal[1]], [1, lit(pal[1], 0.15)]]);
  c.beginPath(); c.moveTo(-rx, ry * 0.12); c.quadraticCurveTo(-rx * 0.6, -ry * 1.35, rx * 0.15, -ry * 1.1); c.lineTo(rx * 0.78, -ry * 0.08); c.quadraticCurveTo(rx * 0.1, ry * 1.5, -rx * 0.55, ry * 1.1); c.quadraticCurveTo(-rx * 0.9, ry * 0.7, -rx, ry * 0.12); c.closePath(); c.fillStyle = g; c.fill(); c.lineWidth = 1.3; c.stroke();
  c.fillStyle = dark(pal[0], 0.15); c.beginPath(); c.moveTo(-rx * 0.08, -ry * 1.05); c.lineTo(rx * 0.12, -ry * 3.0); c.lineTo(rx * 0.4, -ry * 0.95); c.closePath(); c.fill(); c.stroke();   // sirip punggung
  c.beginPath(); c.moveTo(-rx * 0.28, ry * 0.9); c.lineTo(-rx * 0.1, ry * 2.4 + sin(t * 2.6) * 2); c.lineTo(rx * 0.12, ry * 0.95); c.closePath(); c.fill(); c.stroke();            // sirip dada
  // guratan prasasti emas
  c.strokeStyle = pal[2]; c.lineWidth = 1.5; c.globalAlpha = 0.75 + 0.2 * sin(t * 2);
  for (let i = 0; i < 6; i++) { const x = -rx * 0.35 + i * rx * 0.2, y = -ry * 0.1 + (i % 2) * ry * 0.18; c.beginPath(); c.moveTo(x, y - ry * 0.28); c.lineTo(x + rx * 0.06, y - ry * 0.28); c.lineTo(x + rx * 0.06, y); c.lineTo(x + rx * 0.12, y); c.lineTo(x + rx * 0.12, y + ry * 0.28); c.stroke(); }
  c.globalAlpha = 1;
  c.fillStyle = "#f6f2e2"; for (let i = 0; i < 6; i++) { const x = -rx * 0.98 + i * rx * 0.085; c.beginPath(); c.moveTo(x, ry * 0.4); c.lineTo(x + rx * 0.03, ry * 0.72); c.lineTo(x + rx * 0.06, ry * 0.4); c.fill(); }
  ell(c, -rx * 0.62, -ry * 0.22, ry * 0.2, ry * 0.2); c.fillStyle = pal[2]; c.shadowColor = pal[2]; c.shadowBlur = 8; c.fill(); c.shadowBlur = 0; c.strokeStyle = OUT; c.stroke(); ell(c, -rx * 0.64, -ry * 0.2, ry * 0.07, ry * 0.12); c.fillStyle = "#1a1208"; c.fill();
};
// OWNER FISH: ikan istimewa orisinal Nusa Island — badan biru-kerajaan dengan sisik emas, MAHKOTA EMAS bertakhta permata, mata menyala, sirip berkilau; cahaya elegan (aura + kerlip bintang kecil) ringan untuk Android.
F.owner = function (c, s, t, pal) {
  const sw = sin(t * 2.4) * s * 0.025, rx = s * 0.34, ry = s * 0.17, gold = pal[2], blue = pal[0], cream = pal[1];
  // aura lembut
  const ag = c.createRadialGradient(0, 0, ry * 0.4, 0, 0, s * 0.5); ag.addColorStop(0, "rgba(255,214,90," + (0.28 + 0.1 * sin(t * 2.2)).toFixed(3) + ")"); ag.addColorStop(1, "rgba(255,214,90,0)");
  c.fillStyle = ag; c.beginPath(); c.arc(0, 0, s * 0.5, 0, TAU); c.fill();
  // ekor kipas emas-biru (mengalir)
  c.beginPath(); c.moveTo(rx * 0.75, 0); c.quadraticCurveTo(rx + s * 0.08, -ry * 0.5 + sw, rx + s * 0.2, -ry * 1.6 + sw * 1.4); c.quadraticCurveTo(rx + s * 0.13, sw * 0.4, rx + s * 0.21, ry * 1.5 + sw * 1.4); c.quadraticCurveTo(rx + s * 0.08, ry * 0.5 + sw, rx * 0.75, 0); c.closePath();
  c.fillStyle = lg(c, rx * 0.7, 0, rx + s * 0.22, 0, [[0, blue], [0.55, gold], [1, lit(gold, 0.45)]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.1; c.stroke();
  // sirip punggung & perut (gradasi emas)
  c.fillStyle = lg(c, 0, -ry * 2, 0, -ry, [[0, lit(gold, 0.35)], [1, dark(gold, 0.1)]]);
  c.beginPath(); c.moveTo(-rx * 0.15, -ry * 0.92); c.quadraticCurveTo(rx * 0.05, -ry * 2.1 + sw, rx * 0.5, -ry * 0.8); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-rx * 0.05, ry * 0.9); c.quadraticCurveTo(rx * 0.2, ry * 1.75 - sw, rx * 0.4, ry * 0.8); c.closePath(); c.fill(); c.stroke();
  // badan: biru kerajaan di punggung → emas pucat di perut
  const g = lg(c, 0, -ry, 0, ry, [[0, dark(blue, 0.15)], [0.42, blue], [0.58, mixc(blue, gold, 0.55)], [1, lit(cream, 0.25)]]);
  ell(c, 0, 0, rx, ry); c.fillStyle = g; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
  // sisik emas (busur bertumpuk, dipotong ke dalam badan)
  c.save(); ell(c, 0, 0, rx * 0.98, ry * 0.98); c.clip();
  for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) { const x = -rx * 0.55 + i * rx * 0.15 + (row % 2) * rx * 0.075, y = -ry * 0.7 + row * ry * 0.36, r = ry * 0.2;
    c.beginPath(); c.arc(x, y, r, 0.15, Math.PI - 0.15); c.strokeStyle = "rgba(255,214,90," + (0.55 + 0.25 * sin(t * 2 + i * 0.7 + row)).toFixed(2) + ")"; c.lineWidth = 1.2; c.stroke(); }
  c.restore();
  // kilau punggung
  c.save(); ell(c, -rx * 0.1, -ry * 0.5, rx * 0.55, ry * 0.18, -0.04); c.fillStyle = "rgba(255,255,255,.3)"; c.fill(); c.restore();
  // insang emas
  c.strokeStyle = gold; c.lineWidth = 1.6; c.beginPath(); c.arc(-rx * 0.4, 0, ry * 0.8, -0.9, 0.9); c.stroke();
  // MAHKOTA EMAS (di kepala, menghadap kiri): 5 ujung + permata
  const cx0 = -rx * 0.6, cy0 = -ry * 0.9, cw = rx * 0.52, ch = ry * 1.2, bob = sin(t * 2.4) * 0.8;
  c.save(); c.translate(0, bob); c.beginPath(); c.moveTo(cx0 - cw * 0.5, cy0 + ch * 0.1); c.lineTo(cx0 - cw * 0.5, cy0 - ch * 0.55); c.lineTo(cx0 - cw * 0.25, cy0 - ch * 0.2); c.lineTo(cx0, cy0 - ch * 0.95); c.lineTo(cx0 + cw * 0.25, cy0 - ch * 0.2); c.lineTo(cx0 + cw * 0.5, cy0 - ch * 0.55); c.lineTo(cx0 + cw * 0.5, cy0 + ch * 0.1); c.closePath();
  c.fillStyle = lg(c, 0, cy0 - ch, 0, cy0 + ch * 0.1, [[0, "#fff3b0"], [0.5, gold], [1, dark(gold, 0.25)]]); c.shadowColor = gold; c.shadowBlur = 7; c.fill(); c.shadowBlur = 0; c.strokeStyle = "rgba(90,60,5,.7)"; c.lineWidth = 1.1; c.stroke();
  for (const [gx, gy, gc] of [[cx0, cy0 - ch * 0.35, "#ff4f6a"], [cx0 - cw * 0.3, cy0 - ch * 0.05, "#35e8ff"], [cx0 + cw * 0.3, cy0 - ch * 0.05, "#35e8ff"]]) { ell(c, gx, gy, cw * 0.09, cw * 0.09); c.fillStyle = gc; c.fill(); }
  c.restore();
  // mata berkilau
  const ex = -rx * 0.68, ey = -ry * 0.12; ell(c, ex, ey, ry * 0.3, ry * 0.3); c.fillStyle = "#fff6c8"; c.shadowColor = "#fff0a0"; c.shadowBlur = 9 + 4 * sin(t * 3); c.fill(); c.shadowBlur = 0; c.strokeStyle = OUT; c.stroke();
  ell(c, ex - ry * 0.03, ey + ry * 0.02, ry * 0.17, ry * 0.17); c.fillStyle = "#1b2b66"; c.fill(); ell(c, ex - ry * 0.1, ey - ry * 0.08, ry * 0.07, ry * 0.07); c.fillStyle = "#fff"; c.fill();
  // kerlip bintang kecil (6 titik, ringan)
  for (let i = 0; i < 6; i++) { const a = t * 0.9 + i * 1.05, px = cos(a * 1.3 + i) * s * 0.4, py = sin(a * 0.9 + i * 2) * ry * 1.8, k = Math.max(0, sin(t * 3 + i * 1.7)); if (k < 0.15) continue;
    c.fillStyle = "rgba(255,240,170," + k.toFixed(2) + ")"; c.beginPath(); c.moveTo(px, py - 3 * k); c.lineTo(px + 1.2, py - 1.2); c.lineTo(px + 3 * k, py); c.lineTo(px + 1.2, py + 1.2); c.lineTo(px, py + 3 * k); c.lineTo(px - 1.2, py + 1.2); c.lineTo(px - 3 * k, py); c.lineTo(px - 1.2, py - 1.2); c.closePath(); c.fill(); }
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
