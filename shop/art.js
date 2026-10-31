// =========================================================
//  NUSA ISLAND — Tahap 3.5: GAMBAR Premium Shop (bangunan, penjaga, pratinjau produk). Kanvas 2D ringan, tanpa gambar luar.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const TAU = Math.PI * 2;
const GOLD = "#e8c25a", GOLD_D = "#b8902f", SEA = "#0e4a63", EMER = "#1f8f6b";
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function star(c, x, y, r, a) { c.save(); c.globalAlpha = a; c.fillStyle = "#fff6c8"; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * .28, y - r * .28); c.lineTo(x + r, y); c.lineTo(x + r * .28, y + r * .28); c.lineTo(x, y + r); c.lineTo(x - r * .28, y + r * .28); c.lineTo(x - r, y); c.lineTo(x - r * .28, y - r * .28); c.closePath(); c.fill(); c.restore(); }

// ---------- bangunan (dipanggil dari b.draw) ----------
function building(c, b, t, night) {
  const P = NW.P, a = P(b.x0, b.y0, 0), bb = P(b.x1, b.y0, 0), d = P(b.x1, b.y1, 0), e = P(b.x0, b.y1, 0);
  const H = 54, top = (p) => ({ x: p.x, y: p.y - H });
  c.save();
  // lantai panggung
  c.fillStyle = "#6a4426"; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(bb.x, bb.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); c.fill();
  // dinding kiri (x0..x1 sisi y1) & kanan
  const wall = (p, q, col, dark) => { c.fillStyle = col; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.lineTo(q.x, q.y - H); c.lineTo(p.x, p.y - H); c.closePath(); c.fill(); c.fillStyle = dark; for (let i = 1; i < 6; i++) { const f = i / 6; c.fillRect(p.x + (q.x - p.x) * f - 0.5, Math.min(p.y + (q.y - p.y) * f, p.y + (q.y - p.y) * f) - H, 1, H); } };
  wall(e, d, "#8a5a32", "rgba(0,0,0,.12)"); wall(d, bb, "#6f4527", "rgba(0,0,0,.16)");
  // etalase kaca di dinding kiri
  const mid = { x: (e.x + d.x) / 2, y: (e.y + d.y) / 2 };
  c.fillStyle = night ? "#ffd98a" : "#a9dfe6"; rr(c, e.x + (d.x - e.x) * .12, e.y + (d.y - e.y) * .12 - 40, (d.x - e.x) * .34, 24, 3); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2; c.stroke();
  const ex = e.x + (d.x - e.x) * .68; c.fillStyle = night ? "#ffd98a" : "#a9dfe6"; rr(c, ex, mid.y - 24 + (d.y - e.y) * .18 - 14, (d.x - e.x) * .22, 24, 3); c.fill(); c.stroke();
  // barang di etalase berkilau
  for (let i = 0; i < 3; i++) { const sx = e.x + (d.x - e.x) * (.16 + i * .1), sy = e.y + (d.y - e.y) * (.16 + i * .1) - 24; c.fillStyle = [GOLD, EMER, "#d9534f"][i]; c.beginPath(); c.arc(sx, sy, 3.2, 0, TAU); c.fill(); }
  // atap joglo bertingkat
  const ov = 7, roof = (col) => { c.fillStyle = col; c.beginPath(); c.moveTo(e.x - ov, e.y - H); c.lineTo(a.x - ov * .2, a.y - H - 12); c.lineTo(bb.x + ov, bb.y - H); c.lineTo(d.x + ov, d.y - H); c.closePath(); c.fill(); };
  roof("#7a2d1c"); c.fillStyle = "#9a3e27"; c.beginPath(); c.moveTo(e.x - ov, e.y - H); c.lineTo(d.x + ov, d.y - H); c.lineTo((d.x + bb.x) / 2 + ov, (d.y + bb.y) / 2 - H - 18); c.lineTo((e.x + a.x) / 2 - ov, (e.y + a.y) / 2 - H - 18); c.closePath(); c.fill();
  c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x - ov, e.y - H); c.lineTo(d.x + ov, d.y - H); c.lineTo(bb.x + ov, bb.y - H); c.stroke();
  // ujung atap melengkung emas (tanduk)
  c.fillStyle = GOLD; for (const p of [{ x: e.x - ov, y: e.y - H }, { x: bb.x + ov, y: bb.y - H }]) { c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.fill(); }
  // papan nama
  const cx = (e.x + d.x) / 2 + (d.x - e.x) * .02, cy = (e.y + d.y) / 2 - H - 4;
  c.save(); c.translate(cx, cy); const sk = (d.y - e.y) / (d.x - e.x || 1); c.transform(1, sk, 0, 1, 0, 0);
  const g = c.createLinearGradient(-44, -8, 44, 8); g.addColorStop(0, SEA); g.addColorStop(1, "#0b6e66"); c.fillStyle = g; rr(c, -46, -10, 92, 20, 5); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 2; c.stroke();
  c.fillStyle = "#fbe79a"; c.font = "800 11px system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("NUSA PREMIUM", 0, 1); c.restore();
  // lampu hangat (lampion) + kerlip
  const lamp = (x, y, ph) => { c.strokeStyle = "#3a2a1a"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x, y); c.stroke(); const fl = 0.85 + Math.sin(t * 5 + ph) * 0.1; c.fillStyle = "#e0442f"; c.beginPath(); c.ellipse(x, y + 6, 5, 7, 0, 0, TAU); c.fill(); c.fillStyle = GOLD; c.fillRect(x - 3, y - 0.5, 6, 2); c.fillRect(x - 3, y + 11, 6, 2);
    if (night) { const rg = c.createRadialGradient(x, y + 6, 1, x, y + 6, 26); rg.addColorStop(0, `rgba(255,190,90,${.55 * fl})`); rg.addColorStop(1, "rgba(255,190,90,0)"); c.fillStyle = rg; c.fillRect(x - 26, y - 20, 52, 52); } };
  lamp(e.x + (d.x - e.x) * .06, e.y + (d.y - e.y) * .06 - H + 12, 0); lamp(d.x - 4, d.y - H + 14, 2); lamp((e.x + d.x) / 2, (e.y + d.y) / 2 - H + 18, 4);
  // kilau bintang emas (hanya 3, murah)
  for (let i = 0; i < 3; i++) { const ph = (t * .6 + i / 3) % 1; star(c, cx - 40 + i * 40, cy - 14 + Math.sin(ph * TAU) * 3, 3 + (1 - Math.abs(ph - .5) * 2) * 2.4, Math.max(0, Math.sin(ph * Math.PI))); }
  c.restore();
}

// ---------- penjaga toko (Bu Laksmi) ----------
function keeper(c, x, y, t, mode) { // x,y = kaki di layar
  const bob = Math.sin(t * 2.2) * 1.2, wave = mode === "wave" ? Math.sin(t * 9) * 0.5 : 0;
  c.save(); c.translate(x, y + bob);
  c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(0, 1, 9, 3, 0, 0, TAU); c.fill();
  c.fillStyle = "#1f8f6b"; rr(c, -7, -22, 14, 21, 5); c.fill();                       // kebaya zamrud
  c.fillStyle = "#7a2d1c"; c.beginPath(); c.moveTo(-7, -9); c.lineTo(7, -9); c.lineTo(8, 0); c.lineTo(-8, 0); c.closePath(); c.fill(); // kain batik
  c.fillStyle = GOLD; c.fillRect(-7, -10, 14, 2);
  c.fillStyle = "#c68b5e"; c.beginPath(); c.arc(0, -29, 7, 0, TAU); c.fill();       // kepala
  c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(0, -32, 7.2, Math.PI, TAU); c.fill(); c.beginPath(); c.arc(-4, -36, 4, 0, TAU); c.fill(); // sanggul
  c.fillStyle = GOLD; c.beginPath(); c.arc(-4, -36, 1.4, 0, TAU); c.fill();
  c.fillStyle = "#2a1a10"; c.fillRect(-3, -29, 1.6, 2); c.fillRect(1.6, -29, 1.6, 2);
  c.strokeStyle = "#8a4a3a"; c.lineWidth = 1; c.beginPath(); c.arc(0, -26, 2.2, 0.2, Math.PI - 0.2); c.stroke();
  c.strokeStyle = "#c68b5e"; c.lineWidth = 3.4; c.lineCap = "round";               // lengan
  c.beginPath(); c.moveTo(-6, -19); c.lineTo(-9, -11); c.stroke();
  c.beginPath(); c.moveTo(6, -19); c.lineTo(11 + wave * 3, -26 - Math.abs(wave) * 8); c.stroke();
  c.restore();
}

// ---------- pratinjau produk (animasi kecil) — kanvas w×h ----------
function bgSea(c, w, h, t) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#15597a"); g.addColorStop(1, "#073a4c"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(255,255,255,.12)"; c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); for (let x = 0; x <= w; x += 6) { const y = h * (.62 + i * .1) + Math.sin(x * .08 + t * 1.6 + i) * 2; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); } }
function person(c, x, y, s, o) { // sosok kecil
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = o.pants || "#2b3a44"; c.fillRect(-5, -4, 4.4, 10); c.fillRect(0.6, -4, 4.4, 10);
  c.fillStyle = o.shirt; rr(c, -8, -22, 16, 20, 4); c.fill();
  if (o.sash) { c.fillStyle = o.sash; c.fillRect(-8, -9, 16, 3); }
  if (o.trim) { c.strokeStyle = o.trim; c.lineWidth = 1.4; rr(c, -8, -22, 16, 20, 4); c.stroke(); }
  c.fillStyle = "#c68b5e"; c.beginPath(); c.arc(0, -29, 7, 0, TAU); c.fill();
  c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(0, -31, 7, Math.PI, TAU); c.fill();
  if (o.headband) { c.fillStyle = o.headband; c.fillRect(-7, -33, 14, 3); }
  if (o.crown) { c.fillStyle = GOLD; c.beginPath(); c.moveTo(-7, -35); c.lineTo(-7, -42); c.lineTo(-3.5, -38); c.lineTo(0, -44); c.lineTo(3.5, -38); c.lineTo(7, -42); c.lineTo(7, -35); c.closePath(); c.fill(); }
  c.fillStyle = "#2a1a10"; c.fillRect(-3, -29, 1.5, 2); c.fillRect(1.5, -29, 1.5, 2);
  c.restore();
}
function nameTag(c, x, y, text, kind, t, w) {
  c.save(); c.font = "800 12px system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
  if (kind === "gold") { const g = c.createLinearGradient(x - 30, 0, x + 30, 0), k = (t * .8) % 1; g.addColorStop(0, GOLD_D); g.addColorStop(Math.max(0, k - .15), "#f3d77a"); g.addColorStop(k, "#fffbe0"); g.addColorStop(Math.min(1, k + .15), "#f3d77a"); g.addColorStop(1, GOLD_D); c.fillStyle = g; c.shadowColor = "rgba(232,194,90,.8)"; c.shadowBlur = 6; }
  else if (kind === "wave") { c.fillStyle = "#8ff0d4"; c.shadowColor = "#22d3ee"; c.shadowBlur = 5; }
  else c.fillStyle = "#fff";
  if (kind === "wave") { let px = x - c.measureText(text).width / 2; for (const ch of text) { const wv = c.measureText(ch).width; c.fillText(ch, px + wv / 2, y + Math.sin(t * 5 + px * .15) * 2.2); px += wv; } } else c.fillText(text, x, y);
  c.restore();
}
const PREV = {
  gamepass_sultan(c, w, h, t) { bgSea(c, w, h, t); const g = c.createRadialGradient(w / 2, h * .5, 4, w / 2, h * .5, h * .8); g.addColorStop(0, "rgba(232,194,90,.45)"); g.addColorStop(1, "rgba(232,194,90,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    person(c, w / 2, h * .8, 1.15, { shirt: "#7a2d1c", trim: GOLD, sash: GOLD, crown: true, headband: GOLD }); nameTag(c, w / 2, h * .1, "Sultan Samudra", "gold", t); for (let i = 0; i < 4; i++) star(c, w * (.18 + i * .22), h * (.28 + .1 * Math.sin(t * 2 + i)), 3 + i % 2 * 1.5, .5 + .5 * Math.sin(t * 3 + i * 1.7)); },
  skin_kapal_nusantara(c, w, h, t) { bgSea(c, w, h, t); const bob = Math.sin(t * 2) * 2, x = w / 2, y = h * .66 + bob; c.save(); c.translate(x, y); c.rotate(Math.sin(t * 1.6) * .04);
    c.fillStyle = "#5a2e18"; c.beginPath(); c.moveTo(-34, -4); c.lineTo(34, -4); c.lineTo(26, 10); c.lineTo(-26, 10); c.closePath(); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.moveTo(-34, -4); c.lineTo(34, -4); c.stroke();
    c.strokeStyle = "#3a2a1a"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -4); c.lineTo(0, -44); c.stroke(); const fl = Math.sin(t * 3) * 2; c.fillStyle = "#c8312b"; c.beginPath(); c.moveTo(1, -42); c.quadraticCurveTo(26 + fl, -30, 24 + fl, -8); c.lineTo(1, -8); c.closePath(); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 1.2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(4, -36 + i * 9); c.lineTo(20 + fl * .6, -32 + i * 8); c.stroke(); } c.restore(); },
  kostum_nelayan(c, w, h, t) { bgSea(c, w, h, t); person(c, w / 2, h * .82, 1.2 + Math.sin(t * 2) * .02, { shirt: "#1b6c8c", trim: "#e8f6ff", sash: "#e8f6ff", headband: GOLD }); },
  dekor_rumah(c, w, h, t) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#3a2414"); g.addColorStop(1, "#6a4426"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) { const x = w * (.2 + i * .3), sw = Math.sin(t * 2 + i) * 3; c.strokeStyle = "#2a1a10"; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + sw * .3, h * .22); c.stroke(); const gl = c.createRadialGradient(x + sw, h * .4, 2, x + sw, h * .4, 30); gl.addColorStop(0, "rgba(255,190,90,.6)"); gl.addColorStop(1, "rgba(255,190,90,0)"); c.fillStyle = gl; c.fillRect(x - 30, h * .1, 60, 70);
      c.fillStyle = "#d8452f"; c.beginPath(); c.ellipse(x + sw, h * .4, 9, 12, 0, 0, TAU); c.fill(); c.fillStyle = GOLD; c.fillRect(x + sw - 6, h * .4 - 13, 12, 3); c.fillRect(x + sw - 6, h * .4 + 10, 12, 3); } c.fillStyle = "#3a2414"; c.fillRect(0, h * .86, w, h * .14); },
  efek_nama(c, w, h, t) { bgSea(c, w, h, t); person(c, w / 2, h * .86, 1, { shirt: "#579b8b" }); nameTag(c, w / 2, h * .12, "NamaKamu", "wave", t); },
};
function coin(c, x, y, r, sq) { c.save(); c.translate(x, y); c.scale(sq, 1); const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, "#fff0a0"); g.addColorStop(.5, GOLD); g.addColorStop(1, GOLD_D); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.strokeStyle = GOLD_D; c.lineWidth = 1.5; c.stroke(); c.fillStyle = GOLD_D; c.font = `800 ${r}px system-ui`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("N", 0, 1); c.restore(); }
function packPreview(c, w, h, t, n) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0e4a63"); g.addColorStop(1, "#073a4c"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  const cnt = [2, 4, 6, 9][n] || 3; for (let i = 0; i < cnt; i++) { const a = i / cnt * TAU + t * .8, rad = 8 + (i % 3) * 7 + n * 3; coin(c, w / 2 + Math.cos(a) * rad * 1.6, h * .56 + Math.sin(a) * rad * .5 - (i % 2) * 6, 9 + (i % 2) * 2, Math.abs(Math.cos(t * 3 + i))); }
  coin(c, w / 2, h * .5, 14 + n * 1.5, Math.max(.25, Math.abs(Math.cos(t * 2.4)))); star(c, w * .2, h * .25, 4, .5 + .5 * Math.sin(t * 4)); star(c, w * .82, h * .3, 3, .5 + .5 * Math.sin(t * 3 + 1)); }
function preview(id, c, w, h, t) { if (PREV[id]) PREV[id](c, w, h, t); else { const i = ["topup_pemula", "topup_nelayan", "topup_juragan", "topup_sultan"].indexOf(id); packPreview(c, w, h, t, Math.max(0, i)); } }

NW.shopArt = { building, keeper, preview, GOLD, SEA, EMER, rr, coin, person, nameTag };
})();
