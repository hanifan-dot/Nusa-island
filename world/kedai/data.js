// =========================================================
//  NUSA ISLAND — Bumbu 3.1: DATA & ATURAN EKONOMI Kedai Atuk Bahar (logika murni; browser: NusaKedaiData, node: require)
//  S.kedai = progres Kedai. TIDAK menyentuh S.money: hadiah masuk ke dompet terpisah "Koin Kedai" (simulasi lokal).
//  Alasan: pada Firebase Spark tidak ada server yang memverifikasi hasil minigame (semuanya dihitung di browser),
//  jadi hasil minigame tidak boleh menambah saldo ekonomi yang ikut ke Cloud Save. Lihat docs/BUMBU31.md.
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaKedaiData = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const KV = 1;
  const GAMES = ["batok", "gasing", "congklak", "gelang", "kelereng"];
  const DIFFS = ["mudah", "normal", "sulit", "goat"];
  const REWARD = { mudah: 5, normal: 10, sulit: 20, goat: 35 };
  const DAILY_CAP = 100;
  const NAMES = { batok: "Batok Kelapa Misterius", gasing: "Duel Gasing Atuk", congklak: "Congklak Sang Juara", gelang: "Lempar Gelang Bambu", kelereng: "Kelereng Jagoan Atuk" };
  const ICONS = { batok: "🥥", gasing: "🌀", congklak: "🕳️", gelang: "⭕", kelereng: "🔮" };
  const DIFF_NAMES = { mudah: "Mudah", normal: "Normal", sulit: "Sulit", goat: "GOAT 🐐" };
  const TITLE = { id: "kedai:penakluk", icon: "🐐", name: "PENAKLUK ATUK BAHAR", full: "PENAKLUK ATUK BAHAR 🐐" };
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const int = (x, lo, hi, d) => { const n = Math.floor(Number(x)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  const dayRe = /^\d{4}-\d{2}-\d{2}$/;
  function dayStr(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

  function fresh() { return { v: KV, koin: 0, life: 0, day: "", earned: 0, claimed: {}, rec: {}, goat: {}, title: 0, plays: 0 }; }
  // Aman dipanggil berulang; hanya mengisi/merapikan, tidak pernah menambah koin atau gelar.
  function migrate(S) {
    const k = isObj(S.kedai) ? S.kedai : fresh();
    const o = fresh();
    o.koin = int(k.koin, 0, 1e6, 0); o.life = int(k.life, 0, 1e6, 0); o.plays = int(k.plays, 0, 1e7, 0);
    o.day = typeof k.day === "string" && dayRe.test(k.day) ? k.day : "";
    o.earned = int(k.earned, 0, DAILY_CAP, 0);
    for (const g of GAMES) { if (k.claimed && k.claimed[g] === true) o.claimed[g] = true; if (k.goat && k.goat[g] === true) o.goat[g] = true; }
    if (isObj(k.rec)) for (const g of GAMES) if (isObj(k.rec[g])) for (const d of DIFFS) {
      const r = k.rec[g][d]; if (!isObj(r)) continue;
      (o.rec[g] = o.rec[g] || {})[d] = { plays: int(r.plays, 0, 1e7, 0), wins: int(r.wins, 0, 1e7, 0), streak: int(r.streak, 0, 1e5, 0), best: int(r.best, 0, 1e9, 0), bestStreak: int(r.bestStreak, 0, 1e5, 0) };
    }
    o.title = k.title ? int(k.title, 1, 8.64e15, 1) : 0;
    if (GAMES.every((g) => o.goat[g])) { /* syarat terpenuhi; gelar tetap hanya lewat claimTitle() */ }
    else if (o.title) o.title = o.title; // gelar yang sudah diklaim tidak pernah dicabut
    S.kedai = o; return o;
  }
  // Ganti hari: hanya maju. Jam perangkat yang dimundurkan TIDAK mereset batas harian.
  function rollDay(S, today) {
    const k = S.kedai || migrate(S);
    if (!dayRe.test(today)) today = dayStr();
    if (k.day && today < k.day) return k.day;
    if (today !== k.day) { k.day = today; k.earned = 0; k.claimed = {}; }
    return k.day;
  }
  function dailyLeft(S, today) { rollDay(S, today); return Math.max(0, DAILY_CAP - S.kedai.earned); }
  function canClaim(S, game, today) { rollDay(S, today); return !S.kedai.claimed[game] && S.kedai.earned < DAILY_CAP; }
  // Dipanggil SEKALI saat sebuah pertandingan selesai. Mengembalikan ringkasan untuk ditampilkan.
  function finish(S, game, diff, won, score, today) {
    if (!GAMES.includes(game) || !DIFFS.includes(diff)) return null;
    const k = S.kedai || migrate(S); rollDay(S, today);
    const r = ((k.rec[game] = k.rec[game] || {})[diff] = k.rec[game][diff] || { plays: 0, wins: 0, streak: 0, best: 0, bestStreak: 0 });
    r.plays++; k.plays++;
    const out = { won: !!won, coins: 0, status: won ? "none" : "kalah", newRecord: false, goatNew: false, title: false, left: 0 };
    if (won) {
      r.wins++; r.streak++; r.bestStreak = Math.max(r.bestStreak, r.streak);
      const sc = int(score, 0, 1e9, 0); if (sc > r.best) { r.best = sc; out.newRecord = sc > 0; }
      if (diff === "goat" && !k.goat[game]) { k.goat[game] = true; out.goatNew = true; }
      if (k.claimed[game]) out.status = "sudah";
      else if (k.earned >= DAILY_CAP) out.status = "batas";
      else {
        const c = Math.min(REWARD[diff], DAILY_CAP - k.earned);
        k.claimed[game] = true; k.earned += c; k.koin += c; k.life += c; out.coins = c; out.status = c < REWARD[diff] ? "sebagian" : "ok";
      }
      if (!k.title && GAMES.every((g) => k.goat[g])) { k.title = Date.now(); out.title = true; }
    } else r.streak = 0;
    out.left = Math.max(0, DAILY_CAP - k.earned);
    return out;
  }
  const goatCount = (S) => GAMES.filter((g) => S.kedai && S.kedai.goat && S.kedai.goat[g]).length;
  const totalWins = (S) => { let n = 0; const rc = (S.kedai && S.kedai.rec) || {}; for (const g of Object.keys(rc)) for (const d of Object.keys(rc[g])) n += rc[g][d].wins; return n; };

  // Dialog Atuk (lucu, tidak merendahkan). pick(list, i) memilih berdasarkan indeks agar mudah diuji.
  const LINES = {
    sapa: ["Hahahaha! Mau uji ketangkasan sama Atuk, cucu? Dulu Atuk juara sekampung!", "Eh, ada cucu Atuk! Duduk, duduk. Pilih permainan, jangan pilih yang gampang-gampang aja ya, hahaha!", "Kopi Atuk masih hangat, tangan Atuk juga. Mau main apa hari ini?"],
    menang: ["WADUHH! Hebat juga kau, cucu! Hahaha!", "Aduh, tangan Atuk keriting! Kau menang sah, cucu!", "Hmm… hmm… Atuk akui. Itu tadi mantap sekali!", "Ho ho! Pelan-pelan Atuk mulai kagum sama kau!"],
    kalah: ["Hahaha! Jangan menyerah, cucu. Coba lagi!", "Hampir, cucu, hampir! Atuk juga dulu sering salah.", "Nah, begitulah permainan. Tarik napas, Atuk tunggu ronde berikutnya!", "Kalah itu guru, cucu. Ayo satu ronde lagi!"],
    goatMenang: ["ASTAGAAA! Selama puluhan tahun belum ada yang mengalahkan Atuk! Kau memang legenda!"],
    goatTak: ["Tingkat GOAT itu Atuk simpan untuk yang berani. Hahaha, kau berani?"],
    gelar: ["Kelima-limanya?! Atuk angkat peci! Mulai hari ini kau PENAKLUK ATUK BAHAR!", "Peci Atuk copot, cucu. Kampung ini punya juara baru. Gelar itu milikmu seumur hidup!"],
    batas: ["Hari ini Atuk sudah kehabisan hadiah. Tapi main-main tetap boleh, hahaha!"],
    sudah: ["Hadiah permainan ini sudah kau ambil hari ini. Besok Atuk siapkan lagi!"],
    pergi: ["Pulang dulu, cucu? Besok Atuk tunggu di sini. Jangan lupa makan!"],
    instruksi: ["Pilih permainannya dulu, cucu, lalu pilih seberapa berani kau."],
  };
  const pick = (key, i) => { const a = LINES[key] || [""]; return a[((i == null ? Math.floor(Math.random() * a.length) : i) % a.length + a.length) % a.length]; };

  return { KV, GAMES, DIFFS, REWARD, DAILY_CAP, NAMES, ICONS, DIFF_NAMES, TITLE, LINES, pick, dayStr, fresh, migrate, rollDay, dailyLeft, canClaim, finish, goatCount, totalWins };
});
