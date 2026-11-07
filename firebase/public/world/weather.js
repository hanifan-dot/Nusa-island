// =========================================================
//  NUSA ISLAND — Bumbu 2.3: Langit Nusantara (NW.weather)
//  Cuaca adalah SIMULASI di dalam game (bukan data cuaca nyata, tanpa API luar, tanpa server).
//  • Empat kondisi utama: cerah, mendung, hujan, kabut — plus parameter angin (bukan jenis kelima).
//  • Deterministik: kondisi dihitung dari (seed tersimpan, wilayah, hari, jam) per segmen 6 jam game
//    (±2 menit nyata). Refresh tidak mengubah cuaca; satu episode berlangsung beberapa menit.
//  • Nilai yang DITAMPILKAN (awan, hujan, kabut, angin, basah) bergerak halus menuju target, jadi
//    Cerah → Mendung → Hujan → Mendung → Cerah terjadi bertahap (hujan baru turun setelah langit tertutup).
//  • Konfigurasi per wilayah (CFG) — wilayah baru cukup menambah satu entri.
//  • Siap dipindah ke server: seluruh model ada di forecast(area, hari, jam, seed) yang murni (pure);
//    sumbernya bisa diganti lewat NW.weather.source tanpa menyentuh visual/audio/NPC.
//  • Efek visual memakai pool tetap (tanpa alokasi per frame), dibatasi kualitas Tinggi/Sedang/Rendah.
// =========================================================
window.NW = window.NW || {};
(() => {
"use strict";
const N = () => window.Nusa;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const HW = 32, HH = 16; // setengah ukuran tile isometrik (NW.TW/2, NW.TH/2)
const LIFT = 6;

// ---------- konfigurasi per wilayah ----------
const SEG = 6; // jam game per segmen cuaca
const CFG = {
  muara: {
    salt: 11, stick: 0.42,
    w: { cerah: 0.56, mendung: 0.18, hujan: 0.22, kabut: 0.04 },        // peluang dasar per segmen
    wind: 0.2, mist: 0,                                                   // angin dasar; kabut pagi lembut
    fogColor: [226, 236, 232], fogK: 0.8,                                // warna & kekuatan kabut layar
    tint: [86, 106, 118], sky: "#8fa5ae", water: "#5f8e97",
    shelter: { darto: "R2", dika: "R4", sari: null },                    // titik berteduh (node NAV yang sudah ada)
    puddleN: 7,
  },
  toba: {
    salt: 23, stick: 0.5,
    w: { cerah: 0.36, mendung: 0.24, hujan: 0.16, kabut: 0.24 },
    wind: 0.38, mist: 0.36,
    fogColor: [232, 240, 246], fogK: 1.3,
    tint: [78, 94, 122], sky: "#8895a8", water: "#52728f",
    shelter: { raka: "RAKAH", nala: "NALAH", maya: "MAYAH" },
    puddleN: 6,
  },
};
// Bumbu 2.4: Pelabuhan Selat Sunda & laut lepasnya berbagi iklim yang sama (garam sama → cuaca sama saat berlayar keluar-masuk pelabuhan)
CFG.selat = {
  salt: 37, stick: 0.45,
  w: { cerah: 0.5, mendung: 0.22, hujan: 0.2, kabut: 0.08 },
  wind: 0.34, mist: 0.12,
  fogColor: [228, 238, 242], fogK: 0.95,
  tint: [80, 100, 120], sky: "#8aa0b0", water: "#4f7f99",
  shelter: { hasan: "HASANH", arif: "GUD", ratna: null },
  puddleN: 6,
};
CFG.laut = Object.assign({}, CFG.selat, { shelter: {}, puddleN: 0 });
const DEFAULT_CFG = CFG.muara;
const cfgOf = (a) => CFG[a] || DEFAULT_CFG;
const KEEP = new Set(["stall", "tstall", "rstall", "fix", "sleep", "chat", "relax", "lunch", "shelter"]); // aktivitas yang tidak berpindah karena hujan

// ---------- model murni ----------
function hash(a, b, c) { // 0..1 deterministik
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function segKind(area, k, seed, depth = 0) {
  const cfg = cfgOf(area);
  if (k < 2) return "cerah";                                    // sebelum siang hari pertama: awal permainan cerah
  if (depth < 3 && hash(seed, k, cfg.salt + 5) < cfg.stick) return segKind(area, k - 1, seed, depth + 1); // episode berlanjut
  const part = ((k % 4) + 4) % 4;                                 // 0 malam-dini, 1 pagi, 2 siang-sore, 3 senja-malam
  const w = { ...cfg.w };
  if (part === 1) w.kabut *= cfg.mist > 0 ? 1.8 : 1.2;
  if (part === 2) w.hujan *= 1.3;
  if (part === 0 && cfg.mist > 0) w.kabut *= 1.3;
  const sum = w.cerah + w.mendung + w.hujan + w.kabut; let r = hash(seed, k, cfg.salt) * sum;
  for (const key of ["hujan", "kabut", "mendung", "cerah"]) { if (r < w[key]) return key; r -= w[key]; }
  return "cerah";
}
// target (belum diperhalus) pada waktu absolut absH (jam game sejak hari 1 jam 0)
function forecast(area, day, hour, seed) {
  const cfg = cfgOf(area), absH = (day - 1) * 24 + hour, k = Math.floor(absH / SEG);
  const kind = segKind(area, k, seed), u1 = hash(seed, k, cfg.salt + 1), u2 = hash(seed, k, cfg.salt + 2), u3 = hash(seed, k, cfg.salt + 3);
  let cloud = 0.08 + 0.22 * u1, rain = 0, fog = 0, storm = 0;
  if (kind === "mendung") cloud = 0.62 + 0.25 * u1;
  else if (kind === "hujan") {
    cloud = 1;
    const base = 0.45 + 0.5 * u1, surge = sstep(0.55, 0.95, 0.5 + 0.5 * Math.sin(absH * 2.1 + u2 * 6.28)); // sesekali bertambah deras
    rain = clamp(base * (0.62 + 0.55 * surge), 0.2, 1); storm = base > 0.72 ? 1 : 0;
  } else if (kind === "kabut") { cloud = 0.35 + 0.2 * u2; fog = (cfg.mist > 0 ? 0.6 : 0.5) + 0.35 * u1; }
  // kabut pagi lembut (Toba): hari tertentu, memudar menjelang siang
  if (cfg.mist > 0 && kind !== "hujan") {
    const mistDay = hash(seed, Math.floor(absH / 24), cfg.salt + 9) > 0.35 ? cfg.mist * (0.6 + 0.4 * u3) : 0;
    const m = hour >= 4.5 && hour < 6.5 ? 1 : hour >= 6.5 && hour < 9.5 ? 1 - (hour - 6.5) / 3 : 0;
    fog = Math.max(fog, mistDay * m);
  }
  const wind = clamp(cfg.wind + 0.16 * (u3 - 0.5) + cloud * 0.22 + rain * 0.2 + (kind === "kabut" ? -0.1 : 0), 0.05, 1);
  return { kind, cloud, rain, fog, wind, storm };
}

// ---------- pengaturan tampilan (lokal, bukan bagian simpanan progres) ----------
const FX_KEY = "nusa-island-wxfx-v1";
const LEVELS = {
  tinggi: { drops: 150, ripples: 34, rate: 30, drips: 3, bldg: 10, bands: 5, puddles: 7, flash: 1 },
  sedang: { drops: 72, ripples: 18, rate: 14, drips: 2, bldg: 5, bands: 2, puddles: 4, flash: 1 },
  rendah: { drops: 16, ripples: 6, rate: 4, drips: 0, bldg: 0, bands: 0, puddles: 2, flash: 0 },
};
const fx = { level: "sedang", calm: false };
function defaultLevel() { try { return window.matchMedia && matchMedia("(pointer:coarse)").matches ? "sedang" : "tinggi"; } catch (e) { return "tinggi"; } }
function loadFx() {
  fx.level = defaultLevel();
  try { const s = JSON.parse(localStorage.getItem(FX_KEY) || "null"); if (s) { if (LEVELS[s.level]) fx.level = s.level; fx.calm = !!s.calm; } } catch (e) {}
}
function setFx(level, calm) {
  if (level && LEVELS[level]) fx.level = level;
  if (calm !== undefined) fx.calm = !!calm;
  try { localStorage.setItem(FX_KEY, JSON.stringify({ level: fx.level, calm: fx.calm })); } catch (e) {}
}
const LV = () => LEVELS[fx.level];

// ---------- keadaan hidup ----------
const state = { cloud: 0.1, rain: 0, fog: 0, wind: 0.2, storm: 0, wet: 0, flash: 0, kind: "cerah", area: "muara", label: "Cerah", forced: false };
const tgt = { cloud: 0.1, rain: 0, fog: 0, wind: 0.2, storm: 0 };
let lastAbs = null, lastArea = null, forcedT = null, sheltering = false, shelterSince = 0, episode = 0, kindStable = "cerah", kindT = 0, announced = "cerah", lastToast = -999;
let thunderT = 40, flashT = 0, dtLast = 0.016, T = 0;
const source = { forecast }; // pengganti server di masa depan: NW.weather.source = { forecast(area,day,hour,seed) }

function areaId() {
  const Nu = N(); if (!Nu || !NW.areas) return "muara";
  if (Nu.mode() === "fish") { const a = NW.areas.forLoc && NW.areas.forLoc(Nu.S.loc); return a ? a.id : "muara"; }
  return NW.areas.cur ? NW.areas.cur.id : "muara";
}
const seedOf = () => { const S = N().S; return (S.wx && S.wx.seed) || 1; };
const approach = (c, t, up, down, dt) => { const d = t - c, s = (d > 0 ? up : down) * dt; return Math.abs(d) <= s ? t : c + Math.sign(d) * s; };
const FORCE = {
  cerah: { cloud: 0.12, rain: 0, fog: 0, storm: 0 }, mendung: { cloud: 0.82, rain: 0, fog: 0, storm: 0 },
  hujan: { cloud: 1, rain: 0.55, fog: 0, storm: 0 }, deras: { cloud: 1, rain: 1, fog: 0, storm: 1 }, kabut: { cloud: 0.45, rain: 0, fog: 0.9, storm: 0 },
};
function kindOf() { return state.rain > 0.18 ? "hujan" : state.fog > 0.4 ? "kabut" : state.cloud > 0.5 ? "mendung" : "cerah"; }
function labelOf() { const k = kindOf(); return k === "hujan" ? (state.rain > 0.72 ? "Hujan deras" : "Hujan") : k === "kabut" ? "Berkabut" : k === "mendung" ? "Mendung" : "Cerah"; }

function snapTo(t) { state.cloud = t.cloud; state.rain = t.rain; state.fog = t.fog; state.wind = t.wind; state.storm = t.storm; state.wet = t.rain > 0.12 ? 0.55 + 0.4 * t.rain : 0; }
function targetNow() {
  const S = N().S, a = areaId();
  if (forcedT) { const t = { ...FORCE.cerah, wind: 0.3, ...forcedT }; return t; }
  const t = source.forecast(a, S.day, S.hour, seedOf());
  return t;
}
function update(dt) {
  const Nu = N(); if (!Nu || !Nu.S) return;
  dt = Math.min(dt, 0.1); dtLast = dt; T += dt; dropCount = 0; dripCount = 0; bandCount = 0; rippleCount = 0; // penghitung dihitung ulang tiap frame oleh lapisan gambar yang aktif
  const S = Nu.S, a = areaId(), abs = (S.day - 1) * 24 + S.hour;
  const t = targetNow(); Object.assign(tgt, t);
  const jump = lastAbs !== null && Math.abs(abs - lastAbs) > 2 || a !== lastArea || lastAbs === null;
  lastAbs = abs; lastArea = a; state.area = a;
  if (jump) { // mulai/ganti wilayah/tidur: langsung ke keadaan target, tanpa transisi dari nol
    snapTo(t);
    if (t.rain <= 0.12 && !forcedT) { const prev = source.forecast(a, S.day, S.hour - SEG, seedOf()); state.wet = prev.rain > 0.12 ? 0.5 : 0; } // baru reda → tanah masih agak basah
  }
  else {
    state.cloud = approach(state.cloud, t.cloud, 0.04, 0.03, dt);
    const gate = clamp((state.cloud - 0.55) / 0.35);              // hujan hanya setelah langit cukup tertutup
    state.rain = approach(state.rain, t.rain * gate, 0.05, 0.07, dt);
    state.fog = approach(state.fog, t.fog, 0.035, 0.025, dt);
    state.wind = approach(state.wind, t.wind, 0.05, 0.05, dt);
    state.storm = approach(state.storm, t.storm * (state.rain > 0.6 ? 1 : 0), 0.1, 0.1, dt);
    const wetT = state.rain > 0.12 ? clamp(0.4 + state.rain * 0.8) : 0;
    state.wet = approach(state.wet, wetT, 0.08, 0.01, dt);
  }
  // hysteresis berteduh
  const was = sheltering;
  if (!sheltering && state.rain > 0.3) { sheltering = true; shelterSince = performance.now(); episode++; }
  else if (sheltering && state.rain < 0.1) sheltering = false;
  if (was !== sheltering && N().emit) N().emit("weather", { raining: sheltering });
  const pk = state.kind; state.kind = kindOf(); state.label = labelOf(); state.forced = !!forcedT;
  if (pk !== state.kind && N().refreshHUD) N().refreshHUD(); // ikon cuaca di jam HUD
  // kilat jauh & guruh: jarang, lembut (guruh tetap terdengar walau efek visual dimatikan)
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2.2);
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) state.flash = LV().flash && !fx.calm ? 1 : 0; }
  if (state.storm > 0.6 && state.rain > 0.6) {
    thunderT -= dt;
    if (thunderT <= 0) {
      thunderT = 38 + Math.random() * 45;
      if (LV().flash && !fx.calm) flashT = 0.001 + Math.random() * 0.1;
      const delay = 0.8 + Math.random() * 1.8;
      if (NW.audio && NW.audio.shot) NW.audio.shot("guruh", delay);
    }
  } else thunderT = Math.max(thunderT, 25);
  // ikon & pemberitahuan HUD (tidak sering)
  if (state.kind === kindStable) kindT += dt; else { kindStable = state.kind; kindT = 0; }
  if (kindT > 5 && kindStable !== announced) {
    const prev = announced; announced = kindStable;
    const msg = kindStable === "hujan" ? "🌧️ Hujan mulai turun" : kindStable === "kabut" ? "🌫️ Kabut turun perlahan" : kindStable === "mendung" ? (prev === "hujan" ? "🌤️ Hujan reda" : "☁️ Langit mulai mendung") : prev === "hujan" ? "🌤️ Hujan reda, langit cerah" : "☀️ Langit cerah";
    if (T - lastToast > 45 && N().isStarted() && !(N().isPanelOpen && N().isPanelOpen())) { lastToast = T; N().toast(msg); }
  }
}
function force(kind, opts) {
  if (!kind) { forcedT = null; return; }
  const base = FORCE[kind]; if (!base) return;
  forcedT = { ...base, ...(opts || {}) }; delete forcedT.snap;
  forcedT.wind = (opts && opts.wind) != null ? opts.wind : kind === "deras" ? 0.7 : kind === "hujan" ? 0.5 : kind === "mendung" ? 0.45 : 0.25;
  if (opts && opts.snap) { snapTo(forcedT); state.wet = forcedT.rain > 0.12 ? 0.9 : 0; sheltering = state.rain > 0.3; if (sheltering) { shelterSince = -1e9; episode++; } }
}
function migrate(S) {
  if (!S.wx || typeof S.wx !== "object") S.wx = {};
  if (!Number.isFinite(S.wx.seed) || S.wx.seed < 1) S.wx.seed = 1 + Math.floor(Math.random() * 2147483000); // sekali saja, lalu tersimpan
  S.wx.v = 1;
}

// ---------- pengaruh ke mancing (kecil & terbatas; TIDAK menyentuh rarity, varian, spot rahasia, atau fase Strike) ----------
// pengali waktu tunggu gigitan: hujan ringan sedikit lebih cepat, hujan deras/kabut sedikit lebih lambat. Rentang 0,88–1,08.
function biteFactor(s = state) {
  const f = 1 - 0.1 * sstep(0.15, 0.5, s.rain) + 0.15 * sstep(0.7, 1, s.rain) - 0.03 * s.cloud + 0.03 * s.fog;
  return clamp(f, 0.88, 1.08);
}
const waterK = () => 1 + state.wind * 0.55 + state.rain * 0.5;     // kilau/riak permukaan air
const windK = () => (fx.calm ? 0.35 : 1) * (0.7 + state.wind * 1.1); // ayunan pohon/daun
const bobK = () => (fx.calm ? 0.5 : 1) * (1 + state.wind * 1.2 + state.rain * 0.8);

// ---------- NPC ----------
function shelter(n, a) {
  if (!sheltering) { if (n._wxSrc) n._wxSrc = null; return a; }
  const cfg = cfgOf(n.area); const node = cfg.shelter && cfg.shelter[n.id];
  if (!node || a.hide || KEEP.has(a.act) || a.at === node) return a;
  if (performance.now() - shelterSince < (Math.floor(n.seed || 0) % 3) * 3500) return a; // tidak semua bergerak serentak
  if (n._wxSrc !== a) {
    n._wxSrc = a;
    n._wxEnt = { from: a.from, to: a.to, at: node, act: "shelter", face: 2, bubble: "☔", label: "berteduh dari hujan", lines: [] };
  }
  return n._wxEnt;
}
const RAIN_LINE = {
  darto: "Wah, hujan datang. Air muara mulai ramai, Nak. Ikan-ikan jadi lebih aktif, tapi dermaga licin, hati-hati.",
  sari: "Hujan begini enaknya ikan hangat untuk makan malam. Tapi kotak titipan tetap Ibu buka, kok.",
  dika: "Kak, hujan! Layanganku nggak bisa terbang… tapi nanti aku main air di teras, hehe.",
  raka: "Horas! Hujan di danau itu indah, tapi papan dermaga licin. Berteduhlah di Pondok kalau perlu, Nak.",
  maya: "Hujan begini pembeli sepi, tapi arsik hangat tetap laris. Mau mampir?",
  nala: "Kak, lihat! Hujan bikin permukaan danau seperti pecah jadi ribuan cincin. Bukitnya sampai hilang!",
};
const FOG_LINE = {
  raka: "Kabut tebal begini perahu terlihat mengapung di awan. Pelan-pelan saja jalannya, ya.",
  nala: "Kabutnya tebal! Bukit Pandang jadi seperti pulau di awan. Tapi jalan setapaknya masih kelihatan, kok.",
};
const said = {};
function chatLine(n) {
  const raining = state.rain > 0.25, foggy = !raining && state.fog > 0.6;
  const txt = raining ? RAIN_LINE[n.id] : foggy ? FOG_LINE[n.id] : null; if (!txt) return null;
  const key = n.id + (raining ? ":r" : ":f"), ep = raining ? episode : Math.floor(((N().S.day - 1) * 24 + N().S.hour) / SEG);
  if (said[key] === ep) return null; said[key] = ep; return txt;
}

// ---------- audio ----------
function audioEnv(env) { // melengkapi env pengarah audio
  env.rain = state.rain; env.wxWind = state.wind; env.storm = state.storm; env.fog = state.fog;
  return env;
}

// ---------- pool partikel ----------
const MAXD = 150, MAXR = 40;
const dx_ = new Float32Array(MAXD), dy_ = new Float32Array(MAXD), dv_ = new Float32Array(MAXD), dl_ = new Float32Array(MAXD);
for (let i = 0; i < MAXD; i++) { dx_[i] = Math.random(); dy_[i] = Math.random(); dv_[i] = 0.75 + Math.random() * 0.5; dl_[i] = Math.random(); }
const rx = new Float32Array(MAXR), ry = new Float32Array(MAXR), ra = new Float32Array(MAXR), rl = new Float32Array(MAXR), rt = new Uint8Array(MAXR); // ripple/percik dunia
let rn = 0, rAcc = 0, dripCount = 0, dropCount = 0, bandCount = 0, rippleCount = 0;
function spawnSplash(view, tileAt) {
  const sx = view.x0 + Math.random() * (view.x1 - view.x0), sy = view.y0 + Math.random() * (view.y1 - view.y0);
  const x = (sx / HW + sy / HH) / 2, y = (sy / HH - sx / HW) / 2, tl = tileAt(x, y);
  const water = tl <= 1; if (!water && tl === 3 && Math.random() < 0.6) return; // rumput: jarang
  let i = -1; for (let k = 0; k < MAXR; k++) if (rl[k] <= 0) { i = k; break; } if (i < 0) return;
  rx[i] = x; ry[i] = y; ra[i] = 0; rl[i] = water ? 1.1 : 0.4; rt[i] = water ? 1 : 0;
}
let fogSprite = null;
function blobSprite() {
  if (fogSprite) return fogSprite;
  const c = document.createElement("canvas"); c.width = 128; c.height = 64; const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 32, 2, 64, 32, 62); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(0.5, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.save(); g.scale(1, 0.5); g.translate(0, 32); g.fillStyle = gr; g.fillRect(0, -32, 128, 128); g.restore();
  return (fogSprite = c);
}

// ---------- gambar: lapisan tanah (di bawah objek) ----------
const puddles = { area: null, list: [] };
function buildPuddles(area) {
  puddles.area = area; puddles.list = [];
  const ar = NW.areas.get(area); if (!ar) return;
  const NAV = ar.map.NAV, E = ar.map.NAV_EDGES || []; if (!NAV || !E.length) return;
  const cfg = cfgOf(area); let h = 0;
  for (let i = 0; i < E.length && puddles.list.length < cfg.puddleN; i++) {
    const [a, b] = E[(i * 5) % E.length], A = NAV[a], B = NAV[b]; if (!A || !B) continue;
    const f = 0.3 + 0.4 * hash(i, 7, cfg.salt), nx = -(B[1] - A[1]), ny = B[0] - A[0], nl = Math.hypot(nx, ny) || 1, off = (hash(i, 9, cfg.salt) - 0.5) * 0.7;
    const x = lerp(A[0], B[0], f) + (nx / nl) * off, y = lerp(A[1], B[1], f) + (ny / nl) * off;
    const t = NW.tileAt(x, y); if (t !== 4 && t !== 2) continue; // hanya di jalan tanah/pasir (bukan dermaga atau air)
    if (NW.tileAt(x + 0.5, y) !== t && NW.tileAt(x - 0.5, y) !== t) continue;
    h++; puddles.list.push({ x, y, r: 0.32 + 0.22 * hash(i, 3, cfg.salt), ph: hash(i, 4, cfg.salt) * 6.28 });
  }
}
function drawGround(c, t, view, m, dk) {
  if (state.wet < 0.03 && state.rain < 0.03) return;
  const lv = LV(), tileAt = NW.tileAt, wet = state.wet;
  // 1) jalan, pasir & dermaga tampak basah (satu path per jenis, hanya tile yang terlihat)
  const tx0 = Math.floor((view.x0 / HW + view.y0 / HH) / 2) - 2, tx1 = Math.ceil((view.x1 / HW + view.y1 / HH) / 2) + 2;
  const ty0 = Math.floor((view.y0 / HH - view.x1 / HW) / 2) - 2, ty1 = Math.ceil((view.y1 / HH - view.x0 / HW) / 2) + 2;
  const sets = [[5, `rgba(24,34,52,${(0.3 * wet).toFixed(3)})`, 4], [4, `rgba(40,50,64,${(0.26 * wet).toFixed(3)})`, 0], [2, `rgba(70,64,58,${(0.22 * wet).toFixed(3)})`, 0]];
  for (const [type, col, lift] of sets) {
    c.beginPath(); let any = false;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (tileAt(x, y) !== type) continue;
      const cx = (x - y) * HW, cy = (x + y) * HH + HH - LIFT - lift;
      if (cx < view.x0 - 40 || cx > view.x1 + 40 || cy < view.y0 - 30 || cy > view.y1 + 30) continue;
      c.moveTo(cx, cy - HH); c.lineTo(cx + HW, cy); c.lineTo(cx, cy + HH); c.lineTo(cx - HW, cy); c.closePath(); any = true;
    }
    if (any) { c.fillStyle = col; c.fill(); }
  }
  // 2) genangan kecil di jalan (muncul setelah cukup basah)
  if (puddles.area !== state.area) buildPuddles(state.area);
  if (wet > 0.5) {
    const k = sstep(0.5, 0.95, wet), n = Math.min(lv.puddles, puddles.list.length);
    for (let i = 0; i < n; i++) {
      const p = puddles.list[i], sx = (p.x - p.y) * HW, sy = (p.x + p.y) * HH - LIFT;
      if (sx < view.x0 - 40 || sx > view.x1 + 40 || sy < view.y0 - 30 || sy > view.y1 + 30) continue;
      const rr = p.r * HW * (0.55 + 0.45 * k);
      c.fillStyle = `rgba(${dk > 0.4 ? "28,40,70" : "120,150,170"},${(0.5 * k).toFixed(3)})`; c.beginPath(); c.ellipse(sx, sy, rr, rr * 0.5, 0, 0, 7); c.fill();
      c.fillStyle = `rgba(255,255,255,${(0.16 * k * (1 - dk)).toFixed(3)})`; c.beginPath(); c.ellipse(sx - rr * 0.2, sy - rr * 0.08, rr * 0.5, rr * 0.16, 0, 0, 7); c.fill();
      if (state.rain > 0.1) { const ph = ((t * 1.3 + p.ph) % 1); c.strokeStyle = `rgba(235,245,255,${(0.35 * (1 - ph) * k).toFixed(3)})`; c.lineWidth = 1; c.beginPath(); c.ellipse(sx + Math.sin(p.ph) * rr * 0.3, sy, rr * 0.7 * ph + 1, rr * 0.35 * ph + 0.5, 0, 0, 7); c.stroke(); }
    }
  }
  // 3) riak di air & percikan di tanah
  if (state.rain > 0.05) {
    rAcc += lv.rate * state.rain * dtLast; let guard = 6;
    while (rAcc >= 1 && guard--) { rAcc -= 1; spawnSplash(view, tileAt); }
    for (let i = 0; i < MAXR; i++) {
      if (rl[i] <= 0) continue; ra[i] += dtLast; const k = ra[i] / rl[i]; if (k >= 1) { rl[i] = 0; continue; }
      const sx = (rx[i] - ry[i]) * HW, sy = (rx[i] + ry[i]) * HH - LIFT; if (sx < view.x0 - 20 || sx > view.x1 + 20 || sy < view.y0 - 20 || sy > view.y1 + 20) continue;
      rippleCount++;
      if (rt[i]) { c.strokeStyle = `rgba(240,248,255,${(0.55 * (1 - k)).toFixed(3)})`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(sx, sy, 2 + k * 13, 1 + k * 6.5, 0, 0, 7); c.stroke(); }
      else { c.strokeStyle = `rgba(225,235,245,${(0.4 * (1 - k)).toFixed(3)})`; c.lineWidth = 1; c.beginPath(); c.ellipse(sx, sy, 1.5 + k * 4, 0.8 + k * 2, 0, 0, 7); c.stroke(); }
    }
  }
}
// tetesan dari atap (di depan bangunan): hitungan analitik, tanpa partikel tersimpan
function drawRoofs(c, t, view, m, px, py) {
  const lv = LV(); dripCount = 0;
  if (state.rain < 0.12 || !lv.bldg || !lv.drips) return;
  let n = 0;
  for (const b of m.buildings) {
    if (n >= lv.bldg) break;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; if (Math.hypot(cx - px, cy - py) > 9) continue;
    const top = (b.stilts || 0) + (b.h || 30) - 2; n++;
    for (let i = 0; i < lv.drips; i++) {
      const seed = (b.x0 * 7.3 + b.y0 * 3.1 + i * 1.7), ph = (t * (0.9 + 0.3 * i) + seed) % 1, ex = lerp(b.x0 + 0.15, b.x1 - 0.15, hash(i, Math.floor(b.x0 * 10), 5)), ey = b.y1 + 0.08;
      const sx = (ex - ey) * HW, sy = (ex + ey) * HH - LIFT;
      if (sx < view.x0 - 20 || sx > view.x1 + 20 || sy - top < view.y0 - 20 || sy > view.y1 + 20) continue;
      const fall = ph * ph, y0 = sy - top * (1 - fall) - 2, a = Math.min(1, state.rain * 1.6) * 0.8;
      c.strokeStyle = `rgba(215,232,245,${(0.55 * a).toFixed(3)})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx, y0 - 5); c.lineTo(sx, y0); c.stroke(); dripCount++;
      if (ph > 0.88) { const k = (ph - 0.88) / 0.12; c.strokeStyle = `rgba(230,240,250,${(0.45 * (1 - k) * a).toFixed(3)})`; c.beginPath(); c.ellipse(sx, sy, 2 + k * 5, 1 + k * 2.2, 0, 0, 7); c.stroke(); dripCount++; }
    }
  }
}
// pantulan lampu di tanah basah (dipanggil di dalam komposit "lighter" malam)
function wetLights(c, m, dk, al, view) {
  if (state.wet < 0.3 || dk < 0.25) return; const k = (state.wet - 0.3) / 0.7;
  for (const [x, y] of m.lamps) { const sx = (x - y) * HW, sy = (x + y) * HH; if (sx < view.x0 - 60 || sx > view.x1 + 60 || sy < view.y0 - 60 || sy > view.y1 + 60) continue; NW.lightAt(c, x + 0.15, y + 0.5, 0, 46, "#ffb347", al * 0.55 * k); }
}

// ---------- gambar: lapisan layar (di atas dunia & cahaya) ----------
function drawDrops(c, W, H, t, a, wind, near) {
  const lv = LV(); const n = Math.min(MAXD, Math.round(lv.drops * clamp(state.rain * 1.05)));
  dropCount = n; if (n <= 0) return;
  const slope = (fx.calm ? 0.12 : 0.1 + wind * 0.55), spd = (fx.calm ? 0.7 : 1);
  for (let pass = 0; pass < 2; pass++) {
    const far = pass === 0; c.beginPath();
    for (let i = pass; i < n; i += 2) {
      const len = (far ? 7 + dl_[i] * 5 : 13 + dl_[i] * 11) * (0.8 + state.rain * 0.4), v = (far ? 360 : 640) * dv_[i] * spd;
      dy_[i] += v * dtLast / H; dx_[i] += v * slope * dtLast / W;
      if (dy_[i] > 1.02) { dy_[i] -= 1.04; dx_[i] = Math.random(); } if (dx_[i] > 1.02) dx_[i] -= 1.04;
      const x = dx_[i] * W, y = dy_[i] * H; c.moveTo(x, y); c.lineTo(x + len * slope, y + len);
    }
    c.strokeStyle = `rgba(214,228,240,${((far ? 0.16 : 0.3) * a).toFixed(3)})`; c.lineWidth = far ? 0.8 : 1.1; c.lineCap = "round"; c.stroke();
  }
}
function drawFogVeil(c, W, H, t, cfg, dk) {
  const f = state.fog * cfg.fogK; if (f < 0.02) return;
  const fc = cfg.fogColor, mixk = dk * 0.75, col = [Math.round(lerp(fc[0], 40, mixk)), Math.round(lerp(fc[1], 52, mixk)), Math.round(lerp(fc[2], 72, mixk))], rgb = col.join(",");
  const R = Math.max(W, H);
  let g = c.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.3, W / 2, H * 0.5, R * 0.78); // tengah (pemain, jalan, NPC) hampir bebas kabut
  g.addColorStop(0, `rgba(${rgb},${(0.04 * f).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},${Math.min(0.62, 0.55 * f).toFixed(3)})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  g = c.createLinearGradient(0, 0, 0, H * 0.5); g.addColorStop(0, `rgba(${rgb},${Math.min(0.5, 0.45 * f).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`); // objek jauh (atas layar) lebih berkabut
  c.fillStyle = g; c.fillRect(0, 0, W, H * 0.5);
  const lv = LV(); bandCount = fx.calm ? 0 : lv.bands;
  if (bandCount) { const spr = blobSprite(); c.globalAlpha = Math.min(0.5, f * 0.32);
    for (let i = 0; i < bandCount; i++) { const bx = ((t * (3 + i) * 0.4 + i * 211) % (W + 360)) - 180, by = H * (0.12 + 0.13 * i) + Math.sin(t * 0.1 + i) * 8; c.drawImage(spr, bx - 180, by - 45, 360, 90); } c.globalAlpha = 1; }
}
// area: id wilayah; dk: kegelapan 0..0.85; mode: "world" | "plot" (halaman Rumahku)
function drawScreen(c, W, H, t, dk, area, mode) {
  const cfg = cfgOf(area), cl = state.cloud, rn_ = state.rain;
  // 1) warna & intensitas cahaya: langit tertutup → lingkungan lebih lembut (satu isian, nilainya mengalir halus)
  const a = (0.25 * cl + 0.12 * rn_ + 0.05 * state.fog) * (1 - dk * 0.55);
  if (a > 0.004) { const tc = cfg.tint; c.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${a.toFixed(3)})`; c.fillRect(0, 0, W, H); }
  // 2) kabut
  drawFogVeil(c, W, H, t, cfg, dk);
  // 3) hujan: garis tipis & jarang (bukan tirai putih); malam sedikit lebih redup
  if (rn_ > 0.03) drawDrops(c, W, H, t, (1 - dk * 0.35) * clamp(0.5 + rn_ * 0.6), state.wind, true); else dropCount = 0;
  // 4) kilat jauh yang lembut (tidak ada bila "Kurangi kilatan" aktif)
  if (state.flash > 0 && !fx.calm) { const k = state.flash, e = Math.sin(Math.min(1, (1 - k) * 4) * Math.PI) * 0.5 + 0.5 * k; c.fillStyle = `rgba(225,235,255,${(0.1 * e).toFixed(3)})`; c.fillRect(0, 0, W, H); }
}
// jendela Rumahku: kaca keabu-abuan + beberapa tetes meluncur (tanpa tetesan menembus atap/dinding)
function windowRain(c, pts, t, i, area) {
  if (state.cloud < 0.2 && state.rain < 0.05) return;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
  c.save(); c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let k = 1; k < pts.length; k++) c.lineTo(pts[k].x, pts[k].y); c.closePath(); c.clip();
  c.fillStyle = `rgba(${cfgOf(area).tint.join(",")},${(0.25 * state.cloud + 0.2 * state.rain).toFixed(3)})`; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (state.rain > 0.08 && LV().drips) {
    c.strokeStyle = `rgba(225,238,250,${(0.55 * Math.min(1, state.rain * 1.5)).toFixed(3)})`; c.lineWidth = 1.1; c.beginPath();
    for (let d = 0; d < 3; d++) { const ph = (t * (0.18 + d * 0.05) + i * 0.37 + d * 0.31) % 1, x = x0 + (x1 - x0) * (0.2 + 0.3 * d), y = y0 + (y1 - y0) * ph; c.moveTo(x, y - 5); c.lineTo(x, y); }
    c.stroke();
  }
  c.restore();
}

// ---------- tampilan mancing (sudut pandang depan; game.js memanggil titik-titik ini) ----------
function fishCfg(area) { return cfgOf(area); }
function skyMix(top, bot, mix, area) { // mengembalikan [top,bot] yang digeser ke warna mendung
  const k = clamp(state.cloud * 0.62 + state.rain * 0.2 + state.fog * 0.3), o = fishCfg(area).sky;
  return [mix(top, o, k), mix(bot, o, k * 0.9)];
}
const fishDim = () => clamp(state.cloud * 0.1 + state.rain * 0.1); // tambahan "gelap" siang
function fishRain(c, W, H, HZ, t, U, area) {
  if (state.rain < 0.03) return;
  const lv = LV(); const a = clamp(0.5 + state.rain * 0.6);
  // riak di permukaan air (perspektif: lebih besar saat dekat) — pool tetap, deterministik per indeks
  const n = Math.min(lv.ripples, MAXR);
  c.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const u = t * (0.9 + (i % 5) * 0.12) + i * 0.173, cyc = Math.floor(u), ph = u - cyc, seedx = hash(i, cyc, 77), z = hash(i, cyc, 31);
    const y = HZ + 8 + z * (H - HZ - 30), s = (y - HZ) / (H - HZ), x = seedx * W;
    c.strokeStyle = `rgba(240,248,255,${((1 - ph) * 0.5 * state.rain * clamp(s + 0.2)).toFixed(3)})`;
    c.beginPath(); c.ellipse(x, y, (2 + ph * 16) * s * U + 1, (1 + ph * 5) * s * U + 0.5, 0, 0, 7); c.stroke();
  }
  drawDrops(c, W, H, t, (0.9) * a, state.wind, true);
}
function fishFog(c, W, H, HZ, area, dk) {
  const f = state.fog * fishCfg(area).fogK; if (f < 0.02) return;
  const fc = fishCfg(area).fogColor, rgb = [Math.round(lerp(fc[0], 40, dk * 0.7)), Math.round(lerp(fc[1], 52, dk * 0.7)), Math.round(lerp(fc[2], 72, dk * 0.7))].join(",");
  const g = c.createLinearGradient(0, 0, 0, H); // tebal di cakrawala, tipis di dekat pemain & pelampung
  g.addColorStop(0, `rgba(${rgb},${Math.min(0.5, 0.42 * f).toFixed(3)})`); g.addColorStop(HZ / H, `rgba(${rgb},${Math.min(0.75, 0.62 * f).toFixed(3)})`); g.addColorStop(Math.min(0.97, HZ / H + 0.3), `rgba(${rgb},${(0.1 * f).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function fishClouds(c, W, HZ, t, U, dk) { // lapisan awan tambahan saat mendung/hujan
  if (state.cloud < 0.2) return;
  const k = clamp((state.cloud - 0.2) / 0.8), spr = blobSprite(), g = Math.round(lerp(238, 120, k * 0.8 + state.rain * 0.2) * (1 - dk * 0.6));
  c.globalAlpha = k * 0.55; c.fillStyle = `rgb(${g},${g + 4},${g + 10})`;
  const gr = c.createLinearGradient(0, 0, 0, HZ); gr.addColorStop(0, `rgba(${g - 20},${g - 14},${g - 6},${(0.5 * k).toFixed(3)})`); gr.addColorStop(1, `rgba(${g - 20},${g - 14},${g - 6},0)`);
  c.globalAlpha = 1; c.fillStyle = gr; c.fillRect(0, 0, W, HZ);
  c.globalAlpha = 0.45 * k; for (let i = 0; i < 5; i++) { const bx = ((t * (5 + i * 2) + i * 233) % (W + 420)) - 210, by = HZ * (0.08 + 0.15 * i); c.drawImage(spr, bx - 210, by - 55, 420, 110); }
  c.globalAlpha = 1;
}

// ---------- statistik uji ----------
function stats() { return { level: fx.level, calm: fx.calm, drops: dropCount, ripples: rippleCount, drips: dripCount, fogBands: bandCount, pool: MAXD + MAXR, rain: +state.rain.toFixed(3), cloud: +state.cloud.toFixed(3), fog: +state.fog.toFixed(3), wind: +state.wind.toFixed(3), wet: +state.wet.toFixed(3), kind: state.kind, sheltering }; }

loadFx();
NW.weather = {
  CFG, LEVELS, SEG, hash, segKind, forecast, source, state, tgt, fx, setFx, update, force, migrate,
  biteFactor, waterK, windK, bobK, fishDim, skyMix, fishRain, fishFog, fishClouds,
  shelter, chatLine, audioEnv, drawGround, drawRoofs, wetLights, drawScreen, windowRain, stats,
  get sheltering() { return sheltering; }, get episode() { return episode; }, areaId, kindOf, labelOf,
  fogK: () => state.fog,
};
})();
