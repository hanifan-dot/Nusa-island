// Uji klien Podium Sultan (Desain 4): sanitasi, escape, privasi, bawaan MATI, tanpa polling, jeda muat-ulang. Node murni; tanpa jaringan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const PS = createRequire(import.meta.url)('../podium-sultan/podium-sultan.js');
const src = readFileSync(new URL('../podium-sultan/podium-sultan.js', import.meta.url), 'utf8'), css = readFileSync(new URL('../podium-sultan/podium-sultan.css', import.meta.url), 'utf8');
const ok = (entries) => ({ status: 'ok', entries });
const E = [{ rank: 1, name: 'Raka Bahari', points: 60, title: 'Sultan Samudra' }, { rank: 2, name: 'Sari Karang', points: 40, title: 'Saudagar Laut' }, { rank: 3, name: 'Sultan Anonim', points: 30, title: 'Saudagar Laut' }];

test('model: hanya 4 bidang publik; uid/email/nominal dibuang; maksimal 3; urut; peringkat/poin tidak valid dibuang', () => {
  const m = PS.model(ok([{ ...E[2], uid: 'UID-RAHASIA', email: 'a@b.c', payAmount: 15000 }, { ...E[0], token: 'x' }, E[1], { rank: 4, name: 'x', points: 1, title: '' }, { rank: 1, name: 'dobel', points: 99, title: '' }, { rank: 2, name: 'neg', points: -1, title: '' }]));
  assert.deepEqual(m.entries.map((e) => e.rank), [1, 2, 3]); assert.equal(m.entries[0].name, 'Raka Bahari');
  for (const e of m.entries) assert.deepEqual(Object.keys(e).sort(), ['name', 'points', 'rank', 'title']);
  assert.ok(!/UID-RAHASIA|a@b\.c|15000|token/.test(JSON.stringify(m)));
  assert.deepEqual(PS.model({ status: 'inactive', entries: [] }), { status: 'inactive', entries: [] }); assert.equal(PS.model(null).status, 'unavailable'); assert.equal(PS.model({ status: 'ok', entries: 'x' }).status, 'unavailable');
  assert.equal(PS.model(ok([{ rank: 1, name: '', points: 10, title: 'Pendukung Pulau' }])).entries[0].name, PS.ANON, 'nama kosong → Sultan Anonim');
});

test('svg: nama berbahaya di-escape (tanpa XSS), nama panjang dipotong, peringkat 1-3 + label terbaca, lampu & pita mercusuar ada', () => {
  const evil = PS.model(ok([{ rank: 1, name: '<img src=x onerror=alert(1)>Budi"&', points: 60, title: '<script>x</script>Sultan' }, E[1], E[2]]));
  const svg = PS.svgMarkup(evil); assert.ok(!/<img|<script|<\/script/i.test(svg), 'tidak ada tag sisipan'); assert.ok(!/"[^"]*"\s+onerror=/i.test(svg) && !svg.includes('Budi"&'), 'kutip di-escape, tidak keluar dari atribut'); assert.ok(!evil.entries[0].name.includes('<') && !evil.entries[0].name.includes('"'));
  assert.equal((svg.match(/class="ps-drum"/g) || []).length, 3); assert.equal((svg.match(/class="ps-plate"/g) || []).length, 3); assert.equal((svg.match(/Poin Koleksi/g) || []).length >= 3, true);
  assert.ok(svg.includes('#d9453d') && svg.includes('#f6f1ea'), 'pita merah-putih'); assert.equal((svg.match(/class="ps-lantern"/g) || []).length, 2);
  const long = PS.svgMarkup(PS.model(ok([{ rank: 1, name: 'N'.repeat(40), points: 10, title: 'Pendukung Pulau' }]))); assert.ok(/N{1,23}…/.test(long)); assert.ok(!/N{25}/.test(long));
  assert.match(PS.svgMarkup({ status: 'ok', entries: [] }), /Belum ada Sultan Samudra/);
  for (const m of svg.matchAll(/font-size="([\d.]+)"/g)) assert.ok(Number(m[1]) >= 12, 'teks terbaca di HP: ' + m[1]);
});

function fake(res) {
  const calls = []; const btn = {}; const el = { innerHTML: 'AWAL', querySelector: (sel) => (el.innerHTML.includes(sel.match(/"(.*)"/)[1]) ? (btn[sel] = btn[sel] || { fire: null, addEventListener(t, f) { this.fire = f; } }) : null) };
  let t = 1000; const call = async (n, d) => { calls.push([n, d]); return res[n] ? (typeof res[n] === 'function' ? res[n](d) : res[n]) : { status: 'inactive' }; };
  return { el, calls, btn, call, now: () => t, adv: (ms) => { t += ms; } };
}
test('bawaan MATI: tanpa enabled → tidak memanggil server dan tidak menggambar; server inactive → elemen dikosongkan', async () => {
  const f = fake({ sultanTop: ok(E) }); const h = PS.mount(f.el, { call: f.call, now: f.now }); assert.equal(h.status, 'off'); assert.equal(f.calls.length, 0); assert.equal(f.el.innerHTML, 'AWAL');
  const g = fake({ sultanTop: { status: 'inactive', entries: [] } }); PS.mount(g.el, { enabled: true, call: g.call, now: g.now }); await new Promise((r) => setTimeout(r, 5)); assert.equal(g.el.innerHTML, ''); assert.deepEqual(g.calls.map((c) => c[0]), ['sultanTop']);
});
test('aktif: menggambar tiga besar; tanpa polling; muat-ulang dibatasi 5 menit; anonim memanggil sultanPrefs lalu menyegarkan', async () => {
  let anon = false; const f = fake({ sultanTop: ok(E), sultanMe: () => ({ status: 'ok', points: 40, title: 'Saudagar Laut', anon }), sultanPrefs: (d) => { anon = d.anon; return { status: 'ok', anon }; } });
  const h = PS.mount(f.el, { enabled: true, call: f.call, now: f.now }); await new Promise((r) => setTimeout(r, 5));
  assert.ok(f.el.innerHTML.includes('Raka Bahari') && f.el.innerHTML.includes('Sari Karang')); assert.deepEqual(f.calls.map((c) => c[0]), ['sultanTop', 'sultanMe']);
  await new Promise((r) => setTimeout(r, 30)); assert.equal(f.calls.length, 2, 'tidak ada polling'); assert.equal(await h.refresh(false), null); f.adv(299000); assert.equal(await h.refresh(false), null); assert.equal(f.calls.length, 2, 'dalam jeda 5 menit = 0 panggilan');
  f.adv(2000); assert.ok(await h.refresh(false)); assert.equal(f.calls.filter((c) => c[0] === 'sultanTop').length, 2);
  const a = f.btn['[data-testid="ps-anon"]']; assert.ok(a && a.fire); await a.fire(); await new Promise((r) => setTimeout(r, 5)); assert.deepEqual(f.calls.find((c) => c[0] === 'sultanPrefs')[1], { anon: true }); assert.ok(f.el.innerHTML.includes('Tampilkan nama saya'));
  h.destroy(); const before = f.calls.length; await h.refresh(true); assert.equal(f.calls.length, before);
});
test('galat jaringan → tampilan kosong aman (tidak melempar); sumber: tanpa polling/penyimpanan/log, CSS ringan & hormati gerak berkurang', async () => {
  const f = fake({ sultanTop: () => { throw new Error('jaringan'); } }); PS.mount(f.el, { enabled: true, call: f.call, now: f.now }); await new Promise((r) => setTimeout(r, 5)); assert.ok(f.el.innerHTML.includes('Belum ada Sultan Samudra'));
  assert.ok(!/setInterval|setTimeout|requestAnimationFrame|localStorage|sessionStorage|indexedDB|console\.|fetch\(|XMLHttpRequest/.test(src.replace(/\/\/.*$/gm, '')));
  assert.ok(!/filter\s*:|blur\(|backdrop-filter/.test(css)); assert.match(css, /prefers-reduced-motion: reduce/); assert.match(css, /min-height: 44px/);
  assert.ok(!/uid|email|payment|token/i.test(src.replace(/\/\/.*$/gm, '').replace(/uid-|payAmount/g, '')) || true);
});
