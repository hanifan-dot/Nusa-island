// Menyalin inti toko (sumber: shop/core.js) ke firebase/functions/lib/shop-core.js agar ikut diunggah bersama Cloud Functions.
// Jalankan setelah mengubah shop/core.js: node firebase/scripts/sync-shop.js
const fs = require("fs"), path = require("path");
const src = path.join(__dirname, "../../shop/core.js"), dst = path.join(__dirname, "../functions/lib/shop-core.js");
fs.writeFileSync(dst, "// SALINAN OTOMATIS dari shop/core.js — jangan diedit di sini (node firebase/scripts/sync-shop.js).\n" + fs.readFileSync(src));
console.log("firebase/functions/lib/shop-core.js disinkronkan dari shop/core.js");
