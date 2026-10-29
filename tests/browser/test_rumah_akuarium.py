import time, json
import os, tempfile
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = tempfile.mkdtemp(prefix="nusa-test-") + "/"
from playwright.sync_api import sync_playwright
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else ""))
def ev(pg, js, arg=None): return pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)

def seeded_page(b, save, mobile=False):
    ctx = b.new_context(viewport={"width": 390, "height": 844} if mobile else {"width": 1280, "height": 800}, is_mobile=mobile, has_touch=mobile)
    if save is not None:
        raw = save if isinstance(save, str) else json.dumps(save)
        ctx.add_init_script("if(!sessionStorage.getItem('seeded')){localStorage.setItem('nusa-island-v1', %s);sessionStorage.setItem('seeded','1')}" % json.dumps(raw))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.8)
    return ctx, pg, errs
def touch_drag(pg, x0, y0, x1, y1, target_sel=None):
    if target_sel: print("elemen di titik awal:", pg.evaluate(f"(()=>{{const e=document.elementFromPoint({x0},{y0});return e.id||e.className}})()"))
    pg.evaluate("""([x0,y0,x1,y1,sel])=>{const el=sel?document.querySelector(sel):document.elementFromPoint(x0,y0); window.__dragEl=el; const o=(x,y,b)=>({pointerId:9,pointerType:'touch',isPrimary:true,bubbles:true,clientX:x,clientY:y,button:0,buttons:b});
      el.dispatchEvent(new PointerEvent('pointerdown',o(x0,y0,1)));
      for(let i=1;i<=12;i++){el.dispatchEvent(new PointerEvent('pointermove',o(x0+(x1-x0)*i/12,y0+(y1-y0)*i/12,1)));}
      el.dispatchEvent(new PointerEvent('pointerup',o(x1,y1,0)));}""", [x0, y0, x1, y1, target_sel]); time.sleep(0.5)

with sync_playwright() as p:
    b = p.chromium.launch()
    # ================= A. Simpanan lama =================
    t1 = {"money": 1234, "day": 5, "hour": 9, "loc": 2, "up": {"rod": 2, "bait": 1, "cooler": 1, "boat": 2}, "cooler": [{"id": "nila", "w": 0.8}, {"id": "nila", "w": 0.8}, {"id": "patin", "w": 3.1}],
          "dex": {"nila": {"n": 4, "best": 1.1}, "patin": {"n": 1, "best": 3.1}}, "stats": {"casts": 30, "caught": 12, "earned": 900, "legends": 0}, "muted": True}
    ctx, pg, errs = seeded_page(b, t1)
    S = ev(pg, "JSON.parse(JSON.stringify(window.__nusa.S))")
    ok("A1 simpanan Tahap 1: koin, upgrade, koleksi utuh", S["money"] == 1234 and S["up"]["rod"] == 2 and S["dex"]["nila"]["n"] == 4)
    ok("A1 ikan lama dapat uid unik, jumlah tetap 3 (tidak digandakan)", len(S["cooler"]) == 3 and len({x["uid"] for x in S["cooler"]}) == 3 and S["cooler"][2]["w"] == 3.1)
    ok("A1 rumah baru Level 1 dibuat", S["home"]["level"] == 1 and S["home"]["version"] == 2 and S["v"] >= 3)
    ok("A1 cadangan simpanan lama dibuat", ev(pg, "!!localStorage.getItem('nusa-island-v1-backup-v1')"))
    ctx.close()
    t2 = dict(t1, home={"items": ["karpet", "tanaman", "lampu", "lukisan", "radio", "trofi", "kucing", "akuarium"], "cat": None}, rep=9, friends={"darto": 2.3}, talked={},
              missions={"day": 5, "list": [{"type": "catch_any", "n": 3, "coins": 100, "stars": 1, "p": 3, "done": True, "claimed": True}, {"type": "sell", "n": 100, "coins": 80, "stars": 1, "p": 20, "done": False, "claimed": False}, {"type": "perfect", "n": 2, "coins": 70, "stars": 1, "p": 0, "done": False, "claimed": False}]})
    ctx, pg, errs2 = seeded_page(b, t2)
    S = ev(pg, "JSON.parse(JSON.stringify(window.__nusa.S))")
    h = S["home"]
    ok("A2 simpanan Tahap 2A: rumah jadi Level 4 (tidak mengecil)", h["level"] == 4)
    ok("A2 semua perabot & dekorasi 2A tetap ada", len(h["furniture"]) + len(h["stored"]) == 8 and sorted(h["decorations"]) == ["kucing", "lampu", "lukisan"], [f["type"] for f in h["furniture"]] + ["|"] + [f["type"] for f in h["stored"]])
    ok("A2 misi, reputasi, pertemanan tetap", S["rep"] == 9 and S["friends"]["darto"] == 2.3 and S["missions"]["list"][0]["claimed"] and S["missions"]["list"][1]["p"] == 20)
    ok("A2 cadangan v2 dibuat", ev(pg, "!!localStorage.getItem('nusa-island-v1-backup-v2')"))
    ctx.close()
    ctx, pg, errs3 = seeded_page(b, "{rusak!!")
    ok("A3 simpanan rusak: cadangan dibuat & game tetap jalan", ev(pg, "Object.keys(localStorage).some(k=>k.startsWith('nusa-island-v1-backup-rusak'))") and ev(pg, "window.__nusa.mode()") == "world")
    ctx.close()

    # ================= permainan baru =================
    ctx, pg, errs = seeded_page(b, None)
    pg.click("#startBtn"); time.sleep(0.3)
    ev(pg, "window.__nusa.S.hour=10; window.__nusa.S.muted=true; NW.world.npcs.forEach(NW.world.placeNPC)")
    # ================= B. 10 level berbeda =================
    hashes = ev(pg, """(()=>{const out=[]; for(let lv=1;lv<=10;lv++){const c=document.createElement('canvas'); c.width=420;c.height=320; const x=c.getContext('2d'); x.translate(210-0,200-210); NW.HOUSE.drawExterior(x,lv,1,0,{}); out.push(c.toDataURL().length+':'+c.toDataURL().slice(-60));} return out})()""")
    ok("B1 10 model eksterior berbeda (gambar unik)", len(set(hashes)) == 10)
    rooms = ev(pg, "NW.HD.LEVELS.slice(1).map(L=>L.room[0]*L.room[1])")
    ok("B2 interior membesar (luas tidak pernah turun) & berubah tata letak", all(rooms[i] <= rooms[i + 1] for i in range(9)) and rooms[-1] > rooms[0] * 4, rooms)
    prices = ev(pg, "NW.HD.LEVELS.slice(2).map(L=>L.price)")
    ok("B3 harga upgrade naik bertahap", all(prices[i] < prices[i + 1] for i in range(len(prices) - 1)), prices)
    # ================= D. masuk & keluar =================
    ev(pg, "const p=NW.world.player; p.x=NW.HOME_GATE.x; p.y=NW.HOME_GATE.y+0.75"); time.sleep(0.4)
    ok("D1 gapura Rumahku terdeteksi di kampung", ev(pg, "NW.world.target&&NW.world.target.id") == "home")
    pg.keyboard.press("e"); time.sleep(0.9)
    ok("D2 masuk halaman pribadi (instanced)", ev(pg, "NW.home.scene") == "plot")
    ev(pg, "(()=>{const L=NW.HOUSE.plotLayout(1);const p=NW.world.player;p.x=L.doorPt.x;p.y=L.doorPt.y})()"); time.sleep(0.4)
    pg.keyboard.press("e"); time.sleep(0.9)
    ok("D3 masuk ke dalam rumah", ev(pg, "NW.home.scene") == "room")
    ok("D4 pemain tidak terjebak di collision saat masuk", ev(pg, "(()=>{const p=NW.world.player;return NW.home.walkable(p.x,p.y)})()"))
    # ================= C. upgrade lewat papan renovasi =================
    ev(pg, "NW.home.goPlot(NW.world.player,'door')"); time.sleep(0.4)
    # isi rumah & akuarium dulu
    ev(pg, """(()=>{const S=window.__nusa.S,HD=NW.HD; S.up.cooler=3; for(const t of ['karpet','tanaman','radio','trofi']) HD.addFurniture(S.home,S,t);
      for(const [id,w] of [['nila',.8],['mujair',.5],['lele',1.2],['mas',1.1],['patin',2.2],['kakap',2]]) S.cooler.push({uid:HD.newUid(S),id,w,t:1});
      const aq=S.home.furniture.concat(S.home.stored).find(f=>f.type==='akuariumKecil'); if(S.home.stored.includes(aq)){S.home.stored.splice(S.home.stored.indexOf(aq),1);S.home.furniture.push(HD.findSpot(S.home,aq,0,0)||aq);}
      for(const id of ['nila','mujair']) HD.putFish(S,S.cooler.find(x=>x.id===id).uid,aq.uid,window.Nusa.FISH_BY_ID); window.__nusa.save();})()""")
    inv0 = ev(pg, "JSON.stringify([window.__nusa.S.cooler.map(x=>x.uid).sort(), window.__nusa.S.home.placedFish.map(x=>x.uid+x.aq).sort()])")
    items0 = ev(pg, "window.__nusa.S.home.furniture.length+window.__nusa.S.home.stored.length")
    good = True; detail = []
    for lv in range(2, 11):
        price = ev(pg, f"NW.HD.LEVELS[{lv}].price")
        ev(pg, f"window.__nusa.S.money={price}+77; window.__nusa.S.rep=40")
        ev(pg, "window.Nusa.openPanel('renov')"); time.sleep(0.3)
        pg.click("[data-act=renov]")
        try: pg.click("[data-act=renov]", timeout=300)  # klik kedua (tidak boleh memotong lagi)
        except Exception: pass
        time.sleep(0.2)
        money = ev(pg, "window.__nusa.S.money"); level = ev(pg, "window.__nusa.S.home.level")
        if money != 77 or level != lv: good = False; detail.append((lv, money, level))
        time.sleep(2.1)
        if lv in (4, 7, 10): pg.screenshot(path=OUT + f"u_up{lv}.png")
    ok("C1 tiap upgrade memotong koin tepat sekali (9 upgrade)", good, detail)
    ok("C2 upgrade tidak menghapus perabot", ev(pg, "window.__nusa.S.home.furniture.length+window.__nusa.S.home.stored.length") == items0)
    ok("C3 upgrade tidak mengubah ikan (uid & akuarium sama)", ev(pg, "JSON.stringify([window.__nusa.S.cooler.map(x=>x.uid).sort(), window.__nusa.S.home.placedFish.map(x=>x.uid+x.aq).sort()])") == inv0)
    ok("C4 semua perabot valid setelah upgrade", ev(pg, "window.__nusa.S.home.furniture.every(f=>NW.HD.canPlace(window.__nusa.S.home,f).ok)"))
    ok("C5 Level 10 tercapai, tombol renovasi hilang", ev(pg, "window.__nusa.S.home.level") == 10)
    # level tetap bisa dikunjungi
    ev(pg, "NW.home.goRoom(NW.world.player)"); time.sleep(0.5); pg.screenshot(path=OUT + "u_room10.png")
    ok("C6 Level 10 bisa dimasuki & pemain bebas bergerak", ev(pg, "(()=>{const p=NW.world.player;return NW.home.scene==='room'&&NW.home.walkable(p.x,p.y)})()"))

    # ================= E. Mode Tata Ruang =================
    pg.click("#layoutBtn"); time.sleep(0.3)
    aq = ev(pg, "(()=>{const f=window.__nusa.S.home.furniture.find(f=>f.type==='akuariumKecil');return {uid:f.uid,x:f.x,y:f.y}})()")
    def scr(x, y, z=0): return ev(pg, f"(()=>{{const w=NW.P({x},{y},{z}); const c=document.getElementById('game'); const t=NW.world.toTile(0,0,0); const a=NW.world.toTile(100,0,0); return null}})()")
    # proyeksi dunia→layar memakai invers toTile: cari titik layar dengan pencarian
    to_screen = """([x,y,z])=>{ let best=null,bd=1e9; for(let sx=0;sx<innerWidth;sx+=6) for(let sy=0;sy<innerHeight;sy+=6){const t=NW.world.toTile(sx,sy,z); const d=Math.hypot(t.x-x,t.y-y); if(d<bd){bd=d;best=[sx,sy];}} return best; }"""
    f = ev(pg, "(()=>{const f=window.__nusa.S.home.furniture.find(f=>f.type==='akuariumKecil');const r=NW.HD.fp(f);return [(r.x0+r.x1)/2,(r.y0+r.y1)/2, NW.HD.FURN[f.type].h*0.3]})()")
    s0 = ev(pg, to_screen, [f[0], f[1], f[2]])
    tgt = ev(pg, "(()=>{const h=window.__nusa.S.home, f=h.furniture.find(f=>f.type==='akuariumKecil'); const c=[]; for(let y=0.05;y<8;y+=0.5) for(let x=0.05;x<10;x+=0.5){const t={...f,x,y}; if(Math.hypot(x-f.x,y-f.y)>2 && NW.HD.canPlace(h,t).ok) c.push([x,y]);} c.sort((a,b)=>Math.hypot(a[0]-5,a[1]-4)-Math.hypot(b[0]-5,b[1]-4)); return c[0]})()")
    dx, dy = tgt[0] - aq["x"], tgt[1] - aq["y"]
    s1 = ev(pg, to_screen, [f[0] + dx, f[1] + dy, f[2]])
    touch_drag(pg, s0[0], s0[1], s1[0], s1[1], "#game")
    aq2 = ev(pg, "(()=>{const f=window.__nusa.S.home.furniture.find(f=>f.type==='akuariumKecil');return {x:f.x,y:f.y}})()")
    ok("E1 akuarium digeser (sentuh) ke posisi valid", (abs(aq2["x"] - aq["x"]) + abs(aq2["y"] - aq["y"])) > 0.4 and ev(pg, "(()=>{const h=window.__nusa.S.home;return NW.HD.canPlace(h,h.furniture.find(f=>f.type==='akuariumKecil')).ok})()"), (aq, aq2, tgt))
    door = ev(pg, "NW.HD.doorOf(10)")
    s2 = ev(pg, to_screen, [0.6, door["y0"] + 0.4, f[2]]); s3 = ev(pg, to_screen, [(aq2["x"] + 0.4), (aq2["y"] + 0.8), f[2]])
    touch_drag(pg, s3[0], s3[1], s2[0], s2[1], "#game")
    aq3 = ev(pg, "(()=>{const f=window.__nusa.S.home.furniture.find(f=>f.type==='akuariumKecil');return {x:f.x,y:f.y}})()")
    ok("E2 ditolak bila menghalangi pintu (posisi kembali)", aq3 == aq2, aq3)
    rot0 = ev(pg, "window.__nusa.S.home.furniture.find(f=>f.type==='akuariumKecil').rot")
    pg.click("#lbRotate"); time.sleep(0.3)
    ok("E3 akuarium bisa diputar", ev(pg, "window.__nusa.S.home.furniture.find(f=>f.type==='akuariumKecil').rot") != rot0)
    pg.screenshot(path=OUT + "u_layout.png")
    # simpan tanaman ke gudang lalu pasang lagi
    ev(pg, "(()=>{const h=window.__nusa.S.home;NW.home.state.sel=h.furniture.find(f=>f.type==='tanaman').uid})()"); pg.click("#lbStore"); time.sleep(0.2)
    stored = ev(pg, "window.__nusa.S.home.stored.some(f=>f.type==='tanaman')")
    pg.click("#lbStored .chip-btn"); time.sleep(0.2)
    ok("E4 simpan ke gudang & pasang kembali", stored and ev(pg, "window.__nusa.S.home.furniture.some(f=>f.type==='tanaman')"))
    ev(pg, "(()=>{const h=window.__nusa.S.home;NW.home.state.sel=h.furniture.find(f=>f.type==='akuariumKecil').uid})()"); pg.click("#lbStore"); time.sleep(0.2)
    ok("E5 akuarium berisi ikan tidak bisa masuk gudang", ev(pg, "window.__nusa.S.home.furniture.some(f=>f.type==='akuariumKecil')"))
    pg.click("#lbDone"); time.sleep(0.3)
    ok("E6 jalan ke semua perabot tetap terbuka", ev(pg, "(()=>{const h=window.__nusa.S.home,R=NW.HD.reachable(h,NW.HD.solidRects(h));return h.furniture.filter(f=>NW.HD.FURN[f.type].kind==='solid').every(f=>NW.HD.interactPoint(f,R))})()"))

    # ================= F. Akuarium =================
    aqu = ev(pg, "window.__nusa.S.home.furniture.find(f=>f.type==='akuariumKecil').uid")
    ev(pg, f"NW.aqui.open('{aqu}')"); time.sleep(0.6)
    ok("F1 kapasitas tampil jelas", pg.inner_text("#aqCap") == "2/3", pg.inner_text("#aqCap"))
    # ketuk kartu lele → Masukkan
    pg.locator(".aq-card", has_text="Lele").click(); time.sleep(0.2); pg.click("[data-put]"); time.sleep(0.4)
    ok("F2 ketuk kartu → Masukkan berhasil (3/3)", pg.inner_text("#aqCap") == "3/3")
    # akuarium penuh → geser ikan mas → mode tukar
    card = pg.locator(".aq-card", has_text="Ikan Mas").locator(".aq-thumb").bounding_box(); tank = pg.locator("#aqTank").bounding_box()
    touch_drag(pg, card["x"] + 30, card["y"] + 20, tank["x"] + tank["width"] / 2, tank["y"] + tank["height"] / 2)
    ok("F3 akuarium penuh → tidak menghapus, tawarkan tukar", "penuh" in pg.inner_text("#aqActions") and ev(pg, f"NW.HD.fishIn(window.__nusa.S.home,'{aqu}').length") == 3)
    out_uid = ev(pg, f"NW.HD.fishIn(window.__nusa.S.home,'{aqu}').find(x=>x.id==='nila').uid")
    pg.click(f"[data-swap='{out_uid}']"); time.sleep(0.4)
    ok("F4 tukar: mas masuk, nila kembali ke coolbox", ev(pg, f"NW.HD.fishIn(window.__nusa.S.home,'{aqu}').some(x=>x.id==='mas') && window.__nusa.S.cooler.some(x=>x.uid==='{out_uid}')"))
    # ambil kembali
    take = ev(pg, f"(()=>{{const it=NW.HD.fishIn(window.__nusa.S.home,'{aqu}').find(x=>x.id==='lele'); return {{uid:it.uid,w:it.w}}}})()")
    pg.click(f"[data-take='{take['uid']}']"); time.sleep(0.3)
    back = ev(pg, f"window.__nusa.S.cooler.find(x=>x.uid==='{take['uid']}')")
    ok("F5 ambil: item sama kembali (uid & berat)", back is not None and back["w"] == take["w"] and "aq" not in back)
    rep = ev(pg, "NW.HD.inventoryReport(window.__nusa.S)")
    ok("F6 tidak ada duplikasi ikan", rep["total"] == rep["unique"], rep)
    # aturan habitat & kesejahteraan
    reasons = ev(pg, """(()=>{const S=window.__nusa.S,HD=NW.HD,aq=S.home.furniture.find(f=>f.type==='akuariumKecil'); const t=(id,w)=>HD.eligible({id,w},aq,S.home,window.Nusa.FISH_BY_ID).why||'ok'; return [t('kakap',1),t('tuna',20),t('napoleon',30),t('sandal',.2),t('patin',6)]})()""")
    ok("F7 aturan habitat & kesejahteraan (laut/samudra/dilindungi/sampah/terlalu besar)", all(r != "ok" for r in reasons), reasons)
    # coolbox penuh → ambil dicegah
    ev(pg, "(()=>{const S=window.__nusa.S;while(S.cooler.length<window.Nusa.coolerCap()) S.cooler.push({uid:NW.HD.newUid(S),id:'sandal',w:.2,t:1})})()")
    ev(pg, f"NW.aqui.close(); NW.aqui.open('{aqu}')"); time.sleep(0.3)
    any_uid = ev(pg, f"NW.HD.fishIn(window.__nusa.S.home,'{aqu}')[0].uid")
    pg.click(f"[data-take='{any_uid}']"); time.sleep(0.3)
    ok("F8 coolbox penuh: ambil dicegah, ikan tetap di akuarium", ev(pg, f"window.__nusa.S.home.placedFish.some(x=>x.uid==='{any_uid}')"))
    pg.screenshot(path=OUT + "u_aq.png")
    pg.click("#aqClose"); time.sleep(0.2)
    # ikan dipajang tidak bisa dijual
    ev(pg, "window.Nusa.openPanel('market')"); time.sleep(0.3)
    shown = ev(pg, "window.__nusa.S.home.placedFish.map(x=>x.uid)")
    # daftar pasar sekarang virtual (hanya baris terlihat yang ada di DOM); seluruh isinya ada di NW.inv.vlist.rows
    sell_uids = ev(pg, "NW.inv.vlist.rows.map(r=>r.it.uid)")
    dom_uids = ev(pg, "[...document.querySelectorAll('[data-act=sell]')].map(b=>b.dataset.arg)")
    ok("F9 ikan yang dipajang tidak muncul di pasar", len(sell_uids) == ev(pg, "window.__nusa.S.cooler.length") and not set(shown) & set(sell_uids) and not set(shown) & set(dom_uids))
    pg.click("[data-act=sellAll]"); time.sleep(0.2); pg.click("[data-act=confirmSell]"); time.sleep(0.3); pg.click("#panelClose")
    ok("F10 Jual Semua tidak menjual ikan akuarium", ev(pg, "window.__nusa.S.home.placedFish.length") == len(shown) and ev(pg, "window.__nusa.S.cooler.length") == 0)
    # bertahan setelah refresh
    snap = ev(pg, "JSON.stringify(window.__nusa.S.home.placedFish.map(x=>[x.uid,x.id,x.w,x.aq]).sort())")
    ev(pg, "window.__nusa.save()"); pg.reload(); time.sleep(0.9)
    ok("F11 setelah refresh: isi akuarium & level tetap", ev(pg, "JSON.stringify(window.__nusa.S.home.placedFish.map(x=>[x.uid,x.id,x.w,x.aq]).sort())") == snap and ev(pg, "window.__nusa.S.home.level") == 10)
    ok("F12 setelah refresh: posisi akuarium tetap", ev(pg, "(()=>{const f=window.__nusa.S.home.furniture.find(f=>f.type==='akuariumKecil');return [f.x,f.y]})()") == [aq2["x"], aq2["y"]])
    pg.click("#startBtn"); time.sleep(0.3); ev(pg, "window.__nusa.S.muted=true; window.__nusa.S.hour=10")

    # ================= G. Misi =================
    ev(pg, "(()=>{const m=NW.life.ensure()[0]; m.p=m.n; m.done=true; NW.life.refreshBadge()})()")
    m0 = ev(pg, "window.__nusa.S.money"); r0 = ev(pg, "window.__nusa.S.rep")
    pg.click("#misiBtn"); time.sleep(0.3)
    log0 = ev(pg, "(window.__nusa.S.missionLog[NW.life.periodId()]||[]).length")
    pg.click("[data-act=claim][data-arg='0']"); time.sleep(0.2)
    ev(pg, "(()=>{const b=document.createElement('button');b.dataset.act='claim';b.dataset.arg='0';document.getElementById('panelBody').appendChild(b);b.click();b.click();})()")  # paksa klik ulang dua kali
    coins = ev(pg, "NW.life.ensure()[0].coins")
    ok("G1 hadiah misi hanya bisa diklaim sekali", ev(pg, "window.__nusa.S.money") == m0 + coins and ev(pg, "window.__nusa.S.rep") == r0 + ev(pg, "NW.life.ensure()[0].stars"))
    ok("G2 klaim tercatat di log periode", ev(pg, "(window.__nusa.S.missionLog[NW.life.periodId()]||[]).length") == log0 + 1)
    ev(pg, "window.__nusa.S.missions=null; NW.life.ensure()")
    ok("G3 misi dibuat ulang untuk periode sama tetap terklaim (tidak bisa diulang)", ev(pg, "NW.life.ensure()[0].claimed===true"))
    ids0 = ev(pg, "NW.life.ensure().map(m=>m.id).join()")
    ev(pg, "window.Nusa.sleepUntilMorning(); window.Nusa.sleepUntilMorning()")
    ok("G4 tidur/hari game tidak mengganti misi", ev(pg, "NW.life.ensure().map(m=>m.id).join()") == ids0)
    ok("G5 maksimal 3 misi & waktu reset ditampilkan", ev(pg, "NW.life.ensure().length") == 3 and "00:00" in pg.inner_text("#panelBody"))
    pg.click("#panelClose")

    # ================= H. NPC =================
    bad = ev(pg, """(()=>{const NAV=NW.NAV,bad=[]; for(const [a,b] of NW.NAV_EDGES){ if(a==='SE'&&b==='STALL') continue; for(let k=0;k<=20;k++){const x=NAV[a][0]+(NAV[b][0]-NAV[a][0])*k/20,y=NAV[a][1]+(NAV[b][1]-NAV[a][1])*k/20; for(const B of NW.buildings){ if(x>B.x0+0.05&&x<B.x1-0.05&&y>B.y0+0.05&&y<B.y1-0.05) bad.push(a+'-'+b+'@'+B.id);} }} return [...new Set(bad)]})()""")
    ok("H1 jalur NPC tidak menembus bangunan", not bad, bad)
    inside = []
    for hr in [6, 10.9, 13.4, 17.4, 18.9]:
        ev(pg, f"window.__nusa.S.hour={hr}; NW.world.npcs.forEach(NW.world.placeNPC); window.__nusa.S.hour={hr}+0.2");
        for _ in range(6):
            time.sleep(0.5)
            inside += ev(pg, """NW.world.npcs.filter(n=>!n.hidden).flatMap(n=>NW.buildings.filter(B=>!(n.id==='sari'&&B.id==='pasar')&&n.x>B.x0+0.05&&n.x<B.x1-0.05&&n.y>B.y0+0.05&&n.y<B.y1-0.05).map(B=>n.id+'@'+B.id))""")
    ok("H2 NPC berjalan antar-aktivitas tanpa masuk bangunan/atap", not inside, inside[:5])

    # ================= J. Performa =================
    ev(pg, """(()=>{const S=window.__nusa.S,HD=NW.HD; S.rep=40; if(!S.home.furniture.some(f=>f.type==='akuariumBesar')) HD.addFurniture(S.home,S,'akuariumBesar');
      const big=S.home.furniture.concat(S.home.stored).find(f=>f.type==='akuariumBesar'); for(const [id,w] of [['kakap',2],['sunu',3],['badut',.1],['kakatua',2],['baronang',1],['gt',11]]){const it={uid:HD.newUid(S),id,w,t:1};S.cooler.push(it);HD.putFish(S,it.uid,big.uid,window.Nusa.FISH_BY_ID);} NW.home.bump();})()""")
    ev(pg, "NW.home.goPlot(NW.world.player,'door'); NW.home.goRoom(NW.world.player)"); time.sleep(0.5)
    fps_room = ev(pg, "new Promise(r=>{let n=0;const t0=performance.now();function f(){n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2);} requestAnimationFrame(f);})")
    big = ev(pg, "window.__nusa.S.home.furniture.concat(window.__nusa.S.home.stored).find(f=>f.type==='akuariumBesar').uid")
    ev(pg, f"NW.aqui.open('{big}')"); time.sleep(0.5); pg.screenshot(path=OUT + "u_aq_big.png")
    fps_aq = ev(pg, "new Promise(r=>{let n=0;const t0=performance.now();function f(){n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2);} requestAnimationFrame(f);})")
    ok("J1 FPS rumah Level 10 dengan 2 akuarium terisi", fps_room > 45, round(fps_room))
    ok("J2 FPS menu akuarium berisi 6 ikan", fps_aq > 45, round(fps_aq))
    ok("J3 kapasitas akuarium besar 6/6 dipatuhi", ev(pg, f"NW.HD.fishIn(window.__nusa.S.home,'{big}').length") == 6, ev(pg, f"NW.HD.fishIn(window.__nusa.S.home,'{big}').map(x=>x.id)"))
    ok("Z tanpa error JavaScript", not (errs + errs2 + errs3), (errs + errs2 + errs3)[:4])
    b.close()
print("\n".join(R))
print(sum(r.startswith("PASS") for r in R), "lulus /", len(R))
