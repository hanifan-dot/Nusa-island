#!/usr/bin/env python3
"""Ide 08E — membuat/memeriksa blok data geometri halaman (dapur/halaman-geo.js) dari game ASLI (NW.HOUSE.plotLayout, PLOT_SOLIDS, kolam).
  python3 tests/dev/gen_halaman_geo.py          → tulis ulang blok GEO di dapur/halaman-geo.js
  python3 tests/dev/gen_halaman_geo.py --check  → gagal (exit 1) bila blok yang tersimpan berbeda dari game (deteksi perubahan Kota/Rumahku oleh Worker lain)
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.abspath(os.path.join(here, "..", ".."))
SRC = os.path.join(root, "dapur", "halaman-geo.js"); ROOT = "file://" + os.path.join(root, "index.html")
r4 = lambda v: round(float(v) + 0.0, 4)
def dump():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(ROOT); pg.wait_for_function("window.NW && NW.HOUSE && NW.pondDraw", timeout=20000)
        raw = pg.evaluate("""()=>{const H=NW.HOUSE,out={PW:H.PW,PH:H.PH,pond:NW.pondDraw.RECT,lv:{}};for(let lv=1;lv<=10;lv++){const L=H.plotLayout(lv);out.lv[lv]={solids:H.PLOT_SOLIDS(L),door:L.doorPt,gate:L.gate,sign:L.sign,mail:L.mailbox,house:L.house}}return out}""")
        b.close()
    rc = lambda s: [r4(s["x0"]), r4(s["y0"]), r4(s["x1"]), r4(s["y1"])]; pt = lambda q: [r4(q["x"]), r4(q["y"])]
    g = {"PW": raw["PW"], "PH": raw["PH"], "pond": rc(raw["pond"]), "lv": {}}
    for k, v in raw["lv"].items(): g["lv"][k] = {"s": [rc(s) for s in v["solids"]], "door": pt(v["door"]), "gate": pt(v["gate"]), "sign": pt(v["sign"]), "mail": pt(v["mail"]), "house": rc(v["house"])}
    return json.dumps(g, separators=(",", ":"))
new = dump(); src = open(SRC).read()
m = re.search(r"/\*GEO:BEGIN\*/(.*?)/\*GEO:END\*/", src, re.S)
cur = m.group(1).strip()[len("const GEO = "):].rstrip(";").strip() if m else None
if "--check" in sys.argv:
    ok = cur == new; print("geometri halaman %s game" % ("SAMA dengan" if ok else "BERBEDA dari")); sys.exit(0 if ok else 1)
out = src[:m.start(1)] + "\nconst GEO = " + new + ";\n" + src[m.end(1):]
open(SRC, "w").write(out); print("blok GEO ditulis (%d byte)" % len(new))
