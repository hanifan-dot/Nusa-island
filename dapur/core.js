// NUSA ISLAND — Ide 08 · Kedai Bu Indah & Dapur Rumahku: logika murni (tanpa DOM/canvas) supaya bisa diuji di Node.
// Server (backend PR #60, kontrak CONTRACT-08A) adalah sumber kebenaran harga, saldo, stok, dan hasil. Modul ini hanya:
//  - memetakan bahan ke rak di kedai,
//  - menghitung keranjang SEMENTARA (tampilan; harga akhir selalu dihitung ulang server),
//  - menyusun body dapurBuy yang valid (opId, ≤8 jenis, 1–20 per jenis),
//  - menerjemahkan galat server ke kalimat ramah.
// Harga bahan, pemanggang 250, dan angka kualitas adalah NILAI UJI sampai Owner memutuskan; tidak ada angka harga di file ini.
(function (root) {
"use strict";
const LIM = { kinds: 8, n: 20, coins: 2000, stock: 30, opRe: /^[A-Za-z0-9_-]{8,60}$/ };

// Rak di Kedai Bu Indah → bahan yang dijual di sana (urutan = urutan tampil). 15 bahan, tiap bahan tepat di satu rak.
const SHELVES = {
  beras:  { name: "Rak Beras & Bumbu", icon: "🍚", ids: ["beras", "minyak", "garam", "gula", "bumbu_dasar"] },
  sayur:  { name: "Keranjang Sayur", icon: "🥬", ids: ["sayuran", "bawang_merah", "bawang_putih", "cabai", "jeruk_nipis"] },
  kulkas: { name: "Kulkas Telur & Susu", icon: "🥚", ids: ["telur", "susu", "air_es"] },
  tempe:  { name: "Meja Tempe", icon: "🟫", ids: ["tempe"] },
  etalase: { name: "Etalase Kaca", icon: "☕", ids: ["kopi"] },
};
const SHELF_ORDER = ["beras", "sayur", "kulkas", "tempe", "etalase"];
const shelfOf = (id) => { for (const k of SHELF_ORDER) if (SHELVES[k].ids.includes(id)) return k; return null; };

const isInt = (n) => Number.isInteger(n);
const newBasket = () => ({});
const kinds = (b) => Object.keys(b).filter((k) => b[k] > 0).length;
const count = (b) => Object.values(b).reduce((a, n) => a + (n > 0 ? n : 0), 0);
const sig = (b) => Object.keys(b).filter((k) => b[k] > 0).sort().map((k) => k + ":" + b[k]).join(",");

// katalog dari jawaban dapurState → { id: {id,name,price,cat,icon} }. Entri aneh dibuang (klien tidak mempercayai bentuk apa pun).
function catalogMap(cat) {
  const out = {};
  const list = cat && Array.isArray(cat.ingredients) ? cat.ingredients : [];
  for (const i of list) {
    if (!i || typeof i.id !== "string" || typeof i.name !== "string" || !Number.isFinite(i.price) || i.price < 0) continue;
    out[i.id] = { id: i.id, name: i.name.slice(0, 40), price: Math.floor(i.price), cat: String(i.cat || ""), icon: String(i.icon || "").slice(0, 8) };
  }
  return out;
}
const stockOf = (dapur, id) => { const v = dapur && dapur.ing ? dapur.ing[id] : 0; return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0; };

// tambah/kurangi (d bisa negatif). Mengembalikan {ok, why, n}. Hanya ubah keranjang bila ok.
function add(b, id, d, cat, dapur) {
  if (!isInt(d) || d === 0) return { ok: false, why: "jumlah" };
  if (cat && !cat[id]) return { ok: false, why: "tak-dijual" };
  const cur = b[id] || 0, nx = cur + d;
  if (nx < 0) return { ok: false, why: "kosong", n: cur };
  if (nx === 0) { delete b[id]; return { ok: true, n: 0 }; }
  if (d > 0) {
    if (cur === 0 && kinds(b) >= LIM.kinds) return { ok: false, why: "jenis-penuh", n: cur };
    if (nx > LIM.n) return { ok: false, why: "maks-per-jenis", n: cur };
    if (dapur && stockOf(dapur, id) + nx > LIM.stock) return { ok: false, why: "lemari-penuh", n: cur };
    if (cat && total(Object.assign({}, b, { [id]: nx }), cat) > LIM.coins) return { ok: false, why: "maks-koin", n: cur };
  }
  b[id] = nx; return { ok: true, n: nx };
}
const WHY = {
  "tak-dijual": "Bu Indah tidak menjual itu.", "jenis-penuh": "Keranjang cuma muat 8 jenis bahan.", "maks-per-jenis": "Satu jenis maksimal 20 per belanja.",
  "lemari-penuh": "Lemari dapurmu penuh untuk bahan ini (maks 30).", "maks-koin": "Belanjaan terlalu banyak (maks 2.000 koin sekali bayar).", kosong: "Sudah kosong.", jumlah: "Jumlah tidak valid.",
};
const whyText = (w) => WHY[w] || "Tidak bisa menambah itu.";

function lines(b, cat) {
  const out = [];
  for (const id of Object.keys(b).sort((x, y) => (SHELF_ORDER.indexOf(shelfOf(x)) - SHELF_ORDER.indexOf(shelfOf(y))) || (x < y ? -1 : 1))) {
    const n = b[id]; if (!(n > 0)) continue;
    const c = cat && cat[id]; out.push({ id, n, name: c ? c.name : id, icon: c ? c.icon : "", price: c ? c.price : 0, sub: c ? c.price * n : 0 });
  }
  return out;
}
const total = (b, cat) => lines(b, cat).reduce((a, l) => a + l.sub, 0);

// body dapurBuy. opId dibuat pemanggil (dan dipakai ULANG saat mencoba lagi isi keranjang yang sama, supaya tidak ganda).
function buyBody(b, opId, cat) {
  if (typeof opId !== "string" || !LIM.opRe.test(opId)) return { ok: false, why: "op" };
  const ids = Object.keys(b).filter((k) => b[k] > 0);
  if (!ids.length) return { ok: false, why: "kosong" };
  if (ids.length > LIM.kinds) return { ok: false, why: "jenis-penuh" };
  for (const id of ids) { if (!isInt(b[id]) || b[id] < 1 || b[id] > LIM.n) return { ok: false, why: "maks-per-jenis" }; if (cat && !cat[id]) return { ok: false, why: "tak-dijual" }; }
  if (cat && total(b, cat) > LIM.coins) return { ok: false, why: "maks-koin" };
  return { ok: true, body: { opId, items: ids.sort().map((id) => ({ id, n: b[id] })) } };
}
function newOpId(rnd) {
  const r = rnd || Math.random;
  let s = "kb" + Date.now().toString(36); while (s.length < 18) s += Math.floor(r() * 36).toString(36);
  return s.slice(0, 24);
}

// kalimat ramah dari galat NusaApi.call ({code, message}). Pesan server yang berbahasa Indonesia dan pendek boleh ditampilkan.
function errText(e) {
  const c = e && e.code, m = e && e.message ? String(e.message) : "";
  if (c === "unauthenticated") return "Masuk dulu dengan akun Google.";
  if (c === "unavailable" || c === "internal" || c === "deadline-exceeded") return "Jaringan bermasalah. Koin dan keranjangmu aman — coba bayar lagi.";
  if (c === "not-found") return "Kedai belum dibuka oleh server.";
  if (c === "resource-exhausted") return "Terlalu cepat. Tunggu sebentar lalu coba lagi.";
  if (c === "failed-precondition" || c === "invalid-argument") return m && m.length <= 140 ? m : "Belanjaan ditolak server. Koin dan keranjangmu aman.";
  return "Belanjaan belum berhasil. Koin dan keranjangmu aman.";
}
// kegagalan "pasti ditolak" (aturan/bentuk) vs "tidak pasti" (jaringan). Pada yang tidak pasti opId LAMA dipakai ulang → server tidak menggandakan.
const definite = (e) => !!(e && (e.code === "failed-precondition" || e.code === "invalid-argument" || e.code === "not-found" || e.code === "unauthenticated"));

// saldo koin bermain setelah jawaban server: own dari server; sisa (Top Up) dipertahankan dari keadaan lama.
function mergeEco(old, res) {
  if (!old || typeof old.balance !== "number" || typeof old.own !== "number" || !res || !Number.isFinite(res.own)) return null;
  const top = old.balance - old.own; return Object.assign({}, old, { own: Math.max(0, Math.floor(res.own)), balance: Math.max(0, Math.floor(res.own)) + top });
}

// ---------- Tata letak interior (data murni; dipakai gambar, tabrakan, dan uji jangkauan) ----------
// Koordinat ruang dalam tile: x ke kanan-bawah, y ke kiri-bawah; dinding belakang di y=0, dinding kiri di x=0 (sama dengan Rumahku).
// solids = kotak tabrakan; stations = titik berdiri pemain untuk berinteraksi (harus bisa dijangkau dari titik masuk).
const LAYOUT = {
  kedai: {
    id: "kedai", name: "Kedai Bu Indah", icon: "🏪", w: 9, d: 6.8, spawn: { x: 0.95, y: 5.2, dir: 0 }, door: { y0: 4.6, y1: 5.8 },
    solids: {
      rakBeras: { x0: 0, y0: 0.85, x1: 0.7, y1: 3.95 }, sayur: { x0: 1.0, y0: 0, x1: 3.4, y1: 0.85 }, kulkas: { x0: 3.75, y0: 0, x1: 5.05, y1: 0.8 },
      tempe: { x0: 5.45, y0: 0.25, x1: 7.2, y1: 1.25 }, rakBelakang: { x0: 7.4, y0: 0, x1: 9, y1: 1.2 }, panel: { x0: 6.6, y0: 1.35, x1: 6.95, y1: 3.4 },
      kasir: { x0: 6.6, y0: 3.3, x1: 9, y1: 4.35 }, etalase: { x0: 4.5, y0: 3.2, x1: 6.1, y1: 4.05 }, keranjang: { x0: 1.0, y0: 5.95, x1: 1.75, y1: 6.55 }, kucing: { x0: 7.6, y0: 5.3, x1: 8.4, y1: 6.1 },
    },
    stations: {
      pintu: { x: 0.8, y: 5.2, r: 0.9, icon: "🚪", label: "Keluar" }, beras: { x: 1.25, y: 2.4, r: 1.0, icon: "🍚", label: "Rak Beras" }, sayur: { x: 2.2, y: 1.5, r: 1.0, icon: "🥬", label: "Sayur" },
      kulkas: { x: 4.4, y: 1.4, r: 1.0, icon: "🥚", label: "Kulkas" }, tempe: { x: 6.3, y: 1.9, r: 1.0, icon: "🟫", label: "Tempe" }, etalase: { x: 5.3, y: 4.6, r: 1.0, icon: "☕", label: "Etalase" },
      kasir: { x: 7.8, y: 4.95, r: 1.1, icon: "🧾", label: "Bayar" }, keranjang: { x: 1.4, y: 5.4, r: 0.9, icon: "🧺", label: "Keranjang" }, kucing: { x: 7.2, y: 5.7, r: 0.85, icon: "🐈", label: "Elus" },
    },
    bu: { route: [{ x: 8.0, y: 2.9, wait: 5 }, { x: 7.6, y: 1.9, wait: 2.5 }, { x: 8.3, y: 2.2, wait: 2 }], zone: { x0: 6.95, y0: 1.2, x1: 9, y1: 3.3 } },
  },
  dapur: {
    id: "dapur", name: "Dapur Rumahku", icon: "🍳", w: 8, d: 6.2, spawn: { x: 0.95, y: 4.8, dir: 0 }, door: { y0: 4.2, y1: 5.4 },
    solids: {
      lemari: { x0: 0.2, y0: 0, x1: 1.3, y1: 0.7 }, kulkas: { x0: 1.4, y0: 0, x1: 2.5, y1: 0.8 }, persiapan: { x0: 2.6, y0: 0, x1: 4.2, y1: 0.8 }, cuci: { x0: 4.2, y0: 0, x1: 5.5, y1: 0.8 },
      kompor: { x0: 5.5, y0: 0, x1: 7.3, y1: 0.85 }, pemanggang: { x0: 6.9, y0: 2.3, x1: 7.8, y1: 3.2 }, meja: { x0: 3.0, y0: 2.7, x1: 4.8, y1: 3.6 }, sampah: { x0: 0.2, y0: 2.9, x1: 0.75, y1: 3.4 },
    },
    stations: {
      pintu: { x: 0.8, y: 4.8, r: 0.9, icon: "🚪", label: "Ke Rumah" }, lemari: { x: 0.75, y: 1.3, r: 0.95, icon: "🗄️", label: "Lemari" }, kulkas: { x: 1.95, y: 1.4, r: 0.95, icon: "🧊", label: "Kulkas" },
      persiapan: { x: 3.4, y: 1.4, r: 0.95, icon: "🔪", label: "Talenan" }, cuci: { x: 4.85, y: 1.4, r: 0.95, icon: "🚰", label: "Bak Cuci" }, kompor: { x: 6.4, y: 1.45, r: 1.0, icon: "🔥", label: "Kompor" },
      pemanggang: { x: 6.35, y: 2.75, r: 0.9, icon: "♨️", label: "Pemanggang" }, meja: { x: 3.9, y: 4.2, r: 1.0, icon: "🍽️", label: "Meja Makan" }, sampah: { x: 1.25, y: 3.15, r: 0.85, icon: "🗑️", label: "Sampah" },
    },
  },
};
// pintu Dapur di dinding kiri Rumahku: tepat di atas pintu keluar (exitY0 = HD.doorOf(lv).y0), selebar 1,15 tile, jarak 0,35 dari pintu keluar
const homeDoor = (exitY0) => ({ y1: exitY0 - 0.35, y0: exitY0 - 0.35 - 1.15 });
const PR = 0.22;   // jari-jari pemain (sama dengan Rumahku)
function walk(L, x, y, r) {
  r = r === undefined ? PR : r;
  if (x < 0.25 + r || y < 0.25 + r || x > L.w - 0.15 - r || y > L.d - 0.15 - r) return false;
  for (const k in L.solids) { const s = L.solids[k]; if (x > s.x0 - r && x < s.x1 + r && y > s.y0 - r && y < s.y1 + r) return false; }
  return true;
}
// sel-sel yang bisa dijangkau dari titik masuk (isi banjir); dipakai uji agar setiap titik interaksi PASTI bisa didatangi
function reach(L, cell) {
  cell = cell || 0.1; const nx = Math.round(L.w / cell), ny = Math.round(L.d / cell), seen = new Uint8Array(nx * ny), q = [];
  const ok = (i, j) => walk(L, (i + 0.5) * cell, (j + 0.5) * cell);
  const si = Math.floor(L.spawn.x / cell), sj = Math.floor(L.spawn.y / cell); if (!ok(si, sj)) return { at: () => false, nx, ny, seen };
  q.push(sj * nx + si); seen[sj * nx + si] = 1;
  while (q.length) { const k = q.pop(), i = k % nx, j = (k / nx) | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const kk = jj * nx + ii; if (!seen[kk] && ok(ii, jj)) { seen[kk] = 1; q.push(kk); } } }
  return { at: (x, y) => { const i = Math.floor(x / cell), j = Math.floor(y / cell); return i >= 0 && j >= 0 && i < nx && j < ny && seen[j * nx + i] === 1; }, nx, ny, seen };
}

// ===================== 08C · Memasak interaktif, hasil masakan, cuci peralatan =====================
// SEMUA keputusan (kualitas, kematangan, resep ditemukan, hasil gagal, cuci sah) ada di server (dapurCook*, dapurEat, dapurDiscard, dapurWash).
// Di sini hanya: bentuk body (niat pemain), pemetaan gerakan layar → langkah, daftar ikan yang boleh dipilih, dan tabel REAKSI tampilan per hasil server.
const PREP_ORDER = ["cuci", "kupas", "potong", "pecah", "aduk", "bumbui", "tuang"];
// gerakan layar untuk tiap langkah. need = ambang gerakan (ketukan / putaran / milidetik / piksel). Itu hanya "rasa" bermain: server tetap hanya menerima NAMA langkah.
const ACT = {
  cuci:   { icon: "🚿", label: "Cuci",           kind: "tap",    need: 3,    hint: "Ketuk-ketuk untuk menyiram" },
  kupas:  { icon: "🧅", label: "Kupas",          kind: "tap",    need: 4,    hint: "Ketuk untuk mengupas lapisannya" },
  potong: { icon: "🔪", label: "Potong",         kind: "tap",    need: 5,    hint: "Ketuk berirama: tok, tok, tok" },
  pecah:  { icon: "🥚", label: "Pecahkan telur", kind: "tap",    need: 2,    hint: "Ketuk dua kali di pinggir mangkuk" },
  aduk:   { icon: "🥄", label: "Aduk",           kind: "circle", need: 1.5,  hint: "Putar jarimu melingkar (atau ketuk-ketuk)" },
  bumbui: { icon: "🧂", label: "Tambah bumbu",   kind: "tap",    need: 2,    hint: "Ketuk untuk menaburkan" },
  tuang:  { icon: "🥛", label: "Tuang",          kind: "hold",   need: 900,  hint: "Tahan untuk menuang" },
  taruh:  { icon: "🔥", label: "Taruh di api",   kind: "tap",    need: 1,    hint: "Ketuk untuk menaruh" },
  balik:  { icon: "🔄", label: "Balik",          kind: "tap",    need: 2,    hint: "Ketuk dua kali untuk membalik" },
  angkat: { icon: "🫕", label: "Angkat",         kind: "hold",   need: 500,  hint: "Tahan sebentar untuk mengangkat" },
};
const WASH_ACT = {
  sabun: { icon: "🧼", label: "Sabun",  kind: "tap",   need: 3,    hint: "Ketuk untuk menggosokkan sabun" },
  gosok: { icon: "🧽", label: "Gosok",  kind: "scrub", need: 520,  hint: "Gosok bolak-balik dengan jarimu (atau ketuk-ketuk)" },
  bilas: { icon: "🚰", label: "Bilas",  kind: "hold",  need: 1000, hint: "Tahan untuk membilas" },
  rak:   { icon: "🍽️", label: "Taruh di rak", kind: "tap", need: 1, hint: "Ketuk untuk menaruh di rak" },   // hanya tampilan; tidak dikirim ke server
};
const WASH_SERVER = ["sabun", "gosok", "bilas"];                           // = catalog.washSteps; urutan wajib
const WASHABLE = ["piring", "gelas", "sendok", "wajan", "panci", "pemanggang"];
const ITEM = { piring: ["🍽️", "Piring"], gelas: ["🥛", "Gelas"], sendok: ["🥄", "Sendok"], wajan: ["🍳", "Wajan"], panci: ["🍲", "Panci"], pemanggang: ["♨️", "Pemanggang"] };
const TOOL_OF_STATION = { kompor: ["wajan", "panci"], pemanggang: ["pemanggang"], persiapan: ["gelas"] };
const TOOL_NAME = { wajan: "Wajan", panci: "Panci", pemanggang: "Pemanggang", gelas: "Gelas" };
const HEAT_TOOLS = ["wajan", "panci", "pemanggang"];
const FREE_LIM = { units: 12, per: 6, kinds: 8, fish: 2 };
const TIER = {   // label & reaksi karton PER HASIL SERVER. face: ekspresi pemain; fx: efek; dish: warna sajian
  enak:        { label: "Enak sekali!",     face: "puas",   emoji: "😋", fx: "bintang", dish: "#d9923a", line: "Wangi dan pas. Bu Indah pasti bangga!" },
  lumayan:     { label: "Lumayan",          face: "biasa",  emoji: "🙂", fx: "none",    dish: "#c9a45c", line: "Tidak buruk. Bisa lebih mantap lagi." },
  aneh:        { label: "Rasanya aneh",     face: "bingung", emoji: "🤨", fx: "tanya",  dish: "#a98f58", line: "Hmm… rasanya apa ini ya?" },
  gosong:      { label: "Gosong",           face: "batuk",  emoji: "😵", fx: "asap",    dish: "#2a2420", line: "Uhuk! Asapnya ke mana-mana." },
  mentah:      { label: "Masih mentah",     face: "ragu",   emoji: "😬", fx: "keringat", dish: "#e8dcc0", line: "Hmm… kayaknya belum matang." },
  tidak_layak: { label: "Tidak layak makan", face: "bingung", emoji: "😖", fx: "tanya", dish: "#6f6a52", line: "Sebaiknya jangan dimakan. Buang saja?" },
};
const EAT = {     // hasil dapurEat.effect (server): kosmetik saja
  puas:  { face: "puas",  emoji: "😋", line: "Nyam! Enak sekali." },
  biasa: { face: "biasa", emoji: "🙂", line: "Lumayan, kenyang." },
  ragu:  { face: "ragu",  emoji: "😬", line: "Hmm… aneh, tapi habis juga." },
  mual:  { face: "mual",  emoji: "🤢", line: "Blegh… perutku jungkir balik." },
};
const tierInfo = (t) => TIER[t] || TIER.aneh;
const eatInfo = (e) => EAT[e] || EAT.biasa;
// batas durasi efek yang ditampilkan: server mengirim ms (maks 4000); klien tidak pernah memperpanjang.
const effectMs = (ms) => Math.max(0, Math.min(4000, Number.isFinite(ms) ? Math.floor(ms) : 0));

// ikan yang boleh dipilih untuk dimasak: ada uid, bukan Samudra Follower, bukan sampah/terlindungi, tidak terkunci. (Server tetap memeriksa kepemilikan.)
function fishPool(cooler, FISH, isSF) {
  const by = {}; for (const f of FISH || []) by[f.id] = f; const out = [];
  for (const it of Array.isArray(cooler) ? cooler : []) {
    if (!it || typeof it.uid !== "string" || !/^[A-Za-z0-9_-]{6,64}$/.test(it.uid) || it.lock === true) continue;
    const f = by[it.id]; if (!f || f.rarity === "sampah" || f.protected) continue; if (isSF && isSF(it.id)) continue;
    out.push({ uid: it.uid, id: it.id, w: Number(it.w) || 0, name: f.name });
  }
  return out;
}
// apakah resep bisa dimulai dari stok? need dari katalog server (ikan dihitung terpisah)
function recipeReady(rec, dapur, fishCount) {
  const miss = []; if (!rec) return { ok: false, miss };
  for (const [k, n] of Object.entries(rec.ing || {})) { if (k === "ikan") { if (fishCount < n) miss.push({ id: "ikan", need: n, have: fishCount }); } else { const h = stockOf(dapur, k); if (h < n) miss.push({ id: k, need: n, have: h }); } }
  return { ok: miss.length === 0, miss };
}
function validateFree(ing, fishN) {   // kemudahan tampilan; server menolak yang melanggar
  let units = fishN | 0, kindsN = fishN ? 1 : 0;
  for (const [k, n] of Object.entries(ing || {})) { if (!(n > 0)) continue; if (!isInt(n) || n > FREE_LIM.per) return { ok: false, why: "per-jenis" }; units += n; kindsN++; }
  if (!units) return { ok: false, why: "kosong" }; if (units > FREE_LIM.units) return { ok: false, why: "terlalu-banyak" }; if (kindsN > FREE_LIM.kinds) return { ok: false, why: "jenis" };
  return { ok: true, units };
}
const opOk = (o) => typeof o === "string" && LIM.opRe.test(o);
function startBody(opId, tool, rec, ing, fishUids) {
  if (!opOk(opId)) return { ok: false, why: "op" }; if (!TOOL_NAME[tool]) return { ok: false, why: "alat" };
  const fish = Array.isArray(fishUids) ? fishUids.slice(0, FREE_LIM.fish) : [];
  if (new Set(fish).size !== fish.length) return { ok: false, why: "ikan-kembar" };
  const body = { opId, tool, rec: rec || null }; if (fish.length) body.fish = fish;
  if (!rec) { const i = {}; for (const [k, n] of Object.entries(ing || {})) if (n > 0) i[k] = n; const v = validateFree(i, fish.length); if (!v.ok) return v; body.ing = i; }   // resep: jumlah bahan DIABAIKAN server, jadi tidak dikirim
  return { ok: true, body };
}
function stepBody(opId, step, arg) {
  if (!opOk(opId)) return { ok: false, why: "op" };
  if (!(PREP_ORDER.includes(step) || ["taruh", "api", "balik", "angkat"].includes(step))) return { ok: false, why: "langkah" };
  const body = { opId, step }; if (step === "api") { if (![1, 2, 3].includes(arg)) return { ok: false, why: "api" }; body.arg = arg; }
  return { ok: true, body };
}
const opBody = (opId, extra) => (opOk(opId) ? { ok: true, body: Object.assign({ opId }, extra || {}) } : { ok: false, why: "op" });
const finishBody = (opId) => opBody(opId), abortBody = (opId) => opBody(opId);
const eatBody = (opId, dish) => (typeof dish === "string" && dish.length > 0 && dish.length <= 40 ? opBody(opId, { dish }) : { ok: false, why: "dish" });
const discardBody = eatBody;
function washBody(opId, item, quick) {
  if (!WASHABLE.includes(item)) return { ok: false, why: "alat" };
  return opBody(opId, quick === true ? { item, quick: true } : { item, steps: WASH_SERVER.slice() });
}
// percepat boleh DITAWARKAN hanya setelah ≥1 cuci lengkap (server menghitung washOk); server tetap menolak bila belum.
const canQuick = (dapur) => !!(dapur && dapur.washOk >= 1);
const dirtyList = (dapur) => WASHABLE.filter((k) => dapur && dapur.dirty && dapur.dirty[k] > 0).map((k) => ({ id: k, n: dapur.dirty[k], icon: ITEM[k][0], name: ITEM[k][1] }));
const dirtyTotal = (dapur) => dirtyList(dapur).reduce((a, d) => a + d.n, 0);
// saran urutan persiapan dari resep (tampilan). Urutan yang benar dinilai server.
function nextHint(rec, done) {
  if (!rec) return null; const need = rec.prep || []; let i = 0; for (const d of done || []) if (i < need.length && d === need[i]) i++;
  return i < need.length ? need[i] : null;
}
// PERKIRAAN visual tingkat kematangan (hanya warna/asap di layar; BUKAN penilaian). eff = detik efektif perkiraan; win dari katalog server (resep yang sudah ditemukan) atau umum.
const GENERIC_WIN = { min: 10, ideal: [14, 24], burn: 38 };
function visualStage(eff, win) {
  const w = win || GENERIC_WIN; if (!(eff > 0)) return { k: 0, name: "mentah" };
  if (eff < w.min) return { k: 0.15 + 0.3 * eff / w.min, name: "mentah" };
  if (eff < w.ideal[0]) return { k: 0.45 + 0.2 * (eff - w.min) / (w.ideal[0] - w.min), name: "hampir" };
  if (eff <= w.ideal[1]) return { k: 0.75, name: "pas" };
  if (eff <= w.burn) return { k: 0.75 + 0.25 * (eff - w.ideal[1]) / (w.burn - w.ideal[1]), name: "terlalu" };
  return { k: 1, name: "gosong" };
}
const FACTOR = { 1: 0.6, 2: 1, 3: 1.6 };
function errTextCook(e) {
  const c = e && e.code, m = e && e.message ? String(e.message) : "";
  if (c === "unauthenticated") return "Masuk dulu dengan akun Google.";
  if (c === "unavailable" || c === "internal" || c === "deadline-exceeded") return "Jaringan bermasalah. Tenang, bahan dan masakanmu aman — coba lagi.";
  if (c === "not-found") return "Dapur belum dibuka oleh server.";
  if (c === "resource-exhausted") return "Terlalu cepat. Tunggu sebentar lalu coba lagi.";
  if (c === "failed-precondition" || c === "invalid-argument") return m && m.length <= 140 ? m : "Aksi ditolak server. Bahanmu aman.";
  return "Belum berhasil. Bahan dan masakanmu aman.";
}
// larangan bocor: body ke server tidak boleh memuat bidang yang hanya boleh diputuskan server
const FORBID = ["uid", "email", "token", "price", "balance", "coins", "own", "reward", "quality", "q", "tier", "doneness", "heat", "time", "now"];
const hasForbidden = (o) => { if (!o || typeof o !== "object") return false; for (const k of Object.keys(o)) { if (FORBID.includes(k) || hasForbidden(o[k])) return true; } return false; };

const api = { PREP_ORDER, ACT, WASH_ACT, WASH_SERVER, WASHABLE, ITEM, TOOL_OF_STATION, TOOL_NAME, HEAT_TOOLS, FREE_LIM, TIER, EAT, tierInfo, eatInfo, effectMs, fishPool, recipeReady, validateFree, startBody, stepBody, finishBody, abortBody, eatBody, discardBody, washBody, canQuick, dirtyList, dirtyTotal, nextHint, visualStage, GENERIC_WIN, FACTOR, errTextCook, hasForbidden, LIM, SHELVES, SHELF_ORDER, shelfOf, newBasket, kinds, count, sig, catalogMap, stockOf, add, whyText, lines, total, buyBody, newOpId, errText, definite, mergeEco, LAYOUT, walk, reach, PR, homeDoor };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.NusaDapurCore = api;
})(typeof window !== "undefined" ? window : globalThis);
