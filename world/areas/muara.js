// =========================================================
//  NUSA ISLAND — Area "muara": NPC, interaksi, dan ambience Muara Kampung
//  (Bumbu 2: dipindahkan dari world.js tanpa mengubah perilaku, supaya mesin
//   dunia di world.js umum untuk semua area.)
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa, L = () => NW.life;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const area = NW.areas.get("muara");
const NAV = area.map.NAV;

// ---------- Gaya karakter NPC Muara ----------
const STYLE = {
  darto: { shirt: "#3d6f8f", pants: "#4a3b2c", skin: "#a8714a", hair: "#ddd6c8", hat: "caping", hatCol: "#c9a45c", towel: "#f3e7c9" },
  sari: { shirt: "#c2603b", pants: "#5b3a5c", skin: "#c99066", hair: "#2a1d14", hat: "scarf", hatCol: "#e0b84c", apron: "#fff6e4" },
  dika: { shirt: "#e2574c", pants: "#2f5d78", skin: "#c68b5e", hair: "#2a1d14", hat: "cap", hatCol: "#173f50", scale: 0.82 },
};

// ---------- NPC + jadwal harian ----------
// sched: from–to (jam), at = node tujuan, act = aktivitas, hide = masuk rumah
const npcs = [
  {
    id: "darto", name: "Pak Darto", avatar: "🧓", role: "Nelayan senior", style: STYLE.darto, speed: 1.15, seed: 1.3, home: "R2",
    sched: [
      { from: 5, to: 11, at: "DOCKF", act: "fish", face: 0, bubble: "🎣", label: "mancing di dermaga",
        lines: [["Pagi begini ikan nila lagi lapar-laparnya.", "Ujung dermaga paling bagus, Nak. Coba lempar jauh."], ["Ssst… jangan berisik, pelampungku baru goyang."]] },
      { from: 11, to: 13.5, at: "BENCH", act: "rest", face: 2, bubble: "☕", label: "istirahat di taman",
        lines: [["Siang-siang begini enaknya ngopi di taman.", "Kalau senar sudah tegang sekali, lepas dulu. Ikan juga capek."]] },
      { from: 13.5, to: 17.5, at: "NET", act: "net", face: 6, prop: "net", bubble: "🪢", label: "memperbaiki jaring",
        lines: [["Jaring ini robek digigit ikan toman kemarin.", "Ikan itu galak sekali. Hati-hati kalau dapat."], ["Malam-malam, kadang ada kilatan merah di muara.", "Orang bilang itu Arwana Super Red."]] },
      { from: 17.5, to: 21, at: "R2", act: "relax", face: 2, bubble: "🌇", label: "santai di depan rumah",
        lines: [["Senja di muara memang paling indah.", "Kapal di dermaga bisa bawa kamu ke Danau Toba kalau sudah punya perahu motor."]] },
      { from: 21, to: 5, at: "R2", act: "sleep", hide: true },
    ],
    knock: ["Tok tok tok…", "\"Zzz… besok pagi saja ya, Nak. Pak Darto sudah tidur.\""],
    close: ["Kamu sudah seperti anakku sendiri. Ini rahasia: lele suka keluar setelah jam tujuh malam."],
  },
  {
    id: "sari", name: "Bu Sari", avatar: "👩", role: "Pedagang ikan", style: STYLE.sari, speed: 0.85, seed: 2.1, home: "R3",
    sched: [
      { from: 6, to: 17, at: "STALL", act: "stall", face: 2, prop: "basket", bubble: "🐟", label: "berjualan di pasar", lines: [["Ikan segaaar! Mau jual tangkapanmu ke Ibu?"]] },
      { from: 17, to: 19, at: "O", act: "sweep", face: 2, prop: "broom", bubble: "🧹", label: "menyapu halaman",
        lines: [["Pasar sudah tutup, Ibu lagi bersih-bersih.", "Kalau mau jual ikan, pakai kotak titipan di pasar ya. Besok Ibu bayar sama."]] },
      { from: 19, to: 6, at: "R3", act: "sleep", hide: true },
    ],
    knock: ["Tok tok tok…", "\"Sudah malam, Nak. Kotak titipan di pasar tetap buka kok.\""],
    close: ["Kamu langganan terbaik Ibu! Kalau ada panah hijau di pasar, itu tanda harga lagi bagus."],
  },
  {
    id: "dika", name: "Dika", avatar: "👦", role: "Anak kampung", style: STYLE.dika, speed: 1.6, seed: 3.7, home: "R4",
    sched: [
      { from: 7, to: 11.5, at: "PARK", act: "butterfly", bubble: "🦋", label: "mengejar kupu-kupu",
        lines: [["Kak, lihat! Kupu-kupunya kuning!", "Aku mau tangkap satu, tapi cepat banget terbangnya."], ["Kalau pelampung goyang sedikit, itu belum gigit beneran.", "Tunggu sampai tenggelam, baru tarik!"]] },
      { from: 11.5, to: 13, at: "R4", act: "lunch", hide: true },
      { from: 13, to: 17, at: "BEACH", act: "kite", face: 0, bubble: "🪁", label: "main layangan di pantai",
        lines: [["Anginnya kencang, layanganku tinggi sekali!", "Kemarin aku mancing dapat sandal jepit. Sebelah doang, hahaha."]] },
      { from: 17, to: 19, at: "WELL", act: "well", face: 1, bubble: "💧", label: "ambil air di sumur",
        lines: [["Disuruh Ibu ambil air.", "Kata Pak Darto, kapal di dermaga bisa ke Danau Toba!"]] },
      { from: 19, to: 7, at: "R4", act: "sleep", hide: true },
    ],
    knock: ["Tok tok tok…", "\"Dika sudah tidur, besok main lagi ya!\" kata ibunya."],
    close: ["Kak, aku sudah bisa lemparan sempurna! Lepas pas meterannya di atas, kan?"],
  },
];
const roleOf = (n) => `${n.role} · ${L().hearts(n.id)}`;

// ---------- Bicara dengan NPC Muara ----------
function talk(n, api) {
  const S = N().S, a = n.cur, openDialog = api.openDialog;
  NW.story.mark("talk");
  // cerita Pak Darto didahulukan (terpisah dari misi harian)
  if (NW.story.handleTalk(n, openDialog, roleOf(n))) { L().talked(n.id); return; }
  // kalimat biasa: bersyarat & tidak mengulang (ingatan disimpan lokal)
  let lines = (NW.story.storyLineFor(n) || NW.story.chatLines(n, (a.lines || []).concat((S.friends[n.id] || 0) >= 2 ? [n.close] : []))).slice();
  const rem = NW.story.reminder(n); if (rem) lines.push(rem);
  const opts = [];
  const so = n.id === "sari" ? NW.story.sariOption(openDialog, n, roleOf(n)) : null; if (so) opts.push(so);
  const del = L().deliverOption(n.id);
  if (del && del.missing) lines = lines.concat([del.text]);
  else if (del) { lines = lines.concat([`Wah, itu ${del.label.replace("🎁 Berikan ", "")} di coolbox-mu? Boleh buat ${n.id === "dika" ? "aku" : "saya"}?`]); opts.push({ label: del.label, act: () => { del.act(); openDialog({ name: n.name, avatar: n.avatar, role: roleOf(n), npc: n, lines: [n.id === "dika" ? "Asyik! Makasih, Kak!" : "Terima kasih banyak, Nak. Kamu baik sekali."] }); } }); }
  openDialog({ name: n.name, avatar: n.avatar, role: roleOf(n), lines, npc: n, options: opts });
  L().talked(n.id);
}
npcs.forEach((n) => { n.area = "muara"; n.talk = talk; });

// ---------- Interaksi tempat di Muara ----------
function interact(t, api) {
  const S = N().S, openDialog = api.openDialog;
  if (t.story) return NW.story.interact(t, openDialog);
  if (t.id === "boat") return N().openPanel("map");
  if (t.id === "board") return N().openPanel("missions");
  if (t.id === "home") return NW.home.enter(api.player);
  if (t.id === "pasar") {
    const n = npcs[1], open = !n.hidden && n.cur.act === "stall" && n.arrived;
    if (open) {
      const lines = S.cooler.length ? [`Wah, kamu bawa ${S.cooler.length} tangkapan! Mau dijual ke Ibu?`] : ["Coolbox-mu masih kosong. Mancing dulu di dermaga, nanti jual ke Ibu ya!"];
      const tip = N().marketTip(); if (tip) lines.push(tip);
      const del = L().deliverOption("sari");
      const opts = [{ label: "🏪 Jual ikan", act: () => N().openPanel("market") }];
      const so = NW.story.sariOption(openDialog, n, roleOf(n)); if (so) opts.push(so);
      NW.story.mark("talk");
      if (del && !del.missing) opts.unshift({ label: del.label, act: () => { del.act(); openDialog({ name: n.name, avatar: n.avatar, role: roleOf(n), npc: n, lines: ["Terima kasih banyak, Nak. Ini buat lauk makan malam!"] }); } });
      openDialog({ name: n.name, avatar: n.avatar, role: roleOf(n), npc: n, lines, options: opts });
      L().talked("sari");
    } else openDialog({ name: "Kotak Titipan", avatar: "📦", lines: ["Pasar sedang tutup. Bu Sari buka lagi pukul 06:00.", "Ada kotak titipan: ikanmu tetap dibayar dengan harga hari ini."], options: [{ label: "📦 Titip jual", act: () => N().openPanel("market") }] });
    return;
  }
  if (t.id === "toko") {
    const lines = ["Selamat datang di Toko Pancing! Mau upgrade alat?"];
    if (S.up.boat === 0) lines.push("Perahu motor bisa bawa kamu ke Danau Toba, lho. Ikannya lebih besar di sana.");
    const to = NW.story.tokoOption(openDialog);
    openDialog({ name: "Pak Bono", avatar: "👨‍🔧", role: "Pemilik toko", lines, options: [{ label: "🛠️ Lihat barang", act: () => N().openPanel("shop") }].concat(to ? [to] : []) });
    return;
  }
  if (t.owner) {
    const n = npcs.find((x) => x.id === t.owner);
    const b = area.map.buildings.find((x) => x.id === t.id);
    if (n.hidden && n.id === "darto" && NW.story.awaitsDarto()) { // cerita tidak harus menunggu pagi
      openDialog({ name: b.name, avatar: "🏠", lines: ["Tok tok tok…", "Pintu berderit. Pak Darto keluar sambil menguap. \"Baru mau tidur… ya sudah, sini sebentar, Nak.\""], options: [{ label: "📖 Lanjut cerita", act: () => NW.story.handleTalk(n, openDialog, roleOf(n)) }] });
    } else if (n.hidden) openDialog({ name: b.name, avatar: "🏠", lines: n.knock });
    else openDialog({ name: b.name, avatar: "🏠", lines: ["Tok tok tok…", `Tidak ada yang menjawab. ${n.name} sedang ${n.cur.label || "di luar"}.`] });
  }
}

// ---------- Aktivitas khusus di tempat ----------
const butterflies = [];
for (let i = 0; i < 5; i++) butterflies.push({ x: 15.5 + Math.random() * 2, y: 15 + Math.random() * 2, ph: Math.random() * 6, col: ["#ffd84d", "#ffffff", "#ff9ec4", "#9fd3ff"][i % 4], tx: 16, ty: 16 });
const acts = {
  stall(n, dt, a, k) { // mondar-mandir di belakang meja
    n.waitT -= dt; if (n.waitT > 0) { n.dir = 2; return; }
    const spots = [[NAV.STALL[0], 18.3], [NAV.STALL[0] - 1.6, 18.35], [NAV.STALL[0] - 0.8, 18.25]];
    const s = spots[n.alt % 3];
    if (k.walkTo(n, s[0], s[1], dt)) { n.alt++; n.waitT = rand(2.5, 5); n.dir = 2; }
  },
  butterfly(n, dt, a, k) { // kejar kupu-kupu di sekitar taman
    const PARK = area.map.PARK;
    if (!n.wander || n.waitT > 0) {
      n.waitT -= dt;
      if (n.waitT <= 0 || !n.wander) {
        n.wander = null; n.waitT = 0;
        for (let i = 0; i < 12 && !n.wander; i++) { // cari titik dekat kupu-kupu yang tidak menginjak bunga/pohon
          const bf = butterflies[Math.floor(Math.random() * butterflies.length)], x = bf.x + rand(-0.6, 0.6), y = bf.y + rand(0, 0.8);
          if (x > PARK.x0 - 0.5 && x < PARK.x1 + 1 && y > PARK.y0 && y < PARK.y1 + 1 && area.map.walkable(x, y, 0.3)) n.wander = { x, y };
        }
        if (!n.wander) n.wander = { x: NAV.PARK[0], y: NAV.PARK[1] };
      }
      return;
    }
    if (k.walkTo(n, n.wander.x, n.wander.y, dt)) { n.wander = null; n.waitT = rand(1, 2.5); }
  },
  sweep(n) { n.dir = Math.sin(N().S.hour * 40) > 0 ? 1 : 3; },
};

// ---------- Ambience Muara ----------
const sail = { t: Math.random() * 60 };
function update(dt) {
  const PARK = area.map.PARK;
  for (const b of butterflies) {
    if (Math.hypot(b.tx - b.x, b.ty - b.y) < 0.2) { b.tx = PARK.x0 + Math.random() * 3.6; b.ty = PARK.y0 + Math.random() * 3.6; }
    b.x = lerp(b.x, b.tx, dt * 0.6); b.y = lerp(b.y, b.ty, dt * 0.6);
  }
  sail.t += dt;
}
function drawUnder(c, t, view, inView) { // perahu layar jauh di timur
  const k = (sail.t * 0.018) % 1, x = 36.5, y = -4 + k * 48;
  const p = NW.P(x, y); if (!inView(view, p.x, p.y)) return;
  const bob = Math.sin(t * 1.3) * 1.2;
  c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x + 14, p.y + 4); c.lineTo(p.x + 40, p.y - 8); c.stroke();
  c.fillStyle = "#7a5230"; c.beginPath(); c.moveTo(p.x - 18, p.y - 6 + bob); c.quadraticCurveTo(p.x, p.y + 8 + bob, p.x + 18, p.y + 2 + bob); c.lineTo(p.x - 18, p.y - 6 + bob); c.fill();
  c.fillStyle = "#fff6e4"; c.beginPath(); c.moveTo(p.x - 2, p.y - 4 + bob); c.lineTo(p.x - 2, p.y - 36 + bob); c.lineTo(p.x + 14, p.y - 6 + bob); c.fill();
  c.fillStyle = "#e2574c"; c.beginPath(); c.moveTo(p.x - 4, p.y - 6 + bob); c.lineTo(p.x - 4, p.y - 30 + bob); c.lineTo(p.x - 16, p.y - 8 + bob); c.fill();
}
function drawOver(c, t, dk) {
  const dika = npcs[2]; if (!dika.hidden && dika.arrived && dika.cur.act === "kite") NW.drawKite(c, dika, t);
  for (const bf of butterflies) if (dk < 0.5) NW.drawButterfly(c, bf, t);
}

// ---------- Titik penemuan Muara (Buku Petualangan) ----------
const M = area.map, E = M.SHORE_E, pasar = M.buildings.find((b) => b.id === "pasar");
const discoveries = [
  { id: "muara:dermaga", name: "Dermaga Muara", x: E + 0.5, y: 20.6, r: 2.0, desc: "Ujung dermaga tempat semua pemancing memulai." },
  { id: "muara:pasar", name: "Pasar Ikan Bu Sari", x: (pasar.x0 + pasar.x1) / 2, y: pasar.y1 + 0.9, r: 1.8, desc: "Tenda belang merah-putih tempat tangkapan dijual." },
  { id: "muara:taman", name: "Taman Kampung", x: 15.8, y: 15.8, r: 2.0, desc: "Bangku, sumur tua, dan kupu-kupu kuning." },
  { id: "muara:pantai", name: "Pantai Layangan", x: 19.4, y: 28.6, r: 2.0, desc: "Pantai selatan tempat Dika bermain layangan." },
];
// cerita daerah Muara = Pak Darto & Joran Warisan (Bumbu 1), hanya dibaca untuk Buku Petualangan
if (NW.adv) NW.adv.registerStory("muara", {
  status() {
    const s = NW.story.state, CH = NW.story.CH, done = s.ch > 4;
    const step = !done && CH[s.ch] ? CH[s.ch].steps[s.step] : null;
    return { title: "Pak Darto & Joran Warisan", done, now: step ? `Bab ${s.ch}: ${step.goal}` : "", chapters: [1, 2, 3, 4].map((i) => ({ name: `Bab ${i} — ${CH[i].name}`, done: s.ch > i, cur: s.ch === i })) };
  },
});

Object.assign(area, {
  npcs, acts, STYLE, butterflies, discoveries,
  hooks: {
    points: () => (NW.story ? NW.story.points() : []),
    npcTalkable: (n) => n.cur && n.cur.act !== "stall",
    interact, update, drawUnder, drawOver,
    layer: (t) => NW.story.layerObjects(t), // sudut nelayan (progres pribadi)
    markerFor: (n) => NW.story.markerFor(n),
    placeMarkers: () => NW.story.placeMarkers(),
    hint: () => (NW.story ? NW.story.hint() : ""),
  },
});
})();
