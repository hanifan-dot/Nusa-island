// =========================================================
//  NUSA ISLAND — Kalender Hadiah 7 Hari (tampilan). Panel "streak" lewat Nusa.registerPanel.
//  Animasi hanya CSS (transform/opacity), dimatikan bila pemain memilih "kurangi gerakan".
// =========================================================
(function () {
"use strict";
window.NW = window.NW || {};
const C = NW.StreakCore;
if (!C) return;
const N = () => window.Nusa;
let popup = null, timer = 0;

const ICON = (rw) => (rw.ship ? "⛵" : rw.rod ? "🎣" : rw.furn ? "🎁" : rw.chest ? "🧰" : rw.coin && !rw.bait ? "🪙" : rw.bait && !rw.coin ? "🪱" : "🎁");
function label(rw) {
  if (rw.ship) return "Kapal Perintis";
  if (rw.rod) return "Joran Pelaut";
  if (rw.furn) return "Perabot Acak";
  if (rw.chest) return "Peti Kecil";
  const p = []; if (rw.coin) p.push(`${rw.coin} koin`); if (rw.bait) p.push(`${rw.bait} umpan`); return p.join(" + ");
}
const hms = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return [h, m, x].map((v) => String(v).padStart(2, "0")).join(":"); };
const cycleName = (c) => (c === 1 ? "Siklus Perintis" : c === 2 ? "Siklus Pelaut" : "Siklus Perabot");

function cell(pos, rw, state) {
  const big = pos === 7;
  const tag = state === "done" ? `<span class="stk-tag ok">✔ Sudah Diklaim</span>` : state === "today" ? `<span class="stk-tag now">Hari ini</span>` : state === "next" ? `<span class="stk-tag soon">Besok</span>` : "";
  return `<div class="stk-cell ${state} ${big ? "big" : ""}" data-pos="${pos}">
    <div class="stk-day">Hari ${pos}</div><div class="stk-ic">${ICON(rw)}</div><div class="stk-rw">${label(rw)}</div>${tag}${big ? `<div class="stk-shine"></div>` : ""}</div>`;
}
function collection(v) {
  const S = N().S, t = S.streak, K = NW.streak;
  const card = (kind, X, own, reqText) => `<div class="stk-item ${own ? "" : "lock"}"><div class="ic">${own ? X.icon : "🔒"}</div><div class="grow"><b>${X.name}</b>
      <div class="muted">${own ? X.desc : reqText}</div></div>${own ? `<button class="btn small ${t.equip[kind] ? "" : "gold"}" data-act="stkEquip" data-arg="${kind}">${t.equip[kind] ? "Dipakai ✔" : "Pakai"}</button>` : ""}</div>`;
  const have = new Set(S.home ? S.home.furniture.concat(S.home.stored).map((f) => f.type) : []);
  const furn = C.FURN_POOL.map((f) => { const own = have.has(f.id); return `<span class="stk-fu r-${f.rarity} ${own ? "own" : ""}" title="${own ? f.name : "Belum dimiliki"}">${own ? f.icon : "?"}</span>`; }).join("");
  const n = C.FURN_POOL.filter((f) => have.has(f.id)).length;
  return `<h4 class="stk-h">Koleksi Eksklusif</h4>
    ${card("ship", K.SHIP, t.ship, "Selesaikan login Hari 1–7 berturut-turut di siklus pertama.")}
    ${card("rod", K.ROD, t.rod, "Selesaikan siklus kedua (Hari 8–14) berturut-turut.")}
    <div class="stk-item"><div class="ic">🪱</div><div class="grow"><b>Umpan Hadiah: ${t.bait}</b><div class="muted">Dipakai otomatis tiap lemparan: gigitan lebih cepat dan sedikit lebih hoki.</div></div></div>
    <div class="stk-item"><div class="ic">🛋️</div><div class="grow"><b>Perabot Hadiah: ${n}/${C.FURN_POOL.length}</b><div class="muted">Dari Hari 7 siklus ketiga dan seterusnya. Langsung masuk Rumahku (atau Gudang bila penuh).</div><div class="stk-fus">${furn}</div></div></div>`;
}

function popupHTML(p) {
  const rw = p.plan.reward, fd = p.plan.fid ? C.FURN_BY_ID[p.plan.fid] : null;
  const big = rw.ship ? { i: "⛵", t: "Kapal Perintis Eksklusif", s: "Milikmu selamanya! Aktifkan di Koleksi Eksklusif." } : rw.rod ? { i: "🎣", t: "Joran Pelaut Eksklusif", s: "Milikmu selamanya! Aktifkan di Koleksi Eksklusif." }
    : fd ? { i: fd.icon, t: fd.name, s: `${C.RARITY[fd.rarity].label} · sudah masuk Rumahku` } : { i: ICON(rw), t: label(rw), s: rw.chest ? "Peti dibuka: koin dan umpan masuk tasmu." : "Masuk ke tasmu." };
  const col = fd ? C.RARITY[fd.rarity].color : "#f0b53a";
  let conf = ""; for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283, d = 70 + (i % 4) * 22; conf += `<i style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d - 20)}px;--r:${(i * 47) % 360}deg;--c:${["#f0b53a", "#e0629a", "#2fb39a", "#4aa3df"][i % 4]}"></i>`; }
  return `<div class="stk-pop" data-act="stkClose"><div class="stk-pop-card" style="--g:${col}"><div class="stk-conf">${conf}</div>
    <div class="stk-pop-ic">${big.i}</div><div class="stk-pop-t">${big.t}</div><div class="stk-pop-s">${big.s}</div>
    <div class="stk-pop-d">Hari ${p.plan.pos} · ${cycleName(p.plan.cycle)}</div><button class="btn gold" data-act="stkClose">Mantap!</button></div></div>`;
}

function render() {
  const K = NW.streak, v = K.view(), S = N().S;
  const cyc = v.claimCycle, cells = [];
  const streakDays = v.claimedToday ? v.claimPos : v.canClaim && v.next.pos > 1 ? v.claimPos - 1 : 0;
  for (let pos = 1; pos <= 7; pos++) {
    let st = "lock";
    if (v.claimedToday) st = pos <= v.claimPos ? "done" : pos === v.claimPos + 1 ? "next" : "lock";
    else st = pos < v.claimPos ? "done" : pos === v.claimPos ? "today" : "lock";
    cells.push(cell(pos, C.rewardFor(cyc, pos), st));
  }
  const majorLeft = v.daysToMajor === 0 ? "Hari ini!" : v.daysToMajor === 1 ? "Besok" : `${v.daysToMajor} hari lagi`;
  let banner = v.simulated ? `<div class="stk-note warn">MODE DEMO (simulasi pengujian). Hadiah di sini TIDAK tersimpan di server asli dan TIDAK tersinkron online.</div>` : "";
  if (!v.access.ok) banner += `<div class="stk-note warn">${v.access.msg}${v.access.why === "login" ? ` <button class="btn small gold" data-act="stkLogin">Buka Profil</button>` : ""}</div>`;
  else if (v.error) banner += `<div class="stk-note warn">${v.error} <button class="btn small" data-act="stkRetry">Coba Lagi</button></div>`;
  else if (v.lost && !v.claimedToday) banner += `<div class="stk-note">Streak terputus di Hari ${v.brokenAt}. Mulai lagi dari Hari 1. Kapal, joran, dan perabotmu tetap aman.</div>`;
  else if (v.clockSource !== "server" && !v.simulated) banner += `<div class="stk-note dim">Hari dihitung server (WIB). Jam di sini hanya perkiraan.</div>`;
  let btn;
  if (v.busy) btn = `<button class="btn gold stk-claim" disabled>Mengklaim…</button>`;
  else if (!v.access.ok) btn = `<button class="btn stk-claim" disabled>🔒 KLAIM HADIAH</button>`;
  else if (v.loading && !v.loaded) btn = `<button class="btn stk-claim" disabled>Memuat…</button>`;
  else if (!v.loaded) btn = `<button class="btn stk-claim" data-act="stkRetry">Muat Ulang</button>`;
  else if (v.claimedToday) btn = `<button class="btn stk-claim done" disabled>✔ Sudah Diklaim</button><div class="stk-count">Hadiah berikutnya dalam <b id="stkCount">${hms(v.msLeft)}</b></div>`;
  else btn = `<button class="btn gold stk-claim pulse" data-act="stkClaim">🎁 KLAIM HADIAH</button>`;
  return `<div class="stk">
    <div class="stk-top"><div><div class="stk-streak">🔥 Streak <b>${streakDays}</b> hari</div><div class="stk-cyc">${cycleName(cyc)} · Siklus ${cyc}</div></div>
      <div class="stk-major"><div class="muted">Hadiah utama berikutnya</div><b>${v.major.reward.ship ? "⛵" : v.major.reward.rod ? "🎣" : "🎁"} ${v.major.name}</b><div class="muted">Hari 7 · ${majorLeft}</div></div></div>
    ${banner}
    <div class="stk-grid">${cells.slice(0, 6).join("")}</div>
    <div class="stk-day7">${cells[6]}</div>
    <div class="stk-act">${btn}</div>
    ${collection(v)}
    ${popup ? popupHTML(popup) : ""}
  </div>`;
}
function after(body) {
  clearInterval(timer);
  timer = setInterval(() => {
    if (N().currentPanel() !== "streak") { clearInterval(timer); return; }
    const el = body.querySelector("#stkCount"), v = NW.streak.view();
    if (el) { el.textContent = hms(v.msLeft); if (v.msLeft <= 1000) NW.streak.refresh(true).then(() => N().renderPanel()); }
  }, 1000);
}
async function act(a, arg) {
  const K = NW.streak;
  if (a === "stkClose") { popup = null; N().renderPanel(); return; }
  if (a === "stkLogin") { N().openPanel("profil"); return; }
  if (a === "stkRetry") { N().renderPanel(); await K.refresh(true); N().renderPanel(); return; }
  if (a === "stkEquip") { K.setEquip(arg, !N().S.streak.equip[arg]); N().renderPanel(); return; }
  if (a === "stkClaim") {
    N().sfx("click");
    const p = K.claim(); N().renderPanel();               // tampilkan "Mengklaim…" segera
    const r = await p;
    if (r && r.ok) { popup = r; N().sfx("coin"); N().toast("🎁 " + C.describe(r.plan.reward) + (r.plan.fid ? ` (${C.FURN_BY_ID[r.plan.fid].name})` : ""), "good"); }
    else if (r && r.error) N().toast(r.error, "bad");
    N().renderPanel();
  }
}
function register() { N().registerPanel("streak", { title: () => "🎁 Kalender Hadiah 7 Hari", render, act, after }); NW.streak.onChange(() => { if (N().currentPanel() === "streak") N().renderPanel(); }); }

NW.streakUI = { register, render };
})();
