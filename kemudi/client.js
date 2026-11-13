// NUSA ISLAND — UI Kemudi Kapal (klien). DIMUAT HANYA bila window.NUSA_KEMUDI === true (bawaan false → tidak diunduh; UI joystick + tombol lama tetap).
// Saat naik kapal: joystick & kolom tombol lama disembunyikan; muncul setir (kiri, kembali ke tengah) + tuas MAJU/NETRAL/MUNDUR (kanan), knot, arah, jangkar, Peta Laut, tujuan, muatan.
// Saat turun: UI lama kembali. Fisika/aturan kapal TIDAK berubah (menghasilkan vektor masukan yang sama dengan joystick). Tanpa server, tanpa hadiah.
(function () {
"use strict";
const NW = (window.NW = window.NW || {}), K = window.NusaKemudiCore; if (!K) return;
const $ = (id) => document.getElementById(id), N = () => window.Nusa;
const st = { on: false, deg: 0, gear: "NETRAL", drag: null, root: null, raf: 0, last: 0, key: "", host: null };
// "host" = sumber data & aksi UI ini. Bawaan: kapal tunggal (NW.boat). Kapal Rombongan memasang host sendiri (rombongan/client.js) HANYA untuk kapten.
// Host rombongan hanya menyatakan NIAT lewat protokol server; tidak ada posisi/kecepatan/hadiah yang ditentukan di sini.
const BOAT_HOST = {
  id: "boat", ok: () => !!(NW.boat && NW.boat.on),
  view() { const B = NW.boat.B, cg = NW.delivery && NW.delivery.cargoView ? NW.delivery.cargoView() : null, d = dest(); return { knots: K.knots(B.v), head: K.heading(NW.boat.dir8(B.a)), dest: d, destKey: d && d.name + "|" + Math.round((d.m || 0) / 5), cargo: cg, anchor: B.anchor, canFish: NW.boat.canFish(), steerOk: true, reverse: true, home: { icon: "🛟", label: "Dermaga", aria: "Ke Dermaga", show: true }, go: { show: false } }; },
  anchor: () => NW.boat.toggleAnchor(), fish: () => NW.boat.fish(), home: () => { N().sfx("click"); NW.boat.rescue(); }, go: () => {},
};
function build() {
  if (st.root) return;
  const r = document.createElement("div"); r.id = "kmRoot"; r.className = "hidden";
  r.innerHTML = `<div class="km-top" id="kmTop" aria-live="off"><b id="kmKnot">0 knot</b><span id="kmHead">Timur</span><span id="kmDest">Tujuan: —</span><span id="kmCargo">Muatan: —</span></div>
  <div class="km-btns" role="group" aria-label="Aksi kapal"><button type="button" id="kmAnchor" aria-label="Jangkar">⚓<small>Jangkar</small></button><button type="button" id="kmMap" aria-label="Peta Laut">🗺️<small>Peta Laut</small></button><button type="button" id="kmFish" aria-label="Memancing">🎣<small>Pancing</small></button><button type="button" id="kmHome" aria-label="Ke Dermaga">🛟<small>Dermaga</small></button></div>
  <div class="km-wheel" id="kmWheel" role="slider" aria-label="Setir kapal" aria-valuemin="-120" aria-valuemax="120" aria-valuenow="0" tabindex="0"><svg viewBox="-50 -50 100 100" aria-hidden="true"><g id="kmWheelG"><circle r="42" fill="#7a5230" stroke="#e0b84c" stroke-width="5"/><circle r="30" fill="none" stroke="#e0b84c" stroke-width="3"/><circle r="8" fill="#e0b84c"/><g stroke="#e0b84c" stroke-width="4" stroke-linecap="round"><path d="M0-30V-8M0 30V8M-30 0H-8M30 0H8M21-21 6-6M-21 21 6 6M21 21 6 6M-21-21-6-6"/></g><circle r="3.5" cy="-42" fill="#d14a3a"/></g></svg></div>
  <div class="km-lever" id="kmLever" role="radiogroup" aria-label="Tuas gas"><button type="button" data-g="MAJU" role="radio">MAJU</button><button type="button" data-g="NETRAL" role="radio" aria-checked="true" class="on">NETRAL</button><button type="button" data-g="MUNDUR" role="radio">MUNDUR</button></div>`;
  document.body.appendChild(r); st.root = r;
  const stop = (e) => e.stopPropagation();
  r.addEventListener("pointerdown", stop); r.addEventListener("touchstart", stop, { passive: true });
  const W = $("kmWheel");
  const ctr = () => { const b = W.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
  W.addEventListener("pointerdown", (e) => { e.preventDefault(); try { W.setPointerCapture(e.pointerId); } catch (x) {} const c = ctr(); st.drag = { id: e.pointerId, cx: c.x, cy: c.y }; st.deg = K.wheelDeg(st.deg, c.x, c.y, e.clientX, e.clientY); paintWheel(); });
  W.addEventListener("pointermove", (e) => { if (!st.drag || e.pointerId !== st.drag.id) return; st.deg = K.wheelDeg(st.deg, st.drag.cx, st.drag.cy, e.clientX, e.clientY); paintWheel(); });
  const up = (e) => { if (st.drag && e.pointerId === st.drag.id) st.drag = null; };
  W.addEventListener("pointerup", up); W.addEventListener("pointercancel", up); W.addEventListener("lostpointercapture", () => { st.drag = null; });
  W.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") st.deg = Math.max(-K.MAX_DEG, st.deg - 20); else if (e.key === "ArrowRight") st.deg = Math.min(K.MAX_DEG, st.deg + 20); else return; e.preventDefault(); paintWheel(); });
  $("kmLever").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { if (b.disabled || !st.host || !st.host.ok() || st.host.view().steerOk === false) return; setGear(b.dataset.g); }));
  const act = (id, fn) => $(id).addEventListener("click", (e) => { e.stopPropagation(); if (!st.host || !st.host.ok()) return; fn(); });
  act("kmAnchor", () => { st.host.anchor(); setGear("NETRAL"); paintTop(true); });
  act("kmMap", () => { N().sfx("click"); N().openPanel("seamap"); });
  act("kmFish", () => st.host.fish());
  act("kmHome", () => st.host.home());
}
function setGear(g) { st.gear = g; $("kmLever").querySelectorAll("button").forEach((b) => { const on = b.dataset.g === g; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); }); }
function paintWheel() { const g = $("kmWheelG"); if (g) g.setAttribute("transform", `rotate(${st.deg.toFixed(1)})`); const w = $("kmWheel"); if (w) w.setAttribute("aria-valuenow", String(Math.round(st.deg))); }
function dest() {
  const cg = NW.delivery && NW.delivery.cargoView && NW.delivery.cargoView(); const loaded = cg && cg.boxes && cg.boxes.some((b) => b && b.n > 0);
  if (loaded && NW.delivery.dest) return NW.delivery.dest();
  try { const t = NW.boat.rescueTarget(); if (!t.moor) return null; const B = NW.boat.B, here = NW.sea.toChart(B.area, B.x, B.y), d = NW.sea.toChart(t.area.id, t.moor.x, t.moor.y); return { name: t.moor.name, m: Math.hypot(d.x - here.x, d.y - here.y) * 5 }; } catch (e) { return null; }
}
function paintTop(force) {
  if (!st.host || !st.host.ok()) return; const V = st.host.view();
  const key = [V.knots, V.head, V.anchor, V.destKey || (V.dest && V.dest.name), V.status || "", JSON.stringify(V.cargo && V.cargo.boxes && V.cargo.boxes.map((b) => b.n + b.st)), V.canFish, V.steerOk, V.home && V.home.show, V.go && V.go.show, V.home && V.home.label, V.reverse].join("|");
  if (!force && key === st.key) return; st.key = key;
  $("kmKnot").textContent = `${V.knots} knot`; $("kmHead").textContent = "➤ " + V.head; $("kmDest").textContent = V.status || K.destText(V.dest); $("kmCargo").textContent = K.cargoText(V.cargo);
  const an = $("kmAnchor"); an.classList.toggle("on", !!V.anchor); an.innerHTML = V.anchor ? "⛵<small>Angkat</small>" : "⚓<small>Jangkar</small>"; an.setAttribute("aria-label", V.anchor ? "Angkat jangkar" : "Jangkar");
  an.classList.toggle("hidden", V.anchorShow === false);
  $("kmFish").classList.toggle("dim", !V.canFish); $("kmFish").classList.toggle("hidden", V.fishShow === false);
  const h = $("kmHome"); if (V.home) { h.innerHTML = `${V.home.icon}<small>${V.home.label}</small>`; h.setAttribute("aria-label", V.home.aria); h.classList.toggle("hidden", !V.home.show); }
  // tombol "Pulang" hanya ada di DOM saat dibutuhkan (Pelabuhan Kota, kapten rombongan): tombol tersembunyi 0×0 mengganggu ukuran target sentuh kapal tunggal
  let go = $("kmGo"); if (V.go && V.go.show) { if (!go) { go = document.createElement("button"); go.type = "button"; go.id = "kmGo"; go.setAttribute("aria-label", "Pulang ke Muara"); go.innerHTML = "🏠<small>Pulang</small>"; go.addEventListener("click", (e) => { e.stopPropagation(); if (st.host && st.host.ok()) st.host.go(); }); st.root.querySelector(".km-btns").appendChild(go); } } else if (go) go.remove();
  const rv = $("kmLever").querySelector('[data-g="MUNDUR"]'); rv.disabled = V.reverse === false; rv.setAttribute("aria-disabled", String(V.reverse === false)); rv.title = V.reverse === false ? "Kapal Rombongan belum punya gigi mundur" : "";
  st.root.classList.toggle("km-off", V.steerOk === false);
  if (V.steerOk === false || (V.anchor && V.neutralOnAnchor)) { if (st.gear !== "NETRAL") setGear("NETRAL"); }
}
function loop(t) {
  if (!st.on) { st.raf = 0; return; } const dt = Math.min(0.1, (t - (st.last || t)) / 1000); st.last = t;
  if (!st.drag && st.deg) { st.deg = K.recenter(st.deg, dt); paintWheel(); }
  paintTop(false); st.raf = requestAnimationFrame(loop);
}
function show(host) { build(); st.host = host || BOAT_HOST; st.key = ""; st.on = true; st.deg = 0; st.gear = "NETRAL"; setGear("NETRAL"); paintWheel(); st.root.classList.remove("hidden"); document.body.classList.add("kemudi-on"); paintTop(true); if (!st.raf) { st.last = 0; st.raf = requestAnimationFrame(loop); } }
function hide(id) { if (st.host && st.host.id !== (id || "boat")) return; st.host = null; st.key = ""; st.on = false; st.drag = null; st.deg = 0; st.gear = "NETRAL"; if (st.root) st.root.classList.add("hidden"); document.body.classList.remove("kemudi-on"); }
// masukan untuk NW.boat.update; null bila UI kemudi tidak aktif (joystick lama dipakai)
function input() { return st.on && st.host && st.host.id === "boat" ? K.input(st.deg, st.gear) : null; }
// keadaan setir/tuas untuk host lain (kapten rombongan): hanya dibaca; mengubahnya tidak menggerakkan apa pun sebelum host mengirim niat ke server
function state(id) { return st.on && st.host && st.host.id === id ? { steer: K.steerOf(st.deg), gear: st.gear, dragging: !!st.drag } : null; }
NW.kemudi = { show, hide, input, state, paint: (f) => paintTop(!!f), get on() { return st.on; }, get host() { return st.host ? st.host.id : null; }, BOAT_HOST, _st: st };
})();
