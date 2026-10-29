// =========================================================
//  NUSA ISLAND — game mancing 2.5D
//  Fase: idle → charging → flying → waiting → bite → fight → (hasil)
// =========================================================
(() => {
"use strict";

// ---------- Util ----------
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const fmt = (n) => Math.round(n).toLocaleString("id-ID");
const fmtW = (w) => (w >= 10 ? w.toFixed(1) : w.toFixed(2)).replace(".", ",") + " kg";

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]);
}
const shade = (hex, amt) => (amt < 0 ? mix(hex, "#000000", -amt) : mix(hex, "#ffffff", amt));
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

// RNG ber-seed (untuk pemandangan & harga harian)
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
function hashStr(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));

// ---------- Simpanan ----------
const SAVE_KEY = "nusa-island-v1";
const DEFAULT = () => ({
  money: 50, day: 1, hour: 6.5, loc: 0,
  up: { rod: 0, bait: 0, cooler: 0, boat: 0 },
  cooler: [], dex: {}, stats: { casts: 0, caught: 0, earned: 0, legends: 0 },
  muted: false,
  world: null, // posisi pemain di Muara Kampung (Island Life)
  // Tahap 2A
  home: { items: [], cat: null }, // perabot Rumahku yang sudah dibeli
  missions: null,                // misi harian { day, list }
  rep: 0,                        // bintang reputasi kampung
  friends: {},                   // pertemanan NPC (0..5)
  talked: {},                    // NPC yang sudah diajak bicara hari ini
});
// ---------- Event (dipakai misi harian) ----------
const listeners = {};
function on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
function emit(type, data) { (listeners[type] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); }
let S = DEFAULT();
// Mode: "world" = jalan-jalan di pulau, "fish" = sistem mancing lama
let MODE = "world", fishFrom = "dock";
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      S = Object.assign(DEFAULT(), d);
      S.up = Object.assign(DEFAULT().up, d.up || {});
      S.stats = Object.assign(DEFAULT().stats, d.stats || {});
      S.home = Object.assign(DEFAULT().home, d.home || {});
    }
  } catch (e) { /* storage tidak tersedia: main tanpa simpan */ }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

// ---------- Audio (WebAudio sederhana) ----------
let AC = null, noiseBuf = null;
function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.6, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function tone(freq, dur, type = "sine", vol = 0.15, slideTo = null, delay = 0) {
  if (!AC || S.muted) return;
  const t0 = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, freq = 800, vol = 0.2, q = 0.8) {
  if (!AC || S.muted) return;
  const t0 = AC.currentTime;
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(AC.destination); src.start(t0); src.stop(t0 + dur);
}
const SFX = {
  cast: () => noise(0.35, 1800, 0.12, 0.5),
  splash: () => { noise(0.4, 600, 0.25); tone(220, 0.15, "sine", 0.05, 90); },
  nibble: () => tone(500, 0.06, "sine", 0.06),
  bite: () => { tone(880, 0.08, "square", 0.08); tone(1175, 0.12, "square", 0.08, null, 0.08); },
  tick: () => tone(1400 + Math.random() * 200, 0.02, "square", 0.025),
  surge: () => noise(0.25, 400, 0.18),
  snap: () => { tone(160, 0.3, "sawtooth", 0.15, 40); noise(0.15, 3000, 0.2); },
  lose: () => tone(330, 0.4, "triangle", 0.1, 160),
  catch: (r) => {
    const base = [523, 659, 784, 1047];
    base.forEach((f, i) => tone(f, 0.18, "triangle", 0.12, null, i * 0.09));
    if (r === "epik" || r === "legenda") [1319, 1568, 2093].forEach((f, i) => tone(f, 0.25, "sine", 0.1, null, 0.4 + i * 0.1));
  },
  coin: () => { tone(988, 0.08, "square", 0.07); tone(1319, 0.16, "square", 0.07, null, 0.08); },
  click: () => tone(660, 0.04, "sine", 0.06),
};

// ---------- Canvas & proyeksi 2.5D ----------
const cv = $("game"), ctx = cv.getContext("2d");
let W = 0, H = 0, DPR = 1, U = 1, HZ = 0, K = 0, BY = 0;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  U = clamp(Math.min(W / 420, H / 640), 0.55, 1.6);
  BY = H - (W < 700 ? 56 : 0); // di HP, perahu naik supaya tidak tertutup tombol
  HZ = H * 0.40;          // garis cakrawala
  K = H - HZ;             // jarak cakrawala → bawah layar
  if (window.NW && NW.world) NW.world.resize(W, H, DPR);
}
window.addEventListener("resize", resize);
// z = kedalaman (1 = bawah layar, besar = jauh), x = lateral
const projY = (z) => HZ + K / z;
const projX = (x, z) => W / 2 + (x * W * 0.5) / z;
const projS = (z) => 1 / z; // skala ukuran

// ---------- Waktu & langit ----------
const HOURS_PER_SEC = 24 / 480; // 1 hari = 8 menit
const isNight = () => S.hour >= 19 || S.hour < 5;
const NIGHT_SKY = ["#0b1a33", "#23395e"], DAWN_SKY = ["#33497a", "#f0a77e"], DUSK_SKY = ["#3a4c86", "#f39a58"];
function skyColors() {
  const L = LOCATIONS[S.loc], h = S.hour;
  const keys = [[0, NIGHT_SKY], [4.6, NIGHT_SKY], [6, DAWN_SKY], [8, L.sky], [16.4, L.sky], [18.2, DUSK_SKY], [19.6, NIGHT_SKY], [24, NIGHT_SKY]];
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, c0] = keys[i], [h1, c1] = keys[i + 1];
    if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0); return [mix(c0[0], c1[0], t), mix(c0[1], c1[1], t)]; }
  }
  return L.sky;
}
function darkness() { // 0 = siang, 1 = malam pekat
  const h = S.hour;
  if (h >= 7.5 && h <= 17) return 0;
  if (h > 17 && h < 19.8) return (h - 17) / 2.8 * 0.85;
  if (h >= 19.8 || h < 4.6) return 0.85;
  return 0.85 * (1 - (h - 4.6) / 2.9);
}

// ---------- Pemandangan ----------
let scenery = null, waves = [], stars = [], clouds = [];
function buildScenery() {
  const L = LOCATIONS[S.loc], r = seeded(hashStr(L.id));
  const s = { type: L.shore, items: [] };
  if (L.shore === "palm") {
    s.items.push({ kind: "bank", side: -1, w: 0.42, h: 0.03 + r() * 0.01 });
    s.items.push({ kind: "bank", side: 1, w: 0.36, h: 0.025 + r() * 0.01 });
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? 1 : -1;
      s.items.push({ kind: "palm", x: side * (0.62 + r() * 0.36), h: 0.05 + r() * 0.05, lean: (r() - 0.5) * 0.5 });
    }
    for (let i = 0; i < 4; i++) s.items.push({ kind: "hut", x: -0.95 + r() * 0.35, w: 0.03 + r() * 0.015 });
  } else if (L.shore === "hills") {
    for (let layer = 0; layer < 3; layer++) {
      const pts = [];
      for (let i = 0; i <= 24; i++) pts.push(0.03 + r() * (0.07 - layer * 0.018) + Math.sin(i * 0.7 + layer) * 0.02);
      s.items.push({ kind: "ridge", pts, layer });
    }
    s.items.push({ kind: "island", x: -0.15, w: 0.35, h: 0.035 }); // Samosir
  } else if (L.shore === "volcano") {
    s.items.push({ kind: "volcano", x: -0.42, w: 0.5, h: 0.16, smoke: true });
    s.items.push({ kind: "volcano", x: 0.55, w: 0.45, h: 0.07 });
    s.items.push({ kind: "island", x: 0.05, w: 0.18, h: 0.012 });
  } else if (L.shore === "karst") {
    for (let i = 0; i < 9; i++) s.items.push({ kind: "karst", x: -1.1 + i * 0.27 + r() * 0.1, w: 0.05 + r() * 0.08, h: 0.05 + r() * 0.08, far: r() });
  } else if (L.shore === "far") {
    s.items.push({ kind: "island", x: 0.6, w: 0.08, h: 0.008 });
    s.items.push({ kind: "volcano", x: -0.7, w: 0.12, h: 0.025 });
  }
  scenery = s;
}
function initAmbient() {
  waves = [];
  for (let i = 0; i < 150; i++) waves.push({ x: rand(-2.4, 2.4), z: rand(1.05, 16), p: rand(0, 6.28), l: rand(0.6, 1.4) });
  stars = [];
  for (let i = 0; i < 90; i++) stars.push({ x: Math.random(), y: Math.random() * 0.95, s: rand(0.5, 1.6), p: rand(0, 6.28) });
  clouds = [];
  for (let i = 0; i < 6; i++) clouds.push({ x: Math.random(), y: rand(0.05, 0.6), s: rand(0.6, 1.4), v: rand(0.003, 0.009) });
}

// ---------- Status mancing ----------
const G = {
  phase: "idle", t: 0, power: 0, powerDir: 1, perfect: false,
  bob: { x: 0, z: 2, sink: 0, vis: false },
  fly: null, target: { x: 0, z: 4 },
  biteTimer: 0, nibbles: [], biteWindow: 0, shadow: null,
  fight: null, reelBack: null, rodAngle: -0.95, rodBend: 0,
  ripples: [], drops: [], bubbles: [],
  pointerX: 0.5, holding: false, tickT: 0,
};
const upLvl = (k) => S.up[k];
const coolerCap = () => UPGRADES.cooler.cap[upLvl("cooler")];

// ---------- Pemilihan ikan ----------
function chooseFish() {
  const L = LOCATIONS[S.loc], night = isNight();
  const pool = FISH.filter((f) => (f.loc === L.id || f.loc === "*") && (f.night === undefined || f.night === night));
  let luck = UPGRADES.bait.luck[upLvl("bait")];
  if (G.perfect) luck *= 1.25;
  luck *= 1 + 0.35 * clamp((G.target.z - 2) / 7, 0, 1); // lempar jauh = lebih hoki
  const mult = { sampah: 1 / luck, biasa: 1, langka: Math.pow(luck, 0.75), epik: Math.pow(luck, 1.05), legenda: Math.pow(luck, 1.35) };
  const avail = RARITY_ORDER.filter((r) => pool.some((f) => f.rarity === r));
  let total = 0;
  const ws = avail.map((r) => { const w = RARITY[r].weight * mult[r]; total += w; return w; });
  let roll = Math.random() * total, rar = avail[0];
  for (let i = 0; i < avail.length; i++) { roll -= ws[i]; if (roll <= 0) { rar = avail[i]; break; } }
  const fish = pick(pool.filter((f) => f.rarity === rar));
  const wr = Math.pow(Math.random(), 2.3);
  const w = Math.round((fish.wMin + (fish.wMax - fish.wMin) * wr) * 100) / 100;
  return { fish, w, wr };
}

// ---------- Harga harian ----------
function priceMult(id, day = S.day) { return 0.7 + seeded(hashStr(id + ":" + day))() * 0.75; }
const PRICE_SCALE = 3;
function priceOf(item) { const f = FISH_BY_ID[item.id]; return Math.max(1, Math.round(f.price * PRICE_SCALE * item.w * priceMult(item.id))); }

// ---------- Input ----------
function press(px) {
  if (MODE !== "fish") return;
  G.holding = true;
  if (px !== undefined) G.pointerX = px / W;
  if (!started || !$("panelWrap").classList.contains("hidden") || !$("catchWrap").classList.contains("hidden")) return;
  initAudio();
  switch (G.phase) {
    case "idle":
      if (S.cooler.length >= coolerCap()) { toast(S.loc === 0 ? "Coolbox penuh! Kembali ke darat, jual di Pasar 🏪" : "Coolbox penuh! Pulang ke Muara untuk menjual 🏪", "bad"); flashCooler(); return; }
      G.phase = "charging"; G.power = 0; G.powerDir = 1; showMeter(true);
      break;
    case "waiting":
      startReelBack(); toast("Tarik kosong… coba lagi");
      break;
    case "bite":
      startFight();
      break;
  }
}
function release(px) {
  G.holding = false;
  if (MODE !== "fish") return;
  if (px !== undefined) G.pointerX = px / W;
  if (G.phase === "charging") doCast();
}
cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} press(e.clientX); });
cv.addEventListener("pointerup", (e) => { e.preventDefault(); release(e.clientX); });
cv.addEventListener("pointercancel", () => release());
cv.addEventListener("pointermove", (e) => { if (G.phase === "charging") G.pointerX = e.clientX / W; });
window.addEventListener("keydown", (e) => { if (MODE === "fish" && e.code === "Space" && !e.repeat) { e.preventDefault(); press(); } });
window.addEventListener("keyup", (e) => { if (MODE === "fish" && e.code === "Space") { e.preventDefault(); release(); } });
window.addEventListener("blur", () => { if (G.holding) release(); });

// ---------- Aksi ----------
function doCast() {
  showMeter(false);
  const p = G.power;
  G.perfect = p >= 0.9;
  const aim = clamp((G.pointerX - 0.5) * 2.2, -1.1, 1.1);
  G.target = { x: aim * (0.6 + p * 0.8) + rand(-0.08, 0.08), z: 2 + p * 7 };
  G.fly = { t: 0, dur: 0.55 + p * 0.35, from: rodTip(), };
  G.phase = "flying"; G.bob.vis = true; G.bob.sink = 0;
  S.stats.casts++;
  SFX.cast();
  if (G.perfect) { toast("Lemparan Sempurna! ✨ Lebih hoki", "good"); emit("perfect"); }
  updateHint();
}
function landBobber() {
  G.bob.x = G.target.x; G.bob.z = G.target.z;
  addRipple(G.bob.x, G.bob.z, 3); splashAt(G.bob.x, G.bob.z, 10);
  SFX.splash();
  G.phase = "waiting";
  const sp = UPGRADES.bait.speed[upLvl("bait")];
  G.biteTimer = rand(2.2, 7) / sp;
  G.nibbles = [];
  const n = (Math.random() * 3) | 0;
  for (let i = 0; i < n; i++) G.nibbles.push(rand(0.5, G.biteTimer - 0.4));
  G.shadow = { x: G.bob.x + rand(-0.6, 0.6), z: G.bob.z + rand(0.8, 1.6), a: 0 };
  updateHint();
}
function triggerBite() {
  G.pending = chooseFish();
  G.phase = "bite"; G.biteWindow = 0.95 + upLvl("bait") * 0.05;
  G.bob.sink = 1; addRipple(G.bob.x, G.bob.z, 2); splashAt(G.bob.x, G.bob.z, 6);
  SFX.bite();
  if (navigator.vibrate) try { navigator.vibrate(60); } catch (_) {}
  updateHint();
}
function startFight() {
  const { fish, w, wr } = G.pending;
  const pe = fish.power * (0.85 + 0.3 * wr);
  G.fight = { fish, w, pe, T: 0.25, P: 0.18, surge: 0, surgeT: rand(0.8, 2), slack: 0, over: 0, fx: G.bob.x, fxT: G.bob.x, z0: G.bob.z };
  G.phase = "fight";
  $("fightName").textContent = fish.rarity === "legenda" ? "⚠️ Sesuatu yang BESAR…" : fish.rarity === "epik" ? "Tarikannya kuat!" : "Strike! 🎣";
  $("fightUI").classList.remove("hidden");
  setNavLocked(true);
  splashAt(G.bob.x, G.bob.z, 14); SFX.splash();
  updateHint();
}
function endFight(result) {
  const F = G.fight;
  $("fightUI").classList.add("hidden");
  $("tensionBar").classList.remove("shake");
  if (result === "caught") {
    landFish(F.fish, F.w);
  } else {
    if (result === "snap") { toast("Senar putus! 💥", "bad"); SFX.snap(); if (navigator.vibrate) try { navigator.vibrate([40, 40, 80]); } catch (_) {} }
    else { toast(result === "slack" ? "Senar kendur, ikannya lepas…" : "Ikannya kabur…", "bad"); SFX.lose(); }
    setNavLocked(false);
    startReelBack();
  }
  G.fight = null;
}
function startReelBack() {
  G.phase = "reeling";
  G.reelBack = { t: 0, x: G.bob.x, z: G.bob.z };
  G.shadow = null;
  updateHint();
}
function landFish(fish, w) {
  G.phase = "result"; G.bob.vis = false; G.shadow = null;
  const rec = S.dex[fish.id] || { n: 0, best: 0 };
  const isNew = rec.n === 0, isRecord = !isNew && w > rec.best;
  rec.n++; rec.best = Math.max(rec.best, w); S.dex[fish.id] = rec;
  S.stats.caught++;
  if (fish.rarity === "legenda") S.stats.legends++;
  let reward = 0;
  if (fish.protected) { reward = Math.round(fish.price * PRICE_SCALE * w * 1.2); S.money += reward; S.stats.earned += reward; }
  else S.cooler.push({ id: fish.id, w });
  emit("catch", { fish, w, night: isNight(), loc: LOCATIONS[S.loc].id });
  save(); refreshHUD();
  SFX.catch(fish.rarity);
  showCatchCard(fish, w, { isNew, isRecord, reward });
}

// ---------- Update ----------
let last = performance.now(), started = false, saveT = 0;
// waktu berjalan (dipakai mode mancing & mode pulau)
function tickTime(dt) {
  const prevNight = isNight();
  S.hour += dt * HOURS_PER_SEC;
  if (S.hour >= 24) { S.hour -= 24; newDay(); }
  if (prevNight !== isNight() && started) toast(isNight() ? "Malam tiba 🌙 Ikan malam mulai keluar" : "Pagi tiba ☀️");
  refreshClock();
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
}
function newDay() {
  S.day++; S.talked = {};
  toast(`Hari ${S.day} — harga pasar & misi baru! 📈`);
  emit("day", S.day); save(); refreshHUD();
}
// tidur di Rumahku: lewati malam sampai jam 06:00
function sleepUntilMorning() {
  if (S.hour >= 6) newDay(); else { S.talked = {}; emit("day", S.day); }
  S.hour = 6; save(); refreshHUD();
}
function goldenHour() {
  const h = S.hour, bell = (a, b) => (h > a && h < b ? Math.sin(((h - a) / (b - a)) * Math.PI) : 0);
  return Math.max(bell(5.6, 8), bell(16, 18.6));
}
function update(dt) {
  tickTime(dt);

  G.t += dt;
  // ombak bergerak mendekat
  for (const w of waves) { w.z -= dt * 0.22 * w.z * 0.18; if (w.z < 1.02) { w.z = rand(12, 16); w.x = rand(-2.4, 2.4); } }
  for (const c of clouds) { c.x += c.v * dt; if (c.x > 1.2) c.x = -0.2; }

  // efek
  G.ripples = G.ripples.filter((r) => (r.life -= dt) > 0);
  for (const r of G.ripples) r.r += dt * r.sp;
  G.drops = G.drops.filter((d) => (d.life -= dt) > 0);
  for (const d of G.drops) { d.vy += 900 * dt * U; d.x += d.vx * dt; d.y += d.vy * dt; }
  G.bubbles = G.bubbles.filter((b) => (b.life -= dt) > 0);

  // joran
  let targetAngle = -0.95, targetBend = 0;

  switch (G.phase) {
    case "charging":
      G.power += G.powerDir * dt * 1.05;
      if (G.power >= 1) { G.power = 1; G.powerDir = -1; }
      if (G.power <= 0) { G.power = 0; G.powerDir = 1; }
      $("powerFill").style.height = (G.power * 100).toFixed(1) + "%";
      targetAngle = -1.0 - G.power * 0.95;
      break;
    case "flying": {
      const f = G.fly; f.t += dt / f.dur;
      targetAngle = -0.55;
      if (f.t >= 1) landBobber();
      break;
    }
    case "waiting": {
      G.biteTimer -= dt;
      G.nibbles = G.nibbles.filter((n) => {
        if (G.biteTimer <= n) { G.bob.sink = 0.35; addRipple(G.bob.x, G.bob.z, 1); SFX.nibble(); return false; }
        return true;
      });
      if (G.shadow) { // bayangan ikan mendekat
        const s = G.shadow; s.a = Math.min(1, s.a + dt * 0.4);
        const k = clamp(1 - G.biteTimer / 4, 0, 1);
        s.x = lerp(s.x, G.bob.x + Math.sin(G.t * 1.3) * 0.25 * (1 - k), dt * 1.2);
        s.z = lerp(s.z, G.bob.z + 0.15 + 0.9 * (1 - k), dt * 1.2);
      }
      if (G.biteTimer <= 0) triggerBite();
      break;
    }
    case "bite":
      G.biteWindow -= dt; G.bob.sink = 0.8 + Math.sin(G.t * 30) * 0.2; targetBend = 0.25;
      if (Math.random() < dt * 8) splashAt(G.bob.x, G.bob.z, 2);
      if (G.biteWindow <= 0) { toast("Telat narik, ikannya kabur! ⏱️", "bad"); SFX.lose(); startReelBack(); }
      break;
    case "fight": updateFight(dt); targetAngle = -0.9 + G.fight?.T * 0.35 || -0.9; targetBend = G.fight ? 0.25 + G.fight.T * 0.9 : 0; break;
    case "reeling": {
      const r = G.reelBack; r.t += dt / 0.5;
      if (r.t >= 1) { G.phase = "idle"; G.bob.vis = false; updateHint(); }
      break;
    }
  }
  G.bob.sink = lerp(G.bob.sink, 0, dt * (G.phase === "bite" ? 0 : 4));
  G.rodAngle = lerp(G.rodAngle, targetAngle, dt * (G.phase === "flying" ? 18 : 8));
  G.rodBend = lerp(G.rodBend, targetBend, dt * 8);

}

function updateFight(dt) {
  const F = G.fight; if (!F) return;
  const lv = upLvl("rod"), str = UPGRADES.rod.strength[lv], reel = UPGRADES.rod.reel[lv];
  // ikan menyentak
  F.surgeT -= dt;
  if (F.surge > 0) F.surge -= dt;
  else if (F.surgeT <= 0) {
    F.surge = rand(0.45, 0.9 + F.pe * 0.08);
    F.surgeT = Math.max(0.7, rand(1.3, 3.2) - F.pe * 0.1);
    F.fxT = clamp(F.fx + rand(-0.9, 0.9), -1.4, 1.4);
    splashAt(G.bob.x, G.bob.z, 8 + F.pe); SFX.surge();
  }
  const surging = F.surge > 0;
  if (G.holding) {
    const rate = 0.17 * reel / (0.55 + F.pe * 0.12);
    F.P += rate * dt * (surging ? 0.25 : 1);
    F.T += (0.28 + F.pe * 0.055) * (surging ? 2.3 : 1) * dt / str;
    G.tickT -= dt; if (G.tickT <= 0) { G.tickT = 0.07; SFX.tick(); }
  } else {
    F.T -= 0.65 * dt;
    F.P -= (0.02 + (surging ? 0.05 + F.pe * 0.012 : 0)) * dt;
  }
  F.T = clamp(F.T, 0, 1.15);
  if (F.T >= 1) { F.over += dt; if (F.over > 0.3) return endFight("snap"); } else F.over = Math.max(0, F.over - dt * 2);
  if (F.T < 0.06 && !G.holding) { F.slack += dt; if (F.slack > 2.2) return endFight("slack"); } else F.slack = Math.max(0, F.slack - dt * 2);
  if (F.P <= 0) return endFight("lost");
  if (F.P >= 1) return endFight("caught");

  F.fx = lerp(F.fx, F.fxT * (1 - F.P * 0.7), dt * (surging ? 2.5 : 0.8));
  G.bob.x = F.fx; G.bob.z = lerp(F.z0, 1.35, F.P);
  if (Math.random() < dt * (surging ? 14 : 4)) addRipple(G.bob.x, G.bob.z, 0.6);

  $("tensionFill").style.width = (Math.min(F.T, 1) * 100).toFixed(1) + "%";
  $("progressFill").style.width = (F.P * 100).toFixed(1) + "%";
  $("tensionBar").classList.toggle("shake", F.T > 0.82);
  const tip = $("fightTip");
  tip.textContent = F.T > 0.82 ? "⚠️ Senar hampir putus, LEPAS!" : F.slack > 0.8 ? "Senar kendur, tahan lagi!" : surging ? "Ikan menyentak! Hati-hati" : "Tahan = gulung · Lepas = kendurkan";
}

// ---------- Efek ----------
function addRipple(x, z, size = 1) { G.ripples.push({ x, z, r: 4, sp: 30 * size, life: 1.2, max: 1.2, size }); }
function splashAt(x, z, n) {
  const sx = projX(x, z), sy = projY(z), s = projS(z) * 3;
  for (let i = 0; i < n; i++) G.drops.push({ x: sx, y: sy, vx: rand(-80, 80) * s * U, vy: rand(-260, -120) * s * U, life: rand(0.35, 0.7), r: rand(1, 2.5) * Math.max(0.6, s) });
}

// ---------- Gambar ----------
function draw() {
  const L = LOCATIONS[S.loc], dk = darkness();
  const [skyTop, skyBot] = skyColors();

  // langit
  let g = ctx.createLinearGradient(0, 0, 0, HZ);
  g.addColorStop(0, skyTop); g.addColorStop(1, skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HZ + 1);

  // bintang
  if (dk > 0.4) {
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      ctx.globalAlpha = (dk - 0.4) * 1.6 * (0.5 + 0.5 * Math.sin(G.t * 2 + s.p));
      ctx.fillRect(s.x * W, s.y * HZ * 0.9, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  // matahari / bulan
  const h = S.hour;
  let celX, celY, isMoon = false;
  if (h >= 5 && h <= 19.5) { const t = (h - 5) / 14.5; celX = W * (0.12 + t * 0.76); celY = HZ - Math.sin(t * Math.PI) * HZ * 0.78 + 10; }
  else { isMoon = true; const t = ((h + 24 - 19.5) % 24) / 9.5; celX = W * (0.15 + t * 0.7); celY = HZ - Math.sin(t * Math.PI) * HZ * 0.7 + 10; }
  const celR = 22 * U;
  ctx.save();
  ctx.shadowColor = isMoon ? "rgba(220,230,255,.8)" : "rgba(255,220,140,.9)"; ctx.shadowBlur = 40 * U;
  ctx.fillStyle = isMoon ? "#eef2ff" : (h < 8 || h > 17 ? "#ffcf86" : "#fff3c4");
  ctx.beginPath(); ctx.arc(celX, celY, celR, 0, 7); ctx.fill();
  ctx.restore();

  // awan
  ctx.fillStyle = dk > 0.5 ? "rgba(120,140,170,.25)" : "rgba(255,255,255,.75)";
  for (const c of clouds) {
    const cx = c.x * W, cy = c.y * HZ * 0.7, s = c.s * 40 * U;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 1.6, s * 0.45, 0, 0, 7); ctx.ellipse(cx - s * 0.7, cy + 3, s * 0.8, s * 0.35, 0, 0, 7); ctx.ellipse(cx + s * 0.6, cy - s * 0.15, s * 0.9, s * 0.45, 0, 0, 7);
    ctx.fill();
  }

  drawShore(L, dk);

  // air
  const wTop = mix(mix(L.water[0], L.fog, 0.35), "#0a1830", dk * 0.8);
  const wBot = mix(L.water[1], "#050d1c", dk * 0.75);
  g = ctx.createLinearGradient(0, HZ, 0, H);
  g.addColorStop(0, wTop); g.addColorStop(1, wBot);
  ctx.fillStyle = g; ctx.fillRect(0, HZ, W, H - HZ);

  // pantulan matahari/bulan
  if (celY < HZ) {
    const refl = ctx.createLinearGradient(0, HZ, 0, H);
    const col = isMoon ? "220,230,255" : "255,226,160";
    refl.addColorStop(0, `rgba(${col},.45)`); refl.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = refl;
    for (let i = 0; i < 26; i++) {
      const z = 1 + i * 0.6, y = projY(z) , ww = (40 + Math.sin(G.t * 3 + i) * 14) * U * (1 - i / 30);
      if (y < HZ + 1) break;
      ctx.fillRect(celX - ww / 2 + Math.sin(G.t * 2 + i * 1.7) * 8, y - (2 / z) * 3, ww, Math.max(1, 6 / z));
    }
  }

  // ombak
  const waveCol = dk > 0.5 ? "rgba(160,190,230," : "rgba(255,255,255,";
  ctx.lineCap = "round";
  for (const w of waves) {
    const y = projY(w.z), x = projX(w.x + Math.sin(G.t * 0.8 + w.p) * 0.05, w.z), s = projS(w.z);
    const len = 36 * s * w.l * U * (W / 800);
    ctx.strokeStyle = waveCol + (0.12 + 0.35 * s).toFixed(3) + ")";
    ctx.lineWidth = Math.max(0.6, 3 * s * U);
    ctx.beginPath(); ctx.moveTo(x - len, y); ctx.quadraticCurveTo(x, y - 4 * s * U, x + len, y); ctx.stroke();
  }
  // kabut cakrawala
  g = ctx.createLinearGradient(0, HZ - 4, 0, HZ + 30 * U);
  g.addColorStop(0, rgba(mix(L.fog, "#0a1830", dk), 0.55)); g.addColorStop(1, rgba(mix(L.fog, "#0a1830", dk), 0));
  ctx.fillStyle = g; ctx.fillRect(0, HZ - 4, W, 34 * U);

  // bayangan ikan
  if (G.shadow && G.phase === "waiting") {
    const s = G.shadow, sx = projX(s.x, s.z), sy = projY(s.z), sc = projS(s.z) * 2.4;
    ctx.fillStyle = `rgba(5,15,25,${0.28 * s.a})`;
    ctx.beginPath(); ctx.ellipse(sx, sy, 26 * sc * U, 8 * sc * U, Math.sin(G.t) * 0.3, 0, 7); ctx.fill();
  }

  // riak
  for (const r of G.ripples) {
    const sx = projX(r.x, r.z), sy = projY(r.z), s = projS(r.z) * 2.2 * U;
    ctx.strokeStyle = `rgba(255,255,255,${(r.life / r.max) * 0.6})`;
    ctx.lineWidth = Math.max(0.8, 2 * s);
    ctx.beginPath(); ctx.ellipse(sx, sy, r.r * s, r.r * s * 0.3, 0, 0, 7); ctx.stroke();
  }

  drawBoat(dk);
  drawLineAndBobber();

  // cipratan
  ctx.fillStyle = "rgba(235,248,255,.9)";
  for (const d of G.drops) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r * U, 0, 7); ctx.fill(); }

  // tanda "!"
  if (G.phase === "bite") {
    const sx = projX(G.bob.x, G.bob.z), sy = projY(G.bob.z);
    const bounce = Math.abs(Math.sin(G.t * 10)) * 8;
    ctx.font = `900 ${Math.round(46 * U)}px Georgia, serif`; ctx.textAlign = "center";
    ctx.lineWidth = 6; ctx.strokeStyle = "#173f50"; ctx.strokeText("!", sx, sy - 40 * U - bounce);
    ctx.fillStyle = "#e0b84c"; ctx.fillText("!", sx, sy - 40 * U - bounce);
  }

  // gelap malam (vignette)
  if (dk > 0) {
    g = ctx.createRadialGradient(W / 2, H * 0.75, H * 0.2, W / 2, H * 0.6, H);
    g.addColorStop(0, "rgba(5,10,25,0)"); g.addColorStop(1, `rgba(5,10,25,${dk * 0.45})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function drawShore(L, dk) {
  if (!scenery) return;
  const base = mix(mix(L.shoreColor, L.fog, 0.45), "#08142a", dk * 0.85);
  const far = mix(mix(L.shoreColor, L.fog, 0.7), "#0b1a33", dk * 0.85);
  const hx = (x) => W / 2 + x * W * 0.5;
  for (const it of scenery.items) {
    if (it.kind === "ridge") {
      ctx.fillStyle = mix(far, base, it.layer / 2);
      ctx.beginPath(); ctx.moveTo(0, HZ + 1);
      it.pts.forEach((p, i) => ctx.lineTo((i / (it.pts.length - 1)) * W, HZ - p * H));
      ctx.lineTo(W, HZ + 1); ctx.fill();
    } else if (it.kind === "bank") {
      ctx.fillStyle = base;
      const x0 = it.side < 0 ? 0 : W * (1 - it.w), x1 = it.side < 0 ? W * it.w : W;
      ctx.beginPath(); ctx.moveTo(x0, HZ + 2);
      ctx.lineTo(x0, HZ - it.h * H); ctx.quadraticCurveTo((x0 + x1) / 2, HZ - it.h * H * 1.3, x1, HZ - (it.side < 0 ? 0 : it.h * H));
      ctx.lineTo(x1, HZ + 2); ctx.fill();
    } else if (it.kind === "palm") {
      const x = hx(it.x), y = HZ - 0.02 * H, hh = it.h * H;
      ctx.strokeStyle = base; ctx.lineWidth = Math.max(1.5, 3 * U);
      const tx = x + it.lean * hh, ty = y - hh;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + it.lean * hh * 0.2, y - hh * 0.6, tx, ty); ctx.stroke();
      ctx.fillStyle = base;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(G.t + it.x * 9) * 0.04;
        ctx.beginPath(); ctx.ellipse(tx + Math.cos(a) * hh * 0.22, ty + Math.sin(a) * hh * 0.12 + hh * 0.06, hh * 0.25, hh * 0.05, a, 0, 7); ctx.fill();
      }
    } else if (it.kind === "hut") {
      const x = hx(it.x), y = HZ - 0.025 * H, w = it.w * W;
      ctx.fillStyle = shade(base, -0.15);
      ctx.fillRect(x - w / 2, y - w * 0.5, w, w * 0.5);
      ctx.beginPath(); ctx.moveTo(x - w * 0.65, y - w * 0.45); ctx.lineTo(x, y - w * 0.95); ctx.lineTo(x + w * 0.65, y - w * 0.45); ctx.fill();
      if (dk > 0.4) { ctx.fillStyle = "rgba(255,210,120,.9)"; ctx.fillRect(x - w * 0.12, y - w * 0.35, w * 0.22, w * 0.18); }
    } else if (it.kind === "island") {
      ctx.fillStyle = far; const x = hx(it.x), w = it.w * W * 0.5;
      ctx.beginPath(); ctx.ellipse(x, HZ, w, it.h * H, 0, Math.PI, 0); ctx.fill();
    } else if (it.kind === "volcano") {
      const x = hx(it.x), w = it.w * W * 0.5, hh = it.h * H;
      ctx.fillStyle = it.h > 0.1 ? base : far;
      ctx.beginPath(); ctx.moveTo(x - w, HZ + 1); ctx.quadraticCurveTo(x - w * 0.3, HZ - hh * 0.5, x - w * 0.1, HZ - hh);
      ctx.lineTo(x + w * 0.1, HZ - hh); ctx.quadraticCurveTo(x + w * 0.3, HZ - hh * 0.5, x + w, HZ + 1); ctx.fill();
      if (it.smoke) {
        for (let i = 0; i < 5; i++) {
          const t = (G.t * 0.08 + i / 5) % 1;
          ctx.fillStyle = `rgba(200,200,200,${0.35 * (1 - t)})`;
          ctx.beginPath(); ctx.arc(x + t * 40 * U, HZ - hh - t * 70 * U, (6 + t * 18) * U, 0, 7); ctx.fill();
        }
      }
    } else if (it.kind === "karst") {
      const x = hx(it.x), w = it.w * W * 0.5, hh = it.h * H * (0.6 + it.far * 0.6);
      ctx.fillStyle = mix(base, far, it.far);
      ctx.beginPath(); ctx.moveTo(x - w * 0.6, HZ + 1);
      ctx.bezierCurveTo(x - w * 0.75, HZ - hh * 0.6, x - w * 1.1, HZ - hh, x - w * 0.2, HZ - hh * 1.05);
      ctx.bezierCurveTo(x + w * 0.9, HZ - hh * 1.1, x + w * 1.05, HZ - hh * 0.55, x + w * 0.65, HZ + 1);
      ctx.fill();
    }
  }
}

// posisi tangan & ujung joran
function handPos() { return { x: W / 2 + 34 * U, y: BY - 120 * U }; }
function rodTip() {
  const hp = handPos(), len = 230 * U, a = G.rodAngle;
  return { x: hp.x + Math.cos(a) * len * 0.75, y: hp.y + Math.sin(a) * len + G.rodBend * 40 * U };
}

function drawBoat(dk) {
  const cx = W / 2, by = H + 6 * U, B = BY;
  const L = LOCATIONS[S.loc], boatLv = upLvl("boat");
  const hull = ["#7a5230", "#2f7a8c", "#c9553b", "#e9e4d8", "#1f3f5a"][boatLv];
  const trim = ["#5a3b22", "#f0d58a", "#f3e7c9", "#d14a3a", "#e0b84c"][boatLv];
  const night = (c) => mix(c, "#0a1426", dk * 0.6);
  if (fishFrom === "dock" && S.loc === 0) drawDockFore(cx, by, B, night);
  else {
  // badan perahu (tampak dari belakang, menyempit ke depan)
    const nearW = 250 * U, farW = 70 * U, farY = B - 210 * U;
    ctx.fillStyle = night(shade(hull, -0.25));
    ctx.beginPath();
    ctx.moveTo(cx - nearW / 2 - 14 * U, by); ctx.lineTo(cx - farW / 2, farY); ctx.quadraticCurveTo(cx, farY - 34 * U, cx + farW / 2, farY);
    ctx.lineTo(cx + nearW / 2 + 14 * U, by); ctx.fill();
    ctx.fillStyle = night(hull);
    ctx.beginPath();
    ctx.moveTo(cx - nearW / 2, by); ctx.lineTo(cx - farW / 2 + 6 * U, farY + 6 * U); ctx.quadraticCurveTo(cx, farY - 22 * U, cx + farW / 2 - 6 * U, farY + 6 * U);
    ctx.lineTo(cx + nearW / 2, by); ctx.fill();
    // lantai papan
    ctx.strokeStyle = night(shade(hull, -0.35)); ctx.lineWidth = 1.5 * U;
    for (let i = 1; i < 6; i++) {
      const t = i / 6, y = lerp(by, farY + 10 * U, t), w = lerp(nearW, farW, t) / 2 - 10 * U;
      ctx.beginPath(); ctx.moveTo(cx - w, y); ctx.lineTo(cx + w, y); ctx.stroke();
    }
    // pinggiran
    ctx.strokeStyle = night(trim); ctx.lineWidth = 7 * U; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(cx - nearW / 2 - 8 * U, by); ctx.lineTo(cx - farW / 2, farY + 2 * U); ctx.quadraticCurveTo(cx, farY - 30 * U, cx + farW / 2, farY + 2 * U); ctx.lineTo(cx + nearW / 2 + 8 * U, by); ctx.stroke();

  }

  // lentera malam
  if (dk > 0.3) {
    const lx = cx - 70 * U, ly = B - 150 * U;
    const gg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 120 * U);
    gg.addColorStop(0, `rgba(255,200,110,${0.55 * dk})`); gg.addColorStop(1, "rgba(255,200,110,0)");
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(lx, ly, 120 * U, 0, 7); ctx.fill();
    ctx.fillStyle = "#3a2a1a"; ctx.fillRect(lx - 1 * U, ly - 26 * U, 2 * U, 14 * U);
    ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx - 6 * U, ly - 12 * U, 12 * U, 16 * U, 3 * U) : ctx.rect(lx - 6 * U, ly - 12 * U, 12 * U, 16 * U); ctx.fill();
  }

  // ember/coolbox
  const fill = S.cooler.length / coolerCap();
  const kx = cx + 78 * U, ky = B - 62 * U;
  ctx.fillStyle = night(["#7f8a8f", "#3f8fd0", "#3f8fd0", "#e9e4d8", "#e9e4d8"][upLvl("cooler")]);
  ctx.fillRect(kx - 26 * U, ky - 22 * U, 52 * U, 36 * U);
  ctx.fillStyle = night("#ffffff"); ctx.fillRect(kx - 28 * U, ky - 26 * U, 56 * U, 8 * U);
  if (fill > 0) { ctx.fillStyle = night("#c9d8de"); ctx.fillRect(kx - 22 * U, ky - 18 * U + (1 - fill) * 28 * U, 44 * U, fill * 28 * U); }

  // pemancing (tampak belakang, pakai caping)
  const px = cx - 6 * U, py = B - 96 * U;
  const shirt = night("#579b8b"), skin = night("#c68b5e");
  ctx.fillStyle = night("#2b3a44"); // celana/duduk
  ctx.beginPath(); ctx.ellipse(px, py + 52 * U, 40 * U, 16 * U, 0, 0, 7); ctx.fill();
  ctx.fillStyle = shirt;
  ctx.beginPath(); ctx.moveTo(px - 34 * U, py + 50 * U); ctx.quadraticCurveTo(px - 38 * U, py - 6 * U, px - 10 * U, py - 18 * U);
  ctx.lineTo(px + 10 * U, py - 18 * U); ctx.quadraticCurveTo(px + 38 * U, py - 6 * U, px + 34 * U, py + 50 * U); ctx.fill();
  // lengan ke joran
  const hp = handPos();
  ctx.strokeStyle = shirt; ctx.lineWidth = 13 * U; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(px + 22 * U, py - 4 * U); ctx.quadraticCurveTo(px + 40 * U, py + 10 * U, hp.x, hp.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px - 20 * U, py - 2 * U); ctx.quadraticCurveTo(px + 4 * U, py + 26 * U, hp.x - 8 * U, hp.y + 22 * U); ctx.stroke();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hp.x, hp.y, 7 * U, 0, 7); ctx.fill();
  // kepala & caping
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(px, py - 30 * U, 16 * U, 0, 7); ctx.fill();
  ctx.fillStyle = night("#1f2a2f"); ctx.beginPath(); ctx.arc(px, py - 32 * U, 15 * U, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.fillStyle = night("#e3be7a");
  ctx.beginPath(); ctx.moveTo(px - 46 * U, py - 34 * U); ctx.quadraticCurveTo(px, py - 76 * U, px + 46 * U, py - 34 * U); ctx.quadraticCurveTo(px, py - 26 * U, px - 46 * U, py - 34 * U); ctx.fill();
  ctx.strokeStyle = night("#b8924f"); ctx.lineWidth = 1.2 * U;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(px, py - 62 * U); ctx.lineTo(px + i * 18 * U, py - 32 * U); ctx.stroke(); }

  // joran
  const tip = rodTip();
  const rodCol = night(["#c9a46a", "#3d5a6c", "#222831", "#9aa6b0", "#e0b84c"][upLvl("rod")]);
  ctx.strokeStyle = rodCol; ctx.lineCap = "round";
  const mx = (hp.x + tip.x) / 2 + G.rodBend * 30 * U, my = (hp.y + tip.y) / 2 - 10 * U + G.rodBend * 10 * U;
  ctx.lineWidth = 6 * U; ctx.beginPath(); ctx.moveTo(hp.x - Math.cos(G.rodAngle) * 30 * U, hp.y - Math.sin(G.rodAngle) * 30 * U); ctx.lineTo(hp.x, hp.y); ctx.stroke();
  ctx.lineWidth = 3.5 * U; ctx.beginPath(); ctx.moveTo(hp.x, hp.y); ctx.quadraticCurveTo(mx, my, tip.x, tip.y); ctx.stroke();
  // reel
  ctx.fillStyle = night("#d8dde0"); ctx.beginPath(); ctx.arc(hp.x + 6 * U, hp.y + 8 * U, 7 * U, 0, 7); ctx.fill();
}

// Tampilan depan dermaga Muara (saat mancing dari darat)
function drawDockFore(cx, by, B, night) {
  const nearW = 360 * U, farW = 170 * U, farY = B - 175 * U;
  // tiang dermaga di air
  ctx.fillStyle = night("#5a3b22");
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
    const t = i / 2.6, y = lerp(by, farY, t), w = lerp(nearW, farW, t) / 2, s = 1 - t * 0.5;
    ctx.fillRect(cx + sd * (w + 4 * U) - 6 * U * s, y - 6 * U, 12 * U * s, 46 * U * s);
  }
  // tepi ujung dermaga
  ctx.fillStyle = night("#6e4628");
  ctx.fillRect(cx - farW / 2, farY, farW, 12 * U);
  // lantai papan
  ctx.fillStyle = night("#b27d48");
  ctx.beginPath(); ctx.moveTo(cx - nearW / 2, by); ctx.lineTo(cx - farW / 2, farY); ctx.lineTo(cx + farW / 2, farY); ctx.lineTo(cx + nearW / 2, by); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = night("#7d532c"); ctx.lineWidth = 1.6 * U;
  for (let i = 1; i < 10; i++) {
    const t = Math.pow(i / 10, 0.8), y = lerp(by, farY, t), w = lerp(nearW, farW, t) / 2;
    ctx.beginPath(); ctx.moveTo(cx - w, y); ctx.lineTo(cx + w, y); ctx.stroke();
  }
  ctx.strokeStyle = night("#c89560"); ctx.lineWidth = 2 * U;
  ctx.beginPath(); ctx.moveTo(cx - nearW / 2, by); ctx.lineTo(cx - farW / 2, farY); ctx.moveTo(cx + nearW / 2, by); ctx.lineTo(cx + farW / 2, farY); ctx.stroke();
  // tiang tambat
  for (const sd of [-1, 1]) {
    const x = cx + sd * (farW / 2 - 10 * U);
    ctx.fillStyle = night("#5a3b22"); ctx.fillRect(x - 6 * U, farY - 22 * U, 12 * U, 24 * U);
    ctx.fillStyle = night("#7d532c"); ctx.beginPath(); ctx.ellipse(x, farY - 22 * U, 6 * U, 3 * U, 0, 0, 7); ctx.fill();
  }
}

function bobberScreen() {
  if (G.phase === "flying") {
    const f = G.fly, t = clamp(f.t, 0, 1);
    const tx = projX(G.target.x, G.target.z), ty = projY(G.target.z);
    const arc = Math.sin(t * Math.PI) * (120 + G.power * 160) * U;
    return { x: lerp(f.from.x, tx, t), y: lerp(f.from.y, ty, t) - arc, s: lerp(1.4, projS(G.target.z) * 2.2, t) };
  }
  if (G.phase === "reeling") {
    const r = G.reelBack, t = clamp(r.t, 0, 1), tip = rodTip();
    const sx = projX(r.x, r.z), sy = projY(r.z);
    return { x: lerp(sx, tip.x, t), y: lerp(sy, tip.y, t) - Math.sin(t * Math.PI) * 40 * U, s: lerp(projS(r.z) * 2.2, 1.2, t) };
  }
  return { x: projX(G.bob.x, G.bob.z), y: projY(G.bob.z), s: projS(G.bob.z) * 2.2 };
}

function drawLineAndBobber() {
  if (!G.bob.vis) return;
  const tip = rodTip(), b = bobberScreen();
  const bobY = b.y + Math.sin(G.t * 2.2) * 1.5 * b.s * U + G.bob.sink * 10 * b.s * U;
  // senar: kendur saat menunggu, tegang saat tarik-ulur
  const tension = G.fight ? G.fight.T : G.phase === "bite" ? 0.4 : 0;
  const sag = (1 - clamp(tension, 0, 1)) * 60 * U;
  ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
  ctx.quadraticCurveTo((tip.x + b.x) / 2, Math.max(tip.y, bobY) + sag * (G.phase === "flying" ? 0.1 : 1), b.x, bobY);
  ctx.stroke();
  // pelampung
  const r = Math.max(3, 9 * b.s * U);
  if (G.phase !== "fight") {
    ctx.fillStyle = "#fbfbf6"; ctx.beginPath(); ctx.arc(b.x, bobY, r, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "#e2574c"; ctx.beginPath(); ctx.arc(b.x, bobY, r, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#173f50"; ctx.fillRect(b.x - r * 0.12, bobY - r * 1.9, r * 0.24, r * 0.9);
    if (G.phase !== "flying" && G.phase !== "reeling") {
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(b.x, bobY + r * 0.3, r * 1.8, r * 0.5, 0, 0, 7); ctx.stroke();
    }
  } else {
    // ikan menggeliat di permukaan
    const F = G.fight, surging = F.surge > 0;
    ctx.fillStyle = `rgba(255,255,255,${surging ? 0.7 : 0.35})`;
    ctx.beginPath(); ctx.ellipse(b.x, bobY, r * (surging ? 3 : 2), r * 0.7, 0, 0, 7); ctx.fill();
    if (surging) {
      ctx.fillStyle = rgba(F.fish.color || "#556", 0.85);
      const fl = r * 2.4;
      ctx.save(); ctx.translate(b.x, bobY - r * 0.5); ctx.rotate(Math.sin(G.t * 18) * 0.5);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-fl * 0.4, -fl * 0.7); ctx.lineTo(fl * 0.4, -fl * 0.7); ctx.fill();
      ctx.restore();
    }
  }
}

// ---------- Gambar ikan (untuk kartu & koleksi) ----------
function drawFish(c, f, x, y, L) {
  if (f.emoji) {
    c.font = `${Math.round(L * 0.55)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(f.emoji, x, y); return;
  }
  const [sl, sh] = f.shape;
  const bl = L * 0.74, bh = bl * (sh / sl) * 1.15;
  const hx = x + bl / 2 + L * 0.08, tx = hx - bl;
  const col = f.color, dark = shade(col, -0.3), finCol = f.finColor || shade(col, -0.15);
  const body = new Path2D();
  body.moveTo(hx, y + bh * 0.02);
  body.bezierCurveTo(hx - bl * 0.12, y - bh * (f.hump ? 0.9 : 0.62), tx + bl * 0.3, y - bh * 0.55, tx, y - bh * 0.12);
  body.lineTo(tx, y + bh * 0.12);
  body.bezierCurveTo(tx + bl * 0.3, y + bh * 0.52, hx - bl * 0.15, y + bh * 0.55, hx, y + bh * 0.02);
  body.closePath();

  // sirip punggung
  c.fillStyle = finCol;
  c.beginPath();
  if (f.fin === "sail") {
    c.moveTo(hx - bl * 0.2, y - bh * 0.4); c.bezierCurveTo(hx - bl * 0.3, y - bh * 3.2, tx + bl * 0.35, y - bh * 3.0, tx + bl * 0.15, y - bh * 0.35);
    c.closePath(); c.fill();
    c.fillStyle = shade(finCol, 0.35);
    for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(hx - bl * (0.32 + i * 0.07), y - bh * (0.9 + (i % 3) * 0.55), Math.max(1, bh * 0.08), 0, 7); c.fill(); }
    c.fillStyle = finCol; c.beginPath();
  } else if (f.fin === "long" || f.fin === "round") {
    c.moveTo(hx - bl * 0.3, y - bh * 0.48); c.quadraticCurveTo(x - bl * 0.05, y - bh * 0.85, tx + bl * 0.08, y - bh * 0.22);
  } else {
    c.moveTo(hx - bl * 0.32, y - bh * 0.5); c.lineTo(x - bl * 0.05, y - bh * 0.95); c.lineTo(x - bl * 0.2, y - bh * 0.42);
  }
  c.closePath(); c.fill();
  // sirip perut
  c.beginPath(); c.moveTo(x - bl * 0.05, y + bh * 0.42); c.lineTo(x - bl * 0.18, y + bh * 0.78); c.lineTo(x - bl * 0.25, y + bh * 0.36); c.fill();
  // ekor
  c.fillStyle = finCol;
  c.beginPath(); c.moveTo(tx + 2, y);
  if (f.fin === "pointed" || f.fin === "sail") {
    c.lineTo(tx - L * 0.2, y - bh * 0.7); c.quadraticCurveTo(tx - L * 0.1, y, tx - L * 0.2, y + bh * 0.7);
  } else {
    c.quadraticCurveTo(tx - L * 0.12, y - bh * 0.8, tx - L * 0.19, y - bh * 0.35);
    c.quadraticCurveTo(tx - L * 0.22, y, tx - L * 0.19, y + bh * 0.35);
    c.quadraticCurveTo(tx - L * 0.12, y + bh * 0.8, tx + 2, y);
  }
  c.closePath(); c.fill();

  // badan
  const g = c.createLinearGradient(0, y - bh * 0.6, 0, y + bh * 0.55);
  g.addColorStop(0, shade(col, -0.12)); g.addColorStop(0.45, col); g.addColorStop(1, f.belly || shade(col, 0.5));
  c.fillStyle = g; c.fill(body);
  c.save(); c.clip(body);
  if (f.stripes) {
    c.fillStyle = f.stripes;
    const n = f.id === "badut" ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const sx = hx - bl * (0.2 + i * (0.75 / n));
      c.beginPath(); c.ellipse(sx, y, bl * (f.id === "badut" ? 0.05 : 0.025), bh, 0.15, 0, 7); c.fill();
    }
  }
  if (f.spots) {
    c.fillStyle = f.spots; const r = seeded(hashStr(f.id));
    for (let i = 0; i < 16; i++) { c.beginPath(); c.arc(tx + r() * bl, y - bh * 0.5 + r() * bh * 0.8, Math.max(1, bh * 0.05 * (0.6 + r())), 0, 7); c.fill(); }
  }
  if (f.scales) {
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = Math.max(0.6, L * 0.006);
    const s = Math.max(4, bh * 0.16);
    for (let yy = y - bh * 0.5; yy < y + bh * 0.5; yy += s * 0.8) for (let xx = tx + s; xx < hx - bl * 0.2; xx += s) { c.beginPath(); c.arc(xx + ((yy / s) % 2) * s * 0.5, yy, s * 0.55, -1.2, 1.2); c.stroke(); }
  }
  // kilau
  c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.ellipse(x, y - bh * 0.25, bl * 0.35, bh * 0.1, 0, 0, 7); c.fill();
  c.restore();
  c.strokeStyle = dark; c.lineWidth = Math.max(1, L * 0.008); c.stroke(body);
  // insang
  c.beginPath(); c.arc(hx - bl * 0.12, y, bh * 0.38, 2.4, 3.9); c.stroke();
  // sirip dada
  c.fillStyle = rgba(finCol, 0.85); c.beginPath(); c.ellipse(hx - bl * 0.27, y + bh * 0.1, bl * 0.07, bh * 0.12, 0.5, 0, 7); c.fill();
  // mata
  const er = Math.max(2, bh * 0.1);
  c.fillStyle = "#fff"; c.beginPath(); c.arc(hx - bl * 0.07, y - bh * 0.12, er, 0, 7); c.fill();
  c.fillStyle = "#111"; c.beginPath(); c.arc(hx - bl * 0.065, y - bh * 0.12, er * 0.6, 0, 7); c.fill();
  if (f.whisker) {
    c.strokeStyle = dark; c.lineWidth = Math.max(0.8, L * 0.006);
    c.beginPath(); c.moveTo(hx - 2, y + bh * 0.05); c.quadraticCurveTo(hx + L * 0.1, y + bh * 0.2, hx + L * 0.06, y + bh * 0.5); c.stroke();
    c.beginPath(); c.moveTo(hx - 2, y); c.quadraticCurveTo(hx + L * 0.12, y - bh * 0.1, hx + L * 0.13, y + bh * 0.25); c.stroke();
  }
  if (f.bill) {
    c.fillStyle = dark; c.beginPath(); c.moveTo(hx - 2, y - bh * 0.08); c.lineTo(hx + L * 0.2, y + bh * 0.02); c.lineTo(hx - 2, y + bh * 0.1); c.fill();
  }
}
const fishImgCache = {};
function fishImg(id) {
  if (fishImgCache[id]) return fishImgCache[id];
  const c = document.createElement("canvas"); c.width = 200; c.height = 110;
  drawFish(c.getContext("2d"), FISH_BY_ID[id], 105, 55, 160);
  return (fishImgCache[id] = c.toDataURL());
}

// ---------- UI ----------
let toastT = null;
function toast(msg, kind = "") {
  const t = $("toast"); t.textContent = msg; t.className = "toast show " + kind;
  clearTimeout(toastT); toastT = setTimeout(() => (t.className = "toast " + kind), 2200);
}
function flashCooler() { const c = $("coolerChip"); c.classList.add("full"); setTimeout(refreshHUD, 1500); }
function showMeter(on) { $("powerMeter").classList.toggle("hidden", !on); if (!on) $("powerFill").style.height = "0%"; }
function setNavLocked(on) { document.querySelector(".nav").classList.toggle("locked", on); }
function setHint(msg) { const hint = $("hint"); hint.textContent = msg; hint.classList.toggle("fade", !msg); }
function updateHint() {
  if (MODE === "world") { if (NW.world) NW.world.updateHint(); return; }
  const hint = $("hint"), c = S.stats.casts;
  let msg = "";
  if (G.phase === "idle") msg = c < 3 ? "Tahan layar untuk mengayun, lepas untuk melempar" : "";
  else if (G.phase === "charging") msg = c < 3 ? "Lepas di zona atas untuk lemparan sempurna" : "";
  else if (G.phase === "waiting") msg = c < 4 ? "Tunggu sampai pelampung tenggelam…" : "";
  else if (G.phase === "bite") msg = "TARIK SEKARANG! 👆";
  hint.textContent = msg; hint.classList.toggle("fade", !msg);
}
function refreshHUD() {
  $("money").textContent = fmt(S.money);
  const cc = $("coolerChip"); $("cooler").textContent = `${S.cooler.length}/${coolerCap()}`;
  cc.classList.toggle("full", S.cooler.length >= coolerCap());
  $("locName").textContent = LOCATIONS[S.loc].name;
  $("muteBtn").textContent = S.muted ? "🔇" : "🔊";
  if (window.NW && NW.life) NW.life.refreshBadge();
  refreshClock();
}
let lastClock = "";
function refreshClock() {
  const hh = Math.floor(S.hour), mm = Math.floor((S.hour - hh) * 6) * 10;
  const s = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}|${S.day}`;
  if (s === lastClock) return; lastClock = s;
  $("clock").textContent = s.split("|")[0];
  $("dayLabel").textContent = "Hari " + S.day;
  $("clockIcon").textContent = isNight() ? "🌙" : (S.hour < 7.5 || S.hour > 17 ? "🌅" : "☀️");
}

// Kartu tangkapan
let lastCatch = null;
function showCatchCard(fish, w, info) {
  lastCatch = { fish, w, info };
  const R = RARITY[fish.rarity], card = $("catchCard");
  card.style.setProperty("--rc", R.color); card.style.setProperty("--glow", R.glow);
  $("catchRarity").textContent = R.label;
  $("catchName").textContent = fish.name;
  $("catchWeight").textContent = fmtW(w);
  $("catchDesc").textContent = fish.desc;
  const art = $("catchArt"), c = art.getContext("2d");
  c.clearRect(0, 0, art.width, art.height);
  const g = c.createRadialGradient(160, 90, 10, 160, 90, 160);
  g.addColorStop(0, rgba(R.color, 0.35)); g.addColorStop(1, rgba(R.color, 0));
  c.fillStyle = g; c.fillRect(0, 0, 320, 180);
  drawFish(c, fish, 160, 92, 230);
  const badges = [];
  if (info.isNew) badges.push("✨ Baru di koleksi");
  if (info.isRecord) badges.push("🏆 Rekor baru!");
  if (fish.night) badges.push("🌙 Ikan malam");
  if (info.reward) badges.push(`🐢 Dilepas · hadiah konservasi +${fmt(info.reward)}`);
  else if (!fish.emoji) badges.push(`≈ 🪙 ${fmt(priceOf({ id: fish.id, w }))} hari ini`);
  $("catchBadges").innerHTML = badges.map((b) => `<span>${b}</span>`).join("");
  $("catchWrap").classList.remove("hidden");
  setNavLocked(true);
}
$("catchOk").addEventListener("click", () => {
  SFX.click(); $("catchWrap").classList.add("hidden"); setNavLocked(false);
  G.phase = "idle"; updateHint();
  if (S.cooler.length >= coolerCap()) toast("Coolbox penuh! Jual di Pasar 🏪", "bad");
});
$("shareBtn").addEventListener("click", () => { SFX.click(); if (lastCatch) shareCard(lastCatch); });
$("shareClose").addEventListener("click", () => { SFX.click(); $("shareWrap").classList.add("hidden"); });

function shareCard({ fish, w }) {
  const R = RARITY[fish.rarity], L = LOCATIONS[S.loc];
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
  const x = c.getContext("2d");
  let g = x.createLinearGradient(0, 0, 0, 1350);
  g.addColorStop(0, L.sky[0]); g.addColorStop(0.45, L.sky[1]); g.addColorStop(0.46, L.water[0]); g.addColorStop(1, L.water[1]);
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = "rgba(255,249,236,.95)";
  x.beginPath(); x.roundRect ? x.roundRect(90, 220, 900, 930, 60) : x.rect(90, 220, 900, 930); x.fill();
  x.lineWidth = 16; x.strokeStyle = R.color; x.stroke();
  x.textAlign = "center"; x.fillStyle = "#173f50";
  x.font = "900 92px Georgia, serif"; x.fillText("NUSA ISLAND", 540, 150);
  x.fillStyle = R.color; x.beginPath(); x.roundRect ? x.roundRect(390, 270, 300, 70, 35) : x.rect(390, 270, 300, 70); x.fill();
  x.fillStyle = "#fff"; x.font = "800 40px system-ui, sans-serif"; x.fillText(R.label.toUpperCase(), 540, 318);
  g = x.createRadialGradient(540, 590, 20, 540, 590, 420);
  g.addColorStop(0, rgba(R.color, 0.35)); g.addColorStop(1, rgba(R.color, 0));
  x.fillStyle = g; x.fillRect(90, 360, 900, 460);
  drawFish(x, fish, 540, 600, 700);
  x.fillStyle = "#173f50"; x.font = "700 86px Georgia, serif"; x.fillText(fish.name, 540, 920);
  x.fillStyle = "#8a6412"; x.font = "800 64px system-ui, sans-serif"; x.fillText(fmtW(w), 540, 1005);
  x.fillStyle = "#315f4e"; x.font = "500 38px system-ui, sans-serif"; x.fillText(`📍 ${L.name} · Hari ${S.day}`, 540, 1080);
  x.fillStyle = "#fff9ec"; x.font = "600 38px system-ui, sans-serif"; x.fillText("Mancing keliling Nusantara 🎣", 540, 1250);
  c.toBlob((blob) => {
    if (!blob) return toast("Gagal membuat gambar", "bad");
    const file = new File([blob], `nusa-island-${fish.id}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "Nusa Island", text: `Aku dapat ${fish.name} ${fmtW(w)} di Nusa Island! 🎣` }).catch(() => {});
    } else {
      try { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); } catch (_) {}
      // tampilkan juga gambarnya: di HP tekan lama untuk menyimpan (berguna bila unduhan diblokir)
      $("shareImg").src = c.toDataURL("image/png"); $("shareWrap").classList.remove("hidden");
    }
  }, "image/png");
}

// ---------- Panel ----------
let currentPanel = null, dexTab = null;
const extraPanels = {}; // panel dari modul lain: { title, render(), act(act, arg) }
function registerPanel(name, def) { extraPanels[name] = def; }
document.querySelectorAll(".nav button[data-panel]").forEach((b) => b.addEventListener("click", () => { SFX.click(); openPanel(b.dataset.panel); }));
$("panelClose").addEventListener("click", closePanel);
$("panelWrap").addEventListener("click", (e) => { if (e.target.id === "panelWrap") closePanel(); });
$("muteBtn").addEventListener("click", () => { S.muted = !S.muted; save(); refreshHUD(); initAudio(); });
$("dexBtn").addEventListener("click", () => { SFX.click(); openPanel("dex"); });
$("misiBtn").addEventListener("click", () => { SFX.click(); openPanel("missions"); });
$("landBtn").addEventListener("click", () => {
  if (["fight", "bite", "charging", "result"].includes(G.phase)) return;
  SFX.click();
  if (S.loc === 0) goWorld("dock"); else openPanel("map");
});

function openPanel(name) {
  if (["fight", "bite", "charging", "result"].includes(G.phase)) return;
  if (G.phase === "waiting" || G.phase === "flying") { G.phase = "idle"; G.bob.vis = false; G.shadow = null; showMeter(false); updateHint(); }
  currentPanel = name; renderPanel(); $("panelWrap").classList.remove("hidden"); $("hint").classList.add("fade");
}
function closePanel() { SFX.click(); $("panelWrap").classList.add("hidden"); currentPanel = null; updateHint(); }
function renderPanel() {
  const body = $("panelBody");
  const titles = { market: "🏪 Pasar Ikan", shop: "🛠️ Toko Perlengkapan", dex: "📖 Koleksi Ikan", map: "🗺️ Peta Nusantara" };
  if (extraPanels[currentPanel]) { $("panelTitle").textContent = extraPanels[currentPanel].title(); body.innerHTML = extraPanels[currentPanel].render(); return; }
  $("panelTitle").textContent = titles[currentPanel];
  if (currentPanel === "market") body.innerHTML = marketHTML();
  if (currentPanel === "shop") body.innerHTML = shopHTML();
  if (currentPanel === "dex") body.innerHTML = dexHTML();
  if (currentPanel === "map") body.innerHTML = mapHTML();
}
$("panelBody").addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const act = el.dataset.act, arg = el.dataset.arg;
  if (act === "sellAll") sellAll();
  if (act === "sell") sellOne(+arg);
  if (act === "buy") buy(arg);
  if (act === "tab") { dexTab = arg; SFX.click(); renderPanel(); }
  if (act === "go") travel(+arg);
  if (extraPanels[currentPanel] && extraPanels[currentPanel].act) extraPanels[currentPanel].act(act, arg, el);
});

function trendHTML(id) {
  const m = priceMult(id);
  return m >= 1.12 ? `<span class="trend-up">▲ ${Math.round((m - 1) * 100)}%</span>` : m <= 0.88 ? `<span class="trend-down">▼ ${Math.round((1 - m) * 100)}%</span>` : "";
}
function marketHTML() {
  const total = S.cooler.reduce((s, it) => s + priceOf(it), 0);
  const L = LOCATIONS[S.loc];
  const hot = FISH.filter((f) => f.loc === L.id).map((f) => ({ f, m: priceMult(f.id) })).sort((a, b) => b.m - a.m)[0];
  let h = `<p class="muted">Harga berubah tiap hari. Tahan dulu ikan yang lagi murah, jual saat naik!</p>`;
  if (hot && hot.m > 1.1) h += `<p>🔥 Lagi mahal di ${L.short}: <b>${hot.f.name}</b> <span class="trend-up">▲ ${Math.round((hot.m - 1) * 100)}%</span></p>`;
  h += `<div class="market-sum"><div><div class="muted">Isi coolbox ${S.cooler.length}/${coolerCap()}</div><b>🪙 ${fmt(total)}</b></div>
        <button class="btn gold" data-act="sellAll" ${S.cooler.length ? "" : "disabled"}>Jual Semua</button></div>`;
  if (!S.cooler.length) return h + `<p class="muted" style="text-align:center;padding:20px 0">Coolbox masih kosong. Ayo mancing dulu! 🎣</p>`;
  h += `<div class="list">`;
  S.cooler.map((it, i) => ({ it, i })).sort((a, b) => priceOf(b.it) - priceOf(a.it)).forEach(({ it, i }) => {
    const f = FISH_BY_ID[it.id];
    h += `<div class="row" style="border-left-color:${RARITY[f.rarity].color}">
      ${f.emoji ? `<div class="emo">${f.emoji}</div>` : `<img src="${fishImg(f.id)}" alt="">`}
      <div class="grow"><div class="nm">${f.name}</div><div class="sub">${fmtW(it.w)} · ${RARITY[f.rarity].label} ${trendHTML(f.id)}</div></div>
      <div class="price">🪙 ${fmt(priceOf(it))}</div>
      <button class="btn small" data-act="sell" data-arg="${i}">Jual</button></div>`;
  });
  return h + `</div>`;
}
function sellAll() {
  const total = S.cooler.reduce((s, it) => s + priceOf(it), 0);
  if (!total) return;
  S.money += total; S.stats.earned += total; S.cooler = []; emit("sell", total);
  SFX.coin(); toast(`Terjual! +🪙 ${fmt(total)}`, "good"); save(); refreshHUD(); renderPanel();
}
function sellOne(i) {
  const it = S.cooler[i]; if (!it) return;
  const p = priceOf(it); S.money += p; S.stats.earned += p; S.cooler.splice(i, 1); emit("sell", p);
  SFX.coin(); save(); refreshHUD(); renderPanel();
}

function shopHTML() {
  let h = `<p class="muted">Upgrade alat untuk menaklukkan ikan yang lebih besar dan pulau yang lebih jauh.</p>`;
  for (const [k, U2] of Object.entries(UPGRADES)) {
    const lv = upLvl(k), max = lv >= U2.levels.length - 1, cost = max ? 0 : U2.cost[lv + 1];
    h += `<div class="shop-item"><div class="ic">${U2.icon}</div><div class="grow">
      <div class="nm"><b>${U2.levels[lv]}</b></div>
      <div class="lvl">${U2.levels.map((_, i) => `<i class="${i <= lv ? "on" : ""}"></i>`).join("")}</div>
      <div class="muted">${max ? "Level maksimal 🌟" : "Berikutnya: " + U2.levels[lv + 1] + " · " + U2.info[lv + 1]}</div></div>
      ${max ? "" : `<button class="btn ${S.money >= cost ? "gold" : ""}" data-act="buy" data-arg="${k}" ${S.money >= cost ? "" : "disabled"}>🪙 ${fmt(cost)}</button>`}</div>`;
  }
  return h;
}
function buy(k) {
  const U2 = UPGRADES[k], lv = upLvl(k);
  if (lv >= U2.levels.length - 1) return;
  const cost = U2.cost[lv + 1]; if (S.money < cost) return;
  S.money -= cost; S.up[k] = lv + 1;
  SFX.coin();
  if (k === "boat") toast(`⛵ ${LOCATIONS[lv + 1].name} terbuka! Buka Peta untuk berlayar`, "good");
  else toast(`${U2.icon} ${U2.levels[lv + 1]} dibeli!`, "good");
  save(); refreshHUD(); renderPanel();
}

function dexHTML() {
  const tabs = [...LOCATIONS.map((l) => ({ id: l.id, name: l.short })), { id: "*", name: "Lain-lain" }];
  if (!dexTab) dexTab = LOCATIONS[S.loc].id;
  const totalAll = FISH.length, gotAll = FISH.filter((f) => S.dex[f.id]).length;
  let h = `<div class="muted">Total koleksi ${gotAll}/${totalAll} · Tangkapan ${S.stats.caught} · Legenda ${S.stats.legends}</div>
    <div class="progress-line"><div style="width:${(gotAll / totalAll) * 100}%"></div></div>
    <div class="dex-tabs">${tabs.map((t) => `<button data-act="tab" data-arg="${t.id}" class="${t.id === dexTab ? "on" : ""}">${t.name}</button>`).join("")}</div>
    <div class="dex-grid">`;
  for (const f of FISH.filter((f) => f.loc === dexTab)) {
    const rec = S.dex[f.id], R = RARITY[f.rarity];
    const timeTag = f.night === true ? "🌙 malam" : f.night === false ? "☀️ siang" : "";
    h += `<div class="dex-cell ${rec ? "" : "unknown"}" style="border-top-color:${R.color}">
      ${f.emoji ? `<div class="emo">${f.emoji}</div>` : `<img src="${fishImg(f.id)}" alt="">`}
      <div class="nm">${rec ? f.name : "???"}</div>
      <div class="sub">${R.label}${timeTag ? " · " + timeTag : ""}</div>
      <div class="sub">${rec ? `×${rec.n} · rekor ${fmtW(rec.best)}` : "Belum tertangkap"}</div></div>`;
  }
  return h + `</div>`;
}

function mapHTML() {
  let h = `<p class="muted">Upgrade kapal di Toko untuk membuka pulau baru. Tiap lokasi punya ikan khas.</p>`;
  LOCATIONS.forEach((L, i) => {
    const locked = upLvl("boat") + 1 < L.boat, here = i === S.loc;
    const got = FISH.filter((f) => f.loc === L.id && S.dex[f.id]).length, tot = FISH.filter((f) => f.loc === L.id).length;
    h += `<div class="map-item ${here ? "here" : ""} ${locked ? "locked" : ""}">
      <div class="sw" style="background:linear-gradient(180deg,${L.sky[0]} 0 45%,${L.water[0]} 46%,${L.water[1]})"></div>
      <div class="grow"><b>${L.name}</b><div class="muted">${L.desc}</div><div class="muted">Koleksi ${got}/${tot}</div></div>
      ${here ? `<span class="muted">📍 Di sini</span>` : locked ? `<span class="muted">🔒 ${UPGRADES.boat.levels[L.boat - 1]}</span>` : `<button class="btn" data-act="go" data-arg="${i}">Berlayar</button>`}</div>`;
  });
  return h;
}
function travel(i) {
  closePanel();
  if (i === 0) { // pulang ke Muara Kampung (pulau yang bisa dijelajahi)
    if (MODE === "world") return;
    S.hour = (S.hour + 1.5) % 24; goWorld("boat");
    toast("⛵ Pulang ke Muara Kampung", "good"); return;
  }
  S.loc = i; S.hour = (S.hour + 1.5) % 24;
  enterFishing("boat");
  toast(`⛵ Tiba di ${LOCATIONS[i].name}`, "good");
}

// ---------- Pindah mode ----------
function applyMode() {
  document.body.classList.toggle("mode-world", MODE === "world");
  document.body.classList.toggle("mode-fish", MODE === "fish");
  const lb = $("landBtn");
  lb.innerHTML = S.loc === 0 ? "<span>🏝️</span>Ke Darat" : "<span>🗺️</span>Peta";
}
function resetFishing() {
  G.phase = "idle"; G.bob.vis = false; G.shadow = null; G.fight = null; G.holding = false;
  showMeter(false); $("fightUI").classList.add("hidden"); setNavLocked(false);
}
function enterFishing(from) {
  MODE = "fish"; fishFrom = from;
  if (from === "dock") S.loc = 0;
  resetFishing(); buildScenery(); applyMode(); refreshHUD(); updateHint(); save();
}
function goWorld(at) {
  MODE = "world"; S.loc = 0;
  resetFishing(); buildScenery(); applyMode(); refreshHUD();
  NW.world.onEnter(at); updateHint(); save();
}
function marketTip() {
  const hot = FISH.filter((f) => f.loc === "muara").map((f) => ({ f, m: priceMult(f.id) })).sort((a, b) => b.m - a.m)[0];
  return hot && hot.m > 1.1 ? `Hari ini ${hot.f.name} lagi mahal, naik ${Math.round((hot.m - 1) * 100)}%!` : "Harga hari ini biasa saja. Besok bisa beda, lho.";
}

// ---------- Mulai ----------
$("startBtn").addEventListener("click", () => {
  initAudio(); SFX.click();
  started = true; $("splash").classList.add("hidden"); updateHint();
  NW.world.onEnter("start"); // tampilkan judul lokasi
});

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (MODE === "world") {
    G.t += dt;
    if (started) NW.world.update(dt);
    NW.world.draw(ctx, G.t);
  } else {
    if (started) update(dt); else { G.t += dt; for (const c of clouds) c.x = (c.x + c.v * dt) % 1.2; }
    draw();
  }
  requestAnimationFrame(loop);
}

// API untuk modul dunia pulau (world/*.js)
window.Nusa = {
  get S() { return S; },
  mode: () => MODE, isStarted: () => started,
  isPanelOpen: () => !$("panelWrap").classList.contains("hidden") || !$("catchWrap").classList.contains("hidden") || !$("shareWrap").classList.contains("hidden"),
  openPanel, enterFishing, goWorld, tickTime, darkness, goldenHour, isNight, marketTip, setHint, save, toast,
  coolerFull: () => S.cooler.length >= coolerCap(),
  sfx: (n) => { initAudio(); if (SFX[n]) SFX[n](); },
  tone, on, emit, registerPanel, renderPanel: () => currentPanel && renderPanel(), currentPanel: () => currentPanel, closePanel,
  sleepUntilMorning, refreshHUD, drawFish, fishImg, priceOf, fmt, fmtW, FISH_BY_ID, coolerCap,
};

load();
S.loc = 0; // permainan selalu dimulai dari Muara Kampung
NW.life.hook(); NW.home.hook(); // Tahap 2A: misi harian & Rumahku
resize(); buildScenery(); initAmbient(); refreshHUD(); applyMode();
NW.world.resize(W, H, DPR); NW.world.onEnter("start"); updateHint();
document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
window.addEventListener("pagehide", save);
// akses debug ringan untuk pengujian
window.__nusa = { get S() { return S; }, G, save, refreshHUD, mode: () => MODE, goWorld, enterFishing };
requestAnimationFrame(loop);
})();
