"""Uji Samudra Follower: default mati, mode preview, 4 kartu + kredit, detail, animasi, pratinjau kartu tangkapan, save tidak berubah. Tidak diuji: Android fisik, tangkapan nyata (belum diaktifkan)."""
import os, sys, time, json
H = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(H, "test_multiplayer.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.join(H, "test_multiplayer.py")}; exec(compile(src, "mp", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed, R = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"], ns["R"]
OUT = os.environ.get("SHOTS", "/tmp/nusa-sf/"); os.makedirs(OUT, exist_ok=True)
def page(b, q="", vp=(360, 740)):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    ctx.add_init_script(("window.NUSA_SF_PREVIEW=true;" if "sf=preview" in q else "") + "window.__demoAuto='demo-a';if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1')}" % json.dumps(json.dumps(seed("Budi"))))
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(ns["ROOT"] + "?cloud=demo" + q); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    return ctx, pg, errs
def dex(pg): ev(pg, "Nusa.openPanel ? Nusa.openPanel('dex') : document.querySelector('[data-panel=dex]').click()"); time.sleep(0.3)
def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx, A, e1 = page(b); dex(A)
        ok("A1 default MATI: tidak ada tab Samudra Follower", ev(A, "NW.sf.mode()==='off' && ![...document.querySelectorAll('.dex-tabs button')].some(x=>/Samudra/.test(x.textContent))"))
        ok("A2 default MATI: tidak ada ikan sf di FISH/ekonomi", ev(A, "!Nusa.FISH_BY_ID['sf_tempe'] && !Object.keys(Nusa.FISH_BY_ID).some(k=>k.startsWith('sf_'))"))
        ctx.close()
        ctx, pg, e2 = page(b, "&sf=preview"); dex(pg)
        before = ev(pg, "localStorage.getItem('nusa-island-v1')")
        ok("B1 preview: tab Samudra Follower muncul", ev(pg, "[...document.querySelectorAll('.dex-tabs button')].some(x=>/Samudra Follower/.test(x.textContent))"))
        ev(pg, "[...document.querySelectorAll('.dex-tabs button')].find(x=>/Samudra/.test(x.textContent)).click()"); time.sleep(0.4)
        cells = ev(pg, "[...document.querySelectorAll('.sf-cell')].map(c=>c.innerText.replace(/\\n/g,' | '))")
        ok("B2 4 kartu dengan nama, rarity, kredit IG", len(cells) == 4 and all("@" in c for c in cells) and "MYTHICAL EVENT" in " ".join(cells) and "LEGENDARY" in " ".join(cells) and "EPIC" in " ".join(cells), cells)
        ok("B3 gambar 4 ikan termuat", ev(pg, "[...document.querySelectorAll('.sf-cell img')].every(i=>i.complete&&i.naturalWidth>50)"))
        pg.screenshot(path=OUT + "1-koleksi-samudra-follower.png")
        ids = ["sf_tempe", "sf_cupang_slayer", "sf_prabowo", "sf_arapaima"]; names = {}
        for i, id in enumerate(ids):
            ev(pg, "document.querySelector('.sf-cell[data-arg=%s]').click()" % id); time.sleep(0.5)
            t = ev(pg, "document.getElementById('sfOv').innerText")
            cred = {"sf_tempe": "@mlfs_05", "sf_cupang_slayer": "@agusii.55", "sf_prabowo": "@akhmadraffa123", "sf_arapaima": "@alanaimroni"}[id]
            ok("C%d detail %s: kredit %s tampil" % (i + 1, id, cred), cred in t and ev(pg, "NW.sf.isOpen()"), t[:90])
            f1 = ev(pg, "NW.sf.frames()"); d1 = ev(pg, "document.getElementById('sfCv').toDataURL()"); time.sleep(0.7); d2 = ev(pg, "document.getElementById('sfCv').toDataURL()")
            ok("C%d animasi %s berubah antar-frame" % (i + 1, id), ev(pg, "NW.sf.frames()") > f1 + 5 and d1 != d2)
            pg.screenshot(path=OUT + "%d-detail-%s.png" % (2 + i, id))
            if i == 0:
                pg.click("#sfPrev"); time.sleep(0.5); ok("D1 pratinjau kartu tangkapan, kredit tetap tampil", "TANGKAPAN SPESIAL" in ev(pg, "document.getElementById('sfOv').innerText") and "@mlfs_05" in ev(pg, "document.getElementById('sfOv').innerText")); pg.screenshot(path=OUT + "6-kartu-tangkapan-tempe.png")
            pg.click("#sfX"); time.sleep(0.2)
        ok("E1 overlay tertutup -> rAF berhenti", (time.sleep(0.3), ev(pg, "(()=>{const a=NW.sf.frames();return new Promise(r=>setTimeout(()=>r(NW.sf.frames()===a),300))})()"))[1])
        ok("E2 save/dex/koin TIDAK berubah (tanpa ikan/koin gratis)", ev(pg, "(()=>{const s=JSON.parse(localStorage.getItem('nusa-island-v1'));return s.money===50&&Object.keys(s.dex).length===0&&!JSON.stringify(s).includes('sf_')})()"), "")
        ok("E3 checkCatch menolak semua (belum final)", ev(pg, "ids=['sf_tempe','sf_cupang_slayer','sf_prabowo','sf_arapaima'];ids.every(i=>!NusaSFCatalog.checkCatch(i,1,{}).ok)"))
        ok("E4 memancing tetap jalan (modul inti utuh)", ev(pg, "typeof Nusa.enterFishing==='function' && typeof Nusa.drawFish==='function' && !!Nusa.FISH_BY_ID['tuna'] || Object.keys(Nusa.FISH_BY_ID).length>40"))
        ok("E5 tanpa error halaman", not e2, e2); ctx.close()
        ctx, pg, e3 = page(b, "&sf=preview", (360, 640)); dex(pg)
        ev(pg, "[...document.querySelectorAll('.dex-tabs button')].find(x=>/Samudra/.test(x.textContent)).click()"); time.sleep(0.3)
        ev(pg, "document.querySelector('.sf-cell[data-arg=sf_arapaima]').click()"); time.sleep(0.5)
        ok("F1 layout 360x640: kartu muat di layar", ev(pg, "(()=>{const r=document.getElementById('sfCard').getBoundingClientRect();return r.left>=0&&r.right<=360&&r.top>=0&&r.bottom<=640&&document.documentElement.scrollWidth<=360})()"))
        pg.screenshot(path=OUT + "7-layar-kecil-arapaima.png"); ok("F2 tanpa error", not e3, e3); ctx.close(); b.close()
    f = [r for r in R if r.startswith("FAIL")]; print("\n%d/%d lolos" % (len(R) - len(f), len(R))); sys.exit(1 if f else 0)
main()
