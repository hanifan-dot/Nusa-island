// NUSA ISLAND — Visual Kota Nusa (Ide 04, bagian visual). Inti MURNI (tanpa DOM/NW) agar bisa diuji di Node.
// Kota = perluasan area nyata "selat" ke timur (tidak ada ID area baru). NPC & kendaraan = visual LOKAL yang DETERMINISTIK:
// posisi = fungsi dari (waktu dinding, seed kota, jam game) → pemain berbeda melihat jadwal yang kurang lebih sama. Tidak ada tulis ke Firestore/D1.
(function (root, factory) { const api = factory(); if (typeof module === "object" && module.exports) module.exports = api; else root.NusaKotaCore = api; })(typeof self !== "undefined" ? self : this, function () {
"use strict";
const MW = 92, MH = 48, X0 = 37, Y0 = 2, Y1 = 45, XE = 89, FH = 24;           // peta baru (selat lama 40×40 di kiri); tinggi lantai (px)
const VX = [51, 67, 83], HY = [9, 20, 33], VY1 = [45, 34, 45];                 // jalan: x kiri 2 petak, y atas 2 petak; ujung selatan jalan tengah = jalan selatan
const K = { NONE: 0, ROAD: 1, WALK: 2, PLAZA: 3, LAWN: 4, YARD: 5, LOT: 6, MARKET: 7, BORDER: 8, TRACK: 9, BIKE: 10, INDUS: 11, ALLEY: 12 };
const T = { GRASS: 3, PATH: 4, FOREST: 7 };
const KT = [0, T.PATH, T.PATH, T.PATH, T.GRASS, T.GRASS, T.PATH, T.PATH, T.FOREST, T.PATH, T.PATH, T.PATH, T.PATH];
const CYCLE = 30, PERIOD = 150, EPOCH_MS = Date.UTC(2026, 0, 1);
const rng = (seed) => { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000000) / 1000000; }; };
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- lampu lalu lintas: satu siklus 30 dtk (EW hijau → kuning → semua merah+PEJALAN → NS hijau → kuning → pejalan) ----------
function lightPhase(t) {
  const c = ((t % CYCLE) + CYCLE) % CYCLE;
  if (c < 8) return { ew: "G", ns: "R", ped: false, c };
  if (c < 10) return { ew: "Y", ns: "R", ped: false, c };
  if (c < 16) return { ew: "R", ns: "R", ped: true, c };
  if (c < 23) return { ew: "R", ns: "G", ped: false, c };
  if (c < 25) return { ew: "R", ns: "Y", ped: false, c };
  return { ew: "R", ns: "R", ped: true, c };
}
// waktu aman (>= t) untuk MULAI menyeberang (penyeberangan <= 3 dtk): 1,5 dtk setelah jendela pejalan dibuka, sampai 3,2 dtk sebelum ditutup
function nextPedGo(t) {
  const base = Math.floor(t / CYCLE) * CYCLE, W = [[10, 16], [25, 30]];
  for (let k = 0; k < 3; k++) for (const [a, b] of W) { const s0 = base + k * CYCLE + a + 1.5, s1 = base + k * CYCLE + b - 3.2; if (t <= s1) return Math.max(t, s0); }
  return t;
}
// ---------- kepadatan menurut jam game (0–24) ----------
// NPC aktif ditentukan jendela jam tiap NPC; kendaraan memakai kepadatan ini (dipilih per periode 150 dtk, deterministik)
function density(h) {
  h = ((h % 24) + 24) % 24;
  if (h >= 7 && h < 16.5) return 1;                    // pagi–siang: ramai
  if (h >= 16.5 && h < 19) return 0.8;                 // sore: sedikit meningkat
  if (h >= 19 && h < 21) return 0.45;
  if (h >= 21 || h < 4.5) return 0.18;                 // malam: tenang, bukan mati
  return h < 7 ? 0.35 + 0.65 * ((h - 4.5) / 2.5) : 1;
}
const dayPart = (h) => { h = ((h % 24) + 24) % 24; return h >= 5 && h < 11 ? "pagi" : h >= 11 && h < 16 ? "siang" : h >= 16 && h < 19 ? "sore" : "malam"; };

// ---------- tata kota ----------
function build() {
  const kind = new Uint8Array(MW * MH), R = rng(20261113);
  const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
  const rect = (k, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) kind[y * MW + x] = k; };
  const at = (x, y) => (inb(x, y) ? kind[y * MW + x] : K.BORDER);
  rect(K.BORDER, X0, 0, MW - 1, MH - 1); rect(K.LAWN, X0, Y0, XE, Y1); rect(K.WALK, X0, Y0, X0, Y1);
  HY.forEach((r) => rect(K.ROAD, X0, r, XE, r + 1)); VX.forEach((c, i) => rect(K.ROAD, c, Y0, c + 1, VY1[i]));
  const walk = [];
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= XE; x++) { if (at(x, y) === K.ROAD) continue; let n = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === K.ROAD) n = true; if (n) walk.push([x, y]); }
  walk.forEach(([x, y]) => { kind[y * MW + x] = K.WALK; });
  // kawasan
  rect(K.LOT, 38, 2, 49, 7); rect(K.INDUS, 38, 12, 49, 18); rect(K.PLAZA, 38, 23, 49, 31); rect(K.YARD, 38, 36, 49, 45); rect(K.ALLEY, 38, 41, 49, 41); rect(K.ALLEY, 44, 36, 44, 45);
  rect(K.PLAZA, 54, 2, 65, 7); rect(K.MARKET, 54, 12, 65, 18); rect(K.PLAZA, 54, 23, 65, 31);
  rect(K.PLAZA, 70, 2, 81, 7); rect(K.PLAZA, 70, 12, 81, 18); rect(K.PLAZA, 70, 23, 81, 29); rect(K.LAWN, 70, 30, 81, 31);
  rect(K.YARD, 86, 2, 89, 45); rect(K.ALLEY, 86, 10, 89, 10); rect(K.ALLEY, 86, 21, 89, 21); rect(K.ALLEY, 86, 34, 89, 34);
  // taman kota (x54–81, y36–45): jalur sepeda (luar), jalur lari (dalam), plaza air mancur
  rect(K.LAWN, 54, 36, 81, 45);
  for (let x = 55; x <= 80; x++) { rect(K.BIKE, x, 37, x, 37); rect(K.BIKE, x, 44, x, 44); } for (let y = 37; y <= 44; y++) { rect(K.BIKE, 55, y, 55, y); rect(K.BIKE, 80, y, 80, y); }
  for (let x = 57; x <= 78; x++) { rect(K.TRACK, x, 38, x, 38); rect(K.TRACK, x, 43, x, 43); } for (let y = 38; y <= 43; y++) { rect(K.TRACK, 57, y, 57, y); rect(K.TRACK, 78, y, 78, y); }
  rect(K.PLAZA, 65, 39, 70, 42); rect(K.WALK, 67, 36, 68, 38);
  const tiles = new Uint8Array(MW * MH); for (let i = 0; i < tiles.length; i++) tiles[i] = KT[kind[i]];

  // ---------- bangunan ----------
  const buildings = [], doors = {};
  const pal = [["#e9d8b4", "#b5533c"], ["#d9e4ea", "#46739a"], ["#f1dfc2", "#8a5a3c"], ["#e4d0d8", "#7b4a6a"], ["#d8e7d0", "#4f7d5a"], ["#efe6c8", "#c28a3a"], ["#cfd8e6", "#5a6b8a"]];
  function bld(id, type, x0, y0, x1, y1, floors, o) {
    o = o || {}; const p = o.pal || pal[(buildings.length * 3 + 1) % pal.length], h = o.h || floors * FH + 8;
    const b = { id, type, x0, y0, x1, y1, floors, h, wall: o.wall || p[0], roof: o.roof || p[1], accent: o.accent || "#e0b84c", name: o.name || id, sign: o.sign || null, shop: !!o.shop, closeAt: o.closeAt || 0, side: o.side || "y", u: o.u == null ? 0.5 : o.u, flat: o.flat !== false, stilts: 0, extra: o.extra || null };
    const w = x1 - x0, d = y1 - y0;
    b.door = b.side === "y" ? { x: x0 + w * b.u, y: y1 + 0.55 } : { x: x1 + 0.55, y: y0 + d * b.u };       // titik di depan pintu (di jalur jalan)
    doors[id] = b.door; buildings.push(b); return b;
  }
  // 1) pelabuhan & industri
  bld("gudang_ikan", "gudang", 38.8, 12.8, 44.2, 18.0, 2, { h: 52, pal: ["#cdd6dc", "#5b7f99"], name: "Gudang Ikan", sign: "GUDANG IKAN", u: 0.5, extra: "roller" });
  bld("gudang_logistik", "gudang", 45.4, 12.8, 49.4, 18.0, 2, { h: 64, pal: ["#d9cdb4", "#7a5a46"], name: "Gudang Logistik", sign: "LOGISTIK", u: 0.5, extra: "roller" });
  bld("pos_gerbang", "pos", 38.0, 18.05, 39.4, 18.8, 1, { h: 28, pal: ["#e8dcc0", "#b5533c"], name: "Pos Gerbang", u: 0.5, extra: null });
  bld("bengkel", "bengkel", 38.8, 24.2, 44.4, 29.6, 1, { h: 40, pal: ["#d9b98c", "#4a5a68"], name: "Bengkel Jaya", sign: "BENGKEL JAYA", u: 0.55, extra: "garage" });
  bld("warung_bahari", "warung", 45.6, 24.4, 49.4, 28.4, 1, { h: 36, pal: ["#f1dfc2", "#2f7a8c"], name: "Warung Makan Bahari", sign: "WARUNG BAHARI", shop: true, closeAt: 23.5, u: 0.5, extra: "awning" });
  // 2) pasar & ruko
  bld("pasar_gerbang", "arch", 58.2, 18.0, 60.8, 18.8, 1, { h: 54, pal: ["#e0b84c", "#c9553b"], name: "Gerbang Pasar", sign: "PASAR KOTA NUSA", u: 0.5, extra: "arch" });
  bld("ruko_n1", "ruko", 54.6, 2.8, 59.4, 7.4, 3, { pal: ["#f1dfc2", "#b5533c"], name: "Ruko Mawar", sign: "MAWAR", shop: true, closeAt: 21, u: 0.35, extra: "awning" });
  bld("ruko_n2", "ruko", 60.0, 2.8, 65.4, 7.4, 2, { pal: ["#d9e4ea", "#46739a"], name: "Warung Makan Sari Laut", sign: "SARI LAUT", shop: true, closeAt: 23, u: 0.5, extra: "awning" });
  bld("ruko_s1", "ruko", 54.6, 24.0, 58.4, 31.0, 3, { pal: ["#efe6c8", "#8a5a3c"], name: "Toko Kelontong Berkah", sign: "KELONTONG BERKAH", shop: true, closeAt: 20, u: 0.5, extra: "awning" });
  bld("ruko_s2", "ruko", 59.0, 24.0, 62.2, 31.0, 2, { pal: ["#d8e7d0", "#4f7d5a"], name: "Toko Bangunan Tiga Saudara", sign: "TIGA SAUDARA", shop: true, closeAt: 18, u: 0.5, extra: "awning" });
  bld("nusaphone", "ruko", 62.8, 24.0, 65.6, 31.0, 2, { pal: ["#e6eef6", "#2b6f97"], name: "Toko NusaPhone", sign: "NUSAPHONE", shop: true, closeAt: 0, u: 0.5, extra: "phone" });
  // 3) pusat kota
  bld("kantor_nusa", "kantor", 70.6, 12.8, 75.6, 18.0, 7, { pal: ["#cfd8e6", "#5a6b8a"], name: "Gedung Kantor Nusa", sign: "KANTOR NUSA", u: 0.5, extra: "tower" });
  bld("hotel", "kantor", 76.4, 12.8, 81.4, 18.0, 8, { pal: ["#e9d8c4", "#8a4a3c"], name: "Hotel Bahari Nusa", sign: "HOTEL BAHARI", u: 0.5, extra: "hotel" });
  bld("kantor_2", "kantor", 70.6, 3.0, 75.4, 7.4, 5, { pal: ["#d8e7d0", "#3f6f8a"], name: "Kantor Samudra", sign: "SAMUDRA", u: 0.5, extra: "tower" });
  bld("apartemen", "kantor", 76.4, 3.0, 81.4, 7.4, 7, { pal: ["#efe6c8", "#6a4a8a"], name: "Apartemen Bayu", sign: "APARTEMEN BAYU", u: 0.5, extra: "tower" });
  bld("balai_kota", "balai", 70.8, 24.0, 80.8, 29.2, 4, { pal: ["#f3e9d2", "#a3453a"], name: "Balai Kota Nusa", sign: "BALAI KOTA", u: 0.5, extra: "balai" });
  // 5) permukiman (variasi ukuran, bentuk, warna; pintu menghadap selatan)
  const houses = [];
  function house(x0, y0, w, d, o) {
    o = o || {}; const i = houses.length, p = pal[(i * 5 + 2) % pal.length];
    const b = bld("rumah_" + i, "rumah", x0, y0, x0 + w, y0 + d, o.floors || 1, { h: (o.floors || 1) * 30 + 6, pal: o.pal || p, name: "Rumah warga", u: o.u == null ? 0.5 : o.u, side: "y", extra: o.extra || null });
    b.hip = o.hip !== false; b.porch = !!o.porch; b.fence = !!o.fence; b.laundry = !!o.laundry; b.plants = o.plants == null ? 2 : o.plants; b.flat = false; houses.push(b); return b;
  }
  [[38.7, 36.5, 3.4, 3.0, { porch: 1, fence: 1, laundry: 1 }], [45.0, 36.4, 3.8, 3.2, { floors: 2, porch: 1 }], [38.9, 42.2, 3.0, 2.6, { plants: 3, laundry: 1 }], [40.5, 42.3, 0, 0, null], [45.3, 42.1, 3.6, 2.8, { porch: 1, fence: 1 }]]
    .forEach(([x, y, w, d, o]) => { if (w) house(x, y, w, d, o); });
  house(42.9, 42.3, 1.7, 2.2, { plants: 1 });
  [[86.4, 3.2, 2.8, 3.4, { porch: 1, laundry: 1 }], [86.5, 12.4, 2.6, 3.0, { fence: 1, plants: 3 }], [86.3, 16.2, 3.0, 2.6, { floors: 2, porch: 1 }], [86.5, 24.4, 2.8, 2.4, { laundry: 1 }], [86.4, 28.0, 2.6, 2.4, { fence: 1, porch: 1 }], [86.5, 36.6, 2.8, 2.5, { porch: 1, plants: 3 }], [86.4, 40.2, 3.0, 3.4, { floors: 2, fence: 1 }]]
    .forEach(([x, y, w, d, o]) => house(x, y, w, d, o));

  // ---------- properti, pohon, lampu, kolisi ----------
  const objects = [], solids = [], lamps = [], benches = [], stalls = [], trees = [];
  const prop = (o, s) => { objects.push(o); if (s) solids.push(s); return o; };
  const circ = (o, r) => prop(o, { x: o.x, y: o.y, r });
  // pagar kawasan di x=37 (gerbang terbuka y 18.9–23.1) dan gerbang
  solids.push({ x0: 36.85, y0: 1.9, x1: 37.2, y1: 18.85 }, { x0: 36.85, y0: 23.15, x1: 37.2, y1: 45.9 });
  prop({ kind: "k_gate", x: 37.1, y: 21.0, big: 150 }, null); circ({ kind: "k_pillar", x: 37.1, y: 18.95, big: 20 }, 0.22); circ({ kind: "k_pillar", x: 37.1, y: 23.05, big: 20 }, 0.22);
  prop({ kind: "k_fenceline", x0: 36.9, y0: 2, x1: 36.9, y1: 18.8, big: 120 }, null); prop({ kind: "k_fenceline", x0: 36.9, y0: 23.2, x1: 36.9, y1: 45.5, big: 120 }, null);
  // lampu jalan sepanjang jalan (trotoar), selang-seling
  const nearInter = (v, arr, pad) => arr.some((c) => v > c - pad && v < c + 2 + pad);
  HY.forEach((r, i) => { for (let x = 40.5, j = 0; x < XE; x += 5.5, j++) { if (nearInter(x, VX, 2.4)) continue; const y = j % 2 ? r + 2.45 : r - 0.45; lamps.push([x, y]); } });
  VX.forEach((c, i) => { for (let y = 5, j = 0; y < VY1[i]; y += 5.5, j++) { if (nearInter(y, HY, 2.4)) continue; const x = j % 2 ? c + 2.45 : c - 0.45; lamps.push([x, y]); } });
  // taman: lampu dekat jalur
  [[56.5, 38.0], [79.5, 38.0], [56.5, 44.0], [79.5, 44.0], [66.0, 38.0]].forEach((l) => lamps.push(l));
  lamps.forEach(([x, y]) => prop({ kind: "lamp", x, y }, { x, y, r: 0.16 }));
  // lampu lalu lintas: 4 tiang per persimpangan (di sudut trotoar) + penyeberangan tengah blok di depan pasar
  const lightNodes = [];
  HY.forEach((r, ri) => VX.forEach((c, ci) => {
    if (c === 67 && r === 33 + 0 && false) return;
    lightNodes.push({ id: "L" + ri + ci, x0: c, y0: r, x1: c + 2, y1: r + 2, cx: c + 1, cy: r + 1, poles: [[c - 0.55, r - 0.55], [c + 2.55, r - 0.55], [c - 0.55, r + 2.55], [c + 2.55, r + 2.55]] });
  }));
  lightNodes.forEach((n) => n.poles.forEach(([x, y], k) => prop({ kind: "k_light", x, y, node: n.id, idx: k, big: 70 }, { x, y, r: 0.14 })));
  const PELICAN = { id: "PEL", x0: 58.5, y0: 20, x1: 60.5, y1: 22, cx: 59.5, cy: 21, ped: true };
  [[58.0, 19.7], [61.0, 19.7], [58.0, 22.4], [61.0, 22.4]].forEach(([x, y]) => prop({ kind: "k_ped", x, y, big: 60 }, { x, y, r: 0.13 }));
  // pasar: lapak
  [[55.4, 13.4], [58.0, 13.4], [61.2, 13.4], [63.8, 13.4], [55.4, 16.4], [58.0, 16.4], [61.2, 16.4], [63.8, 16.4]].forEach(([x, y], i) => { const st = prop({ kind: "k_stall", x, y, col: ["#c9553b", "#2f7a8c", "#e0b84c", "#6a8f3a", "#8a4a8a"][i % 5], big: 70, i }, { x0: x - 0.8, y0: y - 0.55, x1: x + 0.8, y1: y + 0.55 }); stalls.push({ x, y, i, front: { x, y: y + 1.0 } }); });
  circ({ kind: "k_pillar", x: 58.4, y: 18.5, big: 20 }, 0.2); circ({ kind: "k_pillar", x: 60.6, y: 18.5, big: 20 }, 0.2);
  // pelabuhan: truk parkir, drum, peti
  [[40.4, 3.4], [43.6, 3.4], [46.8, 3.4], [40.4, 6.2], [43.6, 6.2]].forEach(([x, y], i) => prop({ kind: "k_parked", x, y, vt: ["tangki", "sawit", "boks", "pendingin", "angkutmotor"][i], fx: 1, fy: 0, big: 110, col: i }, { x0: x - 1.2, y0: y - 0.45, x1: x + 1.2, y1: y + 0.45 }));
  [[39.4, 19.8], [40.2, 19.8], [47.6, 11.4], [48.4, 11.4]].forEach(([x, y]) => circ({ kind: "barrel", x, y }, 0.28));
  [[46.0, 19.8], [46.8, 19.8], [44.6, 11.4]].forEach(([x, y], i) => circ({ kind: "crate", x, y, s: i % 2 ? 0.8 : 1 }, 0.28));
  circ({ kind: "k_tires", x: 39.7, y: 30.5, big: 40 }, 0.35); prop({ kind: "k_parked", x: 41.0, y: 31.1, vt: "mobil", fx: 1, fy: 0, big: 90, col: 5 }, { x0: 40.2, y0: 30.8, x1: 41.8, y1: 31.4 });
  // warung bahari: meja & bangku
  [[46.4, 29.6], [48.0, 29.6], [47.2, 30.7]].forEach(([x, y]) => circ({ kind: "k_table", x, y, big: 30 }, 0.34));
  // ruko: kursi/pot, mobil parkir
  [[56.0, 32.2], [60.5, 32.2], [64.2, 32.2]].forEach(([x, y]) => circ({ kind: "k_planter", x, y, big: 30 }, 0.3));
  // pusat kota: tiang bendera, taman kecil, bangku
  circ({ kind: "k_flag", x: 74.0, y: 31.0, big: 120 }, 0.15); circ({ kind: "k_flag", x: 78.0, y: 31.0, big: 120 }, 0.15);
  [[72.0, 30.6], [79.6, 30.6]].forEach(([x, y]) => { circ({ kind: "bench", x, y, dir: "x" }, 0.32); benches.push({ x, y, sit: { x, y: y - 0.05 } }); });
  [[72.2, 19.9], [78.6, 8.9]].forEach(([x, y]) => circ({ kind: "k_planter", x, y, big: 30 }, 0.3));
  // taman: air mancur, bangku, pohon, gerobak pedagang
  prop({ kind: "k_fountain", x: 68.0, y: 41.0, big: 100 }, { x: 68.0, y: 41.0, r: 1.1 });
  [[60.5, 40.5], [63.0, 39.6], [72.5, 39.6], [75.0, 41.8], [65.9, 39.5], [60.2, 42.0]].forEach(([x, y]) => { circ({ kind: "bench", x, y, dir: "x" }, 0.32); benches.push({ x, y, sit: { x, y: y - 0.05 } }); });
  const cartAt = [[59.5, 36.2], [76.5, 36.2]]; cartAt.forEach(([x, y], i) => prop({ kind: "k_cart", x, y, col: i ? "#e0b84c" : "#2f7a8c", big: 60 }, { x0: x - 0.6, y0: y - 0.35, x1: x + 0.6, y1: y + 0.35 }));
  [[59, 40.6], [61.5, 41.2], [64, 40.2], [71.5, 40.2], [73.5, 41.6], [76.2, 40.6], [62.2, 39.4], [74.2, 39.6], [59.4, 41.8], [76.4, 42.2]].forEach(([x, y], i) => { const o = { kind: "tree", x, y, s: 1.0 + (i % 3) * 0.12, hue: R(), fade: true }; prop(o, { x, y, r: 0.38 * o.s }); trees.push(o); });
  // pohon peneduh & semak di blok lain
  const treePts = [[54.6, 32.4], [65.6, 32.4], [66.0, 11.6], [54.2, 11.6], [49.4, 33.0], [70.2, 11.6], [81.4, 32.4], [70.2, 32.4], [85.6, 8.4], [85.6, 31.8], [85.6, 22.6], [38.4, 32.4], [82.4, 19.5], [66.4, 22.6]];
  treePts.forEach(([x, y]) => { const o = { kind: "tree", x, y, s: 0.9 + R() * 0.3, hue: R(), fade: true }; if (kind[(y | 0) * MW + (x | 0)] === K.ROAD) return; prop(o, { x, y, r: 0.38 * o.s }); trees.push(o); });
  // rumah: pagar depan, jemuran, tanaman
  houses.forEach((b, i) => { if (b.fence) { prop({ kind: "k_fence", x0: b.x0 - 0.3, y0: b.y1 + 0.25, x1: b.x1 + 0.3, y1: b.y1 + 0.25, gap: (b.x0 + b.x1) / 2, big: 80 }, null); solids.push({ x0: b.x0 - 0.3, y0: b.y1 + 0.2, x1: (b.x0 + b.x1) / 2 - 0.55, y1: b.y1 + 0.32 }, { x0: (b.x0 + b.x1) / 2 + 0.55, y0: b.y1 + 0.2, x1: b.x1 + 0.3, y1: b.y1 + 0.32 }); }
    for (let k = 0; k < b.plants; k++) { const x = b.x0 + 0.35 + k * 0.7, y = b.y1 + 0.55; if (!b.fence && Math.abs(x - b.door.x) > 0.75) { prop({ kind: "bush", x, y, s: 0.5, flowers: true }, { x, y, r: 0.15 }); } }
    if (b.laundry) prop({ kind: "k_laundry", x: b.x1 + 0.7, y: b.y0 + 0.9, big: 60, i }, { x: b.x1 + 0.7, y: b.y0 + 0.9, r: 0.14 }); });
  // bangunan jadi kolisi (sedikit lebih kecil dari gambar)
  buildings.forEach((b) => { if (b.id === "pasar_gerbang") return; solids.push({ x0: b.x0 + 0.03, y0: b.y0 + 0.03, x1: b.x1 - 0.03, y1: b.y1 - 0.03 }); });
  // papan arah
  prop({ kind: "k_dirsign", x: 38.8, y: 22.6, txt: "KOTA NUSA →", big: 60 }, { x: 38.8, y: 22.6, r: 0.15 });
  prop({ kind: "k_dirsign", x: 47.4, y: 22.6, txt: "← Pelabuhan", big: 60, back: true }, { x: 47.4, y: 22.6, r: 0.15 });
  prop({ kind: "k_dirsign", x: 49.0, y: 19.5, txt: "Jalan Keluar Pelabuhan →", big: 60 }, { x: 49.0, y: 19.5, r: 0.15 });

  // ---------- jalur: jalan raya (jalur kendaraan), jalur lari, jalur sepeda ----------
  const E = (i) => HY[i] + 0.5, W = (i) => HY[i] + 1.5, Nn = (j) => VX[j] + 0.5, Ss = (j) => VX[j] + 1.5;
  const routes = [
    { id: "R0", pts: [[37.2, E(1)], [89.8, E(1)]] },                                                                       // gerbang → timur (lurus)
    { id: "R1", pts: [[89.8, W(1)], [37.2, W(1)]] },                                                                       // timur → gerbang
    { id: "R2", pts: [[37.2, E(1)], [Nn(0), E(1)], [Nn(0), 2.2]] },                                                        // belok kiri ke utara (x=51)
    { id: "R3", pts: [[Ss(1), 2.2], [Ss(1), E(2)], [89.8, E(2)]] },                                                        // utara → selatan → belok kiri ke timur (jalan selatan)
    { id: "R4", pts: [[Nn(2), 45.8], [Nn(2), 2.2]] },                                                                      // selatan → utara (x=83)
    { id: "R5", pts: [[89.8, W(0)], [Ss(0), W(0)], [Ss(0), 45.8]] },                                                       // timur (jalan utara) → belok kiri ke selatan
    { id: "R6", pts: [[89.8, W(2)], [Ss(0), W(2)], [Ss(0), 45.8]] },                                                       // timur (jalan selatan) → selatan
    { id: "R7", pts: [[Ss(2), 2.2], [Ss(2), 45.8]] },                                                                      // utara → selatan (x=84)
    { id: "R8", pts: [[37.2, E(1)], [Nn(1), E(1)], [Nn(1), W(0)], [38.6, W(0)]] },                                         // gerbang → utara → barat ke parkir truk
    { id: "R9", pts: [[38.6, E(0)], [89.8, E(0)]] },                                                                       // parkir truk → timur (jalan utara)
  ];
  const rrect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  const runLoop = rrect(57.5, 38.5, 78.5, 43.5), bikeLoop = rrect(55.5, 37.5, 80.5, 44.5);   // jalur lari (tengah petak) dan jalur sepeda
  const geo = { E, W, Nn, Ss };
  return { MW, MH, X0, kind, tiles, buildings, doors, houses, objects, solids, lamps, benches, stalls, trees, lightNodes, PELICAN, routes, runLoop, bikeLoop, geo, K, VX, HY, VY1, XE, Y0, Y1 };
}

// ---------- rute & mikrosimulasi lalu lintas (tabel keadaan per periode; deterministik) ----------
function polyOf(pts, round) {   // polyline dengan sudut dibulatkan (busur kecil) + panjang kumulatif
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1], r = round;
    const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]), d2 = Math.hypot(c[0] - b[0], c[1] - b[1]), rr = Math.min(r, d1 / 2, d2 / 2);
    const p0 = [b[0] + (a[0] - b[0]) / d1 * rr, b[1] + (a[1] - b[1]) / d1 * rr], p1 = [b[0] + (c[0] - b[0]) / d2 * rr, b[1] + (c[1] - b[1]) / d2 * rr];
    for (let k = 0; k <= 4; k++) { const u = k / 4, x = (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * b[0] + u * u * p1[0], y = (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * b[1] + u * u * p1[1]; out.push([x, y]); }
  }
  out.push(pts[pts.length - 1].slice());
  const cum = [0]; for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { p: out, cum, L: cum[cum.length - 1] };
}
function posOn(poly, s) {   // titik + arah (vektor satuan) pada jarak s
  s = clamp(s, 0, poly.L); const c = poly.cum; let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const a = poly.p[lo], b = poly.p[hi], d = c[hi] - c[lo] || 1, u = (s - c[lo]) / d;
  return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), fx: (b[0] - a[0]) / d, fy: (b[1] - a[1]) / d };
}
const VT = {   // panjang, lebar (petak), kecepatan maks (petak/dtk)
  mobil: { L: 1.15, W: 0.6, v: 2.7 }, boks: { L: 1.6, W: 0.7, v: 2.3 }, pendingin: { L: 1.7, W: 0.7, v: 2.3 }, tangki: { L: 2.1, W: 0.72, v: 2.0 },
  sawit: { L: 2.0, W: 0.72, v: 2.0 }, angkutmotor: { L: 2.3, W: 0.72, v: 2.0 }, motor: { L: 0.7, W: 0.3, v: 3.0 }, sepeda: { L: 0.65, W: 0.25, v: 1.3 },
};
function vehicleDefs() {   // 24 kendaraan jalan raya + 3 sepeda di jalur taman; (rute, mulai dalam periode)
  const D = [
    ["mobil", "R0", 2], ["mobil", "R0", 41], ["pendingin", "R0", 20], ["boks", "R0", 62], ["motor", "R0", 30],
    ["mobil", "R1", 8], ["tangki", "R1", 35], ["motor", "R1", 55], ["sawit", "R1", 52],
    ["mobil", "R2", 15], ["motor", "R2", 52], ["boks", "R3", 5], ["mobil", "R3", 46], ["angkutmotor", "R4", 25],
    ["mobil", "R4", 70], ["pendingin", "R5", 12], ["motor", "R5", 58], ["sawit", "R6", 28], ["mobil", "R6", 66],
    ["mobil", "R7", 10], ["motor", "R7", 44], ["tangki", "R8", 18], ["boks", "R8", 60], ["mobil", "R9", 34],
  ];
  return D.map(([type, route, t0], i) => ({ id: "v" + i, type, route, t0, col: i, kind: "road" }));
}
function buildTraffic(layout) {
  const DT = 0.1, steps = Math.round(PERIOD / DT);
  const polys = {}; layout.routes.forEach((r) => { polys[r.id] = polyOf(r.pts, 0.45); });
  const defs = vehicleDefs(), nodes = layout.lightNodes.concat([layout.PELICAN]);
  // titik berhenti tiap rute di tiap node: s_masuk (kotak) dan s_keluar
  const stops = {};
  for (const r of layout.routes) {
    const pl = polys[r.id], list = [];
    for (const n of nodes) {
      let sIn = null, sOut = null, axis = null;
      for (let s = 0; s <= pl.L; s += 0.05) { const p = posOn(pl, s), inside = p.x > n.x0 + 0.02 && p.x < n.x1 - 0.02 && p.y > n.y0 + 0.02 && p.y < n.y1 - 0.02; if (inside && sIn === null) { sIn = s; axis = Math.abs(p.fx) > Math.abs(p.fy) ? "ew" : "ns"; } if (!inside && sIn !== null && sOut === null) { sOut = s; break; } }
      if (sIn !== null) list.push({ n: n.id, sIn, sOut: sOut === null ? pl.L : sOut, axis, ped: !!n.ped, margin: n.ped ? 0.25 : 1.15 });   // 1 petak penyeberangan di depan kotak
    }
    stops[r.id] = list.sort((a, b) => a.sIn - b.sIn);
  }
  const V = defs.map((d) => ({ d, t: VT[d.type], poly: polys[d.route], stops: stops[d.route], s: 0, v: 0, started: false, done: false, ser: new Float32Array(steps + 1).fill(NaN) }));
  const A = 1.7, B = 3.4;
  for (let k = 0; k <= steps; k++) {
    const time = k * DT, ph = lightPhase(time);
    const pos = V.map((u) => (u.started && !u.done ? posOn(u.poly, u.s) : null));
    for (let i = 0; i < V.length; i++) {
      const u = V[i]; if (u.done) continue;
      if (!u.started) { if (time >= u.d.t0) { u.started = true; u.s = 0; u.v = u.t.v * 0.5; } else continue; }
      u.ser[k] = u.s;
      const me = pos[i] || posOn(u.poly, u.s); let vt = u.t.v, brake = 1e9;
      for (const st of u.stops) {                                                     // lampu / penyeberangan
        const sStop = st.sIn - st.margin - u.t.L / 2, dist = sStop - u.s;
        if (u.s > st.sIn - 0.05) { if (u.s < st.sOut + 4 && !st.ped) { /* melambat di persimpangan */ vt = Math.min(vt, u.t.v * 0.62); } continue; }
        if (dist < -0.3) continue;
        const red = st.ped ? ph.ped : (st.axis === "ew" ? ph.ew : ph.ns);
        const slowZone = dist < 3.2 && !st.ped; if (slowZone) vt = Math.min(vt, u.t.v * 0.62);
        if (red === "R" || red === true || (red === "Y" && dist > u.v * u.v / (2 * B) + 0.6)) brake = Math.min(brake, Math.max(0, dist));
      }
      for (let j = 0; j < V.length; j++) {                                              // mobil di depan pada jalur yang sama
        if (j === i || !pos[j]) continue; const o = pos[j], dx = o.x - me.x, dy = o.y - me.y, ahead = dx * me.fx + dy * me.fy;
        if (ahead <= 0 || ahead > 6) continue; const lat = Math.abs(-dx * me.fy + dy * me.fx), same = o.fx * me.fx + o.fy * me.fy > 0.6;
        if (!same || lat > 0.55) continue; const gap = ahead - (u.t.L + V[j].t.L) / 2 - 0.35; brake = Math.min(brake, Math.max(0, gap));
      }
      const vb = Math.sqrt(2 * B * Math.max(0, brake - 0.05)); vt = Math.min(vt, vb);
      u.v = u.v < vt ? Math.min(vt, u.v + A * DT) : Math.max(vt, u.v - B * DT);
      u.s += u.v * DT; if (u.s >= u.poly.L) { u.s = u.poly.L; u.done = true; u.ser[k] = u.s; }
    }
  }
  const out = { DT, steps, V, polys, defs: V.map((u) => ({ ...u.d, L: u.t.L, W: u.t.W })) };
  out.finish = V.map((u) => { let last = -1; for (let k = 0; k <= steps; k++) if (u.done && !(u.ser[k] < u.poly.L - 1e-6) && !Number.isNaN(u.ser[k])) { last = k; break; } return last < 0 ? Infinity : last * DT; });
  return out;
}
// keadaan kendaraan i pada waktu dinding t (detik) → {x,y,fx,fy,v,braking,on}; di luar jendela jalannya: on=false
function vehicleAt(tr, i, t) {
  const u = tr.V[i], ph = ((t % PERIOD) + PERIOD) % PERIOD, f = ph / tr.DT, k = Math.floor(f), a = u.ser[k], b = u.ser[Math.min(tr.steps, k + 1)];
  if (Number.isNaN(a)) return { on: false };
  const s = Number.isNaN(b) ? a : lerp(a, b, f - k); if (s >= u.poly.L - 1e-6) return { on: false };
  const p = posOn(u.poly, s), v = Number.isNaN(b) ? 0 : (b - a) / tr.DT;
  return { on: true, s, x: p.x, y: p.y, fx: p.fx, fy: p.fy, v, braking: v < 0.25 && s > 0.5, L: u.t.L, W: u.t.W, type: u.d.type, id: u.d.id };
}
const periodIndex = (t) => Math.floor(t / PERIOD);
const vehicleOn = (def, i, t, hour) => hash(i + 11, periodIndex(t)) < density(hour);

// ---------- NPC kota (25): skrip berperiode 150 dtk, deterministik ----------
const SK = [   // gaya karakter (kompatibel NW.drawCharacter)
  { shirt: "#3d5a6c", pants: "#2e2a26", skin: "#a8714a", hair: "#2a1d14", hat: "cap", hatCol: "#ece6d6" }, { shirt: "#c9553b", pants: "#4a3b5c", skin: "#c68b5e", hair: "#2a1d14", hat: "scarf", hatCol: "#2f7a8c", apron: "#f3e7c9" },
  { shirt: "#e0b84c", pants: "#2f5d78", skin: "#b77b52", hair: "#1f1612", hat: "cap", hatCol: "#d84a3a" }, { shirt: "#5a7d4a", pants: "#3a3a3a", skin: "#d2a77a", hair: "#3b2a1c" }, { shirt: "#8a4a8a", pants: "#2a2a3a", skin: "#c68b5e", hair: "#1c1410" },
  { shirt: "#dfe6ea", pants: "#33414d", skin: "#e0b48a", hair: "#2a1d14" }, { shirt: "#f0e0b0", pants: "#7a5a3c", skin: "#a8714a", hair: "#1c1410", hat: "caping", hatCol: "#e3be7a" }, { shirt: "#2f6b8a", pants: "#2e2a26", skin: "#d2a77a", hair: "#1c1410" },
  { shirt: "#e8a0a0", pants: "#4a5a7a", skin: "#e0b48a", hair: "#3b2a1c", hat: "pony" }, { shirt: "#f3f3f3", pants: "#2a2a2a", skin: "#c68b5e", hair: "#1c1410" }, { shirt: "#e0642a", pants: "#2a3a4a", skin: "#b77b52", hair: "#1f1612" },
];
function npcDefs(L) {
  const D = L.doors, B = {}; L.buildings.forEach((b) => (B[b.id] = b)); const bench = L.benches, st = L.stalls;
  const X = (id) => { const d = D[id]; return [d.x, d.y]; };
  const CW = (x0, y0, x1, y1) => [x0, y0, x1, y1];             // penyeberangan: dari-ke (jalur trotoar)
  const list = [
    // ---- pegawai: masuk-keluar pintu gedung (menghilang di pintu) ----
    { id: "n_peg1", name: "Pegawai Kantor", job: "door", door: "kantor_nusa", out: [73.0, 19.6], hours: [6.5, 19.5], t0: 6, style: 5, lines: ["Rapat jam sembilan, semoga lift-nya tidak penuh.", "Kopi dulu, baru bekerja."] },
    { id: "n_peg2", name: "Pegawai Hotel", job: "door", door: "hotel", out: [79.6, 19.6], hours: [6, 20], t0: 38, style: 3, lines: ["Selamat datang di Kota Nusa!", "Tamu dari pelabuhan sering menginap di sini."] },
    { id: "n_peg3", name: "Staf Samudra", job: "door", door: "kantor_2", out: [73.0, 8.6], hours: [7, 19], t0: 70, style: 7, lines: ["Kantor kami menghadap ke jalan utara.", "Laporan bulanan lagi, hehe."] },
    { id: "n_peg4", name: "Pegawai Balai Kota", job: "door", door: "balai_kota", out: [75.8, 31.8], hours: [7, 17], t0: 20, style: 10, lines: ["Balai Kota buka sampai sore.", "Selamat datang, warga baru?"] },
    { id: "n_peg5", name: "Penghuni Apartemen", job: "door", door: "apartemen", out: [79.0, 8.6], hours: [5, 28.5], t0: 55, style: 8, lines: ["Dari lantai atas, laut kelihatan sampai ke pelabuhan.", "Malam di sini tenang sekali."], night: true },
    // ---- pembeli ke pasar & ruko (menyeberang di zebra cross) ----
    { id: "n_beli1", name: "Pembeli Pasar", job: "shop", A: [59.8, 22.55], B: [59.8, 19.45], C: [59.6, 16.6], idle: 12, hours: [6, 17], t0: 2, style: 1, lines: ["Sayur di sini segar-segar.", "Ikannya dari pelabuhan tadi pagi."] },
    { id: "n_beli2", name: "Ibu Belanja", job: "shop", A: [59.2, 19.45], B: [59.2, 22.55], C: [57.2, 22.6], idle: 9, hours: [7, 19], t0: 40, style: 8, lines: ["Mau beli sabun dan minyak goreng.", "Hati-hati menyeberang, ya."] },
    { id: "n_beli3", name: "Pengunjung Ruko", job: "door", door: "ruko_n1", out: [57.0, 8.6], hours: [7, 21], t0: 85, style: 4, lines: ["Toko ini lengkap sekali.", "Kamu baru sampai di kota?"] },
    // ---- pedagang & warung ----
    { id: "n_dagang1", name: "Pak Dagang", job: "stall", at: 0, hours: [5.5, 17.5], style: 6, lines: ["Cabai, tomat, bawang — mari dipilih!", "Murah meriah, belum ada yang pulang rugi."] },
    { id: "n_dagang2", name: "Bu Lapak", job: "stall", at: 5, hours: [5.5, 16.5], style: 1, lines: ["Buah segar baru datang.", "Mangganya manis, coba satu?"] },
    { id: "n_dagang3", name: "Penjual Es", job: "cart", at: [59.5, 36.9], face: 2, hours: [8, 21.5], style: 2, lines: ["Es kelapa muda, dingin-dingin!", "Cuaca begini cocok yang segar."], night: true },
    // ---- taman: warga duduk, mengobrol, berlari, bersepeda ----
    { id: "n_duduk1", name: "Warga Taman", job: "sit", bench: 0, hours: [6, 28.5], style: 9, lines: ["Duduk di sini enak, angin sepoi-sepoi.", "Air mancurnya bagus, ya."], night: true },
    { id: "n_duduk2", name: "Kakek Taman", job: "sit", bench: 4, hours: [6, 28.5], style: 6, lines: ["Dulu di sini cuma rawa.", "Anak muda, duduklah sebentar."], night: true },
    { id: "n_bicara1", name: "Warga A", job: "chat", spot: [74.2, 22.6], face: 0, mate: 1, hours: [6, 23.5], style: 4, lines: ["...lalu katanya besok hujan.", "Iya, jemuran dulu dong."], night: true },
    { id: "n_bicara2", name: "Warga B", job: "chat", spot: [75.1, 22.6], face: 4, mate: 0, hours: [6, 23.5], style: 7, lines: ["Masa sih? Seru juga.", "Nanti kabari ya."], night: true },
    { id: "n_lari1", name: "Pelari Pagi", job: "run", off: 0, hours: [5, 10], hours2: [15.5, 19], style: 10, lines: ["Satu putaran lagi!", "Jalur larinya nyaman."] },
    { id: "n_lari2", name: "Pelari Sore", job: "run", off: 0.5, hours: [5.5, 11], hours2: [15, 20], style: 3, lines: ["Jangan menghalangi jalur, ya.", "Napas teratur…"] },
    { id: "n_sepeda1", name: "Pesepeda", job: "bike", off: 0.1, hours: [6, 18], style: 2, lines: ["Kring kring!", "Jalur sepeda di sini mulus."] },
    { id: "n_sepeda2", name: "Pesepeda Muda", job: "bike", off: 0.6, hours: [6.5, 19], style: 8, lines: ["Mau balapan?", "Awas, aku lewat!"] },
    // ---- pelabuhan & bengkel ----
    { id: "n_buruh1", name: "Buruh Gudang", job: "haul", a: [41.4, 18.9], b: [44.8, 18.9], hours: [6, 17], style: 0, lines: ["Kotak ikan ini berat juga.", "Sebentar lagi truk berangkat."] },
    { id: "n_buruh2", name: "Buruh Logistik", job: "haul", a: [46.4, 18.9], b: [48.6, 18.9], hours: [6, 18], style: 7, lines: ["Barang dari kapal masuk terus.", "Awas kepala!"] },
    { id: "n_mekanik", name: "Mekanik Jaya", job: "fix", at: [43.2, 30.6], face: 2, hours: [7, 17.5], style: 10, lines: ["Motormu butuh servis?", "Oli ganti tiap tiga bulan."] },
    { id: "n_sopir", name: "Sopir Truk", job: "driver", vt: "sawit", hours: [5.5, 20.5], t0: 30, style: 3, lines: ["Muatan sawit, berangkat sebentar lagi.", "Pelabuhan sibuk hari ini."] },
    // ---- penyeberang & penjaga malam ----
    { id: "n_tunggu", name: "Warga Menunggu", job: "cross", A: [50.2, 22.9], B: [53.8, 22.9], C: [55.4, 22.9], idle: 5, hours: [6, 28.5], t0: 0, style: 5, lines: ["Menunggu lampu hijau pejalan kaki.", "Sabar, jangan menerobos."], night: true },
    { id: "n_jaga", name: "Penjaga Malam", job: "patrol", pts: [[39.4, 20.0], [47.0, 20.0], [47.0, 22.6], [39.4, 22.6]], hours: [18, 30], style: 0, lines: ["Malam aman, silakan jalan-jalan.", "Kota tenang kalau malam."], night: true },
  ];
  list.forEach((n) => { n.ci = n.style; if (n.job === "sit") { const b = bench[n.bench]; n.seat = b ? { x: b.x, y: b.y - 0.02 } : { x: 60.5, y: 40.5 }; } });
  return list;
}
// jendela jam aktif (mendukung lewat tengah malam: [18,30] = 18:00–06:00)
function npcActive(n, hour) { const h = ((hour % 24) + 24) % 24, w = (a) => (a[1] > 24 ? h >= a[0] || h < a[1] - 24 : h >= a[0] && h < a[1]); return w(n.hours) || (n.hours2 ? w(n.hours2) : false); }
const WALK_SP = 1.25, RUN_SP = 2.6;
// bangun keyframe [t,x,y,mode,alpha] untuk satu NPC (satu periode = 150 dtk). mode: 0 diam, 1 jalan, 2 lari, 3 duduk, 4 kerja/angkut, 5 menunggu
function script(n, L, bikeLoop) {
  const kf = []; let t = 0, cx = 0, cy = 0;
  const K = (x, y, mode, a) => { kf.push([t, x, y, mode, a == null ? 1 : a]); cx = x; cy = y; };
  const hold = (d, mode) => { K(cx, cy, mode || 0); t += d; K(cx, cy, mode || 0); };
  const go = (x, y, sp, mode) => { const d = Math.hypot(x - cx, y - cy); if (d < 1e-6) return; K(cx, cy, mode == null ? 1 : mode); t += d / (sp || WALK_SP); K(x, y, mode == null ? 1 : mode); };
  const fade = (a0, a1, d) => { K(cx, cy, 0, a0); t += d; K(cx, cy, 0, a1); };
  const crossTo = (x, y) => { t = nextPedGo(t); hold(0, 5); go(x, y, 1.3, 1); };      // menunggu (hadap jalan) lalu menyeberang saat jendela pejalan terbuka
  if (n.job === "door") {
    const d = L.doors[n.door], o = n.out; t = 0; cx = d.x; cy = d.y - 0.45; K(cx, cy, 0, 0); t = n.t0; K(cx, cy, 0, 0);
    fade(0, 1, 0.5); cy = d.y; K(cx, cy, 1, 1); go(o[0], o[1], WALK_SP); hold(7, 0); go(d.x, d.y, WALK_SP); t += 0; cy = d.y; K(cx, cy, 1, 1); t += 0.4; K(d.x, d.y - 0.45, 1, 0); t += 0.4; K(d.x, d.y - 0.45, 0, 0);
  } else if (n.job === "cross") {   // A → B (zebra) → C, berdiam, lalu kembali
    const A = n.A, B = n.B, C = n.C; t = n.t0 || 0; K(A[0], A[1], 5); crossTo(B[0], B[1]); go(C[0], C[1], WALK_SP); hold(n.idle || 6, 0); go(B[0], B[1], WALK_SP); crossTo(A[0], A[1]); hold(2, 0);
  } else if (n.job === "shop") {    // seperti cross, tetapi tujuan C ada "di dalam" pasar: berjalan masuk, berdiam, keluar
    const A = n.A, B = n.B, C = n.C; t = n.t0 || 0; K(A[0], A[1], 5); crossTo(B[0], B[1]); go(C[0], C[1], WALK_SP); hold(n.idle || 9, 0); go(B[0], B[1], WALK_SP); crossTo(A[0], A[1]); hold(2, 0);
  } else if (n.job === "stall") { const s0 = L.stalls[n.at]; kf.push([0, s0.front.x, s0.front.y, 0, 1]); cx = s0.front.x; cy = s0.front.y; t = 0; }
  else if (n.job === "cart") { kf.push([0, n.at[0], n.at[1] + 0.75, 0, 1]); cx = n.at[0]; cy = n.at[1] + 0.75; }
  else if (n.job === "sit") { kf.push([0, n.seat.x, n.seat.y, 3, 1]); cx = n.seat.x; cy = n.seat.y; }
  else if (n.job === "chat") { kf.push([0, n.spot[0], n.spot[1], 0, 1]); cx = n.spot[0]; cy = n.spot[1]; }
  else if (n.job === "fix") { kf.push([0, n.at[0], n.at[1], 4, 1]); cx = n.at[0]; cy = n.at[1]; }
  else if (n.job === "haul") { t = 0; cx = n.a[0]; cy = n.a[1]; K(cx, cy, 4); for (let k = 0; k < 6 && t < PERIOD - 12; k++) { go(n.b[0], n.b[1], 0.9, 4); hold(2.5, 4); go(n.a[0], n.a[1], 0.9, 1); hold(3.0, 0); } }
  else if (n.job === "driver") {   // turun dari truk parkir, memeriksa muatan, naik lagi
    const tr = L.objects.find((o) => o.kind === "k_parked" && o.vt === n.vt), cab = [tr.x + 1.5, tr.y + 0.55]; t = 0; cx = cab[0]; cy = cab[1]; K(cx, cy, 0, 0); t = n.t0; K(cx, cy, 0, 0); fade(0, 1, 0.5);
    go(cab[0] + 0.2, cab[1] + 1.5, WALK_SP); go(cab[0] - 2.0, cab[1] + 1.5, WALK_SP); hold(6, 4); go(cab[0] + 0.2, cab[1] + 1.5, WALK_SP); go(cab[0], cab[1], WALK_SP); fade(1, 0, 0.5);
  } else if (n.job === "patrol") { const p = n.pts; t = 0; cx = p[0][0]; cy = p[0][1]; K(cx, cy, 1); let i = 0; while (t < PERIOD - 12) { i++; go(p[i % p.length][0], p[i % p.length][1], 1.0); hold(5, 0); } }
  else if (n.job === "run" || n.job === "bike") { n._poly = polyOf(n.job === "run" ? L.runLoop : bikeLoop, 0.7); n._v = n.job === "run" ? RUN_SP : 1.25; return []; }
  if (t > PERIOD) { /* skrip melebihi periode: dipotong → pastikan di data bahwa jumlah langkah muat */ }
  const last = kf[kf.length - 1];
  if (last[0] < PERIOD) kf.push([PERIOD, last[1], last[2], last[3], last[4]]);
  return kf.filter((k, i) => i === 0 || k[0] >= kf[i - 1][0]);
}
function buildNpcs(L) {
  const defs = npcDefs(L); defs.forEach((n) => { n.kf = script(n, L, L.bikeLoop); }); return defs;
}
function npcAt(n, t) {   // → {x,y,mode,alpha,dir,walk} untuk waktu dinding t
  const ph = ((t % PERIOD) + PERIOD) % PERIOD;
  if (n._poly) { const s = (ph * n._v + n.off * n._poly.L) % n._poly.L, p = posOn(n._poly, s); return { x: p.x, y: p.y, mode: n.job === "run" ? 2 : 6, alpha: 1, fx: p.fx, fy: p.fy, walk: s * 3.3, moving: true }; }
  const k = n.kf; let i = 0; while (i < k.length - 2 && k[i + 1][0] <= ph) i++;
  const a = k[i], b = k[i + 1] || a, d = b[0] - a[0], u = d > 1e-6 ? clamp((ph - a[0]) / d, 0, 1) : 1, x = lerp(a[1], b[1], u), y = lerp(a[2], b[2], u);
  const mv = Math.hypot(b[1] - a[1], b[2] - a[2]) > 1e-4 && d > 1e-6 && a[3] !== 4 ? 1 : 0, mode = mv ? b[3] === 2 ? 2 : (b[3] === 4 ? 4 : 1) : a[3];
  let fx = b[1] - a[1], fy = b[2] - a[2]; const l = Math.hypot(fx, fy); if (l > 1e-6) { fx /= l; fy /= l; } else { fx = n.face === undefined ? 0 : [1, 0.7, 0, -0.7, -1, -0.7, 0, 0.7][n.face]; fy = n.face === undefined ? 1 : [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7][n.face]; }
  return { x, y, mode, alpha: lerp(a[4], b[4], u), fx, fy, walk: (x + y) * 4.2, moving: !!mv && mode !== 4 };
}
return { MW, MH, X0, Y0, Y1, XE, FH, VX, HY, K, T, KT, CYCLE, PERIOD, EPOCH_MS, VT, hash, rng, clamp, lerp, lightPhase, nextPedGo, density, dayPart, build, polyOf, posOn, vehicleDefs, buildTraffic, vehicleAt, vehicleOn, periodIndex, buildNpcs, npcActive, npcAt, WALK_SP };
});
