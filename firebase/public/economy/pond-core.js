// =========================================================
//  NUSA ISLAND — INTI KOLAM IKAN RUMAHKU (logika murni, UMD). Dipakai server (economy/core.js → ecoPond*) DAN klien (hanya untuk
//  menampilkan hitungan kenyang/perkiraan waktu dari data + jam SERVER). Tidak ada akses jaringan/penyimpanan di sini.
//  Aturan:
//   - Kenyang 0–100%. Ikan masuk = 100%. Berkurang 1% tiap 6 jam (100→0 = 25 hari). Dihitung dari timestamp SERVER (t0) dan nilai s0;
//     refresh/login ulang/ubah jam HP tidak mengubah apa pun karena klien tidak mengirim waktu atau kenyang.
//   - Ikan mati TEPAT saat kenyang mencapai 0 (waktu kematian = t0 + s0×6 jam, bukan waktu pemain login). Pemrosesan kematian
//     idempoten: ikan dihapus dari kolam di transaksi yang sama dengan pencatatan riwayat.
//   - Satu pakan memberi makan SEMUA ikan di kolam (satu lemparan ke air). Sisa waktu pecahan (<6 jam) dipertahankan saat memberi makan.
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaPondCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const STEP_MS = 6 * 3600000;                       // 1% per 6 jam
  const LEVELS = [null, { cap: 20, cost: 0 }, { cap: 50, cost: 10000 }, { cap: 100, cost: 35000 }, { cap: 150, cost: 75000 }, { cap: 200, cost: 150000 }];
  const MAX_LV = LEVELS.length - 1, MAX_FISH = 60, HIST_MAX = 40, LIMBO_MAX = 30, STOCK_MAX = 999;
  // gain: tambah kenyang (persen); full: isi sampai penuh. Harga pakan sesuai permintaan Owner.
  const FEED = {
    pelet: { name: "Pelet Biasa", icon: "🟤", price: 500, gain: 20, note: "+20% kenyang" },
    nutrisi: { name: "Pakan Nutrisi", icon: "🟢", price: 2000, gain: 50, note: "+50% kenyang" },
    premium: { name: "Pakan Premium", icon: "🟡", price: 5000, full: true, note: "isi sampai penuh" },
  };
  // Perlengkapan visual (harga usulan; dibandingkan harga rumah 900–55.000 & joran 400–110.000). max = jumlah maksimum dimiliki.
  const GEAR = {
    aerator: { name: "Aerator Kolam", icon: "🫧", price: 3500, max: 1, note: "gelembung udara animasi" },
    tanaman: { name: "Tanaman Air", icon: "🪷", price: 1500, max: 3, note: "dekorasi (maks 3 rumpun)" },
    lampu: { name: "Lampu Kolam", icon: "💡", price: 2500, max: 1, note: "menyala di malam hari" },
  };
  const WARN = { notice: 30, serious: 15, critical: 5 };
  const DEATH_MSG = "X_X Ikannya meningoy karena kelaparan! Jangan lupa kasih makan, bos!";

  const fresh = () => ({ lv: 1, fish: [], feed: { pelet: 0, nutrisi: 0, premium: 0 }, gear: { aerator: 0, tanaman: 0, lampu: 0 }, hist: [], limbo: [], deaths: 0 });
  const clampInt = (v, a, b) => Math.max(a, Math.min(b, Math.floor(v)));
  // kenyang saat `now` untuk satu ikan {s0,t0}; <=0 berarti sudah mati
  const satAt = (f, now) => f.s0 - Math.floor(Math.max(0, now - f.t0) / STEP_MS);
  const deathAt = (f) => f.t0 + f.s0 * STEP_MS;
  // sisa ms sampai kenyang 0 (mati)
  const etaMs = (f, now) => Math.max(0, deathAt(f) - now);
  // tingkat peringatan: "ok" | "notice"(≤30) | "serious"(≤15) | "critical"(≤5) | "dead"
  const levelOf = (sat) => (sat <= 0 ? "dead" : sat <= WARN.critical ? "critical" : sat <= WARN.serious ? "serious" : sat <= WARN.notice ? "notice" : "ok");
  const usedKg = (p) => Math.round(p.fish.reduce((a, f) => a + f.w, 0) * 100) / 100;
  const capOf = (p) => LEVELS[p.lv].cap;
  // Proses kematian: pindahkan ikan yang sudah 0 ke riwayat. Mengubah p; mengembalikan daftar yang mati sekarang. Aman dipanggil berulang.
  function sweep(p, now) {
    const died = [], keep = [];
    for (const f of p.fish) {
      if (satAt(f, now) <= 0) { const rec = { u: f.u, id: f.id, w: f.w, at: deathAt(f), seen: false }; died.push(rec); p.hist.push(rec); }
      else keep.push(f);
    }
    if (died.length) { p.fish = keep; p.deaths = (p.deaths || 0) + died.length; if (p.hist.length > HIST_MAX) p.hist.splice(0, p.hist.length - HIST_MAX); }
    return died;
  }
  // Beri makan semua ikan hidup. Mengubah p (fish.s0/t0). Mengembalikan {fed, before:[..], after:[..]} atau null bila semua sudah 100%.
  function applyFeed(p, kind, now) {
    const F = FEED[kind]; if (!F) return null;
    let any = false;
    for (const f of p.fish) {
      const steps = Math.floor(Math.max(0, now - f.t0) / STEP_MS), cur = f.s0 - steps;     // kenyang sekarang (>0 setelah sweep)
      if (cur >= 100) continue; any = true;
      const next = F.full ? 100 : Math.min(100, cur + F.gain);
      f.s0 = next; f.t0 = f.t0 + steps * STEP_MS;                                          // pertahankan sisa pecahan
    }
    return any ? { fed: p.fish.length } : null;
  }
  const rarityOk = (fish) => !!fish && fish.rarity !== "sampah" && !fish.protected;
  function viewOf(p, now) {
    return {
      lv: p.lv, cap: capOf(p), used: usedKg(p), now, step: STEP_MS, nextLv: p.lv < MAX_LV ? { lv: p.lv + 1, cap: LEVELS[p.lv + 1].cap, cost: LEVELS[p.lv + 1].cost } : null,
      fish: p.fish.map((f) => ({ u: f.u, id: f.id, w: f.w, vr: f.vr || null, t: f.t || 0, s0: f.s0, t0: f.t0, sat: Math.max(0, satAt(f, now)), eta: etaMs(f, now) })),
      feed: p.feed, gear: p.gear, hist: p.hist.slice(-15), limbo: p.limbo, deaths: p.deaths || 0,
    };
  }
  return { STEP_MS, LEVELS, MAX_LV, MAX_FISH, HIST_MAX, LIMBO_MAX, STOCK_MAX, FEED, GEAR, WARN, DEATH_MSG, fresh, clampInt, satAt, deathAt, etaMs, levelOf, usedKg, capOf, sweep, applyFeed, rarityOk, viewOf };
});
