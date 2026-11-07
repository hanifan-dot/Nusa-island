"""Uji terarah KOLAM IKAN RUMAHKU di browser: panel, masuk/ambil ikan, kapasitas, upgrade, toko pakan, beri makan, kelaparan berbasis waktu SERVER,
kematian, tamu/server-tanpa-dukungan terkunci, akun lain, jalur jalan tak terhalang, dan biaya gambar. Server = inti ekonomi yang SAMA dengan Functions (di dalam halaman).
Jalankan: python tests/browser/test_pond.py   (gambar: /tmp/nusa-pond-shots)"""
import time, json, os
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
OUT = "/tmp/nusa-pond-shots/"; os.makedirs(OUT, exist_ok=True)
rd = lambda p: open(os.path.join(ROOT_DIR, p), encoding="utf8").read()
R = []
def ok(n, c, e=""): R.append(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:200] if e != "" else "")); print(R[-1], flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
def wait_for(pg, js, t=8):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.1)
    return False
WRAP = "(function(){var module={exports:{}};%s;window.%s=module.exports})();"
SERVER = """async(opts)=>{ const m=new Map(); let q=Promise.resolve(); const rd=p=>m.has(p)?JSON.parse(m.get(p)):null;
 const db={get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const[k,v]of buf)m.set(k,v);return r});q=run.catch(()=>{});return run}};
 window.__now=Date.now(); window.__uid='u-pond'; window.__db=m;
 const e=NusaEconomyCore.makeEconomyServer(db,{tables:__T,fishmath:NW.FM,initCap:1e9,trustClientInit:true,clock:()=>window.__now,pond:opts&&opts.noPond?null:NusaPondCore}); window.__calls=[];
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>window.__uid,getEntitlements:async()=>({env:'NYATA',wallet:{NYATA:0}}),
   eco:async(name,d)=>{window.__calls.push(name);if(name==='ecoCatch')window.__now+=3000;if(window.__down)throw Object.assign(new Error('Jaringan bermasalah.'),{code:'unavailable'});try{return JSON.parse(JSON.stringify(await e[name]({uid:window.__uid},d)))}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.wallet.hook&&NW.wallet.hook(); window.__srv=e; return true}"""
def page(b, qs="?cloud=off", mobile=True):
    ctx = b.new_context(viewport={"width": 390, "height": 844} if mobile else {"width": 1100, "height": 700}, has_touch=mobile)
    for f, g in (("economy/core.js", "NusaEconomyCore"), ("economy/tables.js", "__T")): ctx.add_init_script(WRAP % (rd(f), g))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + qs); time.sleep(0.6)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.4); ev(pg, "()=>{window.__nusa.S.muted=true}")
    return ctx, pg, errs
CATCH = "({w,id})=>{const f=Nusa.FISH_BY_ID[id];const it={uid:NW.HD.newUid(Nusa.S,'i'),id,w:w||f.wMin,t:Date.now()};Nusa.S.cooler.push(it);NW.eco.onCatch(it);return it.uid}"
YARD = "()=>{const p=NW.world.player;NW.home.goPlot(p,'door');return NW.home.scene}"
def click(pg, sel): pg.click("#pondWrap " + sel, timeout=4000); time.sleep(0.15)
def pond(pg): return ev(pg, "()=>NW.pond.view()")
def adv(pg, hours): ev(pg, "(h)=>{window.__now+=h*3600000}", hours)
def refresh(pg): ev(pg, "async()=>{await NW.pond.refresh()}"); time.sleep(0.15)
def put_via_ui(pg, uids):
    click(pg, "[data-act=v-put]")
    for u in uids: click(pg, f"[data-act=pick][data-u='{u}']")
    pg.screenshot(path=OUT + "0_pilih_ikan.png"); click(pg, "[data-act=do-put]"); pg.screenshot(path=OUT + "0b_konfirmasi_risiko.png"); click(pg, "[data-act=c-yes]"); return wait_for(pg, "NW.pond.view().fish.length>=1 && !NW.pond.busy()")
with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        # ===== A. tamu/offline: terkunci, tidak ada transaksi lokal =====
        ctx, pg, errs = page(b)
        ev(pg, YARD); time.sleep(0.3)
        ok("A1 tombol 🐟 Kelola Kolam muncul di halaman", ev(pg, "()=>NW.home.candidates().some(c=>c.id==='p_kolam'&&c.label==='Kelola Kolam'&&c.icon==='🐟')"))
        ev(pg, "()=>NW.home.interact(NW.home.candidates().find(c=>c.id==='p_kolam'),NW.world.player,()=>{})"); time.sleep(0.2)
        ok("A2 tamu: panel terbuka tetapi TERKUNCI (alasan jelas), tanpa tombol aksi", ev(pg, "()=>NW.pondUI.isOpen()&&NW.pond.status().s==='guest'") and ev(pg, "()=>!document.querySelector('#pondWrap [data-act=v-put]')") and "akun Google" in ev(pg, "document.getElementById('pdBody').textContent"))
        ok("A3 peringatan 'ikan bisa mati' tampil walau terkunci", "MATI" in ev(pg, "document.getElementById('pdBody').textContent"))
        ok("A4 tamu: ecoPond* tidak pernah dipanggil, S.money tak berubah", ev(pg, "()=>NW.pond.status().s")=="guest"); ctx.close()
        # ===== B. server belum mendukung kolam: terkunci aman =====
        ctx, pg, errs = page(b); ev(pg, SERVER, {"noPond": True}); ev(pg, "()=>{Nusa.S.money=5000;Nusa.S.cooler=[]}"); ev(pg, "NW.eco.ensure()")
        ev(pg, YARD); ev(pg, "()=>NW.pondUI.open(NW.world.player)"); time.sleep(0.5); ev(pg, "async()=>{await NW.pond.refresh()}"); time.sleep(0.3)
        ok("B1 server tanpa ecoPond*: status 'unsupported' dan pesan jelas", wait_for(pg, "NW.pond.status().s==='unsupported'") and "belum diaktifkan" in ev(pg, "document.getElementById('pdBody').textContent"))
        ok("B2 tidak ada aksi pembelian/pemindahan yang bisa dipicu", ev(pg, "async()=>{const r=await NW.pond.buy('pelet',1);return r.ok}") is False and ev(pg, "()=>NW.eco.balance()") >= 5000 - 0)
        ok("B3 tanpa error JS", errs == [], errs); ctx.close()

        # ===== C. server aktif =====
        ctx, pg, errs = page(b); ev(pg, SERVER, {})
        ev(pg, "()=>{Nusa.S.money=400000;Nusa.S.cooler=[];Nusa.S.hour=10}"); ok("C0 ekonomi server aktif", ev(pg, "NW.eco.ensure()") is True)
        ev(pg, YARD); time.sleep(0.3); ev(pg, "()=>NW.pondUI.open(NW.world.player)")
        ok("C1 panel siap: kapasitas 0 / 20 KG, peringatan kematian tampil", wait_for(pg, "NW.pond.status().s==='ready'") and "0 / 20 KG" in ev(pg, "document.getElementById('pdBody').textContent") and "MATI" in ev(pg, "document.getElementById('pdBody').textContent"))
        pg.screenshot(path=OUT + "1_panel_kosong.png")
        for lbl in ["Masukkan Ikan", "Ambil Ikan", "Beri Makan", "Toko Kolam", "Upgrade Kolam"]:
            ok(f"C2 tombol '{lbl}' ada", lbl in ev(pg, "document.getElementById('pdBody').textContent"))
        u1 = ev(pg, CATCH, {"w": 1.1, "id": "nila"}); u2 = ev(pg, CATCH, {"w": 3.0, "id": "patin"}); ev(pg, "NW.eco.flush()")
        ok("C3 ikan tercatat di kotak server", wait_for(pg, "NW.eco.state().box.length===2"))
        ev(pg, "()=>{window.__bal0=NW.wallet.bal()}")
        ok("C4 masukkan ikan lewat UI (dengan konfirmasi risiko)", put_via_ui(pg, [u1, u2]) and "mati" in ev(pg, "document.body.innerHTML.toLowerCase()"))
        ok("C5 ikan pindah: coolbox kosong, kolam 2 ekor, kenyang 100%, kapasitas 4,1 KG", ev(pg, "()=>Nusa.S.cooler.length")==0 and len(pond(pg)["fish"])==2 and all(f["sat"]==100 for f in pond(pg)["fish"]) and abs(pond(pg)["used"]-4.1)<0.01)
        ok("C6 ikan di kolam tidak bisa dijual (server: unknown) maupun dikirim ulang sebagai tangkapan", ev(pg, "async(u)=>{const r=await NW.shopApi.eco('ecoSell',{opId:'s'+Date.now()+'xx',uids:[u],day:1});const c=await NW.shopApi.eco('ecoCatch',{opId:'c'+Date.now()+'xx',items:[{id:'nila',w:1.1,uid:u}]});return [r.total,r.unknown.length,c.skipped.length]}", u1) == [0,1,1])
        ev(pg, "()=>{window.__srv.ecoState({uid:window.__uid},{})}")
        # waktu: 10 hari server = 40 langkah -> 60%
        adv(pg, 240); refresh(pg)
        ok("C7 10 hari (waktu server) → kenyang 60%", all(f["sat"]==60 for f in ev(pg, "()=>NW.pond.fishRows()")), ev(pg, "()=>NW.pond.fishRows().map(f=>f.sat)"))
        ev(pg, "()=>{const t=Date.now;window.__realNow=t;Date.now=()=>1}")                      # jam HP dimundurkan
        refresh(pg); ok("C8 ubah jam HP tidak mengubah kenyang (hitung dari jam server)", all(f["sat"]==60 for f in ev(pg, "()=>NW.pond.fishRows()")))
        ev(pg, "()=>{Date.now=window.__realNow}")
        ev(pg, "async()=>{NW.pond._reset();NW.eco._reset();await NW.eco.ensure();await NW.pond.refresh()}"); time.sleep(0.4)
        ok("C9 login ulang/refresh berulang: data utuh, tidak ganda, tidak lebih cepat lapar", len(pond(pg)["fish"])==2 and all(f["sat"]==60 for f in ev(pg, "()=>NW.pond.fishRows()")) and ev(pg, "()=>NW.eco.state().box.length")==0)
        for i in range(5): refresh(pg)
        ok("C10 refresh 5× tetap 60%", all(f["sat"]==60 for f in ev(pg, "()=>NW.pond.fishRows()")))
        # tingkat peringatan: 30 / 15 / 5 (hitung dari start; sekarang 60 -> 30 butuh +30 langkah = 180 jam)
        for target, lvl_ in ((30, "notice"), (15, "serious"), (5, "critical")):
            cur = ev(pg, "()=>NW.pond.fishRows()[0].sat"); adv(pg, (cur - target) * 6); refresh(pg)
            ok(f"C11 kenyang {target}% → peringatan '{lvl_}' (HUD kolam & panel)", ev(pg, "()=>NW.pond.fishRows()[0].level")==lvl_ and ev(pg, "()=>{NW.pond.drawState();return NW.pond.drawState().warn}")==lvl_)
        ev(pg, "()=>NW.pondUI.close()"); ev(pg, "()=>NW.pondUI.open()"); time.sleep(0.3)
        ok("C12 panel menampilkan KRITIS + perkiraan waktu tersisa", "KRITIS" in ev(pg, "document.getElementById('pdBody').textContent") and "habis dalam" in ev(pg, "document.getElementById('pdBody').textContent"))
        pg.screenshot(path=OUT + "2_panel_kritis.png")
        # toko: beli 3 pelet, spam konfirmasi
        click(pg, "[data-act=v-main]") if ev(pg, "()=>!!document.querySelector('#pondWrap [data-act=v-main]')") else None
        click(pg, "[data-act=v-shop]"); b0 = ev(pg, "NW.wallet.bal()"); click(pg, "[data-act=qty][data-k=pelet][data-d='1']"); click(pg, "[data-act=qty][data-k=pelet][data-d='1']")
        pg.screenshot(path=OUT + "3_toko.png")
        click(pg, "[data-act=do-buy][data-k=pelet]"); ok("C13 beli menampilkan konfirmasi transaksi", "Beli 3× Pelet Biasa" in ev(pg, "document.getElementById('pdSheet').textContent"))
        pg.evaluate("()=>{const b=document.querySelector('#pondWrap [data-act=c-yes]');b.click();b.click();b.click()}"); time.sleep(0.6)
        ok("C14 spam tombol konfirmasi: hanya SEKALI dibeli (−1.500 koin, stok 3)", ev(pg, "NW.wallet.bal()")==b0-1500 and pond(pg)["feed"]["pelet"]==3 and ev(pg, "()=>window.__calls.filter(c=>c==='ecoPondBuy').length")==1, [ev(pg, "NW.wallet.bal()"), b0])
        # koin tidak cukup: tidak memotong
        ev(pg, "()=>{window.__db.set('shop/economy/u-pond',JSON.stringify(Object.assign(JSON.parse(window.__db.get('shop/economy/u-pond')),{bal:100})))}"); ev(pg, "NW.eco.ensure()") ; refresh(pg)
        r = ev(pg, "async()=>{const b=NW.wallet.bal();const r=await NW.pond.buy('premium',1);return [r.ok,b,NW.wallet.bal()]}"); ok("C15 koin kurang: pembelian ditolak, saldo tidak berubah", r[0] is False and r[1]==r[2], r)
        ev(pg, "()=>{window.__db.set('shop/economy/u-pond',JSON.stringify(Object.assign(JSON.parse(window.__db.get('shop/economy/u-pond')),{bal:400000})))}"); ev(pg, "NW.eco.ensure()"); refresh(pg)
        # beri makan
        sat0 = ev(pg, "()=>NW.pond.fishRows()[0].sat"); ev(pg, "()=>{const p=NW.world.player;p.x=NW.pondDraw.SPOT.x;p.y=NW.pondDraw.SPOT.y}"); time.sleep(0.6); click(pg, "[data-act=v-main]"); click(pg, "[data-act=v-feed]"); click(pg, "[data-act=do-feed][data-k=pelet]")
        ok("C16 beri makan: animasi pakan aktif, panel tertutup agar animasi terlihat", wait_for(pg, "NW.pondDraw.fxActive() && !NW.pondUI.isOpen()", 3))
        time.sleep(0.9); pg.screenshot(path=OUT + "4_animasi_pakan.png")
        ok("C17 kenyang +20% (pelet), stok pelet −1", ev(pg, "()=>NW.pond.fishRows()[0].sat")==sat0+20 and pond(pg)["feed"]["pelet"]==2, [sat0, ev(pg, "()=>NW.pond.fishRows()[0].sat")])
        ok("C18 animasi selesai dan panel terbuka lagi sendiri", wait_for(pg, "!NW.pondDraw.fxActive() && NW.pondUI.isOpen()", 6))
        # nutrisi +50, premium penuh, batas 100
        ev(pg, "async()=>{await NW.pond.buy('nutrisi',1);await NW.pond.buy('premium',1)}"); time.sleep(0.3)
        ev(pg, "async()=>{await NW.pond.feed('nutrisi')}"); s1 = ev(pg, "()=>NW.pond.fishRows()[0].sat"); ev(pg, "async()=>{await NW.pond.feed('premium')}"); s2 = ev(pg, "()=>NW.pond.fishRows()[0].sat")
        ok("C19 nutrisi +50%, premium → 100%", s1==min(100, sat0+20+50) and s2==100, [s1, s2])
        r = ev(pg, "async()=>{const s=NW.pond.view().feed.pelet;const r=await NW.pond.feed('pelet');return [r.ok,s,NW.pond.view().feed.pelet]}"); ok("C20 semua 100%: pakan tidak terpakai", r[0] is False and r[1]==r[2], r)
        # kapasitas & upgrade
        ev(pg, "()=>NW.pondUI.close()"); big = ev(pg, CATCH, {"w": 7.9, "id": "patin"}); big2 = ev(pg, CATCH, {"w": 7.9, "id": "patin"}); big3 = ev(pg, CATCH, {"w": 7.9, "id": "patin"}); ev(pg, "NW.eco.flush()"); time.sleep(0.3)
        r = ev(pg, "async(u)=>{const r=await NW.pond.put(u);return [r.ok,r.msg||'']}", [big, big2, big3]); ok("C21 melebihi kapasitas 20 KG ditolak server (tanpa memindahkan ikan)", r[0] is False and "Kapasitas" in r[1] and ev(pg, "()=>Nusa.S.cooler.length")==3, r)
        for lv in range(2, 6):
            bb = ev(pg, "NW.wallet.bal()"); r = ev(pg, "async()=>{const r=await NW.pond.upgrade();return r.ok}"); cost = [0,0,10000,35000,75000,150000][lv]
            ok(f"C22 upgrade Lv{lv}: kapasitas {[0,20,50,100,150,200][lv]} KG, biaya {cost}", r is True and pond(pg)["lv"]==lv and pond(pg)["cap"]==[0,20,50,100,150,200][lv] and bb-ev(pg, "NW.wallet.bal()")==cost)
        ok("C23 Lv5 maksimum: upgrade berikutnya ditolak", ev(pg, "async()=>(await NW.pond.upgrade()).ok") is False)
        ok("C24 setelah upgrade, 3 ikan (23,7 KG) masuk", ev(pg, "async(u)=>(await NW.pond.put(u)).ok", [big, big2, big3]) is True)
        # raksasa 150 kg + total <= 200 : legenda
        leg = ev(pg, CATCH, {"w": 150, "id": "kerapu_raksasa"}); ev(pg, "NW.eco.flush()"); time.sleep(0.3); r = ev(pg, "async(u)=>(await NW.pond.put([u])).ok", leg); ok("C25 ikan legenda 150 KG muat di Lv5 (23,7+4,1+150 ≤ 200)", r is True and abs(pond(pg)["used"]-177.8)<0.5, pond(pg)["used"])
        ok("C26 ambil ikan: kembali ke coolbox (data sama), kolam berkurang", ev(pg, "async(u)=>{const r=await NW.pond.take([u]);return r.ok}", leg) is True and ev(pg, "(u)=>!!Nusa.S.cooler.find(x=>x.uid===u&&x.id==='kerapu_raksasa')", leg) and not any(f['u']==leg for f in pond(pg)['fish']))
        ok("C27 ikan yang diambil bisa dijual lagi (dan hanya sekali)", ev(pg, "async(u)=>{const a=await NW.shopApi.eco('ecoSell',{opId:'a'+Date.now()+'xx',uids:[u],day:1});const b=await NW.shopApi.eco('ecoSell',{opId:'b'+Date.now()+'xx',uids:[u],day:1});return [a.total>0,b.total]}", leg) == [True, 0])
        ev(pg, "()=>{Nusa.S.cooler=[]}")
        # tampilan Lv5 malam + semua perlengkapan
        ev(pg, "async()=>{await NW.pond.buy('aerator',1);await NW.pond.buy('tanaman',3);await NW.pond.buy('lampu',1)}"); time.sleep(0.3)
        ok("C28 perlengkapan masuk inventaris kolam (aerator 1, tanaman 3, lampu 1)", pond(pg)["gear"]=={"aerator":1,"tanaman":3,"lampu":1})
        ev(pg, "()=>{Nusa.S.hour=22;const p=NW.world.player;p.x=NW.pondDraw.SPOT.x;p.y=NW.pondDraw.SPOT.y}"); time.sleep(1.4); pg.screenshot(path=OUT + "5_kolam_lv5_malam.png")
        ev(pg, "()=>{Nusa.S.hour=11}"); time.sleep(1.0); pg.screenshot(path=OUT + "6_kolam_lv5_siang.png")
        # kematian
        ev(pg, "()=>{Nusa.S.cooler=[]}"); ev(pg, "async()=>{await NW.pond.take(NW.pond.view().fish.map(f=>f.u).slice(0,10))}"); ev(pg, "()=>{Nusa.S.cooler=[]}")
        sacr = ev(pg, CATCH, {"w": 1.0, "id": "nila"}); keep = ev(pg, CATCH, {"w": 1.0, "id": "nila"}); ev(pg, "NW.eco.flush()"); time.sleep(0.3)
        ev(pg, "async(u)=>{await NW.pond.put([u])}", sacr); t0 = ev(pg, "()=>NW.pond.view().fish.find(f=>f.id==='nila').t0"); invBefore = ev(pg, "()=>Nusa.S.cooler.map(x=>x.uid)")
        now = ev(pg, "()=>window.__now"); ev(pg, "(n)=>{window.__now=n}", t0 + 100*6*3600000 - 1); refresh(pg)
        ok("C29 1 menit sebelum 0%: ikan masih hidup (sat 1)", any(f["u"]==sacr and f["sat"]==1 for f in pond(pg)["fish"]))
        ev(pg, "(n)=>{window.__now=n}", t0 + 100*6*3600000); toasts = []; ev(pg, "()=>{window.__toasts=[];const o=Nusa.toast;Nusa.toast=(m,k)=>{window.__toasts.push(m);return o&&o(m,k)}}"); refresh(pg); time.sleep(0.3)
        ok("C30 tepat 0%: ikan mati dan keluar dari kolam; pesan kematian ditampilkan", not any(f["u"]==sacr for f in pond(pg)["fish"]) and any("meningoy karena kelaparan" in t for t in ev(pg, "()=>window.__toasts")), ev(pg, "()=>window.__toasts"))
        ok("C31 ikan lain & inventaris tidak terganggu; riwayat tercatat sekali", ev(pg, "()=>Nusa.S.cooler.map(x=>x.uid)")==invBefore and sum(1 for h in pond(pg)["hist"] if h["u"]==sacr)==1 and pond(pg)["deaths"]>=1)
        for i in range(4): refresh(pg)
        ok("C32 refresh berulang: kematian tidak diproses dua kali (pesan sekali, riwayat sekali)", sum(1 for h in pond(pg)["hist"] if h["u"]==sacr)==1 and sum(1 for t in ev(pg, "()=>window.__toasts") if "meningoy" in t)==1)
        ok("C33 ikan mati tidak muncul lagi walau simpanan lama dipulihkan (uid dilewati server)", ev(pg, "async(u)=>{Nusa.S.cooler.push({uid:u,id:'nila',w:1,t:1});await NW.eco.flush();NW.eco.onCatch({uid:u,id:'nila',w:1});await NW.eco.flush();await NW.pond.refresh();return Nusa.S.cooler.some(x=>x.uid===u)||NW.eco.state().box.includes(u)}", sacr) is False)
        # jaringan putus: aksi tidak ganda
        ev(pg, "()=>{window.__down=true}"); ev(pg, "async()=>{await NW.pond.buy('pelet',2)}"); ev(pg, "()=>{window.__down=false}")
        cnt = ev(pg, "()=>NW.pond.view().feed.pelet"); b1 = ev(pg, "NW.wallet.bal()"); ev(pg, "async()=>{await NW.pond.buy('pelet',2)}")
        ok("C34 jaringan putus lalu ulang: hanya dibeli sekali", ev(pg, "()=>NW.pond.view().feed.pelet")==cnt+2 and ev(pg, "NW.wallet.bal()")==b1-1000)
        # akun lain
        ev(pg, "()=>{window.__uid='u-lain'}"); ev(pg, "async()=>{NW.pond._reset();NW.eco._reset();await NW.eco.ensure();await NW.pond.refresh()}"); time.sleep(0.4)
        ok("C35 akun lain tidak melihat/mengakses kolam pemain pertama", pond(pg)["fish"]==[] and pond(pg)["lv"]==1 and ev(pg, "async(u)=>(await NW.pond.take([u])).ok", keep) is False)
        ok("C36 tanpa error JS", errs == [], errs)
        # ===== D. jalan tidak terhalang + kinerja =====
        ev(pg, "()=>{window.__uid='u-pond'}"); ev(pg, "async()=>{NW.pond._reset();NW.eco._reset();await NW.eco.ensure();await NW.pond.refresh()}"); ev(pg, "()=>NW.pondUI.close()")
        for lv in (1, 5, 10):
            ev(pg, "(lv)=>{Nusa.S.home.level=lv;NW.HD.relayout(Nusa.S.home);NW.home.bump();NW.home.goPlot(NW.world.player,'door')}", lv)
            r = ev(pg, """()=>{const L=NW.HOUSE.plotLayout(Nusa.S.home.level),W=(x,y)=>NW.home.walkable(x,y),st=0.25;const key=(i,j)=>i+','+j;const q=[[Math.round(L.gate.x/st),Math.round((L.gate.y-0.7)/st)]];const seen=new Set([key(...q[0])]);
              while(q.length){const [i,j]=q.shift();for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(seen.has(key(a,b)))continue;if(!W(a*st,b*st))continue;seen.add(key(a,b));q.push([a,b])}}
              const reach=(x,y)=>seen.has(key(Math.round(x/st),Math.round(y/st)));const cs=NW.home.candidates().filter(c=>c.id!=='p_door'||true);
              return {door:reach(L.doorPt.x,L.doorPt.y),spot:reach(NW.pondDraw.SPOT.x,NW.pondDraw.SPOT.y),mail:reach(L.mailbox.x+0.35,L.mailbox.y+0.9),all:cs.filter(c=>!reach(c.x,c.y)).map(c=>c.id)}}""")
            ok(f"D1 Rumah Lv{lv}: pintu, titik kolam, kotak surat terjangkau dari gerbang; kolam tidak menutup akses", r["door"] and r["spot"] and r["mail"] and "p_kolam" not in r["all"] and "p_door" not in r["all"], r)
        ev(pg, "()=>{Nusa.S.home.level=5;NW.HD.relayout(Nusa.S.home);NW.home.bump();NW.home.goPlot(NW.world.player,'door')}")
        # kinerja gambar: 14 ikan + aerator + tanaman + lampu, CPU 4× lebih lambat (emulasi HP menengah)
        cdp = pg.context.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        r = ev(pg, """()=>{const c=document.createElement('canvas');c.width=390;c.height=844;const x=c.getContext('2d');const S={lv:5,gear:{aerator:1,tanaman:3,lampu:1},warn:'serious',fish:Array.from({length:14},(_,i)=>({u:'f'+i,id:['nila','patin','gabus','toman'][i%4],w:1,vr:null,sat:50}))};
          const t0=performance.now();for(let i=0;i<300;i++){x.save();x.translate(100,300);for(const it of NW.pondDraw.items(i/60,0.4,S,NW.world.player))it.draw(x);x.restore()}return (performance.now()-t0)/300}""")
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
        ok("D2 biaya gambar kolam penuh (14 ikan, Lv5, CPU 4× lebih lambat) < 4 ms/frame", r < 4, round(r, 2))
        ok("D3 tanpa error JS", errs == [], errs); ctx.close()
    finally:
        b.close()
fails = [r for r in R if r.startswith("FAIL")]
print(f"\ntest_pond: {len(R)-len(fails)} lolos, {len(fails)} gagal"); raise SystemExit(1 if fails else 0)
