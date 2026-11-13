// NUSA ISLAND — Quest Owner (tampilan). Panel "questowner" lewat Nusa.registerPanel. Animasi hanya CSS transform/opacity (ringan untuk HP Android).
(function () {
"use strict";
window.NW = window.NW || {};
const Q = NW.QuestCore = NW.QuestCore || window.NusaQuestCore;
if (!Q) return;
const N = () => window.Nusa;
let timer = 0;
const STATUS = { belum: ["Belum dimulai", "idle"], proses: ["Sedang diproses", "wait"], selesai: ["Selesai · siap klaim", "ready"], klaim: ["Hadiah sudah diklaim", "done"], dicabut: ["Joran dinonaktifkan", "wait"] };
const fmt = (n) => Number(n).toLocaleString("id-ID");

function card(it, v) {
  const [label, cls] = STATUS[it.st], t = N().S.questOwner, wa = it.id === "wa";
  let act;
  if (it.busy) act = `<button class="btn gold qo-act" disabled>Mengklaim…</button>`;
  else if (it.st === "dicabut") act = `<div class="qo-got">Joran dinonaktifkan oleh Owner. Jika keliru, hubungi admin untuk ditinjau.</div>`;
  else if (it.st === "klaim") act = wa ? (t.rod ? `<button class="btn small qo-act ${t.equip ? "" : "gold"}" data-qo-equip="${t.equip ? "0" : "1"}">${t.equip ? "Lepaskan joran" : "Pakai joran"}</button>` : "") : `<div class="qo-got">✔ 25.000 koin sudah masuk</div>`;
  else if (it.st === "selesai") act = `<button class="btn gold qo-act pulse" data-act="qoClaim" data-arg="${it.id}">🎁 Klaim Hadiah</button><button class="qo-link" data-act="qoOpen" data-arg="${it.id}">Buka lagi tautan</button>`;
  else if (it.st === "proses") act = `<button class="btn qo-act" disabled>Klaim dalam <b data-qo-wait="${it.id}">${Math.ceil(it.waitMs / 1000)}</b> dtk</button><button class="qo-link" data-act="qoOpen" data-arg="${it.id}">Buka lagi tautan</button>`;
  else act = `<button class="btn qo-act qo-go ${it.id}" data-act="qoOpen" data-arg="${it.id}">${it.icon} ${it.btn}</button>`;
  const have = wa && t.rod ? `<div class="qo-have">🎣 Kamu sudah punya Joran WhatsApp${t.equip ? " · sedang dipakai" : " · belum dipakai"}</div>` : "";
  return `<div class="qo-card ${it.id} ${cls}"><div class="qo-ic">${it.icon}</div><div class="qo-body"><div class="qo-top"><b>${it.name}</b><span class="qo-st ${cls}">${label}</span></div>
    <div class="qo-desc">${it.desc}</div><div class="qo-rw">🎁 Hadiah: <b>${it.rewardText}</b></div>${have}<div class="qo-actrow">${act}</div></div></div>`;
}
function render() {
  const K = NW.quest, v = K.view();
  const pct = Math.round((v.done / v.total) * 100);
  let note = "";
  if (!v.access.ok) note = `<div class="qo-note warn">${v.access.msg}${v.access.why === "login" ? ` <button class="btn small gold" data-act="qoLogin">Buka Profil</button>` : ""}</div>`;
  else if (v.error) note = `<div class="qo-note warn">${v.error} <button class="btn small" data-act="qoRetry">Coba Lagi</button></div>`;
  else if (v.loading && !v.loaded) note = `<div class="qo-note dim">Memuat…</div>`;
  const done = v.allDone ? `<div class="qo-note ok">🎉 Semua quest selesai! Jaga keanggotaan grup agar Joran WhatsApp tetap berlaku.</div>` : "";
  return `<div class="qo"><div class="qo-hero"><div class="qo-palm">${NW.quest ? NW.quest.icon(46) : ""}</div><div><div class="qo-title">Quest Owner</div><div class="qo-sub">Misi spesial dari Owner Nusa Island. Ikuti aturan komunitas agar hadiah tetap berlaku.</div></div></div>
    <div class="qo-prog"><div class="qo-progtxt"><b>${v.loaded ? v.done : 0}/${v.total}</b> selesai</div><div class="qo-bar"><i style="width:${v.loaded ? pct : 0}%"></i></div></div>
    ${note}${done}${v.items.map((it) => card(it, v)).join("")}
    <div class="qo-fine">Game tidak bisa memeriksa langsung apakah kamu sudah follow/join. Owner dapat memeriksa keanggotaan grup secara manual dan menonaktifkan Joran WhatsApp jika terbukti keluar. Klaim hanya <b>sekali per akun</b>.</div></div>`;
}
function after(body) {
  try { const pt = document.getElementById("panelTitle"); if (pt && NW.quest) pt.innerHTML = NW.quest.icon(24) + '<span class="qo-ptitle">Quest Owner</span>'; } catch (e) {}
  clearInterval(timer);
  timer = setInterval(() => {
    if (N().currentPanel() !== "questowner") { clearInterval(timer); return; }
    const v = NW.quest.view(); let rerender = false;
    for (const it of v.items) { const el = body.querySelector(`[data-qo-wait="${it.id}"]`); if (el) { el.textContent = Math.ceil(it.waitMs / 1000); if (it.waitMs <= 0) rerender = true; } }
    if (rerender) N().renderPanel();
  }, 1000);
}
async function act(a, arg) {
  const K = NW.quest;
  if (a === "qoOpen") { N().sfx("click"); K.open(arg); N().renderPanel(); return; }
  if (a === "qoLogin") { N().openPanel("profil"); return; }
  if (a === "qoRetry") { N().renderPanel(); await K.refresh(); N().renderPanel(); return; }
  if (a === "qoClaim") { N().sfx("click"); const p = K.claim(arg); N().renderPanel(); await p; N().renderPanel(); }
}
function register() {
  N().registerPanel("questowner", { title: () => "Quest Owner", render, act, after });
  NW.quest.onChange(() => { if (N().currentPanel() === "questowner") N().renderPanel(); });
}
NW.questUI = { register, render };
})();
