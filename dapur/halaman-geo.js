// NUSA ISLAND — Ide 08E · Geometri & aturan penataan halaman sosial Rumahku. INTI MURNI: tanpa DOM, tanpa jaringan, tanpa waktu/acak.
// Dipakai SAMA PERSIS oleh klien (pratinjau & tombol Simpan) dan backend (satu-satunya yang menentukan; berkas yang sama disalin ke
// server/vendor/dapur-halaman-geo.cjs dan dicek lewat SHA-256 di kedua repo). Posisi tersimpan = di server; klien tidak menyimpan posisi sendiri.
// Blok GEO di bawah dibuat dari game asli (tests/dev/gen_halaman_geo.py); `--check` gagal bila Kota/Rumahku berubah → tata letak harus dites ulang.
(function (root) {
"use strict";
/*GEO:BEGIN*/
const GEO = {"PW":16,"PH":14,"pond":[9.6,11.8,14.4,13.4],"lv":{"1":{"s":[[6.8,1.7,9.2,3.9],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,4.35],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[6.8,1.7,9.2,3.9]},"2":{"s":[[6.5,1.7,9.5,4.2],[6.65,4.2,9.35,4.95],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,5.45],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[6.5,1.7,9.5,4.2]},"3":{"s":[[6.4,1.7,9.6,4.5],[6.55,4.5,9.45,5.35],[12.0,3.0,12.8,3.5],[2.0,8.4,3.8,9.4],[12.2,6.4,13.8,7.6],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,5.85],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[6.4,1.7,9.6,4.5]},"4":{"s":[[6.3,1.7,9.7,4.7],[6.45,4.7,9.55,5.55],[2.0,8.4,3.8,9.4],[12.2,6.4,13.8,7.6],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,6.62],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[6.3,1.7,9.7,4.7]},"5":{"s":[[6.1,1.7,9.9,4.9],[6.25,4.9,9.75,6.15],[2.0,8.4,3.8,9.4],[12.2,6.4,13.8,7.6],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,7.22],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[6.1,1.7,9.9,4.9]},"6":{"s":[[5.9,1.7,10.1,5.1],[6.05,5.1,9.95,6.25],[2.0,8.4,3.8,9.4],[12.2,6.4,13.8,7.6],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,7.54],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[5.9,1.7,10.1,5.1]},"7":{"s":[[5.6,1.7,10.4,5.3],[5.75,5.3,10.25,6.85],[12.6,2.4,14.2,3.8],[2.0,8.4,3.8,9.4],[12.2,6.4,13.8,7.6],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,8.14],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[5.6,1.7,10.4,5.3]},"8":{"s":[[5.4,1.7,10.6,5.5],[5.55,5.5,10.45,6.85],[12.6,2.4,14.2,3.8],[2.0,8.4,3.8,9.4],[12.2,6.4,13.8,7.6],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,8.36],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[5.4,1.7,10.6,5.5]},"9":{"s":[[5.2,1.7,10.8,5.7],[5.35,5.7,10.65,7.25],[1.2,2.2,3.2,4.2],[1.4,6.0,3.6,7.0],[12.0,6.0,14.2,7.2],[4.4,10.6,6.0,11.4],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,8.76],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[5.2,1.7,10.8,5.7]},"10":{"s":[[5.0,1.7,11.0,5.9],[5.15,5.9,10.85,7.65],[1.2,2.2,3.2,4.2],[10.8,9.6,13.6,11.4],[1.4,6.0,3.6,7.0],[12.0,6.0,14.2,7.2],[4.4,10.6,6.0,11.4],[1.65,12.55,1.95,12.85],[2.85,12.55,3.15,12.85],[5.25,10.45,5.55,10.75],[9.85,9.25,10.15,9.55]],"door":[8.0,9.38],"gate":[2.4,12.7],"sign":[5.4,10.6],"mail":[10.0,9.4],"house":[5.0,1.7,11.0,5.9]}}};
/*GEO:END*/

// ---------- katalog benda yang boleh dipindah (koordinat dasar = zona kiri; zona kanan digeser) ----------
const ZONES = { L: { dx: 0, dy: 0 }, R: { dx: 10.2, dy: -1.0 } };
const zoneOf = (lv) => (lv >= 9 ? ZONES.R : ZONES.L);
const CH = (i, x, y) => ({ id: "kursi" + i, name: "Kursi " + (i + 1), kind: "kursi", hw: 0.21, hd: 0.21, base: [x, y] });
const ITEMS = [
  { id: "meja", name: "Meja makan", kind: "meja", hw: 0.9, hd: 0.5, base: [2.9, 3.5] },
  CH(0, 2.45, 2.55), CH(1, 3.35, 2.55), CH(2, 2.45, 4.45), CH(3, 3.35, 4.45), CH(4, 1.5, 3.5), CH(5, 4.3, 3.5),
  { id: "bangku", name: "Bangku taman", kind: "bangku", hw: 0.65, hd: 0.225, base: [2.55, 5.925] },
  { id: "kopi", name: "Meja kopi", kind: "kopi", hw: 0.4, hd: 0.25, base: [3.9, 5.9] },
  { id: "payung", name: "Payung taman", kind: "tiang", hw: 0.12, hd: 0.12, base: [3.35, 5.92] },
  { id: "lampu", name: "Lampu gantung", kind: "tiang", hw: 0.12, hd: 0.12, base: [1.15, 2.4] },
  { id: "tanaman0", name: "Tanaman 1", kind: "tanaman", hw: 0.26, hd: 0.26, base: [4.75, 2.45] },
  { id: "tanaman1", name: "Tanaman 2", kind: "tanaman", hw: 0.26, hd: 0.26, base: [4.85, 5.95] },
];
const FIXED = [{ id: "nampan", name: "Nampan makanan", kind: "nampan", hw: 0.25, hd: 0.25, base: [4.75, 4.65] }];   // tidak bisa dipindah
const BY = {}; for (const it of ITEMS) BY[it.id] = it; for (const it of FIXED) BY[it.id] = it;
const IDS = ITEMS.map((i) => i.id);
const SEAT_DX = 0.3;                                   // dua tempat duduk di bangku: pusat ± SEAT_DX
const WALK_R = 0.25, CELL = 0.25, GAP = 0.03;
const clampLv = (lv) => Math.max(1, Math.min(10, Math.floor(+lv) || 1));
const q05 = (v) => Math.round(v * 20) / 20;           // kisi 0,05 petak
const fin = (v) => typeof v === "number" && isFinite(v);

const geoOf = (lv) => GEO.lv && GEO.lv[clampLv(lv)];
function defaults(lv) {
  const z = zoneOf(lv), o = {};
  for (const it of ITEMS) o[it.id] = [+(it.base[0] + z.dx).toFixed(3), +(it.base[1] + z.dy).toFixed(3)];
  return o;
}
function fixedAt(lv) { const z = zoneOf(lv), f = FIXED[0]; return { cx: f.base[0] + z.dx, cy: f.base[1] + z.dy, hw: f.hw, hd: f.hd, id: f.id }; }
const rectOf = (it, p) => ({ x0: p[0] - it.hw, y0: p[1] - it.hd, x1: p[0] + it.hw, y1: p[1] + it.hd });
const hit = (a, b, m) => a.x0 < b.x1 + (m || 0) && a.x1 > b.x0 - (m || 0) && a.y0 < b.y1 + (m || 0) && a.y1 > b.y0 - (m || 0);
const inRect = (x, y, r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
const R4 = (a) => ({ x0: a[0], y0: a[1], x1: a[2], y1: a[3] });
const grow = (r, d) => ({ x0: r.x0 - d, y0: r.y0 - d, x1: r.x1 + d, y1: r.y1 + d });

// penghalang tetap halaman pada level lv (rumah, teras, paviliun, kebun, gerbang, papan, kotak surat, kolam) — petak
function baseSolids(lv) { const g = geoOf(lv); return g ? g.s.map(R4).concat([R4(GEO.pond)]) : []; }
// zona yang TIDAK boleh ditaruh benda (tapi tetap bisa dilewati): belakang rumah, pelataran pintu, pelataran gerbang, papan, kotak surat
function keepOuts(lv) {
  const g = geoOf(lv); if (!g) return [];
  const h = R4(g.house), d = g.door, ga = g.gate, k = [];
  k.push({ id: "rumah", name: "rumah", x0: h.x0, y0: 0, x1: h.x1, y1: h.y1 + 0.1 });
  k.push({ id: "pintu", name: "pintu rumah", x0: d[0] - 1.1, y0: d[1] - 0.8, x1: d[0] + 1.1, y1: d[1] + 0.9 });
  k.push({ id: "gerbang", name: "gerbang", x0: ga[0] - 1.1, y0: ga[1] - 1.4, x1: ga[0] + 1.1, y1: ga[1] + 0.3 });
  k.push({ id: "papan", name: "papan renovasi", x0: g.sign[0] - 0.55, y0: g.sign[1] - 0.55, x1: g.sign[0] + 0.55, y1: g.sign[1] + 0.55 });
  k.push({ id: "surat", name: "kotak surat", x0: g.mail[0] - 0.55, y0: g.mail[1] - 0.55, x1: g.mail[0] + 0.55, y1: g.mail[1] + 0.55 });
  return k;
}
const walkBounds = () => ({ x0: 0.6, y0: 0.6, x1: GEO.PW - 0.6, y1: GEO.PH - 0.4 });
const isChair = (it) => it.kind === "kursi";
// benda yang menghalangi jalan (kursi tidak, agar pemain bisa duduk/berdiri tanpa terjebak)
const isSolid = (it) => !isChair(it);

// tempat duduk bangku
function seatsOf(p) { return [[p[0] - SEAT_DX, p[1]], [p[0] + SEAT_DX, p[1]]]; }

// kisi jangkauan dari gerbang: sel boleh dilewati bila di dalam batas jalan dan tidak dekat penghalang (radius WALK_R)
function reach(lv, items) {
  const g = geoOf(lv), wb = walkBounds(), W = Math.ceil(GEO.PW / CELL), H = Math.ceil(GEO.PH / CELL);
  const sol = baseSolids(lv); const fx = fixedAt(lv); sol.push({ x0: fx.cx - fx.hw, y0: fx.cy - fx.hd, x1: fx.cx + fx.hw, y1: fx.cy + fx.hd });
  for (const it of ITEMS) if (isSolid(it)) sol.push(rectOf(it, items[it.id]));
  const ok = (x, y) => { if (x < wb.x0 + WALK_R || y < wb.y0 + WALK_R || x > wb.x1 - WALK_R || y > wb.y1 - WALK_R) return false; for (const s of sol) if (x > s.x0 - WALK_R && x < s.x1 + WALK_R && y > s.y0 - WALK_R && y < s.y1 + WALK_R) return false; return true; };
  const cx = (i) => (i + 0.5) * CELL, ci = (v) => Math.floor(v / CELL);
  const seen = new Uint8Array(W * H), st = [];
  const sx = ci(g.gate[0]), sy = ci(g.gate[1] - 0.5);
  if (!ok(cx(sx), cx(sy))) return { ok: () => false, cells: seen, start: false, W, H, cx };
  seen[sy * W + sx] = 1; st.push([sx, sy]);
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx]) continue; if (!ok(cx(nx), cx(ny))) continue; seen[ny * W + nx] = 1; st.push([nx, ny]); } }
  // ada sel terjangkau dalam jarak rad dari (x,y)?
  const near = (x, y, rad) => { const i0 = Math.max(0, ci(x - rad)), i1 = Math.min(W - 1, ci(x + rad)), j0 = Math.max(0, ci(y - rad)), j1 = Math.min(H - 1, ci(y + rad)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (seen[j * W + i] && Math.hypot(cx(i) - x, cx(j) - y) <= rad) return true; return false; };
  return { ok: near, cells: seen, start: true, W, H, cx };
}
// titik & radius interaksi (sama dengan kait Rumahku 08D)
function interPoints(items) {
  const m = BY.meja, k = BY.kopi, pm = items.meja, pk = items.kopi, out = [];
  out.push({ id: "meja", x: pm[0], y: pm[1] + m.hd + 0.95, r: 1.25 * 0.85 }, { id: "kopi", x: pk[0], y: pk[1] + k.hd + 0.45, r: 1.0 * 0.85 });
  for (const it of ITEMS) if (isChair(it)) out.push({ id: it.id, x: items[it.id][0], y: items[it.id][1], r: 0.8 * 0.85 });
  const bs = seatsOf(items.bangku); out.push({ id: "bangku", x: bs[0][0], y: bs[0][1], r: 0.68 }, { id: "bangku", x: bs[1][0], y: bs[1][1], r: 0.68 });
  const f = fixedAt(1); void f; return out;
}

// validasi seluruh susunan. items = { id: [x,y] } lengkap. Hasil: {ok, errors:[{id,msg}]}
function validate(lv, items) {
  const err = [], add = (id, msg) => { if (!err.some((e) => e.id === id && e.msg === msg)) err.push({ id, msg }); };
  lv = clampLv(lv); if (!geoOf(lv)) return { ok: false, errors: [{ id: "*", msg: "Data halaman tidak tersedia." }] };
  const wb = walkBounds(), base = baseSolids(lv), keeps = keepOuts(lv), fx = fixedAt(lv), fxr = { x0: fx.cx - fx.hw, y0: fx.cy - fx.hd, x1: fx.cx + fx.hw, y1: fx.cy + fx.hd };
  const rects = {};
  for (const it of ITEMS) {
    const p = items[it.id]; if (!Array.isArray(p) || p.length !== 2 || !fin(p[0]) || !fin(p[1])) { add(it.id, it.name + ": posisi tidak valid."); continue; }
    rects[it.id] = rectOf(it, p); const r = rects[it.id];
    if (r.x0 < wb.x0 || r.y0 < wb.y0 || r.x1 > wb.x1 || r.y1 > wb.y1) add(it.id, it.name + " di luar batas halaman.");
    for (const s of base) if (hit(r, s, GAP)) { add(it.id, it.name + " menabrak bangunan atau benda halaman."); break; }
    for (const k of keeps) if (hit(r, k, 0)) { add(it.id, it.name + " menutup area " + k.name + "."); break; }
    if (hit(r, fxr, GAP)) add(it.id, it.name + " menabrak nampan makanan.");
  }
  if (err.length) return { ok: false, errors: err };
  for (let i = 0; i < ITEMS.length; i++) for (let j = i + 1; j < ITEMS.length; j++) {
    const a = ITEMS[i], b = ITEMS[j], ra = rects[a.id], rb = rects[b.id];
    if (isChair(a) && isChair(b)) { const pa = items[a.id], pb = items[b.id]; if (Math.max(Math.abs(pa[0] - pb[0]), Math.abs(pa[1] - pb[1])) < 0.5) add(b.id, b.name + " menumpuk di " + a.name + "."); }
    else if (hit(ra, rb, GAP)) add(b.id, b.name + " menumpuk di " + a.name + ".");
  }
  // tempat duduk bangku tidak boleh tertutup benda lain
  for (const [sx, sy] of seatsOf(items.bangku)) for (const it of ITEMS) { if (it.id === "bangku") continue; if (inRect(sx, sy, grow(rects[it.id], isChair(it) ? 0.15 : 0.05))) add("bangku", "Tempat duduk bangku tertutup " + it.name + "."); }
  if (err.length) return { ok: false, errors: err };
  // jalur: dari gerbang harus bisa sampai ke pintu & ke semua benda yang bisa dipakai
  const R = reach(lv, items), g = geoOf(lv);
  if (!R.start) return { ok: false, errors: [{ id: "*", msg: "Gerbang tertutup." }] };
  if (!R.ok(g.door[0], g.door[1], 0.9)) add("*", "Jalan dari gerbang ke pintu rumah tertutup.");
  for (const p of interPoints(items)) if (!R.ok(p.x, p.y, p.r)) add(p.id, (BY[p.id] ? BY[p.id].name : p.id) + " tidak bisa dijangkau pemain.");
  return { ok: err.length === 0, errors: err };
}
function normItems(lv, saved) {   // ambil hanya id dikenal dengan angka sah, dibulatkan ke kisi
  const o = {}; if (!saved || typeof saved !== "object") return o;
  for (const id of IDS) { const p = saved[id]; if (Array.isArray(p) && p.length === 2 && fin(p[0]) && fin(p[1])) o[id] = [q05(p[0]), q05(p[1])]; }
  return o;
}
// susunan efektif pada level lv: bawaan + timpaan tersimpan yang sah. Seluruh timpaan sah → dipakai semua; bila tidak (mis. level naik) → satu per satu, yang gagal dilewati.
function resolve(lv, saved) {
  const def = defaults(lv), ov = normItems(lv, saved), keys = Object.keys(ov);
  if (!keys.length) return { items: def, rejected: [] };
  const all = Object.assign({}, def, ov);
  if (validate(lv, all).ok) return { items: all, rejected: [] };
  let cur = Object.assign({}, def); const rejected = [];
  for (const id of IDS) { if (!ov[id]) continue; const t = Object.assign({}, cur, { [id]: ov[id] }); if (validate(lv, t).ok) cur = t; else rejected.push(id); }
  return { items: cur, rejected };
}
// hanya yang berbeda dari bawaan (yang disimpan di server)
function diffFromDefault(lv, items) { const def = defaults(lv), o = {}; for (const id of IDS) { const p = items[id], d = def[id]; if (p && (Math.abs(p[0] - d[0]) > 1e-6 || Math.abs(p[1] - d[1]) > 1e-6)) o[id] = [q05(p[0]), q05(p[1])]; } return o; }

const API = { ITEMS, FIXED, IDS, BY, ZONES, zoneOf, defaults, fixedAt, rectOf, seatsOf, SEAT_DX, validate, resolve, normItems, diffFromDefault, baseSolids, keepOuts, walkBounds, q05, clampLv, GEO, MAX_SAVED: ITEMS.length };
if (typeof module !== "undefined" && module.exports) module.exports = API; else { root.NW = root.NW || {}; root.NW.dapurGeo = API; }
})(typeof window !== "undefined" ? window : globalThis);
