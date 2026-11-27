/* NUSA ISLAND — service worker PWA.
 * Prinsip: aman lebih penting daripada offline.
 *  - Hanya berkas STATIS dari situs ini (satu origin) yang disentuh. Firebase Auth (/__/ dan googleapis), Firestore, Cloud Save,
 *    multiplayer (WebSocket/Worker lain), API ekonomi & QRIS (origin lain), serta semua metode non-GET TIDAK pernah dicegat atau disimpan.
 *  - Kode (html/js/css/json): JARINGAN DULU. Cache hanya dipakai bila jaringan gagal total, jadi pemain tidak terjebak di kode lama.
 *  - Media (gambar/audio/font): cache dulu di dalam versi yang sama (nama cache berganti tiap rilis, jadi tidak basi lintas versi).
 *  - Cache memakai versi (BUILD ditulis build-hosting.sh); cache versi lama dihapus saat versi baru aktif.
 *  - Versi baru TIDAK mengambil alih sendiri: menunggu pesan SKIP_WAITING dari pemain (modal "Perbarui Sekarang").
 */
"use strict";
const BUILD = "__NUSA_BUILD__";
const PREFIX = "nusa-island-";
const CACHE = PREFIX + BUILD;
const CODE_RE = /\.(?:html|js|css|json|webmanifest)$/i;
const MEDIA_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|mp3|ogg|wav|m4a|woff2?|ttf)$/i;
const NEVER_RE = /(?:^|\/)(?:qris|wallet)|shop\/qris\.png$|mp\/endpoint\.json$/i;

// Putusan murni (diuji di Node): 'network-first' | 'cache-first' | null (tidak disentuh sama sekali).
function decide(method, urlStr, origin, mode, hasRange) {
  if (method !== "GET" || hasRange) return null;
  let u; try { u = new URL(urlStr); } catch (e) { return null; }
  if (u.origin !== origin) return null;                       // Firestore, Worker API/QRIS/multiplayer, CDN Firebase: bukan urusan SW
  const p = u.pathname;
  if (p.startsWith("/__/") || p.startsWith("/api/")) return null; // Firebase Auth handler & init
  if (NEVER_RE.test(p)) return null;                          // QRIS, dompet, alamat multiplayer: selalu langsung ke jaringan
  if (mode === "navigate") return "network-first";
  if (CODE_RE.test(p)) return "network-first";
  if (MEDIA_RE.test(p)) return "cache-first";
  return null;
}
function cacheable(res) {
  if (!res || res.status !== 200 || res.type !== "basic") return false;
  const cc = (res.headers.get("cache-control") || "").toLowerCase();
  return !/no-store|private/.test(cc) && !res.headers.has("set-cookie");
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function" && typeof module === "undefined") {
  self.addEventListener("install", () => { /* sengaja tanpa skipWaiting: menunggu persetujuan pemain */ });
  self.addEventListener("activate", (e) => {
    e.waitUntil((async () => {
      for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })());
  });
  self.addEventListener("message", (e) => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });
  self.addEventListener("fetch", (e) => {
    const r = e.request, how = decide(r.method, r.url, self.location.origin, r.mode, r.headers.has("range"));
    if (!how) return; // tidak memanggil respondWith => browser memproses permintaan seperti tanpa SW
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      if (how === "cache-first") {
        const hit = await cache.match(r); if (hit) return hit;
        const res = await fetch(r); if (cacheable(res)) cache.put(r, res.clone()); return res;
      }
      try {
        const res = await fetch(r, { cache: "no-cache" });
        if (cacheable(res)) cache.put(r.mode === "navigate" ? new Request(new URL("./", self.location.href).href) : r, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(r.mode === "navigate" ? new Request(new URL("./", self.location.href).href) : r);
        if (hit) return hit;
        throw err;
      }
    })());
  });
}
if (typeof module !== "undefined") module.exports = { decide, cacheable, CACHE, PREFIX };
