// NUSA ISLAND — pembungkus browser adapter D1 (NW.d1). BAWAAN "off": nol request, nol token, game identik.
// "shadow": hanya MEMBACA dan membandingkan di memori (tidak mengubah UI/ekonomi/save). Mode "on" tidak ada. Mudah dicabut: hapus d1/ + 5 baris pengait.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), Core = window.NusaD1Core; if (!Core) return;
const raw = window.NUSA_D1_MODE; const mode = raw === "shadow" ? "shadow" : "off";   // "on"/nilai lain → off
const base = () => String((window.NUSA_FIREBASE && window.NUSA_FIREBASE.apiBase) || "").replace(/\/+$/, "");
async function getToken() { const u = window.firebase && window.firebase.apps && window.firebase.apps.length && window.firebase.auth().currentUser; return u ? await u.getIdToken() : null; }
const d1 = Core.make({ mode, base: base(), getToken, fetch: (u, i) => window.fetch(u, i) });
const rec = { podium: {}, sf: null, save: null, loginDone: false };
const online = () => mode === "shadow" && !!base();
const api = {
  mode, enabled: online, stats: () => d1.stats(), rec, core: d1,
  async shadowPodium(cat) {                       // dipanggil HANYA dari aksi UI Podium (buka / ganti tab / Muat Ulang)
    if (!online()) return null; const board = cat === "species" ? "species" : "catch";
    const r = await d1.podiumTop(board); if (!r.ok) { rec.podium[board] = { ok: false, why: r.skipped || r.status || "gagal" }; return rec.podium[board]; }
    const L = NW.podium && NW.podium._st && NW.podium._st.data[board]; rec.podium[board] = Object.assign({ ok: true }, d1.diffPodium(L && L.entries, r.rows)); return rec.podium[board];
  },
  async shadowSf(info) {                          // dipanggil setelah refresh SF lama; D1 sendiri membatasi ≥5 menit & tidak polling
    if (!online()) return null; const r = await d1.sf(); rec.sf = r.ok ? Object.assign({ ok: true }, d1.diffSf(info, r.state)) : { ok: false, why: r.skipped || r.status || "gagal" }; return rec.sf;
  },
  async onLogin() {                               // sekali per sesi: GET /sf + GET /save?meta=1 (hanya membaca; hasil di memori)
    if (!online() || rec.loginDone) return; rec.loginDone = true;
    const s = await d1.getSave(true); rec.save = s.ok ? { ok: true, exists: s.exists, rev: s.rev } : { ok: false, why: s.skipped || s.status || "gagal" };
    await api.shadowSf(NW.sf2 && NW.sf2.info ? NW.sf2.info() : null);
  },
};
NW.d1 = api;
if (online()) { const t = setInterval(() => { const c = NW.cloud; if (!c || !c.onChange) return; clearInterval(t); c.onChange(() => { if (c.user) api.onLogin(); }); }, 300); setTimeout(() => clearInterval(t), 20000); }
})();
