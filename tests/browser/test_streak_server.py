"""Uji Login Streak 7 Hari memakai SERVER ekonomi (mode produksi Worker/Functions): klien streak/streak.js + inti server economy/core.js yang SAMA,
di dalam halaman (bukan Firebase sungguhan). Fokus perubahan baru saja: klaim lewat server, hari = jam server, koin masuk dompet utama SEKALI,
manipulasi di browser (S.money, jam HP) tidak berpengaruh, klaim ganda/paralel tidak menggandakan, tamu/ekonomi belum aktif tidak bisa klaim.
Jalankan: python tests/browser/test_streak_server.py"""
import time, os
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
rd = lambda p: open(os.path.join(ROOT_DIR, p), encoding="utf8").read()
R = []
def ok(n, c, e=""): R.append(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:230] if e != "" else "")); print(R[-1], flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
def wait_for(pg, js, t=10):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.12)
    return False
WRAP = "(function(){var module={exports:{}};%s;window.%s=module.exports})();"
DAY = 86400000
T0 = 1793502000000  # 1 Nov 2026 10:00 WIB
SERVER = """async(t0)=>{ const m=new Map(); let q=Promise.resolve(); const rd=p=>m.has(p)?JSON.parse(m.get(p)):null;
 const db={get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const[p,v]of buf)m.set(p,v);return r});q=run.catch(()=>{});return run}};
 window.__srvNow=t0; const e=NusaEconomyCore.makeEconomyServer(db,{clock:()=>window.__srvNow,tables:__T,fishmath:NW.FM,streak:NW.StreakCore,initCap:20000}); const A={uid:'u-st'}; window.__calls=[];
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>'u-st',getEntitlements:async()=>({env:'NYATA',wallet:{NYATA:0}}),
   eco:async(name,d)=>{window.__calls.push(name);try{return JSON.parse(JSON.stringify(await e[name](A,d)))}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.wallet.hook&&NW.wallet.hook(); NW.cloud.enabled=true; NW.cloud.demo=false; NW.cloud.user={uid:'u-st',name:'Uji'}; return true}"""
with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
        ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(ROOT + "?cloud=off"); time.sleep(0.6)
        if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
        time.sleep(0.4); ev(pg, "()=>{window.__nusa.S.muted=true}")
        ev(pg, SERVER, T0)
        ok("S0 sebelum ekonomi server aktif: klaim ditolak ('Menghubungkan')", ev(pg, "()=>NW.streak.access().ok") is False)
        ev(pg, "()=>{Nusa.S.money=100}"); ev(pg, "NW.eco.ensure()")
        ok("S1 ekonomi aktif → akses streak terbuka", ev(pg, "()=>NW.eco.active()&&NW.streak.access().ok") is True)
        ev(pg, "NW.streak.refresh(true)"); ok("S2 buku klaim dimuat dari server, jam tampilan = jam server", wait_for(pg, "NW.streak.view().loaded") and ev(pg, "NW.streak.view().clockSource") == "server")
        b0 = ev(pg, "NW.wallet.bal()")
        r = ev(pg, "NW.streak.claim()")
        ok("S3 klaim Hari 1: berhasil, +20 koin di dompet utama (server), tercatat", r.get("ok") is True and ev(pg, "NW.wallet.bal()") == b0 + 20 and ev(pg, "Nusa.S.money") == b0 + 20, [r.get("error"), ev(pg, "NW.wallet.bal()")])
        ok("S4 koin TIDAK dobel (klien tidak ikut menambah)", ev(pg, "Nusa.S.streak.applied") == 1 and ev(pg, "NW.eco.state().own") == b0 + 20)
        r2 = ev(pg, "NW.streak.claim()"); ok("S5 klaim lagi di hari yang sama: tidak ada tambahan", (r2.get("already") or r2.get("error")) and ev(pg, "NW.wallet.bal()") == b0 + 20, r2)
        ev(pg, "()=>{const real=Date.now;Date.now=()=>real()+9*86400000}")
        r3 = ev(pg, "async()=>{const a=await Promise.all([NW.streak.claim(),NW.streak.claim()]);return a.map(x=>!!x.ok)}")
        ok("S6 jam HP dimajukan 9 hari + klaim paralel: tetap TIDAK ada tambahan (hari ikut jam server)", ev(pg, "NW.wallet.bal()") == b0 + 20 and not any(r3), r3)
        ev(pg, "()=>{Nusa.S.money=9e9}"); ev(pg, "NW.eco.ensure()")
        ok("S7 S.money dimanipulasi → server menimpa kembali", ev(pg, "Nusa.S.money") == b0 + 20)
        # hari berikutnya (server)
        ev(pg, "(d)=>{window.__srvNow+=d}", DAY); ev(pg, "NW.streak.refresh(true)")
        r4 = ev(pg, "NW.streak.claim()"); ok("S8 hari berikutnya (jam server): Hari 2 = 3 umpan, koin tidak berubah", r4.get("ok") and ev(pg, "NW.streak.baitCount()") == 3 and ev(pg, "NW.wallet.bal()") == b0 + 20, r4.get("error"))
        ev(pg, "(d)=>{window.__srvNow+=3*d}", DAY); ev(pg, "NW.streak.refresh(true)")
        r5 = ev(pg, "NW.streak.claim()"); ok("S9 bolos 2 hari → kembali ke Hari 1 (server)", r5.get("ok") and r5["plan"]["pos"] == 1, r5.get("error"))
        for i in range(6):
            ev(pg, "(d)=>{window.__srvNow+=d}", DAY); ev(pg, "NW.streak.refresh(true)"); last = ev(pg, "NW.streak.claim()")
        ok("S10 Hari 7 siklus 1 → Kapal Perintis Eksklusif (server)", last.get("ok") and ev(pg, "NW.streak.shipOn()") is True and ev(pg, "NW.eco.state().balance") == ev(pg, "NW.wallet.bal()"), last.get("error"))
        ev(pg, "async()=>{const a=NW.cloud;a.user=null}"); ok("S11 keluar akun: klaim ditolak", ev(pg, "NW.streak.access().ok") is False)
        ok("S12 tanpa error JS", errs == [], errs); ctx.close()
    finally:
        b.close()
fails = [x for x in R if x.startswith("FAIL")]; print(f"\nstreak-server: {len(R)-len(fails)} lulus, {len(fails)} gagal"); raise SystemExit(1 if fails else 0)
