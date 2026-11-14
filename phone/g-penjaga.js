// Penjaga Laut (PlayGame, 1,8 GB virtual) — tembak balon air ke perompak kartun yang lucu. Tanpa kekerasan grafis: perompak "plop" jadi gelembung. Tanpa koin/hadiah.
(function () {
"use strict";
const NW = window.NW, K = NW.phoneKit, W = 270, H = 330, TX = 135, TY = 300;
function make(env) {
  const rm = env.rm(), ens = [], shots = [], pops = []; let t = 0, spawn = 0.6, cd = 0, lives = 3, score = 0, kills = 0;
  const fire = (px, py) => { if (cd > 0) return; const a = Math.atan2(py - TY, px - TX); shots.push({ x: TX, y: TY - 8, vx: Math.cos(a) * 440, vy: Math.sin(a) * 440 }); cd = 0.22; K.beep(760, 0.05); };
  const g = { score: 0, over: false, get lives() { return lives; },
    tap(px, py) { fire(px, Math.min(py, TY - 24)); },
    press(k, d) { if (k === "F" && d) { let b = null; for (const e of ens) if (!b || e.y > b.y) b = e; if (b) fire(b.x, b.y); else fire(TX, 40); } },
    update(dt) {
      t += dt; cd -= dt; spawn -= dt; if (spawn <= 0) { spawn = Math.max(0.45, 1.3 - kills * 0.02); ens.push({ x: 24 + env.rnd() * (W - 48), y: -16, v: (34 + Math.min(50, kills * 0.9)) * (rm ? 0.8 : 1), ph: env.rnd() * 6, hat: Math.floor(env.rnd() * 3) }); }
      for (const e of ens) { e.y += e.v * dt; e.x += Math.sin(t * 2 + e.ph) * 14 * dt; }
      for (const s of shots) { s.x += s.vx * dt; s.y += s.vy * dt; }
      for (const s of shots) for (const e of ens) if (!e.dead && !s.dead && Math.hypot(s.x - e.x, s.y - e.y) < 19) { e.dead = true; s.dead = true; kills++; score += 10; pops.push({ x: e.x, y: e.y, a: 1 }); K.beep(920, 0.07); }
      for (let i = ens.length - 1; i >= 0; i--) { const e = ens[i]; if (e.dead) ens.splice(i, 1); else if (e.y > TY - 14) { ens.splice(i, 1); lives--; K.beep(180, 0.15, "sawtooth"); if (lives <= 0) g.over = true; } }
      for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; if (s.dead || s.x < -10 || s.x > W + 10 || s.y < -10) shots.splice(i, 1); }
      for (const p of pops) { p.a -= dt * (rm ? 3 : 1.4); p.y -= (rm ? 0 : 30) * dt; } while (pops.length && pops[0].a <= 0) pops.shift();
      g.score = score;
    },
    draw(c) {
      c.fillStyle = "#1b87ad"; c.fillRect(0, 0, W, H); if (!rm) { c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 2; for (let y = 20; y < H; y += 46) { c.beginPath(); for (let x = 0; x <= W; x += 10) c.lineTo(x, y + Math.sin(x / 14 + t * 2 + y) * 3); c.stroke(); } }
      c.fillStyle = "#f2d589"; c.fillRect(0, TY - 6, W, H - TY + 6); c.fillStyle = "#fff"; c.fillRect(TX - 9, TY - 34, 18, 34); c.fillStyle = "#e0504a"; c.fillRect(TX - 9, TY - 24, 18, 6); c.fillRect(TX - 9, TY - 10, 18, 6); c.fillStyle = "#ffd447"; c.beginPath(); c.arc(TX, TY - 38, 7, 0, 7); c.fill();
      for (const s of shots) { c.fillStyle = "#bfe9ff"; c.beginPath(); c.arc(s.x, s.y, 6, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(s.x - 2, s.y - 2, 2, 0, 7); c.fill(); }
      for (const e of ens) { c.fillStyle = "#7a5230"; c.beginPath(); c.moveTo(e.x - 18, e.y + 6); c.lineTo(e.x + 18, e.y + 6); c.lineTo(e.x + 12, e.y + 16); c.lineTo(e.x - 12, e.y + 16); c.fill(); c.fillStyle = "#f2c9a0"; c.beginPath(); c.arc(e.x, e.y - 2, 9, 0, 7); c.fill(); c.fillStyle = e.hat === 0 ? "#222" : e.hat === 1 ? "#c0392b" : "#6a5acd"; c.fillRect(e.x - 11, e.y - 12, 22, 6); c.fillRect(e.x - 7, e.y - 18, 14, 7); c.fillStyle = "#222"; c.fillRect(e.x - 4, e.y - 4, 2, 2); c.fillRect(e.x + 3, e.y - 4, 2, 2); c.fillRect(e.x - 3, e.y + 2, 7, 1.5); }
      for (const p of pops) { c.fillStyle = "rgba(255,255,255," + Math.max(0, p.a) + ")"; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(p.x + Math.cos(i * 1.3) * (1 - p.a) * 22, p.y + Math.sin(i * 1.3) * (1 - p.a) * 22, 5 - i * 0.6, 0, 7); c.fill(); } K.text(c, "plop!", p.x, p.y - 12 - (1 - p.a) * 10, 12, "rgba(255,255,255," + Math.max(0, p.a) + ")"); }
      for (let i = 0; i < 3; i++) K.text(c, i < lives ? "❤️" : "🤍", 18 + i * 20, 20, 15, "#fff");
    } };
  return g;
}
NW.phoneGames.penjagalaut = { title: "Penjaga Laut", mount: (host, x) => K.create(host, { id: "penjagalaut", title: "Penjaga Laut", W, H, how: ["Ketuk laut untuk menembakkan balon air dari menara.", "Perompak kartun yang kena akan 'plop' jadi gelembung.", "Jangan biarkan mereka mencapai pantai — nyawamu 3.", "Tombol Tembak membidik perompak terdekat."], pad: [{ k: "F", label: "Tembak" }], keys: { " ": "F", Enter: "F" }, make }, x) };
})();
