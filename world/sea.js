// =========================================================
//  NUSA ISLAND — Bumbu 2.4 "Samudra Nusantara": DATA LAUT
//   • Pengaturan berlayar per area (batas, titik sandar, jalan keluar ke area lain)
//   • Spot memancing laut yang ditemukan lewat eksplorasi + petunjuk visual
//     (burung berkumpul, warna air, riak/arus, bayangan ikan)
//   • Kelompok ikan per spot (memakai data FISH lama; tidak ada peluang berbayar)
//   • Koordinat peta laut (chart) yang menyatukan Muara – laut lepas – Selat Sunda
//  Data murni + gambar petunjuk ringan. Mekanik kapal ada di world/boat.js.
// =========================================================
window.NW = window.NW || {};
(() => {
"use strict";
const N = () => window.Nusa, S = () => N().S;
const { P, LIFT, hash2 } = NW;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const HW = NW.TW / 2, HH = NW.TH / 2;
const angT = (tx, ty) => Math.atan2((tx + ty) * HH, (tx - ty) * HW); // arah tile → sudut di layar

// ---------- Spot memancing laut ----------
// fish: { id: bobot di dalam kelompok rarity }, mul: pengali bobot rarity (≤ 1,2; legenda tetap langka)
const SPOTS = {
  pesisir: {
    id: "pesisir", key: "sea:pesisir", area: "muara", name: "Perairan Pesisir", icon: "🐦", x: 45, y: 31, r: 4.6, hint: "birds",
    desc: "Perairan dangkal di selatan jalur kapal Muara. Burung laut berputar di atasnya mengikuti gerombolan ikan kecil.",
    perk: "Kembung, baronang, tongkol, dan sesekali kakap merah.",
    fish: { kembung: 1, baronang: 1, tongkol: 1, nila: 0.4, kakap: 1, patin: 0.4, selar_kuning: 1, peperek: 1, julung: 0.8, kerong: 0.8, bawal_putih: 0.5, kakap_putih: 0.5 }, mul: { sampah: 0.8, langka: 1, epik: 0.35, legenda: 0 },
    view: { water: ["#4f9aa3", "#245e6d"], fog: "#c4dad6", shore: "palm", shoreColor: "#3f6b45", sky: ["#9fd3e6", "#f6e7c1"] },
  },
  karang: {
    id: "karang", key: "sea:karang", area: "laut", name: "Karang Dangkal", icon: "🪸", x: 40, y: 34, r: 4.8, hint: "reef",
    desc: "Gosong karang berair toska di tengah selat. Bintik karang warna-warni terlihat dari permukaan.",
    perk: "Ikan karang: kerapu macan, kakap merah, baronang, kadang kuwe biru.",
    fish: { kerapu_macan: 1.2, kakap: 1, baronang: 1, kembung: 0.5, kuwe_biru: 0.8, kerapu_raksasa: 0.6, ekor_kuning: 1.1, kerong: 0.6, selar_kuning: 0.6 }, mul: { sampah: 0.6, langka: 1.15, epik: 1, legenda: 0.6 },
    view: { water: ["#3fb8b8", "#17708a"], fog: "#bfe3e2", shore: "far", shoreColor: "#3e7d5a", sky: ["#6fbde4", "#e4f0ea"] },
  },
  arus: {
    id: "arus", key: "sea:arus", area: "laut", name: "Arus Selat", icon: "🌊", x: 62, y: 29, r: 5, hint: "current",
    desc: "Riak putih bergaris tanda arus kuat antara dua pulau. Ikan pelagis berburu di sini.",
    perk: "Tongkol, tenggiri, kuwe biru, dan barakuda.",
    fish: { tongkol: 1.2, tenggiri: 1.1, kembung: 0.8, barakuda: 1, kuwe_biru: 1, layang: 1, julung: 0.8, lemadang: 0.8, tuna_gigi_anjing: 0.7 }, mul: { sampah: 0.7, langka: 1.1, epik: 1.2, legenda: 0 },
    view: { water: ["#2f86a8", "#14506e"], fog: "#a9c8d8", shore: "volcano", shoreColor: "#55645c", sky: ["#79b8de", "#f3dcc0"] },
  },
  dalam: {
    id: "dalam", key: "sea:dalam", area: "laut", name: "Laut Dalam", icon: "🐋", x: 22, y: 42, r: 5.6, hint: "deep",
    desc: "Air biru gelap di selatan laut lepas. Sesekali bayangan ikan raksasa melintas jauh di bawah kapal.",
    perk: "Tenggiri, barakuda, kerapu raksasa (malam). Marlin biru sangat, sangat jarang.",
    fish: { tongkol: 1, tenggiri: 1, barakuda: 1, kerapu_raksasa: 1, marlin: 0.3, layang: 0.6, lemadang: 0.6, tuna_gigi_anjing: 0.8 }, mul: { sampah: 0.5, biasa: 1, langka: 0.9, epik: 0.95, legenda: 0.6 },
    view: { water: ["#1a5c9c", "#0a2a55"], fog: "#90b3d6", shore: "far", shoreColor: "#4c6a7a", sky: ["#5f9fd6", "#e9e3d2"] },
  },
  // Bumbu 2.4.1: spot rahasia — tidak ada petunjuk burung/arus; hanya air gelap, kabut tipis, dan cahaya samar. Ikan mistis dilempar terpisah (NW.mystic).
  palung: {
    id: "palung", key: "sea:palung", area: "laut", name: "Palung Mistis Selat", icon: "🌌", x: 66, y: 44.5, r: 4.2, hint: "palung", hidden: true, mystic: true, mark: "rgba(110,240,215,.32)",
    desc: "Palung gelap di tenggara laut lepas. Airnya lebih hitam daripada perairan lain, berkabut tipis, dan sesekali ada cahaya samar yang tak jelas asalnya. Nelayan menyebutnya tempat yang menyimpan rahasia samudra.",
    perk: "Ikan laut dalam: bawal putih, tenggiri, barakuda, lemadang, tuna gigi anjing. Sesekali muncul makhluk lain, lebih sering saat malam, kabut, senja, atau hujan.",
    fish: { bawal_putih: 1, kakap_putih: 0.8, tenggiri: 0.9, barakuda: 0.9, lemadang: 0.8, tuna_gigi_anjing: 0.9, layang: 0.6, tongkol: 0.6, kakap: 0.6 }, mul: { sampah: 0.5, biasa: 0.7, langka: 1.1, epik: 1, legenda: 0 },
    view: { water: ["#0d3a57", "#031321"], fog: "#6d8ea1", shore: "far", shoreColor: "#243642", sky: ["#3a5570", "#a3b6c2"] },
  },
};
// perairan biasa (di luar spot)
const OPEN = {
  muara: { id: "muara_laut", name: "Perairan Muara", fish: { nila: 1, mujair: 1, kembung: 0.7, baronang: 0.6, patin: 0.7, gabus: 0.5, kakap: 0.3 }, mul: { langka: 0.7, epik: 0.2, legenda: 0 },
    view: { water: ["#5f9a96", "#2f6466"], fog: "#c9d6c5", shore: "palm", shoreColor: "#3f6b45" } },
  laut: { id: "selat_laut", name: "Perairan Selat", fish: null, view: { water: ["#2f7fa3", "#174c6a"], fog: "#a9c8d8", shore: "volcano", shoreColor: "#55645c" } },
  selat: { id: "selat_laut", name: "Perairan Selat", fish: null, view: { water: ["#2f7fa3", "#174c6a"], fog: "#a9c8d8", shore: "volcano", shoreColor: "#55645c" } },
};
const SPOT_LIST = Object.values(SPOTS);
function spotAt(areaId, x, y) {
  for (const s of SPOT_LIST) if (s.area === areaId && Math.hypot(x - s.x, y - s.y) < s.r) return s;
  return null;
}
const found = (s) => !!(S().adv && S().adv.found[s.key]);
// keadaan memancing di laut: spot (bila di dalam lingkaran) atau perairan biasa area
function fishingAt(areaId, x, y) { return spotAt(areaId, x, y) || OPEN[areaId] || OPEN.laut; }

// pilih ikan dari kelompok laut. Dipanggil chooseFish (game.js) dengan pengali hoki yang SAMA (umpan, lemparan).
// Mengembalikan null bila kelompok memakai daftar LOCATIONS biasa.
function pickFish(spot, rarMult, night) {
  if (!spot || !spot.fish) return null;
  const pool = FISH.filter((f) => (spot.fish[f.id] || f.loc === "*") && (f.night === undefined || f.night === night));
  const groups = {};
  for (const f of pool) (groups[f.rarity] = groups[f.rarity] || []).push(f);
  let total = 0; const ws = [];
  for (const r of RARITY_ORDER) {
    const g = groups[r]; if (!g) continue;
    const fw = Math.min(1, g.reduce((a, f) => a + (spot.fish[f.id] || 1), 0)); // spesies yang sangat jarang (bobot < 1) tidak "naik" walau sendirian di kelompoknya
    const w = RARITY[r].weight * (rarMult[r] || 1) * ((spot.mul && spot.mul[r] !== undefined) ? spot.mul[r] : 1) * fw;
    if (w <= 0) continue; ws.push([r, w]); total += w;
  }
  let roll = Math.random() * total, rar = ws.length ? ws[0][0] : "biasa";
  for (const [r, w] of ws) { roll -= w; if (roll <= 0) { rar = r; break; } }
  const g = groups[rar] || pool; let sw = 0; for (const f of g) sw += spot.fish[f.id] || 1;
  let k = Math.random() * sw, fish = g[0];
  for (const f of g) { k -= spot.fish[f.id] || 1; if (k <= 0) { fish = f; break; } }
  return fish;
}
// tampilan layar memancing (warna air, pantai) — data lokasi asli tetap, hanya penampilannya
function viewLoc(L, spot) { const v = spot && spot.view; return v ? Object.assign({}, L, v, { id: L.id + ":" + (spot.id || "laut") }) : L; }

// ---------- Pengaturan berlayar per area ----------
const mu = NW.areas.get("muara"), MM = mu.map, selat = NW.areas.get("selat"), SM = selat.map, laut = NW.areas.get("laut"), LM = laut.map;
const rocksOf = (objs) => objs.filter((o) => o.kind === "searock").map((o) => ({ x: o.x, y: o.y, r: (o.wall ? 0.5 : 0.36) * (o.s || 1) }));
const buoysOf = (objs) => objs.filter((o) => o.kind === "buoy").map((o) => ({ x: o.x, y: o.y, r: 0.3 }));
const selatIdx = () => LOCATIONS.findIndex((l) => l.id === "selat");
mu.sea = {
  bounds: { x0: -12, y0: -12, x1: 54, y1: 52 },
  chart: { ox: 0, oy: 0 },
  moors: [
    { id: "dermaga", name: "Dermaga Muara", main: true, x: MM.BOAT.x, y: MM.BOAT.y, a: angT(1, 0), r: 2.7,
      board: { x: MM.BOAT.x, y: MM.DOCK.y1 + 0.75, r: 1.3 }, land: { x: MM.BOAT.x, y: MM.DOCK.y1 + 0.6, dir: 3 }, tie: { x: MM.DOCK.x0 + 3.5, y: MM.DOCK.y1 + 0.9 } },
    { id: "pantai", name: "Pantai Selatan Muara", x: 19.6, y: 33.7, a: angT(1, 0), r: 2.9,
      board: { x: 19.4, y: 30.6, r: 1.4 }, land: { x: 19.4, y: 30.45, dir: 2 }, tie: { x: 19.4, y: 31.0 } },
  ],
  exits: [{ side: "e", at: 52, to: "laut", name: "laut lepas Selat Sunda", map: (x, y) => ({ x: 1.5, y: clamp(y + 4, 3, 49) }),
    need: () => N().canSail(selatIdx()), lockMsg: () => `🔒 Laut lepas menuju Selat Sunda butuh ${UPGRADES.boat.levels[LOCATIONS[selatIdx()].boat - 1]}. Beli di Toko Pak Bono.` }],
  obstacles: rocksOf(MM.objects),
};
laut.sea = {
  bounds: { x0: -2, y0: 0.6, x1: 82, y1: 51.4 },
  chart: { ox: 50.5, oy: -4 },
  moors: [],
  exits: [
    { side: "w", at: -0.5, to: "muara", name: "perairan Muara Kampung", map: (x, y) => ({ x: 50.5, y: clamp(y - 4, -8, 48) }) },
    { side: "e", at: 80.5, to: "selat", name: "Pelabuhan Selat Sunda", map: (x, y) => ({ x: -8.5, y: clamp(y - 4, -3, 43) }) },
  ],
  obstacles: rocksOf(LM.objects).concat(buoysOf(LM.objects)),
};
selat.sea = {
  bounds: { x0: -12, y0: -6, x1: 30, y1: 46 },
  chart: { ox: 139.5, oy: 0 },
  moors: [
    { id: "dermaga", name: "Dermaga Pelabuhan", main: true, x: SM.BOAT.x, y: SM.BOAT.y, a: angT(-1, 0), r: 2.7,
      board: { x: SM.BOAT.x, y: SM.PIER.y1 + 0.75, r: 1.3 }, land: { x: SM.BOAT.x, y: SM.PIER.y1 + 0.6, dir: 3 }, tie: { x: 10.6, y: 20.85 } },
  ],
  exits: [{ side: "w", at: -10.5, to: "laut", name: "laut lepas Selat Sunda", map: (x, y) => ({ x: 79, y: clamp(y + 4, 2, 50) }) }],
  obstacles: rocksOf(SM.objects).concat(buoysOf(SM.objects)).concat(SM.LOCAL_BOATS.flatMap((b) => {
    const fx = Math.cos(b.a), fy = Math.sin(b.a), d = { x: (fx / HW + fy / HH) / 2, y: (fy / HH - fx / HW) / 2 }, k = Math.hypot(d.x, d.y);
    return [-0.7, 0, 0.7].map((u) => ({ x: b.x + d.x / k * u, y: b.y + d.y / k * u, r: 0.5 }));
  })),
};

// Muara: papan "Rute Kapal" di dermaga (jalur perjalanan cepat lama tetap ada) + tambatan pantai
MM.objects.push({ kind: "rute", x: MM.DOCK.x0 + 1.4, y: MM.DOCK.y0 + 0.12, dz: LIFT + 4 });
MM.points.push({ id: "rute", x: MM.DOCK.x0 + 1.4, y: MM.DOCK.y0 + 0.85, r: 0.75, icon: "🧭", label: "Rute Kapal" });
MM.solids.push({ x: MM.DOCK.x0 + 1.4, y: MM.DOCK.y0 + 0.12, r: 0.1 });
MM.objects.push({ kind: "post", x: 19.4, y: 31.05 });
for (const o of MM.objects) if (o.kind === "boat") o.vessel = true; // kapal statis lama diganti kapal pemain (NW.boat)

// ---------- Penemuan spot (masuk Buku Petualangan lewat sistem penemuan yang sudah ada) ----------
for (const s of SPOT_LIST) {
  const ar = NW.areas.get(s.area); if (!ar) continue;
  ar.discoveries = ar.discoveries || [];
  if (!ar.discoveries.some((d) => d.id === s.key)) ar.discoveries.push({ id: s.key, name: s.name, x: s.x, y: s.y, r: s.r * 0.75, desc: s.desc, sea: s.id, onlyBoat: true, hidden: !!s.hidden });
}

// cerita Selat Sunda: spot laut yang ditemukan di area mana pun langsung dihitung
for (const id of ["muara", "laut"]) { const ar = NW.areas.get(id), prev = ar.hooks.onDiscover; ar.hooks.onDiscover = (d) => { if (prev) prev(d); if (d && d.sea && NW.selat) NW.selat.checkTasks(); }; }

// ---------- Petunjuk visual di dunia (digambar tiap frame, hanya bila terlihat) ----------
function inView(view, x, y, m) { const p = P(x, y); return p.x > view.x0 - m && p.x < view.x1 + m && p.y > view.y0 - m && p.y < view.y1 + m; }
function drawUnder(c, t, view, areaId) {
  const night = N().darkness();
  for (const s of SPOT_LIST) {
    if (s.area !== areaId || !inView(view, s.x, s.y, 240)) continue;
    if (s.hint === "birds" || s.hint === "reef") { // gerombolan ikan kecil: riak berdenyut & cipratan kecil
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + t * 0.15, r = 1.1 + (i % 3) * 0.6, k = (t * 0.55 + i / 5) % 1, p = P(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.8, 0);
        c.strokeStyle = `rgba(255,255,255,${(0.55 * (1 - k)).toFixed(3)})`; c.lineWidth = 1.1; c.beginPath(); c.ellipse(p.x, p.y, 3 + k * 12, (3 + k * 12) * 0.42, 0, 0, 7); c.stroke();
      }
    }
    if (s.hint === "reef") { // bayangan ikan karang berkelebat
      for (let i = 0; i < 6; i++) {
        const ph = t * (0.5 + (i % 3) * 0.2) + i * 1.9, x = s.x + Math.cos(ph) * (1.4 + i * 0.4), y = s.y + Math.sin(ph * 1.3) * (1.1 + i * 0.3), p = P(x, y, -1);
        c.fillStyle = "rgba(10,40,50,.32)"; c.beginPath(); c.ellipse(p.x, p.y, 5, 2, Math.cos(ph) * 0.4, 0, 7); c.fill();
      }
    }
    if (s.hint === "current") { // garis-garis arus bergerak
      c.lineCap = "round";
      const nl = NW.weather && NW.weather.fx && NW.weather.fx.level === "rendah" ? 6 : NW.weather && NW.weather.fx && NW.weather.fx.level === "sedang" ? 10 : 14; // ikut Efek Cuaca
      for (let i = 0; i < nl; i++) {
        const lane = (i / nl - 0.5) * 2 * s.r, k = ((t * 0.18 + hash2(i, 9)) % 1), u = (k - 0.5) * 2 * s.r * 0.9;
        const x = s.x + u * 0.7 + lane * 0.5, y = s.y - u * 0.7 + lane * 0.5, fade = Math.sin(k * Math.PI) * clamp(1 - Math.hypot(x - s.x, y - s.y) / (s.r * 1.05), 0, 1);
        if (fade < 0.05) continue;
        const a = P(x, y, 0), b = P(x + 0.9, y - 0.9, 0);
        c.strokeStyle = `rgba(240,250,255,${(0.55 * fade).toFixed(3)})`; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 3, b.x, b.y); c.stroke();
      }
    }
    if (s.hint === "deep") { // lingkaran besar pelan + bayangan ikan raksasa sesekali
      const k = (t * 0.12) % 1, p = P(s.x, s.y, 0);
      c.strokeStyle = `rgba(200,225,255,${(0.28 * (1 - k)).toFixed(3)})`; c.lineWidth = 1.4; c.beginPath(); c.ellipse(p.x, p.y, 20 + k * 90, (20 + k * 90) * 0.45, 0, 0, 7); c.stroke();
      const cyc = (t % 22) / 22;
      if (cyc < 0.45) { const u = cyc / 0.45, q = P(s.x - 4 + u * 8, s.y + 2 - u * 4, -3); c.fillStyle = `rgba(5,20,40,${(0.32 * Math.sin(u * Math.PI)).toFixed(3)})`; c.beginPath(); c.ellipse(q.x, q.y, 34, 9, -0.25, 0, 7); c.fill(); c.beginPath(); c.moveTo(q.x - 30, q.y + 2); c.lineTo(q.x - 44, q.y - 6); c.lineTo(q.x - 42, q.y + 8); c.fill(); }
    }
    if (s.hint === "palung" && NW.mystic) NW.mystic.palungUnder(c, t, view, s);
    if (found(s)) { // pelampung penanda spot yang sudah ditemukan
      const p = P(s.x, s.y, 0), bob = Math.sin(t * 1.8 + s.x) * 1.5;
      c.fillStyle = "#e0b84c"; c.beginPath(); c.moveTo(p.x - 5, p.y + bob); c.lineTo(p.x - 3, p.y - 12 + bob); c.lineTo(p.x + 3, p.y - 12 + bob); c.lineTo(p.x + 5, p.y + bob); c.closePath(); c.fill();
      c.fillStyle = "#173f50"; c.fillRect(p.x - 0.7, p.y - 22 + bob, 1.4, 10); c.fillStyle = "#e2342c"; c.fillRect(p.x + 0.7, p.y - 22 + bob, 7, 3); c.fillStyle = "#fff"; c.fillRect(p.x + 0.7, p.y - 19 + bob, 7, 3);
      if (night > 0.3) { c.fillStyle = "rgba(255,240,170,.9)"; c.beginPath(); c.arc(p.x, p.y - 13 + bob, 2, 0, 7); c.fill(); }
    }
  }
}
function drawOver(c, t, view, areaId, px, py) {
  for (const s of SPOT_LIST) {
    if (s.hint === "palung" && s.area === areaId && NW.mystic) NW.mystic.palungOver(c, t, view, s);
    if (s.area !== areaId || s.hint !== "birds" && s.hint !== "reef" || !inView(view, s.x, s.y, 260)) continue;
    const n = s.hint === "birds" ? 5 : 2;
    for (let i = 0; i < n; i++) { const a = t * (0.5 + i * 0.07) + i * (6.283 / n), r = 1.2 + (i % 2) * 0.9; drawGull(c, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.85, 60 + (i % 3) * 14 + Math.sin(t + i) * 4, t + i, 1, Math.sin(a) > 0); }
    if (found(s) && Math.hypot(px - s.x, py - s.y) < 7) { // nama spot saat dekat
      const p = P(s.x, s.y, 34); c.font = "800 10px system-ui, sans-serif"; c.textAlign = "center"; c.lineWidth = 3; c.strokeStyle = "rgba(23,63,80,.85)"; c.strokeText(`${s.icon} ${s.name}`, p.x, p.y); c.fillStyle = "#fff9ec"; c.fillText(`${s.icon} ${s.name}`, p.x, p.y);
    }
  }
}
// burung camar (dipakai petunjuk spot & pelabuhan)
function drawGull(c, x, y, z, t, a = 1, flip = false) {
  const p = P(x, y, z), f = Math.sin(t * 7) * 3.2, s = flip ? -1 : 1;
  c.globalAlpha = a;
  const sh = P(x + 0.4, y + 0.1, 0); c.fillStyle = "rgba(10,40,60,.15)"; c.beginPath(); c.ellipse(sh.x, sh.y, 4, 1.5, 0, 0, 7); c.fill();
  c.strokeStyle = "#f6f4ee"; c.lineWidth = 2.1; c.lineCap = "round";
  c.beginPath(); c.moveTo(p.x - 8 * s, p.y - 1 - f); c.quadraticCurveTo(p.x - 4 * s, p.y - 4 - f * 0.4, p.x, p.y); c.quadraticCurveTo(p.x + 4 * s, p.y - 4 - f * 0.4, p.x + 8 * s, p.y - 1 - f); c.stroke();
  c.strokeStyle = "#4a5560"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x - 8 * s, p.y - 1 - f); c.lineTo(p.x - 6 * s, p.y - 2 - f * 0.9); c.moveTo(p.x + 8 * s, p.y - 1 - f); c.lineTo(p.x + 6 * s, p.y - 2 - f * 0.9); c.stroke();
  c.fillStyle = "#f6f4ee"; c.beginPath(); c.ellipse(p.x, p.y, 2.4, 1.4, 0, 0, 7); c.fill();
  c.globalAlpha = 1;
}
NW.drawGull = drawGull;

// ---------- Peta laut: koordinat chart gabungan ----------
const CHART_AREAS = ["muara", "laut", "selat"];
function toChart(areaId, x, y) { const ar = NW.areas.get(areaId), ch = ar && ar.sea && ar.sea.chart; return ch ? { x: x + ch.ox, y: y + ch.oy } : null; }

NW.sea = { SPOTS, SPOT_LIST, OPEN, spotAt, fishingAt, pickFish, viewLoc, found, drawUnder, drawOver, drawGull, angT, toChart, CHART_AREAS, selatIdx };
})();
