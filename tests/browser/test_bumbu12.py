"""Uji Bumbu 1.2: inventaris sampai 200 ikan, pasar per kelangkaan, pamer ikan, 10 joran, ikan raksasa & perlawanan, ekonomi, migrasi v5 → v6.
Jalankan: python tests/browser/test_bumbu12.py
Catatan: ini emulasi browser (Chromium headless), bukan HP Android fisik. Angka FPS hanya indikasi, bukan bukti kinerja di HP.
Simulasi fight memakai startFight/updateFight asli dengan Math.random deterministik (seed tetap), jadi hasilnya stabil.
"""
import time, json, os, sys, tempfile
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
import balance_sim

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = tempfile.mkdtemp(prefix="nusa-b12-") + "/"
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else ""))
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)

def page(b, save=None, vp=(1280, 800), touch=False, dpr=1):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=touch, device_scale_factor=dpr)
    if save is not None:
        ctx.add_init_script("if(!localStorage.getItem('nusa-island-v1')){localStorage.setItem('nusa-island-v1', %s)}" % json.dumps(json.dumps(save)))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.7)
    return ctx, pg, errs
def fresh(b, vp=(1280, 800), touch=False, dpr=1):
    ctx, pg, errs = page(b, None, vp, touch, dpr); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6)
    start(pg); return ctx, pg, errs
def start(pg):
    if pg.is_visible("#startBtn"): pg.click("#startBtn")
    time.sleep(0.4); ev(pg, "window.__nusa.S.muted = true; document.getElementById('banner').classList.remove('show')")
def S(pg, path="window.__nusa.S"): return ev(pg, f"JSON.parse(JSON.stringify({path}))")
def seed(pg, items, cooler_lv=9, money=None):
    """items: [(id, kg, locked?)] → coolbox. Tingkat coolbox diatur supaya muat."""
    ev(pg, """(a)=>{const S=window.__nusa.S; S.up.cooler=a.lv; S.cooler=a.items.map((x,i)=>Object.assign({uid:'u'+i,id:x[0],w:x[1],t:Date.now()}, x[2]?{lock:true}:{}));
      if(a.money!==null) S.money=a.money; window.__nusa.save(); window.__nusa.refreshHUD()}""", {"items": items, "lv": cooler_lv, "money": money})
def panel(pg, name): ev(pg, f"window.Nusa.openPanel('{name}')"); time.sleep(0.35)
def tap(pg, sel): pg.click(sel); time.sleep(0.25)
def rect(pg, sel):
    return ev(pg, "s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return {x:r.left,y:r.top,w:r.width,h:r.height,vis:cs.display!=='none'&&r.width>0}}", sel)
def overlap(a, b): return not (a["x"] + a["w"] <= b["x"] or b["x"] + b["w"] <= a["x"] or a["y"] + a["h"] <= b["y"] or b["y"] + b["h"] <= a["y"])
def price_of_all(pg, uids=None): return ev(pg, "u=>window.__nusa.S.cooler.filter(it=>!u||u.includes(it.uid)).reduce((s,it)=>s+window.Nusa.priceOf(it),0)", uids)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs = fresh(b)
    RAR = ev(pg, "Object.fromEntries(['biasa','langka','epik','legenda','sampah'].map(r=>[r,FISH.filter(f=>f.rarity===r&&!f.protected&&!f.emoji||(r==='sampah'&&f.rarity===r)).slice(0,3).map(f=>f.id)]))")
    CAPS = [8, 15, 25, 40, 70, 100, 125, 150, 175, 200]
    COSTS = [0, 250, 1100, 4200, 13000, 19000, 27000, 37000, 49000, 65000]

    # ================= K. Kapasitas coolbox 8 → 200 =================
    cd = ev(pg, "UPGRADES.cooler")
    ok("K1 kapasitas 8/15/25/40/70/100/125/150/175/200 dan harga 0/250/1.100/4.200/13.000/19.000/27.000/37.000/49.000/65.000", cd["cap"] == CAPS and cd["cost"] == COSTS)
    ok("K2 sepuluh tingkat dengan nama dan ikon berbeda, info 'Muat N ikan'", len(cd["levels"]) == 10 and len(set(cd["levels"])) == 10 and len(set(cd["icons"])) >= 8 and all(f"{c}" in i for c, i in zip(CAPS, cd["info"])), cd["levels"])
    seed(pg, [("nila", 1.0)] * 18, 3)
    ok("K3 HUD menampilkan 18/40", ev(pg, "document.getElementById('cooler').textContent") == "18/40", ev(pg, "document.getElementById('cooler').textContent"))
    ok("K4 kapasitas dihitung dari jumlah ikan (bukan kg)", ev(pg, "window.Nusa.coolerCap()") == 40 and ev(pg, "window.Nusa.coolerFull()") is False)
    # beli upgrade lewat UI: koin terpotong tepat sekali, klik ganda dan klik basi ditolak
    ev(pg, "(()=>{const S=window.__nusa.S; S.up.cooler=4; S.money=100000; window.__nusa.save(); window.__nusa.refreshHUD()})()")
    panel(pg, "shop"); m0 = ev(pg, "window.__nusa.S.money")
    btn = "[data-act=buy][data-arg=cooler]"; ok("K5 tombol beli menunjuk tingkat tujuan (data-lv=5)", pg.get_attribute(btn, "data-lv") == "5")
    pg.dblclick(btn); time.sleep(0.5)
    ok("K6 klik ganda: naik tepat satu tingkat, koin terpotong 19.000 sekali", ev(pg, "window.__nusa.S.up.cooler") == 5 and ev(pg, "window.__nusa.S.money") == m0 - 19000, (ev(pg, "window.__nusa.S.up.cooler"), m0 - ev(pg, "window.__nusa.S.money")))
    ev(pg, "(()=>{const b=document.querySelector('[data-act=buy][data-arg=cooler]'); b.dataset.lv='5'; b.click()})()"); time.sleep(0.5)
    ok("K7 klik basi (data-lv lama) tidak membeli lagi", ev(pg, "window.__nusa.S.up.cooler") == 5 and ev(pg, "window.__nusa.S.money") == m0 - 19000)
    ev(pg, "window.Nusa.closePanel()")
    # coolbox penuh tidak bisa menambah ikan; ikan akuarium terpisah
    seed(pg, [("nila", 1.0)] * 8, 0)
    ok("K8 coolbox penuh terdeteksi (8/8)", ev(pg, "window.Nusa.coolerFull()") is True and ev(pg, "document.getElementById('cooler').textContent") == "8/8")
    ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.3); ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.5)
    pg.mouse.move(640, 400); pg.mouse.down(); time.sleep(0.15); pg.mouse.up(); time.sleep(0.4)
    ok("K9 coolbox penuh: lemparan ditolak, ikan tidak bertambah", ev(pg, "window.__nusa.G.phase") == "idle" and ev(pg, "window.__nusa.S.cooler.length") == 8, ev(pg, "window.__nusa.G.phase"))
    ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.3)
    seed(pg, [("nila", 0.8), ("nila", 0.9), ("patin", 2.0)], 0)
    r = ev(pg, "(()=>{const S=window.__nusa.S, aq=S.home.furniture.find(f=>/akuarium/.test(f.type)); const x=NW.HD.putFish(S,'u0',aq.uid,window.Nusa.FISH_BY_ID); return [x.ok, S.cooler.length, S.home.placedFish.length]})()")
    ok("K10 ikan akuarium terpisah: coolbox berkurang 1, akuarium bertambah 1", r == [True, 2, 1], r)

    # ================= I. Inventaris 200 ikan =================
    ids = ev(pg, "FISH.filter(f=>!f.protected).map(f=>f.id)")
    items = [(ids[i % len(ids)], round(0.3 + (i * 7 % 97) * 0.9, 2)) for i in range(200)]
    seed(pg, items, 9)
    ok("I1 coolbox 200/200 ditampilkan", ev(pg, "document.getElementById('cooler').textContent") == "200/200")
    t0 = time.time(); pg.click("#coolerChip", force=True); time.sleep(0.5); topen = time.time() - t0
    rows = ev(pg, "document.querySelectorAll('#invList .inv-row').length"); total = ev(pg, "NW.inv.view().length")
    ok("I2 daftar virtual: 200 ikan, hanya jendela kecil yang dirender di DOM", total == 200 and 0 < rows <= 40, (total, rows))
    ok("I3 membuka inventaris 200 ikan cepat (emulasi, < 2 dtk)", topen < 2.0, f"{topen:.2f}s")
    fps = ev(pg, """async()=>{const sc=document.getElementById('panelBody'); sc.scrollTop=0; let f=0; const t0=performance.now(); await new Promise(res=>{const st=()=>{sc.scrollTop+=45; f++; if(performance.now()-t0<1500) requestAnimationFrame(st); else res()}; requestAnimationFrame(st)}); return f/((performance.now()-t0)/1000)}""")
    rows2 = ev(pg, "document.querySelectorAll('#invList .inv-row').length")
    ok("I4 gulir daftar 200 ikan tetap lancar (emulasi) dan jendela baris ikut bergeser", fps >= 25 and 0 < rows2 <= 40, f"{fps:.0f} fps, {rows2} baris")
    ok("I5 gambar ikan di-cache: satu per spesies", ev(pg, "NW.inv.thumb('nila') === NW.inv.thumb('nila')") and ev(pg, "document.querySelectorAll('#invList img').length") >= 1)
    def order(sort, d=1):
        return ev(pg, "([s,d])=>{const V=NW.inv.state; V.sort=s; V.dir=d; V.filter='all'; V.q=''; return NW.inv.view().map(r=>[r.f.name,r.it.w,r.p,r.f.rarity])}", [sort, d])
    byw = order("weight"); ok("I6 urut berat: terberat dulu, lalu terbalik", all(byw[i][1] >= byw[i + 1][1] for i in range(199)) and all(x[1] <= y[1] for x, y in zip(order("weight", -1), order("weight", -1)[1:])))
    byp = order("price"); ok("I7 urut harga", all(byp[i][2] >= byp[i + 1][2] for i in range(199)))
    byn = order("name"); ok("I8 urut nama (A-Z)", [x[0] for x in byn] == sorted([x[0] for x in byn], key=lambda s: s.lower()) or all(byn[i][0].lower() <= byn[i + 1][0].lower() for i in range(199)))
    rk = {"sampah": 0, "biasa": 1, "langka": 2, "epik": 3, "legenda": 4}; byr = order("rarity")
    ok("I9 urut kelangkaan: legenda dulu", all(rk[byr[i][3]] >= rk[byr[i + 1][3]] for i in range(199)))
    ev(pg, "(()=>{const V=NW.inv.state; V.sort='rarity'; V.dir=1; V.filter='all'; V.q='marlin'})()")
    ok("I10 pencarian 'marlin' hanya memuat marlin", all(r[0] == "Marlin Biru" for r in ev(pg, "NW.inv.view().map(r=>[r.f.name])")) and ev(pg, "NW.inv.view().length") > 0)
    ev(pg, "(()=>{const V=NW.inv.state; V.q=''; V.filter='legenda'})()")
    ok("I11 filter Legenda hanya memuat legenda", all(r[3] == "legenda" for r in ev(pg, "NW.inv.view().map(r=>[r.f.name,0,0,r.f.rarity])")))
    ev(pg, "(()=>{const V=NW.inv.state; V.q=''; V.filter='all'})()"); pg.click("[data-act=invFilter][data-arg=all]"); time.sleep(0.3)
    uid0 = ev(pg, "document.querySelector('#invList .inv-row').dataset.arg"); tap(pg, f"#invList .inv-row[data-arg='{uid0}']")
    det = ev(pg, "(()=>{const d=document.getElementById('invDetail'); return d?{img:!!d.querySelector('.inv-art img, .inv-art .emo'), h:d.querySelector('h3').textContent, txt:d.innerText}:null})()")
    it0 = ev(pg, f"(()=>{{const it=window.__nusa.S.cooler.find(x=>x.uid==='{uid0}'); const f=window.Nusa.FISH_BY_ID[it.id]; return {{name:f.name, kg:window.Nusa.fmtW(it.w), price:window.Nusa.fmt(window.Nusa.priceOf(it)), rar:RARITY[f.rarity].label}}}})()")
    ok("I12 kartu detail: gambar, nama, berat asli, harga, kelangkaan, tombol pamer", det and det["img"] and it0["name"] in det["h"] and it0["kg"] in det["txt"] and it0["price"] in det["txt"] and it0["rar"] in det["txt"] and "Pamerkan Ikan" in det["txt"], det and det["txt"][:80])
    ok("I13 tanpa error JavaScript (inventaris 200)", not errs, errs[:3])

    # ================= P. Pasar Bu Sari =================
    mix = [(RAR["biasa"][0], 1.0), (RAR["biasa"][1], 1.5), (RAR["biasa"][0], 2.0), (RAR["langka"][0], 2.0), (RAR["langka"][1], 3.0), (RAR["epik"][0], 4.0), (RAR["epik"][1], 5.0),
           (RAR["legenda"][0], 8.0), (RAR["sampah"][0], 0.3), (RAR["sampah"][1], 0.2)]
    for kind in ("biasa", "langka", "epik", "legenda", "sampah"):
        seed(pg, mix, 3, money=1000); ev(pg, "window.__nusa.S.stats.earned=0"); panel(pg, "market")
        want = ev(pg, "k=>window.__nusa.S.cooler.filter(it=>window.Nusa.FISH_BY_ID[it.id].rarity===k).map(it=>it.uid)", kind)
        est = price_of_all(pg, want)
        tap(pg, f"[data-act=askSell][data-arg={kind}]")
        conf = ev(pg, "(()=>{const c=document.querySelector('.sell-confirm'); return c?c.innerText:null})()")
        ok(f"P1-{kind} konfirmasi menampilkan jumlah ({len(want)}) dan perkiraan total", conf and str(len(want)) in conf and ev(pg, "n=>window.Nusa.fmt(n)", est) in conf and "Konfirmasi" in conf, conf and conf[:70])
        tap(pg, "[data-act=confirmSell]")
        left = ev(pg, "window.__nusa.S.cooler.map(it=>window.Nusa.FISH_BY_ID[it.id].rarity)")
        ok(f"P2-{kind} hanya ikan {kind} yang terjual; koin & statistik bertambah tepat sekali", kind not in left and len(left) == len(mix) - len(want) and ev(pg, "window.__nusa.S.money") == 1000 + est and ev(pg, "window.__nusa.S.stats.earned") == est, (len(left), ev(pg, "window.__nusa.S.money") - 1000, est))
    # batal
    seed(pg, mix, 3, money=500); panel(pg, "market"); tap(pg, "[data-act=askSell][data-arg=biasa]"); tap(pg, "[data-act=cancelSell]")
    ok("P3 Batal: tidak ada yang terjual, koin tetap", ev(pg, "window.__nusa.S.cooler.length") == len(mix) and ev(pg, "window.__nusa.S.money") == 500)
    # klik Konfirmasi dua kali sangat cepat: hanya satu penjualan
    seed(pg, mix, 3, money=0); panel(pg, "market"); tap(pg, "[data-act=sellAll]"); est = price_of_all(pg)
    ev(pg, "(()=>{const b=document.querySelector('[data-act=confirmSell]'); b.click(); b.click()})()"); time.sleep(0.3)
    ok("P4 klik ganda Konfirmasi: koin dihitung sekali", ev(pg, "window.__nusa.S.money") == est and ev(pg, "window.__nusa.S.cooler.length") == 0, (ev(pg, "window.__nusa.S.money"), est))
    # ikan terkunci & ikan akuarium tidak ikut terjual massal
    lockmix = [(RAR["biasa"][0], 1.0, True), (RAR["biasa"][1], 1.5), (RAR["epik"][0], 4.0, True), (RAR["epik"][1], 5.0), (RAR["langka"][0], 2.0)]
    seed(pg, lockmix, 3, money=0); ev(pg, "window.__nusa.S.home.placedFish=[]")
    ev(pg, "(()=>{const S=window.__nusa.S, aq=S.home.furniture.find(f=>/akuarium/.test(f.type)); S.cooler.push({uid:'aqf',id:'nila',w:0.8,t:1}); NW.HD.putFish(S,'aqf',aq.uid,window.Nusa.FISH_BY_ID)})()")
    panel(pg, "market"); keep_est = price_of_all(pg, ["u1", "u3", "u4"]); tap(pg, "[data-act=sellAll]")
    conf = ev(pg, "document.querySelector('.sell-confirm').innerText")
    tap(pg, "[data-act=confirmSell]"); left = ev(pg, "window.__nusa.S.cooler.map(x=>x.uid).sort()")
    ok("P5 'semua yang tidak dikunci': ikan terkunci tetap ada, hanya yang tidak terkunci terjual", left == ["u0", "u2"] and ev(pg, "window.__nusa.S.money") == keep_est and "3" in conf, left)
    ok("P6 ikan akuarium tidak terjual", ev(pg, "window.__nusa.S.home.placedFish.some(x=>x.uid==='aqf')") and ev(pg, "window.__nusa.S.home.placedFish.length") == 1)
    seed(pg, [(RAR["biasa"][0], 1.0, True), (RAR["biasa"][1], 1.5, True)], 3, money=0); panel(pg, "market")
    ok("P7 semua terkunci: tombol jual massal nonaktif (tidak bisa menjual)", ev(pg, "document.querySelector('[data-act=sellAll]').disabled") and ev(pg, "document.querySelector('[data-act=askSell][data-arg=biasa]').disabled"))
    # harga mengikuti harga pasar harian
    seed(pg, [("marlin", 100.0)], 3); a = ev(pg, "window.Nusa.priceOf(window.__nusa.S.cooler[0])")
    days = ev(pg, "(()=>{const o=[]; for(let d=1; d<=12; d++){ window.__nusa.S.day=d; o.push(window.Nusa.priceOf(window.__nusa.S.cooler[0])) } return o})()")
    ok("P8 harga memakai sistem harga pasar (berubah antar hari, rentang 0,7×–1,45×)", len(set(days)) > 2 and min(days) >= 0.7 * 40 * 3 * 100 - 1 and max(days) <= 1.45 * 40 * 3 * 100 + 1, (min(days), max(days)))
    # peringatan misi
    seed(pg, [("nila", 1.0), ("patin", 2.0)], 3, money=0)
    ev(pg, "(()=>{const S=window.__nusa.S; S.missions.list.push({type:'deliver',npc:'sari',fish:'nila',n:1,coins:60,stars:1,id:'t#deliver',p:0,done:false,claimed:false})})()")
    panel(pg, "market"); tap(pg, f"[data-act=askSell][data-arg={ev(pg, 'window.Nusa.FISH_BY_ID.nila.rarity')}]")
    conf = ev(pg, "document.querySelector('.sell-confirm').innerText")
    ok("P9 peringatan sebelum menjual ikan yang dibutuhkan misi aktif (tombol jadi 'Tetap jual')", "Misi harian" in conf and "Tetap jual" in conf, conf[:120])
    tap(pg, "[data-act=cancelSell]")
    ev(pg, "window.__nusa.S.cooler[0].lock=true"); tap(pg, "[data-act=sellAll]"); conf2 = ev(pg, "document.querySelector('.sell-confirm').innerText")
    ok("P10 ikan misi yang dikunci aman: tidak dijual dan tidak ada peringatan", "Misi harian" not in conf2)
    tap(pg, "[data-act=cancelSell]")
    # jual satuan tetap seperti dulu; misi menjual maju
    seed(pg, [("patin", 2.0), ("patin", 3.0)], 3, money=0); ev(pg, "(()=>{const S=window.__nusa.S; S.missions.list=S.missions.list.filter(m=>m.type!=='deliver')})()")
    ev(pg, "(()=>{const S=window.__nusa.S; S.missions.list=S.missions.list.filter(m=>m.type!=='sell'); S.missions.list.push({type:'sell',n:100000,coins:60,stars:1,id:'t#sell',p:0,done:false,claimed:false})})()")
    pr = ev(pg, "window.Nusa.priceOf(window.__nusa.S.cooler[0])"); p0 = ev(pg, "window.__nusa.S.missions.list.find(m=>m.id==='t#sell').p")
    panel(pg, "market"); tap(pg, "[data-act=sell][data-arg=u0]")
    ok("P11 jual satuan tetap langsung: koin = harga ikan, ikan lain tetap ada", ev(pg, "window.__nusa.S.money") == pr and ev(pg, "window.__nusa.S.cooler.length") == 1, (ev(pg, "window.__nusa.S.money"), pr))
    ok("P12 progres misi 'jual' bertambah sesuai koin terjual", ev(pg, "window.__nusa.S.missions.list.find(m=>m.id==='t#sell').p") == p0 + pr, (p0, pr))
    ok("P13 tanpa error JavaScript (pasar)", not errs, errs[:3])
    ctx.close()

    # ================= R. Sepuluh joran =================
    ctx, pg, errs = fresh(b, (390, 844), True, 2)
    rod = ev(pg, "UPGRADES.rod"); n = len(rod["levels"])
    inc = lambda a: all(a[i] < a[i + 1] for i in range(len(a) - 1))
    ok("R1 sepuluh joran: nama, deskripsi, kemampuan unik; harga, kapasitas, kekuatan, tarikan naik", n == 10 and len(set(rod["levels"])) == 10 and len(set(rod["desc"])) == 10 and len(set(rod["info"])) == 10 and inc(rod["cost"][1:]) and inc(rod["cap"]) and inc(rod["strength"]) and inc(rod["reel"]) and all(rod["desc"]), rod["levels"])
    ok("R2 lima nama lama dipertahankan urutannya (kompatibel), 5 joran baru di atasnya", rod["levels"][:5] == ["Joran Bambu Kampung", "Joran Fiber Muara", "Joran Karbon Sungai", "Joran Titanium Pesisir", "Joran Legenda Nusa"] and rod["cost"][:5] == [0, 400, 1800, 6500, 22000])
    ok("R3 model joran: 10 spesifikasi visual, batang berbeda, 10 gambar pratinjau berbeda", ev(pg, "NW.look.RODS.length") == 10 and ev(pg, "new Set(NW.look.RODS.map(r=>r.blank+r.grip)).size") == 10 and ev(pg, "new Set([0,1,2,3,4,5,6,7,8,9].map(i=>NW.look.rodPreview(i))).size") == 10)
    ev(pg, "(()=>{const S=window.__nusa.S; S.up.rod=4; S.money=200000; window.__nusa.save(); window.__nusa.refreshHUD()})()")
    panel(pg, "shop"); cards = ev(pg, "document.querySelectorAll('.rod-card').length")
    txt = ev(pg, "document.querySelector('.rod-list').innerText")
    ok("R4 katalog toko memuat 10 joran dengan pratinjau, nama, harga, kemampuan, deskripsi", cards == 10 and ev(pg, "document.querySelectorAll('.rod-card img').length") == 10 and all(x in txt for x in rod["levels"]) and all(d in txt for d in rod["desc"]) and "32.000" in txt.replace(",", "."), cards)
    ok("R5 pemain tahu joran yang aktif (satu penanda 'Dipakai', di Legenda Nusa)", txt.count("Dipakai") == 1 and ev(pg, "document.querySelector('.rod-card.cur .nm').innerText").find("Legenda Nusa") >= 0 and ev(pg, "document.querySelectorAll('.rod-card.old').length") == 4)
    ok("R6 hanya joran berikutnya yang bisa dibeli (satu tombol Beli)", ev(pg, "document.querySelectorAll('.rod-card [data-act=buy]').length") == 1 and ev(pg, "document.querySelector('.rod-card [data-act=buy]').dataset.lv") == "5")
    m0 = ev(pg, "window.__nusa.S.money"); pg.dblclick(".rod-card [data-act=buy]"); time.sleep(0.5)
    ok("R7 beli joran: level naik satu, koin terpotong 32.000 sekali (klik ganda aman)", ev(pg, "window.__nusa.S.up.rod") == 5 and ev(pg, "window.__nusa.S.money") == m0 - 32000, (ev(pg, "window.__nusa.S.up.rod"), m0 - ev(pg, "window.__nusa.S.money")))
    ev(pg, "(()=>{const b=document.querySelector('.rod-card [data-act=buy]'); b.dataset.lv='5'; b.click()})()"); time.sleep(0.5)
    ok("R8 klik basi tidak membeli ganda", ev(pg, "window.__nusa.S.up.rod") == 5 and ev(pg, "window.__nusa.S.money") == m0 - 32000)
    ev(pg, "window.Nusa.closePanel()")
    # joran di punggung: terlihat & berbeda untuk tiap tingkat
    ev(pg, "(()=>{window.__bk=[]; const o=NW.look.drawBackRod; NW.look.drawBackRod=function(c,spec){window.__bk.push(spec.name); return o.apply(this,arguments)}})()")
    imgs, names = [], []
    for lvl in range(10):
        ev(pg, f"window.__nusa.S.up.rod={lvl}; NW.world.player.dir=6; NW.world.player.moving=false; NW.world.player.rod=0; window.__bk=[]"); time.sleep(0.3)
        names.append(ev(pg, "window.__bk.length ? window.__bk[window.__bk.length-1] : null"))
        pg.screenshot(path=OUT + f"back_rod_{lvl}.png", clip={"x": 195 - 40, "y": 422 - 70, "width": 80, "height": 90}); imgs.append(open(OUT + f"back_rod_{lvl}.png", "rb").read())
    ok("R9 joran di punggung terlihat untuk kesepuluh tingkat, nama sesuai data, 10 gambar berbeda", names == rod["levels"] and len(set(imgs)) == 10, names)
    # joran yang dipakai memancing: memakai spesifikasi tingkat aktif
    ev(pg, "(()=>{window.__hr=[]; const o=NW.look.drawHeldRod; NW.look.drawHeldRod=function(c,spec){window.__hr.push(spec.name); return o.apply(this,arguments)}})()")
    held = []
    for lvl in (0, 3, 5, 9):
        ev(pg, f"window.__nusa.S.up.rod={lvl}; window.__nusa.enterFishing('dock'); window.__hr=[]"); time.sleep(0.4)
        held.append(ev(pg, "window.__hr.length ? window.__hr[window.__hr.length-1] : null")); ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.2)
    ok("R10 joran dipakai memancing tampil sesuai tingkat aktif (berbeda dari model punggung)", held == [rod["levels"][i] for i in (0, 3, 5, 9)], held)
    ev(pg, "window.__nusa.S.up.rod=0; NW.world.player.rod=1"); time.sleep(0.3); ev(pg, "window.__bk=[]"); time.sleep(0.3)
    ok("R11 joran tidak ganda: saat bersiap memancing, joran punggung tidak digambar", ev(pg, "window.__bk.length") == 0); ev(pg, "NW.world.player.rod=0")
    ok("R12 tanpa error JavaScript (joran)", not errs, errs[:3])

    # ================= H. Pamer ikan =================
    ev(pg, "(()=>{window.__nusa.S.up.rod=3; window.__nusa.goWorld('dock')})()"); time.sleep(0.3)
    CAS = [("nila", 0.8), ("gt", 20.0), ("kerapu_raksasa", 100.0), ("marlin", 500.0), ("marlin", 600.0)]
    seed(pg, CAS + [(RAR["sampah"][0], 0.3)], 9, money=777)
    poses = ev(pg, "[0.8,2,2.01,10,10.01,30,30.1,100,100.1,250,250.1,500,500.1].map(w=>NW.hold.poseFor(w).id)")
    ok("H1 pose menurut berat: ≤2 dada | >2–10 depan | >10–30 angkat | >30–100 bahu | >100–250 menang | >250–500 legenda | >500 spesial", poses == ["dada", "dada", "depan", "depan", "angkat", "angkat", "bahu", "bahu", "menang", "menang", "legenda", "legenda", "spesial"], poses)
    L = ev(pg, "[0.8,20,100,500,5000].map(w=>NW.hold.fishLen(w))")
    ok("H2 skala ikan nonlinear dan dibatasi (tidak memenuhi layar)", L[0] < L[1] < L[2] < L[3] <= L[4] <= 58 and L[3] / L[0] < 4, [round(x, 1) for x in L])
    # alur lewat UI: coolbox → kartu → Pamerkan Ikan
    st0 = S(pg, "window.__nusa.S.stats"); t0 = S(pg, "window.__nusa.S.titles"); ncool = ev(pg, "window.__nusa.S.cooler.length")
    pg.click("#coolerChip", force=True); time.sleep(0.4); tap(pg, "#invList .inv-row[data-arg=u3]"); tap(pg, "#invDetail [data-act=holdFish]"); time.sleep(0.8)
    ok("H3 'Pamerkan Ikan' menutup inventaris dan karakter memegang ikan itu", ev(pg, "window.Nusa.currentPanel()") is None and ev(pg, "NW.hold.holding()") == "u3" and ev(pg, "NW.world.player.hold && NW.world.player.hold.f.id") == "marlin")
    ok("H4 hanya tampilan: ikan tetap di coolbox, jumlah/berat/statistik/gelar tidak berubah", ev(pg, "window.__nusa.S.cooler.length") == ncool and ev(pg, "window.__nusa.S.cooler.some(x=>x.uid==='u3'&&x.w===500)") and S(pg, "window.__nusa.S.stats") == st0 and S(pg, "window.__nusa.S.titles") == t0)
    ok("H5 model ikan = spesies dan berat asli, pose 'legenda' untuk 500 kg", ev(pg, "NW.world.player.hold.w") == 500 and ev(pg, "NW.world.player.hold.p.id") == "legenda")
    ok("H6 hold tidak disimpan ke save (status sementara)", "hold" not in ev(pg, "localStorage.getItem('nusa-island-v1')"))
    # gambar pose 0,8 / 20 / 100 / 500 kg berbeda
    ev(pg, "NW.hold.stop('manual')"); imgs = []
    for id_, w in (("nila", 0.8), ("gt", 20.0), ("kerapu_raksasa", 100.0), ("marlin", 500.0)):
        uid = ev(pg, "a=>window.__nusa.S.cooler.find(x=>x.id===a[0]&&x.w===a[1]).uid", [id_, w]); ev(pg, f"NW.hold.start('{uid}'); NW.world.player.dir=2; NW.world.player.moving=false"); time.sleep(0.9)
        pg.screenshot(path=OUT + f"pamer_{id_}_{int(w)}.png", clip={"x": 195 - 65, "y": 422 - 120, "width": 130, "height": 170}); imgs.append(open(OUT + f"pamer_{id_}_{int(w)}.png", "rb").read())
        ev(pg, "NW.hold.stop('manual')")
    ok("H7 tampilan pamer 0,8 / 20 / 100 / 500 kg berbeda (gambar tersimpan sebagai bukti)", len(set(imgs)) == 4)
    # delapan arah
    uid = ev(pg, "window.__nusa.S.cooler.find(x=>x.w===500).uid"); ev(pg, f"NW.hold.start('{uid}')"); time.sleep(0.8); dimgs = []
    for d in range(8):
        ev(pg, f"NW.world.player.dir={d}; NW.world.player.moving=false"); time.sleep(0.2)
        pg.screenshot(path=OUT + f"pamer_arah_{d}.png", clip={"x": 195 - 65, "y": 422 - 120, "width": 130, "height": 170}); dimgs.append(open(OUT + f"pamer_arah_{d}.png", "rb").read())
    ok("H8 pose terbaca dari delapan arah (delapan gambar berbeda, tanpa error)", len(set(dimgs)) == 8 and not errs, errs[:2])
    # tombol berhenti memegang & tata letak
    sb = rect(pg, "#holdStop"); joy = rect(pg, "#joy"); ev(pg, "document.getElementById('actBtn').classList.remove('hidden')"); act = rect(pg, "#actBtn")
    ok("H9 tombol '✋ Berhenti Memegang' terlihat dan tidak menutupi joystick atau tombol aksi (390×844)", sb["vis"] and not overlap(sb, joy) and not overlap(sb, act), (sb, joy, act))
    ev(pg, "document.getElementById('actBtn').classList.add('hidden')")
    # joran punggung tetap ada saat memegang ikan, tidak menembus (joran digambar, ikan di lapisan sendiri)
    ev(pg, "window.__bk=[]"); time.sleep(0.4)
    ok("H10 joran aktif tetap terlihat di punggung saat memegang ikan (tidak hilang permanen)", ev(pg, "window.__bk.length") > 3)
    tap(pg, "#holdStop")
    ok("H11 tombol berhenti: berhenti memegang, ikan tidak terhapus", ev(pg, "NW.hold.holding()") is None and ev(pg, "window.__nusa.S.cooler.some(x=>x.uid==='%s')" % uid) and not rect(pg, "#holdStop")["vis"])
    lifts = ev(pg, "(()=>{const a=[]; for(const w of [0.8,20,100,500]){ const it=window.__nusa.S.cooler.find(x=>x.w===w); NW.hold.start(it.uid); a.push(NW.hold.labelLift()); NW.hold.stop('x')} return a})()")
    ok("H12 label nama naik mengikuti tinggi ikan (0 untuk ikan kecil, naik bertahap, jelas di ikan besar)", lifts[0] == 0 and lifts == sorted(lifts) and lifts[3] > 10, [round(x, 1) for x in lifts])
    # berhenti otomatis
    ev(pg, f"NW.hold.start('u1')"); time.sleep(0.4); ev(pg, "window.__nusa.S.cooler = window.__nusa.S.cooler.filter(x=>x.uid!=='u1')"); time.sleep(0.4)
    ok("H13 berhenti otomatis bila ikan tidak lagi dimiliki", ev(pg, "NW.hold.holding()") is None)
    ev(pg, "NW.hold.start('u0')"); time.sleep(0.3); panel(pg, "market")
    tap(pg, "[data-act=sell][data-arg=u0]"); time.sleep(0.5)
    ok("H14 berhenti otomatis saat ikan yang dipamerkan dijual (dijual satu kali)", ev(pg, "NW.hold.holding()") is None and not ev(pg, "window.__nusa.S.cooler.some(x=>x.uid==='u0')"), ev(pg, "window.__nusa.S.money"))
    ev(pg, "window.Nusa.closePanel()")
    ev(pg, "(()=>{const S=window.__nusa.S, aq=S.home.furniture.find(f=>/akuarium/.test(f.type)); S.cooler.push({uid:'aq9',id:'nila',w:0.9,t:1}); NW.hold.start('aq9'); window.__aq=aq.uid})()"); time.sleep(0.4)
    ev(pg, "NW.HD.putFish(window.__nusa.S,'aq9',window.__aq,window.Nusa.FISH_BY_ID)"); time.sleep(0.4)
    ok("H15 berhenti otomatis saat ikan dipindah ke akuarium (ikan tetap di akuarium, tidak ganda)", ev(pg, "NW.hold.holding()") is None and ev(pg, "window.__nusa.S.home.placedFish.filter(x=>x.uid==='aq9').length") == 1 and ev(pg, "window.__nusa.S.cooler.filter(x=>x.uid==='aq9').length") == 0)
    ev(pg, "NW.hold.start('u2')"); time.sleep(0.3); ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.4)
    ok("H16 berhenti otomatis saat masuk mode memancing (joran di tangan)", ev(pg, "NW.hold.holding()") is None); ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.3)
    # dari mode mancing: Pamerkan membawa ke dermaga
    ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.4); pg.click("#coolerChip", force=True); time.sleep(0.4)
    tap(pg, "#invList .inv-row"); tap(pg, "#invDetail [data-act=holdFish]"); time.sleep(0.9)
    ok("H17 dari mode memancing: 'Pamerkan' membawa ke kampung dan memegang ikan", ev(pg, "window.__nusa.mode()") == "world" and ev(pg, "NW.hold.holding()") is not None)
    ev(pg, "NW.hold.stop('x')")
    ok("H18 sampah dan ikan dilindungi tidak bisa dipamerkan", ev(pg, "NW.hold.isShowable({id:'%s',w:1})" % RAR["sampah"][0]) is False and ev(pg, "NW.hold.isShowable({id:'hiu_paus',w:500})") is False and ev(pg, "NW.hold.start('tidakada')") is False)
    ok("H19 tanpa error JavaScript (pamer ikan)", not errs, errs[:3])
    ctx.close()
    # tata letak HP kecil 360×740
    ctx, pg, errs = fresh(b, (360, 740), True, 2); seed(pg, [("marlin", 500.0)], 9); ev(pg, "NW.hold.start('u0')"); time.sleep(0.6)
    sb = rect(pg, "#holdStop"); joy = rect(pg, "#joy"); ev(pg, "document.getElementById('actBtn').classList.remove('hidden')"); act = rect(pg, "#actBtn")
    ok("H20 tombol berhenti tidak menutupi joystick/aksi pada 360×740", sb["vis"] and not overlap(sb, joy) and not overlap(sb, act) and sb["x"] >= 0 and sb["x"] + sb["w"] <= 360, (sb, joy, act)); ctx.close()

    # ================= F. Ikan raksasa & perlawanan =================
    ctx, pg, errs = fresh(b)
    fm = ev(pg, "(()=>{const f=FISH.find(x=>x.id==='marlin'); return {b:[10,20,40,100,300,500].map(w=>NW.FM.bigness(w)), s:[10,20,40,100,300,500].map(w=>NW.FM.sizeMul(w)), p:[80,150,300,500].map(w=>NW.FM.fightPower(f,w,0.5))}})()")
    ok("F1 ikan ≤ 20 kg tanpa efek ukuran; di atasnya tekanan naik tegas", fm["b"][0] == 0 and fm["b"][1] == 0 and fm["s"][0] == 1 and fm["s"][1] == 1 and all(fm["p"][i] < fm["p"][i + 1] for i in range(3)) and fm["b"][5] > fm["b"][3] > 0, fm)
    SEED = 20260101
    def rate(cases, trials=24): return [r for _, r in balance_sim.run(cases, trials, seed=SEED, browser=b)]
    A = rate([{"fish": "marlin", "w": 150, "rod": 7, "skill": 1}, {"fish": "marlin", "w": 500, "rod": 7, "skill": 1}])
    ok("F2 ikan besar terukur lebih sulit: marlin 150 kg vs 500 kg (joran level 8)", A[0]["rate"] - A[1]["rate"] >= 0.5, (A[0]["rate"], A[1]["rate"]))
    B = rate([{"fish": "marlin", "w": 300, "rod": 5, "skill": 1}, {"fish": "marlin", "w": 300, "rod": 7, "skill": 1}])
    ok("F3 joran lebih baik menaikkan peluang (marlin 300 kg: joran 6 vs 8)", B[1]["rate"] - B[0]["rate"] >= 0.3, (B[0]["rate"], B[1]["rate"]))
    C = rate([{"fish": "marlin", "w": 500, "rod": 9, "skill": 1}, {"fish": "marlin", "w": 500, "rod": 9, "skill": 0}])
    ok("F4 joran terbaik tidak menjamin raksasa 500 kg (<90%), tanpa keahlian hampir mustahil", C[0]["rate"] < 0.9 and C[1]["rate"] <= 0.2, (C[0]["rate"], C[1]["rate"]))
    ok("F5 raksasa tetap bisa ditaklukkan pemain terampil dengan joran terbaik (>0%) dan tidak berlarut (≤ 60 dtk)", C[0]["rate"] > 0 and C[0]["avgTc"] <= 60, (C[0]["rate"], round(C[0]["avgTc"])))
    D = rate([{"fish": "marlin", "w": 500, "rod": 0, "skill": 1}, {"fish": "nila", "w": 0.6, "rod": 0, "skill": 0}, {"fish": "gabus", "w": 3.5, "rod": 0, "skill": 1}])
    ok("F6 joran kurang kuat: risiko senar putus nyata, tidak ada hadiah otomatis", D[0]["caught"] == 0 and D[0]["snap"] >= 0.5 * 24, D[0])
    ok("F7 ikan kecil tetap mudah dengan joran awal (nila 100%, gabus terampil ≥ 90%)", D[1]["rate"] == 1 and D[2]["rate"] >= 0.9 and D[1]["avgTc"] <= 25, (D[1]["rate"], D[2]["rate"]))
    # peringatan & tidak ada kerusakan permanen
    r = ev(pg, """()=>{const S=window.__nusa.S, G=window.__nusa.G, N=window.__nusa; S.up.rod=0; S.money=555; S.cooler=[]; const fish=FISH.find(f=>f.id==='marlin');
      G.pending={fish,w:300,wr:.5}; G.phase='bite'; N.startFight(); const F=G.fight, weak=F.weak, name=document.getElementById('fightName').textContent;
      F.T=1.15; F.over=1; N.updateFight(0.05); return {weak, name, rod:S.up.rod, money:S.money, cooler:S.cooler.length, phase:G.phase, fight:!!G.fight}}""")
    ok("F8 peringatan 'Joran kurang kuat' tampil; senar putus hanya kehilangan ikan (joran, koin, coolbox utuh)", r["weak"] and "Joran kurang kuat" in r["name"] and r["rod"] == 0 and r["money"] == 555 and r["cooler"] == 0 and not r["fight"], r)
    # ikan dilindungi tetap dilepas
    r = ev(pg, """()=>{const S=window.__nusa.S, G=window.__nusa.G, N=window.__nusa; S.up.rod=9; S.money=0; S.cooler=[]; const fish=FISH.find(f=>f.id==='hiu_paus'); const c0=S.stats.caught;
      G.pending={fish,w:400,wr:.5}; G.phase='bite'; N.startFight(); G.fight.P=1.5; N.updateFight(0.01);
      document.getElementById('catchWrap').classList.add('hidden'); return {cooler:S.cooler.length, money:S.money, protectedFlag:!!fish.protected}}""")
    ok("F9 Hiu Paus (dilindungi) tetap dilepas: tidak masuk coolbox, tidak bisa dijual atau dipamerkan, ada hadiah konservasi", r["protectedFlag"] and r["cooler"] == 0 and r["money"] > 0, r)
    E = rate([{"fish": "gabus", "w": 2.8, "rod": 0, "skill": 1, "challenge": True}], 24)
    ok("F10 ikan uji Pak Darto (gabus 2,8 kg, joran awal) tetap dapat diselesaikan", E[0]["rate"] >= 0.7, E[0]["rate"])
    # berat ikan: kecil paling sering, ekstrem sangat langka
    w = ev(pg, """()=>{let a=1; Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
      const f=FISH.find(x=>x.id==='marlin'), n=40000, ws=[]; for(let i=0;i<n;i++) ws.push(NW.FM.rollWeight(f).w); ws.sort((x,y)=>x-y);
      return {med:ws[n>>1], over:ws.filter(x=>x>f.wMax).length/n, big:ws.filter(x=>x>=450).length/n, max:ws[n-1], min:ws[0], wMin:f.wMin, wMax:f.wMax, xMax:f.xMax}}""")
    ok("F11 marlin: berat tengah jauh di bawah maksimum biasa; >400 kg hanya varian ekstrem (<3%); ≥450 kg <1%; tidak melebihi 500 kg", w["med"] < 0.5 * w["wMax"] and 0.001 < w["over"] < 0.03 and w["big"] < 0.01 and w["max"] <= 500 and w["min"] >= w["wMin"], w)
    ok("F12 tanpa error JavaScript (fight)", not errs, errs[:3]); ctx.close()

    # ================= E. Ekonomi =================
    ctx, pg, errs = fresh(b)
    e = ev(pg, """()=>{const f=FISH.find(x=>x.id==='marlin'), sc=3, old=(w,m)=>Math.round(f.price*sc*w*m);
      const cost=(k)=>UPGRADES[k].cost.reduce((a,b)=>a+b,0);
      return {p80:NW.FM.priceFor(f,80,1,sc), o80:old(80,1), p100:NW.FM.priceFor(f,100,1,sc), o100:old(100,1), p500:NW.FM.priceFor(f,500,1.45,sc), o500:old(500,1.45),
        mono:[50,100,200,300,400,500].map(w=>NW.FM.priceFor(f,w,1,sc)), total:cost('rod')+cost('cooler')+cost('boat')+cost('bait'), maxAll:Math.max(...FISH.filter(x=>!x.protected).map(x=>NW.FM.priceFor(x,x.xMax||x.wMax,1.45,sc)))}}""")
    ok("E0 skala harga (×3) sesuai priceOf asli", ev(pg, "(()=>{const S=window.__nusa.S; S.cooler=[{uid:'z',id:'marlin',w:80,t:1}]; const m=window.Nusa.priceMult('marlin',S.day); return window.Nusa.priceOf(S.cooler[0])===Math.round(40*3*80*m)})()"))
    ok("E1 harga sampai 100 kg tidak berubah (rumus lama), di atasnya dikompres", e["p80"] == e["o80"] and e["p100"] == e["o100"] and e["p500"] < 0.4 * e["o500"] and all(e["mono"][i] < e["mono"][i + 1] for i in range(5)), e)
    ok("E2 ikan termahal sekalipun (500 kg, harga pasar tertinggi) di bawah 15% total biaya semua upgrade: tidak membeli semuanya otomatis", e["maxAll"] < 0.15 * e["total"], (e["maxAll"], e["total"]))
    ok("E3 tetap satu mata uang (koin) dan kunci simpanan nusa-island-v1", ev(pg, "Object.keys(window.__nusa.S).filter(k=>/gem|diamond|crystal|premium|cash/i.test(k)).length") == 0 and ev(pg, "localStorage.getItem('nusa-island-v1')") is not None)
    ctx.close()

    # ================= G. Migrasi v5 → v6 & data lama =================
    v5 = {"v": 5, "money": 4321, "day": 9, "hour": 10, "loc": 0, "up": {"rod": 3, "bait": 2, "cooler": 4, "boat": 1},
          "cooler": [{"uid": "o1", "id": "nila", "w": 0.8, "lock": "ya"}, {"uid": "o2", "id": "patin", "w": 3.1, "lock": True}, {"uid": "o3", "id": "gabus", "w": 2.0}],
          "dex": {"nila": {"n": 12, "best": 1.1}, "patin": {"n": 4, "best": 3.1}}, "stats": {"casts": 40, "caught": 16, "earned": 700, "legends": 0}, "muted": True,
          "story": {"v": 1, "ch": 3, "step": 1, "prog": {"reads": 1}, "mats": {"benang": True, "bambu": True, "damar": True}, "rewarded": {"ch1": 1, "ch2": 1}, "title": None, "corner": 1, "doneAt": {}},
          "skills": {"v": 1, "presisi": True, "membaca": True, "kendali": False, "stats": {"hot": 4, "reads": 3, "tired": 0}},
          "onboard": {"v": 1, "walk": True, "talk": True, "fish": True, "sell": True, "home": True},
          "titles": {"v": 1, "fish": 16, "rank": 2}, "profile": {"v": 1, "name": "Budi"}}
    ctx, pg, errs = page(b, v5); s = S(pg)
    ok("G1 simpanan v5 → v7 (Bumbu 2): koin, joran (level 4), coolbox, ikan, cerita, keahlian, statistik, gelar, nama utuh", s["v"] == 7 and s["money"] == 4321 and s["up"] == {"rod": 3, "bait": 2, "cooler": 4, "boat": 1} and len(s["cooler"]) == 3 and s["story"]["ch"] == 3 and s["skills"]["membaca"] and s["stats"]["caught"] == 16 and s["titles"]["fish"] == 16 and s["profile"]["name"] == "Budi", s["up"])
    bk = ev(pg, "localStorage.getItem('nusa-island-v1-backup-v5')")
    ok("G2 cadangan v5 dibuat sebelum migrasi dan sama dengan simpanan asli", bk is not None and json.loads(bk)["money"] == 4321 and json.loads(bk)["v"] == 5 and json.loads(bk)["cooler"][0]["lock"] == "ya")
    ok("G3 penanda kunci dirapikan (hanya true yang tersisa); ikan tidak hilang", [x.get("lock") for x in s["cooler"]] == [None, True, None])
    ok("G4 level joran lama tidak diturunkan: Joran Titanium Pesisir aktif, kapasitas 70", ev(pg, "NW.look.rodSpec().name") == "Joran Titanium Pesisir" and ev(pg, "window.Nusa.coolerCap()") == 70)
    ok("G5 rumah dan akuarium aman (rumah level, perabot, akuarium awal)", s["home"]["level"] >= 1 and any("akuarium" in f["type"] for f in s["home"]["furniture"]))
    ok("G6 misi harian tersedia dan koleksi (dex) tidak berubah", len(s["missions"]["list"]) >= 1 and s["dex"]["nila"]["n"] == 12 and s["dex"]["patin"]["n"] == 4)
    ev(pg, "window.__nusa.save()"); pg.reload(); time.sleep(0.8); s2 = S(pg)
    ok("G7 muat ulang idempoten (tanpa duplikat, cadangan tidak tertimpa)", s2["v"] == 7 and len(s2["cooler"]) == 3 and s2["money"] == 4321 and json.loads(ev(pg, "localStorage.getItem('nusa-island-v1-backup-v5')"))["v"] == 5)
    ok("G8 tanpa error JavaScript (migrasi v5)", not errs, errs[:3]); ctx.close()
    bad = dict(v5, up={"rod": 99, "bait": 0, "cooler": -3, "boat": 0})
    ctx, pg, errs = page(b, bad); s = S(pg)
    ok("G9 nilai joran/coolbox di luar rentang dirapikan (tidak crash)", s["up"]["rod"] == 9 and s["up"]["cooler"] == 0 and not errs, (s["up"], errs[:2])); ctx.close()
    v4 = dict(v5, v=4); v4.pop("titles"); v4.pop("profile")
    ctx, pg, errs = page(b, v4); s = S(pg)
    ok("G10 simpanan v4 → v7 juga aman dan dicadangkan (v4)", s["v"] == 7 and s["money"] == 4321 and s["up"]["rod"] == 3 and ev(pg, "localStorage.getItem('nusa-island-v1-backup-v4')") is not None and not errs, errs[:2]); ctx.close()
    b.close()

print("\n".join(R))
print(f"\n{sum(r.startswith('PASS') for r in R)} lulus / {sum(r[:4] in ('PASS','FAIL') for r in R)}")
print("tangkapan layar:", OUT)
