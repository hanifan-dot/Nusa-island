// NUSA ISLAND — Ide 08B · Dapur Rumahku (interior dapur dari pintu di dalam Rumahku). Visual 2.5D ringan + tabrakan benar.
// 08B hanya MEMBANGUN ruangannya: bahan yang sudah dibeli bisa dilihat di lemari/kulkas (jawaban server). Memasak interaktif = 08C (belum ada di PR ini).
// Pintu dapur hanya ada bila SERVER menyatakan dapurRumahku=true (klien memanggil install() setelah gerbang). Tamu yang berkunjung tidak melihat/memakai pintu ini.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDapurCore, A = NW.dapurArt; if (!Core || !A || !NW.room) return;
const N = () => window.Nusa, P = A.P, L = Core.LAYOUT.dapur, TAU = Math.PI * 2;
const toast = (m, k) => { try { N().toast(m, k); } catch (e) { /* tampilan saja */ } };
const R = { dapur: null, cat: null, tools: null, loading: false, loadErr: "", at: 0 };
const api = () => NW.dapur && NW.dapur.api;
const shade = A.shade, fill = A.fill, quadY = A.quadY, quadX = A.quadX, line = A.line, ell = A.ell, textOn = A.textOn, panelOn = A.panelOn, woodBox = A.woodBox;
const SAGE = "#9bb89c", BUTTER = "#f4ecd2", STEEL = "#aeb9bd";
const toolOpen = (id) => !!(R.tools && R.tools.find((t) => t.id === id && t.open)) || !!(R.dapur && R.dapur.tools && R.dapur.tools.includes(id));

// ---------- cangkang dapur (statis) ----------
function shell(c, night) {
  const w = L.w, d = L.d, WH = 112, door = L.door, S = L.solids;
  c.fillStyle = "rgba(0,0,0,.28)"; A.poly(c, [P(0, 0, -6), P(w, 0, -6), P(w, d, -6), P(0, d, -6)]); c.fill();
  fill(c, quadY(0, w, d, -9, 0), "#6e4628"); fill(c, quadX(w, 0, d, -9, 0), "#5a3a20");
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) {                                                       // ubin semen biru-abu bermotif
    const dx = Math.min(1, w - x), dy = Math.min(1, d - y), alt = (x + y) % 2;
    fill(c, [P(x, y), P(x + dx, y), P(x + dx, y + dy), P(x, y + dy)], alt ? "#c5d3d3" : "#aebfc2");
    const m = P(x + dx / 2, y + dy / 2); c.strokeStyle = alt ? "rgba(60,100,110,.35)" : "rgba(255,255,255,.28)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(m.x - 10, m.y); c.lineTo(m.x, m.y - 5); c.lineTo(m.x + 10, m.y); c.lineTo(m.x, m.y + 5); c.closePath(); c.stroke();
    c.beginPath(); c.arc(m.x, m.y, 2.4, 0, TAU); c.stroke();
  }
  for (let x = 0; x <= w; x++) line(c, P(x, 0), P(x, d), "rgba(40,70,80,.25)", 1); for (let y = 0; y <= d; y++) line(c, P(0, y), P(w, y), "rgba(40,70,80,.25)", 1);
  fill(c, [P(0.05, door.y0 - 0.05, 0.4), P(1.4, door.y0 - 0.05, 0.4), P(1.4, door.y1 + 0.05, 0.4), P(0.05, door.y1 + 0.05, 0.4)], "#8a5a32", "#5e3b20", 1);   // keset pintu
  for (let k = 0; k < 6; k++) line(c, P(0.2 + k * 0.2, door.y0 + 0.05, 0.5), P(0.2 + k * 0.2, door.y1 - 0.05, 0.5), "rgba(255,230,180,.35)", 1);
  // dinding: atas mentega, lambris sage, backsplash ubin putih di balik meja kerja
  fill(c, quadY(0, w, 0, 0, WH), BUTTER); fill(c, [P(0, 0, 0), P(0, d, 0), P(0, d, WH), P(0, 0, WH)], shade(BUTTER, -0.08));
  fill(c, quadY(0, w, 0, 0, 30), SAGE); fill(c, [P(0, 0, 0), P(0, d, 0), P(0, d, 30), P(0, 0, 30)], shade(SAGE, -0.12));
  for (let x = 0.5; x < w; x += 0.5) line(c, P(x, 0, 2), P(x, 0, 28), "rgba(40,80,60,.25)", 1); for (let y = 0.5; y < d; y += 0.5) line(c, P(0, y, 2), P(0, y, 28), "rgba(40,80,60,.25)", 1);
  fill(c, quadY(0, w, 0, 30, 33), "#fbf4de"); fill(c, [P(0, 0, 30), P(0, d, 30), P(0, d, 33), P(0, 0, 33)], "#efe6c8");
  fill(c, quadY(2.55, 7.35, 0, 33, 74), "#f7fbfa", "rgba(23,63,80,.2)", 1);                                      // backsplash
  for (let x = 2.55; x < 7.36; x += 0.3) line(c, P(x, 0, 33), P(x, 0, 74), "rgba(23,63,80,.14)", 1); for (let z = 33; z <= 74; z += 8.2) line(c, P(2.55, 0, z), P(7.35, 0, z), "rgba(23,63,80,.14)", 1);
  for (let x = 2.85; x < 7.3; x += 0.9) { const p = P(x, 0, 53); c.fillStyle = "rgba(47,143,122,.5)"; c.beginPath(); c.moveTo(p.x, p.y - 4); c.lineTo(p.x + 4, p.y); c.lineTo(p.x, p.y + 4); c.lineTo(p.x - 4, p.y); c.fill(); }   // ubin hias hijau
  fill(c, quadY(0, w, 0, 0, 6), A.WOOD2); fill(c, [P(0, 0, 0), P(0, d, 0), P(0, d, 6), P(0, 0, 6)], A.WOOD3);
  fill(c, quadY(0, w, 0, WH, WH + 7), A.WOOD2); fill(c, [P(0, 0, WH), P(0, d, WH), P(0, d, WH + 7), P(0, 0, WH + 7)], A.WOOD3);
  for (let x = 1; x < w; x += 2) line(c, P(x, 0, WH), P(x, 0, WH + 34), "rgba(90,58,32,.55)", 4);
  // jendela di atas bak cuci: kebun & langit; tirai kecil
  const wx0 = 4.35, wx1 = 5.35, wz0 = 60, wz1 = 98;
  fill(c, quadY(wx0 - 0.08, wx1 + 0.08, 0, wz0 - 4, wz1 + 4), A.WOOD2);
  const sky = c.createLinearGradient(0, P(0, 0, wz1).y, 0, P(0, 0, wz0).y); if (night) { sky.addColorStop(0, "#13234a"); sky.addColorStop(1, "#2a3f73"); } else { sky.addColorStop(0, "#8fd0ea"); sky.addColorStop(0.55, "#d8f0f2"); sky.addColorStop(0.56, "#7dbb62"); sky.addColorStop(1, "#4f9a46"); }
  c.fillStyle = sky; A.poly(c, quadY(wx0, wx1, 0, wz0, wz1)); c.fill();
  if (!night) { for (const [u, z] of [[0.3, wz0 + 8], [0.7, wz0 + 12]]) { const p = P(wx0 + (wx1 - wx0) * u, 0, z); ell(c, p.x, p.y, 4, 5, "#3d7f38"); ell(c, p.x, p.y - 4, 3, 3, "#e4573d"); } }
  line(c, P((wx0 + wx1) / 2, 0, wz0), P((wx0 + wx1) / 2, 0, wz1), A.WOOD2, 2.4);
  fill(c, quadY(wx0 - 0.1, wx1 + 0.1, 0, wz1 - 7, wz1 + 2), "#d94f3d"); for (let k = 0; k < 7; k++) { const p = P(wx0 - 0.1 + k * ((wx1 - wx0 + 0.2) / 6), 0, wz1 - 7); c.fillStyle = "#d94f3d"; c.beginPath(); c.arc(p.x, p.y, 2.6, 0, Math.PI); c.fill(); }   // kerai
  // rak terbuka berisi piring & gelas (di atas meja persiapan) + rak bumbu + rel perkakas di atas kompor
  for (const z of [78, 96]) { fill(c, quadY(2.7, 4.1, 0, z, z + 2.4), A.WOOD); fill(c, [P(2.7, 0, z + 2.4), P(4.1, 0, z + 2.4), P(4.1, 0.34, z + 2.4), P(2.7, 0.34, z + 2.4)], shade(A.WOOD, 0.2)); }
  for (let k = 0; k < 5; k++) { const p = P(2.86 + k * 0.08, 0.2, 80.4); c.fillStyle = "#fbfbf6"; ell(c, p.x, p.y - 2, 9, 3.6, "#fbfbf6"); c.strokeStyle = "#3a73b8"; c.lineWidth = 1; c.beginPath(); c.ellipse(p.x, p.y - 2 - k * 0, 9, 3.6, 0, 0, TAU); c.stroke(); }
  for (let k = 0; k < 4; k++) { const p = P(3.55 + k * 0.13, 0.22, 80.4); c.fillStyle = "rgba(200,235,244,.7)"; c.fillRect(p.x - 3, p.y - 9, 6, 9); c.strokeStyle = "rgba(23,63,80,.4)"; c.lineWidth = 0.7; c.strokeRect(p.x - 3, p.y - 9, 6, 9); }
  for (let k = 0; k < 4; k++) { const p = P(2.95 + k * 0.28, 0.2, 98.4); c.fillStyle = ["#c8603a", "#2f8f7a", "#e8b53a", "#fbfbf6"][k]; ell(c, p.x, p.y - 3, 6, 3, ["#c8603a", "#2f8f7a", "#e8b53a", "#fbfbf6"][k]); c.fillRect(p.x - 6, p.y - 3, 12, 3); ell(c, p.x, p.y, 6, 2.6, shade(["#c8603a", "#2f8f7a", "#e8b53a", "#fbfbf6"][k], -0.2)); }   // mangkuk berwarna
  fill(c, quadY(5.65, 7.15, 0, 68, 70.4), A.WOOD); for (let k = 0; k < 5; k++) { const p = P(5.78 + k * 0.28, 0.12, 70.4); A.jar(c, p, 8, 10, ["#f7f2e8", "#e08a6a", "#efe6c9", "#a05a30", "#f7f2e8"][k], "#3a2a1a", ["#d94f3d", "#2f8f7a", "#e8b53a", "#d94f3d", "#4a8fc8"][k]); }
  line(c, P(5.6, 0.06, 92), P(7.2, 0.06, 92), "#7a8386", 2.4);                                                           // rel perkakas
  for (const [x, kind] of [[5.8, "ladle"], [6.1, "spatula"], [6.4, "whisk"], [6.7, "sieve"], [7.0, "ladle"]]) {
    const p = P(x, 0.06, 92); line(c, { x: p.x, y: p.y }, { x: p.x, y: p.y + 4 }, "#7a8386", 1);
    c.strokeStyle = "#6e7a78"; c.fillStyle = "#6e7a78"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x, p.y + 4); c.lineTo(p.x, p.y + 17); c.stroke();
    if (kind === "ladle") { c.beginPath(); c.arc(p.x, p.y + 21, 3.6, 0, TAU); c.fill(); } else if (kind === "spatula") { c.fillStyle = "#c9a45c"; c.fillRect(p.x - 2.6, p.y + 17, 5.2, 7); } else if (kind === "whisk") { c.lineWidth = 0.9; c.beginPath(); c.ellipse(p.x, p.y + 22, 2.6, 5.2, 0, 0, TAU); c.stroke(); } else { c.beginPath(); c.arc(p.x, p.y + 21, 4, 0, TAU); c.stroke(); }
  }
  // bawang & cabai gantung, papan resep (kork), celemek di gantungan dekat pintu
  const bg = P(1.38, 0.05, 104); line(c, bg, { x: bg.x, y: bg.y + 3 }, "#6b4a28", 1); for (let k = 0; k < 4; k++) { ell(c, bg.x + (k % 2 ? 2 : -2), bg.y + 7 + k * 5, 3.2, 3.6, k % 2 ? "#e8d6b0" : "#b73a52"); }
  const rc = P(5.75, 0.04, 108); for (let k = 0; k < 3; k++) { c.strokeStyle = "#c93a2a"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(rc.x + k * 4, rc.y); c.quadraticCurveTo(rc.x + k * 4 + 2, rc.y + 8, rc.x + k * 4 - 1, rc.y + 14); c.stroke(); }
  fill(c, quadX(0, 0.9, 2.4, 70, 102), A.WOOD2); fill(c, quadX(0, 0.97, 2.33, 73, 99), "#c9a46a");
  for (const [y, z, col, tx] of [[1.15, 92, "#fff8c8", "IKAN GORENG"], [1.65, 84, "#f7e2e2", "TELUR CEPLOK"], [1.95, 94, "#e2f1e2", "RESEP IBU"]]) { panelOn(c, "x", 0, y, z, 26, 14, col, "rgba(0,0,0,.25)", 1); textOn(c, "x", 0, y, z, tx, 3.2, "#3a2a1a", "center", 800); const pn = P(0, y, z + 6); ell(c, pn.x, pn.y, 1.6, 1.6, "#d94f3d"); }   // kertas resep + paku
  const ap = P(0, door.y0 - 0.55, 82); line(c, { x: ap.x - 10, y: ap.y + 1 }, { x: ap.x + 10, y: ap.y - 4 }, A.WOOD3, 2); c.fillStyle = "#fff6e4"; c.beginPath(); c.moveTo(ap.x - 6, ap.y + 1); c.lineTo(ap.x + 6, ap.y - 2); c.lineTo(ap.x + 8, ap.y + 26); c.lineTo(ap.x - 8, ap.y + 30); c.closePath(); c.fill(); c.strokeStyle = "#d94f3d"; c.lineWidth = 1.2; c.stroke(); c.fillStyle = "#d94f3d"; c.fillRect(ap.x - 4, ap.y + 12, 8, 7);   // celemek
  // pintu ke Rumahku
  const dz = 70; fill(c, [P(0, door.y0 - 0.1, 0), P(0, door.y1 + 0.1, 0), P(0, door.y1 + 0.1, dz + 4), P(0, door.y0 - 0.1, dz + 4)], A.WOOD3);
  fill(c, [P(0, door.y0, 0), P(0, door.y1, 0), P(0, door.y1, dz), P(0, door.y0, dz)], A.WOOD);
  fill(c, [P(0, door.y0 + 0.14, dz - 30), P(0, door.y1 - 0.14, dz - 30), P(0, door.y1 - 0.14, dz - 6), P(0, door.y0 + 0.14, dz - 6)], night ? "#2a3f73" : "#bfe9ee", A.WOOD3, 1.2);
  fill(c, [P(0, door.y0 + 0.14, 8), P(0, door.y1 - 0.14, 8), P(0, door.y1 - 0.14, dz - 36), P(0, door.y0 + 0.14, dz - 36)], shade(A.WOOD, -0.1), A.WOOD3, 1);
  const hd = P(0, door.y1 - 0.2, 34); ell(c, hd.x, hd.y, 2.2, 2.2, A.MUSTARD);
  // perabot menempel dinding
  lemari(c); kulkas(c); persiapan(c); cuci(c); kompor(c);
}
function lemari(c) {
  const s = L.solids.lemari, H = 92, r = { x0: s.x0, y0: s.y0 + 0.02, x1: s.x1, y1: s.y1 };
  box3(c, r, H, "#a8743f");
  const cx = (r.x0 + r.x1) / 2;
  fill(c, quadY(r.x0 + 0.06, cx - 0.03, r.y1, 44, H - 8), "rgba(190,230,240,.55)", A.WOOD3, 1); fill(c, quadY(cx + 0.03, r.x1 - 0.06, r.y1, 44, H - 8), "rgba(190,230,240,.55)", A.WOOD3, 1);   // pintu kaca atas
  for (let k = 0; k < 3; k++) { const p = P(r.x0 + 0.22 + k * 0.27, r.y1, 66); A.jar(c, p, 8, 12, ["#f7f2e8", "#a05a30", "#efe6c9"][k], "#3a2a1a", ["#d94f3d", "#2f8f7a", "#e8b53a"][k]); }
  const rs = P(r.x0 + 0.3, r.y1, 44); A.sack(c, { x: rs.x + 4, y: rs.y }, 14, 18, "#efe3c4", A.TOMATO); A.basket(c, { x: rs.x + 21, y: rs.y }, 13, 7, "#c9a45c");
  fill(c, quadY(r.x0 + 0.06, cx - 0.03, r.y1, 6, 40), shade("#a8743f", -0.12), A.WOOD3, 1); fill(c, quadY(cx + 0.03, r.x1 - 0.06, r.y1, 6, 40), shade("#a8743f", -0.12), A.WOOD3, 1);   // pintu kayu bawah
  for (const x of [cx - 0.12, cx + 0.12]) { const p = P(x, r.y1, 26); ell(c, p.x, p.y, 1.8, 1.8, A.MUSTARD); }
  panelOn(c, "y", cx, r.y1, 100, 38, 8, "#26363a", "#e8b53a", 1.5); textOn(c, "y", cx, r.y1, 100, "BAHAN", 5, "#ffe9a8");
}
function box3(c, r, H, base) { A.box(c, r, 0, H, shade(base, 0.2), base, shade(base, -0.2), "rgba(60,36,16,.4)"); }
function kulkas(c) {
  const s = L.solids.kulkas, r = { x0: s.x0, y0: s.y0 + 0.04, x1: s.x1, y1: s.y1 - 0.05 }, H = 80, hy = (r.x0 + r.x1) / 2;
  A.box(c, r, 0, H, "#e8f4ee", "#cfe8dc", "#aecfc0", "rgba(23,63,80,.35)");
  line(c, P(r.x0, r.y1, H * 0.62), P(r.x1, r.y1, H * 0.62), "rgba(23,63,80,.5)", 1.4);
  for (const z of [H * 0.74, H * 0.48]) { const p = P(r.x0 + 0.14, r.y1, z); c.fillStyle = "#6e7a78"; c.fillRect(p.x - 1, p.y - 7, 2.4, 14); }
  panelOn(c, "y", hy, r.y1, H - 6, 28, 5, "#2f8f7a", null, 1.5); textOn(c, "y", hy, r.y1, H - 6, "KULKAS", 4, "#f6fff9");
  for (const [dx, col] of [[0.3, A.TOMATO], [0.62, A.MUSTARD]]) { const p = P(r.x0 + dx, r.y1, H * 0.84); ell(c, p.x, p.y, 2.6, 2.6, col); }
  const nt = P(r.x0 + 0.45, r.y1, H * 0.35); c.fillStyle = "#fff8c8"; c.fillRect(nt.x - 4, nt.y - 5, 8, 8);
  fill(c, [P(r.x0, r.y0, H), P(r.x1, r.y0, H), P(r.x1, r.y1, H), P(r.x0, r.y1, H)], "#f4faf6");
}
function persiapan(c) {
  const s = L.solids.persiapan, H = 32;
  woodBox(c, { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }, 0, H, A.WOOD);
  fill(c, quadY(s.x0 + 0.1, s.x1 - 0.1, s.y1, 4, H - 4), shade(A.WOOD, -0.14), A.WOOD3, 0.8);
  for (let k = 0; k < 2; k++) { const p = P(s.x0 + 0.5 + k * 0.7, s.y1, 18); ell(c, p.x, p.y, 1.8, 1.8, A.MUSTARD); }
  fill(c, [P(s.x0 - 0.03, s.y0, H), P(s.x1, s.y0, H), P(s.x1, s.y1 + 0.05, H), P(s.x0 - 0.03, s.y1 + 0.05, H)], "#d1a46a", A.WOOD3, 0.8);
  // talenan kayu + pisau + irisan timun & tomat + mangkuk bawang
  const tb = P(3.1, 0.42, H); fill(c, [{ x: tb.x - 14, y: tb.y }, { x: tb.x, y: tb.y - 7 }, { x: tb.x + 14, y: tb.y }, { x: tb.x, y: tb.y + 7 }], "#b8864a", A.WOOD3, 0.8);
  fill(c, [{ x: tb.x - 11, y: tb.y }, { x: tb.x, y: tb.y - 5.5 }, { x: tb.x + 11, y: tb.y }, { x: tb.x, y: tb.y + 5.5 }], "#c9975a");
  for (let k = 0; k < 4; k++) ell(c, tb.x - 5 + k * 3, tb.y - 1 + (k % 2), 2, 1.3, k % 2 ? "#e03a2a" : "#9fc92a"); c.strokeStyle = "#e9eef0"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(tb.x + 2, tb.y + 1); c.lineTo(tb.x + 12, tb.y - 4); c.stroke(); c.strokeStyle = "#5a3a20"; c.lineWidth = 2.6; c.beginPath(); c.moveTo(tb.x + 12, tb.y - 4); c.lineTo(tb.x + 17, tb.y - 6.4); c.stroke();    // pisau
  const bw = P(3.85, 0.46, H); ell(c, bw.x, bw.y, 8, 3.4, "#3a73b8"); ell(c, bw.x, bw.y - 1.4, 6.4, 2.4, "#fbfbf6"); for (let k = 0; k < 3; k++) ell(c, bw.x - 3 + k * 3, bw.y - 3, 2.4, 2.6, k % 2 ? "#b73a52" : "#e8d6b0");
  const sp = P(2.82, 0.55, H); c.fillStyle = "#6e7a78"; c.fillRect(sp.x - 1, sp.y - 9, 2, 9); ell(c, sp.x, sp.y - 11, 2.6, 4, "#9aa5a8");   // sendok kayu di wadah
}
function cuci(c) {
  const s = L.solids.cuci, H = 32;
  woodBox(c, { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }, 0, H, A.WOOD2);
  fill(c, quadY(s.x0 + 0.08, s.x1 - 0.08, s.y1, 4, H - 4), shade(A.WOOD2, -0.12), A.WOOD3, 0.8);
  fill(c, [P(s.x0 - 0.02, s.y0, H), P(s.x1, s.y0, H), P(s.x1, s.y1 + 0.05, H), P(s.x0 - 0.02, s.y1 + 0.05, H)], "#b9c4c7", A.WOOD3, 0.8);
  fill(c, [P(s.x0 + 0.12, s.y0 + 0.14, H + 0.2), P(s.x0 + 0.78, s.y0 + 0.14, H + 0.2), P(s.x0 + 0.78, s.y1 - 0.12, H + 0.2), P(s.x0 + 0.12, s.y1 - 0.12, H + 0.2)], "#7d8a8e", "#5d686b", 1);   // bak baja
  fill(c, [P(s.x0 + 0.17, s.y0 + 0.19, H + 0.3), P(s.x0 + 0.73, s.y0 + 0.19, H + 0.3), P(s.x0 + 0.73, s.y1 - 0.17, H + 0.3), P(s.x0 + 0.17, s.y1 - 0.17, H + 0.3)], "#58656a");
  const fc = P(s.x0 + 0.45, s.y0 + 0.12, H); c.strokeStyle = "#cfd8db"; c.lineWidth = 2.6; c.lineCap = "round"; c.beginPath(); c.moveTo(fc.x, fc.y); c.lineTo(fc.x, fc.y - 16); c.quadraticCurveTo(fc.x, fc.y - 22, fc.x + 6, fc.y - 20); c.lineTo(fc.x + 7, fc.y - 16); c.stroke(); ell(c, fc.x, fc.y, 3, 1.5, "#9aa5a8");
  const k1 = P(s.x0 + 0.45, s.y0 + 0.1, H + 14); c.fillStyle = "#4a8fc8"; c.fillRect(k1.x - 4.6, k1.y - 3, 3, 3); c.fillStyle = A.TOMATO; c.fillRect(k1.x + 1.6, k1.y - 3, 3, 3);
  // rak piring: piring berdiri & gelas terbalik
  const rk = P(s.x0 + 1.0, s.y0 + 0.42, H); fill(c, [{ x: rk.x - 15, y: rk.y }, { x: rk.x, y: rk.y - 7.5 }, { x: rk.x + 15, y: rk.y }, { x: rk.x, y: rk.y + 7.5 }], "#cfd8db", "#6e7a78", 0.8);
  for (let k = 0; k < 5; k++) { const x = rk.x - 9 + k * 4.2, y = rk.y - 3 + k * 0.3; c.fillStyle = "#fbfbf6"; c.beginPath(); c.ellipse(x, y - 6, 5.4, 6.6, 0, 0, TAU); c.fill(); c.strokeStyle = "#3a73b8"; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - 6, 4, 5, 0, 0, TAU); c.stroke(); }
  for (let k = 0; k < 2; k++) { const gx = rk.x + 6 + k * 4.4, gy = rk.y + 1 + k * 0.4; c.fillStyle = "rgba(200,235,244,.8)"; c.fillRect(gx - 2.6, gy - 9, 5.2, 9); c.strokeStyle = "rgba(23,63,80,.4)"; c.lineWidth = 0.7; c.strokeRect(gx - 2.6, gy - 9, 5.2, 9); }
}
function kompor(c) {
  const s = L.solids.kompor, H = 32;
  A.box(c, { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }, 0, H, "#eef2f2", "#dde3e3", "#bdc6c8", "rgba(23,63,80,.4)");
  fill(c, quadY(s.x0 + 0.1, s.x1 - 0.1, s.y1, 4, H - 10), "#2f3a42", "#1d252a", 1);                                                                 // pintu oven
  fill(c, quadY(s.x0 + 0.18, s.x1 - 0.18, s.y1, 8, H - 14), "rgba(255,200,120,.22)");
  line(c, P(s.x0 + 0.25, s.y1, H - 8), P(s.x1 - 0.25, s.y1, H - 8), "#cfd8db", 2);
  for (let k = 0; k < 3; k++) { const p = P(s.x0 + 0.38 + k * 0.5, s.y1, H - 5); ell(c, p.x, p.y, 2.6, 2.6, "#2f3a42"); line(c, { x: p.x, y: p.y - 2 }, { x: p.x, y: p.y - 0.4 }, "#e8b53a", 1); }   // kenop
  fill(c, [P(s.x0, s.y0, H), P(s.x1, s.y0, H), P(s.x1, s.y1, H), P(s.x0, s.y1, H)], "#2a3238", "#12181b", 1);
  for (const [bx, by] of [[s.x0 + 0.5, s.y0 + 0.42], [s.x0 + 1.25, s.y0 + 0.42]]) {                                                                // dua tungku
    const p = P(bx, by, H + 0.4); c.strokeStyle = "#8b979c"; c.lineWidth = 2; for (const [rx, ry] of [[12, 6], [7.5, 3.8], [3.4, 1.7]]) { c.beginPath(); c.ellipse(p.x, p.y, rx, ry, 0, 0, TAU); c.stroke(); }
    c.strokeStyle = "#5d686b"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(p.x - 13, p.y); c.lineTo(p.x + 13, p.y); c.moveTo(p.x, p.y - 6.5); c.lineTo(p.x, p.y + 6.5); c.stroke();
  }
  const wk = P(s.x0 + 0.5, s.y0 + 0.42, H + 2);                                                                                                  // wajan
  c.fillStyle = "#2a2f33"; c.beginPath(); c.ellipse(wk.x, wk.y - 3, 15, 7, 0, 0, TAU); c.fill(); c.fillStyle = "#13171a"; c.beginPath(); c.ellipse(wk.x, wk.y - 3, 12.4, 5.6, 0, 0, TAU); c.fill();
  c.fillStyle = "#3a4046"; c.beginPath(); c.moveTo(wk.x - 15, wk.y - 3); c.quadraticCurveTo(wk.x, wk.y + 12, wk.x + 15, wk.y - 3); c.lineTo(wk.x + 13, wk.y - 1); c.quadraticCurveTo(wk.x, wk.y + 9, wk.x - 13, wk.y - 1); c.fill();
  c.strokeStyle = "#5a3a20"; c.lineWidth = 3.4; c.lineCap = "round"; c.beginPath(); c.moveTo(wk.x - 14, wk.y - 3); c.lineTo(wk.x - 27, wk.y - 8); c.stroke();
  const pt = P(s.x0 + 1.25, s.y0 + 0.42, H + 2);                                                                                                  // panci + tutup
  c.fillStyle = "#9aa5a8"; c.fillRect(pt.x - 11, pt.y - 17, 22, 17); c.fillStyle = "#b9c4c7"; c.fillRect(pt.x - 11, pt.y - 17, 5, 17); c.strokeStyle = "#5d686b"; c.lineWidth = 0.8; c.strokeRect(pt.x - 11, pt.y - 17, 22, 17);
  ell(c, pt.x, pt.y - 17, 11, 4.6, "#b9c4c7"); ell(c, pt.x, pt.y - 18.4, 10, 4, "#cfd8db"); ell(c, pt.x, pt.y - 22, 2.6, 1.8, "#3a2a1a");
  c.fillStyle = "#3a2a1a"; c.fillRect(pt.x - 15, pt.y - 13, 4, 3); c.fillRect(pt.x + 11, pt.y - 13, 4, 3);
}

// ---------- benda dinamis ----------
function drawMeja(c, t) {
  const s = L.solids.meja, H = 30, cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2;
  for (const [x, y] of [[s.x0 + 0.1, s.y1 - 0.1], [s.x1 - 0.1, s.y1 - 0.1], [s.x1 - 0.1, s.y0 + 0.1]]) { const p = P(x, y, 0), q = P(x, y, H - 2); c.strokeStyle = A.WOOD3; c.lineWidth = 3.4; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke(); }
  for (const [x, y] of [[cx - 0.4, s.y1 + 0.28], [cx + 0.45, s.y1 + 0.28]]) { const p = P(x, y, 0); c.fillStyle = A.WOOD2; ell(c, p.x, p.y - 12, 8, 3.6, A.WOOD2); c.fillRect(p.x - 6.6, p.y - 12, 13.2, 1.6); c.strokeStyle = A.WOOD3; c.lineWidth = 2.6; c.beginPath(); c.moveTo(p.x - 5, p.y - 11); c.lineTo(p.x - 5, p.y); c.moveTo(p.x + 5, p.y - 11); c.lineTo(p.x + 5, p.y); c.stroke(); }   // dua bangku
  fill(c, [P(s.x0, s.y0, H), P(s.x1, s.y0, H), P(s.x1, s.y1, H), P(s.x0, s.y1, H)], "#b8864a", A.WOOD3, 0.8);
  fill(c, [P(s.x0 + 0.04, s.y0 + 0.04, H), P(s.x1 - 0.04, s.y0 + 0.04, H), P(s.x1 - 0.04, s.y1 - 0.04, H), P(s.x0 + 0.04, s.y1 - 0.04, H)], "#c9975a");
  fill(c, quadY(s.x0, s.x1, s.y1, H - 3, H), A.WOOD); fill(c, quadX(s.x1, s.y0, s.y1, H - 3, H), shade(A.WOOD, -0.2));
  fill(c, [P(cx - 0.55, cy - 0.28, H + 0.2), P(cx + 0.55, cy - 0.28, H + 0.2), P(cx + 0.55, cy + 0.28, H + 0.2), P(cx - 0.55, cy + 0.28, H + 0.2)], "#e4573d");       // taplak kecil
  for (const dx of [-0.45, 0.45]) { const p = P(cx + dx, cy + 0.08, H + 0.4); ell(c, p.x, p.y, 8, 3.6, "#fbfbf6"); c.strokeStyle = "#3a73b8"; c.lineWidth = 0.9; c.beginPath(); c.ellipse(p.x, p.y, 6.2, 2.8, 0, 0, TAU); c.stroke(); }
  const gl = P(cx + 0.05, cy - 0.12, H); c.fillStyle = "rgba(200,235,244,.8)"; c.fillRect(gl.x - 2.6, gl.y - 9, 5.2, 9); c.strokeStyle = "rgba(23,63,80,.4)"; c.strokeRect(gl.x - 2.6, gl.y - 9, 5.2, 9);
  const fb = P(cx - 0.05, cy - 0.12, H); A.basket(c, { x: fb.x - 12, y: fb.y }, 13, 6, "#c9a45c"); for (let k = 0; k < 3; k++) ell(c, fb.x - 15 + k * 3.4, fb.y - 8, 2.6, 2.6, ["#f0a23a", "#e03a2a", "#b8d33a"][k]);
}
function drawSampah(c) {
  const s = L.solids.sampah, p = P((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 0);
  c.fillStyle = "rgba(0,0,0,.2)"; ell(c, p.x, p.y + 1, 11, 4.2, "rgba(0,0,0,.2)");
  c.fillStyle = "#5d7f78"; c.beginPath(); c.moveTo(p.x - 8.5, p.y - 22); c.lineTo(p.x + 8.5, p.y - 22); c.lineTo(p.x + 7, p.y); c.lineTo(p.x - 7, p.y); c.closePath(); c.fill();
  c.fillStyle = "#4a6a64"; c.beginPath(); c.moveTo(p.x + 1, p.y - 22); c.lineTo(p.x + 8.5, p.y - 22); c.lineTo(p.x + 7, p.y); c.lineTo(p.x + 1, p.y); c.closePath(); c.fill();
  for (let k = 0; k < 3; k++) { c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x - 6 + k * 5, p.y - 20); c.lineTo(p.x - 5 + k * 4.5, p.y - 2); c.stroke(); }
  ell(c, p.x, p.y - 22, 9.6, 3.6, "#6f948c"); ell(c, p.x, p.y - 23.6, 8, 2.8, "#86aaa2"); c.fillStyle = "#3a5650"; c.fillRect(p.x - 1.6, p.y - 27.6, 3.2, 2.4);
}
function drawPemanggang(c, t) {
  const s = L.solids.pemanggang, H = 24, cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, open = toolOpen("pemanggang");
  for (const [x, y] of [[s.x0 + 0.1, s.y1 - 0.1], [s.x1 - 0.1, s.y1 - 0.1], [s.x1 - 0.1, s.y0 + 0.1], [s.x0 + 0.1, s.y0 + 0.1]]) { const p = P(x, y, 0), q = P(x, y, H); c.strokeStyle = "#3a4046"; c.lineWidth = 2.6; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke(); }
  if (!open) {                                                                                                                                       // belum dibeli: tertutup kain terpal
    const p = P(cx, cy, H); c.fillStyle = "#6b7f86"; c.beginPath(); c.moveTo(p.x - 20, p.y + 4); c.quadraticCurveTo(p.x - 14, p.y - 20, p.x, p.y - 20); c.quadraticCurveTo(p.x + 14, p.y - 20, p.x + 20, p.y + 4); c.lineTo(p.x + 14, p.y + 12); c.lineTo(p.x - 14, p.y + 12); c.closePath(); c.fill();
    c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x - 6, p.y - 18); c.quadraticCurveTo(p.x - 8, p.y - 2, p.x - 4, p.y + 10); c.moveTo(p.x + 7, p.y - 18); c.quadraticCurveTo(p.x + 8, p.y - 2, p.x + 5, p.y + 10); c.stroke();
    panelOn(c, "y", cx, s.y1 + 0.02, 14, 34, 8, "#fbf1da", "#8a5a32", 1.5); textOn(c, "y", cx, s.y1 + 0.02, 14, "ALAT BARU", 4.2, A.INK);
    return;
  }
  A.box(c, { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }, H - 2, 10, "#2f3a42", "#3d4952", "#26313a", "rgba(0,0,0,.4)");
  fill(c, [P(s.x0 + 0.05, s.y0 + 0.05, H + 8.2), P(s.x1 - 0.05, s.y0 + 0.05, H + 8.2), P(s.x1 - 0.05, s.y1 - 0.05, H + 8.2), P(s.x0 + 0.05, s.y1 - 0.05, H + 8.2)], "#161b1f");
  for (let k = 1; k < 6; k++) line(c, P(s.x0 + 0.05 + k * 0.14, s.y0 + 0.06, H + 8.4), P(s.x0 + 0.05 + k * 0.14, s.y1 - 0.06, H + 8.4), "#8b979c", 1.2);
  const g = 0.45 + 0.35 * Math.sin(t * 5 + 1); for (let k = 0; k < 4; k++) { const p = P(s.x0 + 0.22 + k * 0.17, cy + ((k % 2) - 0.5) * 0.2, H + 8.2); c.fillStyle = `rgba(255,${120 + k * 20},40,${(0.35 + g * 0.3).toFixed(2)})`; c.beginPath(); c.ellipse(p.x, p.y, 3.4, 1.7, 0, 0, TAU); c.fill(); }    // bara menyala pelan
  const hp = P(s.x1 - 0.02, s.y1 + 0.02, H + 6); c.strokeStyle = "#5a3a20"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(hp.x, hp.y); c.lineTo(hp.x + 9, hp.y - 4); c.stroke();
}
function drawTop(c, t) {
  const s = L.solids.kompor, pt = P(s.x0 + 1.25, s.y0 + 0.42, 56);
  for (let k = 0; k < 3; k++) {                                                                                                                       // uap tipis dari panci (3 titik saja)
    const ph = (t * 0.45 + k / 3) % 1, x = pt.x + Math.sin(ph * 6 + k) * 3.6, y = pt.y - ph * 22; c.globalAlpha = (1 - ph) * 0.55; ell(c, x, y, 3 + ph * 4, 2 + ph * 3, "#fff"); c.globalAlpha = 1;
  }
  const cu = L.solids.cuci, fc = P(cu.x0 + 0.45 + 0.32, cu.y0 + 0.16, 46), ph = (t * 0.7) % 1;                                                    // tetes keran
  if (ph < 0.8) { c.fillStyle = "rgba(120,190,230,.9)"; c.beginPath(); c.ellipse(fc.x + 2.4, fc.y + ph * ph * 22, 1.2, 1.9, 0, 0, TAU); c.fill(); }
  const b = P(4.0, 2.0, 150), b0 = P(4.0, 2.0, 190), sw = Math.sin(t * 0.8) * 1.2;                                                                    // lampu gantung
  c.strokeStyle = "#2c2118"; c.lineWidth = 1; c.beginPath(); c.moveTo(b0.x, b0.y); c.lineTo(b.x + sw, b.y - 8); c.stroke();
  c.fillStyle = "#2f8f7a"; c.beginPath(); c.moveTo(b.x + sw - 12, b.y); c.lineTo(b.x + sw + 12, b.y); c.lineTo(b.x + sw + 5, b.y - 10); c.lineTo(b.x + sw - 5, b.y - 10); c.fill(); c.fillStyle = "#fff1c4"; c.beginPath(); c.arc(b.x + sw, b.y + 2, 4, 0, TAU); c.fill();
}
// celemek untuk pemain (hanya tampilan; tidak mengubah gaya/penampilan tersimpan). Terlihat dari depan/samping.
function afterPlayer(c, pl) {
  const o = P(pl.x, pl.y, 0), d = [1, 0.7, 0, -0.7, -1, -0.7, 0, 0.7][pl.dir | 0], fy = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7][pl.dir | 0];
  if (fy < -0.1) return; const w = 4.4 * (1 - Math.abs(d) * 0.35) + 1.2;
  c.fillStyle = "#fff6e4"; c.fillRect(o.x - w, o.y - 19, w * 2, 11); c.strokeStyle = "#d94f3d"; c.lineWidth = 1; c.strokeRect(o.x - w, o.y - 19, w * 2, 11);
  c.fillStyle = "#d94f3d"; c.fillRect(o.x - w + 1, o.y - 15.5, w * 2 - 2, 2.4); c.strokeStyle = "#d94f3d"; c.beginPath(); c.moveTo(o.x - w + 1, o.y - 19); c.lineTo(o.x - 3, o.y - 22); c.moveTo(o.x + w - 1, o.y - 19); c.lineTo(o.x + 3, o.y - 22); c.stroke();
}

// ---------- status & interaksi ----------
async function load() {
  if (R.loading || !api()) return; R.loading = true; R.loadErr = "";
  try { const r = await api().state(); R.cat = Core.catalogMap(r && r.catalog); R.dapur = (r && r.dapur) || null; R.tools = r && r.catalog && Array.isArray(r.catalog.tools) ? r.catalog.tools : null; R.at = Date.now(); NW.room.invalidate(); }
  catch (e) { R.loadErr = Core.errText(e); }
  R.loading = false;
}
const stockLines = (ids) => {
  const out = []; for (const id of ids) { const n = Core.stockOf(R.dapur, id), c = R.cat && R.cat[id]; if (n > 0) out.push(`${c ? c.icon : "•"} ${c ? c.name : id} × ${n}`); }
  return out;
};
const COLD = ["telur", "susu", "air_es", "tempe", "sayuran"];
function interact(t, pl, openDialog) {
  const say = (name, avatar, ...lines) => openDialog({ name, avatar, lines });
  const soon = "Memasak langsung di layar menyusul di tahap berikutnya (Ide 08C). Bahan yang kamu beli sudah tersimpan aman.";
  if (t.id === "d_lemari" || t.id === "d_kulkas") {
    if (!R.dapur) { load(); return say(t.id === "d_lemari" ? "Lemari Bahan" : "Kulkas", t.id === "d_lemari" ? "🗄️" : "🧊", R.loading ? "Sebentar, memeriksa isinya…" : (R.loadErr || "Isi belum dimuat. Coba lagi sebentar.")); }
    const all = Object.keys(R.dapur.ing || {}), cold = all.filter((i) => COLD.includes(i)), dry = all.filter((i) => !COLD.includes(i));
    const ls = stockLines(t.id === "d_kulkas" ? cold : dry), name = t.id === "d_lemari" ? "Lemari Bahan" : "Kulkas";
    return say(name, t.id === "d_lemari" ? "🗄️" : "🧊", ls.length ? `Isi ${name.toLowerCase()}: ${ls.join(", ")}.` : `${name} masih kosong.`, ls.length ? "Batas simpan: 30 untuk tiap jenis bahan." : "Belanja dulu di Kedai Bu Indah, dekat NUSA STYLE.");
  }
  if (t.id === "d_pemanggang") return say("Pemanggang", "♨️", toolOpen("pemanggang") ? "Pemanggangmu siap dipakai." : "Alat ini masih tertutup terpal. Bu Indah menjualnya di etalase kedai.", soon);
  if (t.id === "d_kompor") return say("Kompor Dua Tungku", "🔥", "Wajan di kiri, panci di kanan. Apinya bisa diatur kecil, sedang, atau besar.", soon);
  if (t.id === "d_persiapan") return say("Meja Persiapan", "🔪", "Talenan, pisau, dan mangkuk bawang sudah siap.", soon);
  if (t.id === "d_cuci") return say("Bak Cuci", "🚰", "Piring dan gelas kotor dicuci di sini: sabun, gosok, bilas.", soon);
  if (t.id === "d_meja") return say("Meja Makan", "🍽️", "Dua bangku, dua piring. Nanti di sini kamu makan masakanmu, atau bersama teman.", soon);
  if (t.id === "d_sampah") return say("Tempat Sampah", "🗑️", "Masakan yang gagal dibuang ke sini.", soon);
}
const def = {
  id: "dapur", layout: L, wallH: 112, bg: ["#2f3a38", "#101615"], shellKey: () => "v1",
  drawShell: shell,
  onEnter() { if (!R.dapur || Date.now() - R.at > 20000) load(); },
  onExit() {},
  candidates() {
    const S = L.stations, o = [{ id: "exit", x: S.pintu.x, y: S.pintu.y, r: S.pintu.r, icon: S.pintu.icon, label: S.pintu.label }];
    for (const k of ["lemari", "kulkas", "persiapan", "cuci", "kompor", "pemanggang", "meja", "sampah"]) o.push({ id: "d_" + k, x: S[k].x, y: S[k].y, r: S[k].r, icon: S[k].icon, label: S[k].label });
    return o;
  },
  interact,
  items(t) {
    const m = L.solids.meja, p = L.solids.pemanggang, sa = L.solids.sampah;
    return [{ d: (m.x0 + m.x1) / 2 + (m.y0 + m.y1) / 2, draw: (c) => drawMeja(c, t) }, { d: (p.x0 + p.x1) / 2 + (p.y0 + p.y1) / 2, draw: (c) => drawPemanggang(c, t) }, { d: (sa.x0 + sa.x1) / 2 + (sa.y0 + sa.y1) / 2, draw: drawSampah }];
  },
  afterPlayer, drawTop,
  glow(c, t, a) { NW.lightAt(c, 4.0, 2.0, 130, 120, "#ffd9a0", 0.3 * a); NW.lightAt(c, 6.4, 0.5, 40, 70, "#ff9a3c", 0.12 * a); },
};
NW.room.register(def);

// ---------- pintu dapur di dalam Rumahku (dinding kiri, di atas pintu keluar) ----------
const doorRect = (h) => Core.homeDoor(NW.HD.doorOf(h.level).y0);
const clearRect = (h) => { const r = doorRect(h); return { x0: 0, y0: r.y0 - 0.15, x1: 1.4, y1: r.y1 + 0.15 }; };
function homeDraw(c, lv, t, dk) {
  const dd = Core.homeDoor(NW.HD.doorOf(lv).y0), y1 = dd.y1, y0 = dd.y0, dz = 66;
  fill(c, [P(0, y0 - 0.1, 0), P(0, y1 + 0.1, 0), P(0, y1 + 0.1, dz + 5), P(0, y0 - 0.1, dz + 5)], A.WOOD3);
  fill(c, [P(0, y0, 0), P(0, y1, 0), P(0, y1, dz), P(0, y0, dz)], "#c9a45c");
  for (let k = 1; k < 4; k++) line(c, P(0, y0 + (y1 - y0) * k / 4, 2), P(0, y0 + (y1 - y0) * k / 4, dz - 2), "rgba(90,58,32,.4)", 1);
  fill(c, [P(0, y0 + 0.14, 18), P(0, y1 - 0.14, 18), P(0, y1 - 0.14, dz - 12), P(0, y0 + 0.14, dz - 12)], dk > 0.4 ? "#ffd98a" : "#fff0c4", A.WOOD3, 1);        // jendela hangat dari dalam dapur
  const ym = (y0 + y1) / 2; panelOn(c, "x", 0, ym, dz + 14, 34, 12, "#5a3a20", "#e8b53a", 2); textOn(c, "x", 0, ym, dz + 14, "DAPUR", 6.4, "#ffe9a8");
  const sp = P(0, ym - 0.28, dz + 21); line(c, sp, { x: sp.x, y: sp.y + 5 }, "#3a2a1a", 1);
  const kn = P(0, y1 - 0.2, 32); ell(c, kn.x, kn.y, 2.2, 2.2, A.MUSTARD);
  for (let k = 0; k < 2; k++) { const ph = (t * 0.35 + k * 0.5) % 1, p = P(0, ym + (k ? 0.3 : -0.3), dz + 4 + ph * 14); c.globalAlpha = (1 - ph) * 0.35; ell(c, p.x + Math.sin(ph * 7 + k) * 3, p.y, 2.4, 1.8, "#fff"); c.globalAlpha = 1; }     // aroma tipis
}
function homeCandidate(h, Rr, lv) {
  const r = doorRect(h), my = (r.y0 + r.y1) / 2;
  for (const [x, y] of [[0.78, my], [0.95, my], [0.78, my - 0.3], [0.78, my + 0.3], [1.1, my], [1.1, my - 0.4], [1.1, my + 0.4]]) if (Rr.at(x, y)) return { id: "h_dapur", x, y, r: 0.8, icon: "🍳", label: "Dapur" };
  return null;
}
function enterKitchen(pl) {
  NW.room.enter("dapur", pl, { onExit: (p) => { const c = NW.home.candidates().find((q) => q.id === "h_dapur"); if (c) { p.x = c.x; p.y = c.y; } p.dir = 0; } });   // kembali berdiri di depan pintu dapur di dalam rumah
}
function install() {
  if (!NW.home || !NW.home.hooks || NW.home.hooks.dapur) return;
  NW.home.hooks.dapur = { candidate: homeCandidate, draw: homeDraw, enter: enterKitchen };
  NW.HD.extraClear.push(clearRect); if (NW.home.bump) NW.home.bump();
}
NW.dapurRumah = { install, def, R, load, doorRect, clearRect, homeCandidate, _toolOpen: toolOpen };
})();
