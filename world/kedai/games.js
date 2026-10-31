// =========================================================
//  NUSA ISLAND — Bumbu 3.1: PENGENDALI lima permainan (gambar kanvas + kontrol sentuh). Logika ada di engines.js.
//  Antarmuka tiap permainan: create(diff, seed, host) → { phase, ready(), start(), pointer(type,x,y), update(dt), draw(c), status() }
//  host: { sfx(name), finish(won, score), W, H }. Koordinat kanvas logis 360×380.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const E = window.NusaKedaiEngines;
const W = 360, H = 380;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const TAU = Math.PI * 2;

// ---------- gambar bersama ----------
function table(c) { // meja kayu
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#7a4f2c"); g.addColorStop(1, "#4d2f18"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1;
  for (let y = 18; y < H; y += 26) { c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(90, y + 4, 240, y - 5, W, y + 2); c.stroke(); }
}
function ball(c, x, y, r, col, hi) { // kelereng berkilau
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, hi || "#fff"); g.addColorStop(0.35, col); g.addColorStop(1, "rgba(0,0,0,.55)");
  c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.ellipse(x + r * 0.2, y + r * 0.35, r, r * 0.55, 0, 0, TAU); c.fill();
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function label(c, txt, x, y, size, col, align) { c.font = `700 ${size}px system-ui,sans-serif`; c.textAlign = align || "center"; c.fillStyle = col || "#fff6e4"; c.fillText(txt, x, y); }
function arrowAim(c, x0, y0, x1, y1, col) {
  c.strokeStyle = col || "#ffe28a"; c.lineWidth = 3; c.setLineDash([7, 6]); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.setLineDash([]);
  const a = Math.atan2(y1 - y0, x1 - x0); c.fillStyle = col || "#ffe28a"; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - Math.cos(a - 0.4) * 12, y1 - Math.sin(a - 0.4) * 12); c.lineTo(x1 - Math.cos(a + 0.4) * 12, y1 - Math.sin(a + 0.4) * 12); c.fill();
}

// =====================================================================================
// A. BATOK
// =====================================================================================
function batokGame(diff, seed, host) {
  const st = E.batok.create(diff, seed), SX = (x) => 70 + x * 110, BY = 238;
  const g = { phase: "ready", t: 0, u: 0, chosen: -1, rt: 0, st, lastSwap: -1, won: false };
  const cupsNow = () => (g.phase === "acak" ? E.batok.cupsAt(st, g.u) : E.batok.cupsAt(st, E.batok.totalShuffle(st) + 1));
  g.ready = () => g.phase === "ready";
  g.start = () => { if (g.phase !== "ready") return; g.phase = "lihat"; g.t = 0; host.sfx("kedai_klik"); };
  g.pointer = (type, x, y) => {
    if (type !== "down" || g.phase !== "pilih") return;
    let best = -1, bd = 1e9; for (let s = 0; s < 3; s++) { const d = Math.abs(x - SX(s)); if (d < bd) { bd = d; best = s; } }
    if (bd > 70 || y < 120 || y > 330) return;
    g.chosen = best; g.phase = "reveal"; g.rt = 0; g.won = E.batok.evaluate(st, best); host.sfx("kedai_tok");
  };
  g.update = (dt) => {
    g.t += dt;
    if (g.phase === "lihat" && g.t >= st.showT) { g.phase = "acak"; g.u = 0; g.lastSwap = -1; }
    else if (g.phase === "acak") {
      g.u += dt; const k = Math.floor(g.u / st.dur); if (k !== g.lastSwap && k < st.swaps.length) { g.lastSwap = k; host.sfx("kedai_tok"); }
      if (g.u >= E.batok.totalShuffle(st)) { g.phase = "pilih"; g.t = 0; }
    } else if (g.phase === "reveal") { g.rt += dt; if (g.rt > 1.7 && !g.done) { g.done = true; host.finish(g.won, g.won ? 1 : 0); } }
  };
  g.status = () => ({ ready: "Perhatikan kelereng di bawah batok yang terangkat. Tekan Mulai!", lihat: "Ingat posisi kelerengnya…", acak: "Ikuti terus batoknya!", pilih: "Ketuk batok yang menyimpan kelereng", reveal: g.won ? "Benar sekali!" : "Belum tepat…", done: "" }[g.phase] || "");
  g.draw = (c) => {
    table(c);
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(180, BY + 22, 165, 38, 0, 0, TAU); c.fill();
    const cups = cupsNow();
    const ballCup = st.ballSlot0;                       // kelereng "menempel" pada batok yang awalnya di atasnya
    let liftBall = 0;
    if (g.phase === "ready") liftBall = 1;
    else if (g.phase === "lihat") liftBall = clamp((st.showT - g.t) / 0.4, 0, 1);
    else if (g.phase === "reveal") liftBall = clamp(g.rt / 0.4, 0, 1);
    const bx = SX(cups[ballCup].x);
    // kelereng dulu (di bawah batok)
    if (g.phase === "ready" || g.phase === "lihat" || g.phase === "reveal") ball(c, bx, BY + 10, 11, "#d63a3a", "#ffd0d0");
    const order = [0, 1, 2].sort((a, b) => cups[a].x - cups[b].x);
    for (const id of order) {
      const cp = cups[id]; let lift = cp.lift || 0;
      const slotNow = Math.round(cp.x);
      if (id === ballCup && (g.phase === "ready" || g.phase === "lihat")) lift = Math.max(lift, liftBall);
      if (g.phase === "reveal") { const chosenHere = Math.abs(cp.x - g.chosen) < 0.01, isBall = id === ballCup; if (chosenHere || (!g.won && isBall)) lift = clamp(g.rt / 0.4, 0, 1); }
      void slotNow;
      const x = SX(cp.x), y = BY - lift * 58 + (cp.side ? cp.side * 4 : 0);
      c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(x, BY + 14, 44, 11, 0, 0, TAU); c.fill();
      const gr = c.createRadialGradient(x - 14, y - 26, 6, x, y - 10, 52); gr.addColorStop(0, "#b07a45"); gr.addColorStop(0.6, "#7a4b24"); gr.addColorStop(1, "#4a2b12");
      c.fillStyle = gr; c.beginPath(); c.moveTo(x - 44, y + 12); c.bezierCurveTo(x - 46, y - 48, x + 46, y - 48, x + 44, y + 12); c.quadraticCurveTo(x, y + 24, x - 44, y + 12); c.fill();
      c.strokeStyle = "rgba(30,15,5,.35)"; c.lineWidth = 1.2; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(x + k * 10, y + 10); c.quadraticCurveTo(x + k * 7, y - 18, x + k * 3, y - 34); c.stroke(); }
      c.fillStyle = "#2c1a0b"; c.beginPath(); c.ellipse(x, y + 14, 44, 8, 0, 0, TAU); c.fill();
      if (g.phase === "pilih" && !g.hover) { c.fillStyle = "rgba(255,226,138," + (0.35 + 0.25 * Math.sin(g.t * 5)) + ")"; c.beginPath(); c.arc(x, y - 52, 5, 0, TAU); c.fill(); }
    }
    if (g.phase === "reveal" && g.rt > 0.2) label(c, g.won ? "✔ Tepat!" : "✘ Bukan di situ", 180, 56, 22, g.won ? "#c9f2a6" : "#ffb3a8");
    label(c, `${st.cfg.swaps}× acak · kecepatan ${(1 / st.dur).toFixed(1)}/dtk`, 180, 360, 12, "rgba(255,246,228,.6)");
  };
  return g;
}

// =====================================================================================
// B. GASING
// =====================================================================================
function gasingGame(diff, seed, host) {
  let st = E.gasing.create(diff, seed); if (!st) st = E.gasing.create(diff, seed + 1);
  const CX = 180, CY = 190, R = 150, KS = 140;
  const g = { phase: "ready", st, ph: { a: 0, y: 0 }, aim: null, t: 0 };
  const youPx = () => ({ x: CX + st.you.x * R, y: CY + st.you.y * R });
  g.ready = () => g.phase === "ready";
  g.start = () => { if (g.phase === "ready") { g.phase = "aim"; host.sfx("kedai_klik"); } };
  g.pointer = (type, x, y) => {
    if (g.phase !== "aim") return;
    const me = youPx();
    if (type === "down" || type === "move") { if (type === "down") g.dragging = true; if (!g.dragging) return; const vx = me.x - x, vy = me.y - y, len = Math.hypot(vx, vy); g.aim = { ang: Math.atan2(vy, vx), len, pow: clamp(len / KS, 0, 1) }; }
    else if (type === "up" && g.dragging) {
      g.dragging = false;
      if (!g.aim || g.aim.len < 14) { g.aim = null; return; }
      E.gasing.launch(st, { ang: g.aim.ang, pow: g.aim.pow }); g.phase = "run"; host.sfx("kedai_putar"); g.acc = 0; g.score = 0;
    }
  };
  g.update = (dt) => {
    g.t += dt; g.ph.a += (st.you.spin || 20) * dt * 0.5; g.ph.y += (st.atuk.spin || 20) * dt * 0.5;
    if (g.phase === "aim") { g.ph.a += 6 * dt; return; }
    if (g.phase !== "run") return;
    g.acc += dt; let n = 0; while (g.acc >= 1 / 60 && n++ < 8) { g.acc -= 1 / 60; const h0 = st.hits; E.gasing.step(st, 1 / 60); if (st.hits !== h0) { host.sfx("kedai_tok"); g.shake = 0.25; } if (st.over) break; }
    if (g.shake) g.shake = Math.max(0, g.shake - dt);
    if (st.over) { g.phase = "end"; g.et = 0; g.won = st.winner === "you"; g.score = Math.round(st.you.spin); }
  };
  g.end = false;
  const origUpdate = g.update;
  g.update = (dt) => { origUpdate(dt); if (g.phase === "end") { g.et += dt; if (g.et > 1.4 && !g.end) { g.end = true; host.finish(g.won, g.score); } } };
  g.status = () => ({ ready: "Tekan Mulai, lalu tarik dari gasingmu seperti ketapel.", aim: g.aim ? `Kekuatan ${Math.round(g.aim.pow * 100)}% — lepas untuk meluncurkan` : "Tarik ke belakang dari gasing biru lalu lepas", run: "Gasing beradu! Siapa yang bertahan?", end: g.won ? "Gasingmu bertahan!" : st.winner === "seri" ? "Seri…" : "Gasing Atuk menang kali ini" }[g.phase] || "");
  function top(c, p, col, spin, ph, scale) {
    const w = 15 * scale, ratio = clamp(spin / 40, 0, 1.2), wob = Math.sin(ph * 2) * (1 - Math.min(1, ratio)) * 4;
    c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(p.x + 3, p.y + 5, w * 1.1, w * 0.45, 0, 0, TAU); c.fill();
    c.save(); c.translate(p.x + wob, p.y - 4); c.rotate(wob * 0.02);
    c.fillStyle = "#3a2a1c"; c.beginPath(); c.moveTo(-3, 6); c.lineTo(3, 6); c.lineTo(0, 13); c.fill();
    c.fillStyle = col; c.beginPath(); c.ellipse(0, -2, w, w * 0.62, 0, 0, TAU); c.fill();
    c.fillStyle = "rgba(255,255,255,.55)"; for (let i = 0; i < 4; i++) { const a = ph + i * Math.PI / 2; c.beginPath(); c.ellipse(Math.cos(a) * w * 0.55, -2, Math.max(1, Math.abs(Math.sin(a)) * 3.2), w * 0.42, 0, 0, TAU); c.fill(); }
    c.fillStyle = "rgba(255,255,255,.25)"; c.beginPath(); c.ellipse(0, -w * 0.5 - 1, w * 0.45, w * 0.18, 0, 0, TAU); c.fill();
    c.restore();
  }
  g.draw = (c) => {
    table(c);
    const sx = g.shake ? (Math.random() - 0.5) * 5 : 0; c.save(); c.translate(sx, 0);
    // arena (wadah kayu cekung)
    const ar = c.createRadialGradient(CX, CY, 20, CX, CY, R + 14); ar.addColorStop(0, "#c8a06a"); ar.addColorStop(0.8, "#a67c47"); ar.addColorStop(1, "#6b4522");
    c.fillStyle = ar; c.beginPath(); c.arc(CX, CY, R + 10, 0, TAU); c.fill();
    c.strokeStyle = "#3a2210"; c.lineWidth = 6; c.beginPath(); c.arc(CX, CY, R + 10, 0, TAU); c.stroke();
    c.strokeStyle = "rgba(60,35,15,.25)"; c.lineWidth = 1.5; for (let r = 40; r < R; r += 38) { c.beginPath(); c.arc(CX, CY, r, 0, TAU); c.stroke(); }
    const aP = { x: CX + st.atuk.x * R, y: CY + st.atuk.y * R }, yP = youPx();
    if (!st.atuk.out) top(c, aP, "#c9402e", st.atuk.spin, g.ph.y, 1);
    if (!st.you.out) top(c, yP, "#2f78c4", st.you.spin, g.ph.a, 1);
    if (g.phase === "aim" && g.aim && g.aim.len >= 14) { const l = 30 + g.aim.pow * 90; arrowAim(c, yP.x, yP.y, yP.x + Math.cos(g.aim.ang) * l, yP.y + Math.sin(g.aim.ang) * l); }
    c.restore();
    // bar putaran
    const bar = (x, v, col, name) => { c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(x, 8, 150, 12); c.fillStyle = col; c.fillRect(x, 8, 150 * clamp(v / 62, 0, 1), 12); label(c, name, x + 75, 31, 11, "#fff6e4"); };
    bar(10, st.you.out ? 0 : st.you.spin, "#4aa3f0", "Gasingmu"); bar(200, st.atuk.out ? 0 : st.atuk.spin, "#e8604a", "Gasing Atuk");
    if (g.phase === "aim") { c.fillStyle = "rgba(255,246,228,.9)"; c.font = "600 12px system-ui"; c.textAlign = "center"; c.fillText("⬆ Tarik ke bawah dari gasing biru lalu lepas", CX, 372); }
  };
  return g;
}

// =====================================================================================
// C. CONGKLAK
// =====================================================================================
function congklakGame(diff, seed, host) {
  const C = E.congklak, st = C.create(), R = E.rng(seed);
  const g = { phase: "ready", st, disp: st.b.slice(), anim: null, msg: "", wait: 0, hl: -1, last: 0, t: 0 };
  const X0 = 42, CW = 276 / 7, YR = { atuk: 112, you: 268 };
  const holePos = (i) => {
    if (i === 7) return { x: 338, y: 190, store: true }; if (i === 15) return { x: 22, y: 190, store: true };
    if (i < 7) return { x: X0 + i * CW + CW / 2, y: YR.you }; return { x: X0 + (14 - i) * CW + CW / 2, y: YR.atuk };
  };
  g.ready = () => g.phase === "ready";
  g.start = () => { if (g.phase === "ready") { g.phase = "play"; g.msg = "Giliranmu — ketuk lubang di barisan bawah"; host.sfx("kedai_klik"); } };
  function runMove(hole, who) {
    const before = st.b.slice(), m = C.move(st, hole); if (!m) return false;
    g.disp = before; g.anim = { m, i: 0, tt: 0, hand: 0, who }; g.msg = who === 0 ? "Kamu menabur…" : "Atuk menabur…"; return true;
  }
  g.pointer = (type, x, y) => {
    if (type !== "down" || g.phase !== "play" || g.anim || st.turn !== 0 || st.over) return;
    for (let i = 0; i < 7; i++) { const p = holePos(i); if (Math.abs(x - p.x) <= CW / 2 && Math.abs(y - p.y) <= 62 && st.b[i] > 0) { host.sfx("kedai_klik"); runMove(i, 0); return; } }
  };
  g.update = (dt) => {
    g.t += dt;
    if (g.phase !== "play") return;
    if (g.anim) {
      const a = g.anim; a.tt += dt; const stepT = 0.15;
      while (a.tt >= stepT && a.i < a.m.path.length) {
        a.tt -= stepT; const s = a.m.path[a.i++];
        if (s.pick !== undefined) { g.disp[s.pick] = 0; a.hand = s.n; g.hl = s.pick; }
        else if (s.drop !== undefined) { g.disp[s.drop]++; a.hand--; g.hl = s.drop; host.sfx("kedai_biji"); }
        else if (s.tembak !== undefined) { const store = a.who === 0 ? 7 : 15; g.disp[s.from] = 0; g.disp[s.tembak] = 0; g.disp[store] += s.n; g.hl = store; host.sfx("kedai_tok"); }
      }
      if (a.i >= a.m.path.length) {
        g.disp = st.b.slice(); const m = a.m; g.anim = null; g.hl = -1; g.wait = 0.5;
        if (m.captured) g.msg = (a.who === 0 ? "Tembak! Kamu dapat " : "Atuk menembak ") + m.captured + " biji";
        else if (m.extra && !st.over) g.msg = a.who === 0 ? "Berhenti di lumbung — giliran lagi!" : "Atuk dapat giliran lagi";
        else g.msg = "";
        if (st.over) { g.phase = "end"; g.et = 0; g.won = st.winner === "you"; g.msg = st.winner === "you" ? "Kamu menang!" : st.winner === "seri" ? "Seri!" : "Atuk menang kali ini"; }
      }
      return;
    }
    if (g.wait > 0) { g.wait -= dt; return; }
    if (st.turn === 1 && !st.over) { // giliran Atuk
      const h = C.aiPick(st, diff, R); if (h == null) { st.turn = 0; return; }
      runMove(h, 1);
    } else if (!g.msg) g.msg = "Giliranmu — ketuk lubang di barisan bawah";
    else if (st.turn === 0 && g.msg.startsWith("Atuk")) g.msg = "Giliranmu — ketuk lubang di barisan bawah";
  };
  const upd = g.update;
  g.update = (dt) => { upd(dt); if (g.phase === "end") { g.et += dt; if (g.et > 1.6 && !g.fin) { g.fin = true; host.finish(g.won, Math.max(0, st.b[7] - st.b[15] + 100)); } } };
  g.status = () => (g.phase === "ready" ? "Tekan Mulai. Tabur biji berlawanan jarum jam; berhenti di lumbungmu = giliran lagi; berhenti di lubang kosongmu = tembak biji seberang." : g.msg);
  g.draw = (c) => {
    table(c);
    // papan
    const bd = c.createLinearGradient(0, 40, 0, 340); bd.addColorStop(0, "#c58a45"); bd.addColorStop(1, "#8f5a28");
    c.fillStyle = bd; c.beginPath(); c.roundRect ? c.roundRect(4, 44, 352, 292, 28) : c.rect(4, 44, 352, 292); c.fill(); c.strokeStyle = "#4a2b12"; c.lineWidth = 4; c.stroke();
    // lumbung
    for (const i of [15, 7]) { const p = holePos(i); c.fillStyle = "#4a2b12"; c.beginPath(); c.roundRect ? c.roundRect(p.x - 17, 78, 34, 224, 16) : c.rect(p.x - 17, 78, 34, 224); c.fill(); label(c, String(g.disp[i]), p.x, 196, 16, "#ffe28a"); label(c, i === 7 ? "KAMU" : "ATUK", p.x, 70, 10, "#fff6e4"); }
    const turnYou = g.phase === "play" && !g.anim && st.turn === 0 && !st.over;
    for (let i = 0; i < 16; i++) {
      if (i === 7 || i === 15) continue; const p = holePos(i), n = g.disp[i], sel = turnYou && i < 7 && st.b[i] > 0;
      c.fillStyle = "#3a2210"; c.beginPath(); c.ellipse(p.x, p.y, 17, 20, 0, 0, TAU); c.fill();
      c.fillStyle = sel ? "#6a4220" : "#2a180a"; c.beginPath(); c.ellipse(p.x, p.y + 1, 15, 18, 0, 0, TAU); c.fill();
      if (sel) { c.strokeStyle = `rgba(255,226,138,${0.5 + 0.4 * Math.sin(g.t * 6)})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(p.x, p.y, 18, 21, 0, 0, TAU); c.stroke(); }
      if (g.hl === i) { c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath(); c.ellipse(p.x, p.y, 19, 22, 0, 0, TAU); c.stroke(); }
      const dots = Math.min(n, 9); for (let k = 0; k < dots; k++) { const a = k * 2.4 + i, rr = k === 0 ? 0 : 5 + (k % 3) * 2.2; c.fillStyle = ["#f4d98a", "#e8e0c8", "#cfa760"][k % 3]; c.beginPath(); c.arc(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 1.1, 3.5, 0, TAU); c.fill(); }
      label(c, String(n), p.x, p.y + (i < 7 ? 38 : -28), 12, n ? "#fff6e4" : "rgba(255,246,228,.4)");
    }
    label(c, "ATUK ▲", 180, 62, 11, "rgba(255,246,228,.75)"); label(c, "KAMU ▼", 180, 326, 11, "rgba(255,246,228,.9)");
    if (g.anim && g.anim.hand > 0) label(c, `✋ ${g.anim.hand}`, 180, 196, 18, "#ffe28a");
    c.fillStyle = "rgba(255,246,228,.92)"; c.font = "600 13px system-ui"; c.textAlign = "center"; c.fillText(g.phase === "ready" ? "" : g.msg, 180, 24);
  };
  return g;
}

// =====================================================================================
// D. GELANG
// =====================================================================================
function gelangGame(diff, seed, host) {
  const st = E.gelang.create(diff, seed), K = 300, TH = { x: 180, y: 348 };
  const pxOf = (x, y) => { const s = 1 - 0.25 * y; return { x: 180 + x * K * s, y: 330 - y * K * 0.62, s }; };
  const g = { phase: "ready", st, t: 0, aim: null, fly: null, rings: [], msg: "", end: false };
  g.ready = () => g.phase === "ready";
  g.start = () => { if (g.phase === "ready") { g.phase = "aim"; host.sfx("kedai_klik"); } };
  g.pointer = (type, x, y) => {
    if (g.phase !== "aim") return;
    if (type === "down") { g.drag = true; }
    if ((type === "down" || type === "move") && g.drag) { const vx = TH.x - x, vy = TH.y - y, len = Math.hypot(vx, vy); g.aim = { ang: clamp(Math.atan2(vx, -vy), -1.2, 1.2), pow: clamp(len / 150, 0, 1), len, ok: vy < -4 }; }
    else if (type === "up" && g.drag) {
      g.drag = false; const a = g.aim; g.aim = null;
      if (!a || a.len < 16 || !a.ok) return;
      g.fly = { act: { ang: a.ang, pow: a.pow }, t: 0, dur: E.gelang.CFG.flight, tLand: g.t + E.gelang.CFG.flight }; g.phase = "fly"; host.sfx("kedai_lempar");
    }
  };
  g.update = (dt) => {
    g.t += dt;
    if (g.phase === "fly") {
      const f = g.fly; f.t += dt;
      if (f.t >= f.dur) {
        const idx = st.throws, r = E.gelang.throwRing(st, f.act, f.tLand); g.rings.push({ idx, L: r.L, T: r.T, hit: r.hit });
        host.sfx(r.hit ? "kedai_menang" : "kedai_tok"); g.msg = r.hit ? "Kena! 🎯" : "Meleset…"; g.fly = null; g.pt = 0;
        g.phase = st.over ? "end" : "aim"; g.won = st.won; g.et = 0; g.score = st.hits * 20 + (st.cfg.rings - st.throws) * 10;
      }
    } else if (g.phase === "end") { g.et += dt; if (g.et > 1.5 && !g.end) { g.end = true; host.finish(g.won, g.score); } }
  };
  g.status = () => g.phase === "ready" ? `Kena ${st.cfg.need} dari ${st.cfg.rings} tiang bambu. Tekan Mulai.` : g.phase === "aim" ? `Tiang ${Math.min(st.throws + 1, st.cfg.rings)}/${st.cfg.rings} · Kena ${st.hits}/${st.cfg.need} · tarik ke bawah lalu lepas` : g.msg || "";
  g.draw = (c) => {
    // halaman rumput + tikar
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#c9e3a6"); gr.addColorStop(1, "#7cae5b"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = "#d8b878"; c.beginPath(); c.moveTo(60, 372); c.lineTo(300, 372); c.lineTo(262, 70); c.lineTo(98, 70); c.fill();
    c.strokeStyle = "rgba(120,80,30,.35)"; c.lineWidth = 1; for (let i = 0; i < 12; i++) { const y = 372 - i * 26; c.beginPath(); c.moveTo(60 + i * 3, y); c.lineTo(300 - i * 3, y); c.stroke(); }
    const cur = st.throws;
    // tiang (belakang → depan)
    const order = st.targets.map((_, i) => i).sort((a, b) => st.targets[b].d - st.targets[a].d);
    for (const i of order) {
      const T = E.gelang.targetPos(st, i, g.t), p = pxOf(T.x, T.y), rx = st.cfg.rad * K * p.s, active = i === cur && g.phase !== "end", done = i < cur;
      c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(p.x, p.y, rx, rx * 0.62, 0, 0, TAU); c.fill();
      c.strokeStyle = active ? "rgba(255,226,138,.95)" : "rgba(255,255,255,.4)"; c.lineWidth = active ? 2.5 : 1.5; c.setLineDash(active ? [] : [4, 4]); c.beginPath(); c.ellipse(p.x, p.y, rx, rx * 0.62, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      const h = 52 * p.s; c.fillStyle = done ? "#8a9a5a" : "#6f9a3a"; c.fillRect(p.x - 4 * p.s, p.y - h, 8 * p.s, h); c.fillStyle = "#4e7424"; for (let k = 1; k < 4; k++) c.fillRect(p.x - 4.6 * p.s, p.y - h * k / 4, 9.2 * p.s, 2);
      c.fillStyle = active ? "#ffe28a" : "#cfe0a0"; c.beginPath(); c.ellipse(p.x, p.y - h, 4.5 * p.s, 2.4 * p.s, 0, 0, TAU); c.fill();
      const rec = g.rings.find((r) => r.idx === i); if (rec && rec.hit) { c.strokeStyle = "#e0b84c"; c.lineWidth = 3.5 * p.s; c.beginPath(); c.ellipse(p.x, p.y - h * 0.55, 9 * p.s, 4.5 * p.s, 0, 0, TAU); c.stroke(); }
    }
    // jejak lemparan meleset
    for (const r of g.rings) if (!r.hit) { const p = pxOf(r.L.x, r.L.y); c.strokeStyle = "rgba(160,70,40,.75)"; c.lineWidth = 2.5; c.beginPath(); c.ellipse(p.x, p.y, 10 * p.s, 5 * p.s, 0, 0, TAU); c.stroke(); }
    // bidikan
    if (g.phase === "aim" && g.aim && g.aim.ok) {
      const L = E.gelang.landing({ ang: g.aim.ang, pow: g.aim.pow }), p = pxOf(L.x, L.y);
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 2; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(TH.x, TH.y - 14); c.lineTo(p.x, p.y); c.stroke(); c.setLineDash([]);
      c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath(); c.ellipse(p.x, p.y, 10 * p.s, 5 * p.s, 0, 0, TAU); c.stroke();
      label(c, `${Math.round(g.aim.pow * 100)}%`, p.x, p.y - 12, 12, "#fff");
    }
    // gelang terbang
    if (g.fly) {
      const f = g.fly, k = f.t / f.dur, L = E.gelang.landing(f.act), p1 = pxOf(L.x, L.y), x = TH.x + (p1.x - TH.x) * k, yb = TH.y - 14 + (p1.y - (TH.y - 14)) * k, y = yb - Math.sin(k * Math.PI) * 90;
      c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(x, yb, 11, 5, 0, 0, TAU); c.fill();
      c.strokeStyle = "#c98a3a"; c.lineWidth = 4; c.beginPath(); c.ellipse(x, y, 11, 6, k * 8, 0, TAU); c.stroke();
    }
    // pelempar & gelang tersisa
    c.fillStyle = "#3d6f8f"; c.beginPath(); c.arc(TH.x, TH.y + 4, 14, 0, TAU); c.fill(); c.fillStyle = "#c68b5e"; c.beginPath(); c.arc(TH.x, TH.y - 12, 8, 0, TAU); c.fill();
    for (let i = 0; i < st.cfg.rings - st.throws; i++) { c.strokeStyle = "#c98a3a"; c.lineWidth = 3; c.beginPath(); c.ellipse(22 + i * 24, 360, 9, 5, 0, 0, TAU); c.stroke(); }
    label(c, `Kena ${st.hits}/${st.cfg.need}`, 330, 364, 12, "#2c4a1c", "right");
    if (st.cfg.sway) label(c, "Tiang bergoyang!", 180, 22, 12, "#7a3a1c");
  };
  return g;
}

// =====================================================================================
// E. KELERENG
// =====================================================================================
function kelerengGame(diff, seed, host) {
  const st = E.kelereng.create(diff, seed) || E.kelereng.create("mudah", seed + 3);
  const CX = 180, CY = 170, RS = 130, K = E.kelereng.CFG, SH = { x: CX + K.start.x * RS, y: CY + K.start.y * RS };
  const g = { phase: "ready", st, aim: null, prev: null, anim: null, disp: null, msg: "", lastPrev: 0, t: 0, end: false };
  g.ready = () => g.phase === "ready";
  g.start = () => { if (g.phase === "ready") { g.phase = "aim"; host.sfx("kedai_klik"); } };
  const act = (x, y) => { const vx = SH.x - x, vy = SH.y - y, len = Math.hypot(vx, vy); return { ang: Math.atan2(vy, vx), pow: clamp(len / 110, 0, 1), len }; };
  g.pointer = (type, x, y) => {
    if (g.phase !== "aim") return;
    if (type === "down") g.drag = true;
    if ((type === "down" || type === "move") && g.drag) {
      g.aim = act(x, y);
      const now = performance.now(); if (g.aim.len >= 10 && now - g.lastPrev > 45) { g.lastPrev = now; g.prev = E.kelereng.preview(st, { ang: g.aim.ang, pow: g.aim.pow }, st.cfg.preview); }
    } else if (type === "up" && g.drag) {
      g.drag = false; const a = g.aim; g.aim = null; g.prev = null;
      if (!a || a.len < 14) return;
      const alive = st.balls.filter((b) => !b.out), rec = [];
      E.kelereng.applyShot(st, { ang: a.ang, pow: a.pow }, rec);
      g.anim = { rec, alive, t: 0, i: 0, last: rec.length ? rec[rec.length - 1].t : 0 }; g.phase = "fly"; host.sfx("kedai_lempar");
    }
  };
  g.update = (dt) => {
    g.t += dt;
    if (g.phase === "fly") {
      const a = g.anim; a.t += dt * 1.15;
      while (a.i < a.rec.length - 1 && a.rec[a.i + 1].t <= a.t) { a.i++; }
      const cur = a.rec[a.i]; if (cur && a.i > 0 && cur.p.some((p, k) => p && p[2] && !(a.rec[a.i - 1].p[k] || [])[2])) host.sfx("kedai_tok");
      if (a.t >= a.last + 0.15 || !a.rec.length) {
        g.anim = null; g.phase = st.over ? "end" : "aim"; g.et = 0; g.won = st.won; g.score = Math.max(1, (st.shots - st.used + 1) * 25);
        g.msg = st.over ? (st.won ? "Sasaran keluar lingkaran!" : "Kesempatan habis…") : "Meleset — coba lagi";
        host.sfx(st.over ? (st.won ? "kedai_menang" : "kedai_kalah") : "kedai_klik");
      }
    } else if (g.phase === "end") { g.et += dt; if (g.et > 1.5 && !g.end) { g.end = true; host.finish(g.won, g.score); } }
  };
  g.status = () => g.phase === "ready" ? `Keluarkan kelereng merah dari lingkaran dalam ${st.shots} sentilan. Tekan Mulai.` : g.phase === "aim" ? `Sisa sentilan ${st.shots - st.used} · tarik ke bawah lalu lepas` : g.msg;
  g.draw = (c) => {
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#d9bd8a"); bg.addColorStop(1, "#b99358"); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(255,255,255,.08)"; for (let i = 0; i < 40; i++) c.fillRect((i * 97) % W, (i * 53) % H, 2, 2);
    c.fillStyle = "rgba(120,80,30,.18)"; c.beginPath(); c.arc(CX, CY, RS, 0, TAU); c.fill(); c.strokeStyle = "#6b4522"; c.lineWidth = 5; c.beginPath(); c.arc(CX, CY, RS, 0, TAU); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.5; c.setLineDash([3, 6]); c.beginPath(); c.moveTo(CX - RS - 4, SH.y); c.lineTo(CX + RS + 4, SH.y); c.stroke(); c.setLineDash([]);
    const R = K.r * RS;
    let balls = st.balls.filter((b) => !b.out).map((b) => ({ x: b.x, y: b.y, kind: b.kind }));
    let shooter = null;
    if (g.anim) {
      const a = g.anim, f = a.rec[a.i] || a.rec[0];
      if (f) { shooter = { x: f.x, y: f.y }; balls = []; a.alive.forEach((b, k) => { const p = f.p[k]; if (p && !p[2]) balls.push({ x: p[0], y: p[1], kind: b.kind }); else if (p && p[2] && b.kind) balls.push({ x: p[0], y: p[1], kind: b.kind, fade: true }); }); }
    } else if (g.phase === "aim" || g.phase === "ready") shooter = { x: K.start.x, y: K.start.y };
    for (const b of balls) {
      const x = CX + b.x * RS, y = CY + b.y * RS; if (b.fade) c.globalAlpha = 0.35;
      ball(c, x, y, R, b.kind === "target" ? "#d63a3a" : "#3b86c8", b.kind === "target" ? "#ffd0d0" : "#cfe6ff"); c.globalAlpha = 1;
      if (b.kind === "target") { c.strokeStyle = "rgba(255,226,138," + (0.5 + 0.4 * Math.sin(g.t * 5)) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, R + 4, 0, TAU); c.stroke(); }
    }
    if (g.prev && g.prev.pts.length > 1) {
      c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 2.5; c.setLineDash([2, 7]); c.lineCap = "round"; c.beginPath(); g.prev.pts.forEach((p, i) => { const x = CX + p.x * RS, y = CY + p.y * RS; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]);
      if (g.prev.hit && st.cfg.preview >= 1) { const h = g.prev.hit; c.strokeStyle = "rgba(255,226,138,.9)"; c.lineWidth = 2; c.beginPath(); c.arc(CX + h.x * RS, CY + h.y * RS, R + 3, 0, TAU); c.stroke(); }
    }
    if (shooter) { const x = CX + shooter.x * RS, y = CY + shooter.y * RS; ball(c, x, y, R, "#f1eadb", "#fff"); if (g.aim && g.aim.len >= 10) arrowAim(c, x, y, x + Math.cos(g.aim.ang) * (24 + g.aim.pow * 60), y + Math.sin(g.aim.ang) * (24 + g.aim.pow * 60)); }
    for (let i = 0; i < st.shots - st.used; i++) { ball(c, 20 + i * 24, 366, 8, "#f1eadb", "#fff"); }
    label(c, st.cfg.preview < 1 ? `Jalur bidik: ${Math.round(st.cfg.preview * 100)}%` : "Jalur bidik: penuh", 340, 368, 11, "#4a2b12", "right");
  };
  return g;
}

NW.kedaiGames = { W, H, create: { batok: batokGame, gasing: gasingGame, congklak: congklakGame, gelang: gelangGame, kelereng: kelerengGame } };
})();
