"""Bukti visual Bumbu 2.2 (tangkapan layar headless): empat varian ikan, dua spot rahasia, kartu momen istimewa.
Jalankan: python tests/visual_bumbu22.py <folder-keluaran>
"""
import os, sys, time
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "index.html"))
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/nusa-b22"; os.makedirs(OUT, exist_ok=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def start(b, vp=(390, 844)):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(ROOT); time.sleep(0.6); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.7)
    pg.click("#startBtn"); time.sleep(0.4); ev(pg, "(h)=>{window.__nusa.S.hour=h; document.getElementById('banner').classList.remove('show')}", 9); time.sleep(0.7)
    return ctx, pg, errs
def goto(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera()}", [x, y]); time.sleep(0.6)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs = start(b)
    # 1) lembar kontak empat varian × beberapa spesies
    ev(pg, """()=>{
      const ids=['nila','lele','patin','gabus'].concat(window.__nusa.S?['mujair']:[]); const F=window.Nusa.FISH_BY_ID; const V=['normal','silver','sunset','pearl'];
      const list=Object.values(F).filter(f=>NW.variants.eligible(f)); const pick=['nila','lele','gabus','patin'].map(i=>F[i]).filter(Boolean);
      for(const f of list){ if(pick.length>=8) break; if(!pick.includes(f) && (f.stripes||f.spots||f.sail||f.fin==='sail'||f.rarity==='legenda')) pick.push(f); }
      const c=document.createElement('canvas'); c.id='sheet'; c.width=4*220+90; c.height=pick.length*92+34; Object.assign(c.style,{position:'fixed',left:0,top:0,zIndex:99999,background:'#173f50'});
      document.body.appendChild(c); const x=c.getContext('2d'); x.font='700 14px system-ui'; x.fillStyle='#fff';
      V.forEach((v,i)=>x.fillText(NW.variants.info(v).name,90+i*220+60,20));
      pick.forEach((f,r)=>{ x.fillStyle='#fff'; x.font='700 12px system-ui'; x.fillText(f.name,6,r*92+64); V.forEach((v,i)=>{ window.Nusa.drawFish(x,f,90+i*220+110,r*92+68,150,v); }); });
    }""")
    time.sleep(0.5); pg.screenshot(path=f"{OUT}/varian_ikan_lembar.png", clip={"x": 0, "y": 0, "width": 390, "height": 844}) if False else None
    ev(pg, "document.getElementById('sheet').style.transform='scale(0.42)';document.getElementById('sheet').style.transformOrigin='0 0'")
    pg.screenshot(path=f"{OUT}/varian_ikan_lembar.png"); ev(pg, "document.getElementById('sheet').remove()")
    print("ok sheet", errs)
    ctx.close()
    # 2) spot rahasia
    ctx, pg, errs = start(b)
    goto(pg, 12.8, 13.5); pg.screenshot(path=f"{OUT}/spot1_petunjuk_jauh.png")
    goto(pg, 10.6, 11.3); time.sleep(0.4); pg.screenshot(path=f"{OUT}/spot1_petunjuk_dekat.png")
    ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];}", [10.3, 10.6]); time.sleep(1.0); pg.screenshot(path=f"{OUT}/spot1_ditemukan.png")
    time.sleep(3.2); ev(pg, "window.__nusa.S.hour=9"); pg.screenshot(path=f"{OUT}/spot1_titik_mancing.png")
    print("tmp", ev(pg, "[NW.secret.found('lubuk'), NW.areas.cur.map.points.filter(p=>p.secret).length]"))
    pg.click("#actBtn"); time.sleep(2.2); pg.screenshot(path=f"{OUT}/spot1_mancing.png")
    print("mode", ev(pg, "[window.__nusa.mode(), window.__nusa.G.spotId]"))
    ctx.close()
    ctx, pg, errs = start(b)
    ev(pg, "(h)=>{window.__nusa.S.up.boat=1;window.__nusa.S.hour=h}", 9); ev(pg, "window.__nusa.travel(1)"); time.sleep(3.6)
    ev(pg, "window.__nusa.S.adv.found['toba:bukit']=Date.now()")
    goto(pg, 6.0, 15.0); pg.screenshot(path=f"{OUT}/spot2_petunjuk.png")
    ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];}", [3.5, 13.6]); time.sleep(1.0); pg.screenshot(path=f"{OUT}/spot2_ditemukan.png")
    time.sleep(3.2); pg.screenshot(path=f"{OUT}/spot2_titik_mancing.png")
    print("tmp2", ev(pg, "[NW.secret.found('teluk'), NW.areas.cur.id, NW.areas.cur.map.points.filter(p=>p.secret).length]"))
    pg.click("#actBtn"); time.sleep(2.2); pg.screenshot(path=f"{OUT}/spot2_mancing.png")
    ctx.close()

    # 3) kartu momen istimewa, inventaris bertag varian, koleksi varian
    import re
    HELP = re.search(r'HELP = """(.*?)"""', open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "browser", "test_bumbu22.py")).read(), re.S).group(1)
    ctx, pg, errs = start(b)
    ev(pg, HELP); ev(pg, "window.__nusa.S.up.cooler=4"); ev(pg, "window.__mode=null")
    for name, fid, w, rnd in [("silver", "mujair", 0.5, 0.05), ("sunset", "patin", 3.2, 0.015), ("pearl", "lele", 1.1, 0.001)]:
        ev(pg, "([a,b,c])=>window.__land(a,b,c)", [fid, w, rnd])
        time.sleep(0.5); pg.screenshot(path=f"{OUT}/kartu_{name}_awal.png")
        time.sleep(3.2); pg.screenshot(path=f"{OUT}/kartu_{name}_akhir.png")
        ev(pg, "window.__closeCard()"); time.sleep(0.4)
    # ikan raksasa (berat mendekati batas atas spesies)
    ev(pg, """()=>{const f=window.Nusa.FISH_BY_ID['patin']; window.__land('patin', f.wMax*1.02, 0.99)}"""); time.sleep(0.6); pg.screenshot(path=f"{OUT}/kartu_raksasa_awal.png")
    time.sleep(3.2); pg.screenshot(path=f"{OUT}/kartu_raksasa_akhir.png"); ev(pg, "window.__closeCard()"); time.sleep(0.4)
    ev(pg, "window.__mode=null; (window.Nusa.exitFishing||function(){})()"); time.sleep(0.4)
    ev(pg, "window.Nusa.openPanel('inventory')"); time.sleep(0.6); pg.screenshot(path=f"{OUT}/inventaris_varian.png")
    ev(pg, "window.Nusa.openPanel('dex')"); time.sleep(0.6); pg.screenshot(path=f"{OUT}/koleksi_varian.png")
    print("kartu/inv/dex", errs)
    ctx.close()
    b.close()
