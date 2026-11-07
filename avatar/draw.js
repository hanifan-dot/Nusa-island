// =========================================================
//  NUSA ISLAND — RENDER AVATAR (kosmetik murni): pakaian, topi, aksesori, kostum hewan/eksklusif, dan efek visual.
//  Semua digambar prosedural di Canvas (tanpa gambar/aset jaringan). Dipanggil dari world/draw.js drawCharacter lewat hook kecil.
//  Efek punya tingkat kualitas (0 mati, 1 hemat, 2 penuh) + pembatas keramaian; TIDAK ada kilatan cepat (maks. satu denyut lembut per ~2 dtk).
//  Kostum hanya mengganti GAMBAR: tidak menyentuh tabrakan, joystick, kamera, memancing, atau gerak pemain lain.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const F = window.NusaFashionCore;
if (!F) return;
const sh = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };

// ---------- Pengaturan efek ----------
let level = 2;
try {
  const v = localStorage.getItem("nusa_fx");
  if (v === "0" || v === "1" || v === "2") level = +v;
  else if ((window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) level = 0;
  else if ((window.matchMedia && matchMedia("(pointer: coarse)").matches) || Math.min(screen.width, screen.height) < 700) level = 1;
} catch (e) {}
const setLevel = (n) => { level = n; try { localStorage.setItem("nusa_fx", String(n)); } catch (e) {} };
// Pembatas keramaian: per bingkai, hanya 3 karakter pertama yang boleh memakai efek partikel; pemain lokal selalu diprioritaskan.
let frameT = -1, fxUsed = 0;
const allow = (ch, t) => { if (t !== frameT) { frameT = t; fxUsed = 0; } if (ch.isMe) return level; if (fxUsed >= 3) return 0; fxUsed++; return Math.min(level, 1); };
let preview = 0; // >t: paksa efek penuh (tombol ✨ LIHAT EFEK)
const showFx = (secs) => { preview = performance.now() / 1000 + secs; };

// ---------- Gaya dari kode penampilan ----------
// Kode kosong/bawaan → gaya dasar TIDAK diubah (pemain lama tetap tampil persis seperti dulu).
function styleFor(code, base) {
  if (!code || code === F.DEFAULT_CODE) return base;
  const r = F.resolve(code), st = Object.assign({}, base);
  st.shirt = r.t.color; st.pants = r.p.color; st.skin = r.skin; st.hair = r.hair;
  st.topId = r.t.it.id; st.pantsId = r.p.it.id; st.code = code;
  if (r.h) { st.hat = "none"; st.head = { id: r.h.it.id, color: r.h.color }; }
  if (r.a) st.acc = { id: r.a.it.id, color: r.a.color };
  if (r.c) { st.hat = "none"; st.costume = { id: r.c.it.id, color: r.c.color, fx: r.c.it.fx }; }
  return st;
}

// ---------- Baju / jaket (digambar setelah badan dasar) ----------
function drawTop(c, st, y0, fx, back, t) {
  const id = st.topId; if (!id || id === "t_polos") return;
  const col = st.shirt, body = () => { c.beginPath(); c.moveTo(-7, y0 - 9); c.lineTo(-7.5, y0 - 21); c.quadraticCurveTo(0, y0 - 25, 7.5, y0 - 21); c.lineTo(7, y0 - 9); c.closePath(); };
  if (id === "t_street") { if (!back) { c.fillStyle = "#f4f0e2"; c.fillRect(-3.5, y0 - 18, 7, 2.2); c.fillRect(-3.5, y0 - 14, 7, 2.2); } else { c.fillStyle = "#f4f0e2"; c.fillRect(-5, y0 - 18, 10, 1.6); } }
  else if (id === "t_basic") { c.fillStyle = sh(col, -0.2); c.fillRect(-7, y0 - 21, 14, 1.6); }
  else if (id === "t_pantai") { c.save(); body(); c.clip(); c.fillStyle = "#fff2a8"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-5 + (i % 3) * 5, y0 - 19 + Math.floor(i / 3) * 6, 1.5, 0, 7); c.fill(); } c.restore(); if (!back) { c.strokeStyle = sh(col, -0.3); c.lineWidth = 1; c.beginPath(); c.moveTo(0, y0 - 22); c.lineTo(0, y0 - 9); c.stroke(); } }
  else if (id === "t_nelayan") { c.save(); body(); c.clip(); c.fillStyle = "#d8e24a"; c.fillRect(-8, y0 - 15, 16, 2); c.fillRect(-8, y0 - 12, 16, 1); c.restore(); if (!back) { c.strokeStyle = "#444"; c.lineWidth = 1; c.beginPath(); c.moveTo(0, y0 - 23); c.lineTo(0, y0 - 9); c.stroke(); } c.fillStyle = sh(col, -0.25); c.fillRect(-8, y0 - 23, 16, 2.4); }
  else if (id === "t_hoodie") { c.fillStyle = sh(col, 0.12); c.beginPath(); c.ellipse(0, y0 - 23, 8.5, 3.4, 0, 0, 7); c.fill(); if (!back) { c.fillStyle = "#f2f2f2"; c.fillRect(-3, y0 - 21, 0.9, 5); c.fillRect(2.1, y0 - 21, 0.9, 5); c.fillStyle = sh(col, 0.1); c.fillRect(-4, y0 - 14, 8, 4); } }
  else if (id === "t_cyber") { c.save(); body(); c.clip(); const g = 0.7 + 0.3 * Math.sin(t * 2); c.strokeStyle = "#7df9ff"; c.globalAlpha = g; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-7, y0 - 19); c.lineTo(0, y0 - 14); c.lineTo(7, y0 - 19); c.moveTo(0, y0 - 14); c.lineTo(0, y0 - 9); c.stroke(); c.globalAlpha = 1; c.restore(); }
  else if (id === "t_sultan") { c.fillStyle = "#d9b13a"; c.fillRect(-7.5, y0 - 22, 15, 1.8); if (!back) { c.fillRect(-0.7, y0 - 22, 1.4, 13); c.beginPath(); for (let i = 0; i < 3; i++) c.arc(-3, y0 - 19 + i * 3.4, 0.9, 0, 7), c.arc(3, y0 - 19 + i * 3.4, 0.9, 0, 7); c.fill(); } else { c.fillRect(-4, y0 - 17, 8, 1.4); } }
}
function drawPants(c, st, y0, fx, t) {   // detail celana (dipanggil dari hook kaki bila perlu) — saat ini hanya warna; detail ringan lewat tepi
  // kantong cargo/tactical/emas digambar di atas paha oleh drawTop-hook agar tidak mengubah geometri kaki
}
function drawPantsDetail(c, st, y0) {
  const id = st.pantsId; if (!id || id === "p_awal") return;
  if (id === "p_cargo" || id === "p_tactical") { c.fillStyle = sh(st.pants, -0.22); c.fillRect(-7, y0 - 8.5, 5, 3.2); c.fillRect(2, y0 - 8.5, 5, 3.2); if (id === "p_tactical") { c.fillStyle = "#1b1b1f"; c.fillRect(-7, y0 - 11, 14, 1.6); } }
  else if (id === "p_jeans") { c.fillStyle = sh(st.pants, -0.3); c.fillRect(-7, y0 - 10.4, 14, 1.2); }
  else if (id === "p_emas") { c.fillStyle = "#fff0a8"; c.fillRect(-7, y0 - 10.4, 14, 1.4); c.fillRect(-0.5, y0 - 9, 1, 8); }
}

// ---------- Topi & aksesori ----------
function drawHead(c, st, hy, fx, back, t, lv) {
  const h = st.head; if (!h) return; const col = h.color;
  if (h.id === "h_kapten") { c.fillStyle = col; c.beginPath(); c.arc(0, hy - 3, 7.9, Math.PI, 0); c.fill(); c.fillStyle = "#f2efe6"; c.fillRect(-8, hy - 4.6, 16, 2.4); c.fillStyle = "#1f2a44"; c.fillRect(back ? -fx * 2 - 5 : fx * 3 - 5, hy - 3.2, 10 + Math.abs(fx) * 3, 2.2); c.fillStyle = "#e0b23a"; c.beginPath(); c.arc(0, hy - 8, 1.8, 0, 7); c.fill(); }
  else if (h.id === "h_koboi") { c.fillStyle = col; c.beginPath(); c.ellipse(0, hy - 5.5, 13.5, 3.4, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(-6.5, hy - 5.5); c.quadraticCurveTo(-7, hy - 14, -2.5, hy - 12); c.quadraticCurveTo(0, hy - 10.5, 2.5, hy - 12); c.quadraticCurveTo(7, hy - 14, 6.5, hy - 5.5); c.closePath(); c.fill(); c.fillStyle = sh(col, -0.35); c.fillRect(-6.6, hy - 8, 13.2, 1.8); }
  else if (h.id === "h_mahkota") {
    const g = lv ? 0.35 + 0.25 * Math.sin(t * 1.6) : 0; if (g) { c.fillStyle = `rgba(255,214,90,${g * 0.5})`; c.beginPath(); c.arc(0, hy - 9, 12, 0, 7); c.fill(); }
    c.fillStyle = "#f0c53a"; c.beginPath(); c.moveTo(-7, hy - 5.5); c.lineTo(-7.6, hy - 14); c.lineTo(-3.6, hy - 9.5); c.lineTo(0, hy - 16); c.lineTo(3.6, hy - 9.5); c.lineTo(7.6, hy - 14); c.lineTo(7, hy - 5.5); c.closePath(); c.fill();
    c.fillStyle = "#d83a4a"; c.beginPath(); c.arc(0, hy - 8, 1.5, 0, 7); c.fill(); c.fillStyle = sh("#f0c53a", -0.25); c.fillRect(-7, hy - 6.4, 14, 1.4);
    if (lv >= 2) for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; c.fillStyle = `rgba(255,236,150,${0.9 * (1 - k)})`; c.beginPath(); c.arc(-6 + i * 6 + Math.sin(t + i) * 1.5, hy - 12 - k * 12, 1.1, 0, 7); c.fill(); }
  } else if (h.id === "h_robot") {
    c.fillStyle = col; c.beginPath(); c.arc(0, hy - 0.5, 9.4, 0, 7); c.fill(); c.fillStyle = sh(col, -0.25); c.fillRect(-9.4, hy + 3, 18.8, 2);
    if (!back) { const led = 0.75 + (lv ? 0.25 * Math.sin(t * 2.4) : 0); c.fillStyle = "#10151c"; c.fillRect(-7 + fx * 1.5, hy - 3.2, 14, 5.6); c.fillStyle = `rgba(80,240,255,${led})`; c.fillRect(-5.8 + fx * 1.5, hy - 1.6, 4, 2.4); c.fillRect(1.8 + fx * 1.5, hy - 1.6, 4, 2.4); }
    c.strokeStyle = sh(col, -0.3); c.lineWidth = 1; c.beginPath(); c.moveTo(0, hy - 10); c.lineTo(0, hy - 14); c.stroke(); c.fillStyle = `rgba(255,80,80,${lv ? 0.6 + 0.4 * Math.sin(t * 3) : 0.8})`; c.beginPath(); c.arc(0, hy - 14.5, 1.3, 0, 7); c.fill();
  }
}
function drawWings(c, st, y0, fx, back, moving, t, lv, front) {
  const a = st.acc; if (!a || a.id !== "a_sayap") return; if (front !== back) return;          // di belakang badan saat menghadap kamera; di depan saat membelakangi
  const flap = moving ? Math.sin(t * 9) * 0.35 : Math.sin(t * 1.8) * 0.08, wing = (s) => { c.save(); c.translate(s * 5, y0 - 20); c.rotate(s * (0.45 + flap)); c.fillStyle = a.color; c.strokeStyle = "rgba(200,190,150,.9)"; c.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(s * (6 + i * 3.2), -3 + i * 3.2, 9 - i * 1.2, 3.2, s * 0.35, 0, 7); c.fill(); c.stroke(); } c.restore(); };
  wing(-1); wing(1);
}

// ---------- Efek ambient (kosmetik) ----------
function ring(c, t0, t, y, col) { const k = (t - t0); if (k < 0 || k > 1.4) return; c.strokeStyle = col.replace("A", String((1 - k / 1.4) * 0.8)); c.lineWidth = 2; c.beginPath(); c.ellipse(0, y, 8 + k * 26, (8 + k * 26) * 0.4, 0, 0, 7); c.stroke(); }
function bolt(c, t, y0, col, n) {
  const cyc = t % 3.6, on = cyc < 0.6; if (!on) return; const k = cyc / 0.6, a = Math.sin(k * Math.PI);
  c.strokeStyle = col; c.globalAlpha = 0.85 * a; c.lineWidth = 1.6; c.lineJoin = "round";
  for (let b = 0; b < n; b++) { const sx = (b ? 1 : -1) * (13 + b * 3), seed = Math.floor(t / 3.6) * 7 + b * 3; c.beginPath(); let x = sx, y = y0 - 52; c.moveTo(x, y); for (let i = 1; i <= 5; i++) { x = sx + Math.sin(seed * 12.9 + i * 78.2) * 4; y = y0 - 52 + i * 11; c.lineTo(x, y); } c.stroke(); }
  c.globalAlpha = 1;
}
function sparkles(c, t, y0, col, n, spread, up) { for (let i = 0; i < n; i++) { const k = (t * 0.45 + i / n) % 1; c.fillStyle = col.replace("A", String(0.9 * (1 - k))); c.beginPath(); c.arc(Math.sin(i * 7.3 + t * 0.7) * spread, y0 - 8 - k * up, 1.2, 0, 7); c.fill(); } }
function stars(c, t, y0, n, r) { for (let i = 0; i < n; i++) { const a = t * 1.3 + (i / n) * 6.283, x = Math.cos(a) * r, y = y0 - 22 + Math.sin(a) * r * 0.45, z = Math.sin(a) > 0 ? 1 : 0.5; c.fillStyle = `rgba(${i % 2 ? "255,236,150" : "190,170,255"},${0.95 * z})`; c.beginPath(); c.arc(x, y, 1.6 * z, 0, 7); c.fill(); } }
function trail(c, ch, t, y0, kind, lv, NWP) {   // jejak di tanah (tersimpan di ch._tr; ringan, maks 6 titik)
  const tr = ch._tr = ch._tr || []; const last = tr[tr.length - 1];
  if (ch.moving && (!last || Math.hypot(ch.x - last.x, ch.y - last.y) > 0.9)) { tr.push({ x: ch.x, y: ch.y, t }); if (tr.length > (lv >= 2 ? 6 : 3)) tr.shift(); }
  if (!NWP) return;
  const b = NWP(ch.x, ch.y, ch.z !== undefined ? ch.z : 0);
  for (const p of tr) { const k = (t - p.t) / 3; if (k > 1) continue; const q = NWP(p.x, p.y, ch.z !== undefined ? ch.z : 0); const dx = q.x - b.x, dy = q.y - b.y - (ch.y0 || 0) * 0;
    c.save(); c.translate(dx, dy); c.globalAlpha = 0.6 * (1 - k); if (kind === "jejak") { c.fillStyle = "rgba(60,50,30,.8)"; c.beginPath(); c.ellipse(-3, 0, 2.6, 1.3, 0, 0, 7); c.ellipse(3, 0, 2.6, 1.3, 0, 0, 7); c.fill(); } else if (kind === "galaksi") { c.fillStyle = "rgba(190,160,255,.9)"; c.beginPath(); c.arc(0, -1, 2 + k * 3, 0, 7); c.fill(); } else { c.fillStyle = "rgba(160,215,240,.9)"; c.beginPath(); c.arc(0, -1, 1.4 + k * 3, 0, 7); c.fill(); } c.restore(); }
}

// ---------- Kostum ----------
function eyes(c, hy, fx, back, kind, t) { if (back) return; const ex = fx * 2.6; c.fillStyle = "#1c1410";
  if (kind === "santai") { c.strokeStyle = "#1c1410"; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-4.6 + ex, hy); c.lineTo(-1.8 + ex, hy); c.moveTo(1.8 + ex, hy); c.lineTo(4.6 + ex, hy); c.stroke(); return; }
  c.beginPath(); c.arc(-3 + ex, hy, 1.4, 0, 7); c.arc(3 + ex, hy, 1.4, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(-2.6 + ex, hy - 0.5, 0.5, 0, 7); c.arc(3.4 + ex, hy - 0.5, 0.5, 0, 7); c.fill(); }
function drawCostume(c, ch, t, y0, fx, fy, back, side, moving, ph, lv) {
  const st = ch.style, K = st.costume, id = K.id, col = K.color, ex = fx * 2.6;
  const trexStomp = id === "c_trex" && moving ? Math.abs(Math.sin(ph)) * 1.6 : 0, yy = y0 - trexStomp;
  const swing = moving ? Math.sin(ph) * 3.4 : 0, sp = 3.4 * (1 - 0.5 * Math.abs(fx));
  const ghost = id === "c_hantu", dark = id === "c_galaksi";
  // aura di belakang
  if (lv) { if (K.fx === "aura_emas") { const g = 0.22 + 0.1 * Math.sin(t * 1.5); c.fillStyle = `rgba(255,205,70,${g})`; c.beginPath(); c.ellipse(0, yy - 20, 17, 25, 0, 0, 7); c.fill(); }
    else if (K.fx === "aura_ungu") { const g = 0.22 + 0.1 * Math.sin(t * 1.3); c.fillStyle = `rgba(180,90,255,${g})`; c.beginPath(); c.ellipse(0, yy - 20, 17, 25, 0, 0, 7); c.fill(); }
    else if (K.fx === "galaksi") { c.fillStyle = "rgba(90,70,200,.22)"; c.beginPath(); c.ellipse(0, yy - 20, 19, 27, 0, 0, 7); c.fill(); } }
  if (ghost) c.globalAlpha *= 0.78;
  // sayap naga (di belakang)
  if (id === "c_naga") { const fl = Math.sin(t * (moving ? 9 : 2.2)) * (moving ? 0.4 : 0.12); for (const s of [-1, 1]) { c.save(); c.translate(s * 6, yy - 24); c.rotate(s * (0.5 + fl)); c.fillStyle = "#1c3066"; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 18, -14, s * 26, 2); c.quadraticCurveTo(s * 18, 0, s * 20, 8); c.quadraticCurveTo(s * 10, 4, 0, 8); c.closePath(); c.fill(); c.strokeStyle = "#ffd24a"; c.lineWidth = 0.9; c.stroke(); c.restore(); } }
  // ekor
  const tailX = -fx * 9, wag = Math.sin(t * (moving ? 7 : 2.4)) * 3;
  if (!ghost && !dark) {
    if (id === "c_kucing") { c.strokeStyle = col; c.lineWidth = 3.2; c.lineCap = "round"; c.beginPath(); c.moveTo(tailX * 0.8, yy - 10); c.quadraticCurveTo(tailX * 1.7 + wag, yy - 16, tailX * 1.2 + wag * 1.6, yy - 27); c.stroke(); c.strokeStyle = "#fff4e0"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(tailX * 1.2 + wag * 1.5, yy - 25); c.lineTo(tailX * 1.2 + wag * 1.6, yy - 27); c.stroke(); }
    else if (id === "c_hiu") { c.fillStyle = sh(col, -0.15); c.beginPath(); c.moveTo(tailX, yy - 8); c.lineTo(tailX * 1.9 + wag, yy - 20); c.lineTo(tailX * 1.7 + wag, yy - 7); c.closePath(); c.fill(); }
    else if (id === "c_trex" || id === "c_naga") { c.fillStyle = sh(col, -0.1); c.beginPath(); c.moveTo(tailX * 0.5, yy - 12); c.quadraticCurveTo(tailX * 2.1 + wag, yy - 11, tailX * 2.6 + wag * 1.4, yy - 4); c.quadraticCurveTo(tailX * 1.5, yy - 4, tailX * 0.5, yy - 5); c.closePath(); c.fill(); }
  }
  // kaki
  if (!ghost) { const leg = (x, lift) => { c.fillStyle = id === "c_robot" ? "#6d7783" : sh(col, -0.2); c.fillRect(x - 2.6, yy - 7 - lift, 5.2, 7); c.fillStyle = dark ? "#171233" : "rgba(30,20,10,.55)"; c.fillRect(x - 3, yy - 1.6 - lift, 6, 1.8); };
    const a1 = -sp + fx * swing, a2 = sp - fx * swing; if (fx >= 0) { leg(a1, moving ? Math.max(0, Math.sin(ph)) : 0); leg(a2, moving ? Math.max(0, -Math.sin(ph)) : 0); } else { leg(a2, moving ? Math.max(0, -Math.sin(ph)) : 0); leg(a1, moving ? Math.max(0, Math.sin(ph)) : 0); } }
  // badan
  const wide = id === "c_capy" ? 11.5 : id === "c_trex" ? 10 : 9.5, bodyCol = dark ? "#241a5c" : ghost ? col : col, by = yy - 17;
  const breath = id === "c_capy" ? Math.sin(t * 1.4) * 0.5 : 0;
  c.fillStyle = bodyCol;
  if (id === "c_robot") { c.fillRect(-8.5, yy - 27, 17, 20); c.fillStyle = sh(col, -0.2); c.fillRect(-8.5, yy - 12, 17, 2.2); if (!back) { const p = lv ? 0.5 + 0.5 * Math.sin(t * 2.2) : 0.8; c.fillStyle = "#12171d"; c.fillRect(-4.5, yy - 24, 9, 8); c.fillStyle = `rgba(90,230,255,${0.45 + 0.4 * p})`; c.beginPath(); c.arc(0, yy - 20, 2.6, 0, 7); c.fill(); } }
  else if (ghost) { c.beginPath(); c.moveTo(-9, yy - 4); c.quadraticCurveTo(-11, yy - 26, 0, yy - 28); c.quadraticCurveTo(11, yy - 26, 9, yy - 4); for (let i = 4; i >= -4; i -= 2) c.lineTo(i * 2.2, yy - 4 + (i % 4 ? 3.2 : -0.6) + Math.sin(t * 3 + i) * 0.8); c.closePath(); c.fill(); }
  else { c.beginPath(); c.ellipse(0, by + breath, wide, 11, 0, 0, 7); c.fill();
    if (!back) { c.fillStyle = id === "c_kucing" ? "#fff0d8" : id === "c_hiu" ? "#eef6fb" : id === "c_trex" ? "#cfe8a8" : id === "c_naga" ? "#e0b23a" : id === "c_capy" ? sh(col, 0.25) : id === "c_raja" ? "#fff4c4" : "rgba(255,255,255,0)"; c.beginPath(); c.ellipse(ex * 0.6, by + 2 + breath, wide * 0.55, 7, 0, 0, 7); c.fill(); } }
  if (id === "c_kucing") { c.strokeStyle = sh(col, -0.3); c.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 4, yy - 26.5); c.lineTo(i * 4, yy - 22.5); c.stroke(); } }
  if (id === "c_raja") { c.fillStyle = "#b8231f"; c.beginPath(); c.moveTo(-9.5, yy - 25); c.lineTo(-11, yy - 5); c.lineTo(11, yy - 5); c.lineTo(9.5, yy - 25); c.closePath(); c.globalAlpha *= back ? 1 : 0.0; c.fill(); c.globalAlpha = ghost ? 0.78 : 1; c.fillStyle = "#f0c53a"; c.fillRect(-9.5, yy - 22, 19, 2); c.fillRect(-9.5, yy - 12, 19, 2); }
  if (dark) { c.fillStyle = "#cdbcff"; for (let i = 0; i < 9; i++) { c.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 0.8 + i * 1.7)); c.fillRect(-8 + ((i * 37) % 16), yy - 26 + ((i * 53) % 18), 1.2, 1.2); } c.globalAlpha = 1; }
  // sirip punggung hiu
  if (id === "c_hiu") { c.fillStyle = sh(col, -0.25); c.beginPath(); c.moveTo(-fx * 2 - 4, yy - 38); c.lineTo(-fx * 2, yy - 52); c.lineTo(-fx * 2 + 5, yy - 38); c.closePath(); c.fill(); for (const s of [-1, 1]) { const fl = Math.sin(t * 5 + s) * (moving ? 2 : 0.8); c.beginPath(); c.moveTo(s * 9, yy - 20); c.lineTo(s * 16, yy - 14 + fl); c.lineTo(s * 9, yy - 13); c.closePath(); c.fill(); } }
  // tangan kecil T-Rex
  if (id === "c_trex" && !back) { c.fillStyle = sh(col, -0.1); c.fillRect(fx * 4 - 1, yy - 18, 5, 2.2); c.fillRect(-fx * 4 - 4, yy - 18, 5, 2.2); }
  // kepala
  const hy = yy - 31 + (id === "c_capy" ? 2 : 0), hr = id === "c_capy" ? 8.8 : id === "c_trex" ? 9.2 : id === "c_robot" ? 0 : 8;
  c.fillStyle = ghost ? sh(col, 0.15) : dark ? "#2d2170" : col;
  if (id === "c_robot") { c.fillStyle = sh(col, 0.1); c.fillRect(-8, hy - 8, 16, 14); c.fillStyle = "#12171d"; if (!back) { c.fillRect(-6 + ex * 0.4, hy - 4, 12, 6); const led = lv ? 0.7 + 0.3 * Math.sin(t * 2.4) : 0.9; c.fillStyle = `rgba(90,240,255,${led})`; c.fillRect(-4.8 + ex * 0.4, hy - 2.4, 3.2, 3); c.fillRect(1.6 + ex * 0.4, hy - 2.4, 3.2, 3); } c.strokeStyle = "#6d7783"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, hy - 8); c.lineTo(0, hy - 12); c.stroke(); c.fillStyle = "#ff5a5a"; c.beginPath(); c.arc(0, hy - 12.5, 1.4, 0, 7); c.fill(); }
  else if (id === "c_trex") { c.beginPath(); c.arc(0, hy, hr, 0, 7); c.fill(); if (!back) { const jx = fx * 4; c.fillStyle = col; c.beginPath(); c.ellipse(jx + ex, hy + 3.5, 7, 4.4, 0, 0, 7); c.fill(); c.fillStyle = "#fff"; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(jx + ex + i * 2.4 - 0.9, hy + 5.2); c.lineTo(jx + ex + i * 2.4, hy + 7.2); c.lineTo(jx + ex + i * 2.4 + 0.9, hy + 5.2); c.fill(); } } c.fillStyle = sh(col, -0.25); c.beginPath(); c.arc(-4, hy - 7, 1.4, 0, 7); c.arc(4, hy - 7, 1.4, 0, 7); c.fill(); }
  else { c.beginPath(); c.arc(0, hy, hr, 0, 7); c.fill(); }
  if (id === "c_kucing") { for (const s of [-1, 1]) { c.fillStyle = col; c.beginPath(); c.moveTo(s * 7, hy - 3); c.lineTo(s * 6.2, hy - 12.5); c.lineTo(s * 1.5, hy - 7); c.closePath(); c.fill(); c.fillStyle = "#f3a6a0"; c.beginPath(); c.moveTo(s * 5.8, hy - 4.5); c.lineTo(s * 5.4, hy - 10); c.lineTo(s * 2.8, hy - 7); c.closePath(); c.fill(); } if (!back) { c.strokeStyle = "rgba(60,40,20,.7)"; c.lineWidth = 0.7; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 4 + ex, hy + 2.6); c.lineTo(s * 10 + ex, hy + 1.4); c.moveTo(s * 4 + ex, hy + 3.6); c.lineTo(s * 10 + ex, hy + 4.4); c.stroke(); } c.fillStyle = "#e8727a"; c.beginPath(); c.moveTo(ex - 1.1, hy + 2); c.lineTo(ex + 1.1, hy + 2); c.lineTo(ex, hy + 3.2); c.fill(); } }
  if (id === "c_capy") { c.fillStyle = sh(col, -0.18); c.beginPath(); c.arc(-6, hy - 7, 2, 0, 7); c.arc(6, hy - 7, 2, 0, 7); c.fill(); if (!back) { c.fillStyle = sh(col, 0.15); c.beginPath(); c.ellipse(ex * 1.3, hy + 3.4, 5.4, 4, 0, 0, 7); c.fill(); c.fillStyle = "#3a2518"; c.beginPath(); c.ellipse(ex * 1.4, hy + 1.6, 2, 1.3, 0, 0, 7); c.fill(); } }
  if (id === "c_hiu" && !back) { c.fillStyle = "#eef6fb"; c.beginPath(); c.ellipse(ex * 0.8, hy + 4, 5.4, 3, 0, 0, Math.PI); c.fill(); c.fillStyle = "#fff"; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(ex * 0.8 + i * 2 - 0.8, hy + 4); c.lineTo(ex * 0.8 + i * 2, hy + 6); c.lineTo(ex * 0.8 + i * 2 + 0.8, hy + 4); c.fill(); } }
  if (id === "c_naga") { c.fillStyle = "#e8c35a"; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 4.5, hy - 6.4); c.lineTo(s * 8, hy - 15); c.lineTo(s * 1.8, hy - 8); c.closePath(); c.fill(); } if (!back) { c.fillStyle = sh(col, 0.2); c.beginPath(); c.ellipse(ex * 1.2, hy + 3.5, 5, 3.4, 0, 0, 7); c.fill(); c.fillStyle = "#ffd24a"; c.beginPath(); c.arc(ex * 1.2 - 1.8, hy + 3, 0.7, 0, 7); c.arc(ex * 1.2 + 1.8, hy + 3, 0.7, 0, 7); c.fill(); } }
  if (id === "c_raja") { c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(0, hy - 2, 8.2, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.fillStyle = "#f0c53a"; c.beginPath(); c.moveTo(-6.8, hy - 6); c.lineTo(-7.4, hy - 14); c.lineTo(-3.4, hy - 9.5); c.lineTo(0, hy - 15.5); c.lineTo(3.4, hy - 9.5); c.lineTo(7.4, hy - 14); c.lineTo(6.8, hy - 6); c.closePath(); c.fill(); }
  if (id === "c_hantu") { c.fillStyle = "rgba(255,255,255,.9)"; }
  if (dark) { c.fillStyle = "#1a1250"; c.beginPath(); c.arc(0, hy - 1, 8.8, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(8.6, hy + 7); c.lineTo(-8.6, hy + 7); c.closePath(); c.fill(); if (!back) { c.fillStyle = "#07041a"; c.beginPath(); c.ellipse(ex, hy + 1.5, 5.4, 5, 0, 0, 7); c.fill(); } }
  // mata
  if (id !== "c_robot") { if (ghost || dark) { if (!back) { c.fillStyle = ghost ? "#8dffe9" : "#ffe9a0"; c.beginPath(); c.arc(-2.6 + ex, hy + 1, 1.5, 0, 7); c.arc(2.6 + ex, hy + 1, 1.5, 0, 7); c.fill(); } } else eyes(c, hy, fx, back, K.fx, t); }
  c.globalAlpha = 1;
  // ---- efek (hanya bila diizinkan) ----
  if (lv) {
    const act = ch._fxT0 !== undefined ? ch._fxT0 : (ch._fxT0 = t);
    if (K.fx === "aura_emas") { sparkles(c, t, yy, "rgba(255,225,120,A)", lv >= 2 ? 7 : 3, 14, 40); }
    else if (K.fx === "aura_ungu") { sparkles(c, t, yy, "rgba(200,140,255,A)", lv >= 2 ? 6 : 3, 12, 34); }
    else if (K.fx === "petir") { bolt(c, t, yy, "#8fc4ff", lv >= 2 ? 2 : 1); c.globalAlpha = 1; if (lv >= 2) sparkles(c, t, yy, "rgba(255,214,90,A)", 4, 16, 28); }
    else if (K.fx === "galaksi") { stars(c, t, yy, lv >= 2 ? 7 : 3, 17); }
    else if (K.fx === "percik") { for (let i = 0; i < (lv >= 2 ? 4 : 2); i++) { const k = (t * 0.9 + i / 4) % 1; c.fillStyle = `rgba(150,210,245,${0.8 * (1 - k)})`; c.beginPath(); c.arc((i - 1.5) * 5, yy - 2 - Math.sin(k * 3.14) * 10, 1.3, 0, 7); c.fill(); } }
    else if (K.fx === "mesin") { c.fillStyle = `rgba(90,230,255,${0.12 + 0.08 * Math.sin(t * 2.2)})`; c.beginPath(); c.ellipse(0, yy - 20, 14, 22, 0, 0, 7); c.fill(); }
    ring(c, act, t, yy - 1, ch.fxRingCol || (K.fx === "aura_emas" ? "rgba(255,210,80,A)" : K.fx === "galaksi" ? "rgba(170,140,255,A)" : "rgba(130,200,255,A)"));
  }
}

// Efek di tanah (jejak) dipanggil terpisah SEBELUM translate karakter: lihat world/draw.js hook.
function drawGroundFx(c, ch, t, lv, P) { const K = ch.style && ch.style.costume; if (!K || !lv) return; if (K.fx === "jejak" || K.fx === "galaksi" || K.fx === "percik") trail(c, ch, t, 0, K.fx, lv, P); }
function lvFor(ch, t) { const own = ch.style && (ch.style.costume || ch.style.head || ch.style.acc); if (!own) return 0; if (preview > performance.now() / 1000 && ch.isMe) return 2; return allow(ch, t); }

NW.avatarDraw = { styleFor, drawTop, drawPantsDetail, drawHead, drawWings, drawCostume, drawGroundFx, lvFor, setLevel, level: () => level, showFx, F };
})();
