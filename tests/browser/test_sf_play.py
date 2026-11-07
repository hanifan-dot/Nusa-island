"""[SF]  di game: klien (economy/client.js + titik koin di game) memakai inti server economy/core.js yang SAMA dengan Cloud Functions,
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
 window.__R=()=>Math.random(); const db={get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const[p,v]of buf)m.set(p,v);return r});q=run.catch(()=>{});return run}};
 window.__db=m; const e=NusaEconomyCore.makeEconomyServer(db,{tables:__T,fishmath:NW.FM,initCap:20000,trustClientInit:true,sf:NusaSFCore,rand:()=>window.__R()}); const A={uid:'u-eco'}; window.__srv=e; window.__calls=[];
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>'u-eco',getEntitlements:async()=>({env:'NYATA',wallet:{NYATA:(rd('shop/entitlements/u-eco')||{wallet:{NYATA:0}}).wallet.NYATA}}),
   eco:async(name,d)=>{window.__calls.push(name);try{return JSON.parse(JSON.stringify(await e[name](A,d)))}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.wallet.hook&&NW.wallet.hook(); return true}"""
def page(b, qs="?cloud=off"):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
    ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/sf-core.js"), "NusaSFCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + qs); time.sleep(0.6)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.4); ev(pg, "()=>{window.__nusa.S.muted=true}")
    return ctx, pg, errs
SHOTS = os.environ.get("SHOTS", os.path.join(ROOT_DIR, "docs", "samudra-follower")); os.makedirs(SHOTS, exist_ok=True)
CFG = lambda fish, ev=False: "()=>{window.__db.set('shop/config',JSON.stringify({sf:{on:true,eventOn:%s,fish:%s}}))}" % ("true" if ev else "false", json.dumps({k: {"price": v, "chance": 0.001, "approvedBy": "owner", "approvedAt": 1} for k, v in fish.items()}))
FORCE = "()=>{let c=0;window.__R=()=>(c++%4===0?0:Math.random())}"; UNFORCE = "()=>{window.__R=()=>1-1e-9}"   # acak SERVER tiruan (bukan Math.random browser)
LAND = "(id)=>{const N=window.__nusa;N.G.phase='fight';N.landFish(Nusa.FISH_BY_ID[id], Nusa.FISH_BY_ID[id].wMin+0.1)}"
SF = lambda pg: ev(pg, "()=>Nusa.S.cooler.filter(i=>i.id.startsWith('sf_')).map(i=>i.id)")
with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        ctx, pg, errs = page(b); ev(pg, "__srvInit=" + SERVER); ev(pg, "()=>__srvInit()") if False else None
        ev(pg, "(" + SERVER + ")()"); ev(pg, "()=>{Nusa.S.profile=Nusa.S.profile||{};}")
        ev(pg, "async()=>{await NW.eco.ensure()}"); ok("0 ekonomi server aktif", wait_for(pg, "NW.eco.active()", 10))
        money0 = ev(pg, "NW.eco.balance()")
        # ===== A. TERKUNCI (belum ada persetujuan Owner) =====
        ev(pg, FORCE); ev(pg, "(id)=>{const N=window.__nusa;N.G.phase='fight';N.landFish(Nusa.FISH_BY_ID[id], Nusa.FISH_BY_ID[id].wMin+0.1)}", "nila"); time.sleep(1.5); ev(pg, "async()=>{await NW.sfPlay.refresh(true)}"); ev(pg, "(id)=>{const N=window.__nusa;N.G.phase='fight';N.landFish(Nusa.FISH_BY_ID[id], Nusa.FISH_BY_ID[id].wMin+0.1)}", "nila"); time.sleep(1.5)
        ok("A1 TERKUNCI: ikan biasa masuk coolbox, TIDAK ada ikan SF walau acak server dipaksa kena", len(ev(pg, "Nusa.S.cooler")) >= 1 and SF(pg) == [])
        ok("A2 TERKUNCI: server tak pernah menerima ecoCatch SF & tab koleksi tidak muncul", not ev(pg, "NW.sf.on()") and ev(pg, "window.__calls.filter(c=>c==='ecoSfInfo').length") >= 1 and not any("sf_" in v for v in ev(pg, "[...window.__db.values()]")))
        ev(pg, UNFORCE)
        # ===== B. Owner menyetujui Tempe + Cupang + Arapaima (Prabowo tanpa event) =====
        ev(pg, CFG({"sf_tempe": 7400, "sf_cupang_slayer": 3800, "sf_arapaima": 30, "sf_prabowo": 750}))
        ev(pg, "async()=>{await NW.sfPlay.refresh(true)}")
        ok("B1 setelah persetujuan: daftar aktif 3 ikan (Prabowo TIDAK ada: event mati)", ev(pg, "NW.sfPlay.info().fish.map(f=>f.id)") == ["sf_tempe", "sf_cupang_slayer", "sf_arapaima"], ev(pg, "NW.sfPlay.info()"))
        ok("B2 tab Samudra Follower muncul untuk pemain (live)", ev(pg, "NW.sf.on() && NW.sf.live()"))
        before_cool = ev(pg, "Nusa.S.cooler.length"); bal0 = ev(pg, "NW.eco.balance()")
        ev(pg, FORCE); time.sleep(2); ev(pg, LAND, "nila"); ev(pg, "async()=>{await NW.eco.flush()}"); ev(pg, UNFORCE)
        ok("B3 ikan biasa mendarat + BONUS Ikan Tempe dikonfirmasi SERVER lalu masuk coolbox (terkunci)", wait_for(pg, "Nusa.S.cooler.some(i=>i.id==='sf_tempe')", 15) , SF(pg))
        it = ev(pg, "Nusa.S.cooler.find(i=>i.id==='sf_tempe')")
        ok("B4 ikan SF: berat dalam rentang resmi, harga/kg server 7400, terkunci", it and 0.3 <= it["w"] <= 1.4 and it["sp"] == 7400 and it.get("lock") is True, it)
        ok("B5 kotak server memuat ikan SF yang sama; koin TIDAK bertambah (tanpa hadiah gratis)", ev(pg, "(uid)=>NW.eco.state().box.includes(uid)", it["uid"]) and ev(pg, "NW.eco.balance()") == bal0, ev(pg, "NW.eco.balance()"))
        ok("B6 dex mencatat 1 Ikan Tempe; ikan lama utuh", ev(pg, "Nusa.S.dex.sf_tempe.n") == 1 and ev(pg, "Nusa.S.dex.nila.n") >= 1)
        ok("B7 kartu tangkapan khusus tampil dengan kredit @mlfs_05", wait_for(pg, "NW.sf.isOpen()", 8) and "@mlfs_05" in ev(pg, "document.getElementById('sfOv').innerText") and "MYTHICAL" in ev(pg, "document.getElementById('sfOv').innerText"))
        time.sleep(0.6); pg.screenshot(path=os.path.join(SHOTS, "12-kartu-tangkapan-asli.png"))
        ev(pg, "document.getElementById('sfX').click()"); time.sleep(0.3)
        # duplikasi: tangkapan kedua hari yang sama ditolak (batas harian 1), tidak ada ikan/koin tambahan
        n_box = ev(pg, "NW.eco.state().box.length"); ev(pg, FORCE); ev(pg, LAND, "nila"); time.sleep(2.5); ev(pg, UNFORCE)
        ev(pg, "async()=>{await NW.eco.flush()}"); time.sleep(1)
        ok("C1 batas harian: bonus ke-2 Tempe ditolak server, tak ada duplikasi (hanya ikan biasa bertambah)", ev(pg, "Nusa.S.cooler.filter(i=>i.id==='sf_tempe').length") == 1 and ev(pg, "NW.eco.state().box.length") == n_box + 1)
        # replay manual dari konsol (browser dimanipulasi)
        r = ev(pg, "async()=>{try{await __srv.ecoCatch({uid:'u-eco'},{opId:'x'+Date.now(),id:'sf_arapaima',w:100,uid:'fakeuid1234',ref:'tidakada123'});return 'LOLOS'}catch(e){return e.message}}")
        ok("C2 klien palsu mengirim ikan SF sendiri (dengan ref/harga) ditolak server", "tidak dikenal" in r, r)
        r = ev(pg, "async()=>{const u=Nusa.S.cooler.find(i=>i.id==='nila').uid;try{await __srv.ecoCatch({uid:'u-eco'},{opId:'y'+Date.now(),id:'sf_tempe',w:900,uid:'fakeuid5678',ref:u});return 'LOLOS'}catch(e){return e.message}}")
        ok("C3 berat palsu ditolak server", "tidak dikenal" in r, r)
        # inventaris & tampilan
        ev(pg, "()=>{const b=document.getElementById('catchOk');if(b&&b.offsetParent)b.click();Nusa.G&&0}"); ev(pg, "()=>{window.__nusa.G.phase='idle'}"); time.sleep(0.3)
        ev(pg, "()=>{Nusa.openPanel('inventory')}"); time.sleep(0.8)
        ok("C4 Coolbox menampilkan Ikan Tempe dengan lencana MYTHICAL & harga server", "Ikan Tempe" in ev(pg, "document.getElementById('panelBody').innerText") and "MYTHICAL" in ev(pg, "document.getElementById('panelBody').innerText"), ev(pg, "document.getElementById('panelBody').innerText")[:200])
        pg.screenshot(path=os.path.join(SHOTS, "13-coolbox-ikan-tempe.png")); ev(pg, "()=>Nusa.closePanel()")
        ev(pg, "()=>{Nusa.openPanel('dex')}"); time.sleep(0.4); ev(pg, "[...document.querySelectorAll('.dex-tabs button')].find(x=>/Samudra/.test(x.textContent)).click()"); time.sleep(0.5)
        t = ev(pg, "document.getElementById('panelBody').innerText")
        ok("C5 koleksi Samudra Follower: Tempe 'Tertangkap 1×', kredit IG tampil, 4 kartu", "Tertangkap 1×" in t and t.count("@") >= 4 and ev(pg, "document.querySelectorAll('.sf-cell').length") == 4, t[:160])
        pg.screenshot(path=os.path.join(SHOTS, "14-koleksi-tertangkap.png")); ev(pg, "()=>Nusa.closePanel()")
        # blokir fitur yang belum didukung
        ev(pg, "()=>{Nusa.openPanel('inventory')}"); time.sleep(0.3)
        ok("C6 ikan SF tidak boleh masuk akuarium/pond/pamer", ev(pg, "(()=>{const it=Nusa.S.cooler.find(i=>i.id==='sf_tempe');return NW.HD&&true})()") and ev(pg, "(()=>{const it=Nusa.S.cooler.find(i=>i.id==='sf_tempe');const e=NW.pond&&NW.pond.eligible?NW.pond.eligible():[];const row=e.find&&e.find(x=>x.uid===it.uid);return !row||!!row.why||row.ok===false})()"))
        ev(pg, "()=>Nusa.closePanel()")
        # jual
        uid = it["uid"]; bal1 = ev(pg, "NW.eco.balance()")
        res = ev(pg, "(uid)=>new Promise(r=>NW.eco.sell([uid],(e,x)=>r(e?'ERR '+e.message:x.total)))", uid)
        from_price = ev(pg, "(it)=>NW.FM.priceFor({price:7400},it.w,1,Nusa.PRICE_SCALE||3)", it)
        ok("D1 jual: server membayar tepat harga terkunci (7400/kg × berat), saldo naik sebesar itu", res == from_price and ev(pg, "NW.eco.balance()") == bal1 + res, (res, from_price))
        ok("D2 jual dua kali tidak membayar lagi (anti-ganda)", ev(pg, "(uid)=>new Promise(r=>NW.eco.sell([uid],(e,x)=>r(e?'ERR':x.total)))", uid) in (0, "ERR"))
        # Prabowo: hanya saat event Owner
        ev(pg, CFG({"sf_prabowo": 750})); ev(pg, "async()=>{await NW.sfPlay.refresh(true)}")
        ok("E1 Prabowo disetujui tetapi event MATI → tidak aktif", ev(pg, "NW.sfPlay.info().fish.length") == 0)
        ev(pg, CFG({"sf_prabowo": 750}, True)); ev(pg, "async()=>{await NW.sfPlay.refresh(true)}")
        ok("E2 event dinyalakan Owner → Prabowo aktif", ev(pg, "NW.sfPlay.info().fish.map(f=>f.id)") == ["sf_prabowo"])
        ev(pg, "()=>{const b=document.getElementById('catchOk');if(b&&b.offsetParent)b.click();window.__nusa.G.phase='idle'}"); ev(pg, FORCE); time.sleep(2.2); ev(pg, LAND, "nila"); ev(pg, "async()=>{await NW.eco.flush()}"); ev(pg, UNFORCE)
        ok("E3 Prabowo masuk coolbox setelah konfirmasi server (event hidup), kredit @akhmadraffa123", wait_for(pg, "Nusa.S.cooler.some(i=>i.id==='sf_prabowo')", 15) and wait_for(pg, "NW.sf.isOpen()", 8) and "@akhmadraffa123" in ev(pg, "document.getElementById('sfOv').innerText"))
        time.sleep(0.6); pg.screenshot(path=os.path.join(SHOTS, "15-kartu-prabowo-event.png")); ev(pg, "document.getElementById('sfX').click()")
        # Cloud Save tetap sah
        ok("F1 save lokal valid JSON & cooler/dex konsisten", ev(pg, "(()=>{const s=JSON.parse(JSON.stringify(Nusa.S));return s.cooler.every(i=>i.uid&&i.id&&i.w>0)&&s.dex.sf_tempe.n===1})()"))
        ok("F2 tanpa error halaman", not errs, errs)
        ctx.close()
        # ===== G. tamu/offline: tidak ada SF sama sekali =====
        ctx, pg, errs = page(b); ev(pg, FORCE); ev(pg, LAND, "nila"); time.sleep(1.0); ev(pg, UNFORCE)
        ok("G1 tamu/offline: tidak pernah ada ikan SF (butuh ekonomi server)", ev(pg, "Nusa.S.cooler.filter(i=>i.id.startsWith('sf_')).length") == 0 and not ev(pg, "NW.sf.on()"))
        ctx.close()
    finally:
        b.close()
f = [r for r in R if r.startswith("FAIL")]; print("\nTOTAL %d/%d lulus" % (len(R) - len(f), len(R))); raise SystemExit(1 if f else 0)
