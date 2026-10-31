// =========================================================
//  NUSA ISLAND — Perabot hadiah Login Streak (13 jenis, 4 kelangkaan)
//  Mendaftarkan jenis baru ke NW.HD.FURN supaya perabot ini diperlakukan SAMA seperti perabot toko di Rumahku:
//  masuk home.furniture / home.stored, bisa digeser, diputar, disimpan ke gudang, dan ikut tersimpan di Cloud Save.
//  Hanya menambah data; tidak mengubah perabot lama. Modul ini hanya menggambar (jenis solid/floor).
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const C = NW.StreakCore;
if (!C || !NW.HD) return;

for (const f of C.FURN_POOL) {
  if (NW.HD.FURN[f.id]) continue;                                   // jangan menimpa apa pun yang sudah ada
  NW.HD.FURN[f.id] = { name: f.name, w: f.w, d: f.d, h: f.h, kind: f.kind, icon: f.icon, gen: true, rarity: f.rarity, rw: true };
}

const glowOf = (r) => (r === "legenda" ? 1 : r === "epik" ? 0.45 : 0);
const mid = (r) => ({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 });

function draw(c, f, r, T, t, ctx) {
  const D = C.FURN_BY_ID[f.type]; if (!D) return;
  const H = NW.HOUSE, P = NW.P, box = H.box, poly = H.poly, m = mid(r);
  const [top, left, right] = D.col;
  if (D.kind === "floor") {
    const q = (k) => [P(r.x0 + k, r.y0 + k, 1), P(r.x1 - k, r.y0 + k, 1), P(r.x1 - k, r.y1 - k, 1), P(r.x0 + k, r.y1 - k, 1)];
    c.fillStyle = top; poly(c, q(0)); c.fill();
    c.fillStyle = D.acc; poly(c, q(0.12)); c.fill();
    c.fillStyle = left; poly(c, q(0.22)); c.fill();
    const p = P(m.x, m.y, 2); c.font = "16px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff"; c.fillText(D.icon, p.x, p.y);
    c.textBaseline = "alphabetic";
    return;
  }
  const g = glowOf(D.rarity);
  if (g) { // kilau lembut untuk epik/legenda: satu elips berdenyut (murah untuk HP)
    const p = P(m.x, m.y, 2), k = 0.55 + 0.45 * Math.sin(t * 2.2 + (f.x || 0));
    c.save(); c.globalAlpha = (0.16 + 0.22 * k) * g; c.fillStyle = D.rarity === "legenda" ? "#ffe27a" : "#d9a8ff";
    c.beginPath(); c.ellipse(p.x, p.y, 30 + 6 * k, 13 + 3 * k, 0, 0, 7); c.fill(); c.restore();
  }
  if (D.id === "rw_guciNaga" || D.id === "rw_potAnggrek" || D.id === "rw_gongKecil") {
    // bentuk bulat (guci/pot) di atas alas kecil
    const p = P(m.x, m.y, 0), h = D.h;
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(p.x + 3, p.y, 15, 6, 0, 0, 7); c.fill();
    if (D.id === "rw_gongKecil") {
      c.fillStyle = D.col[1]; c.fillRect(p.x - 17, p.y - h, 4, h); c.fillRect(p.x + 13, p.y - h, 4, h); c.fillRect(p.x - 17, p.y - h, 34, 4);
      c.fillStyle = D.acc; c.beginPath(); c.arc(p.x, p.y - h * 0.55, 11, 0, 7); c.fill();
      c.fillStyle = "#fff3b0"; c.beginPath(); c.arc(p.x, p.y - h * 0.55, 4, 0, 7); c.fill();
    } else {
      c.fillStyle = D.col[1]; c.beginPath(); c.ellipse(p.x, p.y - h * 0.4, 13, h * 0.42, 0, 0, 7); c.fill();
      c.fillStyle = D.col[0]; c.beginPath(); c.ellipse(p.x - 3, p.y - h * 0.44, 8, h * 0.3, 0, 0, 7); c.fill();
      c.fillStyle = D.col[2]; c.fillRect(p.x - 6, p.y - h * 0.95, 12, h * 0.2);
      c.strokeStyle = D.acc; c.lineWidth = 1.4; c.beginPath(); c.arc(p.x, p.y - h * 0.4, 8, 0.4, 2.7); c.stroke();
      if (D.id === "rw_potAnggrek") { c.fillStyle = D.acc; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(p.x + (i - 1.5) * 5, p.y - h - 2 - (i % 2) * 5 + Math.sin(t + i) * 0.8, 3.2, 0, 7); c.fill(); } }
    }
    return;
  }
  if (D.id === "rw_jukungMini") { // perahu: lambung rendah + layar + cadik
    box(c, r, 0, 12, top, left, right);
    const inner = { x0: r.x0 + 0.12, y0: r.y0 + 0.1, x1: r.x1 - 0.12, y1: r.y1 - 0.1 };
    box(c, inner, 12, 2, "#c89556", "#a8743f", "#8a5a32");
    const a = P(m.x, m.y, 14), b = P(m.x, m.y, D.h + 22);
    c.strokeStyle = "#5a3a20"; c.lineWidth = 2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    c.fillStyle = D.acc; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x + 15, b.y + 17 + Math.sin(t * 1.6) * 1); c.lineTo(b.x, b.y + 22); c.closePath(); c.fill();
    return;
  }
  // bentuk umum: balok berwarna + pita aksen + ikon di atas
  box(c, r, 0, D.h, top, left, right);
  const band = { x0: r.x0 + 0.04, y0: r.y0 + 0.04, x1: r.x1 - 0.04, y1: r.y1 - 0.04 };
  box(c, band, D.h * 0.55, 3, D.acc, D.acc, D.acc);
  if (D.id === "rw_singgasana") box(c, { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y0 + 0.18 }, D.h, 22, D.col[0], D.col[1], D.col[2]); // sandaran tinggi
  if (D.id === "rw_garudaEmas") box(c, { x0: m.x - 0.2, y0: m.y - 0.2, x1: m.x + 0.2, y1: m.y + 0.2 }, D.h, 10, D.col[0], D.col[1], D.col[2]);
  const p = P(m.x, m.y, D.h + (D.id === "rw_singgasana" ? 28 : 14));
  c.font = (D.rarity === "legenda" ? 22 : 16) + "px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff";
  c.fillText(D.icon, p.x, p.y); c.textBaseline = "alphabetic";
}

NW.streakFurn = { draw };
})();
