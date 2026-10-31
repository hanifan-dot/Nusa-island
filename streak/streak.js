// =========================================================
//  NUSA ISLAND — Login Streak 7 Hari (sisi game). Modul: NW.streak
//  - Buku klaim yang DIPERCAYA ada di Firestore (users/{uid}/streak/state), ditegakkan oleh firebase/firestore.rules
//    dengan jam SERVER zona Asia/Jakarta. Game tidak punya "sistem hadiah lokal pura-pura online": tanpa login Google
//    dan Firestore asli, klaim DINONAKTIFKAN (tombol mati + penjelasan), bukan disimulasikan.
//  - Hadiah dikreditkan ke simpanan (S.streak, S.money, Rumahku) SEKALI per klaim: S.streak.applied == total klaim yang sudah
//    dikreditkan. Bila simpanan lama dimuat, hadiah terakhir yang belum masuk dipulihkan; kapal/joran/perabot selalu disinkronkan
//    dari buku server (idempotent, tidak pernah menggandakan dan tidak pernah dicabut).
//  - Jam HP hanya dipakai untuk tampilan perkiraan; keputusan hari ada di server.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const C = NW.StreakCore;
if (!C) return;
const N = () => window.Nusa;
const S = () => N().S;

// ---------- Barang eksklusif ----------
const SHIP = { name: "Kapal Perintis Eksklusif", icon: "⛵", style: { hull: "#14808c", trim: "#ffd95a", inner: "#c9955a" }, luck: 1.05,
  desc: "Lambung toska berhias emas. Memancing dari kapal sedikit lebih hoki (×1,05). Milik selamanya." };
const ROD = { name: "Joran Pelaut Eksklusif", icon: "🎣", mul: { cap: 1.15, str: 1.12, reel: 1.1 },
  spec: { blank: "#0f8a8f", w: 3.2, grip: "#5a3a12", gripLen: 0.36, reel: { col: "#ffd95a", r: 3.3 }, node: false, accent: { kind: "royal", col: "#ffd95a" }, name: "Joran Pelaut Eksklusif" },
  desc: "Batang toska bergagang kayu jati. Kuat ×1,12 · Tarik ×1,1 · batas ikan +15% dari joran biasa yang kamu pakai. Milik selamanya." };
const BAIT_LUCK = 1.25, BAIT_SPEED = 1.15;

// ---------- Simpanan (S.streak) ----------
function migrate(s) {
  const t = s.streak = s.streak && typeof s.streak === "object" ? s.streak : {};
  t.v = 1; t.uid = typeof t.uid === "string" ? t.uid : "";
  t.applied = Number.isInteger(t.applied) && t.applied >= 0 ? t.applied : 0;
  t.bait = Number.isInteger(t.bait) && t.bait >= 0 ? Math.min(t.bait, 9999) : 0;
  t.ship = t.ship === true; t.rod = t.rod === true;
  t.equip = Object.assign({ ship: true, rod: true }, t.equip && typeof t.equip === "object" ? t.equip : {});
  t.equip.ship = t.equip.ship !== false; t.equip.rod = t.equip.rod !== false;
}

// ---------- Penyimpanan (Firestore asli, atau celah untuk pengujian) ----------
let store = null;
function realStore() {
  const a = NW.cloud && NW.cloud.adapter;
  if (!a || a.isDemo || !a.rawFirestore) return null;       // mode demo & tanpa Firebase: BUKAN penyimpanan tepercaya
  return {
    real: true,
    ready: () => !!a.rawFirestore(),
    uid: () => { const h = a.rawFirestore(); return h ? h.uid : null; },
    async get(fresh) {
      const h = a.rawFirestore(); if (!h) throw Object.assign(new Error("auth"), { code: "auth" });
      const ref = h.db.doc(`users/${h.uid}/streak/state`);
      const s = await (fresh ? ref.get({ source: "server" }) : ref.get());
      if (!s.exists) return null;
      const d = s.data(); return Object.assign({}, d, { at: d.at && d.at.toMillis ? d.at.toMillis() : null });
    },
    async claim(next, prev) {
      const h = a.rawFirestore(); if (!h) throw Object.assign(new Error("auth"), { code: "auth" });
      const ref = h.db.doc(`users/${h.uid}/streak/state`), prevTotal = (prev && prev.total) || 0;
      await h.db.runTransaction(async (t) => {
        const s = await t.get(ref), cur = s.exists ? s.data() : null;
        if ((cur ? cur.total : 0) !== prevTotal) throw Object.assign(new Error("stale"), { code: "stale" });   // perangkat lain sudah klaim
        t.set(ref, Object.assign({}, next, { at: h.fb.firestore.FieldValue.serverTimestamp() }));
      });
      return next;
    },
  };
}
// Penyimpanan palsu untuk pengujian HANYA dipakai di mode demo (?cloud=demo, ditandai SIMULASI di tampilan). Di mode Firebase asli
// diabaikan, jadi konsol browser tidak bisa "mengaktifkan" server hadiah palsu di akun sungguhan.
const theStore = () => (NW.cloud && NW.cloud.demo ? store || window.NUSA_STREAK_STORE || null : realStore());

// ---------- Jam server perkiraan (hanya tampilan) ----------
const clock = { offset: 0, source: "perangkat", at: 0 };
async function syncClock() {
  if (typeof fetch !== "function" || location.protocol === "file:") return;
  try {
    const t0 = Date.now(), r = await fetch(location.pathname || "/", { method: "HEAD", cache: "no-store" }), t1 = Date.now();
    const d = r.headers.get("Date"); if (!d) return;
    const ms = Date.parse(d); if (!Number.isFinite(ms)) return;
    clock.offset = ms + (t1 - t0) / 2 - t1; clock.source = "server"; clock.at = t1;     // Date header 1 detik resolusinya: cukup untuk tampilan
  } catch (e) { /* tetap pakai jam perangkat untuk tampilan */ }
}
const nowMs = () => (window.__STREAK_NOW ? window.__STREAK_NOW() : Date.now() + clock.offset);

// ---------- Status ----------
const R = { doc: null, loaded: false, loading: false, busy: false, error: "", lastClaim: null, listeners: [], restored: null };
const emit = () => R.listeners.forEach((f) => { try { f(); } catch (e) {} });
const user = () => (NW.cloud && NW.cloud.user) || null;

// kondisi untuk bisa klaim: login Google + penyimpanan tepercaya siap
function access() {
  const st = theStore();
  if (!NW.cloud || !NW.cloud.enabled) return { ok: false, why: "off", msg: "Hadiah login butuh akun Google dan Cloud Save. Fitur online belum aktif di versi ini." };
  if (!user()) return { ok: false, why: "login", msg: "Masuk dengan Google untuk mengklaim hadiah login. Progres streak tersimpan di akunmu dan ikut ke semua perangkat." };
  if (!st) return { ok: false, why: "store", msg: (NW.cloud.demo ? "Mode demo tidak memiliki server hadiah. " : "") + "Server hadiah belum tersedia. Hadiah login hanya bisa diklaim lewat Firebase asli." };
  if (st.ready && !st.ready()) return { ok: false, why: "store", msg: "Menghubungkan ke server…" };
  return { ok: true };
}
function view() {
  const acc = access(), doc = R.doc, now = nowMs();
  const st = C.status(doc, now);
  return Object.assign({ access: acc, simulated: !!(theStore() && theStore().simulated), loaded: R.loaded, loading: R.loading, error: R.error, busy: R.busy, doc, now, clockSource: clock.source }, st,
    { canClaimNow: acc.ok && R.loaded && st.canClaim && !R.busy, next: st.next, major: C.nextMajor(st.next.cycle, st.next.pos),
      daysToMajor: (C.CYCLE_LEN - st.next.pos) + (st.claimedToday ? 1 : 0) });
}

// ---------- Kredit hadiah ke simpanan ----------
function ownedFurnTypes() { const h = S().home; return new Set(h ? h.furniture.concat(h.stored).map((f) => f.type) : []); }
function ensureFurn(type) {
  const h = S().home; if (!h || !NW.HD.FURN[type]) return "gone";
  if (ownedFurnTypes().has(type)) return "have";
  const r = NW.HD.addFurniture(h, S(), type); h.updatedAt = Date.now();
  return r.placed ? "placed" : "stored";
}
function addCopy(type) {              // hanya untuk duplikat SAH (semua 13 perabot sudah dimiliki)
  const h = S().home; if (!h || !NW.HD.FURN[type]) return;
  NW.HD.addFurniture(h, S(), type); h.updatedAt = Date.now();
}
function syncEntitlements(doc) {            // idempotent: aman dipanggil berulang
  const t = S().streak; let changed = false;
  if (doc.ship && !t.ship) { t.ship = true; t.equip.ship = true; changed = true; }
  if (doc.rod && !t.rod) { t.rod = true; t.equip.rod = true; changed = true; }
  for (const fid of new Set(doc.furn || [])) { const r = ensureFurn(fid); if (r === "placed" || r === "stored") changed = true; }
  return changed;
}
function credit(rw, doc) {                   // koin & umpan: dikreditkan tepat sekali per klaim
  const s = S(), t = s.streak;
  if (rw.coin) s.money += rw.coin;
  if (rw.bait) t.bait = Math.min(9999, t.bait + rw.bait);
  t.applied = doc.total; const u = user(); if (u) t.uid = u.uid;
}
function reconcile(doc) {
  const s = S(), t = s.streak, u = user();
  if (!doc || !u) return null;
  if (t.uid !== u.uid) { t.uid = u.uid; t.applied = Math.max(t.applied, doc.total); }    // simpanan milik akun lain/baru: jangan kreditkan ulang
  let restored = null;
  if (doc.total > t.applied && doc.last) {                                                // simpanan lebih lama dari buku server
    const rw = C.rewardFor(doc.last.cycle, doc.last.pos);
    if (rw && doc.total - t.applied >= 1) { credit(rw, doc); restored = rw; }
    t.applied = doc.total;
  }
  const ch = syncEntitlements(doc);
  if (restored || ch) { N().save(); N().refreshHUD(); }
  return restored ? { reward: restored, entitlements: ch } : ch ? { entitlements: true } : null;
}

// ---------- Muat & klaim ----------
async function refresh(fresh) {
  const st = theStore(), acc = access();
  if (!acc.ok || !st) { R.loaded = false; R.doc = null; emit(); badge(); return view(); }
  R.loading = true; R.error = ""; emit();
  try {
    R.doc = await st.get(!!fresh); R.loaded = true;
    const rr = reconcile(R.doc);
    if (rr && rr.reward) { R.restored = rr; N().toast("🎁 Hadiah login yang belum masuk dipulihkan: " + C.describe(rr.reward), "good"); }
  } catch (e) { R.error = errText(e); R.loaded = false; }
  R.loading = false; emit(); badge();
  return view();
}
function errText(e) {
  const c = e && e.code ? String(e.code) : "";
  if (c === "permission-denied") return "Server menolak. Mungkin hadiah hari ini sudah diklaim, atau akunmu belum terverifikasi Google.";
  if (c === "unavailable" || c === "deadline-exceeded" || /network|offline/i.test((e && e.message) || "")) return "Tidak ada koneksi ke server. Coba lagi saat online.";
  if (c === "stale") return "Hadiah hari ini baru saja diklaim dari perangkat lain.";
  if (c === "auth") return "Masuk dulu dengan akun Google.";
  return "Gagal menghubungi server. Coba lagi sebentar lagi.";
}
function rnd() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } }

async function claim() {
  if (R.busy) return { busy: true };
  const acc = access(); if (!acc.ok) return { error: acc.msg };
  const st = theStore();
  R.busy = true; R.error = ""; emit();
  try {
    let attempt = 0, res = null;
    while (attempt < 2) {
      attempt++;
      const prev = await st.get(true);                                     // baca ulang dari SERVER sebelum menyusun klaim
      if (attempt > 1) await syncClock();
      const plan = C.planClaim(prev, nowMs(), { owned: ownedFurnTypes(), rnd });
      if (!plan) { R.doc = prev; res = { already: true }; break; }
      try {
        await st.claim(plan.next, prev);
        const doc = Object.assign({}, plan.next, { at: Date.now() });
        R.doc = doc; R.loaded = true;
        const had = plan.fid ? ownedFurnTypes().has(plan.fid) : false;
        credit(plan.reward, doc);                                           // koin & umpan, tepat sekali
        const ent = { ship: plan.reward.ship, rod: plan.reward.rod, furn: plan.fid };
        if (plan.fid && had) addCopy(plan.fid); else syncEntitlements(doc);   // duplikat hanya muncul bila semua perabot sudah dimiliki
        N().save(); N().refreshHUD();
        R.lastClaim = { plan, at: Date.now() };
        res = { ok: true, plan, ent };
        break;
      } catch (e) {
        if (attempt >= 2 || !(e && (e.code === "permission-denied" || e.code === "stale"))) throw e;
        // kemungkinan hari bergeser (jam perkiraan meleset di sekitar 00:00 WIB) atau klaim dari perangkat lain → coba sekali lagi dengan data segar
      }
    }
    R.busy = false;
    emit(); badge();
    return res;
  } catch (e) {
    R.busy = false; R.error = errText(e);
    try { R.doc = await st.get(true); R.loaded = true; reconcile(R.doc); } catch (e2) { /* biarkan */ }
    emit(); badge();
    return { error: R.error, denied: e && e.code === "permission-denied" };
  }
}

// ---------- Perk di game ----------
const t_ = () => { const s = S(); if (!s.streak) migrate(s); return s.streak; };
const baitCount = () => t_().bait;
function useBait() {
  const t = t_(); if (t.bait <= 0) return false;
  t.bait--; if (t.bait === 0) N().toast("🪱 Umpan Hadiah habis", "bad");
  return true;
}
const shipOn = () => { const t = t_(); return t.ship && t.equip.ship; };
const rodOn = () => { const t = t_(); return t.rod && t.equip.rod; };
function setEquip(kind, on) { const t = t_(); if (!t[kind]) return false; t.equip[kind] = !!on; N().save(); emit(); return true; }

// ---------- Lencana HUD ----------
function badge() {
  const b = document.getElementById("streakBadge"); if (!b) return;
  let show = false;
  try { const v = view(); show = v.access.ok && v.loaded && v.canClaim; } catch (e) {}
  b.classList.toggle("hidden", !show);
}

let toastedToday = false;
function hook() {
  migrate(S());
  const dex = document.getElementById("dexBtn");
  if (dex && !document.getElementById("streakBtn")) {
    const b = document.createElement("button"); b.className = "chip icon-btn misi"; b.id = "streakBtn"; b.setAttribute("aria-label", "Kalender hadiah login 7 hari");
    b.innerHTML = `🎁<span id="streakBadge" class="badge story hidden">!</span>`;
    dex.parentNode.insertBefore(b, dex); b.addEventListener("click", () => { N().sfx("click"); N().openPanel("streak"); });
  }
  if (NW.streakUI) NW.streakUI.register();
  syncClock().then(() => refresh(false)).then(() => { const v = view(); if (!toastedToday && v.access.ok && v.loaded && v.canClaim) { toastedToday = true; setTimeout(() => N().toast("🎁 Hadiah login hari ini siap diklaim!", "good"), 2500); } });
  if (NW.cloud && NW.cloud.onChange) { let lastUid = null; NW.cloud.onChange(() => { const u = user(); const id = u ? u.uid : null; if (id !== lastUid) { lastUid = id; refresh(false); } }); }
  setInterval(() => { if (!document.hidden) { badge(); emit(); } }, 30000);   // pergantian hari WIB: lencana & kalender menyegarkan diri
}

NW.streak = { Core: C, SHIP, ROD, BAIT_LUCK, BAIT_SPEED, migrate, hook, view, refresh, claim, access, onChange: (f) => R.listeners.push(f),
  baitCount, useBait, setEquip, shipOn, rodOn, owned: ownedFurnTypes, syncClock,
  shipStyle: () => (shipOn() ? SHIP.style : null), rodSpec: () => (rodOn() ? ROD.spec : null),
  rodMul: () => (rodOn() ? ROD.mul : { cap: 1, str: 1, reel: 1 }), shipLuck: () => (shipOn() ? SHIP.luck : 1),
  setStore: (s) => { store = s; }, _state: R, _clock: clock };
})();
