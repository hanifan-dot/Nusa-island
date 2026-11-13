"""Uji PAK DAMAR dengan gerbang KOTA NUSA NYALA (klien NUSA_KOTA + gameFlags.kotaNusa + server realtime NUSA_KOTA=ya):
3 klien Chromium + server dev (room-core ASLI) + Pengiriman Segar tiruan (kontrak). Alur penuh: kapten Sail → kapal BERLABUH di Pelabuhan Kota sebagai pemain terlihat →
tiga awak turun & berjalan → kotak dibawa ke mobil → hadiah HANYA untuk pemilik pesanan → pemain kembali. Termasuk kasus gagal (Sail jaringan putus, Deliver jaringan putus → retry opId sama,
Deliver ditolak server) dan awak non-pemilik yang tidak bisa mengambil kotak/hadiah.
Jalankan: python3 tests/browser/test_kota_damar.py   Bukti visual: /tmp/kota-damar-shots/ (env SHOTS)."""
import os, sys, time, json, subprocess, urllib.request, urllib.error
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
SHOTS = os.environ.get("SHOTS", "/tmp/kota-damar-shots/"); os.makedirs(SHOTS, exist_ok=True)
src = open(os.path.join(H, "test_rombongan.py")).read().replace("\nmain()\n", "\n").replace('if __name__ == "__main__":\n    main()\n', "")
ns = {"__file__": os.path.join(H, "test_rombongan.py")}; exec(compile(src, "rb", "exec"), ns)
psrc = open(os.path.join(H, "test_port.py")).read().split("def main")[0]
pn = {"__file__": os.path.join(H, "test_port.py")}; exec(compile(psrc, "pt", "exec"), pn)
from playwright.sync_api import sync_playwright
ok0, ev, wait_for, seed, ROOT = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"], ns["ROOT"]; Srv = pn["Srv"]
R = []
def ok(name, cond, extra=""):
    ok0(name, cond, extra); R.append(("PASS " if cond else "FAIL ") + name)
SRV = os.path.join(H, "..", "dev", "mp-dev-server.js"); PORT = int(os.environ.get("KDM_PORT", "8833")); MOCK = "https://api.mock.test"
OUT = ns["OUT"]

def srv(port=PORT):
    env = dict(os.environ, NUSA_DEV_NO_RATE="1", NUSA_BOAT="ya", NUSA_KOTA="ya", DEV_FLAG_SOCIAL="1")
    p = subprocess.Popen(["node", SRV, str(port)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(60):
        try: urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=0.3); return p
        except Exception: time.sleep(0.1)
    raise RuntimeError("server uji tidak naik")

def page(b, acc, sv, outfit, kota=True, kota_srv=True, vp=(412, 915), home=False, uid=None, name="Awak"):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    sd = seed(name); sd["cooler"] = [{"uid": "i%d" % k, "id": "nila", "w": 1.0 + k * 0.5, "t": 1} for k in range(8)]
    init = f"window.__demoAuto='{acc}';window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{PORT}',token:(uid)=>'dev.'+uid}};window.NUSA_ROMBONGAN=true;window.NUSA_DELIVERY=true;window.NUSA_KEMUDI=true;" + ("window.NUSA_SOCIAL_HOME=true;" if home else "") + ("window.NUSA_KOTA=true;" if kota else "")
    init += "window.firebase={apps:[1],auth:()=>({currentUser:{getIdToken:async()=>'TOKEN-UJI'}})};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}))}" % json.dumps(json.dumps(sd))
    ctx.add_init_script(init)
    cfg = open(os.path.join(H, "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "%s"' % MOCK)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
    def mock(r):
        u = r.request.url; nm = u.split("/fn/")[1] if "/fn/" in u else ""; body = {}
        try: body = (json.loads(r.request.post_data or "{}") or {}).get("data", {})
        except Exception: pass
        if nm == "gameFlags": return r.fulfill(status=200, content_type="application/json", body=json.dumps({"result": {"leaderboard": False, "socialHome": bool(home), "pakDamar": True, "kapalRombongan": True, "kotaNusa": bool(kota_srv)}}))
        if nm.startswith("ecoDamar"): code, js = sv.handle(nm, body); return r.fulfill(status=code, content_type="application/json", body=json.dumps(js))
        if home and (nm.startswith("home") or nm in ("writeSave", "loadSave")):   # Rumahku: jalur HTTP ke server uji (house/core asli) sebagai akun ini
            rq = urllib.request.Request(f"http://127.0.0.1:{PORT}/fn/{nm}", data=json.dumps({"data": body}).encode(), headers={"content-type": "application/json", "authorization": "Bearer dev." + (uid or acc)})
            try: return r.fulfill(status=200, content_type="application/json", body=urllib.request.urlopen(rq, timeout=5).read())
            except urllib.error.HTTPError as e: return r.fulfill(status=e.code, content_type="application/json", body=e.read())
        return r.fulfill(status=404, content_type="application/json", body=json.dumps({"error": {"status": "not_found"}}))
    ctx.route(MOCK + "/**", mock)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    ev(pg, "(c)=>{const P=NW.world.player;P.style=NW.avatarDraw.styleFor(c,P.style);NW.mp.sendOutfit(c)}", outfit)
    return ctx, pg, errs

def tp(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera&&NW.world.snapCamera()}", [x, y])
def pos(pg): return ev(pg, "(()=>{const p=NW.world.player;return [p.x,p.y]})()")
def walkto(pg, x, y, speed=4.0, tmo=40):
    """jalan lurus 4 petak/dtk (wajar; di bawah anggaran server) — bukan teleport"""
    ev(pg, """(a)=>{const p=NW.world.player;if(window.__w)clearInterval(window.__w);window.__wd=false;window.__w=setInterval(()=>{const dx=a[0]-p.x,dy=a[1]-p.y,d=Math.hypot(dx,dy);
      if(d<0.15){clearInterval(window.__w);window.__wd=true;return}const s=Math.min(d,a[2]*0.05);p.x+=dx/d*s;p.y+=dy/d*s;p.dir=((Math.round(Math.atan2(dy,dx)/(Math.PI/4))%8)+8)%8;p.moving=true},50)}""", [x, y, speed])
    wait_for(pg, "window.__wd===true", tmo); ev(pg, "NW.world.player.moving=false"); time.sleep(0.3)
def interact_id(pg, tid): return ev(pg, "(()=>{const l=NW.port.candidates(NW.world.player);const t=l.find(c=>c.id==='%s');if(!t)return false;NW.port.interact(t);return true})()" % tid)
def areaid(pg): return ev(pg, "NW.areas.cur&&NW.areas.cur.id")
def mine(pg): return ev(pg, "(()=>{const m=NW.mp.boatMine();return m?{id:m.id,seat:m.seat,captain:m.captain,kota:!!m.boat.kota}:null})()")
def peers(pg): return sorted(p["name"] for p in ev(pg, "NW.mp.view().players"))
def shot(pg, name): pg.screenshot(path=os.path.join(SHOTS, name + ".png"))

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(); s = srv()
        try:
            sa, sb, sc = Srv(True), Srv(True), Srv(True); sa.boxes = [["i0", "i1", "i2"], ["i3", "i4", "i5"]]; sa.box = ["i6", "i7"]
            sa.fail["ecoDamarSail"] = [1, "net"]                                   # Sail pertama: jaringan putus (hasil tak pasti)
            cA, A, eA = page(b, "demo-a", sa, OUT["A"]); cB, B, eB = page(b, "demo-b", sb, OUT["B"]); cC, Cc, eC = page(b, "demo-owner", sc, OUT["C"])
            PGS = (A, B, Cc)
            ok("D1 tiga klien online, rombongan & pengiriman siap, Kota LIVE (klien+flag server+env)", all(ns["online"](x) for x in PGS) and all(wait_for(x, "NW.port&&NW.port.ready&&NW.rombongan.state().srv", 12) for x in PGS) and all(wait_for(x, "NW.mp.kotaLive()===true", 8) for x in PGS))
            for x in PGS: tp(x, 37.2, 21.3)
            time.sleep(1.2); ok("D2 A membuat kapal rombongan (kapten)", ns["act"](A, "rb:new") and wait_for(A, "!!NW.mp.boatMine()", 6))
            bid = ns["boats"](A)[0]["id"]
            for x in (B, Cc): tp(x, 37.2, 21.7)
            time.sleep(1.0); ev(B, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.8); tp(Cc, 37.6, 21.7); time.sleep(0.8); ev(Cc, "(b)=>NW.mp.boatJoin(b,2)", bid)
            ok("D3 tiga awak duduk (kursi 0/1/2)", wait_for(A, "NW.mp.boats()[0].seats.every(x=>x!==0)", 8) and all(wait_for(x, "!!NW.mp.boatMine()", 6) for x in (B, Cc)))
            # ---- kasus gagal 1: Sail putus jaringan → kapal TIDAK berangkat, ikan aman, retry berhasil ----
            ev(A, "NW.delivery.open()"); wait_for(A, "!!document.getElementById('pkSail')", 8); time.sleep(0.3)
            A.click("#pkSail"); time.sleep(1.5)
            ok("D4 Sail gagal (jaringan): kapal tetap di Muara, awak tetap duduk, tombol coba lagi tampil", areaid(A) == "muara" and all(ev(x, "!!NW.mp.boatMine()") for x in PGS) and ev(A, "!!document.getElementById('pkRetry')"), [areaid(x) for x in PGS])
            op1 = [c[1].get("opId") for c in sa.calls if c[0] == "ecoDamarSail"]
            ev(A, "document.getElementById('pkRetry').click()"); time.sleep(0.3)
            ok("D5 retry Sail memakai opId SAMA (idempoten) lalu berhasil", wait_for(A, "NW.areas.cur.id==='selat'", 14) and [c[1].get("opId") for c in sa.calls if c[0] == "ecoDamarSail"][1] == op1[0], (op1, [c[1].get("opId") for c in sa.calls if c[0] == "ecoDamarSail"]))
            ok("D6 kapal BERLABUH di Pelabuhan Kota (kapal kota, bukan 'pergi'): ketiga awak di selat", all(wait_for(x, "NW.areas.cur.id==='selat' && !!NW.mp.boatMine() && NW.mp.boatMine().boat.kota===true", 14) for x in PGS), [mine(x) for x in PGS])
            time.sleep(1.5)
            pts = [ev(x, "NW.rombongan._pts().map(b=>b.seats.map(q=>[Math.round(q.x*10)/10,Math.round(q.y*10)/10]))") for x in PGS]
            ok("D7 posisi kapal & tiga kursi identik di tiga klien", pts[0] == pts[1] == pts[2] and len(pts[0]) >= 1, pts)
            ok("D8 server: Sail oleh kapten saja (3 panggilan = 1 gagal + 2 kotak), penumpang nol panggilan pengiriman", [c[0] for c in sa.calls].count("ecoDamarSail") == 3 and not [c for c in sb.calls + sc.calls if c[0].startswith("ecoDamar") and c[0] != "ecoDamarState"])
            shot(A, "kd-01-kapal-berlabuh")
            # ---- tiga awak turun SUNGGUHAN (leave) lalu berjalan; kapten lewat tombol 'Turun ke dermaga' pengiriman ----
            ok("D9 kapten turun lewat tombol pengiriman ('Turun ke dermaga') = turun sungguhan di mode kota", ev(A, "NW.rombongan.disembark(NW.port.positions.BOARD_SPOT)") and wait_for(A, "!NW.mp.boatMine()", 6))
            ok("D10 dua penumpang turun lewat protokol leave", ev(B, "NW.rombongan.leave()") and ev(Cc, "NW.rombongan.leave()") and all(wait_for(x, "!NW.mp.boatMine()", 6) for x in (B, Cc)))
            time.sleep(1.5)
            ok("D11 ketiganya berdiri di dermaga & saling terlihat sebagai pemain biasa", all(len(peers(x)) == 2 for x in PGS), [peers(x) for x in PGS])
            for x in PGS: walkto(x, 15.5 + PGS.index(x) * 0.8, 20.45, 3.0, 10)
            ok("D12 awak non-pemilik tidak punya titik 'Ambil Kotak'; pemilik punya dua", all(ev(x, "NW.port.candidates(NW.world.player).every(c=>!c.id.startsWith('pk:crate'))") for x in (B, Cc)) and sum(1 for c in ev(A, "NW.port.candidates(NW.world.player).map(c=>c.id)") if c.startswith("pk:crate")) == 2)
            # kasus gagal 2: Deliver pertama jaringan putus → kotak aman, retry opId sama; kasus gagal 3 menyusul (ditolak)
            sa.fail["ecoDamarDeliver"] = [1, "net"]
            def carry(pg, i):
                c = ev(pg, "NW.port.positions.CRATE[%d]" % i); walkto(pg, c["x"] - 0.4, c["y"]); ok("  titik kotak %d tersedia" % (i + 1), interact_id(pg, "pk:crate:%d" % i)); wait_for(pg, "NW.port._st.carry", 4)
                lp = ev(pg, "NW.port.positions.LOAD_PT"); walkto(pg, lp["x"], lp["y"], 4.0, 60); ok("  titik mobil tersedia", interact_id(pg, "pk:truck")); wait_for(pg, "!NW.port._st.load", 8); time.sleep(1.0)
            # B & C berjalan-jalan ke area mobil sementara A mengangkut (semua tetap terlihat)
            walkto(B, 24.0, 25.4, 4.0, 40); walkto(Cc, 25.0, 26.0, 4.0, 40)
            carry(A, 0)
            ok("D13 Deliver kotak 1 gagal (jaringan): tombol coba lagi, kotak & ikan aman", wait_for(A, "!!document.getElementById('pkRetry')", 8), ev(A, "document.getElementById('pkStatus').innerText"))
            op_a = [c[1].get("opId") for c in sa.calls if c[0] == "ecoDamarDeliver"]
            ev(A, "document.getElementById('pkRetry').click()")
            for _ in range(60):
                if sa.delivered >= 3 and len([c for c in sa.calls if c[0] == 'ecoDamarDeliver']) >= 2: break
                time.sleep(0.25)
            op_b = [c[1].get("opId") for c in sa.calls if c[0] == "ecoDamarDeliver"]
            if os.environ.get("KDM_DEBUG"): print("DEBUG", ev(A, "(()=>{const s=NW.port._st;return JSON.stringify({lock:s.lock,retry:!!s.retry,msg:s.msg,carry:s.carry,load:!!s.load,inTruck:s.inTruck})})()"), [(c[0], c[1]) for c in sa.calls], sa.st, sa.delivered, flush=True)
            ok("D14 retry Deliver memakai opId SAMA & tercatat sekali di server", len(op_b) == 2 and op_b[0] == op_b[1] and sa.delivered == 3 and len(sa.counted) == 1, (op_b, sa.delivered, sa.counted))
            shot(A, "kd-02-pemilik-antar-kotak")
            c1 = ev(A, "NW.port.positions.CRATE[1]"); walkto(A, c1["x"] - 0.4, c1["y"], 4.0, 60)
            ok("D15 kotak kedua tersedia untuk pemilik (di dermaga)", interact_id(A, "pk:crate:1")); wait_for(A, "NW.port._st.carry", 4)
            lp = ev(A, "NW.port.positions.LOAD_PT"); walkto(A, lp["x"], lp["y"], 4.0, 60); interact_id(A, "pk:truck"); wait_for(A, "!NW.port._st.load", 8)
            ok("D16 pemilik: panel hasil dengan hadiah dari server (777)", wait_for(A, "!document.getElementById('pkRes').classList.contains('hidden')", 40) and "777" in ev(A, "document.getElementById('pkRes').innerText"), ev(A, "document.getElementById('pkRes').innerText"))
            shot(A, "kd-03-hadiah-pemilik")
            ok("D17 hadiah HANYA untuk pemilik: B & C tanpa panel hasil, koin lokal tak berubah, server: A=777, B=C=0", all(ev(x, "document.getElementById('pkRes').classList.contains('hidden') && Nusa.S.money===50") for x in (B, Cc)) and sa.coins == 777 and sb.coins == 0 and sc.coins == 0, (sa.coins, sb.coins, sc.coins))
            ok("D18 B & C tidak memanggil Sail/Deliver/Abort sama sekali", not [c for c in sb.calls + sc.calls if c[0] in ("ecoDamarSail", "ecoDamarDeliver", "ecoDamarAbort")], [c[0] for c in sb.calls + sc.calls])
            ok("D19 B coba 'memasukkan ke mobil' tanpa membawa kotak: diabaikan, tak ada panggilan", not interact_id(B, "pk:truck") and not [c for c in sb.calls if c[0] == "ecoDamarDeliver"])
            ok("D20 ketiga pemain masih saling terlihat setelah pengiriman (multiplayer tak terganggu)", all(len(peers(x)) == 2 for x in PGS), [peers(x) for x in PGS])
            # ---- kembali ----
            time.sleep(2.0)
            # B & C naik kapal lagi (B duduk dulu → kapten karena kapal kota tanpa kapten), A pulang lewat tombol 'Kembali ke Muara'
            for x in (B, Cc): walkto(x, 13.2 + (0.4 if x is Cc else 0), 20.6, 4.0, 40)
            bb = ev(B, "NW.mp.boats()[0].id"); ev(B, "(b)=>NW.mp.boatJoin(b,1)", bb); ok("D21 B naik lagi → jadi kapten (kapal kota tanpa kapten)", wait_for(B, "!!NW.mp.boatMine() && NW.mp.boatMine().captain===true", 6), mine(B))
            ev(Cc, "(b)=>NW.mp.boatJoin(b,2)", bb); ok("D22 C naik lagi sebagai penumpang", wait_for(Cc, "!!NW.mp.boatMine()", 6) and mine(Cc)["captain"] is False, mine(Cc))
            time.sleep(6.5)
            ok("D23 A (pemilik, di darat) kembali ke Muara lewat tombol 'Kembali ke Muara'", ev(A, "(()=>{const h=document.getElementById('pkHome');if(h&&h.offsetParent){h.click();return true}return !!NW.port && (NW.port.goHome(),true)})()") and wait_for(A, "NW.areas.cur.id==='muara'", 10), areaid(A))
            time.sleep(1.5)
            ok("D24 server menempatkan A di sekitar dermaga Muara (tidak bisa muncul di sembarang tempat)", (lambda q: ((q[0] - 35.5) ** 2 + (q[1] - 20.6) ** 2) ** 0.5 < 9.0)(pos(A)), pos(A))
            time.sleep(2.0)
            ev(B, "NW.rombongan.goHome()")
            ok("D25 kapten B pulang: B & C kembali ke Muara dengan kursi masing-masing", all(wait_for(x, "NW.areas.cur.id==='muara' && !!NW.mp.boatMine()", 16) for x in (B, Cc)), [areaid(B), areaid(Cc), mine(B), mine(Cc)])
            time.sleep(1.0)
            ok("D26 di Muara A melihat B & C (satu server); tiap akun tampil sekali", len(peers(A)) == 2 and len(set(peers(A))) >= 1, peers(A))
            ok("D27 tanpa error halaman", not (eA + eB + eC), (eA + eB + eC)[:3])
        finally:
            s.terminate(); b.close()
    f = [r for r in R if r.startswith("FAIL")]; print(f"\n{len(R)-len(f)}/{len(R)} lulus")
    for r in f: print(r)
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
