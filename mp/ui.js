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
  consent: "Belum disetujui. Setujui di bawah untuk memulai.",
  "no-backend": "Dunia Bersama butuh Firebase dan server multiplayer yang aktif. Di versi ini belum aktif.",
  "no-endpoint": "Server Dunia Bersama belum diaktifkan oleh pemilik game. Pemain lain belum bisa terhubung.",
  keluar: "Kamu keluar dari server.", nonaktif: "Tidak aktif.", pindah: "Pindah server…", ditolak: "Tidak bisa masuk server itu.",
  "tab-tersembunyi-lama": "Terputus karena tab lama tersembunyi (hemat baterai). Kembali ke game untuk tersambung lagi.",
  putus: "Koneksi terputus, mencoba lagi…", "gagal-token": "Gagal masuk ke server. Mencoba lagi…",
};
const HUR = (h) => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10; return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0"); };
function statusOf(v) {
  if (v.state === "online") return { dot: "🟢", t: v.room && String(v.room).indexOf("rumah-") === 0 ? "Tersambung · Rumah (ruang privat)" : "Tersambung" };
  if (v.state === "kicked") return { dot: "🔴", t: v.why };
  if (v.state === "connecting" || (v.state === "off" && v.why === "pindah")) return { dot: "🟡", t: "Menyambung…" };
  if (v.state === "reconnecting") return { dot: "🟠", t: "Terputus, menyambung ulang…" };
  if (v.state === "replaced" || v.state === "blocked") return { dot: "🔴", t: v.why };
  if (v.manualLeave) return { dot: "⚪", t: "Keluar dari server" };
  return { dot: v.state === "error" ? "🟠" : "⚪", t: WHY[v.why] || v.why || "Tidak tersambung" };
}
const dirArrow = (dx, dy) => { const a = Math.atan2(dy, dx), i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; return ["➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️", "⬆️", "↗️"][i]; };
function panelHTML() {
  const v = NW.mp.view(), p = v.prefs, me = NW.world && NW.world.player, st = statusOf(v), online = v.online, inHouse = !!(v.room && String(v.room).indexOf("rumah-") === 0);
  const consent = p.consent !== true;
  const err = v.lastError && Date.now() - v.lastError.at < 15000 ? `<div class="sv-err" role="alert">${esc(v.lastError.msg)}</div>` : "";
  const hr = online && v.hour != null ? `<div class="sv-row"><span>Waktu dunia</span><b>${v.hour >= 19 || v.hour < 5 ? "🌙" : "☀️"} ${HUR(v.hour)}</b><small>sama untuk semua pemain di server ini</small></div>` : "";
  const hidden = online ? Math.max(0, v.n - 1 - v.players.length) : 0;
  const rooms = v.rooms && v.rooms.rooms ? v.rooms.rooms : null;
  const chips = rooms ? rooms.map(([k, n]) => { const full = n >= v.cap, cur = online && v.roomNo === k; return `<button class="sv-chip ${cur ? "cur" : ""} ${full && !cur ? "full" : ""}" data-act="mpJoinN" data-arg="${k}" ${full && !cur ? "disabled" : ""} aria-label="Server ${k}, ${n} dari ${v.cap} pemain${full ? ", penuh" : ""}"><b>${k}</b><small>${n}/${v.cap}</small></button>`; }).join("") : "";
  const list = online ? v.players.map((q) => {
    const dx = me ? q.x - me.x : 0, dy = me ? q.y - me.y : 0, q1 = NW.P ? NW.P(q.x, q.y) : { x: dx, y: dy }, q0 = NW.P && me ? NW.P(me.x, me.y) : { x: 0, y: 0 };
    const dist = Math.round(Math.hypot(dx, dy)), what = q.holding ? "memamerkan ikan" : q.f & 4 ? "memancing" : q.f & 2 ? "duduk santai" : q.f & 1 ? "berjalan" : "berdiri";
    return `<div class="mp-row"><span>🎣 ${esc(q.name)}</span><span class="muted">${what} · ${dirArrow(q1.x - q0.x, q1.y - q0.y)} ${dist}m</span></div>`;
  }).join("") : "";
  return `<div class="mp sv">
    <div class="sv-title">🌴 DUNIA BERSAMA</div>
    <div class="sv-card">
      <div class="sv-row"><span>Server ID</span><b class="sv-id" id="svId">${online && !inHouse ? v.roomNo : "–"}</b><button class="btn small" data-act="mpCopy" ${online && !inHouse ? "" : "disabled"}>📋 Salin ID Server</button></div>
      <div class="sv-row"><span>Pemain</span><b>${online ? v.n + "/" + v.cap : "–"}</b>${online && hidden > 0 ? `<small>${v.players.length} terlihat di Muara · ${hidden} sedang di tempat lain</small>` : ""}</div>
      <div class="sv-row"><span>Status</span><b>${st.dot} ${esc(st.t)}</b></div>
      ${hr}
    </div>
    ${err}
    ${consent ? `<div class="mp-note"><b>Main bersama pemain lain?</b><br>Di Muara Kampung, pemain Google lain bisa melihat <b>nama panggilan</b>, gelar, posisi, ikan yang kamu pamerkan, dan <b>chat</b>-mu. Tidak ada koin, item, email, atau data akun yang dibagikan. Chat disaring dan tidak disimpan. Kamu bisa keluar kapan saja.
      <div class="mp-btns"><button class="btn gold" data-act="mpYes">Ikut Dunia Bersama</button><button class="btn" data-act="mpNo">Tidak, terima kasih</button></div></div>` : `
    <div class="sv-actions">
      <button class="btn gold sv-big" data-act="mpRandom">🎲 Gabung Server Acak</button>
      <form class="sv-idform" id="svForm" autocomplete="off"><label for="svInput">🔢 Masuk dengan ID Server</label>
        <div><input id="svInput" inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="1–${window.NW.MPProto.MAX_ROOMS}" aria-label="ID server, angka 1 sampai 64"><button class="btn gold" type="submit">Masuk</button></div></form>
      ${v.manualLeave ? `<button class="btn" data-act="mpAuto">Gabung Otomatis</button>` : `<button class="btn" data-act="mpLeave" ${online || v.state === "connecting" || v.state === "reconnecting" ? "" : "disabled"}>🚪 Keluar Server</button>`}
    </div>
    <div class="mp-h-row"><h4 class="mp-h">Daftar server</h4><button class="btn small" data-act="mpRefresh">↻ Segarkan</button></div>
    <div class="sv-grid">${chips || `<div class="muted" style="grid-column:1/-1;padding:4px 2px">Ketuk ↻ Segarkan untuk melihat isi tiap server.</div>`}</div>
    <div class="muted mp-fine">12 server awal; server 13 dan berikutnya muncul otomatis jika semua server terbuka penuh (maks. 64). Ketuk ↻ Segarkan untuk melihat server baru.</div>
    <h4 class="mp-h">Di server ini</h4><div class="mp-list">${online ? `<div class="mp-row me"><span>🧑‍🎣 Kamu</span><span class="muted">${v.n} online</span></div>${list || '<div class="muted" style="padding:6px 2px">Belum ada pemain lain yang terlihat. Pemain hanya tampil bila benar-benar online.</div>'}` : '<div class="muted" style="padding:6px 2px">Tidak tersambung.</div>'}</div>
    <h4 class="mp-h">Pengaturan</h4>
    <label class="mp-sw"><input type="checkbox" data-pref="on" ${p.on ? "checked" : ""}><span>Aktifkan Dunia Bersama</span></label>
    <label class="mp-sw"><input type="checkbox" data-pref="chat" ${p.chat ? "checked" : ""}><span>Tampilkan chat pemain lain</span></label>
    <label class="mp-sw"><input type="checkbox" data-pref="low" ${p.low ? "checked" : ""}><span>Hemat data (kurangi pembaruan gerak ±70%)</span></label>
    <div class="muted mp-fine">Data terpakai sesi ini: ↑ ${kb(v.tx)} · ↓ ${kb(v.rx)}. Nama panggilan diatur di Profil Nelayan. Teman cukup memakai ID Server yang sama untuk bertemu.</div>`}
    <div class="muted mp-fine">Pemain di dunia ini adalah orang sungguhan, bukan bot. Siang/malam dan pamer ikan terlihat sama di satu server.</div>
  </div>`;
}
async function copyId(id) {
  const t = String(id);
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); return true; } } catch (e) {}
  try { const i = document.createElement("input"); i.value = t; i.style.cssText = "position:fixed;opacity:0;top:0"; document.body.appendChild(i); i.select(); const ok = document.execCommand("copy"); i.remove(); return ok; } catch (e) { return false; }
}
function joinFromInput() {
  const i = $("svInput"), r = NW.mp.joinRoom(i ? i.value : "");
  if (!r.ok) { N().toast(r.msg, "bad"); if (i) { i.classList.add("bad"); i.focus(); } return; }
  if (r.same) N().toast("Kamu sudah berada di server itu."); else N().toast("Pindah server…");
  N().renderPanel();
}
async function act(a, arg) {
  if (a === "mpYes") { NW.mp.setPref("consent", true); N().toast("👥 Dunia Bersama aktif", "good"); }
  else if (a === "mpNo") NW.mp.setPref("consent", false);
  else if (a === "mpRandom") { NW.mp.joinRandom(); N().toast("Mencari server acak…"); }
  else if (a === "mpAuto") { NW.mp.joinAuto(); N().toast("Mencari server…"); }
  else if (a === "mpJoinN") { const r = NW.mp.joinRoom(arg); if (r.same) N().toast("Kamu sudah berada di server itu."); else if (r.ok) N().toast("Pindah ke server " + arg + "…"); }
  else if (a === "mpLeave") { NW.mp.leaveServer(); N().toast("Kamu keluar dari server."); }
  else if (a === "mpCopy") { const v = NW.mp.view(); if (v.online) N().toast((await copyId(v.roomNo)) ? `ID server ${v.roomNo} disalin. Bagikan ke teman!` : `ID server: ${v.roomNo}`, "good"); return; }
  else if (a === "mpRefresh") { await NW.mp.fetchRooms(true); }
  N().renderPanel(); refresh();
}
function after(body) {
  body.querySelectorAll("[data-pref]").forEach((el) => el.addEventListener("change", () => { NW.mp.setPref(el.dataset.pref, el.checked); N().renderPanel(); refresh(); }));
  const f = body.querySelector("#svForm"); if (f) f.addEventListener("submit", (e) => { e.preventDefault(); joinFromInput(); });
  const i = body.querySelector("#svInput"); if (i) i.addEventListener("input", () => { i.value = i.value.replace(/\D/g, "").slice(0, 2); i.classList.remove("bad"); });
  if (!NW.mp._R.rooms && NW.mp.view().prefs.consent === true) NW.mp.fetchRooms(false).then((r) => { if (r && N().currentPanel() === "mp") N().renderPanel(); });
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
  lg.innerHTML = rec.map((l) => `<div class="${l.mine ? "mine" : ""}"><b>${esc(l.name)}</b> ${esc(l.text)}</div>`).join(""); lg.classList.toggle("hidden", !rec.length || !!(N().isPanelOpen && N().isPanelOpen()));   // umpan singkat tidak menutupi panel yang sedang terbuka
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
  N().registerPanel("mp", { title: () => "🌐 Server · Dunia Bersama", render: panelHTML, act, after });
  const hr = document.querySelector(".hud-right");
  if (hr && !$("serverBtn")) { const b = document.createElement("button"); b.id = "serverBtn"; b.type = "button"; b.className = "chip icon-btn"; b.setAttribute("aria-label", "Server"); b.textContent = "🌐"; b.addEventListener("click", () => N().openPanel("mp")); hr.appendChild(b); }   // ubin "🌐 Server" di menu ☰ (tombol disembunyikan; menu memanggilnya)
  NW.mp.onChange(() => { refresh(); if (N().currentPanel() === "mp") N().renderPanel(); });
  setInterval(refresh, 1500);
  refresh();
}
NW.mpUI = { mount, refresh, setChat, isChatOpen: () => chatOpen };
})();
