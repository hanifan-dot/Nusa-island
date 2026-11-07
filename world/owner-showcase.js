// NUSA ISLAND — Pajangan Megalodon khusus Owner.
// Server menyimpan koleksi di owners/{uid}/showcase; TIDAK masuk Coolbox dagang/Cloud Save/ekonomi.
(() => {
  "use strict";
  window.NW = window.NW || {};
  const N = () => window.Nusa;
  const C = () => window.NW.cloud;
  let uid = null, loaded = false, busy = false, error = "", gift = null;
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  // Klaim client HANYA petunjuk untuk tampilkan kartu; izin ditentukan Worker
  // melalui Google token + owners/{uid}.active (game Cloud Save tidak selalu punya ownerAccess).
  const owner = () => !!(C() && C().enabled && C().user &&
    ((C().user.claims && C().user.claims.role === "owner") ||
      (C().owner && C().owner.verified === true)));
  const displayed = () => N() && N().currentPanel && N().currentPanel() === "inventory";
  function render() {
    if (!owner()) return "";
    const hint = error ? `<p class="owner-fish-error">${esc(error)} <button class="btn small" data-act="ownerFishRetry">Coba lagi</button></p>`
      : busy || !loaded ? '<p class="muted">☁️ Memeriksa koleksi khusus Owner di server…</p>'
      : gift ? '<p class="owner-fish-ok">🔒 Koleksi terdaftar di server · tidak bisa dijual atau dipindahkan</p>'
      : '<p class="muted">Koleksi belum tersedia.</p>';
    return `<section class="owner-fish-box" aria-label="Pajangan spesial Owner">
      <div class="owner-fish-tag">👑 PAJANGAN KHUSUS OWNER · 1/1</div>
      <canvas id="ownerFishCanvas" width="320" height="142" aria-label="Megalodon Bayangan Purba"></canvas>
      <strong>🦈 Megalodon Bayangan Purba</strong>
      <div class="owner-fish-weight">50.000 kg · 50 TON</div>
      <p class="muted">Edisi Owner Perdana · 1 November 2026 · bukan tangkapan kompetisi.</p>
      ${hint}
      ${gift ? '<button class="btn gold" data-act="ownerFishShare">📢 Pamerkan Koleksi</button>' : ''}
    </section>`;
  }
  async function sync(force) {
    if (!owner() || busy || (loaded && !force)) return;
    const current = C().user.uid;
    if (uid !== current) { uid = current; gift = null; loaded = false; }
    busy = true; error = "";
    try {
      if (!window.NusaApi || !window.NusaApi.enabled()) throw Error("Server produksi belum tersambung.");
      // Klaim idempoten: dua tab, dua klik, atau refresh selalu memberi SATU item.
      const res = await window.NusaApi.call("ownerShowcaseClaim", {}, true);
      if (!res || res.owned !== true || !res.item || res.item.id !== "megalodon_20261101" || res.item.weightKg !== 50000)
        throw Error("Server tidak mengonfirmasi koleksi Owner.");
      gift = res.item; loaded = true;
      if (res.newlyGranted && N()) N().toast("👑 1 Megalodon 50 ton masuk Koleksi Pajangan Owner!", "good");
    } catch (e) {
      error = "Belum tersimpan di server. " + (e && e.code === "not_owner" ? "Hak Owner belum terverifikasi." : "Periksa login/koneksi.");
    } finally {
      busy = false;
      if (displayed()) N().renderPanel();
    }
  }
  function draw() {
    const c = document.getElementById("ownerFishCanvas");
    if (c && window.NW.eventDraw && NW.eventDraw.icon) {
      try { NW.eventDraw.icon(c, "megalodon_bayangan", { t: 2.4 }); } catch (_) { /* label tetap terlihat */ }
    }
  }
  function after() {
    if (!owner()) return;
    if (uid !== C().user.uid) { uid = C().user.uid; loaded = false; gift = null; error = ""; }
    draw();
    if (!loaded && !busy && !error) sync(false);
  }
  async function action(name) {
    if (name === "ownerFishRetry") { await sync(true); return true; }
    if (name !== "ownerFishShare") return false;
    if (!owner() || !gift || !loaded) return true;
    const msg = "👑 Koleksi Owner Nusa Island: Megalodon Bayangan Purba 50 TON (50.000 kg)! 🦈🌴\nEdisi pajangan Owner 1/1 · tidak dapat dijual atau ditukar.\n" + location.origin;
    try {
      if (navigator.share) await navigator.share({ title: "Megalodon Owner — Nusa Island", text: msg });
      else if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(msg); N().toast("Teks pameran disalin! 🦈", "good"); }
      else N().toast("Screenshot kartu Megalodon ini untuk dipamerkan! 🦈", "good");
    } catch (e) { if (!e || e.name !== "AbortError") N().toast("Bagikan lewat screenshot koleksimu.", "good"); }
    return true;
  }
  function hook() {
    if (C() && C().onChange) C().onChange(() => {
      if (!owner()) { uid = null; gift = null; loaded = false; error = ""; return; }
      if (displayed()) N().renderPanel();
    });
  }
  NW.ownerShowcase = { render, after, action, hook, status: () => ({ loaded, busy, owned: !!gift, error }) };
})();
