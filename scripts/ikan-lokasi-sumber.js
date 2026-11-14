// =========================================================
//  Ide 07B — 11 ikan baru per lokasi memancing reguler (Muara, Toba, Selat, Raja Ampat, Banda).
//  SUMBER TUNGGAL: skrip ini menghasilkan blok yang ditempel di data.js (node scripts/ikan-lokasi-sumber.js --cetak)
//  dan dipakai tes untuk memeriksa kontrak (11 per lokasi, 1 SUPER RARE, ID unik, visual unik).
//  Susunan 10 ikan reguler per lokasi: 3 Biasa, 3 Langka, 2 Epik, 1 Legenda, 1 Mitos (rarity "legenda" + tag mitos:true, bobot pw 0,3).
//  + 1 SUPER RARE (sup:true): TIDAK masuk kumpulan lemparan klien; diundi SERVER (economy/ikanloc-core.js).
//  Kolom: id, nama, rarity, wMin, wMax, harga/kg, power, warna, perut, bentuk[panjang,tinggi], sirip, tambahan, hab, deskripsi
// =========================================================
"use strict";
const R = (loc, rows) => rows.map((r) => ({ loc, id: r[0], name: r[1], rarity: r[2], wMin: r[3], wMax: r[4], price: r[5], power: r[6], color: r[7], belly: r[8], shape: r[9], fin: r[10], ex: Object.assign({}, r[11], r[14]), hab: r[12], desc: r[13] }));

const MUARA = R("muara", [
  ["mr_bilis", "Bilis Nipah", "biasa", .02, .09, 85, 1, "#c9d3cc", "#f4f1e3", [1.15, .26], "pointed", { stripes: "#9db0a7" }, "Muara · Hutan Nipah", "Kecil perak bergerombol di antara akar nipah. Digoreng kering jadi lauk kampung."],
  ["mr_betok", "Betok Rawa", "biasa", .05, .28, 55, 1, "#5f6b3c", "#c4c08a", [.95, .55], "round", { spots: "#3b4426" }, "Muara · Rawa Dangkal", "Bisa memanjat tepi rawa saat air surut. Sisiknya kasar dan gelap."],
  ["mr_baung", "Baung Kali", "biasa", .3, 2.2, 26, 2, "#8a7f6e", "#e2d7bc", [1.3, .34], "long", { whisker: true, stripes: "#5e5547" }, "Muara · Sungai Berlumpur", "Berkumis panjang dan hobi bersembunyi di bawah akar yang tenggelam."],
  ["mr_belida", "Belida Pisau", "langka", 1.5, 9, 24, 4, "#c7ced2", "#f1f3f1", [1.75, .26], "long", { scales: true }, "Muara · Arus Tenang", "Badan pipih memanjang seperti bilah pisau. Daging gilingnya jadi pempek terbaik."],
  ["mr_selais", "Selais Bakau", "langka", .5, 3.4, 63, 3, "#6f5a3c", "#d6c08e", [1.2, .36], "pointed", { whisker: true, finColor: "#b88a3a" }, "Muara · Akar Bakau", "Lele kecil bersirip kuning tua. Hanya keluar saat air pasang naik."],
  ["mr_tapah", "Tapah Lumpur", "langka", 2, 11, 20, 4, "#4c5148", "#b9b79f", [1.5, .4], "round", { hump: true, spots: "#2d312b" }, "Muara · Lubuk Dalam", "Kepalanya lebar, mulutnya besar. Menyergap apa saja yang lewat di lubuk."],
  ["mr_jelawat", "Jelawat Kencana", "epik", 3, 16, 54, 6, "#d6a33a", "#fbe9a6", [1.1, .52], "round", { scales: true, finColor: "#e5762f" }, "Muara · Hulu Muara", "Bersisik emas seperti disepuh. Lompatannya membuat pemancing lupa menarik joran."],
  ["mr_toman_bara", "Toman Bara", "epik", 4, 22, 39, 7, "#8a3a22", "#e8a05c", [1.5, .36], "long", { stripes: "#3a1d14" }, "Muara · Lubuk Berbatu", "Toman bergaris merah arang. Konon galaknya melebihi toman biasa."],
  ["mr_patin_keramat", "Patin Keramat", "legenda", 8, 38, 77, 8, "#e2d2a8", "#fffbe8", [1.55, .44], "pointed", { whisker: true, finColor: "#f2cf6a" }, "Muara · Lubuk Keramat", "Patin putih gading yang menurut cerita kampung dijaga leluhur sungai."],
  ["mr_gabus_hantu", "Gabus Hantu Bakau", "legenda", 3, 14, 285, 8, "#cfe3dc", "#f5fffb", [1.5, .32], "long", { spots: "#8fb4a8", finColor: "#9fe3d0" }, "Muara · Kabut Pagi Bakau", "Pucat kebiruan dan nyaris tembus pandang. Muncul hanya saat kabut menutup bakau.", { mitos: true, pw: .3 }],
  ["mr_belida_bulan", "Belida Kembang Bulan", "legenda", 14, 48, 57, 9, "#f2f4f7", "#ffffff", [1.7, .3], "long", { scales: true, spots: "#d8dde6", finColor: "#ffe39a" }, "Muara · Muara Tersembunyi", "Perak murni dengan pola bulatan seperti purnama. Hanya satu dari ribuan tangkapan.", { sup: true, aura: "#ffe9a8" }],
]);

const TOBA = R("toba", [
  ["tb_bilih", "Bilih Danau", "biasa", .02, .08, 120, 1, "#d7dfe0", "#f6f8f4", [1.2, .28], "pointed", { stripes: "#aab7b9" }, "Toba · Tepian Berbatu", "Ikan mungil pemakan plankton. Segar dijadikan sambal khas danau."],
  ["tb_tawes", "Tawes Danau", "biasa", .3, 1.9, 24, 1, "#aeb8a2", "#eef0e0", [1, .5], "round", { scales: true }, "Toba · Perairan Dangkal", "Pemakan lumut yang tenang. Sisiknya berkilau hijau keperakan."],
  ["tb_gurame", "Gurami Tepian", "biasa", .5, 3.2, 22, 2, "#7a6a4f", "#d5c7a1", [.95, .62], "long", { hump: true, finColor: "#a8603a" }, "Toba · Rumpun Eceng", "Berkepala menonjol, hidup di rumpun enceng gondok tepi danau."],
  ["tb_sidat", "Sidat Kawah", "langka", .8, 5.5, 45, 4, "#2f3a3a", "#9fb0a8", [2.2, .13], "long", { spots: "#1c2423" }, "Toba · Dasar Vulkanik", "Menyerupai ular air gelap. Bersembunyi di celah batu hangat dasar danau."],
  ["tb_kelabau", "Kelabau Biru", "langka", 1.2, 7, 35, 4, "#4f7ea6", "#dbe8f1", [1.2, .45], "pointed", { scales: true, finColor: "#2b5d86" }, "Toba · Arus Sungai Asahan", "Biru logam saat tersorot matahari. Gesit melawan arus."],
  ["tb_hampala", "Hampala Bukit", "langka", 1.5, 8, 31, 5, "#a58f4a", "#efe3b4", [1.25, .4], "pointed", { spots: "#2e281a", stripes: "#6e5d2c" }, "Toba · Tebing Batu", "Berpita hitam di pangkal sirip, pemburu ikan kecil di dekat tebing."],
  ["tb_jambal", "Jambal Samosir", "epik", 4, 20, 52, 6, "#6a4f6e", "#cdb9cf", [1.45, .4], "round", { whisker: true, stripes: "#43304a" }, "Toba · Teluk Samosir", "Lele ungu keabuan dari teluk-teluk Samosir. Dagingnya padat dan manis."],
  ["tb_baung_pusuk", "Baung Pusuk", "epik", 5, 26, 40, 7, "#5b6b52", "#d6dcc1", [1.5, .38], "long", { whisker: true, hump: true }, "Toba · Kaki Pusuk Buhit", "Raksasa berkumis dari lereng Pusuk Buhit; penariknya sangat berat."],
  ["tb_gurami_naga", "Gurami Naga Sibolga", "legenda", 9, 36, 136, 8, "#b24a3a", "#f1b27a", [1.05, .6], "sail", { scales: true, finColor: "#e8b548" }, "Toba · Lubuk Sibolga", "Gurami merah bersirip layar. Dipercaya penjaga lubuk tertua."],
  ["tb_belut_kawah", "Belut Kawah Purba", "legenda", 4, 18, 324, 9, "#59d6c4", "#d8fff6", [2.3, .16], "long", { stripes: "#1e8c7d", finColor: "#a3fff0" }, "Toba · Kaldera Terdalam", "Belut kehijauan berpendar lembut dari kaldera purba. Hampir tak pernah naik ke permukaan.", { mitos: true, pw: .3 }],
  ["tb_ihan_kencana", "Ihan Kencana Sipiso", "legenda", 12, 44, 77, 9, "#f0b93b", "#fff3c2", [1.4, .46], "round", { scales: true, spots: "#d58a1f", finColor: "#fff0a0" }, "Toba · Air Terjun Sipiso-piso", "Emas padat seperti patung hidup. Dongeng Batak menyebutnya ikan pembawa berkah.", { sup: true, aura: "#ffd96a" }],
]);

const SELAT = R("selat", [
  ["st_teri", "Teri Krakatau", "biasa", .01, .05, 160, 1, "#e5ecea", "#ffffff", [1.1, .22], "pointed", { stripes: "#c5d3cf" }, "Selat · Perairan Pesisir", "Bergerombol ribuan di air hangat dekat pulau vulkanik."],
  ["st_bandeng", "Bandeng Selat", "biasa", .5, 3.4, 22, 2, "#9fb0b4", "#eef3f2", [1.4, .36], "pointed", { scales: true }, "Selat · Muara Selat", "Bersisik perak halus; lincah bila diburu predator."],
  ["st_lemuru", "Lemuru Banten", "biasa", .05, .22, 70, 1, "#4d6f84", "#dce6ea", [1.15, .32], "round", { spots: "#243c4d" }, "Selat · Arus Dangkal", "Sardin lokal bertotol gelap di pundak, sering diolah jadi tepung ikan dan pindang."],
  ["st_layur", "Layur Perak", "langka", .6, 3.8, 97, 3, "#d4dadc", "#f7f9f9", [2.3, .12], "long", { scales: true, finColor: "#a9b6ba" }, "Selat · Dasar Berlumpur", "Pita perak panjang tak bersisik. Berkilat seperti pedang saat diangkat."],
  ["st_bubara", "Bubara Jaring", "langka", 1, 6.5, 57, 4, "#587a96", "#d9e5ee", [1.1, .5], "pointed", { stripes: "#30506b" }, "Selat · Arus Tengah", "Pelari tangkas yang suka menyambar umpan hidup."],
  ["st_gerong", "Kuwe Gerong", "langka", 1.5, 9, 41, 5, "#c2b57c", "#f4eed2", [1.1, .56], "pointed", { finColor: "#d8a43a", stripes: "#8d7d44" }, "Selat · Karang Krakatau", "Kuning keperakan dengan sirip emas. Menyerang gerombolan teri."],
  ["st_tenggiri_papan", "Tenggiri Papan", "epik", 5, 32, 43, 7, "#406985", "#c5d4de", [1.7, .3], "pointed", { stripes: "#25465c" }, "Selat · Jalur Arus Kuat", "Lebih besar dan lebih bertenaga dari tenggiri biasa. Menarik tanpa ampun."],
  ["st_hiu_lanjam", "Hiu Lanjam", "epik", 15, 80, 17, 8, "#5d6770", "#e5e8ea", [1.7, .38], "pointed", { spots: "#363c42" }, "Selat · Dasar Karang Dalam", "Hiu kecil pemburu dasar yang malu-malu, aman bagi manusia."],
  ["st_pari_anyer", "Pari Layang Anyer", "legenda", 25, 110, 55, 9, "#3a5a7a", "#c3d3e0", [1.35, .28], "sail", { spots: "#b9d0e4" }, "Selat · Perairan Anyer", "Pari lebar yang melayang di atas dasar pasir. Gerakannya megah dan pelan."],
  ["st_pelangi_kawah", "Pelangi Anak Krakatau", "legenda", 6, 26, 236, 9, "#e65a7a", "#ffd0a8", [1.25, .42], "sail", { stripes: "#6a3fc8", finColor: "#4fe0d0" }, "Selat · Kaldera Anak Krakatau", "Warna merah-ungu-hijau berpendar bagai lava malam hari. Bangkit saat letupan kecil di kawah.", { mitos: true, pw: .3 }],
  ["st_layur_api", "Layur Api Krakatau", "legenda", 18, 62, 62, 9, "#ff7a3a", "#ffe0a0", [2.4, .15], "long", { scales: true, stripes: "#c43a1a", finColor: "#ffd45a" }, "Selat · Mulut Kawah Bawah Laut", "Layur raksasa berkilau jingga. Hanya segelintir pemancing sepanjang masa yang pernah melihatnya.", { sup: true, aura: "#ff9a4a" }],
]);

const AMPAT = R("ampat", [
  ["ra_kepe", "Kepe-kepe Ekor Merah", "biasa", .05, .22, 100, 1, "#f6d44a", "#fffbd8", [.85, .72], "round", { stripes: "#3a3a3a", finColor: "#e5452f" }, "Ampat · Karang Dangkal", "Pipih bundar bergaris hitam. Mondar-mandir di antara karang meja."],
  ["ra_sersan", "Sersan Mayor", "biasa", .05, .25, 90, 1, "#9bd8cf", "#f0fbf6", [.95, .6], "round", { stripes: "#2a4f58" }, "Ampat · Laguna", "Berpita hitam seperti pangkat. Berani mencuri umpan kecil."],
  ["ra_betok_laut", "Betok Laut Biru", "biasa", .08, .45, 55, 1, "#2b7fd4", "#bfe0f4", [.9, .5], "round", { finColor: "#ffd45a" }, "Ampat · Rumpun Karang", "Biru cerah menyala dan sirip kuning gading."],
  ["ra_kakap_karang", "Kakap Merah Karang", "langka", 1, 6, 97, 4, "#c8453a", "#f2b9a0", [1.2, .5], "pointed", { scales: true, finColor: "#9d2f2a" }, "Ampat · Tebing Karang", "Merah api yang jadi pusat perhatian di perairan jernih."],
  ["ra_kerapu_bebek", "Kerapu Bebek", "langka", 1.5, 9, 65, 5, "#8a6bb8", "#e2d4f2", [1.2, .5], "round", { spots: "#f4eefc" }, "Ampat · Gua Karang", "Ungu keabuan bertotol putih. Bersarang di lorong sempit karang."],
  ["ra_bibir_manis", "Bibir Tebal Pelangi", "langka", 2, 12, 49, 5, "#d6a05f", "#f9e6c4", [1.3, .5], "round", { stripes: "#3b2a1b", spots: "#fff3d0" }, "Ampat · Bawah Karang Meja", "Bibir tebal bergaris warna-warni. Kadang berenang menyamping ketika diganggu."],
  ["ra_wobbe", "Wobbegong Cenderawasih", "epik", 12, 60, 46, 7, "#8c6a3c", "#e1ceaa", [1.45, .4], "round", { hump: true, spots: "#3a2a17", whisker: true }, "Ampat · Dasar Berpasir", "Hiu karpet berumbai bertotol cokelat. Menyaru sebagai batu karang."],
  ["ra_pari_bendera", "Pari Bendera Karang", "epik", 10, 55, 50, 7, "#2f7a88", "#d3eef0", [1.3, .3], "sail", { spots: "#e8f6f8", finColor: "#9ee4ee" }, "Ampat · Jalur Arus Karang", "Pari biru kehijauan bertotol putih bersirip lebar seperti bendera."],
  ["ra_hiu_jalan", "Hiu Berjalan Halmahera", "legenda", 8, 36, 162, 8, "#b0873f", "#f1deb0", [1.5, .3], "long", { spots: "#4a361a", finColor: "#7a5a28" }, "Ampat · Laguna Dangkal", "Berjalan di dasar dengan siripnya. Endemik perairan timur Nusantara."],
  ["ra_pari_wayag", "Pari Cahaya Wayag", "legenda", 22, 90, 68, 9, "#4fd8ff", "#f0ffff", [1.4, .3], "sail", { spots: "#ffffff", finColor: "#b9f2ff" }, "Ampat · Laguna Wayag", "Memantulkan cahaya laguna biru-hijau. Para pemandu menyebutnya 'lampu laut'.", { mitos: true, pw: .3 }],
  ["ra_cenderawasih", "Cenderawasih Laut", "legenda", 16, 58, 71, 9, "#f2c53a", "#ffffff", [1.35, .44], "sail", { stripes: "#e0452f", spots: "#2c9b8a", finColor: "#ff6f3c" }, "Ampat · Taman Karang Misool", "Berhias warna sirip bak burung surga: bahkan di laut ia tampak menari.", { sup: true, aura: "#fff0a0" }],
]);

const BANDA = R("banda", [
  ["bd_tongkol", "Tongkol Abu Banda", "biasa", .6, 4.5, 30, 3, "#3d4f66", "#c9d3df", [1.4, .36], "pointed", { stripes: "#22303f" }, "Banda · Laut Terbuka", "Pemburu gerombolan yang selalu bergerak. Jadi pindang andalan."],
  ["bd_malalugis", "Malalugis Biru", "biasa", .2, 1.2, 55, 2, "#3a8fc0", "#e1f1f8", [1.25, .3], "pointed", { finColor: "#ffd45a" }, "Banda · Arus Pelagis", "Biru terang melaju cepat di dekat permukaan."],
  ["bd_layang_banda", "Layang Banda", "biasa", .15, .6, 70, 2, "#6aa0a8", "#f1f6f5", [1.2, .34], "pointed", { spots: "#365c63" }, "Banda · Perairan Pala", "Gerombolannya memutar di atas dasar kepulauan pala."],
  ["bd_lemadang", "Lemadang Emas", "langka", 4, 22, 84, 5, "#e8b53a", "#fff1b0", [1.4, .46], "long", { hump: true, finColor: "#3fb7c8" }, "Banda · Rumpon Terapung", "Kepala tegak dan warna emas kehijauan. Melompat tinggi saat tersangkut."],
  ["bd_tenggiri_samudra", "Tenggiri Samudra", "langka", 6, 36, 51, 5, "#2f5a86", "#bfd0e2", [1.8, .24], "pointed", { stripes: "#183452" }, "Banda · Tebing Dalam", "Langsing dan super cepat. Menggunting senar dengan giginya."],
  ["bd_kuwe_selatan", "Kuwe Selatan", "langka", 5, 30, 61, 5, "#3b6a86", "#d4e2ea", [1.15, .54], "pointed", { scales: true }, "Banda · Gugusan Karang Dalam", "Pipih tebal dan sangat bertenaga; sering memutuskan joran kecil."],
  ["bd_hiu_martil", "Hiu Martil Banda", "epik", 40, 220, 29, 9, "#6f7d8b", "#dfe4e8", [1.65, .34], "pointed", { hump: true, spots: "#454f5a" }, "Banda · Gunung Bawah Laut", "Kepalanya melebar bak palu. Sering terlihat berombongan di tebing dalam."],
  ["bd_tuna_matabesar", "Tuna Mata Besar", "epik", 25, 160, 31, 9, "#243a6b", "#cdd6e8", [1.45, .5], "pointed", { finColor: "#d9b13a", spots: "#101c3a" }, "Banda · Palung Dalam", "Bermata sebesar piring kecil. Menyelam sampai ratusan meter."],
  ["bd_mola", "Mola Palung Banda", "legenda", 60, 320, 24, 9, "#8d9aa8", "#e9edf1", [.85, .85], "round", { spots: "#5a6673", hump: true }, "Banda · Lapisan Hangat", "Ikan matahari raksasa berbentuk cakram. Tampak malas, tetapi tenaganya luar biasa."],
  ["bd_dayung", "Raja Herring Dayung", "legenda", 30, 140, 53, 10, "#c9e0ff", "#ffffff", [2.6, .12], "long", { stripes: "#e65a5a", finColor: "#ff4a4a" }, "Banda · Palung Terdalam", "Pita perak sepanjang perahu dengan jambul merah. Pelaut menyebutnya 'ular laut' dan membawa isyarat gempa.", { mitos: true, pw: .3 }],
  ["bd_raja_laut", "Raja Laut Purba", "legenda", 45, 190, 35, 10, "#2d5f9e", "#b7c8e6", [1.4, .5], "round", { scales: true, spots: "#e4ecff", finColor: "#7ab2ff" }, "Banda · Perairan Maluku Terdalam", "Fosil hidup bersirip berdaging, dianggap telah punah. Tanda keberuntungan terbesar bagi pemancing.", { sup: true, aura: "#9fd0ff" }],
]);

const ALL = [].concat(MUARA, TOBA, SELAT, AMPAT, BANDA);
const LOCS = ["muara", "toba", "selat", "ampat", "banda"];

// bentuk baris data.js
const q = (s) => JSON.stringify(s);
function line(f) {
  const ex = f.ex || {}, p = [`id: ${q(f.id)}`, `name: ${q(f.name)}`, `loc: ${q(f.loc)}`, `rarity: ${q(f.rarity)}`, `wMin: ${f.wMin}`, `wMax: ${f.wMax}`, `price: ${f.price}`, `power: ${f.power}`,
    `color: ${q(f.color)}`, `belly: ${q(f.belly)}`, `shape: [${f.shape.join(", ")}]`, `fin: ${q(f.fin)}`];
  for (const k of ["finColor", "spots", "stripes"]) if (ex[k]) p.push(`${k}: ${q(ex[k])}`);
  for (const k of ["scales", "whisker", "bill", "hump"]) if (ex[k]) p.push(`${k}: true`);
  p.push("x: true");
  if (ex.mitos) p.push("mitos: true, pw: " + ex.pw);
  if (ex.sup) p.push(`sup: true, aura: ${q(ex.aura)}`);
  p.push(`hab: ${q(f.hab)}`, `desc: ${q(f.desc)}`);
  return "  { " + p.join(", ") + " },";
}
const NAMA = { muara: "Muara Kampung", toba: "Danau Toba", selat: "Selat Sunda", ampat: "Raja Ampat", banda: "Laut Banda" };
function blok() {
  let s = "  // ---------- Ide 07B: 11 ikan baru per lokasi reguler (3 Biasa, 3 Langka, 2 Epik, 1 Legenda, 1 Mitos, 1 SUPER RARE). Sumber: scripts/ikan-lokasi-sumber.js ----------\n";
  s += "  // x = ikan baru Ide 07B · mitos = Legenda berbobot 0,3 di dalam kelompoknya (pw) · sup = SUPER RARE: tidak ada di kumpulan lemparan klien, hanya diundi SERVER (economy/ikanloc-core.js)\n";
  for (const l of LOCS) { s += `  // -- ${NAMA[l]} --\n`; for (const f of ALL.filter((x) => x.loc === l)) s += line(f) + "\n"; }
  return s;
}
if (require.main === module) { if (process.argv.includes("--cetak")) process.stdout.write(blok()); else console.log(ALL.length, "ikan"); }
module.exports = { ALL, LOCS, blok, line };
