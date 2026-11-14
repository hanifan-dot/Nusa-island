// Karang Blast (PlayGame, 0,35 GB virtual) — puzzle blok 8×8. Ketuk potongan di bawah lalu ketuk papan. Tanpa koin/hadiah.
(function () {
"use strict";
const NW = window.NW, K = NW.phoneKit, W = 270, H = 330, N = 8, CS = 30, BX = 15, BY = 8;
const SHAPES = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [0, 1], [0, 2], [1, 2]]];
const COL = ["#ff7a59", "#ffd447", "#2fb39a", "#6a5acd", "#3d9bd4", "#e05a7a"];
function make(env) {
  const rm = env.rm(), b = Array.from({ length: N }, () => Array(N).fill(0)), flash = []; let tray = [], sel = -1, score = 0;
  const pick = () => ({ s: SHAPES[Math.floor(env.rnd() * SHAPES.length)], c: 1 + Math.floor(env.rnd() * COL.length), used: false });
  const refill = () => { tray = [pick(), pick(), pick()]; sel = -1; };
  const fits = (s, ox, oy) => s.every(([x, y]) => { const cx = ox + x, cy = oy + y; return cx >= 0 && cy >= 0 && cx < N && cy < N && !b[cy][cx]; });
  const any = (s) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(s, x, y)) return true; return false; };
  const g = { score: 0, over: false, get tray() { return tray; },
    tap(px, py) {
      if (py > BY + N * CS + 10) { const i = Math.floor((px - 10) / 85); if (i >= 0 && i < 3 && !tray[i].used) { sel = sel === i ? -1 : i; K.beep(480, 0.04); } return; }
      if (sel < 0) return; const cx = Math.floor((px - BX) / CS), cy = Math.floor((py - BY) / CS); if (cx < 0 || cy < 0 || cx >= N || cy >= N) return;
      const p = tray[sel]; let at = null; for (const [dx, dy] of p.s) if (!at && fits(p.s, cx - dx, cy - dy)) at = [cx - dx, cy - dy]; if (!at) { K.beep(150, 0.08); return; }
      for (const [dx, dy] of p.s) b[at[1] + dy][at[0] + dx] = p.c; score += p.s.length; p.used = true; sel = -1; K.beep(600, 0.05);
      const rows = [], cols = []; for (let i = 0; i < N; i++) { if (b[i].every((v) => v)) rows.push(i); if (b.every((r) => r[i])) cols.push(i); }
      for (const r of rows) for (let x = 0; x < N; x++) { flash.push({ x, y: r, a: 1 }); b[r][x] = 0; } for (const cc of cols) for (let y = 0; y < N; y++) { flash.push({ x: cc, y, a: 1 }); b[y][cc] = 0; }
      const n = rows.length + cols.length; if (n) { score += n * 10 + (n > 1 ? n * 5 : 0); K.beep(880, 0.1); }
      if (tray.every((q) => q.used)) refill(); if (!tray.some((q) => !q.used && any(q.s))) g.over = true;
    },
    update(dt) { for (const f of flash) f.a -= dt * (rm ? 4 : 2.2); while (flash.length && flash[0].a <= 0) flash.shift(); g.score = score; },
    draw(c) {
      c.fillStyle = "#16405c"; c.fillRect(0, 0, W, H); c.fillStyle = "#1d5478"; c.fillRect(BX - 3, BY - 3, N * CS + 6, N * CS + 6);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { c.fillStyle = b[y][x] ? COL[b[y][x] - 1] : "#235f86"; c.fillRect(BX + x * CS + 1, BY + y * CS + 1, CS - 2, CS - 2); if (b[y][x]) { c.fillStyle = "rgba(255,255,255,.28)"; c.fillRect(BX + x * CS + 3, BY + y * CS + 3, CS - 6, 5); } }
      for (const f of flash) { c.fillStyle = "rgba(255,255,255," + Math.max(0, f.a) + ")"; c.fillRect(BX + f.x * CS + 1, BY + f.y * CS + 1, CS - 2, CS - 2); }
      tray.forEach((p, i) => { const ox = 10 + i * 85, oy = BY + N * CS + 14; c.fillStyle = sel === i ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.08)"; c.fillRect(ox, oy - 4, 80, 68); if (p.used) return; const mw = Math.max(...p.s.map((q) => q[0])) + 1, mh = Math.max(...p.s.map((q) => q[1])) + 1, cs = Math.min(16, 56 / Math.max(mw, mh)), sx = ox + (80 - mw * cs) / 2, sy = oy + (62 - mh * cs) / 2 - 2; c.fillStyle = COL[p.c - 1]; for (const [x, y] of p.s) c.fillRect(sx + x * cs + 0.5, sy + y * cs + 0.5, cs - 1, cs - 1); });
    } };
  refill(); return g;
}
NW.phoneGames.karangblast = { title: "Karang Blast", mount: (host, x) => K.create(host, { id: "karangblast", title: "Karang Blast", W, H, how: ["Ketuk salah satu potongan di bawah, lalu ketuk papan untuk menaruhnya.", "Baris atau kolom yang penuh akan hancur dan memberi skor.", "Game over bila tidak ada potongan yang muat."], make }, x) };
})();
