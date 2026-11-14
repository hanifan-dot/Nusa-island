// NUSA ISLAND — Zentro (Ide 07): aplikasi pencari. HANYA mencari halaman fiktif NusaWeb (indeks lokal di nusaweb.js); tidak ada internet umum, tidak ada permintaan jaringan.
// Hasil dibuka di NusaWeb (aplikasi terpisah) lewat NW.phoneWeb.pending.
(function () {
"use strict";
const NW = window.NW; if (!NW || !NW.phone || !NW.phoneWeb) return;
function mount(body, x) {
  const ctl = NW.phoneWeb.mountSearch(body, { esc: x.esc, q: "", open: (host) => { NW.phoneWeb.pending = host; x.open("nusaweb"); } });
  return { close() { ctl.close(); } };
}
NW.phone.registerApp("zentro", { mount });
})();
