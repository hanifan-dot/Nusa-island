// Membuat economy/tables.js (tabel harga/ikan/upgrade untuk SERVER) dari sumber game yang SAMA dengan yang dipakai pemain
// (data.js, world/home-data.js). Jalankan: node economy/make-tables.js   (dan firebase/scripts/sync-economy.js untuk menyalin ke Functions)
// Uji tests/unit-economy.js memastikan tables.js tidak basi terhadap data.js.
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
function build(root) {
  const ctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(root, "data.js"), "utf8") + "\n;globalThis.__T={FISH,UPGRADES};", ctx);
  const HD = require(path.join(root, "world/home-data.js"));
  const { FISH, UPGRADES } = ctx.__T;
  const T = {
    FISH: FISH.map((f) => ({ id: f.id, rarity: f.rarity, wMin: f.wMin, wMax: f.wMax, xMax: f.xMax || null, price: f.price, protected: !!f.protected, loc: f.loc })),
    UP: Object.fromEntries(Object.entries(UPGRADES).map(([k, u]) => [k, { cost: u.cost.slice(), max: u.cost.length - 1 }])),
    HOME: HD.LEVELS.map((l) => (l ? { price: l.price, stars: l.stars } : null)),
    CAT: Object.fromEntries(HD.CATALOG.map((c) => [c.id, { price: c.price, stars: c.stars || 0 }])),
  };
  return T;
}
if (require.main === module) {
  const root = path.join(__dirname, ".."), T = build(root), body = JSON.stringify(T);
  const sha = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
  fs.writeFileSync(path.join(__dirname, "tables.js"), `// OTOMATIS dari data.js + world/home-data.js (node economy/make-tables.js) — jangan diedit. sha:${sha}\n"use strict";\nmodule.exports = ${JSON.stringify(T, null, 1)};\n`);
  console.log("economy/tables.js", sha, T.FISH.length, "ikan");
}
module.exports = { build };
