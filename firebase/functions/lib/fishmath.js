// SALINAN OTOMATIS dari fishmath.js — jangan diedit di sini (node firebase/scripts/sync-economy.js).
// =========================================================
//  NUSA ISLAND — Bumbu 1.2 "Ukuran ikan, perlawanan, harga"
//  Fungsi murni (tanpa DOM) supaya bisa diuji di Node dan dipakai game.js.
//  Prinsip: ikan ≤ 20 kg berperilaku persis seperti sebelum Bumbu 1.2.
//  Pengaruh ukuran baru hanya muncul untuk ikan yang benar-benar besar.
// =========================================================
(function (root) {
"use strict";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- Harga: berat > 100 kg dikompres supaya ikan raksasa tidak merusak ekonomi ----
const FULL_PRICE_KG = 100, PRICE_EXP = 0.7;
function effectiveKg(w) { return w <= FULL_PRICE_KG ? w : FULL_PRICE_KG + Math.pow(w - FULL_PRICE_KG, PRICE_EXP); }
function priceFor(fish, w, mult, scale) { return Math.max(1, Math.round(fish.price * scale * effectiveKg(w) * mult)); }

// ---- Berat ikan: kecil paling sering; ekstrem sangat langka (hanya spesies tertentu) ----
// Rentang biasa: wMin..wMax dengan kurva pangkat 2,3 (seperti dulu). Spesies yang punya xMax/xP
// memiliki ekor ekstrem: dengan peluang xP beratnya melampaui wMax sampai xMax, itupun condong ke bawah.
function rollWeight(fish, rnd) {
  rnd = rnd || Math.random;
  if (fish.xMax && rnd() < fish.xP) {
    const e = Math.pow(rnd(), 1.6);
    return { w: Math.round((fish.wMax + (fish.xMax - fish.wMax) * e) * 100) / 100, wr: 1, extreme: true };
  }
  const wr = Math.pow(rnd(), 2.3);
  return { w: Math.round((fish.wMin + (fish.wMax - fish.wMin) * wr) * 100) / 100, wr, extreme: false };
}

// ---- Perlawanan ----
const BIG_REF_KG = 20;                                   // di bawah ini tidak ada efek ukuran
// Konstanta penyetelan efek ukuran, disetel lewat simulasi tests/browser/balance_sim.py (pemain rata-rata, reaksi 0,18–0,38 dtk)
const TUNE = { size: 0.06, surgeLen: 0.2, surgeFreq: 0.1, surgeProg: 0.15, surgeRise: 0.8, sizeHi: 0.2, fatStart: 20, fatSpan: 30, fatMax: 0.35, tol: 2.0, ovRise: 0.25, ovRiseMax: 0.8, ovReel: 0.2, ovReelMax: 0.6 };
// Kelelahan ikan: setelah FATIGUE_START detik tenaga turun pelan sampai (1-FATIGUE_MAX) di FATIGUE_START+FATIGUE_SPAN
const fatigue = (age) => 1 - TUNE.fatMax * clamp((age - TUNE.fatStart) / TUNE.fatSpan, 0, 1);
const bigness = (w) => clamp(Math.log2(Math.max(w, 1) / BIG_REF_KG) / 4, 0, 1);   // 0 di ≤20 kg, 1 di ≥320 kg
// di atas 100 kg tekanan ikan bertambah lebih tajam: raksasa memang tidak boleh "gratis" walau joran terbaik
const sizeMul = (w) => 1 + TUNE.size * Math.log2(Math.max(1, w / BIG_REF_KG)) + TUNE.sizeHi * Math.log2(Math.max(1, w / 100));         // 1 di ≤20 kg, ±1,56 di 500 kg
const fightPower = (fish, w, wr) => fish.power * (0.85 + 0.3 * clamp(wr, 0, 1)) * sizeMul(w);

// ---- Joran vs ikan: kapasitas = batas REKOMENDASI dengan toleransi 2× (lebih dari itu: peringatan + risiko putus naik) ----
const overload = (w, cap) => Math.max(0, w / cap - TUNE.tol);
function overloadMuls(w, cap) {
  const o = overload(w, cap), k = Math.pow(o, 0.85);
  return { o, weak: o > 0, rise: 1 + Math.min(TUNE.ovRiseMax, TUNE.ovRise * k), reel: 1 / (1 + Math.min(TUNE.ovReelMax, TUNE.ovReel * k)) };
}

const API = { TUNE, FULL_PRICE_KG, PRICE_EXP, effectiveKg, priceFor, rollWeight, bigness, sizeMul, fatigue, fightPower, overload, overloadMuls, clamp };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else { root.NW = root.NW || {}; root.NW.FM = API; }
})(typeof window !== "undefined" ? window : globalThis);
