// Menghitung dampak ekonomi REKOMENDASI Samudra Follower terhadap ikan lama (read-only, tidak mengubah apa pun). Jalankan: node economy/sf-rekomendasi.js [--json]
const vm = require("vm"), fs = require("fs"), path = require("path"), FM = require("../fishmath.js"), SF = require("./sf-core.js");
const ctx = vm.createContext({ console }); vm.runInContext(fs.readFileSync(path.join(__dirname, "../data.js"), "utf8") + ";globalThis.T={FISH,RARITY}", ctx);
const { FISH, RARITY } = ctx.T, SCALE = 3, MULT = 1.075;                  // pengali harga harian rata-rata (0,7–1,45 seragam)
const meanW = (f) => f.wMin + (f.wMax - f.wMin) / 3.3;                    // rollWeight: wr=rnd^2,3 → rata-rata 1/3,3 (tanpa ekor ekstrem)
const sale = (price, w) => FM.priceFor({ price }, w, MULT, SCALE);
const tw = Object.values(RARITY).reduce((a, r) => a + r.weight, 0);
// Ikan lama: koin rata-rata per pendaratan = Σ bobot rarity × rata-rata harga jual spesies di rarity itu (pendekatan seragam antar spesies; sampah ikut).
const old = { perRarity: {}, ev: 0 };
for (const k of Object.keys(RARITY)) { const fs_ = FISH.filter((f) => f.rarity === k), m = fs_.reduce((a, f) => a + sale(f.price, meanW(f)), 0) / fs_.length; old.perRarity[k] = { n: fs_.length, share: RARITY[k].weight / tw, meanSale: Math.round(m), minSale: Math.min(...fs_.map((f) => sale(f.price, meanW(f)))), maxSale: Math.max(...fs_.map((f) => sale(f.price, meanW(f)))) }; old.ev += RARITY[k].weight / tw * m; }
old.ev = Math.round(old.ev);
const fish = SF.IDS.map((id) => { const s = SF.SPEC[id], w = (s.wMin + s.wMax) / 2 > 0 ? meanW(s) : 0, rec = s.rec;
  return { id, rarity: s.rarity, event: s.event, wMean: +w.toFixed(2), price: rec.price, chance: rec.chance, dayCap: rec.dayCap, saleMean: sale(rec.price, w) * 1 / 1, saleMin: sale(rec.price, s.wMin), saleMax: sale(rec.price, s.wMax), evPerCast: +(rec.chance * sale(rec.price, w)).toFixed(2), perPlayerDayMax: rec.dayCap * sale(rec.price, s.wMax) }; });
const perm = fish.filter((f) => !f.event).reduce((a, f) => a + f.evPerCast, 0), ev = fish.filter((f) => f.event).reduce((a, f) => a + f.evPerCast, 0);
const out = { baseline: old, fish, evPermanent: +perm.toFixed(1), evEvent: +ev.toFixed(1), shareOfOld: { permanent: +(perm / old.ev * 100).toFixed(1), withEvent: +((perm + ev) / old.ev * 100).toFixed(1) }, oneInEvery: Object.fromEntries(fish.map((f) => [f.id, Math.round(1 / f.chance)])) };
if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 1)); else { console.log("Ikan lama: rata-rata", old.ev, "koin/pendaratan"); console.table(fish.map((f) => ({ id: f.id, harga_per_kg: f.price, peluang: f.chance, "1 dari": Math.round(1 / f.chance), jual_rata2: f.saleMean, jual_min: f.saleMin, jual_maks: f.saleMax, "koin/pendaratan": f.evPerCast }))); console.log("Tambahan permanen:", out.shareOfOld.permanent + "% dari ikan lama; +event:", out.shareOfOld.withEvent + "%"); }
module.exports = out;
