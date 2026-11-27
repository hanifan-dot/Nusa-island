/* NUSA ISLAND — PWA klien: daftar service worker, tombol instal, modal pembaruan.
 * Tidak menyentuh gameplay, ekonomi, Firebase Auth, Cloud Save, multiplayer, QRIS, atau data pemain.
 * Penyimpanan hanya untuk kenyamanan tampilan (localStorage opsional, dibungkus try/catch). */
(function () {
  "use strict";
  var UPDATE_RECHECK_MS = 30 * 60 * 1000, REMIND_MS = 15 * 60 * 1000, HIDE_PILL_MS = 7 * 24 * 3600 * 1000, FALLBACK_WAIT_MS = 4000;
  var S = { sw: "none", installable: false, installed: false, updateReady: false, pill: null, modal: null, dismissedAt: 0, userRequested: false, reloaded: false };
  var deferred = null, reg = null, lastCheck = 0;
  var $ = function (id) { return document.getElementById(id); };

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function standalone() {
    try { return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true; } catch (e) { return false; }
  }
  function mobileUA() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""); }
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; }

  /* ---------- tombol instal & petunjuk ---------- */
  function removePill() { if (S.pill && S.pill.parentNode) S.pill.parentNode.removeChild(S.pill); S.pill = null; }
  function pillHiddenRecently() { var t = +store("nusa_pwa_pill_x") || 0; return t && Date.now() - t < HIDE_PILL_MS; }
  function showPill(kind) {
    if (S.installed || standalone() || pillHiddenRecently()) return;
    removePill();
    var wrap = el("div", "pwa-pill"), main = el("button", "", kind === "install" ? "📲 Instal Nusa Island" : "📲 Cara pasang"), x = el("button", "pwa-x", "✕");
    wrap.id = "pwaInstallPill"; wrap.setAttribute("data-kind", kind); main.id = "pwaInstallBtn"; main.type = "button"; x.type = "button"; x.setAttribute("aria-label", "Sembunyikan");
    main.addEventListener("click", function () { kind === "install" ? doInstall() : showHowTo(); });
    x.addEventListener("click", function () { store("nusa_pwa_pill_x", String(Date.now())); removePill(); });
    wrap.appendChild(main); wrap.appendChild(x); document.body.appendChild(wrap); S.pill = wrap;
  }
  function doInstall() {
    var ev = deferred; if (!ev) { showHowTo(); return; }
    deferred = null; S.installable = false; removePill(); // satu event hanya sekali pakai
    try { ev.prompt(); var up = ev.userChoice; if (up && up.then) up.then(function (c) { if (c && c.outcome === "accepted") S.installed = true; }); } catch (e) { /* prompt gagal: tidak ada tombol palsu */ }
  }
  function modal(title, text, buttons) {
    closeModal();
    var m = el("div", "pwa-modal"), c = el("div", "pwa-card"), row = el("div", "pwa-row");
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); c.appendChild(el("h2", "", title)); if (text) c.appendChild(el("p", "", text));
    buttons.forEach(function (b) { var n = el("button", b.cls || "", b.label); n.type = "button"; if (b.id) n.id = b.id; n.addEventListener("click", b.fn); row.appendChild(n); });
    c.appendChild(row); m.appendChild(c); document.body.appendChild(m); S.modal = m; return m;
  }
  function closeModal() { if (S.modal && S.modal.parentNode) S.modal.parentNode.removeChild(S.modal); S.modal = null; }
  function showHowTo() { modal("Pasang Nusa Island", "Buka menu browser lalu pilih Tambahkan ke layar utama.", [{ label: "Mengerti", id: "pwaHowtoOk", cls: "pwa-go", fn: closeModal }]); }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e; S.installable = true;
    if (!standalone()) showPill("install");
  });
  window.addEventListener("appinstalled", function () { deferred = null; S.installable = false; S.installed = true; removePill(); closeHowToIfAny(); });
  function closeHowToIfAny() { if (S.modal && $("pwaHowtoOk")) closeModal(); }

  /* ---------- pembaruan ---------- */
  function applyUpdate() {
    var w = reg && reg.waiting; if (!w) { closeModal(); return; }
    S.userRequested = true; closeModal();
    try { w.postMessage({ type: "SKIP_WAITING" }); } catch (e) { S.userRequested = false; }
  }
  function showUpdate() {
    if (S.modal) return; S.updateReady = true;
    modal("Pembaruan Nusa Island tersedia.", "Game akan dimuat ulang. Progres tersimpan otomatis di akunmu.", [
      { label: "Nanti", id: "pwaUpdateLater", fn: function () { S.dismissedAt = Date.now(); closeModal(); } },
      { label: "Perbarui Sekarang", id: "pwaUpdateNow", cls: "pwa-go", fn: applyUpdate }
    ]);
  }
  function maybeRemind() { if (reg && reg.waiting && navigator.serviceWorker.controller && (!S.dismissedAt || Date.now() - S.dismissedAt >= REMIND_MS)) showUpdate(); }
  function track(sw) {
    if (!sw) return;
    sw.addEventListener("statechange", function () { if (sw.state === "installed" && navigator.serviceWorker.controller) maybeRemind(); });
  }
  function checkForUpdate() {
    var now = Date.now(); if (!reg || now - lastCheck < 60 * 1000) return; lastCheck = now;
    try { reg.update().catch(function () {}); } catch (e) {}
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) { S.sw = "unsupported"; return; }
    var secure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!secure) { S.sw = "insecure"; return; }
    navigator.serviceWorker.register("sw.js", { scope: "./", updateViaCache: "none" }).then(function (r) {
      reg = r; S.sw = "registered";
      if (r.waiting && navigator.serviceWorker.controller) maybeRemind();
      track(r.installing);
      r.addEventListener("updatefound", function () { track(r.installing); });
      setInterval(function () { checkForUpdate(); maybeRemind(); }, UPDATE_RECHECK_MS);
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { checkForUpdate(); maybeRemind(); } });
    }).catch(function () { S.sw = "failed"; });
    // Muat ulang SATU kali, hanya karena pemain menekan "Perbarui Sekarang" (bukan saat SW pertama kali mengambil alih).
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!S.userRequested || S.reloaded) return;
      var last = +store("nusa_pwa_reload_at") || 0; if (Date.now() - last < 15000) return; // pagar tambahan anti-loop
      S.reloaded = true; store("nusa_pwa_reload_at", String(Date.now())); location.reload();
    });
  }

  /* ---------- mulai ---------- */
  function start() {
    registerSW();
    // Petunjuk manual hanya untuk browser HP yang TIDAK punya prompt instal (mis. Safari iOS, Firefox); bukan tombol instal. Chrome yang sudah memasang app tidak ditampilkan petunjuk.
    setTimeout(function () { if (!("onbeforeinstallprompt" in window) && !deferred && !S.installed && !standalone() && mobileUA() && !S.pill) showPill("howto"); }, FALLBACK_WAIT_MS);
  }
  window.NusaPWA = { state: function () { return { sw: S.sw, installable: S.installable, installed: S.installed, standalone: standalone(), updateReady: S.updateReady, pill: S.pill ? S.pill.getAttribute("data-kind") : null, modal: !!S.modal, reloaded: S.reloaded }; },
    _checkForUpdate: function () { lastCheck = 0; checkForUpdate(); }, _remind: function () { S.dismissedAt = 0; maybeRemind(); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
