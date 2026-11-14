// NUSA ISLAND — Visual Kota Nusa: gambar 2.5D (bangunan, kendaraan, properti). Hanya garis & poligon datar (tanpa gambar eksternal, tanpa merek asli).
// Dimuat HANYA bila NUSA_KOTA=true. Dipakai oleh kota/client.js. Tidak menyentuh keadaan game / server.
(() => {
"use strict";
const NW = window.NW, Core = window.NusaKotaCore;
if (!NW || !Core || !NW.P) return;
const P = NW.P, LIFT = NW.LIFT, shade = NW.shade, mix = NW.mix, poly = NW.poly, FH = Core.FH;
const S = () => (NW.kota && NW.kota.S) || { hour: 12, night: 0, tw: 0, ph: Core.lightPhase(0), lamps: false };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hv = (a, b, c) => Core.hash(a * 131 + b * 17 + c * 7, 91);
const sid = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h & 0xffff; };
const fillPoly = (c, pts, col, stroke) => { poly(c, pts); c.fillStyle = col; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); } };
const GLASS_DAY = "#8cbcd0", GLASS_NIGHT = "#2c4660", LIT = "#ffe39a";
// balok sejajar sumbu: cols = [atas, selatan(y1), timur(x1)]
function prism(c, x0, y0, x1, y1, z0, z1, cols, line) {
  const a = (x, y, z) => P(x, y, LIFT + z), ln = line || "rgba(23,63,80,.45)";
  fillPoly(c, [a(x0, y1, z0), a(x1, y1, z0), a(x1, y1, z1), a(x0, y1, z1)], cols[1], ln);
  fillPoly(c, [a(x1, y1, z0), a(x1, y0, z0), a(x1, y0, z1), a(x1, y1, z1)], cols[2], ln);
  fillPoly(c, [a(x0, y0, z1), a(x1, y0, z1), a(x1, y1, z1), a(x0, y1, z1)], cols[0], ln);
}
const tri = (col) => [shade(col, 0.12), col, shade(col, -0.16)];
// papan di bidang selatan (sepanjang x): teks miring mengikuti garis isometrik
function signS(c, x, y, z, w, h, txt, bg, fg, size) {
  const a = (xx, zz) => P(xx, y, LIFT + zz);
  fillPoly(c, [a(x - w / 2, z), a(x + w / 2, z), a(x + w / 2, z + h), a(x - w / 2, z + h)], bg, "rgba(23,63,80,.55)");
  const p = a(x, z + h / 2); c.save(); c.translate(p.x, p.y); c.transform(1, 0.5, 0, 1, 0, 0);
  c.fillStyle = fg; c.font = `800 ${size || 7.5}px system-ui, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 0, 0.5); c.restore();
}
function shadowQuad(c, x0, y0, x1, y1, h, night) {
  const k = clamp(1 - night * 0.8, 0.2, 1), d = h / 70 + 0.15;
  c.fillStyle = `rgba(20,40,30,${(0.2 * k).toFixed(3)})`; poly(c, [P(x1, y0, LIFT), P(x1 + d, y0 + d * 0.3, LIFT), P(x1 + d, y1 + d, LIFT), P(x0 + d * 0.3, y1 + d, LIFT), P(x0, y1, LIFT), P(x1, y1, LIFT)]); c.fill();
}
// ---------- jendela ----------
function windowsS(c, b, p, night, litP) {
  const lit = [], dark = [], F = p.floors, w = p.type === "kantor" ? 0.62 : 0.55, gap = p.type === "kantor" ? 0.95 : 1.0;
  for (let f = 0; f < F; f++) {
    if (f === 0 && (p.shop || p.type === "gudang" || p.type === "bengkel" || p.type === "balai")) continue;
    const z0 = f * FH + (p.type === "kantor" ? 7 : 9), z1 = z0 + (p.type === "kantor" ? 14 : 11);
    for (let u = b.x0 + 0.3, k = 0; u + w <= b.x1 - 0.2; u += gap, k++) {
      if (p.door && f === 0 && Math.abs(u + w / 2 - p.door.x) < 0.7) continue;
      const q = [P(u, b.y1, LIFT + z0), P(u + w, b.y1, LIFT + z0), P(u + w, b.y1, LIFT + z1), P(u, b.y1, LIFT + z1)];
      ((night > 0.1 && hv(sid(p.id), f * 7 + b.ci, k) < litP) ? lit : dark).push(q);
    }
  }
  return [lit, dark];
}
function windowsE(c, b, p, night, litP) {
  const lit = [], dark = [], F = p.floors, w = 0.55;
  for (let f = 0; f < F; f++) {
    if (f === 0 && (p.shop || p.type === "gudang" || p.type === "bengkel" || p.type === "balai")) continue;
    const z0 = f * FH + (p.type === "kantor" ? 7 : 9), z1 = z0 + (p.type === "kantor" ? 14 : 11);
    for (let u = b.y0 + 0.3, k = 0; u + w <= b.y1 - 0.2; u += 1.0, k++) {
      const q = [P(b.x1, u, LIFT + z0), P(b.x1, u + w, LIFT + z0), P(b.x1, u + w, LIFT + z1), P(b.x1, u, LIFT + z1)];
      ((night > 0.1 && hv(sid(p.id) + 5, f * 7 + b.ci, k) < litP) ? lit : dark).push(q);
    }
  }
  return [lit, dark];
}
function drawWins(c, set, night, e) {
  const [lit, dark] = set, day = e ? shade(GLASS_DAY, -0.2) : GLASS_DAY, nt = e ? shade(GLASS_NIGHT, -0.15) : GLASS_NIGHT;
  if (dark.length) { c.fillStyle = mix(day, nt, clamp(night * 1.3, 0, 1)); c.beginPath(); for (const q of dark) { c.moveTo(q[0].x, q[0].y); for (let i = 1; i < 4; i++) c.lineTo(q[i].x, q[i].y); c.closePath(); } c.fill(); }
  if (lit.length) { c.fillStyle = LIT; c.beginPath(); for (const q of lit) { c.moveTo(q[0].x, q[0].y); for (let i = 1; i < 4; i++) c.lineTo(q[i].x, q[i].y); c.closePath(); } c.fill(); }
}
const litProb = (p, hour) => { const base = p.id === "hotel" || p.id === "apartemen" ? 0.78 : p.type === "kantor" ? 0.55 : 0.6; return hour >= 23 || hour < 4.5 ? base * 0.4 : base; };
const isOpen = (p, hour) => !p.shop || p.closeAt === 0 ? p.closeAt === 0 && p.shop ? false : true : hour >= 6 && hour < p.closeAt;
// ---------- sel bangunan ----------
function cell(c, b, t, night) {
  const p = b.parent, st = S(); if (p.type === "rumah") return houseCell(c, b, t, night);
  if (p.type === "arch") return archDraw(c, b, t, night);
  const h = b.h, Z = (z) => LIFT + z, litP = litProb(p, st.hour);
  shadowQuad(c, b.x0, b.y0, b.x1, b.y1, h, night);
  const wall = p.wall;
  if (b.front) {
    fillPoly(c, [P(b.x0, b.y1, Z(0)), P(b.x1, b.y1, Z(0)), P(b.x1, b.y1, Z(h)), P(b.x0, b.y1, Z(h))], wall);
    fillPoly(c, [P(b.x0, b.y1, Z(0)), P(b.x1, b.y1, Z(0)), P(b.x1, b.y1, Z(5)), P(b.x0, b.y1, Z(5))], shade(wall, -0.26));
  }
  if (b.right) {
    fillPoly(c, [P(b.x1, b.y1, Z(0)), P(b.x1, b.y0, Z(0)), P(b.x1, b.y0, Z(h)), P(b.x1, b.y1, Z(h))], shade(wall, -0.2));
    fillPoly(c, [P(b.x1, b.y1, Z(0)), P(b.x1, b.y0, Z(0)), P(b.x1, b.y0, Z(5)), P(b.x1, b.y1, Z(5))], shade(wall, -0.42));
  }
  // garis lantai
  c.strokeStyle = "rgba(0,0,0,.13)"; c.lineWidth = 1; c.beginPath();
  for (let f = 1; f < p.floors; f++) { const z = f * FH + 2; if (b.front) { const a = P(b.x0, b.y1, Z(z)), d = P(b.x1, b.y1, Z(z)); c.moveTo(a.x, a.y); c.lineTo(d.x, d.y); } if (b.right) { const a = P(b.x1, b.y1, Z(z)), d = P(b.x1, b.y0, Z(z)); c.moveTo(a.x, a.y); c.lineTo(d.x, d.y); } }
  c.stroke();
  if (b.front) drawWins(c, windowsS(c, b, p, night, litP), night, false);
  if (b.right) drawWins(c, windowsE(c, b, p, night, litP), night, true);
  facade(c, b, p, t, night, st);
  // atap datar + bibir
  const roof = mix(p.roof, "#c8ccd0", 0.55);
  fillPoly(c, [P(b.x0, b.y0, Z(h)), P(b.x1, b.y0, Z(h)), P(b.x1, b.y1, Z(h)), P(b.x0, b.y1, Z(h))], roof, "rgba(23,63,80,.4)");
  if (b.front) fillPoly(c, [P(b.x0, b.y1, Z(h)), P(b.x1, b.y1, Z(h)), P(b.x1, b.y1, Z(h + 3)), P(b.x0, b.y1, Z(h + 3))], shade(p.roof, -0.05));
  if (b.right) fillPoly(c, [P(b.x1, b.y1, Z(h)), P(b.x1, b.y0, Z(h)), P(b.x1, b.y0, Z(h + 3)), P(b.x1, b.y1, Z(h + 3))], shade(p.roof, -0.25));
  rooftop(c, b, p, t, night, st);
}
function facade(c, b, p, t, night, st) {
  if (!b.front) return;
  const d = p.door, hasDoor = d && d.x >= b.x0 - 0.01 && d.x <= b.x1 + 0.01, open = isOpen(p, st.hour), Z = (z) => LIFT + z;
  if (hasDoor) {
    const dx = d.x, y = b.y1;
    if (p.extra === "roller") {   // pintu gulung gudang: terbuka siang hari (isi gelap + peti), tertutup malam
      const w = 1.0, up = open && night < 0.5;
      fillPoly(c, [P(dx - w, y, Z(0)), P(dx + w, y, Z(0)), P(dx + w, y, Z(26)), P(dx - w, y, Z(26))], up ? "#2a2f33" : "#9aa3a8");
      if (up) { prism(c, dx - 0.7, y - 0.5, dx - 0.2, y - 0.05, 0, 9, tri("#c9a46a")); prism(c, dx + 0.15, y - 0.5, dx + 0.65, y - 0.05, 0, 13, tri("#e0e6ea")); }
      else { c.strokeStyle = "rgba(60,70,76,.5)"; c.lineWidth = 1; c.beginPath(); for (let z = 3; z < 26; z += 3) { const a = P(dx - w, y, Z(z)), e = P(dx + w, y, Z(z)); c.moveTo(a.x, a.y); c.lineTo(e.x, e.y); } c.stroke(); }
      signS(c, dx, y, 30, 2.8, 9, p.sign, "#173f50", "#e0b84c", 7);
    } else if (p.extra === "garage") {   // bengkel: pintu garasi terbuka, dongkrak & ban
      const w = 1.3; fillPoly(c, [P(dx - w, y, Z(0)), P(dx + w, y, Z(0)), P(dx + w, y, Z(22)), P(dx - w, y, Z(22))], open && night < 0.5 ? "#2a2522" : "#8a8f93");
      if (open && night < 0.5) { c.fillStyle = "#e0b84c"; const a = P(dx - 0.5, y - 0.05, Z(10)), e = P(dx + 0.5, y - 0.05, Z(10)); c.fillRect(a.x, a.y - 2, e.x - a.x, 3); }
      signS(c, dx, y, 27, 3.0, 9, p.sign, "#2b3d4a", "#ffd166", 7);
      awning(c, dx - 1.5, dx + 1.5, y, 24, "#c9553b", "#f3e7c9", 0.45);
    } else if (p.shop || p.extra === "phone") {
      const w = Math.min((b.x1 - b.x0) * 0.82, 2.6) / 2, lit = (night > 0.15 && open);
      fillPoly(c, [P(dx - w, y, Z(2)), P(dx + w, y, Z(2)), P(dx + w, y, Z(21)), P(dx - w, y, Z(21))], open ? (lit ? LIT : mix(GLASS_DAY, "#fff6d8", 0.35)) : "#8d949a");
      if (!open) { c.strokeStyle = "rgba(60,70,76,.55)"; c.lineWidth = 1; c.beginPath(); for (let z = 4; z < 21; z += 3) { const a = P(dx - w, y, Z(z)), e = P(dx + w, y, Z(z)); c.moveTo(a.x, a.y); c.lineTo(e.x, e.y); } c.stroke(); }
      fillPoly(c, [P(dx - 0.3, y, Z(0)), P(dx + 0.3, y, Z(0)), P(dx + 0.3, y, Z(18)), P(dx - 0.3, y, Z(18))], open ? "#6b4a2c" : "#6e747a");
      const stripe = p.extra === "phone" ? ["#2b6f97", "#e6eef6"] : p.accent ? [["#c9553b", "#2f7a8c", "#e0b84c", "#6a8f3a"][sid(p.id) % 4], "#f3e7c9"] : ["#c9553b", "#f3e7c9"];
      awning(c, dx - w - 0.1, dx + w + 0.1, y, 25, stripe[0], stripe[1], 0.55);
      if (p.sign) signS(c, dx, y, Math.min(h(b) - 16, 31), Math.min(2 * w + 0.4, 3.3), 9, p.sign, p.extra === "phone" ? "#173f50" : "#fff6d8", p.extra === "phone" ? "#7fd3ff" : "#7a3b25", p.sign.length > 12 ? 6 : 7.5);
      if (p.extra === "phone") { signS(c, dx, y, 11, 1.7, 5.5, "SEGERA HADIR", "#d84a3a", "#fff", 5.2); }
      else if (!open) signS(c, dx + w - 0.45, y, 3, 0.9, 4.5, "TUTUP", "#f3e7c9", "#a3453a", 4.5);
    } else if (p.type === "balai") {
      for (let k = 0; k < 4; k++) { const xx = b.x0 + (b.x1 - b.x0) * (0.12 + k * 0.25); if (xx > b.x0 && xx < b.x1) prism(c, xx - 0.14, b.y1 - 0.12, xx + 0.14, b.y1 + 0.16, 0, 34, ["#f4eee0", "#efe7d3", "#cfc5ad"]); }
      if (dx > b.x0 && dx < b.x1) fillPoly(c, [P(dx - 0.5, y, Z(0)), P(dx + 0.5, y, Z(0)), P(dx + 0.5, y, Z(24)), P(dx - 0.5, y, Z(24))], "#5a3a22");
    } else if (p.type === "kantor") {
      const w = 0.95; fillPoly(c, [P(dx - w, y, Z(0)), P(dx + w, y, Z(0)), P(dx + w, y, Z(22)), P(dx - w, y, Z(22))], night > 0.2 ? LIT : mix(GLASS_DAY, "#ffffff", 0.2), "rgba(23,63,80,.6)");
      fillPoly(c, [P(dx, y, Z(0)), P(dx, y, Z(0)), P(dx, y, Z(22)), P(dx, y, Z(22))], "#000");
      prism(c, dx - 1.1, y - 0.02, dx + 1.1, y + 0.55, 24, 27, ["#c9cdd2", "#9aa3a8", "#848c91"]);   // kanopi
    } else if (p.type === "pos") { fillPoly(c, [P(dx - 0.3, y, Z(0)), P(dx + 0.3, y, Z(0)), P(dx + 0.3, y, Z(16)), P(dx - 0.3, y, Z(16))], "#6b4a2c"); }
  }
  // papan nama besar untuk gedung tinggi: di dekat atap pada sel pintu
  if (hasDoor && p.sign && (p.type === "kantor" || p.type === "balai")) signS(c, d.x, b.y1, (p.type === "balai" ? b.h - 14 : 29), p.type === "balai" ? 3.6 : 3.0, 9, p.sign, "#173f50", "#fff6d8", p.sign.length > 11 ? 6 : 7.5);
}
const h = (b) => b.h;
function awning(c, x0, x1, y, z, ca, cb, out) {
  const n = Math.max(2, Math.round((x1 - x0) / 0.42)), dx = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const a = x0 + i * dx, e = a + dx; fillPoly(c, [P(a, y, LIFT + z), P(e, y, LIFT + z), P(e, y + out, LIFT + z - 5), P(a, y + out, LIFT + z - 5)], i % 2 ? cb : ca); }
}
function rooftop(c, b, p, t, night, st) {
  const Z = (z) => LIFT + b.h + z, r = hv(sid(p.id), b.ci, 3);
  if (p.type === "gudang" || p.type === "kantor" || p.type === "bengkel") {
    if (r < 0.55) prism(c, b.x0 + 0.5, b.y0 + 0.6, b.x0 + 1.2, b.y0 + 1.2, b.h + 3, b.h + 9, tri("#aeb6bc"));   // unit AC
  }
  if (b.center) {
    if (p.extra === "tower" || p.extra === "hotel") {
      const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2, a = P(cx, cy, Z(3)), blink = night > 0.2 && Math.sin(t * 3) > 0;
      c.strokeStyle = "#5a636a"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x, a.y - 34); c.stroke();
      c.fillStyle = blink ? "#ff4a3a" : "#7a2a24"; c.beginPath(); c.arc(a.x, a.y - 35, 2.2, 0, 7); c.fill();
      if (p.extra === "hotel") { const hs = hv(1, 2, 3); signS(c, cx, b.y1 - 0.15, b.h + 3, 3.4, 9, "HOTEL BAHARI", "#8a2a2a", "#ffd9a0", 6.2); }
    }
    if (p.extra === "balai") {
      const cx = (p.x0 + p.x1) / 2; prism(c, cx - 0.7, p.y0 + 1.3, cx + 0.7, p.y0 + 2.5, b.h, b.h + 26, ["#e8dcc0", "#efe7d3", "#cfc5ad"]);
      const k = P(cx, p.y0 + 2.5, LIFT + b.h + 16); c.fillStyle = "#fff"; c.beginPath(); c.arc(k.x, k.y, 3.6, 0, 7); c.fill(); c.strokeStyle = "#5a3a22"; c.lineWidth = 1; c.stroke();
      const th = (st.hour % 12) / 12 * 6.283, tm = (st.hour % 1) * 6.283; c.beginPath(); c.moveTo(k.x, k.y); c.lineTo(k.x + Math.sin(th) * 2, k.y - Math.cos(th) * 2); c.moveTo(k.x, k.y); c.lineTo(k.x + Math.sin(tm) * 3, k.y - Math.cos(tm) * 3); c.stroke();
      fillPoly(c, [P(cx - 0.7, p.y0 + 1.3, Z(26)), P(cx + 0.7, p.y0 + 1.3, Z(26)), P(cx + 0.7, p.y0 + 2.5, Z(26)), P(cx - 0.7, p.y0 + 2.5, Z(26))], "#a3453a");
    }
  }
}
// ---------- rumah warga ----------
function houseCell(c, b, t, night) {
  const p = b.parent, st = S(), h = b.h, Z = (z) => LIFT + z, wall = p.wall, i = sid(p.id);
  shadowQuad(c, b.x0, b.y0, b.x1, b.y1, h, night);
  fillPoly(c, [P(b.x0, b.y1, Z(0)), P(b.x1, b.y1, Z(0)), P(b.x1, b.y1, Z(h)), P(b.x0, b.y1, Z(h))], wall);
  fillPoly(c, [P(b.x1, b.y1, Z(0)), P(b.x1, b.y0, Z(0)), P(b.x1, b.y0, Z(h)), P(b.x1, b.y1, Z(h))], shade(wall, -0.2));
  fillPoly(c, [P(b.x0, b.y1, Z(0)), P(b.x1, b.y1, Z(0)), P(b.x1, b.y1, Z(4)), P(b.x0, b.y1, Z(4))], shade(wall, -0.25));
  const dx = (b.x0 + b.x1) / 2 + (hv(i, 1, 1) - 0.5) * 0.3, lit = night > 0.15 && hv(i, 2, 2) < 0.8, W = (u0, u1, z0, z1, y) => [P(u0, y, Z(z0)), P(u1, y, Z(z0)), P(u1, y, Z(z1)), P(u0, y, Z(z1))];
  const gl = night > 0.1 ? (lit ? LIT : GLASS_NIGHT) : GLASS_DAY;
  fillPoly(c, [P(dx - 0.3, b.y1, Z(0)), P(dx + 0.3, b.y1, Z(0)), P(dx + 0.3, b.y1, Z(19)), P(dx - 0.3, b.y1, Z(19))], ["#6b4a2c", "#2f5d78", "#a3453a"][i % 3]);
  for (const u of [b.x0 + 0.45, b.x1 - 1.0]) if (Math.abs(u + 0.27 - dx) > 0.6) fillPoly(c, W(u, u + 0.55, 10, 22, b.y1), gl, "rgba(23,63,80,.5)");
  if (p.floors > 1) for (const u of [b.x0 + 0.5, dx - 0.27, b.x1 - 1.0]) fillPoly(c, W(u, u + 0.55, 40, 52, b.y1), night > 0.1 && hv(i, 3, u * 3) < 0.6 ? LIT : gl, "rgba(23,63,80,.5)");
  if (p.floors > 1) { c.strokeStyle = "rgba(0,0,0,.14)"; c.lineWidth = 1; const a = P(b.x0, b.y1, Z(30)), e = P(b.x1, b.y1, Z(30)); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(e.x, e.y); c.stroke(); }
  if (p.porch) { prism(c, dx - 0.75, b.y1 + 0.05, dx + 0.75, b.y1 + 0.7, 0, 3, ["#c9a46a", "#a8743f", "#7a5230"]); for (const u of [dx - 0.7, dx + 0.7]) prism(c, u - 0.05, b.y1 + 0.55, u + 0.05, b.y1 + 0.65, 3, 24, ["#8a5a3c", "#7a4a2c", "#5a3a20"]); fillPoly(c, [P(dx - 0.85, b.y1 - 0.02, Z(26)), P(dx + 0.85, b.y1 - 0.02, Z(26)), P(dx + 0.85, b.y1 + 0.78, Z(22)), P(dx - 0.85, b.y1 + 0.78, Z(22))], p.roof); }
  // atap: limas (hip) atau pelana
  const ov = 0.22, x0 = b.x0 - ov, x1 = b.x1 + ov, y0 = b.y0 - ov, y1 = b.y1 + ov, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rh = 17 + (hv(i, 5, 5) * 7);
  if (p.hip && hv(i, 4, 4) < 0.5) {
    const ap = P(cx, cy, Z(h + rh));
    fillPoly(c, [P(x0, y1, Z(h)), P(x1, y1, Z(h)), ap], p.roof, "rgba(23,63,80,.4)");
    fillPoly(c, [P(x1, y1, Z(h)), P(x1, y0, Z(h)), ap], shade(p.roof, -0.2), "rgba(23,63,80,.4)");
  } else {
    const r0 = P(x0, cy, Z(h + rh)), r1 = P(x1, cy, Z(h + rh));
    fillPoly(c, [P(x0, y1, Z(h)), P(x1, y1, Z(h)), r1, r0], p.roof, "rgba(23,63,80,.4)");
    fillPoly(c, [P(x1, y1, Z(h)), P(x1, y0, Z(h)), r1], shade(p.roof, -0.2), "rgba(23,63,80,.4)");
    c.strokeStyle = shade(p.roof, -0.3); c.lineWidth = 1.4; c.beginPath(); c.moveTo(r0.x, r0.y); c.lineTo(r1.x, r1.y); c.stroke();
  }
}
// ---------- gerbang pasar (lengkung) ----------
function archDraw(c, b, t, night) {
  const p = b.parent, Z = (z) => LIFT + z;
  for (const x of [58.4, 60.6]) prism(c, x - 0.2, 18.3, x + 0.2, 18.7, 0, 50, ["#e8c05a", "#d9a93a", "#b5832a"]);
  prism(c, 58.2, 18.2, 60.8, 18.8, 44, 56, ["#e8c05a", "#d9a93a", "#b5832a"]);
  signS(c, 59.5, 18.82, 45, 2.3, 9.5, "PASAR KOTA NUSA", "#a3453a", "#fff0c4", 5.6);
  // bendera segitiga berayun
  const a = P(58.4, 18.82, Z(50)), e = P(60.6, 18.82, Z(50)); c.strokeStyle = "#5a3a20"; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo((a.x + e.x) / 2, a.y + 10 + Math.sin(t * 2) * 1.5, e.x, e.y); c.stroke();
  for (let i = 1; i < 6; i++) { const u = i / 6, x = a.x + (e.x - a.x) * u, y = a.y + (e.y - a.y) * u + Math.sin(u * 3.14) * 9 + Math.sin(t * 2) * 1.2; c.fillStyle = ["#d84a3a", "#e0b84c", "#2f7a8c"][i % 3]; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + 3, y); c.lineTo(x, y + 6); c.fill(); }
}
// ---------- kendaraan ----------
const VCOL = ["#d9534f", "#2f7a8c", "#e0b84c", "#5a8f3a", "#eef0f2", "#6a4a8a", "#4a5058", "#e07a3a"];
function vbox(c, v, l0, l1, w0, w1, z0, z1, col, top) {   // balok berorientasi: l ke depan (fx,fy), w ke kanan (-fy,fx)
  const fx = v.fx, fy = v.fy, rx = -fy, ry = fx, Q = (l, w, z) => P(v.x + fx * l + rx * w, v.y + fy * l + ry * w, LIFT + z);
  const faces = [[fx, fy, [Q(l1, w0, z0), Q(l1, w1, z0), Q(l1, w1, z1), Q(l1, w0, z1)]], [-fx, -fy, [Q(l0, w1, z0), Q(l0, w0, z0), Q(l0, w0, z1), Q(l0, w1, z1)]], [rx, ry, [Q(l0, w1, z0), Q(l1, w1, z0), Q(l1, w1, z1), Q(l0, w1, z1)]], [-rx, -ry, [Q(l1, w0, z0), Q(l0, w0, z0), Q(l0, w0, z1), Q(l1, w0, z1)]]];
  for (const [nx, ny, q] of faces) { if (nx + ny <= 0.04) continue; fillPoly(c, q, shade(col, -0.06 + (ny - nx) * 0.1), "rgba(23,63,80,.35)"); }
  fillPoly(c, [Q(l0, w0, z1), Q(l1, w0, z1), Q(l1, w1, z1), Q(l0, w1, z1)], top || shade(col, 0.14), "rgba(23,63,80,.35)");
}
function wheels(c, v, ls, w) {
  for (const l of ls) for (const s of [-1, 1]) { const fx = v.fx, fy = v.fy, q = P(v.x + fx * l + -fy * w * s, v.y + fy * l + fx * w * s, LIFT + 2.2); if (-fy * s + fx * s < -0.2 && false) continue; c.fillStyle = "#23282c"; c.beginPath(); c.ellipse(q.x, q.y, 3.4, 3.4, 0, 0, 7); c.fill(); c.fillStyle = "#8d949a"; c.beginPath(); c.arc(q.x, q.y, 1.2, 0, 7); c.fill(); }
}
function lamps(c, v, lf, w, night, dim) {   // lampu depan (menyala sore/malam) & lampu rem
  const fx = v.fx, fy = v.fy, st = S();
  for (const s of [-1, 1]) {
    const q = P(v.x + fx * lf + -fy * w * s, v.y + fy * lf + fx * w * s, LIFT + 7);
    if (night > 0.12 || st.hour < 6.5) { c.fillStyle = "#fff6c0"; c.beginPath(); c.arc(q.x, q.y, 1.8, 0, 7); c.fill(); }
    const r = P(v.x - fx * lf + -fy * w * s, v.y - fy * lf + fx * w * s, LIFT + 7);
    c.fillStyle = v.braking ? "#ff3b2e" : "#8a2a24"; c.beginPath(); c.arc(r.x, r.y, 1.5, 0, 7); c.fill();
  }
}
function drawVehicle(c, v, t, night) {
  const type = v.type, col = VCOL[(v.col | 0) % VCOL.length], fx = v.fx, fy = v.fy;
  const Lh = v.L / 2, Wh = v.W / 2;
  // bayangan
  const sp = (l, w) => P(v.x + fx * l - fy * w + 0.1, v.y + fy * l + fx * w + 0.1, LIFT);
  c.fillStyle = `rgba(15,35,30,${(0.26 * (1 - night * 0.6)).toFixed(3)})`; poly(c, [sp(-Lh, -Wh), sp(Lh, -Wh), sp(Lh, Wh), sp(-Lh, Wh)]); c.fill();
  if (type === "motor") return drawMotor(c, v, t, night);
  const ls = [-Lh * 0.62, Lh * 0.58];
  if (type === "mobil") {
    wheels(c, v, ls, Wh); vbox(c, v, -Lh, Lh, -Wh, Wh, 2.5, 8.5, col); vbox(c, v, -Lh * 0.42, Lh * 0.34, -Wh * 0.86, Wh * 0.86, 8.5, 14.5, "#9fcbe0", shade(col, 0.1));
    lamps(c, v, Lh, Wh * 0.7, night); return;
  }
  const cab = 0.42 * 1.0, cabL = Lh * 0.64;   // kabin di depan
  wheels(c, v, [-Lh * 0.7, -Lh * 0.2, Lh * 0.62], Wh);
  vbox(c, v, cabL, Lh, -Wh * 0.95, Wh * 0.95, 2.5, 12, col === "#eef0f2" ? "#d9534f" : col); vbox(c, v, cabL + 0.06, Lh - 0.02, -Wh * 0.8, Wh * 0.8, 8, 12, "#9fcbe0", "#b9dbe8");
  if (type === "boks") vbox(c, v, -Lh, cabL - 0.05, -Wh, Wh, 3, 20, "#e8edf0");
  else if (type === "pendingin") { vbox(c, v, -Lh, cabL - 0.05, -Wh, Wh, 3, 20, "#f4f8fa"); vbox(c, v, cabL - 0.3, cabL - 0.05, -Wh * 0.5, Wh * 0.5, 20, 23, "#9aa6ad"); vbox(c, v, -Lh, cabL - 0.05, Wh - 0.01, Wh + 0.01, 7, 11, "#2b8fc0"); }
  else if (type === "tangki") { vbox(c, v, -Lh, cabL - 0.05, -Wh * 0.92, Wh * 0.92, 3, 6, "#4a5058"); vbox(c, v, -Lh + 0.05, cabL - 0.1, -Wh * 0.85, Wh * 0.85, 6, 17, "#c9d0d6", "#e8eef2"); vbox(c, v, -Lh * 0.2, -Lh * 0.1, -Wh * 0.5, Wh * 0.5, 17, 19, "#9aa3a8"); }
  else if (type === "sawit") { vbox(c, v, -Lh, cabL - 0.05, -Wh, Wh, 3, 5, "#5a4a3a"); vbox(c, v, -Lh, -Lh + 0.06, -Wh, Wh, 5, 11, "#7a5a3a"); vbox(c, v, cabL - 0.11, cabL - 0.05, -Wh, Wh, 5, 11, "#7a5a3a"); for (let k = 0; k < 5; k++) { const l = -Lh * 0.85 + k * (cabL + Lh) / 5.4, q = P(v.x + fx * l + -fy * ((k % 2) - 0.5) * 0.3, v.y + fy * l + fx * ((k % 2) - 0.5) * 0.3, LIFT + 9 + (k % 2)); c.fillStyle = k % 2 ? "#d9722a" : "#b8481f"; c.beginPath(); c.ellipse(q.x, q.y, 3.6, 3, 0, 0, 7); c.fill(); } }
  else if (type === "angkutmotor") { vbox(c, v, -Lh, cabL - 0.05, -Wh, Wh, 3, 5, "#4a5058"); for (let k = 0; k < 3; k++) { const l = -Lh * 0.7 + k * 0.52, q = P(v.x + fx * l, v.y + fy * l, LIFT + 5); vbox(c, { x: v.x, y: v.y, fx, fy }, l - 0.2, l + 0.2, -0.1, 0.1, 5, 12, ["#d9534f", "#2f7a8c", "#e0b84c"][k]); void q; } }
  lamps(c, v, Lh, Wh * 0.65, night);
}
function drawMotor(c, v, t, night) {
  const fx = v.fx, fy = v.fy, rx = -fy, ry = fx;
  wheels(c, { x: v.x, y: v.y, fx, fy }, [-0.28, 0.28], 0.01);
  vbox(c, v, -0.34, 0.3, -0.07, 0.07, 3, 7, ["#d9534f", "#2f7a8c", "#4a5058", "#e0b84c"][(v.col | 0) % 4]);
  const b = P(v.x - fx * 0.05, v.y - fy * 0.05, LIFT + 7), rider = ["#3d5a6c", "#c9553b", "#5a7d4a", "#e0b84c"][(v.col | 0) % 4];
  c.fillStyle = rider; c.fillRect(b.x - 3.5, b.y - 11, 7, 11); c.fillStyle = "#c68b5e"; c.beginPath(); c.arc(b.x, b.y - 14, 3.8, 0, 7); c.fill(); c.fillStyle = "#e8e8e8"; c.beginPath(); c.arc(b.x, b.y - 15, 4, Math.PI, 0); c.fill();
  lamps(c, v, 0.32, 0.03, night); void rx; void ry;
}
// sepeda (tanpa pengendara; pengendara = NPC yang digambar setelahnya)
function drawBike(c, x, y, fx, fy, t, ph) {
  const rx = -fy, ry = fx, Q = (l, z) => P(x + fx * l, y + fy * l, LIFT + z), a = Q(-0.3, 4), b = Q(0.3, 4), r = 4.2;
  c.strokeStyle = "#23282c"; c.lineWidth = 1.5; for (const q of [a, b]) { c.beginPath(); c.ellipse(q.x, q.y, r, r * (Math.abs(fx - fy) * 0.5 + 0.5), 0, 0, 7); c.stroke(); }
  c.strokeStyle = "#d9534f"; c.lineWidth = 2; const m = Q(0.0, 9), h = Q(0.26, 12); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(m.x, m.y); c.lineTo(b.x, b.y); c.moveTo(m.x, m.y); c.lineTo(h.x, h.y); c.stroke(); void rx; void ry; void t; void ph;
}
// ---------- properti ----------
const OD = NW.objDraw = NW.objDraw || {};
function shadowE(c, x, y, rx, ry, a) { const p = P(x, y, LIFT); c.fillStyle = `rgba(20,40,30,${a || 0.18})`; c.beginPath(); c.ellipse(p.x, p.y, rx, ry, 0, 0, 7); c.fill(); }
OD.k_stall = (c, o, t, night) => {   // lapak pasar: meja + terpal bergaris
  const x = o.x, y = o.y; shadowE(c, x + 0.2, y + 0.2, 34, 11, 0.18);
  prism(c, x - 0.8, y - 0.2, x + 0.8, y + 0.45, 0, 9, ["#b98a52", "#a8743f", "#8a5a30"]);
  const col = o.col, n = 6, ax = x - 0.9, bx = x + 0.9; for (let i = 0; i < n; i++) { const a = ax + (bx - ax) * i / n, e = ax + (bx - ax) * (i + 1) / n; fillPoly(c, [P(a, y + 0.55, LIFT + 30), P(e, y + 0.55, LIFT + 30), P(e, y - 0.5, LIFT + 38), P(a, y - 0.5, LIFT + 38)], i % 2 ? "#f6efe0" : col); }
  for (const xx of [x - 0.85, x + 0.85]) prism(c, xx - 0.03, y + 0.5, xx + 0.03, y + 0.55, 0, 31, ["#6b4a2c", "#5a3a20", "#4a2f18"]);
  const goods = [["#d84a3a", "#e0642a", "#6aa64e", "#e0b84c"], ["#6aa64e", "#4f9a3c", "#e0b84c", "#d84a3a"], ["#e0b84c", "#f08a3a", "#c9553b", "#6aa64e"], ["#f08a3a", "#d84a3a", "#6aa64e", "#e0b84c"], ["#9ac3d6", "#c9d6dc", "#e0b84c", "#f3efe6"]][o.i % 5];
  for (let k = 0; k < 4; k++) { const p = P(x - 0.55 + k * 0.37, y + 0.12, LIFT + 12); c.fillStyle = goods[k]; c.beginPath(); c.ellipse(p.x, p.y, 4.2, 2.6, 0, 0, 7); c.fill(); }
};
OD.k_gate = (c, o, t, night) => {   // gerbang kawasan di x=37: dua pilar + palang papan "KOTA NUSA"
  const y0 = 18.9, y1 = 23.1, x = 37.1;
  for (const y of [y0 + 0.05, y1 - 0.05]) prism(c, x - 0.2, y - 0.2, x + 0.2, y + 0.2, 0, 44, ["#e8dcc0", "#d9ccaa", "#b5a888"]);
  const a = (yy, z) => P(x, yy, LIFT + z);
  fillPoly(c, [a(y0, 36), a(y1, 36), a(y1, 50), a(y0, 50)], "#173f50", "rgba(23,63,80,.7)");
  const p = a((y0 + y1) / 2, 43); c.save(); c.translate(p.x, p.y); c.transform(1, -0.5, 0, 1, 0, 0); c.fillStyle = "#ffd166"; c.font = "800 8px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("KOTA NUSA", 0, 0.5); c.restore();
};
OD.k_pillar = (c, o) => { prism(c, o.x - 0.15, o.y - 0.15, o.x + 0.15, o.y + 0.15, 0, 18, ["#e8dcc0", "#d9ccaa", "#b5a888"]); };
OD.k_fenceline = (c, o) => {   // pagar kawasan (sepanjang y pada x tetap)
  const x = o.x0, step = 1.0;
  c.strokeStyle = "#6b4a2c"; c.lineWidth = 1.6; c.beginPath();
  for (let y = o.y0; y <= o.y1; y += step) { const a = P(x, y, LIFT), b = P(x, y, LIFT + 16); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
  c.stroke(); c.lineWidth = 1.4; for (const z of [6, 13]) { const a = P(x, o.y0, LIFT + z), b = P(x, o.y1, LIFT + z); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
};
OD.k_fence = (c, o) => {   // pagar depan rumah (sepanjang x), dengan celah pintu
  const y = o.y0; c.strokeStyle = "#f3ead6"; c.lineWidth = 1.6; c.beginPath();
  for (let x = o.x0; x <= o.x1; x += 0.35) { if (Math.abs(x - o.gap) < 0.52) continue; const a = P(x, y, LIFT), b = P(x, y, LIFT + 9); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
  c.stroke(); c.lineWidth = 1.2; for (const [xa, xb] of [[o.x0, o.gap - 0.52], [o.gap + 0.52, o.x1]]) { for (const z of [3, 7]) { const a = P(xa, y, LIFT + z), b = P(xb, y, LIFT + z); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } }
};
OD.k_light = (c, o, t, night) => {   // lampu lalu lintas: tiang + kepala 3 lampu
  const st = S(), ew = (o.idx === 0 || o.idx === 3), cur = ew ? st.ph.ew : st.ph.ns, b = P(o.x, o.y, LIFT);
  shadowE(c, o.x + 0.1, o.y + 0.1, 8, 3, 0.2);
  c.fillStyle = "#3a4650"; c.fillRect(b.x - 1.5, b.y - 44, 3, 44);
  c.fillStyle = "#1f272d"; c.fillRect(b.x - 4, b.y - 58, 8, 19);
  const cols = [["R", "#ff4a3a", "#5a2420"], ["Y", "#ffd23a", "#5a4a20"], ["G", "#44d46a", "#1f4a2c"]];
  cols.forEach(([k, on, off], i) => { c.fillStyle = cur === k ? on : off; c.beginPath(); c.arc(b.x, b.y - 54 + i * 6, 2.3, 0, 7); c.fill(); });
};
OD.k_ped = (c, o, t, night) => {   // lampu penyeberangan pejalan (hijau saat jendela pejalan terbuka)
  const st = S(), b = P(o.x, o.y, LIFT), g = st.ph.ped;
  c.fillStyle = "#3a4650"; c.fillRect(b.x - 1.2, b.y - 34, 2.4, 34); c.fillStyle = "#1f272d"; c.fillRect(b.x - 4, b.y - 46, 8, 13);
  c.fillStyle = g ? "#44d46a" : "#ff4a3a"; c.beginPath(); c.arc(b.x, b.y - 39.5, 2.8, 0, 7); c.fill(); c.fillStyle = "#fff"; c.fillRect(b.x - 0.7, b.y - 41, 1.4, 3);
};
OD.k_parked = (c, o, t, night) => { drawVehicle(c, { x: o.x, y: o.y, fx: o.fx, fy: o.fy, type: o.vt, col: o.col, L: Core.VT[o.vt].L, W: Core.VT[o.vt].W, braking: false }, t, night); };
OD.k_tires = (c, o) => { const b = P(o.x, o.y, LIFT); shadowE(c, o.x, o.y, 12, 4, 0.2); for (let i = 0; i < 3; i++) { c.fillStyle = "#23282c"; c.beginPath(); c.ellipse(b.x + (i - 1) * 3, b.y - 3 - i * 5, 8, 3.8, 0, 0, 7); c.fill(); c.fillStyle = "#4a5058"; c.beginPath(); c.ellipse(b.x + (i - 1) * 3, b.y - 3.6 - i * 5, 4.4, 1.9, 0, 0, 7); c.fill(); } };
OD.k_table = (c, o, t, night) => {   // meja warung + payung
  const b = P(o.x, o.y, LIFT); shadowE(c, o.x + 0.1, o.y + 0.1, 16, 5, 0.18);
  c.fillStyle = "#6b4a2c"; c.fillRect(b.x - 1.2, b.y - 15, 2.4, 15); c.fillStyle = "#f3ead6"; c.beginPath(); c.ellipse(b.x, b.y - 15, 9, 3.6, 0, 0, 7); c.fill();
  c.fillStyle = "#c9553b"; c.beginPath(); c.moveTo(b.x - 15, b.y - 24); c.lineTo(b.x + 15, b.y - 24); c.lineTo(b.x, b.y - 36); c.closePath(); c.fill(); c.fillStyle = "#f3ead6"; c.beginPath(); c.moveTo(b.x - 5, b.y - 24); c.lineTo(b.x + 5, b.y - 24); c.lineTo(b.x, b.y - 36); c.closePath(); c.fill();
  c.strokeStyle = "#6b4a2c"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(b.x, b.y - 24); c.lineTo(b.x, b.y - 16); c.stroke();
};
OD.k_planter = (c, o) => { const b = P(o.x, o.y, LIFT); shadowE(c, o.x, o.y, 11, 4, 0.18); prism(c, o.x - 0.25, o.y - 0.25, o.x + 0.25, o.y + 0.25, 0, 8, ["#8a6a4a", "#7a5a3c", "#5e442c"]); c.fillStyle = "#4f9a3c"; c.beginPath(); c.arc(b.x, b.y - 14, 8, 0, 7); c.fill(); c.fillStyle = "#e07a8c"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(b.x - 5 + i * 3.4, b.y - 16 - (i % 2) * 4, 1.6, 0, 7); c.fill(); } };
OD.k_flag = (c, o, t) => { const b = P(o.x, o.y, LIFT); c.fillStyle = "#cfd4d8"; c.fillRect(b.x - 1.2, b.y - 66, 2.4, 66); const w = Math.sin(t * 3) * 2; c.fillStyle = "#d84a3a"; c.beginPath(); c.moveTo(b.x + 1.2, b.y - 64); c.quadraticCurveTo(b.x + 13, b.y - 65 + w, b.x + 24, b.y - 62 + w); c.lineTo(b.x + 24, b.y - 54 + w); c.quadraticCurveTo(b.x + 13, b.y - 57 + w, b.x + 1.2, b.y - 56); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.moveTo(b.x + 1.2, b.y - 56); c.quadraticCurveTo(b.x + 13, b.y - 57 + w, b.x + 24, b.y - 54 + w); c.lineTo(b.x + 24, b.y - 48 + w); c.quadraticCurveTo(b.x + 13, b.y - 49 + w, b.x + 1.2, b.y - 48); c.fill(); };
OD.k_fountain = (c, o, t, night) => {   // air mancur bertingkat dengan semburan beranimasi
  const b = P(o.x, o.y, LIFT); shadowE(c, o.x + 0.2, o.y + 0.2, 52, 18, 0.15);
  c.fillStyle = "#b8c0c4"; c.beginPath(); c.ellipse(b.x, b.y, 50, 24, 0, 0, 7); c.fill(); c.fillStyle = "#8fa0a8"; c.beginPath(); c.ellipse(b.x, b.y - 5, 50, 24, 0, 0, 7); c.fill();
  c.fillStyle = "#6fc3d4"; c.beginPath(); c.ellipse(b.x, b.y - 6, 43, 20, 0, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(b.x - 8, b.y - 8, 18, 6, 0, 0, 7); c.fill();
  c.fillStyle = "#c8d0d4"; c.fillRect(b.x - 4, b.y - 32, 8, 26); c.beginPath(); c.ellipse(b.x, b.y - 32, 16, 6.5, 0, 0, 7); c.fill(); c.fillStyle = "#7fd0e0"; c.beginPath(); c.ellipse(b.x, b.y - 33, 13, 5, 0, 0, 7); c.fill();
  c.fillStyle = "#c8d0d4"; c.fillRect(b.x - 2.5, b.y - 46, 5, 14);
  c.strokeStyle = "rgba(210,245,255,.85)"; c.lineWidth = 1.4; for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283 + t * 0.4, ph = (t * 1.4 + i * 0.37) % 1, r = 11 + ph * 22, y = -46 + (1 - Math.pow(1 - ph, 2)) * -8 + ph * ph * 40; c.beginPath(); c.moveTo(b.x + Math.cos(a) * 2, b.y - 46); c.quadraticCurveTo(b.x + Math.cos(a) * r * 0.5, b.y - 58 - Math.sin(ph * 3.14) * 6, b.x + Math.cos(a) * r, b.y - 24 + Math.sin(a) * r * 0.45 + 12 * ph); c.stroke(); void y; }
  c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; c.beginPath(); c.ellipse(b.x, b.y - 6, 10 + k * 30, 4.5 + k * 13, 0, 0, 7); c.globalAlpha = 1 - k; c.stroke(); c.globalAlpha = 1; }
};
OD.k_cart = (c, o, t) => {   // gerobak pedagang dengan payung
  const b = P(o.x, o.y, LIFT); shadowE(c, o.x + 0.1, o.y + 0.1, 22, 7, 0.18);
  prism(c, o.x - 0.55, o.y - 0.28, o.x + 0.55, o.y + 0.28, 3, 14, [shade(o.col, 0.15), o.col, shade(o.col, -0.2)]);
  for (const dx of [-0.4, 0.4]) { const q = P(o.x + dx, o.y + 0.32, LIFT + 3); c.fillStyle = "#23282c"; c.beginPath(); c.arc(q.x, q.y, 3.6, 0, 7); c.fill(); }
  c.strokeStyle = "#6b4a2c"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(b.x, b.y - 14); c.lineTo(b.x, b.y - 36); c.stroke(); c.fillStyle = "#f3ead6"; c.beginPath(); c.moveTo(b.x - 20, b.y - 34); c.lineTo(b.x + 20, b.y - 34); c.lineTo(b.x, b.y - 46); c.closePath(); c.fill(); c.fillStyle = o.col; c.beginPath(); c.moveTo(b.x - 20, b.y - 34); c.lineTo(b.x - 7, b.y - 34); c.lineTo(b.x, b.y - 46); c.closePath(); c.fill();
};
OD.k_laundry = (c, o, t) => {   // jemuran
  const a = P(o.x - 0.6, o.y, LIFT + 22), e = P(o.x + 0.6, o.y, LIFT + 22); c.strokeStyle = "#6b4a2c"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(a.x, a.y + 22); c.lineTo(a.x, a.y); c.moveTo(e.x, e.y + 22); c.lineTo(e.x, e.y); c.stroke();
  c.strokeStyle = "#d9d2c0"; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(e.x, e.y); c.stroke();
  const cols = ["#e8a0a0", "#9ac3d6", "#f3ead6", "#e0b84c"]; for (let i = 0; i < 4; i++) { const u = 0.15 + i * 0.22, x = a.x + (e.x - a.x) * u, y = a.y + (e.y - a.y) * u, sw = Math.sin(t * 2 + i) * 1.2; c.fillStyle = cols[(o.i + i) % 4]; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + 3, y); c.lineTo(x + 3 + sw, y + 9); c.lineTo(x - 3 + sw, y + 9); c.fill(); }
};
OD.k_dirsign = (c, o) => {   // papan penunjuk arah
  const b = P(o.x, o.y, LIFT); shadowE(c, o.x + 0.1, o.y + 0.1, 8, 3, 0.2); c.fillStyle = "#5a3a20"; c.fillRect(b.x - 1.4, b.y - 34, 2.8, 34);
  const w = o.txt.length * 4.1 + 10; c.fillStyle = "#173f50"; c.beginPath(); c.moveTo(b.x - w / 2, b.y - 40); c.lineTo(b.x + w / 2 - 6, b.y - 40); c.lineTo(b.x + w / 2, b.y - 34); c.lineTo(b.x + w / 2 - 6, b.y - 28); c.lineTo(b.x - w / 2, b.y - 28); c.fill();
  c.fillStyle = "#fff6d8"; c.font = "800 7px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(o.txt, b.x - 2, b.y - 34);
};
// lapisan jendela menyala yang digambar SETELAH lapisan malam (kait drawSky) agar tetap terang
function litPass(c, b, night) {
  const p = b.parent; if (p.type === "rumah" || p.type === "arch" || night < 0.1) return;
  const lp = litProb(p, S().hour); const sets = [];
  if (b.front) sets.push(windowsS(c, b, p, night, lp)[0]);
  if (b.right) sets.push(windowsE(c, b, p, night, lp)[0]);
  c.fillStyle = `rgba(255,226,150,${(0.55 * night).toFixed(3)})`; c.beginPath();
  for (const lit of sets) for (const q of lit) { c.moveTo(q[0].x, q[0].y); for (let i = 1; i < 4; i++) c.lineTo(q[i].x, q[i].y); c.closePath(); }
  c.fill();
}
NW.kotaArt = { cell, drawVehicle, drawBike, prism, VCOL, litPass };
})();
