// =========================================================
//  NUSA ISLAND — Bumbu 2.4: area "selat" — PELABUHAN SELAT SUNDA
//  NPC orisinal: Pak Hasan (nelayan senior), Bu Ratna (pedagang ikan),
//  Arif (pemuda pelabuhan). Cerita 3 bagian "Jejak Arus Selat".
//  Lokasi mancing memakai ULANG data LOCATIONS "selat" (tidak diduplikasi).
//  Progres pribadi pemain di S.adv.selat (berversi lewat NW.adv).
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa, S = () => N().S, W = () => NW.world;
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const M = NW.SELAT_MAP, P = NW.P, { T, hash2, LIFT, mix, shade, poly } = NW;

// ---------- Tile daratan pesisir (dipakai Selat & laut) ----------
// Sama dengan gaya Muara, tetapi jarak ke laut dihitung dari fungsi area (bukan bentuk pulau Muara).
const CC = { grass: "#86c064", grassDark: "#6aa64e", sand: "#efd8a2", sandSide: "#c8a36a", forest: "#5c8f4a", path: "#dcbd8a", pathEdge: "#c7a370" };
function coastTile(seaDist) {
  return function landTile(g, x, y, t) {
    const tileAt = NW.areas.cur.map.tileAt, h = hash2(x, y);
    const water = (tt) => !NW.isLandT(tt);
    if (water(tileAt(x + 1, y))) { g.fillStyle = shade(CC.sandSide, -0.08); poly(g, [P(x + 1, y, LIFT), P(x + 1, y + 1, LIFT), P(x + 1, y + 1, 0), P(x + 1, y, 0)]); g.fill(); }
    if (water(tileAt(x, y + 1))) { g.fillStyle = CC.sandSide; poly(g, [P(x, y + 1, LIFT), P(x + 1, y + 1, LIFT), P(x + 1, y + 1, 0), P(x, y + 1, 0)]); g.fill(); }
    let base = t === T.GRASS ? mix(CC.grass, CC.grassDark, h * 0.5) : t === T.SAND ? mix(CC.sand, "#e6cb8f", h * 0.6) : t === T.FOREST ? mix(CC.forest, "#4a7d3d", h * 0.6) : CC.grass;
    if (t === T.GRASS) { const d = seaDist(x + 0.5, y + 0.5); if (d < 2.6) base = mix(base, "#b9c977", clamp((2.6 - d) / 3, 0, 0.6)); }
    g.fillStyle = base; poly(g, [P(x, y, LIFT), P(x + 1, y, LIFT), P(x + 1, y + 1, LIFT), P(x, y + 1, LIFT)]); g.fill();
    g.strokeStyle = base; g.lineWidth = 0.8; g.stroke();
    const c = P(x + 0.5, y + 0.5, LIFT);
    if (t === T.GRASS || t === T.FOREST) {
      g.strokeStyle = shade(base, -0.18); g.lineWidth = 1.1; g.lineCap = "round";
      for (let i = 0; i < 4; i++) { const u = hash2(x * 7 + i, y * 3 - i), v = hash2(x * 5 - i, y * 11 + i), p = P(x + 0.15 + u * 0.7, y + 0.15 + v * 0.7, LIFT); g.beginPath(); g.moveTo(p.x - 2, p.y); g.lineTo(p.x - 0.5, p.y - 4); g.moveTo(p.x + 1, p.y); g.lineTo(p.x + 2.5, p.y - 3.5); g.stroke(); }
      if (t === T.GRASS && h > 0.88) { const fc = ["#fff6d8", "#f6a6b2", "#f7d25a"][(h * 1000) % 3 | 0]; for (let i = 0; i < 3; i++) { const p = P(x + 0.3 + i * 0.2, y + 0.6 - i * 0.15, LIFT); g.fillStyle = fc; g.beginPath(); g.arc(p.x, p.y - 2, 1.6, 0, 7); g.fill(); } }
      if (t === T.FOREST) { g.fillStyle = "rgba(40,70,40,.25)"; for (let i = 0; i < 3; i++) { const p = P(x + hash2(x + i, y) * 0.9, y + hash2(x, y + i) * 0.9, LIFT); g.beginPath(); g.ellipse(p.x, p.y, 5, 2.2, 0, 0, 7); g.fill(); } }
    } else if (t === T.SAND) {
      g.fillStyle = shade(base, -0.12);
      for (let i = 0; i < 5; i++) { const p = P(x + hash2(x + i, y * 2) * 0.9 + 0.05, y + hash2(x * 3, y + i) * 0.9 + 0.05, LIFT); g.fillRect(p.x, p.y, 1.4, 1.4); }
      if (h > 0.9) { g.fillStyle = h > 0.95 ? "#fbefe6" : "#9aa3a8"; g.beginPath(); g.ellipse(c.x + 6, c.y + 2, 3, 1.9, 0.4, 0, 7); g.fill(); }
    } else if (t === T.PATH) {
      g.fillStyle = CC.pathEdge; poly(g, [P(x + 0.06, y + 0.06, LIFT), P(x + 0.94, y + 0.06, LIFT), P(x + 0.94, y + 0.94, LIFT), P(x + 0.06, y + 0.94, LIFT)]); g.fill();
      g.fillStyle = CC.path;
      const Nb = (dx, dy) => { const tt = tileAt(x + dx, y + dy); return tt === T.PATH || tt === T.DOCK; };
      const x0 = Nb(-1, 0) ? 0 : 0.12, x1 = Nb(1, 0) ? 1 : 0.88, y0 = Nb(0, -1) ? 0 : 0.12, y1 = Nb(0, 1) ? 1 : 0.88;
      poly(g, [P(x + x0, y + y0, LIFT), P(x + x1, y + y0, LIFT), P(x + x1, y + y1, LIFT), P(x + x0, y + y1, LIFT)]); g.fill();
      g.fillStyle = "#b9966a"; for (let i = 0; i < 4; i++) { const p = P(x + 0.2 + hash2(x + i * 3, y) * 0.6, y + 0.2 + hash2(x, y + i * 5) * 0.6, LIFT); g.beginPath(); g.ellipse(p.x, p.y, 1.8, 1, 0, 0, 7); g.fill(); }
    }
  };
}
NW.coastTile = coastTile;

// ---------- Warna air pelabuhan (dangkal → dalam) ----------
const WC = { shallow: "#62c6c4", mid: "#2b98b4", deep: "#1d6f96" };
function waterColor(x, y) {
  const d = M.seaD(x + 0.5, y + 0.5), k = clamp(d / 6, 0, 1);
  const rocky = y > M.ROCKY_Y - 1 && d < 3 ? 0.18 : 0; // dasar berbatu: sedikit lebih gelap
  return mix(k < 0.4 ? mix(WC.shallow, WC.mid, k / 0.4) : mix(WC.mid, WC.deep, (k - 0.4) / 0.6), "#3d6f7a", rocky);
}

// ---------- Gaya karakter ----------
const STYLE = {
  hasan: { shirt: "#3d5a6c", pants: "#2e2a26", skin: "#a8714a", hair: "#cfcac2", hat: "cap", hatCol: "#ece6d6", collar: "#f3e7c9" },
  ratna: { shirt: "#c9553b", pants: "#4a3b5c", skin: "#c68b5e", hair: "#2a1d14", hat: "scarf", hatCol: "#2f7a8c", apron: "#f3e7c9" },
  arif: { shirt: "#e0b84c", pants: "#2f5d78", skin: "#b77b52", hair: "#1f1612", hat: "cap", hatCol: "#d84a3a", towel: "#f3e7c9", scale: 0.95 },
};

// ---------- Cerita "Jejak Arus Selat" (3 bagian) ----------
const CH = {
  1: { name: "Pelabuhan Baru", steps: [
    { kind: "talk", who: "hasan", goal: "Temui Pak Hasan di pangkal dermaga" },
    { kind: "task", key: "visit", goal: "Lihat Pasar Ikan dan Gudang Peralatan" },
    { kind: "talk", who: "ratna", goal: "Bicara dengan Bu Ratna di Pasar Ikan" },
    { kind: "talk", who: "arif", goal: "Temui Arif di Gudang Peralatan" },
    { kind: "talk", who: "hasan", goal: "Kembali ke Pak Hasan" },
  ] },
  2: { name: "Tanda dari Laut", steps: [
    { kind: "talk", who: "hasan", goal: "Dengarkan cerita Pak Hasan tentang tanda-tanda laut" },
    { kind: "task", key: "spots", need: 2, goal: "Berlayar dan temukan 2 spot laut (ikuti burung, warna air, atau riak)" },
    { kind: "talk", who: "arif", goal: "Ceritakan temuanmu ke Arif" },
  ] },
  3: { name: "Arus Selat", steps: [
    { kind: "talk", who: "hasan", goal: "Temui Pak Hasan sekali lagi" },
    { kind: "task", key: "arus", goal: "Tantangan: pancing seekor ikan di spot Arus Selat (pasang jangkar dulu)" },
    { kind: "talk", who: "hasan", goal: "Tunjukkan hasilnya ke Pak Hasan" },
  ] },
};
const SEA_SPOTS = ["sea:pesisir", "sea:karang", "sea:arus", "sea:dalam"];
const st = () => S().adv.selat;
const at = (b, s) => st().bab === b && st().step === s;
const cur = () => (CH[st().bab] ? CH[st().bab].steps[st().step] : null);
const done = () => st().bab > 3;
const awaits = (who) => { const c = cur(); return !!c && c.kind === "talk" && c.who === who; };
const spotsFound = () => SEA_SPOTS.filter((k) => NW.adv.isFound(k)).length;
function advance() {
  const s = st(); s.step++; const b0 = s.bab;
  if (!CH[s.bab] || s.step >= CH[s.bab].steps.length) { s.doneAt[s.bab] = Date.now(); s.bab++; s.step = 0; }
  if (s.bab > b0) { if (s.bab <= 3) N().sfx("bab_selesai"); } else N().sfx(s.bab === 1 && s.step === 1 ? "misi_baru" : "ok");
  N().save(); W().updateHint();
  const c = cur();
  if (c) N().toast(c.kind === "talk" ? `📖 ${c.goal} ❗` : `📖 ${c.goal}`, "good");
  checkTasks();
}
function claim(key, fn) { const cl = st().claimed; if (cl[key]) return false; cl[key] = Date.now(); fn(); N().save(); N().refreshHUD(); return true; }
function checkTasks() {
  const c = cur(); if (!c || c.kind !== "task") return;
  if (c.key === "visit" && NW.adv.isFound("selat:pasar") && NW.adv.isFound("selat:gudang")) advance();
  else if (c.key === "spots" && spotsFound() >= 2) advance();
}

// ---------- NPC ----------
const WAIT_GUEST = { from: 0, to: 24, at: "PIERB", act: "guide", face: 5, prop: "net", bubble: "⚓", label: "menunggu kapal di pangkal dermaga", lines: [] };
const ARIF_WAIT = { from: 0, to: 24, at: "GUD", act: "fix", face: 1, bubble: "🔧", label: "membetulkan mesin tempel di gudang", lines: [] };
const greet = () => { const h = S().hour; return h < 10 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18.5 ? "Selamat sore" : "Selamat malam"; };
const npcs = [
  {
    id: "hasan", name: "Pak Hasan", avatar: "👴🏽", role: "Nelayan senior", style: STYLE.hasan, speed: 0.9, seed: 8.3, home: "HASANH",
    sched: [
      { from: 5, to: 9, at: "PIERB", act: "mend", face: 5, prop: "net", bubble: "🕸️", label: "menjahit jaring di pangkal dermaga",
        lines: [["Jaring yang rapi itu separuh rezeki. Separuhnya lagi sabar menunggu."]] },
      { from: 9, to: 12, at: "PIERM", act: "patrol", route: ["PIERE", "PIERM", "JET"], faceAt: [5, 3, 5], wait: [5, 9], prop: "paddle", bubble: "🛶", label: "memeriksa tambatan perahu",
        lines: [["Tali tambat harus dicek tiap hari. Arus selat bisa menarik perahu pelan-pelan tanpa kita sadari."]] },
      { from: 12, to: 14, at: "BENCH", act: "rest", face: 7, bubble: "☕", label: "ngopi di Warung Kopi Pelabuhan",
        lines: [["Kopi di warung ini kental. Cocok untuk orang yang bangun sebelum subuh seperti kami."]] },
      { from: 14, to: 17.5, at: "PIERE", act: "fish", face: 5, bubble: "🎣", label: "memancing di ujung dermaga",
        lines: [["Dari ujung dermaga pun bisa dapat ikan, asal tahu kapan arus berbalik."]] },
      { from: 17.5, to: 20, at: "LH", act: "sunset", face: 5, bubble: "🌇", label: "memandang laut dari kaki mercusuar",
        lines: [["Lihat warnanya. Waktu senja, selat ini berubah jadi tembaga."]] },
      { from: 20, to: 5, at: "HASANH", act: "sleep", hide: true },
    ],
    schedFor: () => (at(1, 0) ? WAIT_GUEST : null),
    knock: ["Tok tok tok…", "\"Sudah malam, Nak. Nelayan tua ini harus tidur, besok subuh melaut lagi,\" sahut Pak Hasan dari dalam."],
  },
  {
    id: "ratna", name: "Bu Ratna", avatar: "🧕🏽", role: "Pedagang ikan", style: STYLE.ratna, speed: 0.85, seed: 9.1, home: "RATNAH",
    sched: [
      { from: 5.5, to: 13, at: "STALL", act: "rstall", face: 2, prop: "basket", bubble: "🐟", label: "berjualan di Pasar Ikan", lines: [] },
      { from: 13, to: 15.5, at: "RACK", act: "dry", face: 2, prop: "basket", bubble: "☀️", label: "menjemur ikan asin",
        lines: [["Ikan asin harus kena matahari penuh. Kalau mendung, Ibu angkat dulu biar tidak lembap."]] },
      { from: 15.5, to: 18, at: "WAR", act: "chat", face: 3, bubble: "💬", label: "mengobrol di Warung Kopi",
        lines: [["Sore-sore begini semua nelayan pulang. Kabar laut paling segar terdengar di warung."]] },
      { from: 18, to: 5.5, at: "RATNAH", act: "sleep", hide: true },
    ],
    knock: ["Tok tok tok…", "\"Pasar buka lagi subuh, Nak. Ikan paling segar datang sebelum matahari terbit,\" sahut Bu Ratna."],
  },
  {
    id: "arif", name: "Arif", avatar: "🧑🏽", role: "Pemuda pelabuhan", style: STYLE.arif, speed: 1.3, seed: 10.7, home: "ARIFH",
    sched: [
      { from: 6, to: 10, at: "GUD", act: "patrol", route: ["GUD", "PIERM", "NETS"], faceAt: [1, 3, 2], wait: [4, 7], prop: "bucket", bubble: "📦", label: "mengangkut perlengkapan",
        lines: [["Ember umpan ke dermaga, jaring kering ke gudang. Pagi di pelabuhan tidak pernah sepi!"]] },
      { from: 10, to: 13, at: "GUD", act: "fix", face: 1, bubble: "🔧", label: "membetulkan mesin tempel di gudang",
        lines: [["Mesin tempel ini rewel kalau businya basah. Sebentar lagi beres."]] },
      { from: 13, to: 16, at: "LH", act: "watch", face: 5, prop: "binoc", bubble: "🔭", label: "mengamati laut dari mercusuar",
        lines: [["Dari sini kelihatan burung-burung berkumpul. Di bawahnya biasanya ada gerombolan ikan."]] },
      { from: 16, to: 19, at: "PIERM", act: "fish", face: 3, bubble: "🎣", label: "memancing di dermaga",
        lines: [["Aku belum sehebat Pak Hasan, tapi hari ini pasti dapat tongkol!"]] },
      { from: 19, to: 6, at: "ARIFH", act: "sleep", hide: true },
    ],
    schedFor: (h) => (awaits("arif") && h >= 6 && h < 19 ? ARIF_WAIT : null),
    knock: ["Tok tok tok…", "\"Arif sudah tidur, capek mengangkut peti seharian,\" kata ibunya sambil tersenyum."],
  },
];
const byId = (id) => npcs.find((n) => n.id === id);

// kalimat biasa (tidak mengulang; ingatan di S.adv.mem)
const dex = (id) => !!(S().dex[id] && S().dex[id].n);
const LINES = {
  hasan: [
    { id: "h1", t: () => ["Arus di selat ini berubah dua kali sehari. Nelayan yang paham arus, tidak pernah pulang dengan tangan kosong."] },
    { id: "h2", t: () => ["Kalau kau lihat burung laut berputar-putar di satu tempat, berlayarlah ke sana. Mereka tahu di mana ikan berkumpul."] },
    { id: "h3", t: () => ["Air yang warnanya hijau toska biasanya dangkal dan berkarang. Hati-hati, tapi ikan karang suka di sana."] },
    { id: "h4", t: () => ["Di tengah selat ada gunung api kecil. Asapnya jadi penunjuk arah kami sejak dulu."] },
    { id: "h5", c: () => dex("tongkol"), t: () => ["Tongkol itu ikan rakyat. Dibalado, digoreng, diasap… semua enak."] },
    { id: "h6", t: () => ["Jangan malu memakai tombol jangkar. Pelaut yang baik tahu kapan harus berhenti."] },
    { id: "h7", c: () => done(), t: () => ["Pelaut Selat Sunda! Hahaha, kalau ada anak muda yang mau belajar, kusuruh ikut kau saja."] },
    { id: "h8", c: () => dex("kerapu_raksasa"), t: () => ["Kerapu raksasa? Kau sungguh menaikkannya? Aku saja baru dua kali melihatnya seumur hidup."] },
    { id: "h9", t: () => ["Kapalmu bersandar di sisi selatan dermaga. Mesinnya kudengar halus, rawat baik-baik."] },
  ],
  ratna: [
    { id: "r1", t: () => ["Tongkol, kembung, baronang… pagi ini semua segar. Mau lihat-lihat?"] },
    { id: "r2", t: () => ["Ikan asin buatan Ibu terkenal sampai ke kampung seberang, lho."] },
    { id: "r3", t: () => ["Kalau dapat kerapu macan, jangan dijual murah. Restoran di kota suka sekali ikan itu."] },
    { id: "r4", t: () => ["Arif itu rajin. Tiap pagi dia yang mengangkut es ke pasar."] },
    { id: "r5", t: () => ["Ikan yang dilindungi jangan dibawa pulang, ya. Lepaskan, nanti dapat hadiah konservasi."] },
    { id: "r6", c: () => done(), t: () => ["Pak Hasan bangga sekali padamu. Dia cerita ke semua orang di warung!"] },
  ],
  arif: [
    { id: "a1", t: () => ["Kak dari Muara, ya? Aku Arif. Kalau ada yang rusak di kapal, bawa ke gudang!"] },
    { id: "a2", t: () => ["Tips dariku: tekan jangkar dulu sebelum memancing. Kalau tidak, kapal pelan-pelan hanyut."] },
    { id: "a3", t: () => ["Di laut lepas kadang ada kabut. Lihat saja panah kompas di layar, dia selalu menunjuk dermaga terdekat."] },
    { id: "a4", t: () => ["Aku pernah lihat bayangan ikan besar sekali di laut dalam. Airnya biru gelap di sana."] },
    { id: "a5", c: () => st().bab >= 3, t: () => ["Arus Selat itu tempat favorit tongkol dan tenggiri. Riaknya kelihatan bergaris-garis."] },
    { id: "a6", c: () => done(), t: () => ["Kak, nanti ajari aku membaca tanda laut seperti Kakak, ya!"] },
  ],
};
const GREET = {
  hasan: [{ id: "g1", t: () => [`${greet()}, Nak.`] }, { id: "g2", t: () => ["Eh, pelaut muda datang lagi."] }, { id: "g3", t: () => ["Angin hari ini bersahabat. Bagus untuk melaut."] }],
  ratna: [{ id: "g1", t: () => [`${greet()}, Nak! Mampir ke lapak Ibu?`] }, { id: "g2", t: () => ["Eh, langganan dari Muara!"] }, { id: "g3", t: () => ["Ikan segar, Nak, ikan segar!"] }],
  arif: [{ id: "g1", t: () => ["Kak! Pas sekali."] }, { id: "g2", t: () => [`${greet()}, Kak!`] }, { id: "g3", t: () => ["Halo, Kapten! Hehe."] }],
};
function chat(n) {
  const opener = NW.adv.talkCount(n.id) > 0 ? NW.adv.pickLine(n.id + ":g", GREET[n.id]) : [];
  const act = n.cur && n.cur.lines && n.cur.lines.length ? n.cur.lines.map((ls, i) => ({ id: `${n.id}-a-${n.cur.act}-${i}`, t: () => ls })) : [];
  return opener.concat(NW.adv.pickLine(n.id, LINES[n.id].concat(act)));
}
function reminder() {
  const c = cur(); if (!c || c.kind !== "task") return null;
  if (c.key === "spots") return `Spot laut yang sudah kau temukan: ${spotsFound()}/2. Perhatikan burung yang berputar, air berwarna toska, atau riak bergaris.`;
  if (c.key === "arus" && (st().prog.tries || 0) >= 2) return "Ikannya lepas? Kendurkan saat ia menyentak, gulung saat ia lelah. Arus memang membuat ikan lebih kuat.";
  return `Oh ya: ${c.goal.charAt(0).toLowerCase() + c.goal.slice(1)}.`;
}

// ---------- Dialog cerita ----------
function storyTalk(n, open) {
  const D = (lines, options) => open({ name: n.name, avatar: n.avatar, role: n.role, npc: n.hidden ? null : n, lines, options, noLater: true });
  if (n.id === "hasan") {
    if (at(1, 0)) return D(["Assalamualaikum, selamat datang di Pelabuhan Selat Sunda!", "Aku Hasan. Sudah empat puluh tahun aku melaut dari dermaga ini.", "Pelabuhan kami kecil, tapi ramai. Pasar Ikan Bu Ratna di dekat jalan, Gudang Peralatan di selatan.", "Lihat-lihatlah dulu. Nanti kembali ke sini, ada yang ingin kuceritakan."],
      [{ label: "👋 Siap, Pak Hasan!", act: () => advance() }]);
    if (at(1, 4)) return D(["Sudah bertemu Bu Ratna dan Arif? Bagus.", "Mulai hari ini kau bagian dari pelabuhan ini. Kapalmu boleh bersandar di sini kapan saja.", "Ini sedikit bekal untuk bensin. Jangan ditolak, ya."],
      [{ label: "🙏 Terima kasih, Pak", act: () => { claim("bab1", () => { S().money += 200; NW.adv.addNote({ id: "selat:bab1", area: "selat", title: "Pelabuhan Baru", text: "Pak Hasan menyambutku di dermaga. Bu Ratna berjualan ikan segar, dan Arif mengurus gudang peralatan. Bau laut, es, dan kopi bercampur di pelabuhan ini." }); N().toast("📖 Bagian 1 selesai! +🪙200 · Catatan baru di 🧭 Buku Petualangan", "good"); }); advance(); } }]);
    if (at(2, 0)) return D(["Nak, laut itu bicara. Hanya saja, kita harus belajar membaca bahasanya.", "Burung laut yang berputar di satu tempat artinya ada gerombolan ikan kecil di bawahnya.", "Air hijau toska berarti dangkal dan berkarang. Air biru gelap berarti laut dalam. Riak bergaris berarti ada arus.", "Berlayarlah. Temukan dua tempat seperti itu, lalu ceritakan pada Arif. Dia sedang belajar hal yang sama."],
      [{ label: "⛵ Aku akan berlayar", act: () => advance() }]);
    if (at(3, 0)) return D(["Arif bilang kau sudah bisa membaca laut. Hebat!", "Sekarang ujian terakhir: Arus Selat. Arus di sana kuat, ikannya pun menarik lebih keras.", "Pasang jangkar di tengah riak bergaris itu, lalu pancinglah seekor ikan. Gagal pun tidak apa, coba lagi."],
      [{ label: "🎣 Akan kucoba, Pak", act: () => advance() }]);
    if (at(3, 2)) { const c = st().prog.arus; return D([`${c ? N().FISH_BY_ID[c.id].name + " " + N().fmtW(c.w) : "Ikan"} dari Arus Selat! Kau menahannya dengan sabar walau arusnya kuat.`, "Kau sudah membaca tanda laut, mengemudikan kapal, dan bertahan di arus.", "Mulai hari ini, pelabuhan ini mengenalmu sebagai Pelaut Selat Sunda."],
      [{ label: "🏅 Terima gelar", act: () => finale() }]); }
  }
  if (n.id === "ratna" && at(1, 2)) return D(["Wah, wajah baru! Kata Pak Hasan kau datang dari Muara, ya?", "Ini Pasar Ikan Selat. Tongkol, kembung, kakap merah, tenggiri… semua dari laut di depan sana.", "Kalau mau menjual tangkapan, langsung saja ke lapak Ibu. Harganya sama dengan pasar Bu Sari.", "Oh ya, Arif mencarimu tadi. Dia di Gudang Peralatan."],
    [{ label: "🐟 Terima kasih, Bu!", act: () => advance() }]);
  if (n.id === "arif") {
    if (at(1, 3)) return D(["Kak! Aku Arif. Aku yang mengurus gudang ini: jaring, pelampung, mesin tempel.", "Kalau kapalmu sudah di sini, coba berlayar ke laut lepas. Di peta laut ada tempat-tempat yang belum ditandai.", "Pakai tombol 🗺️ Peta Laut kalau bingung arah. Kompas di layar selalu menunjuk dermaga terdekat."],
      [{ label: "🧭 Siap, Arif!", act: () => advance() }]);
    if (at(2, 2)) return D(["Kakak menemukan dua tempat sendiri? Wah, aku saja baru satu!", "Ini untuk Kakak: pelampung kecil yang kuukir sendiri. Lencana pelaut, katanya Pak Hasan.", "Pak Hasan pasti mau bertemu Kakak lagi. Dia sedang menyiapkan sesuatu."],
      [{ label: "🛟 Terima pelampung", act: () => { claim("bab2", () => { S().money += 250; NW.adv.award({ id: "selat:lencana", icon: "🛟", name: "Mata Laut", desc: "Pelampung ukiran Arif untuk pelaut yang bisa membaca tanda-tanda laut sendiri.", kind: "lencana" }); NW.adv.addNote({ id: "selat:bab2", area: "selat", title: "Tanda dari Laut", text: `Aku berlayar dan menemukan ${spotsFound()} spot laut dengan membaca tanda alam: burung yang berputar, warna air, dan riak bergaris. Arif memberiku pelampung ukiran.` }); N().toast("📖 Bagian 2 selesai! +🪙250 · Lencana Mata Laut", "good"); N().sfx("penghargaan"); }); advance(); } }]);
  }
  return false;
}
// ---------- Penutup cerita ----------
function finale() {
  if (!at(3, 2)) return;
  claim("bab3", () => {
    S().money += 350;
    NW.adv.award({ id: "selat:gelar", icon: "⚓", name: "Pelaut Selat Sunda", desc: "Gelar petualangan dari Pak Hasan setelah menyelesaikan cerita Jejak Arus Selat. Terpisah dari 8 gelar jumlah tangkapan.", kind: "gelar" });
    const c = st().prog.arus;
    NW.adv.addNote({ id: "selat:bab3", area: "selat", title: "Arus Selat", text: `Aku memasang jangkar di Arus Selat dan menaikkan ${c ? N().FISH_BY_ID[c.id].name + " " + N().fmtW(c.w) : "seekor ikan"}. Pak Hasan memberiku gelar Pelaut Selat Sunda.` });
  });
  advance();
  N().sfx("penghargaan"); if (NW.audioDirector) NW.audioDirector.setScene("cerita");
  W().look({ x: 6, y: 18, z: 30, zoom: 0.85, dur: 4.8, caption: "⚓ Lampu mercusuar berkedip menyambut pelaut baru…", done: () => awardCard() });
}
function awardCard() {
  if ($("awardWrap")) return;
  const w = document.createElement("div"); w.id = "awardWrap"; w.className = "net-wrap";
  w.innerHTML = `<div class="net-card award-card"><div class="award-ic">⚓</div><h3>Pelaut Selat Sunda</h3><p>Cerita <b>Jejak Arus Selat</b> selesai!<br>Gelar petualangan ini tersimpan di 🧭 Buku Petualangan, terpisah dari 8 gelar tangkapan.</p><p class="muted">+🪙350 · catatan "Arus Selat"</p><div class="net-row"><button class="btn ghost" id="awardBook">🧭 Buka Buku</button><button class="btn gold" id="awardOk">Terima kasih!</button></div></div>`;
  document.body.appendChild(w);
  const end = () => { w.remove(); if (NW.audioDirector) NW.audioDirector.setScene(null); };
  w.querySelector("#awardOk").addEventListener("click", () => { N().sfx("click"); end(); const h = byId("hasan"); W().openDialog({ name: h.name, avatar: h.avatar, role: h.role, npc: h.hidden ? null : h, lines: ["Laut selalu terbuka untukmu, Pelaut Selat Sunda. Hati-hati di jalan pulang!"] }); });
  w.querySelector("#awardBook").addEventListener("click", () => { N().sfx("click"); end(); N().openPanel("adventure"); });
}

// ---------- Bicara ----------
function talk(n, api) {
  const open = api.openDialog;
  if (awaits(n.id) && storyTalk(n, open) !== false) { NW.adv.pickLine(n.id + ":g", GREET[n.id]); return; }
  const lines = chat(n).slice();
  const wl = NW.weather && NW.weather.chatLine(n); if (wl) lines.unshift(wl);
  const rem = reminder(); if (rem && (n.id === "hasan" || (n.id === "arif" && st().bab >= 2))) lines.push(rem);
  const opts = [];
  if (n.id === "ratna") opts.push({ label: "🐟 Ikan apa saja di selat?", act: () => open({ name: n.name, avatar: n.avatar, role: n.role, npc: n, lines: ["Ini ikan-ikan selat yang biasa Ibu jual (✔ = sudah pernah kau tangkap):"].concat(fishInfo()) }) }, { label: "🏪 Jual tangkapan", act: () => N().openPanel("market") });
  if (n.id === "hasan") opts.push({ label: "🧭 Tanda-tanda ikan di laut?", act: () => open({ name: n.name, avatar: n.avatar, role: n.role, npc: n, lines: tips() }) });
  if (n.id === "arif") opts.push({ label: "⛵ Cara mengemudikan kapal?", act: () => open({ name: n.name, avatar: n.avatar, role: n.role, npc: n, lines: ["Gampang, Kak! Joystick ke ATAS = maju, ke BAWAH = mundur atau mengerem.", "KIRI dan KANAN untuk membelok. Belok lebih tajam kalau kapal sedang melaju.", "Tombol ⚓ Jangkar untuk berhenti. Setelah berhenti, tombol 🎣 Memancing menyala.", "Kalau tersangkut atau tersesat, tekan 🛟 Ke Dermaga. Kapal ditarik pulang dengan aman, ikanmu tidak hilang."] }) });
  open({ name: n.name, avatar: n.avatar, role: n.role, npc: n, lines, options: opts });
}
function fishInfo() {
  const R = (r) => RARITY[r].label;
  return FISH.filter((f) => f.loc === "selat" && (!f.mistik || dex(f.id))).map((f) => `${dex(f.id) ? "✔" : "·"} ${f.name} — ${R(f.rarity)}, ${N().fmtW(f.wMin)}–${N().fmtW(f.wMax)}${f.night === true ? ", malam" : ""}. ${f.desc}`);
}
function tips() {
  const L = [], F = (k) => NW.adv.isFound(k);
  if (!F("sea:pesisir")) L.push("Di perairan dekat kampungmu sendiri, Muara, coba cari burung yang berputar di atas air, di sebelah selatan jalur kapal.");
  if (!F("sea:karang")) L.push("Di tengah perairan selat ada air berwarna toska. Itu karang dangkal, rumah kerapu dan kakap.");
  if (!F("sea:arus")) L.push("Dekat pelabuhan ini, sebelah barat laut, airnya bergaris-garis putih. Itu arus selat.");
  if (!F("sea:dalam")) L.push("Di bagian selatan laut lepas, airnya biru gelap sekali. Itu laut dalam. Kadang bayangan ikan raksasa lewat di sana.");
  if (!F("sea:palung")) L.push("Orang-orang tua bilang, jauh di tenggara laut lepas ada satu tempat yang airnya tiba-tiba menggelap dan berkabut tipis, bahkan saat langit cerah. Aku sendiri tak pernah berani mendekat sendirian.");
  if (!L.length) L.push("Kau sudah menemukan semua tanda yang kutahu. Sekarang kau yang harus mengajariku, hahaha!");
  L.push("Kalau tersesat, ikuti panah kompas di layar. Dia selalu menunjuk dermaga terdekat.");
  return L;
}

// ---------- Interaksi tempat ----------
const isNear = (id, r = 3.2) => { const n = byId(id); return n && !n.hidden && Math.hypot(n.x - W().player.x, n.y - W().player.y) < r ? n : null; };
const THOUGHTS = {
  pagi: ["Perahu-perahu nelayan pulang membawa hasil semalam. Burung camar berebut sisa ikan.", "Kabut tipis di atas selat mulai terangkat."],
  siang: ["Laut biru membentang. Di kejauhan, sebuah kapal besar berlayar pelan.", "Angin laut membawa bau asin dan es batu dari pasar."],
  sore: ["Langit jingga memantul di air pelabuhan. Lampu mercusuar mulai menyala.", "Nelayan merapikan jaring sambil bercanda di dermaga."],
  malam: ["Lampu perahu-perahu kecil berkelip di tengah laut. Mereka mencari cumi.", "Suara ombak memukul tiang dermaga terdengar pelan."],
};
const tod = () => { const h = S().hour; return h >= 5 && h < 10 ? "pagi" : h < 15 ? "siang" : h < 18.5 ? "sore" : "malam"; };
function interact(t, api) {
  const open = api.openDialog;
  if (t.id === "rute") return N().openPanel("map");
  if (t.id === "spasar") {
    const n = byId("ratna"), o2 = !n.hidden && n.cur && n.cur.act === "rstall" && n.arrived;
    if (o2) return talk(n, api);
    return open({ name: "Lapak Bu Ratna", avatar: "📦", lines: ["Lapak sedang tutup. Ada papan kecil: \"Ikan titipan bisa langsung dijual — kotak ada di samping.\"", `Bu Ratna sedang ${n.hidden ? "di rumah" : n.cur.label}. Lapak buka pukul 05:30–13:00.`], options: [{ label: "🏪 Jual tangkapan", act: () => N().openPanel("market") }] });
  }
  if (t.id === "gudang") {
    const a = isNear("arif", 3.5);
    return open({ name: "Gudang Peralatan", avatar: "🧰", npc: a, lines: ["Gudang kayu berbau oli dan tali basah. Jaring, pelampung, dayung, dan dua mesin tempel tersusun rapi.", a ? "Arif: \"Kalau kapalmu butuh perawatan, bawa ke sini, Kak!\"" : "Di dinding tertempel daftar pasang-surut air laut minggu ini."],
      options: a && awaits("arif") ? [{ label: "📖 Bicara dengan Arif", act: () => talk(a, api) }] : [] });
  }
  if (t.id === "warung") {
    const who = npcs.filter((n) => !n.hidden && n.arrived && Math.hypot(n.x - 27.6, n.y - 18.6) < 2.6);
    return open({ name: "Warung Kopi Pelabuhan", avatar: "☕", lines: ["Warung kayu terbuka dengan bangku panjang. Kopi hitam, pisang goreng, dan kabar laut tersedia setiap hari.", who.length ? `${who.map((n) => n.name).join(" dan ")} sedang di sini.` : "Sedang sepi. Bangku di depan warung enak untuk duduk sebentar."] });
  }
  if (t.id === "tower") {
    const cap = { pagi: "🗼 Dari kaki mercusuar: perahu nelayan pulang, laut selat berkilau.", siang: "🗼 Laut biru membentang sampai gunung api kecil di tengah selat.", sore: "🗼 Matahari tenggelam di balik pulau-pulau. Lampu mercusuar mulai berputar.", malam: "🗼 Sorot lampu mercusuar menyapu laut gelap, menuntun perahu pulang." }[tod()];
    S().adv.best.views = (S().adv.best.views || 0) + 1; N().save(); api.player.dir = 5; N().sfx("pemandangan");
    return api.look({ x: 2, y: 8, z: 40, zoom: 0.78, dur: 5.2, caption: cap });
  }
  if (t.id === "info") return open({ name: "Papan Informasi Pelabuhan", avatar: "📜", lines: [
    "Selat Sunda adalah selat yang memisahkan Pulau Jawa dan Pulau Sumatra. Arusnya kuat dan berubah mengikuti pasang-surut.",
    "Di perairan ini hidup ikan pelagis seperti tongkol, tenggiri, dan kembung, serta ikan karang seperti kakap dan kerapu.",
    "Ayo jaga laut: jangan membuang sampah ke laut, dan lepaskan ikan yang dilindungi.",
    "Tempat di pelabuhan: Pasar Ikan & Warung Kopi (timur dermaga), Gudang Peralatan (selatan), Mercusuar (tanjung utara), Pantai Berbatu (ujung selatan)."] });
  if (t.seat) { let said = false; return api.sitAt(t.seat, { tick: (secs) => { if (!said && secs > 1.6) { said = true; const pool = THOUGHTS[tod()]; api.caption("💭 " + pool[Math.floor(Math.random() * pool.length)], 3.6); } } }); }
  if (t.owner) {
    const n = byId(t.owner), b = M.B[t.id];
    if (n.hidden && awaits(n.id)) return open({ name: b.name, avatar: "🏠", lines: ["Tok tok tok…", `Pintu terbuka. ${n.name} melongok keluar. "Oh, kau! Sini, sini."`], options: [{ label: "📖 Lanjut cerita", act: () => storyTalk(n, open) }] });
    if (n.hidden) return open({ name: b.name, avatar: "🏠", lines: n.knock });
    return open({ name: b.name, avatar: "🏠", lines: ["Tok tok tok…", `Tidak ada yang menjawab. ${n.name} sedang ${n.cur.label || "di luar"}.`] });
  }
}

// ---------- Aktivitas khusus NPC ----------
const NAV = M.NAV;
const acts = {
  rstall(n, dt, a, k) { // Bu Ratna mondar-mandir di balik meja pasar
    n.waitT -= dt; if (n.waitT > 0) { n.dir = 2; return; }
    const spots = [[NAV.STALL[0], 16.7], [NAV.STALL[0] - 1.3, 16.75], [NAV.STALL[0] + 1.1, 16.65]];
    const s = spots[n.alt % 3];
    if (k.walkTo(n, s[0], s[1], dt)) { n.alt++; n.waitT = rand(2.5, 5); n.dir = 2; }
  },
  mend(n, dt) { n.waitT -= dt; if (n.waitT <= 0) { n.waitT = rand(3, 6); n.dir = n.dir === 5 ? 3 : 5; } }, // menjahit jaring: sesekali menoleh
  fix(n, dt) { n.waitT -= dt; if (n.waitT <= 0) { n.waitT = rand(2, 4); sparks.push({ x: n.x + 0.5, y: n.y - 0.2, t: 0 }); while (sparks.length > 4) sparks.shift(); } },
  dry(n, dt) { n.waitT -= dt; if (n.waitT <= 0) { n.waitT = rand(3, 5); n.dir = (n.dir + (Math.random() < 0.5 ? 1 : 7)) % 8; } },
};
const sparks = [];

// ---------- Ambience: camar di pelabuhan ----------
const gulls = [];
function update(dt, api) {
  for (const s of sparks) s.t += dt; for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t > 0.8) sparks.splice(i, 1);
  if (gulls.length < 3 && Math.random() < dt * 0.4 && N().darkness() < 0.5) gulls.push({ cx: rand(6, 16), cy: rand(14, 26), r: rand(1.2, 2.4), ph: rand(0, 6), sp: rand(0.5, 0.9) * (Math.random() < 0.5 ? 1 : -1), z: rand(55, 85), life: rand(10, 18), t: 0 });
  for (const g of gulls) g.t += dt; for (let i = gulls.length - 1; i >= 0; i--) if (gulls[i].t > gulls[i].life) gulls.splice(i, 1);
}
function drawOver(c, t) {
  for (const s of sparks) { const p = P(s.x, s.y, LIFT + 14 + s.t * 10), a = 1 - s.t / 0.8; c.fillStyle = `rgba(255,220,120,${a})`; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(p.x + (i - 1) * 3 + Math.sin(t * 20 + i) * 2, p.y - i * 2, 1.2, 0, 7); c.fill(); } }
  for (const g of gulls) { const a = g.ph + g.t * g.sp, k = Math.min(1, g.t, g.life - g.t); NW.drawGull(c, g.cx + Math.cos(a) * g.r, g.cy + Math.sin(a) * g.r, g.z, t + g.ph, k, Math.cos(a) * g.sp < 0); }
}

// ---------- Objek khusus Selat (gambar) ----------
const OD = NW.objDraw = NW.objDraw || {};
const shadowE = (c, x, y, rx, ry, a = 0.18) => { const p = P(x, y, LIFT); c.fillStyle = `rgba(20,40,30,${a})`; c.beginPath(); c.ellipse(p.x, p.y, rx, ry, 0, 0, 7); c.fill(); };
OD.mercusuar = (c, o, t, night) => { // mercusuar bergaris merah-putih di tanjung
  const b = P(o.x, o.y, LIFT), H = 118;
  shadowE(c, o.x + 1.1, o.y + 0.35, 40, 12, 0.2);
  c.fillStyle = "#8d9390"; c.beginPath(); c.ellipse(b.x, b.y, 22, 10, 0, 0, 7); c.fill(); c.fillStyle = "#a9aea8"; c.beginPath(); c.ellipse(b.x, b.y - 3, 19, 8.5, 0, 0, 7); c.fill();
  const r0 = 13, r1 = 8.5, bands = 6;
  for (let i = 0; i < bands; i++) {
    const y0 = b.y - 3 - (H * i) / bands, y1 = b.y - 3 - (H * (i + 1)) / bands, w0 = r0 + (r1 - r0) * (i / bands), w1 = r0 + (r1 - r0) * ((i + 1) / bands);
    c.fillStyle = i % 2 ? "#f3efe6" : "#d84a3a"; c.beginPath(); c.moveTo(b.x - w0, y0); c.lineTo(b.x - w1, y1); c.lineTo(b.x + w1, y1); c.lineTo(b.x + w0, y0); c.closePath(); c.fill();
    c.fillStyle = "rgba(0,0,0,.12)"; c.beginPath(); c.moveTo(b.x + w0 * 0.35, y0); c.lineTo(b.x + w1 * 0.35, y1); c.lineTo(b.x + w1, y1); c.lineTo(b.x + w0, y0); c.closePath(); c.fill();
  }
  const top = b.y - 3 - H;
  c.fillStyle = "#3a4a50"; c.fillRect(b.x - 13, top - 3, 26, 4); // balkon
  c.strokeStyle = "#3a4a50"; c.lineWidth = 1; for (let i = -12; i <= 12; i += 4) { c.beginPath(); c.moveTo(b.x + i, top - 3); c.lineTo(b.x + i, top - 9); c.stroke(); }
  c.beginPath(); c.moveTo(b.x - 13, top - 9); c.lineTo(b.x + 13, top - 9); c.stroke();
  const lamp = night > 0.25 || (NW.weather && NW.weather.state.fog > 0.5);
  c.fillStyle = lamp ? "#fff1b0" : "#bfe3ee"; c.fillRect(b.x - 7, top - 17, 14, 13);
  c.strokeStyle = "#2f3b40"; c.lineWidth = 1.2; c.strokeRect(b.x - 7, top - 17, 14, 13);
  c.fillStyle = "#d84a3a"; c.beginPath(); c.moveTo(b.x - 10, top - 17); c.lineTo(b.x, top - 29); c.lineTo(b.x + 10, top - 17); c.closePath(); c.fill();
  c.fillStyle = "#2f3b40"; c.fillRect(b.x - 1, top - 34, 2, 6);
  c.fillStyle = "#4a3a2a"; c.fillRect(b.x - 4, b.y - 20, 8, 14); // pintu
  if (lamp) { // sorot lampu berputar
    const ang = t * 0.9, len = 150;
    c.save(); c.globalCompositeOperation = "lighter";
    for (const s of [1, -1]) {
      const dx = Math.cos(ang) * s, dy = Math.sin(ang) * 0.45 * s;
      const gr = c.createLinearGradient(b.x, top - 10, b.x + dx * len, top - 10 + dy * len); gr.addColorStop(0, "rgba(255,240,170,.38)"); gr.addColorStop(1, "rgba(255,240,170,0)");
      c.fillStyle = gr; c.beginPath(); c.moveTo(b.x, top - 10); c.lineTo(b.x + dx * len - dy * 26, top - 10 + dy * len + dx * 12); c.lineTo(b.x + dx * len + dy * 26, top - 10 + dy * len - dx * 12); c.closePath(); c.fill();
    }
    const g2 = c.createRadialGradient(b.x, top - 10, 0, b.x, top - 10, 26); g2.addColorStop(0, "rgba(255,240,170,.7)"); g2.addColorStop(1, "rgba(255,240,170,0)"); c.fillStyle = g2; c.beginPath(); c.arc(b.x, top - 10, 26, 0, 7); c.fill();
    c.restore();
  }
};
OD.buoy = (c, o, t) => { // pelampung alur pelabuhan
  const bob = Math.sin(t * 1.7 + o.x) * 1.6, p = P(o.x, o.y, 0);
  c.strokeStyle = `rgba(255,255,255,${0.3 + 0.15 * Math.sin(t * 2 + o.y)})`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(p.x, p.y + 2, 12, 5, 0, 0, 7); c.stroke();
  c.fillStyle = o.col || "#d84a3a"; c.beginPath(); c.moveTo(p.x - 7, p.y + bob); c.lineTo(p.x - 4, p.y - 18 + bob); c.lineTo(p.x + 4, p.y - 18 + bob); c.lineTo(p.x + 7, p.y + bob); c.closePath(); c.fill();
  c.fillStyle = "#f3efe6"; c.fillRect(p.x - 5, p.y - 9 + bob, 10, 3);
  c.fillStyle = "#2f3b40"; c.fillRect(p.x - 0.8, p.y - 25 + bob, 1.6, 7);
  const on = (N().darkness() > 0.3 || (NW.weather && NW.weather.state.fog > 0.5)) && Math.sin(t * 3 + o.x) > 0.2;
  c.fillStyle = on ? "#fff3b0" : shade(o.col || "#d84a3a", 0.25); c.beginPath(); c.arc(p.x, p.y - 26 + bob, 2.4, 0, 7); c.fill();
};
OD.rute = (c, o) => { // papan "Rute Kapal" (jalur perjalanan cepat lama)
  const b = P(o.x, o.y, o.dz ?? LIFT + 4); shadowE(c, o.x + 0.15, o.y + 0.08, 10, 3);
  c.fillStyle = "#5a3a20"; c.fillRect(b.x - 1.6, b.y - 28, 3.2, 28);
  c.fillStyle = "#173f50"; c.fillRect(b.x - 17, b.y - 34, 34, 13); c.strokeStyle = "#e0b84c"; c.lineWidth = 1; c.strokeRect(b.x - 16, b.y - 33, 32, 11);
  c.fillStyle = "#e0b84c"; c.font = "800 6.5px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("RUTE KAPAL", b.x, b.y - 27.5);
  c.fillStyle = "#f3e7c9"; c.beginPath(); c.moveTo(b.x + 6, b.y - 19); c.lineTo(b.x + 14, b.y - 16.5); c.lineTo(b.x + 6, b.y - 14); c.closePath(); c.fill(); c.fillRect(b.x - 6, b.y - 18, 12, 3);
};
OD.jukung = (c, o, t) => { if (NW.boat) NW.boat.drawVessel(c, { x: o.x, y: o.y, a: o.a }, t, { style: { hull: o.hull, trim: o.trim }, decor: true, name: o.name }); };
// gudang: dinding papan, atap seng bergelombang, pintu geser besar
function drawGudang(c, b, t, night) {
  const z0 = LIFT, h = b.h, { x0, y0, x1, y1 } = b, wall = b.wall;
  c.fillStyle = "rgba(20,40,30,.18)"; poly(c, [P(x1, y0, LIFT), P(x1 + 1.1, y0 + 0.15, LIFT), P(x1 + 1.1, y1 + 0.15, LIFT), P(x0 + 0.4, y1 + 0.15, LIFT), P(x0, y1, LIFT)]); c.fill();
  const fy = (u0, u1, v0, v1) => [P(x0 + (x1 - x0) * u0, y1, z0 + h * v0), P(x0 + (x1 - x0) * u1, y1, z0 + h * v0), P(x0 + (x1 - x0) * u1, y1, z0 + h * v1), P(x0 + (x1 - x0) * u0, y1, z0 + h * v1)];
  const fx = (u0, u1, v0, v1) => [P(x1, y1 - (y1 - y0) * u0, z0 + h * v0), P(x1, y1 - (y1 - y0) * u1, z0 + h * v0), P(x1, y1 - (y1 - y0) * u1, z0 + h * v1), P(x1, y1 - (y1 - y0) * u0, z0 + h * v1)];
  c.fillStyle = wall; poly(c, fy(0, 1, 0, 1)); c.fill();
  c.fillStyle = shade(wall, -0.2); poly(c, fx(0, 1, 0, 1)); c.fill();
  c.strokeStyle = "rgba(90,60,30,.25)"; c.lineWidth = 1;
  for (let u = 0.08; u < 1; u += 0.08) { let q = fy(u, u, 0, 1); c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[3].x, q[3].y); c.stroke(); q = fx(u, u, 0, 1); c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[3].x, q[3].y); c.stroke(); }
  c.fillStyle = shade(wall, -0.42); poly(c, fy(0, 1, 0, 0.06)); c.fill(); poly(c, fx(0, 1, 0, 0.06)); c.fill();
  // pintu geser besar di sisi timur
  c.fillStyle = "#5a6f78"; poly(c, fx(0.28, 0.72, 0.03, 0.68)); c.fill();
  c.strokeStyle = "#3a4a50"; c.lineWidth = 1.2; poly(c, fx(0.28, 0.72, 0.03, 0.68)); c.stroke();
  for (const u of [0.39, 0.5, 0.61]) { const q = fx(u, u, 0.03, 0.68); c.beginPath(); c.moveTo(q[0].x, q[0].y); c.lineTo(q[3].x, q[3].y); c.stroke(); }
  c.fillStyle = "#2f3b40"; poly(c, fx(0.25, 0.75, 0.68, 0.72)); c.fill();
  // jendela kecil
  c.fillStyle = night > 0.35 ? "#ffd894" : "#a9c7cf"; for (const u of [0.22, 0.5, 0.78]) { poly(c, fy(u - 0.06, u + 0.06, 0.5, 0.72)); c.fill(); }
  // atap seng pelana (bubungan sejajar sumbu x)
  const zr = z0 + h, rh = 26, o2 = 0.22, ym = (y0 + y1) / 2;
  const roofS = [P(x0 - o2, y1 + o2, zr - 3), P(x1 + o2, y1 + o2, zr - 3), P(x1 + o2, ym, zr + rh), P(x0 - o2, ym, zr + rh)];
  c.fillStyle = b.roof; poly(c, roofS); c.fill();
  c.strokeStyle = shade(b.roof, -0.22); c.lineWidth = 1;
  for (let k = 0; k <= 1.001; k += 0.0625) { const a2 = P(x0 - o2 + (x1 - x0 + 2 * o2) * k, y1 + o2, zr - 3), b2 = P(x0 - o2 + (x1 - x0 + 2 * o2) * k, ym, zr + rh); c.beginPath(); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.stroke(); }
  c.fillStyle = shade(wall, -0.28); poly(c, [P(x1, y1, zr), P(x1, y0, zr), P(x1, ym, zr + rh)]); c.fill(); // ujung pelana
  c.fillStyle = shade(b.roof, -0.35); poly(c, [P(x1 + o2, y1 + o2, zr - 3), P(x1 + o2, ym, zr + rh), P(x1 + o2, ym, zr + rh - 3), P(x1 + o2, y1 + o2, zr - 6)]); c.fill();
  // papan nama
  const sp = P(x1 + 0.02, (y0 + y1) / 2, z0 + h * 0.86);
  c.fillStyle = "#173f50"; c.save(); c.translate(sp.x, sp.y); c.transform(1, -0.5, 0, 1, 0, 0); c.fillRect(-24, -6, 48, 12); c.fillStyle = "#e0b84c"; c.font = "800 7.5px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("GUDANG", 0, 0.5); c.restore();
}
for (const b of M.buildings) {
  if (b.kind === "gudang") b.draw = drawGudang;
  else if (b.kind === "pondok") b.draw = (c, bb, t, night) => NW.TOBA_DRAW.drawPondok(c, bb, t, night);
}

// ---------- Ilustrasi Buku Petualangan ----------
function bookArt(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.5); sky.addColorStop(0, "#79b8de"); sky.addColorStop(1, "#f3dcc0"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = "#6d8a86"; g.beginPath(); g.moveTo(70, h * 0.5); g.lineTo(88, h * 0.5 - 18); g.lineTo(93, h * 0.5 - 18); g.lineTo(112, h * 0.5); g.fill(); // gunung api kecil di kejauhan
  g.fillStyle = "rgba(240,240,240,.7)"; g.beginPath(); g.arc(92, h * 0.5 - 24, 4, 0, 7); g.arc(97, h * 0.5 - 29, 5, 0, 7); g.fill();
  g.fillStyle = "#2f7fa3"; g.fillRect(0, h * 0.5, w, h * 0.5);
  g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(8 + i * 30, h * 0.62 + i * 3); g.lineTo(24 + i * 30, h * 0.62 + i * 3); g.stroke(); }
  g.fillStyle = "#b27d48"; g.fillRect(0, h * 0.74, 64, 5); g.fillStyle = "#7d532c"; for (let x = 4; x < 64; x += 12) g.fillRect(x, h * 0.74 + 5, 3, 9);
  g.fillStyle = "#c9553b"; g.beginPath(); g.moveTo(20, h * 0.84); g.quadraticCurveTo(36, h * 0.92, 56, h * 0.84); g.closePath(); g.fill();
  g.fillStyle = "#f3efe6"; g.fillRect(14, h * 0.18, 7, 30); g.fillStyle = "#d84a3a"; g.fillRect(14, h * 0.18 + 6, 7, 6); g.fillRect(14, h * 0.18 + 18, 7, 6); g.beginPath(); g.moveTo(12, h * 0.18); g.lineTo(17.5, h * 0.18 - 6); g.lineTo(23, h * 0.18); g.fill();
}

// ---------- Penanda ❗ & petunjuk ----------
function markerFor(n) { return awaits(n.id); }
function placeMarkers() {
  const L = [], c = cur(); if (!c) return L;
  if (c.kind === "talk") { const n = byId(c.who); if (n.hidden) { const pt = M.points.find((p) => p.owner === n.id); L.push({ x: pt.x - 0.3, y: pt.y - 0.6, z: 70 }); } }
  if (c.key === "visit") { if (!NW.adv.isFound("selat:pasar")) L.push({ x: 21.5, y: 17.4, z: 70 }); if (!NW.adv.isFound("selat:gudang")) L.push({ x: 25.0, y: 24.4, z: 80 }); }
  return L;
}
function hint() {
  const c = cur(); if (!c) return "";
  if (c.kind === "talk") { const n = byId(c.who); return `📖 ${c.goal}${n.hidden ? " (ketuk pintu rumahnya)" : ""} ❗`; }
  if (c.key === "spots") return `📖 Spot laut ditemukan ${spotsFound()}/2 — naik kapal, ikuti burung, warna air, atau riak`;
  return `📖 ${c.goal}`;
}

// ---------- Tantangan Bagian 3: ikan di Arus Selat (mekanik mancing asli) ----------
// Saat tantangan aktif dan pemain memancing di spot Arus Selat: ±55% per gigitan menjadi ikan tantangan biasa
// (tongkol/tenggiri ukuran wajar). Bukan ikan legenda, tidak mengubah peluang ikan lain.
function challengeFish(perfect, locId) {
  if (locId !== "selat" || !at(3, 1) || N().seaSpot() !== "arus" || Math.random() > 0.55) return null;
  const tk = Math.random() < 0.7;
  return { fish: N().FISH_BY_ID[tk ? "tongkol" : "tenggiri"], w: +(tk ? 1.6 + Math.random() * 0.8 : 3.2 + Math.random() * 1.4).toFixed(2), wr: 0.3, quest: "selat", questName: "🏆 Tantangan Pak Hasan: ikan Arus Selat!" };
}
NW.adv.registerStory("selat", {
  key: "selat",
  defaults: () => ({ v: 1, bab: 1, step: 0, prog: {}, claimed: {}, doneAt: {} }),
  challengeFish,
  status() {
    const c = cur();
    return { title: "Jejak Arus Selat", done: done(), now: c ? `Bagian ${st().bab}: ${c.goal}` : "", chapters: [1, 2, 3].map((i) => ({ name: `Bagian ${i} — ${CH[i].name}`, done: st().bab > i, cur: st().bab === i })) };
  },
});
function hook() {
  N().on("fight", (r) => {
    if (r.quest !== "selat" || !at(3, 1)) return;
    if (r.result === "caught") { st().prog.arus = { id: r.fish.id, w: r.w, at: Date.now() }; N().save(); N().toast("🏆 Ikan Arus Selat didaratkan! Temui Pak Hasan ❗", "good"); advance(); }
    else { const p = st().prog; p.tries = (p.tries || 0) + 1; N().save(); N().toast("Ikannya lepas. Arus memang kuat — lempar lagi dengan sabar 🎣"); }
  });
  N().on("catch", (r) => { // ikan biasa apa pun (bukan sampah) dari spot Arus Selat juga menyelesaikan tantangan
    if (!at(3, 1) || r.sea !== "arus" || r.fish.rarity === "sampah" || r.fish.protected) return;
    st().prog.arus = { id: r.fish.id, w: r.w, at: Date.now() }; N().save(); N().toast("🏆 Ikan Arus Selat didaratkan! Temui Pak Hasan ❗", "good"); advance();
  });
}

// ---------- Pendaftaran area ----------
const area = NW.areas.register({
  id: "selat", name: "Pelabuhan Selat Sunda", loc: "selat", banner: "⚓ Pelabuhan Selat Sunda",
  map: M, idleLook: true,
  spawns: { start: M.START, boat: { x: 10.6, y: 20.5, dir: 3 } },
  theme: { deep: "#1d6f96", waterColor, landTile: coastTile(M.seaD), bookArt, sparkle: 0.34, jumpCols: ["#35557e", "#4f7aa0", "#cc4b3f", "#5d7f9c"] },
  firstVisitNote: { id: "selat:tiba", area: "selat", title: "Tiba di Pelabuhan Selat Sunda", text: "Dermaga kayunya panjang menjorok ke laut. Perahu-perahu warna-warni ditambat di dermaga kecil, mercusuar merah-putih berdiri di tanjung, dan bau ikan segar tercium dari pasar." },
  discoveries: [
    { id: "selat:dermaga", name: "Dermaga Pelabuhan", x: 11.0, y: 20.0, r: 3.2, desc: "Dermaga kayu panjang tempat kapal-kapal bersandar." },
    { id: "selat:pasar", name: "Pasar Ikan Selat", x: 21.5, y: 18.6, r: 2.0, desc: "Lapak Bu Ratna: ikan laut segar dan ikan asin." },
    { id: "selat:gudang", name: "Gudang Peralatan", x: 25.2, y: 24.4, r: 1.9, desc: "Gudang jaring, pelampung, dan mesin tempel yang diurus Arif." },
    { id: "selat:mercusuar", name: "Mercusuar Tanjung", x: 15.8, y: 5.5, r: 1.9, desc: "Mercusuar merah-putih yang menuntun perahu pulang." },
    { id: "selat:pantai", name: "Pantai Berbatu", x: 18.0, y: 34.0, r: 2.0, desc: "Pantai berbatu di ujung selatan, dilindungi deretan pemecah ombak." },
  ],
  npcs, acts,
  hooks: {
    interact, update, drawOver, markerFor, placeMarkers, hint,
    npcTalkable: (n) => !(n.cur && n.cur.act === "rstall" && n.arrived),
    fullMsg: "Coolbox-mu penuh. Jual dulu tangkapanmu di Pasar Ikan Bu Ratna, di timur dermaga.",
    onDiscover: () => checkTasks(),
    onEnter: () => checkTasks(),
  },
});
npcs.forEach((n) => { n.area = "selat"; n.talk = talk; });
NW.selat = { CH, npcs, hook, get state() { return st(); }, advance, checkTasks, awaits, storyTalk, finale, area, spotsFound };
})();
