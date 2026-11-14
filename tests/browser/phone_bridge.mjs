// Jembatan uji NusaPhone (Ide 07): salinan integrasi_bridge.mjs + saklar nusaPhone. Semua saklar dinyalakan HANYA di Firestore tiruan uji (bukan produksi).
// (asal: Jembatan uji INTEGRASI FINAL)
// Jembatan uji Ide 08D: Worker backend ASLI (PR #61: server/dapur-sosial.js + izin Rumahku Sosial) dengan Firestore TIRUAN dan jam yang bisa dimajukan.
// Banyak akun uji sekaligus: identitas dari header `Authorization: Bearer dev.<uid>` (token JWT sungguhan dibuat di sini). Data sintetis; TIDAK menyentuh produksi.
// Pemakaian: NUSA_BACKEND=/jalur/ke/nusa-island-control-center node sosial_bridge.mjs <port>
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const BACKEND = process.env.NUSA_BACKEND;
if (!BACKEND) { console.error('NUSA_BACKEND belum diisi'); process.exit(2); }
const imp = (p) => import(pathToFileURL(path.join(BACKEND, p)).href);
const { setup } = await imp('test/helpers/worker-setup.js');
const D = await imp('server/dapur-core.js');
const houseCore = (await imp('server/vendor/house-core.cjs')).default;
const ZERO = { rod: 0, bait: 0, cooler: 0, boat: 0 };
const s = await setup({ NUSA_ECO_INIT_CAP: '1000000000' });
const O = await s.owner('owner-sb');
let T = Date.now() + 40000; s.setNow(T);
let rev = 0, kc = 0;
const flip = async (body) => { const r = await s.http('POST', '/api/features', { token: O, body: { rev, confirm: true, ...body } }); if (r.status === 200) rev++; return r; };
await flip({ dapurRumahku: true });
await flip({ socialHome: true, mpUpdated: true });
await flip({ pakDamar: true, kapalRombongan: true, kotaNusa: true });
await flip({ nusaPhone: true });
await flip({ oceanSpin: true });
const seen = new Set();
async function ensure(uid) {
  if (seen.has(uid)) return; seen.add(uid);
  s.mock.seed(`shop_legacy/${uid}`, { money: 5000, up: ZERO, homeLv: 1, cooler: [] });
  const P = await s.player(uid); try { await s.fn('ecoInit', P, {}); } catch (e) { /* tidak wajib */ }
}
const send = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
const readBody = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { ok({}); } }); });
const pidOf = (u) => houseCore.pidOf(u);
const srv = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    const u = new URL(req.url, 'http://x'); const body = await readBody(req);
    if (u.pathname.startsWith('/fn/')) {
      const auth = String(req.headers.authorization || ''); const m = /^Bearer dev\.(.+)$/.exec(auth); if (!m) return send(res, 401, { error: { status: 'unauthenticated', message: 'Masuk dulu.' } });
      const uid = m[1]; await ensure(uid); const P = await s.player(uid); const r = await s.fn(u.pathname.slice(4), P, body.data || {}); return send(res, r.status, r.text);
    }
    if (u.pathname === '/__adv') { T += body.ms | 0; s.setNow(T); return send(res, 200, { t: T }); }
    if (u.pathname === '/__flags') { const r = []; if (body.dapur !== undefined) r.push((await flip({ dapurRumahku: body.dapur === true })).status); if (body.social !== undefined) r.push((await flip({ socialHome: body.social === true, mpUpdated: true })).status); if (body.kota !== undefined) r.push((await flip({ kotaNusa: body.kota === true })).status); if (body.phone !== undefined) r.push((await flip({ nusaPhone: body.phone === true })).status); if (body.ocean !== undefined) r.push((await flip({ oceanSpin: body.ocean === true })).status); if (body.damar !== undefined) r.push((await flip({ pakDamar: body.damar === true })).status); if (body.kapal !== undefined) r.push((await flip({ kapalRombongan: body.kapal === true })).status); return send(res, 200, { status: r }); }
    if (u.pathname === '/__homepub') {   // rumah uji: pemilik `uid`, nama, level, privasi, tamu sementara {uid:ms}, bans, blocks
      const pid = pidOf(body.uid), far = T + 7200000, guests = {}; for (const [g, ms] of Object.entries(body.guests || {})) guests[pidOf(g)] = T + (ms | 0 || 7200000);
      s.mock.seed(`homepub/${pid}`, { v: 1, pid, uid: body.uid, privacy: body.privacy || 'private', allow: (body.allow || []).map((g) => ({ pid: pidOf(g), name: g })), bans: {}, blocks: [], guests, name: body.name || 'Rumah', lname: String(body.name || 'rumah').toLowerCase(), level: body.level || 2, snap: { name: body.name || 'Rumah', level: body.level || 2, furn: [], fish: [], deco: [], leg: [] }, updatedAt: T });
      void far; return send(res, 200, { pid });
    }
    if (u.pathname === '/__catch') {   // ikan uji milik `uid` lewat ecoCatch ASLI (n ekor), supaya masak ikan memakai ikan yang sah di server
      await ensure(body.uid); const P = await s.player(body.uid), out = [];
      for (let i = 0; i < (body.n | 0); i++) { T += 2000; s.setNow(T); const fu = `fish-${body.uid}-${++kc}`; const r = await s.fn('ecoCatch', P, { opId: 'bc-op-' + String(kc).padStart(8, '0'), id: 'nila', w: 0.5, uid: fu }); if (r.status === 200) out.push({ uid: fu, id: 'nila', w: 0.5 }); }
      T += 25000; s.setNow(T); return send(res, 200, out);
    }
    if (u.pathname === '/__dishes') { s.mock.seed(`shop_dapur/${body.uid}`, { ...D.fresh(), dishes: body.list || [], ...(body.extra || {}) }); return send(res, 200, { ok: true }); }
    if (u.pathname === '/__eco') { await ensure(body.uid); const pth = `shop_economy/${body.uid}`; s.mock.seed(pth, { ...(s.mock.read(pth) || {}), ...(body.set || {}) }); if (body.ent) s.mock.seed(`shop_entitlements/${body.uid}`, body.ent); return send(res, 200, { ok: true }); }   // data ekonomi uji (Firestore tiruan)
    if (u.pathname === '/__read') return send(res, 200, s.mock.read(body.path) || null);
    if (u.pathname === '/__pid') return send(res, 200, { pid: pidOf(body.uid) });
    if (u.pathname === '/__writes') return send(res, 200, { n: [...s.mock.ver.values()].reduce((n, v) => n + v, 0) });
    send(res, 404, { error: 'tidak ada' });
  } catch (e) { send(res, 500, { error: String(e && e.message) }); }
});
srv.listen(Number(process.argv[2]) || 0, '127.0.0.1', () => console.log('READY ' + srv.address().port));
