"""Bukti visual Fase A (4 gambar terpisah). SEMUA data dev/mock: server tiruan lokal mengikuti kontrak (docs/ai-handoff/CONTRACTS.md),
dev server multiplayer lokal. BUKAN produksi: tiap gambar diberi pita merah "DEV/MOCK". Angka hadiah (777) = angka tiruan dari server tiruan.
Pakai: python3 tests/browser/shots_fase_a.py [folder-keluaran]   (jalankan SESUDAH suite lain selesai; berurutan)."""
import os, sys, time, json
H = os.path.dirname(os.path.abspath(__file__))
OUT = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("SHOTS", "/tmp/fase-a-shots")).rstrip("/") + "/"; os.makedirs(OUT, exist_ok=True)
os.environ["SHOTS"] = OUT
src = open(os.path.join(H, "test_port_rombongan.py")).read()
RN = {"__file__": os.path.join(H, "test_port_rombongan.py"), "__name__": "port_rombongan_lib"}; exec(compile(src, "pr", "exec"), RN)   # __name__ ≠ __main__ → hanya mengambil helper, tidak menjalankan tesnya
ns, pn = RN["ns"], RN["pn"]; ev, wait_for, Srv, page = RN["ev"], RN["wait_for"], RN["Srv"], RN["page"]
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
TAG = "DEV/MOCK — server tiruan lokal, BUKAN produksi"

def badge(pg, extra=""):
    ev(pg, "(t)=>{let d=document.getElementById('__mock');if(!d){d=document.createElement('div');d.id='__mock';d.style.cssText='position:fixed;left:0;right:0;top:0;z-index:99999;background:#b00020;color:#fff;font:bold 11px/1.35 sans-serif;text-align:center;padding:3px 4px;pointer-events:none';document.body.appendChild(d)}d.textContent=t}", TAG + (" · " + extra if extra else ""))
def shot(pg, name, extra=""):
    badge(pg, extra); time.sleep(0.15); pg.screenshot(path=OUT + name)
def strip(names, out, caps):
    ims = [Image.open(OUT + n).convert("RGB") for n in names]; h = max(i.height for i in ims); gap = 16; cap = 64
    W = sum(i.width for i in ims) + gap * (len(ims) + 1); im = Image.new("RGB", (W, h + cap + gap), (24, 28, 40)); d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
    except Exception: f = ImageFont.load_default()
    x = gap
    for i, c in zip(ims, caps): im.paste(i, (x, cap)); d.text((x + 6, 16), c, fill=(255, 255, 255), font=f); x += i.width + gap
    im.save(OUT + out)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(); s = ns["srv"](True)
        try:
            sa, sb, sc = Srv(True), Srv(True), Srv(True)       # kotak awal KOSONG: pengepakan dilakukan lewat UI
            cA, A, eA = page(b, "demo-a", sa, ns["OUT"]["A"]); cB, B, eB = page(b, "demo-b", sb, ns["OUT"]["B"]); cC, C, eC = page(b, "demo-owner", sc, ns["OUT"]["C"])
            assert all(ns["online"](x) for x in (A, B, C)) and all(wait_for(x, "NW.port&&NW.port.ready&&NW.rombongan.state().srv", 12) for x in (A, B, C)), "klien belum siap"
            for x in (A, B, C): ns["tp"](x, 37.2, 21.3)
            time.sleep(1.2); assert ns["act"](A, "rb:new") and wait_for(A, "!!NW.mp.boatMine()", 6)
            bid = ns["boats"](A)[0]["id"]
            for x in (B, C): ns["tp"](x, 37.2, 21.7)
            time.sleep(1.0); ev(B, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.8); ns["tp"](C, 37.6, 21.7); time.sleep(0.8); ev(C, "(b)=>NW.mp.boatJoin(b,2)", bid)
            assert wait_for(A, "NW.mp.boats()[0].seats.every(x=>x!==0)", 8), "kursi belum penuh"
            # ---- 1) memilih enam ikan, mengisi dua kotak ----
            ev(A, "NW.delivery.open()"); wait_for(A, "document.querySelectorAll('.dl-bag .dl-fish').length>=6", 8); time.sleep(0.3)
            A.click(".dl-bag .dl-fish"); shot(A, "_s1_pilih.png", "ikan dipilih");
            A.click(".dl-box[data-box='0'] h4")
            for k in range(2): A.click(".dl-bag .dl-fish"); A.click(".dl-box[data-box='0'] h4")
            for k in range(3): A.click(".dl-bag .dl-fish"); A.click(".dl-box[data-box='1'] h4")
            wait_for(A, "!document.getElementById('dlSend').disabled", 4); time.sleep(0.3)
            shot(A, "fase-a-1-enam-ikan-dua-kotak.png", "6 ikan → 2 kotak (3+3)")
            # ---- 2) kapal rombongan tiga pemain BERLAYAR: KAPTEN memakai UI Kemudi (setir + tuas + knot + kompas + jangkar), penumpang hanya HUD penumpang ----
            A.click("#dlSend"); wait_for(A, "document.querySelector('.dl-un')", 8); time.sleep(0.4)
            ev(A, "NW.delivery.close && NW.delivery.close()"); time.sleep(0.4)
            assert wait_for(A, "NW.kemudi && NW.kemudi.on && NW.kemudi.host==='rombongan'", 5), "Kemudi kapten tak muncul"
            assert not any(ev(x, "!!(NW.kemudi && NW.kemudi.on)") for x in (B, C)), "penumpang tak boleh punya Kemudi"
            A.click("#kmAnchor"); assert wait_for(C, "!NW.mp.boats()[0].anchor", 5), "jangkar tak naik"
            wr = ev(A, "(()=>{const b=document.getElementById('kmWheel').getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2,r:b.width/2}})()")
            while ev(A, "NW.mp.boats()[0].d") != 3:     # setir dengan penunjuk nyata sampai arah Barat Daya (searah garis pelayaran yang lapang)
                A.mouse.move(wr["x"] + 0.69 * wr["r"], wr["y"] + 0.4 * wr["r"]); A.mouse.down(); time.sleep(0.5); A.mouse.up(); wait_for(A, "Math.abs(NW.kemudi._st.deg)<1", 4); time.sleep(0.3)
            A.click("#kmLever button[data-g='MAJU']")
            assert all(wait_for(x, "NW.mp.boats()[0].v>0.3", 6) for x in (A, B, C)), "kapal tak bergerak"; time.sleep(0.9)
            for n_, x in (("A", A), ("B", B), ("C", C)): shot(x, "_s2_%s.png" % n_, "kapal rombongan berlayar (Muara)")
            A.click("#kmLever button[data-g='NETRAL']"); assert all(wait_for(x, "NW.mp.boats()[0].v<0.05", 8) for x in (A, B, C)); time.sleep(0.3)
            strip(["_s2_A.png", "_s2_B.png", "_s2_C.png"], "fase-a-2-kapal-rombongan-tiga-pemain-berlayar.png", ["Kapten (A) memakai UI Kemudi", "Penumpang (B): tanpa Kemudi", "Penumpang (C): tanpa Kemudi"])
            A.click("#kmAnchor"); assert wait_for(A, "NW.mp.boats()[0].anchor && NW.mp.boats()[0].v===0", 8), "jangkar tak turun"; time.sleep(0.5)
            ev(A, "NW.delivery.open()"); wait_for(A, "!!document.getElementById('pkSail')", 8); A.click("#pkSail")
            assert all(wait_for(x, "NW.areas.cur.id==='selat'", 16) for x in (A, B, C)), "belum tiba di Pelabuhan Kota"
            time.sleep(4.0)
            # ---- 3) kapal tiba, karakter membawa kotak menuju mobil ----
            ev(A, "NW.rombongan.disembark(NW.port.positions.BOARD_SPOT)"); wait_for(A, "NW.rombongan.mine().ashore", 3); time.sleep(1.2)
            c = ev(A, "NW.port.positions.CRATE[0]"); pn["walk"](A, c["x"] - 0.4, c["y"]); pn["interact_id"](A, "pk:crate:0"); wait_for(A, "NW.port._st.carry", 4)
            lp = ev(A, "NW.port.positions.LOAD_PT"); mx, my = c["x"] + (lp["x"] - c["x"]) * 0.7, c["y"] + (lp["y"] - c["y"]) * 0.7
            pn["walk"](A, mx, my); time.sleep(0.9)
            for n_, x in (("A", A), ("B", B), ("C", C)): shot(x, "_s3_%s.png" % n_, "Pelabuhan Kota")
            strip(["_s3_A.png", "_s3_B.png", "_s3_C.png"], "fase-a-3-kapal-tiba-membawa-kotak-ke-mobil.png", ["Kapten membawa kotak", "Penumpang (B) di kapal", "Penumpang (C) di kapal"])
            # ---- 4) mobil Pak Damar berangkat + panel hasil dari server ----
            pn["walk"](A, lp["x"], lp["y"]); pn["interact_id"](A, "pk:truck"); wait_for(A, "!NW.port._st.load", 8); time.sleep(1.0)
            c1 = ev(A, "NW.port.positions.CRATE[1]"); pn["walk"](A, c1["x"] - 0.4, c1["y"]); pn["interact_id"](A, "pk:crate:1"); wait_for(A, "NW.port._st.carry", 4)
            pn["walk"](A, lp["x"], lp["y"]); pn["interact_id"](A, "pk:truck")
            wait_for(A, "NW.port.truckState().leaving", 40); t0 = ev(A, "NW.port.truckState()")
            assert wait_for(A, "Math.hypot(NW.port.truckState().x-%s,NW.port.truckState().y-%s)>1.6 && !NW.port.truckState().gone" % (t0["x"], t0["y"]), 20), "mobil tak bergerak"   # tunggu sampai mobil BENAR-BENAR melaju
            shot(A, "_s4a.png", "mobil melaju setelah server mengonfirmasi"); st4 = ev(A, "JSON.stringify(NW.port.truckState())")
            wait_for(A, "!document.getElementById('pkRes').classList.contains('hidden')", 40); time.sleep(0.8)
            shot(A, "_s4b.png", "hadiah 777 = angka tiruan server tiruan"); print("s4 truck@a=", st4, "res=", ev(A, "document.getElementById('pkRes').innerText")[:110].replace("\n", " | "), flush=True)
            strip(["_s4a.png", "_s4b.png"], "fase-a-4-mobil-berangkat-hasil-server.png", ["Mobil Pak Damar berangkat", "Panel hasil dari server"])
            print("errs", eA + eB + eC, flush=True)
        finally:
            s.terminate(); b.close()
main()
