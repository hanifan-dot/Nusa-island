// =========================================================
//  NUSA ISLAND — REGU KOPDES: 1 pemimpin + 5 pegawai (karakter ORISINAL; bukan tokoh nyata). Hanya bila NUSA_KOPDES === true.
//  Siklus (jam dinding, sama untuk semua pemain; sepenuhnya di klien, tanpa jaringan/server):
//   1) pemimpin & 5 pegawai berbaris dari dermaga ke depan Kopdes; 2) pemimpin memberi perintah; 3) pegawai bolak-balik memikul
//   peti persediaan dari tumpukan ke pintu samping Kopdes; 4) setelah SELESAI pemimpin memberi aba-aba lalu pergi ke dermaga dan HILANG;
//   5) 5 pegawai berdiri tegap rapi sebaris di depan Kopdes sampai siklus berikutnya. Gambar memakai NW.drawCharacter (ringan, tanpa aset).
// =========================================================
(() => {
"use strict";
const NW = (window.NW = window.NW || {});
if (!NW.kopdes) return;
const CYCLE = 210, SPEED = 1.7, N = 5, TRIPS = 3;
const DOCK = [31.4, 29.7], STACK = [32.3, 28.7], BAY = [38.6, 26.75], POST = [36.4, 29.5];
const ROW = (i) => [34.7 + i * 0.82, 27.65];
const STYLE_STAFF = [
  { skin: "#c68b5e", hair: "#2a1d14" }, { skin: "#b07b52", hair: "#1c1410" }, { skin: "#d8a074", hair: "#3a2a1c" }, { skin: "#a9744a", hair: "#241a12" }, { skin: "#c28a5a", hair: "#30221a" },
].map((o) => Object.assign({ shirt: "#c4262e", pants: "#2b3a44", hat: "cap", hatCol: "#c4262e", collar: "#fff7e8" }, o));
const STYLE_LEAD = { shirt: "#5a6b3a", pants: "#39422a", skin: "#a87a50", hair: "#1e1611", hat: "baret", hatCol: "#8a1f2a", sash: "#c9a23b", sashLine: "#f0d070", collar: "#d8d2a8" };

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function build() {
  const staff = [], picks = []; let tAllDone = 0;
  for (let i = 0; i < N; i++) {
    const w = [], t0 = 1.0 + i * 0.7; let t = t0, p = DOCK;
    const go = (to, extra) => { t += dist(p, to) / SPEED; p = to; w.push(Object.assign({ t, x: to[0], y: to[1] }, extra || {})); };
    const stay = (d, extra) => { t += d; w.push(Object.assign({ t, x: p[0], y: p[1] }, extra || {})); };
    w.push({ t: t0, x: DOCK[0], y: DOCK[1] });
    go(ROW(i)); const arrive = Math.max(t, 9.5 + i * 0.4); t = arrive; w.push({ t, x: p[0], y: p[1], dir: 2 });
    t = 17 + i * 1.1; w.push({ t, x: p[0], y: p[1], dir: 2 });                       // tegap menunggu perintah, lalu mulai bekerja bergiliran
    for (let k = 0; k < TRIPS; k++) {
      go(STACK); stay(0.9, { dir: 1 }); picks.push(t); w[w.length - 1].prop = "crate";
      go(BAY, { prop: "crate" }); stay(1.2, { hide: true, prop: null });
    }
    go(ROW(i)); stay(0.5, { dir: 2 }); tAllDone = Math.max(tAllDone, t);
    staff.push(w);
  }
  const tLeave = tAllDone + 4, lead = [], speak = [];
  let t = 0, p = DOCK; const go = (to) => { t += dist(p, to) / SPEED; p = to; lead.push({ t, x: to[0], y: to[1] }); };
  lead.push({ t: 0, x: DOCK[0], y: DOCK[1] }); go(POST); lead.push({ t: t + 0.01, x: POST[0], y: POST[1], dir: 6 });
  lead.push({ t: tLeave, x: POST[0], y: POST[1], dir: 6 }); t = tLeave; go(DOCK); lead[lead.length - 1].hide = true;
  speak.push([11, 16, "Pasukan! Angkut barang persediaan ke dalam Kopdes!"], [26, 30, "Cepat, jangan ada yang menganggur!"], [40, 44, "Hati-hati, petinya jangan jatuh!"], [tLeave - 4.5, tLeave - 0.3, "Selesai! Kembali ke barisan!"]);
  return { staff, lead, picks: picks.sort((a, b) => a - b), tLeave, speak, say: [[17.2, 19.5, "Siap, laksanakan!"]] };
}
const PLAN = build();

function dirOf(dx, dy) { const sx = dx - dy, sy = (dx + dy) / 2, a = Math.atan2(sy, sx); return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }
function sample(w, tc, tw, last) {
  if (tc < w[0].t) return { hide: true };
  const E = w[w.length - 1];
  if (tc >= E.t) return { x: E.x, y: E.y, dir: E.dir ?? 2, moving: false, hide: !!E.hide, prop: E.prop || null };
  let k = 0; while (k < w.length - 2 && tc >= w[k + 1].t) k++;
  const a = w[k], b = w[k + 1], d = Math.hypot(b.x - a.x, b.y - a.y), u = b.t > a.t ? (tc - a.t) / (b.t - a.t) : 1;
  if (d < 0.01) return { x: a.x, y: a.y, dir: b.dir ?? a.dir ?? last.dir ?? 2, moving: false, hide: !!(a.hide || b.hide), prop: b.prop !== undefined ? b.prop : a.prop || null };
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, dir: dirOf(b.x - a.x, b.y - a.y), moving: true, hide: false, prop: a.prop || null };
}
const mk = (style) => ({ x: 0, y: 0, dir: 2, walk: 0, moving: false, style, rod: 0, seed: 1 + Math.random() * 6, prop: null });
const chars = { lead: mk(STYLE_LEAD), staff: STYLE_STAFF.map(mk) };
let clock = () => (Date.now() / 1000) % CYCLE;
function bubble(c, p, text) {
  c.save(); c.font = "bold 8px system-ui,sans-serif"; const w = c.measureText(text).width + 12, x = p.x - w / 2, y = p.y - 62;
  c.fillStyle = "rgba(255,252,240,.96)"; c.strokeStyle = "rgba(60,40,20,.7)"; c.lineWidth = 1;
  c.beginPath(); c.roundRect ? c.roundRect(x, y, w, 15, 6) : c.rect(x, y, w, 15); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(p.x - 3, y + 15); c.lineTo(p.x, y + 20); c.lineTo(p.x + 3, y + 15); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#3a2410"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, p.x, y + 7.8); c.restore();
}
function remainingCrates(tc) { let n = 0; for (const t of PLAN.picks) if (tc >= t) n++; return N * TRIPS - n; }
function drawStack(c, tc) {
  const n = Math.min(8, Math.ceil(remainingCrates(tc) * 8 / (N * TRIPS))), b = NW.P(STACK[0] - 0.55, STACK[1] + 0.25, NW.groundZ ? NW.groundZ(STACK[0], STACK[1]) : NW.LIFT);
  const sp = [[0, 0, 0], [13, 6, 0], [-13, 6, 0], [6, 3, 9], [-7, 3, 9], [0, 7, 9], [13, 6, 9], [0, 0, 18]];
  for (let i = 0; i < n; i++) { const [dx, dy, dz] = sp[i], x = b.x + dx, y = b.y + dy - dz; c.fillStyle = "#c79a5c"; c.fillRect(x - 6, y - 9, 12, 9); c.strokeStyle = "#7a5530"; c.lineWidth = 0.9; c.strokeRect(x - 6, y - 9, 12, 9); c.fillStyle = "#c4262e"; c.fillRect(x - 1.5, y - 9, 3, 9); }
}
function layer(t) {
  if (window.NUSA_KOPDES !== true) return [];
  const tc = clock(), items = [], gzf = (x, y) => (NW.groundZ ? NW.groundZ(x, y) : NW.LIFT);
  items.push({ d: STACK[0] + STACK[1] + 0.1, draw: (c) => drawStack(c, tc) });
  const put = (ch, s, say, speaking) => {
    if (s.hide) return; Object.assign(ch, { x: s.x, y: s.y, dir: s.dir ?? ch.dir, moving: !!s.moving, prop: s.prop || null }); if (s.moving) ch.walk = t * 10;
    items.push({ d: s.x + s.y, draw: (c) => { NW.drawCharacter(c, ch, t); if (say) bubble(c, NW.P(s.x, s.y, gzf(s.x, s.y)), say); } });
  };
  const ls = tc < PLAN.lead[0].t ? { hide: true } : sample(PLAN.lead, tc, t, chars.lead), say = (PLAN.speak.find((q) => tc >= q[0] && tc < q[1]) || [])[2];
  put(chars.lead, ls, say);
  for (let i = 0; i < N; i++) { const s = sample(PLAN.staff[i], tc, t, chars.staff[i]); put(chars.staff[i], s, i === 0 && tc >= PLAN.say[0][0] && tc < PLAN.say[0][1] ? PLAN.say[0][2] : null); }
  return items;
}
NW.kopdesCrew = { layer, PLAN, CYCLE, ROW, STACK, BAY, POST, DOCK, setClock: (f) => { clock = f || (() => (Date.now() / 1000) % CYCLE); }, at: (tc) => ({ lead: sample(PLAN.lead, tc, 0, chars.lead), staff: PLAN.staff.map((w, i) => sample(w, tc, 0, chars.staff[i])), crates: remainingCrates(tc) }) };
})();
