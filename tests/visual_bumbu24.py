"""Bukti visual Bumbu 2.4 "Samudra Nusantara" (Chromium headless, layar HP 390×844 @2x — emulasi, bukan HP fisik).
Pakai: python tests/visual_bumbu24.py <folder-keluaran>
Menghasilkan: kapal_berlayar_muara, kapal_laut_lepas, kapal_senja, kapal_malam, laut_hujan, laut_kabut,
spot_karang, pelabuhan_selat_sunda, pelabuhan_dermaga, mancing_dari_kapal, mancing_laut_strike, peta_laut.
"""
import os, sys, time, math
from playwright.sync_api import sync_playwright

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/nusa-b24"; os.makedirs(OUT, exist_ok=True)
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "index.html"))
ang = lambda tx, ty: math.atan2((tx + ty) * 16, (tx - ty) * 32)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    ev = pg.evaluate
    pg.goto(ROOT); time.sleep(0.6); ev("localStorage.clear(); localStorage.setItem('nusa-island-wxfx-v1', JSON.stringify({level:'tinggi',calm:false}))"); pg.reload(); time.sleep(0.6)
    pg.click("#startBtn"); time.sleep(0.3)
    ev("(()=>{const S=window.__nusa.S; S.muted=true; S.hour=10; S.up.boat=2; S.up.rod=3; NW.weather.force('cerah',{snap:true}); document.getElementById('banner').classList.remove('show')})()")
    def shot(name, wait=0.9):
        time.sleep(wait); ev("document.getElementById('toast').classList.remove('show'); document.getElementById('discover').classList.remove('show')"); time.sleep(0.15)
        pg.screenshot(path=os.path.join(OUT, name + ".png"))
    def pose(x, y, a): ev(f"NW.boat.B.v=0; NW.boat.setPose({x},{y},{a}); NW.world.snapCamera()")
    def sail(secs, key="w"): pg.keyboard.down(key); time.sleep(secs); pg.keyboard.up(key)
    m = ev("NW.areas.get('muara').sea.moors[0]")
    ev(f"(()=>{{const p=NW.world.player;p.x={m['board']['x']};p.y={m['board']['y']};NW.world.snapCamera()}})()"); time.sleep(0.4)
    ev("NW.world.interact()"); time.sleep(0.3)
    pose(38.5, 25.2, ang(1, 0.25)); pg.keyboard.down("w"); time.sleep(1.4); shot("kapal_berlayar_muara", 0.2); pg.keyboard.up("w")
    # laut lepas
    pose(51.2, 24, ang(1, 0)); sail(1.2); time.sleep(0.8)
    pose(20, 16.5, ang(1, -0.4)); pg.keyboard.down("w"); time.sleep(1.3); shot("kapal_laut_lepas", 0.2); pg.keyboard.up("w")
    pose(37, 30.5, ang(1, 0.3)); pg.keyboard.down("w"); time.sleep(1.0); shot("spot_karang", 0.2); pg.keyboard.up("w")
    ev("window.__nusa.S.hour=17.6"); pose(58, 13, ang(1, -0.5)); pg.keyboard.down("w"); time.sleep(1.0); shot("kapal_senja", 0.2); pg.keyboard.up("w")
    ev("window.__nusa.S.hour=21"); pose(60, 30, ang(1, 0)); pg.keyboard.down("w"); time.sleep(0.9); shot("kapal_malam", 0.2); pg.keyboard.up("w")
    ev("window.__nusa.S.hour=11; NW.weather.force('deras',{snap:true})"); pose(30, 26, ang(1, 0.2)); pg.keyboard.down("w"); time.sleep(1.1); shot("laut_hujan", 0.2); pg.keyboard.up("w")
    ev("NW.weather.force('kabut',{snap:true})"); pose(24, 18, ang(0.4, 1)); time.sleep(0.4); shot("laut_kabut")
    ev("NW.weather.force('cerah',{snap:true})")
    # memancing dari kapal
    pose(40, 33.2, ang(1, 0)); ev("NW.boat.toggleAnchor()"); time.sleep(0.8); ev("NW.boat.fish()"); time.sleep(1.0)
    pg.mouse.move(210, 520); pg.mouse.down(); time.sleep(0.55); pg.mouse.up(); time.sleep(1.5); shot("mancing_dari_kapal", 0.1)
    ev("(()=>{const N=window.__nusa,G=N.G; G.biteTimer=0.01})()"); time.sleep(0.4)
    ev("(()=>{const N=window.__nusa,G=N.G; if(G.phase!=='bite') return; G.pending={fish:window.Nusa.FISH_BY_ID.kerapu_macan,w:4.2,wr:0.4}; N.startFight(); })()"); time.sleep(0.9); shot("mancing_laut_strike", 0.1)
    ev("window.__nusa.endFight('caught')"); time.sleep(0.4); pg.click("#catchOk"); time.sleep(0.2); pg.click("#landBtn"); time.sleep(0.6)
    # peta laut
    ev("NW.boat.toggleAnchor()"); pose(79.6, 24, ang(1, 0)); sail(1.2); time.sleep(0.8)
    pg.tap("#seaMap"); time.sleep(0.8); shot("peta_laut", 0.2); pg.tap("#panelClose"); time.sleep(0.3)
    # pelabuhan selat sunda
    mo = ev("NW.areas.get('selat').sea.moors[0]")
    pose(mo["x"] - 1.6, mo["y"] + 0.4, mo["a"]); time.sleep(0.4); shot("pelabuhan_dermaga")
    pg.tap("#actBtn"); time.sleep(1.3)
    ev("window.__nusa.S.hour=9.5; NW.world.areaNpcs().forEach(NW.world.placeNPC); const p=NW.world.player; p.x=19.6; p.y=19.3; NW.world.snapCamera()"); shot("pelabuhan_selat_sunda", 1.2)
    ev("const p=NW.world.player; p.x=17.6; p.y=8.2; NW.world.snapCamera()"); shot("pelabuhan_mercusuar", 1.0)
    print("selesai:", OUT, "error:", errs[:3])
    b.close()
