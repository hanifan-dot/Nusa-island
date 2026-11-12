// Menyalin inti ekonomi ke Functions: node economy/make-tables.js && node firebase/scripts/sync-economy.js
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "../..");
for (const [src, dst] of [["economy/core.js", "economy-core.js"], ["economy/tables.js", "economy-tables.js"], ["fishmath.js", "fishmath.js"], ["streak/core.js", "streak-core.js"], ["economy/quest-core.js", "quest-core.js"], ["economy/sf2-core.js", "sf2-core.js"], ["event/core.js", "event-core.js"], ["house/core.js", "house-core.js"], ["username/core.js", "name-core.js"], ["economy/pond-core.js", "pond-core.js"], ["economy/fashion-core.js", "fashion-core.js"], ["economy/sf-core.js", "sf-core.js"], ["economy/aurora-core.js", "aurora-core.js"]]) {
  fs.writeFileSync(path.join(root, "firebase/functions/lib", dst), `// SALINAN OTOMATIS dari ${src} — jangan diedit di sini (node firebase/scripts/sync-economy.js).\n` + fs.readFileSync(path.join(root, src)));
}
console.log("economy-core.js, economy-tables.js, fishmath.js, streak-core.js, event-core.js, house-core.js, name-core.js, pond-core.js, fashion-core.js, aurora-core.js, quest-core.js disalin ke firebase/functions/lib");
