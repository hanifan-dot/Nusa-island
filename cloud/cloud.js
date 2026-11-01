// NUSA ISLAND — Tahap 3: Cloud Save & akun (sisi klien). Modul: NW.cloud
// ---------------------------------------------------------------------------------------------
// Peran: memutuskan apakah layar login muncul, menjalankan login/logout, menyinkronkan simpanan lokal
// (kunci LAMA "nusa-island-v1" tidak berubah) dengan Cloud Functions, dan memindahkan progres tamu ke akun Google
// tanpa menjumlahkan/menggandakan apa pun. Semua keputusan destruktif didahului cadangan.
//
// Model keamanan (jujur): UID, rev, dan konflik diputuskan SERVER. Klien hanya meminta. Meski begitu game berjalan di
// browser, jadi koin/item tetap bisa diubah pemain di perangkatnya sendiri; server membatasi dan menandai, bukan menjamin.
//
// Bila Firebase belum dikonfigurasi (cloud/config.js kosong) dan tidak ada ?cloud=demo, modul ini non-aktif total dan
// game berjalan persis seperti Bumbu 2.4.1.
(function () {
  "use strict";
  window.NW = window.NW || {};
  const Core = window.NusaCloudCore;
  const KEY = "nusa-island-v1", SBX_KEY = "nusa-island-v1-owner-sandbox";
  const META_KEY = "nusa-auth-v1", SBX_META_KEY = "nusa-auth-v1-owner-sandbox", SBX_FLAG = "nusa-owner-sandbox";
  const BAK_PREFIX = "nusa-island-v1-bak-", BAK_KEEP = 6;
  const WK = !!(window.NusaApi && window.NusaApi.enabled());   // mode Worker (kuota gratis Firestore 20.000 tulis/hari) → tulis & baca lebih jarang
  const PUSH_DELAY = WK ? 60000 : 6000, REMOTE_POLL = WK ? 300000 : 60000, CALL_TIMEOUT = 15000, SIM_COINS = 9e9;
  const GUEST_REMIND_AFTER = 15 * 60000;  // hanya sekali per sesi tamu, tidak mengganggu pemain tiap 15 menit
  let guestReminder = null;
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) {} };

  // ---- pilih adapter ----
  const q = new URLSearchParams(location.search);
  try { if (q.get("cloud") === "demo") lsSet("nusa-cloud-demo", "1"); if (q.get("cloud") === "off") lsDel("nusa-cloud-demo"); } catch (e) {}
  let adapter = window.NUSA_CLOUD_ADAPTER || null;   // celah untuk pengujian (hanya mengubah klien sendiri; server tetap memutuskan)
  if (!adapter && NW.cloudDemo && (window.__NUSA_FORCE_DEMO === true || lsGet("nusa-cloud-demo") === "1") && q.get("cloud") !== "off") adapter = NW.cloudDemo.create();
  if (!adapter && q.get("cloud") !== "off" && window.NUSA_FIREBASE && NW.cloudFirebase) adapter = NW.cloudFirebase.create(window.NUSA_FIREBASE);
  const enabled = !!adapter && !!Core;
  let sandbox = false; try { sandbox = enabled && sessionStorage.getItem(SBX_FLAG) === "1"; } catch (e) {}

  const cloud = NW.cloud = {
    enabled, adapter, sandbox, demo: !!(adapter && adapter.isDemo),
    KEY: sandbox ? SBX_KEY : KEY,
    user: null, status: enabled ? "init" : "off", lastError: "", lastSyncAt: 0,
    owner: { verified: false }, saveFrozen: false, ui: null, remoteNewer: false,
    SIM_COINS, listeners: [],
  };
  cloud.ui = NW.cloudUI ? NW.cloudUI.create(cloud) : null;
  const metaKey = () => (sandbox ? SBX_META_KEY : META_KEY);
  const emitChange = () => cloud.listeners.forEach((f) => { try { f(); } catch (e) {} });
  cloud.onChange = (f) => cloud.listeners.push(f);
  const setStatus = (s, err) => { cloud.status = s; if (err !== undefined) cloud.lastError = err; emitChange(); };

  // ---- meta (milik perangkat ini; tanpa email) ----
  function readMeta() {
    let m = null; try { m = JSON.parse(lsGet(metaKey()) || "null"); } catch (e) {}
    if (!m || typeof m !== "object") m = {};
    if (!m.deviceId) m.deviceId = "d" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    return Object.assign({ v: 1, mode: null, uid: null, rev: 0, hash: null }, m);
  }
  const writeMeta = (patch) => { const m = Object.assign(readMeta(), patch); lsSet(metaKey(), JSON.stringify(m)); return m; };
  cloud.meta = readMeta;

  // ---- simpanan lokal & cadangan ----
  const localRaw = () => lsGet(cloud.KEY);
  const parse = (raw) => { try { const d = JSON.parse(raw); return d && typeof d === "object" ? d : null; } catch (e) { return null; } };
  function stash(reason, raw) {
    raw = raw === undefined ? localRaw() : raw;
    if (!raw) return true;
    const ok = lsSet(`${BAK_PREFIX}${reason}-${Date.now()}`, raw);
    try {
      const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(BAK_PREFIX)) ks.push(k); }
      ks.sort((a, b) => Number(b.split("-").pop()) - Number(a.split("-").pop())).slice(BAK_KEEP).forEach(lsDel);
    } catch (e) {}
    return ok;
  }
  cloud.listBackups = () => { const o = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(BAK_PREFIX)) o.push(k); } } catch (e) {} return o.sort(); };

  // ---- panggilan ke server ----
  const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "deadline-exceeded", network: true })), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
  const call = (name, payload) => {
    if (adapter.offline && adapter.offline()) return Promise.reject(Object.assign(new Error("offline"), { code: "unavailable", network: true }));
    return withTimeout(Promise.resolve(adapter.call(name, payload || {})), CALL_TIMEOUT);
  };
  cloud.call = call;
  const kindOf = (e) => {
    const c = String((e && e.code) || "").replace("functions/", "").replace("auth/", "");
    if (e && e.network || c === "unavailable" || c === "deadline-exceeded" || c === "network-request-failed" || (typeof navigator !== "undefined" && navigator.onLine === false)) return "offline";
    if (c === "unauthenticated") return "auth";
    if (c === "resource-exhausted") return "busy";
    if (c === "permission-denied") return "denied";
    if (c === "invalid-argument") return "invalid";
    if (c === "popup-closed-by-user" || c === "cancelled" || c === "cancelled-popup-request") return "cancel";
    if (c === "popup-blocked") return "popup";
    return "error";
  };
  cloud.errText = (e) => ({
    offline: "Tidak ada koneksi internet. Progres tetap aman di perangkat dan akan disinkronkan saat online.",
    auth: "Sesi login berakhir. Silakan login lagi.", busy: "Terlalu sering menyimpan. Mencoba lagi sebentar lagi.",
    denied: "Akses ditolak.", invalid: "Data ditolak server: " + String((e && e.message) || "tidak valid").slice(0, 120),
    cancel: "Login dibatalkan.", popup: "Jendela login diblokir browser. Izinkan popup lalu coba lagi.",
    error: "Terjadi kesalahan. Coba lagi nanti." + (e && typeof e.code === "string" && /^[\w\/.-]{2,48}$/.test(e.code) ? " (kode: " + e.code + ")" : (e && e.name ? " (" + String(e.name).slice(0, 24) + ")" : "")),
  })[kindOf(e)];
  const toast = (m, t) => { try { if (window.Nusa && window.Nusa.toast) window.Nusa.toast(m, t); else if (cloud.ui && cloud.ui.notice) cloud.ui.notice(m, t); } catch (e) {} };
  cloud.toast = toast;

  const hashOf = (raw) => Core.hashText(raw);
  const progressOf = (raw) => Core.hasProgress(parse(raw));
  const newOp = () => "op" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const ep = () => (sandbox ? { load: "ownerSandboxLoad", write: "ownerSandboxSave" } : { load: "loadSave", write: "writeSave" });

  // ---- sinkronisasi ----
  let syncActive = false, listening = false, dirty = false, timer = null, inflight = null, retryN = 0, pollT = null;
  cloud.freeze = () => { cloud.saveFrozen = true; };

  function reloadWith(raw, rev, hash, note) {
    cloud.freeze();
    if (!lsSet(cloud.KEY, raw)) { cloud.saveFrozen = false; toast("Gagal menulis data ke perangkat (penyimpanan penuh).", "bad"); return false; }
    writeMeta({ mode: "google", uid: cloud.user.uid, rev, hash });
    try { if (note) sessionStorage.setItem("nusa-cloud-note", note); } catch (e) {}
    location.reload();
    return true;
  }

  async function push(opts) {
    opts = opts || {};
    if (!syncActive || !cloud.user) return { skipped: true };
    if (inflight) return inflight;
    const raw = localRaw();
    if (!raw) return { skipped: true };
    const h = hashOf(raw), meta = readMeta();
    if (!opts.force && meta.rev === 0 && !sandbox && !progressOf(raw)) { dirty = false; setStatus("idle", ""); return { ok: true, blank: true }; }   // akun baru: jangan unggah simpanan kosong
    if (h === meta.hash && !opts.force) { dirty = false; if (cloud.status !== "conflict") setStatus("idle", ""); return { ok: true, same: true }; }
    setStatus("syncing");
    inflight = (async () => {
      try {
        const r = await call(ep().write, { data: raw, baseRev: meta.rev, opId: newOp(), deviceId: meta.deviceId, confirmOverwrite: !!opts.confirm || sandbox });
        if (r.conflict) { setStatus("conflict", ""); cloud.remoteInfo = r; return { conflict: true, r }; }
        writeMeta({ rev: r.rev, hash: h }); dirty = localRaw() !== raw; cloud.lastSyncAt = Date.now(); retryN = 0; cloud.remoteNewer = false;
        setStatus(dirty ? "dirty" : "idle", "");
        if (dirty) schedule(PUSH_DELAY);
        return { ok: true, r };
      } catch (e) {
        const k = kindOf(e);
        if (k === "offline") { setStatus("offline", cloud.errText(e)); retry(); }
        else if (k === "busy") { setStatus("dirty"); schedule(3500); }
        else if (k === "auth") { setStatus("auth", cloud.errText(e)); }
        else { setStatus("error", cloud.errText(e)); toast("Cloud Save gagal: " + cloud.errText(e), "bad"); }
        return { error: k, e };
      } finally { inflight = null; }
    })();
    return inflight;
  }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(() => { push(); }, ms); }
  function retry() { retryN++; clearTimeout(timer); timer = setTimeout(() => { push(); }, Math.min(60000, 2000 * 2 ** Math.min(retryN, 5))); }
  cloud.flush = () => { clearTimeout(timer); return push(); };
  cloud.syncNow = async () => { const r = await push({}); if (r && r.conflict) await resolveConflict(); else await checkRemote(); return r; };
  cloud.onLocalSave = () => {
    if (!syncActive || cloud.saveFrozen) return;
    dirty = true; if (cloud.status === "idle" || cloud.status === "init") setStatus("dirty");
    schedule(PUSH_DELAY);
  };

  async function checkRemote() {
    if (!syncActive || !cloud.user) return;
    try {
      const m = await call(ep().load, { metaOnly: true }), meta = readMeta();
      if (m.exists && m.rev > meta.rev) {
        const clean = localRaw() && hashOf(localRaw()) === meta.hash;
        cloud.remoteNewer = true; cloud.remoteInfo = m;
        if (!clean) { setStatus("conflict", ""); } else emitChange();
      } else { cloud.remoteNewer = false; if (cloud.status === "offline") setStatus(dirty ? "dirty" : "idle", ""); }
    } catch (e) { if (kindOf(e) === "offline") setStatus("offline", cloud.errText(e)); }
  }
  cloud.checkRemote = checkRemote;
  // "Muat dari Cloud": bila perangkat ini belum berubah sejak sinkron terakhir → langsung memuat; bila sudah berubah → pemain memilih
  cloud.pullRemote = async () => {
    const raw = localRaw(), meta = readMeta();
    let C; try { C = await call(ep().load, {}); } catch (e) { toast(cloud.errText(e), "bad"); return "error"; }
    if (!C.exists) return "none";
    if (raw && meta.hash && hashOf(raw) === meta.hash) return applyChoice("cloud", raw, C);
    return resolveConflict();
  };

  function startSync() {
    syncActive = true; setStatus("idle", "");
    if (!listening) { listening = true; wire(); }
    push().then(checkRemote);
  }
  function wire() {
    document.addEventListener("visibilitychange", () => { if (document.hidden) { cloud.flush(); } else checkRemote(); });
    window.addEventListener("online", () => { retryN = 0; push().then(checkRemote); });
    window.addEventListener("offline", () => setStatus("offline", cloud.errText({ network: true })));
    pollT = setInterval(() => { if (!document.hidden) checkRemote(); }, REMOTE_POLL);
  }

  // ---- konflik: tidak pernah menjumlahkan / menggabungkan; pemain memilih satu sumber ----
  async function chooseSource(L, C, why) {
    const choice = cloud.ui && cloud.ui.chooseSource ? await cloud.ui.chooseSource({ local: Core.summarize(parse(L)), cloud: C.summary, cloudSavedAt: C.savedAt, why }) : "cancel";
    return choice;
  }
  async function resolveConflict() {
    const raw = localRaw(); let C;
    try { C = await call(ep().load, {}); } catch (e) { setStatus(kindOf(e) === "offline" ? "offline" : "error", cloud.errText(e)); return "error"; }
    if (!C.exists) { await push({ confirm: true, force: true }); return "local"; }
    const choice = await chooseSource(raw, C, "perangkat-lain");
    return applyChoice(choice, raw, C);
  }
  async function applyChoice(choice, raw, C) {
    if (choice === "cloud") {
      if (!stash("sebelum-cloud", raw)) { toast("Cadangan di perangkat gagal dibuat; tindakan dibatalkan agar progres aman.", "bad"); return "cancel"; }
      return reloadWith(C.data, C.rev, hashOf(C.data), "Progres dari Cloud dimuat ✅ (versi perangkat sudah dicadangkan)") ? "cloud" : "error";
    }
    if (choice === "local") {
      if (!stash("sebelum-timpa-cloud", raw)) { toast("Cadangan di perangkat gagal dibuat; tindakan dibatalkan.", "bad"); return "cancel"; }
      writeMeta({ rev: C.rev }); syncActive = true;
      let r = await push({ confirm: true, force: true });
      for (let i = 0; i < 3 && r && r.error === "busy"; i++) { await new Promise((ok) => setTimeout(ok, 1700)); r = await push({ confirm: true, force: true }); }   // jeda anti-banjir server
      if (r && r.ok) { toast("Progres perangkat ini menggantikan Cloud ✅ (Cloud lama dicadangkan server)", "good"); return "local"; }
      return "error";
    }
    return "cancel";
  }

  // ---- alur setelah login berhasil ----
  async function afterLogin(user) {
    cloud.user = user; const meta = readMeta();
    setStatus("syncing");
    let C;
    try { C = await call(ep().load, {}); } catch (e) {
      const off = kindOf(e) === "offline";
      setStatus(off ? "offline" : "error", cloud.errText(e));
      if (off && meta.mode === "google" && meta.uid === user.uid) { startSync(); return "offline"; }   // perangkat yang sama, hanya sedang offline: lanjut main, sinkron nanti
      toast("Login berhasil, tetapi Cloud belum terjangkau: " + cloud.errText(e), "bad"); return "error";
    }
    let raw = localRaw();
    // simpanan lokal milik akun LAIN pada perangkat ini → jangan dianggap progres tamu
    if (meta.mode === "google" && meta.uid && meta.uid !== user.uid && raw) {
      stash("akun-" + String(meta.uid).slice(0, 6), raw); lsDel(cloud.KEY); raw = null; writeMeta({ uid: null, rev: 0, hash: null });
    }
    const lh = !!raw && progressOf(raw);
    const same = readMeta().uid === user.uid;
    const done = (res) => { writeMeta({ mode: "google", uid: user.uid }); return res; };
    if (!C.exists && !lh) { writeMeta({ mode: "google", uid: user.uid, rev: 0, hash: null }); startSync(); return "empty"; }
    if (!C.exists && lh) {
      if (!stash("tamu-sebelum-unggah", raw)) { toast("Cadangan progres tamu gagal dibuat; unggah dibatalkan.", "bad"); return "cancel"; }
      writeMeta({ mode: "google", uid: user.uid, rev: 0, hash: null }); syncActive = true;
      const r = await push({ force: true });
      if (r && r.ok) { startSync(); toast("Progres tamu berhasil dipindahkan ke akun Google ✅", "good"); return "uploaded"; }
      return "error";
    }
    if (C.exists && !lh) { return reloadWith(C.data, C.rev, hashOf(C.data), "Progres Cloud dimuat ✅") ? "pulled" : "error"; }
    // keduanya berisi progres
    if (hashOf(raw) === C.hash || raw === C.data) { writeMeta({ mode: "google", uid: user.uid, rev: C.rev, hash: hashOf(raw) }); startSync(); return "identical"; }
    if (same) {
      const m = readMeta();
      if (C.rev === m.rev) { done(); startSync(); return "synced"; }
      if (m.hash && hashOf(raw) === m.hash) { return reloadWith(C.data, C.rev, hashOf(C.data), "Progres terbaru dari perangkat lain dimuat ✅") ? "pulled" : "error"; }
    }
    const choice = await chooseSource(raw, C, same ? "perangkat-lain" : "tamu");
    if (choice === "cancel") { cloud.user = null; try { await adapter.signOut(); } catch (e) {} setStatus("auth"); return "cancel"; }
    writeMeta({ mode: "google", uid: user.uid, rev: C.rev });
    const res = await applyChoice(choice, raw, C);
    if (res === "local") startSync();
    return res;
  }

  // ---- publik: login / logout ----
  cloud.signInGoogle = async () => {
    try {
      const user = await adapter.signInGoogle();
      return await onUser(user, true);
    } catch (e) {
      const k = kindOf(e);
      if (k !== "cancel") { setStatus(cloud.user ? cloud.status : "guest", cloud.errText(e)); }
      return { error: k, message: cloud.errText(e) };
    }
  };
  async function onUser(user, fresh) {
    if (!user) return { error: "auth", message: "Login gagal." };
    cloud.user = user; verifyOwner();
    const res = await afterLogin(user);
    return { result: res, user };
  }
  // Tamu cepat = mode lokal yang SUDAH ADA, bukan akun Google/anonim server.
  // Jangan mengarang Cloud Save atau memberi akses ke hadiah event / transaksi koin server.
  function guestReminderOnce() {
    clearTimeout(guestReminder);
    const m = readMeta();
    if (m.mode !== "guest" || m.guestReminded) return;
    const since = Number.isFinite(m.guestSince) && m.guestSince > 0 ? m.guestSince : Date.now();
    if (!m.guestSince) writeMeta({ guestSince: since });
    const remind = () => {
      if (cloud.user || cloud.status !== "guest") return;
      if (typeof document !== "undefined" && document.hidden) { guestReminder = setTimeout(remind, 30000); return; }
      writeMeta({ guestReminded: true });
      toast("☁️ Hubungkan Google lewat Profil Nelayan agar progres bisa disimpan di cloud. Main tetap bisa dilanjutkan!", "good");
    };
    guestReminder = setTimeout(remind, Math.max(0, GUEST_REMIND_AFTER - (Date.now() - since)));
  }
  cloud.guest = () => {
    const m = readMeta(), continuing = m.mode === "guest";
    writeMeta({ mode: "guest", uid: null, guestSince: continuing && m.guestSince ? m.guestSince : Date.now(),
      guestReminded: continuing && m.guestReminded === true });
    setStatus("guest", "");
    guestReminderOnce();
  };
  cloud.logout = async () => {
    if (syncActive && dirty) { const r = await push(); if (r && r.error) { const okOut = cloud.ui && cloud.ui.confirm ? await cloud.ui.confirm("Ada perubahan yang belum tersinkron. Tetap logout? Progres tetap dicadangkan di perangkat ini.", "Tetap Logout") : true; if (!okOut) return false; } }
    const raw = localRaw(), uid = cloud.user && cloud.user.uid;
    cloud.freeze();
    if (raw) stash("logout-" + String(uid || "x").slice(0, 6), raw);
    try { await adapter.signOut(); } catch (e) {}
    lsDel(cloud.KEY); lsDel(metaKey()); try { sessionStorage.removeItem(SBX_FLAG); } catch (e) {}
    location.reload(); return true;
  };

  // ---- Owner (petunjuk UI dari claim; KEPUTUSAN selalu dari server) ----
  async function verifyOwner(force) {
    cloud.owner = { verified: false };
    const u = cloud.user; if (!u) return false;
    if (!force && !(u.claims && u.claims.role === "owner")) { emitChange(); return false; }
    try { await adapter.refreshClaims(); const r = await call("ownerAccess", {}); cloud.owner = { verified: !!(r && r.ok), controlCenter: r && r.controlCenter }; }
    catch (e) { cloud.owner = { verified: false, error: kindOf(e) }; }
    emitChange(); return cloud.owner.verified;
  }
  cloud.verifyOwner = verifyOwner;
  cloud.enterSandbox = async () => {
    if (!(await verifyOwner(true))) return { error: "denied", message: "Akses ditolak." };
    await cloud.flush();
    try { sessionStorage.setItem(SBX_FLAG, "1"); } catch (e) { return { error: "storage" }; }
    cloud.freeze(); location.reload(); return { ok: true };
  };
  cloud.exitSandbox = async () => { await cloud.flush(); cloud.freeze(); try { sessionStorage.removeItem(SBX_FLAG); } catch (e) {} location.reload(); };
  // dipanggil game.js setelah memuat simpanan sandbox: membuka semua perlengkapan & kapal; koin simulasi TERPISAH dari ekonomi
  cloud.applySandbox = (S, api) => {
    S.owner = { sandbox: true };
    for (const k of ["rod", "bait", "cooler", "boat"]) if (api.UPGRADES[k]) S.up[k] = api.UPGRADES[k].levels.length - 1;
    if (S.home && api.HD && api.HD.MAX_LEVEL) S.home.level = Math.max(S.home.level || 1, api.HD.MAX_LEVEL);
    if (!(S.money >= SIM_COINS / 2)) S.money = SIM_COINS;
    S.owner.premium = "all";   // tanda untuk skin/perlengkapan premium Tahap 4 (belum ada sistemnya)
  };
  async function bootSandbox(user) {
    const exit = (msg) => { try { sessionStorage.removeItem(SBX_FLAG); sessionStorage.setItem("nusa-cloud-note", msg); } catch (e) {} location.reload(); };
    if (!user) return exit("Sesi login tidak ditemukan. Mode Uji Owner ditutup.");
    cloud.user = user;
    if (!(await verifyOwner(true))) return exit("Akses Owner ditolak server. Mode Uji ditutup.");
    cloud.ui && cloud.ui.hideGate();
    let C; try { C = await call(ep().load, {}); } catch (e) { startSync(); return; }
    const m = readMeta(), raw = localRaw();
    if (C.exists && (!raw || (C.rev > m.rev && (!m.hash || hashOf(raw) === m.hash)))) { reloadWith(C.data, C.rev, hashOf(C.data), "Sandbox Owner dimuat dari Cloud"); return; }
    startSync();
  }

  // ---- boot ----
  cloud.ready = null;
  if (enabled) {
    cloud.ready = (async () => {
      try {
        let note = null; try { note = sessionStorage.getItem("nusa-cloud-note"); sessionStorage.removeItem("nusa-cloud-note"); } catch (e) {}
        if (note) setTimeout(() => toast(note, "good"), 1400);
        cloud.ui && cloud.ui.showGate("loading");
        await adapter.init();
        const user = adapter.currentUser(), meta = readMeta();
        if (sandbox) return bootSandbox(user);
        if (user) cloud.user = user;
        adapter.onAuth && adapter.onAuth((u) => { if (!u && cloud.user && syncActive) { syncActive = false; setStatus("auth", "Sesi login berakhir."); } });
        if (meta.mode === "guest") { setStatus("guest"); cloud.ui && cloud.ui.hideGate(); guestReminderOnce(); if (user) verifyOwner(); return; }
        if (user && meta.mode === "google" && meta.uid === user.uid) {
          cloud.ui && cloud.ui.hideGate(); verifyOwner();
          await afterLogin(user); return;      // satu alur untuk semua kasus (sinkron / tarik dari perangkat lain / konflik / offline)
        }
        if (user) { const res = await afterLogin(user); if (res !== "cancel" && res !== "error") { cloud.ui && cloud.ui.hideGate(); } else cloud.ui && cloud.ui.showGate("login", cloud.lastError); return; }
        cloud.ui && cloud.ui.showGate("login", meta.mode === "google" ? "Sesi berakhir. Silakan login lagi." : "");
        setStatus("auth");
      } catch (e) {
        console.error("cloud boot", e); setStatus("error", "Gagal memulai layanan akun.");
        cloud.ui && cloud.ui.showGate("login", "Layanan akun tidak dapat dimulai. Kamu tetap bisa bermain sebagai tamu.");
      }
    })();
  }
  cloud.statusText = () => ({
    off: "Cloud Save belum diaktifkan", init: "Memeriksa akun…", guest: "Mode tamu — progres hanya di perangkat ini", auth: "Belum login",
    idle: "Tersinkron ✅", dirty: "Menunggu sinkron…", syncing: "Menyinkronkan…", offline: "Offline — akan disinkronkan nanti", conflict: "Perlu memilih progres (konflik)", error: "Gagal sinkron",
  })[cloud.status] || cloud.status;
  // titik masuk dari game.js setelah Nusa tersedia
  cloud.hook = () => { if (cloud.ui && cloud.ui.hook) cloud.ui.hook(); };
  cloud._test = { push, afterLogin, resolveConflict, applyChoice, checkRemote, stash, readMeta, writeMeta, hashOf, startSync, kindOf, state: () => ({ syncActive, dirty, retryN }) };
})();
