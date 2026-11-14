// NUSA ISLAND — PlayGame (Ide 07): toko aplikasi internal NusaPhone. Pasang, hapus, kapasitas penyimpanan, progres unduhan, tombol Main.
// KONTRAK OWNER: TEPAT lima game (Ocean Spin, Balap Perahu, Nusa Rush, Karang Blast, Penjaga Laut). Tidak boleh diganti/dikurangi/ditambah tanpa keputusan Owner.
// Status terpasang & penyimpanan = SERVER (phoneState/phoneInstall/phoneUninstall, idempoten opId). "Unduhan" hanya animasi virtual. Empat game offline tidak menyentuh koin/inventaris.
(function () {
"use strict";
const NW = window.NW; if (!NW || !NW.phone || !NW.phoneKit) return;
const GAMES = [
  { id: "oceanspin", name: "Ocean Spin", mb: 800, files: ["oceanspin.js"], tag: "Kaskade ikan. Memakai koin bermain (500/spin).", net: true, color: "#2fb39a", emoji: "🐠" },
  { id: "balapperahu", name: "Balap Perahu", mb: 1200, files: ["g-balap.js"], tag: "Salip perahu, hindari batu.", color: "#ffb347", emoji: "🚤" },
  { id: "nusarush", name: "Nusa Rush", mb: 1400, files: ["g-rush.js"], tag: "Lari tanpa akhir di pantai.", color: "#ff7a59", emoji: "🏃" },
  { id: "karangblast", name: "Karang Blast", mb: 350, files: ["g-karang.js"], tag: "Puzzle blok karang.", color: "#6a5acd", emoji: "🧩" },
  { id: "penjagalaut", name: "Penjaga Laut", mb: 1800, files: ["g-penjaga.js"], tag: "Tembak perompak kartun (lucu, tanpa darah).", color: "#3d9bd4", emoji: "🏝️" },
];
const CK = "nusa_pg_cache_v1", gb = (mb) => String(Math.round(mb) / 1000).replace(".", ",") + " GB";
const rid = () => "pg-" + Array.from({ length: 18 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
const cacheGet = () => { try { const v = JSON.parse(localStorage.getItem(CK) || "null"); return v && Array.isArray(v.inst) ? v : null; } catch (e) { return null; } };
const cacheSet = (s) => { try { localStorage.setItem(CK, JSON.stringify({ inst: s.games.filter((g) => g.installed).map((g) => g.id), total: s.storage.totalMb })); } catch (e) { /* abaikan */ } };

function mount(body, x) {
  const esc = x.esc; let state = null, dl = {}, err = "", cur = null, ctl = null, gone = false, loadErr = "";
  body.innerHTML = '<div class="pg-store"></div><div class="pg-host hidden"></div>';
  const store = body.querySelector(".pg-store"), host = body.querySelector(".pg-host");
  const inst = (id) => (state ? state.games.some((g) => g.id === id && g.installed) : (cacheGet() || { inst: [] }).inst.includes(id));
  const total = () => (state ? state.storage.totalMb : (cacheGet() || { total: 16000 }).total);
  const used = () => 3000 + GAMES.filter((g) => inst(g.id)).reduce((a, g) => a + g.mb, 0);
  function paint() {
    if (gone) return; const on = x.linkOk(), T = total(), U = used(), core = 3000, gm = U - core;
    store.innerHTML = `<div class="pg-stor"><div class="pg-bar" role="img" aria-label="Penyimpanan terpakai ${gb(U)} dari ${gb(T)}"><i class="core" style="width:${(core / T * 100).toFixed(1)}%"></i><i class="gm" style="width:${(gm / T * 100).toFixed(1)}%"></i></div><small>Penyimpanan: ${gb(U)} dari ${gb(T)} · bebas ${gb(T - U)} · inti aplikasi ${gb(core)}</small></div>
${on ? "" : '<p class="pg-warn" role="status">Koneksi terputus: pasang/hapus dan Ocean Spin tidak tersedia. Game offline yang sudah terpasang tetap bisa dimainkan.</p>'}${err ? `<p class="pg-warn" role="alert">${esc(err)}</p>` : ""}
${GAMES.map((g) => { const ins = inst(g.id), d = dl[g.id], free = T - U, canNet = on && state; const act = d ? `<div class="pg-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(d.pct)}"><i style="width:${d.pct}%"></i></div><small>Mengunduh… ${Math.floor(d.pct)}%</small><button type="button" class="pg-sm" data-cancel="${g.id}">Batal</button>`
  : ins ? `<button type="button" class="pg-play" data-play="${g.id}" ${g.net && !canNet ? "disabled" : ""}>Main</button><button type="button" class="pg-sm" data-del="${g.id}" ${canNet ? "" : "disabled"}>Hapus</button>`
  : `<button type="button" class="pg-get" data-get="${g.id}" ${canNet && free >= g.mb ? "" : "disabled"}>${free < g.mb ? "Penyimpanan penuh" : "Pasang"}</button>`;
  return `<div class="pg-row" data-g="${g.id}"><span class="pg-ic" style="background:${g.color}" aria-hidden="true">${g.emoji}</span><div class="pg-info"><b>${esc(g.name)}</b><small>${gb(g.mb)} · ${esc(g.tag)}</small></div><div class="pg-act">${act}</div></div>`; }).join("")}
<p class="nph-hint">Game ini hanya untuk seru-seruan: tidak memberi atau mengambil koin, ikan, atau inventaris${""}. Pengecualian: Ocean Spin memakai koin bermain (aturannya tampil di dalam game).</p>`;
  }
  async function refresh() { if (!x.linkOk()) { paint(); return; } try { const r = await x.call("phoneState", {}); state = r.state; cacheSet(state); err = ""; } catch (e) { err = e && e.code === "unavailable" ? "" : "Gagal memuat status PlayGame."; } paint(); }
  async function install(id) {
    if (dl[id]) return; const g = GAMES.find((q) => q.id === id), dur = x.rm() ? 250 : Math.max(1500, Math.min(6000, g.mb * 3)), t0 = Date.now(); err = "";
    const d = dl[id] = { pct: 0, t: setInterval(async () => {
      if (gone) return clearInterval(d.t); d.pct = Math.min(100, (Date.now() - t0) / dur * 100);
      if (d.pct < 100) { paint(); return; } clearInterval(d.t);
      try { const r = await x.call("phoneInstall", { opId: rid(), game: id }); state = r.state; cacheSet(state); err = ""; } catch (e) { err = e && e.message ? String(e.message) : "Pemasangan gagal."; }
      delete dl[id]; paint(); }, 100) }; paint();
  }
  async function uninstall(id) { err = ""; try { const r = await x.call("phoneUninstall", { opId: rid(), game: id }); state = r.state; cacheSet(state); } catch (e) { err = e && e.message ? String(e.message) : "Gagal menghapus."; } paint(); }
  function stop() { if (ctl) { try { ctl.destroy ? ctl.destroy() : ctl.close && ctl.close(); } catch (e) { /* abaikan */ } ctl = null; } cur = null; host.innerHTML = ""; }
  async function launch(id) {
    const g = GAMES.find((q) => q.id === id); if (!g || !inst(id)) return; cur = id; loadErr = "";
    store.classList.add("hidden"); host.classList.remove("hidden"); host.innerHTML = '<div class="nph-lockpane"><div class="nph-lock-ic" aria-hidden="true">⏳</div><b>Memuat…</b></div>';
    try { await x.load(g.files); const m = NW.phoneGames && NW.phoneGames[id]; if (!m) throw new Error("modul game tidak ada"); if (cur !== id || gone) return; host.innerHTML = ""; ctl = m.mount(host, x); }
    catch (e) { host.innerHTML = '<div class="nph-lockpane"><div class="nph-lock-ic" aria-hidden="true">⚠️</div><b>Gagal memuat game</b><p>Coba lagi nanti.</p></div>'; }
  }
  function sync() {
    if (gone) return;
    if (x.sub() > 0 && cur) { if (cur === "oceanspin" && !x.linkOk()) { stop(); host.classList.remove("hidden"); store.classList.add("hidden"); host.innerHTML = '<div class="nph-lockpane" role="alert"><div class="nph-lock-ic" aria-hidden="true">📡</div><b>Koneksi terputus</b><p>Ocean Spin membutuhkan server. Koin tidak berubah.</p></div>'; } return; }
    if (cur || !host.classList.contains("hidden")) { stop(); host.classList.add("hidden"); store.classList.remove("hidden"); refresh(); } else paint();
  }
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return; x.N().sfx && x.N().sfx("click");
    if (b.dataset.get) install(b.dataset.get); else if (b.dataset.cancel) { const d = dl[b.dataset.cancel]; if (d) { clearInterval(d.t); delete dl[b.dataset.cancel]; paint(); } }
    else if (b.dataset.del) { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Yakin?"; setTimeout(() => { if (b.isConnected) { b.dataset.sure = ""; b.textContent = "Hapus"; } }, 3000); return; } uninstall(b.dataset.del); }
    else if (b.dataset.play) { cur = b.dataset.play; x.deeper(); }
  });
  paint(); refresh();
  return { update() { if (x.sub() > 0 && cur && !ctl && !host.querySelector(".nph-lockpane")) launch(cur); sync(); }, close() { gone = true; for (const k of Object.keys(dl)) clearInterval(dl[k].t); stop(); } };
}
NW.phone.registerApp("playgame", { mount });
})();
