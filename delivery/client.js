// NUSA ISLAND — Pengiriman Segar Pak Damar (klien). NUSA_DELIVERY HANYA mengontrol apakah modul ini DIUNDUH. Akses fitur = status SERVER: `gameFlags.pakDamar` (Worker 01).
// Server OFF/404/gagal → meja & panel tidak muncul (tidak ada akses lewat flag klien). Server ON → semua aksi lewat fungsi ecoDamar* (kontrak Worker 01); klien tidak memberi hadiah/koin.
// Muat ikan = ecoDamarLoad (server memindahkan ikan ke kotak pendingin). Berlayar/Antar (ecoDamarSail/Deliver) SUDAH ada di adapter, dipakai setelah Pelabuhan Kota ada (PR-A3).
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDeliveryCore; if (!Core) return;
const N = () => window.Nusa, S = () => N().S, $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const st = { plan: Core.emptyPlan(), sel: null, panel: null, hooked: false, busy: false, msg: "", view: null, srv: false, gateTried: false, stateAt: 0 };
let ST = null;   // posisi meja (tile)
const call = (name, body) => (window.NusaApi && window.NusaApi.enabled() ? window.NusaApi.call(name, body || {}, true) : Promise.reject(Object.assign(new Error("offline"), { code: "unavailable" })));
let opN = 0; const newOp = () => "dm" + Date.now().toString(36) + (opN++).toString(36) + Math.random().toString(36).slice(2, 7);
const fishName = (id) => { try { const f = N().FISH && N().FISH.find((x) => x.id === id); return (f && f.name) || id; } catch (e) { return id; } };
const cooler = () => (S() && Array.isArray(S().cooler) ? S().cooler : []);
// adapter server (kontrak Worker 01). Setiap jawaban: tampilan `damar` disaring Core.view; keadaan ekonomi diselaraskan oleh NW.eco (balance dari SERVER).
function absorb(res) { if (!res || typeof res !== "object") return null; const v = Core.view(res.damar); if (v) st.view = v; try { if (NW.eco && NW.eco.applyState) NW.eco.applyState(res); } catch (e) {} return res; }
const api = {
  async state() { return absorb(await call("ecoDamarState", {})); },
  async load(bodies) { const out = []; for (const b of bodies) { out.push(absorb(await call("ecoDamarLoad", b))); localTake(b.uids); } return out; },
  async unload(box) { const before = st.view && st.view.boxes[box] ? st.view.boxes[box].fish.slice() : []; const q = Core.boxBody(box, newOp()); if (!q.ok) throw new Error(q.why); const r = absorb(await call("ecoDamarUnload", q.body)); localReturn(before); return r; },
  async sail(box, opId) { const q = Core.boxBody(box, opId || newOp()); if (!q.ok) throw new Error(q.why); return absorb(await call("ecoDamarSail", q.body)); },
  async abort(box, opId) { const q = Core.boxBody(box, opId || newOp()); if (!q.ok) throw new Error(q.why); return absorb(await call("ecoDamarAbort", q.body)); },
  async deliver(box, opId) { const q = Core.boxBody(box, opId || newOp()); if (!q.ok) throw new Error(q.why); return absorb(await call("ecoDamarDeliver", q.body)); },
};
// ikan yang sudah di kotak pendingin server tidak lagi ada di Tas lokal (cermin); dikembalikan saat dibongkar
function localTake(uids) { const S0 = S(); if (!S0 || !Array.isArray(S0.cooler)) return; S0.cooler = S0.cooler.filter((i) => !uids.includes(i.uid)); try { N().save(); } catch (e) {} }
function localReturn(list) { const S0 = S(); if (!S0 || !Array.isArray(S0.cooler)) return; for (const f of list) if (f && f.u && !S0.cooler.some((i) => i.uid === f.u)) S0.cooler.push({ uid: f.u, id: f.id, w: f.w, t: Date.now() }); try { N().save(); } catch (e) {} }
const pool = () => { Core.prune(st.plan, cooler()); return cooler().filter((i) => Core.where(st.plan, i.uid) < 0 && i.lock !== true); };
const itemById = (u) => cooler().find((i) => i.uid === u);
function chip(i, extra) { return `<button type="button" class="dl-fish" data-uid="${esc(i.uid)}" draggable="true" ${extra || ""}>🐟<span>${esc(fishName(i.id))}</span><small>${(Number(i.w) || 0).toFixed(1)} kg</small></button>`; }
function boxHTML(b) {
  const l = Core.label(st.plan, b, cooler()), full = l.n >= Core.PER_BOX, cells = st.plan.boxes[b].map((u) => itemById(u)).filter(Boolean);
  return `<div class="dl-box ${full ? "full" : ""}" data-box="${b}" role="group" aria-label="Kotak ${b + 1}"><div class="dl-ice" aria-hidden="true">❄️ 🧊 ❄️</div><h4>Kotak ${b + 1} <em>${l.n}/${Core.PER_BOX}</em></h4>${cells.map((i) => chip(i, 'data-in="1"')).join("") || '<p class="dl-empty">Taruh 3 ikan di sini</p>'}<div class="dl-label"><b>${l.kg.toFixed(1)} kg</b> → ${esc(l.dest)}</div><div class="dl-sticker">${esc(l.sticker)}</div></div>`;
}
function loadedHTML() {
  const vw = st.view, stg = Core.stageOf(vw), bx = vw.boxes;
  const cell = (b, i) => `<div class="dl-box full" data-box="${i}"><div class="dl-ice" aria-hidden="true">❄️ 🧊 ❄️</div><h4>Kotak ${i + 1} <em>${b.n}/${vw.per}${b.st === "sailing" ? " · berlayar" : ""}</em></h4>${b.fish.map((f) => `<div class="dl-fish static">🐟<span>${esc(fishName(f.id))}</span><small>${f.w.toFixed(1)} kg</small></div>`).join("") || '<p class="dl-empty">Kosong</p>'}<div class="dl-sticker">${esc(Core.STICKER)}</div>${b.st === "idle" && b.n ? `<button type="button" class="dl-un" data-un="${i}">Bongkar</button>` : ""}</div>`;
  const note = stg === "sailing" ? "Kotak sedang berlayar." : stg === "loaded" ? "Kedua kotak sudah di kapal. Pilih tujuan: Pelabuhan Kota." : "Pesanan hari ini belum lengkap.";
  return `<div id="dlTrip"></div><section class="dl-boxes dl-wide" aria-label="Kotak di kapal">${bx.map(cell).join("")}</section><p class="dl-msg" id="dlMsg">${esc(st.msg || note)}</p>`;
}
function render() {
  if (!st.panel) return; const p = pool(), rdy = Core.ready(st.plan), vw = st.view, stg = Core.stageOf(vw);
  if (!st.srv) { $("dlBody").innerHTML = '<p class="dl-msg">Pengiriman Pak Damar belum dibuka oleh server.</p>'; return; }
  if (!vw) { $("dlBody").innerHTML = `<p class="dl-msg" id="dlMsg">${esc(st.msg || "Memuat status dari server…")}</p>`; return; }
  if (stg !== "packing") { $("dlBody").innerHTML = loadedHTML(); $("dlBody").querySelectorAll("[data-un]").forEach((b) => b.addEventListener("click", () => unload(+b.dataset.un))); if (NW.port && NW.port.mountTrip) NW.port.mountTrip($("dlTrip")); return; }
  $("dlBody").innerHTML = `<div class="dl-cols"><section class="dl-bag" aria-label="Tas"><h3>🎒 Tas (${p.length})</h3><div class="dl-list">${p.map((i) => chip(i, st.sel === i.uid ? 'class="sel"' : "")).join("") || '<p class="dl-empty">Tidak ada ikan yang bisa dikemas.</p>'}</div></section><section class="dl-boxes" aria-label="Kotak pendingin">${boxHTML(0)}${boxHTML(1)}</section></div><p class="dl-msg" id="dlMsg">${esc(st.msg || (st.sel ? "Ketuk kotak tujuan." : "Seret atau ketuk ikan, lalu pilih kotak."))}</p><div class="dl-act"><button type="button" id="dlClear">Kosongkan</button><button type="button" id="dlSend" ${rdy && !st.busy ? "" : "disabled"}>Muat ke kapal 🚢</button></div>`;
  wire();
}
function drop(uid, box) { const it = itemById(uid); if (!it) return; const r = Core.pack(st.plan, it, box); st.msg = r.ok ? "" : ({ "kotak-penuh": "Kotak sudah berisi 3 ikan.", terkunci: "Ikan terkunci tidak bisa dikirim.", "sudah-dikemas": "Ikan sudah ada di kotak." }[r.why] || "Tidak bisa dikemas."); st.sel = null; sfx(); render(); }
function sfx() { try { if (NW.audio && NW.audio.play) NW.audio.play("click"); } catch (e) {} }
function wire() {
  const root = $("dlBody");
  root.querySelectorAll(".dl-fish").forEach((b) => {
    b.addEventListener("click", () => { const u = b.dataset.uid; if (b.dataset.in && st.sel) { drop(st.sel, +b.closest(".dl-box").dataset.box); } else if (b.dataset.in) { Core.unpack(st.plan, u); st.msg = ""; render(); } else { st.sel = st.sel === u ? null : u; render(); } });
    b.addEventListener("dragstart", (e) => { try { e.dataTransfer.setData("text/plain", b.dataset.uid); } catch (x) {} });
  });
  root.querySelectorAll(".dl-box").forEach((bx) => {
    const k = +bx.dataset.box;
    bx.addEventListener("dragover", (e) => e.preventDefault());
    bx.addEventListener("drop", (e) => { e.preventDefault(); let u = ""; try { u = e.dataTransfer.getData("text/plain"); } catch (x) {} if (u) drop(u, k); });
    bx.addEventListener("click", (e) => { if (e.target.closest(".dl-fish")) return; if (st.sel) drop(st.sel, k); });
  });
  $("dlClear").addEventListener("click", () => { Core.clear(st.plan); st.sel = null; st.msg = ""; render(); });
  $("dlSend").addEventListener("click", send);
}
const errMsg = (e) => (e && e.code === "unauthenticated" ? "Masuk dulu dengan akun Google." : e && e.code === "unavailable" ? "Jaringan bermasalah. Ikanmu tetap aman." : e && e.message ? String(e.message).slice(0, 120) : "Server menolak. Ikanmu tetap aman.");
async function send() {
  if (st.busy || !st.srv) return; const rq = Core.loadBodies(st.plan, newOp);
  if (!rq.ok) { st.msg = "Isi kedua kotak dengan 3 ikan."; return render(); }
  st.busy = true; st.msg = "Memuat ke kapal…"; render();
  try { await api.load(rq.bodies); Core.clear(st.plan); st.msg = "Kotak dimuat ke kapal."; }
  catch (e) { st.msg = errMsg(e); try { await api.state(); } catch (x) {} }   // sebagian mungkin sudah masuk: selaraskan dengan SERVER
  st.busy = false; render(); if (NW.world && NW.world.requestDraw) NW.world.requestDraw();
}
async function unload(i) { if (st.busy) return; st.busy = true; try { await api.unload(i); st.msg = "Kotak dibongkar; ikan kembali ke Tas."; } catch (e) { st.msg = errMsg(e); } st.busy = false; render(); }
function build() {
  if (st.panel) return; const d = document.createElement("div"); d.id = "dlOv"; d.className = "hidden"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Pengiriman Segar Pak Damar");
  d.innerHTML = `<div class="dl-card"><button type="button" class="dl-x" id="dlX" aria-label="Tutup">✕</button><h2>Pengiriman Segar · Pak Damar</h2><div id="dlBody"></div></div>`;
  document.body.appendChild(d); st.panel = d; $("dlX").addEventListener("click", close); d.addEventListener("click", (e) => { if (e.target === d) close(); });
  d.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
}
async function open() {
  if (!st.srv) return; build(); st.panel.classList.remove("hidden"); document.body.classList.add("dl-open"); render();
  if (Date.now() - st.stateAt > 15000 || !st.view) { st.stateAt = Date.now(); try { await api.state(); st.msg = ""; } catch (e) { st.msg = errMsg(e); } render(); }   // satu panggilan saat panel dibuka; tanpa polling
}
function close() { if (!st.panel) return; st.panel.classList.add("hidden"); document.body.classList.remove("dl-open"); }
// ---- dunia: meja pengepakan + dua kotak pendingin putih ----
function draw(c, o) {
  const P = (a, b, z) => NW.P(a, b, z), LIFT = 6, x = ST.x, y = ST.y;
  const poly = (cc, pts, fill, stroke) => { cc.beginPath(); pts.forEach((q, i) => (i ? cc.lineTo(q.x, q.y) : cc.moveTo(q.x, q.y))); cc.closePath(); cc.fillStyle = fill; cc.fill(); if (stroke) { cc.strokeStyle = stroke; cc.lineWidth = 1; cc.stroke(); } };
  const box = (bx, by, w, h, col) => { const z0 = LIFT, z1 = LIFT + h, a = (dx, dy, z) => P(bx + dx, by + dy, z), B = [a(-w, -w, z0), a(w, -w, z0), a(w, w, z0), a(-w, w, z0)], T = [a(-w, -w, z1), a(w, -w, z1), a(w, w, z1), a(-w, w, z1)];
    poly(c, [B[3], B[2], T[2], T[3]], col[1], "rgba(23,63,80,.5)"); poly(c, [B[2], B[1], T[1], T[2]], col[2], "rgba(23,63,80,.5)"); poly(c, T, col[0], "rgba(23,63,80,.55)"); return T; };
  box(x, y, 0.62, 12, ["#c9a173", "#a8814f", "#8d6a3c"]);                                   // meja kayu
  const T1 = box(x - 0.9, y + 0.55, 0.34, 14, ["#ffffff", "#dfe9ee", "#c5d6de"]);          // kotak pendingin 1
  const T2 = box(x + 0.9, y - 0.55, 0.34, 14, ["#ffffff", "#dfe9ee", "#c5d6de"]);          // kotak pendingin 2
  c.save(); c.fillStyle = "#2a9d8f"; c.font = "bold 7px system-ui"; c.textAlign = "center"; [T1, T2].forEach((t) => { const m = { x: (t[0].x + t[2].x) / 2, y: (t[0].y + t[2].y) / 2 }; c.fillText("SEGAR", m.x, m.y + 2); }); c.restore();
}
// kotak yang sudah dimuat tampak FISIK di kapal (dua kotak putih berstiker), mengikuti arah & goyangan kapal
function drawCargo(c, pose, t) {
  const vis = Core.cargoVisible(st.view); if (!vis[0] && !vis[1]) return;
  const f = NW.boat.fwd(pose.a), px = -f.y, py = f.x, P = (a, b, z) => NW.P(a, b, z), bob = Math.sin(t * 2 + pose.x) * 0.8, z0 = 6 + 9 + bob, h = 9;
  const poly = (pts, fill, stroke) => { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = 0.8; c.stroke(); };
  [0, 1].forEach((i) => { if (!vis[i]) return; const o = (i ? 1 : -1) * 0.2, cx = pose.x + f.x * 0.42 + px * o, cy = pose.y + f.y * 0.42 + py * o, w = 0.15, a = (dx, dy, z) => P(cx + dx, cy + dy, z);
    const B = [a(-w, -w, z0), a(w, -w, z0), a(w, w, z0), a(-w, w, z0)], T = [a(-w, -w, z0 + h), a(w, -w, z0 + h), a(w, w, z0 + h), a(-w, w, z0 + h)];
    poly([B[3], B[2], T[2], T[3]], "#dfe9ee", "rgba(23,63,80,.5)"); poly([B[2], B[1], T[1], T[2]], "#c5d6de", "rgba(23,63,80,.5)"); poly(T, "#ffffff", "rgba(23,63,80,.55)");
    const m = { x: (T[0].x + T[2].x) / 2, y: (T[0].y + T[2].y) / 2 }; c.fillStyle = "#2a9d8f"; c.fillRect(m.x - 3, m.y - 1, 6, 2.2); });
}
const cargoView = () => st.view;
// titik perjalanan: Pelabuhan Kota = area nyata "selat" (delivery/port.js). Sail/Deliver/Abort dipanggil HANYA oleh alur pelabuhan; hadiah selalu dari respons server.
const dest = () => (NW.port && NW.port.dest ? NW.port.dest() : { name: "Pelabuhan Kota", m: NaN, ready: false });
// ---- dunia: meja + dua kotak (muncul HANYA setelah server menyatakan pakDamar=true) ----
function addStation() {
  if (st.hooked || !NW.MUARA_MAP || !NW.objDraw || !NW.SHORE_E) return; st.hooked = true; const m = NW.MUARA_MAP;
  ST = { x: NW.SHORE_E - 4.5, y: 21.8 };   // tanah datar di samping pangkal dermaga (diverifikasi walkable)
  m.objects.push({ kind: "delivery", x: ST.x, y: ST.y, big: 120, dz: 0.6 }); m.solids.push({ x: ST.x, y: ST.y, r: 0.7 });
  m.points.push({ id: "delivery", x: ST.x, y: ST.y - 1.0, r: 2.0, icon: "📦", label: "Meja Pengepakan" });
  NW.objDraw.delivery = draw;
}
// gerbang status dari SERVER (gameFlags.pakDamar). Satu kali per sesi masuk; tanpa polling. Gagal/OFF → fitur tetap tersembunyi.
async function gate() {
  if (st.srv || st.gateTried) return; st.gateTried = true;
  try { const r = await call("gameFlags", {}); if (r && r.pakDamar === true) { st.srv = true; addStation(); if (NW.port && NW.port.setup) NW.port.setup(); } } catch (e) { /* server lama/mati: tetap tersembunyi */ }
}
function hook() {
  const t = setInterval(() => { if (st.srv || st.gateTried) return clearInterval(t); if (!(window.NusaApi && window.NusaApi.enabled() && NW.cloud && NW.cloud.user)) return; clearInterval(t); gate(); }, 3000);
}
NW.delivery = { hook, open, close, render, api, newOp, errMsg, absorb, view: () => st.view, setMsg: (m) => { st.msg = m; }, drawCargo, cargoView, dest, _st: st, _gate: gate, get isOpen() { return !!(st.panel && !st.panel.classList.contains("hidden")); }, get serverOn() { return st.srv; } };
})();
