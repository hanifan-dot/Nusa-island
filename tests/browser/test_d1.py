"""Uji adapter D1: mode OFF = NOL request ke Worker; mode SHADOW (Worker ditiru lewat route) = baca-saja, tanpa polling, tanpa uid. Android 360/390 + landscape.
Tidak diuji: Worker/D1 sungguhan (belum dibind)."""
import os, sys, time, json
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_podium.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_podium.py"))}; exec(compile(src, "pd", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed, R = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"], ns["R"]
LIVE, goto_podium, OUT = ns["LIVE"], ns["goto_podium"], os.environ.get("SHOTS", "/tmp/nusa-d1/"); os.makedirs(OUT, exist_ok=True)
MOCK = "https://d1mock.test"
def page(b, mode=None, vp=(360, 740), net=None):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = "window.__demoAuto='demo-a';window.__demoLeaderboard=%s;" % json.dumps(LIVE)
    if mode: init += "window.NUSA_D1_MODE=%s;" % json.dumps(mode)
    init += "window.firebase={apps:[1],auth:()=>({currentUser:{getIdToken:async()=>'TOKEN-UJI'}})};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1')}" % json.dumps(json.dumps(seed("Budi")))
    ctx.add_init_script(init)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "%s"' % MOCK)))
    def mock(r):
        u = r.request.url; net.append((r.request.method, u, dict(r.request.headers), r.request.post_data))
        if "/d1/v1/podium/top" in u: return r.fulfill(status=200, content_type="application/json", body=json.dumps({"rows": [{"rank": 1, "name": "Budi_Nelayan", "score": 1840, "uid": "BOCOR"}, {"rank": 2, "name": "SariLaut", "score": 1522}, {"rank": 3, "name": "Dika99", "score": 1203}], "asOf": 1}))
        if "/d1/v1/sf" in u: return r.fulfill(status=200, content_type="application/json", body=json.dumps({"exists": True, "rev": 1, "state": {"sf": {"refs": [1]}, "sf2": {"p": 0}}}))
        if "/d1/v1/save" in u: return r.fulfill(status=200, content_type="application/json", headers={"etag": '"e1"'}, body=json.dumps({"exists": True, "rev": 1, "sha256": "a" * 64, "size": 5, "etag": '"e1"'}))
        return r.fulfill(status=404, content_type="application/json", body="{}")
    ctx.route(MOCK + "/**", mock)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(ns["ns"]["ROOT"] + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    return ctx, pg, errs
def d1reqs(net): return [x for x in net if "/d1/v1/" in x[1]]
def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # A. OFF (bawaan)
        netA = []; ctx, A, eA = page(b, None, net=netA)
        ok("A0 mode bawaan = off", ev(A, "NW.d1.mode==='off' && window.NUSA_D1_MODE==='off'"))
        goto_podium(A); ev(A, "NW.podium.open()"); time.sleep(1.2); ev(A, "NW.podium.load('catch',true)"); time.sleep(0.6); ev(A, "document.getElementById('lbRef')&&document.getElementById('lbRef').click()"); time.sleep(0.5)
        ok("A1 podium berfungsi (data lama)", ev(A, "NW.podium._st.data.catch.status==='live'"))
        time.sleep(3)
        ok("A2 OFF: NOL request D1 (dan nol ke Worker mock selain legacy)", len(d1reqs(netA)) == 0 and ev(A, "NW.d1.stats().calls")==0)
        ok("A3 OFF: tidak ada error halaman", not eA)
        ctx.close()
        # B. mode 'on' tidak dikenali -> off
        netB = []; ctx, B, eB = page(b, "on", net=netB); goto_podium(B); ev(B, "NW.podium.open()"); time.sleep(1.5)
        ok("B1 'on' ditolak -> off, nol request", ev(B, "NW.d1.mode")=="off" and len(d1reqs(netB)) == 0); ctx.close()
        # C. SHADOW
        netC = []; ctx, C, eC = page(b, "shadow", net=netC); time.sleep(1.5)
        ok("C0 mode shadow aktif", ev(C, "NW.d1.mode==='shadow'"))
        n0 = len(d1reqs(netC)); paths0 = sorted(set(x[1].split("/d1/v1")[1].split("?")[0] for x in d1reqs(netC)))
        ok("C1 login: hanya GET (save meta + sf), tanpa PUT", all(x[0] == "GET" for x in d1reqs(netC)) and "/save" in paths0, paths0)
        goto_podium(C); ev(C, "NW.podium.open()"); wait_for(C, "!!(NW.d1.rec.podium.catch)", 15); time.sleep(0.5)
        pod = [x for x in d1reqs(netC) if "/podium/top" in x[1]]
        ok("C2 Podium dibuka -> tepat 1 GET /podium/top", len(pod) == 1 and "board=catch" in pod[0][1], [x[1] for x in d1reqs(netC)])
        ok("C3 header hanya Bearer, tanpa uid/skor di URL/body", all(x[2].get("authorization") == "Bearer TOKEN-UJI" and x[3] is None and "uid" not in x[1] for x in d1reqs(netC)))
        ok("C4 respons uid dibuang; UI tetap dari sistem lama", ev(C, "JSON.stringify(NW.d1.rec)").find("BOCOR") < 0 and ev(C, "NW.podium._st.data.catch.status==='live'"))
        ok("C5 perbandingan tercatat", ev(C, "NW.d1.rec.podium.catch && NW.d1.rec.podium.catch.ok===true"))
        ev(C, "document.getElementById('lbRef')&&document.getElementById('lbRef').click()"); time.sleep(0.8)
        ok("C6 Muat Ulang < 60 dtk -> D1 pakai cache (tetap 1 request podium)", len([x for x in d1reqs(netC) if "/podium/top" in x[1]]) == 1)
        n1 = len(d1reqs(netC)); time.sleep(25)
        ok("C7 tanpa polling 25 dtk (podium dekat + SF)", len(d1reqs(netC)) == n1, (n1, len(d1reqs(netC))))
        ok("C8 tanpa PUT/rollback", not any(x[0] in ("PUT", "POST") for x in d1reqs(netC)))
        ok("C9 tidak ada error halaman", not eC, eC)
        for vp, nm in (((360, 740), "360"), ((390, 844), "390"), ((844, 390), "land")):
            ctx2, P, e2 = page(b, "shadow", vp=vp, net=[]); goto_podium(P); ev(P, "NW.podium.open()"); time.sleep(1.2)
            ok("D-%s podium tampil & tanpa overflow" % nm, ev(P, "(()=>{const o=document.getElementById('lbOv');const r=o.getBoundingClientRect();return !!o && r.width<=innerWidth+1 && document.documentElement.scrollWidth<=innerWidth+1})()"))
            P.screenshot(path=OUT + "d1-podium-%s.png" % nm); ctx2.close()
        ctx.close(); b.close()
    bad = [x for x in R if x.startswith("FAIL")]; print("D1 browser:", len(R) - len(bad), "PASS /", len(bad), "FAIL"); sys.exit(1 if bad else 0)
main()
