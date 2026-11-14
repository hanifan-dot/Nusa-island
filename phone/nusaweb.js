// NUSA ISLAND — NusaWeb (Ide 07): peramban halaman FIKTIF pulau Nusa. TIDAK membuka internet umum: tidak ada fetch/iframe/tautan keluar; semua halaman ada di berkas ini.
// Bilah alamat, Kembali, Beranda, tab (maks 3), markah (disimpan lokal di perangkat). Bookmark bawaan "NusaOcean" (nusaocean.nusa) membuka Ocean Spin YANG SAMA dengan PlayGame (modul oceanspin.js).
// Pencarian = Zentro (zentro.js memakai NW.phoneWeb.mountSearch dari berkas ini): hanya mencari halaman Nusa di bawah. Alamat non-.nusa → halaman galat; tidak pernah dibuka.
(function () {
"use strict";
const NW = window.NW; if (!NW || !NW.phone) return;
const B = (h, p) => [h, p];
const PAGES = [
  { host: "nusa.home", title: "Beranda NusaWeb", ic: "🏝️", desc: "Pintu masuk ke semua halaman pulau Nusa.", kw: "beranda awal portal pulau nusa",
    body: [B("p", "Selamat datang di NusaWeb! Di sini hanya ada halaman-halaman pulau Nusa — aman dan ramah untuk semua umur."), B("links", ["kabar.nusa", "resep.nusa", "pasar.nusa", "dongeng.nusa", "cuaca.nusa", "peta.nusa", "nusaocean.nusa", "zentro.nusa"]), B("small", "Ketik alamat berakhiran .nusa di bilah atas, atau kata biasa untuk mencari lewat Zentro.")] },
  { host: "kabar.nusa", title: "Kabar Pulau", ic: "📰", desc: "Berita ringan seputar pulau: panen rumput laut, lomba perahu, festival lampion.", kw: "berita kabar panen rumput laut lomba perahu festival lampion warga",
    body: [B("h", "Panen rumput laut lebih cepat"), B("p", "Warga dermaga memanen rumput laut sehari lebih awal karena laut tenang. Pak Darto membagikan seikat kepada setiap tetangga."), B("h", "Lomba perahu hias akhir pekan"), B("p", "Perahu-perahu kecil dihias bendera warna-warni. Pemenangnya dipilih lewat tepuk tangan terkeras."), B("h", "Festival lampion malam"), B("p", "Lampion kertas dilepas di pantai. Ingat: bawa pulang sampahmu agar pantai tetap bersih."), B("links", ["nusa.home", "cuaca.nusa"])] },
  { host: "resep.nusa", title: "Resep Dapur Nusa", ic: "🍲", desc: "Resep sederhana khas pulau: sup ikan, pepes, es kelapa.", kw: "resep masak dapur ikan sup pepes kelapa makanan kuliner",
    body: [B("h", "Sup ikan bening"), B("ul", ["Ikan segar, potong sedang", "Jahe, serai, daun jeruk", "Tomat dan daun bawang", "Rebus sebentar, jangan terlalu lama"]), B("h", "Es kelapa muda"), B("p", "Kerok daging kelapa muda, tambah air kelapa dan es batu. Manis alami, tanpa gula tambahan."), B("small", "Resep hanya cerita untuk seru-seruan; di game, memasak dilakukan di dapur Rumahku."), B("links", ["pasar.nusa", "nusa.home"])] },
  { host: "pasar.nusa", title: "Pasar Pulau", ic: "🧺", desc: "Cerita lapak pasar pulau: ikan, buah, anyaman. Hanya cerita, tidak ada jual-beli.", kw: "pasar lapak jual beli ikan buah anyaman pedagang",
    body: [B("p", "Pagi di pasar pulau ramai dengan suara pedagang. Ada lapak ikan, buah, anyaman, dan jajanan manis."), B("ul", ["Lapak ikan: hasil tangkapan pagi", "Lapak buah: pisang, kelapa, mangga", "Lapak anyaman: topi caping dan keranjang"]), B("small", "Halaman ini hanya bacaan. NusaWeb tidak memproses pembelian atau pembayaran apa pun."), B("links", ["resep.nusa", "kabar.nusa"])] },
  { host: "dongeng.nusa", title: "Dongeng Laut", ic: "📖", desc: "Cerita pendek sebelum tidur tentang ikan, kepiting, dan bintang laut.", kw: "dongeng cerita anak tidur ikan kepiting bintang laut",
    body: [B("h", "Kepiting yang takut gelap"), B("p", "Seekor kepiting kecil selalu menyalakan lampu dari ubur-ubur. Suatu malam lampunya padam, dan ia sadar bintang di langit cukup untuk menemani. Sejak itu ia berani berjalan sendiri."), B("h", "Ikan yang ingin terbang"), B("p", "Ikan terbang mengajari temannya melompat. Mereka belum bisa terbang, tapi tertawa sepanjang hari — dan itu sudah cukup menyenangkan."), B("links", ["nusa.home", "cuaca.nusa"])] },
  { host: "cuaca.nusa", title: "Cuaca Pulau (cerita)", ic: "⛅", desc: "Ramalan cuaca versi cerita, bukan cuaca sungguhan.", kw: "cuaca ramalan hujan cerah angin badai awan langit",
    body: [B("p", "Ini ramalan versi dongeng, bukan cuaca sungguhan. Waktu dan langit di game mengikuti jam permainan."), B("ul", ["Pagi: langit bening, burung camar berisik", "Siang: angin laut sejuk", "Malam: lampion dan bintang"]), B("links", ["kabar.nusa", "dongeng.nusa"])] },
  { host: "peta.nusa", title: "Peta Pulau (panduan)", ic: "🗺️", desc: "Panduan singkat tempat-tempat di pulau: dermaga, rumah, kota.", kw: "peta panduan tempat dermaga rumah kota pulau lokasi jalan",
    body: [B("p", "Pulau Nusa punya dermaga untuk memancing, rumah-rumah warga, dan Kota Nusa dengan toko-toko."), B("ul", ["Dermaga: mulai memancing", "Rumahku: dapur, kolam, dekorasi", "Kota Nusa: toko dan tempat berkumpul"]), B("small", "Untuk melihat posisimu sekarang, buka aplikasi Peta di ponsel."), B("links", ["nusa.home", "nusaocean.nusa"])] },
  { host: "nusaocean.nusa", title: "NusaOcean", ic: "🌊", desc: "Portal hiburan laut: mainkan Ocean Spin (500 koin bermain per spin).", kw: "nusaocean ocean spin game hadiah ikan zeus petir megalodon koin",
    body: [B("p", "NusaOcean adalah pintu masuk Ocean Spin — game yang SAMA dengan yang ada di PlayGame. Hasil spin sepenuhnya diundi server; peluang tampil sebelum kamu menekan SPIN."), B("oceanspin", null), B("small", "Hanya koin bermain yang bisa dipakai. Koin hasil top-up tidak bisa dipakai di sini.")] },
  { host: "zentro.nusa", title: "Zentro", ic: "🔎", desc: "Mesin pencari halaman Nusa (bukan internet umum).", kw: "zentro cari pencarian search mesin pencari", body: [B("search", null)] },
  { host: "markah.nusa", title: "Markah", ic: "★", desc: "", kw: "", hidden: true, body: [B("markah", null)] },
  { host: "galat.nusa", title: "Halaman tidak dapat dibuka", ic: "🚧", desc: "", kw: "", hidden: true, body: [B("galat", null)] },
];
const BY = {}; for (const p of PAGES) BY[p.host] = p;
const DEFAULT_BM = ["nusaocean.nusa", "kabar.nusa", "resep.nusa"], SK = "nusa_web_v1", MAX_TABS = 3, MAX_BM = 12, MAXQ = 40;
const plain = (s) => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const toks = (s) => plain(s).split(/[^a-z0-9]+/).filter(Boolean).slice(0, 6);
function search(q) {
  const T = toks(String(q || "").slice(0, MAXQ)); if (!T.length) return [];
  const out = [];
  for (const p of PAGES) {
    if (p.hidden) continue; const h = plain(p.host), t = plain(p.title), k = plain(p.kw), d = plain(p.desc), b = plain(p.body.map((r) => typeof r[1] === "string" ? r[1] : Array.isArray(r[1]) ? r[1].join(" ") : "").join(" ")); let sc = 0;
    for (const w of T) { if (h.includes(w)) sc += 5; if (t.includes(w)) sc += 4; if (k.includes(w)) sc += 3; if (d.includes(w)) sc += 2; if (b.includes(w)) sc += 1; }
    if (sc > 0) out.push({ p, sc });
  }
  return out.sort((a, b) => b.sc - a.sc).slice(0, 8).map((r) => r.p);
}
// Alamat → {host, q} atau {err}. Hanya *.nusa yang dikenal; internet umum TIDAK PERNAH dibuka.
function parse(raw) {
  let s = String(raw == null ? "" : raw).trim().slice(0, 80); if (!s) return { err: "kosong" };
  s = s.replace(/^(nusa:\/\/|https?:\/\/|\/\/)/i, "").replace(/^www\./i, "");
  const m = /^zentro\.nusa(?:\/|\?q=)(.*)$/i.exec(s); if (m) { let q = ""; try { q = decodeURIComponent(m[1]); } catch (e) { q = m[1]; } return { host: "zentro.nusa", q: q.slice(0, MAXQ) }; }
  const h = s.replace(/\/+$/, "").toLowerCase();
  if (BY[h] && h !== "galat.nusa") return { host: h, q: "" };
  if (/^[a-z0-9-]+\.nusa(\/.*)?$/i.test(s)) return { err: "tidak-ada", addr: h.slice(0, 40) };
  if (/[./:\\@]/.test(s)) return { err: "luar", addr: h.slice(0, 40) };
  return { host: "zentro.nusa", q: s.slice(0, MAXQ) };   // kata biasa → cari lewat Zentro (hanya halaman Nusa)
}
const bmGet = () => { try { const v = JSON.parse(localStorage.getItem(SK) || "null"); if (v && Array.isArray(v.bm)) { const o = []; for (const h of v.bm) if (typeof h === "string" && BY[h] && !BY[h].hidden && !o.includes(h)) o.push(h); return o.slice(0, MAX_BM); } } catch (e) { /* bawaan */ } return DEFAULT_BM.slice(); };
const bmSet = (a) => { try { localStorage.setItem(SK, JSON.stringify({ bm: a })); } catch (e) { /* abaikan */ } };
const SUGGEST = ["resep", "dongeng", "pasar", "cuaca", "kabar", "peta", "ocean"];

// Kotak pencarian bersama (dipakai halaman zentro.nusa di NusaWeb DAN aplikasi Zentro).
function mountSearch(host, o) {
  const esc = o.esc; let q = String(o.q || "").slice(0, MAXQ), gone = false;
  host.innerHTML = `<div class="zn"><form class="zn-f" role="search"><input type="search" name="q" maxlength="${MAXQ}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Cari halaman Nusa…" aria-label="Cari halaman Nusa"><button type="submit" class="pg-cta" aria-label="Cari">Cari</button></form>
<div class="zn-chips" aria-label="Coba cari">${SUGGEST.map((s) => `<button type="button" class="pg-sm" data-zq="${s}">${s}</button>`).join("")}</div><div class="zn-res" aria-live="polite"></div><p class="nph-hint">Zentro hanya mencari halaman di NusaWeb (pulau fiksi). Zentro tidak membuka internet umum dan tidak mengirim pencarianmu ke mana pun.</p></div>`;
  const inp = host.querySelector("input"), res = host.querySelector(".zn-res"); inp.value = q;
  function run(v) {
    q = String(v || "").slice(0, MAXQ); inp.value = q; const r = search(q);
    res.innerHTML = !q.trim() ? '<p class="nph-hint">Ketik kata kunci, misalnya “resep” atau “dongeng”.</p>' : r.length ? `<p class="zn-n">${r.length} halaman ditemukan</p>${r.map((p) => `<button type="button" class="zn-r" data-zo="${p.host}"><span aria-hidden="true">${p.ic}</span><span><b>${esc(p.title)}</b><small>${esc(p.host)}</small><em>${esc(p.desc)}</em></span></button>`).join("")}` : '<p class="zn-none" role="status">Tidak ada halaman Nusa yang cocok. Coba kata lain.</p>';
  }
  host.addEventListener("submit", (e) => { e.preventDefault(); run(inp.value); });
  host.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.zq) run(b.dataset.zq); else if (b.dataset.zo && o.open) o.open(b.dataset.zo); });
  if (q) run(q);
  return { close() { gone = true; host.innerHTML = ""; }, q: () => q };
}

function mount(body, x) {
  const esc = x.esc; let tabs = [], cur = 0, bm = bmGet(), view = "page", ocean = null, search_ = null, gone = false, seq = 0;
  const first = NW.phoneWeb.pending; NW.phoneWeb.pending = null; const startAt = first && BY[first] && !BY[first].hidden ? { host: first, q: "" } : { host: "nusa.home", q: "" };
  tabs.push({ cur: startAt, hist: [] });
  body.innerHTML = `<div class="nw"><div class="nw-bar"><button type="button" data-nw="back" aria-label="Halaman sebelumnya">◀</button><button type="button" data-nw="home" aria-label="Beranda NusaWeb">🏠</button><form class="nw-addr" autocomplete="off"><input type="text" name="a" inputmode="url" enterkeyhint="go" maxlength="80" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Alamat halaman Nusa"></form><button type="button" data-nw="star" aria-label="Tambah markah" aria-pressed="false">☆</button><button type="button" data-nw="tabs" aria-label="Tab"><b>1</b></button></div><div class="nw-pg" tabindex="-1"></div></div>`;
  const $ = (s) => body.querySelector(s), pg = $(".nw-pg"), addr = $(".nw-addr input"), tab = () => tabs[cur];
  const shown = (c) => c.host === "zentro.nusa" && c.q ? "zentro.nusa/?q=" + c.q : (c.host === "galat.nusa" ? (c.addr || "") : c.host);
  function closeInner() { if (ocean) { try { ocean.close(); } catch (e) { /* abaikan */ } ocean = null; } if (search_) { try { search_.close(); } catch (e) { /* abaikan */ } search_ = null; } }
  function chrome() {
    const t = tab(), c = t.cur; addr.value = shown(c); $("[data-nw=back]").disabled = !t.hist.length && view === "page";
    const can = !!BY[c.host] && !BY[c.host].hidden, on = can && bm.includes(c.host), s = $("[data-nw=star]"); s.disabled = !can; s.textContent = on ? "★" : "☆"; s.setAttribute("aria-pressed", String(on)); s.setAttribute("aria-label", on ? "Hapus markah" : "Tambah markah");
    $("[data-nw=tabs] b").textContent = String(tabs.length);
  }
  function links(arr) { return `<div class="nw-links">${arr.filter((h) => BY[h]).map((h) => `<button type="button" class="nw-link" data-go="${h}"><span aria-hidden="true">${BY[h].ic}</span><span><b>${esc(BY[h].title)}</b><small>${esc(h)}</small></span></button>`).join("")}</div>`; }
  async function renderOcean(box, mine) {
    box.innerHTML = '<div class="nph-lockpane"><div class="nph-lock-ic" aria-hidden="true">⏳</div><b>Memuat…</b></div>';
    let inst = false; try { const r = await x.call("phoneState", {}); inst = !!(r.state && r.state.games.some((g) => g.id === "oceanspin" && g.installed)); } catch (e) { if (mine === seq && !gone) box.innerHTML = '<div class="pg-warn" role="alert">Ocean Spin tidak dapat dimuat sekarang. Koin tidak berubah.</div>'; return; }
    if (mine !== seq || gone) return;
    if (!inst) { box.innerHTML = '<div class="nw-need"><b>Ocean Spin belum dipasang</b><p>Pasang dulu lewat PlayGame (0,8 GB). Setelah terpasang, NusaOcean membuka game yang sama.</p><button type="button" class="pg-cta" data-nw="playgame">Buka PlayGame</button></div>'; return; }
    try { await x.load(["oceanspin.js"]); const m = NW.phoneGames && NW.phoneGames.oceanspin; if (!m) throw new Error("modul tidak ada"); if (mine !== seq || gone) return; box.innerHTML = ""; ocean = m.mount(box, x); }
    catch (e) { if (mine === seq && !gone) box.innerHTML = '<div class="pg-warn" role="alert">Gagal memuat Ocean Spin. Coba lagi nanti.</div>'; }
  }
  function renderPage() {
    closeInner(); const mine = ++seq, t = tab(), c = t.cur, P = BY[c.host] || BY["galat.nusa"];
    if (view === "tabs") { chrome(); pg.innerHTML = `<h3 class="nw-t">Tab (${tabs.length}/${MAX_TABS})</h3>${tabs.map((tb, i) => { const p = BY[tb.cur.host] || BY["galat.nusa"]; return `<div class="nw-tab${i === cur ? " on" : ""}"><button type="button" class="nw-tabgo" data-tab="${i}"><span aria-hidden="true">${p.ic}</span><span><b>${esc(p.title)}</b><small>${esc(shown(tb.cur))}</small></span></button>${tabs.length > 1 ? `<button type="button" class="pg-sm" data-closetab="${i}" aria-label="Tutup tab ${i + 1}">✕</button>` : ""}</div>`; }).join("")}<button type="button" class="pg-cta" data-nw="newtab" ${tabs.length >= MAX_TABS ? "disabled" : ""}>+ Tab baru</button>${tabs.length >= MAX_TABS ? '<p class="nph-hint">Maksimal 3 tab.</p>' : ""}`; return; }
    let h = `<h3 class="nw-t"><span aria-hidden="true">${P.ic}</span> ${esc(P.title)}</h3>`;
    for (const [k, v] of P.body) {
      if (k === "p") h += `<p>${esc(v)}</p>`; else if (k === "h") h += `<h4>${esc(v)}</h4>`; else if (k === "small") h += `<p class="nph-hint">${esc(v)}</p>`;
      else if (k === "ul") h += `<ul>${v.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`; else if (k === "links") h += links(v);
      else if (k === "search") h += '<div class="nw-search"></div>'; else if (k === "oceanspin") h += '<div class="nw-ocean"></div>';
      else if (k === "markah") h += bm.length ? links(bm) + `<div class="nw-bmrm">${bm.map((b) => `<button type="button" class="pg-sm" data-rm="${b}" aria-label="Hapus markah ${esc(BY[b].title)}">✕ ${esc(BY[b].title)}</button>`).join("")}</div>` : '<p class="nph-hint">Belum ada markah. Tekan ☆ di halaman mana pun.</p>';
      else if (k === "galat") h += c.err === "luar" ? `<p>NusaWeb hanya membuka halaman Nusa (alamat berakhiran <b>.nusa</b>). Internet umum tidak tersedia di sini.</p>` : `<p>Halaman <b>${esc(c.addr || "")}</b> tidak ada di pulau Nusa.</p>`;
    }
    if (c.host === "galat.nusa") h += links(["nusa.home"]);
    pg.innerHTML = h; chrome();
    const s = pg.querySelector(".nw-search"); if (s) search_ = mountSearch(s, { esc, q: c.q, open: (host) => navigate({ host, q: "" }) });
    const o = pg.querySelector(".nw-ocean"); if (o) renderOcean(o, mine);
    pg.scrollTop = 0;
  }
  function navigate(c, noPush) { view = "page"; const t = tab(); if (!noPush && (t.cur.host !== c.host || (t.cur.q || "") !== (c.q || ""))) { t.hist.push(t.cur); if (t.hist.length > 30) t.hist.shift(); } t.cur = c; renderPage(); }
  function go(raw) { const r = parse(raw); if (r.err === "kosong") { chrome(); return; } navigate(r.err ? { host: "galat.nusa", q: "", err: r.err, addr: r.addr } : r); }
  addr.addEventListener("focus", () => { try { addr.select(); } catch (e) { /* abaikan */ } });
  body.addEventListener("submit", (e) => { e.preventDefault(); go(addr.value); });
  body.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return; x.N().sfx && x.N().sfx("click"); const t = tab();
    if (b.dataset.go) navigate({ host: b.dataset.go, q: "" });
    else if (b.dataset.nw === "back") { if (view === "tabs") { view = "page"; renderPage(); } else if (t.hist.length) { t.cur = t.hist.pop(); renderPage(); } }
    else if (b.dataset.nw === "home") navigate({ host: "nusa.home", q: "" });
    else if (b.dataset.nw === "star") { const h = t.cur.host; if (bm.includes(h)) bm = bm.filter((i) => i !== h); else if (bm.length < MAX_BM) bm.push(h); bmSet(bm); chrome(); }
    else if (b.dataset.nw === "tabs") { view = view === "tabs" ? "page" : "tabs"; renderPage(); }
    else if (b.dataset.nw === "newtab") { if (tabs.length < MAX_TABS) { tabs.push({ cur: { host: "nusa.home", q: "" }, hist: [] }); cur = tabs.length - 1; view = "page"; renderPage(); } }
    else if (b.dataset.nw === "playgame") x.open("playgame");
    else if (b.dataset.tab !== undefined) { cur = Math.max(0, Math.min(tabs.length - 1, Number(b.dataset.tab))); view = "page"; renderPage(); }
    else if (b.dataset.closetab !== undefined) { const i = Number(b.dataset.closetab); if (tabs.length > 1) { tabs.splice(i, 1); cur = Math.min(cur, tabs.length - 1); renderPage(); } }
    else if (b.dataset.rm) { bm = bm.filter((i) => i !== b.dataset.rm); bmSet(bm); renderPage(); }
  });
  renderPage();
  return { close() { gone = true; closeInner(); }, update() { /* tetap */ }, _state: () => ({ tabs: tabs.length, cur, host: tab().cur.host, hist: tab().hist.length, bm: bm.slice() }) };
}
NW.phoneWeb = Object.assign(NW.phoneWeb || {}, { PAGES, parse, search, mountSearch, pending: null });
NW.phone.registerApp("nusaweb", { mount });
})();
