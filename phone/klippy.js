// NUSA ISLAND — Klippy (Ide 07): feed konten Server/Owner/NPC. Pemain hanya membaca, menyukai (kosmetik) dan berkomentar (dimoderasi server). TANPA hadiah koin, TANPA UID/email/token di layar.
// Pemuatan malas per halaman (≤6 kartu/permintaan, kursor dari server); jeda minimal antar-permintaan; tarikan Owner/kill switch ditangani ramah. Semua teks di-escape.
(function () {
"use strict";
const NW = window.NW; if (!NW || !NW.phone) return;
const rid = () => "kp-" + Array.from({ length: 18 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
const PAGE = 6, GAP = 600;
const ago = (at) => { const s = Math.max(0, Math.floor((Date.now() - at) / 1000)); if (s < 60) return "baru saja"; const m = Math.floor(s / 60); if (m < 60) return m + " mnt lalu"; const h = Math.floor(m / 60); if (h < 24) return h + " jam lalu"; return Math.floor(h / 24) + " hari lalu"; };
const nick = () => { try { return String(NW.look.playerName() || "").slice(0, 16); } catch (e) { return ""; } };

function mount(body, x) {
  const esc = x.esc; let items = [], next = 0, loading = false, done = false, err = "", off = false, cur = null, cmts = [], cmErr = "", cmBusy = false, gone = false, lastAt = 0, io = null, tm = 0;
  body.innerHTML = '<div class="kp"><div class="kp-feed"></div><div class="kp-det hidden"></div></div>';
  const feed = body.querySelector(".kp-feed"), det = body.querySelector(".kp-det");
  const msgOf = (e, d) => (e && e.message ? String(e.message) : d);
  function card(p) {
    return `<article class="kp-card" data-p="${esc(p.id)}"><header><span class="kp-av" aria-hidden="true">${esc(p.av)}</span><div><b>${esc(p.who)}</b>${p.k === "owner" ? '<em class="kp-bd">Owner</em>' : '<em class="kp-bd npc">NPC</em>'}<small>${esc(ago(p.at))}</small></div></header><p class="kp-cap">${esc(p.cap)}</p><footer><button type="button" class="kp-b" data-like="${esc(p.id)}" aria-pressed="${p.liked}" aria-label="${p.liked ? "Batal suka" : "Suka"} (${p.lk})">${p.liked ? "❤️" : "🤍"} <span>${p.lk}</span></button><button type="button" class="kp-b" data-cm="${esc(p.id)}" aria-label="Komentar (${p.cm})">💬 <span>${p.cm}</span></button></footer></article>`;
  }
  function paintFeed() {
    if (gone) return; if (io) { io.disconnect(); io = null; }
    if (off) { feed.innerHTML = '<div class="nph-lockpane" role="status"><div class="nph-lock-ic" aria-hidden="true">🔕</div><b>Klippy sedang tidak tersedia</b><p>Konten Klippy dimatikan sementara. Coba lagi nanti.</p></div>'; return; }
    feed.innerHTML = `${items.map(card).join("")}${loading ? '<p class="nph-hint" role="status">Memuat…</p>' : ""}${err ? `<div class="pg-warn" role="alert">${esc(err)} <button type="button" class="pg-sm" data-retry="1">Coba lagi</button></div>` : ""}${!loading && !err && next !== null && items.length ? '<button type="button" class="pg-sm kp-more" data-more="1">Muat lagi</button><i class="kp-sent" aria-hidden="true"></i>' : ""}${!loading && !err && items.length === 0 && done ? '<p class="nph-hint" role="status">Belum ada kiriman Klippy. Nantikan kabar dari warga pulau!</p>' : ""}${done && items.length ? '<p class="nph-hint">Sudah sampai kiriman terlama.</p>' : ""}<p class="nph-hint">Klippy hanya berisi kiriman Owner & warga NPC. Suka bersifat kosmetik; komentar dimoderasi. Tidak ada hadiah koin.</p>`;
    const s = feed.querySelector(".kp-sent"); if (s && "IntersectionObserver" in window) { io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) more(); }, { rootMargin: "120px" }); io.observe(s); }
  }
  async function more(force) {
    if (loading || done || gone || off || next === null) return; const t = Date.now(); if (!force && t - lastAt < GAP) { clearTimeout(tm); tm = setTimeout(() => more(), GAP - (t - lastAt) + 30); return; } lastAt = t; loading = true; err = ""; paintFeed();
    try {
      const r = await x.call("klippyFeed", { cursor: next, limit: PAGE }); if (gone) return; const have = new Set(items.map((i) => i.id));
      for (const p of r.items) if (!have.has(p.id)) items.push(p);
      next = r.next; if (next === null) done = true;
    } catch (e) { if (e && (e.code === "not-found" || /tidak dikenal/i.test(String(e.message)))) off = true; else err = e && e.code === "unavailable" ? "Koneksi terputus." : e && e.code === "resource-exhausted" ? "Terlalu cepat. Tunggu sebentar lalu coba lagi." : "Klippy gagal dimuat."; }
    loading = false; paintFeed();
  }
  const upd = (id, f) => { const p = items.find((i) => i.id === id); if (p) f(p); };
  async function like(id) {
    const p = items.find((i) => i.id === id); if (!p) return; const b = feed.querySelector(`[data-like="${id}"]`); if (b) b.disabled = true;
    try { const r = await x.call("klippyLike", { opId: rid(), post: id, on: !p.liked }); upd(id, (q) => { q.liked = r.liked; q.lk = r.lk; }); }
    catch (e) { if (e && e.code === "not-found") { items = items.filter((i) => i.id !== id); err = "Kiriman itu sudah ditarik."; } else err = "Gagal menyimpan suka."; }
    paintFeed();
  }
  function paintDet() {
    const p = items.find((i) => i.id === cur); if (!p) { det.innerHTML = '<div class="pg-warn" role="alert">Kiriman tidak tersedia.</div>'; return; }
    det.innerHTML = `${card(p).replace(/<footer>.*<\/footer>/s, "")}<div class="kp-cms" aria-live="polite">${cmts.length ? cmts.map((c) => `<div class="kp-c"><b>${esc(c.n)}</b> <small>${esc(ago(c.at))}</small><p>${esc(c.t)}</p></div>`).join("") : '<p class="nph-hint">Belum ada komentar.</p>'}</div>
<form class="kp-f"><input type="text" name="t" maxlength="80" autocomplete="off" placeholder="Tulis komentar (maks 80 huruf)…" aria-label="Komentar"><button type="submit" class="pg-cta" ${cmBusy ? "disabled" : ""}>Kirim</button></form>${cmErr ? `<div class="pg-warn" role="alert">${esc(cmErr)}</div>` : ""}<p class="nph-hint">Komentar dimoderasi otomatis (kata kasar, tautan, nomor & email disamarkan). Nama yang tampil: nama panggilanmu.</p>`;
  }
  async function openCm(id) {
    cur = id; cmts = []; cmErr = ""; feed.classList.add("hidden"); det.classList.remove("hidden"); x.deeper(); paintDet();
    try { const r = await x.call("klippyComments", { post: id }); if (cur === id && !gone) { cmts = r.items; paintDet(); } } catch (e) { if (cur === id && !gone) { cmErr = e && e.code === "not-found" ? "Kiriman sudah ditarik." : "Komentar gagal dimuat."; paintDet(); } }
  }
  function closeCm() { cur = null; det.classList.add("hidden"); feed.classList.remove("hidden"); paintFeed(); }
  async function send(text) {
    if (cmBusy || !cur) return; cmBusy = true; cmErr = ""; paintDet(); const id = cur;
    try { const r = await x.call("klippyComment", { opId: rid(), post: id, text, name: nick() }); cmts.unshift(r.comment); upd(id, (q) => { q.cm = r.cm; }); }
    catch (e) { cmErr = msgOf(e, "Komentar gagal dikirim."); if (e && e.code === "not-found") { items = items.filter((i) => i.id !== id); } }
    cmBusy = false; if (cur === id && !gone) paintDet();
  }
  body.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return; x.N().sfx && x.N().sfx("click");
    if (b.dataset.like) like(b.dataset.like); else if (b.dataset.cm) openCm(b.dataset.cm); else if (b.dataset.more) more(true); else if (b.dataset.retry) { err = ""; more(true); }
  });
  body.addEventListener("submit", (e) => { e.preventDefault(); const i = det.querySelector("input[name=t]"); const t = i ? i.value.trim() : ""; if (t) send(t); });
  paintFeed(); more(true);
  return { close() { gone = true; clearTimeout(tm); if (io) io.disconnect(); }, update() { if (x.sub() === 0 && cur) closeCm(); }, _state: () => ({ n: items.length, next, done, off }) };
}
NW.phone.registerApp("klippy", { mount });
})();
