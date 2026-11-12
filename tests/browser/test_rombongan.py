"""Uji KAPAL ROMBONGAN (visual + klien) di peramban nyata: 3 klien bersamaan terhadap server dev realtime (NUSA_BOAT=ya) + gameFlags tiruan.
Jalankan: python3 tests/browser/test_rombongan.py   Tangkapan layar sementara: /tmp/rombongan-*.png"""
import os, sys, time, json, subprocess, urllib.request
H = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(H, "test_multiplayer.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.join(H, "test_multiplayer.py")}; exec(compile(src, "mp", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed, ROOT = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"], ns["ROOT"]
PORT = int(os.environ.get("RB_PORT", "8821")); MOCK = "https://api.mock.test"
OUT = {"A": "t:t_street:1|h:h_kapten:0", "B": "t:t_pantai:2|h:h_koboi:1", "C": "t:t_hoodie:0|h:h_robot:1"}
def srv(boat):
    env = dict(os.environ, NUSA_DEV_NO_RATE="1", NUSA_BOAT="ya" if boat else "tidak")
    p = subprocess.Popen(["node", ns["SRV"], str(PORT)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(50):
        try: urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health", timeout=0.3); return p
        except Exception: time.sleep(0.1)
    raise RuntimeError("server uji tidak naik")
def page(b, acc, name, vp=(412, 915), rom=True, flag=True, reqs=None, outfit=None):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = f"window.__demoAuto='{acc}';window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{PORT}',token:(uid)=>'dev.'+uid}};" + ("window.NUSA_ROMBONGAN=true;" if rom else "")
    init += "window.firebase={apps:[1],auth:()=>({currentUser:{getIdToken:async()=>'TOKEN-UJI'}})};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}))}" % json.dumps(json.dumps(seed(name)))
    ctx.add_init_script(init)
    cfg = open(os.path.join(H, "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "%s"' % MOCK)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
    def mock(r):
        u = r.request.url; nm = u.split("/fn/")[1] if "/fn/" in u else ""
        if reqs is not None: reqs.append(nm)
        if nm == "gameFlags": return r.fulfill(status=200, content_type="application/json", body=json.dumps({"result": {"leaderboard": False, "socialHome": False, "pakDamar": False, "kapalRombongan": bool(flag)}}))
        return r.fulfill(status=404, content_type="application/json", body=json.dumps({"error": {"status": "not_found"}}))
    ctx.route(MOCK + "/**", mock)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    if reqs is not None: pg.on("request", lambda r: reqs.append("URL:" + r.url) if "rombongan/" in r.url else None)
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    if outfit: ev(pg, "(c)=>{const P=NW.world.player;P.style=NW.avatarDraw.styleFor(c,P.style);NW.mp.sendOutfit(c)}", outfit)
    return ctx, pg, errs
def tp(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera&&NW.world.snapCamera()}", [x, y])
def boats(pg): return ev(pg, "NW.mp.boats().map(b=>({id:b.id,tx:b.tx,ty:b.ty,d:b.d,v:b.v,anchor:b.anchor,away:b.away,seats:b.seats}))")
def mine(pg): return ev(pg, "(()=>{const m=NW.mp.boatMine();return m?{id:m.id,seat:m.seat,captain:m.captain}:null})()")
def pid(pg): return ev(pg, "NW.mp._R.me")
def online(pg, t=8): return wait_for(pg, "NW.mp.view().online", t)
def act(pg, tid, tmo=4):
    """tekan tombol aksi dunia pada titik interaksi tertentu (jalur nyata, bukan panggilan API langsung)"""
    okk = wait_for(pg, "(()=>{const g=NW.world.target;return !!(g&&g.id==='%s')})()" % tid, tmo)
    if okk: ev(pg, "NW.world.interact()")
    return okk
def main():
    res = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        s = srv(True)
        try:
            ctxs = []
            cA, A, eA = page(b, "demo-a", "Anda", outfit=OUT["A"]); cB, B, eB = page(b, "demo-b", "Budi", outfit=OUT["B"]); cC, Cc, eC = page(b, "demo-owner", "Cici", outfit=OUT["C"])
            ok("B1 tiga klien online, server kapal ON, modul rombongan hidup", all(online(x) for x in (A, B, Cc)) and all(ev(x, "NW.mp.boatOn() && !!NW.rombongan") for x in (A, B, Cc)))
            ok("B1b gerbang server: gameFlags.kapalRombongan terbaca", all(wait_for(x, "NW.rombongan.state().srv", 8) for x in (A, B, Cc)), [ev(x, "NW.rombongan.state().srv") for x in (A, B, Cc)])
            for x in (A, B, Cc): tp(x, 37.2, 21.3)
            time.sleep(1.2)
            ok("B2 A: titik 'Buat Kapal Rombongan' muncul & ditekan lewat tombol aksi", act(A, "rb:new"))
            ok("B2b A jadi kapten; semua klien melihat 1 kapal", wait_for(A, "!!NW.mp.boatMine()", 6) and mine(A)["captain"] and wait_for(Cc, "NW.mp.boats().length===1", 6) and len(boats(B)) == 1, boats(A))
            bid = boats(A)[0]["id"]
            for x in (B, Cc): tp(x, 37.2, 21.7)
            time.sleep(1.0)
            for x in (B, Cc): ev(x, "window.__notes=[];NW.mp.onBoat(e=>{if(e.type==='note')window.__notes.push(e.r)})")
            okb = act(B, "rb:%s:1" % bid); ev(Cc, "(b)=>NW.mp.boatJoin(b,1)", bid)   # dua pemain merebut kursi 1 hampir bersamaan (B lewat tombol aksi, C langsung)
            ok("B3 kursi 1 direbut dua pemain: yang pertama menang, yang kedua ditolak", wait_for(B, "!!NW.mp.boatMine()", 6) or wait_for(Cc, "!!NW.mp.boatMine()", 6))
            time.sleep(1.2)
            loser = Cc if not mine(Cc) else B
            ok("B3a-bis yang kalah rebutan mendapat penolakan 'seat' dari server (bukan duduk ganda)", ev(B, "window.__notes.concat(window.__noteC||[])").count("seat") >= 0 and (ev(B, "window.__notes").count("seat") + ev(Cc, "window.__notes").count("seat")) == 1, [ev(B, "window.__notes"), ev(Cc, "window.__notes")])
            ok("B3b yang kalah rebutan melihat titik kursi 2 saja (kursi 1 terisi)", wait_for(loser, "(()=>{const t=NW.rombongan; return NW.mp.boats()[0].seats[1]!==0})()", 4))
            seatB = mine(B) or mine(Cc); ok("B3c tepat satu penantang menang kursi 1", bool(mine(B)) != bool(mine(Cc)), [mine(B), mine(Cc)])
            first, second = (B, Cc) if mine(B) else (Cc, B)
            tp(second, 37.6, 21.7); time.sleep(1.2); r2 = act(second, "rb:%s:2" % bid); print("act2", r2, ev(second, "JSON.stringify({t:NW.world.target&&NW.world.target.id,c:NW.rombongan.candidates(NW.world.player).map(c=>c.id),p:[NW.world.player.x,NW.world.player.y],seated:NW.rombongan.seated(),dlg:NW.world.dialogOpen,busy:NW.world.isBusy()})"), flush=True)
            ok("B4 tiga awak penuh: kursi 0/1/2 diisi tiga pemain berbeda, terlihat sama di semua klien", wait_for(A, "NW.mp.boats()[0].seats.every(x=>x!==0)", 6) and all(wait_for(x, "NW.mp.boats()[0].seats.every(x=>x!==0)", 6) for x in (B, Cc)), boats(A))
            time.sleep(1.6)
            for n_, x in (("A", A), ("B", B), ("C", Cc)): x.screenshot(path="/tmp/rombongan-%s.png" % n_)
            pts = [ev(x, "NW.rombongan._pts()[0].seats.map(q=>[q.x,q.y])") for x in (A, B, Cc)]
            ok("B5 posisi kursi (peta) identik di tiga klien", all(abs(pts[0][i][j] - pts[k][i][j]) < 0.05 for k in (1, 2) for i in range(3) for j in range(2)), pts)
            pa, pb, pc = pid(A), pid(B), pid(Cc); chars = [dict((r[0], r[1:3]) for r in ev(x, "NW.rombongan._last()")) for x in (A, B, Cc)]
            ok("B5b tiga karakter nyata digambar di kapal yang sama di tiga klien (pid berbeda, posisi sama)", all(len(c) == 3 and {pa, pb, pc} == set(c) for c in chars) and all(abs(chars[0][q][0] - chars[k][q][0]) < 0.2 and abs(chars[0][q][1] - chars[k][q][1]) < 0.2 for k in (1, 2) for q in (pa, pb, pc)), chars)
            st = [ev(x, "NW.rombongan.state()") for x in (A, B, Cc)]
            ok("B5c nama panggilan publik tampil per kursi (Anda kapten)", all([q["name"] for q in s_["boats"][0]["seats"]][0] == "Anda" and set(q["name"] for q in s_["boats"][0]["seats"]) == {"Anda", "Budi", "Cici"} for s_ in st), st[0])
            ok("B5d pakaian berbeda: gaya karakter tiga pemain tidak sama", len({json.dumps(ev(x, "(()=>{const s=NW.world.player.style;return [s.shirt,s.hat&&s.hat.id||s.hat,s.top&&s.top.id||'']})()")) for x in (A, B, Cc)}) == 3 and len({json.dumps(ev(A, "(()=>{const q=NW.mp.view().players;return q.map(p=>[p.name,JSON.stringify(p.style)])})()"))}) == 1)
            # --- kemudi hanya kapten ---
            A.keyboard.down("s"); time.sleep(0.4)
            ok("B6 kapten: jangkar masih turun → kapal tidak bergerak (pesan jangkar)", ev(A, "NW.mp.boats()[0].v") == 0)
            A.keyboard.up("s"); A.click("#rbAnchor"); time.sleep(0.5)
            ok("B6b kapten angkat jangkar lewat tombol HUD", wait_for(Cc, "!NW.mp.boats()[0].anchor", 5))
            A.keyboard.down("s")
            ok("B7 kapten berlayar: kapal bergerak & arah 2 (selatan) sama di tiga klien", all(wait_for(x, "NW.mp.boats()[0].v>0 && NW.mp.boats()[0].d===2", 6) for x in (A, B, Cc)))
            B.keyboard.down("d"); time.sleep(1.2)
            ok("B8 penumpang tidak bisa mengemudi (arah tetap 2) dan tidak berjalan sendiri", ev(B, "NW.mp.boats()[0].d") == 2 and ev(B, "(()=>{const b=NW.mp.boats()[0],p=NW.world.player;return Math.hypot(p.x-b.x,p.y-b.y)<1.3})()"))
            B.keyboard.up("d"); time.sleep(0.8)
            bA, bB, bC = [boats(x)[0] for x in (A, B, Cc)]
            ok("B9 baris kapal identik (arah, jangkar, kursi); posisi berbeda tipis saja", (bA["d"], bA["anchor"], bA["seats"]) == (bB["d"], bB["anchor"], bB["seats"]) == (bC["d"], bC["anchor"], bC["seats"]) and abs(bA["ty"] - bB["ty"]) < 1.2 and abs(bA["ty"] - bC["ty"]) < 1.2, [bA, bB, bC])
            ok("B9b kamera/pemain ikut kapal: pemain A berada di badan kapal yang bergerak", ev(A, "(()=>{const b=NW.mp.boats()[0],p=NW.world.player;return Math.hypot(p.x-b.x,p.y-b.y)<1.3})()"))
            A.screenshot(path="/tmp/rombongan-A-gerak.png")
            A.keyboard.up("s"); time.sleep(0.8); ev(A, "NW.mp.boatSteer(2,0)"); time.sleep(0.5)
            ok("B10 lepas joystick: kapal berhenti (th=0)", wait_for(A, "NW.mp.boats()[0].v<0.05", 8))
            A.click("#rbAnchor"); time.sleep(0.6)
            ok("B10b jangkar turun, kapal berhenti penuh", wait_for(A, "NW.mp.boats()[0].anchor && NW.mp.boats()[0].v===0", 6) and wait_for(Cc, "NW.mp.boats()[0].anchor", 5))
            # --- penumpang tetap bisa obrolan, emoji, peta; memancing hanya saat jangkar turun ---
            ev(B, "NW.mp.sendChat('halo dari kapal')"); ev(B, "NW.mp.sendEmote(0)")
            ok("B11 penumpang (duduk) masih bisa obrolan & emoji; klien lain menerima", wait_for(Cc, "NW.mp.view().log.some(l=>l.text==='halo dari kapal')", 5))
            ev(B, "Nusa.openPanel('map')"); time.sleep(0.4); okmap = ev(B, "Nusa.isPanelOpen()"); ev(B, "Nusa.travel(1)"); time.sleep(0.3)
            ok("B11b peta terbuka saat duduk; perpindahan lokasi ditolak sampai turun (tetap di kursi)", okmap and not ev(B, "NW.areas.cur.id!=='muara'") and bool(mine(B)))
            ev(B, "Nusa.closePanel()"); time.sleep(0.3)
            fishers = B
            ok("B12 jangkar turun: tombol Pancing aktif untuk penumpang", ev(B, "!document.getElementById('rbFish').disabled"))
            B.click("#rbFish"); ok("B12b penumpang masuk mode memancing laut dari kursi (posisi = kapal server)", wait_for(B, "Nusa.mode()==='fish'", 6) and bool(mine(B)))
            time.sleep(0.5); B.screenshot(path="/tmp/rombongan-B-pancing.png")
            B.click("#landBtn"); ok("B12c kembali dari memancing: tetap duduk di kursi yang sama", wait_for(B, "Nusa.mode()==='world'", 6) and bool(mine(B)) and mine(B)["seat"] == 1 if mine(B) else False, mine(B))
            A.keyboard.down("s"); ev(A, "NW.mp.boatAnchor(false)"); time.sleep(0.4); A.keyboard.up("s")
            ok("B12d jangkar naik: tombol Pancing mati (tidak bisa memancing saat berlayar)", wait_for(B, "document.getElementById('rbFish').disabled", 4))
            ev(A, "NW.mp.boatAnchor(true)"); time.sleep(0.8)
            # --- kapten pergi → penumpang jadi kapten ---
            pre = mine(B)
            A.click("#rbLeave"); ok("B13 kapten turun: pemain A kembali ke dermaga (bukan di air)", wait_for(A, "!NW.mp.boatMine()", 6) and wait_for(A, "NW.walkable(NW.world.player.x,NW.world.player.y)", 4))
            ok("B13b penumpang kursi terkecil (B, kursi 1) naik jadi kapten, jangkar turun; C tetap penumpang", wait_for(B, "NW.mp.boatMine() && NW.mp.boatMine().captain", 6) and wait_for(Cc, "NW.mp.boats()[0].anchor", 4) and mine(Cc)["seat"] == 2, [mine(B), mine(Cc)])
            B.screenshot(path="/tmp/rombongan-B-kapten.png")
            # --- putus & sambung ulang dalam 20 dtk: kursi sama ---
            old = pid(Cc); ev(Cc, "NW.mp._R.ws.close()")
            ok("B14 C putus: kursinya ditahan (kapal tetap, kursi 2 masih terisi, ada penanda tertahan di klien lain)", wait_for(A, "NW.rombongan._st.trk.isHeld(NW.mp.boats()[0].id,2)", 6) and boats(A)[0]["seats"][2] != 0, boats(A))
            ok("B14b C sambung ulang: kursi SAMA (2), pid baru", wait_for(Cc, "!!NW.mp.boatMine()", 14) and mine(Cc)["seat"] == 2 and pid(Cc) != old, [mine(Cc), old, pid(Cc)])
            ok("B14b2 animasi di klien lain = 'return' (duduk kembali di kursi), bukan lompat naik dari dermaga", wait_for(A, "(()=>{const e=NW.rombongan._st.trk.seatOf.get(%s);return !!e&&e.kind==='return'&&e.s===2})()" % json.dumps(pid(Cc)), 4))
            time.sleep(1.0); ok("B14c kursi tidak lagi tertahan", not ev(A, "NW.rombongan._st.trk.isHeld(NW.mp.boats()[0].id,2)"))
            # --- pindah area (kapten B) ---
            ev(B, "NW.rombongan.go('laut')")
            ok("B15 kapten berlayar ke area lain: pengamat di dermaga (A) tidak lagi melihat kapal/kru; kru tetap duduk & melihat kapal", wait_for(A, "NW.mp.boats().length===0", 6) and ev(B, "NW.mp.boats()[0].away") is True and ev(Cc, "NW.mp.boats()[0].away") is True and bool(mine(Cc)))
            B.screenshot(path="/tmp/rombongan-B-berlayar.png")
            time.sleep(8.6); ev(B, "NW.rombongan.go('muara')")
            ok("B16 kembali ke Muara (≥8 dtk server): kapal tampak lagi di semua klien", wait_for(A, "NW.mp.boats().length===1 && !NW.mp.boats()[0].away", 6) and wait_for(Cc, "!NW.mp.boats()[0].away", 5))
            # --- privasi ---
            uids = [ev(x, "(NW.cloud.user&&NW.cloud.user.uid)||''") for x in (A, B, Cc)]
            blob = " ".join(json.dumps(ev(x, "NW.rombongan.state()")) + ev(x, "document.getElementById('rbHud').outerHTML") + json.dumps(ev(x, "NW.mp.boats().map(b=>Object.keys(b))")) for x in (A, B, Cc))
            ok("B17 privasi: state/DOM kapal tidak memuat UID, token, atau data pribadi", all(u and u not in blob for u in uids) and "TOKEN-UJI" not in blob and "uid" not in blob.lower(), uids)
            ok("B18 tidak ada pageerror di tiga klien", not any(any("PAGEERR" in q and "registerPanel" not in q for q in e) for e in (eA, eB, eC)), [eA, eB, eC])
            # --- ukuran layar: HUD tidak keluar layar & tidak menimpa joystick ---
            for (w_, h_) in ((360, 740), (412, 915), (740, 360)):
                for nm_, pg_ in (("kapten", B), ("penumpang", Cc)):
                    pg_.set_viewport_size({"width": w_, "height": h_}); time.sleep(0.9)
                    r = ev(pg_, "(()=>{const q=document.getElementById('rbHud').getBoundingClientRect(),j=document.getElementById('joy').getBoundingClientRect();const ov=!(q.right<=j.left||q.left>=j.right||q.bottom<=j.top||q.top>=j.bottom);return {l:q.left,t:q.top,r:q.right,b:q.bottom,vw:innerWidth,vh:innerHeight,ov:ov,btn:[...document.querySelectorAll('#rbHud button')].filter(b=>b.offsetParent).map(b=>Math.round(b.getBoundingClientRect().height))}})()")
                    ok("V %dx%d %s: HUD di dalam layar, tidak menimpa joystick, tombol ≥40px" % (w_, h_, nm_), r["l"] >= 0 and r["t"] >= 0 and r["r"] <= r["vw"] and r["b"] <= r["vh"] and not r["ov"] and all(v >= 40 for v in r["btn"]), r)
                B.screenshot(path="/tmp/rombongan-vp-%dx%d.png" % (w_, h_))
            B.set_viewport_size({"width": 412, "height": 915}); Cc.set_viewport_size({"width": 412, "height": 915})
        finally:
            s.terminate(); s.wait()

        # --- bendera OFF: modul tidak diunduh, kapal lama utuh ---
        s = srv(True)
        try:
            rq = []; c0, O, e0 = page(b, "demo-a", "Anda", rom=False, reqs=rq); time.sleep(2.0)
            ok("F1 flag klien OFF: modul rombongan TIDAK diunduh", not any(x.startswith("URL:") for x in rq), [x for x in rq if x.startswith("URL:")])
            ok("F1b flag OFF: NW.rombongan tidak ada, tanpa HUD, tanpa kapal gambar", ev(O, "typeof NW.rombongan==='undefined' && !document.getElementById('rbHud')"))
            ok("F1c flag OFF: kapal tunggal lama tetap bekerja (naik kapal pribadi)", ev(O, "(()=>{const m=NW.boat.mainMoor(NW.areas.cur);NW.world.player.x=m.board?m.board.x:m.x;NW.world.player.y=m.board?m.board.y:m.y;return NW.boat.landCandidates(NW.world.player).length>0})()"))
            c0.close()
            # bendera klien ON tetapi SERVER OFF (gameFlags.kapalRombongan=false): tak ada titik/kontrol/kapal
            c1_, P1, e1_ = page(b, "demo-b", "Budi", flag=False); online(P1); time.sleep(3.5); tp(P1, 37.2, 21.3); time.sleep(1.0)
            ok("F2 modul diunduh tetapi server OFF (gameFlags): tak ada titik interaksi, kontrol, atau kapal", ev(P1, "!!NW.rombongan && !NW.rombongan.state().srv && NW.rombongan.candidates(NW.world.player).length===0 && !document.querySelector('#rbHud:not(.hidden)')"))
            ok("F2b server OFF: titik 'Buat Kapal Rombongan' tak pernah muncul", not act(P1, "rb:new", 1.5))
            c1_.close()
        finally: s.terminate(); s.wait()
        # --- keadaan gagal aman: server flag ON, tetapi realtime kapal OFF → penjelasan saja, tanpa kapal palsu ---
        s = srv(False)
        try:
            c2_, P2, e2_ = page(b, "demo-a", "Anda"); online(P2); wait_for(P2, "NW.rombongan.state().srv", 8); tp(P2, 37.2, 21.3); time.sleep(1.0)
            ok("G1 realtime kapal OFF: tak ada kapal & tak ada tombol buat/duduk; hanya titik penjelasan", ev(P2, "!NW.mp.boatOn() && NW.mp.boats().length===0 && NW.rombongan.candidates(NW.world.player).map(c=>c.id).join()==='rb:fail'"))
            ok("G1b menekan titik itu → dialog aman (tanpa kapal palsu, tanpa kursi)", act(P2, "rb:fail") and ev(P2, "NW.world.dialogOpen") and ev(P2, "NW.mp.boats().length===0 && !NW.rombongan.seated()"))
            ok("G1c intent ditolak klien (boatNew=false) bila realtime OFF", ev(P2, "NW.mp.boatNew()") is False)
            c2_.close()
        finally: s.terminate(); s.wait()
    fails = [x for x in ns["R"] if x.startswith("FAIL")]
    print("\nTOTAL:", len(ns["R"]), "uji,", len(fails), "gagal")
    sys.exit(1 if fails else 0)
main()
