// =========================================================
//  NUSA ISLAND — Bumbu 2.4: area "laut" — PERAIRAN SELAT SUNDA (laut lepas)
//  Area khusus berlayar (tidak ada daratan yang bisa diinjak): pulau kecil
//  berpohon kelapa, pulau batu, gunung api kecil di kejauhan, gosong karang,
//  arus selat, dan laut dalam. Sisi barat tersambung ke perairan Muara Kampung,
//  sisi timur ke Pelabuhan Selat Sunda.
//  Lokasi mancing memakai ULANG data LOCATIONS "selat" (ikan selat, tidak diduplikasi).
// =========================================================
(() => {
"use strict";
const { T, hash2, rng, P, LIFT, mix, shade, poly } = NW;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MW = 80, MH = 52;

// ---------- Pulau & kedalaman ----------
const ISLANDS = [
  { id: "kelapa", name: "Pulau Kelapa", x: 26, y: 13, rx: 3.6, ry: 2.9, grass: 0.62 },
  { id: "batu", name: "Pulau Batu", x: 52, y: 8.5, rx: 1.9, ry: 1.6, grass: 0 },
  { id: "gunung", name: "Pulau Gunung", x: 66, y: 6.5, rx: 3.4, ry: 3.0, grass: 0.55 },
  { id: "pasir", name: "Gosong Pasir", x: 13, y: 38, rx: 1.6, ry: 1.0, grass: 0 },
];
const REEF = { x: 40, y: 34, r: 5.2 };       // gosong karang: dangkal & berwarna toska
const DEEPZ = { x: 22, y: 42, r: 8.5 };      // laut dalam: biru gelap
const CURRENT = { x: 62, y: 29, r: 6 };      // arus selat: riak bergaris
function islandD(x, y) { // jarak ternormalisasi ke pulau terdekat (<1 = daratan)
  let best = 9;
  for (const I of ISLANDS) {
    const dx = (x - I.x) / I.rx, dy = (y - I.y) / I.ry, a = Math.atan2(dy, dx);
    const n = 1 + 0.08 * Math.sin(a * 3 + I.x) + 0.05 * Math.sin(a * 5 + I.y);
    best = Math.min(best, Math.hypot(dx, dy) / n);
  }
  return best;
}
function islandAt(x, y) { for (const I of ISLANDS) if (Math.hypot((x - I.x) / I.rx, (y - I.y) / I.ry) < 1.25) return I; return null; }
function classify(cx, cy) {
  const d = islandD(cx, cy);
  if (d < 1) { const I = islandAt(cx, cy); return I && I.grass && d < I.grass ? T.GRASS : T.SAND; }
  if (d < 1.35) return T.SHALLOW;
  if (Math.hypot(cx - REEF.x, cy - REEF.y) < REEF.r * (0.85 + 0.15 * Math.sin(cx * 1.3 + cy))) return T.SHALLOW;
  return T.DEEP;
}
const tiles = new Uint8Array(MW * MH);
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) tiles[y * MW + x] = classify(x + 0.5, y + 0.5);
const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? T.DEEP : tiles[(y | 0) * MW + (x | 0)]);
const depth = (x, y) => { // 0 dangkal … 1 sangat dalam (dipakai warna air)
  const di = islandD(x, y), near = clamp((di - 1) / 2.4, 0, 1);
  const reef = clamp(1 - Math.hypot(x - REEF.x, y - REEF.y) / REEF.r, 0, 1);
  const deep = clamp(1 - Math.hypot(x - DEEPZ.x, y - DEEPZ.y) / DEEPZ.r, 0, 1);
  return clamp(0.15 + near * 0.5 - reef * 0.55 + deep * 0.45 + (1 - Math.abs(y - 26) / 30) * 0.08, 0, 1);
};
const WC = { reef: "#57cfc4", shallow: "#45b6c4", mid: "#2690b4", deep: "#1a6c9a", abyss: "#0f4673" };
function waterColor(x, y) {
  const cx = x + 0.5, cy = y + 0.5, d = depth(cx, cy), reef = clamp(1 - Math.hypot(cx - REEF.x, cy - REEF.y) / REEF.r, 0, 1);
  let col = d < 0.3 ? mix(WC.shallow, WC.mid, d / 0.3) : d < 0.65 ? mix(WC.mid, WC.deep, (d - 0.3) / 0.35) : mix(WC.deep, WC.abyss, (d - 0.65) / 0.35);
  if (reef > 0.1) col = mix(col, WC.reef, reef * 0.7 * (0.75 + 0.25 * hash2(x * 3, y * 5)));
  return col;
}

// ---------- Objek ----------
const objects = [], solids = [];
const R = rng(20261102);
const count = (k) => objects.filter((o) => o.kind === k).length;
for (const I of ISLANDS) { // pohon kelapa di pulau berumput
  if (!I.grass) continue;
  const n = I.id === "gunung" ? 3 : 7;
  for (let i = 0, k = 0; i < 300 && k < n; i++) {
    const a = R() * 6.283, r = R() * 0.85, x = I.x + Math.cos(a) * I.rx * r, y = I.y + Math.sin(a) * I.ry * r;
    if (tileAt(x, y) === T.DEEP || tileAt(x, y) === T.SHALLOW || (I.id === "gunung" && Math.hypot(x - I.x, y - I.y) < 1.8)) continue;
    objects.push({ kind: "palm", x, y, h: 60 + R() * 30, lean: (R() - 0.5) * 1.0, ph: R() * 6 }); k++;
  }
}
objects.push({ kind: "gunung", x: 66, y: 6.5, big: 320, occ: [80, 160] });                    // gunung api kecil berasap
for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, x = 52 + Math.cos(a) * 1.7, y = 8.5 + Math.sin(a) * 1.4; objects.push({ kind: "searock", x, y, s: 0.9 + hash2(i, 3) * 0.6 }); }
objects.push({ kind: "rock", x: 52.2, y: 8.4, s: 1.6 }, { kind: "rock", x: 51.6, y: 9.0, s: 1.1 });
for (let i = 0; i < 400 && count("searock") < 24; i++) { // batu karang yang mencuat di gosong
  const a = R() * 6.283, r = Math.sqrt(R()) * REEF.r * 0.8, x = REEF.x + Math.cos(a) * r, y = REEF.y + Math.sin(a) * r;
  if (objects.some((o) => Math.hypot(o.x - x, o.y - y) < 1.6)) continue;
  objects.push({ kind: "searock", x, y, s: 0.55 + R() * 0.45 });
}
objects.push({ kind: "buoy", x: 4.5, y: 22, col: "#d84a3a" }, { kind: "buoy", x: 4.5, y: 28, col: "#3a9a5a" }, { kind: "buoy", x: 75, y: 19.5, col: "#d84a3a" }, { kind: "buoy", x: 75, y: 25.5, col: "#3a9a5a" });
objects.push({ kind: "searock", x: 13.6, y: 38.6, s: 0.8 }, { kind: "searock", x: 12.3, y: 37.6, s: 0.7 });
for (const o of objects) if (o.kind === "palm") solids.push({ x: o.x, y: o.y, r: 0.22 });
const walkable = () => false; // laut lepas: tidak ada daratan yang boleh diinjak
const shoreEdges = NW.areaKit.shoreEdges(tileAt, MW, MH);
const START = { x: 6, y: 25 };

// gunung api: kerucut, kawah, asap tipis
const OD = NW.objDraw = NW.objDraw || {};
OD.gunung = (c, o, t, night) => {
  const b = P(o.x, o.y, LIFT), H = 120, Wd = 120;
  c.fillStyle = "rgba(20,40,30,.18)"; c.beginPath(); c.ellipse(b.x + 30, b.y + 8, Wd * 0.75, 26, 0, 0, 7); c.fill();
  const g = c.createLinearGradient(b.x - Wd, 0, b.x + Wd, 0); g.addColorStop(0, "#7d8a72"); g.addColorStop(0.5, "#5f6f5c"); g.addColorStop(1, "#47564a");
  c.fillStyle = g; c.beginPath(); c.moveTo(b.x - Wd, b.y); c.quadraticCurveTo(b.x - Wd * 0.45, b.y - H * 0.35, b.x - 16, b.y - H); c.lineTo(b.x + 14, b.y - H); c.quadraticCurveTo(b.x + Wd * 0.45, b.y - H * 0.3, b.x + Wd, b.y); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,.08)"; c.beginPath(); c.moveTo(b.x - 16, b.y - H); c.quadraticCurveTo(b.x - Wd * 0.4, b.y - H * 0.4, b.x - Wd * 0.85, b.y - 4); c.lineTo(b.x - Wd * 0.55, b.y - 4); c.quadraticCurveTo(b.x - 20, b.y - H * 0.45, b.x - 6, b.y - H); c.fill();
  c.strokeStyle = "rgba(60,50,40,.35)"; c.lineWidth = 1.2; for (const k of [-0.5, -0.2, 0.15, 0.45]) { c.beginPath(); c.moveTo(b.x + k * 26, b.y - H + 6); c.quadraticCurveTo(b.x + k * 60, b.y - H * 0.5, b.x + k * Wd * 0.95, b.y - 6); c.stroke(); }
  c.fillStyle = "#3f4740"; c.beginPath(); c.ellipse(b.x - 1, b.y - H, 15, 4, 0, 0, 7); c.fill();
  c.fillStyle = "#6c9a58"; c.beginPath(); c.ellipse(b.x - Wd * 0.62, b.y - 6, 26, 8, 0, 0, 7); c.ellipse(b.x + Wd * 0.6, b.y - 5, 30, 8, 0, 0, 7); c.fill();
  for (let i = 0; i < 6; i++) { // asap tipis (tidak berbahaya)
    const k = (t * 0.06 + i / 6) % 1, x = b.x + Math.sin(i * 2 + t * 0.3) * 6 + k * 46, y = b.y - H - 6 - k * 90;
    c.fillStyle = `rgba(${night > 0.4 ? "120,130,150" : "236,236,232"},${(0.42 * (1 - k)).toFixed(3)})`; c.beginPath(); c.arc(x, y, 7 + k * 20, 0, 7); c.fill();
  }
};

// ---------- Pengaturan area ----------
const M = {
  MW, MH, tiles, tileAt, classify, islandD, depth, ISLANDS, REEF, DEEPZ, CURRENT, START,
  buildings: [], objects, points: [], signs: [], NAV: { A: [START.x, START.y] }, NAV_EDGES: [], flowerBeds: [], lamps: [], solids, walkable, shoreEdges, docks: [], fishSpots: [],
  lights: [],
};
// bintik karang di dasar gosong (digambar sekali ke cache terrain)
function extras(g, K) {
  const r2 = rng(77);
  for (let i = 0; i < 160; i++) {
    const a = r2() * 6.283, r = Math.sqrt(r2()) * REEF.r * 0.95, x = REEF.x + Math.cos(a) * r, y = REEF.y + Math.sin(a) * r;
    if (NW.isLandT(tileAt(x, y))) continue;
    const p = K.P(x, y, -1), col = ["#e88a7a", "#f2b56b", "#c98ad9", "#7fd6a0", "#f6d07a"][(r2() * 5) | 0];
    g.fillStyle = K.rgba(col, 0.55); g.beginPath(); g.ellipse(p.x, p.y, 3 + r2() * 4, 1.6 + r2() * 2, 0, 0, 7); g.fill();
  }
}
function bookArt(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.5); sky.addColorStop(0, "#6fb2de"); sky.addColorStop(1, "#e8e4cf"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = "#5f6f5c"; g.beginPath(); g.moveTo(84, h * 0.5); g.lineTo(100, h * 0.5 - 22); g.lineTo(106, h * 0.5 - 22); g.lineTo(124, h * 0.5); g.fill();
  g.fillStyle = "rgba(240,240,240,.7)"; g.beginPath(); g.arc(104, h * 0.5 - 28, 4, 0, 7); g.arc(110, h * 0.5 - 33, 5, 0, 7); g.fill();
  const sea = g.createLinearGradient(0, h * 0.5, 0, h); sea.addColorStop(0, "#2690b4"); sea.addColorStop(1, "#0f4673"); g.fillStyle = sea; g.fillRect(0, h * 0.5, w, h * 0.5);
  g.fillStyle = "#efd8a2"; g.beginPath(); g.ellipse(30, h * 0.56, 18, 3, 0, 0, 7); g.fill(); g.strokeStyle = "#8a6a45"; g.lineWidth = 2; g.beginPath(); g.moveTo(28, h * 0.55); g.quadraticCurveTo(30, h * 0.4, 35, h * 0.33); g.stroke();
  g.fillStyle = "#57a84a"; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(35 + Math.cos(i) * 6, h * 0.33 + Math.sin(i) * 2, 7, 2, i, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(10 + i * 24, h * 0.66 + i * 4); g.lineTo(24 + i * 24, h * 0.66 + i * 4); g.stroke(); }
  g.fillStyle = "#c9553b"; g.beginPath(); g.moveTo(60, h * 0.78); g.quadraticCurveTo(74, h * 0.86, 92, h * 0.78); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.moveTo(58, h * 0.8); g.lineTo(40, h * 0.84); g.stroke();
  g.fillStyle = "#f3efe6"; for (const [x, y] of [[48, 20], [56, 16], [64, 22]]) { g.beginPath(); g.moveTo(x - 4, y); g.quadraticCurveTo(x - 2, y - 2, x, y); g.quadraticCurveTo(x + 2, y - 2, x + 4, y); g.lineWidth = 1.2; g.strokeStyle = "#2f3b40"; g.stroke(); }
}

const area = NW.areas.register({
  id: "laut", name: "Perairan Selat Sunda", loc: "selat", banner: "🌊 Perairan Selat Sunda", seaOnly: true,
  map: M,
  spawns: { start: START },
  theme: { deep: "#1a6c9a", waterColor, landTile: NW.coastTile((x, y) => (1 - islandD(x, y)) * 4), extras, bookArt, sparkle: 0.4, maxPx: 5.5e6, jumpCols: ["#35557e", "#4f7aa0", "#5d7f9c", "#cfd9ea"] },
  firstVisitNote: { id: "laut:tiba", area: "laut", title: "Laut Lepas Selat Sunda", text: "Untuk pertama kalinya aku mengemudikan kapal sendiri ke laut lepas. Pulau-pulau kecil terlihat di kejauhan, dan asap tipis naik dari gunung api di tengah selat." },
  discoveries: [
    { id: "laut:kelapa", name: "Pulau Kelapa", x: 26, y: 13, r: 6.5, desc: "Pulau mungil berpasir putih dengan pohon-pohon kelapa." },
    { id: "laut:gunung", name: "Pulau Gunung", x: 66, y: 6.5, r: 8, desc: "Gunung api kecil di tengah selat. Asapnya jadi penunjuk arah nelayan." },
    { id: "laut:batu", name: "Pulau Batu", x: 52, y: 8.5, r: 5.5, desc: "Gugusan batu karang yang mencuat dari laut. Jangan terlalu dekat!" },
  ],
  npcs: [],
  hooks: {
    hint: () => (NW.boat && NW.boat.on ? "" : ""),
    fullMsg: "Coolbox-mu penuh. Berlayar ke Pelabuhan Selat Sunda atau pulang ke Muara untuk menjual tangkapan.",
  },
});
NW.LAUT_MAP = M;
})();
