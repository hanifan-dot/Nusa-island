// NUSA ISLAND — MERCUSUAR EMAS / SULTAN SAMUDRA (objek FISIK 2.5D di Muara Kampung, terpisah dari Podium Juara).
// Simbol penghargaan koleksi: TIDAK memberi kekuatan, bonus memancing, atau keuntungan permainan. Modul ini hanya MEMBACA dan menggambar.
// Data HANYA dari server (cloud.call sultanTop / sultanMe / sultanPrefs), disaring NusaSultanCore. Tanpa polling: SATU pemeriksaan saat masuk akun
// (dan saat status akun berubah), lalu data dipakai ulang selama 5 menit; panel yang dibuka memakai data itu, muat-ulang paling cepat tiap 5 menit.
// Server "inactive"/tidak tersedia/belum login → objek, titik interaksi, dan tombol TIDAK ADA (peta Muara tetap seperti semula).
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const Core = window.NusaSultanCore, $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cloud = () => NW.cloud, loggedIn = () => !!(cloud() && cloud().enabled && cloud().user);

// ---------- letak di dunia: pantai utara Muara, jauh dari jalan, NPC, Podium Juara (21.4,15.4), dermaga, rumah ----------
const C = { x: 21.6, y: 8.1 }, LIFT = 6;
const DRUMS = [                                                   // urutan layar kiri→kanan: #3, #1 (tengah, menara), #2
  { rank: 3, dx: -0.95, dy: 0.95, h: 24, band: "#2fa3b8", medal: "#c98a4b" },
  { rank: 1, dx: 0, dy: 0, h: 42, band: null, medal: "#f2c94c" },
  { rank: 2, dx: 0.95, dy: -0.95, h: 36, band: "#d9453d", medal: "#dfe6ea" },
];
const POINT = { id: "sultan", x: C.x + 0.7, y: C.y + 2.0, r: 1.8, icon: "🗼", label: "Mercusuar Sultan" };
const OBJ = { kind: "sultan", x: C.x, y: C.y, big: 210, dz: 0.9 };
const SOLIDS = DRUMS.map((d) => ({ x: C.x + d.dx, y: C.y + d.dy, r: d.rank === 1 ? 0.72 : 0.55 }));

const st = { data: { status: "unknown", entries: [] }, me: null, fetchedAt: 0, inflight: null, active: false, removed: [], panel: null, hooked: false, err: "", saving: false };
const now = () => Date.now();

// ---------- ambil data (HANYA server) ----------
async function load(force) {
  if (!loggedIn()) { deactivate(); st.data = { status: "unknown", entries: [] }; st.me = null; st.fetchedAt = 0; return st.data; }
  if (!force && Core.fresh(st.fetchedAt, now())) return st.data;
  if (force && Core.fresh(st.fetchedAt, now())) return st.data;          // batas muat-ulang 5 menit berlaku juga untuk tombol
  if (st.inflight) return st.inflight;
  st.inflight = (async () => {
    let d;
    try { d = Core.normalize(await cloud().call("sultanTop", {})); } catch (e) { d = { status: "unavailable", entries: [] }; }
    st.data = d; st.fetchedAt = now();
    if (d.status === "live") { activate(); try { st.me = Core.normalizeMe(await cloud().call("sultanMe", {})); } catch (e) { st.me = null; } }
    else { st.me = null; deactivate(); }
    st.inflight = null; render(); return st.data;
  })();
  return st.inflight;
}

// ---------- pasang / lepas dari peta Muara (idempoten) ----------
function activate() {
  const m = NW.MUARA_MAP; if (st.active || !m) return; st.active = true;
  const near = (o) => { const d = Math.hypot(o.x - C.x, o.y - C.y); return d < 2.4 || (d < (o.kind === "palm" ? 4.8 : 3.4) && o.x + o.y > C.x + C.y - 0.3); };   // tanaman di depan objek ikut dipindah agar tidak menutupinya
  for (let i = m.objects.length - 1; i >= 0; i--) { const o = m.objects[i]; if ((o.kind === "bush" || o.kind === "rock" || o.kind === "tree" || o.kind === "palm") && near(o)) st.removed.push(...m.objects.splice(i, 1)); }
  m.objects.push(OBJ); for (const s of SOLIDS) m.solids.push(s); m.points.push(POINT);
}
function deactivate() {
  const m = NW.MUARA_MAP; if (!st.active || !m) return; st.active = false;
  const rm = (arr, x) => { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); };
  rm(m.objects, OBJ); SOLIDS.forEach((s) => rm(m.solids, s)); rm(m.points, POINT);
  while (st.removed.length) m.objects.push(st.removed.pop());
  if (isOpen()) close();
}

// ---------- gambar objek 2.5D ----------
const P = (x, y, z) => NW.P(x, y, z);
function ell(c, x, y, rx, ry, fill, stroke, lw) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } }
function drum(c, x, y, h, r, K, body, shade, topc, bands, rim) {          // silinder: elips alas + badan + elips atas; bands = [{y0,y1,col}] relatif tinggi
  const b = P(x, y, LIFT), tp = P(x, y, LIFT + h), rx = r * K.rx, ry = r * K.ry;
  ell(c, b.x, b.y, rx, ry, shade);
  c.fillStyle = body; c.fillRect(b.x - rx, tp.y, rx * 2, b.y - tp.y);
  if (bands) for (const bd of bands) { c.fillStyle = bd.col; c.fillRect(b.x - rx, b.y - bd.y1 * (b.y - tp.y), rx * 2, (bd.y1 - bd.y0) * (b.y - tp.y)); }
  c.fillStyle = "rgba(15,50,64,.2)"; c.fillRect(b.x, tp.y, rx, b.y - tp.y);       // sisi kanan lebih gelap
  ell(c, b.x, b.y, rx, ry, null, "rgba(23,63,80,.5)", 1);
  c.save(); c.beginPath(); c.rect(b.x - rx - 2, b.y, rx * 2 + 4, ry + 3); c.clip(); ell(c, b.x, b.y, rx, ry, shade, "rgba(23,63,80,.55)", 1); c.restore();
  ell(c, tp.x, tp.y, rx, ry, topc, rim || "rgba(23,63,80,.6)", rim ? 2.4 : 1.2);
  return { b, tp, rx, ry };
}
// Tiga sosok nelayan dekoratif, satu per slot; tanpa avatar, UID, atau permintaan data tambahan.
// Slot tanpa pemilik digambar sebagai siluet pudar agar tidak mengaku sebagai pemenang.
function drawFisher(c, d, K, occupied, t) {
  const p = P(C.x + d.dx, C.y + d.dy, LIFT + d.h);
  const scale = d.rank === 1 ? 0.94 : 0.82;
  const x = p.x + (d.rank === 1 ? K.rx * 0.3 : 0), y = p.y + K.ry * (d.rank === 1 ? 0.35 : 0.1);
  const bob = occupied ? Math.sin(t * 1.7 + d.rank) * 0.6 : 0;
  const cloth = occupied ? ({ 1: "#e0b84c", 2: "#dfe6ea", 3: "#c98a4b" })[d.rank] : "#87979a";
  c.save(); c.translate(x, y + bob); c.scale(scale, scale);
  c.globalAlpha *= occupied ? 1 : 0.42;
  c.lineCap = "round"; c.lineJoin = "round";
  // Kaki, badan, tangan, kepala, dan caping; siluet manusia terbaca di layar HP.
  c.strokeStyle = "#233c48"; c.lineWidth = 5;
  c.beginPath(); c.moveTo(-5, -13); c.lineTo(-7, -2); c.moveTo(5, -13); c.lineTo(7, -2); c.stroke();
  c.fillStyle = cloth; c.strokeStyle = "#233c48"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-9, -32); c.lineTo(9, -32); c.lineTo(8, -14); c.lineTo(-8, -14); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = occupied ? "#b6a084" : "#87979a"; c.lineWidth = 4;
  c.beginPath(); c.moveTo(-9, -28); c.lineTo(-14, -18); c.moveTo(9, -28); c.lineTo(14, -19); c.stroke();
  ell(c, 0, -39, 7, 8, occupied ? "#d8a77f" : "#9aaba9", "#233c48", 1.4);
  c.fillStyle = occupied ? "#a37940" : "#87979a"; c.strokeStyle = "#233c48"; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-13, -45); c.lineTo(0, -55); c.lineTo(13, -45); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
function drawSultan(c, o, t, night) {
  const a = P(0, 0, 0), bx = P(1, 0, 0), K = { rx: Math.SQRT2 * Math.abs(bx.x - a.x), ry: Math.SQRT2 * Math.abs(bx.y - a.y) };
  // pulau karang kecil + bayangan
  const g = P(C.x, C.y, LIFT);
  ell(c, g.x + 8, g.y + 12, K.rx * 2.05, K.ry * 2.05, "rgba(15,35,30,.2)");
  ell(c, g.x, g.y + 3, K.rx * 1.95, K.ry * 1.95, "#8a8f86", "rgba(23,63,80,.45)", 1.2);
  ell(c, g.x, g.y, K.rx * 1.78, K.ry * 1.78, "#b8bdb0"); ell(c, g.x - 3, g.y - 3, K.rx * 1.5, K.ry * 1.5, "#d4d6c7");
  for (let i = 0; i < 6; i++) { const ang = i * 1.05 + 0.4, rr = 1.55; const p = P(C.x + Math.cos(ang) * rr, C.y + Math.sin(ang) * rr * 0.9, LIFT); ell(c, p.x, p.y, 9 + (i % 3) * 2, 5 + (i % 2), i % 2 ? "#9aa095" : "#a9ae9f", "rgba(23,63,80,.35)", 1); }
  // tiga tabung batu (belakang → depan: urut d = dx+dy)
  const order = DRUMS.slice().sort((p, q) => p.dx + p.dy - (q.dx + q.dy) || p.dy - q.dy);
  let tower = null;
  for (const d of order) {
    const main = d.rank === 1, x = C.x + d.dx, y = C.y + d.dy;
    const bands = main ? [0, 1, 2, 3].map((k) => ({ y0: 0.06 + k * 0.23, y1: 0.06 + k * 0.23 + 0.115, col: k % 2 ? "#f6f1ea" : "#d9453d" })) : [{ y0: 0.12, y1: 0.34, col: d.band }];
    const r = drum(c, x, y, d.h, main ? 0.62 : 0.5, K, "#c9d3d0", "#aeb9b6", "#e9efed", bands, main ? "#f2c94c" : "#ffffff");
    const mp = { x: r.b.x, y: r.b.y - (r.b.y - r.tp.y) * 0.5 + r.ry * 0.9 };         // medali peringkat di muka tabung
    ell(c, mp.x, mp.y, 10, 10, d.medal, "#173f50", 1.6); c.fillStyle = "#173f50"; c.font = "900 12px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(d.rank), mp.x, mp.y + 0.5);
    if (main) tower = r;
  }
  // menara mercusuar di atas tabung #1: kerucut terpancung pita merah-putih, galeri emas, ruang lentera, atap emas
  const tx = tower.tp.x, ty = tower.tp.y, th = 48, wB = tower.rx * 0.62, wT = wB * 0.62;
  const yAt = (k) => ty - th * k, wAt = (k) => wB + (wT - wB) * k;
  for (let k = 0; k < 5; k++) { const k0 = k / 5, k1 = (k + 1) / 5; c.fillStyle = k % 2 ? "#f6f1ea" : "#d9453d"; c.beginPath(); c.moveTo(tx - wAt(k0), yAt(k0)); c.lineTo(tx + wAt(k0), yAt(k0)); c.lineTo(tx + wAt(k1), yAt(k1)); c.lineTo(tx - wAt(k1), yAt(k1)); c.closePath(); c.fill(); }
  c.fillStyle = "rgba(15,50,64,.18)"; c.beginPath(); c.moveTo(tx, yAt(0)); c.lineTo(tx + wAt(0), yAt(0)); c.lineTo(tx + wAt(1), yAt(1)); c.lineTo(tx, yAt(1)); c.closePath(); c.fill();
  c.strokeStyle = "rgba(23,63,80,.55)"; c.lineWidth = 1; c.beginPath(); c.moveTo(tx - wAt(0), yAt(0)); c.lineTo(tx - wAt(1), yAt(1)); c.moveTo(tx + wAt(0), yAt(0)); c.lineTo(tx + wAt(1), yAt(1)); c.stroke();
  c.fillStyle = "#e0b84c"; c.strokeStyle = "#173f50"; c.lineWidth = 1.2; c.fillRect(tx - wT - 5, yAt(1) - 3, (wT + 5) * 2, 5); c.strokeRect(tx - wT - 5, yAt(1) - 3, (wT + 5) * 2, 5);
  const ly = yAt(1) - 3, lh = 15, lw = wT * 0.82, flick = 0.88 + Math.sin(t * 6.3) * 0.06 + Math.sin(t * 2.1) * 0.04;
  c.fillStyle = "#fff0b0"; c.fillRect(tx - lw, ly - lh, lw * 2, lh); c.strokeRect(tx - lw, ly - lh, lw * 2, lh);
  c.strokeStyle = "rgba(23,63,80,.5)"; c.beginPath(); c.moveTo(tx, ly - lh); c.lineTo(tx, ly); c.stroke();
  c.fillStyle = "#e0b84c"; c.strokeStyle = "#173f50"; c.beginPath(); c.moveTo(tx - lw - 3, ly - lh); c.lineTo(tx, ly - lh - 13); c.lineTo(tx + lw + 3, ly - lh); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#e0b84c"; c.beginPath(); c.arc(tx, ly - lh - 15, 2.4, 0, 7); c.fill();
  // cahaya: sinar lembut berputar (ringan: 2 segitiga) + kilau lentera; lebih terang saat malam
  const gl = (0.16 + 0.3 * Math.min(1, night || 0)) * flick, ang = t * 0.7, lx = tx, lyc = ly - lh / 2;
  c.save(); c.globalCompositeOperation = "lighter";
  for (let s = 0; s < 2; s++) { const dir = Math.cos(ang + s * Math.PI), vis = Math.max(0, 0.35 + 0.65 * Math.abs(dir)), L = 150 * (0.55 + 0.45 * Math.abs(dir)); c.fillStyle = `rgba(255,226,140,${gl * vis * 0.55})`; c.beginPath(); c.moveTo(lx, lyc); c.lineTo(lx + Math.sign(dir || 1) * L, lyc - 9 - 8 * vis); c.lineTo(lx + Math.sign(dir || 1) * L, lyc + 11 + 8 * vis); c.closePath(); c.fill(); }
  ell(c, lx, lyc, 26 * flick, 22 * flick, `rgba(255,214,110,${gl})`); c.restore();
  // Peringkat tetap dari respons sultanTop yang telah disaring. Figur kosong bukan pemenang.
  const occupied = new Set(st.data.status === "live" ? st.data.entries.map((e) => e.rank) : []);
  for (const d of DRUMS) drawFisher(c, d, K, occupied.has(d.rank), t);
  // dua lentera di tiang
  for (const q of [[-1.6, -0.55], [1.15, 1.75]]) {
    const b = P(C.x + q[0], C.y + q[1], LIFT), ph = q[0] * 3;
    ell(c, b.x + 2, b.y + 2, 7, 3, "rgba(15,35,30,.25)"); c.strokeStyle = "#5a3d22"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x, b.y - 46); c.stroke();
    const f = 0.85 + Math.sin(t * 7 + ph) * 0.08; ell(c, b.x, b.y - 52, 6.5, 7.5, "#ffe9a0", "#c99b2e", 1.4);
    c.save(); c.globalCompositeOperation = "lighter"; ell(c, b.x, b.y - 52, 19 * f, 19 * f, `rgba(255,208,110,${0.14 + 0.3 * Math.min(1, night || 0)})`); c.restore();
  }
}
NW.objDraw = NW.objDraw || {}; NW.objDraw.sultan = drawSultan;

// ---------- panel ----------
const SVG_X = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const SVG_HOUSE = `<svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true"><path d="M18 42l3-22h6l3 22z" fill="#f6f1ea" stroke="#173f50" stroke-width="2.2" stroke-linejoin="round"/><path d="M19.4 33h9.2M20.5 26h7" stroke="#d9453d" stroke-width="3.4"/><rect x="19" y="12" width="10" height="8" fill="#fff0b0" stroke="#173f50" stroke-width="2.2"/><path d="M17 12l7-7 7 7z" fill="#e0b84c" stroke="#173f50" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
const medalSvg = (rank, col) => `<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M9 3l7 11 7-11" fill="#1b6f8a" stroke="#173f50" stroke-width="1.6" stroke-linejoin="round"/><circle cx="16" cy="21" r="9" fill="${col}" stroke="#173f50" stroke-width="2"/><text x="16" y="25" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="12" fill="#173f50">${rank}</text></svg>`;
const MEDAL = { 1: "#f2c94c", 2: "#dfe6ea", 3: "#c98a4b" };
const isOpen = () => !!st.panel && !st.panel.classList.contains("hidden");
function build() {
  if (st.panel) return st.panel;
  const ov = document.createElement("div"); ov.id = "suOv"; ov.className = "su-ov hidden"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "suTitle");
  ov.innerHTML = `<div class="su-sheet"><button type="button" class="su-x" id="suX" aria-label="Tutup">${SVG_X}</button>
    <div class="su-head">${SVG_HOUSE}<h2 id="suTitle" tabindex="-1">SULTAN SAMUDRA</h2><p class="su-sub">Mercusuar Emas · simbol penghargaan koleksi, tanpa bonus permainan.</p></div><div id="suBody" class="su-body" aria-live="polite"></div></div>`;
  document.body.appendChild(ov); st.panel = ov;
  $("suX").addEventListener("click", close); ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  ov.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
  return ov;
}
const fmt = (n) => Number(n).toLocaleString("id-ID");
function render() {
  if (!isOpen()) return;
  const d = st.data, wait = Core.waitMs(st.fetchedAt, now());
  let h = "";
  if (st.inflight && !st.fetchedAt) h += `<div class="su-state"><i class="su-spin" aria-hidden="true"></i><span>Memuat…</span></div>`;
  else if (d.status !== "live") h += `<div class="su-state off" role="status"><b>Belum tersedia</b><span>Mercusuar Emas belum menyala. Coba lagi nanti.</span></div>`;
  else {
    const by = {}; d.entries.forEach((e) => (by[e.rank] = e));
    h += `<ol class="su-list">${[1, 2, 3].map((r) => { const e = by[r]; return e
      ? `<li class="su-row r${r}"><span class="su-medal">${medalSvg(r, MEDAL[r])}</span><span class="su-who"><b class="su-name">${esc(e.name)}</b><small>${esc(e.title)}</small></span><span class="su-score">${fmt(e.points)}<small>Poin Koleksi</small></span></li>`
      : `<li class="su-row empty"><span class="su-medal">${medalSvg(r, "#8fa3ab")}</span><span class="su-who"><b class="su-name">Belum ada Sultan ${r}</b></span></li>`; }).join("")}</ol>`;
    if (st.me) h += `<p class="su-me">Poinmu: <b>${fmt(st.me.points)}</b>${st.me.title ? ` · ${esc(st.me.title)}` : ""}</p><button type="button" class="su-btn alt" id="suAnon" aria-pressed="${st.me.anon}" ${st.saving ? "disabled" : ""}>${st.me.anon ? "Tampilkan namaku" : "Tampil sebagai Sultan Anonim"}</button>`;
    h += `<p class="su-tiers">10 Pendukung Pulau · 30 Saudagar Laut · 50 Sultan Samudra · 100 Legenda Samudra</p>`;
    h += `<button type="button" class="su-btn" id="suRef" ${wait > 0 || st.inflight ? "disabled" : ""}>${wait > 0 ? "Muat ulang dalam " + Math.ceil(wait / 60000) + " menit" : "Muat Ulang"}</button>`;
  }
  $("suBody").innerHTML = h;
  const r = $("suRef"); if (r) r.addEventListener("click", () => { load(true).then(render); render(); });
  const a = $("suAnon"); if (a) a.addEventListener("click", async () => {
    if (st.saving || !st.me) return; st.saving = true; render();
    try { const res = await cloud().call("sultanPrefs", { anon: !st.me.anon }); if (res && res.status === "ok") { st.me.anon = res.anon === true; st.fetchedAt = 0; } } catch (e) { /* tetap seperti semula */ }
    st.saving = false; if (!st.fetchedAt) await load(true); render();
  });
}
function open() {
  if (!st.active) return; build(); st.panel.classList.remove("hidden"); document.body.classList.add("su-open"); requestAnimationFrame(() => st.panel.classList.add("show")); render();
  setTimeout(() => { try { $("suTitle").focus({ preventScroll: true }); } catch (e) {} }, 40); load(false).then(render);
}
function close() { if (!st.panel) return; st.panel.classList.remove("show"); document.body.classList.remove("su-open"); setTimeout(() => { if (!st.panel.classList.contains("show")) st.panel.classList.add("hidden"); }, 220); }

// ---------- pemasangan ----------
function hook() {
  if (st.hooked || !Core || !NW.MUARA_MAP || !NW.objDraw) return; st.hooked = true;
  if (cloud() && cloud().onChange) cloud().onChange(() => { load(false); });
  load(false);
}
NW.sultan = { hook, open, close, load, render, activate, deactivate, POINT, OBJ, C, DRUMS, SOLIDS, get isOpen() { return isOpen(); }, get active() { return st.active; }, _st: st };
})();
