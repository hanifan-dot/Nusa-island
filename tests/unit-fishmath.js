// Tes unit fishmath.js (Bumbu 1.2): berat ikan, harga, tekanan fight. Jalankan: node tests/unit-fishmath.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const FM = require("../fishmath.js");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8") + ";this.FISH=FISH;this.UPGRADES=UPGRADES;", ctx);
const { FISH, UPGRADES } = ctx;
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) pass++; else { fail++; console.log("GAGAL", n, x === undefined ? "" : x); } };
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const F = (id) => FISH.find((f) => f.id === id);

// --- harga ---
const m = F("marlin");
ok("harga ≤ 100 kg = rumus lama", [1, 20, 80, 100].every((w) => FM.priceFor(m, w, 1, 3) === Math.round(m.price * 3 * w)));
ok("harga > 100 kg dikompres tapi tetap naik", [150, 250, 400, 500].every((w, i, a) => !i || FM.priceFor(m, w, 1, 3) > FM.priceFor(m, a[i - 1], 1, 3)) && FM.priceFor(m, 500, 1, 3) < 0.4 * m.price * 3 * 500);
ok("harga minimal 1 koin", FM.priceFor({ price: 0.001 }, 0.1, 0.7, 3) >= 1);
ok("effectiveKg kontinu di 100 kg", FM.effectiveKg(100) === 100 && Math.abs(FM.effectiveKg(100.001) - 100.001) < 0.01);
// --- tekanan ---
ok("bigness 0 untuk ≤ 20 kg, naik, maksimum 1", FM.bigness(1) === 0 && FM.bigness(20) === 0 && FM.bigness(40) > 0 && FM.bigness(1000) === 1);
ok("sizeMul 1 untuk ≤ 20 kg dan naik monoton", FM.sizeMul(5) === 1 && FM.sizeMul(20) === 1 && [30, 60, 100, 200, 300, 500].every((w, i, a) => FM.sizeMul(w) > (i ? FM.sizeMul(a[i - 1]) : 1)));
ok("tekanan di atas 100 kg naik lebih tajam (sizeHi)", FM.sizeMul(500) - FM.sizeMul(100) > FM.sizeMul(100) - FM.sizeMul(20));
ok("fightPower ikan ≤ 20 kg sama dengan rumus lama", FISH.filter((f) => f.wMax <= 20).every((f) => [0, 0.5, 1].every((wr) => Math.abs(FM.fightPower(f, f.wMin, wr) - f.power * (0.85 + 0.3 * wr)) < 1e-9)));
ok("kelelahan ikan: 1 sebelum 20 dtk lalu turun, batas bawah 0,65", FM.fatigue(0) === 1 && FM.fatigue(20) === 1 && FM.fatigue(35) < 1 && Math.abs(FM.fatigue(500) - 0.65) < 1e-9);
// --- joran vs ikan ---
const cap = UPGRADES.rod.cap;
ok("joran sesuai/di dalam toleransi 2× tidak diberi beban lebih", FM.overloadMuls(80, cap[3]).weak === false && FM.overloadMuls(2 * cap[3], cap[3]).weak === false);
const o1 = FM.overloadMuls(3 * cap[3], cap[3]), o2 = FM.overloadMuls(8 * cap[3], cap[3]);
ok("di luar toleransi: peringatan, tegangan naik, gulungan melambat, ada batas atas", o1.weak && o1.rise > 1 && o1.reel < 1 && o2.rise > o1.rise && o2.reel < o1.reel && o2.rise <= 1 + FM.TUNE.ovRiseMax + 1e-9 && o2.reel >= 1 / (1 + FM.TUNE.ovReelMax) - 1e-9);
ok("ikan kecil tidak pernah melampaui joran terbaik", FISH.every((f) => FM.overloadMuls(f.xMax || f.wMax, cap[9]).weak === false || f.id === "hiu_paus"));
// --- berat ikan ---
const R = rng(7), n = 60000;
for (const id of ["marlin", "tuna", "kerapu_raksasa"]) {
  const f = F(id), ws = []; let over = 0;
  for (let i = 0; i < n; i++) { const r = FM.rollWeight(f, R); ws.push(r.w); if (r.w > f.wMax) over++; }
  ws.sort((a, b) => a - b);
  ok(`${id}: dalam [wMin, xMax]`, ws[0] >= f.wMin && ws[n - 1] <= f.xMax, [ws[0], ws[n - 1]]);
  ok(`${id}: berat tengah di bawah ${Math.round(0.5 * f.wMax)} kg (kecil paling sering)`, ws[n >> 1] < 0.5 * f.wMax, ws[n >> 1]);
  ok(`${id}: ekstrem melampaui wMax sangat langka (≈ xP=${f.xP})`, Math.abs(over / n - f.xP) < 0.006, over / n);
}
ok("spesies tanpa ekor ekstrem tidak pernah melampaui wMax", FISH.filter((f) => !f.xMax).every((f) => { const r = rng(3); for (let i = 0; i < 400; i++) if (FM.rollWeight(f, r).w > f.wMax) return false; return true; }));
ok("ekor ekstrem hanya pada spesies besar dan peluangnya kecil (≤ 2%)", FISH.filter((f) => f.xMax).every((f) => f.xMax > f.wMax && f.xP <= 0.02 && f.wMax >= 50));
ok("tidak ada ikan melampaui 500 kg kecuali Hiu Paus (dilindungi)", FISH.every((f) => (f.xMax || f.wMax) <= 500 || f.protected));
console.log(`unit fishmath: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
