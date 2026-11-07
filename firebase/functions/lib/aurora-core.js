// SALINAN OTOMATIS dari economy/aurora-core.js — jangan diedit di sini (node firebase/scripts/sync-economy.js).
// NUSA ISLAND — Gamepass "Pancing Aurora Samudra": inti server (logika murni; UMD). Kode yang SAMA dipakai Worker, Functions, dan uji.
// ---------------------------------------------------------------------------------------------------------------------
// Bonus: +1 POIN PERSENTASE pada peluang kelompok ikan LANGKA (bukan +1% tiap spesies), pada peluang dasar (hoki 1×).
//  Cara: untuk pemilik NYATA (diverifikasi server dari entitlement), tiap tangkapan ikan BIASA yang dilaporkan punya peluang q (≈1,72%)
//  diubah SERVER menjadi satu ikan LANGKA dari lokasi/mode yang sama (darat vs laut), berat dibuat ulang server. q = 0,01 ÷ porsi Biasa, sehingga
//  peluang kelompok Langka naik tepat 1 poin pada hoki dasar (23,3% → 24,3%). Dengan bonus hoki (umpan/kapal) porsi Biasa menyusut, jadi tambahan sedikit di bawah 1 poin.
//  DIKECUALIKAN SEPENUHNYA: Megalodon & ikan event (tidak ada di tabel ikan biasa; tidak pernah disentuh), ikan mistis, ikan dilindungi, sampah, ikan epik/legenda.
//  TIDAK mengubah: harga jual, rumus berat, hadiah koin, kekuatan joran. Hanya spesies Biasa→Langka (harga Langka memang berbeda — itu bagian dari peluang, bukan bonus harga).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaAuroraCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const PRODUCT_ID = "gamepass_aurora", GRANT = "pancing_aurora", PRICE = 20000, PP = 0.01;
  // @generated oleh economy/make-aurora.js dari data.js
  const POOL = /*POOL*/{"muara":{"src":["nila","mujair","lele"],"to":["patin","gabus"],"q":0.0172},"toba":{"src":["mas","pora","nila_toba"],"to":["jurung"],"q":0.0172},"selat":{"src":["baronang","kembung","tongkol"],"to":["kakap","tenggiri","kerapu_macan"],"q":0.0172},"selat#s":{"src":["selar_kuning","layang","peperek","julung","kerong"],"to":["bawal_putih","kakap_putih","ekor_kuning"],"q":0.016833},"ampat":{"src":["badut","kakatua"],"to":["sunu"],"q":0.016833},"banda":{"src":["terbang","cakalang"],"to":["tuna"],"q":0.0172}}/*END*/;
  const SRC = {}; for (const [k, P] of Object.entries(POOL)) for (const id of P.src) SRC[id] = k;
  // Pemilik SAH = entitlement diberikan lewat pesanan NYATA yang sudah PAID (bukan SIMULASI, bukan klaim klien).
  const owns = (ent) => !!(ent && ent.owned && ent.owned[GRANT] && ent.owned[GRANT].env === "NYATA");
  const ownsAny = (ent) => !!(ent && ent.owned && ent.owned[GRANT]);
  // fish = baris tabel server {id, rarity, loc,...}. rnd() → [0,1). Mengembalikan id ikan Langka pengganti atau null.
  const equipOn = (eco) => !(eco && eco.eq && eco.eq.joran === "off");           // tanpa catatan = terpasang otomatis
  const active = (ent, eco) => owns(ent) && equipOn(eco);
  function roll(fish, rnd) {
    if (!fish || fish.rarity !== "biasa" || fish.protected) return null;
    const k = SRC[fish.id]; if (!k) return null;
    const P = POOL[k]; if (!P.to.length || !(rnd() < P.q)) return null;
    return P.to[Math.min(P.to.length - 1, Math.floor(rnd() * P.to.length))];
  }
  return { PRODUCT_ID, GRANT, PRICE, PP, POOL, owns, ownsAny, equipOn, active, roll };
});
