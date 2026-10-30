// =========================================================
//  NUSA ISLAND — Bumbu 2.2: Spot memancing rahasia
//   • Lubuk Bambu Muara  (Muara Kampung, tikungan air dekat rumpun bambu di pantai barat laut)
//   • Teluk Sunyi Toba   (Tepian Toba, teluk kecil di balik jalan setapak; petunjuk: Bukit Pandang)
//  Ditemukan lewat berjalan (bukan dari menu). Setelah ditemukan, titik mancing nyata (fishSpots + points)
//  ditambahkan ke peta area — memakai mekanik mancing yang sama. Titik mancing biasa (dermaga) tidak berubah.
//  Status penemuan memakai S.adv.found (kunci "secret:<id>") sehingga tersimpan, tidak muncul ulang, dan
//  tampil di Buku Petualangan.
// =========================================================
window.NW = window.NW || {};
(() => {
"use strict";
const N = () => window.Nusa, S = () => N().S;

// stand = tempat pemain berdiri, mark = penanda air, face = arah hadap saat memancing, disc = lingkaran penemuan
const DEFS = {
  lubuk: {
    id: "lubuk", key: "secret:lubuk", area: "muara", name: "Lubuk Bambu Muara", icon: "🎋",
    stand: { x: 10.35, y: 10.6 }, mark: { mx: 9.2, my: 10.05, mz: 4.5 }, face: 5, ret: { x: 10.35, y: 10.7, dir: 5 },
    disc: { x: 10.3, y: 10.55, r: 1.8 },
    hint: "Di pantai barat laut, dekat rumpun bambu, riak air tampak tidak seperti biasanya. Ada daun dan gelembung yang berputar pelan di tikungan air.",
    desc: "Lubuk teduh di tikungan air, diapit rumpun bambu. Cahaya senja menyela batang-batangnya dan membuat sisik tampak lebih hangat.",
    perk: "Peluang corak Senja & kilau Perak sedikit lebih besar. Lempar tepat di riak untuk bonus tambahan.",
  },
  teluk: {
    id: "teluk", key: "secret:teluk", area: "toba", name: "Teluk Sunyi Toba", icon: "🌫️",
    stand: { x: 3.5, y: 13.6 }, mark: { mx: 4.3, my: 12.5, mz: 4.5 }, face: 7, ret: { x: 3.5, y: 13.7, dir: 7 },
    disc: { x: 3.6, y: 13.7, r: 1.9 },
    needs: "toba:bukit",
    hint: "Dari Bukit Pandang tampak teluk kecil yang berkilau di ujung barat laut, di balik jalan setapak. Tidak ada papan penunjuk; ikuti saja jalan setapaknya.",
    desc: "Teluk kecil yang tenang, tersembunyi dari dermaga. Airnya hampir tak berombak sehingga kilau sisik terlihat jelas.",
    perk: "Peluang kilau Perak & corak Senja sedikit lebih besar. Lempar tepat di riak untuk bonus tambahan.",
  },
};
const ORDER = ["lubuk", "teluk"];
const isSecret = (id) => !!DEFS[id];
const found = (id) => !!(DEFS[id] && S().adv && S().adv.found[DEFS[id].key]);
const unlocked = (id) => { const d = DEFS[id]; return !d.needs || !!(S().adv && S().adv.found[d.needs]); }; // petunjuk harus sudah dikunjungi

// ---- pasang titik mancing ke peta area sesuai status penemuan (idempoten) ----
function sync() {
  for (const id of ORDER) {
    const d = DEFS[id], ar = NW.areas.get(d.area); if (!ar) continue;
    const m = ar.map, has = m.fishSpots.some((s) => s.id === id), on = found(id);
    if (on && !has) {
      m.fishSpots.push({ id, secret: true, mx: d.mark.mx, my: d.mark.my, mz: d.mark.mz, face: d.face, ret: d.ret });
      m.points.push({ id, x: d.stand.x, y: d.stand.y, r: 1.25, icon: "🎣", label: "Mancing di " + d.name.split(" ").slice(0, 2).join(" "), fish: true, spot: id, secret: true });
    } else if (!on && has) {
      m.fishSpots.splice(m.fishSpots.findIndex((s) => s.id === id), 1);
      m.points.splice(m.points.findIndex((p) => p.id === id), 1);
    }
  }
}
// daftar untuk penemuan (dibaca adventure.js)
function list(areaId) { return ORDER.map((i) => DEFS[i]).filter((d) => d.area === areaId); }
function migrate() { sync(); }

// ---- gambar di dunia (petunjuk sebelum ditemukan: riak & gelembung; dipanggil dari world.draw) ----
function drawWorld(c, t, view, areaId) {
  for (const d of list(areaId)) {
    if (!unlocked(d.id)) continue;
    const p = NW.P(d.mark.mx, d.mark.my, NW.LIFT + 2);
    if (p.x < view.x0 - 60 || p.x > view.x1 + 60 || p.y < view.y0 - 60 || p.y > view.y1 + 60) continue;
    const f = found(d.id);
    // riak yang sedikit berbeda: dua cincin lambat (bukan partikel banyak)
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.35 + i * 0.5) % 1), r = 8 + k * 22;
      c.strokeStyle = `rgba(236,252,255,${(f ? 0.38 : 0.5) * (1 - k)})`; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(p.x, p.y, r, r * 0.5, 0, 0, 7); c.stroke();
    }
    // gelembung kecil naik (3 titik) + satu daun hanyut
    c.fillStyle = "rgba(255,255,255,.65)";
    for (let i = 0; i < 3; i++) { const k = ((t * 0.5 + i * 0.33) % 1); c.beginPath(); c.arc(p.x + Math.sin(t + i * 2) * 5 + (i - 1) * 6, p.y - 2 - k * 14, 1.4 + (1 - k) * 1.2, 0, 7); c.fill(); }
    if (d.id === "lubuk") { c.fillStyle = "#6fae4f"; c.save(); c.translate(p.x + 14 + Math.sin(t * 0.7) * 6, p.y + 4); c.rotate(Math.sin(t * 0.9) * 0.5); c.beginPath(); c.ellipse(0, 0, 5, 1.8, 0, 0, 7); c.fill(); c.restore(); }
  }
}

// ---- tampilan mode mancing di spot rahasia (pengganti dermaga kayu) ----
function drawFore(c, K, id) { // K = {cx, by, B, U, W, H, night(color), t}
  const { cx, by, B, U, W, night, t } = K, d = DEFS[id];
  const nearW = 420 * U, farW = 200 * U, farY = B - 168 * U;
  // tepi tanah/pasir di depan
  const g = c.createLinearGradient(0, farY, 0, by);
  if (id === "lubuk") { g.addColorStop(0, night("#58703a")); g.addColorStop(0.35, night("#6d8548")); g.addColorStop(1, night("#4d3a26")); }
  else { g.addColorStop(0, night("#7d8479")); g.addColorStop(0.4, night("#9a9d90")); g.addColorStop(1, night("#5e5d55")); }
  c.fillStyle = g; c.beginPath(); c.moveTo(cx - nearW / 2, by); c.quadraticCurveTo(cx - farW * 0.7, farY + 20 * U, cx - farW / 2, farY); c.lineTo(cx + farW / 2, farY); c.quadraticCurveTo(cx + farW * 0.7, farY + 20 * U, cx + nearW / 2, by); c.closePath(); c.fill();
  c.strokeStyle = night(id === "lubuk" ? "#3d5026" : "#686c62"); c.lineWidth = 3 * U; c.beginPath(); c.moveTo(cx - farW / 2, farY); c.lineTo(cx + farW / 2, farY); c.stroke();
  if (id === "lubuk") { // rumpun bambu kiri & kanan
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
      const x = cx + sd * (farW / 2 + 22 * U + i * 30 * U), top = farY - (150 + i * 34 + (i % 2) * 20) * U, sway = Math.sin(t * 0.9 + i + sd) * 4 * U;
      c.strokeStyle = night(i % 2 ? "#6b9a3d" : "#7fae48"); c.lineWidth = (9 - i) * U; c.lineCap = "round";
      c.beginPath(); c.moveTo(x, farY + 14 * U); c.quadraticCurveTo(x + sway * 0.4, (farY + top) / 2, x + sway, top); c.stroke();
      c.strokeStyle = night("#3f5f22"); c.lineWidth = 2 * U;
      for (let n = 1; n < 5; n++) { const yy = lerp(farY + 14 * U, top, n / 5); c.beginPath(); c.moveTo(x - 4 * U + sway * n / 6, yy); c.lineTo(x + 4 * U + sway * n / 6, yy); c.stroke(); }
      c.fillStyle = night("#8bc05a"); for (let n = 0; n < 3; n++) { c.save(); c.translate(x + sway, top + n * 14 * U); c.rotate(sd * (0.6 + n * 0.3)); c.beginPath(); c.ellipse(sd * 14 * U, 0, 20 * U, 3.4 * U, 0, 0, 7); c.fill(); c.restore(); }
    }
    // daun melayang di air
    c.fillStyle = night("#79b04d"); for (let i = 0; i < 4; i++) { const k = ((t * 0.04 + i * 0.27) % 1); c.save(); c.translate(cx + (k - 0.5) * W * 0.8, farY - (20 + i * 22) * U); c.rotate(Math.sin(t + i) * 0.6); c.beginPath(); c.ellipse(0, 0, 7 * U, 2.2 * U, 0, 0, 7); c.fill(); c.restore(); }
  } else { // teluk: batu pipih & alang-alang, kabut tipis
    c.fillStyle = night("#8c8f86"); for (let i = 0; i < 5; i++) { const x = cx + (i - 2) * 70 * U, y = farY + (8 + (i % 2) * 14) * U; c.beginPath(); c.ellipse(x, y, (30 + (i % 3) * 8) * U, (10 + (i % 2) * 4) * U, 0, 0, 7); c.fill(); }
    c.strokeStyle = night("#7d8f52"); c.lineWidth = 2.4 * U; c.lineCap = "round";
    for (const sd of [-1, 1]) for (let i = 0; i < 16; i++) { const x = cx + sd * (farW / 2 + 12 * U + i * 9 * U), h = (60 + (i * 37) % 50) * U, sw = Math.sin(t * 1.2 + i) * 5 * U; c.beginPath(); c.moveTo(x, farY + 10 * U); c.quadraticCurveTo(x + sw * 0.5, farY - h * 0.5, x + sw + sd * 6 * U, farY - h); c.stroke(); }
  }
}
// lapisan warna air (dipanggil di atas laut sebelum perahu/tepi): suasana berbeda dari dermaga
function drawTint(c, K, id) {
  const { W, H, HZ, night } = K; const m = id === "lubuk" ? "rgba(52,120,86," : "rgba(150,176,190,";
  const g = c.createLinearGradient(0, HZ, 0, H); g.addColorStop(0, m + "0.10)"); g.addColorStop(1, m + (id === "lubuk" ? "0.30)" : "0.24)"));
  c.fillStyle = g; c.fillRect(0, HZ, W, H - HZ);
  if (id === "teluk") { const k = c.createLinearGradient(0, HZ - 10, 0, HZ + 90); k.addColorStop(0, "rgba(232,240,244,.0)"); k.addColorStop(0.5, "rgba(232,240,244,.30)"); k.addColorStop(1, "rgba(232,240,244,0)"); c.fillStyle = k; c.fillRect(0, HZ - 10, W, 100); }
}
const lerp = (a, b, t) => a + (b - a) * t;

NW.secret = { DEFS, ORDER, isSecret, found, unlocked, sync, list, migrate, drawWorld, drawFore, drawTint };
})();
