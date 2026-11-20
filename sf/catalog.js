// NUSA ISLAND — SAMUDRA FOLLOWER: koleksi ikan spesial hasil ide pengikut Instagram Nusa Island. KATALOG (satu sumber; UMD: dipakai klien & bisa dipakai Worker).
// 4 ikan awal + 17 ikan dari komentar pengikut (disetujui Owner 20 Nov 2026) = 21. (El Gran Maja sudah ada di Pulau Para Legenda/sf2, tidak digandakan.) Daftar tetap & diuji: tambah ikan baru hanya dengan persetujuan Owner.
// Ikan ini SENGAJA TIDAK ada di FISH (data.js) / tabel ekonomi server: tidak ikut peluang tangkap, harga, inventaris, penjualan, Cloud Save.
// Harga jual & peluang tangkap = null → ditetapkan Owner. `enabled:false` → server/klien menolak sebagai tangkapan sampai katalog + backend siap & Owner setuju.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(); else root.NusaSFCatalog = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // MODE: "off" (bawaan produksi: tab & ikan tersembunyi) | "preview" (tab Koleksi tampil; ikan hanya bisa DILIHAT/diperiksa & pratinjau kartu tangkapan; tidak bisa ditangkap).
  const DEFAULT_MODE = "off";
  const RARITY = {   // label & warna khusus (tidak mengubah RARITY game)
    common: { label: "BIASA", color: "#7fb069", glow: "rgba(127,176,105,.55)" },
    rare: { label: "LANGKA", color: "#3f9be0", glow: "rgba(63,155,224,.6)" },
    secret: { label: "SECRET", color: "#8a4dff", glow: "rgba(138,77,255,.85)" },
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

    // ---- 17 ikan dari komentar pengikut (urut: Biasa → Secret). Harga/peluang final tetap datang dari shop/config.sf (Owner). ----
    { id: "sf_lele", name: "Ikan Lele", rarity: "common", credit: "@2gdkingpangeranwisata", wMin: 0.3, wMax: 2.5,
      desc: "Si kumis hitam penghuni lumpur. Licin, rakus, dan selalu muncul tepat saat umpanmu hampir habis." },
    { id: "sf_emas", name: "Ikan Emas", rarity: "common", credit: "@2gdkingpangeranwisata", wMin: 0.1, wMax: 1.2,
      desc: "Sisiknya berkilau seperti koin, ekornya mengibas seperti kain sutra. Pembawa hoki paling sopan di samudra." },
    { id: "sf_kurame", name: "Ikan Kurame", rarity: "common", credit: "@2gdkingpangeranwisata", wMin: 0.3, wMax: 3,
      desc: "Pipih, tenang, bersirip tinggi dengan kumis halus di bawah dagu. Ia tidak pernah terburu-buru, dan itu membuatnya gemuk." },
    { id: "sf_badut", name: "Ikan Badut", rarity: "rare", credit: "komentar pengikut", wMin: 0.1, wMax: 0.5,
      desc: "Jingga menyala dengan tiga pita putih bergaris hitam. Selalu bersembunyi di anemon sambil bercanda dengan siapa saja yang lewat." },
    { id: "sf_lele_berkumis", name: "Lele Berkumis", rarity: "rare", credit: "komentar pengikut", wMin: 0.5, wMax: 3,
      desc: "Kumisnya panjang melingkar dan selalu dirapikan. Lele paling berwibawa di samudra; ikan lain refleks memberi jalan." },
    { id: "sf_kepala_lele", name: "Ikan Kepala Lele", rarity: "rare", credit: "komentar pengikut", wMin: 0.5, wMax: 4,
      desc: "Tubuhnya ramping berkilau, tapi kepalanya kepala lele lengkap dengan kumis. Tak ada yang tahu siapa yang salah pasang." },
    { id: "sf_robot", name: "Ikan Robot", rarity: "rare", credit: "komentar pengikut", wMin: 0.3, wMax: 2,
      desc: "Tubuh baja berbaut, mata visor menyala, ekor berupa roda gigi. Berenang sambil mengeluarkan bunyi bip pelan." },
    { id: "sf_piranha_purba", name: "Piranha Purba", rarity: "epic", credit: "@nanasmuda_____", wMin: 0.8, wMax: 5,
      desc: "Leluhur semua piranha. Berpelat tulang, bergigi segitiga raksasa, dan belum pernah kenyang sejak zaman es." },
    { id: "sf_aligator", name: "Ikan Aligator", rarity: "epic", credit: "komentar pengikut", wMin: 4, wMax: 25,
      desc: "Moncongnya panjang bergigi seperti buaya, tubuhnya berlapis sisik berlian. Mengambang diam, lalu menyambar sekejap." },
    { id: "sf_hiu_gurita", name: "Hiu Ekor Gurita", rarity: "epic", credit: "komentar pengikut", wMin: 5, wMax: 30,
      desc: "Hiu abu-abu gagah dengan ekor berupa lima tentakel gurita bersucker. Mengayuh pakai ekor, mencengkeram pakai ekor juga." },
    { id: "sf_lampu_mekar", name: "Ikan Lampu Ekor Mekar", rarity: "epic", credit: "komentar pengikut", wMin: 0.3, wMax: 2.5,
      desc: "Ikan laut dalam berbintik cahaya. Ekornya mekar seperti bunga lampion yang berdenyut, menerangi jalannya sendiri." },
    { id: "sf_marlin_biru", name: "Marlin Biru", rarity: "epic", credit: "komentar pengikut", wMin: 30, wMax: 120,
      desc: "Pelari tercepat samudra. Moncong tombak, sirip layar biru, dan garis-garis cahaya saat ia melesat." },
    { id: "sf_arwana_hitam_merah", name: "Arwana Hitam Merah", rarity: "legendary", credit: "@rinodefa", wMin: 2, wMax: 6,
      desc: "Arwana dewasa berbadan hitam pekat dengan tepi sisik merah menyala. Kumis emasnya bergerak anggun; harganya selalu dua puluh ribu." },
    { id: "sf_galactic", name: "Ikan Galactic", rarity: "legendary", credit: "komentar pengikut", wMin: 1, wMax: 8,
      desc: "Tubuhnya adalah potongan langit malam: nebula ungu, bintang berkelip, dan sirip berpendar seperti galaksi." },
    { id: "sf_bloop", name: "The Bloop", rarity: "legendary", credit: "komentar pengikut", wMin: 200, wMax: 900,
      desc: "Suara aneh dari dasar samudra ternyata punya wujud: raksasa lunak bertentakel, bermata tunggal, bintik cahaya biru di sekujur tubuh." },
    { id: "sf_paus_00037", name: "Paus 0,00037%", rarity: "mythical", credit: "komentar pengikut", wMin: 120, wMax: 400,
      desc: "Paus biru bertulis angka peluangnya sendiri di lambung. Kalau kamu melihatnya, jangan bilang siapa-siapa. Tidak akan ada yang percaya." },
    { id: "sf_megalodon_secret", name: "Megalodon Secret", rarity: "secret", credit: "komentar pengikut", wMin: 300, wMax: 900,
      desc: "Megalodon yang tidak tercatat di buku mana pun. Gelap, retak oleh bekas pertempuran, dengan mata merah yang menatap dari balik kabut ungu." },
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
