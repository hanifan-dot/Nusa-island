// =========================================================
//  NUSA ISLAND — Rumahku (instanced): halaman pribadi + interior per level,
//  Mode Tata Ruang, renovasi 10 level, katalog perabot.
//  Data & aturan ada di home-data.js (NW.HD), gambar di house-draw.js (NW.HOUSE).
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa, HD = NW.HD, HS = NW.HOUSE, P = NW.P;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const H = () => N().S.home;
const lvl = () => H().level;

// ---------- Sprite ikan (cache supaya akuarium ramai tetap ringan) ----------
const spriteCache = {};
NW.HD_FISH = (id) => N().FISH_BY_ID[id];
NW.drawFishSprite = (c, fish, x, y, L) => {
  if (!fish) return;
  let s = spriteCache[fish.id];
  if (!s) { s = document.createElement("canvas"); s.width = 160; s.height = 96; N().drawFish(s.getContext("2d"), fish, 80, 48, 120); spriteCache[fish.id] = s; }
  c.drawImage(s, x - L * 0.667, y - L * 0.4, L * 1.333, L * 0.8);
};
const speedOf = (it) => { const f = NW.HD_FISH(it.id); return 0.3 + (f ? f.power : 3) * 0.06; };
const sizeOf = (it, base) => { const f = NW.HD_FISH(it.id); if (!f) return base; const r = clamp((it.w - f.wMin) / Math.max(0.01, f.wMax - f.wMin), 0, 1); return base * (0.8 + r * 0.45) * (0.85 + (f.shape ? f.shape[0] - 1 : 0) * 0.35); };
function replicas(rarity) {
  const S = N().S, order = ["legenda", "epik", "langka", "biasa"];
  return FISH.filter((f) => !f.emoji && S.dex[f.id] && (!rarity || f.rarity === rarity)).sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));
}

// ---------- Status ----------
const state = { active: false, scene: null, editing: false, sel: null, ghost: null, valid: true, drag: null, upgradeT: 0, upgrading: false, flash: 0 };
let radioOn = false, radioT = null, ver = 0, cache = { ver: -1 };
const bump = () => { ver++; };
function computed() { // titik interaksi & jalan, dihitung ulang hanya bila tata ruang berubah
  if (cache.ver === ver && cache.lv === lvl()) return cache;
  const h = H(), R = HD.reachable(h, HD.solidRects(h));
  const pts = h.furniture.filter((f) => HD.FURN[f.type].kind === "solid").map((f) => ({ f, p: HD.interactPoint(f, R) }));
  cache = { ver, lv: lvl(), R, pts };
  return cache;
}

// ---------- Kucing ----------
const cat = { x: 2, y: 2, tx: 2, ty: 2, wait: 2, dir: 1, sleep: 0, hearts: 0 };
const hasDeco = (id) => H().decorations.includes(id);
function updateCat(dt) {
  if (!hasDeco("kucing") || state.scene !== "room") return;
  if (cat.hearts > 0) cat.hearts -= dt;
  if (!roomWalk(cat.x, cat.y, 0.18)) { const sp = HD.doorOf(lvl()).spawn; cat.x = sp.x + 0.8; cat.y = sp.y - 0.4; }
  if (cat.wait > 0) { cat.wait -= dt; return; }
  const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy);
  if (d < 0.05) {
    cat.wait = rand(2, 6); cat.sleep = Math.random() < 0.4 ? cat.wait : 0;
    const { w, d: dd } = HD.roomOf(lvl()), rug = H().furniture.find((f) => f.type === "karpet");
    if (rug && Math.random() < 0.5) { const r = HD.fp(rug); cat.tx = (r.x0 + r.x1) / 2; cat.ty = (r.y0 + r.y1) / 2; if (!roomWalk(cat.tx, cat.ty, 0.18)) { cat.tx = cat.x; cat.ty = cat.y; } return; }
    for (let i = 0; i < 20; i++) { const x = rand(0.6, w - 0.4), y = rand(0.6, dd - 0.4); if (roomWalk(x, y, 0.18)) { cat.tx = x; cat.ty = y; break; } }
    return;
  }
  const st = Math.min(d, dt * 0.9), nx = cat.x + (dx / d) * st, ny = cat.y + (dy / d) * st;
  if (roomWalk(nx, ny, 0.18)) { cat.x = nx; cat.y = ny; } else { cat.tx = cat.x; cat.ty = cat.y; }
  const a = P(0, 0), b = P(dx, dy); cat.dir = b.x - a.x >= 0 ? 1 : -1;
}
function drawCat(c, t) {
  const p = P(cat.x, cat.y, 0), s = cat.dir, sleeping = cat.wait > 0 && cat.sleep > 0, bob = cat.wait <= 0 ? Math.abs(Math.sin(t * 10)) * 1.2 : 0;
  c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(p.x, p.y, 10, 3.5, 0, 0, 7); c.fill();
  c.save(); c.translate(p.x, p.y); c.scale(s, 1);
  c.strokeStyle = "#d98a3d"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(-8, -6); c.quadraticCurveTo(-16, -10 - Math.sin(t * 3) * 4, -13, -18); c.stroke();
  c.fillStyle = "#e89a48";
  if (sleeping) { c.beginPath(); c.ellipse(0, -5, 10, 5.5, 0, 0, 7); c.fill(); c.beginPath(); c.arc(7, -6, 4.5, 0, 7); c.fill(); }
  else {
    c.beginPath(); c.ellipse(-1, -8 - bob, 9, 5, 0, 0, 7); c.fill(); c.fillRect(-7, -6, 2.5, 6); c.fillRect(4, -6, 2.5, 6);
    c.beginPath(); c.arc(8, -13 - bob, 5, 0, 7); c.fill();
    c.beginPath(); c.moveTo(5, -16 - bob); c.lineTo(6, -21 - bob); c.lineTo(8.5, -17 - bob); c.fill(); c.beginPath(); c.moveTo(9, -17 - bob); c.lineTo(11.5, -21 - bob); c.lineTo(12.5, -15 - bob); c.fill();
    c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(10, -13.5 - bob, 0.9, 0, 7); c.fill();
  }
  c.strokeStyle = "#b8682a"; c.lineWidth = 1.2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-5 + i * 3.5, -12 - bob); c.lineTo(-4 + i * 3.5, -8 - bob); c.stroke(); }
  c.restore();
  if (sleeping) { c.fillStyle = "#173f50"; c.font = "700 9px system-ui"; c.fillText("z", p.x + 10, p.y - 18 - ((t * 8) % 8)); }
  if (cat.hearts > 0) { c.globalAlpha = Math.min(1, cat.hearts); c.font = "11px sans-serif"; c.fillText("❤️", p.x - 4, p.y - 26 - (1.5 - cat.hearts) * 12); c.globalAlpha = 1; }
}

// ---------- Radio ----------
const SONG = [392, 440, 523, 440, 392, 330, 392, 0, 330, 392, 440, 392, 330, 294, 330, 0];
function radio(on) {
  radioOn = on; clearInterval(radioT); if (!on) return;
  let i = 0;
  radioT = setInterval(() => { if (state.scene !== "room" || N().S.muted) return; const f = SONG[i++ % SONG.length]; if (f) { N().tone(f, 0.32, "triangle", 0.045); N().tone(f / 2, 0.4, "sine", 0.03); } }, 360);
}

// ---------- Jalan & collision ----------
function roomWalk(x, y, r = 0.22) {
  const { w, d } = HD.roomOf(lvl());
  if (x < 0.25 + r || y < 0.25 + r || x > w - 0.15 - r || y > d - 0.15 - r) return false;
  for (const s of HD.solidRects(H())) if (x > s.x0 - r && x < s.x1 + r && y > s.y0 - r && y < s.y1 + r) return false;
  return true;
}
function plotWalk(x, y, r = 0.22) {
  if (x < 0.6 + r || y < 0.6 + r || x > HS.PW - 0.6 - r || y > HS.PH - 0.4 - r) return false;
  for (const s of HS.PLOT_SOLIDS(HS.plotLayout(lvl()))) if (x > s.x0 - r && x < s.x1 + r && y > s.y0 - r && y < s.y1 + r) return false;
  return true;
}
const walkable = (x, y) => (state.scene === "room" ? roomWalk(x, y) : plotWalk(x, y));

// ---------- Interaksi ----------
function candidates() {
  if (state.scene === "plot") {
    const L = HS.plotLayout(lvl()), list = [
      { id: "p_gate", x: L.gate.x, y: L.gate.y - 0.5, r: 0.9, icon: "🏝️", label: "Ke Kampung" },
      { id: "p_door", x: L.doorPt.x, y: L.doorPt.y, r: 0.9, icon: "🚪", label: "Masuk" },
      { id: "p_sign", x: L.sign.x + 0.4, y: L.sign.y + 0.45, r: 0.85, icon: "🔨", label: "Renovasi" },
      { id: "p_mail", x: L.mailbox.x + 0.35, y: L.mailbox.y + 0.4, r: 0.75, icon: "✉️", label: "Surat" },
    ];
    if (L.ex.paviliun) list.push({ id: "p_pav", x: L.ex.paviliun.x1 + 0.4, y: (L.ex.paviliun.y0 + L.ex.paviliun.y1) / 2, r: 0.9, icon: "🍵", label: "Duduk" });
    if (L.ex.kolam) list.push({ id: "p_pond", x: (L.ex.kolam.x0 + L.ex.kolam.x1) / 2, y: L.ex.kolam.y0 - 0.4, r: 1.0, icon: "🐟", label: "Kolam" });
    return list;
  }
  const h = H(), C = computed(), sp = HD.doorOf(lvl()).spawn;
  const list = [{ id: "h_door", x: sp.x, y: sp.y, r: 0.75, icon: "🚪", label: "Keluar" }];
  for (const { f, p } of C.pts) {
    if (!p) continue;
    const T = HD.FURN[f.type];
    if (f.type === "kasur") list.push({ id: "h_bed", x: p.x, y: p.y, r: 0.85, icon: "🛏️", label: "Kasur", f });
    else if (f.type === "meja") list.push({ id: "h_catalog", x: p.x, y: p.y, r: 0.85, icon: "📒", label: "Katalog", f });
    else if (T.cap) list.push({ id: "h_aqua", x: p.x, y: p.y, r: 0.85, icon: "🐠", label: `Akuarium ${HD.fishIn(h, f.uid).length}/${T.cap}`, f });
    else if (f.type === "radio") list.push({ id: "h_radio", x: p.x, y: p.y, r: 0.8, icon: "📻", label: radioOn ? "Matikan" : "Radio", f });
    else if (f.type === "trofi") list.push({ id: "h_trophy", x: p.x, y: p.y, r: 0.8, icon: "🏆", label: "Trofi", f });
  }
  for (const b of HD.LEVELS[lvl()].builtins) if (b.type === "lemariPamer" || b.type === "dindingLegenda") {
    const x = b.x + b.w / 2, y = b.y + b.d + 0.5; if (roomWalk(x, y)) list.push({ id: "h_show", x, y, r: 0.85, icon: "👀", label: "Lihat", b });
  }
  if (hasDeco("kucing")) list.push({ id: "h_cat", x: cat.x, y: cat.y, r: 0.8, icon: "🐈", label: "Elus" });
  return list;
}
function fadeThen(fn) { const f = $("fade"); f.classList.add("on"); setTimeout(() => { fn(); setTimeout(() => f.classList.remove("on"), 60); }, 320); }
function banner(text) { const b = $("banner"); b.textContent = text; b.classList.add("show"); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove("show"), 1800); }
function goPlot(player, at) {
  state.active = true; state.scene = "plot"; setEditing(false);
  if (NW.story) NW.story.mark("home");
  const L = HS.plotLayout(lvl());
  if (at === "door") { player.x = L.doorPt.x; player.y = L.doorPt.y + 0.2; player.dir = 2; }
  else { player.x = L.gate.x + 0.2; player.y = L.gate.y - 0.7; player.dir = 7; }
  NW.world.snapCamera(); syncUI(); banner(`🏡 Halaman Rumahku · Lv ${lvl()}`);
}
function goRoom(player) {
  state.scene = "room"; const sp = HD.doorOf(lvl()).spawn; player.x = sp.x; player.y = sp.y; player.dir = 0; bump();
  NW.world.snapCamera(); syncUI(); banner(`🏠 ${HD.LEVELS[lvl()].name}`);
  N().setHint(H().stored.length ? `${H().stored.length} perabot ada di gudang. Buka 🛠️ Tata Ruang untuk memasangnya.` : "");
}
function enter(player) { fadeThen(() => goPlot(player, "gate")); }
function exitToIsland(player) {
  fadeThen(() => { state.active = false; state.scene = null; radio(false); setEditing(false); syncUI(); player.x = NW.HOME_GATE.x; player.y = NW.HOME_GATE.y + 0.7; player.dir = 2; NW.world.snapCamera(); NW.world.updateHint(); });
}
function interact(t, player, openDialog) {
  const S = N().S, h = H();
  if (t.id === "p_gate") return exitToIsland(player);
  if (t.id === "p_door") return fadeThen(() => goRoom(player));
  if (t.id === "p_sign") return N().openPanel("renov");
  if (t.id === "p_mail") return openDialog({ name: "Kotak Surat", avatar: "✉️", lines: ["Surat dari Pak Kades: \"Halaman ini milikmu sendiri. Warga lain tidak bisa masuk.\"", "\"Nanti, kalau sudah ada fitur kunjungan, teman hanya bisa melihat. Mengubah dekorasi atau mengambil ikan butuh izinmu.\""] });
  if (t.id === "p_pav") return openDialog({ name: "Paviliun", avatar: "🍵", lines: ["Kamu duduk sebentar di paviliun sambil menikmati angin laut.", "Tempat yang pas untuk menyambut tamu nanti."] });
  if (t.id === "p_pond") return openDialog({ name: "Kolam Hias", avatar: "🐟", lines: ["Ikan koi berenang santai di antara teratai.", "Ikan hasil tangkapanmu dipajang di akuarium di dalam rumah."] });
  if (t.id === "h_door") return fadeThen(() => goPlot(player, "door"));
  if (t.id === "h_bed") {
    const hr = S.hour;
    if (hr >= 18 || hr < 5) openDialog({ name: "Kasur", avatar: "🛏️", lines: ["Kasurnya empuk. Sudah malam, saatnya istirahat."], options: [{ label: "😴 Tidur sampai pagi", act: () => fadeThen(() => { N().sleepUntilMorning(); radio(false); N().toast(`Selamat pagi! Hari ${N().S.day} ☀️`, "good"); }) }] });
    else if (hr >= 11 && hr < 17) openDialog({ name: "Kasur", avatar: "🛏️", lines: ["Siang yang panas. Tidur siang sebentar?"], options: [{ label: "😪 Tidur siang (3 jam)", act: () => fadeThen(() => { S.hour += 3; N().save(); N().toast("Segar lagi! ☀️", "good"); }) }] });
    else openDialog({ name: "Kasur", avatar: "🛏️", lines: ["Belum ngantuk. Tidur malam mulai pukul 18:00, tidur siang pukul 11:00–17:00."] });
  } else if (t.id === "h_catalog") N().openPanel("catalog");
  else if (t.id === "h_aqua") { if (NW.aqui) NW.aqui.open(t.f.uid); else openDialog({ name: "Akuarium", avatar: "🐠", lines: ["Akuarium belum bisa dibuka."] }); }
  else if (t.id === "h_radio") { radio(!radioOn); N().toast(radioOn ? "📻 Radio menyala" : "📻 Radio mati"); }
  else if (t.id === "h_trophy" || t.id === "h_show") {
    const L = replicas("legenda"), best = Object.entries(S.dex).map(([id, r]) => [N().FISH_BY_ID[id], r.best]).filter(([f]) => f && !f.emoji).sort((a, b) => b[1] - a[1])[0];
    openDialog({ name: t.b ? (t.b.type === "dindingLegenda" ? "Dinding Legenda" : "Lemari Pamer") : "Rak Trofi", avatar: "🏆", lines: [L.length ? `Replika ikan legenda: ${L.map((f) => f.name).join(", ")}.` : "Belum ada ikan legenda. Cari di tiap pulau!", best ? `Rekor terberat: ${best[0].name} ${N().fmtW(best[1])}.` : "Belum ada rekor.", "Yang dipajang di sini replika dari catatan koleksimu. Ikan asli dipajang di akuarium."] });
  } else if (t.id === "h_cat") { cat.hearts = 1.5; cat.wait = 3; cat.sleep = 0; N().tone(880, 0.12, "triangle", 0.06, 660); N().tone(740, 0.18, "triangle", 0.05, 520, 0.12); N().toast("Si Belang mendengkur senang 🐈"); }
}

// ---------- Mode Tata Ruang ----------
const snap = (v) => Math.round((v - 0.05) / HD.SNAP) * HD.SNAP + 0.05;
function setEditing(on) {
  state.editing = on; state.sel = null; state.ghost = null; state.drag = null;
  document.body.classList.toggle("editing", on);
  syncUI(); renderBar();
  if (!on) { N().save(); bump(); }
}
function syncUI() {
  $("layoutBtn").classList.toggle("hidden", !(state.active && state.scene === "room") || state.editing);
  $("layoutBar").classList.toggle("hidden", !state.editing);
}
function hitFurniture(cx, cy) {
  const h = H(), order = h.furniture.slice().sort((a, b) => { const A = HD.fp(a), B = HD.fp(b); return (B.x1 + B.y1) - (A.x1 + A.y1); });
  for (const f of order.filter((f) => HD.FURN[f.type].kind === "solid").concat(order.filter((f) => HD.FURN[f.type].kind === "floor"))) {
    const T = HD.FURN[f.type], r = HD.fp(f);
    for (const z of [T.h * 0.6, T.h * 0.3, 0]) { const p = NW.world.toTile(cx, cy, z); if (p.x > r.x0 - 0.12 && p.x < r.x1 + 0.12 && p.y > r.y0 - 0.12 && p.y < r.y1 + 0.12) return { f, p: NW.world.toTile(cx, cy, 0) }; }
  }
  return null;
}
const cv = $("game");
cv.addEventListener("pointerdown", (e) => {
  if (!state.editing) return;
  const hit = hitFurniture(e.clientX, e.clientY);
  if (!hit) { state.sel = null; state.ghost = null; renderBar(); return; }
  state.sel = hit.f.uid; state.ghost = { ...hit.f }; state.valid = true;
  state.drag = { id: e.pointerId, ox: hit.p.x - hit.f.x, oy: hit.p.y - hit.f.y, moved: false, sx: e.clientX, sy: e.clientY };
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  renderBar();
});
cv.addEventListener("pointermove", (e) => {
  const d = state.drag; if (!state.editing || !d || d.id !== e.pointerId) return;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
  d.moved = true;
  const p = NW.world.toTile(e.clientX, e.clientY, 0), f = H().furniture.find((x) => x.uid === state.sel);
  const gx = snap(p.x - d.ox), gy = snap(p.y - d.oy);
  if (!state.ghost || state.ghost.x !== gx || state.ghost.y !== gy) N().sfx("furn_geser"); // geseran lembut (dibatasi di AudioManager)
  state.ghost = { ...f, x: gx, y: gy };
  state.valid = HD.canPlace(H(), state.ghost).ok;
});
function endDrag(e) {
  const d = state.drag; if (!state.editing || !d || (e && d.id !== e.pointerId)) return;
  state.drag = null;
  if (!d.moved) return;
  const f = H().furniture.find((x) => x.uid === state.sel), res = HD.canPlace(H(), state.ghost);
  if (res.ok) { f.x = state.ghost.x; f.y = state.ghost.y; N().sfx("furn_taruh"); N().save(); bump(); }
  else { N().toast(`Tidak bisa di sini: ${res.why}`, "bad"); state.ghost = { ...f }; }
  state.valid = true; renderBar();
}
cv.addEventListener("pointerup", endDrag);
cv.addEventListener("pointercancel", endDrag);
function rotateSel() {
  const f = H().furniture.find((x) => x.uid === state.sel); if (!f) return;
  const t = { ...f, rot: f.rot ? 0 : 1 };
  let res = HD.canPlace(H(), t);
  if (!res.ok) { const s = HD.findSpot(H(), t, f.x, f.y); if (s && s.rot === t.rot) { Object.assign(t, s); res = { ok: true }; N().toast("Digeser sedikit supaya muat"); } }
  if (!res.ok) return N().toast(`Tidak bisa diputar: ${res.why}`, "bad");
  Object.assign(f, { x: t.x, y: t.y, rot: t.rot }); state.ghost = { ...f }; N().sfx("furn_geser"); N().save(); bump(); renderBar();
}
function storeSel() {
  const h = H(), i = h.furniture.findIndex((x) => x.uid === state.sel); if (i < 0) return;
  const f = h.furniture[i];
  if (HD.FURN[f.type].cap && HD.fishIn(h, f.uid).length) return N().toast("Ambil dulu ikan di akuarium ini sebelum disimpan ke gudang", "bad");
  h.furniture.splice(i, 1); h.stored.push(f); state.sel = null; state.ghost = null; N().sfx("furn_ambil"); N().save(); bump(); renderBar(); N().toast(`${HD.FURN[f.type].name} disimpan di gudang 📦`);
}
function placeStored(uid) {
  const h = H(), i = h.stored.findIndex((x) => x.uid === uid); if (i < 0) return;
  const f = h.stored[i], { w, d } = HD.roomOf(lvl()), s = HD.findSpot(h, f, w / 2, d / 2);
  if (!s) return N().toast("Tidak ada tempat kosong. Geser atau simpan perabot lain dulu.", "bad");
  h.stored.splice(i, 1); h.furniture.push(s); state.sel = s.uid; state.ghost = { ...s }; N().sfx("furn_taruh"); N().save(); bump(); renderBar();
}
function renderBar() {
  const bar = $("layoutBar"); if (!state.editing) return;
  const f = H().furniture.find((x) => x.uid === state.sel);
  $("lbTitle").textContent = f ? `${HD.FURN[f.type].icon} ${HD.FURN[f.type].name}` : "Ketuk & geser perabot";
  $("lbRotate").disabled = !f; $("lbStore").disabled = !f;
  const st = H().stored;
  $("lbStored").innerHTML = st.length ? `<span class="muted">Gudang:</span>` + st.map((x) => `<button class="chip-btn" data-uid="${x.uid}">${HD.FURN[x.type].icon} ${HD.FURN[x.type].name}</button>`).join("") : `<span class="muted">Gudang kosong</span>`;
  void bar;
}
$("layoutBtn").addEventListener("click", () => { N().sfx("click"); setEditing(true); N().toast("Mode Tata Ruang: ketuk perabot lalu geser 🛠️"); });
$("lbDone").addEventListener("click", () => { N().sfx("click"); setEditing(false); N().toast("Tata ruang disimpan ✔", "good"); });
$("lbRotate").addEventListener("click", rotateSel);
$("lbStore").addEventListener("click", storeSel);
$("lbStored").addEventListener("click", (e) => { const b = e.target.closest("[data-uid]"); if (b) placeStored(b.dataset.uid); });

// ---------- Renovasi ----------
function renovHTML() {
  const S = N().S, lv = lvl(), next = HD.LEVELS[lv + 1], cur = HD.LEVELS[lv];
  let h = `<div class="renov-strip">${HD.LEVELS.slice(1).map((L) => `<div class="rs ${L.lv < lv ? "done" : L.lv === lv ? "cur" : ""}" title="${L.name}">${L.lv}</div>`).join("")}</div>`;
  h += `<div class="renov-cols"><div class="renov-card"><div class="muted">Sekarang · Level ${lv}</div><b>${cur.name}</b><canvas class="renov-prev" data-lv="${lv}" width="300" height="190"></canvas><div class="muted">Ruangan ${cur.room[0]}×${cur.room[1]} · ${cur.windows} jendela</div></div>`;
  if (next) {
    const curR = cur.room, nxR = next.room, feats = [];
    if (nxR[0] * nxR[1] > curR[0] * curR[1]) feats.push(`Ruangan ${curR[0]}×${curR[1]} → ${nxR[0]}×${nxR[1]}`);
    if (next.windows > cur.windows) feats.push(`+${next.windows - cur.windows} jendela`);
    const e0 = HS.EXT[lv], e1 = HS.EXT[lv + 1];
    if (e1.stilts && !e0.stilts) feats.push("Rumah panggung dengan kolong & tangga");
    if (e1.roof !== e0.roof) feats.push({ sirap: "Atap sirap kayu", genteng: "Atap genteng tradisional", gentengLebar: "Atap genteng lebar menaungi teras", gentengSilang: "Atap berornamen silang", tingkat: "Atap bertingkat & balkon", gonjong: "Atap gonjong melengkung berukir emas" }[e1.roof]);
    if (e1.wall !== e0.wall) feats.push({ papan: "Dinding papan rapi", papanCat: "Dinding papan bercat", ukir: "Dinding berukir", ukirGelap: "Kayu gelap berukir emas", ukirEmas: "Ukiran emas detail" }[e1.wall]);
    for (const x of e1.extras) if (!e0.extras.includes(x)) { const nm = { pagarBambu: "Pagar bambu", pagarKayu: "Pagar kayu", kebun: "Kebun", rakLuar: "Rak luar", kolong: "Kolong rumah", lentera: "Lentera", gudang: "Gudang kecil", jalanBatu: "Jalan batu", tamanBunga: "Taman bunga", paviliun: "Paviliun", kolam: "Kolam hias koi", obor: "Obor bambu", potBunga: "Pot bunga" }[x]; if (nm) feats.push(nm); }
    for (const b of next.builtins) if (!cur.builtins.some((x) => x.type === b.type)) { const nm = { rak: "Rak perabot", kursiRotan: "Ruang keluarga (kursi rotan)", lemariUkir: "Lemari ukir", mejaTamu: "Ruang tamu", tiang: "Tiang ukiran", lemariPamer: "Lemari pamer tangkapan", dindingLegenda: "Dinding legenda" }[b.type]; if (nm) feats.push(nm); }
    const lockStars = S.rep < next.stars, poor = S.money < next.price;
    h += `<div class="renov-card next"><div class="muted">Berikutnya · Level ${lv + 1}</div><b>${next.name}</b><canvas class="renov-prev" data-lv="${lv + 1}" width="300" height="190"></canvas><div class="muted">${next.desc}</div></div></div>
      <ul class="renov-feats">${feats.map((f) => `<li>${f}</li>`).join("")}</ul>
      <div class="renov-buy"><div><div class="muted">Biaya renovasi</div><b>🪙 ${N().fmt(next.price)}</b>${next.stars ? ` · butuh ${next.stars} ⭐ (kamu ${S.rep})` : ""}</div>
      <button class="btn ${lockStars || poor ? "" : "gold"}" data-act="renov" ${lockStars || poor || state.upgrading ? "disabled" : ""}>${lockStars ? `🔒 ${next.stars} ⭐` : poor ? "Koin kurang" : "🔨 Renovasi"}</button></div>
      <p class="muted">Perabot & ikan di akuarium tetap aman. Bila tata ruang berubah, perabot dipindah otomatis ke tempat yang muat.</p>`;
  } else h += `<div class="renov-card next"><b>🏆 Level tertinggi!</b><div class="muted">Rumah Legenda Nusantara adalah rumah termegah di kampung.</div></div></div>`;
  setTimeout(drawPreviews, 0);
  return h;
}
function drawPreviews() {
  document.querySelectorAll(".renov-prev").forEach((cv2) => {
    const lv = +cv2.dataset.lv, c = cv2.getContext("2d"), L = HS.plotLayout(lv), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv2.width = 300 * dpr; cv2.height = 190 * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#cfe8d8"; c.fillRect(0, 0, 300, 190);
    const cx = P((L.house.x0 + L.house.x1) / 2, (L.house.y0 + (L.porch ? L.porch.y1 : L.house.y1)) / 2, 30), s = 300 / 520;
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * (150 - cx.x * s), dpr * (110 - cx.y * s));
    c.fillStyle = "#86c064"; HS.poly(c, [P(L.house.x0 - 1.2, L.house.y0 - 1.2), P(L.house.x1 + 1.2, L.house.y0 - 1.2), P(L.house.x1 + 1.2, L.house.y1 + 3), P(L.house.x0 - 1.2, L.house.y1 + 3)]); c.fill();
    HS.drawExterior(c, lv, performance.now() / 1000, 0, {});
  });
}
function renovAct(a) {
  if (a !== "renov" || state.upgrading) return;
  const S = N().S, h = H(), next = HD.LEVELS[h.level + 1];
  if (!next || S.money < next.price || S.rep < next.stars) return;
  state.upgrading = true;
  const fishBefore = HD.inventoryReport(S).total, itemsBefore = h.furniture.length + h.stored.length;
  S.money -= next.price; h.level = next.lv; h.updatedAt = Date.now();
  const rep = HD.relayout(h); HD.ensureFishUids(S); bump();
  console.assert(HD.inventoryReport(S).total === fishBefore && h.furniture.length + h.stored.length === itemsBefore, "upgrade mengubah jumlah barang");
  N().save(); N().refreshHUD(); N().closePanel();
  state.upgradeT = 2.0; N().sfx("coin");
  for (let i = 0; i < 6; i++) setTimeout(() => N().tone(180 + Math.random() * 80, 0.08, "square", 0.05), i * 220);
  setTimeout(() => {
    state.upgrading = false; state.flash = 1;
    N().tone(523, 0.18, "triangle", 0.1); N().tone(784, 0.25, "triangle", 0.1, null, 0.15); N().tone(1047, 0.35, "triangle", 0.1, null, 0.3);
    banner(`🏡 Level ${next.lv}: ${next.name}`);
    N().toast(rep.stored.length ? `${rep.stored.length} perabot disimpan di gudang (tidak muat). Pasang lewat 🛠️ Tata Ruang.` : rep.moved.length ? `Rumah baru! ${rep.moved.length} perabot ditata ulang otomatis.` : "Rumah baru sudah jadi! 🎉", "good");
  }, 2000);
}

// ---------- Katalog ----------
function owned(c) {
  const h = H(), all = h.furniture.concat(h.stored);
  if (c.deco) return h.decorations.includes(c.id);
  if (c.id === "akuariumKecil2") return all.filter((f) => f.type === "akuariumKecil").length >= 2;
  return all.some((f) => f.type === c.furn);
}
function catalogHTML() {
  const S = N().S;
  let h = `<p class="muted">Perabot baru dipasang otomatis dan bisa digeser lewat 🛠️ Tata Ruang. Kamu punya 🪙 ${N().fmt(S.money)} · ⭐ ${S.rep}.</p><div class="list">`;
  for (const c of HD.CATALOG) {
    const own = owned(c), lock = S.rep < c.stars, poor = S.money < c.price;
    h += `<div class="shop-item"><div class="ic">${HD.catIcon(c)}</div><div class="grow"><b>${HD.catName(c)}</b><div class="muted">${c.desc}</div>${c.stars ? `<div class="muted">Butuh ${c.stars} ⭐</div>` : ""}</div>
      ${own ? `<span class="muted">✔ Dimiliki</span>` : lock ? `<span class="muted">🔒 ${c.stars} ⭐</span>` : `<button class="btn ${poor ? "" : "gold"}" data-act="buyItem" data-arg="${c.id}" ${poor ? "disabled" : ""}>🪙 ${N().fmt(c.price)}</button>`}</div>`;
  }
  return h + `</div>`;
}
function catalogAct(a, arg) {
  if (a !== "buyItem") return;
  const S = N().S, h = H(), c = HD.CATALOG.find((x) => x.id === arg);
  if (!c || owned(c) || S.money < c.price || S.rep < c.stars) return;
  S.money -= c.price;
  let msg = `${HD.catIcon(c)} ${HD.catName(c)} dipasang di Rumahku!`;
  if (c.deco) h.decorations.push(c.id);
  else { const r = HD.addFurniture(h, S, c.furn); if (!r.placed) msg = `${HD.catIcon(c)} ${HD.catName(c)} dibeli, tapi ruangan penuh. Barang ada di gudang 📦`; }
  if (c.id === "kucing") { const sp = HD.doorOf(lvl()).spawn; cat.x = sp.x + 1; cat.y = sp.y - 0.5; }
  h.updatedAt = Date.now(); bump(); N().sfx("coin"); N().toast(msg, "good"); N().save(); N().refreshHUD(); N().renderPanel();
}
function hook() {
  N().registerPanel("catalog", { title: () => "📒 Katalog Perabot", render: catalogHTML, act: catalogAct });
  N().registerPanel("renov", { title: () => "🔨 Renovasi Rumahku", render: renovHTML, act: renovAct });
}

// ---------- Kamera & gambar ----------
function camTarget(player, W, H2, ZW) {
  if (state.scene === "plot") { // sedikit lebih jauh & lebih tinggi supaya rumah besar terlihat utuh
    const p = P(player.x, player.y, 0), L = HS.plotLayout(lvl()), hc = P((L.house.x0 + L.house.x1) / 2, (L.house.y0 + L.house.y1) / 2, 60);
    return { x: p.x * 0.75 + hc.x * 0.25, y: (p.y - 22) * 0.7 + hc.y * 0.3, z: ZW * (lvl() >= 7 ? 0.82 : 0.9) };
  }
  const { w, d } = HD.roomOf(lvl()), c = P(w / 2, d / 2, 30);
  const fit = Math.min((W - 24) / ((w + d) * 32 + 40), (H2 - 230) / ((w + d) * 16 + 150));
  const z = clamp(fit, 0.55, 1.6);
  if (fit >= 0.72 || state.editing) return { x: c.x, y: c.y - 10, z };
  const p = P(player.x, player.y, 0), k = 0.6; // ruangan besar di HP: kamera ikut pemain sebagian
  return { x: c.x + (p.x - c.x) * k, y: c.y - 10 + (p.y - c.y) * k, z: 0.72 };
}
function drawScene(ctx, t, dk, player, V) {
  const night = dk / 0.85;
  ctx.setTransform(V.DPR, 0, 0, V.DPR, 0, 0);
  if (state.scene === "plot") {
    ctx.fillStyle = NW.mix("#2fa3bb", "#0d2140", clamp(night, 0, 1)); ctx.fillRect(0, 0, V.W, V.H);
    V.worldXf();
    HS.state.scaffold = state.upgradeT > 0 ? Math.min(1, state.upgradeT) : 0;
    const L = HS.drawPlotGround(ctx, lvl(), t), { list } = HS.plotObjects(lvl(), t, night);
    list.push({ d: player.x + player.y, draw: (c) => NW.drawCharacter(c, player, t) });
    list.sort((a, b) => a.d - b.d).forEach((it) => it.draw(ctx));
    // pemain di belakang rumah tetap terlihat (siluet)
    const hb = L.house; if (player.y < hb.y1 && player.x > hb.x0 - 0.5 && player.x < hb.x1 + 0.5) { ctx.globalAlpha = 0.5; NW.drawCharacter(ctx, player, t); ctx.globalAlpha = 1; }
    if (dk > 0.05) {
      ctx.setTransform(V.DPR, 0, 0, V.DPR, 0, 0); ctx.fillStyle = `rgba(14,24,58,${(dk * 0.6).toFixed(3)})`; ctx.fillRect(0, 0, V.W, V.H);
      V.worldXf(); ctx.globalCompositeOperation = "lighter";
      const a = clamp((dk - 0.15) * 1.3, 0, 0.75) * 0.5, e = L.e, z0 = e.stilts;
      NW.lightAt(ctx, HX(), L.doorPt.y - 0.5, z0 + 20, 90, "#ffa94d", a);
      if (e.extras.includes("obor")) for (const [x, y] of [[4.4, 11], [6.6, 10.3]]) NW.lightAt(ctx, x, y, 30, 60, "#ff9a3c", a);
      if (e.extras.includes("lentera") && L.porch) NW.lightAt(ctx, L.porch.x0 + 0.5, L.porch.y1, z0 + 30, 70, "#ffb347", a);
      ctx.globalCompositeOperation = "source-over";
    }
    if (state.flash > 0) { ctx.setTransform(V.DPR, 0, 0, V.DPR, 0, 0); ctx.fillStyle = `rgba(255,248,220,${(state.flash * 0.7).toFixed(3)})`; ctx.fillRect(0, 0, V.W, V.H); }
    return;
  }
  // interior
  const g = ctx.createRadialGradient(V.W / 2, V.H / 2, 40, V.W / 2, V.H / 2, Math.max(V.W, V.H) * 0.7);
  g.addColorStop(0, "#2a3b45"); g.addColorStop(1, "#121c22"); ctx.fillStyle = g; ctx.fillRect(0, 0, V.W, V.H);
  V.worldXf();
  const h = H(), lv = lvl();
  HS.drawRoomShell(ctx, lv, t, dk, h.decorations);
  const ctxF = { replicas, fishFor: (uid) => HD.fishIn(h, uid), speedOf, sizeOf, radioOn, highlight: state.editing ? state.sel : null, valid: state.valid };
  const show = (f) => (state.editing && state.ghost && f.uid === state.sel ? state.ghost : f);
  // karpet di lantai dulu
  for (const f of h.furniture) if (HD.FURN[f.type].kind === "floor") HS.drawFurniture(ctx, show(f), t, ctxF);
  if (state.editing) drawGrid(ctx, lv);
  const L = [];
  for (const b of HD.LEVELS[lv].builtins) if (b.d > 0.05) L.push({ d: b.x + b.w / 2 + b.y + b.d / 2, draw: (c) => HS.drawBuiltin(c, b, t, ctxF) });
  for (const f of h.furniture) if (HD.FURN[f.type].kind === "solid") { const r = HD.fp(show(f)); L.push({ d: (r.x0 + r.x1) / 2 + (r.y0 + r.y1) / 2, draw: (c) => HS.drawFurniture(c, show(f), t, ctxF) }); }
  if (hasDeco("kucing")) L.push({ d: cat.x + cat.y, draw: (c) => drawCat(c, t) });
  if (!state.editing) L.push({ d: player.x + player.y, draw: (c) => NW.drawCharacter(c, player, t) });
  L.sort((a, b) => a.d - b.d).forEach((it) => it.draw(ctx));
  // lampu gantung
  const { w, d } = HD.roomOf(lv), lit = hasDeco("lampu") || lv >= 5;
  if (lit) {
    const bulb = P(w / 2, d / 2, 86), top = P(w / 2, d / 2, 140);
    ctx.strokeStyle = "#2c3a40"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bulb.x, bulb.y - 8); ctx.stroke();
    ctx.fillStyle = lv >= 8 ? "#f0c75a" : "#e0b84c"; ctx.beginPath(); ctx.moveTo(bulb.x - 12, bulb.y); ctx.lineTo(bulb.x + 12, bulb.y); ctx.lineTo(bulb.x + 5, bulb.y - 10); ctx.lineTo(bulb.x - 5, bulb.y - 10); ctx.fill();
    ctx.fillStyle = dk > 0.3 ? "#fff1c4" : "#f3e7c9"; ctx.beginPath(); ctx.arc(bulb.x, bulb.y + 2, 4, 0, 7); ctx.fill();
  }
  if (dk > 0.05) {
    ctx.setTransform(V.DPR, 0, 0, V.DPR, 0, 0); ctx.fillStyle = `rgba(14,24,58,${(dk * (lit ? 0.28 : 0.55)).toFixed(3)})`; ctx.fillRect(0, 0, V.W, V.H);
    V.worldXf();
    if (lit) { ctx.globalCompositeOperation = "lighter"; const p = P(w / 2, d / 2, 60), r = 120 + (w + d) * 10, gl = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, r); gl.addColorStop(0, `rgba(255,190,110,${0.4 * dk})`); gl.addColorStop(1, "rgba(255,190,110,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill(); ctx.globalCompositeOperation = "source-over"; }
  }
}
const HX = () => HS.plotLayout(lvl()).doorPt.x;
function drawGrid(ctx, lv) {
  const { w, d } = HD.roomOf(lv);
  ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 1;
  for (let x = 0.05; x <= w; x += HD.SNAP) { const a = P(x, 0, 1), b = P(x, d, 1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (let y = 0.05; y <= d; y += HD.SNAP) { const a = P(0, y, 1), b = P(w, y, 1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  const door = HD.doorOf(lv); ctx.fillStyle = "rgba(226,87,76,.25)"; HS.poly(ctx, [P(0, door.y0 - 0.15, 1), P(1.35, door.y0 - 0.15, 1), P(1.35, door.y1 + 0.15, 1), P(0, door.y1 + 0.15, 1)]); ctx.fill();
}

NW.home = {
  state, get active() { return state.active; }, get scene() { return state.scene; }, get radioOn() { return radioOn; },
  walkable, candidates, interact, enter, hook, camTarget, drawScene, isEditing: () => state.editing,
  update(dt) {
    updateCat(dt);
    if (state.upgradeT > 0) state.upgradeT = Math.max(0, state.upgradeT - dt);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.5);
  },
  lit: () => hasDeco("lampu") || lvl() >= 5, center: () => { const { w, d } = HD.roomOf(lvl()); return P(w / 2, d / 2, 20); },
  reset() { state.active = false; state.scene = null; setEditing(false); radio(false); },
  goRoom, goPlot, bump, spriteCache,
};
})();
