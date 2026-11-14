// NUSA ISLAND — Ide 08 · gambar Kedai Bu Indah (bangunan luar + perlengkapan interior) dan perkakas bersama. Semua prosedural (Canvas 2D isometrik), tanpa gambar eksternal.
// Cangkang statis digambar sekali ke kanvas luring (lihat room.js); benda bergerak (kucing, Bu Indah, tirai) digambar tiap bingkai dengan pekerjaan minimum.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDapurCore; if (!Core) return;
const P = (x, y, z) => NW.P(x, y, z || 0), TAU = Math.PI * 2;
const shade = (c, k) => NW.shade(c, k), mix = (a, b, k) => NW.mix(a, b, k);
const INK = "#173f50", WOOD = "#8a5a32", WOOD2 = "#6e4628", WOOD3 = "#4a2e18", CREAM = "#f6e5c8", TEAL = "#2f8f7a", TOMATO = "#d94f3d", MUSTARD = "#e8b53a", LEAF = "#4f9a46";

// ---------- perkakas gambar ----------
const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y); c.closePath(); };
const quadY = (x0, x1, y, z0, z1) => [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)];     // bidang y=tetap (menghadap +y)
const quadX = (x, y0, y1, z0, z1) => [P(x, y1, z0), P(x, y0, z0), P(x, y0, z1), P(x, y1, z1)];     // bidang x=tetap (menghadap +x)
const fill = (c, pts, col, stroke, lw) => { poly(c, pts); c.fillStyle = col; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } };
const line = (c, a, b, col, lw) => { c.strokeStyle = col; c.lineWidth = lw || 1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
// balok: left = sisi menghadap +y (kiri-bawah), right = sisi menghadap +x (kanan-bawah), top = atas
function box(c, r, z0, h, top, left, right, edge) {
  fill(c, quadY(r.x0, r.x1, r.y1, z0, z0 + h), left, edge, 0.8); fill(c, quadX(r.x1, r.y0, r.y1, z0, z0 + h), right, edge, 0.8);
  fill(c, [P(r.x0, r.y0, z0 + h), P(r.x1, r.y0, z0 + h), P(r.x1, r.y1, z0 + h), P(r.x0, r.y1, z0 + h)], top, edge, 0.8);
}
const woodBox = (c, r, z0, h, base) => box(c, r, z0, h, shade(base, 0.12), base, shade(base, -0.18), "rgba(60,36,16,.35)");
const ell = (c, x, y, rx, ry, col, a0, a1) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, a0 || 0, a1 === undefined ? TAU : a1); c.fill(); };
const rrect = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
// tulisan di bidang y=tetap (skewY +0.5) atau x=tetap (skewY −0.5): dipakai papan, label, kapur
function textOn(c, face, x, y, z, txt, px, col, align, weight) {
  const p = P(x, y, z); c.save(); c.translate(p.x, p.y); c.transform(1, face === "y" ? 0.5 : -0.5, 0, 1, 0, 0);
  c.fillStyle = col; c.font = (weight || 800) + " " + px + "px system-ui,sans-serif"; c.textAlign = align || "center"; c.textBaseline = "middle"; c.fillText(txt, 0, 0); c.restore();
}
function panelOn(c, face, x, y, z, w, h, col, stroke, r) {                                      // kotak membulat di bidang miring (pusat di x,y,z; w,h dalam px)
  const p = P(x, y, z); c.save(); c.translate(p.x, p.y); c.transform(1, face === "y" ? 0.5 : -0.5, 0, 1, 0, 0);
  rrect(c, -w / 2, -h / 2, w, h, r || 2); c.fillStyle = col; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); } c.restore();
}

// ---------- benda kecil ----------
function bottle(c, p, h, col, cap, w) {                                                          // p = titik dasar di layar
  w = w || 5; c.fillStyle = col; rrect(c, p.x - w / 2, p.y - h, w, h, 1.6); c.fill();
  c.fillStyle = shade(col, 0.35); c.fillRect(p.x - w / 2 + 0.8, p.y - h + 2, 1.1, h - 4);
  c.fillStyle = cap; c.fillRect(p.x - 1.6, p.y - h - 2.6, 3.2, 3);
}
function jar(c, p, w, h, col, lid, label) {
  c.fillStyle = col; rrect(c, p.x - w / 2, p.y - h, w, h, 1.8); c.fill(); c.strokeStyle = "rgba(23,63,80,.45)"; c.lineWidth = 0.7; c.stroke();
  c.fillStyle = lid; c.fillRect(p.x - w / 2 - 0.4, p.y - h - 2.4, w + 0.8, 2.8);
  if (label) { c.fillStyle = label; c.fillRect(p.x - w / 2 + 1.2, p.y - h * 0.68, w - 2.4, h * 0.34); }
  c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(p.x - w / 2 + 1, p.y - h + 2, 1, h - 5);
}
function sack(c, p, w, h, col, mark) {                                                           // karung beras berjahit
  c.fillStyle = col; c.beginPath(); c.moveTo(p.x - w / 2, p.y); c.quadraticCurveTo(p.x - w / 2 - 2, p.y - h * 0.6, p.x - w * 0.34, p.y - h * 0.9);
  c.lineTo(p.x - w * 0.18, p.y - h); c.lineTo(p.x + w * 0.18, p.y - h); c.lineTo(p.x + w * 0.34, p.y - h * 0.9); c.quadraticCurveTo(p.x + w / 2 + 2, p.y - h * 0.6, p.x + w / 2, p.y); c.closePath(); c.fill();
  c.strokeStyle = "rgba(90,58,32,.5)"; c.lineWidth = 0.8; c.stroke();
  c.strokeStyle = "rgba(120,80,40,.7)"; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x - w * 0.22, p.y - h * 0.9); c.lineTo(p.x + w * 0.22, p.y - h * 0.9); c.stroke();    // tali ikat
  if (mark) { c.fillStyle = mark; c.fillRect(p.x - w * 0.28, p.y - h * 0.62, w * 0.56, h * 0.22); }
}
function eggs(c, p, n, col) { for (let i = 0; i < n; i++) ell(c, p.x + (i % 3) * 4.4 - 4.4, p.y - 2 - ((i / 3) | 0) * 2.2, 2.2, 2.8, col || "#f7ead2"); }
function leafy(c, p, s, col) { for (let i = 0; i < 5; i++) { const a = -1.9 + i * 0.5; c.fillStyle = shade(col, (i % 2) * 0.12); c.beginPath(); c.ellipse(p.x + Math.cos(a) * 3 * s, p.y - 4 * s + Math.sin(a) * 2.5 * s, 3.4 * s, 5 * s, a + 1.57, 0, TAU); c.fill(); } }
function basket(c, p, w, h, col) {                                                               // keranjang rotan (jalinan)
  c.fillStyle = col; c.beginPath(); c.moveTo(p.x - w / 2, p.y - h); c.lineTo(p.x + w / 2, p.y - h); c.lineTo(p.x + w * 0.4, p.y); c.lineTo(p.x - w * 0.4, p.y); c.closePath(); c.fill();
  c.strokeStyle = shade(col, -0.3); c.lineWidth = 0.7; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(p.x - w / 2 + w * 0.02, p.y - h + (h * k) / 4); c.lineTo(p.x + w / 2 - w * 0.02, p.y - h + (h * k) / 4); c.stroke(); }
  for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(p.x + k * (w / 5), p.y - h); c.lineTo(p.x + k * (w / 6.2), p.y); c.stroke(); }
  c.fillStyle = shade(col, 0.2); c.fillRect(p.x - w / 2 - 1, p.y - h - 1.5, w + 2, 2.2);
}
function heart(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.5, y - s * 1.2, x, y - s * 0.3); c.bezierCurveTo(x + s * 0.5, y - s * 1.2, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); c.fill(); }

// ======================================================================
// 1) BANGUNAN LUAR — Kedai Bu Indah (peta Muara). Warung dua warna: dinding krem hangat, atap genteng terakota, kanopi hijau–putih, rak sayur di teras.
// ======================================================================
function exterior(c, b, t, night) {
  const a = P(b.x0, b.y0, 0), bb = P(b.x1, b.y0, 0), d = P(b.x1, b.y1, 0), e = P(b.x0, b.y1, 0), H = b.h, o = 0.28;
  c.save();
  c.fillStyle = "#cdb99a"; poly(c, [a, bb, d, e]); c.fill();                                                  // lantai teras
  const wall = (p, q, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.lineTo(q.x, q.y - H); c.lineTo(p.x, p.y - H); c.closePath(); c.fill(); };
  wall(d, bb, "#e0c79e"); wall(e, d, "#f6e5c8");                                                              // kanan (gelap) & depan-kiri (terang)
  const L = (u, v) => ({ x: e.x + (d.x - e.x) * u, y: e.y + (d.y - e.y) * u - v });                           // titik di dinding depan: u 0..1, v tinggi
  const R = (u, v) => ({ x: d.x + (bb.x - d.x) * u, y: d.y + (bb.y - d.y) * u - v });                         // titik di dinding kanan
  const quad = (u0, v0, u1, v1, col, st, f) => { f = f || L; const p0 = f(u0, v0), p1 = f(u1, v0), p2 = f(u1, v1), p3 = f(u0, v1); fill(c, [p0, p1, p2, p3], col, st, 1); };
  // lis bawah (batu) + dinding bata terekspos di bawah jendela
  quad(0, 0, 1, 9, "#9a8468"); quad(0, 0, 1, 9, "#9a8468", null, R); quad(0, 9, 1, 11, "#7a6650"); quad(0, 9, 1, 11, "#7a6650", null, R);
  // jendela kayu berdaun (kiri) dengan etalase sayur di baliknya + pintu masuk (kanan) bertirai
  quad(0.07, 17, 0.5, 44, WOOD2, WOOD3); quad(0.09, 19, 0.48, 42, night ? "#ffe3a8" : "#cfe9ea");
  quad(0.285, 19, 0.295, 42, WOOD2);
  for (let i = 0; i < 2; i++) { const u = 0.14 + i * 0.2, p = L(u, 19); basket(c, { x: p.x + 2, y: p.y - 1 }, 9, 6, "#c9a45c"); leafy(c, { x: p.x + 2, y: p.y - 6 }, 0.9, i ? "#e4573d" : LEAF); }
  quad(0.07, 14, 0.5, 17, shade(WOOD, 0.1), WOOD3);                                                           // ambang jendela
  const pt = L(0.17, 14); ell(c, pt.x, pt.y - 4, 3.5, 3, LEAF); c.fillStyle = "#b5532f"; c.fillRect(pt.x - 3, pt.y - 3, 6, 4);   // pot tanaman di ambang
  quad(0.6, 0, 0.9, 38, WOOD2, WOOD3); quad(0.62, 2, 0.88, 36, night ? "#ffd98a" : "#7a4e2a");                  // kusen & pintu
  for (let i = 0; i < 4; i++) { const u0 = 0.62 + i * 0.065, p = L(u0, 2), q = L(u0, 36); line(c, p, q, "rgba(30,15,5,.4)", 1); }
  const tr = [L(0.63, 36), L(0.87, 36), L(0.87, 18), L(0.63, 18)];                                              // tirai warung (kain bergaris)
  for (let i = 0; i < 6; i++) { const u0 = 0.63 + i * 0.04, u1 = u0 + 0.04; fill(c, [L(u0, 36), L(u1, 36), L(u1, 14 + (i % 2) * 2), L(u0, 14 + (i % 2) * 2)], i % 2 ? CREAM : TOMATO); }
  const kn = L(0.85, 15); c.fillStyle = MUSTARD; c.beginPath(); c.arc(kn.x, kn.y, 1.8, 0, TAU); c.fill();
  // kanopi hijau–putih
  const aw = H - 8;
  for (let i = 0; i < 9; i++) { const u0 = 0.02 + i * 0.1, u1 = u0 + 0.1, p0 = L(u0, aw), p1 = L(u1, aw); fill(c, [p0, p1, { x: p1.x + 5, y: p1.y + 15 }, { x: p0.x + 5, y: p0.y + 15 }], i % 2 ? "#fbf3e0" : TEAL); }
  for (let i = 0; i < 9; i++) { const u0 = 0.02 + i * 0.1, u1 = u0 + 0.1, p0 = L(u0, aw - 0), p1 = L(u1, aw); c.fillStyle = i % 2 ? "#fbf3e0" : TEAL; c.beginPath(); c.arc((p0.x + p1.x) / 2 + 5, (p0.y + p1.y) / 2 + 15, 4.6, 0, Math.PI); c.fill(); }   // jumbai bergelombang
  // atap genteng terakota (pelana-pinggul): bidang depan + segitiga kanan
  const ym = (b.y0 + b.y1) / 2, rz = H + 30, rl = P(b.x0 + 0.5, ym, rz), rr = P(b.x1 - 0.5, ym, rz);
  const e0 = P(b.x0 - o, b.y1 + o, H - 2), e1 = P(b.x1 + o, b.y1 + o, H - 2), e2 = P(b.x1 + o, b.y0 - o, H - 2);
  fill(c, [e1, e2, rr], "#a9462c", "#7c3220", 1);
  fill(c, [e0, e1, rr, rl], "#c8603a", "#7c3220", 1);
  for (let k = 1; k < 7; k++) { const u = k / 7; line(c, { x: e0.x + (rl.x - e0.x) * u, y: e0.y + (rl.y - e0.y) * u }, { x: e1.x + (rr.x - e1.x) * u, y: e1.y + (rr.y - e1.y) * u }, "rgba(90,30,15,.35)", 1); }
  for (let k = 1; k < 5; k++) { const u = k / 5; line(c, { x: e1.x + (e2.x - e1.x) * u * 0.5, y: e1.y + (e2.y - e1.y) * u * 0.5 }, { x: rr.x, y: rr.y }, "rgba(60,20,10,.25)", 1); }
  fill(c, [e0, e1, { x: e1.x, y: e1.y + 4 }, { x: e0.x, y: e0.y + 4 }], "#7c3220");                                // tebal tepi atap
  line(c, rl, rr, "#e89a72", 2);
  // papan nama kayu: KEDAI BU INDAH (di atas kanopi, menempel di atap depan)
  const cx = (e0.x + e1.x) / 2, cy = (e0.y + e1.y) / 2 - 14, sk = (e1.y - e0.y) / (e1.x - e0.x || 1);
  c.save(); c.translate(cx, cy); c.transform(1, sk, 0, 1, 0, 0);
  const g = c.createLinearGradient(-58, 0, 58, 0); g.addColorStop(0, "#5a3a20"); g.addColorStop(1, "#7a4f2c"); c.fillStyle = g; rrect(c, -58, -12, 116, 24, 5); c.fill(); c.strokeStyle = night ? "#ffe39a" : MUSTARD; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = "#fff3d4"; c.font = "800 12.5px system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; if (night) { c.shadowColor = "#ffcf6a"; c.shadowBlur = 7; } c.fillText("KEDAI BU INDAH", 4, -2.5);
  c.shadowBlur = 0; c.fillStyle = "#f0c88a"; c.font = "700 6.5px system-ui,sans-serif"; c.fillText("SEGAR · LENGKAP · RAMAH", 4, 7);
  ell(c, -46, 0, 7, 8.5, "#f7ead2"); c.fillStyle = LEAF; c.beginPath(); c.ellipse(-41, -6, 4, 2, -0.6, 0, TAU); c.fill(); ell(c, -46.5, -1, 3.5, 4.4, MUSTARD);   // lambang telur + daun
  c.restore();
  // rak sayur & kotak di teras, papan kapur, lampion
  const cr = P(b.x0 + 0.5, b.y1 + 0.42, 0); crate(c, cr, "#c9a45c", ["#e4573d", "#e4573d", LEAF], 1);
  const cr2 = P(b.x0 + 1.35, b.y1 + 0.5, 0); crate(c, cr2, "#b8864a", ["#f0a23a", "#f7ead2", "#f7ead2"], 0);
  const bd = P(b.x1 - 0.45, b.y1 + 0.38, 0); c.save(); c.translate(bd.x, bd.y); c.fillStyle = WOOD3; c.fillRect(-9, -27, 2, 27); c.fillRect(7, -27, 2, 27);
  c.fillStyle = "#26363a"; rrect(c, -11, -36, 22, 16, 2); c.fill(); c.strokeStyle = "#c9a46a"; c.lineWidth = 1.6; c.stroke(); c.fillStyle = "#f2f2e8"; c.font = "800 5.2px system-ui"; c.textAlign = "center"; c.fillText("TELUR", 0, -30); c.fillText("SEGAR ✓", 0, -23.5); c.restore();
  const ln = L(0.58, aw - 4); line(c, ln, { x: ln.x, y: ln.y + 9 }, "#3a2a1a", 1); ell(c, ln.x, ln.y + 13, 3.4, 4.4, night ? "#ffd27a" : "#e2574c"); c.fillStyle = MUSTARD; c.fillRect(ln.x - 1.2, ln.y + 8, 2.4, 1.6);
  if (night) { const p = L(0.75, aw - 6), rg = c.createRadialGradient(p.x, p.y + 14, 1, p.x, p.y + 14, 46); rg.addColorStop(0, "rgba(255,200,120,.55)"); rg.addColorStop(1, "rgba(255,200,120,0)"); c.fillStyle = rg; c.fillRect(p.x - 46, p.y - 32, 92, 92); }
  c.restore();
}
function crate(c, p, col, goods, leaf) {                                                                      // peti kayu berisi dagangan (titik dasar = p)
  c.fillStyle = shade(col, -0.2); c.fillRect(p.x - 11, p.y - 9, 22, 9); c.fillStyle = col; c.fillRect(p.x - 11, p.y - 9, 22, 4.5);
  c.strokeStyle = "rgba(60,36,16,.45)"; c.lineWidth = 0.8; c.strokeRect(p.x - 11, p.y - 9, 22, 9); c.beginPath(); c.moveTo(p.x - 11, p.y - 4.5); c.lineTo(p.x + 11, p.y - 4.5); c.stroke();
  for (let i = 0; i < 6; i++) { const q = { x: p.x - 8.5 + i * 3.4, y: p.y - 10.5 - (i % 2) }; if (leaf && i % 3 === 2) leafy(c, q, 0.8, LEAF); else ell(c, q.x, q.y, 2.6, 2.6, goods[i % goods.length]); }
}

// ======================================================================
// 2) INTERIOR KEDAI — cangkang statis (dibuat sekali) + benda dinamis
// ======================================================================
const K = () => Core.LAYOUT.kedai;
function kedaiShell(c, night) {
  const L = K(), w = L.w, d = L.d, WH = 118, door = L.door;
  // bayangan ruang & tebal lantai
  c.fillStyle = "rgba(0,0,0,.28)"; poly(c, [P(0, 0, -6), P(w, 0, -6), P(w, d, -6), P(0, d, -6)]); c.fill();
  fill(c, quadY(0, w, d, -9, 0), "#7a4f2c"); fill(c, quadX(w, 0, d, -9, 0), "#5e3b20");
  // lantai tegel kotak: krem & terakota lembut, nat tipis, satu ubin bermotif per beberapa petak
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) {
    const dx = Math.min(1, w - x), dy = Math.min(1, d - y), alt = (x + y) % 2;
    fill(c, [P(x, y), P(x + dx, y), P(x + dx, y + dy), P(x, y + dy)], alt ? "#e9c9a0" : "#dfa77c");
    if ((x * 3 + y * 5) % 7 === 0) { const m = P(x + dx / 2, y + dy / 2); c.strokeStyle = "rgba(160,70,40,.35)"; c.lineWidth = 1; c.beginPath(); c.moveTo(m.x - 9, m.y); c.lineTo(m.x, m.y - 4.5); c.lineTo(m.x + 9, m.y); c.lineTo(m.x, m.y + 4.5); c.closePath(); c.stroke(); }
  }
  c.strokeStyle = "rgba(120,70,40,.28)"; c.lineWidth = 1; for (let x = 0; x <= w; x++) line(c, P(x, 0), P(x, d), "rgba(120,70,40,.28)", 1); for (let y = 0; y <= d; y++) line(c, P(0, y), P(w, y), "rgba(120,70,40,.28)", 1);
  // jalur lantai terang dari pintu (sering diinjak)
  c.fillStyle = "rgba(255,244,214,.16)"; poly(c, [P(0.1, door.y0 - 0.1), P(3.4, door.y0 + 0.2), P(3.4, door.y1 - 0.2), P(0.1, door.y1 + 0.1)]); c.fill();
  // dinding belakang (y=0): atas krem, lambris hijau-teal berpapan, lis kayu
  fill(c, quadY(0, w, 0, 0, WH), "#f3e0bd"); fill(c, [P(0, 0, 0), P(0, d, 0), P(0, d, WH), P(0, 0, WH)], "#e6cf9f");
  fill(c, quadY(0, w, 0, 0, 38), TEAL); fill(c, [P(0, 0, 0), P(0, d, 0), P(0, d, 38), P(0, 0, 38)], shade(TEAL, -0.14));
  for (let x = 0.4; x < w; x += 0.4) line(c, P(x, 0, 2), P(x, 0, 36), "rgba(10,60,50,.28)", 1); for (let y = 0.4; y < d; y += 0.4) line(c, P(0, y, 2), P(0, y, 36), "rgba(10,60,50,.28)", 1);
  fill(c, quadY(0, w, 0, 38, 41), "#fbf1da"); fill(c, [P(0, 0, 38), P(0, d, 38), P(0, d, 41), P(0, 0, 41)], "#efe0c0");     // lis putih
  for (let x = 0.2; x < w; x += 0.6) { const p = P(x, 0, 47); c.fillStyle = "rgba(217,79,61,.55)"; c.beginPath(); c.moveTo(p.x, p.y - 3); c.lineTo(p.x + 3, p.y); c.lineTo(p.x, p.y + 3); c.lineTo(p.x - 3, p.y); c.fill(); }          // pita motif belah ketupat
  for (let y = 0.2; y < d; y += 0.6) { const p = P(0, y, 47); c.fillStyle = "rgba(217,79,61,.55)"; c.beginPath(); c.moveTo(p.x, p.y - 3); c.lineTo(p.x + 3, p.y); c.lineTo(p.x, p.y + 3); c.lineTo(p.x - 3, p.y); c.fill(); }
  fill(c, quadY(0, w, 0, 0, 6), WOOD2); fill(c, [P(0, 0, 0), P(0, d, 0), P(0, d, 6), P(0, 0, 6)], WOOD3);                      // papan kaki
  fill(c, quadY(0, w, 0, WH, WH + 7), WOOD2); fill(c, [P(0, 0, WH), P(0, d, WH), P(0, d, WH + 7), P(0, 0, WH + 7)], WOOD3);   // lis atas
  for (let x = 1; x < w; x += 2) line(c, P(x, 0, WH), P(x, 0, WH + 34), "rgba(90,58,32,.55)", 4);                                // balok langit-langit
  // jendela belakang di atas meja tempe (laut terlihat) + tirai kotak-kotak
  const wx0 = 5.55, wx1 = 7.05, wz0 = 52, wz1 = 100;
  fill(c, quadY(wx0 - 0.1, wx1 + 0.1, 0, wz0 - 5, wz1 + 5), WOOD2);
  const sky = c.createLinearGradient(0, P(0, 0, wz1).y, 0, P(0, 0, wz0).y); if (night) { sky.addColorStop(0, "#13234a"); sky.addColorStop(1, "#2a3f73"); } else { sky.addColorStop(0, "#8fd0ea"); sky.addColorStop(0.62, "#d8f0f2"); sky.addColorStop(0.63, "#2fa3bb"); sky.addColorStop(1, "#1d7f9c"); }
  c.fillStyle = sky; poly(c, quadY(wx0, wx1, 0, wz0, wz1)); c.fill();
  if (!night) { const m = P(wx0 + 0.45, 0, wz1 - 12); ell(c, m.x, m.y, 8, 4, "rgba(255,255,255,.85)"); ell(c, m.x + 6, m.y + 1, 6, 3, "rgba(255,255,255,.8)"); }
  line(c, P((wx0 + wx1) / 2, 0, wz0), P((wx0 + wx1) / 2, 0, wz1), WOOD2, 3); line(c, P(wx0, 0, (wz0 + wz1) / 2), P(wx1, 0, (wz0 + wz1) / 2), WOOD2, 3);
  fill(c, quadY(wx0 - 0.18, wx0 + 0.3, 0, wz0 - 2, wz1 + 4), "#d94f3d"); fill(c, quadY(wx1 - 0.3, wx1 + 0.18, 0, wz0 - 2, wz1 + 4), "#d94f3d");   // tirai kain
  for (let k = 0; k < 4; k++) { line(c, P(wx0 - 0.18, 0, wz0 + 6 + k * 12), P(wx0 + 0.3, 0, wz0 + 6 + k * 12), "rgba(255,240,220,.5)", 1.4); line(c, P(wx1 - 0.3, 0, wz0 + 6 + k * 12), P(wx1 + 0.18, 0, wz0 + 6 + k * 12), "rgba(255,240,220,.5)", 1.4); }
  fill(c, quadY(wx0 - 0.1, wx1 + 0.1, 0, wz0 - 8, wz0 - 5), shade(WOOD, 0.1));
  // papan nama kain di dinding belakang (di atas bak sayur)
  panelOn(c, "y", 2.2, 0, 98, 104, 26, "#5a3a20", "#e8b53a", 4); panelOn(c, "y", 2.2, 0, 98, 98, 20, "#7a4f2c", null, 3);
  textOn(c, "y", 2.2, 0, 100, "KEDAI BU INDAH", 11, "#fff3d4"); textOn(c, "y", 2.2, 0, 91, "ramah · segar · lengkap", 5.6, "#f0c88a", "center", 700);
  // jam dinding & kalender di atas rak belakang kasir
  const ck = P(8.1, 0, 100); c.fillStyle = WOOD3; c.beginPath(); c.arc(ck.x, ck.y, 10.5, 0, TAU); c.fill(); c.fillStyle = "#fff8e8"; c.beginPath(); c.arc(ck.x, ck.y, 8.6, 0, TAU); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(ck.x, ck.y); c.lineTo(ck.x + 0.5, ck.y - 5.5); c.stroke(); c.beginPath(); c.moveTo(ck.x, ck.y); c.lineTo(ck.x + 4.2, ck.y + 1.4); c.stroke(); c.fillStyle = TOMATO; c.beginPath(); c.arc(ck.x, ck.y, 1.1, 0, TAU); c.fill();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; c.fillStyle = INK; c.fillRect(ck.x + Math.sin(a) * 7.2 - 0.5, ck.y - Math.cos(a) * 7.2 - 0.5, 1, 1); }
  panelOn(c, "y", 7.55, 0, 80, 14, 19, "#fbf3e0", "#8a5a32", 1); panelOn(c, "y", 7.55, 0, 86.5, 14, 6, TOMATO, null, 1); textOn(c, "y", 7.55, 0, 78, "NOV", 4.6, INK); textOn(c, "y", 7.55, 0, 71.5, "13", 7, INK);
  // papan kapur "SEGAR HARI INI" di dinding kiri, di atas rak beras (tanpa angka harga: harga sebenarnya dibaca dari server di rak)
  const bz = 92; fill(c, quadX(0, 1.05, 3.65, bz - 14, bz + 14), WOOD2); fill(c, quadX(0, 1.12, 3.58, bz - 12, bz + 12), "#26363a");
  textOn(c, "x", 0, 2.35, bz + 5, "SEGAR HARI INI", 6.6, "#f7f2dc"); textOn(c, "x", 0, 2.35, bz - 5.5, "ambil · bayar di kasir", 4.8, "#bfe0d6", "center", 700);
  const eg = P(0, 1.35, bz - 4); ell(c, eg.x, eg.y, 3, 3.8, "#f7f2dc"); const lf = P(0, 3.45, bz - 4); c.strokeStyle = "#9fe0a0"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(lf.x, lf.y + 3); c.quadraticCurveTo(lf.x + 3, lf.y - 3, lf.x + 6, lf.y - 1); c.stroke();
  // pintu keluar di dinding kiri: kusen, daun kayu berkaca, lonceng, tanda BUKA, cahaya
  const dz = 70; fill(c, [P(0, door.y0 - 0.1, 0), P(0, door.y1 + 0.1, 0), P(0, door.y1 + 0.1, dz + 4), P(0, door.y0 - 0.1, dz + 4)], WOOD3);
  fill(c, [P(0, door.y0, 0), P(0, door.y1, 0), P(0, door.y1, dz), P(0, door.y0, dz)], WOOD);
  fill(c, [P(0, door.y0 + 0.14, dz - 30), P(0, door.y1 - 0.14, dz - 30), P(0, door.y1 - 0.14, dz - 6), P(0, door.y0 + 0.14, dz - 6)], night ? "#2a3f73" : "#bfe9ee", WOOD3, 1.2);
  line(c, P(0, (door.y0 + door.y1) / 2, dz - 30), P(0, (door.y0 + door.y1) / 2, dz - 6), WOOD3, 1.4);
  fill(c, [P(0, door.y0 + 0.14, 8), P(0, door.y1 - 0.14, 8), P(0, door.y1 - 0.14, dz - 36), P(0, door.y0 + 0.14, dz - 36)], shade(WOOD, -0.1), WOOD3, 1);
  const hd = P(0, door.y1 - 0.2, 34); ell(c, hd.x, hd.y, 2.2, 2.2, MUSTARD);
  const bl = P(0, door.y0 + 0.4, dz + 3); line(c, bl, { x: bl.x, y: bl.y + 7 }, "#3a2a1a", 1); c.fillStyle = MUSTARD; c.beginPath(); c.moveTo(bl.x - 3, bl.y + 12); c.lineTo(bl.x + 3, bl.y + 12); c.lineTo(bl.x + 1.8, bl.y + 7); c.lineTo(bl.x - 1.8, bl.y + 7); c.fill();
  panelOn(c, "x", 0, door.y1 - 0.45, 54, 18, 9, TOMATO, "#7c1f12", 1.5); textOn(c, "x", 0, door.y1 - 0.45, 54, "BUKA", 5.6, "#fff6e4");
  // keset di depan pintu
  fill(c, [P(0.05, door.y0 - 0.05, 0.4), P(1.35, door.y0 - 0.05, 0.4), P(1.35, door.y1 + 0.05, 0.4), P(0.05, door.y1 + 0.05, 0.4)], "#8a5a32", "#5e3b20", 1);
  for (let k = 0; k < 6; k++) line(c, P(0.2 + k * 0.2, door.y0 + 0.05, 0.5), P(0.2 + k * 0.2, door.y1 - 0.05, 0.5), "rgba(255,230,180,.35)", 1);
  // ===== perabot menempel dinding (statis) =====
  rakBeras(c); binSayur(c); kulkas(c); rakBelakang(c); mejaTempe(c);
}
function rakBeras(c) {                                                                                         // rak panjang di dinding kiri: karung beras, toples bumbu, botol minyak
  const s = K().solids.rakBeras, H = 64, x0 = 0.02, x1 = 0.68;
  woodBox(c, { x0, y0: s.y0, x1, y1: s.y1 }, 0, 6, WOOD2);                                                    // alas
  for (const y of [s.y0 + 0.04, s.y1 - 0.04]) fill(c, quadX(x1, y - 0.04, y + 0.04, 0, H), WOOD3);            // tiang ujung
  fill(c, quadX(x0 + 0.01, s.y0, s.y1, 6, H), shade(WOOD, -0.25));                                            // papan belakang
  // isi rak digambar dari y kecil ke besar (jauh → dekat)
  const row = (z, fn) => { for (let k = 0; k < 5; k++) fn(s.y0 + 0.36 + k * 0.6, k); };
  for (const z of [30, 48]) { fill(c, [P(x0, s.y0, z), P(x1, s.y0, z), P(x1, s.y1, z), P(x0, s.y1, z)], shade(WOOD, 0.18), WOOD3, 0.8); fill(c, quadX(x1, s.y0, s.y1, z - 3, z), WOOD); }
  fill(c, [P(x0, s.y0, H), P(x1, s.y0, H), P(x1, s.y1, H), P(x0, s.y1, H)], shade(WOOD, 0.22), WOOD3, 0.8); fill(c, quadX(x1, s.y0, s.y1, H - 3, H), WOOD);
  const cols = ["#efe3c4", "#e8d6a8", "#f2e9d0"], marks = [TOMATO, LEAF, MUSTARD];
  for (let k = 0; k < 4; k++) sack(c, P(0.4, s.y0 + 0.4 + k * 0.72, 6), 17, 22, cols[k % 3], marks[k % 3]);          // 4 karung beras di dasar
  const jc = P(0.44, s.y1 - 0.3, 6); c.fillStyle = "#f0c53a"; rrect(c, jc.x - 7, jc.y - 22, 14, 22, 2); c.fill(); c.strokeStyle = "rgba(90,58,12,.6)"; c.lineWidth = 0.8; c.stroke(); c.fillStyle = "#d94f3d"; c.fillRect(jc.x - 3, jc.y - 26, 6, 4);    // jerigen minyak
  textOn(c, "x", 0.69, s.y1 - 0.3, 14, "MINYAK", 3.2, "#7a3a10");
  row(30, (y, k) => { const p = P(0.44, y, 30); if (k % 3 === 0) jar(c, p, 9, 13, "#f7f2e8", "#e8b53a", "#2f8f7a"); else if (k % 3 === 1) jar(c, p, 9, 14, "#efe6c9", "#d94f3d", null); else jar(c, p, 10, 12, "#a05a30", "#3a2a1a", "#f3e0bd"); });
  row(48, (y, k) => { const p = P(0.44, y, 48); if (k % 2) bottle(c, p, 14, "#d98a1a", "#3a2a1a", 6); else bottle(c, p, 12, "#a31f1a", "#f7f2e8", 5.4); });
  for (let k = 0; k < 4; k++) { const p = P(0.44, s.y0 + 0.5 + k * 0.7, H); c.fillStyle = ["#e8b53a", "#f7f2e8", "#e08a6a", "#9fd3b0"][k]; c.fillRect(p.x - 5, p.y - 8, 10, 8); c.strokeStyle = "rgba(60,36,16,.4)"; c.lineWidth = 0.7; c.strokeRect(p.x - 5, p.y - 8, 10, 8); }
  for (let k = 0; k < 3; k++) { const y = s.y0 + 0.65 + k * 1.0, p = P(x1 + 0.005, y, 40); panelOn(c, "x", x1 + 0.005, y, 25.5, 17, 5, "#fbf1da", "#8a5a32", 1); textOn(c, "x", x1 + 0.005, y, 25.5, ["BUMBU", "GARAM · GULA", "MINYAK"][k], 3.4, INK, "center", 800); void p; }   // label rak
}
function binSayur(c) {                                                                                         // empat keranjang bertingkat miring di dinding belakang (sayur & bumbu segar)
  const s = K().solids.sayur, ids = ["sayuran", "bawang_merah", "bawang_putih", "cabai", "jeruk_nipis"];
  woodBox(c, { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y0 + 0.5 }, 0, 20, WOOD2);
  woodBox(c, { x0: s.x0, y0: s.y0 + 0.5, x1: s.x1, y1: s.y1 }, 0, 11, shade(WOOD, 0.05));
  fill(c, quadY(s.x0, s.x1, s.y0, 20, 48), shade(WOOD, -0.3));                                                 // papan sandaran
  const gx = [LEAF, "#b73a52", "#f7ead2", "#e03a2a", "#b8d33a"];
  ids.forEach((id, k) => {
    const x = s.x0 + 0.27 + k * 0.47, pb = P(x, s.y0 + 0.62, 11);
    basket(c, pb, 18, 9, ["#c9a45c", "#b8864a", "#d6b36a", "#c9a45c", "#b8864a"][k]);
    for (let i = 0; i < 7; i++) {
      const q = { x: pb.x - 6.5 + (i % 4) * 4.4 + (i > 3 ? 2 : 0), y: pb.y - 10 - (i > 3 ? 4 : 0) };
      if (k === 0) leafy(c, { x: q.x, y: q.y + 1 }, 1.0, i % 2 ? LEAF : "#6bb55a"); else if (k === 1) { ell(c, q.x, q.y, 3.2, 3.4, gx[1]); c.fillStyle = "#e8a3b0"; c.fillRect(q.x - 0.4, q.y - 4.4, 0.8, 1.4); }
      else if (k === 2) { ell(c, q.x, q.y, 3, 3.3, "#f7ead2"); c.fillStyle = "#e8d6b0"; c.fillRect(q.x - 0.4, q.y - 4.2, 0.8, 1.2); }
      else if (k === 3) { c.fillStyle = i % 2 ? "#e03a2a" : "#2f9a4a"; c.beginPath(); c.ellipse(q.x, q.y, 1.5, 4.2, 0.5 + (i % 3) * 0.3, 0, TAU); c.fill(); }
      else ell(c, q.x, q.y, 3.1, 2.8, i % 2 ? "#b8d33a" : "#9fc92a");
    }
    panelOn(c, "y", x, s.y1 - 0.02, 5.5, 18, 6.2, "#fbf1da", "#8a5a32", 1); textOn(c, "y", x, s.y1 - 0.02, 5.5, ["SAYUR", "B. MERAH", "B. PUTIH", "CABAI", "NIPIS"][k], 3.6, INK, "center", 800);
  });
}
function kulkas(c) {                                                                                           // kulkas dua pintu bermagnet (telur & susu & es)
  const s = K().solids.kulkas, r = { x0: s.x0, y0: s.y0 + 0.04, x1: s.x1, y1: s.y1 - 0.05 }, H = 76;
  box(c, r, 0, H, "#f4f1ea", "#e6e9e6", "#c9cfcc", "rgba(23,63,80,.35)");
  fill(c, quadY(r.x0, r.x1, r.y1, 0, 5), "#8d9794");                                                           // kaki
  line(c, P(r.x0, r.y1, H * 0.55), P(r.x1, r.y1, H * 0.55), "rgba(23,63,80,.45)", 1.2);                          // sekat freezer / bawah
  const hy = (r.x0 + r.x1) / 2;
  fill(c, quadY(hy - 0.02, hy + 0.02, r.y1, 4, H - 3), "rgba(23,63,80,.18)");
  for (const z of [H * 0.5, H * 0.33]) { const p = P(r.x1 - 0.14, r.y1, z); c.fillStyle = "#6e7a78"; c.fillRect(p.x - 1, p.y - 7, 2.4, 14); }
  // jendela kaca kecil memperlihatkan baki telur & karton susu
  fill(c, quadY(r.x0 + 0.1, hy - 0.08, r.y1, H * 0.58, H - 8), "rgba(190,230,240,.7)", "rgba(23,63,80,.45)", 1);
  const e0 = P(r.x0 + 0.3, r.y1, H * 0.63); eggs(c, e0, 6, "#f7ead2"); const e1 = P(r.x0 + 0.6, r.y1, H * 0.74); eggs(c, e1, 3, "#e8c9a0");
  fill(c, quadY(hy + 0.08, r.x1 - 0.1, r.y1, H * 0.58, H - 8), "rgba(190,230,240,.7)", "rgba(23,63,80,.45)", 1);
  for (let k = 0; k < 3; k++) { const p = P(hy + 0.27 + k * 0.2, r.y1, H * 0.58); c.fillStyle = k === 1 ? "#4a8fc8" : "#fbfbf6"; c.fillRect(p.x - 3, p.y - 12, 6, 12); c.fillStyle = TOMATO; c.fillRect(p.x - 3, p.y - 7, 6, 2.4); c.fillStyle = k === 1 ? "#fbfbf6" : "#4a8fc8"; c.fillRect(p.x - 3, p.y - 14, 6, 2); }
  panelOn(c, "y", hy, r.y1, H * 0.2, 36, 8, "#2f8f7a", null, 2); textOn(c, "y", hy, r.y1, H * 0.2, "TELUR · SUSU · ES", 4.4, "#f6fff9");
  for (const [dx, col] of [[-0.35, TOMATO], [0.3, MUSTARD]]) { const p = P(hy + dx, r.y1, H * 0.42); ell(c, p.x, p.y, 3, 3, col); }                  // magnet
  const nt = P(hy - 0.4, r.y1, H * 0.4); c.fillStyle = "#fff8c8"; c.fillRect(nt.x - 4, nt.y - 5, 8, 8); c.strokeStyle = "rgba(0,0,0,.2)"; c.strokeRect(nt.x - 4, nt.y - 5, 8, 8);
  fill(c, [P(r.x0, r.y0, H), P(r.x1, r.y0, H), P(r.x1, r.y1, H), P(r.x0, r.y1, H)], "#fbf9f2");
  const pl = P(hy + 0.1, r.y0 + 0.4, H); c.fillStyle = "#b5532f"; c.fillRect(pl.x - 4, pl.y - 6, 8, 6); leafy(c, { x: pl.x, y: pl.y - 6 }, 0.9, LEAF);          // pot daun di atas kulkas
}
function rakBelakang(c) {                                                                                      // rak di belakang kasir: dagangan kemasan & kantong plastik
  const s = K().solids.rakBelakang, H = 78;
  woodBox(c, { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }, 0, 6, WOOD2);
  fill(c, quadY(s.x0, s.x1, s.y1 - 0.05, 6, H), shade(WOOD, -0.3));
  for (const z of [26, 46, 66]) { fill(c, [P(s.x0, s.y0, z), P(s.x1, s.y0, z), P(s.x1, s.y1 - 0.05, z), P(s.x0, s.y1 - 0.05, z)], shade(WOOD, 0.15), WOOD3, 0.8); fill(c, quadY(s.x0, s.x1, s.y1 - 0.05, z - 3, z), WOOD); }
  const cols = ["#d94f3d", "#2f8f7a", "#e8b53a", "#4a8fc8", "#f7ead2", "#b35a8a"];
  for (const [zi, z] of [26, 46, 66].entries()) for (let k = 0; k < 7; k++) { const p = P(s.x0 + 0.22 + k * 0.23, s.y1 - 0.28, z - 20 + 20 + 0); const h = 8 + ((k * 5 + zi * 3) % 4) * 1.6; c.fillStyle = cols[(k + zi * 2) % cols.length]; rrect(c, p.x - 4.2, p.y - h - 20 + 20, 8.4, h, 1.2); c.fill(); c.fillStyle = "rgba(255,255,255,.4)"; c.fillRect(p.x - 3, p.y - h - 18 + 20, 2, h - 4); }
  const pl = P(s.x0 + 0.5, s.y1 - 0.28, 6); for (let k = 0; k < 3; k++) { c.fillStyle = k % 2 ? "#e9f1f4" : "#f7f0e0"; c.fillRect(pl.x - 6 + k * 5, pl.y - 12, 7, 12); }   // gulungan kantong plastik
  textOn(c, "y", (s.x0 + s.x1) / 2, s.y1 - 0.05, 84, "RAK PILIHAN", 4.8, "#fff3d4"); void H;
}
function mejaTempe(c) {                                                                                        // meja tempe: tempe terbungkus daun pisang + timbangan gantung
  const s = K().solids.tempe, H = 30;
  woodBox(c, { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }, 0, H, WOOD);
  fill(c, [P(s.x0 - 0.04, s.y0 - 0.04, H), P(s.x1 + 0.04, s.y0 - 0.04, H), P(s.x1 + 0.04, s.y1 + 0.04, H), P(s.x0 - 0.04, s.y1 + 0.04, H)], shade(WOOD, 0.3), WOOD3, 0.8);   // permukaan
  for (let k = 1; k < 5; k++) line(c, P(s.x0 + k * 0.35, s.y0, H + 0.1), P(s.x0 + k * 0.35, s.y1, H + 0.1), "rgba(90,58,32,.25)", 1);
  fill(c, quadY(s.x0 + 0.08, s.x1 - 0.08, s.y1, 3, H - 4), shade(WOOD, -0.12), WOOD3, 0.8);
  textOn(c, "y", (s.x0 + s.x1) / 2, s.y1, H - 12, "TEMPE HANGAT", 5.4, "#fff3d4");
  const lv = "#4e9a46", lv2 = "#3d7f38";
  for (let k = 0; k < 6; k++) {                                                                                  // tumpukan tempe bungkus daun
    const x = s.x0 + 0.3 + (k % 3) * 0.5, y = s.y0 + 0.3 + ((k / 3) | 0) * 0.42, p = P(x, y, H + 0.4);
    c.fillStyle = lv2; c.beginPath(); c.moveTo(p.x - 8, p.y); c.lineTo(p.x, p.y - 5); c.lineTo(p.x + 8, p.y); c.lineTo(p.x, p.y + 5); c.closePath(); c.fill();
    c.fillStyle = lv; c.beginPath(); c.moveTo(p.x - 8, p.y); c.lineTo(p.x, p.y - 5); c.lineTo(p.x + 8, p.y); c.lineTo(p.x + 8, p.y - 4); c.lineTo(p.x, p.y - 9); c.lineTo(p.x - 8, p.y - 4); c.closePath(); c.fill();
    c.fillStyle = "#e9dcb0"; c.beginPath(); c.moveTo(p.x - 5, p.y - 4.5); c.lineTo(p.x, p.y - 7.4); c.lineTo(p.x + 5, p.y - 4.5); c.lineTo(p.x, p.y - 1.8); c.closePath(); c.fill();   // sisi tempe terlihat
    c.strokeStyle = "rgba(120,100,50,.45)"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(p.x - 3, p.y - 4.7); c.lineTo(p.x + 3, p.y - 4.7); c.stroke();
  }
  const sc = P(s.x1 - 0.25, s.y0 + 0.55, H); c.fillStyle = "#c9cfcc"; c.fillRect(sc.x - 7, sc.y - 3, 14, 3); c.fillStyle = "#6e7a78"; c.fillRect(sc.x - 1, sc.y - 14, 2, 11);
  c.strokeStyle = "#6e7a78"; c.lineWidth = 1; c.beginPath(); c.moveTo(sc.x - 8, sc.y - 13); c.lineTo(sc.x + 8, sc.y - 13); c.stroke(); c.beginPath(); c.arc(sc.x - 7, sc.y - 8, 4, 0.2, Math.PI - 0.2); c.stroke(); c.beginPath(); c.arc(sc.x + 7, sc.y - 8, 4, 0.2, Math.PI - 0.2); c.stroke();   // timbangan dacin
  const gl = P(s.x0 + 0.2, s.y1 - 0.15, H); c.fillStyle = "rgba(190,230,240,.55)"; c.fillRect(gl.x - 6, gl.y - 9, 12, 9); c.strokeStyle = "#6e7a78"; c.strokeRect(gl.x - 6, gl.y - 9, 12, 9);
}

NW.dapurArt = { P, poly, quadY, quadX, fill, line, box, woodBox, ell, rrect, textOn, panelOn, bottle, jar, sack, eggs, leafy, basket, heart, crate, exterior, kedaiShell, INK, WOOD, WOOD2, WOOD3, CREAM, TEAL, TOMATO, MUSTARD, LEAF, shade, mix };
})();
