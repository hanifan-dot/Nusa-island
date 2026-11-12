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
const TRUCK = { x: 21.1, y: 21.45 }, LOAD_PT = { x: 19.7, y: 20.65 };   // mobil pendingin; titik muat di belakang mobil (jalan dermaga)
const DAMAR = { x: 23.0, y: 21.2 }, SHED = { x: 22.6, y: 13.3 }, BOARDPT = { x: 12.3, y: 20.5 }, BOARD_SPOT = { x: 13.1, y: 20.45 };
const QUAY = { x0: 11.0, x1: 16.4, y0: 19.05, y1: 20.95 };
const T_PICK = 0.55, T_LOAD = 2.0;                                   // detik: angkat; muat (pintu buka → kotak masuk → pintu tutup)
const st = { ready: false, lock: false, msg: "", ops: null, carry: null, pick: null, load: null, door: 0, inTruck: 0, acc: null, res: null, retry: null, status: null, drawn: false, wait: 0, lastView: 0 };
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
    { kind: "pk_truck", ...TRUCK, big: 170 }, { kind: "pk_shed", ...SHED, big: 190 }, { kind: "pk_damar", ...DAMAR, big: 90 }, { kind: "pk_board", x: 17.0, y: 22.9, big: 90 }, { kind: "pk_ice", x: 19.6, y: 22.2, big: 60 });
  M.solids.push({ x0: TRUCK.x - 1.25, y0: TRUCK.y - 0.55, x1: TRUCK.x + 1.25, y1: TRUCK.y + 0.55 }, { x0: SHED.x - 1.8, y0: SHED.y - 1.3, x1: SHED.x + 1.8, y1: SHED.y + 1.3 }, { x: DAMAR.x, y: DAMAR.y, r: 0.3 }, { x: 17.0, y: 22.9, r: 0.25 }, { x: 19.6, y: 22.2, r: 0.3 });
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
function drawTruck(c, o, t, nt) {   // mobil pendingin Pak Damar: bak putih-biru, kabin di timur, pintu belakang di barat (menghadap dermaga)
  const x = TRUCK.x, y = TRUCK.y, z = LIFT() + 2.4;
  c.fillStyle = "rgba(8,36,56,.2)"; poly(c, [P(x - 1.35, y - 0.55, LIFT()), P(x + 1.45, y - 0.55, LIFT()), P(x + 1.45, y + 0.65, LIFT()), P(x - 1.35, y + 0.65, LIFT())], "rgba(8,36,56,.2)");
  for (const wx of [-0.75, 0.85]) for (const wy of [-0.5, 0.5]) { const w = P(x + wx, y + wy, z - 0.5); c.fillStyle = "#1f2428"; c.beginPath(); c.ellipse(w.x, w.y, 4.4, 4.4, 0, 0, 7); c.fill(); c.fillStyle = "#8a949a"; c.beginPath(); c.arc(w.x, w.y, 1.6, 0, 7); c.fill(); }
  box(c, x + 0.95, y, 0.4, 0.5, z, 15, ["#2a9d8f", "#23857a", "#1d6f66"]);                // kabin
  const T = box(c, x - 0.3, y, 0.95, 0.52, z, 22, ["#f4f8fa", "#dfe9ee", "#c9d9e0"]);   // bak pendingin
  const m = { x: (T[0].x + T[2].x) / 2, y: (T[0].y + T[2].y) / 2 }; c.save(); c.fillStyle = "#1d6f66"; c.font = "bold 6px system-ui"; c.textAlign = "center"; c.fillText("PAK DAMAR · SEGAR", m.x + 1, m.y + 8); c.restore();
  // pintu belakang (sisi barat, x = x-1.25): menutup = panel rapat; terbuka = panel bergeser ke samping + rongga gelap + kotak di dalam
  const dr = st.door, rx = x - 1.27, a = (dy, zz) => P(rx, y + dy, zz);
  const inner = [a(-0.46, z + 2), a(0.46, z + 2), a(0.46, z + 20), a(-0.46, z + 20)];
  poly(c, inner, dr > 0.05 ? "#1b2a30" : "#c9d9e0", "rgba(23,63,80,.6)");
  if (dr > 0.05) for (let k = 0; k < st.inTruck; k++) crateAt(c, x - 1.0 + k * 0.5, y - 0.1 + (k ? 0.12 : 0), z + 2.4, t, 0.8);
  const sw = 0.46 * (1 - dr * 0.85); poly(c, [a(0.46 - sw * 2, z + 2), a(0.46, z + 2), a(0.46, z + 20), a(0.46 - sw * 2, z + 20)], "#e6eef2", "rgba(23,63,80,.6)");
  c.strokeStyle = "#7a8a92"; c.lineWidth = 1; const hd = a(0.4 - sw * 1.2, z + 11); c.beginPath(); c.arc(hd.x, hd.y, 1.3, 0, 7); c.stroke();
  if (nt) { c.fillStyle = "rgba(255,240,200,.5)"; const l = P(x + 1.4, y, z + 8); c.beginPath(); c.arc(l.x, l.y, 3, 0, 7); c.fill(); }
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
const DAMAR_CH = { x: DAMAR.x, y: DAMAR.y, dir: 3, walk: 0, moving: false, sit: false, rod: 0, seed: 3.3, hold: null, rodSpec: null, style: { shirt: "#2a9d8f", pants: "#2e2a26", skin: "#b77b52", hair: "#1f1612", hat: "cap", hatCol: "#e9e4d8", collar: "#f3e7c9", apron: "#f3e7c9" } };
function drawDamar(c, o, t) {
  NW.drawCharacter(c, DAMAR_CH, t); const pb = P(DAMAR.x, DAMAR.y, LIFT());
  if (NW.look && NW.look.drawLabel) NW.look.drawLabel(c, { name: "Pak Damar", title: "Pengiriman Segar" }, pb.x, pb.y, 1.0 / ((NW.world && NW.world.zoom) || 1), 0);
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
  out.push({ id: "pk:damar", x: DAMAR.x, y: DAMAR.y + 0.9, r: 1.3, icon: "💬", label: "Pak Damar", pk: { k: "damar" }, bz: 56, pri: 0.3 });
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
  const want = st.load && (now() - st.load.t0) < 1.55 ? 1 : 0; st.door += (want - st.door) * (1 - Math.exp(-dt * 9));
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
  else if (here && s === "port") html = st.carry ? "<b>📦 Membawa kotak</b><span>Bawa ke mobil Pak Damar (🚚).</span>" : `<b>🚚 Pelabuhan Kota</b><span>${st.msg ? esc(st.msg) : "Ambil kotak di dermaga lalu masukkan ke mobil."}</span>${capHint()}`;
  else if (here && st.msg) html = `<b>${esc(st.msg)}</b>`;
  if (html === lastHud) return; lastHud = html; st.status.innerHTML = html; st.status.classList.toggle("hidden", !html);
  const rt = $("pkRetry"); if (rt) rt.addEventListener("click", () => { const f = st.retry && st.retry.fn; st.retry = null; lastHud = ""; if (f) f(); });
  const dn = $("pkDown"); if (dn) dn.addEventListener("click", () => { rb() && rb().disembark && rb().disembark(BOARD_SPOT); lastHud = ""; });
}
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
    const cls = Core.classifyErr(e), txt = String((e && e.message) || ""), early = /belum sampai/i.test(txt);
    if (cls === "rejected") st.ops.done("deliver", i);
    st.carry = null; await resync();
    if (early) { st.lock = false; st.msg = "Mobil menunggu kapal benar-benar sampai…"; rerender(); retryLater(i); return; }
    st.retry = { msg: failMsg(e), fn: () => deliverBox(i) }; st.inTruck = Math.max(0, st.inTruck - (cls === "rejected" ? 1 : 0)); finish(failMsg(e));
  }
}
function retryLater(i) { clearTimeout(st.wait); st.wait = setTimeout(() => { if (!st.lock && atPort()) deliverBox(i); }, 4000); }
async function afterDeliver() {
  const left = Core.sailingBoxes(view()); st.lock = false;
  if (left.length) { st.msg = "Kotak diterima. Ambil kotak berikutnya."; rerender(); return; }
  st.msg = ""; const a = st.acc; st.acc = null; st.inTruck = 0; rerender(); if (a) showResult(a);
}
NW.port = { setup, update, candidates, interact, busy, carrying, drawCarry, mountTrip, dest, startTrip, depart, abortTrip, goHome, _st: st, get ready() { return st.ready; }, speedK: () => (st.carry || st.pick ? Core.CARRY_SPEED : 1), positions: { CRATE, TRUCK, LOAD_PT, DAMAR, SHED, BOARDPT, BOARD_SPOT, QUAY } };
})();
