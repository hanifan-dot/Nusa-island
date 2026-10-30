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
];

// Upgrade: level 1 gratis. cost[i] = harga naik ke level i+1
const UPGRADES = {
  rod: {
    name: "Joran", icon: "🎣",
    // Bumbu 1.2: 10 tingkat. Indeks 0-4 = lima joran lama (kepemilikan & harga tidak berubah).
    // cap = batas REKOMENDASI ikan (kg) dengan toleransi 1,5×; lebih berat dari itu senar berisiko putus.
    levels: ["Joran Bambu Kampung", "Joran Fiber Muara", "Joran Karbon Sungai", "Joran Titanium Pesisir", "Joran Legenda Nusa", "Joran Baja Samudra", "Joran Arus Dalam", "Joran Titan Nelayan", "Joran Raja Laut", "Joran Penakluk Samudra"],
    cost: [0, 400, 1800, 6500, 22000, 32000, 46000, 62000, 80000, 110000],
    catalog: [100, 400, 1800, 6500, 22000, 32000, 46000, 62000, 80000, 110000], // harga di katalog (joran 1 diberikan gratis)
    cap: [8, 18, 40, 80, 150, 200, 260, 330, 420, 500],
    strength: [1, 1.25, 1.55, 1.9, 2.4, 2.75, 3.1, 3.45, 3.8, 4.2],
    reel: [1, 1.2, 1.4, 1.65, 1.95, 2.2, 2.45, 2.7, 2.95, 3.2],
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
    ],
    info: ["Ikan hingga 8 kg", "Ikan hingga 18 kg", "Ikan hingga 40 kg", "Ikan hingga 80 kg", "Ikan hingga 150 kg", "Ikan hingga 200 kg", "Ikan hingga 260 kg", "Ikan hingga 330 kg", "Ikan hingga 420 kg", "Ikan hingga 500 kg"],
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
