// NUSA ISLAND — Ide 08D · Halaman Sosial Rumahku: meja makan, nampan, tawaran makanan, tamu, kursi, animasi sosial, siang/malam.
// SERVER yang memutuskan (backend PR #61, CONTRACT-08D): porsi, kualitas aman, siapa yang boleh makan, izin tamu, kedaluwarsa 60 dtk, rebutan porsi terakhir.
// KLIEN hanya: mengirim niat (+ id publik rumah/tamu `pid`), menampilkan jawaban, dan menutup tawaran saat tamu/pemilik tidak lagi hadir (kehadiran = realtime Rumahku
// yang sudah ada: NW.mp). Tidak ada posisi/animasi per frame ke Firestore. Tidak ada koin/buff dari klien. Dimuat hanya bila NUSA_DAPUR=true; aktif hanya bila
// gameFlags.dapurRumahku=true (tamu juga butuh socialHome). Tata letak halaman TETAP (dapur/halaman.js); placement bebas = 08E.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDapurCore, HL = NW.dapurHalaman; if (!Core || !HL || !NW.room) return;
const N = () => window.Nusa, $ = (id) => document.getElementById(id), api = () => NW.dapur && NW.dapur.api;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2, now = () => Date.now();
const F_SIT = 2, F_IN = 16;                                                    // bendera tampilan protokol multiplayer (mp/proto.js)
const SAFE = { enak: "Enak sekali", lumayan: "Lumayan", aneh: "Rasanya aneh" };  // kualitas AMAN yang boleh tampil ke tamu (server menolak masakan gagal)
const TIERC = { enak: "#2fb39a", lumayan: "#c9a45c", aneh: "#a98f58" };
const EMO = { puas: 2, biasa: 4, ragu: 1 };                                    // indeks emoji protokol: ❤️ 👍 😂 (reaksi kosmetik lewat jalur emoji yang sudah ada)

const S = {
  on: false, mode: null, key: "", own: { table: [], offers: [], dishes: [], ok: false }, guest: { table: [], mine: [], ok: false },
  sheet: null, tab: "meja", pick: null, msg: "", busy: false, offer: null, seat: -1, occupied: {}, anim: null, empty: {}, eatRemote: {}, pendEat: [], gone: new Set(), hal: null, halKey: "", edit: null, ops: new Map(),
  lastOwner: 0, lastGuest: 0, live: false, absent: false, sentKeluar: false, ownerPid: "", seatLock: 0, snapTable: null, ambT: 0, calm: false, ownerName: "", expiredAt: 0,
};
const CALM_KEY = "nusa-dapur-tenang";
function calm() { try { const v = localStorage.getItem(CALM_KEY); if (v === "1") return true; if (v === "0") return false; return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }

// ---------- suara (lazy; ikut pengaturan suara lewat NW.dapurMasak.snd) ----------
const snd = (n) => { try { NW.dapurMasak && NW.dapurMasak.snd && NW.dapurMasak.snd(n); } catch (e) { /* tanpa suara tidak apa-apa */ } };
const toast = (m, k) => { try { N().toast(m, k); } catch (e) { /* tampilan saja */ } };

// ---------- konteks ----------
const home = () => NW.home, mpv = () => (NW.mp && NW.mp.view ? NW.mp.view() : null);
const inYard = () => { const h = home(); return !!(h && h.active && h.scene === "plot"); };
const visit = () => (home() ? home().visit : null);
const lvNow = () => { const v = visit(); return v ? v.home.level : (N().S.home && N().S.home.level) || 1; };
const myPid = () => { const HC = window.NusaHouseCore, u = NW.cloud && NW.cloud.user; return HC && u && u.uid ? HC.pidOf(u.uid) : ""; };
const roomLive = () => { const v = mpv(); return !!(v && v.online && v.house); };
const playersHere = () => { const v = mpv(); return v && v.online && v.house ? v.players : []; };
const guestsHere = () => playersHere().filter((p) => !p.owner && p.hid && !(p.f & F_IN));
const ownerHere = () => playersHere().some((p) => p.owner && !(p.f & F_IN));
const nameOfPid = (pid) => { const p = playersHere().find((q) => q.hid === pid); return p ? p.name : "Tamu"; };
const player = () => NW.world.player;

// ---------- id operasi: dipakai ulang sampai server menjawab pasti (retry aman, tanpa porsi ganda) ----------
const opFor = (key) => { let o = S.ops.get(key); if (!o) { o = Core.newOpId(); S.ops.set(key, o); if (S.ops.size > 60) S.ops.delete(S.ops.keys().next().value); } return o; };
const settle = (key) => S.ops.delete(key);
const definite = (e) => !!(e && (e.code === "failed-precondition" || e.code === "invalid-argument" || e.code === "not-found" || e.code === "unauthenticated" || e.code === "permission-denied"));
function errText(e) {
  const m = e && e.message ? String(e.message) : "";
  if (e && e.code === "unavailable") return "Jaringan bermasalah. Coba lagi — tidak ada yang hilang.";
  if (e && e.code === "resource-exhausted") return "Terlalu cepat. Coba lagi sebentar.";
  if (e && e.code === "not-found") return "Fitur ini belum dibuka server.";
  return m || "Gagal. Coba lagi.";
}
async function guarded(key, fn, ok, fail) {
  if (S.busy) return false; S.busy = true; S.msg = ""; render();
  let good = false;
  try { const r = await fn(opFor(key)); settle(key); good = true; if (ok) ok(r); }
  catch (e) { if (definite(e)) settle(key); S.msg = errText(e); if (fail) fail(e); }
  S.busy = false; render(); return good;
}

// ---------- sinkron server ----------
function absorbOwner(m) {
  if (!m) return;
  if (S.snapTable) inferEat(S.snapTable, m.table || []);
  S.snapTable = (m.table || []).map((x) => ({ s: x.s, left: x.left, name: x.name }));
  S.own.table = m.table || []; S.own.offers = m.offers || []; S.own.ok = true; S.own.slots = m.slots || 6;
  applyHalaman(m.halaman);
}
function absorbGuest(m) {
  if (!m) return;
  if (S.snapTable) inferEat(S.snapTable, m.table || []);
  S.snapTable = (m.table || []).map((x) => ({ s: x.s, left: x.left, name: x.name }));
  S.guest.table = m.table || []; S.guest.mine = m.mine || []; S.guest.ok = true;
  applyHalaman(m.halaman);
}
// ---------- tata letak halaman (08E): posisi efektif DARI SERVER; tidak ada penyimpanan lokal ----------
function applyHalaman(h) {
  if (!h || !h.items) return; S.hal = h; if (S.edit) return;   // sedang menata: salinan kerja jangan ditimpa
  const j = lvNow() + ":" + JSON.stringify(h.items); if (j === S.halKey) return; S.halKey = j; HL.setItems(GEO.resolve(lvNow(), h.items).items, lvNow()); onLayoutChanged();   // dicek ulang pada level lokal: tak pernah tampil susunan tak sah
}
function onLayoutChanged() {   // benda berpindah: yang duduk di kursi yang pindah berdiri; yang terjepit di dalam benda digeser ke titik bebas terdekat
  if (!inYard()) return; const P = player(), L = HL.layout(lvNow());
  if (S.seat >= 0 && NW.world.seat && NW.world.seat.on) { const c = L.chairs[S.seat]; if (!c || Math.hypot(P.x - c.x, P.y - c.y) > 0.6) { NW.world.standUp(); S.seat = -1; } else return; }
  const w = home().walkable; if (!w || w(P.x, P.y)) return;
  for (let r = 0.25; r <= 4; r += 0.25) for (let a = 0; a < 16; a++) { const x = P.x + Math.cos(a * Math.PI / 8) * r, y = P.y + Math.sin(a * Math.PI / 8) * r; if (w(x, y)) { P.x = x; P.y = y; return; } }
}
let ownerBusy = false, guestBusy = false;
async function ownerSync() {
  if (ownerBusy || !api()) return; ownerBusy = true; S.lastOwner = now();
  try { const r = await api().mejaState({}); absorbOwner(r.meja); } catch (e) { /* kegagalan jaringan: tampilan lama dipertahankan */ }
  ownerBusy = false; render();
}
async function loadDishes() { try { const r = await api().state(); S.own.dishes = (r && ((r.dapur && r.dapur.dishes) || r.dishes)) || []; } catch (e) { /* nampan lama tetap */ } render(); }
async function guestSync() {
  const v = visit(); if (guestBusy || !api() || !v) return; guestBusy = true; S.lastGuest = now(); const key = S.key;
  try { const r = await api().mejaLihat({ owner: v.pid }); if (key !== S.key) { guestBusy = false; return; } absorbGuest(r.meja); updateOffer(); }
  catch (e) { if (e && e.code === "permission-denied") { S.guest.mine = []; closeOffer("Kamu tidak lagi punya izin di rumah ini."); } }
  guestBusy = false; render();
}
// kurang porsi di slot yang BUKAN karena aksiku → pemain duduk terdekat di slot itu tampak sedang makan (perkiraan tampilan; hasil sebenarnya dari server)
function inferEat(prev, cur) {
  const L = HL.layout(lvNow()), t = now() / 1000, sit = playersHere().filter((p) => (p.f & F_SIT) && !(p.f & F_IN));
  for (const a of prev) {
    const b = cur.find((x) => x.s === a.s);
    if (b && b.left < a.left || (!b && a.left >= 1)) {
      if (!b && !(S.mine[a.s] && now() - S.mine[a.s] < 6000)) S.empty[a.s] = now() + 25000;
      const sl = L.slots[a.s]; let best = null, bd = 3.2;
      for (const p of sit) { const d = Math.hypot(p.x - sl.x, p.y - sl.y); if (d < bd) { bd = d; best = p; } }
      if (S.mine[a.s] && now() - S.mine[a.s] < 3000) continue;
      if (best) S.eatRemote[best.id] = t + (S.calm ? 1.6 : 2.6);
      else S.pendEat.push({ s: a.s, until: t + 7 });   // tamu baru berjalan ke kursi: cocokkan begitu ia duduk dekat slot itu
    }
  }
}
function matchPendEat() {
  if (!S.pendEat.length) return; const L = HL.layout(lvNow()), t = now() / 1000, sit = playersHere().filter((p) => (p.f & F_SIT) && !(p.f & F_IN) && !(S.eatRemote[p.id] > t));
  S.pendEat = S.pendEat.filter((q) => {
    if (q.until < t) return false; const sl = L.slots[q.s]; let best = null, bd = 3.2;
    for (const p of sit) { const d = Math.hypot(p.x - sl.x, p.y - sl.y); if (d < bd) { bd = d; best = p; } }
    if (!best) return true; S.eatRemote[best.id] = t + (S.calm ? 1.6 : 2.6); sit.splice(sit.indexOf(best), 1); return false;
  });
}
S.mine = {};

// ---------- aksi pemilik ----------
const slotsFree = () => { const used = new Set(S.own.table.map((x) => x.s)); const out = []; for (let i = 0; i < 6; i++) if (!used.has(i)) out.push(i); return out; };
function taruh(dish, slot) {
  const d = S.own.dishes.find((x) => x.u === dish); if (!d) return;
  guarded("taruh:" + dish + ":" + slot, (op) => api().mejaTaruh({ opId: op, dish, slot }), (r) => {
    absorbOwner(r.meja); S.own.dishes = S.own.dishes.filter((x) => x.u !== dish); S.msg = `${d.name} ditaruh di slot ${slot + 1} (${r.portions} porsi).`;
    startAnim({ kind: "taruh", slot, dur: S.calm ? 0.6 : 1.1 }); snd("dapur_taruh");
  });
}
function ambil(slot) {
  guarded("ambil:" + slot, (op) => api().mejaAmbil({ opId: op, slot }), (r) => { absorbOwner(r.meja); S.msg = "Makanan dikembalikan ke nampan."; snd("dapur_taruh"); loadDishes(); });
}
function bersih(slot) {
  guarded("bersih:" + slot, (op) => api().mejaBersih({ opId: op, slot }), (r) => { absorbOwner(r.meja); S.msg = "Sisa dibersihkan. Piring kotor bertambah satu."; snd("dapur_piring"); });
}
function tawar(slot, to) {
  guarded("tawar:" + slot + ":" + to, (op) => api().mejaTawar({ opId: op, slot, to }), (r) => {
    absorbOwner(r.meja); S.pick = null; S.msg = `Tawaran dikirim ke ${nameOfPid(to)} (berlaku ${r.secLeft || 60} dtk).`;
    startAnim({ kind: "tawar", slot, dur: S.calm ? 0.8 : 1.6 }); snd("dapur_ding");
  });
}
function batal(id) { guarded("batal:" + id, (op) => api().mejaBatal({ opId: op, offer: id }), (r) => { absorbOwner(r.meja); S.msg = "Tawaran dibatalkan."; }); }
async function tutupSesi() {   // pemilik meninggalkan halaman: semua tawaran terbuka ditutup; makanan tetap aman di meja
  if (!S.own.offers.length && !S.own.ok) return;
  const key = "tutup"; try { await api().mejaTutup({ opId: opFor(key) }); settle(key); } catch (e) { if (definite(e)) settle(key); }
  S.own.offers = [];
}
// ---------- aksi tamu ----------
function updateOffer() {
  const mine = S.guest.mine || [];
  if (!presentGuest()) { if (S.offer) closeOffer(); return; }
  const o = mine.find((x) => !S.gone.has(x.id) && (S.guest.table || []).some((t) => t.s === x.s && t.left > 0));   // tawaran yang sudah dijawab/kedaluwarsa/habis tidak dimunculkan lagi
  if (o) {
    if (!S.offer || S.offer.id !== o.id) { S.offer = { id: o.id, s: o.s, name: o.name, tier: o.tier, until: now() + o.secLeft * 1000, phase: "open" }; S.sheet = S.sheet || "lihat"; snd("dapur_ding"); toast(`🍽️ ${ownerName()} menawarkan ${o.name}`, "good"); openSheet("lihat"); }
    else S.offer.until = Math.min(S.offer.until, now() + o.secLeft * 1000 + 800);
  } else if (S.offer && S.offer.phase === "open") closeOffer("Tawaran sudah tidak berlaku.");
}
const ownerName = () => { const v = visit(); return v ? v.name : "Pemilik"; };
function closeOffer(msg) { if (S.offer) S.gone.add(S.offer.id); S.offer = null; if (msg) S.msg = msg; render(); }
const presentGuest = () => S.mode === "guest" && inYard() && roomLive() && ownerHere();
function jawab(accept) {
  const o = S.offer, v = visit(); if (!o || !v || o.phase !== "open") return;
  if (o.until <= now()) { o.phase = "expired"; render(); return; }
  guarded("jawab:" + o.id + ":" + accept, (op) => api().tawaranJawab({ opId: op, owner: v.pid, offer: o.id, accept }), (r) => {
    S.gone.add(o.id); absorbGuest(r.meja);
    if (r.answered === "ditolak") { S.offer = null; S.msg = "Tawaran ditolak. Tidak apa-apa 🙂"; return; }
    S.mine[o.s] = now(); S.offer = null; S.msg = "";
    eatSequence(r.ate || { name: o.name, tier: o.tier, effect: "biasa", ms: 0 }, o.s);
  }, (e) => {
    if (definite(e)) { const m = String(e.message || ""); S.gone.add(o.id); S.offer = null; S.msg = /habis/i.test(m) ? "Maaf, porsinya sudah habis. Terima kasih sudah mau mencoba 🙏" : /kedaluwarsa/i.test(m) ? "Tawarannya sudah kedaluwarsa." : e.code === "permission-denied" ? "Kamu tidak lagi punya izin di rumah ini." : m; guestSync(); }
  });
}
async function keluarSesi(ownerPid) {   // tamu pergi: tawaran terbukanya ditutup (best effort; server tetap menjaga izin & kedaluwarsa 60 dtk)
  if (!ownerPid || S.sentKeluar) return; S.sentKeluar = true; const key = "keluar:" + ownerPid;
  try { await api().mejaKeluar({ opId: opFor(key), owner: ownerPid }); settle(key); } catch (e) { if (definite(e)) settle(key); }
}

// ---------- animasi sosial (lokal, tampilan saja) ----------
function startAnim(a) { S.anim = Object.assign({ t: 0 }, a); }
function eatSequence(ate, slot) {
  const info = Core.eatInfo(ate.effect || "biasa"), L = HL.layout(lvNow()), P = player(), calmOn = S.calm;
  const chair = S.seat >= 0 ? L.chairs[S.seat] : nearestFree(L);
  S.anim = { kind: "makan", t: 0, phase: S.seat >= 0 ? "makan" : "ambil", ate, slot, info, chair: chair ? chair.id : -1, from: { x: P.x, y: P.y }, ph: { ambil: calmOn ? 0.5 : 0.9, makan: calmOn ? 1.5 : 2.6, reaksi: calmOn ? 1.2 : 1.9 } };
  snd("dapur_piring");
}
function nearestFree(L) {   // kursi kosong terdekat DARI TAMU, tetapi utamakan yang dekat meja (pemilik boleh memindahkan meja jauh dari bangku/kursi)
  const P = player(), T = { x: (L.table.x0 + L.table.x1) / 2, y: (L.table.y0 + L.table.y1) / 2 }; let best = null, bd = 1e9, near = null, nd = 1e9;
  for (const c of L.chairs) {
    if (S.occupied[c.id] && S.occupied[c.id] !== "me") continue; const d = Math.hypot(c.x - P.x, c.y - P.y);
    if (d < bd) { bd = d; best = c; } if (Math.hypot(c.x - T.x, c.y - T.y) <= 2.4 && d < nd) { nd = d; near = c; }
  }
  return near || best;
}
function sitOn(ch) {
  const L = HL.layout(lvNow()), T = L.table; S.seat = ch.id; S.seatLock = now() + 700;
  NW.world.sitAt({ x: ch.x, y: ch.y, dir: ch.dir }, { onStand: () => { if (S.seat === ch.id) S.seat = -1; } });
  try { NW.world.faceToward(player(), ch.bench ? { x: ch.x, y: ch.y + 2 } : { x: (T.x0 + T.x1) / 2, y: (T.y0 + T.y1) / 2 }); } catch (e) { /* tampilan saja */ }
  snd("dapur_taruh");
}
function stepAnim(dt) {
  const A = S.anim; if (!A) return; A.t += dt;
  const P = player();
  if (A.kind === "makan") {
    const L = HL.layout(lvNow()), ph = A.ph;
    if (A.phase === "ambil") {
      const ch = L.chairs[A.chair]; if (!ch) { S.anim = null; return; }
      const k = clamp(A.t / ph.ambil, 0, 1), moved = Math.hypot(P.x - (A.from.x + (ch.x - A.from.x) * Math.max(0, k - 0.05)), P.y - (A.from.y + (ch.y - A.from.y) * Math.max(0, k - 0.05))) > 0.45;
      if (moved && A.t > 0.15) { S.anim = null; return; }   // pemain menggeser joystick sendiri: urutan dibatalkan (porsi tetap sudah dimakan di server)
      P.x = A.from.x + (ch.x - A.from.x) * k; P.y = A.from.y + (ch.y - A.from.y) * k; P.moving = k < 1; A.tickT = (A.tickT || 0) + dt;
      if (k >= 1) { sitOn(ch); A.phase = "makan"; A.t = 0; A.bite = 0; }
    } else if (A.phase === "makan") {
      A.bite = (A.bite || 0) + dt; if (A.bite > 0.5) { A.bite = 0; snd("dapur_sendok"); }
      if (A.t >= ph.makan) { A.phase = "reaksi"; A.t = 0; reactSelf(A); }
    } else if (A.phase === "reaksi") {
      if (A.t >= ph.reaksi) { const c = A.chair; if (!S.guest.table.some((x) => x.s === A.slot)) S.empty[A.slot] = now() + 25000; S.plateAt = { chair: c, until: now() + 25000 }; S.anim = null; }
    }
    return;
  }
  if (A.t >= A.dur) S.anim = null;
}
function reactSelf(A) {
  const e = A.ate.effect || "biasa", T = Core.eatInfo(e);
  snd(e === "puas" ? "dapur_puas" : e === "ragu" ? "dapur_ragu" : "dapur_ding");
  try { if (NW.mp && NW.mp.sendEmote && EMO[e] != null) NW.mp.sendEmote(EMO[e]); } catch (x) { /* kosmetik */ }
  A.face = T.emoji; toast(`${T.emoji} ${A.ate.name}: ${T.line}`, e === "puas" ? "good" : undefined);
}
// perkakas di tangan pemain / pemain jauh
function drawProps(c, ch, t, A, remote) {
  const P = NW.P, gz = 0, base = P(ch.x, ch.y, gz), sitting = !!ch.sit, hz = sitting ? 14 : 26;
  const hand = P(ch.x, ch.y, hz); hand.x += 9; hand.y += 0;
  if (remote) {   // pemain jauh sedang makan (perkiraan tampilan): piring kecil + sendok naik-turun
    const k = Math.sin(t * 7) * 0.5 + 0.5, h = P(ch.x, ch.y, 20 + k * 6);
    HL.plate(c, h.x + 10, h.y + 6, 0.5, "umum", "enak", 0.6, false); c.strokeStyle = "#cfd2cf"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(h.x + 4, h.y + 3); c.lineTo(h.x - 1, h.y - 6 - k * 3); c.stroke(); return;
  }
  if (!A) { const pl = S.plateAt; if (pl && pl.until > now() && S.seat === pl.chair) { const L = HL.layout(lvNow()), ch2 = L.chairs[pl.chair], T = L.table, tx = clamp(ch2.x, T.x0 + 0.2, T.x1 - 0.2), ty = clamp(ch2.y, T.y0 + 0.2, T.y1 - 0.2), p = P(tx, ty, HL.TZ + 0.6); HL.plate(c, p.x, p.y, 0.92, "umum", "enak", 0, true); } return; }
  if (A.kind === "seruput") {
    const k = clamp(A.t / A.dur, 0, 1), up = Math.sin(k * Math.PI), h = P(ch.x, ch.y, 24 + up * 14);
    c.fillStyle = "#fbfbf6"; c.fillRect(h.x + 4, h.y - 8, 7, 7); c.fillStyle = "#6b4527"; c.fillRect(h.x + 4.6, h.y - 8.4, 5.8, 2); c.strokeStyle = "#fbfbf6"; c.lineWidth = 1.4; c.beginPath(); c.arc(h.x + 11.4, h.y - 5, 2.2, -1.4, 1.4); c.stroke();
    if (!S.calm) { c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1; for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(h.x + 6 + i * 3, h.y - 10); c.quadraticCurveTo(h.x + 4 + i * 3 + Math.sin(t * 5 + i) * 2, h.y - 15, h.x + 6 + i * 3, h.y - 20); c.stroke(); } }
    return;
  }
  if (A.kind === "taruh") {
    const L = HL.layout(lvNow()), sl = L.slots[A.slot], k = clamp(A.t / A.dur, 0, 1), e = k * k * (3 - 2 * k), tp = P(sl.x, sl.y, HL.TZ + 0.6 + Math.sin(k * Math.PI) * 8), x = hand.x + (tp.x - hand.x) * e, y = hand.y + (tp.y - hand.y) * e;
    HL.plate(c, x, y, 0.92, "umum", "enak", 1, false); return;
  }
  if (A.kind === "tawar") { const k = clamp(A.t / A.dur, 0, 1), h = P(ch.x, ch.y, 30 + Math.sin(k * Math.PI) * 10); HL.plate(c, h.x + 8, h.y, 0.9, "umum", "enak", 1, false); const a = 1 - k; if (!S.calm) { c.fillStyle = `rgba(255,214,90,${a.toFixed(2)})`; c.font = "800 14px system-ui"; c.textAlign = "center"; c.fillText("✨", h.x + 8, h.y - 12 - k * 8); } return; }
  if (A.kind === "makan") {
    const ph = A.phase, L = HL.layout(lvNow()), sl = L.slots[A.slot] || L.slots[0];
    if (ph === "ambil") { const h = P(ch.x, ch.y, 26); HL.plate(c, h.x + 8, h.y, 0.9, HL.foodKind(A.ate.name), A.ate.tier, 1, false); }
    else if (ph === "makan") {
      const T = L.table, tx = clamp((L.chairs[A.chair] || sl).x, T.x0 + 0.2, T.x1 - 0.2), ty = clamp((L.chairs[A.chair] || sl).y, T.y0 + 0.2, T.y1 - 0.2), p = P(tx, ty, HL.TZ + 0.6), k = Math.sin(t * 6) * 0.5 + 0.5, f = 1 - clamp(A.t / A.ph.makan, 0, 1) * 0.8;
      HL.plate(c, p.x, p.y, 0.92, HL.foodKind(A.ate.name), A.ate.tier, f, false);
      const sp = P(ch.x, ch.y, 18 + k * 8); c.strokeStyle = "#cfd2cf"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(p.x, p.y - 3); c.lineTo(sp.x + 3, sp.y - 6); c.stroke();
    } else if (ph === "reaksi") {
      const h = P(ch.x, ch.y, 52), k = clamp(A.t / A.ph.reaksi, 0, 1), bob = S.calm ? 0 : Math.sin(k * Math.PI) * 6;
      c.save(); c.globalAlpha = 1 - k * k * 0.7; c.font = "800 22px serif"; c.textAlign = "center"; c.fillStyle = "#000"; c.fillText(A.face || "🙂", h.x, h.y - 6 - bob);
      if (!S.calm && A.ate.effect === "puas") { c.font = "800 13px system-ui"; c.fillText("✨", h.x - 14, h.y - 14 - bob); c.fillText("✨", h.x + 14, h.y - 10 - bob); }
      if (A.ate.effect === "ragu") { c.font = "800 15px system-ui"; c.fillStyle = "#173f50"; c.fillText("?", h.x + 14, h.y - 12 - bob); }
      c.restore();
    }
  }
}

// ---------- penataan halaman oleh pemilik (08E) ----------
const GEO = NW.dapurGeo, ICON = { meja: "🍽️", kursi: "🪑", bangku: "🪑", kopi: "☕", tiang: "⛱️", tanaman: "🌿" };
const iconOf = (it) => (it.id === "lampu" ? "💡" : ICON[it.kind] || "▫️");
function startEdit() {
  if (S.mode !== "owner" || !S.own.ok || !S.hal) { toast("Tunggu sebentar, halaman belum tersinkron.", "bad"); return; }
  const lv = lvNow(), cur = HL.layout(lv).items, work = {}; for (const id of GEO.IDS) work[id] = cur[id].slice();
  S.edit = { sel: "meja", work, bad: {}, errs: [], ok: true, step: 0.25, drag: null, changed: false, rep: null }; revalidate(); S.msg = ""; HL.setItems(work, lv); openSheet("meja"); S.tab = "atur"; render();
}
function revalidate() {
  const E = S.edit; if (!E) return; const v = GEO.validate(lvNow(), E.work); E.errs = v.errors; E.bad = {}; for (const e of v.errors) E.bad[e.id] = true; E.ok = v.ok;
  const base = S.hal ? GEO.resolve(lvNow(), S.hal.items).items : GEO.defaults(lvNow()); E.changed = GEO.IDS.some((id) => Math.abs(E.work[id][0] - base[id][0]) > 1e-6 || Math.abs(E.work[id][1] - base[id][1]) > 1e-6);
}
function editMove(id, x, y) {
  const E = S.edit; if (!E) return; const p = [GEO.q05(x), GEO.q05(y)]; if (p[0] === E.work[id][0] && p[1] === E.work[id][1]) return;
  E.work[id] = p; HL.setItems(E.work, lvNow()); revalidate(); refreshEditUI();
}
function nudge(dir) {
  const E = S.edit; if (!E) return; const st = E.step, p = E.work[E.sel], d = { up: [-st, -st], down: [st, st], left: [-st, st], right: [st, -st] }[dir]; if (!d) return;
  editMove(E.sel, p[0] + d[0], p[1] + d[1]);
}
function editSel(id) { const E = S.edit; if (!E || !GEO.BY[id]) return; E.sel = id; refreshEditUI(); }
function editReset() { const E = S.edit; if (!E) return; const d = GEO.defaults(lvNow()); for (const id of GEO.IDS) E.work[id] = d[id].slice(); HL.setItems(E.work, lvNow()); revalidate(); refreshEditUI(); }
function editCancel() { S.edit = null; S.tab = "meja"; HL.setItems(S.hal ? GEO.resolve(lvNow(), S.hal.items).items : null, lvNow()); S.msg = ""; S.halKey = S.hal ? lvNow() + ":" + JSON.stringify(S.hal.items) : ""; render(); }
function editSave() {
  const E = S.edit; if (!E || !E.ok || S.busy) return; const items = GEO.diffFromDefault(lvNow(), E.work), key = "hal:" + JSON.stringify(items);
  guarded(key, (op) => api().halamanSimpan({ opId: op, items }), (r) => { S.edit = null; S.tab = "meja"; S.halKey = ""; absorbOwner(r.meja); toast("Halaman tersimpan ✅", "good"); S.msg = ""; });
}
// ketuk/geser benda di halaman langsung (di atas joystick: hanya bila mengenai benda)
function hitItem(cx, cy) {
  const E = S.edit; if (!E || !NW.world.toTile) return null; let best = null, bd = 1e9;
  for (const z of [0, 10, 24, 44]) { const q = NW.world.toTile(cx, cy, z);
    for (const it of GEO.ITEMS) { const p = E.work[it.id], r = GEO.rectOf(it, p), m = it.hw < 0.3 ? 0.32 : 0.12; if (q.x > r.x0 - m && q.x < r.x1 + m && q.y > r.y0 - m && q.y < r.y1 + m) { const d = Math.hypot(q.x - p[0], q.y - p[1]) + (it.id === E.sel ? -0.2 : 0); if (d < bd) { bd = d; best = { id: it.id, q: NW.world.toTile(cx, cy, 0) }; } } } }
  return best;
}
function onEditDown(e) {
  const E = S.edit; if (!E || e.target !== $("game")) return; const h = hitItem(e.clientX, e.clientY); if (!h) return;
  e.stopPropagation(); E.sel = h.id; const p = E.work[h.id]; E.drag = { pid: e.pointerId, ox: h.q.x - p[0], oy: h.q.y - p[1] }; try { $("game").setPointerCapture(e.pointerId); } catch (_) { /* tanpa capture tetap jalan */ } refreshEditUI();
}
function onEditMove(e) { const E = S.edit; if (!E || !E.drag || E.drag.pid !== e.pointerId) return; e.stopPropagation(); const q = NW.world.toTile(e.clientX, e.clientY, 0); editMove(E.sel, q.x - E.drag.ox, q.y - E.drag.oy); }
function onEditUp(e) { const E = S.edit; if (!E || !E.drag || E.drag.pid !== e.pointerId) return; e.stopPropagation(); E.drag = null; }
function editBody() {
  const chips = GEO.ITEMS.map((it) => `<button type="button" class="hl-pick" data-a="esel" data-id="${it.id}"><span>${iconOf(it)}</span>${esc(it.name)}</button>`).join("");
  return `<p class="kd-note hl-help">Pilih benda, lalu <b>geser dengan jari</b> di halaman atau pakai panah. Tamu tidak bisa mengubah.</p>
    <div class="hl-chips" role="listbox" aria-label="Benda halaman">${chips}</div>
    <div class="hl-editrow"><div class="hl-pad" aria-label="Geser benda terpilih"><span></span><button type="button" data-a="nudge" data-d="up" aria-label="Geser ke atas">▲</button><span></span><button type="button" data-a="nudge" data-d="left" aria-label="Geser ke kiri">◀</button><button type="button" data-a="step" class="hl-step" aria-label="Ubah langkah">·</button><button type="button" data-a="nudge" data-d="right" aria-label="Geser ke kanan">▶</button><span></span><button type="button" data-a="nudge" data-d="down" aria-label="Geser ke bawah">▼</button><span></span></div>
    <div class="hl-editr"><p class="hl-valid" id="hlValid" role="status"></p><div class="hl-edit-b"><button type="button" class="kd-btn gold" data-a="esimpan" id="hlSave">Simpan</button><button type="button" class="kd-btn" data-a="ebatal">Batal</button><button type="button" class="kd-btn ghost" data-a="ebawaan">Bawaan</button></div></div></div>`;
}
function refreshEditUI() {
  const E = S.edit, sh = $("hlSheet"); if (!E || !sh || S.tab !== "atur") return;
  sh.querySelectorAll(".hl-pick").forEach((b) => { const id = b.dataset.id; b.classList.toggle("sel", id === E.sel); b.classList.toggle("bad", !!E.bad[id]); b.setAttribute("aria-selected", id === E.sel ? "true" : "false"); });
  const v = $("hlValid"), first = E.errs.find((x) => x.id === E.sel) || E.errs[0];
  if (v) { v.className = "hl-valid " + (E.ok ? "ok" : "bad"); v.textContent = E.ok ? `✅ ${GEO.BY[E.sel].name}: posisi aman` : `⛔ ${first ? first.msg : "Posisi tidak sah."}`; }
  const sv = $("hlSave"); if (sv) sv.disabled = !E.ok || !E.changed || S.busy;
  const st = sh.querySelector(".hl-step"); if (st) { st.textContent = E.step >= 1 ? "×4" : "×1"; st.title = E.step >= 1 ? "Langkah besar" : "Langkah kecil"; }
  sh.querySelectorAll("[data-a=nudge],[data-a=ebawaan],[data-a=ebatal]").forEach((b) => { b.disabled = S.busy; });
}

// ---------- UI (sheet bawah ≤45% / panel samping lanskap) ----------
function ensureUI() {
  if ($("hlSheet")) return;
  const sh = document.createElement("div"); sh.id = "hlSheet"; sh.className = "kd-sheet hl-sheet hidden"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "false"); document.body.appendChild(sh);
  sh.addEventListener("click", onClick);
  NW.room.watchSheet(sh);
}
function openSheet(kind) {
  ensureUI(); if (kind !== S.sheet) S.msg = ""; S.sheet = kind; if (kind === "meja" || kind === "nampan") S.tab = kind; $("hlSheet").classList.remove("hidden", "mini"); document.body.classList.add("hl-open");
  if (S.mode === "owner") { ownerSync(); if (kind === "nampan" || S.tab === "nampan") loadDishes(); } render();
}
function closeSheet() { if (S.edit) { S.edit = null; S.tab = "meja"; HL.setItems(S.hal ? GEO.resolve(lvNow(), S.hal.items).items : null, lvNow()); } S.sheet = null; S.pick = null; const s = $("hlSheet"); if (s) { s.classList.add("hidden"); s.innerHTML = ""; } document.body.classList.remove("hl-open"); }
const tierChip = (t) => `<span class="hl-chip" style="background:${TIERC[t] || "#a98f58"}">${esc(SAFE[t] || t)}</span>`;
function ownerBody() {
  let h = `<div class="hl-tabs"><button type="button" class="kd-btn ${S.tab === "meja" ? "gold" : ""}" data-a="tab" data-v="meja">Meja (${S.own.table.length}/6)</button><button type="button" class="kd-btn ${S.tab === "nampan" ? "gold" : ""}" data-a="tab" data-v="nampan">Nampan (${S.own.dishes.length})</button><button type="button" class="kd-btn ${S.tab === "atur" ? "gold" : ""}" data-a="atur">🛠 Atur</button></div>`;
  if (S.tab === "atur") return h + editBody();
  if (S.tab === "meja") {
    h += `<ul class="kd-list hl-list">`;
    for (let i = 0; i < 6; i++) {
      const it = S.own.table.find((x) => x.s === i);
      if (!it) { h += `<li class="kd-row"><span class="kd-ic">${i + 1}</span><span class="kd-nm"><b>Slot ${i + 1}</b><small>kosong</small></span></li>`; continue; }
      const offs = S.own.offers.filter((o) => o.s === i);
      h += `<li class="kd-row" data-slot="${i}"><span class="kd-ic">${i + 1}</span><span class="kd-nm"><b>${esc(it.name)}</b><small>${tierChip(it.tier)} ${it.left}/${it.total} porsi${offs.length ? ` · ${offs.length} tawaran` : ""}</small></span>
        <button type="button" class="kd-btn gold hl-s" data-a="pick" data-s="${i}" ${S.busy || it.left <= 0 ? "disabled" : ""}>Tawarkan</button>
        ${it.touched ? `<button type="button" class="kd-btn hl-s" data-a="bersih" data-s="${i}" ${S.busy ? "disabled" : ""}>Bersihkan</button>` : `<button type="button" class="kd-btn hl-s" data-a="ambil" data-s="${i}" ${S.busy ? "disabled" : ""}>Ambil</button>`}</li>`;
    }
    h += `</ul>`;
    if (S.pick != null) {
      const gs = guestsHere(), it = S.own.table.find((x) => x.s === S.pick);
      h += `<p class="kd-note"><b>Tawarkan ${it ? esc(it.name) : ""} ke…</b> (tamu yang ada di halamanmu)</p><ul class="kd-list hl-guests">${gs.length ? gs.map((g) => `<li class="kd-row"><canvas class="hl-av" width="36" height="46" data-gid="${esc(g.id)}"></canvas><span class="kd-nm"><b>${esc(g.name)}</b></span><button type="button" class="kd-btn gold" data-a="tawar" data-s="${S.pick}" data-to="${esc(g.hid)}" ${S.busy ? "disabled" : ""}>Tawarkan</button></li>`).join("") : `<li class="kd-note">Belum ada tamu di halamanmu. Terima izin kunjungan lewat 👥 Teman.</li>`}</ul><button type="button" class="kd-btn ghost" data-a="pickx">Batal</button>`;
    }
    if (S.own.offers.length) h += `<p class="kd-note"><b>Tawaran terbuka</b></p><ul class="kd-list">${S.own.offers.map((o) => `<li class="kd-row"><span class="kd-nm"><b>${esc(nameOfPid(o.to))}</b><small>slot ${o.s + 1} · <span class="hl-dtk">${o.secLeft}</span> dtk</small></span><button type="button" class="kd-btn hl-s" data-a="batal" data-id="${esc(o.id)}" ${S.busy ? "disabled" : ""}>Batalkan</button></li>`).join("")}</ul>`;
  } else {
    const free = slotsFree();
    h += `<ul class="kd-list hl-list">${S.own.dishes.length ? S.own.dishes.map((d) => {
      const safe = !!SAFE[d.tier];
      return `<li class="kd-row"><span class="kd-ic">🍽️</span><span class="kd-nm"><b>${esc(d.name)}</b><small>${safe ? tierChip(d.tier) : `<span class="hl-chip bad">${esc(Core.tierInfo(d.tier).label)}</span> tidak bisa dihidangkan`}</small></span>${safe ? (free.length ? `<span class="hl-slots">${free.map((s) => `<button type="button" class="kd-btn gold hl-n" data-a="taruh" data-u="${esc(d.u)}" data-s="${s}" aria-label="Taruh di slot ${s + 1}" ${S.busy ? "disabled" : ""}>${s + 1}</button>`).join("")}</span>` : `<small>Slot penuh</small>`) : ""}</li>`;
    }).join("") : `<li class="kd-note">Nampan kosong. Masak dulu di dapur, lalu taruh di meja.</li>`}</ul>${S.own.dishes.length && free.length ? `<p class="kd-note">Ketuk nomor slot untuk menaruh makanan di meja.</p>` : ""}`;
  }
  return h;
}
function guestBody() {
  const t = S.guest.table;
  let h = `<ul class="kd-list hl-list">${t.length ? t.map((x) => `<li class="kd-row"><span class="kd-ic">${x.s + 1}</span><span class="kd-nm"><b>${esc(x.name)}</b><small>${tierChip(x.tier)} ${x.left} porsi tersisa</small></span></li>`).join("") : `<li class="kd-note">Meja masih kosong.</li>`}</ul>`;
  h += `<p class="kd-note">Kamu hanya bisa melihat. Makanan baru bisa dimakan setelah <b>${esc(ownerName())}</b> menawarkannya kepadamu.</p>`;
  return h;
}
function offerBody() {
  const o = S.offer, left = Math.max(0, Math.ceil((o.until - now()) / 1000)), exp = o.phase === "expired" || left <= 0;
  return `<div class="hl-offer"><div class="hl-offer-t"><span class="kd-ic">🍲</span><div><b>${esc(ownerName())} menawarkan ${esc(o.name)}</b><br>${tierChip(o.tier)} <small>satu porsi · slot ${o.s + 1}</small></div></div>
    <div class="hl-bar"><i style="width:${clamp(left / 60, 0, 1) * 100}%"></i></div><p class="kd-note" id="hlLeft">${exp ? "Tawaran sudah kedaluwarsa." : `Berlaku ${left} detik lagi.`}</p>
    <div class="hl-offer-b"><button type="button" class="kd-btn gold" data-a="terima" ${S.busy || exp ? "disabled" : ""}>Terima</button><button type="button" class="kd-btn" data-a="tolak" ${S.busy || exp ? "disabled" : ""}>Tolak</button></div></div>`;
}
function render() {
  const sh = $("hlSheet"); if (!sh) return;
  if (!S.sheet && !S.offer) { if (!sh.classList.contains("hidden")) { sh.classList.add("hidden"); sh.innerHTML = ""; sh._key = ""; document.body.classList.remove("hl-open"); } return; }
  sh.classList.remove("hidden"); document.body.classList.add("hl-open");
  const owner = S.mode === "owner", title = S.offer ? "🍽️ Tawaran makanan" : owner ? "🍽️ Meja Makan" : `🍽️ Meja ${esc(ownerName())}`;
  const body = S.offer ? offerBody() : owner ? ownerBody() : guestBody();
  const keep = sh.scrollTop;
  const html = `${NW.room.GRIP}<header><h3>${title}</h3><button type="button" class="kd-x" data-a="tutup" aria-label="Tutup">✕</button></header>${body}${S.msg ? `<p class="kd-note ${/gagal|tidak|maaf|bermasalah|habis/i.test(S.msg) ? "warn" : ""}" role="status">${esc(S.msg)}</p>` : ""}`;
  // jangan bangun ulang DOM bila yang berubah hanya hitung mundur: ketukan yang sedang berlangsung (down→up) tidak boleh hilang karena tombol diganti
  const key = html.replace(/Berlaku \d+ detik lagi\./g, "").replace(/width:[\d.]+%/g, "").replace(/<span class="hl-dtk">\d+<\/span>/g, "");
  if (sh._key === key && sh.firstChild) { refreshEditUI(); const v = [...html.matchAll(/<span class="hl-dtk">(\d+)<\/span>/g)].map((m) => m[1]); sh.querySelectorAll(".hl-dtk").forEach((el, i) => { if (v[i] != null) el.textContent = v[i]; }); return; }
  sh._key = key; sh.innerHTML = html;
  sh.scrollTop = keep; drawAvs(); refreshEditUI();
}
function drawAvs() {
  const cvs = document.querySelectorAll("#hlSheet canvas.hl-av"); if (!cvs.length || !NW.drawCharacter) return; const by = new Map(playersHere().map((p) => [p.id, p]));
  cvs.forEach((cv) => { const p = by.get(cv.dataset.gid); if (!p || !p.style) return; const x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height); x.save(); x.translate(cv.width / 2, cv.height - 6); x.scale(cv.width / 40, cv.width / 40); try { NW.drawCharacter(x, { x: 0, y: 0, z: 0, dir: 2, walk: 0, moving: false, seed: 0, rod: 0, isMe: false, style: p.style }, 0); } catch (e) { /* tampilan saja */ } x.restore(); });
}
function onClick(e) {
  const b = e.target.closest("button[data-a]"); if (!b || b.disabled) return; const a = b.dataset.a, d = b.dataset;
  if (a === "tutup") { if (S.offer && S.offer.phase === "open") { $("hlSheet").classList.add("mini"); return; } S.offer = null; return closeSheet(); }
  if (a === "atur") return startEdit();
  if (a === "esel") return editSel(d.id);
  if (a === "nudge") return nudge(d.d);
  if (a === "step") { if (S.edit) { S.edit.step = S.edit.step >= 1 ? 0.25 : 1; refreshEditUI(); } return; }
  if (a === "esimpan") return editSave();
  if (a === "ebatal") return editCancel();
  if (a === "ebawaan") return editReset();
  if (a === "tab") { if (S.edit) editCancel(); S.tab = d.v; S.msg = ""; S.pick = null; if (d.v === "nampan") loadDishes(); return render(); }
  if (a === "pick") { S.pick = +d.s; S.msg = ""; return render(); }
  if (a === "pickx") { S.pick = null; return render(); }
  if (a === "taruh") return taruh(d.u, +d.s);
  if (a === "ambil") return ambil(+d.s);
  if (a === "bersih") return bersih(+d.s);
  if (a === "tawar") return tawar(+d.s, d.to);
  if (a === "batal") return batal(d.id);
  if (a === "terima") return jawab(true);
  if (a === "tolak") return jawab(false);
}

// ---------- kehadiran & siklus sesi sosial (dipantau ±3×/dtk; semua lokal, tanpa tulis per frame) ----------
let wasLive = false;
function tick() {
  if (!S.on) return;
  const yard = inYard(), vis = visit(), mode = yard ? (vis ? "guest" : "owner") : null, key = mode === "guest" ? vis.pid : mode === "owner" ? "me" : "";
  S.calm = calm();
  if (mode !== S.mode || key !== S.key) {   // pergantian sesi: keluar dari halaman / pindah rumah / pindah area / dikeluarkan / pemilik pulang
    const prevMode = S.mode, prevKey = S.key; S.sentKeluar = false;
    if (prevMode === "owner") { tutupSesi(); }
    if (prevMode === "guest") { keluarSesi(prevKey); }
    S.mode = mode; S.key = key; S.offer = null; S.own = { table: [], offers: [], dishes: [], ok: false }; S.guest = { table: [], mine: [], ok: false }; S.snapTable = null; S.empty = {}; S.eatRemote = {}; S.pendEat = []; S.gone = new Set(); S.anim = null; S.plateAt = null;
    S.absent = false; S.pick = null; S.edit = null; S.hal = null; S.halKey = ""; HL.setItems(null); closeSheet(); S.msg = "";
    if (S.seat >= 0 && !mode) { S.seat = -1; }
    if (mode === "owner") ownerSync(); if (mode === "guest" && roomLive()) guestSync();
  }
  const live = roomLive();
  if (live && !wasLive && S.mode) { S.sentKeluar = false; if (S.mode === "owner") ownerSync(); else guestSync(); }   // sambung ulang: baca ulang dari server (tidak ada porsi ganda: opId + transaksi)
  if (!live && wasLive && S.mode === "guest") { S.offer = null; S.msg = ""; render(); keluarSesi(S.key); }                // terputus: tawaran ditutup di klien
  wasLive = live;
  const t = now();
  if (S.mode === "owner" && (guestsHere().length || S.own.offers.length || S.sheet) && t - S.lastOwner > 4000) ownerSync();
  if (S.mode === "guest" && live && t - S.lastGuest > (S.offer ? 2500 : 4000)) guestSync();
  if (S.mode === "guest" && S.offer) {                                                                                      // hitung mundur lokal; server menolak setelah 60 dtk
    const left = Math.ceil((S.offer.until - t) / 1000);
    if (left <= 0 && S.offer.phase === "open") { S.offer.phase = "expired"; S.expiredAt = t; render(); }
    else if (S.offer.phase === "expired" && t - S.expiredAt > 2500) { S.gone.add(S.offer.id); S.offer = null; S.msg = "Tawaran kedaluwarsa."; render(); }
    else { const el = $("hlLeft"), bar = document.querySelector("#hlSheet .hl-bar i"); if (el && S.offer.phase === "open") el.textContent = `Berlaku ${left} detik lagi.`; if (bar) bar.style.width = clamp(left / 60, 0, 1) * 100 + "%"; }
  }
  if (S.sheet && S.mode === "owner" && !S.edit) { const L = HL.layout(lvNow()), P = player(); if (Math.hypot(P.x - L.meja.x, P.y - L.meja.y) > 4.2) closeSheet(); }   // menjauh dari meja: panel menutup
  if (S.mode && yard && t - S.ambT > 7000 + (S.ambT % 3) * 1000) { S.ambT = t; ambient(); }
}
function ambient() {
  const dk = N().darkness ? N().darkness() : 0;
  if (document.hidden) return;
  // suasana hanya bila ada "nongkrong" (duduk, panel meja, tamu, tawaran) atau audio dapur sudah termuat: berkas audio tetap lazy saat hanya lewat di halaman (kontrak 08C)
  if (!(S.seat >= 0 || S.sheet || S.offer || guestsHere().length || (NW.dapurAudio && NW.sfxLib))) return;
  snd(dk > 0.35 ? "dapur_jangkrik" : "dapur_burung");
}
// kursi: dihitung dari bendera duduk pemain lain di dekat kursi (kursi yang sama tidak bisa dipakai dua orang)
function updateSeats() {
  const L = HL.layout(lvNow()), occ = {}, v = mpv(), me = v ? v.me : "";
  for (const p of playersHere()) { if (!(p.f & F_SIT) || (p.f & F_IN)) continue; for (const c of L.chairs) if (Math.hypot(p.x - c.x, p.y - c.y) < 0.55) { occ[c.id] = p.id; break; } }
  if (S.seat >= 0) {
    const other = occ[S.seat];
    if (other && String(other) < String(me) && now() > S.seatLock) { NW.world.standUp(); S.seat = -1; toast("Kursi itu sudah lebih dulu diduduki orang lain 🪑"); }
    else occ[S.seat] = "me";
  }
  S.occupied = occ;
}

// ---------- kait ke Rumahku (world/home.js) ----------
function candidates(isVisit, lv) {
  const L = HL.layout(lv), out = [];
  if (S.seat >= 0 && NW.world.seat && NW.world.seat.on) out.push({ id: "hl_stand", x: player().x, y: player().y, r: 9, icon: "🧍", label: "Berdiri", pri: 5 });
  else for (const c of L.chairs) if (!S.occupied[c.id] || S.occupied[c.id] === "me") out.push({ id: "hl_sit" + c.id, x: c.x, y: c.y, r: 0.8, icon: "🪑", label: c.bench ? "Duduk di bangku" : "Duduk" });
  out.push({ id: "hl_meja", x: L.meja.x, y: L.meja.y, r: 1.25, icon: "🍽️", label: isVisit ? "Lihat meja" : "Meja makan" });
  if (!isVisit) out.push({ id: "hl_nampan", x: L.nampan.x, y: L.nampan.y, r: 1.0, icon: "🧺", label: "Nampan makanan" });
  out.push({ id: "hl_kopi", x: L.kopi.x, y: L.kopi.y, r: 1.0, icon: "☕", label: "Seruput kopi" });
  return out;
}
function interact(t, pl, openDialog) {
  if (t.id === "hl_stand") { NW.world.standUp(); return; }
  if (t.id.indexOf("hl_sit") === 0) {
    const id = +t.id.slice(6), L = HL.layout(lvNow()), c = L.chairs[id]; updateSeats();
    if (S.occupied[id] && S.occupied[id] !== "me") { toast("Kursi itu sudah ada yang menempati 🪑"); return; }
    if (S.anim && S.anim.kind === "makan") return; sitOn(c); return;
  }
  if (t.id === "hl_meja") { if (S.mode === "guest" && !S.guest.ok) guestSync(); openSheet(S.mode === "owner" ? "meja" : "lihat"); return; }
  if (t.id === "hl_nampan") { openSheet("nampan"); return; }
  if (t.id === "hl_kopi") { if (!S.anim) { startAnim({ kind: "seruput", dur: S.calm ? 1.2 : 2.2 }); snd("dapur_seruput"); } return; }
}
function items(lv, t, night, pl) {
  const calmOn = S.calm, st = { table: S.mode === "owner" ? S.own.table : S.guest.table, dishes: S.own.dishes, occupied: S.occupied, calm: calmOn, empty: S.empty, edit: S.edit };
  const out = HL.items(lv, t, night, st);
  out.push({ d: pl.x + pl.y + 0.06, draw: (c) => drawProps(c, pl, t, S.anim, false) });
  for (const [id, until] of Object.entries(S.eatRemote)) {
    if (until < t) { delete S.eatRemote[id]; continue; }
    const p = NW.mp && NW.mp.player ? NW.mp.player(id) : null; if (!p) continue; out.push({ d: p.ch.x + p.ch.y + 0.06, draw: (c) => drawProps(c, p.ch, t, null, true) });
  }
  return out;
}
function glow(ctx, lv, a) { HL.glow(ctx, lv, a); }
function update(dt) { if (!S.on || !S.mode) return; updateSeats(); matchPendEat(); stepAnim(dt); }
function install() {
  if (S.on || !home() || !home().hooks) return; ensureUI(); S.on = true; S.calm = calm();
  home().hooks.halaman = { blocked: HL.blocked, candidates, interact, items, glow, update };
  window.addEventListener("pointerdown", onEditDown, true); window.addEventListener("pointermove", onEditMove, true); window.addEventListener("pointerup", onEditUp, true); window.addEventListener("pointercancel", onEditUp, true);
  setInterval(tick, 350);
  if (NW.mp && NW.mp.onChange) NW.mp.onChange(() => { if (S.on) { clearTimeout(S._mt); S._mt = setTimeout(tick, 60); } });
}
NW.dapurSosial = { install, _S: S, startEdit, editMove, editSave, editCancel, editReset, nudge, editSel, tick, ownerSync, guestSync, taruh, ambil, bersih, tawar, batal, jawab, openSheet, closeSheet, updateSeats, layout: HL.layout, get on() { return S.on; } };
})();
