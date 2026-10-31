// Pengaturan toko dari Cloud Shell oleh Owner (Admin SDK; paket Spark cukup).  Butuh: npm i firebase-admin
//   node toko.js pilot <UID>              mode NYATA + daftar uji = [UID]  → hanya UID itu yang bisa membeli (tahap awal)
//   node toko.js umum [--tanpa-transaksi] kosongkan daftar uji (butuh ≥1 pesanan NYATA berstatus PAID, kecuali --tanpa-transaksi)
//   node toko.js tutup                    kembali ke mode simulasi (toko tertutup untuk uang nyata)
//   node toko.js perbaiki-owner <email-google-owner> [email lain]   DIAGNOSA + PERBAIKI: cari UID dari email, jadikan Owner (klaim+registri), daftar uji = UID itu, mode NYATA
//   node toko.js akun                     daftar akun yang terakhir login (email + UID) untuk mencocokkan akun yang dipakai di game
//   node toko.js bekukan                  MEMBEKUKAN snapshot ekonomi semua simpanan lama ke shop_legacy/{uid} (sekali per akun; tidak menimpa) + menandai migrasi siap.
//                                         ecoInit HANYA memakai snapshot ini — bukan angka dari browser. WAJIB dijalankan sebelum akun lama masuk ekonomi server.
//   node toko.js audit [batas]            ringkasan snapshot & akun ekonomi: jumlah, yang melewati batas koin, 5 terbesar (UID dipotong)
//   node toko.js event-buka [YYYY-MM-DD] BUKA Event 5 Monster Legenda (tanggal = Minggu pembukaan = Megalodon; bawaan 2026-11-01). event-tutup = matikan.
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
  } else if (cmd === "bekukan") {
    const pickUp = (u) => { const o = {}; for (const k of ["rod", "bait", "cooler", "boat"]) o[k] = u && Number.isInteger(u[k]) && u[k] >= 0 && u[k] < 100 ? u[k] : 0; return o; };
    const snap = await db.collectionGroup("saves").get(); let n = 0, skip = 0, bad = 0;
    for (const d of snap.docs) {
      if (d.id !== "current" || d.ref.parent.parent.parent.id !== "users") continue;
      const uid = d.ref.parent.parent.id, ref = db.doc(`shop_legacy/${uid}`);
      if ((await ref.get()).exists) { skip++; continue; }          // sekali: tidak pernah menyerap simpanan yang lebih baru
      let S = {}; try { S = JSON.parse(d.data().data) || {}; } catch (e) { bad++; }
      const fish = (Array.isArray(S.cooler) ? S.cooler : []).concat(S.home && Array.isArray(S.home.placedFish) ? S.home.placedFish : [])
        .filter((x) => x && typeof x.uid === "string" && typeof x.id === "string" && Number.isFinite(x.w)).slice(0, 400).map((x) => ({ uid: x.uid, id: x.id, w: x.w }));
      await ref.set({ money: Number.isFinite(S.money) ? Math.max(0, Math.floor(S.money)) : 0, up: pickUp(S.up), homeLv: S.home && Number.isInteger(S.home.level) && S.home.level >= 1 ? S.home.level : 1, cooler: fish, at: Date.now(), savedAtMs: d.data().savedAtMs || null }); n++;
    }
    await CFG.set({ legacyFrozen: true, legacyFrozenAt: Date.now() }, { merge: true });
    console.log(`Snapshot dibekukan: ${n} baru, ${skip} sudah ada, ${bad} simpanan tak terbaca. Migrasi siap (ecoInit kini hanya memakai snapshot server).`);
  } else if (cmd === "audit") {
    const cap = Number(arg) || 20000, leg = await db.collection("shop_legacy").get(), eco = await db.collection("shop_economy").get();
    const L = leg.docs.map((d) => ({ u: d.id.slice(0, 6) + "…", m: d.data().money || 0 })).sort((a, b) => b.m - a.m), E = eco.docs.filter((d) => d.data().init).map((d) => ({ u: d.id.slice(0, 6) + "…", b: d.data().bal || 0, up: JSON.stringify(d.data().up) })).sort((a, b) => b.b - a.b);
    console.log(`Snapshot: ${L.length} akun; melewati ${cap}: ${L.filter((x) => x.m > cap).length}; terbesar:`, L.slice(0, 5).map((x) => `${x.u}=${x.m}`).join(", "));
    console.log(`Akun ekonomi aktif: ${E.length}; saldo terbesar:`, E.slice(0, 5).map((x) => `${x.u}=${x.b}`).join(", "));
  } else if (cmd === "tutup") { await CFG.set({ mode: "simulasi" }, { merge: true }); console.log("Toko: mode simulasi (tertutup untuk uang nyata)."); }
  else if (cmd === "event-buka") {   // Event 5 Monster Legenda: node toko.js event-buka [YYYY-MM-DD hari Minggu = minggu ke-0 = PEMBUKAAN Megalodon; minggu berikutnya Toman, Jurung, Barakuda, Kuwe, Megalodon …]
    const d = arg || "2026-11-01"; if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || new Date(d + "T12:00:00Z").getUTCDay() !== 0) throw new Error("Tanggal harus hari Minggu, format YYYY-MM-DD.");
    await CFG.set({ eventOn: true, eventAnchor: d, eventOnAt: Date.now() }, { merge: true }); console.log("Event 5 Monster Legenda DIBUKA. Event PERDANA (pembukaan publik: Megalodon Bayangan Purba): Minggu " + d + " 19.00–19.20 WIB.");
  } else if (cmd === "event-pass") { if (arg !== "ya" && arg !== "tidak") throw new Error("Pakai: event-pass ya|tidak"); await CFG.set({ eventPass: arg === "ya" }, { merge: true }); console.log("Akses event khusus (tiket ke lokasi monster): " + arg.toUpperCase() + ". Syarat kapal perjalanan biasa tidak berubah."); }
  else if (cmd === "event-tutup") { await CFG.set({ eventOn: false }, { merge: true }); console.log("Event 5 Monster Legenda DITUTUP (tidak ada duel baru; juara yang sudah ada tetap bisa klaim bila dibuka lagi)."); }
  else if (cmd === "status") { console.log(JSON.stringify({ mode: cur.mode || "simulasi", pilot: cur.pilot || [], pesananNyataPAID: await paid(), event: { buka: cur.eventOn === true, anchor: cur.eventAnchor || null, pass: cur.eventPass !== false } })); }
  else throw new Error("Perintah: pilot <UID> | perbaiki-owner <email> | akun | bekukan | audit | umum | tutup | event-buka [YYYY-MM-DD] | event-pass ya|tidak | event-tutup | status");
})().then(() => process.exit(0), (e) => { console.error("GAGAL:", e.message); process.exit(1); });
