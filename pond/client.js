// =========================================================
//  NUSA ISLAND — klien Kolam Ikan (NW.pond). Semua data kolam, pakan, upgrade, waktu, dan kematian dipegang SERVER (ecoPond* di economy/core.js).
//  Klien hanya: meminta aksi (opId idempoten), menampilkan hasil, dan menghitung tampilan kenyang dari data + jam server (monoton, bukan jam HP).
//  Aktif hanya bila ekonomi server aktif (masuk akun Google) DAN server mendukung ecoPond*. Selain itu kolam TERKUNCI (tidak ada transaksi lokal rawan curang).
// =========================================================
(() => {
"use strict";
window.NW = window.NW || {};
const N = () => window.Nusa, PC = () => window.NusaPondCore;
const rid = () => "P" + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36) + Math.floor(Math.random() * 1e9).toString(36);
let st = null, srvNow = 0, tMono = 0, supported = null, fails = 0, lastErr = "", busy = false, pending = null, loading = null;
const ack = { seen: new Set(), got: new Set() }, shown = new Set();
let lastNotice = 0, cache = { at: -1, v: null };
const toast = (m, k) => { try { N().toast(m, k); } catch (e) {} };
const sApi = () => NW.shopApi;
const active = () => !!(NW.eco && NW.eco.active());
const nowSrv = () => srvNow + (performance.now() - tMono);
const isNet = (e) => !!e && (e.message === "Jaringan bermasalah." || e.code === "deadline-exceeded");

// status untuk UI: kunci + alasan
function status() {
  const a = sApi();
  if (!a || !a.live || a.sim || (a.isGuest && a.isGuest()) || (NW.cloud && NW.cloud.sandbox)) return { s: "guest", msg: "Masuk dengan akun Google dulu. Kolam disimpan dan dihitung oleh server supaya adil (waktu HP tidak berpengaruh)." };
  if (!active()) return { s: "wait", msg: "Menghubungkan ke server ekonomi…" };
  if (supported === false) return { s: "unsupported", msg: "Kolam ikan belum diaktifkan di server game. Fitur dikunci sementara supaya tidak bisa dicurangi. Ikan dan koinmu aman." };
  if (!st) return { s: loading ? "wait" : "offline", msg: loading ? "Memuat kolam…" : (lastErr || "Belum bisa memuat kolam. Periksa koneksi lalu coba lagi.") };
  return { s: "ready", msg: "" };
}
function absorb(r) {
  if (!r || !r.pond) return;
  if (NW.eco && NW.eco.applyState) NW.eco.applyState(r);
  st = r.pond; srvNow = r.pond.now; tMono = performance.now(); supported = true; fails = 0; lastErr = ""; cache.at = -1;
  const S = N().S; let changed = false;
  const inPond = new Set(st.fish.map((f) => f.u)), dead = new Set(st.hist.map((h) => h.u));
  const lists = [S.cooler, S.home && S.home.placedFish].filter(Array.isArray);
  for (const arr of lists) for (let i = arr.length - 1; i >= 0; i--) if (inPond.has(arr[i].uid) || dead.has(arr[i].uid)) { arr.splice(i, 1); changed = true; }     // ikan di kolam tidak boleh juga ada di inventaris
  const inBox = new Set((NW.eco.state() || {}).box || []), have = new Set(); for (const arr of lists) for (const it of arr) have.add(it.uid);
  for (const l of st.limbo || []) {                                                                                                                              // ikan yang diambil dari kolam tetapi belum sampai ke coolbox (mis. aplikasi tertutup)
    if (inBox.has(l.u) && !have.has(l.u)) { const it = { uid: l.u, id: l.id, w: l.w, t: l.t || Date.now() }; if (l.vr) it.vr = l.vr; S.cooler.push(it); changed = true; }
    ack.got.add(l.u);
  }
  if (changed) { try { N().save(); N().refreshHUD(); } catch (e) {} if (NW.inv && NW.inv.refresh) try { NW.inv.refresh(); } catch (e) {} }
  const fresh = (st.hist || []).filter((h) => !h.seen && !shown.has(h.u));
  if (fresh.length) {
    for (const h of fresh) { shown.add(h.u); ack.seen.add(h.u); }
    const nm = (h) => { const f = N().FISH_BY_ID[h.id]; return f ? f.name : "Ikan"; };
    toast(PC().DEATH_MSG + (fresh.length > 1 ? ` (${fresh.length} ekor: ${fresh.slice(0, 3).map(nm).join(", ")}${fresh.length > 3 ? "…" : ""})` : ` (${nm(fresh[0])})`), "bad");
  }
}
async function refresh(force) {
  if (!active()) return false;
  if (loading) return loading;
  const body = { seen: [...ack.seen].slice(0, 60), got: [...ack.got].slice(0, 60) };
  loading = (async () => {
    try { const r = await sApi().eco("ecoPondState", body); for (const u of body.seen) ack.seen.delete(u); for (const u of body.got) ack.got.delete(u); absorb(r); if (ack.got.size || ack.seen.size) setTimeout(() => refresh(), 400); return true; }
    catch (e) { lastErr = isNet(e) ? "Jaringan bermasalah. Coba lagi." : (e && e.message) || "gagal"; if (!isNet(e) && !st && ++fails >= 2) supported = false; return false; }
    finally { loading = null; }
  })();
  return loading;
}
function retry() { supported = null; fails = 0; lastErr = ""; return refresh(true); }
const reuseOp = (key) => { if (pending && pending.key === key) return pending.opId; pending = { key, opId: rid() }; return pending.opId; };
// satu aksi pada satu waktu; opId dipakai ulang bila percobaan sebelumnya putus jaringan (hasilnya mungkin sudah tercatat → tidak ganda)
async function act(name, body, key) {
  if (busy) return { ok: false, msg: "Tunggu sebentar, aksi sebelumnya masih diproses." };
  const sx = status(); if (sx.s !== "ready") return { ok: false, msg: sx.msg };
  busy = true; const opId = reuseOp(key + ":" + JSON.stringify(body));
  try {
    if (name === "ecoPondPut" && NW.eco.flush) await NW.eco.flush();
    const r = await sApi().eco(name, Object.assign({ opId }, body)); pending = null; absorb(r); return { ok: true, r };
  } catch (e) {
    if (!isNet(e)) pending = null;
    if (!isNet(e)) refresh();
    return { ok: false, code: e && e.code, msg: isNet(e) ? "Jaringan bermasalah. Coba lagi — koin dan ikanmu tidak diproses dua kali." : (e && e.message) || "Gagal." };
  } finally { busy = false; }
}
// ---- aksi ----
const meta = (it) => ({ u: it.uid, vr: it.vr && it.vr !== "normal" ? it.vr : undefined, t: Number.isFinite(it.t) ? it.t : undefined });
const put = (uids) => {
  const S = N().S, items = uids.map((u) => S.cooler.find((x) => x.uid === u)).filter(Boolean);
  if (!items.length || items.length !== uids.length) return Promise.resolve({ ok: false, msg: "Ikan tidak ditemukan di coolbox." });
  return act("ecoPondPut", { items: items.map(meta) }, "put");
};
const take = (uids) => {
  const S = N().S; if (S.cooler.length + uids.length > N().coolerCap()) return Promise.resolve({ ok: false, msg: "Coolbox tidak cukup. Jual atau pajang ikan lain dulu." });
  return act("ecoPondTake", { uids }, "take");
};
const feed = (kind) => act("ecoPondFeed", { kind }, "feed");
const buy = (item, qty) => act("ecoPondBuy", { item, qty }, "buy");
const upgrade = () => (st && st.nextLv ? act("ecoPondUpgrade", { lv: st.nextLv.lv }, "up") : Promise.resolve({ ok: false, msg: "Sudah level maksimum." }));
// ---- tampilan ----
function fishRows() {
  if (!st) return []; const now = nowSrv();
  return st.fish.map((f) => { const sat = Math.max(0, PC().satAt(f, now)); return { u: f.u, id: f.id, w: f.w, vr: f.vr, sat, level: PC().levelOf(sat), eta: Math.max(0, PC().deathAt(f) - now) }; }).filter((f) => f.sat > 0).sort((a, b) => a.sat - b.sat);
}
function drawState() {
  const t = performance.now(); if (cache.v && t - cache.at < 900) return cache.v;
  const rows = fishRows(), worst = rows.length ? rows[0].level : "ok";
  cache = { at: t, v: st ? { lv: st.lv, gear: st.gear, fish: rows, warn: worst === "ok" ? false : worst } : null };
  return cache.v;
}
function onYard() {                                                    // dipanggil sekali saat masuk halaman: segarkan dan beri tahu pelan-pelan (tanpa memaksa)
  if (!active()) return;
  refresh().then(() => { const rows = fishRows(); if (!rows.length || rows[0].level === "ok" || Date.now() - lastNotice < 20 * 60000) return; lastNotice = Date.now();
    toast(rows[0].level === "critical" ? "🐟 Ikan di kolam KRITIS! Beri makan di Kelola Kolam." : `🐟 Ikan di kolam mulai lapar (${rows[0].sat}%). Mampir ke Kelola Kolam.`, "normal"); });
}
const fmtEta = (ms) => { const h = Math.floor(ms / 3600000), d = Math.floor(h / 24); return d >= 1 ? `${d} hari ${h % 24} jam` : h >= 1 ? `${h} jam ${Math.floor((ms % 3600000) / 60000)} menit` : `${Math.max(1, Math.floor(ms / 60000))} menit`; };
// ikan di coolbox yang boleh masuk kolam (bukan sampah/dilindungi; harus tercatat di kotak ikan server)
function eligible() {
  const box = new Set(((NW.eco && NW.eco.state()) || {}).box || []), F = N().FISH_BY_ID;
  return (N().S.cooler || []).map((it) => { const f = F[it.id]; let why = ""; if (!f) why = "tidak dikenal"; else if (f.sf) why = "ikan spesial"; else if (f.rarity === "sampah") why = "sampah"; else if (f.protected) why = "dilindungi"; else if (!box.has(it.uid)) why = "belum tercatat server"; return { it, f, why }; });
}
NW.pond = { status, refresh, retry, onYard, put, take, feed, buy, upgrade, fishRows, drawState, nowSrv, fmtEta, eligible, view: () => st, busy: () => busy, _reset: () => { st = null; supported = null; fails = 0; busy = false; pending = null; ack.seen.clear(); ack.got.clear(); shown.clear(); cache = { at: -1, v: null }; } };
})();
