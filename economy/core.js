// =========================================================
//  NUSA ISLAND — INTI EKONOMI SERVER (satu dompet koin, otoritas server). Logika murni (UMD), dipakai Cloud Functions.
//  Prinsip:
//   - SATU saldo per pemain: koin hasil bermain (eco.bal) + koin Top Up (entitlements.wallet.NYATA) dibelanjakan dari
//     satu tempat; tampilan = jumlah keduanya. Tidak ada mata uang kedua.
//   - Klien TIDAK PERNAH mengirim "saldo" atau "harga". Klien hanya melapor KEJADIAN (ikan tertangkap, minta jual, minta beli);
//     server menghitung nilai dari tabel yang sama dengan game (economy/tables.js) lalu mengubah saldo.
//   - Setiap operasi punya opId → idempotent (percobaan ulang karena jaringan tidak menggandakan koin / potongan).
//   - Hadiah tetap (cerita/area) = tabel server, sekali per kunci. Misi = batas wajar per klaim + per hari + sekali per id.
//   - Penghasilan dibatasi laju: jeda tangkapan, batas per jam, batas hadiah misi harian. Ikan yang dijual harus ada di
//     "kotak ikan" server (hasil lapor tangkapan) dan terhapus dari sana saat dijual → tidak bisa dijual dua kali.
//   - Kepemilikan upgrade (joran/umpan/coolbox/kapal) dan level rumah dipegang server; writeSave menimpa nilai kiriman klien.
//  BATAS JUJUR: server tidak bisa MELIHAT pemain benar-benar memancing. Yang dijamin: nilai per ikan ≤ tabel resmi, laju terbatas,
//  tidak ada koin dari ketiadaan, tidak ada pengeluaran melebihi saldo, tidak ada klaim ganda.
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaEconomyCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  class EcoError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }
  const E = (c, m) => new EcoError(c, m);
  const PRICE_SCALE = 3;                       // sama dengan game.js
  const OP_RE = /^[A-Za-z0-9_-]{8,60}$/, UID_RE = /^[A-Za-z0-9_-]{4,40}$/, ID_RE = /^[a-z0-9_]{1,40}$/;
  const HOUR = 3600000, DAY = 86400000;
  const LIM = { boxMax: 400, catchGapMs: 1500, catchPerHour: 400, catchBatch: 10, missionPerClaim: 260, missionPerDay: 1800, missionsPerDay: 8, sellBatch: 200, ops: 120, start: 50 };
  // Hadiah tetap: kunci → koin. Sekali per kunci per pemain. (Sumber: world/story.js, world/areas/selat.js, world/areas/toba.js)
  const REWARDS = { "story:ch1": 150, "story:ch2": 200, "selat:bab1": 200, "selat:bab2": 250, "selat:bab3": 350, "toba:bab1": 200, "toba:bab2": 250, "toba:bab3": 350 };

  // harga harian: sama persis dengan game.js (seeded + hashStr)
  function seeded(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  function hashStr(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const priceMult = (id, day) => 0.7 + seeded(hashStr(id + ":" + day))() * 0.75;

  function makeEconomyServer(db, opts) {
    opts = opts || {};
    const clock = opts.clock || (() => Date.now());
    const T = opts.tables, FM = opts.fishmath;
    if (!T || !FM) throw new Error("tables & fishmath wajib");
    const initCap = Number.isFinite(opts.initCap) ? opts.initCap : 20000;     // batas koin lama yang diakui SEKALI saat migrasi; 0 saat rilis
    const SK = opts.streak || null;                                           // StreakCore (streak/core.js), opsional
    const rng = opts.rng || (() => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } });
    // KEAMANAN MIGRASI: secara BAWAAN ecoInit TIDAK memakai angka dari browser sama sekali. Saldo/level/ikan lama diambil dari SNAPSHOT yang dibekukan
    // Owner di server (shop/legacy/{uid}, dibuat sekali oleh toko.js bekukan) — bukan dari permintaan klien. Hanya pengujian yang boleh opts.trustClientInit=true.
    const trustClient = opts.trustClientInit === true;
    const FISH = Object.fromEntries(T.FISH.map((f) => [f.id, f]));
    const ECO = (uid) => `shop/economy/${uid}`, ENT = (uid) => `shop/entitlements/${uid}`;
    const uidOf = (a) => { if (!a || typeof a.uid !== "string" || !a.uid) throw E("unauthenticated", "Masuk dulu."); return a.uid; };
    const needOp = (p) => { if (!p || typeof p.opId !== "string" || !OP_RE.test(p.opId)) throw E("invalid-argument", "opId tidak valid."); return p.opId; };
    const fresh = () => ({ v: 1, init: false, bal: 0, up: { rod: 0, bait: 0, cooler: 0, boat: 0 }, homeLv: 1, cat: {}, claimed: {}, box: [], catches: [], missions: { day: 0, total: 0, n: 0, ids: [] },
      ops: [], earned: 0, spent: 0, lastCatchAt: 0, streak: null, streakBait: 0 });
    const topupOf = (ent) => (ent && ent.wallet && ent.wallet.NYATA) || 0;
    const view = (eco, ent) => ({ init: eco.init, own: eco.bal, topup: topupOf(ent), balance: eco.bal + topupOf(ent), up: eco.up, homeLv: eco.homeLv, cat: eco.cat,
      box: eco.box.map((b) => b.u), claimed: Object.keys(eco.claimed) });
    const doneOp = (eco, id) => { const o = eco.ops.find((x) => x.id === id); return o ? o.r : null; };
    const remember = (eco, id, r) => { eco.ops.push({ id, r }); if (eco.ops.length > LIM.ops) eco.ops.splice(0, eco.ops.length - LIM.ops); return r; };
    const getEco = async (t, uid) => Object.assign(fresh(), (await t.get(ECO(uid))) || {});
    const needInit = (eco) => { if (!eco.init) throw E("failed-precondition", "Ekonomi belum diaktifkan untuk akun ini."); };
    const maxKg = (f) => f.xMax || f.wMax;

    // Belanja dari SATU dompet: koin bermain dulu, sisanya koin Top Up. Mengembalikan rincian; melempar bila tidak cukup.
    function spendFrom(eco, ent, amt) {
      if (eco.bal + topupOf(ent) < amt) throw E("failed-precondition", "Koin tidak cukup.");
      const own = Math.min(eco.bal, amt), top = amt - own;
      eco.bal -= own; eco.spent += amt;
      if (top > 0) { ent.wallet.NYATA -= top; ent.spentTotal = (ent.spentTotal || 0) + top; }
      return { own, top };
    }
    const entOf = async (t, uid) => (await t.get(ENT(uid))) || { products: {}, wallet: { SIMULASI: 0, NYATA: 0 }, owned: {} };
    const credit = (eco, n) => { eco.bal += n; eco.earned += n; };
    const needSK = () => { if (!SK) throw E("failed-precondition", "Hadiah login belum tersedia di server ini."); };

    const api = {
      async ecoState(auth) {
        const uid = uidOf(auth);
        return db.tx(async (t) => { const eco = await getEco(t, uid), ent = await entOf(t, uid); return view(eco, ent); });
      },
      // Migrasi SEKALI dari simpanan lama. Hanya bila belum init. Nilai klien dibatasi ketat; kotak ikan hanya ikan yang masuk akal.
      async ecoInit(auth, p) {
        const uid = uidOf(auth); p = p || {};
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid);
          if (eco.init) return Object.assign({ ok: true, already: true }, view(eco, ent));
          if (!trustClient) {
            const cfg = (await t.get("shop/config")) || {};
            if (!cfg.legacyFrozen) throw E("failed-precondition", "Migrasi simpanan lama belum siap. Coba lagi nanti.");   // gagal-tertutup: tidak ada migrasi tanpa snapshot server
            const lg = (await t.get(`shop/legacy/${uid}`)) || {};                     // tanpa snapshot = akun baru (koin awal saja)
            p = { money: lg.money, up: lg.up, homeLv: lg.homeLv, cooler: lg.cooler };
          }
          const m = Number.isFinite(p.money) ? Math.floor(p.money) : 0;
          eco.bal = Math.max(LIM.start, Math.min(initCap, Math.max(0, m)));
          for (const k of Object.keys(eco.up)) { const lv = p.up && Number.isInteger(p.up[k]) ? p.up[k] : 0; eco.up[k] = Math.max(0, Math.min(T.UP[k].max, lv)); }
          eco.homeLv = Math.max(1, Math.min(T.HOME.length - 1, Number.isInteger(p.homeLv) ? p.homeLv : 1));
          const seen = new Set(); let n = 0;
          for (const it of Array.isArray(p.cooler) ? p.cooler : []) {
            if (n >= LIM.boxMax) break;
            const f = it && FISH[it.id];
            if (!f || typeof it.uid !== "string" || !UID_RE.test(it.uid) || seen.has(it.uid) || !(it.w >= f.wMin * 0.5) || !(it.w <= maxKg(f))) continue;
            seen.add(it.uid); eco.box.push({ u: it.uid, id: f.id, w: Math.round(it.w * 100) / 100 }); n++;
          }
          eco.init = true; eco.initAt = clock();
          await t.set(ECO(uid), eco);
          return Object.assign({ ok: true }, view(eco, ent));
        });
      },
      // Lapor tangkapan. Server memvalidasi spesies & berat, membatasi laju, lalu menaruh ikan di kotak server.
      // Ikan dilindungi (protected) langsung dilepas → hadiah dihitung server.
      async ecoCatch(auth, p) {
        const uid = uidOf(auth), opId = needOp(p);
        // Satu tangkapan {id,w,uid} ATAU paket {items:[...]} (≤10) — paket menghemat tulis Firestore (kuota gratis 20.000 tulis/hari).
        const items = Array.isArray(p.items) ? p.items : [p];
        if (!items.length || items.length > LIM.catchBatch) throw E("invalid-argument", "Paket tangkapan tidak valid.");
        const seenUid = new Set();
        for (const it of items) {
          const f = it && FISH[it.id];
          if (!f) throw E("invalid-argument", "Ikan tidak dikenal.");
          const w = Number(it.w);
          if (!(w >= f.wMin * 0.5) || !(w <= maxKg(f))) throw E("invalid-argument", "Berat ikan tidak masuk akal.");
          if (!f.protected) { if (typeof it.uid !== "string" || !UID_RE.test(it.uid) || seenUid.has(it.uid)) throw E("invalid-argument", "UID ikan tidak valid."); seenUid.add(it.uid); }
        }
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, view(eco, ent));
          const now = clock(), n = items.length;
          // jeda rata-rata ≥ catchGapMs antar tangkapan: paket n ikan harus terpisah ≥ (n-1)×jeda dari kiriman sebelumnya
          if (now - eco.lastCatchAt < (n - 1) * LIM.catchGapMs || (n === 1 && now - eco.lastCatchAt < LIM.catchGapMs)) throw E("resource-exhausted", "Tangkapan terlalu cepat.");
          eco.catches = eco.catches.filter((x) => now - x < HOUR);
          if (eco.catches.length + n > LIM.catchPerHour) throw E("resource-exhausted", "Batas tangkapan per jam tercapai.");
          for (let i = 0; i < n; i++) eco.catches.push(now); eco.lastCatchAt = now;
          let reward = 0;
          for (const it of items) {
            const f = FISH[it.id], w = Number(it.w);
            if (f.protected) { const r = Math.round(f.price * PRICE_SCALE * FM.effectiveKg(w) * 1.2); reward += r; credit(eco, r); continue; }
            if (eco.box.some((b) => b.u === it.uid)) throw E("already-exists", "UID ikan sudah ada.");
            if (eco.box.length >= LIM.boxMax) throw E("resource-exhausted", "Kotak ikan penuh.");
            eco.box.push({ u: it.uid, id: f.id, w: Math.round(w * 100) / 100 });
          }
          await t.set(ECO(uid), remember(eco, opId, { reward }) && eco);
          return Object.assign({ ok: true, reward }, view(eco, ent));
        });
      },
      // Jual ikan: harga dihitung server dari kotak server. Ikan yang tidak ada di kotak diabaikan (dilaporkan sebagai "unknown").
      async ecoSell(auth, p) {
        const uid = uidOf(auth), opId = needOp(p), day = Math.floor(Number(p.day));
        if (!Array.isArray(p.uids) || !p.uids.length || p.uids.length > LIM.sellBatch || p.uids.some((u) => typeof u !== "string" || !UID_RE.test(u))) throw E("invalid-argument", "Daftar ikan tidak valid.");
        if (!(day >= 1 && day <= 1e6)) throw E("invalid-argument", "Hari tidak valid.");
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, view(eco, ent));
          const want = new Set(p.uids); let total = 0; const sold = [], keep = [];
          for (const b of eco.box) {
            if (want.has(b.u)) { total += FM.priceFor(FISH[b.id], b.w, priceMult(b.id, day), PRICE_SCALE); sold.push(b.u); } else keep.push(b);
          }
          eco.box = keep; credit(eco, total);
          const unknown = p.uids.filter((u) => !sold.includes(u));
          await t.set(ECO(uid), remember(eco, opId, { total, sold, unknown }) && eco);
          return Object.assign({ ok: true, total, sold, unknown }, view(eco, ent));
        });
      },
      // Ikan keluar dari kotak tanpa uang (diserahkan ke NPC/misi, dilepas, dll.) agar tidak tersisa "hantu" di server.
      async ecoDrop(auth, p) {
        const uid = uidOf(auth), opId = needOp(p);
        if (!Array.isArray(p.uids) || p.uids.length > LIM.sellBatch || p.uids.some((u) => typeof u !== "string" || !UID_RE.test(u))) throw E("invalid-argument", "Daftar ikan tidak valid.");
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          if (doneOp(eco, opId)) return Object.assign({ duplicate: true }, view(eco, ent));
          const drop = new Set(p.uids); eco.box = eco.box.filter((b) => !drop.has(b.u));
          await t.set(ECO(uid), remember(eco, opId, { ok: true }) && eco);
          return Object.assign({ ok: true }, view(eco, ent));
        });
      },
      // Hadiah tetap cerita/area: sekali per kunci, nilai dari tabel server.
      async ecoReward(auth, p) {
        const uid = uidOf(auth), opId = needOp(p), key = p.key;
        if (typeof key !== "string" || !Object.prototype.hasOwnProperty.call(REWARDS, key)) throw E("invalid-argument", "Hadiah tidak dikenal.");
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, view(eco, ent));
          if (eco.claimed[key]) return Object.assign({ ok: true, already: true, amount: 0 }, view(eco, ent));
          eco.claimed[key] = clock(); credit(eco, REWARDS[key]);
          await t.set(ECO(uid), remember(eco, opId, { amount: REWARDS[key] }) && eco);
          return Object.assign({ ok: true, amount: REWARDS[key] }, view(eco, ent));
        });
      },
      // Hadiah misi harian: id misi unik, sekali klaim; nilai dibatasi per klaim, per hari, dan jumlah klaim per hari.
      // (Server tidak menyimpan progres misi — kemajuan misi tidak bisa dibuktikan; yang dijamin hanya batas atas.)
      async ecoMission(auth, p) {
        const uid = uidOf(auth), opId = needOp(p), mid = p.mid, coins = Math.floor(Number(p.coins));
        if (typeof mid !== "string" || mid.length > 80 || !/^[A-Za-z0-9#:_-]+$/.test(mid)) throw E("invalid-argument", "ID misi tidak valid.");
        if (!(coins >= 1 && coins <= LIM.missionPerClaim)) throw E("invalid-argument", "Hadiah misi di luar batas.");
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, view(eco, ent));
          const now = clock(), d = Math.floor(now / DAY);
          if (eco.missions.day !== d) eco.missions = { day: d, total: 0, n: 0, ids: eco.missions.ids.slice(-40) };
          if (eco.missions.ids.includes(mid)) return Object.assign({ ok: true, already: true, amount: 0 }, view(eco, ent));
          if (eco.missions.n >= LIM.missionsPerDay || eco.missions.total + coins > LIM.missionPerDay) throw E("resource-exhausted", "Batas hadiah misi harian tercapai.");
          eco.missions.ids.push(mid); eco.missions.n++; eco.missions.total += coins; credit(eco, coins);
          await t.set(ECO(uid), remember(eco, opId, { amount: coins }) && eco);
          return Object.assign({ ok: true, amount: coins }, view(eco, ent));
        });
      },
      // Pembelian: harga dari tabel server. kind: "up" (k,lv) | "home" (lv) | "cat" (id). Kepemilikan dicatat server.
      async ecoBuy(auth, p) {
        const uid = uidOf(auth), opId = needOp(p); p = p || {};
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, view(eco, ent));
          let price, apply;
          if (p.kind === "up") {
            const U = T.UP[p.k]; if (!U || !Object.prototype.hasOwnProperty.call(eco.up, p.k)) throw E("invalid-argument", "Peningkatan tidak dikenal.");
            const next = eco.up[p.k] + 1;
            if (next > U.max) throw E("failed-precondition", "Sudah level maksimum.");
            if (p.lv !== next) throw E("failed-precondition", "Level tujuan tidak sesuai (klik basi).");
            price = U.cost[next]; apply = () => { eco.up[p.k] = next; };
          } else if (p.kind === "home") {
            const next = eco.homeLv + 1;
            if (next >= T.HOME.length) throw E("failed-precondition", "Rumah sudah level maksimum.");
            if (p.lv !== next) throw E("failed-precondition", "Level tujuan tidak sesuai (klik basi).");
            price = T.HOME[next].price; apply = () => { eco.homeLv = next; };
          } else if (p.kind === "cat") {
            const c = typeof p.id === "string" && Object.prototype.hasOwnProperty.call(T.CAT, p.id) ? T.CAT[p.id] : null;
            if (!c) throw E("invalid-argument", "Barang tidak dikenal.");
            price = c.price; apply = () => { eco.cat[p.id] = (eco.cat[p.id] || 0) + 1; };
          } else throw E("invalid-argument", "Jenis pembelian tidak dikenal.");
          const paid = spendFrom(eco, ent, price); apply();
          if (paid.top > 0) { ent.spends = ent.spends || []; ent.spends.push({ opId, amount: paid.top, reason: "eco:" + p.kind, at: clock() }); if (ent.spends.length > 100) ent.spends.splice(0, ent.spends.length - 100); await t.set(ENT(uid), ent); }
          await t.set(ECO(uid), remember(eco, opId, { price, paidOwn: paid.own, paidTop: paid.top }) && eco);
          return Object.assign({ ok: true, price, paidOwn: paid.own, paidTop: paid.top }, view(eco, ent));
        });
      },
      // ---- Login Streak 7 Hari (buku klaim di dokumen ekonomi; hari = jam SERVER Asia/Jakarta; koin masuk dompet utama) ----
      async ecoStreakState(auth) {
        needSK(); const uid = uidOf(auth);
        return db.tx(async (t) => { const eco = await getEco(t, uid), ent = await entOf(t, uid); return Object.assign({ now: clock(), doc: eco.streak, bait: eco.streakBait }, view(eco, ent)); });
      },
      // Klien tidak mengirim tanggal/hadiah. Server memilih hari, posisi, hadiah (dan perabot acak), lalu mengkredit koin SEKALI.
      // p.owned = daftar id perabot hadiah yang sudah dimiliki di Rumahku (hanya untuk menghindari duplikat; id tak dikenal diabaikan).
      async ecoStreakClaim(auth, p) {
        needSK(); const uid = uidOf(auth), opId = needOp(p); p = p || {};
        const owned = (Array.isArray(p.owned) ? p.owned : []).filter((x) => typeof x === "string" && SK.FURN_BY_ID[x]).slice(0, 40);
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          const prevOp = doneOp(eco, opId); if (prevOp) return Object.assign({ duplicate: true }, prevOp, { now: clock(), doc: eco.streak, bait: eco.streakBait }, view(eco, ent));
          const now = clock(), prev = eco.streak && eco.streak.total > 0 ? eco.streak : null;
          const plan = SK.planClaim(prev, now, { owned, rnd: rng });
          if (!plan) return Object.assign({ ok: true, already: true }, { now, doc: eco.streak, bait: eco.streakBait }, view(eco, ent));
          const next = Object.assign({}, plan.next, { at: now });
          const chk = SK.validateTransition(prev, next, now); if (!chk.ok) throw E("internal", "Klaim tidak valid: " + chk.why);   // pagar pengaman: aturan yang sama dengan Rules
          const rw = plan.reward;
          eco.streak = next; if (rw.coin) credit(eco, rw.coin); if (rw.bait) eco.streakBait = Math.min(1e6, (eco.streakBait || 0) + rw.bait);
          const r = { reward: rw, fid: plan.fid, cycle: plan.cycle, pos: plan.pos, reset: !!plan.reset };
          await t.set(ECO(uid), remember(eco, opId, r) && eco);
          return Object.assign({ ok: true }, r, { now, doc: eco.streak, bait: eco.streakBait }, view(eco, ent));
        });
      },
      // Dipakai writeSave/loadSave: nilai yang HARUS menimpa simpanan klien. null bila ekonomi belum aktif.
      async authoritative(uid) {
        const eco = await db.get(ECO(uid));
        return eco && eco.init ? { money: eco.bal, up: eco.up, homeLv: eco.homeLv, box: eco.box.map((b) => b.u) } : null;
      },
    };
    return api;
  }
  // Menimpa simpanan klien dengan nilai server (dipanggil writeSave & loadSave). Mengembalikan simpanan baru + daftar perubahan.
  function enforce(save, auth, rules) {
    if (!auth || !save || typeof save !== "object") return { save, changed: [] };
    const out = JSON.parse(JSON.stringify(save)), changed = [];
    if (out.money !== auth.money) { changed.push("money"); out.money = auth.money; }
    out.up = out.up && typeof out.up === "object" ? out.up : {};
    for (const k of Object.keys(auth.up)) if (out.up[k] !== auth.up[k]) { changed.push("up." + k); out.up[k] = auth.up[k]; }
    if (out.home && typeof out.home === "object" && out.home.level !== auth.homeLv) { changed.push("home.level"); out.home.level = auth.homeLv; }
    // Coolbox sengaja TIDAK dipangkas: ikan yang belum sempat dilaporkan ke server tidak boleh hilang. Ikan tanpa catatan server tidak bisa dijual (ecoSell).
    return { save: out, changed };
  }
  return { EcoError, REWARDS, LIM, PRICE_SCALE, priceMult, makeEconomyServer, enforce };
});
