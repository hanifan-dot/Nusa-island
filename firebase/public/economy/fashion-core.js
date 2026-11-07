// =========================================================
//  NUSA ISLAND — KATALOG & ATURAN FASHION (logika murni, UMD). Sumber kebenaran HARGA/ID untuk server (ecoFashion* di economy/core.js)
//  dan untuk tampilan klien. Semua item KOSMETIK MURNI: tidak ada damage, kecepatan, peluang tangkap, atau statistik gameplay.
//  Kode penampilan (outfit code) = string pendek untuk disimpan & disinkronkan multiplayer, mis. "t:t_street:2|p:p_cargo:0|c:c_naga:0".
//   slot: t=baju p=celana h=topi a=aksesori c=kostum(hewan/eksklusif; menutupi baju/celana/topi/aksesori) s=warna kulit r=warna rambut
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaFashionCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SLOTS = ["t", "p", "h", "a", "c", "s", "r"];
  const SKIN = ["#c68b5e", "#e0b08a", "#a8704a", "#f0c8a0", "#8a5a3a", "#6b4328"], HAIR = ["#2a1d14", "#14110e", "#5a3a20", "#3a2a1a", "#a8672a", "#c9c2b6"];
  const K = (cols) => cols;
  // cat: kategori UI. rar: biasa|langka|epik|legenda|sultan. fx: id efek kostum (render di avatar/draw.js).
  const ITEMS = [
    { id: "t_polos", slot: "t", cat: "tshirt", name: "Kaos Polos Awal", price: 0, rar: "biasa", cols: K(["#579b8b", "#c2603b", "#4a7fb5", "#d1a43a", "#8a5ac2", "#e9e6dc"]) },
    { id: "t_basic", slot: "t", cat: "tshirt", name: "Kaos Basic Tambahan", price: 25000, rar: "biasa", cols: K(["#2f2f33", "#e9e6dc", "#b8442f", "#2d6b9c", "#4f8a3a", "#c98aa8"]) },
    { id: "t_street", slot: "t", cat: "tshirt", name: "Kaos Streetwear", price: 45000, rar: "langka", cols: K(["#1f1f24", "#e8e2d0", "#c24a4a", "#3a6fb0"]) },
    { id: "t_pantai", slot: "t", cat: "shirt", name: "Kemeja Pantai", price: 75000, rar: "langka", cols: K(["#2aa7b5", "#e0733a", "#b0539b", "#58a64a"]) },
    { id: "t_nelayan", slot: "t", cat: "jacket", name: "Jaket Nelayan Pro", price: 120000, rar: "epik", cols: K(["#e0a31c", "#2f6f9c", "#5a7a3a"]) },
    { id: "t_hoodie", slot: "t", cat: "jacket", name: "Hoodie Hitam Premium", price: 225000, rar: "epik", cols: K(["#17171b", "#2a2f45"]) },
    { id: "t_cyber", slot: "t", cat: "jacket", name: "Jaket Cyber Neon", price: 350000, rar: "epik", cols: K(["#22d3ee", "#e83bd2", "#7dff5a"]) },
    { id: "t_sultan", slot: "t", cat: "shirt", name: "Jas Sultan Putih Emas", price: 800000, rar: "legenda", cols: K(["#f6f1e4"]) },
    { id: "p_awal", slot: "p", cat: "pants", name: "Celana Awal", price: 0, rar: "biasa", cols: K(["#2b3a44", "#5a4632", "#3a4a2f", "#45454d"]) },
    { id: "p_jeans", slot: "p", cat: "pants", name: "Jeans Klasik", price: 35000, rar: "biasa", cols: K(["#3b5b8c", "#243a5c", "#6d86a8"]) },
    { id: "p_cargo", slot: "p", cat: "pants", name: "Celana Cargo", price: 90000, rar: "langka", cols: K(["#6b6a45", "#4b4b50", "#7a5a3a"]) },
    { id: "p_tactical", slot: "p", cat: "pants", name: "Celana Tactical", price: 140000, rar: "epik", cols: K(["#3b4033", "#25262b", "#5b5a46"]) },
    { id: "p_emas", slot: "p", cat: "pants", name: "Celana Emas Sultan", price: 390000, rar: "legenda", cols: K(["#d9b13a"]) },
    { id: "h_kapten", slot: "h", cat: "hat", name: "Topi Kapten Kapal", price: 55000, rar: "langka", cols: K(["#f2efe6", "#1f2a44"]) },
    { id: "h_koboi", slot: "h", cat: "hat", name: "Topi Koboi", price: 125000, rar: "epik", cols: K(["#8a5a32", "#2a2a2e", "#c9a46a"]) },
    { id: "h_mahkota", slot: "h", cat: "hat", name: "Mahkota Raja", price: 450000, rar: "legenda", cols: K(["#f0c53a"]), fx: "mahkota" },
    { id: "h_robot", slot: "h", cat: "hat", name: "Helm Robot LED", price: 650000, rar: "legenda", cols: K(["#9fb4c4", "#c24a4a"]), fx: "led" },
    { id: "a_sayap", slot: "a", cat: "acc", name: "Sayap Malaikat", price: 950000, rar: "legenda", cols: K(["#ffffff", "#ffe9a8"]), fx: "sayap" },
    { id: "c_kucing", slot: "c", cat: "animal", name: "Kucing Oren", price: 350000, rar: "epik", cols: K(["#f08a2a", "#9a9a9a", "#e8e2d0"]), fx: "ekor" },
    { id: "c_capy", slot: "c", cat: "animal", name: "Capybara Santuy", price: 650000, rar: "legenda", cols: K(["#9a6b3f"]), fx: "santai" },
    { id: "c_hiu", slot: "c", cat: "animal", sultan: true, name: "Hiu Darat", price: 900000, rar: "legenda", cols: K(["#6f8ea8"]), fx: "percik" },
    { id: "c_trex", slot: "c", cat: "animal", sultan: true, name: "Dinosaurus T-Rex", price: 1200000, rar: "legenda", cols: K(["#5a9a4a"]), fx: "jejak" },
    { id: "c_naga", slot: "c", cat: "animal", sultan: true, name: "Naga Petir", price: 2500000, rar: "sultan", cols: K(["#2a4a8c"]), fx: "petir" },
    { id: "c_robot", slot: "c", cat: "exclusive", sultan: true, name: "Robot Titanium", price: 750000, rar: "legenda", cols: K(["#aab6c2"]), fx: "mesin" },
    { id: "c_raja", slot: "c", cat: "exclusive", sultan: true, name: "Raja Nusantara", price: 1500000, rar: "sultan", cols: K(["#f0c53a"]), fx: "aura_emas" },
    { id: "c_hantu", slot: "c", cat: "exclusive", sultan: true, name: "Hantu Neon", price: 1800000, rar: "sultan", cols: K(["#b46cff"]), fx: "aura_ungu" },
    { id: "c_galaksi", slot: "c", cat: "exclusive", sultan: true, name: "Penguasa Galaksi", price: 3500000, rar: "sultan", cols: K(["#2a1a5c"]), fx: "galaksi" },
  ];
  const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
  const SULTAN = ["c_robot", "c_hiu", "c_trex", "c_raja", "c_hantu", "c_naga", "c_galaksi"];          // urutan katalog Koleksi Sultan (ID sama dengan katalog hewan)
  const ANIMAL = ["c_kucing", "c_capy", "c_hiu", "c_trex", "c_naga"];
  const CATS = [["tshirt", "T-Shirt"], ["shirt", "Shirt"], ["jacket", "Jacket / Hoodie"], ["pants", "Pants"], ["hat", "Hat"], ["acc", "Accessories"], ["animal", "Animal Costume"], ["exclusive", "Exclusive Costume"]];
  const DEFAULT = { t: ["t_polos", 0], p: ["p_awal", 0], h: null, a: null, c: null, s: 0, r: 0 };
  const isFree = (id) => !!BY_ID[id] && BY_ID[id].price === 0;
  const PART = /^[tphacsr]:[a-z0-9_]{1,24}:[0-9]{1,2}$/;
  // kode → {t:[id,col],p:..., c:..., s:n, r:n} ; null bila bentuk salah
  function decode(code) {
    if (typeof code !== "string" || code.length > 140) return null;
    const out = { t: null, p: null, h: null, a: null, c: null, s: 0, r: 0 }; if (code === "") return out; const seen = new Set();
    for (const part of code.split("|")) {
      if (!PART.test(part)) return null; const [slot, id, col] = part.split(":"); if (seen.has(slot)) return null; seen.add(slot);
      if (slot === "s" || slot === "r") { if (id !== "x" || +col >= 6) return null; out[slot] = +col; continue; }
      out[slot] = [id, +col];
    }
    return out;
  }
  function encode(o) {
    const parts = []; for (const s of ["t", "p", "h", "a", "c"]) if (o[s]) parts.push(`${s}:${o[s][0]}:${o[s][1] | 0}`);
    parts.push(`s:x:${(o.s | 0)}`, `r:x:${(o.r | 0)}`); return parts.join("|");
  }
  // validasi penuh untuk server: slot cocok, item dikenal, dimiliki/gratis, warna tersedia. Mengembalikan {ok, code} atau {ok:false, why}
  function validate(code, owned) {
    const o = decode(code); if (!o) return { ok: false, why: "Kode penampilan tidak valid." };
    for (const s of ["t", "p", "h", "a", "c"]) {
      if (!o[s]) continue; const it = BY_ID[o[s][0]];
      if (!it || it.slot !== s) return { ok: false, why: "Item tidak dikenal." };
      if (it.price > 0 && !(owned && owned.has(it.id))) return { ok: false, why: "Kamu belum memiliki " + it.name + "." };
      if (o[s][1] >= it.cols.length) return { ok: false, why: "Warna tidak tersedia." };
    }
    return { ok: true, code: encode(o), outfit: o };
  }
  // tampilan: dari kode ke "gaya" yang dipahami renderer. Item tak dikenal (versi game berbeda) → dilewati (fallback default).
  function resolve(code) {
    const o = decode(code) || decode(""), g = (s) => { if (!o[s]) return null; const it = BY_ID[o[s][0]]; return it && it.slot === s ? { it, color: it.cols[Math.min(o[s][1], it.cols.length - 1)] } : null; };
    let t = g("t"), p = g("p"), h = g("h"), a = g("a"), c = g("c");
    if (!t) t = { it: BY_ID.t_polos, color: BY_ID.t_polos.cols[0] }; if (!p) p = { it: BY_ID.p_awal, color: BY_ID.p_awal.cols[0] };
    return { t, p, h, a, c, skin: SKIN[o.s] || SKIN[0], hair: HAIR[o.r] || HAIR[0] };
  }
  const rarityOrder = ["biasa", "langka", "epik", "legenda", "sultan"];
  return { SLOTS, ITEMS, BY_ID, SULTAN, ANIMAL, CATS, SKIN, HAIR, DEFAULT, isFree, decode, encode, validate, resolve, rarityOrder, DEFAULT_CODE: "t:t_polos:0|p:p_awal:0|s:x:0|r:x:0", HIST_MAX: 30 };
});
