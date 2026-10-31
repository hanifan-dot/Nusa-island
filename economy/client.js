// =========================================================
//  NUSA ISLAND — klien EKONOMI SERVER (NW.eco). Aktif hanya bila: masuk akun + backend Cloud (shop/cloud.js) + akun sudah diinisialisasi server.
//  Saat AKTIF: koin tidak pernah diubah langsung di browser. Tangkapan dilaporkan, penjualan/hadiah/pembelian diminta ke server, dan
//  angka saldo di layar = jawaban server (own + Top Up). Tamu/offline/simulasi → perilaku lama persis (S.money lokal).
//  Server memutuskan nilai; klien hanya menampilkan. Lihat economy/core.js untuk aturan & batas jujur.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa;
const A = () => NW.shopApi;
let st = null, busy = false, booting = false, q = [], rq = [], lastErr = "", inflight = null, timer = null;
const schedule = (ms) => { if (timer) return; timer = setTimeout(() => { timer = null; flush(); }, ms); };
const rid = () => "E" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36) + Math.floor(Math.random() * 1e9).toString(36);
const live = () => { const a = A(); return !!(a && a.live && !a.sim && !a.isGuest() && !(NW.cloud && NW.cloud.sandbox)); };
const active = () => !!(st && st.init && live());
const call = (name, d) => A().eco(name, d);
const toast = (m, k) => { try { N().toast(m, k); } catch (e) {} };

function apply(v) {
  if (!v || typeof v !== "object" || typeof v.balance !== "number") return;
  st = v; const S = N().S;
  S.money = Math.max(0, Math.floor(v.own));                       // cermin saja; sumber kebenaran = server
  for (const k of Object.keys(v.up || {})) S.up[k] = v.up[k];
  try { N().refreshHUD(); } catch (e) {}
}
// Inisialisasi akun (migrasi sekali) lalu selaraskan. Aman dipanggil berulang.
async function ensure() {
  if (!live() || booting) return active();
  booting = true;
  try {
    let v = await call("ecoState", {});
    if (!v.init) {
      const S = N().S, fish = (S.cooler || []).concat((S.home && S.home.placedFish) || []).filter((x) => x && x.uid).map((x) => ({ uid: x.uid, id: x.id, w: x.w }));
      v = await call("ecoInit", { money: S.money, up: S.up, homeLv: S.home && S.home.level, cooler: fish });
    }
    apply(v); await flush();
    // ikan di coolbox yang belum tercatat server (mis. tangkapan saat offline) dilaporkan ulang — tetap kena batas laju server
    const have = new Set(st.box || []);
    for (const it of N().S.cooler || []) if (it && it.uid && !have.has(it.uid) && !q.some((x) => x.uid === it.uid)) q.push({ id: it.id, w: it.w, uid: it.uid });
    await flush();
  } catch (e) { lastErr = (e && e.message) || "gagal"; }
  finally { booting = false; }
  return active();
}
async function flush() {
  if (busy || !live()) return; busy = true;
  try {
    while (rq.length) { const r = rq[0]; try { apply(await call("ecoReward", r)); rq.shift(); } catch (e) { if (e && (e.code === "invalid-argument" || e.code === "failed-precondition")) rq.shift(); else throw e; } }
    while (q.length || inflight) {
      if (!inflight) { const items = q.slice(0, 10); inflight = { opId: rid(), items, tries: 0 }; }       // paket ≤10 tangkapan: hemat tulis Firestore; opId tetap saat diulang
      try { apply(await call("ecoCatch", { opId: inflight.opId, items: inflight.items.map((x) => ({ id: x.id, w: x.w, uid: x.uid })) })); q.splice(0, inflight.items.length); inflight = null; }
      catch (e) {
        const code = e && e.code;
        if (code === "resource-exhausted" && ++inflight.tries < 6) { schedule(8000); break; }          // terlalu cepat/batas jam: coba lagi nanti (tidak dibuang langsung)
        if (code && !/unavailable|internal|deadline|network|resource-exhausted/.test(code) && code !== "unauthenticated") { q.splice(0, inflight.items.length); inflight = null; }   // ditolak permanen (mis. data tak valid)
        else if (code === "resource-exhausted") { q.splice(0, inflight.items.length); inflight = null; }
        else throw e;
      }
    }
  } catch (e) { lastErr = (e && e.message) || "gagal"; }
  finally { busy = false; }
}
// ---- tangkapan ----
function onCatch(item) { if (!active() || !item || !item.uid) return; q.push({ id: item.id, w: item.w, uid: item.uid }); if (q.length >= 8) flush(); else schedule(window.NusaApi && window.NusaApi.enabled() ? 45000 : 20000); }   // dikirim berkelompok (≤10) tiap ±20 dtk, atau sebelum jual/beli
// ikan dilindungi: hadiah dari server (tidak ada item)
function release(fish, w, done) {
  if (!active()) return false;
  (async () => { try { const r = await call("ecoCatch", { opId: rid(), id: fish.id, w }); apply(r); if (done) done(r.reward); } catch (e) { toast("Hadiah pelepasan ikan belum tercatat server. Coba lagi nanti.", "bad"); } })();
  return true;
}
// ---- jual (async) ----
let selling = false;
function sell(uids, done) {
  if (!active() || selling) return false; selling = true;
  (async () => {
    try {
      await flush();
      const day = Math.max(1, Math.floor(N().S.day || 1));
      let r = await call("ecoSell", { opId: rid(), uids, day });
      apply(r); done(null, r);
    } catch (e) { done(e || new Error("gagal")); }
    finally { selling = false; }
  })();
  return true;
}
function drop(uids) { if (!active() || !uids || !uids.length) return; call("ecoDrop", { opId: rid(), uids: uids.slice(0, 200) }).then(apply).catch(() => {}); }
// ---- hadiah tetap & misi ----
function reward(key, localFallback) {
  if (!live() || !st) { localFallback(); return false; }          // tamu/offline → perilaku lama
  rq.push({ opId: rid(), key }); flush(); return true;
}
function mission(m, ok, fail) {
  if (!active()) return false;
  (async () => { try { const r = await call("ecoMission", { opId: rid(), mid: m.id, coins: m.coins }); apply(r); ok(r.amount); } catch (e) { toast((e && e.message) || "Hadiah misi gagal diklaim.", "bad"); if (fail) fail(e); } })();
  return true;
}
// ---- belanja: dipanggil wallet.charge. reason: "up:rod" | "rumah:2" | "dekor:karpet" ----
function buy(reason, grant, failCb) {
  const S = N().S, p = String(reason).split(":"); let body;
  if (p[0] === "up") body = { kind: "up", k: p[1], lv: (S.up[p[1]] || 0) + 1 };
  else if (p[0] === "rumah") body = { kind: "home", lv: parseInt(p[1], 10) };
  else if (p[0] === "dekor") body = { kind: "cat", id: p[1] };
  else return false;
  (async () => {
    try { await flush(); const r = await call("ecoBuy", Object.assign({ opId: rid() }, body)); grant(); apply(r); }   // grant dulu (ia memeriksa level lama), lalu angka server ditimpakan
    catch (e) { toast(e && e.code === "failed-precondition" ? (e.message || "Pembelian ditolak server.") : "Jaringan bermasalah. Coba lagi — koinmu tidak terpotong dua kali.", "bad"); await ensure(); if (failCb) failCb(); }
    finally { try { N().save(); N().refreshHUD(); } catch (e3) {} }
  })();
  return true;
}
NW.eco = { active, ensure, flush, onCatch, release, sell, drop, reward, mission, buy, balance: () => (st ? st.balance : 0), state: () => st, lastError: () => lastErr, _reset: () => { st = null; q = []; rq = []; inflight = null; } };
setInterval(() => { if (!document.hidden && live()) ensure().then(() => flush()); }, 45000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && live()) ensure(); });
setInterval(() => { if (!st && live() && !booting) ensure(); }, 2500);   // begitu login terdeteksi → aktifkan ekonomi server
})();
