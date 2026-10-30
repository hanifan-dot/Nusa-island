"""Tangkapan layar bukti visual Tahap 3 (adapter demo; emulasi Chromium, bukan Android fisik).
Jalankan: python tests/visual_tahap3.py [folder_keluaran]"""
import sys, os, time, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "browser"))
OUT = (sys.argv[1] if len(sys.argv) > 1 else "/tmp/nusa-t3") + "/"; os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(os.path.dirname(__file__), "browser", "test_tahap3.py")).read().split("def main():")[0]
__file__ = os.path.join(os.path.dirname(__file__), "browser", "test_tahap3.py")
exec(src)
OUT = (sys.argv[1] if len(sys.argv) > 1 else "/tmp/nusa-t3") + "/"; os.makedirs(OUT, exist_ok=True)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs = ctx_page(b, vp=(390, 844)); pg.screenshot(path=OUT + "01_login.png")
    pg.click("#gateGuest"); time.sleep(0.3); pg.screenshot(path=OUT + "02_peringatan_tamu.png"); pg.click("#gwClose"); ctx.close()
    ctx, pg, errs = ctx_page(b, vp=(360, 640)); pg.screenshot(path=OUT + "03_login_360x640.png"); ctx.close()
    ctx, pg, errs = ctx_page(b, vp=(640, 360)); pg.screenshot(path=OUT + "04_login_lanskap.png"); ctx.close()
    ctx, pg, errs = ctx_page(b, auto="demo-a"); login(pg); start(pg); play(pg, 1234, 9, mystic=True); sync(pg); pg.click("#acctBtn"); time.sleep(0.4); pg.screenshot(path=OUT + "05_profil_login.png"); ctx.close()
    gs = mk(money=1000, caught=5, day=3, name="Lokal", fish=[{"uid": "g1", "id": "nila", "w": 1.0}])
    ctx, pg, errs = ctx_page(b, seed=gs, auto="demo-a"); seed_cloud(pg, "demo-a", mk(money=9000, caught=40, day=20, name="DiCloud", fish=[{"uid": "c1", "id": "patin", "w": 3.0}]))
    pg.click("#gateGoogle"); wait_for(pg, "!!document.getElementById('srcChoose')", 8); time.sleep(0.3); pg.screenshot(path=OUT + "06_pilih_progres.png"); ctx.close()
    ctx, pg, errs = ctx_page(b, auto="demo-owner"); login(pg); start(pg); play(pg, 650, 6, mystic=True); sync(pg); wait_for(pg, "NW.cloud.owner.verified===true", 5)
    pg.click("#acctBtn"); time.sleep(0.4); pg.screenshot(path=OUT + "07_profil_owner.png")
    pg.click("[data-act=enterSandbox]"); time.sleep(1.5); settle(pg); start(pg); time.sleep(0.8); pg.screenshot(path=OUT + "08_mode_uji_owner.png"); ctx.close()
    b.close()
print("selesai →", OUT)
