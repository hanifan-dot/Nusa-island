// Rumahku Sosial (Tahap 4, alur BENAR): pemohon MINTA IZIN berkunjung → pemilik TERIMA/TOLAK; senyap, blokir, cooldown, kick, kedaluwarsa — node tests/unit-house-social.js
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
  // Budi (pemohon) minta izin berkunjung ke rumah Rudi (pemilik). Rumah Rudi privat.
  const [B, S_, R_] = [A("uid-budi"), A("uid-sari"), A("uid-rudi")];
  let r = await house.homeVisitRequest(B, { pid: P[2] }); ok("Budi → Rudi: permintaan terkirim", r.ok && r.sent === true, r);
  let ib = await house.homeInbox(R_); ok("Rudi menerima permintaan dari Budi (nama dari server, tanpa uid/email)", ib.requests.length === 1 && ib.requests[0].name === "Budi" && ib.requests[0].pid === P[0] && !/uid-|@/.test(JSON.stringify(ib)), ib);
  ok("Budi (pemohon) tidak punya permintaan masuk & belum ada jawaban", (await house.homeInbox(B)).requests.length === 0 && (await house.homeInbox(B)).answers.length === 0);
  await rej("tidak bisa minta ke diri sendiri", house.homeVisitRequest(B, { pid: P[0] }), "invalid-argument");
  await rej("pid tak dikenal", house.homeVisitRequest(B, { pid: "ZZZZZZZZ" }), "not-found");
  await rej("pid tidak valid", house.homeVisitRequest(B, { pid: "x" }), "invalid-argument");
  await rej("tanpa login", house.homeVisitRequest({}, { pid: P[2] }), "unauthenticated");
  r = await house.homeVisitRequest(B, { pid: P[2] }); ok("cooldown anti-spam 60 dtk", r.sent === false && r.wait > 0, r);
  ok("cooldown tidak menambah permintaan", (await house.homeInbox(R_)).requests.length === 1);
  // sebelum diterima: Budi belum boleh masuk; tidak ada izin terbalik (Rudi juga tidak boleh masuk rumah Budi)
  await rej("sebelum terima: Budi ditolak masuk rumah Rudi (privat)", house.homeVisit(B, { pid: P[2] }), "permission-denied");
  await rej("sebelum terima: pintu multiplayer menolak Budi", house.homeAccess(B, { pid: P[2] }), "permission-denied");
  // hak jawab: hanya pemilik
  const id = ib.requests[0].id;
  await rej("Sari tidak bisa menjawab permintaan milik Rudi", house.homeVisitRespond(S_, { id, accept: true }), "not-found");
  await rej("Budi (pemohon) tidak bisa menerima sendiri permintaannya", house.homeVisitRespond(B, { id, accept: true }), "not-found");
  await rej("id ngawur", house.homeVisitRespond(R_, { id: "abc", accept: true }), "not-found");
  await rej("id kosong", house.homeVisitRespond(R_, { id: "", accept: true }), "invalid-argument");
  // TERIMA oleh Rudi
  r = await house.homeVisitRespond(R_, { id, accept: true }); ok("Rudi TERIMA: server mengonfirmasi", r.ok && r.accepted && r.pid === P[0] && r.name === "Budi", r);
  ok("permintaan hilang dari kotak Rudi", (await house.homeInbox(R_)).requests.length === 0);
  await rej("permintaan sekali pakai (tidak bisa diterima dua kali)", house.homeVisitRespond(R_, { id, accept: true }), "not-found");
  const ans = (await house.homeInbox(B)).answers; ok("Budi mendapat jawaban DITERIMA dari Rudi (tanpa teleport otomatis)", ans.length === 1 && ans[0].ok === true && ans[0].pid === P[2] && ans[0].name === "Rudi" && !/uid-|@/.test(JSON.stringify(ans)), ans);
  const v = await house.homeVisit(B, { pid: P[2] }); ok("Budi boleh masuk rumah Rudi setelah diterima", v.ok && v.owner.name === "Rudi", v);
  const ac = await house.homeAccess(B, { pid: P[2] }); ok("pintu multiplayer: Budi masuk sebagai tamu rumah Rudi (Rudi tetap pemilik)", ac.role === "visitor" && ac.room === "rumah-" + P[2], ac);
  await rej("tidak ada izin terbalik: Rudi tetap tidak boleh masuk rumah Budi (privat)", house.homeVisit(R_, { pid: P[0] }), "permission-denied");
  await rej("Sari (tidak diminta) tetap ditolak masuk rumah Rudi", house.homeVisit(S_, { pid: P[2] }), "permission-denied");
  r = await house.homeVisitRequest(B, { pid: P[2] }); ok("izin masih berlaku: tidak perlu minta lagi", r.sent === false && r.approved === true && r.pid === P[2], r);
  ok("tidak ada uid/email bocor di dokumen publik", !/@rahasia|uid-budi/.test(db.m.get("homepub/" + P[2]).replace(/"uid":"uid-rudi"/, "")), null);
  // KICK oleh pemilik mencabut izin
  await house.homeKick(R_, { pid: P[0] });
  await rej("setelah di-kick: Budi ditolak masuk", house.homeVisit(B, { pid: P[2] }), "permission-denied");
  await rej("di-kick: tidak bisa minta lagi seketika", house.homeVisitRequest(B, { pid: P[2] }), "failed-precondition");
  // setelah larangan habis: minta lagi, diterima, lalu kedaluwarsa 2 jam
  T += 61 * 60000 + 1000;
  await house.homeVisitRequest(B, { pid: P[2] }); ib = await house.homeInbox(R_);
  await house.homeVisitRespond(R_, { id: ib.requests[0].id, accept: true });
  ok("setelah larangan habis & diterima: masuk", (await house.homeVisit(B, { pid: P[2] })).ok);
  T += 2 * 3600000 + 1000;
  await rej("izin tamu kedaluwarsa setelah 2 jam", house.homeVisit(B, { pid: P[2] }), "permission-denied");
  // TOLAK
  await house.homeVisitRequest(B, { pid: P[2] }); ib = await house.homeInbox(R_);
  r = await house.homeVisitRespond(R_, { id: ib.requests[0].id, accept: false }); ok("Rudi TOLAK: tidak diterima", r.ok && r.accepted === false);
  const an2 = (await house.homeInbox(B)).answers; ok("Budi melihat jawaban ditolak", an2.some((a) => a.ok === false && a.pid === P[2]), an2);
  await rej("setelah ditolak: Budi tetap tidak bisa masuk", house.homeVisit(B, { pid: P[2] }), "permission-denied");
  r = await house.homeVisitRequest(B, { pid: P[2] }); ok("setelah ditolak: cooldown 5 menit", r.sent === false && r.wait > 60, r);
  T += 5 * 60000 + 1000; r = await house.homeVisitRequest(B, { pid: P[2] }); ok("cooldown tolak berakhir", r.sent === true);
  // permintaan & jawaban kedaluwarsa
  T += 6 * 60000; ok("permintaan kedaluwarsa 5 menit", (await house.homeInbox(R_)).requests.length === 0);
  ok("jawaban kedaluwarsa 10 menit", (await house.homeInbox(B)).answers.length === 0);
  await rej("tidak bisa menerima permintaan kedaluwarsa", house.homeVisitRespond(R_, { id: "x".repeat(10), accept: true }), "not-found");
  // SENYAP (pemilik)
  r = await house.homePrefs(R_, { mute: true }); ok("senyap aktif", r.mute === true);
  ok("pengaturan memuat senyap", (await house.homeSettings(R_)).mute === true);
  r = await house.homeVisitRequest(B, { pid: P[2] }); ok("pemilik senyap: tampak terkirim (tidak bocor)", r.ok && r.sent === true, r);
  ok("pemilik senyap: tidak masuk kotak", (await house.homeInbox(R_)).requests.length === 0);
  await house.homePrefs(R_, { mute: false });
  // BLOKIR
  T += 61000; r = await house.homePrefs(R_, { block: P[0], on: true }); ok("Rudi blokir Budi", r.blocks.length === 1 && r.blocks[0].name === "Budi" && !/uid-/.test(JSON.stringify(r)), r);
  r = await house.homeVisitRequest(B, { pid: P[2] }); ok("diblokir pemilik: permintaan tampak terkirim tapi tak sampai", r.sent === true && (await house.homeInbox(R_)).requests.length === 0);
  await rej("Rudi (pemblokir) tidak bisa menjadi pemohon ke yang diblokir", house.homeVisitRequest(R_, { pid: P[0] }), "failed-precondition");
  await rej("diblokir pemilik: Budi ditolak masuk walau rumah publik", (async () => { await house.homeSetPrivacy(R_, { mode: "public" }); return house.homeVisit(B, { pid: P[2] }); })(), "permission-denied");
  r = await house.homePrefs(R_, { block: P[0], on: false }); ok("buka blokir", r.blocks.length === 0);
  await rej("blokir diri sendiri", house.homePrefs(R_, { block: P[2], on: true }), "invalid-argument");
  await rej("prefs kosong", house.homePrefs(R_, {}), "invalid-argument");
  // pemohon memblokir pemilik → tidak bisa meminta
  await house.homePrefs(B, { block: P[2], on: true });
  await rej("pemohon yang memblokir tidak bisa minta", house.homeVisitRequest(B, { pid: P[2] }), "failed-precondition");
  await house.homePrefs(B, { block: P[2], on: false });
  // blokir mencabut tamu yang sudah diterima
  await house.homeSetPrivacy(R_, { mode: "private" }); T += 6 * 60000;
  await house.homeVisitRequest(S_, { pid: P[2] }); ib = await house.homeInbox(R_); await house.homeVisitRespond(R_, { id: ib.requests[0].id, accept: true });
  ok("Sari diterima → masuk", (await house.homeVisit(S_, { pid: P[2] })).ok);
  await house.homePrefs(R_, { block: P[1], on: true });
  await rej("diblokir setelah diterima: izin tamu dicabut", house.homeVisit(S_, { pid: P[2] }), "permission-denied");
  // laju
  let ex = 0; for (let i = 0; i < 12; i++) { try { await house.homeVisitRequest(R_, { pid: P[0] }); } catch (e) { if (e.code === "resource-exhausted") ex++; } }
  ok("laju permintaan dibatasi per menit", ex > 0, ex);
  const keys = [...db.m.keys()].filter((k) => !/^(homepub|homeinbox|homeidx|users)\//.test(k)); ok("tidak menulis koleksi lain (koin/kolam/inventaris)", keys.length === 0, keys);
  const sv = JSON.parse(db.m.get("users/uid-sari/saves/current")); ok("Cloud Save pemain tidak berubah oleh fitur sosial", !/blocks|guests|mute|homeinbox/.test(JSON.stringify(sv)));
  console.log(`unit-house-social: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
