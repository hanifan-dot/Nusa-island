// SALINAN OTOMATIS dari economy/damar-core.js — jangan diedit di sini (node firebase/scripts/sync-economy.js).
/* =========================================================
   NUSA ISLAND — INTI "PENGIRIMAN SEGAR PAK DAMAR" (UMD, logika murni, tanpa jaringan/DB)
   Quest harian: antar 6 ikan dengan 2 kotak pendingin (@3 ikan) dari inventaris → kapal → Pelabuhan Kota → mobil Pak Damar.
   SERVER-AUTHORITATIVE: hari memakai jam SERVER (WIB), ikan dipindah dari kotak server ke kotak pendingin (dikonsumsi tepat sekali),
   hadiah dibayar tepat sekali per hari. Kegagalan perjalanan TIDAK menghapus ikan/progres (ikan tetap di kotak pendingin; yang bisa hilang hanya bonus kesegaran).
   Dipakai economy/core.js lewat opts.damar (opsional; tanpa ini ecoDamar* menolak) dan dikunci feature flag `pakDamar` (bawaan MATI) di Worker.
   Angka hadiah = USULAN (belum disetujui Owner); ubah di sini, uji ulang, lalu salin ke backend.
   ========================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DamarCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const NEED = 6, BOXES = 2, PER_BOX = 3, DAY_MS = 86400000, TZ_MS = 7 * 3600000;   // reset 00:00 WIB (UTC+7), dari jam SERVER
  const MIN_TRIP_MS = 45000, FRESH_MS = 20 * 60000;                                     // pelayaran minimal 45 dtk; segar bila ≤20 menit sejak muat
  const BASE = 900, FRESH_BONUS = 300;                                                  // koin: dasar + bonus kesegaran proporsional
  const dayOf = (now) => Math.floor((now + TZ_MS) / DAY_MS);
  const emptyBox = () => ({ st: "idle", fish: [], at: 0, sail: 0 });
  const fresh = (day) => ({ v: 1, day, boxes: [emptyBox(), emptyBox()], done: [], paid: false, reward: 0, trips: 0 });
  const fishOk = (f) => !!f && f.rarity !== "sampah" && !f.protected;                   // sampah/ikan terlindungi tidak boleh dikirim
  const inBoxes = (d) => d.boxes.reduce((n, b) => n + b.fish.length, 0);
  const left = (d) => NEED - d.done.length - inBoxes(d);
  // Ganti hari (jam server): ikan yang masih di kotak pendingin DIKEMBALIKAN ke inventaris (bukan dihapus), lalu quest hari baru. Hasil: { d, back: [ikan] }.
  function roll(d, now) {
    const day = dayOf(now);
    if (!d || d.v !== 1 || !Array.isArray(d.boxes)) return { d: fresh(day), back: [] };
    if (d.day === day) return { d, back: [] };
    const back = []; for (const b of d.boxes) for (const f of b.fish) back.push(f);
    return { d: fresh(day), back };
  }
  const boxAt = (d, i) => { const b = d.boxes[i]; if (!Number.isInteger(i) || !b) throw new Error("Kotak pendingin tidak valid."); return b; };
  function load(d, i, fishList, now) {
    const b = boxAt(d, i);
    if (b.st !== "idle") throw new Error("Kotak sedang berlayar.");
    if (!fishList.length) throw new Error("Pilih ikan.");
    if (b.fish.length + fishList.length > PER_BOX) throw new Error("Satu kotak maksimal " + PER_BOX + " ikan.");
    if (fishList.length > left(d)) throw new Error("Pesanan hari ini hanya " + NEED + " ikan.");
    if (!b.fish.length) b.at = now;                                                     // jam kesegaran mulai saat ikan pertama dimuat
    for (const f of fishList) b.fish.push({ u: f.u, id: f.id, w: f.w });
    return b;
  }
  function unload(d, i) { const b = boxAt(d, i); if (b.st !== "idle") throw new Error("Kotak sedang berlayar."); const back = b.fish; d.boxes[i] = emptyBox(); return back; }
  function sail(d, i, now) { const b = boxAt(d, i); if (b.st !== "idle") throw new Error("Kotak sudah berlayar."); if (!b.fish.length) throw new Error("Kotak kosong."); b.st = "sailing"; b.sail = now; return b; }
  // Batal/gagal pelayaran: ikan TETAP aman di kotak (progres tidak hilang); kesegaran hanya berkurang oleh waktu.
  function abort(d, i) { const b = boxAt(d, i); if (b.st !== "sailing") throw new Error("Kotak tidak sedang berlayar."); b.st = "idle"; b.sail = 0; return b; }
  function deliver(d, i, now) {
    const b = boxAt(d, i);
    if (b.st !== "sailing") throw new Error("Kotak belum berlayar.");
    if (now - b.sail < MIN_TRIP_MS) throw new Error("Pelayaran belum sampai Pelabuhan Kota.");
    const isFresh = now - b.at <= FRESH_MS, moved = b.fish.length;
    for (const f of b.fish) d.done.push({ u: f.u, id: f.id, w: f.w, fr: isFresh });
    d.boxes[i] = emptyBox(); d.trips++;
    let reward = 0;
    if (!d.paid && d.done.length >= NEED) {                                             // hadiah TEPAT SEKALI per hari
      const fr = d.done.filter((x) => x.fr).length;
      reward = BASE + Math.round((FRESH_BONUS * fr) / NEED); d.paid = true; d.reward = reward;
    }
    return { moved, fresh: isFresh, reward };
  }
  function viewOf(d, now) {
    return { day: d.day, need: NEED, per: PER_BOX, delivered: d.done.length, paid: d.paid, reward: d.paid ? d.reward : null, preview: { base: BASE, freshBonus: FRESH_BONUS }, freshMs: FRESH_MS, minTripMs: MIN_TRIP_MS,
      boxes: d.boxes.map((b) => ({ st: b.st, n: b.fish.length, fish: b.fish.map((f) => ({ u: f.u, id: f.id, w: f.w })), freshLeftMs: b.fish.length ? Math.max(0, FRESH_MS - (now - b.at)) : null, sailMs: b.st === "sailing" ? Math.max(0, MIN_TRIP_MS - (now - b.sail)) : 0 })) };
  }
  return { NEED, BOXES, PER_BOX, DAY_MS, MIN_TRIP_MS, FRESH_MS, BASE, FRESH_BONUS, dayOf, fresh, fishOk, roll, load, unload, sail, abort, deliver, viewOf, left };
});
