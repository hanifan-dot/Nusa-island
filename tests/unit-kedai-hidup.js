// Uji jadwal kehidupan Kedai Atuk Bahar (logika murni, tanpa browser). Jalankan: node tests/unit-kedai-hidup.js
const H = require("../world/kedai/hidup.js");
let pass = 0, fail = 0; const ok = (n, c, e) => { (c ? pass++ : fail++); console.log((c ? "PASS " : "FAIL ") + n + (c ? "" : "  " + JSON.stringify(e))); };
// peta tiruan: halaman 24.6–29.4 × 23.8–29.6; rumah di kiri; bangku; meja/kursi hanya bila aktif
const B = { x0: 21, y0: 25, x1: 24.5, y1: 27.5 }, TABLE = { x: 26.5, y: 26.5 }, SEAT = { x: 25.7, y: 26.5 };
const solids = [{ x0: B.x0, y0: B.y0, x1: B.x1 - 0.02, y1: B.y1 }, { x: 26.5, y: 25.35, r: 0.32 }, { x: 26.5, y: 27.65, r: 0.32 }];
const S_T = { x: TABLE.x, y: TABLE.y, r: 0.62 }, S_S = { x: SEAT.x, y: SEAT.y, r: 0.3 };
const on = (s, v) => { const i = solids.indexOf(s); if (v && i < 0) solids.push(s); else if (!v && i >= 0) solids.splice(i, 1); };
const walk = (x, y, r = 0.2) => { if (x < 24 || x > 30 || y < 23 || y > 30) return false; for (const s of solids) { if (s.r !== undefined) { if (Math.hypot(x - s.x, y - s.y) < s.r + r * 0.8) return false; } else if (x > s.x0 - r * 0.8 && x < s.x1 + r * 0.8 && y > s.y0 - r * 0.8 && y < s.y1 + r * 0.8) return false; } return true; };
const mk = (seed = 7) => H.makeDirector({ walkable: walk, bounds: { x0: 24.6, y0: 23.8, x1: 29.4, y1: 29.6 }, door: { x: 24.8, y: 26.25 }, doorIn: { x: 24.52, y: 26.25 }, place: { x: 25.45, y: 26.5 }, seat: SEAT, table: TABLE, seed,
  benches: [{ sit: { x: 26.5, y: 25.3 }, app: { x: 26.5, y: 24.73 }, dir: 4 }, { sit: { x: 26.5, y: 27.7 }, app: { x: 26.5, y: 28.27 }, dir: 0 }],
  watch: [{ x: 27.55, y: 25.7 }, { x: 27.6, y: 27.4 }], play: [{ x: 28.3, y: 25.3 }, { x: 28.4, y: 27.9 }, { x: 27, y: 28.6 }], onTable: (v) => on(S_T, v), onSeat: (v) => on(S_S, v) });
const reset = () => { on(S_T, false); on(S_S, false); };
const DT = 1 / 30, HPS = 1 / H.SPH;
const brief = (d) => { const s = d.state(); return { atuk: s.atuk.vis ? (s.atuk.seated ? "duduk" : "luar") : "dalam", meja: s.table.state, anak: s.kids.map((k) => (k.vis ? "luar" : "dalam")).join(","), lampu: s.lamp > 0.9 ? 1 : s.lamp < 0.1 ? 0 : 0.5 }; };

ok("1 fase: batas 06/07/17/18", [H.phaseOf(5.99), H.phaseOf(6), H.phaseOf(6.99), H.phaseOf(7), H.phaseOf(16.99), H.phaseOf(17), H.phaseOf(17.99), H.phaseOf(18), H.phaseOf(0)].join() === "night,setup,setup,open,open,close,close,night,night");
// keadaan seketika di berbagai jam
const at = (h) => { reset(); const d = mk(); d.update(DT, h); return brief(d); };
const n22 = at(22), n3 = at(3), o12 = at(12), o7 = at(7.2), s69 = at(6.9);
ok("2 malam (22.00 & 03.00): Atuk & anak di dalam, meja disimpan, lampu rumah menyala", [n22, n3].every((b) => b.atuk === "dalam" && b.meja === "away" && b.anak === "dalam,dalam" && b.lampu === 1), [n22, n3]);
ok("3 siang (12.00): Atuk duduk, meja di halaman, anak di luar, lampu rumah mati", o12.atuk === "duduk" && o12.meja === "down" && o12.anak === "luar,luar" && o12.lampu === 0, o12);
ok("4 06.54 (datang terlambat): meja sudah di halaman, Atuk duduk, anak masih di dalam", s69.atuk === "duduk" && s69.meja === "down" && s69.anak === "dalam,dalam", s69);
ok("5 07.12: anak sudah keluar", o7.anak === "luar,luar" || o7.anak === "dalam,luar", o7);
ok("6 17.90 (sisa penutupan selesai): semuanya di dalam", at(17.9).atuk === "dalam" && at(17.9).anak === "dalam,dalam" && at(17.9).meja === "away", at(17.9));
// simulasi satu hari penuh, jam berjalan kontinu
function runDay(h0, h1, seed) {
  reset(); const d = mk(seed); let h = h0, prev = null, maxJump = 0, bad = [], vis = { kidMax: 0, ev: [] }, lastB = "", maxAtuk = 0;
  const mDt = 0.1; // tambahan: dt besar (0.1) juga harus aman
  while (h < h1) {
    d.update(DT, h); h += DT * HPS;
    const s = d.state(), cur = [s.atuk, ...s.kids].filter((a) => a.vis).map((a) => ({ id: a.id, x: a.x, y: a.y }));
    if (prev) for (const c of cur) { const p = prev.find((q) => q.id === c.id); if (p) { const j = Math.hypot(c.x - p.x, c.y - p.y); if (j > maxJump) maxJump = j; } }
    for (const a of [s.atuk, ...s.kids]) if (a.vis && a.moving && !(a.st === "enter" || a.st === "exit" && false) && !walk(a.x, a.y, 0.12) && a.st !== "enter") bad.push([a.id, a.st, +a.x.toFixed(2), +a.y.toFixed(2), +h.toFixed(2)]);
    const b = JSON.stringify(brief(d)); if (b !== lastB) { vis.ev.push([+h.toFixed(2), b]); lastB = b; }
    if (s.kids.length !== 2) vis.dup = true; prev = cur;
  }
  return { maxJump, bad, vis, stats: d.stats };
}
const run = runDay(5.5, 18.7, 7);
ok("7 tanpa teleport: lompatan posisi antar-frame maksimum ≤ 0.08 petak (dt=1/30)", run.maxJump <= 0.08, run.maxJump);
ok("8 semua langkah berjalan berada di petak yang bisa diinjak (collision peta)", run.bad.length === 0, run.bad.slice(0, 5));
ok("9 tidak ada jalur gagal (fallback = 0) & hanya 2 anak", run.stats.fallbacks === 0 && !run.vis.dup, run.stats);
const evs = run.vis.ev.map((e) => e[1]);
ok("10 urutan keadaan: malam → Atuk keluar bawa meja → duduk → anak keluar → penutupan → malam", evs.some((e) => e.includes('"atuk":"luar","meja":"carried"')) && evs.some((e) => e.includes('"meja":"placing"')) && evs.some((e) => e.includes('"atuk":"duduk","meja":"down","anak":"dalam,dalam"')) && evs.some((e) => e.includes('"anak":"luar,luar"')) && evs.some((e) => e.includes('"meja":"lifting"')) && evs[evs.length - 1].includes('"atuk":"dalam","meja":"away","anak":"dalam,dalam"'), run.vis.ev);
const tOut = run.vis.ev.find((e) => e[1].includes('"atuk":"luar"')); ok("11 Atuk mulai keluar tepat sekitar 06.00", tOut && tOut[0] >= 5.99 && tOut[0] < 6.1, tOut);
const tIn = run.vis.ev.filter((e) => e[1].includes('"atuk":"dalam"')).pop(); ok("12 semua sudah di dalam sebelum 18.00", tIn && tIn[0] < 18.0, tIn);
const tKid = run.vis.ev.find((e) => e[1].includes('"anak":"dalam,luar"') || e[1].includes('"anak":"luar,luar"')); ok("13 anak-anak baru keluar setelah 07.00", tKid && tKid[0] >= 7.0 && tKid[0] < 7.2, tKid);
ok("14 beberapa seed berbeda: tetap tanpa teleport & tanpa jalur gagal", [1, 2, 3, 4, 5].every((sd) => { const r = runDay(6.9, 18.2, sd); return r.maxJump <= 0.08 && r.stats.fallbacks === 0 && r.bad.length === 0; }));
// pemain datang terlambat / muat ulang: keadaan sama dengan simulasi kontinu
const cont = (h) => { reset(); const d = mk(); let t = 5.5; while (t < h) { d.update(DT, t); t += DT * HPS; } return brief(d); };
const same = [8, 12, 15.5, 17.9].every((h) => { const a = cont(h), b = at(h); return a.atuk === b.atuk && a.meja === b.meja; });
ok("15 muat ulang/datang terlambat pada jam sama = keadaan sama dengan yang berjalan kontinu", same && at(6.3).atuk !== "dalam" && at(6.3).meja !== "away", [at(6.3), cont(6.3)]);
reset(); const dd = mk(); dd.update(DT, 12); dd.update(DT, 12.01); dd.update(DT, 20); const jb = brief(dd);
ok("16 lompatan waktu (tidur) 12.00→20.00 langsung ke keadaan malam, tidak ada sisa meja/anak", jb.atuk === "dalam" && jb.meja === "away" && jb.anak === "dalam,dalam", jb);
reset(); const d2 = mk(); d2.update(DT, 23.99); d2.update(DT, 0.0); ok("17 lewat tengah malam tidak memicu ulang keadaan aneh", brief(d2).atuk === "dalam");
ok("18 solid meja & kursi hanya aktif saat dipakai (malam: bebas)", (() => { reset(); const d = mk(); d.update(DT, 22); const n = solids.includes(S_T) || solids.includes(S_S); d.update(DT, 22.001); return !n; })() && (() => { reset(); const d = mk(); d.update(DT, 12); return solids.includes(S_T) && solids.includes(S_S); })());
// pencari jalur
reset(); const pth = H.findPath(walk, { x: 24.8, y: 26.25 }, { x: 28.4, y: 27.9 }, { x0: 24.6, y0: 23.8, x1: 29.4, y1: 29.6, r: 0.2 }); on(S_T, true);
const pth2 = H.findPath(walk, { x: 25.45, y: 26.5 }, { x: 27.6, y: 26.5 }, { x0: 24.6, y0: 23.8, x1: 29.4, y1: 29.6, r: 0.2 });
ok("19 jalur menghindari meja (tidak menembus solid)", pth2 && pth2.length >= 3 && pth2.every((p, i) => i === 0 || H.clearLine(walk, pth2[i - 1], p, 0.2)), pth2);
ok("20 jalur lurus bila bebas", pth && pth.length >= 2);
console.log(`\n==== ${pass} PASS, ${fail} FAIL ====`); process.exit(fail ? 1 : 0);
