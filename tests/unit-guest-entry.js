// Nusa Island: tes UI masuk cepat tamu. Tidak menyentuh Firebase atau data pemain sungguhan.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ui = fs.readFileSync('cloud/ui.js', 'utf8');
const css = fs.readFileSync('cloud/cloud.css', 'utf8');
const source = fs.readFileSync('cloud/cloud.js', 'utf8');

assert(ui.indexOf('id="gateGuest"') < ui.indexOf('id="gateGoogle"'), 'Main Sekarang harus jadi CTA pertama');
assert.match(ui, /gateGuest"\)\.addEventListener\("click", \(\) => \{ cloud\.guest\(\); ui\.hideGate\(\); \}\);/);
assert.match(ui, /hanya di browser ini/);
assert.match(css, /\.gate-guest \{/);

const items = new Map(), ss = new Map(), jobs = new Map(); let id = 0, tick = 10_000, serverCalls = 0;
const store = {
  getItem: (k) => items.has(k) ? items.get(k) : null,
  setItem: (k, v) => items.set(k, String(v)),
  removeItem: (k) => items.delete(k),
  key: (i) => [...items.keys()][i] || null,
  get length() { return items.size; },
};
const sessionStorage = {
  getItem: (k) => ss.get(k) || null,
  setItem: (k,v) => ss.set(k,String(v)),
  removeItem: (k) => ss.delete(k),
};
const notifications = [];
const adapter = {
  init: async () => {},
  currentUser: () => null,
  onAuth: () => {},
  call: async () => { serverCalls++; return {}; },
};
const NW = { cloudUI: { create: () => ({
  showGate: () => {}, hideGate: () => {}, notice: (m) => notifications.push(m),
}) } };
const window = { NW, NusaCloudCore: {}, NUSA_CLOUD_ADAPTER: adapter };
const FakeDate = class extends Date { static now() { return tick; } };
const sandbox = {
  window, NW, localStorage: store, sessionStorage,
  document: { hidden: false, addEventListener: () => {} },
  location: { search: '', reload: () => {} },
  navigator: { onLine: true },
  URLSearchParams, Date: FakeDate, console,
  setTimeout: (fn, ms) => { const k = ++id; jobs.set(k, { fn, ms }); return k; },
  clearTimeout: (k) => jobs.delete(k),
  setInterval: () => 0, clearInterval: () => {},
};
vm.runInNewContext(source, sandbox, { filename: 'cloud/cloud.js' });
(async () => {
  await NW.cloud.ready;
  store.setItem('nusa-island-v1', JSON.stringify({ v: 10, money: 77 }));
  NW.cloud.guest();
  assert.equal(NW.cloud.status, 'guest');
  assert.equal(NW.cloud.user, null);
  assert.equal(JSON.parse(store.getItem('nusa-island-v1')).money, 77);
  assert.equal(serverCalls, 0);
  const pending = [...jobs.values()]; assert.equal(pending.length, 1);
  assert.equal(pending[0].ms, 15 * 60_000);
  tick += 15 * 60_000;
  pending[0].fn();
  assert.equal(notifications.length, 1);
  assert.equal(JSON.parse(store.getItem('nusa-auth-v1')).guestReminded, true);
  NW.cloud.guest();
  assert.equal(notifications.length, 1);
  console.log('PASS: Main Sekarang satu ketukan, progres lokal aman, 0 panggilan backend, pengingat sekali 15 menit.');
})().catch((e) => { console.error(e); process.exitCode = 1; });
