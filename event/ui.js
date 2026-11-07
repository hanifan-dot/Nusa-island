// =========================================================
//  NUSA ISLAND — Event 5 Monster Legenda (tampilan): tombol 🦈, penanda hitung mundur, pengumuman, panel event, HUD duel, kartu hasil.
//  Semua angka (jadwal, sisa kesempatan, hasil, hadiah, trofi) berasal dari jawaban server lewat NW.event; modul ini hanya menampilkan.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const E = () => NW.event, EV = () => window.NusaEventCore, N = () => window.Nusa, $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString("id-ID");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const two = (n) => String(Math.floor(n)).padStart(2, "0");
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function countdown(ms) { const s = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return d > 0 ? `${d}h ${h}j ${two(m)}m` : h > 0 ? `${h}j ${two(m)}m ${two(x)}d` : `${two(m)}:${two(x)}`; }
const dateWIB = (ms) => { const d = new Date(ms + 7 * 3600000); return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const kgText = (kg) => (kg >= 1000 ? (kg / 1000).toString().replace(".", ",") + " ton" : kg + " kg");

// ---------- elemen tetap ----------
function build() {
  if ($("evPill")) return;
  const pill = document.createElement("button"); pill.id = "evPill"; pill.className = "ev-pill hidden"; pill.type = "button"; pill.setAttribute("aria-label", "Event Monster Legenda");
  pill.addEventListener("click", () => { N().sfx("click"); N().openPanel("event"); });
  const ann = document.createElement("div"); ann.id = "evAnn"; ann.className = "ev-ann"; ann.setAttribute("aria-live", "polite");
  const res = document.createElement("div"); res.id = "evResult"; res.className = "ev-result hidden"; res.setAttribute("role", "dialog");
  document.body.appendChild(pill); document.body.appendChild(ann); document.body.appendChild(res);
  const tb = $("tensionBar"); if (tb && !tb.querySelector(".ev-sweet")) { const z = document.createElement("div"); z.className = "ev-sweet"; tb.insertBefore(z, tb.firstChild); }
}

// tombol 🦈 hanya ADA di DOM selama event dinyalakan server (menu ☰ Tahap 4.1 membuat ubin dari tombol .hud-right yang ada)
function ensureBtn(on) {
  const hud = document.querySelector(".hud-right"), cur = $("evBtn");
  if (!on) { if (cur) cur.remove(); return null; }
  if (cur || !hud) return cur;
  const b = document.createElement("button"); b.className = "chip icon-btn misi"; b.id = "evBtn"; b.type = "button"; b.setAttribute("aria-label", "Event Monster Legenda");
  b.innerHTML = `🦈<span id="evBadge" class="badge story hidden">!</span>`; const dex = $("dexBtn"); hud.insertBefore(b, dex && dex.parentNode === hud ? dex : null);
  b.addEventListener("click", () => { N().sfx("click"); N().openPanel("event"); });
  return b;
}

// ---------- penanda hitung mundur ----------
// Banner #evPill: tampil HANYA 5 detik sejak PERTAMA kali muncul untuk tiap jenis kabar (kunci), lalu memudar halus. Pembaruan hitung mundur / data server tidak
// mengulang atau mereset waktunya. Jadwal, hitung mundur, hadiah, tombol ikut event tetap ada di menu ☰ → 🦈 Event Monster Legenda (panel selalu mutakhir).
const PILL_MS = 5000, FADE_MS = 600, pillSeen = {}; let pillTimer = 0;
function pill() {
  const el = $("evPill"); if (!el) return;
  const ev = E(), info = ev.info(), s = ev.status(), on = !!(info && info.on && s);
  const btn = ensureBtn(on);
  if (btn) { const bd = $("evBadge"); if (bd) bd.classList.toggle("hidden", !(on && (s.phase === "live" || ((s.phase === "upcoming" || s.phase === "ended") && s.msToStart <= 600000)))); }   // lencana ☰: live / sebentar lagi
  let txt = "", cls = "", key = "";
  if (on) {
    const m = EV().BY_ID[s.ev.monster], L = ev.locName(m.loc);
    if (s.phase === "live") { txt = `<b>🔴 LIVE</b>${s.ev.premiere ? " 🎉" : ""} ${esc(m.name)} · <b>${countdown(s.msLeft)}</b>`; cls = "live"; key = "live:" + s.ev.id; el.title = "Di " + L; }
    else if (s.phase === "closing") { txt = `Event ${esc(m.name)} selesai · menghitung juara…`; cls = "end"; key = "closing:" + s.ev.id; }
    else if (s.phase === "ended" && info.winner && ev.serverNow() < s.ev.close + 15 * 60000) { txt = `👑 Juara ${esc(m.name)}: <b>${esc(info.winner.name)}</b> · skor ${fmt(info.winner.score)}`; cls = "end"; key = "win:" + s.ev.id; }
    else if ((s.phase === "upcoming" || s.phase === "ended") && s.msToStart <= 24 * 3600000) {   // di antara dua event fase = "ended": hitung mundur ke event berikutnya
      const nx = s.phase === "ended" ? s.next : s.ev, nm = EV().BY_ID[nx.monster]; txt = `🌊 ${esc(nm.name)} muncul di ${esc(ev.locName(nm.loc))} · <b>${countdown(s.msToStart)}</b>`;
      cls = s.msToStart <= 600000 ? "soon" : ""; key = (s.msToStart <= 600000 ? "soon:" : "up:") + nx.id;
    }
  }
  const now = performance.now(); if (key && !(key in pillSeen)) pillSeen[key] = now;
  const age = key ? now - pillSeen[key] : Infinity, gone = age >= PILL_MS + FADE_MS, fade = age >= PILL_MS;
  const hide = !txt || gone || ev.active();
  if (txt && !gone && el.innerHTML !== txt) el.innerHTML = txt;
  el.className = "ev-pill" + (cls ? " " + cls : "") + (fade && !hide ? " fade" : "") + (hide ? " hidden" : "");
  clearTimeout(pillTimer); if (key && !gone) pillTimer = setTimeout(pill, (age < PILL_MS ? PILL_MS : PILL_MS + FADE_MS) - age + 30);
  const cd = $("evCount"); if (cd && on) cd.innerHTML = statusLine();
}
function statusLine() {
  const ev = E(), s = ev.status(), info = ev.info(); if (!s) return "";
  const m = EV().BY_ID[s.ev.monster];
  if (s.phase === "live") return `<span class="ev-live">🔴 LIVE</span> sisa <b>${countdown(s.msLeft)}</b>`;
  if (s.phase === "closing") return "Event selesai · menghitung juara…";
  if (s.phase === "upcoming") return `Mulai ${dateWIB(s.ev.start)} · 19.00 WIB · <b>${countdown(s.msToStart)}</b>`;
  return `Berikutnya: ${dateWIB(s.next.start)} · <b>${esc(EV().BY_ID[s.next.monster].name)}</b> · ${countdown(s.msToStart)}`;
}
function announce(text, big) {
  const a = $("evAnn"); if (!a) return;
  a.textContent = text; a.className = "ev-ann"; void a.offsetWidth; a.className = "ev-ann show" + (big ? " big" : "");
  clearTimeout(announce.t); announce.t = setTimeout(() => { a.className = "ev-ann"; }, big ? 5200 : 3800);
  if (big) { try { N().sfx("splash_besar", 1); } catch (e) { /* suara opsional */ } }
}

// ---------- HUD duel (memakai batang tegangan/jarak bawaan #fightUI) ----------
function duelHud(duel, m) {
  const fu = $("fightUI"); if (!fu) return;
  document.body.classList.toggle("ev-duel", !!duel);
  if (!duel) { fu.classList.add("hidden"); $("tensionBar").classList.remove("shake", "warn", "tired"); return; }
  fu.classList.remove("hidden");
  const mon = EV().BY_ID[duel.monster || (m && m.id)] || {}, d = duel.d;
  $("fightName").textContent = duel.status === "starting" ? `🌊 ${mon.name || "Monster"} menggigit umpan!` : `🌊 ${mon.name} · duel ${duel.n}/${EV().MAX_ATTEMPTS}`;
  if (!d) { $("tensionFill").style.width = "25%"; $("progressFill").style.width = "12%"; $("fightTip").textContent = "Menghubungi server…"; return; }
  const T = Math.min(d.T, 1), tired = d.k === 0 && d.tired > 0, tip = $("fightTip");
  $("tensionFill").style.width = (T * 100).toFixed(1) + "%"; $("progressFill").style.width = (d.P * 100).toFixed(1) + "%";
  $("tensionBar").classList.toggle("shake", T > 0.82); $("tensionBar").classList.toggle("warn", d.warn); $("tensionBar").classList.toggle("tired", tired);
  tip.textContent = duel.status === "finishing" ? (d.result === "caught" ? "Berhasil! Server sedang menilai duelmu…" : "Server sedang mencatat hasil…")
    : T > 0.82 ? "⚠️ Senar hampir putus — LEPAS!" : d.warn ? "⚡ Monster bersiap mengamuk — LEPAS!" : d.k === 1 ? "🔥 MENGAMUK! Lepas dulu sampai tenang" : d.k === 2 ? "🌀 Monster menyelam — tarik pelan: tahan sebentar, lepas" : tired ? "😮‍💨 Monster lelah — GULUNG!" : d.slack > 0.5 ? "Senar kendur — tahan lagi!" : "Tahan = gulung · Lepas = kendurkan · jaga di zona hijau";
  tip.classList.toggle("cue-warn", d.warn || d.k === 1 || T > 0.82); tip.classList.toggle("cue-tired", tired);
}

// ---------- kartu hasil duel (angka dari server) ----------
function result(r) {
  const card = $("evResult"), mon = EV().BY_ID[r.monster] || {}, caught = !!r.caught;
  const title = caught ? `🏆 ${esc(mon.name)} TAKLUK!` : r.result === "snap" ? "💥 Senar putus!" : r.result === "slack" ? "🌀 Senar kendur, monster lepas…" : r.result === "hangus" ? "⌛ Duel kedaluwarsa" : "⏱️ Waktu habis, monster kabur…";
  const my = E().my(), left = my ? my.left : null;
  card.innerHTML = `<div class="ev-card ${caught ? "win" : "lose"}"><canvas id="evResCv" width="300" height="130"></canvas><h3>${title}</h3>
    ${caught ? `<div class="ev-score">Skor <b>${fmt(r.score)}</b></div>${r.leading ? `<p class="ev-lead">👑 Kamu sedang memimpin untuk juara event ini!</p>` : `<p class="ev-sub">Skor terbaikmu dicatat server. Juara diumumkan setelah 19.20 WIB.</p>`}` : `<p class="ev-sub">Kemajuan ${Math.round((r.score / 400) * 100)}%. Coba lagi — lepas saat aba-aba ⚡.</p>`}
    <ul>${r.paid && r.paid.part ? `<li>🎁 Hadiah partisipasi <b>+${fmt(r.paid.part)}</b> koin</li>` : ""}${r.paid && r.paid.catch ? `<li>🪙 Hadiah menaklukkan <b>+${fmt(r.paid.catch)}</b> koin</li>` : ""}${caught ? `<li>🏅 Trofi ${esc(mon.name)} masuk koleksimu</li>` : ""}</ul>
    <p class="ev-sub">${left === null ? "" : left > 0 ? `Sisa kesempatan: <b>${left}</b> dari ${EV().MAX_ATTEMPTS}` : "Kesempatanmu di event ini sudah habis."}</p><button class="ev-ok" id="evResOk">Tutup</button></div>`;
  card.classList.remove("hidden"); const cv = $("evResCv"); if (cv && NW.eventDraw) NW.eventDraw.icon(cv, r.monster, { t: 0.8 });
  $("evResOk").addEventListener("click", () => { card.classList.add("hidden"); N().sfx("click"); });
}

// ---------- panel event ----------
function render() {
  const ev = E(), info = ev.info(), s = ev.status(), my = ev.my(), C = EV();
  if (!info) return `<p class="ev-note">Menghubungi server untuk jadwal event…</p>`;
  if (!info.on || !s) return `<p class="ev-note">🦈 <b>Event 5 Monster Legenda</b> belum dibuka. Pantau terus — setiap Minggu malam 19.00–19.20 WIB, satu monster raksasa muncul!</p>`;
  const cur = s.phase === "ended" ? s.next : s.ev, m = C.BY_ID[cur.monster], li = ev.locIndex(m.loc), L = LOCATIONS[li], here = ev.here(m.id);
  const live = s.phase === "live" && cur.id === s.ev.id, rw = m.rw;
  const sailOk = N().canSail(li), boatName = typeof UPGRADES !== "undefined" && UPGRADES.boat && UPGRADES.boat.levels ? UPGRADES.boat.levels[L.boat - 1] : "kapal lebih besar";
  const logged = ev.ecoOn();
  let act;
  if (!live) act = `<button class="ev-btn ghost" disabled>Menunggu 19.00 WIB…</button>`;
  else if (!logged) act = `<p class="ev-warn">🔐 Masuk dengan akun Google (profil 👤) agar duel berhadiah tercatat server. Tanpa akun kamu tetap bisa menonton monsternya.</p>`;
  else if (my && my.left <= 0) act = `<p class="ev-warn">Kesempatanmu di event ini habis. Tunggu ${esc(C.BY_ID[s.next.monster].name)} minggu depan!</p>`;
  else if (here) act = `<p class="ev-ok-note">✅ Kamu sudah di ${esc(L.name)}. Lempar kail dekat monster — tunggu ia mendekati umpan!</p>`;
  else if (!sailOk && ev.passAvailable(m.id)) act = `<button class="ev-btn" data-act="evpass">🎟️ Ikut Event (akses khusus) → ${esc(L.name)}</button><p class="ev-sub">Tiket event membawamu ke ${esc(L.name)} hanya untuk menantang monster ini. Memancing biasa di sana tetap butuh ${esc(boatName)}; setelah event kamu dikembalikan ke lokasi semula.</p>`;
  else if (!sailOk) act = `<button class="ev-btn ghost" disabled>🔒 Butuh ${esc(boatName)} untuk ke ${esc(L.name)}</button>`;
  else act = `<button class="ev-btn" data-act="go" data-arg="${li}">⛵ Menuju ${esc(L.name)}</button>${m.loc === "ampat" || m.loc === "banda" ? "" : `<p class="ev-sub">Setelah tiba, jalan ke dermaga lalu mulai memancing.</p>`}`;
  const tro = (logged && NW.eco.state() && NW.eco.state().troph) || {};
  const slots = C.MONSTERS.map((x) => {
    const t = tro[x.id], tier = t ? (t.champ > 0 ? "👑 Juara" + (t.champ > 1 ? " ×" + t.champ : "") : t.caught > 0 ? "🏆 Penakluk" : "👁️ Saksi") : "",
      cls = t ? (t.champ > 0 ? "gold" : t.caught > 0 ? "got" : "seen") : "lock";
    return `<div class="ev-slot ${cls}"><canvas data-mon="${x.id}" data-lock="${t ? 0 : 1}" width="150" height="64"></canvas><b>${t ? esc(x.name) : "???"}</b><small>${t ? esc(kgText(x.kg)) + " · " + tier + (t.best ? " · " + fmt(t.best) : "") : esc(kgText(x.kg)) + " · " + esc(ev.locName(x.loc))}</small></div>`;
  }).join("");
  const sched = []; for (let w = cur.week, i = 0; i < 5; i++, w++) { const e = C.eventOf(w, info.anchor), x = C.BY_ID[e.monster]; sched.push(`<li${i === 0 ? ' class="now"' : ""}><span>${dateWIB(e.start).replace(/^[A-Za-z]+, /, "")}</span><b>${esc(x.name)}</b><small>${esc(ev.locName(x.loc))}</small></li>`); }
  const win = info.winner ? `<div class="ev-win">👑 Juara terakhir (${esc(C.BY_ID[info.winner.monster].name)}, ${esc(info.winner.date)}): <b>${esc(info.winner.name)}</b> · skor ${fmt(info.winner.score)}</div>` : "";
  const mine = my && live ? `<p class="ev-sub">Kesempatanmu: <b>${my.left}</b> dari ${C.MAX_ATTEMPTS}${my.best ? ` · skor terbaikmu <b>${fmt(my.best)}</b>` : ""}</p>` : "";
  return `<div class="ev-hero"><canvas id="evHeroCv" data-mon="${m.id}" width="320" height="140"></canvas><div class="ev-hero-t"><b>${esc(m.name)}</b><small>${esc(m.title)} · ${esc(kgText(m.kg))}</small></div></div>${cur.premiere ? `<div class="ev-prem">🎉 <b>PEMBUKAAN PUBLIK</b> — monster spesial perdana! Semua pemain berakun boleh ikut lewat akses event khusus.</div>` : ""}
    <p class="ev-blurb">${esc(m.blurb)}</p><div class="ev-count" id="evCount">${statusLine()}</div>
    <div class="ev-loc">📍 ${esc(L.name)}${sailOk ? "" : ` <small>(🔒 ${esc(boatName)})</small>`}</div>${mine}${act}${win}
    <h4>🎁 Hadiah</h4><ul class="ev-rw"><li>Ikut duel (sekali per event): <b>+${fmt(rw.part)}</b> koin</li><li>Menaklukkan monster (sekali): <b>+${fmt(rw.catch)}</b> koin + trofi</li><li>👑 Juara tunggal (skor tertinggi di seluruh pemain): <b>+${fmt(rw.win)}</b> koin</li></ul>
    <p class="ev-sub">Hasil duel dinilai SERVER dari catatan tombolmu — bukan pengakuan browser. ${C.MAX_ATTEMPTS} kesempatan per event.</p>
    <h4>🏅 Koleksi Monster</h4><div class="ev-slots">${slots}</div><h4>📅 Jadwal berikutnya</h4><ul class="ev-sched">${sched.join("")}</ul>`;
}
let lastAfter = 0;
function after(body) {
  body.querySelectorAll("canvas[data-mon]").forEach((cv) => { if (NW.eventDraw) NW.eventDraw.icon(cv, cv.dataset.mon, { t: 0.7, locked: cv.dataset.lock === "1" }); });
  const hero = $("evHeroCv"); if (hero && NW.eventDraw) { const draw = () => { if (!document.body.contains(hero)) return; NW.eventDraw.icon(hero, hero.dataset.mon, { t: performance.now() / 1000 }); requestAnimationFrame(draw); }; draw(); }   // monster di panel ikut berenang
  const ev = E(); const n = Date.now(); if (n - lastAfter > 15000) { lastAfter = n; ev.fetchInfo && ev.fetchInfo(); ev.fetchMy(true); }   // dibatasi: fetch → onChange → render → after tidak boleh berputar
}
function act(a, arg) { if (a === "evpass") E().passGo(); /* "go" ditangani game.js: travel(+arg) */ }
function hook() { build(); if (N().registerPanel) N().registerPanel("event", { title: () => "🦈 Event Monster Legenda", render, act, after }); E().onChange(() => { pill(); if (N().currentPanel() === "event") { const ae = document.activeElement; if (!ae || ae.tagName !== "BUTTON") N().renderPanel(); } }); pill(); }

NW.eventUI = { hook, pill, announce, duelHud, result, render, countdown };
})();
