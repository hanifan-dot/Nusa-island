// Rumahku Sosial (Tahap 4): undangan, TERIMA/TOLAK, senyap, blokir, cooldown, keluarkan — node tests/unit-house-social.js
const cloud = require("../firebase/functions/lib/core.js"), H = require("../house/core.js");
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) pass++; else { fail++; console.log("FAIL ", n, x === undefined ? "" : JSON.stringify(x)); } };
const rej = async (n, p, code) => { try { await p; ok(n, false, "tidak menolak"); } catch (e) { ok(n, e instanceof H.HouseError && (!code || e.code === code), e.code + ":" + e.message); } };
function memDb() { const m = new Map(), rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); return { m, get: async (p) => rd(p), tx: async (fn) => fn({ get: async (p) => rd(p), set: async (p, o) => { m.set(p, JSON.stringify(o)); } }) }; }
let T = 1000000;
const A = (uid) => ({ uid, token: { email: uid + "@rahasia.test", email_verified: true, firebase: { sign_in_provider: "google.com" } } });
const save = (name, level) => ({ v: 10, money: 50, day: 1, cooler: [], dex: {}, stats: { casts: 0, caught: 1, earned: 0, legends: 0 }, up: { rod: 0, bait: 0, cooler: 0, boat: 0 }, profile: { name },
  home: { version: 1, ownerId: "x", houseId: "h", level, furniture: [{ uid: "f1", type: "kasur", x: 1, y: 1, rot: 0 }], stored: [], decorations: [], placedFish: [], permissions: {}, updatedAt: 5 } });
let opn = 0;
const wr = (srv, uid, s) => srv.writeSave(A(uid), { data: JSON.stringify(s), baseRev: 0, opId: "op" + (++opn), deviceId: "d" }).then((r) => (T += 5000, r));
(async () => {
  const db = memDb(), house = H.makeHouseServer(db, { clock: () => T }), srv = cloud.makeServer(db, { now: () => T, house });
  const U = ["uid-budi", "uid-sari", "uid-rudi"], P = U.map(H.pidOf);
  for (const [i, u] of U.entries()) await wr(srv, u, save(["Budi", "Sari", "Rudi"][i], 2));
  await wr(srv, "uid-kosong", null === 1 ? {} : save("Kosong", 1));
  // --- undangan dasar ---
  let r = await house.homeInvite(A("uid-budi"), { pid: P[1] }); ok("undangan terkirim", r.ok && r.sent === true, r);
  let ib = await house.homeInbox(A("uid-sari")); ok("kotak masuk berisi 1 undangan dari Budi (nama dari server)", ib.invites.length === 1 && ib.invites[0].name === "Budi" && ib.invites[0].pid === P[0] && !/uid-|@/.test(JSON.stringify(ib)), ib);
  ok("pengirim tidak punya undangan", (await house.homeInbox(A("uid-budi"))).invites.length === 0);
  await rej("tidak bisa mengundang diri sendiri", house.homeInvite(A("uid-budi"), { pid: P[0] }), "invalid-argument");
  await rej("pid tak dikenal", house.homeInvite(A("uid-budi"), { pid: "ZZZZZZZZ" }), "not-found");
  await rej("pid tidak valid", house.homeInvite(A("uid-budi"), { pid: "x" }), "invalid-argument");
  await rej("tanpa login", house.homeInvite({}, { pid: P[1] }), "unauthenticated");
  r = await house.homeInvite(A("uid-budi"), { pid: P[1] }); ok("cooldown anti-spam 60 dtk", r.sent === false && r.wait > 0, r);
  ok("cooldown tidak menambah undangan", (await house.homeInbox(A("uid-sari"))).invites.length === 1);
  // --- rumah privat: tamu belum boleh masuk ---
  await rej("sebelum terima: Sari ditolak masuk (privat)", house.homeVisit(A("uid-sari"), { pid: P[0] }), "permission-denied");
  await rej("sebelum terima: pintu multiplayer menolak", house.homeAccess(A("uid-sari"), { pid: P[0] }), "permission-denied");
  // --- hak akses: pihak lain tidak bisa menjawab undangan orang ---
  const id = ib.invites[0].id;
  await rej("Rudi tidak bisa menerima undangan milik Sari", house.homeRespond(A("uid-rudi"), { id, accept: true }), "not-found");
  await rej("id undangan ngawur", house.homeRespond(A("uid-sari"), { id: "abc", accept: true }), "not-found");
  await rej("accept bukan boolean true = tolak, tapi id palsu tetap ditolak", house.homeRespond(A("uid-sari"), { id: "", accept: true }), "invalid-argument");
  // --- TERIMA ---
  r = await house.homeRespond(A("uid-sari"), { id, accept: true }); ok("terima: server memberi pid & nama pengundang", r.ok && r.accepted && r.pid === P[0] && r.name === "Budi", r);
  ok("undangan hilang dari kotak masuk", (await house.homeInbox(A("uid-sari"))).invites.length === 0);
  await rej("undangan tidak bisa dipakai dua kali", house.homeRespond(A("uid-sari"), { id, accept: true }), "not-found");
  const v = await house.homeVisit(A("uid-sari"), { pid: P[0] }); ok("setelah terima: boleh masuk rumah privat", v.ok && v.owner.name === "Budi", v);
  const ac = await house.homeAccess(A("uid-sari"), { pid: P[0] }); ok("pintu multiplayer: boleh masuk sebagai tamu", ac.role === "visitor" && ac.room === "rumah-" + P[0], ac);
  await rej("Rudi (tidak diundang) tetap ditolak", house.homeVisit(A("uid-rudi"), { pid: P[0] }), "permission-denied");
  ok("tidak ada uid/email bocor di dokumen publik", !/@rahasia|uid-sari/.test(db.m.get("homepub/" + P[0]).replace(/"uid":"uid-budi"/, "")), null);
  // --- keluarkan tamu mencabut izin ---
  await house.homeKick(A("uid-budi"), { pid: P[1] });
  await rej("setelah dikeluarkan: Sari ditolak", house.homeVisit(A("uid-sari"), { pid: P[0] }), "permission-denied");
  await rej("dikeluarkan: tidak bisa diundang lagi seketika", house.homeInvite(A("uid-budi"), { pid: P[1] }), "failed-precondition");
  // --- izin kedaluwarsa ---
  T += 61000; // lewat cooldown undangan; ban 1 jam masih berlaku
  T += 61 * 60000;
  await house.homeInvite(A("uid-budi"), { pid: P[1] }); ib = await house.homeInbox(A("uid-sari"));
  await house.homeRespond(A("uid-sari"), { id: ib.invites[0].id, accept: true });
  ok("terima lagi setelah larangan habis: masuk", (await house.homeVisit(A("uid-sari"), { pid: P[0] })).ok);
  T += 2 * 3600000 + 1000;
  await rej("izin tamu kedaluwarsa setelah 2 jam", house.homeVisit(A("uid-sari"), { pid: P[0] }), "permission-denied");
  // --- TOLAK + cooldown tolak ---
  await house.homeInvite(A("uid-rudi"), { pid: P[1] }); ib = await house.homeInbox(A("uid-sari"));
  r = await house.homeRespond(A("uid-sari"), { id: ib.invites[0].id, accept: false }); ok("tolak: tidak diterima", r.ok && r.accepted === false);
  await rej("setelah tolak: tetap tidak bisa masuk", house.homeVisit(A("uid-sari"), { pid: P[2] }), "permission-denied");
  r = await house.homeInvite(A("uid-rudi"), { pid: P[1] }); ok("setelah ditolak: cooldown 5 menit", r.sent === false && r.wait > 60, r);
  T += 5 * 60000 + 1000; r = await house.homeInvite(A("uid-rudi"), { pid: P[1] }); ok("cooldown tolak berakhir", r.sent === true);
  // --- kedaluwarsa undangan ---
  T += 6 * 60000; ok("undangan kedaluwarsa 5 menit", (await house.homeInbox(A("uid-sari"))).invites.length === 0);
  await rej("tidak bisa menerima undangan kedaluwarsa", house.homeRespond(A("uid-sari"), { id: "x".repeat(10), accept: true }), "not-found");
  // --- senyap ---
  r = await house.homePrefs(A("uid-sari"), { mute: true }); ok("senyap aktif", r.mute === true);
  ok("pengaturan memuat senyap", (await house.homeSettings(A("uid-sari"))).mute === true);
  r = await house.homeInvite(A("uid-budi"), { pid: P[1] }); ok("disenyapkan: tampak terkirim (tidak bocor)", r.ok && r.sent === true, r);
  ok("disenyapkan: tidak masuk kotak", (await house.homeInbox(A("uid-sari"))).invites.length === 0);
  await house.homePrefs(A("uid-sari"), { mute: false });
  // --- blokir ---
  T += 61000; r = await house.homePrefs(A("uid-sari"), { block: P[0], on: true }); ok("blokir Budi", r.blocks.length === 1 && r.blocks[0].name === "Budi" && !/uid-/.test(JSON.stringify(r)), r);
  r = await house.homeInvite(A("uid-budi"), { pid: P[1] }); ok("diblokir: undangan tampak terkirim tapi tak sampai", r.sent === true && (await house.homeInbox(A("uid-sari"))).invites.length === 0);
  await rej("pemblokir tidak bisa mengundang yang diblokir", house.homeInvite(A("uid-sari"), { pid: P[0] }), "failed-precondition");
  await house.homePrefs(A("uid-budi"), { block: P[2], on: true });
  await rej("diblokir pemilik: Rudi ditolak masuk walau diizinkan", (async () => { await house.homeSetPrivacy(A("uid-budi"), { mode: "public" }); return house.homeVisit(A("uid-rudi"), { pid: P[0] }); })(), "permission-denied");
  r = await house.homePrefs(A("uid-sari"), { block: P[0], on: false }); ok("buka blokir", r.blocks.length === 0);
  await rej("blokir diri sendiri", house.homePrefs(A("uid-sari"), { block: P[1], on: true }), "invalid-argument");
  await rej("prefs kosong", house.homePrefs(A("uid-sari"), {}), "invalid-argument");
  // --- laju ---
  let ex = 0; for (let i = 0; i < 12; i++) { try { await house.homeInvite(A("uid-rudi"), { pid: P[0] }); } catch (e) { if (e.code === "resource-exhausted") ex++; } }
  ok("laju undangan dibatasi per menit", ex > 0, ex);
  // --- Cloud Save & ekonomi tidak tersentuh ---
  const keys = [...db.m.keys()].filter((k) => !/^(homepub|homeinbox|homeidx|users)\//.test(k)); ok("tidak menulis koleksi lain (koin/kolam/inventaris)", keys.length === 0, keys);
  const sv = JSON.parse(db.m.get("users/uid-sari/saves/current")); ok("Cloud Save pemain tidak berubah oleh fitur sosial", !/blocks|guests|mute|homeinbox/.test(JSON.stringify(sv)));
  console.log(`unit-house-social: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
