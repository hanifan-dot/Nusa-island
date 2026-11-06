// =========================================================
//  NUSA ISLAND — panel "Kolam Ikanku" (Masukkan Ikan · Ambil Ikan · Beri Makan · Toko Kolam · Upgrade Kolam).
//  Hanya tampilan + permintaan ke NW.pond (server memutuskan). Tidak ada koin/ikan diubah langsung di sini.
// =========================================================
(() => {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa, PC = () => window.NusaPondCore, POND = () => NW.pond;
const wrap = document.createElement("div"); wrap.id = "pondWrap"; wrap.className = "pd-wrap hidden";
wrap.innerHTML = '<div class="pd-card" role="dialog" aria-label="Kolam Ikanku"><div class="pd-head"><b>🐟 Kolam Ikanku</b><span class="pd-coin" id="pdCoin"></span><button class="pd-x" id="pdX" aria-label="Tutup">✕</button></div><div class="pd-body" id="pdBody"></div><div id="pdSheet"></div></div>';
document.body.appendChild(wrap);
const $ = (id) => document.getElementById(id), body = $("pdBody");
const ui = { open: false, view: "main", sel: new Set(), qty: {}, confirm: null, working: false, tick: 0, sync: 0, player: null, reopen: 0 };
const fmt = (n) => N().fmt(n), esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const RAR = () => window.RARITY || {};
const fishName = (id) => { const f = N().FISH_BY_ID[id]; return f ? f.name : id; };
const rarOf = (id) => { const f = N().FISH_BY_ID[id]; return f ? RAR()[f.rarity] || { label: f.rarity, color: "#9ab" } : { label: "", color: "#9ab" }; };
const TAG = { ok: "", notice: "Mulai lapar", serious: "Lapar!", critical: "KRITIS" };
const bal = () => (NW.wallet && NW.wallet.bal ? NW.wallet.bal() : (NW.eco ? NW.eco.balance() : 0));
const WARNTXT = "⚠ Ikan di kolam bisa MATI jika kenyang mencapai 0%. Kenyang turun 1% tiap 6 jam (± 25 hari dari penuh). Ikan di kolam tidak bisa dijual atau dipakai dari inventaris. Pikirkan dulu sebelum menyimpan ikan langka.";

function open(player) {
  if (player) ui.player = player;
  ui.open = true; ui.view = "main"; ui.sel.clear(); ui.confirm = null; wrap.classList.remove("hidden"); render(); try { N().sfx("click"); } catch (e) {}
  POND().refresh().then(() => { if (ui.open) render(); });
  clearInterval(ui.tick); ui.tick = setInterval(() => { if (!ui.open) return; if (!ui.confirm && !ui.working && ui.view === "main") render(); else $("pdCoin").textContent = "🪙 " + fmt(bal()); }, 5000);
  clearInterval(ui.sync); ui.sync = setInterval(() => { if (ui.open && !POND().busy()) POND().refresh().then(() => { if (ui.open && ui.view === "main" && !ui.confirm) render(); }); }, 60000);
}
function close() { ui.open = false; wrap.classList.add("hidden"); clearInterval(ui.tick); clearInterval(ui.sync); ui.confirm = null; }
$("pdX").addEventListener("click", close);
window.addEventListener("keydown", (e) => { if (ui.open && e.key === "Escape") close(); });

// ---------- tampilan ----------
function fishRowHTML(f, opt) {
  const R = rarOf(f.id), fi = N().FISH_BY_ID[f.id], img = N().fishImg ? N().fishImg(f.id, f.vr) : "";
  return `<div class="pd-fish ${opt.sel ? "sel" : ""} ${opt.no ? "no" : ""} lv-${f.level || "ok"}" data-u="${esc(f.u)}" ${opt.pick ? 'data-act="pick"' : ""} style="--rc:${R.color}">
    <img src="${img}" alt="" draggable="false"><div class="pd-fi"><div class="nm">${esc(fishName(f.id))}</div>
    <div class="sub"><span style="color:${R.color}">${esc(R.label || "")}</span> · ${N().fmtW(f.w)}${opt.sub ? " · " + opt.sub : ""}</div>${opt.sat ? `<div class="pd-sat"><div class="pd-bar"><i style="width:${f.sat}%"></i></div><b>${f.sat}%</b></div>
    <div class="sub">${f.level !== "ok" ? `<span class="tag">${TAG[f.level]}</span> · ` : ""}habis dalam ± ${POND().fmtEta(f.eta)}</div>` : ""}</div>${opt.pick ? `<div style="font-size:20px">${opt.sel ? "☑" : opt.no ? "" : "☐"}</div>` : ""}</div>`;
}
function main(v) {
  const rows = POND().fishRows(), pct = Math.min(100, (v.used / v.cap) * 100), f = v.feed, hist = (v.hist || []).filter((h) => true).slice(-3).reverse();
  return `<div class="pd-warn">${WARNTXT}</div>
  <div class="pd-cap"><div class="pd-row"><span>Kolam Lv ${v.lv}${v.nextLv ? "" : " (maks)"}</span><span>${(Math.round(v.used * 10) / 10).toString().replace(".", ",")} / ${v.cap} KG</span></div><div class="pd-bar ${pct > 90 ? "hot" : ""}"><i style="width:${pct}%"></i></div></div>
  <div class="pd-acts"><button class="pd-b" data-act="v-put">📥 Masukkan Ikan</button><button class="pd-b" data-act="v-take" ${rows.length ? "" : "disabled"}>📤 Ambil Ikan</button><button class="pd-b alt" data-act="v-feed">🍤 Beri Makan</button>
  <button class="pd-b gold" data-act="v-shop">🛒 Toko Kolam</button><button class="pd-b gold" data-act="v-up">⬆ Upgrade Kolam</button><button class="pd-b ghost" data-act="refresh">🔄 Segarkan</button></div>
  <div class="pd-note">Stok pakan: 🟤 ${f.pelet} · 🟢 ${f.nutrisi} · 🟡 ${f.premium}. Satu pakan memberi makan semua ikan di kolam.</div>
  <h4>Ikan di kolam (${rows.length})</h4>
  <div class="pd-list">${rows.length ? rows.map((r) => fishRowHTML(r, { sat: true })).join("") : '<div class="pd-note">Kolam masih kosong. Masukkan ikan dari coolbox dengan tombol Masukkan Ikan.</div>'}</div>
  ${hist.length ? `<div class="pd-hist">Riwayat ikan mati (terakhir): ${hist.map((h) => `${esc(fishName(h.id))} ${N().fmtW(h.w)} — ${new Date(h.at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`).join(" · ")}</div>` : ""}`;
}
function putView() {
  const v = POND().view(), list = POND().eligible(), picked = list.filter((x) => ui.sel.has(x.it.uid));
  const addKg = picked.reduce((a, x) => a + x.it.w, 0), after = v.used + addKg, over = after > v.cap + 1e-9, rare = picked.some((x) => ["langka", "epik", "legenda"].includes(x.f.rarity));
  return `<button class="pd-b ghost pd-back" data-act="v-main">← Kembali</button><h4>Masukkan Ikan dari Coolbox</h4><div class="pd-warn">${WARNTXT}</div>
  <div class="pd-note">Terpilih ${picked.length} ikan (${addKg.toFixed(2).replace(".", ",")} kg) → kolam ${after.toFixed(1).replace(".", ",")} / ${v.cap} KG ${over ? "<b style='color:#ff8478'>— melebihi kapasitas!</b>" : ""}. Maks 10 ikan sekali masuk. Ikan baru masuk kenyang 100%.</div>
  <div class="pd-list">${list.length ? list.map((x) => fishRowHTML({ u: x.it.uid, id: x.it.id, w: x.it.w, vr: x.it.vr }, { pick: !x.why, sel: ui.sel.has(x.it.uid), no: !!x.why, sub: x.why ? "🚫 " + x.why : "" })).join("") : '<div class="pd-note">Coolbox kosong.</div>'}</div>
  <button class="pd-b" data-act="do-put" ${picked.length && !over ? "" : "disabled"}>Masukkan ${picked.length || ""} ikan ke kolam${rare ? " (ada ikan langka!)" : ""}</button>`;
}
function takeView() {
  const rows = POND().fishRows(), picked = rows.filter((r) => ui.sel.has(r.u));
  return `<button class="pd-b ghost pd-back" data-act="v-main">← Kembali</button><h4>Ambil Ikan dari Kolam</h4><div class="pd-note">Ikan kembali ke coolbox (coolbox ${N().S.cooler.length}/${N().coolerCap()}). Kenyang direset ke 100% jika dimasukkan lagi.</div>
  <div class="pd-list">${rows.map((r) => fishRowHTML(r, { pick: true, sel: ui.sel.has(r.u), sat: true })).join("") || '<div class="pd-note">Kolam kosong.</div>'}</div>
  <button class="pd-b" data-act="do-take" ${picked.length ? "" : "disabled"}>Ambil ${picked.length || ""} ikan</button>`;
}
function feedView(v) {
  const rows = POND().fishRows();
  return `<button class="pd-b ghost pd-back" data-act="v-main">← Kembali</button><h4>Beri Makan</h4><div class="pd-note">Satu pakan = semua ikan di kolam (${rows.length} ekor). Pakan tidak terpakai jika semua ikan sudah 100%.</div>
  ${Object.entries(PC().FEED).map(([k, F]) => `<div class="pd-item"><div class="ic">${F.icon}</div><div class="tx"><b>${F.name}</b><small>${F.note} · stok ${v.feed[k]}</small></div><button class="pd-b alt" style="min-width:92px" data-act="do-feed" data-k="${k}" ${v.feed[k] > 0 && rows.length ? "" : "disabled"}>Beri</button></div>`).join("")}
  <button class="pd-b gold" data-act="v-shop">🛒 Beli pakan</button>`;
}
function shopView(v) {
  const item = (k, I, kind) => { const own = kind === "feed" ? v.feed[k] : v.gear[k], left = kind === "feed" ? 99 : I.max - own, q = Math.max(1, Math.min(ui.qty[k] || 1, Math.max(1, left)));
    return `<div class="pd-item"><div class="ic">${I.icon}</div><div class="tx"><b>${I.name}</b><small>${I.note}</small><small>${fmt(I.price)} 🪙 · ${kind === "feed" ? "stok " + own : "dimiliki " + own + "/" + I.max}</small></div>
    ${left > 0 ? `<div style="display:flex;flex-direction:column;gap:4px;align-items:center"><div class="pd-qty"><button data-act="qty" data-k="${k}" data-d="-1">−</button><span>${q}</span><button data-act="qty" data-k="${k}" data-d="1">+</button></div><button class="pd-b gold" style="min-width:96px" data-act="do-buy" data-k="${k}" data-kind="${kind}">Beli ${fmt(I.price * q)}</button></div>` : '<small>✔ Sudah maks</small>'}</div>`; };
  return `<button class="pd-b ghost pd-back" data-act="v-main">← Kembali</button><h4>🛒 TOKO KOLAM</h4><div class="pd-note">Saldo: <b>🪙 ${fmt(bal())}</b>. Pembelian dicatat server; barang masuk perlengkapan kolam.</div>
  <h4>Pakan</h4>${Object.entries(PC().FEED).map(([k, I]) => item(k, I, "feed")).join("")}<h4>Perlengkapan</h4>${Object.entries(PC().GEAR).map(([k, I]) => item(k, I, "gear")).join("")}`;
}
function upView(v) {
  const n = v.nextLv;
  return `<button class="pd-b ghost pd-back" data-act="v-main">← Kembali</button><h4>⬆ Upgrade Kolam</h4>
  <div class="pd-note">Tabel: Lv1 20 KG (gratis) · Lv2 50 KG (${fmt(10000)}) · Lv3 100 KG (${fmt(35000)}) · Lv4 150 KG (${fmt(75000)}) · Lv5 200 KG (${fmt(150000)}). Tampilan kolam makin bagus tiap level.</div>
  <div class="pd-item"><div class="ic">🏞️</div><div class="tx"><b>Sekarang: Lv ${v.lv} · ${v.cap} KG</b>${n ? `<small>Berikutnya: Lv ${n.lv} · ${n.cap} KG</small><small>Biaya ${fmt(n.cost)} 🪙 · saldo ${fmt(bal())}</small>` : "<small>Sudah level maksimum 🎉</small>"}</div></div>
  ${n ? `<button class="pd-b gold" data-act="do-up" ${bal() >= n.cost ? "" : "disabled"}>${bal() >= n.cost ? "Upgrade ke Lv " + n.lv : "Koin belum cukup"}</button>` : ""}`;
}
function render() {
  if (!ui.open) return; $("pdCoin").textContent = "🪙 " + fmt(bal());
  const sx = POND().status(), v = POND().view();
  if (sx.s !== "ready" || !v) { body.innerHTML = `<div class="pd-lock">${esc(sx.msg)}</div>${sx.s === "offline" || sx.s === "unsupported" ? '<button class="pd-b" data-act="retry">🔄 Coba lagi</button>' : ""}<div class="pd-warn">${WARNTXT}</div>`; return; }
  body.innerHTML = ({ main, put: putView, take: takeView, feed: feedView, shop: shopView, up: upView }[ui.view] || main)(v);
  $("pdSheet").innerHTML = ui.confirm ? `<div class="pd-sheet"><div><div>${ui.confirm.html}</div><div class="two"><button class="pd-b ghost" data-act="c-no">Batal</button><button class="pd-b gold" data-act="c-yes" ${ui.working ? "disabled" : ""}>${ui.confirm.yes || "Ya"}</button></div></div></div>` : "";
}
function ask(html, yes, fn) { ui.confirm = { html, yes, fn }; render(); }
async function run(p, okMsg) {
  ui.working = true; render(); const r = await p; ui.working = false; ui.confirm = null;
  if (!r.ok) { try { N().toast(r.msg, "bad"); } catch (e) {} } else if (okMsg) { try { N().toast(okMsg(r.r), "good"); N().sfx("coin"); } catch (e) {} }
  render(); return r;
}
wrap.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-act]"); if (!el || el.disabled) return; const a = el.dataset.act, k = el.dataset.k, u = el.closest("[data-u]") && el.closest("[data-u]").dataset.u;
  if (ui.working && a !== "c-no") return;
  if (a.startsWith("v-")) { ui.view = a.slice(2); ui.sel.clear(); ui.confirm = null; return render(); }
  if (a === "refresh" || a === "retry") { if (a === "retry") await POND().retry(); else await POND().refresh(); return render(); }
  if (a === "pick") { const id = el.dataset.u || u; if (ui.sel.has(id)) ui.sel.delete(id); else if (ui.sel.size < 10) ui.sel.add(id); else try { N().toast("Maksimal 10 ikan sekali proses.", "bad"); } catch (x) {} return render(); }
  if (a === "qty") { const cur = ui.qty[k] || 1; ui.qty[k] = Math.max(1, Math.min(99, cur + Number(el.dataset.d))); return render(); }
  if (a === "c-no") { ui.confirm = null; return render(); }
  if (a === "c-yes") { const fn = ui.confirm && ui.confirm.fn; if (fn) fn(); return; }
  const v = POND().view();
  if (a === "do-put") {
    const list = POND().eligible().filter((x) => ui.sel.has(x.it.uid)), rare = list.filter((x) => ["langka", "epik", "legenda"].includes(x.f.rarity));
    return ask(`<b>Masukkan ${list.length} ikan ke kolam?</b><br>Ikan akan <b>mati</b> bila kenyang 0% (± 25 hari tanpa makan) dan tidak bisa dijual selagi di kolam.${rare.length ? `<br><b style="color:#ffb066">⚠ Termasuk ${rare.length} ikan langka/epik/legenda.</b> Pastikan kamu rajin memberi makan.` : ""}`, "Ya, masukkan", () => run(POND().put(list.map((x) => x.it.uid)), () => `🐟 ${list.length} ikan masuk kolam (kenyang 100%).`).then((r) => { if (r.ok) { ui.view = "main"; ui.sel.clear(); render(); } }));
  }
  if (a === "do-take") { const us = [...ui.sel]; return run(POND().take(us), () => `📤 ${us.length} ikan kembali ke coolbox.`).then((r) => { if (r.ok) { ui.view = "main"; ui.sel.clear(); render(); } }); }
  if (a === "do-feed") {
    ui.working = true; render(); const r = await POND().feed(k); ui.working = false;
    if (!r.ok) { try { N().toast(r.msg, "bad"); } catch (x) {} return render(); }
    const F = PC().FEED[k]; try { N().toast(`🍤 ${F.name}: ikan makan dengan lahap! (${F.note})`, "good"); } catch (x) {}
    close(); if (NW.pondDraw) NW.pondDraw.startFeed(ui.player, k);                          // tutup panel supaya animasi terlihat, lalu buka lagi
    clearTimeout(ui.reopen); ui.reopen = setTimeout(() => { if (!ui.open) open(); ui.view = "main"; render(); }, 3400); return;
  }
  if (a === "do-buy") {
    const kind = el.dataset.kind, I = kind === "feed" ? PC().FEED[k] : PC().GEAR[k], q = Math.max(1, ui.qty[k] || 1), total = I.price * q;
    return ask(`<b>Beli ${q}× ${I.name}</b> seharga <b>🪙 ${fmt(total)}</b>?<br>Saldo sekarang 🪙 ${fmt(bal())}.${bal() < total ? '<br><b style="color:#ff8478">Koin belum cukup.</b>' : ""}`, "Ya, beli", () => run(POND().buy(k, q), (rr) => `✅ ${q}× ${I.name} dibeli (−${fmt(rr.price)} koin).`).then(() => { ui.qty[k] = 1; render(); }));
  }
  if (a === "do-up") { const n = v.nextLv; return ask(`<b>Upgrade kolam ke Lv ${n.lv}</b> (${n.cap} KG) seharga <b>🪙 ${fmt(n.cost)}</b>?`, "Ya, upgrade", () => run(POND().upgrade(), () => `🏞️ Kolam naik ke Lv ${n.lv}! Kapasitas ${n.cap} KG.`)); }
});
NW.pondUI = { open, close, isOpen: () => ui.open };
})();
