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
  wasSeated: false, ashore: false, port: null, awayAr: null, snap: null, hideUntil: 0, limbo: 0, steerKey: "", steerAt: 0, note: "", noteAt: 0, spec: 1, pend: 0, evBound: false, lastSig: "",
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
const seated = () => !!mineInfo() && !st.ashore;   // kapten yang turun ke dermaga pelabuhan (visual) berjalan bebas
const BERTH = { x: 13.6, y: 21.95 };                  // tambatan kapal rombongan di Pelabuhan Kota (area "selat"); sama di semua awak
const areaId = () => NW.areas && NW.areas.cur && NW.areas.cur.id;
const inPort = () => areaId() === "selat" && !!mineInfo() && !!mineInfo().boat.away;
function portPose() { const u = Math.min(1, (now() - (st.port ? st.port.t0 : 0)) / 4.5), e = 1 - (1 - u) * (1 - u); return { x: BERTH.x - 7 * (1 - e), y: BERTH.y, d: 0, a: 0, v: (1 - e) * 1.6, docked: u >= 1 }; }
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
function seatPoint(b, s) { const spec = SPECS()[st.spec] || { L: 1.18, B: 0.42 }, v = vis.get(b.id), m = mineInfo(), pp = m && m.id === b.id && inPort() ? portPose() : null; return C.seatTile(pp ? { x: pp.x, y: pp.y, d: 0, a: 0 } : { x: b.x, y: b.y, d: b.d, a: v ? v.a : undefined }, s, spec.L, spec.B); }
function update(dt, v) {
  if (!st.srv) return;
  lastT = dt; const P = NW.world.player, m = mineInfo();
  if (live()) { for (const b of boatsList()) visOf(b, dt); sync(); }
  if (m) {
    st.wasSeated = true; st.limbo = 0; st.snap = { id: m.id, seats: m.boat.seats.slice(), away: m.boat.away, anchor: m.boat.anchor, d: m.boat.d, x: m.boat.x, y: m.boat.y, v: 0 };
    const b = m.boat;
    if (!st.ashore) {
      const p = seatPoint(b, m.seat), ps = st.trk.pose(NW.mp._R.me, now(), p, C.SEAT_Z);
      if (ps) { P.x = ps.x; P.y = ps.y; P.z = undefined; P.dir = C.charDir(inPort() ? 0 : b.d); P.sit = false; P.moving = false; }
      if (m.captain) { syncKm(); if (!(kmOn() && driveKm(b, dt))) drive(v, b); }
    }
  } else if (st.wasSeated) {
    if (mpOn()) { st.wasSeated = false; st.limbo = 0; st.ashore = false; st.awayAr = null; st.snap = null; if (areaId() === "selat") { st.port = null; goArea("muara"); } P.x = C.DISEMBARK.x; P.y = C.DISEMBARK.y; P.dir = 6; P.moving = false; st.hideUntil = now() + C.T.LEAVE; }   // turun: lompat ke dermaga
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
// ---------- UI Kemudi untuk KAPTEN (flag NUSA_KEMUDI; tanpa flag → joystick lama persis seperti sebelumnya) ----------
// Otoritas tetap di server: setir + tuas hanya menghasilkan NIAT {d, th} lewat NW.mp.boatSteer (protokol #132). Klien tidak menentukan posisi/kecepatan.
// Hanya kapten yang melihat dan memakai kontrol ini; penumpang tidak pernah mendapat kontrol dan tidak mengirim steer/anchor.
const KC = () => window.NusaKemudiCore;
const kmOn = () => !!(NW.kemudi && NW.kemudi.on && NW.kemudi.host === "rombongan");
const stoppedBoat = (m) => !!m && m.boat.anchor && m.boat.v < 0.05 && !m.boat.away;
function wantKm() { const m = mineInfo(); return !!NW.kemudi && !!KC() && st.srv && !!m && m.captain && !st.ashore && live() && mpOn() && N().mode() === "world" && !(NW.world && NW.world.cine) && !(NW.boat && NW.boat.on); }
function syncKm() {
  if (!NW.kemudi) return;
  if (wantKm()) { if (!kmOn()) { const m = mineInfo(); st.helm = KC().helmNew(m.boat.d); st.helmBoat = m.id; st.steerKey = m.boat.d + ":0"; NW.kemudi.show(KM_HOST); } }
  else if (NW.kemudi.host === "rombongan") NW.kemudi.hide("rombongan");
}
function driveKm(b, dt) {
  const ks = NW.kemudi.state("rombongan"), k = KC(); if (!ks) return false;
  if (b.away || inPort()) return true;                       // berlayar antar area / berlabuh: tidak ada perintah gerak
  const t = now(); if (!st.helm || st.helmBoat !== b.id) { st.helm = k.helmNew(b.d); st.helmBoat = b.id; st.steerKey = b.d + ":0"; }
  if (b.anchor) {                                            // server menolak steer saat jangkar turun → jangan dikirim
    st.helm.d = b.d; st.helm.acc = 0; st.steerKey = b.d + ":0";
    if ((k.throttleOf(ks.gear) || Math.abs(ks.steer) > k.DEAD) && t - st.noteAt > 2.5) note("⚓ Angkat jangkar dulu untuk berlayar.", "bad");
    return true;
  }
  const turning = Math.abs(ks.steer) > k.DEAD;
  if (!turning && t - st.steerAt > 0.6) st.helm.d = b.d;      // selaras dengan arah server bila setir tidak dipakai
  k.helmTurn(st.helm, ks.steer, dt);
  const th = k.throttleOf(ks.gear), key = st.helm.d + ":" + th;
  if (key === st.steerKey || t - st.steerAt < 0.15) return true;
  st.steerKey = key; st.steerAt = t; NW.mp.boatSteer(st.helm.d, th); return true;
}
const AREA_NAME = { selat: "Pelabuhan Kota", muara: "Muara" };
const KM_HOST = {
  id: "rombongan", ok: () => { const m = mineInfo(); return !!m && m.captain && !st.ashore; },
  view() {
    const m = mineInfo(), b = m.boat, away = !!b.away, port = inPort(), mv = b.v > 0.05, k = KC();
    const cg = NW.delivery && NW.delivery.cargoView ? NW.delivery.cargoView() : null, loaded = !!(cg && cg.boxes && cg.boxes.some((x) => x && x.n > 0));
    const dst = loaded && NW.delivery.dest ? NW.delivery.dest() : null;
    const status = !mpOn() ? "Terputus — kursimu ditahan sebentar…" : port ? "Berlabuh di Pelabuhan Kota" : away ? "Berlayar" + (st.awayAr ? " ke " + (AREA_NAME[st.awayAr] || st.awayAr) : "") + "…" : dst ? null : b.anchor ? "⚓ Berjangkar" : mv ? "Kapal bergerak" : "Jangkar naik · siap berlayar";
    return { knots: k.knotsTile(away || port ? 0 : b.v), head: k.heading(b.d), dest: dst, status, cargo: cg, anchor: b.anchor, canFish: canFish(m), steerOk: !away && !port && mpOn(), reverse: false, neutralOnAnchor: true,
      anchorShow: !port, fishShow: !port, home: { icon: "🪑", label: "Turun", aria: port ? "Turun ke dermaga" : "Turun dari kapal", show: true }, go: { show: port } };
  },
  anchor: () => toggleAnchor(), fish: () => fishNow(), home: () => leave(), go: () => goHome(),
};
function toggleAnchor() { const m = mineInfo(); if (!m || !m.captain || m.boat.away || inPort()) return false; N().sfx("click"); return NW.mp.boatAnchor(!m.boat.anchor) !== false; }
function leave() {
  const m = mineInfo(); if (!m) return false; N().sfx("click");
  if (inPort()) { if (!m.captain || !mpOn()) return false; disembark(NW.port && NW.port.positions ? NW.port.positions.BOARD_SPOT : { x: 13.1, y: 20.45 }); return true; }
  if (!stoppedBoat(m) || !mpOn()) { note("⚓ Jangkar harus turun dan kapal berhenti dulu untuk turun.", "bad"); return false; }
  if (NW.mp.boatLeave() === false) { note("Belum tersambung. Coba lagi.", "bad"); return false; }
  return true;
}
// memancing dari kursi hanya sah saat jangkar turun & kapal berhenti. Bila kapal mulai bergerak/jangkar diangkat saat layar memancing terbuka → ditutup aman (lemparan dibatalkan; hasil ikan tidak pernah dari klien).
function fishGuard() {
  if (!st.srv || N().mode() !== "fish" || N().fishFrom() !== "sea" || (NW.boat && NW.boat.on)) return;
  const m = mineInfo(); if (!m || stoppedBoat(m)) return;
  if (N().fishState().phase === "result") return;            // hasil tangkapan sedang ditampilkan: jangan dipotong
  N().goWorld("rombongan", areaId()); note("⚓ Jangkar diangkat / kapal bergerak — memancing dihentikan.", "bad");
}
// ---------- gambar ----------
function crewDrawer(ctx, t, b, v, pose) {
  return (dz) => {
    const spec = SPECS()[st.spec], items = [], tn = now();
    for (let s = 0; s < 3; s++) {
      const pid = b.seats[s]; if (!pid || (pid === NW.mp._R.me && st.ashore)) continue;
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
  const out = []; if (!NW.boat || !NW.boat.drawVessel) return out;
  if (areaId() === "selat" && (st.snap || mineInfo())) return portLayer(t, view, inView);   // Pelabuhan Kota: kapal & awak dari keadaan server, ditambatkan di BERTH
  if (!live() || !inMuara()) return out;
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
// Pelabuhan Kota: awak kapal (tanpa pengamat lain; server menyembunyikan kapal jauh dari pengamat) melihat kapal, kursi, dan posisi awak yang sama.
function portLayer(t, view, inView) {
  const out = [], m = mineInfo(), b = m ? m.boat : st.snap; if (!b) return out;
  const pp = portPose(), pose = { x: pp.x, y: pp.y, a: 0, d: 0 }, pt = NW.P(pp.x, pp.y); if (inView && !inView(view, pt.x, pt.y, 160)) return out;
  const bb = Object.assign({}, b, { x: pp.x, y: pp.y, d: 0 });
  out.push({ d: pp.x + pp.y + 0.35, fn: (ctx) => NW.boat.drawVessel(ctx, pose, t, { spec: st.spec, style: C.styleFor(b.id), remote: true, v: pp.v, crew: crewDrawer(ctx, t, bb, null, pose), anchored: pp.docked }) });
  for (const g of st.trk.ghosts) {
    const to = { x: st.ghostTo ? st.ghostTo.x : C.DISEMBARK.x, y: st.ghostTo ? st.ghostTo.y : C.DISEMBARK.y, z: groundZ(13, 20.4) }, gp = st.trk.ghostPose(g, now(), to), ch = gp && chOf(g.pid); if (!gp || !ch) continue;
    out.push({ d: gp.x + gp.y + 0.4, fn: (ctx) => { Object.assign(ch, { x: gp.x, y: gp.y, z: gp.z, sit: false, moving: true, dir: 6 }); ch.walk += 0.4; NW.drawCharacter(ctx, ch, t); } });
  }
  return out;
}
// ---------- perpindahan area (kapten memberangkatkan kapal lewat protokol `go`; semua awak ikut) ----------
function goArea(id) { const f = $("fade"); if (f) f.classList.add("on"); setTimeout(() => { try { N().goWorld("rombongan", id); } catch (e) { /* area tak tersedia: tetap di tempat */ } setTimeout(() => f && f.classList.remove("on"), 80); }, 380); }
function disembark(spot) {   // kapten turun ke dermaga pelabuhan (visual saja; protokol: kursi tetap miliknya, server menolak `leave` saat kapal "pergi")
  const m = mineInfo(); if (!m || !m.captain || st.ashore || !inPort()) return false; const P = NW.world.player;
  st.trk.ghosts.push({ pid: NW.mp._R.me, b: m.id, kind: "leave", t0: now(), from: lastPose(NW.mp._R.me) || { x: P.x, y: P.y, z: C.SEAT_Z }, s: 0 }); st.ghostTo = { x: spot.x, y: spot.y };
  st.ashore = true; P.x = spot.x; P.y = spot.y; P.dir = 6; P.moving = false; st.hideUntil = now() + C.T.LEAVE; st.lastSig = ""; N().sfx("boat_naik"); return true;
}
function reboard(spot) {
  const m = mineInfo(); if (!m || !st.ashore) return false; const P = NW.world.player;
  st.trk.seatOf.set(NW.mp._R.me, { b: m.id, s: m.seat, t0: now(), kind: "board", from: { x: P.x, y: P.y, z: groundZ(P.x, P.y) }, fromSeat: -1 }); st.ashore = false; st.lastSig = ""; N().sfx("boat_naik"); return true;
}
function goHome() {
  const m = mineInfo(); if (!m || !m.captain) return false; if (st.ashore) { note("Naik ke kapal dulu sebelum pulang.", "bad"); return false; }
  return NW.mp.boatGo("muara");
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
  r.innerHTML = `<div class="rb-top"><b id="rbRole"></b><span id="rbInfo" aria-live="polite"></span></div><div class="rb-btns"><button type="button" id="rbAnchor" class="hidden">⚓<small>Jangkar</small></button><button type="button" id="rbFish">🎣<small>Pancing</small></button><button type="button" id="rbHome" class="hidden">🏠<small>Pulang</small></button><button type="button" id="rbLeave">🪑<small>Turun</small></button></div>`;
  document.body.appendChild(r); st.root = r;
  const stop = (e) => e.stopPropagation(); r.addEventListener("pointerdown", stop); r.addEventListener("touchstart", stop, { passive: true });
  $("rbAnchor").addEventListener("click", () => { toggleAnchor(); });
  $("rbHome").addEventListener("click", () => { N().sfx("click"); goHome(); });
  $("rbLeave").addEventListener("click", () => { leave(); });
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
  syncKm();
  const m = mineInfo(), show = !!m && !st.ashore && N().mode() === "world" && !(NW.world.cine) && !kmOn(); st.root.classList.toggle("hidden", !show); document.body.classList.toggle("rb-on", !!m);
  if (!show) return;
  const b = m.boat, role = C.SEATS[m.seat].role, away = b.away, sig = [m.seat, b.anchor, b.v > 0.05, away, st.limbo ? 1 : 0, mpOn(), N().coolerFull(), inPort() ? 1 : 0].join();
  if (sig === st.lastSig) return; st.lastSig = sig;
  $("rbRole").textContent = (m.seat === 0 ? "⛵ " : "🪑 ") + role;
  const dep = st.away ? ` ke ${st.away}` : "";
  $("rbInfo").textContent = !mpOn() ? "Terputus — kursimu ditahan sebentar…" : inPort() ? "Berlabuh di Pelabuhan Kota" : away ? `Berlayar${dep}…` : b.v > 0.05 ? "Kapal bergerak" : b.anchor ? "Berjangkar" : m.seat === 0 ? "Geser joystick untuk berlayar" : "Menunggu kapten";
  $("rbAnchor").classList.toggle("hidden", m.seat !== 0); $("rbAnchor").classList.toggle("on", !!b.anchor);
  const stopped = b.anchor && b.v < 0.05 && !away;
  $("rbHome").classList.toggle("hidden", !(inPort() && m.seat === 0));
  $("rbLeave").disabled = inPort() ? !(m.seat === 0 && mpOn()) : !stopped || !mpOn(); $("rbFish").disabled = !stopped || !mpOn() || N().coolerFull();
}
// ---------- peristiwa protokol ----------
function onEv(e) {
  const me = NW.mp._R.me;
  if (e.type === "note") { if (e.r) note(C.reasonText(e.r), "bad"); return; }
  if (e.type === "board" && e.p === me) { const role = C.SEATS[e.s] ? C.SEATS[e.s].role : "Kursi"; note("Kamu duduk di " + role.toLowerCase() + ".", "good"); }
  else if (e.type === "cap" && e.p === me) note("⛵ Kamu sekarang kapten! Jangkar diturunkan.", "good");
  else if (e.type === "depart") { st.away = e.ar || null; const m = mineInfo(); if (m && m.id === e.b) { st.awayAr = e.ar || null; if (e.ar === "selat") { st.port = { t0: now() + 0.5 }; goArea("selat"); } else note("⛵ Berlayar" + (e.ar ? " ke " + e.ar : "") + "…"); } }
  else if (e.type === "arrive") { st.away = null; const m = mineInfo(); if (m && m.id === e.b) { st.awayAr = null; st.ashore = false; if (areaId() === "selat") { st.port = null; goArea("muara"); } else note("⚓ Kapal tiba kembali di Muara.", "good"); } }
  else if (e.type === "sync") { st.trk.clear(); st.chs.clear(); st.last.clear(); st.lastSig = ""; if (!(areaId() === "selat" && st.awayAr)) st.awayAr = null; }
  st.lastSig = "";
}
function bind() { if (st.srv && !st.evBound && NW.mp && NW.mp.onBoat) { st.evBound = true; setInterval(() => { try { syncKm(); fishGuard(); } catch (e) { /* pemantau aman */ } }, 200); NW.mp.onBoat(onEv); NW.mp.setSeatedSkip((id) => live() && boatsList().some((b) => b.seats.indexOf(id) >= 0)); } }
function hook() {
  build();
  const t = setInterval(() => { if (st.gateTried) return clearInterval(t); if (!(window.NusaApi && window.NusaApi.enabled() && NW.cloud && NW.cloud.user)) return; clearInterval(t); gate().then(bind); }, 3000);
}
// memancing dari kursi (hanya jangkar turun & kapal berhenti): posisi laut = posisi kapal server
const fishPos = () => { const m = mineInfo(); return m ? { x: m.boat.x, y: m.boat.y } : null; };
const syncPlayer = () => { const m = mineInfo(); if (m) { const p = seatPoint(m.boat, m.seat), P = NW.world.player; P.x = p.x; P.y = p.y; P.dir = C.charDir(m.boat.d); } };
NW.rombongan = {
  hook, update, layer, candidates, interact, seated, fishPos, syncPlayer, hidesSelf: () => seated() || now() < st.hideUntil || (st.wasSeated && !mpOn()), isFrozen: () => seated(),
  mine: () => { const m = mineInfo(); return m ? { id: m.id, seat: m.seat, captain: m.captain, ashore: st.ashore, away: !!m.boat.away, port: inPort() } : null }, disembark, reboard, goHome,
  go: (ar) => { const m = mineInfo(); return m && m.captain ? NW.mp.boatGo(ar) : false; }, toggleAnchor, leave, fishNow, kemudi: () => kmOn(), _fishGuard: fishGuard,
  state: () => ({ srv: st.srv, live: live(), seated: seated(), seat: seated() ? mineInfo().seat : null, boats: boatsList().map((b) => C.publicBoat(b, nameOf)), away: st.away }),   // bentuk publik: tanpa UID
  _pts: () => boatsList().map((b) => ({ id: b.id, d: b.d, seats: [0, 1, 2].map((q) => seatPoint(b, q)) })), _last: () => [...st.last].map(([k, v]) => [k, v.x, v.y, v.z]),
  _st: st, _gate: gate,
};
})();
