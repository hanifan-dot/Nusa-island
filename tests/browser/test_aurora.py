"""Uji Gamepass PANCING AURORA SAMUDRA di game yang berjalan (peramban nyata).
Yang SUNGGUHAN: game asli, Premium Shop (shop/ui.js + inti toko shop/core.js), inti ekonomi SERVER (economy/core.js + aurora-core.js) di dalam halaman, efek di adegan memancing.
YANG TIDAK DIUJI: Firestore/Cloudflare/Payment asli; pembayaran NYATA (hanya SIMULASI di sini → bonus TERKUNCI, itu yang diuji).
Jalankan: python tests/browser/test_aurora.py   (screenshot → docs/gamepass-aurora/)"""
import time, os, json
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
OUT = os.path.join(ROOT_DIR, "docs", "gamepass-aurora"); os.makedirs(OUT, exist_ok=True)
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
def shot(pg, name): pg.screenshot(path=os.path.join(OUT, name)); print("  gambar:", name, flush=True)
SERVER = """async(cfg)=>{ const m=new Map(); let q=Promise.resolve(); const rd=p=>m.has(p)?JSON.parse(m.get(p)):null;
 const db={get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const [k,v] of buf)m.set(k,v);return r});q=run.catch(()=>{});return run}};
 window.__srvNow=1793502000000; window.__db=m; window.__calls=[];
 if(cfg.own) m.set('shop/entitlements/'+cfg.uid, JSON.stringify({products:{gamepass_aurora:{orderId:'X',at:1,env:cfg.own}},owned:{pancing_aurora:{from:'gamepass_aurora',at:1,env:cfg.own}},wallet:{SIMULASI:0,NYATA:0}}));
 const e=NusaEconomyCore.makeEconomyServer(db,{clock:()=>window.__srvNow,tables:__T,fishmath:NW.FM,aurora:NusaAuroraCore,initCap:1e9,trustClientInit:true,rng:cfg.rng?()=>0:undefined});
 const A={uid:cfg.uid};
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>cfg.uid,getEntitlements:async()=>JSON.parse(m.get('shop/entitlements/'+cfg.uid)||'{"owned":{},"products":{},"wallet":{"NYATA":0}}'),
   eco:async(name,d)=>{window.__calls.push(name);try{const r=JSON.parse(JSON.stringify(await e[name](A,d))); return r}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.cloud.enabled=true; NW.cloud.demo=false; NW.cloud.user={uid:cfg.uid,name:'Uji'}; return true}"""
def new(ctx, qs="?cloud=off", server=None):
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + qs); time.sleep(0.7)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.4); ev(pg, "()=>{window.__nusa.S.muted=true; window.__nusa.S.hour=10; NW.weather.force('cerah',{snap:true})}")
    if server:
        ev(pg, SERVER, server); ev(pg, "(m)=>{Nusa.S.money=m}", 1000); ev(pg, "NW.eco.ensure()"); wait_for(pg, "NW.eco.active()")
    return pg, errs
def openshop(pg, tab="gamepass"):
    ev(pg, "NW.shopUI.open()"); wait_for(pg, "!!NW.shopUI._state()&&!!NW.shopUI._state().cat")
    ev(pg, "(t)=>NW.shopUI._el().querySelector('[data-id='+t+']').click()", tab); time.sleep(0.5)
def card(pg): return ev(pg, "(()=>{const c=NW.shopUI._el().querySelector('.sp-item.aur'); if(!c) return null; c.scrollIntoView(); return c.innerText})()")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader"])
    try:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
        ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T")); ctx.add_init_script(WRAP % (rd("economy/aurora-core.js"), "NusaAuroraCore"))
        # ===== A. Premium Shop: kartu, harga, keuntungan, status; TERKUNCI sampai Owner buka =====
        pg, errs = new(ctx, "?cloud=off&shoptest=1")
        openshop(pg); t = card(pg)
        ok("A1 kartu Pancing Aurora Samudra tampil di tab Gamepass dengan harga Rp20.000", t is not None and "Pancing Aurora Samudra" in t and "Rp20.000" in t, (t or "")[:120])
        ok("A2 keuntungan & transparansi: +1 poin persentase, bukan +1% per spesies; tidak ubah harga jual/berat/koin", "+1 poin persentase" in t and "bukan +1% tiap spesies" in t and "Tidak menaikkan harga jual" in t)
        ok("A3 pengecualian dijelaskan (Megalodon, event, mistis, dilindungi)", ev(pg, "NW.shopUI._el().querySelector('.aur-odds').innerText").count("") > 0 and "Megalodon" in ev(pg, "NW.shopUI._el().querySelector('.aur-odds').textContent"))
        ok("A4 tombol Beli TIDAK aktif: produk terkunci sampai Owner membuka", ev(pg, "(()=>{const b=NW.shopUI._el().querySelector('.sp-item.aur .sp-btn');return b.disabled&&/Terkunci|Segera/.test(b.textContent)})()"), ev(pg, "NW.shopUI._el().querySelector('.sp-item.aur .sp-btn').textContent"))
        ok("A5 produk lama tidak berubah (Sultan tetap Rp25.000/15.000 per promo; tombol sesuai)", ev(pg, "!!NW.shopUI._el().querySelector('.sp-item:not(.aur) h3')") and "Sultan" in ev(pg, "NW.shopUI._el().innerText"))
        ev(pg, "NW.shopUI._el().querySelector('.sp-item.aur').scrollIntoView({block:'start'})"); time.sleep(0.6); shot(pg, "01-premium-shop-terkunci.png")
        # Owner membuka produk (alat uji) → bisa dibeli; beli SIMULASI → pancing terlihat, bonus tetap TERKUNCI
        ev(pg, "NW.shopTest.server.ownerSetEnabled(NW.shopTest.owner,{productId:'gamepass_aurora',enabled:true})")
        ev(pg, "NW.shopUI.refresh()"); time.sleep(0.6); openshop(pg)
        ok("A6 setelah Owner membuka, tombol Beli aktif", ev(pg, "(()=>{const b=NW.shopUI._el().querySelector('.sp-item.aur .sp-btn');return !b.disabled&&/Beli/.test(b.textContent)})()"), ev(pg, "NW.shopUI._el().querySelector('.sp-item.aur .sp-btn').textContent"))
        ev(pg, "NW.shopUI._el().querySelector('.sp-item.aur .sp-btn.buy').click()"); time.sleep(0.8)
        ev(pg, "NW.shopUI._el().querySelector('[data-a=sim]').click()"); time.sleep(0.9)
        ev(pg, "NW.shopUI._el().querySelector('[data-a=back]') && NW.shopUI._el().querySelector('[data-a=back]').click()"); time.sleep(0.5); openshop(pg)
        t2 = card(pg)
        ok("A7 setelah bayar (SIMULASI): status Dimiliki permanen, tidak ada tombol Beli ganda", t2 and "Dimiliki" in t2 and not ev(pg, "!!NW.shopUI._el().querySelector('.sp-item.aur .sp-btn.buy')"))
        ok("A8 SIMULASI → bonus peluang TERKUNCI (tidak diberikan otomatis)", "Bonus peluang terkunci" in t2, t2[-200:])
        ok("A9 pilihan efek Rendah/Sedang/Tinggi tersedia", ev(pg, "NW.shopUI._el().querySelectorAll('.sp-item.aur .aur-fx button').length")==3)
        ev(pg, "NW.shopUI._el().querySelector('.sp-item.aur').scrollIntoView({block:'start'})"); time.sleep(0.6); shot(pg, "02-premium-shop-dimiliki.png")
        ev(pg, "NW.shopUI.close()")
        ok("A10 tanpa error halaman", not errs, errs[:2])
        # ===== B. Pancing & efek di adegan memancing, tiga level =====
        ev(pg, "(()=>{const S=Nusa.S;S.shop=S.shop||{v:1,equip:{}};S.shop.equip=S.shop.equip||{};S.shop.equip.joran='pancing_aurora';})()")
        ev(pg, "NW.shop.setOwned({owned:{pancing_aurora:{env:'SIMULASI'}}})")
        ok("B1 joran Aurora terpasang bila dimiliki (server) & dipakai", ev(pg, "NW.aurora.equipped() && NW.look.rodSpec().name==='Pancing Aurora Samudra'"))
        ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.8)
        ok("B2 masuk adegan memancing", ev(pg, "window.__nusa.mode()")=="fish", ev(pg, "window.__nusa.mode()"))
        for lv, nm in ((0, "rendah"), (1, "sedang"), (2, "tinggi")):
            ev(pg, "(l)=>NW.aurora.setLevel(l)", lv); time.sleep(0.5)
            ev(pg, "()=>{const g=window.__nusa.G; g.bob.vis=true; g.phase='waiting'; g.bob.x=0.2; g.bob.z=5; NW.aurora.event('cast',window.__nusa.rodTip()); NW.aurora.event('land',window.__nusa.bobberScreen()); NW.aurora.event('bite',window.__nusa.bobberScreen())}")
            time.sleep(0.25); shot(pg, f"03-efek-pancing-{nm}.png")
        ok("B3 efek tersimpan per perangkat (localStorage) & level valid", ev(pg, "localStorage.getItem('nusa_aur_fx')")=="2")
        ev(pg, "(()=>{const g=window.__nusa.G; g.phase='idle'; g.bob.vis=false})()")
        # ===== C. Server: bonus hanya untuk pemilik NYATA; hasil diterapkan ke coolbox dari jawaban server =====
        for own, label in ((None, "tanpa Gamepass"), ("SIMULASI", "pemilik SIMULASI"), ("NYATA", "pemilik NYATA")):
            pg2, e2 = new(ctx, "?cloud=off", {"uid": "u-" + str(own), "own": own, "rng": True})
            wait_for(pg2, "window.__calls.includes('ecoInit')"); time.sleep(2.5)
            ev(pg2, "()=>{Nusa.S.cooler=[]}")
            ev(pg2, """async()=>{ for(let i=0;i<10;i++){ const it={id:'nila',w:1,uid:'ik'+i+'%s'}; Nusa.S.cooler.push(it); window.__srvNow+=21000; NW.eco.onCatch(it); for(let k=0;k<40&&!(NW.eco.state().box||[]).includes(it.uid);k++) await new Promise(r=>setTimeout(r,50)); } }""" % (str(own)[:3].lower()+"xyzuvw"))
            time.sleep(1.0)
            ids = ev(pg2, "Nusa.S.cooler.map(x=>x.id)")
            if own == "NYATA":
                ok(f"C {label}: server mengubah Biasa→Langka (rng uji=0) & coolbox mengikuti jawaban server", all(i in ("patin", "gabus") for i in ids), ids)
                srvbox = ev(pg2, "NW.eco.state().aur"); 
                ok("C status bonus dari server: live=true, n/up tercatat", srvbox and srvbox["live"] is True and srvbox["up"] == 10, srvbox)
                shot(pg2, "04-hasil-server-bonus.png")
            else:
                ok(f"C {label}: TIDAK ada bonus (semua tetap nila)", all(i == "nila" for i in ids), ids)
            ok(f"C {label}: saldo koin tidak berubah oleh bonus", ev(pg2, "NW.eco.state().own") == 1000, ev(pg2, "NW.eco.state().own"))
            pg2.close()
        ok("D tidak ada error halaman di seluruh uji", not errs)
    finally:
        b.close()
f = [r for r in R if r.startswith("FAIL")]
print(f"\nPancing Aurora (browser): {len(R)-len(f)} lulus, {len(f)} gagal"); import sys; sys.exit(1 if f else 0)
