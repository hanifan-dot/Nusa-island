// NUSA ISLAND — NAMA PEMAIN PERMANEN (klien). Modal pendaftaran nama pertama kali + penerapan nama resmi ke game.
// Server (Worker) = satu-satunya penentu: nameGet / nameCheck / nameClaim. Klien hanya menampilkan dan menerapkan hasilnya.
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const Core = window.NusaNameCore;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const N = () => window.Nusa, S = () => (N() && N().S) || null, cloud = () => NW.cloud;
const st = { uid: null, state: "idle", tries: 0, nextAt: 0, ok: null, input: "", busy: false, official: null, el: null, last: null };

// ---------- nama resmi di game ----------
const official = () => { const s = S(); return s && s.profile && s.profile.uname ? s.profile.name : null; };
function apply(name, lower) {
  const s = S(); if (!s) return;
  if (!s.profile) s.profile = { v: 1, name };
  s.profile.name = name; s.profile.uname = lower || name.toLowerCase();
  st.official = name;
  try { N().save(); } catch (e) {}
  try { N().renderPanel && N().renderPanel(); } catch (e) {}
}
function clearStale() {                            // simpanan membawa penanda resmi, tetapi server bilang akun ini belum punya → penanda palsu/ bekas akun lain
  const s = S(); if (s && s.profile && s.profile.uname) { delete s.profile.uname; try { N().save(); } catch (e) {} }
}

// ---------- panggilan server ----------
async function call(name, data) { return cloud().call(name, data); }
const notSupported = (e) => !e || e.code === "not-found" || e.code === "functions/not-found" || e.code === "unavailable" || e.code === "internal" || e.code === "functions/internal" || e.network;

// ---------- modal ----------
function build() {
  if (st.el) return st.el;
  const ov = document.createElement("div"); ov.id = "unOv"; ov.className = "un-ov hidden"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "unTitle");
  ov.innerHTML = `<div class="un-sheet"><div id="unBody"></div></div>`;
  document.body.appendChild(ov); st.el = ov; return ov;
}
const setBody = (h) => { $("unBody").innerHTML = h; };
function showForm(prefill) {
  st.state = "form"; st.ok = null; st.input = prefill || "";
  setBody(`<div class="un-hero" aria-hidden="true">🏝️</div>
    <h2 id="unTitle" tabindex="-1">SELAMAT DATANG DI NUSA ISLAND!</h2>
    <p>Buat nama unikmu sebelum memulai petualangan. Nama ini akan menjadi identitas permanen akunmu.</p>
    <label class="un-lb" for="unIn">Masukkan Nama Pemain</label>
    <input id="unIn" class="un-in" type="text" inputmode="text" maxlength="16" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="contoh: Nelayan_Sunda" value="${esc(st.input)}" aria-describedby="unRules unMsg">
    <p id="unRules" class="un-fine">3–16 karakter · huruf A–Z, angka 0–9, dan _ · tanpa spasi · huruf besar/kecil dianggap sama. Jangan pakai nama asli atau data pribadi.</p>
    <p id="unMsg" class="un-msg" role="status" aria-live="polite"></p>
    <div id="unSug" class="un-sug"></div>
    <button type="button" class="un-btn" id="unCheck">🔍 Periksa Nama</button>
    <button type="button" class="un-btn big" id="unOk" disabled>✅ Konfirmasi Nama</button>`);
  const inp = $("unIn");
  inp.addEventListener("input", onInput); inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doCheck(); } });
  $("unCheck").addEventListener("click", doCheck); $("unOk").addEventListener("click", askConfirm);
  setTimeout(() => { try { $("unTitle").focus({ preventScroll: true }); } catch (e) {} }, 30);
}
function msg(text, kind) { const m = $("unMsg"); if (m) { m.textContent = text || ""; m.className = "un-msg" + (kind ? " " + kind : ""); } }
function sugs(list) {
  const el = $("unSug"); if (!el) return;
  el.innerHTML = (list && list.length ? `<span class="un-fine">Ide nama (pilih sendiri):</span>` + list.map((s, i) => `<button type="button" class="un-chip" data-s="${i}">${esc(s)}</button>`).join("") : "");
  el.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { $("unIn").value = list[+b.dataset.s]; onInput(); doCheck(); }));
}
function onInput() {
  const v = $("unIn").value; st.input = v; st.ok = null; $("unOk").disabled = true; sugs([]);
  if (!v) { msg(""); return; }
  const r = Core.validate(v);                                  // pemeriksaan instan di perangkat (aturan yang sama dengan server)
  msg(r.ok ? "Tekan Periksa Nama untuk melihat apakah tersedia." : "⚠️ " + r.message, r.ok ? "" : "warn");
}
async function doCheck() {
  if (st.busy) return; const name = ($("unIn").value || "").trim();
  const r = Core.validate(name); if (!r.ok) { msg("⚠️ " + r.message, "warn"); $("unIn").focus(); return; }
  st.busy = true; $("unCheck").disabled = true; msg("Memeriksa nama…");
  try {
    const res = await call("nameCheck", { name });
    if ($("unIn").value.trim() !== name) return;                // pemain mengubah isian saat menunggu → abaikan hasil lama
    if (res && res.code === "locked") { await syncFromServer(); return; }
    if (!res || !res.ok) { msg("⚠️ " + ((res && res.message) || "Nama tidak bisa dipakai."), "warn"); return; }
    if (res.available) { st.ok = name; msg("✅ Nama tersedia! Tekan Konfirmasi Nama.", "good"); $("unOk").disabled = false; sugs([]); }
    else { st.ok = null; msg(res.message || Core.TAKEN_MSG, "bad"); sugs(res.suggestions || []); }
  } catch (e) { msg(netMsg(e), "bad"); }
  finally { st.busy = false; const b = $("unCheck"); if (b) b.disabled = false; }
}
const netMsg = (e) => e && (e.network || e.code === "unavailable" || e.code === "functions/unavailable") ? "Koneksi bermasalah. Periksa internet lalu coba lagi." : ((e && e.message) || "Terjadi kesalahan. Coba lagi.");
function askConfirm() {
  const name = st.ok; if (!name || $("unIn").value.trim() !== name) { msg("Periksa nama dulu.", "warn"); return; }
  st.state = "confirm";
  setBody(`<div class="un-hero" aria-hidden="true">🔒</div><h2 id="unTitle" tabindex="-1">Pakai nama ini?</h2>
    <p class="un-name">${esc(name)}</p>
    <p>Nama ini akan menjadi <b>identitas permanen</b> akunmu dan <b>tidak bisa diganti sendiri</b> setelah dikonfirmasi.</p>
    <p id="unMsg" class="un-msg" role="status" aria-live="polite"></p>
    <button type="button" class="un-btn big" id="unYes">Ya, jadikan nama permanen</button>
    <button type="button" class="un-btn ghost" id="unBack">Kembali</button>`);
  $("unYes").addEventListener("click", () => claim(name)); $("unBack").addEventListener("click", () => { showForm(name); sugs([]); onInput(); st.ok = name; $("unOk").disabled = false; msg("✅ Nama tersedia! Tekan Konfirmasi Nama.", "good"); });
  setTimeout(() => { try { $("unTitle").focus({ preventScroll: true }); } catch (e) {} }, 30);
}
async function claim(name) {
  if (st.busy) return; st.busy = true; $("unYes").disabled = true; $("unBack").disabled = true; msg("Menetapkan nama…");
  try {
    const res = await call("nameClaim", { name });
    if (!res || !res.ok || !res.name) throw Object.assign(new Error("Server tidak mengonfirmasi nama."), { code: "internal" });
    apply(res.name, res.lower); showDone(res.name);
  } catch (e) {
    st.busy = false;
    if (e && /already-exists/.test(e.code || "")) { showForm(name); $("unIn").value = name; msg(Core.TAKEN_MSG, "bad"); try { const r = await call("nameCheck", { name }); sugs((r && r.suggestions) || []); } catch (e2) {} return; }
    if (e && /failed-precondition/.test(e.code || "")) { await syncFromServer(); return; }
    if (e && /invalid-argument/.test(e.code || "")) { showForm(name); msg("⚠️ " + e.message, "warn"); return; }
    const b = $("unYes"); if (b) b.disabled = false; const k = $("unBack"); if (k) k.disabled = false;
    msg(netMsg(e), "bad");
  } finally { st.busy = false; }
}
function showDone(name) {
  st.state = "done";
  setBody(`<div class="un-hero" aria-hidden="true">🎉</div><h2 id="unTitle" tabindex="-1">Selamat datang, ${esc(name)}!</h2>
    <p>Nama permanenmu sudah tersimpan. Sampai jumpa di pulau!</p>
    <button type="button" class="un-btn big" id="unGo">🎣 Mulai Petualangan</button>`);
  $("unGo").addEventListener("click", close); setTimeout(() => { try { $("unGo").focus({ preventScroll: true }); } catch (e) {} }, 30);
}
async function syncFromServer() {                               // akun ternyata sudah punya nama (perangkat lain / klaim ganda) → pakai nama server
  try { const g = await call("nameGet", {}); if (g && g.has) { apply(g.name, g.lower); close(); } else showForm(st.input); } catch (e) { msg(netMsg(e), "bad"); }
}
function open() { build(); $("unOv").classList.remove("hidden"); document.body.classList.add("un-open"); if (st.state !== "form") showForm(""); }
function close() { if (st.el) st.el.classList.add("hidden"); document.body.classList.remove("un-open"); st.state = "closed"; }

// ---------- pemicu: setelah login & data akun selesai diperiksa ----------
const ready = () => {
  const c = cloud(); if (!c || !c.user || !c.enabled || c.sandbox) return false;
  if (!["idle", "syncing", "dirty"].includes(c.status) || c.saveFrozen) return false;
  if (document.querySelector(".cmodal")) return false;            // pilihan sumber data / peringatan masih terbuka
  const g = $("gate"); if (g && !g.classList.contains("hidden")) return false;
  return !!S();
};
async function ensure() {
  const c = cloud(); if (!ready() || st.state === "checking" || st.state === "form" || st.state === "confirm" || st.state === "done") return;
  const uid = c.user.uid; if (st.uid === uid && st.state === "closed") return;
  if (Date.now() < st.nextAt) return;
  st.state = "checking";
  try {
    const g = await call("nameGet", {});
    st.uid = uid;
    if (g && g.has) { apply(g.name, g.lower); st.state = "closed"; return; }
    clearStale(); st.state = "idle"; open();
  } catch (e) {
    st.state = "idle"; st.nextAt = Date.now() + 45000;           // server belum mendukung / offline → JANGAN mengunci pemain; coba lagi nanti
  }
}
function hook() {
  if (!Core) return;
  const c = cloud(); if (!c) return;
  c.onChange(() => { if (c.user && st.uid && st.uid !== c.user.uid) { st.uid = null; st.state = "idle"; } if (!c.user) { st.uid = null; if (st.state !== "form" && st.state !== "confirm") st.state = "idle"; } setTimeout(ensure, 0); });
  setInterval(ensure, 3000);
}
NW.username = { hook, ensure, official, apply, isOpen: () => !!st.el && !st.el.classList.contains("hidden"), _state: st };
})();
