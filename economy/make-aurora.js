// Membuat tabel POOL untuk economy/aurora-core.js dari data.js (sumber yang SAMA dengan game). node economy/make-aurora.js [--write]
// Uji tests/unit-aurora.js memastikan tabel di aurora-core.js tidak basi terhadap data.js.
const fs = require("fs"), path = require("path"), vm = require("vm");
function build(root) {
  const ctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(root, "data.js"), "utf8") + "\n;globalThis.__T={FISH,RARITY};", ctx);
  const { FISH, RARITY } = ctx.__T, pool = {};
  for (const f of FISH) {
    if (f.rarity === "sampah" || f.protected || f.mistik) continue;               // sampah, ikan dilindungi, ikan mistis: tidak pernah ikut
    const k = f.loc + (f.seaOnly ? "#s" : ""), P = (pool[k] = pool[k] || { src: [], to: [], tiers: [] });
    if (!P.tiers.includes(f.rarity)) P.tiers.push(f.rarity);
    if (f.rarity === "biasa") P.src.push(f.id);
    if (f.rarity === "langka" && f.night === undefined) P.to.push(f.id);          // hanya ikan langka yang bisa muncul kapan saja (tak terkunci siang/malam)
  }
  const w = (r) => RARITY[r].weight, total = (tiers) => w("sampah") + tiers.reduce((a, r) => a + w(r), 0);
  for (const P of Object.values(pool)) { P.q = Math.round(Math.min(1, 0.01 / (w("biasa") / total(P.tiers))) * 1e6) / 1e6; delete P.tiers; }   // q = 1 poin persentase ÷ porsi Biasa (peluang dasar, hoki 1×)
  return pool;
}
if (require.main === module) {
  const pool = build(path.join(__dirname, ".."));
  if (process.argv.includes("--write")) {
    const f = path.join(__dirname, "aurora-core.js"), s = fs.readFileSync(f, "utf8");
    fs.writeFileSync(f, s.replace(/\/\*POOL\*\/.*\/\*END\*\//, "/*POOL*/" + JSON.stringify(pool) + "/*END*/"));
  } else console.log(JSON.stringify(pool, null, 1));
}
module.exports = { build };
