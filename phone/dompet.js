// NUSA ISLAND — Dompet Nusa (Ide 07): menampilkan SALDO dari server (koin bermain + koin top-up) dan status pembayaran dari backend. Dompet TIDAK memproses pembayaran.
// "Isi Koin" hanya membuka Toko Premium / Payment Center yang LAMA (NW.shopUI, tab top up) — verifikasi & QRIS tetap di sana. Bila backend belum menyatakan pembayaran tersedia: tombol nonaktif dan tertulis "Pembayaran belum tersedia" (tidak ada keberhasilan palsu).
(function () {
"use strict";
const NW = window.NW; if (!NW || !NW.phone) return;
const fmt = (n) => String(Math.max(0, Math.floor(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
function mount(body, x) {
  const esc = x.esc; let s = null, err = "", gone = false, busy = false;
  body.innerHTML = '<div class="dw"></div>'; const root = body.querySelector(".dw");
  function paint() {
    if (gone) return; const pay = s && s.pay && s.pay.available === true;
    root.innerHTML = `<div class="nph-card dw-c"><small>Koin bermain</small><b data-r="play">🪙 ${s ? fmt(s.bal) : "–"}</b><small>Didapat dari bermain. Dipakai di toko NusaPhone (model koin) dan Ocean Spin.</small></div>
<div class="nph-card dw-c"><small>Koin top-up</small><b data-r="topup">🪙 ${s ? fmt(s.topup) : "–"}</b><small>Dari pembelian lewat Toko Premium. Tidak bisa dipakai di Ocean Spin.</small></div>
<div class="dw-st ${pay ? "ok" : "off"}" role="status" data-r="status">${s ? (pay ? "Pembayaran tersedia lewat Toko Premium." : "Pembayaran belum tersedia.") : err ? esc(err) : "Memuat saldo…"}</div>
<button type="button" class="pg-cta" data-a="topup" ${pay && !busy ? "" : "disabled"}>Isi Koin</button>
<p class="nph-hint">Dompet Nusa hanya menampilkan saldo dari server. Pengisian koin selalu lewat Toko Premium (Payment Center resmi); ponsel akan ditutup saat Toko Premium dibuka.</p>${err && s ? `<div class="pg-warn" role="alert">${esc(err)}</div>` : ""}<button type="button" class="pg-sm" data-a="refresh">Segarkan</button>`;
  }
  async function refresh() { if (busy) return; busy = true; err = ""; paint(); try { const r = await x.call("phoneState", {}); if (!gone) s = r.state; } catch (e) { err = e && e.code === "unavailable" ? "Koneksi terputus." : "Saldo gagal dimuat."; } busy = false; paint(); }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return; x.N().sfx && x.N().sfx("click");
    if (b.dataset.a === "refresh") refresh();
    else if (b.dataset.a === "topup") { if (!(s && s.pay && s.pay.available === true)) return; x.close(); try { NW.shopUI && NW.shopUI.open("topup"); } catch (er) { /* abaikan */ } }
  });
  paint(); refresh();
  return { close() { gone = true; }, update() { /* tetap */ } };
}
NW.phone.registerApp("dompet", { mount });
})();
