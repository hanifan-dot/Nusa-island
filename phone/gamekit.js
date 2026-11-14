// NUSA ISLAND — NusaPhone · PlayGame · kerangka game (Ide 07). Dimuat saat PlayGame dibuka (hanya bila NUSA_PHONE=true).
// Empat game offline (Balap Perahu, Nusa Rush, Karang Blast, Penjaga Laut) memakai kerangka ini: tutorial, jeda, audio (bawaan MATI), reduced motion, skor, game over, main ulang, kontrol sentuh.
// KONTRAK: game ini TIDAK memberi/mengambil koin, ikan, inventaris, quest, atau Cloud Save. Satu-satunya yang disimpan = skor terbaik di perangkat ini (localStorage), bukan data ekonomi.
(function () {
"use strict";
const NW = (window.NW = window.NW || {});
const G = (NW.phoneGames = NW.phoneGames || {});
const K = (NW.phoneKit = {});
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* hanya kenyamanan */ } };
K.audioOn = () => lsGet("nusa_pg_audio", "0") === "1";   // bawaan MATI
let actx = null;
K.beep = (f, d, type) => { if (!K.audioOn()) return; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = type || "square"; o.frequency.value = f; g.gain.value = 0.04; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + (d || 0.08)); } catch (e) { /* audio tidak tersedia */ } };

// def = { id, title, W, H, how: [baris tutorial], pad: [{k,label}] tombol sentuh opsional, make(env) → { update(dt), draw(g), tap(x,y), press(k,down), over?:bool, score } }
K.create = function (host, def, x) {
  const BEST = "nusa_pg_best_" + def.id, SEEN = "nusa_pg_seen_" + def.id;
  const rmNow = () => !!(x && x.rm && x.rm());
  host.innerHTML = `<div class="pg-game" data-game="${def.id}"><div class="pg-hud"><button type="button" class="pg-b" data-a="pause" aria-label="Jeda">⏸</button><b class="pg-sc" aria-live="off">0</b><small class="pg-best"></small><button type="button" class="pg-b" data-a="audio" aria-label="Audio" aria-pressed="false">🔇</button></div>
<div class="pg-stage"><canvas width="${def.W}" height="${def.H}" aria-label="${esc(def.title)}"></canvas><div class="pg-ov pg-tut hidden"></div><div class="pg-ov pg-pause hidden"></div><div class="pg-ov pg-over hidden"></div></div>
<div class="pg-pad">${(def.pad || []).map((b) => `<button type="button" class="pg-key" data-k="${b.k}" aria-label="${esc(b.label)}">${esc(b.label)}</button>`).join("")}</div></div>`;
  const root = host.querySelector(".pg-game"), cv = root.querySelector("canvas"), g = cv.getContext("2d");
  const $ = (s) => root.querySelector(s), sc = $(".pg-sc"), bestEl = $(".pg-best");
  let game = null, raf = 0, last = 0, paused = true, dead = false, mode = "tut", gone = false, best = parseInt(lsGet(BEST, "0"), 10) || 0, shown = -1;
  const env = { W: def.W, H: def.H, rm: rmNow, beep: K.beep, score: 0, rnd: Math.random };
  const setScore = () => { const v = Math.floor(game ? game.score : 0); if (v !== shown) { shown = v; sc.textContent = v; } bestEl.textContent = "Terbaik " + best; };
  const ov = (name, html) => { for (const n of ["tut", "pause", "over"]) $(".pg-" + n).classList.toggle("hidden", n !== name); if (name) $(".pg-" + name).innerHTML = html; };
  const tutorial = () => { mode = "tut"; paused = true; ov("tut", `<h4>${esc(def.title)}</h4><ul>${def.how.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p class="pg-small">Tanpa koin atau hadiah — hanya skor untuk seru-seruan.</p><button type="button" class="pg-cta" data-a="start">Mulai</button>`); };
  const start = () => { game = def.make(env); dead = false; shown = -1; ov(null); mode = "play"; paused = false; lsSet(SEEN, "1"); last = 0; setScore(); };
  const pause = (p) => { if (mode !== "play" && mode !== "pause") return; if (p === undefined) p = !paused; if (p === paused) return; paused = p; mode = p ? "pause" : "play"; last = 0; if (p) ov("pause", `<h4>Jeda</h4><button type="button" class="pg-cta" data-a="resume">Lanjut</button><button type="button" class="pg-cta alt" data-a="restart">Main ulang</button><button type="button" class="pg-cta alt" data-a="how">Cara main</button>`); else ov(null); };
  const over = () => { dead = true; paused = true; mode = "over"; const s = Math.floor(game.score), nb = s > best; if (nb) { best = s; lsSet(BEST, s); } K.beep(140, 0.25, "sawtooth"); ov("over", `<h4>Game over</h4><p class="pg-big">${s}</p><p class="pg-small">${nb ? "Skor terbaik baru!" : "Terbaik " + best}</p><button type="button" class="pg-cta" data-a="restart">Main lagi</button>`); setScore(); };
  const frame = (t) => {
    if (gone) return; raf = requestAnimationFrame(frame);
    if (!last) last = t; const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (game && !paused && !dead) { game.update(dt); if (game.over) over(); setScore(); }
    g.save(); g.clearRect(0, 0, def.W, def.H); if (game) game.draw(g); else { g.fillStyle = "#0b3a55"; g.fillRect(0, 0, def.W, def.H); } g.restore();
  };
  const audioPaint = () => { const b = $("[data-a=audio]"), on = K.audioOn(); b.textContent = on ? "🔊" : "🔇"; b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Audio hidup" : "Audio mati"); };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * def.W / r.width, (e.clientY - r.top) * def.H / r.height]; };
  cv.addEventListener("pointerdown", (e) => { if (paused || !game) return; e.preventDefault(); const [px, py] = pos(e); if (game.tap) game.tap(px, py); if (game.swipe) game.sw = [px, py]; });
  cv.addEventListener("pointerup", (e) => { if (paused || !game || !game.swipe || !game.sw) return; const [px, py] = pos(e); game.swipe(px - game.sw[0], py - game.sw[1]); game.sw = null; });
  cv.style.touchAction = "none";
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a; K.beep(520, 0.05);
    if (a === "pause") pause(true); else if (a === "resume") pause(false); else if (a === "start" || a === "restart") start(); else if (a === "how") tutorial();
    else if (a === "audio") { lsSet("nusa_pg_audio", K.audioOn() ? "0" : "1"); audioPaint(); K.beep(660, 0.08); }
  });
  const padDown = (e) => { const b = e.target.closest("[data-k]"); if (!b || paused || !game) return; e.preventDefault(); b.classList.add("on"); if (game.press) game.press(b.dataset.k, true); }, padUp = (e) => { const b = e.target.closest("[data-k]"); if (!b) return; b.classList.remove("on"); if (game && game.press) game.press(b.dataset.k, false); };
  $(".pg-pad").addEventListener("pointerdown", padDown); $(".pg-pad").addEventListener("pointerup", padUp); $(".pg-pad").addEventListener("pointercancel", padUp); $(".pg-pad").addEventListener("pointerleave", padUp);
  const key = (e) => { if (paused || !game) { if (e.key === "p" || e.key === "P") pause(); return; } const m = def.keys && def.keys[e.key]; if (m) { e.preventDefault(); if (game.press) game.press(m, e.type === "keydown"); } else if (e.key === "p" || e.key === "P") pause(true); };
  window.addEventListener("keydown", key); window.addEventListener("keyup", key);
  const vis = () => { if (document.hidden) pause(true); }; document.addEventListener("visibilitychange", vis);
  audioPaint(); bestEl.textContent = "Terbaik " + best; tutorial(); raf = requestAnimationFrame(frame);
  return { destroy() { gone = true; cancelAnimationFrame(raf); window.removeEventListener("keydown", key); window.removeEventListener("keyup", key); document.removeEventListener("visibilitychange", vis); host.innerHTML = ""; }, pause: () => pause(true), state: () => ({ mode, score: game ? Math.floor(game.score) : 0, best, dead }), _g: () => game, _start: start };
};
// util kecil untuk game
K.hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
K.text = (c, t, x, y, size, color, align) => { c.font = "800 " + size + "px system-ui,sans-serif"; c.fillStyle = color; c.textAlign = align || "center"; c.fillText(t, x, y); };
})();
