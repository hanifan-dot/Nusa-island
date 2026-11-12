// NUSA ISLAND — SAMUDRA FOLLOWER: koleksi ikan spesial hasil ide pengikut Instagram Nusa Island. KATALOG (satu sumber; UMD: dipakai klien & bisa dipakai Worker).
// EMPAT ikan resmi pilihan Owner — JANGAN menambah ikan kelima tanpa persetujuan Owner (diuji).
// Ikan ini SENGAJA TIDAK ada di FISH (data.js) / tabel ekonomi server: tidak ikut peluang tangkap, harga, inventaris, penjualan, Cloud Save.
// Harga jual & peluang tangkap = null → ditetapkan Owner. `enabled:false` → server/klien menolak sebagai tangkapan sampai katalog + backend siap & Owner setuju.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(); else root.NusaSFCatalog = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // MODE: "off" (bawaan produksi: tab & ikan tersembunyi) | "preview" (tab Koleksi tampil; ikan hanya bisa DILIHAT/diperiksa & pratinjau kartu tangkapan; tidak bisa ditangkap).
  const DEFAULT_MODE = "off";
  const RARITY = {   // label & warna khusus (tidak mengubah RARITY game)
    mythical: { label: "MYTHICAL", color: "#e0457b", glow: "rgba(224,69,123,.75)" },
    mythical_event: { label: "MYTHICAL EVENT", color: "#8f5bff", glow: "rgba(143,91,255,.8)" },
    epic: { label: "EPIC", color: "#b56ce8", glow: "rgba(181,108,232,.65)" },
    legendary: { label: "LEGENDARY", color: "#f0b53a", glow: "rgba(240,181,58,.85)" },
  };
  const FISH = [
    { id: "sf_tempe", name: "Ikan Tempe", rarity: "mythical", credit: "@mlfs_05", wMin: 0.3, wMax: 1.4,
      desc: "Ikan bulat keemasan yang renyah di luar, lembut di dalam. Konon lahir dari penggorengan samudra. Matanya besar, mulutnya selalu terbuka, dan langka sekali." },
    { id: "sf_cupang_slayer", name: "Cupang Slayer", rarity: "epic", credit: "@agusii.55", wMin: 0.05, wMax: 0.4,
      desc: "Cupang petarung bersirip panjang berkilau. Belum pernah kalah di ronde mana pun; auranya membuat ikan lain minggir sendiri." },
    { id: "sf_prabowo", name: "Ikan Prabowo", rarity: "mythical_event", credit: "@akhmadraffa123", event: true, wMin: 3, wMax: 14,
      desc: "Ikan gendut berpeci hitam dan berjas rapi, dengan wajah tegas yang justru menggemaskan. Karakter parodi FIKTIF dari ide pengikut — bukan potret siapa pun. Hanya muncul saat event aktif." },
    { id: "sf_arapaima", name: "Arapaima Gigas", rarity: "legendary", credit: "@alanaimroni", wMin: 60, wMax: 220,
      desc: "Raksasa air tawar bersisik besar dan berat. Geraknya pelan, tapi sekali ia muncul ke permukaan, seisi sungai terdiam." },
  ].map((f) => Object.assign({ sf: true, category: "samudra_follower", enabled: false, final: false, price: null, chance: null }, f));
  const BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));
  const IG_NOTE = "ide pengikut Instagram Nusa Island";
  const isSF = (id) => Object.prototype.hasOwnProperty.call(BY_ID, id);
  // validasi tangkapan oleh sisi mana pun: selama enabled:false atau harga/peluang belum final → SELALU ditolak (aman secara bawaan).
  function checkCatch(id, w, opts) {
    const f = isSF(id) ? BY_ID[id] : null; if (!f) return { ok: false, why: "unknown" };
    if (!f.enabled) return { ok: false, why: "disabled" };
    if (f.price == null || f.chance == null || !f.final) return { ok: false, why: "not-final" };
    if (f.event && !(opts && opts.eventActive === true)) return { ok: false, why: "event-off" };
    if (!(Number(w) >= f.wMin) || !(Number(w) <= f.wMax)) return { ok: false, why: "weight" };
    return { ok: true };
  }
  return { DEFAULT_MODE, RARITY, FISH, BY_ID, IG_NOTE, isSF, checkCatch };
});
