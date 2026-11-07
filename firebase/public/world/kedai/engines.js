// =========================================================
//  NUSA ISLAND — Bumbu 3.1: MESIN permainan tradisional Kedai Atuk Bahar (logika murni, tanpa DOM)
//  Dipakai di browser (window.NusaKedaiEngines) dan di node (tests/unit-kedai.js).
//  Semua hasil ditentukan oleh logika di sini dari seed + input pemain; tidak ada manipulasi tersembunyi:
//   - Batok: kelereng dilacak lewat daftar tukar yang SAMA dengan yang dianimasikan.
//   - Gasing / Kelereng / Gelang: fisika deterministik; tiap ronde diverifikasi MEMILIKI solusi menang.
//   - Congklak: aturan konsisten; jumlah biji selalu 98.
// =========================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NusaKedaiEngines = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const DIFFS = ["mudah", "normal", "sulit", "goat"];

  // =====================================================================================
  // A. BATOK KELAPA MISTERIUS
  // =====================================================================================
  const BATOK = {
    mudah: { swaps: 5, dur: 0.62 }, normal: { swaps: 8, dur: 0.46 }, sulit: { swaps: 12, dur: 0.34 }, goat: { swaps: 17, dur: 0.25 },
  };
  const batok = {
    CFG: BATOK,
    create(diff, seed) {
      const cfg = BATOK[diff] || BATOK.normal, R = rng(seed);
      const ballSlot0 = Math.floor(R() * 3), swaps = [];
      let prev = null;
      while (swaps.length < cfg.swaps) {   // tidak mengulang pasangan yang sama berurutan (tidak saling membatalkan)
        const a = Math.floor(R() * 3); let b = Math.floor(R() * 3); if (b === a) b = (a + 1 + Math.floor(R() * 2)) % 3;
        const key = Math.min(a, b) + "" + Math.max(a, b); if (key === prev) continue; prev = key; swaps.push([a, b]);
      }
      return { diff, seed, cfg, ballSlot0, swaps, dur: cfg.dur, showT: 1.4, gapT: 0.5 };
    },
    // urutan: tampil (showT) → acak (swaps × dur) → pilih
    totalShuffle(st) { return st.swaps.length * st.dur; },
    // susunan cangkir: perm[slot] = id cangkir; ball ada di cangkir dengan id = cupWithBall
    permAfter(st, n) { const p = [0, 1, 2]; for (let i = 0; i < n; i++) { const [a, b] = st.swaps[i]; const t = p[a]; p[a] = p[b]; p[b] = t; } return p; },
    finalBallSlot(st) { let s = st.ballSlot0; for (const [a, b] of st.swaps) { if (s === a) s = b; else if (s === b) s = a; } return s; },
    // posisi tiap cangkir pada waktu u (detik sejak mulai mengacak): {x (slot kontinu 0..2), lift 0..1} per ID cangkir
    cupsAt(st, u) {
      const n = clamp(Math.floor(u / st.dur), 0, st.swaps.length), perm = batok.permAfter(st, n), out = [];
      for (let slot = 0; slot < 3; slot++) out[perm[slot]] = { x: slot, lift: 0 };
      if (u >= 0 && n < st.swaps.length) {
        const f = clamp((u - n * st.dur) / st.dur, 0, 1), [a, b] = st.swaps[n], e = f * f * (3 - 2 * f);
        const ca = perm[a], cb = perm[b];
        out[ca] = { x: a + (b - a) * e, lift: Math.sin(f * Math.PI) * 0.5, side: 1 };
        out[cb] = { x: b + (a - b) * e, lift: Math.sin(f * Math.PI) * 0.5, side: -1 };
      }
      return out;
    },
    evaluate(st, slot) { return slot === batok.finalBallSlot(st); },
  };

  // =====================================================================================
  // B. DUEL GASING
  // =====================================================================================
  const GASING = {
    arenaR: 1, r: 0.1, decay: 4, drag: 0.55, bowl: 0.55, e: 0.88, spinLoss: 0.35, stopSpin: 6, maxT: 30,
    // spinMin/spinMax: kekuatan putaran pemain (0..1 → rentang). ai: keahlian Atuk.
    mudah: { atukSpin: 30, atukPow: 0.5, err: 38 }, normal: { atukSpin: 44, atukPow: 0.65, err: 22 },
    sulit: { atukSpin: 52, atukPow: 0.85, err: 11 }, goat: { atukSpin: 58, atukPow: 0.95, err: 4 },
  };
  const gasing = {
    CFG: GASING,
    // aksi pemain: {ang (rad, 0 = ke kanan, -PI/2 = ke atas), pow 0..1}
    launchOf(act) { const p = clamp(act.pow, 0, 1); return { spin: 28 + 34 * p, speed: 0.55 + 0.75 * p, ang: act.ang }; },
    create(diff, seed) {
      const cfg = GASING[diff] || GASING.normal;
      for (let tries = 0; tries < 120; tries++) {
        const R = rng(seed + tries * 7919), easeSpin = Math.floor(tries / 30) * 3; // bila ronde tak punya solusi menang, Atuk sedikit dilemahkan (tetap di tingkat yang sama)
        const st = { diff, seed: seed + tries * 7919, atuk: { x: (R() - 0.5) * 0.5, y: -0.62, vx: 0, vy: 0, spin: 0 }, you: { x: (R() - 0.5) * 0.3, y: 0.7, vx: 0, vy: 0, spin: 0 }, t: 0, over: false, winner: null, hits: 0 };
        // Atuk meluncur ke arah pemain dengan galat sesuai kesulitan
        const aim = Math.atan2(st.you.y - st.atuk.y, st.you.x - st.atuk.x), err = (R() * 2 - 1) * cfg.err * Math.PI / 180;
        const sp = 0.55 + 0.75 * cfg.atukPow;
        st.atuk.vx = Math.cos(aim + err) * sp; st.atuk.vy = Math.sin(aim + err) * sp; st.atuk.spin = cfg.atukSpin - easeSpin;
        if (gasing.solvable(st)) return st;
      }
      return null; // tidak terjadi dalam praktik; pemanggil memakai seed lain
    },
    launch(st, act) { const l = gasing.launchOf(act); st.you.vx = Math.cos(l.ang) * l.speed; st.you.vy = Math.sin(l.ang) * l.speed; st.you.spin = l.spin; st.launched = true; },
    step(st, dt) {
      if (st.over) return;
      const G = GASING, a = st.atuk, b = st.you; st.t += dt;
      for (const p of [a, b]) {
        if (p.out) continue;
        const sp = Math.hypot(p.vx, p.vy), k = Math.exp(-G.drag * dt); p.vx *= k; p.vy *= k;
        p.vx -= p.x * G.bowl * dt * (p.spin > 0 ? 1 : 0.2); p.vy -= p.y * G.bowl * dt * (p.spin > 0 ? 1 : 0.2); // lantai sedikit cekung → gasing cenderung ke tengah
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.spin = Math.max(0, p.spin - G.decay * dt);
        void sp;
        if (Math.hypot(p.x, p.y) > G.arenaR + G.r * 0.4) p.out = true;
      }
      if (!a.out && !b.out) { // tumbukan
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = G.r * 2;
        if (d < min && d > 1e-6) {
          const nx = dx / d, ny = dy / d, rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          const over = (min - d) / 2; a.x -= nx * over; a.y -= ny * over; b.x += nx * over; b.y += ny * over;
          if (rv < 0) {
            const j = -(1 + G.e) * rv / 2; a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny;
            const tot = a.spin + b.spin || 1, hit = Math.abs(rv) * G.spinLoss * 60;
            const la = hit * (b.spin / tot) * 1.0, lb = hit * (a.spin / tot) * 1.0; // putaran lebih cepat melemahkan lawan lebih banyak
            a.spin = Math.max(0, a.spin - la); b.spin = Math.max(0, b.spin - lb); st.hits++;
          }
        }
      }
      const done = (p) => p.out || p.spin <= G.stopSpin;
      if (done(a) || done(b) || st.t >= G.maxT) {
        st.over = true;
        const sa = a.out ? -1 : a.spin, sb = b.out ? -1 : b.spin;
        st.winner = sb > sa ? "you" : sa > sb ? "atuk" : "seri";
        if (a.out && !b.out) st.winner = "you"; else if (b.out && !a.out) st.winner = "atuk";
      }
    },
    run(st, act) { const s = JSON.parse(JSON.stringify(st)); gasing.launch(s, act); let n = 0; while (!s.over && n++ < 6000) gasing.step(s, 1 / 60); return s; },
    // adakah satu aksi pemain yang memenangkan ronde ini? (menjamin ronde adil/menang-able)
    solvable(st) { return !!gasing.findWin(st); },
    findWin(st) {
      const s0 = JSON.parse(JSON.stringify(st)); s0.t = 0;
      let best = null;
      for (let i = 0; i < 16; i++) for (const pow of [1, 0.85, 0.6]) {
        const ang = -Math.PI / 2 + (i / 16 - 0.5) * Math.PI * 0.9;
        const r = gasing.run(s0, { ang, pow }); if (r.winner === "you") return { ang, pow };
      }
      return best;
    },
  };

  // =====================================================================================
  // C. CONGKLAK SANG JUARA
  // =====================================================================================
  // indeks: 0..6 lubang pemain, 7 lumbung pemain, 8..14 lubang Atuk, 15 lumbung Atuk. Penaburan berlawanan jarum jam (indeks naik),
  // melewati lumbung lawan. Lubang seberang untuk lubang h pemain = 14 - h.
  const congklak = {
    STORE: [7, 15], HOLES: [[0, 1, 2, 3, 4, 5, 6], [8, 9, 10, 11, 12, 13, 14]],
    create() { const b = new Array(16).fill(7); b[7] = 0; b[15] = 0; return { b, turn: 0, over: false, winner: null, log: [] }; },
    clone(st) { return { b: st.b.slice(), turn: st.turn, over: st.over, winner: st.winner, log: [] }; },
    total(st) { return st.b.reduce((x, y) => x + y, 0); },
    legal(st) { return congklak.HOLES[st.turn].filter((i) => st.b[i] > 0); },
    // jalankan satu langkah penuh (termasuk lanjut menabur & tembak). Mengembalikan ringkasan; mengubah st.
    move(st, hole) {
      if (st.over || !congklak.legal(st).includes(hole)) return null;
      const me = st.turn, store = congklak.STORE[me], opp = congklak.STORE[1 - me], b = st.b, path = [];
      let hand = b[hole]; b[hole] = 0; let pos = hole, steps = 0, captured = 0, extra = false;
      path.push({ pick: hole, n: hand });
      while (hand > 0) {
        pos = (pos + 1) % 16; if (pos === opp) continue;
        b[pos]++; hand--; path.push({ drop: pos });
      }
      const mine = (i) => congklak.HOLES[me].includes(i);
      for (let guard = 0; guard < 80; guard++) {   // lanjut menabur sampai berhenti (dibatasi agar selalu selesai)
        if (pos === store) { extra = true; break; }
        if (b[pos] > 1) { hand = b[pos]; b[pos] = 0; path.push({ pick: pos, n: hand, cont: true }); while (hand > 0) { pos = (pos + 1) % 16; if (pos === opp) continue; b[pos]++; hand--; path.push({ drop: pos }); } continue; }
        // jatuh di lubang kosong (kini berisi 1)
        if (mine(pos)) { const o = 14 - (me === 0 ? pos : pos - 8 + 0); const opposite = me === 0 ? 14 - pos : 14 - pos; if (b[opposite] > 0) { captured = b[opposite] + 1; b[store] += captured; b[opposite] = 0; b[pos] = 0; path.push({ tembak: pos, from: opposite, n: captured }); } void o; }
        break;
      }
      steps = path.length;
      // akhir permainan: sisi pemain yang giliran jalan kosong → biji sisa milik pemilik sisinya
      const emptyOf = (p) => congklak.HOLES[p].every((i) => b[i] === 0);
      if (emptyOf(0) || emptyOf(1)) {
        for (const p of [0, 1]) for (const i of congklak.HOLES[p]) { b[congklak.STORE[p]] += b[i]; b[i] = 0; }
        st.over = true; const d = b[7] - b[15]; st.winner = d > 0 ? "you" : d < 0 ? "atuk" : "seri";
      } else if (!extra) st.turn = 1 - me;
      else if (congklak.legal(st).length === 0) st.turn = 1 - me; // lanjut tapi tak ada biji → serahkan giliran
      return { hole, extra, captured, steps, path, over: st.over };
    },
    score(st, p) { return st.b[congklak.STORE[p]]; },
    // nilai posisi untuk pemain `p` (positif = baik)
    evalFor(st, p) { const d = st.b[congklak.STORE[p]] - st.b[congklak.STORE[1 - p]]; return d + (st.turn === p ? 0.4 : -0.4) * 0 + 0.05 * (congklak.HOLES[p].reduce((s, i) => s + st.b[i], 0) - congklak.HOLES[1 - p].reduce((s, i) => s + st.b[i], 0)); },
    search(st, depth, p, alpha, beta, R) {
      if (st.over) { const d = st.b[congklak.STORE[p]] - st.b[congklak.STORE[1 - p]]; return { v: d * 100 }; }
      if (depth === 0) return { v: congklak.evalFor(st, p) };
      const moves = congklak.legal(st); let best = { v: st.turn === p ? -Infinity : Infinity, hole: moves[0] };
      for (const h of moves) {
        const c = congklak.clone(st); congklak.move(c, h);
        const r = congklak.search(c, depth - 1, p, alpha, beta, R);
        const v = r.v + (R ? (R() - 0.5) * 0.6 : 0);
        if (st.turn === p) { if (v > best.v) best = { v, hole: h }; alpha = Math.max(alpha, v); } else { if (v < best.v) best = { v, hole: h }; beta = Math.min(beta, v); }
        if (beta <= alpha) break;
      }
      return best;
    },
    // pilih langkah Atuk (turn = 1) menurut kesulitan
    aiPick(st, diff, R) {
      R = R || Math.random; const moves = congklak.legal(st); if (!moves.length) return null;
      if (diff === "mudah") {   // sering asal, kadang serakah
        if (R() < 0.45) return congklak.greedy(st, 1, R);
        return moves[Math.floor(R() * moves.length)];
      }
      if (diff === "normal") return R() < 0.25 ? moves[Math.floor(R() * moves.length)] : congklak.greedy(st, 1, R);
      // sulit & GOAT: Atuk menghitung beberapa langkah ke depan, tetapi sesekali salah hitung (manusiawi) sehingga bisa dikalahkan dengan keterampilan
      if (diff === "sulit") return R() < 0.14 ? moves[Math.floor(R() * moves.length)] : congklak.search(st, 2, st.turn, -Infinity, Infinity, R).hole;
      return R() < 0.07 ? moves[Math.floor(R() * moves.length)] : congklak.search(st, 3, st.turn, -Infinity, Infinity, R).hole; // goat
    },
    greedy(st, p, R) {
      let best = -Infinity, pick = null;
      for (const h of congklak.legal(st)) { const c = congklak.clone(st); const m = congklak.move(c, h); const v = c.b[congklak.STORE[st.turn]] - st.b[congklak.STORE[st.turn]] + (m.extra ? 1.5 : 0) + (R ? R() * 0.01 : 0); if (v > best) { best = v; pick = h; } }
      return pick;
    },
  };

  // =====================================================================================
  // D. LEMPAR GELANG BAMBU
  // =====================================================================================
  const GELANG = { // need = jumlah kena dari rings; rad = radius kena; maxRange = jangkauan maks (satuan dunia)
    mudah: { rings: 5, need: 2, rad: 0.16, dMin: 0.42, dMax: 0.6, sway: 0, side: 0.1 },
    normal: { rings: 5, need: 3, rad: 0.12, dMin: 0.4, dMax: 0.78, sway: 0, side: 0.22 },
    sulit: { rings: 5, need: 3, rad: 0.09, dMin: 0.5, dMax: 0.9, sway: 0, side: 0.3 },
    goat: { rings: 5, need: 4, rad: 0.075, dMin: 0.5, dMax: 0.92, sway: 0.2, swayHz: 0.55, side: 0.3 },
    maxRange: 1, flight: 0.85,
  };
  const gelang = {
    CFG: GELANG,
    create(diff, seed) {
      const cfg = GELANG[diff] || GELANG.normal, R = rng(seed);
      return { diff, seed, cfg, throws: 0, hits: 0, results: [], targets: Array.from({ length: cfg.rings }, () => ({ d: cfg.dMin + R() * (cfg.dMax - cfg.dMin), x: (R() * 2 - 1) * cfg.side, ph: R() * TAU })), over: false, won: false };
    },
    // posisi tiang pada waktu t (detik): bergoyang menyamping pada GOAT
    targetPos(st, i, t) { const q = st.targets[i], sw = st.cfg.sway ? Math.sin(t * TAU * st.cfg.swayHz + q.ph) * st.cfg.sway : 0; return { x: q.x + sw, y: q.d }; },
    // lemparan: ang = arah dari vertikal (rad, + = kanan), pow 0..1 → titik jatuh
    landing(act) { const p = clamp(act.pow, 0, 1) * GELANG.maxRange; return { x: Math.sin(act.ang) * p, y: Math.cos(act.ang) * p }; },
    throwRing(st, act, t) { // t = waktu mendarat (untuk tiang bergoyang)
      if (st.over) return null;
      const i = st.throws, L = gelang.landing(act), T = gelang.targetPos(st, i, t), dist = Math.hypot(L.x - T.x, L.y - T.y), hit = dist <= st.cfg.rad;
      st.throws++; if (hit) st.hits++; st.results.push({ hit, dist, L, T });
      if (st.hits >= st.cfg.need) { st.over = true; st.won = true; }
      else if (st.throws >= st.cfg.rings || st.hits + (st.cfg.rings - st.throws) < st.cfg.need) { st.over = true; st.won = false; }
      return { hit, dist, L, T };
    },
    // aksi sempurna untuk sasaran saat ini (dipakai uji "bisa dimenangkan")
    perfect(st, t) { const T = gelang.targetPos(st, st.throws, t), pow = Math.hypot(T.x, T.y) / GELANG.maxRange; return { ang: Math.atan2(T.x, T.y), pow }; },
  };

  // =====================================================================================
  // E. KELERENG JAGOAN ATUK
  // =====================================================================================
  const KLR = { // shots = jumlah sentilan; blockers = kelereng penghalang; preview = fraksi lintasan yang ditampilkan
    mudah: { shots: 5, blockers: 0, preview: 1, ringR: 1 }, normal: { shots: 4, blockers: 1, preview: 1, ringR: 1 },
    sulit: { shots: 4, blockers: 2, preview: 0.55, ringR: 1 }, goat: { shots: 3, blockers: 3, preview: 0.28, ringR: 1 },
    r: 0.075, ringR: 1, mu: 1.5, e: 0.94, vMin: 0.05, start: { x: 0, y: 1.28 },
  };
  const kelereng = {
    CFG: KLR,
    speedOf(pow) { return 1.4 + 2.6 * clamp(pow, 0, 1); },
    makeBall(x, y, kind) { return { x, y, vx: 0, vy: 0, kind, out: false }; },
    create(diff, seed) {
      const cfg = KLR[diff] || KLR.normal;
      for (let tries = 0; tries < 60; tries++) {
        const R = rng(seed + tries * 104729), balls = [];
        // sasaran: di separuh atas lingkaran, dekat tepi
        const a = -Math.PI / 2 + (R() - 0.5) * 1.5, rad = 0.52 + R() * 0.28;
        balls.push(kelereng.makeBall(Math.cos(a) * rad, Math.sin(a) * rad, "target"));
        for (let i = 0; i < cfg.blockers; i++) {
          for (let k = 0; k < 40; k++) {
            const aa = R() * TAU, rr = Math.sqrt(R()) * 0.7, x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
            if (balls.every((b) => Math.hypot(b.x - x, b.y - y) > KLR.r * 2.6)) { balls.push(kelereng.makeBall(x, y, "blok")); break; }
          }
        }
        const st = { diff, seed: seed + tries * 104729, cfg, balls, shots: cfg.shots, used: 0, over: false, won: false, shooter: null };
        if (kelereng.solvable(st)) return st;
      }
      return null;
    },
    inRing(b) { return Math.hypot(b.x, b.y) <= KLR.ringR + 0 - 0 + 0; },
    // sentil: ang (rad, arah vektor gerak), pow 0..1 → simulasikan sampai berhenti. rec = (opsional) rekam jalur shooter
    shoot(st, act, rec) {
      const S = kelereng.makeBall(KLR.start.x, KLR.start.y, "shooter"), v = kelereng.speedOf(act.pow);
      S.vx = Math.cos(act.ang) * v; S.vy = Math.sin(act.ang) * v;
      const all = st.balls.filter((b) => !b.out).concat([S]); const dt = 1 / 120; let t = 0, firstHit = null, tick = 0;
      while (t < 7) {
        t += dt;
        for (const b of all) { if (b.out) continue; const k = Math.exp(-KLR.mu * dt); b.vx *= k; b.vy *= k; if (Math.hypot(b.vx, b.vy) < KLR.vMin * 0.5) { b.vx = 0; b.vy = 0; } b.x += b.vx * dt; b.y += b.vy * dt; }
        for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
          const A = all[i], B = all[j]; if (A.out || B.out) continue;
          const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), m = KLR.r * 2;
          if (d < m && d > 1e-6) {
            const nx = dx / d, ny = dy / d, rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny, over = (m - d) / 2;
            A.x -= nx * over; A.y -= ny * over; B.x += nx * over; B.y += ny * over;
            if (rv < 0) { const j2 = -(1 + KLR.e) * rv / 2; A.vx -= j2 * nx; A.vy -= j2 * ny; B.vx += j2 * nx; B.vy += j2 * ny; if (!firstHit && (A === S || B === S)) firstHit = { t, x: S.x, y: S.y, other: A === S ? B : A }; }
          }
        }
        // kelereng sasaran/penghalang keluar lingkaran?
        for (const b of all) if (b !== S && !b.out && Math.hypot(b.x, b.y) > KLR.ringR + KLR.r * 0.2) b.out = true;
        if (rec && (tick++ & 1) === 0) rec.push({ x: S.x, y: S.y, t, p: all.map((b) => (b === S ? null : [b.x, b.y, b.out ? 1 : 0])) });
        if (all.every((b) => b.out || Math.hypot(b.vx, b.vy) < KLR.vMin * 0.5)) break;
      }
      st.balls.forEach((b) => { const m = all.find((q) => q === b); if (m) { b.x = m.x; b.y = m.y; b.out = m.out; b.vx = 0; b.vy = 0; } });
      return { firstHit, target: st.balls.find((b) => b.kind === "target") };
    },
    solvable(st) { return !!kelereng.findWin(st, st.diff === "goat" ? 1 : 1); },
    findWin(st) {
      let best = null, count = 0, total = 0;
      for (let i = 0; i < 60; i++) for (const pow of [0.6, 0.8, 1]) {
        const ang = -Math.PI / 2 + (i / 60 - 0.5) * 1.5; total++;
        const s = JSON.parse(JSON.stringify(st)); kelereng.shoot(s, { ang, pow });
        if (s.balls.find((b) => b.kind === "target").out) { count++; best = best || { ang, pow }; }
      }
      if (best) best.width = count / total;
      return best;
    },
    applyShot(st, act, rec) {
      if (st.over) return null;
      const r = kelereng.shoot(st, act, rec); st.used++;
      const t = st.balls.find((b) => b.kind === "target");
      if (t.out) { st.over = true; st.won = true; } else if (st.used >= st.shots) { st.over = true; st.won = false; }
      return r;
    },
    // lintasan perkiraan untuk bidikan (maks fraksi `frac` dari lintasan sampai berhenti/tumbukan pertama)
    preview(st, act, frac) {
      const rec = [], s = JSON.parse(JSON.stringify(st)); const r = kelereng.shoot(s, act, rec);
      let end = rec.length; if (r.firstHit) { end = rec.findIndex((p) => p.t >= r.firstHit.t); if (end < 0) end = rec.length; }
      // fraksi menentukan seberapa jauh jalur ditampilkan
      return { pts: rec.slice(0, Math.max(2, Math.floor(end * (frac == null ? 1 : frac)))), hit: r.firstHit };
    },
  };

  return { rng, clamp, DIFFS, batok, gasing, congklak, gelang, kelereng };
});
