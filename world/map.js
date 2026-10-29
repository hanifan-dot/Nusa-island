// =========================================================
//  NUSA ISLAND — Island Life: peta Muara Kampung (data + collision)
//  Koordinat dunia dalam satuan tile (x ke kanan-bawah, y ke kiri-bawah)
// =========================================================
window.NW = window.NW || {};
(() => {
"use strict";

const T = { DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, PATH: 4, DOCK: 5 };
const MW = 40, MH = 40, CX = 19, CY = 19;
const TW = 64, TH = 32; // ukuran tile isometrik (px)

// RNG ber-seed
function rng(seed) {
  let s = seed >>> 0 || 7;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000000) / 1000000; };
}
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

// ---------- Bentuk pulau ----------
function islandD(x, y) {
  const dx = (x - CX) / 13.5, dy = (y - CY) / 12.5, a = Math.atan2(dy, dx);
  const n = 1 + 0.07 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 5 + 2) + 0.03 * Math.sin(a * 9);
  return Math.hypot(dx, dy) / n;
}

const tiles = new Uint8Array(MW * MH);
const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? T.DEEP : tiles[(y | 0) * MW + (x | 0)]);
const setTile = (x, y, t) => { if (x >= 0 && y >= 0 && x < MW && y < MH) tiles[y * MW + x] = t; };
const isLandT = (t) => t >= T.SAND;

for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const d = islandD(x + 0.5, y + 0.5);
  setTile(x, y, d < 0.8 ? T.GRASS : d < 1 ? T.SAND : d < 1.14 ? T.SHALLOW : T.DEEP);
}

// Garis pantai timur di baris dermaga
const DOCK_Y = 20;
let E = CX; while (isLandT(tileAt(E, DOCK_Y))) E++;
const SHORE_E = E; // tile air pertama di timur

// ---------- Jalan setapak ----------
function pathRect(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (isLandT(tileAt(x, y))) setTile(x, y, T.PATH); }
pathRect(8, 20, E - 1, 20);          // jalan utama barat–timur
pathRect(18, 10, 18, 27);            // jalan utara–selatan
pathRect(E - 5, 21, E - 5, 23);      // cabang ke pintu toko
pathRect(10, 15, 10, 19);            // ke rumah utara-barat
pathRect(15, 12, 17, 12);            // ke rumah utara
pathRect(16, 25, 17, 25);            // ke rumah Pak Darto
pathRect(11, 21, 11, 23);            // ke rumah selatan-barat

// ---------- Dermaga ----------
const DOCK = { x0: E - 2, x1: E + 6, y0: DOCK_Y, y1: DOCK_Y + 1 };
for (let y = DOCK.y0; y <= DOCK.y1; y++) for (let x = DOCK.x0; x <= DOCK.x1; x++) setTile(x, y, T.DOCK);

// ---------- Bangunan ----------
// x0,y0,x1,y1 = tapak (tile). h = tinggi dinding (px). door: sisi pintu ('x' = sisi kanan-bawah, 'y' = sisi kiri-bawah)
const buildings = [
  { id: "pasar", kind: "market", x0: E - 10, y0: 17, x1: E - 6, y1: 19, h: 34, name: "Pasar Ikan Bu Sari" },
  { id: "toko", kind: "shop", x0: E - 9, y0: 22, x1: E - 6, y1: 24.5, h: 44, door: "x", name: "Toko Pancing Pak Bono", roof: "#3d6f8f", wall: "#f3e2bd" },
  { id: "rumah1", kind: "house", x0: 8.5, y0: 12, x1: 11.5, y1: 14.5, h: 34, door: "y", stilts: 14, roof: "#b5562f", wall: "#d9a66b", name: "Rumahku", mine: true },
  { id: "rumah2", kind: "house", x0: 13, y0: 24, x1: 15.5, y1: 26.5, h: 36, door: "x", roof: "#c2603b", wall: "#efd9b0", name: "Rumah Pak Darto" },
  { id: "rumah3", kind: "house", x0: 8, y0: 23.5, x1: 10.5, y1: 25.5, h: 34, door: "x", stilts: 12, roof: "#8f4a2c", wall: "#c99a62", name: "Rumah Bu Sari" },
  { id: "rumah4", kind: "house", x0: 13.5, y0: 9, x1: 16.5, y1: 11.5, h: 36, door: "y", roof: "#2f6b58", wall: "#f1e6cf", name: "Rumah Dika" },
];

// ---------- Interaksi tetap ----------
const pasar = buildings[0], toko = buildings[1];
const SPOT = { x: DOCK.x1 + 0.55, y: DOCK.y0 + 1.0 }; // ujung dermaga
const BOAT = { x: E + 3.2, y: DOCK.y1 + 2.4 };
const points = [
  { id: "spot", x: SPOT.x - 0.6, y: SPOT.y, r: 1.3, icon: "🎣", label: "Mancing" },
  { id: "boat", x: BOAT.x, y: DOCK.y1 + 0.75, r: 1.15, icon: "⛵", label: "Kapal" },
  { id: "pasar", x: (pasar.x0 + pasar.x1) / 2, y: pasar.y1 + 0.65, r: 1.6, icon: "🏪", label: "Pasar" },
  { id: "toko", x: toko.x1 + 0.6, y: (toko.y0 + toko.y1) / 2, r: 1.1, icon: "🛠️", label: "Toko" },
  { id: "rumah2", x: 15.5 + 0.6, y: 25.25, r: 0.9, icon: "🚪", label: "Ketuk", owner: "darto" },
  { id: "rumah3", x: 11.5, y: 24.5, r: 0.8, icon: "🚪", label: "Ketuk", owner: "sari" },
  { id: "rumah4", x: 14.46, y: 12.15, r: 0.8, icon: "🚪", label: "Ketuk", owner: "dika" },
  { id: "home", x: 9.46, y: 15.5, r: 0.95, icon: "🏠", label: "Masuk" },
  { id: "board", x: 20.3, y: 19.95, r: 0.95, icon: "📋", label: "Misi" },
];

// ---------- Jaringan jalan untuk NPC (node + sambungan) ----------
const NAV = {
  A: [8.8, 20.5], B: [10.5, 20.5], C: [11.5, 20.5], D: [18.5, 20.5], SF: [E - 8, 20.5], F: [E - 4.5, 20.5], G: [E - 1.5, 20.5],
  DOCKF: [E + 2.4, 20.4], DOCKE: [E + 5.2, 20.6], J: [18.5, 12.5], K: [18.5, 17.6], L: [18.5, 25.3], M: [18.5, 27.3],
  N2: [10.5, 17.4], N: [10.5, 15.6], R1: [9.5, 15.5], O: [11.5, 23.5], R3: [11.5, 24.5], R2: [16.2, 25.3], P: [15.5, 12.5], R4: [14.46, 12.2],
  Q: [E - 4.6, 23.2], PARK: [16.3, 17.65], BENCH: [15.8, 16.45], WELL: [11.75, 17.55], NET: [12.3, 27.65], BEACH: [19.4, 29.1],
  SE: [E - 5.55, 18.3], STALL: [E - 7.2, 18.3],
};
const NAV_EDGES = [["A", "B"], ["B", "C"], ["C", "D"], ["D", "SF"], ["SF", "F"], ["F", "G"], ["G", "DOCKF"], ["DOCKF", "DOCKE"],
  ["J", "K"], ["K", "D"], ["D", "L"], ["L", "M"], ["B", "N2"], ["N2", "N"], ["N", "R1"], ["C", "O"], ["O", "R3"], ["L", "R2"],
  ["J", "P"], ["P", "R4"], ["F", "Q"], ["K", "PARK"], ["PARK", "BENCH"], ["N2", "WELL"], ["M", "NET"], ["M", "BEACH"], ["F", "SE"], ["SE", "STALL"]];
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
const nearNav = (x, y, pad) => NAV_EDGES.some(([a, b]) => segDist(x, y, NAV[a][0], NAV[a][1], NAV[b][0], NAV[b][1]) < pad);

// Papan nama
const signs = [
  { x: E - 1.6, y: 19.3, title: "Dermaga Muara", text: "Titik mancing ada di ujung dermaga. Kapal di sebelah dermaga bisa membawamu ke pulau lain." },
  { x: 19.3, y: 21.6, title: "Selamat Datang", text: "Muara Kampung — kampung nelayan kecil di tepi muara. Pasar di utara jalan, toko pancing di selatan, dermaga di timur." },
  { x: 15.2, y: 13.6, title: "Taman Kampung", text: "Tempat warga bersantai sore hari. Jangan injak bunga Bu Sari, ya!" },
  { x: 10.8, y: 19.3, title: "Jalan Nelayan", text: "Ke timur: Pasar & Dermaga. Ke utara: Taman. Ke selatan: rumah Pak Darto." },
];
signs.forEach((s, i) => points.push({ id: "sign" + i, x: s.x + 0.45, y: s.y + 0.45, r: 0.85, icon: "📜", label: "Baca", sign: s }));

// Taman (dekorasi datar + objek)
const PARK = { x0: 14, y0: 14, x1: 17, y1: 17 };
const flowerBeds = [
  { x0: 14.3, y0: 14.3, x1: 15.6, y1: 15.2 }, { x0: 16.2, y0: 16.1, x1: 17.4, y1: 17.0 }, { x0: 14.3, y0: 16.3, x1: 15.2, y1: 17.3 },
];

// ---------- Objek alam ----------
const objects = []; // {kind, x, y, ...}
const solids = [];  // collision: {x,y,r} lingkaran atau {x0,y0,x1,y1} kotak

function nearAny(x, y, pad) {
  for (const b of buildings) if (x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad) return true;
  for (const p of points) if (Math.hypot(x - p.x, y - p.y) < pad + 0.6) return true;
  for (const o of objects) if (Math.hypot(x - o.x, y - o.y) < pad + 0.5) return true;
  if (x > PARK.x0 - 0.3 && x < PARK.x1 + 0.6 && y > PARK.y0 - 0.3 && y < PARK.y1 + 0.6) return true;
  return false;
}
function nearPath(x, y) {
  if (nearNav(x, y, 0.75)) return true; // jalur NPC dibiarkan kosong
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tileAt(Math.floor(x + dx * 0.6), Math.floor(y + dy * 0.6)); if (t === T.PATH || t === T.DOCK) return true; }
  return false;
}
const R = rng(20261029);
// pohon kelapa di pasir
for (let i = 0; i < 900 && objects.filter((o) => o.kind === "palm").length < 34; i++) {
  const x = 1 + R() * (MW - 2), y = 1 + R() * (MH - 2);
  if (tileAt(x, y) !== T.SAND || nearPath(x, y) || nearAny(x, y, 1.0)) continue;
  if (y > DOCK.y0 - 2.5 && y < DOCK.y1 + 3.5 && x > E - 4) continue;
  objects.push({ kind: "palm", x, y, h: 70 + R() * 30, lean: (R() - 0.5) * 0.9, ph: R() * 6 });
}
// pohon rindang & semak di rumput
for (let i = 0; i < 900 && objects.filter((o) => o.kind === "tree").length < 10; i++) {
  const x = 2 + R() * (MW - 4), y = 2 + R() * (MH - 4);
  if (tileAt(x, y) !== T.GRASS || nearPath(x, y) || nearAny(x, y, 1.9)) continue;
  objects.push({ kind: "tree", x, y, s: 0.85 + R() * 0.35, hue: R() });
}
for (let i = 0; i < 900 && objects.filter((o) => o.kind === "bush").length < 22; i++) {
  const x = 2 + R() * (MW - 4), y = 2 + R() * (MH - 4);
  if (tileAt(x, y) !== T.GRASS || nearPath(x, y) || nearAny(x, y, 0.7)) continue;
  objects.push({ kind: "bush", x, y, s: 0.7 + R() * 0.5, flowers: R() < 0.4 });
}
for (let i = 0; i < 900 && objects.filter((o) => o.kind === "rock").length < 12; i++) {
  const x = 1 + R() * (MW - 2), y = 1 + R() * (MH - 2);
  if (tileAt(x, y) !== T.SAND || nearPath(x, y) || nearAny(x, y, 0.8)) continue;
  objects.push({ kind: "rock", x, y, s: 0.6 + R() * 0.7 });
}
// batu di air dangkal
for (let i = 0; i < 300 && objects.filter((o) => o.kind === "searock").length < 6; i++) {
  const x = 1 + R() * (MW - 2), y = 1 + R() * (MH - 2);
  if (tileAt(x, y) !== T.SHALLOW || (y > DOCK.y0 - 2 && y < DOCK.y1 + 5 && x > E - 2)) continue;
  objects.push({ kind: "searock", x, y, s: 0.7 + R() * 0.6 });
}
// taman
objects.push({ kind: "tree", x: 16.6, y: 14.6, s: 1.25, hue: 0.3 });
objects.push({ kind: "bench", x: 15.2, y: 15.9, dir: "x" });
objects.push({ kind: "bench", x: 16.0, y: 15.0, dir: "y" });
// lampu jalan
const lamps = [[12.5, 19.5], [17.5, 21.5], [E - 3.5, 19.5], [17.4, 13.6], [E + 6.4, DOCK.y0 - 0.1], [17.5, 26.0]];
lamps.forEach(([x, y]) => objects.push({ kind: "lamp", x, y }));
// perabot sekitar
objects.push({ kind: "crate", x: E - 0.6, y: 21.7 });
objects.push({ kind: "crate", x: E - 1.1, y: 22.1, s: 0.8 });
objects.push({ kind: "net", x: 12.2, y: 26.9 });
objects.push({ kind: "barrel", x: E - 5.7, y: 19.7 });
objects.push({ kind: "well", x: 12.6, y: 16.8 });
signs.forEach((s) => objects.push({ kind: "sign", x: s.x, y: s.y, title: s.title }));
objects.push({ kind: "board", x: 20.3, y: 19.25 });
objects.push({ kind: "mailbox", x: 8.35, y: 15.35 });
objects.push({ kind: "boat", x: BOAT.x, y: BOAT.y });

// collision objek
for (const o of objects) {
  if (o.kind === "palm") solids.push({ x: o.x, y: o.y, r: 0.22 });
  else if (o.kind === "tree") solids.push({ x: o.x, y: o.y, r: 0.38 * o.s });
  else if (o.kind === "bush") solids.push({ x: o.x, y: o.y, r: 0.3 * o.s });
  else if (o.kind === "rock") solids.push({ x: o.x, y: o.y, r: 0.28 * o.s });
  else if (o.kind === "lamp" || o.kind === "sign" || o.kind === "mailbox") solids.push({ x: o.x, y: o.y, r: 0.16 });
  else if (o.kind === "board") solids.push({ x: o.x, y: o.y, r: 0.3 });
  else if (o.kind === "crate" || o.kind === "barrel") solids.push({ x: o.x, y: o.y, r: 0.3 });
  else if (o.kind === "well") solids.push({ x: o.x, y: o.y, r: 0.5 });
  else if (o.kind === "bench") solids.push({ x: o.x, y: o.y, r: 0.35 });
}
for (const b of buildings) solids.push({ x0: b.x0 + 0.02, y0: b.y0 + 0.02, x1: b.x1 - 0.02, y1: b.y1 - 0.02 });
for (const f of flowerBeds) solids.push(f);

// ---------- Collision ----------
function walkable(x, y, r = 0.22) {
  const probes = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]];
  for (const [dx, dy] of probes) if (!isLandT(tileAt(Math.floor(x + dx), Math.floor(y + dy)))) return false;
  for (const s of solids) {
    if (s.r !== undefined) { if (Math.hypot(x - s.x, y - s.y) < s.r + r * 0.8) return false; }
    else if (x > s.x0 - r * 0.8 && x < s.x1 + r * 0.8 && y > s.y0 - r * 0.8 && y < s.y1 + r * 0.8) return false;
  }
  return true;
}

// Tepi pantai (untuk buih ombak): sisi tile darat yang berbatasan dengan air
const shoreEdges = [];
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const t = tileAt(x, y); if (!isLandT(t) || t === T.DOCK) continue;
  if (!isLandT(tileAt(x + 1, y))) shoreEdges.push({ ax: x + 1, ay: y, bx: x + 1, by: y + 1, nx: 1, ny: 0 });
  if (!isLandT(tileAt(x - 1, y))) shoreEdges.push({ ax: x, ay: y, bx: x, by: y + 1, nx: -1, ny: 0 });
  if (!isLandT(tileAt(x, y + 1))) shoreEdges.push({ ax: x, ay: y + 1, bx: x + 1, by: y + 1, nx: 0, ny: 1 });
  if (!isLandT(tileAt(x, y - 1))) shoreEdges.push({ ax: x, ay: y, bx: x + 1, by: y, nx: 0, ny: -1 });
}

// Titik awal pemain
const START = { x: 19.5, y: 20.6 };

Object.assign(NW, {
  T, MW, MH, TW, TH, tiles, tileAt, isLandT, hash2, rng, islandD, DOCK, SPOT, BOAT, SHORE_E, START,
  buildings, objects, points, signs, NAV, NAV_EDGES, flowerBeds, PARK, lamps, solids, walkable, shoreEdges,
  // konversi tile → piksel dunia (sebelum kamera)
  iso: (x, y) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 }),
});
})();
