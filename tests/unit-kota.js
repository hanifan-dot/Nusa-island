// Visual Kota Nusa (Ide 04): node tests/unit-kota.js — tata kota, lalu lintas, lampu, NPC, kepadatan, determinisme (tanpa DOM).
const assert = require("assert"), C = require("../kota/core.js");
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.message.split("\n")[0]); } };
const L = C.build(), TR = C.buildTraffic(L), NPC = C.buildNpcs(L), K = C.K;
const kindAt = (x, y) => (x < 0 || y < 0 || x >= C.MW || y >= C.MH ? K.BORDER : L.kind[(y | 0) * C.MW + (x | 0)]);
const okKind = (k) => k !== K.BORDER && k !== K.NONE;
// walkable seperti NW.areaKit.makeWalkable (9 titik uji r=0.22 + solid lingkaran/persegi)
function walkable(x, y, r = 0.22) {
  const pr = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * .7, r * .7], [-r * .7, r * .7], [r * .7, -r * .7], [-r * .7, -r * .7]];
  for (const [dx, dy] of pr) if (!okKind(kindAt(Math.floor(x + dx), Math.floor(y + dy)))) return false;
  for (const s of L.solids) { if (s.r !== undefined) { if (Math.hypot(x - s.x, y - s.y) < s.r + r * .8) return false; } else if (x > s.x0 - r * .8 && x < s.x1 + r * .8 && y > s.y0 - r * .8 && y < s.y1 + r * .8) return false; }
  return true;
}
t("lima kawasan ada: pelabuhan/industri, pasar-ruko, pusat kota, taman, permukiman", () => {
  const ids = L.buildings.map((b) => b.id), has = (re) => ids.some((i) => re.test(i));
  assert.ok(has(/gudang_ikan/) && has(/gudang_logistik/) && L.objects.some((o) => o.kind === "k_parked"), "pelabuhan");
  assert.ok(has(/pasar_gerbang/) && L.stalls.length >= 8 && has(/ruko_/) && has(/nusaphone/) && has(/warung/) && has(/bengkel/) && has(/ruko_s1/), "pasar & ruko");
  assert.ok(has(/kantor_nusa/) && has(/hotel/) && has(/balai_kota/) && L.lightNodes.length >= 8, "pusat kota");
  assert.ok(L.objects.some((o) => o.kind === "k_fountain") && L.benches.length >= 6 && L.trees.length >= 10 && L.kind.includes(K.TRACK) && L.kind.includes(K.BIKE), "taman");
  assert.ok(L.houses.length >= 10, "rumah " + L.houses.length);
});
t("rumah beragam (ukuran, lantai, pagar, beranda, jemuran) — tidak semua sama", () => {
  const sizes = new Set(L.houses.map((h) => (h.x1 - h.x0).toFixed(1) + "x" + (h.y1 - h.y0).toFixed(1))), floors = new Set(L.houses.map((h) => h.floors)), cols = new Set(L.houses.map((h) => h.wall + h.roof));
  assert.ok(sizes.size >= 6 && floors.size >= 2 && cols.size >= 5); assert.ok(L.houses.some((h) => h.fence) && L.houses.some((h) => h.porch) && L.houses.some((h) => h.laundry));
});
t("peta kota: bangunan berdiri di luar jalan; tak ada properti/solid di atas jalan raya", () => {
  for (const b of L.buildings) for (let y = Math.floor(b.y0); y < Math.ceil(b.y1); y++) for (let x = Math.floor(b.x0); x < Math.ceil(b.x1); x++) assert.notStrictEqual(kindAt(x, y), K.ROAD, b.id + " di jalan " + x + "," + y);
  for (const o of L.objects) if (o.x !== undefined && o.kind !== "k_light" && o.kind !== "k_ped" && o.kind !== "k_gate") assert.notStrictEqual(kindAt(o.x, o.y), K.ROAD, o.kind + " di jalan " + o.x + "," + o.y);
});
t("pintu setiap bangunan menghadap jalur jalan (titik depan pintu bisa dijalani)", () => { for (const b of L.buildings) { if (b.id === "pasar_gerbang" || b.id === "pos_gerbang") continue; assert.ok(walkable(b.door.x, b.door.y), "pintu tak bisa dijalani: " + b.id + " " + b.door.x.toFixed(2) + "," + b.door.y.toFixed(2)); } });
t("TIDAK ADA pemain terjebak: dari gerbang kota semua petak jalan/trotoar/plaza/pasar/taman/gang/lahan terjangkau (BFS 0,25)", () => {
  const S = 0.25, key = (x, y) => Math.round(x / S) + "," + Math.round(y / S), seen = new Set([key(37.5, 21)]), q = [[37.5, 21]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const nx = x + dx, ny = y + dy; if (nx < 37 || ny < 0 || nx >= C.MW || ny >= C.MH) continue; const k = key(nx, ny); if (seen.has(k)) continue; if (!walkable(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } }
  let miss = [], tot = 0;
  for (let y = 2; y < 46; y++) for (let x = 38; x < 90; x++) { const k = kindAt(x, y); if (![K.ROAD, K.WALK, K.PLAZA, K.MARKET, K.TRACK, K.BIKE, K.ALLEY, K.INDUS, K.LOT].includes(k)) continue; const cx = x + 0.5, cy = y + 0.5; if (!walkable(cx, cy)) continue; tot++; if (!seen.has(key(cx, cy))) miss.push([cx, cy]); }
  assert.ok(tot > 800, "terlalu sedikit petak " + tot); assert.strictEqual(miss.length, 0, "terjebak/terisolasi: " + JSON.stringify(miss.slice(0, 8)));
});
t("trotoar tidak tersumbat: hanya tiang/pohon/lampu menutup titik tengah (<20 %) dan setiap petak trotoar terjangkau dari gerbang", () => {
  let blocked = 0, walkTiles = 0; for (let y = 2; y < 46; y++) for (let x = 38; x < 90; x++) if (kindAt(x, y) === K.WALK) { walkTiles++; if (!walkable(x + 0.5, y + 0.5)) blocked++; }
  assert.ok(blocked / walkTiles < 0.2, "trotoar terhalang " + blocked + "/" + walkTiles);
});
t("gerbang kawasan di x=37 terbuka (koridor y 19–23) dan pagar menutup sisanya", () => { assert.ok(walkable(37.5, 21) && walkable(37.5, 19.6) && walkable(37.5, 22.4)); for (const y of [4, 10, 16, 25, 30, 40]) assert.ok(L.solids.some((s) => s.r === undefined && s.x0 <= 37 && s.x1 >= 37 && y > s.y0 && y < s.y1), "pagar hilang di y=" + y); assert.ok(!L.solids.some((s) => s.r === undefined && s.x0 <= 37 && s.x1 >= 37 && 21 > s.y0 && 21 < s.y1)); });
t("25 NPC kota terdaftar (id unik, skrip valid, gaya & dialog)", () => {
  assert.strictEqual(NPC.length, 25); assert.strictEqual(new Set(NPC.map((n) => n.id)).size, 25); for (const n of NPC) { assert.ok(n.lines && n.lines.length >= 1 && n.name, n.id); assert.ok(n._poly || n.kf.length >= 2, n.id + " tanpa keyframe"); }
  const jobs = new Set(NPC.map((n) => n.job)); for (const j of ["door", "shop", "stall", "sit", "chat", "run", "bike", "haul", "fix", "driver", "cross"]) assert.ok(jobs.has(j), "aktivitas hilang: " + j);
});
t("kepadatan NPC menurut jam game: siang 20–25, malam 5–8, pagi/sore antara", () => {
  const n = (h) => NPC.filter((x) => C.npcActive(x, h)).length;
  for (const h of [7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) assert.ok(n(h) >= 20 && n(h) <= 25, "jam " + h + ": " + n(h));
  for (const h of [22, 23, 0, 1, 2, 3, 4]) assert.ok(n(h) >= 5 && n(h) <= 8, "jam " + h + ": " + n(h));
  assert.ok(n(18) < n(12) && n(18) > n(22));
});
t("kepadatan kendaraan: siang penuh, malam jauh lebih sedikit; deterministik per periode", () => {
  const cnt = (h) => { let c = 0; for (let p = 0; p < 40; p++) for (let i = 0; i < 24; i++) if (C.vehicleOn(null, i, p * 150, h)) c++; return c / 40; };
  assert.ok(cnt(12) >= 23.9, "siang " + cnt(12)); assert.ok(cnt(23) < cnt(12) * 0.3, "malam " + cnt(23)); assert.ok(cnt(18) < cnt(12) && cnt(18) > cnt(23));
  assert.strictEqual(C.vehicleOn(null, 3, 1234, 12), C.vehicleOn(null, 3, 1234, 12));
});
t("armada: 24 kendaraan jalan raya, semua jenis ada (mobil pribadi, boks, pendingin, tangki, truk sawit, pengangkut motor, motor)", () => {
  assert.strictEqual(TR.V.length, 24); const ty = new Set(TR.defs.map((d) => d.type)); for (const x of ["mobil", "boks", "pendingin", "tangki", "sawit", "angkutmotor", "motor"]) assert.ok(ty.has(x), x);
  assert.ok(Object.keys(C.VT).includes("sepeda") && NPC.some((n) => n.job === "bike") && NPC.some((n) => n.job === "run"));
});
t("kendaraan mengikuti rute tetap dan selesai dalam periode (tidak terpotong di tengah jalan)", () => {
  TR.V.forEach((u, i) => { assert.ok(u.done, TR.defs[i].id + " tak selesai"); let last = -1; for (let k = 0; k <= TR.steps; k++) if (!Number.isNaN(u.ser[k])) last = k; assert.ok(last * TR.DT < C.PERIOD - 0.5, TR.defs[i].id + " selesai " + last * TR.DT); });
  for (let s = 0; s < C.PERIOD; s += 0.7) for (let i = 0; i < 24; i++) { const v = C.vehicleAt(TR, i, s); if (!v.on) continue; let best = 9; const pl = TR.polys[TR.defs[i].route]; for (let k = 0; k < pl.p.length - 1; k++) { const a = pl.p[k], b = pl.p[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((v.x - a[0]) * dx + (v.y - a[1]) * dy) / l2)); best = Math.min(best, Math.hypot(v.x - (a[0] + dx * u), v.y - (a[1] + dy * u))); } assert.ok(best < 0.02, "menyimpang dari rute " + best); }
});
t("lampu lalu lintas: siklus 30 dtk, tak pernah hijau bersamaan EW & NS, jendela pejalan ≥ 5 dtk, kuning ada", () => {
  let ped = [], g2 = 0; for (let s = 0; s < 30; s += 0.05) { const p = C.lightPhase(s); if ((p.ew === "G" || p.ew === "Y") && (p.ns === "G" || p.ns === "Y")) g2++; if (p.ped) ped.push(s); }
  assert.strictEqual(g2, 0); assert.ok(ped.length * 0.05 >= 10.8, "pejalan total " + ped.length * 0.05); assert.strictEqual(C.lightPhase(8.5).ew, "Y"); assert.strictEqual(C.lightPhase(23.5).ns, "Y"); assert.strictEqual(C.lightPhase(3).ns, "R"); assert.strictEqual(C.lightPhase(19).ew, "R");
  assert.deepStrictEqual(C.lightPhase(7), C.lightPhase(7 + 30)); assert.strictEqual(C.PERIOD % C.CYCLE, 0);
});
t("kendaraan BERHENTI di lampu merah: tak ada yang melewati garis henti saat sumbunya sudah merah >0,4 dtk (tidak menerobos), dan banyak yang memang berhenti", () => {
  const red = (st, t) => { const ph = C.lightPhase(t); const r = st.ped ? ph.ped : (st.axis === "ew" ? ph.ew : ph.ns); return r === true || r === "R"; };
  let cross = 0, viol = 0, stopped = 0;
  TR.V.forEach((u, i) => { for (const st of u.stops) { const sStop = st.sIn - st.margin - u.t.L / 2; let prev = null, minv = 9, hold = false;
    for (let k = 0; k <= TR.steps; k++) { const sv = u.ser[k]; if (Number.isNaN(sv)) continue; const tt = k * TR.DT;
      if (prev !== null && prev <= sStop && sv > sStop) { cross++; const v = (sv - prev) / TR.DT; if (red(st, tt) && red(st, tt - 0.4) && v > 0.8) { viol++; console.log("   menerobos", TR.defs[i].id, st.n, tt.toFixed(1)); } }
      if (sv > sStop - 0.6 && sv < sStop + 0.05 && (sv - (prev === null ? sv : prev)) / TR.DT < 0.05 && red(st, tt)) hold = true; prev = sv; }
    if (hold) stopped++; } });
  assert.ok(cross > 60 && stopped >= 8, "persimpangan " + cross + ", berhenti " + stopped); assert.strictEqual(viol, 0, "menerobos " + viol);
});
t("kendaraan tidak saling bertumpuk (jarak sejalur ≥ ½ panjang+celah) dan melambat di persimpangan", () => {
  let worst = 9;
  for (let s = 0; s < C.PERIOD; s += 0.4) { const v = []; for (let i = 0; i < 24; i++) { const q = C.vehicleAt(TR, i, s); if (q.on) v.push(q); } for (let a = 0; a < v.length; a++) for (let b = a + 1; b < v.length; b++) { if (v[a].fx * v[b].fx + v[a].fy * v[b].fy < 0.9) continue; const dx = v[b].x - v[a].x, dy = v[b].y - v[a].y, lat = Math.abs(-dx * v[a].fy + dy * v[a].fx), lon = Math.abs(dx * v[a].fx + dy * v[a].fy); if (lat > 0.5) continue; worst = Math.min(worst, lon - (v[a].L + v[b].L) / 2); } }
  assert.ok(worst > 0.15, "celah terkecil " + worst.toFixed(2));
  const slow = []; for (let s = 0; s < C.PERIOD; s += 0.3) for (let i = 0; i < 24; i++) { const q = C.vehicleAt(TR, i, s); if (q.on && L.lightNodes.some((n) => Math.hypot(q.x - n.cx, q.y - n.cy) < 1.2)) slow.push(q.v / C.VT[q.type].v); } assert.ok(slow.length > 20 && slow.reduce((a, b) => a + b, 0) / slow.length < 0.8, "tak melambat di persimpangan");
});
t("pejalan menyeberang HANYA saat jendela pejalan terbuka (kendaraan semua berhenti) & tak pernah di kotak persimpangan saat hijau", () => {
  const nodes = L.lightNodes.concat([L.PELICAN]); let seen = 0;
  for (const n of NPC) for (let s = 0; s < 450; s += 0.25) { const p = C.npcAt(n, s); if (p.alpha < 0.5) continue; for (const nd of nodes) if (p.x > nd.x0 + 0.05 && p.x < nd.x1 - 0.05 && p.y > nd.y0 + 0.05 && p.y < nd.y1 - 0.05) { seen++; assert.ok(C.lightPhase(s).ped, n.id + " di jalan saat lampu kendaraan hijau t=" + s); } }
  assert.ok(seen > 10, "tak ada penyeberangan terukur " + seen);
  for (const n of NPC.filter((x) => x.job === "cross" || x.job === "shop")) { let waited = 0; for (let s = 0; s < 150; s += 0.25) if (C.npcAt(n, s).mode === 5) waited++; assert.ok(waited >= 2, n.id + " tak menunggu"); }
});
t("pejalan menyeberang bersama kendaraan: saat pejalan di zebra, tidak ada kendaraan melaju di kotak itu", () => {
  const nodes = L.lightNodes.concat([L.PELICAN]);
  for (const n of NPC.filter((x) => x.job === "cross" || x.job === "shop")) for (let s = 0; s < 150; s += 0.25) { const p = C.npcAt(n, s); if (p.alpha < 0.5) continue; for (const nd of nodes) if (p.x > nd.x0 && p.x < nd.x1 && p.y > nd.y0 && p.y < nd.y1) for (let i = 0; i < 24; i++) { const v = C.vehicleAt(TR, i, s); if (v.on && v.v > 0.4 && Math.hypot(v.x - p.x, v.y - p.y) < 1.4) assert.fail(n.id + " dekat kendaraan bergerak t=" + s + " v=" + v.id); } }
});
t("NPC tidak berdiri di dalam bangunan/pohon/air mancur (kecuali duduk di bangku & muncul-hilang di pintu)", () => {
  for (const n of NPC) { if (n.job === "sit") continue; for (let s = 0; s < 150; s += 0.5) { const p = C.npcAt(n, s); if (p.alpha < 0.5) continue; for (const so of L.solids) { const inside = so.r !== undefined ? Math.hypot(p.x - so.x, p.y - so.y) < so.r * 0.7 : p.x > so.x0 && p.x < so.x1 && p.y > so.y0 && p.y < so.y1; assert.ok(!inside, n.id + " di dalam solid t=" + s + " @" + p.x.toFixed(2) + "," + p.y.toFixed(2)); } } }
});
t("NPC muncul/hilang di pintu (alpha 0→1), bukan lompat: pegawai berskrip pintu", () => { for (const n of NPC.filter((x) => x.job === "door")) { let mn = 1, mx = 0, jump = 0, prev = null; for (let s = 0; s < 150; s += 0.1) { const a = C.npcAt(n, s).alpha; mn = Math.min(mn, a); mx = Math.max(mx, a); if (prev !== null && Math.abs(a - prev) > 0.5) jump++; prev = a; } assert.ok(mn === 0 && mx === 1 && jump === 0, n.id + " " + mn + mx + jump); } });
t("deterministik: dua pembangunan terpisah menghasilkan posisi NPC & kendaraan identik (semua pemain melihat jadwal sama)", () => {
  const L2 = C.build(), TR2 = C.buildTraffic(L2), N2 = C.buildNpcs(L2);
  for (const s of [3, 41.5, 77.7, 120, 149.9, 150 * 7 + 31]) { for (let i = 0; i < 24; i++) assert.deepStrictEqual(C.vehicleAt(TR, i, s), C.vehicleAt(TR2, i, s)); NPC.forEach((n, j) => assert.deepStrictEqual(C.npcAt(n, s), C.npcAt(N2[j], s))); }
});
t("posisi lokal murni fungsi waktu: tidak ada tulis ke Firestore/D1 (kota/* tidak memuat panggilan jaringan)", () => {
  const fs = require("fs"); for (const f of ["core.js", "art.js", "client.js"]) { const s = fs.readFileSync(__dirname + "/../kota/" + f, "utf8"); assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|firestore|\.collection\(|NW\.mp\.send|NW\.cloud\.call/i.test(s.replace(/\/\/.*$/gm, "")), f + " memuat akses jaringan"); }
});
t("tanpa ekonomi/hadiah/quest/beli di kota (tidak ada kata kunci koin/hadiah/beli di kode)", () => {
  const fs = require("fs"); for (const f of ["core.js", "art.js", "client.js"]) { const s = fs.readFileSync(__dirname + "/../kota/" + f, "utf8").replace(/\/\/.*$/gm, ""); assert.ok(!/addCoins|S\.money|\.money\s*[+\-]=|reward|adv\.mark|NW\.shop|buy\(/i.test(s), f + " menyentuh ekonomi"); }
});
console.log(`unit-kota: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
