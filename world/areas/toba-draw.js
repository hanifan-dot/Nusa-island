// =========================================================
//  NUSA ISLAND — Bumbu 2: gambar KAMPUNG TEPIAN TOBA (Canvas 2D prosedural)
//  Tema danau dingin & perbukitan pinus. Rumah tepi danau memakai atap pelana
//  melengkung yang terinspirasi rumah-rumah di sekitar Danau Toba — sengaja
//  sederhana, tanpa ornamen/simbol adat, supaya tidak menempel budaya asal-asalan.
// =========================================================
(() => {
"use strict";
const M = NW.TOBA_MAP, { T, hash2, P, LIFT, mix, shade, rgba, poly } = NW;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Warna ----------
const C = {
  deep: "#24708c", mid: "#3a8ea6", shallow: "#6cc0c4", lakeFar: "#2b7893",
  grass: "#7cb562", grassDark: "#5f9c4f", sand: "#e3d0a0", sandSide: "#b99a67", path: "#d3b688", pathEdge: "#bd9b6c",
  hillTop: "#4c8648", hillTop2: "#3f7a40", hillSide: "#365f34", hillSide2: "#2c4f2c", forest: "#4f8443", pine: "#2f6a3c", pine2: "#3d7d46", pineDark: "#24533a",
};
function waterColor(x, y) {
  const d = M.lakeD(x + 0.5, y + 0.5), k = clamp(d / 3.2, 0, 1);
  return k < 0.4 ? mix(C.shallow, C.mid, k / 0.4) : mix(C.mid, C.deep, (k - 0.4) / 0.6);
}

// ---------- Tile daratan (dengan tinggi bukit) ----------
function landTile(g, x, y, t, K) {
  const tileAt = M.tileAt, h = hash2(x, y);
  if (t === T.HILL) return hillTile(g, x, y);
  const z00 = LIFT + M.heightAt(x, y), z10 = LIFT + M.heightAt(x + 1, y), z11 = LIFT + M.heightAt(x + 1, y + 1), z01 = LIFT + M.heightAt(x, y + 1);
  const water = (tt) => !NW.isLandT(tt);
  // tebing ke air (termasuk bukit yang langsung menurun ke danau)
  if (water(tileAt(x + 1, y))) { g.fillStyle = shade(C.sandSide, -0.1); poly(g, [P(x + 1, y, z10), P(x + 1, y + 1, z11), P(x + 1, y + 1, 0), P(x + 1, y, 0)]); g.fill(); }
  if (water(tileAt(x, y + 1))) { g.fillStyle = C.sandSide; poly(g, [P(x, y + 1, z01), P(x + 1, y + 1, z11), P(x + 1, y + 1, 0), P(x, y + 1, 0)]); g.fill(); }
  let base;
  if (t === T.GRASS) base = mix(C.grass, C.grassDark, h * 0.5);
  else if (t === T.SAND) base = mix(C.sand, "#d8c38d", h * 0.6);
  else if (t === T.FOREST) base = mix(C.forest, "#45773c", h * 0.6);
  else base = C.grass; // jalan: dasar rumput, jalan digambar di atasnya
  if (t === T.GRASS && M.lakeD(x + 0.5, y + 0.5) > -2.2) base = mix(base, "#a9be78", 0.35);
  // lereng menghadap cahaya (kiri-atas) lebih terang
  const slope = (z00 - z11) * 0.012 + (z01 - z10) * 0.004;
  if (slope) base = shade(base, clamp(slope, -0.18, 0.18));
  g.fillStyle = base; poly(g, [P(x, y, z00), P(x + 1, y, z10), P(x + 1, y + 1, z11), P(x, y + 1, z01)]); g.fill();
  g.strokeStyle = base; g.lineWidth = 0.8; g.stroke();
  const zc = (z00 + z10 + z11 + z01) / 4;
  if (t === T.GRASS || t === T.FOREST) {
    g.strokeStyle = shade(base, -0.18); g.lineWidth = 1.1; g.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const u = hash2(x * 7 + i, y * 3 - i), v = hash2(x * 5 - i, y * 11 + i);
      const p = P(x + 0.15 + u * 0.7, y + 0.15 + v * 0.7, zc);
      g.beginPath(); g.moveTo(p.x - 2, p.y); g.lineTo(p.x - 0.5, p.y - 4); g.moveTo(p.x + 1, p.y); g.lineTo(p.x + 2.5, p.y - 3.5); g.stroke();
    }
    if (t === T.GRASS && h > 0.88) { const fc = ["#fff6d8", "#c9b3f2", "#f7d25a"][(h * 1000) % 3 | 0]; for (let i = 0; i < 3; i++) { const p = P(x + 0.3 + i * 0.2, y + 0.6 - i * 0.15, zc); g.fillStyle = fc; g.beginPath(); g.arc(p.x, p.y - 2, 1.6, 0, 7); g.fill(); } }
    if (t === T.FOREST) { g.fillStyle = "rgba(40,70,40,.25)"; for (let i = 0; i < 3; i++) { const p = P(x + hash2(x + i, y) * 0.9, y + hash2(x, y + i) * 0.9, zc); g.beginPath(); g.ellipse(p.x, p.y, 5, 2.2, 0, 0, 7); g.fill(); } }
  } else if (t === T.SAND) {
    g.fillStyle = shade(base, -0.12);
    for (let i = 0; i < 5; i++) { const p = P(x + hash2(x + i, y * 2) * 0.9 + 0.05, y + hash2(x * 3, y + i) * 0.9 + 0.05, zc); g.fillRect(p.x, p.y, 1.4, 1.4); }
    if (h > 0.9) { const p = P(x + 0.5, y + 0.5, zc); g.fillStyle = "#9aa3a8"; g.beginPath(); g.ellipse(p.x + 5, p.y + 1, 3.2, 1.8, 0.2, 0, 7); g.fill(); } // kerikil danau
  } else if (t === T.PATH) {
    const N2 = (dx, dy) => { const tt = tileAt(x + dx, y + dy); return tt === T.PATH || tt === T.DOCK; };
    const zz = (u, v) => LIFT + M.heightAt(x + u, y + v);
    const q = (x0, y0, x1, y1) => [P(x + x0, y + y0, zz(x0, y0)), P(x + x1, y + y0, zz(x1, y0)), P(x + x1, y + y1, zz(x1, y1)), P(x + x0, y + y1, zz(x0, y1))];
    g.fillStyle = C.pathEdge; poly(g, q(0.06, 0.06, 0.94, 0.94)); g.fill();
    g.fillStyle = C.path;
    poly(g, q(N2(-1, 0) ? 0 : 0.12, N2(0, -1) ? 0 : 0.12, N2(1, 0) ? 1 : 0.88, N2(0, 1) ? 1 : 0.88)); g.fill();
    g.fillStyle = "#b29164";
    for (let i = 0; i < 4; i++) { const p = P(x + 0.2 + hash2(x + i * 3, y) * 0.6, y + 0.2 + hash2(x, y + i * 5) * 0.6, zc); g.beginPath(); g.ellipse(p.x, p.y, 1.8, 1, 0, 0, 7); g.fill(); }
    if (M.heightAt(x + 0.5, y + 0.5) > 3 && hash2(x, y * 3) > 0.3) { // anak tangga batu di lereng Bukit Pandang
      g.strokeStyle = "rgba(120,100,70,.55)"; g.lineWidth = 1.4;
      for (let k = 0.25; k < 1; k += 0.33) { const a = P(x + 0.15, y + k, zz(0.15, k)), b = P(x + 0.85, y + k, zz(0.85, k)); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    }
  }
}
function hillTile(g, x, y) {
  const H = M.hillH(x, y), tileAt = M.tileAt, z = LIFT + H;
  const nh = (dx, dy) => { const tt = tileAt(x + dx, y + dy); return tt === T.HILL ? LIFT + M.hillH(x + dx, y + dy) : !NW.isLandT(tt) ? 0 : LIFT + M.heightAt(x + dx + (dx > 0 ? 0 : 1), y + dy + (dy > 0 ? 0 : 1)); };
  const zx = nh(1, 0), zy = nh(0, 1);
  if (zx < z) { g.fillStyle = mix(C.hillSide, C.hillSide2, hash2(x, y) * 0.5); poly(g, [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, zx), P(x + 1, y, zx)]); g.fill(); }
  if (zy < z) { g.fillStyle = mix(C.hillSide, "#41703e", hash2(y, x) * 0.5); poly(g, [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, zy), P(x, y + 1, zy)]); g.fill(); }
  const top = mix(C.hillTop, C.hillTop2, hash2(x * 2, y));
  g.fillStyle = top; poly(g, [P(x, y, z), P(x + 1, y, z), P(x + 1, y + 1, z), P(x, y + 1, z)]); g.fill();
  g.strokeStyle = top; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = "rgba(30,60,30,.25)"; for (let i = 0; i < 3; i++) { const p = P(x + hash2(x + i, y * 3) * 0.9, y + hash2(x * 3, y + i) * 0.9, z); g.beginPath(); g.ellipse(p.x, p.y, 6, 2.6, 0, 0, 7); g.fill(); }
}
// kebun sayur warga: bedengan berjajar
function kebun(g, f) {
  const z = LIFT + 1.5;
  g.fillStyle = "#7a5634"; poly(g, [P(f.x0, f.y0, z), P(f.x1, f.y0, z), P(f.x1, f.y1, z), P(f.x0, f.y1, z)]); g.fill();
  g.fillStyle = "#5e3f25"; poly(g, [P(f.x0, f.y1, z), P(f.x1, f.y1, z), P(f.x1, f.y1, LIFT - 1), P(f.x0, f.y1, LIFT - 1)]); g.fill();
  poly(g, [P(f.x1, f.y0, z), P(f.x1, f.y1, z), P(f.x1, f.y1, LIFT - 1), P(f.x1, f.y0, LIFT - 1)]); g.fill();
  const rows = Math.round((f.y1 - f.y0) / 0.42);
  for (let r = 0; r < rows; r++) {
    const yy = f.y0 + 0.22 + r * (f.y1 - f.y0 - 0.3) / Math.max(1, rows - 1);
    for (let xx = f.x0 + 0.25; xx < f.x1 - 0.15; xx += 0.36) {
      const p = P(xx, yy, z), k = hash2(xx * 13, yy * 7);
      g.fillStyle = k > 0.5 ? "#4f9a46" : "#62a84f"; g.beginPath(); g.ellipse(p.x, p.y - 2.5, 4.2, 2.6, 0, 0, 7); g.fill();
      if (k > 0.82) { g.fillStyle = "#d9534a"; g.beginPath(); g.arc(p.x + 1.5, p.y - 3, 1.3, 0, 7); g.fill(); } // cabai
    }
  }
}

// ---------- Latar jauh: perbukitan di seberang danau & daratan di luar peta ----------
// Dua lapis puncak berdiri di garis pantai jauh (y = baseY). Lapis jauh kebiruan (kabut udara),
// lapis dekat hijau dengan siluet pinus. Puncak dibentuk dari kurva supaya terbaca sebagai bukit.
const ridges = [
  { y: -7.5, h: 210, col: "#a7c1c4", col2: "#94b3b6", peaks: [[-16, 5, 0.75], [-4, 6.5, 1.0], [9, 5, 0.7], [21, 7, 0.95], [34, 5.5, 0.8], [47, 6.5, 1.0], [61, 5, 0.75]] },
  { y: -3, h: 140, col: "#79a585", col2: "#6a9877", pines: true, peaks: [[-10, 4, 0.7], [1, 4.5, 0.95], [12, 3.5, 0.6], [23, 5, 0.9], [35, 4, 0.7], [46, 5, 0.85], [58, 4, 0.65]] },
];
const SHORE_FAR = -2.2; // di utara garis ini: kaki bukit (tanpa kilau air)
function ridgeTop(r, x) { let hh = 0.04; for (const [cx, w, a] of r.peaks) { const d = (x - cx) / w; hh += a * Math.max(0, 1 - d * d) ** 1.6; } return Math.min(1.1, hh); }
function drawBack(c, t, view, dk) {
  const HW = NW.TW / 2, HH = NW.TH / 2;
  // punggung bukit di seberang danau
  for (const r of ridges) {
    const a = P(70, r.y), b = P(-30, r.y);
    if (Math.max(a.x, b.x) < view.x0 - 200 || Math.min(a.x, b.x) > view.x1 + 200 || Math.min(a.y, b.y) - r.h > view.y1) continue;
    const pts = [];
    for (let x = -30; x <= 70; x += 0.75) { const p = P(x, r.y); pts.push({ x: p.x, y: p.y - r.h * ridgeTop(r, x) }); }
    const top = Math.min(...pts.map((q) => q.y));
    const g = c.createLinearGradient(0, top, 0, top + r.h * 1.4); g.addColorStop(0, r.col); g.addColorStop(1, r.col2);
    const base = P(70, SHORE_FAR), base2 = P(-30, SHORE_FAR); // kaki bukit tepat di garis pantai seberang
    c.fillStyle = g; c.beginPath(); c.moveTo(base2.x, base2.y); for (const q of pts) c.lineTo(q.x, q.y); c.lineTo(base.x, base.y); c.closePath(); c.fill();
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 1.2; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke(); // tepi terkena cahaya
    if (r.pines) { c.fillStyle = rgba(C.pineDark, 0.5); for (let k = 2; k < pts.length - 2; k += 3) { if (hash2(k, 77) < 0.5) continue; const q = pts[k], d = 6 + hash2(k, 5) * 16; c.beginPath(); c.moveTo(q.x, q.y + d - 11); c.lineTo(q.x + 4, q.y + d + 3); c.lineTo(q.x - 4, q.y + d + 3); c.fill(); } }
  }
  // garis pantai seberang yang samar (pasir tipis di kaki bukit)
  const s0 = P(-30, SHORE_FAR), s1 = P(70, SHORE_FAR); c.strokeStyle = "rgba(230,220,180,.35)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(s0.x, s0.y); c.lineTo(s1.x, s1.y); c.stroke();
  // daratan di luar tepi peta (bukit barat & hutan selatan): petak datar gelap + siluet pinus
  const tx0 = Math.floor((view.x0 / HW + view.y0 / HH) / 2) - 2, tx1 = Math.ceil((view.x1 / HW + view.y1 / HH) / 2) + 2;
  const ty0 = Math.floor((view.y0 / HH - view.x1 / HW) / 2) - 2, ty1 = Math.ceil((view.y1 / HH - view.x0 / HW) / 2) + 2;
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    if (x >= 0 && y >= 0 && x < M.MW && y < M.MH) continue;
    const tt = M.tileAt(x, y); if (!NW.isLandT(tt)) continue;
    const z = tt === T.HILL ? LIFT + 40 : LIFT + 2;
    c.fillStyle = tt === T.HILL ? mix(C.hillTop2, "#355f36", hash2(x, y) * 0.6) : mix(C.forest, "#3f6f39", hash2(x, y) * 0.6);
    poly(c, [P(x, y, z), P(x + 1, y, z), P(x + 1, y + 1, z), P(x, y + 1, z)]); c.fill(); c.strokeStyle = c.fillStyle; c.lineWidth = 1; c.stroke();
    if (hash2(x * 5, y * 7) > 0.45) { const p = P(x + 0.5, y + 0.5, z); c.fillStyle = C.pineDark; c.beginPath(); c.moveTo(p.x, p.y - 34); c.lineTo(p.x + 10, p.y); c.lineTo(p.x - 10, p.y); c.fill(); }
  }
}
// kabut pagi di atas danau (05:00–08:30) & kilau senja — digambar dengan sprite cache
let mistSpr = null;
function mistSprite() {
  if (mistSpr) return mistSpr;
  const c = document.createElement("canvas"); c.width = 256; c.height = 96; const g = c.getContext("2d");
  const gr = g.createRadialGradient(128, 48, 6, 128, 48, 124); gr.addColorStop(0, "rgba(255,255,255,.75)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.save(); g.scale(1, 0.38); g.beginPath(); g.arc(128, 126, 124, 0, 7); g.fill(); g.restore();
  return (mistSpr = c);
}
const mists = [[8, 6], [16, 2], [25, 5], [33, 9], [38, 18], [4, 3], [29, -1], [12, -2]];
function drawSky(c, t, dk, view) {
  const h = window.Nusa.S.hour;
  const a = h >= 4.8 && h < 9 ? (h < 6 ? (h - 4.8) / 1.2 : h > 7.6 ? (9 - h) / 1.4 : 1) : 0;
  const wf = NW.weather ? NW.weather.state.fog : 0; const a2 = Math.max(a, wf * 1.05); // kabut cuaca memakai kabut Toba yang sudah ada
  if (a2 <= 0.02) return;
  const spr = mistSprite();
  c.globalAlpha = Math.min(0.8, a2 * 0.55);
  for (const [x, y] of mists) {
    const drift = Math.sin(t * 0.05 + x) * 0.8, p = P(x + drift, y);
    if (p.x < view.x0 - 260 || p.x > view.x1 + 260 || p.y < view.y0 - 120 || p.y > view.y1 + 120) continue;
    c.drawImage(spr, p.x - 230, p.y - 60, 460, 120);
  }
  c.globalAlpha = 1;
}

// ---------- Objek ----------
const OD = NW.objDraw = NW.objDraw || {};
const shadow = (c, x, y, rx, ry, a = 0.18) => { const p = P(x, y, LIFT); c.fillStyle = `rgba(20,40,30,${a})`; c.beginPath(); c.ellipse(p.x, p.y, rx, ry, 0, 0, 7); c.fill(); };
OD.pine = (c, o, t) => { // pinus (Pinus merkusii) — siluet berlapis
  const s = o.s || 1, b = P(o.x, o.y, LIFT), sw = Math.sin(t * 0.8 + o.x * 1.7) * 1.2;
  shadow(c, o.x + 0.3, o.y + 0.12, 14 * s, 5 * s);
  c.fillStyle = "#6b4a2e"; c.fillRect(b.x - 2.6 * s, b.y - 18 * s, 5.2 * s, 18 * s);
  const layers = [[0, 52, 24], [16, 44, 20], [30, 36, 15], [42, 26, 10]];
  layers.forEach(([lift, hgt, w], i) => {
    const top = b.y - (lift + hgt) * s, base = b.y - (lift + 10) * s;
    c.fillStyle = i % 2 ? C.pine2 : C.pine;
    c.beginPath(); c.moveTo(b.x + sw * (i / 3), top); c.lineTo(b.x + w * s + sw * 0.3, base); c.quadraticCurveTo(b.x, base + 4 * s, b.x - w * s + sw * 0.3, base); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.08)"; c.beginPath(); c.moveTo(b.x + sw * (i / 3), top); c.lineTo(b.x - w * s * 0.9 + sw * 0.3, base); c.lineTo(b.x - w * s * 0.3, base); c.closePath(); c.fill();
  });
};
OD.bigtree = (c, o, t) => { // pohon besar peneduh di Pondok Kumpul
  const s = o.s, b = P(o.x, o.y, LIFT), sw = Math.sin(t * 0.6 + o.x) * 1.4;
  shadow(c, o.x + 0.6, o.y + 0.25, 46 * s * 0.6, 16 * s * 0.6, 0.2);
  c.fillStyle = "#6b4a2e"; c.beginPath(); c.moveTo(b.x - 7 * s, b.y); c.lineTo(b.x - 4 * s, b.y - 34 * s); c.lineTo(b.x + 4 * s, b.y - 34 * s); c.lineTo(b.x + 7 * s, b.y); c.fill();
  c.strokeStyle = "#5a3d26"; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(b.x, b.y - 26 * s); c.lineTo(b.x - 14 * s, b.y - 44 * s); c.moveTo(b.x, b.y - 28 * s); c.lineTo(b.x + 16 * s, b.y - 46 * s); c.stroke();
  const blob = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(b.x + x * s + sw, b.y + y * s, r * s, 0, 7); c.fill(); };
  blob(-20, -48, 18, "#3f7f42"); blob(20, -50, 18, "#3f7f42"); blob(0, -62, 22, "#4a9049"); blob(-14, -60, 15, "#4a9049"); blob(15, -62, 15, "#4a9049"); blob(-6, -72, 11, "#5ea457"); blob(8, -66, 9, "#5ea457");
};
OD.flowers = (c, o) => { const b = P(o.x, o.y, LIFT), cols = ["#c9b3f2", "#fff6d8", "#f7d25a", "#f6a6b2"]; for (let i = 0; i < 5; i++) { const x = b.x + (i - 2) * 3.5, y = b.y - (i % 2) * 2; c.strokeStyle = "#4d8a3c"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 5); c.stroke(); c.fillStyle = cols[(i + Math.floor(o.hue * 4)) % 4]; c.beginPath(); c.arc(x, y - 6, 1.8, 0, 7); c.fill(); } };
OD.infoboard = (c, o) => { // papan informasi kampung
  const b = P(o.x, o.y, LIFT); shadow(c, o.x + 0.2, o.y + 0.1, 20, 6);
  c.fillStyle = "#5a3a20"; c.fillRect(b.x - 18, b.y - 30, 3.5, 30); c.fillRect(b.x + 14.5, b.y - 30, 3.5, 30);
  c.fillStyle = "#7a5230"; c.fillRect(b.x - 21, b.y - 52, 42, 25); c.fillStyle = "#f3e7c9"; c.fillRect(b.x - 18, b.y - 49, 36, 19);
  c.fillStyle = "#2f7a8c"; c.fillRect(b.x - 16, b.y - 47, 15, 9); c.fillStyle = "#6a9a78"; c.beginPath(); c.moveTo(b.x - 16, b.y - 40); c.lineTo(b.x - 11, b.y - 46); c.lineTo(b.x - 7, b.y - 42); c.lineTo(b.x - 1, b.y - 47); c.lineTo(b.x - 1, b.y - 40); c.fill();
  c.fillStyle = "rgba(60,40,20,.55)"; for (let i = 0; i < 4; i++) c.fillRect(b.x + 1, b.y - 47 + i * 4, 15 - (i % 2) * 4, 1.4);
  c.fillStyle = "#6b3d2a"; c.beginPath(); c.moveTo(b.x - 25, b.y - 51); c.quadraticCurveTo(b.x, b.y - 58, b.x + 25, b.y - 51); c.lineTo(b.x + 25, b.y - 54); c.quadraticCurveTo(b.x, b.y - 64, b.x - 25, b.y - 54); c.fill();
};
OD.scope = (c, o, t) => { // teropong pandang di puncak Bukit Pandang
  const b = P(o.x, o.y, LIFT); shadow(c, o.x + 0.15, o.y + 0.05, 9, 3);
  c.fillStyle = "#3a4a50"; c.fillRect(b.x - 1.5, b.y - 22, 3, 22); c.fillRect(b.x - 6, b.y - 2.5, 12, 2.5);
  c.save(); c.translate(b.x, b.y - 24); c.rotate(-0.35);
  c.fillStyle = "#2f7a8c"; c.fillRect(-9, -4, 18, 8); c.fillStyle = "#e0b84c"; c.fillRect(7, -4.6, 3.4, 9.2); c.fillStyle = "#9fd3e6"; c.fillRect(9.5, -3, 1.4, 6);
  c.restore();
};
OD.markstone = (c, o) => { // batu berlumut dengan ukiran kecil (tanda Ompung Nala)
  const b = P(o.x, o.y, LIFT); shadow(c, o.x + 0.15, o.y + 0.05, 14, 5);
  c.fillStyle = "#858c86"; c.beginPath(); c.moveTo(b.x - 12, b.y); c.lineTo(b.x - 10, b.y - 14); c.quadraticCurveTo(b.x - 2, b.y - 22, b.x + 8, b.y - 16); c.lineTo(b.x + 12, b.y); c.closePath(); c.fill();
  c.fillStyle = "#6f9a4f"; c.beginPath(); c.ellipse(b.x - 6, b.y - 15, 6, 2.6, -0.3, 0, 7); c.fill();
  c.strokeStyle = "#4a524c"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(b.x - 2, b.y - 11); c.lineTo(b.x + 5, b.y - 9); c.lineTo(b.x + 2, b.y - 6); c.moveTo(b.x + 5, b.y - 9); c.lineTo(b.x + 2, b.y - 12); c.stroke();
};
OD.post = (c, o) => { // tiang tambat tua dari kayu
  const b = P(o.x, o.y, LIFT); shadow(c, o.x + 0.15, o.y + 0.05, 8, 3);
  c.fillStyle = "#5a3d26"; c.fillRect(b.x - 4, b.y - 26, 8, 26); c.fillStyle = "#6e4a2e"; c.fillRect(b.x - 4, b.y - 26, 3, 26);
  c.fillStyle = "#3e2a1a"; c.beginPath(); c.ellipse(b.x, b.y - 26, 4, 1.8, 0, 0, 7); c.fill();
  c.strokeStyle = "#cdb98a"; c.lineWidth = 1.4; c.beginPath(); c.ellipse(b.x, b.y - 18, 5, 2, 0, 0, 7); c.stroke();
  c.strokeStyle = "#2f241a"; c.lineWidth = 1; c.beginPath(); c.moveTo(b.x - 2, b.y - 11); c.lineTo(b.x + 2, b.y - 8); c.lineTo(b.x - 1, b.y - 6); c.stroke();
};
OD.flatrock = (c, o) => { const b = P(o.x, o.y, LIFT - 2); c.fillStyle = "#8a908c"; c.beginPath(); c.ellipse(b.x, b.y - 3, 22, 9, 0, 0, 7); c.fill(); c.fillStyle = "#a9aea8"; c.beginPath(); c.ellipse(b.x - 3, b.y - 5, 17, 6.5, 0, 0, 7); c.fill(); };
OD.reeds = (c, o, t) => { // gelagah di tepi danau
  const b = P(o.x, o.y, 2), s = o.s;
  for (let i = 0; i < 7; i++) { const dx = (i - 3) * 3 * s, hh = (14 + (i % 3) * 6) * s, sw = Math.sin(t * 1.4 + i + o.x) * 2; c.strokeStyle = i % 2 ? "#7f9a4a" : "#93ad55"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(b.x + dx, b.y); c.quadraticCurveTo(b.x + dx + sw * 0.3, b.y - hh * 0.6, b.x + dx + sw, b.y - hh); c.stroke(); if (i % 3 === 0) { c.fillStyle = "#8a6a45"; c.beginPath(); c.ellipse(b.x + dx + sw, b.y - hh - 2, 1.3, 3, 0, 0, 7); c.fill(); } }
};
OD.solu = (c, o, t) => { // perahu kayu ramping (solu) — bersandar di pasir atau mengapung
  const bob = o.beached ? 0 : Math.sin(t * 1.4 + o.x) * 1.4, p = P(o.x, o.y, o.beached ? LIFT - 2 : 0);
  if (!o.beached) { c.strokeStyle = `rgba(255,255,255,${0.25 + 0.15 * Math.sin(t * 2 + o.x)})`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(p.x, p.y + 4, 44, 11, o.rot || 0, 0, 7); c.stroke(); }
  else shadow(c, o.x + 0.2, o.y + 0.15, 34, 8);
  c.save(); c.translate(p.x, p.y + bob); c.rotate(o.rot || 0);
  c.fillStyle = "#4a2f1c"; c.beginPath(); c.moveTo(-40, -6); c.quadraticCurveTo(-30, 6, 0, 7); c.quadraticCurveTo(30, 6, 40, -6); c.closePath(); c.fill();
  c.fillStyle = "#7a5230"; c.beginPath(); c.moveTo(-40, -7); c.quadraticCurveTo(0, -3, 40, -7); c.quadraticCurveTo(28, 2, 0, 3); c.quadraticCurveTo(-28, 2, -40, -7); c.fill();
  c.fillStyle = "#c79a64"; c.fillRect(-20, -5.5, 3, 4); c.fillRect(2, -5, 3, 4); c.fillRect(18, -5.5, 3, 4);
  c.strokeStyle = "#e0b84c"; c.lineWidth = 1; c.beginPath(); c.moveTo(-38, -7); c.quadraticCurveTo(0, -3.5, 38, -7); c.stroke();
  c.strokeStyle = "#8a5a32"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-8, -4); c.lineTo(14, -12); c.stroke(); c.fillStyle = "#a8743f"; c.beginPath(); c.ellipse(16, -12.5, 4, 1.8, -0.4, 0, 7); c.fill(); // dayung
  c.restore();
};
OD.spring = (c, o, t) => { // pancuran batu & kolam kecil
  const b = P(o.x, o.y, LIFT); shadow(c, o.x + 0.25, o.y + 0.1, 26, 9);
  c.fillStyle = "#7d847f"; c.beginPath(); c.ellipse(b.x + 4, b.y - 1, 22, 9, 0, 0, 7); c.fill();
  c.fillStyle = "#4f9fb8"; c.beginPath(); c.ellipse(b.x + 4, b.y - 2.5, 17, 6.4, 0, 0, 7); c.fill();
  c.strokeStyle = `rgba(255,255,255,${0.35 + 0.2 * Math.sin(t * 3)})`; c.lineWidth = 1; c.beginPath(); c.ellipse(b.x + 4, b.y - 2.5, 6 + (t * 6) % 9, 2.4 + ((t * 6) % 9) * 0.35, 0, 0, 7); c.stroke();
  c.fillStyle = "#8d9390"; c.beginPath(); c.moveTo(b.x - 18, b.y - 2); c.lineTo(b.x - 16, b.y - 26); c.quadraticCurveTo(b.x - 6, b.y - 32, b.x + 2, b.y - 24); c.lineTo(b.x - 2, b.y - 2); c.closePath(); c.fill();
  c.fillStyle = "#6f9a4f"; c.beginPath(); c.ellipse(b.x - 10, b.y - 27, 7, 2.6, -0.2, 0, 7); c.fill();
  c.fillStyle = "#6b4527"; c.fillRect(b.x - 4, b.y - 19, 8, 2.6); // pipa bambu
  c.strokeStyle = "rgba(190,230,245,.85)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(b.x + 4, b.y - 18); c.quadraticCurveTo(b.x + 7, b.y - 14, b.x + 6, b.y - 4); c.stroke();
};
OD.rack = (c, o) => { // jemuran ikan pora-pora
  const a = P(o.x - 0.7, o.y, LIFT), b = P(o.x + 0.7, o.y, LIFT); shadow(c, o.x + 0.2, o.y + 0.1, 22, 5);
  c.fillStyle = "#6b4527"; c.fillRect(a.x - 1.5, a.y - 20, 3, 20); c.fillRect(b.x - 1.5, b.y - 20, 3, 20);
  c.fillStyle = "#c9a46a"; c.beginPath(); c.moveTo(a.x - 3, a.y - 18); c.lineTo(b.x + 3, b.y - 18); c.lineTo(b.x + 3, b.y - 14); c.lineTo(a.x - 3, a.y - 14); c.fill();
  c.fillStyle = "#b8c4c2"; for (let i = 0; i < 12; i++) { const k = (i + 0.5) / 12, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k; c.beginPath(); c.ellipse(x, y - 16.5, 2.4, 0.9, 0.5, 0, 7); c.fill(); }
};
OD.keramba = (c, o, t) => { // keramba jaring apung
  const s = o.s || 1, bob = Math.sin(t * 1.2 + o.x) * 1, p = P(o.x, o.y), w = 1.1 * s;
  const q = (dx, dy, z) => { const r = P(o.x + dx, o.y + dy, z); return { x: r.x, y: r.y + bob }; };
  c.fillStyle = "rgba(20,60,70,.35)"; poly(c, [q(-w, -w, 0), q(w, -w, 0), q(w, w, 0), q(-w, w, 0)]); c.fill();
  c.strokeStyle = "rgba(220,240,240,.35)"; c.lineWidth = 0.7;
  for (let k = -w + 0.3; k < w; k += 0.3) { const a = q(k, -w, 1), b = q(k, w, 1), d = q(-w, k, 1), e = q(w, k, 1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.moveTo(d.x, d.y); c.lineTo(e.x, e.y); c.stroke(); }
  c.strokeStyle = "#8a6a45"; c.lineWidth = 3; poly(c, [q(-w, -w, 3), q(w, -w, 3), q(w, w, 3), q(-w, w, 3)]); c.stroke();
  c.fillStyle = "#3f8fd0"; for (const [dx, dy] of [[-w, -w], [w, -w], [w, w], [-w, w]]) { const r = q(dx, dy, 2); c.beginPath(); c.ellipse(r.x, r.y, 4, 2.2, 0, 0, 7); c.fill(); }
  if (Math.sin(t * 0.9 + o.y * 3) > 0.92) { const r = q(0.2, -0.1, 0); c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1; c.beginPath(); c.ellipse(r.x, r.y, 5, 2, 0, 0, 7); c.stroke(); }
};
OD.basket = (c, o) => { const b = P(o.x, o.y, LIFT); shadow(c, o.x + 0.1, o.y + 0.05, 9, 3); c.fillStyle = "#b8864a"; c.fillRect(b.x - 7, b.y - 9, 14, 9); c.fillStyle = "#a0723c"; for (let i = 0; i < 4; i++) c.fillRect(b.x - 7, b.y - 8 + i * 2.2, 14, 0.9); c.fillStyle = "#d79a2e"; c.beginPath(); c.ellipse(b.x - 2, b.y - 9.5, 4, 1.6, 0.3, 0, 7); c.ellipse(b.x + 3, b.y - 9.8, 3.6, 1.5, -0.2, 0, 7); c.fill(); };

// ---------- Bangunan ----------
// dinding kayu + atap pelana dengan ujung bubungan sedikit melengkung naik
function face(b, f, z0, h, u0, u1, v0, v1) {
  const pt = (u, v) => f === "y" ? P(b.x0 + (b.x1 - b.x0) * u, b.y1, z0 + h * v) : P(b.x1, b.y1 - (b.y1 - b.y0) * u, z0 + h * v);
  return [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)];
}
function win(c, f, b, z0, h, u, w, night) {
  c.fillStyle = "#4a2f1c"; poly(c, face(b, f, z0, h, u - w / 2 - 0.02, u + w / 2 + 0.02, 0.34, 0.78)); c.fill();
  c.fillStyle = night > 0.35 ? mix("#7fb3c8", "#ffd27a", clamp((night - 0.35) * 2.5, 0, 1)) : "#8cc3d6"; poly(c, face(b, f, z0, h, u - w / 2, u + w / 2, 0.38, 0.74)); c.fill();
  c.fillStyle = "#4a2f1c"; poly(c, face(b, f, z0, h, u - 0.008, u + 0.008, 0.38, 0.74)); c.fill();
}
function door(c, f, b, z0, h, u, w, col) {
  c.fillStyle = shade(col, -0.25); poly(c, face(b, f, z0, h, u - w / 2 - 0.02, u + w / 2 + 0.02, 0, 0.72)); c.fill();
  c.fillStyle = col; poly(c, face(b, f, z0, h, u - w / 2, u + w / 2, 0, 0.68)); c.fill();
  c.fillStyle = "#e0b84c"; poly(c, face(b, f, z0, h, u + w * 0.25, u + w * 0.34, 0.3, 0.36)); c.fill();
}
function sideRoof(c, b, z, rh, col, ridge) {
  const o = 0.32, { x0, y0, x1, y1 } = b, up = 10; // up = lengkung naik di ujung bubungan
  if (ridge === "x") { // bubungan sejajar sumbu x
    const ym = (y0 + y1) / 2;
    const r0 = P(x0 - o - 0.25, ym, z + rh + up), r1 = P(x1 + o + 0.25, ym, z + rh + up), rm = P((x0 + x1) / 2, ym, z + rh);
    c.fillStyle = shade(col, -0.28); c.beginPath(); const b0 = P(x0 - o, y0 - o, z), b1 = P(x1 + o, y0 - o, z); c.moveTo(b0.x, b0.y); c.lineTo(b1.x, b1.y); c.lineTo(r1.x, r1.y); c.quadraticCurveTo(rm.x, rm.y + 6, r0.x, r0.y); c.closePath(); c.fill();
    c.fillStyle = shade(b.wall, -0.18); poly(c, [P(x1, y1, z), P(x1, y0, z), P(x1, ym, z + rh * 0.9)]); c.fill();
    c.fillStyle = col; c.beginPath(); const f0 = P(x0 - o, y1 + o, z - 3), f1 = P(x1 + o, y1 + o, z - 3); c.moveTo(f0.x, f0.y); c.lineTo(f1.x, f1.y); c.lineTo(r1.x, r1.y); c.quadraticCurveTo(rm.x, rm.y + 6, r0.x, r0.y); c.closePath(); c.fill();
    c.strokeStyle = rgba(shade(col, -0.4), 0.5); c.lineWidth = 1.1;
    for (let k = 1; k < 4; k++) { const tt = k / 4, A = P(x0 - o, y1 + o + (ym - y1 - o) * tt, z - 3 + (rh + 3) * tt), Bp = P(x1 + o, y1 + o + (ym - y1 - o) * tt, z - 3 + (rh + 3) * tt); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Bp.x, Bp.y); c.stroke(); }
    c.strokeStyle = shade(col, -0.45); c.lineWidth = 3; c.beginPath(); c.moveTo(r0.x, r0.y); c.quadraticCurveTo(rm.x, rm.y + 6, r1.x, r1.y); c.stroke();
    if (b.trim) { c.strokeStyle = b.trim; c.lineWidth = 2; c.beginPath(); c.moveTo(f0.x, f0.y + 1); c.lineTo(f1.x, f1.y + 1); c.stroke(); }
  } else { // bubungan sejajar sumbu y
    const xm = (x0 + x1) / 2;
    const r0 = P(xm, y0 - o - 0.25, z + rh + up), r1 = P(xm, y1 + o + 0.25, z + rh + up), rm = P(xm, (y0 + y1) / 2, z + rh);
    c.fillStyle = shade(col, -0.28); c.beginPath(); const b0 = P(x0 - o, y0 - o, z), b1 = P(x0 - o, y1 + o, z); c.moveTo(b0.x, b0.y); c.lineTo(b1.x, b1.y); c.lineTo(r1.x, r1.y); c.quadraticCurveTo(rm.x, rm.y + 6, r0.x, r0.y); c.closePath(); c.fill();
    c.fillStyle = shade(b.wall, -0.05); poly(c, [P(x0, y1, z), P(x1, y1, z), P(xm, y1, z + rh * 0.9)]); c.fill();
    c.fillStyle = shade(col, -0.08); c.beginPath(); const f0 = P(x1 + o, y0 - o, z - 3), f1 = P(x1 + o, y1 + o, z - 3); c.moveTo(f0.x, f0.y); c.lineTo(f1.x, f1.y); c.lineTo(r1.x, r1.y); c.quadraticCurveTo(rm.x, rm.y + 6, r0.x, r0.y); c.closePath(); c.fill();
    c.strokeStyle = rgba(shade(col, -0.4), 0.5); c.lineWidth = 1.1;
    for (let k = 1; k < 4; k++) { const tt = k / 4, A = P(x1 + o + (xm - x1 - o) * tt, y0 - o, z - 3 + (rh + 3) * tt), Bp = P(x1 + o + (xm - x1 - o) * tt, y1 + o, z - 3 + (rh + 3) * tt); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Bp.x, Bp.y); c.stroke(); }
    c.strokeStyle = shade(col, -0.45); c.lineWidth = 3; c.beginPath(); c.moveTo(r0.x, r0.y); c.quadraticCurveTo(rm.x, rm.y + 6, r1.x, r1.y); c.stroke();
    if (b.trim) { c.strokeStyle = b.trim; c.lineWidth = 2; c.beginPath(); c.moveTo(f0.x, f0.y + 1); c.lineTo(f1.x, f1.y + 1); c.stroke(); }
  }
}
function drawTHouse(c, b, t, night) {
  const z0 = LIFT + (b.stilts || 0), h = b.h, wall = b.wall;
  const sb = P(b.x1 + 0.6, b.y1 + 0.1, LIFT); c.fillStyle = "rgba(20,40,30,.18)"; poly(c, [P(b.x1, b.y0, LIFT), P(b.x1 + 0.9, b.y0 + 0.15, LIFT), P(b.x1 + 0.9, b.y1 + 0.15, LIFT), P(b.x0 + 0.3, b.y1 + 0.15, LIFT), P(b.x0, b.y1, LIFT)]); c.fill(); void sb;
  if (b.stilts) { // kolong rumah panggung pendek
    c.fillStyle = "#5a3a20";
    for (const [x, y] of [[b.x0 + 0.1, b.y1 - 0.1], [b.x1 - 0.1, b.y1 - 0.1], [b.x1 - 0.1, b.y0 + 0.1], [(b.x0 + b.x1) / 2, b.y1 - 0.1], [b.x1 - 0.1, (b.y0 + b.y1) / 2]]) { const a = P(x, y, z0), g = P(x, y, LIFT); c.fillRect(a.x - 2.5, a.y, 5, g.y - a.y); }
    c.fillStyle = "#4a2f1c"; poly(c, [P(b.x0 - 0.1, b.y1 + 0.1, z0), P(b.x1 + 0.1, b.y1 + 0.1, z0), P(b.x1 + 0.1, b.y1 + 0.1, z0 - 4), P(b.x0 - 0.1, b.y1 + 0.1, z0 - 4)]); c.fill();
    poly(c, [P(b.x1 + 0.1, b.y0 - 0.1, z0), P(b.x1 + 0.1, b.y1 + 0.1, z0), P(b.x1 + 0.1, b.y1 + 0.1, z0 - 4), P(b.x1 + 0.1, b.y0 - 0.1, z0 - 4)]); c.fill();
  }
  c.fillStyle = shade(wall, -0.02); poly(c, face(b, "y", z0, h, 0, 1, 0, 1)); c.fill();
  c.fillStyle = shade(wall, -0.2); poly(c, face(b, "x", z0, h, 0, 1, 0, 1)); c.fill();
  c.strokeStyle = rgba(shade(wall, -0.4), 0.3); c.lineWidth = 1;
  for (const f of ["y", "x"]) for (let u = 0.12; u < 1; u += 0.12) { const q = face(b, f, z0, h, u, u, 0, 1); c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[3].x, q[3].y); c.stroke(); } // papan vertikal
  c.fillStyle = shade(wall, -0.42); poly(c, face(b, "y", z0, h, 0, 1, 0, 0.07)); c.fill(); poly(c, face(b, "x", z0, h, 0, 1, 0, 0.07)); c.fill();
  const dw = 0.24 / Math.max(1, (b.door === "y" ? b.x1 - b.x0 : b.y1 - b.y0) / 2.5);
  if (b.door === "y") { door(c, "y", b, z0, h, 0.32, dw, "#5a3a20"); win(c, "y", b, z0, h, 0.72, 0.2, night); win(c, "x", b, z0, h, 0.5, 0.24, night); }
  else { door(c, "x", b, z0, h, 0.5, dw, "#5a3a20"); win(c, "y", b, z0, h, 0.3, 0.2, night); win(c, "y", b, z0, h, 0.72, 0.2, night); }
  if (b.stilts) { // anak tangga
    const f = b.door, u = b.door === "y" ? 0.32 : 0.5;
    for (let i = 0; i < 2; i++) {
      const k = (i + 1) / 3, z = z0 - (z0 - LIFT) * k, out = 0.18 + k * 0.5;
      const pts = f === "y" ? [P(b.x0 + (b.x1 - b.x0) * (u - 0.1), b.y1 + out, z), P(b.x0 + (b.x1 - b.x0) * (u + 0.1), b.y1 + out, z), P(b.x0 + (b.x1 - b.x0) * (u + 0.1), b.y1 + out + 0.16, z), P(b.x0 + (b.x1 - b.x0) * (u - 0.1), b.y1 + out + 0.16, z)]
        : [P(b.x1 + out, b.y1 - (b.y1 - b.y0) * (u - 0.1), z), P(b.x1 + out, b.y1 - (b.y1 - b.y0) * (u + 0.1), z), P(b.x1 + out + 0.16, b.y1 - (b.y1 - b.y0) * (u + 0.1), z), P(b.x1 + out + 0.16, b.y1 - (b.y1 - b.y0) * (u - 0.1), z)];
      c.fillStyle = "#7a5230"; poly(c, pts); c.fill();
    }
  }
  // pot tanaman di depan
  const pp = b.door === "y" ? P(b.x0 + (b.x1 - b.x0) * 0.58, b.y1 + 0.25, LIFT) : P(b.x1 + 0.25, b.y1 - (b.y1 - b.y0) * 0.2, LIFT);
  c.fillStyle = "#9a5a34"; c.fillRect(pp.x - 4, pp.y - 7, 8, 7); c.fillStyle = "#4f9a46"; c.beginPath(); c.arc(pp.x, pp.y - 10, 5, 0, 7); c.fill();
  sideRoof(c, b, z0 + h, 24 + (b.x1 - b.x0) * 2, b.roof, b.door === "y" ? "x" : "y");
  if (b.id === "rmaya") { // asap dapur
    const cp = P(b.x0 + 0.5, b.y0 + 0.6, z0 + h + 30);
    for (let i = 0; i < 3; i++) { const k = (t * 0.22 + i / 3) % 1; c.fillStyle = `rgba(235,235,235,${0.4 * (1 - k)})`; c.beginPath(); c.arc(cp.x + k * 14 + Math.sin(t + i) * 3, cp.y - k * 36, 4 + k * 7, 0, 7); c.fill(); }
  }
}
// Pasar kecil: lapak kayu beratap seng-kayu dengan meja hasil danau & kebun
function drawTMarketBack(c, b) {
  const z0 = LIFT, h = b.h;
  c.fillStyle = "rgba(20,40,30,.16)"; poly(c, [P(b.x1, b.y0, z0), P(b.x1 + 0.7, b.y0 + 0.1, z0), P(b.x1 + 0.7, b.y1 + 0.1, z0), P(b.x0 + 0.2, b.y1 + 0.1, z0), P(b.x0, b.y1, z0)]); c.fill();
  c.fillStyle = "#b9895a"; poly(c, [P(b.x0, b.y0, z0 + 1), P(b.x1, b.y0, z0 + 1), P(b.x1, b.y1, z0 + 1), P(b.x0, b.y1, z0 + 1)]); c.fill();
  c.fillStyle = "#8f6036"; poly(c, [P(b.x0, b.y0, z0), P(b.x1, b.y0, z0), P(b.x1, b.y0, z0 + h * 0.62), P(b.x0, b.y0, z0 + h * 0.62)]); c.fill();
  c.fillStyle = "#7a5230"; poly(c, [P(b.x0, b.y0, z0), P(b.x0, b.y1, z0), P(b.x0, b.y1, z0 + h * 0.62), P(b.x0, b.y0, z0 + h * 0.62)]); c.fill();
  // rak sayur di dinding belakang
  for (let i = 0; i < 4; i++) { const p = P(b.x0 + 0.6 + i * 0.9, b.y0 + 0.1, z0 + 14); c.fillStyle = ["#62a84f", "#d9534a", "#e0b84c", "#8c6bb1"][i]; c.beginPath(); c.ellipse(p.x, p.y, 6, 3, 0, 0, 7); c.fill(); }
  c.fillStyle = "#5a3a20"; for (const [x, y] of [[b.x0 + 0.08, b.y0 + 0.08], [b.x1 - 0.08, b.y0 + 0.08]]) { const a = P(x, y, z0 + h + 6), g = P(x, y, z0); c.fillRect(a.x - 2, a.y, 4, g.y - a.y); }
  // atap digambar di lapisan belakang → Bu Maya di balik meja tetap terlihat
  const o = 0.3, zt = z0 + h + 9, zb = z0 + h - 3;
  c.fillStyle = "#8a959a"; poly(c, [P(b.x0 - o, b.y0 - o * 0.5, zt), P(b.x1 + o, b.y0 - o * 0.5, zt), P(b.x1 + o, b.y1 + o, zb), P(b.x0 - o, b.y1 + o, zb)]); c.fill();
  c.strokeStyle = "rgba(60,70,75,.45)"; c.lineWidth = 1; for (let k = 0.1; k < 1; k += 0.1) { const a = P(b.x0 - o + (b.x1 - b.x0 + 2 * o) * k, b.y0 - o * 0.5, zt), d = P(b.x0 - o + (b.x1 - b.x0 + 2 * o) * k, b.y1 + o, zb); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(d.x, d.y); c.stroke(); }
  c.fillStyle = "rgba(160,90,50,.25)"; poly(c, [P(b.x0 + 0.6, b.y0, zt - 1), P(b.x0 + 1.4, b.y0, zt - 1), P(b.x0 + 1.4, b.y1 + o, zb), P(b.x0 + 0.6, b.y1 + o, zb)]); c.fill();
  c.fillStyle = "#6f797d"; poly(c, [P(b.x1 + o, b.y0 - o * 0.5, zt), P(b.x1 + o, b.y1 + o, zb), P(b.x1 + o, b.y1 + o, zb - 3), P(b.x1 + o, b.y0 - o * 0.5, zt - 3)]); c.fill();
}
function drawTMarketFront(c, b, t) {
  const z0 = LIFT, h = b.h;
  const cb = { x0: b.x0 + 0.2, x1: b.x1 - 0.25, y0: b.y1 - 0.55, y1: b.y1 - 0.05 }, th = 15;
  c.fillStyle = "#8a5a32"; poly(c, face(cb, "y", z0, th, 0, 1, 0, 1)); c.fill();
  c.fillStyle = "#6e4628"; poly(c, face(cb, "x", z0, th, 0, 1, 0, 1)); c.fill();
  c.fillStyle = "#c79a64"; poly(c, [P(cb.x0, cb.y0, z0 + th), P(cb.x1, cb.y0, z0 + th), P(cb.x1, cb.y1, z0 + th), P(cb.x0, cb.y1, z0 + th)]); c.fill();
  // tampah: ikan mas, pora-pora, sayur
  const items = [["#d79a2e", 7], ["#b8c4c2", 4], ["#62a84f", 6], ["#d79a2e", 7], ["#d9534a", 4], ["#b8c4c2", 4]];
  items.forEach(([col, r], i) => { const p = P(cb.x0 + 0.35 + i * (cb.x1 - cb.x0 - 0.6) / 5, (cb.y0 + cb.y1) / 2, z0 + th + 1); c.fillStyle = "#b8864a"; c.beginPath(); c.ellipse(p.x, p.y, 9, 4, 0, 0, 7); c.fill(); c.fillStyle = col; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(p.x - 3 + k * 3, p.y - 1 - (k % 2), r * 0.55, r * 0.28, 0.4, 0, 7); c.fill(); } });
  c.fillStyle = "#5a3a20"; for (const [x, y] of [[b.x0 + 0.08, b.y1 - 0.08], [b.x1 - 0.08, b.y1 - 0.08], [b.x1 - 0.08, b.y0 + 0.08]]) { const a = P(x, y, z0 + h + (y < b.y1 - 0.5 ? 6 : 0)), g = P(x, y, z0); c.fillRect(a.x - 2, a.y, 4, g.y - a.y); }
  const o = 0.3, zb = z0 + h - 3;
  c.fillStyle = "#6f797d"; poly(c, [P(b.x0 - o, b.y1 + o, zb), P(b.x1 + o, b.y1 + o, zb), P(b.x1 + o, b.y1 + o, zb - 3), P(b.x0 - o, b.y1 + o, zb - 3)]); c.fill(); // lis depan atap
    const sp = P((b.x0 + b.x1) / 2, b.y1 + o + 0.02, zb - 2);
  c.strokeStyle = "#5a3a20"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sp.x - 24, sp.y - 2); c.lineTo(sp.x - 24, sp.y + 6); c.moveTo(sp.x + 24, sp.y - 2); c.lineTo(sp.x + 24, sp.y + 6); c.stroke();
  c.fillStyle = "#3e2a1a"; c.fillRect(sp.x - 34, sp.y + 5, 68, 17); c.fillStyle = "#6b3d2a"; c.fillRect(sp.x - 32.5, sp.y + 6.5, 65, 14);
  c.font = "800 8px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff0b0"; c.fillText("PASAR KECIL", sp.x, sp.y + 14);
}
// Pondok Kumpul: balai kayu terbuka berlantai panggung rendah
function drawPondok(c, b, t, night) {
  const z0 = LIFT + 6, h = b.h, { x0, y0, x1, y1 } = b;
  c.fillStyle = "rgba(20,40,30,.18)"; poly(c, [P(x0, y0, LIFT), P(x1 + 0.9, y0 + 0.1, LIFT), P(x1 + 0.9, y1 + 0.2, LIFT), P(x0 + 0.3, y1 + 0.2, LIFT), P(x0, y1, LIFT)]); c.fill();
  c.fillStyle = "#5a3a20"; poly(c, [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, LIFT), P(x0, y1, LIFT)]); c.fill(); poly(c, [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, LIFT), P(x1, y0, LIFT)]); c.fill();
  c.fillStyle = "#a8743f"; poly(c, [P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)]); c.fill();
  c.strokeStyle = "rgba(90,58,32,.45)"; c.lineWidth = 1; for (let x = x0 + 0.3; x < x1; x += 0.3) { const a = P(x, y0, z0), d = P(x, y1, z0); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(d.x, d.y); c.stroke(); }
  // tikar & gelas kopi di lantai
  c.fillStyle = "#d8b56a"; poly(c, [P(x0 + 0.5, y0 + 0.5, z0 + 0.5), P(x1 - 0.6, y0 + 0.5, z0 + 0.5), P(x1 - 0.6, y1 - 0.5, z0 + 0.5), P(x0 + 0.5, y1 - 0.5, z0 + 0.5)]); c.fill();
  c.strokeStyle = "#b8864a"; c.lineWidth = 0.8; for (let k = 0.6; k < (x1 - x0) - 0.6; k += 0.25) { const a = P(x0 + k, y0 + 0.5, z0 + 0.6), d = P(x0 + k, y1 - 0.5, z0 + 0.6); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(d.x, d.y); c.stroke(); }
  for (const [x, y] of [[x0 + 1.1, y0 + 1.0], [x0 + 1.5, y0 + 1.3], [x1 - 1.0, y0 + 1.1]]) { const p = P(x, y, z0 + 1); c.fillStyle = "#fff6e4"; c.fillRect(p.x - 2, p.y - 5, 4, 5); c.fillStyle = "#5a3a20"; c.fillRect(p.x - 1.5, p.y - 4.6, 3, 1.2); }
  const posts = [[x0 + 0.1, y0 + 0.1], [x1 - 0.1, y0 + 0.1], [x1 - 0.1, y1 - 0.1], [x0 + 0.1, y1 - 0.1]];
  c.fillStyle = "#6b4527"; for (const [x, y] of posts) { const a = P(x, y, z0 + h), g = P(x, y, z0); c.fillRect(a.x - 2.2, a.y, 4.4, g.y - a.y); }
  // lentera
  const lp = P((x0 + x1) / 2, y1 - 0.1, z0 + h - 6); c.strokeStyle = "#3a2a1a"; c.lineWidth = 1; c.beginPath(); c.moveTo(lp.x, lp.y - 8); c.lineTo(lp.x, lp.y - 2); c.stroke();
  c.fillStyle = night > 0.3 ? "#ffd27a" : "#e6c88a"; c.beginPath(); c.ellipse(lp.x, lp.y + 2, 3.5, 4.5, 0, 0, 7); c.fill();
  sideRoof(c, { ...b, wall: "#b98a5a", trim: "#8f2d2d" }, z0 + h, 22, "#5b4130", "x");
}
for (const b of M.buildings) {
  if (b.kind === "thouse") b.draw = drawTHouse;
  else if (b.kind === "tmarket") { b.drawBack = drawTMarketBack; b.drawFront = drawTMarketFront; }
  else if (b.kind === "pondok") b.draw = drawPondok;
}

// ---------- Ilustrasi Buku Petualangan ----------
function bookArt(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.5); sky.addColorStop(0, "#8ec5e0"); sky.addColorStop(1, "#e6eef0"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = "#7fa7a6"; g.beginPath(); g.moveTo(0, h * 0.5); for (let x = 0; x <= w; x += 6) g.lineTo(x, h * 0.5 - 14 - Math.sin(x * 0.07 + 1) * 9 - Math.sin(x * 0.19) * 3); g.lineTo(w, h * 0.5); g.fill();
  g.fillStyle = "#3a8ea6"; g.fillRect(0, h * 0.5, w, h * 0.5);
  g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(10 + i * 30, h * 0.6 + i * 3); g.lineTo(26 + i * 30, h * 0.6 + i * 3); g.stroke(); }
  g.fillStyle = "#7cb562"; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.72); g.quadraticCurveTo(w * 0.4, h * 0.66, w * 0.62, h); g.fill();
  g.fillStyle = "#d9b98a"; g.fillRect(20, h * 0.66, 22, 12); g.fillStyle = "#6b3d2a"; g.beginPath(); g.moveTo(14, h * 0.67); g.quadraticCurveTo(31, h * 0.6, 48, h * 0.67); g.lineTo(46, h * 0.56); g.quadraticCurveTo(31, h * 0.62, 16, h * 0.56); g.closePath(); g.fill();
  g.fillStyle = "#2f6a3c"; for (const [x, s] of [[58, 1], [70, 0.8], [6, 0.7]]) { g.beginPath(); g.moveTo(x, h * 0.86 - 26 * s); g.lineTo(x + 8 * s, h * 0.86); g.lineTo(x - 8 * s, h * 0.86); g.fill(); }
  g.fillStyle = "#4a2f1c"; g.beginPath(); g.moveTo(84, h * 0.7); g.quadraticCurveTo(100, h * 0.76, 116, h * 0.7); g.closePath(); g.fill();
}

const waterOk = (x, y) => y > SHORE_FAR; // kilau air hanya di danau, tidak di kaki bukit seberang
NW.TOBA_DRAW = { C, waterColor, waterOk, landTile, kebun, drawBack, drawSky, bookArt };
})();
