// =========================================================
//  NUSA ISLAND — TAS PEMAIN: Gamepass · Perlengkapan · Fashion. Tombol ransel SVG di HUD kanan atas (di samping ☰).
//  • Hak milik SELALU dari server (entitlement lewat NW.shop). PENDING/DITOLAK/belum dibayar tidak pernah muncul sebagai "dimiliki".
//  • Pakai/Lepaskan hanya mengubah status perlengkapan; hak milik permanen TIDAK dihapus. Pancing Aurora: status disimpan SERVER (ecoEquip) —
//    bonus peluang dihitung server hanya bila dimiliki (NYATA) dan sedang dipakai. Gamepass lain: kosmetik saja (tanpa bonus gameplay).
//  • Pembelian yang BARU disetujui saat sesi berjalan otomatis terpasang; pemain lama tidak diubah penampilannya.
//  • Tombol lama tidak dihapus/diganti (👥 Dunia Bersama, ☰ Menu, dsb. tetap seperti semula).
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa, SC = window.NusaShopCore;
const ICON_BAG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 6.5c0-2 2.2-3.5 5-3.5s5 1.5 5 3.5" fill="none" stroke="#173f50" stroke-width="2.2" stroke-linecap="round"/><path d="M7.5 12.5c0-3 2.4-5.2 5.2-5.2h6.6c2.8 0 5.2 2.2 5.2 5.2v13c0 2-1.6 3.5-3.6 3.5H11.1c-2 0-3.6-1.5-3.6-3.5z" fill="#2fb39a" stroke="#173f50" stroke-width="2"/><path d="M11 18.5h10v6.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 11 25z" fill="#f0b53a" stroke="#173f50" stroke-width="1.8"/><path d="M13.5 18.5v-2.2a2.5 2.5 0 0 1 5 0v2.2" fill="none" stroke="#173f50" stroke-width="1.8" stroke-linecap="round"/><path d="M7.5 15.2H5.6A1.6 1.6 0 0 0 4 16.8v4.4" fill="none" stroke="#173f50" stroke-width="2" stroke-linecap="round"/><path d="M24.5 15.2h1.9a1.6 1.6 0 0 1 1.6 1.6v4.4" fill="none" stroke="#173f50" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON = {
  aur: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 27 25 5" stroke="#d9d4ff" stroke-width="2.4" stroke-linecap="round"/><path d="M25 5c2 3 1 7-2 9" fill="none" stroke="#8fd9ff" stroke-width="1.6"/><path d="M7 9l1.2 2.6L11 12.5 8.2 13.6 7 16.5 5.8 13.6 3 12.5l2.8-.9z" fill="#fff6a8"/><path d="M22 21l-3 .2 2-3.2-3.4.4" fill="none" stroke="#8fe9ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sul: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23 4 10l7 6 5-9 5 9 7-6-1 13z" fill="#f0c53a" stroke="#fff6e0" stroke-width="1.6" stroke-linejoin="round"/><rect x="5" y="24" width="22" height="3.2" rx="1" fill="#fff6e0"/></svg>',
  gen: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1L16 21.6l-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z" fill="#f0b53a" stroke="#173f50" stroke-width="1.6" stroke-linejoin="round"/></svg>',
};
let tab = "gamepass", busy = false, note = "", noteBad = false, prevOwned = null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const owned = () => (NW.shop && NW.shop.owned ? NW.shop.owned() : {});
// gamepass dari katalog server-core (sumber yang sama dengan Premium Shop); hanya yang berkategori gamepass
const passes = () => (SC ? SC.PRODUCTS.filter((p) => p.cat === "gamepass") : []);
const isOwn = (p) => (p.grants || []).length > 0 && p.grants.every((g) => owned()[g]);
const equippable = (p) => !!(NW.shop && NW.shop.EQ && NW.shop.EQ[p.id]);
const worn = (p) => !!(NW.shop && NW.shop.isEquipped && NW.shop.isEquipped(p.id));
const icoOf = (p) => (p.id === "gamepass_aurora" ? ["aur", ICON.aur] : p.id === "gamepass_sultan" ? ["sul", ICON.sul] : ["", ICON.gen]);
const descOf = (p) => (p.id === "gamepass_aurora" ? "Pancing biru-ungu dengan efek aurora. Bonus +1 poin persentase peluang ikan Langka (dihitung server; Megalodon & ikan event tidak ikut)."
  : p.id === "gamepass_sultan" ? "Kostum, nama emas, gelar & dekor Sultan. Tampilan saja — tanpa bonus gameplay." : "Kosmetik — tanpa bonus gameplay.");

function card(p) {
  const own = isOwn(p), on = own && worn(p), [cls, svg] = icoOf(p), eq = equippable(p);
  const tag = !own ? '<span class="bg-tag lock">Belum dimiliki</span>' : on ? '<span class="bg-tag use">Sedang dipakai</span>' : '<span class="bg-tag">Dimiliki</span>';
  let btn = "";
  if (own && eq) btn = on ? `<button class="bg-b ghost" data-act="bagOff" data-arg="${p.id}" ${busy ? "disabled" : ""}>Lepaskan</button>` : `<button class="bg-b" data-act="bagOn" data-arg="${p.id}" ${busy ? "disabled" : ""}>Pakai</button>`;
  else if (!own) btn = `<button class="bg-b gold" data-act="bagShop">Lihat di Premium Shop</button>`;
  const extra = own && p.id === "gamepass_aurora" ? `<div class="bg-s">${bonusLine()}</div>` : "";
  return `<div class="bg-card ${own ? "" : "off"}"><div class="bg-ic ${cls}">${svg}</div><div><div class="bg-h">${esc(p.name)} ${tag}</div><div class="bg-s">${esc(descOf(p))}</div>${extra}${btn}</div></div>`;
}
function bonusLine() {
  const a = NW.eco && NW.eco.aur ? NW.eco.aur() : null;
  if (!a) return "Bonus peluang: menunggu server ekonomi (belum aktif).";
  if (!a.own) return "";
  return a.live ? "Bonus peluang AKTIF (diverifikasi server)." : (a.eq === false ? "Dilepas — bonus peluang tidak aktif. Hak milikmu tetap permanen." : "Bonus peluang belum aktif (menunggu pembelian NYATA terverifikasi server).");
}
function viewGamepass() { const L = passes(); return `<div class="bg-list">${L.map(card).join("") || '<div class="bg-note">Belum ada Gamepass.</div>'}</div><div class="bg-note">Hak milik hanya muncul setelah pembayaran disetujui server. Pesanan MENUNGGU/DITOLAK tidak pernah diberikan. Melepas tidak menghapus kepemilikan.</div>`; }
function viewGear() {
  const S = N().S, U = window.UPGRADES || {}, rows = [["rod", "Joran"], ["bait", "Umpan"], ["cooler", "Coolbox"], ["boat", "Perahu"]];
  const nm = (k) => { const u = U[k], lv = (S.up && S.up[k]) || 0; return u && u.levels ? u.levels[Math.min(lv, u.levels.length - 1)] : "Tingkat " + (lv + 1); };
  const eq = (NW.shop && NW.shop.owned ? Object.entries((S.shop && S.shop.equip) || {}) : []).filter(([s, i]) => owned()[i]);
  return `<div>${rows.map(([k, t]) => `<div class="bg-row"><b>${t}</b><span>${esc(nm(k))}</span></div>`).join("")}</div>`
    + (NW.quest && NW.quest.bagCard ? NW.quest.bagCard() : "")          // Joran WhatsApp (hadiah Quest Owner) — status Pakai/Lepaskan sah di server
    + (eq.length ? `<div class="bg-note"><b>Kosmetik terpasang:</b> ${eq.map(([s, i]) => esc(s + ": " + i.replace(/_/g, " "))).join(", ")}</div>` : "")
    + `<div class="bg-note">Upgrade dibeli di Pasar/Toko Pancing. Status perlengkapan tersimpan bersama Cloud Save.</div>`;
}
function viewFashion() {
  let code = "";
  try { code = NW.avatar.code(); } catch (e) {}
  return `<div class="bg-card"><div class="bg-ic">${ICON.gen}</div><div><div class="bg-h">Penampilan saat ini</div><div class="bg-s">${code ? "Tersimpan di server." : "Penampilan awal."} Item fashion kamu tidak pernah hilang saat berganti baju.</div><button class="bg-b" data-act="bagAvatar">Buka Editor Avatar</button></div></div>`
    + `<div class="bg-note">Beli & ganti pakaian di <b>NUSA STYLE — Fashion &amp; Avatar Studio</b> (Muara Kampung) atau lewat menu ☰ → Edit Avatar.</div>`;
}
function render() {
  const T = [["gamepass", "Gamepass"], ["gear", "Perlengkapan"], ["fashion", "Fashion"]];
  return `<div class="bg-tabs" role="tablist">${T.map(([k, t]) => `<button class="bg-tab ${tab === k ? "on" : ""}" role="tab" data-act="bagTab" data-arg="${k}">${t}</button>`).join("")}</div>`
    + (tab === "gamepass" ? viewGamepass() : tab === "gear" ? viewGear() : viewFashion()) + `<div class="bg-save ${note ? (noteBad ? "bad" : "ok") : ""}" id="bgSave" aria-live="polite">${esc(note)}</div>`;
}
async function setWear(pid, on) {
  if (busy) return; busy = true; note = "Menyimpan…"; noteBad = false; N().renderPanel();
  let r; try { r = await NW.shop.toggleEquip(pid); } catch (e) { r = { ok: false }; }
  busy = false;
  if (r && r.ok === false) { note = "Gagal menyimpan. Coba lagi."; noteBad = true; } else { note = on ? "Terpasang & tersimpan ✔" : "Dilepas & tersimpan ✔ (hak milik tetap)"; noteBad = false; try { N().sfx("click"); } catch (e) {} }
  N().renderPanel();
}
function act(a, arg) {
  if (a === "bagTab") { tab = arg; note = ""; N().renderPanel(); return; }
  if (a === "bagOn") { if (!NW.shop.isEquipped(arg)) setWear(arg, true); return; }
  if (a === "bagOff") { if (NW.shop.isEquipped(arg)) setWear(arg, false); return; }
  if (a === "qoBagEquip") { if (NW.quest && !busy) { busy = true; N().renderPanel(); NW.quest.setEquip(arg === "1").then((ok) => { busy = false; note = ok ? (arg === "1" ? "Terpasang & tersimpan ✔" : "Dilepas & tersimpan ✔ (hak milik tetap)") : "Gagal menyimpan. Coba lagi."; noteBad = !ok; N().renderPanel(); }); } return; }
  if (a === "bagShop") { N().closePanel(); if (NW.shopUI) NW.shopUI.open("gamepass"); return; }
  if (a === "bagAvatar") { N().closePanel(); if (NW.avatarUI) NW.avatarUI.open("edit"); return; }
}
function open(t) { tab = t || tab; note = ""; try { N().sfx("click"); } catch (e) {} N().openPanel("bag"); }
// pembelian yang baru disetujui saat sesi berjalan → terpasang otomatis (Aurora: default terpasang di server)
function watch() {
  if (!NW.shop || !NW.shop.owned) return; const o = owned();
  if (prevOwned === null) { if (NW.shop._loaded && NW.shop._loaded()) prevOwned = Object.assign({}, o); return; }
  for (const p of passes()) {
    if (!equippable(p) || p.id === "gamepass_aurora") continue;
    if ((p.grants || []).every((g) => o[g]) && !(p.grants || []).every((g) => prevOwned[g]) && !worn(p)) { try { NW.shop.toggleEquip(p.id); } catch (e) {} }
  }
  prevOwned = Object.assign({}, o);
}
function mount() {
  const hr = document.querySelector(".hud-right"); if (!hr || document.getElementById("bagBtn")) return;
  const b = document.createElement("button"); b.type = "button"; b.id = "bagBtn"; b.className = "chip bag-btn"; b.setAttribute("aria-label", "Tas: Gamepass, Perlengkapan, Fashion"); b.innerHTML = ICON_BAG;
  b.addEventListener("click", () => open());
  hr.appendChild(b);
  N().registerPanel("bag", { title: () => "Tas", render, act });
}
NW.bag = { open, render, act, mount, ICON_BAG, _tab: (t) => { tab = t; } };
window.addEventListener("load", () => { setTimeout(mount, 800); setInterval(watch, 1500); });
})();
