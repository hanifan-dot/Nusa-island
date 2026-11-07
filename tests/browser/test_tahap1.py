import time, json
import os, tempfile
import os as _os
MUTED = "false" if _os.environ.get("NUSA_AUDIO") else "true"  # NUSA_AUDIO=1: jalankan dengan audio aktif (Bumbu 2.1)
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html")) + "?cloud=off"
OUT = tempfile.mkdtemp(prefix="nusa-test-") + "/"
from playwright.sync_api import sync_playwright
R = []
def ok(name, cond, extra=""):
    R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra else ""))

def tp(pg, x, y):
    pg.evaluate(f"(()=>{{const p=NW.world.player;p.x={x};p.y={y};}})()"); time.sleep(0.35)
def tgt(pg): return pg.evaluate("NW.world.target ? NW.world.target.id : null")
def opts(pg):
    for _ in range(10):
        if pg.locator("#dlgOpts .btn.gold").count(): return
        pg.click("#dlg"); time.sleep(0.6)
def mode(pg): return pg.evaluate("window.__nusa.mode()")

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- Simpanan lama (format Nusa Island v1 tanpa data pulau) ----------
    ctx = b.new_context(viewport={"width": 1280, "height": 800})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT)
    old = {"money": 4321, "day": 3, "hour": 9, "loc": 2, "up": {"rod": 1, "bait": 0, "cooler": 1, "boat": 2},
           "cooler": [{"id": "nila", "w": 0.8}], "dex": {"nila": {"n": 3, "best": 1.1}}, "stats": {"casts": 10, "caught": 3, "earned": 200, "legends": 0}, "muted": True}
    # simpanan lama ditanam SEBELUM game dimuat (kalau pakai reload, game menyimpan ulang state sekarang saat halaman ditutup)
    pc = b.new_context(viewport={"width": 1280, "height": 800})
    pc.add_init_script(f"if(!sessionStorage.getItem('seeded')){{localStorage.setItem('nusa-island-v1', JSON.stringify({json.dumps(old)}));sessionStorage.setItem('seeded','1')}}")
    pp = pc.new_page(); pp.on("pageerror", lambda e: errs.append(str(e))); pp.goto(ROOT); time.sleep(0.8)
    S = pp.evaluate("JSON.parse(JSON.stringify(window.__nusa.S))")
    old_mode = pp.evaluate("window.__nusa.mode()"); pc.close()
    ok("save lama: koin, upgrade, coolbox, koleksi tetap", S["money"] == 4321 and S["up"]["boat"] == 2 and len(S["cooler"]) == 1 and S["dex"]["nila"]["n"] == 3)
    ok("save lama: mulai di Muara (mode pulau)", S["loc"] == 0 and old_mode == "world")
    pg.evaluate("localStorage.clear()"); pg.reload(); time.sleep(0.8)

    pg.click("#startBtn"); time.sleep(0.5)
    pg.evaluate("window.__nusa.S.hour = 10; window.__nusa.S.muted = " + MUTED)
    # ---------- Berjalan ----------
    x0 = pg.evaluate("NW.world.player.x"); y0 = pg.evaluate("NW.world.player.y")
    pg.keyboard.down("d"); time.sleep(0.8); pg.screenshot(path=OUT + "t_walk.png"); pg.keyboard.up("d")
    x1 = pg.evaluate("NW.world.player.x"); y1 = pg.evaluate("NW.world.player.y")
    ok("berjalan dengan keyboard (D)", abs(x1 - x0) + abs(y1 - y0) > 1, f"{x0:.1f},{y0:.1f} -> {x1:.1f},{y1:.1f}")
    # 8 arah
    dirs = set()
    for k in [["d"], ["d", "s"], ["s"], ["a", "s"], ["a"], ["a", "w"], ["w"], ["d", "w"]]:
        tp(pg, 19.5, 20.6)
        for kk in k: pg.keyboard.down(kk)
        time.sleep(0.15)
        dirs.add(pg.evaluate("NW.world.player.dir"))
        for kk in k: pg.keyboard.up(kk)
    ok("8 arah hadap", len(dirs) == 8, sorted(dirs))
    # collision air: dorong ke timur dari ujung dermaga & ke laut selatan
    tp(pg, pg.evaluate("NW.SPOT.x") - 0.6, pg.evaluate("NW.SPOT.y"))
    pg.keyboard.down("d"); pg.keyboard.down("s"); time.sleep(2.0); pg.keyboard.up("d"); pg.keyboard.up("s")
    onland = pg.evaluate("(()=>{const p=NW.world.player;return NW.isLandT(NW.tileAt(p.x,p.y))})()")
    ok("tidak bisa jalan di atas air", onland)
    # collision bangunan: dorong ke dalam toko
    t = pg.evaluate("NW.buildings[1]")
    tp(pg, t["x1"] + 0.5, (t["y0"] + t["y1"]) / 2)
    pg.keyboard.down("a"); pg.keyboard.down("w"); time.sleep(1.5); pg.keyboard.up("a"); pg.keyboard.up("w")
    inside = pg.evaluate(f"(()=>{{const p=NW.world.player;return p.x>{t['x0']}&&p.x<{t['x1']}&&p.y>{t['y0']}&&p.y<{t['y1']}}})()")
    ok("tidak menembus bangunan", not inside)

    # ---------- Pasar ----------
    pt = pg.evaluate("NW.points.find(p=>p.id=='pasar')")
    tp(pg, pt["x"], pt["y"] + 0.2)
    ok("tombol aksi muncul di pasar", tgt(pg) == "pasar" and pg.is_visible("#actBtn"))
    pg.screenshot(path=OUT + "t_pasar_near.png")
    pg.click("#actBtn"); time.sleep(1.6)
    pg.screenshot(path=OUT + "t_pasar_dlg.png")
    opts(pg)
    pg.click("#dlgOpts .btn.gold"); time.sleep(0.4)
    ok("pasar membuka panel jual", pg.is_visible("#panelWrap") and "Pasar" in pg.inner_text("#panelTitle"))
    pg.click("#panelClose"); time.sleep(0.2)
    # ---------- Toko ----------
    pt = pg.evaluate("NW.points.find(p=>p.id=='toko')")
    tp(pg, pt["x"] + 0.2, pt["y"])
    pg.keyboard.press("e"); time.sleep(1.4)
    pg.screenshot(path=OUT + "t_toko_dlg.png")
    opts(pg)
    pg.click("#dlgOpts .btn.gold"); time.sleep(0.3)
    ok("toko membuka panel upgrade", pg.is_visible("#panelWrap") and "Toko" in pg.inner_text("#panelTitle"))
    pg.click("#panelClose")
    # ---------- NPC ----------
    for nid in ["darto", "dika"]:
        pos = pg.evaluate(f"(()=>{{const n=NW.world.npcs.find(n=>n.id=='{nid}');return [n.x,n.y]}})()")
        tp(pg, pos[0] + 0.5, pos[1] + 0.3)
        tg = tgt(pg)
        pg.keyboard.press("e"); time.sleep(1.5)
        txt = pg.inner_text("#dlgText")
        ok(f"bicara dengan {nid}", tg == "npc:" + nid and len(txt) > 10, txt[:50])
        if nid == "dika": pg.screenshot(path=OUT + "t_npc.png")
        for _ in range(12):  # dialog cerita Bab 1 bisa lebih panjang dari obrolan biasa
            if not pg.is_visible("#dlg"): break
            if pg.locator("#dlgOpts .btn").count(): pg.locator("#dlgOpts .btn").last.click()
            else: pg.keyboard.press("e")
            time.sleep(0.4)
    # NPC bergerak
    a = pg.evaluate("NW.world.npcs.map(n=>[n.x,n.y])"); time.sleep(3); bb = pg.evaluate("NW.world.npcs.map(n=>[n.x,n.y])")
    ok("NPC bergerak sendiri", sum(abs(a[i][0]-bb[i][0])+abs(a[i][1]-bb[i][1]) for i in range(3)) > 0.5)

    # ---------- Dermaga → mancing ----------
    tp(pg, pg.evaluate("NW.SPOT.x") - 0.7, pg.evaluate("NW.SPOT.y"))
    ok("titik Mancing terdeteksi", tgt(pg) == "spot")
    pg.screenshot(path=OUT + "t_dock.png")
    pg.click("#actBtn"); time.sleep(0.5); pg.screenshot(path=OUT + "t_rod.png"); time.sleep(1.0)
    ok("masuk mode mancing dari dermaga", mode(pg) == "fish")
    pg.screenshot(path=OUT + "t_fish_dock.png")
    # satu siklus mancing (lempar, gigit, tarik)
    pg.mouse.move(640, 450); pg.mouse.down(); time.sleep(0.6); pg.mouse.up(); time.sleep(1.4)
    pg.evaluate("window.__nusa.G.biteTimer = 0.02"); time.sleep(0.2)
    pg.evaluate("window.__nusa.G.pending = {fish: FISH.find(f=>f.id=='nila'), w: .6, wr: .4}")
    pg.mouse.down(); time.sleep(0.2)
    t0 = time.time(); held = True
    while time.time() - t0 < 25:
        st = pg.evaluate("(()=>{const G=window.__nusa.G;return {ph:G.phase,T:G.fight?G.fight.T:0}})()")
        if st["ph"] != "fight": break
        if held and st["T"] > 0.75: pg.mouse.up(); held = False
        elif not held and st["T"] < 0.35: pg.mouse.down(); held = True
        time.sleep(0.05)
    if held: pg.mouse.up()
    time.sleep(0.7)
    ok("mekanik mancing lama tetap jalan (dapat ikan)", pg.is_visible("#catchWrap"), pg.evaluate("window.__nusa.G.phase"))
    if pg.is_visible("#catchOk"): pg.click("#catchOk")
    n_cool = pg.evaluate("window.__nusa.S.cooler.length")
    pg.click("#landBtn"); time.sleep(0.5)
    ok("kembali ke darat dari dermaga", mode(pg) == "world" and pg.evaluate("NW.world.target && NW.world.target.id") == "spot")
    ok("hasil tangkapan masuk coolbox", n_cool >= 1, n_cool)

    # ---------- Kapal → Danau Toba → pulang ----------
    pt = pg.evaluate("NW.points.find(p=>p.id=='boat')")
    tp(pg, pt["x"], pt["y"])
    pg.screenshot(path=OUT + "t_boat.png")
    # Bumbu 2.4: kapal di dermaga kini dinaiki sendiri (⛵ Naik Kapal); perjalanan cepat lama lewat papan 🧭 Rute Kapal
    ok("di dekat kapal muncul ⛵ Naik Kapal (Bumbu 2.4)", pg.evaluate("NW.world.target && NW.world.target.label") == "Naik Kapal")
    pt = pg.evaluate("NW.points.find(p=>p.id=='rute')")
    tp(pg, pt["x"], pt["y"])
    pg.evaluate("window.__nusa.S.up.boat = 1")
    pg.keyboard.press("e"); time.sleep(0.4)
    ok("papan Rute Kapal membuka peta (perjalanan lama tetap ada)", pg.is_visible("#panelWrap") and "Peta" in pg.inner_text("#panelTitle"))
    pg.click("[data-act=go][data-arg='1']"); time.sleep(3.6)
    # Bumbu 2: Danau Toba kini punya area jelajah → tiba di Kampung Tepian Toba (mancing lewat titik di dermaga)
    ok("berlayar ke Danau Toba (tiba di Kampung Tepian Toba)", mode(pg) == "world" and pg.evaluate("window.__nusa.S.loc") == 1 and pg.evaluate("NW.areas.cur.id") == "toba")
    pg.screenshot(path=OUT + "t_toba.png")
    pg.evaluate("window.Nusa.openPanel('map')"); time.sleep(0.3); pg.click("[data-act=go][data-arg='0']"); time.sleep(3.6)
    ok("pulang ke Muara lewat peta", mode(pg) == "world" and pg.evaluate("window.__nusa.S.loc") == 0 and pg.evaluate("NW.areas.cur.id") == "muara")

    # ---------- Malam ----------
    pg.evaluate("window.__nusa.S.hour = 21"); tp(pg, 22.5, 20.6); time.sleep(0.5)
    pg.screenshot(path=OUT + "t_night.png")
    pg.evaluate("window.__nusa.S.hour = 17.3"); time.sleep(0.4)
    pg.screenshot(path=OUT + "t_sunset.png")
    pg.evaluate("window.__nusa.S.hour = 10")
    # ---------- FPS ----------
    fps = pg.evaluate("""new Promise(r=>{let n=0;const t0=performance.now();function f(){n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2);} requestAnimationFrame(f);})""")
    ok("FPS desktop (headless)", fps > 40, round(fps))
    # simpan posisi
    pg.evaluate("window.__nusa.save()")
    saved = pg.evaluate("JSON.parse(localStorage.getItem('nusa-island-v1')).world")
    ok("posisi pemain tersimpan", saved is not None, saved)
    ok("tanpa error JavaScript (desktop)", not errs, errs[:3])
    pg.close(); ctx.close()

    # ---------- HP: joystick sentuh ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    pg = ctx.new_page(); errs2 = []
    pg.on("pageerror", lambda e: errs2.append(str(e)))
    pg.goto(ROOT); time.sleep(0.6); pg.click("#startBtn"); time.sleep(0.4)
    pg.evaluate("window.__nusa.S.hour = 9")
    box = pg.eval_on_selector("#joy", "e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}")
    x0 = pg.evaluate("NW.world.player.x")
    pg.mouse.move(box[0], box[1]); pg.mouse.down(); pg.mouse.move(box[0] + 40, box[1] + 25, steps=5); time.sleep(1.0)
    pg.screenshot(path=OUT + "t_m_joy.png")
    pg.mouse.up()
    x1 = pg.evaluate("NW.world.player.x")
    ok("joystick sentuh menggerakkan karakter", abs(x1 - x0) > 0.5, f"{x0:.2f}->{x1:.2f}")
    pos = pg.evaluate("(()=>{const n=NW.world.npcs.find(n=>n.id=='darto');return [n.x,n.y]})()")
    tp(pg, pos[0] + 0.5, pos[1] + 0.3)
    pg.screenshot(path=OUT + "t_m_near.png")
    if pg.is_visible("#actBtn"): pg.click("#actBtn"); time.sleep(1.5)
    pg.screenshot(path=OUT + "t_m_dlg.png")
    fps = pg.evaluate("""new Promise(r=>{let n=0;const t0=performance.now();function f(){n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2);} requestAnimationFrame(f);})""")
    ok("FPS HP-emulasi (headless, DPR 2)", fps > 30, round(fps))
    ok("tanpa error JavaScript (HP)", not errs2, errs2[:3])
    b.close()
print("\n".join(R))
