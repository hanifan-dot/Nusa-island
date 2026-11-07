// Simulasi statistik & uji unit varian ikan (Bumbu 2.2). Jalankan: node tests/unit-variants.js
global.window = global; global.NW = {}; global.console = console;
require("../world/variants.js");
const V = NW.variants; let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra !== "" ? "  " + extra : "")); };
// mulberry32 supaya hasil dapat diulang
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const fish = { id: "nila", rarity: "biasa", wMin: .2, wMax: 1.2 };
ok("tabel peluang berjumlah tepat 100", V.tableOk(), JSON.stringify(V.VARIANT_TABLE));
ok("jumlah persen bobot (tanpa spot) tepat 100", Math.abs(Object.values(V.weights({})).reduce((a, b) => a + b, 0) - 100) < 1e-9);
for (const spot of ["lubuk", "teluk"]) for (const hit of [false, true]) { const w = V.weights({ spot, hit }); ok(`bobot spot ${spot}${hit ? "+riak" : ""} berjumlah 100 & tidak negatif`, Math.abs(w.normal + w.silver + w.sunset + w.pearl - 100) < 1e-9 && Object.values(w).every((x) => x >= 0), JSON.stringify(w)); }
ok("Mutiara tidak pernah dinaikkan oleh spot/riak", V.weights({ spot: "lubuk", hit: true }).pearl === V.VARIANT_TABLE.pearl && V.weights({ spot: "teluk", hit: true }).pearl === V.VARIANT_TABLE.pearl);
const N = 400000, r = rng(2026), c = { normal: 0, silver: 0, sunset: 0, pearl: 0 };
for (let i = 0; i < N; i++) c[V.roll(fish, {}, r)]++;
const pct = (k) => (c[k] / N) * 100;
const tol = (p) => 4 * Math.sqrt((p / 100) * (1 - p / 100) / N) * 100; // 4σ
for (const k of V.IDS) ok(`distribusi ${k}: ${pct(k).toFixed(3)}% ≈ ${V.VARIANT_TABLE[k]}% (±4σ=${tol(V.VARIANT_TABLE[k]).toFixed(3)})`, Math.abs(pct(k) - V.VARIANT_TABLE[k]) <= tol(V.VARIANT_TABLE[k]));
for (const spot of ["lubuk", "teluk"]) {
  const w = V.weights({ spot, hit: false }), cc = { normal: 0, silver: 0, sunset: 0, pearl: 0 }, rr = rng(7);
  for (let i = 0; i < N; i++) cc[V.roll(fish, { spot, hit: false }, rr)]++;
  ok(`distribusi spot ${spot} sesuai bobot (±4σ)`, V.IDS.every((k) => Math.abs((cc[k] / N) * 100 - w[k]) <= tol(w[k]) + 1e-9), V.IDS.map((k) => k + "=" + ((cc[k] / N) * 100).toFixed(2)).join(" "));
}
ok("sampah/emoji/dilindungi tidak pernah mendapat varian", ["sampah"].every(() => { const rr = rng(3); for (let i = 0; i < 20000; i++) { if (V.roll({ id: "x", rarity: "sampah", emoji: "🥾" }, {}, rr) !== "normal" || V.roll({ id: "y", rarity: "biasa", protected: true }, {}, rr) !== "normal" || V.roll({ id: "z", rarity: "sampah" }, {}, rr) !== "normal") return false; } return true; }));
// roll tidak memakai state global selain rnd yang diberikan, dan deterministik
{ const a = rng(11), b = rng(11); let same = true; for (let i = 0; i < 1000; i++) if (V.roll(fish, {}, a) !== V.roll(fish, {}, b)) same = false; ok("roll deterministik untuk RNG yang sama (satu panggilan = satu keputusan)", same); }
// pemilihan varian tidak menyentuh rarity/spesies: fungsi hanya mengembalikan id varian
ok("roll hanya mengembalikan id varian yang sah", ["normal", "silver", "sunset", "pearl"].includes(V.roll(fish, {}, () => 0.999)) && V.roll(fish, {}, () => 0) === "pearl");
// ekspektasi: bonus spot kecil & wajar (tidak "hampir pasti")
const wl = V.weights({ spot: "lubuk", hit: true }); ok("bonus spot+riak wajar (varian istimewa non-mutiara ≤ 15% total)", wl.silver + wl.sunset <= 15, `silver=${wl.silver.toFixed(2)} sunset=${wl.sunset.toFixed(2)}`);
// migrasi: ikan lama tetap normal; atribut rusak dibuang
{ const S = { cooler: [{ uid: "i1", id: "nila", w: 1 }, { uid: "i2", id: "nila", w: 1, vr: "ghost" }, { uid: "i3", id: "nila", w: 1, vr: "pearl", lock: true }], home: { placedFish: [{ uid: "i4", id: "nila", w: 1, vr: 5 }] }, vd: { nila: { silver: { n: 2, best: 1 }, aneh: { n: 1 }, pearl: { n: 0 } }, bad: 3 } };
  const f = V.migrate(S);
  ok("migrasi: ikan lama tanpa vr tetap tanpa vr (tidak ada varian acak)", S.cooler[0].vr === undefined);
  ok("migrasi: vr tak sah dibuang, vr sah (pearl) dipertahankan beserta kunci", S.cooler[1].vr === undefined && S.cooler[2].vr === "pearl" && S.cooler[2].lock === true && S.home.placedFish[0].vr === undefined && f === 2);
  ok("migrasi: koleksi dibersihkan (kunci asing & n=0 dibuang)", S.vd.nila.silver.n === 2 && !S.vd.nila.aneh && !S.vd.nila.pearl && !S.vd.bad);
  const S2 = {}; V.migrate(S2); ok("migrasi: simpanan tanpa data menjadi S.vd kosong", JSON.stringify(S2.vd) === "{}"); }
// record & seen
{ const S = { day: 3, dex: { nila: { n: 1, best: 1 } } }; V.record(S, fish, "silver", 0.8, "muara"); V.record(S, fish, "silver", 1.1, "toba"); V.record(S, { id: "s", rarity: "sampah", emoji: "x" }, "silver", 1, "muara");
  ok("koleksi: rekor berat & lokasi PERTAMA tersimpan", S.vd.nila.silver.n === 2 && S.vd.nila.silver.best === 1.1 && S.vd.nila.silver.loc === "muara");
  ok("koleksi: Normal dihitung dari dex lama, varian lain belum", V.seen(S, "nila", "normal") && V.seen(S, "nila", "silver") && !V.seen(S, "nila", "pearl") && !S.vd.s); }
ok("raksasa: ambang berat & ekor ukuran", V.isGiant({ wMin: 1, wMax: 30, id: "a" }, 29.5) && !V.isGiant({ wMin: 1, wMax: 30, id: "a" }, 10) && V.isGiant({ wMin: 1, wMax: 5, id: "a" }, 45) && !V.isGiant({ emoji: "x", wMin: 0, wMax: 1 }, 99));
console.log(`\nunit varian: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
