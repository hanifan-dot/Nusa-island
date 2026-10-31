"""5 FOTO ASLI Event 5 Monster Legenda: setiap monster berenang di lokasi aslinya di game produksi (index.html asli) pada jadwal event-nya.
Server event = inti produksi yang sama (economy/core.js + event/core.js) di dalam halaman; klien event tidak dimodifikasi.
Jalankan: python tests/browser/shots_event.py [folder_keluaran]   → monster_1_toman_purba.png … monster_5_megalodon_bayangan.png (+ spawn_*.png)"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
from _event_harness import *
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ev/shots"; os.makedirs(OUT, exist_ok=True)
MON = [("toman_purba", "muara"), ("jurung_mahkota", "toba"), ("barakuda_guntur", "selat"), ("kuwe_titan", "ampat"), ("megalodon_bayangan", "banda")]
PICK = """({id,ev})=>{const C=NusaEventCore; let best=30,bx=9; for(let t=26;t<1100;t+=0.25){const p=C.swimAt(id,ev,t); if(p.depth<0.03&&p.z>4.4&&p.z<6.4&&p.speed>0.2&&Math.abs(p.x)<bx){bx=Math.abs(p.x);best=t}} return best}"""
with sync_playwright() as p:
    b = p.chromium.launch()
    for i, (mon, loc) in enumerate(MON):
        t0 = S1 + i * WEEK                                   # Minggu ke-i dari 1 Nov 2026 → monster ke-i
        evid = "e" + time.strftime("%Y%m%d", time.gmtime((t0 + 7 * 3600000) / 1000))
        # (1) foto kemunculan: 3 detik setelah event dimulai
        ctx, pg, errs = boot(b, t0 + 2500); go_fishing(pg, loc); time.sleep(0.8)
        assert ev(pg, "NW.event.status().ev.monster") == mon, mon
        pg.screenshot(path=f"{OUT}/spawn_{i+1}_{mon}.png"); ctx.close()
        # (2) foto berenang: saat monster sedang di permukaan dan terlihat jelas
        ctx, pg, errs = boot(b, t0 + 1000); go_fishing(pg, loc)
        t = ev(pg, PICK, {"id": mon, "ev": evid}); ev(pg, "(t)=>{window.__setSrv(t)}", t0 + int(t * 1000)); ev(pg, "NW.event.fetchInfo()"); time.sleep(0.9)
        m = ev(pg, "()=>{const m=NW.event.monsterNow();return m&&{id:m.id,t:m.t,spawn:m.spawn}}"); print(mon, loc, "t=", t, m, "errs:", errs)
        pg.screenshot(path=f"{OUT}/monster_{i+1}_{mon}.png"); ctx.close()
    b.close()
print("selesai →", OUT)
