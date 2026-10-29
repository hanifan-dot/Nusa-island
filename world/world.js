// =========================================================
//  NUSA ISLAND — Island Life: pemain, NPC, kamera, input, dialog
//  Dipanggil oleh game.js saat mode "world". Mode "fish" tetap memakai
//  sistem mancing lama tanpa perubahan mekanik.
//  Tahap 2A: jadwal NPC per jam, misi & pertemanan, Rumahku.
// =========================================================
(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const HW = NW.TW / 2, HH = NW.TH / 2;
const N = () => window.Nusa; // API dari game.js
const L = () => NW.life;      // misi & pertemanan
const inHome = () => NW.home && NW.home.active;

// ---------- Gaya karakter ----------
const STYLE = {
  player: { shirt: "#579b8b", pants: "#2b3a44", skin: "#c68b5e", hair: "#2a1d14", hat: "caping", collar: "#fff9ec" },
  darto: { shirt: "#3d6f8f", pants: "#4a3b2c", skin: "#a8714a", hair: "#ddd6c8", hat: "caping", hatCol: "#c9a45c", towel: "#f3e7c9" },
  sari: { shirt: "#c2603b", pants: "#5b3a5c", skin: "#c99066", hair: "#2a1d14", hat: "scarf", hatCol: "#e0b84c", apron: "#fff6e4" },
  dika: { shirt: "#e2574c", pants: "#2f5d78", skin: "#c68b5e", hair: "#2a1d14", hat: "cap", hatCol: "#173f50", scale: 0.82 },
};

// ---------- Pemain ----------
const player = { x: NW.START.x, y: NW.START.y, dir: 2, walk: 0, moving: false, style: STYLE.player, rod: 0, seed: 0 };

// ---------- Navigasi NPC (Dijkstra di jaringan jalan) ----------
const NAV = NW.NAV, ADJ = {};
for (const k of Object.keys(NAV)) ADJ[k] = [];
for (const [a, b] of NW.NAV_EDGES) { const d = Math.hypot(NAV[a][0] - NAV[b][0], NAV[a][1] - NAV[b][1]); ADJ[a].push([b, d]); ADJ[b].push([a, d]); }
function nearestNode(x, y) { let best = null, bd = 1e9; for (const [k, [nx, ny]] of Object.entries(NAV)) { const d = Math.hypot(nx - x, ny - y); if (d < bd) { bd = d; best = k; } } return best; }
function route(x, y, goal) {
  const start = nearestNode(x, y), dist = { [start]: 0 }, prev = {}, todo = new Set(Object.keys(NAV));
  while (todo.size) {
    let u = null; for (const k of todo) if (dist[k] !== undefined && (u === null || dist[k] < dist[u])) u = k;
    if (u === null || u === goal) break; todo.delete(u);
    for (const [v, w] of ADJ[u]) { const nd = dist[u] + w; if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prev[v] = u; } }
  }
  const path = []; let k = goal; while (k && k !== start) { path.unshift(NAV[k]); k = prev[k]; }
  path.unshift(NAV[start]);
  return path.map(([px, py]) => ({ x: px, y: py }));
}

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
const actNow = (n, h) => n.sched.find((a) => (a.from < a.to ? h >= a.from && h < a.to : h >= a.from || h < a.to)) || n.sched[0];
function placeNPC(n) { // taruh langsung di aktivitas saat ini (saat memuat game)
  const a = actNow(n, N() ? N().S.hour : 8), [x, y] = NAV[a.at];
  Object.assign(n, { x, y, cur: a, path: [], hidden: !!a.hide, arrived: true, dir: a.face ?? 2, walk: 0, moving: false, waitT: 0, rod: a.act === "fish" ? 1 : 0, talking: false, li: 0, alt: 0 });
}
npcs.forEach((n) => Object.assign(n, { x: NAV[n.home][0], y: NAV[n.home][1], cur: null, path: [], hidden: true, dir: 2, walk: 0, rod: 0, li: 0 }));

// ---------- Kamera & layar ----------
let W = 0, H = 0, DPR = 1, Z = 1, ZI = 1, ZW = 1; // ZI = zoom di dalam rumah, ZW = zoom di pulau
const cam = { x: 0, y: 0 };
function resize(w, h, dpr) {
  W = w; H = h; DPR = dpr;
  ZW = Z = clamp(Math.min(W, H) / 430, 0.9, 1.55);
  // ruangan Rumahku (lebar ±450px dunia, tinggi ±380px) harus muat utuh di layar
  ZI = clamp(Math.min((W - 24) / 470, (H - 220) / 400), 0.6, 1.6);
  if (inHome()) Z = ZI;
  const want = Math.min(Z * DPR, 1.75);
  if (Math.abs(want - NW.getTerrainScale()) > 0.15) NW.buildTerrain(want);
}
function camTarget() {
  if (inHome()) { const ct = NW.home.camTarget(player, W, H, ZW); Z = ct.z; return ct; }
  Z = ZW;
  const p = NW.P(player.x, player.y, NW.LIFT); return { x: p.x, y: p.y - 22 - (NW.hold ? NW.hold.camLift() : 0) };
}
function snapCamera() { const t = camTarget(); cam.x = t.x; cam.y = t.y; }

// ---------- Input ----------
const joy = { active: false, id: null, bx: 0, by: 0, kx: 0, ky: 0, vx: 0, vy: 0 };
const keys = new Set();
let moved = false;
const joyEl = $("joy"), knobEl = $("joyKnob");
function joyHome() { const r = joyEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function blocked() { return dialog.open || busy || N().isPanelOpen() || !N().isStarted() || $("fade").classList.contains("on") || (NW.home && NW.home.isEditing()); }

function onDown(e) {
  if (N().mode() !== "world") return;
  if (dialog.open) { advanceDialog(); return; }
  if (blocked()) return;
  if (e.clientX < W * 0.6 && !joy.active) {
    const home = joyHome();
    joy.active = true; joy.id = e.pointerId;
    if (Math.hypot(e.clientX - home.x, e.clientY - home.y) < 110) { joy.bx = home.x; joy.by = home.y; }
    else { joy.bx = e.clientX; joy.by = e.clientY; }
    joyEl.classList.add("on");
    joyEl.style.transform = `translate(${joy.bx - home.x}px, ${joy.by - home.y}px)`;
    onMove(e);
  }
}
function onMove(e) {
  if (!joy.active || e.pointerId !== joy.id) return;
  const R = 46; let dx = e.clientX - joy.bx, dy = e.clientY - joy.by;
  const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
  joy.kx = dx; joy.ky = dy;
  const m = Math.min(1, d / R); joy.vx = d > 6 ? (dx / (d || 1)) * m : 0; joy.vy = d > 6 ? (dy / (d || 1)) * m : 0;
  knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
}
function onUp(e) {
  if (!joy.active || (e && e.pointerId !== joy.id)) return;
  joy.active = false; joy.vx = joy.vy = 0;
  knobEl.style.transform = ""; joyEl.style.transform = ""; joyEl.classList.remove("on");
}
const cv = $("game");
cv.addEventListener("pointerdown", onDown);
window.addEventListener("pointermove", onMove);
window.addEventListener("pointerup", onUp);
window.addEventListener("pointercancel", onUp);
window.addEventListener("keydown", (e) => {
  if (N().mode() !== "world") return;
  const k = e.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { keys.add(k); e.preventDefault(); }
  if ((k === "e" || k === "enter" || k === " ") && !e.repeat) { e.preventDefault(); if (dialog.open) advanceDialog(); else interact(); }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => { keys.clear(); onUp(); });
$("actBtn").addEventListener("click", (e) => { e.stopPropagation(); interact(); });

function inputVec() {
  let x = joy.vx, y = joy.vy;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (keys.has("w") || keys.has("arrowup")) y -= 1;
  if (keys.has("s") || keys.has("arrowdown")) y += 1;
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
  return { x, y, m: Math.min(1, m) };
}
function screenToWorld(dx, dy) { return { x: (dx / HW + dy / HH) / 2, y: (dy / HH - dx / HW) / 2 }; }
const dirOf = (sx, sy) => ((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) % 8) + 8) % 8;

// ---------- Dialog ----------
const dialog = { open: false, lines: [], i: 0, shown: 0, opts: [], npc: null };
const dlgEl = $("dlg");
function openDialog({ name, avatar, role, lines, options, npc }) {
  Object.assign(dialog, { open: true, lines, i: 0, shown: 0, opts: options || [], npc: npc || null, name });
  $("dlgName").textContent = name; $("dlgRole").textContent = role || ""; $("dlgAvatar").textContent = avatar || "💬";
  $("dlgOpts").innerHTML = ""; dlgEl.classList.remove("hidden");
  if (npc) { npc.talking = true; npc.moving = false; faceToward(npc, player); faceToward(player, npc); }
  onUp(); N().sfx("click");
}
function advanceDialog() {
  const line = dialog.lines[dialog.i] || "";
  if (dialog.shown < line.length) { dialog.shown = line.length; return; }
  if (dialog.i < dialog.lines.length - 1) { dialog.i++; dialog.shown = 0; N().sfx("click"); return; }
  if (!dialog.opts.length) closeDialog();
}
function closeDialog() {
  dialog.open = false; dlgEl.classList.add("hidden");
  if (dialog.npc) dialog.npc.talking = false; dialog.npc = null;
}
function renderDialog(dt) {
  if (!dialog.open) return;
  const line = dialog.lines[dialog.i] || "";
  if (dialog.shown < line.length) dialog.shown = Math.min(line.length, dialog.shown + dt * 45);
  $("dlgText").textContent = line.slice(0, Math.floor(dialog.shown));
  const last = dialog.i === dialog.lines.length - 1 && dialog.shown >= line.length;
  const optsEl = $("dlgOpts");
  if (last && !optsEl.childElementCount) {
    const opts = dialog.opts.length ? dialog.opts : [{ label: "Tutup", ghost: true }];
    for (const o of opts) {
      const b = document.createElement("button"); b.className = "btn" + (o.ghost ? " ghost" : " gold"); b.textContent = o.label;
      b.addEventListener("click", (e) => { e.stopPropagation(); closeDialog(); if (o.act) o.act(); });
      optsEl.appendChild(b);
    }
    if (dialog.opts.length) { const b = document.createElement("button"); b.className = "btn ghost"; b.textContent = "Nanti saja"; b.addEventListener("click", (e) => { e.stopPropagation(); closeDialog(); }); optsEl.appendChild(b); }
  }
  $("dlgMore").classList.toggle("hidden", last);
}
dlgEl.addEventListener("click", () => { if (dialog.open) advanceDialog(); });
function faceToward(a, b) { const pa = NW.P(a.x, a.y), pb = NW.P(b.x, b.y); a.dir = dirOf(pb.x - pa.x, pb.y - pa.y); }

// ---------- Interaksi ----------
let target = null, busy = false, busyT = 0;
function islandCandidates() {
  const list = NW.points.slice().concat(NW.story ? NW.story.points() : []);
  for (const n of npcs) if (!n.hidden && n.cur && n.cur.act !== "stall") list.push({ id: "npc:" + n.id, x: n.x, y: n.y, r: 1.15, icon: "💬", label: "Bicara", npc: n });
  return list;
}
const candidates = () => (inHome() ? NW.home.candidates() : islandCandidates());
const walkable = (x, y) => (inHome() ? NW.home.walkable(x, y) : NW.walkable(x, y));
function findTarget() {
  let best = null, bestS = 1e9;
  for (const p of candidates()) {
    const d = Math.hypot(player.x - p.x, player.y - p.y);
    if (d > p.r) continue;
    const s = d / p.r - (p.npc ? 0.45 : 0); /* NPC didahulukan */ if (s < bestS) { bestS = s; best = p; }
  }
  return best;
}
let lastActKey = "";
function updateActBtn() {
  const btn = $("actBtn"), key = target ? target.id + target.label : "";
  if (key === lastActKey) return; lastActKey = key;
  if (!target) { btn.classList.add("hidden"); return; }
  btn.classList.remove("hidden");
  btn.innerHTML = `<span>${target.icon}</span><b>${target.label}</b>`;
}
const roleOf = (n) => `${n.role} · ${L().hearts(n.id)}`;
function talkTo(n) {
  const S = N().S, a = n.cur;
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
function interact() {
  if (blocked() || !target) return;
  const t = target, S = N().S;
  if (inHome()) return NW.home.interact(t, player, openDialog);
  if (t.npc) return talkTo(t.npc);
  if (t.story) return NW.story.interact(t, openDialog);
  if (t.id === "spot") {
    if (N().coolerFull()) { openDialog({ name: "Coolbox penuh", avatar: "🧊", lines: ["Coolbox-mu sudah penuh. Jual dulu tangkapanmu di Pasar Ikan, di sebelah barat dermaga."] }); return; }
    startFishing();
  } else if (t.id === "boat") N().openPanel("map");
  else if (t.id === "board") N().openPanel("missions");
  else if (t.id === "home") NW.home.enter(player);
  else if (t.id === "pasar") {
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
  } else if (t.id === "toko") {
    const lines = ["Selamat datang di Toko Pancing! Mau upgrade alat?"];
    if (S.up.boat === 0) lines.push("Perahu motor bisa bawa kamu ke Danau Toba, lho. Ikannya lebih besar di sana.");
    const to = NW.story.tokoOption(openDialog);
    openDialog({ name: "Pak Bono", avatar: "👨‍🔧", role: "Pemilik toko", lines, options: [{ label: "🛠️ Lihat barang", act: () => N().openPanel("shop") }].concat(to ? [to] : []) });
  } else if (t.owner) {
    const n = npcs.find((x) => x.id === t.owner);
    const b = NW.buildings.find((x) => x.id === t.id);
    if (n.hidden && n.id === "darto" && NW.story.awaitsDarto()) { // cerita tidak harus menunggu pagi
      openDialog({ name: b.name, avatar: "🏠", lines: ["Tok tok tok…", "Pintu berderit. Pak Darto keluar sambil menguap. \"Baru mau tidur… ya sudah, sini sebentar, Nak.\""], options: [{ label: "📖 Lanjut cerita", act: () => NW.story.handleTalk(n, openDialog, roleOf(n)) }] });
    } else if (n.hidden) openDialog({ name: b.name, avatar: "🏠", lines: n.knock });
    else openDialog({ name: b.name, avatar: "🏠", lines: ["Tok tok tok…", `Tidak ada yang menjawab. ${n.name} sedang ${n.cur.label || "di luar"}.`] });
  } else if (t.sign) openDialog({ name: t.sign.title, avatar: "📜", lines: [t.sign.text] });
}

// ---------- Masuk mode mancing ----------
let fadeStarted = false;
function startFishing() { if (NW.hold) NW.hold.stop("fishing"); busy = true; busyT = 0; onUp(); keys.clear(); player.dir = 0; N().sfx("click"); }
function updateBusy(dt) {
  busyT += dt;
  player.rod = clamp(busyT / 0.55, 0, 1);
  if (busyT > 0.7 && !fadeStarted) {
    fadeStarted = true;
    $("fade").classList.add("on");
    setTimeout(() => {
      N().S.world = { x: +player.x.toFixed(2), y: +player.y.toFixed(2) };
      N().enterFishing("dock");
      setTimeout(() => $("fade").classList.remove("on"), 60);
      busy = false; fadeStarted = false; player.rod = 0;
    }, 320);
  }
}
// Dipanggil game.js saat kembali ke darat
function onEnter(at) {
  busy = false; fadeStarted = false; player.rod = 0; closeDialog();
  if (NW.home) NW.home.reset();
  const S = N().S;
  if (at === "dock") { player.x = NW.SPOT.x - 1.1; player.y = NW.SPOT.y; player.dir = 4; }
  else if (at === "boat") { player.x = NW.BOAT.x; player.y = NW.DOCK.y1 + 0.6; player.dir = 5; }
  else if (S.world && NW.walkable(S.world.x, S.world.y)) { player.x = S.world.x; player.y = S.world.y; }
  else { player.x = NW.START.x; player.y = NW.START.y; }
  if (at === "start") npcs.forEach(placeNPC);
  snapCamera(); lastActKey = "?"; showBanner();
}
let bannerT = 0;
function showBanner() { const b = $("banner"); b.textContent = "🏝️ Muara Kampung"; b.classList.add("show"); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove("show"), 2200); }

// ---------- Ambience ----------
const birds = [], jumps = [], butterflies = [];
for (let i = 0; i < 5; i++) butterflies.push({ x: 15.5 + Math.random() * 2, y: 15 + Math.random() * 2, ph: Math.random() * 6, col: ["#ffd84d", "#ffffff", "#ff9ec4", "#9fd3ff"][i % 4], tx: 16, ty: 16 });
let birdT = 2, jumpT = 3;
const sail = { t: Math.random() * 60 };
function updateAmbient(dt) {
  birdT -= dt;
  if (birdT <= 0 && birds.length < 3) {
    birdT = rand(4, 9);
    const fromLeft = Math.random() < 0.5, px = player.x + rand(-6, 6), py = player.y + rand(-6, 6);
    const vx = rand(1.2, 2) * (fromLeft ? 1 : -1), vy = rand(-0.6, 0.6);
    birds.push({ x: px - vx * 6, y: py - vy * 6 + (fromLeft ? 6 : -6), vx, vy, z: rand(70, 120), ph: rand(0, 6), life: 14 });
  }
  for (const b of birds) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
  for (let i = birds.length - 1; i >= 0; i--) if (birds[i].life <= 0) birds.splice(i, 1);
  jumpT -= dt;
  if (jumpT <= 0) {
    jumpT = rand(1.8, 4.5);
    for (let k = 0; k < 12; k++) {
      const x = player.x + rand(-9, 9), y = player.y + rand(-9, 9);
      if (!NW.isLandT(NW.tileAt(x, y)) && !NW.isLandT(NW.tileAt(x + 1, y)) && !NW.isLandT(NW.tileAt(x, y + 1))) { jumps.push({ x, y, t: 0, dur: 0.9, col: ["#8c9a8a", "#9aa3a8", "#d79a2e", "#5d7f9c"][k % 4] }); break; }
    }
  }
  for (const j of jumps) j.t += dt;
  for (let i = jumps.length - 1; i >= 0; i--) if (jumps[i].t > jumps[i].dur * 1.6) jumps.splice(i, 1);
  for (const b of butterflies) {
    if (Math.hypot(b.tx - b.x, b.ty - b.y) < 0.2) { b.tx = NW.PARK.x0 + Math.random() * 3.6; b.ty = NW.PARK.y0 + Math.random() * 3.6; }
    b.x = lerp(b.x, b.tx, dt * 0.6); b.y = lerp(b.y, b.ty, dt * 0.6);
  }
  sail.t += dt;
}

// ---------- Update NPC ----------
function walkTo(n, tx, ty, dt) {
  const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
  if (d < 0.05) { n.x = tx; n.y = ty; return true; }
  const step = Math.min(d, n.speed * dt);
  n.x += (dx / d) * step; n.y += (dy / d) * step;
  const a = NW.P(0, 0), b = NW.P(dx, dy); n.dir = dirOf(b.x - a.x, b.y - a.y);
  n.moving = true; n.walk += dt * 10 * n.speed / 1.2;
  return false;
}
function updateNPC(n, dt) {
  const a = actNow(n, N().S.hour);
  if (a !== n.cur) { // ganti aktivitas: keluar rumah (bila perlu) lalu jalan ke tujuan
    if (n.hidden) { n.x = NAV[n.home][0]; n.y = NAV[n.home][1]; n.hidden = false; }
    n.cur = a; n.path = route(n.x, n.y, a.at); n.arrived = false; n.fishing = false; n.prop = null; n.waitT = 0;
  }
  n.rod = lerp(n.rod, n.fishing ? 1 : 0, dt * 4);
  n.moving = false;
  if (n.hidden || n.talking) return;
  if (!n.arrived) {
    if (!inHome() && Math.hypot(player.x - n.x, player.y - n.y) < 0.5) { faceToward(n, player); return; } // tunggu pemain lewat
    const p = n.path[0];
    if (!p) { n.arrived = true; }
    else if (walkTo(n, p.x, p.y, dt)) n.path.shift();
    if (n.arrived) {
      if (a.hide) { n.hidden = true; return; }
      n.dir = a.face ?? n.dir; n.fishing = a.act === "fish"; n.prop = a.prop || null; n.waitT = rand(1, 3);
    }
    return;
  }
  // aktivitas di tempat
  n.prop = a.prop || null;
  if (a.act === "stall") { // mondar-mandir di belakang meja
    n.waitT -= dt; if (n.waitT > 0) { n.dir = 2; return; }
    const spots = [[NAV.STALL[0], 18.3], [NAV.STALL[0] - 1.6, 18.35], [NAV.STALL[0] - 0.8, 18.25]];
    const s = spots[n.alt % 3];
    if (walkTo(n, s[0], s[1], dt)) { n.alt++; n.waitT = rand(2.5, 5); n.dir = 2; }
  } else if (a.act === "butterfly") { // kejar kupu-kupu di sekitar taman
    if (!n.wander || n.waitT > 0) {
      n.waitT -= dt;
      if (n.waitT <= 0 || !n.wander) {
        n.wander = null; n.waitT = 0;
        for (let i = 0; i < 12 && !n.wander; i++) { // cari titik dekat kupu-kupu yang tidak menginjak bunga/pohon
          const bf = butterflies[Math.floor(Math.random() * butterflies.length)], x = bf.x + rand(-0.6, 0.6), y = bf.y + rand(0, 0.8);
          if (x > NW.PARK.x0 - 0.5 && x < NW.PARK.x1 + 1 && y > NW.PARK.y0 && y < NW.PARK.y1 + 1 && NW.walkable(x, y, 0.3)) n.wander = { x, y };
        }
        if (!n.wander) n.wander = { x: NAV.PARK[0], y: NAV.PARK[1] };
      }
      return;
    }
    if (walkTo(n, n.wander.x, n.wander.y, dt)) { n.wander = null; n.waitT = rand(1, 2.5); }
  } else if (a.act === "sweep") n.dir = Math.sin(N().S.hour * 40) > 0 ? 1 : 3;
}

// ---------- Update utama ----------
let saveT = 0;
function update(dt) {
  N().tickTime(dt);
  if (NW.hold) { NW.hold.validate(); player.hold = NW.hold.frame(); } // ikan terjual / pindah ke akuarium → berhenti; pose hanya tampilan
  if (busy) updateBusy(dt);
  const v = blocked() ? { x: 0, y: 0, m: 0 } : inputVec();
  if (v.m > 0.05) {
    const SPEED = inHome() ? (NW.home.scene === "room" ? 115 : 140) : 150;
    const d = screenToWorld(v.x * SPEED * dt, v.y * SPEED * dt);
    const nx = player.x + d.x, ny = player.y + d.y;
    if (walkable(nx, ny)) { player.x = nx; player.y = ny; }
    else if (walkable(nx, player.y)) player.x = nx;
    else if (walkable(player.x, ny)) player.y = ny;
    player.dir = dirOf(v.x, v.y); player.moving = true; player.walk += dt * 11 * (0.5 + v.m * 0.6);
    if (!moved) { moved = true; NW.story.mark("walk"); updateHint(); }
  } else player.moving = false;
  player.z = inHome() ? 0 : undefined;

  for (const n of npcs) updateNPC(n, dt);
  if (inHome()) NW.home.update(dt);
  target = blocked() ? null : findTarget();
  updateActBtn();
  renderDialog(dt);
  const ct = camTarget(), k = Math.min(1, dt * 5);
  cam.x = lerp(cam.x, ct.x, k); cam.y = lerp(cam.y, ct.y, k);
  if (!inHome()) updateAmbient(dt);
  saveT += dt; if (saveT > 3 && !inHome()) { saveT = 0; N().S.world = { x: +player.x.toFixed(2), y: +player.y.toFixed(2) }; }
}
// petunjuk pemain baru: satu per satu, berhenti setelah dipahami (lihat story.hint)
function updateHint() {
  if (inHome()) return;
  N().setHint(NW.story ? NW.story.hint() : "");
}

// ---------- Gambar ----------
function viewRect() { return { x0: cam.x - W / 2 / Z, y0: cam.y - H / 2 / Z, x1: cam.x + W / 2 / Z, y1: cam.y + H / 2 / Z }; }
function inView(view, x, y, m = 120) { return x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m * 1.6; }
const worldXf = (ctx) => ctx.setTransform(DPR * Z, 0, 0, DPR * Z, DPR * (W / 2 - cam.x * Z), DPR * (H / 2 - cam.y * Z));
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function draw(ctx, t) {
  if (inHome()) return drawHome(ctx, t);
  const view = viewRect(), dk = N().darkness();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = NW.COL.deep; ctx.fillRect(0, 0, W, H);
  worldXf(ctx);
  NW.drawTerrain(ctx, view);
  NW.drawWater(ctx, view, t);
  for (const j of jumps) NW.drawJump(ctx, j, t);
  drawFarBoat(ctx, t, view);

  // penanda titik mancing
  const sp = NW.P(NW.SPOT.x - 0.35, NW.SPOT.y, NW.LIFT + 4.5);
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  ctx.strokeStyle = `rgba(255,240,176,${0.5 + pulse * 0.4})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 18 + pulse * 4, (18 + pulse * 4) * 0.5, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = "rgba(255,240,176,.22)"; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 14, 7, 0, 0, 7); ctx.fill();

  const birdDraws = birds.map((b) => NW.drawBird(ctx, b, t));
  birdDraws.forEach((b) => b.shadow());

  // area layar pemain (untuk efek transparan bila tertutup)
  const pp = NW.P(player.x, player.y, NW.LIFT), pRect = { x0: pp.x - 14, x1: pp.x + 14, y0: pp.y - 56, y1: pp.y + 2 }, pDepth = player.x + player.y;
  let hiddenBehind = false;

  const list = [];
  for (const o of NW.objects) { const p = NW.P(o.x, o.y); if (inView(view, p.x, p.y)) list.push({ d: o.x + o.y + (o.kind === "boat" ? 0.6 : 0), o }); }
  for (const b of NW.buildings) {
    const p = NW.P((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); if (!inView(view, p.x, p.y, 200)) continue;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    if (b.kind === "market") { list.push({ d: cx + b.y0 + 0.2, mback: b }); list.push({ d: cx + b.y1 + 0.05, mfront: b }); }
    else list.push({ d: cx + cy, b });
    // apakah bangunan ini menutupi pemain?
    const top = NW.P(b.x0, b.y0, NW.LIFT + (b.stilts || 0) + b.h + 40).y, bot = NW.P(b.x1, b.y1, 0).y;
    const bb = { x0: NW.P(b.x0, b.y1).x, x1: NW.P(b.x1, b.y0).x, y0: top, y1: bot };
    if ((b.kind === "market" ? cx + b.y1 : cx + cy) > pDepth && overlap(pRect, bb) && pp.y < bot - 6) hiddenBehind = true;
  }
  for (const n of npcs) { if (n.hidden) continue; const p = NW.P(n.x, n.y); if (inView(view, p.x, p.y)) list.push({ d: n.x + n.y, ch: n }); }
  for (const it of NW.story.layerObjects(t)) list.push({ d: it.d, fn: it.draw }); // sudut nelayan (progres pribadi)
  player.rodSpec = NW.look.rodSpec(); // joran aktif (dari S.up.rod) → tampil di punggung
  list.push({ d: pDepth, ch: player });
  list.sort((a, b) => a.d - b.d);
  const night = dk / 0.85, claim = L() ? L().claimable() > 0 : false;
  for (const it of list) {
    if (it.fn) it.fn(ctx);
    else if (it.ch) {
      NW.drawCharacter(ctx, it.ch, t);
      if (it.ch === player) { // label nama + gelar: ikut urutan kedalaman, jadi tertutup bangunan di depannya
        const pb = NW.P(player.x, player.y, NW.LIFT + (NW.tileAt(player.x, player.y) === NW.T.DOCK ? 4 : 0));
        NW.look.drawPlayerLabel(ctx, pb, 1.0 / Z, NW.hold ? NW.hold.labelLift() : 0);
        if (NW.hold) NW.hold.drawTag(ctx, pb, 1.0 / Z);
      }
    }
    else if (it.b) { if (it.b.kind === "shop") NW.drawShop(ctx, it.b, t, night); else NW.drawHouse(ctx, it.b, t, night); }
    else if (it.mback) NW.drawMarketBack(ctx, it.mback);
    else if (it.mfront) NW.drawMarketFront(ctx, it.mfront, t);
    else {
      // pohon di depan pemain dibuat transparan supaya pemain tetap terlihat
      const o = it.o, fade = (o.kind === "palm" || o.kind === "tree") && it.d > pDepth && occludes(o, pRect);
      if (fade) ctx.globalAlpha = 0.35;
      drawObj(ctx, o, t, night, claim);
      ctx.globalAlpha = 1;
    }
  }
  if (hiddenBehind) { ctx.globalAlpha = 0.5; NW.drawCharacter(ctx, player, t); ctx.globalAlpha = 1; }
  const dika = npcs[2]; if (!dika.hidden && dika.arrived && dika.cur.act === "kite") NW.drawKite(ctx, dika, t);
  for (const bf of butterflies) if (dk < 0.5) NW.drawButterfly(ctx, bf, t);
  birdDraws.forEach((b) => b.draw());

  // malam: gelapkan lalu nyalakan lampu
  if (dk > 0.02) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = `rgba(14,24,58,${(dk * 0.62).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    worldXf(ctx);
    ctx.globalCompositeOperation = "lighter";
    const a = clamp((dk - 0.15) * 1.3, 0, 0.75) * 0.42;
    for (const [x, y] of NW.lamps) { NW.lightAt(ctx, x, y, 2, 78, "#ffb347", a); NW.lightAt(ctx, x, y, 40, 16, "#fff1c4", a * 1.6); }
    for (const b of NW.buildings) {
      const cx = b.kind === "market" ? (b.x0 + b.x1) / 2 : b.door === "x" ? b.x1 + 0.4 : (b.x0 + b.x1) / 2;
      const cy = b.door === "x" ? (b.y0 + b.y1) / 2 : b.y1 + 0.4;
      NW.lightAt(ctx, cx, cy, 10, 48, "#ffa94d", a * 0.8);
    }
    NW.lightAt(ctx, NW.BOAT.x, NW.BOAT.y, 14, 40, "#ffb347", a);
    ctx.globalCompositeOperation = "source-over";
  } else if (N().goldenHour() > 0) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = `rgba(255,150,70,${(N().goldenHour() * 0.12).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    worldXf(ctx);
  }

  // gelembung aktivitas NPC (dekat pemain)
  for (const n of npcs) {
    if (n.hidden || n.talking || !n.arrived || !n.cur.bubble) continue;
    const d = Math.hypot(n.x - player.x, n.y - player.y); if (d > 7 || d < 1.6) continue;
    const p = NW.P(n.x, n.y, NW.LIFT + (n.style.scale ? 50 : 60)), b = Math.sin(t * 2 + n.seed) * 1.5;
    ctx.fillStyle = "rgba(255,249,236,.92)"; ctx.beginPath(); ctx.ellipse(p.x + 12, p.y - 4 + b, 11, 9, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 3, p.y + 5 + b, 2.2, 0, 7); ctx.fill();
    ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(n.cur.bubble, p.x + 12, p.y - 3.5 + b);
  }
  // tanda ❗ cerita di atas NPC & tempat yang ditunggu
  const mk = (x, y, z) => { const p = NW.P(x, y, NW.LIFT + z), b = Math.abs(Math.sin(t * 3)) * 4; ctx.fillStyle = "#e0b84c"; ctx.strokeStyle = "#173f50"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y - b, 8, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#173f50"; ctx.font = "900 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", p.x, p.y - b + 0.5); };
  for (const n of npcs) if (!n.hidden && NW.story.markerFor(n) && !(target && target.npc === n)) mk(n.x, n.y, n.style.scale ? 58 : 68);
  for (const m of NW.story.placeMarkers()) mk(m.x, m.y, m.z);
  drawTargetBubble(ctx, t);
  // nama NPC di atas kepala saat dekat
  ctx.font = "700 9px system-ui, sans-serif"; ctx.textAlign = "center";
  for (const n of npcs) {
    if (n.hidden) continue;
    const d = Math.hypot(n.x - player.x, n.y - player.y); if (d > 3) continue;
    const p = NW.P(n.x, n.y, NW.LIFT + (n.style.scale ? 44 : 52));
    ctx.globalAlpha = clamp((3 - d) / 1.2, 0, 1);
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(23,63,80,.85)"; ctx.strokeText(n.name, p.x, p.y);
    ctx.fillStyle = "#fff9ec"; ctx.fillText(n.name, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
function occludes(o, pRect) {
  const b = NW.P(o.x, o.y, NW.LIFT);
  const r = o.kind === "palm" ? { x0: b.x - 40 + Math.min(0, o.lean * o.h * 0.55), x1: b.x + 40 + Math.max(0, o.lean * o.h * 0.55), y0: b.y - o.h - 30, y1: b.y - 8 }
    : { x0: b.x - 30 * o.s, x1: b.x + 30 * o.s, y0: b.y - 72 * o.s, y1: b.y - 6 };
  return overlap(pRect, r);
}
function drawTargetBubble(ctx, t) {
  if (!target || dialog.open) return;
  const z0 = inHome() ? 0 : NW.LIFT;
  const tp = target.npc ? NW.P(target.npc.x, target.npc.y, z0 + 58) : NW.P(target.x, target.y, z0 + (target.id === "spot" ? 30 : target.id === "boat" ? 40 : 54));
  const bob = Math.sin(t * 4) * 2;
  ctx.fillStyle = "rgba(255,249,236,.95)"; ctx.strokeStyle = "#173f50"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(tp.x, tp.y - bob, 11, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tp.x - 4, tp.y + 9 - bob); ctx.lineTo(tp.x, tp.y + 15 - bob); ctx.lineTo(tp.x + 4, tp.y + 9 - bob); ctx.fill();
  ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#173f50";
  ctx.fillText(target.icon, tp.x, tp.y - bob + 1);
}
function drawHome(ctx, t) {
  NW.home.drawScene(ctx, t, N().darkness(), player, { W, H, DPR, worldXf: () => worldXf(ctx) });
  if (!NW.home.isEditing()) { worldXf(ctx); drawTargetBubble(ctx, t); }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
// layar → tile (dipakai Mode Tata Ruang)
function toTile(cx, cy, z = 0) {
  const wx = (cx - W / 2) / Z + cam.x, wy = (cy - H / 2) / Z + cam.y + z;
  return { x: (wx / HW + wy / HH) / 2, y: (wy / HH - wx / HW) / 2 };
}
function drawObj(c, o, t, night, claim) {
  switch (o.kind) {
    case "palm": return NW.drawPalm(c, o, t, 1);
    case "tree": return NW.drawTree(c, o, t);
    case "bush": return NW.drawBush(c, o);
    case "rock": return NW.drawRock(c, o, false, t);
    case "searock": return NW.drawRock(c, o, true, t);
    case "lamp": return NW.drawLamp(c, o, night);
    case "sign": return NW.drawSign(c, o);
    case "board": return NW.drawBoard(c, o, t, claim);
    case "mailbox": return NW.drawMailbox(c, o, t);
    case "bench": return NW.drawBench(c, o);
    case "crate": return NW.drawCrate(c, o);
    case "barrel": return NW.drawBarrel(c, o);
    case "net": return NW.drawNet(c, o);
    case "well": return NW.drawWell(c, o);
    case "boat": return NW.drawBoat(c, o, t);
    case "gate": return NW.HOUSE.gateDraw(c, o.x, o.y, t, "RUMAHKU", NW.LIFT);
    case "bamboo": return NW.drawBamboo(c, o, t);
  }
}
function drawFarBoat(c, t, view) {
  const k = (sail.t * 0.018) % 1, x = 36.5, y = -4 + k * 48;
  const p = NW.P(x, y); if (!inView(view, p.x, p.y)) return;
  const bob = Math.sin(t * 1.3) * 1.2;
  c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x + 14, p.y + 4); c.lineTo(p.x + 40, p.y - 8); c.stroke();
  c.fillStyle = "#7a5230"; c.beginPath(); c.moveTo(p.x - 18, p.y - 6 + bob); c.quadraticCurveTo(p.x, p.y + 8 + bob, p.x + 18, p.y + 2 + bob); c.lineTo(p.x - 18, p.y - 6 + bob); c.fill();
  c.fillStyle = "#fff6e4"; c.beginPath(); c.moveTo(p.x - 2, p.y - 4 + bob); c.lineTo(p.x - 2, p.y - 36 + bob); c.lineTo(p.x + 14, p.y - 6 + bob); c.fill();
  c.fillStyle = "#e2574c"; c.beginPath(); c.moveTo(p.x - 4, p.y - 6 + bob); c.lineTo(p.x - 4, p.y - 30 + bob); c.lineTo(p.x - 16, p.y - 8 + bob); c.fill();
}

NW.world = { toTile, resize, update, draw, onEnter, updateHint, closeDialog, snapCamera, player, npcs, get target() { return target; }, interact, isBusy: () => busy, placeNPC, actNow };
})();
