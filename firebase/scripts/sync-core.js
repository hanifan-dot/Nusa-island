// Menyalin inti cloud ke cloud/core.js untuk browser. Jalankan: node firebase/scripts/sync-core.js
const fs = require("fs"), path = require("path");
const src = path.join(__dirname, "../functions/lib/core.js"), dst = path.join(__dirname, "../../cloud/core.js");
fs.writeFileSync(dst, fs.readFileSync(src));
console.log("cloud/core.js disinkronkan dari firebase/functions/lib/core.js");
