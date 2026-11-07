// SALINAN OTOMATIS dari economy/core.js — jangan diedit di sini (node firebase/scripts/sync-economy.js).
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
    const PC = opts.pond || null;                                             // PondCore (economy/pond-core.js): Kolam Ikan Rumahku, opsional (tanpa ini ecoPond* menolak)
    const AU = opts.aurora || null;                                           // AuroraCore (economy/aurora-core.js): bonus peluang Gamepass Pancing Aurora, opsional (tanpa ini tidak ada bonus)
    const FC = opts.fashion || null;                                          // FashionCore (economy/fashion-core.js): katalog & harga avatar, opsional
    const SFX = opts.sf || null;                                              // SFCore (economy/sf-core.js): Samudra Follower, opsional & TERKUNCI sampai Owner menyetujui nilai di shop/config.sf
    const EV = opts.event || null;                                            // EventCore (event/core.js): Event 5 Monster Legenda, opsional
    const rng = opts.rng || (() => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } });
    // KEAMANAN MIGRASI: secara BAWAAN ecoInit TIDAK memakai angka dari browser sama sekali. Saldo/level/ikan lama diambil dari SNAPSHOT yang dibekukan
    // Owner di server (shop/legacy/{uid}, dibuat sekali oleh toko.js bekukan) — bukan dari permintaan klien. Hanya pengujian yang boleh opts.trustClientInit=true.
    const trustClient = opts.trustClientInit === true;
    const FISH = Object.fromEntries(T.FISH.map((f) => [f.id, f]));
    const ECO = (uid) => `shop/economy/${uid}`, ENT = (uid) => `shop/entitlements/${uid}`;
    const uidOf = (a) => { if (!a || typeof a.uid !== "string" || !a.uid) throw E("unauthenticated", "Masuk dulu."); return a.uid; };
    const needOp = (p) => { if (!p || typeof p.opId !== "string" || !OP_RE.test(p.opId)) throw E("invalid-argument", "opId tidak valid."); return p.opId; };
    const fresh = () => ({ v: 1, init: false, bal: 0, up: { rod: 0, bait: 0, cooler: 0, boat: 0 }, homeLv: 1, cat: {}, claimed: {}, box: [], catches: [], missions: { day: 0, total: 0, n: 0, ids: [] },
      ops: [], earned: 0, spent: 0, lastCatchAt: 0, streak: null, streakBait: 0, ev: {}, troph: {} });
    const topupOf = (ent) => (ent && ent.wallet && ent.wallet.NYATA) || 0;
    const view = (eco, ent) => ({ init: eco.init, own: eco.bal, topup: topupOf(ent), balance: eco.bal + topupOf(ent), up: eco.up, homeLv: eco.homeLv, cat: eco.cat,
      box: eco.box.map((b) => b.u), claimed: Object.keys(eco.claimed), troph: eco.troph || {},
      ...(AU ? { aur: { own: AU.ownsAny(ent), live: AU.owns(ent), n: (eco.aur && eco.aur.n) || 0, up: (eco.aur && eco.aur.up) || 0 } } : {}) });
    const doneOp = (eco, id) => { const o = eco.ops.find((x) => x.id === id); return o ? o.r : null; };
    const remember = (eco, id, r) => { eco.ops.push({ id, r }); if (eco.ops.length > LIM.ops) eco.ops.splice(0, eco.ops.length - LIM.ops); return r; };
    // ===== Statistik Podium Juara (leaderboardTop): dihitung SERVER di transaksi ecoCatch yang SAMA (tanpa tulis tambahan, tanpa baca baru).
    // Kolom tingkat-atas (agar bisa diurutkan Firestore tanpa indeks gabungan): lbc = total ikan, lbn = jumlah spesies berbeda, lbt = waktu naik terakhir, lbs = {idSpesies: jumlah}.
    // Tidak ikut `view` (tak terkirim ke klien), tidak direset saat ikan dijual, tidak menyentuh saldo/kotak/reward. Dokumen lama tanpa kolom ini mulai dari 0
    // (konservatif: tidak ada angka lama yang "diakui"). Ikan yang dilewati (sudah di kolam, hook `skipped`) tidak dihitung.
    const lbCount = (eco, items, skipped, now) => {
      const sp = eco.lbs && typeof eco.lbs === "object" ? eco.lbs : (eco.lbs = {}), skip = new Set(Array.isArray(skipped) ? skipped : []); let add = 0;
      for (const it of items) { if (SFX && SFX.isSF(it.id)) continue; if (it.uid && skip.has(it.uid)) continue; add++; sp[it.id] = (sp[it.id] || 0) + 1; }
      if (add) { eco.lbc = (eco.lbc || 0) + add; eco.lbn = Object.keys(sp).length; eco.lbt = now; }
    };
    const getEco = async (t, uid) => Object.assign(fresh(), (await t.get(ECO(uid))) || {});
    const needInit = (eco) => { if (!eco.init) throw E("failed-precondition", "Ekonomi belum diaktifkan untuk akun ini."); };
    const maxKg = (f) => f.xMax || f.wMax;
    // Harga jual ikan SF: harga/kg terkunci saat tangkap (b.sp, ditulis server), tanpa pengali harian. Entri tanpa sp valid → tidak bernilai (1 koin), bukan crash.
    const sfSale = (b) => (SFX && SFX.isSF(b.id) && Number.isFinite(b.sp) && b.sp > 0 ? FM.priceFor({ price: b.sp }, b.w, 1, PRICE_SCALE) : 1);

    // ---- Kolam Ikan (pond-core.js): data kolam dipegang server di dokumen ekonomi (eco.pond) ----
    const pondKnows = (eco, u) => !!(eco.pond && ((eco.pond.fish || []).some((f) => f.u === u) || (eco.pond.hist || []).some((f) => f.u === u)));
    const needPC = () => { if (!PC) throw E("unimplemented", "Kolam ikan belum diaktifkan di server."); return PC; };
    const pondOf = (eco) => { if (!eco.pond || !eco.pond.lv) eco.pond = PC.fresh(); return eco.pond; };
    const metaOk = (m) => ({ vr: typeof m.vr === "string" && /^[a-z0-9_]{1,24}$/.test(m.vr) ? m.vr : null, t: Number.isFinite(m.t) && m.t >= 0 && m.t < 1e15 ? Math.floor(m.t) : 0 });
    const uidList = (a, max) => { if (!Array.isArray(a) || !a.length || a.length > max || a.some((u) => typeof u !== "string" || !UID_RE.test(u)) || new Set(a).size !== a.length) throw E("invalid-argument", "Daftar ikan tidak valid."); return a; };

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
        const sfN = SFX ? items.filter((it) => it && SFX.isSF(it.id)).length : 0;
        if (SFX && sfN > SFX.HARD.perBatch) throw E("invalid-argument", "Ikan tidak dikenal.");
        const sfCfg = sfN ? ((await db.get("shop/config")) || {}) : null, sfR = {};   // config dibaca HANYA bila paket memuat ikan SF (tangkapan biasa: tanpa baca tambahan)
        for (const it of items) {
          let f = it && FISH[it.id];
          if (!f && sfN && SFX.isSF(it.id)) { const r = SFX.resolve(sfCfg, it.id); if (r.ok && SFX.weightOk(it.id, Number(it.w))) { f = r.fish; sfR[it.uid] = r; } }
          if (!f) throw E("invalid-argument", "Ikan tidak dikenal.");
          const w = Number(it.w);
          if (!f.sf && (!(w >= f.wMin * 0.5) || !(w <= maxKg(f)))) throw E("invalid-argument", "Berat ikan tidak masuk akal.");
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
          let reward = 0; const skipped = [], swaps = [], fin = [];
          const bonus = !!(AU && AU.owns(ent));                                           // bonus HANYA bila server melihat kepemilikan NYATA di entitlement (bukan klaim klien)
          for (const it of items) {
            let f = FISH[it.id] || sfR[it.uid].fish, w = Number(it.w);
            if (f.sf) {
              if (pondKnows(eco, it.uid)) { skipped.push(it.uid); fin.push(it); continue; }
              if (eco.box.some((b) => b.u === it.uid)) throw E("already-exists", "UID ikan sudah ada.");
              if (eco.box.length >= LIM.boxMax) throw E("resource-exhausted", "Kotak ikan penuh.");
              if (!SFX.takeDaily(eco.sf && typeof eco.sf === "object" ? eco.sf : (eco.sf = {}), f.id, sfR[it.uid].dayCap, now)) throw E("resource-exhausted", "Batas harian ikan spesial tercapai.");
              eco.box.push({ u: it.uid, id: f.id, w: Math.round(w * 100) / 100, sp: f.price }); fin.push(it);   // sp = harga/kg yang disetujui Owner saat tangkap (dikunci di sisi server)
              continue;
            }
            if (f.protected) { const r = Math.round(f.price * PRICE_SCALE * FM.effectiveKg(w) * 1.2); reward += r; credit(eco, r); fin.push(it); continue; }
            if (pondKnows(eco, it.uid)) { skipped.push(it.uid); fin.push(it); continue; }            // ikan yang sedang/pernah di kolam (mis. simpanan lama dipulihkan) tidak boleh masuk kotak lagi
            if (eco.box.some((b) => b.u === it.uid)) throw E("already-exists", "UID ikan sudah ada.");
            if (eco.box.length >= LIM.boxMax) throw E("resource-exhausted", "Kotak ikan penuh.");
            let fi = it;
            if (bonus && f.rarity === "biasa") {                                          // bonus Aurora: Biasa → Langka (lokasi sama), diundi SERVER; berat diundi ulang SERVER
              eco.aur = eco.aur || { n: 0, up: 0 }; eco.aur.n++;
              const to = AU.roll(f, rng);
              if (to && FISH[to]) { const nf = FISH[to], r = FM.rollWeight(nf, rng); swaps.push({ u: it.uid, from: f.id, id: to, w: r.w }); eco.aur.up++; f = nf; w = r.w; fi = { id: to, w, uid: it.uid }; }
            }
            fin.push(fi);
            eco.box.push({ u: it.uid, id: f.id, w: Math.round(w * 100) / 100 });
          }
          lbCount(eco, fin, typeof skipped === "undefined" ? null : skipped, now);   // Podium Juara: sekali per paket, di transaksi yang sama
          await t.set(ECO(uid), remember(eco, opId, { reward, skipped, swaps }) && eco);
          return Object.assign({ ok: true, reward, skipped, swaps }, view(eco, ent));
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
            if (want.has(b.u)) { total += FISH[b.id] ? FM.priceFor(FISH[b.id], b.w, priceMult(b.id, day), PRICE_SCALE) : sfSale(b); sold.push(b.u); } else keep.push(b);
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
      // ---- Kolam Ikan Rumahku. Waktu = jam SERVER; klien tidak pernah mengirim kenyang/waktu/harga/berat. Semua ikan masuk/keluar kolam atomik
      //      dengan kotak ikan server (satu transaksi), sehingga ikan tidak bisa ada di dua tempat atau dijual saat berada di kolam. ----
      // pondTx: pagar bersama (login, ekonomi aktif, opId idempoten, kematian diproses idempoten pada tiap operasi). fn mengembalikan {extra, rec, ent}.
      async ecoPondState(auth, p) {
        needPC(); const uid = uidOf(auth); p = p || {};
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco); const now = clock(), pd = pondOf(eco);
          const died = PC.sweep(pd, now); let dirty = died.length > 0;
          const seen = new Set(Array.isArray(p.seen) ? p.seen.filter((u) => typeof u === "string").slice(0, 60) : []), got = new Set(Array.isArray(p.got) ? p.got.filter((u) => typeof u === "string").slice(0, 60) : []);
          for (const h of pd.hist) if (!h.seen && seen.has(h.u)) { h.seen = true; dirty = true; }
          if (pd.limbo.some((f) => got.has(f.u))) { pd.limbo = pd.limbo.filter((f) => !got.has(f.u)); dirty = true; }
          if (dirty) await t.set(ECO(uid), eco);                       // hanya tulis bila berubah (hemat kuota tulis Firestore)
          return Object.assign({ ok: true, died: died.map((d) => d.u), pond: PC.viewOf(pd, now) }, view(eco, ent));
        });
      },
      async ecoPondPut(auth, p) {
        needPC(); const uid = uidOf(auth), opId = needOp(p); p = p || {};
        const items = Array.isArray(p.items) ? p.items : [];
        if (!items.length || items.length > 10) throw E("invalid-argument", "Pilih 1–10 ikan.");
        const us = uidList(items.map((x) => x && x.u), 10);
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco); const now = clock(), pd = pondOf(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, { pond: PC.viewOf(pd, now) }, view(eco, ent));
          PC.sweep(pd, now);
          if (pd.fish.length + us.length > PC.MAX_FISH) throw E("failed-precondition", "Kolam sudah terlalu padat (maks " + PC.MAX_FISH + " ekor).");
          let kg = PC.usedKg(pd);
          for (let i = 0; i < us.length; i++) {
            const b = eco.box.find((x) => x.u === us[i]);
            if (!b) throw E("failed-precondition", "Ikan tidak ada di kotak ikanmu (mungkin sudah dijual/dipindah).");
            if (!FISH[b.id]) throw E("failed-precondition", "Ikan spesial belum bisa dimasukkan ke kolam.");
            if (!PC.rarityOk(FISH[b.id])) throw E("failed-precondition", "Sampah tidak boleh dimasukkan ke kolam.");
            kg += b.w;
          }
          if (kg > PC.capOf(pd) + 1e-9) throw E("failed-precondition", "Kapasitas kolam tidak cukup (" + PC.capOf(pd) + " KG).");
          for (let i = 0; i < us.length; i++) {
            const k = eco.box.findIndex((x) => x.u === us[i]), b = eco.box[k], m = metaOk(items[i]);
            eco.box.splice(k, 1); pd.fish.push({ u: b.u, id: b.id, w: b.w, vr: m.vr, t: m.t, s0: 100, t0: now });
          }
          await t.set(ECO(uid), remember(eco, opId, { put: us }) && eco);
          return Object.assign({ ok: true, put: us, pond: PC.viewOf(pd, now) }, view(eco, ent));
        });
      },
      async ecoPondTake(auth, p) {
        needPC(); const uid = uidOf(auth), opId = needOp(p); p = p || {}; const us = uidList(p.uids, 10);
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco); const now = clock(), pd = pondOf(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, { pond: PC.viewOf(pd, now) }, view(eco, ent));
          PC.sweep(pd, now);
          const fish = us.map((u) => pd.fish.find((f) => f.u === u));
          if (fish.some((f) => !f)) { throw E("failed-precondition", "Ikan sudah tidak ada di kolam."); }
          if (eco.box.length + us.length > LIM.boxMax) throw E("resource-exhausted", "Kotak ikan penuh.");
          const out = fish.map((f) => ({ u: f.u, id: f.id, w: f.w, vr: f.vr || null, t: f.t || 0 }));
          pd.fish = pd.fish.filter((f) => !us.includes(f.u));
          for (const f of out) { eco.box.push({ u: f.u, id: f.id, w: f.w }); pd.limbo.push(f); }
          if (pd.limbo.length > PC.LIMBO_MAX) pd.limbo.splice(0, pd.limbo.length - PC.LIMBO_MAX);
          await t.set(ECO(uid), remember(eco, opId, { took: out }) && eco);
          return Object.assign({ ok: true, took: out, pond: PC.viewOf(pd, now) }, view(eco, ent));
        });
      },
      async ecoPondFeed(auth, p) {
        needPC(); const uid = uidOf(auth), opId = needOp(p); p = p || {};
        if (typeof p.kind !== "string" || !Object.prototype.hasOwnProperty.call(PC.FEED, p.kind)) throw E("invalid-argument", "Jenis pakan tidak dikenal.");
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco); const now = clock(), pd = pondOf(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, { pond: PC.viewOf(pd, now) }, view(eco, ent));
          const died = PC.sweep(pd, now);
          const fail = (m) => { throw E("failed-precondition", m); };      // transaksi dibatalkan; kematian diproses ulang idempoten (waktu mati tetap t0+s0×6j) pada operasi berikutnya
          if (!pd.fish.length) return fail("Kolam kosong, belum ada ikan yang diberi makan.");
          if ((pd.feed[p.kind] || 0) < 1) return fail("Stok " + PC.FEED[p.kind].name + " habis. Beli di Toko Kolam.");
          if (!PC.applyFeed(pd, p.kind, now)) return fail("Semua ikan sudah kenyang 100%. Pakan tidak terpakai.");
          pd.feed[p.kind]--;
          await t.set(ECO(uid), remember(eco, opId, { fed: p.kind }) && eco);
          return Object.assign({ ok: true, fed: p.kind, died: died.map((d) => d.u), pond: PC.viewOf(pd, now) }, view(eco, ent));
        });
      },
      async ecoPondBuy(auth, p) {
        needPC(); const uid = uidOf(auth), opId = needOp(p); p = p || {};
        const kind = p.item, isFeed = typeof kind === "string" && Object.prototype.hasOwnProperty.call(PC.FEED, kind), isGear = typeof kind === "string" && Object.prototype.hasOwnProperty.call(PC.GEAR, kind);
        const qty = Number(p.qty);
        if (!isFeed && !isGear) throw E("invalid-argument", "Barang tidak dikenal.");
        if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw E("invalid-argument", "Jumlah harus 1–99.");
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco); const now = clock(), pd = pondOf(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, { pond: PC.viewOf(pd, now) }, view(eco, ent));
          const died = PC.sweep(pd, now); let price;
          if (isFeed) { if ((pd.feed[kind] || 0) + qty > PC.STOCK_MAX) throw E("failed-precondition", "Stok terlalu banyak."); price = PC.FEED[kind].price * qty; }
          else { const G = PC.GEAR[kind]; if ((pd.gear[kind] || 0) + qty > G.max) throw E("failed-precondition", G.name + " maksimal " + G.max + "."); price = G.price * qty; }
          const paid = spendFrom(eco, ent, price);
          if (isFeed) pd.feed[kind] = (pd.feed[kind] || 0) + qty; else pd.gear[kind] = (pd.gear[kind] || 0) + qty;
          if (paid.top > 0) { ent.spends = ent.spends || []; ent.spends.push({ opId, amount: paid.top, reason: "eco:pond", at: clock() }); if (ent.spends.length > 100) ent.spends.splice(0, ent.spends.length - 100); await t.set(ENT(uid), ent); }
          await t.set(ECO(uid), remember(eco, opId, { price, item: kind, qty }) && eco);
          return Object.assign({ ok: true, price, item: kind, qty, died: died.map((d) => d.u), pond: PC.viewOf(pd, now) }, view(eco, ent));
        });
      },
      async ecoPondUpgrade(auth, p) {
        needPC(); const uid = uidOf(auth), opId = needOp(p); p = p || {};
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco); const now = clock(), pd = pondOf(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, { pond: PC.viewOf(pd, now) }, view(eco, ent));
          const died = PC.sweep(pd, now), next = pd.lv + 1;
          if (next > PC.MAX_LV) throw E("failed-precondition", "Kolam sudah level maksimum.");
          if (p.lv !== next) throw E("failed-precondition", "Level tujuan tidak sesuai (klik basi).");
          const price = PC.LEVELS[next].cost, paid = spendFrom(eco, ent, price); pd.lv = next;
          if (paid.top > 0) { ent.spends = ent.spends || []; ent.spends.push({ opId, amount: paid.top, reason: "eco:pondup", at: clock() }); if (ent.spends.length > 100) ent.spends.splice(0, ent.spends.length - 100); await t.set(ENT(uid), ent); }
          await t.set(ECO(uid), remember(eco, opId, { price, lv: next }) && eco);
          return Object.assign({ ok: true, price, died: died.map((d) => d.u), pond: PC.viewOf(pd, now) }, view(eco, ent));
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

    // ---------- EVENT 5 MONSTER LEGENDA (event/core.js) ----------
    // Dokumen global: shop/event/{eventId} = { id, monster, top:{uid,score,at,name} }. Hanya ditulis saat ada skor tertinggi baru (hemat kuota tulis).
    // Juara = skor terbaik dari duel SUKSES (dimainkan ulang server); seri → selesai paling awal → uid. Satu dokumen = satu juara global untuk semua room/sesi.
    // Saklar: shop/config.eventOn === true (Owner, toko.js event-buka). eventAnchor = tanggal Minggu untuk minggu ke-0 (PEMBUKAAN: Megalodon). eventPass !== false → akses event khusus (tiket) aktif.
    const needEV = () => { if (!EV) throw E("failed-precondition", "Event belum tersedia di server ini."); };
    const EVD = (id) => `shop/event/${id}`;
    const evSet = (cfg) => ({ on: !!(cfg && cfg.eventOn === true), pass: !(cfg && cfg.eventPass === false), anchor: cfg && typeof cfg.eventAnchor === "string" ? cfg.eventAnchor : EV.DEFAULT_ANCHOR });
    const evShape = (e) => e && { id: e.id, date: e.date, start: e.start, end: e.end, close: e.close, monster: e.monster, premiere: !!e.premiere };
    const evPrune = (eco) => { const ks = Object.keys(eco.ev).sort(); while (ks.length > 6) delete eco.ev[ks.shift()]; };
    const evTroph = (eco, mon, now) => (eco.troph[mon] = eco.troph[mon] || { seen: now, caught: 0, best: 0, champ: 0 });
    // Gambaran publik (boleh dipanggil tamu): jam server, jadwal, dan juara event terakhir yang SUDAH final (setelah masa tutup).
    async function evInfo(readCfg, readDoc) {
      const now = clock(), s = evSet(await readCfg());
      if (!s.on) return { now, on: false };
      const st = EV.status(now, s.anchor);
      const out = { now, on: true, pass: s.pass, anchor: s.anchor, phase: st.phase, ev: evShape(st.ev), next: evShape(st.next), winner: null };
      const fin = st.phase === "ended" ? st.ev : null;
      if (fin) { const d = await readDoc(fin.id); if (d && d.top) out.winner = { name: d.top.name, score: d.top.score, monster: fin.monster, date: fin.date, uid: d.top.uid }; }
      return out;
    }
    Object.assign(api, {
      async eventInfo() {
        needEV();
        const r = await evInfo(async () => (await db.get("shop/config")) || {}, (id) => db.get(EVD(id)));
        if (r.winner) delete r.winner.uid;                                  // publik: tanpa uid
        return r;
      },
      async ecoEventState(auth) {
        needEV(); const uid = uidOf(auth);
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid);
          const r = await evInfo(async () => (await t.get("shop/config")) || {}, (id) => t.get(EVD(id)));
          const rec = r.ev && eco.ev[r.ev.id] || null;
          r.my = rec ? { att: rec.att || 0, left: Math.max(0, EV.MAX_ATTEMPTS - (rec.att || 0)), best: rec.best || 0, part: !!rec.part, got: !!rec.got, claimed: !!rec.claimed, act: !!(rec.act && clock() < rec.act.exp) } : { att: 0, left: EV.MAX_ATTEMPTS, best: 0 };
          if (r.winner) { r.my.win = r.winner.uid === uid; r.my.claimed = !!(eco.ev[r.ev.id] && eco.ev[r.ev.id].claimed); delete r.winner.uid; }
          return Object.assign(r, { eco: view(eco, ent) });
        });
      },
      // Mulai duel: server memilih seed acak (klien tidak bisa memilih pola). Duel sebelumnya yang belum selesai dianggap hangus (tetap menghabiskan satu kesempatan).
      async ecoEventStart(auth, p) {
        needEV(); const uid = uidOf(auth), opId = needOp(p); p = p || {};
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, { eco: view(eco, ent) });
          const s = evSet((await t.get("shop/config")) || {}); if (!s.on) throw E("failed-precondition", "Event belum dibuka.");
          const now = clock(), st = EV.status(now, s.anchor);
          if (st.phase !== "live" || st.ev.id !== p.eventId) throw E("failed-precondition", "Event sedang tidak berlangsung.");
          const rec = eco.ev[st.ev.id] = eco.ev[st.ev.id] || { att: 0 };
          if (rec.att >= EV.MAX_ATTEMPTS) throw E("resource-exhausted", "Kesempatanmu di event ini sudah habis.");
          const seed = Math.floor(rng() * 4294967296) >>> 0;
          rec.att++; rec.act = { seed, at: now, exp: now + EV.MAX_STEPS * EV.DT * 1000 + 30000, n: rec.att };
          evTroph(eco, st.ev.monster, now); evPrune(eco);
          const r = { duel: { seed, n: rec.att, left: EV.MAX_ATTEMPTS - rec.att, monster: st.ev.monster, eventId: st.ev.id }, now };
          await t.set(ECO(uid), remember(eco, opId, r) && eco);
          return Object.assign({ ok: true }, r, { eco: view(eco, ent) });
        });
      },
      // Selesai duel: klien mengirim LOG tombol. Server memainkan ulang dengan seed miliknya, menilai, memberi hadiah partisipasi/tangkapan (sekali per event),
      // dan memperbarui skor tertinggi global. Klien tidak pernah mengirim hasil, skor, atau jumlah koin.
      async ecoEventFinish(auth, p) {
        needEV(); const uid = uidOf(auth), opId = needOp(p); p = p || {};
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, { eco: view(eco, ent) });
          const s = evSet((await t.get("shop/config")) || {}); if (!s.on) throw E("failed-precondition", "Event belum dibuka.");
          const now = clock(), st = EV.status(now, s.anchor);
          if (!(st.phase === "live" || st.phase === "closing") || st.ev.id !== p.eventId) throw E("failed-precondition", "Event sudah ditutup.");
          const rec = eco.ev[st.ev.id], act = rec && rec.act;
          if (!act) throw E("failed-precondition", "Tidak ada duel yang sedang berjalan.");
          if (now > act.exp) { delete rec.act; await t.set(ECO(uid), remember(eco, opId, { result: "hangus", score: 0 }) && eco); return Object.assign({ ok: true, result: "hangus", score: 0 }, { eco: view(eco, ent) }); }
          const sim = EV.simulate(st.ev.monster, act.seed, p.log);
          if (!sim.valid) throw E("invalid-argument", "Catatan duel tidak valid.");
          if (now - act.at < sim.ms - 2500) throw E("failed-precondition", "Duel selesai lebih cepat dari waktu sebenarnya.");   // tidak bisa menyetor hasil sebelum duelnya mungkin selesai
          delete rec.act; rec.fin = (rec.fin || 0) + 1;
          const R = EV.rewardsOf(st.ev.monster), paid = { part: 0, catch: 0 }, tr = evTroph(eco, st.ev.monster, now);
          if (!rec.part) { rec.part = true; paid.part = R.part; credit(eco, R.part); }
          let top = null;
          if (sim.caught) {
            if (!rec.got) { rec.got = true; paid.catch = R.catch; credit(eco, R.catch); tr.caught++; }
            if (sim.score > (rec.best || 0)) rec.best = sim.score;
            tr.best = Math.max(tr.best || 0, sim.score);
            const d = (await t.get(EVD(st.ev.id))) || { id: st.ev.id, monster: st.ev.monster }, cand = { uid, score: sim.score, at: now, name: EV.sanitizeName(p.name) };
            if (EV.better(cand, d.top)) { d.top = cand; await t.set(EVD(st.ev.id), d); }
            top = d.top && d.top.uid === uid && d.top.score === sim.score;
          }
          const r = { result: sim.result, score: sim.score, steps: sim.steps, caught: sim.caught, paid, leading: !!top };
          await t.set(ECO(uid), remember(eco, opId, r) && eco);
          return Object.assign({ ok: true }, r, { eco: view(eco, ent) });
        });
      },
      // Hadiah juara: hanya untuk uid yang tercatat sebagai juara di dokumen global, setelah masa tutup, sekali per event.
      async ecoEventClaim(auth, p) {
        needEV(); const uid = uidOf(auth), opId = needOp(p); p = p || {};
        return db.tx(async (t) => {
          const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
          const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, { eco: view(eco, ent) });
          const s = evSet((await t.get("shop/config")) || {}), ev = EV.eventById(p.eventId, s.anchor);
          if (!ev) throw E("invalid-argument", "Event tidak dikenal.");
          const now = clock(); if (now < ev.close) throw E("failed-precondition", "Hasil event belum diumumkan.");
          const d = await t.get(EVD(ev.id));
          if (!d || !d.top || d.top.uid !== uid) return Object.assign({ ok: true, winner: false, amount: 0 }, { eco: view(eco, ent) });
          const rec = eco.ev[ev.id] = eco.ev[ev.id] || { att: 0 };
          if (rec.claimed) return Object.assign({ ok: true, winner: true, already: true, amount: 0 }, { eco: view(eco, ent) });
          const amt = EV.rewardsOf(ev.monster).win; rec.claimed = true; credit(eco, amt); evTroph(eco, ev.monster, now).champ++;
          const r = { winner: true, amount: amt, monster: ev.monster, score: d.top.score };
          await t.set(ECO(uid), remember(eco, opId, r) && eco);
          return Object.assign({ ok: true }, r, { eco: view(eco, ent) });
        });
      },
    });
    // ===== AVATAR & FASHION (kosmetik murni). Katalog/harga dari FC (server); klien hanya kirim ID item. Kepemilikan terikat UID (eco.fash.own). =====
    if (FC) {
      const fashOf = (eco) => { const f = eco.fash = eco.fash || { own: {}, code: FC.DEFAULT_CODE, hist: [] }; return f; };
      const fview = (eco, ent) => { const f = fashOf(eco); return Object.assign(view(eco, ent), { fashion: { own: Object.keys(f.own), code: f.code, hist: f.hist.slice(-10) } }); };
      Object.assign(api, {
        async ecoFashionState(auth) {
          const uid = uidOf(auth);
          return db.tx(async (t) => { const eco = await getEco(t, uid), ent = await entOf(t, uid); return Object.assign({ ok: true }, fview(eco, ent)); });
        },
        // Beli 1 item. Harga dari katalog server; idempoten (opId); tidak bisa beli dua kali; saldo tunggal (spendFrom).
        async ecoFashionBuy(auth, p) {
          const uid = uidOf(auth), opId = needOp(p); p = p || {};
          const it = typeof p.id === "string" && Object.prototype.hasOwnProperty.call(FC.BY_ID, p.id) ? FC.BY_ID[p.id] : null;
          if (!it) throw E("invalid-argument", "Item tidak dikenal.");
          return db.tx(async (t) => {
            const eco = await getEco(t, uid), ent = await entOf(t, uid); needInit(eco);
            const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, fview(eco, ent));
            const f = fashOf(eco);
            if (it.price <= 0 || f.own[it.id]) throw E("failed-precondition", "Item ini sudah kamu miliki.");
            const paid = spendFrom(eco, ent, it.price); f.own[it.id] = clock();
            f.hist.push({ id: it.id, price: it.price, at: clock() }); if (f.hist.length > FC.HIST_MAX) f.hist.splice(0, f.hist.length - FC.HIST_MAX);
            if (paid.top > 0) { ent.spends = ent.spends || []; ent.spends.push({ opId, amount: paid.top, reason: "fashion:" + it.id, at: clock() }); if (ent.spends.length > 100) ent.spends.splice(0, ent.spends.length - 100); await t.set(ENT(uid), ent); }
            await t.set(ECO(uid), remember(eco, opId, { bought: it.id, price: it.price }) && eco);
            return Object.assign({ ok: true, bought: it.id, price: it.price }, fview(eco, ent));
          });
        },
        // Simpan penampilan: hanya item gratis atau yang dimiliki UID ini. Tidak memerlukan saldo.
        async ecoFashionSave(auth, p) {
          const uid = uidOf(auth), opId = needOp(p); p = p || {};
          return db.tx(async (t) => {
            const eco = await getEco(t, uid), ent = await entOf(t, uid);
            const prev = doneOp(eco, opId); if (prev) return Object.assign({ duplicate: true }, prev, fview(eco, ent));
            const f = fashOf(eco), v = FC.validate(p.code, new Set(Object.keys(f.own)));
            if (!v.ok) throw E("failed-precondition", v.why);
            f.code = v.code;
            await t.set(ECO(uid), remember(eco, opId, { saved: true }) && eco);
            return Object.assign({ ok: true, saved: true }, fview(eco, ent));
          });
        },
      });
    }
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
