// =========================================================
//  NUSA ISLAND — Tahap 2A: Rumahku (interior isometrik)
//  Ruangan 7×6 tile. Perabot dasar selalu ada, sisanya dibeli lewat katalog.
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa;
const P = NW.P;
const RW = 7, RH = 6, WALL = 96;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y); c.closePath(); }
const { shade, mix } = NW;

// ---------- Katalog perabot ----------
const CATALOG = [
  { id: "karpet", name: "Karpet Tenun", icon: "🟥", price: 300, stars: 0, desc: "Karpet bermotif tenun di tengah ruangan." },
  { id: "tanaman", name: "Tanaman Pot", icon: "🪴", price: 220, stars: 0, desc: "Monstera hijau di sudut kamar." },
  { id: "lampu", name: "Lampu Gantung", icon: "💡", price: 450, stars: 1, desc: "Kamar terang dan hangat di malam hari." },
  { id: "lukisan", name: "Lukisan Senja", icon: "🖼️", price: 600, stars: 2, desc: "Lukisan matahari terbenam di muara." },
  { id: "radio", name: "Radio Tua", icon: "📻", price: 800, stars: 3, desc: "Nyalakan untuk musik santai." },
  { id: "trofi", name: "Rak Trofi", icon: "🏆", price: 1200, stars: 4, desc: "Pajang trofi ikan legenda dan rekor terberat." },
  { id: "kucing", name: "Si Belang", icon: "🐈", price: 1500, stars: 6, desc: "Kucing kampung yang suka tidur di karpet." },
  { id: "akuarium", name: "Akuarium Besar", icon: "🐠", price: 2500, stars: 8, desc: "Muat 6 ikan koleksi, lebih ramai dan berwarna." },
];
const has = (id) => N().S.home.items.includes(id);

// ---------- Tata letak & collision ----------
const FIXED = {
  bed: { x0: 4.8, y0: 0.1, x1: 6.9, y1: 2.1 },
  table: { x0: 2.0, y0: 2.2, x1: 3.1, y1: 3.0 },
  aqua: { x0: 0.05, y0: 1.1, x1: 0.85, y1: 2.9 },
  aquaBig: { x0: 0.05, y0: 0.7, x1: 0.95, y1: 3.4 },
  trophy: { x0: 0.05, y0: 0.05, x1: 0.7, y1: 0.75 },
  cabinet: { x0: 6.15, y0: 2.6, x1: 6.95, y1: 3.4 },
};
const DOOR = { x: 0.55, y: 4.6 };
function solids() {
  const s = [FIXED.bed, FIXED.table, has("akuarium") ? FIXED.aquaBig : FIXED.aqua];
  if (has("trofi")) s.push(FIXED.trophy);
  if (has("radio")) s.push(FIXED.cabinet);
  if (has("tanaman")) s.push({ x0: 6.05, y0: 4.95, x1: 6.75, y1: 5.65 });
  s.push({ x0: 1.7, y0: 3.05, x1: 2.25, y1: 3.55 }); // bangku
  return s;
}
function walkable(x, y, r = 0.22) {
  if (x < 0.25 + r || y < 0.25 + r || x > RW - 0.15 - r || y > RH - 0.15 - r) return false;
  for (const b of solids()) if (x > b.x0 - r && x < b.x1 + r && y > b.y0 - r && y < b.y1 + r) return false;
  return true;
}
function candidates() {
  const list = [
    { id: "h_door", x: DOOR.x + 0.25, y: DOOR.y, r: 0.85, icon: "🚪", label: "Keluar" },
    { id: "h_bed", x: 5.85, y: 2.55, r: 0.95, icon: "🛏️", label: "Kasur" },
    { id: "h_catalog", x: 2.55, y: 3.45, r: 0.85, icon: "📒", label: "Katalog" },
    { id: "h_aqua", x: has("akuarium") ? 1.45 : 1.35, y: 2.0, r: 0.9, icon: "🐠", label: "Akuarium" },
  ];
  if (has("trofi")) list.push({ id: "h_trophy", x: 1.2, y: 0.55, r: 0.75, icon: "🏆", label: "Trofi" });
  if (has("radio")) list.push({ id: "h_radio", x: 5.75, y: 3.0, r: 0.8, icon: "📻", label: radioOn ? "Matikan" : "Radio" });
  if (has("kucing")) list.push({ id: "h_cat", x: cat.x, y: cat.y, r: 0.85, icon: "🐈", label: "Elus" });
  return list;
}

// ---------- Kucing & musik ----------
const cat = { x: 3.5, y: 4.2, tx: 3.5, ty: 4.2, wait: 2, dir: 1, sleep: 0, hearts: 0 };
function updateCat(dt) {
  if (!has("kucing")) return;
  if (cat.hearts > 0) cat.hearts -= dt;
  if (cat.wait > 0) { cat.wait -= dt; return; }
  const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy);
  if (d < 0.05) {
    cat.wait = rand(2, 6); cat.sleep = Math.random() < 0.4 ? cat.wait : 0;
    for (let i = 0; i < 20; i++) { const x = rand(1, 6.3), y = rand(1, 5.5); if (walkable(x, y, 0.2)) { cat.tx = x; cat.ty = y; break; } }
    if (has("karpet") && Math.random() < 0.5) { cat.tx = 3.5; cat.ty = 4.25; }
    return;
  }
  const st = Math.min(d, dt * 0.9); cat.x += (dx / d) * st; cat.y += (dy / d) * st;
  const a = P(0, 0), b = P(dx, dy); cat.dir = b.x - a.x >= 0 ? 1 : -1;
}
let radioOn = false, radioT = null;
const SONG = [392, 440, 523, 440, 392, 330, 392, 0, 330, 392, 440, 392, 330, 294, 330, 0];
function radio(on) {
  radioOn = on; clearInterval(radioT);
  if (!on) return;
  let i = 0;
  radioT = setInterval(() => {
    if (!state.active || N().S.muted) return;
    const f = SONG[i++ % SONG.length]; if (f) { N().tone(f, 0.32, "triangle", 0.045); N().tone(f / 2, 0.4, "sine", 0.03); }
  }, 360);
}

// ---------- Gambar ----------
function box(c, b, z0, h, top, left, right) {
  c.fillStyle = left; poly(c, [P(b.x0, b.y1, z0), P(b.x1, b.y1, z0), P(b.x1, b.y1, z0 + h), P(b.x0, b.y1, z0 + h)]); c.fill();
  c.fillStyle = right; poly(c, [P(b.x1, b.y1, z0), P(b.x1, b.y0, z0), P(b.x1, b.y0, z0 + h), P(b.x1, b.y1, z0 + h)]); c.fill();
  c.fillStyle = top; poly(c, [P(b.x0, b.y0, z0 + h), P(b.x1, b.y0, z0 + h), P(b.x1, b.y1, z0 + h), P(b.x0, b.y1, z0 + h)]); c.fill();
}
const wood = (c, b, z0, h, col = "#9a6a3c") => box(c, b, z0, h, shade(col, 0.12), col, shade(col, -0.2));

function drawRoom(c, t, dk) {
  // bayangan dasar ruangan
  c.fillStyle = "rgba(0,0,0,.25)"; poly(c, [P(0, 0, -6), P(RW, 0, -6), P(RW, RH, -6), P(0, RH, -6)]); c.fill();
  // tebal lantai
  c.fillStyle = "#6e4628"; poly(c, [P(0, RH, 0), P(RW, RH, 0), P(RW, RH, -8), P(0, RH, -8)]); c.fill();
  c.fillStyle = "#5a3a20"; poly(c, [P(RW, 0, 0), P(RW, RH, 0), P(RW, RH, -8), P(RW, 0, -8)]); c.fill();
  // lantai papan
  for (let x = 0; x < RW; x++) for (let y = 0; y < RH; y++) {
    c.fillStyle = (x + y) % 2 ? "#c8935a" : "#bf8a52";
    poly(c, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)]); c.fill();
  }
  c.strokeStyle = "rgba(90,58,32,.35)"; c.lineWidth = 1;
  for (let y = 0.5; y < RH; y += 0.5) { const a = P(0, y), b = P(RW, y); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  // dinding belakang (y = 0) dengan motif
  c.fillStyle = "#ead7ae"; poly(c, [P(0, 0, 0), P(RW, 0, 0), P(RW, 0, WALL), P(0, 0, WALL)]); c.fill();
  c.strokeStyle = "rgba(160,120,70,.18)"; c.lineWidth = 3;
  for (let x = 0.35; x < RW; x += 0.5) { const a = P(x, 0, 6), b = P(x, 0, WALL - 4); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  // dinding kiri (x = 0)
  c.fillStyle = "#d9c296"; poly(c, [P(0, 0, 0), P(0, RH, 0), P(0, RH, WALL), P(0, 0, WALL)]); c.fill();
  // list bawah & atas
  c.fillStyle = "#8a5a32";
  poly(c, [P(0, 0, 0), P(RW, 0, 0), P(RW, 0, 8), P(0, 0, 8)]); c.fill(); poly(c, [P(0, 0, 0), P(0, RH, 0), P(0, RH, 8), P(0, 0, 8)]); c.fill();
  c.fillStyle = "#6e4628";
  poly(c, [P(0, 0, WALL), P(RW, 0, WALL), P(RW, 0, WALL + 6), P(0, 0, WALL + 6)]); c.fill(); poly(c, [P(0, 0, WALL), P(0, RH, WALL), P(0, RH, WALL + 6), P(0, 0, WALL + 6)]); c.fill();
  // jendela di dinding belakang: langit sesuai jam
  const w0 = 3.2, w1 = 4.6, z0 = 34, z1 = 76;
  c.fillStyle = "#6e4628"; poly(c, [P(w0 - 0.08, 0, z0 - 4), P(w1 + 0.08, 0, z0 - 4), P(w1 + 0.08, 0, z1 + 4), P(w0 - 0.08, 0, z1 + 4)]); c.fill();
  const sky = mix("#9fd3e6", "#13234a", clamp(dk / 0.85, 0, 1));
  c.fillStyle = sky; poly(c, [P(w0, 0, z0), P(w1, 0, z0), P(w1, 0, z1), P(w0, 0, z1)]); c.fill();
  c.fillStyle = mix("#2fa3bb", "#0d2140", clamp(dk / 0.85, 0, 1)); poly(c, [P(w0, 0, z0), P(w1, 0, z0), P(w1, 0, z0 + 12), P(w0, 0, z0 + 12)]); c.fill();
  if (dk > 0.4) { c.fillStyle = "#eef2ff"; const m = P(4.15, 0, 66); c.beginPath(); c.arc(m.x, m.y, 4, 0, 7); c.fill(); }
  else { c.fillStyle = "#fff3c4"; const m = P(3.6, 0, 64); c.beginPath(); c.arc(m.x, m.y, 5, 0, 7); c.fill(); }
  c.fillStyle = "#6e4628"; poly(c, [P(3.88, 0, z0), P(3.92, 0, z0), P(3.92, 0, z1), P(3.88, 0, z1)]); c.fill();
  // tirai
  c.fillStyle = "#579b8b";
  poly(c, [P(w0 - 0.25, 0, z1 + 8), P(w0 + 0.15, 0, z1 + 8), P(w0 + 0.05, 0, z0 - 6), P(w0 - 0.25, 0, z0 - 6)]); c.fill();
  poly(c, [P(w1 - 0.15, 0, z1 + 8), P(w1 + 0.25, 0, z1 + 8), P(w1 + 0.25, 0, z0 - 6), P(w1 - 0.05, 0, z0 - 6)]); c.fill();
  // pintu keluar di dinding kiri
  c.fillStyle = "#5a3a20"; poly(c, [P(0, 4.0, 0), P(0, 5.2, 0), P(0, 5.2, 62), P(0, 4.0, 62)]); c.fill();
  c.fillStyle = "#8a5a32"; poly(c, [P(0, 4.08, 0), P(0, 5.12, 0), P(0, 5.12, 58), P(0, 4.08, 58)]); c.fill();
  c.fillStyle = "#e0b84c"; const k = P(0, 4.95, 30); c.beginPath(); c.arc(k.x, k.y, 2.2, 0, 7); c.fill();
  c.fillStyle = "#c79a64"; poly(c, [P(0.02, 4.0, 0), P(0.6, 4.0, 0), P(0.6, 5.2, 0), P(0.02, 5.2, 0)]); c.fill(); // keset
  // lukisan
  if (has("lukisan")) {
    c.fillStyle = "#6e4628"; poly(c, [P(1.0, 0, 40), P(2.4, 0, 40), P(2.4, 0, 80), P(1.0, 0, 80)]); c.fill();
    const g = c.createLinearGradient(0, P(1.7, 0, 78).y, 0, P(1.7, 0, 44).y); g.addColorStop(0, "#f39a58"); g.addColorStop(0.55, "#f6c96a"); g.addColorStop(0.56, "#2f7fa3"); g.addColorStop(1, "#174c6a");
    c.fillStyle = g; poly(c, [P(1.06, 0, 43), P(2.34, 0, 43), P(2.34, 0, 77), P(1.06, 0, 77)]); c.fill();
    c.fillStyle = "#fff3c4"; const s = P(1.75, 0, 60); c.beginPath(); c.arc(s.x, s.y, 4, Math.PI, 0); c.fill();
    c.fillStyle = "#3f2a18"; c.beginPath(); const bt = P(1.4, 0, 52); c.moveTo(bt.x - 5, bt.y); c.lineTo(bt.x + 6, bt.y + 3); c.lineTo(bt.x + 3, bt.y + 5); c.lineTo(bt.x - 3, bt.y + 3); c.fill();
  }
  // karpet tenun
  if (has("karpet")) {
    const r = { x0: 2.2, y0: 3.5, x1: 4.9, y1: 5.4 };
    c.fillStyle = "#a63d2f"; poly(c, [P(r.x0, r.y0, 1), P(r.x1, r.y0, 1), P(r.x1, r.y1, 1), P(r.x0, r.y1, 1)]); c.fill();
    c.fillStyle = "#e0b84c"; poly(c, [P(r.x0 + 0.15, r.y0 + 0.15, 1), P(r.x1 - 0.15, r.y0 + 0.15, 1), P(r.x1 - 0.15, r.y1 - 0.15, 1), P(r.x0 + 0.15, r.y1 - 0.15, 1)]); c.fill();
    c.fillStyle = "#7a2a20"; poly(c, [P(r.x0 + 0.25, r.y0 + 0.25, 1), P(r.x1 - 0.25, r.y0 + 0.25, 1), P(r.x1 - 0.25, r.y1 - 0.25, 1), P(r.x0 + 0.25, r.y1 - 0.25, 1)]); c.fill();
    c.fillStyle = "#f3e2bd";
    for (let i = 0; i < 5; i++) { const cx = r.x0 + 0.55 + i * 0.4, cy = (r.y0 + r.y1) / 2; poly(c, [P(cx, cy - 0.3, 1), P(cx + 0.18, cy, 1), P(cx, cy + 0.3, 1), P(cx - 0.18, cy, 1)]); c.fill(); }
  }
}

// perabot sebagai objek yang diurutkan kedalamannya bersama pemain & kucing
function furniture(t) {
  const L = [];
  L.push({ d: FIXED.bed.x1 + FIXED.bed.y0 + 0.4, draw: (c) => drawBed(c) });
  L.push({ d: 2.55 + 2.6, draw: (c) => drawTable(c) });
  L.push({ d: 1.9 + 3.3, draw: (c) => wood(c, { x0: 1.7, y0: 3.05, x1: 2.25, y1: 3.55 }, 0, 14, "#8a5a32") });
  const aq = has("akuarium") ? FIXED.aquaBig : FIXED.aqua;
  L.push({ d: aq.x1 + (aq.y0 + aq.y1) / 2 - 0.3, draw: (c) => drawAquarium(c, t, aq) });
  if (has("trofi")) L.push({ d: 0.7 + 0.4, draw: (c) => drawTrophies(c, t) });
  if (has("radio")) L.push({ d: 6.95 + 3.0, draw: (c) => drawCabinet(c, t) });
  if (has("tanaman")) L.push({ d: 6.4 + 5.3, draw: (c) => drawPlant(c, t) });
  if (has("kucing")) L.push({ d: cat.x + cat.y, draw: (c) => drawCat(c, t) });
  return L;
}
function drawBed(c) {
  const b = FIXED.bed;
  wood(c, b, 0, 14, "#7a5233");
  box(c, { x0: b.x0 + 0.05, y0: b.y0 + 0.05, x1: b.x1 - 0.05, y1: b.y1 - 0.05 }, 14, 9, "#fbf6ea", "#e9e2d2", "#d7cfbd");
  box(c, { x0: b.x0 + 0.05, y0: b.y0 + 0.75, x1: b.x1 - 0.05, y1: b.y1 - 0.02 }, 23, 3, "#579b8b", "#3f7a6c", "#356658"); // selimut
  for (let i = 0; i < 4; i++) { c.fillStyle = "rgba(255,255,255,.25)"; const a = P(b.x0 + 0.3 + i * 0.45, b.y0 + 0.9, 26), z = P(b.x0 + 0.3 + i * 0.45, b.y1 - 0.1, 26); c.fillRect(Math.min(a.x, z.x), a.y, 2, z.y - a.y); }
  box(c, { x0: b.x0 + 0.25, y0: b.y0 + 0.15, x1: b.x0 + 1.0, y1: b.y0 + 0.6 }, 23, 6, "#ffffff", "#eee", "#ddd"); // bantal
  box(c, { x0: b.x0 + 1.15, y0: b.y0 + 0.15, x1: b.x0 + 1.9, y1: b.y0 + 0.6 }, 23, 6, "#ffffff", "#eee", "#ddd");
  // sandaran kepala
  c.fillStyle = "#6b4527"; poly(c, [P(b.x0, b.y0, 0), P(b.x1, b.y0, 0), P(b.x1, b.y0, 42), P(b.x0, b.y0, 42)]); c.fill();
}
function drawTable(c) {
  const b = FIXED.table;
  c.fillStyle = "#6e4628";
  for (const [x, y] of [[b.x0 + 0.06, b.y1 - 0.06], [b.x1 - 0.06, b.y1 - 0.06], [b.x1 - 0.06, b.y0 + 0.06]]) { const a = P(x, y, 26), g = P(x, y, 0); c.fillRect(a.x - 1.5, a.y, 3, g.y - a.y); }
  box(c, b, 26, 4, "#b27d48", "#8a5a32", "#7a4e2a");
  // katalog terbuka
  const p = P((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 31);
  c.fillStyle = "#fff6e4"; c.beginPath(); c.moveTo(p.x - 12, p.y); c.lineTo(p.x, p.y - 6); c.lineTo(p.x + 12, p.y); c.lineTo(p.x, p.y + 6); c.closePath(); c.fill();
  c.strokeStyle = "#c2603b"; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y - 6); c.lineTo(p.x, p.y + 6); c.stroke();
  c.fillStyle = "rgba(23,63,80,.4)"; for (let i = 0; i < 3; i++) c.fillRect(p.x - 9 + i * 2, p.y - 1 + i * 1.2, 6, 0.8);
  // gelas kopi
  const m = P(b.x1 - 0.2, b.y0 + 0.2, 31); c.fillStyle = "#e2574c"; c.fillRect(m.x - 3, m.y - 6, 6, 6);
}
function drawAquarium(c, t, b) {
  wood(c, b, 0, 20, "#5a3a20");
  const z0 = 20, h = has("akuarium") ? 40 : 30;
  // air di dalam kaca
  c.fillStyle = "rgba(76,174,200,.55)"; poly(c, [P(b.x1, b.y1, z0), P(b.x1, b.y0, z0), P(b.x1, b.y0, z0 + h), P(b.x1, b.y1, z0 + h)]); c.fill();
  c.fillStyle = "rgba(90,190,210,.45)"; poly(c, [P(b.x0, b.y1, z0), P(b.x1, b.y1, z0), P(b.x1, b.y1, z0 + h), P(b.x0, b.y1, z0 + h)]); c.fill();
  // ikan berenang (hanya ikan yang pernah ditangkap)
  const fish = aquariumFish();
  const A = P(b.x1, b.y1, z0 + 6), B = P(b.x1, b.y0, z0 + h - 6);
  c.save(); poly(c, [P(b.x1, b.y1, z0), P(b.x1, b.y0, z0), P(b.x1, b.y0, z0 + h), P(b.x1, b.y1, z0 + h)]); c.clip();
  fish.forEach((f, i) => {
    const k = (Math.sin(t * (0.35 + i * 0.07) + i * 2) + 1) / 2, dirR = Math.cos(t * (0.35 + i * 0.07) + i * 2) > 0;
    const x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k - ((i % 3) * (h - 14)) / 3 - 4 + Math.sin(t * 2 + i) * 1.5;
    c.save(); c.translate(x, y); c.scale(dirR ? -1 : 1, 1); N().drawFish(c, f, 0, 0, 15); c.restore();
  });
  // gelembung & tanaman
  c.fillStyle = "rgba(255,255,255,.7)";
  for (let i = 0; i < 4; i++) { const k = (t * 0.4 + i / 4) % 1, p = P(b.x1, b.y0 + 0.3 + i * 0.2, z0 + 4 + k * (h - 8)); c.beginPath(); c.arc(p.x, p.y, 1.2, 0, 7); c.fill(); }
  c.restore();
  c.fillStyle = "#3f8a3e"; for (let i = 0; i < 3; i++) { const p = P(b.x1, b.y1 - 0.25 - i * 0.5, z0); c.beginPath(); c.moveTo(p.x - 2, p.y); c.quadraticCurveTo(p.x + Math.sin(t + i) * 3, p.y - 10, p.x, p.y - 16 - i * 2); c.lineTo(p.x + 2, p.y); c.fill(); }
  // bingkai kaca
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.2;
  poly(c, [P(b.x0, b.y1, z0), P(b.x1, b.y1, z0), P(b.x1, b.y0, z0), P(b.x1, b.y0, z0 + h), P(b.x0, b.y0, z0 + h), P(b.x0, b.y1, z0 + h)]); c.stroke();
  c.beginPath(); const e0 = P(b.x1, b.y1, z0), e1 = P(b.x1, b.y1, z0 + h); c.moveTo(e0.x, e0.y); c.lineTo(e1.x, e1.y); c.stroke();
  c.fillStyle = "#2c3a40"; poly(c, [P(b.x0, b.y0, z0 + h), P(b.x1, b.y0, z0 + h), P(b.x1, b.y1, z0 + h), P(b.x0, b.y1, z0 + h)]); c.fill();
}
function aquariumFish() {
  const S = N().S, order = ["legenda", "epik", "langka", "biasa"];
  const caught = FISH.filter((f) => !f.emoji && S.dex[f.id]).sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
  return caught.slice(0, has("akuarium") ? 6 : 3);
}
function legends() { const S = N().S; return FISH.filter((f) => f.rarity === "legenda" && S.dex[f.id]); }
function drawTrophies(c, t) {
  const b = FIXED.trophy;
  wood(c, b, 0, 52, "#7a5233");
  for (let s = 0; s < 3; s++) { c.fillStyle = "#5a3a20"; poly(c, [P(b.x1, b.y1, 14 + s * 16), P(b.x1, b.y0, 14 + s * 16), P(b.x1, b.y0, 16 + s * 16), P(b.x1, b.y1, 16 + s * 16)]); c.fill(); }
  const L = legends(), n = Math.max(1, L.length);
  for (let i = 0; i < Math.min(6, n); i++) {
    const p = P(b.x1 + 0.02, b.y1 - 0.18 - (i % 2) * 0.32, 17 + Math.floor(i / 2) * 16);
    const gold = L.length ? "#e0b84c" : "#b9b9b0";
    c.fillStyle = gold; c.fillRect(p.x - 3, p.y - 9, 6, 6); c.fillRect(p.x - 1, p.y - 3, 2, 3); c.fillRect(p.x - 3, p.y, 6, 1.5);
    c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(p.x - 2, p.y - 8, 1.2, 4);
  }
}
function drawCabinet(c, t) {
  const b = FIXED.cabinet;
  wood(c, b, 0, 24, "#8a5a32");
  const p = P((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 24);
  c.fillStyle = "#c2603b"; c.fillRect(p.x - 10, p.y - 13, 20, 12); c.fillStyle = "#3a2a1a"; c.beginPath(); c.arc(p.x - 4, p.y - 7, 3.5, 0, 7); c.fill();
  c.fillStyle = "#fff0b0"; c.fillRect(p.x + 1, p.y - 11, 7, 3); c.strokeStyle = "#3a2a1a"; c.beginPath(); c.moveTo(p.x + 6, p.y - 13); c.lineTo(p.x + 11, p.y - 22); c.stroke();
  if (radioOn) for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; c.fillStyle = "#173f50"; c.font = "10px serif"; c.fillText("♪", p.x + 6 + k * 12 + Math.sin(t * 3 + i) * 3, p.y - 18 - k * 26); c.globalAlpha = 1; }
}
function drawPlant(c, t) {
  const p = P(6.4, 5.3, 0);
  c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(p.x + 3, p.y, 12, 5, 0, 0, 7); c.fill();
  c.fillStyle = "#c2603b"; c.beginPath(); c.moveTo(p.x - 9, p.y - 16); c.lineTo(p.x + 9, p.y - 16); c.lineTo(p.x + 6, p.y); c.lineTo(p.x - 6, p.y); c.fill();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.42 + Math.sin(t * 0.8 + i) * 0.03;
    c.fillStyle = i % 2 ? "#3f8a3e" : "#4f9a46";
    c.beginPath(); c.ellipse(p.x + Math.cos(a) * 14, p.y - 22 + Math.sin(a) * 14, 9, 5, a, 0, 7); c.fill();
  }
}
function drawCat(c, t) {
  const p = P(cat.x, cat.y, 0), s = cat.dir;
  c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(p.x, p.y, 10, 3.5, 0, 0, 7); c.fill();
  c.save(); c.translate(p.x, p.y); c.scale(s, 1);
  const sleeping = cat.wait > 0 && cat.sleep > 0, moving = cat.wait <= 0;
  const bob = moving ? Math.abs(Math.sin(t * 10)) * 1.2 : 0;
  // ekor
  c.strokeStyle = "#d98a3d"; c.lineWidth = 3; c.lineCap = "round";
  c.beginPath(); c.moveTo(-8, -6); c.quadraticCurveTo(-16, -10 - Math.sin(t * 3) * 4, -13, -18); c.stroke();
  c.fillStyle = "#e89a48";
  if (sleeping) { c.beginPath(); c.ellipse(0, -5, 10, 5.5, 0, 0, 7); c.fill(); c.beginPath(); c.arc(7, -6, 4.5, 0, 7); c.fill(); }
  else {
    c.beginPath(); c.ellipse(-1, -8 - bob, 9, 5, 0, 0, 7); c.fill();
    c.fillRect(-7, -6, 2.5, 6); c.fillRect(4, -6, 2.5, 6);
    c.beginPath(); c.arc(8, -13 - bob, 5, 0, 7); c.fill();
    c.beginPath(); c.moveTo(5, -16 - bob); c.lineTo(6, -21 - bob); c.lineTo(8.5, -17 - bob); c.fill(); c.beginPath(); c.moveTo(9, -17 - bob); c.lineTo(11.5, -21 - bob); c.lineTo(12.5, -15 - bob); c.fill();
    c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(10, -13.5 - bob, 0.9, 0, 7); c.fill();
  }
  c.strokeStyle = "#b8682a"; c.lineWidth = 1.2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-5 + i * 3.5, -12 - bob); c.lineTo(-4 + i * 3.5, -8 - bob); c.stroke(); }
  c.restore();
  if (sleeping) { c.fillStyle = "#173f50"; c.font = "700 9px system-ui"; c.fillText("z", p.x + 10, p.y - 18 - (t * 8 % 8)); }
  if (cat.hearts > 0) { c.globalAlpha = Math.min(1, cat.hearts); c.font = "11px sans-serif"; c.fillText("❤️", p.x - 4, p.y - 26 - (1.5 - cat.hearts) * 12); c.globalAlpha = 1; }
}
function drawLampAndLight(c, t, dk) {
  if (has("lampu")) {
    const top = P(3.5, 3.0, WALL + 34), bulb = P(3.5, 3.0, 82);
    c.strokeStyle = "#2c3a40"; c.lineWidth = 1; c.beginPath(); c.moveTo(top.x, top.y - 60); c.lineTo(bulb.x, bulb.y - 8); c.stroke();
    c.fillStyle = "#e0b84c"; c.beginPath(); c.moveTo(bulb.x - 12, bulb.y); c.lineTo(bulb.x + 12, bulb.y); c.lineTo(bulb.x + 5, bulb.y - 10); c.lineTo(bulb.x - 5, bulb.y - 10); c.fill();
    c.fillStyle = dk > 0.3 ? "#fff1c4" : "#f3e7c9"; c.beginPath(); c.arc(bulb.x, bulb.y + 2, 4, 0, 7); c.fill();
  }
}

// ---------- Siklus masuk / keluar ----------
const state = { active: false };
let returnTo = null;
function fadeThen(fn) { const f = document.getElementById("fade"); f.classList.add("on"); setTimeout(() => { fn(); setTimeout(() => f.classList.remove("on"), 60); }, 320); }
function enter(player) {
  fadeThen(() => {
    returnTo = { x: player.x, y: player.y };
    state.active = true; player.x = DOOR.x + 0.6; player.y = DOOR.y; player.dir = 0;
    NW.world.snapCamera(); N().sfx("click");
    const b = document.getElementById("banner"); b.textContent = "🏠 Rumahku"; b.classList.add("show"); setTimeout(() => b.classList.remove("show"), 1800);
    N().setHint(N().S.home.items.length ? "" : "Lihat katalog di meja untuk menghias rumahmu");
  });
}
function exit(player) {
  fadeThen(() => {
    state.active = false; radio(false);
    player.x = 9.46; player.y = 15.75; player.dir = 2;
    NW.world.snapCamera(); NW.world.updateHint();
  });
}

// ---------- Interaksi ----------
function interact(t, player, openDialog) {
  const S = N().S;
  if (t.id === "h_door") return exit(player);
  if (t.id === "h_bed") {
    const h = S.hour, night = h >= 18 || h < 5;
    if (night) openDialog({ name: "Kasur", avatar: "🛏️", lines: ["Kasurnya empuk. Sudah malam, saatnya istirahat."], options: [{ label: "😴 Tidur sampai pagi", act: () => sleep(player) }] });
    else if (h >= 11 && h < 17) openDialog({ name: "Kasur", avatar: "🛏️", lines: ["Siang yang panas. Tidur siang sebentar?"], options: [{ label: "😪 Tidur siang (3 jam)", act: () => fadeThen(() => { S.hour += 3; N().save(); N().toast("Segar lagi! ☀️", "good"); }) }] });
    else openDialog({ name: "Kasur", avatar: "🛏️", lines: ["Belum ngantuk. Tidur malam bisa mulai pukul 18:00, tidur siang pukul 11:00–17:00."] });
  } else if (t.id === "h_catalog") N().openPanel("catalog");
  else if (t.id === "h_aqua") {
    const f = aquariumFish();
    openDialog({ name: has("akuarium") ? "Akuarium Besar" : "Akuarium", avatar: "🐠", lines: f.length ? [`Di akuarium berenang: ${f.map((x) => x.name).join(", ")}.`, has("akuarium") ? "Ikan paling langka dari koleksimu otomatis dipajang di sini." : "Akuarium kecil muat 3 ikan. Akuarium Besar di katalog muat 6."] : ["Akuarium masih kosong.", "Ikan yang pernah kamu tangkap akan muncul di sini."] });
  } else if (t.id === "h_trophy") {
    const L = legends(), best = Object.entries(S.dex).map(([id, r]) => [N().FISH_BY_ID[id], r.best]).filter(([f]) => f && !f.emoji).sort((a, b) => b[1] - a[1])[0];
    openDialog({ name: "Rak Trofi", avatar: "🏆", lines: [L.length ? `Trofi legenda: ${L.map((f) => f.name).join(", ")}.` : "Belum ada trofi legenda. Cari ikan legenda di tiap pulau!", best ? `Rekor terberat: ${best[0].name} ${N().fmtW(best[1])}.` : "Belum ada rekor."] });
  } else if (t.id === "h_radio") { radio(!radioOn); N().toast(radioOn ? "📻 Radio menyala" : "📻 Radio mati"); }
  else if (t.id === "h_cat") { cat.hearts = 1.5; cat.wait = 3; cat.sleep = 0; N().tone(880, 0.12, "triangle", 0.06, 660); N().tone(740, 0.18, "triangle", 0.05, 520, 0.12); N().toast("Si Belang mendengkur senang 🐈"); }
}
function sleep(player) {
  fadeThen(() => {
    N().sleepUntilMorning(); radio(false);
    N().toast(`Selamat pagi! Hari ${N().S.day} ☀️ Misi baru menunggu`, "good");
  });
}

// ---------- Panel katalog ----------
function catalogHTML() {
  const S = N().S;
  let h = `<p class="muted">Hiasi Rumahku. Beberapa perabot butuh ⭐ reputasi dari misi harian. Kamu punya 🪙 ${N().fmt(S.money)} · ⭐ ${S.rep}.</p><div class="list">`;
  for (const it of CATALOG) {
    const own = has(it.id), lock = S.rep < it.stars, poor = S.money < it.price;
    h += `<div class="shop-item"><div class="ic">${it.icon}</div><div class="grow"><b>${it.name}</b><div class="muted">${it.desc}</div>
      ${it.stars ? `<div class="muted">Butuh ${it.stars} ⭐</div>` : ""}</div>
      ${own ? `<span class="muted">✔ Dimiliki</span>` : lock ? `<span class="muted">🔒 ${it.stars} ⭐</span>` : `<button class="btn ${poor ? "" : "gold"}" data-act="buyItem" data-arg="${it.id}" ${poor ? "disabled" : ""}>🪙 ${N().fmt(it.price)}</button>`}</div>`;
  }
  return h + `</div>`;
}
function catalogAct(a, arg) {
  if (a !== "buyItem") return;
  const S = N().S, it = CATALOG.find((x) => x.id === arg);
  if (!it || has(it.id) || S.money < it.price || S.rep < it.stars) return;
  S.money -= it.price; S.home.items.push(it.id);
  if (it.id === "kucing") { cat.x = 3.5; cat.y = 4.2; }
  N().sfx("coin"); N().toast(`${it.icon} ${it.name} dipasang di Rumahku!`, "good"); N().save(); N().refreshHUD(); N().renderPanel();
}
function hook() { N().registerPanel("catalog", { title: () => "📒 Katalog Perabot", render: catalogHTML, act: catalogAct }); }

NW.home = {
  state, get active() { return state.active; }, RW, RH, walkable, candidates, interact, enter, exit, hook, CATALOG,
  update(dt) { updateCat(dt); },
  center: () => P(RW / 2, RH / 2, 20),
  // gambar ruangan + perabot + karakter (dipanggil world.draw)
  draw(c, t, dk, player) {
    drawRoom(c, t, dk);
    const L = furniture(t); L.push({ d: player.x + player.y, draw: (cc) => NW.drawCharacter(cc, player, t) });
    L.sort((a, b) => a.d - b.d).forEach((it) => it.draw(c));
    drawLampAndLight(c, t, dk);
  },
  lit: () => has("lampu"),
};
})();
