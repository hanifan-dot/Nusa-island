// NUSA ISLAND — Kopdes (Pulau Para Legenda): dialog penjaga + panel beli joran.
// Joran, harga, urutan level & pembayaran = SAMA dengan Toko Pak Bono (Nusa.rodShopHTML → buy() → ecoBuy di server). Tidak ada harga/saldo/joran baru di sini.
(() => {
"use strict";
const NW = (window.NW = window.NW || {});
if (!window.Nusa || !Nusa.registerPanel) return;
Nusa.registerPanel("kopdes", {
  title: () => "🏪 Kopdes — Koperasi Desa",
  render: () => `<p class="muted">Koperasi Desa Pulau Para Legenda menjual joran untuk para pemancing. Harga dan urutan joran sama dengan Toko Pak Bono; pembayaran dicatat server.</p>` + Nusa.rodShopHTML(),
});
function talk(api) {
  api.openDialog({
    name: "Kopdes", avatar: "🏪", role: "Koperasi Desa Pulau Para Legenda",
    lines: ["Selamat datang di Kopdes! Koperasi desa ini melayani para pemancing: joran yang lebih kuat untuk ikan yang lebih besar.", "Mau lihat rak joran?"],
    options: [{ label: "🎣 Lihat joran", act: () => { api.closeDialog(); Nusa.openPanel("kopdes"); } }],
  });
  return true;
}
NW.kopdesUI = { talk };
})();
