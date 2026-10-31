// Kunjungi Rumah Teman: uji inti server — node tests/unit-house.js
const cloud = require("../firebase/functions/lib/core.js"), H = require("../house/core.js");
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) pass++; else { fail++; console.log("FAIL ", n, x === undefined ? "" : JSON.stringify(x)); } };
const rej = async (n, p, code) => { try { await p; ok(n, false, "tidak menolak"); } catch (e) { ok(n, e instanceof H.HouseError && (!code || e.code === code), e.code + ":" + e.message); } };
function memDb() {
  const m = new Map(), gets = { n: 0 }, sets = [];
  const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null);
  return { m, gets, sets, get: async (p) => { gets.n++; return rd(p); }, tx: async (fn) => fn({ get: async (p) => { gets.n++; return rd(p); }, set: async (p, o) => { sets.push(p); m.set(p, JSON.stringify(o)); } }) };
}
let T = 1000000;
const A = (uid) => ({ uid, token: { email: uid + "@rahasia.test", email_verified: true, firebase: { sign_in_provider: "google.com" } } });
const home = (level, extra) => Object.assign({ version: 1, ownerId: "local-x", houseId: "h1", level, furniture: [{ uid: "f1", type: "kasur", x: 1, y: 1, rot: 0 }, { uid: "f2", type: "akuariumKecil", x: 3, y: 1, rot: 1, water: "tawar" }], stored: [], decorations: ["lampu"], placedFish: [{ uid: "p1", id: "nila", w: 2.5, aq: "f2" }], permissions: {}, updatedAt: 5 }, extra);
const save = (name, level, extra) => Object.assign({ v: 10, money: 50, day: 1, cooler: [], dex: {}, stats: { casts: 0, caught: 1, earned: 0, legends: 0 }, up: { rod: 0, bait: 0, cooler: 0, boat: 0 }, profile: { name }, home: home(level) }, extra);
const J = (o) => JSON.stringify(o);
let opn = 0;
const wr = (srv, uid, s) => srv.writeSave(A(uid), { data: J(s), baseRev: 0, opId: "op" + (++opn), deviceId: "d" }).then((r) => (T += 5000, r));

(async () => {
  // ---- identitas publik ----
  const p1 = H.pidOf("uid-budi"), p2 = H.pidOf("uid-sari");
  ok("pid 8 huruf aman", H.PID_RE.test(p1) && H.PID_RE.test(p2) && p1 !== p2);
  ok("pid stabil", H.pidOf("uid-budi") === p1);
  ok("pid tidak memuat uid", !p1.toLowerCase().includes("budi") && !/uid/i.test(p1));
  const ids = new Set(); for (let i = 0; i < 5000; i++) ids.add(H.pidOf("u" + i)); ok("pid tanpa tabrakan di 5000 akun", ids.size === 5000);
  ok("nama dibersihkan", H.cleanName("  <b>Budi</b>\n  X ") === "bbudib X" || H.cleanName("  <b>Budi</b>\n  X ").length <= 14);
  ok("nama kosong -> Pemancing", H.cleanName("") === "Pemancing" && H.cleanName("<>") === "Pemancing");
  ok("bucket", H.bucketOf("budi") === "bu" && H.bucketOf("a") === "a_");

  // ---- salinan publik ----
  const snap = H.snapshotOf(save("Budi", 3));
  ok("snapshot: level, perabot, ikan, dekor", snap.level === 3 && snap.furn.length === 2 && snap.fish.length === 1 && snap.deco[0] === "lampu" && snap.name === "Budi");
  ok("snapshot tanpa email/uid/saldo", !/rahasia|money|ownerId|houseId|local-x/.test(J(snap)));
  ok("snapshot menolak tipe aneh", H.snapshotOf(save("A", 2, { home: home(2, { furniture: [{ uid: "z", type: "../x", x: 1, y: 1 }, { uid: "y", type: "kasur", x: "a", y: 1 }] }) })).furn.length === 0);
  ok("snapshot tanpa rumah = null", H.snapshotOf({ profile: { name: "X" } }) === null);

  // ---- alur lengkap lewat Cloud Save (publish dipasang di writeSave) ----
  const db = memDb(), house = H.makeHouseServer(db, { clock: () => T });
  const srv = cloud.makeServer(db, { now: () => T, house });
  await wr(srv, "uid-budi", save("Budi", 3));
  await wr(srv, "uid-sari", save("Sari", 5));
  await wr(srv, "uid-budi2", save("Budi", 1));       // nama kembar
  await wr(srv, "uid-pemula", save("Pemula", 1));
  ok("homepub tersimpan untuk pemilik", !!db.m.get("homepub/" + p1));
  ok("simpanan memuat pubHash", !!JSON.parse(db.m.get("users/uid-budi/saves/current")).pubHash);

  let r = await house.homeSearch(A("uid-sari"), { q: "budi" });
  ok("cari 'budi' -> dua akun kembar", r.results.length === 2, r);
  ok("hasil: nama, level, id pembeda, tanpa uid/email", r.results.every((x) => x.name === "Budi" && x.sid && x.level && !("uid" in x)) && !/uid-|rahasia|@/.test(J(r)), r);
  ok("id pembeda beda untuk nama kembar", r.results[0].sid !== r.results[1].sid);
  ok("urut: level tertinggi dulu", r.results[0].level === 3);
  r = await house.homeSearch(A("uid-sari"), { q: "BU" }); ok("awalan tak peka huruf besar", r.results.length === 2);
  r = await house.homeSearch(A("uid-sari"), { q: "zzzz" }); ok("tidak ditemukan -> kosong", r.results.length === 0);
  r = await house.homeSearch(A("uid-sari"), { q: "sari" }); ok("tidak menemukan diri sendiri", r.results.length === 0);
  await rej("cari <2 huruf ditolak", house.homeSearch(A("uid-sari"), { q: "b" }), "invalid-argument");
  await rej("cari tanpa login ditolak", house.homeSearch(null, { q: "budi" }), "unauthenticated");
  await rej("cari tanpa uid ditolak", house.homeSearch({}, { q: "budi" }), "unauthenticated");
  r = await house.homeSearch(A("uid-sari"), { q: "%bu.*[" }); ok("karakter regex tidak merusak", Array.isArray(r.results));
  await rej("kueri hanya simbol -> ditolak (bukan 'Pemancing')", house.homeSearch(A("uid-sari"), { q: "<>%%" }), "invalid-argument");

  // ---- kunjungi ----
  const v = await house.homeVisit(A("uid-sari"), { pid: p1 });
  ok("kunjungi: rumah asli Budi level 3", v.ok && v.owner.name === "Budi" && v.home.level === 3 && v.home.furn.length === 2 && v.room === "rumah-" + p1);
  ok("kunjungi: tanpa email/uid/saldo", !/uid-|rahasia|@|money/.test(J(v)));
  ok("pemilik tidak berubah (level/save tetap)", JSON.parse(JSON.parse(db.m.get("users/uid-budi/saves/current")).data).home.level === 3);
  await rej("tidak ada pid -> not-found", house.homeVisit(A("uid-sari"), { pid: "AAAAAAAA" }), "not-found");
  await rej("pid ngawur ditolak", house.homeVisit(A("uid-sari"), { pid: "../users/uid-budi" }), "invalid-argument");
  await rej("pid kosong ditolak", house.homeVisit(A("uid-sari"), {}), "invalid-argument");
  await rej("rumah sendiri bukan kunjungan", house.homeVisit(A("uid-budi"), { pid: p1 }), "failed-precondition");
  await rej("tanpa login ditolak", house.homeVisit(null, { pid: p1 }), "unauthenticated");
  ok("klien tidak bisa menyuntik ownerId/uid", (await house.homeVisit(A("uid-sari"), { pid: p1, ownerId: "uid-sari", uid: "uid-sari", houseId: "x" })).owner.pid === p1);

  // ---- akses multiplayer ----
  let ac = await house.homeAccess(A("uid-budi"), { pid: p1 }); ok("pemilik masuk sebagai owner", ac.role === "owner" && ac.room === "rumah-" + p1);
  ac = await house.homeAccess(A("uid-sari"), { pid: p1 }); ok("tamu masuk sebagai visitor, me = pid tamu", ac.role === "visitor" && ac.me === p2);
  ok("pemilik offline tetap bisa dikunjungi (data dari server, bukan koneksi)", (await house.homeVisit(A("uid-pemula"), { pid: p1 })).ok);
  await rej("akses ke pid tak dikenal", house.homeAccess(A("uid-sari"), { pid: "AAAAAAAA" }), "not-found");
  await rej("akses tanpa login", house.homeAccess(null, { pid: p1 }), "unauthenticated");

  // ---- privasi ----
  let st = await house.homeSettings(A("uid-budi")); ok("pengaturan default publik", st.privacy === "public" && st.registered && st.pid === p1);
  await rej("mode ngawur ditolak", house.homeSetPrivacy(A("uid-budi"), { mode: "admin" }), "invalid-argument");
  await house.homeSetPrivacy(A("uid-budi"), { mode: "private" });
  await rej("rumah privat: pengunjung ditolak (visit)", house.homeVisit(A("uid-sari"), { pid: p1 }), "permission-denied");
  await rej("rumah privat: pengunjung ditolak (access)", house.homeAccess(A("uid-sari"), { pid: p1 }), "permission-denied");
  ok("pemilik privat tetap masuk", (await house.homeAccess(A("uid-budi"), { pid: p1 })).role === "owner");
  r = await house.homeSearch(A("uid-sari"), { q: "budi" }); ok("pencarian menandai privat", r.results.find((x) => x.pid === p1).priv === 1);
  await house.homeAllow(A("uid-budi"), { pid: p2, on: true });
  ok("diizinkan -> boleh masuk", (await house.homeVisit(A("uid-sari"), { pid: p1 })).ok);
  await rej("yang tidak diizinkan tetap ditolak", house.homeVisit(A("uid-pemula"), { pid: p1 }), "permission-denied");
  await house.homeAllow(A("uid-budi"), { pid: p2, on: false });
  await rej("izin dicabut -> ditolak", house.homeVisit(A("uid-sari"), { pid: p1 }), "permission-denied");
  await rej("izinkan pid tak terdaftar", house.homeAllow(A("uid-budi"), { pid: "AAAAAAAA" }), "not-found");
  await house.homeSetPrivacy(A("uid-budi"), { mode: "public" });
  ok("publik lagi -> masuk", (await house.homeVisit(A("uid-sari"), { pid: p1 })).ok);

  // ---- kick ----
  await house.homeKick(A("uid-budi"), { pid: p2 });
  await rej("dikeluarkan -> tak bisa masuk lagi (visit)", house.homeVisit(A("uid-sari"), { pid: p1 }), "permission-denied");
  await rej("dikeluarkan -> tak bisa masuk lagi (access)", house.homeAccess(A("uid-sari"), { pid: p1 }), "permission-denied");
  ok("tamu lain tidak terdampak", (await house.homeVisit(A("uid-pemula"), { pid: p1 })).ok);
  T += 61 * 60000; ok("larangan berakhir setelah 1 jam", (await house.homeVisit(A("uid-sari"), { pid: p1 })).ok);
  // Tamu tidak bisa meng-kick/mengubah rumah orang: setiap penulisan memakai pid dari token pemanggil
  const before = db.m.get("homepub/" + p1);
  await house.homeKick(A("uid-sari"), { pid: p1 }).catch(() => {}); await house.homeSetPrivacy(A("uid-sari"), { mode: "private" }); await house.homeAllow(A("uid-sari"), { pid: p2 }).catch(() => {});
  ok("penulisan tamu tak menyentuh dokumen rumah Budi", db.m.get("homepub/" + p1) === before);

  // ---- perubahan pemilik tersinkron; hemat tulis ----
  await wr(srv, "uid-budi", Object.assign(save("Budi", 3), { money: 99 }));   // rumah tak berubah
  // baseRev berubah -> conflict; gunakan rev benar
  const cur = JSON.parse(db.m.get("users/uid-budi/saves/current"));
  const nSets = db.sets.length;
  const rr = await srv.writeSave(A("uid-budi"), { data: J(save("Budi", 3, { money: 120 })), baseRev: cur.rev, opId: "opX", deviceId: "d" }); T += 5000;
  ok("simpan tanpa perubahan rumah tidak menulis homepub/homeidx", rr.ok && db.sets.slice(nSets).every((p) => !p.startsWith("home")), db.sets.slice(nSets));
  const cur2 = JSON.parse(db.m.get("users/uid-budi/saves/current"));
  await srv.writeSave(A("uid-budi"), { data: J(save("Budi", 4)), baseRev: cur2.rev, opId: "opY", deviceId: "d" }); T += 5000;
  ok("naik level -> salinan publik ikut berubah", (await house.homeVisit(A("uid-sari"), { pid: p1 })).home.level === 4);
  const cur3 = JSON.parse(db.m.get("users/uid-budi/saves/current"));
  await srv.writeSave(A("uid-budi"), { data: J(save("Budi Baru", 4)), baseRev: cur3.rev, opId: "opZ", deviceId: "d" }); T += 5000;
  r = await house.homeSearch(A("uid-sari"), { q: "budi b" }); ok("ganti nama: indeks ikut, tidak ganda", r.results.length === 1 && r.results[0].name === "Budi Baru", r);
  r = await house.homeSearch(A("uid-sari"), { q: "budi" }); ok("nama lama (Budi kembar) tetap 2 akun berbeda", r.results.length === 2, r);
  ok("pengaturan privasi bertahan lewat simpan ulang", (await house.homeSettings(A("uid-budi"))).privacy === "public");
  await house.homeSetPrivacy(A("uid-budi"), { mode: "private" });
  const cur4 = JSON.parse(db.m.get("users/uid-budi/saves/current"));
  await srv.writeSave(A("uid-budi"), { data: J(save("Budi Baru", 5)), baseRev: cur4.rev, opId: "opW", deviceId: "d" }); T += 5000;
  ok("simpan ulang tidak membuka rumah privat", (await house.homeSettings(A("uid-budi"))).privacy === "private");
  await rej("... dan tamu tetap ditolak", house.homeVisit(A("uid-pemula"), { pid: p1 }), "permission-denied");

  // ---- kegagalan publish tidak menggagalkan simpanan ----
  const bad = cloud.makeServer(memDb(), { now: () => T, house: { publish: async () => { throw new Error("boom"); } } });
  const rb = await wr(bad, "uid-x", save("X", 1)); ok("publish error tidak menggagalkan simpanan", rb.ok === true);

  // ---- batas laju ----
  let limited = 0; for (let i = 0; i < 40; i++) { try { await house.homeSearch(A("uid-spam"), { q: "budi" }); } catch (e) { if (e.code === "resource-exhausted") limited++; } }
  ok("pembatas laju pencarian", limited > 0);

  console.log(`unit-house: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log("CRASH", e); process.exit(1); });
