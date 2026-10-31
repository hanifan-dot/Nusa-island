// NUSA ISLAND — Tahap 3: INTI CLOUD (logika server murni)
// ---------------------------------------------------------------------------------------------
// File ini dipakai di DUA tempat dengan kode yang sama persis:
//   1. Cloud Functions (firebase/functions/index.js) — server sungguhan, memakai Firebase Admin SDK sebagai `db`.
//   2. Adapter demo & pengujian di browser (cloud/adapter-demo.js) — `db` palsu di localStorage.
// Salinan untuk browser: cloud/core.js (dibuat oleh `node firebase/scripts/sync-core.js`; tes memastikan identik).
//
// Prinsip keamanan:
//   - Identitas SELALU berasal dari `auth` yang diberikan server (token terverifikasi), tidak pernah dari isi permintaan.
//   - Klien tidak bisa menulis Firestore langsung (lihat firestore.rules). Semua tulis lewat fungsi ini.
//   - Hak Owner hanya dari custom claim `role: "owner"` + pendaftaran `owners/{uid}` oleh administrator + email terverifikasi
//     + penyedia google.com. Teks email di JavaScript frontend tidak pernah menjadi dasar akses.
//   - Validasi ini MEMBATASI dan MENDETEKSI, tetapi game berjalan di browser. Tanpa simulasi game di server, koin/item tetap
//     tidak bisa dijamin anti-cheat. Lihat docs/TAHAP3.md ("Batasan keamanan").
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaCloudCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const LIMITS = {
    MAX_BYTES: 800000,        // batas dokumen Firestore 1 MiB, sisakan ruang untuk metadata
    MONEY_CAP: 1e9,           // koin ekonomi normal
    SIM_MONEY_CAP: 1e13,      // hanya untuk sandbox Owner (terpisah dari ekonomi)
    COOLER_MAX: 400,
    DEX_MAX: 600,
    WRITE_GAP_MS: 1500,       // jeda minimum antar penulisan per akun (anti banjir)
    BACKUP_SLOTS: 5,          // cadangan server bergilir sebelum setiap timpaan
    SAVE_V_MAX: 99,
    NAME_MAX: 14,
  };
  const FORBIDDEN_KEYS = ["owner", "sandbox", "ownerSandbox", "role", "claims", "admin", "isOwner", "sim"];
  const MYSTIC_IDS = ["lentera_arwah", "pari_bayang"];
  const ID_RE = /^[a-z0-9_]{1,40}$/;

  class CloudError extends Error {
    constructor(code, message) { super(message); this.name = "CloudError"; this.code = code; }
  }
  const fail = (code, msg) => { throw new CloudError(code, msg); };
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const num = (x) => typeof x === "number" && Number.isFinite(x);

  // ---------------- Fungsi data murni ----------------
  function fnv(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
  const hashText = (text) => fnv(String(text));

  function dexCount(save) {
    let n = 0;
    if (isObj(save && save.dex)) for (const rec of Object.values(save.dex)) if (rec && rec.n > 0) n++;
    return n;
  }
  // Ada progres nyata? (data awal pemain baru TIDAK dihitung sebagai progres)
  function hasProgress(save) {
    if (!isObj(save)) return false;
    const st = save.stats || {};
    return (st.casts > 0) || (st.caught > 0) || (Array.isArray(save.cooler) && save.cooler.length > 0) ||
      (save.day > 1) || dexCount(save) > 0 || !!(isObj(save.kedai) && save.kedai.plays > 0) || !!(isObj(save.shop) && isObj(save.shop.equip) && Object.keys(save.shop.equip).length > 0) || (save.up && Object.values(save.up).some((v) => v > 0));
  }
  function summarize(save) {
    save = isObj(save) ? save : {};
    const st = save.stats || {}, cooler = Array.isArray(save.cooler) ? save.cooler : [];
    const mystic = new Set();
    for (const it of cooler) if (it && MYSTIC_IDS.includes(it.id)) mystic.add(it.id);
    if (isObj(save.dex)) for (const id of MYSTIC_IDS) if (save.dex[id] && save.dex[id].n > 0) mystic.add(id);
    return {
      name: String((save.profile && save.profile.name) || "Pemancing").slice(0, LIMITS.NAME_MAX),
      money: num(save.money) ? Math.floor(save.money) : 0,
      day: num(save.day) ? Math.floor(save.day) : 1,
      caught: num(st.caught) ? st.caught : 0,
      species: dexCount(save),
      fishInBox: cooler.length,
      rank: (save.titles && num(save.titles.rank)) ? save.titles.rank : 0,
      homeLevel: (save.home && num(save.home.level)) ? save.home.level : 0,
      boat: (save.up && num(save.up.boat)) ? save.up.boat : 0,
      mystic: mystic.size,
      v: num(save.v) ? save.v : 0,
    };
  }

  // Validasi struktur & batas wajar. Mengembalikan { ok, errors[], flags[] }.
  // opts.sandbox = true hanya dipakai jalur Owner (batas koin simulasi, kunci "sandbox" diizinkan).
  function validateSave(save, opts) {
    opts = opts || {};
    const errors = [], flags = [];
    if (!isObj(save)) return { ok: false, errors: ["Data bukan objek"], flags };
    const v = save.v;
    if (!Number.isInteger(v) || v < 1 || v > LIMITS.SAVE_V_MAX) errors.push("Versi simpanan tidak valid");
    if (!opts.sandbox) for (const k of FORBIDDEN_KEYS) if (Object.prototype.hasOwnProperty.call(save, k)) errors.push(`Kunci terlarang: ${k}`);
    const cap = opts.sandbox ? LIMITS.SIM_MONEY_CAP : LIMITS.MONEY_CAP;
    if (!num(save.money) || save.money < 0 || save.money > cap) errors.push("Koin di luar batas wajar");
    if (!Array.isArray(save.cooler)) errors.push("Isi coolbox bukan daftar");
    else if (save.cooler.length > LIMITS.COOLER_MAX) errors.push("Coolbox melebihi batas");
    else {
      const seen = new Set();
      for (const it of save.cooler) {
        if (!isObj(it) || typeof it.id !== "string" || !ID_RE.test(it.id) || !num(it.w) || it.w < 0 || it.w > 5000) { errors.push("Item ikan tidak valid"); break; }
        if (it.uid !== undefined) {
          if (typeof it.uid !== "string" || it.uid.length > 40) { errors.push("UID ikan tidak valid"); break; }
          if (seen.has(it.uid)) { errors.push("UID ikan ganda"); break; }
          seen.add(it.uid);
        }
      }
    }
    if (save.dex !== undefined) {
      if (!isObj(save.dex)) errors.push("Koleksi tidak valid");
      else {
        const ks = Object.keys(save.dex);
        if (ks.length > LIMITS.DEX_MAX) errors.push("Koleksi melebihi batas");
        for (const k of ks) { const r = save.dex[k]; if (!ID_RE.test(k) || !isObj(r) || !num(r.n) || r.n < 0 || r.n > 1e7 || (r.best !== undefined && (!num(r.best) || r.best < 0 || r.best > 5000))) { errors.push("Catatan koleksi tidak valid"); break; } }
      }
    }
    if (save.up !== undefined) {
      if (!isObj(save.up)) errors.push("Peningkatan tidak valid");
      else for (const [k, lv] of Object.entries(save.up)) if (!Number.isInteger(lv) || lv < 0 || lv > 30) { errors.push(`Level ${k} tidak valid`); break; }
    }
    if (save.stats !== undefined) {
      if (!isObj(save.stats)) errors.push("Statistik tidak valid");
      else for (const val of Object.values(save.stats)) if (!num(val) || val < 0 || val > 1e12) { errors.push("Statistik di luar batas"); break; }
    }
    if (save.kedai !== undefined) { // Bumbu 3.1: Kedai Atuk Bahar. Koin Kedai = dompet SIMULASI lokal terpisah (bukan S.money); hanya bentuk datanya diperiksa
      const k = save.kedai, G = ["batok", "gasing", "congklak", "gelang", "kelereng"], DF = ["mudah", "normal", "sulit", "goat"];
      const okN = (x, hi) => Number.isInteger(x) && x >= 0 && x <= hi;
      if (!isObj(k) || !okN(k.koin, 1e6) || !okN(k.earned, 100) || !okN(k.life || 0, 1e6)) errors.push("Data Kedai tidak valid");
      else {
        for (const key of ["claimed", "goat"]) if (k[key] !== undefined && (!isObj(k[key]) || Object.keys(k[key]).some((g) => !G.includes(g) || k[key][g] !== true))) { errors.push("Data Kedai tidak valid"); break; }
        if (k.rec !== undefined) {
          if (!isObj(k.rec) || Object.keys(k.rec).some((g) => !G.includes(g) || !isObj(k.rec[g]) || Object.keys(k.rec[g]).some((d) => !DF.includes(d) || !isObj(k.rec[g][d]) || Object.values(k.rec[g][d]).some((v) => !okN(v, 1e9))))) errors.push("Rekor Kedai tidak valid");
        }
        if (k.title !== undefined && !(k.title === 0 || (Number.isFinite(k.title) && k.title > 0))) errors.push("Gelar Kedai tidak valid");
      }
    }
    if (save.shop !== undefined) { // Tahap 3.5: HANYA pilihan kosmetik yang sedang dipakai. Hak milik/uang TIDAK disimpan di sini (ada di server toko).
      const sh = save.shop;
      if (!isObj(sh) || (sh.equip !== undefined && (!isObj(sh.equip) || Object.keys(sh.equip).length > 12 || Object.entries(sh.equip).some(([k, v]) => !ID_RE.test(k) || typeof v !== "string" || !ID_RE.test(v))))) errors.push("Data toko tidak valid");
      else if (Object.keys(sh).some((k) => k !== "v" && k !== "equip" && k !== "applied")) errors.push("Data toko tidak valid");
      else if (sh.applied !== undefined && (!Array.isArray(sh.applied) || sh.applied.length > 40 || sh.applied.some((x) => typeof x !== "string" || !/^D-[a-z0-9-]{1,40}$/.test(x)))) errors.push("Data toko tidak valid");
    }
    if (errors.length === 0 && JSON.stringify(save).length > LIMITS.MAX_BYTES) errors.push("Data terlalu besar");
    return { ok: errors.length === 0, errors, flags };
  }

  // Penanda kecurigaan (TIDAK menolak): kenaikan koin jauh melebihi pendapatan tercatat, atau penghitung yang mundur.
  function plausibility(prev, next) {
    const flags = [];
    if (!isObj(prev) || !isObj(next)) return flags;
    const ps = prev.stats || {}, ns = next.stats || {};
    const earnedD = Math.max(0, (ns.earned || 0) - (ps.earned || 0));
    const gain = (next.money || 0) - (prev.money || 0);
    if (gain > 20000 + 4 * earnedD + 600 * Math.max(0, (next.day || 0) - (prev.day || 0))) flags.push("lonjakan-koin");
    if ((ns.caught || 0) < (ps.caught || 0) || (ns.earned || 0) < (ps.earned || 0)) flags.push("penghitung-mundur");
    return flags;
  }

  // ---------------- Server ----------------
  // db: { get(path)->Promise<obj|null>, tx(fn)->Promise }; fn menerima { get(path), set(path,obj) }.
  // opts: { now: () => ms }
  function makeServer(db, opts) {
    const now = (opts && opts.now) || (() => Date.now());
    const slots = LIMITS.BACKUP_SLOTS;

    const requireAuth = (auth) => {
      if (!auth || typeof auth.uid !== "string" || !auth.uid || auth.uid.length > 128 || /[\/\s]/.test(auth.uid)) fail("unauthenticated", "Masuk dulu dengan akun Google.");
      return auth.uid;
    };
    // Akses Owner: SEMUA syarat wajib terpenuhi. Pesan penolakan sengaja seragam agar tidak membocorkan syarat mana yang gagal.
    async function requireOwner(auth) {
      const uid = requireAuth(auth);
      const t = auth.token || {};
      const provider = t.firebase && t.firebase.sign_in_provider;
      const reg = await db.get(`owners/${uid}`);
      const ok = t.role === "owner" && t.email_verified === true && provider === "google.com" && reg && reg.active === true;
      if (!ok) fail("permission-denied", "Akses ditolak.");
      return uid;
    }
    const parseData = (p, key) => {
      if (!isObj(p) || typeof p[key] !== "string" || p[key].length < 2 || p[key].length > LIMITS.MAX_BYTES) fail("invalid-argument", "Data tidak valid.");
      try { return JSON.parse(p[key]); } catch (e) { return fail("invalid-argument", "Data bukan JSON yang valid."); }
    };
    const strField = (p, k, max) => { const v = p && p[k]; return typeof v === "string" && v.length <= max ? v : ""; };

    async function writeDoc(auth, p, { path, backupDir, sandbox }) {
      const uid = auth.uid;
      const save = parseData(p, "data");
      const chk = validateSave(save, { sandbox });
      if (!chk.ok) fail("invalid-argument", "Data ditolak: " + chk.errors[0]);
      // Ekonomi server: bila aktif untuk uid ini, koin/upgrade/level rumah pada simpanan DITIMPA nilai server (klien tidak bisa menaikkannya lewat simpanan).
      let text = p.data, ecoChanged = [];
      if (!sandbox && opts && typeof opts.overlay === "function") {
        const au = await opts.overlay(uid);
        if (au) { const r = opts.enforce(save, au); ecoChanged = r.changed; if (r.changed.length) { text = JSON.stringify(r.save); Object.assign(save, r.save); } }
      }
      const baseRev = Number.isInteger(p.baseRev) && p.baseRev >= 0 ? p.baseRev : fail("invalid-argument", "baseRev tidak valid.");
      const opId = strField(p, "opId", 64), deviceId = strField(p, "deviceId", 64);
      if (!opId) fail("invalid-argument", "opId wajib.");
      const confirm = p.confirmOverwrite === true;
      const t = now();
      return db.tx(async (tx) => {
        const cur = await tx.get(path);
        if (cur && cur.opId === opId) return { ok: true, duplicate: true, rev: cur.rev, savedAt: cur.savedAt, hash: cur.hash };   // percobaan ulang aman
        if (cur && t - cur.savedAtMs < LIMITS.WRITE_GAP_MS) fail("resource-exhausted", "Terlalu sering menyimpan. Coba lagi sebentar.");
        if (cur && baseRev !== cur.rev && !confirm) return { conflict: true, rev: cur.rev, savedAt: cur.savedAt, deviceId: cur.deviceId, summary: cur.summary, hash: cur.hash };
        if (!cur && baseRev > 0 && !confirm) return { conflict: true, rev: 0, missing: true };
        let flags = [], backedUp = false;
        if (cur) {
          try { flags = plausibility(JSON.parse(cur.data), save); } catch (e) {}
          // cadangan bergilir sebelum menimpa; opts.backupEveryMs (mode Worker) membatasi frekuensi agar hemat kuota tulis (bawaan: setiap tulis)
          if (!(opts && opts.backupEveryMs) || !cur.lastBackupMs || t - cur.lastBackupMs >= opts.backupEveryMs) { await tx.set(`${backupDir}/s${cur.rev % slots}`, cur); backedUp = true; }
        }
        const rev = (cur ? cur.rev : 0) + 1;
        if (ecoChanged.length) flags = flags.concat(ecoChanged.map((c) => "eco-timpa:" + c));
        const doc = { rev, savedAt: new Date(t).toISOString(), savedAtMs: t, deviceId, opId, hash: hashText(text), summary: summarize(save), flags, data: text };
        if (opts && opts.backupEveryMs) doc.lastBackupMs = backedUp || !cur ? t : (cur.lastBackupMs || t);
        await tx.set(path, doc);
        return { ok: true, rev, savedAt: doc.savedAt, hash: doc.hash, flags };
      });
    }
    const readDoc = async (path) => {
      const d = await db.get(path);
      if (!d) return { exists: false, rev: 0 };
      return { exists: true, rev: d.rev, savedAt: d.savedAt, deviceId: d.deviceId, hash: d.hash, summary: d.summary, data: d.data };
    };

    return {
      // --- pemain biasa: hanya data milik uid yang terverifikasi ---
      async loadSave(auth, p) {
        const uid = requireAuth(auth); const r = await readDoc(`users/${uid}/saves/current`);
        if (r.data && opts && typeof opts.overlay === "function") {   // koin/upgrade/rumah selalu dari server saat dimuat
          const au = await opts.overlay(uid);
          if (au) { try { const e = opts.enforce(JSON.parse(r.data), au); r.data = JSON.stringify(e.save); r.eco = true; } catch (e) {} }
        }
        if (p && p.metaOnly === true) delete r.data; return r;
      },
      async writeSave(auth, p) { const uid = requireAuth(auth); return writeDoc(auth, p, { path: `users/${uid}/saves/current`, backupDir: `users/${uid}/backups`, sandbox: false }); },
      async listBackups(auth) {
        const uid = requireAuth(auth), out = [];
        for (let i = 0; i < slots; i++) { const b = await db.get(`users/${uid}/backups/s${i}`); if (b) out.push({ slot: i, rev: b.rev, savedAt: b.savedAt, summary: b.summary }); }
        return { backups: out.sort((a, b) => b.rev - a.rev) };
      },
      async restoreBackup(auth, p) {
        const uid = requireAuth(auth);
        const slot = p && Number.isInteger(p.slot) && p.slot >= 0 && p.slot < slots ? p.slot : fail("invalid-argument", "Slot tidak valid.");
        const b = await db.get(`users/${uid}/backups/s${slot}`);
        if (!b) fail("not-found", "Cadangan tidak ditemukan.");
        return { rev: b.rev, savedAt: b.savedAt, summary: b.summary, data: b.data };   // klien yang memutuskan memuatnya; menulis tetap lewat writeSave
      },
      // --- Owner (selalu diperiksa di backend) ---
      async ownerAccess(auth) { await requireOwner(auth); return { ok: true, role: "owner", controlCenter: { ready: false, phase: "3.5" }, realPayments: false }; },
      async ownerSandboxLoad(auth, p) { const uid = await requireOwner(auth); const r = await readDoc(`ownerSandbox/${uid}`); if (p && p.metaOnly === true) delete r.data; return r; },
      async ownerSandboxSave(auth, p) { const uid = await requireOwner(auth); return writeDoc(auth, p, { path: `ownerSandbox/${uid}`, backupDir: `ownerSandbox/${uid}/backups`, sandbox: true }); },
    };
  }

  return { LIMITS, FORBIDDEN_KEYS, MYSTIC_IDS, CloudError, hashText, hasProgress, summarize, validateSave, plausibility, makeServer };
});
