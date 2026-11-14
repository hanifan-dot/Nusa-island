// NUSA ISLAND — Ide 08D · Halaman Sosial Rumahku: tata letak TETAP area makan & nongkrong di halaman depan (gambar + geometri). Tanpa jaringan, tanpa data pemain.
// Tata letak dipilih oleh level rumah (zona kiri untuk Lv 1–8, zona kanan untuk Lv 9–10) supaya TIDAK menutup pintu, jalur batu, papan, kotak surat, kolam, kebun, paviliun
// atau objek lain yang sudah ada. Posisi TIDAK disimpan di mana pun (bukan data pemain): placement bebas = pekerjaan 08E.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), A = NW.dapurArt; if (!A || !NW.dapurGeo) return;
const P = A.P, shade = A.shade, fill = A.fill, line = A.line, ell = A.ell, TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- geometri (satuan petak halaman 16×14) ----------
// Koordinat dasar zona kiri; zona kanan = geser (dx, dy). Alasan geser: Lv 9–10 punya paviliun & taman di kiri, Lv 3–8 punya kebun/gudang/rak di kanan.
const ZONE = { L: { dx: 0, dy: 0 }, R: { dx: 10.2, dy: -1.0 } };
const zoneOf = (lv) => (lv >= 9 ? ZONE.R : ZONE.L);
const GEO = NW.dapurGeo;   // aturan & posisi bawaan (berkas inti yang sama dengan backend)
const CHAIRS = [   // id, arah hadap bawaan (untuk dokumentasi/tes); posisi sebenarnya dari tata letak
  { id: 0, face: "s" }, { id: 1, face: "s" }, { id: 2, face: "n" }, { id: 3, face: "n" }, { id: 4, face: "e" }, { id: 5, face: "w" }, { id: 6, face: "n" }, { id: 7, face: "n" },
];
const SLOT_OFF = [[-0.6, -0.3], [0, -0.3], [0.6, -0.3], [-0.6, 0.3], [0, 0.3], [0.6, 0.3]];   // 6 slot makanan di atas meja (3×2), relatif pusat meja
const TZ = 22, seatDir = { s: 3, n: 7, e: 1, w: 5 };
// Posisi benda = DARI SERVER (halaman.items efektif) atau bawaan. Tidak ada penyimpanan lokal; null = bawaan.
let ITEMS_NOW = null, ITEMS_LV = null, CACHE = null;
function setItems(it, lv) { ITEMS_NOW = it && typeof it === "object" ? it : null; ITEMS_LV = ITEMS_NOW && lv ? GEO.clampLv(lv) : null; CACHE = null; }   // susunan hanya berlaku pada level yang dipakai saat memeriksanya
const itemsNow = () => ITEMS_NOW;
const R4 = (c, hw, hd) => ({ x0: c[0] - hw, y0: c[1] - hd, x1: c[0] + hw, y1: c[1] + hd });
function layout(lv, itemsArg) {
  const own = ITEMS_NOW && (ITEMS_LV == null || ITEMS_LV === GEO.clampLv(lv)) ? ITEMS_NOW : null;
  const it = itemsArg || own || GEO.defaults(lv), key = !itemsArg && lv + "|" + (own ? JSON.stringify(own) : "");
  if (key && CACHE && CACHE.key === key) return CACHE.L;
  const z = zoneOf(lv), B = GEO.BY, tb = it.meja, tcx = tb[0], tcy = tb[1];
  const faceOf = (x, y) => { const dx = tcx - x, dy = tcy - y; return Math.abs(dy) >= Math.abs(dx) ? (dy >= 0 ? "s" : "n") : (dx >= 0 ? "e" : "w"); };
  const chairs = [];
  for (let i = 0; i < 6; i++) { const p = it["kursi" + i], f = faceOf(p[0], p[1]); chairs.push({ id: i, face: f, x: p[0], y: p[1], dir: seatDir[f], bench: false }); }
  const bs = GEO.seatsOf(it.bangku); for (let j = 0; j < 2; j++) chairs.push({ id: 6 + j, face: "n", x: bs[j][0], y: bs[j][1], dir: seatDir.n, bench: true });
  const fx = GEO.fixedAt(lv), nampanPt = { x: fx.cx, y: fx.cy + 0.5 };
  const L = {
    z, items: it, table: R4(tb, B.meja.hw, B.meja.hd), tz: TZ,
    slots: SLOT_OFF.map(([dx, dy], i) => ({ x: tcx + dx, y: tcy + dy, s: i })),
    chairs, coffee: R4(it.kopi, B.kopi.hw, B.kopi.hd), bench: R4(it.bangku, B.bangku.hw, B.bangku.hd), stand: { x0: fx.cx - fx.hw, y0: fx.cy - fx.hd, x1: fx.cx + fx.hw, y1: fx.cy + fx.hd },
    lamp: { x: it.lampu[0], y: it.lampu[1] }, umbrella: { x: it.payung[0], y: it.payung[1] }, umbC: { x: it.payung[0], y: it.payung[1] },
    plants: [{ x: it.tanaman0[0], y: it.tanaman0[1] }, { x: it.tanaman1[0], y: it.tanaman1[1] }],
    meja: { x: tcx, y: tcy + B.meja.hd + 0.95 }, nampan: nampanPt, kopi: { x: it.kopi[0], y: it.kopi[1] + B.kopi.hd + 0.45 },
  };
  if (key) CACHE = { key, L };
  return L;
}
// penghalang jalan (petak). Kursi sengaja TIDAK menghalangi (supaya pemain bisa duduk & berdiri tanpa terjebak).
function solids(lv) {
  const L = layout(lv), s = [L.table, L.coffee, L.bench, L.stand];
  const sm = (p, r) => ({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });
  s.push(sm(L.lamp, 0.12), sm(L.umbrella, 0.12), ...L.plants.map((p) => sm(p, 0.26)));
  return s;
}
const blocked = (x, y, r, lv) => { for (const s of solids(lv)) if (x > s.x0 - r && x < s.x1 + r && y > s.y0 - r && y < s.y1 + r) return true; return false; };

// ---------- gambar ----------
const WOOD = "#9a6a3c", WOOD2 = "#7a5230", CLOTH = "#e9dcc0", RED = "#c8603a", TEAL = "#2f8f7a", MUSTARD = "#e8b53a";
function foodKind(name) {
  const n = String(name || "").toLowerCase();
  if (/kopi/.test(n)) return "kopi"; if (/sup/.test(n)) return "sup"; if (/nasi/.test(n)) return "nasi"; if (/telur rebus/.test(n)) return "rebus"; if (/telur|ceplok/.test(n)) return "ceplok";
  if (/tempe/.test(n)) return "tempe"; if (/tumis|sayur/.test(n)) return "sayur"; if (/ikan|sambal/.test(n)) return "ikan"; return "umum";
}
// piring + isi di titik layar (px,py); k = skala; frac = sisa porsi 0..1 (untuk ukuran isi); tier warna sedikit pudar bila 'aneh'
function plate(c, px, py, k, kind, tier, frac, empty) {
  ell(c, px, py + 1.2 * k, 11 * k, 5.2 * k, "rgba(0,0,0,.2)"); ell(c, px, py, 10.5 * k, 4.9 * k, "#fbfbf6"); c.strokeStyle = "#3a73b8"; c.lineWidth = 1 * k; c.beginPath(); c.ellipse(px, py, 8.2 * k, 3.6 * k, 0, 0, TAU); c.stroke();
  if (empty || frac <= 0) return;
  const f = 0.55 + 0.45 * clamp(frac, 0, 1), dim = tier === "aneh" ? 0.18 : 0;
  const col = (h) => (dim ? A.mix(h, "#8c8a78", dim) : h);
  if (kind === "ceplok") { ell(c, px, py - 0.6 * k, 7 * k * f, 3.1 * k * f, "#fffdf2"); ell(c, px - 0.5 * k, py - 1.6 * k, 2.6 * k, 2 * k, col("#f2a81f")); }
  else if (kind === "rebus") { for (const dx of [-3.4, 3.4]) { ell(c, px + dx * k, py - 1.6 * k, 3.4 * k * f, 4 * k * f, "#fffdf2"); ell(c, px + dx * k, py - 1.1 * k, 1.8 * k * f, 2.2 * k * f, col("#f2c04a")); } }
  else if (kind === "nasi") { ell(c, px, py - 1.6 * k, 6.6 * k * f, 4.4 * k * f, col("#f8efd0")); ell(c, px - 1 * k, py - 3.6 * k, 3.2 * k, 1.8 * k, col("#e9a53a")); ell(c, px + 2.6 * k, py - 2.6 * k, 1.6 * k, 1 * k, col("#d94f3d")); }
  else if (kind === "sup") { ell(c, px, py - 0.8 * k, 7.4 * k * f, 3.4 * k * f, col("#d9a23a")); ell(c, px - 2 * k, py - 1.2 * k, 1.5 * k, 1 * k, col("#6aa64e")); ell(c, px + 2.4 * k, py - 0.6 * k, 1.5 * k, 1 * k, col("#6aa64e")); }
  else if (kind === "tempe") { for (const [dx, dy] of [[-3, 0], [0.4, -1.4], [3.2, 0.4]]) { c.save(); c.translate(px + dx * k, py + dy * k - 1 * k); c.rotate(-0.25); c.fillStyle = col("#d9a63e"); c.fillRect(-3 * k * f, -1.6 * k, 6 * k * f, 3.2 * k); c.fillStyle = col("#b9792a"); c.fillRect(-3 * k * f, 0.6 * k, 6 * k * f, 1 * k); c.restore(); } }
  else if (kind === "sayur") { for (const [dx, dy, r] of [[-3, 0, 3.4], [2, -1.6, 3.6], [3.6, 0.6, 2.6], [-0.4, 0.8, 2.8]]) ell(c, px + dx * k, py + dy * k - 1.2 * k, r * k * f, r * 0.62 * k * f, col(["#58a846", "#7bc25a"][(dx > 0) | 0])); ell(c, px + 1 * k, py - 2.4 * k, 1.2 * k, 0.9 * k, col("#d94f3d")); }
  else if (kind === "ikan") { c.save(); c.translate(px, py - 1.4 * k); c.fillStyle = col("#c98a3f"); c.beginPath(); c.ellipse(0, 0, 6.6 * k * f, 2.9 * k * f, -0.06, 0, TAU); c.fill(); c.beginPath(); c.moveTo(5.4 * k * f, 0); c.lineTo(8.6 * k * f, -2.6 * k * f); c.lineTo(8.6 * k * f, 2.6 * k * f); c.closePath(); c.fill(); c.fillStyle = "#2a2420"; c.beginPath(); c.arc(-3.8 * k * f, -0.5 * k, 0.7 * k, 0, TAU); c.fill(); c.restore(); ell(c, px - 4 * k, py + 0.4 * k, 1.8 * k, 1 * k, col("#6aa64e")); }
  else if (kind === "kopi") { ell(c, px, py - 0.4 * k, 5.2 * k, 2.4 * k, "#fbfbf6"); ell(c, px, py - 1.2 * k, 3.6 * k, 1.5 * k, col("#6b4527")); }
  else { ell(c, px, py - 1.4 * k, 6 * k * f, 3.6 * k * f, col("#c9a45c")); ell(c, px + 1 * k, py - 2.2 * k, 2 * k, 1.2 * k, col("#a98f58")); }
}
function chairItem(L, ch, occupied, night) {
  return {
    d: ch.x + ch.y + (ch.bench ? 0.3 : 0), draw: (c) => {
      const s = 0.42, r = { x0: ch.x - s / 2, y0: ch.y - s / 2, x1: ch.x + s / 2, y1: ch.y + s / 2 };
      if (ch.bench) return;                                   // bangku digambar sebagai satu benda (lihat benchItem)
      const wood = ch.id % 2 ? "#a8743f" : "#8a5a32";
      for (const [x, y] of [[r.x0 + 0.04, r.y0 + 0.04], [r.x1 - 0.04, r.y0 + 0.04], [r.x0 + 0.04, r.y1 - 0.04], [r.x1 - 0.04, r.y1 - 0.04]]) line(c, P(x, y, 0), P(x, y, 11), shade(wood, -0.3), 2.2);
      if (ch.face === "s" || ch.face === "e") A.woodBox(c, { x0: r.x0, y0: r.y0 - 0.06, x1: r.x1, y1: r.y0 }, 11, 15, wood);                // sandaran di belakang (menjauh dari meja)
      if (ch.face === "e") A.woodBox(c, { x0: r.x0 - 0.06, y0: r.y0, x1: r.x0, y1: r.y1 }, 11, 15, wood);
      A.woodBox(c, r, 9, 3, wood);
      fill(c, [P(r.x0 + 0.03, r.y0 + 0.03, 12.2), P(r.x1 - 0.03, r.y0 + 0.03, 12.2), P(r.x1 - 0.03, r.y1 - 0.03, 12.2), P(r.x0 + 0.03, r.y1 - 0.03, 12.2)], [TEAL, RED, MUSTARD, "#4a8fc8", "#b66a8c", "#6aa64e"][ch.id % 6]);
      if (ch.face === "n" || ch.face === "w") { const p0 = P(ch.face === "n" ? r.x0 : r.x1, ch.face === "n" ? r.y1 : r.y0, 12), p1 = P(ch.face === "n" ? r.x1 : r.x1, ch.face === "n" ? r.y1 : r.y1, 12); void p0; void p1; line(c, P(r.x0, r.y1, 12), P(r.x1, r.y1, 12), shade(wood, 0.2), 1.6); }   // lis depan
    },
  };
}
function benchItem(L) {
  const b = L.bench;
  return { d: (b.x0 + b.x1) / 2 + b.y1 + 0.05, draw: (c) => {
    for (const x of [b.x0 + 0.1, b.x1 - 0.1]) A.woodBox(c, { x0: x - 0.05, y0: b.y0 + 0.05, x1: x + 0.05, y1: b.y1 - 0.05 }, 0, 9, WOOD2);
    A.woodBox(c, b, 9, 3, WOOD); A.woodBox(c, { x0: b.x0, y0: b.y0 - 0.05, x1: b.x1, y1: b.y0 }, 12, 16, "#8a5a32");
    for (let i = 0; i < 4; i++) { const x = b.x0 + 0.12 + i * (b.x1 - b.x0 - 0.24) / 3; line(c, P(x, b.y0 - 0.02, 14), P(x, b.y0 - 0.02, 27), "rgba(60,36,16,.4)", 1); }
  } };
}
function tableItem(L, S, t, night) {
  const T = L.table;
  return { d: (T.x0 + T.x1) / 2 + (T.y0 + T.y1) / 2 + 0.2, draw: (c) => {
    for (const [x, y] of [[T.x0 + 0.1, T.y0 + 0.1], [T.x1 - 0.1, T.y0 + 0.1], [T.x0 + 0.1, T.y1 - 0.1], [T.x1 - 0.1, T.y1 - 0.1]]) A.woodBox(c, { x0: x - 0.07, y0: y - 0.07, x1: x + 0.07, y1: y + 0.07 }, 0, TZ - 3, WOOD2);
    A.woodBox(c, T, TZ - 4, 4, WOOD);
    const top = [P(T.x0, T.y0, TZ), P(T.x1, T.y0, TZ), P(T.x1, T.y1, TZ), P(T.x0, T.y1, TZ)];   // taplak
    fill(c, [P(T.x0 + 0.05, T.y0 + 0.05, TZ + 0.2), P(T.x1 - 0.05, T.y0 + 0.05, TZ + 0.2), P(T.x1 - 0.05, T.y1 - 0.05, TZ + 0.2), P(T.x0 + 0.05, T.y1 - 0.05, TZ + 0.2)], CLOTH);
    for (let i = 0; i < 7; i++) { const x = T.x0 + 0.12 + i * (T.x1 - T.x0 - 0.24) / 6; line(c, P(x, T.y0 + 0.05, TZ + 0.3), P(x, T.y1 - 0.05, TZ + 0.3), "rgba(200,96,58,.38)", 1.2); }
    void top;
    // sendok & gelas di tepi (tidak bergantung pada makanan)
    for (const [x, y] of [[T.x0 + 0.22, T.y1 - 0.14], [T.x1 - 0.22, T.y1 - 0.14]]) { const p = P(x, y, TZ + 1); c.fillStyle = "rgba(200,235,244,.85)"; c.fillRect(p.x - 2.6, p.y - 7, 5.2, 7); c.strokeStyle = "rgba(23,63,80,.5)"; c.lineWidth = 0.7; c.strokeRect(p.x - 2.6, p.y - 7, 5.2, 7); }
    for (let i = 0; i < 6; i++) { const s = L.slots[i], p = P(s.x, s.y, TZ + 0.6), it = S && S.table ? S.table.find((x) => x.s === i) : null, ex = S && S.empty && S.empty[i] && S.empty[i] > Date.now();
      if (!it && !ex) { c.strokeStyle = "rgba(255,255,255,.55)"; c.setLineDash([2, 2]); c.lineWidth = 1; c.beginPath(); c.ellipse(p.x, p.y, 8, 3.6, 0, 0, TAU); c.stroke(); c.setLineDash([]); continue; }
      plate(c, p.x, p.y, 0.92, it ? foodKind(it.name) : "umum", it ? it.tier : "enak", it ? it.left / Math.max(1, it.total) : 0, !it);
      if (it) { for (let k = 0; k < it.total; k++) { c.fillStyle = k < it.left ? "#2fb39a" : "rgba(23,63,80,.28)"; c.beginPath(); c.arc(p.x - (it.total - 1) * 2.4 + k * 4.8, p.y + 7.4, 1.6, 0, TAU); c.fill(); } if (it.tier === "aneh") { c.fillStyle = "#173f50"; c.font = "800 9px system-ui"; c.textAlign = "center"; c.fillText("?", p.x + 10, p.y - 9); } }
      }
  } };
}
function trayStandItem(L, S, t) {
  const r = L.stand;
  return { d: (r.x0 + r.x1) / 2 + r.y1 + 0.1, draw: (c) => {
    A.woodBox(c, r, 0, 16, "#a8743f");
    const m = P((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 17.5); ell(c, m.x, m.y, 13, 6.2, "#8d9192"); ell(c, m.x, m.y - 0.8, 11.4, 5.2, "#c9d2d4");
    const n = S && S.dishes ? Math.min(3, S.dishes.length) : 0;
    for (let i = 0; i < n; i++) plate(c, m.x - 6 + i * 6, m.y - 2 - (i === 1 ? 1 : 0), 0.42, foodKind(S.dishes[i].name), S.dishes[i].tier, 1, false);
    if (!n) { c.fillStyle = "rgba(23,63,80,.5)"; c.font = "800 8px system-ui"; c.textAlign = "center"; c.fillText("nampan", m.x, m.y + 2.5); }
    const lb = P((r.x0 + r.x1) / 2, r.y1, 8); c.fillStyle = "#173f50"; c.font = "800 7px system-ui"; c.textAlign = "center"; void lb;
  } };
}
function coffeeItem(L, t, S) {
  const r = L.coffee;
  return { d: (r.x0 + r.x1) / 2 + r.y1 + 0.1, draw: (c) => {
    A.woodBox(c, { x0: r.x0 + 0.08, y0: r.y0 + 0.08, x1: r.x1 - 0.08, y1: r.y1 - 0.08 }, 0, 12, WOOD2); A.woodBox(c, r, 12, 4, "#b98a52");
    const mid = P((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 16.5);
    for (const dx of [-8, 8]) { ell(c, mid.x + dx, mid.y + 1, 5.4, 2.4, "#fbfbf6"); c.fillStyle = "#fbfbf6"; c.fillRect(mid.x + dx - 3.6, mid.y - 5, 7.2, 6); ell(c, mid.x + dx, mid.y - 5, 3.6, 1.5, "#6b4527");
      if (!S || !S.calm) { c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1; for (let k = 0; k < 2; k++) { const ph = t * 1.6 + k * 2 + dx; c.beginPath(); c.moveTo(mid.x + dx - 1 + k * 2, mid.y - 7); c.quadraticCurveTo(mid.x + dx - 3 + Math.sin(ph) * 2 + k * 3, mid.y - 12, mid.x + dx + Math.sin(ph + 1) * 2 + k * 2, mid.y - 16); c.stroke(); } } }
    ell(c, mid.x, mid.y + 2.4, 2.4, 1.2, "#e8b53a");
  } };
}
function lampItem(L, t, night) {      // tiang lampu dengan lengan; lampu gantung menggantung di atas meja
  const lp = L.lamp, T = L.table, tx = (T.x0 + T.x1) / 2, ty = (T.y0 + T.y1) / 2, ddx = tx - lp.x, ddy = ty - lp.y, dd = Math.hypot(ddx, ddy) || 1, kk = Math.min(dd, 2.3) / dd, cx = lp.x + ddx * kk, cy = lp.y + ddy * kk;   // lengan lampu paling panjang 2,3 petak (menuju meja)
  return [
    { d: lp.x + lp.y + 0.1, draw: (c) => { line(c, P(lp.x, lp.y, 0), P(lp.x, lp.y, 118), "#4a2e18", 4); ell(c, P(lp.x, lp.y, 1).x, P(lp.x, lp.y, 1).y, 7, 3, "#4a2e18"); line(c, P(lp.x, lp.y, 118), P(cx, cy, 118), "#4a2e18", 2.6); } },
    { d: cx + cy + 1.6, draw: (c) => {
      const top = P(cx, cy, 118), bulb = P(cx, cy, 88), sw = Math.sin(t * 1.3) * 0.8;
      line(c, top, { x: bulb.x + sw, y: bulb.y - 9 }, "#2c3a40", 1.2);
      c.fillStyle = "#e0b84c"; c.beginPath(); c.moveTo(bulb.x + sw - 13, bulb.y); c.lineTo(bulb.x + sw + 13, bulb.y); c.lineTo(bulb.x + sw + 6, bulb.y - 10); c.lineTo(bulb.x + sw - 6, bulb.y - 10); c.closePath(); c.fill();
      ell(c, bulb.x + sw, bulb.y + 1.6, 4.4, 3.2, night > 0.3 ? "#fff1c4" : "#f3e7c9");
      for (let i = -2; i <= 2; i++) { const a = P(cx + i * 0.5, cy - 0.5, 117), b2 = P(cx + (i + 1) * 0.5, cy - 0.5, 117); void a; void b2; }
    } },
  ];
}
function umbrellaItem(L, night) {
  const u = L.umbrella, cc = L.umbC;
  return [
    { d: u.x + u.y + 0.1, draw: (c) => { line(c, P(u.x, u.y, 0), P(u.x, u.y, 74), "#7a5230", 3.4); ell(c, P(u.x, u.y, 1).x, P(u.x, u.y, 1).y, 8, 3.2, "#5a3a20"); } },
    { d: cc.x + cc.y + 1.5, draw: (c) => {
      const top = P(cc.x, cc.y, 76), rx = 48, ry = 20;
      ell(c, top.x, top.y + 4, rx, ry, "rgba(0,0,0,.14)");
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "#f6e5c8" : RED; c.beginPath(); c.moveTo(top.x, top.y - 9); c.ellipse(top.x, top.y, rx, ry, 0, (i * TAU) / 8, ((i + 1) * TAU) / 8); c.closePath(); c.fill(); }
      c.strokeStyle = "rgba(60,30,16,.45)"; c.lineWidth = 1; c.beginPath(); c.ellipse(top.x, top.y, rx, ry, 0, 0, TAU); c.stroke();
      c.fillStyle = "#7a5230"; c.beginPath(); c.arc(top.x, top.y - 9, 2.4, 0, TAU); c.fill();
    } },
  ];
}
function plantItem(p, i, t, calm) {
  return { d: p.x + p.y + 0.1, draw: (c) => {
    const g = P(p.x, p.y, 0); A.woodBox(c, { x0: p.x - 0.2, y0: p.y - 0.2, x1: p.x + 0.2, y1: p.y + 0.2 }, 0, 12, "#b5562f");
    const sw = calm ? 0 : Math.sin(t * 1.4 + i) * 1.4;
    for (const [dx, dy, r, col] of [[-9, -22, 9, "#3f8a3e"], [9, -24, 9, "#4f9a46"], [0, -34, 10, "#58a846"], [-3, -16, 8, "#4f9a46"], [6, -14, 7, "#3f8a3e"]]) ell(c, g.x + dx + sw * (-dy / 30), g.y + dy, r, r * 0.62, col);
    ell(c, g.x + 2 + sw, g.y - 38, 2.4, 2.4, i ? "#f6a6b2" : "#f0c75a");
  } };
}
// lapisan penataan (hanya saat pemilik mengatur): kotak jejak tiap benda; terpilih tebal; merah bila melanggar aturan
function editLayer(L, E) {
  return { d: 9999, draw: (c) => {
    c.save(); c.lineJoin = "round";
    for (const it of GEO.ITEMS) {
      const p = E.work[it.id]; if (!p) continue; const r = GEO.rectOf(it, p), sel = E.sel === it.id, bad = E.bad[it.id] || E.bad["*"] && sel;
      const q = [P(r.x0, r.y0, 0), P(r.x1, r.y0, 0), P(r.x1, r.y1, 0), P(r.x0, r.y1, 0)];
      c.beginPath(); c.moveTo(q[0].x, q[0].y); for (let i = 1; i < 4; i++) c.lineTo(q[i].x, q[i].y); c.closePath();
      c.fillStyle = bad ? "rgba(214,69,69,.30)" : sel ? "rgba(47,179,154,.28)" : "rgba(255,255,255,.10)"; c.fill();
      c.lineWidth = sel ? 2.6 : 1.2; c.strokeStyle = bad ? "#d64545" : sel ? "#1fa88f" : "rgba(255,255,255,.7)"; c.setLineDash(sel ? [] : [3, 3]); c.stroke(); c.setLineDash([]);
      if (sel) { const m = P(p[0], p[1], 34); c.font = "800 11px system-ui"; c.textAlign = "center"; c.lineWidth = 3; c.strokeStyle = "rgba(255,255,255,.9)"; c.strokeText(it.name, m.x, m.y); c.fillStyle = bad ? "#a82424" : "#0f6b5a"; c.fillText(it.name, m.x, m.y); }
    }
    c.restore();
  } };
}
// semua benda halaman (siang & malam; lampu hangat ditambah di glow)
function items(lv, t, night, S) {
  const L = layout(lv), out = [];
  if (S && S.edit) out.push(editLayer(L, S.edit));
  const occ = S && S.occupied ? S.occupied : {};
  for (const ch of L.chairs) if (!ch.bench) out.push(chairItem(L, ch, !!occ[ch.id], night));
  out.push(benchItem(L), tableItem(L, S, t, night), trayStandItem(L, S, t), coffeeItem(L, t, S), ...lampItem(L, t, night), ...umbrellaItem(L, night));
  L.plants.forEach((p, i) => out.push(plantItem(p, i, t, S && S.calm)));
  return out;
}
// cahaya hangat malam (mode 'lighter'); a = kekuatan 0..1. Ringan: tiga gradasi radial saja.
function glow(ctx, lv, a) {
  if (!(a > 0.02)) return; const L = layout(lv), T = L.table, cx = (T.x0 + T.x1) / 2, cy = (T.y0 + T.y1) / 2;
  NW.lightAt(ctx, cx, cy, 86, 140, "#ffb15c", clamp(a * 0.9, 0, 0.8));
  NW.lightAt(ctx, L.coffee.x0 + 0.4, L.coffee.y0 + 0.25, 22, 52, "#ffc27a", clamp(a * 0.6, 0, 0.6));
  NW.lightAt(ctx, L.lamp.x, L.lamp.y, 112, 60, "#ffd08a", clamp(a * 0.5, 0, 0.5));
}
NW.dapurHalaman = { layout, solids, blocked, items, glow, plate, foodKind, zoneOf, CHAIRS, TZ, setItems, itemsNow, GEO };
})();
