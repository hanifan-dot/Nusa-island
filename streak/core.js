// =========================================================
//  NUSA ISLAND — Login Streak 7 Hari: logika murni (tanpa tampilan, tanpa jaringan)
//  Dipakai oleh game (browser) DAN pengujian (Node). Aturan yang sama dicerminkan di firebase/firestore.rules
//  (blok users/{uid}/streak/state). Jika mengubah aturan di sini, ubah juga di Rules dan tests/unit-streak.js.
//
//  Prinsip: hari ditentukan oleh jam SERVER (Asia/Jakarta, UTC+7, tanpa DST), bukan jam HP.
//  Browser TIDAK mengirim tanggal, jumlah koin, atau hadiah. Browser hanya mengusulkan dokumen berikutnya;
//  Rules menolaknya bila tidak persis sama dengan transisi yang sah menurut jam server.
// =========================================================
(function (root) {
"use strict";

const TZ_OFFSET_MS = 7 * 3600 * 1000;      // Asia/Jakarta
const DAY_MS = 86400000;
const CYCLE_LEN = 7;

// indeks hari kalender Jakarta (bilangan bulat). Sama dengan math.floor((request.time.toMillis()+25200000)/86400000) di Rules.
const dayIndex = (ms) => Math.floor((ms + TZ_OFFSET_MS) / DAY_MS);
const msUntilNextDay = (ms) => (dayIndex(ms) + 1) * DAY_MS - TZ_OFFSET_MS - ms;
const dayLabel = (idx) => new Date(idx * DAY_MS).toISOString().slice(0, 10);

// ---------- Tabel hadiah ----------
// coin = koin, bait = Umpan Hadiah (habis pakai), chest = Peti Hadiah Kecil (isi = coin + bait, langsung dibuka),
// ship / rod = barang eksklusif permanen, furn = satu perabot acak.
const CYCLE1 = [
  { coin: 20 },
  { bait: 3 },
  { coin: 35 },
  { chest: true, coin: 40, bait: 2 },
  { bait: 5 },
  { coin: 50 },
  { ship: true },
];
const SMALL = [ // hari 1–6 untuk siklus kedua dan seterusnya (kecil & seimbang: total ≈ 205 koin + 9 umpan per siklus)
  { coin: 25 },
  { bait: 3 },
  { coin: 40 },
  { coin: 30, bait: 2 },
  { bait: 4 },
  { coin: 60 },
];
const CYCLE2 = SMALL.concat([{ rod: true }]);
const CYCLE3P = SMALL.concat([{ furn: true }]);

function rewardFor(cycle, pos) {
  if (!(cycle >= 1) || !(pos >= 1 && pos <= CYCLE_LEN)) return null;
  const t = cycle === 1 ? CYCLE1 : cycle === 2 ? CYCLE2 : CYCLE3P;
  return Object.assign({}, t[pos - 1]);
}
function describe(r) {
  if (!r) return "";
  const p = [];
  if (r.ship) p.push("Kapal Perintis Eksklusif");
  if (r.rod) p.push("Joran Pelaut Eksklusif");
  if (r.furn) p.push("Perabot Acak");
  if (r.chest) p.push("Peti Hadiah Kecil");
  if (r.coin) p.push(`${r.coin} koin`);
  if (r.bait) p.push(`${r.bait} umpan`);
  return p.join(" + ");
}
// hadiah utama berikutnya (hari 7 siklus ini, atau hari 7 siklus berikutnya bila sudah lewat)
function nextMajor(cycle, nextPos) {
  const c = nextPos > CYCLE_LEN ? cycle + 1 : cycle;
  const r = rewardFor(c, CYCLE_LEN);
  return { cycle: c, pos: CYCLE_LEN, reward: r, name: r.ship ? "Kapal Perintis Eksklusif" : r.rod ? "Joran Pelaut Eksklusif" : "Perabot Acak" };
}

// ---------- Perabot hadiah (13 jenis, 4 tingkat kelangkaan) ----------
// Perabot ini JENIS BARU untuk Rumahku (tidak ada di katalog toko), didaftarkan ke NW.HD.FURN oleh streak/furniture.js.
// col = [atas, sisi kiri, sisi kanan], acc = warna aksen. kind: solid | floor.
const RARITY = {
  biasa: { label: "Biasa", weight: 55, color: "#7fb59f" },
  langka: { label: "Langka", weight: 30, color: "#4aa3df" },
  epik: { label: "Epik", weight: 12, color: "#b56ce8" },
  legenda: { label: "Legenda", weight: 3, color: "#f0b53a" },
};
const RARITY_ORDER = ["biasa", "langka", "epik", "legenda"];
const FURN_POOL = [
  { id: "rw_bangkuBambu", name: "Bangku Bambu", rarity: "biasa", icon: "🪑", w: 1.2, d: 0.6, h: 20, kind: "solid", col: ["#d6c27a", "#b09a52", "#8f7b3e"], acc: "#6e5c2c", desc: "Bangku panjang dari bambu kuning." },
  { id: "rw_rakKelapa", name: "Rak Kelapa", rarity: "biasa", icon: "🥥", w: 0.8, d: 0.5, h: 40, kind: "solid", col: ["#b98a55", "#9a6f3f", "#7d5832"], acc: "#4f7a3b", desc: "Rak batang kelapa dengan buah segar." },
  { id: "rw_potAnggrek", name: "Pot Anggrek", rarity: "biasa", icon: "🌺", w: 0.6, d: 0.6, h: 36, kind: "solid", col: ["#d9a066", "#bd8650", "#9c6c3e"], acc: "#e0629a", desc: "Anggrek bulan di pot tanah liat." },
  { id: "rw_tikarPandan", name: "Tikar Pandan", rarity: "biasa", icon: "🟫", w: 2.0, d: 1.4, h: 1, kind: "floor", col: ["#d8c68c", "#b8a566", "#b8a566"], acc: "#8f7f45", desc: "Tikar anyaman daun pandan." },
  { id: "rw_lemariRotan", name: "Lemari Rotan", rarity: "langka", icon: "🗄️", w: 1.2, d: 0.6, h: 54, kind: "solid", col: ["#c88c4b", "#a96f35", "#885828"], acc: "#f0d58a", desc: "Lemari anyaman rotan halus." },
  { id: "rw_gongKecil", name: "Gong Kecil", rarity: "langka", icon: "🔔", w: 0.9, d: 0.5, h: 48, kind: "solid", col: ["#8a5a32", "#6e4628", "#58381f"], acc: "#e0b84c", desc: "Gong perunggu pada rangka kayu jati." },
  { id: "rw_mejaBatik", name: "Meja Batik", rarity: "langka", icon: "🍵", w: 1.2, d: 1.0, h: 28, kind: "solid", col: ["#7a4a2a", "#5f3a20", "#4a2d18"], acc: "#e8c98a", desc: "Meja pendek bertaplak batik." },
  { id: "rw_karpetBatik", name: "Karpet Batik", rarity: "langka", icon: "🟦", w: 2.4, d: 1.8, h: 1, kind: "floor", col: ["#2f5d8a", "#244a6e", "#244a6e"], acc: "#e8c98a", desc: "Karpet motif batik parang biru." },
  { id: "rw_jukungMini", name: "Perahu Jukung Pajangan", rarity: "epik", icon: "⛵", w: 1.6, d: 0.7, h: 26, kind: "solid", col: ["#e0b84c", "#2f7a8c", "#235f6e"], acc: "#fff6e4", desc: "Jukung mungil bercadik, dipajang di dudukan." },
  { id: "rw_guciNaga", name: "Guci Naga", rarity: "epik", icon: "🏺", w: 0.7, d: 0.7, h: 50, kind: "solid", col: ["#e8e2d0", "#2a6f9c", "#1f567a"], acc: "#e0b84c", desc: "Guci porselen berlukis naga biru." },
  { id: "rw_wayangKulit", name: "Panel Wayang Kulit", rarity: "epik", icon: "🎭", w: 1.3, d: 0.35, h: 60, kind: "solid", col: ["#6b3a1c", "#52301a", "#3f2412"], acc: "#f3d27a", desc: "Wayang kulit berukir dengan bingkai kayu." },
  { id: "rw_garudaEmas", name: "Patung Garuda Emas", rarity: "legenda", icon: "🦅", w: 0.9, d: 0.9, h: 70, kind: "solid", col: ["#ffd95a", "#d9a82e", "#a87d18"], acc: "#fff3b0", desc: "Garuda bersayap terbuka berlapis emas. Bersinar lembut." },
  { id: "rw_singgasana", name: "Singgasana Nusantara", rarity: "legenda", icon: "👑", w: 1.1, d: 1.0, h: 58, kind: "solid", col: ["#8e1f2d", "#6e1824", "#541019"], acc: "#ffd95a", desc: "Singgasana ukir merah-emas. Bersinar lembut." },
];
const FURN_IDS = FURN_POOL.map((f) => f.id);
const FURN_BY_ID = Object.fromEntries(FURN_POOL.map((f) => [f.id, f]));

// Pilih perabot acak. owned = himpunan id jenis yang sudah ada di Rumahku (furniture + gudang), granted = id yang sudah pernah
// diberikan streak (tercatat di server). Aturan: hindari duplikat selama masih ada yang belum dimiliki.
// rnd() harus mengembalikan angka di [0,1); di browser dipasok dari crypto.getRandomValues.
function pickFurniture(owned, granted, rnd) {
  const have = new Set([...(owned || []), ...(granted || [])]);
  let cand = FURN_POOL.filter((f) => !have.has(f.id));
  if (!cand.length) cand = FURN_POOL.slice();                 // semua sudah dimiliki → duplikat baru boleh
  const present = RARITY_ORDER.filter((r) => cand.some((f) => f.rarity === r));
  const total = present.reduce((a, r) => a + RARITY[r].weight, 0);
  let x = rnd() * total, rar = present[present.length - 1];
  for (const r of present) { if (x < RARITY[r].weight) { rar = r; break; } x -= RARITY[r].weight; }
  const list = cand.filter((f) => f.rarity === rar);
  return list[Math.min(list.length - 1, Math.floor(rnd() * list.length))].id;
}

// ---------- Mesin status (cermin Rules) ----------
// Dokumen server: users/{uid}/streak/state
//   total  = jumlah klaim seumur akun          cycle = siklus (1,2,3,…)       pos = posisi hari yang TERAKHIR diklaim (1..7)
//   lastDay = indeks hari Jakarta klaim terakhir   ship / rod = kepemilikan eksklusif (tidak pernah dicabut)
//   furn = id perabot yang pernah diberikan (urut)    last = {cycle,pos,fid} hadiah klaim terakhir    at = waktu server
const FIELDS = ["total", "cycle", "pos", "lastDay", "ship", "rod", "furn", "last", "at"];

const EMPTY = () => ({ total: 0, cycle: 1, pos: 0, lastDay: -1, ship: false, rod: false, furn: [], last: null });

// Berapa posisi & siklus klaim berikutnya bila hari ini = today.
function nextPosition(prev, today) {
  if (!prev || !(prev.total > 0)) return { cycle: 1, pos: 1, reset: false, first: true };
  const finished = prev.pos >= CYCLE_LEN;
  if (prev.lastDay === today - 1) {                       // berturut-turut
    return finished ? { cycle: prev.cycle + 1, pos: 1, reset: false } : { cycle: prev.cycle, pos: prev.pos + 1, reset: false };
  }
  // melewatkan ≥1 hari kalender: kembali ke Hari 1 pada siklus yang sedang dikerjakan (siklus yang sudah tamat → siklus berikutnya)
  return { cycle: finished ? prev.cycle + 1 : prev.cycle, pos: 1, reset: !finished && prev.pos >= 1 };
}
// Status klaim untuk tampilan (jam server perkiraan) — keputusan akhir tetap di Rules.
function status(prev, nowMs) {
  const today = dayIndex(nowMs), p = prev && prev.total > 0 ? prev : null;
  const claimedToday = !!p && p.lastDay === today;
  if (claimedToday) {
    const np = nextPosition(p, today + 1);
    return { claimedToday: true, canClaim: false, today, streak: p.pos, cycle: p.cycle, claimPos: p.pos, claimCycle: p.cycle, next: np, msLeft: msUntilNextDay(nowMs) };
  }
  const np = nextPosition(p, today);
  const lost = !!p && p.lastDay < today - 1 && p.pos >= 1 && p.pos < CYCLE_LEN;     // streak terputus (ada hari terlewat)
  return { claimedToday: false, canClaim: true, today, streak: np.pos === 1 ? 0 : p.pos, cycle: np.cycle, claimPos: np.pos, claimCycle: np.cycle, next: np, lost, brokenAt: lost ? p.pos : 0, msLeft: msUntilNextDay(nowMs) };
}
// Susun dokumen berikutnya yang diusulkan klien. Mengembalikan null bila hari ini sudah diklaim.
function planClaim(prev, nowMs, ctx) {
  ctx = ctx || {};
  const today = dayIndex(nowMs), p = prev && prev.total > 0 ? prev : EMPTY();
  if (p.total > 0 && p.lastDay >= today) return null;
  const np = nextPosition(p.total > 0 ? p : null, today);
  const rw = rewardFor(np.cycle, np.pos);
  const next = {
    total: p.total + 1, cycle: np.cycle, pos: np.pos, lastDay: today,
    ship: !!p.ship || !!rw.ship, rod: !!p.rod || !!rw.rod,
    furn: (p.furn || []).slice(), last: { cycle: np.cycle, pos: np.pos, fid: "" },
    at: null,                        // diisi waktu SERVER oleh penyimpanan (serverTimestamp); nilai dari klien tidak dipakai
  };
  if (rw.furn) {
    const fid = pickFurniture(ctx.owned, p.furn, ctx.rnd || Math.random);
    next.furn.push(fid); next.last.fid = fid;
  }
  return { next, reward: rw, cycle: np.cycle, pos: np.pos, reset: np.reset, fid: next.last.fid };
}

// Validasi transisi dengan aturan YANG SAMA seperti Rules (dipakai untuk menguji Rules secara tidak langsung dan oleh penyimpanan palsu
// di pengujian). Mengembalikan {ok:true} atau {ok:false, why}. serverMs = request.time.
function validateTransition(prev, next, serverMs) {
  const bad = (why) => ({ ok: false, why });
  const today = dayIndex(serverMs), has = prev && prev.total > 0;
  if (!next || typeof next !== "object") return bad("bentuk");
  const keys = Object.keys(next).sort().join(","), want = FIELDS.slice().sort().join(",");
  if (keys !== want) return bad("kunci");
  const int = (v) => Number.isInteger(v);
  if (!int(next.total) || !int(next.cycle) || !int(next.pos) || !int(next.lastDay)) return bad("tipe");
  if (typeof next.ship !== "boolean" || typeof next.rod !== "boolean" || !Array.isArray(next.furn)) return bad("tipe");
  if (next.pos < 1 || next.pos > CYCLE_LEN || next.cycle < 1) return bad("rentang");
  if (next.lastDay !== today) return bad("hari");                       // satu klaim per hari kalender, menurut jam server
  if (has && prev.lastDay >= today) return bad("sudah-klaim");
  if (next.total !== (has ? prev.total + 1 : 1)) return bad("total");
  const exp = nextPosition(has ? prev : null, today);
  if (next.cycle !== exp.cycle || next.pos !== exp.pos) return bad("urutan");
  const rw = rewardFor(next.cycle, next.pos), pShip = has && prev.ship, pRod = has && prev.rod, pFurn = has ? prev.furn : [];
  if (next.ship !== (pShip || !!rw.ship)) return bad("kapal");
  if (next.rod !== (pRod || !!rw.rod)) return bad("joran");
  if (!next.last || next.last.cycle !== next.cycle || next.last.pos !== next.pos || typeof next.last.fid !== "string") return bad("last");
  if (rw.furn) {
    const fid = next.last.fid;
    if (!FURN_BY_ID[fid]) return bad("perabot-tak-dikenal");
    if (pFurn.includes(fid) && pFurn.length < FURN_IDS.length) return bad("perabot-duplikat");
    if (next.furn.length !== pFurn.length + 1 || next.furn[next.furn.length - 1] !== fid || pFurn.some((x, i) => next.furn[i] !== x)) return bad("daftar-perabot");
  } else {
    if (next.last.fid !== "") return bad("fid");
    if (next.furn.length !== pFurn.length || pFurn.some((x, i) => next.furn[i] !== x)) return bad("daftar-perabot");
  }
  return { ok: true };
}

const API = {
  TZ_OFFSET_MS, DAY_MS, CYCLE_LEN, dayIndex, msUntilNextDay, dayLabel, CYCLE1, CYCLE2, CYCLE3P, SMALL, rewardFor, describe, nextMajor,
  RARITY, RARITY_ORDER, FURN_POOL, FURN_IDS, FURN_BY_ID, pickFurniture, FIELDS, EMPTY, nextPosition, status, planClaim, validateTransition,
};
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.StreakCore = API; }
})(typeof window !== "undefined" ? window : globalThis);
