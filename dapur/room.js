// NUSA ISLAND — Ide 08 · mesin ADEGAN DALAM RUANGAN (NW.room). Dipakai Kedai Bu Indah dan Dapur Rumahku.
// Antarmukanya sama dengan NW.home (walkable/candidates/interact/update/camTarget/drawScene) sehingga world/world.js hanya perlu memilih adegan aktif.
// Hemat HP: cangkang ruangan (lantai, dinding, perabot menempel dinding) digambar SEKALI ke kanvas luring lalu ditempel tiap bingkai;
// hanya benda bergerak/berinteraksi (pemain, NPC, uap, kucing) yang digambar ulang. Tidak digambar sama sekali bila pemain di luar ruangan.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDapurCore; if (!Core) return;
const P = (x, y, z) => NW.P(x, y, z || 0);
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SC = 2;                                                        // skala kanvas cangkang (cukup tajam untuk DPR 2)

const defs = {};
const st = { active: false, id: null, def: null, ret: null, onExit: null, block: 0, layer: null, layerKey: "", t: 0, entered: 0 };

function register(def) { defs[def.id] = def; return def; }
function fadeThen(fn) { const f = $("fade"); f.classList.add("on"); setTimeout(() => { fn(); setTimeout(() => f.classList.remove("on"), 60); }, 320); }
function banner(text) { const b = $("banner"); if (!b) return; b.textContent = text; b.classList.add("show"); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove("show"), 1800); }

// ---------- cangkang statis di kanvas luring ----------
function bounds(def) {
  const L = def.layout, H = def.wallH || 120, xs = [], ys = [];
  for (const [x, y, z] of [[0, 0, -10], [L.w, 0, -10], [L.w, L.d, -10], [0, L.d, -10], [0, 0, H + 40], [L.w, 0, H + 40], [0, L.d, H + 40]]) { const p = P(x, y, z); xs.push(p.x); ys.push(p.y); }
  const m = 24; return { x0: Math.floor(Math.min(...xs)) - m, y0: Math.floor(Math.min(...ys)) - m, x1: Math.ceil(Math.max(...xs)) + m, y1: Math.ceil(Math.max(...ys)) + m };
}
function layerFor(def, night) {
  const key = def.id + "|" + (night ? 1 : 0) + "|" + (def.shellKey ? def.shellKey() : "");
  if (st.layer && st.layerKey === key) return st.layer;
  const b = bounds(def), w = b.x1 - b.x0, h = b.y1 - b.y0, cv = document.createElement("canvas");
  cv.width = w * SC; cv.height = h * SC; const c = cv.getContext("2d");
  c.setTransform(SC, 0, 0, SC, -b.x0 * SC, -b.y0 * SC); c.lineJoin = "round"; c.lineCap = "round";
  def.drawShell(c, night);
  st.layer = { cv, ox: b.x0, oy: b.y0, w, h }; st.layerKey = key; return st.layer;
}
const mark = (on) => document.body.classList.toggle("room-active", on);   // CSS menyembunyikan tombol Rumahku (Tata Ruang, Kunjungi) selama di dalam adegan
const invalidate = () => { st.layer = null; st.layerKey = ""; };

// ---------- masuk / keluar ----------
function enter(id, player, opts) {
  const def = defs[id]; if (!def) return false; opts = opts || {};
  fadeThen(() => {
    st.ret = opts.ret || { x: player.x, y: player.y, dir: player.dir }; st.onExit = opts.onExit || null;
    st.active = true; mark(true); st.id = id; st.def = def; st.t = 0; st.entered = Date.now(); invalidate();
    player.x = def.layout.spawn.x; player.y = def.layout.spawn.y; player.dir = def.layout.spawn.dir || 0; player.moving = false;
    if (def.onEnter) def.onEnter(player);
    NW.world.snapCamera(); banner((def.layout.icon || "") + " " + def.layout.name);
  });
  return true;
}
function exit(player) {
  fadeThen(() => {
    const def = st.def, ret = st.ret, cb = st.onExit; if (def && def.onExit) def.onExit(player);
    st.active = false; mark(false); st.id = null; st.def = null; st.block = 0; st.onExit = null; st.layer = null; st.layerKey = "";
    if (cb) cb(player); else if (ret) { player.x = ret.x; player.y = ret.y; player.dir = ret.dir === undefined ? 2 : ret.dir; }
    player.moving = false; NW.world.snapCamera();
  });
}
function reset() { if (!st.active) return; try { if (st.def && st.def.onExit) st.def.onExit(NW.world.player); } catch (e) { /* tampilan saja */ } st.active = false; mark(false); st.id = null; st.def = null; st.block = 0; st.onExit = null; st.layer = null; st.layerKey = ""; }

// ---------- antarmuka adegan (dipakai world/world.js) ----------
const walkable = (x, y) => !!st.def && Core.walk(st.def.layout, x, y) && !(st.def.blocked && st.def.blocked(x, y));
const candidates = () => (st.def && st.def.candidates ? st.def.candidates() : []);
function interact(t, player, openDialog) {
  if (t.id === "exit") return exit(player);
  if (st.def && st.def.interact) return st.def.interact(t, player, openDialog);
}
function update(dt) { st.t += dt; if (st.def && st.def.update) st.def.update(dt, NW.world.player); }
function camTarget(player, W, H, ZW) {
  const L = st.def.layout, c = P(L.w / 2, L.d / 2, 34), portrait = H >= W;
  const rw = (L.w + L.d) * 32 + 60, rh = (L.w + L.d) * 16 + 170;
  const fit = Math.min((W - 16) / rw, (H - (portrait ? 250 : 90)) / rh), z = clamp(fit, 0.5, 1.5);
  if (fit >= 0.56) return { x: c.x, y: c.y - 8, z };
  const p = P(player.x, player.y, 0), k = 0.6;                                // layar sempit: kamera ikut pemain sebagian
  return { x: c.x + (p.x - c.x) * k, y: c.y - 8 + (p.y - c.y) * k, z: 0.56 };
}
function drawScene(ctx, t, dk, player, V) {
  const def = st.def, night = dk > 0.45;
  ctx.setTransform(V.DPR, 0, 0, V.DPR, 0, 0);
  const g = ctx.createRadialGradient(V.W / 2, V.H / 2, 40, V.W / 2, V.H / 2, Math.max(V.W, V.H) * 0.7);
  g.addColorStop(0, def.bg ? def.bg[0] : "#3a2f2a"); g.addColorStop(1, def.bg ? def.bg[1] : "#171210"); ctx.fillStyle = g; ctx.fillRect(0, 0, V.W, V.H);
  V.worldXf();
  const ly = layerFor(def, night); ctx.drawImage(ly.cv, ly.ox, ly.oy, ly.w, ly.h);
  const list = def.items ? def.items(t, night, player) : [];
  list.push({ d: player.x + player.y, draw: (c) => { NW.drawCharacter(c, player, t); if (def.afterPlayer) def.afterPlayer(c, player, t); } });
  list.sort((a, b) => a.d - b.d).forEach((it) => it.draw(ctx));
  if (def.drawTop) def.drawTop(ctx, t, night);
  if (dk > 0.05) {                                                           // malam: ruangan tetap hangat (lampu menyala), hanya dikurangi sedikit
    ctx.setTransform(V.DPR, 0, 0, V.DPR, 0, 0); ctx.fillStyle = `rgba(14,24,58,${(dk * 0.32).toFixed(3)})`; ctx.fillRect(0, 0, V.W, V.H);
    V.worldXf();
  }
  if (def.glow) { ctx.globalCompositeOperation = "lighter"; def.glow(ctx, t, clamp(0.35 + dk * 0.6, 0, 1)); ctx.globalCompositeOperation = "source-over"; }
  ctx.setTransform(V.DPR, 0, 0, V.DPR, 0, 0);
}

NW.room = {
  register, enter, exit, reset, invalidate, walkable, candidates, interact, update, camTarget, drawScene,
  get active() { return st.active; }, get scene() { return st.id; }, get def() { return st.def; }, get t() { return st.t; },
  isEditing: () => false, speed: () => 118,
  blocking: () => st.block > 0, block: (on) => { st.block = Math.max(0, st.block + (on ? 1 : -1)); }, unblockAll: () => { st.block = 0; },
  fadeThen, banner, defs,
};
})();
