// =========================================================
//  NUSA ISLAND — Island Life: MESIN DUNIA (pemain, NPC, kamera, input, dialog)
//  Dipanggil oleh game.js saat mode "world". Mode "fish" tetap memakai
//  sistem mancing lama tanpa perubahan mekanik.
//  Tahap 2A: jadwal NPC per jam, misi & pertemanan, Rumahku.
//  Bumbu 2: mesin ini UMUM untuk semua area. Isi tiap area (NPC, interaksi,
//  ambience, cerita) ada di world/areas/<area>.js dan dipanggil lewat "hooks".
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
const A = () => NW.areas.cur; // area aktif
const H = () => A().hooks || {};
const inHome = () => NW.home && NW.home.active;
const gz = (x, y) => NW.groundZ(x, y); // tinggi pijakan (dermaga, bukit)

// ---------- Pemain ----------
const STYLE = { player: { shirt: "#579b8b", pants: "#2b3a44", skin: "#c68b5e", hair: "#2a1d14", hat: "caping", collar: "#fff9ec" } };
const player = { x: NW.START.x, y: NW.START.y, dir: 2, walk: 0, moving: false, style: STYLE.player, rod: 0, seed: 0, sit: false };

// ---------- NPC (umum) ----------
// Jadwal NPC: n.sched = [{from,to,at,act,...}], n.schedFor(h) = penimpaan opsional (mis. cerita)
const baseAct = (n, h) => n.sched.find((a) => (a.from < a.to ? h >= a.from && h < a.to : h >= a.from || h < a.to)) || n.sched[0];
// Bumbu 2.3: cerita (schedFor) tetap didahulukan; hanya jadwal harian biasa yang diganti "berteduh" saat hujan
const actNow = (n, h) => (n.schedFor && n.schedFor(h)) || (window.NW.weather ? NW.weather.shelter(n, baseAct(n, h)) : baseAct(n, h));
const areaOf = (n) => NW.areas.get(n.area) || A();
function placeNPC(n) { // taruh langsung di aktivitas saat ini (saat memuat game / tiba di area)
  const NAV = areaOf(n).map.NAV, a = actNow(n, N() ? N().S.hour : 8), [x, y] = NAV[a.at];
  Object.assign(n, { x, y, cur: a, path: [], hidden: !!a.hide, arrived: true, dir: a.face ?? 2, walk: 0, moving: false, waitT: 0, rod: a.act === "fish" ? 1 : 0, talking: false, li: 0, alt: 0, wander: null, yieldT: 0, look: 0 });
  n.prop = a.hide ? null : a.prop || null; n.fishing = a.act === "fish";
}
function initNPCs(area) {
  const NAV = area.map.NAV;
  area.npcs.forEach((n) => { if (n._init) return; n._init = true; n.area = n.area || area.id; Object.assign(n, { x: NAV[n.home][0], y: NAV[n.home][1], cur: null, path: [], hidden: true, dir: 2, walk: 0, rod: 0, li: 0, alt: 0 }); });
}
NW.areas.list.forEach(initNPCs);

// ---------- Kamera & layar ----------
let W = 0, H2 = 0, DPR = 1, Z = 1, ZI = 1, ZW = 1; // ZI = zoom di dalam rumah, ZW = zoom di pulau
const cam = { x: 0, y: 0 };
let cine = null; // sorotan kamera singkat (mis. memandang danau dari Bukit Pandang)
const terrainWant = () => Math.min(Z * DPR, 1.75);
function resize(w, h, dpr) {
  W = w; H2 = h; DPR = dpr;
  ZW = Z = clamp(Math.min(W, H2) / 430, 0.9, 1.55);
  // ruangan Rumahku (lebar ±450px dunia, tinggi ±380px) harus muat utuh di layar
  ZI = clamp(Math.min((W - 24) / 470, (H2 - 220) / 400), 0.6, 1.6);
  if (inHome()) Z = ZI;
  const want = Math.min(ZW * DPR, 1.75);
  if (Math.abs(want - NW.getTerrainScale()) > 0.15) NW.buildTerrain(want);
}
let zs = 0; // zoom halus (Bumbu 2.4: sedikit menjauh saat berlayar supaya laut terasa luas)
function camTarget(snap) {
  if (inHome()) { const ct = NW.home.camTarget(player, W, H2, ZW); Z = ct.z; return ct; }
  if (cine) { const p = NW.P(cine.x, cine.y, cine.z || 0); Z = lerp(ZW, ZW * (cine.zoom || 1), cine.k); return { x: lerp(cine.fx, p.x, cine.k), y: lerp(cine.fy, p.y, cine.k) }; }
  const sail = NW.boat && NW.boat.on, zt = sail ? ZW * 0.84 : ZW;
  zs = snap || !zs ? zt : lerp(zs, zt, 0.06); Z = zs;
  if (sail) return NW.boat.camTarget(ZW); // kamera mengikuti kapal (sedikit ke depan haluan saat melaju)
  const p = NW.P(player.x, player.y, gz(player.x, player.y)); return { x: p.x, y: p.y - 22 - (NW.hold ? NW.hold.camLift() : 0) };
}
function snapCamera() { const t = camTarget(true); cam.x = t.x; cam.y = t.y; }

// ---------- Input ----------
const joy = { active: false, id: null, bx: 0, by: 0, kx: 0, ky: 0, vx: 0, vy: 0 };
const keys = new Set();
let moved = false;
const joyEl = $("joy"), knobEl = $("joyKnob");
function joyHome() { const r = joyEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function blocked() { return dialog.open || busy || !!cine || N().isPanelOpen() || !N().isStarted() || $("fade").classList.contains("on") || (NW.home && NW.home.isEditing()) || (NW.adv && NW.adv.isBusy()) || (NW.mp && NW.mp.typing); }

function onDown(e) {
  if (N().mode() !== "world") return;
  if (dialog.open) { advanceDialog(); return; }
  if (cine && cine.t > 0.6) { cine.t = Math.max(cine.t, cine.dur - 0.5); return; } // ketuk = lewati sorotan
  if (blocked()) return;
  if (e.target && e.target.closest && e.target.closest(".mp-dock, .mp-chat, .mp-ask, .hm, .hm-ov")) return; // ketuk tombol Dunia Bersama ≠ menggeser joystick
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
  const m = Math.min(1, d / (R * 0.62)); joy.vx = d > 6 ? (dx / (d || 1)) * m : 0; joy.vy = d > 6 ? (dy / (d || 1)) * m : 0;
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
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return; // mengetik chat: huruf w/a/s/d/e/spasi/Enter jangan dibajak
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
function openDialog({ name, avatar, role, lines, options, npc, noLater }) {
  Object.assign(dialog, { open: true, lines, i: 0, shown: 0, opts: options || [], npc: npc || null, name, noLater: !!noLater });
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
    if (dialog.opts.length && !dialog.noLater) { const b = document.createElement("button"); b.className = "btn ghost"; b.textContent = "Nanti saja"; b.addEventListener("click", (e) => { e.stopPropagation(); closeDialog(); }); optsEl.appendChild(b); }
  }
  $("dlgMore").classList.toggle("hidden", last);
}
dlgEl.addEventListener("click", () => { if (dialog.open) advanceDialog(); });
function faceToward(a, b) { const pa = NW.P(a.x, a.y), pb = NW.P(b.x, b.y); a.dir = dirOf(pb.x - pa.x, pb.y - pa.y); }

// ---------- Duduk (Bumbu 2: bangku tepi danau, dll.) ----------
// Pemain tetap bisa berdiri kapan saja: geser joystick atau tekan tombol interaksi.
const seat = { on: false, t: 0, onStand: null };
function sitAt(p, opts = {}) {
  if (NW.hold) NW.hold.stop("manual");
  player.x = p.x; player.y = p.y; player.dir = p.dir ?? player.dir; player.sit = true; player.moving = false;
  Object.assign(seat, { on: true, t: 0, onStand: opts.onStand || null, tick: opts.tick || null });
  lastActKey = "?"; onUp();
}
function standUp(silent) {
  if (!seat.on) return;
  seat.on = false; player.sit = false; lastActKey = "?";
  if (seat.onStand && !silent) seat.onStand(); seat.onStand = null;
}
// Sorotan kamera singkat: kamera berpindah ke titik lalu kembali; pemain tidak bisa berjalan selama itu
function look(o) { cine = { ...o, t: 0, k: 0, fx: cam.x, fy: cam.y, dur: o.dur || 4 }; onUp(); if (o.caption) caption(o.caption, cine.dur - 0.6); }
let capT = 0;
function caption(text, secs) { const b = $("banner"); b.textContent = text; b.classList.add("show", "cap"); clearTimeout(capT); capT = setTimeout(() => b.classList.remove("show", "cap"), secs * 1000); }

// ---------- Interaksi ----------
let target = null, busy = false, busyT = 0, fishSpotId = null;
function areaCandidates() {
  const a = A(), list = a.map.points.filter((p) => !(p.id === "boat" && a.sea && NW.boat)).concat(H().points ? H().points() : []); // Bumbu 2.4: kapal pemain = "Naik Kapal" (NW.boat)
  if (NW.boat) list.push(...NW.boat.landCandidates(player));
  for (const n of a.npcs) if (!n.hidden && n.cur && (!H().npcTalkable || H().npcTalkable(n))) list.push({ id: "npc:" + n.id, x: n.x, y: n.y, r: 1.15, icon: "💬", label: "Bicara", npc: n });
  return list;
}
const sailing = () => !!(NW.boat && NW.boat.on);
const candidates = () => (inHome() ? NW.home.candidates() : sailing() ? NW.boat.seaCandidates() : seat.on ? [{ id: "seat:stand", x: player.x, y: player.y, r: 9, icon: "🧍", label: "Berdiri", stand: true }] : areaCandidates());
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
  const btn = $("actBtn"), key = target ? target.id + target.label + target.icon : "";
  if (key === lastActKey) return; lastActKey = key;
  if (!target) { btn.classList.add("hidden"); return; }
  btn.classList.remove("hidden");
  btn.innerHTML = `<span>${target.icon}</span><b>${target.label}</b>`;
}
const api = { fishSpot: () => fishSpotId, openDialog, closeDialog, player, faceToward, walkTo: (n, x, y, dt) => walkTo(n, x, y, dt), sitAt, standUp, look, caption, startFishing: (id) => startFishing(id), seat };
function interact() {
  if (blocked() || !target) return;
  const t = target;
  if (inHome()) return NW.home.interact(t, player, openDialog);
  if (t.stand) return standUp();
  if (t.boat && NW.boat) return NW.boat.interact(t);
  if (t.npc) return t.npc.talk(t.npc, api);
  if (t.id === "spot" || t.fish) { // titik mancing (semua area): memakai lokasi mancing LOCATIONS milik area
    if (N().coolerFull()) { openDialog({ name: "Coolbox penuh", avatar: "🧊", lines: [A().hooks.fullMsg || "Coolbox-mu sudah penuh. Jual dulu tangkapanmu di Pasar Ikan, di sebelah barat dermaga."] }); return; }
    return startFishing(t.spot || "spot");
  }
  if (t.sign && !H().ownsSigns) return openDialog({ name: t.sign.title, avatar: "📜", lines: [t.sign.text] });
  if (H().interact) H().interact(t, api);
}

// ---------- Masuk mode mancing ----------
let fadeStarted = false;
function startFishing(spotId) { if (NW.hold) NW.hold.stop("fishing"); standUp(true); fishSpotId = spotId || "spot"; busy = true; busyT = 0; onUp(); keys.clear(); player.dir = (A().map.fishSpots.find((s) => s.id === fishSpotId) || {}).face ?? 0; N().sfx("click"); }
function updateBusy(dt) {
  busyT += dt;
  player.rod = clamp(busyT / 0.55, 0, 1);
  if (busyT > 0.7 && !fadeStarted) {
    fadeStarted = true;
    $("fade").classList.add("on");
    setTimeout(() => {
      savePos();
      N().enterFishing("dock");
      setTimeout(() => $("fade").classList.remove("on"), 60);
      busy = false; fadeStarted = false; player.rod = 0;
    }, 320);
  }
}
// posisi pemain per area (Muara tetap di S.world seperti dulu; area lain lewat NW.adv)
function savePos() { if (sailing()) return; /* di atas kapal: posisi disimpan NW.boat (S.sea), bukan titik di air */ const p = { x: +player.x.toFixed(2), y: +player.y.toFixed(2) }; if (A().id === "muara" || !NW.adv) N().S.world = p; else NW.adv.savePos(A().id, p); }
function savedPos(id) { return id === "muara" || !NW.adv ? N().S.world : NW.adv.getPos(id); }

// ---------- Pindah area ----------
// NPC area lama berhenti diproses; peta, collision, dan cache terrain diganti ke area baru.
function switchArea(id) {
  const a = NW.areas.get(id); if (!a || a === A()) return false;
  if (NW.hold) NW.hold.stop("travel");
  standUp(true); closeDialog(); cine = null; target = null;
  NW.areas.setCurrent(id);
  initNPCs(a);
  NW.buildTerrain(terrainWant());
  birds.length = 0; jumps.length = 0;
  N().S.loc = a.locIndex;
  if (NW.adv) NW.adv.enteredArea(id);
  return true;
}
// Dipanggil game.js saat kembali ke darat / tiba di area. areaId opsional (default: area aktif)
function onEnter(at, areaId) {
  busy = false; fadeStarted = false; player.rod = 0; closeDialog(); standUp(true); cine = null;
  if (NW.home) NW.home.reset();
  const switched = areaId ? switchArea(areaId) : false;
  const a = A(), S = N().S, sp = a.spawns || {};
  const place = (p) => { player.x = p.x; player.y = p.y; if (p.dir !== undefined) player.dir = p.dir; };
  // Bumbu 2.4: kapal. Di atas kapal pemain tidak dipindah ke darat; tanpa kapal tidak pernah muncul di air.
  let onBoat = false;
  if (NW.boat) {
    if (at === "start") onBoat = NW.boat.restore(a) === true;
    else if (at === "boat") NW.boat.arrivedByVoyage(a);
    else if ((at === "sail" || at === "sea") && NW.boat.on) { onBoat = true; NW.boat.resume(); }
    else if (switched) NW.boat.restore(a);
  }
  if (onBoat) { player.sit = false; NW.boat.syncPlayer(); }
  else {
    player.sit = false;
    if (at === "dock") { const s = a.map.fishSpots.find((f) => f.id === fishSpotId) || a.map.fishSpots[0]; place(s ? s.ret : sp.start || a.map.START); }
    else if (at === "boat" && sp.boat) place(sp.boat);
    else { const pos = savedPos(a.id); if (pos && NW.walkable(pos.x, pos.y)) place(pos); else place(sp.start || a.map.START); }
    if (!NW.walkable(player.x, player.y)) place(sp.start || a.map.START); // jaminan: tidak pernah muncul di air/bangunan
  }
  if (at === "start" || switched) a.npcs.forEach(placeNPC);
  S.loc = a.locIndex;
  snapCamera(); lastActKey = "?"; showBanner();
  if (H().onEnter) H().onEnter(at, switched);
  updateHint();
}
let bannerT = 0;
function showBanner() { const b = $("banner"); b.classList.remove("cap"); b.textContent = A().banner || A().name; b.classList.add("show"); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove("show"), 2200); }

// ---------- Ambience umum (burung & ikan melompat) ----------
const birds = [], jumps = [];
let birdT = 2, jumpT = 3;
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
    const cols = (A().theme && A().theme.jumpCols) || ["#8c9a8a", "#9aa3a8", "#d79a2e", "#5d7f9c"];
    for (let k = 0; k < 12; k++) {
      const x = player.x + rand(-9, 9), y = player.y + rand(-9, 9);
      if (!NW.isLandT(NW.tileAt(x, y)) && !NW.isLandT(NW.tileAt(x + 1, y)) && !NW.isLandT(NW.tileAt(x, y + 1))) { jumps.push({ x, y, t: 0, dur: 0.9, col: cols[k % cols.length] }); break; }
    }
  }
  for (const j of jumps) j.t += dt;
  for (let i = jumps.length - 1; i >= 0; i--) if (jumps[i].t > jumps[i].dur * 1.6) jumps.splice(i, 1);
  if (H().update) H().update(dt, api);
}

// ---------- Update NPC (umum) ----------
function walkTo(n, tx, ty, dt) {
  const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
  if (d < 0.05) { n.x = tx; n.y = ty; return true; }
  const step = Math.min(d, n.speed * dt);
  n.x += (dx / d) * step; n.y += (dy / d) * step;
  const a = NW.P(0, 0), b = NW.P(dx, dy); n.dir = dirOf(b.x - a.x, b.y - a.y);
  n.moving = true; n.walk += dt * 10 * n.speed / 1.2;
  return false;
}
// NPC lain di depan jalur → tunggu sebentar supaya tidak saling tembus/menumpuk (maks. 1,2 dtk lalu lanjut)
function blockedByNPC(n, p, dt) {
  for (const o of A().npcs) {
    if (o === n || o.hidden) continue;
    const d = Math.hypot(o.x - n.x, o.y - n.y); if (d > 0.6) continue;
    const ahead = (o.x - n.x) * (p.x - n.x) + (o.y - n.y) * (p.y - n.y) > 0;
    if (!ahead) continue;
    if (o.moving && n.area === o.area && A().npcs.indexOf(o) > A().npcs.indexOf(n)) continue; // yang di belakang yang mengalah
    n.yieldT = (n.yieldT || 0) + dt; if (n.yieldT < 1.2) { faceToward(n, o); return true; }
  }
  n.yieldT = 0; return false;
}
const ROAM = new Set(["butterfly", "patrol"]);
// aktivitas umum: berkeliling di beberapa node (a.route), berhenti sebentar di tiap node
const commonActs = {
  patrol(n, dt, a, k) {
    if (!n.path.length) {
      n.waitT -= dt;
      if (n.waitT > 0) { if (a.prop) n.prop = a.prop; if (a.faceAt && a.faceAt[n.alt % a.route.length] !== undefined) n.dir = a.faceAt[n.alt % a.route.length]; return; }
      n.alt = (n.alt || 0) + 1;
      const goal = a.route[n.alt % a.route.length];
      n.path = NW.areas.route(areaOf(n), n.x, n.y, goal); n.prop = null;
      n.waitT = rand(a.wait ? a.wait[0] : 3, a.wait ? a.wait[1] : 6);
      return;
    }
    if (n.path[0] && blockedByNPC(n, n.path[0], dt)) return;
    n.prop = null;
    if (walkTo(n, n.path[0].x, n.path[0].y, dt)) n.path.shift();
  },
};
function updateNPC(n, dt) {
  const area = areaOf(n), a = actNow(n, N().S.hour);
  if (a !== n.cur) { // ganti aktivitas: keluar rumah (bila perlu) lalu jalan ke tujuan
    if (n.hidden) { n.x = area.map.NAV[n.home][0]; n.y = area.map.NAV[n.home][1]; n.hidden = false; }
    n.cur = a; n.path = NW.areas.route(area, n.x, n.y, a.at); n.arrived = false; n.fishing = false; n.prop = null; n.waitT = 0; n.alt = 0; n.wander = null;
  }
  n.rod = lerp(n.rod, n.fishing ? 1 : 0, dt * 4);
  n.moving = false;
  if (n.hidden || n.talking) return;
  if (!n.arrived) {
    if (!inHome() && Math.hypot(player.x - n.x, player.y - n.y) < 0.5) { faceToward(n, player); return; } // tunggu pemain lewat
    const p = n.path[0];
    if (!p) { n.arrived = true; }
    else if (area.idleLook && blockedByNPC(n, p, dt)) return;
    else if (walkTo(n, p.x, p.y, dt)) n.path.shift();
    if (n.arrived) {
      if (a.hide) { n.hidden = true; return; }
      n.dir = a.face ?? n.dir; n.fishing = a.act === "fish"; n.prop = a.prop || null; n.waitT = a.act === "patrol" ? rand(2, 4) : rand(1, 3);
    }
    return;
  }
  // aktivitas di tempat
  n.prop = a.prop || null;
  // aktivitas berkeliling (kejar kupu-kupu, patroli): berhenti & menoleh bila pemain mendekat,
  // supaya tombol 💬 Bicara tidak hilang karena NPC terus berpindah
  if (ROAM.has(a.act) && !inHome() && Math.hypot(player.x - n.x, player.y - n.y) < 1.0) { faceToward(n, player); return; }
  const fn = (area.acts && area.acts[a.act]) || commonActs[a.act];
  if (fn) fn(n, dt, a, api);
  else if (area.idleLook) idleLook(n, dt, a);
}
// animasi diam: sesekali menoleh (ke pemain bila dekat), lalu kembali ke arah aktivitas
function idleLook(n, dt, a) {
  n.look = (n.look || rand(3, 7)) - dt;
  if (n.look > 0) return;
  if (n.glance) { n.dir = a.face ?? n.dir; n.glance = false; n.look = rand(4, 8); return; }
  const near = Math.hypot(player.x - n.x, player.y - n.y) < 3.2;
  if (near) faceToward(n, player); else n.dir = ((a.face ?? n.dir) + (Math.random() < 0.5 ? 1 : 7)) % 8;
  n.glance = true; n.look = rand(1.2, 2.2);
}

// ---------- Update utama ----------
let saveT = 0;
function update(dt) {
  N().tickTime(dt);
  if (NW.mp) NW.mp.update(dt); // Dunia Bersama: gerak halus pemain lain
  if (NW.hold) { NW.hold.validate(); player.hold = NW.hold.frame(); } // ikan terjual / pindah ke akuarium → berhenti; pose hanya tampilan
  if (busy) updateBusy(dt);
  if (cine) { cine.t += dt; cine.k = clamp(Math.min(cine.t / 1.1, (cine.dur - cine.t) / 1.1), 0, 1); const e = cine.k; cine.k = e * e * (3 - 2 * e); if (cine.t >= cine.dur) { const done = cine.done; cine = null; if (done) done(); } }
  const v = blocked() ? { x: 0, y: 0, m: 0 } : inputVec();
  if (NW.boat) NW.boat.update(dt, v); // Bumbu 2.4: joystick mengemudikan kapal saat di atas kapal
  if (sailing()) { /* posisi pemain mengikuti tempat duduk di buritan */ }
  else if (v.m > 0.05 && seat.on) standUp(); // geser joystick = berdiri dari bangku
  if (!sailing() && v.m > 0.05) {
    const SPEED = inHome() ? (NW.home.scene === "room" ? 115 : 140) : 180;
    const VK = inHome() ? 1 : 1.1; // imbangan kecil untuk proyeksi isometrik 2:1 (1.3 terlalu kencang saat ke bawah)
    const d = screenToWorld(v.x * SPEED * dt, v.y * SPEED * VK * dt);
    const nx = player.x + d.x, ny = player.y + d.y;
    if (walkable(nx, ny)) { player.x = nx; player.y = ny; }
    else if (walkable(nx, player.y)) player.x = nx;
    else if (walkable(player.x, ny)) player.y = ny;
    player.dir = dirOf(v.x, v.y); player.moving = true; player.walk += dt * 11 * (0.5 + v.m * 0.6);
    if (!moved) { moved = true; NW.story.mark("walk"); updateHint(); }
  } else if (!sailing()) player.moving = false;
  if (seat.on) { seat.t += dt; if (seat.tick) seat.tick(seat.t, dt); }
  player.z = inHome() ? 0 : undefined;

  for (const n of A().npcs) updateNPC(n, dt); // hanya NPC area aktif
  if (inHome()) NW.home.update(dt);
  else if (NW.adv) NW.adv.tick(A().id, player, dt); // penemuan tempat
  target = blocked() ? null : findTarget();
  updateActBtn();
  renderDialog(dt);
  const ct = camTarget(), k = Math.min(1, dt * (cine ? 3 : 5));
  cam.x = lerp(cam.x, ct.x, k); cam.y = lerp(cam.y, ct.y, k);
  if (!inHome()) updateAmbient(dt);
  saveT += dt; if (saveT > 3 && !inHome()) { saveT = 0; savePos(); }
}
// petunjuk: area aktif menentukan (Muara: petunjuk pemain baru; Toba: langkah cerita)
function updateHint() {
  if (inHome()) return;
  const h = H().hint ? H().hint() : "";
  if (sailing()) { // Bumbu 2.4: petunjuk berlayar (cerita area tetap didahulukan bila ada)
    const story = h && h.startsWith("📖") ? h : "";
    return N().setHint(story || (NW.boat.anchor ? "⚓ Berjangkar · 🎣 Memancing menyala · ⛵ Angkat jangkar untuk berlayar" : "⛵ Joystick atas = maju · kiri/kanan = belok · ⚓ Jangkar untuk berhenti"));
  }
  N().setHint(h);
}

// ---------- Gambar ----------
function viewRect() { return { x0: cam.x - W / 2 / Z, y0: cam.y - H2 / 2 / Z, x1: cam.x + W / 2 / Z, y1: cam.y + H2 / 2 / Z }; }
function inView(view, x, y, m = 120) { return x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m * 1.6; }
const worldXf = (ctx) => ctx.setTransform(DPR * Z, 0, 0, DPR * Z, DPR * (W / 2 - cam.x * Z), DPR * (H2 / 2 - cam.y * Z));
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function draw(ctx, t) {
  if (inHome()) return drawHome(ctx, t);
  const view = viewRect(), dk = N().darkness(), a = A(), m = a.map, hk = H();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = (a.theme && a.theme.deep) || NW.COL.deep; ctx.fillRect(0, 0, W, H2);
  worldXf(ctx);
  if (hk.drawBack) hk.drawBack(ctx, t, view, dk); // latar jauh (bukit di seberang danau)
  NW.drawTerrain(ctx, view);
  NW.drawWater(ctx, view, t);
  for (const j of jumps) NW.drawJump(ctx, j, t);
  if (NW.weather) NW.weather.drawGround(ctx, t, view, m, dk); // tanah basah, genangan, riak hujan
  if (NW.sea) NW.sea.drawUnder(ctx, t, view, a.id); // petunjuk spot laut: riak, arus, bayangan ikan
  if (NW.boat) NW.boat.drawWake(ctx, t, view);      // jejak air di belakang kapal
  if (hk.drawUnder) hk.drawUnder(ctx, t, view, inView, dk);

  // penanda titik mancing
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  for (const s of m.fishSpots) {
    const sp = NW.P(s.mx, s.my, NW.LIFT + s.mz);
    ctx.strokeStyle = `rgba(255,240,176,${0.5 + pulse * 0.4})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 18 + pulse * 4, (18 + pulse * 4) * 0.5, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = "rgba(255,240,176,.22)"; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 14, 7, 0, 0, 7); ctx.fill();
  }

  if (NW.secret) NW.secret.drawWorld(ctx, t, view, a.id); // riak & gelembung petunjuk spot rahasia
  const birdDraws = birds.map((b) => NW.drawBird(ctx, b, t));
  birdDraws.forEach((b) => b.shadow());

  // area layar pemain (untuk efek transparan bila tertutup)
  const pp = NW.P(player.x, player.y, gz(player.x, player.y)), pRect = { x0: pp.x - 14, x1: pp.x + 14, y0: pp.y - 56, y1: pp.y + 2 }, pDepth = player.x + player.y;
  let hiddenBehind = false;

  const list = [];
  for (const o of m.objects) { const p = NW.P(o.x, o.y, o.z || 0); if (inView(view, p.x, p.y, o.big || 120)) list.push({ d: o.x + o.y + (o.dz || (o.kind === "boat" ? 0.6 : 0)), o }); }
  for (const b of m.buildings) {
    const p = NW.P((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); if (!inView(view, p.x, p.y, 200)) continue;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    if (b.kind === "market" || b.drawBack) { list.push({ d: cx + b.y0 + 0.2, mback: b }); list.push({ d: cx + b.y1 + 0.05, mfront: b }); }
    else list.push({ d: cx + cy, b });
    // apakah bangunan ini menutupi pemain?
    const top = NW.P(b.x0, b.y0, NW.LIFT + (b.stilts || 0) + b.h + 40).y, bot = NW.P(b.x1, b.y1, 0).y;
    const bb = { x0: NW.P(b.x0, b.y1).x, x1: NW.P(b.x1, b.y0).x, y0: top, y1: bot };
    if ((b.kind === "market" || b.drawBack ? cx + b.y1 : cx + cy) > pDepth && overlap(pRect, bb) && pp.y < bot - 6) hiddenBehind = true;
  }
  for (const n of a.npcs) { if (n.hidden) continue; const p = NW.P(n.x, n.y); if (inView(view, p.x, p.y)) list.push({ d: n.x + n.y, ch: n }); }
  if (hk.layer) for (const it of hk.layer(t)) list.push({ d: it.d, fn: it.draw });
  player.rodSpec = NW.look.rodSpec(); // joran aktif (dari S.up.rod) → tampil di punggung
  const onBoat = sailing();
  if (NW.boat) for (const it of NW.boat.layer(t, (dz) => drawSeated(ctx, t, dz))) list.push({ d: it.d, fn: it.draw }); // kapal (pemain duduk di dalamnya)
  if (!onBoat) list.push({ d: pDepth, ch: player });
  if (NW.mp && !inHome()) for (const it of NW.mp.layer(view, inView)) list.push(it); // pemain lain (nyata) di Muara Kampung
  list.sort((x, y) => x.d - y.d);
  const night = dk / 0.85, claim = L() ? L().claimable() > 0 : false;
  for (const it of list) {
    if (it.fn) it.fn(ctx);
    else if (it.ch) {
      NW.drawCharacter(ctx, it.ch, t);
      if (it.ch === player) { // label nama + gelar: ikut urutan kedalaman, jadi tertutup bangunan di depannya
        const pb = NW.P(player.x, player.y, gz(player.x, player.y) - (player.sit ? 6 : 0));
        NW.look.drawPlayerLabel(ctx, pb, 1.0 / Z, NW.hold ? NW.hold.labelLift() : 0);
        if (NW.hold) NW.hold.drawTag(ctx, pb, 1.0 / Z);
      } else if (it.remote) NW.mp.drawTag(ctx, it.remote, 1.0 / Z); // nama + gelar pemain lain
    }
    else if (it.b) { if (it.b.draw) it.b.draw(ctx, it.b, t, night); else if (it.b.kind === "shop") NW.drawShop(ctx, it.b, t, night); else NW.drawHouse(ctx, it.b, t, night); }
    else if (it.mback) (it.mback.drawBack || NW.drawMarketBack)(ctx, it.mback, t, night);
    else if (it.mfront) (it.mfront.drawFront || NW.drawMarketFront)(ctx, it.mfront, t, night);
    else {
      // pohon di depan pemain dibuat transparan supaya pemain tetap terlihat
      const o = it.o, fade = (o.kind === "palm" || o.kind === "tree" || o.fade) && it.d > pDepth && occludes(o, pRect);
      if (fade) ctx.globalAlpha = 0.35;
      if (o.z) { ctx.save(); ctx.translate(0, -o.z); }
      drawObj(ctx, o, t, night, claim);
      if (o.z) ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  if (hiddenBehind && !onBoat) { ctx.globalAlpha = 0.5; NW.drawCharacter(ctx, player, t); ctx.globalAlpha = 1; }
  if (hk.drawOver) hk.drawOver(ctx, t, dk, view, inView);
  if (NW.mp && !inHome() && !onBoat) NW.mp.drawBubbles(ctx, 1.0 / Z); // bubble chat & emoji
  if (NW.weather) NW.weather.drawRoofs(ctx, t, view, m, player.x, player.y); // tetes dari atap
  if (NW.adv) NW.adv.drawFx(ctx, t); // kilau penemuan tempat
  if (NW.sea) NW.sea.drawOver(ctx, t, view, a.id, player.x, player.y); // burung laut berkumpul di atas spot
  birdDraws.forEach((b) => b.draw());

  // malam: gelapkan lalu nyalakan lampu
  if (dk > 0.02) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = `rgba(14,24,58,${(dk * 0.62).toFixed(3)})`; ctx.fillRect(0, 0, W, H2);
    worldXf(ctx);
    ctx.globalCompositeOperation = "lighter";
    const al = clamp((dk - 0.15) * 1.3, 0, 0.75) * 0.42;
    for (const [x, y] of m.lamps) { const lz = m.heightAt(x, y); NW.lightAt(ctx, x, y, 2 + lz, 78, "#ffb347", al); NW.lightAt(ctx, x, y, 40 + lz, 16, "#fff1c4", al * 1.6); }
    for (const b of m.buildings) {
      if (b.noLight) continue;
      const cx = b.kind === "market" ? (b.x0 + b.x1) / 2 : b.door === "x" ? b.x1 + 0.4 : (b.x0 + b.x1) / 2;
      const cy = b.door === "x" ? (b.y0 + b.y1) / 2 : b.y1 + 0.4;
      NW.lightAt(ctx, cx, cy, 10, 48, "#ffa94d", al * 0.8);
    }
    for (const l of m.lights) NW.lightAt(ctx, l.x, l.y, l.z || 14, l.r || 40, l.col || "#ffb347", al * (l.k || 1));
    if (NW.weather) NW.weather.wetLights(ctx, m, dk, al, view); // cahaya lampu terpantul di tanah basah
    ctx.globalCompositeOperation = "source-over";
  } else if (N().goldenHour() > 0) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = `rgba(255,150,70,${(N().goldenHour() * 0.12).toFixed(3)})`; ctx.fillRect(0, 0, W, H2);
    worldXf(ctx);
  }
  if (hk.drawSky) hk.drawSky(ctx, t, dk, view); // mis. kabut pagi di atas danau (setelah cahaya)
  if (NW.weather) { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); NW.weather.drawScreen(ctx, W, H2, t, dk / 0.85, a.id, "world"); worldXf(ctx); } // warna langit, kabut, hujan

  // gelembung aktivitas NPC (dekat pemain)
  for (const n of a.npcs) {
    if (n.hidden || n.talking || !n.arrived || !n.cur.bubble) continue;
    const d = Math.hypot(n.x - player.x, n.y - player.y); if (d > 7 || d < 1.6) continue;
    const p = NW.P(n.x, n.y, gz(n.x, n.y) + (n.style.scale ? 50 : 60)), b = Math.sin(t * 2 + n.seed) * 1.5;
    ctx.fillStyle = "rgba(255,249,236,.92)"; ctx.beginPath(); ctx.ellipse(p.x + 12, p.y - 4 + b, 11, 9, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 3, p.y + 5 + b, 2.2, 0, 7); ctx.fill();
    ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(n.cur.bubble, p.x + 12, p.y - 3.5 + b);
  }
  // tanda ❗ cerita di atas NPC & tempat yang ditunggu
  const mk = (x, y, z) => { const p = NW.P(x, y, gz(x, y) + z), b = Math.abs(Math.sin(t * 3)) * 4; ctx.fillStyle = "#e0b84c"; ctx.strokeStyle = "#173f50"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y - b, 8, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#173f50"; ctx.font = "900 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", p.x, p.y - b + 0.5); };
  if (hk.markerFor) for (const n of a.npcs) if (!n.hidden && hk.markerFor(n) && !(target && target.npc === n)) mk(n.x, n.y, n.style.scale ? 58 : 68);
  if (hk.placeMarkers) for (const pm of hk.placeMarkers()) mk(pm.x, pm.y, pm.z);
  drawTargetBubble(ctx, t);
  // nama NPC di atas kepala saat dekat
  ctx.font = "700 9px system-ui, sans-serif"; ctx.textAlign = "center";
  for (const n of a.npcs) {
    if (n.hidden) continue;
    const d = Math.hypot(n.x - player.x, n.y - player.y); if (d > 3) continue;
    const p = NW.P(n.x, n.y, gz(n.x, n.y) + (n.style.scale ? 44 : 52));
    ctx.globalAlpha = clamp((3 - d) / 1.2, 0, 1);
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(23,63,80,.85)"; ctx.strokeText(n.name, p.x, p.y);
    ctx.fillStyle = "#fff9ec"; ctx.fillText(n.name, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
// pemain duduk di buritan kapal memegang kemudi (joran tersimpan di dudukan, bukan di punggung)
const seated = { x: 0, y: 0, z: 0, dir: 0, walk: 0, moving: false, sit: true, rod: 0, rodSpec: null, hold: null, seed: 0 };
function drawSeated(ctx, t, dz) {
  Object.assign(seated, { x: player.x, y: player.y, z: 13 + dz, dir: player.dir, style: player.style });
  NW.drawCharacter(ctx, seated, t);
  NW.look.drawPlayerLabel(ctx, NW.P(player.x, player.y, 13 + dz - 6), 1.0 / Z, 0);
}
function occludes(o, pRect) {
  const b = NW.P(o.x, o.y, NW.LIFT + (o.z || 0)), s = o.s || 1;
  const r = o.kind === "palm" ? { x0: b.x - 40 + Math.min(0, o.lean * o.h * 0.55), x1: b.x + 40 + Math.max(0, o.lean * o.h * 0.55), y0: b.y - o.h - 30, y1: b.y - 8 }
    : o.occ ? { x0: b.x - o.occ[0] * s, x1: b.x + o.occ[0] * s, y0: b.y - o.occ[1] * s, y1: b.y - 6 }
    : { x0: b.x - 30 * s, x1: b.x + 30 * s, y0: b.y - 72 * s, y1: b.y - 6 };
  return overlap(pRect, r);
}
function drawTargetBubble(ctx, t) {
  if (!target || dialog.open || target.stand) return;
  const z0 = inHome() ? 0 : NW.LIFT, tx = target.npc ? target.npc.x : target.x, ty = target.npc ? target.npc.y : target.y;
  const hz = inHome() ? 0 : NW.heightAt(tx, ty);
  const tp = target.npc ? NW.P(tx, ty, z0 + hz + 58) : NW.P(tx, ty, z0 + hz + (target.bz ?? (target.id === "spot" || target.fish ? 30 : target.id === "boat" ? 40 : 54)));
  const bob = Math.sin(t * 4) * 2;
  ctx.fillStyle = "rgba(255,249,236,.95)"; ctx.strokeStyle = "#173f50"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(tp.x, tp.y - bob, 11, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tp.x - 4, tp.y + 9 - bob); ctx.lineTo(tp.x, tp.y + 15 - bob); ctx.lineTo(tp.x + 4, tp.y + 9 - bob); ctx.fill();
  ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#173f50";
  ctx.fillText(target.icon, tp.x, tp.y - bob + 1);
}
function drawHome(ctx, t) {
  NW.home.drawScene(ctx, t, N().darkness(), player, { W, H: H2, DPR, worldXf: () => worldXf(ctx) });
  if (NW.weather && NW.home.scene === "plot") { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); NW.weather.drawScreen(ctx, W, H2, t, N().darkness() / 0.85, A().id, "plot"); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  if (!NW.home.isEditing()) { worldXf(ctx); drawTargetBubble(ctx, t); }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
// layar → tile (dipakai Mode Tata Ruang)
function toTile(cx, cy, z = 0) {
  const wx = (cx - W / 2) / Z + cam.x, wy = (cy - H2 / 2) / Z + cam.y + z;
  return { x: (wx / HW + wy / HH) / 2, y: (wy / HH - wx / HW) / 2 };
}
// objek: gambar bawaan + gambar khusus area (NW.objDraw[kind])
NW.objDraw = NW.objDraw || {};
function drawObj(c, o, t, night, claim) {
  switch (o.kind) {
    case "palm": return NW.drawPalm(c, o, t, NW.weather ? NW.weather.windK() : 1);
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
    case "boat": if (o.vessel && NW.boat) return; return NW.drawBoat(c, o, t); // Bumbu 2.4: kapal pemain digambar NW.boat
    case "gate": return NW.HOUSE.gateDraw(c, o.x, o.y, t, "RUMAHKU", NW.LIFT);
    case "bamboo": return NW.drawBamboo(c, o, t);
    default: if (NW.objDraw[o.kind]) return NW.objDraw[o.kind](c, o, t, night);
  }
}

NW.world = {
  toTile, resize, update, draw, onEnter, updateHint, closeDialog, openDialog, snapCamera, player, interact, isBusy: () => busy, placeNPC, actNow,
  get npcs() { return NW.areas.get("muara").npcs; }, // kompatibel: NPC Muara (Darto, Sari, Dika)
  get zoom() { return Z; }, get cam() { return cam; },
  areaNpcs: () => A().npcs, get target() { return target; }, get dialogOpen() { return dialog.open; },
  switchArea, faceToward, walkTo, sitAt, standUp, look, caption, api, seat, savePos, fishSpot: () => fishSpotId, get cine() { return cine; },
};
})();
