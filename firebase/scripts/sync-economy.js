// Menyalin inti ekonomi ke Functions: node economy/make-tables.js && node firebase/scripts/sync-economy.js
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "../..");
for (const [src, dst] of [["economy/core.js", "economy-core.js"], ["economy/tables.js", "economy-tables.js"], ["fishmath.js", "fishmath.js"], ["streak/core.js", "streak-core.js"]]) {
  fs.writeFileSync(path.join(root, "firebase/functions/lib", dst), `// SALINAN OTOMATIS dari ${src} — jangan diedit di sini (node firebase/scripts/sync-economy.js).\n` + fs.readFileSync(path.join(root, src)));
}
console.log("economy-core.js, economy-tables.js, fishmath.js, streak-core.js disalin ke firebase/functions/lib");
