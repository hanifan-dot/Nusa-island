// =========================================================
//  NUSA ISLAND — Tahap 4.1: MENU UTAMA ☰ (menyatukan ikon HUD kanan atas)
//  Prinsip: tombol-tombol lama TETAP ADA di DOM (hanya disembunyikan lewat CSS) dan tetap dimiliki modulnya masing-masing
//  (misi, petualangan, premium, login 7 hari, profil, musik…). Menu hanya membuat "ubin" yang memanggil .click() tombol aslinya,
//  jadi setiap fitur berfungsi persis seperti sebelumnya (klaim server Login 7 Hari, QRIS, dsb. tidak tersentuh).
//  Tanda seru: ubin menampilkan lencana HANYA bila lencana asli tombolnya sedang tampil (misi bisa diklaim, cerita baru, klaim login
//  siap, …). Tanda seru di ☰ = ada setidaknya satu lencana asli yang aktif. Tidak ada notifikasi buatan, tidak berkedip terus-menerus.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const $ = (id) => document.getElementById(id);
const N = () => window.Nusa;
// urutan & nama tampilan; tombol lain yang ditambahkan modul baru ikut otomatis (nama dari aria-label) di akhir
const KNOWN = [
  ["misiBtn", "Misi Harian"], ["streakBtn", "Hadiah Login 7 Hari"], ["evBtn", "Event Monster Legenda"], ["skillBtn", "Keahlian & Cerita"], ["advBtn", "Kompas & Petualangan"],
  ["dexBtn", "Koleksi Ikan"], ["crownBtn", "Nusa Premium"], ["acctBtn", "Profil & Akun"], ["serverBtn", "Server"], ["musicBtn", "Musik & Suara"], ["muteBtn", "Suara"],
];
const ORDER = KNOWN.map((k) => k[0]), LABEL = Object.fromEntries(KNOWN);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let tiles = new Map(), obs = null, isOpen = false, lastFocus = null;

function origs() {
  const hr = document.querySelector(".hud-right"); if (!hr) return [];
  const arr = [...hr.querySelectorAll(":scope > button.icon-btn")].filter((b) => b.id !== "hudMenuBtn");
  arr.sort((a, b) => { const ia = ORDER.indexOf(a.id), ib = ORDER.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  return arr;
}
const iconOf = (b) => { const t = [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("").trim(); return t || "•"; };
const labelOf = (b) => LABEL[b.id] || b.getAttribute("aria-label") || b.title || "Menu";
// lencana asli yang sedang aktif pada tombol: terlihat (bukan .hidden), bukan titik status, bukan angka 0
function alertOf(b) {
  for (const el of b.querySelectorAll(".badge")) {
    if (el.classList.contains("hidden") || el.classList.contains("acct-dot")) continue;
    const t = (el.textContent || "").trim();
    if (t === "0") continue;
    return /^\d+$/.test(t) ? t : "!";
  }
  return null;
}
function build() {
  const list = $("hmList"); if (!list) return;
  const bs = origs(), ids = bs.map((b) => b.id || labelOf(b)).join("|");
  if (list.dataset.ids !== ids) {                       // hanya bangun ulang bila daftar tombol berubah
    tiles = new Map(); list.innerHTML = "";
    for (const b of bs) {
      const t = document.createElement("button"); t.type = "button"; t.className = "hm-tile"; t.dataset.for = b.id || "";
      t.innerHTML = `<span class="hm-ic"></span><span class="hm-lb"></span><span class="hm-bd hidden"></span>`;
      t.addEventListener("click", () => { const o = b; close(true); try { N().sfx("click"); } catch (e) {} o.click(); });
      list.appendChild(t); tiles.set(b, t);
    }
    // jalan pintas ke Dunia Bersama (dock 👥 tetap ada di layar)
    list.dataset.ids = ids;
    watch(bs);
  }
  sync();
}
function sync() {
  let any = false;
  for (const [b, t] of tiles) {
    const a = alertOf(b); if (a) any = true;
    t.querySelector(".hm-ic").textContent = iconOf(b);
    t.querySelector(".hm-lb").textContent = b.id === "muteBtn" ? (iconOf(b) === "🔇" ? "Suara: mati" : "Suara: nyala") : labelOf(b);
    const bd = t.querySelector(".hm-bd"); bd.classList.toggle("hidden", !a); bd.textContent = a || "";
    t.classList.toggle("alert", !!a); t.setAttribute("aria-label", labelOf(b) + (a ? " (ada yang perlu diperhatikan)" : ""));
  }
  const mb = $("hudMenuBadge"); if (mb) mb.classList.toggle("hidden", !any);
  const btn = $("hudMenuBtn"); if (btn) btn.setAttribute("aria-label", any ? "Menu utama (ada yang perlu diperhatikan)" : "Menu utama");
}
let raf = 0; const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); };
function watch(bs) {
  if (obs) obs.disconnect();
  obs = new MutationObserver(soon);
  for (const b of bs) obs.observe(b, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "hidden", "style"] });
}
function open() {
  if (isOpen) return; build(); isOpen = true; lastFocus = document.activeElement;
  $("hudMenu").classList.remove("hidden"); $("hudMenuOv").classList.remove("hidden"); $("hudMenuBtn").setAttribute("aria-expanded", "true");
  document.body.classList.add("hm-open");
  try { N().sfx("click"); } catch (e) {}
}
function close(silent) {
  if (!isOpen) return; isOpen = false;
  $("hudMenu").classList.add("hidden"); $("hudMenuOv").classList.add("hidden"); $("hudMenuBtn").setAttribute("aria-expanded", "false");
  document.body.classList.remove("hm-open");
  if (!silent && lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
}
function hook() {
  const hr = document.querySelector(".hud-right"); if (!hr || $("hudMenuBtn")) return;
  const b = document.createElement("button"); b.id = "hudMenuBtn"; b.type = "button"; b.className = "chip icon-btn hm-btn"; b.setAttribute("aria-haspopup", "dialog"); b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", "Menu utama");
  b.innerHTML = `<span class="hm-bars" aria-hidden="true">☰</span><span id="hudMenuBadge" class="hm-badge hidden" aria-hidden="true">!</span>`;
  hr.appendChild(b);
  const ov = document.createElement("div"); ov.id = "hudMenuOv"; ov.className = "hm-ov hidden"; document.body.appendChild(ov);
  const m = document.createElement("aside"); m.id = "hudMenu"; m.className = "hm hidden"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Menu utama");
  m.innerHTML = `<header><b>Menu</b><button type="button" id="hmClose" aria-label="Tutup menu">✕</button></header><div id="hmList" class="hm-list"></div>`;
  document.body.appendChild(m);
  b.addEventListener("click", () => (isOpen ? close() : open()));
  ov.addEventListener("click", () => close()); $("hmClose").addEventListener("click", () => close());
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen) close(); });
  // tombol baru yang ditambahkan modul belakangan (mis. 👑 setelah login) ikut masuk menu
  new MutationObserver(() => { build(); }).observe(hr, { childList: true });
  setInterval(sync, 2000);                               // jaring pengaman untuk lencana yang diubah lewat style
  build();
}
NW.hudMenu = { hook, open, close, sync, build, get isOpen() { return isOpen; }, _tiles: () => tiles };
})();
