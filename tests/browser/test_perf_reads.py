"""UKUR frekuensi panggilan server (penyebab bacaan Firestore) selama 1 JAM waktu virtual untuk pemain aktif: ecoState, homeInbox, Cloud Save (loadSave metaOnly).
Peramban nyata + penjadwal waktu virtual (loncat ke peristiwa berikutnya). Server dipalsukan di batas API (hanya menghitung panggilan; tidak ada Firebase/produksi).
Bacaan per panggilan diukur terpisah di backend (scripts/measure-reads.mjs). Jalankan: python tests/browser/test_perf_reads.py"""
import os, sys, json, time
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
R = []
def ok(n, c, e=""): R.append(bool(c)); print(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:200] if e != "" else ""), flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
INIT = """
window.__cnt = {}; window.__hidden = false;
Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hidden });
const real = () => (window.__real = window.__real || NW.cloudDemo.create());
window.NUSA_CLOUD_ADAPTER = new Proxy({}, { get: (t, k) => {
  if (k === 'call') return (name, p) => { const key = name + (p && p.metaOnly ? ':meta' : ''); window.__cnt[key] = (window.__cnt[key] || 0) + 1; return real().call(name, p); };
  const v = real()[k]; return typeof v === 'function' ? v.bind(real()) : v; } });
{ const cfg = { apiBase: 'https://api.invalid' }; Object.defineProperty(window, 'NUSA_FIREBASE', { configurable: true, get: () => cfg, set: () => {} }); }   // mode Worker (seperti produksi): WK=true
window.NUSA_SOCIAL_HOME = true;
window.NusaApi = { enabled: () => true, call: async (name) => { window.__cnt[name] = (window.__cnt[name] || 0) + 1; return name === 'homeInbox' ? { requests: [], answers: [] } : {}; } };
// penjadwal VIRTUAL: loncat ke peristiwa berikutnya (1 jam selesai dalam hitungan detik); timer < 5 dtk (render/animasi/UI) diabaikan; polling yang diukur semuanya >= 20 dtk
(function () {
  const realST = window.setTimeout.bind(window); let vnow = 1.7e12, seq = 0; const q = new Map(); const dateReal = Date.now.bind(Date);
  Date.now = () => vnow; const perfNow = performance.now.bind(performance); performance.now = () => vnow - 1.7e12;
  window.requestAnimationFrame = () => 0;
  window.setTimeout = function (f, d, ...a) { d = Math.max(0, +d || 0); if (typeof f !== 'function' || d < 5000) return 0; const id = ++seq; q.set(id, { t: vnow + d, f, a, iv: 0 }); return id; };
  window.setInterval = function (f, d, ...a) { d = Math.max(1, +d || 1); if (typeof f !== 'function' || d < 5000) return 0; const id = ++seq; q.set(id, { t: vnow + d, f, a, iv: d }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { q.delete(id); };
  window.__advance = async (ms) => {
    const end = vnow + ms;
    for (;;) {
      let bid = 0, bt = Infinity; for (const [id, e] of q) if (e.t < bt) { bt = e.t; bid = id; }
      if (!bid || bt > end) break;
      const e = q.get(bid); vnow = Math.max(vnow, e.t);
      if (e.iv) e.t = vnow + e.iv; else q.delete(bid);
      try { e.f(...e.a); } catch (x) {}
      await new Promise((r) => realST(r, 0));
    }
    vnow = end;
  };
})();
"""
def run_hour(pg, label, hidden_frac=0.0):
    ev(pg, "window.__cnt = {}"); ev(pg, '(ms)=>window.__advance(ms)', 3600 * 1000)
    return ev(pg, "window.__cnt")
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 780}, has_touch=True)
    ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(ROOT); pg.wait_for_function("window.NW && NW.cloud && NW.eco && NW.cloud._test", timeout=20000)   # WAJIB: muat game dulu (harness harus berdiri sendiri dari commit)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "()=>{document.getElementById('startBtn').click();return 1}")
    ev(pg, "()=>{window.NUSA_SOCIAL_HOME=true;window.NusaApi={enabled:()=>true,call:async(name)=>{window.__cnt[name]=(window.__cnt[name]||0)+1;return name==='homeInbox'?{requests:[],answers:[]}:{}}};return 1}")   # api.js menimpa tiruan saat dimuat: pasang ulang
    ev(pg, "()=>{NW.social.hook();return 1}"); ev(pg, '(ms)=>window.__advance(ms)', 500)   # nyalakan polling homeInbox (hook sekali saja)
    ev(pg, "()=>{NW.cloud.user={uid:'demo-perf',name:'Uji'}; NW.cloud.writeMeta&&0; NW.cloud._test.writeMeta({mode:'google',uid:'demo-perf',rev:0,hash:''}); NW.cloud._test.startSync(); return 1}"); ev(pg, '(ms)=>window.__advance(ms)', 3000)   # lewati dialog login; jam virtual harus berjalan
    # ekonomi server tiruan di batas API: hanya menghitung
    ev(pg, """()=>{ const v={init:true,balance:10,own:10,top:0,up:{},box:[],aur:null};
      NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>'u1',getEntitlements:async()=>({owned:{},products:{},wallet:{NYATA:0}}),
        eco:async(name)=>{window.__cnt[name]=(window.__cnt[name]||0)+1;return JSON.parse(JSON.stringify(v))}};
      NW.cloud.enabled=true; }""")
    ev(pg, "()=>{window.__p2=NW.eco.ensure();return 1}"); ev(pg, '(ms)=>window.__advance(ms)', 500)
    ok("cloud sync aktif", ev(pg, "NW.cloud._test.state().syncActive"), ev(pg, "NW.cloud.status"))
    # --- 1 jam pemain aktif, tab terlihat ---
    c = run_hour(pg, "aktif")
    out = {"ecoState": c.get("ecoState", 0), "homeInbox": c.get("homeInbox", 0), "loadSave:meta": c.get("loadSave:meta", 0)}
    print("ONE_HOUR_ACTIVE", json.dumps(out), flush=True)
    # --- 1 jam, tab sering pindah (visibilitychange tiap 25 dtk, 144x/jam) ---
    ev(pg, "window.__cnt = {}")
    for i in range(144):
        ev(pg, "()=>{window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'))}"); ev(pg, '(ms)=>window.__advance(ms)', 10000)
        ev(pg, "()=>{window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'))}"); ev(pg, '(ms)=>window.__advance(ms)', 15000)
    c2 = ev(pg, "window.__cnt")
    out2 = {"ecoState": c2.get("ecoState", 0), "homeInbox": c2.get("homeInbox", 0), "loadSave:meta": c2.get("loadSave:meta", 0)}
    print("ONE_HOUR_TABSWITCH", json.dumps(out2), flush=True)
    json.dump({"active": out, "tabswitch": out2}, open(os.environ.get("PERF_OUT", "/tmp/perf.json"), "w"))
    # --- ambang (diisi setelah optimasi; 'sebelum' tidak lulus ambang ini) ---
    limit = {"ecoState": int(os.environ.get("MAX_ECO", "20")), "homeInbox": int(os.environ.get("MAX_INBOX", "70")), "loadSave:meta": int(os.environ.get("MAX_META", "13"))}
    TS = {"ecoState": int(os.environ.get("MAX_ECO_TS", "60")), "homeInbox": int(os.environ.get("MAX_INBOX_TS", "80")), "loadSave:meta": int(os.environ.get("MAX_META_TS", "80"))}
    for k, mx in limit.items(): ok(f"jam aktif: {k} <= {mx}", out[k] <= mx, out[k])
    for k, mx in limit.items(): ok(f"jam pindah-tab: {k} <= {TS[k]}", out2[k] <= TS[k], out2[k])
    LOW = {"ecoState": 5, "homeInbox": 30, "loadSave:meta": 8}
    for k, mn in LOW.items(): ok(f"jam aktif: {k} >= {mn} (harness benar-benar mengukur)", out[k] >= mn, out[k])
    real = [e for e in errs]
    ok("tanpa galat JS", not real, real[:2])
    b.close()
f = sum(1 for r in R if not r); print("HASIL: %d lulus, %d gagal" % (len(R) - f, f)); sys.exit(1 if f else 0)
