// Uji "Panggilan Darurat Nusa — SAR Laut" (prototipe) — inti murni sar/core.js + tambalan kecil phone/core.js. Tanpa jaringan/DOM: node tests/unit-sar.js
// Ditulis SEBELUM implementasi (alur + aturan anti-spam dari tugas Owner). Waktu selalu disuntik (tidak membaca jam perangkat).
const S = require("../sar/core.js"), PH = require("../phone/core.js");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("GAGAL:", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
const MIN = 60000, H = 3600000, C = S.C;
// 2026-11-28 08:00 WIB = 01:00 UTC
const T0 = Date.UTC(2026, 10, 28, 1, 0, 0);
const env = (o) => Object.assign({ now: T0, activeMs: 8 * MIN, sessionCalled: false, busy: null }, o || {});
const roundtrip = (st, now) => S.migrate(JSON.parse(JSON.stringify(st)), now);

// ---- konstanta kontrak ----
eq([C.MIN_ACTIVE_MS, C.COOLDOWN_MS, C.MAX_OFFERS_DAY, C.TOAST_MS], [7 * MIN, 4 * H, 2, 8000], "konstanta aturan Owner: 7 menit, 4 jam, 2/hari, toast 8 dtk");
eq(S.MISSION_ID, "nelayan-biru-1", "id misi prototipe");

// ---- WIB ----
eq(S.dayKey(Date.UTC(2026, 10, 28, 16, 59, 59)), "2026-11-28", "16:59 UTC = 23:59 WIB masih hari yang sama");
eq(S.dayKey(Date.UTC(2026, 10, 28, 17, 0, 0)), "2026-11-29", "17:00 UTC = 00:00 WIB ganti hari");
eq(S.dayKey(null), "", "tanpa jam → kunci kosong (tidak melempar)");

// ---- 1. tidak ada panggilan sebelum 7 menit bermain aktif ----
{ const st = S.fresh();
  eq(S.canOffer(st, env({ activeMs: 0 })).why, "active", "0 menit → ditunda");
  eq(S.canOffer(st, env({ activeMs: 7 * MIN - 1 })).why, "active", "6:59 → belum");
  ok(S.canOffer(st, env({ activeMs: 7 * MIN })).ok, "7:00 → boleh");
  eq(S.canOffer(st, env({ now: null })).why, "clock", "jam tepercaya tidak ada → tidak menawarkan (aman)");
  eq(S.canOffer(st, env({ now: NaN })).why, "clock", "jam NaN → aman");
  eq(S.canOffer(st, env({ activeMs: undefined })).why, "active", "waktu aktif tak diketahui → belum"); }

// ---- 2. berdering tepat sekali ----
{ const st = S.fresh(), e = env(); const r = S.offer(st, e);
  ok(r.ok && r.st.m && r.st.m.phase === "offer" && r.ring === true, "penawaran pertama berdering");
  eq(S.canOffer(r.st, env({ sessionCalled: true })).why, "session", "sesi yang sama: batas satu panggilan");
  ok(!S.canOffer(r.st, env({ sessionCalled: false, now: T0 + 1 * MIN })).ok, "tak berdering lagi walau 'sesi' dianggap baru (kotak masuk masih menunggu / jeda)");
  const again = S.offer(r.st, env({ sessionCalled: true })); ok(!again.ok && again.ring === false, "offer kedua ditolak, tidak ada dering");
  eq(r.st.offerCount, 1, "hitungan penawaran hari ini = 1"); }

// ---- 3. 'Nanti' menyimpan pesan tanpa berdering lagi ----
{ const r = S.offer(S.fresh(), env()), n = S.snooze(r.st);
  eq(n.m.phase, "offer", "Nanti: tawaran tetap ada di kotak masuk"); eq(n.m.snoozed, true, "ditandai ditunda");
  ok(!S.canOffer(n, env({ sessionCalled: true, activeMs: 99 * MIN })).ok, "tidak berdering lagi di sesi ini");
  ok(!S.canOffer(roundtrip(n, T0 + 10 * MIN), env({ now: T0 + 10 * MIN, sessionCalled: false })).ok, "setelah muat ulang pun tidak berdering (tawaran masih menunggu)");
  const a = S.accept(roundtrip(n, T0 + 20 * MIN), T0 + 20 * MIN); ok(a.ok && a.st.m.phase === "active", "tawaran 'Nanti' masih bisa diterima dari NusaPhone"); }

// ---- 4. 'Tolak' → misi yang sama tak ditawarkan lagi ----
{ const r = S.offer(S.fresh(), env({ pool: ["x", "y"] })); eq(r.st.m.id, "x", "tawaran pertama = x");
  const d = S.decline(r.st); eq(d.m.phase, "declined", "ditolak"); ok(d.declined.includes("x"), "x dicatat ditolak selamanya");
  const later = env({ now: T0 + 5 * H, pool: ["x", "y"] }); const r2 = S.offer(d, later); ok(r2.ok && r2.st.m.id === "y", "tawaran berikutnya y, bukan x");
  const d2 = S.decline(r2.st); const r3 = S.offer(d2, env({ now: T0 + 26 * H, pool: ["x", "y"] })); ok(!r3.ok && r3.why === "declined", "semua misi ditolak → tidak ada tawaran identik lagi");
  const r4 = S.offer(roundtrip(d2, T0 + 30 * H), env({ now: T0 + 30 * H, pool: ["x", "y"] })); ok(!r4.ok, "penolakan bertahan setelah simpan/muat"); }
{ const d = S.decline(S.offer(S.fresh(), env()).st); eq(S.canOffer(d, env({ now: T0 + 24 * H })).why, "declined", "prototipe (satu misi): setelah Tolak tak ada penawaran lagi"); }

// ---- 5. jeda 4 jam bertahan setelah muat ulang / login ulang / pindah dunia ----
{ const r = S.offer(S.fresh(), env()), c = S.cancel(S.accept(r.st, T0).st, T0 + 2 * MIN).st;
  const R = roundtrip(c, T0 + 3 * MIN);
  eq(S.canOffer(R, env({ now: T0 + 3 * MIN, activeMs: 99 * MIN })).why, "cooldown", "muat ulang: masih jeda");
  eq(S.canOffer(R, env({ now: T0 + 4 * H - 1, activeMs: 99 * MIN })).why, "cooldown", "3j59m59d: masih jeda");
  const R2 = roundtrip(c, T0 + 4 * H + 2 * MIN); ok(S.canOffer(R2, env({ now: T0 + 4 * H + 2 * MIN, activeMs: 99 * MIN })).ok, "lewat 4 jam: boleh lagi (hitungan hari di bawah batas)");
  eq(S.canOffer(c, env({ now: T0 + 1 * H, activeMs: 99 * MIN })).why, "cooldown", "pindah dunia (tanpa muat ulang): state sama → tetap jeda"); }
{ // jeda dihitung dari jam tepercaya; nilai 'masa depan' hasil utak-atik dijepit
  const st = Object.assign(S.fresh(), { lastCallAt: T0 + 40 * H });
  const R = S.migrate(JSON.parse(JSON.stringify(st)), T0); ok(R.lastCallAt <= T0 + C.COOLDOWN_MS, "lastCallAt di masa depan jauh dijepit (anti utak-atik)");
  ok(S.canOffer(R, env({ now: T0 + C.COOLDOWN_MS + MIN, activeMs: 99 * MIN })).ok, "setelah dijepit, jeda tetap maksimal 4 jam — tidak mengunci selamanya"); }

// ---- 6. maksimal dua tawaran per hari (WIB) ----
{ let st = S.fresh(), now = T0; const log = [];
  for (let i = 0; i < 4; i++) { const r = S.offer(st, env({ now, activeMs: 99 * MIN })); log.push(r.ok); if (r.ok) st = S.cancel(S.accept(r.st, now).st, now + MIN).st; now += 4 * H + 5 * MIN; }
  // T0=08:00 WIB; +0 → 08:00 ✓, +4h05 → 12:05 ✓, +8h10 → 16:10 ✗(hari sama, sudah 2), +12h15 → 20:15 ✗
  eq(log, [true, true, false, false], "hari yang sama: hanya dua tawaran"); }
{ let st = S.fresh(); const t1 = Date.UTC(2026, 10, 28, 15, 0, 0);   // 22:00 WIB
  let r = S.offer(st, env({ now: t1, activeMs: 99 * MIN })); ok(r.ok, "22:00 WIB ✓"); st = S.cancel(S.accept(r.st, t1).st, t1 + MIN).st;
  const t2 = t1 + 4 * H + 5 * MIN; /* 02:05 WIB hari baru */ eq(S.dayKey(t2), "2026-11-29", "lewat tengah malam WIB = hari baru");
  r = S.offer(st, env({ now: t2, activeMs: 99 * MIN })); ok(r.ok && r.st.offerCount === 1, "hari baru: hitungan direset (hanya 1)"); st = S.cancel(S.accept(r.st, t2).st, t2 + MIN).st;
  const t3 = t2 + 4 * H + 5 * MIN; r = S.offer(st, env({ now: t3, activeMs: 99 * MIN })); ok(r.ok, "hari baru: tawaran ke-2 ✓"); st = S.cancel(S.accept(r.st, t3).st, t3 + MIN).st;
  const t4 = t3 + 4 * H + 5 * MIN; eq(S.canOffer(st, env({ now: t4, activeMs: 99 * MIN })).why, "daily", "hari baru: tawaran ke-3 ✗"); }
{ // hitungan hari tidak bisa direset lewat muat ulang
  let st = S.fresh(), now = T0; for (let i = 0; i < 2; i++) { const r = S.offer(st, env({ now, activeMs: 99 * MIN })); st = S.cancel(S.accept(r.st, now).st, now + MIN).st; now += 4 * H + 5 * MIN; }
  const R = roundtrip(st, now); eq(S.canOffer(R, env({ now, activeMs: 99 * MIN })).why, "daily", "muat ulang tidak mereset batas harian"); }

// ---- 7. tidak muncul saat kegiatan terlarang ----
{ const flags = ["fishing", "dialog", "home", "shop", "kedai", "dapur", "cine", "cloud", "noboat"]; const want = {};
  for (const f of flags) { const b = S.busyReason({ [f]: true }); ok(typeof b === "string" && b.length > 0, `sibuk: ${f}`); want[f] = b; const e = env({ busy: b }); const c = S.canOffer(S.fresh(), e); ok(!c.ok && c.why === "busy", `tidak menawarkan saat ${f}`); }
  eq(S.busyReason({}), null, "tanpa kegiatan terlarang → null"); eq(S.busyReason(null), null, "null aman");
  const d = S.canOffer(S.fresh(), env({ busy: "fishing" })); eq(d.why, "busy", "ditunda");
  ok(S.canOffer(S.fresh(), env({ busy: null })).ok, "begitu selesai: boleh (tanpa harus menunggu jeda — penundaan tidak menghabiskan jatah)");
  const st = S.fresh(); S.canOffer(st, env({ busy: "dialog" })); eq(st, S.fresh(), "canOffer tidak mengubah state"); }

// ---- 8. hanya satu misi aktif ----
{ const r = S.offer(S.fresh(), env()), a = S.accept(r.st, T0 + 5);
  ok(a.ok && a.st.m.phase === "active" && a.st.m.stage === "search", "terima → aktif, tahap cari");
  eq(S.canOffer(a.st, env({ now: T0 + 6 * H, activeMs: 99 * MIN })).why, "mission", "selama aktif tidak ada tawaran baru, berapa pun jedanya");
  const a2 = S.accept(a.st, T0 + 10); ok(!a2.ok, "menerima dua kali ditolak");
  ok(S.accept(S.fresh(), T0).ok === false, "tanpa tawaran tidak bisa 'terima'");
  eq(S.canOffer(S.cancel(a.st, T0 + 7 * H).st, env({ now: T0 + 7 * H, activeMs: 99 * MIN })).ok, true, "setelah dibatalkan dengan benar & jeda lewat: boleh lagi"); }

// ---- 9. alur: temukan → stabilkan → bawa → serahkan ----
{ let st = S.accept(S.offer(S.fresh(), env()).st, T0).st;
  const early = S.deliver(st, T0 + MIN); ok(!early.ok, "tidak bisa menyerahkan sebelum korban dibawa");
  const f = S.find(st, T0 + 2 * MIN); ok(f.ok && f.st.m.stage === "found", "ditemukan"); st = f.st;
  eq(S.find(st, T0 + 3 * MIN).ok, false, "menemukan dua kali ditolak");
  eq(S.victimText(), "Kedinginan dan kelelahan.", "teks kondisi korban");
  eq(S.CARE.map((c) => c.id), ["selimut", "air", "evak"], "tiga pilihan"); eq(S.CARE.map((c) => c.label), ["Beri selimut", "Beri air", "Langsung evakuasi"], "label pilihan");
  ok(!S.care(S.accept(S.offer(S.fresh(), env()).st, T0).st, "selimut", T0).ok, "tidak bisa merawat sebelum menemukan");
  eq(S.care(st, "racun", T0 + 3 * MIN).ok, false, "pilihan tak dikenal ditolak");
  const c = S.care(st, "selimut", T0 + 3 * MIN); ok(c.ok && c.st.m.stage === "aboard" && c.st.m.care === "selimut", "dirawat → naik ke kapal"); st = c.st;
  ok(S.care(st, "air", T0 + 4 * MIN).ok === false, "pilihan perawatan tak bisa diulang");
  const d = S.deliver(st, T0 + 10 * MIN + 30000, "Rina"); ok(d.ok && d.st.m.phase === "done" && d.st.m.stage === "delivered", "diserahkan → selesai");
  eq(d.card.title, "NELAYAN BERHASIL DISELAMATKAN", "judul kartu"); eq(d.card.lines, ["Waktu: 10 mnt 30 dtk", "Kondisi: stabil", "Penyelamat: Rina"], "isi kartu persis spesifikasi");
  eq(d.st.rec.done, 1, "catatan SAR bertambah"); ok(d.st.rec.badges.includes("sar-laut-1"), "lencana SAR diberikan");
  eq(S.deliver(d.st, T0 + 11 * MIN).ok, false, "tidak bisa menyerahkan dua kali (tidak ada hadiah ganda)"); eq(d.st.rec.done, 1, "tetap 1");
  eq(Object.keys(d.reward).sort(), ["badge"], "hadiah HANYA lencana (tanpa uang/Diamond/ikan/peluang/item berbayar)");
  eq(S.canOffer(d.st, env({ now: T0 + 5 * H, activeMs: 99 * MIN })).why, "done", "satu misi prototipe selesai → tidak ditawarkan lagi (selesai tercatat)"); }

// ---- skor & kondisi: tidak pernah membunuh ----
{ const run = (care, dur) => { let st = S.accept(S.offer(S.fresh(), env()).st, T0).st; st = S.find(st, T0 + MIN).st; st = S.care(st, care, T0 + 2 * MIN).st; return S.deliver(st, T0 + dur, "A"); };
  const a = run("selimut", 10 * MIN), b = run("air", 10 * MIN), c = run("evak", 10 * MIN);
  ok(a.st.m.score > b.st.m.score && b.st.m.score > c.st.m.score, "selimut > air > evakuasi langsung");
  eq([a.st.m.cond, b.st.m.cond, c.st.m.cond], ["stabil", "cukup stabil", "cukup stabil"], "kondisi: hanya stabil / cukup stabil");
  const slow = run("evak", 25 * MIN); ok(slow.st.m.score > 0 && slow.ok && ["stabil", "cukup stabil"].includes(slow.st.m.cond), "paling lambat + paling buruk: skor tetap > 0, korban tidak mati");
  ok([a, b, c, slow].every((r) => r.st.m.score >= 40 && r.st.m.score <= 100), "skor 40–100"); }

// ---- format durasi ----
eq([S.fmtDur(0), S.fmtDur(59999), S.fmtDur(61000), S.fmtDur(754000), S.fmtDur(-5), S.fmtDur(NaN)], ["0 mnt 00 dtk", "0 mnt 59 dtk", "1 mnt 01 dtk", "12 mnt 34 dtk", "0 mnt 00 dtk", "0 mnt 00 dtk"], "format durasi");

// ---- kedaluwarsa ----
{ const r = S.offer(S.fresh(), env()); const e0 = S.expire(r.st, T0 + C.OFFER_TTL_MS - 1); ok(!e0.changed, "tawaran belum kedaluwarsa");
  const e1 = S.expire(r.st, T0 + C.OFFER_TTL_MS + 1); ok(e1.changed && e1.st.m.phase === "expired" && e1.msg.length > 0, "tawaran lama kedaluwarsa dengan pesan");
  eq(S.expire(e1.st, T0 + 99 * H).changed, false, "kedaluwarsa hanya sekali (idempoten, tidak spam)");
  const a = S.accept(r.st, T0 + MIN).st; ok(!S.expire(a, T0 + MIN + C.ACTIVE_TTL_MS - 1).changed, "misi aktif belum habis");
  const e2 = S.expire(a, T0 + MIN + C.ACTIVE_TTL_MS + 1); ok(e2.changed && e2.st.m.phase === "expired" && /ditutup|berakhir|kedaluwarsa/i.test(e2.msg), "misi aktif habis waktu → ditutup dengan pesan wajar");
  ok(e2.st.lastCallAt >= T0, "jeda tetap berlaku setelah kedaluwarsa"); eq(S.canOffer(e2.st, env({ now: T0 + MIN + C.ACTIVE_TTL_MS + 2, activeMs: 99 * MIN })).why, "cooldown", "setelah kedaluwarsa: jeda, bukan tawaran baru langsung");
  ok(!S.accept(e1.st, T0 + 99 * H).ok, "tawaran kedaluwarsa tidak bisa diterima"); }
{ const st = S.fresh(); ok(!S.expire(st, T0).changed, "tanpa misi: tidak ada perubahan"); ok(!S.expire(st, null).changed, "jam hilang: tidak ada perubahan"); }

// ---- jam tidak ada → state tidak berubah (aman) ----
{ const r = S.offer(S.fresh(), env({ now: null })); ok(!r.ok && r.why === "clock", "offer tanpa jam ditolak");
  const a = S.offer(S.fresh(), env()).st; ok(!S.accept(a, null).ok, "terima tanpa jam ditolak"); }

// ---- kompatibilitas simpanan ----
eq(S.migrate(undefined, T0), S.fresh(), "simpanan lama tanpa S.sar → keadaan awal"); eq(S.migrate(null, T0), S.fresh(), "null"); eq(S.migrate("rusak", T0), S.fresh(), "string"); eq(S.migrate([], T0), S.fresh(), "array"); eq(S.migrate(42, T0), S.fresh(), "angka");
{ const bad = S.migrate({ v: 1, lastCallAt: "x", offerCount: -5, offerDay: 7, declined: "x", rec: { done: -1, badges: [1, "zzz", "sar-laut-1"] }, m: { id: 5, phase: "hantu", stage: 9 } }, T0);
  ok(bad.offerCount === 0 && bad.lastCallAt === 0 && Array.isArray(bad.declined) && bad.rec.done === 0, "nilai rusak dibersihkan");
  eq(bad.rec.badges, ["sar-laut-1"], "hanya lencana dikenal"); eq(bad.m, null, "misi rusak dibuang"); }
{ const full = S.accept(S.offer(S.fresh(), env()).st, T0).st; eq(roundtrip(full, T0 + MIN), full, "bulat-pulang JSON tak berubah"); }
{ const save = { v: 11, money: 500, fish: [1, 2], cooler: [{ id: "a" }], up: { rod: 1 }, stats: { casts: 3 } }, before = JSON.stringify(save);
  const out = S.migrateInto(save, T0); eq(JSON.stringify(Object.assign({}, out, { sar: undefined })), JSON.stringify(Object.assign({}, JSON.parse(before), { sar: undefined })), "migrateInto tidak menyentuh field lain");
  ok(out === save && save.sar && save.sar.v === 1, "hanya menambah S.sar"); eq(save.money, 500, "uang tetap"); eq(save.cooler, [{ id: "a" }], "coolbox tetap"); }
ok(JSON.stringify(S.fresh()).length < 400, "state kecil (ringan untuk Cloud Save)");
ok(!/money|diamond|coin|fish|qris|event/i.test(Object.keys(S.fresh()).concat(Object.keys(S.fresh().rec)).join(",")), "state SAR tak memuat field ekonomi/ikan/QRIS/event");

// ---- tambalan NusaPhone (kontrak aplikasi tetap) ----
eq(PH.APP_IDS, ["klippy", "nusachat", "playgame", "nusaweb", "zentro", "dompet", "peta", "pengaturan"], "kontrak delapan aplikasi TIDAK berubah");
eq(PH.HIDDEN_VIEWS, ["sar"], "satu layar tersembunyi 'sar' (bukan ikon layar utama)");
{ const home = PH.nav(PH.NAV0, "unlock"); const o = PH.nav(home, "open", "sar"); eq([o.screen, o.app], ["app", "sar"], "layar SAR bisa dibuka dari notifikasi"); eq(PH.nav(PH.NAV0, "open", "sar").screen, "lock", "tetap terkunci bila ponsel belum dibuka");
  eq(PH.nav(home, "open", "tidakada"), home, "layar asing tetap ditolak"); eq(PH.nav(o, "back").screen, "home", "tombol kembali menutup layar SAR"); }
{ const l = PH.noteAdd([], { id: "sar:nelayan-biru-1", icon: "🚨", title: "PANGGILAN DARURAT", text: "x", app: "sar", toastMs: 8000 }, T0);
  eq(l[0].app, "sar", "catatan SAR menunjuk layar sar"); eq(l[0].toastMs, 8000, "toastMs 8000 dipertahankan"); eq(PH.noteAdd(l, { id: "sar:nelayan-biru-1", title: "dobel" }, T0).length, 1, "catatan yang sama tidak dobel");
  eq(PH.noteAdd([], { id: "a", toastMs: 99999999 }, T0)[0].toastMs, 12000, "toastMs dijepit maksimal 12 dtk (tidak menutup layar lama)"); eq(PH.noteAdd([], { id: "b" }, T0)[0].toastMs, undefined, "catatan biasa tak berubah"); }

console.log(`unit-sar: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
