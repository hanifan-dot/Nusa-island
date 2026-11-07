// =========================================================
//  NUSA ISLAND — NUSA STYLE · Fashion & Avatar Studio. Toko pakaian 2.5D isometrik di kawasan baru Tanjung Lampu (Muara Kampung).
//  Pemain mendekat → tekan Interaksi → masuk ke studio (overlay ringan: kanvas 30fps hanya saat terbuka). "Keluar Toko" selalu terlihat;
//  setelah keluar pemain kembali TEPAT ke posisi & arah sebelum masuk. Pembelian & penyimpanan penampilan memakai Editor Avatar yang sudah ada
//  (validasi server: ecoFashionBuy/ecoFashionSave) — toko ini tidak menambah jalur ekonomi baru.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa, TAU = Math.PI * 2;
const area = NW.areas.get("muara"), M = area.map;
const B = { id: "nustyle", kind: "house", x0: 21.2, y0: 37.0, x1: 25.8, y1: 39.6, h: 60, door: "y", roof: "#2b8f86", wall: "#f6e9e1", name: "NUSA STYLE" };
const SPOT = { x: 23.5, y: 40.75 };
const TEAL = "#1fa89a", CORAL = "#ef6f5a", CREAM = "#fff3ea", INK = "#173f50", GOLD = "#f0c53a";
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

// ---------- 1) bangunan 2.5D di peta ----------
function building(c, b, t, night) {
  const P = NW.P, a = P(b.x0, b.y0, 0), bb = P(b.x1, b.y0, 0), d = P(b.x1, b.y1, 0), e = P(b.x0, b.y1, 0), H = b.h;
  c.save();
  c.fillStyle = "#cdbfae"; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(bb.x, bb.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); c.fill();   // lantai teras
  const wall = (p, q, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.lineTo(q.x, q.y - H); c.lineTo(p.x, p.y - H); c.closePath(); c.fill(); };
  wall(d, bb, "#e3d2c6"); wall(e, d, "#f9eee6");                                                                      // kanan (gelap) & depan-kiri (terang)
  const L = (u, v) => ({ x: e.x + (d.x - e.x) * u, y: e.y + (d.y - e.y) * u - v });                                   // titik di dinding depan: u 0..1, v tinggi
  const quad = (u0, v0, u1, v1, col, stroke) => { const p0 = L(u0, v0), p1 = L(u1, v0), p2 = L(u1, v1), p3 = L(u0, v1); c.fillStyle = col; c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); c.closePath(); c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); } };
  // etalase kaca besar (kiri) + pintu masuk (kanan) dengan kanopi bergaris
  quad(0.07, 8, 0.52, 40, night ? "#ffe3a8" : "#bfe9ee", INK);
  for (let i = 0; i < 2; i++) { const u = 0.14 + i * 0.2, p = L(u, 8); c.fillStyle = [CORAL, TEAL][i]; c.beginPath(); c.arc(p.x + 3, p.y - 17, 4, 0, TAU); c.fill(); c.fillRect(p.x + 1.5, p.y - 14, 3, 11); c.fillStyle = ["#2f6f9c", "#e0a31c"][i]; c.fillRect(p.x - 2, p.y - 24 + 5, 10, 12); }     // manekin
  quad(0.62, 0, 0.88, 36, night ? "#ffd98a" : "#7fd1c7", INK);                                                        // pintu
  quad(0.64, 2, 0.86, 34, "rgba(255,255,255,.25)");
  const kn = L(0.84, 17); c.fillStyle = GOLD; c.beginPath(); c.arc(kn.x, kn.y, 2, 0, TAU); c.fill();
  const aw0 = L(0.56, 44), aw1 = L(0.94, 44);                                                                         // kanopi
  for (let i = 0; i < 6; i++) { const u0 = 0.56 + i * 0.0633, u1 = u0 + 0.0633, p0 = L(u0, 44), p1 = L(u1, 44); c.fillStyle = i % 2 ? CREAM : CORAL; c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(p1.x + 5, p1.y + 12); c.lineTo(p0.x + 5, p0.y + 12); c.closePath(); c.fill(); }
  // atap datar modern + lis toska
  c.fillStyle = TEAL; c.beginPath(); c.moveTo(e.x - 5, e.y - H); c.lineTo(a.x - 5, a.y - H - 8); c.lineTo(bb.x + 5, bb.y - H - 8); c.lineTo(d.x + 5, d.y - H); c.closePath(); c.fill();
  c.fillStyle = "#17857a"; c.beginPath(); c.moveTo(e.x - 5, e.y - H); c.lineTo(d.x + 5, d.y - H); c.lineTo(d.x + 5, d.y - H + 7); c.lineTo(e.x - 5, e.y - H + 7); c.closePath(); c.fill();
  // papan nama NUSA STYLE di atas dinding depan
  const cx = (e.x + d.x) / 2, cy = (e.y + d.y) / 2 - H + 20, sk = (d.y - e.y) / (d.x - e.x || 1);
  c.save(); c.translate(cx, cy); c.transform(1, sk, 0, 1, 0, 0);
  const g = c.createLinearGradient(-54, 0, 54, 0); g.addColorStop(0, "#14304a"); g.addColorStop(1, "#1d4f63"); c.fillStyle = g; rr(c, -56, -14, 112, 28, 6); c.fill(); c.strokeStyle = night ? "#ffd1f0" : GOLD; c.lineWidth = 2; c.stroke();
  c.fillStyle = "#fff6e0"; c.font = "800 14px system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; if (night) { c.shadowColor = "#ff9ad8"; c.shadowBlur = 8; } c.fillText("NUSA STYLE", 0, -3);
  c.shadowBlur = 0; c.fillStyle = "#9fe8dc"; c.font = "700 7.5px system-ui,sans-serif"; c.fillText("FASHION & AVATAR STUDIO", 0, 8); c.restore();
  // lampu kecil pintu
  if (night) { const p = L(0.75, 46), rg = c.createRadialGradient(p.x, p.y, 1, p.x, p.y, 38); rg.addColorStop(0, "rgba(255,200,120,.6)"); rg.addColorStop(1, "rgba(255,200,120,0)"); c.fillStyle = rg; c.fillRect(p.x - 38, p.y - 38, 76, 76); }
  c.restore();
}
(function mount() {
  const near = (o) => o.x > B.x0 - 1.0 && o.x < B.x1 + 1.0 && o.y > B.y0 - 1.0 && o.y < SPOT.y + 0.9;
  for (let i = M.objects.length - 1; i >= 0; i--) if (near(M.objects[i])) M.objects.splice(i, 1);
  for (let i = M.solids.length - 1; i >= 0; i--) { const s = M.solids[i]; if (s.r !== undefined && near(s)) M.solids.splice(i, 1); }
  M.buildings.push(Object.assign({}, B, { draw: (c, b, t, night) => building(c, b, t, night) }));
  M.solids.push({ x0: B.x0 + 0.02, y0: B.y0 + 0.02, x1: B.x1 - 0.02, y1: B.y1 - 0.02 });
  M.points.push({ id: "nustyle", x: SPOT.x, y: SPOT.y, r: 1.5, icon: "🚪", label: "Masuk NUSA STYLE" });
  M.lights.push({ x: SPOT.x, y: SPOT.y - 0.6, z: 30, r: 56, col: "#ffc98a", k: 1.0 });
})();

// ---------- 2) studio (interior) ----------
let root = null, cv = null, raf = 0, lastT = 0, open = false, ret = null, dir = 2, spin = true, spinT = 0, ch = null, hint = "";
const ICON = {
  out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5M14 8l5 4-5 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  hang: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6a2 2 0 1 1 2 2c-1 .4-2 .8-2 2v1M3 18l9-6 9 6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5zM9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  l: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  r: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
function build() {
  if (root) return;
  root = document.createElement("div"); root.id = "styleShop"; root.className = "ns-room hidden"; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "NUSA STYLE — Fashion & Avatar Studio");
  root.innerHTML = `<canvas id="nsCv"></canvas><div class="ns-title" id="nsTitle">NUSA STYLE · Fashion &amp; Avatar Studio</div>
    <button type="button" class="ns-b ns-exit" id="nsExit" aria-label="Keluar Toko">${ICON.out}Keluar Toko</button>
    <button type="button" class="ns-b ns-rot l" id="nsL" aria-label="Putar ke kiri">${ICON.l}</button><button type="button" class="ns-b ns-rot r" id="nsR" aria-label="Putar ke kanan">${ICON.r}</button>
    <div class="ns-bar"><button type="button" class="ns-b main" id="nsEdit">${ICON.hang}Ganti Penampilan</button><button type="button" class="ns-b gold" id="nsShop">${ICON.bag}Toko Fashion</button></div>`;
  document.body.appendChild(root); cv = root.querySelector("#nsCv");
  root.querySelector("#nsExit").addEventListener("click", () => leave());
  root.querySelector("#nsEdit").addEventListener("click", () => { try { N().sfx("click"); } catch (e) {} NW.avatarUI && NW.avatarUI.open("edit"); });
  root.querySelector("#nsShop").addEventListener("click", () => { try { N().sfx("click"); } catch (e) {} NW.avatarUI && NW.avatarUI.open("shop"); });
  root.querySelector("#nsL").addEventListener("click", () => { spin = false; dir = (dir + 7) % 8; });
  root.querySelector("#nsR").addEventListener("click", () => { spin = false; dir = (dir + 1) % 8; });
  window.addEventListener("keydown", (e) => { if (open && e.key === "Escape" && !N().isPanelOpen()) leave(); });
}
const fadeEl = () => document.getElementById("fade");
function enter() {
  if (open) return; build(); const w = NW.world, p = w.player;
  ret = { x: p.x, y: p.y, dir: p.dir, area: "muara" };                           // posisi sebelum masuk
  const f = fadeEl(); f.classList.add("on");
  setTimeout(() => { open = true; document.body.classList.add("in-nustyle"); root.classList.remove("hidden"); resize(); mkch(); start(); f.classList.remove("on"); try { N().sfx("click"); } catch (e) {} }, 320);
}
function leave() {
  if (!open) return; const f = fadeEl(); f.classList.add("on");
  setTimeout(() => {
    open = false; document.body.classList.remove("in-nustyle"); root.classList.add("hidden"); stop();
    const p = NW.world.player; if (ret) { p.x = ret.x; p.y = ret.y; if (ret.dir !== undefined) p.dir = ret.dir; } try { NW.world.snapCamera && NW.world.snapCamera(); } catch (e) {}
    f.classList.remove("on");
  }, 320);
}
function resize() { const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(window.innerWidth * dpr * 0.75); cv.height = Math.round(window.innerHeight * dpr * 0.75); }
window.addEventListener("resize", () => { if (open) resize(); });
function mkch() { ch = { x: 0, y: 0, z: 0, dir, walk: 0, moving: false, seed: 0, rod: 0, isMe: true, style: null }; }
function start() { if (!raf) { lastT = 0; raf = requestAnimationFrame(frame); } }
function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

function frame(ts) {
  raf = requestAnimationFrame(frame); if (ts - lastT < 33) return; lastT = ts; const t = ts / 1000, c = cv.getContext("2d"), W = cv.width, H = cv.height;
  if (spin && t - spinT > 1.2) { spinT = t; dir = (dir + 1) % 8; }
  draw(c, W, H, t);
}
function draw(c, W, H, t) {
  const u = Math.min(W / 420, H / 760), cx = W / 2, fy = H * 0.64;       // pusat lantai
  c.clearRect(0, 0, W, H);
  const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#3a2a47"); bg.addColorStop(1, "#1d1626"); c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const hw = 186 * u, hh = 93 * u, wallH = 270 * u;                       // ruang isometrik: lantai belah ketupat
  const top = { x: cx, y: fy - hh }, rgt = { x: cx + hw, y: fy }, bot = { x: cx, y: fy + hh }, lft = { x: cx - hw, y: fy };
  // dinding belakang kiri & kanan
  const wallQ = (p, q, g0, g1) => { const g = c.createLinearGradient(0, p.y - wallH, 0, p.y); g.addColorStop(0, g0); g.addColorStop(1, g1); c.fillStyle = g; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.lineTo(q.x, q.y - wallH); c.lineTo(p.x, p.y - wallH); c.closePath(); c.fill(); };
  wallQ(lft, top, "#f7d8cf", "#efc0b4"); wallQ(top, rgt, "#d6efe9", "#b6ddd4");
  // papan neon & lis
  c.save(); c.translate(top.x, top.y - wallH + 34 * u); c.fillStyle = "rgba(20,10,35,.82)"; rr(c, -92 * u, -17 * u, 184 * u, 34 * u, 8 * u); c.fill(); c.strokeStyle = "#ff8fd0"; c.lineWidth = 2.2 * u; c.shadowColor = "#ff8fd0"; c.shadowBlur = 10 * u; c.stroke();
  c.fillStyle = "#ffe2f4"; c.font = `800 ${19 * u}px system-ui,sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("NUSA STYLE", 0, -2 * u); c.shadowBlur = 0; c.fillStyle = "#9fe8dc"; c.font = `700 ${8.5 * u}px system-ui,sans-serif`; c.fillText("FASHION & AVATAR STUDIO", 0, 11 * u); c.restore();
  // cermin besar di dinding kanan
  const onR = (s, hgt) => ({ x: top.x + (rgt.x - top.x) * s, y: top.y + (rgt.y - top.y) * s - hgt * u });
  const mq = [onR(0.5, 30), onR(0.82, 30), onR(0.82, 160), onR(0.5, 160)]; c.fillStyle = "#cfe9f3"; c.beginPath(); c.moveTo(mq[0].x, mq[0].y); for (const p of mq.slice(1)) c.lineTo(p.x, p.y); c.closePath(); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 3 * u; c.stroke();
  c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.moveTo(mq[0].x + 10 * u, mq[0].y); c.lineTo(mq[0].x + 28 * u, mq[0].y); c.lineTo(mq[3].x + 48 * u, mq[3].y + 4 * u); c.lineTo(mq[3].x + 28 * u, mq[3].y + 4 * u); c.closePath(); c.fill();
  // rak baju di dinding kiri (gantungan + baju berwarna) & rak topi
  const onL = (s, hgt) => ({ x: lft.x + (top.x - lft.x) * s, y: lft.y + (top.y - lft.y) * s - hgt * u });
  const r0 = onL(0.12, 120), r1 = onL(0.78, 120); c.strokeStyle = "#8a6a4a"; c.lineWidth = 4 * u; c.beginPath(); c.moveTo(r0.x, r0.y); c.lineTo(r1.x, r1.y); c.stroke();
  const cols = ["#ef6f5a", "#1fa89a", "#f0c53a", "#4a7fb5", "#b05cff", "#e9e6dc", "#c24a4a"];
  for (let i = 0; i < 7; i++) { const s = 0.17 + i * 0.085, p = onL(s, 120); c.strokeStyle = "#6a4a2a"; c.lineWidth = 1.6 * u; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x, p.y + 6 * u); c.stroke(); c.fillStyle = cols[i]; c.beginPath(); c.moveTo(p.x - 12 * u, p.y + 8 * u); c.lineTo(p.x - 5 * u, p.y + 6 * u); c.lineTo(p.x, p.y + 10 * u); c.lineTo(p.x + 5 * u, p.y + 6 * u); c.lineTo(p.x + 12 * u, p.y + 8 * u); c.lineTo(p.x + 10 * u, p.y + 40 * u); c.lineTo(p.x - 10 * u, p.y + 40 * u); c.closePath(); c.fill(); }
  const sh = [onL(0.15, 50), onL(0.74, 50)]; c.strokeStyle = "#8a6a4a"; c.lineWidth = 5 * u; c.beginPath(); c.moveTo(sh[0].x, sh[0].y); c.lineTo(sh[1].x, sh[1].y); c.stroke();
  for (let i = 0; i < 4; i++) { const p = onL(0.22 + i * 0.15, 50); c.fillStyle = ["#f2efe6", "#8a5a32", "#1f2a44", "#f0c53a"][i]; c.beginPath(); c.ellipse(p.x, p.y - 7 * u, 12 * u, 6 * u, 0, 0, TAU); c.fill(); c.fillRect(p.x - 7 * u, p.y - 14 * u, 14 * u, 9 * u); }
  // lantai kayu
  c.fillStyle = "#b98a5e"; c.beginPath(); c.moveTo(top.x, top.y); c.lineTo(rgt.x, rgt.y); c.lineTo(bot.x, bot.y); c.lineTo(lft.x, lft.y); c.closePath(); c.fill();
  c.strokeStyle = "rgba(90,55,25,.35)"; c.lineWidth = 1.3 * u; for (let i = 1; i < 10; i++) { const s = i / 10; c.beginPath(); c.moveTo(lft.x + (top.x - lft.x) * s, lft.y + (top.y - lft.y) * s); c.lineTo(bot.x + (rgt.x - bot.x) * s, bot.y + (rgt.y - bot.y) * s); c.stroke(); }
  // karpet toska di depan + panggung bulat
  c.fillStyle = "rgba(31,168,154,.5)"; c.beginPath(); c.ellipse(cx, fy + 8 * u, 118 * u, 52 * u, 0, 0, TAU); c.fill();
  c.fillStyle = "#fff3ea"; c.beginPath(); c.ellipse(cx, fy + 16 * u, 66 * u, 27 * u, 0, 0, TAU); c.fill(); c.fillStyle = "#e6d3c3"; c.beginPath(); c.ellipse(cx, fy + 22 * u, 66 * u, 27 * u, 0, 0, Math.PI); c.fill();
  // sorotan
  const sg = c.createRadialGradient(cx, fy - 40 * u, 4, cx, fy - 40 * u, 190 * u); sg.addColorStop(0, "rgba(255,244,214,.45)"); sg.addColorStop(1, "rgba(255,244,214,0)"); c.fillStyle = sg; c.fillRect(cx - 200 * u, fy - 230 * u, 400 * u, 330 * u);
  // tirai ruang ganti (sudut kiri bawah) & tanaman
  c.fillStyle = "#ef6f5a"; c.fillRect(lft.x + 8 * u, lft.y + 4 * u - 120 * u, 14 * u, 120 * u); c.fillStyle = "#f8a99b"; for (let i = 0; i < 4; i++) c.fillRect(lft.x + 22 * u + i * 13 * u, lft.y + 4 * u - 120 * u, 11 * u, 118 * u + (i % 2) * 4 * u);
  c.fillStyle = "#6a4a2a"; c.fillRect(rgt.x - 34 * u, rgt.y - 4 * u, 20 * u, 22 * u); c.fillStyle = "#3f8f4a"; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(rgt.x - 24 * u + (i - 2) * 6 * u, rgt.y - 18 * u - (i % 2) * 7 * u, 5 * u, 15 * u, (i - 2) * 0.35, 0, TAU); c.fill(); }
  // karakter pemain (karakter yang sama dengan di dunia)
  if (ch && NW.drawCharacter && NW.avatarDraw && NW.avatar) {
    ch.dir = dir; ch.moving = false; ch.walk = 0; try { ch.style = NW.avatarDraw.styleFor(NW.avatar.code(), NW._baseStyle || (NW.world && NW.world.player && NW.world.player.style) || {}); } catch (e) {}
    c.save(); c.translate(cx, fy + 14 * u); c.scale(3.1 * u, 3.1 * u); try { NW.drawCharacter(c, ch, t); } catch (e) {} c.restore();
  }
}
// ---------- 3) interaksi di peta ----------
const H = area.hooks, oi = H.interact;
H.interact = (tg, api) => { if (tg && tg.id === "nustyle") { enter(); return; } return oi ? oi(tg, api) : undefined; };
NW.styleShop = { enter, leave, isOpen: () => open, B, SPOT, building, _ret: () => ret, _dir: (d) => { dir = d; spin = false; } };
})();
