// =========================================================
//  NUSA ISLAND — Tahap 3.5: ANTARMUKA Premium Shop (satu katalog untuk bangunan & ikon mahkota).
//  Semua data harga/hak berasal dari NW.shopApi (server). UI tidak pernah menentukan harga, status PAID, atau hak milik.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const C = window.NusaShopCore;
let root, st = null, raf = 0, lastT = 0;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CFG = window.NUSA_SHOP || {};
const canBuy = () => (api().sim ? CFG.release !== "publik" : !!(st && st.cat && st.cat.live));  // beli hanya bila: simulasi build uji, atau server NYATA
const api = () => NW.shopApi;
const sfx = (n) => { try { window.Nusa.sfx(n); } catch (e) {} };
const WIB = (ms) => new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(/\./g, ".") + " WIB";
const left = (ms) => { if (ms <= 0) return "0 detik"; const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3); return (d ? d + "h " : "") + (d || h ? h + "j " : "") + m + "m " + String(s).padStart(2, "0") + "d"; };
const nowT = () => Date.now() + (st ? st.offset : 0); // waktu tepercaya = jam server + selisih saat dibuka (bukan jam perangkat mentah)

function build() {
  if (root) return;
  root = document.createElement("div"); root.id = "spWrap"; root.className = "sp-wrap hidden"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Nusa Premium");
  root.innerHTML = `<section class="sp-card"><header class="sp-head"><div class="sp-logo">👑</div><div class="sp-ttl"><b>NUSA PREMIUM</b><small id="spSub"></small></div><button class="sp-x" id="spClose" aria-label="Tutup">✕</button></header>
  <div class="sp-sim" id="spSim"></div><nav class="sp-tabs" id="spTabs" role="tablist"></nav><div class="sp-body" id="spBody"></div></section>`;
  document.body.appendChild(root);
  root.addEventListener("pointerdown", (e) => e.stopPropagation());
  root.querySelector("#spClose").addEventListener("click", close);
  root.addEventListener("click", onClick);
}
function onClick(e) {
  const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
  const a = b.dataset.a, id = b.dataset.id; sfx("click");
  if (a === "tab") { st.tab = id; st.view = null; render(); }
  else if (a === "buy") buy(id);
  else if (a === "equip") NW.shop.toggleEquip(id).then(render);
  else if (a === "sim") act("simulatePayment");
  else if (a === "claim") act("claimPaid");
  else if (a === "wa") waConfirm();
  else if (a === "cancel") act("cancelOrder");
  else if (a === "back") { st.view = null; render(); }
  else if (a === "order") { const o = st.orders.find((x) => x.orderId === id); if (o) { st.view = { order: o }; render(); } }
}
async function refresh() {
  const A = api(), [cat, ent, ord] = await Promise.all([A.getCatalog(), A.getEntitlements(), A.listOrders()]);
  st.cat = cat; st.ent = ent; st.orders = ord.orders; st.offset = cat.now - Date.now();
  if (NW.shop) { NW.shop.setOwned(ent); if (NW.shop.deliver) NW.shop.deliver(); }
}
async function open(tab) {
  build(); if (isOpen()) return;
  st = { tab: tab || "gamepass", view: null, cat: null, ent: null, orders: [], offset: 0, busy: false };
  root.classList.remove("hidden"); document.body.classList.add("sp-open"); root.querySelector("#spBody").innerHTML = `<div class="sp-load">Memuat katalog…</div>`;
  try { await refresh(); } catch (e) { root.querySelector("#spBody").innerHTML = `<div class="sp-load">Toko belum bisa dibuka. Coba lagi nanti.</div>`; return; }
  render(); lastT = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function close() { if (!isOpen()) return; clearInterval(st && st.poll); root.classList.add("hidden"); document.body.classList.remove("sp-open"); cancelAnimationFrame(raf); if (window.Nusa) window.Nusa.save(); }
const isOpen = () => !!(root && !root.classList.contains("hidden"));

function priceBlock(it) {
  const ps = st.cat.promo, price = it.price;
  let h = `<div class="sp-price"><b>${C.fmtRp(price)}</b></div>`;
  if (ps.phase === "promo") h = `<span class="sp-badge">PROMO PELUNCURAN</span>` + h + `<small>Harga perkenalan. Harga reguler setelah promo: ${C.fmtRp(it.regular)}</small>`;
  else if (ps.phase === "prelaunch") h = `<span class="sp-badge sp-badge2">HARGA PERKENALAN</span>` + h + `<small>Harga reguler setelah masa perkenalan: ${C.fmtRp(it.regular)}</small>`;
  else h += `<small>Harga reguler</small>`;
  return h;
}
function promoBar() {
  const ps = st.cat.promo;
  if (ps.phase === "promo") return `<div class="sp-promo">🎉 <b>PROMO PELUNCURAN</b> berakhir <b>${WIB(ps.endsAt)}</b><br><span id="spCount">sisa ${left(ps.endsAt - nowT())}</span></div>`;
  if (ps.phase === "prelaunch") return `<div class="sp-promo sp-promo2">⏳ Harga perkenalan berlaku ${ps.scheduled ? "mulai <b>" + WIB(ps.launchAt) + "</b>" : "selama 30 hari sejak peluncuran resmi (tanggal diumumkan Owner)"}.</div>`;
  return `<div class="sp-promo sp-promo2">Masa promo peluncuran sudah berakhir. Harga reguler berlaku. Pembeli saat promo tetap memiliki akses permanen.</div>`;
}
function renderTabs() {
  root.querySelector("#spTabs").innerHTML = C.CATEGORIES.map((c) => `<button role="tab" class="sp-tab${st.tab === c.id ? " on" : ""}" data-a="tab" data-id="${c.id}" aria-selected="${st.tab === c.id}">${c.icon} ${esc(c.name)}</button>`).join("");
}
function itemCard(it) {
  const owned = !!st.ent.products[it.id], eq = NW.shop.isEquipped(it.id);
  const stat = owned ? `<span class="sp-own">✅ Dimiliki (permanen)</span>` : `<span class="sp-no">Belum dimiliki</span>`;
  const btn = owned ? `<button class="sp-btn${eq ? " on" : ""}" data-a="equip" data-id="${it.id}">${eq ? "✔ Sedang dipakai" : "Pakai"}</button>` : !canBuy() ? `<button class="sp-btn" disabled>Segera hadir</button>` : it.enabled ? `<button class="sp-btn buy" data-a="buy" data-id="${it.id}">Beli · ${C.fmtRp(it.price)}</button>` : `<button class="sp-btn" disabled>Sedang tidak tersedia</button>`;
  const perks = it.id === "gamepass_sultan" ? `<ul class="sp-perks"><li>👘 Kostum Sultan</li><li>🏅 Gelar “Sultan Samudra”</li><li>✨ Efek nama emas</li><li>🏮 Dekorasi rumah eksklusif</li><li>🎖️ Lencana profil Sultan</li></ul>` : "";
  return `<article class="sp-item${it.id === "gamepass_sultan" ? " big" : ""}"><canvas data-pv="${it.id}" width="240" height="150" aria-label="Pratinjau ${esc(it.name)}"></canvas><div class="sp-info"><h3>${esc(it.icon)} ${esc(it.name)}</h3><p>${esc(it.desc)}</p>${perks}<div class="sp-tag">Hanya kosmetik · tidak menambah kekuatan</div>${stat}${owned ? "" : priceBlock(it)}${btn}</div></article>`;
}
function packCard(p) {
  const base = p.base;
  return `<article class="sp-item sp-pack"><canvas data-pv="${p.id}" width="240" height="150" aria-label="Pratinjau paket ${esc(p.name)}"></canvas><div class="sp-info"><h3>${esc(p.icon)} Paket ${esc(p.name)}</h3><div class="sp-coins">🪙 ${p.coins.toLocaleString("id-ID")} koin</div><div class="sp-price"><b>${C.fmtRp(p.rupiah)}</b></div><small>Dasar ${base.toLocaleString("id-ID")} koin (${st.cat.coinsPer1000} koin per Rp1.000) · ${p.bonus > 0 ? `<b>bonus +${p.bonus.toLocaleString("id-ID")} koin (+${p.bonusPct}%)</b>` : "<b>tanpa bonus (paket dasar)</b>"}</small><button class="sp-btn buy" data-a="buy" data-id="${p.id}"${p.enabled && canBuy() ? "" : " disabled"}>${canBuy() ? "Beli · " + C.fmtRp(p.rupiah) : "Segera hadir"}</button></div></article>`;
}
function stat(s) { return `<span class="sp-st ${s}">${s}</span>`; }
function render() {
  if (!isOpen() || !st.cat) return;
  const cat = st.cat, sim = api().sim;
  root.querySelector("#spSub").textContent = st.cat.merchant.name;
  root.querySelector("#spSim").innerHTML = !canBuy() ? `<b>SEGERA HADIR</b> — Premium Shop dibuka saat Nusa Island resmi dirilis. Kamu sudah bisa melihat-lihat isinya.` : !sim ? `Pembayaran lewat <b>QRIS resmi</b>. Pesananmu diperiksa & disetujui Owner sebelum item/koin diberikan.${api().isGuest() ? " <b>Masuk dengan Google</b> dulu agar pembelian terikat akunmu." : ""}` : sim ? `<b>MODE SIMULASI</b> — tidak ada uang sungguhan. Semua pesanan bertanda SIMULASI.${api().isGuest() ? " Kamu masuk sebagai tamu: pembelian simulasi hanya tersimpan di perangkat ini. Masuk dengan Google agar terikat akun." : ""}` : "";
  renderTabs(); const body = root.querySelector("#spBody");
  clearInterval(st.poll);
  if (st.view && st.view.order) {
    body.innerHTML = checkoutHtml(st.view.order); drawQR();
    const im = body.querySelector("#spQrImg"); if (im) im.onerror = () => { im.style.display = "none"; const c = body.querySelector("#spQr"); if (c) c.style.display = "block"; };
    if (st.view.order.env === "NYATA" && st.view.order.status === "PENDING") st.poll = setInterval(pollOrder, 8000);   // Owner menyetujui di dashboard → status berubah sendiri di sini
    return;
  }
  let h = "";
  if (st.tab === "riwayat") {
    h = st.orders.length ? st.orders.map((o) => `<button class="sp-ord" data-a="order" data-id="${esc(o.orderId)}"><span><b>${esc(o.name)}</b><small>${esc(o.orderId)} · ${new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</small></span><span class="r"><b>${C.fmtRp(o.rupiah)}</b>${stat(o.status)}<em class="${o.env === "NYATA" ? "nyata" : "simulasi"}">${o.env}</em></span></button>`).join("") : `<div class="sp-load">Belum ada pesanan.</div>`;
    h = `<div class="sp-list">${h}</div><small class="sp-note">Riwayat terikat akunmu (UID). Transaksi SIMULASI dan NYATA ditandai terpisah.</small>`;
  } else if (st.tab === "topup") {
    const w = st.ent.wallet;
    h = `<div class="sp-wallet">Saldo koin ${cat.env === "SIMULASI" ? "simulasi" : "dari top up"}: <b>🪙 ${(w[cat.env] || 0).toLocaleString("id-ID")}</b><small>${cat.env === "SIMULASI" ? "Koin simulasi TERPISAH dari koin utamamu agar ekonomi permainan tidak rusak. Cara mendapat koin lewat memancing tetap berjalan seperti biasa." : ""}</small></div><div class="sp-grid">${cat.packs.map(packCard).join("")}</div><small class="sp-note">Koin tidak membuka ikan mistis, monster dunia, atau kemenangan kompetitif. Tidak ada undian/gacha.</small>`;
  } else {
    const items = cat.items.filter((i) => i.cat === st.tab);
    h = promoBar() + `<div class="sp-grid">${items.map(itemCard).join("")}</div>`;
  }
  body.innerHTML = h;
}
function checkoutHtml(o) {
  const real = o.env === "NYATA", pend = o.status === "PENDING";
  const wallet = o.kind === "topup" ? `🪙 ${o.coins.toLocaleString("id-ID")} koin ${o.bonus ? "(termasuk bonus " + o.bonus.toLocaleString("id-ID") + ")" : ""}` : "";
  return `<div class="sp-co"><button class="sp-back" data-a="back">‹ Kembali</button><h3>${esc(o.name)}</h3>${wallet ? `<p>${wallet}</p>` : ""}
  <div class="sp-ordid">No. pesanan <b>${esc(o.orderId)}</b> ${stat(o.status)} <em class="${real ? "nyata" : "simulasi"}">${o.env}</em></div>
  <div class="sp-pay"><div class="sp-qr">${real ? `<img id="spQrImg" src="${esc(CFG.qrisImage || "shop/qris.png")}" alt="QRIS resmi Nusa Island" width="220" onerror="this.style.display='none';var c=document.getElementById('spQr');if(c)c.style.display=''">` : ""}<canvas id="spQr" width="220" height="220" aria-label="Tempat kode QRIS"${real ? ' style="display:none"' : ""}></canvas></div>
  <div class="sp-amt"><small>Merchant</small><b>${esc(o.merchant)}</b><small>Total tagihan</small><b class="big">${C.fmtRp(o.payAmount)}</b><small>= ${C.fmtRp(o.rupiah)} + kode unik ${o.uniqueCode} (untuk mencocokkan pembayaranmu)</small></div></div>
  ${pend ? `<p class="sp-warn">${real ? "Bayar PERSIS sesuai nominal di atas. Item/koin diberikan setelah pembayaran DIVERIFIKASI oleh sistem toko — bukan dari tombol atau screenshot." : "Ini SIMULASI: tidak ada uang yang dibayar. QRIS asli baru dipasang setelah Owner menyetujui pengujian & keamanan."}</p>
  ${!real && api().simulatePayment ? `<button class="sp-btn buy" data-a="sim">🧪 Simulasi: anggap sudah dibayar</button>` : ""}
  ${real ? `<button class="sp-btn buy" data-a="wa">💬 Konfirmasi via WhatsApp</button>` : `<button class="sp-btn" data-a="claim">Saya Sudah Bayar</button>`}${o.claimedAt ? `<small class="sp-note">Konfirmasi tercatat. Pesanan tetap PENDING sampai Owner memeriksa pembayaran masuk & menyetujui. Halaman ini diperbarui otomatis.</small>` : ""}
  <button class="sp-btn warn" data-a="cancel">Batalkan pesanan</button><small class="sp-note">Berlaku sampai ${WIB(o.expiresAt)}.</small>`
    : o.status === "PAID" ? `<p class="sp-ok">✅ Pembayaran tercatat${real ? "" : " (SIMULASI)"}. ${o.kind === "topup" ? "Koin masuk ke saldomu." : "Hak milik permanen sudah aktif di akunmu."}</p>` : `<p class="sp-warn">Pesanan ${o.status}${o.reason ? " (" + esc(o.reason) + ")" : ""}.</p>`}</div>`;
}
function waConfirm() {  // catat klaim (tidak memberi apa pun) lalu buka WhatsApp dengan pesan siap kirim — tanpa UID/data sensitif
  const o = st.view && st.view.order; if (!o) return;
  const nick = (window.Nusa && window.Nusa.S.profile && window.Nusa.S.profile.name) || o.nick || "";
  const msg = `Halo, saya konfirmasi pembayaran Nusa Island.\nPesanan: ${o.orderId}\nNickname: ${nick}\nProduk: ${o.name}\nNominal: ${C.fmtRp(o.payAmount)}`;
  const url = `https://wa.me/${CFG.whatsapp || "628967234059"}?text=${encodeURIComponent(msg)}`;
  api().claimPaid({ orderId: o.orderId }).then(() => refresh()).then(() => { st.view = { order: st.orders.find((x) => x.orderId === o.orderId) || o }; render(); }).catch(() => {});
  window.open(url, "_blank", "noopener");
}
function drawQR() { // BUKAN kode QRIS: hanya bingkai penanda tempat. Tidak ada QR palsu yang bisa dipindai.
  const cv = root.querySelector("#spQr"); if (!cv) return; const c = cv.getContext("2d"), w = cv.width;
  c.fillStyle = "#fffdf5"; c.fillRect(0, 0, w, w); c.strokeStyle = "#b8902f"; c.lineWidth = 4; c.setLineDash([10, 8]); c.strokeRect(6, 6, w - 12, w - 12); c.setLineDash([]);
  c.fillStyle = "#0e4a63"; c.textAlign = "center"; c.font = "800 22px system-ui"; c.fillText("QRIS", w / 2, w / 2 - 28); c.font = "600 13px system-ui"; c.fillStyle = "#555";
  ["Tempat QRIS resmi.", "Belum aktif:", "mode SIMULASI."].forEach((t, i) => c.fillText(t, w / 2, w / 2 + i * 20));
}
async function pollOrder() {
  if (!isOpen() || !st.view || !st.view.order || st.busy) return;
  try { await refresh(); const n = st.orders.find((x) => x.orderId === st.view.order.orderId); if (n && n.status !== st.view.order.status) { st.view = { order: n }; if (n.status === "PAID") sfx("kedai_menang"); render(); } } catch (e) {}
}
async function buy(id) {
  if (st.busy) return; st.busy = true;
  try { const nick = (window.Nusa && window.Nusa.S.profile && window.Nusa.S.profile.name) || ""; const r = await api().createOrder({ nick, productId: id, opId: "op-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }); await refresh(); st.view = { order: r.order }; sfx("click"); }
  catch (e) { toast(e.message || "Gagal membuat pesanan."); }
  st.busy = false; render();
}
async function act(name) {
  if (st.busy || !st.view) return; st.busy = true;
  try { const r = await api()[name]({ orderId: st.view.order.orderId }); await refresh(); st.view = { order: st.orders.find((o) => o.orderId === r.order.orderId) || r.order };
    if (name === "claimPaid") toast("Klaim dicatat. Belum ada item/koin diberikan sebelum diverifikasi."); if (name === "simulatePayment") { toast("Simulasi: pesanan dianggap dibayar."); sfx("kedai_menang"); } }
  catch (e) { toast(e.message || "Gagal."); }
  st.busy = false; render();
}
function toast(t) { try { window.Nusa.toast(t, "good"); } catch (e) {} let e = root.querySelector(".sp-toast"); if (!e) { e = document.createElement("div"); e.className = "sp-toast"; root.firstChild.appendChild(e); } e.textContent = t; e.style.display = "block"; clearTimeout(e._t); e._t = setTimeout(() => { e.style.display = "none"; }, 2800); }

function loop(ts) {
  raf = requestAnimationFrame(loop); if (!isOpen()) return;
  if (ts - lastT < 45) return; lastT = ts; const t = ts / 1000;
  const cvs = root.querySelectorAll("canvas[data-pv]");
  const vr = root.querySelector("#spBody").getBoundingClientRect();
  cvs.forEach((cv) => { const r = cv.getBoundingClientRect(); if (r.bottom < vr.top || r.top > vr.bottom) return; const c = cv.getContext("2d"); NW.shopArt.preview(cv.dataset.pv, c, cv.width, cv.height, t); }); // hanya yang terlihat
  const ce = root.querySelector("#spCount"); if (ce && st.cat.promo.phase === "promo") ce.textContent = "sisa " + left(st.cat.promo.endsAt - nowT());
}
NW.shopUI = { open, close, isOpen, _state: () => st, _el: () => root, refresh };
})();
