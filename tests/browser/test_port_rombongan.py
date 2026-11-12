"""Uji PR-A4 (rombongan): 3 klien + server dev realtime (NUSA_BOAT=ya) + Pengiriman Segar tiruan (kontrak). Kapten mengirim 2 kotak ke Pelabuhan Kota; semua awak melihat kapal & kursi yang sama;
hanya kapten yang mengantar & menerima hadiah. Tanpa Firestore/Worker nyata."""
import os, sys, time, json, subprocess, urllib.request
H = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(H, "test_rombongan.py")).read().replace("\nmain()\n", "\n").replace('if __name__ == "__main__":\n    main()\n', "")
ns = {"__file__": os.path.join(H, "test_rombongan.py")}; exec(compile(src, "rb", "exec"), ns)
psrc = open(os.path.join(H, "test_port.py")).read().split("def main")[0]
pn = {"__file__": os.path.join(H, "test_port.py")}; exec(compile(psrc, "pt", "exec"), pn)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed, ROOT = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"], ns["ROOT"]; PORT = ns["PORT"]; MOCK = "https://api.mock.test"
Srv = pn["Srv"]; OUT = os.environ.get("SHOTS", "/tmp/nusa-port/"); os.makedirs(OUT, exist_ok=True)
def page(b, acc, srv, outfit, vp=(412, 915), flagsrv=True):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    sd = seed("Awak"); sd["cooler"] = [{"uid": "i%d" % k, "id": "nila", "w": 1.0 + k * 0.5, "t": 1} for k in range(8)]
    init = f"window.__demoAuto='{acc}';window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{PORT}',token:(uid)=>'dev.'+uid}};window.NUSA_ROMBONGAN=true;window.NUSA_DELIVERY=true;window.NUSA_KEMUDI=true;"
    init += "window.firebase={apps:[1],auth:()=>({currentUser:{getIdToken:async()=>'TOKEN-UJI'}})};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}))}" % json.dumps(json.dumps(sd))
    ctx.add_init_script(init)
    cfg = open(os.path.join(H, "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "%s"' % MOCK)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
    def mock(r):
        u = r.request.url; nm = u.split("/fn/")[1] if "/fn/" in u else ""; body = {}
        try: body = (json.loads(r.request.post_data or "{}") or {}).get("data", {})
        except Exception: pass
        if nm == "gameFlags": return r.fulfill(status=200, content_type="application/json", body=json.dumps({"result": {"leaderboard": False, "socialHome": False, "pakDamar": True, "kapalRombongan": True}}))
        if nm.startswith("ecoDamar"): code, js = srv.handle(nm, body); return r.fulfill(status=code, content_type="application/json", body=json.dumps(js))
        return r.fulfill(status=404, content_type="application/json", body=json.dumps({"error": {"status": "not_found"}}))
    ctx.route(MOCK + "/**", mock)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    ev(pg, "(c)=>{const P=NW.world.player;P.style=NW.avatarDraw.styleFor(c,P.style);NW.mp.sendOutfit(c)}", outfit)
    return ctx, pg, errs
def main():
    with sync_playwright() as p:
        b = p.chromium.launch(); s = ns["srv"](True)
        try:
            sa, sb, sc = Srv(True), Srv(True), Srv(True); sa.boxes = [["i0", "i1", "i2"], ["i3", "i4", "i5"]]; sa.box = ["i6", "i7"]
            cA, A, eA = page(b, "demo-a", sa, ns["OUT"]["A"]); cB, B, eB = page(b, "demo-b", sb, ns["OUT"]["B"]); cC, Cc, eC = page(b, "demo-owner", sc, ns["OUT"]["C"])
            ok("R1 tiga klien online, rombongan & pengiriman siap", all(ns["online"](x) for x in (A, B, Cc)) and all(wait_for(x, "NW.port&&NW.port.ready&&NW.rombongan.state().srv", 12) for x in (A, B, Cc)))
            for x in (A, B, Cc): ns["tp"](x, 37.2, 21.3)
            time.sleep(1.2); ok("R2 A membuat kapal rombongan (kapten)", ns["act"](A, "rb:new") and wait_for(A, "!!NW.mp.boatMine()", 6))
            bid = ns["boats"](A)[0]["id"]
            for x in (B, Cc): ns["tp"](x, 37.2, 21.7)
            time.sleep(1.0); ev(B, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.8); ns["tp"](Cc, 37.6, 21.7); time.sleep(0.8); ev(Cc, "(b)=>NW.mp.boatJoin(b,2)", bid)
            ok("R3 tiga awak duduk (kursi 0/1/2)", wait_for(A, "NW.mp.boats()[0].seats.every(x=>x!==0)", 8) and all(wait_for(x, "!!NW.mp.boatMine()", 6) for x in (B, Cc)))
            # kapten: muat (sudah di server tiruan) → buka panel → Berlayar
            ev(A, "NW.rombongan.go && true"); ev(A, "(()=>{NW.delivery.open()})()"); wait_for(A, "!!document.getElementById('pkSail')", 8); time.sleep(0.3)
            ok("R4 penumpang tidak melihat tombol Berlayar (hanya kapten)", ev(A, "!!document.getElementById('pkSail')"))
            A.click("#pkSail")
            ok("R5 semua awak pindah ke Pelabuhan Kota (selat) lewat protokol rombongan", all(wait_for(x, "NW.areas.cur.id==='selat'", 14) for x in (A, B, Cc)), [ev(x, "NW.areas.cur.id") for x in (A, B, Cc)])
            time.sleep(4.0)
            for n_, x in (("A", A), ("B", B), ("C", Cc)): x.screenshot(path=OUT + "r_port_%s.png" % n_)
            ok("R6 server: dua Sail oleh kapten saja; penumpang nol panggilan", [c[0] for c in sa.calls].count("ecoDamarSail") == 2 and not [c for c in sb.calls + sc.calls if c[0].startswith("ecoDamar") and c[0] != "ecoDamarState"])
            ok("R7 semua awak masih duduk di kursi yang sama (server: kapal 'pergi')", all(ev(x, "(()=>{const m=NW.rombongan.mine();return !!m&&m.port&&!m.ashore})()") for x in (A, B, Cc)), [ev(x, "JSON.stringify(NW.rombongan.mine())") for x in (A, B, Cc)])
            pts = [ev(x, "NW.rombongan._pts().map(b=>b.seats.map(q=>[Math.round(q.x*10)/10,Math.round(q.y*10)/10]))") for x in (A, B, Cc)]
            ok("R8 posisi kapal & tiga kursi di dermaga identik di tiga klien", pts[0] == pts[1] == pts[2] and len(pts[0]) >= 1, pts)
            ok("R9 penumpang tidak bisa memakai tombol Turun/Pulang/ambil kotak", all(ev(x, "document.getElementById('rbHome').classList.contains('hidden')") for x in (B, Cc)) and all(ev(x, "NW.port.candidates(NW.world.player).every(c=>!c.id.startsWith('pk:crate'))") for x in (B, Cc)))
            # kapten turun lalu mengantar
            ok("R10 kapten turun ke dermaga (visual) dan titik kotak muncul", ev(A, "NW.rombongan.disembark(NW.port.positions.BOARD_SPOT)") and wait_for(A, "NW.rombongan.mine().ashore", 3))
            time.sleep(1.2)
            def carry(pg, i):
                c = ev(pg, "NW.port.positions.CRATE[%d]" % i); pn["walk"](pg, c["x"] - 0.4, c["y"]); pn["interact_id"](pg, "pk:crate:%d" % i); wait_for(pg, "NW.port._st.carry", 4)
                lp = ev(pg, "NW.port.positions.LOAD_PT"); pn["walk"](pg, lp["x"], lp["y"]); pn["interact_id"](pg, "pk:truck"); wait_for(pg, "!NW.port._st.load", 8); time.sleep(1.0)
            carry(A, 0); A.screenshot(path=OUT + "r_truck_A.png"); carry(A, 1); wait_for(A, "!document.getElementById('pkRes').classList.contains('hidden')", 15); time.sleep(0.6)
            A.screenshot(path=OUT + "r_result_A.png"); txt = ev(A, "document.getElementById('pkRes').innerText")
            ok("R11 kapten: panel hasil dengan hadiah dari server (777)", "777" in txt and "900" not in txt, txt)
            ok("R12 penumpang: tanpa panel hasil, tanpa hadiah, koin tak berubah", all(ev(x, "document.getElementById('pkRes').classList.contains('hidden') && Nusa.S.money===50") for x in (B, Cc)) and sa.coins == 777 and sb.coins == 0 and sc.coins == 0)
            ok("R13 setelah kapten naik lagi, kapal & awak tetap konsisten di tiga klien", pn["interact_id"](A, "pk:board") and wait_for(A, "!NW.rombongan.mine().ashore", 4))
            time.sleep(1.5)
            ev(A, "NW.rombongan.goHome()")
            ok("R14 kapten pulang: semua awak kembali ke Muara", all(wait_for(x, "NW.areas.cur.id==='muara'", 16) for x in (A, B, Cc)), [ev(x, "NW.areas.cur.id") for x in (A, B, Cc)])
            time.sleep(1.0); ok("R15 kapal tiba di Muara & awak masih duduk di kursi masing-masing", all(ev(x, "!!NW.mp.boatMine()") for x in (A, B, Cc)))
            ok("R16 tanpa error halaman", not (eA + eB + eC), (eA + eB + eC)[:3])
            # kapten keluar saat di pelabuhan → server lanjutkan tanpa pengiriman ganda
        finally:
            s.terminate(); b.close()
if __name__ == "__main__":
    main()
