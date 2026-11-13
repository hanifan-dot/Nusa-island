"""Uji PR-A2: Pengiriman Segar (adapter ecoDamar*, gerbang server pakDamar) + UI Kemudi Kapal. Server ditiru lewat route Playwright mengikuti kontrak Worker 01 (backend PR #59 / game PR #130).
Tidak diuji: Worker/Firestore nyata, kapal rombongan (belum ada protokol), Pelabuhan Kota (PR-A3)."""
import os, sys, time, json
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, "test_podium.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.join(here, "test_podium.py")}; exec(compile(src, "pd", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"]; R = ns["R"]; ROOT = ns["ns"]["ROOT"]
OUT = os.environ.get("SHOTS", "/tmp/nusa-delivery/"); os.makedirs(OUT, exist_ok=True)
MOCK = "https://api.mock.test"
class Srv:
    def __init__(s, flag): s.flag = flag; s.calls = []; s.boxes = [[], []]; s.ops = {}; s.box = ["i%d" % k for k in range(7)]; s.fishw = {"i%d" % k: 1.0 + k * 0.5 for k in range(8)}
    def view(s): return {"need": 6, "per": 3, "delivered": 0, "paid": False, "reward": None, "preview": {"base": 900, "freshBonus": 300}, "freshMs": 1200000, "minTripMs": 45000,
        "boxes": [{"st": "idle", "n": len(b), "fish": [{"u": u, "id": "nila", "w": s.fishw[u]} for u in b], "freshLeftMs": 1000, "sailMs": 0} for b in s.boxes]}
    def eco(s): return {"init": True, "own": 50, "balance": 50, "up": {}, "box": list(s.box), "damar": s.view()}
    def handle(s, name, body):
        s.calls.append((name, body))
        if name == "gameFlags": return 200, {"result": {"leaderboard": False, "socialHome": False, "pakDamar": s.flag, "kapalRombongan": False}}
        if name.startswith("ecoDamar") and not s.flag: return 404, {"error": {"status": "not_found", "message": "Fungsi tidak dikenal."}}
        if name == "ecoDamarState": return 200, {"result": s.eco()}
        op = body.get("opId")
        if op in s.ops: return 200, {"result": dict(s.ops[op], duplicate=True)}
        if name == "ecoDamarLoad":
            us, b = body.get("uids", []), body.get("box")
            if b not in (0, 1) or not (1 <= len(us) <= 3) or any(u not in s.box for u in us) or len(s.boxes[b]) + len(us) > 3: return 409, {"error": {"status": "failed-precondition", "message": "Ikan tidak ada di inventaris server."}}
            s.boxes[b] += us; s.box = [u for u in s.box if u not in us]
        elif name == "ecoDamarUnload":
            b = body.get("box"); s.box += s.boxes[b]; s.boxes[b] = []
        else: return 404, {"error": {"status": "not_found"}}
        r = s.eco(); s.ops[op] = r; return 200, {"result": r}
def page(b, flag, srv=None, vp=(360, 740), kemudi=False, delivery=True, reqs=None):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    sd = seed("Budi"); sd["cooler"] = [{"uid": "i%d" % k, "id": "nila", "w": 1.0 + k * 0.5, "t": 1} for k in range(8)]; sd["cooler"][7]["lock"] = True
    init = "window.__demoAuto='demo-a';" + ("window.NUSA_DELIVERY=true;" if delivery else "") + ("window.NUSA_KEMUDI=true;" if kemudi else "")
    # atribusi pemanggil: setiap NusaApi.call("gameFlags") dicatat beserta stack-nya (window.__gf) agar uji tahu SIAPA yang memanggil, bukan hanya bahwa ada panggilan
    init += "(()=>{let a;Object.defineProperty(window,'NusaApi',{configurable:true,get(){return a},set(v){a=v;if(v&&typeof v.call==='function'&&!v.__w){const f=v.call;v.call=function(n){if(n==='gameFlags'){(window.__gf=window.__gf||[]).push(String(new Error().stack))}return f.apply(this,arguments)};v.__w=1}}})})();"
    init += "window.firebase={apps:[1],auth:()=>({currentUser:{getIdToken:async()=>'TOKEN-UJI'}})};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1')}" % json.dumps(json.dumps(sd))
    ctx.add_init_script(init)
    cfg = open(os.path.join(here, "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "%s"' % MOCK)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
    def mock(r):
        u = r.request.url; name = u.split("/fn/")[1] if "/fn/" in u else ""
        if reqs is not None: reqs.append(name)
        body = {}
        try: body = (json.loads(r.request.post_data or "{}") or {}).get("data", {})
        except Exception: pass
        if srv and name in ("gameFlags", "ecoDamarState", "ecoDamarLoad", "ecoDamarUnload", "ecoDamarSail", "ecoDamarAbort", "ecoDamarDeliver"):
            code, js = srv.handle(name, body); return r.fulfill(status=code, content_type="application/json", body=json.dumps(js))
        return r.fulfill(status=404, content_type="application/json", body=json.dumps({"error": {"status": "not_found"}}))
    ctx.route(MOCK + "/**", mock)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    if reqs is not None: pg.on("request", lambda r: reqs.append("URL:" + r.url) if ("delivery/" in r.url or "kemudi/" in r.url) else None)
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    return ctx, pg, errs
def fill(pg):
    for k in range(3): pg.click(".dl-bag .dl-fish"); pg.click(".dl-box[data-box='0'] h4")
    for k in range(3): pg.click(".dl-bag .dl-fish"); pg.click(".dl-box[data-box='1'] h4")
def to_station(pg):
    ev(pg, "(()=>{const p=NW.world.player;const t=NW.MUARA_MAP.points.find(p=>p.id==='delivery');p.x=t.x;p.y=t.y;NW.world.snapCamera&&NW.world.snapCamera()})()"); time.sleep(0.8)
def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # A. flag OFF: tidak diunduh
        rq = []; ctx, A, eA = page(b, False, Srv(True), delivery=False, reqs=rq); time.sleep(1.5)
        # Rumahku (house/social.js) memang memanggil gameFlags sendiri (saklar socialHome) ±4 dtk setelah load. Tunggu panggilan itu (berbasis kejadian, bukan waktu) agar hasil tak bergantung beban mesin.
        wait_for(A, "(window.__gf||[]).length>0", 12)
        ok("A1 NUSA_DELIVERY/KEMUDI off: tidak ada unduhan delivery/ atau kemudi/", not [u for u in rq if u.startswith("URL:")], [u for u in rq if u.startswith("URL:")])
        ok("A2 off: dunia lama (tanpa NW.delivery/NW.kemudi/titik)", ev(A, "!NW.delivery && !NW.kemudi && !NW.MUARA_MAP.points.some(p=>p.id==='delivery')"))
        gf = ev(A, "window.__gf||[]")
        ok("A3 off: nol panggilan ecoDamar*, dan tak ada pemanggil gameFlags dari delivery/ atau kemudi/ (satu-satunya pemanggil = Rumahku)", not [x for x in rq if x.startswith("ecoDamar")] and gf and not any(("delivery/" in g or "kemudi/" in g or "rombongan/" in g) for g in gf) and all("house/social.js" in g for g in gf), gf[:1])
        ok("A4 off: tanpa error", not eA, eA); ctx.close()
        # B. modul dimuat tetapi SERVER OFF → tidak ada akses
        srv = Srv(False); rq = []; ctx, B, eB = page(b, True, srv, reqs=rq)
        for _ in range(100):
            if srv.calls: break
            B.wait_for_timeout(200)
        B.wait_for_timeout(500)
        ok("B1 modul diunduh, gameFlags dibaca server", any(c[0] == "gameFlags" for c in srv.calls) and ev(B, "!!NW.delivery"), [srv.calls, ev(B, "typeof NW.delivery")])
        ok("B2 server pakDamar=false: tanpa meja/titik, tidak bisa dibuka", ev(B, "NW.delivery.serverOn===false && !NW.MUARA_MAP.points.some(p=>p.id==='delivery') && !NW.MUARA_MAP.objects.some(o=>o.kind==='delivery')"))
        ev(B, "NW.delivery.open()"); time.sleep(0.3)
        ok("B3 open() tanpa server aktif: tak membuka panel & nol ecoDamar*", not ev(B, "NW.delivery.isOpen") and not [c for c in srv.calls if c[0].startswith("ecoDamar")], srv.calls)
        ok("B4 tanpa error", not eB, eB); ctx.close()
        # C. server ON
        srv = Srv(True); rq = []; ctx, C, eC = page(b, True, srv, reqs=rq); wait_for(C, "NW.delivery && NW.delivery.serverOn", 15); time.sleep(0.5)
        ok("C1 server pakDamar=true: meja + objek + titik terpasang", ev(C, "NW.MUARA_MAP.points.some(p=>p.id==='delivery') && NW.MUARA_MAP.objects.some(o=>o.kind==='delivery')"))
        wait_for(C, "(window.__gf||[]).length>=2", 14); C.wait_for_timeout(1500); n0 = len([c for c in srv.calls if c[0] == "gameFlags"]); C.wait_for_timeout(10000)
        ok("C2 gameFlags: tidak ada polling (jumlah stabil setelah awal; ≤2 termasuk modul Rumahku lama)", len([c for c in srv.calls if c[0] == "gameFlags"]) == n0 and n0 <= 2, n0)
        to_station(C); ok("C3 meja di tanah yang bisa dijalani", ev(C, "(()=>{const t=NW.MUARA_MAP.points.find(p=>p.id==='delivery');return NW.walkable(t.x,t.y)})()"))
        C.screenshot(path=OUT + "meja-muara.png")
        ev(C, "NW.delivery.open()"); wait_for(C, "document.querySelectorAll('.dl-bag .dl-fish').length>0", 8); time.sleep(0.3)
        ok("C4 buka panel: satu ecoDamarState; Tas = 7 ikan (terkunci tidak ditawarkan)", len([c for c in srv.calls if c[0] == "ecoDamarState"]) == 1 and ev(C, "document.querySelectorAll('.dl-bag .dl-fish').length===7"))
        fill(C)
        ok("C5 Muat nonaktif sebelum 6 ikan -> aktif setelah 6", ev(C, "!document.getElementById('dlSend').disabled"))
        C.screenshot(path=OUT + "panel-360.png"); C.click("#dlSend"); wait_for(C, "document.querySelector('.dl-un')", 8); time.sleep(0.3)
        loads = [c for c in srv.calls if c[0] == "ecoDamarLoad"]
        ok("C6 dua ecoDamarLoad {opId, box, uids×3}; tanpa uid pemain/hadiah/koin", len(loads) == 2 and all(sorted(c[1]) == ["box", "opId", "uids"] and len(c[1]["uids"]) == 3 for c in loads) and loads[0][1]["opId"] != loads[1][1]["opId"] and not any(k in json.dumps(loads).lower() for k in ["coin", "money", "reward", "token", "\"uid\""]), loads)
        ok("C7 tampilan kotak dari SERVER (2 kotak 3/3)", ev(C, "Nusa.S&&NW.delivery._st.view.boxes.every(b=>b.n===3)") and "berlayar" not in ev(C, "document.getElementById('dlBody').innerText"))
        ok("C8 Tas lokal berkurang 6 (ikan kini di kotak); koin tidak diubah klien", ev(C, "Nusa.S.cooler.length===2 && Nusa.S.money===50"))
        ev(C, "NW.delivery.close()")
        ok("C9 cargoView server: dua kotak tampak fisik (cargoVisible)", ev(C, "NW.delivery.cargoView().boxes.map(b=>b.n>0).join()==='true,true'"))
        # kapal: naik, kotak terlihat
        ev(C, "(()=>{const ar=NW.areas.cur;const m=NW.boat.moorById(ar,NW.boat.B.moor);const p=NW.world.player;p.x=m.board.x;p.y=m.board.y;NW.boat.board();NW.world.snapCamera&&NW.world.snapCamera()})()"); time.sleep(1.2)
        ok("C10 di atas kapal", ev(C, "NW.boat.on"))
        C.screenshot(path=OUT + "kapal-kotak.png")
        # bongkar
        ev(C, "NW.delivery.open()"); time.sleep(0.5); C.click("[data-un='0']"); wait_for(C, "NW.delivery._st.view.boxes[0].n===0", 8); time.sleep(0.2)
        ok("C11 Bongkar: ecoDamarUnload {opId, box}; ikan kembali ke Tas", [c for c in srv.calls if c[0] == "ecoDamarUnload"][0][1].keys() == {"opId": 1, "box": 1}.keys() and ev(C, "Nusa.S.cooler.length===5"))
        ok("C12 tanpa error", not eC, eC); ctx.close()
        # D. server menolak: ikan aman
        srv = Srv(True); srv.box = []; ctx, D, eD = page(b, True, srv); wait_for(D, "NW.delivery && NW.delivery.serverOn", 15); to_station(D); ev(D, "NW.delivery.open()"); wait_for(D, "document.querySelectorAll('.dl-bag').length>0", 8); time.sleep(0.3)
        fill(D); D.click("#dlSend"); time.sleep(1.2)
        ok("D1 server menolak (409): pesan server, Tas lokal utuh, tidak ada kotak palsu", ev(D, "Nusa.S.cooler.length===8 && NW.delivery._st.view.boxes.every(b=>b.n===0)"), ev(D, "document.getElementById('dlMsg').textContent")); ctx.close()
        # E. KEMUDI
        ctx, E, eE = page(b, True, None, kemudi=True, delivery=False); time.sleep(1)
        ok("E1 flag KEMUDI: modul dimuat; UI kemudi tersembunyi saat jalan kaki", ev(E, "!!NW.kemudi && !NW.kemudi.on && getComputedStyle(document.getElementById('joy')).display!=='none'"))
        ev(E, "(()=>{const ar=NW.areas.cur;const m=NW.boat.moorById(ar,NW.boat.B.moor);const p=NW.world.player;p.x=m.board.x;p.y=m.board.y;NW.boat.board();NW.world.snapCamera&&NW.world.snapCamera()})()"); time.sleep(1)
        ok("E2 naik kapal: kemudi tampil, joystick + kolom tombol lama tersembunyi", ev(E, "NW.kemudi.on && !document.getElementById('kmRoot').classList.contains('hidden') && getComputedStyle(document.getElementById('joy')).display==='none' && getComputedStyle(document.getElementById('seaBar')).display==='none'"))
        ok("E3 elemen: setir, MAJU/NETRAL/MUNDUR, knot, arah, jangkar, Peta Laut, tujuan, muatan", ev(E, "['kmWheel','kmLever','kmKnot','kmHead','kmAnchor','kmMap','kmDest','kmCargo'].every(i=>document.getElementById(i)) && document.querySelectorAll('#kmLever button').length===3 && /Tujuan:/.test(kmDest.textContent) && /Muatan:/.test(kmCargo.textContent)"))
        E.screenshot(path=OUT + "kemudi-360.png")
        E.click("#kmLever [data-g='MAJU']"); time.sleep(1.5)
        ok("E4 MAJU: kapal melaju & knot naik", ev(E, "NW.boat.speed>20 && /^[1-9]/.test(document.getElementById('kmKnot').textContent)"), ev(E, "NW.boat.speed"))
        a0 = ev(E, "NW.boat.B.a"); box = E.locator("#kmWheel").bounding_box(); cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        E.mouse.move(cx, cy - 30); E.mouse.down(); E.mouse.move(cx + 40, cy - 5, steps=5); time.sleep(0.8)
        ok("E5 setir diputar kanan: kapal berbelok", abs(ev(E, "NW.boat.B.a") - a0) > 0.05 and ev(E, "NW.kemudi._st.deg") > 20, [a0, ev(E, "NW.boat.B.a")])
        E.mouse.up(); time.sleep(1.6)
        ok("E6 lepas: setir kembali ke tengah", abs(ev(E, "NW.kemudi._st.deg")) < 1)
        E.click("#kmLever [data-g='NETRAL']"); E.click("#kmAnchor"); time.sleep(0.4)
        ok("E7 jangkar: tuas kembali NETRAL & jangkar terpasang", ev(E, "NW.boat.anchor===true && NW.kemudi._st.gear==='NETRAL'"))
        E.click("#kmMap"); time.sleep(0.5); ok("E8 Peta Laut terbuka", ev(E, "Nusa.currentPanel&&Nusa.currentPanel()==='seamap'")); ev(E, "Nusa.closePanel&&Nusa.closePanel()")
        # turun
        ev(E, "(()=>{const m=NW.boat.nearMoor();if(m)NW.boat.startDock(m);else{const ar=NW.areas.cur;NW.boat.startDock(NW.boat.moorById(ar,'dermaga')||NW.boat.mainMoor(ar))}})()"); time.sleep(2)
        ok("E9 turun: UI berjalan kembali (joystick tampil, kemudi hilang)", ev(E, "!NW.boat.on && !NW.kemudi.on && getComputedStyle(document.getElementById('joy')).display!=='none' && document.getElementById('kmRoot').classList.contains('hidden')"))
        ok("E10 tanpa error", not eE, eE); ctx.close()
        # F. ukuran layar (kemudi di atas kapal + panel pengiriman)
        for vp, nm in (((360, 740), "360x740"), ((412, 915), "412x915"), ((740, 360), "740x360"), ((1280, 800), "desktop")):
            srvf = Srv(True); ctx, F, e = page(b, True, srvf, vp=vp, kemudi=True); wait_for(F, "NW.delivery && NW.delivery.serverOn", 15); to_station(F); ev(F, "NW.delivery.open()"); wait_for(F, "document.querySelectorAll('.dl-bag .dl-fish').length>0", 8)
            for k in range(3): F.click(".dl-bag .dl-fish"); F.click(".dl-box[data-box='0'] h4")
            g1 = ev(F, "(()=>{const c=document.querySelector('.dl-card').getBoundingClientRect();const bt=document.getElementById('dlSend').getBoundingClientRect();return {w:c.width<=innerWidth+1,btn:bt.width>=40&&bt.height>=36,ov:document.documentElement.scrollWidth<=innerWidth+1}})()")
            F.screenshot(path=OUT + "panel-%s.png" % nm); ev(F, "NW.delivery.close()")
            ev(F, "(()=>{const ar=NW.areas.cur;const m=NW.boat.moorById(ar,NW.boat.B.moor);const p=NW.world.player;p.x=m.board.x;p.y=m.board.y;NW.boat.board();NW.world.snapCamera&&NW.world.snapCamera()})()"); time.sleep(1)
            g2 = ev(F, "(()=>{const r=(id)=>document.getElementById(id).getBoundingClientRect();const ids=['kmTop','kmWheel','kmLever'];const bs=ids.map(r);const inside=bs.every(b=>b.left>=-1&&b.right<=innerWidth+1&&b.top>=-1&&b.bottom<=innerHeight+1);const ov=(a,b)=>!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);const btns=[...document.querySelectorAll('.km-btns button')].map(x=>x.getBoundingClientRect());let hit=false;for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++)if(ov(bs[i],bs[j]))hit=true;for(const bb of btns)for(const q of bs.slice(1))if(ov(bb,q))hit=true;const act=document.getElementById('actBtn').getBoundingClientRect();if(!document.getElementById('actBtn').classList.contains('hidden')&&ov(act,bs[2]))hit=true;return {inside,hit,tap:btns.every(b=>b.width>=40&&b.height>=40)}})()")
            ok("F-%s panel muat & kemudi di layar, tidak tumpang tindih, target sentuh ≥40px" % nm, all(g1.values()) and g2["inside"] and not g2["hit"] and g2["tap"], [g1, g2]); F.screenshot(path=OUT + "kemudi-%s.png" % nm); ctx.close()
        b.close()
    bad = [x for x in R if x.startswith("FAIL")]; print("delivery+kemudi:", len(R) - len(bad), "PASS /", len(bad), "FAIL"); sys.exit(1 if bad else 0)
main()
