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
  if (r > t.rank) { t.rank = r; N().toast(`🎣 Gelar baru: ${titleName(r)}!`, "good"); N().sfx("click"); }
}

// ---------- Joran: spesifikasi visual per tingkat ----------
// blank  = warna batang, w = tebal batang (px), grip = warna gagang, gripLen = porsi panjang
// reel   = {col, r} atau null, node = ruas bambu, accent = {kind, col}
// Tambah tingkat 6-10 di sini pada Bumbu 1.2.
const RODS = [
  { name: "Joran Bambu",        blank: "#c9a46a", w: 2.0, grip: "#8a5a32", gripLen: 0.24, reel: null,                      node: true,  accent: null },
  { name: "Joran Fiber",        blank: "#3d5a6c", w: 2.0, grip: "#2f3b44", gripLen: 0.26, reel: { col: "#d8dde0", r: 1.7 }, node: false, accent: null },
  { name: "Joran Karbon",       blank: "#222831", w: 2.1, grip: "#14181d", gripLen: 0.28, reel: { col: "#8fa2ad", r: 2.0 }, node: false, accent: { kind: "ring", col: "#5fb4ec" } },
  { name: "Joran Pro Titanium", blank: "#9aa6b0", w: 2.5, grip: "#3a4650", gripLen: 0.30, reel: { col: "#cfe1f0", r: 2.2 }, node: false, accent: { kind: "ring", col: "#e8f4ff" } },
  { name: "Joran Legenda Nusa", blank: "#e0b84c", w: 2.6, grip: "#4a2e1a", gripLen: 0.32, reel: { col: "#fff0b0", r: 2.4 }, node: false, accent: { kind: "dots", col: "#7a1f1f" } },
];
function rodSpec(level) {
  const L = level === undefined ? S().up.rod : level;
  return RODS[Math.max(0, Math.min(RODS.length - 1, L | 0))];
}
const shade = (hex, k) => { // k −1..1
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
// Gambar joran tersandang. Koordinat lokal karakter (titik kaki = 0,0). `fx` = arah hadap horizontal
// (−1..1), `y0` = tinggi badan saat berjalan, `sway` = ayunan −1..1. `inFront` = karakter membelakangi
// kamera, jadi joran ada di depan badan; selain itu joran ada di belakang badan (digambar sebelum badan).
function drawBackRod(c, spec, fx, y0, sway, inFront) {
  const side = fx === 0 ? 1 : -Math.sign(fx);       // joran miring ke arah punggung karakter
  const bx = -fx * 5.5 + (inFront ? 0 : 0);
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
  if (spec.accent) {
    const a = spec.accent;
    if (a.kind === "ring") for (const k of [g + 0.02, 0.5]) { const p = at(k); c.strokeStyle = a.col; c.lineWidth = 1; c.beginPath(); c.moveTo(p[0] - nx * spec.w * 0.7, p[1] - ny * spec.w * 0.7); c.lineTo(p[0] + nx * spec.w * 0.7, p[1] + ny * spec.w * 0.7); c.stroke(); }
    else if (a.kind === "dots") for (const k of [0.4, 0.5, 0.6]) { const p = at(k); c.fillStyle = a.col; c.beginPath(); c.arc(p[0], p[1], 0.9, 0, 7); c.fill(); }
  }
  if (spec.reel) { // reel menempel di sisi gagang
    const p = at(g * 0.7), o = spec.w * 1.3 + spec.reel.r * 0.5;
    c.fillStyle = spec.reel.col; c.beginPath(); c.arc(p[0] + nx * o, p[1] + ny * o, spec.reel.r, 0, 7); c.fill();
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.arc(p[0] + nx * o, p[1] + ny * o, spec.reel.r * 0.35, 0, 7); c.fill();
  }
  c.restore();
}

// ---------- Label nama + gelar ----------
// Dirender sekali ke kanvas kecil lalu di-cache; per frame hanya drawImage.
const labelCache = new Map();
const LABEL_RES = 2; // resolusi internal supaya tajam di layar HP
function labelCanvas(name, title) {
  const key = name + "\u0001" + (title || "");
  let cv = labelCache.get(key); if (cv) return cv;
  const lines = title ? [{ t: name, f: "800 12px system-ui, sans-serif", c: "#fff" }, { t: "🎣 " + title, f: "600 10px system-ui, sans-serif", c: "#ffe9a8" }] : [{ t: name, f: "800 12px system-ui, sans-serif", c: "#fff" }];
  const m = document.createElement("canvas").getContext("2d");
  let w = 0; for (const l of lines) { m.font = l.f; w = Math.max(w, m.measureText(l.t).width); }
  const padX = 7, padY = 3, lh = [14, 12], W = Math.ceil(w + padX * 2), H = lines.reduce((s, _, i) => s + lh[i], 0) + padY * 2;
  cv = document.createElement("canvas"); cv.width = W * LABEL_RES; cv.height = H * LABEL_RES; cv._w = W; cv._h = H;
  const g = cv.getContext("2d"); g.scale(LABEL_RES, LABEL_RES);
  g.fillStyle = "rgba(14, 34, 44, .58)"; g.beginPath();
  if (g.roundRect) g.roundRect(0, 0, W, H, 7); else g.rect(0, 0, W, H);
  g.fill();
  g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 2;
  let y = padY; lines.forEach((l, i) => { g.font = l.f; g.fillStyle = l.c; g.fillText(l.t, W / 2, y + lh[i] / 2 + 0.5); y += lh[i]; });
  if (labelCache.size > 40) labelCache.delete(labelCache.keys().next().value);
  labelCache.set(key, cv);
  return cv;
}
// (x, y) = titik kaki karakter di ruang dunia; `scale` mengimbangi zoom kamera agar ukuran di layar tetap terbaca
function drawLabel(c, info, x, y, scale) {
  const cv = labelCanvas(info.name, info.title), s = scale || 1;
  c.drawImage(cv, x - (cv._w * s) / 2, y - 58 - cv._h * s, cv._w * s, cv._h * s);
}
function drawPlayerLabel(c, b, scale) { drawLabel(c, { name: playerName(), title: currentTitle() }, b.x, b.y, scale); }

// ---------- Panel (dipasang di menu 🎯) ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
function panelSection() {
  const n = count(), g = nextGoal(), t = currentTitle();
  let h = `<div class="rep-card"><div class="rep-star">🎣</div><div class="grow"><b>${esc(playerName())}</b>
    <div>${t ? esc(t) : "Belum bergelar"}</div>
    <div class="muted">${g ? (n === 0 ? `Tangkap ikan pertamamu untuk gelar ${esc(g.name)}.` : `${n} ikan · ${g.left} lagi menuju ${esc(g.name)}`) : `${n} ikan · gelar tertinggi`}</div></div></div>
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

NW.look = { TITLES, RODS, rankOf, titleName, count, rank, currentTitle, nextGoal, playerName, cleanName, rodSpec, drawBackRod, drawLabel, drawPlayerLabel, panelSection, act, hook, defaults };
})();
