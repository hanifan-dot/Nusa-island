// =========================================================
//  NUSA ISLAND — Bumbu 3.1: integrasi KEDAI ATUK BAHAR ke Muara Kampung
//  Menambah: bangunan + meja + bangku + Atuk (lewat hooks area), titik interaksi, migrasi S.kedai, gelar, panel.
//  TIDAK mengubah tata letak acak peta lama: bangunan ditambahkan SETELAH peta dibuat, objek yang bertabrakan dipindahkan.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const D = window.NusaKedaiData, N = () => window.Nusa;
const area = NW.areas.get("muara"), M = area.map;
const B = { id: "kedai", kind: "house", x0: 21, y0: 25, x1: 24.5, y1: 27.5, h: 40, stilts: 8, door: "x", roof: "#7a3b22", wall: "#b88a52", name: "Kedai Atuk Bahar" };
const TABLE = { x: 26.5, y: 26.5 }, SEAT = { x: 25.7, y: 26.5 }, BENCHES = [{ x: 26.5, y: 25.35 }, { x: 26.5, y: 27.65 }], SPOT = { x: 27.7, y: 26.5 };
// Kehidupan harian (Bumbu 3.2): meja & kursi hanya ada di halaman saat Atuk membuka kedai
const S_TABLE = { x: TABLE.x, y: TABLE.y, r: 0.62 }, S_SEAT = { x: SEAT.x, y: SEAT.y, r: 0.3 };
const DOOR = { x: B.x1 + 0.3, y: (B.y0 + B.y1) / 2 }, DOOR_IN = { x: B.x1 + 0.02, y: DOOR.y }, PLACE = { x: SEAT.x - 0.25, y: SEAT.y };
const POINT = { id: "kedai", x: SPOT.x, y: SPOT.y, r: 1.5, icon: "👴", label: "Bermain dengan Atuk" };
const L_TABLE = { x: TABLE.x, y: TABLE.y, z: 26, r: 56, col: "#ffb347", k: 0 }, L_HOUSE = { x: B.x1 + 0.6, y: DOOR.y, z: 30, r: 62, col: "#ffb347", k: 0 };
let life = null; // pengarah jadwal (dibuat di bawah)
const PLAZA = { x0: 24, y0: 24, x1: 29, y1: 29 }; // area yang dibersihkan dari pohon/batu acak

// ---------- 1) pasang ke peta (sekali) ----------
(function mount() {
  const inPlaza = (o) => o.x > PLAZA.x0 - 0.6 && o.x < PLAZA.x1 + 0.6 && o.y > PLAZA.y0 - 0.6 && o.y < PLAZA.y1 + 0.6 || (o.x > B.x0 - 1 && o.x < B.x1 + 1 && o.y > B.y0 - 1 && o.y < B.y1 + 1);
  for (let i = M.objects.length - 1; i >= 0; i--) if (inPlaza(M.objects[i])) M.objects.splice(i, 1);
  for (let i = M.solids.length - 1; i >= 0; i--) { const s = M.solids[i]; if (s.r !== undefined && inPlaza(s)) M.solids.splice(i, 1); }
  // jalan tanah ke kedai (dari jalan utara–selatan di x=18) + halaman depan
  const T = NW.T, set = (x, y) => { if (x >= 0 && y >= 0 && x < M.MW && y < M.MH && NW.isLandT(M.tiles[y * M.MW + x])) M.tiles[y * M.MW + x] = T.PATH; };
  for (let x = 19; x <= 28; x++) set(x, 29 - 1);
  for (let y = 24; y <= 28; y++) for (let x = 25; x <= 28; x++) set(x, y);
  M.buildings.push(Object.assign({}, B, { draw: (c, b, t, night) => NW.kedaiArt.kedai(c, b, t, Math.max(night, life ? life.lamp : 0)) })); // lampu rumah menyala saat Atuk di dalam
  M.solids.push({ x0: B.x0 + 0.02, y0: B.y0 + 0.02, x1: B.x1 - 0.02, y1: B.y1 - 0.02 });
  for (const b of BENCHES) M.solids.push({ x: b.x, y: b.y, r: 0.32 });
  M.points.push(POINT);
  M.lights.push(L_TABLE, L_HOUSE);
})();

// ---------- 2) Atuk & suasana ----------
const atuk = { mode: "idle", t: 0, next: 4, talking: false };
function setMode(m, secs) { atuk.mode = m; atuk.t = secs; }
const KID_STYLE = [
  { shirt: "#3d6f8f", pants: "#4a3b2c", skin: "#a8714a", hair: "#2a1d14", hat: "cap", hatCol: "#173f50", scale: 0.8 },
  { shirt: "#c2603b", pants: "#5b3a5c", skin: "#c99066", hair: "#2a1d14", hat: "scarf", hatCol: "#e0b84c", scale: 0.8 },
];
const ATUK_STYLE = { shirt: "#efe3c2", pants: "#7a4a2a", skin: "#b9835a", hair: "#f2efe8", hat: "cap", hatCol: "#1c1a1a", scale: 1.05 };
const solidOn = (s, on) => { const i = M.solids.indexOf(s); if (on && i < 0) M.solids.push(s); else if (!on && i >= 0) M.solids.splice(i, 1); };
const H_ = window.NusaKedaiHidup;
life = H_.makeDirector({
  walkable: (x, y, r) => M.walkable(x, y, r), bounds: { x0: 24.6, y0: 23.8, x1: 29.4, y1: 29.6 },
  door: DOOR, doorIn: DOOR_IN, place: PLACE, seat: SEAT, table: TABLE, seed: 7,
  benches: [{ sit: { x: BENCHES[0].x, y: BENCHES[0].y - 0.05 }, app: { x: BENCHES[0].x, y: BENCHES[0].y - 0.62 }, dir: 4 }, { sit: { x: BENCHES[1].x, y: BENCHES[1].y + 0.05 }, app: { x: BENCHES[1].x, y: BENCHES[1].y + 0.62 }, dir: 0 }],
  watch: [{ x: 27.55, y: 25.7 }, { x: 27.6, y: 27.4 }], play: [{ x: 28.3, y: 25.3 }, { x: 28.4, y: 27.9 }, { x: 27.0, y: 28.6 }],
  onTable: (on) => solidOn(S_TABLE, on), onSeat: (on) => solidOn(S_SEAT, on),
});
const villagers = life.kids.map((k, i) => { k.style = KID_STYLE[i]; k.seed = i ? 2.2 : 1.1; return k; });
const aChar = Object.assign(life.atuk, { style: ATUK_STYLE, seed: 3.3 });
const isOut = () => life.atuk.vis && life.phase !== "night";   // Atuk sedang di halaman (bukan di dalam rumah)

function update(dt, api) {
  const S = N().S; life.update(dt, S.hour);
  const A = life.atuk, T_ = life.table;
  // titik interaksi & cahaya mengikuti keadaan
  const seated = A.seated; POINT.x = seated ? SPOT.x : DOOR.x + 0.55; POINT.y = seated ? SPOT.y : DOOR.y; POINT.label = seated || A.vis ? "Bermain dengan Atuk" : "Ketuk pintu Atuk";
  L_TABLE.k = T_.state === "down" ? 1.1 : 0; L_HOUSE.k = 1.15 * life.lamp;
  atuk.prep = A.prep;
  if (!A.seated) return;
  atuk.next -= dt;
  const p = api && api.player, near = p && Math.hypot(p.x - SEAT.x, p.y - SEAT.y) < 4.2;
  if (A.prep && atuk.t <= 0) atuk.mode = "gesture";
  if (atuk.t > 0) { atuk.t -= dt; if (atuk.t <= 0) atuk.mode = near ? "gesture" : "idle"; }
  if (atuk.next <= 0 && atuk.t <= 0) {
    const r = Math.random();
    if (near) { if (r < 0.45) { setMode("laugh", 1.8); N().sfx("kedai_tawa"); } else setMode("gesture", 2.2); atuk.next = 4 + Math.random() * 4; }
    else { if (r < 0.3) setMode("laugh", 1.4); else if (r < 0.65) setMode("gesture", 2); atuk.next = 5 + Math.random() * 6; }
  }
}
function bubble(c, ch, text, now) {
  const p = NW.P(ch.x, ch.y, NW.LIFT); c.save(); c.font = "800 10px system-ui"; c.textAlign = "center";
  const w = c.measureText(text).width + 12, x = p.x, y = p.y - 62 - Math.sin(now * 3) * 1.2;
  c.fillStyle = "rgba(255,248,230,.96)"; c.strokeStyle = "#7a3a1c"; c.lineWidth = 1.4; c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - 12, w, 17, 6) : c.rect(x - w / 2, y - 12, w, 17); c.fill(); c.stroke();
  c.fillStyle = "#4a2810"; c.fillText(text, x, y + 0.5); c.restore();
}
function carried(c, a, k, t) { // meja diangkat / diturunkan: bergeser mulus antara tangan Atuk dan tempatnya (tanpa lompat)
  const e = k, gx = lerpv(a.x + 0.35, TABLE.x, e), gy = lerpv(a.y, TABLE.y, e), lift = 22 * (1 - e), sc = lerpv(0.55, 1, e);
  const p = NW.P(gx, gy, NW.LIFT); c.save(); c.translate(p.x, p.y - lift); c.scale(sc, sc); c.translate(-p.x, -p.y);
  NW.kedaiArt.table(c, { x: gx, y: gy }, t); c.restore();
}
const lerpv = (a, b, k) => a + (b - a) * k;
function layer() {
  const out = [], T_ = life.table, A = life.atuk, now = performance.now() / 1000;
  const carryingA = T_.state === "carried" || T_.state === "placing" || T_.state === "lifting";
  if (T_.state === "down") out.push({ d: TABLE.x + TABLE.y, draw: (c) => NW.kedaiArt.table(c, TABLE, NW.t || 0) });
  for (const b of BENCHES) out.push({ d: b.x + b.y - 0.2, draw: (c) => NW.kedaiArt.bench(c, b) });
  for (const v of villagers) if (v.vis) out.push({ d: v.x + v.y + 0.1, draw: (c) => {
    c.save(); c.globalAlpha = v.alpha; const hop = v.hop || 0; if (hop) c.translate(0, -hop);
    NW.drawCharacter(c, v, now);
    if (v.wave) { const p = NW.P(v.x, v.y, NW.LIFT); c.strokeStyle = v.style.skin; c.lineWidth = 2.6; c.lineCap = "round"; c.beginPath(); c.moveTo(p.x + 5, p.y - 24); c.lineTo(p.x + 11, p.y - 33 + Math.sin(now * 12) * 3); c.stroke(); }
    if (v.ball) { const p = NW.P(v.x + 0.5, v.y, NW.LIFT), by = -Math.abs(Math.sin(now * 5 + v.seed)) * 22; c.fillStyle = "#d63a3a"; c.beginPath(); c.arc(p.x, p.y - 6 + by, 3.4, 0, 6.3); c.fill(); }
    c.restore(); if (v.say) bubble(c, v, v.say, now);
  } });
  if (A.vis && A.seated) out.push({ d: SEAT.x + SEAT.y + 0.05, draw: (c) => { c.save(); c.globalAlpha = A.alpha; const p = NW.P(SEAT.x, SEAT.y, NW.LIFT); NW.kedaiArt.atuk(c, p.x, p.y, now, atuk); c.restore(); if (A.say) bubble(c, { x: SEAT.x, y: SEAT.y - 0.4 }, A.say, now); } });
  else if (A.vis) out.push({ d: A.x + A.y + 0.1, draw: (c) => {
    c.save(); c.globalAlpha = A.alpha; NW.drawCharacter(c, Object.assign(aChar, { sit: false }), now); c.restore();
    if (A.carry && T_.state === "carried") { c.save(); c.globalAlpha = A.alpha; carried(c, A, 0, now); c.restore(); }
    if (A.say) bubble(c, A, A.say, now);
  } });
  if (carryingA && T_.state !== "carried") out.push({ d: A.x + A.y + 0.3, draw: (c) => carried(c, A, T_.k, now) });
  return out;
}
// ---------- 3) pasang hooks ke area (membungkus, tidak mengganti) ----------
const H = area.hooks, o = { points: H.points, interact: H.interact, update: H.update, layer: H.layer };
H.layer = (t) => (o.layer ? o.layer(t) : []).concat(layer());
H.update = (dt, api) => { if (o.update) o.update(dt, api); update(dt, api); };
H.interact = (t, api) => {
  if (t.id !== "kedai") return o.interact ? o.interact(t, api) : undefined;
  const k = N().S.kedai || (N().S.kedai = D.fresh()), left = D.dailyLeft(N().S, D.dayStr());
  const coin = left > 0 ? `Hadiah koin hari ini masih ada: ${left} Koin Kedai.` : D.pick("batas", 0);
  if (!life.atuk.vis) { // Atuk & anak-anak sedang di dalam rumah: tetap bisa main (malam / sebelum pukul 06.00)
    N().sfx("kedai_tawa");
    api.openDialog({ name: "Atuk Bahar", avatar: "👴", role: "Dari balik pintu", lines: ["Tok tok… eh, kamu rupanya! Kedai tutup, tapi papan permainan Atuk bawa masuk. Mau main di dalam?", coin], options: [{ label: "🎲 Ayo main!", act: () => enter() }], noLater: false });
    return;
  }
  setMode("laugh", 2.2); N().sfx("kedai_tawa");
  api.openDialog({ name: "Atuk Bahar", avatar: "👴", role: "Juara sekampung (katanya)", lines: [D.pick("sapa", 0), coin], options: [{ label: "🎲 Ayo main!", act: () => enter() }], noLater: false });
};

// ---------- 4) buka / tutup ----------
function enter() {
  N().save(); atuk.mode = "talk"; atuk.t = 1;
  NW.kedaiUI.open({ onClose: () => { N().save(); } });
}
const isOpen = () => NW.kedaiUI.isOpen();

// ---------- 5) data, hasil, gelar ----------
function ensureAward() {
  const S = N().S; if (!S.kedai || !S.kedai.title || !NW.adv) return;
  NW.adv.award({ id: D.TITLE.id, icon: D.TITLE.icon, name: D.TITLE.name, desc: "Mengalahkan Atuk Bahar di tingkat GOAT pada kelima permainan Kedai.", kind: "gelar" });
}
function migrate(S) {
  const had = !!S.kedai; D.migrate(S);
  if (S.kedai.title && NW.adv) { try { NW.adv.migrate && 0; ensureAward(); } catch (e) {} }
  return had;
}
// dipanggil UI saat pertandingan selesai (SATU kali per pertandingan)
function onResult(game, diff, won, score) {
  const S = N().S; if (!S.kedai) D.migrate(S);
  const res = D.finish(S, game, diff, won, score, D.dayStr());
  if (!res) return { status: "none", coins: 0 };
  if (res.title) {
    ensureAward();
    if (NW.adv && NW.adv.addNote) NW.adv.addNote({ id: "kedai:penakluk", area: "muara", title: "Penakluk Atuk Bahar", text: "Di Kedai Atuk Bahar, Muara Kampung, kamu menaklukkan kelima permainan tradisional di tingkat GOAT. Atuk mengangkat pecinya dan menyebutmu legenda." });
  }
  atuk.mode = won ? "laugh" : "laugh"; atuk.t = 2.5;
  N().save();
  return res;
}
NW.kedaiLife = life;
NW.kedai = { migrate, onResult, isOpen, enter, ensureAward, B, SEAT, TABLE, SPOT, atuk, setMode, D, life, DOOR, DOOR_IN };
})();
