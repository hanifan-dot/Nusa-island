// =========================================================
//  NUSA ISLAND — Tahap 3.7: DOMPET TUNGGAL berjangkar server
//  Pemain melihat SATU angka koin. Di balik layar: koin hasil bermain = S.money (di perangkat), koin hasil Top Up = saldo SERVER
//  (shop_entitlements.wallet.NYATA). Koin Top Up TIDAK PERNAH dipindah ke S.money; belanja memakainya lebih dulu lewat backend
//  (shop_spendCoins: idempoten per opId, tak bisa minus/ganda). Mengubah S.money di browser tidak bisa menambah/menghabiskan saldo Top Up.
//  Tamu / simulasi / belum ada saldo Top Up → perilaku lama persis (hanya S.money).
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa;
let top = 0, busy = false, retry = null, seeded = false;
const A = () => NW.shopApi;
const live = () => { const a = A(); return !!(a && a.live && !a.sim && !a.isGuest()); };
const local = () => { const S = N().S; return Math.max(0, Math.floor(Number(S.money) || 0)); };
const eco = () => !!(NW.eco && NW.eco.active());
const bal = () => (eco() ? NW.eco.balance() : local() + top);

function setFrom(e) {
  const v = e && e.env === "NYATA" && e.wallet ? Math.max(0, Math.floor(Number(e.wallet.NYATA) || 0)) : 0;
  if (v !== top) {
    const up = v - top; top = v;
    try { N().refreshHUD(); if (seeded && up > 0) { N().toast("🪙 +" + up.toLocaleString("id-ID") + " koin dari Top Up masuk ke dompetmu!", "good"); N().sfx("kedai_menang"); } } catch (e2) {}
  }
  seeded = true;
}
async function refresh() { if (!live()) { if (top) { top = 0; try { N().refreshHUD(); } catch (e) {} } return; } try { setFrom(await A().getEntitlements()); } catch (e) { /* offline: tetap pakai angka terakhir */ } }
const rid = () => "S" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);

// Bayar `cost` koin. grant() dipanggil SETELAH pembayaran sah (sinkron bila tidak memakai saldo Top Up). Mengembalikan true bila permintaan diterima.
function charge(cost, reason, grant, fail) {
  cost = Math.floor(Number(cost)); if (!(cost > 0) || busy || bal() < cost) return false;
  if (eco()) return NW.eco.buy(reason, grant, fail);   // ekonomi server: harga & saldo diputuskan server; grant() hanya setelah server menyetujui
  const S = N().S, useTop = live() ? Math.min(top, cost) : 0, useLocal = cost - useTop;
  if (useLocal > local()) return false;
  if (useTop <= 0) { S.money = local() - useLocal; grant(); return true; }
  busy = true;
  const op = retry && retry.amount === useTop && retry.reason === reason ? retry.opId : rid();   // percobaan ulang setelah jaringan putus memakai opId yang sama → tidak terpotong dua kali
  (async () => {
    try {
      const r = await A().spendCoins({ amount: useTop, opId: op, reason: String(reason || "belanja").toLowerCase().replace(/[^a-z0-9:_-]/g, "").slice(0, 40) || "belanja" });
      retry = null; top = Math.max(0, Math.floor(Number(r.balance) || 0));
      S.money = Math.max(0, local() - useLocal); grant();
    } catch (e) {
      if (e && e.code === "failed-precondition") { retry = null; await refresh(); try { N().toast("Saldo koin Top Up tidak cukup / sudah berubah.", "bad"); } catch (e2) {} }
      else { retry = { amount: useTop, reason, opId: op }; try { N().toast("Jaringan bermasalah. Coba lagi — koinmu tidak terpotong dua kali.", "bad"); } catch (e2) {} }
      if (fail) fail();
    } finally { busy = false; try { N().save(); N().refreshHUD(); } catch (e3) {} }
  })();
  return true;
}
NW.wallet = { bal, local, topup: () => top, charge, refresh, setFrom, isBusy: () => busy };

// ikut mengamati setiap pembacaan hak milik (toko, login, polling pesanan) agar saldo Top Up selalu mutakhir
function hook() { const a = A(); if (!a || a._wallet) return; a._wallet = true; const g = a.getEntitlements; a.getEntitlements = async function (d) { const e = await g.call(a, d); setFrom(e); return e; }; }
hook(); NW.wallet.hook = hook;
setInterval(() => { if (!document.hidden && live()) refresh(); }, 45000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
