// NUSA ISLAND — Toko NusaPhone (Ide 07, tahap 5): interior toko 2.5D di Kota + etalase enam model. Dimuat LAZY (hanya saat pemain masuk toko, dan hanya bila server menyalakan NusaPhone).
// ATURAN: HARGA, KEPEMILIKAN, SALDO = SERVER (phoneState/phoneBuy/phoneUse). Berkas ini tidak punya konstanta harga. Beli koin memakai opId yang disimpan sampai berhasil/ditolak (refresh, putus, klik ganda
// tidak pernah menggandakan ponsel atau memotong dua kali). Model premium TIDAK bisa dibeli di sini: hanya lewat Payment Center lama; bila pembayaran belum tersedia → "Pembayaran belum tersedia" (tidak ada sukses palsu).
// "Isi Koin" hanya membuka Payment Center lama (NW.shopUI.open("topup")). Coba tampilan = pratinjau di klien, tidak mengubah apa pun.
(function () {
"use strict";
const NW = window.NW; if (!NW || !NW.phone) return;
const C = window.NusaPhoneCore; if (!C) return;
const PK = "nusa_phone_buy_v1", RESUME_MS = 15 * 60 * 1000;
const fmt = (n) => String(Math.max(0, Math.floor(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const rid = () => "pb-" + Array.from({ length: 18 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
const uidNow = () => { try { return (NW.cloud && NW.cloud.user && NW.cloud.user.uid) || ""; } catch (e) { return ""; } };
const reduced = () => { try { return C.reduced(NW.phone.prefs().motion, window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } };
// Toko tidak punya tombol ponsel/probe: sebelum tiap panggilan, hapus penanda "terputus" lokal agar percobaan ulang BENAR-BENAR mencoba jaringan (gagal → ditandai lagi).
const net = (name, body) => { try { NW.phone.relink && NW.phone.relink(); } catch (e) { /* abaikan */ } return NW.phone.call(name, body); };
const DEFINITIVE = ["invalid-argument", "failed-precondition", "permission-denied", "not-found", "already-exists", "unauthenticated", "out-of-range"];
// pembelian yang belum pasti hasilnya (putus/refresh) → opId yang SAMA dikirim ulang; server mengembalikan hasil lama (duplicate), tidak memotong lagi.
const pend = {
  get() { try { const v = JSON.parse(localStorage.getItem(PK) || "null"); return v && typeof v.opId === "string" && typeof v.model === "string" && v.uid === uidNow() && Date.now() - Number(v.at) < RESUME_MS ? v : null; } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(PK, JSON.stringify(Object.assign({ uid: uidNow(), at: Date.now() }, v))); } catch (e) { /* abaikan */ } },
  clear() { try { localStorage.removeItem(PK); } catch (e) { /* abaikan */ } },
};

// ---------- gambar 2.5D ----------
const W = 7, D = 6, TW = 72, TH = 36, OX = 272, OY = 112, WALL = 92, CW = 550, CH = 360;
const P = (gx, gy, z) => ({ x: OX + (gx - gy) * TW / 2, y: OY + (gx + gy) * TH / 2 - (z || 0) });
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return "rgb(" + f(n >> 16) + "," + f((n >> 8) & 255) + "," + f(n & 255) + ")"; };
function poly(c, pts, fill, stroke) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); } }
function prism(c, x0, y0, x1, y1, z0, z1, col) {   // col = [atas, sisi +y (kiri-bawah), sisi +x (kanan-bawah)]
  poly(c, [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], col[1], "rgba(23,63,80,.25)");
  poly(c, [P(x1, y1, z0), P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1)], col[2], "rgba(23,63,80,.25)");
  poly(c, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], col[0], "rgba(23,63,80,.25)");
}
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function phoneArt(c, m, x, y, h, on, t) {   // ponsel berdiri (billboard); x = tengah, y = dasar
  const w = h * m.aspect, bz = Math.max(1.5, m.bezel * h / 90);
  c.save(); c.translate(x, y);
  c.fillStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.ellipse(0, 1, w * 0.62, 3, 0, 0, 7); c.fill();
  rr(c, -w / 2, -h, w, h, m.radius * h / 150 + 2); c.fillStyle = m.body; c.fill(); c.lineWidth = 1.6; c.strokeStyle = m.rim; c.stroke();
  const sx = -w / 2 + bz, sy = -h + bz, sw = w - 2 * bz, sh = h - 2 * bz;
  rr(c, sx, sy, sw, sh, Math.max(2, m.radius * h / 150 - bz * 0.6)); const g = c.createLinearGradient(0, sy, 0, sy + sh); g.addColorStop(0, on ? shade(m.glow, -0.25) : "#12202a"); g.addColorStop(1, on ? m.glow : "#0b1218"); c.fillStyle = g; c.fill();
  if (on) { c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(sx + sw * 0.18, sy + sh * 0.2, sw * 0.64, sh * 0.07); c.fillStyle = "rgba(255,255,255,.4)"; for (let i = 0; i < 6; i++) c.fillRect(sx + sw * (0.14 + (i % 3) * 0.26), sy + sh * (0.44 + Math.floor(i / 3) * 0.2), sw * 0.2, sw * 0.2); }
  if (m.notch === "dot") { c.fillStyle = "#0b1218"; c.beginPath(); c.arc(0, sy + 3, 1.6, 0, 7); c.fill(); } else if (m.notch === "pill") { c.fillStyle = "#0b1218"; rr(c, -w * 0.16, sy + 1.5, w * 0.32, 3.2, 1.6); c.fill(); }
  c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(-w / 2 + bz + 1, sy + 2, 2, sh * 0.5);
  c.restore();
}
function wallPlane(c, side, u0, e, fn) {   // permukaan dinding: u dalam petak, v dalam piksel ke atas. side "r" = dinding gy=0 (u=gx); "l" = dinding gx=0 (u=D-gy)
  c.save(); const o = side === "r" ? P(u0, 0, 0) : P(0, D - u0, 0);
  if (side === "r") c.transform(TW / 2, TH / 2, 0, 1, o.x, o.y); else c.transform(TW / 2, -TH / 2, 0, 1, o.x, o.y);
  fn(c); c.restore();
}
function text(c, s, u, v, size, col, align, wmax) { c.save(); c.font = "800 " + size + "px system-ui,sans-serif"; c.fillStyle = col; c.textAlign = align || "left"; c.textBaseline = "alphabetic"; c.scale(1 / 36, 1); c.fillText(s, u * 36, -v, wmax ? wmax * 36 : undefined); c.restore(); }
function tableSlots() { return [{ gx: 1.0, gy: 3.1, ids: ["s1", "s2"], tag: "A" }, { gx: 3.15, gy: 3.1, ids: ["s3", "s4"], tag: "B-C" }, { gx: 5.3, gy: 3.1, ids: ["s5", "crown17"], tag: "C-D" }]; }

function open() {
  if (!NW.phone.srvOn()) return false;
  if (root) return true;
  try { NW.phone.close && NW.phone.close(true); } catch (e) { /* abaikan */ }
  build(); return true;
}
let root = null, cv = null, c2 = null, raf = 0, hits = [], st = null, keyH = null, t0 = 0;

function build() {
  st = { s: null, sel: "s1", tryOn: false, confirm: false, busy: false, msg: null, say: 0, err: "", loaded: false, bump: 0 };
  root = document.createElement("div"); root.id = "nphStore"; root.className = "nps"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Toko NusaPhone");
  root.innerHTML = `<div class="nps-top"><button type="button" class="nps-x" data-a="exit" aria-label="Keluar dari toko">← Keluar</button><b class="nps-ttl">Toko NusaPhone</b><span class="nps-bal" data-r="bal" role="status" aria-label="Saldo koin bermain">🪙 –</span><button type="button" class="nps-topup" data-a="topup">Isi Koin</button></div>
<div class="nps-main"><div class="nps-stage"><div class="nps-cvw"><canvas class="nps-cv" width="${CW}" height="${CH}" aria-label="Interior toko NusaPhone: tiga meja etalase, rak aksesori, kasir dengan penjaga toko"></canvas></div><div class="nps-say" data-r="say" role="status"></div></div>
<div class="nps-side"><div class="nps-chips" data-r="chips" role="radiogroup" aria-label="Pilih model"></div><div class="nps-card" data-r="card"></div></div></div>`;
  document.body.appendChild(root); document.body.classList.add("nps-open");
  cv = root.querySelector("canvas"); c2 = cv.getContext("2d"); t0 = performance.now();
  root.addEventListener("click", onClick); cv.addEventListener("pointerdown", onCanvas);
  keyH = (e) => {
    if (!root) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (/^(w|a|s|d|e|q|W|A|S|D|E|Q|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(e.key) && !(e.target && e.target.closest && e.target.closest("button"))) { e.stopPropagation(); }   // jangan gerakkan pemain di belakang overlay
  };
  document.addEventListener("keydown", keyH, true);
  paintAll(); loop(); setTimeout(() => { try { root && root.querySelector('[data-a="exit"]').focus({ preventScroll: true }); } catch (e) { /* abaikan */ } }, 40);
  refresh(true);
}
function close() {
  if (!root) return; cancelAnimationFrame(raf); document.removeEventListener("keydown", keyH, true); root.remove(); root = cv = c2 = null; document.body.classList.remove("nps-open"); hits = [];
}
const mOf = (id) => (st.s && st.s.models.find((m) => m.id === id)) || null;
const sel = () => mOf(st.sel);

async function refresh(first) {
  try { const r = await net("phoneState", {}); if (!root) return; st.s = r.state; st.err = ""; NW.phone.sync && NW.phone.sync(r.state); }
  catch (e) { if (!root) return; st.err = e && e.code === "unavailable" ? "Koneksi terputus. Harga & saldo belum bisa dimuat." : "Harga & saldo gagal dimuat."; }
  st.loaded = true; paintAll();
  if (first) resume();
}
function resume() {   // pembelian yang tertunda (refresh/putus): kirim ulang opId yang SAMA
  const v = pend.get(); if (!v || !st.s) return;
  if (!st.s.models.some((m) => m.id === v.model && m.kind === "koin")) { pend.clear(); return; }
  st.sel = v.model; send(v.opId, v.model, true);
}
async function send(opId, model, recovering) {
  if (st.busy) return; st.busy = true; st.confirm = false; st.msg = { k: "info", t: recovering ? "Melanjutkan pembelian sebelumnya…" : "Memproses pembelian…" }; paintAll();
  try {
    const r = await net("phoneBuy", { opId, model }); pend.clear(); if (!root) return; st.s = r.state; NW.phone.sync && NW.phone.sync(r.state);
    const m = mOf(model); st.msg = { k: "ok", t: (r.duplicate ? "Pembelian ini sudah tercatat — " : "Berhasil! ") + (m ? C.modelOf(model).name : "Model") + " sekarang milikmu. Koin tidak dipotong dua kali." }; st.say = 4; try { NW.sfx && NW.sfx("coin"); } catch (e) { /* abaikan */ }
  } catch (e) {
    if (!root) return;
    if (e && DEFINITIVE.includes(e.code)) { pend.clear(); st.msg = { k: "bad", t: (e.message ? String(e.message) : "Pembelian ditolak.") + " Saldo tidak berubah." }; refresh(false); }
    else { st.msg = { k: "bad", t: "Koneksi bermasalah — belum pasti apakah pembelian tercatat. Tekan “Coba lagi”: pembelian yang sama tidak akan dipotong dua kali.", retry: { opId, model } }; }
  }
  st.busy = false; paintAll();
}
async function useModel(model) {
  if (st.busy) return; st.busy = true; st.msg = { k: "info", t: "Mengganti ponsel…" }; paintAll();
  try { const r = await net("phoneUse", { opId: rid(), model }); if (!root) return; st.s = r.state; NW.phone.sync && NW.phone.sync(r.state); st.msg = { k: "ok", t: C.modelOf(model).name + " sekarang dipakai." }; }
  catch (e) { st.msg = { k: "bad", t: e && e.message && e.code && DEFINITIVE.includes(e.code) ? String(e.message) : "Gagal mengganti ponsel. Coba lagi." }; }
  st.busy = false; if (root) paintAll();
}

// ---------- DOM ----------
const SAYS = ["Selamat datang di NusaPhone! Silakan coba-coba dulu, tidak wajib beli.", "Beda model hanya tampilan dan ruang simpan. Game dan obrolan tetap adil untuk semua.", "Koin bermain didapat dari bermain. Model premium dibeli lewat Payment Center.", "Pembelian dengan uang asli sebaiknya dengan izin orang tua atau wali ya.", "Terima kasih! Selamat menikmati ponsel barumu."];
function priceTxt(m) { if (!m) return "…"; if (m.kind === "dasar") return "Bawaan"; if (m.coins) return "🪙 " + fmt(m.coins); if (m.idr) return "Rp" + fmt(m.idr); return "—"; }
function chips() {
  return C.MODEL_IDS.map((id) => { const d = C.MODELS[id], m = mOf(id), on = st.sel === id; return `<button type="button" role="radio" aria-checked="${on}" class="nps-chip${on ? " on" : ""}" data-a="pick" data-m="${id}" title="${esc(d.name)}"><i style="background:${d.body};border-color:${d.rim}"></i><span>${esc(d.name.replace("Model Sementara ", "Sem. ").replace("NusaPhone ", ""))}</span><small>${m && m.owned && id !== "dasar" ? "✓ Dimiliki" : esc(priceTxt(m))}</small></button>`; }).join("");
}
function card() {
  const s = st.s, id = st.sel, d = C.MODELS[id], m = sel();
  if (!s) return `<div class="nps-msg ${st.err ? "bad" : "info"}">${esc(st.err || "Memuat harga & saldo dari server…")}</div>${st.err ? '<button type="button" class="nps-btn" data-a="reload">Muat ulang</button>' : ""}`;
  const own = !!(m && (m.owned || id === "dasar")), using = s.use === id, premium = d.kind === "premium", pay = s.pay && s.pay.available === true;
  const line = d.line ? (C.LINES[d.line] || "Lini " + d.line) : "Bawaan semua pemain";
  const spec = `<dl class="nps-spec"><div><dt>Lini</dt><dd>${esc(line)}</dd></div><div><dt>Penyimpanan</dt><dd data-r="mb">${m ? fmt(m.mb / 1000) : "–"} GB</dd></div><div><dt>Ruang aplikasi</dt><dd>${m ? fmt(Math.max(0, m.mb - s.coreMb) / 1000) : "–"} GB <small>(setelah inti ${fmt(s.coreMb / 1000)} GB)</small></dd></div><div><dt>Harga</dt><dd data-r="price"><b>${esc(priceTxt(m))}</b>${m && m.kind === "koin" ? " koin bermain" : ""}${m && m.pending ? ` <em class="nps-wait">${esc(m.pending)}</em>` : ""}</dd></div></dl>`;
  let act = "", note = "";
  if (st.tryOn) act = '<button type="button" class="nps-btn" data-a="untry">Kembali ke toko</button>';
  else {
    const tryB = '<button type="button" class="nps-btn alt" data-a="try">Coba tampilan</button>';
    if (own) act = tryB + (using ? '<button type="button" class="nps-btn" disabled>Sedang dipakai</button>' : `<button type="button" class="nps-btn go" data-a="use" ${st.busy ? "disabled" : ""}>Pakai</button>`);
    else if (premium) { const sale = !!(m && m.buyable); act = tryB + (sale ? '<button type="button" class="nps-btn go" data-a="paycenter">Beli di Payment Center</button>' : `<button type="button" class="nps-btn" disabled>${esc((m && m.reason) || "Pembayaran belum tersedia")}</button>`); note = sale ? "Model premium dibeli lewat Payment Center resmi; kepemilikan baru tercatat setelah pembayaran diverifikasi server. Dengan uang asli: minta izin orang tua/wali." : pay ? "Payment Center aktif, tetapi model ini belum dijual di sana. Tidak ada pembelian yang dapat dilakukan sekarang." : "Pembayaran uang asli belum aktif. Tidak ada pembelian yang dapat dilakukan sekarang."; }
    else if (st.confirm) act = `<div class="nps-conf" role="alertdialog" aria-label="Konfirmasi pembelian"><p>Beli <b>${esc(d.name)}</b> seharga <b>🪙 ${fmt(m.coins)}</b> koin bermain? Saldo sekarang 🪙 ${fmt(s.bal)}.</p><button type="button" class="nps-btn go" data-a="buy-yes" ${st.busy ? "disabled" : ""}>Ya, beli</button><button type="button" class="nps-btn" data-a="buy-no">Batal</button></div>`;
    else act = tryB + `<button type="button" class="nps-btn go" data-a="buy" ${st.busy || !m || !m.buyable || s.bal < m.coins ? "disabled" : ""}>Beli 🪙 ${m ? fmt(m.coins) : "–"}</button>`, note = m && s.bal < m.coins ? "Koin bermain belum cukup. Koin didapat dari bermain; koin top-up tidak dipakai di sini." : "";
  }
  const msg = st.msg ? `<div class="nps-msg ${st.msg.k}" role="${st.msg.k === "bad" ? "alert" : "status"}" data-r="msg">${esc(st.msg.t)}${st.msg.retry ? ' <button type="button" class="nps-btn" data-a="retry">Coba lagi</button>' : ""}</div>` : "";
  return `<h3>${esc(d.name)}</h3><div class="nps-kind">${d.kind === "dasar" ? "Bawaan" : d.kind === "koin" ? "Dibeli dengan koin bermain" : "Premium (pembayaran lewat Payment Center)"}</div>${spec}<div class="nps-act">${act}</div>${note ? `<p class="nps-note">${esc(note)}</p>` : ""}${msg}<p class="nps-fine">Model hanya mengubah tampilan dan penyimpanan — bukan akses sosial atau kekuatan permainan. Harga uji, kapasitas, dan lini masih menunggu keputusan Owner.</p>`;
}
function paintAll() {
  if (!root) return; const s = st.s, pay = s && s.pay && s.pay.available === true;
  root.querySelector('[data-r="bal"]').textContent = "🪙 " + (s ? fmt(s.bal) : "–");
  const tb = root.querySelector(".nps-topup"); tb.disabled = !pay; tb.title = pay ? "Buka Payment Center" : "Pembayaran belum tersedia";
  root.querySelector('[data-r="chips"]').innerHTML = chips(); root.querySelector('[data-r="card"]').innerHTML = card();
  root.querySelector('[data-r="say"]').textContent = SAYS[st.say % SAYS.length];
  if (!st.loopOn) { st.loopOn = true; } draw(performance.now());
}
function onClick(e) {
  const b = e.target.closest("button"); if (!b || b.disabled || !root) return; const a = b.dataset.a; try { NW.sfx && NW.sfx("click"); } catch (er) { /* abaikan */ }
  if (a === "exit") close();
  else if (a === "pick") { st.sel = b.dataset.m; st.confirm = false; st.msg = null; paintAll(); }
  else if (a === "try") { st.tryOn = true; paintAll(); } else if (a === "untry") { st.tryOn = false; paintAll(); }
  else if (a === "buy") { st.confirm = true; st.msg = null; paintAll(); } else if (a === "buy-no") { st.confirm = false; paintAll(); }
  else if (a === "buy-yes") { const m = sel(); if (!m || m.kind !== "koin" || st.busy) return; const opId = rid(); pend.set({ opId, model: m.id }); send(opId, m.id, false); }
  else if (a === "retry") { const r = st.msg && st.msg.retry; if (r) send(r.opId, r.model, true); }
  else if (a === "use") useModel(st.sel);
  else if (a === "reload") refresh(false);
  else if (a === "topup" || a === "paycenter") { if (!(st.s && (a === "paycenter" ? (sel() && sel().buyable) : (st.s.pay && st.s.pay.available === true)))) return; close(); try { NW.shopUI && NW.shopUI.open("topup"); } catch (er) { /* abaikan */ } }
}
function onCanvas(e) {
  if (!root) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * CW / r.width, y = (e.clientY - r.top) * CH / r.height;
  for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { if (h.npc) { st.say = (st.say + 1) % 4; root.querySelector('[data-r="say"]').textContent = SAYS[st.say]; } else { st.sel = h.id; st.confirm = false; st.msg = null; st.tryOn = false; paintAll(); } return; } }
}

// ---------- adegan ----------
function loop() { if (!root) return; draw(performance.now()); if (!reduced()) raf = requestAnimationFrame(loop); }
function draw(now) {
  if (!root || !c2) return; const c = c2, t = reduced() ? 0 : (now - t0) / 1000; hits = []; c.clearRect(0, 0, CW, CH);
  const bg = c.createLinearGradient(0, 0, 0, CH); bg.addColorStop(0, "#0f2a38"); bg.addColorStop(1, "#173f50"); c.fillStyle = bg; c.fillRect(0, 0, CW, CH);
  floor(c); walls(c, t);
  const list = [];
  list.push({ d: 0.5, f: () => racks(c) });
  for (const tb of tableSlots()) list.push({ d: tb.gx + tb.gy, f: () => table(c, tb, t) });
  list.push({ d: 5.2 + 0.9, f: () => counter(c, t) });
  list.sort((a, b) => a.d - b.d); for (const o of list) o.f();
  lights(c, t);
  if (st.tryOn) tryScene(c, t);
}
function floor(c) {
  for (let gx = 0; gx < W; gx++) for (let gy = 0; gy < D; gy++) poly(c, [P(gx, gy), P(gx + 1, gy), P(gx + 1, gy + 1), P(gx, gy + 1)], (gx + gy) % 2 ? "#efe3cb" : "#e4d6b8");
  poly(c, [P(0.4, 2.55), P(W - 0.4, 2.55), P(W - 0.4, 3.65), P(0.4, 3.65)], "rgba(43,111,151,.28)");   // karpet jalur etalase
  c.strokeStyle = "rgba(23,63,80,.5)"; c.lineWidth = 2; c.beginPath(); const a = P(0, D), b = P(W, D), d = P(W, 0); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.stroke();
}
function walls(c, t) {
  poly(c, [P(0, 0, 0), P(W, 0, 0), P(W, 0, WALL), P(0, 0, WALL)], "#e8f0f7", "rgba(23,63,80,.4)");   // dinding kanan-belakang
  poly(c, [P(0, 0, 0), P(0, D, 0), P(0, D, WALL), P(0, 0, WALL)], "#c9dcea", "rgba(23,63,80,.4)");     // dinding kiri-belakang
  poly(c, [P(0, 0, 0), P(W, 0, 0), P(W, 0, 7), P(0, 0, 7)], "#2b6f97"); poly(c, [P(0, 0, 0), P(0, D, 0), P(0, D, 7), P(0, 0, 7)], "#1f587a");
  poly(c, [P(0, 0, WALL - 6), P(W, 0, WALL - 6), P(W, 0, WALL), P(0, 0, WALL)], "#2b6f97"); poly(c, [P(0, 0, WALL - 6), P(0, D, WALL - 6), P(0, D, WALL), P(0, 0, WALL)], "#1f587a");
  // papan lampu "NUSAPHONE" di dinding kanan, poster di kiri
  wallPlane(c, "r", 4.1, 0, (g) => { const glow = 0.75 + 0.25 * Math.sin(t * 2.2); frame(g, 0, 54, 2.9, 24, "rgba(127,211,255," + glow + ")", "#173f50"); text(g, "NUSAPHONE", 1.45, 61.5, 14, "rgba(160,225,255," + (0.85 + 0.15 * glow) + ")", "center", 2.6); });
  wallPlane(c, "r", 0.6, 0, (g) => { posterPlane(g, 0, "#ffd447", "#e0a800", "Lini A", "koin bermain"); posterPlane(g, 1.15, "#5b4bb7", "#a79bff", "Lini B–C", "premium"); posterPlane(g, 2.3, "#1c1a2e", "#ffe08a", "Lini D", "Crown 17"); });
  wallPlane(c, "l", 0.7, 0, (g) => { frame(g, 0, 58, 2.4, 28, "#2b6f97", "#fff6d8"); text(g, "Aksesori", 1.2, 72, 12, "#173f50", "center", 2.1); text(g, "casing • charger • earbud", 1.2, 62, 7, "#3c6677", "center", 2.2); });
}
// bingkai di bidang dinding tanpa stroke (stroke ikut terskala sumbu-x bidang): tepi digambar sebagai persegi terisi. (x,v,w,h) = kiri-bawah dalam petak/piksel ke atas.
function frame(g, x, v, w, h, edge, fill) { g.fillStyle = edge; g.fillRect(x, -(v + h), w, h); g.fillStyle = fill; g.fillRect(x + 0.035, -(v + h) + 2, w - 0.07, h - 4); }
function posterPlane(g, u, col, rim, a, b) { frame(g, u, 32, 1.0, 40, rim, col); g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(u + 0.3, -66, 0.4, 20); text(g, a, u + 0.5, 40, 9, "#fff", "center", 0.9); text(g, b, u + 0.5, 34, 6, "rgba(255,255,255,.85)", "center", 0.92); }
function racks(c) {
  for (const [y0, y1] of [[0.7, 2.3], [3.4, 5.0]]) {
    prism(c, 0, y0, 0.5, y1, 0, 56, ["#f2eadb", "#d9cdb4", "#bcae92"]);
    for (let r = 0; r < 4; r++) {
      const z = 8 + r * 12; poly(c, [P(0.5, y0, z), P(0.5, y1, z), P(0.5, y1, z + 1.5), P(0.5, y0, z + 1.5)], "#8a7a58");
      const n = 5; for (let i = 0; i < n; i++) { const gy = y0 + 0.12 + i * ((y1 - y0 - 0.24) / n), col = ["#ff7a59", "#2fb39a", "#a79bff", "#ffd447", "#e05a7a", "#3d9bd4"][(i + r * 2) % 6]; poly(c, [P(0.5, gy, z + 1.5), P(0.5, gy + 0.22, z + 1.5), P(0.5, gy + 0.22, z + 9), P(0.5, gy, z + 9)], col, "rgba(23,63,80,.3)"); }
    }
  }
}
function table(c, tb, t) {
  const x0 = tb.gx, x1 = tb.gx + 1.7, y0 = tb.gy, y1 = tb.gy + 0.9, h = 24;
  prism(c, x0, y0, x1, y1, 0, h - 4, ["#cfe0ee", "#f6f1e4", "#d6cdb6"]);
  poly(c, [P(x0 - 0.05, y0 - 0.05, h), P(x1 + 0.05, y0 - 0.05, h), P(x1 + 0.05, y1 + 0.05, h), P(x0 - 0.05, y1 + 0.05, h)], "rgba(199,233,247,.85)", "#2b6f97");
  const tg = P((x0 + x1) / 2, y1 + 0.05, 6); c.fillStyle = "#173f50"; c.font = "800 9px system-ui,sans-serif"; c.textAlign = "center"; c.fillText("LINI " + tb.tag, tg.x, tg.y);
  tb.ids.forEach((id, i) => {
    const m = C.MODELS[id], pm = mOf(id), gx = x0 + 0.45 + i * 0.8, base = P(gx, (y0 + y1) / 2, h), on = st.sel === id, hh = 44 + (id === "crown17" ? 4 : 0);
    if (id === "crown17") { poly(c, [P(gx - 0.36, y0 + 0.08, h), P(gx + 0.36, y0 + 0.08, h), P(gx + 0.36, y1 - 0.08, h), P(gx - 0.36, y1 - 0.08, h)], "rgba(255,224,138,.35)", "#e0b84a"); }
    if (on) { const g = c.createRadialGradient(base.x, base.y - 24, 4, base.x, base.y - 24, 42); g.addColorStop(0, m.glow + "aa"); g.addColorStop(1, m.glow + "00"); c.fillStyle = g; c.fillRect(base.x - 44, base.y - 70, 88, 90); }
    const bob = on && !reduced() ? Math.sin(t * 3) * 1.5 : 0; phoneArt(c, m, base.x, base.y + bob, hh, true, t);
    const lab = pm ? priceTxt(pm) : "…", ow = pm && pm.owned; c.font = "800 8.5px system-ui,sans-serif"; const w = Math.max(30, c.measureText(lab).width + 10);
    rr(c, base.x - w / 2, base.y + 4, w, 12, 5); c.fillStyle = ow ? "#2f9c5a" : "#fff9ec"; c.fill(); c.strokeStyle = on ? "#ff7a59" : "#2b6f97"; c.lineWidth = on ? 2 : 1; c.stroke();
    c.fillStyle = ow ? "#fff" : "#173f50"; c.textAlign = "center"; c.fillText(ow ? "✓ Milikmu" : lab, base.x, base.y + 13);
    const bw = hh * m.aspect; hits.push({ id, x: base.x - bw / 2 - 4, y: base.y - hh - 4, w: bw + 8, h: hh + 22 });
  });
}
function counter(c, t) {
  const x0 = 4.9, x1 = 6.9, y0 = 1.1, y1 = 1.9;
  npc(c, 5.9, 0.45, t);
  prism(c, x0, y0, x1, y1, 0, 22, ["#f6f1e4", "#2b6f97", "#1f587a"]);
  poly(c, [P(x0 - 0.04, y0 - 0.04, 22), P(x1 + 0.04, y0 - 0.04, 22), P(x1 + 0.04, y1 + 0.04, 22), P(x0 - 0.04, y1 + 0.04, 22)], "#fff6d8", "#8a7a58");
  const reg = P(6.45, 1.5, 22); c.fillStyle = "#394b55"; c.fillRect(reg.x - 8, reg.y - 9, 16, 9); c.fillStyle = "#6fe8d0"; c.fillRect(reg.x - 6, reg.y - 15, 12, 7); c.fillStyle = "#173f50"; c.fillRect(reg.x - 5, reg.y - 14, 10, 5);
  const dm = P(5.45, 1.5, 22); phoneArt(c, C.MODELS.dasar, dm.x, dm.y, 26, true, t); const pm = mOf("dasar"), on = st.sel === "dasar";
  if (on) { c.strokeStyle = "#ff7a59"; c.lineWidth = 2; c.strokeRect(dm.x - 9, dm.y - 30, 18, 33); }
  hits.push({ id: "dasar", x: dm.x - 10, y: dm.y - 30, w: 20, h: 33 }); void pm;
  const tg = P(5.9, y1 + 0.02, 12); c.fillStyle = "#fff"; c.font = "800 8px system-ui,sans-serif"; c.textAlign = "center"; c.fillText("KASIR", tg.x, tg.y);
}
function npc(c, gx, gy, t) {   // penjaga toko fiktif "Mbak Sari"
  const p = P(gx, gy, 0), sway = reduced() ? 0 : Math.sin(t * 1.6) * 1.2; c.save(); c.translate(p.x + sway * 0.4, p.y);
  c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(0, 2, 12, 4, 0, 0, 7); c.fill();
  c.fillStyle = "#2f5d73"; rr(c, -8, -34, 16, 30, 4); c.fill(); c.fillStyle = "#fff6d8"; rr(c, -6, -26, 12, 22, 3); c.fill(); c.fillStyle = "#e0b84a"; c.fillRect(-6, -26, 12, 3);
  c.fillStyle = "#c98e5e"; c.beginPath(); c.arc(0, -41, 8, 0, 7); c.fill(); c.fillStyle = "#2a1b17"; c.beginPath(); c.arc(0, -44, 8.4, Math.PI, 0); c.fill(); c.fillRect(-8.4, -44, 3, 10);
  c.fillStyle = "#173f50"; c.beginPath(); c.arc(-2.8, -41, 1, 0, 7); c.arc(2.8, -41, 1, 0, 7); c.fill(); c.strokeStyle = "#7a3b25"; c.lineWidth = 1; c.beginPath(); c.arc(0, -38.5, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  rr(c, -9, -23, 18, 8, 2); c.fillStyle = "rgba(255,255,255,.0)"; c.fill();
  c.fillStyle = "#173f50"; c.font = "800 6.5px system-ui,sans-serif"; c.textAlign = "center"; c.fillText("Mbak Sari", 0, -18);
  c.restore(); hits.push({ npc: true, x: p.x - 14, y: p.y - 56, w: 28, h: 60 });
}
function lights(c, t) {
  c.save(); c.globalCompositeOperation = "lighter";
  for (const [gx, gy] of [[1.8, 2.2], [4.0, 2.2], [6.0, 2.2], [6.0, 1.2]]) { const p = P(gx, gy, WALL - 12), fl = reduced() ? 1 : 0.85 + 0.15 * Math.sin(t * 2 + gx); const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 64 * fl); g.addColorStop(0, "rgba(255,236,170,.20)"); g.addColorStop(1, "rgba(255,236,170,0)"); c.fillStyle = g; c.fillRect(p.x - 70, p.y - 70, 140, 160); }
  c.restore();
  c.fillStyle = "rgba(255,246,216,.9)"; for (const [gx, gy] of [[1.8, 2.2], [4.0, 2.2], [6.0, 2.2]]) { const p = P(gx, gy, WALL - 8); rr(c, p.x - 11, p.y - 2, 22, 4, 2); c.fill(); }
}
function tryScene(c, t) {   // "coba tampilan": pratinjau di tangan (klien saja)
  const m = C.modelOf(st.sel); c.fillStyle = "rgba(9,25,34,.78)"; c.fillRect(0, 0, CW, CH);
  const h = 232, cx = CW / 2, cy = CH - 30, tilt = reduced() ? 0 : Math.sin(t * 1.4) * 0.04; c.save(); c.translate(cx, cy); c.rotate(tilt);
  const w = h * m.aspect, g = c.createRadialGradient(0, -h / 2, 10, 0, -h / 2, h); g.addColorStop(0, m.glow + "55"); g.addColorStop(1, m.glow + "00"); c.fillStyle = g; c.fillRect(-h, -h * 1.4, h * 2, h * 1.6);
  phoneArt(c, m, 0, 0, h, true, t); c.fillStyle = "#c98e5e"; c.beginPath(); c.arc(-w * 0.32, -h * 0.18, 17, 0, 7); c.arc(w * 0.34, -h * 0.28, 15, 0, 7); c.fill(); c.restore();
  c.fillStyle = "#fff9ec"; c.textAlign = "center"; c.font = "800 15px system-ui,sans-serif"; c.fillText("Pratinjau — " + m.name, cx, 26); c.font = "700 11px system-ui,sans-serif"; c.fillStyle = "rgba(255,249,236,.8)"; c.fillText("Hanya tampilan di layar ini. Belum dibeli, tidak ada yang berubah.", cx, 44);
}

NW.phoneStore = { open, close, isOpen: () => !!root };
})();
