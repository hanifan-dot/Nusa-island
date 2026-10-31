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
// Tahap 3: kunci lama TIDAK berubah. Hanya Mode Uji Owner (sandbox terpisah, diverifikasi server) memakai kunci sendiri.
const SAVE_KEY = NW.cloud && NW.cloud.sandbox ? "nusa-island-v1-owner-sandbox" : "nusa-island-v1";
const DEFAULT = () => ({
  money: 50, day: 1, hour: 6.5, loc: 0,
  up: { rod: 0, bait: 0, cooler: 0, boat: 0 },
  cooler: [], dex: {}, stats: { casts: 0, caught: 0, earned: 0, legends: 0 },
  muted: false,
  world: null, // posisi pemain di Muara Kampung (Island Life)
  // Tahap 2A
  home: null,                    // Rumahku (skema berversi, dibuat oleh migrasi)
  v: 3, seq: 0,                  // versi simpanan & penghitung uid
  missionLog: {},                // misi yang sudah diklaim per periode (anti klaim ganda)
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
// Versi simpanan: 1 = Tahap 1, 2 = Tahap 2A, 3 = rumah 10 level + ikan ber-uid.
// Sebelum migrasi, data lama disalin ke kunci cadangan sehingga tidak pernah hilang diam-diam.
const SAVE_VERSION = 11; // 11 = Bumbu 3.1 (Kedai Atuk Bahar: S.kedai — dompet Koin Kedai terpisah, rekor, batas harian, gelar); 10 = Bumbu 2.4 (kapal & laut: S.sea, cerita Selat Sunda di S.adv.selat); 9 = Bumbu 2.3 (cuaca: S.wx.seed); 4 = Bumbu 1 (cerita, keahlian, petunjuk, ingatan NPC); 5 = Bumbu 1.1 (gelar tangkapan, nama pemain lokal); 6 = Bumbu 1.2 (coolbox & joran 10 tingkat, kunci ikan); 7 = Bumbu 2 (petualangan: area terakhir, penemuan, cerita Toba, penghargaan)
let loadNote = "", isNewPlayer = true;
function backup(raw, tag) { try { const k = `${SAVE_KEY}-backup-${tag}`; if (!localStorage.getItem(k)) localStorage.setItem(k, raw); } catch (e) {} }
function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { loadNote = "Penyimpanan browser tidak tersedia, progres tidak bisa disimpan."; }
  if (raw) {
    isNewPlayer = false;
    let d = null;
    try { d = JSON.parse(raw); } catch (e) { backup(raw, "rusak-" + Date.now()); loadNote = "Data simpanan tidak terbaca. Salinannya diamankan sebagai cadangan."; }
    if (d && typeof d === "object") {
      const from = d.v || (d.home || d.missions ? 2 : 1);
      if (from < SAVE_VERSION) backup(raw, "v" + from);
      S = Object.assign(DEFAULT(), d);
      S.up = Object.assign(DEFAULT().up, d.up || {});
      S.stats = Object.assign(DEFAULT().stats, d.stats || {});
      S.home = d.home || null;
      S.friends = d.friends || {}; S.talked = d.talked || {}; S.missionLog = d.missionLog || {};
      if (!Array.isArray(S.cooler)) S.cooler = [];
    }
  }
  migrate();
  if (NW.cloud && NW.cloud.sandbox) NW.cloud.applySandbox(S, { UPGRADES, HD: NW.HD }); // Tahap 3: hanya Mode Uji Owner
}
function migrate() {
  const r = NW.HD.migrateHome(S);           // rumah lama → skema berversi (perabot tetap)
  const fixed = NW.HD.ensureFishUids(S);     // setiap ikan mendapat uid, duplikat dibersihkan
  // Bumbu 1.2: tingkat coolbox & joran kini 10. Nilai lama (0-4) tetap berlaku; kepemilikan tidak pernah diturunkan.
  for (const k of ["rod", "cooler"]) {
    const max = UPGRADES[k].levels.length - 1, v = Math.floor(Number(S.up[k]));
    S.up[k] = Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0;
  }
  for (const it of S.cooler) if (it && it.lock !== undefined && it.lock !== true) delete it.lock; // penanda kunci hanya boleh true
  // Bumbu 2: data petualangan (S.adv) — hanya mengisi yang belum ada, tidak pernah menimpa progres lama
  if (NW.adv) NW.adv.migrate(S);
  // Bumbu 2.2 (v8): varian ikan & koleksi varian (S.vd). Ikan lama tetap Normal — tidak ada varian acak saat migrasi.
  if (NW.variants) NW.variants.migrate(S);
  if (NW.secret) NW.secret.migrate(S);
  if (NW.weather) NW.weather.migrate(S); // Bumbu 2.3 (v9): benih cuaca tersimpan sekali; tidak ada koin/progres yang disentuh
  if (NW.kedai) NW.kedai.migrate(S);     // Bumbu 3.1 (v11): S.kedai — hanya merapikan/mengisi; tidak menambah koin atau gelar
  if (NW.streak) NW.streak.migrate(S);   // Login Streak 7 Hari: S.streak (umpan hadiah, kepemilikan eksklusif) — hanya mengisi yang kosong
  if (NW.boat) NW.boat.migrate(S);       // Bumbu 2.4 (v10): kapal (S.sea) — nilai aman bila belum ada; tidak pernah mulai di laut tanpa kapal
  if (r.from === "2A") loadNote = "Rumahku diperbarui ke sistem 10 level. Semua perabot tetap ada.";
  S.v = SAVE_VERSION;
  return { home: r, fixed };
}
function save() {
  if (NW.cloud && NW.cloud.saveFrozen) return; // Tahap 3: saat data cloud sedang dimuat, jangan menimpa dengan data lama
  try {
    S.v = SAVE_VERSION;
    if (NW.cloud && NW.cloud.sandbox && !(S.money >= NW.cloud.SIM_COINS / 4)) S.money = NW.cloud.SIM_COINS; // koin simulasi Owner terisi ulang (hanya sandbox)
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) {}
  if (NW.cloud && NW.cloud.onLocalSave) NW.cloud.onLocalSave(); // Tahap 3: jadwalkan sinkron cloud (bila login)
}

// ---------- Audio ----------
// Bumbu 2.1: satu AudioContext milik NW.audio (audio/manager.js). Fungsi lama (tone, noise, SFX) tetap ada
// dengan nama yang sama dan kini keluar lewat bus "Efek Suara". Bila modul audio baru tak tersedia,
// kode lama di bawah tetap berfungsi dengan context sendiri (cadangan).
let AC = null, noiseBuf = null;
function initAudio() {
  if (AC) { if (NW.audio) NW.audio.init(); return; }
  try {
    if (NW.audio && NW.audio.init()) { AC = NW.audio.ctx; noiseBuf = NW.kit.noiseBuf(AC); return; }
    if (NW.audio && NW.audio.failed) return;
    AC = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.6, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
const audioOut = () => (NW.audio && NW.audio.sfxBus) || AC.destination;
function tone(freq, dur, type = "sine", vol = 0.15, slideTo = null, delay = 0) {
  if (!AC || S.muted) return;
  if (NW.audio && NW.audio.ready && !NW.audio.running) return;
  const t0 = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audioOut()); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, freq = 800, vol = 0.2, q = 0.8) {
  if (!AC || S.muted) return;
  if (NW.audio && NW.audio.ready && !NW.audio.running) return;
  const t0 = AC.currentTime;
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(audioOut()); src.start(t0); src.stop(t0 + dur);
}
// Bumbu 2.2: efek baru hanya lewat NW.audio (mengikuti mute/volume). Tanpa modul audio, varian memakai jingle lama.
function N_sfx(n, a) { if (NW.audio && NW.audio.sfx(n, a)) return true; if (n.startsWith("varian_")) SFX.catch(a); else if (n === "mistis_tangkap") SFX.catch("legenda"); return false; }
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
// Bumbu 2.1: nama yang sama kini dimainkan oleh NW.audio (lebih halus & jelas). Versi lama jadi cadangan.
for (const k of Object.keys(SFX)) { const legacy = SFX[k]; SFX[k] = (...a) => { if (NW.audio && NW.audio.sfx(k, ...a)) return; legacy(...a); }; }

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
// Bumbu 2.4: tampilan lokasi saat memancing dari kapal (warna air & pantai spot laut); data lokasi tidak berubah
const viewL = () => (fishFrom === "sea" && G.sea && NW.sea ? NW.sea.viewLoc(LOCATIONS[S.loc], G.sea) : LOCATIONS[S.loc]);
function skyColors() {
  const L = viewL(), h = S.hour;
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
  const L = viewL(), r = seeded(hashStr(L.id));
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
  spotId: null, // Bumbu 2.2: id spot rahasia yang sedang dipakai (null = titik mancing biasa)
  sea: null,    // Bumbu 2.4: spot/perairan laut saat memancing dari kapal (null = darat)
  phase: "idle", t: 0, power: 0, powerDir: 1, perfect: false,
  bob: { x: 0, z: 2, sink: 0, vis: false },
  fly: null, target: { x: 0, z: 4 },
  biteTimer: 0, nibbles: [], biteWindow: 0, shadow: null,
  fight: null, reelBack: null, rodAngle: -0.95, rodBend: 0,
  ripples: [], drops: [], bubbles: [],
  pointerX: 0.5, holding: false, tickT: 0,
};
const upLvl = (k) => S.up[k];
const skill = (k) => !!(S.skills && S.skills[k]); // keahlian nelayan dari cerita Pak Darto
// riak ikan (Lemparan Presisi): titik di air tempat ikan berkumpul
function newHotspot() { G.hot = { x: rand(-0.75, 0.75), z: rand(3.2, 8.2) }; }
const hotPower = () => (G.hot ? (G.hot.z - 2) / 7 : 0);
const coolerCap = () => UPGRADES.cooler.cap[upLvl("cooler")];

// ---------- Pemilihan ikan ----------
function luckNow() { // pengali hoki dari umpan & lemparan (dipakai pemilihan ikan dan lemparan ikan mistis)
  let luck = UPGRADES.bait.luck[upLvl("bait")];
  if (G.perfect) luck *= 1.25;
  luck *= 1 + 0.35 * clamp((G.target.z - 2) / 7, 0, 1); // lempar jauh = lebih hoki
  if (G.hotHit) luck *= 1.1; // Lemparan Presisi: bonus kecil
  if (NW.streak) { if (G.streakBait) luck *= NW.streak.BAIT_LUCK; if (fishFrom === "sea") luck *= NW.streak.shipLuck(); } // hadiah Login Streak: Umpan Hadiah & Kapal Perintis
  return luck;
}
function chooseFish() {
  const L = LOCATIONS[S.loc], night = isNight();
  const pool = FISH.filter((f) => !f.seaOnly && (f.loc === L.id || f.loc === "*") && (f.night === undefined || f.night === night)); // seaOnly (Bumbu 2.4.1): hanya dari spot laut
  const luck = luckNow();
  const mult = { sampah: 1 / luck, biasa: 1, langka: Math.pow(luck, 0.75), epik: Math.pow(luck, 1.05), legenda: Math.pow(luck, 1.35) };
  // Bumbu 2.4: memancing dari kapal memakai kelompok ikan spot laut (pengali hoki SAMA; bobot ikan tidak diubah)
  const mystFish = fishFrom === "sea" && G.sea && G.sea.mystic && G.myst && G.myst.fish ? FISH_BY_ID[G.myst.fish] : null; // Bumbu 2.4.1: ikan mistis yang sudah dilempar saat umpan mendarat
  const seaFish = mystFish || (fishFrom === "sea" && G.sea && NW.sea ? NW.sea.pickFish(G.sea, mult, night) : null);
  if (seaFish) { const r = NW.FM.rollWeight(seaFish); return { fish: seaFish, w: r.w, wr: r.wr, extreme: r.extreme }; }
  const avail = RARITY_ORDER.filter((r) => pool.some((f) => f.rarity === r));
  let total = 0;
  const ws = avail.map((r) => { const w = RARITY[r].weight * mult[r]; total += w; return w; });
  let roll = Math.random() * total, rar = avail[0];
  for (let i = 0; i < avail.length; i++) { roll -= ws[i]; if (roll <= 0) { rar = avail[i]; break; } }
  const fish = pick(pool.filter((f) => f.rarity === rar));
  const { w, wr, extreme } = NW.FM.rollWeight(fish); // Bumbu 1.2: spesies tertentu punya ekor ukuran ekstrem yang sangat langka
  return { fish, w, wr, extreme };
}

// ---------- Harga harian ----------
function priceMult(id, day = S.day) { return 0.7 + seeded(hashStr(id + ":" + day))() * 0.75; }
const PRICE_SCALE = 3;
// Bumbu 1.2: berat di atas 100 kg dikompres (NW.FM.effectiveKg) agar ikan raksasa tidak merusak ekonomi
function priceOf(item) { return NW.FM.priceFor(FISH_BY_ID[item.id], item.w, priceMult(item.id), PRICE_SCALE); }

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
      if (skill("presisi")) { if (!G.hot) newHotspot(); $("powerTarget").style.bottom = (hotPower() * 100).toFixed(1) + "%"; }
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
  G.streakBait = NW.streak ? NW.streak.useBait() : false; // Umpan Hadiah (habis pakai) dipakai otomatis bila ada
  SFX.cast();
  if (G.perfect) { toast("Lemparan Sempurna! ✨ Lebih hoki", "good"); emit("perfect"); }
  updateHint();
}
function landBobber() {
  G.bob.x = G.target.x; G.bob.z = G.target.z;
  // Lemparan Presisi: kena riak → gigitan lebih cepat & sedikit lebih hoki (adil, kecil)
  G.hotHit = !!((skill("presisi") || G.spotId) && G.hot && Math.abs(G.target.z - G.hot.z) < 0.75 && Math.abs(G.target.x - G.hot.x) < 0.5);
  emit("cast", { perfect: G.perfect, hit: G.hotHit });
  addRipple(G.bob.x, G.bob.z, 3); splashAt(G.bob.x, G.bob.z, 10);
  SFX.splash();
  G.phase = "waiting";
  const sp = UPGRADES.bait.speed[upLvl("bait")] * (G.streakBait ? NW.streak.BAIT_SPEED : 1);
  G.wxBite = NW.weather ? NW.weather.biteFactor() : 1; // cuaca: ±ringan (0,88–1,08) pada waktu tunggu SAJA; tidak menyentuh pemilihan ikan, varian, atau pertarungan
  G.biteTimer = rand(2.2, 7) / sp * G.wxBite;
  G.nibbles = [];
  const n = (Math.random() * 3) | 0;
  for (let i = 0; i < n; i++) G.nibbles.push(rand(0.5, G.biteTimer - 0.4));
  G.shadow = { x: G.bob.x + rand(-0.6, 0.6), z: G.bob.z + rand(0.8, 1.6), a: 0 };
  if (G.hotHit) { G.biteTimer *= 0.6; G.nibbles = G.nibbles.filter((t) => t < G.biteTimer - 0.2); toast("🎯 Tepat di riak ikan!", "good"); }
  G.myst = fishFrom === "sea" && G.sea && G.sea.mystic && NW.mystic ? NW.mystic.rollCast(G.sea, luckNow()) : null; // Palung Mistis Selat: lempar ikan mistis per lemparan (petunjuk menyusul)
  if (G.myst) NW.mystic.setHintTime(G.myst, G.biteTimer);
  G.hot = null;
  updateHint();
}
function triggerBite() {
  const locId = LOCATIONS[S.loc].id;
  G.pending = (NW.story && NW.story.challengeFish(G.perfect, locId)) || (NW.adv && NW.adv.challengeFish(G.perfect, locId)) || chooseFish();
  G.phase = "bite"; G.biteWindow = 0.95 + upLvl("bait") * 0.05;
  G.bob.sink = 1; addRipple(G.bob.x, G.bob.z, 2); splashAt(G.bob.x, G.bob.z, 6);
  SFX.bite();
  if (navigator.vibrate) try { navigator.vibrate(60); } catch (_) {}
  updateHint();
}
function startFight() {
  const { fish, w, wr } = G.pending;
  const pe = NW.FM.fightPower(fish, w, wr);                     // ikan ≤ 20 kg: sama persis seperti dulu
  const rodCap = UPGRADES.rod.cap[upLvl("rod")] * (NW.streak ? NW.streak.rodMul().cap : 1), om = NW.FM.overloadMuls(w, rodCap);
  G.fight = { fish, w, pe, big: NW.FM.bigness(w), weak: om.weak, riseMul: om.rise, reelMul: om.reel, T: 0.25, P: 0.18, surge: 0, surgeT: rand(0.8, 2), slack: 0, over: 0, fx: G.bob.x, fxT: G.bob.x, z0: G.bob.z,
    challenge: !!G.pending.challenge, quest: G.pending.quest || null, perfect: !!G.perfect, reads: 0, tired: 0, readWin: 0, readDone: true, tiredT: 0, tiredHold: 0, tiredDone: true, warn: false };
  $("tensionBar").classList.toggle("ideal", skill("kendali"));
  G.phase = "fight";
  if (fish.tough) { G.fight.surgeT *= 0.75; G.fight.tough = true; } // Pari Bayang Samudra: sentakan lebih sering & lebih lama (joran/tegangan tali tetap sama)
  $("fightName").textContent = fish.mistik ? (fish.tough ? "🌌 Sesuatu yang besar dan sunyi menarik dari kedalaman!" : "🌌 Cahaya aneh menarik senarmu!") : G.pending.challenge ? "🏆 Ikan uji Pak Darto!" : G.pending.quest ? G.pending.questName || "🏆 Ikan tantangan!" : G.fight.weak ? "⚠️ Joran kurang kuat untuk ikan ini!" : fish.rarity === "legenda" ? "⚠️ Sesuatu yang BESAR…" : fish.rarity === "epik" ? "Tarikannya kuat!" : "Strike! 🎣";
  if (G.fight.weak) toast(`⚠️ Joran kurang kuat! Ikan ±${fmtW(w)}, batas joran ${UPGRADES.rod.cap[upLvl("rod")]} kg. Senar bisa putus.`, "bad");
  $("fightUI").classList.remove("hidden");
  setNavLocked(true);
  splashAt(G.bob.x, G.bob.z, 14); SFX.splash();
  updateHint();
}
function endFight(result) {
  const F = G.fight;
  emit("fight", { result, reads: F.reads, tired: F.tired, challenge: F.challenge, quest: F.quest, perfect: F.perfect, fish: F.fish, w: F.w });
  $("tensionBar").classList.remove("warn", "tired");
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
  if (G.phase === "result") return; // satu tangkapan = satu hasil (tidak ada roll varian / jingle ganda)
  G.phase = "result"; G.bob.vis = false; G.shadow = null;
  const rec = S.dex[fish.id] || { n: 0, best: 0 };
  const isNew = rec.n === 0, isRecord = !isNew && w > rec.best;
  rec.n++; rec.best = Math.max(rec.best, w); S.dex[fish.id] = rec;
  S.stats.caught++;
  if (fish.rarity === "legenda") S.stats.legends++;
  let reward = 0;
  if (fish.protected) { reward = Math.round(fish.price * PRICE_SCALE * NW.FM.effectiveKg(w) * 1.2); S.stats.earned += reward; if (!(NW.eco && NW.eco.release(fish, w))) S.money += reward; }   // ekonomi server: hadiah dihitung & dibayar server
  // Bumbu 2.2: varian kosmetik dipilih SEKALI di sini (tidak pernah di-roll ulang), hanya untuk ikan yang benar-benar disimpan
  const vr = NW.variants && !fish.protected ? NW.variants.roll(fish, { spot: G.spotId, hit: G.hotHit }) : "normal";
  let item = null;
  if (fish.protected) { /* dilepas: tidak ada item, tidak ada varian */ }
  else {
    item = { uid: NW.HD.newUid(S, "i"), id: fish.id, w, t: Date.now() }; // setiap ikan punya identitas unik
    if (vr !== "normal") { item.vr = vr; if (vr === "pearl") item.lock = true; } // Mutiara Nusantara otomatis terkunci
    if (fish.mistik) item.lock = true; // ikan mistis otomatis terkunci (tidak ikut "jual semua" tanpa sengaja; bisa dibuka kuncinya di Inventaris)
    S.cooler.push(item);
    if (NW.eco) NW.eco.onCatch(item);   // lapor ke server (kotak ikan server) bila ekonomi server aktif
    if (NW.variants) NW.variants.record(S, fish, vr, w, LOCATIONS[S.loc].id);
  }
  emit("catch", { fish, w, night: isNight(), loc: LOCATIONS[S.loc].id, vr, spot: G.spotId || null, sea: fishFrom === "sea" && G.sea ? G.sea.id : null });
  if (fish.mistik && NW.mystic) NW.mystic.onCaught(fish); // catatan Buku Petualangan (sekali) + reset perlindungan sial
  save(); refreshHUD();
  const giant = !!(NW.variants && !fish.protected && NW.variants.isGiant(fish, w));
  // tepat SATU jingle per tangkapan: varian istimewa memakai jingle sendiri, selain itu jingle rarity
  if (fish.mistik) N_sfx("mistis_tangkap"); else if (vr !== "normal") N_sfx("varian_" + vr, fish.rarity); else SFX.catch(fish.rarity);
  if (giant) setTimeout(() => N_sfx("splash_besar", Math.min(1, NW.FM.bigness(w))), 120);
  showCatchCard(fish, w, { isNew, isRecord, reward, vr, giant, uid: item && item.uid, locked: !!(item && item.lock) });
}

// ---------- Update ----------
let last = performance.now(), started = false, saveT = 0;
// waktu berjalan (dipakai mode mancing & mode pulau)
function tickTime(dt) {
  const prevNight = isNight();
  S.hour += dt * HOURS_PER_SEC;
  if (S.hour >= 24) { S.hour -= 24; newDay(); }
  if (prevNight !== isNight() && started) clockNote(isNight() ? "🌙 Malam, ikan malam keluar" : "☀️ Pagi tiba");
  refreshClock();
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
}
// catatan waktu kecil di bawah jam (tidak menutupi karakter)
let noteT = 0;
function clockNote(msg) { const n = $("timeNote"); if (!n) return; n.textContent = msg; n.classList.add("show"); clearTimeout(noteT); noteT = setTimeout(() => n.classList.remove("show"), 3500); }
function newDay() {
  S.day++; S.talked = {};
  clockNote(`📈 Hari ${S.day}: harga pasar berubah`);
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
  if ((skill("presisi") || G.spotId) && (G.phase === "idle" || G.phase === "charging") && !G.hot) newHotspot();
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
      if (G.myst && G.myst.fish && !G.myst.shown && G.biteTimer <= G.myst.hintAt) NW.mystic.hint(G); // petunjuk: kilau + pesan + suara pendek (jenis ikan tidak disebut)
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
  const lv = upLvl("rod"), rm = NW.streak ? NW.streak.rodMul() : { str: 1, reel: 1 }, str = UPGRADES.rod.strength[lv] * rm.str, reel = UPGRADES.rod.reel[lv] * rm.reel * F.reelMul; // reelMul < 1 hanya bila ikan jauh melebihi kapasitas joran
  const big = F.big; // 0 untuk ikan ≤ 20 kg → faktor ukuran di bawah sama dengan perilaku lama
  F.age = (F.age || 0) + dt;
  const pe = F.pe * NW.FM.fatigue(F.age); // ikan lelah seiring waktu: pertarungan raksasa tidak berlarut-larut
  // ikan menyentak
  F.surgeT -= dt;
  const wasSurging = F.surge > 0;
  F.warn = skill("membaca") && F.surge <= 0 && F.surgeT < 0.65; // aba-aba sebelum menyentak
  if (F.surge > 0) {
    F.surge -= dt;
    if (F.surge <= 0 && wasSurging && skill("kendali")) { F.tiredT = 1.2; F.tiredHold = 0; F.tiredDone = false; F.surgeT = Math.max(F.surgeT, 1.9); } // beri ruang: "lelah" tidak bertabrakan dengan aba-aba berikutnya
  }
  else if (F.surgeT <= 0) {
    if (skill("membaca")) { F.readWin = 0.35; F.readDone = false; } // lepas dalam 0,35 dtk = bacaan tepat
    F.surge = (rand(0.45, 0.9 + pe * 0.08) + NW.FM.TUNE.surgeLen * big) * (F.tough ? 1.2 : 1);               // ikan besar menyentak lebih lama (ikan tangguh: +20%)
    F.surgeT = Math.max(0.7, rand(1.3, 3.2) * (1 - NW.FM.TUNE.surgeFreq * big) - pe * 0.1); // dan lebih sering
    if (F.tough) F.surgeT = Math.max(0.6, F.surgeT * 0.8);
    if (F.challenge) F.surgeT = Math.min(F.surgeT, 2.1); // ujian: sentakan teratur supaya bisa dibaca
    F.fxT = clamp(F.fx + rand(-0.9, 0.9) * (1 + 0.5 * big), -1.4, 1.4); // arah tarikan berubah lebih lebar
    splashAt(G.bob.x, G.bob.z, 8 + pe); SFX.surge();
  }
  const surging = F.surge > 0;
  if (!F.readDone) { if (!G.holding) { F.readDone = true; F.reads++; emit("read"); } else if ((F.readWin -= dt) <= 0) F.readDone = true; }
  const tired = F.tiredT > 0 && !surging;
  if (F.tiredT > 0) F.tiredT -= dt;
  if (tired && G.holding && !F.tiredDone) { F.tiredHold += dt; if (F.tiredHold >= 0.3) { F.tiredDone = true; F.tired++; emit("tired"); } }
  if (G.holding) {
    // Kendali Senar: gulungan lebih cepat & senar lebih awet HANYA saat ikan lelah / di zona ideal
    const kb = tired ? 1.4 : 1, zb = skill("kendali") && F.T > 0.45 && F.T < 0.8 ? 1.08 : 1;
    const rate = 0.17 * reel / (0.55 + pe * 0.12) * kb * zb;
    // ikan besar: menggulung saat ikan menyentak malah menyeret kembali (harus baca aba-aba, bukan sekadar menahan layar)
    F.P += rate * dt * (surging ? 0.25 - NW.FM.TUNE.surgeProg * big : 1);
    F.T += (0.28 + pe * 0.055) * (surging ? 2.3 + NW.FM.TUNE.surgeRise * big : 1) * dt / str * (tired ? 0.75 : 1) * F.riseMul;
    G.tickT -= dt; if (G.tickT <= 0) { G.tickT = 0.07; SFX.tick(); }
  } else {
    F.T -= 0.65 * dt;
    F.P -= (0.02 + (surging ? 0.05 + pe * 0.012 : 0)) * dt;
  }
  // ikan uji Pak Darto tidak menyerah sebelum pemain menunjukkan keahlian (keberhasilan = tindakan, bukan untung)
  if (F.challenge && (F.reads < 2 || F.tired < 2)) F.P = Math.min(F.P, 0.9);
  F.T = clamp(F.T, 0, 1.15);
  if (F.T >= 1) { F.over += dt; if (F.over > 0.3) return endFight("snap"); } else F.over = Math.max(0, F.over - dt * 2);
  // Membaca Tarikan: melepas saat ikan menyentak itu benar (ikan yang menarik senar), jadi tidak dihitung kendur.
  // Tanpa keahlian ini aturannya sama persis seperti sebelumnya.
  const slackOk = skill("membaca") && surging;
  if (F.T < 0.06 && !G.holding && !slackOk) { F.slack += dt; if (F.slack > 2.2) return endFight("slack"); } else F.slack = Math.max(0, F.slack - dt * 2);
  if (F.P <= 0) return endFight("lost");
  if (F.P >= 1) return endFight("caught");

  F.fx = lerp(F.fx, F.fxT * (1 - F.P * 0.7), dt * (surging ? 2.5 : 0.8));
  G.bob.x = F.fx; G.bob.z = lerp(F.z0, 1.35, F.P);
  if (Math.random() < dt * (surging ? 14 : 4)) addRipple(G.bob.x, G.bob.z, 0.6);

  $("tensionFill").style.width = (Math.min(F.T, 1) * 100).toFixed(1) + "%";
  $("progressFill").style.width = (F.P * 100).toFixed(1) + "%";
  $("tensionBar").classList.toggle("shake", F.T > 0.82);
  $("tensionBar").classList.toggle("warn", F.warn); $("tensionBar").classList.toggle("tired", tired);
  const tip = $("fightTip");
  tip.textContent = F.T > 0.82 ? "⚠️ Senar hampir putus, LEPAS!" : F.warn ? "⚡ Ikan bersiap menyentak — lepas!" : tired ? "😮‍💨 Ikan lelah — gulung!" : F.slack > 0.8 ? "Senar kendur, tahan lagi!" : surging ? "Ikan menyentak! Hati-hati" : F.weak ? "⚠️ Joran kurang kuat — gulung pelan, lepas sering" : "Tahan = gulung · Lepas = kendurkan";
  tip.classList.toggle("cue-warn", F.warn); tip.classList.toggle("cue-tired", tired);
  if (F.challenge) $("fightName").textContent = `🏆 Ujian · baca ${Math.min(2, F.reads)}/2 · gulung ${Math.min(2, F.tired)}/2`;
}

// ---------- Efek ----------
function addRipple(x, z, size = 1) { G.ripples.push({ x, z, r: 4, sp: 30 * size, life: 1.2, max: 1.2, size }); }
function splashAt(x, z, n) {
  const sx = projX(x, z), sy = projY(z), s = projS(z) * 3;
  for (let i = 0; i < n; i++) G.drops.push({ x: sx, y: sy, vx: rand(-80, 80) * s * U, vy: rand(-260, -120) * s * U, life: rand(0.35, 0.7), r: rand(1, 2.5) * Math.max(0.6, s) });
}

// ---------- Gambar ----------
function draw() {
  const L = viewL(), dk = darkness();
  const wxa = NW.weather ? NW.weather.areaId() : "muara";
  let [skyTop, skyBot] = skyColors();
  if (NW.weather) [skyTop, skyBot] = NW.weather.skyMix(skyTop, skyBot, mix, wxa); // langit bergeser ke warna mendung secara halus

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
  const celR = 22 * U, wxs = NW.weather ? NW.weather.state : null, sunA = wxs ? 1 - 0.85 * wxs.cloud : 1;
  ctx.save(); ctx.globalAlpha = sunA;
  ctx.shadowColor = isMoon ? "rgba(220,230,255,.8)" : "rgba(255,220,140,.9)"; ctx.shadowBlur = 40 * U;
  ctx.fillStyle = isMoon ? "#eef2ff" : (h < 8 || h > 17 ? "#ffcf86" : "#fff3c4");
  ctx.beginPath(); ctx.arc(celX, celY, celR, 0, 7); ctx.fill();
  ctx.restore();

  // awan (makin kelabu saat mendung/hujan)
  const cg = wxs ? Math.round(255 - 105 * Math.min(1, wxs.cloud * 0.8 + wxs.rain * 0.3)) : 255;
  ctx.fillStyle = dk > 0.5 ? "rgba(120,140,170,.25)" : `rgba(${cg},${cg},${Math.min(255, cg + 8)},.75)`;
  for (const c of clouds) {
    const cx = c.x * W, cy = c.y * HZ * 0.7, s = c.s * 40 * U;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 1.6, s * 0.45, 0, 0, 7); ctx.ellipse(cx - s * 0.7, cy + 3, s * 0.8, s * 0.35, 0, 0, 7); ctx.ellipse(cx + s * 0.6, cy - s * 0.15, s * 0.9, s * 0.45, 0, 0, 7);
    ctx.fill();
  }

  if (NW.weather) NW.weather.fishClouds(ctx, W, HZ, G.t, U, dk); // lapisan awan tambahan saat mendung/hujan
  drawShore(L, dk);

  // air
  let wTop = mix(mix(L.water[0], L.fog, 0.35), "#0a1830", dk * 0.8);
  let wBot = mix(L.water[1], "#050d1c", dk * 0.75);
  if (wxs) { const ck = Math.min(1, wxs.cloud * 0.5 + wxs.rain * 0.25), ow = NW.weather.CFG[wxa] ? NW.weather.CFG[wxa].water : "#5f8e97"; wTop = mix(wTop, ow, ck * 0.7); wBot = mix(wBot, ow, ck * 0.45); }
  g = ctx.createLinearGradient(0, HZ, 0, H);
  g.addColorStop(0, wTop); g.addColorStop(1, wBot);
  ctx.fillStyle = g; ctx.fillRect(0, HZ, W, H - HZ);

  // pantulan matahari/bulan
  if (celY < HZ && sunA > 0.05) {
    ctx.globalAlpha = sunA;
    const refl = ctx.createLinearGradient(0, HZ, 0, H);
    const col = isMoon ? "220,230,255" : "255,226,160";
    refl.addColorStop(0, `rgba(${col},.45)`); refl.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = refl;
    for (let i = 0; i < 26; i++) {
      const z = 1 + i * 0.6, y = projY(z) , ww = (40 + Math.sin(G.t * 3 + i) * 14) * U * (1 - i / 30);
      if (y < HZ + 1) break;
      ctx.fillRect(celX - ww / 2 + Math.sin(G.t * 2 + i * 1.7) * 8, y - (2 / z) * 3, ww, Math.max(1, 6 / z));
    }
    ctx.globalAlpha = 1;
  }

  // ombak
  const waveCol = dk > 0.5 ? "rgba(160,190,230," : "rgba(255,255,255,", wk = NW.weather ? NW.weather.waterK() : 1; // angin & hujan: permukaan air lebih aktif
  ctx.lineCap = "round";
  for (const w of waves) {
    const y = projY(w.z), x = projX(w.x + Math.sin(G.t * (0.8 * (0.8 + 0.2 * wk)) + w.p) * 0.05 * wk, w.z), s = projS(w.z);
    const len = 36 * s * w.l * U * (W / 800) * (0.9 + 0.1 * wk);
    ctx.strokeStyle = waveCol + Math.min(0.7, (0.12 + 0.35 * s) * (0.85 + 0.15 * wk)).toFixed(3) + ")";
    ctx.lineWidth = Math.max(0.6, 3 * s * U);
    ctx.beginPath(); ctx.moveTo(x - len, y); ctx.quadraticCurveTo(x, y - 4 * s * U, x + len, y); ctx.stroke();
  }
  // kabut cakrawala
  g = ctx.createLinearGradient(0, HZ - 4, 0, HZ + 30 * U);
  g.addColorStop(0, rgba(mix(L.fog, "#0a1830", dk), 0.55)); g.addColorStop(1, rgba(mix(L.fog, "#0a1830", dk), 0));
  ctx.fillStyle = g; ctx.fillRect(0, HZ - 4, W, 34 * U);
  if (NW.weather) NW.weather.fishFog(ctx, W, H, HZ, wxa, dk); // kabut cuaca: tebal di jauh, tipis di dekat pelampung

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

  // riak ikan (Lemparan Presisi)
  if (G.hot && (skill("presisi") || G.spotId) && (G.phase === "idle" || G.phase === "charging")) { // di spot rahasia riak terlihat oleh semua pemain
    const hx = projX(G.hot.x, G.hot.z), hy = projY(G.hot.z), s = projS(G.hot.z) * 2.2 * U;
    for (let i = 0; i < 3; i++) {
      const k = (G.t * 0.6 + i / 3) % 1;
      ctx.strokeStyle = `rgba(255,240,176,${(0.75 * (1 - k)).toFixed(3)})`; ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath(); ctx.ellipse(hx, hy, (6 + k * 26) * s, (6 + k * 26) * s * 0.32, 0, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (let i = 0; i < 6; i++) { const a = G.t * 2 + i * 1.7, r = (4 + (i % 3) * 5) * s; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.3 - Math.abs(Math.sin(G.t * 3 + i)) * 4 * s, Math.max(1, 1.6 * s), 0, 7); ctx.fill(); }
  }
  // aba-aba tarikan (Membaca Tarikan / Kendali Senar)
  if (G.fight && (G.fight.warn || G.fight.tiredT > 0)) {
    const F = G.fight, bx = projX(G.bob.x, G.bob.z), by = projY(G.bob.z), s = projS(G.bob.z) * 2.2 * U;
    const col = F.warn ? "255,214,90" : "120,220,150", k = (G.t * 2.5) % 1;
    ctx.strokeStyle = `rgba(${col},${(0.9 * (1 - k)).toFixed(3)})`; ctx.lineWidth = Math.max(1.5, 3 * s);
    ctx.beginPath(); ctx.ellipse(bx, by, (10 + k * 40) * s, (10 + k * 40) * s * 0.32, 0, 0, 7); ctx.stroke();
    if (F.warn) { ctx.font = `900 ${Math.round(22 * U)}px Georgia, serif`; ctx.textAlign = "center"; ctx.fillStyle = "#ffd65a"; ctx.strokeStyle = "#173f50"; ctx.lineWidth = 4; ctx.strokeText("!", bx, by - 26 * U); ctx.fillText("!", bx, by - 26 * U); }
  }

  if (G.spotId && NW.secret && fishFrom === "dock") NW.secret.drawTint(ctx, { W, H, HZ }, G.spotId); // suasana air spot rahasia
  if (fishFrom === "sea" && G.sea && NW.mystic) NW.mystic.drawFishScene(ctx, G, { W, H, HZ, U, dk, projX, projY, projS }); // suasana Palung Mistis Selat + kilau petunjuk
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

  if (NW.weather) NW.weather.fishRain(ctx, W, H, HZ, G.t, U, wxa); // hujan tipis + riak (di belakang UI)
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
const seaRock = () => (fishFrom === "sea" ? Math.sin(G.t * 1.25) * 3 * U + Math.sin(G.t * 0.55) * 1.5 * U : 0); // kapal bergoyang pelan di laut
function handPos() { return { x: W / 2 + 34 * U, y: BY - 120 * U + seaRock() }; }
function rodTip() {
  const hp = handPos(), len = 230 * U, a = G.rodAngle;
  return { x: hp.x + Math.cos(a) * len * 0.75, y: hp.y + Math.sin(a) * len + G.rodBend * 40 * U };
}

function drawBoat(dk) {
  const rk = seaRock(), cx = W / 2, by = H + 6 * U + rk, B = BY + rk;
  const L = LOCATIONS[S.loc], boatLv = upLvl("boat");
  const hull = ["#7a5230", "#2f7a8c", "#c9553b", "#e9e4d8", "#1f3f5a"][boatLv];
  const trim = ["#5a3b22", "#f0d58a", "#f3e7c9", "#d14a3a", "#e0b84c"][boatLv];
  const night = (c) => mix(c, "#0a1426", dk * 0.6);
  if (fishFrom === "dock" && G.spotId && NW.secret) NW.secret.drawFore(ctx, { cx, by, B, U, W, H, t: G.t, night }, G.spotId); // spot rahasia: tepi alami, bukan dermaga
  else if (fishFrom === "dock" && NW.areas.forLoc(S.loc)) drawDockFore(cx, by, B, night); // mancing dari dermaga area yang bisa dijelajahi
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
  const cl = upLvl("cooler"), cw = (26 + Math.min(cl, 9) * 1.6) * U; // makin besar penyimpanannya, makin lebar kotaknya
  ctx.fillStyle = night(["#7f8a8f", "#3f8fd0", "#3f8fd0", "#e9e4d8", "#e9e4d8", "#c9a96a", "#8fb3c9", "#b7c3cc", "#e8eef2", "#e0b84c"][cl] || "#e9e4d8");
  ctx.fillRect(kx - cw, ky - 22 * U, cw * 2, 36 * U);
  ctx.fillStyle = night("#ffffff"); ctx.fillRect(kx - cw - 2 * U, ky - 26 * U, cw * 2 + 4 * U, 8 * U);
  if (fill > 0) { ctx.fillStyle = night("#c9d8de"); ctx.fillRect(kx - cw + 4 * U, ky - 18 * U + (1 - fill) * 28 * U, cw * 2 - 8 * U, fill * 28 * U); }

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
  // bentuk, warna, gagang, reel, dan ornamen mengikuti joran aktif (NW.look.RODS, 10 tingkat)
  const mx = (hp.x + tip.x) / 2 + G.rodBend * 30 * U, my = (hp.y + tip.y) / 2 - 10 * U + G.rodBend * 10 * U;
  NW.look.drawHeldRod(ctx, NW.look.rodSpec(), hp, { x: mx, y: my }, tip, { x: hp.x - Math.cos(G.rodAngle) * 30 * U, y: hp.y - Math.sin(G.rodAngle) * 30 * U }, U, night);
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
  const bk = NW.weather ? NW.weather.bobK() : 1; // pelampung bergoyang lebih besar saat berangin/hujan (visual; tidak memengaruhi gigitan atau pertarungan)
  const bobY = b.y + Math.sin(G.t * 2.2) * 1.5 * b.s * U * bk + G.bob.sink * 10 * b.s * U;
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
function drawFish(c, f, x, y, L, vr) {
  if (f.emoji) {
    c.font = `${Math.round(L * 0.55)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(f.emoji, x, y); return;
  }
  if (f.mistik && NW.mystic) { NW.mystic.drawFish(c, f, x, y, L); return; } // Bumbu 2.4.1: ikan mistis punya gambar sendiri (transparan berpendar / pari bersirip bercahaya)
  const [sl, sh] = f.shape;
  const bl = L * 0.74, bh = bl * (sh / sl) * 1.15;
  const hx = x + bl / 2 + L * 0.08, tx = hx - bl;
  const VV = vr && vr !== "normal" && NW.variants ? NW.variants.look(f, vr) : null; // Bumbu 2.2: varian kosmetik
  const col = VV ? VV.col : f.color, dark = shade(f.color, -0.3), finCol = VV ? VV.fin : f.finColor || shade(col, -0.15);
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
  g.addColorStop(0, shade(col, -0.12)); g.addColorStop(0.45, col); g.addColorStop(1, VV ? VV.belly : f.belly || shade(col, 0.5));
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
  if (VV) NW.variants.paint(c, vr, { x, y, tx, hx, bl, bh, L }, f);
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
  if (VV) NW.variants.halo(c, vr, { x, y, bl, bh, L });
}
const fishImgCache = {};
function fishImg(id, vr) {
  const key = vr && vr !== "normal" ? id + "|" + vr : id;
  if (fishImgCache[key]) return fishImgCache[key];
  const c = document.createElement("canvas"); c.width = 200; c.height = 110;
  drawFish(c.getContext("2d"), FISH_BY_ID[id], 105, 55, 160, vr);
  return (fishImgCache[key] = c.toDataURL());
}

// ---------- UI ----------
let toastT = null;
function toast(msg, kind = "") {
  const t = $("toast"); t.textContent = msg; t.className = "toast show " + kind;
  clearTimeout(toastT); toastT = setTimeout(() => (t.className = "toast " + kind), 2200);
}
function flashCooler() { const c = $("coolerChip"); c.classList.add("full"); setTimeout(refreshHUD, 1500); }
function showMeter(on) { $("powerMeter").classList.toggle("hidden", !on); $("powerMeter").classList.toggle("presisi", on && skill("presisi")); if (!on) $("powerFill").style.height = "0%"; }
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
  $("money").textContent = fmt(balance());
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
  const wk = NW.weather ? NW.weather.state.kind : "cerah";
  $("clockIcon").textContent = wk === "hujan" ? "🌧️" : wk === "kabut" ? "🌫️" : wk === "mendung" ? (isNight() ? "☁️" : "⛅") : isNight() ? "🌙" : (S.hour < 7.5 || S.hour > 17 ? "🌅" : "☀️");
}

// Kartu tangkapan
let lastCatch = null;
function showCatchCard(fish, w, info) {
  lastCatch = { fish, w, info };
  const R = RARITY[fish.rarity], card = $("catchCard");
  card.style.setProperty("--rc", fish.mistik ? "#3fc7b6" : R.color); card.style.setProperty("--glow", fish.mistik ? "rgba(95,230,210,.7)" : R.glow);
  $("catchRarity").textContent = fish.mistik ? "✨ Mistis" : R.label;
  $("catchName").textContent = fish.name;
  $("catchWeight").textContent = fmtW(w);
  $("catchDesc").textContent = fish.desc;
  const art = $("catchArt"), c = art.getContext("2d");
  c.clearRect(0, 0, art.width, art.height);
  const g = c.createRadialGradient(160, 90, 10, 160, 90, 160);
  g.addColorStop(0, rgba(R.color, 0.35)); g.addColorStop(1, rgba(R.color, 0));
  c.fillStyle = g; c.fillRect(0, 0, 320, 180);
  drawFish(c, fish, 160, 92, 230, info.vr);
  if (info.giant) { c.fillStyle = "rgba(220,244,255,.8)"; const rr = seeded(hashStr(fish.id + w)); for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(40 + rr() * 240, 150 + rr() * 22 - rr() * rr() * 90, 1.5 + rr() * 3, 0, 7); c.fill(); } } // cipratan (statis, sedikit titik)
  // Bumbu 2.2: momen tangkapan istimewa (CSS singkat; bisa dilewati)
  const vi = info.vr && info.vr !== "normal" && NW.variants ? NW.variants.info(info.vr) : null;
  const myst = !!fish.mistik, mfx = myst && NW.mystic ? NW.mystic.fxMode() : "";
  card.className = "catch-card" + (vi ? " cv-" + info.vr : "") + (info.giant ? " cv-giant" : "") + (myst ? " cv-mistik cv-" + fish.id + (mfx === "calm" || mfx === "rendah" ? " mfx-low" : "") : "");
  card.querySelectorAll(".mist-spark").forEach((e) => e.remove());
  if (myst && mfx !== "calm") { const n = mfx === "rendah" ? 4 : mfx === "sedang" ? 9 : 14; for (let i = 0; i < n; i++) { const s = document.createElement("i"); s.className = "mist-spark"; s.style.cssText = `left:${(8 + ((i * 53) % 84)).toFixed(0)}%;animation-delay:${((i * 0.19) % 1.6).toFixed(2)}s;--dx:${(((i * 37) % 40) - 20).toFixed(0)}px`; card.appendChild(s); } }
  $("catchVar").innerHTML = myst ? `<span>🌌</span><b>Ikan Mistis!</b><small>${fish.id === "pari_bayang" ? "Bayangan dari samudra memilihmu" : "Cahaya dari kedalaman menyapamu"}</small>` : vi ? `<b>${vi.icon} ${vi.name}</b>${info.vr === "pearl" ? "<small>Varian paling istimewa</small>" : ""}` : info.giant ? `<b>🌊 Ikan Raksasa!</b><small>${fmtW(w)} · ${fish.name}</small>` : "";
  $("catchVar").classList.toggle("hidden", !vi && !info.giant && !myst);
  const special = !!(vi && info.vr === "pearl") || !!info.giant || myst;
  $("catchSkip").classList.toggle("hidden", !special);
  card.classList.toggle("playing", !!(vi || info.giant || myst));
  clearTimeout(momentT); if (vi || info.giant || myst) momentT = setTimeout(endMoment, myst ? (mfx === "calm" || mfx === "rendah" ? 1800 : 3000) : info.vr === "pearl" ? 2600 : info.giant ? 2000 : 1500);
  $("catchHold").classList.toggle("hidden", !(info.giant && info.uid && NW.hold) || fishFrom === "sea"); // di atas kapal: pamerkan setelah turun
  const badges = [];
  if (info.isNew) badges.push("✨ Baru di koleksi");
  if (info.locked) badges.push("🔒 Otomatis terkunci");
  if (info.isRecord) badges.push("🏆 Rekor baru!");
  if (fish.night) badges.push("🌙 Ikan malam");
  if (fish.mistik) badges.push("🌌 Penghuni Palung Mistis Selat");
  if (info.reward) badges.push(`🐢 Dilepas · hadiah konservasi +${fmt(info.reward)}`);
  else if (!fish.emoji) badges.push(`≈ 🪙 ${fmt(priceOf({ id: fish.id, w }))} hari ini`);
  $("catchBadges").innerHTML = badges.map((b) => `<span>${b}</span>`).join("");
  $("catchWrap").classList.remove("hidden");
  setNavLocked(true);
}
let momentT = null;
function endMoment() { clearTimeout(momentT); const cc = $("catchCard"); if (cc) cc.classList.remove("playing"); $("catchSkip").classList.add("hidden"); }
$("catchSkip").addEventListener("click", () => { SFX.click(); endMoment(); });
$("catchHold").addEventListener("click", () => { // pamerkan ikan raksasa di tangan: ke darat dulu (aturan pamer ikan yang sudah ada)
  const uid = lastCatch && lastCatch.info && lastCatch.info.uid; if (!uid || !NW.hold) return;
  SFX.click(); endMoment(); $("catchWrap").classList.add("hidden"); setNavLocked(false); G.phase = "idle"; updateHint();
  NW.hold.start(uid);
});
$("catchOk").addEventListener("click", () => {
  endMoment(); SFX.click(); $("catchWrap").classList.add("hidden"); setNavLocked(false);
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
$("muteBtn").addEventListener("click", () => {
  S.muted = !S.muted; save(); refreshHUD(); initAudio(); if (NW.audio) NW.audio.setMuted(S.muted);
  toast(S.muted ? "🔇 Semua suara dimatikan · tahan 🔊 untuk pengaturan" : "🔊 Suara hidup · tahan 🔊 untuk pengaturan");
});
$("dexBtn").addEventListener("click", () => { SFX.click(); openPanel("dex"); });
$("misiBtn").addEventListener("click", () => { SFX.click(); openPanel("missions"); });
$("landBtn").addEventListener("click", () => {
  if (["fight", "bite", "charging", "result"].includes(G.phase)) return;
  SFX.click();
  // Bumbu 2.4: memancing dari kapal → kembali ke kapal di tempat yang sama
  if (fishFrom === "sea" && NW.boat && NW.boat.on) return goWorld("sea", NW.boat.area);
  // area yang bisa dijelajahi (Muara, Toba) → kembali ke darat; lokasi mancing saja → peta
  if (NW.areas.forLoc(S.loc)) goWorld(fishFrom === "dock" ? "dock" : "boat"); else openPanel("map");
});

function openPanel(name) {
  if (["fight", "bite", "charging", "result"].includes(G.phase)) return;
  if (G.phase === "waiting" || G.phase === "flying") { G.phase = "idle"; G.bob.vis = false; G.shadow = null; showMeter(false); updateHint(); }
  currentPanel = name; renderPanel(); $("panelWrap").classList.remove("hidden"); $("hint").classList.add("fade");
}
function closePanel() { SFX.click(); $("panelWrap").classList.add("hidden"); currentPanel = null; if (NW.inv) NW.inv.panelChanged(null); updateHint(); }
const balance = () => (NW.wallet ? NW.wallet.bal() : S.money);
const earn = (key, amount) => { if (NW.eco) NW.eco.reward(key, () => { S.money += amount; }); else S.money += amount; };   // hadiah tetap: server bila ekonomi server aktif
const charge = (cost, why, ok, no) => (NW.wallet ? NW.wallet.charge(cost, why, ok, no) : (S.money >= cost ? ((S.money -= cost), ok(), true) : false));
function renderPanel() {
  const body = $("panelBody");
  if (NW.inv) NW.inv.panelChanged(currentPanel); // kartu detail inventaris tidak tertinggal di panel lain
  const titles = { market: "🏪 Pasar Ikan", shop: "🛠️ Toko Perlengkapan", dex: "📖 Koleksi Ikan", map: "🗺️ Peta Nusantara" };
  if (extraPanels[currentPanel]) { const ep = extraPanels[currentPanel]; $("panelTitle").textContent = ep.title(); body.innerHTML = ep.render(); if (ep.after) ep.after(body); return; }
  $("panelTitle").textContent = titles[currentPanel];
  if (currentPanel === "shop") body.innerHTML = shopHTML();
  if (currentPanel === "dex") body.innerHTML = dexHTML();
  if (currentPanel === "map") body.innerHTML = mapHTML();
}
$("panelBody").addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const act = el.dataset.act, arg = el.dataset.arg;
  if (act === "buy") buy(arg, el.dataset.lv === undefined ? undefined : +el.dataset.lv);
  if (act === "tab") { dexTab = arg; SFX.click(); renderPanel(); }
  if (act === "go") travel(+arg);
  if (act === "audio" && NW.audioPanel) { closePanel(); NW.audioPanel.open(); }
  if (extraPanels[currentPanel] && extraPanels[currentPanel].act) extraPanels[currentPanel].act(act, arg, el);
});

function trendHTML(id) {
  const m = priceMult(id);
  return m >= 1.12 ? `<span class="trend-up">▲ ${Math.round((m - 1) * 100)}%</span>` : m <= 0.88 ? `<span class="trend-down">▼ ${Math.round((1 - m) * 100)}%</span>` : "";
}
// Katalog joran Toko Pak Bono: pratinjau, nama, harga, kemampuan, deskripsi, dan status tiap joran.
function rodShopHTML() {
  const U2 = UPGRADES.rod, lv = upLvl("rod"), n = U2.levels.length;
  let h = `<div class="rod-head"><div class="ic">🎣</div><div class="grow"><b>Joran</b><div class="muted">Dipakai sekarang: <b>${U2.levels[lv]}</b> · ikan hingga ${U2.cap[lv]} kg</div></div></div><div class="rod-list">`;
  for (let i = 0; i < n; i++) {
    const cur = i === lv, owned = i < lv, next = i === lv + 1, cost = U2.cost[i];
    const st = cur ? `<span class="rod-tag on">✔ Dipakai</span>` : owned ? `<span class="rod-tag">Sudah dilewati</span>` : next ? "" : `<span class="rod-tag lock">🔒 Beli yang sebelumnya dulu</span>`;
    const price = i === 0 ? `Harga katalog 🪙 ${fmt(U2.catalog[0])} · diberikan gratis` : `🪙 ${fmt(cost)}`;
    h += `<div class="rod-card ${cur ? "cur" : ""} ${owned ? "old" : ""}"><img src="${NW.look.rodPreview(i)}" alt="${U2.levels[i]}" width="44" height="66">
      <div class="grow"><div class="nm">${i + 1}. ${U2.levels[i]} ${st}</div>
      <div class="sub">${U2.info[i]} · Kuat ${U2.strength[i]}× · Tarik ${U2.reel[i]}×</div>
      <div class="sub">${U2.desc[i]}</div>
      <div class="sub price-line">${price}</div></div>
      ${next ? `<button class="btn ${balance() >= cost ? "gold" : ""}" data-act="buy" data-arg="rod" data-lv="${i}" ${balance() >= cost ? "" : "disabled"}>Beli</button>` : ""}</div>`;
  }
  return h + `</div>`;
}
function shopHTML() {
  let h = `<p class="muted">Upgrade alat untuk menaklukkan ikan yang lebih besar dan pulau yang lebih jauh.</p>`;
  for (const [k, U2] of Object.entries(UPGRADES)) {
    if (k === "rod") { h += rodShopHTML(); continue; } // katalog joran: 10 tingkat dengan pratinjau
    const lv = upLvl(k), max = lv >= U2.levels.length - 1, cost = max ? 0 : U2.cost[lv + 1];
    h += `<div class="shop-item"><div class="ic">${(U2.icons && U2.icons[lv]) || U2.icon}</div><div class="grow">
      <div class="nm"><b>${U2.levels[lv]}</b></div>
      <div class="lvl">${U2.levels.map((_, i) => `<i class="${i <= lv ? "on" : ""}"></i>`).join("")}</div>
      <div class="muted">${max ? "Level maksimal 🌟" : "Berikutnya: " + U2.levels[lv + 1] + " · " + U2.info[lv + 1]}</div></div>
      ${max ? "" : `<button class="btn ${balance() >= cost ? "gold" : ""}" data-act="buy" data-arg="${k}" data-lv="${lv + 1}" ${balance() >= cost ? "" : "disabled"}>🪙 ${fmt(cost)}</button>`}</div>`;
  }
  return h;
}
let buyLockT = 0;
function buy(k, expectLv) {
  const U2 = UPGRADES[k], lv = upLvl(k);
  if (lv >= U2.levels.length - 1) return;
  // Penjagaan pembelian ganda: tombol membawa level tujuan (data-lv). Klik basi/ganda ditolak, jadi koin tidak terpotong dua kali.
  if (expectLv !== undefined && expectLv !== lv + 1) return;
  const now = performance.now(); if (now - buyLockT < 350) return; buyLockT = now;
  const cost = U2.cost[lv + 1]; if (balance() < cost) return;
  charge(cost, "up:" + k, () => {                 // koin Top Up (server) dipakai dulu; pemberian barang hanya SETELAH pembayaran sah
    if ((S.up[k] || 0) !== lv) return;            // sudah berubah selama menunggu server
    S.up[k] = lv + 1;
    SFX.coin();
    if (k === "boat") toast(`⛵ ${LOCATIONS[lv + 1].name} terbuka! Buka Peta untuk berlayar`, "good");
    else toast(`${U2.icon} ${U2.levels[lv + 1]} dibeli!`, "good");
    save(); refreshHUD(); renderPanel();
  });
}

// Bumbu 2.2: satu spesies = satu kartu, varian sebagai sub-bagian kecil (✓ pernah / ? belum)
function variantRow(f) {
  if (!NW.variants || !NW.variants.eligible(f)) return "";
  const V = NW.variants, vd = (S.vd && S.vd[f.id]) || {};
  return `<div class="vcol">${V.IDS.map((k) => {
    const on = V.seen(S, f.id, k), e = vd[k], tip = on && e && e.n ? `×${e.n} · rekor ${fmtW(e.best)}${e.loc ? " · pertama di " + (LOCATIONS.find((l) => l.id === e.loc) || { short: e.loc }).short : ""}` : on ? "Pernah" : "Belum ditemukan";
    return `<span class="${on ? "on" : ""}" title="${tip}">${on ? "✓" : "?"} ${V.info(k).short}</span>`;
  }).join("")}</div>`;
}
function dexHTML() {
  const tabs = [...LOCATIONS.map((l) => ({ id: l.id, name: l.short })), { id: "*", name: "Lain-lain" }];
  if (!dexTab) dexTab = LOCATIONS[S.loc].id;
  const totalAll = FISH.length, gotAll = FISH.filter((f) => S.dex[f.id]).length;
  const vc = NW.variants ? NW.variants.counts(S) : null;
  let h = `<div class="muted">Total koleksi ${gotAll}/${totalAll} · Tangkapan ${S.stats.caught} · Legenda ${S.stats.legends}</div>
    ${vc ? `<div class="muted">✨ Varian ditemukan: Sisik Perak ${vc.silver} · Corak Senja ${vc.sunset} · Mutiara Nusantara ${vc.pearl} spesies</div>` : ""}
    <div class="progress-line"><div style="width:${(gotAll / totalAll) * 100}%"></div></div>
    <div class="dex-tabs">${tabs.map((t) => `<button data-act="tab" data-arg="${t.id}" class="${t.id === dexTab ? "on" : ""}">${t.name}</button>`).join("")}</div>
    <div class="dex-grid">`;
  for (const f of FISH.filter((f) => f.loc === dexTab)) {
    const rec = S.dex[f.id], R = RARITY[f.rarity];
    const timeTag = f.night === true ? "🌙 malam" : f.night === false ? "☀️ siang" : "";
    const veil = f.mistik && !rec; // ikan mistis: wujud & kelangkaan disembunyikan sampai tertangkap
    h += `<div class="dex-cell ${rec ? "" : "unknown"}" style="border-top-color:${veil ? "#5a6b72" : R.color}">
      ${f.emoji ? `<div class="emo">${f.emoji}</div>` : veil ? `<div class="emo">❔</div>` : `<img src="${fishImg(f.id)}" alt="">`}
      <div class="nm">${rec ? f.name : "???"}</div>
      <div class="sub">${veil ? "???" : R.label + (f.mistik ? " · ✨ Mistis" : "")}${timeTag ? " · " + timeTag : ""}</div>
      <div class="sub">${rec ? `×${rec.n} · rekor ${fmtW(rec.best)}` : "Belum tertangkap"}</div>${rec ? variantRow(f) : ""}</div>`;
  }
  return h + `</div>`;
}

function mapHTML() {
  let h = `<p class="muted">Upgrade kapal di Toko untuk membuka pulau baru. Tiap lokasi punya ikan khas.</p>${NW.audioPanel ? `<p><button class="btn ghost small" data-act="audio">🔊 Pengaturan Suara</button></p>` : ""}`;
  LOCATIONS.forEach((L, i) => {
    const locked = upLvl("boat") + 1 < L.boat, here = i === S.loc;
    const got = FISH.filter((f) => f.loc === L.id && S.dex[f.id]).length, tot = FISH.filter((f) => f.loc === L.id).length;
    h += `<div class="map-item ${here ? "here" : ""} ${locked ? "locked" : ""}">
      <div class="sw" style="background:linear-gradient(180deg,${L.sky[0]} 0 45%,${L.water[0]} 46%,${L.water[1]})"></div>
      <div class="grow"><b>${L.name}</b><div class="muted">${L.desc}</div><div class="muted">Koleksi ${got}/${tot}${NW.areas.forLoc(i) ? ` · 🚶 Bisa dijelajahi: ${NW.areas.forLoc(i).name}` : ""}</div></div>
      ${here ? `<span class="muted">📍 Di sini</span>` : locked ? `<span class="muted">🔒 ${UPGRADES.boat.levels[L.boat - 1]}</span>` : `<button class="btn" data-act="go" data-arg="${i}">Berlayar</button>`}</div>`;
  });
  return h;
}
function canSail(i) { return !!LOCATIONS[i] && upLvl("boat") + 1 >= LOCATIONS[i].boat; } // syarat level kapal (data lama, tidak diubah)
function travel(i) {
  closePanel();
  if (!canSail(i)) { toast(`🔒 Butuh ${UPGRADES.boat.levels[LOCATIONS[i].boat - 1]} untuk ke ${LOCATIONS[i].name}`, "bad"); return false; }
  const area = NW.areas.forLoc(i);
  if (area) { // Bumbu 2: lokasi dengan area jelajah (Muara, Toba) → berlayar singkat lalu turun di dermaga
    if (MODE === "world" && NW.areas.cur === area) return false;
    if (NW.hold) NW.hold.stop("travel");
    if (NW.boat) NW.boat.onVoyage(); // perjalanan cepat (rute lama): kapal ikut dan bersandar di dermaga tujuan
    NW.adv.voyage(area, () => {
      S.hour = (S.hour + 1.5) % 24;
      goWorld("boat", area.id);
    });
    return true;
  }
  S.loc = i; S.hour = (S.hour + 1.5) % 24;
  enterFishing("boat");
  toast(`⛵ Tiba di ${LOCATIONS[i].name}`, "good");
  return true;
}

// ---------- Pindah mode ----------
function applyMode() {
  document.body.classList.toggle("mode-world", MODE === "world");
  document.body.classList.toggle("mode-fish", MODE === "fish");
  const lb = $("landBtn");
  lb.innerHTML = fishFrom === "sea" && MODE === "fish" ? "<span>⛵</span>Ke Kapal" : NW.areas.forLoc(S.loc) ? "<span>🏝️</span>Ke Darat" : `<span>🗺️</span>Peta · ${LOCATIONS[S.loc].short}`;
}
function resetFishing() {
  G.hot = null;
  G.phase = "idle"; G.bob.vis = false; G.shadow = null; G.fight = null; G.holding = false;
  showMeter(false); $("fightUI").classList.add("hidden"); setNavLocked(false);
}
function enterFishing(from) {
  if (NW.hold) NW.hold.stop("fishing"); // joran di tangan: berhenti memamerkan ikan
  MODE = "fish"; fishFrom = from;
  if (NW.story) NW.story.mark("fish");
  if (from === "dock") S.loc = NW.areas.cur.locIndex; // mancing dari titik mancing area aktif (Muara / Toba)
  // Bumbu 2.4: dari kapal berjangkar — lokasi = area laut sekarang, kelompok ikan = spot laut di posisi kapal
  if (from === "sea") { S.loc = NW.areas.cur.locIndex; G.sea = NW.sea && NW.boat ? NW.sea.fishingAt(NW.areas.cur.id, NW.boat.B.x, NW.boat.B.y) : null; } else G.sea = null;
  G.spotId = from === "dock" && NW.secret && NW.world && NW.secret.isSecret(NW.world.fishSpot && NW.world.fishSpot()) ? NW.world.fishSpot() : null; // Bumbu 2.2: spot rahasia aktif
  resetFishing(); buildScenery(); applyMode(); refreshHUD(); updateHint(); save();
}
function goWorld(at, areaId) {
  const area = (areaId && NW.areas.get(areaId)) || NW.areas.forLoc(S.loc) || NW.areas.cur;
  MODE = "world"; S.loc = area.locIndex;
  resetFishing(); buildScenery(); applyMode();
  NW.world.onEnter(at, area.id); refreshHUD(); updateHint(); save();
}
function marketTip() {
  const hot = FISH.filter((f) => f.loc === "muara").map((f) => ({ f, m: priceMult(f.id) })).sort((a, b) => b.m - a.m)[0];
  return hot && hot.m > 1.1 ? `Hari ini ${hot.f.name} lagi mahal, naik ${Math.round((hot.m - 1) * 100)}%!` : "Harga hari ini biasa saja. Besok bisa beda, lho.";
}

// ---------- Mulai ----------
$("startBtn").addEventListener("click", () => {
  initAudio(); SFX.click(); // gestur pemain yang sah: audio baru boleh aktif di sini
  if (NW.audio) NW.audio.setMuted(!!S.muted);
  started = true; $("splash").classList.add("hidden"); updateHint();
  NW.world.onEnter("start", NW.areas.cur.id); // tampilkan judul lokasi
});

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (started && NW.weather) NW.weather.update(dt);
  if (MODE === "world") {
    G.t += dt;
    if (started) { NW.world.update(dt); if (NW.audioDirector) NW.audioDirector.frame(dt); }
    if (!((NW.shopUI && NW.shopUI.isOpen()) || (NW.kedaiUI && NW.kedaiUI.isOpen()))) NW.world.draw(ctx, G.t); // Kedai/Toko menutupi layar → dunia tidak digambar (hemat CPU/baterai HP)
  } else {
    if (started) update(dt); else { G.t += dt; for (const c of clouds) c.x = (c.x + c.v * dt) % 1.2; }
    draw();
  }
  requestAnimationFrame(loop);
}

// API untuk modul dunia pulau (world/*.js)
window.Nusa = {
  get S() { return S; },
  balance, charge, earn,
  mode: () => MODE, isStarted: () => started,
  isPanelOpen: () => !$("panelWrap").classList.contains("hidden") || !$("catchWrap").classList.contains("hidden") || !$("shareWrap").classList.contains("hidden") || !!($("aqWrap") && !$("aqWrap").classList.contains("hidden")) || !!(NW.kedai && NW.kedai.isOpen()) || !!(NW.shopUI && NW.shopUI.isOpen()),
  openPanel, enterFishing, goWorld, travel, canSail, tickTime, darkness, goldenHour, isNight, marketTip, setHint, save, toast,
  coolerFull: () => S.cooler.length >= coolerCap(),
  sfx: (n, a) => { initAudio(); if (NW.audio && NW.audio.sfx(n, a)) return; if (SFX[n]) SFX[n](a); },
  // keadaan mancing untuk audio (tanpa rarity/berat ikan, supaya suara tidak membocorkan hasil)
  fishState: () => { const F = G.fight; return { phase: G.phase, T: F ? F.T : 0, surge: !!(F && F.surge > 0), tired: !!(F && F.tiredT > 0 && !(F.surge > 0)), warn: !!(F && F.T > 0.82) }; },
  seaSpot: () => (fishFrom === "sea" && G.sea ? G.sea.id : null), fishFrom: () => fishFrom,
  tone, on, emit, registerPanel, renderPanel: () => currentPanel && renderPanel(), currentPanel: () => currentPanel, closePanel,
  sleepUntilMorning, refreshHUD, drawFish, fishImg, priceOf, priceMult, fmt, fmtW, FISH_BY_ID, coolerCap, upLvl, trendHTML,
};

load();
// Bumbu 2: mulai di area terakhir yang dijelajahi (Muara bila data kosong / syarat kapal tidak terpenuhi)
const startArea = NW.adv ? NW.adv.startArea(canSail) : NW.areas.get("muara");
S.loc = startArea.locIndex;
NW.life.hook(); NW.home.hook(); // Tahap 2A: misi harian & Rumahku
NW.story.hook(isNewPlayer);     // Bumbu 1: cerita, keahlian, petunjuk pemain baru
NW.look.hook();                 // Bumbu 1.1: gelar tangkapan & nama pemain lokal
NW.inv.hook();                  // Bumbu 1.2: inventaris & pasar
NW.hold.hook();                 // Bumbu 1.2: pamer ikan
NW.adv.hook(isNewPlayer);       // Bumbu 2: Buku Petualangan, penemuan tempat, perjalanan antardaerah
if (NW.audioDirector) NW.audioDirector.hook(); // Bumbu 2.1: pengarah musik & suasana
if (NW.toba) NW.toba.hook();               // Bumbu 2: cerita "Rahasia Tepian Danau" (tantangan ikan jurung)
if (NW.selat) NW.selat.hook();             // Bumbu 2.4: cerita "Jejak Arus Selat"
if (NW.boat) NW.boat.hook();               // Bumbu 2.4: tombol kapal & panel Peta Laut
if (NW.cloud) NW.cloud.hook();             // Tahap 3: tombol Profil & akun
if (NW.mp) NW.mp.hook();                   // Tahap 4: Dunia Bersama (multiplayer Muara Kampung) — hanya aktif untuk akun Google yang menyetujui
if (NW.streak) NW.streak.hook();           // Login Streak 7 Hari: tombol 🎁 & Kalender Hadiah (klaim hanya lewat server Firebase)
if (loadNote) setTimeout(() => toast(loadNote), 1200);
save(); // simpan hasil migrasi (data lama sudah dicadangkan)
resize(); buildScenery(); initAmbient(); refreshHUD(); applyMode();
NW.world.resize(W, H, DPR); NW.world.onEnter("start", startArea.id); updateHint();
document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
window.addEventListener("pagehide", save);
// akses debug ringan untuk pengujian
window.__nusa = { get S() { return S; }, G, save, landFish, viewL, refreshHUD, mode: () => MODE, goWorld, enterFishing, travel, canSail, chooseFish, bobberScreen, rodTip, startFight, updateFight, endFight, fishFrom: () => fishFrom };
requestAnimationFrame(loop);
})();
