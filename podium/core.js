// NUSA ISLAND — PODIUM JUARA / LEADERBOARD: kontrak data + normalisasi (logika murni, UMD). Dipakai klien & uji; salinan yang sama boleh dipakai server untuk memvalidasi keluaran.
// ---------------------------------------------------------------------------------------------------------------------
// PRINSIP KEAMANAN
//  • Peringkat HANYA berasal dari respons server `leaderboardTop` (dihitung dari statistik yang dipegang server). Klien TIDAK PERNAH menghitung/mengirim
//    peringkat atau skor dari simpanan browser (localStorage / S.stats / Cloud Save mentah mudah dimanipulasi).
//  • normalize() menolak respons yang tidak masuk akal (peringkat tidak berurutan, skor naik, nama tidak sah) → "tidak aktif", bukan peringkat palsu.
//  • Nama pemain = username permanen (aturan NusaNameCore.validate). Entri dengan nama yang melanggar aturan dibuang.
//
// KONTRAK API  (fungsi Worker `nusa-api` /fn/leaderboardTop, Bearer Firebase ID token; klien: cloud.call("leaderboardTop", {category, limit}))
//   permintaan : { category: "catch" | "species", limit: 3..10 }
//   respons    : { ok: true, v: 1, status: "live" | "inactive", category, updatedAt: <ms epoch>,
//                  entries: [ { rank: 1, name: "Hanifan", score: 1234, title?: "Raja Pancing", outfit?: "t:kaos_merah:2|p:..." }, ... urut rank 1..n ],
//                  me?: { rank: 57, score: 321 } | null }
//   `status:"inactive"` (atau fungsi belum ada / error) = papan belum aktif → klien menampilkan placeholder, TIDAK mengarang peringkat.
//   `title` opsional dari server (menimpa tabel gelar bawaan). `outfit` opsional = kode penampilan avatar (format mp/proto.cleanOutfit, Tahap 2.6).
// KATEGORI (hanya statistik yang dipegang server — shop/economy/<uid>):
//   catch   : "Juara Tangkapan"  = total ikan tercatat server (jumlah eco.cat; dibatasi laju: jeda tangkapan & batas per jam)
//   species : "Juara Koleksi"    = jumlah spesies ikan berbeda yang tercatat server (keys eco.cat)
//   BATAS JUJUR: server tidak bisa melihat pemain benar-benar memancing; angka dijamin ≤ batas laju & tabel resmi, bukan angka bebas dari browser.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../username/core.js"));
  else root.NusaPodiumCore = factory(root.NusaNameCore);
})(typeof self !== "undefined" ? self : this, function (NameCore) {
  "use strict";
  const V = 1, MAX_ENTRIES = 10, TITLE_MAX = 24, SCORE_MAX = 1e12;
  const CATEGORIES = {
    catch: { id: "catch", label: "Tangkapan", full: "Juara Tangkapan", unit: "ikan", desc: "Total ikan yang tercatat di server." },
    species: { id: "species", label: "Koleksi", full: "Juara Koleksi", unit: "spesies", desc: "Jumlah spesies ikan berbeda yang tercatat di server." },
  };
  // GELAR bawaan per kategori & peringkat — MUDAH DIGANTI: ubah tabel ini (atau kirim `title` dari server per entri; server menimpa tabel).
  const TITLES = {
    catch: { 1: "Raja Pancing", 2: "Pemburu Handal", 3: "Nelayan Tangguh" },
    species: { 1: "Penjelajah Samudra", 2: "Kolektor Ulung", 3: "Pengamat Laut" },
  };
  const OUTFIT_PART = /^[tphacsr]:[a-z0-9_]{1,24}:[0-9]{1,2}$/;
  const cleanOutfit = (v) => {                              // sama dengan mp/proto.cleanOutfit: hanya ID item + indeks warna
    if (v == null || v === "") return ""; if (typeof v !== "string" || v.length > 140) return null;
    const parts = v.split("|"), seen = new Set(); if (parts.length > 7) return null;
    for (const x of parts) { if (!OUTFIT_PART.test(x) || seen.has(x[0])) return null; seen.add(x[0]); } return v;
  };
  const cleanTitle = (v) => { if (typeof v !== "string") return ""; const s = v.replace(/[\u0000-\u001f\u007f<>&"']/g, "").replace(/\s+/g, " ").trim(); return Array.from(s).slice(0, TITLE_MAX).join(""); };
  const titleFor = (cat, rank, own) => cleanTitle(own) || (TITLES[cat] && TITLES[cat][rank]) || "";
  const placeholder = (rank) => `Belum ada Juara ${rank}`;
  const isCat = (c) => Object.prototype.hasOwnProperty.call(CATEGORIES, c);

  // Hasil: { status: "live"|"inactive", category, updatedAt, entries: [...], podium: [e1,e2,e3] (null jika kosong), me, reason }
  function inactive(category, reason) { return { status: "inactive", category, updatedAt: 0, entries: [], podium: [null, null, null], me: null, reason: reason || "inactive" }; }
  function normalize(resp, category) {
    if (!isCat(category)) return inactive("catch", "kategori");
    if (!resp || typeof resp !== "object" || resp.ok !== true) return inactive(category, "respons");
    if (resp.status === "inactive") return inactive(category, "server-inactive");
    if (resp.v !== V || resp.category !== category || !Array.isArray(resp.entries)) return inactive(category, "bentuk");
    const upd = Number(resp.updatedAt); if (!Number.isFinite(upd) || upd < 0) return inactive(category, "waktu");
    const out = []; let prevRank = 0, prevScore = Infinity;
    for (const e of resp.entries.slice(0, MAX_ENTRIES)) {
      if (!e || typeof e !== "object") return inactive(category, "entri");
      const rank = e.rank, score = e.score;
      if (!Number.isInteger(rank) || rank !== prevRank + 1) return inactive(category, "urutan");             // 1,2,3,… tanpa lompat/ganda
      if (!Number.isInteger(score) || score < 0 || score > SCORE_MAX || score > prevScore) return inactive(category, "skor");   // skor tidak boleh naik
      const nm = typeof e.name === "string" && NameCore ? NameCore.validate(e.name) : { ok: false };
      if (!nm.ok) return inactive(category, "nama");                                                          // nama tidak sah → seluruh papan ditolak (bukan dikarang)
      const outfit = cleanOutfit(e.outfit); if (outfit === null) return inactive(category, "outfit");
      out.push({ rank, name: nm.name, lower: nm.lower, score, title: titleFor(category, rank, e.title), outfit });
      prevRank = rank; prevScore = score;
    }
    let me = null;
    if (resp.me && Number.isInteger(resp.me.rank) && resp.me.rank >= 1 && Number.isInteger(resp.me.score) && resp.me.score >= 0 && resp.me.score <= SCORE_MAX) me = { rank: resp.me.rank, score: resp.me.score };
    return { status: "live", category, updatedAt: upd, entries: out, podium: [out[0] || null, out[1] || null, out[2] || null], me, reason: "" };
  }
  return { V, MAX_ENTRIES, TITLE_MAX, CATEGORIES, TITLES, placeholder, titleFor, cleanTitle, cleanOutfit, normalize, inactive, isCat };
});
