// NUSA ISLAND — gambar & animasi 4 ikan Samudra Follower (Canvas 2D, 2.5D: gradasi + sorot + bayangan; tanpa gambar eksternal, ringan untuk Android).
// Semua ikan menghadap KIRI (mengikuti gambar referensi Ikan Tempe). draw(c, id, cx, cy, L, t): L ≈ lebar sprite (px), t = detik (animasi berenang).
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
const lit = (h, k) => mixc(h, "#ffffff", k), dark = (h, k) => mixc(h, "#000000", k);
const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const OUT = "rgba(30,25,20,.55)";
function grad(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
function shadow(c, y, rx) { c.save(); c.fillStyle = "rgba(10,40,60,.18)"; ell(c, 0, y, rx, rx * 0.12); c.fill(); c.restore(); }
function eye(c, x, y, r, o = {}) {
  c.save(); ell(c, x, y, r * (o.sx || 1), r); c.fillStyle = o.white || "#fff"; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke();
  const px = x + (o.dx || -r * 0.12), py = y + (o.dy || 0.5), pr = r * (o.pr || 0.72); ell(c, px, py, pr, pr); c.fillStyle = o.iris || "#1b1410"; c.fill();
  if (o.ring) { ell(c, px, py, pr * 0.62, pr * 0.62); c.fillStyle = o.ring; c.fill(); ell(c, px, py, pr * 0.36, pr * 0.36); c.fillStyle = "#120d09"; c.fill(); }
  ell(c, px - pr * 0.3, py - pr * 0.38, pr * 0.3, pr * 0.3); c.fillStyle = "rgba(255,255,255,.95)"; c.fill();
  ell(c, px + pr * 0.28, py + pr * 0.32, pr * 0.14, pr * 0.14); c.fillStyle = "rgba(255,255,255,.6)"; c.fill(); c.restore();
}

// ------------------------------------------------------------------ IKAN TEMPE (bentuk mengikuti gambar referensi Owner)
// Tubuh gemuk bulat kuning-keemasan menghadap kiri, mata hitam besar di kiri-atas dengan kilau putih, mulut terbuka lebar di kiri bawah (bibir oranye),
// sirip dayung kecil pucat di bawah, ekor kipas kecil pucat di belakang, gelembung kecil biru di atas mata. Ditambah tekstur tempe goreng (bintik biji + tepi renyah).
function tempe(c, t) {
  const bob = sin(t * 2.2) * 3.5, sq = 1 + sin(t * 4.4) * 0.018, mouth = 0.55 + 0.45 * (0.5 + 0.5 * sin(t * 2.6)), fl = sin(t * 7);
  c.save(); c.translate(0, bob); c.scale(1 / sq, sq);
  shadow(c, 58 - bob, 58);
  // ekor kipas (belakang, kanan) — pucat dengan urat
  c.save(); c.translate(52, 6); c.rotate(fl * 0.16); c.beginPath(); c.moveTo(0, -4); c.bezierCurveTo(16, -22, 34, -18, 38, -4); c.bezierCurveTo(34, 14, 18, 20, 0, 6); c.closePath();
  c.fillStyle = grad(c, 0, 0, 38, 0, [[0, "#f6e68a"], [1, "#fbf3c4"]]); c.fill(); c.strokeStyle = "rgba(190,150,50,.55)"; c.lineWidth = 1; c.stroke();
  c.strokeStyle = "rgba(190,150,50,.45)"; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(2, i); c.lineTo(34, i * 4.2 - 1); c.stroke(); } c.restore();
  // sirip dayung bawah (pucat, kecil)
  c.save(); c.translate(-26, 36); c.rotate(-0.5 + fl * 0.22); ell(c, 0, 6, 10, 17, 0.2); c.fillStyle = "#fbefb0"; c.fill(); c.strokeStyle = "rgba(190,150,50,.6)"; c.lineWidth = 1; c.stroke(); c.restore();
  c.save(); c.translate(14, 40); c.rotate(0.35 - fl * 0.18); ell(c, 0, 5, 8, 13, -0.2); c.fillStyle = "#f9e9a0"; c.fill(); c.strokeStyle = "rgba(190,150,50,.5)"; c.stroke(); c.restore();
  // tubuh: blob gemuk sedikit miring (kepala lebih rendah di kiri)
  const body = new Path2D(); body.moveTo(-62, 6); body.bezierCurveTo(-70, -26, -40, -50, -4, -50); body.bezierCurveTo(36, -52, 66, -30, 66, 4); body.bezierCurveTo(66, 36, 38, 56, 0, 54); body.bezierCurveTo(-34, 54, -58, 36, -62, 6); body.closePath();
  c.fillStyle = grad(c, -30, -52, 34, 56, [[0, "#fff09a"], [0.35, "#f6d94a"], [0.75, "#e3b32c"], [1, "#c88f1c"]]); c.fill(body);
  // tekstur tempe goreng: bintik biji + tepi renyah
  c.save(); c.clip(body); const r = rnd(7);
  for (let i = 0; i < 70; i++) { const x = -60 + r() * 126, y = -50 + r() * 104; ell(c, x, y, 1.2 + r() * 2.2, 0.9 + r() * 1.6, r() * 3); c.fillStyle = `rgba(160,100,10,${0.16 + r() * 0.22})`; c.fill(); }
  for (let i = 0; i < 26; i++) { const x = -56 + r() * 118, y = -46 + r() * 96; ell(c, x, y, 1.6 + r() * 1.6, 1.1 + r(), r() * 3); c.fillStyle = `rgba(255,248,190,${0.35 + r() * 0.3})`; c.fill(); }
  c.fillStyle = grad(c, 0, 20, 0, 56, [[0, "rgba(150,90,10,0)"], [1, "rgba(120,70,5,.45)"]]); c.fillRect(-80, 20, 160, 50);                          // bawah lebih gosong
  c.fillStyle = grad(c, -40, -52, -10, -20, [[0, "rgba(255,255,230,.7)"], [1, "rgba(255,255,230,0)"]]); ell(c, -22, -34, 30, 14, -0.35); c.fill();    // sorot atas
  c.restore(); c.lineWidth = 2; c.strokeStyle = "rgba(150,100,15,.75)"; c.stroke(body);
  // gelembung biru kecil di atas mata (seperti referensi)
  const bx = -58 + sin(t * 1.8) * 1.5, by = -36 - ((t * 9) % 14); ell(c, bx, by, 3.2, 3.2); c.fillStyle = "rgba(170,225,255,.8)"; c.fill(); c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 0.8; c.stroke();
  // mulut terbuka lebar kiri-bawah dengan bibir oranye
  c.save(); c.translate(-50, 12); const mo = 7 + mouth * 9;
  c.beginPath(); c.moveTo(4, -mo * 0.6); c.bezierCurveTo(-12, -mo, -22, -mo * 0.4, -20, 2); c.bezierCurveTo(-18, mo * 0.9, -6, mo * 1.2, 5, mo * 0.7); c.closePath();
  c.fillStyle = "#7a2f1d"; c.fill(); c.lineWidth = 3.2; c.strokeStyle = "#f08a52"; c.stroke(); c.lineWidth = 1; c.strokeStyle = "rgba(120,50,20,.6)"; c.stroke();
  ell(c, -9, mo * 0.45, 6, 3, 0); c.fillStyle = "#e86d6d"; c.fill(); c.restore();
  // mata besar hitam dengan kilau
  const blink = (t % 4.2) > 4.05 ? 0.15 : 1; c.save(); c.translate(-36, -16); c.scale(1, blink);
  ell(c, 0, 0, 13, 14); c.fillStyle = "#21160e"; c.fill(); c.lineWidth = 1.5; c.strokeStyle = "rgba(90,60,20,.8)"; c.stroke();
  ell(c, -4, -5, 4.6, 4.6); c.fillStyle = "#fff"; c.fill(); ell(c, 4, 5, 2, 2); c.fillStyle = "rgba(255,255,255,.7)"; c.fill(); c.restore();
  c.restore();
}

// ------------------------------------------------------------------ CUPANG SLAYER (cupang petarung: sirip panjang mengalir, warna mencolok, aura)
function cupang(c, t) {
  const sw = (k) => sin(t * 3 + k), bob = sin(t * 1.9) * 2.5;
  // aura berdenyut
  const ap = 0.55 + 0.25 * sin(t * 2.4); const ag = c.createRadialGradient(0, 0, 8, 0, 0, 110); ag.addColorStop(0, `rgba(255,80,140,${0.38 * ap})`); ag.addColorStop(0.55, `rgba(110,60,255,${0.2 * ap})`); ag.addColorStop(1, "rgba(60,40,255,0)");
  c.fillStyle = ag; c.fillRect(-130, -90, 260, 180);
  c.save(); c.strokeStyle = `rgba(255,255,255,${0.35 + 0.25 * sin(t * 5)})`; c.lineWidth = 2; c.lineCap = "round"; for (let i = 0; i < 3; i++) { const a = -0.9 + i * 0.28 + sin(t * 2 + i) * 0.08; c.beginPath(); c.arc(-30, 0, 78 + i * 7, Math.PI + a - 0.35, Math.PI + a + 0.35); c.stroke(); } c.restore();
  c.save(); c.translate(0, bob);
  // sirip ekor (kipas panjang mengalir)
  const tailBase = [50, 0]; for (let layer = 0; layer < 2; layer++) {
    const spread = layer ? 0.8 : 1, N = 11; c.save(); c.translate(tailBase[0], 0);
    for (let i = 0; i < N; i++) { const u = i / (N - 1) - 0.5, ang = u * 2.0 * spread, len = (layer ? 62 : 80) * (1 - Math.abs(u) * 0.25), w = sw(i * 0.5 + layer) * 0.12;
      const ex = cos(ang + w) * len, ey = sin(ang + w) * len, mx = ex * 0.55, my = ey * 0.55 + sin(t * 3 + i) * 3;
      c.beginPath(); c.moveTo(0, u * 6); c.quadraticCurveTo(mx, my - 3, ex, ey); c.quadraticCurveTo(mx, my + 4, 0, u * 6 + 3);
      const col = layer ? "#ff3f7a" : "#7a3cff"; c.fillStyle = grad(c, 0, 0, ex, ey, [[0, lit(col, 0.1)], [0.6, col], [1, "rgba(80,200,255,.75)"]]); c.globalAlpha = layer ? 0.8 : 0.9; c.fill(); }
    c.restore(); c.globalAlpha = 1; }
  // sirip punggung & dubur panjang
  const fin = (sgn, x0, x1, h, col, ph) => { c.beginPath(); c.moveTo(x0, sgn * 9); for (let i = 0; i <= 8; i++) { const u = i / 8, x = x0 + (x1 - x0) * u; c.lineTo(x, sgn * (9 + h * sin(u * Math.PI) * (1 + 0.12 * sin(t * 3 + u * 6 + ph)))); } c.lineTo(x1, sgn * 8); c.closePath();
    c.fillStyle = grad(c, 0, 0, 0, sgn * (9 + h), [[0, col], [1, "rgba(100,210,255,.7)"]]); c.fill(); c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 0.8; c.stroke(); };
  fin(-1, -6, 52, 30, "#c8226a", 0); fin(1, -10, 50, 36, "#ff3f7a", 1.5);
  // sirip perut: dua filamen panjang
  c.strokeStyle = "#ffd0e8"; c.lineWidth = 2; c.lineCap = "round"; for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(-18 + i * 6, 10); c.quadraticCurveTo(-22 + i * 8 + sw(i) * 4, 34, -14 + i * 10 + sw(i + 1) * 6, 56); c.stroke(); }
  // tubuh ramping
  const body = new Path2D(); body.moveTo(-58, 1); body.bezierCurveTo(-52, -14, -30, -17, 0, -15); body.bezierCurveTo(26, -13, 44, -7, 54, -1); body.bezierCurveTo(44, 8, 26, 15, 0, 16); body.bezierCurveTo(-30, 17, -52, 12, -58, 1); body.closePath();
  c.fillStyle = grad(c, 0, -16, 0, 17, [[0, "#ff2f6a"], [0.5, "#c1166e"], [1, "#5b1d9a"]]); c.fill(body);
  c.save(); c.clip(body); const r = rnd(3); // sisik berkilau biru-hijau
  for (let i = 0; i < 46; i++) { const x = -52 + (i % 14) * 7.6, y = -12 + Math.floor(i / 14) * 8 + (i % 2) * 3; ell(c, x, y, 3.4, 3, 0); c.fillStyle = `rgba(80,${190 + (r() * 50) | 0},255,${0.22 + 0.2 * sin(t * 4 + i)})`; c.fill(); }
  c.fillStyle = grad(c, -40, -16, 10, 0, [[0, "rgba(255,255,255,.55)"], [1, "rgba(255,255,255,0)"]]); ell(c, -22, -9, 34, 5, -0.05); c.fill(); c.restore();
  c.lineWidth = 1.6; c.strokeStyle = "rgba(60,10,60,.7)"; c.stroke(body);
  // insang, mulut, alis garang, mata emas
  c.strokeStyle = "rgba(255,200,230,.7)"; c.lineWidth = 1.4; c.beginPath(); c.arc(-30, 1, 11, -1.2, 1.2); c.stroke();
  c.strokeStyle = "rgba(60,10,40,.9)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-58, 2); c.lineTo(-50, 4); c.stroke();
  eye(c, -44, -5, 6.4, { iris: "#1a0a10", ring: "#ffcc3a", dx: -1 });
  c.strokeStyle = "#2a0a20"; c.lineWidth = 2.6; c.lineCap = "round"; c.beginPath(); c.moveTo(-53, -14); c.lineTo(-36, -9); c.stroke();
  c.restore();
  // percikan aura
  for (let i = 0; i < 7; i++) { const k = (t * 0.45 + i / 7) % 1, a = i * 1.9 + t * 0.4, x = cos(a) * (40 + k * 50), y = sin(a) * (24 + k * 34) - k * 14; ell(c, x, y, 2.2 * (1 - k) + 0.6, 2.2 * (1 - k) + 0.6); c.fillStyle = `rgba(255,${200 + (i * 8) % 55},255,${0.85 * (1 - k)})`; c.fill(); }
}

// ------------------------------------------------------------------ IKAN PRABOWO (kartun gendut berpeci & berjas — parodi FIKTIF, bukan potret)
function prabowo(c, t) {
  const bob = sin(t * 1.7) * 3, tail = sin(t * 4.2), puff = 1 + sin(t * 3.4) * 0.02;
  c.save(); c.translate(0, bob); shadow(c, 62 - bob, 58);
  // ekor
  c.save(); c.translate(54, 2); c.rotate(tail * 0.2); c.beginPath(); c.moveTo(0, -4); c.bezierCurveTo(18, -26, 36, -24, 40, -8); c.quadraticCurveTo(30, 0, 40, 10); c.bezierCurveTo(36, 26, 18, 28, 0, 6); c.closePath();
  c.fillStyle = grad(c, 0, 0, 40, 0, [[0, "#6f93aa"], [1, "#9fc0d2"]]); c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke(); c.restore();
  // tubuh gendut
  c.save(); c.scale(puff, 1 / puff); const body = new Path2D(); body.moveTo(-60, 4); body.bezierCurveTo(-64, -34, -34, -52, 0, -50); body.bezierCurveTo(36, -50, 62, -30, 62, 2); body.bezierCurveTo(62, 38, 34, 56, 0, 54); body.bezierCurveTo(-36, 54, -58, 36, -60, 4); body.closePath();
  c.fillStyle = grad(c, -30, -52, 30, 56, [[0, "#b9d4e2"], [0.5, "#8fb2c6"], [1, "#6d90a6"]]); c.fill(body);
  // jas gelap (membungkus tubuh tengah-belakang) + kemeja + dasi + lencana
  c.save(); c.clip(body);
  c.beginPath(); c.moveTo(-26, -52); c.lineTo(-30, 60); c.lineTo(34, 60); c.quadraticCurveTo(46, 0, 34, -52); c.closePath(); c.fillStyle = grad(c, -26, 0, 46, 0, [[0, "#232a36"], [1, "#171c26"]]); c.fill();
  c.beginPath(); c.moveTo(-26, -40); c.lineTo(-4, -4); c.lineTo(-24, 54); c.lineTo(-30, 60); c.lineTo(-30, -40); c.closePath();   // (tidak digambar; menjaga bentuk) 
  c.beginPath(); c.moveTo(-26, -34); c.lineTo(0, 6); c.lineTo(-26, 50); c.closePath(); c.fillStyle = "#f4f4ef"; c.fill();                 // kemeja V
  c.beginPath(); c.moveTo(-26, -34); c.lineTo(-14, -34); c.lineTo(0, 4); c.lineTo(-8, 6); c.closePath(); c.fillStyle = "#2f3744"; c.fill();   // kerah/lapel
  c.beginPath(); c.moveTo(-26, -34); c.lineTo(-38, -34); c.lineTo(-26, 4); c.closePath(); c.fillStyle = "#2f3744"; c.fill();
  c.beginPath(); c.moveTo(-18, -22); c.lineTo(-10, -18); c.lineTo(-8, 4); c.lineTo(-14, 12); c.lineTo(-20, 4); c.lineTo(-18, -18); c.closePath(); c.fillStyle = "#a31d2b"; c.fill();   // dasi merah
  ell(c, 12, -14, 3.4, 3.4); c.fillStyle = "#f0c34a"; c.fill(); c.lineWidth = 0.8; c.strokeStyle = "#7a5a10"; c.stroke();                        // lencana emas
  for (let i = 0; i < 3; i++) { ell(c, -4, 14 + i * 10, 1.8, 1.8); c.fillStyle = "#0e1118"; c.fill(); }
  c.fillStyle = grad(c, 0, -52, 0, 0, [[0, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]); ell(c, 8, -34, 36, 12, -0.1); c.fill();
  c.restore(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(body); c.restore();
  // sirip dada sebagai "lengan" dengan manset putih
  c.save(); c.translate(-6, 18); c.rotate(0.3 + sin(t * 3) * 0.12); ell(c, 0, 10, 8, 18, 0.15); c.fillStyle = "#1c222d"; c.fill(); c.lineWidth = 1.4; c.strokeStyle = OUT; c.stroke(); ell(c, 2, 24, 7, 6, 0); c.fillStyle = "#8fb2c6"; c.fill(); c.stroke(); c.restore();
  // peci hitam
  c.save(); c.translate(-24, -46); c.rotate(-0.08); c.beginPath(); c.moveTo(-17, 6); c.lineTo(-14, -14); c.quadraticCurveTo(0, -19, 14, -14); c.lineTo(17, 6); c.quadraticCurveTo(0, 12, -17, 6); c.closePath();
  c.fillStyle = grad(c, 0, -18, 0, 10, [[0, "#2c2c34"], [1, "#09090c"]]); c.fill(); c.lineWidth = 1.6; c.strokeStyle = "#000"; c.stroke();
  c.strokeStyle = "rgba(255,255,255,.28)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-12, -9); c.quadraticCurveTo(0, -13, 11, -9); c.stroke(); c.restore();
  // wajah tegas tapi lucu: mata bulat besar, alis menukik, mulut datar kecil, pipi
  eye(c, -34, -20, 9, { dx: -1.5, dy: 1, pr: 0.62 }); eye(c, -12, -22, 7, { dx: -1.2, dy: 1, pr: 0.62, sx: 0.9 });
  c.strokeStyle = "#1a1a20"; c.lineWidth = 3.4; c.lineCap = "round"; c.beginPath(); c.moveTo(-46, -34); c.lineTo(-27, -28); c.stroke(); c.beginPath(); c.moveTo(-20, -30); c.lineTo(-5, -33); c.stroke();
  c.lineWidth = 2.4; c.beginPath(); c.moveTo(-50, 4); c.quadraticCurveTo(-42, 7, -34, 3); c.stroke();
  ell(c, -40, -4, 6, 4, 0); c.fillStyle = "rgba(255,130,130,.4)"; c.fill();
  // gelembung
  const k = (t * 0.5) % 1; ell(c, -64 - k * 4, -10 - k * 30, 2.6 * (1 - k * 0.4), 2.6 * (1 - k * 0.4)); c.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; c.lineWidth = 1.2; c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ ARAPAIMA GIGAS (raksasa bersisik detail, gerak berat)
function arapaima(c, t) {
  const k = t * 1.1, L0 = -96, L1 = 92, N = 26, w = (x) => sin(k - (x - L0) * 0.035) * (3 + (x - L0) * 0.03);   // gelombang tubuh melambat di kepala
  const half = (x) => { const u = (x - L0) / (L1 - L0); return 6 + 20 * Math.pow(sin(Math.min(1, u * 1.05 + 0.05) * Math.PI * 0.82 + 0.12), 0.7) * (1 - 0.25 * u); };
  shadow(c, 38, 90);
  // sirip punggung/dubur di belakang + ekor membulat
  const tailW = w(L1); c.save(); c.translate(L1 - 4, tailW);
  c.beginPath(); c.moveTo(0, -6); c.bezierCurveTo(14, -26, 30, -22, 30, 0); c.bezierCurveTo(30, 22, 14, 26, 0, 6); c.closePath(); c.fillStyle = grad(c, 0, 0, 30, 0, [[0, "#9c2a1a"], [1, "#3b1a14"]]); c.rotate(sin(k - 3) * 0.1); c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke(); c.restore();
  const fin = (x0, x1, sgn, h) => { c.beginPath(); c.moveTo(x0, w(x0) + sgn * half(x0) * 0.8); const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6, x = x0 + (x1 - x0) * u; pts.push([x, w(x) + sgn * (half(x) * 0.8 + h * sin(u * Math.PI * 0.9))]); } pts.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(x1, w(x1) + sgn * half(x1) * 0.7); c.closePath(); c.fillStyle = "#7b2417"; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke(); };
  fin(46, 82, -1, 14); fin(44, 80, 1, 12);
  // tubuh: poligon dari kontur atas/bawah bergelombang
  const body = new Path2D(); for (let i = 0; i <= N; i++) { const x = L0 + (L1 - L0) * i / N; (i ? body.lineTo : body.moveTo).call(body, x, w(x) - half(x)); }
  for (let i = N; i >= 0; i--) { const x = L0 + (L1 - L0) * i / N; body.lineTo(x, w(x) + half(x) * 0.92); } body.closePath();
  c.fillStyle = grad(c, 0, -28, 0, 26, [[0, "#3f5a2e"], [0.45, "#6f8a4a"], [0.62, "#b9bf9a"], [1, "#e4e6d2"]]); c.fill(body);
  c.save(); c.clip(body);
  // sisik besar berpola; makin ke belakang makin merah-oranye bertepi gelap
  for (let row = -3; row <= 3; row++) for (let i = 0; i < 20; i++) { const x = L0 + 14 + i * 9.6 + (row & 1 ? 4.8 : 0), y = w(x) + row * 7.4 + 1, u = (x - L0) / (L1 - L0), red = Math.max(0, (u - 0.48) / 0.52);
    const base = red > 0.05 ? mixc("#8a9a62", "#c4401f", Math.min(1, red * 1.25)) : (row < 0 ? "#60803f" : "#a9b48a");
    ell(c, x, y, 5.6, 4.6, 0); c.fillStyle = base; c.fill(); c.lineWidth = 1; c.strokeStyle = red > 0.2 ? "rgba(50,12,8,.65)" : "rgba(30,50,25,.5)"; c.stroke();
    ell(c, x - 1.4, y - 1.4, 2.2, 1.5, -0.4); c.fillStyle = "rgba(255,255,230,.28)"; c.fill(); }
  const sh = ((t * 0.18) % 1.4 - 0.2) * (L1 - L0) + L0; c.fillStyle = grad(c, sh - 20, 0, sh + 20, 0, [[0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,.28)"], [1, "rgba(255,255,255,0)"]]); c.fillRect(sh - 20, -40, 40, 80);  // kilau menyapu pelan
  c.fillStyle = grad(c, 0, -30, 0, -6, [[0, "rgba(255,255,255,.18)"], [1, "rgba(255,255,255,0)"]]); c.fillRect(L0, -30, L1 - L0, 26);
  c.restore(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(body);
  // kepala: rahang bawah menjorok, mulut mendongak, tutup insang, mata kecil emas
  c.save(); c.translate(L0, w(L0)); c.beginPath(); c.moveTo(0, 0); c.lineTo(14, 6); c.stroke(); c.restore();
  const hy = w(L0 + 8); c.strokeStyle = "rgba(25,35,20,.85)"; c.lineWidth = 2; c.beginPath(); c.moveTo(L0 + 2, hy + 2); c.quadraticCurveTo(L0 + 18, hy + 8, L0 + 30, hy + 2); c.stroke();
  c.strokeStyle = "rgba(25,35,20,.6)"; c.lineWidth = 1.6; c.beginPath(); c.arc(L0 + 40, w(L0 + 40) + 2, 14, -1.3, 1.3); c.stroke();
  eye(c, L0 + 22, w(L0 + 22) - 7, 4.4, { iris: "#1a1208", ring: "#e0b030", dx: -0.5 });
  // sirip dada besar
  c.save(); c.translate(L0 + 46, w(L0 + 46) + 14); c.rotate(0.5 + sin(k * 1.5) * 0.12); ell(c, 0, 8, 7, 16, 0.2); c.fillStyle = "#8c6a3a"; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke(); c.restore();
}

const FN = { sf_tempe: tempe, sf_cupang_slayer: cupang, sf_prabowo: prabowo, sf_arapaima: arapaima };
const EXTENT = { sf_tempe: 150, sf_cupang_slayer: 230, sf_prabowo: 150, sf_arapaima: 215 };   // lebar logis (untuk menskalakan agar muat)
function draw(c, id, cx, cy, L, t) {
  const f = FN[id]; if (!f) return; const s = L / (EXTENT[id] || 160);
  c.save(); c.translate(cx, cy); c.scale(s, s); c.lineJoin = "round"; f(c, t || 0); c.restore();
}
const sprites = {};
function sprite(id, w, h) {   // PNG statis (dex/ikon) di-cache: satu kali gambar per ikan
  const k = id + "|" + w + "x" + h; if (sprites[k]) return sprites[k];
  const cv = document.createElement("canvas"); cv.width = w * 2; cv.height = h * 2; const c = cv.getContext("2d"); c.scale(2, 2); draw(c, id, w / 2, h / 2, Math.min(w * 0.92, h * 1.5), 0.6);
  return (sprites[k] = cv.toDataURL());
}
NW.sfDraw = { draw, sprite, FN };
})();
