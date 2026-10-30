// ============================================================================
//  NUSA ISLAND — Bumbu 2.1: panel "🔊 Pengaturan Suara" (NW.audioPanel)
//  Kartu kecil di sudut layar (bukan layar penuh). Dibuka dengan menahan tombol 🔊 di HUD,
//  atau dari panel Peta. Berisi 4 slider, tombol matikan/hidupkan semua suara, dan menu
//  "Dengarkan tema" untuk mengevaluasi setiap musik dan efek.
// ============================================================================
(function () {
const NW = (window.NW = window.NW || {});
const $ = (id) => document.getElementById(id);
let el = null, openFlag = false, lpTimer = null, swallow = false;

const LABEL = { master: "Volume Utama", music: "Musik", amb: "Suara Lingkungan", sfx: "Efek Suara" };
const THEME_GROUPS = [
  ["Muara Kampung", [["muara_pagi", "🌅 Pagi"], ["muara_siang", "☀️ Siang"], ["muara_sore", "🌇 Sore"], ["muara_malam", "🌙 Malam"]]],
  ["Kampung Tepian Toba", [["toba_pagi", "🌅 Pagi"], ["toba_siang", "☀️ Siang"], ["toba_sore", "🌇 Sore"], ["toba_malam", "🌙 Malam"]]],
  ["Lainnya", [["rumah", "🏠 Rumahku"], ["kapal", "⛵ Berlayar"], ["cerita", "📖 Cerita"], ["mancing_muara", "🎣 Mancing Muara"], ["mancing_toba", "🎣 Mancing Toba"], ["mancing_muara|0.9", "⚡ Mancing tegang (Muara)"], ["mancing_toba|0.9", "⚡ Mancing tegang (Toba)"]]],
];
const JINGLE = [["catch|biasa", "Ikan biasa"], ["catch|langka", "Langka"], ["catch|epik", "Epik"], ["catch|legenda", "Legenda"], ["misi_baru", "Misi baru"], ["bab_selesai", "Bab selesai"], ["temuan", "Temuan"], ["penghargaan", "Penghargaan"], ["gelar", "Gelar baru"], ["pemandangan", "Pemandangan"], ["spot_rahasia", "Spot rahasia"], ["varian_silver|legenda", "Sisik Perak"], ["varian_sunset|legenda", "Corak Senja"], ["varian_pearl", "Mutiara Nusantara"], ["splash_besar|1", "Percikan raksasa"]];
const EFFECT = [["cast", "Lempar"], ["splash", "Percik"], ["nibble", "Ikan mendekat"], ["bite", "Strike!"], ["strike", "Mulai melawan"], ["surge", "Ikan menyentak"], ["warn", "Senar tegang"], ["snap", "Senar putus"], ["lose", "Ikan lepas"], ["step_kayu", "Langkah kayu"], ["step_rumput", "Langkah rumput"], ["furn_taruh", "Taruh perabot"]];

function build() {
  el = document.createElement("div"); el.id = "audioPop"; el.className = "audio-pop hidden"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Pengaturan Suara");
  const th = THEME_GROUPS.map(([g, l]) => `<div class="ap-g"><b>${g}</b><div class="ap-row">${l.map(([id, t]) => `<button class="ap-b" data-th="${id}">${t}</button>`).join("")}</div></div>`).join("");
  el.innerHTML = `
    <div class="ap-head"><b>🔊 Pengaturan Suara</b><button class="ap-x" id="apClose" aria-label="Tutup">✕</button></div>
    ${NW.audio.CATS.map((c) => `<label class="ap-s"><span>${LABEL[c]}</span><input type="range" min="0" max="100" step="1" data-cat="${c}" aria-label="${LABEL[c]}"><output data-out="${c}"></output></label>`).join("")}
    <div class="ap-row"><button class="ap-b big" id="apMute"></button><button class="ap-b" id="apReset">↺ Standar</button></div>
    <p class="ap-note" id="apNote"></p>
    <details class="ap-det"><summary>🎧 Dengarkan tema &amp; efek</summary>
      <div class="ap-sc">${th}
        <div class="ap-g"><b>Jingle &amp; cerita</b><div class="ap-row">${JINGLE.map(([id, t]) => `<button class="ap-b" data-sfx="${id}">${t}</button>`).join("")}</div></div>
        <div class="ap-g"><b>Efek suara</b><div class="ap-row">${EFFECT.map(([id, t]) => `<button class="ap-b" data-sfx="${id}">${t}</button>`).join("")}</div></div>
        <button class="ap-b big" id="apStop">⏹ Berhenti pratinjau &amp; kembali ke permainan</button>
        <p class="ap-note">Musik dihasilkan oleh sintesis di browser (bukan rekaman). Suara hasapi/sulim di sini adalah timbre sintetis bergaya, bukan instrumen asli.</p>
      </div></details>`;
  document.body.appendChild(el);
  el.addEventListener("input", (e) => { const c = e.target.dataset && e.target.dataset.cat; if (!c) return; NW.audio.setVolume(c, e.target.value / 100); sync(); });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "apClose") return close();
    if (b.id === "apMute") { toggleMute(); return; }
    if (b.id === "apReset") { NW.audio.resetVolumes(); sync(); return; }
    if (b.id === "apStop") { NW.audio.stopPreview(); const d = NW.audioDirector; if (d) d.tick(); return; }
    if (b.dataset.th) { const [id, int] = b.dataset.th.split("|"); ensure(); NW.audio.preview(id); NW.audio.previewInt = +int || 0; mark(b); return; }
    if (b.dataset.sfx) { ensure(); const [n, arg] = b.dataset.sfx.split("|"); NW.audio.sfx(n, arg); }
  });
}
function ensure() { const Nu = window.Nusa; if (Nu && Nu.S.muted) { Nu.S.muted = false; Nu.save(); Nu.refreshHUD(); NW.audio.setMuted(false); sync(); } NW.audio.init(); }
function mark(b) { el.querySelectorAll("[data-th].on").forEach((x) => x.classList.remove("on")); b.classList.add("on"); }
function toggleMute() { const Nu = window.Nusa; Nu.S.muted = !Nu.S.muted; Nu.save(); Nu.refreshHUD(); NW.audio.init(); NW.audio.setMuted(Nu.S.muted); sync(); }
function sync() {
  if (!el) return; const Nu = window.Nusa, s = NW.audio.settings;
  for (const c of NW.audio.CATS) { const inp = el.querySelector(`[data-cat="${c}"]`), out = el.querySelector(`[data-out="${c}"]`); if (inp && document.activeElement !== inp) inp.value = Math.round(s[c] * 100); if (out) out.textContent = Math.round(s[c] * 100) + "%"; }
  const m = !!(Nu && Nu.S.muted); const mb = $("apMute"); if (mb) { mb.textContent = m ? "🔊 Hidupkan semua suara" : "🔇 Matikan semua suara"; mb.classList.toggle("on", m); }
  const note = $("apNote"); if (note) note.textContent = m ? "Semua suara sedang dimatikan (mode senyap)." : NW.audio.ready ? "" : "Suara akan aktif setelah kamu menekan Mulai Bermain.";
}
function open() { if (!el) build(); openFlag = true; el.classList.remove("hidden"); sync(); }
function close() { openFlag = false; if (el) el.classList.add("hidden"); if (NW.audio.previewing) { NW.audio.stopPreview(); if (NW.audioDirector) NW.audioDirector.tick(); } }
function toggle() { openFlag ? close() : open(); }

// tahan tombol 🔊 (±0,5 dtk) = buka pengaturan; ketuk biasa = mute seperti dulu
function hookMuteBtn() {
  const b = $("muteBtn"); if (!b) return;
  b.addEventListener("pointerdown", () => { clearTimeout(lpTimer); swallow = false; lpTimer = setTimeout(() => { swallow = true; open(); }, 480); });
  for (const t of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(t, () => clearTimeout(lpTimer));
  b.addEventListener("click", (e) => { if (swallow) { e.stopImmediatePropagation(); e.preventDefault(); swallow = false; } }, true);
  b.addEventListener("contextmenu", (e) => e.preventDefault());
}
hookMuteBtn();
{ const mb = $("musicBtn"); if (mb) mb.addEventListener("click", toggle); } // tombol 🎵 selalu terlihat di HUD
NW.audioPanel = { open, close, toggle, sync, get isOpen() { return openFlag; } };
})();
