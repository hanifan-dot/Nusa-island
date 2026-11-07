// NUSA ISLAND — Samudra Follower: tab koleksi, layar detail (kredit selalu tampil), kartu tangkapan khusus, animasi berenang.
// Mode: "off" (bawaan: tab tidak muncul) · "preview" (?sf=preview: hanya lihat/periksa + pratinjau kartu tangkapan; TIDAK memberi ikan/koin, TIDAK menulis save).
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const C = window.NusaSFCatalog; if (!C) return;
let mode = C.DEFAULT_MODE;
try { const q = new URLSearchParams(location.search).get("sf"); if (q === "preview" && window.NUSA_SF_PREVIEW === true) mode = "preview"; } catch (e) {}
const on = () => mode !== "off";
const $ = (id) => document.getElementById(id);
const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
let ov = null, cv = null, raf = 0, curId = null, t0 = 0, frames = 0, catchMode = false;

function img(id) { return NW.sfDraw.sprite(id, 150, 90); }
function gridHTML() {
  let h = `<div class="sf-note">🌊 Ikan spesial dari ide pengikut Instagram Nusa Island. ${mode === "preview" ? "<b>Mode pratinjau</b>: belum bisa dipancing." : ""}</div><div class="sf-grid">`;
  for (const f of C.FISH) {
    const R = C.RARITY[f.rarity];
    h += `<button class="sf-cell" data-act="sfOpen" data-arg="${f.id}" style="--sfc:${R.color}"><img src="${img(f.id)}" alt="${f.name}"><div class="nm">${f.name}</div><span class="rb">${R.label}</span><div class="cr">📸 ${f.credit}</div><div class="st">${f.event ? "Ikan event" : "Belum bisa dipancing"}</div></button>`;
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
  const f = C.BY_ID[curId], R = C.RARITY[f.rarity], card = $("sfCard");
  card.style.setProperty("--sfc", R.color); card.style.setProperty("--sfg", R.glow || "rgba(255,255,255,.4)");
  $("sfRb").textContent = (catchMode ? "✨ TANGKAPAN SPESIAL · " : "") + R.label; $("sfNm").textContent = f.name; $("sfDs").textContent = f.desc;
  $("sfCr").textContent = `📸 Ide ikan oleh ${f.credit} (${C.IG_NOTE})`;
  $("sfTg").textContent = catchMode ? "Pratinjau kartu: tidak ada ikan/koin yang ditambahkan." : (f.event ? "Hanya muncul saat event aktif · belum bisa dipancing" : "Belum bisa dipancing (menunggu persetujuan Owner)");
  $("sfPrev").textContent = catchMode ? "↩ Kembali ke detail" : "✨ Lihat kartu tangkapan";
}
function frame(ts) {
  if (!ov || !ov.classList.contains("on")) { raf = 0; return; }
  const t = (ts - t0) / 1000, c = cv.getContext("2d"), W = cv.width, H = cv.height; frames++;
  c.clearRect(0, 0, W, H);
  const f = C.BY_ID[curId], R = C.RARITY[f.rarity];
  if (catchMode) { const g = c.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.6); g.addColorStop(0, R.glow || "#fff"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { const a = i * 0.9 + t * 0.6, r = 120 + (i % 4) * 30 + sin2(t + i) * 8; c.fillStyle = `rgba(255,255,255,${0.35 + 0.3 * sin2(t * 2 + i)})`; c.beginPath(); c.arc(W / 2 + Math.cos(a) * r * 1.4, H / 2 + Math.sin(a) * r * 0.8, 2.5, 0, 6.3); c.fill(); } }
  const sc = catchMode ? 0.86 : 0.8, bob = catchMode ? 0 : Math.sin(t * 0.8) * 10; const swim = reduced() ? 0 : t;
  NW.sfDraw.draw(c, curId, W / 2 + (catchMode || reduced() ? 0 : Math.sin(t * 0.7) * 22), H / 2 + bob, W * sc * 0.62, swim);
  raf = requestAnimationFrame(frame);
}
const sin2 = Math.sin;
function open(id) {
  if (!on() || !C.BY_ID[id]) return; build(); curId = id; catchMode = false; paintCard(); ov.classList.add("on"); t0 = performance.now(); frames = 0;
  if (!raf) raf = requestAnimationFrame(frame);
}
function close() { if (ov) ov.classList.remove("on"); catchMode = false; }
document.addEventListener("click", (e) => { const el = e.target.closest && e.target.closest('[data-act="sfOpen"]'); if (el) open(el.dataset.arg); });
NW.sf = { mode: () => mode, on, gridHTML, open, close, frames: () => frames, setMode: (m) => { if (m === "off" || m === "preview") mode = m; }, isOpen: () => !!(ov && ov.classList.contains("on")), catchPreview: () => { catchMode = true; paintCard(); } };
})();
