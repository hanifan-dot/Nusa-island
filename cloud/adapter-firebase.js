// NUSA ISLAND — Tahap 3: adapter Firebase sungguhan, MODE SPARK (Authentication + Firestore langsung, TANPA Cloud Functions).
// Logika yang sama dengan server (cloud/core.js: validasi, konflik rev, cadangan, guard Owner) berjalan di browser terhadap
// Firestore; penegakan keamanan yang sebenarnya ada di firebase/firestore.rules (klien tidak bisa dipercaya sepenuhnya).
// SDK dimuat malas dari gstatic.com (CDN resmi Firebase, versi dikunci) HANYA bila window.NUSA_FIREBASE terisi.
// BELUM DIUJI dengan Firebase sungguhan (tidak ada proyek & akses jaringan saat pengembangan) — lihat docs/TAHAP3.md.
(function () {
  "use strict";
  window.NW = window.NW || {};
  const V = "10.14.1";
  const load = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(Object.assign(new Error("Gagal memuat " + src), { code: "unavailable", network: true })); document.head.appendChild(s); });
  NW.cloudFirebase = {
    create(cfg) {
      let auth = null, fsdb = null, fb = null, server = null, cur = null; const cbs = [];
      const SAVE_RE = /^(users\/[^/]+\/saves\/current|ownerSandbox\/[^/]+)$/;
      const strip = (d) => { if (!d) return null; const o = Object.assign({}, d); delete o.ts; return o; };
      const mkDb = () => ({
        get: async (p) => { const s = await fsdb.doc(p).get(); return s.exists ? strip(s.data()) : null; },
        tx: (fn) => fsdb.runTransaction((t) => fn({
          get: async (p) => { const s = await t.get(fsdb.doc(p)); return s.exists ? strip(s.data()) : null; },
          set: async (p, o) => { const d = Object.assign({}, o); delete d.ts; if (SAVE_RE.test(p)) d.ts = fb.firestore.FieldValue.serverTimestamp(); t.set(fsdb.doc(p), d); },
        })),
      });
      const toUser = async (u) => {
        if (!u) return null;
        const tr = await u.getIdTokenResult();
        return { uid: u.uid, name: u.displayName || "Nelayan", photo: u.photoURL || null, emailVerified: !!u.emailVerified, provider: "google.com", claims: { role: tr.claims.role || null } };
      };
      return {
        isDemo: false,
        async init() {
          for (const m of ["app", "auth", "firestore"]) await load(`https://www.gstatic.com/firebasejs/${V}/firebase-${m}-compat.js`);
          fb = window.firebase; fb.initializeApp(cfg);
          auth = fb.auth(); fsdb = fb.firestore(); server = window.NusaCloudCore.makeServer(mkDb());
          try { await auth.getRedirectResult(); } catch (e) { /* hasil redirect gagal: pemain bisa coba lagi */ }
          cur = await new Promise((res) => { const un = auth.onAuthStateChanged((u) => { un(); toUser(u).then(res, () => res(null)); }); });
          auth.onAuthStateChanged(async (u) => { cur = await toUser(u).catch(() => null); cbs.forEach((f) => f(cur)); });
        },
        currentUser: () => cur,
        idToken: async () => { const u = auth && auth.currentUser; if (!u) throw Object.assign(new Error("Masuk dulu dengan akun Google."), { code: "auth" }); return u.getIdToken(); },   // dipakai mp/client.js (token untuk server Dunia Bersama)
        rawFirestore: () => (fsdb && fb && auth && auth.currentUser ? { fb, db: fsdb, uid: auth.currentUser.uid } : null),   // dipakai streak/streak.js (buku klaim Login Streak)
        onAuth: (f) => cbs.push(f),
        async signInGoogle() {
          const fb = window.firebase, p = new fb.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
          let cred;
          try { cred = await auth.signInWithPopup(p); }
          catch (e) {
            if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") { await auth.signInWithRedirect(p); return new Promise(() => {}); }
            throw e;
          }
          if (!cred.user.emailVerified) { await auth.signOut(); throw Object.assign(new Error("Email Google belum terverifikasi."), { code: "unverified" }); }
          cur = await toUser(cred.user); return cur;
        },
        async signOut() { await auth.signOut(); cur = null; },
        async refreshClaims() { if (auth && auth.currentUser) { await auth.currentUser.getIdToken(true); cur = await toUser(auth.currentUser); } return cur && cur.claims; },
        async call(name, payload) {
          const u = auth.currentUser;
          if (!u || typeof server[name] !== "function") throw Object.assign(new Error("Masuk dulu dengan akun Google."), { code: "functions/unauthenticated" });
          const tr = await u.getIdTokenResult();   // klaim dari token terverifikasi Firebase (rules memeriksa ulang di server)
          try { return JSON.parse(JSON.stringify(await server[name]({ uid: u.uid, token: tr.claims }, payload || {}))); }
          catch (e) { if (e && e.name === "CloudError") throw Object.assign(new Error(e.message), { code: "functions/" + e.code }); throw e; }
        },
      };
    },
  };
})();
