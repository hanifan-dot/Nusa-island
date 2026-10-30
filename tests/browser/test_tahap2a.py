import time, json
import os, tempfile
import os as _os
MUTED = "false" if _os.environ.get("NUSA_AUDIO") else "true"  # NUSA_AUDIO=1: jalankan dengan audio aktif (Bumbu 2.1)
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = tempfile.mkdtemp(prefix="nusa-test-") + "/"
from playwright.sync_api import sync_playwright
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else ""))
def ev(pg, js): return pg.evaluate(js)
def tp(pg, x, y): ev(pg, f"(()=>{{const p=NW.world.player;p.x={x};p.y={y};}})()"); time.sleep(0.35)
def tgt(pg): return ev(pg, "NW.world.target ? NW.world.target.id : null")
def act(pg): pg.keyboard.press("e"); time.sleep(0.9)
def finish_dialog(pg):
    for _ in range(8):
        if pg.locator("#dlgOpts .btn").count(): return
        pg.click("#dlg"); time.sleep(0.4)
def close_dialog(pg):
    for _ in range(8):
        if not pg.is_visible("#dlg"): return
        if pg.locator("#dlgOpts .btn").count(): pg.locator("#dlgOpts .btn").last.click()
        else: pg.click("#dlg")
        time.sleep(0.3)

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- simpanan Tahap 1 (tanpa field baru) ----------
    ctx = b.new_context(viewport={"width": 1280, "height": 800})
    old = {"money": 777, "day": 4, "hour": 9, "loc": 1, "up": {"rod": 2, "bait": 1, "cooler": 1, "boat": 1}, "cooler": [{"id": "mas", "w": 1.2}],
           "dex": {"mas": {"n": 2, "best": 1.4}}, "stats": {"casts": 30, "caught": 12, "earned": 900, "legends": 0}, "muted": True, "world": {"x": 18.5, "y": 20.5}}
    ctx.add_init_script(f"if(!sessionStorage.getItem('seeded')){{localStorage.setItem('nusa-island-v1', JSON.stringify({json.dumps(old)}));sessionStorage.setItem('seeded','1')}}")
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.8)
    S = ev(pg, "JSON.parse(JSON.stringify(window.__nusa.S))")
    ok("simpanan Tahap 1 dimuat utuh", S["money"] == 777 and S["up"]["rod"] == 2 and S["dex"]["mas"]["n"] == 2 and len(S["cooler"]) == 1)
    ok("simpanan lama mendapat misi & rumah baru", len(S["missions"]["list"]) == 3 and S["home"]["level"] == 1 and len(S["home"]["furniture"]) == 3 and S["rep"] == 0, [m["type"] for m in S["missions"]["list"]])
    pg.close(); ctx.close()

    # ---------- permainan baru ----------
    ctx = b.new_context(viewport={"width": 1280, "height": 800}); pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.6); pg.click("#startBtn"); time.sleep(0.4)
    ev(pg, "window.__nusa.S.hour = 9; window.__nusa.S.muted = " + MUTED + "; NW.world.npcs.forEach(NW.world.placeNPC)"); time.sleep(0.3)
    types = ev(pg, "window.__nusa.S.missions.list.map(m=>m.type)")
    ok("hari 1: 3 misi perkenalan", types == ["catch_any", "talk", "sell"], types)

    # papan misi
    tp(pg, 20.3, 19.95)
    ok("papan misi bisa didatangi", tgt(pg) == "board")
    act(pg); ok("papan misi membuka panel misi", pg.is_visible("#panelWrap") and "Misi" in pg.inner_text("#panelTitle")); pg.click("#panelClose"); time.sleep(0.2)

    # ngobrol dengan Pak Darto → misi talk + pertemanan
    pos = ev(pg, "(()=>{const n=NW.world.npcs[0];return [n.x,n.y,n.cur.act]})()")
    ok("Pak Darto mancing di dermaga jam 09:00", pos[2] == "fish", pos)
    tp(pg, pos[0] - 0.6, pos[1] + 0.3); act(pg)
    role = pg.inner_text("#dlgRole"); close_dialog(pg)
    m = ev(pg, "window.__nusa.S.missions.list[1]")
    ok("misi 'Ngobrol dengan Pak Darto' selesai", m["done"], role)
    ok("pertemanan naik setelah ngobrol", ev(pg, "window.__nusa.S.friends.darto") > 0)

    # tangkap 2 ikan lewat event → misi catch_any
    ev(pg, "for(let i=0;i<2;i++) window.Nusa.emit('catch',{fish:FISH.find(f=>f.id=='nila'),w:.5,night:false,loc:'muara'})")
    ev(pg, "window.Nusa.emit('catch',{fish:FISH.find(f=>f.id=='sandal'),w:.2,night:false,loc:'muara'})")
    m0 = ev(pg, "window.__nusa.S.missions.list[0]")
    ok("misi tangkap ikan menghitung, sampah tidak dihitung", m0["done"] and m0["p"] == 2, m0["p"])
    # jual sungguhan lewat pasar
    ev(pg, "window.__nusa.S.cooler.push({id:'patin',w:3})")
    pt = ev(pg, "NW.points.find(p=>p.id=='pasar')"); tp(pg, pt["x"], pt["y"] + 0.2); act(pg); finish_dialog(pg)
    pg.click("#dlgOpts .btn.gold"); time.sleep(0.4); pg.click("[data-act=sellAll]"); time.sleep(0.2); pg.click("[data-act=confirmSell]"); time.sleep(0.3); pg.click("#panelClose")
    ok("misi jual selesai setelah menjual di pasar", ev(pg, "window.__nusa.S.missions.list[2].done"))
    ok("badge 📋 menunjukkan 3 hadiah", pg.inner_text("#misiBadge") == "3" and pg.is_visible("#misiBadge"))
    money0, rep0 = ev(pg, "window.__nusa.S.money"), ev(pg, "window.__nusa.S.rep")
    pg.click("#misiBtn"); time.sleep(0.3); pg.screenshot(path=OUT + "a_misi_done.png")
    for _ in range(3): pg.click("[data-act=claim]"); time.sleep(0.25)
    ok("ambil hadiah: koin & bintang bertambah", ev(pg, "window.__nusa.S.money") > money0 and ev(pg, "window.__nusa.S.rep") == rep0 + 3, (ev(pg, "window.__nusa.S.money") - money0, ev(pg, "window.__nusa.S.rep")))
    pg.click("#panelClose")

    # misi antar ikan
    ev(pg, "window.__nusa.S.missions.list.push({type:'deliver',npc:'dika',fish:'sandal',n:1,p:0,done:false,claimed:false,coins:100,stars:2}); window.__nusa.S.cooler.push({id:'sandal',w:.2})")
    d = ev(pg, "(()=>{const n=NW.world.npcs[2];return [n.x,n.y,n.hidden,n.cur.act]})()")
    tp(pg, d[0] + 0.5, d[1] + 0.4); act(pg); finish_dialog(pg)
    has_opt = "Berikan" in pg.inner_text("#dlgOpts")
    ok("Dika minta sandal jepit (opsi Berikan muncul)", has_opt, d[3])
    if has_opt: pg.locator("#dlgOpts .btn.gold").first.click(); time.sleep(0.5)
    close_dialog(pg)
    ok("antar ikan: sandal keluar dari coolbox & misi selesai", ev(pg, "!window.__nusa.S.cooler.some(i=>i.id=='sandal') && window.__nusa.S.missions.list[3].done"))
    ok("antar ikan menaikkan pertemanan Dika", (ev(pg, "window.__nusa.S.friends.dika") or 0) >= 1)  # None bila Dika sempat berpindah saat beban tinggi → FAIL, bukan crash

    # ---------- jadwal NPC ----------
    sched = {}
    for h in [6, 12, 15, 18, 22]:
        ev(pg, f"window.__nusa.S.hour={h}; NW.world.npcs.forEach(NW.world.placeNPC)")
        sched[h] = ev(pg, "NW.world.npcs.map(n=>n.hidden?'tidur':n.cur.act).join(',')")
    ok("aktivitas NPC berubah sesuai jam", len(set(sched.values())) == 5, sched)
    ev(pg, "window.__nusa.S.hour=10.95; NW.world.npcs.forEach(NW.world.placeNPC); window.__nusa.S.hour=11.2"); time.sleep(2.5)
    dn = ev(pg, "(()=>{const n=NW.world.npcs[0];return {act:n.cur.act,arr:n.arrived,path:n.path.length,x:n.x}})()")
    ok("Pak Darto berjalan dari dermaga ke taman saat jam istirahat", dn["act"] == "rest" and (dn["path"] > 0 or dn["arr"]), dn)
    ev(pg, "window.__nusa.S.hour=15; NW.world.npcs.forEach(NW.world.placeNPC)"); time.sleep(0.3)
    tp(pg, 19.4, 28.4); time.sleep(0.4); pg.screenshot(path=OUT + "a_kite.png")
    ev(pg, "window.__nusa.S.hour=15; const p=NW.world.player; p.x=12.6; p.y=28.3"); time.sleep(0.4); pg.screenshot(path=OUT + "a_net.png")

    # malam: kotak titipan & ketuk rumah
    ev(pg, "window.__nusa.S.hour=22; NW.world.npcs.forEach(NW.world.placeNPC)")
    tp(pg, pt["x"], pt["y"] + 0.2); act(pg)
    ok("malam: pasar tutup, kotak titipan tersedia", pg.inner_text("#dlgName") == "Kotak Titipan"); close_dialog(pg)
    tp(pg, 16.3, 25.25); act(pg); finish_dialog(pg)
    ok("malam: ketuk rumah Pak Darto (sudah tidur)", "tidur" in pg.inner_text("#dlgText").lower(), pg.inner_text("#dlgText")[:60]); close_dialog(pg)

    # ---------- Rumahku ----------
    tp(pg, 9.8, 14.8)
    ok("gapura Rumahku terdeteksi", tgt(pg) == "home")
    act(pg); time.sleep(0.5)
    ev(pg, "(()=>{const L=NW.HOUSE.plotLayout(window.__nusa.S.home.level);const p=NW.world.player;p.x=L.doorPt.x;p.y=L.doorPt.y})()"); time.sleep(0.3); act(pg); time.sleep(0.5)
    ok("masuk Rumahku", ev(pg, "NW.home.active && NW.home.scene==='room'"))
    # collision di dalam rumah: dorong ke arah kasur dari depan
    bed = ev(pg, "NW.HD.fp(window.__nusa.S.home.furniture.find(f=>f.type==='kasur'))")
    ev(pg, f"const p=NW.world.player; p.x={(bed['x0']+bed['x1'])/2}; p.y={bed['y1']+0.5}")
    pg.keyboard.down("w"); pg.keyboard.down("a"); time.sleep(1.2); pg.keyboard.up("w"); pg.keyboard.up("a")
    inbed = ev(pg, f"(()=>{{const p=NW.world.player;return p.x>{bed['x0']}&&p.x<{bed['x1']}&&p.y>{bed['y0']}&&p.y<{bed['y1']}}})()")
    ok("tidak menembus kasur", not inbed)
    # beli perabot
    ev(pg, "window.__nusa.S.money=19000; window.__nusa.S.rep=10; window.__nusa.S.home.level=10; NW.HD.relayout(window.__nusa.S.home); NW.home.bump(); NW.home.goRoom(NW.world.player)"); time.sleep(0.4)
    mp = ev(pg, "(()=>{const t=NW.home.candidates().find(c=>c.id==='h_catalog');return [t.x,t.y]})()")
    ev(pg, f"const p=NW.world.player; p.x={mp[0]}; p.y={mp[1]}"); time.sleep(0.4)
    ok("katalog terdeteksi", tgt(pg) == "h_catalog", tgt(pg))
    act(pg)
    for it in ["karpet", "tanaman", "lampu", "lukisan", "radio", "trofi", "kucing", "akuariumBesar", "akuariumKecil2"]:
        pg.click(f"[data-act=buyItem][data-arg={it}]"); time.sleep(0.2)
    h = ev(pg, "window.__nusa.S.home")
    ok("beli 9 barang dari katalog (6 perabot + 3 dekorasi)", len(h["furniture"]) + len(h["stored"]) == 9 and len(h["decorations"]) == 3, (len(h["furniture"]), len(h["stored"]), h["decorations"]))
    pg.click("#panelClose")
    ev(pg, "window.__nusa.S.dex.nila={n:1,best:1}; window.__nusa.S.dex.arwana={n:1,best:2}"); time.sleep(0.5)
    pg.screenshot(path=OUT + "a_home_full.png")
    # tidur
    day0 = ev(pg, "window.__nusa.S.day")
    bp = ev(pg, "(()=>{const t=NW.home.candidates().find(c=>c.id==='h_bed');return [t.x,t.y]})()")
    per0 = ev(pg, "window.__nusa.S.missions.period")
    ev(pg, f"window.__nusa.S.hour=21; const p=NW.world.player; p.x={bp[0]}; p.y={bp[1]}"); time.sleep(0.4)
    act(pg); finish_dialog(pg); pg.locator("#dlgOpts .btn.gold").first.click(); time.sleep(1.0)
    ok("tidur: hari berganti, jam 06:00, misi tetap (periode harian nyata)", ev(pg, "window.__nusa.S.day") == day0 + 1 and ev(pg, "Math.floor(window.__nusa.S.hour)") == 6 and ev(pg, "window.__nusa.S.missions.period") == per0, (ev(pg, "window.__nusa.S.day"), ev(pg, "window.__nusa.S.hour")))
    # keluar: rumah → halaman → kampung
    ev(pg, "(()=>{const sp=NW.HD.doorOf(window.__nusa.S.home.level).spawn;const p=NW.world.player;p.x=sp.x;p.y=sp.y})()"); time.sleep(0.4)
    ok("pintu keluar terdeteksi", tgt(pg) == "h_door", tgt(pg))
    act(pg); time.sleep(0.5)
    ev(pg, "(()=>{const L=NW.HOUSE.plotLayout(window.__nusa.S.home.level);const p=NW.world.player;p.x=L.gate.x;p.y=L.gate.y-0.5})()"); time.sleep(0.3); act(pg); time.sleep(0.6)
    ok("keluar ke kampung di depan gapura", not ev(pg, "NW.home.active") and abs(ev(pg, "NW.world.player.y") - 14.7) < 0.3)
    # perpindahan pulau ↔ mancing masih jalan
    tp(pg, ev(pg, "NW.SPOT.x") - 0.7, ev(pg, "NW.SPOT.y")); act(pg); time.sleep(1.2)
    ok("Tahap 1: dermaga → mode mancing tetap jalan", ev(pg, "window.__nusa.mode()") == "fish")
    ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.4)

    # kartu tangkapan: tampil sebagai gambar bila tidak bisa dibagikan
    ev(pg, "window.__nusa.enterFishing('dock')")
    pg.mouse.move(640, 450); pg.mouse.down(); time.sleep(0.5); pg.mouse.up(); time.sleep(1.4)
    ev(pg, "window.__nusa.G.biteTimer=0.02"); time.sleep(0.2); ev(pg, "window.__nusa.G.pending={fish:FISH.find(f=>f.id=='layaran'),w:40,wr:.5}")
    pg.mouse.down(); time.sleep(0.2); ev(pg, "window.__nusa.G.fight.P=0.999; window.__nusa.G.fight.T=.3"); time.sleep(0.2); pg.mouse.up(); time.sleep(0.7)
    pg.screenshot(path=OUT + "a_layaran.png")
    pg.click("#shareBtn"); time.sleep(1.0)
    ok("Simpan Kartu menampilkan gambar kartu", pg.is_visible("#shareWrap") and ev(pg, "document.getElementById('shareImg').src.startsWith('data:image/png')"))
    pg.screenshot(path=OUT + "a_share.png")
    fps = ev(pg, """new Promise(r=>{let n=0;const t0=performance.now();function f(){n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2);} requestAnimationFrame(f);})""")
    ok("FPS", fps > 40, round(fps))
    ok("tanpa error JavaScript", not errs, errs[:3])
    b.close()
print("\n".join(R))
