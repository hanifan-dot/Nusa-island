// =========================================================
//  NUSA ISLAND — Bumbu 2: peta KAMPUNG TEPIAN TOBA (data + collision)
//  Kampung kecil di tepi danau: danau luas di utara & timur, perbukitan
//  pinus di barat, tepi hutan di selatan. Bukit Pandang bisa didaki.
//  Koordinat dunia dalam tile (x ke kanan-bawah, y ke kiri-bawah layar).
// =========================================================
(() => {
"use strict";
const { T, hash2, rng } = NW;
const MW = 40, MH = 40;

// ---------- Bentuk danau ----------
const shoreN = (x) => 12.6 + 1.1 * Math.sin(x * 0.42 + 0.6) + 0.6 * Math.sin(x * 1.07 + 2.1); // danau di utara: y < shoreN(x)
const shoreE = (y) => 34.6 + 1.0 * Math.sin(y * 0.5 + 1.3) + 0.5 * Math.sin(y * 1.3);       // danau di timur: x > shoreE(y)
const lakeD = (x, y) => Math.max(shoreN(x) - y, x - shoreE(y)); // > 0 = di danau (makin besar makin dalam)
const hillEdge = (y) => 2.7 + 0.7 * Math.sin(y * 0.45 + 0.8);  // perbukitan pinus di barat: x < hillEdge(y)
function classify(cx, cy) {
  const d = lakeD(cx, cy);
  if (d > 1.5) return T.DEEP;
  if (d > 0) return T.SHALLOW;
  if (cx < hillEdge(cy)) return T.HILL;
  if (cy > 36.6 + 0.5 * Math.sin(cx * 0.6)) return T.FOREST;
  if (d > -1.15) return T.SAND;
  return T.GRASS;
}
const tiles = new Uint8Array(MW * MH);
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) tiles[y * MW + x] = classify(x + 0.5, y + 0.5);
// di luar peta: lanjutan danau / bukit / hutan yang sama (tidak bisa didatangi)
const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? classify(Math.floor(x) + 0.5, Math.floor(y) + 0.5) : tiles[(y | 0) * MW + (x | 0)]);
const setTile = (x, y, t) => { if (x >= 0 && y >= 0 && x < MW && y < MH) tiles[y * MW + x] = t; };
const soft = (t) => t === T.GRASS || t === T.SAND;

// ---------- Tinggi tanah: Bukit Pandang (bisa didaki) & perbukitan barat ----------
const KNOLL = { x: 5.4, y: 15.7, top: 1.25, foot: 3.5, h: 22 };
function heightAt(x, y) {
  const r = Math.hypot(x - KNOLL.x, (y - KNOLL.y) * 1.05);
  if (r >= KNOLL.foot) return 0;
  if (r <= KNOLL.top) return KNOLL.h;
  const k = 1 - (r - KNOLL.top) / (KNOLL.foot - KNOLL.top);
  return KNOLL.h * k * k * (3 - 2 * k);
}
const hillH = (x, y) => 26 + Math.round(hash2(x * 3 + 1, y * 5 + 2) * 18) + Math.max(0, (2 - x)) * 6; // tinggi blok bukit (gambar saja)

// ---------- Jalan setapak ----------
function pathRect(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (soft(tileAt(x, y))) setTile(x, y, T.PATH); }
pathRect(5, 21, 31, 21);   // jalan kampung barat–timur
pathRect(18, 14, 18, 33);  // jalan dari dermaga ke selatan
pathRect(5, 16, 5, 20);    // naik ke Bukit Pandang
pathRect(4, 15, 6, 15);    // puncak bukit
pathRect(31, 15, 31, 20);  // ke Sudut Tenang
pathRect(10, 20, 14, 20);  // pelataran pasar
pathRect(12, 22, 12, 25);  // ke rumah Bu Maya
pathRect(22, 19, 22, 20);  // ke rumah Pak Raka
pathRect(26, 19, 26, 20);  // ke rumah warga
pathRect(10, 31, 26, 31);  // jalan kebun & pancuran
pathRect(19, 22, 20, 26);  // ke pondok kumpul
pathRect(25, 30, 25, 30);

// ---------- Dermaga (memanjang ke utara, masuk ke danau) ----------
let dockY1 = 5;
for (const x of [18, 19]) { let y = 6; while (y < MH && !soft(tileAt(x, y)) && tileAt(x, y) !== T.PATH) y++; dockY1 = Math.max(dockY1, y - 1); }
const DOCK = { x0: 18, x1: 19, y0: 6, y1: dockY1, axis: "y" };
for (let y = DOCK.y0; y <= DOCK.y1; y++) for (let x = DOCK.x0; x <= DOCK.x1; x++) setTile(x, y, T.DOCK);
const SPOT = { x: 19.0, y: 6.45 };                 // ujung dermaga
const BOAT = { x: 21.35, y: 8.9 };                  // kapal pemain bersandar di sisi timur dermaga
const START = { x: 18.7, y: DOCK.y1 + 1.6 };        // pangkal dermaga (posisi aman)

// ---------- Bangunan ----------
// rumah tepi danau: atap pelana melengkung (terinspirasi rumah-rumah di tepi Danau Toba), tanpa ornamen adat
const buildings = [
  { id: "tpasar", kind: "tmarket", x0: 10.4, y0: 17.4, x1: 14.4, y1: 19.3, h: 30, name: "Pasar Kecil Toba", noLight: false },
  { id: "rraka", kind: "thouse", x0: 21.2, y0: 15.8, x1: 23.7, y1: 18.3, h: 34, door: "y", roof: "#6b3d2a", wall: "#d9b98a", trim: "#8f2d2d", name: "Rumah Pak Raka", stilts: 8 },
  { id: "rwarga1", kind: "thouse", x0: 25.4, y0: 15.8, x1: 27.8, y1: 18.3, h: 32, door: "y", roof: "#5b6670", wall: "#e8dcc2", trim: "#3d6f8f", name: "Rumah Warga" },
  { id: "rmaya", kind: "thouse", x0: 8.6, y0: 24.2, x1: 11.1, y1: 26.6, h: 32, door: "x", roof: "#7d4a2c", wall: "#efd9b0", trim: "#c2603b", name: "Rumah Bu Maya" },
  { id: "rnala", kind: "thouse", x0: 14.6, y0: 24.4, x1: 17.0, y1: 26.8, h: 33, door: "x", roof: "#2f6b58", wall: "#f1e6cf", trim: "#e0b84c", name: "Rumah Nala" },
  { id: "rwarga2", kind: "thouse", x0: 24.0, y0: 27.6, x1: 26.4, y1: 30.0, h: 30, door: "y", roof: "#6b3d2a", wall: "#d0b48c", trim: "#5a3a20", name: "Rumah Warga" },
  { id: "pondok", kind: "pondok", x0: 21.6, y0: 23.3, x1: 24.6, y1: 25.5, h: 26, name: "Pondok Kumpul", noLight: true },
];
const B = Object.fromEntries(buildings.map((b) => [b.id, b]));

// ---------- Objek ----------
const objects = [], solids = [];
const KNOLL_TOP = { x: KNOLL.x, y: KNOLL.y };
const POS = {
  info: { x: 16.5, y: 14.9 }, keramba: { x: 13.1, y: 13.0 }, scope: { x: 4.9, y: 14.7 }, markstone: { x: 4.3, y: 16.5 },
  benchHill: { x: 6.3, y: 15.4 }, benchSudut: { x: 31.4, y: 15.6 }, flatrock: { x: 32.7, y: 14.4 }, post: { x: 33.1, y: 15.7 },
  soluBeach: { x: 28.9, y: 13.9 }, spring: { x: 8.6, y: 31.5 }, bigtree: { x: 26.9, y: 24.0 }, rack: { x: 12.9, y: 27.6 },
};
objects.push({ kind: "infoboard", ...POS.info });
objects.push({ kind: "scope", ...POS.scope });
objects.push({ kind: "markstone", ...POS.markstone });
objects.push({ kind: "bench", ...POS.benchHill, dir: "y" });
objects.push({ kind: "bench", ...POS.benchSudut, dir: "x" });
objects.push({ kind: "flatrock", ...POS.flatrock });
objects.push({ kind: "post", ...POS.post });
objects.push({ kind: "solu", ...POS.soluBeach, beached: true, rot: 0.2 });
objects.push({ kind: "solu", x: 16.3, y: 8.6, rot: -0.46 });
objects.push({ kind: "spring", ...POS.spring });
objects.push({ kind: "bigtree", ...POS.bigtree, s: 1.45, fade: true, occ: [44, 96] });
objects.push({ kind: "rack", ...POS.rack });
objects.push({ kind: "boat", x: BOAT.x, y: BOAT.y, flip: true, tie: { x: 20.0, y: 8.4 } });
objects.push({ kind: "keramba", x: 12.2, y: 8.9, s: 1 }, { kind: "keramba", x: 14.5, y: 9.9, s: 0.85 }, { kind: "keramba", x: 10.4, y: 10.2, s: 0.75 });
objects.push({ kind: "bench", x: 22.3, y: 26.5, dir: "x" }, { kind: "bench", x: 24.0, y: 26.5, dir: "x" });
for (const [x, y] of [[30.3, 13.2], [30.9, 12.8], [32.3, 13.1], [33.6, 13.7], [34.4, 14.6], [9.6, 11.8], [16.9, 12.6]]) objects.push({ kind: "reeds", x, y, s: 0.8 + hash2(x * 9, y * 7) * 0.4 });
objects.push({ kind: "crate", x: 17.3, y: 13.9, s: 0.8 });
objects.push({ kind: "basket", x: 20.4, y: 13.6 });
// tanda arah
const signs = [
  { x: 19.7, y: 15.1, title: "Tepian Toba", text: "Selamat datang di Kampung Tepian Toba! Ke barat: Pasar Kecil & Bukit Pandang. Ke timur: Sudut Tenang Danau. Ke selatan: Pondok Kumpul & Pancuran Batu." },
  { x: 17.2, y: 22.4, title: "Simpang Kampung", text: "↖ Pasar & Bukit Pandang · ↗ Rumah Pak Raka & Sudut Tenang · ↓ Pondok Kumpul, kebun, Pancuran Batu." },
];
signs.forEach((s) => objects.push({ kind: "sign", x: s.x, y: s.y, title: s.title }));
const lamps = [[17.3, 15.3], [17.3, 20.4], [9.8, 20.4], [24.9, 20.4], [30.2, 20.3], [19.3, 27.8], [16.9, 31.6], [27.2, 31.6]];
lamps.forEach(([x, y]) => objects.push({ kind: "lamp", x, y }));
// kebun sayur warga (datar, digambar di terrain)
const flowerBeds = [
  { kind: "kebun", x0: 11.2, y0: 32.7, x1: 15.6, y1: 34.6 }, { kind: "kebun", x0: 19.6, y0: 32.7, x1: 23.8, y1: 34.6 },
  { x0: 20.3, y0: 18.9, x1: 21.0, y1: 19.6 }, { x0: 9.4, y0: 26.9, x1: 10.6, y1: 27.5 },
];

// ---------- Titik interaksi ----------
const fishSpots = [{ id: "spot", mx: SPOT.x, my: SPOT.y + 0.2, mz: 4.5, face: 7, ret: { x: SPOT.x, y: SPOT.y + 1.25, dir: 7 } }];
const points = [
  { id: "spot", x: SPOT.x, y: SPOT.y + 0.7, r: 1.3, icon: "🎣", label: "Mancing", fish: true },
  { id: "boat", x: 19.85, y: 8.9, r: 1.1, icon: "⛵", label: "Kapal", bz: 40 },
  { id: "tpasar", x: 12.4, y: 20.15, r: 1.6, icon: "🏪", label: "Pasar" },
  { id: "info", x: POS.info.x + 0.45, y: POS.info.y + 0.6, r: 0.9, icon: "📜", label: "Baca" },
  { id: "keramba", x: POS.keramba.x, y: POS.keramba.y + 0.3, r: 1.1, icon: "🕸️", label: "Keramba" },
  { id: "scope", x: POS.scope.x + 0.35, y: POS.scope.y + 0.55, r: 0.95, icon: "🔭", label: "Pandang" },
  { id: "markstone", x: POS.markstone.x + 0.6, y: POS.markstone.y + 0.25, r: 0.85, icon: "🪨", label: "Periksa" },
  { id: "bench:hill", x: POS.benchHill.x, y: POS.benchHill.y + 0.55, r: 0.85, icon: "🪑", label: "Duduk", seat: { x: POS.benchHill.x, y: POS.benchHill.y + 0.12, dir: 7 } },
  { id: "bench:sudut", x: POS.benchSudut.x, y: POS.benchSudut.y + 0.6, r: 0.85, icon: "🪑", label: "Duduk", seat: { x: POS.benchSudut.x + 0.05, y: POS.benchSudut.y + 0.12, dir: 7 } },
  { id: "bench:pondok", x: 22.3, y: 27.15, r: 0.8, icon: "🪑", label: "Duduk", seat: { x: 22.3, y: 26.62, dir: 3 } },
  { id: "stones", x: POS.flatrock.x - 0.5, y: POS.flatrock.y + 0.5, r: 0.85, icon: "🪨", label: "Lempar batu" },
  { id: "post", x: POS.post.x - 0.4, y: POS.post.y + 0.45, r: 0.8, icon: "🔍", label: "Periksa" },
  { id: "solu", x: POS.soluBeach.x + 0.3, y: POS.soluBeach.y + 0.75, r: 0.95, icon: "🛶", label: "Perahu" },
  { id: "spring", x: POS.spring.x + 0.85, y: POS.spring.y + 0.2, r: 0.95, icon: "💧", label: "Pancuran" },
  { id: "pondok", x: 23.1, y: 26.0, r: 0.75, icon: "🛖", label: "Pondok" },
  { id: "rraka", x: 22.45, y: 18.95, r: 0.8, icon: "🚪", label: "Ketuk", owner: "raka" },
  { id: "rmaya", x: 11.75, y: 25.4, r: 0.8, icon: "🚪", label: "Ketuk", owner: "maya" },
  { id: "rnala", x: 17.6, y: 25.6, r: 0.8, icon: "🚪", label: "Ketuk", owner: "nala" },
];
signs.forEach((s, i) => points.push({ id: "tsign" + i, x: s.x + 0.45, y: s.y + 0.45, r: 0.85, icon: "📜", label: "Baca", sign: s }));

// ---------- Alam (ber-seed: tata letak selalu sama) ----------
const NAV = {
  DOCKE: [19.0, 7.4], DOCKM: [18.9, 10.4], DOCKB: [18.6, DOCK.y1 + 1.5], INFO: [17.6, 15.6], DOCKW: [20.2, 15.0],
  X1: [18.5, 21.5], W1: [12.4, 21.5], W2: [5.5, 21.5], BUK0: [5.5, 18.6], BUK: [5.6, 15.9], BUKV: [5.1, 15.2],
  MKT: [12.4, 20.4], MKE: [15.0, 20.4], MKS: [15.0, 18.4], STALL: [13.6, 18.3], KS: [15.2, 15.2], KER: [13.6, 13.4],
  E1: [22.4, 21.5], RAKAH: [22.4, 19.1], E2: [26.6, 21.5], WARGA1: [26.6, 19.1], E3: [31.4, 21.5], SUD0: [31.4, 17.0],
  SUDUT: [32.0, 14.9], SUDUT2: [30.4, 15.5], SOLU: [29.6, 14.9],
  S1: [18.5, 24.6], NALAH: [17.7, 25.6], P0: [19.9, 26.0], PONDOK: [21.4, 26.9], PONDOK2: [24.9, 27.0],
  S2: [18.5, 31.5], W31: [12.0, 31.5], SPRING: [9.9, 31.6], E31: [25.2, 31.5], WARGA2: [25.2, 30.7], MAYAH: [12.4, 25.4],
};
const NAV_EDGES = [["DOCKE", "DOCKM"], ["DOCKM", "DOCKB"], ["DOCKB", "INFO"], ["DOCKB", "DOCKW"], ["DOCKB", "X1"], ["X1", "W1"], ["W1", "W2"], ["W2", "BUK0"], ["BUK0", "BUK"], ["BUK", "BUKV"],
  ["W1", "MKT"], ["MKT", "MKE"], ["MKE", "MKS"], ["MKS", "STALL"], ["MKS", "KS"], ["KS", "KER"], ["X1", "E1"], ["E1", "RAKAH"], ["E1", "E2"], ["E2", "WARGA1"],
  ["E2", "E3"], ["E3", "SUD0"], ["SUD0", "SUDUT2"], ["SUDUT2", "SUDUT"], ["SUDUT2", "SOLU"], ["X1", "S1"], ["S1", "NALAH"], ["S1", "P0"], ["P0", "PONDOK"], ["PONDOK", "PONDOK2"],
  ["S1", "S2"], ["S2", "W31"], ["W31", "SPRING"], ["S2", "E31"], ["E31", "WARGA2"], ["W1", "MAYAH"], ["MKE", "X1"]];
const nearNav = (x, y, pad) => NAV_EDGES.some(([a, b]) => NW.areaKit.segDist(x, y, NAV[a][0], NAV[a][1], NAV[b][0], NAV[b][1]) < pad);
function nearAny(x, y, pad) {
  for (const b of buildings) if (x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad) return true;
  for (const p of points) if (Math.hypot(x - p.x, y - p.y) < pad + 0.6) return true;
  for (const o of objects) if (Math.hypot(x - o.x, y - o.y) < pad + 0.5) return true;
  for (const f of flowerBeds) if (x > f.x0 - pad && x < f.x1 + pad && y > f.y0 - pad && y < f.y1 + pad) return true;
  if (Math.hypot(x - SPOT.x, y - SPOT.y) < 2) return true;
  return false;
}
function nearPath(x, y) {
  if (nearNav(x, y, 0.8)) return true;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tileAt(Math.floor(x + dx * 0.6), Math.floor(y + dy * 0.6)); if (t === T.PATH || t === T.DOCK) return true; }
  return false;
}
const R = rng(20261030);
const count = (k) => objects.filter((o) => o.kind === k).length;
// pinus di perbukitan barat (di atas blok bukit) & tepi hutan selatan
for (let i = 0; i < 1600 && count("pine") < 64; i++) {
  const x = R() * (MW + 2) - 2, y = R() * (MH + 3) - 1, t = tileAt(x, y);
  if (t === T.HILL) { if (objects.some((o) => o.kind === "pine" && Math.hypot(o.x - x, o.y - y) < 1.1)) continue; objects.push({ kind: "pine", x, y, s: 0.95 + R() * 0.5, z: hillH(Math.floor(x), Math.floor(y)), hill: true, fade: true, occ: [26, 100] }); }
  else if (t === T.FOREST) { if (objects.some((o) => o.kind === "pine" && Math.hypot(o.x - x, o.y - y) < 1.05)) continue; objects.push({ kind: "pine", x, y, s: 0.9 + R() * 0.45, fade: true, occ: [26, 100] }); }
}
// pinus & pohon rindang di kampung (tidak di jalan, tidak menutupi interaksi)
for (let i = 0; i < 1400 && count("pine") < 82; i++) {
  const x = 3 + R() * (MW - 6), y = 13 + R() * 23;
  if (tileAt(x, y) !== T.GRASS || nearPath(x, y) || nearAny(x, y, 1.6) || heightAt(x, y) > 2) continue;
  objects.push({ kind: "pine", x, y, s: 0.8 + R() * 0.35, fade: true, occ: [26, 100] });
}
for (let i = 0; i < 1200 && count("tree") < 9; i++) {
  const x = 3 + R() * (MW - 6), y = 13 + R() * 23;
  if (tileAt(x, y) !== T.GRASS || nearPath(x, y) || nearAny(x, y, 1.9) || heightAt(x, y) > 2) continue;
  objects.push({ kind: "tree", x, y, s: 0.85 + R() * 0.3, hue: R() });
}
for (let i = 0; i < 1200 && count("bush") < 26; i++) {
  const x = 3 + R() * (MW - 6), y = 12 + R() * 25, t = tileAt(x, y);
  if ((t !== T.GRASS) || nearPath(x, y) || nearAny(x, y, 0.7)) continue;
  objects.push({ kind: "bush", x, y, s: 0.6 + R() * 0.45, flowers: R() < 0.45, z: heightAt(x, y) });
}
for (let i = 0; i < 900 && count("rock") < 14; i++) {
  const x = 3 + R() * (MW - 4), y = 10 + R() * 27, t = tileAt(x, y);
  if (t !== T.SAND || nearPath(x, y) || nearAny(x, y, 0.8)) continue;
  objects.push({ kind: "rock", x, y, s: 0.55 + R() * 0.7, z: heightAt(x, y) });
}
for (let i = 0; i < 400 && count("searock") < 5; i++) {
  const x = 3 + R() * (MW - 2), y = 4 + R() * (MH - 4);
  if (tileAt(x, y) !== T.SHALLOW || Math.abs(x - 19) < 4 && y < 14 || nearAny(x, y, 0.8)) continue;
  objects.push({ kind: "searock", x, y, s: 0.6 + R() * 0.5 });
}
// bunga liar di bukit
for (let i = 0; i < 600 && count("flowers") < 12; i++) {
  const x = 3 + R() * 6, y = 13 + R() * 6;
  if (tileAt(x, y) !== T.GRASS || nearPath(x, y) || nearAny(x, y, 0.5)) continue;
  objects.push({ kind: "flowers", x, y, z: heightAt(x, y), hue: R() });
}
// tinggi pijakan objek di bukit
for (const o of objects) if (o.z === undefined && !o.hill) { const h = heightAt(o.x, o.y); if (h > 0.5) o.z = h; }

// ---------- Collision ----------
for (const o of objects) {
  if (o.kind === "pine") solids.push({ x: o.x, y: o.y, r: 0.24 * o.s });
  else if (o.kind === "tree") solids.push({ x: o.x, y: o.y, r: 0.38 * o.s });
  else if (o.kind === "bigtree") solids.push({ x: o.x, y: o.y, r: 0.55 });
  else if (o.kind === "bush") solids.push({ x: o.x, y: o.y, r: 0.3 * o.s });
  else if (o.kind === "rock") solids.push({ x: o.x, y: o.y, r: 0.28 * o.s });
  else if (o.kind === "lamp" || o.kind === "sign") solids.push({ x: o.x, y: o.y, r: 0.16 });
  else if (o.kind === "infoboard" || o.kind === "scope") solids.push({ x: o.x, y: o.y, r: 0.28 });
  else if (o.kind === "markstone" || o.kind === "post") solids.push({ x: o.x, y: o.y, r: 0.3 });
  else if (o.kind === "bench") solids.push({ x: o.x, y: o.y, r: 0.32 });
  else if (o.kind === "flatrock") solids.push({ x: o.x, y: o.y, r: 0.42 });
  else if (o.kind === "spring") solids.push({ x: o.x, y: o.y, r: 0.6 });
  else if (o.kind === "rack") solids.push({ x0: o.x - 0.7, y0: o.y - 0.15, x1: o.x + 0.7, y1: o.y + 0.15 });
  else if (o.kind === "solu" && o.beached) solids.push({ x: o.x - 0.5, y: o.y - 0.1, r: 0.32 }, { x: o.x + 0.4, y: o.y + 0.05, r: 0.32 });
  else if (o.kind === "crate" || o.kind === "basket") solids.push({ x: o.x, y: o.y, r: 0.28 });
}
for (const b of buildings) solids.push({ x0: b.x0 + 0.02, y0: b.y0 + 0.02, x1: b.x1 - 0.02, y1: b.y1 - 0.02 });
for (const f of flowerBeds) solids.push(f);
const walkable = NW.areaKit.makeWalkable(tileAt, solids, NW.isWalkT);
const shoreEdges = NW.areaKit.shoreEdges(tileAt, MW, MH);

NW.TOBA_MAP = {
  MW, MH, tiles, tileAt, classify, lakeD, shoreN, shoreE, hillEdge, hillH, heightAt, KNOLL, DOCK, SPOT, BOAT, START,
  buildings, B, objects, points, signs, NAV, NAV_EDGES, flowerBeds, lamps, solids, walkable, shoreEdges, POS,
  docks: [DOCK], fishSpots,
  lights: [{ x: BOAT.x, y: BOAT.y, z: 14, r: 40 }, { x: 23.1, y: 24.4, z: 24, r: 64, col: "#ffc46b", k: 1.1 }, { x: POS.spring.x, y: POS.spring.y, z: 6, r: 30, col: "#9fd3e6", k: 0.5 }],
};
})();
