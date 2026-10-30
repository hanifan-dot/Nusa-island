// =========================================================
//  NUSA ISLAND — Bumbu 2.4 "Samudra Nusantara": KAPAL YANG BISA DIKEMUDIKAN (NW.boat)
//  • Naik / turun kapal di titik sandar (dermaga & pantai yang disediakan)
//  • Kemudi joystick: ATAS maju · BAWAH mundur/mengerem · KIRI/KANAN membelok
//    (akselerasi & pengereman halus, belok lebih tajam saat melaju, tidak licin)
//  • Jangkar, Memancing (sistem mancing lama), Peta Laut, Ke Dermaga (pemulihan)
//  • Collision dengan daratan & batu, batas eksplorasi, pindah area lewat tepi laut
//  • Kapal kayu 2.5D digambar per frame dari bentuk lambung (bukan gambar jadi)
//  Data tersimpan di S.sea (berversi). Tidak ada server; struktur siap dipindah ke akun nanti.
// =========================================================
window.NW = window.NW || {};
(() => {
"use strict";
const N = () => window.Nusa, S = () => N().S;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const { P, LIFT, mix, shade, poly } = NW;
const HW = NW.TW / 2, HH = NW.TH / 2;
const A = () => NW.areas.cur;
const SEA_V = 1;

// ---------- Kapal per tingkat (UPGRADES.boat, data lama: harga & syarat tidak berubah) ----------
// vmax dalam piksel layar/detik (jalan kaki = 180). Badan: L = setengah panjang, B = setengah lebar (tile).
const SPEC = [
  { hull: "#7a5230", trim: "#e0b84c", inner: "#a8743f", vmax: 205, acc: 120, turn: 1.6, L: 1.12, B: 0.40, canopy: false },
  { hull: "#2f7a8c", trim: "#f0d58a", inner: "#b07c48", vmax: 225, acc: 132, turn: 1.6, L: 1.18, B: 0.42, canopy: false },
  { hull: "#c9553b", trim: "#f3e7c9", inner: "#b07c48", vmax: 245, acc: 142, turn: 1.55, L: 1.26, B: 0.45, canopy: true },
  { hull: "#e9e4d8", trim: "#d14a3a", inner: "#b8875a", vmax: 268, acc: 156, turn: 1.55, L: 1.3, B: 0.46, canopy: true },
  { hull: "#1f3f5a", trim: "#e0b84c", inner: "#b8875a", vmax: 290, acc: 168, turn: 1.5, L: 1.36, B: 0.48, canopy: true },
];
const lv = () => clamp(N().upLvl("boat") | 0, 0, 4);
const spec = () => SPEC[lv()];

// ---------- Geometri ----------
const s2w = (dx, dy) => ({ x: (dx / HW + dy / HH) / 2, y: (dy / HH - dx / HW) / 2 }); // layar → tile
function fwd(a) { const d = s2w(Math.cos(a), Math.sin(a)), k = Math.hypot(d.x, d.y) || 1; return { x: d.x / k, y: d.y / k }; }
const angT = (tx, ty) => Math.atan2((tx + ty) * HH, (tx - ty) * HW);
const dir8 = (a) => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
// titik lambung (u: -1 buritan … +1 haluan, v: -1 kiri … +1 kanan); buritan datar untuk mesin tempel
const RING = [[1, 0], [0.84, 0.42], [0.55, 0.82], [0.12, 1], [-0.45, 1], [-0.86, 0.9], [-1, 0.62], [-1, -0.62], [-0.86, -0.9], [-0.45, -1], [0.12, -1], [0.55, -0.82], [0.84, -0.42]];
const PROBES = [[1.02, 0], [0.62, 0.86], [0.62, -0.86], [0, 1.02], [0, -1.02], [-0.6, 1], [-0.6, -1], [-1.02, 0.7], [-1.02, -0.7]];
const toW = (x, y, f, u, v, L, Bm) => ({ x: x + f.x * u * L - f.y * v * Bm, y: y + f.y * u * L + f.x * v * Bm });

// ---------- Keadaan ----------
const B = {
  on: false, area: "muara", moor: "dermaga", x: 0, y: 0, a: 0, v: 0, steer: 0, anchor: true,
  busy: null, wake: [], ripT: 0, foamT: 0, bumpT: 0, toastT: 0, stuckT: 0, saveT: 0, seenT: 0, zoom: 1, seat: { x: 0, y: 0 },
};
const seaOf = (ar) => (ar && ar.sea) || null;
const moorsOf = (ar) => (seaOf(ar) ? seaOf(ar).moors : []);
const mainMoor = (ar) => moorsOf(ar).find((m) => m.main) || moorsOf(ar)[0] || null;
const moorById = (ar, id) => moorsOf(ar).find((m) => m.id === id) || null;

// ---------- Simpanan (S.sea, berversi; hanya mengisi yang kosong) ----------
function defaults() { return { v: SEA_V, on: false, area: "muara", moor: "dermaga", x: null, y: null, a: 0, anchor: true, seen: "", tut: 0 }; }
function migrate(s) {
  const d = defaults();
  if (!s.sea || typeof s.sea !== "object" || Array.isArray(s.sea)) s.sea = d;
  for (const k of Object.keys(d)) if (s.sea[k] === undefined || s.sea[k] === null && d[k] !== null) s.sea[k] = d[k];
  const q = s.sea;
  if (typeof q.area !== "string" || !NW.areas.get(q.area)) q.area = "muara";
  if (typeof q.seen !== "string") q.seen = "";
  q.on = q.on === true; q.anchor = q.anchor !== false;
  if (![q.x, q.y, q.a].every((n) => n === null || Number.isFinite(n))) { q.x = q.y = null; q.a = 0; q.on = false; }
  // area laut lepas tanpa kapal → mulai aman di dermaga terdekat (tidak pernah muncul di laut tanpa kapal)
  const adv = s.adv, cur = adv && NW.areas.get(adv.area);
  if (cur && cur.seaOnly && !(q.on && q.area === cur.id && Number.isFinite(q.x))) { adv.area = (Number.isFinite(q.x) && q.x > 40) ? "selat" : "muara"; q.on = false; q.area = adv.area; q.moor = "dermaga"; }
  if (q.on && adv && q.area !== adv.area) q.on = false;
  if (NW.mystic) NW.mystic.migrate(s); // Bumbu 2.4.1: perlindungan sial ikan mistis (nilai awal 0; data rusak dibersihkan)
  q.v = SEA_V;
  return q;
}
function persist() {
  const q = S().sea; if (!q) return;
  Object.assign(q, { on: B.on, area: B.area, moor: B.on ? null : B.moor, x: +B.x.toFixed(3), y: +B.y.toFixed(3), a: +B.a.toFixed(4), anchor: B.anchor });
}

// ---------- Collision ----------
function sailableAt(ar, x, y, extra = 0) {
  const t = ar.map.tileAt(Math.floor(x), Math.floor(y));
  if (NW.isLandT(t)) return false;
  const sea = seaOf(ar); if (!sea) return false;
  for (const o of sea.obstacles) if (Math.hypot(x - o.x, y - o.y) < o.r + extra) return false;
  return true;
}
function hullFits(ar, x, y, a) {
  const f = fwd(a), sp = spec();
  for (const [u, v] of PROBES) { const p = toW(x, y, f, u, v, sp.L, sp.B); if (!sailableAt(ar, p.x, p.y)) return false; }
  return true;
}

// ---------- Naik / turun ----------
function moorPose(m) { return { x: m.x, y: m.y, a: m.a }; }
function boardable(player) { // dipanggil saat pemain berjalan kaki
  if (B.on || B.busy) return null;
  const ar = A(); if (!seaOf(ar) || B.area !== ar.id) return null;
  const m = moorById(ar, B.moor); if (!m) return null;
  return Math.hypot(player.x - m.board.x, player.y - m.board.y) < m.board.r ? m : null;
}
function landCandidates(player) {
  const m = boardable(player); if (!m) return [];
  return [{ id: "boat", x: m.board.x, y: m.board.y, r: m.board.r, icon: "⛵", label: "Naik Kapal", boat: "board", bz: 40 }];
}
function board() {
  const ar = A(), m = moorById(ar, B.moor); if (!m || B.on) return false;
  if (NW.hold) NW.hold.stop("travel");
  NW.world.standUp && NW.world.standUp(true);
  Object.assign(B, { on: true, x: m.x, y: m.y, a: m.a, v: 0, steer: 0, anchor: false, moor: null, area: ar.id, stuckT: 0 });
  syncPlayer(); persist(); N().save();
  N().sfx("boat_naik");
  const q = S().sea;
  if (!q.tut) { q.tut = 1; N().toast("⛵ Joystick ATAS = maju · BAWAH = mundur · KIRI/KANAN = belok", "good"); }
  else N().toast(`⛵ Naik ${UPGRADES.boat.levels[lv()]}`, "good");
  showUI(); NW.world.updateHint();
  return true;
}
function nearMoor() { // titik sandar terdekat yang cukup dekat & kapal cukup pelan
  if (!B.on || B.busy) return null;
  const ar = A();
  for (const m of moorsOf(ar)) if (Math.hypot(B.x - m.x, B.y - m.y) < m.r) { if (Math.abs(B.v) < 70) return m; toastOnce(`Pelankan kapal untuk bersandar di ${m.name} ⚓`, "", 4); }
  return null;
}
function seaCandidates() {
  const m = nearMoor(); if (!m) return [];
  return [{ id: "boat:land", x: B.x, y: B.y, r: 9, icon: "⚓", label: "Turun Kapal", boat: "land", moor: m.id, bz: 46 }];
}
function startDock(m) {
  const to = moorPose(m);
  // berputar lewat sudut terpendek supaya mulus
  to.a = B.a + wrapA(to.a - B.a);
  B.busy = { kind: "dock", t: 0, dur: 0.75, from: { x: B.x, y: B.y, a: B.a }, to, m };
  B.v = 0; N().sfx("boat_jangkar");
}
function finishDock(m) {
  const ar = A();
  Object.assign(B, { on: false, x: m.x, y: m.y, a: m.a, v: 0, anchor: true, moor: m.id, area: ar.id, busy: null });
  const p = NW.world.player; p.x = m.land.x; p.y = m.land.y; p.dir = m.land.dir; p.sit = false; p.moving = false;
  if (!NW.walkable(p.x, p.y)) { const sp = ar.spawns || {}; const s0 = sp.boat || sp.start || ar.map.START; p.x = s0.x; p.y = s0.y; }
  persist(); N().save(); hideUI();
  N().toast(`⚓ Kapal ditambat di ${m.name}`, "good"); NW.world.updateHint();
}
function interact(t) {
  if (t.boat === "board") return board();
  if (t.boat === "land") { const m = nearMoor(); if (m) startDock(m); return true; }
  return false;
}

// ---------- Kemudi ----------
const toastAt = {};
function toastOnce(msg, kind, gap = 3.5) { const now = performance.now() / 1000, k = msg.slice(0, 18); if (now - (toastAt[k] || -99) < gap) return; toastAt[k] = now; N().toast(msg, kind); } // pesan sama tidak berulang-ulang; pesan berbeda tetap tampil
function update(dt, inp) {
  if (!B.on) { stepWake(dt); return; }
  const ar = A(), sea = seaOf(ar), sp = spec();
  if (B.busy) { stepBusy(dt); if (B.on) syncPlayer(); stepWake(dt); return; }
  let thr = -inp.y, steer = inp.x;
  if (Math.abs(thr) < 0.12) thr = 0; if (Math.abs(steer) < 0.12) steer = 0;
  if (B.anchor) { if (thr || steer) toastOnce("⚓ Jangkar terpasang. Tekan ⛵ Angkat Jangkar untuk berlayar lagi."); thr = 0; steer = 0; }
  // kecepatan: akselerasi & rem halus
  if (thr > 0) { const want = sp.vmax * thr; B.v = B.v < 0 ? Math.min(want, B.v + 260 * dt) : B.v < want ? Math.min(want, B.v + sp.acc * dt) : Math.max(want, B.v - 90 * dt); }
  else if (thr < 0) { if (B.v > 4) B.v = Math.max(0, B.v - 230 * -thr * dt); else B.v = Math.max(-80 * -thr, B.v - 70 * -thr * dt); }
  else { B.v *= Math.exp(-(B.anchor ? 3.2 : 1.35) * dt); if (Math.abs(B.v) < 2) B.v = 0; } // meluncur pendek lalu berhenti (tidak licin)
  // kemudi: belok lebih tajam saat melaju; tetap bisa berputar pelan saat diam
  B.steer = lerp(B.steer, steer, Math.min(1, dt * 7));
  const rate = sp.turn * (0.4 + 0.6 * Math.min(1, Math.abs(B.v) / 110)), na = wrapA(B.a + B.steer * rate * dt);
  if (B.steer && hullFits(ar, B.x, B.y, na)) B.a = na;
  // gerak (arah di layar → tile)
  if (B.v) {
    const d = s2w(Math.cos(B.a) * B.v * dt, Math.sin(B.a) * B.v * dt), nx = B.x + d.x, ny = B.y + d.y;
    if (hullFits(ar, nx, ny, B.a)) { B.x = nx; B.y = ny; B.stuckT = 0; }
    else if (hullFits(ar, nx, B.y, B.a)) { B.x = nx; B.v *= 0.94; }
    else if (hullFits(ar, B.x, ny, B.a)) { B.y = ny; B.v *= 0.94; }
    else { // menabrak daratan/batu: berhenti dengan pantulan kecil, tanpa kerusakan
      if (Math.abs(B.v) > 60 && performance.now() - B.bumpT > 600) { B.bumpT = performance.now(); N().sfx("boat_bentur"); if (navigator.vibrate) try { navigator.vibrate(25); } catch (_) {} }
      B.v = -B.v * 0.22;
    }
  }
  // terjebak? (mendorong tapi tidak bergerak)
  if (thr && Math.abs(B.v) < 8) { B.stuckT += dt; if (B.stuckT > 3) { B.stuckT = -6; toastOnce("Tersangkut? Mundur pelan-pelan, atau tekan 🛟 Ke Dermaga.", "", 6); pulse("seaHome"); } }
  // jalan keluar & batas eksplorasi
  for (const e of sea.exits) {
    const out = e.side === "e" ? B.x > e.at : e.side === "w" ? B.x < e.at : false;
    if (!out) continue;
    if (e.need && !e.need()) { B.x = e.side === "e" ? e.at - 0.05 : e.at + 0.05; B.v = Math.min(B.v, 0) * 0.3; toastOnce(e.lockMsg ? e.lockMsg() : "🔒 Belum bisa ke sana.", "bad", 4); }
    else { startTransit(e); break; }
  }
  const b = sea.bounds;
  if (!B.busy && (B.x < b.x0 || B.x > b.x1 || B.y < b.y0 || B.y > b.y1)) {
    B.x = clamp(B.x, b.x0, b.x1); B.y = clamp(B.y, b.y0, b.y1); B.v *= 0.5;
    toastOnce("🌊 Batas pelayaran. Ombak di luar sana terlalu jauh untuk kapal kecil.", "", 5);
  }
  syncPlayer(); stepWake(dt);
  B.saveT += dt; if (B.saveT > 1) { B.saveT = 0; persist(); }
  B.seenT += dt; if (B.seenT > 0.5) { B.seenT = 0; markSeen(); }
  refreshUI();
}
function syncPlayer() {
  const p = NW.world.player, f = fwd(B.a), sp = spec(), s = toW(B.x, B.y, f, -0.6, 0, sp.L, sp.B);
  B.seat = s; p.x = s.x; p.y = s.y; p.dir = dir8(B.a); p.moving = false; p.sit = true;
}
// mengarahkan kapal & kamera (dipakai uji, pemulihan, perpindahan area)
function setPose(x, y, a) { B.x = x; B.y = y; B.a = a; syncPlayer(); }

// ---------- Jangkar ----------
function toggleAnchor() {
  if (!B.on || B.busy) return;
  B.anchor = !B.anchor;
  if (B.anchor) { N().sfx("boat_jangkar"); N().toast("⚓ Jangkar diturunkan. Tombol 🎣 Memancing menyala.", "good"); }
  else { N().sfx("boat_angkat"); N().toast("⛵ Jangkar diangkat. Siap berlayar."); }
  persist(); refreshUI(true); NW.world.updateHint();
}
const canFish = () => B.on && B.anchor && Math.abs(B.v) < 12 && !B.busy;
function fish() {
  if (!B.on || B.busy) return false;
  if (!B.anchor) { toastOnce("⚓ Pasang jangkar dulu supaya kapal tidak hanyut.", "bad", 1.5); pulse("seaAnchor"); return false; }
  if (Math.abs(B.v) >= 12) { toastOnce("Tunggu kapal berhenti dulu…", "", 1.5); return false; }
  if (N().coolerFull()) { NW.world.openDialog({ name: "Coolbox penuh", avatar: "🧊", lines: [A().hooks.fullMsg || "Coolbox-mu penuh. Jual dulu tangkapanmu di pasar."] }); return false; }
  B.busy = { kind: "fish", t: 0 }; N().sfx("click");
  return true;
}

// ---------- Pemulihan: kembali ke dermaga terdekat ----------
function rescueTarget() { // dermaga utama di area ini; di laut lepas: dermaga terdekat (jarak di peta laut)
  const ar = A(); if (mainMoor(ar)) return { area: ar, moor: mainMoor(ar) };
  const here = NW.sea.toChart(ar.id, B.on ? B.x : NW.world.player.x, B.on ? B.y : NW.world.player.y); let best = null, bd = 1e9;
  for (const id of NW.sea.CHART_AREAS) { const a2 = NW.areas.get(id), m = mainMoor(a2); if (!m) continue; const c = NW.sea.toChart(id, m.x, m.y), d = Math.hypot(c.x - here.x, c.y - here.y); if (d < bd) { bd = d; best = { area: a2, moor: m }; } }
  return best || { area: NW.areas.get("muara"), moor: mainMoor(NW.areas.get("muara")) };
}
function rescue() {
  if (!B.on || B.busy) return false;
  const t = rescueTarget(); if (!t.moor) return false;
  B.busy = { kind: "rescue", t: 0, target: t }; B.v = 0;
  $("fade").classList.add("on");
  return true;
}

// ---------- Pindah area lewat tepi laut ----------
function startTransit(e) {
  const pos = e.map(B.x, B.y), to = NW.areas.get(e.to);
  B.busy = { kind: "transit", t: 0, to, pos, a: B.a, v: B.v, name: e.name };
  $("fade").classList.add("on");
}
function switchTo(ar, x, y, a) {
  B.area = ar.id; B.x = x; B.y = y; B.a = a; syncPlayer();
  NW.world.onEnter("sail", ar.id); // ganti peta, NPC, terrain; kapal tetap dikemudikan
  persist(); N().save();
}
function stepBusy(dt) {
  const k = B.busy; k.t += dt;
  if (k.kind === "dock") {
    const u = clamp(k.t / k.dur, 0, 1), e = u * u * (3 - 2 * u);
    B.x = lerp(k.from.x, k.to.x, e); B.y = lerp(k.from.y, k.to.y, e); B.a = lerp(k.from.a, k.to.a, e);
    if (u >= 1) finishDock(k.m);
  } else if (k.kind === "transit") {
    if (k.t > 0.32 && !k.done) {
      k.done = true;
      if (!hullFits(k.to, k.pos.x, k.pos.y, k.a)) { const m = mainMoor(k.to); if (m) { k.pos = { x: m.x, y: m.y }; k.a = m.a; } }
      switchTo(k.to, k.pos.x, k.pos.y, k.a); B.v = k.v * 0.8;
      setTimeout(() => $("fade").classList.remove("on"), 60);
    }
    if (k.t > 0.6) B.busy = null;
  } else if (k.kind === "rescue") {
    if (k.t > 0.35 && !k.done) {
      k.done = true; const m = k.target.moor;
      if (k.target.area !== A()) switchTo(k.target.area, m.x, m.y, m.a); else setPose(m.x, m.y, m.a);
      B.v = 0; B.anchor = true; persist(); N().save();
      setTimeout(() => $("fade").classList.remove("on"), 60);
      N().toast(`🛟 Kapal ditarik dengan aman ke ${m.name}. Ikan & progres tetap utuh.`, "good");
    }
    if (k.t > 0.7) { B.busy = null; refreshUI(true); }
  } else if (k.kind === "fish") {
    if (k.t > 0.05 && !k.faded) { k.faded = true; $("fade").classList.add("on"); }
    if (k.t > 0.38 && !k.done) {
      k.done = true; persist();
      N().enterFishing("sea");
      setTimeout(() => $("fade").classList.remove("on"), 60);
      B.busy = null;
    }
  }
}
// dipanggil saat kembali dari mode mancing / memuat ulang di atas kapal
function resume() { if (!B.on) return; B.busy = null; B.v = 0; syncPlayer(); showUI(); }

// ---------- Perjalanan cepat (sistem lama) & datang lewat layar berlayar ----------
function onVoyage() { if (B.on) { B.on = false; B.busy = null; hideUI(); } }
function arrivedByVoyage(ar) { // kapal ikut ke daerah tujuan & bersandar di dermaga utamanya
  const m = mainMoor(ar);
  B.on = false; B.area = ar.id; B.busy = null; hideUI();
  if (m) { B.moor = m.id; B.x = m.x; B.y = m.y; B.a = m.a; B.anchor = true; }
  persist();
}
// mulai permainan: pulihkan keadaan kapal dari simpanan
function restore(ar) {
  const q = S().sea; B.on = false; B.busy = null; B.wake.length = 0;
  if (!seaOf(ar)) { B.area = q.area; return; }
  if (q.on && q.area === ar.id && Number.isFinite(q.x) && hullFits(ar, q.x, q.y, q.a || 0)) {
    Object.assign(B, { on: true, area: ar.id, x: q.x, y: q.y, a: q.a || 0, v: 0, anchor: q.anchor !== false, moor: null });
    syncPlayer(); showUI(); return true;
  }
  if (ar.seaOnly) { // laut lepas tanpa data kapal yang valid: tetap di atas kapal (tidak pernah di air tanpa kapal)
    const s0 = ar.spawns.start; Object.assign(B, { on: true, area: ar.id, x: s0.x, y: s0.y, a: 0, v: 0, anchor: true, moor: null });
    syncPlayer(); showUI(); persist(); return true;
  }
  // kapal selalu ada di area sekarang (invarian): di titik sandar tersimpan atau dermaga utama
  const m = (q.area === ar.id && moorById(ar, q.moor)) || mainMoor(ar);
  Object.assign(B, { on: false, area: ar.id, moor: m ? m.id : null, x: m ? m.x : 0, y: m ? m.y : 0, a: m ? m.a : 0, v: 0, anchor: true });
  persist(); hideUI(); return false;
}

// ---------- Jejak air & riak ----------
const MAXW_LV = { tinggi: 64, sedang: 40, rendah: 18 }; // ikut pengaturan Efek Cuaca 2.3 (Tinggi/Sedang/Rendah)
const maxW = () => MAXW_LV[NW.weather && NW.weather.fx ? NW.weather.fx.level : "tinggi"] || 64;
function stepWake(dt) {
  for (const w of B.wake) w.t += dt;
  for (let i = B.wake.length - 1; i >= 0; i--) if (B.wake[i].t > B.wake[i].life) B.wake.splice(i, 1);
  if (!B.on || A().id !== B.area) return;
  const sp = spec(), f = fwd(B.a), spd = Math.abs(B.v);
  if (spd > 25) {
    B.foamT -= dt;
    if (B.foamT <= 0 && B.wake.length < maxW()) {
      B.foamT = 0.07 * (180 / Math.max(90, spd));
      const back = B.v > 0 ? -1.05 : 1.05, side = (Math.random() - 0.5) * 0.7, p = toW(B.x, B.y, f, back, side, sp.L, sp.B);
      B.wake.push({ x: p.x, y: p.y, t: 0, life: 1.4 + Math.random() * 0.6, s: 0.6 + spd / 300, kind: "foam" });
    }
  } else {
    B.ripT -= dt;
    if (B.ripT <= 0 && B.wake.length < maxW()) { B.ripT = 1.4; B.wake.push({ x: B.x, y: B.y, t: 0, life: 2.2, s: 1, kind: "ring" }); }
  }
}

// ---------- Gambar kapal (2.5D dari bentuk lambung) ----------
// pose { x, y, a }, opt { style:{hull,trim,inner}, player, decor, moored, t }
function drawVessel(c, pose, t, opt = {}) {
  const sp = opt.decor ? Object.assign({}, SPEC[1], { L: 1.05, B: 0.38, canopy: false }) : spec();
  const hull = (opt.style && opt.style.hull) || sp.hull, trim = (opt.style && opt.style.trim) || sp.trim, inner = (opt.style && opt.style.inner) || sp.inner;
  const f = fwd(pose.a), L = sp.L, Bm = sp.B, ph = pose.x * 1.3 + pose.y;
  const moving = !opt.decor && opt.player && Math.abs(B.v) > 20;
  const wk = NW.weather ? 1 + NW.weather.state.wind * 0.7 + NW.weather.state.rain * 0.3 : 1; // ombak sedikit lebih besar saat berangin/hujan (aman, tanpa kerusakan)
  const bob = Math.sin(t * 1.6 + ph) * 1.4 * (moving ? 0.6 : 1) * wk, roll = Math.sin(t * 1.15 + ph) * (opt.decor ? 1.2 : 1.8) * wk, pitch = moving ? -1.2 : Math.sin(t * 0.9 + ph) * 0.8;
  const night = N().darkness();
  const dz = (u, v) => bob + roll * v + pitch * u;
  const W = (u, v, z) => { const w = toW(pose.x, pose.y, f, u, v, L, Bm); return P(w.x, w.y, z + dz(u, v)); };
  const sheer = (u) => 13 + 5 * Math.max(0, u) ** 2 + 2 * Math.max(0, -u - 0.6) * 2;
  // bayangan & riak di air
  c.fillStyle = "rgba(8,36,56,.24)"; poly(c, RING.map(([u, v]) => { const w = toW(pose.x + 0.14, pose.y + 0.05, f, u * 1.06, v * 1.12, L, Bm); return P(w.x, w.y, -1); })); c.fill();
  c.strokeStyle = `rgba(255,255,255,${(0.22 + 0.12 * Math.sin(t * 2 + ph)).toFixed(3)})`; c.lineWidth = 1.3;
  poly(c, RING.map(([u, v]) => W(u * 1.08, v * 1.2, 0))); c.stroke();
  // haluan membelah air saat melaju
  if (moving) {
    const k = Math.min(1, Math.abs(B.v) / 200), bw = W(1.05, 0, 0);
    c.strokeStyle = `rgba(255,255,255,${(0.35 + 0.35 * k).toFixed(3)})`; c.lineWidth = 1.8;
    for (const s of [1, -1]) { const e = W(0.2, s * (1.6 + k), 0), m2 = W(0.65, s * 1.15, 0); c.beginPath(); c.moveTo(bw.x, bw.y); c.quadraticCurveTo(m2.x, m2.y, e.x, e.y); c.stroke(); }
  }
  // orientasi cincin untuk menentukan sisi yang menghadap kamera
  const wl = RING.map(([u, v]) => toW(pose.x, pose.y, f, u, v, L, Bm));
  let area2 = 0; for (let i = 0; i < wl.length; i++) { const p = wl[i], q = wl[(i + 1) % wl.length]; area2 += p.x * q.y - q.x * p.y; }
  const sgn = area2 > 0 ? 1 : -1;
  const faces = RING.map(([u, v], i) => {
    const [u2, v2] = RING[(i + 1) % RING.length], p = wl[i], q = wl[(i + 1) % wl.length];
    const ex = q.x - p.x, ey = q.y - p.y, nx = sgn * ey, ny = -sgn * ex; // normal keluar
    return { i, u, v, u2, v2, front: nx + ny > 0, light: clamp((-nx * 0.8 + ny * 0.3) / (Math.hypot(nx, ny) || 1), -1, 1), d: (p.x + q.x + p.y + q.y) / 2 };
  });
  const sideQuad = (fc, outer) => [W(fc.u, fc.v, 1), W(fc.u2, fc.v2, 1), W(fc.u2 * (outer ? 1 : 0.93), fc.v2 * (outer ? 1.04 : 0.92), sheer(fc.u2)), W(fc.u * (outer ? 1 : 0.93), fc.v * (outer ? 1.04 : 0.92), sheer(fc.u))];
  // 1) sisi dalam dinding belakang
  for (const fc of faces.filter((x) => !x.front).sort((a2, b2) => a2.d - b2.d)) { c.fillStyle = mix(shade(inner, -0.2), "#0a1426", night * 0.5); poly(c, sideQuad(fc, false)); c.fill(); }
  // 2) lantai papan
  c.fillStyle = mix(inner, "#0a1426", night * 0.5); poly(c, RING.map(([u, v]) => W(u * 0.88, v * 0.82, 4))); c.fill();
  c.strokeStyle = mix(shade(inner, -0.25), "#0a1426", night * 0.5); c.lineWidth = 1;
  for (let u = -0.7; u <= 0.7; u += 0.22) { const a2 = W(u, -0.8, 4.2), b2 = W(u, 0.8, 4.2); c.beginPath(); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.stroke(); }
  // 3) bangku melintang
  c.fillStyle = mix(shade(inner, 0.12), "#0a1426", night * 0.5);
  for (const u of [0.32, -0.25]) { poly(c, [W(u - 0.06, -0.9, 10), W(u + 0.06, -0.9, 10), W(u + 0.06, 0.9, 10), W(u - 0.06, 0.9, 10)]); c.fill(); }
  // mesin tempel (bagian buritan): digambar sebelum/ sesudah lambung tergantung arah pandang
  const sternFront = (f.x + f.y) < 0; // buritan menghadap kamera
  const motor = () => {
    const top = W(-1.12, 0, 18), base = W(-1.1, 0, 2), low = W(-1.16, 0, -6);
    c.strokeStyle = "#2f3b40"; c.lineWidth = 3; c.beginPath(); c.moveTo(base.x, base.y); c.lineTo(low.x, low.y); c.stroke();
    c.fillStyle = mix(opt.decor ? "#4a5560" : lv() >= 3 ? "#e9ecef" : "#d84a3a", "#0a1426", night * 0.5);
    c.beginPath(); c.ellipse(top.x, top.y + 3, 6.5, 7, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.ellipse(top.x - 2, top.y, 2.4, 3.6, 0, 0, 7); c.fill();
    if (!opt.decor) { // tuas kemudi (tiller)
      const tl = W(-0.68, 0.18, 15); c.strokeStyle = "#3a2a1a"; c.lineWidth = 2.2; c.beginPath(); c.moveTo(top.x, top.y + 4); c.lineTo(tl.x, tl.y); c.stroke();
    }
    if (moving && B.v > 0) { // semburan baling-baling
      const w = W(-1.4, 0, 0); c.fillStyle = "rgba(255,255,255,.55)"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(w.x + Math.sin(t * 20 + i) * 4, w.y + Math.cos(t * 17 + i) * 2, 2.2, 0, 7); c.fill(); }
    }
  };
  if (!sternFront) motor();
  // 4) muatan: coolbox & joran tersimpan (joran di dudukan, tidak dipegang saat mengemudi)
  if (!opt.decor) {
    const cb = W(0.08, -0.45, 5), cl = N().upLvl("cooler") | 0;
    c.fillStyle = mix(["#7f8a8f", "#3f8fd0", "#3f8fd0", "#e9e4d8", "#e9e4d8", "#c9a96a", "#8fb3c9", "#b7c3cc", "#e8eef2", "#e0b84c"][cl] || "#3f8fd0", "#0a1426", night * 0.5);
    c.fillRect(cb.x - 7, cb.y - 9, 14, 9); c.fillStyle = mix("#ffffff", "#0a1426", night * 0.5); c.fillRect(cb.x - 8, cb.y - 11, 16, 3);
    const rs = NW.look && NW.look.rodSpec ? NW.look.rodSpec() : null;
    if (rs) {
      const r0 = W(-0.55, 0.78, 14), r1 = W(0.95, 0.7, 22), g1 = W(-0.32, 0.77, 15);
      c.lineCap = "round"; c.strokeStyle = mix(rs.blank, "#0a1426", night * 0.4); c.lineWidth = Math.max(1.4, rs.w * 0.75); c.beginPath(); c.moveTo(r0.x, r0.y); c.lineTo(r1.x, r1.y); c.stroke();
      c.strokeStyle = rs.grip; c.lineWidth = rs.w * 1.1; c.beginPath(); c.moveTo(r0.x, r0.y); c.lineTo(g1.x, g1.y); c.stroke();
      if (rs.reel) { c.fillStyle = rs.reel.col; c.beginPath(); c.arc(g1.x, g1.y - 1, 2.2, 0, 7); c.fill(); }
      const hold = W(-0.2, 0.8, 13); c.fillStyle = "#3a4a50"; c.fillRect(hold.x - 1.5, hold.y - 3, 3, 5); // dudukan joran
    }
  } else {
    const net = W(0.2, 0, 7); c.fillStyle = "rgba(220,220,200,.75)"; c.beginPath(); c.ellipse(net.x, net.y, 9, 3.5, 0, 0, 7); c.fill(); // jaring tergulung
  }
  // 5) pemain duduk di buritan memegang kemudi
  if (opt.player) opt.player(dz(-0.6, 0));
  // 6) sisi luar yang menghadap kamera
  for (const fc of faces.filter((x) => x.front).sort((a2, b2) => a2.d - b2.d)) {
    const col = mix(shade(hull, fc.light * 0.18 - 0.05), "#0a1426", night * 0.55);
    c.fillStyle = col; poly(c, sideQuad(fc, true)); c.fill();
    c.fillStyle = mix(shade(hull, -0.35), "#0a1426", night * 0.55); poly(c, [W(fc.u, fc.v, 1), W(fc.u2, fc.v2, 1), W(fc.u2, fc.v2 * 1.02, 4), W(fc.u, fc.v * 1.02, 4)]); c.fill(); // garis air
    c.fillStyle = mix(shade(hull, 0.18), "#0a1426", night * 0.55); poly(c, [W(fc.u * 0.995, fc.v * 1.035, sheer(fc.u) - 5), W(fc.u2 * 0.995, fc.v2 * 1.035, sheer(fc.u2) - 5), W(fc.u2, fc.v2 * 1.04, sheer(fc.u2) - 3.5), W(fc.u, fc.v * 1.04, sheer(fc.u) - 3.5)]); c.fill(); // garis hias
  }
  // 7) bibir lambung (trim) berkeliling
  c.strokeStyle = mix(trim, "#0a1426", night * 0.5); c.lineWidth = 2.4; c.lineJoin = "round";
  poly(c, RING.map(([u, v]) => W(u, v * 1.04, sheer(u)))); c.stroke();
  if (sternFront) motor();
  // 8) atap terpal kecil (kapal tingkat 3 ke atas), bendera merah-putih di haluan
  if (sp.canopy && !opt.decor) {
    c.strokeStyle = "#5a3d26"; c.lineWidth = 1.6;
    for (const [u, v] of [[0.62, 0.75], [0.62, -0.75], [0.0, 0.8], [0.0, -0.8]]) { const a2 = W(u, v, sheer(u)), b2 = W(u, v, 40); c.beginPath(); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.stroke(); }
    c.fillStyle = mix(lv() >= 4 ? "#2f7a8c" : "#3f8fd0", "#0a1426", night * 0.5); c.globalAlpha = 0.93;
    poly(c, [W(0.7, 0.88, 41), W(0.7, -0.88, 41), W(-0.06, -0.92, 39), W(-0.06, 0.92, 39)]); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1; for (const u of [0.15, 0.4]) { const a2 = W(u, -0.9, 40.2), b2 = W(u, 0.9, 40.2); c.beginPath(); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.stroke(); }
  }
  const fp = W(0.9, 0, sheer(0.9)), ft = W(0.9, 0, sheer(0.9) + 22), wave = Math.sin(t * 6 + ph) * 1.5;
  c.strokeStyle = "#5a3d26"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(fp.x, fp.y); c.lineTo(ft.x, ft.y); c.stroke();
  c.fillStyle = "#e2342c"; c.beginPath(); c.moveTo(ft.x, ft.y); c.lineTo(ft.x + 11, ft.y + 1 + wave * 0.5); c.lineTo(ft.x + 11, ft.y + 4.5 + wave * 0.5); c.lineTo(ft.x, ft.y + 3.5); c.fill();
  c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(ft.x, ft.y + 3.5); c.lineTo(ft.x + 11, ft.y + 4.5 + wave * 0.5); c.lineTo(ft.x + 11, ft.y + 8 + wave * 0.5); c.lineTo(ft.x, ft.y + 7); c.fill();
  // lampu kapal di malam hari
  if (night > 0.3 && !opt.decor) { const lp = W(0.85, 0, sheer(0.85) + 12); c.save(); c.globalCompositeOperation = "lighter"; const g = c.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, 46); g.addColorStop(0, `rgba(255,214,140,${0.55 * night})`); g.addColorStop(1, "rgba(255,214,140,0)"); c.fillStyle = g; c.beginPath(); c.arc(lp.x, lp.y, 46, 0, 7); c.fill(); c.restore(); c.fillStyle = "#fff2c4"; c.beginPath(); c.arc(lp.x, lp.y, 2.2, 0, 7); c.fill(); }
  if (opt.name && opt.decor) { const np = W(0.1, 1.0, 7); c.save(); c.translate(np.x, np.y); c.fillStyle = "rgba(255,255,255,.7)"; c.font = "700 5px system-ui, sans-serif"; c.textAlign = "center"; c.fillText(opt.name.toUpperCase(), 0, 0); c.restore(); }
  // tali tambat ke dermaga
  if (opt.moored && opt.moored.tie) {
    const d = P(opt.moored.tie.x, opt.moored.tie.y, LIFT + 14), r = W(0.75, 0, sheer(0.75));
    c.strokeStyle = "#d8c49a"; c.lineWidth = 1; c.beginPath(); c.moveTo(d.x, d.y); c.quadraticCurveTo((d.x + r.x) / 2, (d.y + r.y) / 2 + 8, r.x, r.y); c.stroke();
  }
}
function drawWake(c, t, view) {
  if (A().id !== B.area) return;
  for (const w of B.wake) {
    const k = w.t / w.life, p = P(w.x, w.y, 0);
    if (p.x < view.x0 - 60 || p.x > view.x1 + 60 || p.y < view.y0 - 40 || p.y > view.y1 + 40) continue;
    if (w.kind === "foam") {
      c.fillStyle = `rgba(255,255,255,${(0.55 * (1 - k)).toFixed(3)})`; c.beginPath(); c.ellipse(p.x, p.y, (4 + k * 14) * w.s, (2 + k * 6) * w.s, 0, 0, 7); c.fill();
    } else {
      c.strokeStyle = `rgba(255,255,255,${(0.35 * (1 - k)).toFixed(3)})`; c.lineWidth = 1.2; c.beginPath(); c.ellipse(p.x, p.y, 36 + k * 40, (36 + k * 40) * 0.42, 0, 0, 7); c.stroke();
    }
  }
}
// item yang disisipkan ke daftar kedalaman world.draw
function layer(t, drawPlayer) {
  const ar = A(); if (!seaOf(ar) || B.area !== ar.id) return [];
  if (B.on) return [{ d: B.x + B.y + 0.35, draw: (c) => drawVessel(c, B, t, { player: drawPlayer }) }];
  const m = moorById(ar, B.moor); if (!m) return [];
  return [{ d: B.x + B.y + 0.35, draw: (c) => drawVessel(c, B, t, { moored: m }) }];
}

// ---------- Kamera ----------
function camTarget(ZW) {
  const f = fwd(B.a), lead = clamp(B.v / 260, -0.4, 1) * 1.6;
  const p = P(B.x + f.x * lead, B.y + f.y * lead, 0);
  return { x: p.x, y: p.y - 18, z: ZW * 0.84 };
}

// ---------- Peta yang sudah dijelajahi (grid kasar di koordinat chart) ----------
const CH = { x0: -14, y0: -14, x1: 172, y1: 54, cell: 4 };
const CW = Math.ceil((CH.x1 - CH.x0) / CH.cell), CHh = Math.ceil((CH.y1 - CH.y0) / CH.cell);
function markSeen() {
  const ch = NW.sea.toChart(B.area, B.x, B.y); if (!ch) return;
  const q = S().sea; let s = q.seen; if (s.length !== CW * CHh) s = "0".repeat(CW * CHh);
  const cx = Math.floor((ch.x - CH.x0) / CH.cell), cy = Math.floor((ch.y - CH.y0) / CH.cell);
  let arr = null;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (dx * dx + dy * dy > 5) continue; const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= CW || y >= CHh) continue;
    const i = y * CW + x; if (s[i] === "1") continue; if (!arr) arr = s.split(""); arr[i] = "1";
  }
  q.seen = arr ? arr.join("") : s;
}
const seenAt = (cx, cy) => { const s = S().sea.seen; const x = Math.floor((cx - CH.x0) / CH.cell), y = Math.floor((cy - CH.y0) / CH.cell); return s.length === CW * CHh && s[y * CW + x] === "1"; };

// ---------- Panel 🗺️ Peta Laut ----------
let chartImg = null;
function buildChart(scale) { // gambar daratan & dermaga semua area laut sekali (bukan per frame)
  const cv = document.createElement("canvas"), pad = 8;
  const isoX = (x, y) => (x - y), isoY = (x, y) => (x + y) / 2;
  const minX = isoX(CH.x0, CH.y1), maxX = isoX(CH.x1, CH.y0), minY = isoY(CH.x0, CH.y0), maxY = isoY(CH.x1, CH.y1);
  cv.width = Math.ceil((maxX - minX) * scale + pad * 2); cv.height = Math.ceil((maxY - minY) * scale + pad * 2);
  const g = cv.getContext("2d"), tx = (x, y) => (isoX(x, y) - minX) * scale + pad, ty = (x, y) => (isoY(x, y) - minY) * scale + pad;
  g.fillStyle = "#cfe6ea"; g.fillRect(0, 0, cv.width, cv.height);
  for (const id of NW.sea.CHART_AREAS) {
    const ar = NW.areas.get(id), m = ar.map, ch = ar.sea.chart;
    for (let y = -2; y < m.MH + 2; y++) for (let x = -2; x < m.MW + 2; x++) {
      const t = m.tileAt(x, y); if (!NW.isLandT(t)) continue;
      const X = x + ch.ox, Y = y + ch.oy;
      g.fillStyle = t === NW.T.DOCK ? "#8a5a32" : t === NW.T.SAND ? "#e9d39a" : t === NW.T.PATH ? "#d8bf8a" : t === NW.T.FOREST ? "#5c8f4a" : "#86b964";
      g.beginPath(); g.moveTo(tx(X, Y), ty(X, Y)); g.lineTo(tx(X + 1, Y), ty(X + 1, Y)); g.lineTo(tx(X + 1, Y + 1), ty(X + 1, Y + 1)); g.lineTo(tx(X, Y + 1), ty(X, Y + 1)); g.closePath(); g.fill();
    }
  }
  return { cv, tx, ty, scale };
}
function chartHTML() {
  const ar = A(), here = NW.sea.toChart(B.on ? B.area : ar.id, B.on ? B.x : NW.world.player.x, B.on ? B.y : NW.world.player.y);
  const t = rescueTarget(), dock = t.moor ? NW.sea.toChart(t.area.id, t.moor.x, t.moor.y) : null;
  const dist = dock && here ? Math.round(Math.hypot(dock.x - here.x, dock.y - here.y) * 5) : 0;
  const sp = NW.sea.SPOT_LIST.filter((s) => NW.sea.found(s)), unk = NW.sea.SPOT_LIST.filter((s) => !s.hidden && !NW.sea.found(s)).length; // spot rahasia tidak dihitung sebelum ditemukan
  return `<p class="muted">Peta buatan pelaut dari koordinat dunia game (bukan GPS). Daerah yang belum dilayari tampak berkabut.</p>
    <div class="sea-chart"><canvas id="seaChart"></canvas></div>
    <div class="sea-legend"><span>⛵ Kapalmu</span><span>⚓ Dermaga</span><span>✨ Spot ditemukan</span></div>
    ${dock ? `<p class="sea-home">🧭 <b>${esc(t.moor.name)}</b> ± ${dist} m · ikuti garis putus-putus atau panah kompas di layar.</p>` : ""}
    <h3 class="sub-h">🎣 Spot laut</h3><div class="list">${sp.map((s) => `<div class="mission claimed"><div class="m-ic">${s.icon}</div><div class="grow"><div class="nm">${esc(s.name)}</div><div class="sub">${esc(s.perk)}</div></div></div>`).join("")}
    ${unk ? `<div class="mission"><div class="m-ic">❔</div><div class="grow"><div class="nm">${unk} spot belum ditemukan</div><div class="sub">Baca tanda alam: burung yang berkumpul, air berwarna toska, riak bergaris, atau air biru gelap.</div></div></div>` : ""}</div>
    <p><button class="btn ghost small" data-act="fast">🧭 Perjalanan Cepat (rute lama)</button></p>`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
function drawChart(body) {
  const cv = body.querySelector("#seaChart"); if (!cv) return;
  const wrap = cv.parentElement, w = Math.max(240, Math.min(620, wrap.clientWidth || 320)), dpr = Math.min(2, window.devicePixelRatio || 1);
  const span = (CH.x1 - CH.y0) - (CH.x0 - CH.y1), scale = (w - 16) / span;
  if (!chartImg || Math.abs(chartImg.scale - scale * dpr) > 0.01) chartImg = buildChart(scale * dpr);
  const img = chartImg.cv; cv.width = img.width; cv.height = img.height; cv.style.width = img.width / dpr + "px"; cv.style.height = img.height / dpr + "px";
  const g = cv.getContext("2d"); g.drawImage(img, 0, 0);
  const tx = chartImg.tx, ty = chartImg.ty, s = chartImg.scale;
  // kabut di bagian laut yang belum pernah dilayari
  g.fillStyle = "rgba(120,150,165,.55)";
  for (let y = CH.y0; y < CH.y1; y += CH.cell) for (let x = CH.x0; x < CH.x1; x += CH.cell) {
    if (seenAt(x + 0.5, y + 0.5)) continue;
    g.beginPath(); g.moveTo(tx(x, y), ty(x, y)); g.lineTo(tx(x + CH.cell, y), ty(x + CH.cell, y)); g.lineTo(tx(x + CH.cell, y + CH.cell), ty(x + CH.cell, y + CH.cell)); g.lineTo(tx(x, y + CH.cell), ty(x, y + CH.cell)); g.closePath(); g.fill();
  }
  const label = (x, y, txt, col = "#173f50", size = 11) => { g.font = `800 ${Math.round(size * (s / scale))}px system-ui, sans-serif`; g.textAlign = "center"; g.lineWidth = 3 * (s / scale); g.strokeStyle = "rgba(255,255,255,.85)"; g.strokeText(txt, tx(x, y), ty(x, y)); g.fillStyle = col; g.fillText(txt, tx(x, y), ty(x, y)); };
  const k = s / scale;
  // dermaga & daerah
  for (const id of NW.sea.CHART_AREAS) { const ar2 = NW.areas.get(id); for (const m of ar2.sea.moors) { const c2 = NW.sea.toChart(id, m.x, m.y); label(c2.x, c2.y, "⚓", "#173f50", 12); } }
  label(19, 19, "Muara Kampung", "#173f50", 10); label(139.5 + 25, 22, "Pelabuhan Selat Sunda", "#173f50", 9.5);
  for (const d of NW.areas.get("laut").discoveries) if (!d.sea && NW.adv.isFound(d.id)) { const c2 = NW.sea.toChart("laut", d.x, d.y); label(c2.x - 3, c2.y - 3, d.name, "#3a5a40", 7.5); }
  for (const sp of NW.sea.SPOT_LIST) if (NW.sea.found(sp)) { const c2 = NW.sea.toChart(sp.area, sp.x, sp.y); g.fillStyle = sp.mark || "rgba(224,184,76,.35)"; g.beginPath(); g.ellipse(tx(c2.x, c2.y), ty(c2.x, c2.y), sp.r * 1.4 * s, sp.r * 0.7 * s, 0, 0, 7); g.fill(); label(c2.x + 2, c2.y + 2, `${sp.icon} ${sp.name}`, "#7a4f0e", 8.5); }
  // posisi kapal & garis pulang
  const ar = A(), here = B.on ? NW.sea.toChart(B.area, B.x, B.y) : NW.sea.toChart(ar.id, NW.world.player.x, NW.world.player.y);
  if (here) {
    const t = rescueTarget(), dock = t.moor ? NW.sea.toChart(t.area.id, t.moor.x, t.moor.y) : null;
    if (dock && B.on) { g.setLineDash([4 * k, 4 * k]); g.strokeStyle = "rgba(23,63,80,.8)"; g.lineWidth = 1.5 * k; g.beginPath(); g.moveTo(tx(here.x, here.y), ty(here.x, here.y)); g.lineTo(tx(dock.x, dock.y), ty(dock.x, dock.y)); g.stroke(); g.setLineDash([]); }
    const px = tx(here.x, here.y), py = ty(here.x, here.y), a = B.on ? B.a : 0;
    g.save(); g.translate(px, py); g.rotate(a);
    g.fillStyle = "#e2574c"; g.strokeStyle = "#fff"; g.lineWidth = 1.5 * k; g.beginPath(); g.moveTo(9 * k, 0); g.lineTo(-6 * k, 5 * k); g.lineTo(-3 * k, 0); g.lineTo(-6 * k, -5 * k); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
}

// ---------- Tombol & kompas (UI layar) ----------
function pulse(id) { const el = $(id); if (!el) return; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
let uiShown = false, lastUI = "";
function buildUI() {
  if ($("seaBar")) return;
  const bar = document.createElement("div"); bar.id = "seaBar"; bar.className = "sea-bar hidden";
  bar.innerHTML = `<button id="seaAnchor" aria-label="Berhenti / jangkar"><span>⚓</span><b>Jangkar</b></button>
    <button id="seaFish" aria-label="Memancing"><span>🎣</span><b>Memancing</b></button>
    <button id="seaMap" aria-label="Peta laut"><span>🗺️</span><b>Peta Laut</b></button>
    <button id="seaHome" aria-label="Kembali ke dermaga"><span>🛟</span><b>Ke Dermaga</b></button>`;
  document.body.appendChild(bar);
  const hud = document.createElement("div"); hud.id = "seaHud"; hud.className = "sea-hud hidden";
  hud.innerHTML = `<span id="seaArrow" class="sea-arrow">➤</span><span id="seaDock">Dermaga</span><b id="seaSpeed">0 knot</b>`;
  document.body.appendChild(hud);
  const tap = (id, fn) => $(id).addEventListener("click", (e) => { e.stopPropagation(); if (N().mode() !== "world" || !B.on) return; fn(); });
  tap("seaAnchor", toggleAnchor);
  tap("seaFish", fish);
  tap("seaMap", () => { N().sfx("click"); N().openPanel("seamap"); });
  tap("seaHome", () => { N().sfx("click"); rescue(); });
  for (const id of ["seaAnchor", "seaFish", "seaMap", "seaHome"]) $(id).addEventListener("pointerdown", (e) => e.stopPropagation());
}
function showUI() { buildUI(); $("seaBar").classList.remove("hidden"); $("seaHud").classList.remove("hidden"); document.body.classList.add("sailing"); uiShown = true; refreshUI(true); }
function hideUI() { if (!$("seaBar")) return; $("seaBar").classList.add("hidden"); $("seaHud").classList.add("hidden"); document.body.classList.remove("sailing"); uiShown = false; }
function refreshUI(force) {
  if (!uiShown) return;
  const key = `${B.anchor}|${canFish()}`;
  if (force || key !== lastUI) {
    lastUI = key;
    const an = $("seaAnchor"); an.classList.toggle("on", B.anchor); an.innerHTML = B.anchor ? "<span>⛵</span><b>Angkat Jangkar</b>" : "<span>⚓</span><b>Jangkar</b>";
    $("seaFish").classList.toggle("dim", !canFish()); $("seaFish").setAttribute("aria-disabled", String(!canFish()));
  }
  // kompas: panah ke dermaga terdekat (di layar), jarak & kecepatan
  const t = rescueTarget(); if (!t.moor) return;
  const here = NW.sea.toChart(B.area, B.x, B.y), dock = NW.sea.toChart(t.area.id, t.moor.x, t.moor.y);
  const dx = dock.x - here.x, dy = dock.y - here.y, sx = (dx - dy) * HW, sy = (dx + dy) * HH;
  const ang = Math.atan2(sy, sx), dist = Math.hypot(dx, dy) * 5;
  $("seaArrow").style.transform = `rotate(${ang.toFixed(3)}rad)`;
  $("seaDock").textContent = dist < 18 ? `${t.moor.name} · dekat` : `${t.moor.name} · ${Math.round(dist)} m`;
  $("seaSpeed").textContent = `${Math.round(Math.abs(B.v) / 22)} knot`;
}

// ---------- Pasang ----------
function hook() {
  buildUI();
  N().registerPanel("seamap", {
    title: () => "🗺️ Peta Laut",
    render: chartHTML,
    after: (body) => requestAnimationFrame(() => drawChart(body)),
    act: (act) => { if (act === "fast") { N().openPanel("map"); } },
  });
}

NW.boat = {
  SPEC, B, migrate, defaults, persist, restore, resume, board, boardable, landCandidates, seaCandidates, interact, update, syncPlayer, setPose,
  toggleAnchor, fish, canFish, rescue, rescueTarget, startTransit, onVoyage, arrivedByVoyage, nearMoor, startDock, hullFits, sailableAt,
  drawVessel, drawWake, layer, camTarget, hook, showUI, hideUI, markSeen, seenAt, fwd, angT, dir8, mainMoor, moorById, spec,
  get on() { return B.on; }, get area() { return B.area; }, get busy() { return B.busy; }, get speed() { return B.v; }, get anchor() { return B.anchor; },
  stats: () => ({ on: B.on, area: B.area, x: +B.x.toFixed(3), y: +B.y.toFixed(3), a: +B.a.toFixed(3), v: +B.v.toFixed(2), anchor: B.anchor, wake: B.wake.length, busy: B.busy ? B.busy.kind : null, moor: B.moor }),
};
})();
