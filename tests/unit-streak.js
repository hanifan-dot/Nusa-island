// Uji logika Login Streak 7 Hari (murni, tanpa jaringan): node tests/unit-streak.js
const fs = require("fs"), path = require("path");
const C = require("../streak/core.js");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("GAGAL:", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);

const JKT = (y, mo, d, h = 12, mi = 0) => Date.UTC(y, mo - 1, d, h - 7, mi); // waktu dinding Jakarta → epoch ms
const day0 = JKT(2026, 11, 1, 10);

// ---------- hari Jakarta ----------
ok(C.dayIndex(JKT(2026, 11, 1, 0, 0)) === C.dayIndex(JKT(2026, 11, 1, 23, 59)), "satu hari kalender Jakarta");
ok(C.dayIndex(JKT(2026, 11, 1, 23, 59)) + 1 === C.dayIndex(JKT(2026, 11, 2, 0, 0)), "pergantian hari tepat 00:00 WIB");
ok(C.dayIndex(Date.UTC(2026, 10, 1, 16, 59, 59)) !== C.dayIndex(Date.UTC(2026, 10, 1, 17, 0, 0)), "17:00 UTC = 00:00 WIB");
ok(C.dayLabel(C.dayIndex(JKT(2026, 11, 1, 3))) === "2026-11-01", "label tanggal Jakarta");
ok(C.msUntilNextDay(JKT(2026, 11, 1, 23, 0)) === 3600000, "hitung mundur ke 00:00");

// ---------- tabel hadiah ----------
eq(C.rewardFor(1, 1), { coin: 20 }, "H1"); eq(C.rewardFor(1, 2), { bait: 3 }, "H2"); eq(C.rewardFor(1, 3), { coin: 35 }, "H3");
eq(C.rewardFor(1, 4), { chest: true, coin: 40, bait: 2 }, "H4 peti"); eq(C.rewardFor(1, 5), { bait: 5 }, "H5"); eq(C.rewardFor(1, 6), { coin: 50 }, "H6");
eq(C.rewardFor(1, 7), { ship: true }, "H7 kapal"); eq(C.rewardFor(2, 7), { rod: true }, "H14 joran"); eq(C.rewardFor(3, 7), { furn: true }, "H21 perabot");
ok(C.rewardFor(9, 7).furn === true && C.rewardFor(9, 1).coin === 25, "siklus 3+ berulang");
ok(C.rewardFor(2, 1).coin === 25 && !C.rewardFor(2, 1).ship, "siklus 2 hari 1");

// ---------- simulasi server (penyimpanan palsu yang memakai validateTransition = cermin Rules) ----------
function mkServer() {
  let doc = null;
  return {
    get: () => (doc ? JSON.parse(JSON.stringify(doc)) : null),
    claim(nowMs, ctx) { // klien jujur
      const plan = C.planClaim(doc, nowMs, ctx); if (!plan) return { already: true };
      return this.write(plan.next, nowMs, plan);
    },
    write(next, nowMs, plan) {
      const v = C.validateTransition(doc, next, nowMs); if (!v.ok) return { denied: v.why };
      doc = JSON.parse(JSON.stringify(next)); return { ok: true, plan };
    },
  };
}
let seq = 0; const rnd = () => ((seq = (seq * 1664525 + 1013904223) % 4294967296) / 4294967296);

// 1) 7 hari berturut-turut, kapal di hari 7 saja
{
  const s = mkServer(); let ship = false;
  for (let d = 0; d < 7; d++) {
    const r = s.claim(day0 + d * C.DAY_MS, { rnd, owned: [] });
    ok(r.ok, `klaim hari ${d + 1}`);
    ok(r.plan.pos === d + 1 && r.plan.cycle === 1, `posisi hari ${d + 1}`);
    ok(s.get().ship === (d === 6), `kapal hanya di hari 7 (d=${d})`);
  }
  // 2) siklus kedua, joran di hari 14
  for (let d = 7; d < 14; d++) {
    const r = s.claim(day0 + d * C.DAY_MS, { rnd, owned: [] });
    ok(r.ok && r.plan.cycle === 2 && r.plan.pos === d - 6, `siklus2 hari ${d + 1}`);
    ok(s.get().rod === (d === 13), `joran hanya di hari 14 (d=${d})`);
  }
  ok(s.get().ship && s.get().rod, "kapal & joran tetap dimiliki");
  // 3) siklus 3: perabot di hari 21, tanpa duplikat sampai pool habis
  const got = new Set();
  for (let cyc = 0; cyc < C.FURN_IDS.length; cyc++) {
    for (let p = 1; p <= 7; p++) {
      const d = 14 + cyc * 7 + (p - 1);
      const doc = s.get(), owned = C.FURN_IDS.filter((id) => (doc.furn || []).includes(id));
      const r = s.claim(day0 + d * C.DAY_MS, { rnd, owned });
      ok(r.ok && r.plan.cycle === 3 + cyc && r.plan.pos === p, `siklus ${3 + cyc} hari ${p}`);
      if (p === 7) { ok(!!r.plan.fid, "ada perabot di hari 7"); ok(!got.has(r.plan.fid), `tanpa duplikat (${r.plan.fid})`); got.add(r.plan.fid); }
      else ok(r.plan.fid === "", "bukan hari 7: tanpa perabot");
    }
  }
  ok(got.size === C.FURN_IDS.length, "13 siklus → 13 perabot berbeda");
  // pool habis → duplikat boleh
  for (let p = 1; p <= 7; p++) {
    const d = 14 + C.FURN_IDS.length * 7 + (p - 1), doc = s.get();
    const r = s.claim(day0 + d * C.DAY_MS, { rnd, owned: C.FURN_IDS });
    ok(r.ok, `setelah pool habis hari ${p}`);
    if (p === 7) ok(C.FURN_IDS.includes(r.plan.fid), "duplikat sah setelah semua dimiliki");
  }
}

// 4) satu klaim per hari
{
  const s = mkServer(); s.claim(day0, { rnd });
  ok(s.claim(day0 + 3600000, { rnd }).already, "klaim kedua di hari yang sama ditolak klien");
  const doc = s.get();
  const forged = Object.assign({}, doc, { total: 2, pos: 2, last: { cycle: 1, pos: 2, fid: "" } });
  forged.lastDay = C.dayIndex(day0);
  eq(s.write(forged, day0 + 3600000).denied, "sudah-klaim", "klaim ganda hari sama dipalsukan → ditolak server");
}
// 5) putus streak → Hari 1 di siklus yang sedang dikerjakan; barang tidak hilang
{
  const s = mkServer();
  for (let d = 0; d < 7; d++) s.claim(day0 + d * C.DAY_MS, { rnd });       // tamat siklus 1 (kapal)
  for (let d = 7; d < 10; d++) s.claim(day0 + d * C.DAY_MS, { rnd });     // siklus 2 hari 1-3
  const r = s.claim(day0 + 12 * C.DAY_MS, { rnd });                       // lewat 2 hari
  ok(r.ok && r.plan.cycle === 2 && r.plan.pos === 1 && r.plan.reset, "terputus → siklus 2 hari 1");
  ok(s.get().ship, "kapal tidak hilang saat streak putus");
  const st = C.status(s.get(), day0 + 12 * C.DAY_MS);
  ok(st.claimedToday && st.streak === 1, "status setelah reset");
  // melewatkan tepat satu hari kalender
  const s2 = mkServer(); for (let d = 0; d < 4; d++) s2.claim(day0 + d * C.DAY_MS, { rnd });
  const st2 = C.status(s2.get(), day0 + 5 * C.DAY_MS); // hari ke-6 (indeks 5): hari ke-5 terlewat
  ok(st2.canClaim && st2.lost && st2.brokenAt === 4 && st2.claimPos === 1, "status menandai streak putus");
  const r2 = s2.claim(day0 + 5 * C.DAY_MS, { rnd });
  ok(r2.plan.cycle === 1 && r2.plan.pos === 1 && r2.plan.reset, "lewat tepat satu hari → Hari 1");
}
// 6) tamat siklus lalu bolos lama → siklus berikutnya Hari 1 (tidak mengulang siklus yang sudah tamat)
{
  const s = mkServer(); for (let d = 0; d < 7; d++) s.claim(day0 + d * C.DAY_MS, { rnd });
  const r = s.claim(day0 + 30 * C.DAY_MS, { rnd });
  ok(r.ok && r.plan.cycle === 2 && r.plan.pos === 1 && !r.plan.reset, "tamat siklus 1 lalu bolos → siklus 2 hari 1");
}
// 7) pemalsuan ditolak
{
  const s = mkServer(); for (let d = 0; d < 3; d++) s.claim(day0 + d * C.DAY_MS, { rnd });
  const now = day0 + 3 * C.DAY_MS, doc = s.get();
  const good = C.planClaim(doc, now, { rnd }).next;
  const mut = (f) => { const x = JSON.parse(JSON.stringify(good)); f(x); return x; };
  ok(s.write(mut((x) => { x.pos = 7; x.last.pos = 7; }), now).denied, "loncat ke hari 7 ditolak");
  ok(s.write(mut((x) => { x.ship = true; }), now).denied, "kapal curang ditolak");
  ok(s.write(mut((x) => { x.rod = true; }), now).denied, "joran curang ditolak");
  ok(s.write(mut((x) => { x.total += 5; }), now).denied, "total curang ditolak");
  ok(s.write(mut((x) => { x.lastDay += 1; }), now).denied, "hari masa depan ditolak");
  ok(s.write(mut((x) => { x.lastDay -= 1; }), now).denied, "hari lampau ditolak");
  ok(s.write(mut((x) => { x.furn = ["rw_garudaEmas"]; x.last.fid = "rw_garudaEmas"; }), now).denied, "perabot di hari bukan-7 ditolak");
  ok(s.write(mut((x) => { x.extra = 1; }), now).denied, "kunci tambahan ditolak");
  ok(s.write(mut((x) => { x.cycle = 2; }), now).denied, "loncat siklus ditolak");
  // jam HP maju: klien memakai jam salah → server (jam asli) menolak
  const wrongClockPlan = C.planClaim(doc, now + 2 * C.DAY_MS, { rnd });
  ok(s.write(wrongClockPlan.next, now).denied, "jam HP dimajukan → server tolak (hari tidak cocok)");
  ok(s.write(good, now).ok, "klaim sah tetap lolos");
}
// 8) hadiah perabot palsu
{
  const s = mkServer(); let d = 0;
  for (; d < 14; d++) s.claim(day0 + d * C.DAY_MS, { rnd });
  for (let p = 1; p <= 6; p++, d++) s.claim(day0 + d * C.DAY_MS, { rnd });
  const now = day0 + d * C.DAY_MS, doc = s.get(), good = C.planClaim(doc, now, { rnd, owned: [] }).next;
  const mut = (f) => { const x = JSON.parse(JSON.stringify(good)); f(x); return x; };
  ok(s.write(mut((x) => { x.last.fid = "rw_tidakAda"; x.furn[x.furn.length - 1] = "rw_tidakAda"; }), now).denied, "id perabot tak dikenal ditolak");
  ok(s.write(mut((x) => { x.furn.push("rw_garudaEmas"); }), now).denied, "dua perabot sekaligus ditolak");
  ok(s.write(mut((x) => { x.last.fid = ""; }), now).denied, "hari 21 tanpa perabot ditolak");
  ok(s.write(good, now).ok, "hari 21 sah");
}
// 9) rarity: distribusi wajar & tanpa duplikat saat masih ada yang belum dimiliki
{
  const cnt = { biasa: 0, langka: 0, epik: 0, legenda: 0 }; const N = 20000; let s2 = 12345;
  const r2 = () => ((s2 = (s2 * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let i = 0; i < N; i++) cnt[C.FURN_BY_ID[C.pickFurniture([], [], r2)].rarity]++;
  ok(Math.abs(cnt.biasa / N - 0.55) < 0.03 && Math.abs(cnt.langka / N - 0.30) < 0.03 && Math.abs(cnt.epik / N - 0.12) < 0.02 && Math.abs(cnt.legenda / N - 0.03) < 0.01, "distribusi kelangkaan " + JSON.stringify(cnt));
  const all = new Set(C.FURN_IDS); all.delete("rw_garudaEmas");
  ok(C.pickFurniture([...all], [], r2) === "rw_garudaEmas", "satu-satunya yang belum dimiliki pasti dipilih");
  ok(C.FURN_POOL.every((f) => C.RARITY[f.rarity]) && C.FURN_POOL.length === 13, "13 perabot, semua kelangkaan valid");
}

// ---------- Rules: konstanta harus sama dengan core (pemeriksaan statis teks) ----------
const rules = fs.readFileSync(path.join(__dirname, "../firebase/firestore.rules"), "utf8");
ok(/users\/\{uid\}\/streak\/state/.test(rules), "Rules memuat users/{uid}/streak/state");
ok(rules.includes("25200000") && rules.includes("86400000"), "Rules memakai offset Asia/Jakarta (UTC+7) & hari 86400000 ms");
for (const id of C.FURN_IDS) ok(rules.includes(`'${id}'`), `Rules memuat id perabot ${id}`);
ok(/streakFurnIds\(\)\.size\(\)/.test(rules) || rules.includes("13"), "Rules membatasi duplikat sampai 13 perabot habis");
ok(!/allow delete: if true/.test(rules), "tidak ada delete terbuka");

console.log(`\nStreak core: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
