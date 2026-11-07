// Uji penghitung statistik Podium Juara di economy/core.js (eco.lb): sekali per paket, idempoten, rollback, tidak reset saat jual,
// dan TIDAK mengubah saldo/kotak/reward/progres (dibandingkan dengan inti SEBELUM perubahan, git HEAD~ = sumber lama).
const assert = require("assert"), fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const NEW = require("../economy/core.js"), FM = require("../fishmath.js"), T = require("../economy/tables.js");
let oldSrc = null; try { oldSrc = cp.execSync("git show fitur/leaderboard-fisik-20261107:economy/core.js", { cwd: path.join(__dirname, ".."), stdio: ["ignore", "pipe", "ignore"] }).toString(); } catch (e) { console.log("SKIP regresi vs inti lama: cabang acuan tidak ada (sudah di-merge)"); }
const oldPath = path.join(os.tmpdir(), "economy-core-old-" + process.pid + ".js"); const OLD = oldSrc ? (fs.writeFileSync(oldPath, oldSrc), require(oldPath)) : null;
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log("ok  " + name); } catch (e) { console.log("FAIL " + name + "\n  " + e.stack.split("\n").slice(0, 3).join("\n  ")); process.exitCode = 1; } };
function mkdb() { const m = new Map(); const rd = (p) => (m.has(p) ? JSON.parse(m.get(p)) : null); let q = Promise.resolve();
  return { m, get: async (p) => rd(p), tx: (fn) => { const run = q.then(async () => { const buf = new Map(); const out = await fn({ get: async (p) => (buf.has(p) ? JSON.parse(buf.get(p)) : rd(p)), set: async (p, o) => { buf.set(p, JSON.stringify(o)); } }); for (const [p, v] of buf) m.set(p, v); return out; }); q = run.catch(() => {}); return run; } }; }
let now = 1e12; const mk = (EC) => { const db = mkdb(); return { db, e: EC.makeEconomyServer(db, { clock: () => now, tables: T, fishmath: FM, trustClientInit: true }) }; };
const U = { uid: "user1" }; let k = 0; const op = () => "op" + String(++k).padStart(8, "0"), fid = () => "fish" + String(++k).padStart(8, "0");
const ids = T.FISH.filter((f) => !f.protected).map((f) => f.id), prot = T.FISH.find((f) => f.protected);
const wOf = (id) => T.FISH.find((f) => f.id === id).wMin;
const lbOf = (db) => (JSON.parse(db.m.get("shop/economy/user1") || "{}").lb) || null;
(async () => {
  await t("tangkapan tunggal & paket dihitung tepat; spesies berbeda dihitung", async () => { const { e, db } = mk(NEW); await e.ecoInit(U, {});
    now += 2000; await e.ecoCatch(U, { opId: op(), id: ids[0], w: wOf(ids[0]), uid: fid() });
    now += 20000; await e.ecoCatch(U, { opId: op(), items: [ids[0], ids[1], ids[1]].map((id) => ({ id, w: wOf(id), uid: fid() })) });
    const lb = lbOf(db); assert.equal(lb.c, 4); assert.equal(lb.n, 2); assert.deepStrictEqual(lb.sp, { [ids[0]]: 2, [ids[1]]: 2 }); assert.equal(lb.t, now); });
  await t("idempoten: opId yang sama (klik ganda/ulang) tidak menghitung dua kali", async () => { const { e, db } = mk(NEW); await e.ecoInit(U, {}); const c = { opId: op(), id: ids[0], w: wOf(ids[0]), uid: fid() };
    now += 2000; await e.ecoCatch(U, c); await e.ecoCatch(U, c); await e.ecoCatch(U, c); assert.equal(lbOf(db).c, 1); });
  await t("paralel: banyak panggilan serentak (opId berbeda) → jumlah persis sama dengan yang lolos validasi", async () => { const { e, db } = mk(NEW); await e.ecoInit(U, {}); now += 5000;
    const rs = await Promise.allSettled(Array.from({ length: 8 }, () => e.ecoCatch(U, { opId: op(), id: ids[0], w: wOf(ids[0]), uid: fid() })));
    const okN = rs.filter((r) => r.status === "fulfilled").length; assert.ok(okN >= 1); assert.equal(lbOf(db).c, okN); });
  await t("ditolak (spesies/berat salah, terlalu cepat, UID ganda) → rollback: statistik tidak berubah", async () => { const { e, db } = mk(NEW); await e.ecoInit(U, {}); now += 2000;
    const u = fid(); await e.ecoCatch(U, { opId: op(), id: ids[0], w: wOf(ids[0]), uid: u }); const before = JSON.stringify(lbOf(db));
    await assert.rejects(() => e.ecoCatch(U, { opId: op(), id: "palsu", w: 1, uid: fid() }));
    await assert.rejects(() => e.ecoCatch(U, { opId: op(), id: ids[0], w: 99999, uid: fid() }));
    await assert.rejects(() => e.ecoCatch(U, { opId: op(), id: ids[0], w: wOf(ids[0]), uid: fid() }), /cepat/);        // jeda belum lewat
    now += 5000; await assert.rejects(() => e.ecoCatch(U, { opId: op(), items: [{ id: ids[0], w: wOf(ids[0]), uid: u }, { id: ids[1], w: wOf(ids[1]), uid: fid() }] }), /sudah ada/);   // paket gagal di tengah
    assert.equal(JSON.stringify(lbOf(db)), before); });
  await t("ikan dilindungi (protected) dihitung sebagai tangkapan; menjual ikan TIDAK mereset statistik", async () => { const { e, db } = mk(NEW); await e.ecoInit(U, {}); now += 2000;
    const f1 = fid(); await e.ecoCatch(U, { opId: op(), id: ids[0], w: wOf(ids[0]), uid: f1 }); now += 2000; await e.ecoCatch(U, { opId: op(), id: prot.id, w: prot.wMin });
    assert.equal(lbOf(db).c, 2); await e.ecoSell(U, { opId: op(), uids: [f1], day: 3 }); assert.equal(lbOf(db).c, 2); assert.equal(lbOf(db).n, 2); });
  await t("dokumen lama tanpa `lb` mulai dari 0 dan tetap utuh; `lb` tidak ikut respons ke klien", async () => { const { e, db } = mk(NEW); await e.ecoInit(U, {}); assert.equal(lbOf(db), null); now += 2000;
    const r = await e.ecoCatch(U, { opId: op(), id: ids[0], w: wOf(ids[0]), uid: fid() }); assert.ok(!("lb" in r)); assert.ok(!JSON.stringify(r).includes('"sp"')); assert.equal(lbOf(db).c, 1);
    assert.ok(!JSON.stringify(await e.ecoState(U)).includes('"lb"')); });
  if (OLD) await t("REGRESI: saldo, kotak, reward, ops & seluruh dokumen ekonomi identik dengan inti lama (kecuali `lb`)", async () => {
    const A = mk(OLD), B = mk(NEW), run = async (s) => { now = 1e12; await s.e.ecoInit(U, {}); k = 0; const out = [];
      for (let i = 0; i < 6; i++) { now += 2000; out.push(await s.e.ecoCatch(U, { opId: "opR" + i + "xxxxxxxx", id: ids[i % 3], w: wOf(ids[i % 3]), uid: "fR" + i + "xxxxxxxx" }).catch((x) => x.message)); }
      now += 30000; out.push(await s.e.ecoCatch(U, { opId: "opRPxxxxxxxx", id: prot.id, w: prot.wMin }));
      out.push(await s.e.ecoSell(U, { opId: "opRSxxxxxxxx", uids: ["fR0xxxxxxxx", "fR1xxxxxxxx"], day: 3 })); return JSON.stringify(out); };
    const ra = await run(A), rb = await run(B); assert.equal(ra, rb, "respons API identik");
    const da = JSON.parse(A.db.m.get("shop/economy/user1")), db = JSON.parse(B.db.m.get("shop/economy/user1")); const lb = db.lb; delete db.lb; assert.deepStrictEqual(db, da); assert.ok(lb && lb.c === 7); });
  await t("Functions lib sama dengan sumber (salinan tidak basi)", () => { const root = path.join(__dirname, ".."); assert.equal(fs.readFileSync(path.join(root, "firebase/functions/lib/economy-core.js"), "utf8").split("\n").slice(1).join("\n"), fs.readFileSync(path.join(root, "economy/core.js"), "utf8")); });
  console.log(`\n${n} uji lulus`);
})();
