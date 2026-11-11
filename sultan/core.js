// NUSA ISLAND — SULTAN SAMUDRA (Mercusuar Emas): kontrak data + penyaring respons (logika murni, UMD).
// Simbol penghargaan koleksi. TIDAK memberi kekuatan, bonus memancing, atau keuntungan permainan apa pun.
// Data HANYA dari server (fungsi pemain sultanTop / sultanMe / sultanPrefs). Klien tidak menghitung poin dan tidak membaca simpanan lokal.
// normalize() meloloskan HANYA {rank, name, points, title}; semua bidang lain (uid, email, token, payment id, nominal, dst.) dibuang di sini.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaSultanCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const ANON = "Sultan Anonim", COOLDOWN_MS = 300000, NAME_MAX = 24, POINTS_MAX = 1000000;
  const TIERS = [{ at: 100, title: "Legenda Samudra" }, { at: 50, title: "Sultan Samudra" }, { at: 30, title: "Saudagar Laut" }, { at: 10, title: "Pendukung Pulau" }];
  const titleFor = (p) => { for (const t of TIERS) if (p >= t.at) return t.title; return ""; };
  const clean = (s, n) => { s = String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f<>`"'&]/g, "").replace(/\s+/g, " ").trim(); const a = Array.from(s); return a.length > n ? a.slice(0, n - 1).join("") + "…" : s; };
  // Pertahanan berlapis: server SUDAH hanya mengirim 4 bidang, tapi nama yang tampak seperti email / uid / token / id pembayaran tetap dibuang di klien.
  const suspicious = (n) => /@/.test(n) || /^[A-Za-z0-9_-]{26,}$/.test(n) || /(^|[^A-Za-z])(pay|trx|ord|order|txn|tok|token|uid)[_:-][A-Za-z0-9]{5,}/i.test(n) || /\d{9,}/.test(n) || /^\s*(rp|idr)\s*\.?\s*\d/i.test(n);
  const safeName = (s) => { const full = clean(s, 200); return !full || suspicious(full) ? ANON : clean(full, NAME_MAX); };
  const safeTitle = (t, p) => { const n = clean(t, NAME_MAX); return TIERS.some((x) => x.title === n) ? n : titleFor(p); };
  /** respons server → { status: "live" | "inactive" | "unavailable", entries: [{rank,name,points,title}] (maks 3, urut) } */
  function normalize(res) {
    if (!res || typeof res !== "object") return { status: "unavailable", entries: [] };
    if (res.status === "inactive") return { status: "inactive", entries: [] };
    if (res.status !== "ok" || !Array.isArray(res.entries)) return { status: "unavailable", entries: [] };
    const seen = new Set(), entries = [];
    for (const e of res.entries.slice(0, 8)) {
      if (!e || typeof e !== "object" || !Number.isInteger(e.rank) || e.rank < 1 || e.rank > 3 || seen.has(e.rank)) continue;
      if (!Number.isInteger(e.points) || e.points < 0 || e.points > POINTS_MAX) continue;
      seen.add(e.rank);
      const ent = { rank: e.rank, name: safeName(e.name), points: e.points, title: safeTitle(e.title, e.points) };
      if (ent.name !== ANON && outfitOk(e.outfit)) ent.outfit = e.outfit;
      entries.push(ent);
    }
    entries.sort((a, b) => a.rank - b.rank);
    return { status: "live", entries };
  }
  /** respons sultanMe → { points, title, anon } atau null */
  function normalizeMe(res) {
    if (!res || typeof res !== "object" || res.status !== "ok" || !Number.isInteger(res.points) || res.points < 0 || res.points > POINTS_MAX) return null;
    return { points: res.points, title: safeTitle(res.title, res.points), anon: res.anon === true };
  }
  // kode outfit publik (format sama dengan Podium Juara / kontrak server): 1-7 bagian "x:id:warna"; selain itu DIBUANG. Sultan Anonim tidak pernah membawa outfit.
  const OUTFIT_RE = /^[tphacsr]:[a-z0-9_]{1,24}:[0-9]{1,2}$/;
  const outfitOk = (o) => typeof o === "string" && o.length <= 140 && o.split("|").length <= 7 && o.split("|").every((p) => OUTFIT_RE.test(p));
  const fresh = (fetchedAt, now) => !!fetchedAt && now - fetchedAt < COOLDOWN_MS && now >= fetchedAt;
  const waitMs = (fetchedAt, now) => Math.max(0, COOLDOWN_MS - (now - fetchedAt));
  return { ANON, COOLDOWN_MS, TIERS, titleFor, normalize, normalizeMe, fresh, waitMs, clean };
});
