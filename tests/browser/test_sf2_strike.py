"""REPRO bug live: Strike lalu minigame berhenti (ikan bayangan SF2 tanpa power → NaN). Uji Samudra Follower V2 di game yang berjalan (peramban nyata, viewport ponsel 390x844).
SUNGGUHAN: game asli, area pulau, perjalanan kapal, HUD, kartu tangkapan, Buku Koleksi, INTI EKONOMI SERVER asli (economy/core.js + sf2-core.js) berjalan di dalam halaman.
TIDAK DIUJI: Firestore/Cloudflare/pembayaran nyata (tidak terjangkau dari sandbox). Jalankan: python tests/browser/test_sf2.py   (gambar → docs/sf2/)"""
import time, os, json
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
OUT = os.path.join(ROOT_DIR, "docs", "sf2-strike"); os.makedirs(OUT, exist_ok=True)
rd = lambda p: open(os.path.join(ROOT_DIR, p), encoding="utf8").read()
R = []
def ok(n, c, e=""): R.append(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:230] if e != "" else "")); print(R[-1], flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
def wait_for(pg, js, t=12):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.12)
    return False
WRAP = "(function(){var module={exports:{}};%s;window.%s=module.exports})();"
def shot(pg, name): pg.screenshot(path=os.path.join(OUT, name)); print("  gambar:", name, flush=True)
SERVER = """async(cfg)=>{ const m=new Map(); let q=Promise.resolve(); const rd=p=>m.has(p)?JSON.parse(m.get(p)):null;
 const db={get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const [k,v] of buf)m.set(k,v);return r});q=run.catch(()=>{});return run}};
 (cfg.seed||[]).forEach(([k,v])=>m.set(k,v));
 window.__srvNow=cfg.now||1793502000000; window.__db=m; window.__calls=[]; window.__SEQ=[]; window.__R=()=>window.__SEQ.length?window.__SEQ.shift():Math.random();
 const e=NusaEconomyCore.makeEconomyServer(db,{clock:()=>window.__srvNow,tables:__T,fishmath:NW.FM,sf2:NusaSF2Core,initCap:1e9,trustClientInit:true,rand:()=>window.__R()});
 window.__srv=e; const A={uid:cfg.uid};
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>cfg.uid,getEntitlements:async()=>({owned:{},products:{},wallet:{NYATA:0}}),
   eco:async(name,d)=>{window.__calls.push(name);try{return JSON.parse(JSON.stringify(await e[name](A,d)))}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.cloud.enabled=true; NW.cloud.demo=false; NW.cloud.user={uid:cfg.uid,name:'Uji'}; return true}"""
def new(ctx, uid="u-sf2", seed=None, now=None):
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + "?cloud=off"); time.sleep(0.7)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.4); ev(pg, "()=>{window.__nusa.S.muted=true; window.__nusa.S.hour=10; NW.weather.force('cerah',{snap:true})}")
    ev(pg, SERVER, {"uid": uid, "seed": seed or [], "now": now}); ev(pg, "(m)=>{Nusa.S.money=m}", 1000); ev(pg, "NW.eco.ensure()"); wait_for(pg, "NW.eco.active()")
    return pg, errs
def set_lbc(pg, uid, n):
    ev(pg, "([u,n])=>{const k='shop/economy/'+u;const e=JSON.parse(__db.get(k));e.lbc=n;__db.set(k,JSON.stringify(e))}", [uid, n])
def tick(pg, ms=2000): ev(pg, "(d)=>{window.__srvNow+=d}", ms)
def seq(pg, *v): ev(pg, "(v)=>{window.__SEQ=v.slice()}", list(v))
def srv_catch(pg, rand_seq, spot="dalam"):
    tick(pg, 60000); seq(pg, *rand_seq)
    return ev(pg, "async(s)=>{const r=await NW.eco.sf2Catch(s,'op'+Math.random().toString(36).slice(2,12)+Date.now());return {f:r.fish,pity:r.pity,m:r.mythic,g:r.guaranteed,first:r.first,dup:r.duplicate}}", spot)
def island_url_ready(pg): return wait_for(pg, "NW.areas.cur&&NW.areas.cur.id==='sf2'&&Nusa.mode()==='world'", 25)
def fish_here(pg, spot, rand_seq):
    """memancing sungguhan di spot: area → startFishing → gigitan alami → tarik → mendarat; acak SERVER diatur deterministik"""
    ev(pg, "(s)=>{NW.world.api.startFishing(s)}", spot); ok_fish = wait_for(pg, "Nusa.mode()==='fish'", 10)
    tick(pg); seq(pg, *rand_seq)
    ev(pg, "()=>{const G=window.__nusa.G;G.phase='waiting';G.biteTimer=0.05;G.nibbles=[];G.bob.vis=true}")
    bit = wait_for(pg, "window.__nusa.G.phase==='bite'&&!!window.__nusa.G.pending", 6)
    pend = ev(pg, "!!(window.__nusa.G.pending&&window.__nusa.G.pending.sf2)")
    ev(pg, "()=>{window.__nusa.startFight()}"); ev(pg, "()=>{window.__nusa.endFight('caught')}")
    done = wait_for(pg, "!document.getElementById('catchWrap').classList.contains('hidden')", 10)
    return ok_fish and bit and pend and done
def back_to_world(pg):
    ev(pg, "()=>{const b=document.getElementById('catchOk');if(b&&b.offsetParent)b.click()}"); time.sleep(0.3)
    ev(pg, "()=>{window.__nusa.goWorld('dock')}"); wait_for(pg, "Nusa.mode()==='world'&&NW.areas.cur&&NW.areas.cur.id==='sf2'", 10)

VIEWS = [(360, 740), (375, 812), (390, 844)]
def hold(pg, down):
    ev(pg, "(d)=>{const cv=document.getElementById('game');const o={bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',clientX:180,clientY:500,isPrimary:true};cv.dispatchEvent(new PointerEvent(d?'pointerdown':'pointerup',o))}", down)
def num_ok(pg): return ev(pg, "()=>{const F=window.__nusa.G.fight;return !F||[F.pe,F.T,F.P,F.surge,F.surgeT].every(Number.isFinite)}")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader"])
    try:
        for (vw, vh) in VIEWS:
            ctx = b.new_context(viewport={"width": vw, "height": vh}, has_touch=True, device_scale_factor=2)
            ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
            U = "u-strike%d" % vw; tag = "%dpx " % vw
            pg, errs = new(ctx, U); set_lbc(pg, U, 100); ev(pg, "async()=>{await NW.sf2.refresh(true)}"); ev(pg, "Nusa.openPanel('map')"); time.sleep(0.6)
            ev(pg, "document.querySelector('.sf2-card [data-act=go]').click()")
            ok(tag + "S0 tiba di pulau", island_url_ready(pg))
            wait_for(pg, "!NW.adv.isBusy()&&!document.getElementById('fade').classList.contains('on')", 20); time.sleep(2.0); ev(pg, "async()=>{await NW.sf2.refresh(true)}"); time.sleep(0.5)
            pity0 = ev(pg, "NW.sf2.info().pity"); caught0 = ev(pg, "Nusa.S.stats.caught"); calls0 = ev(pg, "window.__calls.filter(c=>/ecoSf2Catch/.test(c)).length")
            ev(pg, "(s)=>{NW.world.api.startFishing(s)}", "dalam"); ok(tag + "S1 masuk mode memancing", wait_for(pg, "Nusa.mode()==='fish'", 10))
            # lempar SUNGGUHAN lewat sentuhan: tahan (isi power) lalu lepas
            hold(pg, True); time.sleep(0.5); hold(pg, False)
            ok(tag + "S2 lempar → fase waiting", wait_for(pg, "['casting','waiting'].includes(window.__nusa.G.phase)", 6), ev(pg, "window.__nusa.G.phase"))
            ev(pg, "()=>{const G=window.__nusa.G;G.phase='waiting';G.biteTimer=0.05;G.nibbles=[];G.bob.vis=true}")
            ok(tag + "S3 Strike (fase bite)", wait_for(pg, "window.__nusa.G.phase==='bite'", 6))
            hold(pg, True)   # tahan = tarik
            ok(tag + "S4 masuk fase fight (minigame mulai)", wait_for(pg, "window.__nusa.G.phase==='fight'&&!!window.__nusa.G.fight", 4), ev(pg, "window.__nusa.G.phase"))
            ok(tag + "S5 kekuatan ikan (pe) bilangan terbatas, bukan NaN", ev(pg, "()=>{const F=window.__nusa.G.fight;return !!F&&Number.isFinite(F.pe)&&F.pe>0}"), ev(pg, "()=>{const F=window.__nusa.G.fight;return F&&F.pe}"))
            ev(pg, "()=>{window.__nusa.G.fight.fxT=0}")
            # putar waktu-nyata: tahan/lepas bergantian, pastikan T & P bergerak & terbatas, minigame TIDAK macet
            seen=set(); stuck=0; last=None; t0=time.time(); res=None; nan=False
            while time.time()-t0 < 45:
                st = ev(pg, "()=>{const G=window.__nusa.G,F=G.fight;return {ph:G.phase,T:F&&F.T,P:F&&F.P}}")
                if st["ph"] != "fight": res = st["ph"]; break
                if st["T"] is None or st["P"] is None or st["T"]!=st["T"] or st["P"]!=st["P"]: nan=True; break
                if last and abs(st["T"]-last["T"])<1e-9 and abs(st["P"]-last["P"])<1e-9: stuck+=1
                last = st; seen.add(round(st["P"],2))
                # tahan bila tegangan rendah, lepas bila tinggi (pemain biasa)
                hold(pg, st["T"] < 0.7); time.sleep(0.15)
            hold(pg, False)
            ok(tag + "S6 minigame berjalan (tarik/lepas mengubah progres, tidak macet)", (not nan) and stuck < 5 and len(seen) > 3, {"nan": nan, "stuck": stuck, "p": len(seen)})
            ok(tag + "S7 minigame berakhir dengan hasil (tangkap/lepas), bukan membeku", res in ("result", "reeling", "idle", "waiting", "charging"), res)
            if res == "result":
                wait_for(pg, "!document.getElementById('catchWrap').classList.contains('hidden')", 10)
                ok(tag + "S8 kartu tangkapan sah muncul + Pity/hadiah berubah SEKALI", ev(pg, "NW.sf2.info().pity")!=pity0 or ev(pg, "Nusa.S.stats.caught")==caught0+1, ev(pg, "[NW.sf2.info().pity, Nusa.S.stats.caught]"))
                ok(tag + "S8b server dipanggil tepat 1 kali", ev(pg, "window.__calls.filter(c=>/ecoSf2Catch/.test(c)).length")-calls0==1)
            else:
                ok(tag + "S8 ikan lolos → Pity & koleksi TIDAK berubah", ev(pg, "NW.sf2.info().pity")==pity0 and ev(pg, "Nusa.S.stats.caught")==caught0 and ev(pg, "window.__calls.filter(c=>/ecoSf2Catch/.test(c)).length")==calls0)
            shot(pg, "strike-%d.png" % vw)
            real = [e for e in errs if "PAGEERR" in e]
            ok(tag + "S9 tanpa galat JavaScript", not real, real[:2])
            ctx.close()
    finally:
        b.close()
f = [r for r in R if r.startswith("FAIL")]
print("HASIL: %d lulus, %d gagal" % (len(R) - len(f), len(f)))
raise SystemExit(1 if f else 0)
