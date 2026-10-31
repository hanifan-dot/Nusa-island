"""Uji terarah EKONOMI SERVER di game: klien (economy/client.js + titik koin di game) memakai inti server economy/core.js yang SAMA dengan Cloud Functions,
di dalam halaman (bukan Firebase sungguhan). Menguji: dompet satu angka, harga dari server, jual lewat kotak ikan server, browser dimanipulasi
(S.money, panggilan palsu), hadiah sekali, misi dibatasi, pembelian upgrade hanya setelah server setuju, dan tamu/offline tetap perilaku lama.
Jalankan: python tests/browser/test_ekonomi.py"""
import time, json, os
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
SERVER = """async()=>{ const m=new Map(); let q=Promise.resolve(); const rd=p=>m.has(p)?JSON.parse(m.get(p)):null;
 const db={get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const[p,v]of buf)m.set(p,v);return r});q=run.catch(()=>{});return run}};
 window.__db=m; const e=NusaEconomyCore.makeEconomyServer(db,{tables:__T,fishmath:NW.FM,initCap:20000,trustClientInit:true}); const A={uid:'u-eco'}; window.__srv=e; window.__calls=[];
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>'u-eco',getEntitlements:async()=>({env:'NYATA',wallet:{NYATA:(rd('shop/entitlements/u-eco')||{wallet:{NYATA:0}}).wallet.NYATA}}),
   eco:async(name,d)=>{window.__calls.push(name);try{return JSON.parse(JSON.stringify(await e[name](A,d)))}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.wallet.hook&&NW.wallet.hook(); return true}"""
def page(b, qs="?cloud=off"):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
    ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + qs); time.sleep(0.6)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.4); ev(pg, "()=>{window.__nusa.S.muted=true}")
    return ctx, pg, errs
CATCH = "({w,id})=>{const f=Nusa.FISH_BY_ID[id];const it={uid:NW.HD.newUid(Nusa.S,'i'),id,w:w||f.wMin,t:Date.now()};Nusa.S.cooler.push(it);NW.eco.onCatch(it);return it.uid}"
with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        # ===== A. tamu/offline: perilaku lama =====
        ctx, pg, errs = page(b)
        ev(pg, "()=>{const S=Nusa.S;S.cooler=[{uid:'g1',id:'nila',w:1,t:1}];S.money=10}")
        ok("A1 tamu: ekonomi server TIDAK aktif, dompet = S.money lokal", ev(pg, "()=>[NW.eco.active(),NW.wallet.bal()]") == [False, 10])
        ev(pg, "()=>Nusa.earn('story:ch1',150)"); ok("A2 tamu: hadiah tetap masuk lokal (perilaku lama)", ev(pg, "Nusa.S.money") == 160)
        ok("A3 tamu: belanja lokal tetap jalan", ev(pg, "()=>{let g=0;const a=Nusa.charge(100,'up:rod',()=>{g++});return [a,g,Nusa.S.money]}") == [True, 1, 60])
        price = ev(pg, "()=>Nusa.priceOf(Nusa.S.cooler[0])"); ev(pg, "()=>NW.inv.execSell(['g1'])")
        ok("A4 tamu: jual ikan sinkron seperti dulu", ev(pg, "[Nusa.S.cooler.length,Nusa.S.money]") == [0, 60 + price]); ok("A5 tanpa error JS", errs == [], errs); ctx.close()

        # ===== B. ekonomi server aktif =====
        ctx, pg, errs = page(b); ev(pg, SERVER)
        ev(pg, "()=>{Nusa.S.money=777;Nusa.S.up.rod=3;Nusa.S.cooler=[]}")
        ok("B1 ensure(): akun diinisialisasi server, ekonomi aktif", ev(pg, "NW.eco.ensure()") is True and ev(pg, "NW.eco.active()"))
        ok("B2 saldo awal = koin lama (dibatasi) & upgrade lama diakui SEKALI", ev(pg, "[NW.wallet.bal(),Nusa.S.up.rod]") == [777, 3])
        ev(pg, "()=>{Nusa.S.money=9e9;Nusa.S.up.rod=9;Nusa.S.up.boat=4}")
        ok("B3 HUD/dompet memakai angka server, bukan S.money yang dimanipulasi", ev(pg, "NW.wallet.bal()") == 777 and ev(pg, "document.getElementById('money').textContent").replace(".", "").replace(",", "") == "777")
        ok("B4 belanja besar dengan S.money palsu DITOLAK (saldo server tak cukup)", ev(pg, "()=>{let g=0;const a=Nusa.charge(50000,'up:rod',()=>{g++});return [a,g]}") == [False, 0])
        ev(pg, "NW.eco.ensure()"); ok("B5 sinkron ulang: server menimpa nilai palsu di browser", ev(pg, "[Nusa.S.money,Nusa.S.up.rod,Nusa.S.up.boat]") == [777, 3, 0])
        # tangkap + jual
        uid = ev(pg, CATCH, {"w": 1.2, "id": "nila"}); ev(pg, "NW.eco.flush()")
        ok("B6 tangkapan tercatat di kotak ikan server", wait_for(pg, "NW.eco.state().box.length===1"))
        price = ev(pg, "(uid)=>Nusa.priceOf(Nusa.S.cooler.find(x=>x.uid===uid))", uid)
        ev(pg, "(uid)=>NW.inv.execSell([uid])", uid)
        ok("B7 jual: koin naik persis sebesar harga resmi, ikan keluar dari coolbox", wait_for(pg, "Nusa.S.cooler.length===0") and ev(pg, "NW.wallet.bal()") == 777 + price, ev(pg, "NW.wallet.bal()"))
        ok("B8 jual ulang uid yang sama = 0 koin (tak bisa dua kali)", ev(pg, "async(uid)=>(await NW.shopApi.eco('ecoSell',{opId:'dup'+Date.now(),uids:[uid],day:1})).total", uid) == 0)
        ok("B9 server menolak jual ikan karangan klien", ev(pg, "async()=>{Nusa.S.cooler.push({uid:'fake12345',id:'napoleon',w:150,t:1});const r=await NW.shopApi.eco('ecoSell',{opId:'fk'+Date.now(),uids:['fake12345'],day:1});return [r.total,r.unknown.length]}") == [0, 1])
        ev(pg, "()=>{Nusa.S.cooler=[]}")
        # protected + hadiah
        ev(pg, "()=>{window.__t0=Date.now()}"); time.sleep(1.6)
        r = ev(pg, "async()=>{const f=Nusa.FISH_BY_ID[Object.keys(Nusa.FISH_BY_ID).find(k=>Nusa.FISH_BY_ID[k].protected)];const b0=NW.wallet.bal();let rw=null;NW.eco.release(f,f.wMin,x=>rw=x);for(let i=0;i<50&&rw===null;i++)await new Promise(r=>setTimeout(r,100));return [rw>0,NW.wallet.bal()-b0===rw]}")
        ok("B10 ikan dilindungi: hadiah dihitung & dibayar server", r == [True, True], r)
        b0 = ev(pg, "NW.wallet.bal()"); ev(pg, "()=>{Nusa.earn('selat:bab3',350);Nusa.earn('selat:bab3',350)}"); wait_for(pg, "NW.wallet.bal()>=%d" % (b0 + 350)); time.sleep(0.5)
        ok("B11 hadiah cerita masuk sekali saja (diklaim dua kali)", ev(pg, "NW.wallet.bal()") == b0 + 350)
        ok("B12 kunci hadiah palsu ditolak server", ev(pg, "async()=>{try{await NW.shopApi.eco('ecoReward',{opId:'hk'+Date.now(),key:'x:999999'});return 'BISA'}catch(e){return 'ditolak'}}") == "ditolak")
        # misi
        b0 = ev(pg, "NW.wallet.bal()")
        ok("B13 klaim misi 99999 koin ditolak server (batas wajar)", ev(pg, "async()=>{try{await NW.shopApi.eco('ecoMission',{opId:'m'+Date.now(),mid:'p#m0:sell',coins:99999});return 'BISA'}catch(e){return 'ditolak'}}") == "ditolak" and ev(pg, "NW.wallet.bal()") == b0)
        # beli
        ev(pg, "NW.eco.ensure()")
        lv = ev(pg, "Nusa.S.up.bait"); cost = ev(pg, "UPGRADES.bait.cost[%d]" % (lv + 1)); bal = ev(pg, "NW.wallet.bal()")
        r = ev(pg, "async()=>{let g=0;const a=Nusa.charge(%d,'up:bait',()=>{Nusa.S.up.bait++;g++});const early=Nusa.S.up.bait;for(let i=0;i<40&&!g;i++)await new Promise(r=>setTimeout(r,100));return [a,g,early,Nusa.S.up.bait]}" % cost)
        ok("B14 beli umpan: barang diberikan SETELAH server setuju; saldo turun sesuai harga server", r == [True, 1, lv, lv + 1] and ev(pg, "NW.wallet.bal()") == bal - cost and ev(pg, "async()=>(await NW.shopApi.eco('ecoState',{})).up.bait") == lv + 1, [r, bal, cost])
        r = ev(pg, "async()=>{try{await NW.shopApi.eco('ecoBuy',{opId:'bb'+Date.now(),kind:'up',k:'boat',lv:4});return 'BISA'}catch(e){return 'ditolak'}}")
        ok("B15 lompat level / tanpa saldo ditolak server", r == "ditolak")
        # simpanan cloud menimpa
        ev(pg, "()=>{Nusa.S.money=5e8}")
        ok("B16 uji: server tetap memegang saldo setelah browser dimanipulasi", ev(pg, "async()=>(await NW.shopApi.eco('ecoState',{})).own") < 1e6)
        ok("B17 tanpa error JS", errs == [], errs); ctx.close()
    finally:
        pass
    b.close()
fails = [r for r in R if r.startswith("FAIL")]
print("\n%d PASS, %d FAIL" % (len(R) - len(fails), len(fails))); raise SystemExit(1 if fails else 0)
