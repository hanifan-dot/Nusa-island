// =========================================================
//  NUSA ISLAND — AREA "SAMUDRA FOLLOWER — PULAU PARA LEGENDA" (area jelajah 2.5D isometrik, bisa dimainkan).
//  Pulau tropis: pantai berpalem, DERMAGA UTAMA + kapal pulang ke Muara Kampung, PAPAN LEGENDA KOMUNITAS, NPC penjaga dermaga,
//  EMPAT spot memancing (habitat): KARANG (pantai barat daya), MUARA (muara sungai, timur), DANAU (tepi danau air tawar), LAUT DALAM (ujung dermaga).
//  Spot hanya menentukan HABITAT; rarity/spesies/Pity diputuskan SERVER (sf2/sf2.js → ecoSf2Catch).
//  Satu pulau, satu sungai kecil (jembatan kayu), tidak ada rumah/bangunan yang bisa dimasuki → ringan untuk Android.
// =========================================================
(() => {
"use strict";
const { T, hash2, rng, P, LIFT, mix } = NW;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MW = 64, MH = 48;

// ---------- Geometri pulau ----------
const IS = { x: 31, y: 21, rx: 15.5, ry: 10.2 };
const LAKE = { x: 24.6, y: 17.6, rx: 4.4, ry: 2.7 };
const RIVER = { y0: 18.1, y1: 19.7, x0: 28.5, x1: 47.5 };       // sungai dari danau ke laut (timur)
const BRIDGE = { x0: 37, x1: 38, y0: 17, y1: 20 };                // jembatan kayu (T.DOCK = bisa diinjak)
const REEF = { x: 17.2, y: 29.6, r: 4.6 };                         // gosong karang di barat daya
const PIER = { x0: 31, x1: 32, y0: 30, y1: 38, axis: "y" };       // dermaga utama (ke selatan)
function islandD(x, y) {
  const dx = (x - IS.x) / IS.rx, dy = (y - IS.y) / IS.ry, a = Math.atan2(dy, dx);
  return Math.hypot(dx, dy) / (1 + 0.07 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 5 + 2));
}
const lakeD = (x, y) => Math.hypot((x - LAKE.x) / LAKE.rx, (y - LAKE.y) / LAKE.ry);
function classify(cx, cy) {
  const d = islandD(cx, cy);
  if (cx >= PIER.x0 && cx < PIER.x1 + 1 && cy >= PIER.y0 && cy < PIER.y1 + 1) return T.DOCK;
  if (cx >= BRIDGE.x0 && cx < BRIDGE.x1 + 1 && cy >= BRIDGE.y0 && cy < BRIDGE.y1 + 1) return T.DOCK;
  if (lakeD(cx, cy) < 1) return T.SHALLOW;
  if (cx >= RIVER.x0 && cy >= RIVER.y0 && cy < RIVER.y1 + (cx > 40 ? 0.4 : 0) ) return T.SHALLOW;
  if (d < 1) { if (lakeD(cx, cy) < 1.22 || (cx >= RIVER.x0 && cy >= RIVER.y0 - 0.9 && cy < RIVER.y1 + 1.0) || d > 0.84) return T.SAND; return T.GRASS; }
  if (Math.hypot(cx - REEF.x, cy - REEF.y) < REEF.r * (0.85 + 0.15 * Math.sin(cx * 1.3 + cy))) return T.SHALLOW;
  return d < 1.4 ? T.SHALLOW : T.DEEP;
}
const tiles = new Uint8Array(MW * MH);
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) tiles[y * MW + x] = classify(x + 0.5, y + 0.5);
const tileAt = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH ? T.DEEP : tiles[(y | 0) * MW + (x | 0)]);
const START = { x: 31.9, y: 30.2 };            // pangkal dermaga
const BOAT = { x: 34.35, y: 35.0 };
const SPOTS = {                                 // titik berdiri + arah hadap air (dir: 0=kanan,2=bawah,4=kiri,6=atas,1/3/5/7 diagonal layar)
  dalam: { x: 32.0, y: 38.3, face: 3, ret: { x: 32.0, y: 37.0, dir: 3 }, label: "Laut Dalam" },
  karang: { x: 18.4, y: 28.4, face: 5, ret: { x: 19.4, y: 27.7, dir: 5 }, label: "Karang" },
  danau: { x: 24.6, y: 20.9, face: 7, ret: { x: 24.6, y: 21.7, dir: 7 }, label: "Danau" },
  muara: { x: 43.6, y: 20.9, face: 7, ret: { x: 43.6, y: 21.7, dir: 7 }, label: "Muara" },
};

// ---------- Objek, dekor, tabrakan ----------
const objects = [], solids = [], signs = [], lamps = [];
const R = rng(20261107);
const nearAny = (x, y, d) => objects.some((o) => Math.hypot(o.x - x, o.y - y) < d);
const isGround = (x, y) => { const t = tileAt(x, y); return t === T.GRASS || t === T.SAND; };
const keepClear = (x, y) => [START, BOAT, ...Object.values(SPOTS), { x: 29.6, y: 28.4 }, { x: 33.4, y: 30.3 }, { x: 35.2, y: 28.9 }].some((p) => Math.hypot(p.x - x, p.y - y) < 1.5);
objects.push({ kind: "boat", x: BOAT.x, y: BOAT.y, flip: true, tie: { x: 33.0, y: 34.6 } });
for (let i = 0; i < 900 && objects.filter((o) => o.kind === "palm").length < 34; i++) {   // pohon kelapa: pantai & tepi
  const a = R() * 6.283, r = 0.55 + R() * 0.42, x = IS.x + Math.cos(a) * IS.rx * r, y = IS.y + Math.sin(a) * IS.ry * r;
  if (!isGround(x, y) || keepClear(x, y) || nearAny(x, y, 1.5) || lakeD(x, y) < 1.5 || (y > RIVER.y0 - 1.3 && y < RIVER.y1 + 1.4 && x > RIVER.x0 - 1)) continue;
  objects.push({ kind: "palm", x, y, h: 62 + R() * 30, lean: (R() - 0.5) * 1.0, ph: R() * 6 });
}
for (let i = 0; i < 700 && objects.filter((o) => o.kind === "bush").length < 18; i++) {
  const a = R() * 6.283, r = R() * 0.7, x = IS.x + Math.cos(a) * IS.rx * r, y = IS.y + Math.sin(a) * IS.ry * r;
  if (tileAt(x, y) !== T.GRASS || keepClear(x, y) || nearAny(x, y, 1.3) || lakeD(x, y) < 1.4 || (y > RIVER.y0 - 1.3 && y < RIVER.y1 + 1.4 && x > RIVER.x0 - 1)) continue;
  objects.push({ kind: "bush", x, y, s: 0.8 + R() * 0.5 });
}
for (let i = 0; i < 600 && objects.filter((o) => o.kind === "flowers").length < 14; i++) {
  const x = 10 + R() * 42, y = 12 + R() * 18;
  if (tileAt(x, y) !== T.GRASS || keepClear(x, y) || nearAny(x, y, 0.8) || lakeD(x, y) < 1.3) continue;
  objects.push({ kind: "flowers", x, y, hue: R() });
}
for (const [x, y] of [[20.3, 17.2], [21.0, 19.4], [28.9, 19.5], [27.6, 15.6], [29.5, 18.0], [34.2, 17.0], [41.8, 17.2], [43.8, 18.0]]) { if (!NW.isWalkT(tileAt(x, y)) && tileAt(x, y) === T.SHALLOW) objects.push({ kind: "reeds", x, y, s: 0.8 + hash2(x * 9, y * 7) * 0.4 }); }
for (let i = 0; i < 400 && objects.filter((o) => o.kind === "searock").length < 22; i++) {       // batu karang di gosong & lepas pantai
  const a = R() * 6.283, r = Math.sqrt(R()) * REEF.r * 0.85, x = REEF.x + Math.cos(a) * r, y = REEF.y + Math.sin(a) * r;
  if (tileAt(x, y) !== T.SHALLOW || nearAny(x, y, 1.3)) continue; objects.push({ kind: "searock", x, y, s: 0.55 + R() * 0.45 });
}
objects.push({ kind: "rock", x: 38.4, y: 24.6, s: 1.1 }, { kind: "rock", x: 22.8, y: 24.6, s: 0.9 }, { kind: "crate", x: 29.9, y: 30.4, s: 0.9 }, { kind: "crate", x: 29.2, y: 30.1, s: 0.7 });
objects.push({ kind: "bench", x: 27.2, y: 22.6, dir: "x" });
objects.push({ kind: "buoy", x: 36.5, y: 37.0, col: "#d84a3a" }, { kind: "buoy", x: 27.5, y: 36.4, col: "#3a9a5a" });
objects.push({ kind: "papanlegenda", x: 29.6, y: 28.4 });
signs.push({ x: 35.2, y: 28.9, title: "Pulau Para Legenda", text: "Selamat datang di SAMUDRA FOLLOWER! Empat spot: Laut Dalam (ujung dermaga) · Karang (barat daya) · Danau (tengah pulau) · Muara (timur, seberang jembatan). Papan Legenda Komunitas ada di dekat dermaga." },
  { x: 36.1, y: 21.4, title: "Jembatan Muara", text: "Sungai kecil ini mengalir dari danau ke laut. Barramundi suka bersembunyi di muaranya." });
signs.forEach((s) => objects.push({ kind: "sign", x: s.x, y: s.y, title: s.title }));
for (const [x, y] of [[30.4, 29.6], [33.6, 29.6], [22.8, 26.4], [26.1, 21.7], [42.4, 21.7], [29.1, 28.0], [35.6, 22.0]]) { if (isGround(x, y)) { lamps.push([x, y]); objects.push({ kind: "lamp", x, y }); } }
for (const o of objects) {
  if (o.kind === "palm") solids.push({ x: o.x, y: o.y, r: 0.22 });
  else if (o.kind === "bush") solids.push({ x: o.x, y: o.y, r: 0.3 * o.s });
  else if (o.kind === "rock") solids.push({ x: o.x, y: o.y, r: 0.3 * o.s });
  else if (o.kind === "lamp" || o.kind === "sign") solids.push({ x: o.x, y: o.y, r: 0.16 });
  else if (o.kind === "bench") solids.push({ x: o.x, y: o.y, r: 0.32 });
  else if (o.kind === "crate") solids.push({ x: o.x, y: o.y, r: 0.28 * (o.s || 1) });
  else if (o.kind === "papanlegenda") solids.push({ x0: o.x - 0.85, y0: o.y - 0.18, x1: o.x + 0.85, y1: o.y + 0.18 });
}
const walkable = NW.areaKit.makeWalkable(tileAt, solids, NW.isWalkT);
const shoreEdges = NW.areaKit.shoreEdges(tileAt, MW, MH);

// ---------- Titik interaksi ----------
const points = [
  { id: "fs_dalam", spot: "dalam", x: SPOTS.dalam.x, y: SPOTS.dalam.y - 0.5, r: 1.3, icon: "🎣", label: "Laut Dalam", fish: true },
  { id: "fs_karang", spot: "karang", x: SPOTS.karang.x + 0.5, y: SPOTS.karang.y - 0.2, r: 1.3, icon: "🎣", label: "Karang", fish: true },
  { id: "fs_danau", spot: "danau", x: SPOTS.danau.x, y: SPOTS.danau.y + 0.2, r: 1.3, icon: "🎣", label: "Danau", fish: true },
  { id: "fs_muara", spot: "muara", x: SPOTS.muara.x, y: SPOTS.muara.y + 0.2, r: 1.3, icon: "🎣", label: "Muara", fish: true },
  { id: "boat", x: 32.6, y: 35.0, r: 1.15, icon: "⛵", label: "Kapal", bz: 40 },
  { id: "papan", x: 29.6, y: 29.1, r: 1.25, icon: "📜", label: "Papan Legenda" },
];
signs.forEach((s, i) => points.push({ id: "ssign" + i, x: s.x + 0.45, y: s.y + 0.45, r: 0.85, icon: "📜", label: "Baca", sign: s }));
const fishSpots = Object.entries(SPOTS).map(([id, s]) => ({ id, mx: s.x, my: s.y, mz: 4.5, face: s.face, ret: s.ret }));
const NAV = { DOCKB: [33.4, 30.3], START: [START.x, START.y] };

// ---------- Warna air: laut tropis, danau air tawar (hijau-biru), sungai/muara keruh kehijauan ----------
const WC = { reef: "#57cfc4", shallow: "#45b6c4", mid: "#2690b4", deep: "#1a6c9a", abyss: "#0f4673", lake: "#58b8a0", lakeDeep: "#3b9a8c", river: "#6fae9a" };
function waterColor(x, y) {
  const cx = x + 0.5, cy = y + 0.5, d = islandD(cx, cy);
  if (lakeD(cx, cy) < 1) return mix(WC.lake, WC.lakeDeep, clamp(1 - lakeD(cx, cy), 0, 1) * 0.9);
  if (d < 1.02) return mix(WC.river, WC.lake, clamp((cx - 30) / 20, 0, 1) * 0.0 + 0.3);
  const reef = clamp(1 - Math.hypot(cx - REEF.x, cy - REEF.y) / REEF.r, 0, 1), dep = clamp((d - 1) / 1.6, 0, 1);
  let col = dep < 0.35 ? mix(WC.shallow, WC.mid, dep / 0.35) : dep < 0.75 ? mix(WC.mid, WC.deep, (dep - 0.35) / 0.4) : mix(WC.deep, WC.abyss, (dep - 0.75) / 0.25);
  if (reef > 0.1) col = mix(col, WC.reef, reef * 0.7 * (0.75 + 0.25 * hash2(x * 3, y * 5)));
  const trench = clamp(1 - Math.hypot(cx - 32, cy - 41.5) / 6, 0, 1); if (trench > 0) col = mix(col, "#07304f", trench * 0.8);   // palung di ujung dermaga: habitat laut dalam
  return col;
}
function extras(g, K) {   // bintik karang warna-warni di dasar gosong
  const r2 = rng(79);
  for (let i = 0; i < 150; i++) {
    const a = r2() * 6.283, r = Math.sqrt(r2()) * REEF.r * 0.95, x = REEF.x + Math.cos(a) * r, y = REEF.y + Math.sin(a) * r;
    if (NW.isLandT(tileAt(x, y))) continue;
    const p = K.P(x, y, -1), col = ["#e88a7a", "#f2b56b", "#c98ad9", "#7fd6a0", "#f6d07a"][(r2() * 5) | 0];
    g.fillStyle = K.rgba(col, 0.55); g.beginPath(); g.ellipse(p.x, p.y, 3 + r2() * 4, 1.6 + r2() * 2, 0, 0, 7); g.fill();
  }
}
function bookArt(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.5); sky.addColorStop(0, "#6fb2de"); sky.addColorStop(1, "#f4e6c2"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const sea = g.createLinearGradient(0, h * 0.5, 0, h); sea.addColorStop(0, "#2690b4"); sea.addColorStop(1, "#0f4673"); g.fillStyle = sea; g.fillRect(0, h * 0.5, w, h * 0.5);
  g.fillStyle = "#efd8a2"; g.beginPath(); g.ellipse(w / 2, h * 0.56, 46, 7, 0, 0, 7); g.fill();
  g.fillStyle = "#57a84a"; g.beginPath(); g.ellipse(w / 2, h * 0.52, 34, 7, 0, 0, 7); g.fill();
  g.strokeStyle = "#8a6a45"; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2 - 10, h * 0.52); g.quadraticCurveTo(w / 2 - 8, h * 0.34, w / 2 - 2, h * 0.3); g.stroke();
  g.fillStyle = "#2f8a4a"; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(w / 2 - 2 + Math.cos(i * 1.3) * 7, h * 0.3 + Math.sin(i * 1.3) * 2, 8, 2.2, i, 0, 7); g.fill(); }
  g.fillStyle = "#f0c84a"; g.beginPath(); g.arc(w * 0.78, h * 0.2, 8, 0, 7); g.fill();
}

// ---------- Papan Legenda Komunitas (digambar sendiri) ----------
const OD = NW.objDraw = NW.objDraw || {};
OD.papanlegenda = (c, o, t, night) => {
  const b = P(o.x, o.y, LIFT);
  c.fillStyle = "rgba(20,40,30,.2)"; c.beginPath(); c.ellipse(b.x, b.y + 3, 40, 10, 0, 0, 7); c.fill();
  c.fillStyle = "#6a4a2a"; c.fillRect(b.x - 30, b.y - 56, 5, 58); c.fillRect(b.x + 25, b.y - 56, 5, 58);
  c.fillStyle = "#8a6238"; c.beginPath(); c.roundRect ? c.roundRect(b.x - 38, b.y - 74, 76, 44, 5) : c.rect(b.x - 38, b.y - 74, 76, 44); c.fill();
  c.strokeStyle = "#4a3018"; c.lineWidth = 2; c.stroke();
  c.fillStyle = "#f4e2b0"; c.fillRect(b.x - 32, b.y - 68, 64, 32);
  const glow = 0.55 + 0.25 * Math.sin(t * 2.2); c.strokeStyle = `rgba(240,184,58,${glow})`; c.lineWidth = 2; c.strokeRect(b.x - 31, b.y - 67, 62, 30);
  c.fillStyle = "#7a4a14"; c.font = "bold 9px system-ui,sans-serif"; c.textAlign = "center"; c.fillText("PAPAN LEGENDA", b.x, b.y - 55); c.font = "8px system-ui,sans-serif"; c.fillStyle = "#8a6a45"; c.fillText("Komunitas Nusa", b.x, b.y - 43);
  c.fillStyle = "#e6a822"; c.beginPath(); c.arc(b.x, b.y - 80, 5, 0, 7); c.fill(); c.textAlign = "start";
};

// ---------- NPC penjaga dermaga ----------
const STYLE = { jaga: { shirt: "#2b5d8a", pants: "#3b3226", skin: "#b07b52", hair: "#2a1d14", hat: "fedora", hatCol: "#e0e4ea", hatBand: "#1d3a5a", sash: "#c9553b", sashLine: "#f0c84a" } };
const npcs = [{
  id: "jaga", name: "Pak Jangkar", avatar: "🧑🏽‍✈️", role: "Penjaga dermaga", style: STYLE.jaga, speed: 1.0, seed: 3.3, home: "DOCKB",
  sched: [{ from: 0, to: 24, at: "DOCKB", act: "guide", face: 3, prop: "paddle", bubble: "⚓", label: "menjaga dermaga", lines: [["Dermaga ini kujaga sejak kapal pertama bersandar."]] }],
}];

const M = {
  MW, MH, tiles, tileAt, classify, islandD, lakeD, IS, LAKE, RIVER, BRIDGE, REEF, SPOTS, DOCK: PIER, SPOT: { x: SPOTS.dalam.x, y: SPOTS.dalam.y }, BOAT, START,
  buildings: [], objects, points, signs, NAV, NAV_EDGES: [], flowerBeds: [], lamps, solids, walkable, shoreEdges,
  docks: [PIER, { x0: BRIDGE.x0, x1: BRIDGE.x1, y0: BRIDGE.y0, y1: BRIDGE.y1, axis: "x" }], fishSpots,
  lights: [{ x: BOAT.x, y: BOAT.y, z: 14, r: 40 }, { x: 29.6, y: 28.4, z: 26, r: 56, col: "#ffc46b", k: 1.0 }],
};

const area = NW.areas.register({
  id: "sf2", name: "Samudra Follower — Pulau Para Legenda", loc: "samudra", banner: "🌴 Samudra Follower — Pulau Para Legenda",
  map: M, idleLook: true,
  spawns: { start: START, boat: { x: 32.0, y: 33.2, dir: 3 } },
  theme: { deep: "#1a6c9a", waterColor, landTile: NW.coastTile((x, y) => (1 - islandD(x, y)) * 4), extras, bookArt, sparkle: 0.4, maxPx: 6.5e6, jumpCols: ["#35557e", "#4f7aa0", "#e0b84a", "#cfd9ea"] },
  firstVisitNote: { id: "sf2:tiba", area: "sf2", title: "Pulau Para Legenda", text: "Kapalku bersandar di dermaga sebuah pulau yang tidak ada di peta lama. Di papan kayu tertulis: tempat para legenda komunitas Nusa Island berenang. Aku ingin tahu makhluk apa yang menungguku di laut dalam." },
  discoveries: [
    { id: "sf2:dermaga", name: "Dermaga Para Legenda", x: 32, y: 32.5, r: 3.2, desc: "Dermaga utama tempat kapal dari Muara Kampung bersandar." },
    { id: "sf2:danau", name: "Danau Pulau", x: 24.6, y: 19.6, r: 3.2, desc: "Danau air tawar di tengah pulau, rumah Channa dan kawan-kawan." },
    { id: "sf2:muara", name: "Muara Pulau", x: 44, y: 20, r: 3, desc: "Tempat sungai bertemu laut. Barramundi suka di sini." },
    { id: "sf2:karang", name: "Gosong Karang", x: 19.5, y: 28, r: 3.4, desc: "Karang berwarna-warni di barat daya pulau." },
  ],
  npcs, acts: { guide(n) { n.dir = 3; } },
  hooks: {
    fullMsg: "Coolbox-mu penuh. Pulanglah ke Muara Kampung dengan kapal untuk menjual tangkapan.",
    interact: (t, api) => NW.sf2 && NW.sf2.interact(t, api),
    hint: () => "",
  },
});
npcs.forEach((n) => { n.area = "sf2"; n.talk = (nn, api) => NW.sf2 && NW.sf2.talkGuard(nn, api); });
NW.SF2_MAP = M;
})();
