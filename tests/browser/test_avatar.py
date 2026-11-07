"""Uji Tugas 2.6 Avatar & Fashion di game yang berjalan (peramban nyata): UI Edit Avatar / Toko Fashion / Koleksi Sultan, coba gratis, beli (server
ekonomi SAMA seperti produksi, di dalam halaman), simpan, muat ulang, 8 arah + memancing, pemain lain, mode efek hemat, manipulasi browser.
Jalankan: python tests/browser/test_avatar.py   (screenshot asli → docs/avatar-fashion/)"""
import time, os, json
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
OUT = os.path.join(ROOT_DIR, "docs", "avatar-fashion"); os.makedirs(OUT, exist_ok=True)
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
# server ekonomi nyata di halaman; basis data disimpan ke localStorage agar "muat ulang / login ulang" menguji persistensi sungguhan
SERVER = """async(cfg)=>{ const m=new Map(Object.entries(JSON.parse(localStorage.getItem('__fdb')||'{}'))); let q=Promise.resolve(); const rd=p=>m.has(p)?JSON.parse(m.get(p)):null;
 const db={get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});
   for(const [k,v] of buf)m.set(k,v); localStorage.setItem('__fdb',JSON.stringify(Object.fromEntries(m))); return r});q=run.catch(()=>{});return run}};
 window.__srvNow=1793502000000; window.__calls=[]; const e=NusaEconomyCore.makeEconomyServer(db,{clock:()=>window.__srvNow,tables:__T,fishmath:NW.FM,fashion:NusaFashionCore,initCap:1e9,trustClientInit:true});
 const A={uid:cfg.uid}; window.__db=m;
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>cfg.uid,getEntitlements:async()=>({env:'NYATA',wallet:{NYATA:0}}),
   eco:async(name,d)=>{window.__calls.push(name); if(cfg.noFashion&&/Fashion/.test(name)) throw Object.assign(new Error('Fungsi tidak ditemukan'),{code:'not-found'});
     try{return JSON.parse(JSON.stringify(await e[name](A,d)))}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.wallet.hook&&NW.wallet.hook(); NW.cloud.enabled=true; NW.cloud.demo=false; NW.cloud.user={uid:cfg.uid,name:'Uji'}; return true}"""
def start(ctx, money=None, url=None, server=True, cfg=None):
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(url or (ROOT + "?cloud=off")); time.sleep(0.6)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.4); ev(pg, "()=>{Nusa.S.muted=true}")
    if server:
        ev(pg, SERVER, cfg or {"uid": "u-av"})
        if money is not None: ev(pg, "(m)=>{Nusa.S.money=m}", money)
        ev(pg, "NW.eco.ensure()"); wait_for(pg, "NW.eco.active()")
    return pg, errs
def shot(pg, name):
    pg.screenshot(path=os.path.join(OUT, name)); print("  gambar:", name, flush=True)
def dismiss(pg):
    ev(pg, "()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Nanti');if(b)b.click()}"); time.sleep(0.3)
def open_avatar(pg):
    pg.locator("#hudMenuBtn").click(); time.sleep(0.3); pg.locator(".hm-tile[data-for='avatarBtn']").click(); time.sleep(0.3)
def bal(pg): return ev(pg, "NW.eco.balance()")
def click(pg, act, arg=None):
    sel = "[data-act='%s']" % act + ("[data-arg='%s']" % arg if arg is not None else "")
    pg.locator("#panelBody " + sel).first.click(); time.sleep(0.25)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader"])
    try:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
        ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
        # ===== A. TAMU: Edit Avatar terbuka, semua bisa dicoba, hanya gratis bisa disimpan, beli terkunci =====
        pg, errs = start(ctx, server=False)
        ok("A1 tombol Edit Avatar ada di HUD & menu ☰ mengenalinya", ev(pg, "!!document.getElementById('avatarBtn')") and "Edit Avatar" in rd("hud/menu.js"))
        old_style = ev(pg, "JSON.stringify(NW.world.player.style)")
        open_avatar(pg); ok("A2 menu Edit Avatar terbuka (panel + pratinjau + kategori)", wait_for(pg, "!!document.getElementById('avCv')") and ev(pg, "document.querySelectorAll('.av-cats button').length") == 8)
        time.sleep(1.2)
        c0 = ev(pg, "Nusa.S.money"); click(pg, "avPick", "t_street"); ok("A3 COBA GRATIS item berbayar: pratinjau berubah, koin TIDAK berkurang", ev(pg, "NW.avatarUI._draft().t[0]") == "t_street" and ev(pg, "Nusa.S.money") == c0)
        ev(pg, "Nusa.toast=(m,k)=>{window.__toast=m}"); click(pg, "avSave")
        ok("A4 simpan item yang belum dimiliki ditolak (tamu)", ev(pg, "NW.avatar.code()") == "t:t_polos:0|p:p_awal:0|s:x:0|r:x:0" and ev(pg, "document.querySelector('.av-msg')") is not None)
        click(pg, "avPick", "t_polos"); click(pg, "avCol", "t_polos:2"); click(pg, "avSave")
        ok("A5 item GRATIS (Kaos Polos warna 3) tersimpan lokal & tampil di karakter", ev(pg, "NW.avatar.code()").startswith("t:t_polos:2") and ev(pg, "NW.world.player.style.shirt") == "#4a7fb5")
        click(pg, "avCat", "exclusive"); click(pg, "avAsk", "c_galaksi")
        click(pg, "avBuy", "c_galaksi"); ok("A6 tamu tidak bisa membeli (pesan jujur, tidak ada panggilan server)", "Masuk akun" in (ev(pg, "window.__toast") or "") and ev(pg, "(window.__calls||[]).length") == 0)
        ok("A7 pemain tamu tanpa kostum: tampilan bawaan tidak dipaksa topi caping hilang", ev(pg, "NW.world.player.style.hat") == "caping")
        ok("A8 tanpa error halaman", not errs, errs[:2]); pg.close()
        # ===== B. AKUN + SERVER: beli, Sultan, saldo kurang, klik ganda, simpan, muat ulang =====
        pg, errs = start(ctx, money=9000000); ev(pg, "Nusa.toast=(m,k)=>{window.__toast=m}")
        wait_for(pg, "NW.avatar.status()==='ready'", 8); ok("B0 status toko = ready (server mendukung)", ev(pg, "NW.avatar.status()") == "ready")
        dismiss(pg); open_avatar(pg); wait_for(pg, "!!document.getElementById('avCv')"); time.sleep(0.8)
        shot(pg, "01-edit-avatar.png")
        b0 = bal(pg); click(pg, "avView", "shop"); time.sleep(1.0)
        pg.locator("#panelBody").evaluate("e=>e.scrollTop=0"); shot(pg, "02-toko-fashion.png")
        click(pg, "avAsk", "t_street"); ok("B1 konfirmasi pembelian menampilkan nama + harga", "45.000" in ev(pg, "document.querySelector('.av-conf').innerText"))
        click(pg, "avBuy", "t_street")
        ok("B2 beli item biasa: saldo -45.000, tercatat dimiliki, pesan sukses", bal(pg) == b0 - 45000 and ev(pg, "NW.avatar.has('t_street')") and "PEMBELIAN BERHASIL" in ev(pg, "window.__toast"), [bal(pg), b0])
        b1 = bal(pg); r = ev(pg, "NW.avatar.buy('t_street')"); ok("B3 beli lagi item yang sama: ditolak, tidak ada potongan", r["ok"] is False and bal(pg) == b1)
        click(pg, "avAsk", "c_trex"); click(pg, "avBuy", "c_trex")
        ok("B4 beli kostum Sultan T-Rex: saldo -1.200.000 & pesan 'Kostum telah masuk ke lemari pakaianmu.'", bal(pg) == b1 - 1200000 and ev(pg, "window.__toast") == "🎉 PEMBELIAN BERHASIL! Kostum telah masuk ke lemari pakaianmu.", ev(pg, "window.__toast"))
        # klik ganda dengan opId sama (jaringan lambat) → sekali bayar
        b2 = bal(pg); res = ev(pg, "async()=>{const a=NW.shopApi.eco,id='FDUP'+Date.now()+'xxxx';const x=await Promise.all([a('ecoFashionBuy',{opId:id,id:'t_nelayan'}),a('ecoFashionBuy',{opId:id,id:'t_nelayan'})]);return x.map(v=>!!v.duplicate)}")
        ok("B5 permintaan ganda (opId sama) → hanya sekali dibayar", bal(pg) + 0 >= 0 and ev(pg, "NW.eco.state()") is not None and any(res) , res)
        ev(pg, "NW.eco.ensure&&NW.eco.flush&&0"); ev(pg, "NW.avatar.refresh()"); time.sleep(0.5)
        ok("B5b saldo hanya berkurang 120.000 untuk Jaket Nelayan", ev(pg, "async()=>{const s=await NW.shopApi.eco('ecoState',{});return s.balance}") == b2 - 120000)
        ev(pg, "NW.eco.applyState(await_state=null)") if False else None
        # saldo kurang
        ev(pg, "async()=>{const s=await NW.shopApi.eco('ecoState',{});NW.eco.applyState(s)}")
        left = ev(pg, "async()=>{const s=await NW.shopApi.eco('ecoState',{});return s.balance}")
        left = ev(pg, "async()=>{const s=await NW.shopApi.eco('ecoState',{});return s.balance}")
        click(pg, "avView", "sultan"); time.sleep(2.0)
        click(pg, "avAsk", "c_naga"); click(pg, "avBuy", "c_naga")
        ok("B6a beli Naga Petir 2.500.000: saldo berkurang tepat", ev(pg, "NW.avatar.has('c_naga')") and bal(pg) == left - 2500000, [bal(pg), left]); left = bal(pg)
        # ===== Koleksi Sultan: pakai kostum + efek → screenshot =====
        click(pg, "avPick", "c_naga"); click(pg, "avSpin"); ev(pg, "NW.avatarDraw.setLevel(2)"); click(pg, "avRot", "1"); click(pg, "avRot", "1")
        click(pg, "avWalk"); click(pg, "avFx", "c_naga")
        wait_for(pg, "(performance.now()/1000)%3.6>0.15&&(performance.now()/1000)%3.6<0.3", 6)
        pg.locator("#panelBody").evaluate("e=>e.scrollTop=0"); shot(pg, "03-koleksi-sultan.png")
        click(pg, "avPick", "c_galaksi"); time.sleep(0.6); shot(pg, "03b-koleksi-sultan-galaksi-coba.png")
        click(pg, "avPick", "c_naga")
        # simpan + muat ulang
        click(pg, "avSave"); ok("B7 simpan penampilan: kode tersimpan & dipakai karakter", "c:c_naga" in ev(pg, "NW.avatar.code()") and ev(pg, "!!NW.world.player.style.costume"))
        # karakter di dunia (panel ditutup)
        ev(pg, "Nusa.closePanel()"); dismiss(pg); time.sleep(0.2); ev(pg, "()=>{NW.world.player.dir=1}")
        wait_for(pg, "(performance.now()/1000)%3.6>0.1&&(performance.now()/1000)%3.6<0.3", 6); shot(pg, "04-karakter-di-dunia.png")
        pg.close()
        # saldo kurang (akun miskin)
        pgp, errp = start(ctx, money=100, cfg={"uid": "u-miskin"}); ev(pgp, "Nusa.toast=(m,k)=>{window.__toast=m}")
        open_avatar(pgp); click(pgp, "avView", "sultan"); click(pgp, "avAsk", "c_galaksi"); click(pgp, "avBuy", "c_galaksi")
        ok("B6 saldo kurang → pesan 'Koin kamu belum cukup', saldo & kepemilikan tidak berubah", ev(pgp, "window.__toast") == "🪙 Koin kamu belum cukup untuk membeli item ini!" and not ev(pgp, "NW.avatar.has('c_galaksi')") and bal(pgp) == 100, [ev(pgp, "window.__toast"), bal(pgp)])
        pgp.close()
        pg2, errs2 = start(ctx, money=0)  # sesi baru, DB tetap (localStorage) = login ulang
        wait_for(pg2, "NW.avatar.status()==='ready'", 8); time.sleep(0.6)
        ok("B8 muat ulang + login ulang: kostum Naga Petir & kepemilikan tetap, koin utuh", ev(pg2, "NW.avatar.has('c_naga')") and "c:c_naga" in ev(pg2, "NW.avatar.code()") and ev(pg2, "!!NW.world.player.style.costume") and ev(pg2, "NW.eco.balance()") == left, [ev(pg2, "NW.avatar.code()"), ev(pg2, "NW.eco.balance()"), left])
        # UID lain tidak mendapat barang UID pertama
        ev(pg2, "async()=>{localStorage.setItem('__keep',localStorage.getItem('__fdb'))}")
        ev(pg2, SERVER, {"uid": "u-lain"}); ev(pg2, "NW.eco.ensure()"); wait_for(pg2, "NW.eco.active()"); ev(pg2, "NW.avatar.refresh()"); time.sleep(0.5)
        ok("B9 UID lain tidak memiliki item UID pertama", ev(pg2, "NW.avatar.has('c_naga')") is False)
        r = ev(pg2, "async()=>{try{await NW.shopApi.eco('ecoFashionSave',{opId:'OPXX1234xx',code:'c:c_naga:0|s:x:0|r:x:0'});return 'diterima'}catch(e){return e.message}}")
        ok("B10 manipulasi: simpan kostum milik UID lain ditolak server", "belum memiliki" in r, r)
        ev(pg2, "()=>{Nusa.S.avatar={code:'c:c_naga:0|s:x:0|r:x:0'};NW.avatar.apply()}")
        ok("B11 manipulasi: kode lokal berisi kostum yang tak dimiliki → tidak dirender (jatuh ke bawaan)", ev(pg2, "!NW.world.player.style.costume"))
        ok("B12 harga & saldo dari klien diabaikan server", ev(pg2, "async()=>{try{const r=await NW.shopApi.eco('ecoFashionBuy',{opId:'OPXX5678xx',id:'t_basic',price:1,balance:9e9});return r.price}catch(e){return e.message}}") in (25000, "Koin tidak cukup."))
        pg2.close()
        # ===== C. Server belum mendukung =====
        pg3, errs3 = start(ctx, money=500000, cfg={"uid": "u-old", "noFashion": True}); ev(pg3, "Nusa.toast=(m,k)=>{window.__toast=m}")
        ev(pg3, "NW.avatar.refresh()"); wait_for(pg3, "NW.avatar.status()==='unsupported'", 6)
        ok("C1 Worker lama: status 'unsupported', pembelian terkunci tanpa memotong koin", ev(pg3, "NW.avatar.status()") == "unsupported" and ev(pg3, "NW.avatar.buy('t_street')")["ok"] is False and ev(pg3, "NW.eco.balance()") == 500000)
        pg3.close()
        # ===== D. Render: 8 arah × semua item, memancing, tabrakan/gerak tak berubah, pemain lain, efek hemat =====
        pg, errs4 = start(ctx, money=1)
        r = ev(pg, """()=>{const F=NusaFashionCore,cv=document.createElement('canvas');cv.width=200;cv.height=200;const x=cv.getContext('2d');let n=0,bad=[];
          for(const it of F.ITEMS){for(let d=0;d<8;d++){for(const mv of [false,true]){const o={t:null,p:null,h:null,a:null,c:null,s:0,r:0};o[it.slot]=[it.id,0];
            const ch={x:5,y:5,z:0,dir:d,walk:1.3,moving:mv,seed:1,rod:d%2?1:0,isMe:true,style:NW.avatarDraw.styleFor(F.encode(o),NW._baseStyle||NW.world.player.style)};
            try{x.save();x.translate(100,150);NW.drawCharacter(x,ch,3.3);x.restore();n++}catch(e){bad.push(it.id+':'+d+':'+e.message)}}}}return {n,bad:bad.slice(0,3)}}""")
        ok("D1 semua 27 item × 8 arah × diam/jalan (+joran) tergambar tanpa error", r["n"] == 27 * 8 * 2 and not r["bad"], r)
        px0 = ev(pg, "[NW.world.player.x,NW.world.player.y]")
        ev(pg, "()=>{Nusa.S.avatar={code:'c:c_naga:0|s:x:0|r:x:0'};NW.avatar._setOwned(['c_naga']);NW.avatar.apply()}")
        ok("D2 kostum dipakai tidak mengubah posisi/tabrakan pemain (hanya gambar)", ev(pg, "[NW.world.player.x,NW.world.player.y]") == px0 and ev(pg, "!!NW.world.player.style.costume"))
        ev(pg, "()=>{NW.world.player.dir=1;NW.world.player.moving=true}"); time.sleep(0.5)
        ok("D3 tidak ada error saat berjalan dengan kostum di game yang berjalan", not errs4, errs4[:2])
        ok("D4 memancing tetap tersedia (fungsi mulai memancing & joran tergambar dengan kostum)", ev(pg, "typeof NW.world.api.startFishing==='function' && typeof Nusa.fish.enterAt==='function'"))
        # pemain lain
        ev(pg, """()=>{const ch={x:6,y:6,dir:2,walk:0,moving:false,seed:2,rod:0,style:{shirt:'#aaa',pants:'#2b3a44',skin:'#c68b5e',hair:'#2a1d14',hat:'caping',collar:'#fff'}};window.__rp={id:'p9',ch,outfit:''};}""")
        ev(pg, "NW.mp_setOutfitFor(window.__rp,'c:c_raja:0|s:x:0|r:x:0')"); ok("D5 pemain lain: kostum dari kode ID tampil di karakter mereka", ev(pg, "window.__rp.ch.style.costume.id") == "c_raja")
        ev(pg, "NW.mp_setOutfitFor(window.__rp,'c:c_dari_versi_baru:0|s:x:0|r:x:0')"); ok("D6 kostum tak dikenal (versi game lain) → fallback tampilan dasar, tanpa crash", ev(pg, "!window.__rp.ch.style.costume"))
        ev(pg, "NW.mp_setOutfitFor(window.__rp,'sampah|||')"); ok("D7 kode rusak ditolak → tampilan dasar", ev(pg, "!window.__rp.ch.style.costume"))
        # pembatas keramaian & efek hemat
        r = ev(pg, """()=>{NW.avatarDraw.setLevel(2);const sty=NW.avatarDraw.styleFor('c:c_galaksi:0|s:x:0|r:x:0',NW._baseStyle||NW.world.player.style);let lv=[];
          for(let i=0;i<8;i++){lv.push(NW.avatarDraw.lvFor({style:sty,isMe:false},77.7))}return lv}""")
        ok("D8 8 pemain berefek berkumpul: hanya 3 pertama berefek (hemat), sisanya 0", r[:3] == [1, 1, 1] and r[3:] == [0, 0, 0, 0, 0], r)
        ev(pg, "NW.avatarDraw.setLevel(0)"); ok("D9 mode efek 'Mati' tersimpan & dihormati", ev(pg, "NW.avatarDraw.lvFor({style:{costume:{id:'c_naga'}},isMe:true},5)") == 0 and ev(pg, "localStorage.getItem('nusa_fx')") == "0")
        ev(pg, "NW.avatarDraw.setLevel(2)")
        # performa kasar: 120 bingkai penuh efek
        ms = ev(pg, """()=>{const cv=document.createElement('canvas');cv.width=300;cv.height=300;const x=cv.getContext('2d');const sty=NW.avatarDraw.styleFor('c:c_naga:0|s:x:0|r:x:0',NW._baseStyle||NW.world.player.style);const ch={x:5,y:5,z:0,dir:2,walk:1,moving:true,seed:1,rod:0,isMe:true,style:sty};
          const t0=performance.now();for(let i=0;i<120;i++){x.clearRect(0,0,300,300);x.save();x.translate(150,200);NW.drawCharacter(x,ch,i/30);x.restore()}return (performance.now()-t0)/120}""")
        ok("D10 biaya gambar kostum paling berat < 3 ms/bingkai (headless CPU)", ms < 3, round(ms, 2))
        pg.close()
        # ===== E. Pemain lama: tampilan tidak berubah =====
        pg, e5 = start(ctx, server=False)
        ok("E1 pemain lama tanpa data avatar: gaya karakter identik (caping, warna asli)", ev(pg, "JSON.stringify(NW.world.player.style)") == old_style)
        pg.close()
    finally:
        b.close()
fails = [x for x in R if x.startswith("FAIL")]
print("\n%d lulus, %d gagal" % (len(R) - len(fails), len(fails)))
open(os.path.join(OUT, "hasil-uji.txt"), "w", encoding="utf8").write("\n".join(R))
raise SystemExit(1 if fails else 0)
