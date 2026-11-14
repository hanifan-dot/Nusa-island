// NUSA ISLAND — Ide 08C · Memasak interaktif, hasil masakan, makan/buang, dan cuci peralatan (UI + efek adegan).
// SERVER = satu-satunya penentu: bahan & ikan dikonsumsi (dapurCookStart), langkah & waktu (dapurCookStep, jam server), kualitas/kematangan/resep ditemukan (dapurCookFinish),
// efek makan (dapurEat) dan cuci sah (dapurWash). Klien hanya mengirim NIAT (nama langkah) dan menampilkan jawaban. Warna/asap saat memasak adalah PERKIRAAN tampilan, bukan penilaian.
// Semua aksi memakai opId: coba-ulang (jaringan putus / klik ganda) memakai opId yang SAMA sehingga server tidak menggandakan apa pun.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDapurCore; if (!Core || !NW.room || !NW.dapurArt) return;
const N = () => window.Nusa, S = () => (N() && N().S) || {}, $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toast = (m, k) => { try { N().toast(m, k); } catch (e) { /* tampilan saja */ } };
const api = () => NW.dapur && NW.dapur.api;
const A = NW.dapurArt, P = A.P, L = Core.LAYOUT.dapur, TAU = Math.PI * 2;
const RICON = { ikan_goreng: "🐟", ikan_bakar: "🐠", sup_ikan: "🍲", nasi_goreng_ikan: "🍛", sambal_ikan: "🌶️", telur_ceplok: "🍳", telur_rebus: "🥚", tempe_goreng: "🟫", tumis_sayur: "🥬", kopi_susu: "☕" };
const NAMEOF = { ikan: ["🐟", "Ikan"] };
const CALM_KEY = "nusa-dapur-tenang";
const calmDefault = () => { try { const v = localStorage.getItem(CALM_KEY); if (v === "1") return true; if (v === "0") return false; return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } };

const M = {
  loaded: false, loading: false, loadErr: "", cat: null, recipes: [], tools: [], dapur: null, own: null,
  panel: null, station: null, tool: null, tab: "resep", sel: null, ing: {}, fish: [], busy: false, msg: "",
  ops: new Map(), done: [], result: null, eatInfo: null, calm: calmDefault(),
  pad: null, washItem: null, washStep: 0, washBusy: false,
  est: { on: false, eff: 0, last: 0, lv: 2 }, fx: { flip: 0, burst: [], bn: 0 }, face: null, blurT: 0, tut: false,
  bench: { view: null, dropped: {}, plated: null },
};

// ---------- opId idempoten: kunci aksi → opId yang SAMA dipakai ulang sampai server menjawab pasti ----------
const opFor = (key) => { let o = M.ops.get(key); if (!o) { o = Core.newOpId(); M.ops.set(key, o); if (M.ops.size > 60) M.ops.delete(M.ops.keys().next().value); } return o; };
const settle = (key) => M.ops.delete(key);

// ---------- suara: dimuat LAZY, hanya bila suara menyala ----------
let audioLoad = null;
const audioOn = () => { try { if (S().muted) return false; const a = NW.audio; if (!a || !a.getVolume) return true; return a.getVolume("master") > 0 && a.getVolume("sfx") > 0; } catch (e) { return false; } };
function snd(name) {
  if (!audioOn()) return;
  if (NW.dapurAudio) { try { NW.audio && NW.audio.sfx(name); } catch (e) { /* tanpa suara tidak apa-apa */ } return; }
  if (!audioLoad) audioLoad = new Promise((ok) => { const s = document.createElement("script"); s.src = "dapur/audio.js"; s.async = true; s.onload = ok; s.onerror = () => ok(); document.head.appendChild(s); });
  audioLoad.then(() => { try { NW.dapurAudio && NW.audio && NW.audio.sfx(name); } catch (e) { /* abaikan */ } });
}
const SND = { cuci: "dapur_cuci", kupas: "dapur_kupas", potong: "dapur_potong", pecah: "dapur_telur", aduk: "dapur_aduk", bumbui: "dapur_bumbu", tuang: "dapur_air", taruh: "dapur_taruh", balik: "dapur_balik", angkat: "dapur_taruh", sabun: "dapur_sabun", gosok: "dapur_gosok", bilas: "dapur_air", rak: "dapur_piring" };
let loopT = null;
function syncLoop() {   // desis minyak / air mendidih sambil di atas api (tiap ±0,7 dtk; berhenti saat keluar ruangan atau tab tersembunyi)
  const c = M.dapur && M.dapur.cook, on = !!(c && c.onFire && NW.room.active && NW.room.scene === "dapur");
  if (on && !loopT) { loopT = setInterval(() => { const cc = M.dapur && M.dapur.cook; if (!cc || !cc.onFire || document.hidden || !NW.room.active) return; snd(cc.tool === "panci" ? "dapur_didih" : "dapur_desis"); }, 700); }
  else if (!on && loopT) { clearInterval(loopT); loopT = null; }
}

// ---------- data server ----------
function setData() { try { if (NW.dapurRumah && NW.dapurRumah.setData) NW.dapurRumah.setData(M.dapur, M.tools, M.cat); } catch (e) { /* tampilan saja */ } }
function absorb(res) {
  if (res && typeof res === "object") { if (res.dapur && typeof res.dapur === "object") M.dapur = res.dapur; if (Number.isFinite(res.own)) M.own = res.own; setData(); syncLoop(); }
  return res;
}
const cooler = () => (S() && Array.isArray(S().cooler) ? S().cooler : []);
function localTake(uids) { const s0 = S(); if (!s0 || !Array.isArray(s0.cooler) || !uids.length) return; s0.cooler = s0.cooler.filter((i) => !uids.includes(i.uid)); try { N().save(); N().refreshHUD && N().refreshHUD(); } catch (e) { /* abaikan */ } }
function localReturn(list) { const s0 = S(); if (!s0 || !Array.isArray(s0.cooler)) return; for (const f of list) if (f && f.u && !s0.cooler.some((i) => i.uid === f.u)) s0.cooler.push({ uid: f.u, id: f.id, w: f.w, t: Date.now() }); try { N().save(); } catch (e) { /* abaikan */ } }
function reconcileFish() { const c = M.dapur && M.dapur.cook; if (c && c.fish && c.fish.length) localTake(c.fish.map((f) => f.u)); }   // ikan yang sedang dimasak tidak boleh tersisa di Tas lokal (mencegah dilaporkan ulang ke server)
async function load(force) {
  if (M.loading || !api()) return; if (M.loaded && !force) return; M.loading = true; M.loadErr = "";
  try {
    const r = await api().state(); M.cat = Core.catalogMap(r && r.catalog); const c = (r && r.catalog) || {};
    M.recipes = (Array.isArray(c.recipes) ? c.recipes : []).filter((x) => x && typeof x.id === "string" && x.ing && typeof x.ing === "object").map((x) => ({ id: x.id, name: String(x.name || x.id), tool: x.tool, ing: x.ing, prep: Array.isArray(x.prep) ? x.prep : [], flip: x.flip | 0, season: !!x.season, time: x.time || null }));
    M.tools = Array.isArray(c.tools) ? c.tools : []; absorb(r); M.loaded = true; reconcileFish(); if (!M.dapur.cook) M.est.on = false; else resumeEst();
  } catch (e) { M.loadErr = Core.errTextCook(e); }
  M.loading = false; render();
}
const recOf = (id) => M.recipes.find((r) => r.id === id) || null;
const toolOpen = (id) => !!(M.dapur && M.dapur.tools && M.dapur.tools.includes(id));
const stock = (id) => Core.stockOf(M.dapur, id);
const nameOf = (id) => (M.cat && M.cat[id] ? M.cat[id].name : NAMEOF[id] ? NAMEOF[id][1] : id);
const iconOf = (id) => (M.cat && M.cat[id] ? M.cat[id].icon : NAMEOF[id] ? NAMEOF[id][0] : "•");
const fmt = (n) => Math.floor(n).toLocaleString("id-ID");

// ---------- perkiraan tampilan (BUKAN penilaian) ----------
function resumeEst() { const c = M.dapur && M.dapur.cook; if (!c || !c.onFire) { M.est.on = false; return; } M.est = { on: true, eff: Math.max(0, (c.ageMs || 0) / 1000) * Core.FACTOR[c.lv || 2] * 0.5, last: performance.now(), lv: c.lv || 2 }; }
function tickEst(now) { const e = M.est; if (!e.on) return; e.eff += Math.max(0, (now - e.last) / 1000) * Core.FACTOR[e.lv]; e.last = now; }
function stage() { const c = M.dapur && M.dapur.cook; if (!c) return null; const r = c.rec ? recOf(c.rec) : null; return Core.visualStage(M.est.eff, r && r.time ? { min: r.time.min, ideal: r.time.ideal, burn: r.time.burn } : null); }

// ---------- reaksi karakter & efek ----------
function react(face, ms, extra) { M.face = Object.assign({ face, t0: performance.now(), ms }, extra || {}); }
function burst(kind, n) {   // percikan ringan (kolam tetap 12): hanya tampilan
  if (M.calm) n = Math.min(n, 2); const b = M.fx.burst; try { NW.dapurBench && NW.dapurBench.on && NW.dapurBench.burst(kind, n); } catch (e) { /* tampilan saja */ }
  for (let i = 0; i < n; i++) { const k = M.fx.bn++ % 12; b[k] = { kind, t0: performance.now(), a: Math.random() * TAU, v: 14 + Math.random() * 22 }; }
}
function blur(ms) {
  const cvs = [$("game"), $("mkBench")].filter(Boolean); if (!cvs.length) return; if (M.calm || ms <= 0) return;
  for (const cv of cvs) { cv.style.transition = "filter .35s ease"; cv.style.filter = "blur(2.2px) saturate(.85) hue-rotate(-10deg)"; } clearTimeout(M.blurT);
  M.blurT = setTimeout(() => { for (const cv of cvs) cv.style.filter = ""; setTimeout(() => { for (const cv of cvs) cv.style.transition = ""; }, 400); }, ms);
}
function clearBlur() { clearTimeout(M.blurT); for (const cv of [$("game"), $("mkBench")]) if (cv) { cv.style.filter = ""; cv.style.transition = ""; } }

// ---------- aksi ke server ----------
async function guarded(key, fn, okFn) {
  if (M.busy) return false; M.busy = true; M.msg = ""; render();
  try { const r = await fn(opFor(key)); settle(key); absorb(r); if (okFn) okFn(r); }
  catch (e) { if (Core.definite(e)) settle(key); M.msg = Core.errTextCook(e); if (e && e.code === "not-found") M.msg = "Dapur belum dibuka oleh server."; }
  M.busy = false; render(); return !M.msg;
}
const sigStart = () => [M.tool, M.sel || "-", Object.keys(M.ing).filter((k) => M.ing[k] > 0).sort().map((k) => k + M.ing[k]).join(","), M.fish.slice().sort().join(",")].join("|");
function startCook() {
  const free = !M.sel, b0 = Core.startBody("kc0000000", M.tool, M.sel, free ? M.ing : null, M.fish);
  if (!b0.ok) { M.msg = "Pilih bahan dulu."; return render(); }
  const picked = cooler().filter((i) => M.fish.includes(i.uid)).map((i) => i.uid);
  guarded("start:" + sigStart(), (op) => api().cookStart(Object.assign({}, b0.body, { opId: op })), () => { localTake(picked); M.done = []; M.bench = { view: null, dropped: {}, plated: null }; M.fish = []; M.ing = {}; M.est.on = false; M.pad = null; M.tab = "resep"; snd("dapur_taruh"); toast("🍳 Bahan disiapkan. Ayo masak!"); });
}
function abortCook() {
  const c = M.dapur && M.dapur.cook; if (!c || c.onFire || c.lifted) return; const fish = (c.fish || []).slice();
  guarded("abort:" + c.id, (op) => api().cookAbort({ opId: op }), () => { localReturn(fish); M.done = []; M.bench = { view: null, dropped: {}, plated: null }; M.pad = null; M.est.on = false; toast("Bahan dikembalikan ke lemari."); });
}
function doStep(step, arg) {
  const c = M.dapur && M.dapur.cook; if (!c) return;
  const key = `step:${c.id}:${c.steps}:${step}:${arg || 0}`, b = Core.stepBody("kc0000000", step, arg); if (!b.ok) return;
  guarded(key, (op) => api().cookStep(Object.assign({}, b.body, { opId: op })), () => {
    M.pad = null; M.done.push(step);
    const now = performance.now();
    if (step === "taruh") { M.est = { on: true, eff: 0, last: now, lv: 2 }; burst("api", 4); }
    else if (step === "api") { tickEst(now); M.est.lv = arg; snd("dapur_api"); }
    else if (step === "balik") { M.fx.flip = now; burst("balik", 3); }
    else if (step === "angkat") { tickEst(now); M.est.on = false; burst("uap", 5); }
    else burst(step, 5);
  });
}
function finishCook() {
  const c = M.dapur && M.dapur.cook; if (!c) return;
  guarded("finish:" + c.id, (op) => api().cookFinish({ opId: op }), (r) => {
    const d = r && r.dish; if (!d) return; M.result = { dish: d, discovered: !!r.discovered }; M.est.on = false; M.done = []; M.bench = { view: null, dropped: {}, plated: d.u }; M.pad = null;
    const T = Core.tierInfo(d.tier); react(T.face, 3600, { tier: d.tier }); snd(d.tier === "enak" ? "dapur_puas" : d.tier === "gosong" ? "dapur_batuk" : d.tier === "mentah" || d.tier === "tidak_layak" || d.tier === "aneh" ? "dapur_ragu" : "dapur_ding");
    if (d.tier === "enak" || d.tier === "lumayan") snd("dapur_ding"); snd("dapur_piring"); burst(T.fx === "asap" ? "asap" : "bintang", 6);
  });
}
function eatDish(u, name) {
  guarded("eat:" + u, (op) => api().eat({ opId: op, dish: u }), (r) => {
    const a = r && r.ate; if (!a) return; const ms = Core.effectMs(a.ms), E = Core.eatInfo(a.effect);
    const info = { effect: a.effect, line: E.line, name: a.name || name, ms, t0: performance.now() }; M.eatInfo = info; M.result = null;
    react(E.face, Math.max(1800, ms), { eat: true, effect: a.effect, vomit: a.effect === "mual" && !M.calm });
    snd("dapur_sendok"); if (a.effect === "mual") { snd("dapur_mual"); blur(ms); } else if (a.effect === "puas") snd("dapur_puas"); else if (a.effect === "ragu") snd("dapur_ragu");
    setTimeout(() => { if (M.eatInfo === info) { M.eatInfo = null; clearBlur(); render(); } }, Math.max(1800, ms) + 200);
  });
}
function discardDish(u) { guarded("discard:" + u, (op) => api().discard({ opId: op, dish: u }), () => { M.result = null; snd("dapur_buang"); toast("🗑️ Masakan dibuang. Tidak ada koin yang hilang."); }); }
function washOne(item, quick) {
  const n = (M.dapur && M.dapur.dirty && M.dapur.dirty[item]) || 0, b = Core.washBody("kc0000000", item, quick); if (!b.ok) return;
  guarded(`wash:${item}:${quick ? 1 : 0}:${n}`, (op) => api().wash(Object.assign({}, b.body, { opId: op })), () => { M.washStep = 0; M.pad = null; snd("dapur_piring"); if (!(M.dapur.dirty && M.dapur.dirty[item])) M.washItem = null; });
}

// ---------- gerakan layar (pad) ----------
function openPad(id, spec, onDone) { M.bench.view = null; M.pad = { id, spec, p: 0, n: 0, ang: 0, dist: 0, last: null, t0: 0, raf: 0, done: false, onDone }; render(); }
function padBar() { const i = $("mkBar"), pd = M.pad; if (i && pd) i.style.width = Math.round(pd.p * 100) + "%"; }
function padBump(frac, withSound) {
  const pd = M.pad; if (!pd || pd.done) return; pd.p = Math.min(1, pd.p + frac); padBar(); if (withSound) snd(SND[pd.id]);
  const el = $("mkPad"); if (el && !M.calm) { el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit"); }
  if (pd.p >= 1) { pd.done = true; cancelAnimationFrame(pd.raf); setTimeout(() => { const f = pd.onDone; if (M.pad === pd && f) f(); }, 120); }
}
function padDown(e) {
  const pd = M.pad, el = e.target.closest && e.target.closest("#mkPad, #mkBench"); if (!pd || !el || pd.done || M.busy || (e.target.closest && e.target.closest("[data-a]"))) return; e.preventDefault();
  const k = pd.spec.kind, r = el.getBoundingClientRect(); pd.cx = r.left + r.width / 2; pd.cy = r.top + r.height / 2;
  if (el.id === "mkBench" && NW.dapurBench) { try { const f = NW.dapurBench.focus(pd.id); pd.cx = f.x; pd.cy = f.y; } catch (x) { /* pakai tengah */ } } pd.last = { x: e.clientX, y: e.clientY }; pd.down = true;
  if (k === "tap") { padBump(1 / pd.spec.need, true); if (pd.id === "potong" || pd.id === "kupas" || pd.id === "pecah" || pd.id === "bumbui") burst(pd.id, 2); }
  else if (k === "circle") { padBump(1 / 6 / pd.spec.need * 1.5, true); }
  else if (k === "scrub") { padBump(1 / 8, true); }
  else if (k === "hold") { pd.t0 = performance.now(); snd(SND[pd.id]); const loop = () => { if (!pd.down || pd.done || M.pad !== pd) return; const p = (performance.now() - pd.t0) / pd.spec.need; pd.p = Math.min(1, p); padBar(); if (p >= 1) { pd.p = 0; padBump(1, false); } else pd.raf = requestAnimationFrame(loop); }; pd.raf = requestAnimationFrame(loop); }
}
function padMove(e) {
  const pd = M.pad; if (!pd || !pd.down || pd.done || !pd.last) return; const k = pd.spec.kind, dx = e.clientX - pd.last.x, dy = e.clientY - pd.last.y;
  if (k === "circle") { const a0 = Math.atan2(pd.last.y - pd.cy, pd.last.x - pd.cx), a1 = Math.atan2(e.clientY - pd.cy, e.clientX - pd.cx); let d = a1 - a0; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; const before = Math.floor(Math.abs(pd.ang) / 2); pd.ang += d; const dd = Math.hypot(dx, dy); padBump(Math.max(Math.abs(d) / (TAU * pd.spec.need), dd / (TAU * 30 * pd.spec.need)), false); if (Math.floor(Math.abs(pd.ang) / 2) !== before) snd("dapur_aduk"); }
  else if (k === "tap" && pd.id === "potong") { pd.sw = (pd.sw || 0) + Math.abs(dx); if (pd.sw >= 64) { pd.sw = 0; padBump(1 / pd.spec.need, true); } }   // iris: geser jari melintasi talenan = satu irisan
  else if (k === "scrub") { const d = Math.hypot(dx, dy); pd.dist += d; padBump(d / pd.spec.need, false); if (Math.floor(pd.dist / 70) !== Math.floor((pd.dist - d) / 70)) { snd("dapur_gosok"); burst("sabun", 1); } }
  pd.last = { x: e.clientX, y: e.clientY };
}
function padUp() { const pd = M.pad; if (!pd) return; pd.down = false; if (pd.spec.kind === "hold" && !pd.done) { cancelAnimationFrame(pd.raf); pd.p = 0; padBar(); } }
function padKey(e) { if ((e.key === "Enter" || e.key === " ") && e.target.id === "mkPad") { e.preventDefault(); const pd = M.pad; if (!pd || pd.done || M.busy) return; padBump(pd.spec.kind === "hold" ? 1 : pd.spec.kind === "scrub" ? 1 / 8 : pd.spec.kind === "circle" ? 1 / 6 / pd.spec.need * 1.5 : 1 / pd.spec.need, true); } }
function padHTML(note) {
  const pd = M.pad; if (!pd) return "";
  const sp = pd.spec;
  return `<div class="mk-pad ${M.calm ? "calm" : ""}" id="mkPad" data-kind="${sp.kind}" data-id="${esc(pd.id)}" role="button" tabindex="0" aria-label="${esc(sp.label)}: ${esc(sp.hint)}"><div class="mk-art" aria-hidden="true">${sp.icon}</div><div class="mk-pt"><b>${esc(sp.label)}</b><small>${esc(note || sp.hint)}</small><div class="mk-bar" aria-hidden="true"><i id="mkBar" style="width:${Math.round(pd.p * 100)}%"></i></div></div><button type="button" class="kd-x" data-a="padx" aria-label="Batal">✕</button></div>`;
}

// ---------- tampilan panel ----------
function ensureUI() {
  if ($("mkSheet")) return;
  const sh = document.createElement("div"); sh.id = "mkSheet"; sh.className = "kd-sheet mk hidden"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "false"); sh.setAttribute("aria-label", "Dapur");
  const chip = document.createElement("div"); chip.id = "mkChip"; chip.className = "kd-chip hidden"; chip.innerHTML = '<button type="button" id="mkChipBtn">🔥 Masakan berjalan · buka</button>';
  document.body.appendChild(chip); document.body.appendChild(sh); NW.room.watchSheet(sh); try { NW.dapurBench && NW.dapurBench.ensure(); } catch (e) { /* tampilan saja */ }
  sh.addEventListener("click", onClick); sh.addEventListener("pointerdown", padDown); sh.addEventListener("keydown", padKey);
  window.addEventListener("pointermove", padMove, { passive: true }); window.addEventListener("pointerup", padUp); window.addEventListener("pointercancel", padUp);
  $("mkChipBtn").addEventListener("click", () => { M.panel = "cook"; showSheet(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) padUp(); });
}
let blockedOn = false;
function setBlock(on) { if (on === blockedOn) return; blockedOn = on; NW.room.block(on); }
function showSheet() { ensureUI(); const sh = $("mkSheet"); sh.classList.remove("hidden", "mini"); setBlock(true); render(); }
function closeSheet() { const sh = $("mkSheet"); M.panel = null; M.pad = null; if (sh) { sh.classList.add("hidden"); sh.innerHTML = ""; } setBlock(false); syncChip(); try { NW.dapurBench && NW.dapurBench.sync(); } catch (e) { /* tampilan saja */ } }
function syncChip() { const c = $("mkChip"); if (!c) return; const on = !!(M.dapur && M.dapur.cook) && NW.room.active && NW.room.scene === "dapur" && !M.panel; c.classList.toggle("hidden", !on); }
const phase = () => (M.result ? "result" : M.dapur && M.dapur.cook ? "cook" : "pick");
const head = (title, extra) => `<header><h3>${title}</h3><span class="mk-hr">${extra || ""}<button type="button" class="mk-calm" data-a="calm" aria-pressed="${M.calm}" title="Kurangi blur &amp; gerak">${M.calm ? "🌿 Tenang: nyala" : "🌿 Tenang"}</button><button type="button" class="kd-x" data-a="close" aria-label="Tutup">✕</button></span></header>`;
const msgHTML = () => (M.msg ? `<p class="kd-note warn" role="alert">${esc(M.msg)}</p>` : "");
const dirtyNote = () => { const n = Core.dirtyTotal(M.dapur); return n ? `<p class="kd-note">🧽 ${n} alat kotor. Alat kotor mengurangi kualitas masakan sedikit (batasnya ditentukan server). <button type="button" class="mk-link" data-a="gowash">Cuci di bak</button></p>` : ""; };

function render() {
  const sh = $("mkSheet"); if (!sh || !M.panel) { syncChip(); try { NW.dapurBench && NW.dapurBench.sync(); } catch (e) { /* tampilan saja */ } return; }
  let h = "";
  if (!M.loaded) h = `${head("🍳 Dapur")}<p class="kd-note">${M.loading ? "Memeriksa lemari bahan…" : esc(M.loadErr || "Sebentar…")}</p>${M.loading ? "" : '<button type="button" class="kd-btn" data-a="retry">Coba lagi</button>'}`;
  else if (M.panel === "wash") h = washHTML();
  else if (M.panel === "tray") h = trayHTML();
  else { const ph = phase(); h = ph === "result" ? resultHTML() : ph === "cook" ? cookHTML() : pickHTML(); }
  const vk = M.panel + ":" + (M.loaded ? (M.panel === "cook" ? phase() : M.washItem || "") : "load") + ":" + (M.pad ? M.pad.id : ""), keep = sh.dataset.vk === vk ? sh.scrollTop : 0;
  sh.innerHTML = NW.room.GRIP + h; sh.dataset.vk = vk; sh.scrollTop = keep; syncChip();   // pindah tampilan → kembali ke atas; render ulang di tampilan sama → posisi gulir dipertahankan
  if (M.pad) padBar();
  try { NW.dapurBench && NW.dapurBench.sync(); } catch (e) { /* tampilan saja */ }
}

// --- 1) menyiapkan bahan ---
function toolsForStation() { return Core.TOOL_OF_STATION[M.station] || ["wajan"]; }
function pickHTML() {
  const ts = toolsForStation(), tool = M.tool && ts.includes(M.tool) ? M.tool : ts[0]; M.tool = tool;
  const rs = M.recipes.filter((r) => ts.includes(r.tool));
  const pool = Core.fishPool(cooler(), Object.values(N().FISH_BY_ID || {}), NW.sf && NW.sf.isSF ? NW.sf.isSF : null).concat([]).filter((f) => !(NW.sf2 && NW.sf2.isSf2 && NW.sf2.isSf2(f.id)));
  let h = head(`🍳 Masak · ${esc(Core.TOOL_NAME[tool])}`);
  if (M.eatInfo) h += `<p class="mk-live" role="status">${esc(M.eatInfo.line)}</p>`;
  h += `<div class="mk-tabs" role="tablist"><button type="button" role="tab" class="mk-tab" data-a="tab" data-v="resep" aria-selected="${M.tab === "resep"}">📖 Resep</button><button type="button" role="tab" class="mk-tab" data-a="tab" data-v="bebas" aria-selected="${M.tab === "bebas"}">✨ Masak bebas</button></div>`;
  if (ts.length > 1) h += `<div class="mk-seg" role="group" aria-label="Alat">${ts.map((t) => `<button type="button" data-a="tool" data-v="${t}" aria-pressed="${t === tool}">${Core.TOOL_NAME[t]}</button>`).join("")}</div>`;
  if (M.tab === "resep") {
    const list = rs.filter((r) => r.tool === tool);
    h += `<ul class="kd-list mk-recs">${list.map((r) => recRow(r, pool)).join("") || '<li class="kd-note">Belum ada resep untuk alat ini.</li>'}</ul>`;
    if (M.dapur && M.dapur.hidden > 0) h += `<p class="kd-note">🔒 ${M.dapur.hidden} resep rahasia belum ketemu. Coba padukan bahan lewat Masak bebas!</p>`;
  } else {
    const have = Object.keys(M.dapur.ing || {}).filter((k) => M.dapur.ing[k] > 0);
    h += `<ul class="kd-list">${have.map((id) => `<li class="kd-row"><span class="kd-ic" aria-hidden="true">${esc(iconOf(id))}</span><span class="kd-nm"><b>${esc(nameOf(id))}</b><small>di lemari: ${stock(id)}</small></span><div class="kd-step"><button type="button" data-a="fdec" data-id="${esc(id)}" aria-label="Kurangi ${esc(nameOf(id))}" ${(M.ing[id] || 0) < 1 ? "disabled" : ""}>−</button><output>${M.ing[id] || 0}</output><button type="button" data-a="finc" data-id="${esc(id)}" aria-label="Tambah ${esc(nameOf(id))}" ${(M.ing[id] || 0) >= Math.min(stock(id), Core.FREE_LIM.per) ? "disabled" : ""}>+</button></div></li>`).join("") || '<li class="kd-note">Lemari masih kosong. Belanja dulu di Kedai Bu Indah.</li>'}</ul>`;
    h += fishPick(pool);
  }
  const ready = M.sel && M.tab === "resep" ? Core.recipeReady(recOf(M.sel), M.dapur, M.fish.length).ok : M.tab === "bebas" ? Core.validateFree(M.ing, M.fish.length).ok : false;
  h += `${msgHTML()}${dirtyNote()}<footer><span class="mk-sum">${M.tab === "bebas" ? "Bahan: " + (Object.values(M.ing).reduce((a, n) => a + n, 0) + M.fish.length) + "/" + Core.FREE_LIM.units : M.sel ? "✔ " + esc((recOf(M.sel) || {}).name || "") : "Pilih resep"}</span><button type="button" class="kd-btn gold" data-a="start" ${M.busy || !ready ? "disabled" : ""}>${M.busy ? "Menyiapkan…" : "Mulai masak"}</button></footer>`;
  return h;
}
function fishPick(pool) {
  if (!pool.length) return `<p class="kd-note">🐟 Tidak ada ikan yang bisa dimasak di tasmu (ikan sampah, dilindungi atau khusus tidak bisa dipilih).</p>`;
  return `<div class="mk-fishbox"><b>Ikan dari tasmu</b> <small>(maks ${Core.FREE_LIM.fish})</small><div class="mk-fish">${pool.slice(0, 24).map((f) => `<button type="button" class="mk-chip" data-a="fish" data-u="${esc(f.uid)}" aria-pressed="${M.fish.includes(f.uid)}">🐟 ${esc(f.name)} <small>${f.w.toFixed(1)} kg</small></button>`).join("")}</div></div>`;
}
function recRow(r, pool) {
  const needF = r.ing.ikan | 0, sel = M.sel === r.id;
  const chips = Object.entries(r.ing).map(([k, n]) => { const have = k === "ikan" ? pool.length : stock(k), ok = have >= n; return `<span class="mk-need ${ok ? "" : "miss"}" title="${esc(nameOf(k))}">${esc(iconOf(k))}×${n}${ok ? "" : " ✕"}</span>`; }).join("");
  const stepsTxt = r.prep.map((p) => (Core.ACT[p] ? Core.ACT[p].icon : "")).join("") + (r.flip ? "🔄".repeat(Math.min(r.flip, 3)) : "");
  let h = `<li class="mk-rec ${sel ? "sel" : ""}"><button type="button" class="mk-recb" data-a="rec" data-id="${esc(r.id)}" aria-pressed="${sel}"><span class="kd-ic" aria-hidden="true">${RICON[r.id] || "🍽️"}</span><span class="kd-nm"><b>${esc(r.name)}</b><small>${chips}</small></span><span class="mk-st" aria-hidden="true">${stepsTxt}</span></button>`;
  if (sel && needF) h += fishPick(pool) + `<p class="kd-note">${M.fish.length === needF ? "✔ Ikan dipilih." : `Pilih ${needF} ikan.`}</p>`;
  return h + "</li>";
}

// --- 2) sedang memasak ---
function actsFor(c, r) {
  if (r) { const a = r.prep.concat(r.season && !r.prep.includes("bumbui") ? ["bumbui"] : []); if (c.tool === "panci" && !a.includes("tuang")) a.push("tuang"); return a; }   // panci: "isi air" (tuang) opsional
  if (c.tool === "gelas") return ["tuang", "aduk"]; const a = ["cuci", "kupas", "potong", "pecah", "aduk", "bumbui"]; if (c.tool === "panci") a.push("tuang"); return a;
}
function cookHTML() {
  const c = M.dapur.cook, r = c.rec ? recOf(c.rec) : null, heats = Core.HEAT_TOOLS.includes(c.tool), onFire = c.onFire, lifted = c.lifted, hint = Core.nextHint(r, M.done);
  const title = r ? r.name : "Masak bebas";
  let h = head(`${r ? RICON[r.id] || "🍽️" : "✨"} ${esc(title)} · ${esc(Core.TOOL_NAME[c.tool] || c.tool)}`);
  const ing = Object.entries(c.ing || {}).map(([k, n]) => `<span class="mk-need">${esc(iconOf(k))}×${n}</span>`).concat((c.fish || []).map(() => `<span class="mk-need">🐟</span>`)).join("");
  h += `<div class="mk-status"><span class="mk-ings">${ing}</span>${onFire ? `<span class="mk-live" aria-live="polite">🔥 Api ${["", "kecil", "sedang", "besar"][c.lv] || ""}${c.flips ? " · dibalik " + c.flips + "×" : ""}</span>` : lifted ? '<span class="mk-live">🫕 Sudah diangkat</span>' : ""}</div>`;
  if (M.pad) h += padHTML();
  else {
    if (!lifted) {
      const acts = actsFor(c, r);
      h += `<div class="mk-rail" role="group" aria-label="Persiapan">${acts.map((p) => `<button type="button" class="mk-act ${hint === p ? "next" : ""} ${M.done.includes(p) ? "done" : ""}" data-a="act" data-v="${p}" ${M.busy ? "disabled" : ""}><span aria-hidden="true">${Core.ACT[p].icon}</span><small>${esc(Core.ACT[p].label)}</small></button>`).join("")}</div>`;
      if (heats && !onFire) h += `<button type="button" class="kd-btn gold mk-big" data-a="act" data-v="taruh" ${M.busy ? "disabled" : ""}>🔥 Taruh di ${esc(Core.TOOL_NAME[c.tool])}</button>`;
      if (heats && onFire) {
        h += `<div class="mk-heat" role="group" aria-label="Atur api">${[1, 2, 3].map((lv) => `<button type="button" class="mk-flame" data-a="api" data-v="${lv}" aria-pressed="${c.lv === lv}" ${M.busy ? "disabled" : ""}>${"🔥".repeat(lv)}<small>${["", "Kecil", "Sedang", "Besar"][lv]}</small></button>`).join("")}</div>`;
        h += `<div class="mk-row2"><button type="button" class="kd-btn" data-a="act" data-v="balik" ${M.busy ? "disabled" : ""}>🔄 Balik</button><button type="button" class="kd-btn gold" data-a="act" data-v="angkat" ${M.busy ? "disabled" : ""}>🫕 Angkat</button></div>`;
        h += `<p class="kd-note">Perhatikan warna dan asapnya di dapur. Penilaian akhir ditentukan server.</p>`;
      }
    } else h += `<button type="button" class="kd-btn gold mk-big" data-a="finish" ${M.busy ? "disabled" : ""}>🍽️ Sajikan</button>`;
    if (!heats) h += `<button type="button" class="kd-btn gold mk-big" data-a="finish" ${M.busy ? "disabled" : ""}>🍽️ Selesai &amp; sajikan</button>`;
  }
  h += msgHTML();
  h += `<footer>${!c.onFire && !c.lifted ? `<button type="button" class="kd-btn ghost" data-a="abort" ${M.busy ? "disabled" : ""}>↩ Batalkan &amp; kembalikan bahan</button>` : "<span></span>"}<button type="button" class="kd-btn ghost" data-a="close">Tutup panel</button></footer>`;
  return h;
}

// --- 3) hasil masakan ---
function resultHTML() {
  const r = M.result, d = r.dish, T = Core.tierInfo(d.tier), bad = d.tier === "tidak_layak", eating = M.eatInfo;
  let h = head(`${T.emoji} ${esc(d.name)}`);
  h += `<div class="mk-res tier-${esc(d.tier)}"><div class="mk-dish" style="--dish:${T.dish}" aria-hidden="true"><i></i></div><div><b>${esc(T.label)}</b><p>${esc(T.line)}</p>${r.discovered ? '<p class="mk-new">✨ Resep baru ditemukan!</p>' : ""}</div></div>`;
  if (eating) h += `<p class="mk-live" role="status">${esc(eating.line)}</p>`;
  h += msgHTML();
  h += bad ? `<p class="kd-note">Masakan ini tidak layak dimakan. Kamu boleh membuangnya, atau tetap memakannya kalau mau (tidak ada hukuman koin).</p>` : "";
  h += `<footer>${bad ? `<button type="button" class="kd-btn gold" data-a="discard" data-u="${esc(d.u)}" ${M.busy ? "disabled" : ""}>🗑️ Buang</button><button type="button" class="kd-btn ghost" data-a="eat" data-u="${esc(d.u)}" data-n="${esc(d.name)}" ${M.busy ? "disabled" : ""}>Tetap makan</button>` : `<button type="button" class="kd-btn gold" data-a="eat" data-u="${esc(d.u)}" data-n="${esc(d.name)}" ${M.busy ? "disabled" : ""}>😋 Makan</button><button type="button" class="kd-btn ghost" data-a="keep">Simpan di nampan</button>`}</footer>`;
  return h + dirtyNote();
}
function trayHTML() {
  const ds = (M.dapur && M.dapur.dishes) || []; let h = head("🍽️ Nampan masakan");
  if (M.eatInfo) h += `<p class="mk-live" role="status">${esc(M.eatInfo.line)}</p>`;
  h += `<ul class="kd-list">${ds.map((d) => { const T = Core.tierInfo(d.tier); return `<li class="kd-row"><span class="kd-ic" aria-hidden="true">${T.emoji}</span><span class="kd-nm"><b>${esc(d.name)}</b><small>${esc(T.label)}</small></span><button type="button" class="kd-btn" data-a="eat" data-u="${esc(d.u)}" data-n="${esc(d.name)}" ${M.busy ? "disabled" : ""}>Makan</button><button type="button" class="kd-btn ghost" data-a="discard" data-u="${esc(d.u)}" aria-label="Buang ${esc(d.name)}" ${M.busy ? "disabled" : ""}>🗑️</button></li>`; }).join("") || '<li class="kd-note">Nampan kosong. Masak sesuatu dulu di kompor.</li>'}</ul>`;
  return h + msgHTML() + dirtyNote() + `<footer><span>${ds.length}/12 piring</span><button type="button" class="kd-btn" data-a="close">Selesai</button></footer>`;
}

// --- 4) cuci peralatan ---
function washHTML() {
  const list = Core.dirtyList(M.dapur), quick = Core.canQuick(M.dapur);
  let h = head("🚰 Bak cuci");
  if (!list.length) return h + `<p class="kd-note">✨ Semua peralatan sudah bersih. Kerja bagus!</p><footer><span></span><button type="button" class="kd-btn gold" data-a="close">Selesai</button></footer>`;
  if (!quick) h += `<p class="kd-note">🧼 Cuci pertama: ikuti 4 langkah (sabun, gosok, bilas, taruh di rak). Setelah itu tombol Percepat terbuka.</p>`;
  if (!M.washItem || !list.some((d) => d.id === M.washItem)) {
    h += `<ul class="kd-list">${list.map((d) => `<li class="kd-row"><span class="kd-ic" aria-hidden="true">${d.icon}</span><span class="kd-nm"><b>${esc(d.name)}</b><small>kotor × ${d.n}</small></span><button type="button" class="kd-btn gold" data-a="washpick" data-v="${d.id}" ${M.busy ? "disabled" : ""}>Cuci</button>${quick ? `<button type="button" class="kd-btn" data-a="washquick" data-v="${d.id}" ${M.busy ? "disabled" : ""} aria-label="Cuci cepat ${esc(d.name)}">⚡</button>` : `<button type="button" class="kd-btn" disabled aria-label="Percepat terkunci" title="Selesaikan satu cuci lengkap dulu">🔒</button>`}</li>`).join("")}</ul>`;
    h += `<p class="kd-note">Alat kotor mengurangi kualitas masakan sedikit; batasnya ditentukan server.</p>`;
  } else {
    const it = Core.ITEM[M.washItem], steps = ["sabun", "gosok", "bilas", "rak"], cur = steps[M.washStep] || "rak";
    h += `<div class="mk-wstep" role="list" aria-label="Langkah cuci">${steps.map((s, i) => `<span role="listitem" class="${i < M.washStep ? "ok" : i === M.washStep ? "now" : ""}">${Core.WASH_ACT[s].icon}<small>${Core.WASH_ACT[s].label}</small></span>`).join("")}</div>`;
    h += `<p class="kd-note"><b>${it[0]} ${esc(it[1])}</b> — langkah ${M.washStep + 1} dari 4</p>`;
    h += M.pad ? padHTML() : `<button type="button" class="kd-btn gold mk-big" data-a="washgo" ${M.busy ? "disabled" : ""}>${Core.WASH_ACT[cur].icon} Mulai: ${esc(Core.WASH_ACT[cur].label)}</button>`;
    h += `<footer><button type="button" class="kd-btn ghost" data-a="washback">↩ Pilih alat lain</button><span></span></footer>`;
  }
  return h + msgHTML();
}
function washGo() {
  const steps = ["sabun", "gosok", "bilas", "rak"], id = steps[M.washStep]; if (!id || M.busy) return;
  openPad(id, Core.WASH_ACT[id], () => {
    M.pad = null;
    if (id === "bilas") burst("air", 4); if (id === "sabun") burst("sabun", 5);
    if (M.washStep < 3) { M.washStep++; render(); } else washOne(M.washItem, false);   // server dipanggil SEKALI di akhir: urutan sabun→gosok→bilas; "rak" hanya tampilan
  });
}

// ---------- klik ----------
function onClick(e) {
  const b = e.target.closest && e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a;
  if (a === "close") { snd("dapur_sendok"); return closeSheet(); }
  if (a === "retry") { M.loaded = false; return load(true); }
  if (a === "calm") { M.calm = !M.calm; try { localStorage.setItem(CALM_KEY, M.calm ? "1" : "0"); } catch (x) { /* abaikan */ } if (M.calm) clearBlur(); return render(); }
  if (a === "padx") { M.pad = null; return render(); }
  if (M.busy) return;
  if (a === "tab") { M.tab = b.dataset.v; M.msg = ""; M.fish = []; M.ing = {}; if (M.tab === "bebas") M.sel = null; return render(); }
  if (a === "tool") { M.tool = b.dataset.v; M.sel = null; M.fish = []; M.ing = {}; return render(); }
  if (a === "rec") { M.sel = M.sel === b.dataset.id ? null : b.dataset.id; M.fish = []; M.msg = ""; return render(); }
  if (a === "fish") { const u = b.dataset.u, i = M.fish.indexOf(u), lim = M.sel ? ((recOf(M.sel) || { ing: {} }).ing.ikan | 0) : Core.FREE_LIM.fish; if (i >= 0) M.fish.splice(i, 1); else if (M.fish.length < lim) M.fish.push(u); else if (lim === 1) M.fish = [u]; return render(); }
  if (a === "finc" || a === "fdec") { const id = b.dataset.id, cur = M.ing[id] || 0, nx = cur + (a === "finc" ? 1 : -1); if (nx < 0 || nx > Math.min(stock(id), Core.FREE_LIM.per)) return; if (nx === 0) delete M.ing[id]; else M.ing[id] = nx; return render(); }
  if (a === "start") return startCook();
  if (a === "abort") return abortCook();
  if (a === "finish") return finishCook();
  if (a === "act") { const id = b.dataset.v; if (id === "taruh") return openPad("taruh", Core.ACT.taruh, () => doStep("taruh")); return openPad(id, Core.ACT[id], () => doStep(id)); }
  if (a === "api") { return doStep("api", parseInt(b.dataset.v, 10)); }
  if (a === "eat") return eatDish(b.dataset.u, b.dataset.n);
  if (a === "discard") return discardDish(b.dataset.u);
  if (a === "keep") { M.result = null; M.panel = "tray"; return render(); }
  if (a === "gowash") { M.panel = "wash"; M.washItem = null; M.washStep = 0; return render(); }
  if (a === "washpick") { M.washItem = b.dataset.v; M.washStep = 0; M.pad = null; return render(); }
  if (a === "washback") { M.washItem = null; M.washStep = 0; M.pad = null; return render(); }
  if (a === "washgo") return washGo();
  if (a === "washquick") return washOne(b.dataset.v, true);
}

// ---------- pintu masuk dari stasiun dapur ----------
function open(kind) {
  ensureUI(); M.msg = ""; M.pad = null; M.washItem = null; M.washStep = 0;
  if (kind === "cuci") M.panel = "wash"; else if (kind === "meja" || kind === "sampah") M.panel = "tray"; else { M.panel = "cook"; M.station = kind; if (!M.tool || !Core.TOOL_OF_STATION[kind].includes(M.tool)) M.tool = Core.TOOL_OF_STATION[kind][0]; }
  showSheet(); load(true);
}
function leave() { closeSheet(); clearBlur(); M.eatInfo = null; M.face = null; if (loopT) { clearInterval(loopT); loopT = null; } }

// ---------- efek adegan ----------
const STV = () => L.solids.kompor, HH = 32;
function focusOf(tool) {
  if (tool === "pemanggang") { const s = L.solids.pemanggang; return { x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2, z: 33 }; }
  const s = STV(); return tool === "panci" ? { x: s.x0 + 1.25, y: s.y0 + 0.42, z: HH + 4 } : { x: s.x0 + 0.5, y: s.y0 + 0.42, z: HH + 4 };
}
const BX = { potong: "#9fc92a", kupas: "#e8d6b0", pecah: "#f4d35a", bumbui: "#ffffff", sabun: "#e8f6ff", air: "#78bee6", api: "#ff9a3c", balik: "#e8b53a", uap: "#ffffff", cuci: "#78bee6", aduk: "#e8d6b0", asap: "#555", bintang: "#ffd34a" };
function drawBursts(c, now) {
  const bs = M.fx.burst; if (!bs.length) return; const c0 = M.dapur && M.dapur.cook;
  const fp = P(3.3, 0.42, 36);
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i]; if (!b) continue; const age = (now - b.t0) / 1000; if (age > 0.7) { bs[i] = null; continue; }
    const heat = b.kind === "api" || b.kind === "balik" || b.kind === "uap" || b.kind === "asap"; const fo = heat && c0 ? focusOf(c0.tool) : null, f = fo ? P(fo.x, fo.y, fo.z) : fp;
    const k = age / 0.7, x = f.x + Math.cos(b.a) * b.v * age * 1.4, y = f.y - 6 - Math.sin(b.a + 1) * b.v * age * 1.1 + 36 * age * age;
    c.globalAlpha = 1 - k; c.fillStyle = BX[b.kind] || "#fff"; c.beginPath(); c.arc(x, y, b.kind === "sabun" || b.kind === "air" ? 2.4 - k : 1.8, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
}
// makanan di wajan/panci/pemanggang + api + asap/uap (dipanggil dari rumah.js sebagai benda dinamis)
function drawCook(c, t) {
  const cook = M.dapur && M.dapur.cook; const now = performance.now(); tickEst(now);
  if (cook) {
    const st = stage() || { k: 0.1, name: "mentah" }, fo = focusOf(cook.tool), p = P(fo.x, fo.y, fo.z), fire = !!cook.onFire, lv = cook.lv || 2;
    const col = fire || cook.lifted ? mix("#f2e6c4", "#c58a3a", Math.min(1, st.k * 1.4), "#2a1f18", Math.max(0, (st.k - 0.8) * 5)) : "#f2e6c4";
    if (cook.tool === "wajan") { c.fillStyle = col; c.beginPath(); c.ellipse(p.x, p.y - 4, 10.5, 4.4, 0, 0, TAU); c.fill(); for (let k = 0; k < 4; k++) ell2(c, p.x - 5 + k * 3.4, p.y - 5 + (k % 2) * 1.4, 2.2, 1.5, lighten(col, k % 2 ? 0.12 : -0.1)); if (fire) sizzle(c, p, t, lv); }
    else if (cook.tool === "panci") { if (fire) { c.fillStyle = "#6fb4cf"; c.beginPath(); c.ellipse(p.x, p.y - 15, 9, 3.4, 0, 0, TAU); c.fill(); for (let k = 0; k < 5; k++) { const ph = (t * (0.9 + lv * 0.4) + k * 0.37) % 1; c.globalAlpha = 1 - ph; c.fillStyle = "#e9f7ff"; c.beginPath(); c.arc(p.x - 6 + k * 3, p.y - 16 - ph * 3, 1 + ph * 1.4, 0, TAU); c.fill(); c.globalAlpha = 1; } } }
    else if (cook.tool === "pemanggang") { c.fillStyle = col; c.beginPath(); c.ellipse(p.x, p.y - 12, 10, 3.6, 0.1, 0, TAU); c.fill(); }
    if (fire && cook.tool !== "pemanggang") { const s2 = STV(), bx = s2.x0 + (cook.tool === "panci" ? 1.25 : 0.5), bp = P(bx, s2.y0 + 0.42, HH + 0.6); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, h = 2.2 + lv * 1.4 + Math.sin(t * 9 + k) * 0.8; c.fillStyle = k % 2 ? "#ffb02e" : "#ff6a2e"; c.beginPath(); c.moveTo(bp.x + Math.cos(a) * 7, bp.y + Math.sin(a) * 3.4); c.lineTo(bp.x + Math.cos(a) * 7 + 1.4, bp.y + Math.sin(a) * 3.4 - h); c.lineTo(bp.x + Math.cos(a) * 7 + 2.8, bp.y + Math.sin(a) * 3.4); c.fill(); } }
    if (st.name === "gosong" || (st.name === "terlalu" && fire)) smoke(c, p, t, st.name === "gosong" ? 5 : 2);
    if (M.fx.flip && !M.calm) { const age = (now - M.fx.flip) / 1000; if (age < 0.55) { const k = age / 0.55, fy = Math.sin(k * Math.PI) * 18; c.fillStyle = col; c.beginPath(); c.ellipse(p.x, p.y - 6 - fy, 8, 3, k * TAU, 0, TAU); c.fill(); } }
  }
  drawBursts(c, now);
}
function drawPlate(c) {   // sajian terakhir di piring meja makan
  const d = M.dapur && M.dapur.dishes && M.dapur.dishes[M.dapur.dishes.length - 1]; if (!d) return;
  const s = L.solids.meja, cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, p = P(cx - 0.45, cy + 0.08, 30.6), T = Core.tierInfo(d.tier);
  c.fillStyle = T.dish; c.beginPath(); c.ellipse(p.x, p.y - 1.6, 5.2, 2.4, 0, 0, TAU); c.fill(); c.fillStyle = "rgba(255,255,255,.28)"; c.beginPath(); c.ellipse(p.x - 1.2, p.y - 2.4, 2, 0.9, 0, 0, TAU); c.fill();
  if (d.tier === "gosong") smoke(c, { x: p.x, y: p.y - 4 }, performance.now() / 1000, 1);
}
function ell2(c, x, y, rx, ry, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
function sizzle(c, p, t, lv) { for (let k = 0; k < 4 + lv; k++) { const ph = (t * (2 + lv) + k * 0.31) % 1; c.globalAlpha = (1 - ph) * 0.8; c.fillStyle = "#fff3c4"; c.beginPath(); c.arc(p.x - 9 + ((k * 7) % 18), p.y - 6 - ph * 6, 0.8 + (1 - ph) * 0.8, 0, TAU); c.fill(); } c.globalAlpha = 1; }
function smoke(c, p, t, n) { for (let k = 0; k < n; k++) { const ph = (t * 0.5 + k / n) % 1, x = p.x + Math.sin(ph * 7 + k * 2) * (M.calm ? 1 : 5), y = p.y - 8 - ph * 26; c.globalAlpha = (1 - ph) * 0.55; ell2(c, x, y, 3 + ph * 6, 2.4 + ph * 4.5, "#4d4a47"); } c.globalAlpha = 1; }
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function mix(a, b, k, c2, k2) { const A0 = hex(a), B0 = hex(b), C0 = hex(c2); const m = A0.map((v, i) => v + (B0[i] - v) * Math.max(0, Math.min(1, k))); const r = m.map((v, i) => v + (C0[i] - v) * Math.max(0, Math.min(1, k2))); return "rgb(" + r.map(Math.round).join(",") + ")"; }
function lighten(col, k) { const m = col.match(/\d+/g); if (!m) return col; return "rgb(" + m.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(+v + 255 * k * 0.4)))).join(",") + ")"; }

// ---------- wajah & emote pemain (kartun) ----------
const FX_ = [1, 0.7, 0, -0.7, -1, -0.7, 0, 0.7], FY_ = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7];
function afterPlayer(c, pl, t) {
  const F = M.face; if (!F) return; const now = performance.now(), age = now - F.t0; if (age > F.ms + 400) { M.face = null; return; }
  const dir = pl.dir | 0, fx = FX_[dir], fy = FY_[dir]; if (fy < -0.1) return;
  const o = P(pl.x, pl.y, 0), bob = pl.moving ? 0 : Math.sin(t * 2.2 + (pl.seed || 0)) * 0.6, hy = o.y - bob - 30, ex = fx * 2.8, side = Math.abs(fx) > 0.9, skin = (pl.style && pl.style.skin) || "#f1c8a0";
  const k = Math.min(1, age / Math.max(1, F.ms)), face = F.face;
  c.save(); c.beginPath(); c.arc(o.x, hy, 7.3, 0, TAU); c.clip();
  c.fillStyle = skin; c.fillRect(o.x - 8, hy - 1.6, 16, 10);                                         // tutup wajah lama, lalu gambar ekspresi
  if (face === "mual") { c.fillStyle = "rgba(150,205,120,.55)"; c.fillRect(o.x - 8, hy - 1.6, 16, 10); }
  const eye = (x, y) => { c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(x, y, 1.2, 0, TAU); c.fill(); };
  const eyes = side ? [fx * 4] : [-2.8 + ex, 2.8 + ex], my = hy + 3.4, mx = side ? fx * 4 : ex * 1.1;
  c.strokeStyle = "#6b3a2a"; c.lineWidth = 0.9; c.lineCap = "round"; c.fillStyle = "rgba(240,120,110,.4)";
  if (face === "puas") { for (const e of eyes) { c.strokeStyle = "#2a1d14"; c.beginPath(); c.arc(o.x + e, hy + 1.2, 1.5, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } c.beginPath(); c.arc(o.x - 4.5 + ex, hy + 3.2, 1.8, 0, TAU); c.arc(o.x + 4.5 + ex, hy + 3.2, 1.8, 0, TAU); c.fill(); c.strokeStyle = "#6b3a2a"; c.beginPath(); c.arc(o.x + mx, my - 0.8, 2.4, 0.15, Math.PI - 0.15); c.stroke(); }
  else if (face === "biasa") { for (const e of eyes) eye(o.x + e, hy + 0.5); c.beginPath(); c.arc(o.x + mx, my - 0.4, 1.8, 0.2, Math.PI - 0.2); c.stroke(); }
  else if (face === "ragu") { for (const e of eyes) eye(o.x + e, hy + 0.8); c.strokeStyle = "#3a2a20"; c.beginPath(); c.moveTo(o.x + eyes[0] - 2, hy - 1.2); c.lineTo(o.x + eyes[0] + 1.6, hy - 2.2); c.stroke(); c.strokeStyle = "#6b3a2a"; c.beginPath(); c.moveTo(o.x + mx - 2, my + 0.4); c.quadraticCurveTo(o.x + mx - 0.6, my - 0.9, o.x + mx + 0.6, my + 0.4); c.quadraticCurveTo(o.x + mx + 1.6, my + 1.5, o.x + mx + 2.4, my + 0.2); c.stroke(); }
  else if (face === "bingung") { eye(o.x + eyes[0], hy + 0.5); c.fillStyle = "#2a1d14"; c.beginPath(); c.arc(o.x + eyes[eyes.length - 1], hy + 0.5, 1.7, 0, TAU); c.fill(); c.strokeStyle = "#6b3a2a"; c.beginPath(); c.moveTo(o.x + mx - 2, my); c.quadraticCurveTo(o.x + mx - 1, my + 1.4, o.x + mx, my); c.quadraticCurveTo(o.x + mx + 1, my - 1.4, o.x + mx + 2, my); c.stroke(); }
  else if (face === "batuk") { c.strokeStyle = "#2a1d14"; for (const e of eyes) { c.beginPath(); c.moveTo(o.x + e - 1.4, hy - 0.4); c.lineTo(o.x + e + 0.8, hy + 0.8); c.lineTo(o.x + e - 1.4, hy + 2); c.stroke(); } c.fillStyle = "#7a2d28"; c.beginPath(); c.ellipse(o.x + mx, my + 0.6, 1.5, 1.9 + Math.sin(age / 90) * (M.calm ? 0 : 0.5), 0, 0, TAU); c.fill(); }
  else if (face === "mual") {
    c.strokeStyle = "#2a1d14"; for (const e of eyes) { c.beginPath(); c.arc(o.x + e, hy + 0.8, 1.5, 0, TAU * 0.8); c.stroke(); }
    const open = F.vomit && k > 0.22 && k < 0.5; c.fillStyle = "#7a2d28"; c.strokeStyle = "#5a2a20";
    if (open) { c.beginPath(); c.ellipse(o.x + mx, my + 0.8, 2.2, 2.6, 0, 0, TAU); c.fill(); } else { c.beginPath(); c.moveTo(o.x + mx - 2.4, my + 0.8); c.quadraticCurveTo(o.x + mx - 1.2, my - 0.6, o.x + mx, my + 0.8); c.quadraticCurveTo(o.x + mx + 1.2, my + 2, o.x + mx + 2.4, my + 0.6); c.stroke(); }
  }
  c.restore();
  // gelembung emote + efek di atas kepala
  const bx = o.x + 11, by = hy - 15 - Math.min(4, age / 120); const E = F.eat ? Core.eatInfo(F.effect) : Core.tierInfo(F.tier);
  c.globalAlpha = Math.min(1, (F.ms + 300 - age) / 300); c.fillStyle = "#fffdf4"; c.strokeStyle = "#173f50"; c.lineWidth = 1; c.beginPath(); c.arc(bx, by, 8, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(bx - 5, by + 5); c.lineTo(bx - 9, by + 11); c.lineTo(bx - 1, by + 7); c.fill(); c.font = "11px system-ui,'Segoe UI Emoji',sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#173f50"; c.fillText(E.emoji, bx, by + 0.5);
  if (face === "bingung" || face === "ragu") { c.fillStyle = "#173f50"; c.font = "bold 10px system-ui,sans-serif"; c.fillText(face === "bingung" ? "?" : "…", o.x - 9, hy - 14 - (M.calm ? 0 : Math.sin(age / 200) * 1.5)); }
  if (face === "ragu") { c.fillStyle = "rgba(120,190,230,.9)"; const dy = M.calm ? 0 : (age / 260) % 1 * 4; c.beginPath(); c.ellipse(o.x - 7.6, hy - 3 + dy, 1, 1.6, 0, 0, TAU); c.fill(); }
  if (face === "puas" && !M.calm) for (let i = 0; i < 3; i++) { const ph = ((age / 700) + i / 3) % 1; c.globalAlpha = (1 - ph); c.fillStyle = "#ffd34a"; c.fillRect(o.x - 12 + i * 12, hy - 8 - ph * 10, 2, 2); }
  if (face === "batuk") smoke(c, { x: o.x + fx * 6, y: hy + 2 }, now / 1000, 2);
  if (face === "mual" && F.vomit && k > 0.28 && k < 0.5) {      // "blegh" kartun singkat: percikan hijau muda & bintang kecil ke arah ember, bukan visual yang menjijikkan
    const q = (k - 0.28) / 0.22; for (let i = 0; i < 7; i++) { const a = i * 0.7, x = o.x + fx * (7 + q * 14) + Math.cos(a) * 2.4, y = hy + 5 + q * 16 + (i % 3) * 2 + q * q * 10; c.globalAlpha = 1 - q * 0.8; c.fillStyle = i % 2 ? "#cfe8a0" : "#f2f0b0"; c.beginPath(); c.arc(x, y, 1.8 - q * 0.6, 0, TAU); c.fill(); }
    c.globalAlpha = 1; const bk = P(pl.x + fx * 0.5, pl.y + 0.2, 0); c.fillStyle = "#4a8fc8"; c.fillRect(bk.x + fx * 9 - 4, bk.y - 5, 8, 5); c.fillStyle = "#6fb4cf"; c.beginPath(); c.ellipse(bk.x + fx * 9, bk.y - 5, 4, 1.4, 0, 0, TAU); c.fill();
  }
  if (face === "mual" && (!F.vomit || M.calm)) { c.fillStyle = "#173f50"; c.font = "bold 9px system-ui,sans-serif"; c.fillText("blegh…", o.x - 13, hy - 12); }
  c.globalAlpha = 1;
}

// ---------- jembatan ke workstation (bench.js): hanya NIAT & tampilan ----------
function snap() {
  const c = M.dapur && M.dapur.cook, r = c && c.rec ? recOf(c.rec) : null;
  return { panel: M.panel, loaded: M.loaded, phase: phase(), tool: c ? c.tool : M.tool, cook: c || null, rec: r, selRec: M.sel ? recOf(M.sel) : null, ing: M.tab === "bebas" ? M.ing : null, fishN: M.fish.length,
    acts: c ? actsFor(c, r) : [], hint: r ? Core.nextHint(r, M.done) : null, done: M.done, pad: M.pad ? { id: M.pad.id, p: M.pad.p, kind: M.pad.spec.kind, label: M.pad.spec.label, hint: M.pad.spec.hint } : null,
    busy: M.busy, calm: M.calm, est: M.est, stage: stage(), flip: M.fx.flip, face: M.face, eatInfo: M.eatInfo, result: M.result, dishes: (M.dapur && M.dapur.dishes) || [],
    washItem: M.washItem, washStep: M.washStep, dirty: Core.dirtyList(M.dapur), view: M.bench.view, dropped: M.bench.dropped, plated: M.bench.plated };
}
function benchAct(a, v) { const b = { dataset: { a, v: String(v == null ? "" : v) } }; onClick({ target: { closest: () => b } }); }
function benchSet(k, v) {
  if (k === "drop") { M.bench.dropped[v] = true; snd("dapur_bumbu"); burst("bumbui", 3); }
  else if (k === "view") { M.bench.view = v; snd("dapur_sendok"); }
  else if (k === "plate") { M.bench.plated = v; snd("dapur_piring"); }
}
function benchDown(e) { padDown(e); }

NW.dapurMasak = {
  snap, benchAct, benchSet, benchDown,
  M, open, leave, load, drawCook, drawPlate, afterPlayer, render, snd, closeSheet, react, blur, clearBlur, hasPanel: () => !!M.panel,
  stage, get cooking() { return !!(M.dapur && M.dapur.cook); }, setCalm(v) { M.calm = !!v; try { localStorage.setItem(CALM_KEY, v ? "1" : "0"); } catch (e) { /* abaikan */ } if (v) clearBlur(); },
  _ops: M.ops,
};
})();
