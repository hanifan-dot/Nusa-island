// NUSA ISLAND — Ide 08B · klien Dapur Rumahku + Kedai Bu Indah. NUSA_DAPUR HANYA mengontrol apakah modul ini DIUNDUH.
// Akses fitur = status SERVER: `gameFlags.dapurRumahku` (Worker 01, backend PR #60). Server OFF/404/gagal → bangunan, pintu dapur, dan semua panel TIDAK muncul.
// Klien tidak pernah mengirim/dipercaya untuk: uid, saldo, harga, hadiah, kualitas. Harga & saldo selalu jawaban server.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaDapurCore; if (!Core || !NW.room) return;
const N = () => window.Nusa;
const st = { srv: false, gateTried: false, gateFail: 0, hooked: false, homeHooked: false };
const call = (name, body) => (window.NusaApi && window.NusaApi.enabled() ? window.NusaApi.call(name, body || {}, true) : Promise.reject(Object.assign(new Error("offline"), { code: "unavailable" })));

// ---------- adapter server (kontrak CONTRACT-08A) ----------
function absorbEco(res) {
  try { if (NW.eco && NW.eco.state && NW.eco.applyState && res && Number.isFinite(res.own)) { const m = Core.mergeEco(NW.eco.state(), res); if (m) NW.eco.applyState(m); } } catch (e) { /* tampilan saja */ }
  return res;
}
const api = {
  async state() { return absorbEco(await call("dapurState", {})); },
  async buy(body) { return absorbEco(await call("dapurBuy", body)); },                    // {opId, items:[{id,n}]}; harga, saldo, stok = server
  async unlock(body) { return absorbEco(await call("dapurUnlock", body)); },              // {opId, tool}
  // 08C — memasak (semua hasil dari server; klien hanya mengirim niat)
  async cookStart(body) { return absorbEco(await call("dapurCookStart", body)); },        // {opId, tool, rec|null, ing?, fish?:[uid]}
  async cookStep(body) { return absorbEco(await call("dapurCookStep", body)); },          // {opId, step, arg?}
  async cookFinish(body) { return absorbEco(await call("dapurCookFinish", body)); },      // {opId}
  async cookAbort(body) { return absorbEco(await call("dapurCookAbort", body)); },        // {opId}
  async eat(body) { return absorbEco(await call("dapurEat", body)); },                    // {opId, dish}
  async discard(body) { return absorbEco(await call("dapurDiscard", body)); },            // {opId, dish}
  async wash(body) { return absorbEco(await call("dapurWash", body)); },                  // {opId, item, steps|quick}
  // 08D — meja halaman & tawaran (kontrak CONTRACT-08D, backend PR #61). Identitas dari token; klien hanya mengirim niat + pid publik.
  mejaState: (body) => call("dapurMejaState", body || {}),                                // pemilik: {} → meja:{slots,table,offers}
  mejaTaruh: (body) => call("dapurMejaTaruh", body), mejaAmbil: (body) => call("dapurMejaAmbil", body), mejaBersih: (body) => call("dapurMejaBersih", body),   // {opId, dish|slot}
  mejaTawar: (body) => call("dapurMejaTawar", body), mejaBatal: (body) => call("dapurMejaBatal", body), mejaTutup: (body) => call("dapurMejaTutup", body),     // {opId, slot, to:pid} / {opId, offer} / {opId}
  mejaLihat: (body) => call("dapurMejaLihat", body),                                      // tamu: {owner:pid} → meja:{table,mine}
  tawaranJawab: (body) => call("dapurTawaranJawab", body), mejaKeluar: (body) => call("dapurMejaKeluar", body),                                           // tamu: {opId, owner, offer, accept} / {opId, owner}
};

// ---------- bangunan Kedai Bu Indah di Muara (di bekas "Lahan Pengembangan", barat plaza NUSA STYLE) ----------
const KB = { id: "kedaiindah", kind: "house", x0: 13.0, y0: 36.6, x1: 16.6, y1: 39.0, h: 58, door: "y", roof: "#c8603a", wall: "#f6e5c8", name: "Kedai Bu Indah" };
const SPOT = { x: 15.7, y: 39.95 };
function mountKedai() {
  const area = NW.areas && NW.areas.get("muara"); if (!area || !NW.dapurArt) return false;
  const M = area.map; if (M.buildings.some((b) => b.id === KB.id)) return true;
  const inside = (o) => o.x > KB.x0 - 0.9 && o.x < KB.x1 + 0.7 && o.y > KB.y0 - 0.9 && o.y < KB.y1 + 1.1;
  const gone = [];
  for (let i = M.objects.length - 1; i >= 0; i--) { const o = M.objects[i]; if (o.kind !== "lamp" && inside(o)) gone.push(M.objects.splice(i, 1)[0]); }   // pagar bambu, papan "Lahan Pengembangan", semak yang menghalangi
  for (let i = M.solids.length - 1; i >= 0; i--) { const s = M.solids[i]; if (s.r !== undefined && gone.some((o) => Math.abs(o.x - s.x) < 1e-6 && Math.abs(o.y - s.y) < 1e-6)) M.solids.splice(i, 1); }
  for (let i = M.points.length - 1; i >= 0; i--) { const p = M.points[i]; if (p.sign && p.sign.title === "Lahan Pengembangan") M.points.splice(i, 1); }
  M.buildings.push(Object.assign({}, KB, { draw: (c, b, t, night) => NW.dapurArt.exterior(c, b, t, night) }));
  M.solids.push({ x0: KB.x0 + 0.02, y0: KB.y0 + 0.02, x1: KB.x1 - 0.02, y1: KB.y1 - 0.02 });
  for (const [x, y] of [[KB.x0 + 0.5, KB.y1 + 0.42], [KB.x0 + 1.35, KB.y1 + 0.5], [KB.x1 - 0.45, KB.y1 + 0.38]]) M.solids.push({ x, y, r: 0.3 });   // peti sayur & papan kapur di teras
  M.points.push({ id: KB.id, x: SPOT.x, y: SPOT.y, r: 1.5, icon: "🏪", label: "Masuk Kedai Bu Indah" });
  M.lights.push({ x: SPOT.x, y: SPOT.y - 0.5, z: 30, r: 56, col: "#ffc98a", k: 1.0 });
  return true;
}

// ---------- gerbang server ----------
async function gate() {
  if (st.srv || st.gateTried) return; st.gateTried = true;
  try { const r = await call("gameFlags", {}); if (r && r.dapurRumahku === true) { st.srv = true; st.social = r.socialHome === true; mountKedai(); if (NW.dapurRumah && NW.dapurRumah.install) NW.dapurRumah.install(); if (NW.dapurSosial && NW.dapurSosial.install) NW.dapurSosial.install(); } } catch (e) { /* server lama/mati: tetap tersembunyi; gagal sementara (jaringan/token belum siap) dicoba lagi paling banyak 3x */ if (++st.gateFail <= 3) setTimeout(() => { st.gateTried = false; gate(); }, 4000 * st.gateFail); }
}
function hook() {
  if (st.hooked) return; st.hooked = true;
  const t = setInterval(() => { if (st.srv || st.gateTried) return clearInterval(t); if (!(window.NusaApi && window.NusaApi.enabled() && NW.cloud && NW.cloud.user)) return; clearInterval(t); gate(); }, 3000);
}
NW.dapur = { hook, api, gate, mountKedai, KB, SPOT, _st: st, get serverOn() { return st.srv; }, get socialOn() { return st.srv && st.social; } };
})();
