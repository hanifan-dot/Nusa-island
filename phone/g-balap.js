// Balap Perahu (PlayGame, 1,2 GB virtual) — hindari batu & kayu apung, salip perahu lawan. Tanpa koin/hadiah; skor saja.
(function () {
"use strict";
const NW = window.NW, K = NW.phoneKit, W = 270, H = 330, LX = [58, 135, 212];
function make(env) {
  const rm = env.rm(), me = { lane: 1, x: LX[1], y: 270 }, obs = [], bubbles = []; let t = 0, spawn = 1.6, dist = 0, ov = 0, off = 0;
  const sp = () => (150 + Math.min(150, dist / 14)) * (rm ? 0.7 : 1);
  const g = { score: 0, over: false,
    press(k, d) { if (!d) return; if (k === "L" && me.lane > 0) me.lane--; else if (k === "R" && me.lane < 2) me.lane++; K.beep(380, 0.04); },
    tap(x) { this.press(x < W / 2 ? "L" : "R", true); },
    swipe(dx) { if (Math.abs(dx) > 24) this.press(dx < 0 ? "L" : "R", true); },
    update(dt) {
      t += dt; off = (off + sp() * dt) % 40; dist += sp() * dt; me.x += (LX[me.lane] - me.x) * Math.min(1, dt * 12);
      spawn -= dt; if (spawn <= 0) { spawn = Math.max(0.45, 1.05 - dist / 6000); const lane = Math.floor(env.rnd() * 3), k = env.rnd() < 0.3 ? "rival" : env.rnd() < 0.5 ? "batu" : "kayu"; obs.push({ k, x: LX[lane], y: -30, lane, passed: false, v: k === "rival" ? sp() * 0.55 : 0 }); }
      for (const o of obs) { o.y += (sp() - o.v) * dt; if (o.k === "rival" && o.y > me.y + 26 && !o.passed) { o.passed = true; ov++; K.beep(700, 0.06); } if (Math.abs(o.x - me.x) < 24 && Math.abs(o.y - me.y) < 28) g.over = true; }
      while (obs.length && obs[0].y > H + 40) obs.shift();
      if (!rm && env.rnd() < dt * 6) bubbles.push({ x: me.x + (env.rnd() - 0.5) * 10, y: me.y + 22, a: 1 }); for (const b of bubbles) { b.y += 40 * dt; b.a -= dt * 1.4; } while (bubbles.length && bubbles[0].a <= 0) bubbles.shift();
      g.score = dist / 10 + ov * 10;
    },
    draw(c) {
      c.fillStyle = "#1c8fb3"; c.fillRect(0, 0, W, H); c.fillStyle = "#2aa6c8"; for (let y = -40 + off; y < H; y += 40) { c.fillRect(0, y, W, 18); }
      c.strokeStyle = "rgba(255,255,255,.35)"; c.setLineDash([10, 14]); c.lineDashOffset = -off; for (const x of [96, 173]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } c.setLineDash([]);
      for (const b of bubbles) { c.fillStyle = "rgba(255,255,255," + Math.max(0, b.a * 0.6) + ")"; c.beginPath(); c.arc(b.x, b.y, 3, 0, 7); c.fill(); }
      for (const o of obs) { if (o.k === "batu") { c.fillStyle = "#5c6670"; c.beginPath(); c.arc(o.x, o.y, 17, 0, 7); c.fill(); c.fillStyle = "#7d8893"; c.beginPath(); c.arc(o.x - 5, o.y - 5, 7, 0, 7); c.fill(); } else if (o.k === "kayu") { c.fillStyle = "#8a5a2b"; c.fillRect(o.x - 24, o.y - 8, 48, 16); c.fillStyle = "#a8743c"; c.fillRect(o.x - 24, o.y - 8, 48, 5); } else boat(c, o.x, o.y, "#e0504a", "#fff"); }
      boat(c, me.x, me.y, "#ffd447", "#173f50");
    } };
  return g;
}
function boat(c, x, y, col, sail) { c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(x + 3, y + 6, 14, 22, 0, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 24); c.quadraticCurveTo(x + 17, y - 4, x + 12, y + 22); c.lineTo(x - 12, y + 22); c.quadraticCurveTo(x - 17, y - 4, x, y - 24); c.fill(); c.fillStyle = sail; c.fillRect(x - 6, y - 6, 12, 14); c.fillStyle = "rgba(0,0,0,.2)"; c.fillRect(x - 1, y - 20, 2, 12); }
NW.phoneGames.balapperahu = { title: "Balap Perahu", mount: (host, x) => K.create(host, { id: "balapperahu", title: "Balap Perahu", W, H, how: ["Geser perahu ke kiri/kanan: tombol ◀ ▶, ketuk sisi layar, atau geser jari.", "Hindari batu dan kayu apung.", "Salip perahu merah untuk bonus skor.", "Tabrakan = game over."], pad: [{ k: "L", label: "◀" }, { k: "R", label: "▶" }], keys: { ArrowLeft: "L", ArrowRight: "R", a: "L", d: "R" }, make }, x) };
})();
