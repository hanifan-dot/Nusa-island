const assert = require("assert"); const C = require("../d1/core.js");
let n = 0; const T = async (name, f) => { await f(); n++; console.log("ok -", name); };
const H = (m) => ({ get: (k) => (m || {})[String(k).toLowerCase()] || null });
function mk(opts, replies) {
  const log = []; let tokens = 0, t = 1e9;
  const clock = { t: () => t, adv: (ms) => (t += ms) };
  const fetch = async (url, init) => { log.push({ url, init }); const r = replies.shift() || { status: 200, json: {} }; if (r.throw) throw new Error("net"); return { status: r.status, headers: H(r.headers), json: async () => r.json }; };
  const c = C.make(Object.assign({ base: "https://w.example", fetch, getToken: async () => (tokens++, "TKN"), now: clock.t, rand: () => 0.5 }, opts));
  return { c, log, clock, tokens: () => tokens };
}
(async () => {
  await T("mode off (bawaan/'on'/ngawur) = nol fetch & nol getToken", async () => {
    for (const m of [undefined, "off", "on", "ON", "xyz", null]) {
      const x = mk({ mode: m }, []); await x.c.podiumTop("catch"); await x.c.sf(); await x.c.getSave(); await x.c.getSave(true); await x.c.putSave({ baseRev: 0, opId: "abcdefgh", data: {} }); await x.c.req("x", "GET", "/status");
      assert.strictEqual(x.log.length, 0); assert.strictEqual(x.tokens(), 0); assert.strictEqual(x.c.stats().calls, 0); assert.strictEqual(x.c.mode(), "off");
    }
  });
  await T("shadow: podium tanpa uid, header hanya Bearer, cache 60 dtk, tak ada polling", async () => {
    const x = mk({ mode: "shadow" }, [{ status: 200, json: { rows: [{ rank: 1, name: "Aku", score: 9, outfit: null, uid: "SECRET", email: "e" }], asOf: 5 } }]);
    const a = await x.c.podiumTop("catch"); assert.ok(a.ok); assert.deepStrictEqual(Object.keys(a.rows[0]).sort(), ["name", "outfit", "rank", "score"]);
    assert.strictEqual(x.c.stats().sanitized, 1); assert.ok(!JSON.stringify(a).includes("SECRET"));
    const u = x.log[0]; assert.ok(u.url.startsWith("https://w.example/d1/v1/podium/top?board=catch")); assert.ok(!/uid|score|rank|role|coins/i.test(u.url.split("?")[1].replace("board=catch&limit=10", "")));
    assert.deepStrictEqual(Object.keys(u.init.headers), ["authorization"]); assert.strictEqual(u.init.body, undefined);
    x.clock.adv(59000); await x.c.podiumTop("catch"); await Promise.all([x.c.podiumTop("catch"), x.c.podiumTop("catch")]); assert.strictEqual(x.log.length, 1);
    assert.strictEqual((await x.c.podiumTop("hacker")).skipped, "bad-board"); assert.strictEqual(x.log.length, 1);
  });
  await T("shadow: SF — 'refs' dibuang, cache 5 mnt, tidak polling", async () => {
    const x = mk({ mode: "shadow" }, [{ status: 200, json: { exists: true, rev: 3, state: { sf: { refs: [1], a: 1 }, sf2: { p: 4, refs: { z: 1 } } } } }]);
    const r = await x.c.sf(); assert.ok(!JSON.stringify(r).includes("refs")); assert.strictEqual(r.state.sf2.p, 4);
    x.clock.adv(299000); await x.c.sf(); assert.strictEqual(x.log.length, 1); assert.ok(x.log[0].url.endsWith("/d1/v1/sf"));
    assert.deepStrictEqual(x.c.diffSf({ pity: 4 }, r.state), { pitySame: true, legacyPity: 4, d1Pity: 4 });
  });
  await T("ETag / 304", async () => {
    const x = mk({ mode: "shadow" }, [{ status: 200, headers: { etag: '"abc"' }, json: { exists: true, rev: 2, sha256: "a".repeat(64), size: 10, etag: '"abc"', data: { k: 1 } } }, { status: 304, headers: { etag: '"abc"' } }]);
    const a = await x.c.getSave(false); assert.strictEqual(a.etag, '"abc"'); assert.strictEqual(x.log[0].init.headers["if-none-match"], undefined);
    x.clock.adv(61000); const b = await x.c.getSave(false); assert.ok(b.notModified); assert.strictEqual(x.log[1].init.headers["if-none-match"], '"abc"'); assert.strictEqual(x.c.stats().attempt, 0);
  });
  await T("PUT dikunci di shadow: nol request, nol token", async () => {
    const x = mk({ mode: "shadow" }, []); const r = await x.c.putSave({ baseRev: 1, opId: "abcdefgh", data: { a: 1 } });
    assert.strictEqual(r.skipped, "shadow_readonly"); assert.strictEqual(x.log.length, 0); assert.strictEqual(x.tokens(), 0); assert.strictEqual(x.c.stats().putsBlocked, 1);
  });
  await T("PUT siap (jalur uji): whitelist, 409 tanpa menimpa/ulang, 5 mnt, tanpa confirmOverwrite/uid", async () => {
    const x = mk({ mode: "shadow", _allowWriteForTest: true }, [{ status: 200, json: { ok: true, rev: 5, sha256: "b".repeat(64), etag: '"e5"' } }, { status: 409, json: { conflict: { serverRev: 9, serverSha256: "c" } } }]);
    const r = await x.c.putSave({ baseRev: 4, opId: "op_12345678", deviceId: "d1", data: { a: 1 }, sha256: "b".repeat(64), uid: "EVIL", score: 9, confirmOverwrite: true, coins: 5 });
    assert.ok(r.ok); const body = JSON.parse(x.log[0].init.body); assert.deepStrictEqual(Object.keys(body).sort(), ["baseRev", "data", "deviceId", "opId", "sha256"]); assert.strictEqual(x.log[0].init.method, "PUT");
    assert.ok(!/uid|score|coins|confirmOverwrite/.test(x.log[0].init.body));
    assert.strictEqual((await x.c.putSave({ baseRev: 5, opId: "op_22222222", data: {} })).skipped, "terlalu-cepat"); assert.strictEqual(x.log.length, 1);
    assert.deepStrictEqual(x.c.planSave({ sha256: "b".repeat(64) }), { save: false, why: "tidak-berubah" });
    x.clock.adv(301000); assert.ok(x.c.planSave({ sha256: "d".repeat(64) }).save);
    const c = await x.c.putSave({ baseRev: 5, opId: "op_33333333", data: { z: 1 } }); assert.strictEqual(c.status, 409); assert.strictEqual(x.log.length, 2);
    x.clock.adv(301000); const again = await x.c.putSave({ baseRev: 5, opId: "op_44444444", data: { z: 1 } }); assert.strictEqual(again.skipped, "konflik-belum-diselesaikan"); assert.strictEqual(x.log.length, 2);   // tidak menimpa otomatis
    assert.strictEqual(x.c.planSave({ sha256: "e".repeat(64) }).save, false); x.c.resolveConflict(); assert.ok(x.c.planSave({ sha256: "e".repeat(64) }).save);
    assert.strictEqual((await x.c.putSave({ baseRev: -1, opId: "x", data: {} })).skipped, "bad-request");
  });
  await T("429/503: Retry-After + backoff eksponensial + jitter, tidak menembak selama diblokir", async () => {
    const x = mk({ mode: "shadow", rand: () => 1 }, [{ status: 429, headers: { "retry-after": "40" }, json: {} }, { status: 503, json: {} }, { status: 503, json: {} }, { status: 200, json: { rows: [] } }]);
    const a = await x.c.podiumTop("catch"); assert.strictEqual(a.status, 429); assert.ok(a.retryAfterMs >= 40000);
    const b = await x.c.podiumTop("species"); assert.strictEqual(b.skipped, "backoff"); assert.strictEqual(x.log.length, 1);
    x.clock.adv(41000); const c = await x.c.sf(); assert.strictEqual(c.status, 503); const w1 = c.retryAfterMs; x.clock.adv(w1 + 1); await x.c.getSave(true);
    const w2 = x.c.stats().blockedUntil - x.clock.t(); assert.ok(w2 > w1 - 1, "backoff membesar"); assert.ok(w2 <= 300000 * 1.3 + 1);
    assert.strictEqual(x.c.stats().calls, 3);
  });
  await T("offline/jaringan gagal: tidak melempar, tidak menyentuh data lokal, di-backoff", async () => {
    const x = mk({ mode: "shadow" }, [{ throw: 1 }]); const ls = { progress: 1 }; const r = await x.c.sf(); assert.ok(r.offline); assert.deepStrictEqual(ls, { progress: 1 });
    assert.strictEqual((await x.c.getSave()).skipped, "backoff"); assert.strictEqual(x.log.length, 1);
  });
  await T("404 (D1 server off) → berhenti 30 menit; tanpa token → tanpa request", async () => {
    const x = mk({ mode: "shadow" }, [{ status: 404, json: {} }]); await x.c.sf(); x.clock.adv(600000); assert.strictEqual((await x.c.getSave()).skipped, "server-off"); assert.strictEqual(x.log.length, 1);
    const y = mk({ mode: "shadow", getToken: async () => null }, []); assert.strictEqual((await y.c.sf()).skipped, "no-token"); assert.strictEqual(y.log.length, 0);
  });
  await T("diffPodium", async () => { const x = mk({ mode: "shadow" }, []); assert.ok(x.c.diffPodium([{ rank: 1, name: "A", score: 3 }], [{ rank: 1, name: "A", score: 3 }]).same); assert.ok(!x.c.diffPodium([{ rank: 1, name: "A", score: 3 }], [{ rank: 1, name: "B", score: 3 }]).same); });
  console.log("unit-d1 OK:", n);
})().catch((e) => { console.error(e); process.exit(1); });
