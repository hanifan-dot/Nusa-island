// NUSA ISLAND — Samudra Follower: jalur MEMANCING (klien). Aktif HANYA bila server (ecoSfInfo, persetujuan Owner di shop_config/main.sf) mengaktifkan ikan untuk akun ini.
// Model BONUS: setelah ikan biasa mendarat (peluang ikan lama TIDAK berubah), klien melempar peluang yang disetujui Owner. Bila kena → SERVER-DULU:
// klien meminta server mencatat (id, berat, uid, ref = uid ikan biasa barusan). Ikan baru masuk coolbox/dex SETELAH server menjawab ok. Klien tidak pernah memberi ikan/koin sendiri.
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const C = window.NusaSFCatalog; if (!C) return;
const N = () => window.Nusa;
let info = { on: false, fish: [] }, lastFetch = 0, busy = false, fetching = false;

// Daftarkan 4 ikan ke tabel pencarian klien (FISH_BY_ID) — BUKAN ke daftar FISH (kolam ikan/peluang ikan lama tidak tersentuh).
const RMAP = { mythical: "legenda", mythical_event: "legenda", legendary: "legenda", epic: "epik" };
function register() {
  const F = N() && N().FISH_BY_ID; if (!F) return false;
  for (const f of C.FISH) if (!F[f.id]) F[f.id] = { id: f.id, name: f.name, rarity: RMAP[f.rarity], sfRarity: f.rarity, loc: "sf", price: 0, wMin: f.wMin, wMax: f.wMax, sf: true, credit: f.credit, desc: f.desc, emoji: null };
  return true;
}
const t0 = setInterval(() => { if (register()) clearInterval(t0); }, 250); setTimeout(() => clearInterval(t0), 30000);

async function refresh(force) {
  const E = NW.eco; if (!E || fetching || !E.active()) return info;
  if (!force && Date.now() - lastFetch < 5 * 60000) return info;
  fetching = true;
  try { const r = await E.sfInfo(); info = r && Array.isArray(r.fish) ? { on: !!r.on, fish: r.fish.filter((x) => C.isSF(x.id) && x.chance > 0 && x.chance <= 0.01) } : { on: false, fish: [] }; lastFetch = Date.now(); }
  catch (e) { /* fungsi belum ada / jaringan: tetap terkunci */ info = { on: false, fish: [] }; lastFetch = Date.now() - 4 * 60000; }
  finally { fetching = false; }
  if (NW.sf) NW.sf.setLive(info.on, info.fish.map((x) => x.id));
  return info;
}
// Dipanggil game.js setelah ikan BIASA (item) mendarat.
function after(item) {
  try {
    if (!item || !item.uid || busy || !NW.eco || !NW.eco.active()) return;
    if (!info.on) { refresh(false); return; }                                                // belum aktif: tidak melempar apa pun
    const Nn = N(); if (Nn.S.cooler.length >= Nn.coolerCap()) return;                          // coolbox penuh: lewati (tidak ada ikan yang hilang)
    const hit = info.fish.find((x) => Math.random() < x.chance); if (!hit) return;
    const f = C.BY_ID[hit.id], w = Math.round((f.wMin + (f.wMax - f.wMin) * Math.pow(Math.random(), 2.3)) * 100) / 100;
    award(f, w, item.uid);
  } catch (e) { /* tidak pernah mengganggu memancing */ }
}
async function award(f, w, ref) {
  busy = true;
  try {
    const Nn = N(), S = Nn.S, uid = NW.HD.newUid(S, "i");
    const r = await NW.eco.sfCatch({ id: f.id, w, uid, ref });
    const it = r && r.sfItem && r.sfItem.find((x) => x.uid === uid); if (!it) return;       // server tidak mengonfirmasi → tidak ada ikan
    if (S.cooler.some((x) => x.uid === it.uid)) return;                                       // anti-ganda lokal
    S.cooler.push({ uid: it.uid, id: it.id, w: it.w, t: Date.now(), sp: it.sp, lock: true }); // terkunci: tidak ikut "jual semua" tanpa sengaja
    const rec = S.dex[it.id] || { n: 0, best: 0 }; rec.n++; rec.best = Math.max(rec.best, it.w); S.dex[it.id] = rec;
    Nn.save(); Nn.refreshHUD(); register();
    const price = Nn.priceOf({ id: it.id, w: it.w, sp: it.sp });
    setTimeout(() => NW.sf.openCatch(it.id, { w: it.w, price }), 900);
  } catch (e) { /* ditolak server (batas harian/tidak aktif): tidak ada ikan, tidak ada koin */ if (e && /tidak dikenal|spesial|Batas/.test(e.message || "")) refresh(true); }
  finally { busy = false; }
}
NW.sfPlay = { after, refresh, register, info: () => info, _reset: () => { info = { on: false, fish: [] }; lastFetch = 0; busy = false; } };
setInterval(() => { if (!document.hidden && NW.eco && NW.eco.active()) refresh(false); }, 60000);
})();
