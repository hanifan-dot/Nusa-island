// =========================================================
//  NUSA ISLAND — Bumbu 2.4.1 "Rahasia Ikan Mistis"
//   • Palung Mistis Selat: spot rahasia di laut lepas (ditemukan lewat berlayar). Suasana gelap, kabut tipis, cahaya samar.
//   • Dua ikan mistis eksklusif (tag khusus `mistik`; rarity tetap "legenda"): Ikan Lentera Arwah & Pari Bayang Samudra.
//     Keduanya fantasi dunia Nusa Island, BUKAN spesies nyata.
//   • Peluang: dilempar per lemparan di Palung dengan syarat waktu/cuaca (lunak: di luar syarat tetap mungkin tetapi jarang),
//     ditambah perlindungan sial kecil (maks ×1,8) supaya tidak perlu grinding. Tidak ada peluang berbayar.
//   • Petunjuk sebelum gigitan (kilau air + pesan + suara pendek) tanpa membocorkan jenis ikan.
//   • Menggambar ikan mistis (drawFish), efek di dunia & di layar memancing, serta perayaan tangkapan.
//  Memancing tetap memakai sistem yang sama (Strike, tegangan tali, joran). Logika peluang adalah fungsi murni agar bisa diuji.
// =========================================================
window.NW = window.NW || {};
(() => {
"use strict";
const N = () => window.Nusa, S = () => N().S;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Aturan peluang ----------
// base: peluang per lemparan di Palung saat syarat cocok. off: pengali di luar syarat (tetap mungkin, jarang).
const RULES = {
  lentera_arwah: { base: 0.05, off: 0.2, label: "malam atau berkabut", cond: (c) => !!(c.night || c.fog) },
  pari_bayang: { base: 0.032, off: 0.2, label: "senja, hujan, atau malam", cond: (c) => !!(c.dusk || c.rain || c.night) },
};
const IDS = Object.keys(RULES);
const PITY_AT = 45, PITY_MAX = 0.8;            // setelah 45 lemparan "cocok" tanpa hasil: peluang ×1,8 (naik pelan, tidak melonjak)
const LUCK_CAP = 1.5;                           // umpan/lemparan sempurna hanya menambah sedikit (maks ×1,5)

function ctxNow() {
  const h = S().hour, w = NW.weather && NW.weather.state;
  return { night: N().isNight(), dusk: h >= 16.8 && h < 19.8, rain: !!(w && w.rain > 0.18), fog: !!(w && w.fog > 0.4), hour: h };
}
const pityOf = (id) => { const s = S().sea; return s && s.pity && Number.isFinite(s.pity[id]) ? s.pity[id] : 0; };
// peluang satu lemparan (fungsi murni, ctx/pity/luck diberikan)
function chance(id, ctx, pity = 0, luck = 1) {
  const r = RULES[id]; if (!r) return 0;
  const on = r.cond(ctx), pm = 1 + PITY_MAX * clamp(pity / PITY_AT, 0, 1), lm = clamp(Math.pow(Math.max(luck, 1), 0.25), 1, LUCK_CAP);
  return r.base * (on ? 1 : r.off) * (on ? pm : 1) * lm;
}
// lempar sekali untuk satu lemparan. Mengembalikan id ikan mistis atau null. rnd/ctx dapat disuntik (uji).
function pick(ctx, luck, pity, rnd = Math.random) {
  const ps = IDS.map((id) => chance(id, ctx, pity ? pity[id] || 0 : 0, luck));
  let r = rnd();
  for (let i = 0; i < IDS.length; i++) { if (r < ps[i]) return IDS[i]; r -= ps[i]; }
  return null;
}
// dipanggil game.js saat umpan mendarat di spot laut yang punya ikan mistis
function rollCast(spot, luck, rnd = Math.random, ctx = ctxNow()) {
  if (!spot || !spot.mystic) return null;
  const sea = S().sea; if (sea && typeof sea === "object") { sea.pity = sea.pity && typeof sea.pity === "object" ? sea.pity : {}; for (const id of IDS) if (RULES[id].cond(ctx)) sea.pity[id] = (Number(sea.pity[id]) || 0) + 1; }
  const id = pick(ctx, luck, sea && sea.pity, rnd);
  return { fish: id, shown: false, glow: 0, t: 0, hintAt: 0 };
}
function setHintTime(m, biteTimer, rnd = Math.random) { // petunjuk muncul di tengah penantian, minimal ±1,2 dtk sebelum gigitan
  if (!m || !m.fish) return;
  m.hintAt = biteTimer > 2 ? clamp(biteTimer * (0.4 + rnd() * 0.25), 1.2, biteTimer - 0.7) : biteTimer * 0.5;
}
const fxMode = () => { const f = (NW.weather && NW.weather.fx) || { level: "sedang", calm: false }; return f.calm ? "calm" : f.level; }; // calm | rendah | sedang | tinggi
function hint(G) { // satu kali per lemparan; tidak menyebut jenis ikan
  const m = G.myst; if (!m || m.shown) return; m.shown = true;
  N().toast("✨ Ada sesuatu bergerak di kedalaman…", "good");
  N().sfx("mistis_petunjuk");
}
function onCaught(fish) { // reset perlindungan sial & catat di Buku Petualangan (sekali per spesies)
  if (!fish || !fish.mistik) return;
  const sea = S().sea; if (sea && sea.pity) sea.pity[fish.id] = 0;
  if (NW.adv && NW.adv.addNote) NW.adv.addNote({ id: "mistik:" + fish.id, area: "laut", title: "Tangkapan mistis: " + fish.name, text: fish.desc });
}
function migrate(st) { // aman terhadap data lama/rusak: hanya menambah bidang yang hilang
  const s = (st || S()).sea; if (!s || typeof s !== "object") return;
  if (!s.pity || typeof s.pity !== "object" || Array.isArray(s.pity)) s.pity = {};
  for (const id of IDS) if (!Number.isFinite(s.pity[id]) || s.pity[id] < 0) s.pity[id] = 0;
}

// ---------- Gambar ikan mistis (dipanggil dari drawFish) ----------
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function drawGhost(c, f, x, y, L) { // Lentera Arwah: transparan, cahaya biru kehijauan, umpan bercahaya di dahi
  const bl = L * 0.74, bh = bl * (f.shape[1] / f.shape[0]) * 1.15, hx = x + bl / 2 + L * 0.08, tx = hx - bl, gl = f.glow;
  let g = c.createRadialGradient(x, y, 2, x, y, L * 0.62);
  g.addColorStop(0, rgba(gl, 0.34)); g.addColorStop(0.55, rgba(gl, 0.12)); g.addColorStop(1, rgba(gl, 0));
  c.fillStyle = g; c.fillRect(x - L * 0.7, y - L * 0.55, L * 1.4, L * 1.1);
  const body = new Path2D();
  body.moveTo(hx, y + bh * 0.02);
  body.bezierCurveTo(hx - bl * 0.12, y - bh * 0.62, tx + bl * 0.3, y - bh * 0.55, tx, y - bh * 0.1);
  body.lineTo(tx, y + bh * 0.1);
  body.bezierCurveTo(tx + bl * 0.3, y + bh * 0.52, hx - bl * 0.15, y + bh * 0.55, hx, y + bh * 0.02);
  body.closePath();
  // sirip & ekor tembus pandang
  c.fillStyle = rgba(f.finColor, 0.3);
  c.beginPath(); c.moveTo(tx + 2, y); c.quadraticCurveTo(tx - L * 0.14, y - bh * 0.85, tx - L * 0.24, y - bh * 0.3); c.quadraticCurveTo(tx - L * 0.28, y, tx - L * 0.24, y + bh * 0.3); c.quadraticCurveTo(tx - L * 0.14, y + bh * 0.85, tx + 2, y); c.fill();
  c.beginPath(); c.moveTo(hx - bl * 0.34, y - bh * 0.5); c.quadraticCurveTo(x - bl * 0.05, y - bh * 1.05, tx + bl * 0.1, y - bh * 0.25); c.fill();
  c.beginPath(); c.moveTo(x - bl * 0.05, y + bh * 0.42); c.lineTo(x - bl * 0.2, y + bh * 0.9); c.lineTo(x - bl * 0.28, y + bh * 0.38); c.fill();
  c.strokeStyle = rgba(f.finColor, 0.5); c.lineWidth = Math.max(0.7, L * 0.004);
  for (let i = 0; i < 6; i++) { const u = i / 5; c.beginPath(); c.moveTo(tx + 2, y); c.lineTo(tx - L * 0.22, y + (u - 0.5) * bh * 1.3); c.stroke(); }
  // badan kaca
  g = c.createLinearGradient(0, y - bh * 0.6, 0, y + bh * 0.55);
  g.addColorStop(0, rgba(f.color, 0.3)); g.addColorStop(0.5, rgba(f.belly, 0.22)); g.addColorStop(1, rgba(f.color, 0.4));
  c.fillStyle = g; c.fill(body);
  c.save(); c.clip(body);
  // tulang & rusuk tampak dari luar
  c.strokeStyle = rgba("#e8fff8", 0.55); c.lineWidth = Math.max(0.8, L * 0.005);
  c.beginPath(); c.moveTo(tx, y); c.lineTo(hx - bl * 0.2, y - bh * 0.02); c.stroke();
  for (let i = 0; i < 9; i++) { const rx = tx + bl * (0.18 + i * 0.075); c.beginPath(); c.moveTo(rx, y); c.quadraticCurveTo(rx + bl * 0.03, y - bh * (0.36 - i * 0.02), rx + bl * 0.06, y - bh * (0.4 - i * 0.025)); c.moveTo(rx, y); c.quadraticCurveTo(rx + bl * 0.03, y + bh * (0.34 - i * 0.02), rx + bl * 0.06, y + bh * (0.38 - i * 0.025)); c.stroke(); }
  // "lentera" di perut: pusat cahaya
  g = c.createRadialGradient(x - bl * 0.02, y + bh * 0.02, 1, x - bl * 0.02, y + bh * 0.02, bh * 0.75);
  g.addColorStop(0, "rgba(240,255,250,.95)"); g.addColorStop(0.35, rgba(gl, 0.7)); g.addColorStop(1, rgba(gl, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x - bl * 0.02, y + bh * 0.02, bh * 0.8, 0, 7); c.fill();
  c.fillStyle = "rgba(235,255,248,.85)"; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(tx + bl * (0.2 + i * 0.1), y + bh * (0.36 - Math.abs(i - 3) * 0.015), Math.max(1, bh * 0.035), 0, 7); c.fill(); } // fotofor perut
  c.fillStyle = "rgba(255,255,255,.22)"; c.beginPath(); c.ellipse(x, y - bh * 0.28, bl * 0.34, bh * 0.08, 0, 0, 7); c.fill();
  c.restore();
  c.strokeStyle = rgba("#dffff5", 0.75); c.lineWidth = Math.max(1, L * 0.007); c.stroke(body);
  // mata besar bercahaya
  const er = Math.max(2.4, bh * 0.13);
  c.fillStyle = rgba("#eafff9", 0.95); c.beginPath(); c.arc(hx - bl * 0.075, y - bh * 0.1, er, 0, 7); c.fill();
  c.fillStyle = rgba(gl, 0.95); c.beginPath(); c.arc(hx - bl * 0.07, y - bh * 0.1, er * 0.55, 0, 7); c.fill();
  c.fillStyle = "#0b2f33"; c.beginPath(); c.arc(hx - bl * 0.065, y - bh * 0.1, er * 0.25, 0, 7); c.fill();
  // tangkai & bola lentera di dahi
  c.strokeStyle = rgba("#bff7e8", 0.85); c.lineWidth = Math.max(1, L * 0.006);
  const bx = hx + L * 0.12, by = y - bh * 0.95;
  c.beginPath(); c.moveTo(hx - bl * 0.12, y - bh * 0.5); c.quadraticCurveTo(hx - bl * 0.02, y - bh * 1.15, bx, by); c.stroke();
  g = c.createRadialGradient(bx, by, 0, bx, by, L * 0.1);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, rgba(gl, 0.9)); g.addColorStop(1, rgba(gl, 0));
  c.fillStyle = g; c.beginPath(); c.arc(bx, by, L * 0.1, 0, 7); c.fill();
}
function drawRay(c, f, x, y, L0) { // Pari Bayang: pari gelap lebar, tepian sirip bercahaya, ekor cambuk panjang
  const L = L0 * 0.86, bl = L * 0.8, bh = bl * 0.38, hx = x + bl / 2 + L * 0.04, tx = hx - bl, gl = f.glow; // diperkecil sedikit agar sayap & tanduk tidak terpotong kanvas
  let g = c.createRadialGradient(x, y, 4, x, y, L * 0.7);
  g.addColorStop(0, rgba(gl, 0.16)); g.addColorStop(1, rgba(gl, 0));
  c.fillStyle = g; c.fillRect(x - L * 0.75, y - L * 0.6, L * 1.5, L * 1.2);
  // ekor cambuk
  c.strokeStyle = "#0f1a26"; c.lineWidth = Math.max(1.2, L * 0.012); c.lineCap = "round";
  c.beginPath(); c.moveTo(tx + bl * 0.1, y); c.bezierCurveTo(tx - L * 0.08, y + bh * 0.1, tx - L * 0.2, y - bh * 0.25, tx - L * 0.3, y + bh * 0.05); c.stroke();
  c.strokeStyle = rgba(gl, 0.7); c.lineWidth = Math.max(0.8, L * 0.005);
  c.beginPath(); c.moveTo(tx - L * 0.13, y - bh * 0.1); c.bezierCurveTo(tx - L * 0.2, y - bh * 0.2, tx - L * 0.25, y - bh * 0.1, tx - L * 0.3, y + bh * 0.05); c.stroke();
  // badan melebar: dua sayap besar
  const wing = new Path2D();
  wing.moveTo(hx + L * 0.02, y + bh * 0.03);
  wing.bezierCurveTo(hx - bl * 0.12, y - bh * 0.38, x + bl * 0.14, y - bh * 1.05, x - bl * 0.12, y - bh * 1.22);   // tepi depan sayap atas
  wing.bezierCurveTo(x - bl * 0.34, y - bh * 0.78, tx + bl * 0.12, y - bh * 0.3, tx + bl * 0.06, y);               // tepi belakang
  wing.bezierCurveTo(tx + bl * 0.12, y + bh * 0.3, x - bl * 0.34, y + bh * 0.78, x - bl * 0.12, y + bh * 1.22);
  wing.bezierCurveTo(x + bl * 0.14, y + bh * 1.05, hx - bl * 0.12, y + bh * 0.38, hx + L * 0.02, y + bh * 0.03);
  wing.closePath();
  g = c.createLinearGradient(0, y - bh * 1.2, 0, y + bh * 1.2);
  g.addColorStop(0, "#0c1622"); g.addColorStop(0.5, f.color); g.addColorStop(1, "#0f1b2a");
  c.fillStyle = g; c.fill(wing);
  c.save(); c.clip(wing);
  g = c.createLinearGradient(0, y - bh * 0.2, 0, y + bh * 1.2); g.addColorStop(0, "rgba(52,80,106,0)"); g.addColorStop(1, rgba(f.belly, 0.55));
  c.fillStyle = g; c.fillRect(tx - 20, y - bh * 0.2, bl + 40, bh * 1.5);
  c.fillStyle = rgba(gl, 0.4); const R = (i) => Math.abs(Math.sin(i * 12.9898 + 4.1)) ; // bintik pendar tetap (deterministik)
  for (let i = 0; i < 20; i++) { c.beginPath(); c.arc(tx + bl * (0.12 + R(i) * 0.7), y + (R(i + 40) - 0.5) * bh * 1.5, Math.max(0.8, bh * 0.02 * (0.6 + R(i + 9))), 0, 7); c.fill(); }
  c.restore();
  // tepian sayap bercahaya (dua goresan: lembut lebar + tajam tipis)
  c.lineJoin = "round";
  c.strokeStyle = rgba(gl, 0.22); c.lineWidth = Math.max(3, L * 0.03); c.stroke(wing);
  c.strokeStyle = rgba("#bff0ff", 0.85); c.lineWidth = Math.max(1, L * 0.006); c.stroke(wing);
  // sirip kepala (tanduk) & mata pendar
  c.fillStyle = "#101c2a"; c.beginPath(); c.moveTo(hx + L * 0.01, y - bh * 0.1); c.quadraticCurveTo(hx + L * 0.1, y - bh * 0.28, hx + L * 0.17, y - bh * 0.12); c.quadraticCurveTo(hx + L * 0.09, y - bh * 0.06, hx + L * 0.02, y + bh * 0.02); c.fill();
  c.beginPath(); c.moveTo(hx + L * 0.01, y + bh * 0.16); c.quadraticCurveTo(hx + L * 0.1, y + bh * 0.34, hx + L * 0.17, y + bh * 0.2); c.quadraticCurveTo(hx + L * 0.09, y + bh * 0.14, hx + L * 0.02, y + bh * 0.1); c.fill();
  const er = Math.max(2, bh * 0.055);
  g = c.createRadialGradient(hx - bl * 0.09, y - bh * 0.14, 0, hx - bl * 0.09, y - bh * 0.14, er * 3.2);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, rgba(gl, 0.95)); g.addColorStop(1, rgba(gl, 0));
  c.fillStyle = g; c.beginPath(); c.arc(hx - bl * 0.09, y - bh * 0.14, er * 3.2, 0, 7); c.fill();
}
function drawFish(c, f, x, y, L) { if (f.ray) drawRay(c, f, x, y, L); else drawGhost(c, f, x, y, L); }

// ---------- Efek di dunia (Palung Mistis Selat) ----------
function inPx(view, p, m) { return p.x > view.x0 - m && p.x < view.x1 + m && p.y > view.y0 - m && p.y < view.y1 + m; }
function palungUnder(c, t, view, s) { // di bawah kapal: air menggelap, riak gelap berputar, kilau samar
  const P = NW.P, o = P(s.x, s.y, 0); if (!inPx(view, o, 320)) return;
  const dk = N().darkness(), mode = fxMode(), calm = mode === "calm" || mode === "rendah", pulse = calm ? 0.6 : 0.6 + 0.4 * Math.sin(t * 0.7);
  const R = s.r * 45.25;
  c.save(); c.translate(o.x, o.y); c.scale(1, 0.5);
  let g = c.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 1.05);
  g.addColorStop(0, `rgba(2,14,28,${(0.45 + dk * 0.12).toFixed(3)})`); g.addColorStop(0.7, `rgba(4,24,44,${(0.26 + dk * 0.08).toFixed(3)})`); g.addColorStop(1, "rgba(4,24,44,0)");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * 1.05, 0, 7); c.fill();
  // cahaya samar dari kedalaman (berdenyut pelan; tidak berdenyut bila efek dikurangi)
  g = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.55);
  g.addColorStop(0, `rgba(110,240,215,${((0.14 + dk * 0.16) * pulse).toFixed(3)})`); g.addColorStop(1, "rgba(110,240,215,0)");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * 0.55, 0, 7); c.fill();
  c.restore();
  const rings = mode === "tinggi" ? 3 : mode === "sedang" ? 2 : 1;
  c.lineWidth = 1.2;
  for (let i = 0; i < rings; i++) { const k = calm ? 0.35 + i * 0.2 : (t * 0.1 + i / rings) % 1; c.strokeStyle = `rgba(150,230,225,${(0.2 * (1 - k)).toFixed(3)})`; c.beginPath(); c.ellipse(o.x, o.y, s.r * 40 * (0.35 + k * 0.7), s.r * 20 * (0.35 + k * 0.7), 0, 0, 7); c.stroke(); }
  const motes = mode === "tinggi" ? 9 : mode === "sedang" ? 5 : 2;
  for (let i = 0; i < motes; i++) { // titik cahaya yang muncul dan padam perlahan
    const ph = calm ? 0.5 : (t * 0.22 + i * 0.37) % 1, a = Math.sin(ph * Math.PI), ang = i * 2.399 + Math.floor(t * 0.22 + i * 0.37) * 1.7, rr = (0.25 + ((i * 0.618) % 1) * 0.65) * s.r;
    const p = P(s.x + Math.cos(ang) * rr, s.y + Math.sin(ang) * rr * 0.9, 0);
    c.fillStyle = `rgba(170,255,238,${(a * (0.35 + dk * 0.4)).toFixed(3)})`; c.beginPath(); c.arc(p.x, p.y, 1.6 + a * 1.4, 0, 7); c.fill();
    c.fillStyle = `rgba(110,240,215,${(a * 0.16).toFixed(3)})`; c.beginPath(); c.arc(p.x, p.y, 6 + a * 3, 0, 7); c.fill();
  }
}
function palungOver(c, t, view, s) { // di atas kapal: kabut tipis (sangat transparan, tidak menghalangi navigasi)
  const P = NW.P, o = P(s.x, s.y, 0); if (!inPx(view, o, 320)) return;
  const mode = fxMode(), n = mode === "tinggi" ? 3 : mode === "sedang" ? 2 : 1, calm = mode === "calm";
  for (let i = 0; i < n; i++) {
    const dr = calm ? 0 : t * 0.04 + i * 2.1, p = P(s.x + Math.cos(dr) * s.r * 0.35, s.y + Math.sin(dr * 1.3) * s.r * 0.3, 14 + i * 6);
    const R = s.r * (30 + i * 9);
    c.save(); c.translate(p.x, p.y); c.scale(1, 0.4);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, "rgba(190,215,225,.17)"); g.addColorStop(0.6, "rgba(170,200,212,.09)"); g.addColorStop(1, "rgba(170,200,212,0)");
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); c.restore();
  }
}

// ---------- Efek di layar memancing (Palung): suasana + kilau petunjuk ----------
function drawFishScene(c, G, d) {
  const sp = G.sea; if (!sp || sp.hint !== "palung") return;
  const { W, H, HZ, U, dk } = d, mode = fxMode(), calm = mode === "calm";
  // sedikit gelap di air dan kabut tipis dekat cakrawala
  let g = c.createLinearGradient(0, HZ, 0, H);
  g.addColorStop(0, "rgba(6,30,48,.18)"); g.addColorStop(1, "rgba(2,12,26,.34)");
  c.fillStyle = g; c.fillRect(0, HZ, W, H - HZ);
  if (mode !== "rendah") {
    const bands = mode === "tinggi" ? 3 : 2;
    for (let i = 0; i < bands; i++) {
      const y = HZ + (6 + i * 22) * U, sh = calm ? 0 : Math.sin(G.t * 0.25 + i * 1.9) * 18 * U;
      g = c.createLinearGradient(0, y - 16 * U, 0, y + 16 * U); g.addColorStop(0, "rgba(180,205,215,0)"); g.addColorStop(0.5, `rgba(180,205,215,${(0.17 - i * 0.04).toFixed(3)})`); g.addColorStop(1, "rgba(180,205,215,0)");
      c.fillStyle = g; c.fillRect(sh - 20 * U, y - 16 * U, W + 40 * U, 32 * U);
    }
  }
  const m = G.myst;
  // cahaya samar dari bawah (selalu ada di Palung, lebih terlihat saat malam)
  const bx = d.projX(G.bob.x, G.bob.z), by = d.projY(G.bob.z), s = d.projS(G.bob.z) * 2.2 * U;
  const base = 0.05 + dk * 0.08;
  g = c.createRadialGradient(bx, by, 0, bx, by, 150 * s);
  g.addColorStop(0, `rgba(110,240,215,${base})`); g.addColorStop(1, "rgba(110,240,215,0)");
  c.fillStyle = g; c.beginPath(); c.ellipse(bx, by, 150 * s, 50 * s, 0, 0, 7); c.fill();
  if (!(m && m.fish && m.shown && (G.phase === "waiting" || G.phase === "bite" || G.phase === "fight"))) return;
  // petunjuk: kilau misterius di permukaan air di sekitar pelampung (identitas ikan tidak terlihat)
  m.glow = Math.min(1, (m.glow || 0) + 0.02);
  const k = calm ? 0.7 : 0.55 + 0.45 * Math.sin(G.t * 2.2), n = calm ? 4 : mode === "rendah" ? 6 : mode === "sedang" ? 10 : 16;
  g = c.createRadialGradient(bx, by + 6 * s, 0, bx, by + 6 * s, 90 * s);
  g.addColorStop(0, `rgba(120,255,225,${(0.34 * m.glow * k).toFixed(3)})`); g.addColorStop(1, "rgba(120,255,225,0)");
  c.fillStyle = g; c.beginPath(); c.ellipse(bx, by + 6 * s, 90 * s, 30 * s, 0, 0, 7); c.fill();
  for (let i = 0; i < n; i++) {
    const ph = calm ? 0.5 : (G.t * 0.7 + i * 0.173) % 1, a = Math.sin(ph * Math.PI) * m.glow, ang = i * 2.399, rr = (0.25 + ((i * 0.37) % 1) * 0.85) * 80 * s;
    const px = bx + Math.cos(ang) * rr * 1.5, py = by + 6 * s + Math.sin(ang) * rr * 0.45;
    c.strokeStyle = `rgba(200,255,240,${(a * 0.8).toFixed(3)})`; c.lineWidth = Math.max(1, 1.6 * U);
    c.beginPath(); c.moveTo(px - (3 + a * 5) * U, py); c.lineTo(px + (3 + a * 5) * U, py); c.moveTo(px, py - (1.5 + a * 2) * U); c.lineTo(px, py + (1.5 + a * 2) * U); c.stroke();
  }
}

NW.mystic = { RULES, IDS, PITY_AT, PITY_MAX, LUCK_CAP, ctxNow, chance, pick, rollCast, setHintTime, hint, onCaught, migrate, pityOf, drawFish, palungUnder, palungOver, drawFishScene, fxMode };
})();
