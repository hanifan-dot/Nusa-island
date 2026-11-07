"""Bukti visual Bumbu 2.3 (headless, emulasi HP 390×844). Pakai: python tests/visual_bumbu23.py <folder>"""
import os, sys, time
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "index.html"))
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/nusa-b23"; os.makedirs(OUT, exist_ok=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def start(b, hour=9, vp=(390, 844), fx="tinggi"):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(ROOT); time.sleep(0.5); ev(pg, "localStorage.clear()"); ev(pg, "(f)=>localStorage.setItem('nusa-island-wxfx-v1', JSON.stringify({level:f,calm:false}))", fx); pg.reload(); time.sleep(0.7)
    pg.click("#startBtn"); time.sleep(0.6)
    ev(pg, "(h)=>{window.__nusa.S.hour=h; document.getElementById('banner').classList.remove('show'); const t=document.getElementById('hint'); }", hour); time.sleep(0.5)
    return ctx, pg, errs
def goto(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera()}", [x, y]); time.sleep(0.6)
def wx(pg, k, **o):
    ev(pg, "([k,o])=>NW.weather.force(k,Object.assign({snap:true},o))", [k, o]); time.sleep(1.3)
with sync_playwright() as p:
    b = p.chromium.launch()
    # Muara: cerah vs hujan di dermaga & jalan
    ctx, pg, errs = start(b)
    goto(pg, 17.5, 20.5); wx(pg, "cerah"); pg.screenshot(path=f"{OUT}/muara_cerah.png")
    wx(pg, "mendung"); pg.screenshot(path=f"{OUT}/muara_mendung.png")
    wx(pg, "hujan"); pg.screenshot(path=f"{OUT}/muara_hujan.png")
    wx(pg, "deras"); pg.screenshot(path=f"{OUT}/muara_deras.png")
    ev(pg, "window.__nusa.S.hour=20.5"); time.sleep(0.8); pg.screenshot(path=f"{OUT}/muara_hujan_malam.png")
    print("muara", errs); ctx.close()
    # Toba berkabut (pagi)
    ctx, pg, errs = start(b, 6.5)
    ev(pg, "window.__nusa.S.up.boat=1"); ev(pg, "window.__nusa.travel(1)"); time.sleep(4.2)
    ev(pg, "window.__nusa.S.hour=6.6"); goto(pg, 18.5, 20.8)
    wx(pg, "cerah"); pg.screenshot(path=f"{OUT}/toba_cerah.png")
    wx(pg, "kabut"); pg.screenshot(path=f"{OUT}/toba_kabut.png")
    goto(pg, 6.0, 16.5); pg.screenshot(path=f"{OUT}/toba_kabut_bukit.png")
    wx(pg, "hujan"); goto(pg, 18.5, 12.0); pg.screenshot(path=f"{OUT}/toba_hujan.png")
    print("toba", errs); ctx.close()
    # mancing
    ctx, pg, errs = start(b)
    ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(1.2)
    wx(pg, "cerah"); pg.screenshot(path=f"{OUT}/mancing_cerah.png")
    wx(pg, "hujan"); pg.screenshot(path=f"{OUT}/mancing_hujan.png")
    wx(pg, "kabut"); pg.screenshot(path=f"{OUT}/mancing_kabut.png")
    print("mancing", errs); ctx.close()
    b.close()
