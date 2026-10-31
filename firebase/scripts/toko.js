// Pengaturan toko dari Cloud Shell oleh Owner (Admin SDK; paket Spark cukup).  Butuh: npm i firebase-admin
//   node toko.js pilot <UID>              mode NYATA + daftar uji = [UID]  → hanya UID itu yang bisa membeli (tahap awal)
//   node toko.js umum [--tanpa-transaksi] kosongkan daftar uji (butuh ≥1 pesanan NYATA berstatus PAID, kecuali --tanpa-transaksi)
//   node toko.js tutup                    kembali ke mode simulasi (toko tertutup untuk uang nyata)
//   node toko.js status                   tampilkan mode, daftar uji, jumlah pesanan PAID nyata
// CATATAN: "umum" saja TIDAK cukup membuka toko: Worker juga harus berkunci NUSA_PUBLIC_OPEN="ya" (scripts/buka-umum.sh mengerjakan keduanya).
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
initializeApp({ projectId: "nusa-island-d2023" });
const db = getFirestore(), CFG = db.doc("shop_config/main"), [cmd, arg] = process.argv.slice(2);
const UID = /^[A-Za-z0-9_-]{6,128}$/;
(async () => {
  const cur = ((await CFG.get()).data()) || {};
  const paid = async () => (await db.collection("shop_orders").where("status", "==", "PAID").where("env", "==", "NYATA").limit(5).get()).size;
  if (cmd === "pilot") {
    if (!UID.test(arg || "")) throw new Error("Isi UID Owner: node toko.js pilot <UID>");
    await CFG.set({ mode: "nyata", pilot: [arg] }, { merge: true }); console.log("Toko: mode NYATA, hanya UID uji yang bisa membeli:", arg);
  } else if (cmd === "umum") {
    if (!process.argv.includes("--tanpa-transaksi") && (await paid()) < 1) throw new Error("Belum ada pesanan NYATA berstatus PAID. Lakukan transaksi uji Owner dulu (atau --tanpa-transaksi bila Anda sengaja).");
    if (cur.mode !== "nyata") throw new Error("Mode toko belum NYATA.");
    await CFG.set({ pilot: [] }, { merge: true }); console.log("Daftar uji dikosongkan.");
  } else if (cmd === "tutup") { await CFG.set({ mode: "simulasi" }, { merge: true }); console.log("Toko: mode simulasi (tertutup untuk uang nyata)."); }
  else if (cmd === "status") { console.log(JSON.stringify({ mode: cur.mode || "simulasi", pilot: cur.pilot || [], pesananNyataPAID: await paid() })); }
  else throw new Error("Perintah: pilot <UID> | umum | tutup | status");
})().then(() => process.exit(0), (e) => { console.error("GAGAL:", e.message); process.exit(1); });
