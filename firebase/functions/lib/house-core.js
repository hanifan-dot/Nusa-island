// SALINAN OTOMATIS dari house/core.js — jangan diedit di sini (node firebase/scripts/sync-economy.js).
// NUSA ISLAND — KUNJUNGI RUMAH TEMAN: inti server (logika murni; UMD). Dipakai Worker nusa-api, Functions, game (uji) — kode yang SAMA.
// ---------------------------------------------------------------------------------------------------------------------
// Prinsip keamanan:
//  • Identitas = auth.uid dari token Google yang diverifikasi server. Klien TIDAK PERNAH mengirim ownerId/houseId/uid: yang dikirim hanya ID PUBLIK pendek (pid)
//    rumah yang ingin dilihat; pid hanyalah hash satu arah dari uid dan TIDAK bisa dipakai menulis apa pun.
//  • Rumah yang dilihat pengunjung = salinan publik (homepub/{pid}) yang dibuat SERVER dari Cloud Save pemilik saat pemilik menyimpan (level dari ekonomi server).
//    Tidak ada jalur tulis untuk pengunjung: setiap fungsi menulis hanya ke dokumen milik uid pemanggil (pid dihitung dari token, bukan dari kiriman).
//  • Yang dibagikan: nama panggilan, level rumah, tata ruang (perabot, dekorasi, ikan di akuarium), id ikan legenda. TIDAK ada email, uid, saldo, pembayaran.
//  • Privasi: publik / privat (+ daftar izin) dan daftar keluar (kick) sementara. Semua diperiksa di server setiap kali masuk (homeVisit & homeAccess).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaHouseCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const LIM = { NAME_MAX: 14, SEARCH_MIN: 2, SEARCH_MAX: 8, ALLOW_MAX: 12, BAN_MAX: 20, BAN_MS: 60 * 60000, BUCKET_MAX: 3000, FURN_MAX: 60, FISH_MAX: 24, LEG_MAX: 200, COORD_MAX: 40 };
  const PID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";             // 31 huruf/angka tanpa yang mirip (I, L, O, 0, 1)
  const PID_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
  const TYPE_RE = /^[A-Za-z0-9_]{1,24}$/;
  const SALT = "nusa-rumah-v1";

  class HouseError extends Error { constructor(code, message) { super(message); this.name = "HouseError"; this.code = code; } }
  const fail = (code, msg) => { throw new HouseError(code, msg); };
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const num = (x) => typeof x === "number" && Number.isFinite(x);

  // ---- identitas publik ----
  function fnv(str, seed) { let h = seed >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; return h >>> 0; }
  function pidOf(uid) {                                            // 8 karakter, satu arah; tidak memuat uid
    const s = SALT + ":" + String(uid), a = fnv(s, 2166136261), b = fnv(s.split("").reverse().join(""), 3266489917);
    let n = a * 256 + (b & 255), out = "";
    for (let i = 0; i < 8; i++) { out = PID_ALPHABET[n % 31] + out; n = Math.floor(n / 31); }
    return out;
  }
  const shortId = (pid) => "#" + String(pid).slice(0, 5);          // penanda pembeda yang tampil di daftar

  // ---- nama ----
  function cleanName(v) {
    let s = String(v == null ? "" : v).normalize("NFKC").replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim();
    s = Array.from(s).slice(0, LIM.NAME_MAX).join("").trim();
    return s || "Pemancing";
  }
  const normName = (v) => cleanName(v).toLowerCase();
  // kueri pencarian: dibersihkan sama seperti nama, tetapi TANPA nama bawaan (kueri kosong tetap kosong)
  const normQuery = (v) => String(v == null ? "" : v).normalize("NFKC").replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, LIM.NAME_MAX);
  function bucketOf(lname) {
    const c = String(lname).replace(/\s+/g, "").slice(0, 2), ch = (x) => (/[a-z0-9]/.test(x) ? x : "_");
    return ch(c[0] || "_") + ch(c[1] || "_");
  }

  // ---- salinan publik rumah (dibuat dari Cloud Save; hanya data yang aman & berukuran kecil) ----
  const clampN = (v, a, b, d) => (num(v) ? Math.max(a, Math.min(b, Math.round(v * 100) / 100)) : d);
  function snapshotOf(save) {
    const s = isObj(save) ? save : {}, h = isObj(s.home) ? s.home : null;
    if (!h) return null;
    const level = Math.max(1, Math.min(12, Math.floor(num(h.level) ? h.level : 1)));
    const furn = (Array.isArray(h.furniture) ? h.furniture : []).filter((f) => isObj(f) && typeof f.type === "string" && TYPE_RE.test(f.type) && num(f.x) && num(f.y)).slice(0, LIM.FURN_MAX)
      .map((f) => { const o = { uid: String(f.uid || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32), type: f.type, x: clampN(f.x, 0, LIM.COORD_MAX, 0), y: clampN(f.y, 0, LIM.COORD_MAX, 0), rot: f.rot ? 1 : 0 }; if (typeof f.water === "string" && TYPE_RE.test(f.water)) o.water = f.water; return o; });
    const aqs = new Set(furn.map((f) => f.uid));
    const fish = (Array.isArray(h.placedFish) ? h.placedFish : []).filter((p) => isObj(p) && typeof p.id === "string" && TYPE_RE.test(p.id) && aqs.has(String(p.aq))).slice(0, LIM.FISH_MAX)
      .map((p) => ({ id: p.id, w: clampN(p.w, 0, 100000, 1), aq: String(p.aq).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32), uid: String(p.uid || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) }));
    const deco = (Array.isArray(h.decorations) ? h.decorations : []).filter((d) => typeof d === "string" && TYPE_RE.test(d)).slice(0, 12);
    const leg = isObj(s.dex) ? Object.keys(s.dex).filter((id) => TYPE_RE.test(id) && s.dex[id] && s.dex[id].n > 0).slice(0, LIM.LEG_MAX) : [];
    return { level, furn, fish, deco, leg: leg, name: cleanName(s.profile && s.profile.name) };
  }
  const hashText = (t) => fnv(String(t), 2166136261).toString(16) + fnv(String(t), 974711).toString(16);

  function makeHouseServer(db, opts) {
    opts = opts || {};
    const clock = opts.clock || Date.now;
    const hits = new Map();
    const rate = (uid, key, max) => { const t = clock(), k = key + ":" + uid, w = (hits.get(k) || []).filter((x) => t - x < 60000); w.push(t); hits.set(k, w); if (hits.size > 4000) hits.clear(); if (w.length > max) fail("resource-exhausted", "Terlalu cepat. Coba lagi sebentar."); };
    const uidOf = (auth) => { if (!auth || typeof auth.uid !== "string" || !auth.uid) fail("unauthenticated", "Masuk dulu dengan akun Google."); return auth.uid; };
    const HP = (pid) => `homepub/${pid}`, HI = (b) => `homeidx/${b}`;
    const pidArg = (p) => { const v = String((p && p.pid) || "").toUpperCase().replace(/^#/, ""); if (!PID_RE.test(v)) fail("invalid-argument", "ID rumah tidak valid."); return v; };
    const privFlag = (d) => (d.privacy === "private" ? 1 : 0);

    // ---- indeks nama (satu dokumen per 2 huruf pertama; pencarian = 1 baca) ----
    async function indexPut(t, pid, name, level, priv, oldLname) {
      const nb = bucketOf(normName(name)), ob = oldLname ? bucketOf(oldLname) : nb;
      if (ob !== nb) { const o = await t.get(HI(ob)); if (o && o.e && o.e[pid]) { delete o.e[pid]; await t.set(HI(ob), o); } }
      const d = (await t.get(HI(nb))) || { v: 1, e: {} };
      if (!d.e[pid] && Object.keys(d.e).length >= LIM.BUCKET_MAX) return;       // penuh: tidak tercantum di pencarian (aman, hanya kuota)
      d.e[pid] = [name, level, priv]; await t.set(HI(nb), d);
    }

    // Dipanggil Cloud Save DI DALAM transaksi tulis simpanan pemilik. prevHash = pubHash yang tersimpan di simpanan sebelumnya → tanpa baca tambahan bila rumah tak berubah.
    async function publish(t, uid, save, prevHash) {
      const snap = snapshotOf(save); if (!snap) return prevHash || null;
      const h = hashText(JSON.stringify(snap)); if (h === prevHash) return h;
      const pid = pidOf(uid), cur = await t.get(HP(pid));
      if (cur && cur.uid && cur.uid !== uid) return prevHash || null;           // tabrakan pid (hampir mustahil): jangan menimpa milik orang lain
      const doc = Object.assign({ v: 1, pid, uid, privacy: "public", allow: [], bans: {} }, cur || {}, { uid, pid, name: snap.name, lname: normName(snap.name), level: snap.level, snap, updatedAt: clock() });
      await t.set(HP(pid), doc);
      await indexPut(t, pid, snap.name, snap.level, privFlag(doc), cur && cur.lname);
      return h;
    }

    // Aturan masuk — dipakai homeVisit (lihat salinan) dan homeAccess (pintu multiplayer). Mengembalikan null bila boleh, atau pesan penolakan.
    function denial(doc, myPid) {
      const now = clock();
      if (!doc) return "Pemain tidak ditemukan";
      if (doc.bans && doc.bans[myPid] > now) return "Kamu dikeluarkan dari rumah ini untuk sementara.";
      if (doc.privacy === "private" && !(Array.isArray(doc.allow) && doc.allow.some((a) => a && a.pid === myPid))) return "Rumah ini privat. Hanya tamu yang diizinkan pemilik yang bisa masuk.";
      return null;
    }

    const api = {
      // Cari pemain terdaftar menurut awalan nama. Hasil: nama, level rumah, ID pembeda pendek, status privat. TANPA uid/email.
      async homeSearch(auth, p) {
        const uid = uidOf(auth); rate(uid, "s", 30);
        const q = normQuery(p && p.q); if (Array.from(q).length < LIM.SEARCH_MIN) fail("invalid-argument", "Ketik minimal 2 huruf.");
        const me = pidOf(uid), d = await db.get(HI(bucketOf(q)));
        const out = [];
        if (d && d.e) for (const [pid, v] of Object.entries(d.e)) {
          if (pid === me || !Array.isArray(v)) continue;
          if (normName(v[0]).startsWith(q)) out.push({ pid, sid: shortId(pid), name: String(v[0]), level: v[1] | 0, priv: v[2] ? 1 : 0, exact: normName(v[0]) === q ? 1 : 0 });
        }
        out.sort((a, b) => b.exact - a.exact || b.level - a.level || a.name.localeCompare(b.name) || (a.pid < b.pid ? -1 : 1));
        return { results: out.slice(0, LIM.SEARCH_MAX) };
      },
      // Ambil rumah asli milik pid untuk DILIHAT. Diperiksa penuh di server; tidak menulis apa pun.
      async homeVisit(auth, p) {
        const uid = uidOf(auth); rate(uid, "v", 20);
        const pid = pidArg(p), me = pidOf(uid);
        if (pid === me) fail("failed-precondition", "Itu rumahmu sendiri.");
        const doc = await db.get(HP(pid)), why = denial(doc && doc.snap ? doc : null, me);
        if (why) fail(why === "Pemain tidak ditemukan" ? "not-found" : "permission-denied", why);
        return { ok: true, owner: { pid, sid: shortId(pid), name: doc.name, level: doc.level }, home: doc.snap, room: "rumah-" + pid };
      },
      // Pintu multiplayer: siapa boleh masuk ruang "rumah-<pid>" dan sebagai apa. Pemilik = pid dari token-nya sendiri (tanpa baca dokumen).
      async homeAccess(auth, p) {
        const uid = uidOf(auth); rate(uid, "a", 40);
        const pid = pidArg(p), me = pidOf(uid);
        if (pid === me) return { ok: true, role: "owner", pid, me, room: "rumah-" + pid };
        const doc = await db.get(HP(pid)), why = denial(doc && doc.snap ? doc : null, me);
        if (why) fail(why === "Pemain tidak ditemukan" ? "not-found" : "permission-denied", why);
        return { ok: true, role: "visitor", pid, me, room: "rumah-" + pid, owner: doc.name };
      },
      // Pengaturan milik pemanggil sendiri (privasi, daftar izin).
      async homeSettings(auth) {
        const uid = uidOf(auth), pid = pidOf(uid), d = await db.get(HP(pid)), now = clock();
        return { pid, sid: shortId(pid), registered: !!(d && d.snap), privacy: (d && d.privacy) || "public", allow: ((d && d.allow) || []).map((a) => ({ pid: a.pid, sid: shortId(a.pid), name: a.name })),
          banned: Object.entries((d && d.bans) || {}).filter(([, t]) => t > now).length };
      },
      async homeSetPrivacy(auth, p) {
        const uid = uidOf(auth); rate(uid, "w", 20);
        const mode = p && p.mode; if (mode !== "public" && mode !== "private") fail("invalid-argument", "Pilih publik atau privat.");
        const pid = pidOf(uid);
        return db.tx(async (t) => {
          const cur = (await t.get(HP(pid))) || { v: 1, pid, uid, privacy: "public", allow: [], bans: {}, snap: null };
          if (cur.uid && cur.uid !== uid) fail("permission-denied", "Ditolak.");
          cur.privacy = mode; cur.uid = uid; await t.set(HP(pid), cur);
          if (cur.snap) await indexPut(t, pid, cur.name, cur.level, mode === "private" ? 1 : 0, cur.lname);
          return { ok: true, privacy: mode };
        });
      },
      // Izinkan / cabut izin satu pemain terdaftar (menurut pid hasil pencarian) untuk rumah privat.
      async homeAllow(auth, p) {
        const uid = uidOf(auth); rate(uid, "w", 20);
        const target = pidArg(p), me = pidOf(uid), on = !(p && p.on === false);
        if (target === me) fail("invalid-argument", "Itu dirimu sendiri.");
        return db.tx(async (t) => {
          const cur = await t.get(HP(me)), tg = await t.get(HP(target));
          if (!cur || cur.uid !== uid) fail("failed-precondition", "Simpan game dulu sampai tersinkron (tanda ☁️), lalu coba lagi.");
          if (on && !(tg && tg.snap)) fail("not-found", "Pemain tidak ditemukan");
          cur.allow = (cur.allow || []).filter((a) => a.pid !== target);
          if (on) { if (cur.allow.length >= LIM.ALLOW_MAX) fail("resource-exhausted", `Daftar izin penuh (maks ${LIM.ALLOW_MAX}).`); cur.allow.push({ pid: target, name: tg.name }); }
          await t.set(HP(me), cur);
          return { ok: true, allow: cur.allow.map((a) => ({ pid: a.pid, sid: shortId(a.pid), name: a.name })) };
        });
      },
      // Keluarkan pengunjung (sementara). Hanya menulis dokumen milik pemanggil; pid pengunjung = ID publik dari daftar ruang.
      async homeKick(auth, p) {
        const uid = uidOf(auth); rate(uid, "w", 40);
        const target = pidArg(p), me = pidOf(uid);
        if (target === me) fail("invalid-argument", "Itu dirimu sendiri.");
        return db.tx(async (t) => {
          const cur = (await t.get(HP(me))) || { v: 1, pid: me, uid, privacy: "public", allow: [], bans: {}, snap: null }, now = clock();
          if (cur.uid && cur.uid !== uid) fail("permission-denied", "Ditolak.");
          cur.uid = uid; cur.bans = cur.bans || {};
          for (const k of Object.keys(cur.bans)) if (cur.bans[k] <= now) delete cur.bans[k];
          const keys = Object.keys(cur.bans); if (keys.length >= LIM.BAN_MAX && !cur.bans[target]) delete cur.bans[keys.sort((a, b) => cur.bans[a] - cur.bans[b])[0]];
          cur.bans[target] = now + LIM.BAN_MS; cur.allow = (cur.allow || []).filter((a) => a.pid !== target);
          await t.set(HP(me), cur);
          return { ok: true, until: cur.bans[target] };
        });
      },
    };
    return Object.assign(api, { publish });
  }

  return { LIM, PID_RE, HouseError, pidOf, shortId, cleanName, normName, normQuery, bucketOf, snapshotOf, hashText, makeHouseServer };
});
