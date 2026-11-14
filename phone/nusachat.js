// NUSA ISLAND — NusaChat (Ide 07): tampilan ponsel untuk chat multiplayer YANG SUDAH ADA. Tidak ada saluran baru: pesan dikirim lewat NW.mp.sendChat (server membersihkan teks & membatasi laju).
// Percakapan = ruang yang sedang aktif (Rumahku atau area dunia); pesan ditandai ruangnya saat diterima → tidak bocor antar-ruang. Riwayat hanya 30 pesan terakhir di memori (tidak disimpan ke perangkat).
// Blokir = di perangkat ini saja (menyembunyikan pesan pemain itu di NusaChat). Pesan pribadi (DM) BELUM ada: butuh kontrak server yang aman → tahap berikutnya.
(function () {
"use strict";
const NW = window.NW; if (!NW || !NW.phone) return;
const BK = "nusa_chat_block_v1", MAXB = 50, COOL = 1500;
const bGet = () => { try { const v = JSON.parse(localStorage.getItem(BK) || "[]"); return Array.isArray(v) ? v.filter((b) => b && typeof b.id === "string" && b.id).slice(0, MAXB).map((b) => ({ id: b.id.slice(0, 40), name: String(b.name || "").slice(0, 16) })) : []; } catch (e) { return []; } };
const bSet = (a) => { try { localStorage.setItem(BK, JSON.stringify(a)); } catch (e) { /* abaikan */ } };
const hhmm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const label = (sc) => (!sc ? "—" : sc.startsWith("h:") ? "Rumahku" : sc === "a:selat" ? "Kota Nusa (selat)" : "Area Muara");

function mount(body, x) {
  const esc = x.esc; let block = bGet(), hideSys = false, sig = "", lastSend = 0, note = "", view = "chat", gone = false, sure = "";
  body.innerHTML = '<div class="nc"><div class="nc-top"></div><div class="nc-log" role="log" aria-live="polite" tabindex="0"></div><form class="nc-f"><input type="text" name="t" maxlength="80" autocomplete="off" aria-label="Pesan"><button type="submit" class="pg-cta">Kirim</button></form><div class="nc-note" role="status"></div><div class="nc-misc"></div></div>';
  const $ = (s) => body.querySelector(s), top = $(".nc-top"), log = $(".nc-log"), inp = $("input"), btn = $(".nc-f button"), nt = $(".nc-note"), misc = $(".nc-misc");
  const mpv = () => { try { return NW.mp && NW.mp.view ? NW.mp.view() : null; } catch (e) { return null; } };
  const can = (v) => !!v && v.online === true && v.prefs && v.prefs.chat !== false;
  function paint(force) {
    if (gone) return; const v = mpv(), sc = NW.mp && NW.mp.scope ? NW.mp.scope() : "", rows = NW.mp && NW.mp.chatLog ? NW.mp.chatLog(sc) : [];
    const ids = new Set(block.map((b) => b.id)), list = rows.filter((r) => !(r.id && ids.has(r.id)) && !(hideSys && r.name === "Sistem"));
    const s = [sc, list.length, list.length ? list[list.length - 1].t : 0, v && v.online, v && v.state, block.length, hideSys, view, note, sure].join("|"); if (!force && s === sig) return; sig = s;
    const ok = can(v), kicked = v && v.state === "kicked";
    top.innerHTML = `<b>${esc(label(sc))}</b><small>${ok ? "Tersambung" : kicked ? "Kamu dikeluarkan dari ruang ini" : "Tidak tersambung"}</small>`;
    if (view === "block") { log.classList.add("hidden"); body.querySelector(".nc-f").classList.add("hidden"); misc.innerHTML = `<h4>Pemain yang diblokir (di perangkat ini)</h4>${block.length ? block.map((b) => `<div class="nc-b"><span>${esc(b.name || "Pemain")}</span><button type="button" class="pg-sm" data-unb="${esc(b.id)}">Buka blokir</button></div>`).join("") : '<p class="nph-hint">Belum ada yang diblokir.</p>'}<button type="button" class="pg-cta alt" data-back="1">Kembali ke obrolan</button>`; return; }
    log.classList.remove("hidden"); body.querySelector(".nc-f").classList.remove("hidden");
    log.innerHTML = kicked ? '<p class="nph-hint">Kamu dikeluarkan oleh pemilik rumah. Percakapan Rumahku ini ditutup dan tidak ditampilkan lagi.</p>' : list.length ? list.map((r) => `<div class="nc-m${r.mine ? " me" : ""}${r.name === "Sistem" ? " sys" : ""}"><div><b>${esc(r.mine ? "Kamu" : r.name)}</b> <small>${esc(hhmm(r.t))}</small>${!r.mine && r.id ? `<button type="button" class="nc-x" data-blk="${esc(r.id)}" data-nm="${esc(r.name)}" aria-label="Blokir ${esc(r.name)}">${sure === r.id ? "Yakin blokir?" : "⋯"}</button>` : ""}</div><p>${esc(r.text)}</p></div>`).join("") : `<p class="nph-hint">${ok ? "Belum ada obrolan di ruang ini. Sapa warga lain!" : "Hubungkan multiplayer untuk mengobrol."}</p>`;
    inp.disabled = !ok || !!kicked; btn.disabled = !ok || !!kicked; inp.placeholder = ok ? "Tulis pesan (maks 80 huruf)…" : kicked ? "Percakapan ditutup" : v && v.prefs && v.prefs.chat === false ? "Obrolan dimatikan di pengaturan multiplayer" : "Tidak tersambung";
    nt.textContent = note;
    misc.innerHTML = `<label class="nc-chk"><input type="checkbox" data-hs="1" ${hideSys ? "checked" : ""}> Sembunyikan pesan Sistem</label><button type="button" class="pg-sm" data-man="1">Diblokir (${block.length})</button><p class="nph-hint">Teks dibersihkan & dibatasi laju oleh server: kata kasar, tautan, nomor & email disamarkan. Blokir hanya berlaku di NusaChat pada perangkat ini. Rombongan kapal memakai chat area yang sama. Pesan pribadi (DM) belum tersedia.</p>`;
    log.scrollTop = log.scrollHeight;
  }
  body.addEventListener("submit", (e) => {
    e.preventDefault(); const t = inp.value.trim(); if (!t || inp.disabled) return; const n = Date.now();
    if (n - lastSend < COOL) { note = "Pelan-pelan ya, jangan terlalu cepat."; paint(true); return; }
    lastSend = n; note = ""; let r = false; try { r = NW.mp.sendChat(t); } catch (er) { r = false; }
    if (r === false) note = "Pesan tidak terkirim (tidak tersambung)."; else inp.value = ""; paint(true);
  });
  body.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (b && b.disabled) return; if (b) x.N().sfx && x.N().sfx("click");
    if (b && b.dataset.blk) { if (sure !== b.dataset.blk) { sure = b.dataset.blk; paint(true); setTimeout(() => { if (sure === b.dataset.blk) { sure = ""; paint(true); } }, 3000); return; } if (!block.some((q) => q.id === b.dataset.blk) && block.length < MAXB) block.push({ id: b.dataset.blk, name: b.dataset.nm || "" }); bSet(block); sure = ""; paint(true); }
    else if (b && b.dataset.unb) { block = block.filter((q) => q.id !== b.dataset.unb); bSet(block); paint(true); }
    else if (b && b.dataset.man) { view = "block"; paint(true); } else if (b && b.dataset.back) { view = "chat"; paint(true); }
    else if (e.target.dataset && e.target.dataset.hs) { hideSys = !!e.target.checked; paint(true); }
  });
  paint(true); const iv = setInterval(() => paint(false), 600);
  return { close() { gone = true; clearInterval(iv); }, update() { /* tetap */ }, _block: () => block.slice() };
}
NW.phone.registerApp("nusachat", { mount });
})();
