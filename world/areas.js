// =========================================================
//  NUSA ISLAND — Bumbu 2: registry AREA dunia (multilokasi)
//
//  Setiap area adalah satu objek data mandiri:
//    id, name, banner, loc (id di LOCATIONS → lokasi mancing yang dipakai ulang),
//    map    : peta tile, collision (walkable/solids), objek, bangunan, titik interaksi,
//             jaringan jalan NPC (NAV), titik mancing (fishSpots), lampu, tinggi tanah
//    spawns : posisi aman per cara datang ("start", "dock" = pulang mancing, "boat" = tiba berlayar)
//    npcs   : NPC milik area ini SAJA (hanya diproses saat area aktif)
//    theme  : warna air/daratan + gambar khusus terrain
//    hooks  : perilaku khusus area (interaksi, cerita, ambience, petunjuk) — tanpa if-else raksasa di mesin
//
//  Kompatibilitas: kode lama memakai NW.tileAt, NW.walkable, NW.objects, NW.SPOT, dst.
//  Properti itu kini adalah getter yang menunjuk ke peta AREA AKTIF, jadi modul lama
//  tetap bekerja tanpa diubah, dan peta Muara tidak pernah tercampur dengan Toba.
// =========================================================
window.NW = window.NW || {};
(() => {
"use strict";

// ---------- Konstanta bersama semua area ----------
// HILL = bukit/hutan tinggi (tidak bisa dilewati), FOREST = tepi hutan datar (tidak bisa dilewati)
const T = { DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, PATH: 4, DOCK: 5, HILL: 6, FOREST: 7 };
const TW = 64, TH = 32; // ukuran tile isometrik (px)
const isLandT = (t) => t >= T.SAND;               // bukan air (dipakai air, buih, ikan melompat)
const isWalkT = (t) => t >= T.SAND && t <= T.DOCK; // bisa diinjak
function rng(seed) {
  let s = seed >>> 0 || 7;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000000) / 1000000; };
}
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

// ---------- Perkakas pembuat peta (dipakai tiap area) ----------
const kit = {
  // collision standar: 9 titik sampel harus di tile yang bisa diinjak, dan tidak menabrak solids
  makeWalkable(tileAt, solids, okTile = isWalkT) {
    return function walkable(x, y, r = 0.22) {
      const probes = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]];
      for (const [dx, dy] of probes) if (!okTile(tileAt(Math.floor(x + dx), Math.floor(y + dy)))) return false;
      for (const s of solids) {
        if (s.r !== undefined) { if (Math.hypot(x - s.x, y - s.y) < s.r + r * 0.8) return false; }
        else if (x > s.x0 - r * 0.8 && x < s.x1 + r * 0.8 && y > s.y0 - r * 0.8 && y < s.y1 + r * 0.8) return false;
      }
      return true;
    };
  },
  // sisi tile darat yang berbatasan dengan air (untuk buih)
  shoreEdges(tileAt, MW, MH) {
    const out = [];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const t = tileAt(x, y); if (!isLandT(t) || t === T.DOCK) continue;
      if (!isLandT(tileAt(x + 1, y))) out.push({ ax: x + 1, ay: y, bx: x + 1, by: y + 1, nx: 1, ny: 0 });
      if (!isLandT(tileAt(x - 1, y))) out.push({ ax: x, ay: y, bx: x, by: y + 1, nx: -1, ny: 0 });
      if (!isLandT(tileAt(x, y + 1))) out.push({ ax: x, ay: y + 1, bx: x + 1, by: y + 1, nx: 0, ny: 1 });
      if (!isLandT(tileAt(x, y - 1))) out.push({ ax: x, ay: y, bx: x + 1, by: y, nx: 0, ny: -1 });
    }
    return out;
  },
  segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  },
};

// ---------- Registry ----------
const REG = {}, ORDER = [];
let cur = null;
const switchFns = [];
function register(def) {
  def.locIndex = typeof LOCATIONS !== "undefined" ? LOCATIONS.findIndex((l) => l.id === def.loc) : -1;
  def.npcs = def.npcs || [];
  def.hooks = def.hooks || {};
  def.map.heightAt = def.map.heightAt || (() => 0);
  def.map.fishSpots = def.map.fishSpots || [];
  def.map.lights = def.map.lights || [];
  REG[def.id] = def; if (!ORDER.includes(def.id)) ORDER.push(def.id);
  if (!cur) cur = def;
  return def;
}
const get = (id) => REG[id] || null;
const forLoc = (i) => { for (const id of ORDER) if (REG[id].locIndex === i) return REG[id]; return null; };
function setCurrent(id) {
  const a = REG[id]; if (!a || a === cur) return a;
  const prev = cur; cur = a;
  for (const fn of switchFns) { try { fn(a, prev); } catch (e) { console.error(e); } }
  return a;
}

// ---------- Rute NPC (Dijkstra pada jaringan jalan area) ----------
function adj(area) {
  if (area._adj) return area._adj;
  const NAV = area.map.NAV, A = {};
  for (const k of Object.keys(NAV)) A[k] = [];
  for (const [a, b] of area.map.NAV_EDGES) { const d = Math.hypot(NAV[a][0] - NAV[b][0], NAV[a][1] - NAV[b][1]); A[a].push([b, d]); A[b].push([a, d]); }
  return (area._adj = A);
}
function nearestNode(area, x, y) { let best = null, bd = 1e9; for (const [k, [nx, ny]] of Object.entries(area.map.NAV)) { const d = Math.hypot(nx - x, ny - y); if (d < bd) { bd = d; best = k; } } return best; }
function route(area, x, y, goal) {
  const NAV = area.map.NAV, ADJ = adj(area);
  const start = nearestNode(area, x, y), dist = { [start]: 0 }, prev = {}, todo = new Set(Object.keys(NAV));
  while (todo.size) {
    let u = null; for (const k of todo) if (dist[k] !== undefined && (u === null || dist[k] < dist[u])) u = k;
    if (u === null || u === goal) break; todo.delete(u);
    for (const [v, w] of ADJ[u]) { const nd = dist[u] + w; if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prev[v] = u; } }
  }
  const path = []; let k = goal; while (k && k !== start) { path.unshift(NAV[k]); k = prev[k]; }
  path.unshift(NAV[start]);
  return path.map(([px, py]) => ({ x: px, y: py }));
}

// ---------- Getter kompatibel: NW.<kunci peta> = peta area aktif ----------
const MAP_KEYS = ["MW", "MH", "tiles", "tileAt", "islandD", "DOCK", "SPOT", "BOAT", "SHORE_E", "START", "buildings", "objects", "points", "signs",
  "NAV", "NAV_EDGES", "HOME_GATE", "flowerBeds", "PARK", "lamps", "solids", "walkable", "shoreEdges", "heightAt"];
for (const k of MAP_KEYS) Object.defineProperty(NW, k, { get: () => (cur ? cur.map[k] : undefined), configurable: true, enumerable: true });

Object.assign(NW, {
  T, TW, TH, isLandT, isWalkT, hash2, rng, areaKit: kit,
  iso: (x, y) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 }),
  areas: {
    register, get, forLoc, setCurrent, route, nearestNode,
    get cur() { return cur; }, get list() { return ORDER.map((id) => REG[id]); },
    onSwitch: (fn) => switchFns.push(fn),
  },
});
})();
