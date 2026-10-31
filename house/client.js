// =========================================================
//  NUSA ISLAND — Kunjungi Rumah Teman (sisi game). Modul: NW.house
//  - Tombol 🏠 Kunjungi Rumah Teman hanya aktif di Rumahku. Pencarian & izin masuk = jawaban SERVER (nusa-api); tidak ada daftar pemain di game.
//  - Yang dikirim ke server hanya: teks nama yang dicari dan id publik pendek rumah. uid/email tidak pernah dikirim atau diterima.
//  - Di rumah teman semuanya hanya-lihat (home.js menolak setiap perubahan). Pemain lain di ruang yang sama = koneksi nyata (NW.mp, target "rumah").
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa, $ = (id) => document.getElementById(id);
const HC = window.NusaHouseCore;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const user = () => (NW.cloud && NW.cloud.user) || null;
const canApi = () => !!(window.NusaApi && window.NusaApi.enabled() && user());
const MSG = { "not-found": "Pemain tidak ditemukan", unauthenticated: "Masuk dulu dengan akun Google.", unavailable: "Jaringan bermasalah. Coba lagi.", "resource-exhausted": "Terlalu cepat. Coba lagi sebentar." };
const errText = (e) => (e && e.code === "not-found" ? MSG["not-found"] : (e && e.message) || MSG.unavailable);

const V = { tab: "find", q: "", res: null, msg: "", busy: false, seq: 0, tq: null, mine: null, mineMsg: "", aq: "", ares: null, aseq: 0, lastIds: "" };

// ---------- id publik sendiri (hanya untuk memilih ruang; server memeriksa ulang dari token) ----------
const myPid = () => { const u = user(); return HC && u && u.uid ? HC.pidOf(u.uid) : null; };
function roomWanted() {                                   // dibaca NW.mp: ruang rumah yang diinginkan saat ini
  if (!NW.home || !NW.home.active || !canApi()) return null;
  const v = NW.home.visit; return v ? v.pid : myPid();
}

// ---------- tombol & label ----------
function syncUI() {
  const H = NW.home, active = !!(H && H.active), visit = H && H.visit, editing = !!(H && H.isEditing && H.isEditing());
  $("visitBtn").classList.toggle("hidden", !active || !!visit || editing);
  $("visitBack").classList.toggle("hidden", !visit);
  const tag = $("visitTag"); tag.classList.toggle("hidden", !visit);
  if (visit) {
    const v = NW.mp && NW.mp.view ? NW.mp.view() : null, on = v && v.house && v.online;
    tag.innerHTML = `<b>🏠 Rumah ${esc(visit.name)}</b><span>Lv ${visit.home.level} · ${esc(visit.sid)}${on ? ` · 🟢 ${v.n} di sini` : ""}</span><em>Hanya melihat</em>`;
  }
}
function onVisitChange() { syncUI(); if (N().currentPanel() === "visit") N().closePanel(); }

// ---------- panel ----------
const rowHTML = (r, btn) => `<div class="vh-row"><div class="vh-ic">🏠</div><div class="grow"><b>${esc(r.name)}</b> <span class="vh-sid">${esc(r.sid)}</span>${r.priv ? ` <span class="vh-lock">🔒 Privat</span>` : ""}<div class="muted">Rumah level ${r.level | 0}</div></div>${btn}</div>`;
function resultsHTML(list, mode) {
  if (list === null) return `<div class="muted vh-hint">Ketik minimal 2 huruf nama pemain, atau kode teman (8 huruf) untuk rumah privat.</div>`;
  if (!list.length) return `<div class="vh-none">Pemain tidak ditemukan</div>`;
  return list.map((r) => rowHTML(r, mode === "allow" ? `<button class="btn small gold" data-allow="${r.pid}">Izinkan</button>` : r.priv && !r.can ? `<span class="muted vh-ask">Minta izin pemilik</span>` : `<button class="btn small gold" data-visit="${r.pid}">KUNJUNGI</button>`)).join("");
}
function findHTML() {
  return `<div class="vh-find"><input id="vhQ" class="vh-in" type="search" inputmode="search" placeholder="Ketik nama pemain..." maxlength="14" autocomplete="off" autocapitalize="off" enterkeyhint="search" value="${esc(V.q)}">
    <div id="vhMsg" class="vh-msg ${V.msg ? "" : "hidden"}">${esc(V.msg)}</div>
    <div id="vhRes" class="vh-res">${V.busy && V.res === null ? `<div class="muted vh-hint">Mencari…</div>` : resultsHTML(V.res, "visit")}</div>
    <p class="muted vh-fine">Hanya pemain yang benar-benar terdaftar. Kamu hanya bisa melihat-lihat; rumah teman tidak bisa diubah. Email & akun tidak ditampilkan.</p></div>`;
}
function mineHTML() {
  const m = V.mine;
  if (!m) return `<div class="muted vh-hint">Memuat pengaturan…</div>`;
  const vis = NW.mp && NW.mp.view ? NW.mp.view() : null, here = vis && vis.house && vis.online && NW.home.active && !NW.home.visit ? vis.players.filter((p) => !p.owner) : [];
  return `<div class="vh-mine">
    <div class="vh-id">ID rumahmu: <b>${esc(m.sid)}</b> <span class="muted">(membedakan nama yang sama)</span></div>
    <div class="vh-id">Kode teman: <b>${esc(m.code || "")}</b> <span class="muted">(bagikan hanya ke teman yang kamu percaya; dengan kode ini rumah privatmu bisa ditemukan, tetapi tetap butuh izinmu)</span></div>
    ${m.registered ? "" : `<div class="vh-msg">Rumahmu belum tersinkron ke server (butuh login Google & Cloud Save ☁️). Simpan dulu, lalu buka lagi menu ini.</div>`}
    <div class="vh-sw"><button class="btn small ${m.privacy === "public" ? "gold" : ""}" data-priv="public">🌍 Publik</button><button class="btn small ${m.privacy === "private" ? "gold" : ""}" data-priv="private">🔒 Privat</button></div>
    <div class="muted">${m.privacy === "public" ? "Rumahmu muncul di pencarian nama; semua pemain bisa berkunjung (hanya melihat)." : "Rumahmu TIDAK muncul di pencarian nama. Hanya teman yang kamu izinkan yang bisa masuk."}</div>
    ${V.mineMsg ? `<div class="vh-msg">${esc(V.mineMsg)}</div>` : ""}
    <h4 class="vh-h">Tamu di rumahmu sekarang</h4>
    ${here.length ? here.map((p) => `<div class="vh-row"><div class="vh-ic">🎣</div><div class="grow"><b>${esc(p.name)}</b></div><button class="btn small" data-kick="${esc(p.id)}" data-hid="${esc(p.hid)}">Keluarkan</button></div>`).join("") : `<div class="muted vh-hint">${vis && vis.house && vis.online ? "Belum ada tamu." : "Tamu terlihat bila kamu online di Rumahku (Dunia Bersama aktif)."}</div>`}
    ${m.privacy === "private" ? `<h4 class="vh-h">Teman yang diizinkan</h4>
      ${m.allow.length ? m.allow.map((a) => `<div class="vh-row"><div class="vh-ic">✅</div><div class="grow"><b>${esc(a.name)}</b> <span class="vh-sid">${esc(a.sid)}</span></div><button class="btn small" data-revoke="${a.pid}">Cabut</button></div>`).join("") : `<div class="muted vh-hint">Belum ada.</div>`}
      <input id="vhA" class="vh-in" type="search" placeholder="Nama atau kode teman..." maxlength="14" autocomplete="off" autocapitalize="off" value="${esc(V.aq)}"><div id="vhAres" class="vh-res">${resultsHTML(V.ares, "allow")}</div>` : ""}
  </div>`;
}
function panelHTML() {
  if (!canApi()) return `<div class="vh-msg">Masuk dengan akun Google dulu untuk mengunjungi rumah teman. (Butuh Cloud Save & server aktif.)</div>`;
  return `<div class="vh"><div class="vh-tabs"><button data-vtab="find" class="${V.tab === "find" ? "on" : ""}">🔎 Cari Teman</button><button data-vtab="mine" class="${V.tab === "mine" ? "on" : ""}">⚙️ Rumahku</button></div>${V.tab === "find" ? findHTML() : mineHTML()}</div>`;
}
function setRes(el, html) { if (el) el.innerHTML = html; }
async function api(name, data) { return window.NusaApi.call(name, data, true); }

function search(q, mode) {
  const seq = mode === "allow" ? ++V.aseq : ++V.seq, set = (list, busy) => { if (mode === "allow") { V.ares = list; setRes($("vhAres"), resultsHTML(list, "allow")); } else { V.res = list; V.busy = !!busy; V.msg = ""; setRes($("vhRes"), busy ? `<div class="muted vh-hint">Mencari…</div>` : resultsHTML(list, "visit")); const m = $("vhMsg"); if (m) m.classList.add("hidden"); } };
  q = String(q || "").trim();
  if (Array.from(q).length < 2) return set(null, false);
  set(mode === "allow" ? V.ares : null, true);
  api("homeSearch", { q }).then((r) => { if (seq !== (mode === "allow" ? V.aseq : V.seq)) return; set(r.results || [], false); })
    .catch((e) => { if (seq !== (mode === "allow" ? V.aseq : V.seq)) return; V.busy = false; if (mode === "allow") { setRes($("vhAres"), `<div class="vh-none">${esc(errText(e))}</div>`); } else setRes($("vhRes"), e.code === "not-found" ? `<div class="vh-none">Pemain tidak ditemukan</div>` : `<div class="vh-none">${esc(errText(e))}</div>`); });
}
async function visit(pid) {
  if (V.busy === "go") return; V.busy = "go";
  const msg = (t) => { const m = $("vhMsg"); if (m) { m.textContent = t; m.classList.toggle("hidden", !t); } V.msg = t; };
  msg("Menuju rumah teman…");
  try {
    const info = await api("homeVisit", { pid });
    if (!NW.home.active || NW.home.visit) { V.busy = false; return; }
    if (NW.mp && NW.mp.clearKick) NW.mp.clearKick(info.owner.pid);
    N().closePanel(); V.msg = "";
    NW.home.enterVisit(info, NW.world.player);
  } catch (e) { msg(errText(e)); }
  V.busy = false;
}
async function loadMine() {
  try { V.mine = await api("homeSettings", {}); } catch (e) { V.mine = null; V.mineMsg = errText(e); }
  if (N().currentPanel() === "visit") N().renderPanel();
}
async function setPrivacy(mode) {
  V.mineMsg = "";
  try { await api("homeSetPrivacy", { mode }); if (mode === "private" && NW.mp && NW.mp.eject) NW.mp.eject("*", true); await loadMine(); }
  catch (e) { V.mineMsg = errText(e); N().renderPanel(); }
}
async function allow(pid, on) {
  V.mineMsg = "";
  try { await api("homeAllow", { pid, on }); V.ares = null; V.aq = ""; await loadMine(); }
  catch (e) { V.mineMsg = errText(e); N().renderPanel(); }
}
async function kick(id, hid) {
  if (NW.mp && NW.mp.eject) NW.mp.eject(id);                 // keluar seketika (ruang rumah juga mencatat larangan)
  if (hid) { try { await api("homeKick", { pid: hid }); N().toast("Tamu dikeluarkan", "good"); } catch (e) { N().toast(errText(e), "bad"); } }
  if (N().currentPanel() === "visit") N().renderPanel();
}
function after(body) {
  body.querySelectorAll("[data-vtab]").forEach((b) => b.addEventListener("click", () => { V.tab = b.dataset.vtab; N().sfx("click"); if (V.tab === "mine") { V.mine = null; loadMine(); } N().renderPanel(); }));
  const q = $("vhQ"); if (q) { q.addEventListener("input", () => { V.q = q.value; clearTimeout(V.tq); V.tq = setTimeout(() => search(V.q, "find"), 280); }); q.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(V.tq); search(q.value, "find"); q.blur(); } }); if (V.q) search(V.q, "find"); }
  const a = $("vhA"); if (a) a.addEventListener("input", () => { V.aq = a.value; clearTimeout(V.tq); V.tq = setTimeout(() => search(V.aq, "allow"), 280); });
  if (body._vhBound) return; body._vhBound = true;                  // satu pendengar saja walau panel digambar ulang
  body.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.visit) { N().sfx("click"); visit(t.dataset.visit); }
    else if (t.dataset.priv) { N().sfx("click"); setPrivacy(t.dataset.priv); }
    else if (t.dataset.allow) { N().sfx("click"); allow(t.dataset.allow, true); }
    else if (t.dataset.revoke) { N().sfx("click"); allow(t.dataset.revoke, false); }
    else if (t.dataset.kick) { N().sfx("click"); kick(t.dataset.kick, t.dataset.hid); }
  });
}
function open() { V.tab = "find"; V.msg = ""; V.res = null; V.q = ""; N().openPanel("visit"); }

// ---------- dari NW.mp ----------
function back() { if (NW.home && NW.home.visit) NW.home.leaveVisit(NW.world.player); }
function onKicked() { if (NW.home && NW.home.visit) { N().toast("🚪 Pemilik rumah mengeluarkanmu", "bad"); back(); } }
async function onRoomFail(pid) {                           // ruang tak bisa dimasuki: tanyakan ke server apakah izinnya dicabut (privat / dikeluarkan)
  const v = NW.home && NW.home.visit; if (!v || v.pid !== pid) return;
  try { await api("homeVisit", { pid }); } catch (e) { if (e && (e.code === "permission-denied" || e.code === "not-found")) { N().toast(e.code === "not-found" ? "Pemain tidak ditemukan" : e.message, "bad"); back(); } }
}
function watchGuests() {                                   // pemilik: kabari saat tamu datang (nama dari server, hanya yang benar-benar online)
  const v = NW.mp && NW.mp.view ? NW.mp.view() : null;
  if (!v || !v.house || !v.online || (NW.home && NW.home.visit)) { V.lastIds = ""; return; }
  const cur = v.players.filter((p) => !p.owner), ids = cur.map((p) => p.id).sort().join(",");
  if (V.lastIds !== "" || ids) { const old = new Set(V.lastIds.split(",").filter(Boolean)); for (const p of cur) if (!old.has(p.id) && V.lastIds !== null) N().toast(`👋 ${p.name} berkunjung ke rumahmu`, "good"); }
  V.lastIds = ids;
  if (N().currentPanel() === "visit" && V.tab === "mine") N().renderPanel();
}
function hook() {
  N().registerPanel("visit", { title: () => "🏠 Kunjungi Rumah Teman", render: panelHTML, after });
  $("visitBtn").addEventListener("click", () => { N().sfx("click"); open(); });
  $("visitBack").addEventListener("click", () => { N().sfx("click"); back(); });
  if (NW.mp && NW.mp.onChange) NW.mp.onChange(() => { syncUI(); watchGuests(); });
  setInterval(syncUI, 600);
  syncUI();
}
NW.house = { hook, roomWanted, onVisitChange, onKicked, onRoomFail, open, back, syncUI, _V: V };
})();
