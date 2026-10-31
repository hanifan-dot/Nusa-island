// Pengaturan toko dari Cloud Shell oleh Owner (Admin SDK; paket Spark cukup).  Butuh: npm i firebase-admin
//   node toko.js pilot <UID>              mode NYATA + daftar uji = [UID]  → hanya UID itu yang bisa membeli (tahap awal)
//   node toko.js umum [--tanpa-transaksi] kosongkan daftar uji (butuh ≥1 pesanan NYATA berstatus PAID, kecuali --tanpa-transaksi)
//   node toko.js tutup                    kembali ke mode simulasi (toko tertutup untuk uang nyata)
//   node toko.js perbaiki-owner <email-google-owner> [email lain]   DIAGNOSA + PERBAIKI: cari UID dari email, jadikan Owner (klaim+registri), daftar uji = UID itu, mode NYATA
//   node toko.js akun                     daftar akun yang terakhir login (email + UID) untuk mencocokkan akun yang dipakai di game
//   node toko.js status                   tampilkan mode, daftar uji, jumlah pesanan PAID nyata
// CATATAN: "umum" saja TIDAK cukup membuka toko: Worker juga harus berkunci NUSA_PUBLIC_OPEN="ya" (scripts/buka-umum.sh mengerjakan keduanya).
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
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
  } else if (cmd === "akun") {
    const l = (await getAuth().listUsers(1000)).users.sort((a, b) => Date.parse(b.metadata.lastSignInTime || 0) - Date.parse(a.metadata.lastSignInTime || 0)).slice(0, 8);
    l.forEach((u) => console.log(`${u.email || "(tanpa email)"}  UID=${u.uid}  login terakhir: ${u.metadata.lastSignInTime}`));
  } else if (cmd === "perbaiki-owner") {
    const emails = process.argv.slice(3).filter((x) => /@/.test(x)); if (!emails.length) throw new Error("Isi email Google Owner: node toko.js perbaiki-owner <email>");
    console.log("SEBELUM : mode=" + (cur.mode || "simulasi") + ", daftar uji=" + JSON.stringify(cur.pilot || []));
    const uids = [];
    for (const em of emails) {
      const u = await getAuth().getUserByEmail(em).catch(() => { throw new Error("Email " + em + " tidak ada di Firebase Authentication (belum pernah login ke game dengan akun itu?). Jalankan: node toko.js akun"); });
      if (!u.emailVerified) throw new Error("Email " + em + " belum terverifikasi.");
      await getAuth().setCustomUserClaims(u.uid, { role: "owner" }); await db.doc(`owners/${u.uid}`).set({ active: true, email: u.email || null, updatedAt: Date.now() });
      uids.push(u.uid); console.log("Owner  : " + u.email + "  UID=" + u.uid + "  → " + ((cur.pilot || []).includes(u.uid) ? "SUDAH di daftar uji" : "TIDAK ada di daftar uji (ini penyebab diblokir)"));
    }
    await CFG.set({ mode: "nyata", pilot: uids }, { merge: true });
    const api = process.env.API_BASE; if (api) { try { const j = await (await fetch(api.replace(/\/+$/, "") + "/api/public-config")).json(); console.log("Worker : shopWrites=" + j.shopWrites + (j.shopWrites ? " (kunci ganda hidup)" : " (KUNCI GANDA MATI: pembayaran nyata belum aktif di Worker)")); } catch (e) { console.log("Worker : tidak terjangkau (" + e.message + ")"); } }
    console.log("SESUDAH : mode=nyata, daftar uji=" + JSON.stringify(uids) + " → hanya akun ini yang bisa membeli. Keluar-masuk (login ulang) di game & dashboard agar klaim Owner berlaku, lalu coba BELI lagi.");
  } else if (cmd === "tutup") { await CFG.set({ mode: "simulasi" }, { merge: true }); console.log("Toko: mode simulasi (tertutup untuk uang nyata)."); }
  else if (cmd === "status") { console.log(JSON.stringify({ mode: cur.mode || "simulasi", pilot: cur.pilot || [], pesananNyataPAID: await paid() })); }
  else throw new Error("Perintah: pilot <UID> | perbaiki-owner <email> | akun | umum | tutup | status");
})().then(() => process.exit(0), (e) => { console.error("GAGAL:", e.message); process.exit(1); });
