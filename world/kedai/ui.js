// =========================================================
//  NUSA ISLAND — Bumbu 3.1: ANTARMUKA Kedai Atuk Bahar (menu, kesulitan, permainan, hasil, perayaan gelar)
//  Elemen DOM dibuat sekali saat pertama dibuka. Semua tombol ≥44px agar nyaman di layar sentuh HP.
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const D = window.NusaKedaiData, G = () => NW.kedaiGames, A = () => NW.kedaiArt;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const HOW = {
  batok: ["Ada <b>3 batok kelapa</b> dan <b>1 kelereng</b> merah.", "Kelereng diperlihatkan lebih dulu di bawah batok yang terangkat. Tekan <b>Mulai</b>, ingat posisinya.", "Batok diacak dengan jelas, tanpa tipuan: kelerengnya ikut batok yang sama.", "Setelah berhenti, <b>ketuk batok</b> yang kamu yakini menyimpan kelereng. Makin sulit, makin cepat dan banyak tukarannya."],
  gasing: ["Tekan <b>Mulai</b>, lalu <b>tarik ke belakang</b> dari gasing biru seperti ketapel. Arah tarikan menentukan arah luncur, panjang tarikan menentukan kekuatan putaran.", "Lepaskan untuk meluncurkan. Gasing Atuk (merah) ikut meluncur ke arahmu.", "Gasing menang bila <b>masih berputar lebih lama</b> atau lawan terlempar keluar arena. Tumbukan melemahkan putaran lawan."],
  congklak: ["Papan punya 7 lubang per sisi dan 1 lumbung. Kamu di <b>barisan bawah</b>, lumbungmu di kanan.", "Ketuk lubangmu: bijinya ditaburkan berlawanan jarum jam, satu per lubang (lumbung Atuk dilewati).", "Berhenti di <b>lumbungmu</b> = giliran lagi. Berhenti di lubang berisi = lanjut menabur. Berhenti di <b>lubang kosongmu</b> = tembak: ambil biji lubang seberang.", "Permainan selesai saat satu sisi kosong; sisa biji milik pemilik sisinya. Biji terbanyak di lumbung menang."],
  gelang: ["Tekan <b>Mulai</b>. Lempar gelang ke tiang bambu yang <b>bersinar</b> (tiang aktif).", "<b>Tarik ke bawah</b> dari pelempar: arah tarikan = arah lempar, panjang tarikan = kekuatan. Cincin putih menunjukkan titik jatuhnya.", "Gelang harus mendarat <b>di dalam lingkaran tiang</b>. Capai jumlah kena yang diminta sebelum gelang habis. Di GOAT tiang bergoyang: atur waktu lepasmu!"],
  kelereng: ["Tekan <b>Mulai</b>. Tarik ke belakang dari kelereng putih lalu lepas untuk menyentil.", "Garis titik-titik menunjukkan <b>lintasan perkiraan</b> saat membidik (makin sulit, makin pendek).", "Tujuanmu: <b>keluarkan kelereng merah</b> dari lingkaran sebelum sentilan habis. Kelereng biru adalah penghalang."],
};
let root = null, cv = null, c2 = null, pv = null, pc = null, state = null, raf = 0, lastT = 0, T = 0, opts = null, toastT = 0;

const CSS = `
.kd-wrap{position:fixed;inset:0;z-index:60;background:rgba(18,12,6,.78);display:flex;align-items:center;justify-content:center;padding:8px;-webkit-tap-highlight-color:transparent}
.kd-wrap.hidden{display:none}
.kd-card{width:min(100%,460px);max-height:100%;overflow:auto;background:#fff6e4;color:#3b2a1a;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.5);border:3px solid #7a4b22;display:flex;flex-direction:column;position:relative}
.kd-head{display:flex;gap:10px;align-items:center;padding:10px 12px;background:linear-gradient(#f0c27a,#e3a95a);border-bottom:2px solid #7a4b22}
.kd-head canvas{width:64px;height:64px;border-radius:12px;border:2px solid #7a4b22;flex:none;background:#ffe9b8}
.kd-say{flex:1;min-width:0;font-size:14px;line-height:1.3;font-weight:600}
.kd-say small{display:block;font-weight:800;color:#7a3a1c;font-size:11px;letter-spacing:.04em}
.kd-chip{background:#3a2210;color:#ffe28a;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:800;white-space:nowrap;flex:none}
.kd-body{padding:12px;display:flex;flex-direction:column;gap:10px}
.kd-btn{min-height:46px;border:none;border-radius:12px;padding:10px 14px;font:700 15px system-ui,sans-serif;background:#e8d3a8;color:#3b2a1a;box-shadow:0 2px 0 #b99358;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;touch-action:manipulation}
.kd-btn:active{transform:translateY(2px);box-shadow:none}
.kd-btn.gold{background:#f0c24a;box-shadow:0 2px 0 #b8902a}
.kd-btn.red{background:#e2574c;color:#fff;box-shadow:0 2px 0 #a63a30}
.kd-btn.ghost{background:transparent;box-shadow:none;border:2px solid #b99358}
.kd-btn small{display:block;font-weight:600;font-size:11.5px;opacity:.8}
.kd-btn .ic{font-size:24px;flex:none}
.kd-btn .tag{margin-left:auto;font-size:11px;font-weight:800;padding:3px 8px;border-radius:10px;background:rgba(0,0,0,.1);white-space:nowrap}
.kd-btn.done .tag{background:#7ccf6b;color:#17400f}
.kd-row{display:flex;gap:8px;flex-wrap:wrap}.kd-row .kd-btn{flex:1;justify-content:center;text-align:center;min-width:90px}
.kd-info{font-size:12.5px;line-height:1.35;background:#fff;border:2px dashed #d9bd8a;border-radius:12px;padding:8px 10px}
.kd-bar{height:10px;border-radius:6px;background:#e8d3a8;overflow:hidden}.kd-bar>i{display:block;height:100%;background:linear-gradient(90deg,#f0c24a,#e8913a)}
.kd-play{display:flex;flex-direction:column;gap:8px}
.kd-cv{width:100%;aspect-ratio:360/380;border-radius:14px;border:3px solid #4a2b12;touch-action:none;display:block;background:#7a4f2c;user-select:none;-webkit-user-select:none}
.kd-stat{min-height:34px;font-size:13px;font-weight:700;text-align:center;background:#fff;border-radius:10px;padding:6px 8px}
.kd-over{position:absolute;inset:0;background:rgba(18,12,6,.72);display:flex;align-items:center;justify-content:center;padding:14px;border-radius:15px;z-index:3}
.kd-over.hidden{display:none}
.kd-pop{background:#fff6e4;border:3px solid #7a4b22;border-radius:16px;padding:14px;max-width:100%;width:100%;max-height:100%;overflow:auto;display:flex;flex-direction:column;gap:10px;position:relative}
.kd-pop h3{margin:0;font-size:20px;text-align:center}
.kd-pop ol{margin:0;padding-left:20px;font-size:13.5px;line-height:1.45}
.kd-pop .big{font-size:36px;text-align:center}
.kd-title{text-align:center;font:800 19px Georgia,serif;color:#7a3a1c;line-height:1.2;text-shadow:0 1px 0 #fff}
.kd-fx{position:absolute;inset:0;pointer-events:none;border-radius:15px;z-index:4}
.kd-toast{position:absolute;left:50%;top:78px;transform:translateX(-50%);background:#3a2210;color:#ffe28a;font-weight:800;font-size:13px;padding:8px 14px;border-radius:12px;z-index:5;max-width:90%;text-align:center}
`;

function build() {
  if (root) return;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  root = document.createElement("div"); root.id = "kdWrap"; root.className = "kd-wrap hidden"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Kedai Atuk Bahar");
  root.innerHTML = `<section class="kd-card" id="kdCard"><header class="kd-head"><canvas id="kdPv" width="128" height="128"></canvas><div class="kd-say"><small>ATUK BAHAR</small><span id="kdSay"></span></div><div class="kd-chip" id="kdCoin" title="Koin Kedai (simulasi lokal)">🪙 0</div></header><div class="kd-body" id="kdBody"></div><div class="kd-over hidden" id="kdOver"></div><canvas class="kd-fx" id="kdFx"></canvas></section>`;
  document.body.appendChild(root);
  pv = root.querySelector("#kdPv"); pc = pv.getContext("2d");
  root.addEventListener("pointerdown", (e) => e.stopPropagation()); // jangan tembus ke dunia
}

const S = () => window.Nusa.S;
const sfx = (n) => { try { window.Nusa.sfx(n); } catch (e) {} };
function say(line, mood) { root.querySelector("#kdSay").textContent = line; state.mood = mood || "talk"; state.moodT = 2.4; }
function coinChip() { const k = S().kedai; root.querySelector("#kdCoin").textContent = `🪙 ${k ? k.koin : 0}`; }
function setBody(h) { root.querySelector("#kdBody").innerHTML = h; }
function toast(t) { let e = root.querySelector(".kd-toast"); if (!e) { e = document.createElement("div"); e.className = "kd-toast"; root.querySelector("#kdCard").appendChild(e); } e.textContent = t; e.style.display = "block"; clearTimeout(toastT); toastT = setTimeout(() => { e.style.display = "none"; }, 2600); }

// ---------- layar: menu ----------
function menu() {
  stopGame(); state.screen = "menu"; state.game = null;
  const k = S().kedai; D.rollDay(S(), D.dayStr());
  const left = D.DAILY_CAP - k.earned, gc = D.goatCount(S());
  let h = `<div class="kd-info">Hadiah hari ini: <b>${k.earned}/${D.DAILY_CAP}</b> Koin Kedai<div class="kd-bar"><i style="width:${Math.round(k.earned / D.DAILY_CAP * 100)}%"></i></div>${k.title ? `<div style="margin-top:6px"><b>🐐 ${D.TITLE.name}</b> — gelar permanenmu!</div>` : `<div style="margin-top:6px">Penakluk GOAT: <b>${gc}/5</b> permainan${gc ? " (" + D.GAMES.filter((g) => k.goat[g]).map((g) => D.ICONS[g]).join(" ") + ")" : ""}</div>`}</div>`;
  for (const g of D.GAMES) {
    const done = !!k.claimed[g], best = ["goat", "sulit", "normal", "mudah"].map((d) => (k.rec[g] && k.rec[g][d] && k.rec[g][d].wins ? D.DIFF_NAMES[d] : "")).find((x) => x);
    h += `<button class="kd-btn ${done ? "done" : ""}" data-g="${g}"><span class="ic">${D.ICONS[g]}</span><span>${D.NAMES[g]}<small>${best ? "Tertinggi dimenangkan: " + best : "Belum pernah menang"}${k.goat[g] ? " · 🐐" : ""}</small></span><span class="tag">${done ? "✓ hadiah diambil" : left > 0 ? "hadiah tersedia" : "main saja"}</span></button>`;
  }
  h += `<div class="kd-info" style="font-size:11.5px">🪙 <b>Koin Kedai</b> adalah dompet terpisah (simulasi lokal di perangkat ini) dan <b>tidak</b> mengubah saldo koin utamamu. Tidak ada taruhan: kalah tidak mengurangi apa pun.</div><button class="kd-btn red" data-x="exit"><span class="ic">🚪</span><span>Keluar dari Kedai</span></button>`;
  setBody(h); coinChip(); say(D.pick("sapa", state.sapa++), "laugh"); sfx("kedai_tawa");
  root.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => { sfx("kedai_klik"); diffs(b.dataset.g); }));
  root.querySelector("[data-x=exit]").addEventListener("click", () => close(true));
}
// ---------- layar: pilih kesulitan ----------
function diffs(g) {
  stopGame(); state.screen = "diff"; state.g = g; const k = S().kedai; D.rollDay(S(), D.dayStr());
  const left = D.DAILY_CAP - k.earned, claimed = !!k.claimed[g];
  let h = `<div class="kd-title">${D.ICONS[g]} ${D.NAMES[g]}</div>`;
  const sub = claimed ? "Hadiah koin permainan ini sudah diambil hari ini (tetap boleh main)." : left <= 0 ? "Batas hadiah harian tercapai — tetap boleh main tanpa koin." : "Menang pertama hari ini di permainan ini = hadiah koin.";
  h += `<div class="kd-info">${sub}</div>`;
  for (const d of D.DIFFS) {
    const r = k.rec[g] && k.rec[g][d], cap = claimed || left <= 0 ? "" : `+${Math.min(D.REWARD[d], left)} 🪙`;
    h += `<button class="kd-btn ${d === "goat" ? "gold" : ""}" data-d="${d}"><span class="ic">${{ mudah: "🌱", normal: "🎯", sulit: "🔥", goat: "🐐" }[d]}</span><span>${D.DIFF_NAMES[d]}<small>${r ? `Menang ${r.wins}× dari ${r.plays} main · beruntun terbaik ${r.bestStreak}` : "Belum dimainkan"}</small></span><span class="tag">${cap || (k.goat[g] && d === "goat" ? "🐐 ditaklukkan" : "tanpa koin")}</span></button>`;
  }
  h += `<div class="kd-row"><button class="kd-btn ghost" data-x="how">❓ Cara Bermain</button><button class="kd-btn ghost" data-x="back">⬅ Kembali</button></div>`;
  setBody(h); say(D.pick("instruksi", 0), "talk");
  root.querySelectorAll("[data-d]").forEach((b) => b.addEventListener("click", () => { sfx("kedai_klik"); play(g, b.dataset.d); }));
  root.querySelector("[data-x=how]").addEventListener("click", () => how(g));
  root.querySelector("[data-x=back]").addEventListener("click", () => { sfx("kedai_klik"); menu(); });
}
function how(g) {
  const o = root.querySelector("#kdOver"); o.classList.remove("hidden");
  o.innerHTML = `<div class="kd-pop"><h3>${D.ICONS[g]} Cara Bermain</h3><ol>${HOW[g].map((s) => `<li>${s}</li>`).join("")}</ol><div class="kd-info">Hadiah: Mudah 5 · Normal 10 · Sulit 20 · GOAT 35 Koin Kedai (hanya kemenangan pertama per permainan per hari, maksimal 100 per hari). Tidak ada taruhan.</div><button class="kd-btn gold" data-x="ok" style="justify-content:center">Mengerti</button></div>`;
  o.querySelector("[data-x=ok]").addEventListener("click", () => { sfx("kedai_klik"); o.classList.add("hidden"); });
}

// ---------- layar: bermain ----------
function stopGame() { state.ctl = null; state.fx = null; const o = root && root.querySelector("#kdOver"); if (o) o.classList.add("hidden"); }
function play(g, d) {
  state.screen = "play"; state.g = g; state.d = d; state.over = false;
  const seed = (opts && opts.seed != null ? opts.seed + (state.round++) : (Math.random() * 4e9) >>> 0) || 1;
  setBody(`<div class="kd-play"><div class="kd-row"><button class="kd-btn ghost" data-x="how">❓ Cara Bermain</button><button class="kd-btn ghost" data-x="again">↻ Ulangi</button><button class="kd-btn ghost" data-x="quit">✕ Keluar</button></div>
    <canvas class="kd-cv" id="kdCv" width="720" height="760"></canvas><div class="kd-stat" id="kdStat"></div><button class="kd-btn gold" data-x="go" style="justify-content:center">▶ Mulai</button></div>`);
  cv = root.querySelector("#kdCv"); c2 = cv.getContext("2d"); c2.scale(2, 2);
  const host = { sfx, finish: (won, score) => finished(won, score) };
  state.ctl = G().create[g](d, seed, host); state.fxr = null;
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 360 / r.width, (e.clientY - r.top) * 380 / r.height]; };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} const [x, y] = pt(e); state.ctl && state.ctl.pointer("down", x, y); });
  cv.addEventListener("pointermove", (e) => { const [x, y] = pt(e); state.ctl && state.ctl.pointer("move", x, y); });
  const up = (e) => { const [x, y] = pt(e); state.ctl && state.ctl.pointer("up", x, y); };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  root.querySelector("[data-x=how]").addEventListener("click", () => how(g));
  root.querySelector("[data-x=again]").addEventListener("click", () => { sfx("kedai_klik"); play(g, d); });
  root.querySelector("[data-x=quit]").addEventListener("click", () => { sfx("kedai_klik"); diffs(g); });
  root.querySelector("[data-x=go]").addEventListener("click", () => { if (state.ctl && state.ctl.ready()) { state.ctl.start(); root.querySelector("[data-x=go]").style.display = "none"; } });
  say(`${D.NAMES[g]} — ${D.DIFF_NAMES[d]}. ${d === "goat" ? "Berani juga kau, cucu!" : "Ayo, cucu!"}`, "talk");
}
function finished(won, score) {
  if (state.over) return; state.over = true;
  const res = NW.kedai.onResult(state.g, state.d, !!won, score);
  coinChip();
  const o = root.querySelector("#kdOver"); o.classList.remove("hidden");
  const title = res.title, g = state.g, d = state.d;
  let line, mood;
  if (res.title) { line = D.pick("gelar", state.sapa++); mood = "amaze"; sfx("kedai_goat"); setTimeout(() => sfx("kedai_tawa"), 900); }
  else if (won && d === "goat") { line = D.pick("goatMenang", 0); mood = "amaze"; sfx("kedai_goat"); }
  else if (won) { line = D.pick("menang", state.sapa++); mood = "amaze"; sfx("kedai_menang"); setTimeout(() => sfx("kedai_tawa"), 700); }
  else { line = D.pick("kalah", state.sapa++); mood = "laugh"; sfx("kedai_kalah"); setTimeout(() => sfx("kedai_tawa"), 500); }
  say(line, mood);
  const coin = res.status === "ok" || res.status === "sebagian" ? `<div class="big">+${res.coins} 🪙</div><div class="kd-info">Koin Kedai${res.status === "sebagian" ? " (dipotong batas harian)" : ""}. Hadiah hari ini: ${S().kedai.earned}/${D.DAILY_CAP}.</div>` :
    res.status === "sudah" ? `<div class="kd-info">${esc(D.pick("sudah", 0))}</div>` : res.status === "batas" ? `<div class="kd-info">${esc(D.pick("batas", 0))}</div>` : "";
  const extra = (res.newRecord ? `<div class="kd-info">🏆 Rekor baru di ${D.DIFF_NAMES[d]}!</div>` : "") + (res.goatNew && !res.title ? `<div class="kd-info">🐐 GOAT ${D.NAMES[g]} ditaklukkan! (${D.goatCount(S())}/5)</div>` : "");
  const tt = title ? `<div class="kd-title">🎖️ GELAR BARU<br>${D.TITLE.full}</div><div class="kd-info">Lencana ini permanen, tampil di Profil dan Buku Petualangan, dan hanya diklaim satu kali.</div>` : "";
  o.innerHTML = `<div class="kd-pop"><div class="big">${won ? (title ? "🐐🎉" : "🎉") : "🥥"}</div><h3>${won ? "Kamu menang!" : "Belum menang"}</h3>${tt}${coin}${extra}<div class="kd-info">“${esc(line)}”</div>
    <div class="kd-row"><button class="kd-btn gold" data-x="again">↻ Ulangi</button><button class="kd-btn" data-x="diff">Ganti Kesulitan</button><button class="kd-btn ghost" data-x="menu">Menu Kedai</button></div></div>`;
  if (title) state.fxr = A().confetti(70, 360, 600);
  o.querySelector("[data-x=again]").addEventListener("click", () => { sfx("kedai_klik"); state.fxr = null; play(g, d); });
  o.querySelector("[data-x=diff]").addEventListener("click", () => { sfx("kedai_klik"); state.fxr = null; diffs(g); });
  o.querySelector("[data-x=menu]").addEventListener("click", () => { sfx("kedai_klik"); state.fxr = null; menu(); });
}

// ---------- loop ----------
function frame(now) {
  if (!state) return; raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; T += dt;
  if (state.moodT > 0) { state.moodT -= dt; if (state.moodT <= 0) state.mood = "idle"; }
  A().portrait(pc, 128, 128, state.mood === "laugh" || state.mood === "talk" || state.mood === "amaze" ? state.mood : "idle", T);
  if (state.ctl && cv) {
    for (let i = 0, n = Math.max(1, Math.round(NW.kedaiUI.speed || 1)); i < n; i++) state.ctl.update(dt); // speed>1 hanya untuk pengujian otomatis
    state.ctl.draw(c2);
    const s = root.querySelector("#kdStat"); if (s) { const t = state.ctl.status(); if (s.textContent !== t) s.textContent = t; }
  }
  const fx = root.querySelector("#kdFx");
  if (state.fxr && fx) { const r = fx.getBoundingClientRect(); if (fx.width !== 360) { fx.width = 360; fx.height = 600; } const f = fx.getContext("2d"); f.clearRect(0, 0, 360, 600); A().confettiStep(state.fxr, dt, 360, 600); A().confettiDraw(f, state.fxr); void r; }
  else if (fx && fx.width === 360) { fx.getContext("2d").clearRect(0, 0, 360, 600); }
}

function open(o) {
  build(); opts = o || {}; state = { screen: "menu", mood: "idle", moodT: 0, sapa: (Math.random() * 3) | 0, round: 0, ctl: null };
  root.classList.remove("hidden"); lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  menu();
}
function close(farewell) {
  if (!root || root.classList.contains("hidden")) return;
  if (farewell) { try { window.Nusa.toast("Atuk: " + D.pick("pergi", 0)); } catch (e) {} }
  root.classList.add("hidden"); cancelAnimationFrame(raf); raf = 0; state = null;
  if (opts && opts.onClose) opts.onClose();
}
NW.kedaiUI = { speed: 1, open, close, isOpen: () => !!(root && !root.classList.contains("hidden")), _state: () => state, _el: () => root };
})();
