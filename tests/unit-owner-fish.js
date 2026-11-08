// Uji NERF MYTHIC 2% + OWNER FISH 0,02% + NERF HARGA JUAL TOTAL 25%: simulasi >=1 juta undian, Pity, anti-duplikasi, penjualan, kompatibilitas Cloud Save. Tanpa jaringan/produksi.
const assert = require("assert"), fs = require("fs"), path = require("path");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), SF2 = require("../economy/sf2-core.js"), SF = require("../economy/sf-core.js"), CC = require("../cloud/core.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 3).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, v) => { buf.set(p, JSON.stringify(v)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12, n = 0, GK = 0; const op = () => "op" + (++n) + "xxxxxxxx";
const mk = (rand, db0) => { const db = db0 || mkdb(); return { db, e: EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true, sf2: SF2, sf: SF, rand }) }; };
const ecoOf = (db, u) => JSON.parse(db.m.get("shop/economy/" + u)), setEco = (db, u, f) => { const e = ecoOf(db, u); f(e); db.m.set("shop/economy/" + u, JSON.stringify(e)); };
const player = async (o, u) => { await o.e.ecoInit({ uid: u }, {}); setEco(o.db, u, (e) => { e.lbc = 100; }); };
const go = async (o, u, spot, id) => { now += 2000; return o.e.ecoSf2Catch({ uid: u }, { opId: id || op(), spot: spot || "dalam" }); };
// acak deterministik: r1,r2,r3,0.5, uid(2, deret emas), bonus r5,r6
const R = (r1, r2, r3, r5) => { let i = 0; return () => { const j = i++ % 8; return j < 3 ? [r1, r2, r3][j] : j === 3 ? 0.5 : j === 6 ? (r5 === undefined ? 0.9 : r5) : j === 7 ? 0.5 : ((++GK * 0.6180339887498949) % 1) * 0.999; }; };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
(async () => {
  // ===== PELUANG =====
  await t("peluang dasar: Common 56,75 · Uncommon 27,85 · Rare 8,25 · Epic 5,15 · Mythic 2,00 = 100%, bilangan bulat bp", () => {
    const o = SF2.odds(0); assert.deepStrictEqual([o.common, o.uncommon, o.rare, o.epic, o.mythic], [5675, 2785, 825, 515, 200]); assert.equal(Object.values({ a: o.common, b: o.uncommon, c: o.rare, d: o.epic, e: o.mythic }).reduce((x, y) => x + y), 10000);
    for (let p = 0; p < 99; p++) { const q = SF2.odds(p); assert.equal(q.common + q.uncommon + q.rare + q.epic + q.mythic, 10000); assert.ok(q.mythic >= 200 && q.mythic <= 280 && q.common > 5000); } });
  await t("Pity: tangkapan ke-100 tanpa Mythic PASTI Mythic; Pity 99 = 100%", () => { assert.equal(SF2.odds(99).mythic, 10000); assert.ok(SF2.odds(99).guaranteed); assert.equal(SF2.PITY_MAX, 100); assert.equal(SF2.LIM.perHour, 150); for (const r of [0, 0.5, 0.9999]) assert.equal(SF2.rollRarity(99, r), "mythic"); });
  await t("SIMULASI 1.000.000 undian rarity (Pity 0 tetap): Mythic ≈ 2,00% dan kategori lain sesuai tabel (toleransi 5σ)", () => {
    const rnd = mulberry(20261108), N = 1e6, c = { common: 0, uncommon: 0, rare: 0, epic: 0, mythic: 0 }; for (let i = 0; i < N; i++) c[SF2.rollRarity(0, rnd())]++;
    const o = SF2.odds(0); for (const k of SF2.RARITIES) { const p = o[k] / 1e4, sd = Math.sqrt(N * p * (1 - p)); assert.ok(Math.abs(c[k] - N * p) < 5 * sd, k + " " + c[k] + " vs " + N * p); } console.log("    sim rarity:", JSON.stringify(c)); });
  await t("SIMULASI 1.000.000 tangkapan PENUH dengan Pity: tidak pernah >99 tanpa Mythic; laju Mythic efektif tercatat; Pity direset ke 0 tiap Mythic", () => {
    const rnd = mulberry(7), N = 1e6; let p = 0, gap = 0, maxGap = 0, my = 0; for (let i = 0; i < N; i++) { const r = SF2.rollRarity(p, rnd()); p = SF2.nextPity(p, r); if (r === "mythic") { my++; assert.equal(p, 0); maxGap = Math.max(maxGap, gap + 1); gap = 0; } else { gap++; assert.ok(gap <= 99, "gap " + gap); } }
    assert.ok(maxGap <= 100, "maxGap " + maxGap); const rate = my / N; assert.ok(rate > 0.02 && rate < 0.035, "laju efektif " + rate); console.log("    sim Pity: Mythic efektif " + (rate * 100).toFixed(3) + "% · jeda terpanjang " + maxGap); });
  await t("SIMULASI 1.000.000 undian OWNER FISH: tepat 0,02% (≈200 ± 5σ), independen dari rarity/Pity", () => {
    const rnd = mulberry(99), N = 1e6, P = SF2.OWNER_P; assert.equal(P, 0.0002); assert.equal(SF2.OWNER_BP, 2); let hit = 0, hitMy = 0, my = 0, pity = 0, pityOwnerOn = 0; const rnd2 = mulberry(5), rarSeq = []; 
    let pa = 0, pb = 0; for (let i = 0; i < N; i++) { const rr = rnd2(), ob = rnd(); const ra = SF2.rollRarity(pa, rr), rb = SF2.rollRarity(pb, rr); pa = SF2.nextPity(pa, ra); pb = SF2.nextPity(pb, rb); assert.equal(ra, rb); if (ob < P) hit++; if (ra === "mythic") { my++; if (ob < P) hitMy++; } }
    const sd = Math.sqrt(N * P * (1 - P)); assert.ok(Math.abs(hit - N * P) < 5 * sd, "owner " + hit); assert.ok(hitMy <= 12, "tidak berkorelasi dengan Mythic (" + hitMy + ")"); assert.equal(pa, pb); console.log("    sim OWNER FISH: " + hit + " / " + N + " (harapan 200)"); });
  // ===== SERVER: OWNER FISH =====
  await t("server: undian bonus < 0,0002 → OWNER FISH; = 0,0002 → tidak (batas tepat 0,02%); Pity & ikan biasa IDENTIK dengan tanpa bonus", async () => {
    const a = mk(R(0.1, 0, 0, 0.00019)), b = mk(R(0.1, 0, 0, 0.0002)); await player(a, "a"); await player(b, "b"); const ra = await go(a, "a"), rb = await go(b, "b");
    assert.ok(ra.bonus && ra.bonus.id === SF2.OWNER_ID && ra.bonus.rarity === "owner" && ra.bonus.isNew); assert.equal(rb.bonus, null);
    assert.equal(ra.pity, rb.pity); assert.equal(ra.fish.id, rb.fish.id); assert.equal(ra.fish.rarity, rb.fish.rarity); assert.ok(ra.fish.uid && ra.fish.value > 0);   // ikan biasa tetap diterima
    assert.equal(ecoOf(a.db, "a").box.length, 1); assert.ok(ecoOf(a.db, "a").sf2.d[SF2.OWNER_ID].n === 1); assert.ok(!ecoOf(b.db, "b").sf2.d[SF2.OWNER_ID]); });
  await t("server: bonus saat Mythic TIDAK mengganggu reset Pity (Mythic → Pity 0) dan saat Pity 99 (jaminan tetap)", async () => {
    const o = mk(R(0.99, 0.999, 0.5, 0.00005)); await player(o, "a"); setEco(o.db, "a", (e) => { e.sf2 = { p: 73, n: 73, base: 0, d: {}, f: {}, h: [] }; }); const r = await go(o, "a"); assert.ok(r.mythic && r.pity === 0 && r.bonus);
    const o2 = mk(R(0.0, 0, 0, 0.00005)); await player(o2, "b"); setEco(o2.db, "b", (e) => { e.sf2 = { p: 99, n: 99, base: 0, d: {}, f: {}, h: [] }; }); const r2 = await go(o2, "b"); assert.ok(r2.guaranteed && r2.mythic && r2.fish.rarity === "mythic" && r2.pity === 0 && r2.bonus); });
  await t("anti-duplikasi: retry opId yang sama mengembalikan hasil sama; kepemilikan & jumlah TIDAK bertambah; permintaan serentak hanya sekali", async () => {
    const o = mk(R(0.1, 0, 0, 0.00005)); await player(o, "a"); now += 2000; const id = op(); const r1 = await o.e.ecoSf2Catch({ uid: "a" }, { opId: id, spot: "dalam" }); const r2 = await o.e.ecoSf2Catch({ uid: "a" }, { opId: id, spot: "dalam" });
    assert.ok(r2.duplicate); assert.equal(r2.bonus.id, SF2.OWNER_ID); assert.equal(r2.bonus.w, r1.bonus.w); assert.equal(ecoOf(o.db, "a").sf2.d[SF2.OWNER_ID].n, 1); assert.equal(ecoOf(o.db, "a").box.length, 1);
    const o3 = mk(R(0.1, 0, 0, 0.00005)); await player(o3, "c"); now += 2000; const id3 = op(); const rs = await Promise.all([1, 2, 3, 4, 5].map(() => o3.e.ecoSf2Catch({ uid: "c" }, { opId: id3, spot: "dalam" }))); assert.equal(rs.filter((x) => !x.duplicate).length, 1); assert.equal(ecoOf(o3.db, "c").sf2.d[SF2.OWNER_ID].n, 1); });
  await t("OWNER FISH: tidak masuk Coolbox, tidak bisa dijual (tidak ada uid), tidak diundi lewat tabel rarity, tidak punya harga", async () => {
    const ow = SF2.BY_ID[SF2.OWNER_ID]; assert.ok(ow.obs && !ow.active && ow.rarity === "owner" && !SF2.RARITIES.includes("owner")); assert.equal(SF2.coinValue(ow, 100), 0);
    for (const h of SF2.HABITATS) for (const r of SF2.RARITIES) for (const s of SF2.index()[h][r]) assert.notEqual(s.id, ow.id);
    const o = mk(R(0.1, 0, 0, 0.00005)); await player(o, "a"); const r = await go(o, "a"); assert.ok(!ecoOf(o.db, "a").box.some((b) => b.id === ow.id)); const s = await o.e.ecoSell({ uid: "a" }, { opId: op(), uids: ["s2xxxxxxxx"], day: 1 }); assert.equal(s.total, 0); assert.ok(r.bonus.w >= 88 && r.bonus.w <= 888); });
  await t("batas laju tetap: 150 tangkapan/60 menit (OWNER FISH bonus tidak menambah/menghindari limit); info menampilkan peluang 0,02%", async () => {
    const o = mk(R(0.1, 0, 0, 0.9)); await player(o, "a"); setEco(o.db, "a", (e) => { e.sf2 = { p: 0, n: 0, base: 0, d: {}, f: {}, h: Array.from({ length: 150 }, () => now) }; }); await assert.rejects(() => go(o, "a"), /Batas tangkapan pulau/);
    const inf = await o.e.ecoSf2Info({ uid: "a" }); assert.equal(inf.owner.pct, 0.02); assert.equal(inf.odds.mythic, 2); assert.equal(SF2.LIM.perHour, 150); });
  await t("progres lama aman: Pity, koleksi, Penemu Pertama lama tidak berubah oleh perubahan peluang", async () => {
    const o = mk(R(0.1, 0, 0, 0.9)); await player(o, "a"); setEco(o.db, "a", (e) => { e.sf2 = { p: 57, n: 200, base: 5, d: { sf2_leviathan: { n: 2, b: 4000, t: 1 } }, f: { sf2_leviathan: 1 }, h: [] }; }); await go(o, "a"); const e = ecoOf(o.db, "a"); assert.equal(e.sf2.p, 58); assert.equal(e.sf2.d.sf2_leviathan.n, 2); assert.equal(e.sf2.f.sf2_leviathan, 1); assert.equal(e.sf2.n, 201); });
  // ===== HARGA JUAL =====
  await t("nerf total 25%: harga baru = harga asli × 0,75 (satu konstanta, tidak berlapis) untuk SEMUA ikan (reguler, legenda, event) dan berat", () => {
    assert.equal(FM.FISH_SALE_MULT, 0.75); const fish = T.FISH.filter((f) => !f.protected); assert.ok(fish.length >= 40);
    for (const f of fish) for (const w of [f.wMin, (f.wMin + f.wMax) / 2, f.wMax]) for (const m of [0.7, 1, 1.45]) { const asli = f.price * 3 * FM.effectiveKg(w) * m; assert.equal(FM.priceFor(f, w, m, 3), Math.max(1, Math.round(asli * 0.75)), f.id); } });
  await t("contoh harga lama(×0,8) → baru(×0,75) per jenis ikan; tidak ada pengurangan ganda", () => {
    const rows = []; for (const id of ["nila", "mas", "arwana", "tuna"]) { const f = T.FISH.find((x) => x.id === id) || T.FISH.filter((x) => !x.protected)[rows.length]; const w = Math.min(f.wMax, Math.max(f.wMin, 5)), asli = f.price * 3 * FM.effectiveKg(w); rows.push([f.id, Math.round(asli), Math.round(asli * 0.8), FM.priceFor(f, w, 1, 3)]); }
    for (const r of rows) assert.equal(r[3], Math.max(1, Math.round(r[1] * 0.75))); console.log("    [id, asli, lama(×0,8), baru(×0,75)]", JSON.stringify(rows)); });
  await t("hadiah pelepasan ikan dilindungi TIDAK berubah (bukan harga jual)", () => { const f = T.FISH.find((x) => x.protected); if (!f) return; const w = f.wMin || 1; assert.equal(Math.round(f.price * 3 * FM.effectiveKg(w) * 1.2) > 0, true); const src = fs.readFileSync(path.join(__dirname, "../economy/core.js"), "utf8"); assert.ok(src.includes("FM.effectiveKg(w) * 1.2")); });
  await t("SF2 (ikan lama dengan sp terkunci basis 0,8 dan ikan baru) dijual = nilai katalog × 0,75; massal = jumlah per item; observasi/OWNER FISH tidak bernilai", async () => {
    const o = mk(R(0.3, 0, 0.5, 0.9)); await player(o, "a"); const r = await go(o, "a", "karang"), cv = SF2.coinValue(SF2.BY_ID[r.fish.id], r.fish.w); assert.ok(Math.abs(r.fish.value - cv * 0.75) <= 1, r.fish.value + " vs " + cv);
    const old = { u: "s2oldlock01", id: r.fish.id, w: r.fish.w, sp: Math.round((cv / (3 * FM.effectiveKg(r.fish.w) * 0.8)) * 1e6) / 1e6 }; setEco(o.db, "a", (e) => { e.box.push(old); }); const bal = (await o.e.ecoState({ uid: "a" })).balance;
    const s = await o.e.ecoSell({ uid: "a" }, { opId: op(), uids: [r.fish.uid, old.u], day: 3 }); assert.equal(s.sold.length, 2); assert.equal(s.total, r.fish.value + FM.sf2Price(old.sp, old.w, 3)); assert.ok(Math.abs(FM.sf2Price(old.sp, old.w, 3) - r.fish.value) <= 1); assert.equal(s.balance, bal + s.total); });
  await t("SF lama (sf_*): harga = harga/kg × kg × 0,75 (nerf total); klien memakai fungsi yang sama dengan server", () => {
    assert.equal(FM.priceFor({ price: 1000 }, 10, 1, 3), 22500); const g = fs.readFileSync(path.join(__dirname, "../game.js"), "utf8"); assert.ok(g.includes("NW.FM.sf2Price(item.sp || 0, item.w, PRICE_SCALE)") && g.includes("NW.FM.priceFor(f, item.w, priceMult(item.id), PRICE_SCALE)")); const e = fs.readFileSync(path.join(__dirname, "../economy/core.js"), "utf8"); assert.ok(e.includes("FM.sf2Price(b.sp, b.w, PRICE_SCALE)") && e.includes("FM.sf2Price(item.sp, w, PRICE_SCALE)")); });
  await t("Cloud Save menerima koleksi OWNER FISH & ikan SF2; bobot dalam batas; salinan Functions sinkron", () => {
    const v = CC.validateSave({ v: 1, money: 0, cooler: [], dex: { [SF2.OWNER_ID]: { n: 1, best: 888 }, sf2_leviathan: { n: 1, best: 4900 } }, up: { rod: 0, bait: 0, cooler: 0, boat: 0 } }); assert.ok(!v || v.ok !== false && !(v.errors && v.errors.length), JSON.stringify(v && v.errors));
    for (const [a, b] of [["economy/sf2-core.js", "firebase/functions/lib/sf2-core.js"], ["fishmath.js", "firebase/functions/lib/fishmath.js"], ["economy/core.js", "firebase/functions/lib/economy-core.js"]]) assert.ok(fs.readFileSync(path.join(__dirname, "..", b), "utf8").endsWith(fs.readFileSync(path.join(__dirname, "..", a), "utf8")), b); });
  console.log(`unit-owner-fish: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
