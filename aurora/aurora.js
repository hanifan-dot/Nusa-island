// =========================================================
//  NUSA ISLAND — Gamepass "Pancing Aurora Samudra" (sisi game). Modul: NW.aurora
//  • Tampilan: pancing fantasi biru-ungu, cahaya aurora, partikel bintang, petir kecil, efek air, animasi lempar & tarik. Efek Rendah/Sedang/Tinggi (tersimpan di perangkat).
//  • BONUS PELUANG TIDAK dihitung di sini. Server (economy/aurora-core.js, di ecoCatch) yang memutuskan dari kepemilikan NYATA; klien hanya menampilkan hasil (applySwaps).
//  • Kepemilikan = entitlement dari server (NW.shop.owned().pancing_aurora). Tanpa itu: tidak ada pancing, efek, maupun bonus.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa;
const KEY = "nusa_aur_fx", LABEL = ["Rendah", "Sedang", "Tinggi"], CAP = [28, 70, 140];
const SPEC = { blank: "#4a3fc4", w: 3.3, grip: "#171244", gripLen: 0.36, reel: { col: "#9fe8ff", r: 3.3 }, node: false, accent: { kind: "aurora", col: "#8fd9ff" }, name: "Pancing Aurora Samudra" };
let level = 1;
try { const v = localStorage.getItem(KEY); level = v !== null && /^[012]$/.test(v) ? +v : (window.matchMedia && matchMedia("(pointer: coarse)").matches ? 1 : 2); } catch (e) {}
const setLevel = (n) => { level = Math.max(0, Math.min(2, n | 0)); try { localStorage.setItem(KEY, String(level)); } catch (e) {} };
const owned = () => !!(NW.shop && NW.shop.owned && NW.shop.owned().pancing_aurora);
const equipped = () => owned() && !!(NW.shop.has && NW.shop.has("joran", "pancing_aurora"));
const bonus = () => { const a = NW.eco && NW.eco.aur ? NW.eco.aur() : null; return a || null; };      // {own, live, n, up} dari SERVER (null = ekonomi server belum aktif)
const rodSpec = () => (equipped() ? SPEC : null);

// ---------- partikel ----------
const P = []; let lastT = 0;
const rnd = (a, b) => a + Math.random() * (b - a);
function spawn(k, x, y, n, o) {
  const cap = CAP[level]; o = o || {};
  for (let i = 0; i < n && P.length < cap; i++) P.push({ k, x: x + rnd(-3, 3), y: y + rnd(-3, 3), vx: (o.vx || 0) + rnd(-1, 1) * (o.sp || 40), vy: (o.vy || 0) + rnd(-1, 1) * (o.sp || 40) - (o.up || 0), life: 0, max: rnd(0.5, 1.1) * (o.l || 1), c: Math.random() < 0.5 ? "#8fe3ff" : Math.random() < 0.5 ? "#c39bff" : "#ffffff", r: rnd(1.2, 2.8) });
}
function event(kind, pos) {
  if (!equipped() || !pos) return;
  const N0 = [[4, 9, 16], [6, 14, 26], [3, 6, 10]];
  if (kind === "cast") spawn("star", pos.x, pos.y, N0[0][level], { sp: 70, up: 20 });
  else if (kind === "land") { spawn("drop", pos.x, pos.y, N0[1][level], { sp: 90, up: 120, l: 1.1 }); ring(pos.x, pos.y); }
  else if (kind === "bite") { spawn("star", pos.x, pos.y, N0[2][level], { sp: 50, up: 60 }); if (level > 0) bolt(pos.x, pos.y - 4, 10 + level * 6); }
  else if (kind === "reel") spawn("star", pos.x, pos.y, N0[0][level] + 2, { sp: 60 });
}
const R = []; const ring = (x, y) => { if (R.length < 8) R.push({ x, y, t: 0 }); };
const B = []; const bolt = (x, y, len) => { if (B.length < 6) B.push({ x, y, len, t: 0, seed: Math.random() * 99 }); };
function drawParticles(c) {
  if (!P.length && !R.length && !B.length) return;
  const now = performance.now() / 1000, dt = Math.min(0.05, lastT ? now - lastT : 0.016); lastT = now;
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.life += dt; if (p.life >= p.max) { P.splice(i, 1); continue; } const k = 1 - p.life / p.max;
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.k === "drop" ? 260 : 40) * dt; c.globalAlpha = k; c.fillStyle = p.c;
    if (p.k === "star") { const r = p.r * (1 + k); c.beginPath(); c.moveTo(p.x, p.y - r * 2); c.lineTo(p.x + r * 0.6, p.y - r * 0.6); c.lineTo(p.x + r * 2, p.y); c.lineTo(p.x + r * 0.6, p.y + r * 0.6); c.lineTo(p.x, p.y + r * 2); c.lineTo(p.x - r * 0.6, p.y + r * 0.6); c.lineTo(p.x - r * 2, p.y); c.lineTo(p.x - r * 0.6, p.y - r * 0.6); c.closePath(); c.fill(); }
    else { c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); } }
  for (let i = R.length - 1; i >= 0; i--) { const r = R[i]; r.t += dt; if (r.t > 0.9) { R.splice(i, 1); continue; } const k = r.t / 0.9; c.globalAlpha = 0.7 * (1 - k); c.strokeStyle = "#9fe8ff"; c.lineWidth = 2; c.beginPath(); c.ellipse(r.x, r.y, 10 + k * 46, (10 + k * 46) * 0.32, 0, 0, 7); c.stroke(); c.strokeStyle = "#c39bff"; c.beginPath(); c.ellipse(r.x, r.y, 6 + k * 30, (6 + k * 30) * 0.32, 0, 0, 7); c.stroke(); }
  for (let i = B.length - 1; i >= 0; i--) { const b = B[i]; b.t += dt; if (b.t > 0.28) { B.splice(i, 1); continue; } c.globalAlpha = 1 - b.t / 0.28; c.strokeStyle = "#e8f6ff"; c.lineWidth = 1.6; c.shadowColor = "#8fd9ff"; c.shadowBlur = 8; c.beginPath(); let x = b.x, y = b.y; c.moveTo(x, y); for (let s = 1; s <= 5; s++) { x += Math.sin(b.seed + s * 7.1) * 7; y -= b.len / 5; c.lineTo(x, y); } c.stroke(); }
  c.restore();
}
// glow & bintang yang mengitari ujung joran; petir kecil acak di level Tinggi. lv/t opsional (dipakai pratinjau toko)
function rodFx(c, tip, U, t, lv) {
  lv = lv === undefined ? level : lv; if (lv === undefined) return; t = t === undefined ? performance.now() / 1000 : t; U = U || 1;
  c.save(); c.globalCompositeOperation = "lighter";
  const g = c.createRadialGradient(tip.x, tip.y, 1, tip.x, tip.y, (16 + 6 * lv) * U); g.addColorStop(0, "rgba(160,235,255,.75)"); g.addColorStop(0.5, "rgba(150,110,255,.35)"); g.addColorStop(1, "rgba(120,80,255,0)");
  c.globalAlpha = 0.75 + 0.25 * Math.sin(t * 3); c.fillStyle = g; c.beginPath(); c.arc(tip.x, tip.y, (16 + 6 * lv) * U, 0, 7); c.fill();
  if (lv >= 1) for (let i = 0; i < 3 + lv; i++) { const a = t * 1.6 + i * (6.283 / (3 + lv)), r = (11 + 3 * Math.sin(t * 2 + i)) * U, x = tip.x + Math.cos(a) * r, y = tip.y + Math.sin(a) * r * 0.6, s = (1.6 + Math.sin(t * 4 + i)) * U; c.globalAlpha = 0.9; c.fillStyle = i % 2 ? "#c39bff" : "#bff3ff"; c.beginPath(); c.moveTo(x, y - s * 2); c.lineTo(x + s * .6, y - s * .6); c.lineTo(x + s * 2, y); c.lineTo(x + s * .6, y + s * .6); c.lineTo(x, y + s * 2); c.lineTo(x - s * .6, y + s * .6); c.lineTo(x - s * 2, y); c.lineTo(x - s * .6, y - s * .6); c.closePath(); c.fill(); }
  if (lv >= 2 && (t * 1.7) % 1 < 0.22) { c.globalAlpha = 1; c.strokeStyle = "#f0fbff"; c.lineWidth = 1.5 * U; c.shadowColor = "#8fd9ff"; c.shadowBlur = 8; const sd = Math.floor(t * 1.7) * 13.7; c.beginPath(); let x = tip.x, y = tip.y; c.moveTo(x, y); for (let s = 1; s <= 4; s++) { x += Math.sin(sd + s * 5.3) * 6 * U; y -= 5 * U; c.lineTo(x, y); } c.stroke(); }
  c.restore();
}
// pita aurora di sepanjang batang (dipanggil look.js drawHeldRod untuk accent.kind === "aurora")
function rodAccent(c, bez, nrm, U, night) {
  c.save(); c.lineCap = "round";
  for (let i = 0; i < 6; i++) { const t0 = 0.12 + i * 0.14, p = bez(t0), n = nrm(t0), col = i % 2 ? "#b78cff" : "#7fe3ff"; c.strokeStyle = night ? night(col) : col; c.lineWidth = 2.2 * U; c.beginPath(); c.moveTo(p[0] - n[0] * 2.6 * U, p[1] - n[1] * 2.6 * U); c.lineTo(p[0] + n[0] * 2.6 * U, p[1] + n[1] * 2.6 * U); c.stroke(); }
  c.restore();
}
// ---------- pratinjau Premium Shop ----------
function drawPreview(c, w, h, t, lv) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0b1030"); g.addColorStop(0.6, "#1d1a5c"); g.addColorStop(1, "#0a2a52"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.save(); c.globalCompositeOperation = "lighter";
  for (let b = 0; b < 3; b++) { const y0 = h * (0.22 + b * 0.12), gr = c.createLinearGradient(0, y0 - 18, 0, y0 + 26); const col = [["60,230,200", "120,120,255"], ["130,110,255", "60,200,255"], ["90,255,190", "170,100,255"]][b]; gr.addColorStop(0, `rgba(${col[0]},0)`); gr.addColorStop(0.5, `rgba(${col[1]},.35)`); gr.addColorStop(1, `rgba(${col[0]},0)`);
    c.fillStyle = gr; c.beginPath(); c.moveTo(0, y0); for (let x = 0; x <= w; x += 12) c.lineTo(x, y0 + Math.sin(x * 0.03 + t * (0.8 + b * 0.3) + b) * 10); c.lineTo(w, y0 + 40); c.lineTo(0, y0 + 40); c.closePath(); c.fill(); }
  c.fillStyle = "#fff"; for (let i = 0; i < 24; i++) { c.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + i * 2.1)); c.fillRect((i * 97.3) % w, (i * 53.7) % (h * 0.7), 1.4, 1.4); }
  c.restore();
  c.fillStyle = "rgba(20,80,150,.55)"; c.fillRect(0, h * 0.78, w, h * 0.22); c.strokeStyle = "rgba(160,230,255,.35)"; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0, h * (0.82 + i * 0.05)); for (let x = 0; x <= w; x += 10) c.lineTo(x, h * (0.82 + i * 0.05) + Math.sin(x * 0.07 + t * 2 + i) * 2); c.stroke(); }
  const U = h / 110, hp = { x: w * 0.22, y: h * 0.8 }, tip = { x: w * 0.78, y: h * 0.2 + Math.sin(t * 1.4) * 4 }, mid = { x: (hp.x + tip.x) / 2 + 10 * U, y: (hp.y + tip.y) / 2 - 6 * U };
  try { NW.look.drawHeldRod(c, SPEC, hp, mid, tip, { x: hp.x - 26 * U, y: hp.y + 14 * U }, U, (x) => x); } catch (e) {}
  rodFx(c, tip, U, t, lv === undefined ? level : lv);
  const bx = tip.x + 6 * U, by = h * 0.8; c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1; c.beginPath(); c.moveTo(tip.x, tip.y); c.quadraticCurveTo(tip.x + 14 * U, by - 20 * U, bx, by); c.stroke();
  c.fillStyle = "#e2574c"; c.beginPath(); c.arc(bx, by, 4 * U, Math.PI, 0); c.fill(); c.fillStyle = "#fbfbf6"; c.beginPath(); c.arc(bx, by, 4 * U, 0, Math.PI); c.fill();
  const k = (t * 0.7) % 1; c.strokeStyle = `rgba(159,232,255,${0.7 * (1 - k)})`; c.beginPath(); c.ellipse(bx, by + 2, 6 + k * 26, (6 + k * 26) * 0.3, 0, 0, 7); c.stroke();
}
// ---------- hasil server → tampilan ----------
function applySwaps(sw) {
  if (!Array.isArray(sw) || !sw.length) return;
  const S = N().S, by = N().FISH_BY_ID || {};
  for (const s of sw) {
    const it = (S.cooler || []).find((x) => x && x.uid === s.u); if (!it || !by[s.id]) continue;
    const from = by[s.from] ? by[s.from].name : s.from; it.id = s.id; it.w = s.w;
    N().toast(`✨ Aurora Samudra: ${from} berubah menjadi ${by[s.id].name} (Langka)!`, "good");
    if (NW.world && NW.world.player) { const pl = NW.world.player; event("land", { x: window.innerWidth / 2, y: window.innerHeight * 0.55 }); }
  }
  try { N().save(); N().refreshHUD(); } catch (e) {}
}
// pasang otomatis sebagai joran aktif saat pertama kali kepemilikan terverifikasi server terlihat
let seen = false;
const SEEN_KEY = "nusa-aur-seen";
function tick() { try { const S0 = N().S; if (seen && !(S0 && S0.shop && S0.shop.aurSeen !== undefined)) return; if (!owned()) return; const S = N().S; if (!S.shop || typeof S.shop !== "object") S.shop = { v: 1, equip: {} }; if (!S.shop.equip) S.shop.equip = {};
  // Penanda "sudah dilihat" disimpan di perangkat, BUKAN di S.shop (validator Cloud Save menolak kunci tak dikenal). Migrasi data lama: cadangkan, pindahkan penanda, hapus kunci.
  let flag = false; try { flag = localStorage.getItem(SEEN_KEY) === "1"; } catch (e) {}
  if (S.shop.aurSeen !== undefined) { try { localStorage.setItem("nusa-island-v1-backup-pulih-aurseen-" + Date.now(), JSON.stringify(S)); localStorage.setItem(SEEN_KEY, "1"); flag = true; } catch (e) { return; } delete S.shop.aurSeen; N().save(); }
  if (!seen) { seen = true; if (!S.shop.equip.joran && !flag) { S.shop.equip.joran = "pancing_aurora"; try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {} N().save(); } } } catch (e) {} }
setInterval(tick, 1500);
NW.aurora = { SPEC, LABEL, owned, equipped, bonus, rodSpec, level: () => level, setLevel, event, rodFx, rodAccent, drawParticles, drawPreview, applySwaps };
})();
