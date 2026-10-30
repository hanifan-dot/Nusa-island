// =========================================================
//  NUSA ISLAND — Bumbu 2.2: Varian ikan istimewa (kosmetik)
//  Varian = ATRIBUT terpisah (item.vr), bukan spesies baru dan tidak mengubah rarity/berat/harga.
//   normal (tanpa atribut) · silver "Sisik Perak" · sunset "Corak Senja" · pearl "Mutiara Nusantara"
//  Satu tabel peluang terpusat (VARIANT_TABLE) — total harus tepat 100. Dipilih SEKALI saat tangkapan berhasil.
//  Tampilan digambar prosedural di atas renderer ikan yang sama (tanpa gambar besar per ikan).
// =========================================================
window.NW = window.NW || {};
(() => {
"use strict";

// ---------- tabel peluang (persen) — ubah di sini saja ----------
const VARIANT_TABLE = { normal: 91.5, silver: 6, sunset: 2, pearl: 0.5 };
const IDS = ["normal", "silver", "sunset", "pearl"];
const INFO = {
  normal: { id: "normal", name: "Normal", icon: "🐟", color: "#9aa7a8", short: "Normal" },
  silver: { id: "silver", name: "Sisik Perak", icon: "🪙", color: "#cfd8e3", short: "Perak" },
  sunset: { id: "sunset", name: "Corak Senja", icon: "🌅", color: "#ff9a4a", short: "Senja" },
  pearl: { id: "pearl", name: "Mutiara Nusantara", icon: "🦪", color: "#f2d9ee", short: "Mutiara" },
};
// Bonus spot rahasia: kelipatan peluang varian tertentu (alasannya: air tenang berkilau / cahaya senja menembus bambu).
// Tidak menyentuh pemilihan spesies maupun rarity, dan Mutiara tidak pernah dinaikkan oleh spot.
const SPOT_BONUS = {
  lubuk: { silver: 1.25, sunset: 1.5 },   // Lubuk Bambu Muara: cahaya senja menyela rumpun bambu
  teluk: { silver: 1.5, sunset: 1.25 },   // Teluk Sunyi Toba: air tenang memantulkan kilau
};
const HIT_BONUS = 1.2;                    // Lemparan Presisi tepat di riak (hanya berlaku di spot rahasia)

const sumTable = (t) => IDS.reduce((s, k) => s + t[k], 0);
const tableOk = () => Math.abs(sumTable(VARIANT_TABLE) - 100) < 1e-9 && IDS.every((k) => VARIANT_TABLE[k] >= 0);

// ikan yang boleh punya varian: bukan sampah (emoji), bukan yang dilepas (dilindungi)
const eligible = (fish) => !!fish && !fish.emoji && fish.rarity !== "sampah" && !fish.protected;

// peluang akhir untuk satu tangkapan: { normal, silver, sunset, pearl } (jumlah tepat 100)
function weights(opt = {}) {
  const w = { ...VARIANT_TABLE };
  const b = opt.spot && SPOT_BONUS[opt.spot];
  if (b) {
    for (const k of Object.keys(b)) w[k] *= b[k];
    if (opt.hit) for (const k of Object.keys(b)) w[k] *= HIT_BONUS;
  }
  w.normal = 100 - (w.silver + w.sunset + w.pearl);
  return w;
}
function roll(fish, opt = {}, rnd = Math.random) {
  if (!eligible(fish)) return "normal";
  const w = weights(opt); let r = rnd() * 100;
  for (const k of ["pearl", "sunset", "silver"]) { if (r < w[k]) return k; r -= w[k]; }
  return "normal";
}
const valid = (v) => v === "silver" || v === "sunset" || v === "pearl";
const of = (it) => (it && valid(it.vr) ? it.vr : "normal");
const info = (v) => INFO[valid(v) ? v : "normal"];

// ---------- warna ----------
const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex(a) { return "#" + a.map((v) => clamp8(v).toString(16).padStart(2, "0")).join(""); }
function mixHex(a, b, t) { const A = rgb(a), B = rgb(b); return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }

// warna dasar yang dipakai renderer: spesies tetap dikenali (hanya digeser sebagian)
function look(f, v) {
  const col = f.color, fin = f.finColor || null, belly = f.belly || null;
  if (v === "silver") return { col: mixHex(col, "#c9d3de", 0.22), fin: mixHex(fin || mixHex(col, "#000000", 0.15), "#dfe7ef", 0.3), belly: mixHex(belly || mixHex(col, "#ffffff", 0.5), "#f4f8fb", 0.55) };
  if (v === "sunset") return { col: mixHex(col, "#e9964a", 0.3), fin: mixHex(fin || mixHex(col, "#000000", 0.15), "#ff9a3c", 0.5), belly: mixHex(belly || mixHex(col, "#ffffff", 0.5), "#ffe2b0", 0.5) };
  if (v === "pearl") return { col: mixHex(col, "#efe6ee", 0.4), fin: mixHex(fin || mixHex(col, "#000000", 0.15), "#f6e4f0", 0.4), belly: mixHex(belly || mixHex(col, "#ffffff", 0.5), "#fffaf6", 0.7) };
  return { col, fin, belly };
}

// RNG ber-seed kecil (pola tetap untuk spesies yang sama → tidak "berkedip" antar-gambar)
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
function hs(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function spark(c, x, y, r, a) { // kilau empat sudut kecil (satu path, murah)
  c.globalAlpha = a; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.28, y - r * 0.28); c.lineTo(x + r, y); c.lineTo(x + r * 0.28, y + r * 0.28);
  c.lineTo(x, y + r); c.lineTo(x - r * 0.28, y + r * 0.28); c.lineTo(x - r, y); c.lineTo(x - r * 0.28, y - r * 0.28); c.closePath(); c.fill(); c.globalAlpha = 1;
}

// Lapisan hias di atas badan (dipanggil dalam clip badan). g = {x,y,tx,hx,bl,bh,L}
function paint(c, v, g, f) {
  const { y, tx, hx, bl, bh, L } = g, r = rng(hs(f.id + ":" + v));
  if (v === "silver") {
    const gr = c.createLinearGradient(tx, y - bh * 0.6, hx, y + bh * 0.4);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.35, "rgba(235,242,250,.5)"); gr.addColorStop(0.5, "rgba(255,255,255,.2)"); gr.addColorStop(0.75, "rgba(210,222,236,.32)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gr; c.fillRect(tx - 2, y - bh, bl + 6, bh * 2);
    c.fillStyle = "#ffffff";
    for (let i = 0; i < 9; i++) spark(c, tx + bl * (0.18 + r() * 0.66), y - bh * (0.42 - r() * 0.7), Math.max(1.2, bh * (0.05 + r() * 0.05)), 0.55 + r() * 0.4);
    return;
  }
  if (v === "sunset") {
    const gr = c.createLinearGradient(tx, 0, hx, 0);
    gr.addColorStop(0, "rgba(255,196,84,.62)"); gr.addColorStop(0.5, "rgba(255,128,52,.42)"); gr.addColorStop(1, "rgba(255,170,90,.10)");
    c.fillStyle = gr; c.fillRect(tx - 2, y - bh, bl + 6, bh * 2);
    // corak: bilah lembut melintang (spesies bergaris) atau bintik emas (spesies lain) — selalu terlihat di tubuh
    if (f.stripes) { c.fillStyle = "rgba(255,214,120,.42)"; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(hx - bl * (0.22 + i * 0.2), y, bl * 0.03, bh * 0.9, 0.15, 0, 7); c.fill(); } }
    else { c.fillStyle = "rgba(255,214,120,.5)"; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(tx + bl * (0.2 + i * 0.19), y + bh * (r() - 0.5) * 0.35, bl * 0.045, bh * 0.38, 0.35, 0, 7); c.fill(); } }
    c.fillStyle = "rgba(255,246,200,.55)"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(tx + bl * (0.15 + r() * 0.7), y - bh * 0.4 + r() * bh * 0.75, Math.max(0.9, bh * 0.035), 0, 7); c.fill(); }
    return;
  }
  if (v === "pearl") {
    const gr = c.createLinearGradient(tx, y - bh * 0.6, hx, y + bh * 0.6);
    gr.addColorStop(0, "rgba(255,186,226,.42)"); gr.addColorStop(0.34, "rgba(170,236,246,.40)"); gr.addColorStop(0.66, "rgba(206,190,255,.40)"); gr.addColorStop(1, "rgba(255,225,190,.34)");
    c.fillStyle = gr; c.fillRect(tx - 2, y - bh, bl + 6, bh * 2);
    const hl = c.createRadialGradient(hx - bl * 0.38, y - bh * 0.28, 1, hx - bl * 0.38, y - bh * 0.28, bl * 0.34);
    hl.addColorStop(0, "rgba(255,255,255,.75)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = hl; c.fillRect(tx, y - bh, bl + 6, bh * 2);
    c.fillStyle = "#ffffff"; for (let i = 0; i < 4; i++) spark(c, tx + bl * (0.2 + r() * 0.6), y - bh * (0.45 - r() * 0.8), Math.max(1.4, bh * 0.07), 0.7 + r() * 0.3);
  }
}
// kilau di luar badan (hanya mutiara; tiga titik saja, bukan partikel)
function halo(c, v, g) {
  if (v !== "pearl") return;
  const { x, y, bl, bh, L } = g; c.fillStyle = "#fff6ff";
  spark(c, x + bl * 0.05, y - bh * 0.95, Math.max(2, L * 0.03), 0.85); spark(c, x - bl * 0.36, y + bh * 0.9, Math.max(1.6, L * 0.022), 0.7); spark(c, x + bl * 0.42, y + bh * 0.55, Math.max(1.4, L * 0.018), 0.6);
}

// ---------- koleksi per spesies (Buku Koleksi) ----------
function record(S, fish, v, w, loc) {
  if (!eligible(fish)) return;
  S.vd = S.vd || {}; const d = S.vd[fish.id] = S.vd[fish.id] || {};
  const k = valid(v) ? v : "normal", e = d[k] = d[k] || { n: 0, best: 0, loc: loc || null, day: S.day || 1 };
  e.n++; e.best = Math.max(e.best, w);
}
const seen = (S, id, v) => { const e = S.vd && S.vd[id] && S.vd[id][v]; return !!(e && e.n > 0) || (v === "normal" && !!(S.dex && S.dex[id])); };
function counts(S) { const o = { silver: 0, sunset: 0, pearl: 0 }; for (const id in (S.vd || {})) for (const v of ["silver", "sunset", "pearl"]) if (S.vd[id][v] && S.vd[id][v].n > 0) o[v]++; return o; }

// ---------- ikan raksasa (hanya untuk "momen"; tidak mengubah apa pun pada data) ----------
function isGiant(fish, w) {
  if (!eligible(fish) && !fish) return false;
  if (fish.emoji) return false;
  const span = Math.max(0.01, fish.wMax - fish.wMin);
  return w > fish.wMax || w >= 40 || (fish.wMax >= 20 && (w - fish.wMin) / span >= 0.9);
}

// ---------- migrasi / pembersihan ----------
// Ikan lama tidak mendapat varian. Atribut tak dikenal dibuang; mutiara tidak otomatis dikunci ulang (pemain bisa membuka kunci).
function migrate(S) {
  let fixed = 0;
  const fix = (it) => { if (it && it.vr !== undefined && !valid(it.vr)) { delete it.vr; fixed++; } };
  for (const it of S.cooler || []) fix(it);
  if (S.home && Array.isArray(S.home.placedFish)) for (const it of S.home.placedFish) fix(it);
  if (!S.vd || typeof S.vd !== "object" || Array.isArray(S.vd)) S.vd = {};
  for (const id of Object.keys(S.vd)) {
    const d = S.vd[id];
    if (!d || typeof d !== "object") { delete S.vd[id]; continue; }
    for (const k of Object.keys(d)) { const e = d[k]; if (!IDS.includes(k) || !e || !(e.n > 0)) delete d[k]; else { e.n = Math.floor(e.n); e.best = Number(e.best) || 0; } }
  }
  return fixed;
}

NW.variants = { VARIANT_TABLE, IDS, INFO, SPOT_BONUS, HIT_BONUS, tableOk, eligible, weights, roll, valid, of, info, look, paint, halo, record, seen, counts, isGiant, migrate, mixHex };
if (!tableOk()) console.error("VARIANT_TABLE tidak berjumlah 100");
})();
