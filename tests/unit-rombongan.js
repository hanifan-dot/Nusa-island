const a = require("assert"), C = require("../rombongan/core.js"); let n = 0; const T = (m, f) => { f(); n++; console.log("ok -", m); };
const boat = (seats, o) => Object.assign({ id: "b1", x: 37.2, y: 23.4, d: 2, v: 0, anchor: true, away: false, seats }, o || {});
T("kursi: kapten di kemudi, penumpang depan di haluan, belakang di buritan; semua di badan kapal", () => {
  const p = { x: 37.2, y: 23.4, d: 2 }, f = C.fwd(C.angleOf(2)), s = [0, 1, 2].map((i) => C.seatTile(p, i, 1.12, 0.4));
  const u = s.map((q) => (q.x - p.x) * f.x + (q.y - p.y) * f.y);
  a.ok(u[1] > u[0] && u[0] > u[2], "urutan haluan→buritan: depan > kapten > belakang");
  s.forEach((q) => a.ok(Math.hypot(q.x - p.x, q.y - p.y) < 1.12));
  a.strictEqual(new Set(s.map((q) => q.x.toFixed(3) + q.y.toFixed(3))).size, 3);
});
T("semua arah 0..7: kursi mengikuti arah kapal, sama untuk semua klien (fungsi murni)", () => { for (let d = 0; d < 8; d++) { const q1 = C.seatTile({ x: 5, y: 6, d }, 1, 1.12, 0.4), q2 = C.seatTile({ x: 5, y: 6, d }, 1, 1.12, 0.4); a.deepStrictEqual(q1, q2); a.strictEqual(C.charDir(d), d); } });
T("steerFrom: ambang, arah 8, gas 1/2", () => { a.deepStrictEqual(C.steerFrom({ x: 0, y: 0, m: 0 }), { d: null, th: 0 }); a.deepStrictEqual(C.steerFrom({ x: 1, y: 0, m: 0.4 }), { d: 0, th: 1 }); a.deepStrictEqual(C.steerFrom({ x: 0, y: 1, m: 1 }), { d: 2, th: 2 }); a.deepStrictEqual(C.steerFrom({ x: -1, y: 0, m: 1 }), { d: 4, th: 2 }); a.deepStrictEqual(C.steerFrom(null), { d: null, th: 0 }); });
T("boardable/seatFree: hanya jangkar turun & berhenti & tidak berlayar", () => { a.ok(C.boardable(boat([1, 0, 0]))); a.ok(!C.boardable(boat([1, 0, 0], { anchor: false }))); a.ok(!C.boardable(boat([1, 0, 0], { v: 1.6 }))); a.ok(!C.boardable(boat([1, 0, 0], { away: true }))); a.ok(C.seatFree(boat([1, 0, 0]), 1)); a.ok(!C.seatFree(boat([1, 2, 0]), 1)); });
T("tracker: naik → melompat ke kursi lalu duduk", () => {
  const tr = C.tracker(), pres = () => true, st = { x: 35, y: 21, z: 4 };
  tr.sync(0, [boat([1, 0, 0])], pres, () => null, () => null); a.strictEqual(tr.pose(1, 0.1, { x: 37, y: 23 }, 13).mode, "sit");
  tr.sync(1, [boat([1, 2, 0])], pres, (pid) => (pid === 2 ? st : null), () => null);
  const p0 = tr.pose(2, 1.0, { x: 37.5, y: 23.8 }, 13), pm = tr.pose(2, 1.4, { x: 37.5, y: 23.8 }, 13), p1 = tr.pose(2, 2.2, { x: 37.5, y: 23.8 }, 13);
  a.strictEqual(p0.mode, "board"); a.ok(Math.abs(p0.x - 35) < 0.01); a.ok(pm.z > 13 && pm.x > 35 && pm.x < 37.5, "lompat di tengah"); a.strictEqual(p1.mode, "sit"); a.strictEqual(p1.x, 37.5);
});
T("tracker: kapten pergi → penumpang naik jadi kapten (swap) dan pelaku lama bergerak turun (ghost)", () => {
  const tr = C.tracker(), pres = () => true; tr.sync(0, [boat([1, 2, 3])], pres, () => null, () => null);
  const last = (pid) => ({ x: 37 + pid * 0.1, y: 23, z: 13 });
  tr.sync(5, [boat([2, 0, 3])], pres, () => null, last);   // kapten 1 turun, penumpang 2 pindah ke kursi 0
  a.strictEqual(tr.ghosts.length, 1); a.strictEqual(tr.ghosts[0].pid, 1);
  const g = tr.ghostPose(tr.ghosts[0], 5.4, { x: 35.5, y: 20.6, z: 4 }); a.strictEqual(g.mode, "leave"); a.ok(g.x < 37.1 && g.x > 35.5);
  const sw = tr.pose(2, 5.2, { x: 37.1, y: 23, }, 13); a.strictEqual(sw.mode, "swap");
  a.strictEqual(tr.pose(2, 6.5, { x: 37.1, y: 23 }, 13).mode, "sit"); a.strictEqual(tr.ghostPose(tr.ghosts[0], 6.2, { x: 0, y: 0 }), null);
  tr.sync(6.3, [boat([2, 0, 3])], pres, () => null, last); a.strictEqual(tr.ghosts.length, 0);
});
T("tracker: putus → kursi tertahan (tanpa ghost) → pid baru di kursi sama = sambung ulang (bukan naik dari dermaga)", () => {
  const tr = C.tracker(); let here = new Set([1, 2]); const pres = (p) => here.has(p);
  tr.sync(0, [boat([1, 2, 0])], pres, () => null, () => null);
  here = new Set([1]); tr.sync(3, [boat([1, 2, 0])], pres, () => null, () => null);
  a.ok(tr.isHeld("b1", 1)); a.strictEqual(tr.ghosts.length, 0, "tertahan tidak memunculkan animasi turun");
  here = new Set([1, 9]); tr.sync(10, [boat([1, 9, 0])], pres, (pid) => ({ x: 0, y: 0, z: 0 }), () => null);
  a.ok(!tr.isHeld("b1", 1)); const p = tr.pose(9, 10.1, { x: 37.5, y: 23.8 }, 13); a.strictEqual(p.mode, "return"); a.strictEqual(p.x, 37.5);
});
T("tracker: kursi tertahan habis (20 dtk) → kosong tanpa ghost; kapal bubar membersihkan", () => {
  const tr = C.tracker(); let here = new Set([1, 2]); const pres = (p) => here.has(p);
  tr.sync(0, [boat([1, 2, 0])], pres, () => null, () => null); here = new Set([1]); tr.sync(2, [boat([1, 2, 0])], pres, () => null, () => null);
  tr.sync(23, [boat([1, 0, 0])], pres, () => null, () => null); a.strictEqual(tr.ghosts.length, 0); a.ok(!tr.isHeld("b1", 1)); a.ok(!tr.seatOf.has(2));
  tr.sync(24, [], pres, () => null, () => null); a.ok(!tr.seatOf.has(1)); tr.clear(); a.strictEqual(tr.seatOf.size, 0);
});
T("publicBoat: hanya id publik/nama publik; tak ada UID, posisi pemain, koin", () => {
  const raw = Object.assign(boat([1, 2, 3]), { uid: "BOCOR", token: "x", coins: 99 }), v = C.publicBoat(raw, (p) => "P" + p), js = JSON.stringify(v);
  a.ok(!/BOCOR|token|coins|uid/i.test(js)); a.strictEqual(v.seats[0].name, "P1"); a.deepStrictEqual(Object.keys(v).sort(), ["anchor", "away", "d", "id", "seats", "v"]);
  a.strictEqual(C.publicBoat(null), null); a.strictEqual(C.publicBoat(boat([0, 0, 0]), null).seats[0].pid, null);
});
T("reasonText: semua alasan kontrak punya pesan Indonesia; tak dikenal → pesan aman", () => { for (const r of ["off", "hidden", "aboard", "full", "far", "none", "away", "moving", "seat", "captain", "anchor", "early", "same"]) a.ok(C.reasonText(r).length > 5); a.ok(/Coba lagi/.test(C.reasonText("<script>"))); });
T("styleFor stabil per id", () => { a.deepStrictEqual(C.styleFor("b3"), C.styleFor("b3")); a.ok(C.styleFor("b3").hull); });
console.log("unit-rombongan OK:", n);
