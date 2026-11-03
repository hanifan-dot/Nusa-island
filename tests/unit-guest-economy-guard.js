// Regresi insiden: jangan jalankan ecoInit/ecoState ketika pemain masih tamu,
// sedang memindahkan progres ke Google, atau pemilik identitas tidak cocok.
// Tidak menggunakan akun/Firestore produksi.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const callbacks = [];
let calls = 0;
const save = { money: 1700, up: { rod: 2, bait: 0, cooler: 0, boat: 1 }, cooler: [] };
const cloud = { enabled: true, loginReady: false, user: { uid: 'google-u1' }, status: 'guest',
  sandbox: false, meta: () => ({ mode: 'guest', uid: null }) };
const NW = { cloud, shopApi: {
  live: true, sim: false, isGuest: () => false,
  eco: async (name) => {
    calls++;
    assert.equal(name, 'ecoState', 'jangan tulis ekonomi di tes');
    return { init: true, balance: 50, own: 50, up: { rod: 0, bait: 0, cooler: 0, boat: 0 }, box: [] };
  },
}};
const Nusa = { S: save, refreshHUD: () => {}, toast: () => {}, save: () => {} };
const window = { NW, Nusa };
const sandbox = {
  window, NW, document: { hidden: false, addEventListener: () => {} },
  setTimeout: () => 1, clearTimeout: () => {},
  setInterval: (fn, ms) => { callbacks.push({ fn, ms }); return callbacks.length; },
  console,
};
vm.runInNewContext(fs.readFileSync('economy/client.js', 'utf8'), sandbox);
const tick = callbacks.find(c => c.ms === 2500);
assert.ok(tick, 'pemantau ekonomi ditemukan');
const next = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  tick.fn();
  await next();
  assert.equal(calls, 0, 'sesi Google yang tertinggal dalam mode tamu tidak boleh memulai ekonomi');
  assert.equal(save.money, 1700);
  assert.equal(save.up.rod, 2);

  cloud.status = 'syncing';
  cloud.meta = () => ({ mode: 'google', uid: 'google-u1' });
  tick.fn();
  await next();
  assert.equal(calls, 0, 'sinkronisasi login belum selesai, ekonomi harus menunggu');

  cloud.status = 'idle';
  cloud.loginReady = true;
  cloud.meta = () => ({ mode: 'google', uid: 'other-uid' });
  tick.fn();
  await next();
  assert.equal(calls, 0, 'identitas akun tidak cocok, ekonomi harus menolak');

  cloud.meta = () => ({ mode: 'google', uid: 'google-u1' });
  tick.fn();
  await next();
  assert.equal(calls, 1, 'akun Google yang sinkron boleh membaca ekonomi');
  cloud.status = 'syncing';
  tick.fn();
  await next();
  assert.equal(calls, 2, 'sinkronisasi rutin setelah login tidak mematikan ekonomi server');
  console.log('PASS: ekonomi server ditahan selama mode tamu/sinkronisasi/UID salah.');
})().catch(e => { console.error(e); process.exitCode = 1; });
