// =========================================================
//  NUSA ISLAND — Event 5 Monster Legenda (sisi game). Modul: NW.event
//  - Jam & jadwal = jam SERVER (eventInfo dari nusa-api / Functions); jam HP tidak dipakai untuk menentukan event.
//  - Semua pemain melihat monster yang SAMA di waktu yang sama: lintasan renang adalah fungsi deterministik dari (id event, detik sejak mulai).
//  - Duel memancing: server membuat seed → game memainkan duel real-time dengan inti yang sama → mengirim LOG tombol → server menilai & memberi hadiah.
//    Game TIDAK PERNAH mengirim "saya menang" / skor / koin; hasil yang tampil di layar = jawaban server.
//  - Tamu / ekonomi server belum aktif: monster tetap terlihat (tontonan), tetapi tidak ada duel berhadiah.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const EV = window.NusaEventCore; if (!EV) return;
const N = () => window.Nusa, $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rid = () => "V" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36) + Math.floor(Math.random() * 1e9).toString(36);
const PEND = "nusa-event-pending", SEEN = "nusa-event-seen";
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penyimpanan penuh/diblokir */ } };
const api = () => NW.shopApi;
const ecoOn = () => !!(NW.eco && NW.eco.active && NW.eco.active());

let info = null, sBase = 0, pBase = 0, lastFetch = 0, fetching = false, my = null, myFetch = 0, myFetching = false, st = null, prevPhase = null, claimChecked = "", listeners = [];
let duel = null, attract = 0, lastWhy = 0, V = { dirS: 1, t: 0, lastWall: 0, hx: 0 }, despawnAt = 0;
const emit = () => listeners.forEach((f) => { try { f(); } catch (e) { /* pendengar rusak tidak boleh mematikan event */ } });
// jam server = (jam server saat jawaban diterima) + (waktu berjalan sejak itu, diukur jam MONOTON performance.now) → mengubah jam HP di tengah sesi tidak menggeser event
const serverNow = () => (sBase ? sBase + (performance.now() - pBase) : Date.now());
const toast = (m, k) => { try { N().toast(m, k); } catch (e) { /* belum siap */ } };
const err = (e) => (e && e.message) || "Gagal menghubungi server.";

// ---------- jam & jadwal dari server ----------
async function fetchInfo() {
  const a = api(); if (!a || typeof a.eventInfo !== "function" || fetching) return;
  fetching = true;
  try {
    const p0 = performance.now(), r = await a.eventInfo({}), p1 = performance.now();
    if (r && typeof r.now === "number") { sBase = r.now + (p1 - p0) / 2; pBase = p1; info = r; lastFetch = Date.now(); }
  } catch (e) { lastFetch = Date.now() - 240000; /* coba lagi ±1 menit */ }
  fetching = false; tick(); emit();
}
function status() { return info && info.on ? EV.status(serverNow(), info.anchor) : null; }
function applyEco(v) { try { if (v && NW.eco && NW.eco.applyState) NW.eco.applyState(v); } catch (e) { /* tampilan saja */ } }
async function fetchMy(force) {
  if (myFetching || !ecoOn() || !api() || !info || !info.on) return my;
  if (!force && Date.now() - myFetch < 20000) return my;
  myFetching = true;
  try {
    const r = await api().eco("ecoEventState", {}); myFetch = Date.now(); my = r.my || null; if (r.winner) my = Object.assign({}, my, { winner: r.winner });
    applyEco(r.eco);
    // juara event yang baru lewat: hadiah diklaim otomatis (server memeriksa; aman diulang)
    if (r.my && r.my.win && !r.my.claimed && r.ev && claimChecked !== r.ev.id) { claimChecked = r.ev.id; claim(r.ev.id); }
    if (r.ev && r.phase === "ended") claimChecked = r.ev.id;
  } catch (e) { /* tamu / belum init */ }
  myFetching = false; emit(); return my;
}
async function claim(eventId) {
  try {
    const r = await api().eco("ecoEventClaim", { opId: rid(), eventId }); applyEco(r.eco);
    if (r.winner && r.amount > 0) { toast(`🏆 Kamu JUARA event ${EV.BY_ID[r.monster].name}! +${N().fmt(r.amount)} koin`, "good"); try { N().sfx("catch", "legenda"); } catch (e) { /* suara opsional */ } }
    fetchMy(true);
  } catch (e) { claimChecked = ""; }
}

// ---------- AKSES EVENT KHUSUS (tiket) ----------
// Syarat kapal untuk perjalanan biasa TIDAK diubah. Selama event LIVE (jam server) dan saklar server eventPass aktif, pemain berakun boleh "ikut event":
// ia dibawa ke lokasi monster hanya untuk menonton & menantang monster. Ikan biasa tidak menggigit di sana (tidak bisa dipakai memancing lokasi terkunci),
// dan begitu event selesai / pemain pergi, ia dikembalikan ke lokasi semula. Saat game dibuka lagi, lokasi awal tetap dipilih game lewat syarat kapal biasa (startArea/canSail) sehingga tiket tidak terbawa.
let pass = null;
const sailOkFor = (locId) => { try { return N().canSail(locIndex(locId)); } catch (e) { return true; } };
function passAvailable(monId) {
  const s = st, m = EV.BY_ID[monId]; if (!s || s.phase !== "live" || !info || info.pass === false || !m || !ecoOn()) return false;
  return s.ev.monster === monId && !sailOkFor(m.loc);
}
function passGo() {
  const s = st; if (!s || s.phase !== "live") return false;
  const m = EV.BY_ID[s.ev.monster]; if (!passAvailable(m.id) || (my && my.left <= 0)) return false;
  if (here(m.id)) return true;
  const S = N().S, prev = pass ? pass.prev : S.loc;
  pass = { evId: s.ev.id, loc: locIndex(m.loc), prev };
  N().fish.enterAt(pass.loc); toast(`🎟️ Akses event: ${m.name} di ${locName(m.loc)}. Lempar kail dekat monster!`, "good");
  return true;
}
function passActive() { return !!pass; }
function passEnd(restore) {
  if (!pass) return; const p = pass; pass = null;
  if (restore && N().fish.locIdx() === p.loc && N().canSail(p.prev)) { N().fish.enterAt(p.prev); toast("🎟️ Akses event berakhir — kembali ke lokasi semula.", "good"); }
}
function passTick() {
  if (!pass) return;
  if (N().fish.locIdx() !== pass.loc || N().mode() !== "fish") { if (N().mode() !== "fish" || N().fish.locIdx() !== pass.loc) { /* pergi ke tempat lain: tiket gugur tanpa mengembalikan */ if (!duel) pass = null; } return; }
  const s = st; if ((!s || s.phase === "ended" || s.phase === "upcoming" || s.ev.id !== pass.evId) && !duel) passEnd(true);
}

// ---------- detak 1 detik: transisi fase, pengumuman, penyegaran ----------
function tick() {
  if (!info) return;
  const s = status(); st = s; passTick(); const ph = s ? s.phase : "off";
  if (ph !== prevPhase) {
    if (prevPhase !== null && s) {
      const m = EV.BY_ID[s.ev.monster], L = locName(m.loc);
      if (ph === "live") { announce(`🌊 ${m.name} MUNCUL di ${L}!`, true); if (ecoOn()) fetchMy(true); }
      if (ph === "closing") { despawnAt = Date.now(); announce(`Event ${m.name} selesai. Menunggu hasil…`); }
      if (ph === "ended") { fetchInfo(); fetchMy(true); }
    }
    prevPhase = ph;
  }
  const nx = s && (s.phase === "upcoming" ? s.ev : s.phase === "ended" ? s.next : null);   // event berikutnya (di antara dua event fase-nya "ended")
  if (nx && s.msToStart <= 10 * 60000 && s.msToStart > 0 && (lsGet(SEEN) || {}).warn !== nx.id) {
    lsSet(SEEN, Object.assign({}, lsGet(SEEN) || {}, { warn: nx.id }));
    toast(`🌊 ${Math.ceil(s.msToStart / 60000)} menit lagi: ${EV.BY_ID[nx.monster].name} muncul di ${locName(EV.BY_ID[nx.monster].loc)}!`, "good");
  }
  const near = s && (s.phase === "live" || s.phase === "closing" || (nx && s.msToStart < 20 * 60000)), every = near ? 60000 : 300000;
  if (Date.now() - lastFetch > every) fetchInfo();
  else if (s && s.phase === "ended" && !info.winner && Date.now() - lastFetch > 15000 && serverNow() < s.ev.close + 180000) fetchInfo();   // tunggu pengumuman juara
  if (NW.eventUI) NW.eventUI.pill();
  if (ecoOn() && info.on && !my && Date.now() - myFetch > 20000) fetchMy();
}
function announce(text, big) { if (NW.eventUI) NW.eventUI.announce(text, big); else toast(text, "good"); }
const LOCS = () => { try { return LOCATIONS; } catch (e) { return []; } };      // LOCATIONS = const global dari data.js (bukan properti window)
const locName = (id) => { const l = LOCS().find((x) => x.id === id); return l ? l.name : id; };
const locIndex = (id) => LOCS().findIndex((l) => l.id === id);

// ---------- monster di air: apa yang terlihat sekarang ----------
function monsterNow() {
  const s = st; if (!s || !s.ev) return null;
  const e = s.ev, sw = EV.SWIM[e.monster] || EV.SWIM.toman_purba;
  if (s.phase === "live") { const t = (serverNow() - e.start) / 1000; return { id: e.monster, ev: e, t, spawn: clamp(t / sw.spawn, 0, 1), gone: 0 }; }
  if (s.phase === "closing") { const g = clamp((Date.now() - despawnAt) / 5000, 0, 1), t = (serverNow() - e.start) / 1000; if (g >= 1 && !duel) return null; return { id: e.monster, ev: e, t, spawn: 1, gone: g }; }
  return null;
}
const sizeAt = (id, z, W) => Math.min(W * 1.1, W * ({ toman_purba: 0.6, jurung_mahkota: 0.68, barakuda_guntur: 0.8, kuwe_titan: 0.86, megalodon_bayangan: 0.98 }[id] || 0.5) * Math.pow(5 / z, 0.75));
function here(id) { try { const m = EV.BY_ID[id]; return !!m && N().fish.loc() === m.loc && N().mode() === "fish"; } catch (e) { return false; } }

// posisi layar monster dari lintasan bersama (+ tarikan ke umpan milik pemain ini, hanya tampilan)
function place(m, env) {
  const p = EV.swimAt(m.id, m.ev.id, m.t), sx = env.W / 2 + p.x * env.W * 0.36, sy = env.projY(p.z);
  return { p, sx, sy, z: p.z };
}

// ---------- digambar dari game.js (draw) tepat sebelum perahu ----------
function drawWater(c, env) {
  const m = monsterNow(); if (!m || !NW.eventDraw || !here(m.id)) return;
  const G = N().fish.G, now = performance.now(), dt = Math.min(0.1, (now - (V.lastWall || now)) / 1000); V.lastWall = now;
  let { p, sx, sy, z } = place(m, env), x = sx, y = sy, depth = p.depth, thrash = 0, speed = clamp(p.speed / 0.5, 0, 1.5), dir = p.dir;
  const fighting = duel && (duel.status === "play" || duel.status === "finishing" || duel.status === "starting");
  if (fighting && G.bob.vis) {
    const bx = env.projX(G.bob.x, G.bob.z), by = env.projY(G.bob.z); x = bx; y = by - 4 * env.U; z = G.bob.z;
    const d = duel.d; const k = d ? d.k : 0; thrash = k === 1 ? 1 : k === 2 ? 0.55 : 0.25; depth = k === 2 ? 0.75 : k === 1 ? 0.0 : 0.12; speed = k === 1 ? 1.4 : 0.6;
    dir = Math.sin((duel.tt || 0) * (k === 1 ? 4.5 : 0.9)) >= 0 ? 1 : -1;
  } else if (attract > 0.05 && G.bob.vis && G.phase === "waiting") {
    const k = sstep(0, 1.6, attract) * 0.92, bx = env.projX(G.bob.x, G.bob.z), by = env.projY(G.bob.z);
    x = lerp(sx, bx - (p.dir) * 18 * env.U, k); y = lerp(sy, by, k); dir = bx >= sx ? 1 : -1;
  }
  V.dirS += (dir - V.dirS) * Math.min(1, dt * (m.id === "barakuda_guntur" ? 7 : m.id === "megalodon_bayangan" ? 2 : 4));
  const em = Math.max(depth, 1 - sstep(0.12, 0.7, m.spawn)), vis = sstep(0, 0.22, m.spawn) * (1 - sstep(0, 0.85, m.gone));
  const size = sizeAt(m.id, z, env.W) * lerp(0.8, 1, sstep(0, 0.7, m.spawn)), tt = m.t + (fighting ? (duel.tt || 0) : 0);
  const o = { x, y, size, dir: Math.abs(V.dirS) < 0.06 ? 0.06 * (V.dirS < 0 ? -1 : 1) : V.dirS, t: tt, depth: clamp(Math.max(em, m.gone * 1), 0, 1), vis, spawn: m.spawn, thrash, speed, tilt: Math.sin(tt * 0.9) * 0.02 + (m.spawn < 1 ? (1 - m.spawn) * -0.12 : 0), W: env.W, H: env.H };
  const D = NW.eventDraw, c2 = c;
  if (m.spawn < 1) D.spawnFx(c2, m.id, { x, y, size, t: m.t, k: m.spawn, W: env.W, H: env.H });
  if (m.gone > 0 && m.gone < 1) { for (let i = 0; i < 3; i++) { const q = clamp(m.gone * 1.6 - i * 0.2, 0, 1); if (q <= 0 || q >= 1) continue; c2.strokeStyle = `rgba(255,255,255,${(1 - q) * 0.6})`; c2.lineWidth = Math.max(1.5, size * 0.012); c2.beginPath(); c2.ellipse(x, y + size * 0.05, size * (0.15 + q * 0.5), size * (0.03 + q * 0.1), 0, 0, 7); c2.stroke(); } }
  D.wake(c2, m.id, o); D.monster(c2, m.id, o); D.aura(c2, m.id, o);
  if (m.id === "megalodon_bayangan" && m.spawn < 1) { const a = Math.sin(m.spawn * 3.14) * 0.35; c2.fillStyle = `rgba(2,6,16,${a})`; c2.fillRect(0, 0, env.W, env.H); }
  m.screen = { x, y, size };
}

// ---------- umpan bertemu monster (dipanggil game.js saat fase "waiting") ----------
function why() {
  const s = st; if (!s || s.phase !== "live") return "Event sudah selesai.";
  if (!ecoOn()) return NW.shopApi && !NW.shopApi.isGuest() ? "Ekonomi server sedang menyambung… coba sebentar lagi." : "Masuk dengan akun Google dulu untuk menantang monster berhadiah.";
  if (!my) { fetchMy(true); return "Memuat kesempatanmu… coba lempar lagi."; }
  if (my.left <= 0) return `Kesempatanmu di event ini sudah habis (${EV.MAX_ATTEMPTS}/${EV.MAX_ATTEMPTS}). Tunggu event minggu depan!`;
  if (my.act) return "Duel sebelumnya masih tercatat berjalan di server. Tunggu ±1 menit.";
  return "";
}
function onWaiting(dt) {
  const G = N().fish.G, m = monsterNow(); if (duel) return;
  if (!m || m.spawn < 0.85 || m.gone > 0 || !here(m.id) || !G.bob.vis) { attract = Math.max(0, attract - dt); return; }
  const g = N().fish.geom(), pl = place(m, g), bx = g.projX(G.bob.x, G.bob.z), by = g.projY(G.bob.z);
  const d = Math.hypot((pl.sx - bx) / g.W, (pl.sy - by) / g.H * 1.6);
  if (pl.p.depth > 0.7 || d > 0.3) { attract = Math.max(0, attract - dt * 0.6); return; }
  const w = why();
  if (w) { if (Date.now() - lastWhy > 12000) { lastWhy = Date.now(); toast(w, "bad"); } attract = 0; return; }
  attract += dt; G.biteTimer = Math.max(G.biteTimer, 1.2);                       // ikan biasa menunggu: monster sedang mendekati umpan
  if (Math.random() < dt * 5) N().fish.ripple(G.bob.x, G.bob.z, 0.8);
  if (attract >= 1.9) startDuel(m);
}
function startDuel(m) {
  const G = N().fish.G; attract = 0;
  G.phase = "event"; G.biteTimer = 999; G.shadow = null; duel = { status: "starting", monster: m.id, tt: 0 };
  N().fish.navLock(true); N().setHint(""); N().fish.splash(G.bob.x, G.bob.z, 14); N().sfx("bite"); if (navigator.vibrate) try { navigator.vibrate(80); } catch (e) { /* tanpa getar */ }
  if (NW.eventUI) NW.eventUI.duelHud(duel, m);
  (async () => {
    try {
      const r = await api().eco("ecoEventStart", { opId: rid(), eventId: m.ev.id }); applyEco(r.eco);
      const d = EV.makeDuel(r.duel.monster, r.duel.seed);
      duel = { status: "play", monster: r.duel.monster, seed: r.duel.seed, eventId: r.duel.eventId, n: r.duel.n, left: r.duel.left, d, log: [], h: 0, lastTog: -10, acc: 0, tt: 0, z0: N().fish.G.bob.z, x0: N().fish.G.bob.x };
      my = Object.assign({}, my || {}, { left: r.duel.left, att: r.duel.n, act: true });
      N().fish.splash(G.bob.x, G.bob.z, 18); N().sfx("splash"); emit();
    } catch (e) { abort(err(e)); }
  })();
}
function abort(msg) {
  if (msg) toast(msg, "bad");
  duel = null; attract = 0; const G = N().fish.G; N().fish.navLock(false);
  if (G.phase === "event") N().fish.reelBack();
  if (NW.eventUI) NW.eventUI.duelHud(null); fetchMy(true);
}

// ---------- duel real-time (dipanggil game.js update, fase "event") ----------
function update(dt) {
  const G = N().fish.G;
  if (!duel) { N().fish.reelBack(); return { angle: -0.9, bend: 0 }; }
  duel.tt = (duel.tt || 0) + dt;
  if (duel.status === "play") {
    const d = duel.d; duel.acc += dt;
    while (duel.acc >= EV.DT && !d.result) {
      duel.acc -= EV.DT;
      const want = G.holding ? 1 : 0;
      if (want !== duel.h && d.step - duel.lastTog >= 2) { duel.h = want; duel.log.push(d.step); duel.lastTog = d.step; }
      d.advance(duel.h);
    }
    // bobber = tempat monster: ditarik mendekat saat kemajuan naik, bergejolak saat mengamuk
    const k = d.k, f = k === 1 ? 7.5 : 1.3, amp = (k === 1 ? 0.34 : 0.16) * (1 - d.P * 0.55);
    G.bob.x = lerp(G.bob.x, duel.x0 * (1 - d.P * 0.7) + Math.sin(duel.tt * f) * amp, Math.min(1, dt * (k === 1 ? 9 : 3)));
    G.bob.z = lerp(duel.z0, 1.7, d.P * 0.92) + (k === 1 ? Math.sin(duel.tt * 11) * 0.05 : 0);
    if (Math.random() < dt * (k === 1 ? 16 : 4)) N().fish.ripple(G.bob.x, G.bob.z, k === 1 ? 1 : 0.5);
    if (k === 1 && Math.random() < dt * 6) N().fish.splash(G.bob.x, G.bob.z, 3);
    if (NW.eventUI) NW.eventUI.duelHud(duel, null);
    if (d.result) finish();
    return { angle: -0.9 + d.T * 0.35, bend: 0.25 + d.T * 0.9 };
  }
  if (NW.eventUI) NW.eventUI.duelHud(duel, null);
  return { angle: -0.8, bend: 0.4 };
}
async function finish() {
  const dl = duel; if (!dl || dl.status !== "play") return; dl.status = "finishing";
  const local = EV.summary(dl.d), pend = { opId: rid(), eventId: dl.eventId, log: dl.log.slice(), name: (N().S.player && N().S.player.name) || (NW.look && NW.look.name && NW.look.name()) || "", at: Date.now(), monster: dl.monster, local: { result: local.result } };
  lsSet(PEND, pend); if (!local.caught) N().sfx(local.result === "snap" ? "snap" : "lose");
  const res = await submit(pend); if (!duel || duel !== dl) return;
  closeDuel(); if (res) showResult(res, pend);
}
async function submit(pend) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await api().eco("ecoEventFinish", { opId: pend.opId, eventId: pend.eventId, log: pend.log, name: pend.name });
      lsSet(PEND, null); applyEco(r.eco); fetchMy(true); return r;
    } catch (e) {
      const c = e && e.code;
      if (c === "failed-precondition" || c === "invalid-argument" || c === "unauthenticated") { lsSet(PEND, null); toast(err(e), "bad"); return null; }
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  toast("Jaringan bermasalah. Hasil duelmu akan dikirim ulang otomatis.", "bad"); return null;
}
function closeDuel() { duel = null; attract = 0; const G = N().fish.G; N().fish.navLock(false); if (G.phase === "event") N().fish.reelBack(); if (NW.eventUI) NW.eventUI.duelHud(null); N().refreshHUD(); }
function showResult(r, pend) {
  const caught = !!r.caught; try { N().sfx(caught ? "catch" : "lose", caught ? "legenda" : undefined); } catch (e) { /* suara opsional */ }
  if (NW.eventUI) NW.eventUI.result(Object.assign({ monster: pend.monster }, r)); emit();
}
// pengiriman ulang hasil duel yang tertunda (jaringan putus / halaman ditutup) — idempotent di server lewat opId
async function retryPending() {
  const p = lsGet(PEND); if (!p || !ecoOn() || duel) return;
  if (Date.now() - p.at > 20 * 60000) { lsSet(PEND, null); return; }
  const r = await submit(p); if (r) { toast("Hasil duel sebelumnya sudah dicatat server.", "good"); showResult(r, p); }
}

const hook = () => {
  if (NW.eventUI) NW.eventUI.hook();
  fetchInfo(); setInterval(() => { if (!document.hidden) tick(); }, 1000);
  setInterval(() => { if (ecoOn()) { retryPending(); if (info && info.on && !my) fetchMy(); } }, 5000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { lastFetch = 0; tick(); } });
  if (NW.cloud && NW.cloud.onChange) NW.cloud.onChange(() => { my = null; myFetch = 0; claimChecked = ""; });
};

NW.event = { Core: EV, hook, drawWater, onWaiting, update,
  info: () => info, status: () => st, my: () => my, duel: () => duel, serverNow, monsterNow, here, why, locName, locIndex, fetchInfo, fetchMy, passAvailable, passGo, passActive, passEnd, onChange: (f) => listeners.push(f),
  ecoOn, sizeAt, active: () => !!duel };
})();
