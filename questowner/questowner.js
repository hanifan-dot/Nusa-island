// =========================================================
//  NUSA ISLAND — Quest Owner (sisi game). Modul: NW.quest
//  • Dua quest sosial: Follow Instagram (25.000 koin) & Join Grup WhatsApp (Joran WhatsApp). Aturan, tautan, dan hadiah ada di economy/quest-core.js.
//  • KEPUTUSAN ada di SERVER ekonomi (ecoQuestOpen/ecoQuestClaim): waktu buka dicatat jam server, klaim hanya setelah pemain pergi >= 12 detik,
//    SEKALI per akun, koin langsung ke dompet utama. Klien tidak mengirim jumlah/hadiah/waktu. Tanpa login Google + server ekonomi aktif, klaim DIMATIKAN
//    (bukan disimulasikan), sama seperti Login Streak.
//  • Follow/join tidak bisa diverifikasi dari game web: ini disampaikan jujur di panel. Yang dijaga: satu hadiah per akun, tidak bisa di-spam.
//  • Joran WhatsApp: kepemilikan dari buku server (disalin ke S.questOwner.rod; bila server memuat dan tidak mengakui, salinan lokal dibuang).
//    Batas angkat 100 kg, partikel hijau saat dibawa/dipakai/mancing (Efek Rendah/Sedang/Tinggi mengikuti pengaturan Pancing Aurora bila ada).
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const Q = NW.QuestCore = NW.QuestCore || window.NusaQuestCore;
if (!Q) return;
const N = () => window.Nusa;
const S = () => N().S;
const SPEC = { blank: "#1f9d55", w: 3.2, grip: "#14532d", gripLen: 0.36, reel: { col: "#b9f6ca", r: 3.2 }, node: false, accent: { kind: "wa", col: "#5dff9a" }, name: "Joran WhatsApp" };
const CAP = [24, 56, 110];

// ---------- simpanan (S.questOwner) ----------
function migrate(s) {
  const t = s.questOwner = s.questOwner && typeof s.questOwner === "object" ? s.questOwner : {};
  t.v = 1; t.rod = t.rod === true; t.equip = t.equip !== false;
  t.doneUid = typeof t.doneUid === "string" ? t.doneUid : "";
}
const t_ = () => { const s = S(); if (!s.questOwner) migrate(s); return s.questOwner; };

// ---------- status ----------
const R = { doc: null, loaded: false, loading: false, busy: {}, error: "", listeners: [], offset: 0, lastErr: "", justDone: false };
const emit = () => R.listeners.forEach((f) => { try { f(); } catch (e) {} });
const api = () => NW.shopApi;
const rid = () => "Q" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36) + Math.floor(Math.random() * 1e9).toString(36);
const serverNow = () => Date.now() + R.offset;
const uid = () => { const a = api(); try { return a && a.uid ? a.uid() : null; } catch (e) { return null; } };
function access() {
  const eco = NW.eco;
  if (eco && eco.active && eco.active()) return { ok: true };
  const a = api(), signed = !!(a && a.live && !a.sim && !(a.isGuest && a.isGuest()));
  if (!signed) return { ok: false, why: "login", msg: "Masuk dengan Google dulu agar hadiah quest tersimpan di akunmu. Tautan tetap bisa dibuka." };
  return { ok: false, why: "server", msg: "Menghubungkan ke server hadiah… Coba lagi sebentar lagi." };
}
function seen(r) {
  if (!r) return;
  if (Number.isFinite(r.now)) R.offset = r.now - Date.now();
  if (r.doc) { R.doc = r.doc; R.loaded = true; }
  try { if (NW.eco && NW.eco.applyState && NW.eco.active() && r.balance !== undefined) NW.eco.applyState(r); } catch (e) {}
  syncOwnership();
}
function syncOwnership() {              // salinan lokal mengikuti buku server (idempotent)
  if (!R.loaded) return;
  const t = t_(), has = Q.entry(R.doc, "wa").c > 0, u = uid();
  let ch = false;
  const eq = Q.eqOn(R.doc);
  if (has && !t.rod) { t.rod = true; t.equip = eq; ch = true; }
  if (has && t.equip !== eq) { t.equip = eq; ch = true; }          // status Pakai/Lepaskan mengikuti SERVER (ganti perangkat)
  if (!has && t.rod) { t.rod = false; ch = true; }          // salinan lokal tanpa bukti server (mis. simpanan diubah) → dibuang
  if (u && Q.allDone(R.doc) && t.doneUid !== u) { t.doneUid = u; ch = true; }
  if (ch) { try { N().save(); N().refreshHUD(); } catch (e) {} }
}
const errText = (e) => {
  const c = e && e.code ? String(e.code) : "", m = (e && e.message) || "";
  if (c === "failed-precondition" && m) return m;
  if (c === "unavailable" || c === "deadline-exceeded" || /network|offline|fetch/i.test(m)) return "Tidak ada koneksi ke server. Coba lagi saat online.";
  if (c === "unauthenticated") return "Masuk dulu dengan akun Google.";
  return "Gagal menghubungi server. Coba lagi sebentar lagi.";
};
let qFail = 0, qAt = 0;
const bo = (n, base) => Math.min(300000, base * Math.pow(2, Math.min(n, 8)));   // HEMAT KUOTA: jeda coba-ulang membesar saat server gagal (maks 5 menit), kembali normal begitu berhasil
async function refresh() {
  const acc = access(); if (!acc.ok) { badge(); emit(); return view(); }
  if (R.loading) return view(); R.loading = true; R.error = ""; emit();
  try { seen(await api().eco("ecoQuestState", {})); qFail = 0; qAt = 0; } catch (e) { R.error = errText(e); qFail++; qAt = Date.now() + bo(qFail, 4000); }
  R.loading = false; badge(); emit(); return view();
}
function view() {
  const acc = access(), now = serverNow(), items = Q.IDS.map((id) => {
    const q = Q.QUESTS[id], e = Q.entry(R.doc, id), st = R.loaded ? Q.status(R.doc, id, now) : "belum";
    return Object.assign({ st, e, waitMs: e.o && !e.c ? Math.max(0, Q.MIN_AWAY_MS - (now - e.o)) : 0, busy: !!R.busy[id] }, q);
  });
  return { access: acc, loaded: R.loaded, loading: R.loading, error: R.error, items, done: R.loaded ? Q.claimedCount(R.doc) : 0, total: Q.IDS.length, allDone: R.loaded && Q.allDone(R.doc) };
}

// ---------- aksi ----------
const sfx = (n) => { try { N().sfx(n); } catch (e) {} };
const toast = (m, k) => { try { N().toast(m, k); } catch (e) {} };
/** Dipanggil LANGSUNG dari klik (agar tidak diblok pop-up). Membuka tautan, lalu mencatat waktu buka di server. */
function open(id) {
  const q = Q.QUESTS[id]; if (!q) return false;
  let w = null; try { w = window.open(q.url, "_blank"); if (w) w.opener = null; } catch (e) {}          // (fitur "noopener" selalu mengembalikan null, jadi dimatikan manual)
  if (!w) { try { location.assign(q.url); } catch (e) {} }          // pop-up diblok / WebView tanpa window.open → buka di tab ini (progres tersimpan di server)
  R.opened = id; toast("🔗 Tautan " + q.short + " dibuka. Selesaikan, lalu kembali ke game untuk klaim.", "good");
  const acc = access(); if (!acc.ok) { emit(); return true; }
  api().eco("ecoQuestOpen", { q: id }).then((r) => { seen(r); badge(); emit(); }).catch((e) => { R.error = errText(e); emit(); });
  return true;
}
async function claim(id) {
  const q = Q.QUESTS[id]; if (!q || R.busy[id]) return { busy: true };
  const acc = access(); if (!acc.ok) { toast(acc.msg, "bad"); return { error: acc.msg }; }
  R.busy[id] = true; R.error = ""; emit();
  const pend = (R.pend = R.pend || {}); pend[id] = pend[id] || rid();          // opId sama bila diulang saat jaringan putus
  try {
    const r = await api().eco("ecoQuestClaim", { q: id, opId: pend[id] }); delete pend[id];
    seen(r); R.busy[id] = false;
    if (r.already) { toast("Hadiah ini sudah pernah diklaim.", ""); }
    else { sfx("coin"); toast(id === "ig" ? "🪙 +25.000 koin masuk ke dompetmu!" : "🎣 Joran WhatsApp masuk ke Tasmu! Aktifkan di panel ini atau Toko → Joran.", "good"); if (id === "wa") toast("✨ Item berhasil masuk ke Tas", "good"); }
    if (Q.allDone(R.doc)) { R.justDone = true; toast("🎉 Semua Quest Owner selesai! Terima kasih sudah bergabung.", "good"); setTimeout(() => { R.justDone = false; badge(); emit(); try { if (N().currentPanel() === "questowner") N().closePanel(); } catch (e) {} }, 4200); }
    badge(); emit(); return { ok: true, id };
  } catch (e) {
    R.busy[id] = false; R.error = errText(e); if (e && e.code !== "unavailable") delete pend[id];
    toast(R.error, "bad"); try { seen(await api().eco("ecoQuestState", {})); } catch (e2) {} badge(); emit(); return { error: R.error };
  }
}
async function setEquip(on) {
  const t = t_(); if (!t.rod || R.eqBusy) return false; on = !!on;
  const acc = access(); if (!acc.ok) { toast(acc.msg, "bad"); return false; }          // status sah ada di server → perlu terhubung
  R.eqBusy = true;
  try { const r = await api().eco("ecoQuestEquip", { on, opId: rid() }); seen(r); toast(on ? "🎣 Joran WhatsApp dipakai" : "Joran WhatsApp dilepas", "good"); R.eqBusy = false; emit(); return true; }
  catch (e) { R.eqBusy = false; toast(errText(e), "bad"); emit(); return false; }
}
const bagCard = () => {
  if (!rodOwned()) return ""; const on = rodOn();
  return `<div class="bg-card"><div class="bg-ic" style="background:linear-gradient(135deg,#1f9d55,#5dff9a)"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 27 25 5" stroke="#eafff2" stroke-width="2.6" stroke-linecap="round"/><circle cx="25" cy="5" r="2.4" fill="#5dff9a"/></svg></div><div><div class="bg-h">Joran WhatsApp <span class="bg-tag ${on ? "use" : ""}">${on ? "Sedang dipakai" : "Dimiliki"}</span></div><div class="bg-s">Hadiah Quest Owner. Angkat sampai 100 kg (diverifikasi server) + partikel hijau. Dilepas ≠ hilang; hak milik permanen.</div><button class="bg-b ${on ? "ghost" : ""}" data-act="qoBagEquip" data-arg="${on ? "0" : "1"}">${on ? "Lepaskan" : "Pakai"}</button></div></div>`;
};

// ---------- joran ----------
const rodOwned = () => t_().rod === true;
const rodOn = () => rodOwned() && t_().equip !== false;
const visualOn = () => rodOn() && !(NW.aurora && NW.aurora.equipped && NW.aurora.equipped());      // Pancing Aurora (berbayar) menang secara visual bila keduanya dipakai
const rodSpec = () => (visualOn() ? SPEC : null);
const capFloor = () => (rodOn() ? Q.ROD.capKg : 0);
let level = 1;
try { const v = localStorage.getItem("nusa_aur_fx"); level = v !== null && /^[012]$/.test(v) ? +v : (window.matchMedia && matchMedia("(pointer: coarse)").matches ? 1 : 2); } catch (e) {}
const lvl = () => (NW.aurora && NW.aurora.level ? NW.aurora.level() : level);

// ---------- partikel hijau ----------
const P = []; let lastT = 0; const rnd = (a, b) => a + Math.random() * (b - a);
function spawn(x, y, n, o) {
  const cap = CAP[lvl()]; o = o || {};
  for (let i = 0; i < n && P.length < cap; i++) P.push({ x: x + rnd(-3, 3), y: y + rnd(-3, 3), vx: (o.vx || 0) + rnd(-1, 1) * (o.sp || 40), vy: (o.vy || 0) + rnd(-1, 1) * (o.sp || 40) - (o.up || 0), life: 0, max: rnd(0.5, 1.1) * (o.l || 1), r: rnd(1.2, 3), c: Math.random() < 0.3 ? "#eaffd9" : Math.random() < 0.5 ? "#5dff9a" : "#2fd16b" });
}
function event(kind, pos) {
  if (!visualOn() || !pos) return;
  const L = lvl(), n = [[4, 8, 14], [6, 12, 20], [3, 6, 10]];
  if (kind === "cast") spawn(pos.x, pos.y, n[0][L], { sp: 70, up: 20 });
  else if (kind === "land") spawn(pos.x, pos.y, n[1][L], { sp: 90, up: 110, l: 1.1 });
  else if (kind === "bite") spawn(pos.x, pos.y, n[2][L], { sp: 55, up: 60 });
  else if (kind === "reel") spawn(pos.x, pos.y, n[0][L] + 2, { sp: 60 });
}
function drawParticles(c) {
  if (!P.length) return;
  const now = performance.now() / 1000, dt = Math.min(0.05, lastT ? now - lastT : 0.016); lastT = now;
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.life += dt; if (p.life >= p.max) { P.splice(i, 1); continue; }
    const k = 1 - p.life / p.max; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; c.globalAlpha = k; c.fillStyle = p.c;
    c.beginPath(); c.arc(p.x, p.y, p.r * (0.6 + k), 0, 7); c.fill();
  }
  c.restore();
}
// cahaya hijau + percikan yang mengitari ujung joran saat dipakai memancing (layar mancing)
function rodFx(c, tip, U, t, lv) {
  lv = lv === undefined ? lvl() : lv; t = t === undefined ? performance.now() / 1000 : t; U = U || 1;
  c.save(); c.globalCompositeOperation = "lighter";
  const g = c.createRadialGradient(tip.x, tip.y, 1, tip.x, tip.y, (13 + 5 * lv) * U); g.addColorStop(0, "rgba(120,255,170,.7)"); g.addColorStop(0.55, "rgba(40,200,110,.28)"); g.addColorStop(1, "rgba(30,160,90,0)");
  c.globalAlpha = 0.75 + 0.25 * Math.sin(t * 3); c.fillStyle = g; c.beginPath(); c.arc(tip.x, tip.y, (13 + 5 * lv) * U, 0, 7); c.fill();
  c.fillStyle = "#c9ffdd";
  for (let i = 0; i < 2 + lv * 2; i++) { const a = t * 1.5 + i * (6.283 / (2 + lv * 2)), r = (9 + 3 * Math.sin(t * 2 + i)) * U, x = tip.x + Math.cos(a) * r, y = tip.y + Math.sin(a) * r * 0.65 - ((t * 20 + i * 7) % 12) * U * 0.3, s = (1.1 + 0.7 * Math.abs(Math.sin(t * 3 + i))) * U; c.globalAlpha = 0.85; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
  c.restore();
}
// ornamen di batang joran (dipanggil look.js untuk accent.kind === "wa"): pita hijau + percikan bergerak, juga saat dibawa di dunia
function rodAccent(c, bez, nrm, U, night) {
  c.save(); c.lineCap = "round"; const t = performance.now() / 1000;
  for (let i = 0; i < 5; i++) { const t0 = 0.14 + i * 0.16, p = bez(t0), n = nrm(t0), col = i % 2 ? "#7dffb0" : "#2fd16b"; c.strokeStyle = night ? night(col) : col; c.lineWidth = 2 * U; c.beginPath(); c.moveTo(p[0] - n[0] * 2.4 * U, p[1] - n[1] * 2.4 * U); c.lineTo(p[0] + n[0] * 2.4 * U, p[1] + n[1] * 2.4 * U); c.stroke(); }
  if (lvl() > 0) { c.globalCompositeOperation = "lighter"; c.fillStyle = "#b9ffd2"; for (let i = 0; i < 2 + lvl(); i++) { const k = ((t * 0.5 + i * 0.37) % 1), p = bez(0.3 + 0.65 * ((i * 0.31 + t * 0.12) % 1)); c.globalAlpha = 0.9 * (1 - k); c.beginPath(); c.arc(p[0] + Math.sin(t * 3 + i) * 2 * U, p[1] - k * 7 * U, 1.3 * U, 0, 7); c.fill(); } }
  c.restore();
}

// ---------- ikon SVG gulungan misi emas + bintang (pengganti emoji) ----------
let iconSeq = 0;
function icon(size) {
  const k = "qoi" + (++iconSeq), n = size || 24;
  return `<svg class="qo-ico" viewBox="0 0 32 32" width="${n}" height="${n}" aria-hidden="true" focusable="false"><defs>
<linearGradient id="${k}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".55" stop-color="#f5c542"/><stop offset="1" stop-color="#b9831a"/></linearGradient>
<linearGradient id="${k}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe6"/><stop offset="1" stop-color="#f0dca0"/></linearGradient>
<radialGradient id="${k}s" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#fff9d6"/><stop offset="1" stop-color="#e8a317"/></radialGradient></defs>
<rect x="7" y="6.5" width="18" height="19" rx="2" fill="url(#${k}p)" stroke="#b9831a" stroke-width="1"/>
<rect x="4" y="4.2" width="24" height="4.6" rx="2.3" fill="url(#${k}g)" stroke="#8a5a0e" stroke-width=".9"/>
<rect x="4" y="23.2" width="24" height="4.6" rx="2.3" fill="url(#${k}g)" stroke="#8a5a0e" stroke-width=".9"/>
<circle cx="4.9" cy="6.5" r="1.1" fill="#8a5a0e" opacity=".55"/><circle cx="27.1" cy="6.5" r="1.1" fill="#8a5a0e" opacity=".55"/><circle cx="4.9" cy="25.5" r="1.1" fill="#8a5a0e" opacity=".55"/><circle cx="27.1" cy="25.5" r="1.1" fill="#8a5a0e" opacity=".55"/>
<path d="M16 9.6l1.9 3.9 4.3.6-3.1 3 .75 4.2L16 19.2l-3.85 2.1.75-4.2-3.1-3 4.3-.6z" fill="url(#${k}s)" stroke="#a8700f" stroke-width=".8" stroke-linejoin="round"/>
<path d="M10.5 11.2h2M19.5 11.2h2" stroke="#c9a24a" stroke-width=".9" stroke-linecap="round" opacity=".7"/></svg>`;
}

// ---------- lencana & tombol HUD ----------
function badge() {
  const btn = document.getElementById("questBtn"); if (!btn) return;
  const u = uid(), t = t_(), v = view();
  const finished = (v.loaded && v.allDone && !R.justDone) || (!!u && t.doneUid === u && !R.justDone);
  btn.classList.toggle("hidden", finished);                         // semua selesai: tombol hilang; data & hadiah tetap
  const b = document.getElementById("questBadge"); if (b) b.classList.toggle("hidden", finished || (v.loaded && v.done >= v.total));
  btn.setAttribute("data-progress", v.loaded ? v.done + "/" + v.total : "");
  const pg = document.getElementById("questProg"); if (pg) { const txt = v.loaded ? v.done + "/" + v.total : "0/" + v.total; if (pg.textContent !== txt) pg.textContent = txt; }
  btn.setAttribute("aria-label", "Quest Owner: progres " + (v.loaded ? v.done : 0) + " dari " + v.total);
}
function hook() {
  migrate(S());
  const dex = document.getElementById("dexBtn"), hr = document.querySelector(".hud-right");
  if (hr && !document.getElementById("questBtn")) {
    // Tombol HUD mandiri (BUKAN .icon-btn → tidak ikut disembunyikan/ditarik ke menu ☰): berdampingan dengan ☰ di kanan atas
    const b = document.createElement("button"); b.type = "button"; b.className = "chip qo-btn qo-hud"; b.id = "questBtn"; b.setAttribute("aria-label", "Quest Owner: hadiah spesial");
    b.innerHTML = `${icon(24)}<span id="questProg" class="qo-prog">0/2</span><span id="questBadge" class="badge story qo-dot">!</span>`;
    const menuBtn = document.getElementById("hudMenuBtn");
    if (menuBtn && menuBtn.parentNode === hr) hr.insertBefore(b, menuBtn); else hr.appendChild(b);
    b.addEventListener("click", () => { sfx("click"); N().openPanel("questowner"); });
  }
  if (NW.questUI) NW.questUI.register();
  badge(); refresh();
  document.addEventListener("visibilitychange", () => { if (document.hidden) return; const was = R.opened; refresh().then(() => { if (was) { R.opened = null; const v = view(); const it = v.items.find((x) => x.id === was); if (it && it.st !== "klaim" && it.e.o) toast("👋 Selamat datang kembali! " + (it.st === "selesai" ? "Hadiah " + it.short + " siap diklaim." : "Tunggu sebentar lalu klaim hadiahnya."), "good"); } }); });
  window.addEventListener("focus", () => { if (R.opened) refresh(); });
  if (NW.cloud && NW.cloud.onChange) NW.cloud.onChange(() => { refresh(); });
  setInterval(() => { if (!document.hidden) { if (!R.loaded && !R.loading && Date.now() >= qAt && access().ok) refresh(); badge(); } }, 4000);
}
// Baris "Joran WhatsApp" di Toko → Joran (tetap ada walau panel Quest sudah hilang), + delegasi klik Pakai/Lepaskan
function rodRowHTML() {
  if (!rodOwned()) return "";
  const on = rodOn();
  return `<div class="rod-card qo-rodrow ${on ? "cur" : ""}"><div class="qo-rodic">🎣</div><div class="grow"><div class="nm">${Q.ROD.name} ${on ? `<span class="rod-tag on">✔ Dipakai</span>` : ""}</div>
    <div class="sub">Hadiah Quest Owner · angkat sampai ${Q.ROD.capKg} kg · partikel hijau · milik permanen</div></div>
    <button class="btn small ${on ? "" : "gold"}" data-qo-equip="${on ? "0" : "1"}">${on ? "Lepaskan" : "Pakai"}</button></div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target && e.target.closest ? e.target.closest("[data-qo-equip]") : null; if (!b) return;
  e.preventDefault(); sfx("click"); Promise.resolve(setEquip(b.getAttribute("data-qo-equip") === "1")).then(() => { try { N().renderPanel(); } catch (x) {} });
});

NW.quest = { icon, _particles: () => P.length, Core: Q, SPEC, migrate, hook, view, refresh, open, claim, access, setEquip, rodOwned, rodOn, rodSpec, capFloor, visualOn, event, drawParticles, rodFx, rodAccent, rodRowHTML, bagCard,
  onChange: (f) => R.listeners.push(f), _state: R };
})();
