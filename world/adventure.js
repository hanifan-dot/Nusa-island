// =========================================================
//  NUSA ISLAND — Bumbu 2 "Petualangan Nusantara": lapisan petualangan umum
//  - S.adv (berversi): area terakhir, posisi per area, daerah dikunjungi,
//    titik penemuan, catatan perjalanan, penghargaan, ingatan dialog NPC area baru
//  - Sistem penemuan tempat (dipakai ulang oleh setiap area: area.discoveries)
//  - Perjalanan antardaerah: layar transisi berlayar singkat
//  - Menu "📖 Buku Petualangan"
//  Cerita per area mendaftar lewat NW.adv.registerStory(areaId, {...}).
//  Tidak ada stamina/energi, tenggat, atau hadiah login: semua bisa santai.
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa, S = () => N().S;
const $ = (id) => document.getElementById(id);
const ADV_V = 1;

// ---------- Data (berversi, hanya mengisi yang kosong) ----------
const storyProviders = {}; // areaId → { key, title, defaults(), status(), challengeFish(), fishNeeds() }
function registerStory(areaId, def) { storyProviders[areaId] = def; }
function defaults() {
  const d = { v: ADV_V, area: "muara", pos: {}, visited: { muara: Date.now() }, found: {}, notes: [], awards: {}, mem: {}, best: {}, seen: {} };
  for (const [, p] of Object.entries(storyProviders)) if (p.key && p.defaults) d[p.key] = p.defaults();
  return d;
}
const isObj = (o) => o && typeof o === "object" && !Array.isArray(o);
function fill(dst, src) { // isi kunci yang belum ada (rekursif), tidak menimpa nilai lama
  for (const k of Object.keys(src)) {
    if (dst[k] === undefined || dst[k] === null) dst[k] = JSON.parse(JSON.stringify(src[k]));
    else if (isObj(dst[k]) && isObj(src[k])) fill(dst[k], src[k]);
  }
  return dst;
}
function migrate(s) {
  if (!isObj(s.adv)) s.adv = defaults();
  else fill(s.adv, defaults());
  const a = s.adv;
  if (!Array.isArray(a.notes)) a.notes = [];
  for (const k of ["pos", "visited", "found", "awards", "mem", "best", "seen"]) if (!isObj(a[k])) a[k] = {};
  if (typeof a.area !== "string" || !NW.areas.get(a.area)) a.area = "muara";
  if (!a.visited.muara) a.visited.muara = Date.now(); // Muara selalu sudah dikunjungi (kampung awal)
  a.v = ADV_V;
  return a;
}
const A = () => S().adv;

// ---------- Area & posisi ----------
function startArea(canSail) {
  let a = NW.areas.get(A().area);
  if (!a || (a.locIndex >= 0 && !canSail(a.locIndex))) a = NW.areas.get("muara");
  NW.areas.setCurrent(a.id);
  A().area = a.id;
  return a;
}
function savePos(id, p) { A().pos[id] = p; }
function getPos(id) { return A().pos[id] || null; }
function enteredArea(id) {
  const a = A(); a.area = id;
  if (!a.visited[id]) { a.visited[id] = Date.now(); const ar = NW.areas.get(id); if (ar && ar.firstVisitNote) addNote(ar.firstVisitNote); }
  N().save();
}

// ---------- Penemuan tempat ----------
// area.discoveries = [{ id, name, x, y, r, desc }]; ditemukan sekali saat pemain mendekat (tersimpan)
const allDisc = () => NW.areas.list.flatMap((ar) => (ar.discoveries || []).map((d) => ({ ...d, area: ar.id })));
const isFound = (id) => !!A().found[id];
let tickT = 0;
const fx = []; // kilau kecil saat menemukan tempat (maks. 1 grup)
function tick(areaId, p, dt) {
  tickT += dt; if (tickT < 0.25) { stepFx(dt); return; } // cukup 4× per detik
  const el = tickT; tickT = 0; stepFx(el);
  const ar = NW.areas.get(areaId); if (!ar || !ar.discoveries) return;
  for (const d of ar.discoveries) {
    if (A().found[d.id]) continue;
    if (d.when && !d.when()) continue;
    if (Math.hypot(p.x - d.x, p.y - d.y) > d.r) continue;
    discover(d, ar);
  }
}
function discover(d, ar) {
  if (A().found[d.id]) return false;
  A().found[d.id] = Date.now();
  N().save();
  showDiscover(`✨ Lokasi ditemukan: ${d.name}`);
  N().tone(784, 0.12, "triangle", 0.08); N().tone(1175, 0.22, "triangle", 0.07, null, 0.1);
  fx.length = 0; for (let i = 0; i < 14; i++) fx.push({ x: d.x, y: d.y, a: Math.random() * 6.28, r: 0.2 + Math.random() * 1.2, z: 10 + Math.random() * 40, t: 0, life: 1.4 + Math.random() * 0.8 });
  if (ar.hooks && ar.hooks.onDiscover) ar.hooks.onDiscover(d);
  refreshBadge();
  return true;
}
function stepFx(dt) { for (const f of fx) f.t += dt; for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > fx[i].life) fx.splice(i, 1); }
function drawFx(c, t) {
  for (const f of fx) {
    const k = f.t / f.life, p = NW.P(f.x + Math.cos(f.a) * f.r * (0.4 + k), f.y + Math.sin(f.a) * f.r * (0.4 + k), NW.LIFT + NW.heightAt(f.x, f.y) + f.z + k * 30);
    c.globalAlpha = Math.max(0, 1 - k); c.fillStyle = "#fff0b0";
    c.beginPath(); c.moveTo(p.x, p.y - 4); c.lineTo(p.x + 1.2, p.y - 1.2); c.lineTo(p.x + 4, p.y); c.lineTo(p.x + 1.2, p.y + 1.2); c.lineTo(p.x, p.y + 4); c.lineTo(p.x - 1.2, p.y + 1.2); c.lineTo(p.x - 4, p.y); c.lineTo(p.x - 1.2, p.y - 1.2); c.fill();
  }
  c.globalAlpha = 1;
}
let discT = 0;
function showDiscover(text) {
  const el = $("discover"); if (!el) return;
  el.textContent = text; el.classList.add("show");
  clearTimeout(discT); discT = setTimeout(() => el.classList.remove("show"), 2600);
}

// ---------- Catatan perjalanan & penghargaan (sekali per id) ----------
function addNote(n) { // { id, area, title, text }
  if (A().notes.some((x) => x.id === n.id)) return false;
  A().notes.push({ id: n.id, area: n.area, title: n.title, text: n.text, at: Date.now() });
  N().save(); refreshBadge(); return true;
}
function award(a) { // { id, icon, name, desc, kind: "gelar" | "lencana" }
  if (A().awards[a.id]) return false;
  A().awards[a.id] = { icon: a.icon, name: a.name, desc: a.desc, kind: a.kind || "lencana", at: Date.now() };
  N().save(); refreshBadge(); return true;
}
const hasAward = (id) => !!A().awards[id];

// ---------- Dialog tidak mengulang (ingatan per NPC area baru) ----------
// pool: [{ id, c?: () => bool, t: () => [kalimat] }] → kalimat berikutnya yang belum didengar
function pickLine(npcId, pool) {
  const mem = A().mem[npcId] = A().mem[npcId] || { seen: [], n: 0 };
  const ok = pool.filter((l) => !l.c || l.c());
  let next = ok.find((l) => !mem.seen.includes(l.id));
  if (!next) { mem.seen = mem.seen.slice(-2); next = ok.find((l) => !mem.seen.includes(l.id)) || ok[0]; }
  mem.seen.push(next.id); if (mem.seen.length > 40) mem.seen.shift();
  mem.n++;
  return next.t();
}
const talkCount = (npcId) => (A().mem[npcId] ? A().mem[npcId].n : 0);

// ---------- Perjalanan antardaerah (layar berlayar singkat) ----------
let vg = null;
function voyage(area, arrive) {
  if (vg) return false;
  const el = $("voyage"), cv = el.querySelector("canvas"), from = NW.areas.cur;
  const home = area.id === "muara";
  const L = LOCATIONS[area.locIndex];
  el.querySelector(".vg-title").textContent = home ? "⛵ Pulang ke Muara Kampung" : `⛵ Berlayar ke ${L ? L.name : area.name}`;
  el.querySelector(".vg-sub").textContent = `${UPGRADES.boat.levels[N().upLvl("boat")]} · dari ${from.name}${home ? "" : ` · turun di ${area.name}`}`;
  el.classList.remove("hidden"); requestAnimationFrame(() => el.classList.add("on"));
  vg = { t: 0, dur: 2.7, arrived: false, arrive, el, cv, last: performance.now(), area };
  N().sfx("click"); N().tone(330, 0.5, "sine", 0.05, 392);
  requestAnimationFrame(vgFrame);
  return true;
}
function vgFrame(now) {
  if (!vg) return;
  const dt = Math.min(0.05, (now - vg.last) / 1000); vg.last = now; vg.t += dt;
  if (!vg.arrived && vg.t > 0.45) { vg.arrived = true; try { vg.arrive(); } catch (e) { console.error(e); } } // pindah area di balik layar
  drawVoyage(vg.cv, vg.t / vg.dur);
  if (vg.t >= vg.dur) {
    const el = vg.el; el.classList.remove("on");
    setTimeout(() => el.classList.add("hidden"), 320);
    vg = null; N().toast(`⛵ Tiba di ${NW.areas.cur.name}`, "good"); return;
  }
  requestAnimationFrame(vgFrame);
}
function skipVoyage() { if (vg && vg.t > 0.8) vg.t = Math.max(vg.t, vg.dur - 0.35); }
function drawVoyage(cv, k) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const dk = N().darkness(), lake = vg.area.id === "toba" || NW.areas.cur.id === "toba";
  const sky = c.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, NW.mix("#8ec5e0", "#0e1a3a", dk)); sky.addColorStop(1, NW.mix("#f6e7c1", "#2a3560", dk));
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // bukit jauh (Toba) / pulau jauh (Muara) bergeser pelan
  c.fillStyle = NW.mix(lake ? "#6f9a8c" : "#7fae8a", "#1a2a40", dk * 0.8);
  c.beginPath(); c.moveTo(0, h * 0.55);
  for (let x = 0; x <= w; x += 12) c.lineTo(x, h * 0.55 - (lake ? 34 : 14) - Math.sin(x * 0.012 + k * 2) * (lake ? 16 : 6) - Math.sin(x * 0.031) * 6);
  c.lineTo(w, h * 0.55); c.fill();
  const sea = c.createLinearGradient(0, h * 0.55, 0, h);
  sea.addColorStop(0, NW.mix("#4f9fb8", "#0d2238", dk)); sea.addColorStop(1, NW.mix("#1f6f8f", "#081626", dk));
  c.fillStyle = sea; c.fillRect(0, h * 0.55, w, h * 0.45);
  c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) { const y = h * 0.6 + i * h * 0.045, off = ((k * 900 + i * 57) % 80); c.beginPath(); for (let x = -80 + off; x < w + 80; x += 80) { c.moveTo(x, y); c.quadraticCurveTo(x + 20, y - 4, x + 40, y); } c.stroke(); }
  // perahu bergerak kiri → kanan dengan buih
  const bx = -80 + (w + 160) * Math.min(1, k * 1.05), by = h * 0.72 + Math.sin(k * 30) * 3;
  c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2;
  for (let i = 1; i <= 4; i++) { c.beginPath(); c.moveTo(bx - 40 - i * 22, by + 8); c.quadraticCurveTo(bx - 50 - i * 22, by + 2, bx - 62 - i * 22, by + 6 + i); c.stroke(); }
  c.save(); c.translate(bx, by); c.rotate(Math.sin(k * 24) * 0.04);
  c.fillStyle = "#1f3f5a"; c.beginPath(); c.moveTo(-46, -4); c.quadraticCurveTo(-40, 14, 0, 14); c.quadraticCurveTo(40, 14, 54, -6); c.closePath(); c.fill();
  c.fillStyle = "#2f7a8c"; c.beginPath(); c.moveTo(-44, -8); c.lineTo(52, -10); c.quadraticCurveTo(40, 4, 0, 5); c.quadraticCurveTo(-40, 4, -44, -8); c.fill();
  c.fillStyle = "#e0b84c"; c.fillRect(-44, -10, 96, 3);
  c.fillStyle = "#f3e7c9"; c.fillRect(-22, -30, 24, 20); c.fillStyle = "#e2574c"; c.fillRect(-25, -34, 30, 6);
  c.fillStyle = "#a9d6e5"; c.fillRect(-18, -25, 6, 6); c.fillRect(-9, -25, 6, 6);
  c.fillStyle = "#6b4527"; c.fillRect(14, -56, 3, 46); c.fillStyle = "#e2342c"; c.fillRect(17, -56, 13, 5); c.fillStyle = "#fff"; c.fillRect(17, -51, 13, 5);
  c.restore();
}
const isBusy = () => !!vg;
function travelTo(areaId) { const ar = NW.areas.get(areaId); return ar ? N().travel(ar.locIndex) : false; }

// ---------- Tantangan mancing cerita (didelegasikan ke cerita area) ----------
function challengeFish(perfect, locId) {
  for (const p of Object.values(storyProviders)) { const r = p.challengeFish && p.challengeFish(perfect, locId); if (r) return r; }
  return null;
}

// ---------- 📖 Buku Petualangan ----------
const artCache = {};
function art(ar) { // ilustrasi kecil per daerah (digambar sekali, disimpan sebagai gambar)
  if (artCache[ar.id]) return artCache[ar.id];
  const c = document.createElement("canvas"); c.width = 132; c.height = 80; const g = c.getContext("2d");
  if (ar.theme && ar.theme.bookArt) ar.theme.bookArt(g, 132, 80);
  else {
    const sky = g.createLinearGradient(0, 0, 0, 50); sky.addColorStop(0, "#9fd3e6"); sky.addColorStop(1, "#f6e7c1"); g.fillStyle = sky; g.fillRect(0, 0, 132, 80);
    g.fillStyle = "#2fa3bb"; g.fillRect(0, 46, 132, 34);
    g.fillStyle = "#efd8a2"; g.beginPath(); g.ellipse(60, 56, 46, 12, 0, 0, 7); g.fill();
    g.fillStyle = "#86c064"; g.beginPath(); g.ellipse(60, 52, 38, 9, 0, 0, 7); g.fill();
    g.strokeStyle = "#8a6a45"; g.lineWidth = 3; g.beginPath(); g.moveTo(34, 52); g.quadraticCurveTo(36, 34, 42, 22); g.stroke();
    g.fillStyle = "#57a84a"; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(42 + Math.cos(i) * 9, 22 + Math.sin(i) * 3, 10, 3, i, 0, 7); g.fill(); }
    g.fillStyle = "#efd9b0"; g.fillRect(64, 40, 20, 12); g.fillStyle = "#c2603b"; g.beginPath(); g.moveTo(61, 41); g.lineTo(74, 31); g.lineTo(87, 41); g.fill();
    g.fillStyle = "#b27d48"; g.fillRect(92, 52, 30, 3);
  }
  return (artCache[ar.id] = c.toDataURL());
}
const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const fmtDate = (ts) => new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
function bookHTML() {
  const a = A(), areas = NW.areas.list, ds = allDisc();
  const visited = areas.filter((ar) => a.visited[ar.id]).length, found = ds.filter((d) => a.found[d.id]).length;
  let h = `<div class="adv-sum"><span>🗺️ Daerah <b>${visited}/${areas.length}</b></span><span>✨ Penemuan <b>${found}/${ds.length}</b></span><span>🏅 Penghargaan <b>${Object.keys(a.awards).length}</b></span></div>`;
  for (const ar of areas) {
    const vis = !!a.visited[ar.id], L = LOCATIONS[ar.locIndex], locked = L && !N().canSail(ar.locIndex);
    const dl = (ar.discoveries || []), fd = dl.filter((d) => a.found[d.id]).length;
    const sp = storyProviders[ar.id], st = sp && sp.status ? sp.status() : null;
    const notes = a.notes.filter((n) => n.area === ar.id);
    h += `<div class="adv-area ${vis ? "" : "unvisited"}"><div class="adv-top"><img src="${art(ar)}" alt="" width="88" height="53">
      <div class="grow"><div class="nm">${esc(ar.name)}</div>
      <div class="sub">${vis ? `✔ Dikunjungi sejak ${fmtDate(a.visited[ar.id])}` : locked ? `🔒 Butuh ${UPGRADES.boat.levels[L.boat - 1]}` : "Belum dikunjungi · naik kapal dari dermaga"}</div>
      <div class="sub">✨ Titik penemuan ${fd}/${dl.length}</div></div></div>`;
    if (dl.length) h += `<div class="adv-disc">${dl.map((d) => a.found[d.id] ? `<span class="on" title="${esc(d.desc || "")}">📍 ${esc(d.name)}</span>` : `<span>❔ ???</span>`).join("")}</div>`;
    if (st) h += `<div class="adv-story"><b>📖 ${esc(st.title)}</b> · ${st.done ? "✔ Selesai" : esc(st.now)}${st.chapters ? `<div class="adv-ch">${st.chapters.map((c) => `<span class="${c.done ? "on" : c.cur ? "cur" : ""}">${c.done ? "✔" : c.cur ? "▶" : "·"} ${esc(c.name)}</span>`).join("")}</div>` : ""}</div>`;
    if (notes.length) h += `<div class="adv-notes">${notes.map((n) => `<div class="adv-note"><b>📝 ${esc(n.title)}</b><span class="muted"> · ${fmtDate(n.at)}</span><div>${esc(n.text)}</div></div>`).join("")}</div>`;
    else if (vis) h += `<div class="muted adv-empty">Belum ada catatan perjalanan di sini.</div>`;
    h += `</div>`;
  }
  const aw = Object.entries(a.awards);
  h += `<h3 class="sub-h">🏅 Penghargaan Petualangan</h3>`;
  h += aw.length ? `<div class="list">${aw.map(([, w]) => `<div class="mission claimed"><div class="m-ic">${w.icon}</div><div class="grow"><div class="nm">${esc(w.name)} <span class="rod-tag">${w.kind === "gelar" ? "Gelar petualangan" : "Lencana"}</span></div><div class="sub">${esc(w.desc)} · ${fmtDate(w.at)}</div></div></div>`).join("")}</div>` : `<p class="muted">Selesaikan cerita daerah untuk mendapat gelar petualangan. Gelar ini terpisah dari 8 gelar jumlah tangkapan.</p>`;
  h += `<p class="muted">Semua progres tersimpan otomatis. Tidak ada batas waktu — jelajahi dengan santai.</p>`;
  return h;
}
function refreshBadge() {
  const b = $("advBadge"); if (!b) return;
  const fresh = A().notes.filter((n) => n.at > (A().seen.book || 0)).length + Object.values(A().awards).filter((w) => w.at > (A().seen.book || 0)).length;
  b.textContent = fresh; b.classList.toggle("hidden", !fresh);
}

// ---------- Pasang ----------
function hook() {
  const right = document.querySelector(".hud-right"), dex = $("dexBtn");
  if (right && !$("advBtn")) {
    const b = document.createElement("button"); b.className = "chip icon-btn misi"; b.id = "advBtn"; b.setAttribute("aria-label", "Buku Petualangan");
    b.innerHTML = `🧭<span id="advBadge" class="badge hidden">0</span>`;
    right.insertBefore(b, dex);
    b.addEventListener("click", () => { N().sfx("click"); N().openPanel("adventure"); });
  }
  if (!$("discover")) { const d = document.createElement("div"); d.id = "discover"; d.className = "discover"; d.setAttribute("role", "status"); document.body.appendChild(d); }
  if (!$("voyage")) {
    const v = document.createElement("div"); v.id = "voyage"; v.className = "voyage hidden";
    v.innerHTML = `<canvas></canvas><div class="vg-text"><div class="vg-title"></div><div class="vg-sub"></div><div class="vg-skip">Ketuk untuk mempercepat</div></div>`;
    v.addEventListener("pointerdown", (e) => { e.stopPropagation(); skipVoyage(); });
    document.body.appendChild(v);
  }
  N().registerPanel("adventure", {
    title: () => "📖 Buku Petualangan", render: bookHTML,
    after: () => { A().seen.book = Date.now(); N().save(); refreshBadge(); },
  });
  refreshBadge();
}

NW.adv = {
  V: ADV_V, migrate, defaults, startArea, savePos, getPos, enteredArea, tick, discover, isFound, allDisc, drawFx,
  addNote, award, hasAward, pickLine, talkCount, voyage, isBusy, travelTo, challengeFish, registerStory, hook, refreshBadge,
  showDiscover, bookHTML, get state() { return A(); },
};
})();
