// =========================================================
//  NUSA ISLAND — Tahap 4: tampilan Dunia Bersama (dock 👥/💬, bilah chat, log chat, panel pengaturan, persetujuan)
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const $ = (id) => document.getElementById(id);
const N = () => window.Nusa;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const kb = (n) => (n < 1024 ? n + " B" : (n / 1024).toFixed(1) + " KB");
const WHY = {
  login: "Masuk dengan akun Google dulu untuk bertemu pemain lain.",
  consent: "Belum disetujui. Ketuk 👥 untuk memulai.",
  "no-backend": "Dunia Bersama butuh Firebase dan server multiplayer yang aktif. Di versi ini belum aktif.",
  "no-endpoint": "Server Dunia Bersama belum diaktifkan oleh pemilik game. Pemain lain belum bisa terhubung.",
  keluar: "Kamu keluar dari Dunia Bersama.", nonaktif: "Tidak aktif.", "tab-tersembunyi-lama": "Terputus karena tab lama tersembunyi (hemat baterai). Kembali ke game untuk tersambung lagi.",
  putus: "Koneksi terputus, mencoba lagi…", "gagal-token": "Gagal masuk ke server. Mencoba lagi…",
};

function statusLine(v) {
  if (v.state === "online") return `🟢 Tersambung · ${esc(v.room.replace("muara-", "Muara Kampung #"))} · ${v.n}/${v.cap} pemain`;
  if (v.state === "connecting") return "🟡 Menyambung…";
  if (v.state === "reconnecting") return "🟠 Terputus, menyambung ulang…";
  if (v.state === "replaced" || v.state === "blocked") return "🔴 " + esc(v.why);
  if (v.state === "error") return "🟠 " + esc(WHY[v.why] || v.why || "Gagal tersambung");
  return "⚪ " + esc(WHY[v.why] || v.why || "Tidak tersambung");
}
function panelHTML() {
  const v = NW.mp.view(), p = v.prefs;
  const names = v.players.map((q) => `<div class="mp-row"><span>🎣 ${esc(q.name)}</span><span class="muted">${q.f & 4 ? "memancing" : q.f & 2 ? "duduk santai" : q.f & 1 ? "berjalan" : "berdiri"}</span></div>`).join("");
  return `<div class="mp">
    <div class="mp-stat">${statusLine(v)}</div>
    ${p.consent !== true ? `<div class="mp-note"><b>Main bersama pemain lain?</b><br>Di Muara Kampung, pemain Google lain bisa melihat <b>nama panggilan</b>, gelar, posisi, dan <b>chat</b>-mu. Tidak ada koin, item, email, atau data akun yang dibagikan. Chat disaring dan tidak disimpan. Kamu bisa keluar kapan saja.
      <div class="mp-btns"><button class="btn gold" data-act="mpYes">Ikut Dunia Bersama</button><button class="btn" data-act="mpNo">Tidak, terima kasih</button></div></div>` : ""}
    ${p.consent === true ? `<h4 class="mp-h">Di dekatmu</h4><div class="mp-list">${v.online ? `<div class="mp-row me"><span>🧑‍🎣 Kamu</span><span class="muted">${v.n} online</span></div>${names || '<div class="muted" style="padding:6px 2px">Belum ada pemain lain di instance ini. Pemain hanya tampil bila benar-benar online.</div>'}` : '<div class="muted" style="padding:6px 2px">Tidak tersambung.</div>'}</div>
    <h4 class="mp-h">Pengaturan</h4>
    <label class="mp-sw"><input type="checkbox" data-pref="on" ${p.on ? "checked" : ""}><span>Aktifkan Dunia Bersama</span></label>
    <label class="mp-sw"><input type="checkbox" data-pref="chat" ${p.chat ? "checked" : ""}><span>Tampilkan chat pemain lain</span></label>
    <label class="mp-sw"><input type="checkbox" data-pref="low" ${p.low ? "checked" : ""}><span>Hemat data (kurangi pembaruan gerak ±70%)</span></label>
    <div class="muted mp-fine">Data terpakai sesi ini: ↑ ${kb(v.tx)} · ↓ ${kb(v.rx)}. Nama panggilan diatur di Profil Nelayan.</div>` : ""}
    <div class="muted mp-fine">Saling sapa, nongkrong di bangku, dan memancing berdekatan di Muara Kampung. Pemain di dunia ini adalah orang sungguhan, bukan bot.</div>
  </div>`;
}
function act(a) {
  if (a === "mpYes") { NW.mp.setPref("consent", true); N().toast("👥 Dunia Bersama aktif", "good"); }
  if (a === "mpNo") { NW.mp.setPref("consent", false); }
  N().renderPanel(); refresh();
}
function after(body) {
  body.querySelectorAll("[data-pref]").forEach((el) => el.addEventListener("change", () => { NW.mp.setPref(el.dataset.pref, el.checked); N().renderPanel(); refresh(); }));
}
let askDismissed = false, chatOpen = false, lastSeen = Date.now(), histKey = "", raf = 0;
const COLORS = ["#ffe08a", "#9fe3d2", "#ffb3a1", "#b9d4ff", "#e3c2ff", "#c8f08f", "#ffc98a", "#f5a9d0"];
const hue = (n) => { let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; };
function histHTML(v) {
  if (!v.prefs.chat) return `<div class="mp-sys">Chat pemain lain disembunyikan. Aktifkan lagi di 👥 Dunia Bersama.</div>`;
  if (!v.log.length) return `<div class="mp-sys">${v.online ? "Belum ada obrolan. Sapa pemain lain di Muara Kampung! 👋" : "Tidak tersambung ke Dunia Bersama."}</div>`;
  return v.log.map((l) => l.name === "Sistem" ? `<div class="mp-sys">${esc(l.text)}</div>` : `<div class="m ${l.mine ? "mine" : ""}"><b style="color:${l.mine ? "#fff" : hue(l.name)}">${esc(l.name)}</b><span>${esc(l.text)}</span></div>`).join("");
}
function renderHist(force) {
  const v = NW.mp.view(), h = $("mpHist"); if (!h) return;
  const key = v.log.length + "|" + (v.log.length ? v.log[v.log.length - 1].t : 0) + "|" + v.prefs.chat + "|" + v.online;
  if (!force && key === histKey) return; histKey = key;
  const nearEnd = h.scrollHeight - h.scrollTop - h.clientHeight < 60;
  h.innerHTML = histHTML(v); if (nearEnd || force) h.scrollTop = h.scrollHeight;
}
function setChat(on) {
  chatOpen = on; const c = $("mpChat"); if (!c) return; document.body.classList.toggle("mp-chat-open", on);
  c.classList.toggle("hidden", !on); $("mpChatBtn").classList.toggle("open", on); $("mpChatBtn").setAttribute("aria-expanded", on ? "true" : "false");
  if (on) { lastSeen = Date.now(); renderHist(true); setTimeout(() => { const i = $("mpInput"); if (i && !i.disabled) i.focus({ preventScroll: true }); }, 40); }
  else { lastSeen = Date.now(); const i = $("mpInput"); if (i) i.blur(); $("mpEmo").classList.add("hidden"); NW.mp.typing = false; document.body.classList.remove("mp-typing"); }
  refresh();
}
function refresh() {
  const v = NW.mp.view(), dock = $("mpDock"); if (!dock) return;
  const loggedIn = !!(NW.cloud && NW.cloud.enabled && NW.cloud.user);
  dock.classList.toggle("hidden", !loggedIn || !N().isStarted());
  $("mpN").textContent = v.online ? v.n : "–";
  $("mpCount").classList.toggle("on", v.online); $("mpCount").classList.toggle("ask", v.prefs.consent === null && loggedIn);
  $("mpChatBtn").classList.toggle("hidden", !v.online);
  if (chatOpen && !v.online) setChat(false);
  // lencana belum dibaca: hanya pesan NYATA dari pemain lain sejak panel terakhir dibuka/ditutup
  const unread = chatOpen || !v.prefs.chat ? 0 : v.log.filter((l) => l.t > lastSeen && !l.mine && l.name !== "Sistem").length;
  const ub = $("mpUnread"); ub.textContent = unread > 9 ? "9+" : String(unread); ub.classList.toggle("hidden", !unread);
  $("mpChatCount").textContent = v.online ? v.n + " pemain" : "offline";
  const inp = $("mpInput"); if (inp) { inp.disabled = !v.online; inp.placeholder = v.online ? "Ketik pesan…" : "Tidak tersambung"; }
  // umpan singkat saat panel tertutup (5 pesan terakhir, 9 detik)
  const lg = $("mpLog"), cut = Date.now() - 9000, rec = !chatOpen && v.prefs.chat ? v.log.filter((l) => l.t > cut && l.name !== "Sistem").slice(-4) : [];
  lg.innerHTML = rec.map((l) => `<div class="${l.mine ? "mine" : ""}"><b>${esc(l.name)}</b> ${esc(l.text)}</div>`).join(""); lg.classList.toggle("hidden", !rec.length);
  if (chatOpen) { if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderHist(false); }); }
  const ask = $("mpAsk");
  if (ask) ask.classList.toggle("hidden", !(loggedIn && v.prefs.consent === null && N().isStarted() && !askDismissed));
}
function mount() {
  if ($("mpDock")) return;
  const d = document.createElement("div"); d.id = "mpDock"; d.className = "mp-dock hidden";
  d.innerHTML = `<button id="mpCount" class="chip icon-btn" aria-label="Dunia Bersama">👥 <b id="mpN">–</b></button><button id="mpChatBtn" class="chip icon-btn hidden" aria-label="Obrolan" aria-expanded="false">💬<span id="mpUnread" class="mp-unread hidden">0</span></button>`;
  document.body.appendChild(d);
  const log = document.createElement("div"); log.id = "mpLog"; log.className = "mp-log hidden"; document.body.appendChild(log);
  const chat = document.createElement("section"); chat.id = "mpChat"; chat.className = "mp-chat hidden"; chat.setAttribute("role", "dialog"); chat.setAttribute("aria-label", "Obrolan");
  chat.innerHTML = `<header><b>Obrolan</b><span id="mpChatCount" class="mp-cc">offline</span><button type="button" id="mpEmoBtn" aria-label="Emoji cepat">😊</button><button type="button" id="mpClose" aria-label="Tutup obrolan">✕</button></header>
    <div id="mpHist" class="mp-hist" role="log" aria-live="polite"></div>
    <div id="mpEmo" class="mp-emo hidden">${NW.mp.EMOTES.map((e, i) => `<button type="button" data-emo="${i}" aria-label="Emoji ${e}">${e}</button>`).join("")}</div>
    <form id="mpForm" autocomplete="off"><input id="mpInput" type="text" maxlength="80" placeholder="Ketik pesan…" enterkeyhint="send" autocapitalize="sentences" autocomplete="off" autocorrect="on"><button class="mp-send" type="submit">Kirim</button></form>`;
  document.body.appendChild(chat);
  const ask = document.createElement("div"); ask.id = "mpAsk"; ask.className = "mp-ask hidden";
  ask.innerHTML = `<div><b>👥 Main bersama pemain lain?</b><div class="muted">Nama panggilan & chat terlihat pemain lain di Muara Kampung. Tanpa koin/item/email dibagikan.</div></div><div class="mp-btns"><button class="btn gold small" data-ask="yes">Ikut</button><button class="btn small" data-ask="later">Nanti</button></div>`;
  document.body.appendChild(ask);
  ask.addEventListener("click", (e) => { const b = e.target.closest("[data-ask]"); if (!b) return; if (b.dataset.ask === "yes") { NW.mp.setPref("consent", true); N().toast("👥 Dunia Bersama aktif", "good"); } else askDismissed = true; refresh(); });
  $("mpCount").addEventListener("click", () => { N().sfx("click"); N().openPanel("mp"); });
  $("mpChatBtn").addEventListener("click", () => { N().sfx("click"); setChat(!chatOpen); });
  $("mpClose").addEventListener("click", () => setChat(false));
  $("mpEmoBtn").addEventListener("click", () => $("mpEmo").classList.toggle("hidden"));
  $("mpForm").addEventListener("submit", (e) => {
    e.preventDefault(); const i = $("mpInput"), t = i.value.trim();
    if (t) { if (NW.mp.sendChat(t) === false) N().toast("Tidak tersambung", "bad"); }
    i.value = ""; i.blur();                                   // keyboard menutup, panel tetap terbuka
  });
  chat.querySelector(".mp-emo").addEventListener("click", (e) => { const b = e.target.closest("[data-emo]"); if (b) { NW.mp.sendEmote(+b.dataset.emo); $("mpEmo").classList.add("hidden"); } });
  const inp = $("mpInput");
  inp.addEventListener("focus", () => { NW.mp.typing = true; document.body.classList.add("mp-typing"); });
  inp.addEventListener("blur", () => { NW.mp.typing = false; document.body.classList.remove("mp-typing"); setTimeout(() => window.dispatchEvent(new Event("resize")), 120); });   // setelah keyboard tertutup, rapikan kanvas sekali
  inp.addEventListener("keydown", (e) => { if (e.key === "Escape") setChat(false); });
  N().registerPanel("mp", { title: () => "👥 Dunia Bersama", render: panelHTML, act, after });
  NW.mp.onChange(() => { refresh(); if (N().currentPanel() === "mp") N().renderPanel(); });
  setInterval(refresh, 1500);
  refresh();
}
NW.mpUI = { mount, refresh, setChat, isChatOpen: () => chatOpen };
})();
