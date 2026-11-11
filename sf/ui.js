// NUSA ISLAND — Samudra Follower: tab koleksi, layar detail (kredit selalu tampil), kartu tangkapan khusus, animasi berenang.
// Mode: "off" (bawaan: tab tidak muncul) · "preview" (?sf=preview: hanya lihat/periksa + pratinjau kartu tangkapan; TIDAK memberi ikan/koin, TIDAK menulis save).
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const C = window.NusaSFCatalog; if (!C) return;
let mode = C.DEFAULT_MODE;
try { const q = new URLSearchParams(location.search).get("sf"); if (q === "preview" && window.NUSA_SF_PREVIEW === true) mode = "preview"; } catch (e) {}
let live = false;   // true bila server (persetujuan Owner) mengaktifkan minimal satu ikan untuk akun ini
const S_ = () => (window.Nusa && window.Nusa.S) || null;
const owned = (id) => { const S = S_(), r = S && S.dex && S.dex[id]; return !!(r && r.n > 0); };
const hasAny = () => allIds().some((id) => owned(id));
const on = () => mode !== "off" || live || hasAny();
const rar = (f) => C.RARITY[f.sfRarity || f.rarity] || { label: "", color: "#9ab" };
const $ = (id) => document.getElementById(id);
const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
let ov = null, cv = null, raf = 0, curId = null, t0 = 0, frames = 0, catchMode = false;

// ---- Satu sumber data: 4 ikan LAMA (sf/catalog.js) + 11 spesies KOMUNITAS dari katalog SF2 (economy/sf2-core.js; kredit di sana). Urutan tampil = urutan janji Owner.
const S2 = () => window.NusaSF2Core || null;
const COMM_ORDER = ["sf2_leviathan", "sf2_mosasaurus", "sf2_el_gran_maja", "sf2_kraken", "sf2_orca", "sf2_narwhal", "sf2_buntal", "sf2_tuna_sirip_biru", "sf2_channa_marulioides", "sf2_barramundi", "sf2_udang_jala", "sf2_kontolodon"];
const S2COL = { common: "#7fb59f", uncommon: "#5fc77a", rare: "#4aa3df", epic: "#b56ce8", mythic: "#f0b53a" };
const credText = (cr) => (cr || []).join(", ");
const designLine = (m) => (m && m.design && m.design.length ? `🎨 Desain oleh ${m.design.join(", ")}` : "");
const credLine = (cr) => { const ig = (cr || []).some((x) => x[0] === "@"); return ig ? `📸 Ide ikan oleh ${credText(cr)} (${C.IG_NOTE})` : `📸 ${credText(cr)}`; };
function meta(id) {
  const f = C.BY_ID[id]; if (f) { const R = C.RARITY[f.rarity]; return { id, nm: f.name, label: R.label, color: R.color, glow: R.glow, desc: f.desc, credit: [f.credit], event: !!f.event, legacy: true, active: false }; }
  const k = S2(), sp = k && k.BY_ID[id]; if (!sp || sp.kind !== "sf2") return null;
  return { id, nm: sp.name, label: k.RLABEL[sp.rarity].toUpperCase(), color: S2COL[sp.rarity], glow: S2COL[sp.rarity] + "aa", desc: sp.desc, credit: sp.credit || [], design: sp.design || [], legacy: false, active: sp.active !== false, obs: !!sp.obs };
}
const allIds = () => C.FISH.map((f) => f.id).concat(COMM_ORDER.filter((id) => meta(id)));
const stat = (f) => { const S = S_(), r = S && S.dex && S.dex[f.id]; return r && r.n > 0 ? `Tertangkap ${r.n}× · terbaik ${String(Math.round(r.best * 100) / 100).replace(".", ",")} kg` : (live && f.activeNow ? "Bisa didapat sebagai bonus" : (f.event ? "Ikan event" : "Belum bisa dipancing")); };
function img(id) { return NW.sfDraw.sprite(id, 150, 90); }
function cellStat(m) {
  const S = S_(), r = S && S.dex && S.dex[m.id], i = window.NW && NW.sf2 && NW.sf2.info && NW.sf2.info();
  if (r && r.n > 0) return `✔ Ditemukan · ${r.n}×${i && i.mine && i.mine[m.id] ? " · 🏅 Penemu Pertama" : ""}`;
  if (m.legacy) return live && (C.BY_ID[m.id] || {}).activeNow ? "Bisa didapat sebagai bonus" : (m.event ? "Ikan event · belum ditemukan" : "❔ Belum ditemukan");
  return m.active ? "❔ Belum ditemukan" : "❔ Belum ditemukan · usulan baru";
}
function gridHTML() {
  const ids = allIds();
  let h = `<div class="sf-note">🌊 Ikan spesial dari ide pengikut Instagram Nusa Island: <b>${ids.length}</b> spesies. ${mode === "preview" && !live ? "<b>Mode pratinjau</b>: belum bisa dipancing." : ""}</div><div class="sf-grid">`;
  for (const id of ids) {
    const m = meta(id), got = owned(id);
    h += `<button class="sf-cell ${got ? "" : "unseen"}" data-act="sfOpen" data-arg="${id}" style="--sfc:${m.color}"><img src="${img(id)}" alt="${m.nm}"><div class="nm">${m.nm}</div><span class="rb">${m.label}</span><div class="cr">${designLine(m) || credLine(m.credit).replace(" (" + C.IG_NOTE + ")", "").replace("Ide ikan oleh ", "")}</div><div class="st">${cellStat(m)}</div></button>`;
  }
  return h + `</div>`;
}
function build() {
  if (ov) return;
  ov = document.createElement("div"); ov.id = "sfOv"; ov.setAttribute("role", "dialog");
  ov.innerHTML = `<div class="sf-card" id="sfCard"><span class="rb" id="sfRb"></span><h3 id="sfNm"></h3><canvas id="sfCv" width="680" height="400"></canvas><p id="sfDs"></p><div class="sf-credit" id="sfCr"></div><div class="tag" id="sfTg"></div><div class="row"><button class="pri" id="sfPrev">✨ Lihat kartu tangkapan</button><button id="sfX">Tutup</button></div></div>`;
  document.body.appendChild(ov); cv = $("sfCv");
  $("sfX").onclick = close; ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  $("sfPrev").onclick = () => { catchMode = !catchMode; paintCard(); };
}
function paintCard() {
  const f = meta(curId), R = f, card = $("sfCard");
  card.style.setProperty("--sfc", R.color); card.style.setProperty("--sfg", R.glow || "rgba(255,255,255,.4)");
  $("sfRb").textContent = (catchMode ? "✨ TANGKAPAN SPESIAL · " : "") + R.label;
  $("sfPrev").style.display = realInfo ? "none" : ""; $("sfNm").textContent = f.nm; $("sfDs").textContent = f.desc;
  $("sfCr").textContent = designLine(f) || credLine(f.credit);
  const kg = (w) => String(Math.round(w * 100) / 100).replace(".", ",") + " kg";
  if (realInfo) { $("sfTg").textContent = `Berat ${kg(realInfo.w)} · nilai jual ≈ ${Math.round(realInfo.price).toLocaleString("id-ID")} koin · tersimpan di Coolbox (terkunci)`; $("sfX").textContent = "Simpan"; return; }
  $("sfX").textContent = "Tutup";
  $("sfTg").textContent = catchMode ? "Pratinjau kartu: tidak ada ikan/koin yang ditambahkan." : (f.event ? "Hanya muncul saat event aktif · belum bisa dipancing" : f.legacy ? "Belum bisa dipancing (menunggu persetujuan Owner)" : cellStat(f) + (f.active ? "" : " · peluang menunggu persetujuan Owner"));
  $("sfPrev").textContent = catchMode ? "↩ Kembali ke detail" : "✨ Lihat kartu tangkapan";
}
function frame(ts) {
  if (!ov || !ov.classList.contains("on")) { raf = 0; return; }
  const t = (ts - t0) / 1000, c = cv.getContext("2d"), W = cv.width, H = cv.height; frames++;
  c.clearRect(0, 0, W, H);
  const R = meta(curId);
  if (catchMode) { const g = c.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.6); g.addColorStop(0, R.glow || "#fff"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { const a = i * 0.9 + t * 0.6, r = 120 + (i % 4) * 30 + sin2(t + i) * 8; c.fillStyle = `rgba(255,255,255,${0.35 + 0.3 * sin2(t * 2 + i)})`; c.beginPath(); c.arc(W / 2 + Math.cos(a) * r * 1.4, H / 2 + Math.sin(a) * r * 0.8, 2.5, 0, 6.3); c.fill(); } }
  const sc = catchMode ? 0.86 : 0.8, bob = catchMode ? 0 : Math.sin(t * 0.8) * 10; const swim = reduced() ? 0 : t;
  NW.sfDraw.draw(c, curId, W / 2 + (catchMode || reduced() ? 0 : Math.sin(t * 0.7) * 22), H / 2 + bob, W * sc * 0.62, swim);
  raf = requestAnimationFrame(frame);
}
const sin2 = Math.sin;
let realInfo = null;
function open(id, real) {
  if (!on() || !meta(id)) return; build(); curId = id; realInfo = real || null; catchMode = !!real; paintCard(); ov.classList.add("on"); t0 = performance.now(); frames = 0;
  if (!raf) raf = requestAnimationFrame(frame);
}
function close() { if (ov) ov.classList.remove("on"); catchMode = false; realInfo = null; }
document.addEventListener("click", (e) => { const el = e.target.closest && e.target.closest('[data-act="sfOpen"]'); if (el) open(el.dataset.arg); });
NW.sf = { mode: () => mode, on, isSF: C.isSF, rar, setLive: (v, ids) => { live = !!v; C.FISH.forEach((f) => { f.activeNow = !!(ids && ids.includes(f.id)); }); }, live: () => live, openCatch: (id, real) => open(id, real), gridHTML, open, close, frames: () => frames, setMode: (m) => { if (m === "off" || m === "preview") mode = m; }, isOpen: () => !!(ov && ov.classList.contains("on")), catchPreview: () => { catchMode = true; paintCard(); } };
})();
