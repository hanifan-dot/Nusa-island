// Uji UPDATE KOMUNITAS & JORAN LEVEL 20: 15 spesies + kredit, El Gran Maja & Udang Jala, joran Lv 11-20 (harga, urutan, saldo, ganda, level 1-10 utuh),
// kompatibilitas ekonomi server / Cloud Save / multiplayer. Tanpa jaringan/produksi.
const assert = require("assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), SF2 = require("../economy/sf2-core.js"), SF = require("../sf/catalog.js"), QK = require("../economy/quest-core.js"), CC = require("../cloud/core.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 3).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, o) => { buf.set(p, JSON.stringify(o)); } }); for (const [k, v] of buf) m.set(k, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12, n = 0; const op = () => "op" + (++n) + "xxxxxxxx";
const mk = () => { const db = mkdb(); return { db, e: EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true }) }; };
const ecoOf = (db, u) => JSON.parse(db.m.get("shop/economy/" + u)), setEco = (db, u, f) => { const e = ecoOf(db, u); f(e); db.m.set("shop/economy/" + u, JSON.stringify(e)); };
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, "../data.js"), "utf8") + ";globalThis.R=UPGRADES.rod;globalThis.FISHALL=FISH;", ctx); const ROD = ctx.R;
const U = { uid: "user1" };
const OWNER = [[11, "Joran Badai Laut", 140000], [12, "Joran Karang Emas", 175000], [13, "Joran Hiu Raja", 220000], [14, "Joran Palung Hitam", 275000], [15, "Joran Kaisar Samudra", 350000], [16, "Joran Naga Laut", 450000], [17, "Joran Abyss", 575000], [18, "Joran Leviathan", 700000], [19, "Joran Penguasa Legenda", 850000], [20, "Joran Dewa Samudra", 1000000]];
const OLD10 = { levels: ["Joran Bambu Kampung", "Joran Fiber Muara", "Joran Karbon Sungai", "Joran Titanium Pesisir", "Joran Legenda Nusa", "Joran Baja Samudra", "Joran Arus Dalam", "Joran Titan Nelayan", "Joran Raja Laut", "Joran Penakluk Samudra"], cost: [0, 400, 1800, 6500, 22000, 32000, 46000, 62000, 80000, 110000], cap: [8, 18, 40, 80, 150, 200, 260, 330, 420, 500], strength: [1, 1.25, 1.55, 1.9, 2.4, 2.75, 3.1, 3.45, 3.8, 4.2], reel: [1, 1.2, 1.4, 1.65, 1.95, 2.2, 2.45, 2.7, 2.95, 3.2] };
(async () => {
  // ===== JORAN =====
  await t("joran: tepat 20 tingkat; Level 1-10 TIDAK berubah (nama, harga, cap, kuat, tarik)", () => {
    for (const k of ["levels", "cost", "catalog", "cap", "strength", "reel", "desc", "info"]) assert.equal(ROD[k].length, 20, k);
    for (const k of ["levels", "cost", "cap", "strength", "reel"]) assert.equal(JSON.stringify(ROD[k].slice(0, 10)), JSON.stringify(OLD10[k]), k);
  });
  await t("joran Lv 11-20: nama & harga persis daftar Owner (server memakai tabel yang sama)", () => {
    for (const [lv, nm, price] of OWNER) { assert.equal(ROD.levels[lv - 1], nm); assert.equal(ROD.cost[lv - 1], price); assert.equal(ROD.catalog[lv - 1], price); assert.equal(T.UP.rod.cost[lv - 1], price); }
    assert.equal(T.UP.rod.max, 19); assert.equal(new Set(ROD.levels).size, 20);
  });
  await t("statistik usulan bertahap & tidak berlebihan: naik monoton, langkah kecil (<= langkah Lv 6-10), Lv20 <= 1,3x Lv10; cap server cermin data", () => {
    for (let i = 10; i < 20; i++) { assert.ok(ROD.strength[i] > ROD.strength[i - 1] && ROD.reel[i] > ROD.reel[i - 1] && ROD.cap[i] > ROD.cap[i - 1]); assert.ok(ROD.strength[i] - ROD.strength[i - 1] <= 0.15 && ROD.reel[i] - ROD.reel[i - 1] <= 0.1 && ROD.cap[i] - ROD.cap[i - 1] <= 30); }
    assert.ok(ROD.strength[19] <= ROD.strength[9] * 1.3 && ROD.reel[19] <= ROD.reel[9] * 1.3); assert.equal(JSON.stringify(QK.ROD_CAP), JSON.stringify(ROD.cap));
    assert.ok(ROD.cap[19] <= 4900, "cap <= batas bobot Cloud Save");
  });
  await t("server: beli berurutan Lv 2..20 dengan harga server tepat; Lv 21 ditolak; saldo berkurang tepat", async () => {
    const { e, db } = mk(); await e.ecoInit(U, {}); setEco(db, U.uid, (x) => { x.bal = 8_000_000; }); let bal = 8_000_000;
    for (let lv = 1; lv <= 19; lv++) { const r = await e.ecoBuy(U, { opId: op(), kind: "up", k: "rod", lv }); assert.equal(r.price, ROD.cost[lv]); assert.equal(r.up.rod, lv); bal -= ROD.cost[lv]; assert.equal(r.balance, bal); }
    await assert.rejects(() => e.ecoBuy(U, { opId: op(), kind: "up", k: "rod", lv: 20 }), /tidak sesuai|maksimum|tidak dikenal/i); assert.equal(ecoOf(db, U.uid).up.rod, 19);
  });
  await t("server: lompat level ditolak (Lv 12 langsung dari 10), saldo kurang ditolak tanpa mengubah apa pun", async () => {
    const { e, db } = mk(); await e.ecoInit(U, {}); setEco(db, U.uid, (x) => { x.bal = 139999; x.up.rod = 9; });
    await assert.rejects(() => e.ecoBuy(U, { opId: op(), kind: "up", k: "rod", lv: 11 }), /tidak sesuai/);
    await assert.rejects(() => e.ecoBuy(U, { opId: op(), kind: "up", k: "rod", lv: 10 }), /tidak cukup/); const s = ecoOf(db, U.uid); assert.equal(s.bal, 139999); assert.equal(s.up.rod, 9);
    setEco(db, U.uid, (x) => { x.bal = 140000; }); const r = await e.ecoBuy(U, { opId: op(), kind: "up", k: "rod", lv: 10 }); assert.equal(r.price, 140000); assert.equal(r.up.rod, 10); assert.equal(r.balance, 0);
  });
  await t("server: pembelian ganda/paralel (opId sama & klik basi) tidak memotong dua kali", async () => {
    const { e, db } = mk(); await e.ecoInit(U, {}); setEco(db, U.uid, (x) => { x.bal = 1_000_000; x.up.rod = 9; }); const id = op();
    const rs = await Promise.all([e.ecoBuy(U, { opId: id, kind: "up", k: "rod", lv: 10 }), e.ecoBuy(U, { opId: id, kind: "up", k: "rod", lv: 10 })]); assert.equal(rs.filter((r) => !r.duplicate).length, 1);
    await assert.rejects(() => e.ecoBuy(U, { opId: op(), kind: "up", k: "rod", lv: 10 }), /tidak sesuai/); const s = ecoOf(db, U.uid); assert.equal(s.bal, 1_000_000 - 140000); assert.equal(s.up.rod, 10);
  });
  await t("server: dompet tunggal — koin bermain dulu, sisanya Top Up untuk joran mahal; progres Lv 1-10 lama tetap", async () => {
    const { e, db } = mk(); await e.ecoInit(U, {}); setEco(db, U.uid, (x) => { x.bal = 100000; x.up.rod = 9; x.up.bait = 3; x.up.cooler = 4; x.up.boat = 2; });
    db.m.set("shop/entitlements/user1", JSON.stringify({ products: {}, owned: {}, wallet: { SIMULASI: 0, NYATA: 60000 } }));
    const r = await e.ecoBuy(U, { opId: op(), kind: "up", k: "rod", lv: 10 }); assert.equal(r.paidOwn, 100000); assert.equal(r.paidTop, 40000); const s = ecoOf(db, U.uid); assert.deepStrictEqual([s.up.rod, s.up.bait, s.up.cooler, s.up.boat], [10, 3, 4, 2]);
  });
  await t("penegakan Cloud Save: klien tidak bisa menaikkan joran sendiri ke Lv 20 (server menimpa)", async () => {
    const { e, db } = mk(); await e.ecoInit(U, {}); setEco(db, U.uid, (x) => { x.up.rod = 4; }); const au = await e.ecoState(U);
    const r = EC.enforce({ v: 11, money: 9e9, up: { rod: 19, bait: 0, cooler: 0, boat: 0 }, cooler: [], dex: {}, home: { level: 1 }, stats: { casts: 0, caught: 0, earned: 0, legends: 0 }, day: 1 }, au); assert.equal(r.save.up.rod, 4);
  });
  await t("kompatibilitas: kewajaran bobot server untuk joran Lv 20 & Quest Owner (100 kg WhatsApp) tetap; Cloud Save menerima up.rod 19", () => {
    assert.ok(QK.plausKg(19, {}) > QK.plausKg(9, {}) && Number.isFinite(QK.plausKg(19, {}))); assert.equal(QK.ROD.capKg, 100);
    const v = CC.validateSave({ v: 1, money: 0, cooler: [], dex: {}, up: { rod: 19, bait: 4, cooler: 9, boat: 4 } }); assert.ok(!v || v.ok !== false && !(v.errors && v.errors.length), JSON.stringify(v && v.errors));
  });
  await t("multiplayer: klien & server ruangan menerima tingkat joran 0..19 (bukan 9)", () => {
    const rc = fs.readFileSync(path.join(__dirname, "../mp/room-core.js"), "utf8"), cl = fs.readFileSync(path.join(__dirname, "../mp/client.js"), "utf8");
    assert.ok(!/clampInt\((prof|m)\.rd, 0, 9,/.test(rc) && /clampInt\(m\.rd, 0, 19, p\.rod\)/.test(rc)); assert.ok(/Math\.min\(19, \(N\(\)\.S\.up/.test(cl));
  });
  // ===== SPESIES KOMUNITAS =====
  const LIST = [["sf2_leviathan", "Leviathan", ["@ambaleon_12", "@candra_elx", "@_.milan24", "@dramond_12"]], ["sf2_mosasaurus", "Mosasaurus", ["@muh4m4d_1lh4m100", "@nizam39791"]], ["sf2_el_gran_maja", "El Gran Maja", ["@derr6789ten"]], ["sf2_kraken", "Kraken", ["@inirichee15"]], ["sf2_orca", "Orca", ["@ilham.doss1"]], ["sf2_narwhal", "Narwhal", ["@jual.kurma_ajwa"]], ["sf2_buntal", "Ikan Buntal", ["@fadila49218"]], ["sf2_tuna_sirip_biru", "Tuna Sirip Biru", ["@akb4r70"]], ["sf2_channa_marulioides", "Channa Marulioides", ["@bayuwwnumber1"]], ["sf2_barramundi", "Barramundi", ["@hanzz_z410"]], ["sf2_udang_jala", "Udang Jala", ["Usulan Komunitas GRUP NUSA"]]];
  await t("koleksi Samudra Follower = 4 lama + 10 usulan + Udang Jala = 15; nama & kredit persis; kredit Udang Jala bukan akun karangan", () => {
    assert.equal(SF.FISH.length, 4); for (const [id, nm, cr] of LIST) { const s = SF2.BY_ID[id]; assert.ok(s, id); assert.equal(s.name, nm); assert.deepStrictEqual(s.credit, cr, id); assert.ok(s.community); }
    assert.equal(4 + LIST.length, 15); assert.deepStrictEqual(SF.FISH.map((f) => [f.name, f.credit]), [["Ikan Tempe", "@mlfs_05"], ["Cupang Slayer", "@agusii.55"], ["Ikan Prabowo", "@akhmadraffa123"], ["Arapaima Gigas", "@alanaimroni"]]);
    assert.ok(!SF2.BY_ID.sf2_udang_jala.credit.some((c) => c.startsWith("@")));
  });
  await t("Owner setuju: El Gran Maja Mythic Laut Dalam dan Udang Jala Uncommon Muara aktif untuk diundi, lokasi lain tidak", () => {
    const m = SF2.BY_ID.sf2_el_gran_maja, u = SF2.BY_ID.sf2_udang_jala;
    assert.ok(m.community && m.active && m.rarity === "mythic" && m.hab.length === 1 && m.hab[0] === "dalam");
    assert.ok(u.community && u.active && u.rarity === "uncommon" && u.hab.length === 1 && u.hab[0] === "muara");
    assert.equal(SF2.index().dalam.mythic.filter((s) => s.id === m.id).length, 1);
    assert.equal(SF2.index().muara.uncommon.filter((s) => s.id === u.id).length, 1);
    for (const h of SF2.HABITATS) {
      if (h !== "dalam") assert.ok(!SF2.index()[h].mythic.some((s) => s.id === m.id), h);
      if (h !== "muara") assert.ok(!SF2.index()[h].uncommon.some((s) => s.id === u.id), h);
    }
    assert.equal(SF2.pickSpecies("dalam", "mythic", 0.999).id, m.id);
    assert.equal(SF2.pickSpecies("muara", "uncommon", 0.5).id, u.id);
  });
  await t("validasi peluang ekonomi: rarity, Pity, harga tidak berubah; dua spesies berbagi peluang dalam rarity", () => {
    const m = SF2.BY_ID.sf2_el_gran_maja, u = SF2.BY_ID.sf2_udang_jala;
    const deep = SF2.index().dalam.mythic, river = SF2.index().muara.uncommon;
    const sum = (a) => a.reduce((n, s) => n + s.weight, 0);
    assert.equal(sum(deep), 50); assert.equal(sum(river), 34); // deep: lima Mythic w10; muara: 14 + 10 + 10
    const firstM = SF2.odds(0).mythic / 10000 * m.weight / sum(deep);
    const firstU = SF2.odds(0).uncommon / 10000 * u.weight / sum(river);
    assert.ok(Math.abs(firstM - 0.004) < 1e-9); // 0,40% per tangkapan Laut Dalam pada Pity 0
    assert.ok(Math.abs(firstU - 0.07941176470588235 * 2785 / 2700) < 1e-9); // ~7,94% Muara pada Pity 0
    for (const p of [0, 19, 20, 40, 60, 80, 98, 99]) {
      const o = SF2.odds(p); assert.equal(SF2.RARITIES.reduce((n, k) => n + o[k], 0), 10000);
      assert.equal(o.uncommon, p === 99 ? 0 : 2785);
    }
    assert.equal(SF2.odds(99).mythic, 10000);
    assert.equal(SF2.PITY_MAX, 100); assert.equal(SF2.LIM.perHour, 150);
    for (const s of [m, u]) {
      const [min, max] = SF2.PRICE[s.rarity];
      assert.equal(SF2.coinValue(s, s.wMin), min);
      assert.equal(SF2.coinValue(s, s.wMax), max);
      assert.ok(s.wMax <= 4900);
    }
  });
  await t("peluang/Pity/harga TIDAK berubah: tabel dasar & pita, harga rarity, jumlah ikan server 48", () => {
    const o0 = SF2.odds(0); assert.deepStrictEqual([o0.common, o0.uncommon, o0.rare, o0.epic, o0.mythic], [5675, 2785, 825, 515, 200]); assert.equal(SF2.odds(99).mythic, 10000); assert.equal(SF2.PITY_MAX, 100);
    assert.deepStrictEqual(SF2.PRICE, { common: [10, 25], uncommon: [25, 50], rare: [60, 100], epic: [100, 140], mythic: [200, 250] }); assert.equal(T.FISH.length, 48);
    const ids = SF2.SPECIES.filter((s) => s.active).map((s) => s.id).sort(); assert.equal(ids.length, 38);   // 36 lama + 2 spesies aktif atas izin Owner
  });
  await t("Leviathan memakai desain baru (bentuk 'leviatan', palet biru tua + aksen cyan), bukan 'ular' lama; data kompatibel Cloud Save (bobot <= 4900)", () => {
    const l = SF2.BY_ID.sf2_leviathan; assert.equal(l.shape, "leviatan"); assert.ok(/^#0[0-9a-f]/i.test(l.col[0]) && /^#3[0-9a-f]e/i.test(l.col[2]) || l.col[2].toLowerCase() === "#35e8ff"); assert.ok(l.wMax <= 4900 && SF2.BY_ID.sf2_el_gran_maja.wMax <= 4900);
    const draw = fs.readFileSync(path.join(__dirname, "../sf2/draw.js"), "utf8"); for (const k of ["F.leviatan", "F.udang", "F.maja"]) assert.ok(draw.includes(k), k);
  });
  await t("server tabel sinkron: lib Functions sama dengan sumber (tabel ekonomi, quest, sf2)", () => {
    for (const [a, b] of [["economy/sf2-core.js", "firebase/functions/lib/sf2-core.js"], ["economy/tables.js", "firebase/functions/lib/economy-tables.js"], ["economy/quest-core.js", "firebase/functions/lib/quest-core.js"]]) assert.ok(fs.readFileSync(path.join(__dirname, "..", b), "utf8").endsWith(fs.readFileSync(path.join(__dirname, "..", a), "utf8")), b);
  });
  console.log(`unit-komunitas: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
