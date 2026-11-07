// Uji geometri pulau Samudra Follower V2 (tanpa peramban): spot/spawn/NPC bisa diinjak, air di depan spot, objek di darat, semua titik terjangkau, jembatan bisa dilewati.
const assert = require("assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = { console, Math, Uint8Array, Object, Array, Number, String, Set, Map, Date, performance: { now: () => 0 } }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../world/areas.js"), "utf8"), ctx);
const NW = ctx.NW; NW.coastTile = () => () => {};
vm.runInContext(fs.readFileSync(path.join(__dirname, "../sf2/area.js"), "utf8"), ctx);
const M = NW.SF2_MAP; const W = (x, y) => M.walkable(x, y); let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; } catch (e) { fail++; console.log("FAIL", n, "\n   ", e.message.split("\n")[0]); } };
t("area terdaftar (id sf2, loc samudra)", () => { const a = NW.areas.get("sf2"); assert.ok(a); assert.equal(a.loc || (a.def && a.def.loc) || "samudra", "samudra"); });
t("start, penjaga dermaga, papan: bisa diinjak", () => { assert.ok(W(M.START.x, M.START.y)); assert.ok(W(33.4, 30.3)); assert.ok(W(29.6, 29.1)); });
t("4 spot memancing: berdiri bisa diinjak, titik pulang bisa diinjak, air di depan", () => {
  const ahead = { dalam: [0, 1], karang: [-1, 0], danau: [0, -1], muara: [0, -1] };
  assert.deepStrictEqual(Object.keys(M.SPOTS).sort(), ["danau", "dalam", "karang", "muara"].sort());
  for (const [id, s] of Object.entries(M.SPOTS)) { assert.ok(W(s.x, s.y), id + " berdiri"); assert.ok(W(s.ret.x, s.ret.y), id + " ret"); const [dx, dy] = ahead[id]; assert.ok(!NW.isLandT(M.tileAt(s.x + dx * 1.5, s.y + dy * 1.5)), id + " air di depan"); } });
t("fishSpots memakai id spot yang sama dengan titik interaksi (world.startFishing(t.spot))", () => { for (const p of M.points.filter((p) => p.fish)) assert.ok(M.fishSpots.some((f) => f.id === p.spot), p.id); });
t("kapal di air; spawn kapal bisa diinjak", () => { assert.ok(!NW.isLandT(M.tileAt(M.BOAT.x, M.BOAT.y))); assert.ok(W(32, 33.2)); });
t("objek darat tidak berada di air", () => { const bad = M.objects.filter((o) => ["palm", "bush", "rock", "lamp", "sign", "bench", "crate", "flowers"].includes(o.kind) && !NW.isLandT(M.tileAt(o.x, o.y))); assert.equal(bad.length, 0); });
t("ada cukup pohon kelapa & daratan (pulau tropis)", () => { assert.ok(M.objects.filter((o) => o.kind === "palm").length >= 20); let land = 0; for (let y = 0; y < M.MH; y++) for (let x = 0; x < M.MW; x++) if (NW.isLandT(M.tiles[y * M.MW + x])) land++; assert.ok(land > 300, "land " + land); });
t("semua titik interaksi terjangkau dari start (BFS) + jembatan sungai bisa dilewati", () => {
  const S = 0.5, key = (x, y) => Math.round(x / S) + "," + Math.round(y / S), seen = new Set([key(M.START.x, M.START.y)]), q = [[M.START.x, M.START.y]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= M.MW || ny >= M.MH) continue; const k = key(nx, ny); if (seen.has(k) || !W(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } }
  for (const p of M.points) assert.ok(seen.has(key(Math.round(p.x / S) * S, Math.round(p.y / S) * S)), "tak terjangkau: " + p.id);
  assert.ok(seen.has(key(43.6, 21.0)), "tepi timur (Muara)"); assert.ok(seen.has(key(24.6, 21)), "tepi barat (Danau)"); });
console.log(`unit-sf2-map: ${pass} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0);
