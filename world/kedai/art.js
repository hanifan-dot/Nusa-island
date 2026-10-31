// =========================================================
//  NUSA ISLAND — Bumbu 3.1: GAMBAR Kedai Atuk Bahar & Atuk (kanvas 2D, ringan). Tidak ada gambar luar.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const TAU = Math.PI * 2;
const SKIN = "#b9835a", SKIN_D = "#9a6a45";

// Wajah Atuk, pusat (0,0), jari-jari r. mood: idle | talk | laugh | amaze | sad
function face(c, r, mood, t) {
  const laugh = mood === "laugh", talk = mood === "talk";
  const bob = laugh ? Math.sin(t * 22) * r * 0.05 : 0;
  c.save(); c.translate(0, bob);
  c.fillStyle = "rgba(0,0,0,.14)"; c.beginPath(); c.ellipse(0, r * 0.98, r * 0.7, r * 0.12, 0, 0, TAU); c.fill();
  // telinga + kepala
  c.fillStyle = SKIN_D; c.beginPath(); c.arc(-r * 0.93, 0.05 * r, r * 0.16, 0, TAU); c.arc(r * 0.93, 0.05 * r, r * 0.16, 0, TAU); c.fill();
  const g = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r); g.addColorStop(0, "#d19a6c"); g.addColorStop(1, SKIN);
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, r * 0.95, r, 0, 0, TAU); c.fill();
  // peci hitam + pita emas
  c.fillStyle = "#1c1a1a"; c.beginPath(); c.moveTo(-r * 0.88, -r * 0.34); c.quadraticCurveTo(-r * 0.9, -r * 1.25, 0, -r * 1.3); c.quadraticCurveTo(r * 0.9, -r * 1.25, r * 0.88, -r * 0.34); c.quadraticCurveTo(0, -r * 0.5, -r * 0.88, -r * 0.34); c.fill();
  c.strokeStyle = "#d8b14a"; c.lineWidth = Math.max(1, r * 0.07); c.beginPath(); c.moveTo(-r * 0.86, -r * 0.4); c.quadraticCurveTo(0, -r * 0.56, r * 0.86, -r * 0.4); c.stroke();
  // rambut putih di tepi
  c.fillStyle = "#f2efe8"; c.beginPath(); c.ellipse(-r * 0.86, -r * 0.2, r * 0.1, r * 0.22, 0.2, 0, TAU); c.ellipse(r * 0.86, -r * 0.2, r * 0.1, r * 0.22, -0.2, 0, TAU); c.fill();
  // alis putih
  const lift = mood === "amaze" ? -r * 0.12 : 0;
  c.strokeStyle = "#f6f3ea"; c.lineWidth = Math.max(1.2, r * 0.13); c.lineCap = "round";
  c.beginPath(); c.moveTo(-r * 0.55, -r * 0.22 + lift); c.quadraticCurveTo(-r * 0.35, -r * 0.34 + lift, -r * 0.16, -r * 0.2 + lift); c.moveTo(r * 0.55, -r * 0.22 + lift); c.quadraticCurveTo(r * 0.35, -r * 0.34 + lift, r * 0.16, -r * 0.2 + lift); c.stroke();
  // mata
  c.strokeStyle = "#2a1a10"; c.fillStyle = "#2a1a10"; c.lineWidth = Math.max(1.2, r * 0.08);
  if (laugh || mood === "sad") { c.beginPath(); c.arc(-r * 0.36, -r * 0.02, r * 0.14, Math.PI * 1.1, Math.PI * 1.9); c.arc(r * 0.36, -r * 0.02, r * 0.14, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  else if (mood === "amaze") { c.fillStyle = "#fff"; c.beginPath(); c.arc(-r * 0.36, 0, r * 0.15, 0, TAU); c.arc(r * 0.36, 0, r * 0.15, 0, TAU); c.fill(); c.fillStyle = "#2a1a10"; c.beginPath(); c.arc(-r * 0.36, 0, r * 0.07, 0, TAU); c.arc(r * 0.36, 0, r * 0.07, 0, TAU); c.fill(); }
  else { const bl = Math.sin(t * 1.3) > 0.985 ? 0.2 : 1; c.beginPath(); c.ellipse(-r * 0.36, -r * 0.02, r * 0.07, r * 0.09 * bl, 0, 0, TAU); c.ellipse(r * 0.36, -r * 0.02, r * 0.07, r * 0.09 * bl, 0, 0, TAU); c.fill(); }
  // hidung
  c.fillStyle = SKIN_D; c.beginPath(); c.ellipse(0, r * 0.14, r * 0.12, r * 0.15, 0, 0, TAU); c.fill();
  // mulut (di bawah kumis)
  const open = laugh ? 0.35 + 0.15 * Math.sin(t * 22) : talk ? 0.12 + 0.12 * Math.abs(Math.sin(t * 11)) : mood === "amaze" ? 0.3 : 0.03;
  c.fillStyle = "#4a1a1a"; c.beginPath(); c.ellipse(0, r * 0.5, r * (laugh ? 0.3 : 0.17), r * open, 0, 0, TAU); c.fill();
  if (laugh) { c.fillStyle = "#f4efe3"; c.fillRect(-r * 0.16, r * 0.5 - r * open + 1, r * 0.32, r * 0.07); }
  // kumis putih tebal melengkung
  c.fillStyle = "#f8f5ee"; c.strokeStyle = "#cfc9ba"; c.lineWidth = Math.max(0.8, r * 0.03);
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(0, r * 0.28); c.bezierCurveTo(s * r * 0.3, r * 0.2, s * r * 0.62, r * 0.32, s * r * 0.78, r * 0.55); c.bezierCurveTo(s * r * 0.82, r * 0.38, s * r * 0.55, r * 0.5, s * r * 0.28, r * 0.5); c.bezierCurveTo(s * r * 0.12, r * 0.5, 0, r * 0.44, 0, r * 0.4); c.closePath(); c.fill(); c.stroke();
  }
  // jenggot tipis di dagu
  c.fillStyle = "#efece4"; c.beginPath(); c.moveTo(-r * 0.2, r * 0.82); c.quadraticCurveTo(0, r * 1.18, r * 0.2, r * 0.82); c.quadraticCurveTo(0, r * 0.9, -r * 0.2, r * 0.82); c.fill();
  if (mood === "laugh") { c.fillStyle = "rgba(230,120,100,.35)"; c.beginPath(); c.arc(-r * 0.6, r * 0.28, r * 0.13, 0, TAU); c.arc(r * 0.6, r * 0.28, r * 0.13, 0, TAU); c.fill(); }
  c.restore();
}

function portrait(c, w, h, mood, t) {
  c.clearRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#ffe9b8"); g.addColorStop(1, "#f0c27a"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.save(); c.translate(w / 2, h * 0.52); face(c, Math.min(w, h) * 0.38, mood, t);
  c.fillStyle = "#e9e1c8"; c.beginPath(); c.moveTo(-w * 0.34, h * 0.5); c.quadraticCurveTo(0, h * 0.28, w * 0.34, h * 0.5); c.fill(); c.restore();
}

// Atuk duduk di meja (titik kaki di x,y layar). mode: idle | talk | laugh | amaze | gesture
function atuk(c, x, y, t, a) {
  const mode = a.mode, laugh = mode === "laugh", talk = mode === "talk", ges = mode === "gesture" || talk;
  const sc = 1.1, shake = laugh ? Math.sin(t * 22) * 1.0 : 0, br = Math.sin(t * 2) * 0.6;
  c.save(); c.translate(x, y); c.scale(sc, sc);
  c.fillStyle = "rgba(15,35,30,.28)"; c.beginPath(); c.ellipse(1, 0, 12, 4.5, 0, 0, TAU); c.fill();
  // sarung kotak-kotak (paha di depan)
  c.fillStyle = "#7a4a2a"; c.beginPath(); c.moveTo(-9, -10); c.lineTo(10, -10); c.lineTo(15, -5); c.lineTo(15, -1); c.lineTo(-8, -1); c.closePath(); c.fill();
  c.strokeStyle = "rgba(240,200,120,.55)"; c.lineWidth = 0.8; for (let i = -6; i < 15; i += 4) { c.beginPath(); c.moveTo(i, -10); c.lineTo(i + 1, -1); c.stroke(); } for (let j = -8; j < 0; j += 3.5) { c.beginPath(); c.moveTo(-8, j); c.lineTo(15, j + 0.5); c.stroke(); }
  c.fillStyle = "#3a2a20"; c.fillRect(11, -2.4, 6, 2.4); // sandal
  // badan: baju koko krem
  c.save(); c.translate(shake * 0.4, br * 0.4);
  c.fillStyle = "#efe3c2"; c.beginPath(); c.moveTo(-8, -9); c.lineTo(-8.5, -25); c.quadraticCurveTo(0, -30, 8.5, -25); c.lineTo(8, -9); c.closePath(); c.fill();
  c.strokeStyle = "#cfc09a"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -26); c.lineTo(0, -10); c.stroke();
  c.fillStyle = "#d8b14a"; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -23 + i * 4.5, 0.8, 0, TAU); c.fill(); }
  // lengan kiri (bertumpu di lutut/meja)
  c.strokeStyle = "#efe3c2"; c.lineWidth = 4.2; c.lineCap = "round";
  c.beginPath(); c.moveTo(-7, -23); c.lineTo(-12, -14 + (laugh ? Math.sin(t * 22) : 0)); c.lineTo(-6, -9); c.stroke();
  c.fillStyle = SKIN; c.beginPath(); c.arc(-6, -9, 2.2, 0, TAU); c.fill();
  // lengan kanan: melambai/menunjuk saat bicara
  const sw = ges ? Math.sin(t * 5.5) : 0, ex = 13 + (ges ? 4 : 0), ey = ges ? -29 + sw * 4 : -15;
  c.beginPath(); c.moveTo(7, -23); c.lineTo(10.5, ges ? -26 : -16); c.lineTo(ex, ey); c.stroke();
  c.fillStyle = SKIN; c.beginPath(); c.arc(ex, ey, 2.4, 0, TAU); c.fill();
  if (ges) { c.strokeStyle = SKIN; c.lineWidth = 1.4; c.beginPath(); c.moveTo(ex, ey - 1); c.lineTo(ex + 3, ey - 4 + sw); c.stroke(); }
  // kepala
  c.translate(0, -37); face(c, 9.5, mode === "gesture" ? "talk" : mode, t);
  c.restore();
  // gelembung teks tawa
  if (laugh) { c.font = "800 11px system-ui"; c.textAlign = "center"; c.fillStyle = "#fff6e4"; c.strokeStyle = "#7a3a1c"; c.lineWidth = 3; const bx = 4 + Math.sin(t * 10) * 1.5, by = -62 - Math.abs(Math.sin(t * 8)) * 3; c.strokeText("HAHAHA!", bx, by); c.fillText("HAHAHA!", bx, by); }
  c.restore();
}

// ---------- bangunan: rumah panggung kayu + hiasan ----------
function kedai(c, b, t, night) {
  const P = NW.P, LIFT = NW.LIFT, z0 = LIFT + (b.stilts || 0), cx = (b.x0 + b.x1) / 2;
  NW.drawHouse(c, b, t, night);
  const rh = 26 + (b.x1 - b.x0) * 2, top = z0 + b.h;
  // tanduk atap (hiasan khas Nusantara) di kedua ujung bubungan
  c.strokeStyle = "#4a2b12"; c.lineWidth = 3.2; c.lineCap = "round";
  for (const [x, y] of [[cx, b.y0 - 0.28], [cx, b.y1 + 0.28]]) { const p = P(x, y, top + rh), q = P(x, y + (y > (b.y0 + b.y1) / 2 ? 0.35 : -0.35), top + rh + 15); c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x, p.y - 9, q.x, q.y); c.stroke(); }
  // papan nama di atas pintu (sisi pintu 'x')
  const sx = b.x1 + 0.04, sc = P(sx, (b.y0 + b.y1) / 2, z0 + b.h - 6);
  c.save(); c.translate(sc.x, sc.y); c.transform(1, -0.5, 0, 1, 0, 0);
  c.fillStyle = "#3a2210"; c.fillRect(-34, -8, 68, 16); c.strokeStyle = "#e0b84c"; c.lineWidth = 1.2; c.strokeRect(-33, -7, 66, 14);
  c.font = "800 8.5px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#ffe28a"; c.fillText("KEDAI ATUK BAHAR", 0, 0.5); c.restore();
  // lampu gantung hangat
  const lp = P(b.x1 + 0.5, b.y0 + (b.y1 - b.y0) * 0.22, z0 + b.h - 4), lp2 = P(b.x1 + 0.5, b.y0 + (b.y1 - b.y0) * 0.78, z0 + b.h - 4), sway = Math.sin(t * 1.6) * 1.2;
  for (const p of [lp, lp2]) {
    c.strokeStyle = "#3a2a1c"; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y - 14); c.lineTo(p.x + sway, p.y + 4); c.stroke();
    const glow = 0.6 + night * 0.4; c.fillStyle = `rgba(255,190,90,${(0.15 + night * 0.35).toFixed(2)})`; c.beginPath(); c.arc(p.x + sway, p.y + 10, 14, 0, TAU); c.fill();
    c.fillStyle = `rgba(255,${(200 + 40 * glow) | 0},110,1)`; c.beginPath(); c.moveTo(p.x + sway - 5, p.y + 4); c.lineTo(p.x + sway + 5, p.y + 4); c.lineTo(p.x + sway + 4, p.y + 14); c.quadraticCurveTo(p.x + sway, p.y + 17, p.x + sway - 4, p.y + 14); c.closePath(); c.fill();
    c.fillStyle = "#c2603b"; c.beginPath(); c.moveTo(p.x + sway - 6, p.y + 4); c.lineTo(p.x + sway, p.y - 2); c.lineTo(p.x + sway + 6, p.y + 4); c.closePath(); c.fill();
  }
  // kain batik / bendera tali di sisi depan
  const a = P(b.x0 + 0.1, b.y1 + 0.22, z0 + b.h * 0.9), e = P(b.x1 + 0.9, b.y1 + 0.22, z0 + b.h * 0.9 - 4);
  c.strokeStyle = "rgba(60,40,20,.7)"; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo((a.x + e.x) / 2, (a.y + e.y) / 2 + 9, e.x, e.y); c.stroke();
  const cols = ["#e2574c", "#e0b84c", "#3d8f6e", "#3d6f8f", "#c2603b", "#f1e6cf"];
  for (let i = 1; i < 9; i++) { const k = i / 9, x = a.x + (e.x - a.x) * k, y = a.y + (e.y - a.y) * k + Math.sin(k * Math.PI) * 9; c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(x - 3.5, y); c.lineTo(x + 3.5, y); c.lineTo(x, y + 8 + Math.sin(t * 2 + i) * 0.8); c.closePath(); c.fill(); }
  // gasing & kelereng digantung sebagai ornamen
  const hp = P(b.x1 + 0.1, b.y1 - 0.25, z0 + b.h * 0.55);
  c.strokeStyle = "#5a3a20"; c.lineWidth = 1; c.beginPath(); c.moveTo(hp.x, hp.y - 12); c.lineTo(hp.x, hp.y); c.stroke();
  c.fillStyle = "#c9402e"; c.beginPath(); c.ellipse(hp.x, hp.y + 2, 5, 3.4, 0, 0, TAU); c.fill(); c.fillStyle = "#3a2a1c"; c.beginPath(); c.moveTo(hp.x - 1.5, hp.y + 4); c.lineTo(hp.x + 1.5, hp.y + 4); c.lineTo(hp.x, hp.y + 9); c.fill();
}

// meja permainan + bangku bambu (objek lepas, digambar di urutan kedalaman)
function table(c, o, t) {
  const P = NW.P, p = P(o.x, o.y, NW.LIFT), w = 26, d = 14;
  c.fillStyle = "rgba(15,35,30,.25)"; c.beginPath(); c.ellipse(p.x + 2, p.y + 2, w * 0.95, d * 0.8, 0, 0, TAU); c.fill();
  c.fillStyle = "#5a3a20"; for (const dx of [-w * 0.7, w * 0.7]) c.fillRect(p.x + dx - 2, p.y - 14, 4, 14);
  c.fillStyle = "#a8723c"; c.beginPath(); c.moveTo(p.x - w, p.y - 15); c.lineTo(p.x, p.y - 15 - d); c.lineTo(p.x + w, p.y - 15); c.lineTo(p.x, p.y - 15 + d); c.closePath(); c.fill();
  c.strokeStyle = "#6e4624"; c.lineWidth = 1; c.stroke();
  // papan congklak kecil + kelereng + gasing di atas meja
  c.fillStyle = "#7a4b22"; c.beginPath(); c.moveTo(p.x - 13, p.y - 15); c.lineTo(p.x - 3, p.y - 20); c.lineTo(p.x + 9, p.y - 15); c.lineTo(p.x - 1, p.y - 10); c.closePath(); c.fill();
  c.fillStyle = "#2a180a"; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(p.x - 8 + i * 4.5, p.y - 16 - i * 1.2 + (i % 2) * 2, 1.5, 1, 0, 0, TAU); c.fill(); }
  for (const [dx, dy, col] of [[14, -17, "#d63a3a"], [17, -15, "#3b86c8"], [12, -14, "#f1eadb"]]) { c.fillStyle = col; c.beginPath(); c.arc(p.x + dx, p.y + dy, 2.2, 0, TAU); c.fill(); }
  c.fillStyle = "#2f78c4"; c.beginPath(); c.ellipse(p.x - 18, p.y - 17, 4, 2.6, 0, 0, TAU); c.fill();
}
function bench(c, o) {
  const P = NW.P, p = P(o.x, o.y, NW.LIFT);
  c.fillStyle = "rgba(15,35,30,.22)"; c.beginPath(); c.ellipse(p.x + 2, p.y + 1, 22, 6, 0, 0, TAU); c.fill();
  c.strokeStyle = "#b99a4a"; c.lineWidth = 4; c.lineCap = "round"; for (const dx of [-14, 14]) { c.beginPath(); c.moveTo(p.x + dx, p.y); c.lineTo(p.x + dx, p.y - 7); c.stroke(); }
  c.strokeStyle = "#d3b765"; c.lineWidth = 3.4; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(p.x - 18, p.y - 8 + i * 1.5 - 0.5); c.lineTo(p.x + 18, p.y - 8 + i * 1.5 - 0.5); c.stroke(); }
  c.strokeStyle = "#8a7430"; c.lineWidth = 0.8; for (const dx of [-14, 0, 14]) { c.beginPath(); c.moveTo(p.x + dx, p.y - 10); c.lineTo(p.x + dx, p.y - 6); c.stroke(); }
}

// konfeti perayaan (untuk gelar). state dibuat oleh pemanggil.
function confetti(n, W, H) { return Array.from({ length: n }, (_, i) => ({ x: Math.random() * W, y: -Math.random() * H, vx: (Math.random() - 0.5) * 40, vy: 70 + Math.random() * 110, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 9, s: 4 + Math.random() * 5, c: ["#ffd24a", "#e2574c", "#4aa3f0", "#7ccf6b", "#ffffff", "#f08ad0"][i % 6] })); }
function confettiStep(a, dt, W, H) { for (const p of a) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; } } }
function confettiDraw(c, a) { for (const p of a) { c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); } }

NW.kedaiArt = { face, portrait, atuk, kedai, table, bench, confetti, confettiStep, confettiDraw };
})();
