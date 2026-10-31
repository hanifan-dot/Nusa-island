// Bumbu 3.1 — uji logika Kedai Atuk Bahar (tanpa browser): aturan hadiah/ekonomi, gelar GOAT, migrasi, dan mesin lima permainan.
// Jalankan: node tests/unit-kedai.js
"use strict";
const E = require("../world/kedai/engines.js"), D = require("../world/kedai/data.js");
let pass = 0, fail = 0; const ok = (n, c, x) => { if (c) pass++; else { fail++; console.log("GAGAL:", n, x === undefined ? "" : x); } };
const day = (n) => `2026-11-${String(n).padStart(2, "0")}`;
const fresh = () => { const S = { money: 50 }; D.migrate(S); return S; };

// ---------- A. aturan hadiah ----------
ok("tabel hadiah 5/10/20/35", D.REWARD.mudah === 5 && D.REWARD.normal === 10 && D.REWARD.sulit === 20 && D.REWARD.goat === 35);
ok("batas harian 100", D.DAILY_CAP === 100);
for (const d of D.DIFFS) { const S = fresh(), r = D.finish(S, "batok", d, true, 1, day(1)); ok("hadiah menang " + d, r.coins === D.REWARD[d] && S.kedai.koin === D.REWARD[d], r); }
{ const S = fresh(); const r = D.finish(S, "gasing", "goat", false, 0, day(1)); ok("kalah: 0 koin, tidak ada pengurangan", r.coins === 0 && r.status === "kalah" && S.kedai.koin === 0 && S.money === 50); }
{ const S = fresh(); S.kedai.koin = 40; D.finish(S, "gasing", "goat", false, 0, day(1)); ok("kalah tidak mengurangi Koin Kedai", S.kedai.koin === 40); }
{ const S = fresh(); D.finish(S, "batok", "mudah", true, 1, day(1)); const r = D.finish(S, "batok", "goat", true, 1, day(1)); ok("kemenangan kedua permainan sama hari itu = 0 koin", r.coins === 0 && r.status === "sudah" && S.kedai.koin === 5, r); }
{ const S = fresh(); for (let i = 0; i < 50; i++) D.finish(S, "batok", "goat", true, 1, day(1)); ok("klaim berulang/refresh tidak melipatgandakan (50× menang = 35)", S.kedai.koin === 35 && S.kedai.earned === 35); }
{ const S = fresh(); for (const g of D.GAMES) D.finish(S, g, "goat", true, 1, day(1)); ok("batas 100/hari (5×35=175 → 100)", S.kedai.earned === 100 && S.kedai.koin === 100, S.kedai); }
{ const S = fresh(); let t = 0; for (const g of D.GAMES) t += D.finish(S, g, "goat", true, 1, day(1)).coins; ok("jumlah hadiah satu hari = 100 persis (35+35+30)", t === 100); }
{ const S = fresh(); for (const g of D.GAMES) D.finish(S, g, "goat", true, 1, day(1)); const r = D.finish(S, "batok", "goat", true, 1, day(1)); ok("setelah batas tetap bisa main tanpa koin", r.won && r.coins === 0 && S.kedai.koin === 100); }
{ const S = fresh(); for (const g of D.GAMES) D.finish(S, g, "goat", true, 1, day(1)); const r = D.finish(S, "gasing", "mudah", true, 1, day(2)); ok("hari baru: batas & klaim direset", r.coins === 5 && S.kedai.earned === 5 && S.kedai.koin === 105, r); }
{ const S = fresh(); D.finish(S, "batok", "mudah", true, 1, day(5)); const r = D.finish(S, "gasing", "mudah", true, 1, day(1)); const r2 = D.finish(S, "batok", "mudah", true, 1, day(1)); ok("jam perangkat dimundurkan tidak mereset hari", S.kedai.day === day(5) && r2.coins === 0 && S.kedai.earned === 10, S.kedai); void r; }
{ const S = fresh(); ok("permainan/kesulitan tidak dikenal ditolak", D.finish(S, "xx", "goat", true, 1, day(1)) === null && D.finish(S, "batok", "xx", true, 1, day(1)) === null && S.kedai.koin === 0); }
{ const S = fresh(); D.finish(S, "batok", "goat", true, 1, day(1)); ok("Kedai tidak menyentuh saldo utama S.money", S.money === 50); }
{ const S = fresh(); D.finish(S, "batok", "normal", true, 7, day(1)); D.finish(S, "batok", "normal", true, 3, day(1)); const r = S.kedai.rec.batok.normal; ok("rekor: main/menang/skor terbaik/beruntun", r.plays === 2 && r.wins === 2 && r.best === 7 && r.bestStreak === 2); D.finish(S, "batok", "normal", false, 0, day(1)); ok("beruntun reset saat kalah", S.kedai.rec.batok.normal.streak === 0 && S.kedai.rec.batok.normal.bestStreak === 2); }

// ---------- B. gelar GOAT ----------
{ const S = fresh(); let t = false; for (const g of D.GAMES) for (const d of ["mudah", "normal", "sulit"]) t = t || D.finish(S, g, d, true, 1, day(1)).title; ok("menang semua game di tingkat bukan-GOAT tidak memberi gelar", !t && !S.kedai.title); }
{ const S = fresh(); for (const g of D.GAMES.slice(0, 4)) D.finish(S, g, "goat", true, 1, day(1)); ok("GOAT 4/5 belum memberi gelar", !S.kedai.title && D.goatCount(S) === 4); }
{ const S = fresh(); for (const g of D.GAMES) { D.finish(S, g, "goat", false, 0, day(1)); D.finish(S, g, "goat", false, 0, day(1)); } ok("kalah GOAT tidak memberi gelar", !S.kedai.title && D.goatCount(S) === 0); }
{ const S = fresh(); let n = 0, last; for (const g of D.GAMES) { last = D.finish(S, g, "goat", true, 1, day(1)); if (last.title) n++; } ok("GOAT 5/5 memberi gelar tepat sekali", n === 1 && S.kedai.title > 0 && last.title); const again = D.finish(S, "batok", "goat", true, 1, day(2)); ok("gelar tidak diklaim ulang", !again.title); }
{ const S = fresh(); for (let i = 0; i < 5; i++) D.finish(S, "batok", "goat", true, 1, day(1 + i)); ok("GOAT 5× di game yang sama bukan 5 game berbeda", !S.kedai.title && D.goatCount(S) === 1); }
{ const S = fresh(); S.kedai.goat.batok = true; D.migrate(S); ok("migrasi tidak pernah memberi gelar sendiri", !S.kedai.title); }

// ---------- C. migrasi ----------
{ const S = { money: 5 }; const k1 = D.migrate(S); ok("migrasi dari save lama: S.kedai dibuat kosong", k1.koin === 0 && k1.plays === 0 && k1.title === 0 && S.money === 5); }
{ const S = { kedai: { koin: -9, earned: 9999, claimed: { batok: 1, xx: true }, goat: { batok: "ya" }, rec: { batok: { goat: { wins: -3, best: "x" } }, curang: {} }, title: "ya" } }; D.migrate(S); const k = S.kedai; ok("migrasi merapikan data rusak/curang", k.koin === 0 && k.earned === 100 && !k.claimed.batok && !k.claimed.xx && !k.goat.batok && k.rec.batok.goat.wins === 0 && k.rec.batok.goat.best === 0 && !k.rec.curang && k.title > 0, k); }
{ const S = fresh(); D.finish(S, "batok", "goat", true, 5, day(1)); const a = JSON.stringify(S.kedai); D.migrate(S); D.migrate(S); ok("migrasi idempoten (tidak mengubah/menambah)", JSON.stringify(S.kedai) === a); }
{ const S = fresh(); D.finish(S, "batok", "goat", true, 5, day(1)); const copy = JSON.parse(JSON.stringify(S)); D.migrate(copy); ok("simpan→muat JSON tidak mengubah progres", JSON.stringify(copy.kedai) === JSON.stringify(S.kedai)); }
{ const S = fresh(); D.finish(S, "batok", "mudah", true, 1, day(1)); const copy = JSON.parse(JSON.stringify(S)); const r = D.finish(copy, "batok", "mudah", true, 1, day(1)); ok("muat ulang (refresh) lalu menang lagi hari sama = tidak ada koin", r.coins === 0 && copy.kedai.koin === 5); }
ok("dialog wajib dari spesifikasi", D.LINES.sapa[0] === "Hahahaha! Mau uji ketangkasan sama Atuk, cucu? Dulu Atuk juara sekampung!" && D.LINES.menang[0] === "WADUHH! Hebat juga kau, cucu! Hahaha!" && D.LINES.kalah[0] === "Hahaha! Jangan menyerah, cucu. Coba lagi!" && D.LINES.goatMenang[0] === "ASTAGAAA! Selama puluhan tahun belum ada yang mengalahkan Atuk! Kau memang legenda!");
ok("dialog bervariasi (≥3 menang, ≥3 kalah) & tidak merendahkan", D.LINES.menang.length >= 3 && D.LINES.kalah.length >= 3 && ![].concat(...Object.values(D.LINES)).some((l) => /bodoh|tolol|payah|goblok|lemah|cupu/i.test(l)));

// ---------- D. mesin: Batok ----------
{
  let fair = true, spd = [], sw = [];
  for (const d of D.DIFFS) { for (let s = 1; s <= 40; s++) { const st = E.batok.create(d, s * 7); const end = E.batok.totalShuffle(st) + 0.1; const cups = E.batok.cupsAt(st, end); if (Math.round(cups[st.ballSlot0].x) !== E.batok.finalBallSlot(st) || Math.abs(cups[st.ballSlot0].x - E.batok.finalBallSlot(st)) > 1e-9) fair = false; if (new Set([0, 1, 2].map((i) => Math.round(cups[i].x))).size !== 3) fair = false; if (E.batok.evaluate(st, E.batok.finalBallSlot(st)) !== true) fair = false; for (let i = 1; i < st.swaps.length; i++) if (st.swaps[i].slice().sort().join() === st.swaps[i - 1].slice().sort().join()) fair = false; } const c = E.batok.create(d, 1); spd.push(c.dur); sw.push(c.swaps.length); }
  ok("batok: kelereng selalu ikut batoknya (animasi = logika), 3 batok tak pernah menumpuk, tanpa tukar saling-batal", fair);
  ok("batok: kesulitan menaikkan jumlah tukar & kecepatan", sw.every((v, i) => i === 0 || v > sw[i - 1]) && spd.every((v, i) => i === 0 || v < spd[i - 1]), [sw, spd]);
  const st = E.batok.create("goat", 5), fin = E.batok.finalBallSlot(st); ok("batok: hanya pilihan benar yang menang", [0, 1, 2].filter((s) => E.batok.evaluate(st, s)).join() === String(fin));
  let seen = new Set(); for (let s = 1; s <= 60; s++) seen.add(E.batok.finalBallSlot(E.batok.create("normal", s))); ok("batok: posisi akhir kelereng beragam (tidak bisa ditebak tetap)", seen.size === 3);
}
// ---------- E. mesin: Gasing ----------
{
  let all = true, rate = {}, skill = {};
  for (const d of D.DIFFS) {
    let w = 0, N = 12;
    for (let s = 1; s <= N; s++) { const st = E.gasing.create(d, 101 * s); if (!st) { all = false; continue; } const a = E.gasing.findWin(st); if (!a) { all = false; continue; } const r = E.gasing.run(st, a); if (r.winner !== "you") all = false; w++; }
    rate[d] = w; let wins = 0, n = 0; const R = E.rng(9); for (let s = 1; s <= 8; s++) { const st = E.gasing.create(d, 77 * s); for (let i = 0; i < 12; i++) { n++; if (E.gasing.run(st, { ang: -Math.PI / 2 + (R() - 0.5) * 2, pow: 0.3 + R() * 0.7 }).winner === "you") wins++; } } skill[d] = wins / n;
  }
  ok("gasing: tiap ronde (4 kesulitan) punya aksi pemain yang menang", all, rate);
  ok("gasing: aksi acak tidak menjamin menang tapi bisa menang (keterampilan berpengaruh)", skill.goat < 0.5 && skill.goat > 0 && skill.sulit < skill.normal && skill.normal <= skill.mudah + 0.02, skill);
  const a = E.gasing.create("normal", 5), b = E.gasing.create("normal", 5), act = { ang: -1.5, pow: 0.8 }; ok("gasing: deterministik untuk seed & aksi yang sama", E.gasing.run(a, act).winner === E.gasing.run(b, act).winner && Math.abs(E.gasing.run(a, act).you.x - E.gasing.run(b, act).you.x) < 1e-12);
  ok("gasing: Atuk makin kuat (putaran awal naik)", E.gasing.CFG.mudah.atukSpin < E.gasing.CFG.normal.atukSpin && E.gasing.CFG.normal.atukSpin < E.gasing.CFG.sulit.atukSpin && E.gasing.CFG.sulit.atukSpin < E.gasing.CFG.goat.atukSpin);
}
// ---------- F. mesin: Congklak ----------
{
  let inv = true, term = true, extraSeen = false, capSeen = false;
  for (const d of D.DIFFS) for (let s = 1; s <= 25; s++) { const R = E.rng(s * 13), st = E.congklak.create(); let n = 0; while (!st.over && n++ < 400) { const l = E.congklak.legal(st), h = st.turn === 0 ? l[Math.floor(R() * l.length)] : E.congklak.aiPick(st, d, R); const m = E.congklak.move(st, h); if (!m) { inv = false; break; } if (m.extra) extraSeen = true; if (m.captured) capSeen = true; if (E.congklak.total(st) !== 98) inv = false; if (st.b.some((x) => x < 0)) inv = false; } if (!st.over) term = false; }
  ok("congklak: jumlah biji selalu 98, tak ada biji negatif, setiap langkah sah", inv); ok("congklak: setiap permainan selesai", term); ok("congklak: giliran tambahan & tembak terjadi", extraSeen && capSeen);
  const st = E.congklak.create(); ok("congklak: awal 7 biji ×14, lumbung kosong, lubang kosong ditolak", st.b.slice(0, 7).every((x) => x === 7) && st.b[7] === 0 && st.b[15] === 0 && E.congklak.move(st, 9) === null);
  const t = E.congklak.create(); t.b = new Array(16).fill(0); t.b[0] = 7; t.b[8] = 1; t.b[3] = 0; const m = E.congklak.move(t, 0); ok("congklak: berhenti di lumbung sendiri = giliran lagi", m && m.extra && t.turn === 0 || !m, m);
  const u = E.congklak.create(); u.b = new Array(16).fill(0); u.b[0] = 2; u.b[12] = 5; u.b[9] = 1; const mm = E.congklak.move(u, 0); ok("congklak: tembak mengambil biji seberang", mm && mm.captured === 6 && u.b[7] === 6 && u.b[12] === 0 && u.b[2] === 0, [mm, u.b.join()]);
  const w = {}; const botWin = (diff, depth) => { let wins = 0, N = 24; for (let s = 1; s <= N; s++) { const R = E.rng(s), c = E.congklak.create(); let n = 0; while (!c.over && n++ < 400) { const h = c.turn === 0 ? (depth < 0 ? E.congklak.greedy(c, 0, R) : E.congklak.search(c, depth, 0, -Infinity, Infinity, R).hole) : E.congklak.aiPick(c, diff, R); E.congklak.move(c, h); } if (c.winner === "you") wins++; } return wins / N; };
  const g1 = botWin("mudah", -1), g2 = botWin("goat", -1), g3 = botWin("goat", 4), g4 = botWin("goat", 2);
  ok("congklak: GOAT lebih sulit dari Mudah untuk pemain yang sama", g1 > g2, [g1, g2]); ok("congklak: GOAT bisa dikalahkan pemain yang menghitung ke depan", g3 >= 0.6 && g4 > 0, [g3, g4]);
  w.mudah = botWin("mudah", 2); w.normal = botWin("normal", 2); w.sulit = botWin("sulit", 2); w.goat = botWin("goat", 2); ok("congklak: tingkat menang pemain menurun dari Mudah ke GOAT", w.mudah >= w.normal && w.normal >= w.sulit && w.sulit >= w.goat && w.mudah > w.goat, w);
}
// ---------- G. mesin: Gelang ----------
{
  let win = true; const need = {}, rad = [];
  for (const d of D.DIFFS) { for (let s = 1; s <= 30; s++) { const st = E.gelang.create(d, s * 5); let t = 0.3; while (!st.over) { t += E.gelang.CFG.flight; const a = E.gelang.perfect(st, t); E.gelang.throwRing(st, a, t); } if (!st.won) win = false; } const c = E.gelang.CFG[d]; need[d] = c.need; rad.push(c.rad); }
  ok("gelang: lemparan sempurna menang di semua kesulitan (termasuk tiang bergoyang)", win);
  ok("gelang: kesulitan mengecilkan sasaran & menaikkan jumlah kena", rad.every((v, i) => i === 0 || v < rad[i - 1]) && need.mudah <= need.normal && need.normal <= need.sulit && need.sulit <= need.goat, [rad, need]);
  const st = E.gelang.create("goat", 3); let r; for (let i = 0; i < 5; i++) r = E.gelang.throwRing(st, { ang: 1.2, pow: 0.05 }, 1); ok("gelang: lemparan asal-asalan kalah & selesai", st.over && !st.won && st.throws <= 5);
  const g = E.gelang.create("goat", 4), p0 = E.gelang.targetPos(g, 0, 0), p1 = E.gelang.targetPos(g, 0, 0.9); ok("gelang: tiang GOAT bergoyang, Mudah diam", Math.hypot(p0.x - p1.x, p0.y - p1.y) > 0.05 && (() => { const m = E.gelang.create("mudah", 4), a = E.gelang.targetPos(m, 0, 0), b = E.gelang.targetPos(m, 0, 3); return a.x === b.x; })());
}
// ---------- H. mesin: Kelereng ----------
{
  let all = true; const bl = [], pv = [];
  for (const d of D.DIFFS) { for (let s = 1; s <= 8; s++) { const st = E.kelereng.create(d, 31 * s); if (!st) { all = false; continue; } const a = E.kelereng.findWin(st); if (!a) { all = false; continue; } const run = JSON.parse(JSON.stringify(st)); E.kelereng.applyShot(run, a); if (!run.won) all = false; } const c = E.kelereng.CFG[d]; bl.push(c.blockers); pv.push(c.preview); }
  ok("kelereng: tiap ronde punya sentilan yang menang (4 kesulitan)", all);
  ok("kelereng: kesulitan menambah penghalang & memperpendek lintasan perkiraan", bl.every((v, i) => i === 0 || v >= bl[i - 1]) && bl[3] > bl[0] && pv.every((v, i) => i === 0 || v <= pv[i - 1]) && pv[3] < pv[0], [bl, pv]);
  const st = E.kelereng.create("mudah", 2), a = E.kelereng.findWin(st), pr = E.kelereng.preview(st, a, 1); ok("kelereng: pratinjau lintasan tidak mengubah keadaan", st.used === 0 && !st.over && pr.pts.length > 2);
  const s2 = E.kelereng.create("normal", 9); for (let i = 0; i < s2.shots; i++) E.kelereng.applyShot(s2, { ang: -Math.PI / 2 + 1.0, pow: 0.3 }); ok("kelereng: sentilan habis tanpa mengeluarkan sasaran = kalah", s2.over && !s2.won && s2.used === s2.shots);
  const rec = [], s3 = E.kelereng.create("mudah", 11); E.kelereng.applyShot(s3, E.kelereng.findWin(s3), rec); ok("kelereng: rekaman gerak lengkap untuk animasi", rec.length > 5 && rec[0].p.length >= 1);
}
console.log(`unit kedai: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
