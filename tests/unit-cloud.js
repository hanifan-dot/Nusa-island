// Tahap 3: uji unit inti cloud (logika server) — node tests/unit-cloud.js
const fs = require("fs"), path = require("path");
const core = require("../firebase/functions/lib/core.js");
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) pass++; else { fail++; console.log("FAIL ", n, x === undefined ? "" : JSON.stringify(x)); } };
const rej = async (n, p, code) => { try { await p; ok(n, false, "tidak menolak"); } catch (e) { ok(n, e instanceof core.CloudError && (!code || e.code === code), e.code + ":" + e.message); } };

function memDb() {
  const m = new Map();
  return { m, get: async (p) => (m.has(p) ? JSON.parse(m.get(p)) : null), tx: async (fn) => fn({ get: async (p) => (m.has(p) ? JSON.parse(m.get(p)) : null), set: async (p, o) => { m.set(p, JSON.stringify(o)); } }) };
}
const save = (o) => Object.assign({ v: 10, money: 50, day: 1, cooler: [], dex: {}, stats: { casts: 0, caught: 0, earned: 0, legends: 0 }, up: { rod: 0, bait: 0, cooler: 0, boat: 0 }, profile: { name: "Uji" } }, o || {});
const J = (o) => JSON.stringify(o);
let T = 1000000;
const mk = (db) => core.makeServer(db, { now: () => T });
const A = (uid, extra) => ({ uid, token: Object.assign({ email_verified: true, firebase: { sign_in_provider: "google.com" } }, extra) });
const ownerTok = { role: "owner" };

(async () => {
  // ---- validateSave ----
  ok("v1 save sah", core.validateSave(save()).ok);
  ok("v2 koin negatif ditolak", !core.validateSave(save({ money: -1 })).ok);
  ok("v3 koin NaN/Infinity ditolak", !core.validateSave(save({ money: NaN })).ok && !core.validateSave(save({ money: Infinity })).ok);
  ok("v4 koin di atas batas ekonomi ditolak (1e9+1)", !core.validateSave(save({ money: 1e9 + 1 })).ok);
  ok("v5 koin besar boleh hanya untuk sandbox", core.validateSave(save({ money: 5e12 }), { sandbox: true }).ok && !core.validateSave(save({ money: 5e12 })).ok);
  ok("v6 UID ikan ganda ditolak", !core.validateSave(save({ cooler: [{ uid: "a", id: "nila", w: 1 }, { uid: "a", id: "nila", w: 1 }] })).ok);
  ok("v7 id ikan aneh ditolak", !core.validateSave(save({ cooler: [{ uid: "a", id: "../x", w: 1 }] })).ok);
  ok("v8 bobot tak wajar ditolak", !core.validateSave(save({ cooler: [{ uid: "a", id: "nila", w: 99999 }] })).ok);
  ok("v9 kunci terlarang (owner/role/sandbox/admin) ditolak untuk pemain biasa", ["owner", "role", "sandbox", "admin", "claims", "isOwner", "sim"].every((k) => !core.validateSave(save({ [k]: true })).ok));
  ok("v10 level up di luar batas ditolak", !core.validateSave(save({ up: { rod: 99 } })).ok && !core.validateSave(save({ up: { rod: 1.5 } })).ok);
  ok("v11 statistik negatif ditolak", !core.validateSave(save({ stats: { caught: -1 } })).ok);
  ok("v12 data terlalu besar ditolak", !core.validateSave(save({ pad: "x".repeat(core.LIMITS.MAX_BYTES) })).ok);
  ok("v13 bukan objek ditolak", !core.validateSave([]).ok && !core.validateSave(null).ok && !core.validateSave("x").ok);
  ok("v14 coolbox > batas ditolak", !core.validateSave(save({ cooler: Array.from({ length: 401 }, (_, i) => ({ uid: "u" + i, id: "nila", w: 1 })) })).ok);

  // ---- hasProgress / summarize ----
  ok("p1 pemain baru bukan progres", !core.hasProgress(save()));
  ok("p2 tangkapan = progres", core.hasProgress(save({ stats: { caught: 1 } })));
  ok("p3 ringkasan menghitung ikan mistis unik", core.summarize(save({ cooler: [{ uid: "1", id: "lentera_arwah", w: 1 }, { uid: "2", id: "lentera_arwah", w: 1 }, { uid: "3", id: "pari_bayang", w: 20 }] })).mystic === 2);
  ok("p4 ringkasan tidak memuat email", !/@/.test(J(core.summarize(save({ profile: { name: "Budi" } })))));

  // ---- baca/tulis & isolasi akun ----
  let db = memDb(), S = mk(db);
  const a = A("uidA"), b = A("uidB");
  const l0 = await S.loadSave(a);
  ok("s1 awalnya tidak ada cloud save", l0.exists === false && l0.rev === 0);
  const d1 = J(save({ money: 120, stats: { casts: 3, caught: 2, earned: 70, legends: 0 }, day: 2 }));
  const w1 = await S.writeSave(a, { data: d1, baseRev: 0, opId: "op1", deviceId: "hp" });
  ok("s2 tulis pertama rev 1", w1.ok && w1.rev === 1, w1);
  const l1 = await S.loadSave(a);
  ok("s3 baca kembali identik", l1.exists && l1.data === d1 && l1.rev === 1 && l1.summary.money === 120);
  ok("s4 akun B tidak melihat data A", (await S.loadSave(b)).exists === false);
  ok("s5 UID di payload diabaikan (tidak ada jalur baca uid lain)", (await S.loadSave(Object.assign({}, b, {}))).exists === false);
  await rej("s6 tanpa login ditolak", S.loadSave(null), "unauthenticated");
  await rej("s7 uid mengandung '/' ditolak (injeksi path)", S.loadSave({ uid: "uidA/saves/x", token: {} }), "unauthenticated");
  await rej("s8 uid kosong ditolak", S.writeSave({ uid: "" }, { data: d1, baseRev: 0, opId: "x" }), "unauthenticated");
  // B menulis tidak mengubah A
  T += 5000;
  await S.writeSave(b, { data: J(save({ money: 999 })), baseRev: 0, opId: "opB", deviceId: "x" });
  ok("s9 tulis B tidak mengubah A", (await S.loadSave(a)).summary.money === 120 && (await S.loadSave(b)).summary.money === 999);

  // ---- idempotensi, jeda, konflik, cadangan ----
  const dup = await S.writeSave(a, { data: d1, baseRev: 0, opId: "op1", deviceId: "hp" });
  ok("c1 percobaan ulang opId sama tidak menggandakan (rev tetap 1)", dup.ok && dup.duplicate && dup.rev === 1);
  T += 2000;
  const wq = await S.writeSave(A("uidQ"), { data: d1, baseRev: 0, opId: "q1" });
  await rej("c2 menulis terlalu cepat (<1,5 dtk) ditolak", S.writeSave(A("uidQ"), { data: d1, baseRev: wq.rev, opId: "q2" }), "resource-exhausted");
  T += 2000;
  const d2 = J(save({ money: 300, stats: { casts: 9, caught: 6, earned: 250, legends: 0 }, day: 3 }));
  const w2 = await S.writeSave(a, { data: d2, baseRev: 1, opId: "op2", deviceId: "hp" });
  ok("c3 tulis lanjut rev 2", w2.ok && w2.rev === 2);
  T += 2000;
  const stale = await S.writeSave(a, { data: J(save({ money: 5 })), baseRev: 1, opId: "op3", deviceId: "hp2" });
  ok("c4 baseRev usang → konflik, cloud TIDAK ditimpa", stale.conflict === true && stale.rev === 2 && (await S.loadSave(a)).data === d2, stale);
  ok("c5 konflik memuat ringkasan cloud tanpa data mentah", stale.summary && stale.summary.money === 300 && stale.data === undefined);
  T += 2000;
  const forced = await S.writeSave(a, { data: J(save({ money: 5, stats: { caught: 6, casts: 9, earned: 250, legends: 0 } })), baseRev: 1, opId: "op4", deviceId: "hp2", confirmOverwrite: true });
  ok("c6 timpa hanya dengan konfirmasi eksplisit, rev naik 3", forced.ok && forced.rev === 3);
  const bl = await S.listBackups(a);
  ok("c7 versi sebelum ditimpa tersimpan di cadangan server (rev 1 & 2)", bl.backups.length === 2 && bl.backups[0].rev === 2 && bl.backups[1].rev === 1, bl);
  const rb = await S.restoreBackup(a, { slot: bl.backups[0].rev % 5 });
  ok("c8 cadangan bisa dibaca kembali utuh (rev 2 = d2)", rb.data === d2);
  await rej("c9 slot cadangan tak valid ditolak", S.restoreBackup(a, { slot: 99 }), "invalid-argument");
  await rej("c10 akun B tak punya cadangan A", S.restoreBackup(b, { slot: 0 }), "not-found");
  for (let i = 0; i < 8; i++) { T += 2000; const cur = await S.loadSave(a); await S.writeSave(a, { data: J(save({ money: 10 + i, stats: { caught: 6 + i, casts: 9, earned: 250, legends: 0 } })), baseRev: cur.rev, opId: "loop" + i, deviceId: "hp" }); }
  ok("c11 cadangan bergilir tidak lebih dari 5", (await S.listBackups(a)).backups.length === 5);
  T += 2000;
  const missing = await S.writeSave(A("uidC"), { data: d1, baseRev: 4, opId: "m1" });
  ok("c12 baseRev>0 tetapi dokumen tidak ada → konflik 'missing' (bukan menulis diam-diam)", missing.conflict && missing.missing);
  await rej("c13 data bukan JSON ditolak", S.writeSave(A("uidD"), { data: "{bukan json", baseRev: 0, opId: "z" }), "invalid-argument");
  await rej("c14 opId wajib", S.writeSave(A("uidD"), { data: d1, baseRev: 0 }), "invalid-argument");
  await rej("c15 baseRev negatif ditolak", S.writeSave(A("uidD"), { data: d1, baseRev: -1, opId: "q" }), "invalid-argument");
  await rej("c16 save berisi kunci owner ditolak server", S.writeSave(A("uidD"), { data: J(save({ owner: true })), baseRev: 0, opId: "q2" }), "invalid-argument");
  T += 2000;
  await S.writeSave(A("uidE"), { data: J(save({ money: 100, stats: { earned: 0, caught: 5, casts: 5, legends: 0 } })), baseRev: 0, opId: "e1" });
  T += 2000;
  const sus = await S.writeSave(A("uidE"), { data: J(save({ money: 900000000, stats: { earned: 0, caught: 5, casts: 5, legends: 0 } })), baseRev: 1, opId: "e2" });
  ok("c17 lonjakan koin ditandai 'lonjakan-koin' (dicatat, bukan klaim anti-cheat)", sus.ok && sus.flags.includes("lonjakan-koin"), sus);

  // ---- Owner ----
  const reg = async (uid, active = true) => db.tx(async (t) => t.set(`owners/${uid}`, { active }));
  await reg("uidOwner");
  const own = A("uidOwner", ownerTok);
  const oa = await S.ownerAccess(own);
  ok("o1 owner sah (claim + terdaftar + terverifikasi + google) diizinkan", oa.ok && oa.role === "owner" && oa.realPayments === false);
  await rej("o2 pemain biasa tanpa claim ditolak", S.ownerAccess(A("uidA")), "permission-denied");
  await rej("o3 claim role=owner TANPA pendaftaran administrator ditolak", S.ownerAccess(A("uidFake", ownerTok)), "permission-denied");
  await rej("o4 terdaftar tetapi tanpa claim ditolak", (async () => { await reg("uidReg"); return S.ownerAccess(A("uidReg")); })(), "permission-denied");
  await rej("o5 email belum terverifikasi ditolak", S.ownerAccess({ uid: "uidOwner", token: { role: "owner", email_verified: false, firebase: { sign_in_provider: "google.com" } } }), "permission-denied");
  await rej("o6 bukan penyedia google.com ditolak", S.ownerAccess({ uid: "uidOwner", token: { role: "owner", email_verified: true, firebase: { sign_in_provider: "password" } } }), "permission-denied");
  await rej("o7 pendaftaran dicabut (active:false) ditolak", (async () => { await reg("uidRev", false); return S.ownerAccess(A("uidRev", ownerTok)); })(), "permission-denied");
  await rej("o8 tanpa login ditolak", S.ownerAccess(null), "unauthenticated");
  await rej("o9 token.role bukan string 'owner' (mis. true / 'Owner' / ['owner']) ditolak", Promise.all([S.ownerAccess(A("uidOwner", { role: true })), S.ownerAccess(A("uidOwner", { role: "Owner" })), S.ownerAccess(A("uidOwner", { role: ["owner"] }))].map((p) => p.then(() => { throw new Error("lolos"); }, (e) => { if (e.code !== "permission-denied") throw e; }))).then(() => { throw new core.CloudError("permission-denied", "ok-semua-ditolak"); }), "permission-denied");
  await rej("o10 email 'cocok' di payload tidak memberi akses", S.ownerAccess(Object.assign(A("uidA"), { email: "apa-saja@contoh.com", claims: { role: "owner" } })), "permission-denied");
  ok("o11 pesan penolakan seragam (tidak membocorkan syarat yang gagal)", await (async () => { const ms = new Set(); for (const au of [A("uidA"), A("uidFake", ownerTok), { uid: "uidOwner", token: { role: "owner", email_verified: false } }]) { try { await S.ownerAccess(au); } catch (e) { ms.add(e.message); } } return ms.size === 1; })());
  // sandbox terpisah dari ekonomi
  const sand = J(save({ money: 5e12, sandbox: true, owner: { sandbox: true } }));
  T += 2000;
  const sw = await S.ownerSandboxSave(own, { data: sand, baseRev: 0, opId: "sb1", deviceId: "hp" });
  ok("o12 owner dapat menyimpan sandbox dengan koin simulasi besar", sw.ok && sw.rev === 1, sw);
  ok("o13 sandbox tersimpan di jalur terpisah (ownerSandbox/…), bukan users/…/saves", db.m.has("ownerSandbox/uidOwner") && !db.m.has("users/uidOwner/saves/current"));
  const sl = await S.ownerSandboxLoad(own);
  ok("o14 owner membaca sandbox kembali", sl.exists && JSON.parse(sl.data).money === 5e12);
  await rej("o15 pemain biasa tidak bisa membaca sandbox", S.ownerSandboxLoad(A("uidA")), "permission-denied");
  await rej("o16 pemain biasa tidak bisa menulis sandbox", S.ownerSandboxSave(A("uidA"), { data: sand, baseRev: 0, opId: "sbx" }), "permission-denied");
  await rej("o17 save sandbox/koin simulasi TIDAK bisa masuk jalur ekonomi normal (writeSave owner pun menolak)", S.writeSave(own, { data: sand, baseRev: 0, opId: "ec1" }), "invalid-argument");
  await rej("o18 koin simulasi 5e12 ditolak di writeSave walau tanpa penanda", S.writeSave(own, { data: J(save({ money: 5e12 })), baseRev: 0, opId: "ec2" }), "invalid-argument");
  ok("o19 tidak ada fungsi transfer koin antarpemain di server", !("transfer" in S) && !Object.keys(S).some((k) => /transfer|gift|send/i.test(k)));
  ok("o20 sandbox tidak mengubah save ekonomi milik owner (jalur users/ tetap kosong)", (await S.loadSave(own)).exists === false);

  // ---- berkas repo ----
  const root = path.join(__dirname, "..");
  ok("f1 cloud/core.js identik dengan sumber server", fs.readFileSync(path.join(root, "cloud/core.js"), "utf8") === fs.readFileSync(path.join(root, "firebase/functions/lib/core.js"), "utf8"));
  const rules = fs.readFileSync(path.join(root, "firebase/firestore.rules"), "utf8");
  ok("f2 rules: tidak ada izin terbuka tanpa syarat (tanpa 'if true' / tanpa tulis anonim)", !/if\s+true/.test(rules) && !/allow\s+(write|create|update)[^;]*if\s+request\.auth\s*!=\s*null\s*;/.test(rules) && /allow delete: if false/.test(rules));
  ok("f3 rules: kepemilikan UID, email Google terverifikasi, rev+1, jeda waktu server, batas koin, tolak sisanya", /request\.auth\.uid\s*==\s*uid/.test(rules) && /email_verified\s*==\s*true/.test(rules) && /sign_in_provider\s*==\s*'google\.com'/.test(rules) && /rev\s*==\s*resource\.data\.rev\s*\+\s*1/.test(rules) && /request\.time/.test(rules) && /money\s*<=\s*cap/.test(rules) && /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/.test(rules));
  ok("f3b rules: sandbox & registri Owner hanya untuk Owner terdaftar (claim + owners/{uid}.active); klien tak bisa menulis owners", /token\.role\s*==\s*'owner'/.test(rules) && /owners\/\$\(request\.auth\.uid\)\)\.data\.active\s*==\s*true/.test(rules) && /match \/owners\/\{uid\}\s*\{\s*allow get: if request\.auth != null && request\.auth\.uid == uid;\s*allow list, write: if false;/.test(rules));
  const fbJs = fs.readFileSync(path.join(root, "cloud/adapter-firebase.js"), "utf8");
  ok("f3c adapter Firebase memakai Firestore langsung dan tidak memanggil Cloud Functions", /\[\s*"app",\s*"auth",\s*"firestore"\s*\]/.test(fbJs) && !/httpsCallable|firebase-functions-compat/.test(fbJs));
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name === ".git" || e.name === "__pycache__" ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = walk(root).filter((f) => !/\.(png|jpg|ogg|mp3|woff2?)$/.test(f));
  const leaks = files.filter((f) => { const t = fs.readFileSync(f, "utf8"); return /hanifanwahhaja/i.test(t) && !f.endsWith("unit-cloud.js"); });
  ok("f4 email pribadi Owner tidak ada di repo (kecuali pemeriksa ini)", leaks.length === 0, leaks);
  ok("f5 tidak ada private key / service account di repo", files.every((f) => !/BEGIN (RSA )?PRIVATE KEY|"private_key"\s*:/.test(fs.readFileSync(f, "utf8"))));
  console.log(`unit cloud: ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();
