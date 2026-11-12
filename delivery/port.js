// NUSA ISLAND — Pelabuhan Kota (PR-A4): kawasan pengiriman di area nyata "selat" + alur Sail → angkut kotak → mobil Pak Damar → Deliver.
// Dimuat bersama delivery/* (flag klien NUSA_DELIVERY hanya memuat kode). Aktif hanya setelah SERVER: gameFlags.pakDamar === true (delivery/client.js memanggil setup()).
// Klien TIDAK pernah menghitung/menaruh koin: hasil & hadiah hanya dari respons ecoDamarDeliver. opId stabil per (aksi,kotak) → retry aman.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDeliveryCore; if (!Core) return;
const N = () => window.Nusa, $ = (id) => document.getElementById(id), D = () => NW.delivery;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const now = () => performance.now() / 1000;
// ---- geometri (tile, area selat; titik-titik ini diverifikasi walkable/bebas objek di tes) ----
const CRATE = [{ x: 14.5, y: 20.45 }, { x: 15.2, y: 20.45 }];     // kotak diturunkan di dermaga beton, dekat kapal
// Mobil parkir di rumput x≈27.4 (selatan jalan raya y=20; pintu Gudang Peralatan di x≈24.8 tetap bebas), kabin ke utara, pintu belakang menghadap selatan (terlihat kamera). Berangkat: utara → belok timur → jalan raya.
const TRUCK = { x: 27.4, y: 22.8 }, LOAD_PT = { x: 27.4, y: 25.4 };   // titik muat = di belakang mobil
const DAMAR = { x: 28.9, y: 24.7 }, DAMAR_BACK = { x: 29.6, y: 25.4 }, SHED = { x: 22.6, y: 13.3 }, BOARDPT = { x: 12.3, y: 20.5 }, BOARD_SPOT = { x: 13.1, y: 20.45 };
const LEAVE = { L1: 0.75, R: 1.5, LANE: 20.55, END: 17.0 };           // lintasan keberangkatan (tile)
const QUAY = { x0: 11.0, x1: 16.4, y0: 19.05, y1: 20.95 };
const T_PICK = 0.55, T_LOAD = 2.0;                                   // detik: angkat; muat (pintu buka → kotak masuk → pintu tutup)
const st = { truck: { x: TRUCK.x, y: TRUCK.y, fx: 0, fy: -1, show: true, lights: 0, brake: 0, eng: 0 }, leave: null, gone: false, leaveDone: false, leaveCount: 0, pendRes: null, tObj: null, tSolid: null, told: false, ready: false, lock: false, msg: "", ops: null, carry: null, pick: null, load: null, door: 0, inTruck: 0, acc: null, res: null, retry: null, status: null, drawn: false, wait: 0, lastView: 0 };
const area = () => NW.areas && NW.areas.cur && NW.areas.cur.id;
const atPort = () => area() === Core.PORT_AREA;
const view = () => (D() ? D().view() : null);
const stage = () => Core.tripStage(view(), area());
const rb = () => NW.rombongan || null;
const rbSeatedNow = () => !!(rb() && rb().seated());
const rbMine = () => (rb() && rb().mine ? rb().mine() : null);
const sfx = (n) => { try { N().sfx(n); } catch (e) {} };
const toast = (t, k) => { try { N().toast(t, k || ""); } catch (e) {} };
const dest = () => ({ name: "Pelabuhan Kota", m: NaN, ready: st.ready });
// ---------- setup: hanya setelah server menyatakan pakDamar=true ----------
function setup() {
  if (st.ready || !NW.SELAT_MAP || !NW.objDraw) return; st.ready = true; st.ops = Core.opBook(() => D().newOp());
  const M = NW.SELAT_MAP;
  M.objects.push({ kind: "pk_quay", x: (QUAY.x0 + QUAY.x1) / 2, y: (QUAY.y0 + QUAY.y1) / 2, big: 260, dz: -0.3 }, { kind: "pk_cargo", x: 14.8, y: 20.45, big: 90, dz: 0.4 },
    { kind: "pk_truck", ...TRUCK, big: 260 }, { kind: "pk_shed", ...SHED, big: 190 }, { kind: "pk_damar", ...DAMAR, big: 90 }, { kind: "pk_board", x: 17.0, y: 22.9, big: 90 }, { kind: "pk_ice", x: 29.4, y: 24.0, big: 60 });
  st.tObj = M.objects.find((o) => o.kind === "pk_truck"); st.tSolid = { x0: TRUCK.x - 0.56, y0: TRUCK.y - 1.55, x1: TRUCK.x + 0.56, y1: TRUCK.y + 1.55 };
  M.solids.push(st.tSolid, { x0: SHED.x - 1.8, y0: SHED.y - 1.3, x1: SHED.x + 1.8, y1: SHED.y + 1.3 }, { x: DAMAR.x, y: DAMAR.y, r: 0.3 }, { x: 17.0, y: 22.9, r: 0.25 }, { x: 29.4, y: 24.0, r: 0.3 });
  for (const x of [11.6, 14.0, 16.0]) M.solids.push({ x, y: 20.85, r: 0.12 });
  Object.assign(NW.objDraw, { pk_quay: drawQuay, pk_cargo: drawCargoPier, pk_truck: drawTruck, pk_shed: drawShed, pk_damar: drawDamar, pk_board: drawBoard, pk_ice: drawIce });
  buildUI();
}
// ---------- gambar (ringan: poligon datar, tanpa gambar eksternal) ----------
const P = (x, y, z) => NW.P(x, y, z), LIFT = () => NW.LIFT || 6;
function poly(c, pts, fill, stroke) { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); } }
function box(c, cx, cy, hx, hy, z0, h, cols) {   // balok sejajar sumbu; hx/hy = setengah ukuran (tile); cols = [atas, sisi-y, sisi-x]
  const a = (dx, dy, z) => P(cx + dx, cy + dy, z), z1 = z0 + h, B = [a(-hx, -hy, z0), a(hx, -hy, z0), a(hx, hy, z0), a(-hx, hy, z0)], T = [a(-hx, -hy, z1), a(hx, -hy, z1), a(hx, hy, z1), a(-hx, hy, z1)];
  poly(c, [B[3], B[2], T[2], T[3]], cols[1], "rgba(23,63,80,.5)"); poly(c, [B[2], B[1], T[1], T[2]], cols[2], "rgba(23,63,80,.5)"); poly(c, T, cols[0], "rgba(23,63,80,.55)"); return T;
}
const night = (n) => (n ? "rgba(10,20,40,.18)" : null);
function drawQuay(c, o, t, nt) {   // dermaga beton di atas papan kayu: pelat abu-abu, garis kuning tepi, tiang tambat + tali + pelampung
  const z = LIFT() + 4.2, q = QUAY;
  poly(c, [P(q.x0, q.y0, z), P(q.x1, q.y0, z), P(q.x1, q.y1, z), P(q.x0, q.y1, z)], "#a9b0b3", "rgba(60,70,76,.7)");
  for (let x = q.x0 + 1.1; x < q.x1; x += 1.1) { c.strokeStyle = "rgba(70,80,86,.35)"; c.lineWidth = 1; c.beginPath(); const a = P(x, q.y0, z), b = P(x, q.y1, z); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  c.strokeStyle = "#e0b84c"; c.lineWidth = 2; c.beginPath(); const a = P(q.x0, q.y1 - 0.08, z), b = P(q.x1, q.y1 - 0.08, z); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  for (const x of [11.6, 14.0, 16.0]) { box(c, x, 20.85, 0.1, 0.1, z, 6, ["#4a4f52", "#3a3f42", "#2d3033"]); const r = P(x, 20.85, z + 6.5); c.strokeStyle = "#e8d9a8"; c.lineWidth = 2; c.beginPath(); c.arc(r.x, r.y, 3.2, 0, 7); c.stroke(); }
  const f = P(12.8, 20.9, z + 2); c.fillStyle = "#f0803a"; c.beginPath(); c.arc(f.x, f.y, 3.2, 0, 7); c.fill(); c.fillStyle = "#fff"; c.fillRect(f.x - 3.2, f.y - 0.6, 6.4, 1.2);   // pelampung
  const g = P(14.0, 20.85, z + 11), by = Math.sin(t * 2.4) * 0.7; c.fillStyle = "#f6f7f8"; c.beginPath(); c.ellipse(g.x, g.y + by, 4, 2.6, 0, 0, 7); c.fill(); c.fillStyle = "#8d9aa2"; c.beginPath(); c.ellipse(g.x - 3, g.y + by - 0.5, 2.5, 1.3, 0, 0, 7); c.fill();   // burung laut bertengger
}
function crateAt(c, x, y, z, t, sc) { const h = 9 * (sc || 1), T = box(c, x, y, 0.16 * (sc || 1), 0.16 * (sc || 1), z, h, ["#ffffff", "#dfe9ee", "#c5d6de"]); const m = { x: (T[0].x + T[2].x) / 2, y: (T[0].y + T[2].y) / 2 }; c.fillStyle = "#2a9d8f"; c.fillRect(m.x - 3, m.y - 1, 6, 2.2); }
function drawCargoPier(c, o, t) {   // kotak yang baru diturunkan dari kapal (status server: masih berlayar & belum diambil)
  if (!atPort()) return; const sb = Core.sailingBoxes(view()), z = LIFT() + 4.3;
  sb.forEach((i) => { if (st.carry && st.carry.i === i) return; if (st.pick && st.pick.i === i) return; if (st.load && st.load.i === i) return; crateAt(c, CRATE[i].x, CRATE[i].y, z, t); });
}
// ---------- mobil boks pendingin (renderer 2.5D berputar: l = ke depan, w = ke kanan, z = tinggi px) ----------
const vis = (nx, ny) => nx + ny > 0.05;   // sisi menghadap kamera isometrik
function drawTruck(c, o, t, nt) {
  const k = st.truck; if (!k.show) return drawLot(c, o, t);
  const fx = k.fx, fy = k.fy, rx = -fy, ry = fx, z0 = LIFT() + 3.4, dr = st.door;
  const Q = (l, w, z) => P(k.x + fx * l + rx * w, k.y + fy * l + ry * w, z), G = (l, w) => Q(l, w, LIFT());
  const faceV = { front: vis(fx, fy), rear: vis(-fx, -fy), right: vis(rx, ry), left: vis(-rx, -ry) };
  const fp = (box, face, a0, a1, za, zb) => {   // poligon pada sebuah sisi balok; a = w (depan/belakang) atau l (kanan/kiri)
    const [l0, l1, w0, w1] = box;
    if (face === "front") return [Q(l1, a0, za), Q(l1, a1, za), Q(l1, a1, zb), Q(l1, a0, zb)];
    if (face === "rear") return [Q(l0, a0, za), Q(l0, a1, za), Q(l0, a1, zb), Q(l0, a0, zb)];
    if (face === "right") return [Q(a0, w1, za), Q(a1, w1, za), Q(a1, w1, zb), Q(a0, w1, zb)];
    return [Q(a0, w0, za), Q(a1, w0, za), Q(a1, w0, zb), Q(a0, w0, zb)];
  };
  const obox = (box, za, zb, cols) => {   // cols = {top, front, rear, right, left}
    const [l0, l1, w0, w1] = box;
    for (const f of ["rear", "front", "left", "right"]) if (faceV[f]) poly(c, fp(box, f, f === "front" || f === "rear" ? w0 : l0, f === "front" || f === "rear" ? w1 : l1, za, zb), cols[f], "rgba(23,63,80,.55)");
    poly(c, [Q(l0, w0, zb), Q(l1, w0, zb), Q(l1, w1, zb), Q(l0, w1, zb)], cols.top, "rgba(23,63,80,.55)");
  };
  const gl = (box, face, a0, a1, za, zb, fill) => poly(c, fp(box, face, a0, a1, za, zb), fill, "rgba(23,63,80,.6)");
  const BODY = { top: "#f6fafc", front: "#e3edf1", rear: "#d3e1e8", right: "#e9f1f5", left: "#cddce4" };
  const CHS = [-1.5, 1.5, -0.5, 0.5], BOX = [-1.5, 0.86, -0.53, 0.53], CAB = [0.9, 1.5, -0.5, 0.5], zc = z0 + 3, zb = zc + 27, zcab = zc + 17;
  // bayangan (ke kanan-bawah layar, seperti bangunan)
  c.fillStyle = "rgba(20,40,30,.2)"; c.beginPath(); const sh = [[-1.55, -0.6], [1.55, -0.6], [1.55, 0.6], [-1.55, 0.6]].map(([l, w]) => { const q = P(k.x + fx * l + rx * w + 0.55, k.y + fy * l + ry * w + 0.12, LIFT()); return q; }); sh.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.fill();
  obox(CHS, z0, zc, { top: "#3a4247", front: "#2c3236", rear: "#2c3236", right: "#343b40", left: "#2a3034" });
  const cabFirst = fx + fy < 0;   // kabin lebih jauh dari kamera → digambar lebih dulu
  const drawCab = () => {
    obox(CAB, zc, zcab, { top: "#dfeaf0", front: "#e8f1f5", rear: "#cddce4", right: "#e4eef3", left: "#c9d9e1" });
    gl(CAB, "right", 0.9, 1.5, zc, zc + 5.5, "#2a9d8f");                                      // aksen toska bawah kabin
    if (faceV.front) {
      gl(CAB, "front", -0.42, 0.42, zc + 8, zc + 15.5, "#7fc4d8");                              // kaca depan
      const a = Q(1.5, -0.3, zc + 14), b = Q(1.5, -0.05, zc + 9); c.strokeStyle = "rgba(255,255,255,.65)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      gl(CAB, "front", -0.2, 0.2, zc + 2.6, zc + 6.2, "#215f66");                               // gril
      for (const sw of [-1, 1]) { const q = Q(1.5, sw * 0.38, zc + 4.4); c.fillStyle = st.truck.lights > 0.05 ? "#fff6c2" : "#f3e7b0"; c.beginPath(); c.arc(q.x, q.y, 2.1, 0, 7); c.fill(); c.strokeStyle = "rgba(23,63,80,.6)"; c.lineWidth = 0.8; c.stroke(); }
      const bm = [1.5, 1.56, -0.54, 0.54]; obox(bm, z0, zc + 2, { top: "#4b545a", front: "#434b50", rear: "#434b50", right: "#3c4348", left: "#3c4348" });   // bumper depan
    }
    if (faceV.right) {
      gl(CAB, "right", 0.98, 1.42, zc + 8, zc + 15.2, "#7fc4d8");                               // kaca samping
      const d0 = Q(0.96, 0.5, zc + 1), d1 = Q(0.96, 0.5, zcab - 1); c.strokeStyle = "rgba(23,63,80,.6)"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(d0.x, d0.y); c.lineTo(d1.x, d1.y); c.stroke();
      const hd = Q(1.1, 0.5, zc + 7); c.fillStyle = "#6a767d"; c.fillRect(hd.x - 2, hd.y - 0.6, 4, 1.4);   // pegangan pintu kabin
      const mr = Q(1.4, 0.58, zc + 12); c.fillStyle = "#2c3236"; c.fillRect(mr.x - 1.2, mr.y - 2, 2.4, 4);        // spion
    }
  };
  if (cabFirst) drawCab();
  obox(BOX, zc, zb, BODY);
  // sisi kanan boks: strip toska + biru, tulisan, garis panel
  if (faceV.right) {
    gl(BOX, "right", -1.5, 0.86, zc, zc + 5, "#2a9d8f"); gl(BOX, "right", -1.5, 0.86, zc + 5, zc + 6.4, "#2f7fb0");
    for (const l of [-0.9, -0.3, 0.3]) { const a = Q(l, 0.53, zc + 7), b = Q(l, 0.53, zb - 1); c.strokeStyle = "rgba(23,63,80,.18)"; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    const A = Q(-1.42, 0.53, zc + 17), B = Q(0.78, 0.53, zc + 17); let sx = A, ex = B; if (B.x < A.x) { sx = B; ex = A; }
    const ang = Math.atan2(ex.y - sx.y, ex.x - sx.x), len = Math.hypot(ex.x - sx.x, ex.y - sx.y);
    c.save(); c.translate(sx.x, sx.y); c.transform(1, Math.tan(0), 0, 1, 0, 0); c.rotate(ang); c.fillStyle = "#1d6f66"; c.font = "bold 5.6px system-ui"; c.textAlign = "center";
    c.fillText("NUSA SEGAR", len / 2, 0); c.font = "bold 4.3px system-ui"; c.fillStyle = "#2f7fb0"; c.fillText("PAK DAMAR", len / 2 - 5, 6.4);
    const fx0 = len / 2 + 15; c.fillStyle = "#2a9d8f"; c.beginPath(); c.ellipse(fx0, 4.4, 4.2, 2.1, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(fx0 + 3.4, 4.4); c.lineTo(fx0 + 7, 2.2); c.lineTo(fx0 + 7, 6.6); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(fx0 - 2, 3.8, 0.7, 0, 7); c.fill();   // logo ikan kecil
    c.restore();
  }
  // unit pendingin di atas boks, sisi depan
  const UNIT = [0.3, 0.82, -0.32, 0.32]; obox(UNIT, zb, zb + 6, { top: "#d7e8f1", front: "#c7dce8", rear: "#b6cfdd", right: "#bfd5e2", left: "#b0c8d6" });
  if (faceV.right) for (let i = 0; i < 3; i++) { const a = Q(0.42 + i * 0.14, 0.32, zb + 1.2), b = Q(0.42 + i * 0.14, 0.32, zb + 4.8); c.strokeStyle = "rgba(40,80,100,.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  if (faceV.front) { const q = Q(0.82, 0, zb + 3); c.strokeStyle = "rgba(40,80,100,.55)"; c.lineWidth = 1; c.beginPath(); c.arc(q.x, q.y, 2, 0, 7); c.stroke(); const an = (t * 9) % 6.28; c.beginPath(); c.moveTo(q.x - Math.cos(an) * 1.8, q.y - Math.sin(an) * 1.8); c.lineTo(q.x + Math.cos(an) * 1.8, q.y + Math.sin(an) * 1.8); c.stroke(); }
  if (!cabFirst) drawCab();
  // roda (sisi kanan) + bayangan
  for (const l of [1.12, -0.95]) { const g = G(l, 0.5); c.fillStyle = "rgba(10,20,20,.28)"; c.beginPath(); c.ellipse(g.x + 1.5, g.y + 1.2, 6, 2.6, 0, 0, 7); c.fill(); }
  if (faceV.right) for (const l of [1.12, -0.95]) { const w = Q(l, 0.54, z0 - 0.4); c.fillStyle = "#1c2023"; c.beginPath(); c.arc(w.x, w.y, 4.6, 0, 7); c.fill(); c.fillStyle = "#9aa6ad"; c.beginPath(); c.arc(w.x, w.y, 2, 0, 7); c.fill(); c.fillStyle = "#5c676d"; c.beginPath(); c.arc(w.x, w.y, 0.8, 0, 7); c.fill(); }
  else if (faceV.left) for (const l of [1.12, -0.95]) { const w = Q(l, -0.54, z0 - 0.4); c.fillStyle = "#1c2023"; c.beginPath(); c.arc(w.x, w.y, 4.6, 0, 7); c.fill(); }
  // belakang: rongga, kotak di dalam, kabut dingin, dua pintu, engsel, pegangan, lampu, bumper
  if (faceV.rear) {
    const ya = zc + 2, yb = zb - 1.5, W = 0.46;
    if (dr > 0.04) {
      const grad = c.createLinearGradient(0, Q(-1.5, 0, yb).y, 0, Q(-1.5, 0, ya).y); grad.addColorStop(0, "#0f1d25"); grad.addColorStop(1, "#1d3a48"); poly(c, fp(BOX, "rear", -W, W, ya, yb), grad, "rgba(23,63,80,.7)");
      c.save(); c.globalAlpha = Math.min(1, dr * 1.2); c.strokeStyle = "rgba(160,200,220,.18)"; c.lineWidth = 1; for (let i = 1; i < 4; i++) { const a = Q(-1.5, -W, ya + i * 5.5), b = Q(-1.5, W, ya + i * 5.5); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } c.restore();
      for (let i = 0; i < st.inTruck; i++) crateAt(c, k.x + fx * (-1.15 + i * 0.5) + rx * (i ? 0.12 : -0.14), k.y + fy * (-1.15 + i * 0.5) + ry * (i ? 0.12 : -0.14), z0 + 5.2, t, 0.85);
      c.save(); for (let i = 0; i < 6; i++) { const ph = (t * 0.45 + i / 6) % 1, q = Q(-1.58 - ph * 0.25, -0.35 + ((i * 0.37) % 0.7), ya + 1 + ph * 9); c.globalAlpha = dr * 0.5 * (1 - ph); c.fillStyle = "#e4f4fb"; c.beginPath(); c.arc(q.x, q.y, 2.4 + ph * 3.2, 0, 7); c.fill(); } c.restore();   // kabut es ringan
    } else poly(c, fp(BOX, "rear", -W, W, ya, yb), "#dbe8ee", "rgba(23,63,80,.5)");
    for (const sg of [-1, 1]) {   // daun pintu: engsel di tepi, ayun keluar saat terbuka
      const phi = dr * 1.75, hl = -1.5, hw = sg * 0.5, el = hl - Math.sin(phi) * 0.5, ew = hw - sg * Math.cos(phi) * 0.5;
      const pts = [Q(hl, hw, ya), Q(el, ew, ya), Q(el, ew, yb), Q(hl, hw, yb)]; poly(c, pts, dr > 0.5 ? "#f2f7fa" : "#e6eff3", "rgba(23,63,80,.65)");
      const hm = Q(hl + (el - hl) * 0.82, hw + (ew - hw) * 0.82, (ya + yb) / 2 + 1); c.fillStyle = "#6a767d"; c.fillRect(hm.x - 0.8, hm.y - 3.5, 1.7, 7);   // pegangan
      for (const zz of [ya + 3, (ya + yb) / 2, yb - 3]) { const h = Q(hl, hw, zz); c.fillStyle = "#4b545a"; c.fillRect(h.x - 1.2, h.y - 1.2, 2.4, 2.4); }   // engsel
    }
    const sm = Q(-1.5, 0, ya), st2 = Q(-1.5, 0, yb); if (dr < 0.2) { c.strokeStyle = "rgba(23,63,80,.55)"; c.lineWidth = 1; c.beginPath(); c.moveTo(sm.x, sm.y); c.lineTo(st2.x, st2.y); c.stroke(); }
    for (const sg of [-1, 1]) { const q = Q(-1.5, sg * 0.5, zc + 5.5); c.fillStyle = k.brake > 0.05 ? "#ff6a58" : "#c23a2f"; c.fillRect(q.x - 1.6, q.y - 2, 3.2, 4); }   // lampu belakang
    obox([-1.58, -1.5, -0.55, 0.55], z0, zc + 2.2, { top: "#4b545a", front: "#3c4348", rear: "#434b50", right: "#3c4348", left: "#3c4348" });   // bumper belakang
  }
  // lampu depan menyala sebentar: kolam cahaya di depan mobil + kepulan knalpot
  if (k.lights > 0.02) { const q = G(2.7, 0), a = G(1.6, 0); c.save(); c.globalAlpha = Math.min(0.5, k.lights * 0.5); const gr = c.createRadialGradient(q.x, q.y, 2, q.x, q.y, 34); gr.addColorStop(0, "#fff3b8"); gr.addColorStop(1, "rgba(255,243,184,0)"); c.fillStyle = gr; c.beginPath(); c.ellipse(q.x, q.y, 34, 15, 0, 0, 7); c.fill(); c.restore(); void a; }
  if (k.eng > 0.02) { c.save(); for (let i = 0; i < 4; i++) { const ph = (t * 1.3 + i / 4) % 1, q = Q(-1.62 - ph * 0.5, 0.45, z0 + 1 + ph * 9); c.globalAlpha = k.eng * 0.4 * (1 - ph); c.fillStyle = "#cfd6da"; c.beginPath(); c.arc(q.x, q.y, 1.8 + ph * 3, 0, 7); c.fill(); } c.restore(); }
}
function drawLot(c, o, t) {   // petak parkir kosong (mobil sudah berangkat / pengiriman hari ini selesai)
  const x = TRUCK.x, y = TRUCK.y, z = LIFT(), a = (dx, dy) => P(x + dx, y + dy, z);
  poly(c, [a(-0.62, -1.62), a(0.62, -1.62), a(0.62, 1.62), a(-0.62, 1.62)], "rgba(70,80,86,.2)");
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.4; c.beginPath(); for (const [p0, p1] of [[a(-0.62, -1.62), a(-0.62, 1.62)], [a(0.62, -1.62), a(0.62, 1.62)], [a(-0.62, 1.62), a(0.62, 1.62)]]) { c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); } c.stroke();
  if (questDone()) {   // papan "Pengiriman hari ini selesai"
    const b = P(x + 1.55, y - 0.4, z), top = P(x + 1.55, y - 0.4, z + 24); c.strokeStyle = "#6b5236"; c.lineWidth = 3; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(top.x, top.y); c.stroke();
    c.fillStyle = "#f3e7c9"; c.strokeStyle = "#173f50"; c.lineWidth = 1.5; c.fillRect(top.x - 30, top.y - 14, 60, 24); c.strokeRect(top.x - 30, top.y - 14, 60, 24);
    c.fillStyle = "#173f50"; c.font = "bold 7px system-ui"; c.textAlign = "center"; c.fillText("PENGIRIMAN", top.x, top.y - 4); c.fillText("HARI INI SELESAI ✓", top.x, top.y + 6);
  }
}
const questDone = () => { const v = view(); return !!v && !Core.sailingBoxes(v).length && ((v.need > 0 && v.delivered >= v.need) || v.paid === true); };
function truckPose(sd) {   // lintasan: lurus utara → belok kanan → timur menyusuri jalan raya
  const L1 = LEAVE.L1, R = LEAVE.R, arc = (Math.PI / 2) * R, cy = LEAVE.LANE + R;
  if (sd < L1) return { x: TRUCK.x, y: TRUCK.y - sd, fx: 0, fy: -1 };
  if (sd < L1 + arc) { const th = (sd - L1) / R, cx = TRUCK.x + R, cyy = TRUCK.y - L1; return { x: cx - R * Math.cos(th), y: cyy - R * Math.sin(th), fx: Math.sin(th), fy: -Math.cos(th) }; }
  const e = sd - L1 - arc; return { x: TRUCK.x + R + e, y: TRUCK.y - L1 - R, fx: 1, fy: 0 };
}
function drawShed(c, o, t, nt) {   // Gudang Ikan Kota: dinding seng krem, atap biru-abu, pintu geser, papan nama, tumpukan peti & es
  const x = SHED.x, y = SHED.y, z = LIFT(), W = box(c, x, y, 1.7, 1.2, z, 40, ["#9fb0ba", "#e4dcc6", "#d3c9ae"]);
  const a = (dx, dy, zz) => P(x + dx, y + dy, zz); poly(c, [a(-1.8, -1.3, z + 40), a(1.8, -1.3, z + 40), a(1.8, 1.3, z + 40), a(-1.8, 1.3, z + 40)], "#6f8796", "rgba(23,63,80,.6)");
  poly(c, [a(-0.6, 1.2, z), a(0.6, 1.2, z), a(0.6, 1.2, z + 26), a(-0.6, 1.2, z + 26)], "#5c4a36", "rgba(23,63,80,.6)");
  const s = a(0, 1.22, z + 33); c.save(); c.fillStyle = "#173f50"; c.font = "bold 7px system-ui"; c.textAlign = "center"; c.fillText("GUDANG IKAN", s.x, s.y); c.restore();
  crateAt(c, x + 2.1, y + 0.9, z, t, 0.9); crateAt(c, x + 2.1, y + 0.5, z, t, 0.9); crateAt(c, x + 2.1, y + 0.7, z + 9, t, 0.9);
  box(c, x - 2.0, y + 1.0, 0.3, 0.22, z, 8, ["#eaf6fb", "#cfe6f0", "#bad7e4"]);
}
function drawIce(c, o, t) { const z = LIFT(); box(c, o.x, o.y, 0.22, 0.2, z, 7, ["#eaf6fb", "#cfe6f0", "#bad7e4"]); box(c, o.x + 0.28, o.y - 0.1, 0.14, 0.14, z, 5, ["#f4fbff", "#d6ebf4", "#c4dfeb"]); }
function drawBoard(c, o, t) {   // papan tujuan
  const z = LIFT(), b = P(o.x, o.y, z), top = P(o.x, o.y, z + 26); c.strokeStyle = "#6b5236"; c.lineWidth = 3; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(top.x, top.y); c.stroke();
  c.fillStyle = "#f3e7c9"; c.strokeStyle = "#173f50"; c.lineWidth = 1.5; c.fillRect(top.x - 26, top.y - 12, 52, 20); c.strokeRect(top.x - 26, top.y - 12, 52, 20);
  c.fillStyle = "#173f50"; c.font = "bold 7px system-ui"; c.textAlign = "center"; c.fillText("KOTA NUSA", top.x, top.y - 2); c.fillText("← KIRIMAN SEGAR", top.x, top.y + 6);
}
const DAMAR_CH = { x: DAMAR.x, y: DAMAR.y, dir: 6, walk: 0, moving: false, sit: false, rod: 0, seed: 3.3, hold: null, rodSpec: null, style: { shirt: "#2a9d8f", pants: "#2e2a26", skin: "#b77b52", hair: "#1f1612", hat: "cap", hatCol: "#e9e4d8", collar: "#f3e7c9", apron: "#f3e7c9" } };
function drawDamar(c, o, t) {
  NW.drawCharacter(c, DAMAR_CH, t); const pb = P(DAMAR_CH.x, DAMAR_CH.y, LIFT());
  if (st.leave && st.leave.wave) { c.save(); c.font = "13px system-ui"; c.textAlign = "center"; c.fillText("👋", pb.x + 10, pb.y - 52 + Math.sin(t * 9) * 2.5); c.restore(); }
  const pl = NW.world && NW.world.player, near = pl && Math.hypot(pl.x - DAMAR_CH.x, pl.y - DAMAR_CH.y) < 2.6;   // label hanya saat dekat → tidak menutupi atap gudang
  if (near && NW.look && NW.look.drawLabel) NW.look.drawLabel(c, { name: "Pak Damar", title: "Pengiriman Segar" }, pb.x, pb.y, 1.0 / ((NW.world && NW.world.zoom) || 1), 0);
}
// ---------- membawa kotak dengan dua tangan ----------
const DV = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];
function drawCarry(c, pl, t) {
  if (!st.carry && !st.pick) return; const k = st.pick ? Math.min(1, (now() - st.pick.t0) / T_PICK) : 1, b = P(pl.x, pl.y, (NW.groundZ ? NW.groundZ(pl.x, pl.y) : LIFT() + 4)), v = DV[pl.dir | 0] || [0, 1];
  const cx = b.x + v[0] * 7, cy = b.y - (6 + 12 * k) + (pl.moving ? Math.abs(Math.sin((pl.walk || 0))) * -1.2 : 0), w = 10, h = 8;
  c.save(); c.strokeStyle = "#e0b48a"; c.lineWidth = 2.4; c.lineCap = "round";
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(b.x + sx * 5, b.y - 17); c.lineTo(cx + sx * (w / 2 - 1), cy + h / 2); c.stroke(); }   // dua tangan memegang sisi kotak
  c.fillStyle = "#ffffff"; c.strokeStyle = "rgba(23,63,80,.7)"; c.lineWidth = 1.2; c.fillRect(cx - w / 2, cy - h / 2, w, h); c.strokeRect(cx - w / 2, cy - h / 2, w, h);
  c.fillStyle = "#2a9d8f"; c.fillRect(cx - 3, cy - 0.8, 6, 1.8); c.restore();
}
// ---------- interaksi dunia ----------
const carrying = () => !!st.carry;
const busy = () => !!(st.pick || st.load);
function candidates(pl) {
  const out = []; if (!st.ready || !atPort() || st.lock || rbSeatedNow()) return out;
  if (stage() === "port" && !st.carry && !st.pick && !st.load) for (const i of Core.sailingBoxes(view())) out.push({ id: "pk:crate:" + i, x: CRATE[i].x, y: CRATE[i].y, r: 1.35, icon: "📦", label: "Ambil Kotak " + (i + 1), pk: { k: "crate", i }, bz: 30, pri: 0.7 });
  if (st.carry && !st.load) out.push({ id: "pk:truck", x: LOAD_PT.x, y: LOAD_PT.y, r: 1.7, icon: "🚚", label: "Masukkan ke Mobil", pk: { k: "truck" }, bz: 40, pri: 0.8 });
  out.push({ id: "pk:damar", x: DAMAR_CH.x, y: DAMAR_CH.y + 0.9, r: 1.3, icon: "💬", label: "Pak Damar", pk: { k: "damar" }, bz: 56, pri: 0.3 });
  const m = rbMine(); if (m && m.ashore && !st.carry) out.push({ id: "pk:board", x: BOARDPT.x, y: BOARDPT.y, r: 1.6, icon: "⛵", label: "Naik Kapal Rombongan", pk: { k: "board" }, bz: 36, pri: 0.7 });
  return out;
}
function interact(t) {
  const k = t.pk && t.pk.k;
  if (k === "crate") { st.pick = { i: t.pk.i, t0: now() }; sfx("kotak_angkat"); setTimeout(() => { if (st.pick) { st.carry = { i: st.pick.i }; st.pick = null; hud(); } }, T_PICK * 1000); }
  else if (k === "truck") { if (!st.carry) return; st.load = { i: st.carry.i, t0: now(), snd: 0 }; sfx("mobil_pintu"); }
  else if (k === "damar") talk();
  else if (k === "board" && rb() && rb().reboard) rb().reboard(BOARD_SPOT);
}
function talk() {
  const v = view(), s = stage(), lines = s === "port" ? ["Kotaknya sudah sampai? Bawa satu-satu ke mobil, ya. Hati-hati, ikannya harus tetap dingin."] : s === "away" ? ["Kiriman masih di jalan. Bawa ke Pelabuhan Kota lewat kapal, atau batalkan pelayaran dari panel pengiriman."] : ["Aku Pak Damar. Kalau pesananmu sudah dikemas di Muara, naiklah kapal dan antarkan ke sini."];
  NW.world.openDialog({ name: "Pak Damar", avatar: "🚚", role: "Pengiriman Segar", lines, noLater: true });
}
// ---------- per frame ----------
function update(dt) {
  if (!st.ready) return;
  const want = (st.load && (now() - st.load.t0) < 1.55) || (st.retry && !st.leave) ? 1 : 0; st.door += (want - st.door) * (1 - Math.exp(-dt * 9));
  truckTick(dt);
  if (st.pick && now() - st.pick.t0 > T_PICK + 0.4) { st.carry = { i: st.pick.i }; st.pick = null; }
  if (st.load) {
    const u = now() - st.load.t0;
    if (u > 1.0 && !st.load.dropped) { st.load.dropped = true; st.inTruck = Math.min(2, st.inTruck + 1); st.carry = null; sfx("kotak_angkat"); }
    if (u > 1.55 && !st.load.closed) { st.load.closed = true; sfx("mobil_pintu"); }
    if (u > T_LOAD) { const i = st.load.i; st.load = null; deliverBox(i); }
  }
  if (!atPort() && (st.carry || st.pick)) { st.carry = null; st.pick = null; }   // keluar area: kotak kembali ke status server
  hud();
}
// ---------- mobil: parkir / berangkat (MURNI visual; dipicu hanya oleh respons server yang sukses; tak menghitung hadiah) ----------
function truckTick(dt) {
  const k = st.truck;
  if (stage() === "port" && !st.leave) { st.gone = false; st.leaveDone = false; }   // perjalanan baru → mobil kembali ke petak
  if (!st.leave) {
    const want = stage() === "port" || (!questDone() && !st.gone);
    Object.assign(k, { x: TRUCK.x, y: TRUCK.y, fx: 0, fy: -1, show: want, lights: 0, brake: 0, eng: 0 }); if (st.tObj) { st.tObj.x = TRUCK.x; st.tObj.y = TRUCK.y; }
    if (st.tSolid) { const on = want; st.tSolid.x1 = on ? TRUCK.x + 0.56 : st.tSolid.x0; st.tSolid.y1 = on ? TRUCK.y + 1.55 : st.tSolid.y0; }
    DAMAR_CH.x = DAMAR.x; DAMAR_CH.y = DAMAR.y; DAMAR_CH.moving = false; return;
  }
  const L = st.leave, u = now() - L.t0;
  if (u > 0.15 && !L.snd0) { L.snd0 = 1; sfx("mobil_pintu"); }
  if (u > 0.6) { L.wave = u < 3.3; const f = Math.min(1, (u - 0.6) / 0.9); DAMAR_CH.x = DAMAR.x + (DAMAR_BACK.x - DAMAR.x) * f; DAMAR_CH.y = DAMAR.y + (DAMAR_BACK.y - DAMAR.y) * f; DAMAR_CH.moving = f < 1; DAMAR_CH.walk += dt * 6; }
  if (u > 1.5 && u < 3.2) { k.lights = Math.min(1, (u - 1.5) * 3); k.brake = 1; } else if (u >= 3.2) { k.lights = Math.max(0, k.lights - dt * 1.5); k.brake = 0; }
  if (u > 1.9 && !L.eng) { L.eng = 1; sfx("mobil_mesin"); }
  if (u > 1.9) k.eng = Math.min(1, (u - 1.9) * 2);
  const v = u - 2.6;   // mulai bergerak perlahan, lalu mempercepat sedikit
  if (v > 0) {
    if (!L.told) { L.told = true; toast("🚚 Kiriman segar berangkat menuju Kota Nusa!", "good"); }
    if (st.tSolid) { st.tSolid.x1 = st.tSolid.x0; st.tSolid.y1 = st.tSolid.y0; }
    const sd = v < 2.4 ? 0.5 * 0.9 * v * v : 0.5 * 0.9 * 2.4 * 2.4 + 2.16 * (v - 2.4) + 0.7 * (v - 2.4) * (v - 2.4), pz = truckPose(sd);
    Object.assign(k, pz); if (st.tObj) { st.tObj.x = pz.x; st.tObj.y = pz.y; }
    if (pz.x > TRUCK.x + LEAVE.R + LEAVE.END) { st.leave = null; st.gone = true; k.show = false; k.eng = 0; k.lights = 0; if (st.pendRes) { const a = st.pendRes; st.pendRes = null; showResult(a); } lastHud = ""; rerender(); }
  }
}
function startLeave() {
  if (st.leave || st.leaveDone) return false; st.leaveDone = true; st.leaveCount++; st.leave = { t0: now(), told: false }; return true;
}
// ---------- UI: status kecil + hasil dari server ----------
function buildUI() {
  if (st.status) return;
  const s = document.createElement("div"); s.id = "pkStatus"; s.className = "pk-status hidden"; s.setAttribute("role", "status"); s.setAttribute("aria-live", "polite"); document.body.appendChild(s); st.status = s;
  const r = document.createElement("div"); r.id = "pkRes"; r.className = "pk-res hidden"; r.setAttribute("role", "dialog"); r.setAttribute("aria-label", "Hasil pengiriman"); document.body.appendChild(r); st.res = r;
  s.addEventListener("pointerdown", (e) => e.stopPropagation()); r.addEventListener("pointerdown", (e) => e.stopPropagation());
}
let lastHud = "";
function hud() {
  if (!st.status) return; const s = stage(), here = atPort();
  let html = "";
  if (st.retry) html = `<b>⚠️ ${esc(st.retry.msg)}</b><button type="button" id="pkRetry">Coba lagi</button>`;
  else if (st.lock) html = `<b>${esc(st.msg || "Memproses…")}</b>`;
  else if (here && s === "port") html = st.carry ? "<b>📦 Membawa kotak</b><span>Bawa ke mobil Pak Damar (🚚).</span>" : `<b>🚚 Pelabuhan Kota</b><span>${st.msg ? esc(st.msg) : "Temui Pak Damar di area mobil pendingin. Ambil kotak di dermaga lalu masukkan ke mobil."}</span>${capHint()}`;
  else if (here && st.msg) html = `<b>${esc(st.msg)}</b>`;
  if (here && s !== "port" && !st.carry && !st.lock && !st.retry && !st.leave && homeOk()) html += `<button type="button" id="pkHomeHud">🏠 Kembali ke Muara</button>`;
  if (html === lastHud) return; lastHud = html; st.status.innerHTML = html; st.status.classList.toggle("hidden", !html);
  const rt = $("pkRetry"); if (rt) rt.addEventListener("click", () => { const f = st.retry && st.retry.fn; st.retry = null; lastHud = ""; if (f) f(); });
  const hh = $("pkHomeHud"); if (hh) hh.addEventListener("click", () => { lastHud = ""; goHome(); });
  const dn = $("pkDown"); if (dn) dn.addEventListener("click", () => { rb() && rb().disembark && rb().disembark(BOARD_SPOT); lastHud = ""; });
}
function homeOk() { const m = rbMine(); return !m || m.captain; }
const goalHint = () => (atPort() && stage() === "port" && !st.carry ? "🚚 Temui Pak Damar di area mobil pendingin." : "");
function capHint() { const m = rbMine(); return m && !m.ashore && m.captain ? '<button type="button" id="pkDown">🪜 Turun ke dermaga</button>' : ""; }
function showResult(a) {
  const rows = [];
  rows.push(`<li>Ikan diterima: <b>${a.moved}</b></li>`);
  if (a.fresh !== null) rows.push(`<li>Kesegaran: <b>${a.fresh ? "Segar ✓" : "Kurang segar"}</b></li>`);
  if (a.delivered != null && a.need) rows.push(`<li>Pesanan hari ini: <b>${a.delivered}/${a.need}</b></li>`);
  rows.push(a.reward != null ? `<li>Hadiah dari server: <b>🪙 ${a.reward}</b></li>` : "<li>Hadiah dibayar server saat pesanan hari ini lengkap.</li>");
  st.res.innerHTML = `<div class="pk-card"><h2>Pengiriman Selesai 🚚</h2><ul>${rows.join("")}</ul><p class="pk-note">Angka ini berasal dari respons server.</p><div class="pk-btns"><button type="button" id="pkOk">Oke</button>${homeBtn()}</div></div>`;
  st.res.classList.remove("hidden"); sfx("kirim_selesai");
  $("pkOk").addEventListener("click", () => st.res.classList.add("hidden")); const h = $("pkHome"); if (h) h.addEventListener("click", () => { st.res.classList.add("hidden"); goHome(); });
}
const homeBtn = () => (rbMine() ? (rbMine().captain ? '<button type="button" id="pkHome">Kembali ke Muara</button>' : "") : '<button type="button" id="pkHome">Kembali ke Muara</button>');
// ---------- panel pengiriman: tombol perjalanan ----------
function mountTrip(el) {
  if (!el) return; const vw = view(), s = stage(), m = rbMine(), pass = m && !m.captain;
  const mk = (id, label, cls) => `<button type="button" class="dl-go ${cls || ""}" id="${id}" ${st.lock ? "disabled" : ""}>${label}</button>`;
  let h = "";
  if (s === "ready") h = pass ? '<p class="dl-msg">Hanya kapten Kapal Rombongan yang bisa memulai pelayaran.</p>' : mk("pkSail", "⛵ Berlayar ke Pelabuhan Kota");
  else if (s === "away") h = mk("pkGo", "⛵ Lanjut ke Pelabuhan Kota") + mk("pkAbort", "Batalkan pelayaran", "alt");
  else if (s === "port") h = mk("pkAbort", "Batalkan pengiriman", "alt");
  el.innerHTML = h; const q = (id, f) => { const b = el.querySelector("#" + id); if (b) b.addEventListener("click", f); };
  q("pkSail", startTrip); q("pkGo", () => depart()); q("pkAbort", abortTrip);
  const first = el.querySelector("button"); if (first && first.scrollIntoView) { try { first.scrollIntoView({ block: "nearest" }); } catch (e) { /* abaikan */ } }
}
const rerender = () => { try { if (D().isOpen) D().render(); } catch (e) {} lastHud = ""; hud(); };
function finish(msg) { st.lock = false; st.msg = msg || ""; if (D()) D().setMsg(msg || ""); rerender(); }
const failMsg = (e) => { const c = Core.classifyErr(e); return c === "unknown" ? "Jaringan bermasalah. Ikanmu tetap aman — coba lagi." : (D().errMsg(e) || "Server menolak. Ikanmu tetap aman."); };
async function resync() { try { await D().api.state(); } catch (e) { /* tetap pakai tampilan terakhir */ } }
// ---------- Sail ----------
async function startTrip() {
  if (st.lock || !st.ready) return; const m = rbMine(); if (m && !m.captain) return;
  const todo = Core.idleLoaded(view()); if (!todo.length) { return finish("Kotak kosong. Muat ikan dulu."); }
  st.lock = true; st.msg = "Memberangkatkan kotak…"; rerender(); let failed = null;
  for (const i of todo) {
    const op = st.ops.get("sail", i);
    try { await D().api.sail(i, op); st.ops.done("sail", i); }
    catch (e) { failed = e; if (Core.classifyErr(e) === "rejected") st.ops.done("sail", i); break; }   // hasil tak pasti → opId sama dipakai ulang saat coba lagi
  }
  await resync();   // selalu selaraskan dengan SERVER; lanjut dari posisi sebenarnya
  const sb = Core.sailingBoxes(view());
  if (!sb.length) { st.retry = failed ? { msg: failMsg(failed), fn: startTrip } : null; return finish(failed ? failMsg(failed) : "Tidak ada kotak yang berangkat."); }
  if (failed) toast("Satu kotak belum berangkat (" + failMsg(failed) + "). Ikannya tetap aman di kotak.", "bad");
  st.lock = false; if (D() && D().close) D().close(); depart(); rerender();
}
function depart() {
  const m = rbMine();
  if (m) { if (!m.captain) return finish("Hanya kapten yang bisa berlayar."); if (!rb().go(Core.PORT_AREA)) return finish("Kapal belum siap berlayar. Coba lagi."); if (D() && D().close) D().close(); toast("⛵ Berlayar ke Pelabuhan Kota…"); return; }
  voyageSolo();
}
function voyageSolo() {
  const f = $("fade"); if (f) f.classList.add("on"); if (D() && D().close) D().close(); toast("⛵ Berlayar ke Pelabuhan Kota…");
  setTimeout(() => { try { if (NW.boat && NW.boat.onVoyage) NW.boat.onVoyage(); N().goWorld("boat", Core.PORT_AREA); } catch (e) {} setTimeout(() => f && f.classList.remove("on"), 80); sfx("berlayar"); }, 380);
}
function goHome() {
  const m = rbMine();
  if (m) { if (m.captain && rb().goHome) rb().goHome(); return; }
  const f = $("fade"); if (f) f.classList.add("on");
  setTimeout(() => { try { N().goWorld("boat", Core.HOME_AREA); } catch (e) {} setTimeout(() => f && f.classList.remove("on"), 80); }, 380);
}
// ---------- Abort ----------
async function abortTrip() {
  if (st.lock) return; const sb = Core.sailingBoxes(view()); if (!sb.length) return;
  st.lock = true; st.msg = "Membatalkan pelayaran…"; rerender(); let failed = null;
  for (const i of sb) { const op = st.ops.get("abort", i); try { await D().api.abort(i, op); st.ops.done("abort", i); } catch (e) { failed = e; if (Core.classifyErr(e) === "rejected") st.ops.done("abort", i); break; } }
  await resync(); st.carry = null; st.pick = null; st.load = null; st.inTruck = 0;
  if (failed) st.retry = { msg: failMsg(failed), fn: abortTrip };
  finish(failed ? failMsg(failed) : "Pelayaran dibatalkan. Ikanmu tetap aman di kotak.");
  if (!failed && atPort()) goHome();
}
// ---------- Deliver (per kotak, setelah kotak masuk mobil) ----------
async function deliverBox(i) {
  if (st.lock) return; st.lock = true; st.msg = "Pak Damar memeriksa kiriman…"; rerender();
  const op = st.ops.get("deliver", i);
  try {
    const res = await D().api.deliver(i, op); st.ops.done("deliver", i); const r = Core.deliverResult(res);
    if (r) { st.acc = st.acc || { moved: 0, fresh: null, reward: null, delivered: null, need: null }; st.acc.moved += r.moved; st.acc.fresh = r.fresh === null ? st.acc.fresh : st.acc.fresh === false ? false : r.fresh; if (r.reward != null) st.acc.reward = r.reward; st.acc.delivered = r.delivered; st.acc.need = r.need; }
    st.inTruck = Math.max(0, st.inTruck); await afterDeliver();
  } catch (e) {
    const cls = Core.classifyErr(e);
    if (cls === "rejected") st.ops.done("deliver", i);
    st.carry = null; await resync();
    // 409 "terlalu cepat": diputuskan dari STATE server (sailMs < minTripMs setelah resync), bukan dari teks galat
    if (cls === "rejected" && Core.tooEarly(view(), i)) { st.lock = false; st.msg = "Mobil menunggu kapal benar-benar sampai…"; rerender(); retryLater(i, Core.waitMs(view(), i)); return; }
    st.retry = { msg: failMsg(e), fn: () => deliverBox(i) }; st.inTruck = Math.max(0, st.inTruck - (cls === "rejected" ? 1 : 0)); finish(failMsg(e));
  }
}
function retryLater(i, ms) { clearTimeout(st.wait); st.wait = setTimeout(() => { if (!st.lock && atPort()) deliverBox(i); }, Math.min(15000, Math.max(1500, (ms || 0) + 400))); }
async function afterDeliver() {
  const left = Core.sailingBoxes(view()); st.lock = false;
  if (left.length) { st.msg = "Kotak diterima. Ambil kotak berikutnya."; rerender(); return; }
  st.msg = ""; const a = st.acc; st.acc = null; st.inTruck = 0; rerender();
  if (startLeave()) st.pendRes = a || null;   // mobil berangkat tepat sekali; panel hasil menyusul begitu mobil mulai jalan
  else if (a) showResult(a);
}
NW.port = { pose: truckPose, goalHint, setup, update, candidates, interact, busy, carrying, questDone, startLeave, truckState: () => ({ show: st.truck.show, x: st.truck.x, y: st.truck.y, leaving: !!st.leave, gone: st.gone, door: st.door, count: st.leaveCount }), drawCarry, mountTrip, dest, startTrip, depart, abortTrip, goHome, _st: st, get ready() { return st.ready; }, speedK: () => (st.carry || st.pick ? Core.CARRY_SPEED : 1), positions: { CRATE, TRUCK, LOAD_PT, DAMAR, SHED, BOARDPT, BOARD_SPOT, QUAY } };
})();
