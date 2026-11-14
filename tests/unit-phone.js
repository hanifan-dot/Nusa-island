// Uji NusaPhone (Ide 07) — inti murni (phone/core.js) + bendera tampilan PHONE di ruang multiplayer (mp/room-core.js). Tanpa jaringan: node tests/unit-phone.js
const C = require("../phone/core.js"), P = require("../mp/proto.js"), { Room } = require("../mp/room-core.js");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("GAGAL:", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);

// ---- jam & tanggal ----
eq(C.clock(6), "06:00", "jam 6"); eq(C.clock(13.5), "13:30", "13.5 → 13:30"); eq(C.clock(23.999), "23:59", "23.999 → 23:59 (tak pernah 60)"); eq(C.clock(24), "00:00", "24 → 00:00"); eq(C.clock(-1), "23:00", "negatif membungkus"); eq(C.clock(NaN), "00:00", "NaN aman"); eq(C.clock("x"), "00:00", "teks aman");
eq(C.dateLine(new Date(2026, 10, 14)), "Sabtu, 14 November", "tanggal Indonesia"); eq(C.dateLine(null), "Kamis, 1 Januari", "tanggal rusak → nilai aman (tidak melempar)");
// ---- aplikasi ----
eq(C.APP_IDS, ["klippy", "nusachat", "playgame", "dompet", "peta", "pengaturan"], "enam aplikasi sesuai permintaan, urutan layar utama");
ok(C.APPS.filter((a) => a.net).map((a) => a.id).join() === "klippy,nusachat,dompet", "aplikasi jaringan = Klippy, NusaChat, Dompet"); ok(C.appUsable("peta", false) && C.appUsable("pengaturan", false) && C.appUsable("playgame", false), "aplikasi lokal tetap bisa saat putus");
ok(!C.appUsable("klippy", false) && !C.appUsable("nusachat", false) && !C.appUsable("dompet", false), "aplikasi jaringan TERKUNCI saat putus"); ok(C.appUsable("klippy", true), "terbuka saat tersambung"); ok(!C.appUsable("tidakada", true), "id tak dikenal tak bisa dipakai");
// ---- model & kepemilikan ----
eq(C.MODEL_IDS, ["dasar", "s1", "s2", "s3", "s4", "s5", "crown17"], "ponsel dasar + TEPAT enam model toko (kontrak Owner)");
eq(C.MODEL_IDS.filter((i) => i !== "dasar").length, 6, "enam model"); eq(C.MODEL_IDS.filter((i) => C.MODELS[i].kind === "koin").length, 2, "dua model dibeli koin bermain"); eq(C.MODEL_IDS.filter((i) => C.MODELS[i].kind === "premium").length, 4, "empat model premium");
eq(new Set(C.MODEL_IDS.filter((i) => i !== "dasar").map((i) => C.MODELS[i].line)).size, 4, "enam model dalam empat lini"); eq(Object.keys(C.LINES), ["A", "B", "C", "D"], "empat lini");
eq(C.MODELS.crown17.name, "Nusa Crown 17", "hanya Nusa Crown 17 yang bernama resmi"); eq(C.MODEL_IDS.filter((i) => !/^Model Sementara \d$/.test(C.MODELS[i].name) && i !== "dasar" && i !== "crown17").length, 0, "lima model lain = label sementara (tidak mengarang nama)");
eq(C.MODEL_IDS.every((i) => !("price" in C.MODELS[i]) && !("harga" in C.MODELS[i])), true, "klien tidak menyimpan harga (milik server)"); eq(C.CORE_GB, 3, "aplikasi inti 3 GB");
eq(C.MODEL_IDS.every((i) => C.MODELS[i].gb > C.CORE_GB), true, "kapasitas usulan > inti"); eq(C.MODEL_IDS.map((i) => C.MODELS[i].gb).every((g, k, a) => k === 0 || g > a[k - 1]), true, "usulan kapasitas naik per model");
eq(new Set(C.MODEL_IDS.map((i) => C.MODELS[i].body)).size, 7, "tiap model berwarna berbeda"); eq(new Set(C.MODEL_IDS.map((i) => C.MODELS[i].aspect + "/" + C.MODELS[i].radius + "/" + C.MODELS[i].notch)).size, 7, "tiap model berbentuk berbeda");
eq(C.cleanOwned(undefined), ["dasar"], "tanpa data: tetap punya dasar"); eq(C.cleanOwned(["s3", "x", "s3", 5]), ["dasar", "s3"], "id tak dikenal & duplikat dibuang; dasar selalu ada"); eq(C.cleanOwned(["crown17"]).includes("dasar"), true, "dasar tak bisa hilang (komunikasi tidak boleh terkunci)");
eq(C.cleanUse("s3", ["dasar"]), "dasar", "casing yang tidak dimiliki ditolak"); eq(C.cleanUse("s3", ["dasar", "s3"]), "s3", "casing dimiliki dipakai"); eq(C.modelOf("zzz").id, "dasar", "model tak dikenal → dasar");
// ---- tema & gerak ----
eq([C.theme("auto", false), C.theme("auto", true), C.theme("day", true), C.theme("night", false), C.theme("?", true)], ["day", "night", "day", "night", "night"], "tema");
eq([C.reduced("auto", true), C.reduced("auto", false), C.reduced("off", false), C.reduced("on", true)], [true, false, true, false], "reduced motion mengikuti sistem; 'Mati' memadamkan; 'Hidup' menyalakan");
eq(C.cleanPrefs({ theme: "x", motion: 3, casing: "zz" }), { theme: "auto", motion: "auto", casing: "dasar" }, "pref rusak → bawaan"); eq(C.cleanPrefs(null).casing, "dasar", "null aman");
// ---- navigasi ----
let s = C.NAV0; eq(s, { screen: "lock", app: null, sub: 0 }, "mulai di layar kunci");
eq(C.nav(s, "home"), s, "Home di layar kunci tidak berbuat apa-apa"); eq(C.nav(s, "back"), s, "Kembali di layar kunci tidak berbuat apa-apa"); eq(C.nav(s, "open", "klippy"), s, "tidak bisa membuka aplikasi sebelum membuka kunci");
s = C.nav(s, "unlock"); eq(s.screen, "home", "buka kunci → home"); eq(C.nav(s, "back"), s, "Kembali di home: tidak berbuat apa-apa"); eq(C.nav(s, "open", "bukan-app"), s, "aplikasi tak dikenal ditolak");
s = C.nav(s, "open", "nusachat"); eq(s, { screen: "app", app: "nusachat", sub: 0 }, "buka aplikasi"); s = C.nav(s, "deeper"); eq(s.sub, 1, "layar dalam"); s = C.nav(s, "back"); eq(s, { screen: "app", app: "nusachat", sub: 0 }, "Kembali: satu langkah"); s = C.nav(s, "back"); eq(s.screen, "home", "Kembali: ke home");
s = C.nav(C.nav(s, "open", "peta"), "home"); eq(s.screen, "home", "Home dari dalam aplikasi"); eq(C.nav(s, "lock"), C.NAV0, "kunci ulang");
// ---- notifikasi ----
let n = C.noteAdd([], { id: "a", title: "T", text: "x" }, 5); eq(n.length, 1, "tambah"); eq(C.noteAdd(n, { id: "a", title: "lain" }, 6).length, 1, "id sama tidak ganda"); eq(C.noteAdd(n, { id: "", title: "x" }, 6).length, 1, "id kosong ditolak"); eq(C.noteAdd(n, null, 6).length, 1, "null aman");
let big = []; for (let i = 0; i < 40; i++) big = C.noteAdd(big, { id: "n" + i }, i); eq(big.length, C.NOTE_MAX, "antrean dibatasi"); eq(big[0].id, "n39", "terbaru di atas");
eq(C.noteUnread(n), 1, "belum dibaca"); eq(C.noteUnread(C.noteReadAll(n)), 0, "semua dibaca"); eq(C.noteAdd([], { id: "z", app: "tidak", text: "y".repeat(500) }, 1)[0].text.length, 120, "teks dipangkas"); eq(C.noteAdd([], { id: "z", app: "tidak" }, 1)[0].app, null, "app tak dikenal → null");
// ---- tautan ----
ok(C.linkOk({ online: true, api: true, user: true, failed: false }), "semua baik → tersambung"); for (const k of ["online", "api", "user"]) ok(!C.linkOk({ online: true, api: true, user: true, failed: false, [k]: false }), "tanpa " + k + " → terputus"); ok(!C.linkOk({ online: true, api: true, user: true, failed: true }), "panggilan gagal → terputus"); ok(!C.linkOk(null), "null → terputus");

// ---- bendera tampilan PHONE di ruang multiplayer: bawaan MATI, murni visual ----
function mk(opts) {
  const log = []; let now = 1e6;
  const room = new Room(Object.assign({ id: "muara-1", cap: 12, io: { now: () => now, send: (c, o) => log.push([c, o]), close: () => {} } }, opts));
  const add = (c, uid) => { room.join(c, uid, { n: "P" + c, r: 0, rd: 0 }, { x: 20, y: 20 }); room.hello(c, { n: "P" + c, r: 0, rd: 0, vis: true, x: P.qz(20), y: P.qz(20), d: 2, f: 0, ar: "muara" }); };
  const tick = (n = 1, ms = 200) => { for (let i = 0; i < n; i++) { now += ms; room.tick(); } };
  const send = (c, o) => room.message(c, JSON.stringify(o));
  const fOf = (c) => room.players.get(c).f;
  const seenBy = (c, id) => { let f = null; for (const [cc, o] of log) { if (cc !== c) continue; if (o.t === "w") { for (const r of o.ps) if (r[0] === id) f = r[7]; } if (o.t === "s") for (const u of o.u) if (u[0] === id) f = u[4]; if (o.t === "j" && o.p[0] === id) f = o.p[7]; } return f; };
  return { room, add, tick, send, fOf, seenBy, log };
}
ok(P.F.PHONE === 32 && !Object.entries(P.F).some(([k, v]) => k !== "PHONE" && (v & 32)), "bit PHONE tidak bentrok dengan bendera lama");
{ const r = mk({}); r.add(1, "a"); r.add(2, "b"); r.tick(2); r.send(1, { t: "m", x: P.qz(20), y: P.qz(20), d: 2, f: 32 }); r.tick(3); eq(r.fOf(1), 0, "env OFF: bendera PHONE dibuang TANPA mengubah bendera lain (dulu 32 dijepit jadi 7 = berjalan+duduk+memancing palsu)"); ok(!r.seenBy(2, r.room.players.get(1).pid), "pemain lain tidak melihat bendera apa pun (perilaku lama)"); r.send(1, { t: "m", x: P.qz(20), y: P.qz(20), d: 2, f: 33 }); r.tick(2); eq(r.fOf(1), 1, "env OFF: 33 → hanya MOVING"); }
{ const r = mk({ phone: true }); r.add(1, "a"); r.add(2, "b"); r.tick(2); const pid = r.room.players.get(1).pid; r.send(1, { t: "m", x: P.qz(20), y: P.qz(20), d: 2, f: 32 }); r.tick(3);
  eq(r.fOf(1) & 32, 32, "env ON: bendera PHONE diterima"); ok((r.seenBy(2, pid) & 32) === 32, "pemain lain menerima bendera lewat siaran posisi");
  r.send(1, { t: "m", x: P.qz(20), y: P.qz(20), d: 2, f: 0 }); r.tick(3); ok((r.seenBy(2, pid) & 32) === 0, "tutup ponsel → bendera padam");
  r.send(1, { t: "m", x: P.qz(20), y: P.qz(20), d: 2, f: 255 }); r.tick(2); eq(r.fOf(1) & ~(15 | 32), 0, "bit lain di luar topeng tetap dipotong (IN/TP tidak lolos di dunia)");
  const n0 = r.room.players.size; r.send(1, { t: "m", x: P.qz(20), y: P.qz(20), d: 2, f: 32 }); r.tick(2); eq(r.room.players.size, n0, "bendera tidak mengubah jumlah pemain/hitungan"); }
{ const r = mk({ phone: true, kind: "house" }); r.add(1, "a"); eq(typeof r.room.fMask, "number", "ruang rumah punya topeng"); ok((r.room.fMask & 16) === 16 && r.room.cleanF(48 | 1, r.room.fMask) === 49, "ruang rumah: IN + PHONE + bendera lain ikut"); }
{ const r = mk({ kind: "house" }); ok(r.room.cleanF(32 | 16, r.room.fMask) === 16, "ruang rumah env OFF: PHONE dibuang, IN tetap"); }
console.log(`unit-phone: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
