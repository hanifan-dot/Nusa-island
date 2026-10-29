// =========================================================
//  NUSA ISLAND — Island Life: pemain, NPC, kamera, input, dialog
//  Dipanggil oleh game.js saat mode "world". Mode "fish" tetap memakai
//  sistem mancing lama tanpa perubahan mekanik.
// =========================================================
(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const HW = NW.TW / 2, HH = NW.TH / 2;
const N = () => window.Nusa; // API dari game.js

// ---------- Gaya karakter ----------
const STYLE = {
  player: { shirt: "#579b8b", pants: "#2b3a44", skin: "#c68b5e", hair: "#2a1d14", hat: "caping", collar: "#fff9ec" },
  darto: { shirt: "#3d6f8f", pants: "#4a3b2c", skin: "#a8714a", hair: "#ddd6c8", hat: "caping", hatCol: "#c9a45c", towel: "#f3e7c9" },
  sari: { shirt: "#c2603b", pants: "#5b3a5c", skin: "#c99066", hair: "#2a1d14", hat: "scarf", hatCol: "#e0b84c", apron: "#fff6e4" },
  dika: { shirt: "#e2574c", pants: "#2f5d78", skin: "#c68b5e", hair: "#2a1d14", hat: "cap", hatCol: "#173f50", scale: 0.82 },
};

// ---------- Pemain ----------
const player = { x: NW.START.x, y: NW.START.y, dir: 2, walk: 0, moving: false, style: STYLE.player, rod: 0, seed: 0 };

// ---------- NPC ----------
const E = NW.SHORE_E, pasar = NW.buildings[0];
const npcs = [
  {
    id: "darto", name: "Pak Darto", avatar: "🧓", role: "Nelayan senior", style: STYLE.darto, speed: 1.15, seed: 1.3,
    route: [
      { x: 16.3, y: 25.25, wait: 5 }, { x: 18.5, y: 25.3 }, { x: 18.5, y: 20.55 }, { x: E - 1.5, y: 20.5 },
      { x: E + 2.4, y: 20.35, wait: 12, fish: true, face: 0 }, { x: E - 1.5, y: 20.5 }, { x: 18.5, y: 20.55 }, { x: 18.5, y: 25.3 },
    ],
    lines: [
      ["Eh, ada pemancing muda! Ujung dermaga itu tempat paling bagus, Nak."],
      ["Kalau senar sudah tegang sekali, lepas dulu.", "Ikan juga capek kalau ditarik-ulur. Sabar itu kuncinya."],
      ["Malam-malam, kadang ada kilatan merah di muara.", "Orang bilang itu Arwana Super Red. Aku sendiri baru lihat sekali."],
      ["Lempar sejauh mungkin. Ikan besar suka di bagian yang dalam."],
      ["Kapal di samping dermaga itu bisa bawa kamu ke Danau Toba.", "Tapi beli dulu perahu motor di toko Pak Bono."],
    ],
  },
  {
    id: "sari", name: "Bu Sari", avatar: "👩", role: "Pedagang ikan", style: STYLE.sari, speed: 0.8, seed: 2.1, face: 2, stall: true,
    route: [{ x: pasar.x0 + 0.9, y: 18.35, wait: 4, face: 2 }, { x: (pasar.x0 + pasar.x1) / 2, y: 18.3, wait: 3, face: 1 }, { x: pasar.x1 - 0.9, y: 18.35, wait: 4, face: 2 }],
    lines: [["Ikan segaaar! Mau jual tangkapanmu ke Ibu?"]],
  },
  {
    id: "dika", name: "Dika", avatar: "👦", role: "Anak kampung", style: STYLE.dika, speed: 1.6, seed: 3.7,
    route: [
      { x: 18.5, y: 12.6, wait: 2 }, { x: 18.5, y: 17.6 }, { x: 16.3, y: 17.65, wait: 4 }, { x: 18.5, y: 17.6 },
      { x: 18.5, y: 20.5 }, { x: 11.0, y: 20.55, wait: 2 }, { x: 10.5, y: 16.2, wait: 3 }, { x: 10.5, y: 20.5 }, { x: 18.5, y: 20.5 },
    ],
    lines: [
      ["Kak! Kemarin aku mancing dapat sandal jepit. Sebelah doang, hahaha."],
      ["Kata Pak Darto, kapal di dermaga bisa ke Danau Toba!", "Aku mau ikut kalau sudah besar."],
      ["Kalau pelampung goyang-goyang sedikit, itu belum gigit beneran.", "Tunggu sampai tenggelam, baru tarik!"],
      ["Bu Sari suka kasih harga bagus kalau ada panah hijau.", "Jangan jual pas harga lagi turun, Kak."],
      ["Aku mau jadi pemancing legenda kayak Kakak nanti!"],
    ],
  },
];
for (const n of npcs) { const w = n.route[0]; Object.assign(n, { x: w.x, y: w.y, dir: 2, walk: 0, moving: false, ri: 0, waitT: rand(0, 2), li: 0, rod: 0, talking: false }); }

// ---------- Kamera & layar ----------
let W = 0, H = 0, DPR = 1, Z = 1;
const cam = { x: 0, y: 0 };
function resize(w, h, dpr) {
  W = w; H = h; DPR = dpr;
  Z = clamp(Math.min(W, H) / 430, 0.9, 1.55);
  const want = Math.min(Z * DPR, 1.75);
  if (Math.abs(want - NW.getTerrainScale()) > 0.15) NW.buildTerrain(want);
}
function snapCamera() { const p = NW.P(player.x, player.y, NW.LIFT); cam.x = p.x; cam.y = p.y - 22; }

// ---------- Input ----------
const joy = { active: false, id: null, bx: 0, by: 0, kx: 0, ky: 0, vx: 0, vy: 0 };
const keys = new Set();
let moved = false;
const joyEl = $("joy"), knobEl = $("joyKnob");
function joyHome() { const r = joyEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function blocked() { return dialog.open || busy || N().isPanelOpen() || !N().isStarted(); }

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
// arah layar → arah dunia (tile)
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
function candidates() {
  const list = NW.points.slice();
  for (const n of npcs) if (!n.stall) list.push({ id: "npc:" + n.id, x: n.x, y: n.y, r: 1.15, icon: "💬", label: "Bicara", npc: n });
  return list;
}
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
  const btn = $("actBtn"), key = target ? target.id : "";
  if (key === lastActKey) return; lastActKey = key;
  if (!target) { btn.classList.add("hidden"); return; }
  btn.classList.remove("hidden");
  btn.innerHTML = `<span>${target.icon}</span><b>${target.label}</b>`;
}
const pickLine = (n) => { const l = n.lines[n.li % n.lines.length]; n.li++; return l; };
function interact() {
  if (blocked() || !target) return;
  const t = target, S = N().S;
  if (t.npc) {
    const n = t.npc;
    openDialog({ name: n.name, avatar: n.avatar, role: n.role, lines: pickLine(n), npc: n });
  } else if (t.id === "spot") {
    if (N().coolerFull()) {
      openDialog({ name: "Coolbox penuh", avatar: "🧊", lines: ["Coolbox-mu sudah penuh. Jual dulu tangkapanmu ke Bu Sari di Pasar Ikan, di sebelah barat dermaga."] });
      return;
    }
    startFishing();
  } else if (t.id === "boat") {
    N().openPanel("map");
  } else if (t.id === "pasar") {
    const n = npcs[1], tip = N().marketTip();
    const lines = S.cooler.length ? [`Wah, kamu bawa ${S.cooler.length} tangkapan! Mau dijual ke Ibu?`] : ["Coolbox-mu masih kosong. Mancing dulu di dermaga, nanti jual ke Ibu ya!"];
    if (tip) lines.push(tip);
    openDialog({ name: n.name, avatar: n.avatar, role: n.role, npc: n, lines, options: [{ label: "🏪 Jual ikan", act: () => N().openPanel("market") }] });
  } else if (t.id === "toko") {
    const lines = ["Selamat datang di Toko Pancing! Mau upgrade alat?"];
    if (S.up.boat === 0) lines.push("Perahu motor bisa bawa kamu ke Danau Toba, lho. Ikannya lebih besar di sana.");
    openDialog({ name: "Pak Bono", avatar: "👨‍🔧", role: "Pemilik toko", lines, options: [{ label: "🛠️ Lihat barang", act: () => N().openPanel("shop") }] });
  } else if (t.id === "rumah2") {
    const d = npcs[0], home = Math.hypot(d.x - 16.3, d.y - 25.25) < 1.2;
    openDialog({ name: "Rumah Pak Darto", avatar: "🏠", lines: home ? ["Tok tok tok…", "\"Sebentar ya, Pak Darto lagi siap-siap ke dermaga!\""] : ["Tok tok tok…", "Tidak ada yang menjawab. Pak Darto sepertinya sedang di dermaga."] });
  } else if (t.sign) {
    openDialog({ name: t.sign.title, avatar: "📜", lines: [t.sign.text] });
  }
}

// ---------- Masuk mode mancing ----------
function startFishing() {
  busy = true; busyT = 0; onUp(); keys.clear();
  player.dir = 0; // menghadap laut
  N().sfx("click");
}
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
let fadeStarted = false;

// Dipanggil game.js saat kembali ke darat
function onEnter(at) {
  busy = false; fadeStarted = false; player.rod = 0; closeDialog();
  const S = N().S;
  if (at === "dock") { player.x = NW.SPOT.x - 1.1; player.y = NW.SPOT.y; player.dir = 4; }
  else if (at === "boat") { player.x = NW.BOAT.x; player.y = NW.DOCK.y1 + 0.6; player.dir = 5; }
  else if (S.world && NW.walkable(S.world.x, S.world.y)) { player.x = S.world.x; player.y = S.world.y; }
  else { player.x = NW.START.x; player.y = NW.START.y; }
  snapCamera(); lastActKey = "?"; showBanner();
}
let bannerT = 0;
function showBanner() { const b = $("banner"); b.textContent = "🏝️ Muara Kampung"; b.classList.add("show"); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove("show"), 2200); }

// ---------- Ambience ----------
const birds = [], jumps = [], butterflies = [];
for (let i = 0; i < 5; i++) butterflies.push({ x: 15.5 + Math.random() * 2, y: 15 + Math.random() * 2, ph: Math.random() * 6, col: ["#ffd84d", "#ffffff", "#ff9ec4", "#9fd3ff"][i % 4], tx: 16, ty: 16 });
let birdT = 2, jumpT = 3;
let sail = { t: Math.random() * 60 };

function updateAmbient(dt, view) {
  birdT -= dt;
  if (birdT <= 0 && birds.length < 3) {
    birdT = rand(4, 9);
    const fromLeft = Math.random() < 0.5, c = screenToWorld(0, 0);
    const p = { x: player.x + rand(-6, 6), y: player.y + rand(-6, 6) };
    const vx = rand(1.2, 2) * (fromLeft ? 1 : -1), vy = rand(-0.6, 0.6);
    birds.push({ x: p.x - vx * 6, y: p.y - vy * 6 + (fromLeft ? 6 : -6), vx, vy, z: rand(70, 120), ph: rand(0, 6), life: 14 });
    void c;
  }
  for (const b of birds) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
  for (let i = birds.length - 1; i >= 0; i--) if (birds[i].life <= 0) birds.splice(i, 1);

  jumpT -= dt;
  if (jumpT <= 0) {
    jumpT = rand(1.8, 4.5);
    for (let k = 0; k < 12; k++) {
      const x = player.x + rand(-9, 9), y = player.y + rand(-9, 9);
      if (!NW.isLandT(NW.tileAt(x, y)) && !NW.isLandT(NW.tileAt(x + 1, y)) && !NW.isLandT(NW.tileAt(x, y + 1))) {
        jumps.push({ x, y, t: 0, dur: 0.9, col: ["#8c9a8a", "#9aa3a8", "#d79a2e", "#5d7f9c"][k % 4] }); break;
      }
    }
  }
  for (const j of jumps) j.t += dt;
  for (let i = jumps.length - 1; i >= 0; i--) if (jumps[i].t > jumps[i].dur * 1.6) jumps.splice(i, 1);

  for (const b of butterflies) {
    if (Math.hypot(b.tx - b.x, b.ty - b.y) < 0.2) { b.tx = NW.PARK.x0 + Math.random() * 3.6; b.ty = NW.PARK.y0 + Math.random() * 3.6; }
    b.x = lerp(b.x, b.tx, dt * 0.6); b.y = lerp(b.y, b.ty, dt * 0.6);
  }
  sail.t += dt;
  void view;
}

// ---------- Update NPC ----------
function updateNPC(n, dt) {
  n.rod = lerp(n.rod, n.fishing ? 1 : 0, dt * 4);
  if (n.talking) { n.moving = false; return; }
  const wp = n.route[n.ri];
  if (n.waitT > 0) {
    n.waitT -= dt; n.moving = false;
    if (wp.face !== undefined) n.dir = wp.face;
    if (n.waitT <= 0) { n.fishing = false; n.ri = (n.ri + 1) % n.route.length; }
    return;
  }
  // berhenti sebentar kalau pemain menghalangi
  if (Math.hypot(player.x - n.x, player.y - n.y) < 0.55) { n.moving = false; faceToward(n, player); return; }
  const dx = wp.x - n.x, dy = wp.y - n.y, d = Math.hypot(dx, dy);
  if (d < 0.05) {
    n.x = wp.x; n.y = wp.y; n.moving = false;
    n.waitT = wp.wait ? wp.wait * rand(0.8, 1.3) : 0;
    if (wp.fish) n.fishing = true;
    if (!wp.wait) n.ri = (n.ri + 1) % n.route.length;
    return;
  }
  const step = Math.min(d, n.speed * dt);
  n.x += (dx / d) * step; n.y += (dy / d) * step;
  const a = NW.P(0, 0), b = NW.P(dx, dy); n.dir = dirOf(b.x - a.x, b.y - a.y);
  n.moving = true; n.walk += dt * 10 * n.speed / 1.2;
}

// ---------- Update utama ----------
let saveT = 0, hintStage = 0;
function update(dt) {
  N().tickTime(dt);
  if (busy) updateBusy(dt);
  const v = blocked() ? { x: 0, y: 0, m: 0 } : inputVec();
  if (v.m > 0.05) {
    const SPEED = 150; // px layar dunia per detik
    const d = screenToWorld(v.x * SPEED * dt, v.y * SPEED * dt);
    const nx = player.x + d.x, ny = player.y + d.y;
    if (NW.walkable(nx, ny)) { player.x = nx; player.y = ny; }
    else if (NW.walkable(nx, player.y)) player.x = nx;
    else if (NW.walkable(player.x, ny)) player.y = ny;
    player.dir = dirOf(v.x, v.y); player.moving = true; player.walk += dt * 11 * (0.5 + v.m * 0.6);
    if (!moved) { moved = true; updateHint(); }
  } else player.moving = false;

  for (const n of npcs) updateNPC(n, dt);
  target = blocked() ? null : findTarget();
  updateActBtn();
  renderDialog(dt);

  const p = NW.P(player.x, player.y, NW.LIFT);
  const k = Math.min(1, dt * 5);
  cam.x = lerp(cam.x, p.x, k); cam.y = lerp(cam.y, p.y - 22, k);
  updateAmbient(dt);
  saveT += dt; if (saveT > 3) { saveT = 0; N().S.world = { x: +player.x.toFixed(2), y: +player.y.toFixed(2) }; }
}
function updateHint() {
  const S = N().S;
  let msg = "";
  if (!moved && S.stats.caught === 0) msg = "Geser joystick di kiri bawah untuk berjalan";
  else if (S.stats.caught === 0) msg = "Pergi ke ujung dermaga di timur untuk mancing 🎣";
  N().setHint(msg);
}

// ---------- Gambar ----------
function viewRect() { return { x0: cam.x - W / 2 / Z, y0: cam.y - H / 2 / Z, x1: cam.x + W / 2 / Z, y1: cam.y + H / 2 / Z }; }
function inView(view, x, y, m = 120) { return x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m * 1.6; }

function draw(ctx, t) {
  const view = viewRect();
  const dk = N().darkness();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = NW.COL.deep; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(DPR * Z, 0, 0, DPR * Z, DPR * (W / 2 - cam.x * Z), DPR * (H / 2 - cam.y * Z));
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

  // bayangan burung di tanah
  const birdDraws = birds.map((b) => NW.drawBird(ctx, b, t));
  birdDraws.forEach((b) => b.shadow());

  // kumpulkan objek, urutkan berdasarkan kedalaman (x + y)
  const list = [];
  for (const o of NW.objects) {
    const p = NW.P(o.x, o.y); if (!inView(view, p.x, p.y)) continue;
    list.push({ d: o.x + o.y + (o.kind === "boat" ? 0.6 : 0), o });
  }
  for (const b of NW.buildings) {
    const p = NW.P((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); if (!inView(view, p.x, p.y, 200)) continue;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    if (b.kind === "market") { list.push({ d: cx + b.y0 + 0.2, mback: b }); list.push({ d: cx + b.y1 + 0.05, mfront: b }); }
    else list.push({ d: cx + cy, b });
  }
  for (const n of npcs) { const p = NW.P(n.x, n.y); if (inView(view, p.x, p.y)) list.push({ d: n.x + n.y, ch: n }); }
  list.push({ d: player.x + player.y, ch: player });
  list.sort((a, b) => a.d - b.d);
  const night = dk / 0.85;
  for (const it of list) {
    if (it.ch) NW.drawCharacter(ctx, it.ch, t);
    else if (it.b) { if (it.b.kind === "shop") NW.drawShop(ctx, it.b, t, night); else NW.drawHouse(ctx, it.b, t, night); }
    else if (it.mback) NW.drawMarketBack(ctx, it.mback);
    else if (it.mfront) NW.drawMarketFront(ctx, it.mfront, t);
    else drawObj(ctx, it.o, t, night);
  }
  for (const bf of butterflies) if (dk < 0.5) NW.drawButterfly(ctx, bf, t);
  birdDraws.forEach((b) => b.draw());

  // malam: gelapkan lalu nyalakan lampu
  if (dk > 0.02) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = `rgba(14,24,58,${(dk * 0.62).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(DPR * Z, 0, 0, DPR * Z, DPR * (W / 2 - cam.x * Z), DPR * (H / 2 - cam.y * Z));
    ctx.globalCompositeOperation = "lighter";
    const a = clamp((dk - 0.15) * 1.3, 0, 0.75) * 0.42;
    for (const [x, y] of NW.lamps) { NW.lightAt(ctx, x, y, 2, 78, "#ffb347", a); NW.lightAt(ctx, x, y, 40, 16, "#fff1c4", a * 1.6); }
    for (const b of NW.buildings) {
      const cx = b.kind === "market" ? (b.x0 + b.x1) / 2 : b.door === "x" ? b.x1 + 0.4 : (b.x0 + b.x1) / 2;
      const cy = b.door === "x" ? (b.y0 + b.y1) / 2 : b.y1 + 0.4;
      NW.lightAt(ctx, cx, cy, 10, 48, "#ffa94d", a * 0.8);
    }
    NW.lightAt(ctx, NW.BOAT.x, NW.BOAT.y, 14, 40, "#ffb347", a);
    const pl = NW.P(player.x, player.y); void pl;
    ctx.globalCompositeOperation = "source-over";
  } else if (N().goldenHour() > 0) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = `rgba(255,150,70,${(N().goldenHour() * 0.12).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(DPR * Z, 0, 0, DPR * Z, DPR * (W / 2 - cam.x * Z), DPR * (H / 2 - cam.y * Z));
  }

  // gelembung penanda interaksi
  if (target && !dialog.open) {
    const tp = target.npc ? NW.P(target.npc.x, target.npc.y, NW.LIFT + 58) : NW.P(target.x, target.y, NW.LIFT + (target.id === "spot" ? 30 : target.id === "boat" ? 40 : 54));
    const bob = Math.sin(t * 4) * 2;
    ctx.fillStyle = "rgba(255,249,236,.95)"; ctx.strokeStyle = "#173f50"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(tp.x, tp.y - bob, 11, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tp.x - 4, tp.y + 9 - bob); ctx.lineTo(tp.x, tp.y + 15 - bob); ctx.lineTo(tp.x + 4, tp.y + 9 - bob); ctx.fill();
    ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#173f50";
    ctx.fillText(target.icon, tp.x, tp.y - bob + 1);
  }
  // nama NPC di atas kepala saat dekat
  ctx.font = "700 9px system-ui, sans-serif"; ctx.textAlign = "center";
  for (const n of npcs) {
    const d = Math.hypot(n.x - player.x, n.y - player.y); if (d > 3) continue;
    const p = NW.P(n.x, n.y, NW.LIFT + (n.style.scale ? 44 : 52));
    ctx.globalAlpha = clamp((3 - d) / 1.2, 0, 1);
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(23,63,80,.85)"; ctx.strokeText(n.name, p.x, p.y);
    ctx.fillStyle = "#fff9ec"; ctx.fillText(n.name, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
function drawObj(c, o, t, night) {
  switch (o.kind) {
    case "palm": return NW.drawPalm(c, o, t, 1);
    case "tree": return NW.drawTree(c, o, t);
    case "bush": return NW.drawBush(c, o);
    case "rock": return NW.drawRock(c, o, false, t);
    case "searock": return NW.drawRock(c, o, true, t);
    case "lamp": return NW.drawLamp(c, o, night);
    case "sign": return NW.drawSign(c, o);
    case "bench": return NW.drawBench(c, o);
    case "crate": return NW.drawCrate(c, o);
    case "barrel": return NW.drawBarrel(c, o);
    case "net": return NW.drawNet(c, o);
    case "well": return NW.drawWell(c, o);
    case "boat": return NW.drawBoat(c, o, t);
  }
}
// perahu nelayan lain berlayar pelan di kejauhan
function drawFarBoat(c, t, view) {
  const k = (sail.t * 0.018) % 1, x = 36.5, y = -4 + k * 48;
  const p = NW.P(x, y); if (!inView(view, p.x, p.y)) return;
  const bob = Math.sin(t * 1.3) * 1.2;
  c.strokeStyle = "rgba(255,255,255,.45)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x + 14, p.y + 4); c.lineTo(p.x + 40, p.y - 8); c.stroke();
  c.fillStyle = "#7a5230"; c.beginPath(); c.moveTo(p.x - 18, p.y - 6 + bob); c.quadraticCurveTo(p.x, p.y + 8 + bob, p.x + 18, p.y + 2 + bob); c.lineTo(p.x - 18, p.y - 6 + bob); c.fill();
  c.fillStyle = "#fff6e4"; c.beginPath(); c.moveTo(p.x - 2, p.y - 4 + bob); c.lineTo(p.x - 2, p.y - 36 + bob); c.lineTo(p.x + 14, p.y - 6 + bob); c.fill();
  c.fillStyle = "#e2574c"; c.beginPath(); c.moveTo(p.x - 4, p.y - 6 + bob); c.lineTo(p.x - 4, p.y - 30 + bob); c.lineTo(p.x - 16, p.y - 8 + bob); c.fill();
}

NW.world = { resize, update, draw, onEnter, updateHint, closeDialog, player, npcs, get target() { return target; }, interact, isBusy: () => busy };
})();
