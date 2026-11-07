// Ekspansi Muara ~40% (Tanjung Lampu): node tests/unit-map-ext.js
const assert = require("assert"), fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, ".."), FIX = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/muara-map-v1.json"), "utf8"));
const ctx = { console, Math, Uint8Array, Object, Array, Number, String, Set, Map, Date, performance: { now: () => 0 } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ["world/areas.js", "world/map.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
const NW = ctx.NW, M = NW.MUARA_MAP, r = (v) => Math.round(v * 1000) / 1000;
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.message.split("\n")[0]); } };
const landCount = () => { let n = 0; for (let y = 0; y < M.MH; y++) for (let x = 0; x < M.MW; x++) if (NW.isLandT(M.tiles[y * M.MW + x])) n++; return n; };
t("luas daratan bertambah ~40% (36–44%) dibanding peta lama", () => { const k = landCount() / FIX.land - 1; assert.ok(k > 0.36 && k < 0.44, "pertambahan " + (k * 100).toFixed(1) + "%"); });
t("peta hanya diperpanjang ke selatan (MW sama, MH lebih besar); indeks tile lama tidak berubah", () => { assert.equal(M.MW, FIX.MW); assert.ok(M.MH > FIX.MH && M.MH <= 56); assert.equal(M.tiles.length, M.MW * M.MH); });
t("semua bangunan lama tetap di koordinat semula", () => { for (const [id, x0, y0, x1, y1] of FIX.buildings) { const b = M.buildings.find((q) => q.id === id); assert.ok(b, id); assert.deepStrictEqual([b.x0, b.y0, b.x1, b.y1], [x0, y0, x1, y1], id); } });
t("semua titik interaksi lama (rumah, NPC, pasar, papan misi, dermaga, kapal, portal Rumahku) tetap di tempatnya", () => { for (const [id, x, y] of FIX.points) { const p = M.points.find((q) => q.id === id); assert.ok(p, id); assert.deepStrictEqual([r(p.x), r(p.y)], [x, y], id); } });
t("benda lama (pohon, lampu, papan, dll.) tidak bergeser; hanya batu-laut di jalur penghubung yang boleh hilang", () => {
  const now = new Set(M.objects.map((o) => o.kind + "|" + r(o.x) + "|" + r(o.y))); let lost = 0;
  for (const [k, x, y] of FIX.objects) if (!now.has(k + "|" + x + "|" + y)) { assert.equal(k, "searock", "hilang: " + k + " " + x + "," + y); lost++; } assert.ok(lost <= 2, "hilang " + lost); });
t("dermaga & titik awal tidak berubah dan bisa dijalani", () => { assert.equal(JSON.stringify(M.START), JSON.stringify(FIX.start)); assert.equal(JSON.stringify([M.DOCK.x0, M.DOCK.x1, M.DOCK.y0, M.DOCK.y1]), JSON.stringify([FIX.dock.x0, FIX.dock.x1, FIX.dock.y0, FIX.dock.y1])); assert.ok(M.walkable(M.START.x, M.START.y)); });
t("tak ada benda atau titik interaksi di kawasan baru (y>32) berdiri di air", () => { for (const o of M.objects) if (o.y > 32 && ["palm", "tree", "bush", "rock", "bench", "lamp", "sign", "barrel", "crate", "bamboo"].includes(o.kind)) assert.ok(NW.isLandT(M.tileAt(o.x, o.y)), o.kind + " " + o.x.toFixed(1) + "," + o.y.toFixed(1)); for (const p of M.points) if (p.y > 32) assert.ok(NW.isLandT(M.tileAt(p.x, p.y)), p.id); });
t("kawasan baru terhubung: BFS dari titik awal ke setiap titik baru & ke ujung selatan", () => {
  const S = 0.5, key = (x, y) => Math.round(x / S) + "," + Math.round(y / S), seen = new Set([key(M.START.x, M.START.y)]), q = [[M.START.x, M.START.y]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= M.MW || ny >= M.MH) continue; const k = key(nx, ny); if (!seen.has(k) && M.walkable(nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
  const reach = (x, y) => seen.has(key(x, y)); for (const [x, y] of [[23.5, 40.75], [18.5, 44.5], [13.5, 40.5], [19.5, 31.5]]) assert.ok(reach(x, y), "tak terjangkau " + x + "," + y);
  const sign = M.points.find((p) => p.sign && p.sign.title === "Tanjung Lampu"); assert.ok(sign && reach(sign.x, sign.y)); });
t("tapak NUSA STYLE (dipasang style/style.js) berdiri di daratan & titik pintunya bisa dijalani", () => { const B = { x0: 21.2, y0: 37.0, x1: 25.8, y1: 39.6 }; for (let y = Math.floor(B.y0); y <= Math.floor(B.y1); y++) for (let x = Math.floor(B.x0); x <= Math.floor(B.x1); x++) assert.ok(NW.isLandT(M.tileAt(x, y)), x + "," + y); assert.ok(M.walkable(23.5, 40.75)); });
t("garis pantai (buih) mencakup pantai baru", () => { assert.ok(M.shoreEdges.length > 0); });
t("islandD (warna kedalaman laut) mengenali daratan baru", () => { assert.ok(M.islandD(19.5, 41.2) < 0.8); assert.ok(M.islandD(19.5, 49) > 1); });
// Multiplayer: server menjepit posisi ke ukuran peta — harus mencakup kawasan baru
const P = require("../mp/proto.js"); t("protokol multiplayer: MAP_H menutup peta baru", () => { assert.equal(P.MAP_W, M.MW); assert.equal(P.MAP_H, M.MH); });
console.log(`unit-map-ext: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
