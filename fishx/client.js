// =========================================================
//  NUSA ISLAND — Ide 07B "Ikan lokasi baru" (sisi klien). Modul: NW.fishx
//  • Ikan SUPER RARE DIBUAT SERVER (ecoCatch → sxItem). Klien hanya menampilkan hasil yang sudah dikonfirmasi:
//    masuk coolbox (terkunci supaya tidak ikut "jual semua" tanpa sengaja), statistik/Koleksi, lalu notifikasi tangkapan istimewa.
//  • Idempoten: uid yang sama tidak pernah masuk dua kali (balasan ulang karena jaringan, refresh, pemulihan dari ecoState).
//  • Tidak ada protokol baru: Pamer Ikan memakai pesan `f` yang sudah ada (id spesies, berat, varian) dan menggambar dari data ikan.
// =========================================================
(() => {
"use strict";
const N = () => window.Nusa;
const IK = () => window.NusaIkanLoc;
const seen = new Set();   // uid yang sudah diproses di sesi ini

function oddsText(f) {
  const ik = IK(), one = ik && ik.ONE_IN && ik.ONE_IN[f.loc];
  return one ? `💎 SUPER RARE · peluang 1 dari ${one.toLocaleString("id-ID")} tangkapan sah (diundi server)` : "💎 SUPER RARE · diundi server";
}

// ---- tampilan notifikasi (ringan: satu elemen CSS, tanpa kanvas) ----
function banner(f, w) {
  const old = document.getElementById("sxBanner"); if (old) old.remove();
  const el = document.createElement("div"); el.id = "sxBanner"; el.className = "sx-banner"; el.setAttribute("role", "status");
  const ico = document.createElement("img"); ico.alt = ""; ico.src = N().fishImg(f.id);
  const t = document.createElement("div"); t.className = "sx-t";
  const a = document.createElement("small"); a.textContent = "💎 TANGKAPAN ISTIMEWA · SUPER RARE";
  const b = document.createElement("b"); b.textContent = f.name;
  const c = document.createElement("span"); c.textContent = `${N().fmtW(w)} · ${(N().S.dex[f.id] && N().S.dex[f.id].n) || 1}× di Koleksi`;
  t.append(a, b, c); el.append(ico, t);
  el.style.setProperty("--sx", f.aura || "#ffd24a");
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 500); }, 5200);
}

// Daftarkan ikan super dari server. quiet=true (pemulihan dari ecoState): tanpa perayaan ulang bila ikan itu sudah pernah tercatat.
function grant(list, quiet) {
  const n = N(), S = n && n.S; if (!S || !Array.isArray(list)) return 0;
  let added = 0;
  for (const it of list) {
    const f = it && n.FISH_BY_ID[it.id];
    if (!f || !f.sup || typeof it.uid !== "string" || !/^[A-Za-z0-9_-]{4,40}$/.test(it.uid) || !(it.w > 0) || seen.has(it.uid)) continue;
    seen.add(it.uid);
    if (S.cooler.some((x) => x.uid === it.uid)) continue;
    if ((S.home && Array.isArray(S.home.placedFish) && S.home.placedFish.some((x) => x && x.uid === it.uid))) continue;
    S.cooler.push({ uid: it.uid, id: it.id, w: it.w, t: Date.now(), lock: true });   // terkunci: tidak ikut "jual semua"; bisa dibuka kuncinya di Inventaris
    const rec = S.dex[it.id] || { n: 0, best: 0 }; rec.n++; rec.best = Math.max(rec.best, it.w); S.dex[it.id] = rec;
    S.stats.caught++; S.stats.legends++;
    added++;
    n.save(); n.refreshHUD();
    try { n.sfx("mistis_tangkap"); } catch (e) {}
    if (!quiet) { banner(f, it.w); n.toast("💎 " + f.name + " — SUPER RARE!", "good"); }
    n.emit && n.emit("catch", { fish: f, w: it.w, night: n.isNight(), loc: f.loc, vr: "normal", spot: null, sea: null, server: true });
  }
  return added;
}
window.NW = window.NW || {};
NW.fishx = { oddsText, grant, banner, _reset: () => seen.clear() };
})();
