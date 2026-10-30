// =========================================================
//  NUSA ISLAND — Bumbu 2.4: peta PELABUHAN SELAT SUNDA (data + collision)
//  Pelabuhan nelayan di tepi selat: laut & kolam pelabuhan di barat (sisi kiri-atas
//  layar), daratan di timur. Dermaga kayu utama menjorok ke laut, dermaga kecil
//  berisi perahu warga, pasar ikan, gudang peralatan, warung kopi, mercusuar di
//  tanjung utara, dan pantai berbatu di selatan.
//  Koordinat dunia dalam tile (x ke kanan-bawah, y ke kiri-bawah layar).
// =========================================================
(() => {
"use strict";
const { T, hash2, rng } = NW;
const MW = 40, MH = 40;

// ---------- Garis pantai ----------
// x < shoreX(y) = laut. Tanjung kecil di utara (mercusuar), pantai berbatu di selatan.
const shoreX = (y) => 15.6 + 1.0 * Math.sin(y * 0.31 + 0.4) + 0.5 * Math.sin(y * 0.93 + 1.7) - 3.4 * Math.exp(-(((y - 3.8) / 2.4) ** 2));
const seaD = (x, y) => shoreX(y) - x; // > 0 = di laut (makin besar makin dalam)
const ROCKY_Y = 30.5;                  // selatan garis ini: pantai berbatu (pasir lebih lebar, banyak batu)
function classify(cx, cy) {
  const d = seaD(cx, cy);
  if (d > 3.4) return T.DEEP;
  if (d > 0) return T.SHALLOW;
  if (cx > 36.6 + 0.6 * Math.sin(cy * 0.5)) return T.FOREST;       // hutan pantai di timur (batas peta)
  if (cy > 37.0 + 0.5 * Math.sin(cx * 0.6)) return T.FOREST;       // hutan di selatan
  if (cy < 1.2) return T.FOREST;                                     // tebing utara
  if (-d < (cy > ROCKY_Y ? 2.6 : 1.7)) return T.SAND;
  return T.GRASS;
}
const tiles = new Uint8Array(MW * MH);
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) tiles[y * MW + x] = classify(x + 0.5, y + 0.5);
// di luar peta: laut terus berlanjut ke barat (bisa dilayari), daratan/hutan di timur
const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? classify(Math.floor(x) + 0.5, Math.floor(y) + 0.5) : tiles[(y | 0) * MW + (x | 0)]);
const setTile = (x, y, t) => { if (x >= 0 && y >= 0 && x < MW && y < MH) tiles[y * MW + x] = t; };
const soft = (t) => t === T.GRASS || t === T.SAND;

// ---------- Jalan ----------
function pathRect(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (soft(tileAt(x, y))) setTile(x, y, T.PATH); }
pathRect(18, 5, 18, 34);   // jalan pesisir utara–selatan
pathRect(17, 20, 32, 20);  // jalan dermaga → kampung
pathRect(15, 5, 17, 5);    // ke mercusuar
pathRect(28, 12, 28, 19);  // ke rumah Pak Hasan
pathRect(31, 19, 31, 19);  // ke rumah Bu Ratna
pathRect(25, 21, 25, 30);  // ke gudang & jalan selatan
pathRect(18, 31, 30, 31);  // jalan selatan (rumah Arif)
pathRect(16, 11, 17, 11);  // ke dermaga kecil

// ---------- Dermaga ----------
// Dermaga utama (2 papan lebar) menjorok ke barat; kapal pemain bersandar di sisi selatannya.
const PIER = { x0: 6, x1: 16, y0: 19, y1: 20, axis: "x" };
for (let y = PIER.y0; y <= PIER.y1; y++) for (let x = PIER.x0; x <= PIER.x1; x++) setTile(x, y, T.DOCK);
for (let y = PIER.y0; y <= PIER.y1; y++) if (soft(tileAt(17, y))) setTile(17, y, T.PATH);
// Dermaga kecil (1 papan) tempat perahu warga ditambat
const JETTY = { x0: 10, x1: 15, y0: 11, y1: 11, axis: "x" };
for (let x = JETTY.x0; x <= JETTY.x1; x++) setTile(x, JETTY.y0, T.DOCK);

const SPOT = { x: 6.6, y: 19.95 };                 // ujung dermaga utama
const BOAT = { x: 9.6, y: 21.95 };                  // kapal pemain bersandar di sisi selatan dermaga
const START = { x: 18.5, y: 20.5 };                 // pangkal dermaga (posisi aman)

// ---------- Bangunan ----------
const buildings = [
  { id: "spasar", kind: "market", x0: 19.6, y0: 15.4, x1: 23.4, y1: 17.8, h: 34, name: "Pasar Ikan Selat" },
  { id: "gudang", kind: "gudang", x0: 20.0, y0: 22.6, x1: 24.4, y1: 26.2, h: 46, door: "x", roof: "#7d8b94", wall: "#d8cbb0", name: "Gudang Peralatan" },
  { id: "warung", kind: "pondok", x0: 26.4, y0: 15.8, x1: 28.9, y1: 18.0, h: 26, name: "Warung Kopi Pelabuhan", noLight: true },
  { id: "rhasan", kind: "house", x0: 26.8, y0: 9.4, x1: 29.4, y1: 12.0, h: 36, door: "y", roof: "#3d6f8f", wall: "#efe2c4", name: "Rumah Pak Hasan" },
  { id: "rratna", kind: "house", x0: 30.4, y0: 16.2, x1: 33.0, y1: 18.8, h: 34, door: "y", stilts: 8, roof: "#c2603b", wall: "#f3e2bd", name: "Rumah Bu Ratna" },
  { id: "rarif", kind: "house", x0: 26.4, y0: 27.6, x1: 28.9, y1: 30.0, h: 34, door: "y", roof: "#2f6b58", wall: "#e9dcc0", name: "Rumah Arif" },
];
const B = Object.fromEntries(buildings.map((b) => [b.id, b]));

// ---------- Objek ----------
const objects = [], solids = [];
const POS = {
  tower: { x: 14.1, y: 3.6 }, info: { x: 17.2, y: 21.7 }, rute: { x: 12.6, y: 19.15 }, net: { x: 22.0, y: 19.0 },
  rack: { x: 21.3, y: 28.6 }, beach: { x: 16.6, y: 34.4 }, buoyN: { x: 3.2, y: 16.0 }, buoyS: { x: 3.4, y: 24.4 },
};
objects.push({ kind: "mercusuar", ...POS.tower, big: 260, occ: [26, 150] });
objects.push({ kind: "infoboard", ...POS.info });
objects.push({ kind: "rute", ...POS.rute });
objects.push({ kind: "rack", ...POS.rack });
objects.push({ kind: "net", x: 23.9, y: 19.3 }, { kind: "net", x: 15.4, y: 21.6 });
objects.push({ kind: "crate", x: 24.9, y: 21.6 }, { kind: "crate", x: 24.6, y: 22.1, s: 0.8 }, { kind: "barrel", x: 19.4, y: 21.5 }, { kind: "barrel", x: 23.6, y: 27.0 });
objects.push({ kind: "basket", x: 19.2, y: 18.6 }, { kind: "basket", x: 23.8, y: 18.4 });
objects.push({ kind: "bench", x: 27.2, y: 19.3, dir: "x" });
// tiang tambat di dermaga utama
for (const x of [7.3, 10.6, 14.0]) objects.push({ kind: "post", x, y: 20.85, dock: true });
// pelampung penanda alur masuk pelabuhan (merah = kiri, hijau = kanan saat masuk)
objects.push({ kind: "buoy", ...POS.buoyN, col: "#d84a3a" }, { kind: "buoy", ...POS.buoyS, col: "#3a9a5a" });
// perahu warga di dermaga kecil (hiasan, padat untuk kapal pemain)
const LOCAL_BOATS = [
  { x: 12.0, y: 12.35, a: Math.atan2(-16, -32), hull: "#2f7ab8", trim: "#f3e7c9", name: "Sri Rejeki" },
  { x: 14.6, y: 9.75, a: Math.atan2(-16, -32), hull: "#d9893a", trim: "#2f5d78", name: "Bintang Laut" },
  { x: 10.4, y: 9.9, a: Math.atan2(-16, -32), hull: "#3f9a6a", trim: "#f0d58a", name: "Harapan" },
];
for (const b of LOCAL_BOATS) objects.push({ kind: "jukung", ...b, dz: 0.4 });
// tanda arah
const signs = [
  { x: 17.4, y: 18.4, title: "Pelabuhan Selat Sunda", text: "Selamat datang di Pelabuhan Selat Sunda! ↗ Pasar Ikan & Warung Kopi · ↘ Gudang Peralatan · ↖ Mercusuar di tanjung utara · ↓ Pantai Berbatu di selatan." },
];
signs.forEach((s) => objects.push({ kind: "sign", x: s.x, y: s.y, title: s.title }));
const lamps = [[17.3, 21.4], [17.3, 13.0], [24.6, 19.4], [30.0, 19.4], [17.3, 28.6], [16.4, 18.9], [24.6, 30.4]];
lamps.forEach(([x, y]) => objects.push({ kind: "lamp", x, y }));
const flowerBeds = [{ x0: 29.4, y0: 12.6, x1: 30.2, y1: 13.2 }];

// ---------- Titik interaksi ----------
const fishSpots = [{ id: "spot", mx: SPOT.x - 0.5, my: SPOT.y, mz: 4.5, face: 5, ret: { x: SPOT.x + 0.9, y: SPOT.y, dir: 1 } }];
const points = [
  { id: "spot", x: SPOT.x + 0.4, y: SPOT.y, r: 1.3, icon: "🎣", label: "Mancing", fish: true },
  { id: "spasar", x: 21.5, y: 18.45, r: 1.6, icon: "🏪", label: "Pasar" },
  { id: "gudang", x: 25.35, y: 24.4, r: 1.05, icon: "🧰", label: "Gudang" },
  { id: "warung", x: 27.65, y: 18.75, r: 0.9, icon: "☕", label: "Warung" },
  { id: "tower", x: 15.6, y: 5.55, r: 1.1, icon: "🗼", label: "Mercusuar" },
  { id: "info", x: POS.info.x + 0.5, y: POS.info.y + 0.55, r: 0.9, icon: "📜", label: "Baca" },
  { id: "rute", x: POS.rute.x, y: POS.rute.y + 0.75, r: 0.8, icon: "🧭", label: "Rute Kapal" },
  { id: "bench:warung", x: 27.2, y: 19.85, r: 0.8, icon: "🪑", label: "Duduk", seat: { x: 27.2, y: 19.45, dir: 7 } },
  { id: "rhasan", x: 28.15, y: 12.6, r: 0.8, icon: "🚪", label: "Ketuk", owner: "hasan" },
  { id: "rratna", x: 31.25, y: 19.4, r: 0.8, icon: "🚪", label: "Ketuk", owner: "ratna" },
  { id: "rarif", x: 27.2, y: 30.6, r: 0.8, icon: "🚪", label: "Ketuk", owner: "arif" },
];
signs.forEach((s, i) => points.push({ id: "ssign" + i, x: s.x + 0.45, y: s.y + 0.45, r: 0.85, icon: "📜", label: "Baca", sign: s }));

// ---------- Jaringan jalan NPC ----------
const NAV = {
  PIERE: [7.6, 19.95], PIERM: [11.2, 20.45], PIERB: [16.6, 20.45], X0: [18.5, 20.5], N1: [18.5, 15.2], J0: [18.5, 11.5], JET: [13.4, 11.5],
  LH0: [18.5, 5.5], LH: [15.6, 5.5], MKT: [21.5, 18.9], STALL: [21.5, 16.7], E1: [25.5, 20.5], WAR: [27.6, 18.9], H0: [28.5, 20.5],
  HASANH: [28.4, 12.8], RATNAH: [31.3, 19.5], GUD: [25.5, 24.4], S1: [25.5, 31.5], ARIFH: [27.2, 31.3], S0: [18.5, 31.5], BEACH: [18.4, 34.3],
  NETS: [22.6, 19.6], BENCH: [27.2, 19.45], RACK: [21.3, 29.6],
};
const NAV_EDGES = [["PIERE", "PIERM"], ["PIERM", "PIERB"], ["PIERB", "X0"], ["X0", "N1"], ["N1", "J0"], ["J0", "JET"], ["J0", "LH0"], ["LH0", "LH"],
  ["X0", "MKT"], ["MKT", "STALL"], ["MKT", "NETS"], ["NETS", "E1"], ["X0", "E1"], ["E1", "WAR"], ["E1", "H0"], ["H0", "HASANH"], ["H0", "RATNAH"], ["WAR", "BENCH"],
  ["E1", "GUD"], ["GUD", "S1"], ["S1", "ARIFH"], ["S1", "S0"], ["S0", "X0"], ["S0", "BEACH"], ["S0", "RACK"]];
const nearNav = (x, y, pad) => NAV_EDGES.some(([a, b]) => NW.areaKit.segDist(x, y, NAV[a][0], NAV[a][1], NAV[b][0], NAV[b][1]) < pad);
function nearAny(x, y, pad) {
  for (const b of buildings) if (x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad) return true;
  for (const p of points) if (Math.hypot(x - p.x, y - p.y) < pad + 0.6) return true;
  for (const o of objects) if (Math.hypot(x - o.x, y - o.y) < pad + 0.5) return true;
  return false;
}
function nearPath(x, y) {
  if (nearNav(x, y, 0.8)) return true;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tileAt(Math.floor(x + dx * 0.6), Math.floor(y + dy * 0.6)); if (t === T.PATH || t === T.DOCK) return true; }
  return false;
}
const R = rng(20261101);
const count = (k) => objects.filter((o) => o.kind === k).length;
// kelapa di pasir & hutan pantai di tepi timur/selatan
for (let i = 0; i < 1400 && count("palm") < 22; i++) {
  const x = 12 + R() * 26, y = 2 + R() * 36, t = tileAt(x, y);
  if (t !== T.SAND || nearPath(x, y) || nearAny(x, y, 1.0) || y > ROCKY_Y) continue;
  objects.push({ kind: "palm", x, y, h: 70 + R() * 30, lean: (R() - 0.5) * 0.9, ph: R() * 6 });
}
for (let i = 0; i < 1600 && count("tree") < 26; i++) {
  const x = 30 + R() * 10, y = 1 + R() * 39, t = tileAt(x, y);
  if (t !== T.FOREST && t !== T.GRASS) continue;
  if (t === T.GRASS && (nearPath(x, y) || nearAny(x, y, 1.8) || x < 33.5)) continue;
  if (objects.some((o) => o.kind === "tree" && Math.hypot(o.x - x, o.y - y) < 1.5)) continue;
  objects.push({ kind: "tree", x, y, s: 0.85 + R() * 0.35, hue: R(), fade: true });
}
for (let i = 0; i < 1600 && count("tree") < 40; i++) {
  const x = 14 + R() * 24, y = 36 + R() * 4, t = tileAt(x, y);
  if (t !== T.FOREST || objects.some((o) => o.kind === "tree" && Math.hypot(o.x - x, o.y - y) < 1.5)) continue;
  objects.push({ kind: "tree", x, y, s: 0.85 + R() * 0.3, hue: R(), fade: true });
}
for (let i = 0; i < 1200 && count("bush") < 18; i++) {
  const x = 19 + R() * 17, y = 3 + R() * 33;
  if (tileAt(x, y) !== T.GRASS || nearPath(x, y) || nearAny(x, y, 0.7)) continue;
  objects.push({ kind: "bush", x, y, s: 0.6 + R() * 0.45, flowers: R() < 0.35 });
}
// pantai berbatu: banyak batu di pasir & di air dangkal
for (let i = 0; i < 1400 && count("rock") < 20; i++) {
  const x = 11 + R() * 9, y = ROCKY_Y + R() * 7, t = tileAt(x, y);
  if (t !== T.SAND || nearPath(x, y) || nearAny(x, y, 0.55)) continue;
  objects.push({ kind: "rock", x, y, s: 0.6 + R() * 0.8 });
}
for (let i = 0; i < 1200 && count("searock") < 12; i++) {
  const x = 6 + R() * 12, y = ROCKY_Y - 1 + R() * 8, t = tileAt(x, y);
  if (t !== T.SHALLOW || nearAny(x, y, 0.6)) continue;
  objects.push({ kind: "searock", x, y, s: 0.6 + R() * 0.6 });
}
// pemecah ombak di barat daya (batu besar berderet) — melindungi pantai berbatu
for (let k = 0; k <= 8; k++) { const x = 3.4 + k * 0.85, y = 27.6 + k * 0.62 + Math.sin(k * 1.7) * 0.15; objects.push({ kind: "searock", x, y, s: 1.05 + hash2(k, 7) * 0.35, wall: true }); }

// ---------- Collision ----------
for (const o of objects) {
  if (o.kind === "palm") solids.push({ x: o.x, y: o.y, r: 0.22 });
  else if (o.kind === "tree") solids.push({ x: o.x, y: o.y, r: 0.38 * o.s });
  else if (o.kind === "bush") solids.push({ x: o.x, y: o.y, r: 0.3 * o.s });
  else if (o.kind === "rock") solids.push({ x: o.x, y: o.y, r: 0.28 * o.s });
  else if (o.kind === "lamp" || o.kind === "sign") solids.push({ x: o.x, y: o.y, r: 0.16 });
  else if (o.kind === "infoboard" || o.kind === "rute") solids.push({ x: o.x, y: o.y, r: 0.22 });
  else if (o.kind === "mercusuar") solids.push({ x: o.x, y: o.y, r: 0.8 });
  else if (o.kind === "bench") solids.push({ x: o.x, y: o.y, r: 0.32 });
  else if (o.kind === "rack") solids.push({ x0: o.x - 0.7, y0: o.y - 0.15, x1: o.x + 0.7, y1: o.y + 0.15 });
  else if (o.kind === "crate" || o.kind === "barrel" || o.kind === "basket") solids.push({ x: o.x, y: o.y, r: 0.28 });
  else if (o.kind === "net") solids.push({ x: o.x, y: o.y, r: 0.35 });
  else if (o.kind === "post" && o.dock) solids.push({ x: o.x, y: o.y, r: 0.12 });
}
for (const b of buildings) solids.push({ x0: b.x0 + 0.02, y0: b.y0 + 0.02, x1: b.x1 - 0.02, y1: b.y1 - 0.02 });
for (const f of flowerBeds) solids.push(f);
const walkable = NW.areaKit.makeWalkable(tileAt, solids, NW.isWalkT);
const shoreEdges = NW.areaKit.shoreEdges(tileAt, MW, MH);

NW.SELAT_MAP = {
  MW, MH, tiles, tileAt, classify, shoreX, seaD, ROCKY_Y, PIER, JETTY, SPOT, BOAT, START, DOCK: PIER,
  buildings, B, objects, points, signs, NAV, NAV_EDGES, flowerBeds, lamps, solids, walkable, shoreEdges, POS, LOCAL_BOATS,
  docks: [PIER, JETTY], fishSpots,
  lights: [{ x: BOAT.x, y: BOAT.y, z: 14, r: 40 }, { x: 27.6, y: 17.0, z: 24, r: 60, col: "#ffc46b", k: 1.1 }, { x: 21.5, y: 16.8, z: 20, r: 54, col: "#ffcf86", k: 0.8 }],
};
})();
