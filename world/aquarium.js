// =========================================================
//  NUSA ISLAND — menu akuarium interaktif (drag-and-drop ikan)
//  Pointer Events: jalan dengan sentuhan HP maupun mouse.
//  Semua perpindahan ikan lewat NW.HD.putFish / takeFish / swapFish
//  (dipindah, bukan disalin) lalu langsung disimpan.
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa, HD = NW.HD;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = $("aqWrap"), cvs = $("aqCanvas"), listEl = $("aqList"), shownEl = $("aqShown");
const ui = { open: false, aq: null, selCard: null, selFish: null, swapIn: null, raf: 0, fx: [], swim: {} };

const H = () => N().S.home;
const aqFurn = () => HD.aquariumOf(H(), ui.aq);
const cap = () => HD.FURN[aqFurn().type].cap;
const fishNow = () => HD.fishIn(H(), ui.aq);
const RAR = () => RARITY; // const global dari data.js
const LOCN = (id) => (LOCATIONS.find((l) => l.id === id) || {}).name || id;

function open(aqUid) {
  ui.open = true; ui.aq = aqUid; ui.selCard = null; ui.selFish = null; ui.swapIn = null; ui.fx = [];
  wrap.classList.remove("hidden"); render(); N().sfx("click");
  cancelAnimationFrame(ui.raf); last = performance.now(); ui.raf = requestAnimationFrame(loop);
}
function close() {
  ui.open = false; wrap.classList.add("hidden"); cancelAnimationFrame(ui.raf); endDrag(); N().save(); NW.home.bump();
}
$("aqClose").addEventListener("click", () => { N().sfx("click"); close(); });
window.addEventListener("keydown", (e) => { if (ui.open && e.key === "Escape") close(); });

// ---------- Render daftar ----------
function cardHTML(it) {
  const f = N().FISH_BY_ID[it.id], R = RAR()[f.rarity], e = HD.eligible(it, aqFurn(), H(), N().FISH_BY_ID);
  return `<div class="aq-card ${e.ok ? "" : "no"} ${ui.selCard === it.uid ? "sel" : ""}" data-uid="${it.uid}" style="--rc:${R.color}">
    <div class="aq-thumb" data-grip="1"><img src="${N().fishImg(f.id)}" alt="" draggable="false"></div>
    <div class="aq-info"><div class="nm">${f.name}</div><div class="sub"><span class="rar" style="color:${R.color}">${R.label}</span> · ${N().fmtW(it.w)}</div>
    <div class="sub">${e.ok ? `${LOCN(f.loc)} · ${HD.WATER_NAME[HD.HABITAT[f.loc]]}` : `🚫 ${e.why}`}</div></div></div>`;
}
function render() {
  const S = N().S, a = aqFurn(), T = HD.FURN[a.type], now = fishNow(), water = HD.waterOf(H(), a);
  $("aqTitle").textContent = T.name;
  $("aqCap").textContent = `${now.length}/${T.cap}`; $("aqCap").classList.toggle("full", now.length >= T.cap);
  $("aqWater").textContent = water ? (water === "laut" ? "🌊 Air laut" : "💧 Air tawar") : "💧 Air: mengikuti ikan pertama";
  $("aqRule").textContent = `Maks ${String(T.maxW).replace(".", ",")} kg per ikan. Ikan dilindungi & perenang samudra tidak dipelihara.`;
  // ikan yang sedang dipajang
  shownEl.innerHTML = now.length ? now.map((it) => {
    const f = N().FISH_BY_ID[it.id], sel = ui.selFish === it.uid;
    return `<div class="aq-chip ${sel ? "sel" : ""}" data-fuid="${it.uid}"><img src="${N().fishImg(f.id)}" alt=""><span>${f.name}<small>${N().fmtW(it.w)}</small></span>
      ${ui.swapIn ? `<button class="btn small gold" data-swap="${it.uid}">Tukar</button>` : `<button class="btn small" data-take="${it.uid}">Ambil</button>`}</div>`;
  }).join("") : `<div class="muted">Akuarium masih kosong.</div>`;
  // ikan di coolbox
  const order = ["legenda", "epik", "langka", "biasa", "sampah"];
  const items = S.cooler.slice().sort((x, y) => {
    const ex = HD.eligible(x, a, H(), N().FISH_BY_ID).ok, ey = HD.eligible(y, a, H(), N().FISH_BY_ID).ok;
    if (ex !== ey) return ex ? -1 : 1;
    return order.indexOf(N().FISH_BY_ID[x.id].rarity) - order.indexOf(N().FISH_BY_ID[y.id].rarity);
  });
  listEl.innerHTML = items.length ? items.map(cardHTML).join("") : `<div class="muted aq-empty">Coolbox kosong. Tangkap ikan di dermaga, lalu bawa pulang untuk dipajang.</div>`;
  $("aqCoolCount").textContent = `${S.cooler.length}/${N().coolerCap()}`;
  // tombol aksi untuk kartu yang dipilih (alternatif tanpa geser)
  const act = $("aqActions");
  if (ui.swapIn) act.innerHTML = `<span>Akuarium penuh. Pilih ikan di akuarium yang mau ditukar.</span><button class="btn small ghost" data-cancel="1">Batal</button>`;
  else if (ui.selCard) { const it = S.cooler.find((x) => x.uid === ui.selCard); act.innerHTML = it ? `<span>${N().FISH_BY_ID[it.id].name} ${N().fmtW(it.w)}</span><button class="btn small gold" data-put="${it.uid}">⬆ Masukkan</button>` : ""; }
  else act.innerHTML = `<span class="muted">Geser ikan ke akuarium untuk memamerkannya, atau ketuk ikan lalu tekan Masukkan.</span>`;
}

// ---------- Aksi ----------
function tryPut(uid, dropX) {
  const S = N().S, r = HD.putFish(S, uid, ui.aq, N().FISH_BY_ID);
  if (r.ok) { splash(dropX); ui.swim[uid] = { enter: 1 }; ui.selCard = null; N().save(); N().refreshHUD(); N().sfx("splash"); N().toast(`${N().FISH_BY_ID[r.item.id].name} masuk akuarium 🐠`, "good"); }
  else if (r.why === "full") { ui.swapIn = uid; ui.selCard = uid; N().toast(`Akuarium penuh (${cap()}/${cap()}). Pilih ikan yang mau ditukar.`, "bad"); }
  else N().toast(r.why, "bad");
  render();
}
function tryTake(uid) {
  const r = HD.takeFish(N().S, uid, N().coolerCap());
  if (r.ok) { ui.selFish = null; N().save(); N().refreshHUD(); N().sfx("click"); N().toast(`${N().FISH_BY_ID[r.item.id].name} kembali ke coolbox`); }
  else N().toast(r.why, "bad");
  render();
}
function trySwap(fishUid) {
  const r = HD.swapFish(N().S, ui.swapIn, fishUid, N().FISH_BY_ID);
  if (r.ok) { splash(); ui.swim[r.in.uid] = { enter: 1 }; N().save(); N().refreshHUD(); N().sfx("splash"); N().toast(`Ditukar: ${N().FISH_BY_ID[r.in.id].name} masuk, ${N().FISH_BY_ID[r.out.id].name} ke coolbox`, "good"); }
  else N().toast(r.why, "bad");
  ui.swapIn = null; ui.selCard = null; render();
}
wrap.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-put]")) return tryPut(t.closest("[data-put]").dataset.put);
  if (t.closest("[data-take]")) return tryTake(t.closest("[data-take]").dataset.take);
  if (t.closest("[data-swap]")) return trySwap(t.closest("[data-swap]").dataset.swap);
  if (t.closest("[data-cancel]")) { ui.swapIn = null; ui.selCard = null; return render(); }
  const chip = t.closest("[data-fuid]"); if (chip) { ui.selFish = ui.selFish === chip.dataset.fuid ? null : chip.dataset.fuid; return render(); }
});

// ---------- Geser (Pointer Events) ----------
let drag = null;
listEl.addEventListener("pointerdown", (e) => {
  const card = e.target.closest(".aq-card"); if (!card) return;
  drag = { uid: card.dataset.uid, id: e.pointerId, sx: e.clientX, sy: e.clientY, started: false, card, grip: !!e.target.closest("[data-grip]") || e.pointerType === "mouse", ghost: null };
  if (drag.grip) { try { card.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); }
});
listEl.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
  if (!drag.started && drag.grip && d > 8) startDrag();
  if (drag.started) moveGhost(e.clientX, e.clientY);
});
listEl.addEventListener("pointerup", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (d.started) { const over = overTank(e.clientX, e.clientY); removeGhost(d); if (over) tryPut(d.uid, e.clientX); return; }
  // ketuk = pilih kartu
  if (d.card.classList.contains("no")) { const it = N().S.cooler.find((x) => x.uid === d.uid); if (it) N().toast(HD.eligible(it, aqFurn(), H(), N().FISH_BY_ID).why, "bad"); return; }
  if (ui.swapIn) return;
  ui.selCard = ui.selCard === d.uid ? null : d.uid; render();
});
listEl.addEventListener("pointercancel", () => { if (drag) removeGhost(drag); drag = null; });
function startDrag() {
  drag.started = true;
  const img = drag.card.querySelector("img"), g = document.createElement("div");
  g.className = "aq-ghost"; g.innerHTML = `<img src="${img.src}" alt="">`; document.body.appendChild(g); drag.ghost = g;
  drag.card.classList.add("dragging"); $("aqTank").classList.add("drop");
}
function moveGhost(x, y) { drag.ghost.style.transform = `translate(${x - 44}px, ${y - 28}px)`; $("aqTank").classList.toggle("hot", overTank(x, y)); }
function removeGhost(d) { if (d.ghost) d.ghost.remove(); d.card.classList.remove("dragging"); $("aqTank").classList.remove("drop", "hot"); }
function endDrag() { if (drag) removeGhost(drag); drag = null; }
function overTank(x, y) { const r = $("aqTank").getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }

// ketuk ikan di kaca akuarium untuk memilihnya
cvs.addEventListener("pointerdown", (e) => {
  const r = cvs.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bd = 40;
  for (const it of fishNow()) { const s = ui.swim[it.uid]; if (!s || s.x === undefined) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = it.uid; } }
  if (best) { if (ui.swapIn) return trySwap(best); ui.selFish = ui.selFish === best ? null : best; render(); }
});

// ---------- Animasi akuarium ----------
let last = 0;
function splash(clientX) {
  const r = cvs.getBoundingClientRect(), x = clientX ? clamp(clientX - r.left, 30, r.width - 30) : r.width / 2;
  ui.fx.push({ kind: "ring", x, y: 24, t: 0 });
  for (let i = 0; i < 14; i++) ui.fx.push({ kind: "bub", x: x + (Math.random() - 0.5) * 50, y: 30 + Math.random() * 40, vy: -20 - Math.random() * 30, t: 0, life: 1.2 + Math.random() });
}
function loop(now) {
  if (!ui.open) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cvs.clientWidth, Hh = cvs.clientHeight;
  if (cvs.width !== Math.round(W * dpr) || cvs.height !== Math.round(Hh * dpr)) { cvs.width = Math.round(W * dpr); cvs.height = Math.round(Hh * dpr); }
  const c = cvs.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const water = HD.waterOf(H(), aqFurn()) || "tawar";
  const g = c.createLinearGradient(0, 0, 0, Hh);
  if (water === "laut") { g.addColorStop(0, "#5cc8e0"); g.addColorStop(1, "#14507a"); } else { g.addColorStop(0, "#8fd4c4"); g.addColorStop(1, "#2f6f68"); }
  c.fillStyle = g; c.fillRect(0, 0, W, Hh);
  // sinar cahaya
  c.globalAlpha = 0.12; c.fillStyle = "#ffffff";
  for (let i = 0; i < 4; i++) { const x = ((t * 12 + i * W / 4) % (W + 80)) - 40; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 30, 0); c.lineTo(x - 30, Hh); c.lineTo(x - 60, Hh); c.fill(); }
  c.globalAlpha = 1;
  // dasar pasir, batu, tanaman
  c.fillStyle = water === "laut" ? "#e9d6a4" : "#c9b27e"; c.beginPath(); c.moveTo(0, Hh); c.lineTo(0, Hh - 26); for (let x = 0; x <= W; x += 20) c.lineTo(x, Hh - 22 - Math.sin(x * 0.05) * 6); c.lineTo(W, Hh); c.fill();
  c.fillStyle = "#8d9192"; c.beginPath(); c.ellipse(W * 0.2, Hh - 22, 28, 14, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(W * 0.78, Hh - 20, 20, 10, 0, Math.PI, 0); c.fill();
  for (let i = 0; i < 6; i++) { const x = W * (0.08 + i * 0.17), hh = 40 + (i % 3) * 18; c.strokeStyle = water === "laut" ? ["#f07b2a", "#b56ce8", "#e2574c"][i % 3] : ["#3f8a3e", "#4f9a46", "#2f7a3e"][i % 3]; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(x, Hh - 20); c.quadraticCurveTo(x + Math.sin(t + i) * 10, Hh - 20 - hh / 2, x + Math.sin(t * 1.3 + i) * 6, Hh - 20 - hh); c.stroke(); }
  // ikan
  const list = fishNow(), top = 30, bottom = Hh - 50;
  list.forEach((it, i) => {
    const f = N().FISH_BY_ID[it.id]; if (!f) return;
    const s = ui.swim[it.uid] || (ui.swim[it.uid] = {});
    if (s.x === undefined) { s.x = 40 + Math.random() * (W - 80); s.y = top + 20 + (i / Math.max(1, list.length)) * (bottom - top - 20); s.vx = (Math.random() < 0.5 ? -1 : 1); s.ph = Math.random() * 6; }
    const speed = (18 + f.power * 7) * (f.rarity === "legenda" ? 0.8 : 1);
    if (s.enter > 0) { s.enter = Math.max(0, s.enter - dt * 1.2); s.y = top - 30 + (1 - s.enter) * (s.ty || (s.ty = top + 30 + Math.random() * (bottom - top - 40))) * 1; }
    else { s.x += s.vx * speed * dt; s.y += Math.sin(t * (0.8 + f.power * 0.05) + s.ph) * 10 * dt; }
    if (s.x < 30) { s.x = 30; s.vx = 1; } if (s.x > W - 30) { s.x = W - 30; s.vx = -1; }
    s.y = clamp(s.y, top - 40, bottom);
    const L = clamp(34 + Math.log(1 + it.w) * 22, 34, Math.min(110, W * 0.32)) * (f.shape ? 0.85 + (f.shape[0] - 1) * 0.25 : 1);
    if (f.rarity === "epik" || f.rarity === "legenda") { // kilau lembut untuk ikan langka
      const gl = c.createRadialGradient(s.x, s.y, 2, s.x, s.y, L * 0.8); gl.addColorStop(0, f.rarity === "legenda" ? "rgba(255,225,130,.45)" : "rgba(200,150,255,.35)"); gl.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gl; c.beginPath(); c.arc(s.x, s.y, L * 0.8, 0, 7); c.fill();
    }
    c.save(); c.translate(s.x, s.y); c.rotate(Math.sin(t * 6 + s.ph) * 0.05); c.scale(s.vx > 0 ? 1 : -1, 1);
    NW.drawFishSprite(c, f, 0, 0, L); c.restore();
    if (ui.selFish === it.uid || (ui.swapIn && true)) {
      c.strokeStyle = ui.swapIn ? "rgba(255,240,176,.9)" : "#fff0b0"; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.ellipse(s.x, s.y, L * 0.62, L * 0.38, 0, 0, 7); c.stroke(); c.setLineDash([]);
      if (ui.selFish === it.uid) { c.font = "700 12px system-ui"; c.textAlign = "center"; c.fillStyle = "#fff"; c.fillText(`${f.name} · ${N().fmtW(it.w)}`, s.x, s.y - L * 0.45 - 6); }
    }
  });
  // gelembung & efek
  c.fillStyle = "rgba(255,255,255,.6)";
  for (let i = 0; i < 8; i++) { const k = (t * 0.25 + i / 8) % 1, x = W * (0.1 + (i * 0.11) % 0.8); c.beginPath(); c.arc(x + Math.sin(t * 2 + i) * 4, Hh - 30 - k * (Hh - 40), 2 + (i % 3), 0, 7); c.fill(); }
  ui.fx = ui.fx.filter((fx) => (fx.t += dt) < (fx.life || 0.8));
  for (const fx of ui.fx) {
    if (fx.kind === "ring") { const k = fx.t / 0.8; c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 3; c.beginPath(); c.ellipse(fx.x, fx.y, 10 + k * 60, 4 + k * 18, 0, 0, 7); c.stroke(); }
    else { fx.y += fx.vy * dt; c.fillStyle = `rgba(255,255,255,${1 - fx.t / fx.life})`; c.beginPath(); c.arc(fx.x + Math.sin(fx.t * 8) * 3, fx.y, 3, 0, 7); c.fill(); }
  }
  // kaca
  c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, Hh - 6);
  c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(10, 10, W * 0.08, Hh - 20);
  ui.raf = requestAnimationFrame(loop);
}

NW.aqui = { open, close, isOpen: () => ui.open, _ui: ui };
})();
