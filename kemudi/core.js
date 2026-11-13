// NUSA ISLAND — UI Kemudi Kapal: inti murni (tanpa DOM). Setir (kembali ke tengah) + tuas MAJU/NETRAL/MUNDUR → vektor masukan yang SUDAH dipahami NW.boat.update (inp.x belok, inp.y = -gas).
// Tidak mengubah fisika/kecepatan/aturan kapal; tidak menyentuh server atau hadiah.
(function (root, f) { if (typeof module === "object" && module.exports) module.exports = f(); else root.NusaKemudiCore = f(); })(typeof self !== "undefined" ? self : this, function () {
"use strict";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GEARS = ["MAJU", "NETRAL", "MUNDUR"], THR = { MAJU: 1, NETRAL: 0, MUNDUR: -1 };
const MAX_DEG = 120;                                   // setir bisa diputar ±120°
const WIND = ["Timur", "Tenggara", "Selatan", "Barat Daya", "Barat", "Barat Laut", "Utara", "Timur Laut"];   // arah-layar kapal: 8 mata angin, dir8 dari NW.boat (0 = ke kanan layar)
const steerOf = (deg) => clamp(deg / MAX_DEG, -1, 1);
const angleOf = (cx, cy, x, y) => (Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI;   // 0° = atas, + searah jarum jam
function wheelDeg(prevDeg, cx, cy, x, y) { const raw = angleOf(cx, cy, x, y); let d = raw; while (d - prevDeg > 180) d -= 360; while (d - prevDeg < -180) d += 360; return clamp(d, -MAX_DEG, MAX_DEG); }
function recenter(deg, dt, rate) { const k = Math.min(1, dt * (rate || 7)), n = deg * (1 - k); return Math.abs(n) < 0.5 ? 0 : n; }   // kembali ke tengah saat dilepas
const input = (deg, gear) => ({ x: steerOf(deg), y: -(THR[gear] === undefined ? 0 : THR[gear]) });
const knots = (v) => Math.round(Math.abs(v || 0) / 22);
const heading = (d8) => WIND[((d8 % 8) + 8) % 8];
// ---------- Kapal Rombongan (kapten): setir + tuas → NIAT {d, th} untuk protokol kapal server yang sudah ada ----------
// Protokol (mp/proto.js cleanBoat): steer{d: 0..7 (8 mata angin), th: 0 berhenti | 1 pelan | 2 kencang}. TIDAK ada gigi mundur dan tidak ada posisi/kecepatan dari klien:
// klien hanya menyatakan niat; server menegakkan jangkar, batas jalur air, percepatan, dan menentukan kecepatan/arah sebenarnya.
const TURN_RATE = 2.2, DEAD = 0.12;                    // langkah 45°/detik pada setir penuh; zona mati setir
const ROMB_TH = { MAJU: 2, NETRAL: 0 };                // MUNDUR tidak ada di protokol → tidak dipetakan (tombol dimatikan di UI)
const throttleOf = (gear) => ROMB_TH[gear] || 0;
const helmNew = (d) => ({ d: ((d | 0) % 8 + 8) % 8, acc: 0 });
function helmTurn(h, steer, dt) {                      // setir kanan (+) = searah jarum jam di layar = arah +1 (dir8 kapal)
  const s = Math.abs(steer) < DEAD ? 0 : steer;
  if (!s) { h.acc = 0; return h.d; }
  h.acc += s * TURN_RATE * Math.max(0, Math.min(0.1, dt));
  while (h.acc >= 1) { h.d = (h.d + 1) % 8; h.acc -= 1; }
  while (h.acc <= -1) { h.d = (h.d + 7) % 8; h.acc += 1; }
  return h.d;
}
const knotsTile = (v) => Math.round(Math.abs(v || 0) * 2.2);   // tampilan saja: kecepatan server (tile/dtk) → "knot" sepadan skala kapal tunggal
function cargoText(view) {   // status muatan dari tampilan server (damar); tanpa angka uang
  if (!view || !Array.isArray(view.boxes)) return "Muatan: —";
  const b = view.boxes, n = b.reduce((s, x) => s + (x && x.n | 0), 0), k = b.filter((x) => x && x.n > 0).length;
  if (b.some((x) => x && x.st === "sailing")) return `Muatan: ${k} kotak · berlayar`;
  return n ? `Muatan: ${k} kotak · ${n} ikan` : "Muatan: kosong";
}
function destText(dest) { if (!dest) return "Tujuan: —"; return `Tujuan: ${dest.name}${Number.isFinite(dest.m) ? " · " + (dest.m < 18 ? "dekat" : Math.round(dest.m) + " m") : ""}`; }
return { GEARS, THR, MAX_DEG, WIND, steerOf, angleOf, wheelDeg, recenter, input, knots, heading, cargoText, destText, TURN_RATE, DEAD, throttleOf, helmNew, helmTurn, knotsTile };
});
