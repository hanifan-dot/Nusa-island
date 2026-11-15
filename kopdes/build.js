// =========================================================
//  NUSA ISLAND — KOPDES (Koperasi Desa) di Pulau Para Legenda (Samudra Follower). Bangunan gudang beratap seng:
//  atap bergelombang bertepi biru, deretan pintu gulung merah-bata, panel papan nama abu-abu di tengah, bay pintu ganda di ujung.
//  Gambar ORISINAL (prosedural, Canvas 2D, dicache satu kali ke kanvas luar-layar → ringan untuk Android); papan nama memakai tulisan sendiri, BUKAN logo pihak lain.
//  Hanya aktif bila window.NUSA_KOPDES === true (bawaan MATI → pulau persis seperti sebelumnya). Titik beli joran: kopdes/ui.js.
// =========================================================
(() => {
"use strict";
const NW = (window.NW = window.NW || {});
// Tapak bangunan (petak): panjang 6 sepanjang sumbu x, kedalaman 1,6; sisi depan (fasad) menghadap selatan/kamera.
const FP = { x0: 33.0, x1: 39.0, y0: 24.7, y1: 26.3 };
const SIGN_X = FP.x0 + 139 / 32;                       // tengah panel papan nama di sepanjang fasad (1 petak = 32 px)
const DOOR = { id: "kopdes", x: SIGN_X, y: FP.y1 + 1.05, r: 1.45, icon: "🏪", label: "Kopdes" };
const W = 192, HH = 46, DX = 51, DY = -26;              // lebar fasad (px), tinggi dinding, geser ke belakang per kedalaman 1,6 petak
const OX = 40, OY = 108, SC = 2, CW = 300, CH = 236;     // kanvas luar-layar: titik asal fasad kiri-bawah, skala 2×

let cache = null;
function art() {
  if (cache) return cache;
  const cv = document.createElement("canvas"); cv.width = CW * SC; cv.height = CH * SC;
  const g = cv.getContext("2d"); g.scale(SC, SC); g.translate(OX, OY);
  const poly = (pts, fill, stroke) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); } };
  const F0 = [0, 0], R0 = [W, W / 2];                                         // sudut depan-kiri & depan-kanan (lantai)
  // bayangan & lantai semen depan
  poly([[-4, 3], [W + 6, W / 2 + 3], [W + DX + 10, W / 2 + DY + 9], [DX - 2, DY + 6]], "rgba(20,35,28,.20)");
  poly([[0, 0], [W, W / 2], [W - 29, W / 2 + 14], [-29, 14]], "#cfc9bc", "rgba(90,80,66,.35)");
  // dinding ujung kanan (menghadap timur)
  const E0 = [-3, -HH - 5], E1 = [W + 3, W / 2 - HH - 5 + 1.5], B0 = [E0[0] + DX + 3, E0[1] + DY - 22], B1 = [E1[0] + DX + 3, E1[1] + DY - 22];
  poly([R0, [R0[0] + DX, R0[1] + DY], [B1[0] - 6, B1[1] + 5], [E1[0] - 2, E1[1] + 5]], "#a7a39b", "rgba(40,36,30,.5)");   // dinding ujung penuh sampai bawah atap (tanpa celah segitiga)
  g.fillStyle = "rgba(0,0,0,.10)"; g.beginPath(); g.moveTo(R0[0], R0[1]); g.lineTo(R0[0] + DX, R0[1] + DY); g.lineTo(B1[0] - 6, B1[1] + 5); g.lineTo(E1[0] - 2, E1[1] + 5); g.closePath(); g.fill();
  // fasad: digambar datar lalu dimiringkan 0,5 (sejajar sumbu isometrik)
  g.save(); g.transform(1, 0.5, 0, 1, 0, 0);
  g.fillStyle = "#bdb9b1"; g.fillRect(0, -HH, W, HH);                         // dinding dasar
  g.fillStyle = "#1d2733"; g.fillRect(0, -HH - 4, W, 5);                      // bawah atap (bayangan)
  for (let i = 0; i < 5; i++) {                                               // lima pintu gulung merah-bata
    const x = 5 + i * 23.5; const gr = g.createLinearGradient(0, -HH + 9, 0, 0); gr.addColorStop(0, "#a2402f"); gr.addColorStop(1, "#7a2b22");
    g.fillStyle = "#e2ded6"; g.fillRect(x - 2, -HH + 6, 23, HH - 6);          // bingkai
    g.fillStyle = gr; g.fillRect(x, -HH + 8, 19, HH - 8);
    g.strokeStyle = "rgba(60,15,10,.45)"; g.lineWidth = 0.6; for (let y = -HH + 11; y < 0; y += 3.2) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 19, y); g.stroke(); }
    g.fillStyle = "#d9d5cc"; g.fillRect(x + 8, -3, 3, 1.6);                   // gagang
  }
  g.fillStyle = "#3b6db0"; g.fillRect(0, -HH, 123, 7); g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(0, -HH + 6, 123, 1);   // kanopi biru
  g.fillStyle = "#8d9096"; g.fillRect(123, -HH, 40, HH);                      // panel papan nama
  g.fillStyle = "#757880"; g.fillRect(123, -HH, 40, 3);
  g.fillStyle = "#d8483a"; g.beginPath(); g.moveTo(133, -HH + 18); g.lineTo(143, -HH + 9); g.lineTo(153, -HH + 18); g.lineTo(150, -HH + 18); g.lineTo(150, -HH + 27); g.lineTo(136, -HH + 27); g.lineTo(136, -HH + 18); g.closePath(); g.fill();   // rumah mungil (orisinal)
  g.fillStyle = "#f4efe6"; g.fillRect(141, -HH + 19, 4, 4);
  g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "bold 10px system-ui,sans-serif"; g.fillText("KOPDES", 143, -HH + 38);
  g.font = "5.2px system-ui,sans-serif"; g.fillStyle = "#e6e8ec"; g.fillText("Koperasi Desa · Pulau Para Legenda", 143, -HH + 43.5);
  g.fillStyle = "#e2ded6"; g.fillRect(163, -HH + 6, 29, HH - 6);              // bay pintu ganda di ujung
  for (let k = 0; k < 2; k++) { const x = 166 + k * 12.5; const gr = g.createLinearGradient(0, -HH + 9, 0, 0); gr.addColorStop(0, "#a2402f"); gr.addColorStop(1, "#6f2820"); g.fillStyle = gr; g.fillRect(x, -HH + 8, 11.5, HH - 8);
    g.strokeStyle = "rgba(60,15,10,.4)"; g.lineWidth = 0.6; for (let y = -HH + 12; y < 0; y += 3.6) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 11.5, y); g.stroke(); } }
  g.fillStyle = "#3b6db0"; g.fillRect(163, -HH, 29, 7);
  g.restore();
  // atap seng bergelombang: dataran miring dari tepi depan ke punggung atap
  poly([E0, E1, B1, B0], "#8e857d", "rgba(40,36,30,.5)");
  const n = 30; g.lineWidth = 0.8;
  for (let i = 1; i < n; i++) { const k = i / n, a = [E0[0] + (E1[0] - E0[0]) * k, E0[1] + (E1[1] - E0[1]) * k], b = [B0[0] + (B1[0] - B0[0]) * k, B0[1] + (B1[1] - B0[1]) * k];
    g.strokeStyle = i % 2 ? "rgba(255,255,255,.07)" : "rgba(40,30,24,.14)"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  poly([E0, E1, [E1[0], E1[1] + 6], [E0[0], E0[1] + 6]], "#3b6db0", "rgba(20,40,80,.6)");                       // tepi biru
  g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.moveTo(E0[0], E0[1] + 1); g.lineTo(E1[0], E1[1] + 1); g.lineWidth = 1; g.strokeStyle = "rgba(255,255,255,.4)"; g.stroke();
  poly([E1, B1, [B1[0] + 1, B1[1] + 5], [E1[0] + 1, E1[1] + 6]], "#6e665f");                                    // tebal atap sisi kanan
  g.strokeStyle = "rgba(60,52,46,.65)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(B0[0], B0[1]); g.lineTo(B1[0], B1[1]); g.stroke();   // bubungan
  cache = { cv, e0: E0, sx: SIGN_X };
  return cache;
}

const OD = (NW.objDraw = NW.objDraw || {});
OD.kopdes = (c, o, t, night) => {
  const b = NW.P(FP.x0, FP.y1, NW.LIFT), a = art();
  c.drawImage(a.cv, b.x - OX, b.y - OY, CW, CH);
  if (night > 0.25) {                                                          // lampu papan nama menyala malam hari (gradien murah)
    const p = NW.P(SIGN_X, FP.y1, NW.LIFT + 26), gr = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, 46);
    gr.addColorStop(0, `rgba(255,214,140,${0.5 * Math.min(1, night)})`); gr.addColorStop(1, "rgba(255,214,140,0)"); c.fillStyle = gr; c.fillRect(p.x - 46, p.y - 46, 92, 92);
  }
};

// Dipanggil sf2/area.js SEBELUM daftar tabrakan dibuat (M = {objects, solids}); titik beli & lampu ditambahkan area.js sendiri. Tanpa flag → tidak mengubah apa pun.
function install(M) {
  if (window.NUSA_KOPDES !== true) return false;
  const inFp = (o) => o.x > FP.x0 - 0.8 && o.x < FP.x1 + 0.8 && o.y > FP.y0 - 0.9 && o.y < FP.y1 + 2.9;
  for (let i = M.objects.length - 1; i >= 0; i--) if (["palm", "bush", "flowers", "rock", "crate", "searock"].includes(M.objects[i].kind) && inFp(M.objects[i])) M.objects.splice(i, 1);   // bersihkan tapak
  M.objects.push({ kind: "kopdes", x: (FP.x0 + FP.x1) / 2, y: FP.y1, big: 260 });
  M.solids.push({ x0: FP.x0, y0: FP.y0, x1: FP.x1, y1: FP.y1 });
  return true;
}
const LIGHT = { x: SIGN_X, y: FP.y1 + 0.2, z: 26, r: 40, col: "#ffd08a", k: 0.9 };
NW.kopdes = { FP, DOOR, LIGHT, install, art, on: () => window.NUSA_KOPDES === true };
})();
