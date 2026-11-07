// NUSA ISLAND — PODIUM JUARA (leaderboard FISIK di dunia Muara Kampung). Objek 2.5D isometrik, 3 pemain terbaik berdiri di atas podium bertingkat,
// nama permanen + gelar di bawah tiap karakter, tombol interaksi membuka panel peringkat lengkap.
// Data HANYA dari server (cloud.call("leaderboardTop")), divalidasi NusaPodiumCore.normalize. Tanpa data → placeholder "Belum ada Juara N". Tidak menyentuh
// multiplayer/Cloud Save/ekonomi: modul ini hanya MEMBACA dan menggambar.
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const Core = window.NusaPodiumCore, $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const N = () => window.Nusa;

// ---------- letak di dunia (Muara Kampung, timur persimpangan, di depan Toko/Kedai) ----------
const C = { x: 21.4, y: 15.4 }, SP = 1.5, HALF = 0.45;                    // pusat, jarak antar-podium (sepanjang diagonal layar), setengah sisi balok
const SLOTS = [                                                           // urutan layar kiri→kanan: Juara 3 (kiri), Juara 1 (tengah, tertinggi), Juara 2 (kanan)
  { rank: 3, dx: -SP, dy: SP, h: 26, col: ["#e4b283", "#c58a55", "#a46f3f"], medal: "#c9814a" },
  { rank: 1, dx: 0, dy: 0, h: 50, col: ["#f3d56b", "#d4a52c", "#b58718"], medal: "#e0b84c" },
  { rank: 2, dx: SP, dy: -SP, h: 37, col: ["#eaf0f3", "#bcc8cf", "#9aa8b1"], medal: "#aab6bd" },
];
const POINT = { id: "podium", x: C.x + 0.2, y: C.y + 1.45, r: 2.0, icon: "🏆", label: "Podium Juara" };

const st = { cat: "catch", data: {}, fetchedAt: {}, inflight: null, status: "idle", err: "", panel: null, hooked: false, tab: "catch", lastFetchTry: 0, cool: 0 };
const cloud = () => NW.cloud;
const loggedIn = () => !!(cloud() && cloud().enabled && cloud().user);
const cur = () => st.data[st.cat] || Core.inactive(st.cat, "belum-dimuat");

// ---------- ambil data (HANYA server) ----------
const unsupported = (e) => !e || /not-found|unavailable|unimplemented|internal|permission|failed-precondition/.test(String(e.code || "")) || e.network;
async function load(cat, force) {
  cat = Core.isCat(cat) ? cat : "catch";
  if (!loggedIn()) { st.data[cat] = Core.inactive(cat, "login"); return st.data[cat]; }
  const age = Date.now() - (st.fetchedAt[cat] || 0);
  if (!force && st.data[cat] && age < 60000) return st.data[cat];
  if (st.inflight) return st.inflight;
  st.inflight = (async () => {
    try {
      const resp = await cloud().call("leaderboardTop", { category: cat, limit: Core.MAX_ENTRIES });
      st.data[cat] = Core.normalize(resp, cat); st.err = "";
    } catch (e) { st.data[cat] = Core.inactive(cat, unsupported(e) ? "server-belum-siap" : "gagal"); st.err = unsupported(e) ? "" : "gagal"; }
    st.fetchedAt[cat] = Date.now(); st.inflight = null; render(); return st.data[cat];
  })();
  return st.inflight;
}

// ---------- gambar objek 2.5D ----------
const LIFT = 6, P = (x, y, z) => NW.P(x, y, z);
function poly(c, pts, fill, stroke) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); } }
function box(c, x, y, h, col) {
  const z0 = LIFT, z1 = LIFT + h, a = (dx, dy, z) => P(x + dx, y + dy, z);
  const B = [a(-HALF, -HALF, z0), a(HALF, -HALF, z0), a(HALF, HALF, z0), a(-HALF, HALF, z0)], T = [a(-HALF, -HALF, z1), a(HALF, -HALF, z1), a(HALF, HALF, z1), a(-HALF, HALF, z1)];
  poly(c, [B[3], B[2], T[2], T[3]], col[1], "rgba(23,63,80,.55)");        // sisi depan-kiri
  poly(c, [B[2], B[1], T[1], T[2]], col[2], "rgba(23,63,80,.55)");        // sisi depan-kanan
  poly(c, T, col[0], "rgba(23,63,80,.6)");                                // atas
  c.strokeStyle = "rgba(255,246,200,.75)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(T[3].x, T[3].y + 1.5); c.lineTo(T[2].x, T[2].y + 1.5); c.lineTo(T[1].x, T[1].y + 1.5); c.stroke();   // list emas tepi atas
  return { top: P(x, y, z1), front: P(x + HALF, y + HALF, z0) };
}
const labelCache = new Map();
function plaque(name, title, rank, empty, medal) {
  const key = [name, title, rank, empty ? 1 : 0, medal].join("\u0001"); let cv = labelCache.get(key); if (cv) return cv;
  const R = 3, W = 88, H = title ? 28 : 19, g0 = document.createElement("canvas").getContext("2d");
  const fit = (txt, w, f0, f1, wt) => { for (let f = f0; f >= f1; f -= 0.5) { g0.font = `${wt} ${f}px system-ui, sans-serif`; if (g0.measureText(txt).width <= w) return { txt, f }; } const a = Array.from(txt); while (a.length > 1) { a.pop(); g0.font = `${wt} ${f1}px system-ui, sans-serif`; if (g0.measureText(a.join("") + "…").width <= w) break; } return { txt: a.join("") + "…", f: f1 }; };
  cv = document.createElement("canvas"); cv.width = W * R; cv.height = H * R; cv._w = W; cv._h = H;
  const g = cv.getContext("2d"); g.scale(R, R);
  g.fillStyle = empty ? "rgba(23,63,80,.62)" : "rgba(14,38,48,.86)"; g.strokeStyle = empty ? "rgba(190,205,210,.6)" : medal; g.lineWidth = 1.4; g.beginPath(); (g.roundRect ? g.roundRect(0.7, 0.7, W - 1.4, H - 1.4, 7) : g.rect(0.7, 0.7, W - 1.4, H - 1.4)); g.fill(); g.stroke();
  g.fillStyle = empty ? "#7f9aa3" : medal; g.beginPath(); g.arc(11, H / 2, 7.2, 0, 7); g.fill(); g.strokeStyle = "#173f50"; g.lineWidth = 1; g.stroke();
  g.fillStyle = "#173f50"; g.font = "900 9.5px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(rank), 11, H / 2 + 0.5);
  const tx = 21, tw = W - tx - 5; g.textAlign = "left";
  if (empty) { const f = fit(name, tw, 9.5, 7, 700); g.font = `700 ${f.f}px system-ui, sans-serif`; g.fillStyle = "#d3dde0"; g.fillText(f.txt, tx, title ? 9 : H / 2 + 0.5);
    if (title) { const t = fit(title, tw, 10, 7, 800); g.font = `800 ${t.f}px system-ui, sans-serif`; g.fillText(t.txt, tx, 20); } }
  else { const n = fit(name, tw, 11, 7.5, 800); g.font = `800 ${n.f}px system-ui, sans-serif`; g.fillStyle = "#fff"; g.fillText(n.txt, tx, title ? 9 : H / 2 + 0.5);
    if (title) { const t = fit(title, tw, 8, 6.5, 700); g.font = `700 ${t.f}px system-ui, sans-serif`; g.fillStyle = "#ffe296"; g.fillText(t.txt, tx, 20); } }
  if (labelCache.size > 40) labelCache.delete(labelCache.keys().next().value);
  labelCache.set(key, cv); return cv;
}
const BASE_STYLE = { shirt: "#579b8b", pants: "#2b3a44", skin: "#c68b5e", hair: "#2a1d14", hat: "caping", collar: "#fff9ec" };
// Karakter per peringkat dibuat SEKALI per kode outfit (bukan tiap frame): hemat CPU Android & animasi kostum (_fxT0) tidak ter-reset.
// Penampilan = kode outfit dari server (hanya item sah milik pemain, Tahap 2.6); tanpa avatarDraw / tanpa outfit → gaya bawaan semua pemain.
const chars = {};
function charFor(slot, entry) {
  const code = (entry && entry.outfit) || "", key = slot.rank + "|" + code, c = chars[slot.rank];
  if (c && c.key === key) return c.ch;
  let style = BASE_STYLE;
  try { if (code && NW.avatarDraw && NW.avatarDraw.styleFor) style = NW.avatarDraw.styleFor(code, BASE_STYLE) || BASE_STYLE; } catch (e) { style = BASE_STYLE; }
  const ch = { x: C.x + slot.dx, y: C.y + slot.dy, z: LIFT + slot.h, dir: 2, walk: 0, moving: false, seed: slot.rank * 1.7, rod: 0, isMe: false, style, _fxT0: undefined, _tr: [] };
  if (style.costume) style.fxT0 = performance.now() / 1000;
  chars[slot.rank] = { key, ch }; return ch;
}
function drawPodium(c, o, t) {
  const d = cur(), live = d.status === "live";
  // panggung datar (ubin) + bayangan
  const S = 1.95, ground = [P(C.x - S, C.y - S, LIFT + 0.5), P(C.x + S, C.y - S, LIFT + 0.5), P(C.x + S, C.y + S, LIFT + 0.5), P(C.x - S, C.y + S, LIFT + 0.5)];
  c.save(); c.globalAlpha = 0.9; poly(c, ground, "#6f8f96", "rgba(23,63,80,.5)"); c.restore();
  const inner = [P(C.x - S + 0.18, C.y - S + 0.18, LIFT + 0.6), P(C.x + S - 0.18, C.y - S + 0.18, LIFT + 0.6), P(C.x + S - 0.18, C.y + S - 0.18, LIFT + 0.6), P(C.x - S + 0.18, C.y + S - 0.18, LIFT + 0.6)];
  poly(c, inner, "#9db8bc", null);
  const gp = P(C.x, C.y, LIFT); c.fillStyle = "rgba(15,35,30,.22)"; c.beginPath(); c.ellipse(gp.x + 6, gp.y + 8, 110, 40, 0, 0, 7); c.fill();
  // tiang bendera di belakang Juara 1 (monumen)
  const pole = P(C.x - 0.5, C.y - 1.5, LIFT), top = pole.y - 118;
  c.fillStyle = "rgba(15,35,30,.18)"; c.beginPath(); c.ellipse(pole.x + 3, pole.y + 1, 9, 3, 0, 0, 7); c.fill();
  c.strokeStyle = "#6b4527"; c.lineWidth = 3.4; c.lineCap = "round"; c.beginPath(); c.moveTo(pole.x, pole.y); c.lineTo(pole.x, top); c.stroke();
  c.fillStyle = "#e0b84c"; c.beginPath(); c.arc(pole.x, top - 1, 3.4, 0, 7); c.fill(); c.strokeStyle = "#173f50"; c.lineWidth = 1; c.stroke();
  const sw = Math.sin(t * 2.2) * 3, fw = 34; c.fillStyle = "#1b6f8a"; c.beginPath(); c.moveTo(pole.x, top + 4); c.quadraticCurveTo(pole.x + fw * 0.5, top + 2 + sw, pole.x + fw, top + 8 + sw * 1.2); c.lineTo(pole.x + fw - 2, top + 26 + sw * 1.2); c.quadraticCurveTo(pole.x + fw * 0.5, top + 24 + sw, pole.x, top + 26); c.closePath(); c.fill(); c.strokeStyle = "#173f50"; c.stroke();
  c.fillStyle = "#f3d56b"; c.beginPath(); const sx = pole.x + fw * 0.46, sy = top + 15 + sw * 0.6; for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.6 : 6.2, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } c.closePath(); c.fill();
  // balok podium + karakter + papan nama
  for (const sl of SLOTS) {
    const e = live ? d.podium[sl.rank - 1] : null, bx = C.x + sl.dx, by = C.y + sl.dy, g = box(c, bx, by, sl.h, sl.col);
    if (e) {
      const ch = charFor(sl, e);
      NW.drawCharacter(c, ch, t);
      if (sl.rank === 1) { const cp = P(bx, by, LIFT + sl.h + 38 + Math.sin(t * 2) * 1.5); c.fillStyle = "#f3d56b"; c.strokeStyle = "#173f50"; c.lineWidth = 1; c.beginPath(); c.moveTo(cp.x - 7, cp.y + 5); c.lineTo(cp.x - 7, cp.y - 3); c.lineTo(cp.x - 3.5, cp.y + 1); c.lineTo(cp.x, cp.y - 6); c.lineTo(cp.x + 3.5, cp.y + 1); c.lineTo(cp.x + 7, cp.y - 3); c.lineTo(cp.x + 7, cp.y + 5); c.closePath(); c.fill(); c.stroke(); }
    } else {                                                                // tempat kosong: siluet samar + tanda tanya, tanpa karakter palsu
      const hp = P(bx, by, LIFT + sl.h + 17); c.save(); c.globalAlpha = 0.28 + Math.sin(t * 1.6 + sl.rank) * 0.06; c.fillStyle = "#173f50"; c.beginPath(); c.arc(hp.x, hp.y - 12, 6.5, 0, 7); c.fill(); c.beginPath(); c.moveTo(hp.x - 9, hp.y + 11); c.quadraticCurveTo(hp.x, hp.y - 10, hp.x + 9, hp.y + 11); c.closePath(); c.fill(); c.restore();
    }
  }
  // kilau di Juara 1 (ringan: 3 titik)
  if (live && d.podium[0]) for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1, sp = P(C.x + Math.sin(i * 2.1) * 0.5, C.y + Math.cos(i * 1.7) * 0.4, LIFT + 52 + k * 36); c.fillStyle = `rgba(255,236,150,${0.85 * (1 - k)})`; c.beginPath(); c.arc(sp.x, sp.y, 1.8, 0, 7); c.fill(); }
}

// Papan nama digambar di lapisan ATAS (drawOver) supaya tidak tertutup atap bangunan; selalu terbaca.
function drawOver(c, t) {
  const d = cur(), live = d.status === "live";
  for (const sl of SLOTS) {
    const e = live ? d.podium[sl.rank - 1] : null, empty = !e, p = P(C.x + sl.dx + HALF * 0.5, C.y + sl.dy + HALF * 0.5, LIFT + 2);
    const ph = Core.placeholder(sl.rank), cut = ph.indexOf("Juara");    // kosong: "Belum ada" / "Juara N" (dua baris, tetap terbaca di layar kecil)
    const cv = empty ? plaque(ph.slice(0, cut).trim(), ph.slice(cut), sl.rank, true, sl.medal) : plaque(e.name, e.title, sl.rank, false, sl.medal);
    c.drawImage(cv, p.x - cv._w / 2 + 4, p.y + 4, cv._w, cv._h);
  }
}

// ---------- ikon SVG (tanpa emoji) untuk panel ----------
const SVG_X = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const SVG_CUP = `<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true"><path d="M14 8h20v10a10 10 0 0 1-20 0z" fill="#e0b84c" stroke="#173f50" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 11H7c0 7 3 10 8 11M34 11h7c0 7-3 10-8 11" fill="none" stroke="#173f50" stroke-width="2.2" stroke-linecap="round"/><path d="M24 28v7M17 41h14l-2-6H19z" fill="#c99b2e" stroke="#173f50" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
const medalSvg = (rank, col) => `<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M9 3l7 11 7-11" fill="#1b6f8a" stroke="#173f50" stroke-width="1.6" stroke-linejoin="round"/><circle cx="16" cy="21" r="9" fill="${col}" stroke="#173f50" stroke-width="2"/><text x="16" y="25" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="12" fill="#173f50">${rank}</text></svg>`;
const MEDAL = { 1: "#e0b84c", 2: "#aab6bd", 3: "#c9814a" };

// ---------- panel ----------
const fmt = (n) => Number(n).toLocaleString("id-ID");
function ago(ms) { const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); return s < 60 ? "baru saja" : s < 3600 ? Math.round(s / 60) + " menit lalu" : s < 86400 ? Math.round(s / 3600) + " jam lalu" : Math.round(s / 86400) + " hari lalu"; }
function build() {
  if (st.panel) return st.panel;
  const ov = document.createElement("div"); ov.id = "lbOv"; ov.className = "lb-ov hidden"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "lbTitle");
  ov.innerHTML = `<div class="lb-sheet"><button type="button" class="lb-x" id="lbX" aria-label="Tutup">${SVG_X}</button>
    <div class="lb-head">${SVG_CUP}<h2 id="lbTitle" tabindex="-1">PODIUM JUARA NUSA</h2><p class="lb-sub">Peringkat dihitung server dari statistik terverifikasi, bukan dari angka di browser.</p></div>
    <div class="lb-tabs" role="tablist" id="lbTabs"></div><div id="lbBody" class="lb-body" aria-live="polite"></div></div>`;
  document.body.appendChild(ov); st.panel = ov;
  $("lbX").addEventListener("click", close); ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  ov.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
  return ov;
}
const isOpen = () => !!st.panel && !st.panel.classList.contains("hidden");
function render() {
  if (!isOpen()) return;
  const tabs = Object.values(Core.CATEGORIES).map((k) => `<button type="button" role="tab" class="lb-tab ${k.id === st.tab ? "on" : ""}" data-tab="${k.id}" aria-selected="${k.id === st.tab}">${esc(k.label)}</button>`).join("");
  $("lbTabs").innerHTML = tabs; $("lbTabs").querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { st.tab = b.dataset.tab; st.cat = st.tab; render(); load(st.tab, false); }));
  const k = Core.CATEGORIES[st.tab], d = st.data[st.tab], busy = !!st.inflight && !d;
  let h = `<p class="lb-desc">${esc(k.full)} · ${esc(k.desc)}</p>`;
  if (busy) h += `<div class="lb-state"><i class="lb-spin" aria-hidden="true"></i><span>Memuat peringkat…</span></div>`;
  else if (!d || d.status !== "live") {
    const why = !loggedIn() ? "Masuk dengan akun Google untuk melihat peringkat." : d && d.reason === "gagal" ? "Peringkat belum bisa dimuat. Periksa internet lalu coba lagi." : "Papan peringkat belum aktif. Podium akan terisi setelah server menghitung statistik pemain.";
    h += `<div class="lb-state off" role="status"><b>Belum ada peringkat</b><span>${esc(why)}</span></div>
      <ol class="lb-list ph">${[1, 2, 3].map((r) => `<li class="lb-row empty"><span class="lb-medal">${medalSvg(r, "#8fa3ab")}</span><span class="lb-name">${esc(Core.placeholder(r))}</span></li>`).join("")}</ol>`;
  } else if (!d.entries.length) {
    h += `<div class="lb-state off"><b>Belum ada peringkat</b><span>Belum ada pemain di papan ini. Jadilah yang pertama!</span></div><ol class="lb-list ph">${[1, 2, 3].map((r) => `<li class="lb-row empty"><span class="lb-medal">${medalSvg(r, "#8fa3ab")}</span><span class="lb-name">${esc(Core.placeholder(r))}</span></li>`).join("")}</ol>`;
  } else {
    h += `<ol class="lb-list">${d.entries.map((e) => `<li class="lb-row r${Math.min(e.rank, 4)}">${e.rank <= 3 ? `<span class="lb-medal">${medalSvg(e.rank, MEDAL[e.rank])}</span>` : `<span class="lb-rank">${e.rank}</span>`}<span class="lb-who"><b class="lb-name">${esc(e.name)}</b>${e.rank <= 3 && e.title ? `<small>${esc(e.title)}</small>` : ""}</span><span class="lb-score">${fmt(e.score)}<small>${esc(k.unit)}</small></span></li>`).join("")}</ol>`;
    if (d.me) h += `<p class="lb-me">Peringkatmu: <b>#${fmt(d.me.rank)}</b> · ${fmt(d.me.score)} ${esc(k.unit)}</p>`;
    h += `<p class="lb-upd">Diperbarui ${esc(ago(d.updatedAt))}</p>`;
  }
  h += `<button type="button" class="lb-btn" id="lbRef" ${Date.now() < st.cool || st.inflight ? "disabled" : ""}>Muat Ulang</button>`;
  $("lbBody").innerHTML = h; $("lbRef").addEventListener("click", () => { st.cool = Date.now() + 15000; load(st.tab, true); render(); setTimeout(render, 15100); });
}
function open() {
  build(); st.tab = st.tab || "catch"; st.cat = st.tab; st.panel.classList.remove("hidden"); document.body.classList.add("lb-open"); requestAnimationFrame(() => st.panel.classList.add("show")); render();
  setTimeout(() => { try { $("lbTitle").focus({ preventScroll: true }); } catch (e) {} }, 40); load(st.tab, false).then(render);
}
function close() { if (!st.panel) return; st.panel.classList.remove("show"); document.body.classList.remove("lb-open"); setTimeout(() => { if (!st.panel.classList.contains("show")) st.panel.classList.add("hidden"); }, 220); }

// ---------- pemasangan ke dunia (Muara) ----------
function hook() {
  if (st.hooked || !Core || !NW.MUARA_MAP || !NW.objDraw) return; st.hooked = true;
  const m = NW.MUARA_MAP;
  const near = (o) => SLOTS.some((s) => Math.hypot(o.x - (C.x + s.dx), o.y - (C.y + s.dy)) < 1.35) || Math.hypot(o.x - C.x, o.y - C.y) < 2.3;
  for (let i = m.objects.length - 1; i >= 0; i--) { const o = m.objects[i]; if ((o.kind === "bush" || o.kind === "tree" || o.kind === "rock") && near(o)) m.objects.splice(i, 1); }   // beri ruang (dekorasi tanaman saja)
  for (let i = m.solids.length - 1; i >= 0; i--) { const s = m.solids[i]; if (s.r !== undefined && s.x !== undefined && near(s) && s.r > 0.2 && !m.objects.some((o) => o.x === s.x && o.y === s.y)) m.solids.splice(i, 1); }
  m.objects.push({ kind: "podium", x: C.x, y: C.y, big: 190, dz: 0.9 });
  for (const s of SLOTS) m.solids.push({ x: C.x + s.dx, y: C.y + s.dy, r: 0.52 });
  m.points.push(POINT);
  NW.objDraw.podium = drawPodium;
  setInterval(() => { if (document.hidden || !loggedIn()) return; const P0 = N() && NW.world && NW.world.player; if (P0 && Math.hypot(P0.x - C.x, P0.y - C.y) < 14 && NW.areas && NW.areas.cur && NW.areas.cur.id === "muara") load("catch", false); }, 20000);   // hanya saat pemain di dekat podium
  if (cloud() && cloud().onChange) cloud().onChange(() => { if (loggedIn() && !st.data.catch) load("catch", false); });
}
NW.podium = { hook, drawOver, _chars: chars, open, close, load, render, POINT, SLOTS, C, get isOpen() { return isOpen(); }, _st: st };
})();
