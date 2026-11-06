// NUSA ISLAND — NAMA PEMAIN PERMANEN: inti aturan + server (logika murni; UMD). Kode yang SAMA dipakai game (uji), Worker nusa-api, dan Functions.
// ---------------------------------------------------------------------------------------------------------------------
// Prinsip:
//  • Identitas = auth.uid dari token yang diverifikasi server. Klien TIDAK PERNAH mengirim uid. Satu akun = satu username, ditetapkan SATU kali.
//  • Keunikan global tanpa beda huruf besar/kecil: dokumen `usernames/<huruf-kecil>` {uid,name}. Klaim memakai transaksi atomik
//    (baca dokumen nama + dokumen profil akun → tulis keduanya), jadi dua orang yang berebut nama yang sama tidak mungkin sama-sama berhasil.
//  • Tidak ada fungsi ganti/hapus nama untuk pemain. (Pengubahan oleh Owner = lewat dashboard, di luar inti ini.)
//  • Tidak meminta nama asli atau data pribadi. Dokumen hanya memuat uid, nama, waktu.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaNameCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const LIM = { MIN: 3, MAX: 16, CHECK_PER_MIN: 30, CLAIM_PER_MIN: 8, SUGGEST: 3 };
  const RE = /^[A-Za-z0-9_]+$/;
  const NAME_COL = "usernames", PROFILE_PATH = (uid) => `users/${uid}/profile/username`;

  class NameError extends Error { constructor(code, message) { super(message); this.name = "NameError"; this.code = code; } }
  const fail = (code, msg) => { throw new NameError(code, msg); };

  // ---- penyamaran huruf (leet) agar "4dm1n" / "0wner" tidak lolos ----
  const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", "$": "s" };
  const skeleton = (lower) => lower.replace(/[01345789@$]/g, (c) => LEET[c]).replace(/[^a-z]/g, "");           // hanya huruf, tanpa garis bawah/angka tersisa
  const collapse = (s) => s.replace(/(.)\1+/g, "$1");                                                       // aaanjing → anjing

  // Nama staf / sistem / resmi: diblokir jika MENGANDUNG kata ini (setelah disamarkan) — mencegah "Admin_Nusa", "0wner28", "SystemBot".
  const STAFF_SUB = ["admin", "owner", "system", "sistem", "moderator", "staff", "nusaisland", "official", "resmi", "pengelola", "customerservice", "helpdesk", "gamemaster", "superuser", "nusateam", "nusastaff", "nusaowner", "nusaadmin"];
  // Nama yang hanya diblokir bila PERSIS sama (kata pendek rawan salah blokir).
  const STAFF_EXACT = ["mod", "gm", "dev", "cs", "root", "nusa", "server", "support", "bot", "null", "undefined", "anonymous", "anonim", "guest", "tamu", "pemancing", "nelayan", "player", "pemain", "everyone", "here"];
  // Subset yang juga dilarang sebagai bagian terpisah garis bawah (mod_budi, GM_Sari); kata umum seperti "player" boleh dipakai di tengah nama.
  const STAFF_PART = ["mod", "gm", "cs", "root", "support", "staff"];
  // Kata tidak pantas (Indonesia + Inggris). Bagian "SUB" dicocokkan sebagai potongan (kata ≥5 huruf), "EXACT" hanya bila persis.
  const BAD_SUB = ["anjing", "anjink", "bangsat", "bajingan", "brengsek", "kontol", "memek", "ngentot", "jancok", "jancuk", "pepek", "goblok", "keparat", "kampret", "bangke", "pelacur", "lonte", "jablay", "perek", "ngewe", "colmek", "coli", "bokep", "sange", "toket", "puki", "pukimak", "kimak", "monyet", "cibai", "fuck", "shit", "bitch", "asshole", "bastard", "whore", "slut", "nigg", "faggot", "porn", "rapist", "dildo", "penis", "vagina", "nazi", "hitler", "kafir", "cabul", "tolol", "idiot", "bego", "sinting"];
  const BAD_EXACT = ["asu", "tai", "cuk", "bgst", "jnck", "ajg", "anj", "sex", "xxx", "dick", "cock", "ass", "pussy", "tits", "cunt", "kntl", "mmk", "bacot", "babi"];
  const prep = (arr) => arr.map((w) => collapse(w));
  const STAFF_SUBc = prep(STAFF_SUB), STAFF_EXACTc = new Set(prep(STAFF_EXACT)), STAFF_PARTc = new Set(prep(STAFF_PART)), BAD_SUBc = prep(BAD_SUB), BAD_EXACTc = new Set(prep(BAD_EXACT));

  function validate(input) {
    const name = typeof input === "string" ? input : "";
    if (!name) return { ok: false, code: "empty", message: "Isi nama pemain dulu." };
    if (/\s/.test(name)) return { ok: false, code: "space", message: "Nama tidak boleh memakai spasi. Pakai garis bawah (_) kalau perlu." };
    const len = Array.from(name).length;
    if (len < LIM.MIN) return { ok: false, code: "short", message: `Nama terlalu pendek. Minimal ${LIM.MIN} karakter.` };
    if (len > LIM.MAX) return { ok: false, code: "long", message: `Nama terlalu panjang. Maksimal ${LIM.MAX} karakter.` };
    if (!RE.test(name)) return { ok: false, code: "chars", message: "Nama hanya boleh huruf A–Z, angka 0–9, dan garis bawah (_)." };
    if (!/[A-Za-z]/.test(name)) return { ok: false, code: "noletter", message: "Nama harus memuat minimal satu huruf." };
    const lower = name.toLowerCase(), sk = collapse(skeleton(lower)), skNoCollapse = skeleton(lower);
    const parts = lower.split("_").map((p) => collapse(skeleton(p))).filter(Boolean);                       // tiap bagian di antara "_" diperiksa juga (token pendek)
    if (STAFF_EXACTc.has(sk) || parts.some((p) => STAFF_PARTc.has(p)) || STAFF_SUBc.some((w) => sk.includes(w))) return { ok: false, code: "reserved", message: "Nama ini dicadangkan untuk sistem/staf Nusa Island. Pilih nama lain." };
    if (BAD_EXACTc.has(sk) || parts.some((p) => BAD_EXACTc.has(p)) || BAD_SUBc.some((w) => sk.includes(w) || collapse(skNoCollapse).includes(w))) return { ok: false, code: "bad", message: "Nama ini tidak pantas. Pilih nama yang sopan." };
    return { ok: true, name, lower };
  }

  const TAKEN_MSG = "❌ Nama sudah dipakai! Coba tambahkan nomor atau cari ide nama baru.";

  function makeNameServer(db, opts) {
    opts = opts || {};
    const clock = opts.clock || Date.now, rand = opts.rand || Math.random;
    const hits = new Map();
    const rate = (uid, key, max) => { const t = clock(), k = key + ":" + uid, w = (hits.get(k) || []).filter((x) => t - x < 60000); w.push(t); hits.set(k, w); if (hits.size > 4000) hits.clear(); if (w.length > max) fail("resource-exhausted", "Terlalu sering. Coba lagi sebentar."); };
    const uidOf = (auth) => { if (!auth || typeof auth.uid !== "string" || !auth.uid) fail("unauthenticated", "Masuk dulu dengan akun Google."); return auth.uid; };
    const nameDoc = (lower) => `${NAME_COL}/${lower}`;
    const getMine = async (uid) => { const d = await db.get(PROFILE_PATH(uid)); return d && typeof d.name === "string" ? d : null; };

    // Saran: nama + angka (contoh Hanifan → Hanifan28). Hanya DITAWARKAN; pemain yang memilih.
    async function suggest(name) {
      const out = [], tried = new Set(), tail = [() => String(10 + Math.floor(rand() * 90)), () => String(100 + Math.floor(rand() * 900)), () => "_" + String(1 + Math.floor(rand() * 99)), () => String(1000 + Math.floor(rand() * 9000))];
      for (let i = 0; i < 12 && out.length < LIM.SUGGEST; i++) {
        const t = tail[i % tail.length](), base = Array.from(name).slice(0, Math.max(1, LIM.MAX - t.length)).join(""), cand = base + t, low = cand.toLowerCase();
        if (tried.has(low)) continue; tried.add(low);
        if (!validate(cand).ok) continue;
        if (!(await db.get(nameDoc(low)))) out.push(cand);
      }
      return out;
    }

    return {
      // Nama resmi akun ini (atau belum ada).
      async nameGet(auth) {
        const uid = uidOf(auth); const d = await getMine(uid);
        return d ? { has: true, name: d.name, lower: d.lower || d.name.toLowerCase(), at: d.at || 0 } : { has: false };
      },
      // Periksa ketersediaan (TIDAK menetapkan apa pun).
      async nameCheck(auth, p) {
        const uid = uidOf(auth); rate(uid, "chk", LIM.CHECK_PER_MIN);
        const mine = await getMine(uid); if (mine) return { ok: false, code: "locked", message: "Akunmu sudah punya nama permanen: " + mine.name + ".", name: mine.name };
        const v = validate(p && p.name); if (!v.ok) return { ok: false, code: v.code, message: v.message };
        const d = await db.get(nameDoc(v.lower));
        if (d && d.uid !== uid) return { ok: true, available: false, name: v.name, message: TAKEN_MSG, suggestions: await suggest(v.name) };
        return { ok: true, available: true, name: v.name, message: "✅ Nama tersedia!" };
      },
      // Tetapkan nama PERMANEN (atomik). Gagal jika akun sudah punya nama atau nama sudah dipakai.
      async nameClaim(auth, p) {
        const uid = uidOf(auth); rate(uid, "clm", LIM.CLAIM_PER_MIN);
        const v = validate(p && p.name); if (!v.ok) fail("invalid-argument", v.message);
        const t0 = clock();
        const res = await db.tx(async (t) => {
          const mine = await t.get(PROFILE_PATH(uid));
          if (mine && typeof mine.name === "string") {
            if ((mine.lower || mine.name.toLowerCase()) === v.lower) return { ok: true, already: true, name: mine.name, lower: mine.lower || v.lower, at: mine.at || t0 };
            return { locked: true, name: mine.name };
          }
          const cur = await t.get(nameDoc(v.lower));
          if (cur) return { taken: true };
          await t.set(nameDoc(v.lower), { uid, name: v.name, at: t0 });
          await t.set(PROFILE_PATH(uid), { name: v.name, lower: v.lower, at: t0 });
          return { ok: true, name: v.name, lower: v.lower, at: t0 };
        });
        if (res.locked) fail("failed-precondition", "Akunmu sudah punya nama permanen (" + res.name + "). Nama tidak bisa diganti.");
        if (res.taken) fail("already-exists", TAKEN_MSG);
        return res;
      },
    };
  }

  return { LIM, RE, TAKEN_MSG, NameError, validate, makeNameServer, skeleton };
});
