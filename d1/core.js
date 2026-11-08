// NUSA ISLAND — adapter D1 (inti murni, tanpa DOM). Mode: "off" (BAWAAN: nol request) | "shadow" (hanya BACA/bandingkan; legacy tetap otoritatif).
// Mode "on"/cutover SENGAJA tidak ada. Identitas = Firebase ID token milik pemain (header Authorization); klien TIDAK PERNAH mengirim uid, skor, rank, Pity, koin atau role.
// Kontrak: backend PR #46 (docs/D1-FONDASI.md). Semua jalur dibuat dengan: tanpa polling, jeda minimal, backoff eksponensial + jitter, hormati Retry-After.
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.NusaD1Core = factory(); })(typeof self !== "undefined" ? self : this, function () {
"use strict";
const PATHS = { status: "/status", save: "/save", revisions: "/save/revisions", rollback: "/save/rollback", sf: "/sf", podium: "/podium/top" };
const BOARDS = ["catch", "species"];
const MIN_MS = 60000, SAVE_MIN_MS = 300000, SF_MIN_MS = 300000;      // podium ≥60 dtk (cache), SF ≥5 mnt, simpan nyata ≥5 mnt
const BACKOFF = { baseMs: 2000, maxMs: 300000, factor: 2, jitter: 0.3 };
const OFF_BLOCK_MS = 30 * 60000;                                      // server menjawab 404 (mode off) → jangan coba lagi 30 menit
const OPID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const PUT_KEYS = ["baseRev", "opId", "deviceId", "data", "sha256"];     // whitelist KERAS isi PUT
const clip = (s, n) => String(s == null ? "" : s).slice(0, n);

function make(o) {
  o = o || {};
  const now = o.now || Date.now, rand = o.rand || Math.random, fetchFn = o.fetch;
  const mode = () => (o.mode === "shadow" ? "shadow" : "off");        // apa pun selain "shadow" = off
  const st = { attempt: 0, blockedUntil: 0, serverOffUntil: 0, calls: 0, byPath: {}, last: {}, etag: null, rev: null, conflict: null, lastPutAt: 0, lastSha: null, inflight: {}, cache: {}, sanitized: 0, putsBlocked: 0 };
  const canWrite = () => o._allowWriteForTest === true && mode() === "shadow";   // tidak pernah true di klien produksi
  function backoffMs(retryAfterSec) {
    const exp = Math.min(BACKOFF.maxMs, BACKOFF.baseMs * Math.pow(BACKOFF.factor, Math.max(0, st.attempt)));
    const j = exp * BACKOFF.jitter * (rand() * 2 - 1);
    return Math.min(BACKOFF.maxMs, Math.max(Math.round(exp + j), Number.isFinite(retryAfterSec) ? Math.round(retryAfterSec * 1000) : 0));
  }
  // satu-satunya pintu jaringan
  async function req(key, method, path, o2) {
    o2 = o2 || {};
    if (mode() !== "shadow") return { ok: false, skipped: "off" };                       // NOL request & nol getToken
    if (!o.base || typeof fetchFn !== "function") return { ok: false, skipped: "no-base" };
    const t = now();
    if (st.serverOffUntil > t) return { ok: false, skipped: "server-off" };
    if (st.blockedUntil > t) return { ok: false, skipped: "backoff", retryInMs: st.blockedUntil - t };
    let token = null; try { token = o.getToken ? await o.getToken() : null; } catch (e) { token = null; }
    if (!token) return { ok: false, skipped: "no-token" };
    const headers = { authorization: "Bearer " + token }; if (o2.body !== undefined) headers["content-type"] = "application/json"; if (o2.ifNoneMatch) headers["if-none-match"] = o2.ifNoneMatch;
    st.calls++; st.byPath[key] = (st.byPath[key] || 0) + 1;
    let res; try { res = await fetchFn(o.base.replace(/\/+$/, "") + "/d1/v1" + path + (o2.query || ""), { method, headers, body: o2.body !== undefined ? JSON.stringify(o2.body) : undefined }); }
    catch (e) { st.attempt++; st.blockedUntil = now() + backoffMs(); return { ok: false, offline: true, retryInMs: st.blockedUntil - now() }; }   // offline: tidak menyentuh data lokal
    const status = res.status, hd = (n) => (res.headers && res.headers.get ? res.headers.get(n) : null);
    let j = null; if (status !== 304) { try { j = await res.json(); } catch (e) { j = null; } }
    if (status === 304) { st.attempt = 0; return { ok: true, status, notModified: true, etag: hd("etag") || o2.ifNoneMatch || null }; }
    if (status === 429 || status === 503) { const ra = Number(hd("retry-after")); const w = backoffMs(ra); st.attempt++; st.blockedUntil = now() + w; return { ok: false, status, retryAfterMs: w, json: j }; }
    if (status === 404) { st.serverOffUntil = now() + OFF_BLOCK_MS; return { ok: false, status, skipped: "server-off" }; }
    if (status === 409) return { ok: false, status, conflict: (j && j.conflict) || {}, json: j };      // TIDAK diulang & TIDAK menimpa
    if (status >= 500) { st.attempt++; st.blockedUntil = now() + backoffMs(Number(hd("retry-after"))); return { ok: false, status, json: j }; }
    if (status >= 400) return { ok: false, status, json: j };
    st.attempt = 0; return { ok: true, status, json: j || {}, etag: hd("etag") };
  }
  function cached(key, ttl, fn) {
    const c = st.cache[key], t = now(); if (c && t - c.at < ttl) return Promise.resolve(Object.assign({ cached: true }, c.v));
    if (st.inflight[key]) return st.inflight[key];
    return (st.inflight[key] = (async () => { try { const v = await fn(); if (v && v.ok) st.cache[key] = { at: now(), v }; else if (v && v.skipped !== "off") st.cache[key] = { at: now() - ttl + Math.min(ttl, 15000), v }; return v; } finally { delete st.inflight[key]; } })());
  }
  // ---- Podium (hanya saat dibuka; cache ≥60 dtk; tanpa uid) ----
  const cleanRow = (r) => { if (r && typeof r === "object" && ("uid" in r || "userId" in r)) st.sanitized++; return { rank: Math.max(1, Math.min(999, r.rank | 0)), name: clip(r.name, 24), score: Math.max(0, Math.min(1e9, Math.floor(Number(r.score) || 0))), outfit: r.outfit && typeof r.outfit === "object" ? r.outfit : null }; };
  function podiumTop(board) {
    if (!BOARDS.includes(board)) return Promise.resolve({ ok: false, skipped: "bad-board" });
    if (mode() !== "shadow") return Promise.resolve({ ok: false, skipped: "off" });
    return cached("podium:" + board, MIN_MS, async () => { const r = await req("podium", "GET", PATHS.podium, { query: "?board=" + board + "&limit=10" }); if (!r.ok) return r; const rows = Array.isArray(r.json.rows) ? r.json.rows.slice(0, 50).map(cleanRow) : []; return { ok: true, board, rows, asOf: Number(r.json.asOf) || 0 }; });
  }
  // ---- Samudra Follower (baca-saja; 'refs' dibuang & tak pernah diminta) ----
  const strip = (v, d) => { if (!v || typeof v !== "object" || (d || 0) > 6) return v; if (Array.isArray(v)) return v.map((x) => strip(x, (d || 0) + 1)); const out = {}; for (const k of Object.keys(v)) { if (k === "refs") continue; out[k] = strip(v[k], (d || 0) + 1); } return out; };
  function sf() {
    if (mode() !== "shadow") return Promise.resolve({ ok: false, skipped: "off" });
    return cached("sf", SF_MIN_MS, async () => { const r = await req("sf", "GET", PATHS.sf); if (!r.ok) return r; const j = r.json || {}; return { ok: true, exists: !!j.exists, rev: Number(j.rev) || 0, state: strip(j.state || {}) }; });
  }
  // ---- Cloud Save: GET ETag/304 ----
  function getSave(meta) {
    if (mode() !== "shadow") return Promise.resolve({ ok: false, skipped: "off" });
    return cached("save:" + (meta ? "m" : "f"), MIN_MS, async () => {
      const r = await req("save", "GET", PATHS.save, { query: meta ? "?meta=1" : "", ifNoneMatch: st.etag });
      if (r.ok && r.notModified) return { ok: true, notModified: true, etag: st.etag };
      if (!r.ok) return r; const j = r.json || {}; st.etag = r.etag || j.etag || null; st.rev = Number.isInteger(j.rev) ? j.rev : null;
      return { ok: true, exists: !!j.exists, rev: st.rev, sha256: j.sha256 || null, size: j.size | 0, etag: st.etag, data: meta ? undefined : j.data };
    });
  }
  // ---- Cloud Save: PUT (DISIAPKAN; terkunci di shadow = nol request) ----
  function planSave(o3) {   // simpan hanya bila ada perubahan bermakna + jeda minimal 5 menit
    o3 = o3 || {}; const t = now(); if (st.conflict) return { save: false, why: "konflik-belum-diselesaikan" };
    if (!o3.sha256 || o3.sha256 === st.lastSha) return { save: false, why: "tidak-berubah" };
    if (t - st.lastPutAt < SAVE_MIN_MS) return { save: false, why: "terlalu-cepat", waitMs: SAVE_MIN_MS - (t - st.lastPutAt) };
    return { save: true };
  }
  async function putSave(b) {
    if (!canWrite()) { st.putsBlocked++; return { ok: false, skipped: mode() === "shadow" ? "shadow_readonly" : "off" }; }   // shadow: JANGAN PUT nyata
    b = b || {}; const body = {}; for (const k of PUT_KEYS) if (b[k] !== undefined) body[k] = b[k];
    if (!Number.isInteger(body.baseRev) || body.baseRev < 0 || !OPID_RE.test(String(body.opId || "")) || !body.data || typeof body.data !== "object") return { ok: false, skipped: "bad-request" };
    if (body.sha256 !== undefined && !/^[0-9a-f]{64}$/.test(String(body.sha256))) return { ok: false, skipped: "bad-sha" };
    if (st.conflict) return { ok: false, skipped: "konflik-belum-diselesaikan", conflict: st.conflict };
    if (now() - st.lastPutAt < SAVE_MIN_MS && st.lastPutAt) return { ok: false, skipped: "terlalu-cepat" };
    const r = await req("put", "PUT", PATHS.save, { body });                       // tidak pernah mengirim confirmOverwrite / dryRun
    if (r.ok) { st.lastPutAt = now(); st.lastSha = r.json.sha256 || body.sha256 || st.lastSha; st.rev = r.json.rev; st.etag = r.json.etag || st.etag; }
    else if (r.status === 409) st.conflict = { serverRev: r.conflict.serverRev, serverSha256: r.conflict.serverSha256 };
    return r;
  }
  const resolveConflict = () => { st.conflict = null; };   // hanya dipanggil setelah PEMAIN memilih (UI, nanti)
  // ---- perbandingan aman (shadow) ----
  function diffPodium(legacy, rows) {
    const L = (legacy || []).slice(0, 3).map((e) => [e.rank, clip(e.name, 24), e.score | 0]), D = (rows || []).slice(0, 3).map((e) => [e.rank, e.name, e.score]);
    const same = JSON.stringify(L) === JSON.stringify(D); return { same, legacyN: (legacy || []).length, d1N: (rows || []).length };
  }
  function diffSf(info, state) {
    const sf2 = (state && state.sf2) || {}; const lp = info && Number.isFinite(info.pity) ? info.pity : null, dp = Number.isFinite(sf2.p) ? sf2.p : Number.isFinite(sf2.pity) ? sf2.pity : null;
    return { pitySame: lp === null || dp === null ? null : lp === dp, legacyPity: lp, d1Pity: dp };
  }
  return { mode, req, podiumTop, sf, getSave, putSave, planSave, resolveConflict, diffPodium, diffSf, stats: () => ({ calls: st.calls, byPath: Object.assign({}, st.byPath), sanitized: st.sanitized, putsBlocked: st.putsBlocked, attempt: st.attempt, blockedUntil: st.blockedUntil, etag: st.etag, rev: st.rev, conflict: st.conflict }), _st: st };
}
return { make, PATHS, BOARDS, MIN_MS, SAVE_MIN_MS, SF_MIN_MS, BACKOFF, PUT_KEYS };
});
