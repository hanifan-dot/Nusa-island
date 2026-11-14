// Nusa Rush (PlayGame, 1,4 GB virtual) — pelari tanpa akhir di pantai. Tanpa koin/hadiah; "mutiara" hanya menambah skor.
(function () {
"use strict";
const NW = window.NW, K = NW.phoneKit, W = 270, H = 330, GY = 262;
function make(env) {
  const rm = env.rm(), p = { x: 54, y: GY, vy: 0, duck: false, air: false }, obs = [], pearls = []; let spawn = 0.8, dist = 0, pc = 0, t = 0, hold = 0;
  const speed = () => (130 + Math.min(150, dist / 16)) * (rm ? 0.75 : 1);
  const box = () => (p.duck ? { x: p.x - 11, y: p.y - 16, w: 22, h: 16 } : { x: p.x - 10, y: p.y - 34, w: 20, h: 34 });
  const g = { score: 0, over: false,
    press(k, d) { if (k === "J" && d && !p.air) { p.vy = -520; p.air = true; K.beep(520, 0.06); } if (k === "D") p.duck = !!d && !p.air; },
    tap() { this.press("J", true); },
    swipe(dx, dy) { if (dy > 24) { p.duck = true; hold = 0.5; } },
    update(dt) {
      t += dt; dist += speed() * dt; if (hold > 0) { hold -= dt; if (hold <= 0) p.duck = false; }
      p.vy += 1500 * dt; p.y += p.vy * dt; if (p.y >= GY) { p.y = GY; p.vy = 0; p.air = false; }
      spawn -= dt; if (spawn <= 0) { spawn = Math.max(0.6, 1.4 - dist / 5000) + env.rnd() * 0.5; const r = env.rnd(); obs.push(r < 0.4 ? { k: "kepiting", x: W + 20, y: GY - 14, w: 24, h: 14 } : r < 0.75 ? { k: "tong", x: W + 20, y: GY - 30, w: 22, h: 30 } : { k: "camar", x: W + 20, y: GY - 40, w: 26, h: 12 }); if (env.rnd() < 0.5) pearls.push({ x: W + 60 + env.rnd() * 60, y: GY - 50 - env.rnd() * 50, got: false }); }
      const v = speed() * dt; for (const o of obs) o.x -= v; for (const e of pearls) e.x -= v; while (obs.length && obs[0].x < -40) obs.shift(); while (pearls.length && pearls[0].x < -20) pearls.shift();
      const b = box(); for (const o of obs) if (K.hit(b, o)) g.over = true; for (const e of pearls) if (!e.got && K.hit(b, { x: e.x - 7, y: e.y - 7, w: 14, h: 14 })) { e.got = true; pc++; K.beep(880, 0.05); }
      g.score = dist / 12 + pc * 5;
    },
    draw(c) {
      c.fillStyle = "#8fdcf5"; c.fillRect(0, 0, W, GY); c.fillStyle = "#fff6c8"; c.beginPath(); c.arc(220, 56, 22, 0, 7); c.fill(); c.fillStyle = "#3aa0c8"; c.fillRect(0, GY - 50, W, 22);
      if (!rm) { c.fillStyle = "rgba(255,255,255,.8)"; for (const [x, y] of [[40, 40], [130, 70], [190, 30]]) { const xx = ((x - dist * 0.05) % (W + 60) + W + 60) % (W + 60) - 30; c.beginPath(); c.arc(xx, y, 11, 0, 7); c.arc(xx + 12, y + 3, 9, 0, 7); c.fill(); } }
      c.fillStyle = "#f2d589"; c.fillRect(0, GY, W, H - GY); c.fillStyle = "#e0bf6d"; for (let x = -((dist * 0.9) % 30); x < W; x += 30) c.fillRect(x, GY + 14, 12, 3);
      for (const e of pearls) if (!e.got) { c.fillStyle = "#fff"; c.beginPath(); c.arc(e.x, e.y, 6, 0, 7); c.fill(); c.fillStyle = "#cfe9ff"; c.beginPath(); c.arc(e.x - 2, e.y - 2, 2.2, 0, 7); c.fill(); }
      for (const o of obs) { if (o.k === "kepiting") { c.fillStyle = "#e0504a"; c.fillRect(o.x, o.y + 4, o.w, 10); c.fillRect(o.x - 4, o.y, 6, 6); c.fillRect(o.x + o.w - 2, o.y, 6, 6); } else if (o.k === "tong") { c.fillStyle = "#7a5230"; c.fillRect(o.x, o.y, o.w, o.h); c.fillStyle = "#a07040"; c.fillRect(o.x, o.y + 8, o.w, 4); c.fillRect(o.x, o.y + 20, o.w, 4); } else { c.fillStyle = "#fff"; c.fillRect(o.x, o.y + 3, o.w, 6); c.fillStyle = "#cfd8e0"; c.fillRect(o.x + 4, o.y - 3 + Math.sin(t * 18) * 3, 8, 5); } }
      const b = box(); c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(p.x, GY + 2, 12, 3, 0, 0, 7); c.fill();
      c.fillStyle = "#3d9bd4"; c.fillRect(b.x, b.y + (p.duck ? 0 : 10), b.w, b.h - (p.duck ? 0 : 10)); c.fillStyle = "#f2c9a0"; c.fillRect(b.x + 3, b.y - (p.duck ? 8 : 0), 14, 10); c.fillStyle = "#ffd447"; c.fillRect(b.x + 1, b.y - (p.duck ? 10 : 2), 18, 4);
      if (!rm && !p.air) { const l = Math.sin(t * 22) * 4; c.fillStyle = "#173f50"; c.fillRect(b.x + 3 + l, GY - 6, 5, 6); c.fillRect(b.x + 12 - l, GY - 6, 5, 6); }
    } };
  return g;
}
NW.phoneGames.nusarush = { title: "Nusa Rush", mount: (host, x) => K.create(host, { id: "nusarush", title: "Nusa Rush", W, H, how: ["Ketuk layar atau tombol Lompat untuk melompat.", "Tahan Tunduk (atau geser ke bawah) untuk menunduk di bawah camar.", "Kumpulkan mutiara untuk menambah skor.", "Menabrak rintangan = game over."], pad: [{ k: "J", label: "Lompat" }, { k: "D", label: "Tunduk" }], keys: { " ": "J", ArrowUp: "J", ArrowDown: "D", w: "J", s: "D" }, make }, x) };
})();
