// NUSA ISLAND — Samudra Follower: jalur MEMANCING (klien). Aktif HANYA bila server (ecoSfInfo, persetujuan Owner di shop_config/main.sf) mengaktifkan ikan untuk akun ini.
// Model BONUS: undian peluang dilakukan SERVER (acak server, ecoCatch) — satu kesempatan per ikan biasa sah. Klien hanya menampilkan ikan yang sudah dikonfirmasi server (sfItem).
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
// Dipanggil game.js setelah ikan BIASA mendarat. Klien TIDAK melempar peluang apa pun: undian dilakukan server saat tangkapan dilaporkan (ecoCatch). Di sini hanya menyegarkan status aktif/terkunci.
function after() { try { if (NW.eco && NW.eco.active() && !info.on) refresh(false); } catch (e) {} }
const seenSf = new Set();
// Hasil undian SERVER (sfItem dari ecoCatch). Ikan sudah ada di kotak server; klien hanya mencerminkan + menampilkan kartu.
function grant(list) {
  const Nn = N(), S = Nn && Nn.S; if (!S || !Array.isArray(list)) return;
  for (const it of list) {
    if (!it || !C.isSF(it.id) || typeof it.uid !== "string" || seenSf.has(it.uid) || S.cooler.some((x) => x.uid === it.uid)) continue;
    if (!C.BY_ID[it.id] || !(it.w > 0) || !(it.sp > 0)) continue;
    seenSf.add(it.uid); register();
    S.cooler.push({ uid: it.uid, id: it.id, w: it.w, t: Date.now(), sp: it.sp, lock: true });   // terkunci: tidak ikut "jual semua" tanpa sengaja
    const rec = S.dex[it.id] || { n: 0, best: 0 }; rec.n++; rec.best = Math.max(rec.best, it.w); S.dex[it.id] = rec;
    Nn.save(); Nn.refreshHUD();
    const price = Nn.priceOf({ id: it.id, w: it.w, sp: it.sp });
    setTimeout(() => NW.sf.openCatch(it.id, { w: it.w, price }), 900);
  }
}
NW.sfPlay = { after, grant, refresh, register, info: () => info, _reset: () => { info = { on: false, fish: [] }; lastFetch = 0; busy = false; } };
setInterval(() => { if (!document.hidden && NW.eco && NW.eco.active()) refresh(false); }, 60000);
})();
