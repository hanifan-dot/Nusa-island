// Tes pajangan Owner Nusa Island: klaim sekali, tidak menambahkan ikan/koin palsu ke game.
const { strict: assert } = require("node:assert");
const fs = require("node:fs"), vm = require("node:vm");
const code = fs.readFileSync("world/owner-showcase.js", "utf8");
let calls = 0, redraws = 0, notices = 0;
const cloud = { enabled: true, user: { uid: "owner-test", claims: { role: "owner" } },
  owner: { verified: false }, onChange: () => {} };
const NW = { cloud, eventDraw: { icon: () => {} } };
const window = { NW, NusaApi: { enabled: () => true, call: async (name, args, auth) => {
  assert.equal(name, "ownerShowcaseClaim"); assert.equal(Object.keys(args).length, 0); assert.equal(auth, true);
  calls++;
  return { owned: true, newlyGranted: calls === 1,
    item: { id: "megalodon_20261101", quantity: 1, weightKg: 50000, nonSellable: true, locked: true } };
} }, Nusa: { currentPanel: () => "inventory", renderPanel: () => redraws++,
    toast: () => notices++ } };
vm.runInNewContext(code, { window, NW, document: { getElementById: () => null }, navigator: {}, location: { origin: "https://game.test" } });
const mod = NW.ownerShowcase;
(async () => {
  assert.match(mod.render(), /50\.000 kg/);
  mod.after(); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1); assert.equal(mod.status().owned, true);
  assert.equal(redraws, 1); assert.equal(notices, 1);
  mod.after(); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1, "tidak mengklaim ulang saat panel digambar");
  cloud.user = { uid: "pemain-biasa", claims: {} };
  assert.equal(mod.render(), "", "pemain biasa tidak melihat koleksi Owner");
  console.log("PASS owner-showcase: gambar 50 ton, server grant once, no local fake coins, hide nonowner.");
})().catch((err) => { console.error(err); process.exitCode = 1; });
