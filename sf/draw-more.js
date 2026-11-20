// NUSA ISLAND — Samudra Follower: gambar & animasi 17 ikan dari komentar pengikut (Canvas 2D, tanpa gambar eksternal, ringan untuk Android).
// Menambah ke NW.sfDraw (sf/draw.js): FN[id] & EXTENT[id]. Ikan menghadap KIRI. Badan dibangun dari profil (kepala→ekor) yang MELENTUR mengikuti gelombang renang,
// sehingga pola (pita, sisik, bintik) ikut bergerak bersama badan. draw(c,id,cx,cy,L,t) dari sf/draw.js yang memanggil fungsi di sini.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), D = NW.sfDraw; if (!D) return;
const TAU = Math.PI * 2, PI = Math.PI, sin = Math.sin, cos = Math.cos;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
const lit = (h, k) => mixc(h, "#ffffff", k), dk = (h, k) => mixc(h, "#000000", k);
const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const OUT = "rgba(20,14,10,.6)";
const grad = (c, x0, y0, x1, y1, st) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const rgrad = (c, x, y, r0, r1, st) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); };
const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

// ---- badan: profil kepala→ekor, melentur dengan gelombang ----
function body(S, t) {
  const N = 46, A = S.amp == null ? 4 : S.amp, sp = S.sp || 3.2, pk = S.pk, tp = S.tp || 1.1, tmin = S.tmin == null ? 0.15 : S.tmin;
  const f = (u) => (u < pk ? Math.pow(sin((u / pk) * PI / 2), S.hr || 0.55) : tmin + (1 - tmin) * Math.pow(cos(((u - pk) / (1 - pk)) * PI / 2), tp));
  const wy = (u) => A * Math.pow(u, 1.4) * sin(t * sp - u * 3.6), x = (u) => -S.L + 2 * S.L * u;
  const top = (u) => -S.H * f(u) * (S.tH || 1), bot = (u) => S.H * f(u) * (S.bH || 1);
  const path = new Path2D();
  for (let i = 0; i <= N; i++) { const u = i / N; if (i === 0) path.moveTo(x(u), wy(u) + top(u)); else path.lineTo(x(u), wy(u) + top(u)); }
  for (let i = N; i >= 0; i--) { const u = i / N; path.lineTo(x(u), wy(u) + bot(u)); }
  path.closePath();
  return { S, f, wy, x, top, bot, path, P: (u, v) => ({ x: x(u), y: wy(u) + (v < 0 ? top(u) * -v : bot(u) * v) }) };
}
function paint(c, B, st, line) {
  c.fillStyle = grad(c, 0, -B.S.H, 0, B.S.H, st); c.fill(B.path); c.lineWidth = 2; c.strokeStyle = line || OUT; c.stroke(B.path);
}
function poly(c, B, u0, u1, v0, v1) {   // pita pada badan antara u0..u1 dan v0..v1 (mengikuti lentur)
  c.beginPath(); const n = 10;
  for (let i = 0; i <= n; i++) { const p = B.P(u0 + ((u1 - u0) * i) / n, v0); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
  for (let i = n; i >= 0; i--) { const p = B.P(u0 + ((u1 - u0) * i) / n, v1); c.lineTo(p.x, p.y); }
  c.closePath();
}
function sheen(c, B, a) {
  c.save(); c.clip(B.path); poly(c, B, 0.1, 0.82, -0.92, -0.25); const p = B.P(0.4, -0.9), q = B.P(0.4, -0.2);
  c.fillStyle = grad(c, 0, p.y, 0, q.y, [[0, `rgba(255,255,255,${a || 0.5})`], [1, "rgba(255,255,255,0)"]]); c.fill();
  poly(c, B, 0.05, 0.95, 0.45, 1); c.fillStyle = grad(c, 0, B.P(0.5, 0.4).y, 0, B.P(0.5, 1).y, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.22)"]]); c.fill(); c.restore();
}
function scales(c, B, o) {   // sisik lengkung berselang-seling, ikut lentur
  c.save(); c.clip(B.path); c.lineWidth = o.lw || 1; const rows = o.rows || 5, cols = o.cols || 12;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const u = (o.u0 || 0.2) + (((o.u1 || 0.92) - (o.u0 || 0.2)) * (k + (r % 2 ? 0.5 : 0))) / cols, v = -0.78 + (1.56 * r) / (rows - 1), p = B.P(u, v), rs = o.r || 6;
    c.beginPath(); c.arc(p.x, p.y, rs, -PI * 0.15, PI * 1.15, false); c.strokeStyle = o.col || "rgba(255,255,255,.28)"; c.stroke();
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
  }
  c.restore();
}
function dfin(c, B, u0, u1, v, h, col, edge, o) {   // sirip punggung/dubur (v=-1 atas, +1 bawah)
  o = o || {}; const a = B.P(u0, v), b = B.P(u1, v), dir = v < 0 ? -1 : 1, m = B.P((u0 + u1) / 2 + (o.sw == null ? 0.1 : o.sw), v), fl = sin((o.t || 0) * 3 + u0 * 5) * 2.5;
  const tip = { x: m.x + fl, y: m.y + dir * h };
  c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(a.x + (tip.x - a.x) * 0.15, a.y + dir * h * 0.75, tip.x, tip.y); c.quadraticCurveTo(tip.x + (b.x - tip.x) * 0.3, b.y + dir * h * 0.12, b.x, b.y); c.closePath();
  c.fillStyle = grad(c, 0, a.y, 0, tip.y, [[0, col], [1, o.col2 || lit(col, 0.25)]]); c.globalAlpha = o.alpha == null ? 1 : o.alpha; c.fill(); c.globalAlpha = 1; c.lineWidth = 1.2; c.strokeStyle = edge || OUT; c.stroke();
  c.strokeStyle = o.ray || "rgba(255,255,255,.25)"; c.lineWidth = 0.8;
  for (let k = 1; k < 6; k++) { const s = lerp(a, b, k / 6); c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(lerp(s, tip, 0.8).x, lerp(s, tip, 0.8).y); c.stroke(); }
}
function pfin(c, B, u, v, len, wid, rot, col, edge, t, o) {   // sirip dada: daun yang mengepak
  const p = B.P(u, v); c.save(); c.translate(p.x, p.y); c.rotate(rot + sin(t * 4 + u * 6) * 0.22);
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(len * 0.25, -wid, len * 0.8, -wid * 0.7, len, 0); c.bezierCurveTo(len * 0.8, wid * 0.55, len * 0.25, wid * 0.7, 0, 0); c.closePath();
  c.fillStyle = grad(c, 0, 0, len, 0, [[0, col], [1, (o && o.col2) || lit(col, 0.3)]]); c.fill(); c.lineWidth = 1.1; c.strokeStyle = edge || OUT; c.stroke(); c.restore();
}
function tail(c, B, o, t) {
  const p = B.P(1, 0), L = o.len, h = o.h, sl = sin(t * (B.S.sp || 3.2) - 3.6) * (o.swing == null ? 0.28 : o.swing);
  c.save(); c.translate(p.x - 2, p.y); c.rotate(sl); const col = o.col, c2 = o.col2 || (col ? lit(col, 0.3) : "#fff"), ty = o.type;
  const fillS = () => { c.fillStyle = grad(c, 0, 0, L, 0, [[0, col], [1, c2]]); c.fill(); c.lineWidth = 1.3; c.strokeStyle = o.edge || OUT; c.stroke(); };
  const rays = (n, spread) => { c.strokeStyle = o.ray || "rgba(255,255,255,.28)"; c.lineWidth = 0.8; for (let k = 0; k < n; k++) { const a = -spread + (2 * spread * k) / (n - 1); c.beginPath(); c.moveTo(2, 0); c.lineTo(L * 0.7 * cos(a), h * 0.8 * sin(a * 1.2)); c.stroke(); } };
  if (ty === "fork" || ty === "lunate") {
    const nx = ty === "lunate" ? L * 0.32 : L * 0.58, tx = ty === "lunate" ? L * 1.08 : L;
    c.beginPath(); c.moveTo(0, -3); c.quadraticCurveTo(L * 0.5, -h * 0.9, tx, -h); c.quadraticCurveTo(L * 0.72, -h * 0.35, nx, 0); c.quadraticCurveTo(L * 0.72, h * 0.35, tx, h); c.quadraticCurveTo(L * 0.5, h * 0.9, 0, 3); c.closePath(); fillS(); rays(7, 0.55);
  } else if (ty === "round") {
    c.beginPath(); c.moveTo(0, -3); c.bezierCurveTo(L * 0.4, -h * 1.3, L * 1.15, -h * 0.7, L, 0); c.bezierCurveTo(L * 1.15, h * 0.7, L * 0.4, h * 1.3, 0, 3); c.closePath(); fillS(); rays(7, 0.5);
  } else if (ty === "flow") {   // ekor veil melambai (ikan emas, kurame, galactic)
    c.beginPath(); c.moveTo(0, -2); const n = 18;
    for (let i = 0; i <= n; i++) { const a = -1.15 + (2.3 * i) / n, r = L * (0.78 + 0.22 * sin(a * 4 + t * 3.2) + 0.1 * cos(a * 7 - t * 2)); c.lineTo(r * cos(a * 0.7), (h / L) * r * 1.15 * sin(a * 0.95)); }
    c.lineTo(0, 2); c.closePath(); fillS(); rays(9, 0.75);
  } else if (ty === "shark") {
    c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(L * 0.35, -h * 1.1, L, -h * 1.55); c.quadraticCurveTo(L * 0.62, -h * 0.35, L * 0.5, 0); c.quadraticCurveTo(L * 0.72, h * 0.3, L * 0.64, h * 0.9); c.quadraticCurveTo(L * 0.3, h * 0.5, 0, 4); c.closePath(); fillS();
  } else if (ty === "gear") {
    c.translate(L * 0.42, 0); c.rotate(t * 2); const R = h * 0.62, n = 9; c.beginPath();
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, w = TAU / n * 0.3; c.lineTo(cos(a - w) * R, sin(a - w) * R); c.lineTo(cos(a - w * 0.7) * (R + 7), sin(a - w * 0.7) * (R + 7)); c.lineTo(cos(a + w * 0.7) * (R + 7), sin(a + w * 0.7) * (R + 7)); c.lineTo(cos(a + w) * R, sin(a + w) * R); }
    c.closePath(); c.fillStyle = grad(c, -R, -R, R, R, [[0, "#c7d1db"], [1, "#6a7886"]]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
    ell(c, 0, 0, R * 0.38, R * 0.38); c.fillStyle = "#26303b"; c.fill(); ell(c, 0, 0, R * 0.16, R * 0.16); c.fillStyle = "#ffcf48"; c.fill();
  } else if (ty === "tent") {   // 5 tentakel gurita bersucker
    for (let k = 0; k < 5; k++) {
      const base = -0.62 + k * 0.31, ph = k * 1.3; let px = 0, py = 0; const n = 20;
      for (let i = 1; i <= n; i++) {
        const s = i / n, ang = base + 0.55 * sin(t * 2.6 + ph - s * 4) * s + (k - 2) * 0.1 * s, seg = L / n;
        const nx = px + cos(ang + s * 0.6 * sin(t * 1.8 + ph)) * seg, ny = py + sin(ang + s * 0.6 * sin(t * 1.8 + ph)) * seg * 1.15;
        c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.lineWidth = Math.max(2, 14 * (1 - s) + 2); c.lineCap = "round"; c.strokeStyle = mixc(col, c2, s * 0.8); c.stroke();
        if (i % 3 === 0 && s < 0.9) { ell(c, nx, ny + 2.2 * (1 - s) + 1, 1.5 * (1 - s) + 0.6, 1.2 * (1 - s) + 0.5); c.fillStyle = "rgba(255,230,240,.85)"; c.fill(); }
        px = nx; py = ny;
      }
    }
    c.lineCap = "butt";
  } else if (ty === "bloom") {   // ekor mekar bercahaya (lampu)
    const pulse = 0.85 + 0.15 * sin(t * 2.4); c.globalCompositeOperation = "lighter";
    c.beginPath(); c.arc(L * 0.45, 0, L * 1.05, 0, TAU); c.fillStyle = rgrad(c, L * 0.45, 0, 2, L * 1.05, [[0, "rgba(120,240,255,.55)"], [1, "rgba(120,240,255,0)"]]); c.fill();
    c.globalCompositeOperation = "source-over";
    for (let k = 0; k < 9; k++) {
      const a = -1.2 + (2.4 * k) / 8, r = L * (0.72 + 0.26 * sin(t * 2 + k * 0.9)) * pulse; c.save(); c.rotate(a * 0.82); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(r * 0.25, -h * 0.28, r * 0.78, -h * 0.34, r, 0); c.bezierCurveTo(r * 0.78, h * 0.34, r * 0.25, h * 0.28, 0, 0); c.closePath();
      c.fillStyle = grad(c, 0, 0, r, 0, [[0, "#3a6cff"], [0.55, "#33d6ff"], [1, "#ff7ad9"]]); c.globalAlpha = 0.82; c.fill(); c.globalAlpha = 1; c.lineWidth = 1; c.strokeStyle = "rgba(220,250,255,.7)"; c.stroke(); c.restore();
    }
  }
  c.restore();
}
function eye2(c, x, y, r, o) {
  o = o || {}; c.save(); ell(c, x, y, r * (o.sx || 1), r); c.fillStyle = o.white || "#fff"; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke();
  const pr = r * (o.pr || 0.7), px = x + (o.dx == null ? -r * 0.12 : o.dx), py = y + 0.5; ell(c, px, py, pr, pr); c.fillStyle = o.iris || "#1b1410"; c.fill();
  if (o.ring) { ell(c, px, py, pr * 0.62, pr * 0.62); c.fillStyle = o.ring; c.fill(); ell(c, px, py, pr * 0.34, pr * 0.34); c.fillStyle = "#100a07"; c.fill(); }
  if (o.slit) { ell(c, px, py, pr * 0.2, pr * 0.85); c.fillStyle = "#0b0805"; c.fill(); }
  ell(c, px - pr * 0.3, py - pr * 0.36, pr * 0.3, pr * 0.3); c.fillStyle = "rgba(255,255,255,.95)"; c.fill(); c.restore();
}
function aura(c, col, r, t, k) { c.save(); c.globalCompositeOperation = "lighter"; const p = 0.8 + 0.2 * sin(t * 2); c.fillStyle = rgrad(c, 0, 0, r * 0.1, r * p, [[0, col.replace("A", String((k || 0.4) * p))], [1, col.replace("A", "0")]]); c.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8); c.restore(); }
function barbel(c, x, y, len, ang, t, ph, col, w, curl) {   // kumis lele melambai
  c.beginPath(); c.moveTo(x, y); const n = 14; let px = x, py = y;
  for (let i = 1; i <= n; i++) { const s = i / n, a = ang + sin(t * 2.2 + ph - s * 3) * 0.28 * s + (curl || 0) * s * s, nx = px + cos(a) * len / n, ny = py + sin(a) * len / n; c.lineTo(nx, ny); px = nx; py = ny; }
  c.lineCap = "round"; c.lineWidth = w; c.strokeStyle = col; c.stroke(); c.lineCap = "butt";
}
function sparkles(c, n, R, t, seed, col) { const r = rnd(seed); c.save(); c.fillStyle = col || "#fff"; for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 2 * R, y = (r() - 0.5) * R * 1.2, ph = r() * TAU, k = 0.5 + 0.5 * sin(t * 3 + ph); if (k < 0.45) continue; c.globalAlpha = k; c.beginPath(); c.moveTo(x, y - 3.5 * k); c.lineTo(x + 1, y - 1); c.lineTo(x + 3.5 * k, y); c.lineTo(x + 1, y + 1); c.lineTo(x, y + 3.5 * k); c.lineTo(x - 1, y + 1); c.lineTo(x - 3.5 * k, y); c.lineTo(x - 1, y - 1); c.closePath(); c.fill(); } c.restore(); }

const FN2 = {}, EXT2 = {};
const def = (id, ext, fn) => { FN2[id] = fn; EXT2[id] = ext; };

// 1. IKAN LELE — gelap berbintik, kepala pipih, 4 kumis
def("sf_lele", 215, (c, t) => {
  const B = body({ L: 88, H: 27, pk: 0.3, hr: 0.5, tp: 1.15, tmin: 0.2, tH: 0.9, bH: 0.8, amp: 5 }, t);
  tail(c, B, { type: "round", len: 30, h: 19, col: "#3b3b30", col2: "#58584a" }, t);
  dfin(c, B, 0.32, 0.78, -1, 11, "#41413a", OUT, { t }); dfin(c, B, 0.5, 0.9, 1, 9, "#4a4a3f", OUT, { t });
  pfin(c, B, 0.2, 0.55, 22, 7, 1.2, "#46463c", OUT, t);
  paint(c, B, [[0, "#2c2c26"], [0.45, "#55553f"], [1, "#b8b392"]]); c.save(); c.clip(B.path);
  const r = rnd(5); for (let i = 0; i < 38; i++) { const p = B.P(0.12 + r() * 0.8, -0.8 + r() * 1.2); ell(c, p.x, p.y, 1.5 + r() * 3, 1 + r() * 2, r() * 3); c.fillStyle = `rgba(20,20,15,${0.18 + r() * 0.25})`; c.fill(); }
  c.restore(); sheen(c, B, 0.32);
  const m = B.P(0, 0.12); [[-0.5, 0], [-0.15, 1.7], [0.3, 3], [0.7, 4.4]].forEach(([a, ph], i) => barbel(c, m.x + 4, m.y + (i < 2 ? -3 : 3), 34, PI + a + (i < 2 ? -0.25 : 0.3), t, ph, "#2d2d26", 2.4, 0.2));
  const e = B.P(0.13, -0.48); eye2(c, e.x, e.y, 3.8, { iris: "#d9a41c", pr: 0.7, slit: true });
  const g = B.P(0.01, 0.3), g2 = B.P(0.2, 0.34); c.strokeStyle = "rgba(15,15,10,.7)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(g.x, g.y); c.quadraticCurveTo(g.x + 12, g.y + 5, g2.x, g2.y); c.stroke();
});

// 2. IKAN EMAS — bulat berkilau, ekor veil
def("sf_emas", 215, (c, t) => {
  const B = body({ L: 56, H: 41, pk: 0.42, hr: 0.7, tp: 1.2, tmin: 0.22, amp: 3.5 }, t);
  tail(c, B, { type: "flow", len: 74, h: 58, col: "#ff9f2a", col2: "#ffd66a", ray: "rgba(255,255,255,.35)" }, t);
  dfin(c, B, 0.22, 0.62, -1, 40, "#ff8d1f", "rgba(160,70,10,.7)", { t, sw: 0.18, col2: "#ffd36a" }); dfin(c, B, 0.55, 0.8, 1, 22, "#ff9c33", "rgba(160,70,10,.6)", { t, col2: "#ffd88a" });
  pfin(c, B, 0.3, 0.45, 32, 12, 0.95, "#ffb347", "rgba(160,70,10,.6)", t);
  paint(c, B, [[0, "#ffc24a"], [0.4, "#ff8f1f"], [1, "#ffd991"]], "rgba(150,70,10,.75)"); scales(c, B, { rows: 6, cols: 9, r: 7, col: "rgba(255,240,190,.5)", u0: 0.2, u1: 0.92, lw: 1.1 }); sheen(c, B, 0.6);
  const e = B.P(0.15, -0.3); eye2(c, e.x, e.y, 7, { iris: "#2a1608", ring: "#e0a321", pr: 0.78 });
  const mm = B.P(0.0, 0.25); ell(c, mm.x + 2, mm.y, 3.2, 2.4); c.fillStyle = "#d9591d"; c.fill(); sparkles(c, 9, 70, t, 11, "#fff3c2");
});

// 3. IKAN KURAME — pipih tinggi, perunggu, benang perut panjang
def("sf_kurame", 215, (c, t) => {
  const B = body({ L: 68, H: 45, pk: 0.46, hr: 0.6, tp: 1.2, tmin: 0.2, amp: 3 }, t);
  tail(c, B, { type: "round", len: 34, h: 28, col: "#b59b62", col2: "#e8d9a4" }, t);
  dfin(c, B, 0.5, 0.88, -1, 24, "#a98e56", OUT, { t, sw: 0.1 }); dfin(c, B, 0.32, 0.9, 1, 22, "#c2a86b", OUT, { t, sw: 0.18 });
  const pv = B.P(0.28, 0.85); for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(pv.x + k * 4, pv.y); c.bezierCurveTo(pv.x - 8, pv.y + 28 + sin(t * 2 + k) * 3, pv.x + 12, pv.y + 46, pv.x + 4 + sin(t * 2.3 + k) * 6, pv.y + 66); c.lineWidth = 1.8; c.strokeStyle = k ? "#e8a24a" : "#f0b45e"; c.stroke(); }
  paint(c, B, [[0, "#7a5f2c"], [0.4, "#c29a52"], [1, "#ecd9a8"]]); c.save(); c.clip(B.path);
  for (let k = 0; k < 5; k++) { poly(c, B, 0.3 + k * 0.12, 0.34 + k * 0.12, -1, 1); c.fillStyle = "rgba(90,70,40,.16)"; c.fill(); }
  c.restore(); scales(c, B, { rows: 6, cols: 10, r: 6, col: "rgba(255,250,225,.4)" }); sheen(c, B, 0.5);
  const e = B.P(0.15, -0.28); eye2(c, e.x, e.y, 5.6, { iris: "#241708", ring: "#e1b13a", pr: 0.76 });
});

// 4. IKAN BADUT — jingga dengan 3 pita putih
def("sf_badut", 155, (c, t) => {
  const B = body({ L: 50, H: 29, pk: 0.38, hr: 0.6, tp: 1.0, tmin: 0.22, amp: 3 }, t);
  tail(c, B, { type: "round", len: 26, h: 22, col: "#ff7a14", col2: "#ffa23a", edge: "#1a0d06" }, t);
  dfin(c, B, 0.25, 0.72, -1, 17, "#ff7a14", "#1a0d06", { t, col2: "#ffa23a" }); dfin(c, B, 0.5, 0.76, 1, 11, "#ff8a22", "#1a0d06", { t });
  pfin(c, B, 0.3, 0.5, 18, 9, 1.0, "#ff8c26", "#1a0d06", t);
  paint(c, B, [[0, "#ff9a22"], [0.5, "#ff6f0e"], [1, "#ffb15a"]], "#1a0d06"); c.save(); c.clip(B.path);
  [[0.24, 0.33], [0.5, 0.6], [0.8, 0.85]].forEach(([a, b]) => { poly(c, B, a - 0.02, b + 0.02, -1.1, 1.1); c.fillStyle = "#14090a"; c.fill(); poly(c, B, a, b, -1.1, 1.1); c.fillStyle = "#fffdf6"; c.fill(); });
  c.restore(); sheen(c, B, 0.5);
  const e = B.P(0.15, -0.22); eye2(c, e.x, e.y, 5, { iris: "#140b08", pr: 0.8 }); const m = B.P(0.01, 0.25); c.strokeStyle = "#1a0d06"; c.lineWidth = 1.8; c.beginPath(); c.arc(m.x + 7, m.y - 1, 6, 0.25, 1.35); c.stroke();
});

// 5. LELE BERKUMIS — lele biru-abu berwibawa, kumis panjang melingkar
def("sf_lele_berkumis", 250, (c, t) => {
  const B = body({ L: 92, H: 31, pk: 0.3, hr: 0.5, tp: 1.15, tmin: 0.2, tH: 0.9, bH: 0.8, amp: 5 }, t);
  tail(c, B, { type: "round", len: 34, h: 22, col: "#425c75", col2: "#7391aa" }, t);
  dfin(c, B, 0.33, 0.8, -1, 13, "#46617a", OUT, { t }); dfin(c, B, 0.5, 0.9, 1, 10, "#58738d", OUT, { t }); pfin(c, B, 0.2, 0.6, 24, 8, 1.2, "#52708a", OUT, t);
  paint(c, B, [[0, "#2c4259"], [0.45, "#5f86a6"], [1, "#dce8f0"]]); sheen(c, B, 0.5);
  c.save(); c.clip(B.path); const r = rnd(9); for (let i = 0; i < 26; i++) { const p = B.P(0.15 + r() * 0.78, -0.8 + r() * 0.9); ell(c, p.x, p.y, 1.4 + r() * 2.4, 1 + r() * 1.6); c.fillStyle = `rgba(25,40,60,${0.14 + r() * 0.2})`; c.fill(); } c.restore();
  const m = B.P(0, 0.1); [[-0.7, 0, 62, 1.4], [0.55, 1.5, 62, -1.4], [-0.25, 2.7, 40, 0.9], [0.3, 3.6, 40, -0.9]].forEach(([a, ph, len, cu], i) => barbel(c, m.x + 3, m.y + (a < 0 ? -2 : 3), len, PI + a, t, ph, i < 2 ? "#e9edf1" : "#c5d2dc", i < 2 ? 3 : 2.4, cu * 0.25));
  const e = B.P(0.13, -0.5); eye2(c, e.x, e.y, 4.4, { iris: "#e4b324", pr: 0.72, slit: true });
  const g = B.P(0.01, 0.3), g2 = B.P(0.22, 0.34); c.strokeStyle = "rgba(10,20,30,.7)"; c.lineWidth = 1.7; c.beginPath(); c.moveTo(g.x, g.y); c.quadraticCurveTo(g.x + 14, g.y + 6, g2.x, g2.y); c.stroke();
});

// 6. IKAN KEPALA LELE — badan ramping, kepala lele berkumis
def("sf_kepala_lele", 245, (c, t) => {
  const B = body({ L: 90, H: 24, pk: 0.4, hr: 0.5, tp: 1.15, tmin: 0.1, amp: 6 }, t);
  tail(c, B, { type: "fork", len: 40, h: 28, col: "#ff7d5c", col2: "#ffc3a6" }, t);
  dfin(c, B, 0.4, 0.62, -1, 18, "#ff6e4e", OUT, { t }); dfin(c, B, 0.62, 0.78, 1, 12, "#ff8a6a", OUT, { t }); pfin(c, B, 0.34, 0.6, 24, 8, 1.1, "#ff8a6a", OUT, t);
  paint(c, B, [[0, "#ff6f50"], [0.5, "#ff9f7e"], [1, "#ffe0cc"]]); scales(c, B, { rows: 5, cols: 12, r: 5.5, col: "rgba(255,255,255,.35)", u0: 0.3 }); sheen(c, B, 0.55);
  c.save(); c.clip(B.path); poly(c, B, 0, 0.3, -1.05, 1.05); c.fillStyle = grad(c, 0, -26, 0, 26, [[0, "#3a3b3a"], [1, "#68695f"]]); c.fill(); c.lineWidth = 2; c.strokeStyle = "#1e1f1c"; c.stroke(); c.restore();
  const m = B.P(0, 0.1); [[-0.5, 0], [-0.1, 1.5], [0.3, 3], [0.7, 4.4]].forEach(([a, ph], i) => barbel(c, m.x + 4, m.y + (i < 2 ? -3 : 3), 32, PI + a + (i < 2 ? -0.2 : 0.2), t, ph, "#26272a", 2.2, 0.3));
  const e = B.P(0.12, -0.4); eye2(c, e.x, e.y, 4, { iris: "#e0b02a", slit: true, pr: 0.74 }); const g = B.P(0.0, 0.32), g2 = B.P(0.26, 0.36); c.strokeStyle = "#111"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(g.x, g.y); c.quadraticCurveTo(g.x + 14, g.y + 6, g2.x, g2.y); c.stroke();
});

// 7. IKAN ROBOT — baja berbaut, visor, antena, ekor roda gigi
def("sf_robot", 215, (c, t) => {
  const B = body({ L: 74, H: 36, pk: 0.5, hr: 0.28, tp: 0.8, tmin: 0.3, amp: 3 }, t);
  tail(c, B, { type: "gear", len: 40, h: 40 }, t);
  const an = B.P(0.42, -1); c.strokeStyle = "#7a8794"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(an.x, an.y); c.lineTo(an.x - 6, an.y - 20); c.stroke();
  const on = sin(t * 5) > 0; ell(c, an.x - 6, an.y - 22, 4.4, 4.4); c.fillStyle = on ? "#ff4a4a" : "#6a1d1d"; c.fill(); if (on) { ell(c, an.x - 6, an.y - 22, 9, 9); c.fillStyle = "rgba(255,70,70,.28)"; c.fill(); }
  dfin(c, B, 0.34, 0.66, -1, 16, "#8693a1", OUT, { t, ray: "rgba(0,0,0,.25)" }); dfin(c, B, 0.4, 0.72, 1, 13, "#7a8795", OUT, { t });
  paint(c, B, [[0, "#c9d3dd"], [0.45, "#7f8d9c"], [1, "#46515e"]], "#222a33"); c.save(); c.clip(B.path);
  [0.28, 0.5, 0.7].forEach((u) => { const a = B.P(u, -1), b = B.P(u, 1); c.strokeStyle = "rgba(20,30,40,.55)"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.strokeStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.moveTo(a.x + 1.5, a.y); c.lineTo(b.x + 1.5, b.y); c.stroke(); });
  for (const u of [0.28, 0.5, 0.7]) for (const v of [-0.75, 0.75]) { const p = B.P(u + 0.04, v); ell(c, p.x, p.y, 1.8, 1.8); c.fillStyle = "#d8e0e8"; c.fill(); c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = 0.8; c.stroke(); }
  c.restore(); sheen(c, B, 0.5);
  const v0 = B.P(0.1, -0.45), v1 = B.P(0.3, 0.1); c.save(); c.beginPath(); c.roundRect(v0.x, v0.y, v1.x - v0.x, v1.y - v0.y, 6); c.fillStyle = "#0e1b24"; c.fill(); c.lineWidth = 1.6; c.strokeStyle = "#2d3a46"; c.stroke(); c.clip();
  const sc = v0.x + 4 + ((t * 18) % (v1.x - v0.x - 8)); c.fillStyle = "#36e0ff"; c.fillRect(v0.x + 4, (v0.y + v1.y) / 2 - 2, v1.x - v0.x - 8, 4); c.fillStyle = "#e8fdff"; c.fillRect(sc - 2, v0.y + 2, 4, v1.y - v0.y - 4); c.restore();
  const g = B.P(0.03, 0.55); c.strokeStyle = "#26303b"; c.lineWidth = 1.5; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(g.x + k * 4, g.y); c.lineTo(g.x + k * 4 + 1, g.y + 8); c.stroke(); }
  for (let k = 0; k < 3; k++) { const bx = -78 - ((t * 10 + k * 6) % 18), by = -4 - k * 8; ell(c, bx, by + 18, 2.2, 2.2); c.fillStyle = "rgba(190,230,255,.6)"; c.fill(); }
});

// 8. PIRANHA PURBA — rahang raksasa, pelat tulang, perut merah
def("sf_piranha_purba", 235, (c, t) => {
  const B = body({ L: 70, H: 43, pk: 0.4, hr: 0.5, tp: 1.1, tmin: 0.18, amp: 4 }, t);
  tail(c, B, { type: "fork", len: 40, h: 34, col: "#1f4a4a", col2: "#c9432d", edge: "#0d1f1f" }, t);
  c.save(); for (let k = 0; k < 6; k++) { const u = 0.28 + k * 0.1, a = B.P(u, -1), b = B.P(u + 0.06, -1); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo((a.x + b.x) / 2 + 3, a.y - 17 + k * 1.4); c.lineTo(b.x, b.y); c.closePath(); c.fillStyle = "#d9d0b2"; c.fill(); c.lineWidth = 1.2; c.strokeStyle = "#3e382a"; c.stroke(); } c.restore();
  dfin(c, B, 0.5, 0.82, 1, 16, "#c9432d", OUT, { t }); pfin(c, B, 0.3, 0.55, 26, 11, 1.1, "#bf3d2a", OUT, t);
  paint(c, B, [[0, "#16383a"], [0.45, "#2f6a68"], [0.7, "#7a8f6a"], [1, "#e0542f"]]); c.save(); c.clip(B.path);
  for (let r2 = 0; r2 < 5; r2++) for (let k = 0; k < 8; k++) { const p = B.P(0.3 + k * 0.085 + (r2 % 2) * 0.04, -0.7 + r2 * 0.32); c.beginPath(); for (let q = 0; q < 6; q++) { const a = (q / 6) * TAU + PI / 6; c.lineTo(p.x + cos(a) * 6.5, p.y + sin(a) * 6.5); } c.closePath(); c.strokeStyle = "rgba(230,225,190,.32)"; c.lineWidth = 1; c.stroke(); }
  c.restore(); sheen(c, B, 0.4);
  const jaw = B.P(0.02, 0.35); c.save(); c.translate(jaw.x, jaw.y); c.rotate(0.12 + sin(t * 2) * 0.05); c.beginPath(); c.moveTo(-8, 4); c.lineTo(38, -3); c.lineTo(36, 14); c.quadraticCurveTo(10, 22, -8, 12); c.closePath();
  c.fillStyle = "#7a1c14"; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke(); for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-4 + k * 6, 4 - k * 1.1); c.lineTo(-1 + k * 6, -8 - (k % 2) * 2 - k * 1.1); c.lineTo(2 + k * 6, 3 - k * 1.1); c.closePath(); c.fillStyle = "#fffdf0"; c.fill(); c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = 0.8; c.stroke(); } c.restore();
  const m2 = B.P(0.02, 0.0); for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(m2.x + 2 + k * 6, m2.y + 6); c.lineTo(m2.x + 5 + k * 6, m2.y + 17 + (k % 2) * 2); c.lineTo(m2.x + 8 + k * 6, m2.y + 7); c.closePath(); c.fillStyle = "#fffdf0"; c.fill(); c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = 0.8; c.stroke(); }
  const e = B.P(0.2, -0.38); eye2(c, e.x, e.y, 6.4, { iris: "#e3a21c", ring: "#d4351f", pr: 0.82 });
});

// 9. IKAN ALIGATOR — moncong panjang bergigi, sisik berlian
def("sf_aligator", 290, (c, t) => {
  const B = body({ L: 112, H: 25, pk: 0.36, hr: 0.38, tp: 1.2, tmin: 0.22, tH: 0.92, bH: 0.8, amp: 5 }, t);
  tail(c, B, { type: "round", len: 34, h: 20, col: "#5b5a2e", col2: "#8c8a4a" }, t);
  dfin(c, B, 0.66, 0.84, -1, 13, "#66652f", OUT, { t }); dfin(c, B, 0.7, 0.86, 1, 10, "#6f6e36", OUT, { t }); pfin(c, B, 0.27, 0.6, 22, 7, 1.2, "#6a6a34", OUT, t);
  paint(c, B, [[0, "#3e3d1f"], [0.45, "#7b7a3b"], [1, "#d1cb92"]]); c.save(); c.clip(B.path); c.lineWidth = 1;
  for (let r2 = 0; r2 < 5; r2++) for (let k = 0; k < 18; k++) { const p = B.P(0.22 + k * 0.042 + (r2 % 2) * 0.021, -0.8 + r2 * 0.4); c.beginPath(); c.moveTo(p.x, p.y - 5); c.lineTo(p.x + 5, p.y); c.lineTo(p.x, p.y + 5); c.lineTo(p.x - 5, p.y); c.closePath(); c.strokeStyle = "rgba(255,250,200,.3)"; c.stroke(); c.fillStyle = "rgba(30,28,10,.12)"; c.fill(); }
  const r = rnd(4); for (let i = 0; i < 22; i++) { const p = B.P(0.2 + r() * 0.74, -0.7 + r() * 1.0); ell(c, p.x, p.y, 2 + r() * 3, 1.4 + r() * 2); c.fillStyle = "rgba(25,22,8,.3)"; c.fill(); } c.restore(); sheen(c, B, 0.35);
  const a = B.P(0.0, 0.35), b = B.P(0.26, 0.4); for (let k = 0; k < 12; k++) { const x = a.x + 2 + k * ((b.x - a.x) / 12), y = a.y + (b.y - a.y) * (k / 12); c.beginPath(); c.moveTo(x, y - 1); c.lineTo(x + 2.4, y + 7); c.lineTo(x + 4.6, y - 1); c.closePath(); c.fillStyle = "#fffdf0"; c.fill(); c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = 0.7; c.stroke(); }
  c.strokeStyle = "rgba(15,12,5,.7)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(a.x, a.y - 1); c.lineTo(b.x, b.y - 1); c.stroke();
  const e = B.P(0.24, -0.4); eye2(c, e.x, e.y, 4.2, { iris: "#e8c224", slit: true, pr: 0.72 });
});

// 10. HIU EKOR GURITA — hiu abu-abu, ekor = 5 tentakel
def("sf_hiu_gurita", 290, (c, t) => {
  const B = body({ L: 78, H: 31, pk: 0.4, hr: 0.5, tp: 1.35, tmin: 0.1, tH: 0.92, bH: 0.86, amp: 3.5 }, t);
  tail(c, B, { type: "tent", len: 96, h: 0, col: "#a7497c", col2: "#e785b5" }, t);
  const d0 = B.P(0.38, -1), d1 = B.P(0.62, -1); c.beginPath(); c.moveTo(d0.x, d0.y); c.quadraticCurveTo(d0.x + 14, d0.y - 40, d0.x + 30, d0.y - 44); c.quadraticCurveTo(d1.x - 6, d1.y - 14, d1.x, d1.y); c.closePath(); c.fillStyle = grad(c, 0, d0.y - 44, 0, d0.y, [[0, "#5c6d7e"], [1, "#7e8fa0"]]); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
  pfin(c, B, 0.34, 0.6, 36, 13, 1.0, "#6f8091", OUT, t);
  paint(c, B, [[0, "#566678"], [0.5, "#8798a9"], [0.62, "#c8d3dd"], [1, "#f0f4f7"]]); sheen(c, B, 0.4);
  c.save(); c.clip(B.path); for (let k = 0; k < 3; k++) { const a = B.P(0.3 + k * 0.03, -0.45), b = B.P(0.27 + k * 0.03, 0.35); c.strokeStyle = "rgba(25,35,45,.5)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(a.x - 4, (a.y + b.y) / 2, b.x, b.y); c.stroke(); } c.restore();
  const mm = B.P(0.03, 0.42), m3 = B.P(0.24, 0.5); c.strokeStyle = "#22303c"; c.lineWidth = 1.7; c.beginPath(); c.moveTo(mm.x, mm.y); c.quadraticCurveTo((mm.x + m3.x) / 2, mm.y + 8, m3.x, m3.y); c.stroke();
  for (let k = 0; k < 5; k++) { const x = mm.x + 6 + k * 7, y = mm.y + 4 + sin(k * 0.7) * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + 6); c.lineTo(x + 4, y); c.closePath(); c.fillStyle = "#fff"; c.fill(); }
  const e = B.P(0.16, -0.32); eye2(c, e.x, e.y, 4.2, { iris: "#0c1218", pr: 0.82 });
});

// 11. IKAN LAMPU EKOR MEKAR — laut dalam, bintik cahaya, ekor mekar bercahaya
def("sf_lampu_mekar", 270, (c, t) => {
  const B = body({ L: 66, H: 34, pk: 0.4, hr: 0.55, tp: 1.2, tmin: 0.14, amp: 3.5 }, t); aura(c, "rgba(90,200,255,A)", 130, t, 0.35);
  tail(c, B, { type: "bloom", len: 94, h: 76 }, t);
  dfin(c, B, 0.4, 0.62, -1, 14, "#16296b", "rgba(120,200,255,.6)", { t, col2: "#2f5be0" }); pfin(c, B, 0.32, 0.55, 24, 9, 1.1, "#183080", "rgba(120,200,255,.6)", t);
  paint(c, B, [[0, "#0a1236"], [0.45, "#1b3a86"], [1, "#2e6bb8"]], "rgba(150,220,255,.7)"); sheen(c, B, 0.3);
  c.save(); c.clip(B.path); c.globalCompositeOperation = "lighter"; for (let k = 0; k < 14; k++) { const p = B.P(0.18 + k * 0.055, 0.35 + (k % 2) * 0.25), a = 0.5 + 0.5 * sin(t * 2.6 + k * 0.8); ell(c, p.x, p.y, 3, 3); c.fillStyle = rgrad(c, p.x, p.y, 0, 5, [[0, `rgba(180,255,255,${a})`], [1, "rgba(80,220,255,0)"]]); c.fillRect(p.x - 6, p.y - 6, 12, 12); }
  c.restore(); const lu = B.P(0.06, -1); c.beginPath(); c.moveTo(lu.x, lu.y); c.quadraticCurveTo(lu.x - 18, lu.y - 18, lu.x - 28, lu.y - 6 + sin(t * 2) * 3); c.lineWidth = 2; c.strokeStyle = "#5fc3ff"; c.stroke(); const lg = 0.6 + 0.4 * sin(t * 3);
  c.globalCompositeOperation = "lighter"; ell(c, lu.x - 28, lu.y - 6 + sin(t * 2) * 3, 9, 9); c.fillStyle = `rgba(150,255,255,${0.45 * lg})`; c.fill(); ell(c, lu.x - 28, lu.y - 6 + sin(t * 2) * 3, 3.6, 3.6); c.fillStyle = "#e8ffff"; c.fill(); c.globalCompositeOperation = "source-over";
  const e = B.P(0.15, -0.28); eye2(c, e.x, e.y, 7, { white: "#d6f4ff", iris: "#06131f", ring: "#42d4ff", pr: 0.76 });
  const m = B.P(0.0, 0.3); c.strokeStyle = "rgba(10,20,40,.8)"; c.lineWidth = 1.7; c.beginPath(); c.arc(m.x + 8, m.y - 2, 8, 0.3, 1.5); c.stroke();
});

// 12. MARLIN BIRU — moncong tombak, sirip layar
def("sf_marlin_biru", 340, (c, t) => {
  const B = body({ L: 105, H: 25, pk: 0.38, hr: 0.42, tp: 1.0, tmin: 0.07, tH: 0.95, bH: 0.8, amp: 5 }, t);
  tail(c, B, { type: "lunate", len: 52, h: 46, col: "#16418e", col2: "#4a86d8" }, t);
  const bl = B.P(0, 0); c.beginPath(); c.moveTo(bl.x + 3, bl.y - 4); c.lineTo(bl.x - 64, bl.y - 0.8); c.lineTo(bl.x + 3, bl.y + 4); c.closePath(); c.fillStyle = grad(c, bl.x - 64, 0, bl.x, 0, [[0, "#dfe8f2"], [0.3, "#35538a"], [1, "#16418e"]]); c.fill(); c.lineWidth = 1.2; c.strokeStyle = OUT; c.stroke();
  dfin(c, B, 0.26, 0.74, -1, 40, "#1b4aa0", OUT, { t, sw: 0.22, col2: "#5b8fe0" }); dfin(c, B, 0.6, 0.76, 1, 14, "#2a5fb8", OUT, { t }); pfin(c, B, 0.3, 0.7, 30, 6, 1.35, "#1b4aa0", OUT, t);
  paint(c, B, [[0, "#0c2f78"], [0.4, "#2f78d6"], [0.62, "#8fc3f0"], [1, "#edf4fa"]]); c.save(); c.clip(B.path);
  for (let k = 0; k < 8; k++) { const u = 0.3 + k * 0.08, a = B.P(u, -0.8), b = B.P(u - 0.02, 0.2), gl = 0.35 + 0.35 * sin(t * 3 - k); c.strokeStyle = `rgba(150,230,255,${gl})`; c.lineWidth = 2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  c.restore(); sheen(c, B, 0.5); const e = B.P(0.1, -0.2); eye2(c, e.x, e.y, 5.6, { iris: "#0a1a2e", ring: "#5fc7ff", pr: 0.8 });
});

// 13. ARWANA HITAM MERAH — hitam, tepi sisik merah, kumis emas
def("sf_arwana_hitam_merah", 300, (c, t) => {
  const B = body({ L: 100, H: 27, pk: 0.45, hr: 0.5, tp: 1.0, tmin: 0.2, tH: 0.95, bH: 0.95, amp: 4.5 }, t); aura(c, "rgba(255,200,70,A)", 140, t, 0.28);
  tail(c, B, { type: "round", len: 38, h: 22, col: "#8a1218", col2: "#e03a2a", edge: "#1a0a0a" }, t);
  dfin(c, B, 0.55, 0.96, -1, 14, "#b8151e", "#1a0a0a", { t, col2: "#f0503a", sw: 0.2 }); dfin(c, B, 0.45, 0.96, 1, 15, "#a8131b", "#1a0a0a", { t, col2: "#f0503a", sw: 0.22 }); pfin(c, B, 0.28, 0.7, 40, 7, 1.25, "#c11a22", "#1a0a0a", t);
  paint(c, B, [[0, "#050507"], [0.5, "#17141a"], [1, "#3a2428"]], "#000"); c.save(); c.clip(B.path);
  for (let r2 = 0; r2 < 5; r2++) for (let k = 0; k < 15; k++) { const p = B.P(0.2 + k * 0.05 + (r2 % 2) * 0.025, -0.78 + r2 * 0.39); c.beginPath(); c.arc(p.x, p.y, 7.6, -PI * 0.1, PI * 1.1); c.lineWidth = 2; c.strokeStyle = `rgba(235,40,50,${0.85})`; c.stroke(); c.lineWidth = 0.8; c.strokeStyle = "rgba(255,170,150,.8)"; c.stroke(); }
  c.restore(); sheen(c, B, 0.25);
  const m = B.P(0.0, 0.2); [[0.4, 0], [0.8, 1.4]].forEach(([a, ph]) => barbel(c, m.x + 3, m.y + 2, 26, PI * 0.5 + a * 0.3 + 0.6, t, ph, "#e9b333", 2, 0.4));
  const hd = B.P(0.0, -0.1), mo = B.P(0.12, 0.3); c.strokeStyle = "rgba(255,255,255,.2)"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(hd.x, hd.y + 2); c.lineTo(mo.x, mo.y); c.stroke();
  const e = B.P(0.15, -0.3); eye2(c, e.x, e.y, 5, { iris: "#e6a626", ring: "#ffcb4a", pr: 0.8 }); sparkles(c, 7, 90, t, 21, "#ffd978");
});

// 14. IKAN GALACTIC — potongan galaksi
def("sf_galactic", 275, (c, t) => {
  const B = body({ L: 78, H: 37, pk: 0.42, hr: 0.55, tp: 1.15, tmin: 0.16, amp: 4 }, t); aura(c, "rgba(190,110,255,A)", 150, t, 0.34);
  tail(c, B, { type: "flow", len: 82, h: 60, col: "rgba(120,70,230,.9)", col2: "rgba(255,110,210,.85)", ray: "rgba(255,255,255,.5)", edge: "rgba(230,200,255,.8)" }, t);
  dfin(c, B, 0.25, 0.68, -1, 34, "rgba(90,60,220,.85)", "rgba(220,200,255,.8)", { t, col2: "rgba(90,230,255,.8)", sw: 0.15, alpha: 0.9 }); dfin(c, B, 0.5, 0.82, 1, 22, "rgba(130,60,220,.85)", "rgba(220,200,255,.8)", { t, col2: "rgba(255,120,220,.8)", alpha: 0.9 });
  paint(c, B, [[0, "#0d0a3a"], [0.45, "#4b1f9a"], [1, "#d6409b"]], "rgba(230,210,255,.85)"); c.save(); c.clip(B.path);
  c.globalCompositeOperation = "lighter"; [[0.3, -0.1, "rgba(60,200,255,.55)", 38], [0.62, 0.2, "rgba(255,90,200,.5)", 42], [0.5, -0.4, "rgba(150,90,255,.5)", 30]].forEach(([u, v, col, r], i) => { const p = B.P(u + 0.03 * sin(t + i), v); ell(c, p.x, p.y, r, r * 0.6, 0.5); c.fillStyle = rgrad(c, p.x, p.y, 0, r, [[0, col], [1, "rgba(0,0,0,0)"]]); c.fill(); });
  const r = rnd(33); for (let i = 0; i < 40; i++) { const p = B.P(0.08 + r() * 0.86, -0.9 + r() * 1.8), k = 0.4 + 0.6 * sin(t * 2.5 + i); ell(c, p.x, p.y, 0.7 + r() * 1.4, 0.7 + r() * 1.4); c.fillStyle = `rgba(255,255,255,${Math.max(0, k)})`; c.fill(); }
  c.restore(); sheen(c, B, 0.25);
  const e = B.P(0.15, -0.3); eye2(c, e.x, e.y, 6.4, { iris: "#12062e", ring: "#7ef0ff", pr: 0.8 });
  c.save(); c.strokeStyle = "rgba(190,230,255,.4)"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 4, 128, 34, -0.14, PI * 1.05, PI * 1.95); c.stroke(); const oa = t * 0.9; ell(c, cos(oa) * 128, 4 + sin(oa) * 34 * cos(-0.14) * 0, 0, 0); c.restore();
  const op = t * 0.9, px = cos(op) * 128, py = 4 + sin(op) * 34; if (sin(op) < 0) { ell(c, px, py - 2, 5.5, 5.5); c.fillStyle = grad(c, px - 5, py - 7, px + 5, py + 3, [[0, "#9ff3ff"], [1, "#3b8aff"]]); c.fill(); }
  sparkles(c, 10, 120, t, 5, "#fff");
});

// 15. THE BLOOP — raksasa lunak bermata tunggal, bertentakel, bintik cahaya biru
def("sf_bloop", 380, (c, t) => {
  const bob = sin(t * 1.6) * 5; c.save(); c.translate(0, bob); aura(c, "rgba(80,170,255,A)", 220, t, 0.3);
  for (let k = 0; k < 7; k++) { const bx = -70 + k * 24; let px = bx, py = 56; for (let i = 1; i <= 16; i++) { const s = i / 16, nx = bx + sin(t * 1.8 + k * 1.1 - s * 3) * 22 * s + (k - 3) * 4 * s, ny = 56 + s * 92 + cos(t * 1.5 + k) * 6 * s; c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.lineWidth = Math.max(2, 13 * (1 - s) + 2); c.lineCap = "round"; c.strokeStyle = mixc("#4a3a82", "#7e5cc0", s); c.stroke(); if (i % 3 === 0) { ell(c, nx, ny + 2, 2, 2); c.fillStyle = "rgba(190,230,255,.7)"; c.fill(); } px = nx; py = ny; } }
  c.lineCap = "butt"; const sq = 1 + sin(t * 1.6) * 0.02;
  const P = new Path2D(); P.moveTo(-124, 12); P.bezierCurveTo(-130, -56, -70, -96, 0, -94); P.bezierCurveTo(78, -96, 132, -52, 128, 14); P.bezierCurveTo(124, 62, 60, 82, 0, 80); P.bezierCurveTo(-64, 80, -118, 60, -124, 12); P.closePath();
  c.save(); c.scale(1, sq); c.fillStyle = grad(c, 0, -94, 0, 80, [[0, "#6e57b8"], [0.5, "#3f3380"], [1, "#241b52"]]); c.fill(P); c.save(); c.clip(P); const r = rnd(17);
  for (let i = 0; i < 46; i++) { const x = -120 + r() * 248, y = -90 + r() * 168, a = 0.4 + 0.6 * sin(t * 2 + i * 1.3); ell(c, x, y, 2.2 + r() * 3.4, 1.8 + r() * 2.6); c.fillStyle = `rgba(90,200,255,${a * 0.9})`; c.fill(); }
  for (let i = 0; i < 18; i++) { const x = -110 + r() * 230, y = -80 + r() * 150; ell(c, x, y, 8 + r() * 12, 5 + r() * 8, r() * 3); c.fillStyle = "rgba(20,10,50,.28)"; c.fill(); }
  c.fillStyle = grad(c, -60, -92, -20, -40, [[0, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]); ell(c, -40, -64, 56, 20, -0.35); c.fill(); c.restore(); c.lineWidth = 3; c.strokeStyle = "rgba(15,8,40,.85)"; c.stroke(P); c.restore();
  const ey = 0.6 + 0.4 * sin(t * 2.2); ell(c, -34, -24, 30, 28); c.fillStyle = "#dfe9ff"; c.fill(); c.lineWidth = 2.4; c.strokeStyle = "#140a30"; c.stroke(); ell(c, -38, -22, 17, 17); c.fillStyle = rgrad(c, -38, -22, 0, 17, [[0, "#fff6a8"], [0.55, "#ff9d2a"], [1, "#c23a14"]]); c.fill(); ell(c, -38, -22, 6, 14); c.fillStyle = "#12081f"; c.fill(); ell(c, -46, -30, 5.5, 5.5); c.fillStyle = "rgba(255,255,255,.95)"; c.fill();
  c.globalCompositeOperation = "lighter"; ell(c, -38, -22, 30, 30); c.fillStyle = `rgba(255,170,60,${0.16 * ey})`; c.fill(); c.globalCompositeOperation = "source-over";
  c.beginPath(); c.moveTo(-98, 40); c.quadraticCurveTo(-52, 62 + sin(t * 2) * 3, -6, 40); c.lineWidth = 5; c.strokeStyle = "#140a2a"; c.stroke(); c.lineWidth = 2; c.strokeStyle = "rgba(140,120,230,.55)"; c.stroke();
  for (let k = 0; k < 5; k++) { const a = -34 + k * 3, b = 14 + k * 2; ell(c, 50 + k * 14, -40 + k * 6, 0, 0); } c.restore();
});

// 17. PAUS 0,00037% — paus biru bertuliskan peluangnya sendiri
def("sf_paus_00037", 450, (c, t) => {
  const B = body({ L: 138, H: 64, pk: 0.34, hr: 0.5, tp: 1.2, tmin: 0.1, tH: 1, bH: 0.95, amp: 5 }, t); aura(c, "rgba(100,180,255,A)", 230, t, 0.22);
  tail(c, B, { type: "fork", len: 70, h: 66, col: "#2c5f92", col2: "#5b95c8", swing: 0.18 }, t);
  pfin(c, B, 0.3, 0.6, 62, 15, 1.05, "#2b5a8c", OUT, t); dfin(c, B, 0.7, 0.8, -1, 16, "#2f6296", OUT, { t });
  paint(c, B, [[0, "#1f4c7a"], [0.45, "#3f7ab0"], [0.66, "#a9c9e0"], [1, "#e7f1f8"]]); c.save(); c.clip(B.path);
  for (let k = 0; k < 9; k++) { const a = B.P(0.1 + k * 0.045, 0.2), b = B.P(0.14 + k * 0.045, 0.95); c.strokeStyle = "rgba(60,100,140,.4)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  const r = rnd(8); for (let i = 0; i < 30; i++) { const p = B.P(0.1 + r() * 0.86, -0.7 + r() * 0.9); ell(c, p.x, p.y, 1.6 + r() * 3, 1.2 + r() * 2, r() * 3); c.fillStyle = "rgba(200,225,245,.22)"; c.fill(); }
  c.restore(); sheen(c, B, 0.4);
  const tp = B.P(0.5, -0.12); c.save(); c.translate(tp.x, tp.y); c.rotate(0.02); c.font = "900 23px Poppins, Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; const gl = 0.7 + 0.3 * sin(t * 4), gj = sin(t * 11) > 0.93 ? 2 : 0;
  c.fillStyle = "rgba(255,40,120,.75)"; c.fillText("0,00037%", -1.6 + gj, 1); c.fillStyle = "rgba(60,230,255,.75)"; c.fillText("0,00037%", 1.6 - gj, -1); c.shadowColor = "#ffe27a"; c.shadowBlur = 10 * gl; c.fillStyle = "#fff7c8"; c.fillText("0,00037%", 0, 0); c.restore();
  const e = B.P(0.1, -0.05); eye2(c, e.x, e.y, 5.4, { iris: "#08121c", pr: 0.85 }); const m = B.P(0.0, 0.3), m2 = B.P(0.2, 0.55); c.strokeStyle = "rgba(10,30,50,.7)"; c.lineWidth = 2; c.beginPath(); c.moveTo(m.x, m.y); c.quadraticCurveTo(m.x + 30, m.y + 14, m2.x, m2.y); c.stroke();
  for (let k = 0; k < 4; k++) { const sx = -40 + k * 40 + sin(t * 1.2 + k) * 5, sy = -120 - ((t * 14 + k * 22) % 30); ell(c, sx, sy, 3, 3); c.fillStyle = "rgba(190,230,255,.6)"; c.fill(); }
  sparkles(c, 14, 200, t, 14, "#fff2b0");
});

// 18. MEGALODON SECRET — hiu raksasa gelap, retak, mata merah, kabut ungu
def("sf_megalodon_secret", 470, (c, t) => {
  const B = body({ L: 150, H: 56, pk: 0.38, hr: 0.5, tp: 1.3, tmin: 0.1, tH: 0.95, bH: 0.9, amp: 4 }, t); aura(c, "rgba(140,60,255,A)", 260, t, 0.38);
  tail(c, B, { type: "shark", len: 84, h: 56, col: "#1d1d26", col2: "#3a3a48", swing: 0.2 }, t);
  const d0 = B.P(0.36, -1), d1 = B.P(0.62, -1); c.beginPath(); c.moveTo(d0.x, d0.y); c.quadraticCurveTo(d0.x + 18, d0.y - 52, d0.x + 40, d0.y - 60); c.quadraticCurveTo(d1.x - 8, d1.y - 18, d1.x, d1.y); c.closePath(); c.fillStyle = grad(c, 0, d0.y - 60, 0, d0.y, [[0, "#16161e"], [1, "#2c2c38"]]); c.fill(); c.lineWidth = 1.6; c.strokeStyle = "#000"; c.stroke();
  pfin(c, B, 0.32, 0.6, 62, 20, 1.0, "#22222c", "#000", t);
  paint(c, B, [[0, "#0d0d13"], [0.5, "#262632"], [0.66, "#6a6a7a"], [1, "#a9a9b8"]], "#000"); sheen(c, B, 0.22);
  c.save(); c.clip(B.path); const r = rnd(66); for (let i = 0; i < 7; i++) { const a = B.P(0.2 + r() * 0.6, -0.6 + r() * 0.6); c.strokeStyle = "rgba(210,210,230,.38)"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + 14 + r() * 18, a.y + 4 + r() * 10); c.stroke(); }
  for (let k = 0; k < 4; k++) { const a = B.P(0.28 + k * 0.025, -0.4), b = B.P(0.26 + k * 0.025, 0.4); c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(a.x - 5, (a.y + b.y) / 2, b.x, b.y); c.stroke(); }
  c.globalCompositeOperation = "lighter"; for (let k = 0; k < 6; k++) { const y = -50 + ((t * 40 + k * 22) % 110); c.fillStyle = "rgba(160,90,255,.1)"; c.fillRect(-160, y, 320, 3); } c.restore();
  const mo = B.P(0.02, 0.3), op = 8 + 5 * (0.5 + 0.5 * sin(t * 1.4)); c.beginPath(); c.moveTo(mo.x + 4, mo.y - 4); c.quadraticCurveTo(mo.x + 60, mo.y + op * 0.4, mo.x + 108, mo.y - 2); c.lineTo(mo.x + 100, mo.y + op + 8); c.quadraticCurveTo(mo.x + 50, mo.y + op + 22, mo.x + 4, mo.y + op); c.closePath(); c.fillStyle = "#2a0a12"; c.fill(); c.lineWidth = 2; c.strokeStyle = "#000"; c.stroke();
  for (let k = 0; k < 11; k++) { const x = mo.x + 10 + k * 8.5, y0 = mo.y - 2 + sin(k * 0.3) * 2; c.beginPath(); c.moveTo(x, y0); c.lineTo(x + 3.6, y0 + 12 + (k % 2) * 3); c.lineTo(x + 7, y0); c.closePath(); c.fillStyle = "#f3efe0"; c.fill(); c.lineWidth = 0.8; c.strokeStyle = "rgba(0,0,0,.6)"; c.stroke(); const y1 = mo.y + op + 14 - (k % 2) * 2; c.beginPath(); c.moveTo(x + 2, y1 + 1); c.lineTo(x + 5, y1 - 9); c.lineTo(x + 8, y1 + 1); c.closePath(); c.fillStyle = "#e7e2d2"; c.fill(); c.stroke(); }
  const e = B.P(0.16, -0.3), g = 0.65 + 0.35 * sin(t * 3); c.globalCompositeOperation = "lighter"; ell(c, e.x, e.y, 18, 18); c.fillStyle = `rgba(255,40,40,${0.3 * g})`; c.fill(); c.globalCompositeOperation = "source-over"; ell(c, e.x, e.y, 7, 7); c.fillStyle = "#ff2a2a"; c.fill(); ell(c, e.x, e.y, 2, 6); c.fillStyle = "#1a0000"; c.fill(); ell(c, e.x - 2, e.y - 2, 2, 2); c.fillStyle = "#fff"; c.fill();
  c.save(); c.font = "900 16px Arial, sans-serif"; c.textAlign = "center"; for (let k = 0; k < 4; k++) { const ph = (t * 0.5 + k * 0.25) % 1; c.globalAlpha = Math.sin(ph * PI) * 0.7; c.fillStyle = "#c9a3ff"; c.fillText("?", -120 + k * 80 + sin(t + k) * 6, -96 - ph * 46); } c.restore();
});

for (const id in FN2) { D.FN[id] = FN2[id]; }
// EXTENT dipakai draw() di sf/draw.js lewat objek EXTENT lokal; sf/draw.js membaca D.EXT (digabung di bawah) bila ada.
D.EXT = Object.assign(D.EXT || {}, EXT2);
})();
