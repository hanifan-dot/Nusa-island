// ============================================================================
//  NUSA ISLAND — Bumbu 2.1: pengarah suasana audio (NW.audioDirector)
//  Membaca keadaan permainan (daerah, jam, mode mancing, Rumahku, dialog, perjalanan) beberapa kali per
//  detik, lalu memilih tema musik, intensitas, peredaman (ducking) dan lingkungan.
//  Tidak ada pemutaran berulang: tema hanya diganti bila pilihan berubah, dengan crossfade.
//  Audio spasial hanya memakai hitungan jarak/ubin sederhana ±3 kali per detik (bukan per objek per frame).
// ============================================================================
(function () {
const NW = (window.NW = window.NW || {});
const A = () => NW.audio;
const N = () => window.Nusa;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// 05.00–10.59 pagi · 11.00–15.59 siang · 16.00–18.59 sore · 19.00–04.59 malam
function periodOf(h) { return h >= 5 && h < 11 ? "pagi" : h >= 11 && h < 16 ? "siang" : h >= 16 && h < 19 ? "sore" : "malam"; }
// 0 siang … 1 malam, berubah halus di sekitar senja & fajar (dipakai ambience)
function nightFactor(h) { if (h >= 19.5 || h < 4.5) return 1; if (h >= 18.5) return h - 18.5; if (h < 5.5) return 5.5 - h; return 0; }

// ---------- pemilihan tema (fungsi murni; diuji langsung) ----------
function themeFor(s) {
  if (s.scene) return s.scene;
  if (s.voyage) return "kapal";
  if (s.room) return "rumah";
  if (s.fishing) return s.areaKey === "toba" ? "mancing_toba" : "mancing_muara";
  const ak = NW.music.THEMES[(s.areaKey || "muara") + "_" + s.period] ? s.areaKey || "muara" : "muara";
  return ak + "_" + s.period;
}

let scene = null, voy = false, voyName = "", duckT = 0, engine = null, lastKey = null, lastState = null;
let phasePrev = "idle", tiredPrev = false, I = 0, lastFoot = null, foot = 0, sitting = false;
const sceneStack = [];

function gather() {
  const Nu = N(), St = Nu.S, h = St.hour, fish = Nu.mode() === "fish";
  const home = NW.home && NW.home.active, room = home && NW.home.scene === "room";
  const area = NW.areas && NW.areas.cur;
  let areaKey = area ? area.id : "muara";
  if (fish) { const a = NW.areas.forLoc(St.loc); areaKey = a ? a.id : "muara"; }
  return { period: periodOf(h), hour: h, areaKey, fishing: fish, home: !!home, room: !!room, voyage: voy, scene, dialog: !!document.querySelector("#dlg:not(.hidden)") };
}

// ---------- lingkungan ----------
const ZONE = { // id penemuan di area.discoveries yang menandai titik khusus
  muara: { market: "muara:pasar" }, toba: { market: "toba:pasar", view: "toba:bukit" },
};
function zonePos(areaId, key) {
  const id = ZONE[areaId] && ZONE[areaId][key]; if (!id) return null;
  const ar = NW.areas.get(areaId), d = ar && (ar.discoveries || []).find((x) => x.id === id); return d || null;
}
function envFor(s) {
  const nightF = nightFactor(s.hour), dayF = 1 - nightF;
  const e = { area: s.areaKey, nightF, dayF, water: 0, trees: 0, market: 0, view: 0, dock: 0, hill: 0, indoor: s.room, fishing: s.fishing, voyage: s.voyage };
  if (s.voyage) { e.water = 1; return e; }
  if (s.fishing) { e.water = 1; return e; }
  if (s.home) { e.water = 0.1; e.trees = 0.25; return e; } // halaman Rumahku: lingkungan tenang (interior diredam oleh `indoor`)
  const p = NW.world && NW.world.player; if (!p) return e;
  const px = p.x, py = p.y, x0 = Math.floor(px), y0 = Math.floor(py);
  let w = 0, hl = 0, tr = 0, cnt = 0;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const d2 = dx * dx + dy * dy; if (d2 > 10) continue; cnt++;
    const t = NW.tileAt(x0 + dx, y0 + dy);
    if (t === 0 || t === 1) w += 1 - d2 / 14; else if (t === 6 || t === 7) hl += 1;
  }
  e.water = clamp(w / 14); e.hill = clamp(hl / 18);
  for (const o of NW.objects || []) { if (o.kind !== "tree") continue; const d = Math.hypot(o.x - px, o.y - py); if (d < 4.5) tr += 1 - d / 4.5; }
  e.trees = clamp(tr / 3.5 + e.hill * 0.6);
  e.dock = NW.tileAt(x0, y0) === 5 ? 1 : 0;
  const m = zonePos(s.areaKey, "market"); if (m) e.market = clamp(1 - (Math.hypot(m.x - px, m.y - py) - 1.5) / 6.5);
  const v = zonePos(s.areaKey, "view"); if (v) e.view = clamp(1 - (Math.hypot(v.x - px, v.y - py) - 1.2) / 3.5);
  return e;
}

// ---------- peredaman (ducking) ----------
function duckFor(s, fs) {
  let d = 1;
  if (s.dialog) d = Math.min(d, 0.62);
  if (NW.weather && NW.weather.state.rain > 0.02) d = Math.min(d, 1 - 0.2 * NW.weather.state.rain * (s.room ? 0.5 : 1)); // hujan: musik sedikit turun (tema area tetap)
  if (s.fishing) {
    const ph = fs.phase;
    d = Math.min(d, ph === "fight" ? 0.62 : ph === "bite" ? 0.55 : 0.45); // saat menunggu: musik sangat pelan; saat melawan: musik tegang tetapi di bawah efek
  }
  if (N().isPanelOpen && N().isPanelOpen()) d = Math.min(d, 0.8);
  if (document.querySelector("#aqWrap:not(.hidden)")) d = Math.min(d, 0.65);
  if (s.room && NW.home && NW.home.radioOn) d = Math.min(d, 0.25); // radio di rumah dinyalakan pemain → musik latar mengalah
  if (performance.now() < duckT) d = Math.min(d, 0.38);              // jingle/stinger sedang berbunyi
  return d;
}

// ---------- intensitas musik mancing ----------
function intensityFor(fs) {
  if (fs.phase === "bite") return 0.32;
  if (fs.phase === "fight") return clamp(0.5 + 0.4 * clamp(fs.T) + (fs.surge ? 0.12 : 0) - (fs.tired ? 0.3 : 0));
  return 0;
}

// ---------- tick (±3×/dtk dipanggil AudioManager) ----------
function tick() {
  const a = A(); if (!a || !a.ready || !N().isStarted()) return;
  const s = gather(), fs = N().fishState ? N().fishState() : { phase: "idle", T: 0 };
  lastState = s;
  // 1. musik
  if (!a.previewing) {
    const id = themeFor(s);
    if (id !== lastKey) {
      const prev = lastKey; lastKey = id;
      const pS = prev && prev.split("_"), cS = id.split("_");
      const timeOnly = prev && pS[0] === cS[0] && NW.music.THEMES[prev] && /^(pagi|siang|sore|malam)$/.test(pS[1] || "") && /^(pagi|siang|sore|malam)$/.test(cS[1] || "");
      a.playTheme(id, id === "kapal" ? 1.2 : timeOnly ? 6 : 2.8);
    } else if (!a.current || a.current !== id) a.playTheme(id, 2);
  }
  // 2. intensitas & peredaman
  const target = s.fishing ? intensityFor(fs) : 0;
  I += (target - I) * (target > I ? 0.6 : 0.35); if (I < 0.01) I = 0;
  a.setIntensity(a.previewing ? a.previewInt || 0 : I);
  a.setDuck(a.previewing ? 1 : duckFor(s, fs), 0.35);
  // 3. suasana lingkungan
  a.setAmbience(NW.weather ? NW.weather.audioEnv(envFor(s)) : envFor(s)); a.setIndoor(s.room);
  // 4. isyarat mancing: tegang & peringatan (efek pendek di atas musik)
  if (s.fishing) {
    if (fs.phase === "fight" && phasePrev !== "fight") a.sfx("strike");
    if (fs.phase === "fight" && fs.warn) a.sfx("warn");
    if (fs.phase === "fight" && fs.tired && !tiredPrev) a.sfx("lelah");
    if (phasePrev === "fight" && fs.phase === "reeling") { /* hasil ditangani SFX game */ }
    tiredPrev = !!(fs.phase === "fight" && fs.tired);
  } else tiredPrev = false;
  phasePrev = fs.phase;
}

// ---------- langkah kaki (dipanggil tiap frame; sangat ringan) ----------
function frame(dt) {
  const a = A(); if (!a || !a.running || !N().isStarted() || N().mode() !== "world" || voy) { lastFoot = null; return; }
  const p = NW.world && NW.world.player; if (!p) return;
  if (!lastFoot) { lastFoot = { x: p.x, y: p.y }; return; }
  const d = Math.hypot(p.x - lastFoot.x, p.y - lastFoot.y); lastFoot.x = p.x; lastFoot.y = p.y;
  if (d > 1.5 || d < 0.0004) { return; } // teleport (pindah area) atau diam
  foot += d; if (foot < 0.66) return; foot = 0;
  const home = NW.home && NW.home.active;
  if (home) return a.sfx(NW.home.scene === "room" ? "step_lantai" : "step_rumput");
  const t = NW.tileAt(Math.floor(p.x), Math.floor(p.y));
  a.sfx(t === 5 ? "step_kayu" : t === 2 ? "step_pasir" : t === 4 ? "step_tanah" : "step_rumput");
}

// ---------- adegan cerita (musik cerita lalu kembali otomatis) ----------
function setScene(id) { scene = id || null; if (A() && A().ready) tick(); }

// ---------- perjalanan kapal ----------
function engineOn(a) {
  const ctx = a.ctx, st = a.stage; if (!ctx || !st || engine) return;
  const K = NW.kit, g = ctx.createGain(); g.gain.value = 0.0001; g.connect(st.ambIn);
  const n = K.noiseLoop(ctx, 1.3), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 280; n.connect(lp).connect(g);
  const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 52; const olp = ctx.createBiquadFilter(); olp.type = "lowpass"; olp.frequency.value = 170;
  const am = ctx.createGain(); am.gain.value = 0.55; const l = ctx.createOscillator(); l.frequency.value = 6.4; const ld = ctx.createGain(); ld.gain.value = 0.4; l.connect(ld).connect(am.gain);
  o.connect(olp).connect(am).connect(g); o.start(); l.start();
  g.gain.setTargetAtTime(0.5, ctx.currentTime, 0.35);
  engine = { g, n, o, l, nodes: [n, o, l, lp, olp, am, ld, g] };
}
function engineOff(a) {
  const e = engine; if (!e) return; engine = null;
  const ctx = a.ctx; if (!ctx) return;
  e.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
  setTimeout(() => { for (const x of [e.n, e.o, e.l]) { try { x.stop(); } catch (_) {} } for (const x of e.nodes) { try { x.disconnect(); } catch (_) {} } }, 2200);
}
function onVoyage(on, name) {
  const a = A(); voy = !!on; voyName = name || "";
  if (!a || !a.ready) return;
  if (on) { a.sfx("berlayar"); engineOn(a); tick(); }
  else { engineOff(a); a.sfx("tiba"); lastKey = null; tick(); }
}

// kebisingan sementara: musik mengalah saat jingle (diatur dari handler SFX)
const LOUD = { catch: 2.4, misi_baru: 1.4, bab_selesai: 2.4, temuan: 1.8, penghargaan: 3.4, gelar: 2.0, pemandangan: 3.6 };
function hook() {
  const a = A(); if (!a) return;
  a.setTickHandler(tick);
  a.setSfxHandler((name, arg) => {
    let sec = LOUD[name]; if (!sec) return;
    if (name === "catch" && (arg === "sampah" || arg === "biasa")) sec = 1.1;
    duckT = Math.max(duckT, performance.now() + sec * 1000);
  });
}

NW.audioDirector = { periodOf, nightFactor, themeFor, gather, envFor, duckFor, intensityFor, tick, frame, setScene, onVoyage, hook, get state() { return lastState; }, get engineActive() { return !!engine; }, get scene() { return scene; }, sceneStack };
})();
