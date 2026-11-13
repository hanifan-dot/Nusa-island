"""Menghasilkan tangkapan layar bukti Visual Kota Nusa ke docs/ai-handoff/ide-04/shots/ (flag NUSA_KOTA hanya dipasang di sesi uji ini)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("SHOTS", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "ai-handoff", "ide-04", "shots")) + "/")
from kota_lib import *
SC = [("1-pusat-kota-siang", 67.5, 21.2, 11, 69, "pusat kota: gedung, lalu lintas, NPC"), ("2-pasar-dan-ruko", 50.0, 13.5, 10, 69, "pasar & ruko"),
      ("3-taman-kota", 66.5, 40.2, 15, 69, "taman: pelari, pesepeda, warga duduk"), ("4-pusat-kota-malam", 67.5, 21.2, 23, 69, "malam sepi, jendela gedung menyala")]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs, reqs = boot(b, hour=11, quality=2, vp=(1280, 760)); to_selat(pg); set_clock(pg, 69)
    for n, x, y, h, c, _ in SC:
        set_hour(pg, h); set_clock(pg, c); tp(pg, x, y); time.sleep(7.0 if n.startswith("1") else 2.2); shot(pg, n); print(n, ev(pg, "NW.kota.stats()"), errs[:2])
    ctx.close()
    ctx, pg, errs, reqs = boot(b, hour=11, quality=2, vp=(2250, 1150)); to_selat(pg); set_clock(pg, 69); set_hour(pg, 11); tp(pg, 64, 24)
    ev(pg, "NW.world.look({x:64,y:24,zoom:0.31,dur:40})"); time.sleep(5.0); ev(pg, "(()=>{const d=document.getElementById('kotaDir');if(d)d.style.display='none'})()"); shot(pg, "5-peta-seluruh-kota"); print("peta", ev(pg, "NW.world.zoom"), errs[:2])
    b.close()
