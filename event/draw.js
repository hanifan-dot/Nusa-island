// =========================================================
//  NUSA ISLAND — Event 5 Monster Legenda: GAMBAR MONSTER (Canvas 2D murni, ringan untuk Android; tanpa gambar tempelan, tanpa engine 3D).
//  Setiap monster = badan bertulang punggung yang BENAR-BENAR berombak (ekor mengayun, badan meliuk) + bentuk, warna, sirip, dan efek sendiri.
//  API: NW.eventDraw.monster(ctx, id, o) · .spawnFx(ctx, id, o) · .wake(ctx, id, o) · .icon(canvas, id, opts)
//   o = { x, y (pusat badan di layar), size (panjang badan px), dir (+1 kanan / -1 kiri), t (detik), depth 0..1, vis 0..1, spawn 0..1, thrash 0..1, speed }
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixh = (a, b, t) => { const A = rgb(a), B = rgb(b); return "#" + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, "0")).join(""); };
const rgba = (h, a) => { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

// ---- spesifikasi badan: len = panjang relatif di layar, top/bot = tebal di atas/bawah tulang punggung (kepala→pangkal ekor), freq/amp/wave = ayunan ----
const SP = {
  toman_purba: { len: 0.46, freq: 1.5, amp: 0.05, wave: 4.6, n: 30, top: [0.012, 0.045, 0.075, 0.09, 0.095, 0.09, 0.075, 0.05, 0.03], bot: [0.012, 0.04, 0.066, 0.08, 0.085, 0.08, 0.066, 0.045, 0.028],
    pal: { back: "#3d4d22", flank: "#667836", belly: "#d4c486", fin: "#34401f", edge: "#e8922c", eye: "#ffd24a", mark: "#1d2a12", water: "#6b5b34" } },
  jurung_mahkota: { len: 0.54, freq: 1.7, amp: 0.045, wave: 4.2, n: 30, top: [0.015, 0.075, 0.13, 0.15, 0.145, 0.12, 0.085, 0.052, 0.034], bot: [0.015, 0.07, 0.12, 0.14, 0.135, 0.11, 0.078, 0.048, 0.032],
    pal: { back: "#a96d17", flank: "#e2a93a", belly: "#f7e4a0", fin: "#d8532a", edge: "#ffd36a", eye: "#e1262c", mark: "#8e5410", water: "#2f7c86" } },
  barakuda_guntur: { len: 0.7, freq: 3.2, amp: 0.035, wave: 5.6, n: 34, top: [0.008, 0.026, 0.045, 0.054, 0.056, 0.052, 0.044, 0.032, 0.02], bot: [0.008, 0.022, 0.04, 0.049, 0.05, 0.046, 0.04, 0.03, 0.019],
    pal: { back: "#3f5f86", flank: "#aac4de", belly: "#eef5fb", fin: "#e8c13a", edge: "#fff1a8", eye: "#fff7c2", mark: "#1f3048", water: "#2f7fa3" } },
  kuwe_titan: { len: 0.82, freq: 1.3, amp: 0.03, wave: 4.0, n: 34, top: [0.02, 0.1, 0.17, 0.19, 0.18, 0.145, 0.1, 0.06, 0.036], bot: [0.02, 0.07, 0.14, 0.18, 0.18, 0.15, 0.1, 0.058, 0.034],
    pal: { back: "#35546e", flank: "#8fb0c6", belly: "#e6eef2", fin: "#1e3248", edge: "#f1cf4d", eye: "#fff3b0", mark: "#25384c", water: "#1fa3b0" } },
  megalodon_bayangan: { len: 1.18, freq: 0.85, amp: 0.035, wave: 3.4, n: 38, top: [0.012, 0.06, 0.12, 0.155, 0.16, 0.13, 0.092, 0.055, 0.034], bot: [0.012, 0.055, 0.105, 0.14, 0.145, 0.118, 0.085, 0.05, 0.03],
    pal: { back: "#161d38", flank: "#2c3a68", belly: "#8d9cc6", fin: "#10162c", edge: "#5ae0ff", eye: "#7cf3ff", mark: "#6cd8ff", water: "#0a2a55" } },
};
const prof = (a, u) => { const f = clamp(u, 0, 1) * (a.length - 1), i = Math.min(a.length - 2, f | 0); return lerp(a[i], a[i + 1], f - i); };

// ---- geometri badan: titik tulang punggung (kepala di +x) ----
function geom(sp, t, o) {
  const N = sp.n, pts = [], ph = t * sp.freq * TAU * (1 + (o.speed || 0) * 0.5), amp = sp.amp * (1 + (o.thrash || 0) * 2.4), bend = o.bend || 0;
  for (let i = 0; i <= N; i++) {
    const u = i / N, X = 0.5 - u, y = amp * Math.sin(ph - u * sp.wave) * (0.1 + 0.9 * u * u) + bend * u * u * 0.3 + (o.thrash ? Math.sin(t * 17 + u * 6) * 0.012 * o.thrash * u : 0);
    pts.push({ u, x: X, y, th: prof(sp.top, u), bh: prof(sp.bot, u) });
  }
  return pts;
}
const at = (g, u) => g[clamp(Math.round(u * (g.length - 1)), 0, g.length - 1)];
function bodyPath(c, g) {
  c.beginPath(); c.moveTo(g[0].x, g[0].y - g[0].th);
  for (let i = 1; i < g.length; i++) c.lineTo(g[i].x, g[i].y - g[i].th);
  for (let i = g.length - 1; i >= 0; i--) c.lineTo(g[i].x, g[i].y + g[i].bh);
  c.closePath();
}
function finPoly(c, g, u0, u1, h, sweep, side) {   // sirip di punggung (side=-1) / perut (side=+1); h = tinggi, sweep 0..1 = condong ke belakang
  const a = at(g, u0), b = at(g, u1), m = lerp(u0, u1, 0.3 + 0.5 * sweep), pk = at(g, m);
  const ya = side < 0 ? a.y - a.th : a.y + a.bh, yb = side < 0 ? b.y - b.th : b.y + b.bh, ym = side < 0 ? pk.y - pk.th : pk.y + pk.bh;
  c.beginPath(); c.moveTo(a.x, ya);
  c.quadraticCurveTo(lerp(a.x, pk.x, 0.4), ym + side * h * 0.35, pk.x - 0.01 * sweep, ym + side * h);
  c.quadraticCurveTo(lerp(pk.x, b.x, 0.5), yb + side * h * 0.25, b.x, yb);
  c.closePath();
}
function eye(c, g, u, dy, r, p) {
  const e = at(g, u); c.fillStyle = "#0b0f14"; c.beginPath(); c.arc(e.x, e.y + dy, r * 1.25, 0, TAU); c.fill();
  c.fillStyle = p.eye; c.beginPath(); c.arc(e.x, e.y + dy, r, 0, TAU); c.fill();
  c.fillStyle = "#000"; c.beginPath(); c.arc(e.x + r * 0.15, e.y + dy, r * 0.5, 0, TAU); c.fill();
}
function tailGeom(g) { const a = g[g.length - 1], b = g[g.length - 4]; return { x: a.x, y: a.y, th: Math.atan2(a.y - b.y, a.x - b.x) }; }
function stripeClip(c, g, fn) { c.save(); bodyPath(c, g); c.clip(); fn(); c.restore(); }
function bodyGrad(c, g, p) {
  const gr = c.createLinearGradient(0, -0.2, 0, 0.2);
  gr.addColorStop(0, p.back); gr.addColorStop(0.45, p.flank); gr.addColorStop(0.8, p.belly); gr.addColorStop(1, p.belly); return gr;
}

// ---- gambar per spesies (koordinat lokal: panjang badan = 1, kepala di +x) ----
const DRAW = {
  toman_purba(c, g, t, p, o) {
    const tl = tailGeom(g), px = 1 / (o.size || 300);
    // sirip punggung panjang menyatu & sirip dubur
    c.fillStyle = p.fin; finPoly(c, g, 0.22, 0.86, 0.06, 0.15, -1); c.fill(); c.strokeStyle = p.edge; c.lineWidth = 2.2 * px; c.stroke();
    finPoly(c, g, 0.5, 0.86, 0.04, 0.2, 1); c.fill(); c.stroke();
    // ekor kipas membulat
    c.save(); c.translate(tl.x, tl.y); c.rotate(tl.th); c.fillStyle = p.fin; c.beginPath(); c.moveTo(0.01, 0);
    c.bezierCurveTo(-0.05, -0.1, -0.16, -0.085, -0.17, 0); c.bezierCurveTo(-0.16, 0.085, -0.05, 0.1, 0.01, 0); c.fill(); c.strokeStyle = p.edge; c.lineWidth = 2.2 * px; c.stroke();
    c.strokeStyle = rgba(p.edge, 0.55); c.lineWidth = px; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(-0.16, i * 0.028); c.stroke(); } c.restore();
    // sirip dada
    const pf = at(g, 0.27); c.save(); c.translate(pf.x, pf.y + pf.bh * 0.55); c.rotate(0.5 + Math.sin(t * 5) * 0.25); c.fillStyle = p.fin; c.beginPath(); c.ellipse(-0.03, 0.01, 0.045, 0.02, 0, 0, TAU); c.fill(); c.restore();
    // badan
    bodyPath(c, g); c.fillStyle = bodyGrad(c, g, p); c.fill();
    stripeClip(c, g, () => {
      c.strokeStyle = p.mark; c.lineWidth = 7 * px; c.lineCap = "round"; c.globalAlpha = 0.85;
      for (let u = 0.2; u < 0.92; u += 0.075) { const a = at(g, u), b = at(g, u + 0.04); c.beginPath(); c.moveTo(a.x, a.y - a.th * 0.2); c.lineTo(b.x, b.y + b.bh * 0.15 - 0.01); c.stroke(); }   // garis belang gelap di sisi badan
      c.globalAlpha = 0.5; c.fillStyle = "#2c4a1a"; for (let i = 0; i < 9; i++) { const q = at(g, 0.1 + i * 0.09); c.beginPath(); c.ellipse(q.x, q.y - q.th * (0.35 + (i % 3) * 0.12), 0.02, 0.01, 0, 0, TAU); c.fill(); }   // lumut purba
      c.globalAlpha = 0.7; c.strokeStyle = "#e7e0c0"; c.lineWidth = 2 * px; for (let i = 0; i < 4; i++) { const q = at(g, 0.3 + i * 0.13); c.beginPath(); c.moveTo(q.x, q.y - 0.02); c.lineTo(q.x - 0.03, q.y + 0.025); c.stroke(); }   // bekas luka
      c.globalAlpha = 1;
    });
    // kepala pipih lebar, rahang bawah menonjol, mata kuning menyala
    const h0 = at(g, 0.01), h1 = at(g, 0.14); c.strokeStyle = "#1a1f10"; c.lineWidth = 3 * px; c.beginPath(); c.moveTo(h0.x, h0.y + 0.012); c.quadraticCurveTo(lerp(h0.x, h1.x, 0.5), h0.y + 0.03, h1.x + 0.03, h1.y + 0.018); c.stroke();
    c.fillStyle = "#f4efd0"; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(h0.x - 0.012 - i * 0.017, h0.y + 0.016 + i * 0.002); c.lineTo(h0.x - 0.019 - i * 0.017, h0.y + 0.03); c.lineTo(h0.x - 0.026 - i * 0.017, h0.y + 0.017); c.fill(); }
    eye(c, g, 0.095, -0.028, 0.011, p);
  },
  jurung_mahkota(c, g, t, p, o) {
    const tl = tailGeom(g), px = 1 / (o.size || 300);
    c.fillStyle = p.fin; finPoly(c, g, 0.3, 0.7, 0.12, 0.35, -1); c.fill(); c.strokeStyle = p.edge; c.lineWidth = 2.5 * px; c.stroke();
    finPoly(c, g, 0.55, 0.78, 0.08, 0.3, 1); c.fill(); c.stroke();
    // ekor bercabang lebar
    c.save(); c.translate(tl.x, tl.y); c.rotate(tl.th + Math.sin(t * 6) * 0.05); c.fillStyle = p.fin; c.beginPath(); c.moveTo(0.015, 0);
    c.quadraticCurveTo(-0.05, -0.04, -0.17, -0.14); c.quadraticCurveTo(-0.12, -0.02, -0.095, 0); c.quadraticCurveTo(-0.12, 0.02, -0.17, 0.14); c.quadraticCurveTo(-0.05, 0.04, 0.015, 0); c.fill(); c.strokeStyle = p.edge; c.lineWidth = 2.4 * px; c.stroke(); c.restore();
    const pf = at(g, 0.3); c.save(); c.translate(pf.x, pf.y + pf.bh * 0.5); c.rotate(0.6 + Math.sin(t * 4) * 0.22); c.fillStyle = rgba(p.fin, 0.95); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-0.07, 0.01, -0.095, 0.075); c.quadraticCurveTo(-0.03, 0.04, 0, 0); c.fill(); c.restore();
    bodyPath(c, g); c.fillStyle = bodyGrad(c, g, p); c.fill();
    stripeClip(c, g, () => {   // sisik besar berkilau
      c.strokeStyle = rgba(p.mark, 0.55); c.lineWidth = 1.6 * px;
      for (let row = -3; row <= 3; row++) for (let u = 0.2; u < 0.9; u += 0.04) { const q = at(g, u + (row & 1) * 0.02); c.beginPath(); c.arc(q.x, q.y + row * 0.026, 0.021, -0.3, Math.PI + 0.3); c.stroke(); }
      const sh = (Math.sin(t * 2.2) * 0.5 + 0.5); const gr = c.createLinearGradient(-0.5, 0, 0.5, 0); gr.addColorStop(clamp(sh - 0.12, 0, 1), "rgba(255,246,190,0)"); gr.addColorStop(sh, "rgba(255,246,190,.55)"); gr.addColorStop(clamp(sh + 0.12, 0, 1), "rgba(255,246,190,0)");
      c.fillStyle = gr; c.fillRect(-0.6, -0.3, 1.2, 0.6);
    });
    // MAHKOTA: duri emas di atas kepala + sungut panjang
    const cr = [0.1, 0.15, 0.2, 0.25, 0.3]; c.fillStyle = "#ffd24a"; c.strokeStyle = "#a66a0c"; c.lineWidth = 1.6 * px;
    cr.forEach((u, i) => { const q = at(g, u), h = 0.06 + (i === 2 ? 0.045 : i % 2 ? 0 : 0.015), y0 = q.y - q.th * 0.95; c.beginPath(); c.moveTo(q.x + 0.018, y0 + 0.004); c.lineTo(q.x - 0.0, y0 - h); c.lineTo(q.x - 0.018, y0 + 0.004); c.closePath(); c.fill(); c.stroke(); });
    c.strokeStyle = "#ffe08a"; c.lineWidth = 2.2 * px; c.lineCap = "round"; const m0 = at(g, 0.015);
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(m0.x, m0.y + 0.012); c.bezierCurveTo(m0.x + 0.05, m0.y + 0.04 + s * 0.01, m0.x + 0.07, m0.y + 0.1 + Math.sin(t * 3 + s) * 0.015, m0.x + 0.03, m0.y + 0.14); c.stroke(); }
    c.strokeStyle = "#5a3408"; c.lineWidth = 2.4 * px; c.beginPath(); c.moveTo(m0.x, m0.y + 0.014); c.lineTo(at(g, 0.1).x, at(g, 0.1).y + 0.03); c.stroke();
    eye(c, g, 0.1, -0.012, 0.014, p);
    const gl = at(g, 0.14); c.strokeStyle = rgba("#7a4a0c", 0.8); c.lineWidth = 2 * px; c.beginPath(); c.arc(gl.x, gl.y, gl.th * 0.9, 1.3, 2.7); c.stroke();   // tutup insang
  },
  barakuda_guntur(c, g, t, p, o) {
    const tl = tailGeom(g), px = 1 / (o.size || 300);
    // dua sirip punggung berduri terpisah, sirip dubur
    c.fillStyle = p.fin; finPoly(c, g, 0.36, 0.46, 0.05, 0.1, -1); c.fill(); finPoly(c, g, 0.66, 0.76, 0.045, 0.4, -1); c.fill(); finPoly(c, g, 0.64, 0.74, 0.04, 0.4, 1); c.fill();
    c.save(); c.translate(tl.x, tl.y); c.rotate(tl.th + Math.sin(t * 11) * 0.08); c.fillStyle = p.fin; c.beginPath(); c.moveTo(0.01, 0);
    c.quadraticCurveTo(-0.04, -0.03, -0.13, -0.1); c.quadraticCurveTo(-0.09, -0.01, -0.075, 0); c.quadraticCurveTo(-0.09, 0.01, -0.13, 0.1); c.quadraticCurveTo(-0.04, 0.03, 0.01, 0); c.fill(); c.strokeStyle = p.edge; c.lineWidth = 2 * px; c.stroke(); c.restore();
    const pf = at(g, 0.22); c.save(); c.translate(pf.x, pf.y + pf.bh * 0.5); c.rotate(0.9 + Math.sin(t * 7) * 0.15); c.fillStyle = p.fin; c.beginPath(); c.moveTo(0, 0); c.lineTo(-0.06, 0.012); c.lineTo(-0.075, 0.05); c.closePath(); c.fill(); c.restore();
    bodyPath(c, g); c.fillStyle = bodyGrad(c, g, p); c.fill();
    stripeClip(c, g, () => {
      c.fillStyle = rgba(p.mark, 0.8); for (let i = 0; i < 9; i++) { const q = at(g, 0.22 + i * 0.075); c.beginPath(); c.moveTo(q.x + 0.014, q.y - q.th); c.lineTo(q.x - 0.004, q.y - q.th * 0.1); c.lineTo(q.x + 0.014, q.y + q.bh * 0.5); c.lineTo(q.x - 0.022, q.y - q.th * 0.1); c.closePath(); c.fill(); }   // belang miring seperti sambaran petir
      c.strokeStyle = "rgba(180,240,255,.9)"; c.lineWidth = 2.4 * px; c.beginPath(); for (let i = 0; i <= 18; i++) { const q = at(g, 0.05 + i * 0.05); i ? c.lineTo(q.x, q.y - 0.002) : c.moveTo(q.x, q.y - 0.002); } c.stroke();   // garis sisi menyala
    });
    // moncong panjang dengan gigi runcing + rahang bawah menonjol
    const s0 = at(g, 0.0), s1 = at(g, 0.13); c.strokeStyle = "#12202f"; c.lineWidth = 2.6 * px; c.beginPath(); c.moveTo(s0.x, s0.y + 0.006); c.lineTo(s1.x + 0.02, s1.y + 0.012); c.stroke();
    c.fillStyle = "#fff"; for (let i = 0; i < 7; i++) { const x = s0.x - 0.005 - i * 0.012, y = s0.y + 0.007 + i * 0.0012; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 0.004, y + 0.013); c.lineTo(x - 0.009, y); c.fill(); }
    eye(c, g, 0.11, -0.006, 0.0105, p);
  },
  kuwe_titan(c, g, t, p, o) {
    const tl = tailGeom(g), px = 1 / (o.size || 300);
    // sirip punggung kedua & dubur membentuk sabit panjang, ekor sabit raksasa
    c.fillStyle = p.fin; finPoly(c, g, 0.3, 0.42, 0.06, 0.2, -1); c.fill(); finPoly(c, g, 0.5, 0.78, 0.15, 0.1, -1); c.fill(); c.strokeStyle = p.edge; c.lineWidth = 2.4 * px; c.stroke(); finPoly(c, g, 0.52, 0.76, 0.14, 0.1, 1); c.fill(); c.stroke();
    c.save(); c.translate(tl.x, tl.y); c.rotate(tl.th + Math.sin(t * 5.5) * 0.06); c.fillStyle = p.fin; c.beginPath(); c.moveTo(0.02, 0);
    c.quadraticCurveTo(-0.05, -0.05, -0.19, -0.2); c.quadraticCurveTo(-0.11, -0.03, -0.1, 0); c.quadraticCurveTo(-0.11, 0.03, -0.19, 0.2); c.quadraticCurveTo(-0.05, 0.05, 0.02, 0); c.fill(); c.strokeStyle = p.edge; c.lineWidth = 2.6 * px; c.stroke(); c.restore();
    const pf = at(g, 0.26); c.save(); c.translate(pf.x, pf.y + pf.bh * 0.6); c.rotate(0.8 + Math.sin(t * 3.2) * 0.2); c.fillStyle = p.fin; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-0.1, 0.0, -0.16, 0.1); c.quadraticCurveTo(-0.05, 0.06, 0, 0); c.fill(); c.restore();
    bodyPath(c, g); c.fillStyle = bodyGrad(c, g, p); c.fill();
    stripeClip(c, g, () => {
      c.strokeStyle = rgba("#ffffff", 0.18); c.lineWidth = 1.4 * px; for (let r = -4; r <= 4; r++) for (let u = 0.15; u < 0.92; u += 0.05) { const q = at(g, u + (r & 1) * 0.025); c.beginPath(); c.arc(q.x, q.y + r * 0.03, 0.026, -0.35, Math.PI + 0.35); c.stroke(); }
      c.fillStyle = rgba(p.mark, 0.5); const q = at(g, 0.3); c.beginPath(); c.ellipse(q.x, q.y - q.th * 0.55, 0.12, 0.03, -0.1, 0, TAU); c.fill();   // punggung lebih gelap seperti baja
      const sh = (t * 0.35) % 1.6 - 0.3; const gr = c.createLinearGradient(sh - 0.2, -0.2, sh + 0.05, 0.2); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(-0.7, -0.3, 1.4, 0.6);
    });
    c.fillStyle = "#162434"; for (let i = 0; i < 7; i++) { const q = at(g, 0.76 + i * 0.03); c.beginPath(); c.ellipse(q.x, q.y, 0.011, 0.009 + i * 0.001, 0, 0, TAU); c.fill(); }   // sisik keras pangkal ekor
    // kepala tumpul curam, bibir tebal, mata besar
    const m = at(g, 0.01); c.strokeStyle = "#101c28"; c.lineWidth = 3.2 * px; c.beginPath(); c.moveTo(m.x, m.y + 0.01); c.quadraticCurveTo(m.x - 0.05, m.y + 0.045, at(g, 0.13).x, at(g, 0.13).y + 0.03); c.stroke();
    c.fillStyle = "#9db3c4"; c.beginPath(); c.ellipse(m.x - 0.014, m.y + 0.025, 0.02, 0.013, 0.4, 0, TAU); c.fill();
    eye(c, g, 0.11, -0.022, 0.024, p);
    const gl = at(g, 0.2); c.strokeStyle = rgba("#0d1a26", 0.7); c.lineWidth = 2.4 * px; c.beginPath(); c.arc(gl.x, gl.y - 0.01, gl.th * 0.9, 1.4, 2.8); c.stroke();
  },
  megalodon_bayangan(c, g, t, p, o) {
    const tl = tailGeom(g), px = 1 / (o.size || 300), gl = 0.55 + 0.45 * Math.sin(t * 2.4);
    // ekor sabit (cuping atas panjang), sirip dada seperti sayap, sirip punggung tinggi bergerigi
    c.save(); c.translate(tl.x, tl.y); c.rotate(tl.th + Math.sin(t * 3) * 0.05); c.fillStyle = p.fin; c.beginPath(); c.moveTo(0.02, 0);
    c.quadraticCurveTo(-0.04, -0.07, -0.17, -0.26); c.quadraticCurveTo(-0.13, -0.05, -0.1, -0.005); c.quadraticCurveTo(-0.11, 0.05, -0.18, 0.14); c.quadraticCurveTo(-0.05, 0.04, 0.02, 0); c.fill();
    c.strokeStyle = rgba(p.edge, 0.55 * gl + 0.2); c.lineWidth = 2.4 * px; c.stroke(); c.restore();
    const pf = at(g, 0.3); c.save(); c.translate(pf.x, pf.y + pf.bh * 0.5); c.rotate(0.55 + Math.sin(t * 1.6) * 0.1); c.fillStyle = p.fin; c.beginPath(); c.moveTo(0.03, 0); c.quadraticCurveTo(-0.1, 0.02, -0.28, 0.2); c.quadraticCurveTo(-0.1, 0.1, -0.02, 0.06); c.closePath(); c.fill(); c.strokeStyle = rgba(p.edge, 0.4); c.lineWidth = 2 * px; c.stroke(); c.restore();
    finPoly(c, g, 0.32, 0.55, 0.3, 0.7, -1); c.fillStyle = p.fin; c.fill(); c.strokeStyle = rgba(p.edge, 0.7 * gl + 0.15); c.lineWidth = 2.6 * px; c.stroke();
    finPoly(c, g, 0.7, 0.78, 0.06, 0.4, -1); c.fillStyle = p.fin; c.fill(); finPoly(c, g, 0.7, 0.78, 0.05, 0.4, 1); c.fill();
    bodyPath(c, g); const gr = c.createLinearGradient(0, -0.2, 0, 0.2); gr.addColorStop(0, p.back); gr.addColorStop(0.5, p.flank); gr.addColorStop(0.62, mixh(p.flank, p.belly, 0.55)); gr.addColorStop(1, p.belly); c.fillStyle = gr; c.fill();
    stripeClip(c, g, () => {
      c.fillStyle = rgba(p.mark, 0.35 + 0.4 * gl); for (let i = 0; i < 26; i++) { const q = at(g, 0.12 + (i % 13) * 0.058); c.beginPath(); c.arc(q.x, q.y + (i < 13 ? -0.012 : 0.022) + Math.sin(i * 1.7) * 0.01, 0.0045 + (i % 3) * 0.0012, 0, TAU); c.fill(); }   // bintik cahaya hantu di sisi badan
      c.strokeStyle = rgba(p.mark, 0.25 * gl + 0.08); c.lineWidth = 1.6 * px; for (let i = 0; i < 5; i++) { const q = at(g, 0.21 + i * 0.014); c.beginPath(); c.moveTo(q.x, q.y - 0.045); c.quadraticCurveTo(q.x - 0.016, q.y - 0.005, q.x, q.y + 0.04); c.stroke(); }   // lima celah insang
    });
    bodyPath(c, g); c.strokeStyle = rgba(p.edge, 0.35 + 0.3 * gl); c.lineWidth = 2 * px; c.stroke();   // cahaya tepi ala bayangan
    // mulut raksasa sedikit terbuka dengan deret gigi
    const m0 = at(g, 0.01), m1 = at(g, 0.2); c.fillStyle = "#07090f"; c.beginPath(); c.moveTo(m0.x - 0.005, m0.y + 0.016); c.quadraticCurveTo(lerp(m0.x, m1.x, 0.5), m0.y + 0.1, m1.x, m1.y + 0.03); c.quadraticCurveTo(lerp(m0.x, m1.x, 0.5), m0.y + 0.05, m0.x - 0.005, m0.y + 0.016); c.fill();
    c.fillStyle = "#e9eef6"; for (let i = 0; i < 9; i++) { const u = i / 8, x = lerp(m0.x - 0.004, m1.x, u), y = lerp(m0.y + 0.018, m1.y + 0.03, u) + Math.sin(u * 3.14) * 0.012; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 0.007, y + 0.024); c.lineTo(x - 0.014, y); c.fill(); c.beginPath(); c.moveTo(x, y + 0.045 - Math.sin(u * 3.14) * 0.005); c.lineTo(x - 0.007, y + 0.024); c.lineTo(x - 0.014, y + 0.045); c.fill(); }
    // mata menyala
    const e = at(g, 0.115); c.fillStyle = "#04060b"; c.beginPath(); c.arc(e.x, e.y - 0.012, 0.016, 0, TAU); c.fill(); c.fillStyle = rgba(p.eye, 0.7 + 0.3 * gl); c.beginPath(); c.arc(e.x, e.y - 0.012, 0.0085, 0, TAU); c.fill();
    c.fillStyle = rgba(p.eye, 0.18 * gl); c.beginPath(); c.arc(e.x, e.y - 0.012, 0.045, 0, TAU); c.fill();
  },
};

// ---- menggambar satu monster: bayangan di air, dua lapis (di atas / di bawah garis air), dan efek tepi ----
function monster(c, id, o) {
  const sp = SP[id], fn = DRAW[id]; if (!sp || !fn) return;
  const size = o.size, depth = clamp(o.depth || 0, 0, 1), vis = o.vis === undefined ? 1 : clamp(o.vis, 0, 1); if (vis <= 0.01) return;
  const t = o.t || 0, g = geom(sp, t, o), p = sp.pal;
  c.save(); c.translate(o.x, o.y); c.scale((o.dir || 1) * size, size);
  c.rotate((o.tilt || 0) * (o.dir || 1));
  // bayangan raksasa di bawah permukaan
  c.save(); c.globalAlpha = vis * (0.2 + 0.42 * depth); c.fillStyle = id === "megalodon_bayangan" ? "#020610" : "#04101a";
  c.beginPath(); c.ellipse(0.03, 0.12 + depth * 0.04, 0.5 * (id === "megalodon_bayangan" ? 1.12 : 1.02), 0.075 + 0.035 * depth, 0, 0, TAU); c.fill(); c.restore();
  const wl = 0.035 + depth * 0.2 + (o.sink || 0) * 0.1;      // garis air (koordinat lokal): makin dalam → makin tinggi di atas badan (badan makin tenggelam)
  const wy = (x) => wl + Math.sin(t * 2.2 + x * 9) * 0.006 + (o.thrash ? Math.sin(t * 13 + x * 20) * 0.01 * o.thrash : 0);
  // lapis atas (tepat seperti warna aslinya)
  c.save(); c.globalAlpha = vis; c.beginPath(); c.moveTo(-0.9, -0.9); c.lineTo(0.9, -0.9); for (let x = 0.9; x >= -0.9; x -= 0.1) c.lineTo(x, wy(x)); c.closePath(); c.clip(); fn(c, g, t, p, o); c.restore();
  // lapis bawah (terlihat dari dalam air: lebih gelap & kebiruan)
  const tint = Object.assign({}, p); for (const k of ["back", "flank", "belly", "fin", "edge", "mark"]) tint[k] = mixh(p[k], p.water, 0.5 + 0.2 * depth);
  c.save(); c.globalAlpha = vis * (0.82 - 0.3 * depth); c.beginPath(); c.moveTo(-0.9, 0.9); c.lineTo(0.9, 0.9); for (let x = 0.9; x >= -0.9; x -= 0.1) c.lineTo(x, wy(x)); c.closePath(); c.clip(); fn(c, g, t, tint, o); c.restore();
  // buih garis air
  c.save(); c.globalAlpha = vis * 0.8; c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 2.2 / size; c.beginPath(); for (let x = -0.55; x <= 0.55; x += 0.05) { const y = wy(x); x === -0.55 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); c.restore();
  c.restore();
}


// ---- aura khas (digambar SETELAH badan): petir Barakuda, kilau emas Jurung, gelembung lumpur Toman, kilat sisik Kuwe, kabut bayangan Megalodon ----
function aura(c, id, o) {
  const s = o.size, t = o.t || 0, d = o.dir || 1, vis = o.vis === undefined ? 1 : clamp(o.vis, 0, 1), dp = 1 - (o.depth || 0) * 0.6; if (vis <= 0.02) return;
  const P = (u, v) => ({ x: o.x + d * s * (0.5 - u), y: o.y + s * v });   // titik di sekitar badan (u: 0 kepala … 1 ekor)
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  if (id === "barakuda_guntur") {
    const fr = Math.floor(t * 15);
    for (let b = 0; b < 3; b++) {
      const r = (k) => { const v = Math.sin((fr + 1) * 91.7 + b * 37.1 + k * 12.9) * 43758.5453; return v - Math.floor(v); };
      if (r(0) < 0.28) continue;
      const a = P(0.12 + r(1) * 0.6, -0.07 - r(2) * 0.07); let px = a.x, py = a.y; c.beginPath(); c.moveTo(px, py);
      for (let i = 1; i <= 5; i++) { px += d * -s * (0.025 + r(3 + i) * 0.03); py += (r(9 + i) - 0.35) * s * 0.07; c.lineTo(px, py); }
      c.strokeStyle = `rgba(110,215,255,${0.55 * vis * dp})`; c.lineWidth = Math.max(2.5, s * 0.014); c.stroke(); c.strokeStyle = `rgba(255,255,255,${0.95 * vis * dp})`; c.lineWidth = Math.max(1, s * 0.0045); c.stroke();
    }
    if (fr % 9 === 0) { c.fillStyle = `rgba(190,235,255,${0.22 * vis})`; c.beginPath(); c.ellipse(o.x, o.y, s * 0.55, s * 0.08, 0, 0, TAU); c.fill(); }
  } else if (id === "jurung_mahkota") {
    for (let i = 0; i < 10; i++) { const k = (t * 0.45 + i * 0.173) % 1, q = P(0.12 + (i * 0.083) % 0.7, -0.08 - k * 0.16); c.fillStyle = rgba("#fff0a0", (1 - k) * 0.95 * vis * dp); const r = s * (0.006 + (i % 3) * 0.003) * (1 - k * 0.4);
      c.beginPath(); c.moveTo(q.x, q.y - r * 2.2); c.lineTo(q.x + r * 0.55, q.y - r * 0.55); c.lineTo(q.x + r * 2.2, q.y); c.lineTo(q.x + r * 0.55, q.y + r * 0.55); c.lineTo(q.x, q.y + r * 2.2); c.lineTo(q.x - r * 0.55, q.y + r * 0.55); c.lineTo(q.x - r * 2.2, q.y); c.lineTo(q.x - r * 0.55, q.y - r * 0.55); c.closePath(); c.fill(); }
  } else if (id === "toman_purba") {
    for (let i = 0; i < 6; i++) { const k = (t * 0.35 + i * 0.29) % 1, q = P(0.1 + (i % 3) * 0.04, 0.02 - k * 0.14); c.strokeStyle = rgba("#e9e2b8", (1 - k) * 0.7 * vis); c.lineWidth = Math.max(1, s * 0.004); c.beginPath(); c.arc(q.x + Math.sin(t * 2 + i) * s * 0.01, q.y, s * (0.008 + (i % 3) * 0.004), 0, TAU); c.stroke(); }
  } else if (id === "kuwe_titan") {
    const k = (t * 0.5) % 1, q = P(0.1 + k * 0.7, -0.03 - Math.sin(k * 6.28) * 0.02), a = Math.sin(k * 3.14); c.strokeStyle = `rgba(255,255,255,${0.9 * a * vis * dp})`; c.lineWidth = Math.max(1.5, s * 0.004);
    c.beginPath(); c.moveTo(q.x - s * 0.03, q.y); c.lineTo(q.x + s * 0.03, q.y); c.moveTo(q.x, q.y - s * 0.03); c.lineTo(q.x, q.y + s * 0.03); c.stroke();
  } else if (id === "megalodon_bayangan") {
    for (let i = 0; i < 4; i++) { const k = (t * 0.22 + i * 0.25) % 1, q = P(0.62 + k * 0.7, 0.03 + Math.sin(t + i * 2) * 0.02), r = s * (0.1 + k * 0.16); const gr = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, r); gr.addColorStop(0, `rgba(4,10,26,${0.5 * (1 - k) * vis})`); gr.addColorStop(1, "rgba(4,10,26,0)"); c.fillStyle = gr; c.beginPath(); c.arc(q.x, q.y, r, 0, TAU); c.fill(); }
    for (let i = 0; i < 12; i++) { const k = (t * 0.3 + i * 0.083) % 1, q = P((i * 0.093) % 0.9, -0.1 - k * 0.2); c.fillStyle = rgba("#7cf3ff", (1 - k) * 0.7 * vis * dp); c.beginPath(); c.arc(q.x, q.y, Math.max(1, s * 0.0035), 0, TAU); c.fill(); }
  }
  c.restore();
}

// ---- cipratan air, riak, gelembung di sekeliling monster (partikel ringan, tanpa array global) ----
function ring(c, x, y, rx, ry, a, w, col) { c.strokeStyle = rgba(col || "#ffffff", clamp(a, 0, 1)); c.lineWidth = w; c.beginPath(); c.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, TAU); c.stroke(); }
function wake(c, id, o) {    // riak di kepala, V-wake di belakang sirip, gelembung dari ekor
  const size = o.size, t = o.t || 0, vis = o.vis === undefined ? 1 : o.vis, sp = clamp(o.speed || 0.4, 0, 2), d = o.dir || 1, hx = o.x + d * size * 0.42, hy = o.y + size * 0.03, base = id === "megalodon_bayangan" ? 1.3 : 1;
  c.save(); c.lineCap = "round";
  for (let i = 0; i < 3; i++) { const k = ((t * 0.5 + i / 3) % 1); ring(c, o.x + d * size * 0.05, o.y + size * 0.04, size * (0.35 + k * 0.4), size * (0.05 + k * 0.1), (1 - k) * 0.4 * vis * (1 - (o.depth || 0) * 0.5), Math.max(1, size * 0.01), "#ffffff"); }
  c.strokeStyle = `rgba(255,255,255,${0.42 * vis * Math.min(1, 0.25 + sp)})`; c.lineWidth = Math.max(1.2, size * 0.01 * base);
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(hx + d * size * 0.03, hy + size * 0.07); c.lineTo(hx - d * size * (0.22 + sp * 0.18), hy + size * 0.07 + s * size * 0.06 * (0.7 + sp * 0.3) + size * 0.03); c.stroke(); }
  c.fillStyle = `rgba(235,248,255,${0.75 * vis})`;
  for (let i = 0; i < 9; i++) { const k = ((t * 0.7 + i * 0.37) % 1), bx = o.x - d * size * (0.38 + (i % 3) * 0.07) + Math.sin(t * 3 + i) * size * 0.015, by = o.y + size * 0.06 - k * size * 0.22; c.globalAlpha = (1 - k) * 0.8 * vis; c.beginPath(); c.arc(bx, by, Math.max(1, size * (0.005 + (i % 3) * 0.002)), 0, TAU); c.fill(); }
  c.restore();
}

// ---- efek kemunculan khas tiap monster. k = 0..1 (kemajuan animasi masuk), (x,y) tempat muncul, size = ukuran monster ----
function spawnFx(c, id, o) {
  const k = clamp(o.k, 0, 1), x = o.x, y = o.y, s = o.size, t = o.t || 0, W = o.W || 400, H = o.H || 600; if (k >= 1) return;
  c.save(); c.lineCap = "round";
  // gelombang ke luar (semua monster), makin besar untuk raksasa
  const big = { toman_purba: 0.9, jurung_mahkota: 1, barakuda_guntur: 1.1, kuwe_titan: 1.5, megalodon_bayangan: 2.4 }[id] || 1;
  for (let i = 0; i < 3; i++) { const q = clamp(k * 1.4 - i * 0.18, 0, 1); if (q <= 0 || q >= 1) continue; ring(c, x, y + s * 0.05, s * (0.1 + q * 0.7 * big), s * (0.02 + q * 0.16 * big), (1 - q) * 0.75, Math.max(1.5, s * 0.014), "#ffffff"); }
  if (id === "toman_purba") {         // gelembung lumpur pecah + riak cokelat
    ring(c, x, y + s * 0.05, s * (0.15 + k * 0.5), s * (0.04 + k * 0.1), (1 - k) * 0.5, s * 0.03, "#6b5a30");
    for (let i = 0; i < 14; i++) { const a = ((i * 0.37 + t * 0.4) % 1), r = s * (0.02 + (i % 4) * 0.01); c.fillStyle = rgba("#8b7840", 0.6 * (1 - k)); c.beginPath(); c.arc(x + Math.sin(i * 2.3) * s * 0.3, y - a * s * 0.25 * (1 - k * 0.3), r, 0, TAU); c.fill(); }
  } else if (id === "jurung_mahkota") {   // tiang cahaya emas dari kedalaman + kilau bintang
    const gr = c.createLinearGradient(0, y - s * 0.7, 0, y + s * 0.1); gr.addColorStop(0, "rgba(255,226,120,0)"); gr.addColorStop(0.7, `rgba(255,226,120,${0.45 * (1 - k)})`); gr.addColorStop(1, "rgba(255,226,120,0)");
    c.fillStyle = gr; c.fillRect(x - s * 0.17, y - s * 0.7, s * 0.34, s * 0.8);
    for (let i = 0; i < 16; i++) { const a = (i * 0.618 + t * 0.35) % 1, px = x + Math.sin(i * 5.1) * s * 0.28, py = y - a * s * 0.55; c.fillStyle = rgba("#fff1a8", 0.9 * (1 - k) * (1 - a)); const r = s * 0.012 * (1 + (i % 3) * 0.4); c.beginPath(); c.moveTo(px, py - r * 2); c.lineTo(px + r * 0.6, py - r * 0.6); c.lineTo(px + r * 2, py); c.lineTo(px + r * 0.6, py + r * 0.6); c.lineTo(px, py + r * 2); c.lineTo(px - r * 0.6, py + r * 0.6); c.lineTo(px - r * 2, py); c.lineTo(px - r * 0.6, py - r * 0.6); c.closePath(); c.fill(); }
  } else if (id === "barakuda_guntur") {  // petir menyambar dari langit ke air + kilatan
    const fl = k < 0.5 && Math.floor(t * 20) % 2 === 0 ? 0.28 : 0; if (fl) { c.fillStyle = `rgba(210,240,255,${fl})`; c.fillRect(0, 0, W, H); }
    for (let b = 0; b < 3; b++) { if (k > 0.55 + b * 0.1) continue; let bx = x + (b - 1) * s * 0.28, by = 0; c.beginPath(); c.moveTo(bx, by); const seg = 9; for (let i = 1; i <= seg; i++) { bx += Math.sin(Math.floor(t * 18) * 7.3 + i * 3.1 + b) * s * 0.06; by = lerp(0, y, i / seg); c.lineTo(bx, by); }
      c.strokeStyle = rgba("#8fdcff", 0.7); c.lineWidth = Math.max(3, s * 0.03); c.stroke(); c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = Math.max(1.4, s * 0.01); c.stroke(); }
  } else if (id === "kuwe_titan") {       // gelombang kejut besar + ikan kecil berhamburan
    ring(c, x, y + s * 0.05, s * (0.2 + k * 1.0), s * (0.04 + k * 0.2), (1 - k) * 0.6, s * 0.02, "#d6f6ff");
    for (let i = 0; i < 20; i++) { const a = ((i * 0.31) % 1) * TAU, r = s * (0.15 + k * (0.5 + (i % 5) * 0.12)), px = x + Math.cos(a) * r, py = y - Math.abs(Math.sin(a)) * r * 0.5 - Math.sin(k * 3.14) * s * 0.15; c.fillStyle = rgba("#dff3ff", 0.9 * (1 - k)); c.save(); c.translate(px, py); c.rotate(a); c.beginPath(); c.ellipse(0, 0, s * 0.02, s * 0.007, 0, 0, TAU); c.fill(); c.restore(); }
  } else if (id === "megalodon_bayangan") {  // bayangan raksasa menyapu layar → sirip punggung membelah air → muncul dengan gelombang besar
    const sh = sstep(0, 0.35, k) * (1 - sstep(0.7, 1, k)); c.fillStyle = `rgba(2,6,16,${0.55 * sh})`; c.beginPath(); c.ellipse(W * (0.15 + 0.7 * k), y + s * 0.1, W * 0.62, s * 0.2, 0, 0, TAU); c.fill();
    const fin = sstep(0.18, 0.5, k) * (1 - sstep(0.62, 0.8, k)); if (fin > 0.02) { const fx = lerp(W * 0.1, x, sstep(0.18, 0.62, k)), fh = s * 0.3 * fin; c.save(); c.translate(fx, y + s * 0.03); c.fillStyle = "#0d1428"; c.strokeStyle = rgba("#5ae0ff", 0.6 * fin); c.lineWidth = 2; c.beginPath(); c.moveTo(-s * 0.1, 0); c.quadraticCurveTo(-s * 0.02, -fh * 0.45, s * 0.05, -fh); c.quadraticCurveTo(s * 0.05, -fh * 0.3, s * 0.12, 0); c.closePath(); c.fill(); c.stroke(); c.restore();
      c.strokeStyle = `rgba(255,255,255,${0.7 * fin})`; c.lineWidth = Math.max(2, s * 0.012); for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(fx + s * 0.04, y + s * 0.03); c.lineTo(fx - s * 0.5, y + s * (0.03 + sd * 0.1) + s * 0.03); c.stroke(); } }
    ring(c, x, y + s * 0.06, s * (0.3 + k * 1.4), s * (0.05 + k * 0.28), (1 - k) * 0.7, s * 0.03, "#bfeaff");
    if (k > 0.55) { const q = (k - 0.55) / 0.45; c.fillStyle = `rgba(235,248,255,${0.85 * (1 - q)})`; for (let i = 0; i < 40; i++) { const a = (i * 0.6180339) % 1 * Math.PI, sp = 0.35 + (i % 7) * 0.09, px = x + Math.cos(a + Math.PI) * s * sp * q, py = y - Math.sin(a) * s * sp * 0.9 * q + q * q * s * 0.25; c.beginPath(); c.arc(px, py, Math.max(1.5, s * 0.008), 0, TAU); c.fill(); } }
  }
  c.restore();
}

// ---- ikon kecil untuk panel / trofi (menggambar monster yang SAMA ke canvas kecil) ----
function icon(canvas, id, opts) {
  opts = opts || {}; const c = canvas.getContext("2d"), W = canvas.width, H = canvas.height; c.clearRect(0, 0, W, H);
  if (opts.bg !== false) { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, opts.top || "#a9d8e6"); gr.addColorStop(1, (SP[id] && SP[id].pal.water) || "#2f7fa3"); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
  if (opts.locked) { c.save(); c.globalAlpha = 0.9; monster(c, id, { x: W / 2, y: H * 0.5, size: W * 0.8, dir: 1, t: 0.4, depth: 1, vis: 0.7 }); c.restore(); return; }
  monster(c, id, { x: W / 2, y: H * 0.5, size: W * (SP[id].len > 1 ? 0.92 : 0.82), dir: 1, t: opts.t || 0.6, depth: 0, vis: 1 });
}

NW.eventDraw = { SP, monster, wake, aura, spawnFx, icon, sstep, mixh, rgba };
})();
