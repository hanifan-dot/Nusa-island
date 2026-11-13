"""Pustaka uji Visual Kota Nusa: boot game (file://, mode demo), flag NUSA_KOTA, masuk area Selat, teleport. Server dev MP hanya bila diminta."""
import os, sys, time, json
H = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(H, "test_multiplayer.py")).read().replace("\nmain()\n", "\n")
_ns = {"__file__": os.path.join(H, "test_multiplayer.py")}; exec(compile(_src, "mp", "exec"), _ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed, ROOT, R = _ns["ok"], _ns["ev"], _ns["wait_for"], _ns["seed"], _ns["ROOT"], _ns["R"]
start_server, SRV = _ns["start_server"], _ns["SRV"]
SHOTS = os.environ.get("SHOTS", "/tmp/kota-shots/"); os.makedirs(SHOTS, exist_ok=True)

def clickid(pg, id):
    r = ev(pg, "(id)=>{const b=document.getElementById(id).getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2}}", id)
    pg.mouse.click(r["x"], r["y"])

def boot(b, name="Uji", acc="demo-a", kota=True, vp=(412, 915), hour=None, extra="", mp_port=None, dsf=1, quality=None, rom_flag=False, seed_over=None):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=dsf)
    init = f"window.__demoAuto='{acc}';" + ("window.NUSA_KOTA=true;" if kota else "") + extra
    if mp_port: init += f"window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{mp_port}',token:(uid)=>'dev.'+uid}};"
    sd = seed(name)
    if hour is not None: sd["hour"] = hour
    if seed_over: sd.update(seed_over)
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}))}" % json.dumps(json.dumps(sd))
    init += "window.firebase={apps:[1],auth:()=>({currentUser:{getIdToken:async()=>'TOKEN-UJI'}})};"
    ctx.add_init_script(init)
    MOCK = "https://api.mock.test"
    cfg = open(os.path.join(H, "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "%s"' % MOCK)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
    ctx.route(MOCK + "/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"result": {"leaderboard": False, "socialHome": False, "pakDamar": False, "kapalRombongan": bool(rom_flag)}})) if "/fn/gameFlags" in r.request.url else r.fulfill(status=404, content_type="application/json", body=json.dumps({"error": {"status": "not_found"}})))
    reqs = []
    ctx.on("request", lambda r: reqs.append(r.url))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    url = ROOT + "?cloud=demo" + (f"&kotaq={quality}" if quality is not None else "")
    pg.goto(url); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    clickid(pg, "gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): clickid(pg, "startBtn"); time.sleep(0.5)
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    return ctx, pg, errs, reqs

def to_selat(pg):
    ev(pg, "NW.world.onEnter('start','selat')"); wait_for(pg, "NW.areas.cur.id==='selat'", 5); time.sleep(0.3)
def tp(pg, x, y):
    ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera&&NW.world.snapCamera()}", [x, y])
def set_hour(pg, h): ev(pg, "(h)=>{Nusa.S.hour=h}", h)
def set_clock(pg, tw): ev(pg, "(t)=>{NW.kota.setClock(()=>t)}", tw)
def shot(pg, name): pg.screenshot(path=os.path.join(SHOTS, name + ".png"))
def summary():
    f = [r for r in R if r.startswith("FAIL")]; print(f"\n{len(R)-len(f)}/{len(R)} lulus"); 
    for r in f: print(r)
    return not f
