// =========================================================
//  NUSA ISLAND — KLIEN AVATAR (NW.avatar). Penampilan = kode pendek (lihat economy/fashion-core.js). Kepemilikan item BERBAYAR hanya sah bila
//  dicatat SERVER (ecoFashionBuy, terikat UID, harga dari katalog server). Tanpa server (tamu/offline/Worker belum mendukung): item gratis tetap
//  bisa dipakai & disimpan lokal; pembelian TERKUNCI dengan pesan jujur — tidak ada jalur beli yang bisa dimanipulasi dari browser.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const F = window.NusaFashionCore, N = () => window.Nusa;
if (!F) return;
let owned = new Set(), serverCode = null, hist = [], phase = "wait", busy = false, lastErr = "", listeners = [], tried = 0;
const rid = () => "F" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36) + Math.floor(Math.random() * 1e9).toString(36);
const fire = () => { for (const f of listeners) try { f(); } catch (e) {} };
const S = () => N().S;
const A = () => NW.shopApi;
const live = () => { const a = A(); return !!(a && a.live && !a.sim && !a.isGuest() && !(NW.cloud && NW.cloud.sandbox)); };
const call = (name, d) => A().eco(name, d);
const unsupportedErr = (e) => { const m = String((e && (e.code || "")) + " " + (e && e.message || "")); return /not-found|unimplemented|fungsi tidak|unknown function|function.*not/i.test(m); };

// Status: guest (tamu/offline → hanya gratis) | wait (belum tahu) | unsupported (Worker lama) | ready (server siap)
function status() { if (!live()) return "guest"; return phase; }
const canBuy = () => status() === "ready";
const code = () => (S() && S().avatar && typeof S().avatar.code === "string" ? S().avatar.code : F.DEFAULT_CODE);
const ownedSet = () => owned;
const has = (id) => !!F.BY_ID[id] && (F.BY_ID[id].price === 0 || owned.has(id));

function applyToPlayer() {
  const W = NW.world; if (!W || !W.player || !NW.avatarDraw) return;
  const base = NW._baseStyle || (NW._baseStyle = Object.assign({}, W.player.style));
  const safe = F.validate(code(), owned);                 // kode yang tak sah (mis. item belum dimiliki) → jatuh ke bawaan
  const c = safe.ok ? safe.code : F.DEFAULT_CODE;
  const st = NW.avatarDraw.styleFor(c, base); if (st !== W.player.style) { if (st.costume) st.fxT0 = performance.now() / 1000; }
  W.player.style = st; W.player.isMe = true; W.player._fxT0 = undefined;
  if (NW.mp && NW.mp.sendOutfit) NW.mp.sendOutfit(c === F.DEFAULT_CODE ? "" : c);
}
function setLocal(c) { const s = S(); s.avatar = { code: c }; try { N().save(); } catch (e) {} applyToPlayer(); fire(); }

// Muat state dari server. Mengisi kepemilikan; menyelaraskan kode (server menang; bila server masih bawaan dan lokal kustom → dorong lokal).
async function refresh() {
  if (!live()) { phase = "wait"; applyToPlayer(); fire(); return status(); }
  if (busy) return status(); busy = true;
  try {
    const v = await call("ecoFashionState", {});
    owned = new Set(v.fashion.own); hist = v.fashion.hist || []; serverCode = v.fashion.code; phase = "ready"; lastErr = "";
    if (NW.eco && NW.eco.applyState && v.init) NW.eco.applyState(v);
    const loc = code();
    if (serverCode && serverCode !== F.DEFAULT_CODE) { if (serverCode !== loc) { S().avatar = { code: serverCode }; try { N().save(); } catch (e) {} } }
    else if (loc !== F.DEFAULT_CODE && F.validate(loc, owned).ok) { try { await save(loc, true); } catch (e) {} }
  } catch (e) { phase = unsupportedErr(e) ? "unsupported" : "wait"; lastErr = (e && e.message) || "Gagal terhubung."; }
  busy = false; applyToPlayer(); fire(); return status();
}
// Simpan penampilan. Server (bila siap) memvalidasi kepemilikan; selalu tersimpan lokal.
async function save(c, quiet) {
  const v = F.validate(c, owned); if (!v.ok) { if (!quiet) N().toast(v.why, "bad"); return { ok: false, why: v.why }; }
  if (status() === "ready") {
    try { const r = await call("ecoFashionSave", { opId: rid(), code: v.code }); serverCode = r.fashion.code; owned = new Set(r.fashion.own); }
    catch (e) { const m = (e && e.message) || "Gagal menyimpan ke server."; if (!quiet) N().toast(m, "bad"); return { ok: false, why: m }; }
  }
  setLocal(v.code); return { ok: true, code: v.code };
}
// Beli item. Hanya bila server siap. Mengembalikan {ok, why}. opId dipakai ulang bila jaringan gagal (tidak menggandakan).
let pend = null;
async function buy(id) {
  const it = F.BY_ID[id]; if (!it) return { ok: false, why: "Item tidak dikenal." };
  if (has(id)) return { ok: false, why: "Item ini sudah kamu miliki." };
  if (status() !== "ready") return { ok: false, why: status() === "guest" ? "Masuk akun dulu untuk membeli item." : status() === "unsupported" ? "Toko fashion belum aktif di server. Item berbayar masih terkunci." : "Menghubungi server… coba lagi sebentar lagi." };
  if (busy) return { ok: false, why: "Sedang memproses…" };
  const bal = NW.eco && NW.eco.balance ? NW.eco.balance() : 0; if (bal < it.price) return { ok: false, why: "🪙 Koin kamu belum cukup untuk membeli item ini!", short: true };
  busy = true; if (!pend || pend.id !== id) pend = { id, opId: rid() };
  try {
    const r = await call("ecoFashionBuy", { opId: pend.opId, id }); pend = null;
    owned = new Set(r.fashion.own); hist = r.fashion.hist || []; if (NW.eco && NW.eco.applyState) NW.eco.applyState(r);
    busy = false; fire(); return { ok: true, price: it.price };
  } catch (e) { busy = false; const m = (e && e.message) || "Gagal membeli."; if (/Koin tidak cukup/.test(m)) { pend = null; return { ok: false, why: "🪙 Koin kamu belum cukup untuk membeli item ini!", short: true }; } if (/sudah/.test(m)) pend = null; return { ok: false, why: m }; }
}
function start() {
  applyToPlayer();
  const t = setInterval(() => { if (status() === "ready" || status() === "unsupported" || ++tried > 40) { clearInterval(t); return; } if (live()) refresh(); }, 3000);
  setTimeout(() => { if (live()) refresh(); }, 1500);
}

NW.avatar = { F, status, canBuy, code, has, owned: ownedSet, hist: () => hist, refresh, save, buy, apply: applyToPlayer, start, onChange: (f) => listeners.push(f), lastError: () => lastErr,
  balance: () => (NW.eco && NW.eco.active() ? NW.eco.balance() : (N().S ? N().S.money : 0)), _setOwned: (a) => { owned = new Set(a); fire(); } };
window.addEventListener("load", () => setTimeout(start, 600));
})();
