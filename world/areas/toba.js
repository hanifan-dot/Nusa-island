// =========================================================
//  NUSA ISLAND — Bumbu 2: area "toba" — KAMPUNG TEPIAN TOBA
//  NPC: Pak Raka (pemandu dermaga), Bu Maya (pedagang tepian danau),
//       Nala (penjelajah muda). Cerita 3 bab "Rahasia Tepian Danau".
//  Lokasi mancing memakai ULANG data LOCATIONS "toba" (tidak diduplikasi).
//  Progres pribadi pemain di S.adv.toba (berversi lewat NW.adv).
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa, S = () => N().S, W = () => NW.world;
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const M = NW.TOBA_MAP, D = NW.TOBA_DRAW, P = NW.P;

// ---------- Gaya karakter ----------
const STYLE = {
  raka: { shirt: "#2f6b58", pants: "#3b3226", skin: "#a8714a", hair: "#8a8580", hat: "fedora", hatCol: "#7a5a3a", hatBand: "#2a1d14", sash: "#8f2d2d", sashLine: "#e0b84c" },
  maya: { shirt: "#d9894a", pants: "#4a3b5c", skin: "#c68b5e", hair: "#2a1d14", hat: "bun", hatCol: "#e0b84c", apron: "#f3e7c9" },
  nala: { shirt: "#e0b84c", pants: "#2f5d78", skin: "#c99066", hair: "#2a1d14", hat: "pony", hatCol: "#e2574c", pack: "#3d6f8f", collar: "#fff6e4", scale: 0.86 },
};

// ---------- Cerita "Rahasia Tepian Danau" (3 bab) ----------
const CH = {
  1: { name: "Tamu dari Muara", steps: [
    { kind: "talk", who: "raka", goal: "Temui Pak Raka di pangkal dermaga" },
    { kind: "task", key: "visit", goal: "Lihat-lihat dermaga dan Pasar Kecil Toba" },
    { kind: "talk", who: "maya", goal: "Bicara dengan Bu Maya di Pasar Kecil" },
    { kind: "task", key: "spot", goal: "Temukan titik mancing di ujung dermaga" },
    { kind: "talk", who: "raka", goal: "Kembali ke Pak Raka" },
  ] },
  2: { name: "Jejak di Tepi Danau", steps: [
    { kind: "talk", who: "nala", goal: "Dengarkan ajakan Nala" },
    { kind: "task", key: "clues", need: 3, goal: "Periksa 3 tanda Ompung: Bukit Pandang, Sudut Tenang Danau, Pancuran Batu" },
    { kind: "talk", who: "nala", goal: "Ceritakan ketiga tanda itu ke Nala" },
    { kind: "task", key: "net", goal: "Bantu menambal jaring keramba Bu Maya (tepi danau di utara pasar)" },
    { kind: "talk", who: "nala", goal: "Kembali ke Nala" },
  ] },
  3: { name: "Pesan dari Danau", steps: [
    { kind: "talk", who: "raka", goal: "Bawa pesan Ompung ke Pak Raka" },
    { kind: "task", key: "jurung", goal: "Tantangan: tangkap Ikan Jurung dari ujung dermaga Toba" },
    { kind: "talk", who: "raka", goal: "Tunjukkan hasilnya ke Pak Raka" },
  ] },
};
const CLUES = {
  bukit: { name: "Bukit Pandang", word: "SABAR", place: "toba:bukit" },
  sudut: { name: "Sudut Tenang Danau", word: "TENANG", place: "toba:sudut" },
  pancuran: { name: "Pancuran Batu", word: "MEMBERI", place: "toba:pancuran" },
};
const st = () => S().adv.toba;
const at = (b, s) => st().bab === b && st().step === s;
const cur = () => (CH[st().bab] ? CH[st().bab].steps[st().step] : null);
const done = () => st().bab > 3;
const awaits = (who) => { const c = cur(); return !!c && c.kind === "talk" && c.who === who; };
function advance() {
  const s = st(); s.step++; const b0 = s.bab;
  if (!CH[s.bab] || s.step >= CH[s.bab].steps.length) { s.doneAt[s.bab] = Date.now(); s.bab++; s.step = 0; }
  // Bumbu 2.1: musik pendek — bab selesai / misi baru / langkah biasa (finale punya jingle sendiri)
  if (s.bab > b0) { if (s.bab <= 3) N().sfx("bab_selesai"); } else N().sfx(s.bab === 1 && s.step === 1 ? "misi_baru" : "ok");
  N().save(); W().updateHint();
  const c = cur();
  if (c) N().toast(c.kind === "talk" ? `📖 ${c.goal} ❗` : `📖 ${c.goal}`, "good");
  checkTasks();
}
// hadiah hanya sekali per bab
function claim(key, fn) { const cl = st().claimed; if (cl[key]) return false; cl[key] = Date.now(); fn(); N().save(); N().refreshHUD(); return true; }
function checkTasks() {
  const c = cur(); if (!c || c.kind !== "task") return;
  if (c.key === "visit" && NW.adv.isFound("toba:dermaga") && NW.adv.isFound("toba:pasar")) advance();
  else if (c.key === "clues" && Object.keys(st().clues).length >= 3) advance();
}

// ---------- NPC ----------
const WAIT_GUEST = { from: 0, to: 24, at: "DOCKB", act: "guide", face: 7, prop: "paddle", bubble: "⛵", label: "menunggu tamu di dermaga", lines: [] }; // objek tetap (bukan baru tiap frame)
const greet = () => { const h = S().hour; return h < 10 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18.5 ? "Selamat sore" : "Selamat malam"; };
const npcs = [
  {
    id: "raka", name: "Pak Raka", avatar: "🧑🏽‍✈️", role: "Pemandu dermaga", style: STYLE.raka, speed: 1.05, seed: 5.2, home: "RAKAH",
    sched: [
      { from: 5.5, to: 11, at: "DOCKB", act: "guide", face: 7, prop: "paddle", bubble: "⛵", label: "menyambut tamu di dermaga",
        lines: [["Kapal dari seberang biasanya datang pagi. Aku suka menyambut tamu di sini."]] },
      { from: 11, to: 13, at: "PONDOK", act: "rest", face: 3, bubble: "☕", label: "ngopi di Pondok Kumpul",
        lines: [["Kopi dari kebun di bukit itu harum sekali. Duduklah sebentar kalau mau."]] },
      { from: 13, to: 16.5, at: "SOLU", act: "patrol", route: ["SOLU", "DOCKB", "INFO"], faceAt: [7, 7, 3], wait: [5, 8], prop: "paddle", bubble: "🛶", label: "memeriksa perahu-perahu",
        lines: [["Perahu harus dicek tiap hari. Tali tambat yang longgar bisa membuat perahu hanyut malam-malam."]] },
      { from: 16.5, to: 19.5, at: "SUDUT2", act: "sunset", face: 7, bubble: "🌇", label: "menikmati senja di Sudut Tenang",
        lines: [["Lihat airnya. Waktu senja, danau ini seperti cermin emas."]] },
      { from: 19.5, to: 5.5, at: "RAKAH", act: "sleep", hide: true },
    ],
    // cerita Bab 1: Pak Raka menunggu tamu baru di dermaga, jam berapa pun kapalmu tiba
    schedFor: (h) => (at(1, 0) ? WAIT_GUEST : null),
    knock: ["Tok tok tok…", "\"Sudah malam, Nak. Kapal-kapal sudah ditambat semua. Besok pagi kita mengobrol lagi, ya,\" sahut Pak Raka dari dalam."],
  },
  {
    id: "maya", name: "Bu Maya", avatar: "👩🏽", role: "Pedagang tepian danau", style: STYLE.maya, speed: 0.85, seed: 6.4, home: "MAYAH",
    sched: [
      { from: 6, to: 14, at: "STALL", act: "tstall", face: 2, prop: "basket", bubble: "🐟", label: "berjualan di Pasar Kecil", lines: [] },
      { from: 14, to: 16.5, at: "KER", act: "feed", face: 7, prop: "bucket", bubble: "🌾", label: "memberi pakan ikan di keramba",
        lines: [["Ikan di keramba ini makan dua kali sehari. Kalau telat, mereka berkumpul di pinggir jaring, seperti menunggu Ibu."]] },
      { from: 16.5, to: 19, at: "PONDOK2", act: "chat", face: 3, bubble: "💬", label: "mengobrol di Pondok Kumpul",
        lines: [["Sore-sore begini enak mengobrol di pondok. Semua kabar kampung terdengar di sini, hihi."]] },
      { from: 19, to: 6, at: "MAYAH", act: "sleep", hide: true },
    ],
    knock: ["Tok tok tok…", "\"Lapak sudah tutup, Nak. Kalau mau titip ikan ke Bu Sari, kotaknya ada di pasar,\" sahut Bu Maya."],
  },
  {
    id: "nala", name: "Nala", avatar: "👧🏽", role: "Penjelajah muda", style: STYLE.nala, speed: 1.45, seed: 7.9, home: "NALAH",
    sched: [
      { from: 7, to: 11, at: "BUK", act: "patrol", route: ["BUKV", "SPRING", "SUDUT", "MKT"], faceAt: [7, 3, 7, 2], wait: [6, 9], prop: "binoc", bubble: "🧭", label: "menjelajah sudut kampung",
        lines: [["Aku lagi mencatat jalan setapak di kampung. Ada yang belum pernah kucoba!"]] },
      { from: 11, to: 12.5, at: "NALAH", act: "lunch", hide: true },
      { from: 12.5, to: 16, at: "SUDUT", act: "stones", face: 7, prop: "stone", bubble: "🪨", label: "melempar batu ceper di Sudut Tenang",
        lines: [["Lihat, Kak! Batu ceper kalau dilempar miring bisa memantul di air!"]] },
      { from: 16, to: 18.5, at: "BUKV", act: "watch", face: 7, prop: "binoc", bubble: "🔭", label: "memandang danau dari Bukit Pandang",
        lines: [["Dari sini semua kelihatan kecil. Perahu, rumah, bahkan Pak Raka!"]] },
      { from: 18.5, to: 7, at: "NALAH", act: "sleep", hide: true },
    ],
    knock: ["Tok tok tok…", "\"Nala sudah tidur. Besok pagi dia pasti sudah keluyuran lagi,\" kata ibunya sambil tersenyum."],
  },
];
const byId = (id) => npcs.find((n) => n.id === id);

// kalimat biasa (tidak mengulang; ingatan di S.adv.mem)
const dex = (id) => !!(S().dex[id] && S().dex[id].n);
const LINES = {
  raka: [
    { id: "r1", t: () => ["Danau ini luas sekali, kan? Coba lihat ke seberang. Bukit-bukit itu berganti warna mengikuti matahari."] },
    { id: "r2", t: () => ["Kalau pagi, kabut turun di atas air. Perahu nelayan jadi seperti mengapung di awan."] },
    { id: "r3", t: () => ["Perahu kayu ramping di tepi itu namanya solu. Dulu dipakai menyeberang dan mencari ikan."] },
    { id: "r4", t: () => ["Bukit Pandang ada di barat kampung. Naiklah sore hari, teropongnya masih bagus."] },
    { id: "r5", c: () => dex("mas"), t: () => ["Ikan mas dari danau ini dagingnya padat. Di sini sering dimasak arsik."] },
    { id: "r6", t: () => ["Airnya dalam dan dingin. Ikan di sini menarik lebih kuat, jadi jaga senarmu."] },
    { id: "r7", c: () => st().bab >= 3, t: () => ["Nala itu mirip ompungnya. Tidak bisa diam kalau ada jalan setapak yang belum dicoba."] },
    { id: "r8", c: () => done(), t: () => ["Penjelajah Tepian Toba! Kalau ada tamu baru, aku akan bilang kamu yang paling hafal kampung ini."] },
    { id: "r9", t: () => ["Mau pulang ke Muara? Kapalmu ada di sisi timur dermaga. Tinggal naik saja."] },
    { id: "r10", c: () => dex("dewa"), t: () => ["Kau pernah melihat ikan dewa? Hmm… simpan baik-baik cerita itu. Tidak semua orang seberuntung kau."] },
  ],
  maya: [
    { id: "m1", t: () => ["Ikan mas, pora-pora, nila keramba… semuanya segar dari danau pagi ini."] },
    { id: "m2", t: () => ["Pora-pora itu kecil, tapi kalau dijemur lalu digoreng, enak sekali dimakan dengan nasi hangat."] },
    { id: "m3", t: () => ["Kalau dapat ikan batak, perlakukan baik-baik, ya. Ikan itu dihormati orang sini dan sudah jarang."] },
    { id: "m4", t: () => ["Tiap ada kapal ke Muara, Ibu titipkan ikan ke Bu Sari. Harganya sama dengan pasar di sana."] },
    { id: "m5", t: () => ["Keramba di depan itu punya Ibu dan tetangga. Jaringnya sering sobek kena kayu hanyut."] },
    { id: "m6", t: () => ["Nala itu keponakan Ibu. Kalau sudah pegang teropong, dia lupa makan siang!"] },
    { id: "m7", c: () => st().clues && st().clues.pancuran, t: () => ["Pancuran Batu? Dulu Ibu mencuci sayur di sana. Airnya tidak pernah kering."] },
    { id: "m8", c: () => done(), t: () => ["Jaring keramba yang kamu tambal masih kuat sampai sekarang. Terima kasih, ya."] },
  ],
  nala: [
    { id: "n1", t: () => ["Kakak dari Muara, ya? Di sini airnya tawar, lho, nggak asin sama sekali!"] },
    { id: "n2", t: () => ["Aku sedang membuat peta kampung. Tiap jalan setapak kugambar pakai pensil warna."] },
    { id: "n3", t: () => ["Dari Bukit Pandang, kalau cerah, kita bisa lihat perahu-perahu kecil di tengah danau."] },
    { id: "n4", t: () => [`Batu ceper paling bagus ada di Sudut Tenang. Rekorku lima kali memantul!${S().adv.best.stones ? ` Rekormu ${S().adv.best.stones} kali, kan?` : ""}`] },
    { id: "n5", c: () => NW.adv.isFound("toba:pancuran"), t: () => ["Pancuran Batu airnya dingin sekali. Kata Ompung, airnya turun dari mata air di bukit."] },
    { id: "n6", c: () => st().bab >= 3, t: () => ["Pesan Ompung… aku baru mengerti sekarang. Danau itu memang harus didengarkan."] },
    { id: "n7", c: () => done(), t: () => ["Kak, nanti kalau aku ke Muara, ajak aku lihat laut, ya!"] },
  ],
};
const GREET = {
  raka: [{ id: "g1", t: () => [`Horas! ${greet()}.`] }, { id: "g2", t: () => ["Eh, kau datang lagi. Senang melihatmu di dermaga."] }, { id: "g3", t: () => [`${greet()}, kawan dari Muara!`] }, { id: "g4", t: () => ["Horas! Angin danau hari ini bersahabat."] }],
  maya: [{ id: "g1", t: () => [`${greet()}, Nak! Mampir ke lapak Ibu?`] }, { id: "g2", t: () => ["Eh, langganan dari Muara! Sini, sini."] }, { id: "g3", t: () => ["Horas, Nak. Mau lihat ikan apa hari ini?"] }],
  nala: [{ id: "g1", t: () => ["Kak! Pas sekali, aku baru mau cerita."] }, { id: "g2", t: () => [`${greet()}, Kak Penjelajah!`] }, { id: "g3", t: () => ["Ssst, Kak… aku menemukan sesuatu. Eh, bercanda, hehe."] }],
};
const roleOf = (n) => n.role;
function chat(n) {
  const opener = NW.adv.talkCount(n.id) > 0 ? NW.adv.pickLine(n.id + ":g", GREET[n.id]) : []; // kalimat pembuka bergiliran (tidak mengulang)
  const act = n.cur && n.cur.lines && n.cur.lines.length ? n.cur.lines.map((ls, i) => ({ id: `${n.id}-a-${n.cur.act}-${i}`, t: () => ls })) : [];
  return opener.concat(NW.adv.pickLine(n.id, LINES[n.id].concat(act)));
}
// pengingat langkah cerita yang sedang berjalan
function reminder() {
  const c = cur(); if (!c || c.kind !== "task") return null;
  if (c.key === "clues") { const got = Object.keys(st().clues); return `Tanda Ompung yang sudah kau periksa: ${got.length}/3${got.length ? ` (${got.map((k) => CLUES[k].name).join(", ")})` : ""}.`; }
  if (c.key === "jurung" && (st().prog.tries || 0) >= 2) return `Jurung belum mau naik? Kendurkan saat ia menyentak, gulung saat ia lelah.${N().upLvl("rod") === 0 ? " Joran Fiber Muara di toko Pak Bono juga sudah cukup kuat untuknya." : ""}`;
  return `Oh ya: ${c.goal.charAt(0).toLowerCase() + c.goal.slice(1)}.`;
}

// ---------- Dialog cerita ----------
function storyTalk(n, open) {
  const D = (lines, options, extra) => open({ name: n.name, avatar: n.avatar, role: roleOf(n), npc: n.hidden ? null : n, lines, options, noLater: true, ...extra });
  const s = st();
  if (n.id === "raka") {
    if (at(1, 0)) return D(["Horas! Selamat datang di Kampung Tepian Toba.", "Aku Raka. Tiap kapal yang bersandar di dermaga ini, aku yang menyambut.", "Danau Toba itu luas dan dalam. Di tepinya, kampung kami kecil saja, tapi setiap sudutnya punya cerita.", "Lihat-lihatlah dulu. Pasar Kecil ada di barat jalan. Bu Maya pasti senang bertemu tamu dari Muara."],
      [{ label: "👋 Horas, Pak Raka!", act: () => { advance(); } }]);
    if (at(1, 4)) return D(["Bagaimana? Sudah ketemu Bu Maya dan titik mancing di ujung dermaga?", "Bagus. Mulai hari ini kau bukan tamu lagi, tapi kawan kampung.", "Ini sedikit bekal, dan catatan kecil supaya kau ingat hari pertamamu di sini."],
      [{ label: "🙏 Terima kasih, Pak", act: () => { claim("bab1", () => { N().earn("toba:bab1", 200); NW.adv.addNote({ id: "toba:bab1", area: "toba", title: "Tamu dari Muara", text: "Pak Raka menyambutku di dermaga. Bu Maya menunjukkan ikan-ikan danau, dan titik mancingnya ada di ujung dermaga. Airnya dingin dan jernih." }); N().toast("📖 Bab 1 selesai! +🪙200 · Catatan perjalanan baru di 🧭 Buku Petualangan", "good"); }); advance(); } }]);
    if (at(3, 0)) return D(["Nala sudah cerita padaku. Kalian menemukan tanda-tanda Ompung?", "SABAR… TENANG… MEMBERI. \"Danau yang tenang memberi kepada yang sabar.\"", "Ompung Nala dulu nelayan paling sabar di kampung ini. Katanya, ikan jurung naik dari sungai ke danau, tapi hanya mau mendekat ke yang tidak terburu-buru.", "Cobalah dari ujung dermaga. Jangan paksa ikannya: kendurkan saat ia menyentak, gulung saat ia lelah. Gagal pun tidak apa, coba lagi."],
      [{ label: "🎣 Akan kucoba, Pak", act: () => advance() }]);
    if (at(3, 2)) { const c = s.prog.jurung; return D([`Ikan jurung ${c ? N().fmtW(c.w) : ""}! Kau tidak memaksanya. Kau menunggu saat yang tepat.`, "Itulah pesan dari danau. Ompung Nala pasti tersenyum melihatnya.", "Mulai hari ini, kampung ini mengenalmu sebagai Penjelajah Tepian Toba."],
      [{ label: "🏅 Terima gelar", act: () => finale(n) }]); }
  }
  if (n.id === "maya" && at(1, 2)) return D(["Wah, tamu dari Muara! Pak Raka sudah cerita kau akan datang.", "Ini Pasar Kecil Toba. Ibu jual ikan mas, pora-pora, dan nila keramba. Semuanya dari danau ini.", "Kalau mau menjual tangkapanmu, Ibu bisa titipkan ke Pasar Bu Sari di Muara lewat kapal. Harganya sama, koinnya langsung masuk.", "Kalau mau mancing, titiknya di ujung dermaga. Ikan di sini kuat-kuat, lho!"],
    [{ label: "🐟 Siap, Bu!", act: () => advance() }]);
  if (n.id === "nala") {
    if (at(2, 0)) return D(["Kak! Kakak tamu dari Muara, kan? Aku Nala!", "Ompungku dulu nelayan. Katanya, dia meninggalkan tiga tanda di kampung ini untuk orang yang mau mencarinya.", "Satu di Bukit Pandang, satu di Sudut Tenang Danau, satu lagi di Pancuran Batu dekat kebun.", "Aku sudah lama mencari, tapi belum pernah ketemu semuanya. Mau bantu? Periksa tandanya baik-baik, ya!"],
      [{ label: "🧭 Ayo cari bersama!", act: () => advance() }]);
    if (at(2, 2)) return D(["Ketemu semua? SABAR, TENANG, dan MEMBERI…", "Hmm, itu pasti pesan untuk Pak Raka. Tapi sebelum kita ke sana…", "Bou Maya, eh, Bu Maya (bibiku), jaring kerambanya sobek kena kayu hanyut. Bantu tambal, yuk? Keramba ada di tepi danau di utara pasar."],
      [{ label: "🕸️ Ayo bantu Bu Maya", act: () => advance() }]);
    if (at(2, 4)) return D(["Kata Bu Maya, tambalanmu rapi sekali! Ikan-ikannya tidak ada yang lolos.", "Ini untukmu: lencana penjelajah buatanku sendiri. Aku menjahitnya dari kain sisa.", "Sekarang bawa pesan Ompung ke Pak Raka, ya. Dia pasti tahu artinya."],
      [{ label: "🧭 Terima lencana", act: () => { claim("bab2", () => { N().earn("toba:bab2", 250); NW.adv.award({ id: "toba:lencana", icon: "🧭", name: "Sahabat Penjelajah Nala", desc: "Lencana kain jahitan Nala untuk teman yang membantu menemukan tiga tanda Ompung.", kind: "lencana" }); NW.adv.addNote({ id: "toba:bab2", area: "toba", title: "Tiga Tanda Ompung", text: "Bersama Nala, aku menemukan tiga ukiran: SABAR di Bukit Pandang, TENANG di Sudut Tenang Danau, MEMBERI di Pancuran Batu. Aku juga membantu menambal jaring keramba Bu Maya." }); N().toast("📖 Bab 2 selesai! +🪙250 · Lencana Sahabat Penjelajah", "good"); N().sfx("penghargaan"); }); advance(); } }]);
  }
  return false;
}
// ---------- Penutup cerita: animasi & penghargaan ----------
const glow = { t: -1, items: [] };
function finale(n) {
  if (!at(3, 2)) return; // hanya sekali, tepat di akhir Bab 3
  claim("bab3", () => {
    N().earn("toba:bab3", 350);
    NW.adv.award({ id: "toba:gelar", icon: "🏅", name: "Penjelajah Tepian Toba", desc: "Gelar petualangan dari Pak Raka setelah menyelesaikan cerita Rahasia Tepian Danau. Terpisah dari 8 gelar jumlah tangkapan.", kind: "gelar" });
    NW.adv.addNote({ id: "toba:bab3", area: "toba", title: "Pesan dari Danau", text: `Aku menangkap ikan jurung${st().prog.jurung ? " " + N().fmtW(st().prog.jurung.w) : ""} dari ujung dermaga tanpa terburu-buru. "Danau yang tenang memberi kepada yang sabar." Pak Raka memberiku gelar Penjelajah Tepian Toba.` });
  });
  advance();
  // lentera-lentera cahaya naik dari danau + sorotan kamera, lalu kartu penghargaan
  glow.t = 0; glow.items = []; for (let i = 0; i < 16; i++) glow.items.push({ x: 14 + Math.random() * 12, y: 4 + Math.random() * 7, d: Math.random() * 1.6, sp: 0.7 + Math.random() * 0.6, ph: Math.random() * 6 });
  W().look({ x: 19, y: 8, z: 30, zoom: 0.9, dur: 5.2, caption: "✨ Cahaya kecil naik dari permukaan danau…", done: () => awardCard() });
  N().sfx("penghargaan"); if (NW.audioDirector) NW.audioDirector.setScene("cerita"); // musik cerita sampai kartu penghargaan ditutup
}
function awardCard() {
  let w = $("awardWrap");
  if (!w) {
    w = document.createElement("div"); w.id = "awardWrap"; w.className = "net-wrap";
    w.innerHTML = `<div class="net-card award-card"><div class="award-ic">🏅</div><h3>Penjelajah Tepian Toba</h3><p>Cerita <b>Rahasia Tepian Danau</b> selesai!<br>Gelar petualangan ini tersimpan di 🧭 Buku Petualangan, terpisah dari 8 gelar tangkapan.</p><p class="muted">+🪙350 · catatan "Pesan dari Danau"</p><div class="net-row"><button class="btn ghost" id="awardBook">🧭 Buka Buku</button><button class="btn gold" id="awardOk">Terima kasih!</button></div></div>`;
    document.body.appendChild(w);
    const bye = () => W().openDialog({ name: "Pak Raka", avatar: "🧑🏽‍✈️", role: "Pemandu dermaga", npc: byId("raka").hidden ? null : byId("raka"), lines: ["Horas, Penjelajah Tepian Toba! Datanglah kapan saja. Danau ini selalu menunggumu."] });
    w.querySelector("#awardOk").addEventListener("click", () => { N().sfx("click"); w.remove(); if (NW.audioDirector) NW.audioDirector.setScene(null); bye(); });
    w.querySelector("#awardBook").addEventListener("click", () => { N().sfx("click"); w.remove(); if (NW.audioDirector) NW.audioDirector.setScene(null); N().openPanel("adventure"); });
  }
}

// ---------- Bicara dengan NPC Toba ----------
function talk(n, api) {
  const open = api.openDialog;
  if (awaits(n.id) && storyTalk(n, open) !== false) { NW.adv.pickLine(n.id + ":g", GREET[n.id]); return; }
  let lines = chat(n).slice();
  const wl = NW.weather && NW.weather.chatLine(n); if (wl) lines.unshift(wl); // komentar hujan/kabut (di bawah cerita & misi)
  const rem = reminder(); if (rem && (n.id === "raka" || (n.id === "nala" && st().bab === 2))) lines.push(rem);
  const opts = [];
  if (n.id === "maya" && at(2, 3)) { // Bab 2: Bu Maya sendiri meminta bantuan menambal jaring
    lines = ["Nala sudah cerita? Jaring keramba Ibu sobek kena kayu hanyut. Mau bantu tambal, Nak?"];
    opts.push({ label: "🧵 Tambal jaring keramba", act: () => netGame() });
  }
  if (n.id === "maya") opts.push(...mayaOptions(n, open));
  if (n.id === "nala" && n.cur && n.cur.act === "stones") opts.push({ label: "🪨 Ajari aku lempar batu", act: () => throwStones(api, true) });
  if (n.id === "raka") opts.push({ label: "🗺️ Tempat menarik di sini?", act: () => open({ name: n.name, avatar: n.avatar, role: roleOf(n), npc: n, lines: tips() }) });
  open({ name: n.name, avatar: n.avatar, role: roleOf(n), npc: n, lines, options: opts });
}
function tips() { // Pak Raka menunjukkan tempat yang BELUM ditemukan (dan selalu jalan pulang)
  const L = [];
  if (!NW.adv.isFound("toba:pasar")) L.push("Pasar Kecil ada di barat jalan kampung. Bu Maya berjualan dari pagi sampai siang.");
  if (!NW.adv.isFound("toba:bukit")) L.push("Bukit Pandang di ujung barat. Naik lewat jalan setapak berundak, dari puncaknya seluruh danau kelihatan.");
  if (!NW.adv.isFound("toba:sudut")) L.push("Sudut Tenang Danau di ujung timur. Ada bangku menghadap air, tempat terbaik menunggu senja.");
  if (!NW.adv.isFound("toba:pancuran")) L.push("Di selatan, lewat kebun warga, ada Pancuran Batu. Airnya dari mata air bukit.");
  if (!L.length) L.push("Kau sudah menemukan semua sudut kampung ini! Nala saja kalah cepat, hahaha.");
  L.push("Kalau mau pulang ke Muara, naik saja kapalmu di sisi timur dermaga.");
  return L;
}
function fishInfo() { // info ikan setempat dari data FISH lama (tidak ada spesies baru)
  const R = (r) => RARITY[r].label;
  return FISH.filter((f) => f.loc === "toba").map((f) => `${dex(f.id) ? "✔" : "·"} ${f.name} — ${R(f.rarity)}, ${N().fmtW(f.wMin)}–${N().fmtW(f.wMax)}${f.night === true ? ", malam" : f.night === false ? ", siang" : ""}. ${f.desc}`);
}
function mayaOptions(n, open) {
  return [
    { label: "🐟 Ikan apa saja di danau?", act: () => open({ name: n.name, avatar: n.avatar, role: roleOf(n), npc: n, lines: ["Ini ikan-ikan danau yang biasa Ibu lihat (✔ = sudah pernah kau tangkap):"].concat(fishInfo()).concat(["Ikan dewa itu… Ibu sendiri belum pernah lihat. Katanya muncul saat matahari tinggi."]) }) },
    { label: "📦 Titip jual ke Bu Sari", act: () => { N().openPanel("market"); } },
  ];
}

// ---------- Interaksi tempat ----------
const isNear = (id, r = 3.2) => { const n = byId(id); return n && !n.hidden && Math.hypot(n.x - W().player.x, n.y - W().player.y) < r ? n : null; };
function examineClue(key, open, flavor) {
  const c = CLUES[key];
  if (st().clues[key]) return open({ name: c.name, avatar: "🔍", lines: [`Ukiran "${c.word}" masih terlihat jelas. Sudah kau catat untuk Nala.`] });
  st().clues[key] = Date.now(); N().save(); N().tone(660, 0.12, "triangle", 0.08); N().tone(880, 0.2, "triangle", 0.08, null, 0.12);
  const n = Object.keys(st().clues).length;
  open({ name: c.name, avatar: "🔍", lines: flavor.concat([`Tertulis satu kata: "${c.word}". (${n}/3 tanda Ompung)`]) });
  NW.adv.showDiscover(`🔍 Tanda Ompung: "${c.word}" (${n}/3)`);
  checkTasks();
}
function interact(t, api) {
  const open = api.openDialog, s = st();
  if (t.id === "boat") return open({ name: "Kapalmu", avatar: "⛵", lines: [`${UPGRADES.boat.levels[N().upLvl("boat")]} bersandar rapi di sisi timur dermaga.`, "Mau berlayar ke mana?"],
    options: [{ label: "⛵ Pulang ke Muara Kampung", act: () => NW.adv.travelTo("muara") }, { label: "🗺️ Buka Peta", act: () => N().openPanel("map") }] });
  if (t.id === "tpasar") {
    const n = byId("maya"), open2 = !n.hidden && n.cur && n.cur.act === "tstall" && n.arrived;
    if (open2) return talk(n, api);
    return open({ name: "Lapak Bu Maya", avatar: "📦", lines: ["Lapak sedang tutup. Ada papan kecil: \"Titipan ikan untuk Pasar Bu Sari di Muara — tinggalkan di kotak.\"", `Bu Maya sedang ${n.hidden ? "di rumah" : n.cur.label}. Lapak buka pukul 06:00–14:00.`], options: [{ label: "📦 Titip jual ke Bu Sari", act: () => N().openPanel("market") }] });
  }
  if (t.id === "info") return open({ name: "Papan Informasi Tepian Toba", avatar: "📜", lines: [
    "Danau Toba adalah danau vulkanik terbesar di dunia. Danau ini terbentuk dari letusan gunung api raksasa sekitar 74.000 tahun lalu.",
    "Di tengahnya terdapat Pulau Samosir. Kedalaman danau mencapai sekitar 500 meter, airnya tawar dan sejuk.",
    "Mari jaga danau bersama: jangan membuang sampah ke air, dan lepaskan kembali ikan yang masih terlalu kecil.",
    "Tempat di kampung: Pasar Kecil (barat), Bukit Pandang (ujung barat), Sudut Tenang Danau (ujung timur), Pondok Kumpul & Pancuran Batu (selatan)."] });
  if (t.id === "keramba") {
    if (at(2, 3)) return open({ name: "Keramba Bu Maya", avatar: "🕸️", lines: ["Jaring keramba terangkat sedikit. Ada beberapa bagian yang sobek kena kayu hanyut.", "Perhatikan baik-baik, lalu tambal bagian yang bolong supaya ikannya tidak lolos."], options: [{ label: "🧵 Tambal jaring", act: () => netGame() }] });
    const m = isNear("maya", 3);
    return open({ name: "Keramba Jaring Apung", avatar: "🕸️", npc: m, lines: [s.net ? "Jaring yang kamu tambal masih rapi dan kuat." : "Keramba jaring apung milik warga. Ikan nila dan ikan mas dibesarkan di sini.", m ? "Bu Maya: \"Ikannya lahap sekali hari ini. Lihat, airnya sampai beriak!\"" : "Bayangan ikan-ikan kecil berputar pelan di dalam jaring."] });
  }
  if (t.id === "scope") return lookout(api);
  if (t.id === "markstone") {
    if (at(2, 1)) return examineClue("bukit", open, ["Kamu menyibak lumut di batu besar itu. Ada ukiran kecil berbentuk anak panah yang menunjuk ke danau."]);
    return open({ name: "Batu Berlumut", avatar: "🪨", lines: [s.clues.bukit ? "Ukiran \"SABAR\" di batu ini menghadap ke danau." : "Batu besar berlumut di puncak bukit. Sepertinya ada goresan kecil di sisinya, tapi tertutup lumut."] });
  }
  if (t.id === "post") {
    if (at(2, 1)) return examineClue("sudut", open, ["Tiang tambat tua itu sudah licin dimakan air. Di bawah gelang talinya ada ukiran kecil."]);
    return open({ name: "Tiang Tambat Tua", avatar: "🪵", lines: [s.clues.sudut ? "Ukiran \"TENANG\" di tiang tua ini hampir tertutup gelang tali." : "Tiang kayu tua bekas menambat perahu. Kayunya keras sekali, entah sudah berapa puluh tahun di sini."] });
  }
  if (t.id === "spring") {
    const opts = [{ label: "💧 Basuh tangan", act: () => { splash(M.POS.spring.x + 0.2, M.POS.spring.y - 0.1); api.caption("💧 Airnya dingin sekali, segar!", 2.2); N().tone(880, 0.08, "sine", 0.05); N().tone(660, 0.12, "sine", 0.05, null, 0.06); } }];
    if (at(2, 1) && !s.clues.pancuran) opts.unshift({ label: "🔍 Periksa batu pancuran", act: () => examineClue("pancuran", open, ["Di balik pipa bambu, batunya sedikit menjorok. Kamu membersihkan lumutnya pelan-pelan."]) });
    return open({ name: "Pancuran Batu", avatar: "💧", lines: ["Air jernih mengalir dari pipa bambu ke kolam batu kecil. Suaranya menenangkan.", s.clues.pancuran ? "Ukiran \"MEMBERI\" terlihat di batu di atas pancuran." : "Batu tempat pancuran itu tampak tua, berlumut di bagian atasnya."], options: opts });
  }
  if (t.id === "solu") {
    const r = isNear("raka", 3.4);
    return open({ name: "Solu", avatar: "🛶", npc: r, lines: ["Perahu kayu ramping bersandar di pasir. Lambungnya panjang dan sempit, dayungnya diletakkan melintang.", r ? "Pak Raka: \"Perahu seperti ini namanya solu. Ringan, gesit, dan tenang di air danau.\"" : "Tali tambatnya baru, simpulnya rapi. Pasti ada yang rutin memeriksanya."] });
  }
  if (t.id === "pondok") {
    const who = npcs.filter((n) => !n.hidden && n.arrived && Math.hypot(n.x - 23, n.y - 26.5) < 2.4);
    return open({ name: "Pondok Kumpul", avatar: "🛖", lines: ["Balai kayu terbuka tempat warga minum kopi dan bercerita. Lentera kecil tergantung di tengahnya.", who.length ? `${who.map((n) => n.name).join(" dan ")} sedang di sini.` : "Sedang sepi. Bangku di depan pondok enak untuk duduk sebentar."] });
  }
  if (t.seat) return sit(t, api);
  if (t.id === "stones") return throwStones(api, false);
  if (t.owner) {
    const n = byId(t.owner), b = M.B[t.id];
    if (n.hidden && awaits(n.id)) return open({ name: b.name, avatar: "🏠", lines: ["Tok tok tok…", `Pintu terbuka. ${n.name} melongok keluar. "Oh, kau! Sini, sini."`], options: [{ label: "📖 Lanjut cerita", act: () => storyTalk(n, open) }] });
    if (n.hidden) return open({ name: b.name, avatar: "🏠", lines: n.knock });
    return open({ name: b.name, avatar: "🏠", lines: ["Tok tok tok…", `Tidak ada yang menjawab. ${n.name} sedang ${n.cur.label || "di luar"}.`] });
  }
}

// ---------- Duduk, memandang, melempar batu ----------
const THOUGHTS = {
  pagi: ["Kabut tipis perlahan terangkat dari permukaan danau.", "Ada perahu nelayan yang pelan-pelan menepi. Pagi di sini sejuk sekali."],
  siang: ["Airnya biru jernih. Sesekali ada ikan kecil melompat.", "Angin danau berembus pelan, membuat daun pinus berbisik."],
  sore: ["Langit mulai jingga. Bayangan bukit memanjang di atas air.", "Burung-burung terbang pulang melintasi danau."],
  malam: ["Lampu rumah-rumah memantul di air. Malamnya tenang sekali.", "Bintang-bintang terlihat jelas dari tepi danau."],
};
const tod = () => { const h = S().hour; return h >= 5 && h < 10 ? "pagi" : h < 15 ? "siang" : h < 18.5 ? "sore" : "malam"; };
function sit(t, api) {
  let said = false;
  api.sitAt(t.seat, { tick: (secs) => { if (!said && secs > 1.6) { said = true; const pool = THOUGHTS[tod()]; api.caption("💭 " + pool[Math.floor(Math.random() * pool.length)], 3.6); S().adv.best.sits = (S().adv.best.sits || 0) + 1; } } });
}
function lookout(api) {
  const cap = { pagi: "🔭 Kabut tipis menyelimuti danau. Di kejauhan, bukit-bukit hijau mulai disinari matahari.", siang: "🔭 Air danau biru membentang sampai ke kaki bukit di seberang.", sore: "🔭 Langit jingga memantul di permukaan danau. Perahu-perahu pulang ke dermaga.", malam: "🔭 Lampu-lampu rumah berkelip di tepi danau. Malam di Toba terasa sejuk." }[tod()];
  S().adv.best.views = (S().adv.best.views || 0) + 1; N().save();
  api.player.dir = 7; N().sfx("pemandangan");
  api.look({ x: 22, y: -2, z: 40, zoom: 0.78, dur: 5.6, caption: cap });
}
const stones = []; // animasi batu memantul (pemain & Nala)
function throwStones(api, lesson) {
  const p = api.player; p.dir = 7;
  const best = S().adv.best.stones || 0, k = Math.random();
  const hops = clamp(Math.round(1 + k * 4 + (Math.random() < 0.18 ? 1 : 0) + (lesson ? 1 : 0)), 1, 6);
  launchStone(p.x + 0.3, p.y - 0.6, hops, true);
  setTimeout(() => {
    const nb = hops > best; if (nb) { S().adv.best.stones = hops; N().save(); }
    const nala = isNear("nala", 4);
    api.caption(`🪨 Batunya memantul ${hops}× ${nb ? "· rekor baru!" : `· rekormu ${Math.max(best, hops)}×`}${nala ? (hops >= 5 ? " — Nala: \"Wah, hebat!\"" : " — Nala: \"Miringkan sedikit lagi, Kak!\"") : ""}`, 3);
  }, 600 + hops * 260);
}
function launchStone(x, y, hops, mine) { if (stones.length > 4) stones.shift(); stones.push({ x, y, hops, t: 0, mine }); N().sfx && mine && N().tone(500, 0.05, "sine", 0.04); }
function stepStones(dt) { for (const s of stones) s.t += dt; for (let i = stones.length - 1; i >= 0; i--) if (stones[i].t > 0.6 + stones[i].hops * 0.3 + 1) stones.splice(i, 1); }
function drawStones(c) {
  for (const s of stones) {
    const dur = s.hops * 0.3, k = Math.min(1, s.t / (0.6 + dur));
    const dist = 1.2 + s.hops * 0.9, x = s.x + dist * k * 0.75, y = s.y - dist * k;
    const seg = Math.floor(k * (s.hops + 1)), u = k * (s.hops + 1) - seg, hgt = (seg === 0 ? 22 : 10 / (seg)) * Math.sin(u * Math.PI);
    if (k < 1) { const p = P(x, y, hgt); c.fillStyle = "#9aa3a8"; c.beginPath(); c.ellipse(p.x, p.y, 2.6, 1.6, 0, 0, 7); c.fill(); }
    for (let i = 1; i <= Math.min(seg, s.hops); i++) { // riak di tiap pantulan
      const kk = i / (s.hops + 1), age = s.t - kk * (0.6 + dur); if (age < 0 || age > 1.2) continue;
      const q = P(s.x + dist * kk * 0.75, s.y - dist * kk); c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - age / 1.2)})`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(q.x, q.y, 3 + age * 12, (3 + age * 12) * 0.4, 0, 0, 7); c.stroke();
    }
  }
}
const drops = [];
function splash(x, y) { for (let i = 0; i < 8; i++) drops.push({ x, y, a: Math.random() * 6.28, v: 0.4 + Math.random() * 0.6, t: 0 }); while (drops.length > 16) drops.shift(); }

// ---------- Aktivitas khusus NPC Toba ----------
const NAV = M.NAV;
const acts = {
  tstall(n, dt, a, k) { // Bu Maya mondar-mandir di balik meja pasar
    n.waitT -= dt; if (n.waitT > 0) { n.dir = 2; return; }
    const spots = [[NAV.STALL[0], 18.3], [NAV.STALL[0] - 1.6, 18.35], [NAV.STALL[0] - 0.8, 18.25]];
    const s = spots[n.alt % 3];
    if (k.walkTo(n, s[0], s[1], dt)) { n.alt++; n.waitT = rand(2.5, 5); n.dir = 2; }
  },
  feed(n, dt) { // menabur pakan ke keramba
    n.waitT -= dt; n.dir = 7;
    if (n.waitT <= 0) { n.waitT = rand(2.5, 4.5); feedFx.push({ x: 12.6 + Math.random() * 1.6, y: 9.4 + Math.random() * 1.2, t: 0 }); while (feedFx.length > 6) feedFx.shift(); }
  },
  stones(n, dt) { // Nala melempar batu ceper
    n.waitT -= dt; n.dir = 7;
    if (n.waitT <= 0) { n.waitT = rand(6, 10); if (Math.hypot(W().player.x - n.x, W().player.y - n.y) < 12) launchStone(n.x + 0.3, n.y - 0.6, 2 + Math.floor(Math.random() * 3), false); }
  },
};
const feedFx = [];

// ---------- Ambience Toba ----------
const bugs = []; // capung (siang) / kunang-kunang (malam), maks. 6
function update(dt, api) {
  stepStones(dt);
  for (const d of drops) d.t += dt; for (let i = drops.length - 1; i >= 0; i--) if (drops[i].t > 0.7) drops.splice(i, 1);
  for (const f of feedFx) f.t += dt; for (let i = feedFx.length - 1; i >= 0; i--) if (feedFx[i].t > 1.6) feedFx.splice(i, 1);
  if (glow.t >= 0) { glow.t += dt; if (glow.t > 7) glow.t = -1; }
  const night = N().darkness() > 0.35;
  if (bugs.length < 6 && Math.random() < dt * 2) {
    const spots = night ? [[M.POS.spring.x, M.POS.spring.y], [23, 26.5], [31.5, 15.5]] : [[31.5, 13.8], [16.8, 12.9], [10, 12.2]];
    const [x, y] = spots[Math.floor(Math.random() * spots.length)];
    bugs.push({ x: x + rand(-1, 1), y: y + rand(-1, 1), ph: rand(0, 6), life: rand(5, 9), t: 0, night });
  }
  for (const b of bugs) { b.t += dt; b.x += Math.sin(b.t * 1.3 + b.ph) * dt * 0.5; b.y += Math.cos(b.t * 1.1 + b.ph) * dt * 0.5; }
  for (let i = bugs.length - 1; i >= 0; i--) if (bugs[i].t > bugs[i].life || bugs[i].night !== night) bugs.splice(i, 1);
  // tugas cerita berbasis tempat
  const c = cur();
  if (c && c.kind === "task" && c.key === "spot") { const sp = M.points[0]; if (Math.hypot(api.player.x - sp.x, api.player.y - sp.y) < 1.6) advance(); }
}
function drawOver(c, t, dk) {
  drawStones(c);
  for (const f of feedFx) { const p = P(f.x, f.y), a = 1 - f.t / 1.6; c.strokeStyle = `rgba(255,255,255,${0.6 * a})`; c.lineWidth = 1; c.beginPath(); c.ellipse(p.x, p.y, 3 + f.t * 8, (3 + f.t * 8) * 0.4, 0, 0, 7); c.stroke(); c.fillStyle = `rgba(230,210,150,${a})`; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(p.x + (i - 1) * 4, p.y - 2, 1, 0, 7); c.fill(); } }
  for (const d of drops) { const k = d.t / 0.7, p = P(d.x + Math.cos(d.a) * d.v * k * 0.5, d.y + Math.sin(d.a) * d.v * k * 0.5, NW.LIFT + 8 + Math.sin(k * Math.PI) * 10); c.fillStyle = `rgba(190,230,245,${1 - k})`; c.beginPath(); c.arc(p.x, p.y, 1.6, 0, 7); c.fill(); }
  for (const b of bugs) {
    const a = Math.min(1, b.t, b.life - b.t), p = P(b.x, b.y, NW.LIFT + 14 + Math.sin(t * 3 + b.ph) * 5);
    if (b.night) { c.fillStyle = `rgba(255,240,150,${0.85 * a * (0.5 + 0.5 * Math.sin(t * 5 + b.ph))})`; c.beginPath(); c.arc(p.x, p.y, 1.8, 0, 7); c.fill(); }
    else { c.globalAlpha = a; c.strokeStyle = "#2f6b8f"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(p.x - 4, p.y); c.lineTo(p.x + 4, p.y); c.stroke(); const f = Math.abs(Math.sin(t * 30 + b.ph)) * 3; c.strokeStyle = "rgba(220,240,255,.8)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(p.x - 1, p.y); c.lineTo(p.x - 3, p.y - f); c.moveTo(p.x + 1, p.y); c.lineTo(p.x + 3, p.y - f); c.stroke(); c.globalAlpha = 1; }
  }
  if (glow.t >= 0) { // lentera cahaya naik dari danau (penutup cerita)
    for (const g of glow.items) {
      const k = clamp((glow.t - g.d) / 5, 0, 1); if (k <= 0) continue;
      const p = P(g.x + Math.sin(glow.t + g.ph) * 0.3, g.y, 6 + k * 160 * g.sp), a = Math.min(1, k * 4) * (1 - Math.max(0, k - 0.75) * 4);
      const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10); gr.addColorStop(0, `rgba(255,236,170,${a})`); gr.addColorStop(1, "rgba(255,200,120,0)");
      c.fillStyle = gr; c.beginPath(); c.arc(p.x, p.y, 10, 0, 7); c.fill();
      c.fillStyle = `rgba(255,250,220,${a})`; c.beginPath(); c.arc(p.x, p.y, 2.2, 0, 7); c.fill();
    }
  }
}

// ---------- Aktivitas Bab 2: menambal jaring keramba (sentuh & amati) ----------
// Jaring 6×5 kotak, 4 kotak sobek di posisi acak. Ketuk kotak yang sobek untuk menambal.
// Tidak ada batas waktu dan tidak ada gagal; salah ketuk hanya diberi tahu, dan setelah 3× salah ada petunjuk.
function netGame() {
  if ($("netWrap")) return;
  const COLS = 6, ROWS = 5, HOLES = 4;
  const holes = new Set(); while (holes.size < HOLES) holes.add(Math.floor(Math.random() * COLS * ROWS));
  const fixed = new Set(), fish = []; for (let i = 0; i < 7; i++) fish.push({ x: Math.random(), y: Math.random(), a: Math.random() * 6.28, v: 0.08 + Math.random() * 0.06 });
  let wrong = 0, hint = -1, shake = { i: -1, t: 0 }, stitch = { i: -1, t: 0 }, raf = 0, last = performance.now(), doneT = -1;
  const w = document.createElement("div"); w.id = "netWrap"; w.className = "net-wrap";
  w.innerHTML = `<div class="net-card"><h3>🕸️ Tambal Jaring Keramba</h3><p>Amati jaringnya. Ketuk kotak yang <b>sobek</b> untuk menambalnya.</p><canvas id="netCv"></canvas>
    <div class="net-row"><b id="netCount">Tertambal 0/${HOLES}</b><span class="muted" id="netMsg">Tanpa batas waktu</span><button class="btn ghost small" id="netClose">Nanti saja</button></div></div>`;
  document.body.appendChild(w);
  const cv = w.querySelector("#netCv"), ctx = cv.getContext("2d");
  cv.dataset.cols = COLS; cv.dataset.rows = ROWS; cv.dataset.holes = [...holes].join(","); // untuk uji otomatis (ketuk sungguhan)
  const close = () => { cancelAnimationFrame(raf); w.remove(); };
  w.querySelector("#netClose").addEventListener("click", () => { N().sfx("click"); close(); });
  const geo = () => { const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); } return { W: r.width, H: r.height, dpr, cw: r.width / COLS, ch: r.height / ROWS }; };
  cv.addEventListener("pointerdown", (e) => {
    if (doneT >= 0) return;
    const g = geo(), r = cv.getBoundingClientRect(), cx = Math.floor((e.clientX - r.left) / g.cw), cy = Math.floor((e.clientY - r.top) / g.ch);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
    const i = cy * COLS + cx;
    if (holes.has(i) && !fixed.has(i)) {
      fixed.add(i); stitch = { i, t: 0 }; hint = -1; N().tone(700 + fixed.size * 80, 0.1, "triangle", 0.07);
      w.querySelector("#netCount").textContent = `Tertambal ${fixed.size}/${HOLES}`;
      w.querySelector("#netMsg").textContent = fixed.size < HOLES ? ["Rapi!", "Simpulnya kuat.", "Satu lagi!"][fixed.size - 1] || "Bagus!" : "Selesai!";
      if (fixed.size === HOLES) doneT = 0;
    } else if (!fixed.has(i)) {
      wrong++; shake = { i, t: 0 }; N().tone(220, 0.08, "sine", 0.05);
      w.querySelector("#netMsg").textContent = "Bagian itu masih utuh. Lihat lagi benangnya.";
      if (wrong >= 3 && hint < 0) { hint = [...holes].find((h) => !fixed.has(h)); w.querySelector("#netMsg").textContent = "Petunjuk: lihat kotak yang berkedip."; }
    }
  });
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const g = geo(); ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    const gr = ctx.createLinearGradient(0, 0, 0, g.H); gr.addColorStop(0, "#3a8ea6"); gr.addColorStop(1, "#1f5f74"); ctx.fillStyle = gr; ctx.fillRect(0, 0, g.W, g.H);
    for (const f of fish) { // bayangan ikan di dalam keramba
      f.a += (Math.random() - 0.5) * dt * 2; f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt;
      if (f.x < 0.05 || f.x > 0.95) f.a = Math.PI - f.a; if (f.y < 0.05 || f.y > 0.95) f.a = -f.a; f.x = clamp(f.x, 0.05, 0.95); f.y = clamp(f.y, 0.05, 0.95);
      ctx.save(); ctx.translate(f.x * g.W, f.y * g.H); ctx.rotate(f.a); ctx.fillStyle = "rgba(10,40,50,.35)"; ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-20, -5); ctx.lineTo(-20, 5); ctx.fill(); ctx.restore();
    }
    if (shake.i >= 0) shake.t += dt; if (stitch.i >= 0) stitch.t += dt; if (doneT >= 0) doneT += dt;
    for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
      const i = cy * COLS + cx, x0 = cx * g.cw, y0 = cy * g.ch, sh = shake.i === i && shake.t < 0.35 ? Math.sin(shake.t * 60) * 3 : 0;
      const torn = holes.has(i) && !fixed.has(i);
      ctx.strokeStyle = "rgba(235,245,240,.85)"; ctx.lineWidth = 2;
      // sisi kotak; kotak sobek: dua sisi putus dengan ujung benang terurai (diamati, tidak mencolok)
      const seg = (ax, ay, bx, by, broken) => {
        if (!broken) { ctx.beginPath(); ctx.moveTo(ax + sh, ay); ctx.lineTo(bx + sh, by); ctx.stroke(); return; }
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        ctx.beginPath(); ctx.moveTo(ax + sh, ay); ctx.lineTo(ax + (mx - ax) * 0.55 + sh, ay + (my - ay) * 0.55 + 3); ctx.moveTo(bx + sh, by); ctx.lineTo(bx + (mx - bx) * 0.55 + sh, by + (my - by) * 0.55 - 2); ctx.stroke();
      };
      seg(x0, y0, x0 + g.cw, y0, torn && (i % 2 === 0)); seg(x0, y0 + g.ch, x0 + g.cw, y0 + g.ch, false);
      seg(x0, y0, x0, y0 + g.ch, false); seg(x0 + g.cw, y0, x0 + g.cw, y0 + g.ch, torn);
      if (torn && i % 2 === 1) seg(x0, y0 + g.ch * 0.5, x0 + g.cw * 0.5, y0 + g.ch * 0.5, true);
      if (fixed.has(i)) { // tambalan: jahitan zig-zag kuning
        const k = stitch.i === i ? clamp(stitch.t / 0.4, 0, 1) : 1;
        ctx.strokeStyle = "#f0c75a"; ctx.lineWidth = 2.2; ctx.beginPath();
        const n = 6; for (let j = 0; j <= n * k; j++) { const px = x0 + g.cw * (0.15 + 0.7 * j / n), py = y0 + g.ch * (j % 2 ? 0.35 : 0.65); if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke();
      }
      if (hint === i) { ctx.fillStyle = `rgba(255,240,176,${0.25 + 0.2 * Math.sin(now / 150)})`; ctx.fillRect(x0 + 2, y0 + 2, g.cw - 4, g.ch - 4); }
    }
    ctx.strokeStyle = "#8a6a45"; ctx.lineWidth = 6; ctx.strokeRect(3, 3, g.W - 6, g.H - 6);
    if (doneT >= 0) {
      ctx.fillStyle = `rgba(255,249,236,${Math.min(0.85, doneT * 1.5)})`; ctx.fillRect(0, g.H * 0.36, g.W, g.H * 0.28);
      ctx.fillStyle = "#173f50"; ctx.font = "800 18px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("Jaring keramba rapi lagi! 🎉", g.W / 2, g.H / 2);
      if (doneT > 1.3) { close(); netDone(); return; }
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}
function netDone() {
  if (!at(2, 3)) return;
  st().net = Date.now(); N().save();
  N().tone(784, 0.12, "triangle", 0.1); N().tone(1047, 0.2, "triangle", 0.1, null, 0.12);
  advance();
  const m = isNear("maya", 6);
  W().openDialog({ name: "Bu Maya", avatar: "👩🏽", role: "Pedagang tepian danau", npc: m, lines: ["Wah, rapi sekali tambalannya! Ikan-ikan Ibu aman sekarang.", "Terima kasih, Nak. Nala pasti sudah menunggu ceritamu."] });
}

// ---------- Penanda ❗ & petunjuk ----------
function markerFor(n) { return awaits(n.id); }
function placeMarkers() {
  const L = [], c = cur(); if (!c) return L;
  if (c.kind === "talk") { const n = byId(c.who); if (n.hidden) { const pt = M.points.find((p) => p.owner === n.id); L.push({ x: pt.x - 0.3, y: pt.y - 0.6, z: 70 }); } }
  if (c.key === "visit" && !NW.adv.isFound("toba:pasar")) L.push({ x: 12.4, y: 18.4, z: 70 });
  if (c.key === "spot") L.push({ x: M.SPOT.x, y: M.SPOT.y + 0.3, z: 40 });
  if (c.key === "clues") { const s = st().clues; if (!s.bukit) L.push({ x: M.POS.markstone.x, y: M.POS.markstone.y, z: 40 }); if (!s.sudut) L.push({ x: M.POS.post.x, y: M.POS.post.y, z: 46 }); if (!s.pancuran) L.push({ x: M.POS.spring.x - 0.2, y: M.POS.spring.y, z: 46 }); }
  if (c.key === "net") L.push({ x: M.POS.keramba.x, y: M.POS.keramba.y, z: 34 });
  return L;
}
function hint() {
  const c = cur(); if (!c) return "";
  if (c.kind === "talk") { const n = byId(c.who); return `📖 ${c.goal}${n.hidden ? " (ketuk pintu rumahnya)" : ""} ❗`; }
  if (c.key === "clues") return `📖 Tanda Ompung ${Object.keys(st().clues).length}/3 — cari ❗ di Bukit Pandang, Sudut Tenang, Pancuran Batu`;
  return `📖 ${c.goal}`;
}

// ---------- Tantangan Bab 3: ikan jurung (mekanik mancing asli) ----------
// Muncul ±55% per gigitan saat tantangan aktif di Danau Toba. Joran 1 (8 kg) sudah cukup.
function challengeFish(perfect, locId) {
  if (locId !== "toba" || !at(3, 1) || Math.random() > 0.55) return null;
  return { fish: N().FISH_BY_ID.jurung, w: +(2.4 + Math.random() * 0.5).toFixed(2), wr: 0.3, quest: "toba", questName: "🏆 Tantangan Pak Raka: Ikan Jurung!" };
}

// ---------- Data cerita (berversi lewat NW.adv) ----------
NW.adv.registerStory("toba", {
  key: "toba",
  defaults: () => ({ v: 1, bab: 1, step: 0, prog: {}, clues: {}, net: 0, claimed: {}, doneAt: {} }),
  challengeFish,
  status() {
    const c = cur();
    return { title: "Rahasia Tepian Danau", done: done(), now: c ? `Bab ${st().bab}: ${c.goal}` : "", chapters: [1, 2, 3].map((i) => ({ name: `Bab ${i} — ${CH[i].name}`, done: st().bab > i, cur: st().bab === i })) };
  },
});
function hook() {
  N().on("fight", (r) => {
    if (r.quest !== "toba" || !at(3, 1)) return;
    if (r.result === "caught") { st().prog.jurung = { w: r.w, at: Date.now() }; N().save(); N().toast("🏆 Ikan jurung didaratkan! Temui Pak Raka ❗", "good"); advance(); }
    else {
      const p = st().prog; p.tries = (p.tries || 0) + 1; N().save();
      N().toast(p.tries >= 3 && N().upLvl("rod") === 0 ? "Ikan jurung lepas lagi. Kata Pak Raka: joran Fiber Muara di toko Pak Bono sudah cukup kuat untuknya 🎣" : "Ikan jurung lepas. Tidak apa-apa — lempar lagi dengan sabar 🎣");
    }
  });
  N().on("cast", () => { if (N().S.loc === area.locIndex && at(1, 3)) advance(); }); // melempar dari ujung dermaga = titik mancing ditemukan
}

// ---------- Pendaftaran area ----------
const area = NW.areas.register({
  id: "toba", name: "Kampung Tepian Toba", loc: "toba", banner: "🏞️ Kampung Tepian Toba",
  map: M, idleLook: true,
  spawns: { start: M.START, boat: { x: 19.0, y: 10.9, dir: 3 } },
  theme: { deep: "#2b7893", clearBg: true, waterColor: D.waterColor, waterOk: D.waterOk, landTile: D.landTile, kebun: D.kebun, bookArt: D.bookArt, sparkle: 0.28, jumpCols: ["#d79a2e", "#8d8796", "#b8c4c2", "#7a8b55"] },
  firstVisitNote: { id: "toba:tiba", area: "toba", title: "Tiba di Tepian Toba", text: "Kapalku bersandar di dermaga kayu. Airnya biru dan dingin, bukit-bukit pinus mengelilingi danau, dan udaranya jauh lebih sejuk daripada Muara." },
  discoveries: [
    { id: "toba:dermaga", name: "Dermaga Tepian Toba", x: 18.9, y: 10.6, r: 3.4, desc: "Dermaga kayu tempat kapal dari Muara bersandar." },
    { id: "toba:pasar", name: "Pasar Kecil Toba", x: 12.4, y: 20.4, r: 2.0, desc: "Lapak Bu Maya: ikan danau dan hasil kebun." },
    { id: "toba:bukit", name: "Bukit Pandang", x: M.KNOLL.x, y: M.KNOLL.y, r: 1.6, desc: "Puncak kecil dengan teropong, menghadap seluruh danau." },
    { id: "toba:sudut", name: "Sudut Tenang Danau", x: 31.6, y: 15.2, r: 1.9, desc: "Bangku menghadap air, tempat terbaik menunggu senja." },
    { id: "toba:pancuran", name: "Pancuran Batu", x: 9.0, y: 31.6, r: 1.9, desc: "Mata air jernih di balik kebun warga." },
  ],
  npcs, acts,
  hooks: {
    interact, update, drawOver, markerFor, placeMarkers, hint,
    npcTalkable: (n) => !(n.cur && n.cur.act === "tstall" && n.arrived), // Bu Maya di balik meja: lewat 🏪 Pasar (seperti Bu Sari)
    drawBack: D.drawBack, drawSky: D.drawSky,
    fullMsg: "Coolbox-mu penuh. Titipkan ikan ke Pasar Bu Sari lewat Bu Maya di Pasar Kecil, atau pulang ke Muara untuk menjual.",
    onDiscover: () => checkTasks(),
    onEnter: (at2) => { if (at2 === "dock") checkTasks(); },
  },
});
npcs.forEach((n) => { n.area = "toba"; n.talk = talk; });
NW.toba = { CH, CLUES, npcs, hook, get state() { return st(); }, advance, checkTasks, netGame, awaits, storyTalk, finale, throwStones, area };
})();
