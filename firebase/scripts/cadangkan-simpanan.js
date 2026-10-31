// Menyalin SEMUA simpanan pemain (users/*/saves/current) ke satu berkas lokal sebelum rilis, dan menghitungnya. Hanya BACA (Admin SDK).
//   node cadangkan-simpanan.js <berkas-keluaran.json>      →  mencetak  SIMPANAN=<jumlah>
//   node cadangkan-simpanan.js --hitung                    →  hanya menghitung (dipakai setelah rilis untuk membandingkan)
const admin = require("firebase-admin"), fs = require("fs");
admin.initializeApp({ projectId: "nusa-island-d2023" });
const db = admin.firestore(), out = process.argv[2];
(async () => {
  const q = db.collectionGroup("saves"); const n = (await q.count().get()).data().count;
  if (out && out !== "--hitung") {
    if (n > 3000) throw new Error(`Terlalu banyak simpanan (${n}) untuk salinan lokal; lakukan ekspor terjadwal Firestore.`);
    const snap = await q.get(), o = {}; snap.forEach((d) => { if (d.id === "current") o[d.ref.path] = d.data(); });
    fs.writeFileSync(out, JSON.stringify(o)); fs.chmodSync(out, 0o600); console.log("Salinan ditulis:", out, Object.keys(o).length, "simpanan");
  }
  console.log("SIMPANAN=" + n);
})().then(() => process.exit(0), (e) => { console.error("GAGAL:", e.message); process.exit(1); });
