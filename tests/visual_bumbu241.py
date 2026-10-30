"""Bukti visual Bumbu 2.4.1 "Rahasia Ikan Mistis" (Chromium headless, layar HP 390×844 @2x — emulasi, bukan HP fisik).
Pakai: python tests/visual_bumbu241.py <folder-keluaran>
Menghasilkan: palung_jauh, palung_malam, palung_penemuan, palung_mancing_petunjuk, tangkap_lentera, tangkap_pari, dex_mistis, buku_petualangan, ikan_baru.
"""
import os, sys, time, math
from playwright.sync_api import sync_playwright

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/nusa-b241"; os.makedirs(OUT, exist_ok=True)
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
    ev("(()=>{const S=window.__nusa.S; S.muted=true; S.hour=10; S.up.boat=2; S.up.rod=4; NW.weather.force('cerah',{snap:true}); document.getElementById('banner').classList.remove('show')})()")
    def shot(name, wait=0.9):
        time.sleep(wait); ev("document.getElementById('toast').classList.remove('show'); document.getElementById('discover').classList.remove('show')"); time.sleep(0.15)
        pg.screenshot(path=os.path.join(OUT, name + ".png"))
    def pose(x, y, a): ev(f"NW.boat.B.v=0; NW.boat.setPose({x},{y},{a}); NW.world.snapCamera()")
    m = ev("NW.areas.get('muara').sea.moors[0]")
    ev(f"(()=>{{const p=NW.world.player;p.x={m['board']['x']};p.y={m['board']['y']};NW.world.snapCamera()}})()"); time.sleep(0.4)
    ev("NW.world.interact()"); time.sleep(0.3)
    pg.keyboard.down("w"); pg.keyboard.up("w")
    # ke laut lepas
    pose(51.2, 24, ang(1, 0)); pg.keyboard.down("w"); time.sleep(1.2); pg.keyboard.up("w"); time.sleep(0.8)
    print("area", ev("NW.areas.cur.id"))
    # palung dari jauh (siang) lalu malam
    pose(56, 40, ang(1, 0.4)); pg.keyboard.down("w"); time.sleep(0.8); shot("palung_jauh", 0.1); pg.keyboard.up("w")
    ev("window.__nusa.S.hour=21.5"); pose(58, 41, ang(1, 0.3)); pg.keyboard.down("w"); time.sleep(0.9); shot("palung_malam", 0.1)
    # masuk lingkaran → penemuan
    pose(62.4, 43.2, ang(1, 0.3)); time.sleep(1.2); ev("document.getElementById('toast').classList.remove('show')")
    pg.screenshot(path=os.path.join(OUT, "palung_penemuan.png")); pg.keyboard.up("w")
    print("found", ev("NW.adv.isFound('sea:palung')"))
    # memancing di palung: paksa lentera supaya petunjuk muncul
    pose(65.5, 44, ang(1, 0.3)); time.sleep(0.6); ev("if(!NW.boat.B.anchor) NW.boat.toggleAnchor()"); time.sleep(2.4); print("fish->", ev("NW.boat.fish()")); time.sleep(1.2)
    print("mode", ev("window.__nusa.mode()"), ev("window.__nusa.G.sea && window.__nusa.G.sea.id"))
    ev("window.__nusa.S.hour=22; NW.weather.force('kabut',{snap:true})")
    pg.mouse.move(210, 520); pg.mouse.down(); time.sleep(0.5); pg.mouse.up(); time.sleep(1.0)
    ev("(()=>{const G=window.__nusa.G; G.myst={fish:'lentera_arwah',shown:false,glow:0,hintAt:G.biteTimer+1}; G.biteTimer=7; G.myst.hintAt=6.5})()"); time.sleep(1.6)
    shot("palung_mancing_petunjuk", 0.8)
    ev("(()=>{const N=window.__nusa,G=N.G; G.biteTimer=0.01})()"); time.sleep(0.5)
    print("pending", ev("window.__nusa.G.pending && window.__nusa.G.pending.fish.id"), ev("window.__nusa.G.phase"))
    ev("(()=>{const N=window.__nusa,G=N.G; if(G.phase==='bite') N.startFight()})()"); time.sleep(0.8); shot("palung_pertarungan", 0.2)
    ev("window.__nusa.endFight('caught')"); time.sleep(0.5); shot("tangkap_lentera", 1.2)
    pg.click("#catchOk"); time.sleep(0.3)
    # pari bayang
    ev("window.__nusa.S.hour=18.2; NW.weather.force('hujan',{snap:true})")
    pg.mouse.move(210, 520); pg.mouse.down(); time.sleep(0.5); pg.mouse.up(); time.sleep(1.0)
    ev("(()=>{const G=window.__nusa.G; G.myst={fish:'pari_bayang',shown:false,glow:0,hintAt:G.biteTimer+1}; G.biteTimer=7; G.myst.hintAt=6.5})()"); time.sleep(1.6)
    ev("(()=>{const N=window.__nusa,G=N.G; G.biteTimer=0.01})()"); time.sleep(0.5)
    ev("(()=>{const N=window.__nusa,G=N.G; if(G.phase==='bite') N.startFight()})()"); time.sleep(0.8)
    ev("window.__nusa.endFight('caught')"); time.sleep(0.5); shot("tangkap_pari", 1.2)
    pg.click("#catchOk"); time.sleep(0.3)
    print("cooler", ev("window.__nusa.S.cooler.map(i=>i.id+':'+i.lock+':'+i.uid)"))
    ev("window.Nusa.openPanel('dex')"); time.sleep(0.4); ev("document.querySelector('[data-act=tab][data-arg=selat]').click()"); time.sleep(0.4); shot("dex_selat", 0.3)
    ev("window.Nusa.closePanel()"); ev("window.Nusa.openPanel('adventure')"); time.sleep(0.4); ev("document.getElementById('panelBody').scrollTop=9999"); shot("buku_petualangan", 0.3)
    print("errs", errs[:3])
    b.close()
