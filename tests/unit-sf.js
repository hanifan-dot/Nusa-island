const C = require("../sf/catalog.js"); let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log("GAGAL:", m); } };
ok(C.DEFAULT_MODE === "off", "default off"); ok(C.FISH.length === 4, "tepat 4 ikan");
const want = { sf_tempe: ["MYTHICAL", "@mlfs_05"], sf_cupang_slayer: ["EPIC", "@agusii.55"], sf_prabowo: ["MYTHICAL EVENT", "@akhmadraffa123"], sf_arapaima: ["LEGENDARY", "@alanaimroni"] };
for (const f of C.FISH) { const w = want[f.id]; ok(w, "id resmi " + f.id); ok(C.RARITY[f.rarity].label === w[0], "rarity " + f.id); ok(f.credit === w[1], "kredit " + f.id); ok(f.price === null && f.chance === null, "tanpa harga/peluang " + f.id); ok(f.enabled === false && f.final === false, "nonaktif " + f.id); ok(f.desc && f.desc.length > 20, "deskripsi " + f.id); ok(!C.checkCatch(f.id, f.wMin || 1, {}).ok, "tidak bisa ditangkap " + f.id); }
ok(!C.checkCatch("xx", 1, {}).ok, "id asing ditolak"); ok(C.isSF("sf_tempe") && !C.isSF("tuna"), "isSF");
const D = require("../data.js"); const FISH = (D.FISH || (D.NW && D.NW.FISH) || []); ok(!FISH.some((f) => String(f.id).startsWith("sf_")), "tidak masuk kolam ikan");
console.log(bad ? "GAGAL " + bad : "unit-sf OK"); process.exit(bad ? 1 : 0);
