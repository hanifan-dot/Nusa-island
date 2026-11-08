// Uji Samudra Follower V2: matematika Pity/peluang (murni) + server (ecoSf2Info/ecoSf2Catch): akses 100 tangkapan, Pity, jaminan Mythic, idempotensi,
// Penemu Pertama atomik, harga, observasi, batas laju, tanpa kepercayaan klien. Tanpa jaringan/produksi.
const assert = require("assert"), fs = require("fs"), path = require("path");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), SF2 = require("../economy/sf2-core.js"), SF = require("../economy/sf-core.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 3).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, v) => { buf.set(p, JSON.stringify(v)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12, n = 0; const op = () => "op" + (++n) + "xxxxxxxx";
const inBand = (v, k) => v >= Math.round(SF2.PRICE[k][0] * 0.75) - 1 && v <= Math.round(SF2.PRICE[k][1] * 0.75) + 1;   // nilai jual = band x 0,75 (nerf total 25%)
const SEQ = (...v) => { let i = 0; return () => (i < v.length ? v[i++] : Math.random() * 0.999); };   // acak server tiruan
const mk = (rand, cfg, db0) => { const db = db0 || mkdb(); if (cfg) db.m.set("shop/config", JSON.stringify(cfg)); return { db, e: EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true, sf2: SF2, sf: SF, rand }) }; };
const ecoOf = (db, u) => JSON.parse(db.m.get("shop/economy/" + u));
const setEco = (db, u, f) => { const e = ecoOf(db, u); f(e); db.m.set("shop/economy/" + u, JSON.stringify(e)); };
const player = async (o, u, lbc) => { await o.e.ecoInit({ uid: u }, {}); setEco(o.db, u, (e) => { e.lbc = lbc === undefined ? 100 : lbc; }); };
const go = async (o, u, spot) => { now += 2000; return o.e.ecoSf2Catch({ uid: u }, { opId: op(), spot: spot || "dalam" }); };
// DETERMINISTIK & berulang per tangkapan (tanpa Math.random): tiap tangkapan memakai 8 undian = r1 rarity, r2 spesies, r3 berat, 0,5, 2 undian uid dari deret emas (unik antar tangkapan), lalu 2 undian bonus OWNER FISH (0,9 = tidak dapat).
// Dulu: sesudah 4 nilai jatuh ke Math.random → tangkapan ke-2 pada server yang sama bisa jadi Mythic acak (tes flaky). Mekanisme game tidak diubah.
let GK = 0;   // penghitung global → uid unik juga antar server tiruan yang berbagi satu db
const R = (r1, r2, r3) => { let i = 0; return () => { const j = i++ % 8; return j < 3 ? [r1, r2, r3][j] : j === 3 ? 0.5 : j >= 6 ? 0.9 : ((++GK * 0.6180339887498949) % 1) * 0.999; }; };
(async () => {
  // ---------- matematika murni ----------
  await t("Functions lib sf2-core sama dengan sumber", () => assert.ok(fs.readFileSync(path.join(__dirname, "../firebase/functions/lib/sf2-core.js"), "utf8").endsWith(fs.readFileSync(path.join(__dirname, "../economy/sf2-core.js"), "utf8"))));
  await t("distribusi dasar 56,75/27,85/8,25/5,15/2,00 = 100% dan total SELALU 10000 untuk Pity 0..99", () => {
    const o0 = SF2.odds(0); assert.deepStrictEqual([o0.common, o0.uncommon, o0.rare, o0.epic, o0.mythic], [5675, 2785, 825, 515, 200]);
    for (let p = 0; p < 100; p++) { const o = SF2.odds(p); assert.equal(o.common + o.uncommon + o.rare + o.epic + o.mythic, 10000, "p=" + p); for (const k of SF2.RARITIES) assert.ok(o[k] >= 0 && Number.isInteger(o[k])); } });
  await t("tabel pita: Mythic 2,00 · 2,20 · 2,40 · 2,60 · 2,80 (+0,20 per pita; Epic ikut +0,20 dari 5,15); tambahan diambil dari Common", () => {
    const exp = [[0, 2], [19, 2], [20, 2.2], [39, 2.2], [40, 2.4], [59, 2.4], [60, 2.6], [79, 2.6], [80, 2.8], [98, 2.8]];
    for (const [p, e] of exp) { const o = SF2.odds(p); assert.equal(SF2.pct(o.mythic), e, "mythic p=" + p); assert.equal(o.epic - 515, o.mythic - 200, "epic p=" + p); assert.equal(o.uncommon, 2785); assert.equal(o.rare, 825); assert.equal(o.common, 5675 - 2 * (o.mythic - 200)); } });
  await t("Pity 99 → Mythic 100% DIJAMIN (tangkapan ke-100) apa pun acaknya", () => { const o = SF2.odds(99); assert.equal(o.mythic, 10000); assert.ok(o.guaranteed); for (const r of [0, 0.3, 0.9999]) assert.equal(SF2.rollRarity(99, r), "mythic"); assert.ok(!SF2.odds(98).guaranteed); });
  await t("aturan reset: 19→20; Mythic di Pity 73 → 0; 99+sukses → 0 (Mythic)", () => { assert.equal(SF2.nextPity(19, "common"), 20); assert.equal(SF2.nextPity(73, "mythic"), 0); assert.equal(SF2.nextPity(99, SF2.rollRarity(99, 0.5)), 0); assert.equal(SF2.nextPity(98, "rare"), 99); });
  await t("batas rarity tepat (bp): 5674→common, 5675→uncommon, 9799→epic, 9800→mythic", () => { assert.equal(SF2.rollRarity(0, 0.5674), "common"); assert.equal(SF2.rollRarity(0, 0.5675), "uncommon"); assert.equal(SF2.rollRarity(0, 0.9799), "epic"); assert.equal(SF2.rollRarity(0, 0.98), "mythic"); assert.throws(() => SF2.rollRarity(0, 1)); });
  await t("katalog: ID permanen unik & valid, 12 spesies komunitas (10 usulan Owner + Udang Jala + Naga Palung orisinal) + 4 lama = 16, nilai jual dalam rentang rarity, tiap spot punya SEMUA 5 rarity", () => {
    const ids = new Set(); for (const s of SF2.SPECIES) { assert.ok(/^[a-z0-9_]{1,40}$/.test(s.id) && !ids.has(s.id)); ids.add(s.id); assert.ok(s.wMin > 0 && s.wMax > s.wMin); for (const h of s.hab) assert.ok(SF2.HABITATS.includes(h)); }
    assert.equal(SF2.SPECIES.filter((s) => s.community).length, 12); assert.equal(SF2.LEGACY.length, 4); assert.equal(SF2.SPECIES.filter((s) => s.community).length + SF2.LEGACY.length, 16);
    for (const s of SF2.SPECIES) if (!s.obs) { const [a, b] = SF2.PRICE[s.rarity]; for (const w of [s.wMin, (s.wMin + s.wMax) / 2, s.wMax]) { const v = SF2.coinValue(s, w); assert.ok(v >= a && v <= b); } }
    for (const h of SF2.HABITATS) for (const r of SF2.RARITIES) assert.ok(SF2.index()[h][r].length >= 1, h + "/" + r);
    assert.ok(SF2.SPECIES.filter((s) => s.rarity === "common").length >= 8 && SF2.SPECIES.filter((s) => s.rarity === "uncommon").length >= 6);
    assert.ok(SF2.PRICE.mythic[1] <= 250 && SF2.PRICE.common[0] >= 10); for (const id of ["sf2_orca", "sf2_narwhal"]) assert.ok(SF2.BY_ID[id].obs); });
  await t("KOMPATIBEL Cloud Save: bobot tiap spesies <= batas validator (5000 kg) dan jumlah entri koleksi <= DEX_MAX; item/dex hasil undian lolos validateSave", () => {
    const CC = require("../cloud/core.js"); for (const s of SF2.SPECIES) assert.ok(s.wMax <= 4900, s.id + " wMax " + s.wMax + " > batas Cloud Save");
    const dex = {}, cooler = []; for (const s of SF2.SPECIES) { dex[s.id] = { n: 3, best: s.wMax }; if (!s.obs) cooler.push({ uid: "u" + s.id.slice(0, 30), id: s.id, w: s.wMax, t: 1, sp: 1.5, lock: true }); }
    const v = CC.validateSave ? CC.validateSave({ v: 1, money: 0, cooler, dex, up: { rod: 0, bait: 0, cooler: 0, boat: 0 } }) : null; if (v) assert.ok(v.ok !== false && !(v.errors && v.errors.length), JSON.stringify(v.errors || v).slice(0, 200));
    const limits = (CC.LIMITS || {}); if (limits.DEX_MAX) assert.ok(SF2.SPECIES.length + SF2.LEGACY.length + 60 <= limits.DEX_MAX, "DEX_MAX terlampaui — naikkan DEX_MAX (cloud-core) lebih dulu"); });
  await t("4 entri lama tetap; pulau TIDAK mengundi mereka (tidak ada dua sistem undian)", () => { for (const id of SF.IDS) assert.ok(SF2.LEGACY.some((l) => l.id === id)); for (const s of SF2.SPECIES) assert.ok(!SF.isSF(s.id)); });
  await t("katalog 1.000 entri tetap efisien (indeks): 100k undian < 1 dtk", () => {
    const keep = SF2.SPECIES.length; for (let i = 0; i < 1000 - SF2.LEGACY.length - keep; i++) SF2.SPECIES.push({ id: "sf2_x" + i, name: "X" + i, rarity: SF2.RARITIES[i % 5], hab: [SF2.HABITATS[i % 4]], wMin: 1, wMax: 2, weight: 10, active: true, kind: "sf2" }); SF2.reset();
    const t0 = Date.now(); for (let i = 0; i < 100000; i++) SF2.pickSpecies(SF2.HABITATS[i % 4], SF2.RARITIES[i % 5], (i % 997) / 997); const dt = Date.now() - t0;
    SF2.SPECIES.length = keep; SF2.reset(); assert.ok(dt < 1000, "lambat " + dt + "ms"); });
  await t("spesies tak aktif tidak diundi tetapi tetap ada di katalog", () => { const s = SF2.BY_ID.sf2_belanak; s.active = false; SF2.reset(); const left = SF2.index().muara.common.map((x) => x.id); s.active = true; SF2.reset(); assert.ok(!left.includes("sf2_belanak") && SF2.BY_ID.sf2_belanak); });

  // ---------- server ----------
  await t("terkunci < 100: ditolak dengan pesan resmi + hitungan; tidak mengubah Pity/Coolbox", async () => { const o = mk(R(0.97, 0, 0)); await player(o, "a", 73);
    await assert.rejects(() => go(o, "a"), /Samudra Follower terkunci\. Tangkap 100 ikan untuk membuka perjalanan! \(73\/100\)/);
    const e = ecoOf(o.db, "a"); assert.ok(!e.sf2 || (e.sf2.p || 0) === 0); assert.equal(e.box.length, 0);
    const i = await o.e.ecoSf2Info({ uid: "a" }); assert.equal(i.have, 73); assert.equal(i.unlocked, false); assert.equal(i.need, 100); });
  await t("tepat 100 membuka; 99 tetap terkunci", async () => { const o = mk(R(0.1, 0, 0)); await player(o, "a", 99); await assert.rejects(() => go(o, "a"), /terkunci/); setEco(o.db, "a", (e) => { e.lbc = 100; }); assert.ok((await go(o, "a")).ok); });
  await t("angka klien tidak berpengaruh: paket 'lbc/pity/rarity' dari klien diabaikan", async () => { const o = mk(R(0.1, 0, 0)); await player(o, "a", 5);
    now += 2000; await assert.rejects(() => o.e.ecoSf2Catch({ uid: "a" }, { opId: op(), spot: "dalam", lbc: 999, caught: 999, pity: 99, rarity: "mythic", id: "sf2_leviathan" }), /terkunci/); });
  await t("simpanan lama: ratchet dari Coolbox server dihitung (progres lama dihormati), tidak turun saat dijual", async () => { const o = mk(R(0.1, 0, 0)); await o.e.ecoInit({ uid: "a" }, {}); setEco(o.db, "a", (e) => { e.lbc = 10; e.box = Array.from({ length: 100 }, (_, i) => ({ u: "u" + i, id: "nila", w: 0.5 })); });
    assert.ok((await go(o, "a")).ok); setEco(o.db, "a", (e) => { e.box = []; }); assert.ok((await go(o, "a")).ok, "tetap terbuka setelah Coolbox dikosongkan"); assert.equal((await o.e.ecoSf2Info({ uid: "a" })).unlocked, true); });
  await t("kredit Owner (config) hanya untuk akun yang ada sebelum batas waktu", async () => { const cfg = { sf2: { legacyCredit: 100, legacyBefore: 1e12 + 5e9 } }; const o = mk(R(0.1, 0, 0), cfg); await player(o, "a", 0); assert.ok((await go(o, "a")).ok);
    const cfg2 = { sf2: { legacyCredit: 100, legacyBefore: 5 } }; const o2 = mk(R(0.1, 0, 0), cfg2); await player(o2, "b", 0); await assert.rejects(() => go(o2, "b"), /terkunci/); });
  await t("Pity 0 → catch non-Mythic → 1 ... 19→20; HUD info mengikuti", async () => { const o = mk(R(0.1, 0, 0)); await player(o, "a"); let r; for (let i = 0; i < 20; i++) { o.e = mk(R(0.1, 0, 0), null, o.db).e; r = await go(o, "a"); assert.equal(r.pity, i + 1); assert.equal(r.pityBefore, i); }
    const inf = await o.e.ecoSf2Info({ uid: "a" }); assert.equal(inf.pity, 20); assert.equal(inf.band, 1); assert.equal(inf.odds.mythic, 2.2); assert.equal(inf.odds.epic, 5.35); });
  await t("Pity 19: undian ke-20 memakai 2,00%; Pity 20: undian berikutnya memakai 2,20% (batas Mythic 0,9780 vs 0,9800)", async () => {
    const o = mk(R(0.9790, 0, 0)); await player(o, "a"); setEco(o.db, "a", (e) => { e.sf2 = { p: 19, n: 19, base: 0, d: {}, f: {}, h: [] }; }); let r = await go(o, "a"); assert.equal(r.fish.rarity, "epic", "p19: 0.979 masih Epic (<0.98)");
    const o2 = mk(R(0.9790, 0, 0)); await player(o2, "b"); setEco(o2.db, "b", (e) => { e.sf2 = { p: 20, n: 20, base: 0, d: {}, f: {}, h: [] }; }); r = await go(o2, "b"); assert.equal(r.fish.rarity, "mythic", "p20: 0.979 → Mythic (batas 0,978)"); });
  await t("Owner: El Gran Maja nyata diundi server (Mythic Laut Dalam), harga rarity dan Pity aman", async () => {
    const o = mk(R(0.99, 0.999, 0.5)); await player(o, "maja");
    const r = await go(o, "maja", "dalam");
    assert.equal(r.fish.id, "sf2_el_gran_maja");
    assert.equal(r.fish.rarity, "mythic");
    assert.ok(inBand(r.fish.value, "mythic"));
    assert.equal(r.pity, 0); assert.ok(r.first);
  });
  await t("Owner: Udang Jala nyata diundi server (Uncommon Muara), harga rarity dan Pity aman", async () => {
    const o = mk(R(0.6, 0.5, 0.5)); await player(o, "udang");
    const r = await go(o, "udang", "muara");
    assert.equal(r.fish.id, "sf2_udang_jala");
    assert.equal(r.fish.rarity, "uncommon");
    assert.ok(inBand(r.fish.value, "uncommon"));
    assert.equal(r.pity, 1); assert.ok(r.first);
  });
  await t("Mythic pada Pity 73 → reset 0 langsung", async () => { const o = mk(R(0.99, 0, 0)); await player(o, "a"); setEco(o.db, "a", (e) => { e.sf2 = { p: 73, n: 73, base: 0, d: {}, f: {}, h: [] }; }); const r = await go(o, "a"); assert.ok(r.mythic); assert.equal(r.pity, 0); assert.equal(r.pityBefore, 73); assert.equal((await o.e.ecoSf2Info({ uid: "a" })).pity, 0); });
  await t("Pity 99 + tangkapan sukses → WAJIB Mythic (acak 0 = Common di tabel biasa) lalu reset 0", async () => { const o = mk(R(0.0, 0, 0)); await player(o, "a"); setEco(o.db, "a", (e) => { e.sf2 = { p: 99, n: 99, base: 0, d: {}, f: {}, h: [] }; });
    const r = await go(o, "a", "karang"); assert.equal(r.fish.rarity, "mythic"); assert.ok(r.guaranteed); assert.equal(r.pity, 0); assert.ok(SF2.BY_ID[r.fish.id].rarity === "mythic" && SF2.BY_ID[r.fish.id].hab.includes("karang")); });
  await t("simulasi 100 tangkapan penuh tanpa keberuntungan: tepat ke-100 Mythic, tidak pernah lewat dari 100 tanpa Mythic", async () => { const db = mkdb(); const mkr = () => mk(R(0.0, 0, 0), null, db); let o = mkr(); await player(o, "a"); const seq = [];
    for (let i = 0; i < 100; i++) { o = mkr(); seq.push((await go(o, "a")).fish.rarity); } assert.equal(seq.slice(0, 99).filter((x) => x === "mythic").length, 0); assert.equal(seq[99], "mythic"); assert.equal(ecoOf(db, "a").sf2.p, 0); });
  await t("duplikat opId: hasil sama, Pity/ikan/penghitung TIDAK bertambah lagi", async () => { const o = mk(R(0.1, 0, 0)); await player(o, "a"); now += 2000; const id = op(); const r1 = await o.e.ecoSf2Catch({ uid: "a" }, { opId: id, spot: "karang" }); const e1 = ecoOf(o.db, "a");
    const r2 = await o.e.ecoSf2Catch({ uid: "a" }, { opId: id, spot: "karang" }); assert.ok(r2.duplicate); assert.equal(r2.fish.uid, r1.fish.uid); const e2 = ecoOf(o.db, "a"); assert.equal(e2.sf2.p, e1.sf2.p); assert.equal(e2.sf2.n, 1); assert.equal(e2.box.length, 1); });
  await t("permintaan serentak dengan opId sama → hanya satu ikan", async () => { const o = mk(R(0.1, 0, 0)); await player(o, "a"); now += 2000; const id = op(); const rs = await Promise.all([1, 2, 3, 4].map(() => o.e.ecoSf2Catch({ uid: "a" }, { opId: id, spot: "muara" })));
    assert.equal(new Set(rs.map((r) => r.fish.uid)).size, 1); assert.equal(ecoOf(o.db, "a").box.length, 1); assert.equal(ecoOf(o.db, "a").sf2.p, 1); });
  await t("pemain berbeda punya Pity masing-masing", async () => { const db = mkdb(); const a = mk(R(0.1, 0, 0), null, db), b = mk(R(0.1, 0, 0), null, db); await player(a, "a"); await player(b, "b"); await go(a, "a"); await go(a, "a"); await go(b, "b");
    assert.equal(ecoOf(db, "a").sf2.p, 2); assert.equal(ecoOf(db, "b").sf2.p, 1); });
  await t("Penemu Pertama: hanya satu pemenang per spesies (serentak); yang kedua tidak mendapat gelar; kunjungan ulang tidak mengulang", async () => {
    const db = mkdb(); const a = mk(R(0.99, 0, 0), null, db), b = mk(R(0.99, 0, 0), null, db); await player(a, "a"); await player(b, "b"); now += 2000;
    const [ra, rb] = await Promise.all([a.e.ecoSf2Catch({ uid: "a" }, { opId: op(), spot: "dalam" }), b.e.ecoSf2Catch({ uid: "b" }, { opId: op(), spot: "dalam" })]);
    assert.equal(ra.fish.id, "sf2_leviathan"); assert.equal(rb.fish.id, "sf2_leviathan"); assert.equal([ra.first, rb.first].filter(Boolean).length, 1, "tepat satu pemenang"); const F = JSON.parse(db.m.get("sf2/firsts")).m; assert.equal(Object.keys(F).length, 1);
    const winner = ra.first ? "a" : "b"; assert.equal(F.sf2_leviathan.u, winner); const again = await go(mk(R(0.99, 0, 0), null, db), winner, "dalam"); assert.equal(again.fish.id, "sf2_leviathan"); assert.ok(!again.first); assert.ok(ecoOf(db, winner).sf2.f.sf2_leviathan);
    const loser = winner === "a" ? "b" : "a"; assert.ok(!ecoOf(db, loser).sf2.f.sf2_leviathan); const inf = await a.e.ecoSf2Info({ uid: "a" }); assert.equal(inf.firsts.sf2_leviathan.mine, winner === "a"); });
  await t("spesies non-komunitas tidak memberi gelar Penemu Pertama", async () => { const o = mk(R(0.1, 0, 0)); await player(o, "a"); const r = await go(o, "a", "karang"); assert.ok(!SF2.BY_ID[r.fish.id].community); assert.ok(!r.first); assert.equal(o.db.m.has("sf2/firsts"), false); });
  await t("Orca/Narwhal = observasi: tercatat di koleksi, TIDAK masuk Coolbox, nilai 0", async () => { const o = mk(R(0.95, 0, 0)); await player(o, "a"); const r = await go(o, "a", "dalam"); assert.equal(r.fish.id, "sf2_orca"); assert.ok(r.fish.obs); assert.equal(r.fish.uid, null); assert.equal(r.fish.value, 0);
    const e = ecoOf(o.db, "a"); assert.equal(e.box.length, 0); assert.equal(e.sf2.d.sf2_orca.n, 1); assert.ok(r.first); });
  await t("jual: nilai server = value saat tangkap (rentang rarity), jual ulang tidak menambah koin; kolam menolak ikan pulau", async () => { const o = mk(R(0.3, 0, 0.5)); await player(o, "a"); const r = await go(o, "a", "karang"); const [a, b] = SF2.PRICE[r.fish.rarity];
    assert.ok(inBand(r.fish.value, r.fish.rarity), "nilai " + r.fish.value); const bal = (await o.e.ecoState({ uid: "a" })).balance; const s = await o.e.ecoSell({ uid: "a" }, { opId: op(), uids: [r.fish.uid], day: 3 });
    assert.equal(s.total, r.fish.value); assert.equal(s.balance, bal + r.fish.value); const s2 = await o.e.ecoSell({ uid: "a" }, { opId: op(), uids: [r.fish.uid], day: 3 }); assert.equal(s2.sold.length, 0); assert.equal(s2.total, 0); });
  await t("nilai jual SEMUA spesies × berat min/maks tepat sesuai rentang (harga akhir konsisten, tanpa jutaan koin)", async () => {
    for (const s of SF2.SPECIES) { if (s.obs) continue; for (const w of [s.wMin, s.wMax]) { const cv = SF2.coinValue(s, w), got = FM.sf2Price(FM.lockSp(cv, w, 3), w, 3); assert.ok(Math.abs(got - cv * 0.75) <= 1, s.id + " w=" + w + " cv=" + cv + " got=" + got); assert.ok(got <= 251 * 0.75 + 1); } } });
  await t("spot tidak valid / tanpa opId ditolak; habitat menentukan spesies (danau tidak memunculkan ikan laut)", async () => { const o = mk(R(0.1, 0, 0)); await player(o, "a"); now += 2000;
    await assert.rejects(() => o.e.ecoSf2Catch({ uid: "a" }, { opId: op(), spot: "laut" }), /tidak valid/); await assert.rejects(() => o.e.ecoSf2Catch({ uid: "a" }, { spot: "dalam" }), /opId/);
    for (let i = 0; i < 40; i++) { const o2 = mk(null, null, o.db); o2.e = EC.makeEconomyServer(o.db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true, sf2: SF2, rand: SEQ(Math.random() * 0.999, Math.random(), Math.random(), Math.random()) }); setEco(o.db, "a", (e) => { e.lastCatchAt = 0; if (e.sf2) e.sf2.h = []; e.box = []; });
      const r = await go(o2, "a", "danau"); assert.ok(SF2.BY_ID[r.fish.id].hab.includes("danau"), r.fish.id); } });
  await t("batas laju: jeda minimum & maks tangkapan pulau per jam; Coolbox penuh ditolak SEBELUM undian (tidak bisa re-roll)", async () => { const o = mk(R(0.1, 0, 0)); await player(o, "a"); now += 2000; await o.e.ecoSf2Catch({ uid: "a" }, { opId: op(), spot: "karang" });
    await assert.rejects(() => o.e.ecoSf2Catch({ uid: "a" }, { opId: op(), spot: "karang" }), /terlalu cepat/);
    setEco(o.db, "a", (e) => { e.lastCatchAt = 0; e.sf2.h = Array.from({ length: SF2.LIM.perHour }, () => now - 1000); }); now += 2000; await assert.rejects(() => o.e.ecoSf2Catch({ uid: "a" }, { opId: op(), spot: "karang" }), /per jam/);
    setEco(o.db, "a", (e) => { e.sf2.h = []; e.box = Array.from({ length: 400 }, (_, i) => ({ u: "z" + i, id: "nila", w: 1 })); }); const p0 = ecoOf(o.db, "a").sf2.p; now += 2000; await assert.rejects(() => o.e.ecoSf2Catch({ uid: "a" }, { opId: op(), spot: "karang" }), /penuh/); assert.equal(ecoOf(o.db, "a").sf2.p, p0); });
  await t("saklar Owner off=true menutup pulau; tanpa modul sf2 (server lama) menolak bersih", async () => { const o = mk(R(0.1, 0, 0), { sf2: { off: true } }); await player(o, "a"); await assert.rejects(() => go(o, "a"), /belum dibuka/); assert.equal((await o.e.ecoSf2Info({ uid: "a" })).off, true);
    const db = mkdb(); const old = EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true }); await old.ecoInit({ uid: "a" }, {}); assert.equal((await old.ecoSf2Info({ uid: "a" })).on, false); await assert.rejects(() => old.ecoSf2Catch({ uid: "a" }, { opId: op(), spot: "karang" }), /belum aktif/); });
  await t("acak server tidak tersedia (rand=1) → gagal-tertutup, tanpa efek samping", async () => { const o = mk(() => 1); await player(o, "a"); now += 2000; const before = JSON.stringify(ecoOf(o.db, "a")); await assert.rejects(() => o.e.ecoSf2Catch({ uid: "a" }, { opId: op(), spot: "karang" }), /Pengacak/); assert.equal(JSON.stringify(ecoOf(o.db, "a")), before); });
  await t("frekuensi nyata (acak server sungguhan, 30k tangkapan Pity 0..98): Epic/Mythic ≈ 5,0–5,8% dan total 100%", async () => {
    let cnt = { common: 0, uncommon: 0, rare: 0, epic: 0, mythic: 0 }, N = 30000; for (let i = 0; i < N; i++) { const p = i % 99; cnt[SF2.rollRarity(p, Math.random())]++; } const exp = Array.from({ length: N }, (_, i) => SF2.odds(i % 99)).reduce((a, o) => a + o.mythic, 0) / (N * 10000);
    assert.ok(Math.abs(cnt.mythic / N - exp) < 0.006, "mythic " + cnt.mythic / N + " vs " + exp); assert.equal(Object.values(cnt).reduce((a, b) => a + b, 0), N); assert.ok(cnt.common / N > 0.52 && cnt.common / N < 0.57); });
  await t("ikan biasa/SF lama tidak berubah: FISH server 48 spesies, tanpa id sf2_", () => assert.ok(T.FISH.length === 48 && !T.FISH.some((f) => f.id.startsWith("sf2_"))));
  console.log(`unit-sf2: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
