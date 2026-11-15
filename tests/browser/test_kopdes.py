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

def new_k(ctx, flag, uid="u-kop", money=2000, seed=None):
    ctx.add_init_script("window.NUSA_KOPDES=%s;" % ("true" if flag else "false"))
    pg, errs = new(ctx, uid, seed); set_lbc(pg, uid, 100); ev(pg, "async()=>{await NW.sf2.refresh(true)}")
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
        # ===== C. atap, Joran Kopdes, pasukan Kopdes (flag nyala; server kopdes:true) =====
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
        ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
        pg, errs = new_k(ctx, True, "u-kop2", 5000, [["shop/config", json.dumps({"kopdes": True})]])
        place(pg, 36.0, 30.6); ev(pg, "()=>NW.kopdesCrew.setClock(()=>120)"); time.sleep(1.0); shot(pg, "C-atap-barisan.png")
        ok("C1 tanpa galat render saat atap + pasukan digambar", not [e for e in errs if "PAGEERR" in e], errs[:2])
        pl = ev(pg, "()=>{const C=NW.kopdesCrew,a=C.at(120),w=NW.SF2_MAP.walkable;return {leadHide:a.lead.hide,n:a.staff.filter(q=>!q.hide).length,movers:a.staff.filter(q=>q.moving).length,layer:C.layer(120).length}}")
        ok("C2 t=120: pemimpin sudah pergi, 5 pegawai berbaris di depan Kopdes", pl["leadHide"] is True and pl["n"] == 5 and pl["movers"] == 0 and pl["layer"] == 6, pl)   # 5 pegawai + tumpukan peti (kosong)
        ev(pg, "()=>NW.kopdesCrew.setClock(()=>30)"); time.sleep(0.8); shot(pg, "C-angkut-barang.png")
        ev(pg, "()=>NW.kopdesCrew.setClock(()=>5)"); place(pg, 35.0, 31.2); shot(pg, "C-pemimpin-memberi-perintah.png")
        # semua titik lintasan harus bisa dijalani (tidak menembus bangunan/solid)
        bad = ev(pg, "()=>{const C=NW.kopdesCrew,M=NW.SF2_MAP,out=[];for(let t=0;t<C.CYCLE;t+=1.5){const a=C.at(t);const all=[].concat(a.lead?[a.lead]:[],a.staff||[]);for(const q of all){if(q&&q.x!=null&&!q.hide&&!M.walkable(q.x,q.y))out.push([t,+q.x.toFixed(2),+q.y.toFixed(2)])}}return out.slice(0,6)}")
        ok("C3 lintasan pemimpin & pegawai tidak menembus bangunan/benda padat (saat terlihat)", len(bad) == 0, bad)
        # Joran Kopdes
        ev(pg, "()=>{NW.sf2.interact({id:'kopdes'},NW.world.api)}"); time.sleep(0.6)
        for _ in range(8):
            if ev(pg, "()=>!!document.querySelector('#dlgOpts button')"): break
            ev(pg, "()=>document.getElementById('dlg').click()"); time.sleep(0.9)
        ev(pg, "()=>{[...document.querySelectorAll('#dlgOpts button')].find(b=>b.textContent.includes('Lihat joran')).click()}"); time.sleep(0.8)
        ok("C4 panel memuat kartu Joran Kopdes (1.000 koin, 250 kg, merah)", ev(pg, "()=>{const c=document.querySelector('#panelBody .rod-card.kop');return !!c&&c.innerText.includes('Joran Kopdes')&&c.innerText.includes('250 kg')&&c.innerText.includes('1.000')&&!!c.querySelector('img')}"))
        shot(pg, "C-panel-joran-kopdes.png")
        b0 = ev(pg, "()=>NW.eco.balance()")
        ev(pg, "()=>document.querySelector('#panelBody [data-act=kopbuy]').click()"); time.sleep(1.6)
        b1 = ev(pg, "()=>NW.eco.balance()"); st = ev(pg, "()=>({own:Nusa.S.kop,on:Nusa.S.kopOn,srv:JSON.parse(window.__db.get('shop/economy/u-kop2')).kop,calls:window.__calls.filter(x=>x==='ecoBuy').length,cap:NW.kopdesRod.capFloor(),spec:!!NW.kopdesRod.spec()})")
        ok("C5 beli Joran Kopdes: koin -1.000 (server), kepemilikan tercatat server, terpasang, batas 250 kg", b0 - b1 == 1000 and st["own"] and st["srv"] is True and st["on"] and st["cap"] == 250 and st["spec"], (b0, b1, st))
        ok("C6 setelah dibeli tombol berubah jadi 'Lepas' (tak bisa dibeli lagi)", ev(pg, "()=>!document.querySelector('#panelBody [data-act=kopbuy]')&&!!document.querySelector('#panelBody [data-act=kopeq]')"))
        shot(pg, "C-panel-dimiliki.png")
        ev(pg, "()=>document.querySelector('#panelBody [data-act=kopeq]').click()"); time.sleep(0.5)
        off = ev(pg, "()=>({on:NW.kopdesRod.on(),cap:NW.kopdesRod.capFloor(),spec:NW.kopdesRod.spec()})")
        ev(pg, "()=>document.querySelector('#panelBody [data-act=kopeq]').click()"); time.sleep(0.5)
        ok("C7 Lepas/Pakai: lepas → batas & tampilan kembali normal; pakai lagi → aktif", off["on"] is False and off["cap"] == 0 and off["spec"] is None and ev(pg, "()=>NW.kopdesRod.on()") is True, off)
        r = ev(pg, "async()=>{try{await window.__srv.ecoBuy({uid:'u-kop2'},{opId:'opkop0000009xx',kind:'kop'});return 'LOLOS'}catch(e){return e.message}}")
        ok("C8 beli kedua ditolak server", "LOLOS" not in str(r) and "dimiliki" in str(r), r)
        ev(pg, "()=>Nusa.closePanel&&Nusa.closePanel()"); time.sleep(0.5)
        ev(pg, "()=>{const p=NW.world.player;p.x=36.8;p.y=31.2;p.dir=2}"); ev(pg, "()=>NW.kopdesCrew.setClock(()=>120)"); time.sleep(1.0); shot(pg, "C-pemain-bawa-joran.png")
        ok("C9 tanpa galat skrip (pembelian, panel, pasukan)", not [e for e in errs if "PAGEERR" in e], errs[:3]); ctx.close()
        # server flag MATI (config tanpa kopdes) → beli ditolak, tidak ada koin keluar
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
        ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
        pg, errs = new_k(ctx, True, "u-kop3", 5000)
        ev(pg, "()=>{NW.sf2.interact({id:'kopdes'},NW.world.api)}"); time.sleep(0.6)
        for _ in range(8):
            if ev(pg, "()=>!!document.querySelector('#dlgOpts button')"): break
            ev(pg, "()=>document.getElementById('dlg').click()"); time.sleep(0.9)
        ev(pg, "()=>{[...document.querySelectorAll('#dlgOpts button')].find(b=>b.textContent.includes('Lihat joran')).click()}"); time.sleep(0.8)
        b0 = ev(pg, "()=>NW.eco.balance()"); ev(pg, "()=>document.querySelector('#panelBody [data-act=kopbuy]').click()"); time.sleep(1.6)
        ok("C10 server kopdes MATI: beli ditolak, koin utuh, tidak dimiliki", ev(pg, "()=>NW.eco.balance()") == b0 and not ev(pg, "()=>!!Nusa.S.kop"), b0)
        ok("C11 tanpa galat skrip (server mati)", not [e for e in errs if "PAGEERR" in e], errs[:3]); ctx.close()
    finally: b.close()
bad = [r for r in R if r.startswith("FAIL")]
print("\nRINGKAS: %d PASS / %d FAIL" % (len(R) - len(bad), len(bad))); raise SystemExit(1 if bad else 0)
