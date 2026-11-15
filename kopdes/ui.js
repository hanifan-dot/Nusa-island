// NUSA ISLAND — Kopdes (Pulau Para Legenda): dialog penjaga + panel beli joran.
// Joran, harga, urutan level & pembayaran = SAMA dengan Toko Pak Bono (Nusa.rodShopHTML → buy() → ecoBuy di server). Tidak ada harga/saldo/joran baru di sini.
(() => {
"use strict";
const NW = (window.NW = window.NW || {});
if (!window.Nusa || !Nusa.registerPanel) return;
// ---- Joran Kopdes: dibeli SEKALI (server: ecoBuy kind "kop", terkunci shop/config.kopdes), di luar tangga 20 joran. Angka dari data.js (KOPDES_ROD).
const R = KOPDES_ROD, SPEC = { blank: "#c4262e", w: 3.3, grip: "#3a1410", gripLen: 0.34, reel: { col: "#ffd24a", r: 3.3 }, node: false, accent: { kind: "kopdes", col: "#ffd24a" }, name: R.name };
const owned = () => !!(Nusa.S && Nusa.S.kop), on = () => owned() && Nusa.S.kopOn !== false;
NW.kopdesRod = { ROD: R, SPEC, owned, on, spec: () => (on() ? SPEC : null), capFloor: () => (on() ? R.capKg : 0), mul: () => (on() ? { str: R.strength, reel: R.reel } : null) };
const fmt = (n) => Nusa.fmt(n), bal = () => (NW.wallet ? NW.wallet.bal() : Nusa.S.money);
function rodCardHTML() {
  const st = owned() ? (on() ? `<span class="rod-tag on">✔ Dipakai</span>` : `<span class="rod-tag">Dimiliki</span>`) : "";
  const btn = owned() ? `<button class="btn" data-act="kopeq">${on() ? "Lepas" : "Pakai"}</button>` : `<button class="btn ${bal() >= R.price ? "gold" : ""}" data-act="kopbuy" ${bal() >= R.price ? "" : "disabled"}>Beli</button>`;
  return `<div class="rod-card kop ${on() ? "cur" : ""}"><img src="${NW.look.rodPreviewSpec(SPEC)}" alt="${R.name}" width="44" height="66"><div class="grow"><div class="nm">★ ${R.name} ${st}</div>
    <div class="sub">Ikan hingga ${R.capKg} kg · Kuat ${String(R.strength).replace(".", ",")}× · Tarik ${String(R.reel).replace(".", ",")}× · kilau merah</div><div class="sub">${R.desc}</div>
    <div class="sub price-line">${owned() ? "Milik selamanya" : "🪙 " + fmt(R.price) + " · sekali beli"}</div></div>${btn}</div>`;
}
Nusa.registerPanel("kopdes", {
  title: () => "🏪 Kopdes — Koperasi Desa",
  render: () => `<p class="muted">Koperasi Desa Pulau Para Legenda menjual joran untuk para pemancing. Pembayaran dicatat server.</p>` + rodCardHTML() + `<p class="muted" style="margin-top:10px">Joran biasa (harga sama dengan Toko Pak Bono):</p>` + Nusa.rodShopHTML(),
  act: (act) => {
    if (act === "kopeq" && owned()) { Nusa.S.kopOn = !on(); Nusa.save(); Nusa.renderPanel(); }
    if (act === "kopbuy" && !owned() && NW.wallet) {
      NW.wallet.charge(R.price, "kop:rod", () => { Nusa.S.kop = true; Nusa.S.kopOn = true; try { Nusa.toast("🎣 " + R.name + " dibeli!", "good"); Nusa.save(); Nusa.refreshHUD(); } catch (e) {} Nusa.renderPanel(); });
    }
  },
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
