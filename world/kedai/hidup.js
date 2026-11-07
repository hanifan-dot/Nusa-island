// =========================================================
//  NUSA ISLAND — Kehidupan harian Kedai Atuk Bahar (logika murni, bisa diuji di Node)
//  Jadwal (jam game; 1 hari = 8 menit nyata → 1 jam = 20 detik):
//    06.00 Atuk keluar rumah membawa meja kayu, menaruhnya di halaman, menyiapkan permainan
//    07.00–17.00 Atuk melayani pemain; dua anak keluar rumah, duduk/menonton/bermain di halaman
//    17.00 Atuk & anak saling pamit; Atuk berdiri, mengangkat meja, masuk rumah; anak berjalan pulang (masuk rumah)
//    18.00–06.00 semua di dalam rumah, lampu rumah menyala
//  Semua gerakan berupa jalur jalan (A* di atas fungsi walkable peta yang SAMA dengan pemain) — tanpa teleport.
//  Keadaan dihitung dari jam game: pemain yang datang terlambat / memuat ulang menemukan keadaan yang benar.
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaKedaiHidup = factory();
})(typeof self !== "undefined" ? self : this, function () {
"use strict";
const SPH = 20;                                   // detik nyata per jam game
const T = { setup: 6, open: 7, close: 17, night: 18 };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, k) => a + (b - a) * k;
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function phaseOf(h) { h = ((h % 24) + 24) % 24; return h >= T.night || h < T.setup ? "night" : h < T.open ? "setup" : h < T.close ? "open" : "close"; }
// arah layar 0 E,1 SE,2 S,3 SW,4 W,5 NW,6 N,7 NE dari vektor dunia (isometrik 2:1)
function dirOf(dx, dy) { const sx = dx - dy, sy = (dx + dy) / 2; return ((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) % 8) + 8) % 8; }

// ---------- pencari jalur ----------
function clearLine(walk, a, b, r) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 0.1));
  for (let i = 0; i <= n; i++) if (!walk(lerp(a.x, b.x, i / n), lerp(a.y, b.y, i / n), r)) return false;
  return true;
}
function findPath(walk, a, b, o) {
  const st = o.step || 0.25, r = o.r || 0.2, cols = Math.floor((o.x1 - o.x0) / st) + 1, rows = Math.floor((o.y1 - o.y0) / st) + 1;
  if (clearLine(walk, a, b, r)) return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
  const cx = (x) => clamp(Math.round((x - o.x0) / st), 0, cols - 1), cy = (y) => clamp(Math.round((y - o.y0) / st), 0, rows - 1);
  const px = (i) => o.x0 + (i % cols) * st, py = (i) => o.y0 + Math.floor(i / cols) * st, N = cols * rows;
  const s = cy(a.y) * cols + cx(a.x), g = cy(b.y) * cols + cx(b.x);
  const okc = new Int8Array(N); // 0 belum, 1 ya, -1 tidak
  const ok = (i) => (okc[i] ? okc[i] > 0 : (okc[i] = walk(px(i), py(i), r) ? 1 : -1) > 0);
  const gs = new Float64Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N), open = [s];
  gs[s] = 0;
  const h = (i) => Math.hypot(px(i) - px(g), py(i) - py(g));
  let found = false;
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (gs[open[k]] + h(open[k]) < gs[open[bi]] + h(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0]; if (done[cur]) continue; done[cur] = 1;
    if (cur === g) { found = true; break; }
    const ccx = cur % cols, ccy = (cur / cols) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = ccx + dx, ny = ccy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = ny * cols + nx; if (done[ni]) continue;
      if (ni !== g && !ok(ni)) continue;
      if (dx && dy && !(ok(ccy * cols + nx) && ok(ny * cols + ccx))) continue; // tidak memotong sudut
      const ng = gs[cur] + Math.hypot(dx, dy) * st; if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; open.push(ni); }
    }
  }
  if (!found) return null;
  const raw = []; for (let i = g; i !== -1; i = from[i]) raw.push({ x: px(i), y: py(i) });
  raw.reverse(); raw[0] = { x: a.x, y: a.y }; raw[raw.length - 1] = { x: b.x, y: b.y };
  const out = [raw[0]]; let i = 0;       // haluskan jalur (string pulling) — tetap harus lolos walkable
  while (i < raw.length - 1) { let j = raw.length - 1; while (j > i + 1 && !clearLine(walk, raw[i], raw[j], r)) j--; out.push(raw[j]); i = j; }
  return out;
}

function follow(a, dt) {
  if (!a.path || a.pi >= a.path.length) { a.moving = false; return true; }
  let rem = a.speed * dt;
  while (rem > 0 && a.pi < a.path.length) {
    const t = a.path[a.pi], dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy);
    if (d > 1e-4) a.dir = dirOf(dx, dy);
    if (d <= rem) { a.x = t.x; a.y = t.y; rem -= d; a.pi++; } else { a.x += (dx / d) * rem; a.y += (dy / d) * rem; rem = 0; }
  }
  a.moving = a.pi < a.path.length; a.walk += dt * a.speed * 6;
  if (!a.moving) a.path = null;
  return !a.moving;
}

// ---------- sutradara ----------
// cfg: { walkable(x,y,r), bounds, door:{x,y}, doorIn:{x,y}, place:{x,y}, seat:{x,y}, table:{x,y},
//        benches:[{sit:{x,y},app:{x,y},dir}], watch:[{x,y}], play:[{x,y}], onTable(bool), onSeat(bool), seed }
function makeDirector(cfg) {
  const R = mulberry(cfg.seed || 11), W = cfg.walkable, B = cfg.bounds, WR = 0.2;
  const stats = { fallbacks: 0, paths: 0 };
  const mk = (id, x, y, speed) => ({ id, x, y, dir: 4, vis: false, alpha: 0, moving: false, walk: 0, speed, st: "in", t: 0, path: null, pi: 0, sit: false, say: null, sayT: 0 });
  const atuk = Object.assign(mk("atuk", cfg.seat.x, cfg.seat.y, 1.0), { seated: false, carry: false, prep: false });
  const kids = cfg.benches.map((b, i) => Object.assign(mk("kid" + i, b.sit.x, b.sit.y, 1.3), { bench: i, wave: false, hop: 0, spot: null, leaving: false, ball: false }));
  const table = { state: "away", x: cfg.table.x, y: cfg.table.y, k: 0 }; // away | placing | down | lifting
  let lamp = 1, last = null, phase = null, inited = false, phaseT = 0;

  const route = (a, p) => { stats.paths++; const pts = findPath(W, { x: a.x, y: a.y }, p, { x0: B.x0, y0: B.y0, x1: B.x1, y1: B.y1, r: WR }); if (!pts) { stats.fallbacks++; return false; } a.path = pts; a.pi = 1; return true; };
  const say = (a, s, secs) => { a.say = s; a.sayT = secs; };
  const hide = (a) => { a.vis = false; a.alpha = 0; a.st = "in"; a.moving = false; a.path = null; a.sit = false; a.wave = false; a.say = null; };
  const showAt = (a, p, dir) => { a.vis = true; a.alpha = 1; a.x = p.x; a.y = p.y; a.dir = dir; a.moving = false; a.path = null; };

  // ----- Atuk -----
  function atukBeginSetup() {
    showAt(atuk, cfg.door, 0); atuk.alpha = 0; atuk.carry = true; atuk.seated = false; atuk.prep = false; atuk.st = "exit";
    table.state = "carried"; table.k = 0;
    if (!route(atuk, cfg.place)) { atuk.x = cfg.place.x; atuk.y = cfg.place.y; atuk.alpha = 1; }
  }
  function atukSeatedNow() { showAt(atuk, cfg.seat, 4); atuk.seated = true; atuk.carry = false; atuk.st = "serve"; atuk.prep = false; cfg.onSeat(true); }
  function tableDownNow() { table.state = "down"; table.k = 1; cfg.onTable(true); }
  function atukBeginClose() { atuk.st = "bye"; atuk.t = 2.4; atuk.prep = true; say(atuk, "Sudah sore… pulanglah, hati-hati!", 2.2); }

  function atukStep(dt) {
    const a = atuk;
    if (a.sayT > 0) { a.sayT -= dt; if (a.sayT <= 0) a.say = null; }
    switch (a.st) {
      case "exit": a.alpha = Math.min(1, a.alpha + dt / 0.35); if (follow(a, dt) && a.alpha >= 1) { a.st = "look"; a.t = 0.7; } break;
      case "look": a.t -= dt; a.dir = dirOf(1, 0); if (a.t <= 0) { a.st = "place"; a.t = 0.8; table.state = "placing"; table.k = 0; } break;
      case "place": a.t -= dt; table.k = clamp(1 - a.t / 0.8, 0, 1); if (a.t <= 0) { tableDownNow(); a.carry = false; a.st = "toSeat"; a.path = [{ x: a.x, y: a.y }, { x: cfg.seat.x, y: cfg.seat.y }]; a.pi = 1; } break;
      case "toSeat": if (follow(a, dt)) { a.seated = true; cfg.onSeat(true); a.st = "prep"; a.t = 3; a.prep = true; say(a, "Papan permainan sudah siap!", 2.4); } break;
      case "prep": a.t -= dt; if (a.t <= 0) { a.prep = false; a.st = "serve"; } break;
      case "bye": a.t -= dt; if (a.t <= 0) { a.st = "stand"; a.t = 0.45; a.prep = false; a.seated = false; cfg.onSeat(false); } break;
      case "stand": a.t -= dt; if (a.t <= 0) { a.st = "toTable"; a.path = [{ x: a.x, y: a.y }, { x: cfg.place.x, y: cfg.place.y }]; a.pi = 1; } break;
      case "toTable": if (follow(a, dt)) { a.dir = dirOf(1, 0); a.st = "lift"; a.t = 0.8; table.state = "lifting"; table.k = 1; cfg.onTable(false); } break;
      case "lift": a.t -= dt; table.k = clamp(a.t / 0.8, 0, 1); if (a.t <= 0) { table.state = "carried"; a.carry = true; a.st = "toDoor"; if (!route(a, cfg.door)) { a.x = cfg.door.x; a.y = cfg.door.y; } } break;
      case "toDoor": if (follow(a, dt)) { a.st = "enter"; a.t = 0.45; a.dir = dirOf(-1, 0); a.path = [{ x: a.x, y: a.y }, { x: cfg.doorIn.x, y: cfg.doorIn.y }]; a.pi = 1; a.speed = 0.55; } break;
      case "enter": follow(a, dt); a.t -= dt; a.alpha = clamp(a.t / 0.45, 0, 1); if (a.t <= 0) { hide(a); a.carry = false; a.speed = 1.0; table.state = "away"; } break;
    }
  }

  // ----- anak -----
  function kidSitPose(k) { const b = cfg.benches[k.bench]; k.x = b.sit.x; k.y = b.sit.y; k.dir = b.dir; k.sit = true; k.moving = false; }
  function beginStand(k) { k.st = "standup"; k.t = 0.35; k.from = { x: k.x, y: k.y }; }
  function kidIdleNext(k) { // pilih kegiatan berikutnya saat di bangku
    const r = R();
    beginStand(k); k.spot = null;
    k.next = r < 0.34 ? "watch" : r < 0.8 ? "play" : "walk";
  }
  function kidStartExit(k, delay) { hide(k); k.st = "wait"; k.t = delay; k.leaving = false; }
  function kidGoSpot(k, p, then) { k.sit = false; k.spot = p; k.then = then; k.st = "toSpot"; if (!route(k, p)) { k.x = p.x; k.y = p.y; k.moving = false; k.st = then; k.t = 2; } }
  function kidStep(k, dt) {
    if (k.sayT > 0) { k.sayT -= dt; if (k.sayT <= 0) k.say = null; }
    switch (k.st) {
      case "wait": k.t -= dt; if (k.t <= 0) { showAt(k, cfg.door, 0); k.alpha = 0; k.st = "exit"; if (!route(k, cfg.benches[k.bench].app)) kidSitPose(k); } break;
      case "exit": k.alpha = Math.min(1, k.alpha + dt / 0.3); if (follow(k, dt)) { k.alpha = 1; k.st = "sitdown"; k.t = 0.4; k.from = { x: k.x, y: k.y }; } break;
      case "sitdown": { k.t -= dt; const e = clamp(1 - k.t / 0.4, 0, 1), b = cfg.benches[k.bench]; k.x = lerp(k.from.x, b.sit.x, e); k.y = lerp(k.from.y, b.sit.y, e); k.dir = b.dir; if (k.t <= 0) { kidSitPose(k); k.st = "sit"; k.t = 5 + R() * 6; } break; }
      case "sit": k.t -= dt; if (k.t <= 0) kidIdleNext(k); break;
      case "standup": { k.t -= dt; const b = cfg.benches[k.bench], e = clamp(1 - k.t / 0.35, 0, 1); k.x = lerp(k.from.x, b.app.x, e); k.y = lerp(k.from.y, b.app.y, e); if (k.t <= 0) { k.sit = false; k.x = b.app.x; k.y = b.app.y; if (k.leaving) { k.st = "wave"; k.t = 1.8; k.wave = true; say(k, "Dadah, Tuk! 👋", 1.8); } else if (k.next === "watch") kidGoSpot(k, cfg.watch[k.bench % cfg.watch.length], "watch"); else if (k.next === "play") kidGoSpot(k, cfg.play[(k.bench + ((R() * cfg.play.length) | 0)) % cfg.play.length], "play"); else kidGoSpot(k, cfg.watch[(k.bench + 1) % cfg.watch.length], "wander"); } break; }
      case "toSpot": if (follow(k, dt)) { if (k.then === "watch") { k.dir = dirOf(cfg.table.x - k.x, cfg.table.y - k.y); k.t = 4 + R() * 3; } else if (k.then === "play") { k.t = 5 + R() * 4; k.ball = true; } else k.t = 1.2 + R(); k.st = k.then; } break;
      case "watch": case "wander": k.t -= dt; if (k.t <= 0) kidReturn(k); break;
      case "play": k.t -= dt; k.hop = Math.max(0, Math.sin((k.t * 3.2 + k.bench) * Math.PI)) * 5; if (k.t <= 0) { k.hop = 0; k.ball = false; kidReturn(k); } break;
      case "back": if (follow(k, dt)) { k.st = "sitdown"; k.t = 0.4; k.from = { x: k.x, y: k.y }; } break;
      case "wave": k.t -= dt; if (k.t <= 0) { k.wave = false; k.st = "toDoor"; k.speed = 1.45; if (!route(k, cfg.door)) { k.x = cfg.door.x; k.y = cfg.door.y; } } break;
      case "toDoor": if (follow(k, dt)) { k.st = "enter"; k.t = 0.4; k.dir = dirOf(-1, 0); k.path = [{ x: k.x, y: k.y }, { x: cfg.doorIn.x, y: cfg.doorIn.y }]; k.pi = 1; k.speed = 0.6; } break;
      case "enter": follow(k, dt); k.t -= dt; k.alpha = clamp(k.t / 0.4, 0, 1); if (k.t <= 0) { hide(k); k.speed = 1.3; k.leaving = false; } break;
    }
  }
  function kidReturn(k) { k.st = "back"; k.ball = false; if (!route(k, cfg.benches[k.bench].app)) { k.x = cfg.benches[k.bench].app.x; k.y = cfg.benches[k.bench].app.y; k.st = "sitdown"; k.t = 0.4; k.from = { x: k.x, y: k.y }; } }
  function kidBeginClose(k, delay) {
    k.leaving = true; k.next = null;
    if (k.st === "sit" || k.st === "sitdown") beginStand(k);
    else if (k.vis) { k.path = null; k.moving = false; k.ball = false; k.hop = 0; k.sit = false; k.st = "wave"; k.t = 1.8 + delay; k.wave = true; say(k, "Dadah, Tuk! 👋", 1.8 + delay); }
  }
  function kidSettleOpen(k, i) { showAt(k, cfg.benches[i].sit, cfg.benches[i].dir); kidSitPose(k); k.st = "sit"; k.t = 2 + R() * 6; k.speed = 1.3; k.wave = false; k.leaving = false; }

  // ----- keadaan seketika (muat ulang / datang terlambat / lompatan waktu) -----
  function settle(ph, hour) {
    const e = (((hour % 24) + 24) % 24 - (ph === "setup" ? T.setup : T.close)) * SPH;
    for (const k of kids) hide(k); hide(atuk); atuk.seated = false; atuk.carry = false; atuk.prep = false; cfg.onSeat(false);
    table.state = "away"; cfg.onTable(false);
    const night = () => { lamp = 1; };
    if (ph === "night") night();
    else if (ph === "setup") { lamp = 0; if (e < 8) atukBeginSetup(); else { tableDownNow(); atukSeatedNow(); } }
    else { lamp = 0; if (ph === "close" && e >= 12) { night(); } else { tableDownNow(); atukSeatedNow(); kids.forEach(kidSettleOpen); if (ph === "close") beginClose(); } }
  }
  function beginClose() { atukBeginClose(); kids.forEach((k, i) => kidBeginClose(k, i * 0.7)); }
  function beginPhase(ph) {
    if (ph === "setup") atukBeginSetup();
    else if (ph === "open") kids.forEach((k, i) => kidStartExit(k, i * 1.1));
    else if (ph === "close") beginClose();
    else if (ph === "night") { // jaga-jaga bila animasi penutupan belum selesai
      if (atuk.vis || kids.some((k) => k.vis)) settle("night", 18);
    }
  }

  function update(dt, hour) {
    dt = clamp(dt, 0, 0.1);
    const ph = phaseOf(hour); let adv = last === null ? 0 : hour - last; if (adv < -12) adv += 24; // lewat tengah malam
    if (!inited || adv > 0.4 || adv < -0.01) { settle(ph, hour); inited = true; }
    else if (ph !== phase) beginPhase(ph);
    phase = ph; last = hour;
    atukStep(dt); for (const k of kids) kidStep(k, dt);
    lamp = clamp(lamp + ((atuk.vis || kids.some((k) => k.vis) ? 0 : 1) - lamp) * Math.min(1, dt * 1.2), 0, 1);
    return state();
  }
  const state = () => ({ phase, atuk, kids, table, lamp, stats });
  return { update, state, settle, atuk, kids, table, stats, get lamp() { return lamp; }, get phase() { return phase; } };
}

return { SPH, T, phaseOf, dirOf, findPath, clearLine, makeDirector };
});
