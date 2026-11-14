// NUSA ISLAND — NusaPhone (Ide 07) · klien perangkat. DIMUAT HANYA bila window.NUSA_PHONE === true (bawaan false → modul tidak diunduh sama sekali).
// NUSA_PHONE hanya mengontrol apakah modul DIUNDUH. Akses = status SERVER: `gameFlags.nusaPhone`. Server MATI/404/gagal → tombol & semua layar TIDAK muncul (gagal-tertutup, dicoba ulang tanpa menempel).
// Klien tidak pernah menentukan saldo, harga, status bayar, atau kepemilikan. Tidak ada adapter uji di window: aplikasi mendaftar lewat NW.phone.registerApp (modul resmi saja).
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), C = window.NusaPhoneCore; if (!C) return;
const N = () => window.Nusa, $ = (id) => document.getElementById(id);
const st = {
  srv: false, gateTried: 0, hooked: false, mounted: false, open: false, nav: C.NAV0, notes: [], failed: false, tick: 0, probeAt: 0, pref: C.cleanPrefs(null),
  owned: ["dasar"], apps: {}, loadFail: {}, appCtl: null, drag: null, opened: 0, dir: 0, lastTheme: "", unlockedOnce: false, toastT: 0, sysReduced: false, cam: null,
};
const call = (name, body) => (window.NusaApi && window.NusaApi.enabled() ? window.NusaApi.call(name, body || {}, true) : Promise.reject(Object.assign(new Error("offline"), { code: "unavailable" })));
const NET_CODES = ["unavailable", "network", "timeout", "deadline-exceeded", "internal"];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const now = () => Date.now();

// ---------- preferensi (hanya kenyamanan perangkat ini; bukan data pemain) ----------
const PK = "nusa_phone_prefs_v1";
function loadPrefs() { try { st.pref = C.cleanPrefs(JSON.parse(localStorage.getItem(PK) || "null")); } catch (e) { st.pref = C.cleanPrefs(null); } }
function savePrefs() { try { localStorage.setItem(PK, JSON.stringify(st.pref)); } catch (e) { /* tampilan saja */ } }

// ---------- tautan server (jujur: tidak ada mode offline palsu) ----------
function linkState() { return { online: navigator.onLine !== false, api: !!(window.NusaApi && window.NusaApi.enabled()), user: !!(NW.cloud && NW.cloud.user), failed: st.failed }; }
const linkOk = () => C.linkOk(linkState());
// Semua panggilan jaringan aplikasi lewat sini: gagal jaringan → tautan "terputus"; berhasil → pulih. Saat terputus, panggilan DITOLAK tanpa menyentuh server.
async function netCall(name, body) {
  if (!linkOk()) throw Object.assign(new Error("Koneksi terputus"), { code: "unavailable" });
  try { const r = await call(name, body); if (st.failed) { st.failed = false; paintLink(); } return r; }
  catch (e) { if (!e || !e.code || NET_CODES.includes(e.code) || /network|failed to fetch|offline/i.test(String(e.message || ""))) { if (!st.failed) { st.failed = true; paintLink(); } } throw e; }
}
async function probe() {   // satu panggilan ringan (gameFlags) hanya saat ponsel terbuka; hasilnya menyalakan/mematikan tautan
  if (!st.open || document.hidden) return; st.probeAt = now();
  if (!(navigator.onLine !== false && window.NusaApi && window.NusaApi.enabled() && NW.cloud && NW.cloud.user)) { paintLink(); return; }
  try { await call("gameFlags", {}); if (st.failed) { st.failed = false; paintLink(); } } catch (e) { if (!st.failed) { st.failed = true; paintLink(); } }
}

// ---------- gerbang server ----------
async function gate() {
  if (st.srv) return; st.gateTried++;
  try { const r = await call("gameFlags", {}); if (r && r.nusaPhone === true) { st.srv = true; mount(); } else if (r && r.nusaPhone === false) st.gateTried = 99; }   // OFF eksplisit: berhenti menanyakan sampai muat ulang
  catch (e) { /* gagal-tertutup; dicoba lagi (tidak menempel) */ }
}
function hook() {
  if (st.hooked) return; st.hooked = true;
  const t = setInterval(() => {
    if (st.srv || st.gateTried >= 12) return clearInterval(t);
    if (!(window.NusaApi && window.NusaApi.enabled() && NW.cloud && NW.cloud.user)) return;
    gate();
  }, 4000);
}

// ---------- seni orisinal (SVG) ----------
const ICONS = {
  klippy: '<path d="M10 14h28a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" fill="#fff" opacity=".95"/><path d="M21 20.5v7l6.5-3.5z" fill="CLR"/><circle cx="37" cy="12" r="3" fill="#fff"/><path d="M37 8.2v1.6M37 14.2v1.6M33.2 12h1.6M39.2 12h1.6" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  nusachat: '<path d="M8 12h21a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H19l-6 5v-5H8a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4z" fill="#fff" opacity=".95"/><path d="M33 20h7a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-2v4l-5-4h-7a4 4 0 0 1-4-4v-1" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="20" r="1.8" fill="CLR"/><circle cx="19" cy="20" r="1.8" fill="CLR"/><circle cx="26" cy="20" r="1.8" fill="CLR"/>',
  playgame: '<path d="M14 16h20c5 0 8 5 8 11s-3 8-6 8-4-3-6-3H18c-2 0-3 3-6 3s-6-2-6-8 3-11 8-11z" fill="#fff" opacity=".95"/><path d="M15 21v7M11.5 24.5h7" stroke="CLR" stroke-width="2.4" stroke-linecap="round"/><circle cx="30" cy="22" r="1.9" fill="CLR"/><circle cx="34" cy="26" r="1.9" fill="CLR"/>',
  nusaweb: '<circle cx="24" cy="24" r="14" fill="#fff" opacity=".95"/><ellipse cx="24" cy="24" rx="6" ry="14" fill="none" stroke="CLR" stroke-width="1.8"/><path d="M10 24h28M12 17h24M12 31h24" stroke="CLR" stroke-width="1.8" stroke-linecap="round"/>',
  zentro: '<circle cx="21" cy="21" r="10" fill="none" stroke="#fff" stroke-width="4.4"/><path d="M29 29l9 9" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M17 21h8M21 17v8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>',
  dompet: '<path d="M8 15a4 4 0 0 1 4-4h24v6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M8 15a4 4 0 0 1 4-4v0h26a3 3 0 0 1 3 3v21a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#fff" opacity=".95"/><path d="M32 24h9v8h-9a4 4 0 0 1 0-8z" fill="CLR"/><circle cx="33" cy="28" r="1.6" fill="#fff"/>',
  peta: '<path d="M6 13l11-4 14 4 11-4v26l-11 4-14-4-11 4z" fill="#fff" opacity=".95"/><path d="M17 9v26M31 13v26" stroke="CLR" stroke-width="1.6" opacity=".55"/><path d="M24 15a5 5 0 0 1 5 5c0 4-5 9-5 9s-5-5-5-9a5 5 0 0 1 5-5z" fill="CLR"/><circle cx="24" cy="20" r="1.8" fill="#fff"/>',
  pengaturan: '<circle cx="24" cy="24" r="8.5" fill="none" stroke="#fff" stroke-width="5"/><g stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"/></g><circle cx="24" cy="24" r="3.4" fill="CLR"/>',
};
function icon(id) {
  const a = C.appOf(id) || { hue: "#888", hue2: "#bbb" };
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs><linearGradient id="nphg-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a.hue2}"/><stop offset="1" stop-color="${a.hue}"/></linearGradient></defs><rect x="0" y="0" width="48" height="48" rx="12" fill="url(#nphg-${id})"/>${(ICONS[id] || "").replace(/CLR/g, a.hue)}</svg>`;
}
const WALL = (k) => `<svg class="nph-wall" viewBox="0 0 300 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
<defs><linearGradient id="nphSky${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1)"/><stop offset="1" style="stop-color:var(--sky2)"/></linearGradient>
<linearGradient id="nphSea${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sea1)"/><stop offset="1" style="stop-color:var(--sea2)"/></linearGradient></defs>
<rect width="300" height="600" fill="url(#nphSky${k})"/>
<g class="nph-stars"><circle cx="40" cy="70" r="1.4" fill="#fff"/><circle cx="95" cy="40" r="1.1" fill="#fff"/><circle cx="150" cy="95" r="1.3" fill="#fff"/><circle cx="220" cy="55" r="1.5" fill="#fff"/><circle cx="262" cy="110" r="1.1" fill="#fff"/><circle cx="70" cy="140" r="1" fill="#fff"/><circle cx="196" cy="150" r="1.2" fill="#fff"/></g>
<circle class="nph-sun" cx="252" cy="326" r="19" style="fill:var(--sun)"/><circle class="nph-sun-glow" cx="252" cy="326" r="32" style="fill:var(--sun);opacity:.22"/>
<path d="M0 380 L0 350 Q40 318 80 342 Q110 300 150 338 Q190 312 230 340 Q268 322 300 346 L300 380z" style="fill:var(--far)"/>
<path d="M30 392 Q70 340 130 352 Q172 330 214 362 Q246 372 262 392z" style="fill:var(--isle)"/>
<path d="M128 356 q-2-28 8-52" stroke="#6b4a2b" stroke-width="3.2" fill="none" stroke-linecap="round"/><g style="fill:var(--palm)"><path d="M136 304 q-20-4-30 10 q16-8 30-6z"/><path d="M136 304 q18-8 32 4 q-16-2-32 2z"/><path d="M136 304 q-10-18-28-16 q18 2 28 16z"/><path d="M136 304 q10-18 28-14 q-18 0-28 14z"/></g>
<rect y="380" width="300" height="220" fill="url(#nphSea${k})"/>
<g stroke="#fff" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"><path d="M20 410q12-6 24 0t24 0"/><path d="M180 430q12-6 24 0t24 0"/><path d="M60 470q12-6 24 0t24 0"/><path d="M200 500q12-6 24 0t24 0"/><path d="M30 540q12-6 24 0t24 0"/></g>
<g transform="translate(96 438)"><path d="M0 22h46l-8 12H8z" fill="#a8562e"/><path d="M22 20V-6l18 22z" fill="#fff8e8"/><path d="M20 20V0L6 20z" fill="#ffd873"/><path d="M21 -8v28" stroke="#6b4a2b" stroke-width="2"/></g>
</svg>`;

// ---------- DOM ----------
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function mount() {
  if (st.mounted) return; st.mounted = true; loadPrefs();
  const b = el("button", "nph-btn hidden"); b.id = "phoneBtn"; b.type = "button"; b.setAttribute("aria-label", "Buka NusaPhone"); b.innerHTML = '<span aria-hidden="true">📱</span><i class="nph-badge hidden" id="nphBadge"></i>';
  const toast = el("div", "nph-toast hidden"); toast.id = "nphToast"; toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite");
  const root = el("div", "nph hidden"); root.id = "nphRoot"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<div class="nph-dev" id="nphDev" role="dialog" aria-modal="false" aria-label="NusaPhone">
  <div class="nph-screen" id="nphScreen">
    <div class="nph-status" id="nphStatus"><span class="nph-st-time" id="nphStTime">06:00</span><span class="nph-notch" aria-hidden="true"></span><span class="nph-link" id="nphLink" role="status"><i class="nph-dot"></i><b id="nphLinkTx">Terhubung</b></span></div>
    <section class="nph-view nph-lock" id="nphLock" aria-label="Layar kunci">${WALL("L")}
      <div class="nph-lock-top"><div class="nph-clock" id="nphClock">06:00</div><div class="nph-date" id="nphDate"></div></div>
      <div class="nph-notes" id="nphNotes" aria-label="Notifikasi"></div>
      <button type="button" class="nph-grab" id="nphGrab" aria-label="Buka kunci: geser ke atas atau tekan"><i></i><span>Geser ke atas untuk membuka</span></button>
    </section>
    <section class="nph-view nph-home hidden" id="nphHome" aria-label="Layar utama">${WALL("H")}
      <div class="nph-home-top"><b id="nphHClock">06:00</b><span id="nphHDate"></span></div>
      <div class="nph-grid" id="nphGrid" role="list"></div>
    </section>
    <section class="nph-view nph-app hidden" id="nphApp" aria-label="Aplikasi"><header class="nph-app-h"><button type="button" id="nphAppBack" aria-label="Kembali">‹</button><b id="nphAppT"></b><span class="nph-app-ic" id="nphAppI" aria-hidden="true"></span></header><div class="nph-app-b" id="nphAppB"></div></section>
  </div>
  <nav class="nph-nav" aria-label="Navigasi ponsel"><button type="button" id="nphBack" aria-label="Kembali">◀<small>Kembali</small></button><button type="button" id="nphHome2" aria-label="Layar utama">●<small>Home</small></button><button type="button" id="nphClose" aria-label="Tutup ponsel">✕<small>Tutup</small></button></nav>
</div>`;
  document.body.appendChild(b); document.body.appendChild(toast); document.body.appendChild(root);
  const stop = (e) => e.stopPropagation(); root.addEventListener("pointerdown", stop); root.addEventListener("touchstart", stop, { passive: true }); b.addEventListener("pointerdown", stop);
  b.addEventListener("click", () => { N().sfx("click"); st.open ? close() : open(); });
  toast.addEventListener("click", () => { hideToast(); open(); });
  $("nphBack").addEventListener("click", () => { N().sfx("click"); go("back"); });
  $("nphAppBack").addEventListener("click", () => { N().sfx("click"); go("back"); });
  $("nphHome2").addEventListener("click", () => { N().sfx("click"); go("home"); });
  $("nphClose").addEventListener("click", () => { N().sfx("click"); close(); });
  const g = $("nphGrab");
  g.addEventListener("click", () => { if (!st.dragMoved) { N().sfx("click"); go("unlock"); } st.dragMoved = false; });
  g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " " || e.key === "ArrowUp") { e.preventDefault(); go("unlock"); } });
  const lock = $("nphLock");
  lock.addEventListener("pointerdown", (e) => { if (e.target.closest(".nph-note")) return; st.drag = { id: e.pointerId, y0: e.clientY, dy: 0 }; st.dragMoved = false; try { lock.setPointerCapture(e.pointerId); } catch (x) { /* abaikan */ } });
  lock.addEventListener("pointermove", (e) => { const d = st.drag; if (!d || e.pointerId !== d.id) return; d.dy = Math.min(0, e.clientY - d.y0); if (d.dy < -6) st.dragMoved = true; if (!rm()) lock.style.transform = "translateY(" + d.dy + "px)"; });
  const endDrag = (e) => { const d = st.drag; if (!d || (e && e.pointerId !== d.id)) return; st.drag = null; const h = lock.getBoundingClientRect().height || 400; lock.style.transform = ""; if (d.dy < -Math.min(70, h * 0.18)) go("unlock"); };
  lock.addEventListener("pointerup", endDrag); lock.addEventListener("pointercancel", endDrag);
  $("nphGrid").addEventListener("click", (e) => { const t = e.target.closest("[data-app]"); if (t) { N().sfx("click"); go("open", t.dataset.app); } });
  $("nphNotes").addEventListener("click", (e) => { const t = e.target.closest("[data-note]"); if (!t) return; const n = st.notes.find((x) => x.id === t.dataset.note); go("unlock"); if (n && n.app) go("open", n.app); });
  document.addEventListener("keydown", (e) => { if (st.open && e.key === "Escape") { e.preventDefault(); close(); } });
  window.addEventListener("resize", layout); window.addEventListener("orientationchange", layout);
  window.addEventListener("online", () => { st.failed = false; paintLink(); probe(); }); window.addEventListener("offline", () => paintLink());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) probe(); });
  try { const mq = matchMedia("(prefers-reduced-motion: reduce)"); st.sysReduced = mq.matches; (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))((ev) => { st.sysReduced = ev.matches; applyTheme(); }); } catch (e) { /* abaikan */ }
  // obrolan multiplayer membuka panelnya di area atas-kiri: ponsel menyingkir agar obrolan & joystick tidak tertutup
  new MutationObserver(() => { if (st.open && document.body.classList.contains("mp-chat-open")) close(true); syncBtn(); }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  buildGrid(); noteAdd({ id: "welcome", icon: "📱", title: "Selamat datang di NusaPhone", text: "Ponsel dasar untuk semua pemain. Klippy, NusaChat, dan Dompet Nusa ada di layar utama." });
  syncBtn(); setInterval(tickSlow, 1000);
}
const rm = () => C.reduced(st.pref.motion, st.sysReduced);
function buildGrid() { $("nphGrid").innerHTML = C.APPS.map((a) => `<button type="button" class="nph-ic" role="listitem" data-app="${a.id}" aria-label="${esc(a.name)}"><span class="nph-ic-i">${icon(a.id)}<i class="nph-lockbadge" aria-hidden="true">🔒</i></span><span class="nph-ic-n">${esc(a.name)}</span></button>`).join(""); }

// ---------- buka / tutup ----------
const world = () => !!N() && N().mode() === "world" && N().isStarted();
function canOpen() { return st.srv && world() && !(document.body.classList.contains("mp-chat-open")) && !(NW.room && NW.room.active && NW.room.blocking && NW.room.blocking()); }
function open() {
  if (!st.mounted || st.open || !canOpen()) return false;
  hideToast(); st.open = true; st.opened = now(); st.nav = C.nav(null, "lock"); st.unlockedOnce = false;
  const r = $("nphRoot"); r.classList.remove("hidden"); r.setAttribute("aria-hidden", "false"); document.body.classList.add("nph-open");
  applyTheme(); layout(); render(); paintLink(); setPlayer(true);
  if (rm()) r.classList.add("on"); else requestAnimationFrame(() => requestAnimationFrame(() => r.classList.add("on")));
  probe(); setTimeout(() => { try { $("nphGrab").focus({ preventScroll: true }); } catch (e) { /* abaikan */ } }, 60);
  return true;
}
function close(quiet) {
  if (!st.open) return; st.open = false; setPlayer(false);
  closeApp(); const r = $("nphRoot"); r.classList.remove("on"); r.setAttribute("aria-hidden", "true"); document.body.classList.remove("nph-open");
  const done = () => { if (!st.open) r.classList.add("hidden"); };
  if (rm() || quiet) done(); else setTimeout(done, 260);
  st.notes = C.noteReadAll(st.notes); paintBadge(); syncBtn();
}
function setPlayer(on) { try { const p = NW.world && NW.world.player; if (p) { p.phoneOn = !!on; if (on) { p.moving = false; } } } catch (e) { /* tampilan saja */ } }
function syncBtn() {
  const b = $("phoneBtn"); if (!b) return;
  const show = st.srv && world() && !document.body.classList.contains("editing") && !(NW.room && NW.room.active && NW.room.blocking && NW.room.blocking());
  b.classList.toggle("hidden", !show); b.classList.toggle("on", st.open); b.setAttribute("aria-pressed", String(st.open));
  if (!show && st.open) close(true);
}
function go(a, arg) {
  const prev = st.nav; st.nav = C.nav(st.nav, a, arg);
  if (a === "unlock" && prev.screen === "lock") st.unlockedOnce = true;
  if (st.nav.screen !== "app" || st.nav.app !== prev.app) closeApp();
  render();
}

// ---------- tampilan ----------
function show(id, on) { const e = $(id); if (e) e.classList.toggle("hidden", !on); }
function render() {
  if (!st.mounted) return; const s = st.nav;
  show("nphLock", s.screen === "lock"); show("nphHome", s.screen === "home"); show("nphApp", s.screen === "app");
  $("nphBack").disabled = !(s.screen === "app"); $("nphBack").setAttribute("aria-disabled", String(!(s.screen === "app")));
  $("nphHome2").disabled = s.screen === "lock"; $("nphHome2").setAttribute("aria-disabled", String(s.screen === "lock"));
  $("nphDev").dataset.screen = s.screen;
  paintClock(); paintNotes(); paintGrid(); if (s.screen === "app") paintApp();
  try { if (s.screen === "lock") $("nphGrab").focus({ preventScroll: true }); } catch (e) { /* abaikan */ }
}
function paintClock() {
  const S = N() && N().S; const c = C.clock(S ? S.hour : 0), d = C.dateLine(new Date()), day = S && S.day ? "Hari " + S.day + " di Nusa" : "";
  for (const [id, v] of [["nphStTime", c], ["nphClock", c], ["nphHClock", c]]) { const e = $(id); if (e && e.textContent !== v) e.textContent = v; }
  const dl = d + (day ? " · " + day : ""); for (const id of ["nphDate", "nphHDate"]) { const e = $(id); if (e && e.textContent !== dl) e.textContent = dl; }
}
function paintNotes() {
  const box = $("nphNotes"); const list = st.notes.slice(0, 3);
  box.innerHTML = list.length ? list.map((n) => `<button type="button" class="nph-note${n.read ? "" : " new"}" data-note="${esc(n.id)}"><span class="nph-note-i" aria-hidden="true">${esc(n.icon)}</span><span class="nph-note-t"><b>${esc(n.title)}</b><small>${esc(n.text)}</small></span></button>`).join("") : '<div class="nph-note-empty">Tidak ada notifikasi baru</div>';
}
function paintGrid() {
  const ok = linkOk(); $("nphGrid").querySelectorAll("[data-app]").forEach((b) => { const lk = !C.appUsable(b.dataset.app, ok); b.classList.toggle("locked", lk); b.setAttribute("aria-label", C.appOf(b.dataset.app).name + (lk ? " — Koneksi terputus" : "")); });
}
function paintLink() {
  if (!st.mounted) return; const ok = linkOk(), l = $("nphLink"); l.classList.toggle("off", !ok); $("nphLinkTx").textContent = ok ? "Terhubung" : "Koneksi terputus";
  $("nphDev").classList.toggle("offline", !ok); paintGrid(); if (st.nav.screen === "app") paintApp(); else if (st.appCtl) closeApp();
}
function paintBadge() { const b = $("nphBadge"); if (!b) return; const n = C.noteUnread(st.notes); b.textContent = n > 9 ? "9+" : String(n); b.classList.toggle("hidden", n === 0 || st.open); }

// ---------- aplikasi ----------
function closeApp() { if (st.appCtl) { try { st.appCtl.close && st.appCtl.close(); } catch (e) { /* abaikan */ } st.appCtl = null; } }
function paintApp() {
  const id = st.nav.app, a = C.appOf(id); if (!a) return; const body = $("nphAppB");
  $("nphAppT").textContent = a.name; $("nphAppI").innerHTML = icon(id);
  if (!C.appUsable(id, linkOk())) { closeApp(); body.innerHTML = `<div class="nph-lockpane" role="alert"><div class="nph-lock-ic" aria-hidden="true">📡</div><b>Koneksi terputus</b><p>${esc(a.name)} membutuhkan server. Semua aksi jaringan dikunci sampai koneksi pulih. Tidak ada mode offline.</p></div>`; return; }
  if (st.appCtl && st.appCtl.id === id) { try { st.appCtl.update && st.appCtl.update(); } catch (e) { /* abaikan */ } return; }
  closeApp(); body.innerHTML = "";
  const impl = st.apps[id] || BUILTIN[id];
  if (!impl && APP_SCRIPTS[id] && !st.loadFail[id]) { body.innerHTML = `<div class="nph-lockpane"><div class="nph-lock-ic" aria-hidden="true">⏳</div><b>Memuat ${esc(a.name)}…</b></div>`; loadFiles(APP_SCRIPTS[id]).then(() => { if (st.open && st.nav.app === id) paintApp(); }, () => { st.loadFail[id] = true; if (st.open && st.nav.app === id) paintApp(); }); return; }
  if (impl) { const ctl = impl.mount(body, ctx(id)); st.appCtl = Object.assign({ id }, ctl || {}); return; }
  body.innerHTML = `<div class="nph-lockpane"><div class="nph-lock-ic" aria-hidden="true">🛠️</div><b>${esc(a.name)}</b><p>${st.loadFail[id] ? "Gagal memuat aplikasi. Tutup lalu buka lagi." : "Aplikasi ini sedang disiapkan."}</p></div>`;
}
function ctx(id) { return { call: netCall, linkOk, load: loadFiles, notify: noteAdd, deeper: () => go("deeper"), open: (app) => go("open", app), sub: () => st.nav.sub, esc, icon, rm, close: () => close(), now, N }; }
// Modul aplikasi dimuat SAAT DIBUKA (tidak diunduh bila tidak dipakai); semua di bawah phone/ dan hanya bila NUSA_PHONE=true.
const BASE = (() => { const e = document.querySelector('script[src*="phone/client.js"]'); return e ? e.src.replace(/client\.js.*$/, "") : "phone/"; })();
const APP_SCRIPTS = { klippy: ["klippy.js"], nusachat: ["nusachat.js"], dompet: ["dompet.js"], playgame: ["gamekit.js", "playgame.js"], nusaweb: ["nusaweb.js"], zentro: ["nusaweb.js", "zentro.js"] };
const loaded = {};
function loadFile(f) { return loaded[f] || (loaded[f] = new Promise((ok, no) => { const e = document.createElement("script"); e.src = BASE + f; e.async = false; e.onload = ok; e.onerror = () => { delete loaded[f]; no(new Error("gagal memuat " + f)); }; document.head.appendChild(e); })); }
const loadFiles = (fs) => fs.reduce((p, f) => p.then(() => loadFile(f)), Promise.resolve());
function registerApp(id, impl) { if (C.APP_IDS.includes(id) && impl && typeof impl.mount === "function") st.apps[id] = impl; }

// bawaan: Peta + Pengaturan (tanpa jaringan)
const BUILTIN = {
  peta: { mount(body, x) {
    const a = NW.areas && NW.areas.cur, name = a && a.name ? a.name : "Nusa Island";
    body.innerHTML = `<div class="nph-card"><small>Lokasi kamu</small><b>${x.esc(name)}</b></div><button type="button" class="nph-cta" id="nphMapGo">Buka Peta Laut</button><p class="nph-hint">Peta Laut menampilkan tujuan dan jalur kapal. Ponsel akan ditutup.</p>`;
    body.querySelector("#nphMapGo").addEventListener("click", () => { x.N().sfx("click"); x.close(); try { x.N().openPanel("seamap"); } catch (e) { /* abaikan */ } });
  } },
  pengaturan: { mount(body, x) {
    const seg = (key, vals, labels) => `<div class="nph-seg" role="radiogroup" data-k="${key}">${vals.map((v, i) => `<button type="button" role="radio" data-v="${v}" aria-checked="${st.pref[key] === v}">${labels[i]}</button>`).join("")}</div>`;
    const draw = () => {
      body.innerHTML = `<div class="nph-set"><label>Tema</label>${seg("theme", C.THEMES, ["Otomatis", "Siang", "Malam"])}<label>Animasi</label>${seg("motion", C.MOTIONS, ["Ikuti sistem", "Hidup", "Mati"])}<label>Casing</label><div class="nph-seg nph-cases" role="radiogroup" data-k="casing">${C.MODEL_IDS.map((id) => { const m = C.MODELS[id], own = st.owned.includes(id); return `<button type="button" role="radio" data-v="${id}" aria-checked="${st.pref.casing === id}" ${own ? "" : "disabled"} title="${x.esc(m.name)}${own ? "" : " — belum dimiliki"}"><i style="background:${m.body};border-color:${m.rim}"></i><span>${x.esc(m.name.replace("Model Sementara ", "Sem. ").replace("Nusa", "").trim())}${own ? "" : " 🔒"}</span></button>`; }).join("")}</div><p class="nph-hint">NusaPhone dasar dimiliki semua pemain. Model lain hanya mengubah tampilan dan kapasitas penyimpanan, bukan akses sosial atau kekuatan permainan.</p></div>`;
    };
    draw();
    body.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]"); if (!b || b.disabled) return; const k = b.parentElement.dataset.k; if (!k) return;
      x.N().sfx("click"); st.pref = C.cleanPrefs(Object.assign({}, st.pref, { [k]: b.dataset.v })); savePrefs(); draw(); applyTheme();
    });
  } },
};

// ---------- notifikasi ----------
function noteAdd(n) {
  if (!n) return; const had = st.notes.some((x) => x.id === n.id);
  st.notes = C.noteAdd(st.notes, n, now());
  if (!had) { if (!st.open) toastNote(st.notes.find((x) => x.id === n.id)); else paintNotes(); }
  paintBadge();
}
function toastNote(n) {
  if (!n || n.read || !st.srv || !world() || document.body.classList.contains("mp-chat-open") || st.open) return;
  const t = $("nphToast"); if (!t) return; t.innerHTML = `<span aria-hidden="true">${esc(n.icon)}</span><span><b>${esc(n.title)}</b><small>${esc(n.text)}</small></span>`; t.classList.remove("hidden");
  clearTimeout(st.toastT); st.toastT = setTimeout(hideToast, 4200);
}
function hideToast() { const t = $("nphToast"); if (t) t.classList.add("hidden"); clearTimeout(st.toastT); }

// ---------- tema, tata letak, detak ----------
function applyTheme() {
  if (!st.mounted) return; const r = $("nphRoot"), th = C.theme(st.pref.theme, !!(N() && N().isNight && N().isNight())), m = C.modelOf(st.pref.casing && st.owned.includes(st.pref.casing) ? st.pref.casing : "dasar");
  r.dataset.theme = th; r.classList.toggle("rm", rm()); const d = $("nphDev"); d.dataset.model = m.id;
  d.style.setProperty("--body", m.body); d.style.setProperty("--rim", m.rim); d.style.setProperty("--glow", m.glow); d.style.setProperty("--rad", m.radius + "px"); d.style.setProperty("--bz", m.bezel + "px"); d.style.setProperty("--asp0", String(m.aspect));
  d.dataset.notch = m.notch; layout();
}
function layout() {
  if (!st.mounted) return;
  const d = $("nphDev"), vw = window.innerWidth, vh = window.innerHeight, land = vw > vh && vh <= 480, asp0 = parseFloat(d.style.getPropertyValue("--asp0")) || 0.5;
  const asp = land ? Math.max(asp0, 0.58) : asp0;    // layar pendek: sedikit lebih lebar agar tetap terbaca
  const top = land ? 6 : 96, bot = land ? 6 : 164, availH = Math.max(160, vh - top - bot), availW = Math.max(150, vw - 24);
  const u = Math.max(0.4, Math.min(availH / (300 / asp), availW / 300, 1.12));
  const r = $("nphRoot"); d.style.setProperty("--asp", String(asp)); d.style.setProperty("--u", u.toFixed(4)); r.style.setProperty("--top", top + "px"); r.style.setProperty("--bot", bot + "px");
  r.classList.toggle("land", land);
  // di mana karakter berdiri saat ponsel terbuka: di sisi kanan yang kosong (layar lebar) atau di bawah ponsel (layar sempit); selalu di luar perangkat & joystick
  const w = 300 * u, h = 300 * u / asp, left = (vw - w) / 2, right = left + w, dTop = top + (availH - h) / 2, dBot = dTop + h;
  let px, py; if (vw - right >= 130) { px = (right + vw) / 2; py = vh / 2; } else { px = vw - Math.min(90, vw * 0.25); py = Math.min(vh - 40, (dBot + vh) / 2); }
  st.cam = { dx: Math.round(px - vw / 2), dy: Math.round(py - vh / 2) };
}
function tickSlow() {
  if (!st.mounted) return; syncBtn(); st.tick++;
  if (st.open) { paintClock(); const th = C.theme(st.pref.theme, !!(N() && N().isNight && N().isNight())); if (th !== $("nphRoot").dataset.theme) applyTheme(); if (now() - st.probeAt > 20000) probe(); paintLink(); }
  if (!world() && st.open) close(true);
}

// ---------- animasi karakter memegang ponsel (diri sendiri & pemain lain; murni tampilan) ----------
function drawHeld(c, ch, st0, fx, fy, y0, t, back, side) {
  const dt = ch._pt == null ? 0 : Math.max(0, Math.min(0.1, t - ch._pt)); ch._pt = t; if (ch._ph == null) ch._ph = 0;
  if (ch.phoneOn) ch._pOn = t; const to = (ch.phoneOn || (ch._pOn != null && t - ch._pOn >= 0 && t - ch._pOn < 0.3)) ? 1 : 0, sp = rm() ? 1e3 : 3.4; ch._ph = to > ch._ph ? Math.min(1, ch._ph + dt * sp) : Math.max(0, ch._ph - dt * sp);
  const p = ch._ph; if (p <= 0) return; const e = p * p * (3 - 2 * p), self = ch === (NW.world && NW.world.player);
  const m = self ? C.modelOf(st.pref.casing && st.owned.includes(st.pref.casing) ? st.pref.casing : "dasar") : C.MODELS.dasar;
  const sx = side ? fx * -1.5 : 7.5, sy = y0 - 21.5;                             // bahu lengan depan
  const hx = side ? fx * 6 : back ? 4 : 4.4, hy = y0 - 12 - e * 8;                  // tangan naik dari pinggang/saku ke depan dada
  const ex = side ? fx * 2.5 : 10, ey = y0 - 15 - e * 1.5;                          // siku
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  c.strokeStyle = st0.shirt; c.lineWidth = 4.2; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();               // lengan atas
  c.strokeStyle = st0.skin; c.lineWidth = 3.4; c.beginPath(); c.moveTo(ex, ey); c.lineTo(hx, hy); c.stroke();                // lengan bawah (kulit: kontras dengan badan)
  if (!back) {
    const k = 0.4 + 0.6 * Math.min(1, e * 1.5);                                   // ponsel "keluar" dari saku: membesar sambil naik
    c.translate(hx + (side ? fx * 0.6 : 0.4), hy - 4.2 * k); c.rotate(side ? 0.12 * fx : -0.1); c.scale(k, k);
    c.fillStyle = "rgba(10,25,32,.35)"; c.fillRect(-3.1, -5.9, 7.2, 12.6);          // bayangan tipis
    c.fillStyle = m.rim; c.fillRect(-3.6, -6.4, 7.2, 12.8);
    if (side) { c.fillStyle = "#101c24"; c.fillRect(-3, -5.8, 6, 11.6); c.fillStyle = "#6fe8d0"; c.fillRect(-2.5, -5, 5, 8.6); c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(-2, -4.4, 4, 1.1); c.fillRect(-2, -2.4, 2.6, 0.9); }
    else { c.fillStyle = m.body; c.fillRect(-3, -5.8, 6, 11.6); c.fillStyle = m.rim; c.beginPath(); c.arc(-1.2, -3.6, 1.1, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(0.9, -5.2, 1.4, 9); }
  }
  c.restore();
  c.save(); c.fillStyle = st0.skin; c.beginPath(); c.arc(hx, hy, 2.1, 0, 7); c.fill(); c.restore();                              // tangan menggenggam di depan ponsel
  if (!back && e > 0.8) { const gy = hy - 6, g = c.createRadialGradient(hx, gy, 0, hx, gy, 12); g.addColorStop(0, "rgba(120,235,215,.28)"); g.addColorStop(1, "rgba(120,235,215,0)"); c.save(); c.fillStyle = g; c.beginPath(); c.arc(hx, gy, 12, 0, 7); c.fill(); c.restore(); }   // cahaya layar halus
}

NW.phone = {
  isOpen: () => st.open, camShift: () => (st.open && st.cam ? st.cam : null), open, close: () => close(), srvOn: () => st.srv, broadcast: () => st.srv && st.open, drawHeld, registerApp, notify: noteAdd,
  link: linkOk, call: netCall, prefs: () => Object.assign({}, st.pref), owned: () => st.owned.slice(), go, _gate: gate,
};
hook();
// pemakaian setelah masuk: bila sudah login saat modul dimuat, tanyakan segera
setTimeout(() => { if (window.NusaApi && window.NusaApi.enabled() && NW.cloud && NW.cloud.user) gate(); }, 1500);
})();
