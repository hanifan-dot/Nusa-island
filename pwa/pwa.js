/* NUSA ISLAND — PWA klien: daftar service worker, tombol instal, modal pembaruan.
 * Tidak menyentuh gameplay, ekonomi, Firebase Auth, Cloud Save, multiplayer, QRIS, atau data pemain.
 * Penyimpanan hanya untuk kenyamanan tampilan (localStorage opsional, dibungkus try/catch). */
(function () {
  "use strict";
  var UPDATE_RECHECK_MS = 30 * 60 * 1000, REMIND_MS = 15 * 60 * 1000, RESHOW_MS = 30 * 60 * 1000, ASK_AFTER = 5, FALLBACK_WAIT_MS = 6000;
  var S = { sw: "none", installable: false, installed: false, updateReady: false, pill: null, modal: null, dismissedAt: 0, userRequested: false, reloaded: false, waited: false };
  var deferred = null, reg = null, lastCheck = 0;
  var $ = function (id) { return document.getElementById(id); };

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function standalone() {
    try { return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true; } catch (e) { return false; }
  }
  function mobileUA() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""); }
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; }

  /* ---------- tombol instal & petunjuk ---------- */
  // Penolakan (tombol ✕) dihitung dan disimpan: muncul lagi 30 menit kemudian; pada penolakan ke-5 pemain ditanya sekali.
  function rejLoad() { try { var o = JSON.parse(store("nusa_pwa_rej") || "{}"); return { n: +o.n || 0, next: +o.next || 0 }; } catch (e) { return { n: 0, next: 0 }; } }
  function rejSave(o) { store("nusa_pwa_rej", JSON.stringify(o)); }
  function installedFlag() { return store("nusa_pwa_installed") === "1"; }
  function optedOut() { return store("nusa_pwa_optout") === "1"; }
  function done() { return S.installed || standalone() || installedFlag(); }
  var reshowTimer = null;
  function removePill() { if (S.pill && S.pill.parentNode) S.pill.parentNode.removeChild(S.pill); S.pill = null; }
  function canShowPill() { return !done() && !optedOut() && Date.now() >= rejLoad().next; }
  // Browser HP tanpa prompt: langsung. Chrome (punya prompt): hanya bila event instal tak kunjung datang (S.waited), supaya pemain tetap punya jalan pasang.
  function howtoEligible() { return mobileUA() && (!("onbeforeinstallprompt" in window) || S.waited); }
  function refreshPill() {
    clearTimeout(reshowTimer); reshowTimer = null;
    if (done() || optedOut()) { removePill(); return; }
    var wait = rejLoad().next - Date.now();
    if (wait > 0) { removePill(); reshowTimer = setTimeout(refreshPill, wait + 300); return; }
    if (S.modal || S.pill) return;
    if (deferred) showPill("install"); else if (howtoEligible() && !S.installable) showPill("howto");
  }
  function showPill(kind) {
    if (!canShowPill()) return;
    removePill();
    var wrap = el("div", "pwa-pill pwa-wiggle"), main = el("button", "", kind === "install" ? "📲 Instal Nusa Island" : "📲 Cara pasang"), x = el("button", "pwa-x", "✕");
    wrap.id = "pwaInstallPill"; wrap.setAttribute("data-kind", kind); main.id = "pwaInstallBtn"; main.type = "button"; x.id = "pwaInstallX"; x.type = "button"; x.setAttribute("aria-label", "Sembunyikan 30 menit");
    main.addEventListener("click", function () { kind === "install" ? doInstall() : showHowTo(); });
    x.addEventListener("click", rejectPill);
    wrap.appendChild(main); wrap.appendChild(x); document.body.appendChild(wrap); S.pill = wrap;
  }
  function rejectPill() {
    var r = rejLoad(); r.n += 1; r.next = Date.now() + RESHOW_MS; rejSave(r); removePill();
    if (r.n === ASK_AFTER) askOptOut(); else refreshPill();
  }
  function askOptOut() {
    modal("Anda tidak ingin mengunduh Nusa Island?", "Pilih \"Tidak\" kalau sebenarnya mau, kami pasang sekarang. Pilih \"Ya\" dan tombol ini tidak muncul lagi; kamu tetap bisa memasangnya dari Pengaturan.", [
      { label: "Ya, tidak mau", id: "pwaOptYes", fn: function () { store("nusa_pwa_optout", "1"); closeModal(); removePill(); syncSettingsRow(); } },
      { label: "Tidak, saya mau instal", id: "pwaOptNo", cls: "pwa-go", fn: function () { closeModal(); if (deferred) doInstall(); else showHowTo(); } }
    ]);
  }
  function markInstalled() { S.installed = true; S.installable = false; deferred = null; store("nusa_pwa_installed", "1"); removePill(); syncSettingsRow(); }
  function doInstall() {
    var ev = deferred; if (!ev) { showHowTo(); return; }
    deferred = null; S.installable = false; removePill(); // satu event hanya sekali pakai
    try {
      ev.prompt(); var up = ev.userChoice;
      if (up && up.then) up.then(function (c) {
        if (c && c.outcome === "accepted") markInstalled();
        else { var r = rejLoad(); r.n += 1; r.next = Date.now() + RESHOW_MS; rejSave(r); refreshPill(); }
      });
    } catch (e) { /* prompt gagal: tidak ada tombol palsu */ }
  }
  function modal(title, text, buttons) {
    closeModal();
    var m = el("div", "pwa-modal"), c = el("div", "pwa-card"), row = el("div", "pwa-row");
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); c.appendChild(el("h2", "", title)); if (text) c.appendChild(el("p", "", text));
    buttons.forEach(function (b) { var n = el("button", b.cls || "", b.label); n.type = "button"; if (b.id) n.id = b.id; n.addEventListener("click", b.fn); row.appendChild(n); });
    c.appendChild(row); m.appendChild(c); document.body.appendChild(m); S.modal = m; return m;
  }
  function closeModal() { if (S.modal && S.modal.parentNode) S.modal.parentNode.removeChild(S.modal); S.modal = null; }
  function showHowTo() { modal("Pasang Nusa Island", "Buka menu browser lalu pilih Tambahkan ke layar utama. (Di Chrome: menu ⋮ lalu Instal aplikasi.)", [{ label: "Mengerti", id: "pwaHowtoOk", cls: "pwa-go", fn: closeModal }]); }

  function gotPrompt(e) { try { e.preventDefault(); } catch (x) {} deferred = e; S.installable = true; removePill(); refreshPill(); syncSettingsRow(); }
  window.addEventListener("beforeinstallprompt", gotPrompt);
  // Event bisa terjadi sebelum skrip ini selesai dimuat (skrip game banyak): ambil yang disimpan pendengar awal di <head>.
  if (window.__nusaBIP) { var early = window.__nusaBIP; window.__nusaBIP = null; gotPrompt(early); }
  window.addEventListener("appinstalled", function () { markInstalled(); closeHowToIfAny(); });
  function closeHowToIfAny() { if (S.modal && $("pwaHowtoOk")) closeModal(); }

  /* ---------- baris "Pasang" di Pengaturan (panel 🎵) ---------- */
  function syncSettingsRow() {
    var pop = $("audioPop"), row = $("pwaSettingsRow"); if (!pop) return;
    if (done()) { if (row && row.parentNode) row.parentNode.removeChild(row); return; }
    if (row) return;
    row = el("div", "ap-g"); row.id = "pwaSettingsRow";
    var b = el("b", "", "📲 Aplikasi"), btn = el("button", "ap-b big", "Instal Nusa Island"); btn.id = "pwaSettingsBtn"; btn.type = "button";
    btn.addEventListener("click", function () { deferred ? doInstall() : showHowTo(); });
    row.appendChild(b); row.appendChild(btn); pop.appendChild(row);
  }
  function watchSettings() {
    syncSettingsRow(); if (!window.MutationObserver) return;
    new MutationObserver(function () { if ($("audioPop") && !$("pwaSettingsRow")) syncSettingsRow(); }).observe(document.body, { childList: true });
  }

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
    setTimeout(function () { S.waited = true; if (howtoEligible() && !deferred) refreshPill(); }, FALLBACK_WAIT_MS);
    refreshPill(); watchSettings();
  }
  window.NusaPWA = { state: function () { return { rej: rejLoad(), optout: optedOut(), settingsRow: !!$("pwaSettingsRow"), sw: S.sw, installable: S.installable, installed: S.installed, standalone: standalone(), updateReady: S.updateReady, pill: S.pill ? S.pill.getAttribute("data-kind") : null, modal: !!S.modal, reloaded: S.reloaded }; },
    _checkForUpdate: function () { lastCheck = 0; checkForUpdate(); }, _remind: function () { S.dismissedAt = 0; maybeRemind(); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
