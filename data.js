// =========================================================
//  NUSA ISLAND — data lokasi, ikan, dan upgrade
// =========================================================

const RARITY = {
  sampah:  { label: "Sampah",  color: "#8a8f8c", weight: 8,  glow: "rgba(138,143,140,0)" },
  biasa:   { label: "Biasa",   color: "#7fb59f", weight: 60, glow: "rgba(127,181,159,.35)" },
  langka:  { label: "Langka",  color: "#4aa3df", weight: 24, glow: "rgba(74,163,223,.55)" },
  epik:    { label: "Epik",    color: "#b56ce8", weight: 9,  glow: "rgba(181,108,232,.65)" },
  legenda: { label: "Legenda", color: "#f0b53a", weight: 2.2, glow: "rgba(240,181,58,.85)" },
};
const RARITY_ORDER = ["sampah", "biasa", "langka", "epik", "legenda"];
// Ide 07B: dua tingkat tampilan di atas rarity "legenda" (rarity data & server tidak berubah). mitos = Legenda berbobot 0,3; sup = SUPER RARE (hanya diundi server).
const TIER = {
  mitos: { label: "Mitos", color: "#e86bd8", glow: "rgba(232,107,216,.8)", pill: "#f09be4" },
  sup: { label: "SUPER RARE", color: "#ffd24a", glow: "rgba(255,210,74,.95)", pill: "#ffe27a" },
};
const tierOf = (f) => (f && f.sup ? TIER.sup : f && f.mitos ? TIER.mitos : (f && RARITY[f.rarity]) || RARITY.biasa);

// Lokasi: dibuka dengan level kapal
const LOCATIONS = [
  {
    id: "muara", name: "Muara Kampung", short: "Muara", boat: 1,
    desc: "Sungai cokelat tenang di tepi kampung. Tempat semua pemancing memulai.",
    sky: ["#9fd3e6", "#f6e7c1"], water: ["#7d8f6a", "#4f5f3f"], fog: "#c9d6b5",
    shore: "palm", shoreColor: "#3f6b45",
  },
  {
    id: "toba", name: "Danau Toba", short: "Toba", boat: 2,
    desc: "Danau vulkanik raksasa yang dalam dan dingin, dikelilingi bukit.",
    sky: ["#8ec5e0", "#e6eef0"], water: ["#3e7d8c", "#1d4a5a"], fog: "#b7cfd6",
    shore: "hills", shoreColor: "#4f7a63",
  },
  {
    id: "selat", name: "Selat Sunda", short: "Selat", boat: 3,
    desc: "Arus kuat di antara dua pulau. Ikan predator suka berburu di sini.",
    sky: ["#79b8de", "#f3dcc0"], water: ["#2f7fa3", "#174c6a"], fog: "#a9c8d8",
    shore: "volcano", shoreColor: "#55645c",
  },
  {
    id: "ampat", name: "Raja Ampat", short: "R. Ampat", boat: 4,
    desc: "Laut biru jernih dengan pulau karst. Surga terumbu karang.",
    sky: ["#62b9e8", "#d9f3f2"], water: ["#1fa3b0", "#0d5f7a"], fog: "#9fdbe0",
    shore: "karst", shoreColor: "#3e7d5a",
  },
  {
    id: "banda", name: "Laut Banda", short: "Banda", boat: 5,
    desc: "Laut dalam, jauh dari daratan. Raksasa samudra bersembunyi di bawah.",
    sky: ["#4f8fd0", "#e9e3d2"], water: ["#1a5c9c", "#0a2a55"], fog: "#90b3d6",
    shore: "far", shoreColor: "#4c6a7a",
  },
  {   // Samudra Follower V2 — Pulau Para Legenda (area jelajah 'sf2'). Dibuka lewat 100 tangkapan sah (server), BUKAN level kapal.
    id: "samudra", name: "Samudra Follower — Pulau Para Legenda", short: "Samudra", boat: 1,
    desc: "Pulau tropis tempat makhluk legenda komunitas berenang. Terbuka setelah 100 tangkapan.",
    sky: ["#7cc4e8", "#f7e9c4"], water: ["#2aa0b8", "#0c4a78"], fog: "#bfe0e8",
    shore: "palm", shoreColor: "#3f6b45",
  },
];

// power: 1 (jinak) .. 10 (monster). price = Rp per kg (koin)
// night: true = hanya malam, false = hanya siang, undefined = kapan saja
// shape: [panjang, tinggi] relatif; fin: "pointed"|"round"|"sail"|"long"
const FISH = [
  // ---------- Sampah (semua lokasi) ----------
  { id: "sandal", name: "Sandal Jepit", loc: "*", rarity: "sampah", wMin: .1, wMax: .3, price: 5, power: 1, emoji: "🩴", desc: "Sebelah doang. Pasangannya entah di mana." },
  { id: "kaleng", name: "Kaleng Sarden", loc: "*", rarity: "sampah", wMin: .1, wMax: .2, price: 4, power: 1, emoji: "🥫", desc: "Kosong. Ikan sardennya sudah lebih dulu kabur." },
  { id: "sepatu", name: "Sepatu Bot", loc: "*", rarity: "sampah", wMin: .5, wMax: 1.2, price: 6, power: 2, emoji: "🥾", desc: "Berat, basah, dan ada kepitingnya." },

  // ---------- Muara Kampung ----------
  { id: "nila", name: "Nila", loc: "muara", rarity: "biasa", wMin: .2, wMax: 1.2, price: 18, power: 1, color: "#8c9a8a", belly: "#d9d6c4", shape: [1, .45], fin: "round", desc: "Ikan sejuta umat. Enak digoreng atau dibakar." },
  { id: "mujair", name: "Mujair", loc: "muara", rarity: "biasa", wMin: .2, wMax: .9, price: 15, power: 1, color: "#6d7362", belly: "#c4c2a8", shape: [1, .5], fin: "round", desc: "Saudara dekat nila yang lebih gelap." },
  { id: "lele", name: "Lele", loc: "muara", rarity: "biasa", wMin: .3, wMax: 2.5, price: 20, power: 2, color: "#4b4a42", belly: "#a39d86", shape: [1.4, .3], fin: "long", whisker: true, night: true, desc: "Aktif di malam hari. Kumisnya jadi radar." },
  { id: "patin", name: "Patin", loc: "muara", rarity: "langka", wMin: 1, wMax: 8, price: 30, power: 4, color: "#9aa3a8", belly: "#e6e8e3", shape: [1.35, .38], fin: "pointed", whisker: true, desc: "Ikan sungai besar yang licin dan kuat." },
  { id: "gabus", name: "Gabus", loc: "muara", rarity: "langka", wMin: .5, wMax: 4, price: 38, power: 4, color: "#3f4a3a", belly: "#b8b59a", shape: [1.45, .32], fin: "long", spots: "#2a3127", desc: "Predator rawa. Bisa bertahan di lumpur." },
  { id: "toman", name: "Toman", loc: "muara", rarity: "epik", wMin: 3, wMax: 15, price: 55, power: 6, color: "#2f3b34", belly: "#d07a3a", shape: [1.5, .34], fin: "long", spots: "#1b221d", desc: "Raja gabus yang galak. Jangan dekat-dekat sarangnya." },
  { id: "arwana", name: "Arwana Super Red", loc: "muara", rarity: "legenda", wMin: 1, wMax: 4, price: 900, power: 7, color: "#d8452f", belly: "#f4b28a", shape: [1.45, .36], fin: "long", scales: true, night: true, desc: "Ikan naga pembawa hoki. Muncul hanya saat malam." },

  // ---------- Danau Toba ----------
  { id: "mas", name: "Ikan Mas", loc: "toba", rarity: "biasa", wMin: .4, wMax: 3, price: 22, power: 2, color: "#d79a2e", belly: "#f4dd9a", shape: [1, .5], fin: "round", scales: true, desc: "Kuning keemasan, primadona arsik Batak." },
  { id: "pora", name: "Pora-pora", loc: "toba", rarity: "biasa", wMin: .05, wMax: .2, price: 30, power: 1, color: "#b8c4c2", belly: "#eef2ef", shape: [1.1, .38], fin: "pointed", desc: "Kecil tapi banyak. Enak dijadikan teri." },
  { id: "nila_toba", name: "Nila Keramba", loc: "toba", rarity: "biasa", wMin: .3, wMax: 1.5, price: 18, power: 2, color: "#8d8796", belly: "#ddd6dc", shape: [1, .46], fin: "round", desc: "Kabur dari keramba, sekarang hidup bebas." },
  { id: "jurung", name: "Ikan Jurung", loc: "toba", rarity: "langka", wMin: 1, wMax: 6, price: 45, power: 5, color: "#7a8b55", belly: "#dfe0b5", shape: [1.25, .4], fin: "pointed", scales: true, desc: "Ikan sungai berarus deras yang suka naik ke danau." },
  { id: "batak", name: "Ikan Batak", loc: "toba", rarity: "epik", wMin: 2, wMax: 9, price: 120, power: 6, color: "#a87d3b", belly: "#efd6a0", shape: [1.3, .42], fin: "pointed", scales: true, desc: "Ikan upacara adat. Langka dan sangat dihormati." },
  { id: "dewa", name: "Ikan Dewa", loc: "toba", rarity: "legenda", wMin: 5, wMax: 18, price: 400, power: 8, color: "#c9b35a", belly: "#fff3c4", shape: [1.3, .44], fin: "pointed", scales: true, night: false, desc: "Konon dijaga leluhur. Hanya muncul saat matahari tinggi." },

  // ---------- Selat Sunda ----------
  { id: "baronang", name: "Baronang", loc: "selat", rarity: "biasa", wMin: .3, wMax: 1.5, price: 28, power: 2, color: "#8f8a5a", belly: "#d8d3a4", shape: [1, .55], fin: "round", spots: "#6c6840", desc: "Hati-hati, siripnya beracun." },
  { id: "kembung", pelagic: true, name: "Kembung", loc: "selat", rarity: "biasa", wMin: .1, wMax: .5, price: 25, power: 1, color: "#4f7aa0", belly: "#dfe8ee", shape: [1.15, .36], fin: "pointed", stripes: "#2d5070", desc: "Ikan rakyat yang selalu ada di pasar." },
  { id: "kakap", name: "Kakap Merah", loc: "selat", rarity: "langka", wMin: 1, wMax: 7, price: 55, power: 4, color: "#cc4b3f", belly: "#f3b3a3", shape: [1.15, .46], fin: "pointed", desc: "Merah merona, favorit restoran seafood." },
  { id: "tenggiri", pelagic: true, name: "Tenggiri", loc: "selat", rarity: "langka", wMin: 2, wMax: 12, price: 50, power: 5, color: "#5d7f9c", belly: "#e8eef2", shape: [1.6, .28], fin: "pointed", spots: "#3c5a73", desc: "Bahan pempek terbaik. Larinya kencang!" },
  { id: "barakuda", pelagic: true, name: "Barakuda", loc: "selat", rarity: "epik", wMin: 3, wMax: 20, price: 70, power: 7, color: "#7b8f99", belly: "#e1e7ea", shape: [1.75, .24], fin: "pointed", stripes: "#4f626b", desc: "Gigi tajam, serangan cepat seperti torpedo." },
  // Bumbu 2.4 (Samudra Nusantara): tiga spesies laut baru khas Selat Sunda (ID baru, tidak menduplikasi yang lama)
  { id: "tongkol", pelagic: true, name: "Tongkol", loc: "selat", rarity: "biasa", wMin: .5, wMax: 3, price: 26, power: 3, color: "#35557e", belly: "#e2e8ee", shape: [1.2, .42], fin: "pointed", stripes: "#24405f", desc: "Kerabat tuna yang berenang bergerombol. Lezat dibuat tongkol balado." },
  { id: "kerapu_macan", name: "Kerapu Macan", loc: "selat", rarity: "langka", wMin: 1, wMax: 8, price: 58, power: 5, color: "#8a7a4e", belly: "#d9cfa6", shape: [1.2, .5], fin: "round", spots: "#4f4428", desc: "Bercorak loreng seperti macan. Suka bersembunyi di celah karang dangkal." },
  { id: "kuwe_biru", pelagic: true, name: "Kuwe Biru", loc: "selat", rarity: "epik", wMin: 3, wMax: 18, price: 62, power: 7, color: "#4f6f86", belly: "#cfdde6", shape: [1.15, .52], fin: "pointed", finColor: "#3fa2d9", desc: "Kuwe bersirip biru yang berburu di tepi karang saat arus selat berganti." },
  { id: "kerapu_raksasa", name: "Kerapu Raksasa", loc: "selat", rarity: "legenda", wMin: 40, wMax: 150, xMax: 260, xP: .02, price: 60, power: 9, color: "#5a5a3c", belly: "#b8b27d", shape: [1.2, .52], fin: "round", spots: "#3a3a24", night: true, desc: "Monster karang. Bisa menelan ikan lain bulat-bulat." },
  // Bumbu 2.4.1 (Rahasia Ikan Mistis): 12 spesies laut baru. seaOnly = hanya didapat dari kapal di spot laut (tidak masuk kolam dermaga lama,
  // jadi peluang & ekonomi memancing dari dermaga tidak berubah). hab = habitat spot laut. mistik = tag khusus (rarity tetap legenda, bukan rarity baru).
  // -- 5 biasa --
  { id: "selar_kuning", pelagic: true, seaOnly: true, hab: "Perairan Pesisir · Karang Dangkal", name: "Selar Kuning", loc: "selat", rarity: "biasa", wMin: .1, wMax: .4, price: 26, power: 1, color: "#9fb4b8", belly: "#f3efd2", shape: [1.1, .4], fin: "pointed", finColor: "#e0b83a", stripes: "#e0b83a", desc: "Bergaris kuning keemasan di sisi badan. Ikan kecil pemakan plankton yang berenang rapat bergerombol." },
  { id: "layang", pelagic: true, seaOnly: true, hab: "Arus Selat · Laut Dalam", name: "Ikan Layang", loc: "selat", rarity: "biasa", wMin: .15, wMax: .5, price: 24, power: 2, color: "#5d7f93", belly: "#e3ebee", shape: [1.2, .36], fin: "pointed", desc: "Pelari arus yang lincah. Gerombolannya sering diikuti ikan-ikan pemangsa yang lebih besar." },
  { id: "peperek", seaOnly: true, hab: "Perairan Pesisir", name: "Peperek", loc: "selat", rarity: "biasa", wMin: .08, wMax: .3, price: 22, power: 1, color: "#b8c4c6", belly: "#f1f1e6", shape: [1, .52], fin: "round", spots: "#6f7f80", desc: "Pipih, mengilap seperti perak, dan penuh bintik gelap. Penghuni dasar pasir dangkal." },
  { id: "julung", pelagic: true, seaOnly: true, hab: "Perairan Pesisir · Arus Selat", name: "Julung-julung", loc: "selat", rarity: "biasa", wMin: .1, wMax: .35, price: 28, power: 1, color: "#6f9aa8", belly: "#e8f1f0", shape: [2.0, .17], fin: "pointed", bill: true, desc: "Langsing berparuh panjang dan suka melompat di permukaan saat dikejar pemangsa." },
  { id: "kerong", seaOnly: true, hab: "Perairan Pesisir · Karang Dangkal", name: "Kerong-kerong", loc: "selat", rarity: "biasa", wMin: .2, wMax: 1, price: 25, power: 2, color: "#a7a088", belly: "#e6e0c5", shape: [1.2, .44], fin: "pointed", stripes: "#6c6240", desc: "Bergaris-garis cokelat. Kalau diangkat, ia mengeluarkan bunyi 'krok-krok' dari insangnya." },
  // -- 3 langka --
  { id: "bawal_putih", seaOnly: true, hab: "Perairan Pesisir · Palung Mistis Selat", name: "Bawal Putih", loc: "selat", rarity: "langka", wMin: .6, wMax: 3.5, price: 54, power: 4, color: "#c3cbd0", belly: "#f4f6f5", shape: [1, .64], fin: "pointed", scales: true, desc: "Pipih keperakan seperti cakram. Dagingnya manis dan lembut, buruan favorit di meja makan." },
  { id: "kakap_putih", seaOnly: true, hab: "Perairan Pesisir · Palung Mistis Selat", name: "Kakap Putih", loc: "selat", rarity: "langka", wMin: 1.5, wMax: 9, price: 50, power: 4, color: "#9aa7a2", belly: "#eef0e8", shape: [1.4, .42], fin: "round", scales: true, desc: "Mulut lebar dan sirip punggung berduri. Ia menyergap di sekitar tiang dermaga dan celah arus." },
  { id: "ekor_kuning", seaOnly: true, hab: "Karang Dangkal", name: "Ikan Ekor Kuning", loc: "selat", rarity: "langka", wMin: .3, wMax: 1.8, price: 62, power: 3, color: "#4a8fc0", belly: "#d7ebf2", shape: [1.2, .38], fin: "pointed", finColor: "#f2c12e", stripes: "#f2c12e", desc: "Biru cerah dengan ekor kuning menyala. Berenang berkelompok di tepi dinding karang." },
  // -- 2 epik --
  { id: "lemadang", pelagic: true, seaOnly: true, hab: "Arus Selat · Laut Dalam · Palung Mistis Selat", name: "Lemadang", loc: "selat", rarity: "epik", wMin: 3, wMax: 18, price: 66, power: 7, color: "#3fa86e", belly: "#f2d96a", shape: [1.6, .42], fin: "long", hump: true, finColor: "#2f8f9a", desc: "Dahi tumpul dan warna emas kehijauan yang berubah-ubah. Melesat dan melompat saat terkait." },
  { id: "tuna_gigi_anjing", pelagic: true, seaOnly: true, hab: "Arus Selat · Laut Dalam · Palung Mistis Selat", name: "Tuna Gigi Anjing", loc: "selat", rarity: "epik", wMin: 4, wMax: 24, price: 58, power: 8, color: "#2f4a6e", belly: "#d7dfe8", shape: [1.5, .44], fin: "pointed", desc: "Tuna pemburu bergigi runcing. Tenaganya meledak di awal tarikan dan jarang menyerah." },
  // -- 2 mistis khusus (ikan fantasi dunia Nusa Island; hanya dari Palung Mistis Selat; rarity tetap legenda) --
  { id: "lentera_arwah", seaOnly: true, mistik: true, hab: "Palung Mistis Selat", name: "Ikan Lentera Arwah", loc: "selat", rarity: "legenda", wMin: .3, wMax: 1.8, price: 650, power: 6, color: "#7fe0c8", belly: "#d4fff2", shape: [1.25, .42], fin: "round", finColor: "#9ff2e0", ghost: true, glow: "#6ff0d2", desc: "Cahaya dari kedalaman yang dipercaya nelayan sebagai penjaga rahasia samudra." },
  { id: "pari_bayang", pelagic: true, seaOnly: true, mistik: true, tough: true, hab: "Palung Mistis Selat", name: "Pari Bayang Samudra", loc: "selat", rarity: "legenda", wMin: 16, wMax: 100, price: 45, power: 9.4, color: "#1b2a3c", belly: "#34506a", shape: [1.45, .5], fin: "round", ray: true, glow: "#5fd8ff", desc: "Bayangan misterius yang bergerak sunyi di bawah arus samudra." },

  // ---------- Raja Ampat ----------
  { id: "badut", name: "Ikan Badut", loc: "ampat", rarity: "biasa", wMin: .05, wMax: .2, price: 60, power: 1, color: "#f07b2a", belly: "#f7a65e", shape: [1, .52], fin: "round", stripes: "#ffffff", desc: "Tinggal di anemon. Kayaknya pernah lihat di film..." },
  { id: "kakatua", name: "Kakatua", loc: "ampat", rarity: "biasa", wMin: .5, wMax: 4, price: 32, power: 2, color: "#2fb39a", belly: "#9fe0c8", shape: [1.15, .48], fin: "round", scales: true, desc: "Gigi seperti paruh, suka gigit karang." },
  { id: "sunu", name: "Kerapu Sunu", loc: "ampat", rarity: "langka", wMin: 1, wMax: 6, price: 90, power: 4, color: "#d6423f", belly: "#ef9a8b", shape: [1.2, .44], fin: "round", spots: "#3c86c9", desc: "Merah berbintik biru. Harganya mahal di ekspor." },
  { id: "gt", name: "Kuwe GT", loc: "ampat", rarity: "epik", wMin: 10, wMax: 50, xMax: 80, xP: .02, price: 50, power: 8, color: "#5b6670", belly: "#c7ced3", shape: [1.15, .56], fin: "pointed", desc: "Giant Trevally. Pemancing dunia datang demi ikan ini." },
  { id: "napoleon", name: "Napoleon", loc: "ampat", rarity: "legenda", wMin: 20, wMax: 120, xMax: 190, xP: .02, price: 70, power: 9, color: "#3b8f8a", belly: "#86c9b5", shape: [1.25, .55], fin: "round", hump: true, protected: true, desc: "Ikan berjidat besar. Dilindungi, jadi dilepas lagi dan kamu dapat hadiah konservasi." },

  // ---------- Laut Banda ----------
  { id: "terbang", pelagic: true, name: "Ikan Terbang", loc: "banda", rarity: "biasa", wMin: .2, wMax: .6, price: 40, power: 2, color: "#3f6fa8", belly: "#dde8f2", shape: [1.3, .3], fin: "sail", desc: "Bisa melayang di atas ombak sejauh 50 meter." },
  { id: "cakalang", pelagic: true, name: "Cakalang", loc: "banda", rarity: "biasa", wMin: 1, wMax: 8, price: 35, power: 4, color: "#344e78", belly: "#e3e7ee", shape: [1.2, .42], fin: "pointed", stripes: "#2b3f5f", desc: "Bahan cakalang fufu khas Manado." },
  { id: "tuna", pelagic: true, name: "Tuna Sirip Kuning", loc: "banda", rarity: "langka", wMin: 15, wMax: 90, xMax: 200, xP: .02, price: 45, power: 7, color: "#26406b", belly: "#dfe4ec", shape: [1.3, .46], fin: "pointed", finColor: "#f2c12e", desc: "Atlet samudra. Siap-siap tangan pegal." },
  { id: "layaran", pelagic: true, name: "Ikan Layaran", loc: "banda", rarity: "epik", wMin: 20, wMax: 70, xMax: 110, xP: .02, price: 55, power: 8, color: "#2e4f86", belly: "#d4dcea", shape: [1.8, .3], fin: "sail", bill: true, desc: "Ikan tercepat di laut. Siripnya seperti layar kapal." },
  { id: "marlin", pelagic: true, name: "Marlin Biru", loc: "banda", rarity: "legenda", wMin: 80, wMax: 400, xMax: 500, xP: .015, price: 40, power: 10, color: "#1f3f7a", belly: "#cfd9ea", shape: [1.9, .32], fin: "pointed", bill: true, desc: "Raja samudra. Butuh joran terbaik dan kesabaran." },
  { id: "hiu_paus", name: "Hiu Paus Kecil", loc: "banda", rarity: "legenda", wMin: 300, wMax: 900, price: 15, power: 10, color: "#4a6078", belly: "#d6dde4", shape: [1.7, .4], fin: "pointed", spots: "#e8eef3", night: true, protected: true, desc: "Raksasa lembut yang dilindungi. Dilepas lagi, kamu dapat hadiah konservasi." },

  // ---------- Ide 07B: 11 ikan baru per lokasi reguler (3 Biasa, 3 Langka, 2 Epik, 1 Legenda, 1 Mitos, 1 SUPER RARE). Sumber: scripts/ikan-lokasi-sumber.js ----------
  // x = ikan baru Ide 07B · mitos = Legenda berbobot 0,3 di dalam kelompoknya (pw) · sup = SUPER RARE: tidak ada di kumpulan lemparan klien, hanya diundi SERVER (economy/ikanloc-core.js)
  // -- Muara Kampung --
  { id: "mr_bilis", name: "Bilis Nipah", loc: "muara", rarity: "biasa", wMin: 0.02, wMax: 0.09, price: 85, power: 1, color: "#c9d3cc", belly: "#f4f1e3", shape: [1.15, 0.26], fin: "pointed", stripes: "#9db0a7", x: true, hab: "Muara · Hutan Nipah", desc: "Kecil perak bergerombol di antara akar nipah. Digoreng kering jadi lauk kampung." },
  { id: "mr_betok", name: "Betok Rawa", loc: "muara", rarity: "biasa", wMin: 0.05, wMax: 0.28, price: 55, power: 1, color: "#5f6b3c", belly: "#c4c08a", shape: [0.95, 0.55], fin: "round", spots: "#3b4426", x: true, hab: "Muara · Rawa Dangkal", desc: "Bisa memanjat tepi rawa saat air surut. Sisiknya kasar dan gelap." },
  { id: "mr_baung", name: "Baung Kali", loc: "muara", rarity: "biasa", wMin: 0.3, wMax: 2.2, price: 26, power: 2, color: "#8a7f6e", belly: "#e2d7bc", shape: [1.3, 0.34], fin: "long", stripes: "#5e5547", whisker: true, x: true, hab: "Muara · Sungai Berlumpur", desc: "Berkumis panjang dan hobi bersembunyi di bawah akar yang tenggelam." },
  { id: "mr_belida", name: "Belida Pisau", loc: "muara", rarity: "langka", wMin: 1.5, wMax: 9, price: 24, power: 4, color: "#c7ced2", belly: "#f1f3f1", shape: [1.75, 0.26], fin: "long", scales: true, x: true, hab: "Muara · Arus Tenang", desc: "Badan pipih memanjang seperti bilah pisau. Daging gilingnya jadi pempek terbaik." },
  { id: "mr_selais", name: "Selais Bakau", loc: "muara", rarity: "langka", wMin: 0.5, wMax: 3.4, price: 63, power: 3, color: "#6f5a3c", belly: "#d6c08e", shape: [1.2, 0.36], fin: "pointed", finColor: "#b88a3a", whisker: true, x: true, hab: "Muara · Akar Bakau", desc: "Lele kecil bersirip kuning tua. Hanya keluar saat air pasang naik." },
  { id: "mr_tapah", name: "Tapah Lumpur", loc: "muara", rarity: "langka", wMin: 2, wMax: 11, price: 20, power: 4, color: "#4c5148", belly: "#b9b79f", shape: [1.5, 0.4], fin: "round", spots: "#2d312b", hump: true, x: true, hab: "Muara · Lubuk Dalam", desc: "Kepalanya lebar, mulutnya besar. Menyergap apa saja yang lewat di lubuk." },
  { id: "mr_jelawat", name: "Jelawat Kencana", loc: "muara", rarity: "epik", wMin: 3, wMax: 16, price: 54, power: 6, color: "#d6a33a", belly: "#fbe9a6", shape: [1.1, 0.52], fin: "round", finColor: "#e5762f", scales: true, x: true, hab: "Muara · Hulu Muara", desc: "Bersisik emas seperti disepuh. Lompatannya membuat pemancing lupa menarik joran." },
  { id: "mr_toman_bara", name: "Toman Bara", loc: "muara", rarity: "epik", wMin: 4, wMax: 22, price: 39, power: 7, color: "#8a3a22", belly: "#e8a05c", shape: [1.5, 0.36], fin: "long", stripes: "#3a1d14", x: true, hab: "Muara · Lubuk Berbatu", desc: "Toman bergaris merah arang. Konon galaknya melebihi toman biasa." },
  { id: "mr_patin_keramat", name: "Patin Keramat", loc: "muara", rarity: "legenda", wMin: 8, wMax: 38, price: 77, power: 8, color: "#e2d2a8", belly: "#fffbe8", shape: [1.55, 0.44], fin: "pointed", finColor: "#f2cf6a", whisker: true, x: true, hab: "Muara · Lubuk Keramat", desc: "Patin putih gading yang menurut cerita kampung dijaga leluhur sungai." },
  { id: "mr_gabus_hantu", name: "Gabus Hantu Bakau", loc: "muara", rarity: "legenda", wMin: 3, wMax: 14, price: 285, power: 8, color: "#cfe3dc", belly: "#f5fffb", shape: [1.5, 0.32], fin: "long", finColor: "#9fe3d0", spots: "#8fb4a8", x: true, mitos: true, pw: 0.3, hab: "Muara · Kabut Pagi Bakau", desc: "Pucat kebiruan dan nyaris tembus pandang. Muncul hanya saat kabut menutup bakau." },
  { id: "mr_belida_bulan", name: "Belida Kembang Bulan", loc: "muara", rarity: "legenda", wMin: 14, wMax: 48, price: 57, power: 9, color: "#f2f4f7", belly: "#ffffff", shape: [1.7, 0.3], fin: "long", finColor: "#ffe39a", spots: "#d8dde6", scales: true, x: true, sup: true, aura: "#ffe9a8", hab: "Muara · Muara Tersembunyi", desc: "Perak murni dengan pola bulatan seperti purnama. Hanya satu dari ribuan tangkapan." },
  // -- Danau Toba --
  { id: "tb_bilih", name: "Bilih Danau", loc: "toba", rarity: "biasa", wMin: 0.02, wMax: 0.08, price: 120, power: 1, color: "#d7dfe0", belly: "#f6f8f4", shape: [1.2, 0.28], fin: "pointed", stripes: "#aab7b9", x: true, hab: "Toba · Tepian Berbatu", desc: "Ikan mungil pemakan plankton. Segar dijadikan sambal khas danau." },
  { id: "tb_tawes", name: "Tawes Danau", loc: "toba", rarity: "biasa", wMin: 0.3, wMax: 1.9, price: 24, power: 1, color: "#aeb8a2", belly: "#eef0e0", shape: [1, 0.5], fin: "round", scales: true, x: true, hab: "Toba · Perairan Dangkal", desc: "Pemakan lumut yang tenang. Sisiknya berkilau hijau keperakan." },
  { id: "tb_gurame", name: "Gurami Tepian", loc: "toba", rarity: "biasa", wMin: 0.5, wMax: 3.2, price: 22, power: 2, color: "#7a6a4f", belly: "#d5c7a1", shape: [0.95, 0.62], fin: "long", finColor: "#a8603a", hump: true, x: true, hab: "Toba · Rumpun Eceng", desc: "Berkepala menonjol, hidup di rumpun enceng gondok tepi danau." },
  { id: "tb_sidat", name: "Sidat Kawah", loc: "toba", rarity: "langka", wMin: 0.8, wMax: 5.5, price: 45, power: 4, color: "#2f3a3a", belly: "#9fb0a8", shape: [2.2, 0.13], fin: "long", spots: "#1c2423", x: true, hab: "Toba · Dasar Vulkanik", desc: "Menyerupai ular air gelap. Bersembunyi di celah batu hangat dasar danau." },
  { id: "tb_kelabau", name: "Kelabau Biru", loc: "toba", rarity: "langka", wMin: 1.2, wMax: 7, price: 35, power: 4, color: "#4f7ea6", belly: "#dbe8f1", shape: [1.2, 0.45], fin: "pointed", finColor: "#2b5d86", scales: true, x: true, hab: "Toba · Arus Sungai Asahan", desc: "Biru logam saat tersorot matahari. Gesit melawan arus." },
  { id: "tb_hampala", name: "Hampala Bukit", loc: "toba", rarity: "langka", wMin: 1.5, wMax: 8, price: 31, power: 5, color: "#a58f4a", belly: "#efe3b4", shape: [1.25, 0.4], fin: "pointed", spots: "#2e281a", stripes: "#6e5d2c", x: true, hab: "Toba · Tebing Batu", desc: "Berpita hitam di pangkal sirip, pemburu ikan kecil di dekat tebing." },
  { id: "tb_jambal", name: "Jambal Samosir", loc: "toba", rarity: "epik", wMin: 4, wMax: 20, price: 52, power: 6, color: "#6a4f6e", belly: "#cdb9cf", shape: [1.45, 0.4], fin: "round", stripes: "#43304a", whisker: true, x: true, hab: "Toba · Teluk Samosir", desc: "Lele ungu keabuan dari teluk-teluk Samosir. Dagingnya padat dan manis." },
  { id: "tb_baung_pusuk", name: "Baung Pusuk", loc: "toba", rarity: "epik", wMin: 5, wMax: 26, price: 40, power: 7, color: "#5b6b52", belly: "#d6dcc1", shape: [1.5, 0.38], fin: "long", whisker: true, hump: true, x: true, hab: "Toba · Kaki Pusuk Buhit", desc: "Raksasa berkumis dari lereng Pusuk Buhit; penariknya sangat berat." },
  { id: "tb_gurami_naga", name: "Gurami Naga Sibolga", loc: "toba", rarity: "legenda", wMin: 9, wMax: 36, price: 136, power: 8, color: "#b24a3a", belly: "#f1b27a", shape: [1.05, 0.6], fin: "sail", finColor: "#e8b548", scales: true, x: true, hab: "Toba · Lubuk Sibolga", desc: "Gurami merah bersirip layar. Dipercaya penjaga lubuk tertua." },
  { id: "tb_belut_kawah", name: "Belut Kawah Purba", loc: "toba", rarity: "legenda", wMin: 4, wMax: 18, price: 324, power: 9, color: "#59d6c4", belly: "#d8fff6", shape: [2.3, 0.16], fin: "long", finColor: "#a3fff0", stripes: "#1e8c7d", x: true, mitos: true, pw: 0.3, hab: "Toba · Kaldera Terdalam", desc: "Belut kehijauan berpendar lembut dari kaldera purba. Hampir tak pernah naik ke permukaan." },
  { id: "tb_ihan_kencana", name: "Ihan Kencana Sipiso", loc: "toba", rarity: "legenda", wMin: 12, wMax: 44, price: 77, power: 9, color: "#f0b93b", belly: "#fff3c2", shape: [1.4, 0.46], fin: "round", finColor: "#fff0a0", spots: "#d58a1f", scales: true, x: true, sup: true, aura: "#ffd96a", hab: "Toba · Air Terjun Sipiso-piso", desc: "Emas padat seperti patung hidup. Dongeng Batak menyebutnya ikan pembawa berkah." },
  // -- Selat Sunda --
  { id: "st_teri", name: "Teri Krakatau", loc: "selat", rarity: "biasa", wMin: 0.01, wMax: 0.05, price: 160, power: 1, color: "#e5ecea", belly: "#ffffff", shape: [1.1, 0.22], fin: "pointed", stripes: "#c5d3cf", x: true, hab: "Selat · Perairan Pesisir", desc: "Bergerombol ribuan di air hangat dekat pulau vulkanik." },
  { id: "st_bandeng", name: "Bandeng Selat", loc: "selat", rarity: "biasa", wMin: 0.5, wMax: 3.4, price: 22, power: 2, color: "#9fb0b4", belly: "#eef3f2", shape: [1.4, 0.36], fin: "pointed", scales: true, x: true, hab: "Selat · Muara Selat", desc: "Bersisik perak halus; lincah bila diburu predator." },
  { id: "st_lemuru", name: "Lemuru Banten", loc: "selat", rarity: "biasa", wMin: 0.05, wMax: 0.22, price: 70, power: 1, color: "#4d6f84", belly: "#dce6ea", shape: [1.15, 0.32], fin: "round", spots: "#243c4d", x: true, hab: "Selat · Arus Dangkal", desc: "Sardin lokal bertotol gelap di pundak, sering diolah jadi tepung ikan dan pindang." },
  { id: "st_layur", name: "Layur Perak", loc: "selat", rarity: "langka", wMin: 0.6, wMax: 3.8, price: 97, power: 3, color: "#d4dadc", belly: "#f7f9f9", shape: [2.3, 0.12], fin: "long", finColor: "#a9b6ba", scales: true, x: true, hab: "Selat · Dasar Berlumpur", desc: "Pita perak panjang tak bersisik. Berkilat seperti pedang saat diangkat." },
  { id: "st_bubara", name: "Bubara Jaring", loc: "selat", rarity: "langka", wMin: 1, wMax: 6.5, price: 57, power: 4, color: "#587a96", belly: "#d9e5ee", shape: [1.1, 0.5], fin: "pointed", stripes: "#30506b", x: true, hab: "Selat · Arus Tengah", desc: "Pelari tangkas yang suka menyambar umpan hidup." },
  { id: "st_gerong", name: "Kuwe Gerong", loc: "selat", rarity: "langka", wMin: 1.5, wMax: 9, price: 41, power: 5, color: "#c2b57c", belly: "#f4eed2", shape: [1.1, 0.56], fin: "pointed", finColor: "#d8a43a", stripes: "#8d7d44", x: true, hab: "Selat · Karang Krakatau", desc: "Kuning keperakan dengan sirip emas. Menyerang gerombolan teri." },
  { id: "st_tenggiri_papan", name: "Tenggiri Papan", loc: "selat", rarity: "epik", wMin: 5, wMax: 32, price: 43, power: 7, color: "#406985", belly: "#c5d4de", shape: [1.7, 0.3], fin: "pointed", stripes: "#25465c", x: true, hab: "Selat · Jalur Arus Kuat", desc: "Lebih besar dan lebih bertenaga dari tenggiri biasa. Menarik tanpa ampun." },
  { id: "st_hiu_lanjam", name: "Hiu Lanjam", loc: "selat", rarity: "epik", wMin: 15, wMax: 80, price: 17, power: 8, color: "#5d6770", belly: "#e5e8ea", shape: [1.7, 0.38], fin: "pointed", spots: "#363c42", x: true, hab: "Selat · Dasar Karang Dalam", desc: "Hiu kecil pemburu dasar yang malu-malu, aman bagi manusia." },
  { id: "st_pari_anyer", name: "Pari Layang Anyer", loc: "selat", rarity: "legenda", wMin: 25, wMax: 110, price: 55, power: 9, color: "#3a5a7a", belly: "#c3d3e0", shape: [1.35, 0.28], fin: "sail", spots: "#b9d0e4", x: true, hab: "Selat · Perairan Anyer", desc: "Pari lebar yang melayang di atas dasar pasir. Gerakannya megah dan pelan." },
  { id: "st_pelangi_kawah", name: "Pelangi Anak Krakatau", loc: "selat", rarity: "legenda", wMin: 6, wMax: 26, price: 236, power: 9, color: "#e65a7a", belly: "#ffd0a8", shape: [1.25, 0.42], fin: "sail", finColor: "#4fe0d0", stripes: "#6a3fc8", x: true, mitos: true, pw: 0.3, hab: "Selat · Kaldera Anak Krakatau", desc: "Warna merah-ungu-hijau berpendar bagai lava malam hari. Bangkit saat letupan kecil di kawah." },
  { id: "st_layur_api", name: "Layur Api Krakatau", loc: "selat", rarity: "legenda", wMin: 18, wMax: 62, price: 62, power: 9, color: "#ff7a3a", belly: "#ffe0a0", shape: [2.4, 0.15], fin: "long", finColor: "#ffd45a", stripes: "#c43a1a", scales: true, x: true, sup: true, aura: "#ff9a4a", hab: "Selat · Mulut Kawah Bawah Laut", desc: "Layur raksasa berkilau jingga. Hanya segelintir pemancing sepanjang masa yang pernah melihatnya." },
  // -- Raja Ampat --
  { id: "ra_kepe", name: "Kepe-kepe Ekor Merah", loc: "ampat", rarity: "biasa", wMin: 0.05, wMax: 0.22, price: 100, power: 1, color: "#f6d44a", belly: "#fffbd8", shape: [0.85, 0.72], fin: "round", finColor: "#e5452f", stripes: "#3a3a3a", x: true, hab: "Ampat · Karang Dangkal", desc: "Pipih bundar bergaris hitam. Mondar-mandir di antara karang meja." },
  { id: "ra_sersan", name: "Sersan Mayor", loc: "ampat", rarity: "biasa", wMin: 0.05, wMax: 0.25, price: 90, power: 1, color: "#9bd8cf", belly: "#f0fbf6", shape: [0.95, 0.6], fin: "round", stripes: "#2a4f58", x: true, hab: "Ampat · Laguna", desc: "Berpita hitam seperti pangkat. Berani mencuri umpan kecil." },
  { id: "ra_betok_laut", name: "Betok Laut Biru", loc: "ampat", rarity: "biasa", wMin: 0.08, wMax: 0.45, price: 55, power: 1, color: "#2b7fd4", belly: "#bfe0f4", shape: [0.9, 0.5], fin: "round", finColor: "#ffd45a", x: true, hab: "Ampat · Rumpun Karang", desc: "Biru cerah menyala dan sirip kuning gading." },
  { id: "ra_kakap_karang", name: "Kakap Merah Karang", loc: "ampat", rarity: "langka", wMin: 1, wMax: 6, price: 97, power: 4, color: "#c8453a", belly: "#f2b9a0", shape: [1.2, 0.5], fin: "pointed", finColor: "#9d2f2a", scales: true, x: true, hab: "Ampat · Tebing Karang", desc: "Merah api yang jadi pusat perhatian di perairan jernih." },
  { id: "ra_kerapu_bebek", name: "Kerapu Bebek", loc: "ampat", rarity: "langka", wMin: 1.5, wMax: 9, price: 65, power: 5, color: "#8a6bb8", belly: "#e2d4f2", shape: [1.2, 0.5], fin: "round", spots: "#f4eefc", x: true, hab: "Ampat · Gua Karang", desc: "Ungu keabuan bertotol putih. Bersarang di lorong sempit karang." },
  { id: "ra_bibir_manis", name: "Bibir Tebal Pelangi", loc: "ampat", rarity: "langka", wMin: 2, wMax: 12, price: 49, power: 5, color: "#d6a05f", belly: "#f9e6c4", shape: [1.3, 0.5], fin: "round", spots: "#fff3d0", stripes: "#3b2a1b", x: true, hab: "Ampat · Bawah Karang Meja", desc: "Bibir tebal bergaris warna-warni. Kadang berenang menyamping ketika diganggu." },
  { id: "ra_wobbe", name: "Wobbegong Cenderawasih", loc: "ampat", rarity: "epik", wMin: 12, wMax: 60, price: 46, power: 7, color: "#8c6a3c", belly: "#e1ceaa", shape: [1.45, 0.4], fin: "round", spots: "#3a2a17", whisker: true, hump: true, x: true, hab: "Ampat · Dasar Berpasir", desc: "Hiu karpet berumbai bertotol cokelat. Menyaru sebagai batu karang." },
  { id: "ra_pari_bendera", name: "Pari Bendera Karang", loc: "ampat", rarity: "epik", wMin: 10, wMax: 55, price: 50, power: 7, color: "#2f7a88", belly: "#d3eef0", shape: [1.3, 0.3], fin: "sail", finColor: "#9ee4ee", spots: "#e8f6f8", x: true, hab: "Ampat · Jalur Arus Karang", desc: "Pari biru kehijauan bertotol putih bersirip lebar seperti bendera." },
  { id: "ra_hiu_jalan", name: "Hiu Berjalan Halmahera", loc: "ampat", rarity: "legenda", wMin: 8, wMax: 36, price: 162, power: 8, color: "#b0873f", belly: "#f1deb0", shape: [1.5, 0.3], fin: "long", finColor: "#7a5a28", spots: "#4a361a", x: true, hab: "Ampat · Laguna Dangkal", desc: "Berjalan di dasar dengan siripnya. Endemik perairan timur Nusantara." },
  { id: "ra_pari_wayag", name: "Pari Cahaya Wayag", loc: "ampat", rarity: "legenda", wMin: 22, wMax: 90, price: 68, power: 9, color: "#4fd8ff", belly: "#f0ffff", shape: [1.4, 0.3], fin: "sail", finColor: "#b9f2ff", spots: "#ffffff", x: true, mitos: true, pw: 0.3, hab: "Ampat · Laguna Wayag", desc: "Memantulkan cahaya laguna biru-hijau. Para pemandu menyebutnya 'lampu laut'." },
  { id: "ra_cenderawasih", name: "Cenderawasih Laut", loc: "ampat", rarity: "legenda", wMin: 16, wMax: 58, price: 71, power: 9, color: "#f2c53a", belly: "#ffffff", shape: [1.35, 0.44], fin: "sail", finColor: "#ff6f3c", spots: "#2c9b8a", stripes: "#e0452f", x: true, sup: true, aura: "#fff0a0", hab: "Ampat · Taman Karang Misool", desc: "Berhias warna sirip bak burung surga: bahkan di laut ia tampak menari." },
  // -- Laut Banda --
  { id: "bd_tongkol", name: "Tongkol Abu Banda", loc: "banda", rarity: "biasa", wMin: 0.6, wMax: 4.5, price: 30, power: 3, color: "#3d4f66", belly: "#c9d3df", shape: [1.4, 0.36], fin: "pointed", stripes: "#22303f", x: true, hab: "Banda · Laut Terbuka", desc: "Pemburu gerombolan yang selalu bergerak. Jadi pindang andalan." },
  { id: "bd_malalugis", name: "Malalugis Biru", loc: "banda", rarity: "biasa", wMin: 0.2, wMax: 1.2, price: 55, power: 2, color: "#3a8fc0", belly: "#e1f1f8", shape: [1.25, 0.3], fin: "pointed", finColor: "#ffd45a", x: true, hab: "Banda · Arus Pelagis", desc: "Biru terang melaju cepat di dekat permukaan." },
  { id: "bd_layang_banda", name: "Layang Banda", loc: "banda", rarity: "biasa", wMin: 0.15, wMax: 0.6, price: 70, power: 2, color: "#6aa0a8", belly: "#f1f6f5", shape: [1.2, 0.34], fin: "pointed", spots: "#365c63", x: true, hab: "Banda · Perairan Pala", desc: "Gerombolannya memutar di atas dasar kepulauan pala." },
  { id: "bd_lemadang", name: "Lemadang Emas", loc: "banda", rarity: "langka", wMin: 4, wMax: 22, price: 84, power: 5, color: "#e8b53a", belly: "#fff1b0", shape: [1.4, 0.46], fin: "long", finColor: "#3fb7c8", hump: true, x: true, hab: "Banda · Rumpon Terapung", desc: "Kepala tegak dan warna emas kehijauan. Melompat tinggi saat tersangkut." },
  { id: "bd_tenggiri_samudra", name: "Tenggiri Samudra", loc: "banda", rarity: "langka", wMin: 6, wMax: 36, price: 51, power: 5, color: "#2f5a86", belly: "#bfd0e2", shape: [1.8, 0.24], fin: "pointed", stripes: "#183452", x: true, hab: "Banda · Tebing Dalam", desc: "Langsing dan super cepat. Menggunting senar dengan giginya." },
  { id: "bd_kuwe_selatan", name: "Kuwe Selatan", loc: "banda", rarity: "langka", wMin: 5, wMax: 30, price: 61, power: 5, color: "#3b6a86", belly: "#d4e2ea", shape: [1.15, 0.54], fin: "pointed", scales: true, x: true, hab: "Banda · Gugusan Karang Dalam", desc: "Pipih tebal dan sangat bertenaga; sering memutuskan joran kecil." },
  { id: "bd_hiu_martil", name: "Hiu Martil Banda", loc: "banda", rarity: "epik", wMin: 40, wMax: 220, price: 29, power: 9, color: "#6f7d8b", belly: "#dfe4e8", shape: [1.65, 0.34], fin: "pointed", spots: "#454f5a", hump: true, x: true, hab: "Banda · Gunung Bawah Laut", desc: "Kepalanya melebar bak palu. Sering terlihat berombongan di tebing dalam." },
  { id: "bd_tuna_matabesar", name: "Tuna Mata Besar", loc: "banda", rarity: "epik", wMin: 25, wMax: 160, price: 31, power: 9, color: "#243a6b", belly: "#cdd6e8", shape: [1.45, 0.5], fin: "pointed", finColor: "#d9b13a", spots: "#101c3a", x: true, hab: "Banda · Palung Dalam", desc: "Bermata sebesar piring kecil. Menyelam sampai ratusan meter." },
  { id: "bd_mola", name: "Mola Palung Banda", loc: "banda", rarity: "legenda", wMin: 60, wMax: 320, price: 24, power: 9, color: "#8d9aa8", belly: "#e9edf1", shape: [0.85, 0.85], fin: "round", spots: "#5a6673", hump: true, x: true, hab: "Banda · Lapisan Hangat", desc: "Ikan matahari raksasa berbentuk cakram. Tampak malas, tetapi tenaganya luar biasa." },
  { id: "bd_dayung", name: "Raja Herring Dayung", loc: "banda", rarity: "legenda", wMin: 30, wMax: 140, price: 53, power: 10, color: "#c9e0ff", belly: "#ffffff", shape: [2.6, 0.12], fin: "long", finColor: "#ff4a4a", stripes: "#e65a5a", x: true, mitos: true, pw: 0.3, hab: "Banda · Palung Terdalam", desc: "Pita perak sepanjang perahu dengan jambul merah. Pelaut menyebutnya 'ular laut' dan membawa isyarat gempa." },
  { id: "bd_raja_laut", name: "Raja Laut Purba", loc: "banda", rarity: "legenda", wMin: 45, wMax: 190, price: 35, power: 10, color: "#2d5f9e", belly: "#b7c8e6", shape: [1.4, 0.5], fin: "round", finColor: "#7ab2ff", spots: "#e4ecff", scales: true, x: true, sup: true, aura: "#9fd0ff", hab: "Banda · Perairan Maluku Terdalam", desc: "Fosil hidup bersirip berdaging, dianggap telah punah. Tanda keberuntungan terbesar bagi pemancing." },
];

// Upgrade: level 1 gratis. cost[i] = harga naik ke level i+1
const UPGRADES = {
  rod: {
    name: "Joran", icon: "🎣",
    // Bumbu 1.2: 10 tingkat; Update Komunitas: +10 tingkat (indeks 10-19 = Level 11-20; USULAN statistik menunggu persetujuan Owner, lihat docs/JORAN-LV11-20.md). Indeks 0-4 = lima joran lama (kepemilikan & harga tidak berubah).
    // cap = batas REKOMENDASI ikan (kg) dengan toleransi 1,5×; lebih berat dari itu senar berisiko putus.
    levels: ["Joran Bambu Kampung", "Joran Fiber Muara", "Joran Karbon Sungai", "Joran Titanium Pesisir", "Joran Legenda Nusa", "Joran Baja Samudra", "Joran Arus Dalam", "Joran Titan Nelayan", "Joran Raja Laut", "Joran Penakluk Samudra", "Joran Badai Laut", "Joran Karang Emas", "Joran Hiu Raja", "Joran Palung Hitam", "Joran Kaisar Samudra", "Joran Naga Laut", "Joran Abyss", "Joran Leviathan", "Joran Penguasa Legenda", "Joran Dewa Samudra"],
    cost: [0, 400, 1800, 6500, 22000, 32000, 46000, 62000, 80000, 110000, 140000, 175000, 220000, 275000, 350000, 450000, 575000, 700000, 850000, 1000000],
    catalog: [100, 400, 1800, 6500, 22000, 32000, 46000, 62000, 80000, 110000, 140000, 175000, 220000, 275000, 350000, 450000, 575000, 700000, 850000, 1000000], // harga di katalog (joran 1 diberikan gratis)
    cap: [8, 18, 40, 80, 150, 200, 260, 330, 420, 500, 525, 550, 575, 600, 625, 650, 675, 700, 725, 750],
    strength: [1, 1.25, 1.55, 1.9, 2.4, 2.75, 3.1, 3.45, 3.8, 4.2, 4.32, 4.44, 4.56, 4.68, 4.8, 4.92, 5.04, 5.16, 5.28, 5.4],
    reel: [1, 1.2, 1.4, 1.65, 1.95, 2.2, 2.45, 2.7, 2.95, 3.2, 3.28, 3.36, 3.44, 3.52, 3.6, 3.68, 3.76, 3.84, 3.92, 4.0],
    desc: [
      "Bambu polos dengan tali sederhana. Cukup untuk ikan kampung.",
      "Batang fiber ringan dengan reel kecil. Lentur dan awet.",
      "Karbon gelap yang tegas, reel lebih rapi untuk ikan sungai besar.",
      "Perak kebiruan yang kokoh, tahan air asin pesisir.",
      "Kayu gelap berlapis emas dengan ornamen nelayan Nusantara.",
      "Batang baja berwarna laut dengan reel besar untuk perairan dalam.",
      "Biru tua berukir gelombang dan reel premium untuk arus kuat.",
      "Logam berlapis dengan gagang tebal, dibuat untuk ikan penarik.",
      "Biru dan emas berornamen jangkar. Joran para penguasa laut.",
      "Joran termegah dengan ornamen maritim dan reel besar. Untuk raksasa samudra.",
      "Batang biru badai dengan gagang karet tebal. Tahan hempasan ombak besar.",
      "Karang emas berkilau di sepanjang batang; reel berukir bintang laut.",
      "Bersirip hiu di pangkal batang. Dibuat untuk pemburu predator samudra.",
      "Hitam pekat bak palung terdalam, dengan garis cahaya biru samar.",
      "Tahta kaisar di ujung tangan: batang putih-perak berhias mahkota kecil.",
      "Sisik hijau laut dan gagang bertanduk naga. Setiap tarikan terasa berat.",
      "Gelap berpendar ungu dari jurang abyssal. Reel berputar tanpa suara.",
      "Biru tua bersisik cyan, melingkar bagai ular laut purba.",
      "Batang emas-perunggu penuh ukiran para penguasa legenda.",
      "Joran tertinggi: batang putih-emas dengan cahaya samudra yang berdenyut lembut.",
    ],
    info: ["Ikan hingga 8 kg", "Ikan hingga 18 kg", "Ikan hingga 40 kg", "Ikan hingga 80 kg", "Ikan hingga 150 kg", "Ikan hingga 200 kg", "Ikan hingga 260 kg", "Ikan hingga 330 kg", "Ikan hingga 420 kg", "Ikan hingga 500 kg", "Ikan hingga 525 kg", "Ikan hingga 550 kg", "Ikan hingga 575 kg", "Ikan hingga 600 kg", "Ikan hingga 625 kg", "Ikan hingga 650 kg", "Ikan hingga 675 kg", "Ikan hingga 700 kg", "Ikan hingga 725 kg", "Ikan hingga 750 kg"],
  },
  bait: {
    name: "Umpan", icon: "🪱",
    levels: ["Cacing Tanah", "Udang Segar", "Umpan Racikan", "Umpan Lampu Malam", "Umpan Rahasia Datuk"],
    cost: [0, 300, 1400, 5000, 16000],
    info: ["Normal", "Gigit lebih cepat, sedikit lebih hoki", "Ikan langka +", "Ikan epik +", "Legenda jauh lebih sering"],
    luck: [1, 1.25, 1.6, 2.1, 2.9], speed: [1, 1.2, 1.35, 1.5, 1.7],
  },
  cooler: {
    name: "Coolbox", icon: "🧊",
    // Bumbu 1.2: 10 tingkat sampai 200 ikan. Tingkat 1-5 tidak berubah (simpanan lama tetap valid).
    levels: ["Ember Bekas", "Coolbox Kecil", "Coolbox Besar", "Palka Kapal", "Gudang Es", "Palka Samudra", "Gudang Pendingin", "Pabrik Es Mini", "Gudang Beku Kampung", "Gudang Beku Raya"],
    cost: [0, 250, 1100, 4200, 13000, 19000, 27000, 37000, 49000, 65000],
    info: ["Muat 8 ikan", "Muat 15 ikan", "Muat 25 ikan", "Muat 40 ikan", "Muat 70 ikan", "Muat 100 ikan", "Muat 125 ikan", "Muat 150 ikan", "Muat 175 ikan", "Muat 200 ikan"],
    icons: ["🪣", "🧊", "🧊", "🚢", "🏚️", "⚓", "🏭", "❄️", "🏬", "🏛️"],
    cap: [8, 15, 25, 40, 70, 100, 125, 150, 175, 200],
  },
  boat: {
    name: "Kapal", icon: "⛵",
    levels: ["Sampan Kayu", "Perahu Motor", "Kapal Nelayan", "Speedboat", "Kapal Ekspedisi"],
    cost: [0, 1200, 5000, 16000, 50000],
    info: ["Buka: Muara Kampung", "Buka: Danau Toba", "Buka: Selat Sunda", "Buka: Raja Ampat", "Buka: Laut Banda"],
  },
};
