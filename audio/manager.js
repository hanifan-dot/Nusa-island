// ============================================================================
//  NUSA ISLAND — Bumbu 2.1: AudioManager (NW.audio)
//  SATU AudioContext untuk seluruh game (efek lama + musik + ambience).
//  Mengatur: musik & crossfade, ambience, SFX/stinger, volume per kategori, mute,
//  suspend/resume (tab tersembunyi), dan pembersihan. Tidak memutar apa pun sebelum init()
//  dipanggil dari interaksi pemain (tombol Mulai Bermain).
//  API: init, setArea/setTimeOfDay/setGameplayState (lewat NW.audioDirector), playTheme, sfx, stinger,
//       setVolume, setMuted, suspend, resume, dispose, stats.
// ============================================================================
(function () {
const NW = (window.NW = window.NW || {});
const K = NW.kit, KEY = "nusa-island-audio-v1";
const DEFAULTS = { master: 0.7, music: 0.35, amb: 0.5, sfx: 0.7 };
const CATS = ["master", "music", "amb", "sfx"];
// pengali dasar tiap bus (hasil kalibrasi level di tests/audio_eval.py; slider = posisi relatif)
const BASE = { music: 5.2, amb: 3.0, sfx: 3.3 };
const curve = (v) => v * v;

// ---------- pengaturan tersimpan (kunci terpisah: tidak menyentuh simpanan permainan) ----------
function loadSettings() {
  const s = Object.assign({}, DEFAULTS);
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return s;
    const o = JSON.parse(raw);
    for (const c of CATS) if (typeof o[c] === "number" && isFinite(o[c])) s[c] = Math.min(1, Math.max(0, o[c]));
  } catch (_) {}
  return s;
}
let settings = loadSettings(), saveT = null;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {} }, 250); }

let ctx = null, stage = null, amb = null, ready = false, failed = false, ctxCount = 0;
let hidden = false, muted = false, running = false, started = false, pumpT = null, tickN = 0, disposed = false;
let duck = 1, indoor = false, onTick = null, envNow = null, previewing = null, unlockOn = false;
const tracks = new Map(); let cur = null;
const lastPlay = {};
const MAX_TRACKS = 3;

const S = () => (window.Nusa && window.Nusa.S) || {};
const isMuted = () => !!S().muted;

function applyVolumes(fast) {
  if (!stage) return;
  const t = ctx.currentTime, tau = fast ? 0.01 : 0.05;
  stage.master.gain.setTargetAtTime(muted ? 0 : settings.master, t, muted ? 0.04 : tau);
  stage.music.gain.setTargetAtTime(curve(settings.music) * BASE.music * duck, t, 0.35);
  stage.amb.gain.setTargetAtTime(curve(settings.amb) * BASE.amb * (indoor ? 0.5 : 1), t, 0.3);
  stage.sfx.gain.setTargetAtTime(curve(settings.sfx) * BASE.sfx, t, tau);
}

// ---------- siklus hidup ----------
function init() {
  if (ready) { syncRun(); return true; }
  if (failed || disposed) return false;
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) throw new Error("tanpa WebAudio");
    ctx = new C({ latencyHint: "interactive" }); ctxCount++;
    stage = K.makeStage(ctx);
    stage.master.gain.value = 0; // naik pelan setelah berjalan: tidak ada klik/lonjakan
    amb = NW.ambient.create(ctx, stage);
    ready = true; started = true;
    const c0 = ctx; c0.onstatechange = () => { if (ctx === c0 && ready && c0.state === "running") applyVolumes(); };
    muted = isMuted(); applyVolumes();
    if (!unlockOn) { unlockOn = true; window.addEventListener("pointerdown", unlock, { passive: true }); }
    syncRun();
    return true;
  } catch (e) { failed = true; ctx = null; stage = null; ready = false; console.warn("Audio tidak tersedia:", e && e.message); return false; }
}
function unlock() { if (ready && running && ctx.state !== "running") ctx.resume().catch(() => {}); }
// jalankan hanya bila: siap, tab terlihat, tidak mute
function syncRun() {
  if (!ready) return;
  const want = !hidden && !muted;
  if (want && !running) {
    running = true;
    ctx.resume().then(() => applyVolumes()).catch(() => {});
    for (const t of tracks.values()) t.nextT = null; // jangan mengejar bar yang terlewat
    clearInterval(pumpT); pumpT = setInterval(pump, 100);
  } else if (!want && running) {
    running = false; clearInterval(pumpT); pumpT = null;
    // redam dulu supaya tidak ada klik, lalu hentikan context (tidak ada CPU terpakai)
    const t = ctx.currentTime; stage.master.gain.cancelScheduledValues(t); stage.master.gain.setTargetAtTime(0, t, 0.03);
    setTimeout(() => { if (!running && ctx && ctx.state === "running") ctx.suspend().catch(() => {}); }, 180);
  } else if (want && running) applyVolumes();
  else if (!want && !running && ctx.state === "running") ctx.suspend().catch(() => {}); // mute sejak awal: tidak memakai CPU
}
function setMuted(b) { muted = !!b; if (ready) { applyVolumes(true); syncRun(); } }
function suspend() { hidden = true; syncRun(); }
function resume() { hidden = false; syncRun(); }
function pump() {
  if (!ready || !running) return;
  const now = ctx.currentTime;
  for (const t of tracks.values()) t.pump(now + 0.45);
  if (amb && envNow) amb.pump(now, envNow);
  if (++tickN % 3 === 0) { const m = isMuted(); if (m !== muted) setMuted(m); if (onTick) { try { onTick(); } catch (e) { console.error(e); } } }
}
document.addEventListener("visibilitychange", () => { if (document.hidden) suspend(); else resume(); });
window.addEventListener("pagehide", suspend);
window.addEventListener("pageshow", resume);

// ---------- musik ----------
function disposeTrack(tr) { clearTimeout(tr.fadeTimer); tr.dispose(); tracks.delete(tr.id); if (cur === tr) cur = null; }
function fadeOut(tr, sec) {
  tr.fading = true; tr.fade(0, sec); clearTimeout(tr.fadeTimer);
  tr.fadeTimer = setTimeout(() => { if (tr.fading) disposeTrack(tr); }, sec * 1000 + 350);
}
// Mulai/ganti tema dengan crossfade. Bisa dibatalkan: kembali ke tema yang sedang memudar = dihidupkan lagi (tanpa mulai ulang).
function playTheme(id, fade = 3) {
  if (!ready) return false;
  const th = NW.music.THEMES[id]; if (!th) return false;
  if (cur && cur.id === id && !cur.fading) return true;
  let tr = tracks.get(id);
  if (tr && tr.fading) { tr.fading = false; clearTimeout(tr.fadeTimer); }
  else if (!tr) { tr = new NW.music.Track(ctx, stage, th); tracks.set(id, tr); if (running) tr.pump(ctx.currentTime + 0.45); }
  for (const o of tracks.values()) if (o !== tr && !o.fading) fadeOut(o, fade);
  tr.fade(1, fade); cur = tr;
  while (tracks.size > MAX_TRACKS) { // pengaman: tidak pernah lebih dari 3 jalur sekaligus
    const old = [...tracks.values()].find((x) => x !== tr && x.fading); if (!old) break; fadeOut(old, 0.1); disposeTrack(old);
  }
  return true;
}
function stopMusic(fade = 1.5) { for (const o of tracks.values()) if (!o.fading) fadeOut(o, fade); cur = null; }
function setIntensity(x) { if (cur) cur.intensity = x; }
function setDuck(v, tau = 0.3) { duck = v; if (!stage) return; stage.music.gain.setTargetAtTime(curve(settings.music) * BASE.music * duck, ctx.currentTime, tau); }

// ---------- suara lingkungan ----------
function setAmbience(env) { envNow = env; if (amb) amb.setEnv(env); }
function setIndoor(b) { if (indoor === b) return; indoor = b; if (amb) amb.indoor(b); applyVolumes(); }

// ---------- efek suara ----------
// true = ditangani (termasuk ketika dibisukan/dibatasi), false = tidak tersedia (pemanggil boleh memakai cadangan lama)
function sfx(name, arg) {
  const fn = NW.sfxLib.L[name]; if (!fn) return false;
  if (!ready) return false;
  if (muted || !running || ctx.state !== "running") return true;
  const rule = NW.sfxLib.RULE[name] || {}, now = ctx.currentTime;
  if (rule.gap && lastPlay[name] != null && now - lastPlay[name] < rule.gap) return true;
  if (!rule.crit && !K.room(1, now, 0.5)) return true;
  lastPlay[name] = now; sfxLog.push({ name, arg, t: now }); if (sfxLog.length > 40) sfxLog.shift();
  try { NW.sfxLib.play(ctx, stage.sfx, now + 0.005, name, arg); } catch (e) { console.error("sfx:", name, e); }
  if (onSfx) onSfx(name, arg);
  return true;
}
// suara lingkungan sesaat dari luar (mis. guruh dari mesin cuaca): ikut mute/slider karena lewat bus lingkungan
const shotLog = [];
function shot(kind, delay = 0.5) {
  if (!ready || muted || !running || ctx.state !== "running" || !amb) return false;
  amb.oneShot(kind, ctx.currentTime + delay, kind === "guruh" ? 0.05 : 0.04); shotLog.push({ kind, t: ctx.currentTime }); if (shotLog.length > 20) shotLog.shift(); return true;
}
let onSfx = null; const sfxLog = []; // 40 efek terakhir (untuk pengujian & diagnosis)
function stinger(name) { return sfx(name); }

// ---------- pengaturan ----------
function setVolume(cat, v) { if (!CATS.includes(cat)) return; settings[cat] = Math.min(1, Math.max(0, +v || 0)); applyVolumes(true); persist(); }
const getVolume = (cat) => settings[cat];
function resetVolumes() { settings = Object.assign({}, DEFAULTS); applyVolumes(true); persist(); }

// ---------- pratinjau (menu uji dengar) ----------
function preview(id, fade = 0.6) { previewing = id; return playTheme(id, fade); }
function stopPreview() { previewing = null; NW.audio.previewInt = 0; }

function stats() {
  return { ctxCount, state: ctx ? ctx.state : "none", ready, running, muted, hidden, tracks: tracks.size, trackIds: [...tracks.keys()], fading: [...tracks.values()].filter((t) => t.fading).length,
    liveVoices: K.stats.live, startedVoices: K.stats.started, endedVoices: K.stats.ended, skipped: K.stats.skipped, maxLive: K.stats.maxLive, ambSources: amb ? amb.sources : 0,
    pump: !!pumpT, ksCache: K.ksCache.size, cur: cur ? cur.id : null, duck, indoor, previewing };
}
function dispose() {
  disposed = true; clearInterval(pumpT); pumpT = null; running = false;
  for (const t of [...tracks.values()]) disposeTrack(t);
  if (amb) amb.dispose(); amb = null;
  if (unlockOn) { window.removeEventListener("pointerdown", unlock); unlockOn = false; }
  if (ctx) { try { ctx.close(); } catch (_) {} }
  ctx = null; stage = null; ready = false;
}

NW.audio = {
  init, setMuted, shot, get shotLog() { return shotLog; }, suspend, resume, dispose, stats, playTheme, stopMusic, setIntensity, setDuck, setAmbience, setIndoor, sfx, stinger,
  setVolume, getVolume, resetVolumes, preview, stopPreview, DEFAULTS, BASE, CATS,
  sfxLog, busGains() { const o = {}; for (const [k, t] of tracks) o[k] = +t.bus.gain.value.toFixed(3); return o; },
  setTickHandler(f) { onTick = f; }, setSfxHandler(f) { onSfx = f; },
  get ctx() { return ctx; }, get stage() { return stage; }, get sfxBus() { return stage && stage.sfx; }, get ready() { return ready; }, get failed() { return failed; }, previewInt: 0,
  get running() { return running; }, get previewing() { return previewing; }, get current() { return cur ? cur.id : null; }, get settings() { return Object.assign({}, settings); },
  get ambTarget() { return amb ? Object.assign({}, amb.target) : null; },
  ambLevel: (k) => (amb && amb.layers && amb.layers[k] ? amb.layers[k].gain.value : 0), // Bumbu 2.4: volume nyata satu lapisan (uji mesin kapal mati)
};
})();
