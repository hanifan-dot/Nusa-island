// Uji Event 5 Monster Legenda: jadwal WIB, lintasan renang, simulasi duel, dan SEMUA aturan server (hadiah, juara tunggal, anti-curang).
const assert = require("assert");
const EC = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js"), EV = require("../event/core.js");
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.stack.split("\n").slice(0, 4).join("\n    ")); } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, o) => { buf.set(p, JSON.stringify(o)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
const MIN = EV.MIN, S1 = Date.UTC(2026, 10, 1, 12, 0, 0);             // Minggu 1 Nov 2026, 19.00 WIB
let now = S1 - 3 * EV.HOUR, n = 0; const op = () => "op" + (++n) + "xxxxxxxx";
const HOURMS = 3600000;
const mk = (cfg) => { const db = mkdb(); if (cfg !== null) db.m.set("shop/config", JSON.stringify(Object.assign({ eventOn: true, eventAnchor: "2026-10-25" }, cfg || {}))); return { db, e: EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true, event: EV, rng: (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })() }) }; };
const U = { uid: "user1" }, V = { uid: "user2" }, W = { uid: "user3" };

// Pemain terampil (bot) yang memutuskan dari keadaan tertunda `delay` langkah — dipakai untuk membuktikan duel BISA dimenangkan, bukan untuk curang.
function bot(mon, seed, delay) {
  const plan = EV.makePlan(mon, seed); let h = 0; const log = [];
  for (let step = 0; step < EV.MAX_STEPS; step++) {
    const tr = [], r = EV.simulate(mon, seed, log, tr); if (r.steps && r.steps <= step && r.result !== "waktu") return { r, log };
    const obs = tr[Math.max(0, Math.min(tr.length - 1, step - delay))] || { T: 0.25 }, k = EV.kindAt(plan, step), warn = EV.warnAt(mon, plan, step);
    let want = k !== 0 || warn ? 0 : obs.T < 0.7 ? 1 : obs.T > 0.75 ? 0 : h;
    if (k === 2 && !warn) want = obs.T < 0.55 ? 1 : 0;
    if (want !== h && (log.length === 0 || step - log[log.length - 1] >= 2)) { log.push(step); h = want; }
  }
  return { r: EV.simulate(mon, seed, log), log };
}
async function init(e, u) { await e.ecoInit(u, { money: 0 }); }
async function play(e, u, opts) {      // mulai → mainkan bot → tunggu waktu nyata → selesai
  opts = opts || {}; const s = await e.ecoEventStart(u, { opId: op(), eventId: opts.eventId || EV.status(now).ev.id });
  const mon = s.duel.monster, b = opts.log ? { r: EV.simulate(mon, s.duel.seed, opts.log), log: opts.log } : bot(mon, s.duel.seed, opts.delay === undefined ? 5 : opts.delay);
  if (!opts.noWait) now += b.r.ms + 500;
  const f = await e.ecoEventFinish(u, { opId: opts.opId || op(), eventId: s.duel.eventId, log: b.log, name: opts.name }); return { s, b, f };
}

(async () => {
  // ---------------- jadwal ----------------
  await t("jadwal: Minggu 19.00–19.20 WIB; minggu ke-0 = PEMBUKAAN Megalodon, lalu rotasi 5 monster", () => {
    assert.equal(EV.anchorMs("2026-11-01"), S1);
    const seq = []; for (let w = 0; w < 12; w++) { const e = EV.eventOf(w); assert.equal(new Date(e.start + EV.WIB).getUTCDay(), 0); assert.equal(new Date(e.start + EV.WIB).getUTCHours(), 19); assert.equal(e.end - e.start, 20 * MIN); assert.equal(e.premiere, w === 0); seq.push(e.monster); }
    assert.equal(seq[0], "megalodon_bayangan"); assert.equal(EV.eventOf(0).id, "e20261101");
    assert.deepEqual(seq.slice(1, 6), ["toman_purba", "jurung_mahkota", "barakuda_guntur", "kuwe_titan", "megalodon_bayangan"]);
    assert.deepEqual(seq.slice(6, 11), seq.slice(1, 6)); assert.equal(seq[11], "toman_purba");
    assert.deepEqual(EV.MONSTERS.map((m) => m.kg), [800, 2000, 5000, 12000, 50000]); assert.deepEqual(EV.MONSTERS.map((m) => m.loc), ["muara", "toba", "selat", "ampat", "banda"]);
  });
  await t("status: sebelum / tepat mulai / 19.19 / 19.20 / masa tutup / pekan depan", () => {
    assert.equal(EV.status(S1 - 1).phase, "upcoming"); assert.equal(EV.status(S1 - 1).msToStart, 1);
    assert.equal(EV.status(S1).phase, "live"); assert.equal(EV.status(S1 + 20 * MIN - 1).phase, "live");
    assert.equal(EV.status(S1 + 20 * MIN).phase, "closing"); assert.equal(EV.status(S1 + 20 * MIN + EV.GRACE - 1).phase, "closing");
    const e = EV.status(S1 + 21 * MIN + EV.GRACE); assert.equal(e.phase, "ended"); assert.equal(e.next.date, "2026-11-08"); assert.equal(e.next.monster, "toman_purba");
    assert.equal(EV.status(S1 + EV.WEEK).phase, "live"); assert.equal(EV.status(S1 + EV.WEEK).ev.monster, "toman_purba"); assert.equal(EV.status(S1).ev.monster, "megalodon_bayangan");
    assert.equal(EV.status(S1 + 6 * EV.WEEK).ev.monster, "toman_purba");
  });
  await t("anchor bisa digeser (target terlewat → Minggu berikutnya) dan harus hari Minggu", () => {
    const a = EV.status(S1 + 6 * EV.HOUR, "2026-11-08"); assert.equal(a.phase, "upcoming"); assert.equal(a.ev.monster, "megalodon_bayangan"); assert.equal(a.ev.date, "2026-11-08");
    assert.equal(EV.anchorMs("2026-11-02"), S1); assert.equal(EV.anchorMs("ngawur"), S1);                   // Senin / sampah → kembali ke bawaan
    assert.equal(EV.eventById("e20261108", "2026-11-01").monster, "toman_purba"); assert.equal(EV.eventById("e20261109", "2026-11-01"), null); assert.equal(EV.eventById("e20261025", "2026-11-01"), null);
  });
  // ---------------- lintasan ----------------
  await t("lintasan renang: deterministik (sama untuk semua pemain), dalam batas, benar-benar bergerak, ada selam", () => {
    for (const m of EV.MONSTERS) {
      const a = EV.swimAt(m.id, "e20261101", 123.4), b = EV.swimAt(m.id, "e20261101", 123.4); assert.deepEqual(a, b);
      let dist = 0, dive = 0, px, pz; for (let s = 0; s < 1200; s += 0.5) { const p = EV.swimAt(m.id, "e20261101", s); assert.ok(p.x >= -1.1 && p.x <= 1.1 && p.z >= 3.3 && p.z <= 8.8 && p.depth >= 0 && p.depth <= 1); if (px !== undefined) dist += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; if (p.depth > 0.5) dive++; }
      assert.ok(dist > 8, m.id + " harus berpatroli (jarak " + dist.toFixed(1) + ")"); assert.ok(dive > 0 && dive < 2400 * 0.6, m.id + " menyelam sesekali");
    }
    assert.notDeepEqual(EV.swimAt("toman_purba", "e20261101", 60), EV.swimAt("toman_purba", "e20261108", 60));
  });
  // ---------------- simulasi duel ----------------
  await t("duel: diam → kendur, tahan terus → putus, log tak valid ditolak, hasil deterministik", () => {
    for (const m of EV.MONSTERS) {
      assert.equal(EV.simulate(m.id, 5, []).result, "slack"); assert.equal(EV.simulate(m.id, 5, [0]).result, "snap");
      assert.deepEqual(EV.simulate(m.id, 99, [3, 9, 20]), EV.simulate(m.id, 99, [3, 9, 20]));
    }
    for (const bad of [[5, 4], [5, 5], [5, 6], [-1], [1.5], [1200], "x", [3, 4], new Array(601).fill(0).map((_, i) => i * 2)]) assert.equal(EV.simulate("toman_purba", 1, bad).valid, false, JSON.stringify(bad).slice(0, 30));
  });
  await t("duel: BISA dimenangkan oleh pemain terampil di kelima monster (reaksi 0,25 dtk), skor menang ≥ 1000, kalah < 1000", () => {
    for (const m of EV.MONSTERS) {
      let win = 0; const N = 12; for (let i = 0; i < N; i++) { const o = bot(m.id, 4242 + i * 977, 5); if (o.r.caught) { win++; assert.ok(o.r.score >= 1000 && o.r.score <= 2000); assert.ok(o.r.ms >= 8000 && o.r.ms <= 60000, "durasi " + o.r.ms); } else assert.ok(o.r.score < 1000); }
      assert.ok(win >= N - 2, m.id + " menang " + win + "/" + N);
    }
  });
  // ---------------- server ----------------
  await t("event dimatikan (tanpa saklar Owner) → tidak ada duel & info 'off'", async () => {
    const { e } = mk(null); await init(e, U); now = S1 + MIN;
    assert.equal((await e.eventInfo()).on, false); await assert.rejects(() => e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }), /belum dibuka/);
    const { e: e2 } = mk({ eventOn: false }); await init(e2, U); await assert.rejects(() => e2.ecoEventStart(U, { opId: op(), eventId: "e20261101" }), /belum dibuka/);
  });
  await t("eventInfo publik (tamu): jam server + jadwal; tanpa uid", async () => {
    const { e } = mk({ eventAnchor: "2026-11-01" }); now = S1 - 2 * EV.HOUR; const a = await e.eventInfo(); assert.equal(a.on, true); assert.equal(a.now, now); assert.equal(a.phase, "upcoming"); assert.equal(a.ev.monster, "megalodon_bayangan"); assert.equal(a.ev.start, S1);
    now = S1 + MIN; assert.equal((await e.eventInfo()).phase, "live");
  });
  await t("mulai duel: hanya saat event berlangsung, ID event harus cocok, seed dari SERVER (kiriman klien diabaikan), perlu akun ekonomi", async () => {
    const { e } = mk(); await init(e, U);
    now = S1 - MIN; await assert.rejects(() => e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }), /tidak berlangsung/);
    now = S1 + MIN; await assert.rejects(() => e.ecoEventStart(U, { opId: op(), eventId: "e20261108" }), /tidak berlangsung/);
    await assert.rejects(() => e.ecoEventStart({ uid: "tanpaakun" }, { opId: op(), eventId: "e20261101" }), /belum diaktifkan/);
    const r = await e.ecoEventStart(U, { opId: op(), eventId: "e20261101", seed: 1, monster: "toman_purba" }); assert.equal(r.duel.monster, "toman_purba"); assert.notEqual(r.duel.seed, 1); assert.equal(r.duel.left, 2);
    now = S1 + 21 * MIN; await assert.rejects(() => e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }), /tidak berlangsung/);   // sudah lewat 19.20
  });
  await t("mulai duel: opId ulang (jaringan) tidak memakai kesempatan lagi; maksimal 3 kesempatan; mulai baru menghanguskan duel lama", async () => {
    const { e } = mk(); await init(e, U); now = S1 + MIN; const id = op();
    const a = await e.ecoEventStart(U, { opId: id, eventId: "e20261101" }), a2 = await e.ecoEventStart(U, { opId: id, eventId: "e20261101" });
    assert.ok(a2.duplicate); assert.equal(a2.duel.seed, a.duel.seed); assert.equal((await e.ecoEventState(U)).my.att, 1);
    const b = await e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }); assert.notEqual(b.duel.seed, a.duel.seed);
    const c = await e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }); assert.equal(c.duel.left, 0);
    await assert.rejects(() => e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }), /habis/);
    await assert.rejects(() => e.ecoEventFinish(U, { opId: op(), eventId: "e20261101", log: bot("toman_purba", c.duel.seed, 5).log }), /lebih cepat/);   // duel lama sudah hangus; yang aktif = ke-3 dan belum waktunya selesai
  });
  await t("selesai duel: menang → hadiah partisipasi + tangkapan SEKALI per event, uang masuk dompet utama, trofi tercatat", async () => {
    const { e } = mk(); await init(e, U); now = S1 + MIN; const b0 = (await e.ecoState(U)).balance, R = EV.rewardsOf("toman_purba");
    const { f } = await play(e, U, { name: "Budi<script>" }); assert.ok(f.caught && f.score >= 1000, JSON.stringify(f)); assert.equal(f.paid.part, R.part); assert.equal(f.paid.catch, R.catch);
    assert.equal(f.eco.balance, b0 + R.part + R.catch); assert.equal(f.eco.troph.toman_purba.caught, 1); assert.ok(f.eco.troph.toman_purba.best >= 1000);
    const g = await play(e, U); assert.equal(g.f.paid.part, 0); assert.equal(g.f.paid.catch, 0); assert.equal(g.f.eco.balance, b0 + R.part + R.catch);   // duel ke-2: tidak ada hadiah ganda
    const st = await e.ecoEventState(U); assert.equal(st.my.att, 2); assert.ok(st.my.best >= 1000); assert.equal(st.eco.balance, b0 + R.part + R.catch);
    const doc = JSON.parse((e.__db || { m: new Map() }).m?.get?.("shop/event/e20261101") || "null");   // dokumen global ada (diperiksa lewat db pada tes juara)
  });
  await t("selesai duel: kalah tetap dapat hadiah partisipasi (sekali), tanpa hadiah tangkapan, tanpa juara", async () => {
    const { e, db } = mk(); await init(e, U); now = S1 + MIN; const b0 = (await e.ecoState(U)).balance, R = EV.rewardsOf("toman_purba");
    const { f } = await play(e, U, { log: [] }); assert.equal(f.caught, false); assert.equal(f.result, "slack"); assert.equal(f.paid.part, R.part); assert.equal(f.paid.catch, 0); assert.equal(f.eco.balance, b0 + R.part);
    assert.equal(db.m.get("shop/event/e20261101"), undefined);
  });
  await t("ANTI-CURANG: klien tidak bisa mengaku menang / menyetor skor / koin / hasil; hanya LOG yang dinilai", async () => {
    const { e } = mk(); await init(e, U); now = S1 + MIN; const b0 = (await e.ecoState(U)).balance;
    const s = await e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }); now += 30000;
    const f = await e.ecoEventFinish(U, { opId: op(), eventId: "e20261101", log: [], result: "caught", caught: true, score: 99999, coins: 1e9, reward: 1e9, steps: 1 });
    assert.equal(f.caught, false); assert.ok(f.score < 1000); assert.ok(f.eco.balance < b0 + 1000);
  });
  await t("ANTI-CURANG: duel tidak bisa 'selesai' lebih cepat dari waktu nyata; selesai tanpa mulai ditolak; log rusak ditolak; duel kadaluarsa hangus", async () => {
    const { e } = mk(); await init(e, U); now = S1 + MIN;
    await assert.rejects(() => e.ecoEventFinish(U, { opId: op(), eventId: "e20261101", log: [] }), /Tidak ada duel/);
    const s = await e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }), b = bot("toman_purba", s.duel.seed, 5);
    await assert.rejects(() => e.ecoEventFinish(U, { opId: op(), eventId: "e20261101", log: b.log }), /lebih cepat/);          // dikirim seketika
    await assert.rejects(() => e.ecoEventFinish(U, { opId: op(), eventId: "e20261101", log: [5, 4] }), /tidak valid/);
    now += b.r.ms + 300; const ok = await e.ecoEventFinish(U, { opId: op(), eventId: "e20261101", log: b.log }); assert.ok(ok.caught);       // kemudian sah
    const s2 = await e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }); now += 100000;
    const late = await e.ecoEventFinish(U, { opId: op(), eventId: "e20261101", log: b.log }).catch((x) => x); assert.ok((late.result === "hangus") || /ditutup/.test(late.message));
  });
  await t("selesai duel: opId ganda (kirim ulang) tidak menggandakan koin; duel yang mulai 19.19 boleh selesai sampai masa tutup, setelahnya ditolak", async () => {
    const { e } = mk(); await init(e, U); now = S1 + 19 * MIN + 50000; const b0 = (await e.ecoState(U)).balance;
    const s = await e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }), b = bot("toman_purba", s.duel.seed, 5); now += 25000;   // sekarang 19.20:15 → masa tutup
    assert.ok(EV.status(now).phase === "closing"); const id = op();
    const a = await e.ecoEventFinish(U, { opId: id, eventId: "e20261101", log: b.log }), a2 = await e.ecoEventFinish(U, { opId: id, eventId: "e20261101", log: b.log });
    assert.ok(a.caught && a2.duplicate); assert.equal(a2.eco.balance, a.eco.balance); assert.ok(a.eco.balance > b0);
    const s2 = await e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }).catch((x) => x); assert.match(s2.message, /tidak berlangsung/);
    now = S1 + 21 * MIN + EV.GRACE; await assert.rejects(() => e.ecoEventFinish(U, { opId: op(), eventId: "e20261101", log: b.log }), /ditutup/);
  });
  await t("JUARA TUNGGAL GLOBAL: skor tertinggi menang, seri → selesai paling awal, satu dokumen untuk semua room; hasil baru diumumkan setelah masa tutup", async () => {
    const { e, db } = mk(); for (const u of [U, V, W]) await init(e, u); now = S1 + MIN;
    // pilih seed tetap dengan membuat 3 pemain bermain; skor berbeda karena seed & kecepatan berbeda
    const res = []; for (const [u, d] of [[U, 9], [V, 2], [W, 5]]) res.push((await play(e, u, { delay: d, name: u.uid })).f);
    const doc = JSON.parse(db.m.get("shop/event/e20261101")); const best = res.map((r, i) => ({ r, uid: [U, V, W][i].uid })).filter((x) => x.r.caught).sort((a, b) => b.r.score - a.r.score)[0];
    assert.equal(doc.top.uid, best.uid); assert.equal(doc.top.score, best.r.score);
    assert.equal((await e.eventInfo()).winner, null);                                                      // belum final
    now = S1 + 21 * MIN + EV.GRACE + 1; const inf = await e.eventInfo(); assert.equal(inf.phase, "ended"); assert.equal(inf.winner.score, best.r.score); assert.equal(inf.winner.uid, undefined);
    const st = await e.ecoEventState({ uid: best.uid }); assert.equal(st.my.win, true);
    assert.equal(EV.better({ score: 5, at: 1, uid: "b" }, { score: 5, at: 2, uid: "a" }), true); assert.equal(EV.better({ score: 5, at: 2, uid: "a" }, { score: 5, at: 2, uid: "b" }), true); assert.equal(EV.better({ score: 4, at: 1, uid: "a" }, { score: 5, at: 9, uid: "z" }), false);
  });
  await t("hadiah juara: belum boleh sebelum masa tutup; hanya juara; sekali; non-juara tidak dapat apa-apa", async () => {
    const { e } = mk(); for (const u of [U, V]) await init(e, u); now = S1 + MIN;
    const a = await play(e, U, { delay: 0 }), b = await play(e, V, { delay: 8 }); const win = a.f.score >= b.f.score ? U : V, lose = win === U ? V : U;
    await assert.rejects(() => e.ecoEventClaim(win, { opId: op(), eventId: "e20261101" }), /belum diumumkan/);
    now = S1 + 21 * MIN + EV.GRACE; const b0 = (await e.ecoState(win)).balance, L0 = (await e.ecoState(lose)).balance;
    const nl = await e.ecoEventClaim(lose, { opId: op(), eventId: "e20261101" }); assert.equal(nl.winner, false); assert.equal(nl.eco.balance, L0);
    const c = await e.ecoEventClaim(win, { opId: op(), eventId: "e20261101" }); assert.equal(c.amount, EV.rewardsOf("toman_purba").win); assert.equal(c.eco.balance, b0 + c.amount); assert.equal(c.eco.troph.toman_purba.champ, 1);
    const c2 = await e.ecoEventClaim(win, { opId: op(), eventId: "e20261101" }); assert.ok(c2.already); assert.equal(c2.eco.balance, c.eco.balance);
    const rs = await Promise.all([1, 2, 3].map(() => e.ecoEventClaim(win, { opId: op(), eventId: "e20261101" }))); assert.ok(rs.every((r) => r.amount === 0)); assert.equal((await e.ecoState(win)).balance, c.eco.balance);
    await assert.rejects(() => e.ecoEventClaim(win, { opId: op(), eventId: "e20261102" }), /tidak dikenal/);
  });
  await t("tanpa pemenang (tak ada tangkapan sukses) → tidak ada juara & tidak ada hadiah juara", async () => {
    const { e, db } = mk(); await init(e, U); now = S1 + MIN; await play(e, U, { log: [] }); now = S1 + 25 * MIN;
    const inf = await e.eventInfo(); assert.equal(inf.winner, null); assert.equal((await e.ecoEventClaim(U, { opId: op(), eventId: "e20261101" })).winner, false); assert.equal(db.m.get("shop/event/e20261101"), undefined);
  });
  await t("balapan: 8 pemain selesai paralel → tepat SATU juara konsisten (skor tertinggi), tiap pemain dibayar sekali", async () => {
    const { e, db } = mk(); const us = Array.from({ length: 8 }, (_, i) => ({ uid: "pl" + i + "abcd" })); for (const u of us) await init(e, u); now = S1 + MIN;
    const ss = []; for (const u of us) ss.push(await e.ecoEventStart(u, { opId: op(), eventId: "e20261101" }));
    const bs = ss.map((s, i) => bot("toman_purba", s.duel.seed, 2 + i)); now += Math.max(...bs.map((b) => b.r.ms)) + 600;
    const fs = await Promise.all(us.map((u, i) => e.ecoEventFinish(u, { opId: op(), eventId: "e20261101", log: bs[i].log })));
    const doc = JSON.parse(db.m.get("shop/event/e20261101")), caught = fs.map((f, i) => ({ f, uid: us[i].uid })).filter((x) => x.f.caught);
    assert.ok(caught.length >= 6); const maxS = Math.max(...caught.map((x) => x.f.score)); assert.equal(doc.top.score, maxS);
    assert.equal(caught.filter((x) => x.f.score === maxS && x.uid === doc.top.uid).length, 1);
    for (const f of fs) assert.ok(f.paid.part > 0);
  });
  await t("rotasi mingguan di server: pekan ke-2 = Jurung Mahkota dengan hadiah lebih besar; anchor digeser lewat konfigurasi Owner (pembukaan ikut bergeser)", async () => {
    const { e } = mk({ eventAnchor: "2026-10-25" }); await init(e, U); now = S1 + EV.WEEK + MIN; const s = await e.ecoEventStart(U, { opId: op(), eventId: "e20261108" }); assert.equal(s.duel.monster, "jurung_mahkota");
    const { e: e2 } = mk({ eventAnchor: "2026-11-08" }); await init(e2, U); now = S1 + MIN; await assert.rejects(() => e2.ecoEventStart(U, { opId: op(), eventId: "e20261101" }), /tidak berlangsung/);
    now = S1 + EV.WEEK + MIN; assert.equal((await e2.ecoEventStart(U, { opId: op(), eventId: "e20261108" })).duel.monster, "megalodon_bayangan");
    assert.ok(EV.MONSTERS.every((m, i, a) => !i || m.rw.win > a[i - 1].rw.win));
  });
  await t("PEMBUKAAN PUBLIK 1 Nov: server memutuskan Megalodon; eventInfo menandai premiere + akses event khusus; saklar eventPass", async () => {
    const { e } = mk({ eventAnchor: "2026-11-01" }); now = S1 - HOURMS; const a = await e.eventInfo();
    assert.equal(a.ev.monster, "megalodon_bayangan"); assert.equal(a.ev.premiere, true); assert.equal(a.pass, true); assert.equal(a.next.premiere, true); assert.equal(a.ev.id, "e20261101");
    await init(e, U); now = S1 + MIN; const s = await e.ecoEventStart(U, { opId: op(), eventId: "e20261101" }); assert.equal(s.duel.monster, "megalodon_bayangan");
    const b = bot("megalodon_bayangan", s.duel.seed, 8); now += b.r.ms + 700; const f = await e.ecoEventFinish(U, { opId: op(), eventId: "e20261101", log: b.log }); assert.equal(f.caught, true); assert.equal(f.paid.part + f.paid.catch, EV.rewardsOf("megalodon_bayangan").part + EV.rewardsOf("megalodon_bayangan").catch);
    const { e: off } = mk({ eventAnchor: "2026-11-01", eventPass: false }); now = S1 - HOURMS; assert.equal((await off.eventInfo()).pass, false);
    now = S1 + 6 * EV.WEEK; assert.equal((await e.eventInfo()).ev.premiere, false);
  });
  await t("ecoState tetap kompatibel (field lama utuh) + trofi", async () => {
    const { e } = mk(); const r = await e.ecoInit(U, { money: 0 }); for (const k of ["init", "own", "topup", "balance", "up", "homeLv", "cat", "box", "claimed", "troph"]) assert.ok(k in r, k);
    const { e: noEv } = (() => { const db = mkdb(); return { e: EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true }) }; })(); await assert.rejects(() => noEv.eventInfo(), /belum tersedia/);
  });
  await t("salinan Functions lib/event-core.js sama dengan sumber", () => {
    const fs = require("fs"), path = require("path"), r = path.join(__dirname, "..");
    const strip = (s) => s.replace(/^\/\/ SALINAN OTOMATIS[^\n]*\n/, "");
    for (const [a, b] of [["event/core.js", "event-core.js"], ["economy/core.js", "economy-core.js"]]) assert.equal(strip(fs.readFileSync(path.join(r, "firebase/functions/lib", b), "utf8")), fs.readFileSync(path.join(r, a), "utf8"), b + " basi: jalankan node firebase/scripts/sync-economy.js");
  });
  console.log(`unit event: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
})();
