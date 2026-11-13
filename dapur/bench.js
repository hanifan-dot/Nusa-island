// NUSA ISLAND — Ide 08C · Workstation jarak dekat (kompor/wajan, panci, pemanggang, talenan, gelas, meja saji, wastafel).
// HANYA TAMPILAN + sentuhan: layar kanvas besar di atas panel. Semua sentuhan diteruskan ke NW.dapurMasak sebagai NIAT (nama langkah) — server tetap satu-satunya penentu
// kualitas, kematangan, konsumsi bahan & ikan. Warna makanan / asap / gelembung minyak di sini adalah PETUNJUK perkiraan, bukan penilaian.
// Kontrol dibuat longgar untuk HP: sasaran sentuh besar, gerakan putar/gosok menghitung jarak jari (tidak perlu presisi).
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDapurCore; if (!Core) return;
const $ = (id) => document.getElementById(id), TAU = Math.PI * 2;
const W0 = 400, H0 = 300, TOP = 48;                          // ruang logis 400×300, dipas ke area di atas panel
const EMO = "'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
const B = { cv: null, c: null, dpr: 1, cw: 0, ch: 0, s: 1, ox: 0, oy: 0, hs: [], parts: [], raf: 0, t: 0, on: false, pressed: null, amb: 0, lastScene: "", sceneT: 0 };

// ---------- warna ----------
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = hex(a), Bc = hex(b), k = Math.max(0, Math.min(1, t)); return `rgb(${Math.round(A[0] + (Bc[0] - A[0]) * k)},${Math.round(A[1] + (Bc[1] - A[1]) * k)},${Math.round(A[2] + (Bc[2] - A[2]) * k)})`; };
const hexOf = (rgb) => { const m = /(\d+),(\d+),(\d+)/.exec(rgb); return "#" + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, "0")).join(""); };
function cooked(base, k) { const m = Math.max(0, Math.min(1, (k - 0.2) / 0.55)), g = Math.max(0, Math.min(1, (k - 0.78) / 0.22)); return mix(hexOf(mix(base, "#d99a45", m)), "#1b1511", g); }

// ---------- bantuan gambar ----------
const rr = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
const ell = (c, x, y, rx, ry, fill, stroke) => { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); } };
const text = (c, s, x, y, size, col, align, maxW) => {
  c.font = `700 ${size}px system-ui,sans-serif`; if (maxW) { let z = size; while (z > 8 && c.measureText(s).width > maxW) { z -= 0.5; c.font = `700 ${z}px system-ui,sans-serif`; } }
  c.textAlign = align || "center"; c.textBaseline = "middle"; if (col !== "#173f50") { c.lineWidth = 3; c.lineJoin = "round"; c.strokeStyle = "rgba(20,35,42,.85)"; c.strokeText(s, x, y); } c.fillStyle = col || "#fff"; c.fillText(s, x, y);
};
const emoji = (c, s, x, y, size) => { c.font = `${size}px ${EMO}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#000"; c.fillText(s, x, y); };
function hot(x, y, w, h, a, v, label, extra) { B.hs.push(Object.assign({ x, y, w, h, a, v, label }, extra || {})); }

const shortHint = (pad) => String(pad.hint || pad.label).split(" (")[0];
// ---------- latar ----------
function backdrop(c, kind) {
  const wall = kind === "sink" ? "#cfe7ea" : "#f3e4c4";
  c.fillStyle = wall; c.fillRect(-900, -900, 2200, 1100);
  c.strokeStyle = "rgba(47,143,122,.16)"; c.lineWidth = 1; for (let x = -200; x < 700; x += 28) { c.beginPath(); c.moveTo(x, -300); c.lineTo(x, 190); c.stroke(); } for (let y = -300; y < 190; y += 28) { c.beginPath(); c.moveTo(-200, y); c.lineTo(700, y); c.stroke(); }
  c.fillStyle = "rgba(47,143,122,.22)"; c.fillRect(-900, 150, 2200, 24);
  const top = kind === "counter" ? 168 : 196;
  const g = c.createLinearGradient(0, top, 0, 320); g.addColorStop(0, "#c89a63"); g.addColorStop(1, "#9c6f3f"); c.fillStyle = g; c.fillRect(-900, top, 2200, 900);
  c.fillStyle = "#6b4526"; c.fillRect(-900, top, 2200, 4); c.strokeStyle = "rgba(90,55,25,.22)"; c.lineWidth = 1; for (let i = 0; i < 9; i++) { const y = top + 14 + i * 14; c.beginPath(); c.moveTo(-200, y); c.lineTo(600, y + (i % 2 ? 1.5 : -1.5)); c.stroke(); }
  return top;
}

// ---------- makanan ----------
const SOLID = ["ikan", "telur", "tempe", "beras", "sayuran", "bawang_merah", "bawang_putih", "cabai", "jeruk_nipis"];
function food(c, kind, x, y, sc, k, t, spin) {
  c.save(); c.translate(x, y); c.rotate(spin || 0); c.scale(sc, sc);
  if (kind === "ikan") { const col = cooked("#c9d3d8", k); ell(c, 0, 0, 34, 13, col, "rgba(40,30,20,.45)"); c.beginPath(); c.moveTo(30, 0); c.lineTo(48, -12); c.lineTo(46, 12); c.closePath(); c.fillStyle = col; c.fill(); ell(c, -22, -3, 2.6, 2.6, "#1b1511"); c.strokeStyle = "rgba(40,30,20,.35)"; c.lineWidth = 1.5; for (let i = -1; i <= 2; i++) { c.beginPath(); c.moveTo(i * 9, -9); c.quadraticCurveTo(i * 9 + 5, 0, i * 9, 9); c.stroke(); } if (k < 0.45) ell(c, -8, -6, 12, 3, "rgba(255,255,255,.35)"); }
  else if (kind === "telur") { ell(c, 0, 0, 30, 21, cooked("#fffaf0", k * 0.9), "rgba(120,80,30,.4)"); ell(c, 0, -1, 12, 11, cooked("#f4b92c", k), "rgba(120,60,10,.35)"); ell(c, -4, -5, 3.4, 2.6, "rgba(255,255,255,.55)"); }
  else if (kind === "tempe") { for (let i = 0; i < 3; i++) { c.save(); c.translate(-26 + i * 26, (i % 2) * 4 - 2); c.rotate(i * 0.18 - 0.2); rr(c, -13, -8, 26, 16, 4); c.fillStyle = cooked("#d8c79a", k); c.fill(); c.strokeStyle = "rgba(60,40,20,.4)"; c.lineWidth = 1.2; c.stroke(); c.fillStyle = "rgba(60,40,20,.28)"; for (let j = 0; j < 5; j++) c.fillRect(-9 + j * 4.5, -4 + (j % 2) * 5, 2, 2); c.restore(); } }
  else if (kind === "sayuran") { for (let i = 0; i < 5; i++) { c.save(); c.rotate(i * 1.26); ell(c, 14, 0, 14, 6, cooked("#58b447", k * 0.9), "rgba(30,70,30,.4)"); c.restore(); } }
  else if (kind === "beras") { for (let i = 0; i < 34; i++) { const a = i * 2.4, r = 3 + (i % 9) * 3.3; ell(c, Math.cos(a) * r, Math.sin(a) * r * 0.62, 2.8, 1.5, cooked("#fffdf4", k * 0.8)); } }
  else if (kind === "cabai") { for (let i = 0; i < 2; i++) { c.save(); c.translate(-12 + i * 22, i * 4); c.rotate(-0.5 + i * 0.7); ell(c, 0, 0, 16, 5, cooked("#d9342b", k * 0.8), "rgba(70,10,10,.4)"); ell(c, -15, 0, 3, 2.4, "#3f8f3a"); c.restore(); } }
  else if (kind === "bawang_merah") { for (let i = 0; i < 3; i++) ell(c, -16 + i * 16, (i % 2) * 6, 9, 8, cooked("#b04a86", k * 0.8), "rgba(60,10,50,.4)"); }
  else if (kind === "bawang_putih") { for (let i = 0; i < 3; i++) ell(c, -16 + i * 16, (i % 2) * 6, 8, 9, cooked("#fff3df", k * 0.8), "rgba(100,70,30,.4)"); }
  else if (kind === "jeruk_nipis") { ell(c, 0, 0, 14, 14, "#8cc63f", "#3f7f1d"); c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.5; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(i * 1.047) * 12, Math.sin(i * 1.047) * 12); c.stroke(); } }
  else ell(c, 0, 0, 16, 12, cooked("#e8d6b0", k), "rgba(60,40,20,.3)");
  c.restore();
}
const ICON = { telur: "🥚", tempe: "🟫", beras: "🍚", sayuran: "🥬", bawang_merah: "🧅", bawang_putih: "🧄", cabai: "🌶️", jeruk_nipis: "🍋", ikan: "🐟", minyak: "🛢️", garam: "🧂", gula: "🍬", kopi: "☕", susu: "🥛", air_es: "🧊", bumbu_dasar: "🫙" };

// ---------- data dari masak.js ----------
const SN = () => (NW.dapurMasak && NW.dapurMasak.snap ? NW.dapurMasak.snap() : null);
function kNow(sn) {   // kematangan perkiraan (0..1+) bergerak halus antar kejadian server
  const e = sn.est; if (!e || !e.on) return sn.stage ? sn.stage.k : 0; const eff = e.eff + Math.max(0, (performance.now() - e.last) / 1000) * Core.FACTOR[e.lv];
  const r = sn.rec, win = r && r.time ? { min: r.time.min, ideal: r.time.ideal, burn: r.time.burn } : null; return Core.visualStage(eff, win);
}
const kOf = (v) => (typeof v === "number" ? v : v ? v.k : 0);
const solids = (sn) => {   // bahan padat untuk digambar (dari masakan berjalan, resep terpilih, atau pilihan bebas)
  const c = sn.cook; let ing = c ? c.ing : sn.selRec ? sn.selRec.ing : sn.ing || {}; const out = [];
  for (const k of SOLID) { if (k === "ikan") { const n = c ? (c.fish || []).length : sn.selRec ? sn.selRec.ing.ikan | 0 : sn.fishN; if (n > 0) out.push("ikan"); } else if ((ing || {})[k] > 0) out.push(k); }
  return out;
};
const has = (sn, k) => !!(sn.cook ? sn.cook.ing && sn.cook.ing[k] > 0 : sn.selRec ? sn.selRec.ing[k] > 0 : sn.ing && sn.ing[k] > 0);

// ---------- partikel ----------
function spawn(kind, x, y, n, o) { for (let i = 0; i < n && B.parts.length < 70; i++) B.parts.push(Object.assign({ kind, x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, t0: performance.now(), life: 700 + Math.random() * 500 }, o || {})); }
function drawParts(c, now, calm) {
  for (let i = B.parts.length - 1; i >= 0; i--) {
    const p = B.parts[i], age = now - p.t0; if (age > p.life) { B.parts.splice(i, 1); continue; } const k = age / p.life, s = age / 1000; const x = p.x + p.vx * s, y = p.y + p.vy * s + (p.g ? 90 * s * s : 0);
    c.globalAlpha = 1 - k;
    if (p.kind === "smoke") { ell(c, x, y, 6 + k * 14, 5 + k * 10, p.dark ? "rgba(40,36,34,.7)" : "rgba(240,240,240,.7)"); }
    else if (p.kind === "steam") { ell(c, x, y, 5 + k * 9, 4 + k * 7, "rgba(255,255,255,.65)"); }
    else if (p.kind === "bubble") { ell(c, x, y, 2 + k * 2, 2 + k * 2, "rgba(255,225,140,.85)", "rgba(180,110,30,.6)"); }
    else if (p.kind === "foam") { ell(c, x, y, 4 + k * 3, 4 + k * 3, "rgba(255,255,255,.9)", "rgba(120,190,230,.7)"); }
    else if (p.kind === "water") { ell(c, x, y, 2, 3.4, "rgba(100,180,235,.9)"); }
    else if (p.kind === "star") { c.fillStyle = "#ffd34a"; c.fillRect(x - 2, y - 2, 4, 4); }
    else if (p.kind === "bits") { c.fillStyle = p.col || "#9fc92a"; c.fillRect(x - 2, y - 2, 4, 3); }
    else if (p.kind === "salt") { c.fillStyle = "#fff"; c.fillRect(x - 1, y - 1, 2.4, 2.4); }
    else if (p.kind === "ember") { ell(c, x, y, 1.8, 1.8, "#ffb347"); }
    c.globalAlpha = 1;
  }
}
function burst(kind, n) {
  const sc = B.scene || "stove", f = focusL(B.padId || kind, sc);
  const map = { potong: ["bits", "#9fc92a"], kupas: ["bits", "#e8d6b0"], pecah: ["bits", "#f4d35a"], bumbui: ["salt"], api: ["ember"], balik: ["bubble"], uap: ["steam"], sabun: ["foam"], air: ["water"], asap: ["smoke"], bintang: ["star"], cuci: ["water"], aduk: ["bubble"] };
  const m = map[kind] || ["star"]; spawn(m[0], f.x, f.y, Math.min(n, NW.dapurMasak && NW.dapurMasak.M.calm ? 2 : n), { col: m[1], g: m[0] === "bits" || m[0] === "water" || m[0] === "salt", dark: kind === "asap" });
}

// ---------- fokus gerakan (titik tengah gerakan jari) ----------
const FOCUS = {
  stove: { default: [200, 150], tuang: [200, 116] },
  counter: { cuci: [62, 218], kupas: [145, 205], potong: [205, 215], pecah: [348, 228], aduk: [348, 228], bumbui: [251, 140] },
  gelas: { default: [200, 170] },
  sink: { default: [200, 205], rak: [355, 185] },
  plate: { default: [200, 185] },
};
function focusL(id, scene) { const m = FOCUS[scene || B.scene] || FOCUS.stove; const f = m[id] || m.default || [200, 170]; return { x: f[0], y: f[1] }; }
const toClient = (x, y) => { const r = B.cv.getBoundingClientRect(); return { x: r.left + B.ox + x * B.s, y: r.top + B.oy + y * B.s }; };

// ---------- pilih adegan ----------
function sceneOf(sn) {
  if (sn.panel === "wash") return "sink";
  if (sn.panel === "tray" || sn.phase === "result") return "plate";
  const c = sn.cook, tool = c ? c.tool : sn.tool;
  if (c) {
    if (tool === "gelas") return "gelas";
    if (sn.view) return sn.view;
    const id = sn.pad && sn.pad.id;
    if (id) { if (["cuci", "kupas", "potong", "pecah"].includes(id)) return "counter"; if (id === "bumbui") return c.onFire || c.lifted ? "stove" : "counter"; if (id === "aduk") return c.onFire || c.lifted ? "stove" : "counter"; return "stove"; }
    if (!c.onFire && !c.lifted && sn.hint && sn.hint !== "taruh") return "counter";
    return "stove";
  }
  return tool === "gelas" ? "gelas" : "stove";
}

// ---------- potret pemain ----------
function face(c, x, y, r, F, sn, now) {
  const pl = (NW.world && NW.world.player) || {}, skin = (pl.style && pl.style.skin) || "#f1c8a0";
  let name = "biasa", k = 0; if (F) { const age = now - F.t0; k = Math.min(1, age / Math.max(1, F.ms)); name = F.face; }
  ell(c, x, y, r + 5, r + 5, "rgba(255,246,228,.92)", "#173f50");
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip(); c.fillStyle = name === "mual" ? mix(skin, "#a8d684", 0.55) : skin; c.fillRect(x - r, y - r, r * 2, r * 2);
  const ey = y - r * 0.05, ex = r * 0.38, my = y + r * 0.42, eye = (xx, yy, rad) => ell(c, xx, yy, rad || r * 0.11, rad || r * 0.11, "#2a1d14");
  c.strokeStyle = "#6b3a2a"; c.lineWidth = Math.max(1.5, r * 0.07); c.lineCap = "round";
  if (name === "puas") { c.strokeStyle = "#2a1d14"; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * ex, ey + 2, r * 0.17, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } c.strokeStyle = "#6b3a2a"; c.beginPath(); c.arc(x, my - r * 0.12, r * 0.3, 0.1, Math.PI - 0.1); c.stroke(); ell(c, x - r * 0.62, my - r * 0.2, r * 0.14, r * 0.09, "rgba(240,110,100,.5)"); ell(c, x + r * 0.62, my - r * 0.2, r * 0.14, r * 0.09, "rgba(240,110,100,.5)"); }
  else if (name === "ragu") { eye(x - ex, ey); eye(x + ex, ey); c.strokeStyle = "#3a2a20"; c.beginPath(); c.moveTo(x - ex - 5, ey - r * 0.28); c.lineTo(x - ex + 4, ey - r * 0.4); c.stroke(); c.strokeStyle = "#6b3a2a"; c.beginPath(); c.moveTo(x - r * 0.3, my); c.quadraticCurveTo(x - r * 0.1, my - 4, x, my); c.quadraticCurveTo(x + r * 0.1, my + 4, x + r * 0.3, my); c.stroke(); ell(c, x + r * 0.78, y - r * 0.2 + (sn.calm ? 0 : ((now / 280) % 1) * 6), 2.4, 3.8, "rgba(120,190,230,.9)"); }
  else if (name === "bingung") { eye(x - ex, ey); eye(x + ex, ey, r * 0.17); c.beginPath(); c.moveTo(x - r * 0.3, my); c.quadraticCurveTo(x, my - 6, x + r * 0.3, my + 2); c.stroke(); }
  else if (name === "batuk") { c.strokeStyle = "#2a1d14"; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * ex - 4, ey - 5); c.lineTo(x + s * ex + 3, ey); c.lineTo(x + s * ex - 4, ey + 5); c.stroke(); } ell(c, x, my + 1, r * 0.2, r * 0.17, "#7a2d28"); }
  else if (name === "mual") { c.strokeStyle = "#2a1d14"; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * ex, ey, r * 0.15, 0, TAU * 0.8); c.stroke(); } const open = F && F.vomit && k > 0.22 && k < 0.5; if (open) ell(c, x, my + 2, r * 0.2, r * 0.26, "#7a2d28"); else { c.strokeStyle = "#5a2a20"; c.beginPath(); c.moveTo(x - r * 0.3, my + 2); c.quadraticCurveTo(x - r * 0.15, my - 4, x, my + 2); c.quadraticCurveTo(x + r * 0.15, my + 8, x + r * 0.3, my + 2); c.stroke(); } if (!open) { ell(c, x + r * 0.55, my - r * 0.35, r * 0.1, r * 0.14, "rgba(150,205,120,.8)"); } }
  else { eye(x - ex, ey); eye(x + ex, ey); c.beginPath(); c.arc(x, my - r * 0.14, r * 0.26, 0.2, Math.PI - 0.2); c.stroke(); }
  c.restore();
  c.beginPath(); c.moveTo(x - r * 1.25, y - r * 0.2); c.lineTo(x, y - r * 1.6); c.lineTo(x + r * 1.25, y - r * 0.2); c.closePath(); c.fillStyle = "#d9b45a"; c.fill(); c.strokeStyle = "#8a6a2a"; c.lineWidth = 2; c.stroke(); c.fillStyle = "#b8342b"; c.fillRect(x - r * 0.95, y - r * 0.5, r * 1.9, 4);   // caping
  if (F) {
    const E = F.eat ? Core.eatInfo(F.effect) : Core.tierInfo(F.tier), age = now - F.t0; c.globalAlpha = Math.max(0, Math.min(1, (F.ms + 300 - age) / 300));
    ell(c, x + r + 22, y + r * 0.2, 16, 14, "#fffdf4", "#173f50"); emoji(c, E.emoji || "", x + r + 22, y + r * 0.2 + 1, 17); if (name === "bingung") text(c, "?", x - r * 0.9, y - r * 1.3, 18, "#ffd34a"); if (name === "ragu") text(c, "…", x - r * 0.9, y - r * 1.2, 18, "#fff");
    if (name === "mual" && (!F.vomit || sn.calm)) text(c, "blegh…", x + r + 22, y + r * 0.2 + 22, 11, "#cfe8a0");
    if (name === "batuk" && !sn.calm) smokeAt(c, x + r * 0.7, y - r * 0.2, now, 3);
    if (name === "mual" && F.vomit && k > 0.28 && k < 0.5) {   // "blegh" kartun singkat: percikan hijau muda ke ember kecil — bukan visual menjijikkan
      const q = (k - 0.28) / 0.22; for (let i = 0; i < 8; i++) { const a = i * 0.8, px = x + r * 0.2 + q * (r * 1.4) + Math.cos(a) * 3, py = y + r * 0.55 + q * r * 0.8 + (i % 3) * 3 + q * q * 14; c.globalAlpha = 1 - q * 0.7; ell(c, px, py, 3 - q, 3 - q, i % 2 ? "#cfe8a0" : "#f2f0b0"); }
      c.globalAlpha = 1; rr(c, x + r * 1.5, y + r * 1.0, 22, 16, 3); c.fillStyle = "#4a8fc8"; c.fill(); ell(c, x + r * 1.5 + 11, y + r * 1.0, 11, 3, "#6fb4cf");
    }
    c.globalAlpha = 1;
  }
}
function smokeAt(c, x, y, now, n) { for (let i = 0; i < n; i++) { const ph = ((now / 1200) + i / n) % 1; c.globalAlpha = 0.6 * (1 - ph); ell(c, x + Math.sin(ph * 5 + i) * 6, y - ph * 40, 5 + ph * 11, 4 + ph * 8, "rgba(60,56,54,.8)"); } c.globalAlpha = 1; }

// ---------- adegan: kompor / panci / pemanggang ----------
function stove(c, sn, now, t) {
  const top = backdrop(c, "stove"), cook = sn.cook, tool = cook ? cook.tool : sn.tool, st = kNow(sn), k = kOf(st), onFire = !!(cook && cook.onFire), lifted = !!(cook && cook.lifted), lv = (cook && cook.lv) || sn.est.lv || 2, pad = sn.pad, p = pad ? pad.p : 0, id = pad && pad.id, calm = sn.calm;
  // rak gantung sendok (hiasan)
  c.strokeStyle = "#6b4526"; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 62); c.lineTo(380, 62); c.stroke(); for (let i = 0; i < 5; i++) { const x = 60 + i * 70; c.strokeStyle = "#8a8f94"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, 62); c.lineTo(x, 88 + (i % 2) * 8); c.stroke(); ell(c, x, 94 + (i % 2) * 8, 6, 8, "#aab0b5"); }
  // kompor
  rr(c, 90, 168, 220, 62, 8); c.fillStyle = "#3a4147"; c.fill(); c.strokeStyle = "#20262b"; c.lineWidth = 3; c.stroke(); rr(c, 90, 168, 220, 10, 5); c.fillStyle = "#566068"; c.fill();
  ell(c, 200, 182, 74, 16, "#232a2f"); ell(c, 200, 182, 54, 10, "#171c20");
  for (let i = 0; i < 3; i++) { const kx = 150 + i * 50; ell(c, kx, 216, 13, 13, "#1c2125", "#8a949c"); c.strokeStyle = "#e8e8e8"; c.lineWidth = 3; c.beginPath(); c.moveTo(kx, 216); c.lineTo(kx + Math.cos(-1.2 + (i + 1) * 0.7) * 10, 216 + Math.sin(-1.2 + (i + 1) * 0.7) * 10); c.stroke(); }
  // api (kecil/sedang/besar)
  if (onFire && tool !== "pemanggang") {
    const hh = [0, 11, 20, 31][lv], n = 11, amp = calm ? 0.25 : 1;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI + Math.PI * 0; const fx = 200 + Math.cos(a) * 62 * (tool === "panci" ? 0.8 : 1), fy = 190 + Math.sin(a) * 6, fh = hh * (0.75 + 0.3 * Math.sin(t * 9 + i * 1.9) * amp);
      c.beginPath(); c.moveTo(fx - 5, fy); c.quadraticCurveTo(fx - 3, fy - fh * 0.6, fx, fy - fh); c.quadraticCurveTo(fx + 3, fy - fh * 0.6, fx + 5, fy); c.closePath(); c.fillStyle = "#ff7a2c"; c.fill(); c.beginPath(); c.moveTo(fx - 2.6, fy); c.quadraticCurveTo(fx - 1.4, fy - fh * 0.4, fx, fy - fh * 0.62); c.quadraticCurveTo(fx + 1.4, fy - fh * 0.4, fx + 2.6, fy); c.fillStyle = "#ffe07a"; c.fill(); }
    c.globalAlpha = 0.12 + lv * 0.05; ell(c, 200, 196, 90, 18, "#ff9a3c"); c.globalAlpha = 1;
  }
  if (tool === "pemanggang") grill(c, sn, k, onFire, lv, t, p, id, calm); else if (tool === "panci") pot(c, sn, k, onFire, lifted, lv, t, p, id, calm, now); else pan(c, sn, k, onFire, lifted, lv, t, p, id, calm, now);
  // baki bahan (kiri)
  rr(c, 8, 232, 104, 60, 7); c.fillStyle = "#8a5a2f"; c.fill(); c.strokeStyle = "#5a3818"; c.lineWidth = 2; c.stroke(); rr(c, 13, 237, 94, 50, 5); c.fillStyle = "#d9b684"; c.fill(); text(c, "Baki bahan", 60, 228, 10, "#fff");
  const items = []; const ing = cook ? cook.ing : sn.selRec ? sn.selRec.ing : sn.ing || {}; for (const [kk, n] of Object.entries(ing || {})) if (n > 0 && kk !== "ikan") items.push([kk, n]); if (cook ? (cook.fish || []).length : sn.selRec ? sn.selRec.ing.ikan | 0 : sn.fishN) items.unshift(["ikan", cook ? cook.fish.length : sn.selRec ? sn.selRec.ing.ikan : sn.fishN]);
  items.slice(0, 8).forEach(([kk, n], i) => { const cx = 28 + (i % 4) * 25, cy = 252 + Math.floor(i / 4) * 24, dropped = !!sn.dropped[kk] || onFire || lifted; c.globalAlpha = dropped ? 0.35 : 1; ell(c, cx, cy, 11, 11, "#fff8e8", "#8a5a2f"); emoji(c, ICON[kk] || "•", cx, cy + 1, 14); if (n > 1) text(c, "×" + n, cx + 9, cy + 9, 9, "#fff"); c.globalAlpha = 1; if (cook && !onFire && !lifted && !dropped) hot(cx - 13, cy - 14, 26, 28, "drop", kk, ""); });
  // sendok kayu (aduk) & garam (bumbu)
  if (cook && !lifted) {
    if (sn.acts.includes("aduk") && (onFire || tool !== "wajan")) { c.save(); c.translate(48, 150); c.rotate(-0.25); rr(c, -3, -34, 6, 60, 3); c.fillStyle = "#c08a4c"; c.fill(); ell(c, 0, -38, 8, 11, "#c08a4c"); c.restore(); rr(c, 28, 150, 40, 36, 5); c.fillStyle = "#e9eef0"; c.fill(); c.strokeStyle = "#8aa"; c.lineWidth = 1.5; c.stroke(); mark(c, sn, "aduk", 48, 112); hot(22, 100, 52, 90, "act", "aduk", "Aduk", { lx: 48, ly: 198, next: sn.hint === "aduk" }); }
    if (sn.acts.includes("bumbui")) { rr(c, 338, 98, 22, 34, 5); c.fillStyle = "#f3f6f8"; c.fill(); c.strokeStyle = "#7a8a92"; c.lineWidth = 1.5; c.stroke(); rr(c, 340, 90, 18, 10, 4); c.fillStyle = "#cfd6da"; c.fill(); mark(c, sn, "bumbui", 349, 84); hot(326, 80, 46, 62, "act", "bumbui", "Bumbu", { lx: 349, ly: 142, next: sn.hint === "bumbui" }); }
  }
  // teko air (isi air panci)
  if (cook && !lifted && tool === "panci" && sn.acts.includes("tuang")) { c.save(); c.translate(304, 92); c.rotate(id === "tuang" ? -0.7 : -0.1); rr(c, -14, -6, 30, 34, 8); c.fillStyle = "#9ed8ef"; c.fill(); c.strokeStyle = "#4f8aa3"; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(-14, 2); c.lineTo(-28, -6); c.lineTo(-14, 10); c.fillStyle = "#9ed8ef"; c.fill(); c.stroke(); c.restore(); if (id === "tuang") { c.strokeStyle = "rgba(100,180,235,.9)"; c.lineWidth = 4; c.beginPath(); c.moveTo(274, 88); c.quadraticCurveTo(262, 96, 236, 112); c.stroke(); } mark(c, sn, "tuang", 322, 66); hot(278, 62, 52, 64, "act", "tuang", "Isi air", { lx: 304, ly: 130, next: !sn.done.includes("tuang") }); }
  // spatula (balik) — kanan
  if (cook && heat(tool)) { const act = onFire; c.save(); c.translate(352, 252); c.rotate(-0.55 + (id === "balik" ? Math.sin(t * 12) * 0.25 * (calm ? 0.3 : 1) : 0)); rr(c, -3, -8, 6, 52, 3); c.fillStyle = "#c08a4c"; c.fill(); rr(c, -14, -44, 28, 40, 5); c.fillStyle = "#b9c0c5"; c.fill(); c.strokeStyle = "#6b747a"; c.lineWidth = 2; c.stroke(); c.restore(); if (act && !lifted) hot(322, 200, 60, 90, "act", "balik", "Balik", { lx: 352, ly: 288 }); else c.globalAlpha = 1; }
  // piring (kanan)
  ell(c, 296, 268, 44, 13, "#f6f1e6", "#9aa6ab"); ell(c, 296, 266, 32, 8, "#fff", "rgba(150,170,180,.5)");
  if (lifted && cook) { drawDishOn(c, sn, 296, 262, 0.8, k, t); hot(250, 232, 92, 52, "finish", "", "Sajikan", { lx: 296, ly: 292, next: true }); }
  // tombol api
  if (cook && heat(tool)) {
    for (let l = 1; l <= 3; l++) { const bx = 130 + (l - 1) * 70, by = 270, sel = lv === l && onFire, can = onFire && !lifted; c.globalAlpha = can ? 1 : 0.45; ell(c, bx, by, 25, 20, sel ? "#ffd34a" : "#fff6e4", sel ? "#c2562b" : "#173f50"); emoji(c, "🔥", bx, by - 1, 12 + l * 4); text(c, ["", "Kecil", "Sedang", "Besar"][l], bx, by + 24, 10, "#fff"); c.globalAlpha = 1; if (can) hot(bx - 32, by - 26, 64, 60, "api", String(l), "", { circle: false }); }
  }
  // CTA taruh / angkat
  if (cook && heat(tool) && !onFire && !lifted) { const bob = calm ? 0 : Math.sin(t * 4) * 3; text(c, "Taruh di api ▼", 200, 118 + bob, 12, "#ffd34a"); const fx = focusL("taruh", "stove"); hot(100, 96, 200, 78, "act", "taruh", "", { next: true }); }
  if (cook && heat(tool) && onFire && !lifted) { rr(c, 304, 160, 84, 26, 13); c.fillStyle = "#f0c53a"; c.fill(); c.strokeStyle = "#173f50"; c.lineWidth = 2; c.stroke(); text(c, "🫕 Angkat", 346, 173, 12, "#173f50", "center", 76); hot(296, 152, 100, 42, "act", "angkat", "", { next: kOf(st) > 0.6 }); }
  // petunjuk
  hint(c, sn, onFire, lifted, k);
  // lingkaran gerakan
  padRing(c, sn, "stove", t);
}
const heat = (tool) => tool === "wajan" || tool === "panci" || tool === "pemanggang";
function mark(c, sn, id, x, y) { if (sn.done.includes(id)) { ell(c, x, y, 8, 8, "#2f8f7a", "#fff"); text(c, "✓", x, y + 1, 11, "#fff"); } }
function hint(c, sn, onFire, lifted, k) {
  if (!sn.cook) return; let s = "";
  if (!onFire && !lifted) s = "Masukkan bahan, lalu taruh di api"; else if (onFire) s = k < 0.4 ? "Masih pucat — tunggu sebentar…" : k < 0.7 ? "Mulai keemasan…" : k < 0.88 ? "Pas! Angkat sekarang?" : k < 1 ? "Mulai gosong! Segera angkat" : "Gosong!"; else s = "Sudah diangkat — sajikan ke piring";
  if (sn.pad) s = shortHint(sn.pad);
  rr(c, 76, 6, 222, 22, 11); c.fillStyle = "rgba(255,246,228,.94)"; c.fill(); c.strokeStyle = "#173f50"; c.lineWidth = 1.5; c.stroke(); text(c, s, 187, 17.5, 11, "#173f50", "center", 206);
}
function pan(c, sn, k, onFire, lifted, lv, t, p, id, calm, now) {
  const cook = sn.cook; let py = 150, tilt = 0; if (id === "taruh") py -= (1 - p) * 16; if (id === "angkat") { py -= p * 14; tilt = -p * 0.25; }
  if (lifted) { c.globalAlpha = 0.25; } c.save(); c.translate(0, py - 150); c.translate(200, 150); c.rotate(tilt); c.translate(-200, -150);
  c.save(); c.translate(0, 0); rr(c, 296, 143, 92, 10, 5); c.fillStyle = "#8a5a2f"; c.fill(); c.strokeStyle = "#5a3818"; c.lineWidth = 2; c.stroke(); c.restore();
  ell(c, 200, 158, 104, 32, "#1f2529"); ell(c, 200, 152, 100, 29, "#2f373d", "#12171a"); ell(c, 200, 154, 88, 24, "#3b454c");
  const showSolids = cook ? (onFire || lifted || Object.keys(sn.dropped).length > 0) : false;
  if (onFire || (cook && !lifted)) { c.globalAlpha = onFire ? 0.5 : 0.25; ell(c, 200, 156, 80, 20, "rgba(255,200,90,.55)"); c.globalAlpha = 1; }   // minyak
  const list = solids(sn); const dropped = sn.dropped; const pos = [[200, 152], [166, 158], [236, 156], [200, 166], [178, 144]];
  list.forEach((kk, i) => { if (cook && !(onFire || lifted || dropped[kk])) return; if (lifted) return; const q = pos[i % pos.length]; let fy = q[1]; if (id === "balik" && sn.flip) fy -= 0; const spin = id === "aduk" && !calm ? Math.sin(t * 6 + i) * 0.3 : 0; food(c, kk, q[0] + (id === "aduk" ? Math.cos(p * TAU * 2 + i) * 8 : 0), fy, 0.78, k, t, spin); });
  if (!cook) list.forEach((kk, i) => { const q = pos[i % pos.length]; food(c, kk, q[0], q[1], 0.7, 0, t, 0); });
  // lompatan balik (petunjuk: waktu sejak balik)
  const fl = performance.now() - sn.flip; if (sn.flip && fl < 600 && onFire) { const q = fl / 600, hy = Math.sin(q * Math.PI) * 44; list.slice(0, 2).forEach((kk, i) => food(c, kk, 200 + i * 20, 130 - hy, 0.78, k, t, q * Math.PI * 2)); }
  // gelembung minyak & asap = petunjuk matang
  if (onFire && !calm) for (let i = 0; i < 6; i++) { const ph = ((t * (1.2 + lv * 0.5)) + i * 0.37) % 1; c.globalAlpha = 1 - ph; ell(c, 140 + i * 24 + Math.sin(i * 3) * 8, 158 - ph * 8, 2 + ph * 2, 1.5 + ph, "rgba(255,230,150,.9)"); } c.globalAlpha = 1;
  c.restore(); c.globalAlpha = 1;
  if (onFire && !lifted && k > 0.82) smokeAt(c, 200, 118, now, k > 1 ? 4 : 2); else if (onFire && !lifted && k > 0.55 && !calm) { for (let i = 0; i < 2; i++) { const ph = ((now / 1600) + i / 2) % 1; c.globalAlpha = 0.45 * (1 - ph); ell(c, 190 + i * 22, 128 - ph * 34, 5 + ph * 8, 4 + ph * 6, "rgba(255,255,255,.8)"); } c.globalAlpha = 1; }
  if (lifted) { text(c, "wajan kosong", 200, 130, 10, "#fff"); }
}
function pot(c, sn, k, onFire, lifted, lv, t, p, id, calm, now) {
  const cook = sn.cook; let py = 0; if (id === "taruh") py = -(1 - p) * 16; if (id === "angkat") py = -p * 12; c.save(); c.translate(0, py);
  rr(c, 292, 120, 88, 10, 5); c.fillStyle = "#8a5a2f"; c.fill(); c.strokeStyle = "#5a3818"; c.lineWidth = 2; c.stroke();
  rr(c, 140, 106, 120, 80, 10); c.fillStyle = "#8d979e"; c.fill(); c.strokeStyle = "#3d474d"; c.lineWidth = 3; c.stroke(); rr(c, 148, 112, 10, 66, 5); c.fillStyle = "rgba(255,255,255,.35)"; c.fill();
  ell(c, 200, 106, 60, 16, "#aab3b9", "#3d474d"); ell(c, 200, 108, 52, 12, "#4a545a");
  const water = Math.min(1, 0.32 + (sn.done.includes("tuang") ? 0.42 : 0) + (id === "tuang" ? p * 0.42 : 0)); const wy = 118 - water * 10; ell(c, 200, wy, 50, 11, onFire ? "#8fd0ee" : "#9ed8ef");
  const list = solids(sn); list.forEach((kk, i) => { if (cook && !(onFire || lifted || sn.dropped[kk])) return; if (lifted) return; food(c, kk, 172 + i * 28, wy - 1, 0.55, k, t, 0); });
  if (onFire && !calm) for (let i = 0; i < 6; i++) { const ph = ((t * (1.4 + lv * 0.5)) + i * 0.31) % 1; c.globalAlpha = 0.9 * (1 - ph); ell(c, 160 + i * 16, wy - ph * 7, 2 + ph * 4, 1.6 + ph * 3, "rgba(255,255,255,.95)", "rgba(120,170,200,.7)"); } c.globalAlpha = 1;
  c.restore();
  if (onFire && !lifted) { const n = k > 0.9 ? 4 : 3; for (let i = 0; i < n; i++) { const ph = ((now / 1500) + i / n) % 1; c.globalAlpha = 0.55 * (1 - ph); ell(c, 180 + i * 18 + Math.sin(ph * 4 + i) * 5, 96 - ph * 44, 5 + ph * 11, 4 + ph * 8, k > 1 ? "rgba(60,56,54,.8)" : "rgba(255,255,255,.85)"); } c.globalAlpha = 1; }
}
function grill(c, sn, k, onFire, lv, t, p, id, calm) {
  const cook = sn.cook; c.save(); rr(c, 96, 120, 208, 92, 10); c.fillStyle = "#2b2f33"; c.fill(); c.strokeStyle = "#111417"; c.lineWidth = 3; c.stroke(); rr(c, 96, 120, 208, 14, 7); c.fillStyle = "#4a5359"; c.fill();
  const glow = onFire ? 0.25 + lv * 0.22 : 0.05; const g = c.createLinearGradient(0, 138, 0, 208); g.addColorStop(0, `rgba(255,120,40,${glow})`); g.addColorStop(1, `rgba(120,30,10,${glow * 0.5})`); rr(c, 106, 140, 188, 62, 6); c.fillStyle = "#171a1d"; c.fill(); rr(c, 106, 140, 188, 62, 6); c.fillStyle = g; c.fill();
  if (onFire && !calm) for (let i = 0; i < 9; i++) { const ph = ((t * 1.1) + i * 0.33) % 1; c.globalAlpha = 1 - ph; ell(c, 120 + i * 20, 196 - ph * 40, 1.8, 1.8, "#ffb347"); } c.globalAlpha = 1;
  c.strokeStyle = "#8f989e"; c.lineWidth = 3; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(114 + i * 21, 144); c.lineTo(114 + i * 21, 198); c.stroke(); }
  const list = solids(sn); let y = 168; list.forEach((kk, i) => { if (cook && !(onFire || sn.lifted || sn.dropped[kk])) return; const fl = performance.now() - sn.flip, jump = sn.flip && fl < 600 ? Math.sin(fl / 600 * Math.PI) * 30 : 0; food(c, kk, 200 + i * 6, y - jump + (kk === "jeruk_nipis" ? 14 : 0), 0.9, k, t, kk === "ikan" ? -0.1 : 0); });
  if (onFire) { const a = k > 0.82 ? 0.7 : 0.3; for (let i = 0; i < (k > 0.82 ? 3 : 1); i++) { const ph = ((performance.now() / 1500) + i / 3) % 1; c.globalAlpha = a * (1 - ph); ell(c, 190 + i * 14, 112 - ph * 40, 5 + ph * 10, 4 + ph * 7, k > 0.9 ? "rgba(60,56,54,.8)" : "rgba(255,255,255,.7)"); } c.globalAlpha = 1; }
  c.restore();
}
function drawDishOn(c, sn, x, y, sc, k, t) {
  const list = solids(sn); if (!list.length) { ell(c, x, y, 20 * sc, 9 * sc, cooked("#e8d6b0", k)); return; } list.slice(0, 3).forEach((kk, i) => food(c, kk, x + (i - 1) * 24 * sc, y - Math.abs(i - 1) * 3, 0.6 * sc, k, t, 0));
}

// ---------- adegan: talenan / basin / mangkuk ----------
function counter(c, sn, now, t) {
  const top = backdrop(c, "counter"), cook = sn.cook, pad = sn.pad, id = pad && pad.id, p = pad ? pad.p : 0, calm = sn.calm, st = kNow(sn);
  const acts = sn.acts, done = sn.done, list = solids(sn);
  // keran + basin (kiri)
  rr(c, 56, 120, 12, 46, 5); c.fillStyle = "#b9c3c9"; c.fill(); rr(c, 56, 118, 40, 10, 5); c.fillStyle = "#b9c3c9"; c.fill(); rr(c, 14, 176, 98, 78, 10); c.fillStyle = "#cfd8dd"; c.fill(); c.strokeStyle = "#7a8a92"; c.lineWidth = 3; c.stroke(); rr(c, 22, 184, 82, 62, 8); c.fillStyle = "#9fd4ee"; c.fill();
  if (id === "cuci") { for (let i = 0; i < 5; i++) { const ph = ((t * 2.2) + i * 0.2) % 1; c.globalAlpha = 1 - ph * 0.6; ell(c, 92, 130 + ph * 56, 2, 3.4, "rgba(100,180,235,.95)"); } c.globalAlpha = 1; }
  if (acts.includes("cuci")) { const clean = done.includes("cuci") || (id === "cuci" && p > 0.9); emoji(c, ICON[list[0]] || "🥬", 62, 215, 30); if (!clean) for (let i = 0; i < 4; i++) ell(c, 44 + i * 12, 206 + (i % 2) * 14, 2.4, 2.4, "rgba(110,80,40,.6)"); mark(c, sn, "cuci", 100, 188); hot(10, 110, 106, 150, "act", "cuci", "Cuci", { lx: 62, ly: 270, next: sn.hint === "cuci" }); }
  // talenan (tengah)
  c.save(); rr(c, 118, 184, 170, 84, 10); c.fillStyle = "#e6c58d"; c.fill(); c.strokeStyle = "#a9794a"; c.lineWidth = 3; c.stroke(); c.strokeStyle = "rgba(150,100,50,.25)"; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(126, 196 + i * 12); c.lineTo(280, 196 + i * 12 + (i % 2 ? 2 : -2)); c.stroke(); } c.restore();
  const main = list.find((k) => k !== "telur") || list[0] || "sayuran", cut = done.includes("potong") ? 5 : id === "potong" ? Math.floor(p * 5) : 0, peeled = done.includes("kupas") || (id === "kupas" && p > 0.9);
  if (main && !(main === "telur")) { const n = cut > 0 ? cut + 1 : 1; for (let i = 0; i < n; i++) food(c, main, 160 + i * (cut > 0 ? 14 : 0) + (cut > 0 ? 0 : 40), 224 + (i % 2) * 4, cut > 0 ? 0.36 : 0.85, st ? 0 : 0, t, cut > 0 ? i * 0.12 : 0); }
  if (id === "kupas") { for (let i = 0; i < Math.floor(p * 5); i++) { c.strokeStyle = "#e8d6b0"; c.lineWidth = 2; c.beginPath(); c.arc(150 + i * 22, 242 + (i % 2) * 6, 7, 0, Math.PI * 1.5); c.stroke(); } }
  if (acts.includes("kupas")) { for (const [i, e] of [["🧅", 138], ["🧄", 168]].entries()) emoji(c, e[0], e[1], 168, 22); mark(c, sn, "kupas", 154, 150); hot(120, 146, 70, 48, "act", "kupas", "Kupas", { lx: 154, ly: 134, next: sn.hint === "kupas" }); }
  // pisau (iris/potong)
  const kx = 230 + (id === "potong" ? Math.sin(p * 5 * TAU) * (calm ? 4 : 24) : 0), ky = 214 - (id === "potong" ? Math.max(0, Math.sin(p * 5 * TAU)) * 26 : 0); c.save(); c.translate(kx, ky); c.rotate(-0.6); rr(c, -34, -7, 52, 14, 3); c.fillStyle = "#dfe6ea"; c.fill(); c.strokeStyle = "#7a8a92"; c.lineWidth = 1.5; c.stroke(); rr(c, 18, -6, 30, 12, 4); c.fillStyle = "#5a3818"; c.fill(); c.restore();
  if (acts.includes("potong")) { mark(c, sn, "potong", 280, 190); hot(200, 190, 92, 80, "act", "potong", "Potong / iris", { lx: 245, ly: 276, next: sn.hint === "potong" }); }
  // mangkuk (kanan): pecah / aduk
  ell(c, 348, 236, 44, 17, "#f6f1e6", "#9aa6ab"); rr(c, 304, 214, 88, 28, 12); c.fillStyle = "#f6f1e6"; c.fill(); ell(c, 348, 214, 44, 12, "#fff", "#9aa6ab"); ell(c, 348, 215, 36, 8, "#f6d77a");
  const cracked = done.includes("pecah") || (id === "pecah" && p > 0.9);
  if (id === "pecah" || (acts.includes("pecah") && !cracked)) { const ex = 336, ey = 168; ell(c, ex, ey, 14, 18, "#f6ead2", "#a98a5a"); if (id === "pecah" && p > 0.1) { c.strokeStyle = "#5a3818"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - 10, ey - 2); c.lineTo(ex - 4, ey + 3); c.lineTo(ex + 2, ey - 3); c.lineTo(ex + 10, ey + 2); c.stroke(); } }
  if (cracked) { ell(c, 348, 214, 24, 6, "#fffaf0"); ell(c, 348, 213, 9, 4, "#f4b92c"); }
  if (acts.includes("pecah")) { mark(c, sn, "pecah", 390, 190); hot(300, 140, 96, 110, "act", "pecah", "Pecah telur", { lx: 348, ly: 262, next: sn.hint === "pecah" }); }
  if (acts.includes("aduk")) { c.save(); c.translate(372, 222); c.rotate(0.3 + (id === "aduk" ? p * TAU * 2 : 0) * (calm ? 0.2 : 1)); rr(c, -2, -46, 5, 52, 2); c.fillStyle = "#c08a4c"; c.fill(); ell(c, 0, -48, 7, 5, "#c08a4c"); c.restore(); mark(c, sn, "aduk", 394, 206); if (id !== "aduk") hot(362, 160, 36, 70, "act", "aduk", "Aduk", { lx: 380, ly: 150, next: sn.hint === "aduk" }); }
  if (acts.includes("bumbui")) { rr(c, 240, 118, 22, 34, 5); c.fillStyle = "#f3f6f8"; c.fill(); c.strokeStyle = "#7a8a92"; c.lineWidth = 1.5; c.stroke(); rr(c, 242, 110, 18, 10, 4); c.fillStyle = "#cfd6da"; c.fill(); if (id === "bumbui") for (let i = 0; i < 6; i++) { const ph = ((t * 3) + i * 0.17) % 1; c.fillStyle = "#fff"; c.fillRect(248 + (i % 3) * 3, 154 + ph * 40, 2, 2); } mark(c, sn, "bumbui", 262, 112); hot(226, 98, 48, 62, "act", "bumbui", "Bumbu", { lx: 251, ly: 164, next: sn.hint === "bumbui" }); }
  // tombol ke kompor
  if (cook && heat(cook.tool)) { rr(c, 304, 6, 90, 24, 12); c.fillStyle = "#f0c53a"; c.fill(); c.strokeStyle = "#173f50"; c.lineWidth = 2; c.stroke(); text(c, "🔥 Ke kompor", 349, 18.5, 11, "#173f50", "center", 82); hot(298, 2, 102, 34, "view", "stove", ""); }
  hint2(c, sn);
  padRing(c, sn, "counter", t);
}
function hint2(c, sn) { let s = sn.pad ? shortHint(sn.pad) : "Siapkan bahan: ketuk alat yang menyala"; rr(c, 76, 6, 222, 22, 11); c.fillStyle = "rgba(255,246,228,.94)"; c.fill(); c.strokeStyle = "#173f50"; c.lineWidth = 1.5; c.stroke(); text(c, s, 187, 17.5, 11, "#173f50", "center", 206); }

// ---------- adegan: gelas ----------
function glass(c, sn, now, t) {
  backdrop(c, "stove"); const pad = sn.pad, id = pad && pad.id, p = pad ? pad.p : 0, done = sn.done, calm = sn.calm, cook = sn.cook;
  const lvl = Math.min(1, (done.includes("tuang") ? 1 : 0) + (id === "tuang" ? p : 0)); rr(c, 168, 112, 64, 104, 12); c.fillStyle = "rgba(235,248,255,.55)"; c.fill(); c.strokeStyle = "#7aa7bb"; c.lineWidth = 3; c.stroke();
  if (lvl > 0) { const h = 92 * lvl; rr(c, 172, 212 - h, 56, h, 8); c.fillStyle = done.includes("aduk") || (id === "aduk" && p > 0.8) ? "#b98a5a" : "#4a2e1d"; c.fill(); if (!(done.includes("aduk"))) { rr(c, 172, 212 - h, 56, h * 0.35, 8); c.fillStyle = "rgba(250,246,240,.85)"; c.fill(); } }
  if (id === "tuang") { c.strokeStyle = "rgba(90,50,30,.9)"; c.lineWidth = 6; c.beginPath(); c.moveTo(262, 92); c.lineTo(205, 190 - lvl * 70); c.stroke(); }
  // teko (tuang) & sendok (aduk)
  c.save(); c.translate(306, 108); c.rotate(id === "tuang" ? -0.9 : -0.2); rr(c, -26, -4, 54, 46, 10); c.fillStyle = "#b9c3c9"; c.fill(); c.strokeStyle = "#5a666d"; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(-26, 6); c.lineTo(-44, -6); c.lineTo(-26, 14); c.fillStyle = "#b9c3c9"; c.fill(); c.restore();
  if (sn.acts.includes("tuang")) { mark(c, sn, "tuang", 336, 84); hot(262, 70, 120, 110, "act", "tuang", "Tuang", { lx: 316, ly: 188, next: sn.hint === "tuang" || !done.includes("tuang") }); }
  c.save(); c.translate(124, 190); c.rotate(-0.3 + (id === "aduk" ? Math.sin(p * 10 * TAU) * (calm ? 0.05 : 0.35) : 0)); rr(c, -2, -76, 5, 84, 2); c.fillStyle = "#cfd6da"; c.fill(); ell(c, 0, -80, 7, 5, "#cfd6da"); c.restore();
  if (sn.acts.includes("aduk")) { mark(c, sn, "aduk", 150, 108); hot(86, 100, 70, 110, "act", "aduk", "Aduk", { lx: 120, ly: 218, next: done.includes("tuang") && !done.includes("aduk") }); }
  // piring saji
  ell(c, 200, 262, 62, 16, "#f6f1e6", "#9aa6ab"); rr(c, 168, 236, 64, 14, 4); c.fillStyle = "rgba(255,255,255,.0)"; c.fill();
  if (cook) { rr(c, 150, 262, 100, 28, 14); c.fillStyle = "#f0c53a"; c.fill(); c.strokeStyle = "#173f50"; c.lineWidth = 2; c.stroke(); text(c, "🍽️ Sajikan", 200, 276, 13, "#173f50"); hot(142, 254, 116, 42, "finish", "", "", { next: done.includes("tuang") && done.includes("aduk") }); }
  hint2(c, sn); padRing(c, sn, "gelas", t);
}

// ---------- adegan: meja saji ----------
function plate(c, sn, now, t) {
  backdrop(c, "stove"); c.fillStyle = "#b8342b"; rr(c, 40, 214, 320, 56, 6); c.fill(); c.fillStyle = "rgba(255,255,255,.2)"; for (let i = 0; i < 8; i++) c.fillRect(54 + i * 40, 214, 14, 56);
  const ds = sn.dishes || []; const r = sn.result; let shown = r ? r.dish : ds.find((d) => d.u === sn.plated) || ds[0] || null;
  ell(c, 200, 214, 98, 30, "#f6f1e6", "#8f9ca1"); ell(c, 200, 211, 76, 21, "#fff", "rgba(140,160,170,.6)");
  if (shown) { dishArt(c, shown, 200, 206, 1.15, t, sn); text(c, shown.name, 200, 138, 14, "#fff"); } else text(c, "Meja saji kosong", 200, 150, 14, "#fff");
  ell(c, 64, 196, 17, 7, "#e9f4f8", "#7aa7bb"); rr(c, 50, 160, 28, 36, 6); c.fillStyle = "rgba(235,248,255,.6)"; c.fill(); c.strokeStyle = "#7aa7bb"; c.lineWidth = 2; c.stroke(); // gelas
  c.save(); c.translate(334, 188); c.rotate(0.3); rr(c, -2, -26, 5, 52, 2); c.fillStyle = "#cfd6da"; c.fill(); ell(c, 0, -30, 7, 9, "#cfd6da"); c.restore();   // sendok
  if (!r && ds.length) { const n = Math.min(6, ds.length); ds.slice(0, n).forEach((d, i) => { const x = 200 + (i - (n - 1) / 2) * 52, y = 262, sel = shown && shown.u === d.u; ell(c, x, y, 21, 8, sel ? "#ffe9a8" : "#f6f1e6", sel ? "#c2562b" : "#9aa6ab"); dishArt(c, d, x, y - 3, 0.42, t, sn); hot(x - 25, y - 22, 50, 36, "plate", d.u, "", {}); }); text(c, "Ketuk masakan untuk menatanya di piring", 200, 292, 10, "#fff"); }
  padRing(c, sn, "plate", t);
}
const DISHK = { ikan_goreng: ["ikan"], ikan_bakar: ["ikan", "jeruk_nipis"], sup_ikan: ["bowl", "ikan"], nasi_goreng_ikan: ["beras", "ikan"], sambal_ikan: ["ikan", "cabai"], telur_ceplok: ["telur"], telur_rebus: ["egg2"], tempe_goreng: ["tempe"], tumis_sayur: ["sayuran"], kopi_susu: ["cup"] };
const TIERK = { enak: 0.62, lumayan: 0.52, aneh: 0.4, mentah: 0, gosong: 1, tidak_layak: 0.85 };
function dishKinds(d) {
  if (d.rec && DISHK[d.rec]) return DISHK[d.rec]; const n = String(d.name || "").toLowerCase(); const out = [];
  for (const [w, k] of [["ikan", "ikan"], ["telur", "telur"], ["tempe", "tempe"], ["nasi", "beras"], ["beras", "beras"], ["sayur", "sayuran"]]) if (n.includes(w) && !out.includes(k)) out.push(k);
  return out.length ? out : ["blob"];
}
function dishArt(c, d, x, y, sc, t, sn) {
  const T = Core.tierInfo(d.tier), k = TIERK[d.tier] != null ? TIERK[d.tier] : 0.6, kinds = dishKinds(d);
  kinds.forEach((kk, i) => {
    const ox = (i - (kinds.length - 1) / 2) * 34 * sc, oy = -5 * sc - (i % 2) * 2 * sc;
    if (kk === "bowl") { ell(c, x + ox, y - 2 * sc, 42 * sc, 15 * sc, "#e7eef2", "#8aa"); ell(c, x + ox, y - 4 * sc, 36 * sc, 11 * sc, d.tier === "gosong" ? "#4a3a2a" : "#e9c57a"); }
    else if (kk === "egg2") { for (let q = 0; q < 2; q++) { ell(c, x + (q - 0.5) * 30 * sc, y - 8 * sc, 14 * sc, 18 * sc, "#fffaf0", "#a98a5a"); ell(c, x + (q - 0.5) * 30 * sc, y - 4 * sc, 7 * sc, 7 * sc, d.tier === "mentah" ? "#f8e08a" : "#f4b92c"); } }
    else if (kk === "cup") { rr(c, x - 18 * sc, y - 34 * sc, 36 * sc, 38 * sc, 8 * sc); c.fillStyle = "rgba(235,248,255,.7)"; c.fill(); c.strokeStyle = "#7aa7bb"; c.lineWidth = 2; c.stroke(); rr(c, x - 15 * sc, y - 24 * sc, 30 * sc, 25 * sc, 6 * sc); c.fillStyle = d.tier === "gosong" ? "#2a1a10" : "#b98a5a"; c.fill(); }
    else if (kk === "blob") ell(c, x + ox, y + oy, 36 * sc, 12 * sc, T.dish || "#c98a3c", "rgba(30,20,10,.5)");
    else food(c, kk, x + ox, y + oy, 0.82 * sc, k, t, 0);
  });
  if (d.tier === "aneh") { ell(c, x, y - 6 * sc, 40 * sc, 13 * sc, "rgba(150,90,170,.3)"); text(c, "?", x, y - 24 * sc, 16 * sc, "#fff"); }
  if (d.tier === "tidak_layak") { for (let i = 0; i < 5; i++) ell(c, x - 28 * sc + i * 14 * sc, y - 6 * sc + (i % 2) * 3 * sc, 5 * sc, 3.4 * sc, "rgba(100,150,70,.85)"); if (sc > 0.8) for (let i = 0; i < 3; i++) { c.strokeStyle = "rgba(120,170,70,.8)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 20 * sc + i * 20 * sc, y - 22 * sc); c.quadraticCurveTo(x - 14 * sc + i * 20 * sc, y - 30 * sc, x - 20 * sc + i * 20 * sc, y - 38 * sc); c.stroke(); } }
  if (d.tier === "mentah") ell(c, x - 6 * sc, y - 10 * sc, 22 * sc, 4 * sc, "rgba(255,255,255,.4)");
  if (d.tier === "gosong" && sc > 0.8) smokeAt(c, x, y - 16, performance.now(), 3);
  if (d.tier === "enak" && sc > 0.8 && !(sn && sn.calm)) for (let i = 0; i < 3; i++) { const ph = ((performance.now() / 700) + i / 3) % 1; c.globalAlpha = 1 - ph; c.fillStyle = "#ffd34a"; c.fillRect(x - 30 + i * 30, y - 28 - ph * 14, 3, 3); } c.globalAlpha = 1;
}

// ---------- adegan: wastafel ----------
function sink(c, sn, now, t) {
  backdrop(c, "sink"); const pad = sn.pad, id = pad && pad.id, p = pad ? pad.p : 0, step = sn.washStep, item = sn.washItem, calm = sn.calm, cur = ["sabun", "gosok", "bilas", "rak"][step];
  // basin + keran
  rr(c, 100, 168, 200, 90, 14); c.fillStyle = "#cfd8dd"; c.fill(); c.strokeStyle = "#7a8a92"; c.lineWidth = 3; c.stroke(); rr(c, 112, 178, 176, 70, 10); c.fillStyle = "#9fd4ee"; c.fill();
  rr(c, 192, 100, 16, 56, 6); c.fillStyle = "#b9c3c9"; c.fill(); rr(c, 192, 96, 56, 14, 7); c.fillStyle = "#b9c3c9"; c.fill(); rr(c, 232, 84, 10, 14, 3); c.fillStyle = "#e05a4a"; c.fill();
  if (id === "bilas" || (cur === "bilas" && false)) for (let i = 0; i < 6; i++) { const ph = ((t * 2.4) + i * 0.17) % 1; c.globalAlpha = 1 - ph * 0.4; ell(c, 244, 112 + ph * 70, 2, 4, "rgba(100,180,235,.95)"); } c.globalAlpha = 1;
  // rak piring (kanan)
  rr(c, 318, 120, 72, 100, 5); c.fillStyle = "#b08a58"; c.fill(); c.strokeStyle = "#6b4526"; c.lineWidth = 2; c.stroke(); for (let i = 0; i < 3; i++) { ell(c, 354, 140 + i * 30, 26, 7, "#f6f1e6", "#9aa6ab"); } if (step >= 3 || id === "rak") { const it = item ? Core.ITEM[item] : null; emoji(c, it ? it[0] : "🍽️", 354, 128 + (id === "rak" ? (1 - p) * 40 : 0), 24); }
  if (!item) {
    const list = sn.dirty; if (!list.length) text(c, "✨ Semua bersih!", 200, 140, 16, "#fff"); else { text(c, "Pilih alat kotor", 200, 130, 13, "#fff"); list.slice(0, 6).forEach((d, i) => { const n = Math.min(6, list.length), x = 200 + (i - (n - 1) / 2) * 56, y = 208; rr(c, x - 24, y - 26, 48, 52, 10); c.fillStyle = "rgba(255,246,228,.9)"; c.fill(); c.strokeStyle = "#173f50"; c.lineWidth = 2; c.stroke(); emoji(c, d.icon, x, y - 4, 24); text(c, "×" + d.n, x, y + 17, 10, "#173f50"); hot(x - 28, y - 30, 56, 60, "washpick", d.id, ""); }); }
  } else {
    const it = Core.ITEM[item]; const sc = id === "rak" ? 1 - p * 0.3 : 1; const bob = id === "gosok" && !calm ? Math.sin(t * 14) * 3 : 0; emoji(c, it[0], 200 + (id === "gosok" ? Math.sin(p * 20) * 4 : 0), 214 + bob, 54 * sc);
    const foam = step === 1 || (id === "gosok") ? 1 : step === 2 || id === "bilas" ? Math.max(0, 1 - (id === "bilas" ? p : 0)) : 0; if (step >= 1 && step < 3 || id === "sabun" && p > 0.3) for (let i = 0; i < 9; i++) ell(c, 156 + (i * 37) % 90, 200 + (i * 13) % 34, 6 + (i % 3) * 2, 6 + (i % 3) * 2, `rgba(255,255,255,${0.85 * (id === "sabun" ? p : foam)})`, "rgba(140,200,235,.8)");
    if (step >= 3) text(c, "✨", 232, 190, 18, "#fff");
    // sabun & spons
    const sx = 52, sy = 226; rr(c, sx - 28, sy - 12, 56, 30, 8); c.fillStyle = "#e9eef0"; c.fill(); c.strokeStyle = "#7a8a92"; c.lineWidth = 2; c.stroke(); rr(c, sx - 18, sy - 18, 34, 18, 6); c.fillStyle = "#f4a6c0"; c.fill(); c.strokeStyle = "#b8607c"; c.stroke();
    c.save(); c.translate(54, 276 - (id === "gosok" ? 8 : 0)); rr(c, -24, -12, 48, 24, 7); c.fillStyle = "#f2d04a"; c.fill(); c.strokeStyle = "#a88a1a"; c.lineWidth = 2; c.stroke(); c.fillStyle = "rgba(168,138,26,.5)"; for (let i = 0; i < 6; i++) ell(c, -16 + i * 6.4, (i % 2) * 6 - 3, 1.6, 1.6, "rgba(168,138,26,.6)"); c.restore();
    const pulse = (m) => (calm ? 1 : 0.65 + 0.35 * Math.sin(t * 6)); const tgt = { sabun: [52, 218, 24, 14], gosok: [54, 276, 30, 16], bilas: [220, 104, 36, 20], rak: [354, 170, 40, 60] }[cur];
    if (tgt && !pad) { c.globalAlpha = pulse(); c.strokeStyle = "#ffd34a"; c.lineWidth = 4; rr(c, tgt[0] - tgt[2] - 6, tgt[1] - tgt[3] - 6, (tgt[2] + 6) * 2, (tgt[3] + 6) * 2, 12); c.stroke(); c.globalAlpha = 1; }
    hot(20, 196, 66, 52, "washgo", "sabun", "Sabun", { when: cur === "sabun", lx: 52, ly: 250 }); hot(20, 254, 70, 44, "washgo", "gosok", "Gosok", { when: cur === "gosok", lx: 54, ly: 300 });
    hot(188, 84, 90, 56, "washgo", "bilas", "Bilas", { when: cur === "bilas", lx: 232, ly: 150 }); hot(318, 120, 72, 100, "washgo", "rak", "Taruh di rak", { when: cur === "rak", lx: 354, ly: 230 });
    B.hs = B.hs.filter((h) => h.a !== "washgo" || h.when);
    rr(c, 76, 6, 222, 22, 11); c.fillStyle = "rgba(255,246,228,.94)"; c.fill(); c.strokeStyle = "#173f50"; c.lineWidth = 1.5; c.stroke(); text(c, pad ? shortHint(pad) : `Langkah ${step + 1}/4 · ketuk yang menyala`, 187, 17.5, 11, "#173f50", "center", 206);
  }
  padRing(c, sn, "sink", t);
}

// ---------- cincin gerakan ----------
function padRing(c, sn, scene, t) {
  const pad = sn.pad; if (!pad) return; const f = focusL(pad.id, scene), r = 34;
  c.globalAlpha = 0.9; ell(c, f.x, f.y, r + 4, r + 4, "rgba(23,63,80,.18)"); c.lineWidth = 6; c.strokeStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.stroke();
  c.strokeStyle = "#2f8f7a"; c.beginPath(); c.arc(f.x, f.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, pad.p)); c.stroke(); c.globalAlpha = 1;
  const k = pad.kind; if (k === "tap") { const ph = sn.calm ? 0 : ((t * 2) % 1); c.globalAlpha = 0.6 * (1 - ph); c.strokeStyle = "#ffd34a"; c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, 12 + ph * 22, 0, TAU); c.stroke(); c.globalAlpha = 1; text(c, "ketuk", f.x, f.y + r + 14, 11, "#fff"); }
  else if (k === "hold") { text(c, "tahan", f.x, f.y + r + 14, 11, "#fff"); }
  else if (k === "circle") { c.strokeStyle = "rgba(255,211,74,.9)"; c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, r + 12, t * 2, t * 2 + 4.2); c.stroke(); text(c, "putar", f.x, f.y + r + 24, 11, "#fff"); }
  else if (k === "scrub") { text(c, "gosok ↔", f.x, f.y + r + 14, 11, "#fff"); }
}

// ---------- kanvas & siklus ----------
function ensure() {
  if (B.cv) return B.cv; const cv = document.createElement("canvas"); cv.id = "mkBench"; cv.className = "mk-bench hidden"; cv.setAttribute("aria-hidden", "true"); document.body.appendChild(cv); B.cv = cv; B.c = cv.getContext("2d");
  cv.addEventListener("pointerdown", onDown); cv.addEventListener("contextmenu", (e) => e.preventDefault()); return cv;
}
function area() {
  const sh = $("mkSheet"), W = window.innerWidth, H = window.innerHeight; if (!sh || sh.classList.contains("hidden")) return null; const r = sh.getBoundingClientRect();
  if (r.width < W * 0.8 && r.left > W * 0.25) return { x: 0, y: 0, w: Math.max(120, r.left), h: H };           // lanskap: panel di sisi kanan
  return { x: 0, y: TOP, w: W, h: Math.max(110, r.top - TOP) };
}
function layout() {
  const a = area(), cv = B.cv; if (!a) return false; const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.style.left !== a.x + "px" || cv.style.top !== a.y + "px" || cv.style.width !== a.w + "px" || cv.style.height !== a.h + "px") { cv.style.left = a.x + "px"; cv.style.top = a.y + "px"; cv.style.width = a.w + "px"; cv.style.height = a.h + "px"; }
  const pw = Math.round(a.w * dpr), ph = Math.round(a.h * dpr); if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  B.land = a.y === 0; B.dpr = dpr; B.cw = a.w; B.ch = a.h; B.s = Math.min(a.w / W0, a.h / H0); B.ox = (a.w - W0 * B.s) / 2; B.oy = (a.h - H0 * B.s) / 2 + (a.y === 0 ? TOP / 3 : 0); return true;
}
function frame(now) {
  B.raf = 0; const sn = SN(); if (!B.on || !sn || !sn.panel || document.hidden) { if (B.on && !document.hidden) B.raf = requestAnimationFrame(frame); return; }
  if (!layout()) { B.raf = requestAnimationFrame(frame); return; }
  const c = B.c, t = now / 1000; B.hs = []; B.scene = sceneOf(sn); B.padId = sn.pad ? sn.pad.id : null;
  c.setTransform(B.dpr, 0, 0, B.dpr, 0, 0); c.clearRect(0, 0, B.cw, B.ch); c.setTransform(B.dpr * B.s, 0, 0, B.dpr * B.s, B.ox * B.dpr, B.oy * B.dpr);
  c.save(); c.beginPath(); c.rect(-B.ox / B.s - 2, -B.oy / B.s - 2, B.cw / B.s + 4, B.ch / B.s + 4); c.clip();
  try {
    if (!sn.loaded) { backdrop(c, "stove"); text(c, "Menyiapkan dapur…", 200, 150, 16, "#fff"); }
    else if (B.scene === "stove") stove(c, sn, now, t); else if (B.scene === "counter") counter(c, sn, now, t); else if (B.scene === "gelas") glass(c, sn, now, t); else if (B.scene === "plate") plate(c, sn, now, t); else sink(c, sn, now, t);
    drawParts(c, now, sn.calm);
    // tab pindah (talenan ⇄ kompor) selama memasak di alat api
    if (B.scene === "stove" && sn.cook && heat(sn.cook.tool) && !sn.cook.onFire && !sn.cook.lifted && sn.acts.some((a) => ["cuci", "kupas", "potong", "pecah"].includes(a))) { rr(c, 304, 6, 90, 24, 12); c.fillStyle = "#fff6e4"; c.fill(); c.strokeStyle = "#173f50"; c.lineWidth = 2; c.stroke(); text(c, "🔪 Talenan", 349, 18.5, 11, "#173f50", "center", 82); hot(298, 2, 102, 34, "view", "counter", ""); }
    if (B.pressed && now - B.pressed.t < 260) { const q = (now - B.pressed.t) / 260; c.globalAlpha = 1 - q; ell(c, B.pressed.x, B.pressed.y, 8 + q * 22, 8 + q * 22, null, "#fff"); c.globalAlpha = 1; }
    face(c, 38, B.land ? 120 : 62, 20, sn.face, sn, now);
  } catch (e) { /* tampilan saja: jangan jatuhkan permainan */ }
  c.restore(); B.raf = requestAnimationFrame(frame);
}
function sync() {
  const sn = SN(); const want = !!(sn && sn.panel); ensure();
  if (want && !B.on) { B.on = true; B.cv.classList.remove("hidden"); document.body.classList.add("mk-bench-on"); if (!B.raf) B.raf = requestAnimationFrame(frame); }
  else if (!want && B.on) { B.on = false; B.cv.classList.add("hidden"); document.body.classList.remove("mk-bench-on"); B.parts.length = 0; if (B.raf) { cancelAnimationFrame(B.raf); B.raf = 0; } }
}
function toLogical(e) { const r = B.cv.getBoundingClientRect(); return { x: (e.clientX - r.left - B.ox) / B.s, y: (e.clientY - r.top - B.oy) / B.s }; }
function hit(lx, ly) { for (let i = B.hs.length - 1; i >= 0; i--) { const h = B.hs[i]; if (lx >= h.x && lx <= h.x + h.w && ly >= h.y && ly <= h.y + h.h) return h; } return null; }
function onDown(e) {
  const sn = SN(); if (!sn || !NW.dapurMasak) return; const l = toLogical(e); B.pressed = { x: l.x, y: l.y, t: performance.now() };
  if (sn.pad) { NW.dapurMasak.benchDown(e); return; }
  const h = hit(l.x, l.y); if (!h) return; e.preventDefault();
  if (h.a === "washgo") return NW.dapurMasak.benchAct("washgo", h.v); if (h.a === "washpick") return NW.dapurMasak.benchAct("washpick", h.v);
  if (h.a === "drop" || h.a === "view" || h.a === "plate") return NW.dapurMasak.benchSet(h.a, h.v);
  NW.dapurMasak.benchAct(h.a, h.v);
}
NW.dapurBench = {
  ensure, sync, burst, hit: (x, y) => { const l = toLogical({ clientX: x, clientY: y }); return hit(l.x, l.y); }, hotspots: () => B.hs.map((h) => ({ a: h.a, v: h.v, label: h.label })),
  rectOf: (a, v) => { const h = B.hs.slice().reverse().find((x) => x.a === a && String(x.v) === String(v)); if (!h) return null; const q = toClient(h.x, h.y); return { x: q.x, y: q.y, w: h.w * B.s, h: h.h * B.s }; },
  focus: (id) => toClient(focusL(id || B.padId, B.scene).x, focusL(id || B.padId, B.scene).y), get scene() { return B.scene; }, get on() { return B.on; }, _B: B,
};
})();
