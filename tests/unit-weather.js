// Uji unit model cuaca Bumbu 2.3. Jalankan: node tests/unit-weather.js
global.window = global; global.NW = {}; global.console = console;
try { Object.defineProperty(global, "navigator", { value: { userAgent: "node" }, configurable: true }); } catch (e) {}
require("../world/weather.js");
const W = NW.weather; let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra !== "" ? "  " + extra : "")); };
const AREAS = ["muara", "toba"];
// 1) deterministik: parameter sama → hasil sama (tidak acak per refresh)
{ let same = true; for (const a of AREAS) for (let d = 1; d < 30; d++) for (let h = 0; h < 24; h += 1.5) { const x = JSON.stringify(W.forecast(a, d, h, 12345)), y = JSON.stringify(W.forecast(a, d, h, 12345)); if (x !== y) same = false; } ok("forecast deterministik (seed+wilayah+hari+jam sama → hasil sama)", same); }
// 2) seed berbeda → jadwal berbeda; wilayah berbeda → tidak sama persis
{ let diffSeed = 0, diffArea = 0, n = 0; for (let k = 0; k < 400; k++) { n++; if (W.segKind("muara", k, 1) !== W.segKind("muara", k, 999)) diffSeed++; if (W.segKind("muara", k, 7) !== W.segKind("toba", k, 7)) diffArea++; }
  ok("seed berbeda memberi jadwal berbeda", diffSeed > n * 0.2, diffSeed + "/" + n); ok("Muara dan Toba tidak memakai cuaca yang sama persis", diffArea > n * 0.2, diffArea + "/" + n); }
// 3) awal permainan cerah (hari 1 sebelum siang)
ok("hari 1 sebelum siang selalu cerah (kesan pertama)", AREAS.every((a) => [1, 2, 77, 4242].every((s) => W.forecast(a, 1, 6.5, s).kind === "cerah" && W.forecast(a, 1, 11.5, s).kind === "cerah")));
// 4) distribusi & episode: kondisi muncul sesuai konfigurasi, tidak berubah tiap beberapa detik
for (const a of AREAS) {
  const cnt = { cerah: 0, mendung: 0, hujan: 0, kabut: 0 }, N = 20000; let runs = 0, runLen = 0, maxRun = 0, prev = null;
  for (let k = 2; k < N; k++) { const kd = W.segKind(a, k, 31337); cnt[kd]++; if (kd === prev) runLen++; else { runs++; runLen = 1; } maxRun = Math.max(maxRun, runLen); prev = kd; }
  const tot = N - 2, cfg = W.CFG[a].w, sum = Object.values(cfg).reduce((x, y) => x + y, 0);
  ok(`${a}: cerah paling sering, hujan & kabut ada tetapi tidak dominan`, cnt.cerah > cnt.hujan && cnt.cerah > cnt.kabut && cnt.hujan / tot > 0.08 && cnt.hujan / tot < 0.4, JSON.stringify(Object.fromEntries(Object.entries(cnt).map(([k, v]) => [k, +(v / tot * 100).toFixed(1)]))));
  ok(`${a}: episode cuaca bertahan rata-rata ≥ 1,5 segmen (±3 menit nyata), bukan berubah tiap segmen`, tot / runs >= 1.5, "rata-rata " + (tot / runs).toFixed(2) + " segmen");
}
{ const c = (a) => { const o = { kabut: 0 }; for (let k = 2; k < 20000; k++) if (W.segKind(a, k, 5) === "kabut") o.kabut++; return o.kabut; }; ok("Toba lebih sering berkabut daripada Muara", c("toba") > c("muara") * 2); }
// 5) kabut pagi lembut Toba; Muara tanpa kabut pagi
{ let toba = 0, muara = 0; for (let d = 2; d < 60; d++) { if (W.forecast("toba", d, 5.5, 777).fog > 0.1) toba++; if (W.forecast("muara", d, 5.5, 777).fog > 0.1) muara++; } ok("Toba kerap berkabut lembut di pagi buta, Muara jauh lebih jarang", toba > muara + 8, `toba ${toba}/58 · muara ${muara}/58`); }
{ let faded = true; for (let d = 2; d < 40; d++) { const f9 = W.forecast("toba", d, 9.9, 777), k = W.forecast("toba", d, 9.9, 777).kind; if (k === "cerah" && f9.fog > 0.02) faded = false; } ok("kabut pagi memudar menjelang siang pada hari cerah", faded); }
// 6) rentang parameter selalu sah, hujan hanya dengan langit tertutup, kabut ≠ hujan deras
{ let good = true, rainNeedsCloud = true, fogNoRain = true; for (const a of AREAS) for (let k = 0; k < 3000; k++) for (const h of [0, 3, 6, 9, 12, 15, 18, 21]) { const f = W.forecast(a, 1 + (k % 200), h, k + 3); for (const v of ["cloud", "rain", "fog", "wind", "storm"]) if (!(f[v] >= 0 && f[v] <= 1)) good = false; if (f.rain > 0 && f.cloud < 0.9) rainNeedsCloud = false; if (f.kind === "kabut" && f.rain > 0) fogNoRain = false; } ok("semua parameter berada di 0..1", good); ok("hujan selalu bersama langit tertutup", rainNeedsCloud); ok("kondisi kabut tidak ikut hujan", fogNoRain); }
// 7) hujan bervariasi (ringan ↔ deras) dalam satu episode
{ let lo = 1, hi = 0; for (let k = 2; k < 4000 && hi - lo < 0.2; k++) if (W.segKind("muara", k, 91) === "hujan") for (let s = 0; s < 6; s += 0.25) { const f = W.forecast("muara", 1 + Math.floor((k * 6 + s) / 24), (k * 6 + s) % 24, 91); if (f.kind === "hujan") { lo = Math.min(lo, f.rain); hi = Math.max(hi, f.rain); } } ok("intensitas hujan berubah dalam satu episode (ringan ↔ deras)", hi - lo >= 0.2, `rentang ${lo.toFixed(2)}–${hi.toFixed(2)}`); }
// 8) keseimbangan mancing: pengali waktu tunggu terbatas, hujan deras tidak membuat mustahil
{ const f0 = W.biteFactor({ rain: 0, cloud: 0.1, fog: 0 }), lr = W.biteFactor({ rain: 0.4, cloud: 1, fog: 0 }), hr = W.biteFactor({ rain: 1, cloud: 1, fog: 0 }), fg = W.biteFactor({ rain: 0, cloud: 0.45, fog: 0.9 });
  ok("cerah: pengali waktu tunggu ≈ 1", Math.abs(f0 - 1) < 0.04, f0.toFixed(3)); ok("hujan ringan sedikit mempercepat gigitan (≥ −12%)", lr < 1 && lr >= 0.88, lr.toFixed(3)); ok("hujan deras sedikit memperlambat (≤ +8%)", hr > 1 && hr <= 1.08, hr.toFixed(3)); ok("kabut hampir netral (±5%)", Math.abs(fg - 1) < 0.05, fg.toFixed(3));
  let mn = 9, mx = 0; for (let r = 0; r <= 1; r += 0.01) for (let c = 0; c <= 1; c += 0.25) for (let f = 0; f <= 1; f += 0.25) { const v = W.biteFactor({ rain: r, cloud: c, fog: f }); mn = Math.min(mn, v); mx = Math.max(mx, v); } ok("pengali waktu tunggu selalu di 0,88–1,08 untuk semua kombinasi cuaca", mn >= 0.88 && mx <= 1.08, `min ${mn.toFixed(3)} maks ${mx.toFixed(3)}`); }
// 9) pengaturan tampilan: tiga tingkat, partikel menurun drastis
{ const L = W.LEVELS; ok("tiga tingkat efek ada dan partikel menurun bertahap", L.tinggi.drops > L.sedang.drops && L.sedang.drops > L.rendah.drops && L.rendah.drops <= L.tinggi.drops / 8, `${L.tinggi.drops}/${L.sedang.drops}/${L.rendah.drops}`); ok("Rendah tanpa kilatan, tetes atap, atau pita kabut", L.rendah.flash === 0 && L.rendah.drips === 0 && L.rendah.bands === 0); ok("batas partikel tidak melebihi pool tetap", L.tinggi.drops <= 150 && L.tinggi.ripples <= 40); }
// 10) migrasi: seed dibuat sekali, tidak menimpa, tidak menyentuh koin/progres
{ const S = { money: 777, cooler: [1, 2], day: 5, hour: 7 }; W.migrate(S); const s1 = S.wx.seed; W.migrate(S); ok("migrasi membuat seed sekali & stabil", Number.isFinite(s1) && s1 >= 1 && S.wx.seed === s1 && S.wx.v === 1); ok("migrasi tidak menyentuh koin & ikan", S.money === 777 && S.cooler.length === 2 && S.day === 5); const T = { wx: { seed: 4242, v: 1 } }; W.migrate(T); ok("seed yang sudah ada tidak diganti", T.wx.seed === 4242); const U = { wx: "rusak" }; W.migrate(U); ok("data cuaca rusak diperbaiki tanpa error", Number.isFinite(U.wx.seed)); }
// 11) sumber dapat diganti (siap server)
ok("sumber ramalan dapat diganti tanpa menyentuh visual/audio", typeof W.source.forecast === "function");
console.log(`\nunit cuaca: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
