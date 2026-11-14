// NUSA ISLAND — Ide 08B · Kedai Bu Indah (interior yang bisa dijelajahi + alur belanja berjalan kaki).
// Alur: masuk → ambil keranjang → berdiri di rak → pilih bahan (masuk KERANJANG SEMENTARA) → ke kasir Bu Indah → server menghitung harga & saldo (dapurBuy, atomik).
// Gagal = keranjang & koin utuh. Coba lagi dengan opId yang SAMA = tidak ganda. Keranjang tidak pernah menyentuh server sebelum bayar.
// Harga selalu dari katalog SERVER (nilai uji sampai Owner memutuskan); modul ini tidak menyimpan angka harga.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDapurCore, A = NW.dapurArt; if (!Core || !A || !NW.room) return;
const N = () => window.Nusa, $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const P = A.P, L = Core.LAYOUT.kedai, TAU = Math.PI * 2;
const fmt = (n) => (N() && N().fmt ? N().fmt(n) : String(n));

// ---------- keadaan belanja ----------
const K = { cat: null, dapur: null, own: null, tools: null, basket: Core.newBasket(), has: false, pay: null, busy: false, loading: false, loadErr: "", msg: "", sheet: null, receipt: null, confirmTool: false, bought: 0 };
const api = () => NW.dapur && NW.dapur.api;
const toast = (m, k) => { try { N().toast(m, k); } catch (e) { /* tampilan saja */ } };
const sfx = (n) => { try { N().sfx(n); } catch (e) { /* suara opsional */ } };

// ---------- Bu Indah (NPC dengan jalur sederhana, tanpa pencarian jalan) ----------
const bu = { x: 8.0, y: 2.9, z: 0, dir: 2, walk: 0, moving: false, sit: false, rod: 0, rodSpec: null, hold: null, seed: 4.4, name: "Bu Indah",
  style: { shirt: "#d6586e", pants: "#5b3a5c", skin: "#c68b5e", hair: "#2a1d14", hat: "bun", hatCol: "#f0c53a", apron: "#fff6e4" } };
const bs = { i: 0, wait: 3, say: null, sayT: 0 };
const dirOfScreen = (dx, dy) => { const a = Math.atan2(dy, dx); return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; };
function faceTo(n, x, y) { const a = P(n.x, n.y), b = P(x, y); n.dir = dirOfScreen(b.x - a.x, b.y - a.y); }
function say(text, s) { bs.say = text; bs.sayT = s || 3.2; }
function updateBu(dt, pl) {
  const route = L.bu.route, near = Math.hypot(pl.x - L.stations.kasir.x, pl.y - L.stations.kasir.y) < 2.2 || K.sheet === "pay";
  const tgt = near ? route[0] : route[bs.i];
  const dx = tgt.x - bu.x, dy = tgt.y - bu.y, d = Math.hypot(dx, dy);
  if (d > 0.06) { const st = Math.min(d, dt * (near ? 1.5 : 0.85)); bu.x += (dx / d) * st; bu.y += (dy / d) * st; bu.moving = true; bu.walk += dt * 8; const a = P(0, 0), b = P(dx, dy); bu.dir = dirOfScreen(b.x - a.x, b.y - a.y); }
  else { bu.moving = false; if (near) faceTo(bu, pl.x, pl.y); else if (bs.wait > 0) { bs.wait -= dt; if (bs.wait <= 0) { bs.i = (bs.i + 1) % route.length; bs.wait = route[bs.i].wait; } } else { bs.i = (bs.i + 1) % route.length; bs.wait = route[bs.i].wait; } if (!near && Math.hypot(bu.x - route[0].x, bu.y - route[0].y) < 0.1 && Math.random() < dt * 0.1) faceTo(bu, pl.x, pl.y); }
  if (bs.sayT > 0) { bs.sayT -= dt; if (bs.sayT <= 0) bs.say = null; }
}

// ---------- partikel terbang (kolam objek tetap: tidak ada alokasi per bingkai) ----------
const fly = []; for (let i = 0; i < 12; i++) fly.push({ on: false, x0: 0, y0: 0, x1: 0, y1: 0, t: 0, d: 0.5, ic: "" });
function launch(from, ic) { const f = fly.find((q) => !q.on) || fly[0], pl = NW.world.player; Object.assign(f, { on: true, x0: from.x, y0: from.y, x1: pl.x, y1: pl.y, t: 0, d: 0.5, ic }); }
function updateFly(dt) { for (const f of fly) if (f.on) { f.t += dt; if (f.t >= f.d) f.on = false; } }
function drawFly(c) {
  for (const f of fly) {
    if (!f.on) continue; const k = f.t / f.d, e = k * k * (3 - 2 * k), p = P(f.x0 + (f.x1 - f.x0) * e, f.y0 + (f.y1 - f.y0) * e, 26 + Math.sin(k * Math.PI) * 30);
    c.globalAlpha = 1 - k * k * 0.5; c.font = "15px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(f.ic, p.x, p.y); c.globalAlpha = 1;
  }
}
const center = (s) => ({ x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2 });

// ---------- kucing toko ----------
const cat = { hearts: 0, wake: 0 };
function drawCat(c, t) {
  const s = L.solids.kucing, ctr = center(s), cu = P(ctr.x, ctr.y, 0);
  c.fillStyle = "rgba(0,0,0,.2)"; A.ell(c, cu.x, cu.y + 1, 17, 7, "rgba(0,0,0,.2)");
  A.ell(c, cu.x, cu.y - 3, 15, 6.5, "#a8332a"); A.ell(c, cu.x, cu.y - 6, 15, 6.5, "#d94f3d"); A.ell(c, cu.x, cu.y - 7, 8, 3, "#e8705e");        // bantal duduk
  const br = Math.sin(t * 1.6) * 0.5, awake = cat.wake > 0;
  c.save(); c.translate(cu.x, cu.y - 11);
  A.ell(c, 0, 0, 10.5, 5.6 + br * 0.4, "#ddd6c8"); A.ell(c, -3, -1, 5, 3.2, "#e08a3c"); A.ell(c, 4, 1.5, 3.6, 2.6, "#3a3028");                     // badan: putih, belang jingga & hitam
  A.ell(c, 9, -1.5, 5, 4.4, "#ddd6c8"); A.ell(c, 10.5, -3, 2.6, 2, "#e08a3c");                                                                       // kepala
  c.fillStyle = "#ddd6c8"; c.beginPath(); c.moveTo(6.6, -4.6); c.lineTo(7.6, -9); c.lineTo(10, -5.4); c.fill(); c.beginPath(); c.moveTo(10.4, -5.6); c.lineTo(13, -8.8); c.lineTo(13.4, -3.8); c.fill();
  c.fillStyle = "#e8a3b0"; c.beginPath(); c.moveTo(7.7, -5.2); c.lineTo(8, -7.4); c.lineTo(9.2, -5.4); c.fill();
  c.strokeStyle = "#2a1d14"; c.lineWidth = 0.9; c.beginPath(); if (awake) { c.arc(8.6, -1.8, 0.7, 0, TAU); c.moveTo(12, -1.8); c.arc(11.4, -1.8, 0.7, 0, TAU); } else { c.moveTo(7.6, -1.9); c.lineTo(9.4, -1.6); c.moveTo(10.6, -1.5); c.lineTo(12.3, -1.8); } c.stroke();
  c.strokeStyle = "#e08a3c"; c.lineWidth = 2.4; c.lineCap = "round"; c.beginPath(); c.moveTo(-9, 1.5); c.quadraticCurveTo(-14, 3, -12, -2 + Math.sin(t * 2) * 1.2); c.stroke();      // ekor
  c.restore();
  if (!awake) { c.fillStyle = "#173f50"; c.globalAlpha = 0.55 + 0.35 * Math.sin(t * 2); c.font = "800 8px system-ui"; c.textAlign = "center"; c.fillText("z", cu.x + 14, cu.y - 20 - ((t * 5) % 7)); c.fillText("Z", cu.x + 19, cu.y - 27 - ((t * 5) % 7)); c.globalAlpha = 1; }
  if (cat.hearts > 0) { c.globalAlpha = Math.min(1, cat.hearts); A.heart(c, cu.x + 4, cu.y - 30 - (1.5 - cat.hearts) * 14, 4, "#e2574c"); c.globalAlpha = 1; }
}

// ---------- perabot dinamis ----------
function drawEtalase(c, t) {
  const s = L.solids.etalase, H = 36;
  A.woodBox(c, { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }, 0, 14, A.WOOD);
  A.fill(c, A.quadY(s.x0 + 0.1, s.x1 - 0.1, s.y1, 2, 12), A.shade(A.WOOD, -0.15), A.WOOD3, 0.8);
  A.textOn(c, "y", (s.x0 + s.x1) / 2, s.y1, 7, "KOPI & ALAT DAPUR", 5, "#fff3d4");
  A.fill(c, [P(s.x0, s.y0, 14), P(s.x1, s.y0, 14), P(s.x1, s.y1, 14), P(s.x0, s.y1, 14)], "#f1dcae");                                       // alas kaca
  A.fill(c, A.quadY(s.x0, s.x1, s.y0, 14, H), "rgba(190,230,240,.38)");                                                                         // dinding belakang kaca
  A.fill(c, A.quadX(s.x0, s.y0, s.y1, 14, H), "rgba(190,230,240,.3)");
  A.fill(c, [P(s.x0, s.y0, 25), P(s.x1, s.y0, 25), P(s.x1, s.y1, 25), P(s.x0, s.y1, 25)], "rgba(255,255,255,.55)");                            // rak kaca tengah
  for (let k = 0; k < 6; k++) { const p = P(s.x0 + 0.22 + k * 0.24, s.y0 + 0.5, 14); const h = 9 + (k % 2) * 2; A.rrect(c, p.x - 4, p.y - h, 8, h, 1); c.fillStyle = k % 2 ? "#6b3d1e" : "#8a4f26"; c.fill(); c.fillStyle = "#f7ead2"; c.fillRect(p.x - 3, p.y - h * 0.65, 6, h * 0.3); c.fillStyle = "#3a1d0c"; c.fillRect(p.x - 4, p.y - h, 8, 1.6); }   // bungkus kopi
  for (let k = 0; k < 3; k++) { const p = P(s.x0 + 0.3 + k * 0.4, s.y0 + 0.5, 25); A.jar(c, p, 8, 9, k === 1 ? "#a05a30" : "#d6a04a", "#3a2a1a", "#fbf1da"); }       // kaleng kopi di rak atas
  const kr = P(s.x1 - 0.3, s.y0 + 0.5, 25); A.basket(c, kr, 12, 6, "#c9a45c"); for (let k = 0; k < 4; k++) A.ell(c, kr.x - 4 + k * 2.7, kr.y - 8, 2.2, 2.8, "#f0a23a");        // keranjang kerupuk
  A.fill(c, A.quadY(s.x0, s.x1, s.y1, 14, H), "rgba(210,240,246,.22)", "rgba(255,255,255,.7)", 1.2);                                           // kaca depan
  A.fill(c, A.quadX(s.x1, s.y0, s.y1, 14, H), "rgba(190,225,236,.2)", "rgba(255,255,255,.55)", 1.2);
  const g = P(s.x0 + 0.3, s.y1, 30); c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2; c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x + 14, g.y - 7); c.stroke();    // kilau
  A.fill(c, [P(s.x0, s.y0, H), P(s.x1, s.y0, H), P(s.x1, s.y1, H), P(s.x0, s.y1, H)], "#8a5a32", A.WOOD3, 0.8);
  A.fill(c, [P(s.x0 + 0.03, s.y0 + 0.03, H), P(s.x1 - 0.03, s.y0 + 0.03, H), P(s.x1 - 0.03, s.y1 - 0.03, H), P(s.x0 + 0.03, s.y1 - 0.03, H)], "#b98650");
  const pc = P(s.x1 - 0.3, s.y0 + 0.4, H); A.rrect(c, pc.x - 6, pc.y - 8, 12, 8, 1.5); c.fillStyle = "#26363a"; c.fill(); c.fillStyle = "#e8b53a"; c.fillRect(pc.x - 4, pc.y - 7, 8, 1.6);   // lampu kecil di atas
}
function drawKasir(c, t) {
  const s = L.solids.kasir, pn = L.solids.panel, H = 34;
  A.woodBox(c, { x0: pn.x0, y0: pn.y0, x1: pn.x1, y1: pn.y1 }, 0, H, A.WOOD2);                                                                // sisi meja (panel kiri)
  A.woodBox(c, { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }, 0, H, A.WOOD);
  A.fill(c, A.quadY(s.x0 + 0.12, s.x1 - 0.12, s.y1, 3, H - 4), A.shade(A.WOOD, -0.14), A.WOOD3, 0.8);                                         // panel depan masuk
  for (let k = 0; k < 9; k++) { const x = s.x0 + 0.35 + k * 0.28; const p = P(x, s.y1, 17); c.fillStyle = k % 2 ? "rgba(232,181,58,.8)" : "rgba(217,79,61,.8)"; c.beginPath(); c.moveTo(p.x, p.y - 4); c.lineTo(p.x + 3.4, p.y); c.lineTo(p.x, p.y + 4); c.lineTo(p.x - 3.4, p.y); c.fill(); }   // pita batik belah ketupat
  A.line(c, P(s.x0 + 0.12, s.y1, H - 6), P(s.x1 - 0.12, s.y1, H - 6), "#e8b53a", 1.6);
  A.fill(c, [P(s.x0 - 0.05, s.y0 - 0.02, H), P(s.x1, s.y0 - 0.02, H), P(s.x1, s.y1 + 0.06, H), P(s.x0 - 0.05, s.y1 + 0.06, H)], "#c79a64", A.WOOD3, 0.8);       // permukaan meja
  A.fill(c, [P(s.x0 + 0.05, s.y0 + 0.05, H + 0.2), P(s.x1 - 0.1, s.y0 + 0.05, H + 0.2), P(s.x1 - 0.1, s.y1 - 0.05, H + 0.2), P(s.x0 + 0.05, s.y1 - 0.05, H + 0.2)], "rgba(255,244,214,.18)");
  A.panelOn(c, "y", (s.x0 + s.x1) / 2 - 0.2, s.y1 + 0.005, 26, 54, 12, "#26363a", "#e8b53a", 2); A.textOn(c, "y", (s.x0 + s.x1) / 2 - 0.2, s.y1 + 0.005, 26, "KASIR · BAYAR DI SINI", 5.2, "#ffe9a8");
  // mesin kasir + laci uang terbuka sedikit, timbangan digital, tusuk struk, toples kerupuk, lonceng, piring koin
  const rg = { x0: 8.05, y0: 3.55, x1: 8.6, y1: 4.0 }; A.box(c, rg, H, 12, "#586670", "#3d4952", "#2f3a42", "rgba(0,0,0,.4)");
  const sc = P(8.3, 3.6, H + 12); A.rrect(c, sc.x - 5, sc.y - 6, 10, 6, 1); c.fillStyle = "#26363a"; c.fill(); c.fillStyle = "#7fe0a0"; c.fillRect(sc.x - 4, sc.y - 5, 8, 2.4); c.fillStyle = "#bcd0da"; for (let k = 0; k < 6; k++) c.fillRect(sc.x - 4.5 + (k % 3) * 3.2, sc.y - 2.2 + ((k / 3) | 0) * 1.6, 2.4, 1);
  const dr = P(8.3, 4.03, H + 3); c.fillStyle = "#2f3a42"; c.fillRect(dr.x - 6, dr.y - 1, 12, 3.2); c.fillStyle = "#e8b53a"; c.fillRect(dr.x - 3, dr.y - 0.2, 6, 1);
  const ts = { x0: 7.1, y0: 3.55, x1: 7.65, y1: 4.0 }; A.box(c, ts, H, 3.2, "#e9eef0", "#cdd6da", "#b4bfc4", "rgba(0,0,0,.3)"); const tp = P(7.38, 3.78, H + 3.2); c.fillStyle = "#26363a"; c.fillRect(tp.x - 3, tp.y - 1.6, 6, 2.2); c.fillStyle = "#7fe0a0"; c.fillRect(tp.x - 2, tp.y - 1.3, 4, 1.1);
  const sp = P(6.95, 3.95, H); c.fillStyle = "#6e7a78"; c.fillRect(sp.x - 0.6, sp.y - 13, 1.2, 13); for (let k = 0; k < 3; k++) { c.fillStyle = "#fbf3e0"; c.fillRect(sp.x - 3.2, sp.y - 4 - k * 3, 6.4, 2.5); c.strokeStyle = "rgba(0,0,0,.2)"; c.lineWidth = 0.5; c.strokeRect(sp.x - 3.2, sp.y - 4 - k * 3, 6.4, 2.5); }
  const jr = P(8.85, 3.5, H); A.jar(c, jr, 10, 14, "rgba(215,235,240,.7)", "#d94f3d", null); for (let k = 0; k < 4; k++) A.ell(c, jr.x - 3 + k * 2, jr.y - 4 - (k % 2) * 3, 2.4, 3, "#f0a23a");
  const bl = P(7.75, 3.45, H); c.fillStyle = "#e8b53a"; c.beginPath(); c.moveTo(bl.x - 4, bl.y); c.quadraticCurveTo(bl.x - 4, bl.y - 7, bl.x, bl.y - 7); c.quadraticCurveTo(bl.x + 4, bl.y - 7, bl.x + 4, bl.y); c.closePath(); c.fill(); c.fillStyle = "#8a6a14"; c.fillRect(bl.x - 0.8, bl.y - 9, 1.6, 2);
  const pd = P(7.85, 3.85, H); A.ell(c, pd.x, pd.y - 0.5, 6, 2.5, "#8a5a32"); for (let k = 0; k < 3; k++) A.ell(c, pd.x - 2 + k * 2, pd.y - 1.6, 1.6, 1, "#f0c53a");
}
function drawKeranjang(c) {
  const s = L.solids.keranjang, ctr = center(s), p = P(ctr.x, ctr.y, 0), n = K.has ? 2 : 3;
  const st = P(ctr.x + 0.15, s.y0 + 0.1, 0); c.fillStyle = "#5a3a20"; c.fillRect(st.x - 12, st.y - 4, 24, 4);
  const cols = ["#c9a45c", "#d94f3d", "#4f9a46"];
  for (let i = 0; i < n; i++) { const bp = { x: p.x, y: p.y - i * 6 }; A.basket(c, bp, 24, 11, cols[i % 3]); c.strokeStyle = A.shade(cols[i % 3], -0.35); c.lineWidth = 1.4; c.beginPath(); c.arc(bp.x, bp.y - 11, 8, Math.PI, 0); c.stroke(); }
  A.panelOn(c, "y", ctr.x, s.y1 + 0.02, 6, 36, 8, "#fbf1da", "#8a5a32", 2); A.textOn(c, "y", ctr.x, s.y1 + 0.02, 6, "KERANJANG", 5.2, A.INK);
}
function drawBu(c, t) {
  NW.drawCharacter(c, bu, t);
  const d = Math.hypot(NW.world.player.x - bu.x, NW.world.player.y - bu.y);
  if (d < 3.2) { const p = P(bu.x, bu.y, 62); c.font = "700 9px system-ui, sans-serif"; c.textAlign = "center"; c.globalAlpha = Math.min(1, (3.2 - d) / 1.2); c.lineWidth = 3; c.strokeStyle = "rgba(23,63,80,.85)"; c.strokeText("Bu Indah", p.x, p.y); c.fillStyle = "#fff9ec"; c.fillText("Bu Indah", p.x, p.y); c.globalAlpha = 1; }
}
function drawSay(c) {
  if (!bs.say) return; const p = P(bu.x, bu.y, 84), w = Math.min(190, 14 + bs.say.length * 5.2);
  c.fillStyle = "rgba(255,249,236,.97)"; c.strokeStyle = A.INK; c.lineWidth = 1.4; A.rrect(c, p.x - w / 2, p.y - 24, w, 22, 8); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(p.x - 4, p.y - 2); c.lineTo(p.x, p.y + 5); c.lineTo(p.x + 4, p.y - 2); c.fill(); c.fillStyle = A.INK; c.font = "700 9.5px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(bs.say, p.x, p.y - 13);
}
function afterPlayer(c, pl, t) {                                                                                                                 // keranjang di tangan + lencana jumlah
  if (!K.has) return; const o = P(pl.x, pl.y, 0), n = Core.count(K.basket), fx = [1, 0.7, 0, -0.7, -1, -0.7, 0, 0.7][pl.dir | 0];
  const bx = o.x + (fx >= 0 ? 11 : -11), by = o.y - 5; c.save(); A.basket(c, { x: bx, y: by }, 13, 7, "#c9a45c");
  c.strokeStyle = "#8a6a38"; c.lineWidth = 1.2; c.beginPath(); c.arc(bx, by - 7, 5.5, Math.PI, 0); c.stroke();
  const ids = Object.keys(K.basket).slice(0, 3); ids.forEach((id, i) => { const cat0 = K.cat && K.cat[id]; c.font = "7px sans-serif"; c.textAlign = "center"; c.fillText(cat0 ? cat0.icon : "•", bx - 3.5 + i * 3.5, by - 8 - (i % 2)); });
  if (n > 0) { c.fillStyle = "#d94f3d"; c.beginPath(); c.arc(bx + 6, by - 14, 4.6, 0, TAU); c.fill(); c.fillStyle = "#fff"; c.font = "800 6.5px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(n > 99 ? "99+" : String(n), bx + 6, by - 14); }
  c.restore();
}

// ---------- UI belanja (sheet kecil di bawah; dunia tetap terlihat) ----------
function ensureUI() {
  if ($("kdSheet")) return;
  const chip = document.createElement("div"); chip.id = "kdChip"; chip.className = "kd-chip hidden";
  chip.innerHTML = '<button type="button" id="kdChipBtn" aria-label="Lihat keranjang">🧺 <b id="kdChipN">0</b><i></i>🪙 <b id="kdChipOwn">–</b></button>';
  const sh = document.createElement("div"); sh.id = "kdSheet"; sh.className = "kd-sheet hidden"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "false");
  document.body.appendChild(chip); document.body.appendChild(sh);
  NW.room.watchSheet(sh); sh.addEventListener("click", onSheetClick); $("kdChipBtn").addEventListener("click", () => { sfx("click"); if (K.sheet === "pay") return; openSheet("pay"); });
}
function syncChip() {
  const c = $("kdChip"); if (!c) return; const on = NW.room.active && NW.room.scene === "kedai"; c.classList.toggle("hidden", !on);
  if (!on) return; $("kdChipN").textContent = Core.count(K.basket); $("kdChipOwn").textContent = K.own === null ? "–" : fmt(K.own);
}
let blocked = false;
function setBlock(on) { if (on === blocked) return; blocked = on; NW.room.block(on); }
function openSheet(kind, arg) {
  ensureUI(); K.sheet = kind; K.arg = arg || null; K.msg = ""; K.confirmTool = false; setBlock(true); $("kdSheet").classList.remove("hidden", "mini"); render();
  if (!K.cat && !K.loading) load();
}
function closeSheet() { K.sheet = null; const s = $("kdSheet"); if (s) { s.classList.add("hidden"); s.innerHTML = ""; } setBlock(false); syncChip(); }
function stepper(id, n, dis) {
  return `<div class="kd-step" role="group" aria-label="Jumlah"><button type="button" data-a="dec" data-id="${esc(id)}" aria-label="Kurangi" ${n < 1 || dis ? "disabled" : ""}>−</button><output>${n}</output><button type="button" data-a="inc" data-id="${esc(id)}" aria-label="Tambah" ${dis ? "disabled" : ""}>+</button></div>`;
}
function itemRow(id) {
  const c = K.cat && K.cat[id]; if (!c) return "";
  const n = K.basket[id] || 0, have = Core.stockOf(K.dapur, id);
  return `<li class="kd-row"><span class="kd-ic" aria-hidden="true">${esc(c.icon)}</span><span class="kd-nm"><b>${esc(c.name)}</b><small>🪙 ${fmt(c.price)}${have ? ` · di dapur: ${have}` : ""}</small></span>${stepper(id, n, K.busy)}</li>`;
}
function render() {
  const sh = $("kdSheet"); if (!sh || !K.sheet) return; syncChip();
  let h = "";
  if (K.sheet === "shelf") {
    const S = Core.SHELVES[K.arg];
    h += `<header><h3>${esc(S.icon)} ${esc(S.name)}</h3><button type="button" class="kd-x" data-a="close" aria-label="Tutup">✕</button></header>`;
    if (!K.cat) h += `<p class="kd-note">${K.loading ? "Bu Indah sedang menata harga…" : esc(K.loadErr || "Daftar harga belum dimuat.")}</p>${K.loading ? "" : '<button type="button" class="kd-btn" data-a="retry">Coba lagi</button>'}`;
    else {
      h += `<ul class="kd-list">${S.ids.map(itemRow).join("")}</ul>`;
      if (K.arg === "etalase") h += toolRow();
      h += `<footer><span>🧺 ${Core.count(K.basket)} barang · 🪙 ${fmt(Core.total(K.basket, K.cat))}</span><button type="button" class="kd-btn" data-a="close">Selesai</button></footer>${K.msg ? `<p class="kd-note warn">${esc(K.msg)}</p>` : ""}`;
    }
  } else if (K.sheet === "pay") {
    if (K.receipt) h += receiptHTML();
    else {
      const ls = Core.lines(K.basket, K.cat), tot = Core.total(K.basket, K.cat), short = K.own !== null && tot > K.own;
      h += `<header><h3>🧾 Kasir Bu Indah</h3><button type="button" class="kd-x" data-a="close" aria-label="Tutup">✕</button></header>`;
      if (!ls.length) h += `<p class="kd-note">Keranjangmu masih kosong. Pilih bahan di rak dulu, lalu kembali ke sini.</p><footer><span></span><button type="button" class="kd-btn" data-a="close">Belanja dulu</button></footer>`;
      else {
        h += `<ul class="kd-list sm">${ls.map((l) => `<li class="kd-row"><span class="kd-ic" aria-hidden="true">${esc(l.icon)}</span><span class="kd-nm"><b>${esc(l.name)}</b><small>${l.n} × 🪙 ${fmt(l.price)}</small></span><span class="kd-sub">🪙 ${fmt(l.sub)}</span>${stepper(l.id, l.n, K.busy)}</li>`).join("")}</ul>`;
        h += `<div class="kd-total"><span>Total belanja</span><b>🪙 ${fmt(tot)}</b></div><div class="kd-bal${short ? " bad" : ""}"><span>Koin bermainmu</span><b>${K.own === null ? "–" : "🪙 " + fmt(K.own)}</b></div>`;
        h += `<p class="kd-note ${K.msg ? "warn" : ""}">${esc(K.msg || (short ? `Koin bermainmu kurang 🪙 ${fmt(tot - K.own)}. Kurangi belanjaan.` : "Harga akhir dihitung server saat kamu membayar."))}</p>`;
        h += `<footer><button type="button" class="kd-btn ghost" data-a="more" ${K.busy ? "disabled" : ""}>Tambah</button><button type="button" class="kd-btn gold" data-a="pay" ${K.busy || short ? "disabled" : ""}>${K.busy ? "Memproses…" : "Bayar 🪙 " + fmt(tot)}</button></footer>`;
      }
    }
  }
  sh.innerHTML = NW.room.GRIP + h;
}
function toolRow() {
  const t = K.tools && K.tools.find((x) => x.id === "pemanggang"); if (!t) return "";
  if (t.open) return `<div class="kd-tool"><span class="kd-ic" aria-hidden="true">♨️</span><span class="kd-nm"><b>${esc(t.name)}</b><small>Sudah ada di dapurmu</small></span><span class="kd-done">✔</span></div>`;
  return `<div class="kd-tool"><span class="kd-ic" aria-hidden="true">♨️</span><span class="kd-nm"><b>${esc(t.name)}</b><small>Alat dapur · 🪙 ${fmt(t.price)}</small></span><button type="button" class="kd-btn ${K.confirmTool ? "gold" : ""}" data-a="tool" ${K.busy ? "disabled" : ""}>${K.confirmTool ? "Yakin beli?" : "Beli"}</button></div>`;
}
function receiptHTML() {
  const r = K.receipt, d = new Date();
  return `<div class="kd-receipt" role="document"><div class="kd-rh"><b>KEDAI BU INDAH</b><small>Muara Kampung · ${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</small></div>
    <ul>${r.lines.map((l) => `<li><span>${esc(l.name)} <small>${l.n} × ${fmt(l.price)}</small></span><b>${fmt(l.sub)}</b></li>`).join("")}</ul>
    <div class="kd-rt"><span>TOTAL</span><b>🪙 ${fmt(r.cost)}</b></div><div class="kd-rs"><span>Sisa koin bermain</span><b>🪙 ${fmt(r.own)}</b></div><p>Terima kasih sudah belanja! 🌿</p></div>
    <footer><span></span><button type="button" class="kd-btn gold" data-a="done">Selesai</button></footer>`;
}
function onSheetClick(e) {
  const b = e.target.closest("[data-a]"); if (!b || b.disabled) return; const a = b.dataset.a, id = b.dataset.id;
  if (a === "close") { sfx("click"); return closeSheet(); }
  if (a === "done") { sfx("click"); K.receipt = null; return closeSheet(); }
  if (a === "more") { sfx("click"); return closeSheet(); }
  if (a === "retry") return load();
  if (a === "inc" || a === "dec") return changeQty(id, a === "inc" ? 1 : -1);
  if (a === "pay") return pay();
  if (a === "tool") return unlockTool();
}
function changeQty(id, d) {
  if (K.busy) return; const r = Core.add(K.basket, id, d, K.cat, K.dapur);
  if (!r.ok) { K.msg = Core.whyText(r.why); sfx("buzz"); return render(); }
  K.msg = ""; K.pay = null;                                                                                          // isi berubah → opId baru nanti
  if (d > 0) { const st = L.solids[Core.shelfOf(id) === "beras" ? "rakBeras" : Core.shelfOf(id)] || L.solids.kasir; launch(center(st), (K.cat[id] || {}).icon || "•"); sfx("click"); }
  render();
}

// ---------- panggilan server ----------
async function load() {
  if (K.loading || !api()) return; K.loading = true; K.loadErr = ""; render();
  try {
    const r = await api().state();
    K.cat = Core.catalogMap(r && r.catalog); K.dapur = (r && r.dapur) || null; K.tools = (r && r.catalog && Array.isArray(r.catalog.tools)) ? r.catalog.tools : null;
    if (r && Number.isFinite(r.own)) K.own = Math.floor(r.own);
    if (!Object.keys(K.cat).length) { K.cat = null; K.loadErr = "Kedai belum menyiapkan daftar harga."; }
  } catch (e) { K.cat = null; K.loadErr = Core.errText(e); }
  K.loading = false; render(); syncChip();
}
async function pay() {
  if (K.busy) return; const q = Core.buyBody(K.basket, K.pay && K.pay.sig === Core.sig(K.basket) ? K.pay.opId : Core.newOpId(), K.cat);
  if (!q.ok) { K.msg = q.why === "kosong" ? "Keranjang masih kosong." : Core.whyText(q.why); return render(); }
  K.pay = { opId: q.body.opId, sig: Core.sig(K.basket) };                                                                // dipakai ulang saat jaringan putus di tengah → server tidak menggandakan
  K.busy = true; K.msg = ""; render(); say("Sebentar ya, Ibu hitung…", 8);
  try {
    const r = await api().buy(q.body);
    const lines = (r.lines || []).map((l) => { const c = K.cat && K.cat[l.id]; return { id: l.id, n: l.n, price: l.price, sub: l.sub, name: c ? c.name : l.id }; });
    K.dapur = r.dapur || K.dapur; if (Number.isFinite(r.own)) K.own = Math.floor(r.own);
    K.receipt = { cost: r.cost, own: K.own, lines }; K.basket = Core.newBasket(); K.pay = null; K.has = false; K.bought++;
    say("Terima kasih, Nak! Sampai ketemu lagi.", 4); sfx("coin"); toast("🧾 Belanjaan masuk lemari dapurmu", "good");
  } catch (e) {
    K.msg = Core.errText(e); if (Core.definite(e)) K.pay = null;                                                         // ditolak pasti → boleh opId baru; jaringan → opId lama dipertahankan
    say(e && e.code === "failed-precondition" ? "Aduh, belum bisa ya, Nak." : "Jaringannya lagi lemot, coba lagi ya.", 4); sfx("buzz");
  }
  K.busy = false; render(); syncChip();
}
async function unlockTool() {
  if (K.busy) return; if (!K.confirmTool) { K.confirmTool = true; render(); return; }
  K.busy = true; render();
  try {
    const r = await api().unlock({ opId: Core.newOpId(), tool: "pemanggang" });
    K.dapur = r.dapur || K.dapur; if (Number.isFinite(r.own)) K.own = Math.floor(r.own); if (K.tools) K.tools.forEach((t) => { if (t.id === "pemanggang") t.open = true; });
    K.msg = "Pemanggang sekarang ada di dapurmu!"; sfx("coin"); say("Pemanggangnya bagus, Nak. Selamat!", 4);
  } catch (e) { K.msg = Core.errText(e); sfx("buzz"); }
  K.confirmTool = false; K.busy = false; render(); syncChip();
}

// ---------- definisi adegan ----------
const SH = ["beras", "sayur", "kulkas", "tempe", "etalase"];
const def = {
  id: "kedai", layout: L, wallH: 118, bg: ["#3a2a22", "#150f0c"],
  shellKey: () => "v1",
  drawShell: (c, night) => A.kedaiShell(c, night),
  onEnter() {
    ensureUI(); K.sheet = null; K.receipt = null; K.msg = ""; K.has = false; K.basket = Core.newBasket(); K.pay = null;
    Object.assign(bu, { x: L.bu.route[0].x, y: L.bu.route[0].y, dir: 2 }); bs.i = 0; bs.wait = 3; setTimeout(() => say("Selamat datang di Kedai Bu Indah!", 3.6), 500);
    load(); syncChip();
  },
  onExit() { closeSheet(); K.basket = Core.newBasket(); K.has = false; K.pay = null; syncChip(); },
  blocked: () => false,
  candidates() {
    const out = [], S = L.stations, mk = (id, k, extra) => Object.assign({ id, x: S[k].x, y: S[k].y, r: S[k].r, icon: S[k].icon, label: S[k].label }, extra || {});
    if (!K.busy) out.push(mk("exit", "pintu"));
    for (const k of SH) out.push(mk("k_" + k, k, { shelf: k }));
    out.push(mk("k_kasir", "kasir", { label: Core.count(K.basket) ? `Bayar 🧺${Core.count(K.basket)}` : "Kasir" }));
    if (!K.has) out.push(mk("k_basket", "keranjang", { label: "Ambil keranjang" }));
    out.push(mk("k_cat", "kucing"));
    return out;
  },
  interact(t, pl, openDialog) {
    if (t.shelf) { if (!K.has) { K.has = true; toast("🧺 Keranjang diambil"); } return openSheet("shelf", t.shelf); }
    if (t.id === "k_basket") { K.has = true; sfx("click"); toast("🧺 Keranjang diambil. Pilih bahan di rak."); return; }
    if (t.id === "k_cat") { cat.hearts = 1.5; cat.wake = 3; sfx("click"); return toast("🐈 Si Mbul mendengkur pelan"); }
    if (t.id === "k_kasir") {
      if (Core.count(K.basket) > 0 || K.receipt) return openSheet("pay");
      return openDialog({ name: "Bu Indah", avatar: "👩", role: "Pemilik kedai", npc: null, lines: ["Selamat datang, Nak! Ambil keranjang di dekat pintu, pilih bahan di rak, lalu bayar di sini ya.", "Harga di rak sudah harga hari ini. Tempe masih hangat lho!"], options: [] });
    }
  },
  update(dt, pl) { updateBu(dt, pl); updateFly(dt); if (cat.hearts > 0) cat.hearts -= dt; if (cat.wake > 0) cat.wake -= dt; syncChip(); },
  items(t) {
    const e = L.solids.etalase, k = L.solids.kasir, kc = L.solids.keranjang, kt = L.solids.kucing;
    return [
      { d: (e.x0 + e.x1) / 2 + (e.y0 + e.y1) / 2, draw: (c) => drawEtalase(c, t) },
      { d: (k.x0 + k.x1) / 2 + (k.y0 + k.y1) / 2 + 0.4, draw: (c) => drawKasir(c, t) },
      { d: (kc.x0 + kc.x1) / 2 + (kc.y0 + kc.y1) / 2, draw: (c) => drawKeranjang(c) },
      { d: (kt.x0 + kt.x1) / 2 + (kt.y0 + kt.y1) / 2, draw: (c) => drawCat(c, t) },
      { d: bu.x + bu.y, draw: (c) => drawBu(c, t) },
    ];
  },
  afterPlayer,
  drawTop(c, t) {
    drawFly(c); drawSay(c);
    for (const [x, y, ph] of [[2.4, 2.7, 0], [5.2, 2.2, 1.7], [7.6, 5.0, 3.1]]) {                                                                // lampu gantung dengan ayunan halus
      const sw = Math.sin(t * 0.9 + ph) * 1.2, top = P(x, y, 178), b = P(x, y, 138); c.strokeStyle = "#2c2118"; c.lineWidth = 1; c.beginPath(); c.moveTo(top.x, top.y); c.lineTo(b.x + sw, b.y - 8); c.stroke();
      c.fillStyle = "#d94f3d"; c.beginPath(); c.moveTo(b.x + sw - 11, b.y); c.lineTo(b.x + sw + 11, b.y); c.lineTo(b.x + sw + 5, b.y - 10); c.lineTo(b.x + sw - 5, b.y - 10); c.fill();
      c.fillStyle = "#fff1c4"; c.beginPath(); c.arc(b.x + sw, b.y + 2, 4, 0, TAU); c.fill();
    }
  },
  glow(c, t, a) { for (const [x, y, z, r] of [[2.4, 2.7, 130, 110], [5.2, 2.2, 130, 110], [7.6, 5.0, 130, 100], [0.4, 5.2, 48, 70]]) NW.lightAt(c, x, y, z, r, "#ffb85c", 0.34 * a); },
};
NW.room.register(def);
NW.kedaiIndah = { def, K, bu, open: (pl) => NW.room.enter("kedai", pl), say, load, pay, openSheet, closeSheet, render, changeQty, _state: K };
})();
