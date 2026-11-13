// NUSA ISLAND — Multiplayer Kota Nusa (klien, gerbang). Dimuat bersama kota/* HANYA bila NUSA_KOTA=true (default OFF).
// NUSA_KOTA hanya mengontrol apakah kode ini DIUNDUH. Akses realtime = SERVER: gameFlags.kotaNusa === true DAN welcome multiplayer ko === 1.
// Modul ini hanya menjawab "apakah klien boleh memakai area Kota di jalur multiplayer?". Tidak ada trafik jaringan sendiri selain SATU panggilan gameFlags per sesi masuk.
// NPC & kendaraan kota tetap lokal deterministik (NW.kota); tidak ada yang dikirim lewat jaringan, tidak ada tulis Firestore/D1.
(() => {
"use strict";
const NW = window.NW; if (!NW || !NW.kota || NW.mpKota) return;
const st = { srv: false, tried: false };
const call = (name, body) => (window.NusaApi && window.NusaApi.enabled() ? window.NusaApi.call(name, body || {}, true) : Promise.reject(Object.assign(new Error("offline"), { code: "unavailable" })));
async function gate() {
  if (st.srv || st.tried) return; st.tried = true;
  try { const r = await call("gameFlags", {}); if (r && r.kotaNusa === true) st.srv = true; } catch (e) { /* server lama/mati: multiplayer kota tetap tersembunyi (hanya visual lokal) */ }
}
function hook() {
  const t = setInterval(() => { if (st.tried) return clearInterval(t); if (!(window.NusaApi && window.NusaApi.enabled() && NW.cloud && NW.cloud.user)) return; clearInterval(t); gate(); }, 3000);
}
NW.mpKota = { enabled: () => st.srv, hook, _gate: gate, _st: st };
hook();
})();
