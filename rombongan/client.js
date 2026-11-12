// NUSA ISLAND — Kapal Rombongan (klien: gambar kapal + 3 karakter, kursi, animasi, UI naik/turun/kemudi).
// NUSA_ROMBONGAN HANYA mengontrol apakah modul ini DIUNDUH. Akses = server: gameFlags.kapalRombongan === true DAN welcome realtime bo===1 (NW.mp.boatOn()).
// Kapal & kursi 100% keadaan SERVER (#132, NW.mp.boats()). TIDAK ada kapal/pemain palsu: tanpa protokol → keadaan gagal yang aman (tak ada kontrol).
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), C = window.NusaRombonganCore; if (!C) return;
const $ = (id) => document.getElementById(id), N = () => window.Nusa;
const now = () => performance.now() / 1000;
const LIFT = () => NW.LIFT || 6, GAREA = "muara";
const st = {
  srv: false, gateTried: false, trk: C.tracker(), chs: new Map(), last: new Map(), root: null, key: "", away: null,
  wasSeated: false, hideUntil: 0, limbo: 0, steerKey: "", steerAt: 0, note: "", noteAt: 0, spec: 1, pend: 0, evBound: false, lastSig: "",
};
// ---------- gerbang server (sekali per sesi masuk; gagal/OFF → tersembunyi, TANPA fallback palsu) ----------
const call = (name, body) => (window.NusaApi && window.NusaApi.enabled() ? window.NusaApi.call(name, body || {}, true) : Promise.reject(Object.assign(new Error("offline"), { code: "unavailable" })));
async function gate() {
  if (st.srv || st.gateTried) return; st.gateTried = true;
  try { const r = await call("gameFlags", {}); if (r && r.kapalRombongan === true) st.srv = true; } catch (e) { /* server lama/mati: fitur tetap tersembunyi */ }
}
const mpOn = () => !!(NW.mp && NW.mp.view && NW.mp.view().online);
const live = () => st.srv && !!NW.mp && NW.mp.boatOn();                      // kedua saklar ON + tersambung
const inMuara = () => !!(NW.areas && NW.areas.cur && NW.areas.cur.id === GAREA) && !(NW.home && NW.home.active);
const mineInfo = () => (live() ? NW.mp.boatMine() : null);
const seated = () => !!mineInfo();
const boatsList = () => (live() ? NW.mp.boats() : []);
const lastPose = (pid) => st.last.get(pid) || null;
const present = (pid) => { const m = mineInfo(); if (m && m.boat.seats.indexOf(pid) >= 0 && pid === NW.mp._R.me) return true; return !!(NW.mp.player && NW.mp.player(pid)); };
const SPECS = () => (NW.boat && NW.boat.SPEC) || [];
// ---------- karakter per kursi (gaya publik saja: nama panggilan, pakaian, topi) ----------
function chOf(pid) {
  const me = pid === NW.mp._R.me, P = NW.world.player;
  let c = st.chs.get(pid); if (!c) { c = { x: 0, y: 0, z: 0, dir: 0, walk: 0, moving: false, sit: true, rod: 0, seed: (String(pid).split("").reduce((a, ch2) => (a * 31 + ch2.charCodeAt(0)) % 97, 7)) / 10, hold: null, rodSpec: null, style: null }; st.chs.set(pid, c); }
  if (me) c.style = P.style; else { const p = NW.mp.player(pid); if (!p) return null; c.style = p.ch.style; }
  return c;
}
const nameOf = (pid) => { if (pid === NW.mp._R.me) return NW.look.playerName(); const p = NW.mp.player(pid); return p ? p.name : "Pemancing"; };
function groundZ(x, y) { const T = NW.T || {}; return LIFT() + (NW.tileAt && NW.tileAt(x, y) === T.DOCK ? 4 : 0); }
const fromOf = (pid) => { const me = pid === NW.mp._R.me, q = me ? NW.world.player : (NW.mp.player(pid) || {}).ch; return q ? { x: q.x, y: q.y, z: groundZ(q.x, q.y) } : null; };
// ---------- kapal visual per id (arah dihaluskan; kursi dihitung dari badan kapal yang sama di semua klien) ----------
const vis = new Map();
function visOf(o, dt) {
  let v = vis.get(o.id); const ta = C.angleOf(o.d);
  if (!v) { v = { a: ta }; vis.set(o.id, v); }
  let da = ta - v.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  v.a += da * (1 - Math.exp(-(dt || 0.016) * 6)); return v;
}
let lastT = 0;
function pruneVis(ids) { for (const k of vis.keys()) if (!ids.has(k)) vis.delete(k); }
// ---------- keadaan per frame (dipanggil world.js update) ----------
function sync() {
  const bl = boatsList(); st.trk.sync(now(), bl.filter((b) => !b.away || (mineInfo() && mineInfo().id === b.id)), present, fromOf, lastPose);
  pruneVis(new Set(bl.map((b) => b.id)));
}
function seatPoint(b, s) { const spec = SPECS()[st.spec] || { L: 1.18, B: 0.42 }, v = vis.get(b.id); return C.seatTile({ x: b.x, y: b.y, d: b.d, a: v ? v.a : undefined }, s, spec.L, spec.B); }
function update(dt, v) {
  if (!st.srv) return;
  lastT = dt; const P = NW.world.player, m = mineInfo();
  if (live()) { for (const b of boatsList()) visOf(b, dt); sync(); }
  if (m) {
    st.wasSeated = true; st.limbo = 0;
    const b = m.boat, p = seatPoint(b, m.seat), ps = st.trk.pose(NW.mp._R.me, now(), p, C.SEAT_Z);
    if (ps) { P.x = ps.x; P.y = ps.y; P.z = undefined; P.dir = C.charDir(b.d); P.sit = false; P.moving = false; }
    if (m.captain) drive(v, b);
  } else if (st.wasSeated) {
    if (mpOn()) { st.wasSeated = false; st.limbo = 0; P.x = C.DISEMBARK.x; P.y = C.DISEMBARK.y; P.dir = 6; P.moving = false; st.hideUntil = now() + C.T.LEAVE; }   // turun: lompat ke dermaga
    else { if (!st.limbo) st.limbo = now(); if (now() - st.limbo > 26) { st.wasSeated = false; st.limbo = 0; P.x = C.DISEMBARK.x; P.y = C.DISEMBARK.y; st.trk.clear(); } }
  }
  if (!live() && st.trk.seatOf.size) st.trk.clear();
  hud();
}
// kapten: joystick → niat kemudi. Server menegakkan semua aturan (jangkar, batas jalur air, kecepatan).
function drive(v, b) {
  if (b.away) return;
  const s = C.steerFrom(v), key = s.th ? s.d + ":" + s.th : "0", t = now();
  if (b.anchor) { if (s.th && t - st.noteAt > 2.5) { note("⚓ Angkat jangkar dulu untuk berlayar.", "bad"); } st.steerKey = "0"; return; }
  if (key === st.steerKey || t - st.steerAt < 0.15) return;
  st.steerKey = key; st.steerAt = t;
  NW.mp.boatSteer(s.th ? s.d : b.d, s.th);
}
function note(text, kind) { st.noteAt = now(); N().toast(text, kind || ""); }
// ---------- gambar ----------
function crewDrawer(ctx, t, b, v, pose) {
  return (dz) => {
    const spec = SPECS()[st.spec], items = [], tn = now();
    for (let s = 0; s < 3; s++) {
      const pid = b.seats[s]; if (!pid) continue;
      const u = C.SEATS[s].u, p = C.seatTile(pose, s, spec.L, spec.B), z = C.SEAT_Z + dz(u, 0), ps = st.trk.pose(pid, tn, p, z);
      if (!ps) continue;
      if (st.trk.isHeld(b.id, s) && pid !== NW.mp._R.me && !NW.mp.player(pid)) { items.push({ d: p.x + p.y, held: { x: p.x, y: p.y, z } }); continue; }
      const ch = chOf(pid); if (!ch) { items.push({ d: p.x + p.y, held: { x: p.x, y: p.y, z } }); continue; }
      items.push({ d: ps.x + ps.y + 0.01 * s, pid, ps, ch, b, s });
    }
    items.sort((a, c) => a.d - c.d);
    for (const it of items) {
      if (it.held) { drawHeld(ctx, it.held, t); continue; }
      const { ch, ps, pid } = it;
      ch.x = ps.x; ch.y = ps.y; ch.z = ps.z; ch.dir = C.charDir(b.d); ch.sit = ps.mode === "sit" || ps.mode === "return" || ps.mode === "swap"; ch.moving = ps.mode === "board"; if (ch.moving) ch.walk += 0.4;
      st.last.set(pid, { x: ps.x, y: ps.y, z: ps.z });
      if (ps.alpha != null) ctx.globalAlpha = Math.max(0.2, ps.alpha);
      NW.drawCharacter(ctx, ch, t); ctx.globalAlpha = 1;
      const zoom = 1.0 / (NW.world.zoom || 1), q = NW.P(ps.x, ps.y, ps.z - 6);
      if (pid === NW.mp._R.me) NW.look.drawLabel(ctx, { name: NW.look.playerName(), title: NW.look.currentTitle() }, q.x, q.y, zoom, it.s * 13);
      else { const rp = NW.mp.player(pid); if (rp) NW.look.drawLabel(ctx, { name: rp.name, title: rp.owner ? "🏠 Pemilik" : (NW.look.titleName ? NW.look.titleName(rp.rank) : null) }, q.x, q.y, zoom, it.s * 13); }
    }
  };
}
function drawHeld(ctx, h, t) {   // kursi tertahan 20 dtk untuk pemain yang putus: bayangan + jam pasir (tanpa data pemain)
  const q = NW.P(h.x, h.y, h.z); ctx.save(); ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 3); ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("⏳", q.x, q.y - 20); ctx.restore();
}
function layer(t, view, inView) {
  const out = []; if (!live() || !inMuara() || !NW.boat || !NW.boat.drawVessel) return out;
  const mi = mineInfo();
  for (const b of boatsList()) {
    const away = !!b.away; if (away && !(mi && mi.id === b.id)) continue;
    const v = visOf(b, lastT), pose = { x: b.x, y: b.y, a: v.a, d: b.d }, pt = NW.P(b.x, b.y);
    if (inView && !inView(view, pt.x, pt.y, 140)) continue;
    const sty = C.styleFor(b.id);
    out.push({ d: b.x + b.y + 0.35, fn: (ctx) => {
      ctx.save(); if (away) ctx.globalAlpha = 0.5;
      NW.boat.drawVessel(ctx, pose, t, { spec: st.spec, style: sty, remote: true, v: b.v, crew: crewDrawer(ctx, t, b, v, pose), anchored: !!b.anchor });
      ctx.restore();
    } });
  }
  // yang baru turun: animasi lompat ke dermaga (pelaku lokal maupun jarak jauh)
  for (const g of st.trk.ghosts) {
    const to = { x: C.DISEMBARK.x + (g.s - 1) * 0.5, y: C.DISEMBARK.y, z: groundZ(C.DISEMBARK.x, C.DISEMBARK.y) }, gp = st.trk.ghostPose(g, now(), to), ch = gp && chOf(g.pid); if (!gp || !ch) continue;
    out.push({ d: gp.x + gp.y + 0.4, fn: (ctx) => { Object.assign(ch, { x: gp.x, y: gp.y, z: gp.z, sit: false, moving: true, dir: 6 }); ch.walk += 0.4; NW.drawCharacter(ctx, ch, t); } });
  }
  return out;
}
// ---------- titik interaksi (naik / buat kapal / keadaan gagal) ----------
const DOCK_POINT = { x: 37.2, y: 21.3 };
function candidates(player) {
  const out = []; if (!st.srv || !inMuara() || seated() || (NW.boat && NW.boat.on)) return out;
  if (!live()) {   // keadaan gagal aman: server menyala tetapi realtime belum siap → hanya penjelasan, tanpa kapal/kursi palsu
    if (Math.hypot(player.x - DOCK_POINT.x, player.y - DOCK_POINT.y) < 5) out.push({ id: "rb:fail", x: DOCK_POINT.x, y: DOCK_POINT.y, r: 3, icon: "⛵", label: "Kapal Rombongan", rb: { k: "fail" }, bz: 40 });
    return out;
  }
  const bl = boatsList().filter((b) => !b.away);
  for (const b of bl) for (const s of [1, 2]) {
    if (!C.seatFree(b, s) || !C.boardable(b)) continue;
    const p = seatPoint(b, s); if (Math.hypot(player.x - p.x, player.y - p.y) > 6) continue;
    out.push({ id: "rb:" + b.id + ":" + s, x: p.x, y: p.y, r: 2.7, icon: "🪑", label: "Duduk: " + C.SEATS[s].role, rb: { k: "join", b: b.id, s }, bz: 34, pri: 0.6 });
  }
  if (!out.length && bl.length < 5 && Math.hypot(player.x - DOCK_POINT.x, player.y - DOCK_POINT.y) < 4.2) out.push(   // ada kursi kosong di dekatmu → tawarkan duduk, bukan kapal baru
   { id: "rb:new", x: DOCK_POINT.x, y: DOCK_POINT.y, r: 2.0, icon: "⛵", label: "Buat Kapal Rombongan", rb: { k: "new" }, bz: 40 });
  return out;
}
function interact(t) {
  const k = t.rb && t.rb.k;
  if (k === "fail") return NW.world.openDialog({ name: "Kapal Rombongan", avatar: "⛵", lines: [failText()] });
  if (!live()) return note(failText(), "bad");
  if (NW.hold) NW.hold.stop("travel");
  N().sfx("click");
  const ok = k === "new" ? NW.mp.boatNew() : k === "join" ? NW.mp.boatJoin(t.rb.b, t.rb.s) : false;
  if (ok === false) note("Kapal Rombongan belum tersambung. Coba lagi sebentar lagi.", "bad");
}
function failText() { return mpOn() ? "Kapal Rombongan belum bisa dipakai sekarang. Coba lagi nanti." : "Kapal Rombongan butuh koneksi Dunia Bersama. Sambungkan dulu (tombol 👥), lalu coba lagi."; }
// ---------- UI kecil: peran, aksi (jangkar / pancing / turun) ----------
function build() {
  if (st.root) return;
  const r = document.createElement("div"); r.id = "rbHud"; r.className = "rb-hud hidden"; r.setAttribute("role", "group"); r.setAttribute("aria-label", "Kapal Rombongan");
  r.innerHTML = `<div class="rb-top"><b id="rbRole"></b><span id="rbInfo" aria-live="polite"></span></div><div class="rb-btns"><button type="button" id="rbAnchor" class="hidden">⚓<small>Jangkar</small></button><button type="button" id="rbFish">🎣<small>Pancing</small></button><button type="button" id="rbLeave">🪑<small>Turun</small></button></div>`;
  document.body.appendChild(r); st.root = r;
  const stop = (e) => e.stopPropagation(); r.addEventListener("pointerdown", stop); r.addEventListener("touchstart", stop, { passive: true });
  $("rbAnchor").addEventListener("click", () => { const m = mineInfo(); if (m && m.captain) { N().sfx("click"); NW.mp.boatAnchor(!m.boat.anchor); } });
  $("rbLeave").addEventListener("click", () => { const m = mineInfo(); if (!m) return; N().sfx("click"); if (NW.mp.boatLeave() === false) note("Belum tersambung. Coba lagi.", "bad"); });
  $("rbFish").addEventListener("click", fishNow);
}
function canFish(m) { return !!m && m.boat.anchor && m.boat.v < 0.05 && !m.boat.away && N().mode() === "world"; }
function fishNow() {
  const m = mineInfo(); if (!canFish(m)) return note(m && !m.boat.anchor ? "⚓ Jangkar harus turun dulu supaya bisa memancing." : "Tunggu kapal berhenti dulu…", "bad");
  if (N().coolerFull()) return NW.world.openDialog({ name: "Coolbox penuh", avatar: "🧊", lines: ["Coolbox-mu penuh. Jual dulu tangkapanmu di pasar."] });
  N().sfx("click"); $("fade").classList.add("on");
  setTimeout(() => { if (mineInfo()) { N().enterFishing("sea"); } setTimeout(() => $("fade").classList.remove("on"), 60); }, 320);
}
function hud() {
  if (!st.root) build();
  const m = mineInfo(), show = !!m && N().mode() === "world" && !(NW.world.cine); st.root.classList.toggle("hidden", !show); document.body.classList.toggle("rb-on", !!m);
  if (!show) return;
  const b = m.boat, role = C.SEATS[m.seat].role, away = b.away, sig = [m.seat, b.anchor, b.v > 0.05, away, st.limbo ? 1 : 0, mpOn(), N().coolerFull()].join();
  if (sig === st.lastSig) return; st.lastSig = sig;
  $("rbRole").textContent = (m.seat === 0 ? "⛵ " : "🪑 ") + role;
  const dep = st.away ? ` ke ${st.away}` : "";
  $("rbInfo").textContent = !mpOn() ? "Terputus — kursimu ditahan sebentar…" : away ? `Berlayar${dep}…` : b.v > 0.05 ? "Kapal bergerak" : b.anchor ? "Berjangkar" : m.seat === 0 ? "Geser joystick untuk berlayar" : "Menunggu kapten";
  $("rbAnchor").classList.toggle("hidden", m.seat !== 0); $("rbAnchor").classList.toggle("on", !!b.anchor);
  const stopped = b.anchor && b.v < 0.05 && !away;
  $("rbLeave").disabled = !stopped || !mpOn(); $("rbFish").disabled = !stopped || !mpOn() || N().coolerFull();
}
// ---------- peristiwa protokol ----------
function onEv(e) {
  const me = NW.mp._R.me;
  if (e.type === "note") { if (e.r) note(C.reasonText(e.r), "bad"); return; }
  if (e.type === "board" && e.p === me) { const role = C.SEATS[e.s] ? C.SEATS[e.s].role : "Kursi"; note("Kamu duduk di " + role.toLowerCase() + ".", "good"); }
  else if (e.type === "cap" && e.p === me) note("⛵ Kamu sekarang kapten! Jangkar diturunkan.", "good");
  else if (e.type === "depart") { st.away = e.ar || null; if (mineInfo() && mineInfo().id === e.b) note("⛵ Berlayar" + (e.ar ? " ke " + e.ar : "") + "…"); }
  else if (e.type === "arrive") { st.away = null; if (mineInfo() && mineInfo().id === e.b) note("⚓ Kapal tiba kembali di Muara.", "good"); }
  else if (e.type === "sync") { st.trk.clear(); st.chs.clear(); st.last.clear(); st.lastSig = ""; }
  st.lastSig = "";
}
function bind() { if (st.srv && !st.evBound && NW.mp && NW.mp.onBoat) { st.evBound = true; NW.mp.onBoat(onEv); NW.mp.setSeatedSkip((id) => live() && boatsList().some((b) => b.seats.indexOf(id) >= 0)); } }
function hook() {
  build();
  const t = setInterval(() => { if (st.gateTried) return clearInterval(t); if (!(window.NusaApi && window.NusaApi.enabled() && NW.cloud && NW.cloud.user)) return; clearInterval(t); gate().then(bind); }, 3000);
}
// memancing dari kursi (hanya jangkar turun & kapal berhenti): posisi laut = posisi kapal server
const fishPos = () => { const m = mineInfo(); return m ? { x: m.boat.x, y: m.boat.y } : null; };
const syncPlayer = () => { const m = mineInfo(); if (m) { const p = seatPoint(m.boat, m.seat), P = NW.world.player; P.x = p.x; P.y = p.y; P.dir = C.charDir(m.boat.d); } };
NW.rombongan = {
  hook, update, layer, candidates, interact, seated, fishPos, syncPlayer, hidesSelf: () => seated() || now() < st.hideUntil || (st.wasSeated && !mpOn()), isFrozen: () => seated(),
  go: (ar) => { const m = mineInfo(); return m && m.captain ? NW.mp.boatGo(ar) : false; },
  state: () => ({ srv: st.srv, live: live(), seated: seated(), seat: seated() ? mineInfo().seat : null, boats: boatsList().map((b) => C.publicBoat(b, nameOf)), away: st.away }),   // bentuk publik: tanpa UID
  _pts: () => boatsList().map((b) => ({ id: b.id, d: b.d, seats: [0, 1, 2].map((q) => seatPoint(b, q)) })), _last: () => [...st.last].map(([k, v]) => [k, v.x, v.y, v.z]),
  _st: st, _gate: gate,
};
})();
