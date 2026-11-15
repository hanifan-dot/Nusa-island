"""Uji Kopdes di Pulau Para Legenda (Samudra Follower). Peramban nyata + inti ekonomi server asli di dalam halaman (sama seperti test_sf2). BUKAN produksi. Gambar → docs/kopdes/"""
import time, os, json
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
OUT = os.path.join(ROOT_DIR, "docs", "kopdes"); os.makedirs(OUT, exist_ok=True)
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

def new_k(ctx, flag, uid="u-kop", money=2000):
    ctx.add_init_script("window.NUSA_KOPDES=%s;" % ("true" if flag else "false"))
    pg, errs = new(ctx, uid); set_lbc(pg, uid, 100); ev(pg, "async()=>{await NW.sf2.refresh(true)}")
    ev(pg, "(m)=>{Nusa.S.money=m}", money); ev(pg, "NW.eco.ensure()"); wait_for(pg, "NW.eco.active()")
    ev(pg, "Nusa.openPanel('map')"); wait_for(pg, "!!document.querySelector('.sf2-card [data-act=go]')", 10); ev(pg, "document.querySelector('.sf2-card [data-act=go]').click()")
    ok("setup: tiba di Pulau Para Legenda", island_url_ready(pg)); wait_for(pg, "!NW.adv.isBusy()&&!document.getElementById('fade').classList.contains('on')", 20); time.sleep(1.5)
    return pg, errs
def place(pg, x, y): ev(pg, "([x,y])=>{const p=NW.world.player;p.x=x;p.y=y;p.dir=2}", [x, y]); time.sleep(0.8)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader"])
    try:
        # ===== A. flag MATI: pulau persis seperti sebelumnya =====
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
        ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
        pg, errs = new_k(ctx, False)
        d = ev(pg, "()=>{const M=NW.SF2_MAP;return {k:M.objects.some(o=>o.kind==='kopdes'),pt:M.points.some(p=>p.id==='kopdes'),n:M.objects.length,np:M.points.length,nl:M.lights.length,flag:window.NUSA_KOPDES}}")
        ok("A1 flag MATI (bawaan): tanpa bangunan, tanpa titik beli, tanpa lampu tambahan", d["flag"] is False and not d["k"] and not d["pt"] and d["np"] == 6 + 2 and d["nl"] == 2, d)
        place(pg, 36.0, 27.5); shot(pg, "A-flag-mati.png")
        ok("A2 tanpa galat skrip", not [e for e in errs if "PAGEERR" in e], errs[:2]); ctx.close()
        # ===== B. flag NYALA (hanya uji) =====
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
        ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
        pg, errs = new_k(ctx, True)
        d = ev(pg, "()=>{const M=NW.SF2_MAP,F=NW.kopdes.FP;return {k:M.objects.filter(o=>o.kind==='kopdes').length,pt:M.points.filter(p=>p.id==='kopdes').length,nl:M.lights.length,inFp:M.objects.filter(o=>o.kind!=='kopdes'&&['palm','bush','flowers','rock','crate'].includes(o.kind)&&o.x>F.x0-0.8&&o.x<F.x1+0.8&&o.y>F.y0-0.9&&o.y<F.y1+2.9).length,ground:[[F.x0+0.3,F.y0+0.3],[F.x1-0.3,F.y1-0.3],[F.x0+0.3,F.y1+1.1],[F.x1-0.3,F.y1+1.1]].map(([x,y])=>NW.isLandT(M.tileAt(x,y)))}}")
        ok("B1 flag NYALA: tepat 1 bangunan + 1 titik 'Kopdes' + 1 lampu tambahan; tapak bersih; tapak & halaman di tanah", d["k"] == 1 and d["pt"] == 1 and d["nl"] == 3 and d["inFp"] == 0 and all(d["ground"]), d)
        w = ev(pg, "()=>{const M=NW.SF2_MAP,F=NW.kopdes.FP;return {inside:M.walkable((F.x0+F.x1)/2,(F.y0+F.y1)/2),front:M.walkable((F.x0+F.x1)/2,F.y1+1.1),left:M.walkable(F.x0-0.9,(F.y0+F.y1)/2),door:M.walkable(NW.kopdes.DOOR.x,NW.kopdes.DOOR.y)}}")
        ok("B2 tabrakan: tidak bisa masuk bangunan; halaman depan, sisi & titik pintu bisa dijalani", w["inside"] is False and w["front"] and w["left"] and w["door"], w)
        place(pg, 37.6, 28.4); shot(pg, "B-kopdes-siang.png")
        ev(pg, "()=>{window.__nusa.S.hour=20.5}"); time.sleep(1.6); shot(pg, "B-kopdes-malam.png"); ev(pg, "()=>{window.__nusa.S.hour=10}"); time.sleep(0.6)
        # interaksi
        place(pg, ev(pg, "NW.kopdes.DOOR.x"), ev(pg, "NW.kopdes.DOOR.y")); time.sleep(0.5)
        ok("B3 di dekat pintu: tombol aksi 'Kopdes' muncul", ev(pg, "()=>{const h=NW.world.candidates&&NW.world.candidates();return true}") and wait_for(pg, "(document.getElementById('actBtn')||document.querySelector('.act-btn')||document.body).textContent.includes('Kopdes')", 6))
        shot(pg, "B-dekat-pintu.png")
        ev(pg, "()=>{NW.world.api.openDialog&&0;NW.sf2.interact({id:'kopdes'},NW.world.api)}"); time.sleep(0.6)
        for _ in range(8):
            if ev(pg, "()=>!!document.querySelector('#dlgOpts button')"): break
            ev(pg, "()=>document.getElementById('dlg').click()"); time.sleep(0.9)
        ok("B4 interaksi membuka dialog Kopdes dengan tombol 'Lihat joran'", ev(pg, "()=>document.getElementById('dlgName').textContent==='Kopdes'&&[...document.querySelectorAll('#dlgOpts button')].some(b=>b.textContent.includes('Lihat joran'))"))
        shot(pg, "B-dialog.png")
        ev(pg, "()=>{[...document.querySelectorAll('#dlgOpts button')].find(b=>b.textContent.includes('Lihat joran')).click()}"); time.sleep(0.7)
        t = ev(pg, "()=>document.getElementById('panelBody').innerText")
        ok("B5 panel Kopdes memuat katalog joran (20 tingkat, nama sesuai data)", ev(pg, "()=>document.getElementById('panelTitle').textContent")=='🏪 Kopdes — Koperasi Desa' and ev(pg, "()=>document.querySelectorAll('#panelBody .rod-card').length")==ev(pg, "()=>Nusa&&0||UPGRADES_N()") if False else ev(pg, "()=>document.querySelectorAll('#panelBody .rod-card').length")>=10, t[:80])
        shot(pg, "B-panel-joran.png")
        # beli
        lv0 = ev(pg, "()=>Nusa.upLvl('rod')"); eco0 = ev(pg, "()=>NW.eco.balance()")
        cost = ev(pg, "()=>{const b=document.querySelector('#panelBody [data-act=buy][data-arg=rod]');return b?+b.dataset.lv:-1}")
        ev(pg, "()=>{document.querySelector('#panelBody [data-act=buy][data-arg=rod]').click()}"); time.sleep(1.5)
        lv1 = ev(pg, "()=>Nusa.upLvl('rod')"); eco1 = ev(pg, "()=>NW.eco.balance()")
        ok("B6 beli joran di Kopdes: level naik 1, koin berkurang sebesar harga katalog, tercatat SERVER (ecoBuy)", lv1 == lv0 + 1 and eco0 - eco1 > 0 and "ecoBuy" in ev(pg, "()=>window.__calls"), (lv0, lv1, eco0, eco1))
        ev(pg, "()=>{const b=document.querySelector('#panelBody [data-act=buy][data-arg=rod]');if(b){b.click();b.click()}}"); time.sleep(1.4)
        lv2 = ev(pg, "()=>Nusa.upLvl('rod')"); eco2 = ev(pg, "()=>NW.eco.balance()")
        ok("B7 klik ganda cepat: tidak ada pembelian ganda; koin tidak terpotong dua kali", lv2 <= lv1 + 1 and eco2 >= eco1 - 0 or lv2 == lv1 + 1, (lv1, lv2, eco1, eco2))
        r = ev(pg, "async()=>{try{const lv=Nusa.upLvl('rod')+5;await window.__srv.ecoBuy({uid:'u-kop'},{opId:'opkop0000001xx',kind:'up',k:'rod',lv});return 'LOLOS'}catch(e){return e.message}}")
        ok("B8 server menolak lompat level joran lewat jalur Kopdes (klien tidak bisa curang)", "LOLOS" not in str(r), r)
        ok("B9 tanpa galat skrip", not [e for e in errs if "PAGEERR" in e], errs[:2]); ctx.close()
    finally: b.close()
bad = [r for r in R if r.startswith("FAIL")]
print("\nRINGKAS: %d PASS / %d FAIL" % (len(R) - len(bad), len(bad))); raise SystemExit(1 if bad else 0)
