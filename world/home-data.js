// =========================================================
//  NUSA ISLAND — data & logika Rumahku (tanpa tampilan)
//  - Skema rumah "instanced" yang siap untuk multiplayer di masa depan
//  - 10 level rumah kampung Nusantara
//  - Penempatan perabot (grid, tabrakan, jalan tidak tertutup)
//  - Inventaris ikan aman: setiap ikan punya uid, dipindah (bukan disalin)
//  Modul ini murni logika supaya bisa diuji tanpa browser.
// =========================================================
(function (root) {
"use strict";

const HOME_VERSION = 2;
const SNAP = 0.5;          // grid penempatan perabot (tile)
const PR = 0.22;           // radius pemain
const CELL = 0.25;         // resolusi pengecekan jalan

// ---------- 10 level rumah ----------
// room: ukuran interior (tile). price: koin untuk NAIK ke level ini. stars: reputasi minimum.
// builtins: perabot bawaan yang tidak bisa dipindah (x,y,w,d tile; h tinggi px)
const LEVELS = [
  null,
  { lv: 1, name: "Gubuk Nelayan", price: 0, stars: 0, room: [4, 4], windows: 1, floor: "tikar", wall: "anyaman",
    desc: "Rumah kayu kecil beratap rumbia. Cukup untuk kasur dan meja.", builtins: [] },
  { lv: 2, name: "Rumah Papan", price: 900, stars: 0, room: [5, 4], windows: 2, floor: "papan", wall: "papan",
    desc: "Dinding papan rapi, jendela tambahan, dan teras kecil.", builtins: [{ type: "rakDinding", x: 2.2, y: 0, w: 1.2, d: 0.01, h: 0, wall: "y" }] },
  { lv: 3, name: "Rumah Kebun", price: 2000, stars: 1, room: [5, 5], windows: 2, floor: "papan", wall: "papan",
    desc: "Pagar bambu, kebun kecil, dan rak perabot di dalam.", builtins: [{ type: "rak", x: 0.3, y: 0.05, w: 1.3, d: 0.5, h: 44 }] },
  { lv: 4, name: "Rumah Panggung", price: 4000, stars: 3, room: [6, 5], windows: 2, floor: "papanHalus", wall: "papan",
    desc: "Ditinggikan dengan tiang kayu, tangga depan, dan kolong rumah.", builtins: [{ type: "rak", x: 0.3, y: 0.05, w: 1.3, d: 0.5, h: 44 }] },
  { lv: 5, name: "Rumah Nelayan Makmur", price: 7000, stars: 5, room: [7, 5], windows: 3, floor: "papanHalus", wall: "papanCat",
    desc: "Teras lebar, atap genteng, ruang keluarga dengan kursi rotan.", builtins: [{ type: "kursiRotan", x: 4.4, y: 3.3, w: 2.0, d: 1.0, h: 18 }] },
  { lv: 6, name: "Rumah Adat Sederhana", price: 11500, stars: 8, room: [7, 6], windows: 3, floor: "papanHalus", wall: "ukir",
    desc: "Ornamen ukiran, kayu berkualitas, ruang tamu lebih luas.", builtins: [{ type: "kursiRotan", x: 4.4, y: 4.2, w: 2.0, d: 1.0, h: 18 }, { type: "lemariUkir", x: 2.4, y: 0.05, w: 1.4, d: 0.55, h: 56 }] },
  { lv: 7, name: "Rumah Saudagar Kampung", price: 17500, stars: 12, room: [8, 6], windows: 3, floor: "parket", wall: "ukir",
    desc: "Serambi besar, gudang kecil, dekorasi kayu, halaman tertata.", builtins: [{ type: "kursiRotan", x: 5.2, y: 4.2, w: 2.0, d: 1.0, h: 18 }, { type: "lemariUkir", x: 2.4, y: 0.05, w: 1.4, d: 0.55, h: 56 }, { type: "mejaTamu", x: 5.5, y: 3.0, w: 1.2, d: 0.8, h: 14 }] },
  { lv: 8, name: "Rumah Panggung Megah", price: 26000, stars: 16, room: [8, 7], windows: 4, floor: "parket", wall: "ukirEmas",
    desc: "Panggung besar, atap bertingkat, tangga lebar, balkon kayu.", builtins: [{ type: "lemariUkir", x: 2.4, y: 0.05, w: 1.4, d: 0.55, h: 56 }, { type: "kursiRotan", x: 5.2, y: 5.2, w: 2.0, d: 1.0, h: 18 }, { type: "tiang", x: 3.85, y: 3.35, w: 0.3, d: 0.3, h: 110 }] },
  { lv: 9, name: "Rumah Bangsawan Desa", price: 38000, stars: 22, room: [9, 7], windows: 4, floor: "parket", wall: "ukirEmas",
    desc: "Tiang ukiran, paviliun, taman bunga, dan ruang pamer tangkapan.", builtins: [{ type: "lemariPamer", x: 2.3, y: 0.05, w: 2.2, d: 0.6, h: 60 }, { type: "kursiRotan", x: 6.2, y: 5.2, w: 2.0, d: 1.0, h: 18 }, { type: "tiang", x: 3.35, y: 3.35, w: 0.3, d: 0.3, h: 110 }, { type: "tiang", x: 6.35, y: 3.35, w: 0.3, d: 0.3, h: 110 }] },
  { lv: 10, name: "Rumah Legenda Nusantara", price: 55000, stars: 30, room: [10, 8], windows: 5, floor: "parketEmas", wall: "ukirEmas",
    desc: "Rumah adat tropis termegah: ukiran detail, serambi luas, dinding legenda.", builtins: [{ type: "dindingLegenda", x: 2.2, y: 0.05, w: 3.0, d: 0.5, h: 74 }, { type: "lemariPamer", x: 6.0, y: 0.05, w: 2.2, d: 0.6, h: 60 }, { type: "kursiRotan", x: 7.2, y: 6.2, w: 2.0, d: 1.0, h: 18 }, { type: "tiang", x: 3.35, y: 3.85, w: 0.3, d: 0.3, h: 120 }, { type: "tiang", x: 7.35, y: 3.85, w: 0.3, d: 0.3, h: 120 }] },
];
const MAX_LEVEL = 10;
const roomOf = (lv) => ({ w: LEVELS[lv].room[0], d: LEVELS[lv].room[1] });
// pintu selalu di dinding kiri dekat depan
const doorOf = (lv) => { const r = roomOf(lv); return { y0: r.d - 1.6, y1: r.d - 0.4, spawn: { x: 0.7, y: r.d - 1.0 } }; };

// ---------- Jenis perabot ----------
// kind: solid (menghalangi), floor (karpet, bisa dilewati). cap: kapasitas ikan (akuarium)
const FURN = {
  kasur: { name: "Kasur Kapuk", w: 2.0, d: 1.6, h: 24, kind: "solid", icon: "🛏️" },
  meja: { name: "Meja & Bangku", w: 1.4, d: 0.9, h: 30, kind: "solid", icon: "🪑" },
  akuariumKecil: { name: "Akuarium Kecil", w: 0.8, d: 1.6, h: 50, kind: "solid", icon: "🐟", cap: 3, maxW: 2.5 },
  akuariumBesar: { name: "Akuarium Besar", w: 0.9, d: 2.6, h: 60, kind: "solid", icon: "🐠", cap: 6, maxW: 12 },
  karpet: { name: "Karpet Tenun", w: 2.5, d: 1.8, h: 1, kind: "floor", icon: "🟥" },
  tanaman: { name: "Tanaman Pot", w: 0.7, d: 0.7, h: 40, kind: "solid", icon: "🪴" },
  radio: { name: "Radio Tua", w: 0.8, d: 0.8, h: 36, kind: "solid", icon: "📻" },
  trofi: { name: "Rak Trofi", w: 0.7, d: 0.7, h: 56, kind: "solid", icon: "🏆" },
};
// katalog (perabot dipasang di lantai; dekorasi tidak perlu tempat)
const CATALOG = [
  { id: "karpet", furn: "karpet", price: 300, stars: 0, desc: "Karpet bermotif tenun." },
  { id: "tanaman", furn: "tanaman", price: 220, stars: 0, desc: "Monstera hijau di pot tanah liat." },
  { id: "lampu", deco: true, name: "Lampu Gantung", icon: "💡", price: 450, stars: 1, desc: "Kamar terang & hangat di malam hari." },
  { id: "lukisan", deco: true, name: "Lukisan Senja", icon: "🖼️", price: 600, stars: 2, desc: "Lukisan matahari terbenam di muara." },
  { id: "radio", furn: "radio", price: 800, stars: 3, desc: "Nyalakan untuk musik santai." },
  { id: "trofi", furn: "trofi", price: 1200, stars: 4, desc: "Pajang trofi ikan legenda." },
  { id: "kucing", deco: true, name: "Si Belang", icon: "🐈", price: 1500, stars: 6, desc: "Kucing kampung yang suka tidur di karpet." },
  { id: "akuariumBesar", furn: "akuariumBesar", price: 2500, stars: 8, desc: "Muat 6 ikan, ikan sampai 12 kg." },
  { id: "akuariumKecil2", furn: "akuariumKecil", price: 700, stars: 2, desc: "Akuarium kecil tambahan (3 ikan, sampai 2,5 kg)." },
];
const catName = (c) => c.name || FURN[c.furn].name;
const catIcon = (c) => c.icon || FURN[c.furn].icon;

// ---------- uid ----------
function newUid(S, prefix = "i") {
  S.seq = (S.seq || 0) + 1;
  return prefix + Date.now().toString(36) + "-" + S.seq.toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

// ---------- Skema rumah ----------
// ownerId hanya penanda lokal. JANGAN dipakai sebagai bukti kepemilikan: saat ada
// sistem akun, server yang menentukan pemilik & izin, bukan data dari perangkat.
function newHome(S, level = 1) {
  const h = {
    version: HOME_VERSION,
    ownerId: "local-" + Math.random().toString(36).slice(2, 10),
    houseId: newUid(S, "h"),
    level,
    furniture: [],      // {uid, type, x, y, rot, water?}
    stored: [],         // perabot di gudang (tidak muat / disimpan pemain)
    decorations: [],    // id dekorasi: lampu, lukisan, kucing
    placedFish: [],     // ikan di akuarium: {uid, id, w, t, aq}
    permissions: { visitors: "none", visitorDecorate: false, visitorTakeFish: false }, // untuk kunjungan teman nanti
    updatedAt: Date.now(),
  };
  for (const type of ["kasur", "meja", "akuariumKecil"]) addFurniture(h, S, type);
  return h;
}
function fp(f) { const T = FURN[f.type], w = f.rot ? T.d : T.w, d = f.rot ? T.w : T.d; return { x0: f.x, y0: f.y, x1: f.x + w, y1: f.y + d }; }
function builtinRects(lv) { return LEVELS[lv].builtins.filter((b) => b.d > 0.05).map((b) => ({ x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.d })); }
const overlaps = (a, b, g = 0.02) => a.x0 < b.x1 - g && a.x1 > b.x0 + g && a.y0 < b.y1 - g && a.y1 > b.y0 + g;
function solidRects(h, ignoreUid) {
  const r = builtinRects(h.level);
  for (const f of h.furniture) if (f.uid !== ignoreUid && FURN[f.type].kind === "solid") r.push(fp(f));
  return r;
}
// sel jalan (grid) yang bisa diinjak pemain
function walkGrid(h, solids) {
  const { w, d } = roomOf(h.level), nx = Math.round(w / CELL), ny = Math.round(d / CELL), g = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * CELL, y = (j + 0.5) * CELL;
    let ok = x > 0.25 + PR && y > 0.25 + PR && x < w - 0.15 - PR && y < d - 0.15 - PR;
    if (ok) for (const s of solids) if (x > s.x0 - PR && x < s.x1 + PR && y > s.y0 - PR && y < s.y1 + PR) { ok = false; break; }
    g[j * nx + i] = ok ? 1 : 0;
  }
  return { g, nx, ny };
}
function reachable(h, solids) {
  const W = walkGrid(h, solids), { g, nx, ny } = W, seen = new Uint8Array(nx * ny), sp = doorOf(h.level).spawn;
  const si = Math.floor(sp.x / CELL), sj = Math.floor(sp.y / CELL), q = [];
  if (g[sj * nx + si]) { q.push(sj * nx + si); seen[sj * nx + si] = 1; }
  while (q.length) {
    const k = q.pop(), i = k % nx, j = (k / nx) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
      const kk = b * nx + a; if (g[kk] && !seen[kk]) { seen[kk] = 1; q.push(kk); }
    }
  }
  return { ...W, seen, at: (x, y) => { const i = Math.floor(x / CELL), j = Math.floor(y / CELL); return i >= 0 && j >= 0 && i < nx && j < ny && seen[j * nx + i] === 1; } };
}
// titik interaksi: sisi depan perabot yang bisa dicapai
function interactPoint(f, R) {
  const r = fp(f), mx = (r.x0 + r.x1) / 2, my = (r.y0 + r.y1) / 2, o = 0.45;
  const cand = [[mx, r.y1 + o], [r.x1 + o, my], [mx, r.y0 - o], [r.x0 - o, my], [r.x0 + 0.3, r.y1 + o], [r.x1 + o, r.y0 + 0.3]];
  for (const [x, y] of cand) if (R.at(x, y)) return { x, y };
  return null;
}
// cek apakah perabot f (posisi barunya) valid di rumah h
function canPlace(h, f) {
  const T = FURN[f.type], r = fp(f), { w, d } = roomOf(h.level), door = doorOf(h.level);
  if (r.x0 < 0.05 - 1e-6 || r.y0 < 0.05 - 1e-6 || r.x1 > w - 0.05 + 1e-6 || r.y1 > d - 0.05 + 1e-6) return { ok: false, why: "Keluar dari ruangan" };
  if (T.kind === "floor") return { ok: true };
  if (overlaps(r, { x0: 0, y0: door.y0 - 0.15, x1: 1.35, y1: door.y1 + 0.15 })) return { ok: false, why: "Menghalangi pintu" };
  for (const s of solidRects(h, f.uid)) if (overlaps(r, s)) return { ok: false, why: "Menabrak perabot lain" };
  // jalan tidak boleh tertutup: semua perabot (termasuk yang ini) tetap bisa didekati
  const trial = { ...h, furniture: h.furniture.map((x) => (x.uid === f.uid ? f : x)) };
  if (!trial.furniture.some((x) => x.uid === f.uid)) trial.furniture = trial.furniture.concat([f]);
  const R = reachable(trial, solidRects(trial));
  for (const x of trial.furniture) if (FURN[x.type].kind === "solid" && !interactPoint(x, R)) return { ok: false, why: "Jalan ke perabot tertutup" };
  return { ok: true };
}
// cari tempat kosong terdekat dari titik (px,py)
function findSpot(h, f, px, py) {
  const { w, d } = roomOf(h.level), spots = [];
  for (let y = 0.05; y < d; y += SNAP) for (let x = 0.05; x < w; x += SNAP) spots.push([x, y]);
  spots.sort((a, b) => Math.hypot(a[0] - px, a[1] - py) - Math.hypot(b[0] - px, b[1] - py));
  for (const [x, y] of spots) for (const rot of [f.rot || 0, f.rot ? 0 : 1]) {
    const t = { ...f, x, y, rot }; if (canPlace(h, t).ok) return t;
  }
  return null;
}
const PREFER = { kasur: [9, 0], meja: [2, 1.5], akuariumKecil: [0, 0.5], akuariumBesar: [0, 1], karpet: [2.5, 2.5], tanaman: [9, 9], radio: [9, 3], trofi: [1, 0] };
function addFurniture(h, S, type) {
  const f = { uid: newUid(S, "f"), type, x: 0.05, y: 0.05, rot: 0 };
  if (FURN[type].cap) f.water = null;
  const p = PREFER[type] || [2, 2], { w, d } = roomOf(h.level);
  const spot = findSpot(h, f, Math.min(p[0], w), Math.min(p[1], d));
  if (spot) { h.furniture.push(spot); return { placed: true, f: spot }; }
  h.stored.push(f); return { placed: false, f };
}
// pindahkan perabot ke posisi valid setelah naik level (tanpa menghilangkan apa pun)
function relayout(h) {
  const keep = h.furniture.slice(), report = { moved: [], stored: [] };
  h.furniture = [];
  // perabot besar dulu supaya dapat tempat
  keep.sort((a, b) => (FURN[b.type].w * FURN[b.type].d) - (FURN[a.type].w * FURN[a.type].d));
  for (const f of keep) {
    h.furniture.push(f);
    if (canPlace(h, f).ok) continue;
    h.furniture.pop();
    const spot = findSpot(h, f, f.x, f.y);
    if (spot) { h.furniture.push(spot); report.moved.push(f.type); }
    else { h.stored.push(f); report.stored.push(f.type); }
  }
  // coba pasang lagi yang ada di gudang
  for (const f of h.stored.slice()) { const spot = findSpot(h, f, 2, 2); if (spot) { h.furniture.push(spot); h.stored.splice(h.stored.indexOf(f), 1); } }
  return report;
}

// ---------- Migrasi rumah Tahap 2A → skema berversi ----------
function migrateHome(S) {
  const old = S.home;
  if (old && old.version === HOME_VERSION) return { migrated: false };
  if (!old || !Array.isArray(old.items)) { S.home = newHome(S, 1); return { migrated: true, from: "baru" }; }
  // Rumahku Tahap 2A adalah rumah panggung 7×6 → jadikan level 4 (Rumah Panggung) agar tidak mengecil
  const h = newHome(S, 4), items = old.items;
  for (const id of ["karpet", "tanaman", "radio", "trofi"]) if (items.includes(id)) addFurniture(h, S, id);
  if (items.includes("akuarium")) addFurniture(h, S, "akuariumBesar");
  for (const id of ["lampu", "lukisan", "kucing"]) if (items.includes(id)) h.decorations.push(id);
  S.home = h;
  return { migrated: true, from: "2A" };
}

// ---------- Inventaris ikan ----------
// Setiap ikan di coolbox: {uid, id, w, t}. Ikan di akuarium ada di home.placedFish dengan field aq.
function ensureFishUids(S) {
  let fixed = 0; const seen = new Set();
  const all = [S.cooler, S.home && S.home.placedFish].filter(Array.isArray);
  for (const list of all) for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i];
    if (!it || !it.id) { list.splice(i, 1); fixed++; continue; }
    if (!it.uid) { it.uid = newUid(S, "i"); it.t = it.t || 0; fixed++; }
    if (seen.has(it.uid)) { list.splice(i, 1); fixed++; continue; } // duplikat → buang salinan kedua
    seen.add(it.uid);
  }
  // ikan di akuarium yang akuariumnya hilang dikembalikan ke coolbox (tidak pernah dihapus)
  if (S.home) {
    const aqs = new Set(S.home.furniture.concat(S.home.stored).filter((f) => FURN[f.type] && FURN[f.type].cap).map((f) => f.uid));
    for (let i = S.home.placedFish.length - 1; i >= 0; i--) {
      const it = S.home.placedFish[i];
      if (!aqs.has(it.aq)) { S.home.placedFish.splice(i, 1); delete it.aq; S.cooler.push(it); fixed++; }
    }
  }
  return fixed;
}
const HABITAT = { muara: "tawar", toba: "tawar", selat: "laut", ampat: "laut", banda: "laut" };
const WATER_NAME = { tawar: "air tawar", laut: "air laut" };
function aquariumOf(h, aqUid) { return h.furniture.concat(h.stored).find((f) => f.uid === aqUid && FURN[f.type].cap); }
const fishIn = (h, aqUid) => h.placedFish.filter((p) => p.aq === aqUid);
function waterOf(h, aq) { const f = fishIn(h, aq.uid); return f.length ? aq.water : null; }
// apakah ikan boleh dipelihara di akuarium ini?
function eligible(item, aq, h, FISH_BY_ID, ignoreUid) {
  const f = FISH_BY_ID[item.id];
  if (!f) return { ok: false, why: "Jenis tidak dikenal" };
  if (f.emoji || f.rarity === "sampah") return { ok: false, why: "Bukan ikan" };
  if (f.protected) return { ok: false, why: "Dilindungi, harus dilepas ke alam" };
  if (f.pelagic) return { ok: false, why: "Perenang samudra, butuh laut lepas" };
  const T = FURN[aq.type];
  if (item.w > T.maxW) return { ok: false, why: `Terlalu besar (maks ${String(T.maxW).replace(".", ",")} kg)` };
  const others = fishIn(h, aq.uid).filter((p) => p.uid !== ignoreUid);
  const water = HABITAT[f.loc];
  if (others.length && aq.water && aq.water !== water) return { ok: false, why: `Akuarium ini ${WATER_NAME[aq.water]}` };
  return { ok: true, water };
}
// pindahkan ikan coolbox → akuarium
function putFish(S, uid, aqUid, FISH_BY_ID) {
  const h = S.home, aq = aquariumOf(h, aqUid);
  if (!aq || h.stored.includes(aq)) return { ok: false, why: "Akuarium tidak ditemukan" };
  const idx = S.cooler.findIndex((x) => x.uid === uid);
  if (idx < 0) return { ok: false, why: "Ikan tidak ada di coolbox" };
  if (fishIn(h, aqUid).length >= FURN[aq.type].cap) return { ok: false, why: "full" };
  const e = eligible(S.cooler[idx], aq, h, FISH_BY_ID); if (!e.ok) return e;
  const [it] = S.cooler.splice(idx, 1);
  it.aq = aqUid; h.placedFish.push(it); aq.water = e.water; h.updatedAt = Date.now();
  return { ok: true, item: it };
}
// ambil ikan akuarium → coolbox (hanya bila coolbox masih muat)
function takeFish(S, uid, coolerCap) {
  const h = S.home, idx = h.placedFish.findIndex((x) => x.uid === uid);
  if (idx < 0) return { ok: false, why: "Ikan tidak ada di akuarium" };
  if (S.cooler.length >= coolerCap) return { ok: false, why: "Coolbox penuh. Jual atau pajang ikan lain dulu, atau tukar langsung." };
  const [it] = h.placedFish.splice(idx, 1), aqUid = it.aq; delete it.aq;
  S.cooler.push(it); h.updatedAt = Date.now();
  if (!fishIn(h, aqUid).length) { const aq = aquariumOf(h, aqUid); if (aq) aq.water = null; }
  return { ok: true, item: it };
}
// tukar: ikan coolbox masuk, ikan akuarium keluar (jumlah coolbox tetap)
function swapFish(S, coolerUid, fishUid, FISH_BY_ID) {
  const h = S.home, ci = S.cooler.findIndex((x) => x.uid === coolerUid), fi = h.placedFish.findIndex((x) => x.uid === fishUid);
  if (ci < 0 || fi < 0) return { ok: false, why: "Ikan tidak ditemukan" };
  const out = h.placedFish[fi], aq = aquariumOf(h, out.aq);
  const e = eligible(S.cooler[ci], aq, h, FISH_BY_ID, out.uid); if (!e.ok) return e;
  const [inn] = S.cooler.splice(ci, 1); h.placedFish.splice(fi, 1);
  delete out.aq; inn.aq = aq.uid; S.cooler.push(out); h.placedFish.push(inn); aq.water = e.water; h.updatedAt = Date.now();
  return { ok: true, in: inn, out };
}
// pemeriksaan: tidak ada uid ganda di seluruh inventaris
function inventoryReport(S) {
  const ids = S.cooler.map((x) => x.uid).concat(S.home ? S.home.placedFish.map((x) => x.uid) : []);
  return { total: ids.length, unique: new Set(ids).size };
}
// izin pengunjung (untuk multiplayer nanti). Di tahap lokal selalu menolak perubahan dari pengunjung.
function visitorCan(h, action, visitorId) {
  if (!visitorId || visitorId === h.ownerId) return action === "view" || action === "owner";
  if (action === "view") return h.permissions.visitors !== "none";
  if (action === "decorate") return h.permissions.visitorDecorate === true && false; // butuh validasi server
  if (action === "takeFish") return h.permissions.visitorTakeFish === true && false; // butuh validasi server
  return false;
}

const API = {
  HOME_VERSION, LEVELS, MAX_LEVEL, FURN, CATALOG, catName, catIcon, SNAP, roomOf, doorOf, fp, builtinRects, solidRects,
  newHome, newUid, addFurniture, canPlace, findSpot, relayout, reachable, interactPoint, migrateHome,
  ensureFishUids, eligible, putFish, takeFish, swapFish, fishIn, aquariumOf, waterOf, inventoryReport, visitorCan, HABITAT, WATER_NAME,
};
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.HD = API; }
})(typeof window !== "undefined" ? window : globalThis);
