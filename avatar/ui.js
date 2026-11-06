// =========================================================
//  NUSA ISLAND — TAMPILAN AVATAR: Edit Avatar · Toko Fashion · 👑 Koleksi Sultan · Lemari. Panel "avatar" lewat Nusa.registerPanel.
//  Pratinjau = karakter yang sama (NW.drawCharacter) dapat diputar 8 arah. COBA GRATIS hanya mengubah pratinjau (tidak memotong koin).
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const F = window.NusaFashionCore, N = () => window.Nusa, AV = () => NW.avatar;
if (!F) return;
const RAR = { biasa: ["Biasa", "#b0b7bf"], langka: ["Langka", "#4aa3ff"], epik: ["Epik", "#b05cff"], legenda: ["Legenda", "#ffb020"], sultan: ["Sultan", "#ffd86a"] };
const fmt = (n) => n.toLocaleString("id-ID");
const SLOTNAME = { t: "baju", p: "celana", h: "topi", a: "aksesori", c: "kostum" };
let view = "edit", cat = "tshirt", draft = F.decode(F.DEFAULT_CODE), dir = 2, spin = true, walk = false, confirm = null, msg = "", raf = 0, spinT = 0, sultanOpenT = 0, fxItem = null, ch = null, t0 = 0, lastCode = "";
const draftCode = () => F.encode(draft);
const base = () => NW._baseStyle || (NW.world && NW.world.player && NW.world.player.style) || {};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function resetDraft() { draft = F.decode(AV().code()) || F.decode(F.DEFAULT_CODE); }

// ---------- kartu item ----------
function swatches(it, slot) {
  if (it.cols.length < 2) return "";
  const cur = draft[it.slot] && draft[it.slot][0] === it.id ? draft[it.slot][1] : 0;
  return `<div class="av-sw">${it.cols.map((c, i) => `<button class="av-dot ${i === cur ? "on" : ""}" style="background:${c}" data-act="avCol" data-arg="${it.id}:${i}" aria-label="Warna ${i + 1}"></button>`).join("")}</div>`;
}
function card(it, sultan) {
  const A = AV(), own = A.has(it.id), worn = draft[it.slot] && draft[it.slot][0] === it.id, r = RAR[it.rar];
  const buyBtn = own ? "" : `<button class="av-b gold" data-act="avAsk" data-arg="${it.id}">🛒 BELI</button>`;
  const status = own ? `<span class="av-own">✔ DIMILIKI</span>` : `<span class="av-price">🪙 ${fmt(it.price)}</span>`;
  const useBtn = worn ? `<button class="av-b" data-act="avOff" data-arg="${it.slot}">LEPAS</button>` : own ? `<button class="av-b ok" data-act="avPick" data-arg="${it.id}">PAKAI</button>` : `<button class="av-b" data-act="avPick" data-arg="${it.id}">COBA GRATIS</button>`;
  const fxBtn = it.fx && (it.sultan || it.slot === "c" || it.slot === "a" || it.id === "h_mahkota" || it.id === "h_robot") ? `<button class="av-b fx" data-act="avFx" data-arg="${it.id}">✨ LIHAT EFEK</button>` : "";
  return `<div class="av-card r-${it.rar} ${sultan ? "sul" : ""} ${worn ? "worn" : ""}" style="--rc:${r[1]}">
    ${sultan ? `<canvas class="av-mini" data-id="${it.id}" width="84" height="104"></canvas>` : `<canvas class="av-mini" data-id="${it.id}" width="64" height="80"></canvas>`}
    <div class="av-nm">${esc(it.name)}</div><div class="av-rar" style="color:${r[1]}">${r[0]}</div>${status}${swatches(it)}
    <div class="av-btns">${useBtn}${buyBtn}${fxBtn}</div></div>`;
}
const wallet = () => `<span class="av-bal">🪙 <b id="avBal">${fmt(Math.floor(AV().balance()))}</b></span>`;
function notice() {
  const s = AV().status();
  if (s === "ready") return "";
  const t = s === "guest" ? "Masuk akun untuk membeli item berbayar. Item gratis & coba pakai tetap bisa." : s === "unsupported" ? "Toko fashion belum aktif di server. Kamu tetap bisa mencoba semua item; membeli terkunci sampai server diperbarui." : "Menghubungi server toko…";
  return `<div class="av-note">🔒 ${t}</div>`;
}
function preview() {
  return `<div class="av-prev"><canvas id="avCv" width="220" height="185"></canvas>
    <div class="av-pc"><button data-act="avRot" data-arg="-1" aria-label="Putar kiri">⟲</button><button data-act="avSpin" class="${spin ? "on" : ""}">🔄 Putar</button><button data-act="avWalk" class="${walk ? "on" : ""}">🚶 Jalan</button><button data-act="avRot" data-arg="1" aria-label="Putar kanan">⟳</button></div></div>`;
}
function hist() {
  const h = AV().hist().slice(-5).reverse(); if (!h.length) return "";
  return `<h4 class="av-h">Riwayat Pembelian</h4>` + h.map((x) => { const it = F.BY_ID[x.id]; return `<div class="av-hist">${it ? esc(it.name) : esc(x.id)} <b>🪙 ${fmt(x.price)}</b></div>`; }).join("");
}
function fxSettings() {
  const lv = NW.avatarDraw ? NW.avatarDraw.level() : 2;
  return `<h4 class="av-h">Efek Visual</h4><div class="av-seg">${["Mati", "Hemat", "Penuh"].map((n, i) => `<button class="${lv === i ? "on" : ""}" data-act="avLevel" data-arg="${i}">${n}</button>`).join("")}</div><div class="muted">Kurangi efek jika game terasa berat atau kamu ingin tampilan lebih tenang.</div>`;
}
function confirmBox() {
  if (!confirm) return ""; const it = F.BY_ID[confirm], bal = Math.floor(AV().balance());
  return `<div class="av-conf"><div class="av-conf-card"><div class="av-conf-t">Beli ${esc(it.name)}?</div><div class="av-conf-p">Harga <b>🪙 ${fmt(it.price)}</b></div><div class="muted">Saldo kamu: 🪙 ${fmt(bal)}</div>
    <div class="av-btns"><button class="av-b gold" data-act="avBuy" data-arg="${it.id}">✔ YA, BELI</button><button class="av-b" data-act="avNo">BATAL</button></div></div></div>`;
}
const tabs = () => `<div class="av-tabs">${[["edit", "✏️ Edit Avatar"], ["shop", "🛍️ Toko Fashion"], ["sultan", "👑 Koleksi Sultan"], ["wardrobe", "👗 Koleksi Saya"]].map(([k, l]) => `<button class="${view === k ? "on" : ""} ${k === "sultan" ? "sl" : ""}" data-act="avView" data-arg="${k}">${l}</button>`).join("")}</div>`;

function render() {
  const A = AV(), dirty = draftCode() !== A.code();
  let body = "";
  if (view === "edit") {
    const items = F.ITEMS.filter((i) => i.cat === cat);
    body = `${preview()}<div class="av-cats">${F.CATS.map(([k, l]) => `<button class="${cat === k ? "on" : ""}" data-act="avCat" data-arg="${k}">${l}</button>`).join("")}</div>
      <div class="av-grid">${items.map((i) => card(i, false)).join("")}</div>
      <h4 class="av-h">Kulit & Rambut</h4><div class="av-sw big">${F.SKIN.map((c, i) => `<button class="av-dot ${draft.s === i ? "on" : ""}" style="background:${c}" data-act="avSkin" data-arg="${i}" aria-label="Kulit ${i + 1}"></button>`).join("")}</div>
      <div class="av-sw big">${F.HAIR.map((c, i) => `<button class="av-dot ${draft.r === i ? "on" : ""}" style="background:${c}" data-act="avHair" data-arg="${i}" aria-label="Rambut ${i + 1}"></button>`).join("")}</div>
      <button class="av-save ${dirty ? "dirty" : ""}" data-act="avSave">💾 SIMPAN PENAMPILAN</button>${fxSettings()}`;
  } else if (view === "shop") {
    body = `<button class="av-sultan-btn" data-act="avView" data-arg="sultan">👑 KOLEKSI SULTAN ✨</button>` +
      F.CATS.filter(([k]) => k !== "exclusive" || true).map(([k, l]) => `<h4 class="av-h">${l}</h4><div class="av-grid">${F.ITEMS.filter((i) => i.cat === k).map((i) => card(i, false)).join("")}</div>`).join("") + hist();
  } else if (view === "sultan") {
    body = `${Date.now() - sultanOpenT < 2500 ? `<div class="sul-open" id="sulOpen"><div class="sul-curtain l"></div><div class="sul-curtain r"></div><div class="sul-title">👑 KOLEKSI SULTAN</div></div>` : ""}
      ${preview()}<div class="sul-sub">Kostum paling langka di Nusantara · kosmetik murni, tanpa bonus gameplay</div><div class="av-grid sul-grid">${F.SULTAN.map((id) => card(F.BY_ID[id], true)).join("")}</div>
      <button class="av-save ${dirty ? "dirty" : ""}" data-act="avSave">💾 SIMPAN PENAMPILAN</button>${hist()}`;
  } else {
    const mine = F.ITEMS.filter((i) => i.price > 0 && A.has(i.id));
    body = `${preview()}<h4 class="av-h">Lemari Pakaian (${mine.length})</h4>` + (mine.length ? `<div class="av-grid">${mine.map((i) => card(i, !!i.sultan)).join("")}</div>` : `<div class="muted av-empty">Belum ada item berbayar. Kunjungi 🛍️ Toko Fashion!</div>`) + `<h4 class="av-h">Bawaan (gratis)</h4><div class="av-grid">${F.ITEMS.filter((i) => i.price === 0).map((i) => card(i, false)).join("")}</div>
      <button class="av-save ${dirty ? "dirty" : ""}" data-act="avSave">💾 SIMPAN PENAMPILAN</button>`;
  }
  return `<div class="av ${view === "sultan" ? "sultan" : ""}">${tabs()}<div class="av-top">${wallet()}${msg ? `<span class="av-msg">${msg}</span>` : ""}</div>${notice()}${body}${confirmBox()}</div>`;
}

// ---------- pratinjau (canvas) ----------
function mkch() { ch = { x: 0, y: 0, z: 0, dir, walk: 0, moving: false, seed: 0, rod: 0, isMe: true, style: null }; }
function styleNow() { return NW.avatarDraw.styleFor(draftCode(), base()); }
function frame(ts) {
  const cv = document.getElementById("avCv"), minis = document.querySelectorAll(".av-mini");
  if (!document.querySelector(".av") || (!cv && !minis.length)) { raf = 0; return; }
  raf = requestAnimationFrame(frame); const t = ts / 1000; if (!t0) t0 = t;
  if (!ch) mkch();
  if (spin && t - spinT > 1.1) { spinT = t; dir = (dir + 1) % 8; }
  if (cv) {
    const code = draftCode(); if (code !== lastCode) { lastCode = code; ch._fxT0 = undefined; ch._tr = []; }
    const x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height);
    const g = x.createRadialGradient(110, 150, 10, 110, 150, 110); g.addColorStop(0, view === "sultan" ? "rgba(255,210,100,.35)" : "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 220, 185);
    x.fillStyle = "rgba(0,0,0,.22)"; x.beginPath(); x.ellipse(110, 160, 44, 12, 0, 0, 7); x.fill();
    ch.style = styleNow(); ch.dir = dir; ch.moving = walk; if (walk) ch.walk += 0.16; else ch.walk = 0;
    x.save(); x.translate(110, 160); x.scale(2.8, 2.8); try { NW.drawCharacter(x, ch, t); } catch (e) {} x.restore();
  }
  minis.forEach((m) => { const it = F.BY_ID[m.dataset.id]; if (!it) return; const x = m.getContext("2d"); x.clearRect(0, 0, m.width, m.height); const o = { t: null, p: null, h: null, a: null, c: null, s: draft.s, r: draft.r };
    if (it.slot === "c") o.c = [it.id, 0]; else { o[it.slot] = [it.id, (draft[it.slot] && draft[it.slot][0] === it.id) ? draft[it.slot][1] : 0]; if (it.slot !== "t") o.t = draft.t; if (it.slot !== "p") o.p = draft.p; }
    const mc = (m._ch = m._ch || { x: 0, y: 0, z: 0, dir: 2, walk: 0, moving: false, seed: 0, rod: 0, isMe: false, style: null }); mc.style = NW.avatarDraw.styleFor(F.encode(o), base()); mc.dir = 2; mc.moving = false;
    const sc = m.width / 40; x.save(); x.translate(m.width / 2, m.height - 7); x.scale(sc, sc); try { NW.drawCharacter(x, mc, t); } catch (e) {} x.restore(); });
}
function startLoop() { if (!raf) { t0 = 0; mkch(); raf = requestAnimationFrame(frame); } }

// ---------- aksi ----------
function setItem(it, ci) { draft[it.slot] = [it.id, ci || 0]; if (it.slot === "c") { /* kostum menutupi baju/celana/topi/aksesori saat dirender */ } }
async function act(a, arg) {
  const A = AV();
  if (a === "avView") { view = arg; confirm = null; msg = ""; if (arg === "sultan") sultanOpenT = Date.now(); N().sfx("click"); N().renderPanel(); A.refresh().then(() => N().renderPanel()); return; }
  if (a === "avCat") { cat = arg; N().sfx("click"); N().renderPanel(); return; }
  if (a === "avPick") { const it = F.BY_ID[arg]; setItem(it, draft[it.slot] && draft[it.slot][0] === it.id ? draft[it.slot][1] : 0); msg = A.has(arg) ? "" : "🎽 Mode coba — belum dibeli, koin tidak terpotong."; N().sfx("click"); N().renderPanel(); return; }
  if (a === "avOff") { if (arg === "t") draft.t = [F.DEFAULT.t[0], 0]; else if (arg === "p") draft.p = [F.DEFAULT.p[0], 0]; else draft[arg] = null; msg = ""; N().renderPanel(); return; }
  if (a === "avCol") { const [id, i] = arg.split(":"), it = F.BY_ID[id]; setItem(it, +i); N().renderPanel(); return; }
  if (a === "avSkin") { draft.s = +arg; N().renderPanel(); return; }
  if (a === "avHair") { draft.r = +arg; N().renderPanel(); return; }
  if (a === "avRot") { spin = false; dir = (dir + +arg + 8) % 8; N().renderPanel(); return; }
  if (a === "avSpin") { spin = !spin; N().renderPanel(); return; }
  if (a === "avWalk") { walk = !walk; N().renderPanel(); return; }
  if (a === "avLevel") { NW.avatarDraw.setLevel(+arg); N().renderPanel(); return; }
  if (a === "avFx") { const it = F.BY_ID[arg]; setItem(it, 0); if (NW.avatarDraw) NW.avatarDraw.showFx(4); ch && (ch._fxT0 = undefined); lastCode = ""; msg = "✨ Pratinjau efek " + esc(it.name); N().renderPanel(); document.getElementById("avCv") && document.getElementById("avCv").scrollIntoView({ block: "nearest" }); return; }
  if (a === "avAsk") { confirm = arg; N().sfx("click"); N().renderPanel(); return; }
  if (a === "avNo") { confirm = null; N().renderPanel(); return; }
  if (a === "avBuy") {
    const it = F.BY_ID[arg]; confirm = null; const r = await A.buy(arg);
    if (r.ok) { N().sfx("coin"); N().toast(it.slot === "c" ? "🎉 PEMBELIAN BERHASIL! Kostum telah masuk ke lemari pakaianmu." : "🎉 PEMBELIAN BERHASIL! Item telah masuk ke lemari pakaianmu.", "good"); msg = ""; try { N().refreshHUD(); } catch (e) {} }
    else N().toast(r.why, "bad");
    N().renderPanel(); return;
  }
  if (a === "avSave") {
    const r = await A.save(draftCode()); if (r.ok) { N().sfx("coin"); N().toast("💾 Penampilan tersimpan!", "good"); msg = ""; if (NW.avatarDraw) { const w = NW.world && NW.world.player; if (w) w._fxT0 = undefined; } }
    else if (/belum memiliki/.test(r.why)) msg = "Beli dulu item yang masih dicoba, atau LEPAS.";
    N().renderPanel();
  }
}
function after() { startLoop(); const o = document.getElementById("sulOpen"); if (o && !o.dataset.run) { o.dataset.run = 1; setTimeout(() => o.classList.add("go"), 40); setTimeout(() => o.classList.add("done"), 1700); } if (confirm === null) { /* tidak ada */ } }
function open(v) { view = v || "edit"; resetDraft(); confirm = null; msg = ""; spin = true; walk = false; N().openPanel("avatar"); AV().refresh().then(() => { if (N().currentPanel() === "avatar") N().renderPanel(); }); }
function register() {
  N().registerPanel("avatar", { title: () => (view === "sultan" ? "👑 Koleksi Sultan" : view === "shop" ? "🛍️ Toko Fashion" : "👤 Edit Avatar"), render, act, after });
  AV().onChange(() => { if (N().currentPanel && N().currentPanel() === "avatar") { const el = document.getElementById("avBal"); if (el) el.textContent = fmt(Math.floor(AV().balance())); } });
  const b = document.getElementById("avatarBtn"); if (b) b.addEventListener("click", () => { N().sfx("click"); open("edit"); });
}
NW.avatarUI = { open, register, render, _draft: () => draft };
window.addEventListener("load", () => setTimeout(register, 700));
})();
