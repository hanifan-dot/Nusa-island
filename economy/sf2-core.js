// =========================================================
//  NUSA ISLAND — INTI SERVER "SAMUDRA FOLLOWER V2: PULAU PARA LEGENDA" (UMD, logika murni; dipakai economy/core.js + klien untuk tampilan).
//  Semua keputusan (rarity, spesies, Pity, berat, harga, Penemu Pertama) diambil SERVER lewat fungsi di sini. Klien hanya menampilkan hasil.
//  DEFINISI Pity (satu-satunya, anti off-by-one): P = jumlah tangkapan sah di pulau SEJAK Mythic terakhir (0..99). Undian memakai P SEBELUM tangkapan:
//     P >= 99  → Mythic DIJAMIN (inilah tangkapan ke-100 tanpa Mythic).   Selain itu → undian rarity dengan pita floor(P/20).
//     Sesudahnya: Mythic → P = 0 ; selain Mythic → P = P + 1.
//  Peluang dalam basis poin (1% = 100 bp, total SELALU 10000): Epic = Mythic = 500 + 20*pita ; Uncommon 2700 ; Rare 800 ; Common = sisa (5500 - 40*pita).
//  Katalog: data murni, dapat diperluas sampai 1.000 entri (CATALOG_MAX). ID permanen; spesies `active:false` tidak diundi tetapi koleksi lama TIDAK dihapus.
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaSF2Core = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CATALOG_VERSION = 1, CATALOG_MAX = 1000, PITY_MAX = 100, UNLOCK_CATCHES = 100;
  const RARITIES = ["common", "uncommon", "rare", "epic", "mythic"];
  const RLABEL = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", mythic: "Mythic" };
  // Nilai jual (koin) per rarity [min,max]; ikan dijual dengan nilai tetap yang dikunci server saat tangkap (tidak bergantung berat → monster raksasa tidak jutaan).
  const PRICE = { common: [10, 25], uncommon: [25, 50], rare: [60, 100], epic: [100, 140], mythic: [200, 250] };
  const HAB = { K: "karang", M: "muara", D: "danau", L: "dalam" };
  const HABITATS = Object.values(HAB);
  const LIM = { perHour: 150, bonusPer20: 20 };   // batas tangkapan pulau per jam (anti-farming); tambahan bp Epic/Mythic per pita

  // [id, nama, rarity, habitat(K/M/D/L), wMin, wMax, bentuk, [badan, perut, aksen], deskripsi, flag]
  // flag: c = spesies KOMUNITAS (Penemu Pertama), ig = kredit pengusul (akun Instagram / teks), a:0 = TIDAK diundi (usulan menunggu persetujuan Owner; tetap tampil di koleksi), o = hanya observasi (koleksi, tidak masuk Coolbox/tidak dijual), w = bobot undian dalam rarity (bawaan 10)
  const ROWS = [
    ["sf2_teri_karang", "Teri Karang", "common", "K", 0.02, 0.1, "ikan", ["#9fb8c4", "#eef3f4", "#6d8794"], "Ikan kecil berkilau yang berkelompok di sela karang."],
    ["sf2_kakatua_mini", "Kakatua Mini", "common", "K", 0.2, 1.2, "bulat", ["#4fb5a5", "#bfe6df", "#e8836a"], "Mulutnya seperti paruh, hobi menggigit karang."],
    ["sf2_sarden_pulau", "Sarden Pulau", "common", "KL", 0.05, 0.3, "ikan", ["#7fa4c4", "#e6eef4", "#4d6f93"], "Sarden gemuk yang lewat bergerombol di sekitar pulau."],
    ["sf2_belanak", "Belanak Muara", "common", "M", 0.3, 1.8, "ikan", ["#8a9a86", "#e4e6d2", "#5f6e5c"], "Pemakan lumpur yang suka melompat di air keruh muara."],
    ["sf2_bandeng_liar", "Bandeng Liar", "common", "M", 0.4, 2.5, "ikan", ["#a7b4b4", "#f0f2ec", "#728585"], "Bandeng bebas dari tambak yang jebol."],
    ["sf2_nila_telaga", "Nila Telaga", "common", "D", 0.2, 1.4, "ikan", ["#8c9a8a", "#d9d6c4", "#5d6b5c"], "Nila danau pulau; airnya jernih, dagingnya manis."],
    ["sf2_mujair_telaga", "Mujair Telaga", "common", "D", 0.2, 1, "ikan", ["#6d7362", "#c4c2a8", "#4a4f42"], "Mujair kecil lincah, sering iseng menyambar umpan."],
    ["sf2_lele_telaga", "Lele Telaga", "common", "D", 0.3, 2.2, "channa", ["#4b4a42", "#a39d86", "#2d2c27"], "Lele berkumis yang bersembunyi di dasar berlumpur."],
    ["sf2_layang_biru", "Layang Biru", "common", "L", 0.1, 0.6, "ikan", ["#3f6c9a", "#d9e6f0", "#27486c"], "Perenang cepat di perairan lepas."],
    ["sf2_cakalang_kecil", "Cakalang Kecil", "common", "L", 0.5, 3, "ikan", ["#35557e", "#e2e8ee", "#1f3552"], "Anak cakalang bergaris yang ikut arus."],

    ["sf2_buntal", "Ikan Buntal", "uncommon", "K", 0.3, 2, "bulat", ["#d9c36a", "#fbf3cc", "#8c7a30"], "Menggembung bila terkejut. Lucu, tapi jangan dipegang sembarangan.", { c: 1, ig: ["@fadila49218"] }],
    ["sf2_barramundi", "Barramundi", "uncommon", "M", 2, 14, "ikan", ["#9aa5a8", "#eef1ee", "#5d6b70"], "Ikan raja muara: kuat melawan dan lompatannya tinggi.", { c: 1, w: 14, ig: ["@hanzz_z410"] }],
    ["sf2_udang_jala", "Udang Jala", "uncommon", "M", 0.03, 0.35, "udang", ["#e8a07a", "#fbe6d4", "#c2603c"], "Udang muara yang biasa terjaring jala nelayan. Gurih dan lincah. USULAN: belum diundi.", { c: 1, a: 0, ig: ["Usulan Komunitas GRUP NUSA"] }],
    ["sf2_kerapu_pasir", "Kerapu Pasir", "uncommon", "K", 1, 6, "ikan", ["#b59a62", "#ecdcb0", "#7a6535"], "Menyamar di dasar pasir dekat karang."],
    ["sf2_kakap_putih", "Kakap Putih", "uncommon", "M", 1, 8, "ikan", ["#c9cfc8", "#f6f7f3", "#8b948b"], "Kakap perak yang suka berburu di pertemuan air tawar dan asin."],
    ["sf2_gurame_pulau", "Gurame Pulau", "uncommon", "D", 1, 5, "bulat", ["#a8794a", "#e9cfa4", "#6f4c2a"], "Gurame bertubuh pipih yang tenang di danau."],
    ["sf2_patin_telaga", "Patin Telaga", "uncommon", "D", 1, 7, "channa", ["#9aa3a8", "#e6e8e3", "#66737a"], "Patin berkumis panjang dari dasar telaga."],
    ["sf2_tenggiri_muda", "Tenggiri Muda", "uncommon", "L", 1, 8, "ikan", ["#5d7f9c", "#e8eef2", "#35566f"], "Pelari samudra bergaris halus."],
    ["sf2_pari_kecil", "Pari Kecil", "uncommon", "LK", 1, 6, "pipih", ["#8d8a7c", "#f0ece0", "#5d5a4e"], "Pari mungil yang meluncur di atas pasir."],

    ["sf2_tuna_sirip_biru", "Tuna Sirip Biru", "rare", "L", 20, 180, "tuna", ["#27486c", "#d6e2ec", "#e0b84a"], "Perenang samudra ber-otot baja. Sirip kuningnya berkilau di bawah matahari.", { c: 1, ig: ["@akb4r70"] }],
    ["sf2_channa_marulioides", "Channa Marulioides", "rare", "D", 1, 6, "channa", ["#3f5a38", "#c8c79a", "#e07a3a"], "Gabus raksasa berkepala besar, pemangsa senyap di danau pulau.", { c: 1, ig: ["@bayuwwnumber1"] }],
    ["sf2_kerapu_bebek", "Kerapu Bebek", "rare", "K", 3, 25, "ikan", ["#7a8a96", "#e0e4e6", "#3a4a58"], "Bintik-bintiknya rapat seperti tutul panther."],
    ["sf2_raja_muara", "Ikan Raja Muara", "rare", "M", 5, 30, "ikan", ["#b08a3e", "#f1e0ae", "#6f4f1a"], "Jarang muncul; nelayan tua bilang ia penunggu muara."],
    ["sf2_dorado_samudra", "Dorado Samudra", "rare", "L", 5, 35, "ikan", ["#4aa56a", "#f2e27a", "#2c6e44"], "Hijau-emas berkilau, melompat-lompat saat dikejar."],
    ["sf2_kuwe_raksasa", "Kuwe Raksasa", "rare", "LK", 10, 60, "ikan", ["#6f8aa0", "#dde7ee", "#3d5568"], "Pemburu ganas yang menyambar dari bayangan karang."],

    ["sf2_orca", "Orca", "epic", "L", 2500, 4800, "paus", ["#1d2530", "#f2f4f6", "#f2f4f6"], "Pemburu puncak yang cerdas, hidup berkelompok. Diamati, bukan dijual.", { c: 1, o: 1, ig: ["@ilham.doss1"] }],
    ["sf2_narwhal", "Narwhal", "epic", "L", 800, 1600, "narwhal", ["#8fa0b0", "#e9eef2", "#f2e6c8"], "Paus bergading panjang dari laut dingin. Diamati, bukan dijual.", { c: 1, o: 1, ig: ["@jual.kurma_ajwa"] }],
    ["sf2_hiu_martil", "Hiu Martil Pulau", "epic", "LK", 80, 300, "hiu", ["#6b7a85", "#e8ecee", "#3a4650"], "Kepalanya melebar seperti martil; penjaga laut dalam."],
    ["sf2_manta_pulau", "Pari Manta Pulau", "epic", "K", 200, 800, "pipih", ["#2d3a4a", "#f1f3f4", "#7fa4c4"], "Melayang anggun di atas karang, lebar sayapnya melebihi perahu."],
    ["sf2_hiu_muara", "Hiu Bayang Muara", "epic", "M", 40, 180, "hiu", ["#8a8a7a", "#e6e4d6", "#55554a"], "Hiu air payau yang berani masuk jauh ke muara."],
    ["sf2_belida_perak", "Belida Perak Raksasa", "epic", "D", 8, 40, "channa", ["#c4ccd0", "#f5f7f8", "#7d8a90"], "Perak pipih bagai pisau; legenda danau pulau."],

    ["sf2_leviathan", "Leviathan", "mythic", "L", 3200, 4900, "leviatan", ["#0d2f5e", "#3f86ad", "#35e8ff"], "Ular laut raksasa berkepala naga dari palung terdalam, bersisik biru tua dengan cahaya cyan. Konon ombak berhenti saat ia lewat.", { c: 1, ig: ["@ambaleon_12", "@candra_elx", "@_.milan24", "@dramond_12"] }],
    ["sf2_mosasaurus", "Mosasaurus", "mythic", "LK", 2800, 4600, "reptil", ["#4a6a52", "#c9d2a8", "#2c4533"], "Reptil laut prasejarah dengan rahang raksasa. Penguasa perairan Mesozoikum.", { c: 1, ig: ["@muh4m4d_1lh4m100", "@nizam39791"] }],
    ["sf2_kraken", "Kraken", "mythic", "L", 2000, 4800, "gurita", ["#6a3a5e", "#c98aa8", "#e0b8c8"], "Gurita raksasa bertentakel tak terhitung. Pelaut menyebutnya 'si penarik kapal'.", { c: 1, ig: ["@inirichee15"] }],
    ["sf2_naga_palung", "Naga Palung Kelabu", "mythic", "L", 3500, 4900, "ular", ["#4a4f5a", "#9aa3b0", "#c9553b"], "Monster orisinal Nusa Island: naga bersisik kelabu yang menjaga palung terdalam.", { c: 1 }],
    ["sf2_el_gran_maja", "El Gran Maja", "mythic", "L", 3600, 4900, "maja", ["#8a6a3c", "#e9d9a8", "#f0c850"], "Hiu purba raksasa bercorak emas kuno. Konon menjaga kuil yang tenggelam di dasar samudra. USULAN: belum diundi.", { c: 1, a: 0, ig: ["@derr6789ten"] }],
    ["sf2_penjaga_muara", "Penjaga Muara Zamrud", "mythic", "M", 600, 2400, "channa", ["#2f7a5a", "#bfe6c8", "#e0d27a"], "Penunggu muara berselimut lumut zamrud. Hanya bangun saat air pasang."],
    ["sf2_naga_danau", "Naga Danau Sunyi", "mythic", "D", 500, 2000, "ular", ["#3a5a7a", "#a6c8d8", "#c8d6e0"], "Naga danau yang tidur ribuan tahun; permukaan danau bergetar saat ia bernapas."],
  ];
  const SPECIES = ROWS.map((r) => { const hs = r[3].split("").map((c) => HAB[c]), fl = r[9] || {};
    return { id: r[0], name: r[1], rarity: r[2], hab: hs, wMin: r[4], wMax: r[5], shape: r[6], col: r[7], desc: r[8], community: !!fl.c, obs: !!fl.o, weight: fl.w || 10, active: fl.a !== 0, credit: (fl.ig || []).slice(), v: CATALOG_VERSION, kind: "sf2" }; });
  // Empat entri Samudra Follower LAMA (sf-core.js): TETAP di katalog komunitas; tetap memakai jalur bonus lama (dikunci config Owner) — pulau TIDAK mengundi mereka (tidak ada dua sistem undian).
  const LEGACY = [
    { id: "sf_tempe", name: "Ikan Tempe", rarity: "mythic", legacy: true }, { id: "sf_cupang_slayer", name: "Cupang Slayer", rarity: "epic", legacy: true },
    { id: "sf_prabowo", name: "Ikan Prabowo", rarity: "mythic", legacy: true }, { id: "sf_arapaima", name: "Arapaima Gigas", rarity: "rare", legacy: true },
  ];
  if (SPECIES.length + LEGACY.length > CATALOG_MAX) throw new Error("katalog melebihi 1000");
  const BY_ID = Object.create(null); for (const s of SPECIES) { if (BY_ID[s.id]) throw new Error("ID ganda " + s.id); BY_ID[s.id] = s; }
  const isSpecies = (id) => typeof id === "string" && id in BY_ID && BY_ID[id].kind === "sf2";
  // Indeks undian [habitat][rarity] → daftar spesies aktif (dibangun sekali; O(1) lookup, O(k) pilih) → efisien walau katalog 1.000 entri.
  let IDX = null;
  const index = () => { if (IDX) return IDX; IDX = {}; for (const h of HABITATS) { IDX[h] = {}; for (const r of RARITIES) IDX[h][r] = []; }
    for (const s of SPECIES) if (s.active) for (const h of s.hab) IDX[h][s.rarity].push(s); return IDX; };

  const reset = () => { IDX = null; };   // hanya untuk uji (katalog sintetis 1.000 entri)
  // ---- Peluang (basis poin) ----
  const band = (p) => Math.min(4, Math.floor(Math.max(0, p) / 20));
  function odds(p) {   // p = Pity SEBELUM tangkapan (0..99). Total SELALU 10000.
    if (p >= PITY_MAX - 1) return { common: 0, uncommon: 0, rare: 0, epic: 0, mythic: 10000, guaranteed: true };
    const b = band(p), up = LIM.bonusPer20 * b, o = { common: 5500 - 2 * up, uncommon: 2700, rare: 800, epic: 500 + up, mythic: 500 + up, guaranteed: false };
    return o;
  }
  const pct = (bp) => bp / 100;
  function rollRarity(p, r) {   // r ∈ [0,1)
    if (!(r >= 0 && r < 1)) throw new Error("acak tidak valid");
    const o = odds(p); let x = Math.floor(r * 10000);
    for (const k of RARITIES) { if (x < o[k]) return k; x -= o[k]; }
    return "mythic";   // tidak tercapai (jumlah = 10000); aman
  }
  const nextPity = (p, rarity) => (rarity === "mythic" ? 0 : Math.min(PITY_MAX - 1, p + 1));
  function pickSpecies(habitat, rarity, r) {
    const list = (index()[habitat] || {})[rarity] || []; if (!list.length) return null;
    let tot = 0; for (const s of list) tot += s.weight; let x = r * tot;
    for (const s of list) { if (x < s.weight) return s; x -= s.weight; }
    return list[list.length - 1];
  }
  const weightFor = (s, r) => Math.round((s.wMin + (s.wMax - s.wMin) * Math.pow(r, 2.3)) * 100) / 100;
  const weightOk = (id, w) => isSpecies(id) && Number.isFinite(w) && w >= BY_ID[id].wMin * 0.99 && w <= BY_ID[id].wMax * 1.01;
  // Nilai jual tetap (koin) dalam rentang rarity, naik tipis menurut posisi berat dalam rentang spesies (tidak pernah keluar rentang).
  function coinValue(s, w) { if (s.obs) return 0; const [a, b] = PRICE[s.rarity], f = s.wMax > s.wMin ? Math.max(0, Math.min(1, (w - s.wMin) / (s.wMax - s.wMin))) : 0; return Math.round(a + (b - a) * f); }

  // ---- Syarat akses: total tangkapan sah TERPERCAYA SERVER ----
  // = max(eco.lbc [penghitung Podium, ditulis server di ecoCatch], sf2.base [ratchet monoton: ikan sah di Coolbox server saat pertama dicek — memuat simpanan lama yang dimigrasi server]) + kredit Owner (opsional, config).
  // TIDAK memakai angka klien dan TIDAK memakai jumlah ikan Coolbox sebagai hitungan berjalan.
  function unlockCount(eco, cfg, now) {
    const s2 = eco.sf2 || {}, c2 = cfg && cfg.sf2 && typeof cfg.sf2 === "object" ? cfg.sf2 : {};
    let credit = 0;
    if (Number.isFinite(c2.legacyCredit) && Number.isFinite(c2.legacyBefore) && Number.isFinite(eco.initAt) && eco.initAt <= c2.legacyBefore) credit = Math.max(0, Math.min(UNLOCK_CATCHES, Math.floor(c2.legacyCredit)));
    return Math.max(eco.lbc || 0, s2.base || 0) + credit;
  }
  const isOff = (cfg) => !!(cfg && cfg.sf2 && cfg.sf2.off === true);

  return { CATALOG_VERSION, CATALOG_MAX, PITY_MAX, UNLOCK_CATCHES, RARITIES, RLABEL, PRICE, HABITATS, HAB, LIM, SPECIES, LEGACY, BY_ID, isSpecies, odds, pct, band, rollRarity, nextPity, pickSpecies, weightFor, weightOk, coinValue, unlockCount, isOff, index, reset };
});
