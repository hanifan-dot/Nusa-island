// =========================================================
//  NUSA ISLAND — Tahap 3.5: INTI PREMIUM SHOP (katalog, harga, promo, pesanan, ledger, hak milik). Logika murni.
//  Dipakai (1) di browser sebagai SIMULASI (data di localStorage, semua ditandai SIMULASI) dan
//            (2) nanti oleh backend tepercaya (Cloud Functions) TANPA diubah — pola sama seperti cloud/core.js Tahap 3.
//  Prinsip keamanan:
//   - Status PAID hanya bisa ditulis oleh confirmPayment (backend/Owner) atau simulatePayment (HANYA mode simulasi).
//   - Tombol "Saya Sudah Bayar" (claimPaid) hanya mencatat klaim; TIDAK memberi apa pun.
//   - Idempoten: satu pesanan = satu entri ledger = satu pemberian; providerRef unik.
//   - Semua kepemilikan terikat UID; pemain hanya melihat miliknya.
//   - MODE NYATA mati secara bawaan (opts.realEnabled=false) dan tak bisa dinyalakan dari klien.
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaShopCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const DAY = 86400000;
  const COINS_PER_1000 = 200;            // paket dasar: 200 koin per Rp1.000
  const CATEGORIES = [
    { id: "gamepass", name: "Gamepass", icon: "👑" }, { id: "kapal", name: "Skin Kapal", icon: "⛵" }, { id: "kostum", name: "Kostum", icon: "🧥" },
    { id: "dekor", name: "Dekorasi Rumah", icon: "🏮" }, { id: "nama", name: "Efek Nama", icon: "✨" }, { id: "topup", name: "TOP UP KOIN", icon: "🪙" }, { id: "riwayat", name: "Riwayat", icon: "🧾" },
  ];
  // Semua produk KOSMETIK. power:false = tidak menambah kekuatan, kecepatan kapal, peluang ikan mistis, atau peluang menang minigame.
  const PRODUCTS = [
    { id: "gamepass_sultan", cat: "gamepass", name: "Gamepass Nelayan Sultan", icon: "👑", intro: 15000, regular: 25000, permanent: true, cosmetic: true, power: false,
      desc: "Sekali beli, berlaku PERMANEN (tanpa langganan). Kostum Sultan, gelar \"Sultan Samudra\", efek nama emas, dekorasi rumah eksklusif, dan lencana profil Sultan. Hanya tampilan.",
      grants: ["kostum_sultan", "gelar_sultan", "nama_emas", "dekor_sultan", "lencana_sultan"] },
    { id: "skin_kapal_nusantara", cat: "kapal", name: "Skin Kapal Nusantara", icon: "⛵", intro: 5000, regular: 8000, permanent: true, cosmetic: true, power: false, desc: "Layar batik merah-emas dan lambung berukir. Tidak mengubah kecepatan kapal.", grants: ["skin_kapal_nusantara"] },
    { id: "kostum_nelayan", cat: "kostum", name: "Kostum Nelayan", icon: "🧥", intro: 3000, regular: 5000, permanent: true, cosmetic: true, power: false, desc: "Baju nelayan biru laut dengan ikat kepala emas. Hanya tampilan.", grants: ["kostum_nelayan"] },
    { id: "dekor_rumah", cat: "dekor", name: "Dekorasi Rumah", icon: "🏮", intro: 5000, regular: 8000, permanent: true, cosmetic: true, power: false, desc: "Lampion kayu Nusantara untuk Rumahku. Hanya tampilan.", grants: ["dekor_lampion"] },
    { id: "efek_nama", cat: "nama", name: "Efek Nama Eksklusif", icon: "✨", intro: 2000, regular: 4000, permanent: true, cosmetic: true, power: false, desc: "Nama berkilau gelombang laut di atas kepala karaktermu. Hanya tampilan.", grants: ["nama_gelombang"] },
  ];
  const PACKAGES = [
    { id: "topup_pemula", name: "Pemula", icon: "🪙", rupiah: 2000, coins: 400 },
    { id: "topup_nelayan", name: "Nelayan", icon: "🪙", rupiah: 5000, coins: 1100 },
    { id: "topup_juragan", name: "Juragan", icon: "💰", rupiah: 10000, coins: 2300 },
    { id: "topup_sultan", name: "Sultan", icon: "👑", rupiah: 20000, coins: 4800 },
  ];
  const baseCoins = (rupiah) => Math.round(rupiah / 1000 * COINS_PER_1000);
  for (const p of PACKAGES) { p.base = baseCoins(p.rupiah); p.bonus = p.coins - p.base; p.bonusPct = Math.round(p.bonus / p.base * 100); }
  const BY_ID = Object.fromEntries(PRODUCTS.concat(PACKAGES).map((p) => [p.id, p]));
  const MERCHANT = { name: "Kotanusa, Pakaian", note: "Nama merchant sesuai QRIS milik Owner (diperiksa ulang Owner sebelum aktivasi)" };
  const STATUS = ["PENDING", "PAID", "FAILED", "CANCELLED"];
  const fmtRp = (n) => "Rp" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

  class ShopError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }
  const E = (c, m) => new ShopError(c, m);

  // ---------- harga & promo ----------
  // cfg = { launchAt: ms | null, promoDays: 30 }. now = waktu TEPERCAYA (server). Harga reguler TIDAK pernah ditampilkan sebagai "harga lama".
  function promoState(cfg, now) {
    const days = (cfg && cfg.promoDays) || 30, la = cfg && Number.isFinite(cfg.launchAt) ? cfg.launchAt : null;
    if (la === null) return { phase: "prelaunch", launchAt: null, endsAt: null, left: null, scheduled: false };
    if (now < la) return { phase: "prelaunch", launchAt: la, endsAt: la + days * DAY, left: null, scheduled: true };
    const end = la + days * DAY;
    return now < end ? { phase: "promo", launchAt: la, endsAt: end, left: end - now } : { phase: "reguler", launchAt: la, endsAt: end, left: 0 };
  }
  function priceOf(prod, cfg, now) {
    if (!prod) return null;
    if (prod.rupiah !== undefined) return prod.rupiah;                     // paket top up: harga tetap
    return promoState(cfg, now).phase === "reguler" ? prod.regular : prod.intro;
  }
  const isCoinPack = (p) => p && p.rupiah !== undefined;

  // ---------- server ----------
  // db: { get(path)->obj|null, tx(fn(t))->result } dengan t.get/t.set (seperti cloud/core.js). opts: { clock, rng, realEnabled }
  function makeShopServer(db, opts) {
    opts = opts || {};
    const clock = opts.clock || (() => Date.now()), rng = opts.rng || Math.random, realEnabled = opts.realEnabled === true;
    const envOf = (cfg) => (realEnabled && cfg && cfg.mode === "nyata" ? "NYATA" : "SIMULASI"); // NYATA hanya bila backend dinyalakan (env var) DAN Owner menyetel mode nyata
    const uidOf = (auth) => { if (!auth || typeof auth.uid !== "string" || !auth.uid) throw E("unauthenticated", "Masuk dulu untuk membeli."); return auth.uid; };
    const isOwner = (auth) => !!(auth && auth.token && auth.token.role === "owner");
    const requireOwner = (auth) => { uidOf(auth); if (!isOwner(auth)) throw E("permission-denied", "Hanya Owner."); };
    const requireTrusted = (auth) => { if (auth && auth.system === "payment-webhook") return; requireOwner(auth); }; // webhook = identitas sistem yang disuntik backend (BUKAN dari browser)
    const CFG = "shop/config", ORD = (id) => `shop/orders/${id}`, IDX = (uid) => `shop/userOrders/${uid}`, ENT = (uid) => `shop/entitlements/${uid}`, LED = (uid) => `shop/ledger/${uid}`;
    const REF = (r) => `shop/refs/${r}`, AUD = "shop/audit", CNT = "shop/counters";
    const defaultCfg = () => ({ launchAt: null, promoDays: 30, mode: "simulasi", disabled: {}, orderTtlMs: DAY });
    async function cfgOf(t) { const c = await t.get(CFG); return Object.assign(defaultCfg(), c || {}); }
    async function audit(t, auth, action, orderId, detail) {
      const a = (await t.get(AUD)) || { n: 0, items: [] };
      a.n++; a.items.push({ n: a.n, at: clock(), actor: { uid: (auth && auth.uid) || (auth && auth.system) || "-", role: isOwner(auth) ? "owner" : auth && auth.system ? "sistem" : "pemain" }, action, orderId: orderId || null, detail: detail || null });
      if (a.items.length > 500) a.items.splice(0, a.items.length - 500);
      await t.set(AUD, a);
    }
    const safeOrder = (o) => ({ orderId: o.orderId, productId: o.productId, kind: o.kind, name: o.name, rupiah: o.rupiah, uniqueCode: o.uniqueCode, payAmount: o.payAmount, coins: o.coins, bonus: o.bonus, status: o.status, env: o.env,
      nick: o.nick || "", createdAt: o.createdAt, expiresAt: o.expiresAt, paidAt: o.paidAt || null, claimedAt: o.claimedAt || null, merchant: MERCHANT.name, reason: o.reason || null });
    const rid = () => { let s = ""; for (let i = 0; i < 6; i++) s += "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(rng() * 34)]; const d = new Date(clock()); return `NI-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}-${s}`; };
    async function expireStale(t, uid, now) {
      const idx = (await t.get(IDX(uid))) || { ids: [] };
      for (const id of idx.ids) { const o = await t.get(ORD(id)); if (o && o.status === "PENDING" && now >= o.expiresAt) { o.status = "FAILED"; o.reason = "kedaluwarsa"; o.events.push({ at: now, s: "FAILED", by: "sistem", note: "kedaluwarsa" }); await t.set(ORD(id), o); await audit(t, { system: "kedaluwarsa" }, "expire", id); } }
      return idx;
    }
    // berikan hak/koin SEKALI untuk pesanan PAID; dijaga ledger per-pesanan (idempoten)
    async function grant(t, o, by, ref) {
      const now = clock(), lid = `L-${o.orderId}`, led = (await t.get(LED(o.uid))) || { items: [] };
      if (led.items.some((x) => x.entryId === lid)) return false;               // sudah pernah diberikan → tidak ada pemberian ganda
      const ent = (await t.get(ENT(o.uid))) || { products: {}, wallet: { SIMULASI: 0, NYATA: 0 }, owned: {} };
      if (o.kind === "topup") ent.wallet[o.env] = (ent.wallet[o.env] || 0) + o.coins;
      else { const pr = BY_ID[o.productId]; ent.products[o.productId] = { orderId: o.orderId, at: now, env: o.env }; for (const g of pr.grants) ent.owned[g] = { from: o.productId, at: now, env: o.env }; }
      led.items.push({ entryId: lid, uid: o.uid, orderId: o.orderId, productId: o.productId, kind: o.kind, rupiah: o.rupiah, coins: o.kind === "topup" ? o.coins : 0, env: o.env, by, providerRef: ref || null, at: now });
      await t.set(ENT(o.uid), ent); await t.set(LED(o.uid), led); return true;
    }
    const api = {
      // ---- katalog & status (publik bagi pemain masuk atau tidak) ----
      async getCatalog() {
        const now = clock(), cfg = await db.tx(async (t) => cfgOf(t));
        const ps = promoState(cfg, now);
        const items = PRODUCTS.map((p) => ({ id: p.id, cat: p.cat, name: p.name, icon: p.icon, desc: p.desc, permanent: true, cosmetic: true, power: false, price: priceOf(p, cfg, now), intro: p.intro, regular: p.regular, enabled: !cfg.disabled[p.id], grants: p.grants }));
        const packs = PACKAGES.map((p) => ({ id: p.id, name: p.name, icon: p.icon, rupiah: p.rupiah, coins: p.coins, base: p.base, bonus: p.bonus, bonusPct: p.bonusPct, enabled: !cfg.disabled[p.id] }));
        return { now, mode: cfg.mode, env: envOf(cfg), live: envOf(cfg) === "NYATA", promo: ps, items, packs, merchant: MERCHANT, coinsPer1000: COINS_PER_1000 };
      },
      async getTime() { return { now: clock() }; },
      // ---- pesanan pemain ----
      async createOrder(auth, p) {
        const uid = uidOf(auth); p = p || {}; const prod = BY_ID[p.productId];
        if (!prod) throw E("not-found", "Produk tidak ada.");
        if (!p.opId || typeof p.opId !== "string" || p.opId.length > 60) throw E("invalid-argument", "opId wajib.");
        const nick = String(p.nick === undefined ? "" : p.nick).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24); // nama pemain = TIDAK tepercaya; hanya untuk pencarian & tampilan Owner
        return db.tx(async (t) => {
          const now = clock(), cfg = await cfgOf(t);
          if (cfg.mode === "nyata" && !realEnabled) throw E("failed-precondition", "Pembayaran nyata belum diaktifkan.");
          if (cfg.mode === "nyata" && Array.isArray(cfg.pilot) && cfg.pilot.length && cfg.pilot.indexOf(uid) < 0) throw E("failed-precondition", "Toko sedang uji terbatas. Segera dibuka untuk semua pemain."); // uji uang asli terkendali: hanya UID di shop_config/main.pilot
          if (cfg.disabled[prod.id]) throw E("failed-precondition", "Produk sedang dinonaktifkan.");
          const idx = await expireStale(t, uid, now), ent = (await t.get(ENT(uid))) || { products: {} };
          if (!isCoinPack(prod) && ent.products[prod.id]) throw E("already-exists", "Kamu sudah memiliki produk ini.");
          for (const id of idx.ids) { const o = await t.get(ORD(id)); if (!o) continue; if (o.opId === p.opId) return { order: safeOrder(o), existing: true }; if (o.status === "PENDING" && o.productId === prod.id) return { order: safeOrder(o), existing: true }; }
          if (idx.ids.length >= 200) throw E("resource-exhausted", "Terlalu banyak pesanan.");
          const rupiah = priceOf(prod, cfg, now), used = new Set();
          const cnt = (await t.get(CNT)) || { pending: {} };
          for (const [, c] of Object.entries(cnt.pending)) if (c.until > now) used.add(`${c.rupiah}:${c.code}`);
          let code = 1 + Math.floor(rng() * 99), tries = 0; while (used.has(`${rupiah}:${code}`) && tries++ < 100) code = (code % 99) + 1;   // kode unik Rp1–99 (kecil agar tagihan tidak membengkak)
          if (tries >= 100) throw E("resource-exhausted", "Kode unik habis, coba lagi nanti.");
          let orderId = rid(); while (await t.get(ORD(orderId))) orderId = rid();
          const o = { orderId, uid, opId: p.opId, productId: prod.id, kind: isCoinPack(prod) ? "topup" : "produk", nick, nickLower: nick.toLowerCase(), name: isCoinPack(prod) ? "Top Up Paket " + prod.name : prod.name, rupiah, uniqueCode: code, payAmount: rupiah + code, coins: isCoinPack(prod) ? prod.coins : 0, bonus: isCoinPack(prod) ? prod.bonus : 0,
            status: "PENDING", env: envOf(cfg), createdAt: now, expiresAt: now + cfg.orderTtlMs, events: [{ at: now, s: "PENDING", by: "pemain" }] };
          cnt.pending[orderId] = { rupiah, code, until: o.expiresAt };
          for (const k of Object.keys(cnt.pending)) if (cnt.pending[k].until <= now) delete cnt.pending[k];
          idx.ids.push(orderId); await t.set(CNT, cnt); await t.set(ORD(orderId), o); await t.set(IDX(uid), idx); await audit(t, auth, "createOrder", orderId, { productId: prod.id, rupiah });
          return { order: safeOrder(o), existing: false };
        });
      },
      async cancelOrder(auth, p) {
        const uid = uidOf(auth);
        return db.tx(async (t) => {
          const o = await t.get(ORD(p && p.orderId)); if (!o || o.uid !== uid) throw E("not-found", "Pesanan tidak ditemukan.");
          if (o.status !== "PENDING") throw E("failed-precondition", "Hanya pesanan PENDING yang bisa dibatalkan.");
          o.status = "CANCELLED"; o.events.push({ at: clock(), s: "CANCELLED", by: "pemain" }); await t.set(ORD(o.orderId), o);
          const cnt = (await t.get(CNT)) || { pending: {} }; delete cnt.pending[o.orderId]; await t.set(CNT, cnt); await audit(t, auth, "cancelOrder", o.orderId); return { order: safeOrder(o) };
        });
      },
      // "Saya Sudah Bayar": HANYA mencatat klaim. Status tetap PENDING, tidak ada item/koin yang diberikan, screenshot tidak dipercaya.
      async claimPaid(auth, p) {
        const uid = uidOf(auth);
        return db.tx(async (t) => {
          const o = await t.get(ORD(p && p.orderId)); if (!o || o.uid !== uid) throw E("not-found", "Pesanan tidak ditemukan.");
          if (o.status === "PENDING" && !o.claimedAt) { o.claimedAt = clock(); o.events.push({ at: o.claimedAt, s: "PENDING", by: "pemain", note: "klaim sudah bayar (belum diverifikasi)" }); await t.set(ORD(o.orderId), o); await audit(t, auth, "claimPaid", o.orderId); }
          return { order: safeOrder(o), granted: false, message: "Klaim dicatat. Item/koin diberikan hanya setelah pembayaran DIVERIFIKASI backend." };
        });
      },
      // Hanya MODE SIMULASI: menandai PAID tanpa uang. Ditolak total bila mode nyata.
      async simulatePayment(auth, p) {
        const uid = uidOf(auth);
        if (realEnabled) throw E("permission-denied", "Tidak tersedia pada mode nyata.");
        return db.tx(async (t) => {
          const cfg = await cfgOf(t); if (cfg.mode !== "simulasi") throw E("permission-denied", "Hanya mode simulasi.");
          const o = await t.get(ORD(p && p.orderId)); if (!o || o.uid !== uid) throw E("not-found", "Pesanan tidak ditemukan.");
          if (o.env !== "SIMULASI") throw E("permission-denied", "Pesanan ini bukan simulasi.");
          if (o.status === "PAID") return { order: safeOrder(o), granted: false };
          if (o.status !== "PENDING") throw E("failed-precondition", "Status pesanan " + o.status + ".");
          if (clock() >= o.expiresAt) throw E("failed-precondition", "Pesanan kedaluwarsa.");
          o.status = "PAID"; o.paidAt = clock(); o.events.push({ at: o.paidAt, s: "PAID", by: "simulasi" }); await t.set(ORD(o.orderId), o);
          const g = await grant(t, o, "simulasi", null); const cnt = (await t.get(CNT)) || { pending: {} }; delete cnt.pending[o.orderId]; await t.set(CNT, cnt); await audit(t, auth, "simulatePayment", o.orderId); return { order: safeOrder(o), granted: g };
        });
      },
      // Konfirmasi pembayaran NYATA: hanya Owner (verifikasi manual) atau webhook penyedia pembayaran (identitas sistem dari backend). Idempoten via providerRef.
      async confirmPayment(auth, p) {
        requireTrusted(auth); p = p || {};
        if (!realEnabled) throw E("failed-precondition", "Mode nyata belum diaktifkan; tidak ada pembayaran nyata yang diproses.");
        if (typeof p.providerRef !== "string" || !p.providerRef || p.providerRef.length > 80) throw E("invalid-argument", "providerRef wajib.");
        return db.tx(async (t) => {
          const prev = await t.get(REF(p.providerRef));
          if (prev) { if (prev.orderId !== p.orderId) throw E("already-exists", "providerRef dipakai pesanan lain."); const o0 = await t.get(ORD(prev.orderId)); return { order: safeOrder(o0), granted: false, duplicate: true }; }
          const o = await t.get(ORD(p.orderId)); if (!o) throw E("not-found", "Pesanan tidak ditemukan.");
          if (o.env !== "NYATA") throw E("failed-precondition", "Pesanan simulasi tidak bisa dikonfirmasi sebagai nyata.");
          if (o.status === "PAID") return { order: safeOrder(o), granted: false, duplicate: true };
          const lateRevive = o.status === "FAILED" && o.reason === "kedaluwarsa" && p.allowExpired === true && isOwner(auth);   // pemain bayar tepat waktu tetapi Owner baru memeriksa
          if (o.status !== "PENDING" && !lateRevive) throw E("failed-precondition", "Status pesanan " + o.status + ".");
          if (!Number.isInteger(p.paidAmount) || p.paidAmount !== o.payAmount) { await audit(t, auth, "confirmRejected", o.orderId, { reason: "nominal-tidak-cocok", expected: o.payAmount, got: p.paidAmount }); throw E("failed-precondition", "Nominal tidak cocok dengan tagihan."); }
          const late = lateRevive || clock() >= o.expiresAt;
          if (late && !(p.allowExpired === true && isOwner(auth))) { await audit(t, auth, "confirmRejected", o.orderId, { reason: "kedaluwarsa" }); throw E("failed-precondition", "Pesanan kedaluwarsa — setujui manual dengan opsi 'izinkan kedaluwarsa'."); }
          o.status = "PAID"; o.paidAt = clock(); o.events.push({ at: o.paidAt, s: "PAID", by: auth.system || "owner", ref: p.providerRef }); await t.set(ORD(o.orderId), o);
          await t.set(REF(p.providerRef), { orderId: o.orderId, at: o.paidAt });
          const g = await grant(t, o, auth.system || "owner", p.providerRef); const cnt = (await t.get(CNT)) || { pending: {} }; delete cnt.pending[o.orderId]; await t.set(CNT, cnt);
          await audit(t, auth, "confirmPayment", o.orderId, { providerRef: p.providerRef, late: late || undefined, note: typeof p.note === "string" ? p.note.slice(0, 80) : undefined }); return { order: safeOrder(o), granted: g };
        });
      },
      async failOrder(auth, p) {
        requireTrusted(auth);
        return db.tx(async (t) => { const o = await t.get(ORD(p && p.orderId)); if (!o) throw E("not-found"); if (o.status !== "PENDING") throw E("failed-precondition", "Status " + o.status);
          o.status = "FAILED"; o.reason = (p.reason || "ditolak").slice(0, 60); o.events.push({ at: clock(), s: "FAILED", by: auth.system || "owner", note: o.reason }); await t.set(ORD(o.orderId), o);
          const cnt = (await t.get(CNT)) || { pending: {} }; delete cnt.pending[o.orderId]; await t.set(CNT, cnt); await audit(t, auth, "failOrder", o.orderId, { reason: o.reason }); return { order: safeOrder(o) }; });
      },
      // ---- data milik sendiri (UID) ----
      async listOrders(auth) { const uid = uidOf(auth); return db.tx(async (t) => { const idx = await expireStale(t, uid, clock()); const out = []; for (const id of idx.ids) { const o = await t.get(ORD(id)); if (o && o.uid === uid) out.push(safeOrder(o)); } return { orders: out.sort((a, b) => b.createdAt - a.createdAt) }; }); },
      async getEntitlements(auth) { const uid = uidOf(auth); const cfg0 = await db.get(CFG); const e = (await db.get(ENT(uid))) || { products: {}, wallet: { SIMULASI: 0, NYATA: 0 }, owned: {} }; return { products: e.products, owned: e.owned, wallet: e.wallet, pending: ((e.deliveries || []).find((x) => x.state === "pending") || null) && { opId: e.deliveries.find((x) => x.state === "pending").opId, amount: e.deliveries.find((x) => x.state === "pending").amount }, env: envOf(Object.assign(defaultCfg(), cfg0 || {})) }; },
      async listLedger(auth) { const uid = uidOf(auth); const l = (await db.get(LED(uid))) || { items: [] }; return { items: l.items.slice().sort((a, b) => b.at - a.at) }; },
      // ---- Owner (Command Center) ----
      async ownerCatalog(auth) { requireOwner(auth); return api.getCatalog(); },
      // Payment Center: daftar/cari pesanan lintas pengguna. Adapter db.queryOrders({status,q,limit}) disediakan backend (Firestore).
      async ownerListOrders(auth, p) {
        requireOwner(auth); p = p || {};
        if (typeof db.queryOrders !== "function") throw E("failed-precondition", "Backend belum mendukung daftar pesanan.");
        const status = STATUS.includes(p.status) ? p.status : null, q = typeof p.q === "string" ? p.q.trim().slice(0, 40) : "", limit = Math.min(100, Math.max(1, Math.floor(p.limit) || 50));
        const rows = await db.queryOrders({ status, q, limit });
        return { orders: rows.map((o) => Object.assign(safeOrder(o), { uid: o.uid, events: o.events, ref: (o.events.find((e) => e.ref) || {}).ref || null })) };
      },
      // Owner menyetujui setelah melihat uang MASUK di merchant. paidAmount WAJIB sama dengan tagihan (kode unik) — mencegah salah klik pesanan lain.
      async ownerApprove(auth, p) {
        requireOwner(auth); p = p || {};
        return api.confirmPayment(auth, { orderId: p.orderId, paidAmount: p.paidAmount, providerRef: "manual:" + String(p.orderId || ""), allowExpired: p.allowExpired === true, note: p.note });
      },
      async ownerReject(auth, p) { requireOwner(auth); return api.failOrder(auth, { orderId: p && p.orderId, reason: (p && p.reason) || "ditolak Owner" }); },
      // ---- dompet koin NYATA tepercaya: koin top up disimpan SERVER; klien menjemputnya lewat pengiriman bertanda (dua langkah, tanpa kehilangan/ganda) ----
      async redeemCoins(auth) {
        const uid = uidOf(auth);
        return db.tx(async (t) => {
          const ent = (await t.get(ENT(uid))) || { products: {}, wallet: { SIMULASI: 0, NYATA: 0 }, owned: {} }; ent.deliveries = ent.deliveries || [];
          let d = ent.deliveries.find((x) => x.state === "pending");
          if (!d && (ent.wallet.NYATA || 0) > 0) {
            d = { opId: "D-" + clock().toString(36) + "-" + Math.floor(rng() * 1e6).toString(36), amount: ent.wallet.NYATA, state: "pending", at: clock() };
            ent.wallet.NYATA = 0; ent.deliveries.push(d); if (ent.deliveries.length > 50) ent.deliveries.splice(0, ent.deliveries.length - 50);
            await t.set(ENT(uid), ent); await audit(t, auth, "redeemCoins", null, { amount: d.amount });
          }
          return { delivery: d ? { opId: d.opId, amount: d.amount } : null };
        });
      },
      // ---- DOMPET TUNGGAL berjangkar server: koin top up TIDAK dipindah ke klien; dipakai belanja lewat sini (idempoten per opId) ----
      async spendCoins(auth, p) {
        const uid = uidOf(auth); p = p || {}; const amt = p.amount;
        if (!Number.isInteger(amt) || amt < 1 || amt > 1000000) throw E("invalid-argument", "Jumlah koin tidak valid.");
        if (typeof p.opId !== "string" || !/^[A-Za-z0-9_-]{8,60}$/.test(p.opId)) throw E("invalid-argument", "opId tidak valid.");
        const reason = typeof p.reason === "string" && /^[a-z0-9:_-]{1,40}$/.test(p.reason) ? p.reason : "belanja";
        return db.tx(async (t) => {
          const ent = (await t.get(ENT(uid))) || { products: {}, wallet: { SIMULASI: 0, NYATA: 0 }, owned: {} }; ent.spends = ent.spends || [];
          const done = ent.spends.find((x) => x.opId === p.opId);
          if (done) return { ok: true, duplicate: true, spent: done.amount, balance: ent.wallet.NYATA || 0 };   // ulang karena jaringan putus: hasil sama, tidak dipotong dua kali
          if ((ent.wallet.NYATA || 0) < amt) throw E("failed-precondition", "Saldo koin top up tidak cukup.");
          ent.wallet.NYATA -= amt; ent.spentTotal = (ent.spentTotal || 0) + amt;
          ent.spends.push({ opId: p.opId, amount: amt, reason, at: clock() }); if (ent.spends.length > 100) ent.spends.splice(0, ent.spends.length - 100);
          await t.set(ENT(uid), ent);
          return { ok: true, duplicate: false, spent: amt, balance: ent.wallet.NYATA };
        });
      },
      async ackDelivery(auth, p) {
        const uid = uidOf(auth);
        return db.tx(async (t) => {
          const ent = await t.get(ENT(uid)); const d = ent && (ent.deliveries || []).find((x) => x.opId === (p && p.opId));
          if (!d) throw E("not-found", "Pengiriman tidak ditemukan.");
          if (d.state === "pending") { d.state = "delivered"; d.ackAt = clock(); await t.set(ENT(uid), ent); }
          return { ok: true };
        });
      },
      async ownerSetLaunch(auth, p) { requireOwner(auth); if (!Number.isFinite(p && p.launchAt)) throw E("invalid-argument", "launchAt (ms) wajib."); return db.tx(async (t) => { const c = await cfgOf(t); c.launchAt = Math.floor(p.launchAt); if (p.promoDays !== undefined) { if (!(p.promoDays >= 1 && p.promoDays <= 90)) throw E("invalid-argument"); c.promoDays = Math.floor(p.promoDays); } await t.set(CFG, c); await audit(t, auth, "setLaunch", null, { launchAt: c.launchAt, promoDays: c.promoDays }); return { config: c }; }); },
      async ownerSetEnabled(auth, p) { requireOwner(auth); if (!BY_ID[p && p.productId]) throw E("not-found"); return db.tx(async (t) => { const c = await cfgOf(t); if (p.enabled) delete c.disabled[p.productId]; else c.disabled[p.productId] = true; await t.set(CFG, c); await audit(t, auth, "setEnabled", null, { productId: p.productId, enabled: !!p.enabled }); return { config: c }; }); },
      async ownerSetMode(auth, p) { requireOwner(auth); if (p && p.mode === "nyata" && !realEnabled) throw E("failed-precondition", "Backend pembayaran nyata belum siap; mode nyata tidak bisa dinyalakan."); if (!p || !["simulasi", "nyata"].includes(p.mode)) throw E("invalid-argument"); return db.tx(async (t) => { const c = await cfgOf(t); c.mode = p.mode; await t.set(CFG, c); await audit(t, auth, "setMode", null, { mode: p.mode }); return { config: c }; }); },
      // daftar UID pilot (uji uang asli terkendali). Kosong = terbuka untuk semua pemain.
      async ownerSetPilot(auth, p) { requireOwner(auth); const u = (p && p.uids); if (!Array.isArray(u) || u.length > 20 || u.some((x) => typeof x !== "string" || !/^[A-Za-z0-9_-]{6,128}$/.test(x))) throw E("invalid-argument", "Daftar UID tidak valid (maks 20)."); return db.tx(async (t) => { const c = await cfgOf(t); c.pilot = Array.from(new Set(u)); await t.set(CFG, c); await audit(t, auth, "setPilot", null, { n: c.pilot.length }); return { config: c }; }); },
      async ownerAudit(auth) { requireOwner(auth); return (await db.get(AUD)) || { n: 0, items: [] }; },
      async ownerUserReport(auth, p) { requireOwner(auth); const uid = p && p.uid; if (typeof uid !== "string") throw E("invalid-argument"); const led = (await db.get(LED(uid))) || { items: [] }; let nyata = 0, sim = 0; for (const x of led.items) { if (x.env === "NYATA") nyata += x.rupiah; else sim += x.rupiah; } return { uid, nyataRupiah: nyata, simulasiRupiah: sim, entries: led.items.length }; },
    };
    return api;
  }
  return { PRODUCTS, PACKAGES, CATEGORIES, BY_ID, MERCHANT, STATUS, COINS_PER_1000, DAY, fmtRp, baseCoins, promoState, priceOf, isCoinPack, makeShopServer, ShopError };
});
