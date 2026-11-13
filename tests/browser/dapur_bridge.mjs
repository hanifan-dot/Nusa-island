// Jembatan uji Ide 08C: menjalankan Worker backend ASLI (PR #60: server/dapur-core.js + dapur-server.js) dengan Firestore TIRUAN dan jam yang bisa dimajukan,
// lalu melayaninya lewat HTTP lokal supaya tes browser (Playwright) memakai logika server yang sebenarnya, bukan tiruan hasil masak.
// Data sintetis saja; TIDAK menyentuh produksi, tidak butuh rahasia. Pemakaian: NUSA_BACKEND=/jalur/ke/nusa-island-control-center node dapur_bridge.mjs <port>
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const BACKEND = process.env.NUSA_BACKEND;
if (!BACKEND) { console.error('NUSA_BACKEND belum diisi'); process.exit(2); }
const { setup } = await import(pathToFileURL(path.join(BACKEND, 'test/helpers/worker-setup.js')).href);
const ZERO = { rod: 0, bait: 0, cooler: 0, boat: 0 };
const s = await setup({ NUSA_ECO_INIT_CAP: '1000000000' });
const O = await s.owner('owner-br');
const U = 'u-br';
let T = Date.now() + 40000, k = 0; s.setNow(T);
const op = () => 'br-op-' + String(++k).padStart(8, '0');
const adv = (ms) => { T += ms; s.setNow(T); };
const flagOn = async (on) => { const cur = await s.http('GET', '/api/features', { token: O }); const rev = (cur.json && cur.json.rev) || 0; return s.http('POST', '/api/features', { token: O, body: { rev, confirm: true, dapurRumahku: on } }); };
await flagOn(true);
s.mock.seed(`shop_legacy/${U}`, { money: 5000, up: ZERO, homeLv: 1, cooler: [] });
const P = await s.player(U);
await s.fn('ecoInit', P, {});
const fish = [];
for (let i = 0; i < 16; i++) { adv(2000); const fu = `fish-${U}-${i}`; const r = await s.fn('ecoCatch', P, { opId: op(), id: 'nila', w: 0.5, uid: fu }); if (r.status === 200) fish.push({ uid: fu, id: 'nila', w: 0.5 }); }
adv(25000);

const send = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
const readBody = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b ? JSON.parse(b) : {})); });
const srv = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x'); const body = await readBody(req);
    if (u.pathname.startsWith('/fn/')) { const r = await s.fn(u.pathname.slice(4), P, body.data || {}); return send(res, r.status, r.text); }
    if (u.pathname === '/__adv') { adv(body.ms | 0); return send(res, 200, { t: T }); }
    if (u.pathname === '/__flag') { const r = await flagOn(body.on === true); return send(res, 200, { status: r.status }); }
    if (u.pathname === '/__fish') return send(res, 200, fish);
    if (u.pathname === '/__state') return send(res, 200, { eco: s.mock.read(`shop_economy/${U}`) || {}, dapur: s.mock.read(`shop_dapur/${U}`) || null, t: T });
    if (u.pathname === '/__buy') { const r = await s.fn('dapurBuy', P, { opId: op(), items: body.items }); return send(res, r.status, r.text); }
    if (u.pathname === '/__fn') { const r = await s.fn(body.name, P, Object.assign({ opId: op() }, body.data || {})); return send(res, r.status, r.text); }
    send(res, 404, { error: 'tidak ada' });
  } catch (e) { send(res, 500, { error: String(e && e.message) }); }
});
srv.listen(Number(process.argv[2]) || 0, '127.0.0.1', () => console.log('READY ' + srv.address().port));
