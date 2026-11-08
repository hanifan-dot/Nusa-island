// NUSA ISLAND — Samudra Follower V2 (klien): gerbang 100 ikan, perjalanan, HUD Pity, tangkapan di pulau, Buku Koleksi.
// PRINSIP KEAMANAN: klien TIDAK menentukan rarity, spesies, bobot, Pity, jumlah tangkapan, atau Penemu Pertama. Semua itu hasil server (ecoSf2Catch);
// klien hanya menampilkan. Selama memancing di pulau, ikan "bayangan" dipakai untuk minigame tarik-ulur; hasil sebenarnya baru diketahui setelah server menjawab.
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const C = window.NusaSF2Core; if (!C) return;
const N = () => window.Nusa, S = () => (N() && N().S) || null;
const $ = (id) => document.getElementById(id);
const RCOL = { common: "#7fb59f", uncommon: "#5fc77a", rare: "#4aa3df", epic: "#b56ce8", mythic: "#f0b53a", owner: "#ffd24a" };
const OLDR = { common: "biasa", uncommon: "biasa", rare: "langka", epic: "epik", mythic: "legenda", owner: "legenda" };
const HLBL = { karang: "Terumbu Karang", muara: "Muara", danau: "Danau Air Tawar", dalam: "Laut Dalam" };
const LOCK_MSG = "Samudra Follower terkunci. Tangkap 100 ikan untuk membuka perjalanan!";
const f1 = (n) => String(n).replace(".", ",");
const pc = (n) => (Math.round(n * 100) / 100).toFixed(2).replace(".", ",") + "%";
let info = null, lastFetch = 0, fetching = false, hud = null, opSeq = 0, landing = false;

const isSf2 = (id) => C.isSpecies(id);
const active = () => !!(NW.areas && NW.areas.cur && NW.areas.cur.id === "sf2");

// ---- daftar spesies ke tabel pencarian klien (bukan ke FISH: kolam ikan lama tak tersentuh). sf:true → memakai jalur harga per-kg server (item.sp) & gambar khusus.
function register() {
  const F = N() && N().FISH_BY_ID; if (!F) return false;
  for (const s of C.SPECIES) if (!F[s.id]) F[s.id] = { id: s.id, name: s.name, rarity: OLDR[s.rarity], sfRarity: s.rarity, loc: "samudra", price: 0, wMin: s.wMin, wMax: s.wMax, sf: true, sf2: true, desc: s.desc, emoji: null, obs: !!s.obs };
  return true;
}
const t0 = setInterval(() => { if (register() && patchSf()) clearInterval(t0); }, 200); setTimeout(() => clearInterval(t0), 30000);
function patchSf() {   // pil rarity di Inventaris memakai NW.sf.rar(f): beri warna/label rarity V2
  if (!NW.sf) return false; if (NW.sf._p2) return true; const o = NW.sf.rar;
  NW.sf.rar = (f) => (f && f.sf2 ? { label: C.RLABEL[f.sfRarity], color: RCOL[f.sfRarity] } : o(f)); NW.sf._p2 = 1; return true;
}

// ---- status dari server (read-only)
let nextTry = 0, fails = 0;
const retryGap = (n, base) => Math.min(300000, base * Math.pow(2, Math.min(n, 8)));   // HEMAT KUOTA: jeda coba-ulang membesar saat server gagal (maks 5 menit), kembali normal begitu berhasil
async function refresh(force) {
  const E = NW.eco; if (!E || fetching || !E.active()) return info;
  if (!force && info && Date.now() - lastFetch < 30000) return info;
  fetching = true;
  try { const r = await E.sf2Info(); info = r && r.on ? r : (r && r.off ? { off: true } : null); lastFetch = Date.now(); fails = 0; nextTry = Date.now() + 10000; }
  catch (e) { info = null; lastFetch = Date.now() - 20000; fails++; nextTry = Date.now() + retryGap(fails, 10000); }   // dulu: gagal → info=null → dicoba lagi tiap 700 ms
  finally { fetching = false; }
  if (NW.d1 && info) NW.d1.shadowSf(info);   // D1 shadow: dibatasi ≥5 mnt di inti; bawaan off = tidak ada request
  paintHud(); const w = $("panelWrap"); if (w && !w.classList.contains("hidden") && NW._sf2Panel) NW._sf2Panel();
  return info;
}
const have = () => (info && info.have) || 0;
const unlocked = () => !!(info && info.unlocked);
function canGo() { return unlocked(); }
function tabOn() { const Sx = S(); return unlocked() || !!(Sx && Sx.dex && C.SPECIES.some((x) => Sx.dex[x.id] && Sx.dex[x.id].n > 0)); }   // tab koleksi pulau: baru muncul setelah terbuka / pernah menangkap
function lockText() {
  if (info && info.off) return "Samudra Follower belum dibuka.";
  return LOCK_MSG + (info ? ` (${Math.min(have(), 100)}/100)` : " Masuk akun untuk memeriksa progres.");
}

// ---- kartu di Peta Nusantara
function cardHTML(i) {
  refresh(false); register();
  const ok = unlocked(), here = !!(S() && S().loc === i), prog = Math.min(have(), 100);
  const sw = `linear-gradient(180deg,#9ee3f5 0 45%,#1f9bc4 46%,#0c5f8e)`;
  return `<div class="map-item sf2-card ${here ? "here" : ""} ${ok ? "" : "locked"}" data-sf2="1">
    <div class="sw" style="background:${sw}"></div>
    <div class="grow"><b>🌴 Samudra Follower — Pulau Para Legenda</b>
      <div class="muted">Pulau tropis komunitas: 5 kategori ikan, Pity Mythic, dan makhluk ide pengikut.</div>
      ${ok ? `<div class="muted">Pity Mythic ${info.pity}/${info.pityMax} · Koleksi ${Object.keys(info.disc || {}).length} spesies</div>` : `<div class="muted sf2-lock">🔒 ${lockText()}</div><div class="sf2-prog"><i style="width:${prog}%"></i></div>`}</div>
    ${here ? `<span class="muted">📍 Di sini</span>` : ok ? `<button class="btn" data-act="go" data-arg="${i}">⛵ BERLAYAR</button>` : `<span class="muted">🔒 ${prog}/100</span>`}</div>`;
}
NW._sf2Panel = () => { try { if (N().openPanel && document.querySelector(".map-item.sf2-card")) N().openPanel("map"); } catch (e) {} };
function gate() {   // dipanggil travel(): true = boleh berlayar
  if (unlocked()) return true;
  N().toast("🔒 " + lockText(), "bad"); refresh(true); return false;
}

// ---- memancing di pulau: ikan bayangan untuk minigame; hasil asli dari server
function pendingFish() {   // HOTFIX: "power" wajib ada (tanpa itu kekuatan ikan NaN → minigame membeku setelah Strike). Hanya kesulitan minigame; rarity/spesies/Pity tetap diundi server saat mendarat.
  const fish = { id: "sf2_unknown", name: "Penghuni Samudra", rarity: "biasa", wMin: 2, wMax: 22, power: 3, price: 0, loc: "samudra", emoji: "🌊", desc: "", sf2pending: true };
  const r = NW.FM.rollWeight(fish);
  return { fish, w: r.w, wr: r.wr, extreme: false, sf2: true, opId: "s2-" + Date.now().toString(36) + "-" + (++opSeq).toString(36) + Math.random().toString(36).slice(2, 8) };
}
async function callCatch(spot, opId) {   // satu opId untuk semua percobaan ulang → server tidak pernah memberi dua ikan
  let err = null;
  for (let a = 0; a < 3; a++) {
    try { return await NW.eco.sf2Catch(spot, opId); }
    catch (e) { err = e; const c = e && (e.code || (e.details && e.details.code) || ""); if (/failed-precondition|invalid-argument|resource-exhausted|permission|unauthenticated/.test(String(c) + " " + (e && e.message))) break; await new Promise((r) => setTimeout(r, 700 * (a + 1))); }
  }
  throw err || new Error("gagal");
}
async function land(pend, host) {
  if (landing) return; landing = true;
  const spot = NW.world && NW.world.fishSpot ? NW.world.fishSpot() : null;
  try {
    if (!NW.eco || !NW.eco.active()) throw new Error("Masuk akun dulu untuk memancing di Samudra Follower.");
    const r = await callCatch(spot, pend.opId);
    if (!r || !r.ok || !r.fish || !isSf2(r.fish.id)) throw new Error("Jawaban server tidak valid.");
    register(); applyResult(r, host);
  } catch (e) {
    host.fail(); N().toast("⚠️ " + (e && e.message ? e.message : "Tangkapan tidak tersimpan, coba lagi."), "bad"); refresh(true);
  } finally { landing = false; }
}
function applyResult(r, host) {
  const Sx = S(), f = r.fish, sp = C.BY_ID[f.id];
  const rec = Sx.dex[f.id] || { n: 0, best: 0 }; rec.n++; rec.best = Math.max(rec.best, f.w); Sx.dex[f.id] = rec; Sx.stats.caught++;
  if (f.uid && !f.obs && !Sx.cooler.some((x) => x.uid === f.uid)) Sx.cooler.push({ uid: f.uid, id: f.id, w: f.w, t: Date.now(), sp: f.sp, lock: f.rarity === "mythic" || f.rarity === "epic" });
  if (info) { info.pity = r.pity; info.band = r.band; info.caught = r.caught; info.disc = Object.assign({}, info.disc, { [f.id]: 1 }); if (r.first) info.mine = Object.assign({}, info.mine, { [f.id]: 1 }); if (r.odds) info.odds = r.odds; }
  lastFetch = 0; N().save(); N().refreshHUD && N().refreshHUD();
  const gain = r.pityBefore != null && r.pity > r.pityBefore;
  const bo = r.bonus && C.isSpecies(r.bonus.id) ? r.bonus : null;   // OWNER FISH: bonus (diundi server, independen dari rarity/Pity) — kartu istimewa; ikan biasa tetap masuk Coolbox
  if (bo) { const rb = Sx.dex[bo.id] || { n: 0, best: 0 }; rb.n++; rb.best = Math.max(rb.best, bo.w); Sx.dex[bo.id] = rb; if (info) info.disc = Object.assign({}, info.disc, { [bo.id]: 1 }); register(); }
  if (bo) { const osp = C.BY_ID[bo.id], rr = Object.assign({}, r, { fish: { id: bo.id, rarity: "owner", w: bo.w, obs: true, uid: null, value: 0 }, isNew: !!bo.isNew, first: false, mythic: false, extra: f.id });
    host.show(N().FISH_BY_ID[bo.id], bo.w, { isNew: !!bo.isNew, isRecord: false, reward: 0, vr: "normal", giant: false, uid: null, locked: false }, () => decorate(rr, osp));
    paintHud(gain, false); N().sfx("mistis_tangkap"); N().toast("👑 OWNER FISH! Keberuntungan langka 0,02% — selamat!", "good"); refresh(true); return; }
  host.show(N().FISH_BY_ID[f.id], f.w, { isNew: !!r.isNew, isRecord: false, reward: 0, vr: "normal", giant: false, uid: f.uid, locked: !!(f.uid && (f.rarity === "mythic" || f.rarity === "epic")) }, () => decorate(r, sp));
  paintHud(gain, r.mythic);
  if (r.mythic) { N().sfx("mistis_tangkap"); N().toast(r.guaranteed ? "🌟 MYTHIC TERJAMIN! Pity 100/100 terpenuhi!" : "🌟 MYTHIC! Pity kembali ke 0.", "good"); }
  refresh(true);
}
function decorate(r, sp) {   // ganti label/warna kartu tangkapan bawaan dengan rarity V2 + lencana
  const f = r.fish, col = RCOL[f.rarity], card = $("catchCard"); if (!card) return;
  card.style.setProperty("--rc", col); card.style.setProperty("--glow", col + "99");
  $("catchRarity").textContent = (f.rarity === "mythic" ? "🌟 " : f.rarity === "owner" ? "👑 " : "") + C.RLABEL[f.rarity];
  const b = [];
  if (r.first) b.push("🏅 PENEMU PERTAMA!");
  if (r.isNew) b.push("✨ Baru di koleksi"); if (f.uid && (f.rarity === "mythic" || f.rarity === "epic")) b.push("🔒 Otomatis terkunci");
  b.push(HLBL[sp.hab[0]] ? "📍 " + HLBL[sp.hab[0]] : "");
  b.push(f.obs ? "👁️ Koleksi pengamatan (tidak dijual)" : `🪙 ${f.value} koin`);
  if (f.rarity === "owner" && r.extra && C.BY_ID[r.extra]) b.push("🎣 Tangkapan biasa: " + C.BY_ID[r.extra].name + " tetap masuk Coolbox");
  b.push(`Pity ${r.pity}/${C.PITY_MAX}`);
  $("catchBadges").innerHTML = b.filter(Boolean).map((x) => `<span>${x}</span>`).join("");
  card.classList.toggle("sf2-mythic", f.rarity === "mythic"); if (f.rarity === "mythic") card.classList.add("playing");
  card.classList.toggle("sf2-owner", f.rarity === "owner"); if (f.rarity === "owner") card.classList.add("playing");
}

// ---- HUD Pity (hanya di pulau)
function buildHud() {
  if (hud) return hud; hud = document.createElement("div"); hud.id = "sf2Hud"; hud.className = "hidden";
  hud.innerHTML = `<div class="t">SAMUDRA FOLLOWER</div><div class="p"><span id="sf2P">Pity Mythic 0/100</span></div><div class="bar"><i id="sf2B"></i></div><div class="o"><span id="sf2O">Mythic 2,00%</span><button id="sf2I" aria-label="Info peluang">ⓘ</button></div>`;
  document.body.appendChild(hud); $("sf2I").addEventListener("click", (e) => { e.stopPropagation(); openOdds(); }); return hud;
}
function paintHud(bump, mythic) {
  buildHud(); const on = active() && (!!info && !info.off); hud.classList.toggle("hidden", !on); if (!on) return;
  const p = info.pity || 0, o = (info.odds && info.odds.mythic) != null ? info.odds.mythic : 2;
  $("sf2P").textContent = `Pity Mythic ${p}/${info.pityMax || 100}`; $("sf2B").style.width = Math.min(100, p) + "%"; $("sf2O").textContent = "Mythic " + pc(o);
  hud.classList.toggle("near", p >= 80); if (bump) { hud.classList.remove("bump"); void hud.offsetWidth; hud.classList.add("bump"); }
  if (mythic) { hud.classList.remove("myth"); void hud.offsetWidth; hud.classList.add("myth"); }
}
setInterval(() => { if (!document.hidden) { const was = hud && !hud.classList.contains("hidden"); if (active() && !info && Date.now() >= nextTry) refresh(false); if (was !== active()) paintHud(); } }, 700);

// ---- panel informasi peluang & Pity
function overlay(html) {
  let ov = $("sf2Ov"); if (!ov) { ov = document.createElement("div"); ov.id = "sf2Ov"; document.body.appendChild(ov); ov.addEventListener("click", (e) => { if (e.target === ov || e.target.dataset.sf2x) ov.classList.remove("on"); }); }
  ov.innerHTML = `<div class="sf2-box">${html}<div class="row"><button data-sf2x="1" class="pri">Tutup</button></div></div>`; ov.classList.add("on");
}
function openOdds() {
  const p = info ? info.pity : 0, o = C.odds(Math.min(99, p)), band = C.band(p);
  const rows = C.RARITIES.map((k) => `<tr><td><b style="color:${RCOL[k]}">${C.RLABEL[k]}</b></td><td>${pc(C.pct(o[k]))}</td></tr>`).join("");
  const tb = [0, 20, 40, 60, 80].map((s, i) => { const q = C.odds(s); return `<tr class="${i === band ? "on" : ""}"><td>${s}–${s + 19}</td><td>${pc(C.pct(q.epic))}</td><td>${pc(C.pct(q.mythic))}</td><td>${pc(C.pct(q.common))}</td></tr>`; }).join("");
  const own = `<tr class="own"><td><b style="color:${RCOL.owner}">👑 ${C.RLABEL.owner}</b></td><td>${pc(C.OWNER_BP / 100)} <small>bonus terpisah</small></td></tr>`;
  overlay(`<h3>Peluang Samudra Follower</h3><p class="muted">Pity Mythic <b>${p}/100</b>. Peluang di bawah berlaku untuk tangkapan berikutnya.</p><table>${rows}${own}</table>
    <p class="muted"><b>OWNER FISH</b>: undian bonus independen ${pc(C.OWNER_BP / 100)} (sekitar 1 dari ${Math.round(10000 / C.OWNER_BP).toLocaleString("id-ID")}) di setiap tangkapan sah, untuk semua pemain. Diundi server, tidak mengubah Pity Mythic atau peluang di atas, tidak bisa dibeli, dan tidak bisa dijual.</p>
    <p class="muted">Tiap 20 tangkapan tanpa Mythic, Epic dan Mythic naik +0,20% (diambil dari Common). Peluang dasar Mythic 2,00%. Tangkapan ke-100 tanpa Mythic <b>pasti Mythic</b>. Mythic mengembalikan Pity ke 0. Gagal/batal memancing tidak menambah Pity. Meninggalkan pulau tidak mereset Pity.</p>
    <table class="tb"><tr><th>Pity</th><th>Epic</th><th>Mythic</th><th>Common</th></tr>${tb}</table><p class="muted">Peluang ditentukan server, bukan oleh game di ponselmu. Tidak ada kotak/gacha berbayar.</p>`);
}

// ---- interaksi di pulau
function interact(t, api) {
  const open = api.openDialog;
  if (t.id === "boat") return open({ name: "Kapalmu", avatar: "⛵", lines: ["Kapalmu bersandar di dermaga utama Pulau Para Legenda.", "Pulang ke Muara Kampung?"], options: [{ label: "⛵ Pulang ke Muara Kampung", act: () => NW.adv.travelTo("muara") }, { label: "🗺️ Buka Peta", act: () => N().openPanel("map") }] });
  if (t.id === "papan") return open({ name: "Papan Legenda Komunitas", avatar: "📜", lines: ["Papan Legenda memuat ikan & makhluk hasil ide para pengikut Nusa Island. Tulisan di sini bertambah setiap ada penemuan baru."], options: [{ label: "📖 Buka Buku Koleksi", act: () => { api.closeDialog(); N().setDexTab("samudra"); N().openPanel("dex"); } }, { label: "ⓘ Peluang & Pity", act: () => { api.closeDialog(); openOdds(); } }] });
  return false;
}
function talkGuard(n, api) {
  api.openDialog({ name: "Pak Jangkar", avatar: "⚓", role: "Penjaga dermaga", npc: n, lines: ["Selamat datang di Pulau Para Legenda! Empat tempat memancing: Laut Dalam di ujung dermaga, Karang di barat, Danau di tengah pulau, dan Muara di timur.", "Makhluk besar hanya muncul di laut dalam… tapi semua tempat bisa memberi ikan dari lima kategori. Pity Mythic tidak hilang saat kamu pulang."],
    options: [{ label: "ⓘ Peluang & Pity", act: () => { api.closeDialog(); openOdds(); } }] });
}

// ---- Buku Koleksi (halaman, ringan untuk 1.000 entri: hanya halaman aktif yang dirender)
let bookPage = 0, bookFilter = "all";
function stateOf(id) { const r = S() && S().dex[id]; return r && r.n > 0 ? r : null; }
function entries() {
  const list = C.SPECIES.map((s) => ({ id: s.id, nm: s.name, r: s.rarity, hab: s.hab[0], c: !!s.community, obs: !!s.obs, desc: s.desc, cr: s.credit || [] }));
  const leg = (window.NusaSFCatalog ? window.NusaSFCatalog.FISH : []).map((f) => ({ id: f.id, nm: f.name, r: "mythic", hab: "dalam", c: true, legacy: true, desc: f.desc || "", cr: [f.credit] }));
  return leg.concat(list).filter((e) => bookFilter === "all" || e.r === bookFilter);
}
function bookHTML() {
  refresh(false); register(); const all = entries(), per = 8, pages = Math.max(1, Math.ceil(all.length / per)); bookPage = Math.min(bookPage, pages - 1);
  const comm = C.SPECIES.filter((s) => s.community).length + (window.NusaSFCatalog ? window.NusaSFCatalog.FISH.length : 0), disc = C.SPECIES.filter((s) => stateOf(s.id)).length;
  let h = `<div class="sf2-book"><div class="sf2-sum"><div><b>${comm}</b>/${C.CATALOG_MAX.toLocaleString("id-ID")}<small>Katalog komunitas</small></div><div><b>${disc}</b>/${C.SPECIES.length}<small>Spesies ditemukan</small></div><div><b>${info ? info.caught || 0 : "—"}</b><small>Tangkapan pulau</small></div></div>
    <div class="sf2-flt">${["all"].concat(C.RARITIES).map((k) => `<button data-act="sf2f" data-arg="${k}" class="${bookFilter === k ? "on" : ""}">${k === "all" ? "Semua" : C.RLABEL[k]}</button>`).join("")}<button data-act="sf2o">ⓘ Peluang</button></div><div class="sf2-list">`;
  for (const e of all.slice(bookPage * per, bookPage * per + per)) {
    const st = stateOf(e.id), mine = info && info.mine && info.mine[e.id], col = RCOL[e.r];
    h += `<div class="sf2-row" style="--c:${col}"><img src="${st && NW.sfDraw ? NW.sfDraw.sprite(e.id, 120, 70) : ""}" alt="" class="${st ? "" : "unk"}"><div class="g"><b>${st ? e.nm : "???"}</b> <span class="rb" style="background:${col}">${C.RLABEL[e.r]}</span>${mine ? ` <span class="pf">🏅 PENEMU PERTAMA</span>` : ""}${e.cr && e.cr.length ? `<div class="muted sf2-cr">📸 ${e.cr.join(", ")}</div>` : ""}<div class="muted">${st ? `×${st.n} · terbaik ${f1(Math.round(st.best * 100) / 100)} kg${e.obs ? " · 👁️ pengamatan" : ""}` : `Habitat: ${HLBL[e.hab] || "—"}`}</div></div></div>`;
  }
  h += `</div><div class="sf2-pg"><button data-act="sf2p" data-arg="-1" ${bookPage <= 0 ? "disabled" : ""}>‹</button><span>${bookPage + 1}/${pages}</span><button data-act="sf2p" data-arg="1" ${bookPage >= pages - 1 ? "disabled" : ""}>›</button></div><p class="muted">Tangkapan = jumlah ikan. Spesies ditemukan = jenis berbeda. Spesies nonaktif tetap tersimpan di koleksimu.</p></div>`;
  return h;
}
function act(a, arg) {   // dipanggil game.js untuk data-act sf2*
  if (a === "sf2f") { bookFilter = arg; bookPage = 0; } else if (a === "sf2p") bookPage = Math.max(0, bookPage + (+arg || 0)); else if (a === "sf2o") { openOdds(); return true; } else return false;
  return "render";
}
// hook dari world (area.on enter): pastikan HUD & status
document.addEventListener("visibilitychange", () => { if (!document.hidden && active()) refresh(true); });
NW.sf2 = { isSf2, active, canGo, tabOn, gate, cardHTML, bookHTML, act, pendingFish, land, interact, talkGuard, refresh, info: () => info, openOdds, register, lockText, _reset: () => { info = null; lastFetch = 0; landing = false; } };
})();
