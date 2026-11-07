// NUSA ISLAND — PILIH DUNIA BERMAIN (Multiplayer / Singleplayer). Hanya lapisan tampilan di atas NW.mp yang sudah ada:
//   Multiplayer  = NW.mp.setPref("on", true) (+ persetujuan privasi yang sama dengan panel Server) → sambung lewat mekanisme resmi netTick/connect.
//   Singleplayer = NW.mp.setPref("on", false) → disconnect() resmi (tutup soket, kosongkan pemain lain). Tidak ada sistem jaringan, dompet, atau simpanan baru.
// Pilihan disimpan oleh NW.mp di "nusa-mp-prefs-v1" (sama dengan sakelar "Aktifkan Dunia Bersama" di panel Server), jadi tetap setelah muat ulang.
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const N = () => window.Nusa;
const COOLDOWN_MS = 3000;                                    // jeda antar-perpindahan: cegah ketuk beruntun (koneksi ganda / beban server)
const st = { el: null, view: "cards", busy: false, coolUntil: 0, note: "", noteKind: "", last: null, wasOpen: false, timer: 0 };

// ---------- ikon & ilustrasi SVG orisinal (tanpa emoji) ----------
const ICON_X = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const ICON_WORLD = `<svg class="wm-ico" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2.2"/><ellipse cx="16" cy="16" rx="5.2" ry="12" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 12.5h23M4.5 19.5h23" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="25.5" cy="6.5" r="3.2" fill="#e0b84c" stroke="#173f50" stroke-width="1.2"/></svg>`;
const palm = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0c1-8 1-14-1-22" fill="none" stroke="#7a5230" stroke-width="3" stroke-linecap="round"/><path d="M-1-22c-7-1-12 2-15 7 6-3 10-3 15-1zM-1-22c6-5 12-5 17-2-6 0-11 1-17 4zM-1-22c-3-6-1-11 3-14-1 6 0 10-3 14zM-1-22c-8 1-11 6-12 11 4-5 8-8 12-8z" fill="#2f8f6b"/></g>`;
const fisher = (x, y, c, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><circle cx="0" cy="-13" r="4.2" fill="#f0c8a0" stroke="#173f50" stroke-width="1.2"/><path d="M-5 -1c0-6 2-8 5-8s5 2 5 8z" fill="${c}" stroke="#173f50" stroke-width="1.2" stroke-linejoin="round"/><path d="M-5.5-16h11l-1.5-3h-8z" fill="#e0b84c" stroke="#173f50" stroke-width="1"/></g>`;
const ART_MULTI = `<svg viewBox="0 0 220 110" class="wm-art" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="wmSkyM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe8f2"/><stop offset="1" stop-color="#fdf1cf"/></linearGradient><linearGradient id="wmSeaM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb7c4"/><stop offset="1" stop-color="#2d7f95"/></linearGradient></defs>
  <rect width="220" height="110" fill="url(#wmSkyM)"/><circle cx="178" cy="26" r="14" fill="#f6cf5d" opacity=".95"/><rect y="68" width="220" height="42" fill="url(#wmSeaM)"/>
  <path d="M0 78c18-5 36 5 55 0s37 5 55 0 37 5 55 0 36 5 55 0" fill="none" stroke="#bfe8f2" stroke-width="1.6" opacity=".55"/>
  <path d="M28 70q27-34 58 0z" fill="#e8c98a" stroke="#173f50" stroke-width="1.5"/>${palm(48, 58, .75)}
  <path d="M112 72q26-30 56 0z" fill="#e8c98a" stroke="#173f50" stroke-width="1.5"/>${palm(142, 62, .65)}
  <path d="M150 74q22-22 48 0z" fill="#e8c98a" stroke="#173f50" stroke-width="1.5"/>
  ${fisher(70, 60, "#4a7fb5", 1)}${fisher(122, 64, "#c2603b", .95)}${fisher(176, 66, "#6e8f3a", .9)}
  <path d="M70 38Q96 14 122 42M122 42Q150 20 176 44" fill="none" stroke="#173f50" stroke-width="1.8" stroke-dasharray="3 4" stroke-linecap="round"/>
  <g fill="none" stroke="#173f50" stroke-width="1.6" stroke-linecap="round"><path d="M92 20a9 9 0 0 1 10 0M89 16a14 14 0 0 1 16 0"/></g><circle cx="97" cy="24" r="2" fill="#173f50"/></svg>`;
const ART_SINGLE = `<svg viewBox="0 0 220 110" class="wm-art" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="wmSkyS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9e8ff"/><stop offset="1" stop-color="#ffe9c6"/></linearGradient><linearGradient id="wmSeaS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb1c8"/><stop offset="1" stop-color="#2f7392"/></linearGradient></defs>
  <rect width="220" height="110" fill="url(#wmSkyS)"/><circle cx="46" cy="28" r="13" fill="#f6cf5d"/><rect y="70" width="220" height="40" fill="url(#wmSeaS)"/>
  <path d="M0 80c18-5 36 5 55 0s37 5 55 0 37 5 55 0 36 5 55 0" fill="none" stroke="#d9e8ff" stroke-width="1.6" opacity=".55"/>
  <path d="M120 76q36-46 78 0z" fill="#e8c98a" stroke="#173f50" stroke-width="1.5"/>${palm(158, 62, .95)}
  <path d="M52 86l8 10h44l8-10z" fill="#a9673a" stroke="#173f50" stroke-width="1.5" stroke-linejoin="round"/><path d="M82 86V70" stroke="#173f50" stroke-width="2"/>
  ${fisher(70, 84, "#579b8b", 1.05)}<path d="M76 70l30-26" stroke="#173f50" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M106 44v28" stroke="#173f50" stroke-width="1" fill="none" stroke-dasharray="2 3"/><circle cx="106" cy="74" r="2.4" fill="#e2574c" stroke="#173f50" stroke-width=".8"/>
  <path d="M20 54h14M24 50h8" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/></svg>`;

// ---------- teks status (bahasa pemain) ----------
const WHY = {
  login: "Masuk dengan akun Google dulu.", consent: "Belum disetujui.",
  "no-backend": "Server multiplayer belum aktif di versi ini.", "no-endpoint": "Server multiplayer belum diaktifkan oleh pemilik game.",
  "gagal-token": "Gagal masuk ke server. Mencoba lagi otomatis.", putus: "Koneksi terputus. Mencoba lagi otomatis.", ditolak: "Server itu tidak bisa dimasuki.",
  "tab-tersembunyi-lama": "Terputus saat game lama tersembunyi (hemat baterai). Kembali ke game untuk tersambung lagi.",
};
const loggedIn = () => !!(NW.cloud && NW.cloud.enabled && NW.cloud.user);
function snap() {
  const v = NW.mp ? NW.mp.view() : null, p = v ? v.prefs : { on: false, consent: null };
  const li = loggedIn(), multi = !!(v && li && p.consent === true && p.on);
  return { v, p, li, multi, online: !!(v && v.online), linking: !!(v && ["connecting", "reconnecting"].includes(v.state)) || !!(v && v.state === "off" && v.why === "pindah") };
}
function multiStatus(s) {
  const { v, p } = s;
  if (!v) return { kind: "off", t: "Multiplayer tidak tersedia di versi ini." };
  if (!s.li) return { kind: "off", t: "Perlu login akun Google." };
  if (p.consent !== true) return { kind: "off", t: "Menunggu persetujuan privasi." };
  if (!p.on) return { kind: "off", t: "Tidak aktif (kamu di Singleplayer)." };
  if (v.state === "online") return { kind: "ok", t: String(v.room || "").indexOf("rumah-") === 0 ? "Tersambung · ruang rumah" : `Tersambung · Server ${v.roomNo} · ${v.n}/${v.cap} pemain` };
  if (v.state === "connecting" || (v.state === "off" && v.why === "pindah")) return { kind: "wait", t: "Menyambung ke server…" };
  if (v.state === "reconnecting") return { kind: "warn", t: "Terputus, menyambung ulang…" };
  if (v.lastError && Date.now() - v.lastError.at < 20000) return { kind: "bad", t: v.lastError.msg };
  if (v.state === "replaced" || v.state === "blocked" || v.state === "kicked") return { kind: "bad", t: v.why || "Tidak bisa tersambung." };
  if (v.manualLeave) return { kind: "off", t: "Kamu keluar dari server. Ketuk Masuk Multiplayer untuk kembali." };
  if (v.state === "error") return { kind: "warn", t: WHY[v.why] || "Belum tersambung. Mencoba lagi otomatis." };
  if (WHY[v.why]) return { kind: v.why === "no-backend" || v.why === "no-endpoint" ? "bad" : "warn", t: WHY[v.why] };
  return { kind: "wait", t: "Siap. Tersambung saat kamu berada di Muara Kampung." };
}

// ---------- tampilan ----------
function cardHTML(kind, s) {
  const multi = kind === "multi", active = multi ? s.multi : !s.multi, cd = Date.now() < st.coolUntil;
  const ms = multi ? multiStatus(s) : { kind: active ? "ok" : "off", t: active ? "Aktif · tanpa pemain online lain" : "Tersedia" };
  const desc = multi ? "Bermain bersama pemain lain secara online di Muara Kampung. Terhubung ke sistem Dunia Bersama Nusa Island yang sudah ada."
    : "Bermain sendiri tanpa melihat pemain online lain. NPC, memancing, dan Rumahku tetap ada. Progres dan dompet akunmu sama; Cloud Save tetap butuh internet untuk sinkron.";
  let btn;
  if (multi) {
    if (!s.li) btn = `<button type="button" class="wm-btn" data-act="login">Masuk dengan Google</button>`;
    else if (active && (s.online || s.linking)) btn = `<button type="button" class="wm-btn" disabled>Sedang aktif</button>`;
    else if (active) btn = `<button type="button" class="wm-btn" data-act="multi" ${cd || st.busy ? "disabled" : ""}>Coba Sambung Lagi</button>`;
    else btn = `<button type="button" class="wm-btn" data-act="multi" ${cd || st.busy ? "disabled" : ""}>${cd ? "Tunggu sebentar…" : "Masuk Multiplayer"}</button>`;
  } else btn = active ? `<button type="button" class="wm-btn" disabled>Sedang aktif</button>` : `<button type="button" class="wm-btn alt" data-act="single" ${cd || st.busy ? "disabled" : ""}>${cd ? "Tunggu sebentar…" : "Main Singleplayer"}</button>`;
  return `<article class="wm-card ${kind} ${active ? "on" : ""}" aria-labelledby="wmH-${kind}">
    <div class="wm-art-wrap">${multi ? ART_MULTI : ART_SINGLE}${active ? `<span class="wm-badge">AKTIF</span>` : ""}</div>
    <div class="wm-cbody"><h3 id="wmH-${kind}">${multi ? "MULTIPLAYER" : "SINGLEPLAYER"}</h3><p>${desc}</p>
    <div class="wm-st ${ms.kind}" role="status"><i class="wm-dot" aria-hidden="true"></i><span>${esc(ms.t)}</span></div>${btn}</div></article>`;
}
function render() {
  if (!st.el || st.el.classList.contains("hidden")) return;
  const s = snap(); let h;
  if (st.view === "consent") {
    h = `<div class="wm-pane"><h3 class="wm-h">Main bersama pemain lain?</h3><p>Di Muara Kampung, pemain Google lain bisa melihat <b>nama pemain</b>, gelar, posisi, ikan yang kamu pamerkan, dan <b>chat</b>-mu. Koin, item, email, dan data akun tidak dibagikan. Kamu bisa kembali ke Singleplayer kapan saja.</p>
      <button type="button" class="wm-btn" data-act="consentYes">Setuju dan Masuk Multiplayer</button><button type="button" class="wm-btn ghost" data-act="back">Kembali</button></div>`;
  } else if (st.view === "confirmSingle") {
    const inHouse = s.v && String(s.v.room || "").indexOf("rumah-") === 0;
    h = `<div class="wm-pane"><h3 class="wm-h">Keluar dari sesi Multiplayer?</h3><p>Kamu sedang tersambung${s.v && s.online ? ` di ${inHouse ? "ruang rumah" : "Server " + s.v.roomNo}` : ""}. Jika lanjut, pemain lain tidak terlihat lagi dan chat berhenti. Progres, koin, dan Rumahku <b>tetap sama</b>.</p>
      <button type="button" class="wm-btn alt" data-act="singleYes">Ya, Main Singleplayer</button><button type="button" class="wm-btn ghost" data-act="back">Tetap di Multiplayer</button></div>`;
  } else h = `<div class="wm-cards">${cardHTML("multi", s)}${cardHTML("single", s)}</div>`;
  const note = st.note ? `<p class="wm-note ${st.noteKind}" role="status">${esc(st.note)}</p>` : "";
  const body = $("wmBody"), key = st.view + "|" + h.length;
  const fresh = body.dataset.view !== st.view; body.dataset.view = st.view;
  body.innerHTML = h + note; if (fresh) { body.classList.remove("wm-in"); void body.offsetWidth; body.classList.add("wm-in"); }
  body.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => act(b.dataset.act)));
  st.last = key;
}
function setNote(t, k) { st.note = t || ""; st.noteKind = k || ""; }
function cool() { st.coolUntil = Date.now() + COOLDOWN_MS; clearTimeout(st.timer); st.timer = setTimeout(render, COOLDOWN_MS + 50); }

// ---------- aksi ----------
async function act(a) {
  if (!NW.mp) return;
  if (a === "login") { try { await NW.cloud.signInGoogle(); } catch (e) {} setNote("", ""); render(); return; }
  if (a === "back") { st.view = "cards"; setNote("", ""); render(); return; }
  if (a === "multi") return goMulti();
  if (a === "consentYes") { NW.mp.setPref("consent", true); st.view = "cards"; return goMulti(true); }
  if (a === "single") { const s = snap(); if (s.online || s.linking) { st.view = "confirmSingle"; setNote("", ""); render(); } else applySingle(); return; }
  if (a === "singleYes") return applySingle();
}
function goMulti(afterConsent) {
  if (st.busy) return; const s = snap();
  if (!s.li) { setNote("Masuk dengan akun Google dulu untuk bermain online.", "bad"); render(); return; }
  if (s.p.consent !== true) { st.view = "consent"; setNote("", ""); render(); return; }
  st.busy = true; cool(); setNote("Menyambung ke Multiplayer…", ""); st.view = "cards";
  try {
    NW.mp.setPref("on", true);                                       // jalur resmi: eligible() → netTick() → connect() (satu koneksi; connect() menolak bila sudah ada)
    if (NW.mp.view().manualLeave) NW.mp.joinAuto();
    try { N().toast("Menyambung ke Multiplayer…"); } catch (e) {}
  } finally { st.busy = false; }
  render(); watchConnect();
}
function applySingle() {
  if (st.busy) return; st.busy = true; cool(); st.view = "cards";
  try {
    NW.mp.setPref("on", false);                                      // disconnect("keluar") resmi: tutup soket, kosongkan pemain lain, status "off"
    const v = NW.mp.view(), clean = !v.online && v.players.length === 0 && !NW.mp._R.ws;
    setNote(clean ? "Kamu sekarang bermain Singleplayer. Progresmu tetap sama." : "Menghentikan sesi Multiplayer…", clean ? "good" : "");
    try { N().toast("Singleplayer aktif", "good"); } catch (e) {}
  } finally { st.busy = false; }
  render();
}
let watchT = 0;
function watchConnect() {                                            // beri umpan balik jelas: berhasil / server penuh / gagal (maks. ±12 dtk), lalu serahkan pada status langsung
  clearInterval(watchT); const t0 = Date.now();
  watchT = setInterval(() => {
    const s = snap(), ms = multiStatus(s);
    if (!isOpen() || !s.multi) { clearInterval(watchT); return; }
    if (ms.kind === "ok") { setNote("Terhubung ke Multiplayer.", "good"); clearInterval(watchT); }
    else if (ms.kind === "bad") { setNote("", ""); clearInterval(watchT); }
    else if (Date.now() - t0 > 12000) { setNote("Belum tersambung. Pastikan internet aktif; game mencoba lagi otomatis.", "bad"); clearInterval(watchT); }
    render();
  }, 400);
}

// ---------- buka / tutup ----------
function build() {
  if (st.el) return st.el;
  const ov = document.createElement("div"); ov.id = "wmOv"; ov.className = "wm-ov hidden"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "wmTitle");
  ov.innerHTML = `<div class="wm-sheet"><button type="button" class="wm-x" id="wmX" aria-label="Tutup">${ICON_X}</button>
    <div class="wm-head"><h2 id="wmTitle" tabindex="-1">PILIH DUNIA BERMAIN</h2><p class="wm-sub">Progres, koin, dan Rumahku sama di kedua dunia. Hanya pemain lain yang berbeda.</p></div><div id="wmBody" class="wm-body"></div></div>`;
  document.body.appendChild(ov); st.el = ov;
  $("wmX").addEventListener("click", close);
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  ov.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
  if (NW.mp && NW.mp.onChange) NW.mp.onChange(() => { if (isOpen()) render(); });
  return ov;
}
const isOpen = () => !!st.el && !st.el.classList.contains("hidden");
function open() {
  build(); st.view = "cards"; setNote("", ""); st.el.classList.remove("hidden"); document.body.classList.add("wm-open");
  requestAnimationFrame(() => st.el.classList.add("show")); render();
  setTimeout(() => { try { $("wmTitle").focus({ preventScroll: true }); } catch (e) {} }, 40);
  if (NW.mp && NW.mp.fetchRooms && snap().multi) NW.mp.fetchRooms(false);
}
function close() { if (!st.el) return; st.el.classList.remove("show"); document.body.classList.remove("wm-open"); clearInterval(watchT); setTimeout(() => { if (st.el && !st.el.classList.contains("show")) st.el.classList.add("hidden"); }, 220); }
function hook() {
  const hr = document.querySelector(".hud-right"); if (!hr || $("worldBtn")) return;
  const b = document.createElement("button"); b.id = "worldBtn"; b.type = "button"; b.className = "chip icon-btn"; b.setAttribute("aria-label", "Bermain di Dunia");
  b.innerHTML = ICON_WORLD; b.addEventListener("click", open); hr.appendChild(b);    // ubin "Bermain di Dunia" di menu ☰ (tombol asli disembunyikan; menu memanggilnya)
}
NW.worldMode = { hook, open, close, render, snap, multiStatus, get isOpen() { return isOpen(); }, _st: st };
})();
