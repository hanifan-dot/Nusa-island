// =========================================================
//  NUSA ISLAND — Bumbu 1.2 "Inventaris & Pasar"
//  - Inventaris ikan sampai 200: daftar VIRTUAL (hanya baris yang terlihat yang digambar),
//    urut nama/berat/harga/kelangkaan, cari, filter, kunci ikan, kartu detail.
//  - Pasar Bu Sari: jual per kelangkaan / semua yang tidak dikunci / satuan, dengan layar
//    konfirmasi (jumlah, perkiraan koin, ringkasan), peringatan ikan yang dibutuhkan misi.
//  Kapasitas = jumlah ikan. Ikan di akuarium bukan bagian coolbox, jadi tidak tampil/terjual di sini.
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa;
const S = () => N().S;
const $ = (id) => document.getElementById(id);
const ROW = 64;                       // tinggi baris daftar (px), tetap → hitungan virtual sederhana
const RAR_EN = { biasa: "Common", langka: "Uncommon", epik: "Epic", legenda: "Legendary", sampah: "Trash" };
const RAR_RANK = { sampah: 0, biasa: 1, langka: 2, epik: 3, legenda: 4 };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fish = (it) => N().FISH_BY_ID[it.id];
const PILL = { sampah: "#5c615e", biasa: "#2f7a62", langka: "#2a79b0", epik: "#8a3fc0", legenda: "#9a6a08" }; // teks lencana kelangkaan, cukup gelap agar terbaca
const pill = (f) => { const R = RARITY[f.rarity]; return `<span class="pill" style="background:${R.color}2e;color:${PILL[f.rarity]}">${f.mistik ? "✨ Mistis" : R.label}</span>`; };

// ---------- Gambar kecil (satu per spesies, di-cache) ----------
const thumbCache = {};
function thumb(id, vr) {
  const key = vr && vr !== "normal" ? id + "|" + vr : id; // satu gambar per spesies+varian
  if (thumbCache[key]) return thumbCache[key];
  const c = document.createElement("canvas"); c.width = 112; c.height = 62;
  N().drawFish(c.getContext("2d"), N().FISH_BY_ID[id], 56, 31, 92, vr);
  return (thumbCache[key] = c.toDataURL());
}
const art = (f, cls = "", vr) => (f.emoji ? `<div class="emo ${cls}">${f.emoji}</div>` : `<img class="${cls}" src="${thumb(f.id, vr)}" alt="" decoding="async">`);
// Bumbu 2.2: label varian (kosong untuk Normal)
const vlab = (it) => (NW.variants && NW.variants.valid(it.vr) ? `<span class="vtag v-${it.vr}">${NW.variants.info(it.vr).name}</span>` : "");

// ---------- Daftar virtual ----------
// host = elemen kosong; rows = array; draw(row) → HTML satu baris (tinggi ROW). Hanya ±jendela yang dirender.
let vl = null; // { host, inner, rows, draw, start, end, off }
function unmount() { if (vl) { $("panelBody").removeEventListener("scroll", vl.onScroll); vl = null; } }
function mount(host, rows, draw) {
  unmount();
  host.style.height = rows.length * ROW + "px";
  host.innerHTML = `<div class="vrows"></div>`;
  const sc = $("panelBody");
  vl = { host, inner: host.firstChild, rows, draw, start: -1, end: -1, raf: 0, count: 0 };
  vl.onScroll = () => { if (!vl.raf) vl.raf = requestAnimationFrame(() => { if (vl) { vl.raf = 0; paint(); } }); };
  sc.addEventListener("scroll", vl.onScroll, { passive: true });
  paint();
  requestAnimationFrame(() => paint(true)); // panel baru tampil setelah render: ukur ulang saat sudah punya tinggi
}
function paint(force) {
  if (!vl) return;
  const sc = $("panelBody"), top = sc.scrollTop - (vl.host.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop);
  const a = Math.max(0, Math.floor(top / ROW) - 4), b = Math.min(vl.rows.length, Math.ceil((top + sc.clientHeight) / ROW) + 4);
  if (!force && a === vl.start && b === vl.end) return;
  vl.start = a; vl.end = b;
  vl.inner.style.transform = `translateY(${a * ROW}px)`;
  let h = ""; for (let i = a; i < b; i++) h += vl.draw(vl.rows[i]);
  vl.inner.innerHTML = h; vl.count = b - a;
}

// ============================================================
//  INVENTARIS
// ============================================================
const V = { q: "", sort: "rarity", dir: 1, filter: "all", detail: null };
const SORTS = [["rarity", "Kelangkaan"], ["name", "Nama"], ["weight", "Berat"], ["price", "Harga"]];
const FILTERS = [["all", "Semua"], ["biasa", "Biasa"], ["langka", "Langka"], ["epik", "Epik"], ["legenda", "Legenda"], ["sampah", "Sampah"], ["lock", "🔒"]];
function view() { // daftar yang ditampilkan: filter + cari + urut
  const q = V.q.trim().toLowerCase(), N_ = N();
  let rows = S().cooler.map((it) => ({ it, f: fish(it), p: 0 })).filter((r) => r.f);
  if (V.filter === "lock") rows = rows.filter((r) => r.it.lock);
  else if (V.filter !== "all") rows = rows.filter((r) => r.f.rarity === V.filter);
  if (q) rows = rows.filter((r) => r.f.name.toLowerCase().includes(q) || RAR_EN[r.f.rarity].toLowerCase().includes(q) || r.f.rarity.includes(q));
  for (const r of rows) r.p = N_.priceOf(r.it);
  const d = V.dir, cmp = {
    rarity: (a, b) => (RAR_RANK[b.f.rarity] - RAR_RANK[a.f.rarity]) * d || b.it.w - a.it.w,
    name: (a, b) => a.f.name.localeCompare(b.f.name, "id") * d || b.it.w - a.it.w,
    weight: (a, b) => (b.it.w - a.it.w) * d,
    price: (a, b) => (b.p - a.p) * d,
  }[V.sort];
  return rows.sort(cmp);
}
function invRow(r) {
  const { it, f } = r, R = RARITY[f.rarity];
  return `<div class="inv-row ${it.lock ? "locked" : ""}" data-act="invOpen" data-arg="${it.uid}" style="border-left-color:${R.color}">
    ${art(f, "", it.vr)}
    <div class="grow"><div class="nm">${esc(f.name)}${it.lock ? " 🔒" : ""} ${vlab(it)}</div>
      <div class="sub">${N().fmtW(it.w)} · ${pill(f)}</div></div>
    <div class="price">🪙 ${N().fmt(r.p)}</div></div>`;
}
function capBar() {
  const n = S().cooler.length, cap = N().coolerCap(), lv = N().upLvl("cooler");
  return `<div class="inv-cap"><div><b class="inv-count ${n >= cap ? "full" : ""}">${n}/${cap}</b> <span class="muted">ikan · ${UPGRADES.cooler.levels[lv]}</span></div>
    <div class="bar-mini"><div style="width:${Math.min(100, (n / cap) * 100).toFixed(1)}%"></div></div></div>`;
}
function invHTML() {
  const cnt = S().cooler.length;
  let h = `<div class="inv-head">${capBar()}
    <input id="invSearch" class="name-input" type="search" inputmode="search" placeholder="Cari ikan atau kelangkaan…" value="${esc(V.q)}" aria-label="Cari ikan" autocomplete="off">
    <div class="chips" role="group" aria-label="Urutkan">${SORTS.map(([k, n]) => `<button class="chip-b ${V.sort === k ? "on" : ""}" data-act="invSort" data-arg="${k}">${n}${V.sort === k ? (V.dir > 0 ? " ↓" : " ↑") : ""}</button>`).join("")}</div>
    <div class="chips" role="group" aria-label="Filter">${FILTERS.map(([k, n]) => `<button class="chip-b ${V.filter === k ? "on" : ""}" data-act="invFilter" data-arg="${k}">${n}</button>`).join("")}</div></div>`;
  h += `<div class="vlist" id="invList"></div><p class="muted" id="invEmpty" style="text-align:center;padding:18px 0;display:none"></p>`;
  h += `<p class="muted">Ketuk ikan untuk detail, kunci, atau pamer. Ikan yang dipajang di akuarium tersimpan terpisah.</p>`;
  return h;
}
function invAfter() {
  refreshList();
  closeDetail();
}
function refreshList() {
  const host = $("invList"); if (!host) return;
  const rows = view(), empty = $("invEmpty");
  mount(host, rows, invRow);
  const total = S().cooler.length;
  empty.style.display = rows.length ? "none" : "block";
  empty.textContent = total ? "Tidak ada ikan yang cocok dengan pencarian atau filter ini." : "Coolbox masih kosong. Ayo mancing dulu! 🎣";
}
function refreshHeader() { const c = document.querySelector(".inv-cap"); if (c) c.outerHTML = capBar(); }
function toggleLock(uid) {
  const it = S().cooler.find((x) => x.uid === uid); if (!it) return;
  if (it.lock) delete it.lock; else it.lock = true;
  N().save(); N().sfx("click");
}
// ---------- Kartu detail ----------
function detailHTML(it) {
  const f = fish(it), R = RARITY[f.rarity], p = N().priceOf(it), here = NW.look && NW.look.holding && NW.look.holding() === it.uid;
  return `<div class="inv-sheet" role="dialog" aria-label="Detail ikan">
    <button class="close inv-x" data-act="invClose" aria-label="Tutup">✕</button>
    <div class="inv-art" style="background:radial-gradient(circle at 50% 60%, ${R.glow}, transparent 70%)">${f.emoji ? `<div class="emo big">${f.emoji}</div>` : `<img src="${N().fishImg(f.id, it.vr)}" alt="${esc(f.name)}">`}</div>
    <h3>${esc(f.name)}${it.lock ? " 🔒" : ""} ${vlab(it)}</h3>
    <div class="inv-facts"><span class="pill" style="background:${R.color}2e;color:${PILL[f.rarity]}">${R.label} · ${RAR_EN[f.rarity]}</span>
      <span>⚖️ ${N().fmtW(it.w)}</span><span>🪙 ${N().fmt(p)} ${N().trendHTML(f.id)}</span></div>
    ${f.desc ? `<p class="muted">${esc(f.desc)}</p>` : ""}
    <div class="inv-actions">
      ${NW.look && NW.look.holdUI ? NW.look.holdUI(it, here) : ""}
      <button class="btn ghost" data-act="invLock" data-arg="${it.uid}">${it.lock ? "🔓 Buka kunci" : "🔒 Kunci ikan"}</button>
    </div>
    <p class="muted" style="margin:6px 0 0">${it.lock ? "Ikan terkunci tidak ikut terjual massal dan tidak dipakai misi." : "Kunci ikan favoritmu supaya tidak ikut terjual massal."}</p></div>`;
}
function openDetail(uid) {
  const it = S().cooler.find((x) => x.uid === uid); if (!it) return;
  V.detail = uid; closeSheet();
  const d = document.createElement("div"); d.id = "invDetail"; d.className = "inv-detail"; d.innerHTML = detailHTML(it);
  d.addEventListener("click", (e) => { // lembar detail ada di luar #panelBody, jadi klik ditangani di sini
    if (e.target === d) return closeDetail();
    const el = e.target.closest("[data-act]"); if (el) invAct(el.dataset.act, el.dataset.arg, el);
  });
  $("panelWrap").appendChild(d);
}
function closeSheet() { const d = $("invDetail"); if (d) d.remove(); }
// Dipanggil game.js tiap panel diganti/ditutup: kartu detail tidak boleh tertinggal menutupi panel lain
function panelChanged(name) {
  if (name !== "inventory") { V.detail = null; closeSheet(); }
  if (name !== "inventory" && name !== "market") unmount();
}
function closeDetail() { V.detail = null; closeSheet(); }
function redrawDetail() { const it = S().cooler.find((x) => x.uid === V.detail); if (!it) return closeDetail(); const d = $("invDetail"); if (d) d.innerHTML = detailHTML(it); }

function invAct(a, arg) {
  if (a === "invSort") { if (V.sort === arg) V.dir = -V.dir; else { V.sort = arg; V.dir = 1; } N().sfx("click"); N().renderPanel(); }
  else if (a === "invFilter") { V.filter = arg; N().sfx("click"); N().renderPanel(); }
  else if (a === "invOpen") openDetail(arg);
  else if (a === "invClose") closeDetail();
  else if (a === "invLock") { toggleLock(arg); redrawDetail(); refreshHeader(); paint(true); if (V.filter === "lock") refreshList(); }
  else if (NW.look && NW.look.holdAct && NW.look.holdAct(a, arg)) { /* ditangani modul pamer */ }
}
// Mengetik di kolom cari hanya memperbarui daftar (tidak menggambar ulang panel → fokus keyboard tetap)
document.addEventListener("input", (e) => {
  if (!e.target || e.target.id !== "invSearch") return;
  V.q = e.target.value; refreshList();
});

// ============================================================
//  PASAR BU SARI
// ============================================================
const D = { draft: null };            // draf penjualan menunggu konfirmasi
const CATS = [["biasa", "Biasa"], ["langka", "Langka"], ["epik", "Epik"], ["legenda", "Legenda"], ["sampah", "Sampah"]];
const unlocked = () => S().cooler.filter((it) => !it.lock && fish(it));
function selectKind(kind) {
  const list = unlocked();
  return kind === "unlocked" ? list : list.filter((it) => fish(it).rarity === kind);
}
function needs() { // ikan yang sedang dibutuhkan misi / cerita aktif
  const out = [];
  try { if (NW.life && NW.life.fishNeeds) out.push(...NW.life.fishNeeds()); } catch (e) {}
  try { if (NW.story && NW.story.fishNeeds) out.push(...NW.story.fishNeeds()); } catch (e) {}
  return out;
}
function warnings(uids) {
  const set = new Set(uids), cooler = S().cooler, w = [];
  for (const nd of needs()) {
    const have = cooler.filter((it) => nd.ids.includes(it.id)).length, sold = cooler.filter((it) => set.has(it.uid) && nd.ids.includes(it.id)).length;
    if (sold > 0 && have >= nd.n && have - sold < nd.n) w.push(nd.why);
  }
  // Bumbu 2.2: ikan varian istimewa selalu disebut jelas di konfirmasi (tidak terjual tanpa disadari)
  if (NW.variants) {
    const cnt = {}; for (const it of cooler) if (set.has(it.uid) && NW.variants.valid(it.vr)) cnt[it.vr] = (cnt[it.vr] || 0) + 1;
    const parts = Object.keys(cnt).map((k) => `${cnt[k]}× ${NW.variants.info(k).name}`);
    if (parts.length) w.push(`✨ Termasuk ikan varian istimewa: ${parts.join(", ")}. Ikan yang sudah dijual tidak bisa dibeli kembali.`);
  }
  return w;
}
function labelOf(kind) {
  if (kind === "unlocked") return "semua ikan yang tidak dikunci";
  if (kind === "one") return "ikan ini";
  return `semua ${RARITY[kind].label.toLowerCase()} (${RAR_EN[kind]})`;
}
function makeDraft(kind, uids) {
  const items = S().cooler.filter((it) => uids.includes(it.uid));
  const by = {}; let total = 0;
  for (const it of items) { const p = N().priceOf(it); total += p; const g = (by[it.id] = by[it.id] || { f: fish(it), n: 0, w: 0, p: 0 }); g.n++; g.w += it.w; g.p += p; }
  return { kind, uids, n: items.length, total, groups: Object.values(by).sort((a, b) => b.p - a.p), warn: warnings(uids) };
}
function askSell(kind) {
  const list = selectKind(kind); if (!list.length) { N().toast("Tidak ada ikan yang cocok untuk dijual", "bad"); return; }
  D.draft = makeDraft(kind, list.map((it) => it.uid)); N().sfx("click"); N().renderPanel();
}
// Jual: hanya uid yang masih di coolbox, tidak terkunci. Koin dan statistik ditambah SATU kali.
function execSell(uids) {
  const set = new Set(uids), keep = []; let total = 0, n = 0;
  for (const it of S().cooler) { if (set.has(it.uid) && !it.lock && fish(it)) { total += N().priceOf(it); n++; } else keep.push(it); }
  if (!n) return 0;
  S().cooler = keep; S().money += total; S().stats.earned += total;
  N().emit("sell", total); N().sfx("coin"); N().toast(`Terjual ${n} ikan! +🪙 ${N().fmt(total)}`, "good"); N().save(); N().refreshHUD();
  return total;
}
function confirmSell() {
  const d = D.draft; if (!d) return;
  D.draft = null; execSell(d.uids); N().renderPanel(); // draf dibuang lebih dulu → klik ganda tidak menjual dua kali
}
function sellOne(uid) {
  const it = S().cooler.find((x) => x.uid === uid); if (!it) return;
  if (it.lock) { N().toast("Ikan ini terkunci 🔒. Buka kunci di Inventaris dulu.", "bad"); return; }
  const w = warnings([uid]); // ikan varian istimewa ikut memicu konfirmasi (peringatan di atas)
  if (w.length) { D.draft = makeDraft("one", [uid]); N().renderPanel(); return; } // ikan dibutuhkan misi → minta konfirmasi
  execSell([uid]); N().renderPanel(); // perilaku jual satuan lama: langsung
}
function marketRow(r) {
  const { it, f } = r, R = RARITY[f.rarity];
  return `<div class="inv-row ${it.lock ? "locked" : ""}" style="border-left-color:${R.color}">
    ${art(f, "", it.vr)}
    <div class="grow"><div class="nm">${esc(f.name)}${it.lock ? " 🔒" : ""} ${vlab(it)}</div><div class="sub">${N().fmtW(it.w)} · ${R.label} ${N().trendHTML(f.id)}</div></div>
    <div class="price">🪙 ${N().fmt(r.p)}</div>
    <button class="btn small" data-act="sell" data-arg="${it.uid}" ${it.lock ? "disabled" : ""}>${it.lock ? "🔒" : "Jual"}</button></div>`;
}
function marketHTML() {
  if (D.draft) { // draf lama divalidasi ulang terhadap isi coolbox sekarang
    const ids = new Set(S().cooler.filter((it) => !it.lock).map((it) => it.uid)), keep = D.draft.uids.filter((u) => ids.has(u));
    D.draft = keep.length ? makeDraft(D.draft.kind, keep) : null;
  }
  const cooler = S().cooler, L = LOCATIONS[S().loc];
  const hot = FISH.filter((f) => f.loc === L.id && (!f.mistik || S().dex[f.id])).map((f) => ({ f, m: N().priceMult(f.id) })).sort((a, b) => b.m - a.m)[0];
  let h = `<p class="muted">Harga berubah tiap hari. Tahan dulu ikan yang lagi murah, jual saat naik!</p>`;
  if (hot && hot.m > 1.1) h += `<p>🔥 Lagi mahal di ${L.short}: <b>${hot.f.name}</b> <span class="trend-up">▲ ${Math.round((hot.m - 1) * 100)}%</span></p>`;
  const all = cooler.reduce((s, it) => s + (fish(it) ? N().priceOf(it) : 0), 0), lockN = cooler.filter((it) => it.lock).length;
  h += `<div class="market-sum"><div><div class="muted">Isi coolbox ${cooler.length}/${N().coolerCap()}${lockN ? ` · ${lockN} terkunci 🔒` : ""}</div><b>🪙 ${N().fmt(all)}</b></div>
        <button class="btn small ghost" data-act="openInv">🧊 Inventaris</button></div>`;
  if (!cooler.length) return h + `<p class="muted" style="text-align:center;padding:20px 0">Coolbox masih kosong. Ayo mancing dulu! 🎣</p>`;
  const d = D.draft;
  if (d) { // ---------- layar konfirmasi ----------
    h += `<div class="sell-confirm"><h3>Jual ${labelOf(d.kind)}?</h3>
      <div class="sell-total"><div><span class="muted">Jumlah</span><b>${d.n} ikan</b></div><div><span class="muted">Perkiraan koin</span><b>🪙 ${N().fmt(d.total)}</b></div></div>
      <div class="sell-list">${d.groups.slice(0, 8).map((g) => `<div><span>${g.f.emoji || "🐟"} ${esc(g.f.name)} ×${g.n}</span><span class="muted">${N().fmtW(g.w)}</span><b>🪙 ${N().fmt(g.p)}</b></div>`).join("")}${d.groups.length > 8 ? `<div class="muted">+ ${d.groups.length - 8} jenis lainnya</div>` : ""}</div>
      ${d.warn.length ? `<div class="sell-warn">⚠️ ${d.warn.map(esc).join("<br>⚠️ ")}${d.warn.some((x) => !x.startsWith("✨")) ? "<br><b>Kalau dijual, ikan itu tidak bisa dipakai lagi untuk tugas tersebut.</b>" : ""}</div>` : ""}
      <div class="sell-btns"><button class="btn ghost" data-act="cancelSell">Batal</button><button class="btn gold" data-act="confirmSell">${d.warn.length ? "Tetap jual" : "Konfirmasi"}</button></div></div>`;
    return h;
  }
  // ---------- pilihan jual ----------
  h += `<h3 class="sub-h">Jual cepat</h3><div class="cat-grid">`;
  for (const [k, n] of CATS) {
    const list = selectKind(k), tot = list.reduce((s, it) => s + N().priceOf(it), 0), R = RARITY[k];
    h += `<button class="cat" data-act="askSell" data-arg="${k}" ${list.length ? "" : "disabled"} style="border-left-color:${R.color}"><b>${R.label} <small>${RAR_EN[k]}</small></b><span>${list.length} ikan · 🪙 ${N().fmt(tot)}</span></button>`;
  }
  const ul = unlocked(), ut = ul.reduce((s, it) => s + N().priceOf(it), 0);
  h += `<button class="cat wide" data-act="sellAll" ${ul.length ? "" : "disabled"}><b>Semua yang tidak dikunci</b><span>${ul.length} ikan · 🪙 ${N().fmt(ut)}</span></button></div>`;
  h += `<h3 class="sub-h">Jual satu per satu</h3><div class="vlist" id="mktList"></div>`;
  return h;
}
function marketAfter() {
  const host = $("mktList"); if (!host) { unmount(); return; }
  const rows = S().cooler.map((it) => ({ it, f: fish(it), p: N().priceOf(it) })).filter((r) => r.f).sort((a, b) => b.p - a.p);
  mount(host, rows, marketRow);
}
function marketAct(a, arg) {
  if (a === "sell") sellOne(arg);
  else if (a === "sellAll") askSell("unlocked");
  else if (a === "askSell") askSell(arg);
  else if (a === "confirmSell") confirmSell();
  else if (a === "cancelSell") { D.draft = null; N().sfx("click"); N().renderPanel(); }
  else if (a === "openInv") { D.draft = null; N().openPanel("inventory"); }
}

function open() { N().openPanel("inventory"); }
function hook() {
  const g = N();
  g.registerPanel("inventory", { title: () => "🧊 Inventaris Ikan", render: invHTML, act: invAct, after: invAfter });
  g.registerPanel("market", { title: () => "🏪 Pasar Ikan", render: marketHTML, act: marketAct, after: marketAfter });
  $("coolerChip").addEventListener("click", () => { g.sfx("click"); open(); });
  $("coolerChip").style.cursor = "pointer";
  // pembersihan saat panel ditutup
  $("panelClose").addEventListener("click", () => { D.draft = null; closeDetail(); unmount(); });
  g.on("catch", () => { if (g.currentPanel() === "inventory") { refreshHeader(); } });
}

NW.inv = { hook, open, view, selectKind, makeDraft, execSell, warnings, needs, mount, ROW, get vlist() { return vl; }, state: V, draft: () => D.draft, thumb, closeDetail, redrawDetail, panelChanged };
})();
