// NUSA ISLAND — Visual Kota Nusa (Ide 04, bagian visual): integrasi ke engine. Dimuat HANYA bila NUSA_KOTA=true (default OFF).
// Kota = perluasan area NYATA "selat" ke timur (tanpa ID area server baru). Semua NPC & kendaraan = visual LOKAL deterministik
// (fungsi waktu dinding + seed kota + jam game): tidak ada tulis Firestore/D1, tidak menyentuh NW.room / protokol Kapal Rombongan,
// tidak ada ekonomi/hadiah/quest/pembelian. Catatan integrasi: server perlu flag `kotaNusa` bila kelak ada fitur berbasis server di kota.
(() => {
"use strict";
const NW = window.NW, Core = window.NusaKotaCore, Art = NW && NW.kotaArt;
if (!NW || !Core || !Art || !NW.SELAT_MAP || !NW.areas || !NW.areas.get("selat")) return;
if (NW.kota) return;   // sudah terpasang
const N = () => window.Nusa, area = NW.areas.get("selat"), M = NW.SELAT_MAP, P = NW.P, LIFT = NW.LIFT;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const OLD = { MW: M.MW, MH: M.MH };

// ---------- keadaan bersama (dibaca art.js) ----------
const S = { hour: 12, night: 0, tw: 0, ph: Core.lightPhase(0), lamps: false, q: 2, active: false, inCity: false, clock: null };
const LAY = Core.build(), TR = Core.buildTraffic(LAY), NPC = Core.buildNpcs(LAY);
const stat = { npcReg: NPC.length, npcActive: 0, npcShown: 0, npcVisible: 0, vehActive: 0, vehVisible: 0, lights: 0, cells: 0, frames: 0, slow: 0 };

// ---------- 1) perluas peta selat di tempat (indeks lama tidak berubah; kota di x >= 37) ----------
function installMap() {
  const MW = Core.MW, MH = Core.MH, X0 = Core.X0, old = M.tiles, oMW = OLD.MW, oMH = OLD.MH, T = NW.T;
  const tiles = new Uint8Array(MW * MH);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) tiles[y * MW + x] = x < oMW && y < oMH ? old[y * oMW + x] : M.classify(x + 0.5, y + 0.5);
  for (let y = 0; y < MH; y++) for (let x = X0; x < MW; x++) tiles[y * MW + x] = LAY.tiles[y * MW + x];
  for (let y = 18; y <= 23; y++) for (let x = 32; x <= 36; x++) tiles[y * MW + x] = T.PATH;                // koridor pelabuhan → gerbang kota
  const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? M.classify(Math.floor(x) + 0.5, Math.floor(y) + 0.5) : tiles[(y | 0) * MW + (x | 0)]);
  // bersihkan pohon/semak lama yang menghalangi gerbang & koridor (beserta kolisinya)
  const rm = new Set(), isDeco = (o) => o.kind === "tree" || o.kind === "palm" || o.kind === "bush" || o.kind === "rock";
  for (let i = M.objects.length - 1; i >= 0; i--) { const o = M.objects[i]; if (isDeco(o) && ((o.x >= 36.2) || (o.x >= 31.2 && o.y >= 17.2 && o.y <= 24.8))) { rm.add(o.x + "," + o.y); M.objects.splice(i, 1); } }
  for (let i = M.solids.length - 1; i >= 0; i--) { const s = M.solids[i]; if (s.r !== undefined && rm.has(s.x + "," + s.y)) M.solids.splice(i, 1); }
  M.MW = MW; M.MH = MH; M.tiles = tiles; M.tileAt = tileAt;
  M.walkable = NW.areaKit.makeWalkable(tileAt, M.solids, NW.isWalkT);
  M.shoreEdges = NW.areaKit.shoreEdges(tileAt, MW, MH);
}
// ---------- 2) bangunan (sel ≤ 3,2 petak agar urutan kedalaman benar), properti, kolisi ----------
function installCity() {
  const cells = [];
  for (const b of LAY.buildings) {
    const one = b.type === "rumah" || b.type === "arch" || b.type === "pos", nx = one ? 1 : Math.max(1, Math.ceil((b.x1 - b.x0) / 3.2)), ny = one ? 1 : Math.max(1, Math.ceil((b.y1 - b.y0) / 3.2));
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const x0 = b.x0 + (b.x1 - b.x0) * ix / nx, x1 = b.x0 + (b.x1 - b.x0) * (ix + 1) / nx, y0 = b.y0 + (b.y1 - b.y0) * iy / ny, y1 = b.y0 + (b.y1 - b.y0) * (iy + 1) / ny;
      cells.push({ kind: "kcell", parent: b, x0, y0, x1, y1, h: b.h, stilts: 0, front: iy === ny - 1, right: ix === nx - 1, ci: iy * nx + ix, center: cx >= x0 && cx < x1 && cy >= y0 && cy < y1, noLight: true, draw: Art.cell, name: b.name });
    }
  }
  for (const c of cells) M.buildings.push(c);
  stat.cells = cells.length;
  for (const o of LAY.objects) M.objects.push(Object.assign({}, o));
  for (const s of LAY.solids) M.solids.push(s);
  M.kotaDoors = LAY.doors;
  // slot kolisi dinamis untuk kendaraan yang dekat pemain (3 lingkaran per kendaraan, ukuran nol bila tak dipakai)
  for (let i = 0; i < 24; i++) { const sl = { x: -100, y: -100, r: 0 }; DYN.push(sl); M.solids.push(sl); }
  // lampu jalan & cahaya: akses terkulling (hanya yang dekat kamera) dikembalikan ke mesin lewat getter
  const lamps0 = M.lamps, lights0 = M.lights;
  Object.defineProperty(M, "lamps", { get: () => (S.active ? LAMPS : lamps0), configurable: true, enumerable: true });
  Object.defineProperty(M, "lights", { get: () => (S.active ? LIGHTS : lights0), configurable: true, enumerable: true });
  LAMPS.base = lamps0; LIGHTS.base = lights0;
}
const DYN = [], LAMPS = [], LIGHTS = [];
const LAMP_ALL = LAY.lamps;

// ---------- 3) gambar tanah kota (tile) + marka jalan (sekali, ke cache terrain) ----------
const hash2 = NW.hash2, shade = NW.shade, mix = NW.mix, poly = NW.poly;
const PAL = { 1: ["#5f6a73", "#566069"], 2: ["#d3cdbf", "#c8c2b2"], 3: ["#dccaa6", "#d2bf9a"], 6: ["#8d969c", "#848d93"], 7: ["#cfa57c", "#c29a72"], 9: ["#c4634c", "#b95a45"], 10: ["#6cae8a", "#62a481"], 11: ["#b4babe", "#aab0b5"], 12: ["#cdb48a", "#c3aa80"] };
function cityTile(g, x, y, k, kit, old, t) {
  const pal = PAL[k]; if (!pal) return old(g, x, y, t, kit);
  const h = hash2(x, y), base = h > 0.5 ? pal[0] : pal[1], q = [P(x, y, LIFT), P(x + 1, y, LIFT), P(x + 1, y + 1, LIFT), P(x, y + 1, LIFT)];
  g.fillStyle = base; poly(g, q); g.fill(); g.strokeStyle = base; g.lineWidth = 0.8; g.stroke();
  if (k === 2 || k === 3 || k === 7) { g.strokeStyle = shade(base, -0.1); g.lineWidth = 0.6; g.beginPath(); const a = P(x + 0.5, y, LIFT), b = P(x + 0.5, y + 1, LIFT), c = P(x, y + 0.5, LIFT), d = P(x + 1, y + 0.5, LIFT); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.moveTo(c.x, c.y); g.lineTo(d.x, d.y); g.stroke(); }
  if (k === 1) { g.fillStyle = "rgba(30,36,42,.12)"; for (let i = 0; i < 3; i++) { const p = P(x + 0.2 + hash2(x + i, y * 3) * 0.6, y + 0.2 + hash2(x * 3, y + i) * 0.6, LIFT); g.fillRect(p.x, p.y, 2, 1); } }
  if (k === 9) { g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 0.8; const c = P(x, y + 0.5, LIFT), d = P(x + 1, y + 0.5, LIFT); g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(d.x, d.y); g.stroke(); }
  if (k === 10) { g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 0.8; g.setLineDash([3, 3]); const c = P(x, y + 0.5, LIFT), d = P(x + 1, y + 0.5, LIFT); g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(d.x, d.y); g.stroke(); g.setLineDash([]); }
}
function ground(g, ps, col) { poly(g, ps.map((p) => P(p[0], p[1], LIFT))); g.fillStyle = col; g.fill(); }
function cityExtras(g) {
  const R = (x0, y0, x1, y1, col) => ground(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col);
  // garis tengah jalan (putus-putus) & marka tepi
  for (const c of LAY.VX) for (let i = 0; i < LAY.VY1.length; i++) { /* per jalan vertikal */ }
  LAY.VX.forEach((c, i) => { for (let y = 2.4; y < LAY.VY1[i] - 0.4; y += 1.2) { if (LAY.HY.some((r) => y > r - 1.5 && y < r + 3.5)) continue; R(c + 0.96, y, c + 1.04, y + 0.6, "#f0e29a"); } });
  LAY.HY.forEach((r) => { for (let x = 38; x < 89.6; x += 1.2) { if (LAY.VX.some((c) => x > c - 1.5 && x < c + 3.5)) continue; R(x, r + 0.96, x + 0.6, r + 1.04, "#f0e29a"); } });
  // zebra cross & garis henti di tiap persimpangan
  for (const n of LAY.lightNodes) {
    for (let k = 0; k < 5; k++) {
      const a = n.x0 + 0.12 + k * 0.4, b = n.y0 + 0.12 + k * 0.4;
      R(a, n.y1 + 0.12, a + 0.22, n.y1 + 0.95, "#f4f4ee"); R(a, n.y0 - 0.95, a + 0.22, n.y0 - 0.12, "#f4f4ee");
      R(n.x1 + 0.12, b, n.x1 + 0.95, b + 0.22, "#f4f4ee"); R(n.x0 - 0.95, b, n.x0 - 0.12, b + 0.22, "#f4f4ee");
    }
    R(n.x0, n.y1 + 1.0, n.x1, n.y1 + 1.12, "#f4f4ee"); R(n.x0, n.y0 - 1.12, n.x1, n.y0 - 1.0, "#f4f4ee"); R(n.x1 + 1.0, n.y0, n.x1 + 1.12, n.y1, "#f4f4ee"); R(n.x0 - 1.12, n.y0, n.x0 - 1.0, n.y1, "#f4f4ee");
  }
  const pe = LAY.PELICAN; for (let k = 0; k < 5; k++) R(pe.x0, pe.y0 + 0.12 + k * 0.4, pe.x1, pe.y0 + 0.34 + k * 0.4, "#f4f4ee");   // penyeberangan tengah blok (lampu pejalan)
  // bay parkir truk, area bongkar muat
  for (const [x, y] of [[40.4, 3.4], [43.6, 3.4], [46.8, 3.4], [40.4, 6.2], [43.6, 6.2]]) { ground(g, [[x - 1.5, y - 0.8], [x + 1.5, y - 0.8], [x + 1.5, y + 0.8], [x - 1.5, y + 0.8]], "rgba(255,255,255,.0)"); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1.2; poly(g, [P(x - 1.5, y - 0.8, LIFT), P(x + 1.5, y - 0.8, LIFT), P(x + 1.5, y + 0.8, LIFT), P(x - 1.5, y + 0.8, LIFT)]); g.stroke(); }
  for (const id of ["gudang_ikan", "gudang_logistik"]) { const d = LAY.doors[id]; g.strokeStyle = "#e0b84c"; g.lineWidth = 1.6; poly(g, [P(d.x - 1.3, 18.2, LIFT), P(d.x + 1.3, 18.2, LIFT), P(d.x + 1.3, 19.4, LIFT), P(d.x - 1.3, 19.4, LIFT)]); g.stroke(); }
  // jalur akses jalan keluar pelabuhan (aspal sempit dari gerbang ke persimpangan utama) sudah berupa jalan; panah arah
  g.fillStyle = "rgba(255,255,255,.75)"; for (let x = 39; x < 48; x += 3) { const a = P(x, 21.5, LIFT), b = P(x + 0.9, 21.5, LIFT); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(a.x + (b.x - a.x) * 0.5, a.y + 3 + (b.y - a.y) * 0.5); g.closePath(); g.fill(); }
  // plaza air mancur: cincin paving
  for (let r = 3.2; r > 1.4; r -= 0.55) { g.strokeStyle = r > 2 ? "rgba(150,130,100,.3)" : "rgba(150,130,100,.45)"; g.lineWidth = 1; g.beginPath(); for (let a = 0; a <= 6.30; a += 0.2) { const p = P(68 + Math.cos(a) * r * 0.9, 41 + Math.sin(a) * r * 0.9, LIFT); a ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.stroke(); }
  // lantai pasar: petak berselang warna
  for (let x = 54; x < 66; x++) for (let y = 12; y < 19; y++) if ((x + y) % 2) { g.fillStyle = "rgba(120,80,50,.08)"; poly(g, [P(x, y, LIFT), P(x + 1, y, LIFT), P(x + 1, y + 1, LIFT), P(x, y + 1, LIFT)]); g.fill(); }
}
function installTheme() {
  const th = area.theme, oldTile = th.landTile, oldExtras = th.extras;
  th.landTile = function (g, x, y, t, kit) { if (x < Core.X0) return oldTile(g, x, y, t, kit); const k = LAY.kind[y * Core.MW + x]; return cityTile(g, x, y, k, kit, oldTile, t); };
  th.extras = function (g, kit) { if (oldExtras) oldExtras(g, kit); cityExtras(g); };
  th.clearBg = true;     // latar digambar tiap frame (hooks.drawBack): laut di barat, hutan di luar peta kota
}
function drawBack(c, t, view, dk) {
  const a = (x, y) => P(x, y, LIFT);
  poly(c, [a(37, -300), a(400, -300), a(400, 400), a(37, 400)]); c.fillStyle = "#4a7a3e"; c.fill();
}

// ---------- 4) simulasi lokal (per frame) ----------
const player = () => NW.world.player;
const STY = [
  { shirt: "#3d5a6c", pants: "#2e2a26", skin: "#a8714a", hair: "#2a1d14", hat: "cap", hatCol: "#ece6d6" }, { shirt: "#c9553b", pants: "#4a3b5c", skin: "#c68b5e", hair: "#2a1d14", hat: "scarf", hatCol: "#2f7a8c", apron: "#f3e7c9" },
  { shirt: "#e0b84c", pants: "#2f5d78", skin: "#b77b52", hair: "#1f1612", hat: "cap", hatCol: "#d84a3a" }, { shirt: "#5a7d4a", pants: "#3a3a3a", skin: "#d2a77a", hair: "#3b2a1c" }, { shirt: "#8a4a8a", pants: "#2a2a3a", skin: "#c68b5e", hair: "#1c1410" },
  { shirt: "#dfe6ea", pants: "#33414d", skin: "#e0b48a", hair: "#2a1d14", collar: "#fff" }, { shirt: "#f0e0b0", pants: "#7a5a3c", skin: "#a8714a", hair: "#1c1410", hat: "caping", hatCol: "#e3be7a" }, { shirt: "#2f6b8a", pants: "#2e2a26", skin: "#d2a77a", hair: "#1c1410", collar: "#e8eef2" },
  { shirt: "#e8a0a0", pants: "#4a5a7a", skin: "#e0b48a", hair: "#3b2a1c", hat: "pony", hatCol: "#e07a8c" }, { shirt: "#f3f3f3", pants: "#2a2a2a", skin: "#c68b5e", hair: "#1c1410" }, { shirt: "#e0642a", pants: "#2a3a4a", skin: "#b77b52", hair: "#1f1612" },
];
const VEH = TR.defs.map((d, i) => ({ i, def: d, on: false, vis: false, lag: 0, x: 0, y: 0, fx: 1, fy: 0, v: 0, braking: false, L: d.L, W: d.W, type: d.type, col: d.col, alpha: 1, last: -9 }));
const NPCS = NPC.map((n, i) => ({ i, def: n, on: false, vis: false, x: 0, y: 0, dir: 2, alpha: 1, mode: 0, ch: { x: 0, y: 0, dir: 2, walk: 0, moving: false, seed: i * 3.7, style: styleOf(n), sit: false, rod: 0 }, said: 0 }));
function styleOf(n) { const s = Object.assign({}, STY[n.style % STY.length]); if (n.job === "haul" || n.job === "fix") s.hat = s.hat || "cap", s.hatCol = s.hatCol || "#e0b84c"; if (n.job === "run") { s.hat = "pony"; s.hatCol = "#d9534f"; } return s; }
const dirOf = (sx, sy) => ((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) % 8) + 8) % 8;
const dirW = (fx, fy) => { const a = P(0, 0), b = P(fx, fy); return dirOf(b.x - a.x, b.y - a.y); };
const CAP = { 2: { npc: 25, veh: 24, light: 12, dens: 1 }, 1: { npc: 17, veh: 16, light: 6, dens: 0.66 }, 0: { npc: 11, veh: 9, light: 0, dens: 0.38 } };
let view = null;
function inCam(x, y, m) { if (!view) return true; const p = P(x, y); return p.x > view.x0 - m && p.x < view.x1 + m && p.y > view.y0 - m && p.y < view.y1 + m * 1.5; }
function camView() { const w = NW.world, cam = w.cam, Z = w.zoom || 1, W = window.innerWidth, H = window.innerHeight; view = { x0: cam.x - W / 2 / Z, y0: cam.y - H / 2 / Z, x1: cam.x + W / 2 / Z, y1: cam.y + H / 2 / Z }; }
let qT = 0, qSlow = 0, qFast = 0, qN = 0, qLock = null, soundT = {}, qLast = 0;
function qualityTick() {
  if (qLock != null) { S.q = qLock; return; }
  const now = performance.now(), dt = qLast ? Math.min(0.5, (now - qLast) / 1000) : 0; qLast = now; if (!dt) return;      // jam dinding (dt mesin dibatasi 0,05 sehingga tak cukup)
  qT += dt; qN++; stat.frames++; if (dt > 0.036) { qSlow++; stat.slow++; } else if (dt < 0.026) qFast++;                    // lambat = di bawah ±27 fps
  if (qT >= 2.5) { if (qN >= 8 && qSlow > 0.5 * qN && S.q > 0) S.q--; else if (qSlow === 0 && qFast > 120 && S.q < 2 && (S.qBase || 2) > S.q) S.q++; qT = 0; qSlow = qFast = qN = 0; }
}
const rankV = (i) => (i * 0.61803) % 1;   // urutan tetap untuk memilih kendaraan yang tetap tampil saat kepadatan dikurangi
function update(dt) {
  const w = NW.world, pl = player();
  const clock = S.clock || (() => (Date.now() - Core.EPOCH_MS) / 1000);
  S.tw = clock(); S.hour = N().S.hour; S.night = clamp(N().darkness() / 0.85, 0, 1); S.ph = Core.lightPhase(S.tw); S.lamps = S.night > 0.18 || N().goldenHour() > 0.05;
  const wasIn = S.inCity; S.inCity = pl.x >= Core.X0 - 0.5; if (S.inCity !== wasIn && w.updateHint) w.updateHint(); S.active = pl.x > 26 && !!(w.cam);
  if (!S.active) { stat.npcVisible = stat.vehVisible = stat.npcActive = stat.vehActive = stat.lights = 0; return; }
  qualityTick(); const cap = CAP[S.q]; camView(); ensureUI();
  const tw = S.tw, hr = S.hour;
  // --- kendaraan ---
  let vOn = 0, vVis = 0, dn = 0;
  for (const v of VEH) {
    const i = v.i, want = Core.hash(i + 11, Core.periodIndex(tw)) < Core.density(hr) && rankV(i) < cap.dens + 0.001;
    if (!want) { v.on = false; v.vis = false; v.lag = 0; continue; }
    const st = Core.vehicleAt(TR, i, tw - v.lag);
    if (!st.on) { v.on = false; v.vis = false; if (v.lag > 0) v.lag = Math.max(0, v.lag - dt * 2); continue; }
    // beri jalan: tahan bila pemain / kendaraan lain ada tepat di depan; kejar kembali pelan-pelan
    let block = false;
    const dx = pl.x - st.x, dy = pl.y - st.y, ahead = dx * st.fx + dy * st.fy, lat = Math.abs(-dx * st.fy + dy * st.fx);
    if (ahead > -0.2 && ahead < st.L / 2 + 1.5 && lat < 0.7) block = true;
    if (Math.hypot(dx, dy) < st.L / 2 + 0.45) block = true;
    if (!block) for (const o of VEH) { if (o === v || !o.on) continue; const ox = o.x - st.x, oy = o.y - st.y, oa = ox * st.fx + oy * st.fy; if (oa <= 0 || oa > st.L / 2 + o.L / 2 + 0.55) continue; if (Math.abs(-ox * st.fy + oy * st.fx) < 0.55 && o.fx * st.fx + o.fy * st.fy > 0.6) { block = true; break; } }
    if (block) v.lag = Math.min(60, v.lag + dt); else if (v.lag > 0) v.lag = Math.max(0, v.lag - dt * 0.8);
    v.on = true; v.x = st.x; v.y = st.y; v.fx = st.fx; v.fy = st.fy; v.v = block ? 0 : st.v; v.braking = block || st.braking;
    const edge = Math.min(1, st.s / 1.5, (TR.polys[v.def.route].L - st.s) / 1.5); v.alpha = clamp(edge, 0, 1);
    v.vis = inCam(v.x, v.y, 160); vOn++; if (v.vis) vVis++;
  }
  stat.vehActive = vOn; stat.vehVisible = vVis;
  // slot kolisi: kendaraan terdekat dari pemain
  const near = VEH.filter((v) => v.on && Math.hypot(v.x - pl.x, v.y - pl.y) < 6).sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y)).slice(0, 8);
  for (let k = 0; k < 8; k++) { const v = near[k]; for (let j = 0; j < 3; j++) { const sl = DYN[k * 3 + j]; if (!v) { sl.x = -100; sl.y = -100; sl.r = 0; continue; } const o = (j - 1) * (v.L / 2 - v.W / 2); sl.x = v.x + v.fx * o; sl.y = v.y + v.fy * o; sl.r = Math.hypot(pl.x - sl.x, pl.y - sl.y) < v.W / 2 + 0.2 ? 0 : v.W / 2 + 0.05; } }
  // --- NPC ---
  let nOn = 0, nVis = 0, nSched = 0; const act = [];
  for (const n of NPCS) {
    if (!Core.npcActive(n.def, hr)) { n.on = false; n.vis = false; continue; }
    nSched++;
    const s = Core.npcAt(n.def, tw);
    if (s.alpha < 0.02) { n.on = false; n.vis = false; continue; }
    n.on = true; n.x = s.x; n.y = s.y; n.alpha = s.alpha; n.mode = s.mode; nOn++;
    const ch = n.ch; ch.x = s.x; ch.y = s.y; ch.moving = !!s.moving; ch.walk = s.walk; ch.sit = s.mode === 3 || s.mode === 6;
    ch.dir = n.def.job === "sit" ? dirW(0, 1) : dirW(s.fx, s.fy);
    if (s.mode === 4 && n.def.job === "fix") ch.moving = false;
    if (n.def.job === "bike") ch.moving = false;
    n.vis = inCam(n.x, n.y, 100); if (n.vis) act.push(n);
  }
  if (act.length > cap.npc) { act.sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y)); for (let k = cap.npc; k < act.length; k++) act[k].vis = false; nVis = cap.npc; } else nVis = act.length;
  stat.npcShown = nOn; stat.npcActive = nSched; stat.npcVisible = nVis;
  // --- lampu jalan & cahaya (hanya yang dekat kamera; array dipakai ulang) ---
  LAMPS.length = 0; if (LAMPS.base) for (const l of LAMPS.base) LAMPS.push(l);
  LIGHTS.length = 0; if (LIGHTS.base) for (const l of LIGHTS.base) LIGHTS.push(l);
  if (S.lamps) { for (const l of LAMP_ALL) if (inCam(l[0], l[1], 140)) LAMPS.push(l); }
  stat.lights = 0;
  if (S.night > 0.12 && cap.light > 0) {
    const room = () => stat.lights < cap.light;
    for (const v of VEH) if (v.on && v.vis && room()) { stat.lights++; LIGHTS.push(lightObj(stat.lights, v.x + v.fx * v.L * 0.55, v.y + v.fy * v.L * 0.55, 7, 30, "#fff1c4", 0.55)); }
    if (S.q >= 1) for (const b of LAY.buildings) if (b.shop && b.closeAt !== 0 && S.hour < b.closeAt + 0.0 && S.hour >= 6 && inCam(b.door.x, b.door.y, 120) && room()) { stat.lights++; LIGHTS.push(lightObj(stat.lights, b.door.x, b.door.y, 10, 44, "#ffcf86", 0.7)); }
    if (S.q >= 2) for (const b of LAY.buildings) if (b.floors >= 5 && inCam(b.door.x, b.door.y, 200) && room()) { stat.lights++; LIGHTS.push(lightObj(stat.lights, (b.x0 + b.x1) / 2, b.y1 - 0.2, b.floors * 12, 70, "#ffe39a", 0.34)); }
  }
  updateSound(dt, pl, hr); updateUI(dt, pl); updatePoints(pl);
}
const LPOOL = []; function lightObj(i, x, y, z, r, col, k) { const o = LPOOL[i] || (LPOOL[i] = {}); o.x = x; o.y = y; o.z = z; o.r = r; o.col = col; o.k = k; return o; }

// ---------- 5) lapisan gambar (urut kedalaman) ----------
const LAYER = [];
const bikeStyle = (n) => n.def.job === "bike";
function layer(t, base) {
  LAYER.length = 0; if (base) for (const b of base) LAYER.push(b);
  if (!S.active) return LAYER;
  for (const v of VEH) if (v.on && v.vis) LAYER.push(v.item || (v.item = { d: 0, draw: (c) => { c.globalAlpha = v.alpha; Art.drawVehicle(c, v, S.tw, S.night); c.globalAlpha = 1; } }));
  for (const v of VEH) if (v.on && v.vis) { v.item.d = v.x + v.y + 0.2; }
  for (const n of NPCS) if (n.on && n.vis) { LAYER.push(n.item || (n.item = { d: 0, draw: (c) => drawNpc(c, n, performance.now() / 1000) })); n.item.d = n.x + n.y + (n.def.job === "sit" ? 0.35 : 0); }
  return LAYER;
}
function drawNpc(c, n, t) {
  const ch = n.ch, d = n.def; c.globalAlpha = n.alpha;
  if (d.job === "bike") { const v = Core.npcAt(d, S.tw); Art.drawBike(c, ch.x, ch.y, v.fx, v.fy, t, ch.walk); }
  NW.drawCharacter(c, ch, t);
  if (n.mode === 4 && d.job === "haul") { const b = P(ch.x, ch.y, LIFT + 16); c.fillStyle = "#c9a46a"; c.fillRect(b.x - 6, b.y - 8, 12, 9); c.strokeStyle = "#8a6a3c"; c.lineWidth = 1; c.strokeRect(b.x - 6, b.y - 8, 12, 9); }
  c.globalAlpha = 1;
}
// jalur sepeda: pengayuh bergerak; "sit" membuat kaki menekuk. Kuas lampu rem & refleksi jalan malam:
function drawUnder(c, t, view_, inView, dk) {
  if (!S.active || S.night < 0.2 || S.q < 1) return;
  c.fillStyle = `rgba(255,220,150,${(0.11 * S.night).toFixed(3)})`;
  for (const l of LAMP_ALL) { if (!inView(view_, P(l[0], l[1]).x, P(l[0], l[1]).y, 90)) continue; const p = P(l[0], l[1] + 0.8, LIFT); c.beginPath(); c.ellipse(p.x, p.y, 15, 5.5, 0, 0, 7); c.fill(); }
}
function drawSkyK(c, t, dk, view_) {   // setelah lapisan malam: jendela menyala tetap terang
  if (!S.active || S.night < 0.1 || S.q < 1) return;
  for (const b of M.buildings) { if (b.kind !== "kcell" || b.parent.type === "rumah") continue; const p = P((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); if (p.x < view_.x0 - 200 || p.x > view_.x1 + 200 || p.y < view_.y0 - 300 || p.y > view_.y1 + 260) continue; Art.litPass(c, b, S.night); }
}
function drawOverK(c, t, dk, view_, inView) {
  if (!S.active) return;
  // papan gelembung bicara NPC dekat pemain
  const pl = player();
  for (const n of NPCS) { if (!n.on || !n.vis || n.alpha < 0.5) continue; const d = Math.hypot(n.x - pl.x, n.y - pl.y); if (d > 3.4) continue; const p = P(n.x, n.y, LIFT + (n.def.job === "sit" ? 44 : 52)); c.globalAlpha = clamp((3.4 - d) / 1.2, 0, 1) * n.alpha; c.font = "700 9px system-ui, sans-serif"; c.textAlign = "center"; c.lineWidth = 3; c.strokeStyle = "rgba(23,63,80,.85)"; c.strokeText(n.def.name, p.x, p.y); c.fillStyle = "#fff9ec"; c.fillText(n.def.name, p.x, p.y); c.globalAlpha = 1; }
}

// ---------- 6) interaksi: sapa warga & lihat papan toko (hanya dialog; tanpa ekonomi/quest) ----------
let PTS = [];
function updatePoints(pl) {
  PTS.length = 0; if (!S.inCity) return;
  for (const n of NPCS) if (n.on && n.alpha > 0.7 && Math.hypot(n.x - pl.x, n.y - pl.y) < 1.7 && n.def.lines) PTS.push({ id: "kota:" + n.def.id, x: n.x, y: n.y, r: 1.5, icon: "💬", label: "Sapa", kota: "npc", n });
  for (const b of LAY.buildings) if (b.id === "nusaphone" || b.id === "balai_kota" || b.id === "kantor_nusa" || b.id === "hotel") PTS.push({ id: "kota:" + b.id, x: b.door.x, y: b.door.y + 0.4, r: 1.3, icon: "🏙️", label: "Lihat", kota: "bld", b });
  PTS.push({ id: "kota:arah", x: 38.3, y: 21.0, r: 1.6, icon: "🧭", label: "Peta Kota", kota: "arah" });
}
const AVATAR = { door: "🧑‍💼", shop: "🛍️", stall: "🧺", cart: "🍧", sit: "🧓", chat: "🗣️", run: "🏃", bike: "🚲", haul: "📦", fix: "🔧", driver: "🚚", cross: "🚶", patrol: "🔦" };
const BTEXT = {
  nusaphone: ["Toko NusaPhone", "📱", ["Papan di pintu: \"SEGERA HADIR\". Etalasenya masih kosong dan lampunya redup.", "Toko ini baru tampak luarnya — belum ada barang yang dijual."]],
  balai_kota: ["Balai Kota Nusa", "🏛️", ["Gedung putih berpilar dengan jam besar di atapnya.", "Pegawai keluar-masuk membawa map. Hari ini hanya urusan kota yang tenang."]],
  kantor_nusa: ["Gedung Kantor Nusa", "🏢", ["Gedung kaca tujuh lantai. Lampu jendelanya menyala sampai malam."]],
  hotel: ["Hotel Bahari Nusa", "🏨", ["Hotel tinggi di sudut kota. Dari lantai atas, kata orang, laut terlihat sampai ke pelabuhan."]],
};
function interact(t, api, old) {
  if (!t.kota) return old && old(t, api);
  if (t.kota === "npc") { const n = t.n, d = n.def; n.said = (n.said + 1) % d.lines.length; api.openDialog({ name: d.name, avatar: AVATAR[d.job] || "🙂", lines: [d.lines[n.said]] }); return; }
  if (t.kota === "bld") { const b = BTEXT[t.b.id]; return api.openDialog({ name: b[0], avatar: b[1], lines: b[2] }); }
  if (t.kota === "arah") return api.openDialog({ name: "Peta Kota Nusa", avatar: "🧭", lines: ["Gerbang barat → kembali ke Pelabuhan Kota.", "Utara: kantor & apartemen · Tengah: pasar, ruko, Balai Kota · Selatan: taman kota & permukiman · Timur: perumahan."] });
}

// ---------- 7) petunjuk arah kembali ke Pelabuhan Kota ----------
let ui = null;
function ensureUI() {
  if (ui) return;
  ui = document.createElement("div"); ui.id = "kotaDir"; ui.setAttribute("aria-live", "off");
  ui.style.cssText = "position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);transform:translateX(-50%);z-index:30;display:none;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:rgba(23,63,80,.78);color:#fff9ec;font:700 12px system-ui,sans-serif;pointer-events:none;white-space:nowrap";
  ui.innerHTML = '<span id="kotaArr" style="display:inline-block;font-size:14px;transition:transform .15s">➤</span><span id="kotaTxt"></span>';
  document.body.appendChild(ui); ui.arr = ui.querySelector("#kotaArr"); ui.txt = ui.querySelector("#kotaTxt");
}
let uiT = 0;
function updateUI(dt, pl) {
  if (!ui) return; uiT -= dt; if (uiT > 0) return; uiT = 0.2;
  const show = S.inCity && pl.x > 40 && !(NW.boat && NW.boat.on);
  ui.style.display = show ? "flex" : "none"; if (!show) return;
  const gx = 36.6, gy = 21.0, a = P(pl.x, pl.y), b = P(gx, gy), ang = Math.atan2(b.y - a.y, b.x - a.x), d = Math.hypot(gx - pl.x, gy - pl.y);
  ui.arr.style.transform = `rotate(${ang}rad)`; ui.txt.textContent = d < 4 ? "Gerbang ke Pelabuhan Kota" : `Pelabuhan Kota · ${Math.round(d)} m`;
}

// ---------- 8) suara (malas dimuat, mengikuti pengaturan suara game lewat bus SFX) ----------
let audioReady = false;
function registerAudio() {
  if (audioReady) return; const lib = NW.sfxLib, K = NW.kit; if (!lib || !K || !K.noiseBuf) return; audioReady = true;
  const rand = (a, b) => a + Math.random() * (b - a);
  const tone = (ctx, out, t, f0, f1, dur, vol, type) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.03); K.track(o, [o, g]); };
  const nz = (ctx, out, t, type, f0, f1, q, dur, vol, att) => { const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = K.noiseBuf(ctx); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (att || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl).connect(g).connect(out); s.start(t, Math.random() * 2.4); s.stop(t + dur + 0.03); K.track(s, [s, fl, g]); };
  const L = lib.L, R = lib.RULE;
  L.kota_pasar = (c, o, t, k) => { const v = 0.05 * (k || 1); nz(c, o, t, "bandpass", 700, 520, 0.8, 0.9, v, 0.2); for (let i = 0; i < 3; i++) tone(c, o, t + rand(0, 0.8), rand(260, 420), rand(220, 380), rand(0.12, 0.24), v * 0.6, "triangle"); };
  L.kota_lewat = (c, o, t, k) => { const v = 0.07 * (k || 1); nz(c, o, t, "lowpass", 260, 700, 0.7, 1.4, v, 0.5); tone(c, o, t, 70, 90, 1.2, v * 0.8, "sawtooth"); };
  L.kota_bel = (c, o, t) => { tone(c, o, t, 2350, 0, 0.35, 0.05, "sine"); tone(c, o, t + 0.14, 2350, 0, 0.35, 0.045, "sine"); };
  L.kota_taman = (c, o, t, k) => { const v = 0.04 * (k || 1); for (let i = 0; i < 3; i++) tone(c, o, t + i * 0.13, rand(2400, 3200), rand(2800, 3600), 0.09, v, "sine"); nz(c, o, t, "highpass", 3000, 0, 0.7, 0.9, v * 0.5, 0.25); };
  L.kota_kantor = (c, o, t, k) => { const v = 0.03 * (k || 1); nz(c, o, t, "lowpass", 380, 0, 0.5, 1.6, v, 0.5); for (let i = 0; i < 5; i++) nz(c, o, t + 0.15 + i * rand(0.1, 0.22), "highpass", 3800, 0, 1, 0.018, v * 1.6, 0.001); };
  L.kota_jangkrik = (c, o, t, k) => { const v = 0.025 * (k || 1); for (let i = 0; i < 9; i++) tone(c, o, t + i * 0.09, 4300, 0, 0.05, v, "sine"); };
  L.kota_angin = (c, o, t, k) => { nz(c, o, t, "bandpass", 420, 900, 0.5, 2.6, 0.035 * (k || 1), 0.9); };
  L.kota_ombak = (c, o, t, k) => { nz(c, o, t, "lowpass", 380, 160, 0.4, 3.2, 0.03 * (k || 1), 1.3); };
  Object.assign(R, { kota_pasar: { gap: 2 }, kota_lewat: { gap: 2.5 }, kota_bel: { gap: 6 }, kota_taman: { gap: 2.5 }, kota_kantor: { gap: 5 }, kota_jangkrik: { gap: 2 }, kota_angin: { gap: 8 }, kota_ombak: { gap: 8 } });
}
function snd(name, k) { try { N().sfx(name, k); } catch (e) {} }
function due(key, every, jitter, dt) { soundT[key] = (soundT[key] == null ? Math.random() * every : soundT[key]) - dt; if (soundT[key] > 0) return false; soundT[key] = every + Math.random() * (jitter || 0); return true; }
function updateSound(dt, pl, hr) {
  if (!S.inCity) return; if (!audioReady) registerAudio(); if (!audioReady) return;
  const dm = Math.hypot(pl.x - 59.5, pl.y - 15), df = Math.hypot(pl.x - 68, pl.y - 41), dof = Math.hypot(pl.x - 76, pl.y - 15), dark = S.night > 0.55;
  if (dm < 11 && hr >= 6 && hr < 17.5 && due("pasar", 4, 2.5, dt)) snd("kota_pasar", clamp(1.3 - dm / 11, 0.3, 1));
  if (df < 10 && due("taman", 5, 4, dt)) snd(dark ? "kota_jangkrik" : "kota_taman", clamp(1.2 - df / 10, 0.3, 1));
  if (dof < 9 && hr >= 7 && hr < 19 && due("kantor", 8, 5, dt)) snd("kota_kantor", clamp(1.2 - dof / 9, 0.3, 1));
  if (dark && due("jangkrik", 4, 3, dt)) snd("kota_jangkrik", 0.8);
  if (dark && due("angin", 11, 7, dt)) snd("kota_angin", 1);
  if (due("ombak", 12, 8, dt)) snd("kota_ombak", clamp(1.15 - (pl.x - 36) / 40, 0.25, 1));
  for (const v of VEH) if (v.on && v.v > 1 && Math.hypot(v.x - pl.x, v.y - pl.y) < 5 && S.tw - v.last > 9) { v.last = S.tw; snd("kota_lewat", clamp(1.2 - Math.hypot(v.x - pl.x, v.y - pl.y) / 5, 0.3, 1)); break; }
  for (const n of NPCS) if (n.on && n.def.job === "bike" && Math.hypot(n.x - pl.x, n.y - pl.y) < 3 && S.tw - (n.bell || -99) > 12) { n.bell = S.tw; snd("kota_bel"); break; }
}

// ---------- 9) pasang kait ke area (komposisi dengan kait selat; selat.js tidak diubah) ----------
const hk = area.hooks, old = { update: hk.update, interact: hk.interact, points: hk.points, hint: hk.hint, drawOver: hk.drawOver, layer: hk.layer, drawUnder: hk.drawUnder, drawBack: hk.drawBack, drawSky: hk.drawSky };
function hookUp() {
  hk.update = (dt, api) => { if (old.update) old.update(dt, api); update(dt); };
  hk.layer = (t) => layer(t, old.layer ? old.layer(t) : null);
  hk.drawBack = (c, t, v, dk) => { if (old.drawBack) old.drawBack(c, t, v, dk); drawBack(c, t, v, dk); };
  hk.drawUnder = (c, t, v, iv, dk) => { if (old.drawUnder) old.drawUnder(c, t, v, iv, dk); drawUnder(c, t, v, iv, dk); };
  hk.drawSky = (c, t, dk, v) => { if (old.drawSky) old.drawSky(c, t, dk, v); drawSkyK(c, t, dk, v); };
  hk.drawOver = (c, t, dk, v, iv) => { if (old.drawOver) old.drawOver(c, t, dk, v, iv); drawOverK(c, t, dk, v, iv); };
  hk.points = () => (old.points ? old.points() : []).concat(PTS);
  hk.interact = (t, api) => interact(t, api, old.interact);
  hk.hint = () => { const h = old.hint ? old.hint() : "", goal = NW.port && NW.port.goalHint && NW.port.goalHint(); if (S.inCity && !goal) return "🏙️ Kota Nusa — jalan santai; kembali ke Pelabuhan Kota lewat gerbang barat"; return h; };
}
installMap(); installCity(); installTheme(); hookUp();
const q0 = (() => { const m = /[?&]kotaq=([012])/.exec(location.search); if (m) return +m[1]; const dm = navigator.deviceMemory, hc = navigator.hardwareConcurrency; return (dm && dm <= 3) || (hc && hc <= 4) ? 1 : 2; })();
S.q = q0; S.qBase = q0;
NW.kota = {
  S, LAY, TR, NPC, stat, VEH, NPCS, DYN, version: 1,
  stats: () => Object.assign({}, stat, { q: S.q, hour: S.hour, night: S.night }),
  setQuality: (q) => { qLock = q == null ? null : clamp(q | 0, 0, 2); if (qLock != null) S.q = qLock; },
  setClock: (fn) => { S.clock = fn; },
  inCity: () => S.inCity,
  get points() { return PTS; },
};
})();
