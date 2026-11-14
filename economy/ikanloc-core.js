// =========================================================
//  NUSA ISLAND — Ide 07B "Ikan lokasi baru": INTI SUPER RARE (UMD, logika murni; dipakai economy/core.js, klien, dan tes).
//  Tiap lokasi memancing reguler (Muara, Toba, Selat, Raja Ampat, Banda) punya TEPAT SATU ikan SUPER RARE (data.js: sup:true).
//  ATURAN (satu-satunya, transparan):
//   • Ikan SUPER RARE TIDAK ada di kumpulan lemparan klien. Hanya SERVER yang membuatnya, di ecoCatch.
//   • Setiap tangkapan SAH yang masuk kotak (bukan sampah/terlindungi/ikan SF/ikan super) mendapat TEPAT SATU kesempatan undian
//     untuk SUPER RARE lokasi ikan itu. Peluang = 1 / ONE_IN[lokasi] (angka di bawah, juga ditampilkan di Koleksi).
//   • Batas wajar: maksimal DAY_CAP ikan super per lokasi per hari-server per pemain; uid yang sudah diundi tidak diundi ulang (anti-replay).
//   • Berat diundi server dengan kurva yang sama dengan ikan lain; harga jual mengikuti tabel resmi (berat >100 kg dikompres) → nilai terbatas.
//   • Undian memakai RNG aman server; tanpa RNG tepercaya → gagal-tertutup (tidak pernah mengundi).
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaIkanLoc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const LOCS = ["muara", "toba", "selat", "ampat", "banda"];
  // 1 dari N tangkapan sah di lokasi itu. Makin jauh/dalam makin sulit. Jauh lebih sulit daripada ikan Mitos terlangka di lokasi yang sama (≈ 1 dari 300–600).
  const ONE_IN = { muara: 4000, toba: 5000, selat: 6500, ampat: 8000, banda: 10000 };
  const DAY_CAP = 1, DAY_MS = 86400000, REFS_MAX = 60;
  const MITOS_PW = 0.3;   // bobot Mitos di dalam kelompok Legenda (ikan biasa = 1)

  const isSuper = (f) => !!(f && f.sup === true);
  const chanceOf = (loc) => (ONE_IN[loc] ? 1 / ONE_IN[loc] : 0);
  const superOf = (fishList, loc) => (fishList || []).find((f) => isSuper(f) && f.loc === loc) || null;
  // ikan yang boleh memicu undian: ikan lokasi reguler yang sah (bukan sampah, bukan terlindungi, bukan ikan super itu sendiri)
  const eligible = (f) => !!f && !isSuper(f) && f.rarity !== "sampah" && !f.protected && LOCS.includes(f.loc);

  // Satu paket tangkapan sah → daftar ikan super yang DIBUAT server. caught: [{u:uidKlien, id}]; FISH: id→spesies; rand(): [0,1) AMAN; rollW(fish): berat.
  // eco.sx = { d: nomorHari, n: {lokasi: jumlahHariIni}, refs: [uid yang sudah diundi] }. boxFree(): masih ada tempat di kotak server?
  function roll(eco, caught, FISH, rand, rollW, now, boxFree) {
    const out = [], sx = eco.sx && typeof eco.sx === "object" ? eco.sx : (eco.sx = {}), day = Math.floor(now / DAY_MS);
    if (!Array.isArray(sx.refs)) sx.refs = [];
    if (sx.d !== day) { sx.d = day; sx.n = {}; }
    if (!sx.n || typeof sx.n !== "object") sx.n = {};
    const supBy = {}; for (const f of Object.values(FISH)) if (isSuper(f)) supBy[f.loc] = f;
    for (const c of caught) {
      if (!c || sx.refs.includes(c.u)) continue;
      sx.refs.push(c.u); if (sx.refs.length > REFS_MAX) sx.refs.splice(0, sx.refs.length - REFS_MAX);
      const f = FISH[c.id]; if (!eligible(f)) continue;
      const sp = supBy[f.loc]; if (!sp) continue;
      const r = rand(); if (!(r < chanceOf(f.loc))) continue;
      if ((sx.n[f.loc] || 0) >= DAY_CAP) continue;                  // batas harian tercapai: undian ini hangus (tidak ada ikan bocor)
      if (!boxFree()) continue;
      const w = rollW(sp).w, u = "sx" + now.toString(36) + f.loc.slice(0, 2) + Math.floor(rand() * 4294967296).toString(36) + Math.floor(rand() * 4294967296).toString(36);   // waktu + lokasi + 64 bit acak: tidak pernah bentrok, bahkan bila RNG macet
      sx.n[f.loc] = (sx.n[f.loc] || 0) + 1;
      out.push({ uid: u, id: sp.id, w, loc: f.loc, from: c.u });
    }
    return out;
  }

  // Peluang efektif tiap ikan di satu lokasi pada hoki = 1 (seperti chooseFish di game.js: kelompok rarity berbobot, lalu ikan di kelompok berbobot pw).
  // data = FISH penuh dari data.js, RARITY = bobot rarity, night: boolean|undefined. Mengembalikan {id, p, rarity, tier} + jumlah p = 1 (tanpa super).
  function odds(data, RARITY, loc, night) {
    const pool = data.filter((f) => !f.seaOnly && !isSuper(f) && (f.loc === loc || f.loc === "*") && (f.night === undefined || night === undefined || f.night === night));
    const order = ["sampah", "biasa", "langka", "epik", "legenda"], avail = order.filter((r) => pool.some((f) => f.rarity === r));
    const tot = avail.reduce((a, r) => a + RARITY[r].weight, 0), out = [];
    for (const r of avail) {
      const g = pool.filter((f) => f.rarity === r), sw = g.reduce((a, f) => a + (f.pw || 1), 0);
      for (const f of g) out.push({ id: f.id, loc: f.loc, rarity: r, tier: f.mitos ? "mitos" : r, p: (RARITY[r].weight / tot) * ((f.pw || 1) / sw) });
    }
    return out;
  }
  // Pemilihan ikan lemparan (SATU-SATUNYA, dipakai game.js chooseFish & tes simulasi): kelompok rarity berbobot (RARITY.weight × mult), lalu ikan di
  // kelompok itu — seragam, kecuali ada pw (Mitos 0,3). Kelompok tanpa pw memanggil rnd() persis sekali seperti sebelumnya.
  function pickFish(pool, RARITY, mult, rnd) {
    const order = ["sampah", "biasa", "langka", "epik", "legenda"], avail = order.filter((r) => pool.some((f) => f.rarity === r));
    let total = 0; const ws = avail.map((r) => { const w = RARITY[r].weight * mult[r]; total += w; return w; });
    let roll = rnd() * total, rar = avail[0];
    for (let i = 0; i < avail.length; i++) { roll -= ws[i]; if (roll <= 0) { rar = avail[i]; break; } }
    const grp = pool.filter((f) => f.rarity === rar);
    if (grp.some((f) => f.pw)) { let tw = 0; for (const f of grp) tw += f.pw || 1; let rr = rnd() * tw, out = grp[grp.length - 1]; for (const f of grp) { rr -= f.pw || 1; if (rr <= 0) { out = f; break; } } return out; }
    return grp[Math.floor(rnd() * grp.length)];
  }
  return { LOCS, ONE_IN, DAY_CAP, MITOS_PW, isSuper, chanceOf, superOf, eligible, roll, odds, pickFish };
});
