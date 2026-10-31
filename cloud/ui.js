// NUSA ISLAND — Tahap 3: tampilan akun (layar login, peringatan tamu, pilihan progres, Profil Nelayan, Mode Uji Owner).
// Tidak ada email yang pernah ditampilkan. Animasi hanya CSS (tanpa loop JS) dan dimatikan setelah gerbang ditutup.
(function () {
  "use strict";
  window.NW = window.NW || {};
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n || 0).toLocaleString("id-ID");
  const GOOGLE_G = `<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>`;
  const sumHTML = (s, title, extra) => !s ? "" : `<div class="src-card"><h4>${title}</h4><b class="src-name">${esc(s.name)}</b><ul>
      <li>🪙 ${fmt(s.money)} koin</li><li>📅 Hari ${fmt(s.day)}</li><li>🐟 ${fmt(s.caught)} ikan · ${fmt(s.species)} spesies</li>
      <li>🏠 Rumah Lv ${s.homeLevel || 1} · ⛵ Kapal Lv ${(s.boat || 0) + 1}</li><li>✨ ${s.mystic} ikan mistis</li></ul>${extra || ""}</div>`;

  NW.cloudUI = {
    chooseDemoAccount(accounts) {
      return new Promise((res) => {
        const w = document.createElement("div"); w.className = "cmodal"; w.id = "demoPick";
        w.innerHTML = `<div class="cbox"><h3>Pilih akun (SIMULASI)</h3><p class="muted">Ini <b>bukan Google sungguhan</b>. Mode demo untuk mencoba alur login.</p>
          ${Object.entries(accounts).map(([id, a]) => `<button class="btn ghost demo-acc" data-id="${id}">${GOOGLE_G} ${esc(a.name)}</button>`).join("")}
          <button class="btn small ghost" data-id="">Batal</button></div>`;
        w.addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (!b) return; w.remove(); res(b.dataset.id || null); });
        document.body.appendChild(w);
      });
    },

    create(cloud) {
      const ui = {};
      let gate = null, gateTimer = null;

      // ---------- Layar login ----------
      function build() {
        if (gate) return gate;
        gate = document.createElement("div"); gate.id = "gate"; gate.className = "gate";
        gate.setAttribute("role", "dialog"); gate.setAttribute("aria-modal", "true"); gate.setAttribute("aria-label", "Masuk ke Nusa Island");
        gate.innerHTML = `
          <div class="gate-bg" aria-hidden="true">
            <div class="g-sun"></div>
            <svg class="g-isle" viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice"><path d="M0 140V112c40-22 86-26 130-12 30 10 54 8 84-4 46-18 96-14 186 10v34z" fill="#1d6b57"/><path d="M60 112c4-34 8-58 6-84m-6 84c-14-14-34-20-52-18m52 18c10-18 28-26 48-24m-48 24c-8-26-24-40-40-46M66 28c-14 4-26 14-30 26m30-26c10 2 22 10 28 22m-28-22c-4-12-2-22 6-30" stroke="#0f3d31" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M300 118c2-26 6-44 4-62m-4 62c-10-10-24-14-38-12m38 12c8-12 20-18 36-16M304 56c-12 4-20 12-24 22m24-22c8 2 18 8 22 18" stroke="#0f3d31" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>
            <div class="g-wave w1"></div><div class="g-wave w2"></div>
          </div>
          <div class="gate-card">
            <div class="logo">NUSA<br><span>ISLAND</span></div>
            <p class="tag">Hidup di pulau, mancing keliling Nusantara 🎣</p>
            <div class="gate-load" id="gateLoad"><i></i><span>Memeriksa akun…</span></div>
            <div class="gate-actions hidden" id="gateActions">
              <button class="btn big gate-google" id="gateGoogle">${GOOGLE_G}<span>Login dengan Google</span></button>
              <button class="btn big ghost gate-guest" id="gateGuest">Main sebagai Tamu</button>
            </div>
            <p class="gate-msg" id="gateMsg" role="status" aria-live="polite"></p>
            <p class="small gate-note">Login Google menyimpan progresmu di cloud dan bisa dipakai di HP lain.</p>
            ${cloud.demo ? `<p class="gate-demo">MODE DEMO — login & cloud hanya simulasi di browser ini</p>` : ""}
          </div>`;
        document.body.appendChild(gate);
        $("gateGoogle").addEventListener("click", onGoogle);
        $("gateGuest").addEventListener("click", showGuestWarn);
        return gate;
      }
      const msg = (t) => { const m = $("gateMsg"); if (m) m.textContent = t || ""; };
      const busy = (b) => { for (const id of ["gateGoogle", "gateGuest"]) { const el = $(id); if (el) el.disabled = !!b; } const s = document.querySelector("#gateGoogle span"); if (s) s.textContent = b ? "Menunggu Google…" : "Login dengan Google"; };
      ui.showGate = (state, message) => {
        build(); clearTimeout(gateTimer); gate.classList.remove("hidden", "out");
        const loading = state === "loading";
        $("gateLoad").classList.toggle("hidden", !loading); $("gateActions").classList.toggle("hidden", loading);
        msg(message || ""); busy(false);
      };
      ui.hideGate = () => {
        if (!gate || gate.classList.contains("hidden")) return;
        gate.classList.add("out"); clearTimeout(gateTimer);
        gateTimer = setTimeout(() => { gate.classList.add("hidden"); gate.classList.remove("out"); }, 380);
      };
      async function onGoogle() {
        msg(""); busy(true);
        const r = await cloud.signInGoogle();
        busy(false);
        if (r.error) { msg(r.message); return; }
        if (["empty", "uploaded", "identical", "synced", "offline"].includes(r.result)) ui.hideGate();
        else if (r.result === "cancel") msg("Pilihan dibatalkan. Kamu bisa login lagi atau bermain sebagai tamu.");
        else if (r.result === "error") msg(cloud.lastError || "Login berhasil tetapi sinkronisasi gagal. Coba lagi.");
      }

      // ---------- Peringatan mode tamu ----------
      function showGuestWarn() {
        if ($("guestWarn")) return;
        const w = document.createElement("div"); w.id = "guestWarn"; w.className = "cmodal";
        w.setAttribute("role", "alertdialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-labelledby", "gwTitle");
        w.innerHTML = `<div class="cbox warn">
          <button class="close gw-x" id="gwClose" aria-label="Tutup dan kembali ke halaman login">✕</button>
          <h3 id="gwTitle">⚠️ PERINGATAN DATA TAMU</h3>
          <p>Anda akan bermain tanpa akun Google. Progres permainan hanya tersimpan di perangkat ini.</p>
          <p>Jika data browser terhapus, perangkat rusak, atau Anda mengganti HP, progres permainan berisiko hilang.</p>
          <p><b>Kami menyarankan Login Google agar progres tersimpan di cloud.</b></p>
          <div class="cbtns"><button class="btn" id="gwContinue">Lanjut Main</button><button class="btn gold" id="gwBack">Kembali Login Google</button></div>
        </div>`;
        document.body.appendChild(w);
        const close = () => { w.remove(); const g = $("gateGoogle"); if (g) g.focus(); };
        $("gwClose").addEventListener("click", close);
        $("gwBack").addEventListener("click", close);
        $("gwContinue").addEventListener("click", () => { w.remove(); cloud.guest(); ui.hideGate(); });
        w.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
        $("gwBack").focus();
      }

      // ---------- Pilihan sumber progres (konflik) ----------
      ui.chooseSource = ({ local, cloud: c, cloudSavedAt, why }) => new Promise((res) => {
        const w = document.createElement("div"); w.id = "srcChoose"; w.className = "cmodal"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true");
        const intro = why === "tamu"
          ? "Kamu punya progres <b>sebagai tamu</b> di perangkat ini, dan akun Google ini juga sudah punya progres di <b>cloud</b>."
          : "Progres di <b>cloud</b> berbeda dari progres di perangkat ini (mungkin dimainkan di HP lain).";
        w.innerHTML = `<div class="cbox wide"><h3>Pilih progres yang dipakai</h3><p>${intro} Pilih <b>satu</b>. Keduanya <b>tidak digabung</b>: koin, ikan, rumah, dan kapal tidak dijumlahkan.</p>
          <div class="src-grid">${sumHTML(c, "☁️ Progres Cloud", cloudSavedAt ? `<small>Disimpan ${esc(new Date(cloudSavedAt).toLocaleString("id-ID"))}</small>` : "")}${sumHTML(local, "📱 Progres Perangkat Ini")}</div>
          <p class="muted">Yang tidak dipilih tetap dicadangkan (di perangkat dan di server), jadi tidak hilang diam-diam.</p>
          <div class="cbtns col"><button class="btn" data-c="cloud">Pakai Progres Cloud</button><button class="btn ghost" data-c="local">Pakai Progres Perangkat Ini (menimpa Cloud)</button><button class="btn small ghost" data-c="cancel">Batal</button></div></div>`;
        w.addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; w.remove(); res(b.dataset.c); });
        document.body.appendChild(w);
      });
      ui.confirm = (text, okLabel) => new Promise((res) => {
        const w = document.createElement("div"); w.className = "cmodal"; w.setAttribute("role", "alertdialog");
        w.innerHTML = `<div class="cbox"><p>${esc(text)}</p><div class="cbtns"><button class="btn" data-c="1">${esc(okLabel || "Ya")}</button><button class="btn ghost" data-c="">Batal</button></div></div>`;
        w.addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; w.remove(); res(!!b.dataset.c); });
        document.body.appendChild(w);
      });
      ui.notice = (m) => { msg(m); };

      // ---------- HUD, panel Profil, banner sandbox ----------
      function profHTML() {
        const N = window.Nusa, S = N.S, L = NW.look, u = cloud.user;
        const name = (S.profile && S.profile.name) || "Pemancing";
        let biggest = null, species = 0;
        for (const [id, r] of Object.entries(S.dex || {})) {
          const f = N.FISH_BY_ID[id]; if (!f || f.rarity === "sampah" || !r || !(r.n > 0)) continue;
          species++; if (r.best > 0 && (!biggest || r.best > biggest.w)) biggest = { w: r.best, name: f.name };
        }
        const rank = L ? L.rank() : 0, goal = L ? L.nextGoal() : null, cur = L && L.currentTitle ? L.currentTitle() : null;
        const prevMin = rank > 0 ? L.TITLES[rank - 1].min : 0, pct = goal ? Math.max(0, Math.min(100, Math.round(((L.count() - prevMin) / (goal.min - prevMin)) * 100))) : 100;
        const awards = Object.values((S.adv && S.adv.awards) || {});
        const titles = L ? L.TITLES.slice(0, rank).map((t) => t.name) : [];
        const st = cloud.status;
        const mode = !cloud.enabled ? "Mode lokal (Cloud Save belum diaktifkan)" : u ? "Akun Google" : st === "guest" ? "Mode tamu" : "Belum login";
        const avatar = u && u.photo ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : "🧑‍🎣";
        const meta = cloud.meta();
        let h = `<div class="prof-head"><div class="prof-av">${avatar}</div><div class="prof-id"><b id="profName">${esc(name)}</b>
          <div class="muted">${mode}${cloud.demo ? " · DEMO" : ""}${cloud.owner.verified ? ` · <span class="owner-badge">👑 Owner</span>` : ""}</div></div></div>
          <div class="prof-grid">
            <div><small>Level</small><b>${rank}${cur ? " · " + esc(cur.name || cur) : ""}</b><div class="bar mini"><div class="bar-fill" style="width:${pct}%"></div></div><small>${goal ? `${goal.left} ikan lagi → ${esc(goal.name)}` : "Gelar tertinggi 🎉"}</small></div>
            <div><small>Total ikan tertangkap</small><b>${fmt(L ? L.count() : (S.stats && S.stats.caught))}</b></div>
            <div><small>Ikan terbesar</small><b>${biggest ? `${esc(biggest.name)} · ${N.fmtW ? N.fmtW(biggest.w) : biggest.w + " kg"}` : "—"}</b></div>
            <div><small>Spesies ditemukan</small><b>${species}</b></div>
          </div>
          <h4 class="prof-h">Gelar & pencapaian</h4><div class="prof-chips">${titles.map((t) => `<span>🎖️ ${esc(t)}</span>`).join("")}${awards.map((a) => `<span>${esc(a.icon || "🏅")} ${esc(a.name)}</span>`).join("") || (titles.length ? "" : `<span class="muted">Belum ada — tangkap ikan pertamamu!</span>`)}</div>
          <h4 class="prof-h">Cloud Save</h4><div class="cloud-card" id="cloudCard">
            <div class="cs-row"><span class="dotc ${st}"></span><b id="csText">${esc(cloud.statusText())}</b></div>
            ${cloud.lastError ? `<p class="muted" id="csErr">${esc(cloud.lastError)}</p>` : ""}
            ${cloud.enabled && u ? `<p class="muted">Versi cloud: ${meta.rev} · ${cloud.lastSyncAt ? "sinkron terakhir " + new Date(cloud.lastSyncAt).toLocaleTimeString("id-ID") : "belum sinkron di sesi ini"}</p>` : ""}
            ${cloud.remoteNewer ? `<p class="warn-line">☁️ Ada progres lebih baru di Cloud (perangkat lain). <button class="btn small gold" data-act="pullCloud">Muat dari Cloud</button></p>` : ""}
            ${!cloud.enabled ? `<p class="muted">Progres tersimpan di perangkat ini. Login Google akan aktif setelah proyek Firebase dikonfigurasi pemilik.</p>` : ""}
            <div class="prof-btns">
              ${cloud.enabled && u && !cloud.sandbox ? `<button class="btn small" data-act="syncNow">🔄 Sinkronkan sekarang</button>` : ""}
              ${cloud.enabled && !u ? `<button class="btn small gold" data-act="login">${GOOGLE_G} Login dengan Google</button>` : ""}
              ${cloud.enabled && u ? `<button class="btn small ghost" data-act="logout">Logout</button>` : ""}
            </div>
            ${cloud.enabled && !u ? `<p class="muted">Sebagai tamu, progres hanya ada di perangkat ini. Login Google memindahkannya ke cloud tanpa menghapus apa pun.</p>` : ""}
          </div>`;
        if (cloud.sandbox) h += `<div class="owner-card"><b>🛠 Mode Uji Owner aktif</b><p class="muted">Data terpisah dari progres & ekonomi normalmu. Koin simulasi tidak bisa dipindahkan ke pemain lain.</p><button class="btn small" data-act="exitSandbox">Keluar Mode Uji</button></div>`;
        else if (cloud.owner.verified) h += `<div class="owner-card"><b>👑 Akses Owner (diverifikasi server)</b>
            <p class="muted">Mode Uji membuka semua kapal, rumah, wilayah, dan perlengkapan dengan koin simulasi di penyimpanan TERPISAH. Tidak ada pembayaran asli.</p>
            <div class="prof-btns"><button class="btn small gold" data-act="enterSandbox">Buka Mode Uji</button><button class="btn small ghost" data-act="controlCenter">Control Center</button></div><p class="muted" id="ccNote"></p></div>`;
        return h;
      }
      async function act(a) {
        const N = window.Nusa;
        if (a === "login") { const r = await cloud.signInGoogle(); if (r.error) N.toast(r.message, "bad"); else if (["empty", "uploaded", "identical", "synced", "offline"].includes(r.result)) N.toast("Login berhasil ✅", "good"); }
        else if (a === "logout") await cloud.logout();
        else if (a === "syncNow") { N.toast("Menyinkronkan…"); const r = await cloud.syncNow(); N.toast(r && r.error ? "Gagal: " + cloud.errText(r.e) : "Tersinkron ✅", r && r.error ? "bad" : "good"); }
        else if (a === "pullCloud") await cloud.pullRemote();
        else if (a === "enterSandbox") { const r = await cloud.enterSandbox(); if (r && r.error) N.toast(r.message || "Gagal membuka Mode Uji", "bad"); }
        else if (a === "exitSandbox") await cloud.exitSandbox();
        else if (a === "controlCenter") { const r = await cloud.verifyOwner(true); const n = $("ccNote"); if (n) n.textContent = r ? "Akses Control Center diverifikasi server. Panelnya dikembangkan di Tahap 3.5." : "Akses ditolak."; return; }
        else return;
        N.renderPanel();
      }
      cloud.resolveConflictFromUI = async () => { await cloud._test.resolveConflict(); window.Nusa && window.Nusa.renderPanel(); };

      function refreshBadge() {
        const b = $("acctBtn"); if (!b) return;
        b.dataset.state = cloud.enabled ? cloud.status : "off";
        b.title = cloud.statusText();
        if (window.Nusa && window.Nusa.currentPanel() === "profil") {
          const t = $("csText"); if (t) { t.textContent = cloud.statusText(); } 
          window.Nusa.renderPanel();
        }
      }
      ui.hook = () => {
        const N = window.Nusa;
        N.registerPanel("profil", { title: () => "🧑‍🎣 Profil Nelayan", render: profHTML, act });
        const music = $("musicBtn");
        if (music && !$("acctBtn")) {
          const b = document.createElement("button"); b.className = "chip icon-btn"; b.id = "acctBtn"; b.setAttribute("aria-label", "Profil & akun"); b.innerHTML = `👤<span class="acct-dot"></span>`;
          music.parentNode.insertBefore(b, music); b.addEventListener("click", () => N.openPanel("profil"));
        }
        if (cloud.sandbox && !$("sbxBanner")) {
          const d = document.createElement("div"); d.id = "sbxBanner"; d.className = "sbx-banner";
          d.innerHTML = `🛠 MODE UJI OWNER · koin simulasi · terpisah dari ekonomi normal <button class="btn small" id="sbxExit">Keluar</button>`;
          document.body.appendChild(d); $("sbxExit").addEventListener("click", () => cloud.exitSandbox());
        }
        cloud.onChange(refreshBadge); refreshBadge();
      };
      return ui;
    },
  };
})();
