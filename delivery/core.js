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
// permintaan ke server: hanya uid item + opId idempoten
function request(p, opId) {
  if (!ready(p)) return { ok: false, why: "belum-6-ikan" };
  if (!OPID_RE.test(String(opId || ""))) return { ok: false, why: "opId-tidak-sah" };
  const body = { v: 1, opId, boxes: [p.boxes[0].slice(), p.boxes[1].slice()] };
  return { ok: true, body };
}
// pemeriksa untuk tes: tidak boleh ada field terlarang di mana pun dalam badan permintaan
function hasForbidden(o, d) { if (!o || typeof o !== "object" || (d || 0) > 6) return false; return Object.keys(o).some((k) => FORBIDDEN.test(k) || hasForbidden(o[k], (d || 0) + 1)); }
// ---- mesin keadaan perjalanan (animasi). Tidak memberi apa pun; hanya urutan yang sah. ----
const STAGES = ["packing", "loaded", "sailing", "docked", "carry1", "carry2", "truck", "result"];
const NEXT = { packing: { send: "loaded" }, loaded: { depart: "sailing", cancel: "packing" }, sailing: { arrive: "docked", abort: "loaded" }, docked: { lift: "carry1" }, carry1: { load: "carry2" }, carry2: { load: "truck" }, truck: { close: "result" }, result: { reset: "packing" } };
function step(stage, ev) { const n = NEXT[stage] && NEXT[stage][ev]; return n ? { ok: true, stage: n } : { ok: false, stage, why: "transisi-tidak-sah" }; }
// kotak yang sudah diangkat berurutan: 1 per 1; kecepatan jalan lambat saat membawa
const CARRY_SPEED = 0.6;
return { BOXES, PER_BOX, TOTAL, DEST, STICKER, STAGES, CARRY_SPEED, emptyPlan, where, count, canPack, pack, unpack, clear, ready, prune, label, request, hasForbidden, step };
});
