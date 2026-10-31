// =========================================================
//  NUSA ISLAND — Bumbu 1.1 "Visual Nelayan"
//  - Joran di punggung: renderer berbasis DATA (NW.look.RODS). Menambah tingkat
//    joran cukup menambah baris di RODS, tidak perlu mengubah kode gambar.
//  - 8 gelar pemancing dari jumlah ikan sungguhan yang berhasil ditangkap
//    (S.titles, berversi). Sampah tidak dihitung.
//  - Label nama + gelar di atas kepala (kanvas kecil yang di-cache, bisa dipakai
//    pemain lain kelak lewat NW.look.drawLabel).
//  - Nama pemain lokal sementara (S.profile). Bukan akun online.
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa;
const S = () => N().S;

// ---------- Gelar tangkapan (nama resmi, jangan diubah) ----------
// min = jumlah ikan minimum. Rentang tidak tumpang tindih; 0 ikan = belum ada gelar.
const TITLES = [
  { min: 1, name: "Pemancing Baru" },
  { min: 10, name: "Anak Muara" },
  { min: 30, name: "Pencari Tangkapan" },
  { min: 50, name: "Nelayan Muda" },
  { min: 100, name: "Pemburu Muara" },
  { min: 150, name: "Ahli Pancing" },
  { min: 200, name: "Juragan Kail" },
  { min: 300, name: "Legenda Muara" },
];
// 0 = belum bergelar, 1..8 = indeks gelar + 1
function rankOf(n) { let r = 0; for (let i = 0; i < TITLES.length; i++) if (n >= TITLES[i].min) r = i + 1; return r; }
const titleName = (rank) => (rank > 0 ? TITLES[rank - 1].name : null);
const isFish = (f) => !!f && f.rarity !== "sampah";

// ---------- Data berversi ----------
const TITLES_V = 1, PROFILE_V = 1, NAME_MAX = 14, NAME_DEFAULT = "Pemancing";
function cleanName(v) {
  const s = String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f<>&"']/g, "").replace(/\s+/g, " ").trim();
  return Array.from(s).slice(0, NAME_MAX).join("");
}
function defaults() {
  const s = S();
  if (!s.titles || s.titles.v !== TITLES_V || !Number.isFinite(s.titles.fish) || s.titles.fish < 0) {
    // Migrasi dari simpanan lama: hitung ikan sungguhan dari koleksi (dex menyimpan jumlah per
    // spesies, sampah bisa dikenali dari rarity). stats.caught tidak diubah. Dihitung SEKALI saja.
    let n = 0;
    for (const [id, rec] of Object.entries(s.dex || {})) { const f = N().FISH_BY_ID[id]; if (isFish(f) && rec && rec.n > 0) n += Math.floor(rec.n); }
    s.titles = { v: TITLES_V, fish: n, rank: rankOf(n) };
  }
  s.titles.rank = rankOf(s.titles.fish); // sinkron diam-diam saat muat → tidak ada notifikasi ulang setelah refresh
  if (!s.profile || s.profile.v !== PROFILE_V) s.profile = { v: PROFILE_V, name: NAME_DEFAULT };
  s.profile.name = cleanName(s.profile.name) || NAME_DEFAULT;
}
const count = () => S().titles.fish;
const rank = () => S().titles.rank;
const playerName = () => S().profile.name;
function currentTitle() { return titleName(rank()); }
function nextGoal() { const r = rank(); return r < TITLES.length ? { name: TITLES[r].name, min: TITLES[r].min, left: TITLES[r].min - count() } : null; }

function onCatch({ fish }) {
  if (!isFish(fish)) return;       // sampah tidak menambah gelar
  const t = S().titles; t.fish++;
  const r = rankOf(t.fish);
  if (r > t.rank) { t.rank = r; N().toast(`🎣 Gelar baru: ${titleName(r)}!`, "good"); N().sfx("gelar"); }
}

// ---------- Joran: spesifikasi visual per tingkat (10 tingkat) ----------
// blank  = warna batang, w = tebal batang (px), grip = warna gagang, gripLen = porsi panjang
// reel   = {col, r} atau null, node = ruas bambu, accent = {kind, col}
// Nama diambil dari UPGRADES.rod.levels (satu sumber kebenaran), jadi tidak ditulis di sini.
// Menambah tingkat baru: tambah satu baris di sini + satu entri di UPGRADES.rod.
const RODS = [
  { blank: "#c9a46a", w: 2.0, grip: "#8a5a32", gripLen: 0.24, reel: null,                       node: true,  accent: null },                              // 1 bambu polos, tali sederhana
  { blank: "#3d5a6c", w: 2.0, grip: "#2f3b44", gripLen: 0.26, reel: { col: "#d8dde0", r: 1.7 },  node: false, accent: null },                              // 2 fiber + reel kecil
  { blank: "#222831", w: 2.1, grip: "#14181d", gripLen: 0.28, reel: { col: "#8fa2ad", r: 2.0 },  node: false, accent: { kind: "ring", col: "#5fb4ec" } }, // 3 karbon gelap, reel rapi
  { blank: "#9aa6b0", w: 2.5, grip: "#3a4650", gripLen: 0.30, reel: { col: "#cfe1f0", r: 2.2 },  node: false, accent: { kind: "ring", col: "#e8f4ff" } }, // 4 perak kebiruan, kokoh
  { blank: "#e0b84c", w: 2.6, grip: "#4a2e1a", gripLen: 0.32, reel: { col: "#fff0b0", r: 2.4 },  node: false, accent: { kind: "dots", col: "#7a1f1f" } },  // 5 emas + kayu gelap, ornamen
  { blank: "#4a7a96", w: 2.9, grip: "#1e3340", gripLen: 0.33, reel: { col: "#9ecbe0", r: 2.9 },  node: false, accent: { kind: "ring", col: "#3fb6c4" } }, // 6 baja samudra, reel besar
  { blank: "#173b6b", w: 3.0, grip: "#0e1f3a", gripLen: 0.33, reel: { col: "#c8dff0", r: 3.0 },  node: false, accent: { kind: "wave", col: "#6fc2ff" } },  // 7 biru tua, gelombang
  { blank: "#8b96a3", w: 3.2, grip: "#3d2f24", gripLen: 0.35, reel: { col: "#e0c27a", r: 3.1 },  node: false, accent: { kind: "layers", col: "#d9b24a" } }, // 8 metalik, gagang berlapis
  { blank: "#1f4f93", w: 3.3, grip: "#6b4a1c", gripLen: 0.35, reel: { col: "#f0c850", r: 3.2 },  node: false, accent: { kind: "anchor", col: "#f0c850" } }, // 9 biru-emas, jangkar
  { blank: "#16386b", w: 3.5, grip: "#5a3a12", gripLen: 0.36, reel: { col: "#f4d36a", r: 3.5 },  node: false, accent: { kind: "royal", col: "#f4d36a" } },  // 10 termegah, ornamen maritim
];
function syncNames() { RODS.forEach((r, i) => { r.name = UPGRADES.rod.levels[i]; }); }
syncNames();
function rodSpec(level) {
  if (level === undefined && NW.streak && NW.streak.rodSpec) { const x = NW.streak.rodSpec(); if (x) return x; } // Joran Pelaut Eksklusif (hadiah Login Streak)
  const L = level === undefined ? S().up.rod : level;
  return RODS[Math.max(0, Math.min(RODS.length - 1, L | 0))];
}
const shade = (hex, k) => { // k −1..1 → hex
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k))));
  return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
};
// Ornamen di sepanjang batang. `at(k)` = titik pada batang (0 pangkal .. 1 ujung), (nx, ny) = normal batang.
function accents(c, spec, at, nx, ny, g) {
  const a = spec.accent; if (!a) return;
  const band = (k, w, col, lw) => { const p = at(k); c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(p[0] - nx * w, p[1] - ny * w); c.lineTo(p[0] + nx * w, p[1] + ny * w); c.stroke(); };
  const w = spec.w * 0.75;
  if (a.kind === "ring") { band(g + 0.02, w, a.col, 1); band(0.5, w, a.col, 1); }
  else if (a.kind === "dots") { for (const k of [0.4, 0.5, 0.6]) { const p = at(k); c.fillStyle = a.col; c.beginPath(); c.arc(p[0], p[1], 0.9, 0, 7); c.fill(); } }
  else if (a.kind === "wave") { // gelombang kecil: goresan melengkung berselang-seling
    c.strokeStyle = a.col; c.lineWidth = 0.9;
    [0.42, 0.52, 0.62, 0.72].forEach((k, i) => { const p = at(k), s = i % 2 ? 1 : -1; c.beginPath(); c.moveTo(p[0] - nx * w, p[1] - ny * w); c.quadraticCurveTo(p[0] + nx * 0.4 * s, p[1] + ny * 0.4 * s - 1.2, p[0] + nx * w, p[1] + ny * w); c.stroke(); });
  } else if (a.kind === "layers") { // gagang berlapis
    [0.3, 0.55, 0.8].forEach((f) => band(g * f, spec.w * 1.0, a.col, 1.1));
    band(g + 0.02, w, a.col, 1.2);
  } else if (a.kind === "anchor") { // cincin emas + jangkar mungil dekat gagang
    band(0.5, w, a.col, 1.1);
    const p = at(g + 0.09), ox = nx * (spec.w * 1.5), oy = ny * (spec.w * 1.5);
    c.strokeStyle = a.col; c.lineWidth = 0.8; c.beginPath();
    c.moveTo(p[0] + ox, p[1] + oy - 1.6); c.lineTo(p[0] + ox, p[1] + oy + 1.4);           // batang jangkar
    c.moveTo(p[0] + ox - 1.1, p[1] + oy - 0.8); c.lineTo(p[0] + ox + 1.1, p[1] + oy - 0.8); // palang
    c.moveTo(p[0] + ox - 1.3, p[1] + oy + 0.6); c.quadraticCurveTo(p[0] + ox, p[1] + oy + 2.4, p[0] + ox + 1.3, p[1] + oy + 0.6); // kait
    c.stroke();
  } else if (a.kind === "royal") { // pita emas + kilau halus di batang dan manik di ujung
    [0.34, 0.5, 0.66].forEach((k) => band(k, w, a.col, 1.3));
    band(g + 0.02, w, a.col, 1.4);
    const sh = 0.5 + 0.5 * Math.sin(performance.now() / 900), p0 = at(g + 0.04), p1 = at(0.95);
    c.strokeStyle = `rgba(255,255,255,${(0.22 + 0.18 * sh).toFixed(2)})`; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(p0[0] + nx * 0.5, p0[1] + ny * 0.5); c.lineTo(p1[0] + nx * 0.5, p1[1] + ny * 0.5); c.stroke();
    const tp = at(1); c.fillStyle = a.col; c.beginPath(); c.arc(tp[0], tp[1], 1.1, 0, 7); c.fill();
  }
}
// Gambar joran tersandang. Koordinat lokal karakter (titik kaki = 0,0). `fx` = arah hadap horizontal
// (−1..1), `y0` = tinggi badan saat berjalan, `sway` = ayunan −1..1. `inFront` = karakter membelakangi
// kamera, jadi joran ada di depan badan; selain itu joran ada di belakang badan (digambar sebelum badan).
function drawBackRod(c, spec, fx, y0, sway, inFront) {
  const side = fx === 0 ? 1 : -Math.sign(fx);       // joran miring ke arah punggung karakter
  const bx = -fx * 5.5;
  const ax = bx - side * 4, ay = y0 - 8;            // pangkal (dekat pinggang)
  const tx = bx + side * 9 + sway * 1.3, ty = y0 - 47 - Math.abs(sway) * 0.4; // ujung (di atas bahu)
  const dx = tx - ax, dy = ty - ay, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  const at = (k) => [ax + dx * k, ay + dy * k];
  const seg = (k0, k1, w, col) => { const a = at(k0), b = at(k1); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
  c.save(); c.lineCap = "round";
  const g = spec.gripLen;
  seg(0, g, spec.w * 1.55, spec.grip);                 // gagang
  seg(g, 0.68, spec.w, spec.blank);                    // batang bawah
  seg(0.68, 1, spec.w * 0.62, shade(spec.blank, 0.12)); // batang atas (menipis)
  if (spec.node) { c.strokeStyle = shade(spec.blank, -0.35); c.lineWidth = 0.8; for (const k of [0.4, 0.58, 0.76]) { const p = at(k); c.beginPath(); c.moveTo(p[0] - nx * 1.4, p[1] - ny * 1.4); c.lineTo(p[0] + nx * 1.4, p[1] + ny * 1.4); c.stroke(); } }
  accents(c, spec, at, nx, ny, g);
  if (spec.reel) { // reel menempel di sisi gagang
    const p = at(g * 0.7), o = spec.w * 1.3 + spec.reel.r * 0.5;
    c.fillStyle = spec.reel.col; c.beginPath(); c.arc(p[0] + nx * o, p[1] + ny * o, spec.reel.r, 0, 7); c.fill();
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.arc(p[0] + nx * o, p[1] + ny * o, spec.reel.r * 0.35, 0, 7); c.fill();
  } else { // tali sederhana melilit gagang bambu
    const p = at(g * 0.55); c.strokeStyle = "#e9dcb8"; c.lineWidth = 0.7; c.beginPath(); c.moveTo(p[0] - nx * 1.6, p[1] - ny * 1.6); c.lineTo(p[0] + nx * 1.6, p[1] + ny * 1.6); c.stroke();
  }
  c.restore();
}
// Pratinjau untuk katalog toko (kanvas kecil, di-cache per tingkat)
const previewCache = {};
function rodPreview(level) {
  if (previewCache[level]) return previewCache[level];
  const cv = document.createElement("canvas"); cv.width = 72; cv.height = 108;
  const c = cv.getContext("2d"); c.translate(36, 100); c.scale(2.2, 2.2);
  c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.ellipse(0, 4, 9, 2.2, 0, 0, 7); c.fill();
  drawBackRod(c, rodSpec(level), 0, 0, 0, true);
  return (previewCache[level] = cv.toDataURL());
}
// Joran yang dipegang saat memancing (mode mancing). hp = tangan, mid = titik kontrol lengkung, tip = ujung.
// Bentuknya memakai spesifikasi yang sama dengan joran punggung, tetapi lebih besar dan melengkung.
function drawHeldRod(ctx, spec, hp, mid, tip, back, U, night) {
  const bez = (t) => { const u = 1 - t; return [u * u * hp.x + 2 * u * t * mid.x + t * t * tip.x, u * u * hp.y + 2 * u * t * mid.y + t * t * tip.y]; };
  const nrm = (t) => { const a = bez(Math.max(0, t - 0.02)), b = bez(Math.min(1, t + 0.02)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  ctx.lineCap = "round";
  const k = spec.w / 2;
  // gagang (di belakang tangan)
  ctx.strokeStyle = night(spec.grip); ctx.lineWidth = 7.5 * U * k;
  ctx.beginPath(); ctx.moveTo(back.x, back.y); ctx.lineTo(hp.x, hp.y); ctx.stroke();
  // batang
  ctx.strokeStyle = night(spec.blank); ctx.lineWidth = 3.6 * U * k; ctx.beginPath(); ctx.moveTo(hp.x, hp.y); ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y); ctx.stroke();
  if (spec.node) { ctx.strokeStyle = night(shade(spec.blank, -0.35)); ctx.lineWidth = 1.2 * U; for (const t of [0.25, 0.45, 0.65, 0.85]) { const p = bez(t), n = nrm(t); ctx.beginPath(); ctx.moveTo(p[0] - n[0] * 3 * U, p[1] - n[1] * 3 * U); ctx.lineTo(p[0] + n[0] * 3 * U, p[1] + n[1] * 3 * U); ctx.stroke(); } }
  const a = spec.accent;
  if (a) {
    const band = (t, w, lw) => { const p = bez(t), n = nrm(t); ctx.strokeStyle = night(a.col); ctx.lineWidth = lw * U; ctx.beginPath(); ctx.moveTo(p[0] - n[0] * w * U, p[1] - n[1] * w * U); ctx.lineTo(p[0] + n[0] * w * U, p[1] + n[1] * w * U); ctx.stroke(); };
    if (a.kind === "dots") { ctx.fillStyle = night(a.col); for (const t of [0.3, 0.42, 0.54]) { const p = bez(t); ctx.beginPath(); ctx.arc(p[0], p[1], 1.6 * U, 0, 7); ctx.fill(); } }
    else if (a.kind === "layers") { for (const f of [0.3, 0.55, 0.8]) { ctx.strokeStyle = night(a.col); ctx.lineWidth = 1.6 * U; ctx.beginPath(); ctx.moveTo(back.x + (hp.x - back.x) * f - 4 * U, back.y + (hp.y - back.y) * f - 3 * U); ctx.lineTo(back.x + (hp.x - back.x) * f + 4 * U, back.y + (hp.y - back.y) * f + 3 * U); ctx.stroke(); } band(0.08, 3, 2); }
    else if (a.kind === "wave") { for (const t of [0.22, 0.36, 0.5, 0.64]) band(t, 2.6, 1.3); }
    else { band(0.1, 3, 1.8); band(0.4, 3, 1.8); if (a.kind === "royal") { band(0.25, 3, 2); band(0.55, 3, 2); const tp = tip; ctx.fillStyle = night(a.col); ctx.beginPath(); ctx.arc(tp.x, tp.y, 2.2 * U, 0, 7); ctx.fill(); } }
  }
  // reel
  if (spec.reel) {
    const r = spec.reel.r * 2.6 * U;
    ctx.fillStyle = night(spec.reel.col); ctx.beginPath(); ctx.arc(hp.x + 6 * U, hp.y + 8 * U, r, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.arc(hp.x + 6 * U, hp.y + 8 * U, r * 0.35, 0, 7); ctx.fill();
  } else { ctx.strokeStyle = night("#e9dcb8"); ctx.lineWidth = 1.4 * U; ctx.beginPath(); ctx.moveTo(hp.x + 2 * U, hp.y + 5 * U); ctx.lineTo(hp.x + 9 * U, hp.y + 9 * U); ctx.stroke(); }
}

// ---------- Label nama + gelar ----------
// Dirender sekali ke kanvas kecil lalu di-cache; per frame hanya drawImage.
const labelCache = new Map();
const LABEL_RES = 2; // resolusi internal supaya tajam di layar HP
const LABEL_MAXW = 96, LABEL_GAP = 60;           // lebar maks (px layar) & jarak dasar label dari kaki karakter (px dunia; karakter ±56 px)
function fitText(m, text, font, maxW) {           // potong dengan "…" bila terlalu lebar (nama panjang)
  m.font = font; if (m.measureText(text).width <= maxW) return text;
  const a = Array.from(text); while (a.length > 1 && m.measureText(a.join("") + "…").width > maxW) a.pop();
  return a.join("").trimEnd() + "…";
}
function labelCanvas(name, title) {
  const key = name + "\u0001" + (title || "");
  let cv = labelCache.get(key); if (cv) return cv;
  // hierarki: gelar kecil & redup di ATAS, nama tebal di BAWAH; latar transparan lembut, bantalan proporsional
  const m = document.createElement("canvas").getContext("2d"), fN = "800 11px system-ui, sans-serif", fT = "600 8.5px system-ui, sans-serif";
  const nm = fitText(m, name, fN, LABEL_MAXW - 12), tt = title ? fitText(m, title, fT, LABEL_MAXW - 12) : "";
  m.font = fN; let w = m.measureText(nm).width; if (tt) { m.font = fT; w = Math.max(w, m.measureText(tt).width); }
  const padX = 6, padY = 2.5, hT = tt ? 10 : 0, hN = 13, W = Math.ceil(w + padX * 2), H = Math.ceil(hT + hN + padY * 2);
  cv = document.createElement("canvas"); cv.width = W * LABEL_RES; cv.height = H * LABEL_RES; cv._w = W; cv._h = H;
  const g = cv.getContext("2d"); g.scale(LABEL_RES, LABEL_RES);
  g.fillStyle = "rgba(12, 32, 40, .40)"; g.beginPath();
  if (g.roundRect) g.roundRect(0, 0, W, H, 8); else g.rect(0, 0, W, H);
  g.fill();
  g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 1.5;
  if (tt) { g.font = fT; g.fillStyle = "rgba(255, 226, 150, .95)"; g.fillText(tt, W / 2, padY + hT / 2 + 0.5); }
  g.font = fN; g.fillStyle = "#fff"; g.fillText(nm, W / 2, padY + hT + hN / 2 + 0.5);
  if (labelCache.size > 60) labelCache.delete(labelCache.keys().next().value);
  labelCache.set(key, cv);
  return cv;
}
// (x, y) = titik kaki karakter di ruang dunia; `scale` mengimbangi zoom kamera agar ukuran di layar tetap terbaca
function drawLabel(c, info, x, y, scale, lift) {
  const cv = labelCanvas(info.name, info.title), s = scale || 1;
  c.drawImage(cv, x - (cv._w * s) / 2, y - LABEL_GAP - (lift || 0) - cv._h * s, cv._w * s, cv._h * s);
}
// tinggi label (px layar) & titik atas label: dipakai bubble chat supaya tidak menumpuk di atas label
function labelTop(info, y, scale, lift) { const cv = labelCanvas(info.name, info.title); return y - LABEL_GAP - (lift || 0) - cv._h * (scale || 1); }
function drawPlayerLabel(c, b, scale, lift) { drawLabel(c, { name: playerName(), title: currentTitle() }, b.x, b.y, scale, lift); }

// ---------- Panel (dipasang di menu 🎯) ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
function panelSection() {
  const n = count(), g = nextGoal(), t = currentTitle();
  let h = `<div class="rep-card"><div class="rep-star">🎣</div><div class="grow"><b>${esc(playerName())}</b>
    <div>${t ? esc(t) : "Belum bergelar"}</div>
    <div class="muted">${g ? (n === 0 ? `Tangkap ikan pertamamu untuk gelar ${esc(g.name)}.` : `${n} ikan · ${g.left} lagi menuju ${esc(g.name)}`) : `${n} ikan · gelar tertinggi`}</div></div></div>
    <div class="row"><div class="grow">🎣 Joran aktif</div><b>${esc(UPGRADES.rod.levels[S().up.rod] || "")}</b></div>
    <div class="row"><input id="pName" class="name-input" type="text" maxlength="${NAME_MAX}" value="${esc(playerName())}" aria-label="Nama pemain" autocomplete="off">
      <button class="btn small" data-act="saveName">Simpan nama</button></div>
    <p class="muted">Nama hanya tersimpan di perangkat ini. Hanya ikan sungguhan yang dihitung untuk gelar, sampah tidak.</p>`;
  return h;
}
function act(a) {
  if (a !== "saveName") return false;
  const el = document.getElementById("pName"), v = cleanName(el ? el.value : "");
  S().profile.name = v || NAME_DEFAULT; N().save(); N().toast("Nama disimpan", "good"); N().renderPanel();
  return true;
}

function hook() {
  defaults();
  N().on("catch", onCatch);
}

NW.look = { TITLES, RODS, rodPreview, drawHeldRod, syncNames, rankOf, titleName, count, rank, currentTitle, nextGoal, playerName, cleanName, rodSpec, drawBackRod, drawLabel, labelTop, drawPlayerLabel, panelSection, act, hook, defaults };
})();
