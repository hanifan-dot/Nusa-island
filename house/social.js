// =========================================================
//  NUSA ISLAND — Rumahku Sosial (Tahap 4). Modul: NW.social
//  Daftar pemain online (avatar + nama permanen), undangan kunjungan TERIMA/TOLAK, senyapkan, blokir.
//  Semua keputusan ada di SERVER (nusa-api: homeInvite/homeInbox/homeRespond/homePrefs). Klien hanya mengirim ID publik (pid) dan menampilkan jawaban.
//  FITUR MATI secara bawaan: aktif hanya bila window.NUSA_SOCIAL_HOME === true DAN server menjawab homeInbox (cek kemampuan).
//  Tidak menyentuh koin, kolam, inventaris, Cloud Save, atau protokol multiplayer (hanya membaca daftar pemain yang sudah ada).
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa, $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const user = () => (NW.cloud && NW.cloud.user) || null;
const POLL_MS = 20000;
const S = { on: false, tab: "online", inv: [], prefs: null, msg: "", sent: {}, seen: new Set(), pend: null, timer: 0, busy: false, ready: false, cool: {} };
const wanted = () => window.NUSA_SOCIAL_HOME === true;
const canApi = () => !!(wanted() && window.NusaApi && window.NusaApi.enabled() && user());
const api = (name, data) => window.NusaApi.call(name, data || {}, true);
const errText = (e) => (e && e.message) || "Jaringan bermasalah. Coba lagi.";

// ---------- daftar online (dari ruang dunia yang sedang dipakai; tidak ada daftar global) ----------
function onlineList() {
  const v = NW.mp && NW.mp.view ? NW.mp.view() : null;
  if (!v || !v.online || v.house) return { list: [], reason: !v || !v.online ? "Aktifkan Dunia Bersama (Bermain di Dunia) untuk melihat pemain online." : "Kamu sedang di rumah. Keluar ke dunia untuk melihat pemain online." };
  const blocked = new Set(((S.prefs && S.prefs.blocks) || []).map((b) => b.pid));
  const list = v.players.filter((p) => p.hid && !blocked.has(p.hid)).map((p) => ({ id: p.id, pid: p.hid, sid: "#" + p.hid.slice(0, 5), name: p.name, style: p.style }));
  return { list, reason: list.length ? "" : "Belum ada pemain lain di sekitarmu." };
}

// ---------- tampilan ----------
function rowOnline(r) {
  const cd = (S.cool[r.pid] || 0) > Date.now();
  return `<div class="vh-row"><canvas class="sc-av" width="44" height="56" data-pid="${r.pid}"></canvas><div class="grow"><b>${esc(r.name)}</b> <span class="vh-sid">${esc(r.sid)}</span></div>
    <button class="btn small gold" data-sinv="${r.pid}" ${cd ? "disabled" : ""}>${cd ? "Tunggu…" : "Undang"}</button><button class="btn small" data-sblock="${r.pid}" title="Blokir">⛔</button></div>`;
}
function tabsHTML() {
  const n = S.inv.length;
  return `<div class="vh-tabs"><button data-stab="online" class="${S.tab === "online" ? "on" : ""}">👥 Online</button><button data-stab="inbox" class="${S.tab === "inbox" ? "on" : ""}">📬 Undangan${n ? ` (${n})` : ""}</button><button data-stab="prefs" class="${S.tab === "prefs" ? "on" : ""}">⚙️ Atur</button></div>`;
}
function bodyHTML() {
  if (S.tab === "online") {
    const o = onlineList();
    return `<p class="muted vh-fine">Undang pemain ke <b>Rumahku</b>. Dia bisa TERIMA atau TOLAK. Kamu tetap pemilik: bisa mengeluarkan tamu kapan saja.</p>${o.list.length ? o.list.map(rowOnline).join("") : `<div class="vh-none">${esc(o.reason)}</div>`}`;
  }
  if (S.tab === "inbox") {
    return S.inv.length ? S.inv.map((i) => `<div class="vh-row"><div class="vh-ic">💌</div><div class="grow"><b>${esc(i.name)}</b> <span class="vh-sid">${esc(i.sid)}</span><div class="muted">mengundangmu ke rumahnya</div></div>
      <button class="btn small gold" data-sacc="${esc(i.id)}">TERIMA</button><button class="btn small" data-sdec="${esc(i.id)}">TOLAK</button></div>`).join("")
      : `<div class="vh-none">Tidak ada undangan.</div>`;
  }
  const p = S.prefs;
  if (!p) return `<div class="muted vh-hint">Memuat…</div>`;
  return `<div class="vh-sw"><button class="btn small ${p.mute ? "gold" : ""}" data-smute="1">🔕 Senyap${p.mute ? " (aktif)" : ""}</button><button class="btn small ${!p.mute ? "gold" : ""}" data-smute="0">🔔 Terima undangan</button></div>
    <div class="muted">${p.mute ? "Undangan baru tidak akan muncul. Pengundang tidak diberi tahu." : "Undangan dari pemain lain akan muncul sebagai notifikasi."}</div>
    <h4 class="vh-h">Pemain diblokir (${p.blocks.length})</h4>${p.blocks.length ? p.blocks.map((b) => `<div class="vh-row"><div class="vh-ic">⛔</div><div class="grow"><b>${esc(b.name)}</b> <span class="vh-sid">${esc(b.sid)}</span></div><button class="btn small" data-sunblock="${esc(b.pid)}">Buka blokir</button></div>`).join("") : `<div class="muted vh-hint">Belum ada.</div>`}`;
}
const panelHTML = () => (S.on ? `<div class="vh">${tabsHTML()}${S.msg ? `<div class="vh-msg">${esc(S.msg)}</div>` : ""}${bodyHTML()}</div>` : `<div class="vh-msg">Fitur belum aktif.</div>`);

function drawMinis() {
  const cvs = document.querySelectorAll("canvas.sc-av"); if (!cvs.length || !NW.drawCharacter) return;
  const v = NW.mp.view(), by = new Map(v.players.map((p) => [p.hid, p]));
  cvs.forEach((cv) => {
    const p = by.get(cv.dataset.pid); if (!p || !p.style) return;
    const x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height);
    const ch = { x: 0, y: 0, z: 0, dir: 2, walk: 0, moving: false, seed: 0, rod: 0, isMe: false, style: p.style };
    x.save(); x.translate(cv.width / 2, cv.height - 6); x.scale(cv.width / 40, cv.width / 40); try { NW.drawCharacter(x, ch, 0); } catch (e) {} x.restore();
  });
}
function render() { if (N().currentPanel() === "friends") { N().renderPanel(); } }
function after(body) {
  drawMinis();
  if (body._scBound) return; body._scBound = true;
  body.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return; const d = t.dataset; N().sfx("click");
    if (d.stab) { S.tab = d.stab; S.msg = ""; if (d.stab === "prefs") loadPrefs(); if (d.stab === "inbox") pollNow(); render(); }
    else if (d.sinv) invite(d.sinv);
    else if (d.sacc) respond(d.sacc, true);
    else if (d.sdec) respond(d.sdec, false);
    else if (d.smute) setMute(d.smute === "1");
    else if (d.sblock) block(d.sblock, true);
    else if (d.sunblock) block(d.sunblock, false);
  });
}

// ---------- aksi (semuanya lewat server) ----------
async function invite(pid) {
  S.msg = "";
  try {
    const r = await api("homeInvite", { pid });
    if (r.sent) { S.cool[pid] = Date.now() + 60000; N().toast("📨 Undangan terkirim", "good"); setTimeout(render, 61000); }
    else { S.cool[pid] = Date.now() + (r.wait || 60) * 1000; S.msg = `Tunggu ${r.wait || 60} detik sebelum mengundang lagi.`; }
  } catch (e) { S.msg = errText(e); }
  render();
}
async function loadPrefs() { try { S.prefs = await api("homeSettings"); } catch (e) { S.msg = errText(e); } render(); }
async function setMute(on) { try { const r = await api("homePrefs", { mute: on }); S.prefs = Object.assign(S.prefs || {}, { mute: r.mute, blocks: r.blocks }); } catch (e) { S.msg = errText(e); } render(); }
async function block(pid, on) {
  try { const r = await api("homePrefs", { block: pid, on }); S.prefs = Object.assign(S.prefs || {}, { mute: r.mute, blocks: r.blocks }); S.inv = S.inv.filter((i) => i.pid !== pid); syncBadge();
    if (on && NW.mp && NW.mp.eject) { const v = NW.mp.view(); if (v.house) for (const p of v.players) if (p.hid === pid) NW.mp.eject(p.id); } }   // tamu yang diblokir langsung dikeluarkan
  catch (e) { S.msg = errText(e); }
  render();
}
async function respond(id, accept) {
  if (S.busy) return; S.busy = true;
  try {
    const r = await api("homeRespond", { id, accept });
    S.inv = S.inv.filter((i) => i.id !== id); syncBadge(); hidePop();
    if (accept && r.accepted) goVisit(r.pid, r.name);
  } catch (e) { S.msg = errText(e); S.inv = S.inv.filter((i) => i.id !== id); syncBadge(); hidePop(); N().toast(errText(e), "bad"); }
  S.busy = false; render();
}
// masuk ke rumah pengundang: homeVisit tetap diperiksa server (undangan diterima = izin sementara)
async function goVisit(pid, name) {
  try {
    const H = NW.home; if (!H) return;
    if (H.active && !H.visit) { const info = await api("homeVisit", { pid }); N().closePanel(); H.enterVisit(info, NW.world.player); return; }
    S.pend = { pid, name, until: Date.now() + 2 * 3600000 };
    N().toast(`✅ Undangan ${name} diterima. Buka Rumahku lalu tekan 🏠 untuk masuk.`, "good");
    if (NW.house && NW.house._V) NW.house._V.pendInvite = S.pend;
  } catch (e) { N().toast(errText(e), "bad"); }
}

// ---------- notifikasi & polling ----------
function syncBadge() { const b = $("friendsBadge"); if (b) { b.textContent = String(S.inv.length); b.classList.toggle("hidden", !S.inv.length); } }
function hidePop() { const p = $("invPop"); if (p) { p.classList.add("hidden"); p.innerHTML = ""; } }
function showPop(i) {
  const p = $("invPop"); if (!p) return;
  p.innerHTML = `<div class="inv-t">💌 <b>${esc(i.name)}</b> <span class="vh-sid">${esc(i.sid)}</span> mengundangmu berkunjung ke rumahnya</div><div class="inv-b"><button class="btn small gold" data-sacc="${esc(i.id)}">TERIMA</button><button class="btn small" data-sdec="${esc(i.id)}">TOLAK</button></div>`;
  p.classList.remove("hidden");
}
async function pollNow() {
  if (!canApi()) return;
  try {
    const r = await api("homeInbox"); S.ready = true;
    S.inv = r.invites || []; syncBadge();
    for (const i of S.inv) if (!S.seen.has(i.id)) { S.seen.add(i.id); showPop(i); N().sfx && N().sfx("click"); break; }
    if (!S.inv.length) hidePop();
    render();
  } catch (e) { if (e && (e.code === "not-found" || e.code === "unimplemented" || e.code === "invalid-argument") && !S.ready) disable(); }
}
function disable() { S.on = false; clearInterval(S.timer); $("friendsBtn").classList.add("hidden"); }
function start() {
  if (S.on || !canApi()) return;
  api("homeInbox").then((r) => {                                    // cek kemampuan: server harus punya fungsi baru, kalau tidak fitur tetap tersembunyi
    if (!r || !Array.isArray(r.invites)) return;
    S.on = true; S.ready = true; $("friendsBtn").classList.remove("hidden"); S.timer = setInterval(() => { if (!document.hidden) pollNow(); }, POLL_MS); pollNow();
  }).catch(() => { /* backend belum siap: fitur tetap mati */ });
}
function hook() {
  if (!wanted()) return;
  N().registerPanel("friends", { title: () => "👥 Teman & Undangan", render: panelHTML, after });
  $("friendsBtn").addEventListener("click", () => { N().sfx("click"); S.tab = S.inv.length ? "inbox" : "online"; S.msg = ""; N().openPanel("friends"); });
  $("invPop").addEventListener("click", (e) => { const t = e.target.closest("button"); if (!t) return; if (t.dataset.sacc) respond(t.dataset.sacc, true); else if (t.dataset.sdec) respond(t.dataset.sdec, false); });
  if (NW.mp && NW.mp.onChange) NW.mp.onChange(() => { if (N().currentPanel() === "friends" && S.tab === "online") { clearTimeout(S._rt); S._rt = setTimeout(render, 400); } });
  setInterval(() => { if (!S.on) start(); }, 5000); start();
}
NW.social = { hook, start, _S: S, _poll: pollNow };
window.addEventListener("load", () => setTimeout(hook, 900));
})();
