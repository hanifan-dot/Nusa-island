"""Penyiapan bersama uji/foto Event 5 Monster Legenda: memuat game ASLI (index.html), lalu memasang di dalam halaman server ekonomi + event
yang memakai inti YANG SAMA dengan produksi (economy/core.js, event/core.js) dengan basis data dalam memori. Ini BUKAN simulasi fitur: klien event
(event/client.js, event/ui.js, event/draw.js) tidak diubah sedikit pun; hanya jalur jaringan ke Worker/Functions yang diganti server lokal."""
import os, time
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
rd = lambda p: open(os.path.join(ROOT_DIR, p), encoding="utf8").read()
WRAP = "(function(){var module={exports:{}};%s;window.%s=module.exports})();"
S1 = 1793502000000 + 2 * 3600000   # Minggu 1 Nov 2026 19.00 WIB (12.00 UTC) — dihitung ulang di bawah supaya tidak salah hitung
S1 = 1793534400000                  # Date.UTC(2026,10,1,12,0,0)
WEEK = 7 * 86400000
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
def wait_for(pg, js, t=10):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.1)
    return False
SERVER = """async(cfg)=>{ const m=new Map(); let q=Promise.resolve(); const rd=p=>m.has(p)?JSON.parse(m.get(p)):null;
 const db={m,get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const[p,v]of buf)m.set(p,v);return r});q=run.catch(()=>{});return run}};
 if(cfg.eventOn!==false) m.set('shop/config',JSON.stringify({legacyFrozen:true,eventOn:true,eventAnchor:cfg.anchor||'2026-10-25',eventPass:cfg.pass!==false}));
 window.__rb=performance.now(); window.__sb=cfg.t0; window.__srvNow=()=>window.__sb+(performance.now()-window.__rb); window.__setSrv=(t)=>{window.__sb=t;window.__rb=performance.now()};
 const e=NusaEconomyCore.makeEconomyServer(db,{clock:()=>window.__srvNow(),tables:__T,fishmath:NW.FM,streak:NW.StreakCore,event:NusaEventCore,initCap:20000,trustClientInit:true});
 window.__db=db; window.__e=e; const A={uid:cfg.uid||'u-ev'}; window.__calls=[]; window.__fail=null;
 NW.shopApi={sim:false,live:true,isGuest:()=>cfg.guest===true,uid:()=>A.uid,getEntitlements:async()=>({env:'NYATA',wallet:{NYATA:0}}),
   eventInfo:async()=>{window.__calls.push('eventInfo');if(window.__fail)throw Object.assign(new Error('jaringan'),{code:'unavailable'});return JSON.parse(JSON.stringify(await e.eventInfo()))},
   eco:async(name,d)=>{window.__calls.push(name);if(name==='ecoEventFinish'&&window.__failFinish>0){window.__failFinish--;throw Object.assign(new Error('jaringan putus'),{code:'unavailable'})} try{return JSON.parse(JSON.stringify(await e[name](A,d)))}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.wallet.hook&&NW.wallet.hook(); if(!cfg.guest){NW.cloud.enabled=true; NW.cloud.demo=false; NW.cloud.user={uid:A.uid,name:'Uji'};} return true}"""
def boot(b, t0, uid="u-ev", guest=False, up=None, w=390, h=844, eventOn=True, anchor=None, passOn=True):
    ctx = b.new_context(viewport={"width": w, "height": h}, has_touch=True, device_scale_factor=2)
    ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" and "favicon" not in m.text else None)
    pg.goto(ROOT + "?cloud=off"); time.sleep(0.6)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.3); ev(pg, "()=>{window.__nusa.S.muted=true; try{localStorage.setItem('nusa-mp-prefs',JSON.stringify({consent:false,on:false}))}catch(e){}; document.querySelectorAll('[data-ask=later]').forEach(b=>b.click())}")
    ev(pg, "(u)=>{const S=window.__nusa.S; S.money=1000; S.stats.casts=9; Object.assign(S.up,u)}", up or {"rod": 5, "bait": 2, "cooler": 3, "boat": 4})
    ev(pg, SERVER, {"t0": t0, "uid": uid, "guest": guest, "eventOn": eventOn, "anchor": anchor, "pass": passOn})
    if not guest: ev(pg, "NW.eco.ensure()"); wait_for(pg, "NW.eco.active()")
    ev(pg, "NW.event.fetchInfo()"); wait_for(pg, "!!NW.event.info()")
    return ctx, pg, errs
def go_fishing(pg, loc):
    """Pindah ke lokasi monster dengan jalur game yang sama (area darat → dermaga; Raja Ampat/Banda → kapal)."""
    idx = ev(pg, "(l)=>LOCATIONS.findIndex(x=>x.id===l)", loc)
    if loc in ("muara", "toba", "selat"):
        ev(pg, "(l)=>{__nusa.goWorld('dock',l);}", loc); time.sleep(0.4); ev(pg, "()=>__nusa.enterFishing('dock')")
    else:
        ev(pg, "(i)=>{__nusa.S.loc=i;__nusa.enterFishing('boat')}", idx)
    time.sleep(0.3)
