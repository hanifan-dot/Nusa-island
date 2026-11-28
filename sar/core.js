// NUSA ISLAND — "Panggilan Darurat Nusa — SAR Laut" (PROTOTIPE) · inti murni (tanpa DOM/jaringan/jam perangkat) agar bisa diuji di Node.
// DIMUAT HANYA bila window.NUSA_SAR === true (bawaan: MATI). Semua waktu DISUNTIKKAN pemanggil (`now` = jam tepercaya, null bila tidak ada).
// Tidak ada uang/Diamond/ikan/peluang/item berbayar di sini: hadiah hanya lencana + catatan SAR. State terpisah di S.sar (field tambahan, aman untuk simpanan lama).
(function (root) {
"use strict";

const MIN = 60000, H = 3600000;
const C = {
  MIN_ACTIVE_MS: 7 * MIN,        // panggilan pertama tidak sebelum 7 menit bermain aktif (per sesi)
  COOLDOWN_MS: 4 * H,            // jeda minimal antar panggilan (jam nyata tepercaya)
  MAX_OFFERS_DAY: 2,             // maksimal dua tawaran per hari kalender WIB
  OFFER_TTL_MS: 3 * H,           // tawaran di kotak masuk kedaluwarsa setelah 3 jam
  ACTIVE_TTL_MS: 40 * MIN,       // misi aktif ditutup bila lewat 40 menit sejak diterima
  TOAST_MS: 8000,                // notifikasi kecil hilang ±8 dtk (pesan tetap di NusaPhone)
  WIB_MS: 7 * H, CLOCK_SKEW_MS: 5 * MIN,
};
const MISSION_ID = "nelayan-biru-1";
const MISSIONS = {
  [MISSION_ID]: { id: MISSION_ID, title: "PANGGILAN DARURAT", text: "Seorang nelayan terakhir terlihat di sebelah timur mercusuar. Kapalnya berwarna biru.", hint: "Cari di sekitar timur mercusuar.", badge: "sar-laut-1" },
};
const BADGES = { "sar-laut-1": { id: "sar-laut-1", icon: "🛟", name: "Penyelamat Laut I" } };
const PHASES = ["offer", "active", "done", "declined", "expired", "cancelled"];
const STAGES = ["search", "found", "aboard", "delivered"];
const CARE = [
  { id: "selimut", label: "Beri selimut", base: 100, cond: "stabil" },
  { id: "air", label: "Beri air", base: 85, cond: "cukup stabil" },
  { id: "evak", label: "Langsung evakuasi", base: 70, cond: "cukup stabil" },
];
const BUSY_NAMES = [["cine", "cutscene"], ["dialog", "dialog"], ["fishing", "memancing"], ["home", "rumahku"], ["shop", "toko"], ["kedai", "kedai"], ["dapur", "dapur"], ["cloud", "cloud"], ["noboat", "kapal"]];

const fin = (n) => typeof n === "number" && Number.isFinite(n);
const int = (n, lo, hi, d) => (fin(n) ? Math.min(hi, Math.max(lo, Math.floor(n))) : d);
const str = (s, max) => (typeof s === "string" ? s.slice(0, max) : "");
const pad2 = (n) => (n < 10 ? "0" : "") + n;

function dayKey(ms) { return fin(ms) ? new Date(ms + C.WIB_MS).toISOString().slice(0, 10) : ""; }
function fmtDur(ms) { const s = fin(ms) && ms > 0 ? Math.floor(ms / 1000) : 0; return Math.floor(s / 60) + " mnt " + pad2(s % 60) + " dtk"; }
function victimText() { return "Kedinginan dan kelelahan."; }

function cleanM(m) {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  const id = str(m.id, 40), phase = PHASES.includes(m.phase) ? m.phase : null, stage = STAGES.includes(m.stage) ? m.stage : null;
  if (!id || !phase || !stage) return null;
  return {
    id, phase, stage, snoozed: m.snoozed === true, offeredAt: int(m.offeredAt, 0, 9e15, 0), acceptedAt: int(m.acceptedAt, 0, 9e15, 0), expireAt: int(m.expireAt, 0, 9e15, 0),
    care: CARE.some((c) => c.id === m.care) ? m.care : null, foundAt: int(m.foundAt, 0, 9e15, 0), doneAt: int(m.doneAt, 0, 9e15, 0), score: int(m.score, 0, 100, 0), cond: m.cond === "stabil" || m.cond === "cukup stabil" ? m.cond : "",
  };
}
function cleanRec(r) {
  r = r && typeof r === "object" && !Array.isArray(r) ? r : {};
  const ids = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === "string" && MISSIONS[x]))] : []);
  const last = r.last && typeof r.last === "object" ? { at: int(r.last.at, 0, 9e15, 0), dur: int(r.last.dur, 0, 9e15, 0), cond: r.last.cond === "stabil" ? "stabil" : "cukup stabil", score: int(r.last.score, 0, 100, 0) } : null;
  return { done: int(r.done, 0, 9999, 0), doneIds: ids(r.doneIds), badges: (Array.isArray(r.badges) ? [...new Set(r.badges.filter((b) => typeof b === "string" && BADGES[b]))] : []), last };
}
// Satu-satunya pembentuk state kanonik (urutan kunci tetap → bulat-pulang JSON identik). `now` (opsional) = jepit nilai masa depan hasil utak-atik.
function clean(raw, now) {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  let last = int(r.lastCallAt, 0, 9e15, 0);
  if (fin(now) && last > now + C.CLOCK_SKEW_MS) last = Math.floor(now);
  const m = cleanM(r.m);
  if (m && fin(now)) { const hi = Math.floor(now) + C.CLOCK_SKEW_MS; m.offeredAt = Math.min(m.offeredAt, hi); m.acceptedAt = Math.min(m.acceptedAt, hi); m.expireAt = Math.min(m.expireAt, hi + C.ACTIVE_TTL_MS); }
  return {
    v: 1, lastCallAt: last, offerDay: /^\d{4}-\d{2}-\d{2}$/.test(r.offerDay) ? r.offerDay : "", offerCount: int(r.offerCount, 0, 99, 0),
    declined: Array.isArray(r.declined) ? [...new Set(r.declined.filter((x) => typeof x === "string" && x.length > 0 && x.length <= 40))].slice(0, 50) : [],
    m, rec: cleanRec(r.rec),
  };
}
const fresh = () => clean(null);
const migrate = (raw, now) => clean(raw, now);
function migrateInto(S, now) { if (S && typeof S === "object") S.sar = migrate(S.sar, now); return S; }   // hanya menambah/memperbaiki S.sar

function busyReason(f) { if (!f || typeof f !== "object") return null; for (const [k, name] of BUSY_NAMES) if (f[k]) return name; return null; }

// ---- aturan anti-spam (SATU tempat) ----
// env: { now (jam tepercaya | null), activeMs (menit bermain aktif sesi ini), sessionCalled (sudah ada panggilan di sesi ini), busy (busyReason | null), pool? }
function canOffer(st, env) {
  st = clean(st); env = env || {};
  if (!fin(env.now)) return { ok: false, why: "clock" };
  if (env.sessionCalled) return { ok: false, why: "session" };
  if (st.m && (st.m.phase === "offer" || st.m.phase === "active")) return { ok: false, why: "mission" };
  if (!fin(env.activeMs) || env.activeMs < C.MIN_ACTIVE_MS) return { ok: false, why: "active" };
  if (env.busy) return { ok: false, why: "busy" };
  if (st.lastCallAt && env.now - st.lastCallAt < C.COOLDOWN_MS) return { ok: false, why: "cooldown" };
  if ((st.offerDay === dayKey(env.now) ? st.offerCount : 0) >= C.MAX_OFFERS_DAY) return { ok: false, why: "daily" };
  const pool = Array.isArray(env.pool) && env.pool.length ? env.pool : [MISSION_ID];
  const avail = pool.filter((id) => !st.declined.includes(id) && !st.rec.doneIds.includes(id));
  if (!avail.length) return { ok: false, why: pool.every((id) => st.declined.includes(id)) ? "declined" : "done" };
  return { ok: true, id: avail[0] };
}
function offer(st, env) {
  st = clean(st); const c = canOffer(st, env);
  if (!c.ok) return { ok: false, why: c.why, st, ring: false };
  const dk = dayKey(env.now), n = st.offerDay === dk ? st.offerCount : 0, now = Math.floor(env.now);
  const next = clean(Object.assign({}, st, { lastCallAt: now, offerDay: dk, offerCount: n + 1, m: { id: c.id, phase: "offer", stage: "search", snoozed: false, offeredAt: now } }));
  return { ok: true, st: next, ring: true, id: c.id, note: offerNote(c.id) };
}
function offerNote(id) { const M = MISSIONS[id] || MISSIONS[MISSION_ID]; return { id: "sar:" + M.id, icon: "🚨", title: M.title, text: M.text, app: "sar", toastMs: C.TOAST_MS }; }

const withM = (st, patch) => clean(Object.assign({}, st, { m: Object.assign({}, st.m, patch) }));
function snooze(st) { st = clean(st); return st.m && st.m.phase === "offer" ? withM(st, { snoozed: true }) : st; }
function decline(st) {
  st = clean(st); if (!st.m || st.m.phase !== "offer") return st;
  const next = withM(st, { phase: "declined" }); next.declined = [...new Set(next.declined.concat(st.m.id))].slice(0, 50); return clean(next);
}
const fail = (st, why) => ({ ok: false, why, st });
const live = (st, now) => st.m && st.m.phase === "active" && fin(now) && now <= st.m.expireAt;
function accept(st, now) {
  st = clean(st); if (!fin(now)) return fail(st, "clock");
  if (!st.m || st.m.phase !== "offer") return fail(st, "state");
  if (now - st.m.offeredAt > C.OFFER_TTL_MS) return fail(st, "expired");
  now = Math.floor(now); return { ok: true, st: withM(st, { phase: "active", stage: "search", snoozed: false, acceptedAt: now, expireAt: now + C.ACTIVE_TTL_MS }) };
}
function find(st, now) { st = clean(st); if (!live(st, now)) return fail(st, "state"); if (st.m.stage !== "search") return fail(st, "stage"); return { ok: true, st: withM(st, { stage: "found", foundAt: Math.floor(now) }) }; }
function care(st, choice, now) {
  st = clean(st); if (!live(st, now)) return fail(st, "state"); if (st.m.stage !== "found") return fail(st, "stage");
  if (!CARE.some((c) => c.id === choice)) return fail(st, "choice");
  return { ok: true, st: withM(st, { stage: "aboard", care: choice }) };
}
function scoreOf(careId, durMs) {
  const c = CARE.find((x) => x.id === careId) || CARE[2], late = Math.max(0, Math.floor((durMs - 15 * MIN) / MIN));
  return { score: Math.min(100, Math.max(40, c.base - late)), cond: c.id === "selimut" && durMs <= 30 * MIN ? "stabil" : "cukup stabil" };   // tidak pernah gagal/mati: paling buruk "cukup stabil"
}
function deliver(st, now, name) {
  st = clean(st); if (!live(st, now)) return fail(st, "state"); if (st.m.stage !== "aboard") return fail(st, "stage");
  now = Math.floor(now); const dur = Math.max(0, now - st.m.acceptedAt), sc = scoreOf(st.m.care, dur), M = MISSIONS[st.m.id] || MISSIONS[MISSION_ID];
  const next = withM(st, { phase: "done", stage: "delivered", doneAt: now, score: sc.score, cond: sc.cond });
  next.lastCallAt = Math.max(next.lastCallAt, now);
  next.rec = { done: next.rec.done + 1, doneIds: next.rec.doneIds.concat(st.m.id), badges: next.rec.badges.concat(M.badge), last: { at: now, dur, cond: sc.cond, score: sc.score } };
  const who = str(name, 24).trim() || "Pemain";
  return { ok: true, st: clean(next), reward: { badge: M.badge }, card: { title: "NELAYAN BERHASIL DISELAMATKAN", lines: ["Waktu: " + fmtDur(dur), "Kondisi: " + sc.cond, "Penyelamat: " + who] } };
}
function cancel(st, now) {   // batal dengan benar (cooldown tetap dihitung dari saat panggilan, tidak diperpanjang)
  st = clean(st); if (!st.m || (st.m.phase !== "offer" && st.m.phase !== "active")) return fail(st, "state");
  return { ok: true, st: withM(st, { phase: "cancelled" }) };
}
function expire(st, now) {
  st = clean(st); const m = st.m; if (!m || !fin(now)) return { changed: false, st };
  if (m.phase === "offer" && now - m.offeredAt > C.OFFER_TTL_MS) return { changed: true, st: withM(st, { phase: "expired" }), msg: "Panggilan darurat sudah lewat. Nelayan itu sudah ditolong tim lain." };
  if (m.phase === "active" && now > m.expireAt) { const e = withM(st, { phase: "expired" }); e.lastCallAt = Math.max(e.lastCallAt, m.expireAt); return { changed: true, st: clean(e), msg: "Misi SAR ditutup karena waktu pencarian habis. Tim lain menjemput nelayan itu." }; }
  return { changed: false, st };
}

const API = { C, MISSION_ID, MISSIONS, BADGES, PHASES, STAGES, CARE, fresh, migrate, migrateInto, clean, dayKey, fmtDur, victimText, busyReason, canOffer, offer, offerNote, snooze, decline, accept, find, care, deliver, cancel, expire, scoreOf };
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.NusaSarCore = API;
})(typeof window !== "undefined" ? window : globalThis);
