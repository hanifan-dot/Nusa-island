// =========================================================
//  NUSA ISLAND — Island Life: gambar isometrik (terrain, bangunan, karakter)
//  Semua digambar prosedural dengan Canvas 2D, tanpa gambar eksternal.
// =========================================================
(() => {
"use strict";
const { T, isLandT, hash2 } = NW;
const A = () => NW.areas.cur; // Bumbu 2: semua gambar peta mengikuti AREA AKTIF
const HW = NW.TW / 2, HH = NW.TH / 2;
const LIFT = 6; // daratan sedikit lebih tinggi dari air

// ---------- Util warna ----------
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
const shade = (c, k) => (k < 0 ? mix(c, "#000000", -k) : mix(c, "#ffffff", k));
const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// tile (x,y,z) → piksel dunia
const P = (x, y, z = 0) => ({ x: (x - y) * HW, y: (x + y) * HH - z });
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y); c.closePath(); }

const COL = {
  deep: "#1f86a8", mid: "#2fa3bb", shallow: "#5cc8cc",
  sand: "#efd8a2", sandSide: "#c8a36a", grass: "#86c064", grassDark: "#6aa64e",
  path: "#dcbd8a", pathEdge: "#c7a370", dock: "#b27d48", dockDark: "#7d532c",
};
function waterColor(x, y) {
  const th = A().theme; if (th && th.waterColor) return th.waterColor(x, y);
  const d = A().map.islandD(x + 0.5, y + 0.5);
  const k = clamp((d - 0.98) / 0.32, 0, 1);
  return k < 0.5 ? mix(COL.shallow, COL.mid, k * 2) : mix(COL.mid, COL.deep, (k - 0.5) * 2);
}

// ---------- Cache terrain (satu kanvas untuk area aktif; dibangun ulang saat pindah area) ----------
const PAD = 90;
let BOUNDS = null, terrain = null, terrainScale = 0, terrainArea = null, terrainWant = 0;
function boundsOf(a) {
  const { MW, MH } = a.map, e = (a.theme && a.theme.extend) || {};
  return { x0: -MH * HW - PAD - (e.left || 0), y0: -PAD - LIFT - (e.top || 0), x1: MW * HW + PAD + (e.right || 0), y1: (MW + MH) * HH + PAD + (e.bottom || 0) };
}
// batas piksel kanvas cache supaya aman di HP (kanvas raksasa bisa gagal dibuat / boros memori)
const MAX_PX = 12.5e6;
function buildTerrain(scale) {
  terrainWant = scale;
  const a = A(), m = a.map, th = a.theme || {};
  BOUNDS = boundsOf(a);
  const bw = BOUNDS.x1 - BOUNDS.x0, bh = BOUNDS.y1 - BOUNDS.y0;
  scale = Math.min(scale, Math.sqrt(MAX_PX / (bw * bh)));
  const c = terrain && terrainArea !== null ? terrain : document.createElement("canvas"); // pakai ulang kanvas lama (hemat memori)
  c.width = Math.ceil(bw * scale);
  c.height = Math.ceil(bh * scale);
  const g = c.getContext("2d");
  g.setTransform(scale, 0, 0, scale, -BOUNDS.x0 * scale, -BOUNDS.y0 * scale);
  g.clearRect(BOUNDS.x0, BOUNDS.y0, bw, bh);
  if (!th.clearBg) { g.fillStyle = th.deep || COL.deep; g.fillRect(BOUNDS.x0, BOUNDS.y0, bw, bh); } // clearBg: latar digambar tiap frame (mis. bukit jauh)
  const { MW, MH, tileAt } = m;
  if (th.backdrop) th.backdrop(g, terrainKit); // mis. perbukitan jauh di seberang danau
  // 1) air
  for (let s = 0; s < MW + MH; s++) for (let x = 0; x < MW; x++) {
    const y = s - x; if (y < 0 || y >= MH) continue;
    const t = tileAt(x, y); if (isLandT(t)) continue;
    g.fillStyle = waterColor(x, y);
    poly(g, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)]); g.fill();
    g.strokeStyle = g.fillStyle; g.lineWidth = 1; g.stroke(); // tutup celah
  }
  // 2) daratan, berurutan dari belakang ke depan
  for (let s = 0; s < MW + MH; s++) for (let x = 0; x < MW; x++) {
    const y = s - x; if (y < 0 || y >= MH) continue;
    const t = tileAt(x, y); if (!isLandT(t) || t === T.DOCK) continue;
    if (th.landTile) th.landTile(g, x, y, t, terrainKit); else drawLandTile(g, x, y, t);
  }
  // 3) dermaga
  for (const D of m.docks || []) drawDock(g, D);
  // 4) petak bunga / kebun
  for (const f of m.flowerBeds || []) (f.kind === "kebun" && th.kebun ? th.kebun(g, f, terrainKit) : drawFlowerBed(g, f));
  if (th.extras) th.extras(g, terrainKit);
  terrain = c; terrainScale = scale; terrainArea = a.id;
}
function drawLandTile(g, x, y, t) {
  const { tileAt, islandD } = A().map;
  const h = hash2(x, y);
  // sisi tebing kecil bila tetangga depan adalah air
  const sideCol = COL.sandSide;
  if (!isLandT(tileAt(x + 1, y))) {
    g.fillStyle = shade(sideCol, -0.08);
    poly(g, [P(x + 1, y, LIFT), P(x + 1, y + 1, LIFT), P(x + 1, y + 1, 0), P(x + 1, y, 0)]); g.fill();
  }
  if (!isLandT(tileAt(x, y + 1))) {
    g.fillStyle = sideCol;
    poly(g, [P(x, y + 1, LIFT), P(x + 1, y + 1, LIFT), P(x + 1, y + 1, 0), P(x, y + 1, 0)]); g.fill();
  }
  let base = t === T.GRASS ? mix(COL.grass, COL.grassDark, h * 0.5) : t === T.SAND ? mix(COL.sand, "#e6cb8f", h * 0.6) : COL.grass;
  // rumput dekat pasir sedikit kekuningan
  if (t === T.GRASS) { const d = islandD(x + 0.5, y + 0.5); if (d > 0.72) base = mix(base, "#b9c977", (d - 0.72) * 6); }
  g.fillStyle = base;
  poly(g, [P(x, y, LIFT), P(x + 1, y, LIFT), P(x + 1, y + 1, LIFT), P(x, y + 1, LIFT)]); g.fill();
  g.strokeStyle = base; g.lineWidth = 0.8; g.stroke();

  const c = P(x + 0.5, y + 0.5, LIFT);
  if (t === T.GRASS) {
    g.strokeStyle = shade(base, -0.18); g.lineWidth = 1.1; g.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const u = hash2(x * 7 + i, y * 3 - i), v = hash2(x * 5 - i, y * 11 + i);
      const p = P(x + 0.15 + u * 0.7, y + 0.15 + v * 0.7, LIFT);
      g.beginPath(); g.moveTo(p.x - 2, p.y); g.lineTo(p.x - 0.5, p.y - 4); g.moveTo(p.x + 1, p.y); g.lineTo(p.x + 2.5, p.y - 3.5); g.stroke();
    }
    if (h > 0.86) { // bunga liar kecil
      const fc = ["#fff6d8", "#f6a6b2", "#f7d25a"][(h * 1000) % 3 | 0];
      for (let i = 0; i < 3; i++) { const p = P(x + 0.3 + i * 0.2, y + 0.6 - i * 0.15, LIFT); g.fillStyle = fc; g.beginPath(); g.arc(p.x, p.y - 2, 1.6, 0, 7); g.fill(); }
    }
  } else if (t === T.SAND) {
    g.fillStyle = shade(base, -0.12);
    for (let i = 0; i < 5; i++) { const p = P(x + hash2(x + i, y * 2) * 0.9 + 0.05, y + hash2(x * 3, y + i) * 0.9 + 0.05, LIFT); g.fillRect(p.x, p.y, 1.4, 1.4); }
    if (h > 0.93) { // kerang
      g.fillStyle = "#fbefe6"; g.beginPath(); g.ellipse(c.x + 6, c.y + 2, 3, 2, 0.4, 0, 7); g.fill();
    }
  } else if (t === T.PATH) {
    // jalan tanah: bentuk membulat di atas rumput
    g.fillStyle = COL.pathEdge;
    poly(g, [P(x + 0.06, y + 0.06, LIFT), P(x + 0.94, y + 0.06, LIFT), P(x + 0.94, y + 0.94, LIFT), P(x + 0.06, y + 0.94, LIFT)]); g.fill();
    // sambungkan dengan tetangga jalan supaya rapi
    g.fillStyle = COL.path;
    const N = (dx, dy) => { const tt = tileAt(x + dx, y + dy); return tt === T.PATH || tt === T.DOCK; };
    const x0 = N(-1, 0) ? 0 : 0.12, x1 = N(1, 0) ? 1 : 0.88, y0 = N(0, -1) ? 0 : 0.12, y1 = N(0, 1) ? 1 : 0.88;
    poly(g, [P(x + x0, y + y0, LIFT), P(x + x1, y + y0, LIFT), P(x + x1, y + y1, LIFT), P(x + x0, y + y1, LIFT)]); g.fill();
    g.fillStyle = "#b9966a";
    for (let i = 0; i < 4; i++) { const p = P(x + 0.2 + hash2(x + i * 3, y) * 0.6, y + 0.2 + hash2(x, y + i * 5) * 0.6, LIFT); g.beginPath(); g.ellipse(p.x, p.y, 1.8, 1, 0, 0, 7); g.fill(); }
  }
}

// D = { x0, x1, y0, y1 (tile, inklusif), axis: "x" (memanjang ke timur) | "y" (memanjang ke utara/selatan) }
function drawDock(g, D) {
  const { x0, x1, y0, y1 } = D, Z = LIFT + 4, X1 = x1 + 1, Y1 = y1 + 1, ax = D.axis || "x";
  // tiang
  g.fillStyle = COL.dockDark;
  if (ax === "x") for (let x = x0 + 1; x <= X1; x += 1.5) for (const y of [y0 + 0.05, Y1 - 0.05]) { const a = P(x, y, Z), b = P(x, y, -8); g.fillRect(a.x - 2.5, a.y, 5, b.y - a.y); }
  else for (let y = y0; y <= Y1 - 0.5; y += 1.5) for (const x of [x0 + 0.05, X1 - 0.05]) { const a = P(x, y, Z), b = P(x, y, -8); g.fillRect(a.x - 2.5, a.y, 5, b.y - a.y); }
  // sisi depan dermaga
  g.fillStyle = shade(COL.dock, -0.32);
  poly(g, [P(x0, Y1, Z), P(X1, Y1, Z), P(X1, Y1, Z - 5), P(x0, Y1, Z - 5)]); g.fill();
  g.fillStyle = shade(COL.dock, -0.42);
  poly(g, [P(X1, y0, Z), P(X1, Y1, Z), P(X1, Y1, Z - 5), P(X1, y0, Z - 5)]); g.fill();
  // lantai papan (melintang terhadap arah dermaga)
  g.fillStyle = COL.dock;
  poly(g, [P(x0, y0, Z), P(X1, y0, Z), P(X1, Y1, Z), P(x0, Y1, Z)]); g.fill();
  g.strokeStyle = shade(COL.dock, -0.25); g.lineWidth = 1;
  if (ax === "x") for (let x = x0 + 0.33; x < X1; x += 0.33) { const a = P(x, y0, Z), b = P(x, Y1, Z); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
  else for (let y = y0 + 0.33; y < Y1; y += 0.33) { const a = P(x0, y, Z), b = P(X1, y, Z); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,.08)";
  if (ax === "x") for (let x = x0; x < X1; x += 0.66) { poly(g, [P(x, y0, Z), P(x + 0.16, y0, Z), P(x + 0.16, Y1, Z), P(x, Y1, Z)]); g.fill(); }
  else for (let y = y0; y < Y1; y += 0.66) { poly(g, [P(x0, y, Z), P(X1, y, Z), P(X1, y + 0.16, Z), P(x0, y + 0.16, Z)]); g.fill(); }
  // tiang tambat di ujung
  g.fillStyle = COL.dockDark;
  const bitts = ax === "x" ? [[X1 - 0.12, y0 + 0.12], [X1 - 0.12, Y1 - 0.12], [x0 + 3.5, Y1 - 0.1]] : [[x0 + 0.12, y0 + 0.12], [X1 - 0.12, y0 + 0.12], [X1 - 0.1, y0 + 3.2]];
  for (const [x, y] of bitts) {
    const a = P(x, y, Z); g.fillRect(a.x - 3, a.y - 12, 6, 12); g.fillStyle = shade(COL.dockDark, 0.2); g.beginPath(); g.ellipse(a.x, a.y - 12, 3, 1.5, 0, 0, 7); g.fill(); g.fillStyle = COL.dockDark;
  }
}

function drawFlowerBed(g, f) {
  g.fillStyle = "#8a5b3a";
  poly(g, [P(f.x0, f.y0, LIFT + 2), P(f.x1, f.y0, LIFT + 2), P(f.x1, f.y1, LIFT + 2), P(f.x0, f.y1, LIFT + 2)]); g.fill();
  g.fillStyle = "#6e4528";
  poly(g, [P(f.x0, f.y1, LIFT + 2), P(f.x1, f.y1, LIFT + 2), P(f.x1, f.y1, LIFT - 1), P(f.x0, f.y1, LIFT - 1)]); g.fill();
  poly(g, [P(f.x1, f.y0, LIFT + 2), P(f.x1, f.y1, LIFT + 2), P(f.x1, f.y1, LIFT - 1), P(f.x1, f.y0, LIFT - 1)]); g.fill();
  const cols = ["#f15f74", "#f7c948", "#ffffff", "#b07ce8", "#ff9a3c"];
  for (let i = 0; i < 26; i++) {
    const u = hash2(i * 13 + f.x0 * 7, i), v = hash2(i, i * 17 + f.y0 * 5);
    const p = P(f.x0 + 0.1 + u * (f.x1 - f.x0 - 0.2), f.y0 + 0.1 + v * (f.y1 - f.y0 - 0.2), LIFT + 2);
    g.fillStyle = "#4d8a3c"; g.fillRect(p.x - 0.6, p.y - 5, 1.2, 5);
    g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(p.x, p.y - 6, 2.3, 0, 7); g.fill();
  }
}

// perkakas untuk gambar terrain khusus area (dipakai theme.landTile / backdrop / extras)
const terrainKit = { P, poly, mix, shade, rgba, clamp, LIFT, hash2, T, COL, drawLandTile, drawFlowerBed, HW, HH };

// ---------- Lapisan animasi air ----------
function drawWater(c, view, t) {
  // kilau ombak di tile air yang terlihat (termasuk di luar peta)
  const tx0 = Math.floor((view.x0 / HW + view.y0 / HH) / 2) - 2, tx1 = Math.ceil((view.x1 / HW + view.y1 / HH) / 2) + 2;
  const ty0 = Math.floor((view.y0 / HH - view.x1 / HW) / 2) - 2, ty1 = Math.ceil((view.y1 / HH - view.x0 / HW) / 2) + 2;
  c.lineCap = "round";
  const wk = NW.weather ? NW.weather.waterK() : 1; // angin & hujan: air lebih berkilau/aktif
  const tileAt = A().map.tileAt, spark = ((A().theme && A().theme.sparkle) || 0.32) * wk, ok = (A().theme && A().theme.waterOk) || null;
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    if (isLandT(tileAt(x, y)) || (ok && !ok(x, y))) continue;
    const p = P(x + 0.5, y + 0.5);
    if (p.x < view.x0 - 40 || p.x > view.x1 + 40 || p.y < view.y0 - 30 || p.y > view.y1 + 30) continue;
    const h = hash2(x + 100, y + 100);
    const a = Math.sin(t * 1.4 + h * 6.28 + (x + y) * 0.45);
    if (a < 0.25 - (wk - 1) * 0.12) continue;
    const off = Math.sin(t * 0.7 * (0.8 + 0.2 * wk) + h * 9) * 6;
    c.strokeStyle = `rgba(255,255,255,${((a - 0.25) * spark).toFixed(3)})`;
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(p.x - 9 + off, p.y + h * 6 - 3); c.quadraticCurveTo(p.x + off, p.y + h * 6 - 6, p.x + 9 + off, p.y + h * 6 - 3); c.stroke();
  }
  // buih di garis pantai
  c.lineWidth = 2.2;
  NW.shoreEdges.forEach((e, i) => {
    const a = P(e.ax, e.ay), b = P(e.bx, e.by);
    if (Math.max(a.x, b.x) < view.x0 - 20 || Math.min(a.x, b.x) > view.x1 + 20 || Math.max(a.y, b.y) < view.y0 - 20 || Math.min(a.y, b.y) > view.y1 + 20) return;
    const w = 0.5 + 0.5 * Math.sin(t * 1.6 + i * 0.9);
    const o = 0.06 + w * 0.12;
    const A = P(e.ax + e.nx * o, e.ay + e.ny * o), B = P(e.bx + e.nx * o, e.by + e.ny * o);
    c.strokeStyle = `rgba(255,255,255,${(0.25 + 0.4 * (1 - w)).toFixed(3)})`;
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
  });
}

function drawTerrain(c, view) {
  if (!terrain || terrainArea !== A().id) buildTerrain(terrainWant || 1);
  const s = terrainScale;
  const sx = (view.x0 - BOUNDS.x0) * s, sy = (view.y0 - BOUNDS.y0) * s;
  const sw = (view.x1 - view.x0) * s, sh = (view.y1 - view.y0) * s;
  // potong ke area cache agar drawImage tidak gagal
  const cx0 = clamp(sx, 0, terrain.width), cy0 = clamp(sy, 0, terrain.height);
  const cx1 = clamp(sx + sw, 0, terrain.width), cy1 = clamp(sy + sh, 0, terrain.height);
  if (cx1 - cx0 < 1 || cy1 - cy0 < 1) return;
  c.drawImage(terrain, cx0, cy0, cx1 - cx0, cy1 - cy0, BOUNDS.x0 + cx0 / s, BOUNDS.y0 + cy0 / s, (cx1 - cx0) / s, (cy1 - cy0) / s);
}

// ---------- Bayangan ----------
// cahaya dari kiri-atas → bayangan ke kanan-bawah layar (arah +x)
function shadowBox(c, x0, y0, x1, y1, len) {
  c.fillStyle = "rgba(20,40,30,.18)";
  poly(c, [P(x1, y0, LIFT), P(x1 + len, y0 + len * 0.15, LIFT), P(x1 + len, y1 + len * 0.15, LIFT), P(x0 + len * 0.3, y1 + len * 0.15, LIFT), P(x0, y1, LIFT)]);
  c.fill();
}
function shadowBlob(c, x, y, r, k = 1) {
  const p = P(x + 0.12 * k, y + 0.04 * k, LIFT);
  c.fillStyle = "rgba(20,40,30,.2)"; c.beginPath(); c.ellipse(p.x, p.y, r * HW * 0.9, r * HH * 0.9, 0, 0, 7); c.fill();
}

// ---------- Bangunan ----------
function quadOnFace(face, b, z0, h, u0, u1, v0, v1) {
  // face 'y' = sisi kiri-bawah (y = y1), 'x' = sisi kanan-bawah (x = x1)
  const pt = (u, v) => face === "y" ? P(b.x0 + (b.x1 - b.x0) * u, b.y1, z0 + h * v) : P(b.x1, b.y1 - (b.y1 - b.y0) * u, z0 + h * v);
  return [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)];
}
function windowOn(c, face, b, z0, h, u, w, night) {
  const f = quadOnFace(face, b, z0, h, u - w / 2 - 0.02, u + w / 2 + 0.02, 0.32, 0.8);
  c.fillStyle = "#5b3a22"; poly(c, f); c.fill();
  const g = quadOnFace(face, b, z0, h, u - w / 2, u + w / 2, 0.36, 0.76);
  c.fillStyle = night > 0.35 ? mix("#7fb3c8", "#ffd27a", clamp((night - 0.35) * 2.5, 0, 1)) : "#8cc3d6"; poly(c, g); c.fill();
  // kusen silang
  const m1 = quadOnFace(face, b, z0, h, u - 0.008, u + 0.008, 0.36, 0.76), m2 = quadOnFace(face, b, z0, h, u - w / 2, u + w / 2, 0.555, 0.575);
  c.fillStyle = "#5b3a22"; poly(c, m1); c.fill(); poly(c, m2); c.fill();
  // daun jendela
  c.fillStyle = "#3f7a5e";
  poly(c, quadOnFace(face, b, z0, h, u - w / 2 - 0.09, u - w / 2 - 0.02, 0.34, 0.78)); c.fill();
  poly(c, quadOnFace(face, b, z0, h, u + w / 2 + 0.02, u + w / 2 + 0.09, 0.34, 0.78)); c.fill();
}
function doorOn(c, face, b, z0, h, u, w, col = "#6a4326") {
  c.fillStyle = shade(col, -0.25); poly(c, quadOnFace(face, b, z0, h, u - w / 2 - 0.02, u + w / 2 + 0.02, 0, 0.7)); c.fill();
  c.fillStyle = col; poly(c, quadOnFace(face, b, z0, h, u - w / 2, u + w / 2, 0, 0.66)); c.fill();
  c.fillStyle = "#e0b84c"; const k = quadOnFace(face, b, z0, h, u + w * 0.28, u + w * 0.36, 0.3, 0.36); poly(c, k); c.fill();
}
function planks(c, face, b, z0, h, col) {
  c.strokeStyle = rgba(shade(col, -0.35), 0.35); c.lineWidth = 1;
  for (let v = 0.16; v < 1; v += 0.16) {
    const q = quadOnFace(face, b, z0, h, 0, 1, v, v);
    c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[1].x, q[1].y); c.stroke();
  }
}

function gableRoof(c, b, z, rh, col, ridge = "x") {
  const o = 0.28, { x0, y0, x1, y1 } = b;
  const dark = shade(col, -0.25), light = col;
  if (ridge === "x") {
    const ym = (y0 + y1) / 2;
    c.fillStyle = dark; poly(c, [P(x0 - o, y0 - o, z), P(x1 + o, y0 - o, z), P(x1 + o, ym, z + rh), P(x0 - o, ym, z + rh)]); c.fill();
    c.fillStyle = shade(b.wall, -0.18); poly(c, [P(x1, y1, z), P(x1, y0, z), P(x1, ym, z + rh * 0.92)]); c.fill(); // segitiga gable
    c.fillStyle = light; const front = [P(x0 - o, y1 + o, z - 3), P(x1 + o, y1 + o, z - 3), P(x1 + o, ym, z + rh), P(x0 - o, ym, z + rh)]; poly(c, front); c.fill();
    // baris genteng
    c.strokeStyle = rgba(shade(col, -0.35), 0.55); c.lineWidth = 1.2;
    for (let k = 1; k < 5; k++) { const t = k / 5, A = P(x0 - o, y1 + o + (ym - y1 - o) * t, z - 3 + (rh + 3) * t), B = P(x1 + o, y1 + o + (ym - y1 - o) * t, z - 3 + (rh + 3) * t); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); }
    c.strokeStyle = shade(col, -0.45); c.lineWidth = 3; const r0 = P(x0 - o, ym, z + rh), r1 = P(x1 + o, ym, z + rh); c.beginPath(); c.moveTo(r0.x, r0.y); c.lineTo(r1.x, r1.y); c.stroke();
    c.strokeStyle = shade(col, -0.3); c.lineWidth = 2; const e0 = P(x1 + o, y1 + o, z - 3), e1 = P(x1 + o, ym, z + rh); c.beginPath(); c.moveTo(e0.x, e0.y); c.lineTo(e1.x, e1.y); c.stroke();
  } else {
    const xm = (x0 + x1) / 2;
    c.fillStyle = dark; poly(c, [P(x0 - o, y0 - o, z), P(x0 - o, y1 + o, z), P(xm, y1 + o, z + rh), P(xm, y0 - o, z + rh)]); c.fill();
    c.fillStyle = shade(b.wall, -0.05); poly(c, [P(x0, y1, z), P(x1, y1, z), P(xm, y1, z + rh * 0.92)]); c.fill();
    c.fillStyle = shade(col, -0.08); const right = [P(x1 + o, y0 - o, z - 3), P(x1 + o, y1 + o, z - 3), P(xm, y1 + o, z + rh), P(xm, y0 - o, z + rh)]; poly(c, right); c.fill();
    c.strokeStyle = rgba(shade(col, -0.4), 0.55); c.lineWidth = 1.2;
    for (let k = 1; k < 5; k++) { const t = k / 5, A = P(x1 + o + (xm - x1 - o) * t, y0 - o, z - 3 + (rh + 3) * t), B = P(x1 + o + (xm - x1 - o) * t, y1 + o, z - 3 + (rh + 3) * t); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); }
    c.strokeStyle = shade(col, -0.45); c.lineWidth = 3; const r0 = P(xm, y0 - o, z + rh), r1 = P(xm, y1 + o, z + rh); c.beginPath(); c.moveTo(r0.x, r0.y); c.lineTo(r1.x, r1.y); c.stroke();
    c.strokeStyle = shade(col, -0.3); c.lineWidth = 2; const e0 = P(x1 + o, y1 + o, z - 3), e1 = P(xm, y1 + o, z + rh); c.beginPath(); c.moveTo(e0.x, e0.y); c.lineTo(e1.x, e1.y); c.stroke();
  }
}

function drawHouse(c, b, t, night) {
  const z0 = LIFT + (b.stilts || 0), h = b.h, wall = b.wall;
  shadowBox(c, b.x0, b.y0, b.x1, b.y1, 0.9);
  if (b.stilts) {
    c.fillStyle = "#6b4527";
    for (const [x, y] of [[b.x0 + 0.1, b.y1 - 0.1], [b.x1 - 0.1, b.y1 - 0.1], [b.x1 - 0.1, b.y0 + 0.1], [(b.x0 + b.x1) / 2, b.y1 - 0.1], [b.x1 - 0.1, (b.y0 + b.y1) / 2]]) {
      const a = P(x, y, z0), g = P(x, y, LIFT); c.fillRect(a.x - 2.5, a.y, 5, g.y - a.y);
    }
    c.fillStyle = "#5a3a20"; // lantai panggung
    poly(c, [P(b.x0 - 0.1, b.y1 + 0.1, z0), P(b.x1 + 0.1, b.y1 + 0.1, z0), P(b.x1 + 0.1, b.y1 + 0.1, z0 - 4), P(b.x0 - 0.1, b.y1 + 0.1, z0 - 4)]); c.fill();
    poly(c, [P(b.x1 + 0.1, b.y0 - 0.1, z0), P(b.x1 + 0.1, b.y1 + 0.1, z0), P(b.x1 + 0.1, b.y1 + 0.1, z0 - 4), P(b.x1 + 0.1, b.y0 - 0.1, z0 - 4)]); c.fill();
  }
  // dinding
  c.fillStyle = shade(wall, -0.02); poly(c, quadOnFace("y", b, z0, h, 0, 1, 0, 1)); c.fill();
  planks(c, "y", b, z0, h, wall);
  c.fillStyle = shade(wall, -0.2); poly(c, quadOnFace("x", b, z0, h, 0, 1, 0, 1)); c.fill();
  planks(c, "x", b, z0, h, shade(wall, -0.2));
  // fondasi / list bawah
  c.fillStyle = shade(wall, -0.4);
  poly(c, quadOnFace("y", b, z0, h, 0, 1, 0, 0.08)); c.fill(); poly(c, quadOnFace("x", b, z0, h, 0, 1, 0, 0.08)); c.fill();
  // pintu & jendela
  const dw = 0.24 / Math.max(1, (b.door === "y" ? b.x1 - b.x0 : b.y1 - b.y0) / 2.5);
  if (b.door === "y") { doorOn(c, "y", b, z0, h, 0.32, dw); windowOn(c, "y", b, z0, h, 0.72, 0.2, night); windowOn(c, "x", b, z0, h, 0.5, 0.24, night); }
  else { doorOn(c, "x", b, z0, h, 0.5, dw); windowOn(c, "y", b, z0, h, 0.3, 0.2, night); windowOn(c, "y", b, z0, h, 0.72, 0.2, night); }
  // tangga untuk rumah panggung
  if (b.stilts) {
    const face = b.door, u = b.door === "y" ? 0.32 : 0.5;
    for (let i = 0; i < 3; i++) {
      const k = (i + 1) / 4, z = z0 - (z0 - LIFT) * k, out = 0.18 + k * 0.5;
      const pts = face === "y"
        ? [P(b.x0 + (b.x1 - b.x0) * (u - 0.1), b.y1 + out, z), P(b.x0 + (b.x1 - b.x0) * (u + 0.1), b.y1 + out, z), P(b.x0 + (b.x1 - b.x0) * (u + 0.1), b.y1 + out + 0.16, z), P(b.x0 + (b.x1 - b.x0) * (u - 0.1), b.y1 + out + 0.16, z)]
        : [P(b.x1 + out, b.y1 - (b.y1 - b.y0) * (u - 0.1), z), P(b.x1 + out, b.y1 - (b.y1 - b.y0) * (u + 0.1), z), P(b.x1 + out + 0.16, b.y1 - (b.y1 - b.y0) * (u + 0.1), z), P(b.x1 + out + 0.16, b.y1 - (b.y1 - b.y0) * (u - 0.1), z)];
      c.fillStyle = "#8a5a32"; poly(c, pts); c.fill();
    }
  }
  // pot bunga di depan
  const pp = b.door === "y" ? P(b.x0 + (b.x1 - b.x0) * 0.55, b.y1 + 0.25, LIFT) : P(b.x1 + 0.25, b.y1 - (b.y1 - b.y0) * 0.22, LIFT);
  c.fillStyle = "#b5562f"; c.fillRect(pp.x - 4, pp.y - 7, 8, 7);
  c.fillStyle = "#4f9a46"; c.beginPath(); c.arc(pp.x, pp.y - 10, 5, 0, 7); c.fill();
  c.fillStyle = "#f15f74"; c.beginPath(); c.arc(pp.x - 2, pp.y - 12, 1.8, 0, 7); c.arc(pp.x + 2.5, pp.y - 10, 1.8, 0, 7); c.fill();
  gableRoof(c, b, z0 + h, 26 + (b.x1 - b.x0) * 2, b.roof, b.door === "y" ? "x" : "y");
  // asap dapur dari rumah Pak Darto
  if (b.id === "rumah2") {
    const cp = P(b.x0 + 0.5, b.y0 + 0.6, z0 + h + 30);
    c.fillStyle = "#7a4a30"; c.fillRect(cp.x - 4, cp.y, 8, 12);
    for (let i = 0; i < 4; i++) { const k = (t * 0.25 + i / 4) % 1; c.fillStyle = `rgba(235,235,235,${0.45 * (1 - k)})`; c.beginPath(); c.arc(cp.x + k * 16 + Math.sin(t + i) * 3, cp.y - k * 40, 4 + k * 8, 0, 7); c.fill(); }
  }
}

function faceText(c, face, anchor, text, size, color) {
  c.save(); c.translate(anchor.x, anchor.y);
  if (face === "y") c.transform(1, 0.5, 0, 1, 0, 0); else c.transform(1, -0.5, 0, 1, 0, 0);
  c.font = `800 ${size}px system-ui, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillStyle = color; c.fillText(text, 0, 0); c.restore();
}

function drawShop(c, b, t, night) {
  const z0 = LIFT, h = b.h, wall = b.wall;
  shadowBox(c, b.x0, b.y0, b.x1, b.y1, 1.0);
  c.fillStyle = wall; poly(c, quadOnFace("y", b, z0, h, 0, 1, 0, 1)); c.fill();
  c.fillStyle = shade(wall, -0.2); poly(c, quadOnFace("x", b, z0, h, 0, 1, 0, 1)); c.fill();
  c.fillStyle = "#5c7c8e"; poly(c, quadOnFace("y", b, z0, h, 0, 1, 0, 0.12)); c.fill(); poly(c, quadOnFace("x", b, z0, h, 0, 1, 0, 0.12)); c.fill();
  // etalase kaca dengan joran
  const glass = quadOnFace("y", b, z0, h, 0.12, 0.88, 0.2, 0.7);
  c.fillStyle = "#5b3a22"; poly(c, quadOnFace("y", b, z0, h, 0.1, 0.9, 0.17, 0.73)); c.fill();
  c.fillStyle = night > 0.35 ? "#ffd894" : "#a9d6e5"; poly(c, glass); c.fill();
  for (let i = 0; i < 5; i++) { const a = quadOnFace("y", b, z0, h, 0.2 + i * 0.14, 0.2 + i * 0.14 + 0.01, 0.22, 0.66); c.fillStyle = ["#e2574c", "#173f50", "#e0b84c", "#579b8b", "#8a5a32"][i]; poly(c, a); c.fill(); }
  // pintu di sisi kanan
  doorOn(c, "x", b, z0, h, 0.5, 0.26, "#2f5d78");
  // tenda pintu
  const aw = [P(b.x1, b.y1 - (b.y1 - b.y0) * 0.3, z0 + h * 0.8), P(b.x1, b.y1 - (b.y1 - b.y0) * 0.7, z0 + h * 0.8), P(b.x1 + 0.45, b.y1 - (b.y1 - b.y0) * 0.7, z0 + h * 0.62), P(b.x1 + 0.45, b.y1 - (b.y1 - b.y0) * 0.3, z0 + h * 0.62)];
  c.fillStyle = "#e2574c"; poly(c, aw); c.fill();
  // atap datar dengan tepi
  const o = 0.12;
  c.fillStyle = b.roof; poly(c, [P(b.x0 - o, b.y0 - o, z0 + h + 1), P(b.x1 + o, b.y0 - o, z0 + h + 1), P(b.x1 + o, b.y1 + o, z0 + h + 1), P(b.x0 - o, b.y1 + o, z0 + h + 1)]); c.fill();
  c.fillStyle = shade(b.roof, -0.3); poly(c, [P(b.x1 + o, b.y0 - o, z0 + h + 1), P(b.x1 + o, b.y1 + o, z0 + h + 1), P(b.x1 + o, b.y1 + o, z0 + h - 3), P(b.x1 + o, b.y0 - o, z0 + h - 3)]); c.fill();
  // papan nama besar di atas (digambar setelah atap supaya terlihat)
  const sb = { x0: b.x0 + 0.15, x1: b.x1 - 0.15, y0: b.y0, y1: b.y1 + o + 0.01 };
  c.fillStyle = "#173f50"; poly(c, quadOnFace("y", sb, z0 + h - 2, 18, 0, 1, 0, 1)); c.fill();
  c.strokeStyle = "#e0b84c"; c.lineWidth = 1.2; poly(c, quadOnFace("y", sb, z0 + h - 2, 18, 0.02, 0.98, 0.1, 0.9)); c.stroke();
  faceText(c, "y", P((sb.x0 + sb.x1) / 2, sb.y1, z0 + h + 7), "TOKO PANCING", 9, "#e0b84c");
  // joran bersandar di dinding
  c.strokeStyle = "#c9a46a"; c.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const a = P(b.x1 + 0.12, b.y0 + 0.25 + i * 0.12, z0), e = P(b.x1 + 0.12, b.y0 + 0.4 + i * 0.12, z0 + 44); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(e.x, e.y); c.stroke(); }
}

// Pasar: lapisan belakang & depan (pedagang di antaranya)
function drawMarketBack(c, b) {
  const z0 = LIFT, h = b.h;
  shadowBox(c, b.x0, b.y0, b.x1, b.y1, 0.7);
  // lantai kayu
  c.fillStyle = "#c79a64"; poly(c, [P(b.x0, b.y0, z0 + 1), P(b.x1, b.y0, z0 + 1), P(b.x1, b.y1, z0 + 1), P(b.x0, b.y1, z0 + 1)]); c.fill();
  // dinding belakang rendah
  c.fillStyle = "#a87445"; poly(c, [P(b.x0, b.y0, z0), P(b.x1, b.y0, z0), P(b.x1, b.y0, z0 + h * 0.55), P(b.x0, b.y0, z0 + h * 0.55)]); c.fill();
  c.fillStyle = "#8f6036"; poly(c, [P(b.x0, b.y0, z0), P(b.x0, b.y1, z0), P(b.x0, b.y1, z0 + h * 0.55), P(b.x0, b.y0, z0 + h * 0.55)]); c.fill();
  // tiang belakang
  c.fillStyle = "#6b4527";
  for (const [x, y] of [[b.x0 + 0.08, b.y0 + 0.08], [b.x1 - 0.08, b.y0 + 0.08]]) { const a = P(x, y, z0 + h + 8), g = P(x, y, z0); c.fillRect(a.x - 2, a.y, 4, g.y - a.y); }
  // keranjang & timbangan
  const k = P(b.x0 + 0.5, b.y0 + 0.5, z0);
  c.fillStyle = "#b8864a"; c.beginPath(); c.ellipse(k.x, k.y - 6, 9, 5, 0, 0, 7); c.fill(); c.fillRect(k.x - 9, k.y - 6, 18, 6);
}
function drawMarketFront(c, b, t) {
  const z0 = LIFT, h = b.h;
  // meja dagangan di depan (sisi y1)
  const cb = { x0: b.x0 + 0.2, x1: b.x1 - 0.2, y0: b.y1 - 0.55, y1: b.y1 - 0.05 };
  const th = 16;
  c.fillStyle = "#8a5a32"; poly(c, quadOnFace("y", cb, z0, th, 0, 1, 0, 1)); c.fill();
  c.fillStyle = "#6e4628"; poly(c, quadOnFace("x", cb, z0, th, 0, 1, 0, 1)); c.fill();
  c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 1; for (let u = 0.2; u < 1; u += 0.2) { const q = quadOnFace("y", cb, z0, th, u, u, 0, 1); c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[3].x, q[3].y); c.stroke(); }
  // permukaan es & ikan
  c.fillStyle = "#e9f6fb"; poly(c, [P(cb.x0, cb.y0, z0 + th), P(cb.x1, cb.y0, z0 + th), P(cb.x1, cb.y1, z0 + th), P(cb.x0, cb.y1, z0 + th)]); c.fill();
  const fcols = ["#8c9a8a", "#cc4b3f", "#d79a2e", "#5d7f9c", "#9aa3a8", "#2fb39a"];
  for (let i = 0; i < 9; i++) {
    const p = P(cb.x0 + 0.25 + i * (cb.x1 - cb.x0 - 0.5) / 8, cb.y0 + 0.25 + (i % 2) * 0.12, z0 + th + 1);
    c.fillStyle = fcols[i % fcols.length];
    c.beginPath(); c.ellipse(p.x, p.y, 7, 2.6, 0.46, 0, 7); c.fill();
    c.beginPath(); c.moveTo(p.x - 6, p.y - 3); c.lineTo(p.x - 10, p.y - 6); c.lineTo(p.x - 9, p.y - 1); c.fill();
  }
  // tiang depan
  c.fillStyle = "#6b4527";
  for (const [x, y] of [[b.x0 + 0.08, b.y1 - 0.08], [b.x1 - 0.08, b.y1 - 0.08], [b.x1 - 0.08, b.y0 + 0.08]]) { const a = P(x, y, z0 + h + (y < b.y1 - 0.5 ? 8 : 0)), g = P(x, y, z0); c.fillRect(a.x - 2, a.y, 4, g.y - a.y); }
  // tenda belang miring ke depan
  const o = 0.3, zt = z0 + h + 10, zb = z0 + h - 4;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const xa = b.x0 - o + (b.x1 - b.x0 + 2 * o) * (i / n), xb = b.x0 - o + (b.x1 - b.x0 + 2 * o) * ((i + 1) / n);
    c.fillStyle = i % 2 ? "#fff6e4" : "#e2574c";
    poly(c, [P(xa, b.y0 - o * 0.5, zt), P(xb, b.y0 - o * 0.5, zt), P(xb, b.y1 + o, zb), P(xa, b.y1 + o, zb)]); c.fill();
  }
  // rumbai tenda
  for (let i = 0; i < n * 2; i++) {
    const xa = b.x0 - o + (b.x1 - b.x0 + 2 * o) * (i / (n * 2)), p = P(xa + 0.12, b.y1 + o, zb);
    c.fillStyle = Math.floor(i / 2) % 2 ? "#fff6e4" : "#e2574c";
    c.beginPath(); c.arc(p.x, p.y, 3.2, 0, Math.PI); c.fill();
  }
  c.fillStyle = "#c8443a"; poly(c, [P(b.x1 + o, b.y0 - o * 0.5, zt), P(b.x1 + o, b.y1 + o, zb), P(b.x1 + o, b.y1 + o, zb - 4), P(b.x1 + o, b.y0 - o * 0.5, zt - 4)]); c.fill();
  // papan nama gantung (menghadap kamera supaya terbaca)
  const sp = P((b.x0 + b.x1) / 2, b.y1 + o + 0.02, zb - 2);
  c.strokeStyle = "#5a3a20"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sp.x - 22, sp.y - 2); c.lineTo(sp.x - 22, sp.y + 6); c.moveTo(sp.x + 22, sp.y - 2); c.lineTo(sp.x + 22, sp.y + 6); c.stroke();
  c.fillStyle = "#0f2f3d"; c.fillRect(sp.x - 33, sp.y + 5, 66, 17);
  c.fillStyle = "#173f50"; c.fillRect(sp.x - 31.5, sp.y + 6.5, 63, 14);
  c.font = "800 8.5px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff0b0";
  c.fillText("PASAR IKAN", sp.x, sp.y + 14);
}

// ---------- Alam ----------
function drawPalm(c, o, t, wind) {
  const b = P(o.x, o.y, LIFT), h = o.h, lean = o.lean;
  shadowBlob(c, o.x + 0.5, o.y + 0.25, 0.75, 2);
  const sway = Math.sin(t * 1.2 + o.ph) * 3 * wind;
  const tx = b.x + lean * h * 0.55 + sway, ty = b.y - h;
  // batang bercincin
  c.strokeStyle = "#8a6a45"; c.lineWidth = 7; c.lineCap = "round";
  c.beginPath(); c.moveTo(b.x, b.y); c.quadraticCurveTo(b.x + lean * h * 0.05, b.y - h * 0.55, tx, ty); c.stroke();
  c.strokeStyle = "#6d5134"; c.lineWidth = 1.2;
  for (let k = 0.12; k < 0.95; k += 0.11) {
    const x = (1 - k) * (1 - k) * b.x + 2 * (1 - k) * k * (b.x + lean * h * 0.05) + k * k * tx;
    const y = (1 - k) * (1 - k) * b.y + 2 * (1 - k) * k * (b.y - h * 0.55) + k * k * ty;
    c.beginPath(); c.moveTo(x - 3.5, y); c.lineTo(x + 3.5, y + 1); c.stroke();
  }
  // kelapa
  c.fillStyle = "#6b4a2a"; c.beginPath(); c.arc(tx - 3, ty + 4, 3.4, 0, 7); c.arc(tx + 3, ty + 5, 3.4, 0, 7); c.arc(tx, ty + 7, 3.2, 0, 7); c.fill();
  // pelepah
  const leaves = 8;
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2 + o.ph, len = 30 + (i % 3) * 5;
    const dx = Math.cos(a) * len, dy = Math.sin(a) * len * 0.45 + 10 + Math.sin(t * 1.6 + i + o.ph) * 1.5 * wind;
    const back = Math.sin(a) < 0;
    c.fillStyle = back ? "#3f8a3e" : "#57a84a";
    c.beginPath(); c.moveTo(tx, ty);
    c.quadraticCurveTo(tx + dx * 0.5, ty + dy * 0.2 - 14, tx + dx, ty + dy);
    c.quadraticCurveTo(tx + dx * 0.45, ty + dy * 0.35 - 4, tx, ty + 2);
    c.fill();
    c.strokeStyle = "rgba(30,70,30,.5)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + dx * 0.5, ty + dy * 0.2 - 12, tx + dx, ty + dy); c.stroke();
  }
}
function drawTree(c, o, t) {
  const b = P(o.x, o.y, LIFT), s = o.s;
  shadowBlob(c, o.x + 0.35, o.y + 0.15, 1.0 * s, 1.5);
  c.fillStyle = "#7a5233"; c.fillRect(b.x - 4 * s, b.y - 26 * s, 8 * s, 26 * s);
  const g1 = o.hue > 0.5 ? "#4f9a46" : "#5aa64c", g2 = shade(g1, -0.22), g3 = shade(g1, 0.18);
  const sw = Math.sin(t * 0.9 + o.x) * 1.2;
  const blob = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(b.x + x * s + sw, b.y + y * s, r * s, 0, 7); c.fill(); };
  blob(-12, -36, 15, g2); blob(12, -38, 15, g2); blob(0, -50, 18, g1); blob(-10, -42, 14, g1); blob(11, -45, 13, g1); blob(-4, -55, 9, g3); blob(6, -50, 7, g3);
  if (o.hue > 0.7) { c.fillStyle = "#f2a33a"; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(b.x + (i * 9 - 18) * s + sw, b.y + (-38 - (i % 2) * 10) * s, 2.5 * s, 0, 7); c.fill(); } }
}
function drawBush(c, o) {
  const b = P(o.x, o.y, LIFT), s = o.s;
  shadowBlob(c, o.x + 0.15, o.y + 0.08, 0.5 * s, 1);
  const col = "#4f9a46";
  c.fillStyle = shade(col, -0.15); c.beginPath(); c.arc(b.x - 7 * s, b.y - 6 * s, 8 * s, 0, 7); c.arc(b.x + 7 * s, b.y - 6 * s, 8 * s, 0, 7); c.fill();
  c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y - 11 * s, 9 * s, 0, 7); c.fill();
  c.fillStyle = shade(col, 0.2); c.beginPath(); c.arc(b.x - 3 * s, b.y - 14 * s, 4 * s, 0, 7); c.fill();
  if (o.flowers) { c.fillStyle = "#f6a6b2"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(b.x + (i * 6 - 9) * s, b.y - (8 + (i % 2) * 7) * s, 2 * s, 0, 7); c.fill(); } }
}
function drawRock(c, o, sea, t) {
  const b = P(o.x, o.y, sea ? 0 : LIFT), s = o.s;
  if (sea) { c.strokeStyle = `rgba(255,255,255,${0.35 + 0.25 * Math.sin(t * 2 + o.x)})`; c.lineWidth = 1.5; c.beginPath(); c.ellipse(b.x, b.y, 16 * s, 7 * s, 0, 0, 7); c.stroke(); }
  else shadowBlob(c, o.x + 0.1, o.y + 0.05, 0.4 * s, 1);
  c.fillStyle = "#8d9192";
  c.beginPath(); c.moveTo(b.x - 12 * s, b.y); c.lineTo(b.x - 9 * s, b.y - 9 * s); c.lineTo(b.x - 1 * s, b.y - 13 * s); c.lineTo(b.x + 9 * s, b.y - 8 * s); c.lineTo(b.x + 12 * s, b.y); c.closePath(); c.fill();
  c.fillStyle = "#b2b6b4"; c.beginPath(); c.moveTo(b.x - 9 * s, b.y - 9 * s); c.lineTo(b.x - 1 * s, b.y - 13 * s); c.lineTo(b.x + 2 * s, b.y - 6 * s); c.lineTo(b.x - 6 * s, b.y - 4 * s); c.closePath(); c.fill();
}
function drawLamp(c, o, night) {
  const b = P(o.x, o.y, LIFT + (NW.tileAt(o.x, o.y + 0.2) === NW.T.DOCK ? 4 : 0));
  c.fillStyle = "rgba(20,40,30,.18)"; c.beginPath(); c.ellipse(b.x + 4, b.y + 1, 6, 2.5, 0, 0, 7); c.fill();
  c.fillStyle = "#2c3a40"; c.fillRect(b.x - 1.6, b.y - 40, 3.2, 40); c.fillRect(b.x - 4, b.y - 3, 8, 3);
  c.fillStyle = "#2c3a40"; c.beginPath(); c.moveTo(b.x - 6, b.y - 41); c.lineTo(b.x + 6, b.y - 41); c.lineTo(b.x + 3, b.y - 47); c.lineTo(b.x - 3, b.y - 47); c.fill();
  c.fillStyle = night > 0.3 ? "#ffe29a" : "#d9e4e6"; c.fillRect(b.x - 4, b.y - 41, 8, 8);
}
function drawSign(c, o) {
  const b = P(o.x, o.y, LIFT);
  c.fillStyle = "rgba(20,40,30,.18)"; c.beginPath(); c.ellipse(b.x + 8, b.y + 1, 14, 4, 0, 0, 7); c.fill();
  c.fillStyle = "#6b4527"; c.fillRect(b.x - 2, b.y - 26, 4, 26);
  const w = 52, h = 20, y = b.y - 44;
  c.fillStyle = "#8a5a32"; c.fillRect(b.x - w / 2 - 1.5, y - 1.5, w + 3, h + 3);
  c.fillStyle = "#d9aa6c"; c.fillRect(b.x - w / 2, y, w, h);
  c.fillStyle = "rgba(0,0,0,.08)"; c.fillRect(b.x - w / 2, y + h / 2, w, 1);
  c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#3b2410";
  const words = o.title.toUpperCase().split(" ");
  c.font = "800 7.5px system-ui, sans-serif";
  if (words.length > 1 && c.measureText(o.title.toUpperCase()).width > w - 6) {
    const half = Math.ceil(words.length / 2);
    c.fillText(words.slice(0, half).join(" "), b.x, y + 6.5, w - 4); c.fillText(words.slice(half).join(" "), b.x, y + 14, w - 4);
  } else c.fillText(o.title.toUpperCase(), b.x, y + h / 2 + 0.5, w - 4);
}
function drawBoard(c, o, t, alert) {
  const b = P(o.x, o.y, LIFT);
  c.fillStyle = "rgba(20,40,30,.2)"; c.beginPath(); c.ellipse(b.x + 8, b.y + 2, 22, 6, 0, 0, 7); c.fill();
  c.fillStyle = "#6b4527"; c.fillRect(b.x - 20, b.y - 34, 4, 34); c.fillRect(b.x + 16, b.y - 34, 4, 34);
  c.fillStyle = "#8a5a32"; c.fillRect(b.x - 22, b.y - 52, 44, 26);
  c.fillStyle = "#c79a64"; c.fillRect(b.x - 19, b.y - 49, 38, 20);
  const notes = [["#fff6e4", -15, -47, 0.08], ["#a9dbc0", -3, -46, -0.06], ["#fff0b0", 8, -48, 0.05]];
  for (const [col, x, y, r] of notes) { c.save(); c.translate(b.x + x + 5, b.y + y + 7); c.rotate(r); c.fillStyle = col; c.fillRect(-5, -7, 10, 13); c.fillStyle = "rgba(60,40,20,.45)"; c.fillRect(-3.5, -3, 7, 1); c.fillRect(-3.5, 0, 6, 1); c.fillStyle = "#e2574c"; c.beginPath(); c.arc(0, -6, 1.3, 0, 7); c.fill(); c.restore(); }
  c.fillStyle = "#b5562f"; c.beginPath(); c.moveTo(b.x - 26, b.y - 51); c.lineTo(b.x, b.y - 62); c.lineTo(b.x + 26, b.y - 51); c.closePath(); c.fill();
  c.font = "800 6px system-ui, sans-serif"; c.textAlign = "center"; c.fillStyle = "#fff0b0"; c.fillText("MISI", b.x, b.y - 54);
  if (alert) {
    const y = b.y - 74 - Math.abs(Math.sin(t * 4)) * 4;
    c.fillStyle = "#e0b84c"; c.strokeStyle = "#173f50"; c.lineWidth = 1.5; c.beginPath(); c.arc(b.x, y, 8, 0, 7); c.fill(); c.stroke();
    c.fillStyle = "#173f50"; c.font = "900 11px system-ui, sans-serif"; c.textBaseline = "middle"; c.fillText("!", b.x, y + 0.5);
  }
}
function drawMailbox(c, o, t) {
  const b = P(o.x, o.y, LIFT);
  c.fillStyle = "rgba(20,40,30,.18)"; c.beginPath(); c.ellipse(b.x + 4, b.y + 1, 7, 2.5, 0, 0, 7); c.fill();
  c.fillStyle = "#6b4527"; c.fillRect(b.x - 1.5, b.y - 18, 3, 18);
  c.fillStyle = "#c8443a"; c.beginPath(); c.moveTo(b.x - 8, b.y - 17); c.lineTo(b.x + 8, b.y - 17); c.lineTo(b.x + 8, b.y - 25); c.arc(b.x, b.y - 25, 8, 0, Math.PI, true); c.closePath(); c.fill();
  c.fillStyle = "#e0b84c"; c.fillRect(b.x + 7, b.y - 32 + Math.sin(t * 2) * 0.6, 2, 9); c.fillRect(b.x + 7, b.y - 32, 6, 4);
}
// rumpun bambu
function drawBamboo(c, o, t) {
  const b = P(o.x, o.y, LIFT), s = o.s;
  c.fillStyle = "rgba(20,40,30,.18)"; c.beginPath(); c.ellipse(b.x + 6, b.y + 1, 20 * s, 7 * s, 0, 0, 7); c.fill();
  for (let i = 0; i < 7; i++) {
    const dx = (i - 3) * 4 * s, h = (60 + (i % 3) * 16) * s, sw = Math.sin(t * 1.1 + i + o.x) * 3;
    c.strokeStyle = i % 2 ? "#6f9a3c" : "#7fae45"; c.lineWidth = 3 * s; c.lineCap = "round";
    c.beginPath(); c.moveTo(b.x + dx, b.y); c.quadraticCurveTo(b.x + dx + sw * 0.3, b.y - h * 0.6, b.x + dx + sw, b.y - h); c.stroke();
    c.strokeStyle = "rgba(60,90,30,.6)"; c.lineWidth = 1; for (let k = 0.25; k < 1; k += 0.22) { const y = b.y - h * k; c.beginPath(); c.moveTo(b.x + dx - 1.5 * s + sw * k, y); c.lineTo(b.x + dx + 1.5 * s + sw * k, y); c.stroke(); }
    c.fillStyle = "#5f9a3a"; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(b.x + dx + sw + (k - 1) * 7 * s, b.y - h + k * 6 * s, 8 * s, 2.5 * s, (k - 1) * 0.6, 0, 7); c.fill(); }
  }
}
// layangan Dika: (x,y) = tangan di dunia, terbang ke arah laut
function drawKite(c, ch, t) {
  const h = P(ch.x, ch.y, LIFT + 18), k = { x: h.x + 70 + Math.sin(t * 0.7) * 12, y: h.y - 120 + Math.sin(t * 1.1) * 10 };
  c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(h.x + 6, h.y); c.quadraticCurveTo(h.x + 50, h.y - 40, k.x, k.y + 14); c.stroke();
  c.save(); c.translate(k.x, k.y); c.rotate(Math.sin(t * 1.4) * 0.15);
  c.fillStyle = "#e2574c"; c.beginPath(); c.moveTo(0, -14); c.lineTo(11, 0); c.lineTo(0, 16); c.lineTo(-11, 0); c.closePath(); c.fill();
  c.fillStyle = "#fff6e4"; c.beginPath(); c.moveTo(0, -14); c.lineTo(11, 0); c.lineTo(0, 0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, 16); c.lineTo(-11, 0); c.lineTo(0, 0); c.closePath(); c.fill();
  c.strokeStyle = "#e0b84c"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 16);
  for (let i = 1; i <= 5; i++) c.lineTo(Math.sin(t * 5 + i) * 4, 16 + i * 6); c.stroke();
  c.restore();
}
function drawBench(c, o) {
  const b = P(o.x, o.y, LIFT);
  c.fillStyle = "rgba(20,40,30,.18)"; c.beginPath(); c.ellipse(b.x + 3, b.y + 1, 15, 5, 0, 0, 7); c.fill();
  const k = o.dir === "x" ? 1 : -1;
  c.fillStyle = "#5a3a20"; c.fillRect(b.x - 12, b.y - 7, 2.5, 7); c.fillRect(b.x + 9.5, b.y - 7, 2.5, 7);
  c.fillStyle = "#a8743f";
  c.beginPath(); c.moveTo(b.x - 14, b.y - 8 - k * 4); c.lineTo(b.x + 14, b.y - 8 + k * 4); c.lineTo(b.x + 14, b.y - 4 + k * 4); c.lineTo(b.x - 14, b.y - 4 - k * 4); c.fill();
  c.fillStyle = "#8f6036";
  c.beginPath(); c.moveTo(b.x - 14, b.y - 16 - k * 4); c.lineTo(b.x + 14, b.y - 16 + k * 4); c.lineTo(b.x + 14, b.y - 11 + k * 4); c.lineTo(b.x - 14, b.y - 11 - k * 4); c.fill();
}
function drawCrate(c, o) {
  const s = o.s || 1, b = { x0: o.x - 0.25 * s, x1: o.x + 0.25 * s, y0: o.y - 0.25 * s, y1: o.y + 0.25 * s };
  const z = LIFT, h = 16 * s;
  c.fillStyle = "#b8864a"; poly(c, quadOnFace("y", b, z, h, 0, 1, 0, 1)); c.fill();
  c.fillStyle = "#9a6c3a"; poly(c, quadOnFace("x", b, z, h, 0, 1, 0, 1)); c.fill();
  c.fillStyle = "#d4a364"; poly(c, [P(b.x0, b.y0, z + h), P(b.x1, b.y0, z + h), P(b.x1, b.y1, z + h), P(b.x0, b.y1, z + h)]); c.fill();
  c.strokeStyle = "#6e4628"; c.lineWidth = 1; for (const f of ["y", "x"]) { const q = quadOnFace(f, b, z, h, 0, 1, 0, 1); c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[2].x, q[2].y); c.stroke(); }
}
function drawBarrel(c, o) {
  const b = P(o.x, o.y, LIFT);
  c.fillStyle = "rgba(20,40,30,.18)"; c.beginPath(); c.ellipse(b.x + 4, b.y + 1, 10, 4, 0, 0, 7); c.fill();
  c.fillStyle = "#3f8fd0"; c.fillRect(b.x - 8, b.y - 18, 16, 18);
  c.fillStyle = "#2f6fa8"; c.fillRect(b.x + 2, b.y - 18, 6, 18);
  c.fillStyle = "#5aa6e0"; c.beginPath(); c.ellipse(b.x, b.y - 18, 8, 3.5, 0, 0, 7); c.fill();
}
function drawNet(c, o) {
  const a = P(o.x - 0.5, o.y, LIFT), b = P(o.x + 0.5, o.y, LIFT);
  c.fillStyle = "#6b4527"; c.fillRect(a.x - 1.5, a.y - 30, 3, 30); c.fillRect(b.x - 1.5, b.y - 30, 3, 30);
  c.strokeStyle = "rgba(60,80,70,.7)"; c.lineWidth = 0.8;
  for (let i = 0; i <= 8; i++) { const k = i / 8; c.beginPath(); c.moveTo(a.x + (b.x - a.x) * k, a.y - 28 + (b.y - a.y) * k); c.lineTo(a.x + (b.x - a.x) * k, a.y - 8 + (b.y - a.y) * k + Math.sin(k * 3.14) * 6); c.stroke(); }
  for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(a.x, a.y - 28 + j * 5); c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 22 + j * 6, b.x, b.y - 28 + j * 5); c.stroke(); }
  c.fillStyle = "#e2574c"; c.beginPath(); c.arc((a.x + b.x) / 2, (a.y + b.y) / 2 - 12, 3, 0, 7); c.fill();
}
function drawWell(c, o) {
  const b = P(o.x, o.y, LIFT);
  c.fillStyle = "rgba(20,40,30,.18)"; c.beginPath(); c.ellipse(b.x + 6, b.y + 2, 22, 9, 0, 0, 7); c.fill();
  c.fillStyle = "#8d9192"; c.beginPath(); c.ellipse(b.x, b.y - 2, 18, 9, 0, 0, Math.PI); c.fill(); c.fillRect(b.x - 18, b.y - 14, 36, 12);
  c.fillStyle = "#b2b6b4"; c.beginPath(); c.ellipse(b.x, b.y - 14, 18, 9, 0, 0, 7); c.fill();
  c.fillStyle = "#1f5a72"; c.beginPath(); c.ellipse(b.x, b.y - 14, 13, 6, 0, 0, 7); c.fill();
  c.fillStyle = "#6b4527"; c.fillRect(b.x - 16, b.y - 40, 3, 26); c.fillRect(b.x + 13, b.y - 40, 3, 26);
  c.fillStyle = "#b5562f"; c.beginPath(); c.moveTo(b.x - 22, b.y - 36); c.lineTo(b.x, b.y - 50); c.lineTo(b.x + 22, b.y - 36); c.closePath(); c.fill();
}
function drawBoat(c, o, t) {
  const bob = Math.sin(t * 1.5) * 1.5, roll = Math.sin(t * 1.1) * 0.03;
  const p = P(o.x, o.y);
  c.save(); c.translate(p.x, p.y + bob); c.rotate(roll);
  if (o.flip) c.scale(-1, 1); // sejajar dermaga yang memanjang ke utara
  // riak
  c.strokeStyle = `rgba(255,255,255,${0.3 + 0.2 * Math.sin(t * 2)})`; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 6, 60, 18, 0.46, 0, 7); c.stroke();
  // lambung (memanjang searah sumbu x → miring di layar)
  c.rotate(0.46);
  c.fillStyle = "#1f3f5a"; c.beginPath(); c.moveTo(-52, -6); c.quadraticCurveTo(-48, 14, 0, 14); c.quadraticCurveTo(48, 14, 60, -8); c.lineTo(-52, -6); c.fill();
  c.fillStyle = "#2f7a8c"; c.beginPath(); c.moveTo(-50, -10); c.lineTo(58, -12); c.quadraticCurveTo(46, 4, 0, 6); c.quadraticCurveTo(-46, 4, -50, -10); c.fill();
  c.fillStyle = "#e0b84c"; c.fillRect(-50, -12, 108, 3);
  c.fillStyle = "#c79a64"; c.beginPath(); c.ellipse(4, -10, 44, 8, 0, 0, 7); c.fill();
  // kabin kecil
  c.fillStyle = "#f3e7c9"; c.fillRect(-26, -32, 26, 20); c.fillStyle = "#e2574c"; c.fillRect(-29, -36, 32, 6);
  c.fillStyle = "#a9d6e5"; c.fillRect(-21, -27, 7, 7); c.fillRect(-11, -27, 7, 7);
  // tiang & bendera merah-putih
  c.fillStyle = "#6b4527"; c.fillRect(16, -62, 3, 52);
  c.fillStyle = "#e2342c"; c.fillRect(19, -62, 14, 5); c.fillStyle = "#ffffff"; c.fillRect(19, -57, 14, 5);
  c.restore();
  // tali tambat ke dermaga
  const tie = o.tie || { x: NW.DOCK.x0 + 3.5, y: NW.DOCK.y1 + 0.9 }, d = P(tie.x, tie.y, LIFT + 6);
  const rx = p.x + (o.flip ? 30 : -30);
  c.strokeStyle = "#d8c49a"; c.lineWidth = 1; c.beginPath(); c.moveTo(d.x, d.y - 10); c.quadraticCurveTo((d.x + rx) / 2, (d.y + p.y) / 2 + 6, rx, p.y - 14 + bob); c.stroke();
}

// ---------- Karakter ----------
// tinggi pijakan: daratan + papan dermaga + tinggi bukit (Bumbu 2: Bukit Pandang bisa didaki)
const groundZ = (x, y) => LIFT + (NW.tileAt(x, y) === NW.T.DOCK ? 4 : 0) + NW.heightAt(x, y);
// dir: 0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE (arah di layar)
const DIRV = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];
function drawCharacter(c, ch, t) {
  const b = P(ch.x, ch.y, ch.z !== undefined ? ch.z : groundZ(ch.x, ch.y));
  const st = ch.style, [fx, fy] = DIRV[ch.dir];
  const moving = ch.moving, ph = ch.walk;
  const bob = moving ? Math.abs(Math.sin(ph)) * 2.2 : Math.sin(t * 2.2 + (ch.seed || 0)) * 0.6;
  const back = fy < -0.1, side = Math.abs(fx) > 0.9;
  const sc = st.scale || 1;
  c.save(); c.translate(b.x, b.y); c.scale(sc, sc);
  // bayangan
  c.fillStyle = "rgba(15,35,30,.28)"; c.beginPath(); c.ellipse(1, 0, 10, 4, 0, 0, 7); c.fill();
  const y0 = -bob;
  // pamer ikan (Bumbu 1.2): lengan, ikan, dan ekspresi digambar modul NW.hold; tidak mengubah data apa pun
  const hd = ch.hold || null, HG = hd ? NW.hold.geom(hd, fx, fy, y0, t) : null;
  // joran tersandang (Bumbu 1.1): hanya bila tidak sedang memegang joran di tangan → tidak pernah ganda
  const bk = ch.rodSpec && !(ch.rod > 0.02) ? ch.rodSpec : null, bkSway = moving ? Math.sin(ph) : Math.sin(t * 2.2 + (ch.seed || 0)) * 0.25;
  if (bk && !back) NW.look.drawBackRod(c, bk, fx, y0, bkSway, false);
  // kaki
  const spread = 3.6 * (1 - 0.55 * Math.abs(fx)) + (hd ? hd.crouch * 0.7 : 0), swing = moving ? Math.sin(ph) * 3.6 : 0;
  const leg = (x, lift) => { c.fillStyle = st.pants; c.fillRect(x - 2.4, y0 - 10 - lift, 4.8, 9); c.fillStyle = "#3a2a20"; c.fillRect(x - 2.6, y0 - 2 - lift, 5.2, 2.4); };
  const l1 = -spread + fx * swing, l2 = spread - fx * swing;
  const lift1 = moving ? Math.max(0, Math.sin(ph)) * 1.5 : 0, lift2 = moving ? Math.max(0, -Math.sin(ph)) * 1.5 : 0;
  if (ch.sit && !moving) { // Bumbu 2: duduk di bangku — paha ke depan, betis menjuntai, badan turun
    for (const lx of fx >= 0 ? [-3, 3] : [3, -3]) {
      c.fillStyle = st.pants; c.fillRect(lx - 2.4 + fx * 2, y0 - 9, 4.8, 4.2); c.fillRect(lx - 2.2 + fx * 5.5 + fy * 0.5, y0 - 7, 4.4, 5.5);
      c.fillStyle = "#3a2a20"; c.fillRect(lx - 2.4 + fx * 5.5 + fy * 0.5, y0 - 2, 4.8, 2.2);
    }
    c.translate(0, 6);
  } else if (fx >= 0) { leg(l1, lift1); leg(l2, lift2); } else { leg(l2, lift2); leg(l1, lift1); }
  if (hd) { // badan merendah & condong menahan beban (kaki tetap menapak)
    const lean = hd.p.lean * (Math.abs(fx) > 0.1 ? -Math.sign(fx) : 0) + (hd.p.id === "legenda" ? Math.sin(t * 17) * 0.05 : 0);
    c.translate(0, hd.crouch); if (lean) c.rotate(lean);
  }
  // lengan belakang
  const armSwing = moving ? -Math.sin(ph) * 3 : 0;
  const arm = (x, sw) => { c.strokeStyle = st.shirt; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(x, y0 - 22); c.lineTo(x + fx * sw * 0.8, y0 - 13 + Math.abs(sw) * 0.2); c.stroke(); c.fillStyle = st.skin; c.beginPath(); c.arc(x + fx * sw * 0.8, y0 - 12.5, 2.1, 0, 7); c.fill(); };
  if (!side && !hd) { arm(-7.5, armSwing); }
  // ikan didekap di depan badan, dilihat dari belakang: dua ujungnya menyembul di sisi badan
  if (hd && HG.behind) NW.hold.drawFishBody(c, hd, HG);
  if (st.pack && !back) { c.fillStyle = st.pack; c.fillRect(-fx * 6 - 5.5, y0 - 21, 11, 11); c.fillStyle = shade(st.pack, -0.25); c.fillRect(-fx * 6 - 5.5, y0 - 13, 11, 2); }
  // badan
  c.fillStyle = st.shirt;
  c.beginPath(); c.moveTo(-7, y0 - 9); c.lineTo(-7.5, y0 - 21); c.quadraticCurveTo(0, y0 - 25, 7.5, y0 - 21); c.lineTo(7, y0 - 9); c.closePath(); c.fill();
  c.fillStyle = shade(st.shirt, -0.15); c.fillRect(-7, y0 - 11, 14, 2.4);
  if (st.apron) { c.fillStyle = st.apron; c.fillRect(-5, y0 - 18, 10, 9); }
  if (!back && st.collar) { c.fillStyle = st.collar; c.beginPath(); c.moveTo(-3, y0 - 22); c.lineTo(0, y0 - 18); c.lineTo(3, y0 - 22); c.fill(); }
  if (st.sash) { c.strokeStyle = st.sash; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, y0 - 22); c.lineTo(5.5, y0 - 10.5); c.stroke(); if (st.sashLine) { c.strokeStyle = st.sashLine; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-6, y0 - 21); c.lineTo(5.5, y0 - 9.5); c.stroke(); } }
  if (st.pack && back) { c.fillStyle = st.pack; c.fillRect(-5.5, y0 - 21, 11, 11); c.fillStyle = shade(st.pack, -0.25); c.fillRect(-5.5, y0 - 13, 11, 2); c.fillStyle = shade(st.pack, 0.2); c.fillRect(-3.5, y0 - 19, 7, 3); }
  // lengan depan
  if (hd) NW.hold.drawArms(c, hd, HG, st, fx, y0);
  else if (side) arm(fx * -1.5, armSwing); else arm(7.5, -armSwing);
  // ikan di depan badan (tidak sedang di atas kepala): sebelum kepala
  if (hd && !HG.behind && !hd.p.up) NW.hold.drawFishBody(c, hd, HG);
  // properti aktivitas
  if (ch.prop === "net") {
    const w = Math.sin(t * 6) * 1.5;
    c.strokeStyle = "rgba(70,90,80,.9)"; c.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-8 + i * 5, y0 - 15 + w); c.lineTo(-10 + i * 5, y0 - 4); c.stroke(); }
    for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(-9, y0 - 13 + j * 3.5 + w * 0.5); c.lineTo(9, y0 - 13 + j * 3.5 - w * 0.5); c.stroke(); }
    c.fillStyle = "#e2574c"; c.beginPath(); c.arc(9, y0 - 6, 1.6, 0, 7); c.fill();
  } else if (ch.prop === "basket") {
    c.fillStyle = "#b8864a"; c.fillRect(fx * 6 - 6, y0 - 15, 12, 7); c.fillStyle = "#8c9a8a"; c.beginPath(); c.ellipse(fx * 6, y0 - 15, 5, 2, 0, 0, 7); c.fill();
  } else if (ch.prop === "binoc" && !moving) { // teropong (Nala)
    c.fillStyle = "#2c3a40"; c.fillRect(fx * 3 - 4, y0 - 32, 3.4, 4); c.fillRect(fx * 3 + 0.6, y0 - 32, 3.4, 4);
    c.fillStyle = "#9fd3e6"; c.fillRect(fx * 3 - 3.6, y0 - 31.5, 2.6, 1.4); c.fillRect(fx * 3 + 1, y0 - 31.5, 2.6, 1.4);
  } else if (ch.prop === "paddle") { // dayung (Pak Raka)
    c.strokeStyle = "#8a5a32"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(fx * 7 + 3, y0 - 26); c.lineTo(fx * 7 + 5, y0 + 2); c.stroke();
    c.fillStyle = "#a8743f"; c.beginPath(); c.ellipse(fx * 7 + 5, y0 - 1, 2.6, 5, 0.1, 0, 7); c.fill();
  } else if (ch.prop === "bucket") { // ember pakan keramba (Bu Maya)
    c.fillStyle = "#3f8fd0"; c.fillRect(fx * 7 - 4, y0 - 13, 8, 7); c.fillStyle = "#e6d29a"; c.beginPath(); c.ellipse(fx * 7, y0 - 13, 4, 1.4, 0, 0, 7); c.fill();
  } else if (ch.prop === "stone") { // batu ceper siap dilempar
    const k = (Math.sin(t * 2.6 + (ch.seed || 0)) + 1) / 2; c.fillStyle = "#9aa3a8"; c.beginPath(); c.ellipse(fx * (8 + k * 4), y0 - 16 - k * 6, 2.2, 1.3, 0, 0, 7); c.fill();
  } else if (ch.prop === "broom") {
    c.strokeStyle = "#8a5a32"; c.lineWidth = 1.6; const sw = Math.sin(t * 5) * 4; c.beginPath(); c.moveTo(fx * 5, y0 - 18); c.lineTo(fx * 10 + sw, y0 + 1); c.stroke();
    c.fillStyle = "#d9b45e"; c.beginPath(); c.moveTo(fx * 10 + sw - 4, y0 + 1); c.lineTo(fx * 10 + sw + 4, y0 + 1); c.lineTo(fx * 10 + sw, y0 - 5); c.fill();
  }
  // joran (saat bersiap mancing)
  if (ch.rod > 0) {
    const k = ch.rod;
    c.strokeStyle = ch.rodSpec ? ch.rodSpec.blank : "#c9a46a"; c.lineWidth = 2; c.beginPath(); c.moveTo(fx * 7, y0 - 14); c.lineTo(fx * (7 + 26 * k), y0 - 14 - 34 * k); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(fx * (7 + 26 * k), y0 - 14 - 34 * k); c.lineTo(fx * (9 + 30 * k), y0 - 4); c.stroke();
  }
  // kepala
  const hy = y0 - 30;
  const pony = () => { const sw = moving ? Math.sin(ph) * 2 : Math.sin(t * 2 + (ch.seed || 0)) * 0.8; c.fillStyle = st.hair; c.beginPath(); c.ellipse((back ? 0 : -fx * 6) + sw, hy + (back ? 3 : 1), 2.6, 6, 0.25 * (fx || 0.4), 0, 7); c.fill(); };
  if (st.hat === "pony" && !back) pony(); // kuncir di belakang kepala
  c.fillStyle = st.skin; c.beginPath(); c.arc(0, hy, 7.6, 0, 7); c.fill();
  if (st.hat !== "scarf") {
    c.fillStyle = st.hair;
    if (back) { c.beginPath(); c.arc(0, hy - 0.5, 7.8, 0, 7); c.fill(); }
    else { c.beginPath(); c.arc(0, hy - 2, 7.8, Math.PI * 1.05, Math.PI * 1.95); c.fill(); }
  }
  if (!back && hd && NW.hold.drawFace(c, hd, fx * 2.8, hy, side, fx, t)) { /* ekspresi pamer ikan */ }
  else if (!back) {
    const ex = fx * 2.8;
    c.fillStyle = "#2a1d14";
    if (side) { c.beginPath(); c.arc(fx * 4, hy + 0.5, 1.2, 0, 7); c.fill(); }
    else { c.beginPath(); c.arc(-2.8 + ex, hy + 0.5, 1.2, 0, 7); c.arc(2.8 + ex, hy + 0.5, 1.2, 0, 7); c.fill(); }
    c.fillStyle = "rgba(240,120,110,.35)"; c.beginPath(); c.arc(-4.5 + ex, hy + 3.2, 1.6, 0, 7); c.arc(4.5 + ex, hy + 3.2, 1.6, 0, 7); c.fill();
    c.strokeStyle = "#6b3a2a"; c.lineWidth = 0.9; c.beginPath(); c.arc(ex * 1.1, hy + 3.2, 1.6, 0.2, Math.PI - 0.2); c.stroke();
  }
  // topi / kerudung
  if (st.hat === "caping") {
    c.fillStyle = st.hatCol || "#e3be7a";
    c.beginPath(); c.ellipse(0, hy - 4.5, 14, 4.6, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-13, hy - 5); c.quadraticCurveTo(0, hy - 19, 13, hy - 5); c.fill();
    c.strokeStyle = shade(st.hatCol || "#e3be7a", -0.25); c.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, hy - 14.5); c.lineTo(i * 5.5, hy - 5); c.stroke(); }
  } else if (st.hat === "cap") {
    c.fillStyle = st.hatCol; c.beginPath(); c.arc(0, hy - 3, 7.8, Math.PI, 0); c.fill();
    c.fillRect(back ? -fx * 2 - 4 : fx * 4 - 4, hy - 3.5, 8 + Math.abs(fx) * 3, 2.4);
  } else if (st.hat === "fedora") { // topi lebar (Pak Raka, pemandu)
    c.fillStyle = st.hatCol; c.beginPath(); c.ellipse(0, hy - 5.5, 11.5, 3.6, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-6.5, hy - 5.5); c.lineTo(-5.5, hy - 12.5); c.quadraticCurveTo(0, hy - 14.5, 5.5, hy - 12.5); c.lineTo(6.5, hy - 5.5); c.closePath(); c.fill();
    c.fillStyle = st.hatBand || "#5a3a20"; c.fillRect(-6.3, hy - 8.4, 12.6, 2);
  } else if (st.hat === "bun") { // rambut disanggul (Bu Maya)
    c.fillStyle = st.hair; c.beginPath(); c.arc(back ? 0 : -fx * 4, hy - 7.5, 3.8, 0, 7); c.fill();
    if (st.hatCol) { c.fillStyle = st.hatCol; c.fillRect((back ? 0 : -fx * 4) - 3.6, hy - 6.4, 7.2, 1.4); }
  } else if (st.hat === "pony") { // kuncir & bandana (Nala, penjelajah muda)
    if (back) pony();
    c.fillStyle = st.hatCol; c.beginPath(); c.arc(0, hy - 2.5, 7.9, Math.PI * 1.08, Math.PI * 1.92); c.lineTo(5, hy - 4.2); c.lineTo(-5, hy - 4.2); c.closePath(); c.fill();
  } else if (st.hat === "scarf") {
    c.fillStyle = st.hatCol;
    c.beginPath(); c.arc(0, hy - 1, 9, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(8.5, hy + 8); c.quadraticCurveTo(0, hy + 12, -8.5, hy + 8); c.closePath(); c.fill();
    if (!back) {
      c.fillStyle = st.skin; c.beginPath(); c.ellipse(fx * 1.5, hy + 1.5, 5.4, 6.2, 0, 0, 7); c.fill();
      const ex = fx * 2.4; c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(-2.4 + ex, hy + 0.8, 1.1, 0, 7); c.arc(2.4 + ex, hy + 0.8, 1.1, 0, 7); c.fill();
      c.strokeStyle = "#6b3a2a"; c.lineWidth = 0.9; c.beginPath(); c.arc(ex, hy + 3.6, 1.5, 0.2, Math.PI - 0.2); c.stroke();
    }
  }
  if (st.towel && !back) { c.fillStyle = st.towel; c.fillRect(-7.5, y0 - 23, 15, 3.2); }
  if (bk && back) NW.look.drawBackRod(c, bk, fx, y0, bkSway, true); // membelakangi kamera: joran di depan badan
  if (hd) { if (hd.p.up) NW.hold.drawFishBody(c, hd, HG); NW.hold.drawFx(c, hd, HG, y0, hy, t); } // ikan di atas kepala selalu paling depan
  c.restore();
}

// ---------- Hewan & ambience ----------
function drawBird(c, bd, t) {
  const p = P(bd.x, bd.y, LIFT + bd.z);
  const g = P(bd.x, bd.y, LIFT);
  const flap = Math.sin(t * 9 + bd.ph) * 5;
  return { draw: () => {
    c.strokeStyle = "#f4f4f0"; c.lineWidth = 2; c.lineCap = "round";
    c.beginPath(); c.moveTo(p.x - 9, p.y - flap); c.quadraticCurveTo(p.x - 4, p.y - 4, p.x, p.y); c.quadraticCurveTo(p.x + 4, p.y - 4, p.x + 9, p.y - flap); c.stroke();
    c.fillStyle = "#e9e9e2"; c.beginPath(); c.ellipse(p.x, p.y + 0.5, 3, 1.8, 0, 0, 7); c.fill();
  }, shadow: () => { if (NW.isLandT(NW.tileAt(bd.x, bd.y))) { c.fillStyle = "rgba(20,40,30,.12)"; c.beginPath(); c.ellipse(g.x + 12, g.y, 6, 2, 0, 0, 7); c.fill(); } } };
}
function drawJump(c, j, t) {
  const k = j.t / j.dur, p0 = P(j.x, j.y), h = Math.sin(k * Math.PI) * 24;
  if (k < 1) {
    c.save(); c.translate(p0.x + (k - 0.5) * 22, p0.y - h); c.rotate((k - 0.5) * 2.4);
    c.fillStyle = j.col; c.beginPath(); c.ellipse(0, 0, 7, 3, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-6, 0); c.lineTo(-10, -3); c.lineTo(-10, 3); c.fill();
    c.restore();
  }
  for (const r of [0, 0.5]) {
    const rk = (k - r) * 1.2; if (rk < 0 || rk > 1) continue;
    c.strokeStyle = `rgba(255,255,255,${0.6 * (1 - rk)})`; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(p0.x + (r ? 11 : -11), p0.y, 4 + rk * 14, (4 + rk * 14) * 0.4, 0, 0, 7); c.stroke();
  }
}
function drawButterfly(c, bf, t) {
  const p = P(bf.x, bf.y, LIFT + 14 + Math.sin(t * 3 + bf.ph) * 5), f = Math.abs(Math.sin(t * 14 + bf.ph));
  c.fillStyle = bf.col;
  c.beginPath(); c.ellipse(p.x - 3 * f, p.y, 3 * f + 0.5, 2.4, -0.4, 0, 7); c.ellipse(p.x + 3 * f, p.y, 3 * f + 0.5, 2.4, 0.4, 0, 7); c.fill();
}

// Titik cahaya malam (dipanggil dengan composite 'lighter')
function lightAt(c, x, y, z, r, col, a) {
  const p = P(x, y, LIFT + z);
  const g = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.beginPath(); c.ellipse(p.x, p.y, r, r * 0.7, 0, 0, 7); c.fill();
}

Object.assign(NW, {
  P, LIFT, COL, mix, shade, rgba, poly, buildTerrain, drawTerrain, drawWater, getTerrainScale: () => terrainWant, terrainInfo: () => ({ area: terrainArea, scale: terrainScale, w: terrain ? terrain.width : 0, h: terrain ? terrain.height : 0 }),
  drawHouse, drawShop, drawMarketBack, drawMarketFront, drawPalm, drawTree, drawBush, drawRock, drawLamp, drawSign,
  groundZ, drawBench, drawBoard, drawMailbox, drawKite, drawBamboo, drawCrate, drawBarrel, drawNet, drawWell, drawBoat, drawCharacter, drawBird, drawJump, drawButterfly, lightAt, DIRV,
});
})();
