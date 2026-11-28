// NUSA ISLAND — "Panggilan Darurat Nusa — SAR Laut" (PROTOTIPE) · klien. DIMUAT HANYA bila window.NUSA_SAR === true (bawaan MATI) DAN NusaPhone menyala dari server.
// Misi pribadi (bukan misi bersama): korban/petugas hanya tampil di klien pemain yang menerimanya; tidak ada permintaan jaringan, tidak ada polling Firestore.
// Waktu = jam server multiplayer yang sudah ada (NW.mp._serverNow) dengan pengganti monoton performance.now; tanpa jam tepercaya → tidak menawarkan misi (gagal-aman).
// Hadiah hanya lencana + catatan SAR. Kabut = lapisan visual sendiri (tidak menyentuh NW.weather → peluang ikan tidak berubah).
(function () {
"use strict";
const K = window.NusaSarCore, NW = (window.NW = window.NW || {}), C = K.C;
const N = () => window.Nusa, $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const AREA = "selat", OFFICER = { x: 12.4, y: 20.4 };
const SPOTS = [[13.0, -1.6], [12.2, -0.4], [13.6, 0.8], [11.4, -2.6], [12.6, 2.0]];   // air di timur-laut mercusuar (Pelabuhan Selat); dipilih yang muat lambung
const SPOT_A = -2.3, FOG_MAX = 0.34, FOG_RAMP_MS = 4 * 60000;
const ses = { activeMs: 0, called: false, lastInput: -1e9, whistleT: 0 };   // sesi = satu kali muat halaman (tidak disimpan)
const sv = { spot: null, loadFail: false, view: null, card: null, hintEl: null, cardEl: null, anchor: null, started: false, msg: "" };

// ---------- jam tepercaya ----------
function trustedNow() {
  try { const mp = NW.mp; if (mp && mp._clock && mp._clock.have && typeof mp._serverNow === "function") { const v = mp._serverNow(); if (Number.isFinite(v)) { sv.anchor = { srv: v, perf: performance.now() }; return Math.floor(v); } } } catch (e) { /* jatuh ke pengganti */ }
  return sv.anchor ? Math.floor(sv.anchor.srv + (performance.now() - sv.anchor.perf)) : null;
}
const S = () => N().S;
const st = () => { const s = S(); if (!s) return K.fresh(); if (!s.sar || s.sar.v !== 1) s.sar = K.migrate(s.sar, trustedNow()); return s.sar; };
function commit(next) { S().sar = next; try { N().save(); } catch (e) { /* simpan gagal: state tetap di memori */ } refresh(); }
const m = () => st().m;
const active = () => { const x = m(); return x && x.phase === "active" ? x : null; };
const area = () => NW.areas && NW.areas.get(AREA);
const inSelat = () => !!(NW.areas && NW.areas.cur && NW.areas.cur.id === AREA);
const enabled = () => window.NUSA_SAR === true && !!(NW.phone && NW.phone.srvOn && NW.phone.srvOn());
const pname = () => { try { return (S().profile && S().profile.name) || (NW.cloud && NW.cloud.user && NW.cloud.user.displayName) || "Pemain"; } catch (e) { return "Pemain"; } };

// ---------- kegiatan terlarang (penundaan tidak menghabiskan jatah) ----------
function canSailSelat() { try { const a = area(); return !!(a && NW.boat && N().canSail(a.locIndex)); } catch (e) { return false; } }
function busyFlags() {
  const n = N(), w = NW.world || {}, room = NW.room && NW.room.active;
  return {
    cine: !!w.cine || !!(NW.adv && NW.adv.isBusy && NW.adv.isBusy()) || !(n.isStarted && n.isStarted()), dialog: !!w.dialogOpen || !!(w.isBusy && w.isBusy()),
    fishing: n.mode() !== "world", home: !!(NW.home && NW.home.active), shop: !!(n.isPanelOpen && n.isPanelOpen()), kedai: !!room, dapur: false,
    cloud: !!(NW.cloud && NW.cloud.status === "syncing"), noboat: !canSailSelat(),
  };
}

// ---------- ketukan 1 detik: hitung waktu aktif, kedaluwarsa, tawaran ----------
function tick() {
  try {
    const dl = $("dlg"); if (dl && dl.classList.contains("sar-dlg") && dl.classList.contains("hidden")) dl.classList.remove("sar-dlg");
    if (!enabled() || !N().isStarted()) return;
    const po = !!(NW.phone && NW.phone.isOpen && NW.phone.isOpen()); if (po && !sv.phoneWasOpen) restoreInbox(); sv.phoneWasOpen = po;
    const now = trustedNow(), t = performance.now();
    if (document.visibilityState === "visible" && t - ses.lastInput < 60000) ses.activeMs += 1000;   // "bermain aktif": layar terlihat + ada sentuhan/tombol dalam 60 dtk terakhir
    const ex = K.expire(st(), now);
    if (ex.changed) { commit(ex.st); closeWorldBits(); N().toast("🛟 " + ex.msg, "bad"); if (NW.phone) NW.phone.notify({ id: "sar:x:" + (ex.st.m ? ex.st.m.offeredAt : 0) + ":" + (ex.st.m ? ex.st.m.phase : ""), icon: "🛟", title: "Misi SAR ditutup", text: ex.msg, app: "sar" }); }
    if (active()) { stepMission(now); return; }
    const r = K.offer(st(), { now, activeMs: ses.activeMs, sessionCalled: ses.called, busy: K.busyReason(busyFlags()) });
    if (r.ok) ring(r);
  } catch (e) { /* SAR tidak boleh mengganggu permainan */ }
}
function ring(r) {   // berdering TEPAT SEKALI per sesi (ses.called) — tidak ada pengulangan
  ses.called = true; commit(r.st);
  if (NW.phone) NW.phone.notify(r.note);
  try { N().sfx("misi_baru"); } catch (e) { /* senyap */ }
}
// pulihkan kotak masuk setelah muat ulang: tawaran masih menunggu → catatan kembali di NusaPhone TANPA bunyi/notifikasi kecil
function restoreInbox() {
  const x = m(); if (!x || x.phase !== "offer" || !NW.phone) return;
  NW.phone.notify(Object.assign({}, K.offerNote(x.id), { quiet: true }));
}

// ---------- misi ----------
function resolveSpot() {
  sv.spot = null; sv.loadFail = false;
  try {
    const ar = area(); if (!ar || !NW.boat || !NW.boat.hullFits) throw new Error("kapal belum siap");
    for (const [x, y] of SPOTS) if (NW.boat.hullFits(ar, x, y, SPOT_A) && NW.boat.hullFits(ar, x + 0.6, y + 0.4, SPOT_A)) { sv.spot = { x, y, a: SPOT_A }; break; }
  } catch (e) { /* ditandai gagal di bawah */ }
  if (!sv.spot) sv.loadFail = true;
  return !!sv.spot;
}
function accept() {
  const now = trustedNow(), r = K.accept(st(), now);
  if (!r.ok) { sv.msg = r.why === "clock" ? "Menunggu sinyal waktu server. Coba lagi sebentar." : "Panggilan ini sudah tidak berlaku."; refresh(); return false; }
  commit(r.st); resolveSpot(); N().sfx("click");
  N().toast("🚨 Misi SAR diterima. " + K.MISSIONS[r.st.m.id].hint, "good"); return true;
}
function later() { commit(K.snooze(st())); N().sfx("click"); if (NW.phone) NW.phone.close(); }   // pesan tetap di NusaPhone; tidak berdering lagi
function decline() { commit(K.decline(st())); N().sfx("click"); }
function cancelMission() { const r = K.cancel(st(), trustedNow()); if (r.ok) { commit(r.st); closeWorldBits(); N().toast("Misi SAR dibatalkan.", ""); } }
function closeWorldBits() { sv.spot = null; sv.loadFail = false; hideHint(); }
function retry() {   // titik aman: kapal kembali ke dermaga (mekanisme rescue yang sudah ada) lalu muat ulang objek misi
  try { if (NW.boat && NW.boat.B && NW.boat.B.on) NW.boat.rescue(); } catch (e) { /* abaikan */ }
  const ok = resolveSpot(); sv.msg = ok ? "Objek misi dimuat ulang dari titik aman." : "Objek misi belum bisa dimuat. Coba lagi atau batalkan misi."; refresh();
}
function stepMission(now) {
  if (!inSelat()) { paintHint(); return; }
  if (!sv.spot && !sv.loadFail) resolveSpot();
  const x = active(); if (!x) return;
  paintHint();
  if (x.stage === "search" && sv.spot && NW.boat && NW.boat.B && NW.boat.B.on) {   // peluit berkala (tiap ±15 dtk) bila kapal dalam jarak dengar
    ses.whistleT -= 1;
    if (ses.whistleT <= 0 && Math.hypot(NW.boat.B.x - sv.spot.x, NW.boat.B.y - sv.spot.y) < 16) { ses.whistleT = 15; try { N().sfx("berlayar"); } catch (e) { /* senyap */ } }
  }
}

// ---------- interaksi dunia ----------
function candidates(player, sailing) {
  const x = active(); if (!x || !inSelat() || !sv.spot) return [];
  const out = [];
  if ((x.stage === "search" || x.stage === "found") && sailing) out.push({ id: "sar:vic", sar: "vic", x: sv.spot.x, y: sv.spot.y, r: 2.6, icon: "🛟", label: "Periksa Nelayan", pri: 0.5 });
  if (x.stage === "aboard") out.push({ id: "sar:pos", sar: "pos", x: OFFICER.x, y: OFFICER.y, r: 4.2, icon: "🛟", label: "Serahkan Nelayan", pri: 0.8 });
  else out.push({ id: "sar:pos", sar: "pos", x: OFFICER.x, y: OFFICER.y, r: 3.2, icon: "💬", label: "Pos SAR", npc: false });
  return out;
}
function interact(t, api) {
  const x = active(); if (!x) return;
  if (t.sar === "vic" && (x.stage === "search" || x.stage === "found")) return examine(api);
  if (t.sar === "pos") return officer(api, x);
}
function examine(api) {
  if (active().stage === "search") {   // tahap "found" (mis. setelah muat ulang sebelum memilih): dialog dibuka lagi tanpa menemukan ulang
    const f = K.find(st(), trustedNow());
    if (!f.ok) { N().toast("Menunggu sinyal waktu server. Coba lagi sebentar.", "bad"); return; }
    commit(f.st); N().sfx("temuan");
  }
  bigOpts(); const opt = K.CARE.map((c) => ({ label: (c.id === "selimut" ? "🧣 " : c.id === "air" ? "💧 " : "🚤 ") + c.label, act: () => care(c.id) }));
  api.openDialog({ name: "Nelayan", avatar: "🧑🏽‍🦲", role: "Ditemukan di dekat karang", lines: [K.victimText()], options: opt, noLater: true });
}
function care(choice) {
  const r = K.care(st(), choice, trustedNow());
  if (!r.ok) { N().toast("Coba lagi sebentar.", "bad"); return; }
  commit(r.st); N().sfx("boat_naik");
  N().toast("🛟 Nelayan naik ke kapalmu dengan aman. Antar ke Pos SAR Dermaga.", "good");
}
function bigOpts() { const d = $("dlg"); if (d) d.classList.add("sar-dlg"); }   // tombol pilihan dialog SAR ≥44 px (dialog bawaan 35 px); dilepas saat dialog tertutup
function officer(api, x) {
  bigOpts();
  if (x.stage !== "aboard") return api.openDialog({ name: "Petugas SAR", avatar: "🧑🏽‍✈️", role: "Pos SAR Dermaga", lines: [x.stage === "found" ? "Rawat dulu nelayan itu, lalu bawa ke sini." : "Nelayan itu terakhir terlihat di timur mercusuar. Kapalnya biru. Hati-hati, kabut mulai turun."] });
  const r = K.deliver(st(), trustedNow(), pname());
  if (!r.ok) return N().toast("Menunggu sinyal waktu server. Coba lagi sebentar.", "bad");
  commit(r.st); closeWorldBits(); N().sfx("penghargaan");
  api.openDialog({ name: "Petugas SAR", avatar: "🧑🏽‍✈️", role: "Pos SAR Dermaga", lines: ["Terima kasih! Biar kami yang urus dari sini."], options: [{ label: "Selesai", act: () => showCard(r.card) }], noLater: true });
  if (NW.phone) NW.phone.notify({ id: "sar:done:" + r.st.m.doneAt, icon: "🛟", title: "Nelayan diselamatkan", text: "Lencana Penyelamat Laut I diterima.", app: "sar", quiet: true });
}

// ---------- tampilan ----------
function ensureEls() {
  if (!sv.hintEl) { const h = document.createElement("div"); h.id = "sarHint"; h.className = "sar-hint hidden"; h.setAttribute("role", "status"); document.body.appendChild(h); sv.hintEl = h; }
  if (!sv.cardEl) { const c = document.createElement("div"); c.id = "sarCard"; c.className = "sar-card hidden"; c.setAttribute("role", "dialog"); c.setAttribute("aria-label", "Hasil misi SAR"); document.body.appendChild(c); sv.cardEl = c;
    c.addEventListener("click", (e) => { if (e.target.closest("[data-x]")) { c.classList.add("hidden"); sv.card = null; } }); }
}
const ARROWS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
function bearing(tx, ty) {   // arah di LAYAR dari pemain ke titik (iso), tanpa menutupi apa pun
  const P = NW.P, p0 = P(NW.world.player.x, NW.world.player.y, 0), p1 = P(tx, ty, 0), a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  return ARROWS[(Math.round(a / (Math.PI / 4)) + 8) % 8];
}
function paintHint() {
  ensureEls(); const x = active(), el = sv.hintEl;
  if (!x) return hideHint();
  let tx = "";
  if (sv.loadFail) tx = "⚠️ Objek misi gagal dimuat · buka NusaPhone → Coba lagi";
  else if (!inSelat()) tx = "🚨 SAR: pergi ke Pelabuhan Selat, naik kapal";
  else if (x.stage === "search" && sv.spot) { const d = Math.hypot(NW.world.player.x - sv.spot.x, NW.world.player.y - sv.spot.y); tx = `🚨 Cari nelayan di timur mercusuar ${bearing(sv.spot.x, sv.spot.y)} ${Math.round(d)} petak`; }
  else if (x.stage === "found") tx = "🛟 Rawat nelayan itu";
  else if (x.stage === "aboard") tx = `🛟 Antar ke Pos SAR Dermaga ${bearing(OFFICER.x, OFFICER.y)}`;
  if (el.textContent !== tx) el.textContent = tx; el.classList.toggle("hidden", !tx || (NW.phone && NW.phone.isOpen && NW.phone.isOpen()));
}
function hideHint() { if (sv.hintEl) sv.hintEl.classList.add("hidden"); }
function showCard(card) {
  ensureEls(); sv.card = card; const c = sv.cardEl;
  c.innerHTML = `<div class="sar-card-h">🛟 ${esc(card.title)}</div>${card.lines.map((l) => `<div class="sar-card-l">${esc(l)}</div>`).join("")}<div class="sar-card-b">Lencana: Penyelamat Laut I</div><button type="button" class="sar-btn" data-x>Tutup</button>`;
  c.classList.remove("hidden"); clearTimeout(sv.cardT); sv.cardT = setTimeout(() => c.classList.add("hidden"), 14000);
}

// ---------- layar NusaPhone (tersembunyi, bukan ikon layar utama) ----------
function viewHtml() {
  const s = st(), x = s.m, M = x ? K.MISSIONS[x.id] : null, rec = s.rec, b = (id, label, cls) => `<button type="button" class="sar-btn ${cls || ""}" data-a="${id}">${label}</button>`;
  let h = "";
  if (x && x.phase === "offer") h = `<div class="sar-msg"><b>🚨 ${esc(M.title)}</b><p>${esc(M.text)}</p></div><div class="sar-row">${b("accept", "Terima", "go")}${b("later", "Nanti")}${b("decline", "Tolak", "no")}</div><p class="sar-note">“Nanti” menyimpan pesan ini di sini. Tidak akan berdering lagi.</p>`;
  else if (x && x.phase === "active") {
    const step = { search: "Cari nelayan di timur mercusuar.", found: "Rawat nelayan yang ditemukan.", aboard: "Antar nelayan ke Pos SAR Dermaga.", delivered: "Selesai." }[x.stage];
    h = `<div class="sar-msg"><b>🛟 Misi SAR berjalan</b><p>${esc(step)}</p>${sv.loadFail ? '<p class="sar-warn">Objek misi gagal dimuat.</p>' : ""}</div><div class="sar-row col">${b("retry", "Coba lagi dari titik aman")}${b("cancel", "Batalkan misi", "no")}</div>`;
  } else h = `<div class="sar-msg"><b>🛟 SAR Laut</b><p>${x && x.phase === "expired" ? "Panggilan terakhir sudah ditutup." : x && x.phase === "declined" ? "Kamu menolak panggilan ini." : x && x.phase === "cancelled" ? "Misi terakhir dibatalkan." : "Belum ada panggilan darurat."}</p></div>`;
  h += `<div class="sar-rec"><small>Catatan SAR</small><b>${rec.done} nelayan diselamatkan</b>${rec.badges.map((id) => `<span class="sar-badge">${K.BADGES[id].icon} ${esc(K.BADGES[id].name)}</span>`).join("")}${rec.last ? `<small>Terakhir: ${esc(K.fmtDur(rec.last.dur))} · ${esc(rec.last.cond)}</small>` : ""}</div>`;
  if (sv.msg) h += `<p class="sar-note" role="status">${esc(sv.msg)}</p>`;
  return h;
}
function mountView(body) {
  const draw = () => { body.innerHTML = `<div class="sar-view">${viewHtml()}</div>`; };
  body.addEventListener("click", (e) => {
    const a = e.target.closest("[data-a]"); if (!a) return; sv.msg = "";
    ({ accept: () => { accept(); }, later, decline, retry, cancel: cancelMission }[a.dataset.a] || (() => {}))(); draw();
  });
  draw(); sv.view = { draw };
  return { id: "sar", update: draw, close: () => { sv.view = null; } };
}
function refresh() { try { if (sv.view) sv.view.draw(); paintHint(); } catch (e) { /* tampilan saja */ } }

// ---------- gambar dunia (hanya bila misi aktif di Pelabuhan Selat) ----------
function figure(c, bx, by, o, t) {   // sosok duduk/berdiri kecil, tanpa dependensi karakter pemain
  c.save(); c.translate(bx, by); c.scale(1.25, 1.25);
  c.fillStyle = "rgba(15,35,30,.28)"; c.beginPath(); c.ellipse(0, 1, 8, 3, 0, 0, 7); c.fill();
  const bob = Math.sin(t * 2 + (o.seed || 0)) * 0.5, h = o.sit ? 9 : 14;
  c.fillStyle = o.shirt; c.fillRect(-4, -h - 6 + bob, 8, h); if (o.vest) { c.fillStyle = o.vest; c.fillRect(-4, -h - 6 + bob, 3, h); c.fillRect(1, -h - 6 + bob, 3, h); }
  if (o.blanket) { c.fillStyle = "#e8a23a"; c.fillRect(-5, -h - 4 + bob, 10, h - 2); c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(-5, -h - 4 + bob, 10, 2); }
  c.fillStyle = o.pants; c.fillRect(-4, -6 + (o.sit ? 2 : 0), 8, o.sit ? 4 : 6);
  c.fillStyle = o.skin; c.beginPath(); c.arc(0, -h - 10 + bob, 4, 0, 7); c.fill();
  c.fillStyle = o.hat; c.fillRect(-4.4, -h - 14 + bob, 8.8, 3);
  c.restore();
}
const VIC = { skin: "#a8714a", shirt: "#4a6f8c", pants: "#2e2a26", hat: "#d9d4c4", seed: 2.1 };
const OFC = { skin: "#b77b52", shirt: "#e8f0f2", vest: "#f08a24", pants: "#22404f", hat: "#f08a24", seed: 5.3 };
function drawVictim(c, pose, t) {   // dipanggil dari NW.boat.layer: nelayan duduk di kapal pemain (tidak menggeser/menjepit pemain)
  const x = active(); if (!x || x.stage !== "aboard" || !NW.boat || pose.area !== AREA) return;
  const f = NW.boat.fwd(pose.a), P = NW.P, p = P(pose.x + f.x * 0.3, pose.y + f.y * 0.3, 15 + Math.sin(t * 1.6 + pose.x * 1.3 + pose.y) * 0.8);
  figure(c, p.x, p.y, Object.assign({ sit: true, blanket: x.care === "selimut" }, VIC), t);
}
function layer(t, view, inView) {
  try {
    const x = active(); if (!x || !inSelat()) return [];
    const out = [], P = NW.P;
    out.push({ d: OFFICER.x + OFFICER.y, draw: (c) => {   // Pos SAR Dermaga: gubuk kecil + papan + petugas
      const a = P(OFFICER.x + 1.1, OFFICER.y - 0.6, 0), z = (dz) => P(OFFICER.x + 1.1, OFFICER.y - 0.6, dz);
      c.fillStyle = "#e9eef0"; c.fillRect(a.x - 12, a.y - 26, 24, 22); c.fillStyle = "#e5483a"; c.beginPath(); c.moveTo(a.x - 15, a.y - 26); c.lineTo(a.x, a.y - 38); c.lineTo(a.x + 15, a.y - 26); c.closePath(); c.fill();
      c.fillStyle = "#173f50"; c.fillRect(a.x - 5, a.y - 18, 10, 14); c.font = "bold 7px sans-serif"; c.textAlign = "center"; c.fillStyle = "#fff"; c.fillText("POS SAR", a.x, a.y - 29); void z;
      const q = P(OFFICER.x, OFFICER.y, 0); figure(c, q.x, q.y, OFC, t); } });
    if (!sv.spot || (x.stage !== "search" && x.stage !== "found")) return out;
    const vx = sv.spot.x, vy = sv.spot.y, p = P(vx, vy, 0);
    if (!inView(view, p.x, p.y - 120) && !inView(view, p.x, p.y)) return out;
    out.push({ d: vx + vy, draw: (c) => {
      for (const [dx, dy, s] of [[-1.7, 0.2, 1], [1.4, -0.7, 1.2], [0.9, 1.3, 0.9], [-0.5, -1.5, 1.1]]) { const q = P(vx + dx, vy + dy, 0); c.fillStyle = "#6f7a80"; c.beginPath(); c.ellipse(q.x, q.y, 7 * s, 3.4 * s, 0, 0, 7); c.fill(); c.fillStyle = "#8a959b"; c.beginPath(); c.ellipse(q.x - 1, q.y - 2, 5 * s, 2.4 * s, 0, 0, 7); c.fill(); }   // karang kecil (hanya gambar)
      if (NW.boat && NW.boat.drawVessel) NW.boat.drawVessel(c, { x: vx, y: vy, a: sv.spot.a }, t, { decor: true, style: { hull: "#2c6fd1", trim: "#e9f1fb", inner: "#c9d8ea" } });   // kapal BIRU
      if (x.stage === "search") figure(c, p.x - 2, p.y - 10, Object.assign({ sit: true }, VIC), t); } });
    if (x.stage === "search") {
      out.push({ d: vx + vy + 0.2, draw: (c) => {   // kepulan asap + kilau suar merah (terlihat dari jauh)
        const k = 0.55 + 0.45 * Math.sin(t * 5.1), sp = P(vx, vy, 22);
        for (let i = 0; i < 6; i++) { const u = (t * 0.35 + i / 6) % 1, y = sp.y - u * 120, r = 5 + u * 14; c.fillStyle = `rgba(214,222,226,${(0.34 * (1 - u)).toFixed(3)})`; c.beginPath(); c.arc(sp.x + Math.sin(u * 5 + i) * 6 * u + u * 8, y, r, 0, 7); c.fill(); }
        c.fillStyle = `rgba(255,70,50,${(0.35 + 0.4 * k).toFixed(3)})`; c.beginPath(); c.arc(sp.x, sp.y, 4 + 2 * k, 0, 7); c.fill(); c.fillStyle = "rgba(255,200,170,.9)"; c.beginPath(); c.arc(sp.x, sp.y, 1.8, 0, 7); c.fill(); } });
      for (const [dx, dy] of [[3.2, 2.4], [-3.4, 3.1], [5.6, 0.8], [-5.2, 5.0], [1.8, 5.4]]) out.push({ d: vx + dx + vy + dy, draw: (c) => {   // serpihan kecil mengapung (petunjuk)
        const q = P(vx + dx + Math.sin(t * 0.7 + dx) * 0.15, vy + dy, 0), w = Math.sin(t * 1.3 + dx * 2) * 1.4; c.save(); c.translate(q.x, q.y + w); c.rotate(Math.sin(t + dy) * 0.4);
        c.fillStyle = "#8d6a43"; c.fillRect(-6, -1.5, 12, 3); c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(-6, -1.5, 12, 0.9); c.restore(); } });
    }
    return out;
  } catch (e) { return []; }
}
// kabut pelan-pelan turun selama misi; tidak pernah menutup pandangan (maks 34%, bagian tengah tetap jernih). Hanya gambar.
function fogLevel() {
  const x = active(); if (!x || !inSelat() || !x.acceptedAt) return 0; const now = trustedNow(); if (now == null) return 0;
  const k = Math.max(0, Math.min(1, (now - x.acceptedAt) / FOG_RAMP_MS)); return FOG_MAX * k * k * (3 - 2 * k);
}
function drawScreen(ctx, W, H, t) {
  try {
    const f = fogLevel(); if (f <= 0.005) return; const r = Math.hypot(W, H) / 2, g = ctx.createRadialGradient(W / 2, H / 2, r * 0.22, W / 2, H / 2, r);
    g.addColorStop(0, "rgba(222,232,236,0)"); g.addColorStop(1, `rgba(222,232,236,${f.toFixed(3)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(222,232,236,${(f * 0.35).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  } catch (e) { /* hanya gambar */ }
}

// ---------- pasang ----------
function hook() {
  if (sv.started) return; sv.started = true;
  ensureEls();
  for (const ev of ["pointerdown", "pointermove", "touchstart", "touchmove", "keydown"]) window.addEventListener(ev, () => { ses.lastInput = performance.now(); }, { passive: true, capture: true });
  const reg = setInterval(() => {   // daftar layar & kotak masuk begitu NusaPhone siap (server menyalakan); tanpa jaringan
    if (!(NW.phone && NW.phone.registerApp)) return; if (!NW.phone.srvOn()) return; clearInterval(reg);
    NW.phone.registerApp("sar", { mount: (body) => mountView(body) }); restoreInbox(); if (active()) resolveSpot();
  }, 700);
  setInterval(tick, 1000);
}
NW.sar = {
  hook, migrate: (S0) => K.migrateInto(S0, trustedNow()), candidates, interact, layer, drawScreen, drawVictim, accept, later, decline, retry, cancel: cancelMission, trustedNow,
  state: () => st(), spot: () => sv.spot, fog: fogLevel, busy: () => K.busyReason(busyFlags()), _ses: ses, _tick: tick, _sv: sv,
};
})();
