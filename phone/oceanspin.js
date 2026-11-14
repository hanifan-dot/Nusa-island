// NUSA ISLAND — Ocean Spin (Ide 07, PlayGame 0,8 GB virtual). KLIEN HANYA MENGANIMASIKAN: peluang, biaya, kombo, berat ikan, dan hadiah semuanya ditentukan SERVER (oceanInfo / oceanSpin).
// Biaya 500 koin BERMAIN per spin (1–10 spin, dipotong server sebelum animasi). Koin hasil top-up tidak bisa dipakai. Tidak ada pencairan/transfer. Dibuka dari PlayGame DAN dari NusaWeb (nusaocean.nusa) — modul yang SAMA.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}); NW.phoneGames = NW.phoneGames || {};
const SYM = ["🐠", "🐟", "🦀", "🪼", "🦑", "🐡", "🦈"], MEGA = 6;
const TEASE = ["Ikan-ikan lagi arisan, kamu belum diundang.", "Gelembungnya kosong. Mungkin ikannya lagi tidur siang.", "Umpannya dimakan kepiting iseng. Tos dulu!", "Laut sedang pelit senyum. Besok pasti cerah!", "Ubur-ubur bilang: sabar itu indah.", "Kali ini cuma gelembung. Tapi gelembungnya cantik, kan?", "Si cumi menyemprot tinta kosong. Coba lagi kalau mau!", "Ikannya lagi sibuk selfie. Belum mau keluar."];
const PK = "nusa_os_pending_v1";
const rid = () => "os-" + Array.from({ length: 18 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const pend = { get() { try { const v = JSON.parse(localStorage.getItem(PK) || "null"); return v && typeof v.opId === "string" && Number.isInteger(v.n) ? v : null; } catch (e) { return null; } }, set(v) { try { localStorage.setItem(PK, JSON.stringify(v)); } catch (e) { /* abaikan */ } }, clear() { try { localStorage.removeItem(PK); } catch (e) { /* abaikan */ } } };

function mount(host, x) {
  const esc = x.esc; let info = null, n = 1, busy = false, skip = false, gone = false, msgTimer = 0;
  host.innerHTML = `<div class="os"><div class="os-top"><span>🪙 <b data-r="bal">–</b> koin bermain</span><span>🧊 ruang <b data-r="free">–</b></span></div>
<div class="os-wrap"><div class="os-board" data-r="board" role="img" aria-label="Papan Ocean Spin 5 kali 3">${Array.from({ length: 15 }, () => '<i class="os-c">🐠</i>').join("")}</div><div class="os-fx hidden" data-r="fx" aria-hidden="true"></div></div>
<div class="os-msg" data-r="msg" role="status" aria-live="polite">Pilih jumlah spin lalu tekan SPIN.</div>
<div class="os-ctl"><div class="os-n" role="group" aria-label="Jumlah spin"><button type="button" data-d="-1" aria-label="Kurangi">−</button><b data-r="n">1</b><button type="button" data-d="1" aria-label="Tambah">+</button></div><div class="os-q">${[1, 3, 5, 10].map((v) => `<button type="button" data-q="${v}">${v}×</button>`).join("")}</div></div>
<button type="button" class="os-spin" data-r="spin">SPIN · <span data-r="cost">500</span> koin</button><button type="button" class="os-skip hidden" data-r="skip">Lewati animasi</button>
<p class="os-hint">Biaya 500 koin <b>bermain</b> per spin, dipotong sebelum spin berjalan. Koin hasil top-up tidak bisa dipakai di sini.</p>
<div class="os-odds" data-r="odds"></div><div class="os-held" data-r="held"></div></div>`;
  const R = (k) => host.querySelector(`[data-r="${k}"]`), cells = () => [...R("board").children];
  const setBoard = (b, fall) => { cells().forEach((c, i) => { const v = b[i]; if (c.dataset.v !== String(v)) { c.dataset.v = v; c.textContent = SYM[v]; c.classList.toggle("fall", !!fall && !x.rm() && !skip); } c.classList.remove("pop", "mega"); }); };
  const msg = (t, cls) => { const m = R("msg"); m.textContent = t; m.className = "os-msg" + (cls ? " " + cls : ""); };
  const wait = (ms) => (skip ? sleep(8) : sleep(x.rm() ? Math.min(ms, 160) : ms));
  function paint() {
    if (!info) return; R("bal").textContent = fmt(info.bal); R("free").textContent = String(info.free); R("n").textContent = String(n); R("cost").textContent = fmt(500 * n);
    const sp = R("spin"); sp.disabled = busy || info.bal < 500 * n; sp.setAttribute("aria-disabled", String(sp.disabled));
    host.querySelectorAll("[data-d],[data-q]").forEach((b) => { b.disabled = busy; });
    const t = info.table; R("odds").innerHTML = `<b>Peluang & hadiah (tampil sebelum SPIN)</b><table><thead><tr><th>Hasil</th><th>Peluang</th></tr></thead><tbody>${t.tiers.map((r) => `<tr><td>${r.prize ? esc(r.prize.name) + (r.prize.fx ? " ⚡" : "") + `<small> · ${r.prize.kg[0] === r.prize.kg[1] ? r.prize.kg[0] + " kg" : r.prize.kg[0] + "–" + r.prize.kg[1] + " kg × kombo"}</small>` : "Zonk (tidak ada hadiah)"}</td><td>${esc(r.pct)}</td></tr>`).join("")}</tbody></table>
<small>Kombo dalam satu spin: ${t.combo.map((c) => `×${c.mult} ${esc(c.pct)}`).join(" · ")} (maks ×${t.maxMult}). ${esc(t.weightRule)}</small><small>${esc(t.status)}</small><ul>${t.rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`;
    const h = info.held || []; R("held").innerHTML = h.length ? `<b>Koleksi hadiah (memakai ruang Coolbox)</b>${h.slice(0, 12).map((f) => `<div class="os-h"><span>${esc(f.name)} · ${f.w} kg</span><button type="button" data-rel="${esc(f.u)}">Lepas</button></div>`).join("")}<small>Ikan hadiah hanya koleksi: dijual 1 koin, tidak bisa dicairkan atau dipindah.</small>` : "";
  }
  async function refresh() { try { info = await x.call("oceanInfo", {}); if (!gone) paint(); } catch (e) { if (!gone) msg(e && e.code === "unavailable" ? "Koneksi terputus." : "Ocean Spin sedang tidak tersedia.", "bad"); } }
  async function play(r) {
    busy = true; skip = false; R("skip").classList.toggle("hidden", r.spins.length < 1); paint(); const prizes = [];
    for (let i = 0; i < r.spins.length && !gone; i++) {
      const s = r.spins[i]; setBoard(s.board, true); R("fx").className = "os-fx hidden"; msg(`Spin ${i + 1}/${r.spins.length}…`); await wait(520);
      for (let k = 0; k < s.steps.length && !gone; k++) {
        const st = s.steps[k], cs = cells(); const mg = st.sym === MEGA;
        if (mg) { R("fx").textContent = "BOOM!"; R("fx").className = "os-fx boom"; R("board").classList.toggle("shake", !x.rm() && !skip); st.clear.forEach((c) => cs[c].classList.add("mega")); msg("Tiga Megalodon!", "hot"); await wait(700); R("board").classList.remove("shake"); R("fx").className = "os-fx hidden"; }
        st.clear.forEach((c) => cs[c].classList.add("pop")); msg(`Kombo ×${st.mult}`, "hot"); await wait(480); setBoard(st.after, true); await wait(380);
      }
      if (s.prize) { prizes.push(s.prize); const z = s.prize.fx === "petir"; R("fx").className = "os-fx hidden"; msg("", ""); R("msg").innerHTML = `<span class="os-card${z ? " zeus" : ""}"><b>${z ? "⚡ " : "🎁 "}${esc(s.prize.name)}</b><small>${s.prize.w} kg${s.mult > 1 ? " · kombo ×" + s.mult : ""} — masuk Koleksi hadiah</small></span>`; R("msg").className = "os-msg win" + (z && !x.rm() && !skip ? " bolt" : ""); await wait(z ? 1700 : 1100); }
      else { msg(TEASE[Number.isInteger(s.tease) ? s.tease % TEASE.length : 0], "zonk"); await wait(850); }
    }
    R("skip").classList.add("hidden"); busy = false;
    if (r.spins.length > 1 || !gone) { const tot = prizes.length; msg(tot ? `Selesai: ${tot} ikan hadiah dari ${r.spins.length} spin.` : `Selesai: ${r.spins.length} spin, kali ini tanpa hadiah.`, tot ? "win" : ""); }
    await refresh();
  }
  async function send(opId, nn, recovering) {
    for (let a = 0; a < 3 && !gone; a++) {
      try { const r = await x.call("oceanSpin", { opId, n: nn }); pend.clear(); if (info) info.bal = r.own; return r; }
      catch (e) { const code = e && e.code; if (code === "unavailable" || code === "internal" || /network|offline|terputus/i.test(String(e && e.message))) { msg("Koneksi bermasalah, memulihkan hasil spin…", "bad"); await sleep(1200 * (a + 1)); continue; } pend.clear(); throw e; }
    }
    throw Object.assign(new Error("Koneksi terputus. Buka lagi Ocean Spin untuk memulihkan hasil (koin tidak terpotong dua kali)."), { code: "unavailable", keep: true });
  }
  async function doSpin(opId, nn, recovering) {
    if (busy) return; busy = true; paint(); msg(recovering ? "Memulihkan hasil spin sebelumnya…" : "Menghubungi server…");
    try { const r = await send(opId, nn, recovering); busy = false; await play(r); }
    catch (e) { busy = false; msg(e && e.message ? String(e.message) : "Spin gagal. Saldo tidak berubah.", "bad"); await refresh(); }
  }
  host.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b || busy && !b.dataset.rel && b !== R("skip")) return;
    if (b === R("spin")) { if (!info || b.disabled) return; const opId = rid(); pend.set({ opId, n }); x.N().sfx && x.N().sfx("click"); doSpin(opId, n, false); }
    else if (b === R("skip")) { skip = true; }
    else if (b.dataset.d) { n = Math.max(1, Math.min(10, n + Number(b.dataset.d))); paint(); }
    else if (b.dataset.q) { n = Number(b.dataset.q); paint(); }
    else if (b.dataset.rel) {
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Yakin?"; setTimeout(() => { if (b.isConnected) { b.dataset.sure = ""; b.textContent = "Lepas"; } }, 3000); return; }
      b.disabled = true; try { await x.call("ecoDrop", { opId: rid(), uids: [b.dataset.rel] }); } catch (er) { msg("Gagal melepas ikan.", "bad"); } await refresh();
    }
  });
  (async () => { await refresh(); const p = pend.get(); if (p && !gone) { n = p.n; paint(); doSpin(p.opId, p.n, true); } })();
  return { close() { gone = true; clearTimeout(msgTimer); host.innerHTML = ""; }, update() { /* tetap */ }, _info: () => info, _state: () => ({ busy, n }) };
}
NW.phoneGames.oceanspin = { title: "Ocean Spin", mount };
})();
