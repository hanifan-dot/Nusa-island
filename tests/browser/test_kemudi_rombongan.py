"""Uji UI KEMUDI untuk KAPTEN Kapal Rombongan (tiga klien nyata + server dev realtime NUSA_BOAT=ya + gameFlags tiruan; BUKAN Cloudflare/Firestore asli).
Otoritas tetap server: setir+tuas hanya menghasilkan niat steer{d,th}/anchor lewat protokol #132 yang sudah ada. Jalankan: python3 tests/browser/test_kemudi_rombongan.py"""
import os, sys, time, json
H = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("RB_PORT", "8823")
src = open(os.path.join(H, "test_rombongan.py")).read().replace("\nmain()\n", "\n").replace('if __name__ == "__main__":\n    main()\n', "")
ns = {"__file__": os.path.join(H, "test_rombongan.py")}; exec(compile(src, "rb", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed, ROOT = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"], ns["ROOT"]
PORT, MOCK, OUT = ns["PORT"], ns["MOCK"], ns["OUT"]; srv, tp, boats, mine, act = ns["srv"], ns["tp"], ns["boats"], ns["mine"], ns["act"]
SHOTS = os.environ.get("SHOTS", "/tmp/kemudi-rombongan/"); os.makedirs(SHOTS, exist_ok=True)
BLOCK = "(()=>{const W=window.WebSocket;window.__blockWS=false;window.WebSocket=function(u,p){return new W(window.__blockWS?'ws://127.0.0.1:1/':u,p)};window.WebSocket.prototype=W.prototype;['CONNECTING','OPEN','CLOSING','CLOSED'].forEach(k=>window.WebSocket[k]=W[k])})();"

def page(b, acc, name, vp=(412, 915), kemudi=True, rom=True, flag=True, outfit=None):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=1)
    init = BLOCK + f"window.__demoAuto='{acc}';window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{PORT}',token:(uid)=>'dev.'+uid}};" + ("window.NUSA_ROMBONGAN=true;" if rom else "") + ("window.NUSA_KEMUDI=true;" if kemudi else "")
    init += "window.firebase={apps:[1],auth:()=>({currentUser:{getIdToken:async()=>'TOKEN-UJI'}})};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}))}" % json.dumps(json.dumps(seed(name)))
    ctx.add_init_script(init)
    cfg = open(os.path.join(H, "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "%s"' % MOCK)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
    def mock(r):
        nm = r.request.url.split("/fn/")[1] if "/fn/" in r.request.url else ""
        if nm == "gameFlags": return r.fulfill(status=200, content_type="application/json", body=json.dumps({"result": {"leaderboard": False, "socialHome": False, "pakDamar": False, "kapalRombongan": bool(flag)}}))
        return r.fulfill(status=404, content_type="application/json", body=json.dumps({"error": {"status": "not_found"}}))
    ctx.route(MOCK + "/**", mock)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    if outfit: ev(pg, "(c)=>{const P=NW.world.player;P.style=NW.avatarDraw.styleFor(c,P.style);NW.mp.sendOutfit(c)}", outfit)
    return ctx, pg, errs

def km(pg): return bool(ev(pg, "!!NW.kemudi && NW.kemudi.on && NW.kemudi.host==='rombongan' && !document.getElementById('kmRoot').classList.contains('hidden')"))
def joy(pg): return ev(pg, "getComputedStyle(document.getElementById('joy')).display!=='none'")
def rbhud(pg): return ev(pg, "!!document.getElementById('rbHud') && !document.getElementById('rbHud').classList.contains('hidden')")
def spy(pg):
    ev(pg, "(()=>{const ws=NW.mp._R.ws;if(!ws||ws.__spy)return;ws.__spy=1;const o=ws.send.bind(ws);window.__sent=window.__sent||[];ws.send=(d)=>{window.__sent.push(String(d));return o(d)}})()")
def bt(pg, a=None):
    out = []
    for x in ev(pg, "window.__sent||[]"):
        try: m = json.loads(x)
        except Exception: continue
        if m.get("t") == "bt" and (a is None or m.get("a") == a): out.append(m)
    return out
def clear_sent(pg): ev(pg, "window.__sent=[]")
def wheel(pg, side, hold):
    """putar setir dengan penunjuk nyata (mouse down di tepi kanan/kiri, tahan, lepas)"""
    r = ev(pg, "(()=>{const b=document.getElementById('kmWheel').getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2,r:b.width/2}})()")
    sx = 0.866 * r["r"] * 0.8 * (1 if side > 0 else -1)
    pg.mouse.move(r["x"] + sx, r["y"] + 0.5 * r["r"] * 0.8); pg.mouse.down(); time.sleep(hold); pg.mouse.up()
    wait_for(pg, "Math.abs(NW.kemudi._st.deg)<1", 4); time.sleep(0.35)
def lever(pg, g): pg.click("#kmLever button[data-g='%s']" % g)
def hdg(pg): return ev(pg, "document.getElementById('kmHead').textContent")
def bd(pg): return boats(pg)[0] if boats(pg) else None
LAYOUT = """(()=>{const R=e=>{const r=e.getBoundingClientRect();return r.width>1&&r.height>1?{l:r.left,t:r.top,r:r.right,b:r.bottom,id:(e.id||e.className||e.tagName).toString().slice(0,24)}:null};
const vis=e=>{for(let n=e;n&&n!==document.body;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden')return false}return true};
const parts=['#kmTop','.km-btns','#kmWheel','#kmLever'].map(q=>document.querySelector(q)).filter(e=>e&&vis(e)).map(R).filter(Boolean);
const leaf=e=>e.children.length===0||e.tagName==='BUTTON';
const others=[...document.querySelectorAll('#mpDock *, #hud *, #hint')].filter(e=>vis(e)&&leaf(e)).map(R).filter(Boolean);
const hit=[];for(const p of parts)for(const o of others){const w=Math.min(p.r,o.r)-Math.max(p.l,o.l),h=Math.min(p.b,o.b)-Math.max(p.t,o.t);if(w>3&&h>3)hit.push(p.id+' x '+o.id)}
const out=parts.filter(p=>p.l<-1||p.t<-1||p.r>innerWidth+1||p.b>innerHeight+1).map(p=>p.id);
const pr=[];for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){const a=parts[i],b=parts[j],w=Math.min(a.r,b.r)-Math.max(a.l,b.l),h=Math.min(a.b,b.b)-Math.max(a.t,b.t);if(w>3&&h>3)pr.push(a.id+' x '+b.id)}
return {n:parts.length,hit,out,pr,vw:innerWidth,vh:innerHeight}})()"""

def new_boat(pg, x=37.2, y=21.3):
    tp(pg, x, y); time.sleep(1.0); return act(pg, "rb:new") and wait_for(pg, "!!NW.mp.boatMine()", 6)

def layout_checks(b):
    for vp in ((360, 740), (412, 915), (740, 360), (1280, 800)):
        s = srv(True)
        try:
            c, A, e = page(b, "demo-a", "Anda", vp=vp); wait_for(A, "NW.mp.view().online", 8); wait_for(A, "NW.rombongan.state().srv", 8)
            okb = new_boat(A); time.sleep(1.0)
            # kasus terburuk: teks status terpanjang
            ev(A, "(()=>{NW.kemudi._st.host.view=(f=>()=>Object.assign(f(),{status:'Berlayar ke Pelabuhan Kota…',cargo:{boxes:[{n:3,st:'sailing'},{n:3,st:'sailing'}]}}))(NW.kemudi._st.host.view);NW.kemudi.paint(true)})()"); time.sleep(0.4)
            L = ev(A, LAYOUT); tag = "%dx%d" % vp
            A.screenshot(path=SHOTS + "layout-%s.png" % tag)
            ok("L %s kapten rombongan + Kemudi tampil (empat bagian)" % tag, okb and L["n"] == 4 and km(A), L)
            ok("L %s Kemudi tidak menutupi chat, indikator pemain, HUD atas, petunjuk, status muatan/peta/tombol" % tag, not L["hit"] and not L["pr"], L)
            ok("L %s semua kontrol Kemudi di dalam layar" % tag, not L["out"], L)
            ok("L %s tanpa error halaman" % tag, not e, e[:2])
            c.close()
        finally:
            s.terminate()

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        layout_checks(b)
        s = srv(True)
        try:
            cA, A, eA = page(b, "demo-a", "Anda", outfit=OUT["A"]); cB, B, eB = page(b, "demo-b", "Budi", outfit=OUT["B"]); cC, C, eC = page(b, "demo-owner", "Cici", outfit=OUT["C"])
            P = (A, B, C)
            ok("K1 tiga klien online; modul rombongan & Kemudi dimuat; gerbang server terbaca", all(ns["online"](x) for x in P) and all(ev(x, "NW.mp.boatOn() && !!NW.rombongan && !!NW.kemudi") for x in P) and all(wait_for(x, "NW.rombongan.state().srv", 8) for x in P))
            ok("K1b sebelum naik kapal: tak ada Kemudi di klien mana pun, joystick jalan kaki aktif", not any(km(x) for x in P) and all(joy(x) for x in P) and not any(rbhud(x) for x in P))
            for x in P: spy(x)
            for x in P: tp(x, 37.2, 21.3)
            time.sleep(1.2); ok("K2 A membuat kapal rombongan → A kapten", act(A, "rb:new") and wait_for(A, "!!NW.mp.boatMine() && NW.mp.boatMine().captain", 6))
            bid = boats(A)[0]["id"]
            for x in (B, C): tp(x, 37.2, 21.7)
            time.sleep(1.0); ev(B, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.8); tp(C, 37.6, 21.7); time.sleep(0.8); ev(C, "(b)=>NW.mp.boatJoin(b,2)", bid)
            ok("K2b tiga awak duduk (kapten + dua penumpang)", wait_for(A, "NW.mp.boats()[0].seats.every(x=>x!==0)", 8) and all(wait_for(x, "!!NW.mp.boatMine()", 6) for x in (B, C)))
            for x in (B, C): ev(x, "window.__bn=[];NW.mp.onBoat(e=>{if(e.type==='note')window.__bn.push(e.r)})")
            time.sleep(0.8)
            ok("K3 HANYA kapten yang melihat Kemudi; penumpang tidak (HUD penumpang tampil)", wait_for(A, "NW.kemudi.on", 4) and km(A) and not km(B) and not km(C) and rbhud(B) and rbhud(C) and not rbhud(A), [km(A), km(B), km(C)])
            ok("K3b kapten: joystick lama tersembunyi, setir + tuas + knot + kompas + jangkar + Peta Laut + muatan + pancing ada", not joy(A) and ev(A, "['kmWheel','kmLever','kmKnot','kmHead','kmAnchor','kmMap','kmCargo','kmFish','kmDest','kmHome'].filter(i=>{const e=document.getElementById(i);return !(e&&e.getClientRects().length)})") == [], ev(A, "['kmWheel','kmLever','kmKnot','kmHead','kmAnchor','kmMap','kmCargo','kmFish','kmDest','kmHome'].filter(i=>{const e=document.getElementById(i);return !(e&&e.getClientRects().length)})"))
            ok("K3c kapten: kontrol tombol (jangkar naik sebagai mulai) — Kemudi tidak dimatikan saat jangkar turun, hanya tidak mengirim", ev(A, "!document.getElementById('kmRoot').classList.contains('km-off')"))
            ok("K3d NW.kemudi.hide() dari kapal tunggal tidak mematikan Kemudi kapten rombongan", (ev(A, "NW.kemudi.hide()") or True) and km(A))
            # ---- penumpang mencoba mengirim kontrol ----
            for x in (B, C): clear_sent(x)
            ev(B, "window.__r=[NW.rombongan.toggleAnchor(),NW.rombongan.go('laut')]"); ev(C, "window.__r=[NW.rombongan.toggleAnchor(),NW.rombongan.go('laut')]")
            B.keyboard.down("s"); B.keyboard.down("d"); C.keyboard.down("w"); time.sleep(0.8); B.keyboard.up("s"); B.keyboard.up("d"); C.keyboard.up("w")
            ok("K4 penumpang lewat UI/API klien: toggleAnchor/go ditolak, tidak ada frame steer/anchor/go terkirim", ev(B, "window.__r") == [False, False] and ev(C, "window.__r") == [False, False] and not [m for x in (B, C) for m in bt(x) if m["a"] in ("steer", "anchor", "go")], [bt(B), bt(C)])
            for x in (B, C): clear_sent(x)
            st0 = boats(A)[0]
            ev(C, "NW.mp.boatAnchor(false)"); ev(C, "NW.mp.boatSteer(2,2)"); ev(B, "NW.mp.boatSteer(3,2)"); ev(B, "NW.mp.boatGo('laut')"); time.sleep(1.2)
            st1 = [boats(x)[0] for x in P]
            ok("K4b klien penumpang DIPALSUKAN (langsung memanggil mp.boat*): server menolak 'captain'; kapal tak berubah di tiga klien", wait_for(C, "window.__bn.includes('captain')", 4) and wait_for(B, "window.__bn.includes('captain')", 4) and all(s_["anchor"] and s_["v"] == 0 and s_["d"] == st0["d"] and not s_["away"] for s_ in st1), [st0, st1, ev(B, "window.__bn"), ev(C, "window.__bn")])
            # ---- kapten: jangkar, setir, tuas ----
            clear_sent(A); A.click("#kmAnchor")
            ok("K5 kapten angkat jangkar lewat Kemudi: semua klien melihat jangkar naik; tuas tetap NETRAL; kapal diam", all(wait_for(x, "!NW.mp.boats()[0].anchor", 5) for x in P) and ev(A, "NW.kemudi._st.gear") == "NETRAL" and all(boats(x)[0]["v"] == 0 for x in P))
            ok("K5b tombol jangkar kembali ke 'Jangkar' (siap diturunkan) saat jangkar naik", wait_for(A, "document.getElementById('kmAnchor').textContent.includes('Jangkar')", 3), ev(A, "document.getElementById('kmAnchor').textContent"))
            d0 = boats(A)[0]["d"]; wheel(A, +1, 1.4)
            ok("K6 setir kanan ditahan: arah naik searah jarum jam di SEMUA klien (server), lalu setir kembali ke tengah", all(wait_for(x, "NW.mp.boats()[0].d!==%d" % d0, 4) for x in P) and len({boats(x)[0]["d"] for x in P}) == 1 and wait_for(A, "Math.abs(NW.kemudi._st.deg)<1", 3), [boats(x)[0]["d"] for x in P])
            d1 = boats(A)[0]["d"]; ok("K6b arah bertambah +1/+2 langkah (45° per langkah) dari %d" % d0, (d1 - d0) % 8 in (1, 2, 3), [d0, d1])
            wheel(A, -1, 1.1); d2 = boats(A)[0]["d"]; ok("K6c setir kiri: arah berkurang", (d1 - d2) % 8 in (1, 2), [d1, d2])
            while boats(A)[0]["d"] != 3: wheel(A, +1 if (3 - boats(A)[0]["d"]) % 8 <= 4 else -1, 0.6)
            ok("K6d arah Kemudi sama dengan teks kompas (server): Barat Daya", hdg(A).endswith("Barat Daya") and all(boats(x)[0]["d"] == 3 for x in P), hdg(A))
            clear_sent(A); lever(A, "MAJU")
            ok("K7 tuas MAJU: kapal bergerak di SEMUA klien (kecepatan dari server), arah tetap sama", all(wait_for(x, "NW.mp.boats()[0].v>0.3", 6) for x in P) and all(boats(x)[0]["d"] == 3 for x in P), [boats(x)[0] for x in P])
            time.sleep(0.8)
            ok("K7b knot tampil > 0 dan berasal dari kecepatan server", ev(A, "parseInt(document.getElementById('kmKnot').textContent)") > 0, ev(A, "document.getElementById('kmKnot').textContent"))
            ok("K7c bergerak: tombol pancing kapten redup & HUD penumpang tidak boleh memancing", ev(A, "document.getElementById('kmFish').classList.contains('dim')") and all(ev(x, "document.getElementById('rbFish').disabled") for x in (B, C)))
            ok("K7d frame yang dikirim kapten hanya steer {d,th} sah (th∈{0,2}); tanpa posisi/kecepatan/hadiah", bt(A) and all(set(m) <= {"t", "a", "d", "th"} and m["a"] == "steer" and m["th"] in (0, 2) for m in bt(A)), bt(A))
            ok("K8 tuas MUNDUR tidak tersedia (protokol tak punya gigi mundur): tombol nonaktif, klik tak mengubah gigi", ev(A, "document.querySelector('#kmLever [data-g=MUNDUR]').disabled") and (ev(A, "document.querySelector('#kmLever [data-g=MUNDUR]').click()") or True) and ev(A, "NW.kemudi._st.gear") == "MAJU")
            lever(A, "NETRAL")
            ok("K8b tuas NETRAL: kapal berhenti di tiga klien", all(wait_for(x, "NW.mp.boats()[0].v<0.05", 8) for x in P))
            # ---- jangkar & memancing ----
            A.click("#kmAnchor")
            ok("K9 jangkar turun: semua klien melihat jangkar turun; kapal berhenti; pancing aktif (kapten & penumpang)", all(wait_for(x, "NW.mp.boats()[0].anchor && NW.mp.boats()[0].v<0.05", 8) for x in P) and wait_for(A, "!document.getElementById('kmFish').classList.contains('dim')", 3) and all(wait_for(x, "!document.getElementById('rbFish').disabled", 3) for x in (B, C)))
            sB0 = ev(B, "JSON.stringify([Nusa.S.cooler.length, Nusa.S.caught, Nusa.S.money])")
            B.click("#rbFish"); ok("K10 penumpang B mulai memancing dari kursi (jangkar turun & kapal berhenti)", wait_for(B, "Nusa.mode()==='fish' && Nusa.fishFrom()==='sea'", 4))
            ev(B, "window.__fishErr=0")
            A.click("#kmAnchor")
            ok("K10b kapten angkat jangkar saat B memancing → layar memancing B ditutup aman (kembali ke kursi), tanpa hasil ikan dari klien", wait_for(B, "Nusa.mode()==='world'", 5) and ev(B, "JSON.stringify([Nusa.S.cooler.length, Nusa.S.caught, Nusa.S.money])") == sB0 and ev(B, "!!NW.mp.boatMine()"), [sB0, ev(B, "JSON.stringify([Nusa.S.cooler.length, Nusa.S.caught, Nusa.S.money])")])
            ok("K10c setelah ditutup: B tidak bisa memancing selama jangkar naik (tombol nonaktif)", wait_for(B, "document.getElementById('rbFish').disabled", 3))
            A.click("#kmAnchor"); wait_for(A, "NW.mp.boats()[0].anchor && NW.mp.boats()[0].v<0.05", 8); time.sleep(0.5)
            sA0 = ev(A, "JSON.stringify([Nusa.S.cooler.length, Nusa.S.caught])")
            A.click("#kmFish"); ok("K11 kapten memancing (jangkar turun) → Kemudi tersembunyi di layar memancing", wait_for(A, "Nusa.mode()==='fish' && Nusa.fishFrom()==='sea'", 4) and wait_for(A, "!NW.kemudi.on", 3) and not km(A))
            A.screenshot(path=SHOTS + "kapten-memancing.png")
            ev(A, "document.getElementById('landBtn').click()")
            ok("K11b kembali ke kapal: Kemudi muncul lagi, joystick tetap tersembunyi, tanpa hasil ikan", wait_for(A, "Nusa.mode()==='world'", 4) and wait_for(A, "NW.kemudi.on", 3) and km(A) and not joy(A) and ev(A, "JSON.stringify([Nusa.S.cooler.length, Nusa.S.caught])") == sA0)
            # ---- pergantian peran ----
            clear_sent(A); A.click("#kmHome")
            ok("K12 kapten A turun (jangkar turun & berhenti): Kemudi hilang, joystick jalan kaki kembali, A di dermaga", wait_for(A, "!NW.mp.boatMine()", 6) and wait_for(A, "!NW.kemudi.on", 3) and wait_for(A, "getComputedStyle(document.getElementById('joy')).display!=='none'", 3) and not km(A) and joy(A) and wait_for(A, "NW.walkable(NW.world.player.x,NW.world.player.y)", 4))
            ok("K12b penumpang B (kursi terkecil) dipromosikan: Kemudi MUNCUL tanpa reload; C tetap tanpa Kemudi", wait_for(B, "NW.mp.boatMine() && NW.mp.boatMine().captain", 6) and wait_for(B, "NW.kemudi.on && NW.kemudi.host==='rombongan'", 5) and km(B) and not km(C) and not joy(B), [mine(B), km(B), km(C)])
            ok("K12c kapal diam & jangkar turun saat peran berpindah", all(ev(x, "NW.mp.boats()[0].anchor && NW.mp.boats()[0].v<0.05") for x in (A, B, C)))
            ev(A, "window.__bn=[];NW.mp.onBoat(e=>{if(e.type==='note')window.__bn.push(e.r)})"); bb = boats(A)[0]; tp(A, bb["tx"], bb["ty"] - 1.5); time.sleep(1.0); seat = 1 if not boats(A)[0]["seats"][1] else 2; ev(A, "(a)=>NW.mp.boatJoin(a[0],a[1])", [bid, seat])
            ok("K13 kapten lama A duduk kembali sebagai PENUMPANG: tanpa Kemudi (HUD penumpang), tak bisa mengirim kontrol", wait_for(A, "!!NW.mp.boatMine() && !NW.mp.boatMine().captain", 6) and wait_for(A, "!NW.kemudi.on", 3) and wait_for(A, "!!document.getElementById('rbHud') && !document.getElementById('rbHud').classList.contains('hidden')", 3) and not km(A) and rbhud(A) and ev(A, "NW.rombongan.toggleAnchor()") is False, [mine(A), km(A), seat, ev(A, "window.__bn"), boats(A)[0]["seats"], ev(A,"[NW.world.player.x,NW.world.player.y]")])
            # ---- putus & sambung ulang (20 dtk) ----
            spy(B); clear_sent(B)
            ev(B, "window.__blockWS=true;NW.mp._R.ws.close()")
            ok("K14 kapten B putus (ada penumpang terhubung): Kemudi B hilang; kapal tetap diam & berjangkar", wait_for(B, "!NW.mp.view().online", 5) and wait_for(B, "!NW.kemudi.on", 4) and not km(B) and all(ev(x, "NW.mp.boats()[0].anchor && NW.mp.boats()[0].v<0.05") for x in (A, C)))
            ok("K14b kontrak server: penumpang terhubung berkursi terkecil (A) dipromosikan SEGERA; Kemudi muncul di A tanpa reload; C tetap tanpa Kemudi", wait_for(A, "NW.mp.boatMine() && NW.mp.boatMine().captain", 6) and wait_for(A, "NW.kemudi.on && NW.kemudi.host==='rombongan'", 5) and km(A) and not km(C) and not rbhud(A), [mine(A), km(A), km(C)])
            time.sleep(6.0); ev(B, "window.__blockWS=false;NW.mp._R.retry=0;NW.mp._R.nextTry=0"); wait_for(B, "NW.mp.view().online", 25); time.sleep(2.0); spy(B); clear_sent(B)
            ok("K15 kapten lama B sambung ulang <20 dtk: kembali sebagai PENUMPANG (kursi kosong), TANPA Kemudi dan tanpa kontrol; A tetap pemegang Kemudi", mine(B) is not None and not mine(B)["captain"] and wait_for(B, "!NW.kemudi.on", 3) and wait_for(B, "!!document.getElementById('rbHud') && !document.getElementById('rbHud').classList.contains('hidden')", 3) and not km(B) and rbhud(B) and km(A) and not km(C), [mine(B), km(A), km(B), km(C)])
            ev(B, "NW.mp.boatSteer(2,2); NW.mp.boatAnchor(false); NW.mp.boatGo('laut')"); time.sleep(1.0)
            ok("K15b B mencoba kontrol setelah reconnect: kapal tak berubah (jangkar tetap turun, diam, tidak berangkat)", all(ev(x, "NW.mp.boats()[0].anchor && NW.mp.boats()[0].v<0.05 && !NW.mp.boats()[0].away") for x in (A, B, C)))
            # ---- pindah area (kapten = A) ----
            cap, pas = A, C
            t0 = time.time()
            ev(cap, "NW.rombongan.go('laut')")
            ok("K16 pindah area: kapten tetap memegang Kemudi tetapi dimatikan (km-off) dengan status 'Berlayar'; penumpang tetap tanpa Kemudi", wait_for(cap, "NW.mp.boats()[0].away", 6) and km(cap) and ev(cap, "document.getElementById('kmRoot').classList.contains('km-off')") and "Berlayar" in ev(cap, "document.getElementById('kmDest').textContent") and not km(pas), [ev(cap, "document.getElementById('kmDest').textContent")])
            cap.screenshot(path=SHOTS + "kapten-berlayar-antar-area.png")
            time.sleep(8.8); ev(cap, "NW.rombongan.go('muara')")
            ok("K16b kapal kembali: Kemudi kapten aktif lagi (km-off hilang); penumpang tanpa Kemudi", wait_for(cap, "!NW.mp.boats()[0].away", 8) and wait_for(cap, "!document.getElementById('kmRoot').classList.contains('km-off')", 4) and km(cap) and not km(pas), [km(cap)])
            time.sleep(1.0); ev(cap, "NW.rombongan.go('selat')"); t_go = time.time()
            ok("K17 Pelabuhan Kota: kapten di selat berlabuh — Kemudi dimatikan, tombol Jangkar/Pancing disembunyikan, 'Pulang' muncul", wait_for(cap, "NW.areas.cur.id==='selat'", 14) and wait_for(cap, "!!document.getElementById('kmGo') && document.getElementById('kmGo').getClientRects().length>0", 6) and ev(cap, "document.getElementById('kmAnchor').classList.contains('hidden') && document.getElementById('kmFish').classList.contains('hidden') && document.getElementById('kmRoot').classList.contains('km-off')") and not km(pas), [ev(cap, "NW.areas.cur.id")])
            cap.screenshot(path=SHOTS + "kapten-di-pelabuhan.png")
            cap.click("#kmHome")
            ok("K17b kapten 'Turun' di pelabuhan: Kemudi hilang, joystick jalan kaki kembali; penumpang tetap duduk tanpa Kemudi", wait_for(cap, "NW.rombongan.mine().ashore", 4) and wait_for(cap, "!NW.kemudi.on", 3) and wait_for(cap, "getComputedStyle(document.getElementById('joy')).display!=='none'", 3) and not km(cap) and joy(cap) and not km(pas) and ev(pas, "!!NW.mp.boatMine()"), [ev(cap, "NW.rombongan.mine().ashore"), km(cap), joy(cap), km(pas), ev(pas, "!!NW.mp.boatMine()"), ev(cap, "NW.areas.cur.id")])
            ev(cap, "NW.rombongan.reboard()")
            ok("K17c kapten naik lagi: Kemudi muncul lagi tanpa reload", wait_for(cap, "!NW.rombongan.mine().ashore", 4) and wait_for(cap, "NW.kemudi.on", 4) and km(cap) and not joy(cap))
            time.sleep(max(0, 9.0 - (time.time() - t_go))); cap.click("#kmGo")
            ok("K17d 'Pulang': kapal kembali ke Muara, Kemudi aktif, jangkar & pancing kembali", wait_for(cap, "NW.areas.cur.id==='muara'", 16) and wait_for(cap, "!document.getElementById('kmRoot').classList.contains('km-off')", 6) and ev(cap, "!document.getElementById('kmAnchor').classList.contains('hidden')") and not km(pas), [ev(cap, "NW.areas.cur.id"), ev(cap, "document.getElementById('kmRoot').className"), ev(cap, "document.getElementById('kmAnchor').className"), km(pas)])
            # ---- kapten sendirian: kursi ditahan 20 dtk, lalu dilepas ----
            for x in (B, pas): ev(x, "NW.mp.boatLeave()")
            ok("K19 penumpang turun: kapten A sendirian, Kemudi tetap di A", all(wait_for(x, "!NW.mp.boatMine()", 5) for x in (B, pas)) and km(cap))
            ev(cap, "window.__blockWS=true;NW.mp._R.ws.close()"); time.sleep(6.0)
            ok("K19b kapten sendirian putus: Kemudi hilang (kursi ditahan, tidak ada yang dipromosikan)", not km(cap) and wait_for(B, "NW.mp.boats().length===1", 3))
            ev(cap, "window.__blockWS=false;NW.mp._R.retry=0;NW.mp._R.nextTry=0")
            ok("K19c sambung ulang <20 dtk: kursi kapten SAMA; Kemudi muncul lagi tanpa reload; jangkar tetap turun", wait_for(cap, "NW.mp.view().online && !!NW.mp.boatMine() && NW.mp.boatMine().captain", 25) and wait_for(cap, "NW.kemudi.on", 5) and km(cap) and ev(cap, "NW.mp.boats()[0].anchor"), [mine(cap), km(cap)])
            ev(cap, "window.__blockWS=true;NW.mp._R.ws.close()"); time.sleep(23.0); ev(cap, "window.__blockWS=false;NW.mp._R.retry=0;NW.mp._R.nextTry=0")
            ok("K19d putus >20 dtk lalu sambung: kursi kapten hilang, tanpa Kemudi, joystick jalan kaki aktif", wait_for(cap, "NW.mp.view().online", 25) and wait_for(cap, "!NW.mp.boatMine() || !NW.mp.boatMine().captain", 5) and not km(cap) and joy(cap), [mine(cap), km(cap)])
            ok("K18 tanpa error halaman (tiga klien)", not (eA + eB + eC), (eA + eB + eC)[:3])
            for c in (cA, cB, cC): c.close()
            # ---- flag OFF: klien (NUSA_KEMUDI=false) → joystick/HUD lama persis ----
            s.terminate(); s = srv(True)
            cF, F, eF = page(b, "demo-a", "Anda", kemudi=False); wait_for(F, "NW.mp.view().online", 8); wait_for(F, "NW.rombongan.state().srv", 8)
            ok("F1 NUSA_KEMUDI=false: modul Kemudi tak ada & tak diunduh", ev(F, "typeof NW.kemudi==='undefined' && !document.getElementById('kmRoot')") and ev(F, "!performance.getEntriesByType('resource').some(r=>r.name.includes('kemudi/'))"))
            ok("F2 kapten tanpa Kemudi: HUD lama (jangkar) + joystick; kapal digerakkan joystick/keyboard lewat protokol yang sama", new_boat(F) and wait_for(F, "!!document.getElementById('rbHud') && !document.getElementById('rbHud').classList.contains('hidden')", 4) and joy(F) and ev(F, "!document.getElementById('rbAnchor').classList.contains('hidden')"), [rbhud(F), joy(F), ev(F, "document.getElementById('rbAnchor').className"), mine(F)])
            F.click("#rbAnchor"); wait_for(F, "!NW.mp.boats()[0].anchor", 5); F.keyboard.down("s")
            ok("F3 keyboard/joystick lama masih menggerakkan kapal (perilaku lama tidak berubah)", wait_for(F, "NW.mp.boats()[0].v>0.3", 6)); F.keyboard.up("s"); cF.close()
            s.terminate(); s = srv(True)
            cO, O, eO = page(b, "demo-a", "Anda", flag=False); wait_for(O, "NW.mp.view().online", 8); time.sleep(3.5)
            ok("F4 flag SERVER kapalRombongan=false (klien Kemudi ON): rombongan mati, tak ada Kemudi, joystick normal, titik buat-kapal tak muncul", ev(O, "NW.rombongan.state().srv===false") and not km(O) and not ev(O, "NW.kemudi.on") and joy(O) and not rbhud(O) and not (tp(O, 37.2, 21.3) or act(O, "rb:new", 1.5)))
            cO.close(); s.terminate(); s = srv(False)
            cN, N_, eN = page(b, "demo-a", "Anda"); wait_for(N_, "NW.mp.view().online", 8); time.sleep(3.5)
            ok("F5 NUSA_BOAT=tidak (server realtime): kapal rombongan tak aktif, tak ada Kemudi rombongan", not ev(N_, "NW.mp.boatOn()") and not km(N_) and joy(N_)); cN.close()
            # ---- tak ada regresi kapal tunggal ----
            s.terminate(); s = srv(True)
            cS, S, eS = page(b, "demo-a", "Anda"); wait_for(S, "NW.mp.view().online", 8); wait_for(S, "NW.rombongan.state().srv", 8)
            ev(S, "(()=>{const ar=NW.areas.cur;const m=NW.boat.moorById(ar,NW.boat.B.moor);const p=NW.world.player;p.x=m.board.x;p.y=m.board.y;NW.boat.board();NW.world.snapCamera&&NW.world.snapCamera()})()"); time.sleep(1.2)
            ok("S1 kapal tunggal (flag rombongan ON): host Kemudi = kapal tunggal; MUNDUR aktif; tombol 'Dermaga'; tanpa 'Pulang'; HUD rombongan tersembunyi", ev(S, "NW.boat.on && NW.kemudi.on && NW.kemudi.host==='boat'") and not ev(S, "document.querySelector('#kmLever [data-g=MUNDUR]').disabled") and ev(S, "document.getElementById('kmHome').textContent.includes('Dermaga') && !document.getElementById('kmGo')") and not rbhud(S))
            spy(S); ev(S, "if(NW.boat.B.anchor) document.getElementById('kmAnchor').click()"); time.sleep(0.5); lever(S, "MAJU"); time.sleep(1.6)
            ok("S2 kapal tunggal bergerak lewat tuas (fisika klien lama), tanpa frame steer ke server rombongan", ev(S, "NW.boat.B.v") > 5 and not bt(S), [ev(S, "NW.boat.B.v"), bt(S), ev(S, "NW.kemudi._st.gear"), ev(S, "[NW.boat.B.anchor, NW.boat.B.a, NW.boat.B.x, NW.boat.B.y]")])
            ev(S, "NW.boat.B.anchor=true"); ok("S3 kapal tunggal tidak membuat kapal rombongan di server", not boats(S) and not ev(S, "!!NW.mp.boatMine()"))
            ok("S4 tanpa error halaman (kapal tunggal)", not eS, eS[:2]); cS.close()
        finally:
            try: s.terminate()
            except Exception: pass
            b.close()
if __name__ == "__main__":
    main()
    fails = [x for x in ns["ns"]["R"] if x.startswith("FAIL")]
    print("\nTOTAL:", len(ns["ns"]["R"]), "uji,", len(fails), "gagal")
    sys.exit(1 if fails else 0)
