// =========================================================
//  NUSA ISLAND — INTI EVENT 5 MONSTER LEGENDA (logika murni, UMD). Dipakai SAMA PERSIS oleh server (Worker / Cloud Functions) dan oleh game.
//  Isi: jadwal mingguan (jam server WIB), tabel 5 monster, lintasan renang deterministik (semua pemain melihat monster yang sama di waktu yang sama),
//  simulasi duel memancing (deterministik dari seed + log tombol) dan aturan hadiah / juara.
//
//  KEAMANAN: klien TIDAK PERNAH melapor "saya menang". Server membuat seed duel, klien memainkan duel real-time dan mengirim LOG tombolnya
//  (kapan tombol Tarik ditekan / dilepas). Server memainkan ulang log itu dengan simulasi yang sama → hasil & skor dihitung SERVER.
//  Server juga memeriksa waktu (duel tidak bisa selesai lebih cepat dari waktu nyata) dan membatasi percobaan per pemain.
//  BATAS JUJUR: server tidak bisa membedakan jari manusia dari skrip yang memainkan log sempurna. Yang dijamin: tidak ada kemenangan tanpa duel
//  yang valid menurut simulasi, tidak ada hadiah ganda, hadiah dibatasi tabel server, dan hanya SATU juara global per event.
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaEventCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const MIN = 60000, HOUR = 3600000, DAY = 86400000, WEEK = 7 * DAY, WIB = 7 * HOUR;
  const START_H = 19, DURATION = 20 * MIN, GRACE = 90000;           // 19.00–19.20 WIB; duel yang sudah mulai boleh selesai sampai 90 dtk setelahnya
  const PREMIERE = "megalodon_bayangan";                              // monster pembukaan publik (minggu ke-0), diputuskan di sini = di server
  const DEFAULT_ANCHOR = "2026-11-01";                                // Minggu pertama (minggu ke-0 = Toman Purba)
  const MAX_ATTEMPTS = 3;
  const DT = 0.05, MAX_STEPS = 1200, SWEET = [0.35, 0.75];            // simulasi duel: 20 langkah/detik, maks 60 detik

  // ---- 5 monster resmi (bobot = fantasi Nusa Island). fight = tingkat kesulitan; rw = hadiah (koin) ----
  const MONSTERS = [
    { id: "toman_purba", name: "Toman Purba", kg: 800, loc: "muara", title: "Raja Lumpur Muara", blurb: "Gabus raksasa berusia ribuan tahun, bersembunyi di lumpur muara.",
      fight: { rate: 0.078, sf: 1.0, warn: 16, calm: [2.8, 4.2], surge: [1.2, 1.8], dive: [1.4, 2.0], diveP: 0 },
      rw: { part: 200, catch: 300, win: 1500 } },
    { id: "jurung_mahkota", name: "Jurung Mahkota", kg: 2000, loc: "toba", title: "Penguasa Danau Toba", blurb: "Ikan jurung emas bermahkota duri, penjaga kedalaman Toba.",
      fight: { rate: 0.07, sf: 1.1, warn: 15, calm: [2.6, 3.8], surge: [1.3, 2.0], dive: [1.5, 2.2], diveP: 0.15 },
      rw: { part: 300, catch: 600, win: 3000 } },
    { id: "barakuda_guntur", name: "Barakuda Guntur", kg: 5000, loc: "selat", title: "Petir Selat Sunda", blurb: "Barakuda berlistrik yang menyambar bersama badai Selat Sunda.",
      fight: { rate: 0.064, sf: 1.22, warn: 13, calm: [2.0, 3.4], surge: [0.9, 1.5], dive: [1.2, 1.8], diveP: 0.2 },
      rw: { part: 450, catch: 1200, win: 5500 } },
    { id: "kuwe_titan", name: "Kuwe Titan", kg: 12000, loc: "ampat", title: "Titan Terumbu Raja Ampat", blurb: "Ikan kuwe sebesar perahu, bersisik baja, penjaga terumbu karang.",
      fight: { rate: 0.057, sf: 1.32, warn: 12, calm: [2.2, 3.4], surge: [1.4, 2.2], dive: [1.5, 2.4], diveP: 0.3 },
      rw: { part: 700, catch: 2000, win: 9000 } },
    { id: "megalodon_bayangan", name: "Megalodon Bayangan Purba", kg: 50000, loc: "banda", title: "Bayangan dari Palung Banda", blurb: "Hiu purba berselimut bayangan. Konon ia bangun setiap kali bulan di atas Laut Banda.",
      fight: { rate: 0.05, sf: 1.42, warn: 10, calm: [1.9, 3.0], surge: [1.6, 2.6], dive: [1.6, 2.6], diveP: 0.35 },
      rw: { part: 1000, catch: 3500, win: 16000 } },
  ];
  const BY_ID = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));

  // ---- jadwal (semua dalam ms UTC; "jam server WIB" = UTC+7 tetap, tanpa DST) ----
  function anchorMs(anchor) {                                          // "2026-11-01" → ms UTC untuk 19.00 WIB hari itu
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(anchor || DEFAULT_ANCHOR));
    if (!m) return anchorMs(DEFAULT_ANCHOR);
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3], START_H, 0, 0) - WIB;
    return new Date(t + WIB).getUTCDay() === 0 ? t : anchorMs(DEFAULT_ANCHOR);   // anchor harus hari Minggu
  }
  function dateKey(startMs) { return new Date(startMs + WIB).toISOString().slice(0, 10); }
  function eventOf(week, anchor) {
    // Minggu ke-0 = PEMBUKAAN PUBLIK: Megalodon Bayangan Purba (spesial). Setelah itu rotasi 5 monster: minggu 1 Toman Purba … minggu 5 Megalodon, lalu mengulang.
    const start = anchorMs(anchor) + week * WEEK, mon = week === 0 ? BY_ID[PREMIERE] : MONSTERS[(((week - 1) % 5) + 5) % 5];
    return { week, premiere: week === 0, id: "e" + dateKey(start).replace(/-/g, ""), date: dateKey(start), start, end: start + DURATION, close: start + DURATION + GRACE, monster: mon.id };
  }
  // Keadaan pada waktu `now`. phase: "upcoming" (event berikut belum mulai) | "live" | "closing" (sudah selesai, duel berjalan boleh selesai) | "ended"
  function status(now, anchor) {
    const a = anchorMs(anchor);
    const wk = Math.floor((now - a) / WEEK);
    let cur = wk >= 0 ? eventOf(wk, anchor) : null;
    const next = eventOf(wk + 1 >= 0 ? wk + 1 : 0, anchor);
    if (cur && now < cur.end) return { phase: now >= cur.start ? "live" : "upcoming", ev: cur, next: cur, msToStart: cur.start - now, msLeft: cur.end - now };
    if (cur && now < cur.close) return { phase: "closing", ev: cur, next, msToStart: next.start - now, msLeft: 0 };
    return { phase: cur ? "ended" : "upcoming", ev: cur ? cur : next, last: cur, next, msToStart: next.start - now, msLeft: 0 };
  }
  function eventById(id, anchor) {                                     // "e20261101" → event itu bila memang jatuh pada jadwal rotasi
    const m = /^e(\d{4})(\d{2})(\d{2})$/.exec(String(id || "")); if (!m) return null;
    const w = (Date.UTC(+m[1], +m[2] - 1, +m[3], START_H) - WIB - anchorMs(anchor)) / WEEK;
    return Number.isInteger(w) && w >= 0 && w < 3000 ? eventOf(w, anchor) : null;
  }
  const isLive = (now, anchor) => status(now, anchor).phase === "live";

  // ---- lintasan renang deterministik: posisi monster di air pada detik ke-t sejak event dimulai (sama untuk semua pemain) ----
  // x ∈ [-1.1,1.1], z ∈ [3.3,8.8] (koordinat bidang air game). depth 0 = di permukaan, 1 = menyelam penuh (hanya bayangan terlihat).
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const SWIM = {   // speed = kecepatan relatif, ax/az = lebar/kedalaman patroli, turn = ketajaman belok, spawn = detik animasi muncul
    toman_purba: { speed: 0.55, ax: 0.8, az: 1.5, turn: 0.8, spawn: 5, diveRate: 0.05 },
    jurung_mahkota: { speed: 0.7, ax: 0.9, az: 1.7, turn: 1.0, spawn: 6, diveRate: 0.055 },
    barakuda_guntur: { speed: 1.25, ax: 1.0, az: 1.9, turn: 1.9, spawn: 5, diveRate: 0.06 },
    kuwe_titan: { speed: 0.6, ax: 0.95, az: 1.9, turn: 0.7, spawn: 7, diveRate: 0.06 },
    megalodon_bayangan: { speed: 0.5, ax: 1.0, az: 2.1, turn: 0.55, spawn: 10, diveRate: 0.04 },
  };
  function swimAt(monId, evId, t) {
    const S = SWIM[monId] || SWIM.toman_purba, r = mulberry32(hash(evId + ":" + monId)), ph = [r(), r(), r(), r(), r(), r()].map((v) => v * 6.2832);
    const sp = S.speed, f = (tt) => {
      const x = S.ax * Math.sin(tt * 0.31 * sp + ph[0]) * (0.88 + 0.12 * Math.sin(tt * 0.17 * sp + ph[1])) + 0.12 * Math.sin(tt * 0.73 * sp * S.turn + ph[2]);
      const z = 6.0 + (S.az / 2) * Math.sin(tt * 0.23 * sp + ph[3]) + 0.45 * Math.sin(tt * 0.51 * sp * S.turn + ph[4]);
      return [Math.max(-1.1, Math.min(1.1, x)), Math.max(3.3, Math.min(8.8, z))];
    };
    const [x, z] = f(t), [x2, z2] = f(t + 0.25), dx = x2 - x, dz = z2 - z, v = Math.hypot(dx, dz) / 0.25;
    // menyelam berkala: nilai gelombang > ambang → menyelam halus (smoothstep). Gelombang lambat, jadi ada jeda muncul-menyelam yang masuk akal
    const w = Math.sin(t * S.diveRate * 6.2832 + ph[5]), d = Math.max(0, Math.min(1, (w - 0.55) / 0.3)), depth = d * d * (3 - 2 * d);
    const spawnK = Math.max(0, Math.min(1, t / S.spawn));
    return { x, z, dir: dx >= 0 ? 1 : -1, heading: Math.atan2(dz, dx), speed: v, depth, spawnK };
  }

  // ---- duel memancing ----
  // Rencana fase dari seed: 0 = tenang (tarik!), 1 = amuk (lepas tombol!), 2 = menyelam (tarik-lepas pelan). Ada aba-aba singkat sebelum fase 1/2.
  function makePlan(monId, seed) {
    const F = BY_ID[monId].fight, r = mulberry32(seed >>> 0), rg = (a, b) => a + (b - a) * r(), segs = [];
    let t = rg(2.8, 3.8); segs.push({ a: 0, b: Math.round(t / DT), k: 0 });
    while (t < 90) {
      const dive = r() < F.diveP, len = dive ? rg(F.dive[0], F.dive[1]) : rg(F.surge[0], F.surge[1]);
      segs.push({ a: Math.round(t / DT), b: Math.round((t + len) / DT), k: dive ? 2 : 1 }); t += len;
      const c = rg(F.calm[0], F.calm[1]); segs.push({ a: Math.round(t / DT), b: Math.round((t + c) / DT), k: 0 }); t += c;
    }
    return segs;
  }
  function checkLog(log) {
    if (!Array.isArray(log) || log.length > 600) return false;
    let prev = -10;
    for (const s of log) { if (!Number.isInteger(s) || s < 0 || s >= MAX_STEPS || s - prev < 2) return false; prev = s; }   // jeda ≥ 2 langkah (0,1 dtk): batas wajar jari manusia
    return true;
  }
  // Duel langkah-demi-langkah. DIPAKAI SAMA PERSIS oleh game (real-time, 20 langkah/detik) dan server (memainkan ulang log) → hasil tidak mungkin berbeda.
  // advance(h): h = 1 bila tombol Tarik ditahan pada langkah ini. Setelah d.result terisi ("caught" | "snap" | "slack" | "waktu") duel selesai.
  function makeDuel(monId, seed) {
    const mon = BY_ID[monId]; if (!mon) throw new Error("monster tidak dikenal");
    const F = mon.fight, plan = makePlan(monId, seed);
    const d = { mon: monId, plan, step: 0, T: 0.25, P: 0.12, slack: 0, tired: 0, sweet: 0, seg: 0, prevK: 0, k: 0, h: 0, warn: false, result: null,
      advance(h, trace) {
        if (d.result) return d;
        h = h ? 1 : 0; d.h = h; const step = d.step;
        while (d.seg < plan.length - 1 && step >= plan[d.seg].b) d.seg++;
        const k = plan[d.seg].k; d.k = k;
        if (k === 0 && d.prevK !== 0) d.tired = 1.5;
        d.prevK = k;
        let dT, dP = 0, gain = 0;
        if (k === 0) { dT = h ? 0.34 : -0.40; if (h) gain = F.rate; else dP = -0.02; if (d.tired > 0) { gain *= 2; d.tired -= DT; } }
        else if (k === 1) { dT = h ? 1.15 * F.sf : -0.12; if (h) gain = F.rate * 0.25; else dP = -0.035 * F.sf; }
        else { dT = h ? 0.62 * F.sf : -0.10; if (h) gain = F.rate * 0.5; else dP = -0.02; }
        if (gain > 0) gain *= d.T >= SWEET[0] && d.T <= SWEET[1] ? 1.5 : d.T > SWEET[1] ? 0.6 : 1;
        d.T += dT * DT; d.P += (gain + dP) * DT;
        if (d.T >= SWEET[0] && d.T <= SWEET[1]) d.sweet++;
        if (d.P < 0) d.P = 0;
        d.step = step + 1;
        d.warn = warnAt(monId, plan, d.step);
        if (d.T >= 1) { d.T = 1; d.result = "snap"; return d; }
        if (d.T <= 0) { d.T = 0; d.slack += DT; if (d.slack > 1.2) { d.result = "slack"; return d; } } else d.slack = 0;
        if (trace) trace.push({ step, k, h, T: d.T, P: d.P, tired: d.tired > 0 });
        if (d.P >= 1) { d.P = 1; d.result = "caught"; return d; }
        if (d.step >= MAX_STEPS) d.result = "waktu";
        return d;
      } };
    return d;
  }
  function summary(d) {
    const steps = d.step, caught = d.result === "caught";
    const score = caught ? 1000 + Math.round(600 * d.sweet / steps) + Math.round(400 * Math.max(0, (MAX_STEPS - steps) / MAX_STEPS)) : Math.round(400 * d.P);
    return { valid: true, result: d.result, steps, P: d.P, T: d.T, sweet: d.sweet, caught, score, ms: steps * DT * 1000 };
  }
  // Memainkan ulang seluruh duel dari log (dipakai server). h berganti (0↔1) pada setiap indeks langkah di `log`.
  function simulate(monId, seed, log, trace) {
    if (!BY_ID[monId]) throw new Error("monster tidak dikenal");
    if (!checkLog(log)) return { valid: false, result: "invalid", score: 0, steps: 0 };
    const d = makeDuel(monId, seed); let h = 0, li = 0;
    while (!d.result) { while (li < log.length && log[li] === d.step) { h ^= 1; li++; } d.advance(h, trace); }
    return summary(d);
  }
  const kindAt = (plan, step) => { for (const s of plan) if (step >= s.a && step < s.b) return s.k; return 0; };
  // aba-aba: true bila fase amuk/menyelam dimulai dalam F.warn langkah ke depan (0,8 dtk Toman … 0,5 dtk Megalodon)
  function warnAt(monId, plan, step) { const w = BY_ID[monId].fight.warn; for (const s of plan) if (s.k !== 0 && step >= s.a - w && step < s.a) return true; return false; }

  // ---- hadiah & juara ----
  const better = (a, b) => !b || a.score > b.score || (a.score === b.score && (a.at < b.at || (a.at === b.at && a.uid < b.uid)));   // skor tertinggi → selesai paling awal → uid
  const rewardsOf = (monId) => BY_ID[monId].rw;
  const sanitizeName = (s) => String(s == null ? "" : s).replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 16) || "Pemancing";

  return { MIN, HOUR, DAY, WEEK, WIB, START_H, DURATION, GRACE, DEFAULT_ANCHOR, PREMIERE, MAX_ATTEMPTS, DT, MAX_STEPS, SWEET,
    MONSTERS, BY_ID, SWIM, anchorMs, eventOf, eventById, status, isLive, swimAt, makePlan, kindAt, warnAt, checkLog, makeDuel, summary, simulate, better, rewardsOf, sanitizeName, mulberry32, hash };
});
