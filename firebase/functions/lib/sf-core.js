// SALINAN OTOMATIS dari economy/sf-core.js — jangan diedit di sini (node firebase/scripts/sync-economy.js).
// =========================================================
//  NUSA ISLAND — INTI SERVER SAMUDRA FOLLOWER (UMD, logika murni). Dipakai economy/core.js (ecoCatch/ecoSell).
//  PRINSIP: 4 ikan ini TERKUNCI. Kode TIDAK membawa harga/peluang final. Nilai final hanya datang dari shop/config.sf yang ditulis Owner
//  (disetujui: approvedBy + approvedAt) dan harus lolos pagar kewajaran terhadap REKOMENDASI di bawah. Tanpa itu server menjawab
//  "Ikan tidak dikenal" (sama seperti sebelum fitur ini → tidak membocorkan keberadaan ikan).
//  Tidak menyentuh tabel FISH/peluang ikan lama maupun Event Megalodon.
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaSFCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // Rekomendasi (BUKAN nilai final): price = koin per kg (sebelum PRICE_SCALE×nerf, rumus harga yang sama dengan ikan lama), chance = peluang BONUS per pendaratan ikan
  // biasa (model bonus: tabel ikan lama tidak berubah sama sekali), dayCap = maks tangkapan per ikan per hari server (UTC).
  const SPEC = {
    sf_tempe:         { rarity: "mythical",       wMin: 0.3,  wMax: 1.4, event: false, rec: { price: 7400, chance: 0.001, dayCap: 1 } },
    sf_cupang_slayer: { rarity: "epic",           wMin: 0.05, wMax: 0.4, event: false, rec: { price: 3800, chance: 0.003, dayCap: 2 } },
    sf_prabowo:       { rarity: "mythical_event", wMin: 3,    wMax: 14,  event: true,  rec: { price: 750,  chance: 0.003, dayCap: 2 } },
    sf_arapaima:      { rarity: "legendary",      wMin: 60,   wMax: 220, event: false, rec: { price: 30,   chance: 0.0012, dayCap: 1 } },
  };
  // Pagar keras (tidak bisa dilonggarkan lewat config): nilai Owner di luar ini ditolak sebagai salah ketik.
  const HARD = { priceMin: 0.4, priceMax: 1.5, chanceMax: 0.01, dayCapMax: 3, totalDayMax: 4, perBatch: 1 };
  const IDS = Object.keys(SPEC), isSF = (id) => typeof id === "string" && Object.prototype.hasOwnProperty.call(SPEC, id);
  const num = (v) => typeof v === "number" && Number.isFinite(v);

  // Ubah config Owner → daftar ikan yang AKTIF + alasan tiap yang terkunci. cfg = isi shop/config (atau null).
  function status(cfg) {
    const sf = cfg && typeof cfg === "object" && cfg.sf && typeof cfg.sf === "object" ? cfg.sf : null, out = {};
    for (const id of IDS) {
      const s = SPEC[id], a = sf && sf.fish && sf.fish[id];
      if (!sf || sf.on !== true) { out[id] = { ok: false, why: "off" }; continue; }
      if (!a || typeof a !== "object") { out[id] = { ok: false, why: "no-approval" }; continue; }
      if (typeof a.approvedBy !== "string" || !a.approvedBy || !num(a.approvedAt) || a.approvedAt <= 0) { out[id] = { ok: false, why: "no-approval" }; continue; }
      if (!num(a.price) || a.price < s.rec.price * HARD.priceMin || a.price > s.rec.price * HARD.priceMax) { out[id] = { ok: false, why: "bad-price" }; continue; }
      if (!num(a.chance) || a.chance <= 0 || a.chance > HARD.chanceMax) { out[id] = { ok: false, why: "bad-chance" }; continue; }
      const dc = a.dayCap === undefined ? s.rec.dayCap : a.dayCap;
      if (!Number.isInteger(dc) || dc < 1 || dc > HARD.dayCapMax) { out[id] = { ok: false, why: "bad-cap" }; continue; }
      if (s.event && sf.eventOn !== true) { out[id] = { ok: false, why: "event-off" }; continue; }
      out[id] = { ok: true, price: a.price, chance: a.chance, dayCap: dc };
    }
    return out;
  }
  // Satu ikan: {ok:true, fish:{bentuk seperti baris FISH}, dayCap} atau {ok:false, why}. Berat divalidasi terpisah (weightOk).
  function resolve(cfg, id) {
    if (!isSF(id)) return { ok: false, why: "unknown" };
    const st = status(cfg)[id]; if (!st.ok) return st;
    const s = SPEC[id];
    return { ok: true, dayCap: st.dayCap, fish: { id, rarity: s.rarity, wMin: s.wMin, wMax: s.wMax, xMax: null, price: st.price, protected: false, loc: "sf", sf: true } };
  }
  // Berat harus di dalam rentang resmi ikan (toleransi pembulatan 1%): tidak ada "ikan raksasa" palsu.
  const weightOk = (id, w) => isSF(id) && num(w) && w >= SPEC[id].wMin * 0.99 && w <= SPEC[id].wMax * 1.01;
  const dayOf = (now) => Math.floor(now / 86400000);
  // Anti-duplikasi/burst: ≤ perBatch ikan SF per paket, per-ikan ≤ dayCap per hari, total ≤ totalDayMax per hari. Mengubah `sf` (milik dokumen ekonomi pemain).
  function takeDaily(sf, id, dayCap, now) {
    const d = dayOf(now); if (sf.d !== d) { sf.d = d; sf.n = {}; }
    const used = Object.values(sf.n).reduce((a, b) => a + b, 0);
    if ((sf.n[id] || 0) >= dayCap || used >= HARD.totalDayMax) return false;
    sf.n[id] = (sf.n[id] || 0) + 1; return true;
  }
  return { SPEC, HARD, IDS, isSF, status, resolve, weightOk, takeDaily, dayOf };
});
