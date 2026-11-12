// NUSA ISLAND — Pengiriman Segar Pak Damar: inti logika murni (tanpa DOM). Fase A.
// Klien HANYA menyusun rencana kemas (ikan mana ke kotak mana) dan menggerakkan animasi. TIDAK pernah menghitung/mengirim hadiah, harga, koin, uid pemain atau role.
// Permintaan ke server hanya berisi uid ITEM ikan (bukan pemain). Hasil/hadiah = tanggapan server (kontrak Worker 01: belum ada → adapter uji di balik flag).
(function (root, f) { if (typeof module === "object" && module.exports) module.exports = f(); else root.NusaDeliveryCore = f(); })(typeof self !== "undefined" ? self : this, function () {
"use strict";
const BOXES = 2, PER_BOX = 3, TOTAL = BOXES * PER_BOX, DEST = "Pelabuhan Kota", STICKER = "KOTA NUSA — SEGAR";
const OPID_RE = /^[A-Za-z0-9_-]{8,64}$/, UID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const FORBIDDEN = /^(uid|userId|coins?|money|balance|reward|hadiah|price|harga|score|rank|role|owner|email|token|payment|paymentId|amount|nominal)$/i;
const emptyPlan = () => ({ boxes: [[], []] });
const where = (p, uid) => { for (let b = 0; b < BOXES; b++) if (p.boxes[b].includes(uid)) return b; return -1; };
const count = (p) => p.boxes[0].length + p.boxes[1].length;
// aturan: item harus ada di Tas (cooler), tidak terkunci, bukan sudah dikemas; kotak maksimal 3
function canPack(p, item, box) {
  if (!item || !UID_RE.test(String(item.uid || ""))) return { ok: false, why: "item-tidak-sah" };
  if (item.lock === true) return { ok: false, why: "terkunci" };
  if (!(box === 0 || box === 1)) return { ok: false, why: "kotak-tidak-ada" };
  if (where(p, item.uid) >= 0) return { ok: false, why: "sudah-dikemas" };
  if (p.boxes[box].length >= PER_BOX) return { ok: false, why: "kotak-penuh" };
  return { ok: true };
}
function pack(p, item, box) { const c = canPack(p, item, box); if (c.ok) p.boxes[box].push(item.uid); return c; }
function unpack(p, uid) { const b = where(p, uid); if (b < 0) return false; p.boxes[b] = p.boxes[b].filter((x) => x !== uid); return true; }
const clear = (p) => { p.boxes = [[], []]; };
const ready = (p) => p.boxes[0].length === PER_BOX && p.boxes[1].length === PER_BOX;
// buang uid yang sudah tidak ada di Tas (mis. dijual di perangkat lain)
function prune(p, cooler) { const have = new Set((cooler || []).map((i) => i.uid)); for (let b = 0; b < BOXES; b++) p.boxes[b] = p.boxes[b].filter((u) => have.has(u)); return p; }
// label kotak (tampilan saja): berat total kg dari data item lokal — BUKAN dasar hadiah
function label(p, box, cooler) {
  const m = new Map((cooler || []).map((i) => [i.uid, i])); let kg = 0; for (const u of p.boxes[box]) { const it = m.get(u); if (it) kg += Number(it.w) || 0; }
  return { box: box + 1, n: p.boxes[box].length, kg: Math.round(kg * 10) / 10, dest: DEST, sticker: STICKER };
}
// permintaan ke server (kontrak Worker 01: ecoDamarLoad {opId, box:0|1, uids:[1..3]}): hanya uid ITEM + nomor kotak + opId idempoten
function loadBodies(p, newOp) {
  if (!ready(p)) return { ok: false, why: "belum-6-ikan" };
  const bodies = [];
  for (let b = 0; b < BOXES; b++) { const opId = newOp(b); if (!OPID_RE.test(String(opId || ""))) return { ok: false, why: "opId-tidak-sah" }; bodies.push({ opId, box: b, uids: p.boxes[b].slice() }); }
  if (bodies[0].opId === bodies[1].opId) return { ok: false, why: "opId-kembar" };
  return { ok: true, bodies };
}
const boxBody = (box, opId) => (box === 0 || box === 1) && OPID_RE.test(String(opId || "")) ? { ok: true, body: { opId, box } } : { ok: false, why: "tidak-sah" };   // unload/sail/abort/deliver
// tampilan `damar` dari server → bentuk aman (angka dibatasi; tanpa field tak dikenal)
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 0));
function view(v) {
  if (!v || typeof v !== "object" || !Array.isArray(v.boxes) || v.boxes.length !== 2) return null;
  return { need: num(v.need, 0, 12), per: num(v.per, 0, 6), delivered: num(v.delivered, 0, 12), paid: v.paid === true, reward: v.paid === true && Number.isFinite(Number(v.reward)) ? num(v.reward, 0, 1e7) : null, minTripMs: num(v.minTripMs, 0, 36e5), freshMs: num(v.freshMs, 0, 864e5),
    boxes: v.boxes.map((b) => ({ st: b && b.st === "sailing" ? "sailing" : "idle", n: num(b && b.n, 0, 3), fish: (b && Array.isArray(b.fish) ? b.fish : []).slice(0, 3).map((f) => ({ u: String(f.u || "").slice(0, 40), id: String(f.id || "").slice(0, 40), w: Number(f.w) || 0 })), freshLeftMs: b && b.freshLeftMs != null ? num(b.freshLeftMs, 0, 864e5) : null, sailMs: num(b && b.sailMs, 0, 36e5) })) };
}
// tahap tampilan diturunkan dari status SERVER (bukan dari klien)
function stageOf(vw) {
  if (!vw) return "unknown"; const b = vw.boxes;
  if (b.some((x) => x.st === "sailing")) return "sailing";
  if (b.every((x) => x.n === vw.per) && vw.per > 0) return "loaded";
  if (b.some((x) => x.n > 0)) return "partial";
  return vw.delivered >= vw.need && vw.need > 0 ? "done" : "packing";
}
const cargoVisible = (vw) => (vw ? vw.boxes.map((x) => x.n > 0) : [false, false]);   // kotak yang tampak fisik di kapal
// pemeriksa untuk tes: tidak boleh ada field terlarang di mana pun dalam badan permintaan
function hasForbidden(o, d) { if (!o || typeof o !== "object" || (d || 0) > 6) return false; return Object.keys(o).some((k) => FORBIDDEN.test(k) || hasForbidden(o[k], (d || 0) + 1)); }
const CARRY_SPEED = 0.6;   // kecepatan jalan saat mengangkat kotak (Fase A3)
return { BOXES, PER_BOX, TOTAL, DEST, STICKER, CARRY_SPEED, emptyPlan, where, count, canPack, pack, unpack, clear, ready, prune, label, loadBodies, boxBody, view, stageOf, cargoVisible, hasForbidden };
});
