// NUSA ISLAND — 🔄 Pulihkan Data (menu ☰). Modul: NW.recovery
// Menggunakan ulang sistem yang sudah ada — TIDAK ada backend baru:
//   • Cloud Save akun yang sedang login → cloud.peek()/cloud.restoreCloud() (cloud/cloud.js; server memverifikasi identitas).
//   • Cadangan di browser → TIDAK PERNAH langsung dipulihkan (isinya bisa diedit). Hanya bisa DIAJUKAN ke Owner lewat endpoint
//     recoveryRequest yang sama dengan halaman ajukan-pemulihan.html; Owner memeriksa dan menyetujui (Worker nusa-api, /api/recovery).
//   • Tamu → disarankan menghubungkan Google lewat alur yang ada (cloud.signInGoogle: cadangan dibuat dulu, progres tamu dipindah, tidak digandakan).
// Persentase = tahap yang BENAR-BENAR selesai. 100% hanya setelah pemulihan Cloud ditulis dan dibaca-ulang cocok.
(function () {
"use strict";
window.NW = window.NW || {};
const R = window.NusaRecoveryCore;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cloud = () => window.NW && NW.cloud;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_STAGE_MS = 350;                       // jeda baca antar tahap (persentase tetap mengikuti tahap yang selesai, bukan waktu)
const AJUKAN_URL = "ajukan-pemulihan.html";
let box = null, st = null, busy = false, lastFocus = null;

function ensure() {
  if ($("recOv")) return;
  const ov = document.createElement("div"); ov.id = "recOv"; ov.className = "rec-ov hidden"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "recTitle");
  ov.innerHTML = `<div class="rec-sheet"><button type="button" class="rec-x" id="recX" aria-label="Tutup">✕</button><div id="recBody"></div></div>`;
  document.body.appendChild(ov); box = $("recBody");
  $("recX").addEventListener("click", () => close());
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) close(); });
}
const isOpen = () => !!$("recOv") && !$("recOv").classList.contains("hidden");
function open() {
  ensure(); lastFocus = document.activeElement; st = { cands: [], note: "" };
  $("recOv").classList.remove("hidden"); document.body.classList.add("rec-open"); showIntro();
  try { window.Nusa.sfx("click"); } catch (e) {}
}
function close(force) {
  if (busy && !force) return;
  const ov = $("recOv"); if (!ov) return; ov.classList.add("hidden"); document.body.classList.remove("rec-open");
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
}
const setBody = (html) => { box.innerHTML = html; const t = $("recTitle"); if (t) t.focus({ preventScroll: true }); box.scrollTop = 0; $("recOv").querySelector(".rec-sheet").scrollTop = 0; };

// ---------- bahan tampilan ----------
function who() {
  const c = cloud(), m = c && c.meta ? c.meta() : {};
  if (!c || !c.enabled) return { mode: "off", text: "Cloud Save belum aktif di game ini." };
  if (c.sandbox) return { mode: "sandbox", text: "Mode Owner (sandbox) — pemulihan dimatikan." };
  if (c.user) return { mode: "google", text: "Masuk dengan akun Google" + (c.user.displayName ? " (" + c.user.displayName + ")" : "") };
  return { mode: m.mode === "guest" ? "guest" : "none", text: m.mode === "guest" ? "Mode Tamu — progres hanya di perangkat ini" : "Belum masuk akun" };
}
const sumHTML = (s) => `<div class="rec-sum"><span title="Koin">💰 ${s.money.toLocaleString("id-ID")}</span><span title="Total ikan tertangkap">🐟 ${s.caught.toLocaleString("id-ID")}</span><span title="Level pancing">🎣 Lv ${s.rod}</span><span title="Level kapal">⛵ Lv ${s.boat}</span><span title="Level rumah">🏠 Lv ${s.homeLevel}</span></div>`;
const bar = (pct, text, indet) => `<div class="rec-bar${indet ? " indet" : ""}" role="progressbar" ${indet ? "" : `aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"`} aria-label="Kemajuan"><i style="width:${indet ? 100 : pct}%"></i></div><div class="rec-pct">${indet ? "⏳ " : pct + "% — "}${esc(text)}</div>`;
const STAGES = ["Akun", "Cadangan di perangkat", "Cloud Save"];
const steps = (done, cur) => `<ul class="rec-steps">${STAGES.map((t, i) => `<li class="${i < done ? "ok" : i === cur ? "cur" : ""}">${i < done ? "✓" : i === cur ? "●" : "○"} ${t}</li>`).join("")}</ul>`;

// ---------- layar awal ----------
function showIntro() {
  const w = who();
  setBody(`<h2 id="recTitle" tabindex="-1">🔄 Pemulihan Data Pemain</h2>
    <p class="rec-lead">Progres memancingmu hilang setelah berganti akun? Kami akan membantu mencari cadangan yang tersedia.</p>
    <p class="rec-who">👤 ${esc(w.text)}</p>
    <button type="button" class="rec-btn big" id="recGo" ${w.mode === "sandbox" ? "disabled" : ""}>🔍 Cari &amp; Pulihkan Data</button>
    <p class="rec-fine">Pencarian hanya <b>membaca</b>. Tidak ada progres, koin, ikan, atau cadangan yang dihapus atau diubah sebelum kamu mengonfirmasi.</p>`);
  $("recGo").addEventListener("click", scan);
}

// ---------- pencarian (persentase = tahap yang selesai) ----------
async function stage(pct, text, done, cur, indet) { setBody(`<h2 id="recTitle" tabindex="-1">🔍 Mencari cadangan…</h2>${bar(pct, text, indet)}${steps(done, cur)}`); await wait(MIN_STAGE_MS); }
async function scan() {
  if (busy) return; busy = true; let r;
  try { r = await doScan(); } catch (e) { r = { fatal: true }; } finally { busy = false; }
  showResults(r);
}
async function doScan() {
  const c = cloud(), W = who(), out = { who: W, local: [], rejected: 0, blocked: false, cloud: null, cloudNote: "", sent: null };
  await stage(0, "Memulai pemeriksaan…", 0, 0);
  // 1) akun
  await stage(5, "Memeriksa akun yang sedang login…", 0, 0);
  out.sent = R.sentRead(localStorage);
  await stage(25, "Akun diperiksa.", 1, 1);
  // 2) cadangan lokal — HANYA membaca
  await stage(30, "Mencari cadangan di perangkat ini (tanpa mengubah apa pun)…", 1, 1);
  const cur = (() => { try { return localStorage.getItem(c && c.KEY ? c.KEY : R.CURRENT_KEY); } catch (e) { return null; } })();
  const sc = R.scanLocal(localStorage); out.blocked = sc.blocked; out.rejected = sc.rejected; out.cur = cur;
  out.local = R.candidates(sc.entries, cur);
  await stage(50, out.blocked ? "Browser tidak mengizinkan membaca cadangan." : "Cadangan di perangkat diperiksa.", 2, 2);
  // 3) Cloud Save (identitas diverifikasi server)
  if (W.mode === "google") {
    await stage(55, "Memverifikasi akun dan membaca Cloud Save…", 2, 2, true);
    const p = await c.peek();
    if (p && p.ok) { out.cloud = R.cloudCandidate(p.C, cur); out.cloudExists = !!(p.C && p.C.exists); if (!out.cloud && p.C && p.C.exists) out.cloudNote = "Cloud Save-mu sudah sama dengan progres di perangkat ini."; if (p.C && !p.C.exists) out.cloudNote = "Akun ini belum punya Cloud Save."; }
    else out.cloudNote = (p && p.message) || "Cloud Save belum bisa dijangkau sekarang.";
    out.cloudErr = !(p && p.ok);
  } else out.cloudNote = W.mode === "guest" || W.mode === "none" ? "Masuk Google dulu agar Cloud Save dan permohonan pemulihan bisa dipakai." : "";
  await stage(75, "Pencarian selesai. Pemulihan belum dilakukan.", 3, 3);
  return out;
}

// ---------- hasil pencarian ----------
function candHTML(c, i) {
  const k = c.kind === "cloud" ? `<span class="rec-tag ok">☁️ Terverifikasi akunmu</span>` : `<span class="rec-tag warn">📱 Belum terverifikasi</span>`;
  return `<div class="rec-card"><div class="rec-card-h"><b>${esc(c.label)}</b>${k}</div><div class="rec-date">${esc(R.fmtDate(c.ts))}${c.kind === "local" && c.current ? "" : ""}</div>${sumHTML(c.summary)}
    <button type="button" class="rec-btn" data-pick="${i}">${c.kind === "cloud" ? "Pulihkan dari Cloud" : "Ajukan Pemulihan ke Owner"}</button></div>`;
}
function showResults(r) {
  if (!r || r.fatal) { setBody(`<h2 id="recTitle" tabindex="-1">Terjadi kendala</h2><p>Pencarian tidak bisa diselesaikan. Tidak ada data yang diubah atau dihapus.</p><button type="button" class="rec-btn" id="recAgain">Coba lagi</button>`); $("recAgain").addEventListener("click", scan); return; }
  st.r = r; st.cands = (r.cloud && !r.cloud.same ? [r.cloud] : []).concat(r.local);
  const W = r.who, loginBtn = (W.mode === "guest" || W.mode === "none") && cloud() && cloud().enabled ? `<button type="button" class="rec-btn alt" id="recLogin">🔗 Hubungkan / Masuk Google</button>` : "";
  let head = `<h2 id="recTitle" tabindex="-1">${st.cands.length ? "Cadangan ditemukan" : "Tidak ada cadangan yang bisa dipulihkan"}</h2>` + bar(75, "Pencarian selesai. Pemulihan belum dilakukan.");
  let body = "";
  if (r.cloud && r.cloud.same) body += `<p class="rec-note">☁️ Progres di perangkat ini sudah sama dengan Cloud Save akunmu. Tidak ada yang perlu dipulihkan dari Cloud.</p>`;
  if (r.sent) body += `<p class="rec-note">⏳ Kamu sudah mengirim permohonan pemulihan pada ${esc(R.fmtDate(r.sent.at))}. Owner akan memeriksanya; permohonan yang sama tidak dikirim dua kali.</p>`;
  if (st.cands.length) {
    body += `<p class="rec-fine">Pilih satu untuk melihat konfirmasi. Belum ada yang diubah.</p>` + st.cands.map(candHTML).join("");
    if (W.mode !== "google" && r.local.length) body += `<p class="rec-note">Cadangan di perangkat <b>tidak bisa langsung dipasang</b> karena bisa diedit. Masuk Google lalu ajukan ke Owner untuk diperiksa.</p>`;
  } else {
    body += `<p>Kami tidak menemukan cadangan di perangkat ini${r.cloud === null && r.cloudNote ? " maupun di Cloud" : ""}.${r.cloudNote ? " " + esc(r.cloudNote) : ""}</p>
      <p class="rec-note">Tidak ada pengembalian otomatis. Jika kamu punya file cadangan atau bukti progres lama, kamu bisa meminta bantuan Owner. Jangan hapus data situs atau file cadangan.</p>
      <a class="rec-btn alt link" href="${AJUKAN_URL}" target="_blank" rel="noopener">📨 Ajukan Pemulihan ke Owner</a>`;
  }
  if (r.cloudNote && st.cands.length) body += `<p class="rec-fine">☁️ ${esc(r.cloudNote)}</p>`;
  if (r.blocked) body += `<p class="rec-note">Browser tidak mengizinkan membaca cadangan di sini. Jangan hapus data situs; coba dari browser tempat kamu bermain.</p>`;
  if (r.rejected) body += `<p class="rec-fine">${r.rejected} cadangan tidak lolos pemeriksaan bentuk dan diabaikan (tidak dihapus).</p>`;
  setBody(head + body + loginBtn + `<button type="button" class="rec-btn ghost" id="recDone">Tutup</button>`);
  box.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => confirmPick(st.cands[+b.dataset.pick])));
  if ($("recLogin")) $("recLogin").addEventListener("click", async () => { busy = true; try { await cloud().signInGoogle(); } finally { busy = false; } showIntro(); });
  $("recDone").addEventListener("click", () => close());
}

// ---------- konfirmasi ----------
function confirmPick(c) {
  if (!c) return;
  const isCloud = c.kind === "cloud", W = who();
  if (isCloud) {
    setBody(`<h2 id="recTitle" tabindex="-1">Pulihkan dari Cloud?</h2>${sumHTML(c.summary)}<p class="rec-date">${esc(R.fmtDate(c.ts))}</p>
      <p>Progres di perangkat ini akan <b>dicadangkan dulu</b>, lalu digantikan oleh Cloud Save akunmu. Koin, ikan, rumah, dan kapal <b>tidak digabung</b>. Saldo Top Up dan transaksi tidak disentuh.</p>
      <button type="button" class="rec-btn big" id="recOk">Ya, pulihkan dari Cloud</button><button type="button" class="rec-btn ghost" id="recNo">Batal</button>`);
    $("recOk").addEventListener("click", () => runCloud(c)); $("recNo").addEventListener("click", () => showResults(st.r));
    return;
  }
  const can = W.mode === "google", dup = st.r && st.r.sent && st.r.sent.hash === c.hash;
  setBody(`<h2 id="recTitle" tabindex="-1">Ajukan pemulihan ke Owner?</h2>${sumHTML(c.summary)}<p class="rec-date">${esc(c.label)} · ${esc(R.fmtDate(c.ts))}</p>
    <p class="rec-note">Progresmu <b>belum kembali</b> setelah ini. Cadangan perangkat bisa diubah, jadi Owner akan memeriksa dulu dan menyetujui. Cadangan ini <b>tidak dipasang ke akunmu otomatis</b> dan tidak ada yang dihapus.</p>
    ${can ? "" : `<p class="rec-note warn">Masuk dengan akun Google dulu untuk mengirim permohonan.</p>`}
    <label class="rec-chk"><input type="checkbox" id="recConsent"> Saya setuju data progres dari cadangan ini dikirim secara privat ke server Nusa Island untuk diperiksa Owner.</label>
    <button type="button" class="rec-btn big" id="recOk" disabled>Kirim Permohonan</button><button type="button" class="rec-btn ghost" id="recNo">Batal</button>`);
  const sync = () => { $("recOk").disabled = !(can && $("recConsent").checked && !dup && !busy); };
  $("recConsent").addEventListener("change", sync); if (dup) $("recOk").textContent = "Sudah dikirim";
  $("recOk").addEventListener("click", () => runRequest(c)); $("recNo").addEventListener("click", () => showResults(st.r));
}

// ---------- pemulihan Cloud (persentase nyata) ----------
async function runCloud(c) {
  if (busy) return; busy = true;
  try {
    setBody(`<h2 id="recTitle" tabindex="-1">Memulihkan…</h2>${bar(80, "Mencadangkan progres perangkat & memverifikasi Cloud…")}`);
    const res = await cloud().restoreCloud(c.hash);
    if (res && res.ok) {
      // verifikasi akhir dari penyimpanan, bukan dari memori
      let back = null; try { back = JSON.parse(localStorage.getItem(cloud().KEY)); } catch (e) {}
      const same = back && localStorage.getItem(cloud().KEY) === res.data;
      if (!same) throw Object.assign(new Error("verify"), { code: "verify" });
      showSuccess(R.describe(back));
    } else showFail(res && res.error, res && res.message);
  } catch (e) { showFail("verify"); } finally { busy = false; }
}
function showSuccess(sum) {
  setBody(`<div class="rec-ok"><div class="rec-big">✅</div><h2 id="recTitle" tabindex="-1">DATA BERHASIL DIPULIHKAN!</h2></div>${bar(100, "Selesai & terverifikasi")}
    <p class="rec-lead">Selamat! Progres Nusa Island kamu sudah kembali.</p>${sumHTML(sum)}<p class="rec-fine">Progres sebelumnya di perangkat ini tersimpan sebagai cadangan. Tekan tombol di bawah agar game memuat data terbaru.</p>
    <button type="button" class="rec-btn big" id="recRefresh">🔄 REFRESH GAME SEKARANG</button>`);
  $("recRefresh").addEventListener("click", () => { $("recRefresh").disabled = true; location.reload(); });
  $("recX").classList.add("hidden");                         // simpanan lokal sudah diganti: wajib muat ulang agar game tidak berjalan dengan data lama
}
const FAIL = {
  none: "Cloud Save tidak ditemukan.", changed: "Cloud Save berubah sejak ditampilkan. Cari ulang agar data terbaru yang dipakai.", same: "Progres di perangkat ini sudah sama dengan Cloud. Tidak ada yang perlu dipulihkan.",
  backup: "Penyimpanan perangkat penuh sehingga cadangan tidak bisa dibuat. Pemulihan dibatalkan agar progresmu aman.", storage: "Gagal menulis ke perangkat. Progresmu tidak diubah.", verify: "Verifikasi gagal. Progres lama dikembalikan; tidak ada yang hilang.",
  auth: "Sesi login berakhir. Masuk lagi lalu coba cari ulang.", sandbox: "Mode Owner (sandbox): pemulihan dimatikan.",
};
function showFail(code, msg) {
  setBody(`<h2 id="recTitle" tabindex="-1">Pemulihan belum berhasil</h2><p>${esc(FAIL[code] || msg || "Terjadi kesalahan. Coba lagi nanti.")}</p><p class="rec-fine">Tidak ada progres yang dihapus. Cadangan di perangkat tetap aman.</p>
    <button type="button" class="rec-btn" id="recAgain">Cari ulang</button><button type="button" class="rec-btn ghost" id="recDone">Tutup</button>`);
  $("recAgain").addEventListener("click", scan); $("recDone").addEventListener("click", () => close());
}

// ---------- permohonan ke Owner (endpoint recoveryRequest yang sudah ada) ----------
async function runRequest(c) {
  if (busy) return; busy = true;
  try {
    setBody(`<h2 id="recTitle" tabindex="-1">Mengirim permohonan…</h2>${bar(0, "Menunggu server (durasi tidak diketahui)…", true)}`);
    let cur = null; try { cur = localStorage.getItem(c.key); } catch (e) {}
    if (!cur || cur !== c.raw) { showFail(null, "Cadangan berubah sejak ditampilkan. Cari ulang."); return; }      // kirim persis yang ditampilkan
    let res; try { res = await cloud().call("recoveryRequest", { data: c.raw }); }
    catch (e) {
      const code = String((e && e.code) || ""), net = e && (e.network || /unavailable|deadline/.test(code));
      const text = net ? "Tidak ada koneksi atau server belum terjangkau. Permohonan belum terkirim; cadangan tetap aman." :
        /not-found|unimplemented/.test(code) ? "Layanan permohonan di game belum aktif. Gunakan halaman Ajukan Pemulihan." : String((e && e.message) || "Permohonan belum terkirim").slice(0, 160);
      showPending(false, text, !net); return;
    }
    if (res && res.pending) {
      try { localStorage.setItem(R.SENT_KEY, JSON.stringify({ hash: c.hash, at: Date.now() })); } catch (e) {}
      showPending(true, "");
    } else showPending(false, "Server tidak mengonfirmasi permohonan. Coba lagi nanti.");
  } finally { busy = false; }
}
function showPending(ok, err, offerPortal) {
  if (ok) setBody(`<div class="rec-ok pend"><div class="rec-big">⏳</div><h2 id="recTitle" tabindex="-1">PERMOHONAN PEMULIHAN DIKIRIM</h2></div>
    <p class="rec-lead">Progres belum kembali. Owner akan memeriksa permohonanmu.</p><p class="rec-fine">Jangan hapus data situs atau file cadangan, dan jangan reset game dulu. Tidak ada koin atau ikan yang diubah saat ini.</p><button type="button" class="rec-btn" id="recDone">Mengerti</button>`);
  else setBody(`<h2 id="recTitle" tabindex="-1">Permohonan belum terkirim</h2><p>${esc(err)}</p><p class="rec-fine">Tidak ada data yang diubah.</p>${offerPortal ? `<a class="rec-btn alt link" href="${AJUKAN_URL}" target="_blank" rel="noopener">📨 Buka halaman Ajukan Pemulihan</a>` : ""}<button type="button" class="rec-btn" id="recDone">Tutup</button>`);
  $("recDone").addEventListener("click", () => close());
}

function hook() {
  const hr = document.querySelector(".hud-right"); if (!hr || $("recoverBtn")) return;
  ensure();
  const b = document.createElement("button"); b.id = "recoverBtn"; b.type = "button"; b.className = "chip icon-btn"; b.setAttribute("aria-label", "Pulihkan Data"); b.textContent = "🔄";
  b.addEventListener("click", () => open()); hr.appendChild(b); scheduleVerify();            // ubin "🔄 Pulihkan Data" di menu ☰ (tombol disembunyikan; menu memanggilnya)
}
// Verifikasi pemulihan: satu kali per sesi, hanya bila perangkat ini pernah mengirim permohonan. Server yang memutuskan "Selesai".
const VERIFY_KEY = "nusa-recovery-verify-session";
async function verifyIfPending() {
  try {
    const c = cloud(); if (!c || !c.enabled || c.sandbox || !c.user) return;
    try { if (sessionStorage.getItem(VERIFY_KEY)) return; } catch (e) {}
    const issue = window.NW && NW.username && NW.username.isOpen && NW.username.isOpen() ? "name_prompt" : null;   // pemain masih diminta membuat nama
    const p = R.verifyPayload(R.sentRead(localStorage), c.meta(), issue); if (!p) return;
    try { sessionStorage.setItem(VERIFY_KEY, "1"); } catch (e) {}
    const res = await c.call("recoveryVerify", p);
    if (res && res.state === "verified") { try { localStorage.removeItem(R.SENT_KEY); } catch (e) {} try { window.Nusa.toast && window.Nusa.toast("Pemulihan terverifikasi ✓", "good"); } catch (e) {} }
  } catch (e) { /* diam: verifikasi bukan bagian jalur bermain; coba lagi sesi berikutnya */ }
}
function scheduleVerify() { const c = cloud(); if (c && c.ready && c.ready.then) c.ready.then(() => setTimeout(verifyIfPending, 3000)); }
NW.recovery = { hook, open, close, scan, verifyIfPending, scheduleVerify, _state: () => st, get isOpen() { return isOpen(); } };
})();
