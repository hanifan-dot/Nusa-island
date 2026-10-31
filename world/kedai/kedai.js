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
  M.buildings.push(Object.assign({}, B, { draw: (c, b, t, night) => NW.kedaiArt.kedai(c, b, t, night) }));
  M.solids.push({ x0: B.x0 + 0.02, y0: B.y0 + 0.02, x1: B.x1 - 0.02, y1: B.y1 - 0.02 }, { x: TABLE.x, y: TABLE.y, r: 0.62 }, { x: SEAT.x, y: SEAT.y, r: 0.3 });
  for (const b of BENCHES) M.solids.push({ x: b.x, y: b.y, r: 0.32 });
  M.points.push({ id: "kedai", x: SPOT.x, y: SPOT.y, r: 1.5, icon: "👴", label: "Bermain dengan Atuk" });
  M.lights.push({ x: TABLE.x, y: TABLE.y, z: 26, r: 56, col: "#ffb347", k: 1.1 });
})();

// ---------- 2) Atuk & suasana ----------
const atuk = { mode: "idle", t: 0, next: 4, talking: false };
function setMode(m, secs) { atuk.mode = m; atuk.t = secs; }
const villagers = [
  { x: BENCHES[0].x, y: BENCHES[0].y - 0.05, dir: 4, style: { shirt: "#3d6f8f", pants: "#4a3b2c", skin: "#a8714a", hair: "#2a1d14", hat: "cap", hatCol: "#173f50", scale: 0.8 }, seed: 1.1 },
  { x: BENCHES[1].x, y: BENCHES[1].y + 0.05, dir: 0, style: { shirt: "#c2603b", pants: "#5b3a5c", skin: "#c99066", hair: "#2a1d14", hat: "scarf", hatCol: "#e0b84c", scale: 0.8 }, seed: 2.2 },
].map((v) => Object.assign({ moving: false, walk: 0, sit: true }, v));

function update(dt, api) {
  atuk.next -= dt;
  const p = api && api.player, near = p && Math.hypot(p.x - SEAT.x, p.y - SEAT.y) < 4.2;
  if (atuk.t > 0) { atuk.t -= dt; if (atuk.t <= 0) atuk.mode = near ? "gesture" : "idle"; }
  if (atuk.next <= 0 && atuk.t <= 0) {
    const r = Math.random();
    if (near) { if (r < 0.45) { setMode("laugh", 1.8); N().sfx("kedai_tawa"); } else setMode("gesture", 2.2); atuk.next = 4 + Math.random() * 4; }
    else { if (r < 0.3) setMode("laugh", 1.4); else if (r < 0.65) setMode("gesture", 2); atuk.next = 5 + Math.random() * 6; }
  }
}
function layer() {
  const out = [];
  out.push({ d: TABLE.x + TABLE.y, draw: (c) => NW.kedaiArt.table(c, TABLE, NW.t || 0) });
  for (const b of BENCHES) out.push({ d: b.x + b.y - 0.2, draw: (c) => NW.kedaiArt.bench(c, b) });
  const now = performance.now() / 1000;
  for (const v of villagers) out.push({ d: v.x + v.y + 0.1, draw: (c) => NW.drawCharacter(c, v, now) });
  out.push({ d: SEAT.x + SEAT.y + 0.05, draw: (c) => { const p = NW.P(SEAT.x, SEAT.y, NW.LIFT); NW.kedaiArt.atuk(c, p.x, p.y, now, atuk); } });
  return out;
}
// ---------- 3) pasang hooks ke area (membungkus, tidak mengganti) ----------
const H = area.hooks, o = { points: H.points, interact: H.interact, update: H.update, layer: H.layer };
H.layer = (t) => (o.layer ? o.layer(t) : []).concat(layer());
H.update = (dt, api) => { if (o.update) o.update(dt, api); update(dt, api); };
H.interact = (t, api) => {
  if (t.id !== "kedai") return o.interact ? o.interact(t, api) : undefined;
  setMode("laugh", 2.2); N().sfx("kedai_tawa");
  const k = N().S.kedai || (N().S.kedai = D.fresh()), left = D.dailyLeft(N().S, D.dayStr());
  api.openDialog({ name: "Atuk Bahar", avatar: "👴", role: "Juara sekampung (katanya)", lines: [D.pick("sapa", 0), left > 0 ? `Hadiah koin hari ini masih ada: ${left} Koin Kedai.` : D.pick("batas", 0)], options: [{ label: "🎲 Ayo main!", act: () => enter() }], noLater: false });
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
NW.kedai = { migrate, onResult, isOpen, enter, ensureAward, B, SEAT, TABLE, SPOT, atuk, setMode, D };
})();
