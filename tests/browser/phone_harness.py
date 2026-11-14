"""Harness uji NusaPhone (Ide 07): Worker backend ASLI (cabang NusaPhone) di balik phone_bridge.mjs (Firestore TIRUAN, jam bisa dimajukan, data sintetis) + server realtime uji (room-core ASLI, NUSA_PHONE=ya).
Bukan bukti produksi. Dipakai oleh test_phone_*.py."""
import os, sys, time, json, subprocess, socket, urllib.request, urllib.error
here = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.environ.get("NUSA_BACKEND", "")
if not (BACKEND and os.path.exists(os.path.join(BACKEND, "server/features.js")) and "nusaPhone" in open(os.path.join(BACKEND, "server/features.js")).read()):
    print("DILEWATI: NUSA_BACKEND tidak diisi / bukan cabang NusaPhone (butuh gameFlags.nusaPhone)."); sys.exit(0)
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(here, "..", "..", "index.html"))
MPSRV = os.path.abspath(os.path.join(here, "..", "dev", "mp-dev-server.js"))
SCR = os.environ.get("NUSA_SCRATCH", "/tmp/nusaphone/"); os.makedirs(SCR, exist_ok=True)
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:240] if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=10.0, step=0.1):
    t0 = time.time()
    while time.time() - t0 < tmo:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(step)
    return False
def free_port():
    sk = socket.socket(); sk.bind(("127.0.0.1", 0)); p = sk.getsockname()[1]; sk.close(); return p

class Bridge:
    """Worker backend asli (Firestore tiruan) + server realtime uji. Satu proses jembatan, satu proses realtime."""
    def __init__(s):
        s.port = free_port(); s.mport = free_port()
        s.p = subprocess.Popen(["node", os.path.join(here, "phone_bridge.mjs"), str(s.port)], env=dict(os.environ, NUSA_BACKEND=BACKEND), stdout=subprocess.PIPE, text=True)
        if "READY" not in s.p.stdout.readline(): raise RuntimeError("jembatan gagal")
        s.m = subprocess.Popen(["node", MPSRV, str(s.mport)], env=dict(os.environ, NUSA_HOUSE_API="http://127.0.0.1:%d" % s.port, NUSA_DEV_NO_RATE="1", NUSA_PHONE="ya"), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        for _ in range(60):
            try: urllib.request.urlopen("http://127.0.0.1:%d/health" % s.mport, timeout=0.3); break
            except Exception: time.sleep(0.1)
    def post(s, path, body=None):
        r = urllib.request.Request("http://127.0.0.1:%d%s" % (s.port, path), data=json.dumps(body or {}).encode(), method="POST")
        try:
            with urllib.request.urlopen(r, timeout=30) as f: return f.status, f.read().decode()
        except urllib.error.HTTPError as e: return e.code, e.read().decode()
    def adv(s, ms): s.post("/__adv", {"ms": int(ms)})
    def fn(s, uid, name, data=None):
        """Panggil fungsi Worker sebagai akun uji `uid` (tanpa browser). Mengembalikan (status, json)."""
        r = urllib.request.Request("http://127.0.0.1:%d/fn/%s" % (s.port, name), data=json.dumps({"data": data or {}}).encode(), headers={"authorization": "Bearer dev." + uid, "content-type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(r, timeout=30) as f: return f.status, json.loads(f.read().decode() or "{}")
        except urllib.error.HTTPError as e: return e.code, json.loads(e.read().decode() or "{}")
    def flags(s, dapur=None, social=None):
        b = {}
        if dapur is not None: b["dapur"] = dapur
        if social is not None: b["social"] = social
        s.post("/__flags", b)
    def read(s, path): return json.loads(s.post("/__read", {"path": path})[1])
    def cfg(s, **kw): s.post("/__cfg", {"set": kw})   # shop_config/main (Firestore tiruan)
    def rng(s, mode): s.post("/__rng", {"mode": mode})   # 'nol' = undian server selalu kena; 'asli' = RNG aman
    def sell_eco(s, uid): return s.read("shop_economy/%s" % uid)
    def pid(s, uid): return json.loads(s.post("/__pid", {"uid": uid})[1])["pid"]
    def dishes(s, uid, lst, extra=None): s.post("/__dishes", {"uid": uid, "list": lst, "extra": extra or {}})
    def homepub(s, uid, **kw): kw["uid"] = uid; s.post("/__homepub", kw)
    def close(s):
        for p in (s.p, s.m):
            try: p.kill()
            except Exception: pass

def dish(u, name, tier, rec=None): return {"u": u, "rec": rec, "name": name, "tier": tier, "q": 90 if tier == "enak" else 65 if tier == "lumayan" else 40, "at": 1, "fish": []}

def seed(name):
    return {"v": 11, "money": 500, "day": 1, "hour": 9, "loc": 0, "up": {"rod": 0, "bait": 0, "cooler": 0, "boat": 0}, "cooler": [], "dex": {}, "stats": {"casts": 0, "caught": 0, "earned": 0, "legends": 0}, "profile": {"v": 1, "name": name}}

def new_page(b, br, acc, name, vp=(360, 740), dapur=False, dpr=2, hour=None, phone=True, extra_init="", reduced=None):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=dpr, **({"reduced_motion": reduced} if reduced else {}))
    sd = seed(name)
    if hour is not None: sd["hour"] = hour
    init = "window.__demoAuto='%s';window.NUSA_MP_TEST={ws:'ws://127.0.0.1:%d',token:(uid)=>'dev.'+uid};" % (acc, br.mport)
    if dapur: init += "window.NUSA_DAPUR=true;"
    if phone: init += "window.NUSA_PHONE=true;"
    init += extra_init
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}));}" % json.dumps(json.dumps(sd))
    ctx.add_init_script(init)
    cfg = open(os.path.join(here, "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "http://127.0.0.1:%d"' % br.port)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" and "favicon" not in m.text and "Failed to load resource" not in m.text else None)
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.4)
    ev(pg, "window.firebase={apps:[{}],auth:()=>({currentUser:{getIdToken:async()=>'dev.'+NW.cloud.user.uid}})}")
    ev(pg, "document.querySelectorAll('[data-ask=later]').forEach(b=>b.click());[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    return ctx, pg, errs

def api(pg, name, data=None):
    return ev(pg, "async([n,d])=>{try{return {ok:await NusaApi.call(n,d||{},true)}}catch(e){return {err:e.code,msg:e.message}}}", [name, data or {}])
def uid(pg): return ev(pg, "NW.cloud.user.uid")
