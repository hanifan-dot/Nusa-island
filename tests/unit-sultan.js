// Uji logika Sultan Samudra / Mercusuar Emas (klien) — tanpa browser: node tests/unit-sultan.js
const assert = require("assert"), fs = require("fs"), path = require("path");
const Core = require("../sultan/core.js"), ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fail++; console.log("GAGAL:", name, "\n   ", e.message.split("\n")[0]); } };
const ok = (entries) => ({ status: "ok", entries });
const E = (rank, name, points, title) => ({ rank, name, points, title });
const GOOD = [E(2, "Sari Karang", 40, "Saudagar Laut"), E(1, "Raka Bahari", 60, "Sultan Samudra"), E(3, "Sultan Anonim", 30, "Saudagar Laut")];

// ---- model ----
t("urut peringkat 1-2-3, hanya bidang rank/name/points/title", () => {
  const m = Core.normalize(ok(GOOD)); assert.strictEqual(m.status, "live"); assert.deepStrictEqual(m.entries.map((e) => e.rank), [1, 2, 3]);
  for (const e of m.entries) assert.deepStrictEqual(Object.keys(e).sort(), ["name", "points", "rank", "title"]);
});
t("PRIVASI: bidang liar (uid, email, token, paymentId, nominal, transaksi) TIDAK lolos ke model", () => {
  const CAN = ["UID-CANARY-777", "canary@mail.test", "TOKEN-CANARY-888", "PAYID-CANARY-999", "CANARY-RP-15000", "TX-CANARY-123"];
  const dirty = GOOD.map((e, i) => ({ ...e, uid: CAN[0], email: CAN[1], token: CAN[2], paymentId: CAN[3], amount: CAN[4], spend: 15000, transaction: { id: CAN[5] }, order_id: CAN[5] }));
  const m = Core.normalize({ status: "ok", entries: dirty, uid: CAN[0], email: CAN[1], debug: { token: CAN[2] } }), js = JSON.stringify(m);
  for (const c of CAN) assert.ok(!js.includes(c), "bocor: " + c);
  for (const k of ["uid", "email", "token", "payment", "amount", "spend", "transaction", "order"]) assert.ok(!new RegExp(k, "i").test(js), "kunci bocor: " + k);
});
t("PRIVASI: nama yang tampak seperti email/uid/token/id pembayaran/nominal diganti 'Sultan Anonim'", () => {
  const bad = ["budi@mail.com", "AbCdEfGhIjKlMnOpQrStUvWxYz12", "pay_8f3a9c21", "order-AB12CD34", "uid_xyz123", "081234567890", "Rp 15.000", "tok:abcdef"];
  const m = Core.normalize(ok(bad.slice(0, 3).map((n, i) => E(i + 1, n, 30, "Saudagar Laut")))); assert.ok(m.entries.every((e) => e.name === "Sultan Anonim"), JSON.stringify(m.entries));
  for (const n of bad) assert.strictEqual(Core.normalize(ok([E(1, n, 30, "")])).entries[0].name, "Sultan Anonim", n);
  assert.strictEqual(Core.normalize(ok([E(1, "Raka Bahari 7", 30, "")])).entries[0].name, "Raka Bahari 7");
});
t("PRIVASI: gelar hanya dari 4 gelar resmi (gelar asing diganti gelar poin); email di gelar tidak lolos", () => {
  const m = Core.normalize(ok([E(1, "A", 60, "boss@mail.com"), E(2, "B", 30, "Saudagar Laut"), E(3, "C", 5, "apa saja")]));
  assert.deepStrictEqual(m.entries.map((e) => e.title), ["Sultan Samudra", "Saudagar Laut", ""]);
});
t("gelar & ambang: 10/30/50/100", () => { assert.deepStrictEqual([0, 9, 10, 29, 30, 49, 50, 99, 100].map(Core.titleFor), ["", "", "Pendukung Pulau", "Pendukung Pulau", "Saudagar Laut", "Saudagar Laut", "Sultan Samudra", "Sultan Samudra", "Legenda Samudra"]); });
t("maksimal 3; peringkat ganda/di luar 1-3/poin tidak sah dibuang", () => {
  const m = Core.normalize(ok([E(1, "A", 10, ""), E(1, "dobel", 99, ""), E(2, "B", -1, ""), E(2, "C", 1.5, ""), E(3, "D", 20, ""), E(4, "E", 5, ""), E(0, "F", 5, ""), null, "x"]));
  assert.deepStrictEqual(m.entries.map((e) => [e.rank, e.name]), [[1, "A"], [3, "D"]]);
});
t("nama kosong/spasi → Sultan Anonim; tag & kutip dibuang; panjang dipotong 24", () => {
  const m = Core.normalize(ok([E(1, "   ", 10, ""), E(2, "<img src=x onerror=1>\"Bu'di\"&", 10, ""), E(3, "Nelayan Laut ".repeat(6), 10, "")]));
  assert.strictEqual(m.entries[0].name, "Sultan Anonim"); assert.ok(!/[<>"'&]/.test(m.entries[1].name)); assert.ok(Array.from(m.entries[2].name).length <= 24 && m.entries[2].name.endsWith("…"));
});
t("inactive / tidak tersedia / bentuk salah → objek harus TIDAK tampil", () => {
  assert.deepStrictEqual(Core.normalize({ status: "inactive", entries: [] }), { status: "inactive", entries: [] });
  for (const bad of [null, undefined, 5, "x", {}, { status: "ok" }, { status: "ok", entries: "x" }, { status: "error", entries: [] }, { status: "pending", entries: [] }]) assert.notStrictEqual(Core.normalize(bad).status, "live", JSON.stringify(bad));
  assert.strictEqual(Core.normalize({ status: "ok", entries: [] }).status, "live");        // aktif tapi belum ada pemegang → objek tampil, slot kosong
});
t("normalizeMe: hanya points/title/anon; tidak sah → null", () => {
  assert.deepStrictEqual(Core.normalizeMe({ status: "ok", points: 40, title: "Saudagar Laut", anon: true, uid: "x", email: "e@e.e" }), { points: 40, title: "Saudagar Laut", anon: true });
  for (const bad of [null, {}, { status: "inactive" }, { status: "ok", points: -1 }, { status: "ok", points: "40" }]) assert.strictEqual(Core.normalizeMe(bad), null);
});
t("batas muat ulang 5 menit", () => {
  assert.strictEqual(Core.COOLDOWN_MS, 300000); assert.ok(Core.fresh(1000, 1000 + 299999)); assert.ok(!Core.fresh(1000, 1000 + 300000)); assert.ok(!Core.fresh(0, 5)); assert.strictEqual(Core.waitMs(1000, 1000 + 100000), 200000); assert.strictEqual(Core.waitMs(1000, 1000 + 400000), 0);
});

// ---- sumber klien ----
const src = fs.readFileSync(path.join(ROOT, "sultan/client.js"), "utf8").replace(/\/\/.*$/gm, "");
t("klien: tanpa polling, tanpa penyimpanan lokal, tanpa akses langsung Firebase/Firestore/fetch, tanpa data pemain", () => {
  assert.ok(!/setInterval/.test(src), "tidak boleh setInterval"); assert.ok(!/localStorage|sessionStorage|indexedDB|Nusa\.S\b|\.stats\b/.test(src));
  assert.ok(!/firebase|firestore|fetch\(|XMLHttpRequest|WebSocket/i.test(src));
});
t("klien: hanya memanggil sultanTop / sultanMe / sultanPrefs", () => {
  const names = [...src.matchAll(/\.call\("([A-Za-z]+)"/g)].map((m) => m[1]); assert.deepStrictEqual([...new Set(names)].sort(), ["sultanMe", "sultanPrefs", "sultanTop"]);
  assert.ok(/sultanPrefs", \{ anon: !st\.me\.anon \}/.test(src), "sultanPrefs hanya mengirim {anon:boolean}");
});
t("klien: tidak menyentuh Premium Shop, harga, pembayaran, QRIS, Cloud Save, SF2, multiplayer, Podium Juara", () => {
  assert.ok(!/NW\.(shop|mp|sf2|podium|wallet|pay)\b|NusaShop|qris|payment|\bharga\b|\bprice\b|cloudSave|loadSave|writeSave/i.test(src));
});
t("klien: semua teks dari server melewati esc() sebelum innerHTML", () => {
  const html = [...src.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1]).filter((x) => /\be\.(name|title)|st\.me\.title/.test(x)); assert.ok(html.length >= 3);
  for (const x of html) assert.ok(/esc\(/.test(x), "tanpa esc: " + x);
});
t("dunia: tiga sosok mengikuti rank server, slot kosong pudar tanpa membuat pemenang palsu", () => {
  assert.ok(src.includes("for (const d of DRUMS) drawFisher(c, d, K, occupied.has(d.rank), t)"));
  assert.ok(src.includes("st.data.entries.map((e) => e.rank)"));
  assert.ok(src.includes("occupied ? 1 : 0.42"));
});
// ---- rilis & integrasi ----
t("manifest rilis, build-hosting, index.html, game.js, muara.js memuat Sultan Samudra", () => {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, "firebase/release-manifest.json"), "utf8")), f = man.features.find((x) => x.id === "sultan-samudra");
  assert.ok(f && f.build_dirs.includes("sultan") && f.files.includes("sultan/client.js"));
  assert.ok(/ podium sultan /.test(fs.readFileSync(path.join(ROOT, "firebase/scripts/build-hosting.sh"), "utf8")));
  const idx = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"); assert.ok(idx.indexOf("sultan/core.js") > 0 && idx.indexOf("sultan/core.js") < idx.indexOf("sultan/client.js") && idx.indexOf("sultan/client.js") < idx.indexOf('src="game.js"'));
  assert.ok(/NW\.sultan\.hook\(\)/.test(fs.readFileSync(path.join(ROOT, "game.js"), "utf8"))); assert.ok(/t\.id === "sultan"/.test(fs.readFileSync(path.join(ROOT, "world/areas/muara.js"), "utf8")));
});
// ---- kontrak dengan backend (PR #54): respons ASLI worker/sultan.js direkam ke fixture (saklar OFF, ON, tanpa D1, D1 galat) ----
t("kontrak backend: fixture respons asli worker dipahami klien (ok / inactive / unavailable, me, prefs)", () => {
  const F = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/sultan-backend-contract.json"), "utf8"));
  assert.deepStrictEqual(Core.normalize(F.off[0]), { status: "inactive", entries: [] }); assert.strictEqual(Core.normalizeMe(F.off[1]), null); assert.strictEqual(F.off[2].status, "inactive");
  const m = Core.normalize(F.top); assert.strictEqual(m.status, "live"); assert.deepStrictEqual(m.entries.map((e) => [e.rank, e.points, e.title]), [[1, 60, "Sultan Samudra"], [2, 40, "Saudagar Laut"], [3, 30, "Saudagar Laut"]]);
  assert.deepStrictEqual(Object.keys(F.top.entries[0]).sort(), ["name", "points", "rank", "title"], "server hanya mengirim 4 bidang publik");
  assert.deepStrictEqual(Core.normalizeMe(F.me), { points: 60, title: "Sultan Samudra", anon: false }); assert.ok(F.prefs.status === "ok" && typeof F.prefs.anon === "boolean");
  for (const r of [F.nodb[0], F.nomig]) assert.strictEqual(Core.normalize(r).status, "unavailable");
  assert.strictEqual(Core.normalizeMe(F.nodb[1]), null); assert.notStrictEqual(F.nodb[2].status, "ok");
});
console.log(`unit-sultan: ${pass} lolos, ${fail} gagal`); process.exit(fail ? 1 : 0);
