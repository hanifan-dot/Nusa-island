// =========================================================
//  NUSA ISLAND — gambar Rumahku: 10 model eksterior kampung Nusantara,
//  interior per level, perabot, dan halaman pribadi.
//  Semua prosedural (Canvas 2D isometrik), memakai NW.P dari draw.js.
// =========================================================
(() => {
"use strict";
const P = NW.P, shade = NW.shade, mix = NW.mix, rgba = NW.rgba;
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y); c.closePath(); }
const line = (c, a, b) => { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Spesifikasi eksterior per level ----------
// fw/fd: tapak rumah (tile), stilts: tinggi kolong (px), h: tinggi dinding, rh: tinggi atap
const EXT = [
  null,
  { fw: 2.4, fd: 2.2, stilts: 0, h: 30, rh: 30, wall: "bambu", roof: "rumbia", windows: 1, porch: null, stairs: 0, extras: ["jemuran", "jaring"] },
  { fw: 3.0, fd: 2.5, stilts: 0, h: 34, rh: 30, wall: "papan", roof: "sirap", windows: 2, porch: { d: 0.8, posts: 2, rail: false, roof: "lean" }, stairs: 0, extras: ["jemuran", "potBunga"] },
  { fw: 3.2, fd: 2.8, stilts: 0, h: 36, rh: 32, wall: "papanCat", roof: "genteng", windows: 2, porch: { d: 0.9, posts: 2, rail: true, roof: "lean" }, stairs: 0, extras: ["pagarBambu", "kebun", "rakLuar", "potBunga"] },
  { fw: 3.4, fd: 3.0, stilts: 24, h: 36, rh: 34, wall: "papan", roof: "genteng", windows: 3, porch: { d: 0.9, posts: 3, rail: true, roof: "lean" }, stairs: 1, extras: ["pagarBambu", "kebun", "kolong"] },
  { fw: 3.8, fd: 3.2, stilts: 18, h: 38, rh: 36, wall: "papanCat", roof: "gentengLebar", windows: 3, porch: { d: 1.3, posts: 4, rail: true, roof: "main" }, stairs: 1, extras: ["pagarBambu", "kebun", "lentera", "kolong"] },
  { fw: 4.2, fd: 3.4, stilts: 20, h: 40, rh: 40, wall: "ukir", roof: "gentengSilang", windows: 3, porch: { d: 1.2, posts: 4, rail: true, roof: "main", carved: true }, stairs: 2, extras: ["pagarKayu", "kebun", "lentera"], ornament: 1, doubleDoor: true },
  { fw: 4.8, fd: 3.6, stilts: 16, h: 42, rh: 42, wall: "ukir", roof: "gentengSilang", windows: 4, porch: { d: 1.6, posts: 5, rail: true, roof: "main", carved: true }, stairs: 2, extras: ["pagarKayu", "gudang", "jalanBatu", "kebun", "lentera"], ornament: 1, doubleDoor: true },
  { fw: 5.2, fd: 3.8, stilts: 30, h: 44, rh: 34, wall: "ukirGelap", roof: "tingkat", windows: 4, porch: { d: 1.4, posts: 5, rail: true, roof: "main", carved: true }, stairs: 3, balcony: true, extras: ["pagarKayu", "jalanBatu", "kebun", "lentera", "gudang"], ornament: 2, doubleDoor: true },
  { fw: 5.6, fd: 4.0, stilts: 26, h: 46, rh: 36, wall: "ukirGelap", roof: "tingkat", windows: 5, porch: { d: 1.6, posts: 6, rail: true, roof: "main", carved: true }, stairs: 3, balcony: true, extras: ["pagarKayu", "jalanBatu", "tamanBunga", "paviliun", "lentera"], ornament: 2, doubleDoor: true, carvedPillars: true },
  { fw: 6.0, fd: 4.2, stilts: 30, h: 48, rh: 44, wall: "ukirEmas", roof: "gonjong", windows: 5, porch: { d: 1.8, posts: 7, rail: true, roof: "main", carved: true }, stairs: 4, balcony: true, extras: ["pagarKayu", "jalanBatu", "tamanBunga", "paviliun", "kolam", "obor", "lentera"], ornament: 3, doubleDoor: true, carvedPillars: true },
];

// ---------- Halaman pribadi ----------
const PW = 16, PH = 14, HX = 8, HY0 = 1.7;
// tapak rumah + teras + tangga di halaman untuk level lv
function plotLayout(lv) {
  const e = EXT[lv], x0 = HX - e.fw / 2, x1 = HX + e.fw / 2, y0 = HY0, y1 = HY0 + e.fd;
  const pd = e.porch ? e.porch.d : 0, sl = e.stairs ? 0.35 + e.stairs * 0.22 : 0;
  const house = { x0, y0, x1, y1 }, porch = e.porch ? { x0: x0 + 0.15, y0: y1, x1: x1 - 0.15, y1: y1 + pd } : null;
  const stairs = sl ? { x0: HX - (e.stairs >= 3 ? 0.9 : 0.5), y0: y1 + pd, x1: HX + (e.stairs >= 3 ? 0.9 : 0.5), y1: y1 + pd + sl } : null;
  const doorPt = { x: HX, y: y1 + pd + sl + 0.45 };
  const ex = {};
  if (e.extras.includes("gudang")) ex.gudang = { x0: 12.6, y0: 2.4, x1: 14.2, y1: 3.8 };
  if (e.extras.includes("paviliun")) ex.paviliun = { x0: 1.2, y0: 2.2, x1: 3.2, y1: 4.2 };
  if (e.extras.includes("kolam")) ex.kolam = { x0: 10.8, y0: 9.6, x1: 13.6, y1: 11.4 };
  if (e.extras.includes("rakLuar")) ex.rakLuar = { x0: 12.0, y0: 3.0, x1: 12.8, y1: 3.5 };
  if (e.extras.includes("jemuran")) ex.jemuran = { x0: 11.6, y0: 4.4, x1: 13.8, y1: 4.6 };
  if (e.extras.includes("kebun")) ex.kebun = [{ x0: 2.0, y0: 8.4, x1: 3.8, y1: 9.4 }, { x0: 12.2, y0: 6.4, x1: 13.8, y1: 7.6 }];
  if (e.extras.includes("tamanBunga")) ex.taman = [{ x0: 1.4, y0: 6.0, x1: 3.6, y1: 7.0 }, { x0: 12.0, y0: 6.0, x1: 14.2, y1: 7.2 }, { x0: 4.4, y0: 10.6, x1: 6.0, y1: 11.4 }];
  return { e, house, porch, stairs, doorPt, ex, gate: { x: 2.4, y: 12.7 }, sign: { x: 5.4, y: 10.6 }, mailbox: { x: 10.0, y: 9.4 } };
}
const PLOT_SOLIDS = (L) => {
  const s = [L.house]; if (L.porch) s.push({ ...L.porch, y1: L.porch.y1 - 0.05 });
  for (const k of ["gudang", "paviliun", "kolam", "rakLuar"]) if (L.ex[k]) s.push(L.ex[k]);
  for (const k of ["kebun", "taman"]) if (L.ex[k]) s.push(...L.ex[k]);
  s.push({ x0: L.gate.x - 0.75, y0: L.gate.y - 0.15, x1: L.gate.x - 0.45, y1: L.gate.y + 0.15 }, { x0: L.gate.x + 0.45, y0: L.gate.y - 0.15, x1: L.gate.x + 0.75, y1: L.gate.y + 0.15 });
  s.push({ x0: L.sign.x - 0.15, y0: L.sign.y - 0.15, x1: L.sign.x + 0.15, y1: L.sign.y + 0.15 }, { x0: L.mailbox.x - 0.15, y0: L.mailbox.y - 0.15, x1: L.mailbox.x + 0.15, y1: L.mailbox.y + 0.15 });
  return s;
};

// ---------- Bagian rumah ----------
const quadY = (x0, x1, y, z0, z1) => [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)];
const quadX = (x, y0, y1, z0, z1) => [P(x, y1, z0), P(x, y0, z0), P(x, y0, z1), P(x, y1, z1)];
const WALLS = {
  bambu: { base: "#c9a86a", line: "#9c7a40" }, papan: { base: "#c99a62", line: "#8a5a32" }, papanCat: { base: "#efe0bd", line: "#b8996a", trim: "#3f7a5e" },
  ukir: { base: "#9a6a3c", line: "#6e4628", band: "#e0b84c" }, ukirGelap: { base: "#6e4628", line: "#4a2e18", band: "#e0b84c" }, ukirEmas: { base: "#5a3a20", line: "#3a2410", band: "#f0c75a" },
};
function wallFace(c, face, b, z0, h, style, t) {
  const W = WALLS[style], q = face === "y" ? quadY(b.x0, b.x1, b.y1, z0, z0 + h) : quadX(b.x1, b.y0, b.y1, z0, z0 + h);
  c.fillStyle = face === "y" ? W.base : shade(W.base, -0.18); poly(c, q); c.fill();
  c.strokeStyle = rgba(W.line, 0.55); c.lineWidth = 1;
  const len = face === "y" ? b.x1 - b.x0 : b.y1 - b.y0;
  const at = (u, v) => face === "y" ? P(b.x0 + u * len, b.y1, z0 + v * h) : P(b.x1, b.y1 - u * len, z0 + v * h);
  if (style === "bambu") { for (let u = 0.04; u < 1; u += 0.06) line(c, at(u, 0), at(u, 1)); c.strokeStyle = rgba(W.line, 0.8); line(c, at(0, 0.5), at(1, 0.5)); }
  else for (let v = 0.12; v < 1; v += 0.14) line(c, at(0, v), at(1, v));
  if (W.band) { // pita ukiran atas & bawah
    for (const [v0, v1] of [[0.86, 0.98], [0.02, 0.12]]) {
      const qb = [at(0, v0), at(1, v0), at(1, v1), at(0, v1)]; c.fillStyle = shade(W.base, -0.25); poly(c, qb); c.fill();
      c.fillStyle = W.band; const n = Math.max(4, Math.round(len * 5));
      for (let i = 0; i < n; i++) { const m = at((i + 0.5) / n, (v0 + v1) / 2); c.beginPath(); c.moveTo(m.x - 2.5, m.y); c.lineTo(m.x, m.y - 2.5); c.lineTo(m.x + 2.5, m.y); c.lineTo(m.x, m.y + 2.5); c.closePath(); c.fill(); }
    }
  }
  if (W.trim) { c.strokeStyle = W.trim; c.lineWidth = 2.5; line(c, at(0, 0.02), at(1, 0.02)); line(c, at(0, 0.98), at(1, 0.98)); }
  return at;
}
function windowAt(c, at, u, w, night, carved) {
  const q = (u0, u1, v0, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  c.fillStyle = carved ? "#3a2410" : "#5b3a22"; poly(c, q(u - w / 2 - 0.02, u + w / 2 + 0.02, 0.3, 0.82)); c.fill();
  c.fillStyle = night > 0.35 ? mix("#7fb3c8", "#ffd27a", clamp((night - 0.35) * 2.5, 0, 1)) : "#8cc3d6"; poly(c, q(u - w / 2, u + w / 2, 0.34, 0.78)); c.fill();
  c.fillStyle = carved ? "#3a2410" : "#5b3a22"; poly(c, q(u - 0.006, u + 0.006, 0.34, 0.78)); c.fill(); poly(c, q(u - w / 2, u + w / 2, 0.55, 0.57)); c.fill();
  if (carved) { c.fillStyle = "#e0b84c"; poly(c, q(u - w / 2 - 0.03, u + w / 2 + 0.03, 0.82, 0.88)); c.fill(); }
  else { c.fillStyle = "#3f7a5e"; poly(c, q(u - w / 2 - 0.08, u - w / 2 - 0.02, 0.32, 0.8)); c.fill(); poly(c, q(u + w / 2 + 0.02, u + w / 2 + 0.08, 0.32, 0.8)); c.fill(); }
}
function doorAt(c, at, u, w, dbl, col) {
  const q = (u0, u1, v0, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  c.fillStyle = shade(col, -0.3); poly(c, q(u - w / 2 - 0.02, u + w / 2 + 0.02, 0, 0.74)); c.fill();
  c.fillStyle = col; poly(c, q(u - w / 2, u + w / 2, 0, 0.7)); c.fill();
  if (dbl) { c.fillStyle = shade(col, -0.3); poly(c, q(u - 0.004, u + 0.004, 0, 0.7)); c.fill(); c.fillStyle = "#e0b84c"; poly(c, q(u - w / 2 + 0.02, u + w / 2 - 0.02, 0.6, 0.64)); c.fill(); }
  c.fillStyle = "#e0b84c"; poly(c, q(u + w * 0.3, u + w * 0.36, 0.3, 0.36)); c.fill();
}
// atap pelana sepanjang sumbu x (bubungan sejajar x)
function gable(c, b, z, rh, o, col, kind, t) {
  const ym = (b.y0 + b.y1) / 2, X0 = b.x0 - o, X1 = b.x1 + o;
  c.fillStyle = shade(col, -0.25); poly(c, [P(X0, b.y0 - o, z), P(X1, b.y0 - o, z), P(X1, ym, z + rh), P(X0, ym, z + rh)]); c.fill();
  c.fillStyle = kind === "rumbia" ? shade(col, -0.1) : "#8a5a32"; poly(c, [P(b.x1, b.y1, z), P(b.x1, b.y0, z), P(b.x1, ym, z + rh * 0.92)]); c.fill(); // segitiga
  const front = [P(X0, b.y1 + o, z - 4), P(X1, b.y1 + o, z - 4), P(X1, ym, z + rh), P(X0, ym, z + rh)];
  c.fillStyle = col; poly(c, front); c.fill();
  // tekstur
  const rows = kind === "rumbia" ? 6 : 5;
  c.strokeStyle = rgba(shade(col, -0.4), kind === "rumbia" ? 0.45 : 0.55); c.lineWidth = kind === "rumbia" ? 1.6 : 1.2;
  for (let k = 1; k < rows; k++) { const tt = k / rows, yy = b.y1 + o + (ym - b.y1 - o) * tt, zz = z - 4 + (rh + 4) * tt; line(c, P(X0, yy, zz), P(X1, yy, zz)); }
  if (kind === "sirap") { c.strokeStyle = rgba(shade(col, -0.45), 0.4); c.lineWidth = 0.8; for (let k = 0; k < rows; k++) for (let i = 0; i < (X1 - X0) * 4; i++) { const tt = (k + 0.5) / rows, x = X0 + (i + (k % 2) * 0.5) / 4, yy = b.y1 + o + (ym - b.y1 - o) * tt, zz = z - 4 + (rh + 4) * tt; const a = P(x, yy, zz - 3), bb = P(x, yy, zz + 3); line(c, a, bb); } }
  if (kind === "rumbia") { // rumbai jerami di tepi bawah
    c.strokeStyle = shade(col, -0.3); c.lineWidth = 1.2;
    for (let x = X0; x < X1; x += 0.12) { const a = P(x, b.y1 + o, z - 4); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + Math.sin(x * 9) * 1.5, a.y + 5 + Math.sin(x * 13) * 1.5); c.stroke(); }
  }
  c.strokeStyle = shade(col, -0.5); c.lineWidth = 3; line(c, P(X0, ym, z + rh), P(X1, ym, z + rh));
  c.strokeStyle = shade(col, -0.35); c.lineWidth = 2; line(c, P(X1, b.y1 + o, z - 4), P(X1, ym, z + rh));
  return { ym, X0, X1, top: z + rh };
}
// ornamen silang (selembayung) di ujung bubungan
function crossedHorns(c, x, y, z, s, gold) {
  const a = P(x, y, z);
  c.strokeStyle = gold ? "#f0c75a" : "#5a3a20"; c.lineWidth = 2.5; c.lineCap = "round";
  c.beginPath(); c.moveTo(a.x - 3 * s, a.y + 2); c.quadraticCurveTo(a.x + 2 * s, a.y - 8 * s, a.x + 8 * s, a.y - 16 * s); c.stroke();
  c.beginPath(); c.moveTo(a.x + 3 * s, a.y + 2); c.quadraticCurveTo(a.x - 2 * s, a.y - 8 * s, a.x - 8 * s, a.y - 16 * s); c.stroke();
}
// atap gonjong: bubungan melengkung, ujung naik seperti tanduk, bertingkat
function gonjong(c, b, z, rh, o, col, t) {
  const ym = (b.y0 + b.y1) / 2, X0 = b.x0 - o, X1 = b.x1 + o;
  // atap bawah (rok) mengelilingi
  const skirt = 0.55;
  c.fillStyle = shade(col, -0.2); poly(c, [P(X0 - skirt, b.y1 + o + skirt, z - 10), P(X1 + skirt, b.y1 + o + skirt, z - 10), P(X1, b.y1 + o * 0.3, z + 6), P(X0, b.y1 + o * 0.3, z + 6)]); c.fill();
  c.fillStyle = shade(col, -0.32); poly(c, [P(X1 + skirt, b.y0 - o - skirt * 0.4, z - 10), P(X1 + skirt, b.y1 + o + skirt, z - 10), P(X1, b.y1 + o * 0.3, z + 6), P(X1, b.y0 - o * 0.3, z + 6)]); c.fill();
  // atap utama melengkung
  const N = 16, ridge = (k) => { const u = k / N; return { x: X0 + (X1 - X0) * u, z: z + rh + Math.pow(Math.abs(u - 0.5) * 2, 2.4) * 30 }; };
  c.fillStyle = shade(col, -0.28);
  c.beginPath(); let p = P(X0, b.y0 - o, z + 6); c.moveTo(p.x, p.y); p = P(X1, b.y0 - o, z + 6); c.lineTo(p.x, p.y);
  for (let k = N; k >= 0; k--) { const r = ridge(k), q = P(r.x, ym, r.z); c.lineTo(q.x, q.y); } c.closePath(); c.fill();
  c.fillStyle = col;
  c.beginPath(); p = P(X0, b.y1 + o, z + 6); c.moveTo(p.x, p.y); p = P(X1, b.y1 + o, z + 6); c.lineTo(p.x, p.y);
  for (let k = N; k >= 0; k--) { const r = ridge(k), q = P(r.x, ym, r.z); c.lineTo(q.x, q.y); } c.closePath(); c.fill();
  c.strokeStyle = rgba(shade(col, -0.45), 0.5); c.lineWidth = 1.1;
  for (let j = 1; j < 6; j++) { const tt = j / 6; c.beginPath(); for (let k = 0; k <= N; k++) { const r = ridge(k), yy = b.y1 + o + (ym - b.y1 - o) * tt, zz = z + 6 + (r.z - z - 6) * tt, q = P(r.x, yy, zz); k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); } c.stroke(); }
  // segitiga depan berukir emas
  const r1 = ridge(N);
  c.fillStyle = "#5a3a20"; poly(c, [P(b.x1, b.y1, z + 6), P(b.x1, b.y0, z + 6), P(b.x1, ym, r1.z - 6)]); c.fill();
  c.strokeStyle = "#f0c75a"; c.lineWidth = 1.4;
  for (let k = 1; k < 4; k++) { const tt = k / 4; line(c, P(b.x1, b.y1 - (b.y1 - ym) * tt * 0.9, z + 6 + (r1.z - z - 12) * tt * 0.5), P(b.x1, b.y0 + (ym - b.y0) * tt * 0.9, z + 6 + (r1.z - z - 12) * tt * 0.5)); }
  c.strokeStyle = shade(col, -0.55); c.lineWidth = 3; c.beginPath();
  for (let k = 0; k <= N; k++) { const r = ridge(k), q = P(r.x, ym, r.z); k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); } c.stroke();
  // ujung tanduk emas berkilau
  for (const k of [0, N]) { const r = ridge(k), q = P(r.x, ym, r.z); c.fillStyle = "#f0c75a"; c.beginPath(); c.arc(q.x, q.y - 3, 3.2 + Math.sin(t * 3) * 0.4, 0, 7); c.fill(); }
  return { ym, top: z + rh + 30 };
}
function stairsDraw(c, L, zTop, steps, wood) {
  const s = L.stairs; if (!s) return;
  const n = Math.max(3, steps * 2);
  for (let i = 0; i < n; i++) {
    const k = (i + 1) / (n + 1), z = zTop * (1 - k), y = s.y0 + (s.y1 - s.y0) * k;
    c.fillStyle = shade(wood, -0.25); poly(c, [P(s.x0, y + 0.12, z), P(s.x1, y + 0.12, z), P(s.x1, y + 0.12, z - 3), P(s.x0, y + 0.12, z - 3)]); c.fill();
    c.fillStyle = wood; poly(c, [P(s.x0, y - 0.04, z), P(s.x1, y - 0.04, z), P(s.x1, y + 0.12, z), P(s.x0, y + 0.12, z)]); c.fill();
  }
  c.strokeStyle = shade(wood, -0.4); c.lineWidth = 2.5;
  line(c, P(s.x0, s.y0, zTop + 14), P(s.x0, s.y1, 12)); line(c, P(s.x1, s.y0, zTop + 14), P(s.x1, s.y1, 12));
}
function railing(c, x0, x1, y, z, carved) {
  c.strokeStyle = carved ? "#3a2410" : "#6b4527"; c.lineWidth = 2;
  line(c, P(x0, y, z + 14), P(x1, y, z + 14));
  c.lineWidth = 1.2; for (let x = x0; x <= x1 + 1e-3; x += 0.2) line(c, P(x, y, z), P(x, y, z + 14));
  if (carved) { c.fillStyle = "#e0b84c"; for (let x = x0 + 0.1; x < x1; x += 0.4) { const p = P(x, y, z + 7); c.beginPath(); c.arc(p.x, p.y, 1.6, 0, 7); c.fill(); } }
}
function lantern(c, x, y, z, t, night) {
  const p = P(x, y, z);
  c.strokeStyle = "#3a2a1a"; c.lineWidth = 1; line(c, { x: p.x, y: p.y - 10 }, { x: p.x, y: p.y - 4 });
  c.fillStyle = "#c2603b"; c.beginPath(); c.ellipse(p.x, p.y + 2, 4.5, 6, 0, 0, 7); c.fill();
  c.fillStyle = night > 0.3 ? "#ffe29a" : "#f6c96a"; c.beginPath(); c.ellipse(p.x, p.y + 2, 2.4, 3.6, 0, 0, 7); c.fill();
}

// ---------- Eksterior lengkap ----------
// dipakai di halaman (scene) dan di pratinjau renovasi
function drawExterior(c, lv, t, night, opts = {}) {
  const L = plotLayout(lv), e = L.e, b = L.house, z0 = e.stilts, wall = e.wall;
  const wood = e.ornament >= 2 ? "#5a3a20" : "#7a5233";
  // bayangan
  c.fillStyle = "rgba(20,40,30,.2)"; poly(c, [P(b.x1, b.y0), P(b.x1 + 1.4, b.y0 + 0.3), P(b.x1 + 1.4, b.y1 + (L.porch ? L.porch.y1 - b.y1 : 0) + 0.3), P(b.x0 + 0.4, b.y1 + (L.porch ? L.porch.y1 - b.y1 : 0) + 0.3), P(b.x0, b.y1)]); c.fill();
  // tiang kolong & isi kolong
  if (z0) {
    const posts = []; for (let x = b.x0 + 0.1; x <= b.x1; x += Math.max(0.6, (b.x1 - b.x0) / 6)) posts.push([x, b.y1 - 0.1]); for (let y = b.y0 + 0.2; y < b.y1; y += 0.9) posts.push([b.x1 - 0.1, y]);
    if (e.extras.includes("kolong")) { // perahu kecil & kayu bakar di kolong
      const k = P(b.x0 + (b.x1 - b.x0) * 0.4, b.y0 + (b.y1 - b.y0) * 0.6, 0);
      c.fillStyle = "#7a5230"; c.beginPath(); c.ellipse(k.x, k.y - 3, 22, 6, 0.46, 0, 7); c.fill();
      c.fillStyle = "#a8743f"; for (let i = 0; i < 4; i++) c.fillRect(k.x + 18 + i * 4, k.y - 10 - (i % 2) * 3, 3, 10);
    }
    for (const [x, y] of posts) {
      const a = P(x, y, z0), g = P(x, y, 0);
      c.fillStyle = e.carvedPillars ? "#4a2e18" : "#6b4527"; c.fillRect(a.x - 3, a.y, 6, g.y - a.y);
      if (e.carvedPillars) { c.fillStyle = "#e0b84c"; for (let k = 0.25; k < 1; k += 0.35) c.fillRect(a.x - 3, a.y + (g.y - a.y) * k, 6, 2); }
      c.fillStyle = "#8d9192"; c.beginPath(); c.ellipse(g.x, g.y, 5, 2.2, 0, 0, 7); c.fill(); // umpak batu
    }
    // lantai panggung
    c.fillStyle = shade(wood, -0.15); poly(c, quadY(b.x0 - 0.08, b.x1 + 0.08, b.y1 + 0.08, z0 - 5, z0)); c.fill(); poly(c, quadX(b.x1 + 0.08, b.y0 - 0.08, b.y1 + 0.08, z0 - 5, z0)); c.fill();
  }
  // teras
  if (L.porch) {
    const p = L.porch, pz = z0;
    c.fillStyle = shade(wood, 0.15); poly(c, [P(p.x0, p.y0, pz), P(p.x1, p.y0, pz), P(p.x1, p.y1, pz), P(p.x0, p.y1, pz)]); c.fill();
    c.strokeStyle = rgba("#3a2410", 0.25); c.lineWidth = 1; for (let x = p.x0 + 0.25; x < p.x1; x += 0.25) line(c, P(x, p.y0, pz), P(x, p.y1, pz));
    c.fillStyle = shade(wood, -0.25); poly(c, quadY(p.x0, p.x1, p.y1, pz - 5, pz)); c.fill(); poly(c, quadX(p.x1, p.y0, p.y1, pz - 5, pz)); c.fill();
    if (z0) { c.fillStyle = "#6b4527"; for (const x of [p.x0 + 0.08, p.x1 - 0.08]) { const a = P(x, p.y1 - 0.08, pz), g = P(x, p.y1 - 0.08, 0); c.fillRect(a.x - 2.5, a.y, 5, g.y - a.y); } }
  }
  // dinding
  const atY = wallFace(c, "y", b, z0, e.h, wall, t), atX = wallFace(c, "x", b, z0, e.h, wall, t);
  const carved = !!e.ornament;
  const n = e.windows, doorU = 0.5, dw = e.doubleDoor ? 0.2 : 0.13;
  const us = []; for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; if (Math.abs(u - doorU) > dw + 0.08) us.push(u); }
  if (us.length < Math.min(n, 2)) { us.length = 0; us.push(0.18, 0.82); }
  for (const u of us) windowAt(c, atY, u, 0.1 + (lv >= 6 ? 0.03 : 0), night, carved);
  doorAt(c, atY, doorU, dw * 2, e.doubleDoor, lv >= 8 ? "#3a2410" : "#6a4326");
  for (let i = 0; i < Math.max(1, Math.round(n / 2)); i++) windowAt(c, atX, (i + 0.5) / Math.max(1, Math.round(n / 2)), 0.14, night, carved);
  // tiang & pagar teras, tangga
  if (L.porch) {
    const p = L.porch, pz = z0, ph = e.h + (e.porch.roof === "main" ? 0 : -6);
    if (e.porch.rail) { railing(c, p.x0, L.stairs ? L.stairs.x0 : HX - 0.4, p.y1, pz, e.porch.carved); railing(c, L.stairs ? L.stairs.x1 : HX + 0.4, p.x1, p.y1, pz, e.porch.carved); }
    for (let i = 0; i < e.porch.posts; i++) {
      const x = p.x0 + 0.08 + (p.x1 - p.x0 - 0.16) * (e.porch.posts === 1 ? 0.5 : i / (e.porch.posts - 1)), a = P(x, p.y1 - 0.08, pz + ph), g = P(x, p.y1 - 0.08, pz);
      c.fillStyle = e.carvedPillars ? "#4a2e18" : "#7a5233"; c.fillRect(a.x - 2.5, a.y, 5, g.y - a.y);
      if (e.porch.carved) { c.fillStyle = "#e0b84c"; c.fillRect(a.x - 3, a.y + 2, 6, 2.5); c.fillRect(a.x - 3, g.y - 5, 6, 2.5); }
      if (e.extras.includes("lentera") && i % 2 === 1) lantern(c, x, p.y1 - 0.08, pz + ph - 12, t, night);
    }
    if (e.porch.roof === "lean") { // atap teras kecil
      const col = e.roof === "sirap" ? "#8a5a32" : "#c2603b";
      c.fillStyle = col; poly(c, [P(p.x0 - 0.15, p.y0, z0 + e.h - 2), P(p.x1 + 0.15, p.y0, z0 + e.h - 2), P(p.x1 + 0.15, p.y1 + 0.15, z0 + e.h - 14), P(p.x0 - 0.15, p.y1 + 0.15, z0 + e.h - 14)]); c.fill();
      c.fillStyle = shade(col, -0.3); poly(c, [P(p.x1 + 0.15, p.y0, z0 + e.h - 2), P(p.x1 + 0.15, p.y1 + 0.15, z0 + e.h - 14), P(p.x1 + 0.15, p.y1 + 0.15, z0 + e.h - 17), P(p.x1 + 0.15, p.y0, z0 + e.h - 5)]); c.fill();
    }
  }
  stairsDraw(c, L, z0, e.stairs, shade(wood, 0.2));
  // atap
  const roofCol = { rumbia: "#b08d4a", sirap: "#8a5a32", genteng: "#c2603b", gentengLebar: "#b5562f", gentengSilang: "#a84a2a", tingkat: "#8f3f24", gonjong: "#2f2a26" }[e.roof];
  const zr = z0 + e.h, roofB = e.porch && e.porch.roof === "main" ? { ...b, y1: L.porch.y1 } : b;
  let r;
  if (e.roof === "gonjong") r = gonjong(c, roofB, zr, e.rh, 0.35, roofCol, t);
  else if (e.roof === "tingkat") {
    // atap bertingkat: atap bawah lebar + atap atas lebih kecil di atasnya
    gable(c, roofB, zr, e.rh * 0.55, 0.45, roofCol, "genteng", t);
    const inner = { x0: b.x0 + 0.6, x1: b.x1 - 0.6, y0: b.y0 + 0.5, y1: (b.y0 + roofB.y1) / 2 + 0.6 };
    c.fillStyle = shade(WALLS[wall].base, -0.1); poly(c, quadY(inner.x0, inner.x1, inner.y1, zr + e.rh * 0.35, zr + e.rh * 0.35 + 16)); c.fill(); poly(c, quadX(inner.x1, inner.y0, inner.y1, zr + e.rh * 0.35, zr + e.rh * 0.35 + 16)); c.fill();
    if (e.balcony) { c.fillStyle = "#e0b84c"; for (let x = inner.x0 + 0.3; x < inner.x1; x += 0.6) { const q = P(x, inner.y1, zr + e.rh * 0.35 + 8); c.fillRect(q.x - 3, q.y - 3, 6, 6); } }
    r = gable(c, inner, zr + e.rh * 0.35 + 16, e.rh, 0.3, shade(roofCol, 0.08), "genteng", t);
    crossedHorns(c, inner.x1 + 0.3, (inner.y0 + inner.y1) / 2, r.top, 1.1, true); crossedHorns(c, inner.x0 - 0.3, (inner.y0 + inner.y1) / 2, r.top, 1.1, true);
  } else {
    r = gable(c, roofB, zr, e.rh, e.roof === "gentengLebar" || e.roof === "gentengSilang" ? 0.42 : e.roof === "rumbia" ? 0.3 : 0.28, roofCol, e.roof === "rumbia" ? "rumbia" : e.roof === "sirap" ? "sirap" : "genteng", t);
    if (e.roof === "gentengSilang") { crossedHorns(c, roofB.x1 + 0.42, r.ym, r.top, 1, lv >= 7); crossedHorns(c, roofB.x0 - 0.42, r.ym, r.top, 1, lv >= 7); }
  }
  // balkon kayu di depan (atap bertingkat)
  if (e.balcony && e.roof !== "tingkat") railing(c, b.x0 + 0.4, b.x1 - 0.4, roofB.y1 + 0.1, zr + 4, true);
  // papan nama di atas pintu
  const sp = P(HX, (L.porch ? L.porch.y1 : b.y1) + 0.02, zr - 10);
  c.fillStyle = lv >= 6 ? "#3a2410" : "#6b4527"; c.fillRect(sp.x - 24, sp.y - 6, 48, 12);
  c.fillStyle = lv >= 6 ? "#f0c75a" : "#fff0b0"; c.font = "800 7px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("RUMAHKU", sp.x, sp.y + 0.5);
  if (opts.scaffold > 0) scaffold(c, L, opts.scaffold, t);
  return L;
}
function scaffold(c, L, k, t) {
  const b = L.house, h = L.e.stilts + L.e.h + L.e.rh + 10;
  c.globalAlpha = clamp(k * 1.5, 0, 1);
  c.strokeStyle = "#c9a86a"; c.lineWidth = 2;
  for (let x = b.x0 - 0.3; x <= b.x1 + 0.3; x += 0.7) line(c, P(x, b.y1 + 0.35, 0), P(x, b.y1 + 0.35, h));
  for (let y = b.y0; y <= b.y1 + 0.35; y += 0.7) line(c, P(b.x1 + 0.35, y, 0), P(b.x1 + 0.35, y, h));
  for (let z = 14; z < h; z += 22) { line(c, P(b.x0 - 0.3, b.y1 + 0.35, z), P(b.x1 + 0.3, b.y1 + 0.35, z)); line(c, P(b.x1 + 0.35, b.y0, z), P(b.x1 + 0.35, b.y1 + 0.35, z)); }
  c.fillStyle = "rgba(240,230,210,.6)";
  for (let i = 0; i < 10; i++) { const p = P(b.x0 + ((i * 37) % 10) / 10 * (b.x1 - b.x0), b.y1 + 0.5, 6 + ((t * 30 + i * 13) % 50)); c.beginPath(); c.arc(p.x + Math.sin(t * 3 + i) * 8, p.y, 6 + (i % 3) * 3, 0, 7); c.fill(); }
  c.globalAlpha = 1;
}

// ---------- Halaman ----------
function drawPlotGround(c, lv, t) {
  const L = plotLayout(lv);
  // air & pasir di sekeliling
  c.fillStyle = "#2fa3bb"; poly(c, [P(-6, -6), P(PW + 6, -6), P(PW + 6, PH + 6), P(-6, PH + 6)]); c.fill();
  c.fillStyle = "#efd8a2"; poly(c, [P(-1.2, -1.2), P(PW + 1.2, -1.2), P(PW + 1.2, PH + 1.2), P(-1.2, PH + 1.2)]); c.fill();
  c.strokeStyle = `rgba(255,255,255,${0.35 + 0.2 * Math.sin(t * 1.6)})`; c.lineWidth = 2; poly(c, [P(-1.35, -1.35), P(PW + 1.35, -1.35), P(PW + 1.35, PH + 1.35), P(-1.35, PH + 1.35)]); c.stroke();
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const h = NW.hash2(x + 70, y + 30);
    c.fillStyle = mix("#86c064", "#6aa64e", h * 0.5); poly(c, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)]); c.fill();
    c.strokeStyle = c.fillStyle; c.lineWidth = 0.8; c.stroke();
    if (h > 0.6) { c.strokeStyle = "rgba(60,110,50,.5)"; c.lineWidth = 1; const p = P(x + h * 0.7, y + 0.3 + h * 0.3); line(c, p, { x: p.x + 1, y: p.y - 4 }); }
  }
  // jalan setapak dari gerbang ke pintu
  const path = [[L.gate.x, L.gate.y - 0.3], [L.gate.x + 1.2, 11.2], [HX - 0.6, 10.4], [HX, L.doorPt.y]];
  const stone = L.e.extras.includes("jalanBatu");
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / (stone ? 0.55 : 0.3));
    for (let k = 0; k <= n; k++) {
      const x = ax + (bx - ax) * (k / n), y = ay + (by - ay) * (k / n), p = P(x, y);
      if (stone) { c.fillStyle = "#b2b6b4"; c.beginPath(); c.ellipse(p.x, p.y, 13, 6.5, 0, 0, 7); c.fill(); c.fillStyle = "#cfd2cf"; c.beginPath(); c.ellipse(p.x - 2, p.y - 1, 8, 3.5, 0, 0, 7); c.fill(); }
      else { c.fillStyle = "#dcbd8a"; c.beginPath(); c.ellipse(p.x, p.y, 20, 10, 0, 0, 7); c.fill(); }
    }
  }
  // petak kebun & taman bunga
  for (const r of L.ex.kebun || []) bed(c, r, ["#4f9a46", "#e2574c", "#4f9a46", "#f7c948"], t);
  for (const r of L.ex.taman || []) bed(c, r, ["#f15f74", "#f7c948", "#ffffff", "#b07ce8", "#ff9a3c"], t);
  return L;
}
function bed(c, r, cols, t) {
  c.fillStyle = "#8a5b3a"; poly(c, [P(r.x0, r.y0, 3), P(r.x1, r.y0, 3), P(r.x1, r.y1, 3), P(r.x0, r.y1, 3)]); c.fill();
  c.fillStyle = "#6e4528"; poly(c, quadY(r.x0, r.x1, r.y1, 0, 3)); c.fill(); poly(c, quadX(r.x1, r.y0, r.y1, 0, 3)); c.fill();
  let i = 0;
  for (let y = r.y0 + 0.25; y < r.y1; y += 0.35) for (let x = r.x0 + 0.2; x < r.x1; x += 0.3) {
    const p = P(x, y, 3), sw = Math.sin(t * 1.5 + i) * 0.8;
    c.fillStyle = "#3f8a3e"; c.fillRect(p.x - 0.7 + sw, p.y - 6, 1.4, 6);
    c.fillStyle = cols[i++ % cols.length]; c.beginPath(); c.arc(p.x + sw, p.y - 7, 2.4, 0, 7); c.fill();
  }
}
// objek halaman yang ikut diurutkan kedalamannya
function plotObjects(lv, t, night) {
  const L = plotLayout(lv), e = L.e, list = [];
  const cy = (r) => (r.x0 + r.x1) / 2 + (r.y0 + r.y1) / 2;
  list.push({ d: cy(L.house) + 0.3, draw: (c) => drawExterior(c, lv, t, night, { scaffold: state.scaffold }) });
  // pagar
  if (e.extras.includes("pagarBambu") || e.extras.includes("pagarKayu")) {
    const bamboo = e.extras.includes("pagarBambu");
    list.push({ d: 0, draw: (c) => fence(c, [[0.3, 0.3], [PW - 0.3, 0.3]], bamboo) });
    list.push({ d: 0.5, draw: (c) => fence(c, [[0.3, 0.3], [0.3, PH - 0.3]], bamboo) });
    list.push({ d: PW + PH - 0.5, draw: (c) => fence(c, [[PW - 0.3, 0.3], [PW - 0.3, PH - 0.3]], bamboo) });
    list.push({ d: PW + PH - 0.4, draw: (c) => { fence(c, [[0.3, PH - 0.3], [L.gate.x - 0.8, PH - 0.3]], bamboo); fence(c, [[L.gate.x + 0.8, PH - 0.3], [PW - 0.3, PH - 0.3]], bamboo); } });
  }
  // pohon kelapa di luar pagar
  for (const [x, y, h] of [[-0.6, 3, 80], [-0.4, 9, 90], [PW + 0.5, 2, 85], [PW + 0.6, 8, 76], [6, -0.7, 88], [12, -0.6, 80]]) list.push({ d: x + y, draw: (c) => NW.drawPalm(c, { x, y, h, lean: 0.2, ph: x + y }, t, 1) });
  if (L.ex.gudang) list.push({ d: cy(L.ex.gudang), draw: (c) => shed(c, L.ex.gudang) });
  if (L.ex.paviliun) list.push({ d: cy(L.ex.paviliun), draw: (c) => pavilion(c, L.ex.paviliun, t) });
  if (L.ex.kolam) list.push({ d: cy(L.ex.kolam) - 1, draw: (c) => pond(c, L.ex.kolam, t) });
  if (L.ex.rakLuar) list.push({ d: cy(L.ex.rakLuar), draw: (c) => { const r = L.ex.rakLuar; box(c, r, 0, 26, "#a8743f", "#8a5a32", "#6e4628"); for (let i = 0; i < 3; i++) { const p = P(r.x0 + 0.2 + i * 0.22, r.y1, 18); c.fillStyle = ["#c2603b", "#e0b84c", "#579b8b"][i]; c.fillRect(p.x - 3, p.y - 7, 6, 7); } } });
  if (L.ex.jemuran) list.push({ d: cy(L.ex.jemuran), draw: (c) => clothesline(c, L.ex.jemuran, t) });
  if (e.extras.includes("jaring")) list.push({ d: 3 + 6.8, draw: (c) => NW.drawNet(c, { x: 3, y: 6.8 }) });
  if (e.extras.includes("potBunga")) for (const [x, y] of [[HX - 1.6, L.doorPt.y - 0.2], [HX + 1.6, L.doorPt.y - 0.2]]) list.push({ d: x + y, draw: (c) => { const p = P(x, y); c.fillStyle = "#b5562f"; c.fillRect(p.x - 5, p.y - 8, 10, 8); c.fillStyle = "#4f9a46"; c.beginPath(); c.arc(p.x, p.y - 12, 6, 0, 7); c.fill(); c.fillStyle = "#f15f74"; c.beginPath(); c.arc(p.x - 2, p.y - 14, 2, 0, 7); c.arc(p.x + 3, p.y - 12, 2, 0, 7); c.fill(); } });
  if (e.extras.includes("obor")) for (const [x, y] of [[4.4, 11.0], [6.6, 10.3], [HX + 1.4, L.doorPt.y + 0.3], [HX - 1.4, L.doorPt.y + 0.3]]) list.push({ d: x + y, draw: (c) => torch(c, x, y, t) });
  // gerbang, papan renovasi, kotak surat
  list.push({ d: L.gate.x + L.gate.y, draw: (c) => gateDraw(c, L.gate.x, L.gate.y, t, "KAMPUNG") });
  list.push({ d: L.sign.x + L.sign.y, draw: (c) => NW.drawSign(c, { x: L.sign.x, y: L.sign.y - 6 / 32, title: "Renovasi" }) });
  list.push({ d: L.mailbox.x + L.mailbox.y, draw: (c) => NW.drawMailbox(c, { x: L.mailbox.x, y: L.mailbox.y - 6 / 32 }, t) });
  return { list, L };
}
function box(c, r, z0, h, top, left, right) {
  c.fillStyle = left; poly(c, quadY(r.x0, r.x1, r.y1, z0, z0 + h)); c.fill();
  c.fillStyle = right; poly(c, quadX(r.x1, r.y0, r.y1, z0, z0 + h)); c.fill();
  c.fillStyle = top; poly(c, [P(r.x0, r.y0, z0 + h), P(r.x1, r.y0, z0 + h), P(r.x1, r.y1, z0 + h), P(r.x0, r.y1, z0 + h)]); c.fill();
}
function fence(c, [[ax, ay], [bx, by]], bamboo) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.35);
  c.strokeStyle = bamboo ? "#b39a52" : "#8a5a32"; c.lineWidth = bamboo ? 2.4 : 3;
  for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * (i / n), y = ay + (by - ay) * (i / n); line(c, P(x, y, 0), P(x, y, bamboo ? 20 : 16)); }
  c.lineWidth = 2; c.strokeStyle = bamboo ? "#9c8440" : "#6e4628"; line(c, P(ax, ay, 8), P(bx, by, 8)); line(c, P(ax, ay, 15), P(bx, by, 15));
}
function shed(c, r) {
  box(c, r, 0, 28, "#8a5a32", "#a8743f", "#8a5a32");
  c.fillStyle = "#5a3a20"; poly(c, quadY(r.x0 + 0.5, r.x1 - 0.5, r.y1, 0, 20)); c.fill();
  c.fillStyle = "#7a5230"; poly(c, [P(r.x0 - 0.15, r.y0 - 0.15, 30), P(r.x1 + 0.15, r.y0 - 0.15, 30), P(r.x1 + 0.15, r.y1 + 0.2, 22), P(r.x0 - 0.15, r.y1 + 0.2, 22)]); c.fill();
  for (let i = 0; i < 3; i++) { const p = P(r.x1 + 0.25, r.y0 + 0.3 + i * 0.3, 0); c.fillStyle = "#b8864a"; c.fillRect(p.x - 4, p.y - 9, 8, 9); }
}
function pavilion(c, r, t) {
  c.fillStyle = "#b2b6b4"; poly(c, [P(r.x0, r.y0, 4), P(r.x1, r.y0, 4), P(r.x1, r.y1, 4), P(r.x0, r.y1, 4)]); c.fill();
  c.fillStyle = "#8d9192"; poly(c, quadY(r.x0, r.x1, r.y1, 0, 4)); c.fill(); poly(c, quadX(r.x1, r.y0, r.y1, 0, 4)); c.fill();
  c.fillStyle = "#c79a64"; poly(c, [P(r.x0 + 0.3, r.y0 + 0.3, 12), P(r.x1 - 0.3, r.y0 + 0.3, 12), P(r.x1 - 0.3, r.y1 - 0.3, 12), P(r.x0 + 0.3, r.y1 - 0.3, 12)]); c.fill();
  for (const [x, y] of [[r.x0 + 0.1, r.y0 + 0.1], [r.x1 - 0.1, r.y0 + 0.1], [r.x0 + 0.1, r.y1 - 0.1], [r.x1 - 0.1, r.y1 - 0.1]]) { const a = P(x, y, 54), g = P(x, y, 4); c.fillStyle = "#4a2e18"; c.fillRect(a.x - 2.5, a.y, 5, g.y - a.y); c.fillStyle = "#e0b84c"; c.fillRect(a.x - 3, a.y + 3, 6, 2); }
  const m = P((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 90), o = 0.35;
  const corners = [P(r.x0 - o, r.y1 + o, 54), P(r.x1 + o, r.y1 + o, 54), P(r.x1 + o, r.y0 - o, 54)];
  c.fillStyle = "#8f3f24"; poly(c, [corners[0], corners[1], m]); c.fill();
  c.fillStyle = "#6e3019"; poly(c, [corners[1], corners[2], m]); c.fill();
  c.fillStyle = "#f0c75a"; c.beginPath(); c.arc(m.x, m.y - 3, 3, 0, 7); c.fill();
}
function pond(c, r, t) {
  c.fillStyle = "#8d9192"; c.beginPath(); const m = P((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2); c.ellipse(m.x, m.y, (r.x1 - r.x0 + r.y1 - r.y0) * 16 * 0.62, (r.x1 - r.x0 + r.y1 - r.y0) * 8 * 0.62, 0, 0, 7); c.fill();
  c.fillStyle = "#2f8fa8"; c.beginPath(); c.ellipse(m.x, m.y, (r.x1 - r.x0 + r.y1 - r.y0) * 16 * 0.54, (r.x1 - r.x0 + r.y1 - r.y0) * 8 * 0.54, 0, 0, 7); c.fill();
  for (let i = 0; i < 5; i++) { // ikan koi
    const a = t * (0.4 + i * 0.07) + i * 1.3, x = m.x + Math.cos(a) * 34, y = m.y + Math.sin(a) * 13;
    c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2); c.fillStyle = ["#f07b2a", "#ffffff", "#e2574c", "#f7c948", "#ffffff"][i];
    c.beginPath(); c.ellipse(0, 0, 6, 2.6, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(-5, 0); c.lineTo(-9, -3); c.lineTo(-9, 3); c.fill(); c.restore();
  }
  c.fillStyle = "#4f9a46"; for (const [dx, dy] of [[-28, -4], [24, 6], [6, -10]]) { c.beginPath(); c.ellipse(m.x + dx, m.y + dy, 7, 3.5, 0, 0.3, 6.1); c.fill(); }
  c.fillStyle = "#f6a6b2"; c.beginPath(); c.arc(m.x - 26, m.y - 6, 2.5, 0, 7); c.fill();
}
function clothesline(c, r, t) {
  const a = P(r.x0, r.y0), b = P(r.x1, r.y0);
  c.fillStyle = "#6b4527"; c.fillRect(a.x - 1.5, a.y - 30, 3, 30); c.fillRect(b.x - 1.5, b.y - 30, 3, 30);
  c.strokeStyle = "#d8c49a"; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y - 28); c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 22, b.x, b.y - 28); c.stroke();
  const cols = ["#c2603b", "#579b8b", "#e0b84c"];
  for (let i = 0; i < 3; i++) { const k = (i + 1) / 4, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k - 27 + Math.sin(k * 3.14) * 5; c.fillStyle = cols[i]; c.save(); c.translate(x, y); c.rotate(Math.sin(t * 2 + i) * 0.08); c.fillRect(-6, 0, 12, 14); c.restore(); }
}
function torch(c, x, y, t) {
  const p = P(x, y);
  c.fillStyle = "#b39a52"; c.fillRect(p.x - 1.5, p.y - 34, 3, 34);
  c.fillStyle = "#6b4527"; c.fillRect(p.x - 3, p.y - 37, 6, 5);
  const f = Math.sin(t * 12 + x) * 1.5;
  c.fillStyle = "#ff9a3c"; c.beginPath(); c.ellipse(p.x, p.y - 42 + f * 0.3, 3.5, 6 + f, 0, 0, 7); c.fill();
  c.fillStyle = "#ffe29a"; c.beginPath(); c.ellipse(p.x, p.y - 41, 1.8, 3.2, 0, 0, 7); c.fill();
}
// gerbang kayu tradisional (gapura)
function gateDraw(c, x, y, t, label, z = 0) {
  const a = P(x - 0.6, y, z), b = P(x + 0.6, y, z);
  c.fillStyle = "rgba(20,40,30,.2)"; c.beginPath(); c.ellipse((a.x + b.x) / 2 + 10, (a.y + b.y) / 2 + 2, 34, 9, 0, 0, 7); c.fill();
  for (const p of [a, b]) { c.fillStyle = "#5a3a20"; c.fillRect(p.x - 4, p.y - 52, 8, 52); c.fillStyle = "#e0b84c"; c.fillRect(p.x - 4.5, p.y - 46, 9, 2.5); c.fillRect(p.x - 4.5, p.y - 12, 9, 2.5); }
  const top = P(x, y, z + 60);
  c.fillStyle = "#a84a2a"; c.beginPath(); c.moveTo(a.x - 16, a.y - 52); c.quadraticCurveTo(top.x, top.y - 20, b.x + 16, b.y - 52); c.lineTo(b.x + 10, b.y - 46); c.quadraticCurveTo(top.x, top.y - 8, a.x - 10, a.y - 46); c.closePath(); c.fill();
  c.strokeStyle = "#f0c75a"; c.lineWidth = 2; c.beginPath(); c.moveTo(a.x - 16, a.y - 52); c.quadraticCurveTo(top.x, top.y - 20, b.x + 16, b.y - 52); c.stroke();
  const s = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 40 };
  c.fillStyle = "#3a2410"; c.fillRect(s.x - 24, s.y - 6, 48, 12); c.fillStyle = "#f0c75a"; c.font = "800 7px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, s.x, s.y + 0.5);
}

// ---------- Interior ----------
const FLOORS = { tikar: ["#d8bd84", "#c9ab70"], papan: ["#c8935a", "#bf8a52"], papanHalus: ["#d6a56a", "#cf9c60"], parket: ["#b97a45", "#a86c3a"], parketEmas: ["#a86c3a", "#96602f"] };
const IWALL = { anyaman: ["#dcc38a", "#c9ab70"], papan: ["#e3c99a", "#cfb27e"], papanCat: ["#efe0bd", "#dccaa0"], ukir: ["#c79a64", "#b5884f"], ukirEmas: ["#8a5a32", "#7a4e2a"] };
function drawRoomShell(c, lv, t, dk, decos) {
  const HD = NW.HD, { w, d } = HD.roomOf(lv), door = HD.doorOf(lv), Ld = HD.LEVELS[lv], WH = 96 + (lv >= 8 ? 14 : 0);
  const [f1, f2] = FLOORS[Ld.floor], [w1, w2] = IWALL[Ld.wall];
  c.fillStyle = "rgba(0,0,0,.25)"; poly(c, [P(0, 0, -6), P(w, 0, -6), P(w, d, -6), P(0, d, -6)]); c.fill();
  c.fillStyle = "#6e4628"; poly(c, quadY(0, w, d, -8, 0)); c.fill(); c.fillStyle = "#5a3a20"; poly(c, quadX(w, 0, d, -8, 0)); c.fill();
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) { c.fillStyle = (x + y) % 2 ? f1 : f2; poly(c, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)]); c.fill(); }
  c.strokeStyle = "rgba(90,58,32,.3)"; c.lineWidth = 1;
  if (Ld.floor === "tikar") { for (let k = 0; k < w + d; k += 0.5) { line(c, P(Math.max(0, k - d), Math.min(d, k), 0), P(Math.min(w, k), Math.max(0, k - w), 0)); } }
  else if (Ld.floor.startsWith("parket")) { for (let x = 0; x < w; x += 0.5) for (let y = 0; y < d; y += 0.5) if (((x + y) * 2) % 2 === 0) line(c, P(x, y), P(x + 0.5, y)); else line(c, P(x, y), P(x, y + 0.5)); }
  else for (let y = 0.5; y < d; y += Ld.floor === "papanHalus" ? 0.33 : 0.5) line(c, P(0, y), P(w, y));
  if (Ld.floor === "parketEmas") { c.strokeStyle = "#e0b84c"; c.lineWidth = 2; poly(c, [P(0.4, 0.4), P(w - 0.4, 0.4), P(w - 0.4, d - 0.4), P(0.4, d - 0.4)]); c.stroke(); }
  // dinding belakang (y=0) & kiri (x=0)
  c.fillStyle = w1; poly(c, quadY(0, w, 0, 0, WH)); c.fill();
  c.fillStyle = w2; poly(c, [P(0, 0, 0), P(0, d, 0), P(0, d, WH), P(0, 0, WH)]); c.fill();
  c.strokeStyle = rgba(shade(w1, -0.35), 0.3); c.lineWidth = 2;
  if (Ld.wall === "anyaman") { c.lineWidth = 1; for (let x = 0; x < w; x += 0.25) for (let z = 8; z < WH; z += 10) line(c, P(x, 0, z), P(x + 0.12, 0, z + 5)); }
  else for (let x = 0.35; x < w; x += 0.5) line(c, P(x, 0, 6), P(x, 0, WH - 4));
  if (Ld.wall.startsWith("ukir")) { // panel ukiran
    const gold = Ld.wall === "ukirEmas" ? "#f0c75a" : "#8a5a32";
    for (let x = 0.3; x < w - 0.4; x += 1.2) { c.strokeStyle = gold; c.lineWidth = 1.4; poly(c, [P(x, 0, 16), P(x + 0.9, 0, 16), P(x + 0.9, 0, 30), P(x, 0, 30)]); c.stroke(); const m = P(x + 0.45, 0, 23); c.beginPath(); c.arc(m.x, m.y, 3, 0, 7); c.stroke(); }
    c.fillStyle = gold; poly(c, quadY(0, w, 0, WH - 12, WH - 8)); c.fill(); poly(c, [P(0, 0, WH - 12), P(0, d, WH - 12), P(0, d, WH - 8), P(0, 0, WH - 8)]); c.fill();
  }
  c.fillStyle = "#8a5a32"; poly(c, quadY(0, w, 0, 0, 8)); c.fill(); poly(c, [P(0, 0, 0), P(0, d, 0), P(0, d, 8), P(0, 0, 8)]); c.fill();
  c.fillStyle = "#6e4628"; poly(c, quadY(0, w, 0, WH, WH + 6)); c.fill(); poly(c, [P(0, 0, WH), P(0, d, WH), P(0, d, WH + 6), P(0, 0, WH + 6)]); c.fill();
  // balok langit-langit (level 4+)
  if (lv >= 4) { c.strokeStyle = "rgba(90,58,32,.55)"; c.lineWidth = 4; for (let x = 1.5; x < w; x += 2) line(c, P(x, 0, WH), P(x, 0, WH + 30)); }
  // jendela
  const sky = mix("#9fd3e6", "#13234a", clamp(dk / 0.85, 0, 1)), sea = mix("#2fa3bb", "#0d2140", clamp(dk / 0.85, 0, 1));
  const nb = Math.min(Ld.windows, Math.max(1, Math.floor(w / 2))), nl = Ld.windows - nb;
  for (let i = 0; i < nb; i++) {
    const cx = (w * (i + 1)) / (nb + 1) + (i === 0 && decos.includes("lukisan") && nb === 1 ? 0.8 : 0), w0 = cx - 0.6, w1x = cx + 0.6, z0 = 34, z1 = 76;
    c.fillStyle = "#6e4628"; poly(c, quadY(w0 - 0.08, w1x + 0.08, 0, z0 - 4, z1 + 4)); c.fill();
    c.fillStyle = sky; poly(c, quadY(w0, w1x, 0, z0, z1)); c.fill();
    c.fillStyle = sea; poly(c, quadY(w0, w1x, 0, z0, z0 + 12)); c.fill();
    c.fillStyle = "#6e4628"; poly(c, quadY(cx - 0.02, cx + 0.02, 0, z0, z1)); c.fill();
    c.fillStyle = Ld.wall.startsWith("ukir") ? "#a84a2a" : "#579b8b";
    poly(c, quadY(w0 - 0.25, w0 + 0.12, 0, z0 - 6, z1 + 8)); c.fill(); poly(c, quadY(w1x - 0.12, w1x + 0.25, 0, z0 - 6, z1 + 8)); c.fill();
    if (i === 0) { if (dk > 0.4) { c.fillStyle = "#eef2ff"; const m = P(cx + 0.3, 0, 66); c.beginPath(); c.arc(m.x, m.y, 4, 0, 7); c.fill(); } else { c.fillStyle = "#fff3c4"; const m = P(cx - 0.25, 0, 64); c.beginPath(); c.arc(m.x, m.y, 5, 0, 7); c.fill(); } }
  }
  for (let i = 0; i < nl; i++) {
    const cy = (door.y0 * (i + 1)) / (nl + 1), y0 = cy - 0.5, y1 = cy + 0.5, z0 = 36, z1 = 74;
    c.fillStyle = "#6e4628"; poly(c, [P(0, y0 - 0.08, z0 - 4), P(0, y1 + 0.08, z0 - 4), P(0, y1 + 0.08, z1 + 4), P(0, y0 - 0.08, z1 + 4)]); c.fill();
    c.fillStyle = sky; poly(c, [P(0, y0, z0), P(0, y1, z0), P(0, y1, z1), P(0, y0, z1)]); c.fill();
    c.fillStyle = "#6e4628"; poly(c, [P(0, cy - 0.02, z0), P(0, cy + 0.02, z0), P(0, cy + 0.02, z1), P(0, cy - 0.02, z1)]); c.fill();
  }
  // lukisan (dekorasi)
  if (decos.includes("lukisan")) {
    const x0 = 0.6, x1 = 1.9;
    c.fillStyle = "#6e4628"; poly(c, quadY(x0, x1, 0, 82, 104)); c.fill();
    const top = P(x0, 0, 102).y, bot = P(x0, 0, 84).y, g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, "#f39a58"); g.addColorStop(0.55, "#f6c96a"); g.addColorStop(0.56, "#2f7fa3"); g.addColorStop(1, "#174c6a");
    c.fillStyle = g; poly(c, quadY(x0 + 0.06, x1 - 0.06, 0, 84, 102)); c.fill();
  }
  // Joran Warisan Pak Darto (hadiah Bab 4) dipajang tinggi di dinding belakang
  if (decos.includes("joranWarisan")) {
    const x0 = w - 2.6, x1 = w - 0.5, z = WH - 7; // tinggi di atas jendela
    c.fillStyle = "#5a3a20"; poly(c, quadY(x0 + 0.1, x0 + 0.22, 0, z - 6, z + 4)); c.fill(); poly(c, quadY(x1 - 0.22, x1 - 0.1, 0, z - 6, z + 4)); c.fill();
    c.strokeStyle = "#c9a86a"; c.lineWidth = 3; c.lineCap = "round"; line(c, P(x0, 0.02, z), P(x1, 0.02, z + 6));
    c.strokeStyle = "#e0b84c"; c.lineWidth = 4; for (const u of [0.15, 0.4, 0.7]) { const a = P(x0 + (x1 - x0) * u, 0.02, z + 6 * u); line(c, { x: a.x - 1.5, y: a.y }, { x: a.x + 1.5, y: a.y }); }
    c.fillStyle = "#6b4527"; const g = P(x0 + 0.25, 0.02, z + 1); c.fillRect(g.x - 5, g.y - 3, 10, 6);
    const tg = P(x0 + (x1 - x0) * 0.55, 0.02, z + 3.3); c.fillStyle = "#f0c75a"; c.beginPath(); c.moveTo(tg.x, tg.y); c.lineTo(tg.x + 7, tg.y + 5); c.lineTo(tg.x + 7, tg.y + 10); c.lineTo(tg.x, tg.y + 5); c.closePath(); c.fill(); // label emas kecil
  }
  // pintu keluar
  c.fillStyle = "#5a3a20"; poly(c, [P(0, door.y0, 0), P(0, door.y1, 0), P(0, door.y1, 62), P(0, door.y0, 62)]); c.fill();
  c.fillStyle = lv >= 6 ? "#6a4326" : "#8a5a32"; poly(c, [P(0, door.y0 + 0.08, 0), P(0, door.y1 - 0.08, 0), P(0, door.y1 - 0.08, 58), P(0, door.y0 + 0.08, 58)]); c.fill();
  if (lv >= 6) { c.strokeStyle = "#e0b84c"; c.lineWidth = 1.2; poly(c, [P(0, door.y0 + 0.2, 10), P(0, door.y1 - 0.2, 10), P(0, door.y1 - 0.2, 50), P(0, door.y0 + 0.2, 50)]); c.stroke(); }
  c.fillStyle = "#e0b84c"; const k = P(0, door.y1 - 0.25, 30); c.beginPath(); c.arc(k.x, k.y, 2.2, 0, 7); c.fill();
  c.fillStyle = "#c79a64"; poly(c, [P(0.02, door.y0, 0.5), P(0.6, door.y0, 0.5), P(0.6, door.y1, 0.5), P(0.02, door.y1, 0.5)]); c.fill();
  // rak dinding (bawaan level 2)
  for (const b of Ld.builtins) if (b.type === "rakDinding") {
    c.fillStyle = "#8a5a32"; poly(c, quadY(b.x, b.x + b.w, 0, 54, 57)); c.fill();
    for (let i = 0; i < 4; i++) { const p = P(b.x + 0.15 + i * 0.28, 0.02, 57); c.fillStyle = ["#c2603b", "#e0b84c", "#579b8b", "#fff6e4"][i]; c.fillRect(p.x - 3, p.y - 9, 6, 9); }
  }
}
// perabot bawaan (diurutkan kedalamannya)
function drawBuiltin(c, b, t, ctx) {
  const r = { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.d };
  if (b.type === "rak") { box(c, r, 0, b.h, "#a8743f", "#8a5a32", "#6e4628"); for (let s = 0; s < 2; s++) for (let i = 0; i < 4; i++) { const p = P(r.x0 + 0.15 + i * 0.3, r.y1, 10 + s * 18); c.fillStyle = ["#4f9a46", "#c2603b", "#e0b84c", "#4f9a46"][(i + s) % 4]; c.beginPath(); c.arc(p.x, p.y - 5, 4, 0, 7); c.fill(); } }
  else if (b.type === "kursiRotan") {
    box(c, { ...r, y0: r.y0 }, 0, 10, "#d9b45e", "#b8924f", "#a07e40"); box(c, { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y0 + 0.25 }, 10, 18, "#c9a45c", "#b8924f", "#a07e40");
    c.strokeStyle = "rgba(90,60,20,.4)"; c.lineWidth = 0.8; for (let x = r.x0 + 0.1; x < r.x1; x += 0.15) line(c, P(x, r.y1, 0), P(x, r.y1, 10));
    box(c, { x0: r.x0 + 0.2, y0: r.y0 + 0.3, x1: r.x1 - 0.2, y1: r.y1 - 0.1 }, 10, 3, "#579b8b", "#3f7a6c", "#356658");
  } else if (b.type === "mejaTamu") { box(c, r, 10, 4, "#8a5a32", "#6e4628", "#5a3a20"); const p = P((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 14); c.fillStyle = "#fff6e4"; c.beginPath(); c.ellipse(p.x, p.y - 4, 5, 4, 0, 0, 7); c.fill(); c.fillStyle = "#c2603b"; c.fillRect(p.x + 6, p.y - 5, 3, 4); }
  else if (b.type === "lemariUkir") { box(c, r, 0, b.h, "#6e4628", "#8a5a32", "#5a3a20"); c.strokeStyle = "#e0b84c"; c.lineWidth = 1.2; for (const u of [0.25, 0.75]) { const q = [P(r.x0 + (r.x1 - r.x0) * (u - 0.2), r.y1, 8), P(r.x0 + (r.x1 - r.x0) * (u + 0.2), r.y1, 8), P(r.x0 + (r.x1 - r.x0) * (u + 0.2), r.y1, b.h - 8), P(r.x0 + (r.x1 - r.x0) * (u - 0.2), r.y1, b.h - 8)]; poly(c, q); c.stroke(); } }
  else if (b.type === "tiang") { const a = P(r.x0 + 0.15, r.y0 + 0.15, b.h), g = P(r.x0 + 0.15, r.y0 + 0.15, 0); c.fillStyle = "#4a2e18"; c.fillRect(a.x - 5, a.y, 10, g.y - a.y); c.fillStyle = "#e0b84c"; for (let k = 0.15; k < 1; k += 0.28) c.fillRect(a.x - 5.5, a.y + (g.y - a.y) * k, 11, 3); }
  else if (b.type === "lemariPamer" || b.type === "dindingLegenda") {
    box(c, r, 0, b.h, "#5a3a20", "#6e4628", "#4a2e18");
    c.fillStyle = "rgba(170,220,235,.45)"; poly(c, quadY(r.x0 + 0.08, r.x1 - 0.08, r.y1 + 0.005, 8, b.h - 6)); c.fill();
    // replika ikan dari rekor koleksi (bukan ikan inventaris)
    const list = ctx.replicas(b.type === "dindingLegenda" ? "legenda" : null).slice(0, b.type === "dindingLegenda" ? 4 : 3);
    list.forEach((f, i) => { const p = P(r.x0 + (r.x1 - r.x0) * ((i + 0.5) / Math.max(list.length, 1)), r.y1 + 0.01, b.h * 0.55); c.save(); c.translate(p.x, p.y); NW.drawFishSprite(c, f, 0, 0, b.type === "dindingLegenda" ? 30 : 24); c.restore(); c.fillStyle = "#e0b84c"; c.fillRect(p.x - 6, p.y + 10, 12, 3); });
    if (!list.length) { c.fillStyle = "rgba(255,255,255,.6)"; c.font = "700 7px system-ui"; c.textAlign = "center"; const p = P((r.x0 + r.x1) / 2, r.y1, b.h * 0.55); c.fillText(b.type === "dindingLegenda" ? "Belum ada legenda" : "Koleksi kosong", p.x, p.y); }
    c.fillStyle = "#e0b84c"; poly(c, quadY(r.x0, r.x1, r.y1, b.h - 4, b.h)); c.fill();
  }
}

// ---------- Perabot yang bisa dipindah ----------
function drawFurniture(c, f, t, ctx) {
  const HD = NW.HD, r = HD.fp(f), T = HD.FURN[f.type];
  const tint = ctx.highlight === f.uid ? (ctx.valid ? "rgba(90,200,120,.35)" : "rgba(226,87,76,.4)") : null;
  if (f.type === "karpet") {
    c.fillStyle = "#a63d2f"; poly(c, [P(r.x0, r.y0, 1), P(r.x1, r.y0, 1), P(r.x1, r.y1, 1), P(r.x0, r.y1, 1)]); c.fill();
    c.fillStyle = "#e0b84c"; poly(c, [P(r.x0 + 0.15, r.y0 + 0.15, 1), P(r.x1 - 0.15, r.y0 + 0.15, 1), P(r.x1 - 0.15, r.y1 - 0.15, 1), P(r.x0 + 0.15, r.y1 - 0.15, 1)]); c.fill();
    c.fillStyle = "#7a2a20"; poly(c, [P(r.x0 + 0.25, r.y0 + 0.25, 1), P(r.x1 - 0.25, r.y0 + 0.25, 1), P(r.x1 - 0.25, r.y1 - 0.25, 1), P(r.x0 + 0.25, r.y1 - 0.25, 1)]); c.fill();
    c.fillStyle = "#f3e2bd"; const n = Math.round((r.x1 - r.x0 + r.y1 - r.y0) * 1.2);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, cx = r.x0 + (r.x1 - r.x0) * u, cy = r.y0 + (r.y1 - r.y0) * u; poly(c, [P(cx, cy - 0.22, 1), P(cx + 0.14, cy, 1), P(cx, cy + 0.22, 1), P(cx - 0.14, cy, 1)]); c.fill(); }
  } else if (f.type === "kasur") {
    box(c, r, 0, 14, "#8a5a32", "#7a5233", "#6b4527");
    const m = { x0: r.x0 + 0.05, y0: r.y0 + 0.05, x1: r.x1 - 0.05, y1: r.y1 - 0.05 };
    box(c, m, 14, 9, "#fbf6ea", "#e9e2d2", "#d7cfbd");
    const blanket = f.rot ? { ...m, x0: m.x0 + 0.6 } : { ...m, y0: m.y0 + 0.55 };
    box(c, blanket, 23, 3, "#579b8b", "#3f7a6c", "#356658");
    const pil = f.rot ? { x0: m.x0 + 0.1, y0: m.y0 + 0.2, x1: m.x0 + 0.5, y1: m.y1 - 0.2 } : { x0: m.x0 + 0.2, y0: m.y0 + 0.1, x1: m.x1 - 0.2, y1: m.y0 + 0.45 };
    box(c, pil, 23, 6, "#ffffff", "#eee", "#ddd");
  } else if (f.type === "meja") {
    const top = { ...r, x1: f.rot ? r.x1 : r.x1 - 0.45, y1: f.rot ? r.y1 - 0.45 : r.y1 };
    c.fillStyle = "#6e4628"; for (const [x, y] of [[top.x0 + 0.06, top.y1 - 0.06], [top.x1 - 0.06, top.y1 - 0.06], [top.x1 - 0.06, top.y0 + 0.06]]) { const a = P(x, y, 26), g = P(x, y, 0); c.fillRect(a.x - 1.5, a.y, 3, g.y - a.y); }
    box(c, top, 26, 4, "#b27d48", "#8a5a32", "#7a4e2a");
    const p = P((top.x0 + top.x1) / 2, (top.y0 + top.y1) / 2, 31);
    c.fillStyle = "#fff6e4"; c.beginPath(); c.moveTo(p.x - 12, p.y); c.lineTo(p.x, p.y - 6); c.lineTo(p.x + 12, p.y); c.lineTo(p.x, p.y + 6); c.closePath(); c.fill();
    c.strokeStyle = "#c2603b"; c.lineWidth = 1; line(c, { x: p.x, y: p.y - 6 }, { x: p.x, y: p.y + 6 });
    const st = f.rot ? { x0: r.x0 + 0.3, y0: r.y1 - 0.4, x1: r.x0 + 0.8, y1: r.y1 } : { x0: r.x1 - 0.4, y0: r.y0 + 0.2, x1: r.x1, y1: r.y0 + 0.7 };
    box(c, st, 0, 14, "#a8743f", "#8a5a32", "#6e4628");
  } else if (T.cap) drawAquariumFurn(c, f, r, T, t, ctx);
  else if (f.type === "tanaman") {
    const p = P((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 0);
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(p.x + 3, p.y, 12, 5, 0, 0, 7); c.fill();
    c.fillStyle = "#c2603b"; c.beginPath(); c.moveTo(p.x - 9, p.y - 16); c.lineTo(p.x + 9, p.y - 16); c.lineTo(p.x + 6, p.y); c.lineTo(p.x - 6, p.y); c.fill();
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42 + Math.sin(t * 0.8 + i) * 0.03; c.fillStyle = i % 2 ? "#3f8a3e" : "#4f9a46"; c.beginPath(); c.ellipse(p.x + Math.cos(a) * 14, p.y - 22 + Math.sin(a) * 14, 9, 5, a, 0, 7); c.fill(); }
  } else if (f.type === "radio") {
    box(c, r, 0, 22, "#a8743f", "#8a5a32", "#6e4628");
    const p = P((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 22);
    c.fillStyle = "#c2603b"; c.fillRect(p.x - 10, p.y - 13, 20, 12); c.fillStyle = "#3a2a1a"; c.beginPath(); c.arc(p.x - 4, p.y - 7, 3.5, 0, 7); c.fill();
    c.fillStyle = "#fff0b0"; c.fillRect(p.x + 1, p.y - 11, 7, 3);
    if (ctx.radioOn) for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; c.fillStyle = "#173f50"; c.font = "10px serif"; c.fillText("♪", p.x + 6 + k * 12 + Math.sin(t * 3 + i) * 3, p.y - 18 - k * 26); c.globalAlpha = 1; }
  } else if (f.type === "trofi") {
    box(c, r, 0, 52, "#8a5a32", "#7a5233", "#6b4527");
    const L = ctx.replicas("legenda");
    for (let i = 0; i < Math.min(4, Math.max(1, L.length)); i++) { const p = P(r.x0 + 0.2 + (i % 2) * 0.3, r.y1 + 0.01, 16 + Math.floor(i / 2) * 18); c.fillStyle = L.length ? "#e0b84c" : "#b9b9b0"; c.fillRect(p.x - 3, p.y - 9, 6, 6); c.fillRect(p.x - 1, p.y - 3, 2, 3); c.fillRect(p.x - 3, p.y, 6, 1.5); }
  }
  if (tint) { c.fillStyle = tint; poly(c, [P(r.x0, r.y0, 1.5), P(r.x1, r.y0, 1.5), P(r.x1, r.y1, 1.5), P(r.x0, r.y1, 1.5)]); c.fill(); c.strokeStyle = ctx.valid ? "#2e8b57" : "#e2574c"; c.lineWidth = 2; c.stroke(); }
}
function drawAquariumFurn(c, f, r, T, t, ctx) {
  box(c, r, 0, 18, "#6b4527", "#5a3a20", "#4a2e18");
  const z0 = 18, h = T.h - 18, frontX = !f.rot; // kaca depan: sisi x bila tidak diputar
  const water = f.water === "laut" ? "rgba(60,150,210,.55)" : "rgba(90,180,170,.55)";
  c.fillStyle = water; poly(c, quadX(r.x1, r.y0, r.y1, z0, z0 + h)); c.fill();
  c.fillStyle = water.replace(".55", ".42"); poly(c, quadY(r.x0, r.x1, r.y1, z0, z0 + h)); c.fill();
  const fish = ctx.fishFor(f.uid);
  const A = frontX ? P(r.x1, r.y1, z0 + 6) : P(r.x0, r.y1, z0 + 6), B = frontX ? P(r.x1, r.y0, z0 + h - 6) : P(r.x1, r.y1, z0 + h - 6);
  c.save(); poly(c, frontX ? quadX(r.x1, r.y0, r.y1, z0, z0 + h) : quadY(r.x0, r.x1, r.y1, z0, z0 + h)); c.clip();
  fish.forEach((it, i) => {
    const sp = ctx.speedOf(it), ph = t * sp + i * 2.1, k = (Math.sin(ph) + 1) / 2, right = Math.cos(ph) > 0;
    const x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k - ((i % 3) * (h - 14)) / 3 - 4 + Math.sin(t * 2 + i) * 1.5;
    c.save(); c.translate(x, y); c.scale(right ? -1 : 1, 1); NW.drawFishSprite(c, NW.HD_FISH(it.id), 0, 0, ctx.sizeOf(it, 18), it.vr); c.restore();
  });
  c.fillStyle = "rgba(255,255,255,.7)";
  for (let i = 0; i < 3; i++) { const k = (t * 0.4 + i / 3) % 1, p = frontX ? P(r.x1, r.y0 + 0.3 + i * 0.25, z0 + 4 + k * (h - 8)) : P(r.x0 + 0.3 + i * 0.2, r.y1, z0 + 4 + k * (h - 8)); c.beginPath(); c.arc(p.x, p.y, 1.2, 0, 7); c.fill(); }
  c.restore();
  c.fillStyle = "#3f8a3e"; for (let i = 0; i < 2; i++) { const p = frontX ? P(r.x1, r.y1 - 0.25 - i * 0.6, z0) : P(r.x0 + 0.2 + i * 0.4, r.y1, z0); c.beginPath(); c.moveTo(p.x - 2, p.y); c.quadraticCurveTo(p.x + Math.sin(t + i) * 3, p.y - 10, p.x, p.y - 16); c.lineTo(p.x + 2, p.y); c.fill(); }
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.2;
  poly(c, [P(r.x0, r.y1, z0), P(r.x1, r.y1, z0), P(r.x1, r.y0, z0), P(r.x1, r.y0, z0 + h), P(r.x0, r.y0, z0 + h), P(r.x0, r.y1, z0 + h)]); c.stroke();
  line(c, P(r.x1, r.y1, z0), P(r.x1, r.y1, z0 + h));
  c.fillStyle = "#2c3a40"; poly(c, [P(r.x0, r.y0, z0 + h), P(r.x1, r.y0, z0 + h), P(r.x1, r.y1, z0 + h), P(r.x0, r.y1, z0 + h)]); c.fill();
  // label kapasitas kecil
  const lp = P((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, z0 + h + 8);
  c.font = "800 8px system-ui"; c.textAlign = "center"; c.fillStyle = "rgba(23,63,80,.8)"; c.fillText(`${fish.length}/${T.cap}`, lp.x, lp.y);
}

const state = { scaffold: 0 };
NW.HOUSE = { EXT, PW, PH, plotLayout, PLOT_SOLIDS, drawExterior, drawPlotGround, plotObjects, drawRoomShell, drawBuiltin, drawFurniture, gateDraw, box, state, poly };
})();
