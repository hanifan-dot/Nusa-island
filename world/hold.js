// =========================================================
//  NUSA ISLAND — Bumbu 1.2 "Pamer Ikan"
//  Karakter memegang ikan dari coolbox di dunia 2.5D. Hanya tampilan:
//  ikan tetap ada di coolbox (tidak digandakan, tidak berpindah, tidak ikut statistik).
//  - Pose ditentukan bobot asli ikan (7 tingkat), model ikan = spesies yang sama.
//  - Skala ikan nonlinear dan dibatasi supaya tidak memenuhi layar.
//  - Berhenti otomatis bila ikan terjual / dipindah ke akuarium / tidak lagi dimiliki,
//    atau saat mulai memancing.
//  - Hanya status sementara (tidak disimpan ke save), jadi tidak mengubah data publik/dunia.
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa;
const S = () => N().S;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// ---------- Tingkat pose menurut berat (kg) ----------
// bottom : y dasar ikan (relatif kaki, negatif = naik)   spread: jarak tangan ke tengah
// dx     : geser samping ikan        rot: kemiringan dasar (rad)    wob/fr: amplitudo/kecepatan goyang ikan
// crouch : badan merendah (beban)    lean: condong ke belakang       sweat: tetes keringat   expr: ekspresi
const POSES = [
  { id: "dada",     max: 2,        ket: "Ikan kecil didekap di dada",                 bottom: -10, dx: 0,  rot: 0,     wob: 0.03, fr: 6,  crouch: 0,   lean: 0,    sweat: 0, expr: "senyum",  bounce: 0,   up: false },
  { id: "depan",    max: 10,       ket: "Dua tangan sedikit ke depan",                bottom: -9,  dx: 0,  rot: -0.05, wob: 0.05, fr: 6,  crouch: 0.4, lean: 0,    sweat: 0, expr: "senyum",  bounce: 0,   up: false },
  { id: "angkat",   max: 30,       ket: "Ikan diangkat lebih tinggi, badan menahan beban", bottom: -12, dx: 5, rot: -0.55, wob: 0.07, fr: 7,  crouch: 1.6, lean: 0.07, sweat: 1, expr: "berat",   bounce: 0,   up: false },
  { id: "bahu",     max: 100,      ket: "Ikan besar dengan dua tangan di atas dada",   bottom: -29, dx: 0,  rot: -0.30, wob: 0.09, fr: 8,  crouch: 2.2, lean: 0.06, sweat: 2, expr: "bangga",  bounce: 0.4, up: true },
  { id: "menang",   max: 250,      ket: "Pose kemenangan, ikan diangkat tinggi",       bottom: -38, dx: 0,  rot: -0.42, wob: 0.14, fr: 9,  crouch: 1.2, lean: 0,    sweat: 2, expr: "teriak",  bounce: 1.6, up: true },
  { id: "legenda",  max: 500,      ket: "Pose legenda, ikan di atas kepala, berjuang lucu", bottom: -46, dx: 0, rot: -0.50, wob: 0.26, fr: 14, crouch: 2.6, lean: 0.04, sweat: 3, expr: "berjuang", bounce: 0.8, up: true },
  { id: "spesial",  max: Infinity, ket: "Pajangan khusus: ikan raksasa dipamerkan penuh gaya", bottom: -46, dx: 0, rot: -0.35, wob: 0.10, fr: 5, crouch: 1.4, lean: 0,   sweat: 0, expr: "takjub",  bounce: 0.5, up: true },
];
function poseFor(w) { for (const p of POSES) if (w <= p.max) return p; return POSES[POSES.length - 1]; }
// Panjang ikan di layar: logaritmik, dibatasi (ikan 500 kg tidak 625× lebih besar dari ikan 0,8 kg)
const FISH_L_MIN = 14, FISH_L_MAX = 58;
const fishLen = (w) => clamp(12 + 6.2 * Math.log(1 + Math.max(0, w)), FISH_L_MIN, FISH_L_MAX);

// ---------- Status ----------
const H = { uid: null, id: null, w: 0, t0: 0, tag: null, camK: 0 };
const fishOf = (it) => N().FISH_BY_ID[it.id];
const find = (uid) => S().cooler.find((x) => x.uid === uid);
const holding = () => H.uid;
const isShowable = (it) => { const f = it && fishOf(it); return !!f && f.rarity !== "sampah" && !f.protected; };

function start(uid) {
  const it = find(uid);
  if (!it) { N().toast("Ikan itu sudah tidak ada di coolbox", "bad"); return false; }
  if (!isShowable(it)) { N().toast("Yang ini tidak bisa dipamerkan", "bad"); return false; }
  if (N().mode() !== "world") { // dari mode mancing: ke darat dulu (hanya di area yang bisa dijelajahi: Muara, Toba)
    if (!NW.areas.forLoc(S().loc)) { N().toast("Kembali ke darat (Muara Kampung / Tepian Toba) dulu untuk memamerkan ikan", "bad"); return false; }
    N().goWorld("dock");
  }
  Object.assign(H, { uid, id: it.id, w: it.w, t0: performance.now() / 1000, tag: null });
  syncButton();
  return true;
}
function stop(reason) {
  if (!H.uid) return false;
  const f = N().FISH_BY_ID[H.id], msg = { manual: "Ikan dimasukkan kembali ke coolbox", gone: "Ikan yang kamu pamerkan sudah tidak kamu miliki", fishing: null, travel: "Ikan disimpan dulu di coolbox selama berlayar" }[reason];
  H.uid = null; H.id = null; H.tag = null;
  syncButton();
  if (msg) N().toast(msg + (reason === "manual" && f ? ` · ${f.name}` : ""), reason === "gone" ? "bad" : "");
  return true;
}
// Dipanggil tiap frame dunia & dari peristiwa: ikan hilang dari coolbox → berhenti
function validate() {
  if (!H.uid) return;
  const it = find(H.uid);
  if (!it) return void stop("gone");
  H.w = it.w;
}
// Hook untuk draw.js: kembalikan deskriptor pose, atau null
function frame() {
  if (!H.uid) return null;
  const it = find(H.uid), f = it && fishOf(it);
  if (!it || !f) { stop("gone"); return null; }
  const p = poseFor(it.w), L = fishLen(it.w);
  return { uid: H.uid, f, w: it.w, vr: it.vr, p, L, t0: H.t0, crouch: p.crouch };
}

// ---------- Tombol "Berhenti Memegang" ----------
let btn = null;
function syncButton() {
  if (!btn) return;
  btn.classList.toggle("hidden", !H.uid);
  if (H.uid) { const f = N().FISH_BY_ID[H.id]; btn.setAttribute("aria-label", `Berhenti memegang ${f ? f.name : "ikan"}`); }
}

// ---------- Panel inventaris ----------
function holdUI(it, here) {
  if (!isShowable(it)) return "";
  const p = poseFor(it.w);
  return here
    ? `<button class="btn" data-act="holdStop">✋ Berhenti Memegang</button>`
    : `<button class="btn gold" data-act="holdFish" data-arg="${esc(it.uid)}" title="${esc(p.ket)}">🐟 Pamerkan Ikan</button>`;
}
function holdAct(a, arg) {
  if (a === "holdFish") {
    if (NW.inv) NW.inv.closeDetail();
    if (start(arg)) { N().closePanel(); N().toast(`Kamu memamerkan ${N().FISH_BY_ID[H.id].name} · ${N().fmtW(H.w)}`, "good"); }
    return true;
  }
  if (a === "holdStop") { stop("manual"); if (NW.inv) NW.inv.redrawDetail(); return true; }
  return false;
}

// ---------- Menggambar: dipanggil dari drawCharacter (world/draw.js) ----------
const ease = (k) => { k = clamp(k, 0, 1); const c1 = 1.7; return 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }; // easeOutBack
// Hitung geometri sekali per frame per karakter: tengah ikan, sudut, posisi tangan
function geom(hd, fx, fy, y0, t) {
  const p = hd.p, back = fy < -0.1, side = Math.abs(fx) > 0.9;
  const raise = ease((t - hd.t0) / 0.55);                          // tangan naik
  const m = fx < -0.1 ? -1 : 1;                                    // arah kepala ikan (menghadap kiri/kanan)
  const struggle = p.id === "legenda" ? 1 : 0;
  const wob = Math.sin(t * p.fr) * p.wob + (struggle ? Math.sin(t * 23) * 0.06 : 0);
  const peek = back && !p.up;                                      // dari belakang: ikan di depan badan tertutup → naikkan sedikit supaya terlihat
  const sc = (p.id === "depan" && !back ? 1.08 : 1) * (peek ? 1.12 : 1) * (0.62 + 0.38 * raise) * (hd.p.id === "menang" ? 1 + 0.05 * Math.sin(t * 5) : 1);
  const L = hd.L * sc, Lw = L * 1.333, Lh = L * 0.8;
  const bounce = p.bounce * Math.abs(Math.sin(t * 5.2)) * (p.id === "legenda" ? 0.6 : 1);
  // fisik: tangan bergerak dari rendah (belum diangkat) ke pose
  const bottom = y0 + (-3 + (p.bottom + 3) * raise) - bounce - (peek ? 5 : 0);
  const lat = side ? fx * (p.dx + 6) : 0;                          // di samping: ikan didorong ke depan arah hadap
  const cx = (side ? lat : m * p.dx) + (struggle ? Math.sin(t * 19) * 1.3 : 0);
  const rot = (p.rot * raise + wob) ;                              // sebelum cermin
  const ang = rot * m, cs = Math.cos(ang), sn = Math.sin(ang);
  const cy = bottom - Lh * 0.5;
  // dua titik pegang di sisi bawah ikan (bingkai lokal ikan → dunia)
  const gx = clamp(Lw * 0.26, 4.5, 13), gy = Lh * 0.38;
  const hand = (s) => { const lx = s * gx * m, ly = gy; return { x: cx + lx * cs - ly * sn, y: cy + lx * sn + ly * cs }; };
  return { back, side, m, L, Lw, Lh, cx, cy, ang, h1: hand(-1), h2: hand(1), raise, behind: back && !p.up };
}
function drawFishBody(c, hd, G) {
  const sp = NW.drawFishSprite; if (!sp) return;
  c.save(); c.translate(G.cx, G.cy); c.rotate(G.ang); c.scale(G.m, 1);
  sp(c, hd.f, 0, 0, G.L, hd.vr);
  c.restore();
}
function drawArms(c, hd, G, st, fx, y0) {
  const shy = y0 - 22, side = G.side;
  const sh = side ? [{ x: -fx * 1.8, y: shy }, { x: -fx * 0.6, y: shy }] : [{ x: -7.5, y: shy }, { x: 7.5, y: shy }];
  const hands = side ? (G.h1.x * fx <= G.h2.x * fx ? [G.h1, G.h2] : [G.h2, G.h1]) : (G.h1.x <= G.h2.x ? [G.h1, G.h2] : [G.h2, G.h1]);
  c.lineCap = "round"; c.lineJoin = "round";
  for (let i = 0; i < 2; i++) {
    const s = sh[i], h = hands[i], sgn = side ? 1 : (i === 0 ? -1 : 1);
    // siku sedikit menekuk keluar
    const mx = (s.x + h.x) / 2 + sgn * (hd.p.up ? 3.2 : 2.2) * (side ? 0.4 : 1), my = (s.y + h.y) / 2 + (hd.p.up ? 0 : 2);
    c.strokeStyle = st.shirt; c.lineWidth = 4; c.beginPath(); c.moveTo(s.x, s.y); c.quadraticCurveTo(mx, my, h.x, h.y); c.stroke();
    c.fillStyle = st.skin; c.beginPath(); c.arc(h.x, h.y, 2.3, 0, 7); c.fill();
  }
}
// Ekspresi wajah; true bila wajah ditangani di sini (mata + mulut)
function drawFace(c, hd, ex, hy, side, fx, t) {
  const e = hd.p.expr; if (e === "senyum") return false;
  const eyes = side ? [fx * 4] : [-2.8 + ex, 2.8 + ex], mx = side ? fx * 4.5 : ex * 1.1, my = hy + 3.4;
  c.lineCap = "round"; c.strokeStyle = "#2a1d14"; c.fillStyle = "#2a1d14"; c.lineWidth = 1.1;
  const blush = () => { c.fillStyle = "rgba(240,120,110,.4)"; c.beginPath(); if (side) c.arc(fx * 2, hy + 3.3, 1.6, 0, 7); else { c.arc(-4.5 + ex, hy + 3.2, 1.7, 0, 7); c.arc(4.5 + ex, hy + 3.2, 1.7, 0, 7); } c.fill(); c.fillStyle = "#2a1d14"; };
  if (e === "berat") {            // menahan beban: mata menyipit, mulut miring
    for (const x of eyes) { c.beginPath(); c.moveTo(x - 1.6, hy + 0.2); c.lineTo(x + 1.6, hy + 0.9); c.stroke(); }
    c.beginPath(); c.moveTo(mx - 1.8, my + 0.4); c.quadraticCurveTo(mx, my - 0.6, mx + 1.8, my + 0.6); c.stroke();
  } else if (e === "bangga") {    // senyum lebar
    for (const x of eyes) { c.beginPath(); c.arc(x, hy + 0.6, 1.2, 0, 7); c.fill(); }
    blush(); c.strokeStyle = "#6b3a2a"; c.lineWidth = 1.1; c.beginPath(); c.arc(mx, hy + 2.6, 2.6, 0.15, Math.PI - 0.15); c.stroke();
  } else if (e === "teriak") {    // girang: mata ^ ^, mulut terbuka
    for (const x of eyes) { c.beginPath(); c.arc(x, hy + 1.3, 1.5, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    blush(); c.fillStyle = "#5a1f1a"; c.beginPath(); c.ellipse(mx, my + 0.6, 2.3, 2.2 + Math.abs(Math.sin(t * 9)) * 0.6, 0, 0, 7); c.fill();
    c.fillStyle = "#e8756a"; c.beginPath(); c.ellipse(mx, my + 1.6, 1.3, 0.8, 0, 0, 7); c.fill();
  } else if (e === "berjuang") {  // mata melotot goyang, mulut meringis
    const j = Math.sin(t * 25) * 0.5;
    for (const x of eyes) { c.fillStyle = "#fff"; c.beginPath(); c.arc(x, hy + 0.2, 2.1, 0, 7); c.fill(); c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(x + j, hy + 0.3, 0.9, 0, 7); c.fill(); }
    c.strokeStyle = "#2a1d14"; c.lineWidth = 1; for (let i = 0; i < eyes.length; i++) { const x = eyes[i], s = i === 0 && !side ? 1 : -1; c.beginPath(); c.moveTo(x - 2.2, hy - 2.2 - s * 0.8); c.lineTo(x + 2.2, hy - 2.2 + s * 0.8); c.stroke(); }
    c.fillStyle = "#5a1f1a"; c.beginPath(); c.moveTo(mx - 2.8, my); for (let i = 0; i <= 4; i++) c.lineTo(mx - 2.8 + i * 1.4, my + (i % 2 ? 2.2 : 0.4)); c.closePath(); c.fill();
  } else if (e === "takjub") {    // kagum: mata lebar berbinar, mulut "o"
    for (const x of eyes) { c.fillStyle = "#fff"; c.beginPath(); c.arc(x, hy + 0.2, 2, 0, 7); c.fill(); c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(x, hy + 0.3, 1.1, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(x - 0.5, hy - 0.2, 0.45, 0, 7); c.fill(); }
    c.fillStyle = "#5a1f1a"; c.beginPath(); c.ellipse(mx, my + 0.6, 1.6, 2, 0, 0, 7); c.fill();
  }
  return true;
}
// Tetes keringat dan kilau (tanpa objek baru per frame)
function drawFx(c, hd, G, y0, hy, t) {
  const p = hd.p;
  if (p.sweat > 0) {
    c.fillStyle = "rgba(150,210,245,.95)";
    for (let i = 0; i < p.sweat; i++) {
      const ph = (t * 1.6 + i * 0.37) % 1, sgn = i % 2 ? 1 : -1, x = sgn * (8.8 + (i >> 1) * 1.6), y = hy - 5 + ph * 11;
      c.globalAlpha = 1 - ph * 0.8; c.beginPath(); c.moveTo(x, y - 2.2); c.quadraticCurveTo(x + 1.5, y, x, y + 1.2); c.quadraticCurveTo(x - 1.5, y, x, y - 2.2); c.fill();
    }
    c.globalAlpha = 1;
  }
  if (p.id === "legenda" || p.id === "spesial" || p.id === "menang") {
    const n = p.id === "spesial" ? 5 : 3; c.fillStyle = p.id === "legenda" ? "#ffe27a" : "#fff6c9";
    for (let i = 0; i < n; i++) {
      const a = t * (p.id === "spesial" ? 0.9 : 1.6) + (i * Math.PI * 2) / n, r = G.Lw * 0.62 + 4, sx = G.cx + Math.cos(a) * r, sy = G.cy + Math.sin(a) * r * 0.55, s = 1.5 + 1.1 * Math.abs(Math.sin(t * 4 + i * 2));
      c.globalAlpha = 0.55 + 0.4 * Math.sin(t * 5 + i); c.beginPath(); c.moveTo(sx, sy - s * 2); c.lineTo(sx + s * 0.6, sy - s * 0.6); c.lineTo(sx + s * 2, sy); c.lineTo(sx + s * 0.6, sy + s * 0.6); c.lineTo(sx, sy + s * 2); c.lineTo(sx - s * 0.6, sy + s * 0.6); c.lineTo(sx - s * 2, sy); c.lineTo(sx - s * 0.6, sy - s * 0.6); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
  }
}
// Seberapa tinggi label nama pemain perlu naik supaya tidak menimpa ikan (satuan dunia)
function labelLift() {
  if (!H.uid) return 0;
  const it = find(H.uid); if (!it) return 0;
  const p = poseFor(it.w), L = fishLen(it.w) * 1.12, Lw = L * 1.333, Lh = L * 0.8;
  const a = Math.abs(p.rot) + p.wob * 1.3 + 0.05, half = (Lw / 2) * Math.sin(a) + (Lh / 2) * Math.cos(a);
  const top = -p.bottom + 5 + Lh / 2 + half + p.bounce;               // tinggi ujung atas ikan dari kaki
  return Math.max(0, top + 5 - 58);                                   // label standar berada 58 di atas kaki
}

// ---------- Label ikan (nama + berat) di bawah kaki karakter ----------
const tagCache = new Map();
function tagCanvas(f, w) {
  const key = f.id + "|" + w, hit = tagCache.get(key); if (hit) return hit;
  const R = (typeof RARITY !== "undefined" && RARITY[f.rarity]) || { color: "#fff", label: "" };
  const txt1 = `${f.name}`, txt2 = `${N().fmtW(w)}`;
  const m = document.createElement("canvas").getContext("2d");
  m.font = "800 11px system-ui, sans-serif"; const w1 = m.measureText(txt1).width; m.font = "700 10px system-ui, sans-serif"; const w2 = m.measureText(txt2).width;
  const RES = 2, W = Math.ceil(Math.max(w1, w2) + 22), Hh = 27;
  const cv = document.createElement("canvas"); cv.width = W * RES; cv.height = Hh * RES; cv._w = W; cv._h = Hh;
  const g = cv.getContext("2d"); g.scale(RES, RES);
  g.fillStyle = "rgba(14,34,44,.66)"; g.beginPath(); if (g.roundRect) g.roundRect(0, 0, W, Hh, 8); else g.rect(0, 0, W, Hh); g.fill();
  g.strokeStyle = R.color; g.lineWidth = 1.4; g.beginPath(); if (g.roundRect) g.roundRect(0.7, 0.7, W - 1.4, Hh - 1.4, 7.5); else g.rect(0.7, 0.7, W - 1.4, Hh - 1.4); g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 2;
  g.font = "800 11px system-ui, sans-serif"; g.fillStyle = "#fff"; g.fillText(txt1, W / 2, 8.5);
  g.font = "700 10px system-ui, sans-serif"; g.fillStyle = "#ffe9a8"; g.fillText("⚖️ " + txt2, W / 2, 19.5);
  if (tagCache.size > 24) tagCache.delete(tagCache.keys().next().value);
  tagCache.set(key, cv); return cv;
}
// (b = titik kaki karakter di ruang dunia; scale mengimbangi zoom kamera)
function drawTag(c, b, scale) {
  if (!H.uid) return;
  const it = find(H.uid), f = it && fishOf(it); if (!f) return;
  const cv = tagCanvas(f, it.w), s = scale || 1, k = ease((performance.now() / 1000 - H.t0) / 0.5);
  c.save(); c.globalAlpha = clamp(k, 0, 1);
  c.drawImage(cv, b.x - (cv._w * s) / 2, b.y + 8 * s, cv._w * s, cv._h * s);
  c.restore();
}
// Kamera sedikit naik bila ikan tinggi, supaya ikan tidak terpotong tepi atas (halus)
function camLift(dt) {
  const target = H.uid && poseFor(H.w).up ? Math.min(26, labelLift() * 0.5 + 10) : 0;
  H.camK += (target - H.camK) * Math.min(1, (dt || 0.016) * 3);
  return H.camK;
}

function hook() {
  btn = document.createElement("button"); btn.id = "holdStop"; btn.className = "hold-stop hidden"; btn.type = "button";
  btn.innerHTML = "<span>✋</span> Berhenti<br>Memegang";
  btn.addEventListener("click", (e) => { e.stopPropagation(); stop("manual"); N().sfx("click"); });
  document.body.appendChild(btn);
  const off = () => validate();
  N().on("sell", off);                       // ikan terjual → berhenti otomatis
  N().on("catch", off);
}

NW.hold = { POSES, poseFor, fishLen, holding, start, stop, validate, frame, geom, drawFishBody, drawArms, drawFace, drawFx, labelLift, drawTag, camLift, isShowable, hook, state: H };
// Dipakai modul inventaris lewat NW.look (titik pasang fase 3)
NW.look = NW.look || {};
Object.assign(NW.look, { holdUI, holdAct, holding });
})();
