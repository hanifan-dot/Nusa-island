"""Hotfix: pemain yang berdiri dari bangku teras selalu keluar dari collision dan bisa bergerak."""
import json
import os
import time
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
SEED = {"v": 11, "money": 500, "day": 1, "hour": 9, "loc": 0,
        "up": {"rod": 0, "bait": 0, "cooler": 0, "boat": 0}, "cooler": [], "dex": {},
        "stats": {"casts": 0, "caught": 0, "earned": 0, "legends": 0},
        "profile": {"v": 1, "name": "BangkuTest"}}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 360, "height": 740}, has_touch=True)
    ctx.add_init_script("window.__demoAuto='benchtest';window.NUSA_DAPUR=true;"
                        "localStorage.setItem('nusa-island-v1', %s);"
                        "localStorage.setItem('__seeded','1');" % json.dumps(json.dumps(SEED)))
    page = ctx.new_page()
    page.goto(ROOT)
    page.wait_for_function("window.NW && NW.world && NW.home && NW.dapurSosial")
    time.sleep(0.4)
    if page.locator("#gateGuest").count() and page.locator("#gateGuest").is_visible():
        page.click("#gateGuest")
    time.sleep(0.3)
    if page.locator("#startBtn").count() and page.locator("#startBtn").is_visible():
        page.click("#startBtn")
    time.sleep(0.3)
    page.evaluate("NW.dapurSosial.install();NW.home.goPlot(NW.world.player,'gate');NW.dapurSosial.tick()")
    time.sleep(0.2)

    before = page.evaluate("""(()=>{
      NW.home.hooks.halaman.interact({id:'hl_sit6'},NW.world.player,()=>{});
      return {x:NW.world.player.x,y:NW.world.player.y,on:NW.world.seat.on,
        walk:NW.home.walkable(NW.world.player.x,NW.world.player.y),seat:NW.dapurSosial._S.seat};
    })()""")
    assert before["on"] and before["seat"] == 6 and not before["walk"], before

    page.keyboard.down("ArrowDown")
    time.sleep(0.6)
    page.keyboard.up("ArrowDown")
    time.sleep(0.25)
    after = page.evaluate("({x:NW.world.player.x,y:NW.world.player.y,on:NW.world.seat.on,"
                          "walk:NW.home.walkable(NW.world.player.x,NW.world.player.y),seat:NW.dapurSosial._S.seat})")
    moved = abs(after["x"] - before["x"]) + abs(after["y"] - before["y"])
    assert not after["on"] and after["seat"] == -1 and after["walk"], (before, after)
    assert moved > 0.25, (before, after)
    print("PASS  bangku teras: joystick berdiri, keluar collision, lalu bergerak", before, after)
    browser.close()
