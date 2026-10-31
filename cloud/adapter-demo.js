// NUSA ISLAND — Tahap 3: adapter DEMO (hanya aktif dengan ?cloud=demo). BUKAN Google dan BUKAN cloud sungguhan.
// "Server" di sini menjalankan kode yang SAMA dengan Cloud Functions (cloud/core.js); data disimpan di localStorage
// browser ini saja. Dipakai untuk mencoba alur login/sinkronisasi dan untuk pengujian otomatis.
(function () {
  "use strict";
  window.NW = window.NW || {};
  const DB_KEY = "nusa-demo-cloud-v1", SES_KEY = "nusa-demo-session";
  const ACCOUNTS = {
    "demo-a": { uid: "demo-uid-a", name: "Nelayan Demo A", claims: {} },
    "demo-b": { uid: "demo-uid-b", name: "Nelayan Demo B", claims: {} },
    "demo-owner": { uid: "demo-uid-owner", name: "Owner Demo", claims: { role: "owner" }, registered: true },
    "demo-fake": { uid: "demo-uid-fake", name: "Penyusup Demo (claim palsu)", claims: { role: "owner" }, registered: false },
  };
  NW.cloudDemo = {
    ACCOUNTS,
    create() {
      const Core = window.NusaCloudCore;
      const read = () => { try { return JSON.parse(localStorage.getItem(DB_KEY) || "{}"); } catch (e) { return {}; } };
      let chain = Promise.resolve();
      const raw = {
        get: async (p) => { const d = read(); return d[p] ? JSON.parse(JSON.stringify(d[p])) : null; },
        tx: (fn) => { const run = chain.then(async () => {
          const d = read(); const t = { get: async (p) => (d[p] ? JSON.parse(JSON.stringify(d[p])) : null), set: async (p, o) => { d[p] = o; } };
          const out = await fn(t); try { localStorage.setItem(DB_KEY, JSON.stringify(d)); } catch (e) { throw Object.assign(new Error("penyimpanan penuh"), { code: "internal" }); } return out; });
          chain = run.catch(() => {}); return run; },
      };
      const server = Core.makeServer(raw);
      let offline = false, latency = 30, failNext = null, session = null; const cbs = [];
      const idOf = () => { try { return localStorage.getItem(SES_KEY); } catch (e) { return null; } };
      const userOf = (id) => { const a = ACCOUNTS[id]; return a ? { uid: a.uid, name: a.name, photo: null, emailVerified: true, provider: "google.com", claims: { role: (a.claims && a.claims.role) || null } } : null; };
      // token yang "diverifikasi server": dibentuk dari catatan akun, BUKAN dari apa pun yang dikirim klien
      const tokenOf = (id) => { const a = ACCOUNTS[id]; return { uid: a.uid, token: Object.assign({ email_verified: true, firebase: { sign_in_provider: "google.com" } }, a.claims) }; };
      const adapter = {
        isDemo: true,
        async init() {
          await raw.tx(async (t) => { for (const a of Object.values(ACCOUNTS)) if (a.registered) await t.set(`owners/${a.uid}`, { active: true }); });
          session = idOf(); if (!ACCOUNTS[session]) session = null;
        },
        currentUser: () => userOf(session),
        onAuth: (f) => cbs.push(f),
        offline: () => offline,
        async signInGoogle() {
          let id = window.__demoAuto || null;
          if (!id) id = await (NW.cloudUI && NW.cloudUI.chooseDemoAccount ? NW.cloudUI.chooseDemoAccount(ACCOUNTS) : Promise.resolve(null));
          if (!id || !ACCOUNTS[id]) throw Object.assign(new Error("Login dibatalkan"), { code: "popup-closed-by-user" });
          if (offline) throw Object.assign(new Error("offline"), { code: "network-request-failed", network: true });
          session = id; try { localStorage.setItem(SES_KEY, id); } catch (e) {} cbs.forEach((f) => f(userOf(id))); return userOf(id);
        },
        async signOut() { session = null; try { localStorage.removeItem(SES_KEY); } catch (e) {} cbs.forEach((f) => f(null)); },
        async refreshClaims() { return (userOf(session) || {}).claims; },
        async call(name, payload) {
          await new Promise((r) => setTimeout(r, latency));
          if (offline) throw Object.assign(new Error("offline"), { code: "unavailable", network: true });
          if (failNext) { const c = failNext; failNext = null; throw Object.assign(new Error("gagal (simulasi)"), { code: c }); }
          if (!["loadSave", "writeSave", "listBackups", "restoreBackup", "ownerAccess", "ownerSandboxLoad", "ownerSandboxSave"].includes(name)) throw Object.assign(new Error("fungsi tidak ada"), { code: "not-found" });
          try { return JSON.parse(JSON.stringify(await server[name](session ? tokenOf(session) : null, payload))); }
          catch (e) { if (e && e.code) throw Object.assign(new Error(e.message), { code: "functions/" + e.code }); throw e; }
        },
      };
      window.__demoCloud = { adapter, server, raw, accounts: ACCOUNTS, tokenOf, setOffline: (b) => { offline = !!b; }, setLatency: (ms) => { latency = ms; }, failNext: (c) => { failNext = c; }, db: read, wipe: () => { try { localStorage.removeItem(DB_KEY); localStorage.removeItem(SES_KEY); } catch (e) {} } };
      return adapter;
    },
  };
})();
