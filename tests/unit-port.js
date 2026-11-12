// Uji unit PR-A4: delivery/core.js (opBook, classifyErr, tripStage, deliverResult). Tanpa jaringan.
const D = require("../delivery/core.js"); let f = 0;
const ok = (n, c, x) => { if (c) console.log("PASS ", n); else { f++; console.log("FAIL ", n, x === undefined ? "" : JSON.stringify(x)); } };
const vw = (a, b) => ({ need: 6, per: 3, delivered: 0, boxes: [{ st: a[0], n: a[1] }, { st: b[0], n: b[1] }] });
ok("area = selat/muara (tanpa ID area baru)", D.PORT_AREA === "selat" && D.HOME_AREA === "muara");
ok("tripStage none/ready/away/port", D.tripStage(null, "muara") === "none" && D.tripStage(vw(["idle", 0], ["idle", 0]), "muara") === "none" && D.tripStage(vw(["idle", 3], ["idle", 3]), "muara") === "ready" && D.tripStage(vw(["sailing", 3], ["sailing", 3]), "muara") === "away" && D.tripStage(vw(["sailing", 3], ["idle", 0]), "selat") === "port");
ok("sailingBoxes / idleLoaded", JSON.stringify(D.sailingBoxes(vw(["sailing", 3], ["idle", 3]))) === "[0]" && JSON.stringify(D.idleLoaded(vw(["sailing", 3], ["idle", 3]))) === "[1]" && D.idleLoaded(vw(["idle", 0], ["idle", 0])).length === 0);
const ob = D.opBook(() => "op-" + Math.random().toString(36).slice(2, 12));
const a = ob.get("deliver", 0), b = ob.get("deliver", 0), c = ob.get("deliver", 1);
ok("opBook: opId sama dipakai ulang sampai selesai, beda per kotak", a === b && a !== c && /^[A-Za-z0-9_-]{8,60}$/.test(a));
ob.done("deliver", 0); ok("opBook: setelah selesai opId baru", ob.get("deliver", 0) !== a);
ok("classifyErr: jaringan/5xx/429 = unknown; penolakan = rejected", D.classifyErr({ code: "unavailable" }) === "unknown" && D.classifyErr({ status: 503 }) === "unknown" && D.classifyErr(new TypeError("x")) === "unknown" && D.classifyErr({ status: 429 }) === "unknown" && D.classifyErr({ status: 409, code: "failed-precondition" }) === "rejected");
const r = D.deliverResult({ moved: 3, fresh: true, reward: 0, damar: { need: 6, delivered: 3, boxes: [{ st: "idle", n: 0, fish: [] }, { st: "idle", n: 0, fish: [] }] } });
ok("deliverResult: reward 0 → tidak ditampilkan (null)", r && r.moved === 3 && r.reward === null && r.delivered === 3 && r.need === 6, r);
ok("deliverResult: reward server >0 dipakai apa adanya, bukan 900+300", D.deliverResult({ moved: 3, reward: 777, damar: { need: 6, delivered: 6, boxes: [{ st: "idle", n: 0, fish: [] }, { st: "idle", n: 0, fish: [] }] } }).reward === 777);
ok("deliverResult: respons tak sah → null", D.deliverResult(null) === null && D.deliverResult({ ok: false }) === null);
ok("deliverResult: reward tak wajar dibatasi, bukan angka → null", D.deliverResult({ moved: 1, reward: "abc" }).reward === null && D.deliverResult({ moved: 1, reward: 1e12 }).reward <= 1e7);
process.exit(f ? 1 : 0);
