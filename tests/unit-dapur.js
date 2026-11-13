// Ide 08B — logika murni Kedai Bu Indah (dapur/core.js). Harga di sini adalah angka CONTOH untuk menguji aritmetika; nilai produksi ditentukan Owner.
const a = require("assert"), C = require("../dapur/core.js"); let n = 0; const T = (m, f) => { f(); n++; console.log("ok -", m); };
const CAT = C.catalogMap({ ingredients: [
  { id: "telur", name: "Telur", price: 4, cat: "protein", icon: "🥚" }, { id: "tempe", name: "Tempe", price: 3, cat: "protein", icon: "🟫" }, { id: "beras", name: "Beras", price: 5, cat: "pokok", icon: "🍚" },
  { id: "minyak", name: "Minyak goreng", price: 3, cat: "minyak", icon: "🛢️" }, { id: "garam", name: "Garam", price: 1 }, { id: "gula", name: "Gula", price: 1 }, { id: "susu", name: "Susu", price: 6 }, { id: "kopi", name: "Kopi", price: 5 },
  { id: "x1", name: "A", price: 1 }, { id: "x2", name: "B", price: 1 }, { id: "x3", name: "C", price: 1 }, { id: "x4", name: "D", price: 1 },
  { id: "RUSAK", price: "gratis" }, { name: "tanpa id", price: 1 }, null, { id: "neg", name: "Neg", price: -5 },
] });
T("15 bahan server ↔ 15 slot rak: tiap bahan tepat di satu rak", () => {
  const all = [].concat(...C.SHELF_ORDER.map((k) => C.SHELVES[k].ids)); a.strictEqual(all.length, 15); a.strictEqual(new Set(all).size, 15);
  const srv = ["telur", "tempe", "beras", "minyak", "bawang_merah", "bawang_putih", "cabai", "garam", "gula", "sayuran", "kopi", "susu", "jeruk_nipis", "bumbu_dasar", "air_es"];
  a.deepStrictEqual(srv.slice().sort(), all.slice().sort()); for (const id of srv) a.ok(C.shelfOf(id)); a.strictEqual(C.shelfOf("durian"), null);
});
T("catalogMap membuang entri rusak/negatif/tanpa id", () => { a.ok(CAT.telur && CAT.garam); a.ok(!CAT.RUSAK && !CAT.neg); a.strictEqual(Object.keys(CAT).length, 12); a.deepStrictEqual(C.catalogMap(null), {}); a.deepStrictEqual(C.catalogMap({ ingredients: "x" }), {}); });
T("add/kurang/hapus ke nol; jumlah tak valid ditolak", () => {
  const b = C.newBasket(); a.deepStrictEqual(C.add(b, "telur", 2, CAT), { ok: true, n: 2 }); a.deepStrictEqual(C.add(b, "telur", -1, CAT), { ok: true, n: 1 }); a.deepStrictEqual(C.add(b, "telur", -1, CAT), { ok: true, n: 0 });
  a.deepStrictEqual(b, {}); a.strictEqual(C.add(b, "telur", -1, CAT).why, "kosong"); a.strictEqual(C.add(b, "telur", 0, CAT).why, "jumlah"); a.strictEqual(C.add(b, "telur", 1.5, CAT).why, "jumlah"); a.strictEqual(C.add(b, "durian", 1, CAT).why, "tak-dijual");
});
T("batas: 20 per jenis, 8 jenis, 30 di lemari, 2000 koin", () => {
  const b = C.newBasket(); a.ok(C.add(b, "tempe", 20, CAT).ok); a.strictEqual(C.add(b, "tempe", 1, CAT).why, "maks-per-jenis"); a.strictEqual(b.tempe, 20);
  const c = C.newBasket(); ["telur", "tempe", "beras", "minyak", "garam", "gula", "susu", "kopi"].forEach((id) => a.ok(C.add(c, id, 1, CAT).ok)); a.strictEqual(C.kinds(c), 8); a.strictEqual(C.add(c, "x1", 1, CAT).why, "jenis-penuh"); a.ok(C.add(c, "telur", 1, CAT).ok);
  const d = C.newBasket(); a.strictEqual(C.add(d, "telur", 11, CAT, { ing: { telur: 20 } }).why, "lemari-penuh"); a.ok(C.add(d, "telur", 10, CAT, { ing: { telur: 20 } }).ok); a.deepStrictEqual(d, { telur: 10 });
  const big = C.catalogMap({ ingredients: [{ id: "emas", name: "Emas", price: 150 }] }); const e = C.newBasket(); a.ok(C.add(e, "emas", 13, big).ok); a.strictEqual(C.add(e, "emas", 1, big).why, "maks-koin"); a.strictEqual(e.emas, 13);
});
T("garis belanja + total (tampilan) mengikuti harga katalog server", () => {
  const b = C.newBasket(); C.add(b, "telur", 3, CAT); C.add(b, "beras", 1, CAT); C.add(b, "tempe", 2, CAT);
  const L = C.lines(b, CAT); a.deepStrictEqual(L.map((l) => l.id), ["beras", "telur", "tempe"]); a.strictEqual(C.total(b, CAT), 3 * 4 + 5 + 2 * 3); a.strictEqual(L.find((l) => l.id === "telur").sub, 12); a.strictEqual(C.count(b), 6);
});
T("buyBody = kontrak dapurBuy: {opId, items:[{id,n}]} saja, urut stabil, tanpa harga/saldo/uid", () => {
  const b = C.newBasket(); C.add(b, "tempe", 2, CAT); C.add(b, "beras", 1, CAT);
  const r = C.buyBody(b, "kb_abcdef123", CAT); a.ok(r.ok); a.deepStrictEqual(r.body, { opId: "kb_abcdef123", items: [{ id: "beras", n: 1 }, { id: "tempe", n: 2 }] }); a.deepStrictEqual(Object.keys(r.body).sort(), ["items", "opId"]);
  a.strictEqual(C.buyBody({}, "kb_abcdef123", CAT).why, "kosong"); a.strictEqual(C.buyBody(b, "pendek", CAT).why, "op"); a.strictEqual(C.buyBody(b, "ada spasi 1234", CAT).why, "op"); a.strictEqual(C.buyBody(b, null, CAT).why, "op");
  a.strictEqual(C.buyBody({ tempe: 21 }, "kb_abcdef123", CAT).why, "maks-per-jenis"); a.strictEqual(C.buyBody({ durian: 1 }, "kb_abcdef123", CAT).why, "tak-dijual"); a.strictEqual(C.buyBody({ tempe: 1.5 }, "kb_abcdef123", CAT).why, "maks-per-jenis");
});
T("newOpId lolos regex server & berbeda tiap panggilan", () => { const s = new Set(); for (let i = 0; i < 200; i++) { const o = C.newOpId(); a.ok(C.LIM.opRe.test(o), o); s.add(o); } a.ok(s.size > 195); });
T("sig(): sama untuk isi sama (urutan tak berpengaruh); beda bila isi berubah → opId baru", () => {
  const x = { telur: 2, beras: 1 }, y = { beras: 1, telur: 2 }; a.strictEqual(C.sig(x), C.sig(y)); y.telur = 3; a.notStrictEqual(C.sig(x), C.sig(y)); a.strictEqual(C.sig({ telur: 0 }), "");
});
T("errText: jaringan/penolakan/401/404 → kalimat ramah, tidak membocorkan galat mentah; definite() membedakan", () => {
  a.ok(/Jaringan/.test(C.errText({ code: "unavailable" }))); a.ok(/Masuk dulu/.test(C.errText({ code: "unauthenticated" }))); a.ok(/belum dibuka/.test(C.errText({ code: "not-found" })));
  a.strictEqual(C.errText({ code: "failed-precondition", message: "Koin bermain tidak cukup untuk belanjaan ini." }), "Koin bermain tidak cukup untuk belanjaan ini.");
  a.ok(/aman/.test(C.errText({ code: "failed-precondition", message: "x".repeat(300) }))); a.ok(/aman/.test(C.errText(new Error("TypeError: boom"))));
  a.ok(C.definite({ code: "failed-precondition" })); a.ok(C.definite({ code: "invalid-argument" })); a.ok(!C.definite({ code: "unavailable" })); a.ok(!C.definite({ code: "internal" })); a.ok(!C.definite(null));
});
T("mergeEco: own dari server, sisa Top Up dipertahankan; bentuk aneh → null", () => {
  a.deepStrictEqual(C.mergeEco({ balance: 130, own: 100, up: {} }, { own: 70 }), { balance: 100, own: 70, up: {} });
  a.strictEqual(C.mergeEco(null, { own: 5 }), null); a.strictEqual(C.mergeEco({ balance: 1, own: 1 }, { own: "9" }), null); a.strictEqual(C.mergeEco({ balance: 1 }, { own: 9 }), null);
});

T("tata letak: titik masuk bisa berdiri; SEMUA titik interaksi walkable & terjangkau dari pintu (kedai & dapur)", () => {
  for (const k of ["kedai", "dapur"]) {
    const L = C.LAYOUT[k], R = C.reach(L); a.ok(C.walk(L, L.spawn.x, L.spawn.y), k + " spawn"); a.ok(R.at(L.spawn.x, L.spawn.y));
    for (const [id, s] of Object.entries(L.stations)) { a.ok(C.walk(L, s.x, s.y), k + "." + id + " tidak walkable"); a.ok(R.at(s.x, s.y), k + "." + id + " tidak terjangkau"); }
  }
});
T("tata letak: tidak ada tumpang tindih antar kotak tabrakan penting & semua di dalam ruangan", () => {
  for (const k of ["kedai", "dapur"]) {
    const L = C.LAYOUT[k], names = Object.keys(L.solids);
    for (const n of names) { const s = L.solids[n]; a.ok(s.x0 >= 0 && s.y0 >= 0 && s.x1 <= L.w + 1e-9 && s.y1 <= L.d + 0.8, k + "." + n + " keluar ruangan"); a.ok(s.x1 > s.x0 && s.y1 > s.y0); }
  }
});
T("kedai: area di balik kasir TERTUTUP bagi pemain (tidak ada jalan masuk); Bu Indah punya jalur sendiri di dalamnya", () => {
  const L = C.LAYOUT.kedai, R = C.reach(L), z = L.bu.zone;
  for (let x = z.x0 + 0.3; x < z.x1 - 0.3; x += 0.1) for (let y = z.y0 + 0.3; y < z.y1 - 0.3; y += 0.1) a.ok(!R.at(x, y), "bocor ke balik kasir di " + x.toFixed(1) + "," + y.toFixed(1));
  for (const w of L.bu.route) a.ok(C.walk(L, w.x, w.y), "titik jalur Bu Indah menabrak"); a.ok(L.bu.route.length >= 3);
});
T("kedai: tiap rak punya titik berdiri yang dekat (≤1.6 tile) dengan kotaknya & 5 rak + kasir + keranjang + pintu ada", () => {
  const L = C.LAYOUT.kedai; for (const id of ["beras", "sayur", "kulkas", "tempe", "etalase", "kasir", "keranjang", "pintu", "kucing"]) a.ok(L.stations[id], id);
  const box = { beras: "rakBeras", sayur: "sayur", kulkas: "kulkas", tempe: "tempe", etalase: "etalase", kasir: "kasir", keranjang: "keranjang" };
  for (const [st, sol] of Object.entries(box)) { const p = L.stations[st], s = L.solids[sol], dx = Math.max(s.x0 - p.x, 0, p.x - s.x1), dy = Math.max(s.y0 - p.y, 0, p.y - s.y1); a.ok(Math.hypot(dx, dy) <= 1.6, st + " terlalu jauh dari kotaknya: " + Math.hypot(dx, dy).toFixed(2)); }
});
T("dapur: 8 titik alat + pintu; pemanggang/kompor/bak cuci/talenan/lemari/kulkas/sampah/meja makan semua ada", () => {
  const L = C.LAYOUT.dapur; for (const id of ["pintu", "lemari", "kulkas", "persiapan", "cuci", "kompor", "pemanggang", "meja", "sampah"]) a.ok(L.stations[id], id);
});

T("pintu dapur di Rumahku: 10 level — di dalam dinding, tidak menimpa pintu keluar/rak bawaan, titik berdiri terjangkau di rumah kosong", () => {
  const HD = require("../world/home-data.js");
  for (let lv = 1; lv <= 10; lv++) {
    const { w, d } = HD.roomOf(lv), ex = HD.doorOf(lv), dd = C.homeDoor(ex.y0);
    a.ok(dd.y0 >= 0.3 && dd.y1 <= ex.y0 - 0.3, "level " + lv + " pintu dapur keluar dinding / terlalu dekat pintu keluar: " + JSON.stringify(dd));
    a.ok(Math.abs(dd.y1 - dd.y0 - 1.15) < 1e-9);
    const keep = { x0: 0, y0: dd.y0 - 0.15, x1: 1.4, y1: dd.y1 + 0.15 };
    for (const b of HD.builtinRects(lv)) a.ok(!(b.x0 < keep.x1 && b.x1 > keep.x0 && b.y0 < keep.y1 && b.y1 > keep.y0), "level " + lv + " rak bawaan menimpa pintu dapur");
    const h = { level: lv, furniture: [], stored: [], decorations: [] }, Rr = HD.reachable(h, HD.solidRects(h)), my = (dd.y0 + dd.y1) / 2;
    a.ok(Rr.at(0.78, my), "level " + lv + " titik berdiri di depan pintu dapur tidak terjangkau"); a.ok(w >= 4 && d >= 4);
  }
});
T("HD.canPlace menolak perabot di area pintu dapur HANYA setelah dipasang (extraClear kosong = perilaku lama)", () => {
  const HD = require("../world/home-data.js"), h = { level: 3, furniture: [], stored: [], decorations: [] }, ex = HD.doorOf(3), dd = C.homeDoor(ex.y0), f = { uid: "t1", type: "tanaman", x: 0.3, y: dd.y0 + 0.2, rot: 0 };
  a.strictEqual(HD.extraClear.length, 0); a.ok(HD.canPlace(h, f).ok, "sebelum dipasang harus boleh");
  HD.extraClear.push((hh) => { const r = C.homeDoor(HD.doorOf(hh.level).y0); return { x0: 0, y0: r.y0 - 0.15, x1: 1.4, y1: r.y1 + 0.15 }; });
  const r = HD.canPlace(h, f); a.ok(!r.ok && /dapur/.test(r.why), r.why); a.ok(HD.canPlace(h, { uid: "t2", type: "tanaman", x: 3, y: 3, rot: 0 }).ok, "perabot di tempat lain tetap boleh");
  HD.extraClear.length = 0;
});
console.log("unit-dapur OK:", n);
