// Ide 08E — inti geometri halaman: bawaan sah di Lv1–10, tolak keluar batas/tabrakan/menutup jalur, resolve aman, fuzz tanpa susunan tak sah.
"use strict";
const assert = require("assert"), fs = require("fs"), crypto = require("crypto"), G = require("../dapur/halaman-geo.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok " + name); };
const sha = crypto.createHash("sha256").update(fs.readFileSync(__dirname + "/../dapur/halaman-geo.js")).digest("hex");
t("SHA-256 berkas inti (harus sama dengan salinan backend server/vendor/dapur-halaman-geo.cjs): " + sha.slice(0, 16), () => { assert.ok(/^[0-9a-f]{64}$/.test(sha)); });
t("bawaan sah di Lv1–10 (zona kiri & kanan, tanpa menutup pintu/jalur)", () => { for (let lv = 1; lv <= 10; lv++) { const v = G.validate(lv, G.defaults(lv)); assert.ok(v.ok, lv + JSON.stringify(v.errors)); } });
t("13 benda bisa dipindah, nampan tetap", () => { assert.equal(G.IDS.length, 13); assert.ok(!G.IDS.includes("nampan")); });
const mv = (lv, id, x, y, base) => Object.assign({}, base || G.defaults(lv), { [id]: [x, y] });
t("keluar batas ditolak", () => { for (const [x, y] of [[-1, 3], [0.7, 3], [15.9, 3], [5, 0.4], [5, 14], [99, 99]]) assert.ok(!G.validate(1, mv(1, "meja", x, y)).ok, x + "," + y); });
t("menabrak rumah / area belakang rumah / pintu / gerbang / papan / surat / kolam ditolak", () => {
  const g = G.GEO.lv[1]; const bad = [[8, 2.8, "rumah"], [8, 1.7, "rumah"], [g.door[0], g.door[1], "pintu"], [g.gate[0], g.gate[1] - 0.5, "gerbang"], [g.sign[0], g.sign[1], "papan"], [g.mail[0], g.mail[1], "surat"], [12, 12.6, "kolam"]];
  for (const [x, y, w] of bad) { const v = G.validate(1, mv(1, "meja", x, y)); assert.ok(!v.ok, w); }
});
t("menumpuk benda lain ditolak (meja di atas bangku; kursi di atas kursi)", () => {
  const d = G.defaults(1); assert.ok(!G.validate(1, mv(1, "meja", d.bangku[0], d.bangku[1])).ok); assert.ok(!G.validate(1, mv(1, "kursi1", d.kursi0[0] + 0.1, d.kursi0[1])).ok);
});
t("benda tak terjangkau (titik pakai di luar batas jalan) ditolak", () => { const v = G.validate(1, mv(1, "meja", 7.0, 13.0)); assert.ok(!v.ok && v.errors.some((e) => /dijangkau|batas|menutup/.test(e.msg)), JSON.stringify(v.errors)); });
t("memindahkan jauh tetapi sah diterima (meja ke kanan bawah halaman Lv1)", () => { const v = G.validate(1, mv(1, "meja", 11.5, 6.0)); assert.ok(v.ok, JSON.stringify(v.errors)); });
t("susunan penuh sah: semua set dipindah ke sisi kanan halaman Lv1", () => {
  const o = G.defaults(9); const v = G.validate(1, o); assert.ok(v.ok, JSON.stringify(v.errors));
});
t("resolve: timpaan sah dipakai; tak sah dibuang tanpa merusak yang lain; id/angka sampah diabaikan", () => {
  const r = G.resolve(1, { meja: [11.5, 6.0], kursi0: [8, 2.8], hantu: [1, 1], kopi: ["x", 2], lampu: [NaN, 1] });
  assert.deepEqual(r.items.meja, [11.5, 6]); assert.deepEqual(r.items.kursi0, G.defaults(1).kursi0); assert.ok(G.validate(1, r.items).ok); assert.ok(r.rejected.includes("kursi0"));
});
t("resolve pada level lain: susunan Lv1 yang menabrak bangunan Lv5 jatuh ke bawaan", () => {
  const saved = { meja: [8, 7.2] }; const r1 = G.resolve(1, saved); assert.deepEqual(r1.items.meja, [8, 7.2]);
  for (let lv = 2; lv <= 10; lv++) { const r = G.resolve(lv, saved); assert.ok(G.validate(lv, r.items).ok, "lv" + lv); }
});
t("pembulatan ke kisi 0,05 dan diffFromDefault", () => { const r = G.resolve(1, { meja: [11.523, 6.011] }); assert.deepEqual(r.items.meja, [11.5, 6]); assert.deepEqual(Object.keys(G.diffFromDefault(1, r.items)), ["meja"]); assert.deepEqual(G.diffFromDefault(1, G.defaults(1)), {}); });
t("fuzz 6000 langkah acak: yang diterima selalu memenuhi invarian bebas (batas, tanpa tabrakan bangunan, pintu terjangkau)", () => {
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  let acc = 0, rej = 0;
  for (let k = 0; k < 6000; k++) {
    const lv = 1 + Math.floor(rnd() * 10); let cur = G.defaults(lv); const id = G.IDS[Math.floor(rnd() * G.IDS.length)];
    const p = [G.q05(0.5 + rnd() * 15), G.q05(0.5 + rnd() * 13.2)], nx = Object.assign({}, cur, { [id]: p }), v = G.validate(lv, nx);
    if (!v.ok) { rej++; continue; } acc++;
    const it = G.BY[id], r = G.rectOf(it, p), wb = G.walkBounds();
    assert.ok(r.x0 >= wb.x0 && r.y0 >= wb.y0 && r.x1 <= wb.x1 && r.y1 <= wb.y1);
    for (const s of G.baseSolids(lv)) assert.ok(!(r.x0 < s.x1 && r.x1 > s.x0 && r.y0 < s.y1 && r.y1 > s.y0), "tabrak bangunan " + id + lv);
    for (const kz of G.keepOuts(lv)) assert.ok(!(r.x0 < kz.x1 && r.x1 > kz.x0 && r.y0 < kz.y1 && r.y1 > kz.y0), "menutup " + kz.id);
  }
  assert.ok(acc > 100 && rej > 100, acc + "/" + rej);
});
console.log("TOTAL " + n + " uji, 0 gagal");
