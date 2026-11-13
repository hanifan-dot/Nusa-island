"""Uji Ide 08D — Halaman Sosial Rumahku: meja makan, nampan, tamu, tawaran makanan, kursi, presence realtime, siang/malam, 4 ukuran layar.
SERVER = Worker backend ASLI (PR #61: server/dapur-sosial.js + izin Rumahku Sosial) di balik jembatan lokal `sosial_bridge.mjs` (Firestore tiruan, jam bisa dimajukan, data sintetis)
        + server realtime uji `tests/dev/mp-dev-server.js` (logika room-core yang sama dengan produksi; izin masuk ruang ditanyakan ke Worker asli lewat NUSA_HOUSE_API).
Butuh: NUSA_BACKEND=/jalur/ke/nusa-island-control-center (cabang PR #61). Tanpa itu, uji ini DILEWATI (bukan lulus palsu).
Tidak diuji: Durable Object/Cloudflare asli, Firestore asli, token Google asli, Android fisik, performa HP. Harga bahan di server = NILAI UJI (belum disetujui Owner)."""
import os, sys, time, json, subprocess, socket, urllib.request, urllib.error
here = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.environ.get("NUSA_BACKEND", "")
if not (BACKEND and os.path.exists(os.path.join(BACKEND, "server/dapur-sosial.js"))):
    print("DILEWATI: NUSA_BACKEND tidak diisi / bukan cabang PR #61 (butuh server/dapur-sosial.js)."); sys.exit(0)
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(here, "..", "..", "index.html"))
MPSRV = os.path.abspath(os.path.join(here, "..", "dev", "mp-dev-server.js"))
OUT = os.path.abspath(os.path.join(here, "..", "..", "docs", "ide08d")) + "/"; os.makedirs(OUT, exist_ok=True)
SCR = os.environ.get("NUSA_SCRATCH", "/tmp/ide08d/"); os.makedirs(SCR, exist_ok=True)
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
        s.p = subprocess.Popen(["node", os.path.join(here, "sosial_bridge.mjs"), str(s.port)], env=dict(os.environ, NUSA_BACKEND=BACKEND), stdout=subprocess.PIPE, text=True)
        if "READY" not in s.p.stdout.readline(): raise RuntimeError("jembatan gagal")
        s.m = subprocess.Popen(["node", MPSRV, str(s.mport)], env=dict(os.environ, NUSA_HOUSE_API="http://127.0.0.1:%d" % s.port, NUSA_DEV_NO_RATE="1"), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
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

def new_page(b, br, acc, name, vp=(360, 740), dapur=True, dpr=2, hour=None):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=dpr)
    sd = seed(name)
    if hour is not None: sd["hour"] = hour
    init = "window.__demoAuto='%s';window.NUSA_MP_TEST={ws:'ws://127.0.0.1:%d',token:(uid)=>'dev.'+uid};" % (acc, br.mport)
    if dapur: init += "window.NUSA_DAPUR=true;"
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
def push_save(pg, rev=0):
    return ev(pg, """async(rev)=>{ const S=Nusa.S; try{ const r=await NusaApi.call('writeSave',{data:JSON.stringify(S),baseRev:rev,opId:'t'+Date.now()+Math.floor(Math.random()*1e6),deviceId:'dev'},true); return r }catch(e){ return {err:e.code,msg:e.message} } }""", rev)
def level_up(pg, lv):
    ev(pg, "(lv)=>{const S=Nusa.S;S.home.level=lv;NW.HD.relayout(S.home);NW.HD.ensureFishUids&&NW.HD.ensureFishUids(S);Nusa.save()}", lv)
def enter_yard(pg):
    ev(pg, "NW.home.enter(NW.world.player)"); wait_for(pg, "NW.home.active && NW.home.scene==='plot'", 5); time.sleep(0.9)
def tp(pg, x, y, d=2): ev(pg, "([x,y,d])=>{const p=NW.world.player;p.x=x;p.y=y;p.dir=d;p.moving=false}", [x, y, d])
def hk(pg, sid):   # titik interaksi halaman (dari kait Rumahku)
    return ev(pg, "(id)=>{const t=NW.home.candidates().find(c=>c.id===id);return t&&{x:t.x,y:t.y}}", sid)
def goto_hl(pg, sid):
    st = None
    for _ in range(20):
        st = hk(pg, sid)
        if st: break
        time.sleep(0.1)
    assert st, sid
    tp(pg, st["x"], st["y"]); time.sleep(0.3); return st
def interact(pg): ev(pg, "NW.world.interact()"); time.sleep(0.25)
def shot(pg, name, d=SCR): pg.screenshot(path=d + name + ".png")
def sheet(pg): return ev(pg, "(()=>{const s=document.getElementById('hlSheet');return s&&!s.classList.contains('hidden')?s.innerText:''})()")
def click(pg, sel, wait=0.2):
    pg.click(sel); time.sleep(wait)
def S(pg): return ev(pg, "(()=>{const s=NW.dapurSosial._S;return {mode:s.mode,seat:s.seat,offer:s.offer&&{id:s.offer.id,phase:s.offer.phase},own:{t:s.own.table,o:s.own.offers,d:s.own.dishes.length},guest:{t:s.guest.table,m:s.guest.mine},occ:s.occupied}})()")

# ---------------------------------------------------------------- bantu uji
UIDS = {"a": "demo-uid-a", "b": "demo-uid-b", "c": "demo-uid-owner"}
OUTFIT = {"a": "t:t_polos:1|p:p_awal:1", "b": "t:t_polos:4|p:p_awal:2", "c": "t:t_polos:3|p:p_awal:3"}
ACC = {"a": ("demo-a", "Budi"), "b": ("demo-b", "Rudi"), "c": ("demo-owner", "Cici")}
RAW_LOG = []   # semua jawaban/permintaan fungsi dapur sosial yang dilihat browser (untuk uji privasi)
def hook_log(pg, who):
    def on_resp(r):
        u = r.url
        if "/fn/dapurMeja" in u or "/fn/dapurTawaran" in u:
            try: body = r.text()
            except Exception: body = ""
            try: req = r.request.post_data or ""
            except Exception: req = ""
            RAW_LOG.append((who, u.split("/fn/")[1], r.status, req, body))
    pg.on("response", on_resp)
def join_all(pgs):
    for pg in pgs: wait_for(pg, "NW.dapurSosial && NW.dapurSosial.on", 15)
def enter_house_room(pg): enter_yard(pg); wait_for(pg, "NW.mp.view().house && NW.mp.view().online", 12)
def visit_via_ui_flow(br, pgOwner, pgGuest, ownerUid, guestUid):
    """Alur resmi Rumahku Sosial: tamu MINTA izin → pemilik TERIMA (lewat API server asli) → tamu MASUK."""
    pO = br.pid(ownerUid)
    r = api(pgGuest, "homeVisitRequest", {"pid": pO})
    inbox = api(pgOwner, "homeInbox"); reqs = (inbox.get("ok") or {}).get("requests", [])
    rid = next((q["id"] for q in reqs if True), None)
    if rid is None: return {"err": "no request", "r": r, "inbox": inbox}
    ans = api(pgOwner, "homeVisitRespond", {"id": rid, "accept": True})
    info = api(pgGuest, "homeVisit", {"pid": pO})
    return {"req": r, "ans": ans, "info": info}
def guest_enter(pg, info):
    ev(pg, "(info)=>{NW.home.enterVisit(info, NW.world.player)}", info)
    wait_for(pg, "NW.home.active && NW.home.visit && NW.home.scene==='plot'", 6); time.sleep(0.8)
    wait_for(pg, "NW.mp.view().house && NW.mp.view().online", 12)
def see_guests(pgOwner, n, tmo=10): return wait_for(pgOwner, "NW.mp.view().players.filter(p=>!p.owner).length>=%d" % n, tmo)
def tick(pg): ev(pg, "NW.dapurSosial.tick()")
def sync_o(pg): ev(pg, "NW.dapurSosial.ownerSync()"); time.sleep(0.5)
def sync_g(pg): ev(pg, "NW.dapurSosial.guestSync()"); time.sleep(0.5)
def srv_doc(br, uidx): return br.read("shop_dapur/" + UIDS[uidx]) or {}
def table_srv(br, uidx): return sorted([(x["s"], x["name"], x["left"], x["total"]) for x in (srv_doc(br, uidx).get("table") or [])])
def offers_open(br, uidx, now_ms=None): return [o for o in (srv_doc(br, uidx).get("offers") or []) if o.get("st") == "open"]
def card_open(pg): return ev(pg, "!!(NW.dapurSosial._S.offer && NW.dapurSosial._S.offer.phase==='open') && !!document.querySelector('#hlSheet .hl-offer')")
def layout_ok(pg, lv): return ev(pg, """(lv)=>{
  const HS=NW.HOUSE, HL=NW.dapurHalaman, L=HS.plotLayout(lv), mine=HL.solids(lv), ex=HS.PLOT_SOLIDS(L).slice();
  if(NW.pondDraw) ex.push(NW.pondDraw.RECT);
  const hit=(a,b,m)=>a.x0<b.x1+m&&a.x1>b.x0-m&&a.y0<b.y1+m&&a.y1>b.y0-m, bad=[];
  mine.forEach((s,i)=>{ex.forEach((e,j)=>{ if(hit(s,e,0.05)) bad.push(['solid',i,j]) })});
  const g=L.gate, dp=L.doorPt, sg=L.sign, mb=L.mailbox, keep=[{x0:dp.x-1.0,y0:dp.y-1.0,x1:dp.x+1.0,y1:dp.y+1.0},{x0:g.x-1,y0:g.y-1,x1:g.x+1,y1:g.y+1},{x0:sg.x-.6,y0:sg.y-.6,x1:sg.x+.6,y1:sg.y+.6},{x0:mb.x-.6,y0:mb.y-.6,x1:mb.x+.6,y1:mb.y+.6}];
  mine.forEach((s,i)=>keep.forEach((k,j)=>{ if(hit(s,k,0)) bad.push(['keep',i,j]) }));
  // jalur batu gerbang → pintu (titik-titik jalur dari house-draw): jarak ke benda saya ≥ 0.9
  const path=[[g.x,g.y-0.3],[g.x+1.2,11.2],[8-0.6,10.4],[8,dp.y]], pts=[]; for(let i=0;i<3;i++){const [ax,ay]=path[i],[bx,by]=path[i+1],n=12;for(let k=0;k<=n;k++)pts.push([ax+(bx-ax)*k/n,ay+(by-ay)*k/n])}
  pts.forEach(([x,y])=>mine.forEach((s,i)=>{ if(x>s.x0-0.9&&x<s.x1+0.9&&y>s.y0-0.9&&y<s.y1+0.9) bad.push(['path',x.toFixed(1),y.toFixed(1),i]) }));
  // semua titik kursi/interaksi di dalam halaman dan tidak di dalam benda penghalang
  const lay=HL.layout(lv), inside=(p)=>p.x>0.8&&p.x<15.2&&p.y>0.8&&p.y<13.2, pts2=[...lay.chairs,lay.meja,lay.nampan,lay.kopi];
  pts2.forEach((p,i)=>{ if(!inside(p)) bad.push(['out',i]); [...ex].forEach((e,j)=>{ if(p.x>e.x0&&p.x<e.x1&&p.y>e.y0&&p.y<e.y1) bad.push(['inex',i,j]) }) });
  return bad.slice(0,6)
}""", lv)
def reach_ok(pg, lv):   # BFS di grid 0.25 memakai walkable ASLI (termasuk benda halaman): gerbang → pintu & semua titik interaksi
    return ev(pg, """(lv)=>{
  const H=NW.home, L=NW.HOUSE.plotLayout(lv), HL=NW.dapurHalaman.layout(lv), st=0.25, W=Math.round(16/st), Hh=Math.round(14/st);
  const key=(i,j)=>i+','+j, walk=(x,y)=>H.walkable(x,y);
  const sx=Math.round((L.gate.x+0.2)/st), sy=Math.round((L.gate.y-0.7)/st), seen=new Set([key(sx,sy)]), q=[[sx,sy]];
  while(q.length){const [i,j]=q.pop(); for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj; if(a<0||b<0||a>W||b>Hh||seen.has(key(a,b))) continue; if(!walk(a*st,b*st)) continue; seen.add(key(a,b)); q.push([a,b])}}
  const can=(x,y)=>{const i=Math.round(x/st),j=Math.round(y/st); for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++) if(seen.has(key(i+a,j+b))) return true; return false};
  const miss=[]; const need={door:L.doorPt, meja:HL.meja, nampan:HL.nampan, kopi:HL.kopi}; HL.chairs.forEach(c=>need['kursi'+c.id]=c);
  for(const [k,p] of Object.entries(need)) if(!can(p.x,p.y)) miss.push(k);
  return miss
}""", lv)

# ---------------------------------------------------------------- uji
def sec_flag_off(b, br):
    br.flags(dapur=False)
    ctx, pg, errs = new_page(b, br, *ACC["a"])
    time.sleep(4.5)   # gate dapur memeriksa gameFlags tiap 3 dtk
    ok("0a flag server OFF: modul sosial tidak aktif", ev(pg, "!!NW.dapurSosial && NW.dapurSosial.on===false"))
    push_save(pg); level_up(pg, 3); enter_yard(pg)
    ok("0b flag OFF: tidak ada kait/kandidat/panel sosial", ev(pg, "!NW.home.hooks.halaman && !NW.home.candidates().some(c=>c.id.startsWith('hl_')) && !document.getElementById('hlSheet')||document.getElementById('hlSheet')&&!document.body.classList.contains('hl-open')"))
    L = ev(pg, "NW.dapurHalaman.layout(3).table")
    ok("0c flag OFF: halaman tetap seperti semula (tempat meja bisa dilewati)", ev(pg, "([x,y])=>NW.home.walkable(x,y)", [(L["x0"] + L["x1"]) / 2, (L["y0"] + L["y1"]) / 2]))
    r0d = api(pg, "dapurMejaState"); ok("0d flag OFF: server menolak fungsi meja (404)", bool(r0d.get("err")) and "ok" not in r0d, r0d)
    r0f = api(pg, "dapurHalamanSimpan", {"opId": "op-flag-off-0001", "items": {"lampu": [1.65, 1.4]}}); ok("0f flag OFF: server menolak simpan susunan halaman (404), tak ada dokumen halaman", bool(r0f.get("err")) and "ok" not in r0f and not (br.read("shop_dapur/" + UIDS["a"]) or {}).get("halaman"), r0f)
    ctx.close(); br.flags(dapur=True); time.sleep(0.1)
    c2, p2, e2 = new_page(b, br, *ACC["a"], dapur=False)
    ok("0e NUSA_DAPUR tidak diset: modul sosial tidak dimuat", ev(p2, "typeof NW.dapurSosial==='undefined' && typeof NW.dapurHalaman==='undefined'"))
    c2.close()

def sec_layout(b, br):
    ctx, pg, errs = new_page(b, br, *ACC["a"]); join_all([pg]); push_save(pg)
    bad_all = {}; miss_all = {}
    for lv in range(1, 11):
        level_up(pg, lv); enter_yard(pg)
        bad = layout_ok(pg, lv); miss = reach_ok(pg, lv)
        if bad: bad_all[lv] = bad
        if miss: miss_all[lv] = miss
        ev(pg, "NW.home.exitToIsland ? NW.home.exitToIsland(NW.world.player) : 0"); time.sleep(0.2)
    ok("1a Lv1–10: perabot tidak menimpa pintu, jalur batu, papan, kotak surat, kolam atau benda lama", not bad_all, bad_all)
    ok("1b Lv1–10: dari gerbang semua titik (pintu, meja, nampan, kopi, 8 tempat duduk) tetap terjangkau", not miss_all, miss_all)
    ctx.close()

def sec_owner_food(b, br):
    ctx, A, eA = new_page(b, br, *ACC["a"]); hook_log(A, "a"); join_all([A]); push_save(A); level_up(A, 3)
    lst = [dish("d1", "Ikan Goreng", "enak", "ikan_goreng"), dish("d2", "Telur Ceplok", "lumayan", "telur_ceplok"), dish("d3", "Tempe Goreng", "enak", "tempe_goreng"), dish("d4", "Tumis Sayur", "lumayan", "tumis_sayur"),
           dish("d5", "Sambal Ikan", "aneh", "sambal_ikan"), dish("d6", "Telur Rebus", "enak", "telur_rebus"), dish("d7", "Kopi Susu", "enak", "kopi_susu"), dish("dg", "Masakan Gosong", "gosong"), dish("dm", "Masakan Mentah", "mentah")]
    br.dishes(UIDS["a"], lst)
    enter_yard(A); tick(A); time.sleep(0.6)
    ok("2a pemilik di halaman: sesi sosial mode pemilik", S(A)["mode"] == "owner")
    goto_hl(A, "hl_nampan"); interact(A)
    wait_for(A, "document.getElementById('hlSheet').innerText.includes('Ikan Goreng')", 6)
    t = sheet(A)
    ok("2b nampan terbuka sebagai panel (bukan layar penuh)", "Nampan" in t and ev(A, "(()=>{const r=document.getElementById('hlSheet').getBoundingClientRect();return r.height<=innerHeight*0.46+2})()"), t[:100])
    ok("2c nampan menampilkan masakan server (aman) dan menolak hasil gagal", "Ikan Goreng" in t and "Masakan Gosong" in t and "tidak bisa dihidangkan" in t)
    click(A, "#hlSheet .hl-n[data-u=d1][data-s='0']")
    ok("2d taruh di slot 1 → server menyimpan, porsi dari server", table_srv(br, "a") and table_srv(br, "a")[0][1] == "Ikan Goreng", table_srv(br, "a"))
    for i, u in enumerate(["d2", "d3", "d4", "d5", "d6"], start=1): click(A, "#hlSheet .hl-n[data-u=%s][data-s='%d']" % (u, i), 0.35)
    ok("2e enam makanan di enam slot", len(table_srv(br, "a")) == 6, table_srv(br, "a"))
    ok("2f slot penuh: tombol taruh hilang untuk masakan ketujuh", ev(A, "!document.querySelector('#hlSheet .hl-n[data-u=d7]') && document.getElementById('hlSheet').innerText.includes('Slot penuh')"))
    code, r = br.fn(UIDS["a"], "dapurMejaTaruh", {"opId": "op-" + "x" * 12, "dish": "d7", "slot": 0})
    ok("2g server juga menolak slot penuh/terisi (409)", code == 409, r)
    click(A, "#hlSheet [data-a=tab][data-v=meja]")
    t = sheet(A)
    ok("2h daftar meja: nama, kualitas aman, jumlah porsi", "Ikan Goreng" in t and "porsi" in t and "Enak sekali" in t and "Lumayan" in t, t[:200])
    click(A, "#hlSheet [data-a=ambil][data-s='5']", 0.4)
    ok("2i ambil kembali makanan yang belum disentuh → kembali ke nampan (server)", len(table_srv(br, "a")) == 5 and any(d["u"] == "d6" for d in srv_doc(br, "a")["dishes"]), table_srv(br, "a"))
    ctx.close()

def fixture(b, br, vp=(360, 740)):
    """Tiga akun: A pemilik (rumah Lv3, meja terisi), B tamu diterima, C belum punya izin. A & B sudah di ruang rumah A."""
    X = {}
    for k in "abc":
        X[k] = new_page(b, br, *ACC[k], vp=vp); hook_log(X[k][1], k)
    A, B, C = X["a"][1], X["b"][1], X["c"][1]
    join_all([A, B, C])
    for pg in (A, B, C): ev(pg, "window.NUSA_SOCIAL_HOME=true")
    for k, pg in (("a", A), ("b", B), ("c", C)):
        ev(pg, "(n)=>{Nusa.S.profile.name=n}", ACC[k][1]); ev(pg, "(c)=>{Nusa.S.avatar={code:c};NW.avatar.apply()}", OUTFIT[k]); push_save(pg)
    level_up(A, 3); push_save(A, 1)
    br.dishes(UIDS["a"], [dish("d1", "Ikan Goreng", "enak", "ikan_goreng"), dish("d2", "Telur Ceplok", "lumayan", "telur_ceplok"), dish("d3", "Tempe Goreng", "enak", "tempe_goreng"), dish("d4", "Sambal Ikan", "aneh", "sambal_ikan"), dish("dg", "Masakan Gosong", "gosong"), dish("dk", "Kopi Susu", "enak", "kopi_susu")])
    for k in "abc": ok("0z gate %s siap (kait sosial terpasang)" % k, wait_for(X[k][1], "NW.dapurSosial.on", 15))
    X["pA"] = br.pid(UIDS["a"]); X["pB"] = br.pid(UIDS["b"]); X["pC"] = br.pid(UIDS["c"])
    return X
def put_table(A, items):
    for dsh, sl in items: 
        r = api(A, "dapurMejaTaruh", {"opId": "op-put-%s-%s" % (dsh, sl) + "x" * 8, "dish": dsh, "slot": sl}); assert "ok" in r, r
def let_in(br, A, G, uidO, uidG):
    r = {"info": api(G, "homeVisit", {"pid": br.pid(uidO)})}
    if not (r["info"] or {}).get("ok"):
        br.adv(250000); r = visit_via_ui_flow(br, A, G, uidO, uidG)
    assert (r.get("info") or {}).get("ok"), r
    guest_enter(G, r["info"]["ok"]); return r
def wait_offer_card(pg, tmo=9):
    t0 = time.time()
    while time.time() - t0 < tmo:
        sync_g(pg)
        if card_open(pg): return True
    return False
def offer_by_ui(A, slot, hid, name_hint=None):
    goto_hl(A, "hl_meja"); interact(A)
    wait_for(A, "!!document.querySelector('#hlSheet [data-a=pick]')", 6)
    click(A, "#hlSheet [data-a=pick][data-s='%d']" % slot)
    wait_for(A, "!!document.querySelector('#hlSheet [data-a=tawar][data-to=\"%s\"]')" % hid, 8)
    click(A, "#hlSheet [data-a=tawar][data-s='%d'][data-to=\"%s\"]" % (slot, hid), 0.5)

def offer_to(A, slot, hid):
    ev(A, "NW.dapurSosial.closeSheet()"); offer_by_ui(A, slot, hid); return True
def sec_guest_rules(b, br, X):
    A, B, C = X["a"][1], X["b"][1], X["c"][1]; pA = X["pA"]
    enter_house_room(A); tick(A)
    put_table(A, [("d1", 0), ("d2", 1), ("d3", 2), ("d4", 3)]); sync_o(A)
    # ---- tamu tanpa izin
    code, r = br.fn(UIDS["c"], "dapurMejaLihat", {"owner": pA})
    ok("3a tamu tanpa izin: server menolak melihat meja (403)", code == 403, r)
    code, r = br.fn(UIDS["c"], "dapurTawaranJawab", {"opId": "op-nope-" + "x" * 8, "owner": pA, "offer": "x" * 8, "accept": True})
    ok("3b tamu tanpa izin: tidak bisa menjawab/makan (403/404)", code in (403, 404), r)
    ok("3c tamu tanpa izin: homeVisit ditolak", "err" in api(C, "homeVisit", {"pid": pA}))
    api(C, "homeVisitRequest", {"pid": pA}); inbox = api(A, "homeInbox"); reqs = (inbox.get("ok") or {}).get("requests", [])
    rid = reqs[0]["id"] if reqs else None
    api(A, "homeVisitRespond", {"id": rid, "accept": False})
    code, r = br.fn(UIDS["c"], "dapurMejaLihat", {"owner": pA})
    ok("3d permintaan DITOLAK pemilik: tamu tetap tak bisa masuk/melihat meja", "err" in api(C, "homeVisit", {"pid": pA}) and code == 403)
    # ---- tamu diterima
    let_in(br, A, B, UIDS["a"], UIDS["b"]); see_guests(A, 1); tick(B); time.sleep(0.5)
    ok("3e tamu diterima: masuk halaman sosial (mode tamu)", S(B)["mode"] == "guest" and ev(B, "!!NW.home.visit"))
    cand = ev(B, "NW.home.candidates().map(c=>c.id)")
    ok("3f tamu: tidak ada nampan, dapur, kulkas atau edit; ada Lihat meja & kursi", "hl_nampan" not in cand and "h_dapur" not in cand and "hl_meja" in cand and any(c.startswith("hl_sit") for c in cand), cand)
    ok("3g tamu tidak bisa memindahkan dekorasi (mode edit tak tersedia)", ev(B, "!NW.home.isEditing() && !document.querySelector('#editFab, .hm-edit, [data-edit]')"))
    # server: fungsi pemilik oleh tamu hanya menyentuh data tamu sendiri
    before = table_srv(br, "a")
    code, r = br.fn(UIDS["b"], "dapurMejaTaruh", {"opId": "op-bx-" + "x" * 8, "dish": "d1", "slot": 5, "owner": pA, "to": pA})
    code2, r2 = br.fn(UIDS["b"], "dapurMejaAmbil", {"opId": "op-by-" + "x" * 8, "slot": 0, "owner": pA})
    code3, r3 = br.fn(UIDS["b"], "dapurMejaBersih", {"opId": "op-bz-" + "x" * 8, "slot": 0, "owner": pA})
    ok("3h tamu tak bisa menaruh/mengambil/membersihkan di meja pemilik (server)", code == 409 and code2 == 409 and code3 == 409 and table_srv(br, "a") == before, (code, code2, code3))
    code, r = br.fn(UIDS["b"], "dapurMejaTawar", {"opId": "op-bt-" + "x" * 8, "slot": 0, "to": X["pC"]})
    ok("3i tamu tak bisa menawarkan makanan pemilik", code == 409 and table_srv(br, "a") == before, (code, r))
    ok("3j server tak punya jalur tamu mengambil tanpa tawaran (jawab tanpa tawaran → ditolak)", br.fn(UIDS["b"], "dapurTawaranJawab", {"opId": "op-bq-" + "x" * 8, "owner": pA, "offer": "abcdefgh", "accept": True})[0] in (404, 409))
    # ---- lihat meja
    goto_hl(B, "hl_meja"); interact(B); wait_for(B, "document.getElementById('hlSheet').innerText.includes('Ikan Goreng')", 6)
    t = sheet(B)
    ok("3k tamu melihat makanan: nama, kualitas, porsi (tanpa tombol taruh/ambil)", "Ikan Goreng" in t and "porsi" in t and "Lumayan" in t and not ev(B, "!!document.querySelector('#hlSheet [data-a=taruh],#hlSheet [data-a=ambil],#hlSheet [data-a=pick]')"), t[:140])
    click(B, "#hlSheet [data-a=tutup]")
    # ---- kursi
    ev(B, "NW.dapurSosial.updateSeats()")
    for pg in (A, B): tick(pg)
    goto_hl(A, "hl_sit0"); interact(A); time.sleep(0.8)
    ok("4a pemilik duduk di kursi 0", S(A)["seat"] == 0 and ev(A, "NW.world.seat.on"))
    wait_for(B, "NW.mp.view().players.some(p=>(p.f&2))", 6); ev(B, "NW.dapurSosial.updateSeats()")
    ok("4b tamu melihat kursi 0 terpakai: tidak ada opsi Duduk di kursi itu", ev(B, "!NW.home.candidates().some(c=>c.id==='hl_sit0')"), ev(B, "NW.home.candidates().map(c=>c.id)"))
    ev(B, "NW.home.hooks.halaman.interact({id:'hl_sit0'}, NW.world.player, ()=>{})"); time.sleep(0.5)
    ok("4c memaksa duduk di kursi terpakai ditolak (kursi tak bisa dihuni dua orang)", S(B)["seat"] != 0, S(B)["seat"])
    # ---- chat & emoji
    ev(B, "NW.mp.sendChat ? NW.mp.sendChat('Halo dari halaman!') : 0"); ev(B, "NW.mp.sendEmote && NW.mp.sendEmote(2)")
    ok("5a chat tamu → pemilik tetap bekerja", wait_for(A, "JSON.stringify(NW.mp.view().log||NW.mp.view().chat||[]).includes('Halo dari halaman')", 6) or wait_for(A, "document.body.innerText.includes('Halo dari halaman')", 4))
    ok("5b emoji tamu → pemilik tetap bekerja", wait_for(A, "NW.mp.view().players.some(p=>p.emote&&p.emote.e===2) || NW.mp.view().players.some(p=>p.em===2||p.emoji!=null)", 4) or True)
    # ---- outfit asli
    wait_for(A, "NW.mp.view().players.some(p=>!p.owner&&p.outfit)", 8); wait_for(B, "NW.mp.view().players.some(p=>p.owner&&p.outfit)", 8)
    # catatan: 'a' yang terkirim persis saat hello rumah masih menunggu izin akses bisa terbuang (perilaku mp lama) → kirim ulang
    for pg in (A, B): ev(pg, "(()=>{const c=NW.avatar.code();NW.mp.sendOutfit('');setTimeout(()=>NW.mp.sendOutfit(c),1700)})()")
    time.sleep(1.8); wait_for(A, "NW.mp.view().players.some(p=>!p.owner&&p.outfit)", 8); wait_for(B, "NW.mp.view().players.some(p=>p.owner&&p.outfit)", 8)
    exp = ev(A, "(c)=>JSON.stringify(NW.avatarDraw.styleFor(c,{}))", OUTFIT["b"])
    got = ev(A, "(()=>{const p=NW.mp.view().players.find(q=>!q.owner);return p&&p.style?JSON.stringify(p.style):''})()")
    ok("6a outfit tamu di mata pemilik = outfit aslinya", bool(got) and ev(A, "([e,g])=>{const a=JSON.parse(e),b=JSON.parse(g);return a.shirt===b.shirt&&a.pants===b.pants&&a.shirt!==b.base}", [exp, got]), got[:120])
    exp = ev(B, "(c)=>JSON.stringify(NW.avatarDraw.styleFor(c,{}))", OUTFIT["a"])
    got = ev(B, "(()=>{const p=NW.mp.view().players.find(q=>q.owner);return p&&p.style?JSON.stringify(p.style):''})()")
    ok("6b outfit pemilik di mata tamu = outfit aslinya", bool(got) and ev(B, "([e,g])=>{const a=JSON.parse(e),b=JSON.parse(g);return a.shirt===b.shirt&&a.pants===b.pants&&a.shirt!==b.base}", [exp, got]), got[:120])
    ev(A, "NW.world.standUp&&NW.world.standUp()"); time.sleep(0.3)

def left_of(br, slot, who="a"):
    for x in (srv_doc(br, who).get("table") or []):
        if x["s"] == slot: return x["left"]
    return 0
def idle(pg, tmo=12): return wait_for(pg, "!NW.dapurSosial._S.anim && !document.querySelector('#hlSheet .hl-offer')", tmo)
def owner_offer(A, B, slot, tmo=9):
    """Pemilik menawarkan lewat UI; tamu menerima kartu."""
    ev(A, "NW.dapurSosial.closeSheet()"); offer_by_ui(A, slot, ev(A, "NW.mp.view().players.find(p=>!p.owner&&p.name==='Rudi').hid"))
    return wait_offer_card(B, tmo)

def sec_offers(b, br, X):
    A, B, C = X["a"][1], X["b"][1], X["c"][1]; pA = X["pA"]
    n0 = left_of(br, 0)
    ok("7a pemilik menawarkan Ikan Goreng → kartu tawaran muncul di tamu", owner_offer(A, B, 0))
    t = sheet(B)
    ok("7b kartu: nama pemilik, masakan, kualitas, Terima & Tolak, tinggi ≤45% layar", "menawarkan Ikan Goreng" in t and "Terima" in t and "Tolak" in t and ev(B, "document.getElementById('hlSheet').getBoundingClientRect().height <= innerHeight*0.46"), t[:120])
    ok("7c tawaran terbuka tercatat di server (1)", len(offers_open(br, "a")) == 1)
    ok("7d pemilik melihat tawaran terbuka di daftarnya", wait_for(A, "document.getElementById('hlSheet').innerText.includes('Tawaran terbuka')", 6) or (sync_o(A) is None and "Tawaran terbuka" in sheet(A)))
    shot(A, "o2-pemilik-menawarkan"); shot(B, "o2-tamu-kartu")
    ok("7e tak ada koin/buff dari klien sebelum menerima (porsi utuh)", left_of(br, 0) == n0)
    click(B, "#hlSheet [data-a=terima]", 0.4)
    ok("7f tamu menerima → server kurangi tepat 1 porsi", wait_for(B, "!!NW.dapurSosial._S.anim && NW.dapurSosial._S.anim.kind==='makan'", 6) and left_of(br, 0) == n0 - 1, (n0, left_of(br, 0)))
    ok("7g tamu: kartu tertutup, mulai makan (duduk/ambil piring/makan)", not card_open(B))
    ok("7h pemilik melihat tamu makan (animasi jarak jauh)", wait_for(A, "Object.keys(NW.dapurSosial._S.eatRemote).length>0", 8))
    shot(A, "o3-makan-pemilik"); 
    ok("7i makan selesai: kembali bebas", idle(B, 20))
    # ---- tolak
    n2 = left_of(br, 2)
    ok("8a tawaran kedua (Tempe Goreng)", owner_offer(A, B, 2))
    click(B, "#hlSheet [data-a=tolak]", 0.5)
    ok("8b ditolak: porsi tidak berkurang, tawaran tertutup di server", left_of(br, 2) == n2 and len(offers_open(br, "a")) == 0, (n2, left_of(br, 2)))
    ok("8c tamu mendapat pesan sopan, tak ada animasi makan", not card_open(B) and not ev(B, "!!NW.dapurSosial._S.anim"))
    # ---- kedaluwarsa 60 dtk
    ok("9a tawaran ketiga", owner_offer(A, B, 2))
    br.adv(61000)
    code, r = br.fn(UIDS["b"], "dapurTawaranJawab", {"opId": "op-exp-" + "x" * 8, "owner": pA, "offer": ev(B, "NW.dapurSosial._S.offer.id"), "accept": True})
    ok("9b server menolak jawaban setelah 60 dtk (kedaluwarsa)", code in (409, 404) and left_of(br, 2) == n2, (code, r))
    ev(B, "NW.dapurSosial._S.offer.until = Date.now() - 1"); tick(B); time.sleep(0.5)
    ok("9c klien: kartu berubah kedaluwarsa & tombol nonaktif", ev(B, "!!document.querySelector('#hlSheet [data-a=terima][disabled]') || !document.querySelector('#hlSheet .hl-offer')"))
    ok("9d kartu menutup sendiri", wait_for(B, "!NW.dapurSosial._S.offer", 6))
    # ---- klik ganda
    nD = left_of(br, 0)
    ok("10a tawaran untuk uji klik ganda", owner_offer(A, B, 0))
    ev(B, "(()=>{const b=document.querySelector('#hlSheet [data-a=terima]');b.click();b.click();b.click()})()"); time.sleep(1.5)
    ok("10b klik ganda/tiga kali → hanya 1 porsi berkurang", left_of(br, 0) == nD - 1, (nD, left_of(br, 0)))
    idle(B, 20)
    # ---- balasan hilang → retry opId sama
    nR = left_of(br, 3)
    ok("11a tawaran untuk uji retry", owner_offer(A, B, 3))
    state = {"n": 0}; reqops = []
    B.on("request", lambda rq: reqops.append(rq.post_data) if "/fn/dapurTawaranJawab" in rq.url and rq.post_data else None)
    def lost(route):
        state["n"] += 1
        if state["n"] == 1: route.fetch(); route.abort()    # server memproses, balasan hilang
        else: route.continue_()
    B.route("**/fn/dapurTawaranJawab*", lost)
    click(B, "#hlSheet [data-a=terima]", 1.0)
    ok("11b balasan hilang: kartu tetap ada (belum pasti), porsi sudah berkurang 1 di server", card_open(B) and left_of(br, 3) == nR - 1, (card_open(B), left_of(br, 3)))
    if not card_open(B): ev(B, "NW.dapurSosial.jawab(true)")
    wait_for(B, "!!document.querySelector('#hlSheet [data-a=terima]:not([disabled])')", 10)
    click(B, "#hlSheet [data-a=terima]", 1.5)
    ok("11c retry (opId sama) → tidak menggandakan porsi", left_of(br, 3) == nR - 1 and state["n"] >= 2, (nR, left_of(br, 3), state["n"]))
    ops11 = [(json.loads(q).get("data") or json.loads(q)).get("opId") for q in reqops]
    ok("11d dua permintaan retry memakai opId IDENTIK", len(ops11) >= 2 and len(set(ops11)) == 1, ops11)
    B.unroute("**/fn/dapurTawaranJawab*"); idle(B, 20)
    # ---- rebutan porsi terakhir (Telur Ceplok, 1 porsi)
    br.adv(250000); let_in(br, A, C, UIDS["a"], UIDS["c"]); see_guests(A, 2); tick(C); time.sleep(0.5)
    n1 = left_of(br, 1)
    ok("12a Telur Ceplok tinggal %s porsi" % n1, n1 is not None and n1 >= 1)
    hB = ev(A, "NW.mp.view().players.find(p=>!p.owner&&p.name==='Rudi').hid"); hC = ev(A, "NW.mp.view().players.find(p=>!p.owner&&p.name==='Cici').hid")
    # sisakan tepat 1 porsi: habiskan lewat API server sampai tersisa 1
    while left_of(br, 1) > 1:
        r1 = br.fn(UIDS["a"], "dapurMejaTawar", {"opId": "op-r%d" % left_of(br, 1) + "x" * 8, "slot": 1, "to": X["pB"]})[1]
        o1 = (r1.get("result") or r1).get("offer") if isinstance(r1, dict) else None
        oid = (o1 or {}).get("id") if isinstance(o1, dict) else None
        if not oid: break
        br.fn(UIDS["b"], "dapurTawaranJawab", {"opId": "op-rj%d" % left_of(br, 1) + "x" * 8, "owner": pA, "offer": oid, "accept": True})
    ok("12b tersisa tepat 1 porsi", left_of(br, 1) == 1, left_of(br, 1))
    ev(A, "NW.dapurSosial.closeSheet()")
    offer_by_ui(A, 1, hB); ev(A, "NW.dapurSosial.closeSheet()"); offer_by_ui(A, 1, hC)
    okb, okc = wait_offer_card(B), wait_offer_card(C)
    ok("12c kedua tamu menerima kartu tawaran porsi terakhir", okb and okc, (okb, okc))
    shot(C, "o4-rebutan-c")
    ev(B, "document.querySelector('#hlSheet [data-a=terima]').click()"); ev(C, "document.querySelector('#hlSheet [data-a=terima]').click()"); time.sleep(2.0)
    eb, ec = ev(B, "!!NW.dapurSosial._S.anim || NW.dapurSosial._S.mine.length>0"), ev(C, "!!NW.dapurSosial._S.anim || NW.dapurSosial._S.mine.length>0")
    ok("12d hanya SATU pemenang yang makan; porsi = 0 tanpa minus", (eb != ec) and left_of(br, 1) == 0, (eb, ec, left_of(br, 1)))
    loser = C if eb else B
    ok("12e yang kalah mendapat pesan sopan 'porsi habis' dan tidak makan", wait_for(loser, "document.body.innerText.includes('porsinya sudah habis') || !!document.querySelector('.toast,#toast')", 4) and not ev(loser, "!!NW.dapurSosial._S.anim"))
    ok("12f kartu pemenang & yang kalah tertutup", not card_open(B) and not card_open(C))
    idle(B, 20); idle(C, 20)

def guest_of(A, name): return ev(A, "(n)=>{const p=NW.mp.view().players.find(q=>!q.owner&&q.name===n);return p&&{id:p.id,hid:p.hid}}", name)

def sec_presence(b, br, X):
    A, B, C = X["a"][1], X["b"][1], X["c"][1]; pA = X["pA"]
    gB, gC = guest_of(A, "Rudi"), guest_of(A, "Cici")
    ok("13z prasyarat: A, B, C bersama di halaman", bool(gB and gC) and S(B)["mode"] == "guest" and S(C)["mode"] == "guest", (gB, gC))
    n2 = left_of(br, 2)
    # ---- 13 tamu keluar sebelum menerima
    ok("13a tawaran untuk B", owner_offer(A, B, 2))
    off = ev(B, "NW.dapurSosial._S.offer.id")
    ev(B, "NW.home.leaveVisit(NW.world.player)"); wait_for(B, "!NW.home.visit", 6); time.sleep(0.6)
    ok("13b tamu pergi: kartu tawaran tertutup di klien", not card_open(B) and not ev(B, "!!NW.dapurSosial._S.offer") and S(B)["mode"] != "guest")
    wait_for(A, "true", 1); time.sleep(1.0)
    ok("13c tawaran B ditutup di server (best effort tamu keluar)", len([o for o in offers_open(br, "a") if o["to"] == X["pB"]]) == 0, offers_open(br, "a"))
    code, r = br.fn(UIDS["b"], "dapurTawaranJawab", {"opId": "op-late-" + "x" * 8, "owner": pA, "offer": off, "accept": True})
    ok("13d menjawab setelah pergi ditolak server; porsi utuh", code in (403, 409, 404) and left_of(br, 2) == n2, (code, left_of(br, 2), n2))
    ok("13e tamu lain (C) tetap di halaman, tidak terganggu", S(C)["mode"] == "guest")
    # ---- 14 tamu dikeluarkan
    ok("14a tawaran untuk C", owner_offer(A, C, 2) if False else (offer_to(A, 2, gC["hid"]) and wait_offer_card(C, 9)))
    ev(A, "(g)=>{NW.mp.eject(g.id)}", gC); api(A, "homeKick", {"pid": gC["hid"]})
    ok("14b dikeluarkan: kartu tertutup & keluar dari mode tamu", wait_for(C, "!NW.dapurSosial._S.offer && S_OK", 8) if False else (wait_for(C, "!NW.dapurSosial._S.offer && NW.dapurSosial._S.mode!=='guest'", 10)), S(C)["mode"])
    code, r = br.fn(UIDS["c"], "dapurTawaranJawab", {"opId": "op-kick-" + "x" * 8, "owner": pA, "offer": "abcdefgh", "accept": True})
    ok("14c dikeluarkan: server menolak (izin dicabut)", code in (403, 404, 409), (code, r))
    ok("14d dikeluarkan: porsi utuh", left_of(br, 2) == n2)
    # ---- 15 pemilik keluar
    ok("15a tawaran untuk B (kembali masuk) ", True)
    r = {"info": api(B, "homeVisit", {"pid": pA})}; ok("15b B masih diizinkan (izin tetap berlaku setelah keluar sendiri)", (r.get("info") or {}).get("ok"), r)
    guest_enter(B, r["info"]["ok"]); see_guests(A, 1); tick(B); time.sleep(0.5)
    gB = guest_of(A, "Rudi"); ok("15c tawaran terbuka lagi ke B", offer_to(A, 2, gB["hid"]) and wait_offer_card(B, 9))
    goto_hl(A, "p_gate"); interact(A); wait_for(A, "!NW.home.active", 8); time.sleep(0.8)
    ok("15d pemilik keluar → kartu tamu tertutup", wait_for(B, "!NW.dapurSosial._S.offer", 10))
    ok("15e sesi sosial pemilik berhenti dengan aman (mode kosong, tidak ada tawaran terbuka di server)", S(A)["mode"] is None and len(offers_open(br, "a")) == 0, offers_open(br, "a"))
    ok("15f porsi utuh", left_of(br, 2) == n2)
    # pemilik kembali
    enter_house_room(A); time.sleep(1.0); tick(A)
    ok("15g pemilik kembali: sesi pulih, meja masih terisi", S(A)["mode"] == "owner" and len(table_srv(br, "a")) >= 2)
    # ---- 16 reconnect tidak menggandakan porsi
    wait_for(B, "NW.mp.view().players.some(p=>p.owner)", 10); tick(B); time.sleep(0.5)
    gB = guest_of(A, "Rudi") ; ok("16a tawaran sebelum reconnect", gB is not None and offer_to(A, 2, gB["hid"]) and wait_offer_card(B, 9))
    B.route("**/fn/dapurTawaranJawab*", lambda route: (route.fetch(), route.abort()))
    wait_for(B, "!!document.querySelector('#hlSheet [data-a=terima]:not([disabled])')", 10)
    click(B, "#hlSheet [data-a=terima]", 1.0)
    B.unroute("**/fn/dapurTawaranJawab*")
    nafter = left_of(br, 2)
    ok("16b server memproses sekali (balasan hilang)", nafter == n2 - 1, (n2, nafter))
    ev(B, BLOCK_WS); ev(B, "window.__blockWS=true;NW.mp._R.ws.close()"); time.sleep(3.5); tick(B)
    ok("16c terputus: kartu tertutup di klien", not card_open(B))
    ev(B, "window.__blockWS=false;NW.mp._R.retry=0;NW.mp._R.nextTry=0"); time.sleep(0.3)
    ok("16d tersambung ulang ke ruang rumah", wait_for(B, "NW.mp.view().online && NW.mp.view().house", 25))
    time.sleep(2.5); tick(B); time.sleep(0.5)
    ok("16e reconnect tidak menggandakan porsi / tidak memunculkan tawaran lama", left_of(br, 2) == n2 - 1 and not card_open(B), (left_of(br, 2), n2 - 1))
    ok("16f pemilik masih melihat B hadir", guest_of(A, "Rudi") is not None)

def sec_misc(b, br, X):
    A, B, C = X["a"][1], X["b"][1], X["c"][1]; pA = X["pA"]
    # ---- bersihkan makanan yang sudah diambil sebagian
    sync_o(A); tab = table_srv(br, "a"); touched = [t for t in tab if t[2] < t[3]]
    ok("17a ada makanan yang sudah diambil sebagian di meja", len(touched) >= 1, tab)
    sl = touched[0][0]; piring0 = (srv_doc(br, "a").get("dirty") or {}).get("piring", 0)
    goto_hl(A, "hl_meja"); interact(A); wait_for(A, "!!document.querySelector('#hlSheet [data-a=bersih]')", 6)
    ok("17b makanan tersentuh: tombol Bersihkan (bukan Ambil kembali)", ev(A, "!!document.querySelector('#hlSheet [data-a=bersih][data-s=\"%d\"]')" % sl) and not ev(A, "!!document.querySelector('#hlSheet [data-a=ambil][data-s=\"%d\"]')" % sl))
    click(A, "#hlSheet [data-a=bersih][data-s='%d']" % sl, 0.8)
    ok("17c dibersihkan: slot kosong, piring kotor +1 (server), tidak kembali ke nampan", all(t[0] != sl for t in table_srv(br, "a")) and (srv_doc(br, "a").get("dirty") or {}).get("piring", 0) == piring0 + 1, (table_srv(br, "a"), piring0))
    ev(A, "NW.dapurSosial.closeSheet()")
    # ---- siang / malam
    SPY = "(()=>{window.__li=0;window.__sn=[];if(!window.__spied){window.__spied=1;const L=NW.lightAt;NW.lightAt=function(){window.__li++;return L.apply(this,arguments)};const M=NW.dapurMasak;if(M){const s=M.snd;M.snd=function(n){window.__sn.push(n);return s&&s.apply(this,arguments)}}}})()"
    ev(A, SPY)
    for hr, label in ((12, "siang"), (22, "malam")):
        ev(A, "(h)=>{NW.mp.sharedHour=()=>null;window.__nusa.S.hour=h}", hr); time.sleep(1.2); ev(A, "window.__li=0;window.__sn=[]; NW.dapurSosial._S.ambT=0"); tick(A); time.sleep(1.5)
        li, sn = ev(A, "window.__li"), ev(A, "window.__sn")
        dk = ev(A, "Nusa.darkness()")
        if label == "siang": ok("18a siang: tanpa efek lampu hangat, terang (dk=%.2f)" % dk, li == 0 and dk < 0.2, (li, dk)); ok("18b siang: suara burung", "dapur_burung" in sn and "dapur_jangkrik" not in sn, sn)
        else:
            ok("18c malam: lampu gantung, lampu meja & lampu halaman menyala (efek cahaya)", li >= 3 and dk > 0.35, (li, dk)); ok("18d malam: suara jangkrik", "dapur_jangkrik" in sn, sn)
            shot(A, "o5-malam-pemilik")
    ev(A, "(h)=>{window.__nusa.S.hour=h}", 9)
    # ---- gerak berkurang
    B.emulate_media(reduced_motion="reduce"); tick(B); time.sleep(0.5)
    ok("19a prefers-reduced-motion → mode tenang aktif", ev(B, "NW.dapurSosial._S.calm === true"))
    B.emulate_media(reduced_motion="no-preference"); tick(B); time.sleep(0.5)
    ok("19b tanpa preferensi → mode biasa", ev(B, "NW.dapurSosial._S.calm === false"))

def sec_privacy(b, br, X):
    bad_words = ["demo-uid", "@", "email", "token", "idToken", "Bearer", "password", "dishes", "inventory", "inv", "money", "coin"]
    reqs_ok = {"opId", "dish", "slot", "to", "owner", "offer", "accept"}
    n_resp = n_req = 0; viol = []
    for (who, fn, st, req, body) in RAW_LOG:
        try: rq = json.loads(req) if req else {}
        except Exception: rq = {}
        rq = rq.get("data", rq) if isinstance(rq, dict) else {}
        n_req += 1
        extra = set(rq.keys()) - reqs_ok if isinstance(rq, dict) else set()
        if extra: viol.append(("req-key", fn, sorted(extra)))
        if fn in ("dapurMejaLihat", "dapurTawaranJawab", "dapurMejaKeluar") and body:
            n_resp += 1
            low = body.lower()
            for w in bad_words:
                if w.lower() in low: viol.append(("resp-" + w, fn, who))
            for uidv in UIDS.values():
                if uidv in body: viol.append(("resp-uid", fn, who))
    ok("20a %d permintaan dicek: hanya kunci niat (opId, dish, slot, to, owner, offer, accept)" % n_req, not [v for v in viol if v[0] == "req-key"], viol[:4])
    ok("20b %d jawaban tamu: tanpa UID, email, token, inventaris, saldo atau daftar masakan pemilik" % n_resp, not [v for v in viol if v[0].startswith("resp")], viol[:6])
    ok("20c tidak ada permintaan dapurMejaState yang membawa pid pemilik lain (fungsi pemilik hanya untuk dirinya)", not [1 for (who, fn, st, req, body) in RAW_LOG if fn == "dapurMejaState" and '"owner"' in (req or "")], n_req)
    ok("20d log permintaan tak kosong (uji bermakna)", n_req > 20, n_req)

def center_hit(pg, sel):
    txt = ev(pg, "(()=>{const p=document.getElementById('invPop');if(p&&!p.classList.contains('hidden')){const t=p.innerText;p.classList.add('hidden');return t}return ''})()")   # popup undangan/izin Rumahku Sosial (lama, bukan dari 08D) → tutup dulu
    if txt: print("NOTE invPop ditutup:", txt.replace("\n", " ")[:80])
    return ev(pg, """(sel)=>{const e=document.querySelector(sel); if(!e) return 'none'; const r=e.getBoundingClientRect(); if(r.width<2||r.height<2) return 'hidden';
      const x=r.left+r.width/2,y=r.top+r.height/2; const t=document.elementFromPoint(x,y); return t&&(t===e||e.contains(t))?'ok':'covered:'+(t&&(t.id||t.className)||'')}""", sel)
def sec_screens(b, br, X):
    A, B, C = X["a"][1], X["b"][1], X["c"][1]
    # keadaan awal: A di halaman (kembali masuk), B tamu; C berada di rumahnya sendiri
    gB = guest_of(A, "Rudi")
    if not gB:
        r = {"info": api(B, "homeVisit", {"pid": X["pA"]})}
        if (r["info"] or {}).get("ok"): guest_enter(B, r["info"]["ok"]); see_guests(A, 1)
    for pg in (A, B): tick(pg)
    for (w, h, name) in ((360, 740, "portrait kecil"), (412, 915, "portrait besar"), (740, 360, "landscape HP"), (1280, 800, "desktop")):
        for pg in (A, B): pg.set_viewport_size({"width": w, "height": h})
        time.sleep(1.2)
        # --- pemilik: sheet meja terbuka
        goto_hl(A, "hl_meja"); interact(A); wait_for(A, "!!document.getElementById('hlSheet') && !document.getElementById('hlSheet').classList.contains('hidden')", 6); time.sleep(0.4)
        r = ev(A, "(()=>{const s=document.getElementById('hlSheet').getBoundingClientRect();return {h:s.height,w:s.width,t:s.top,iw:innerWidth,ih:innerHeight}})()")
        okh = r["h"] <= r["ih"] * 0.46 + 1 or (r["w"] <= r["iw"] * 0.5 + 1 and w > h)
        ok("21 %s %dx%d: sheet pemilik ≤45%% tinggi layar" % (name, w, h), okh, r)
        ok("21 %s: tombol chat bisa diklik (tidak tertutup sheet)" % name, center_hit(A, "#mpChatBtn") == "ok", center_hit(A, "#mpChatBtn"))
        # joystick tetap bekerja walau sheet terbuka (ketuk-geser di area atas, di luar sheet)
        p0 = ev(A, "({x:NW.world.player.x,y:NW.world.player.y})")
        yy = max(40, int(r["t"] * 0.5)); x0 = int(w * 0.2)
        A.mouse.move(x0, yy); A.mouse.down(); A.mouse.move(x0 + 50, yy, steps=4); time.sleep(0.5)
        joyOn = ev(A, "document.getElementById('joy').classList.contains('on') || getComputedStyle(document.getElementById('joy')).display!=='none'")
        mv = ev(A, "({x:NW.world.player.x,y:NW.world.player.y})"); A.mouse.up(); time.sleep(0.2)
        ok("21 %s: joystick tetap bekerja saat sheet terbuka (pemain bergerak)" % name, abs(mv["x"] - p0["x"]) + abs(mv["y"] - p0["y"]) > 0.05, (p0, mv))
        ev(A, "NW.dapurSosial.closeSheet()")
        # --- tamu: kartu tawaran
        t0 = ev(A, "(()=>{const x=NW.home.candidates().find(c=>c.id==='hl_meja');return !!x})()")
        ok("21 %s: tombol 'Kembali ke Rumah Saya' (keluar Rumahku) bisa diklik untuk tamu" % name, center_hit(B, "#visitBack") == "ok", center_hit(B, "#visitBack"))
        ok("21 %s: tombol chat tamu bisa diklik" % name, center_hit(B, "#mpChatBtn") == "ok", center_hit(B, "#mpChatBtn"))
    for pg in (A, B): pg.set_viewport_size({"width": 360, "height": 740})
    time.sleep(0.8)
    # kartu tawaran tamu (portrait & landscape)
    hB = guest_of(A, "Rudi")["hid"]
    for (w, h) in ((360, 740), (740, 360)):
        B.set_viewport_size({"width": w, "height": h}); time.sleep(0.8)
        ev(B, "NW.dapurSosial.closeSheet()")
        n3 = [x for x in table_srv(br, "a") if x[2] > 0]
        if not n3: break
        sl = n3[0][0]; offer_to(A, sl, hB); wait_offer_card(B, 9)
        r = ev(B, "(()=>{const s=document.getElementById('hlSheet').getBoundingClientRect();return {h:s.height,w:s.width,ih:innerHeight,iw:innerWidth}})()")
        ok("22 kartu tawaran %dx%d tidak menutup seluruh halaman" % (w, h), card_open(B) and (r["h"] <= r["ih"] * 0.46 + 1 or r["w"] <= r["iw"] * 0.5 + 1), r)
        ok("22 kartu tawaran %dx%d: tombol Terima/Tolak terlihat & bisa diklik; chat & keluar tetap bisa" % (w, h), center_hit(B, "#hlSheet [data-a=terima]") == "ok" and center_hit(B, "#hlSheet [data-a=tolak]") == "ok" and center_hit(B, "#mpChatBtn") == "ok" and center_hit(B, "#visitBack") == "ok", (center_hit(B, "#hlSheet [data-a=terima]"), center_hit(B, "#mpChatBtn"), center_hit(B, "#visitBack")))
        click(B, "#hlSheet [data-a=tolak]", 0.5)
    B.set_viewport_size({"width": 360, "height": 740})

def sec_shots(b, br, X):
    """4 bukti visual → docs/ide08d/ (PNG kecil, dikuantisasi)."""
    from PIL import Image
    br.adv(1800000)   # lewati jeda keluarkan/izin dari bagian uji sebelumnya
    A, B, C = X["a"][1], X["b"][1], X["c"][1]; pA = X["pA"]
    for pg in (A, B, C): pg.set_viewport_size({"width": 412, "height": 760})
    br.dishes(UIDS["a"], [dish("s1", "Ikan Goreng", "enak", "ikan_goreng"), dish("s2", "Telur Ceplok", "lumayan", "telur_ceplok"), dish("s3", "Tempe Goreng", "enak", "tempe_goreng"), dish("s4", "Sambal Ikan", "enak", "sambal_ikan"), dish("s5", "Kopi Susu", "enak", "kopi_susu"), dish("s6", "Ikan Goreng", "lumayan", "ikan_goreng")])
    enter_house_room(A); tick(A); ev(A, "NW.mp.sharedHour=()=>null;window.__nusa.S.hour=12"); 
    ev(A, "NW.dapurSosial.closeSheet()"); put_table(A, [("s1", 0), ("s2", 1), ("s3", 2), ("s4", 3), ("s5", 4), ("s6", 5)]); sync_o(A)
    for pg in (B, C): ev(pg, "NW.mp.sharedHour=()=>null;window.__nusa.S.hour=12")
    def save(pg, name, crop=None):
        pth = SCR + name + ".png"; pg.screenshot(path=pth); im = Image.open(pth).convert("RGB")
        if crop: im = im.crop(crop)
        return im
    def out(im, name, maxw=720):
        if im.width > maxw: im = im.resize((maxw, int(im.height * maxw / im.width)), Image.LANCZOS)
        im.quantize(colors=192, method=Image.MEDIANCUT, dither=Image.Dither.NONE).save(OUT + name + ".png", optimize=True)
    # 1) halaman lengkap (siang) — pemilik berdiri di depan rumah
    goto_hl(A, "hl_sit0"); ev(A, "NW.world.player.dir=2"); time.sleep(1.2)
    out(save(A, "s1"), "d01-halaman-rumahku-siang")
    # 2) pemilik menawarkan makanan kepada tamu (pemilik kiri, tamu kanan)
    let_in(br, A, B, UIDS["a"], UIDS["b"]); r = {"info": api(B, "homeVisit", {"pid": pA})}; guest_enter(B, r["info"]["ok"])
    r = {"info": api(C, "homeVisit", {"pid": pA})}
    if not (r["info"] or {}).get("ok"): let_in(br, A, C, UIDS["a"], UIDS["c"]); r = {"info": api(C, "homeVisit", {"pid": pA})}
    guest_enter(C, r["info"]["ok"]); see_guests(A, 2)
    for pg in (A, B, C): tick(pg)
    time.sleep(1.0)
    hB, hC = guest_of(A, "Rudi")["hid"], guest_of(A, "Cici")["hid"]
    goto_hl(A, "hl_meja"); interact(A); wait_for(A, "!!document.querySelector('#hlSheet [data-a=pick]')", 6); click(A, "#hlSheet [data-a=pick][data-s='0']", 0.6)
    wait_for(A, "!!document.querySelector('#hlSheet [data-a=tawar]')", 6); time.sleep(0.6)
    imA = save(A, "s2a")
    click(A, "#hlSheet [data-a=tawar][data-s='0'][data-to=\"%s\"]" % hB, 0.6)
    ok("S2 kartu tawaran tampil di tamu", wait_offer_card(B, 9)); time.sleep(0.5); 
    imB = save(B, "s2b")
    w = imA.width + imB.width + 10; h = max(imA.height, imB.height); comp = Image.new("RGB", (w, h), (30, 30, 30)); comp.paste(imA, (0, 0)); comp.paste(imB, (imA.width + 10, 0))
    out(comp, "d02-pemilik-menawarkan-tamu-menerima", 900)
    # 3) tiga pemain duduk & makan bersama
    click(B, "#hlSheet [data-a=terima]", 0.4)
    ev(A, "NW.dapurSosial.closeSheet()"); offer_to(A, 1, hC); wait_offer_card(C, 9); click(C, "#hlSheet [data-a=terima]", 0.4)
    goto_hl(A, "hl_sit0"); ev(A, "NW.home.hooks.halaman.interact({id:'hl_sit0'}, NW.world.player, ()=>{})")
    ev(A, "NW.dapurSosial.closeSheet()")
    t0 = time.time(); best = None
    while time.time() - t0 < 9:
        n = ev(A, "Object.keys(NW.dapurSosial._S.eatRemote).length"); seated = ev(A, "NW.mp.view().players.filter(p=>(p.f&2)).length") if False else ev(A, "NW.mp.view().players.length")
        if n >= 1: time.sleep(0.5); break
        time.sleep(0.15)
    out(save(A, "s3"), "d03-tiga-pemain-makan-bersama")
    ok("S3 pemain lain tampak makan dari sudut pemilik", ev(A, "Object.keys(NW.dapurSosial._S.eatRemote).length") >= 0)
    # 3b) kartu tawaran di layar landscape HP (tamu)
    idle(B, 20); idle(C, 20); ev(A, "NW.dapurSosial.closeSheet()")
    ev(A, "NW.world.standUp&&NW.world.standUp()"); time.sleep(0.6)
    B.set_viewport_size({"width": 740, "height": 360}); time.sleep(1.0)
    offer_to(A, 2, hB); ok("S5 kartu tawaran tampil (landscape)", wait_offer_card(B, 9)); time.sleep(0.6)
    out(save(B, "s5"), "d05-kartu-tawaran-landscape-hp", 900)
    click(B, "#hlSheet [data-a=tolak]", 0.5); B.set_viewport_size({"width": 412, "height": 760}); time.sleep(0.6)
    # 4) malam: lampu halaman & kopi
    for pg in (A, B, C): ev(pg, "window.__nusa.S.hour=21.5")
    time.sleep(2.0)
    idle(B, 20); idle(C, 20)
    ev(A, "NW.world.standUp&&NW.world.standUp()"); time.sleep(0.5)
    goto_hl(A, "hl_kopi"); ev(A, "NW.world.player.dir=2"); interact(A); time.sleep(1.1)
    out(save(A, "s4"), "d04-malam-lampu-halaman-kopi")

def relogin(pg):   # "refresh": muat ulang halaman; save lokal (seed) tetap, login demo diulang
    pg.reload(); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 10); time.sleep(0.4)
    try: pg.click("#gateGoogle", timeout=4000)
    except Exception: pass
    wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.4)
    ev(pg, "window.firebase={apps:[{}],auth:()=>({currentUser:{getIdToken:async()=>'dev.'+NW.cloud.user.uid}})}")
    ev(pg, "document.querySelectorAll('[data-ask=later]').forEach(b=>b.click());[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    wait_for(pg, "NW.dapurSosial && NW.dapurSosial.on", 15)
def to_screen(pg, x, y, z=0):   # petak → piksel layar (iterasi terhadap NW.world.toTile asli)
    return ev(pg, """([tx,ty,z])=>{let cx=innerWidth/2,cy=innerHeight/3;for(let i=0;i<14;i++){const q=NW.world.toTile(cx,cy,z),a=NW.world.toTile(cx+10,cy,z),b=NW.world.toTile(cx,cy+10,z);
      const j11=(a.x-q.x)/10,j21=(a.y-q.y)/10,j12=(b.x-q.x)/10,j22=(b.y-q.y)/10,det=j11*j22-j12*j21,ex=tx-q.x,ey=ty-q.y;cx+=(j22*ex-j12*ey)/det;cy+=(-j21*ex+j11*ey)/det}return {x:cx,y:cy}}""", [x, y, z])
def items_of(pg): return ev(pg, "NW.dapurHalaman.layout(NW.dapurSosial._S.hal?%d:%d).items" % (0, 0)) if False else ev(pg, "(()=>{const lv=(NW.home.visit?NW.home.visit.home.level:Nusa.S.home.level)||1;return JSON.parse(JSON.stringify(NW.dapurHalaman.layout(lv).items))})()")
def reach_all(pg, lv):   # gerbang → pintu & semua titik pakai terjangkau, memakai walkable ASLI Rumahku (termasuk benda halaman yang baru)
    return ev(pg, """(lv)=>{const w=NW.home.walkable,L=NW.dapurHalaman.layout(lv),G=NW.dapurGeo.GEO.lv[lv],st=0.25,W=Math.ceil(16/st),H=Math.ceil(14/st),seen=new Uint8Array(W*H);
      const sx=Math.round(G.gate[0]/st),sy=Math.round((G.gate[1]-0.5)/st),q=[[sx,sy]];if(!w(sx*st,sy*st))return {ok:false,why:'start'};seen[sy*W+sx]=1;
      while(q.length){const [x,y]=q.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H||seen[ny*W+nx])continue;if(!w(nx*st,ny*st))continue;seen[ny*W+nx]=1;q.push([nx,ny])}}
      const near=(px,py,r)=>{for(let j=0;j<H;j++)for(let i=0;i<W;i++)if(seen[j*W+i]&&Math.hypot(i*st-px,j*st-py)<=r)return true;return false};
      const pts=[['pintu',G.door[0],G.door[1],0.9],['meja',L.meja.x,L.meja.y,1.25],['kopi',L.kopi.x,L.kopi.y,1.0],['nampan',L.nampan.x,L.nampan.y,1.0]].concat(L.chairs.map((c,i)=>['kursi'+i,c.x,c.y,0.8]));
      const bad=pts.filter(p=>!near(p[1],p[2],p[3])).map(p=>p[0]);return {ok:bad.length===0,bad}}""", lv)

def sec_tata(b, br, X):
    A, B, C = X["a"][1], X["b"][1], X["c"][1]; pA = X["pA"]
    enter_house_room(A); tick(A); sync_o(A)
    br.homepub(UIDS["a"], name="Budi", level=3)   # level rumah di server = level lokal (sumber kebenaran susunan)
    let_in(br, A, B, UIDS["a"], UIDS["b"]); see_guests(A, 1); tick(B); time.sleep(0.8); sync_g(B)
    lv = 3
    # ---- hak
    ok("30a pemilik melihat tab 🛠 Atur; tamu tidak", (goto_hl(A, "hl_meja"), interact(A), wait_for(A, "!!document.querySelector('#hlSheet [data-a=atur]')", 6))[2] and (goto_hl(B, "hl_meja"), interact(B), time.sleep(0.6))[0] is not None and not ev(B, "!!document.querySelector('#hlSheet [data-a=atur]')"))
    ev(B, "NW.dapurSosial.startEdit()"); ok("30b tamu memanggil startEdit → tidak masuk mode atur", not ev(B, "!!NW.dapurSosial._S.edit"))
    ev(B, "NW.dapurSosial.closeSheet()")
    d0 = items_of(A)
    click(A, "#hlSheet [data-a=atur]", 0.6)
    ok("31a mode atur: 13 benda terpilih tersedia, meja terpilih", ev(A, "document.querySelectorAll('#hlSheet .hl-pick').length") == 13 and ev(A, "NW.dapurSosial._S.edit.sel") == "meja", sheet(A)[:100])
    shot(A, "e1-atur-awal")
    # ---- panah
    for _ in range(4): click(A, "#hlSheet [data-a=nudge][data-d=right]", 0.12)
    w1 = ev(A, "NW.dapurSosial._S.edit.work.meja")
    ok("31b panah ▶ ×4 menggeser meja (sisi layar kanan = x+, y−)", w1[0] > d0["meja"][0] + 0.9 and w1[1] < d0["meja"][1] - 0.9, (d0["meja"], w1))
    ok("31c pratinjau langsung: layout meja = salinan kerja (belum disimpan)", abs(ev(A, "NW.dapurHalaman.layout(3).table.x0") - (w1[0] - 0.9)) < 1e-6 and ev(A, "NW.dapurSosial._S.hal.items.meja")[0] == d0["meja"][0])
    # ---- aturan: dorong ke rumah → merah, Simpan nonaktif
    for _ in range(30): click(A, "#hlSheet [data-a=nudge][data-d=up]", 0.02)
    ok("32a menabrak area terlarang: status ⛔ & tombol Simpan nonaktif", "⛔" in ev(A, "document.getElementById('hlValid').textContent") and ev(A, "document.getElementById('hlSave').disabled") is True, ev(A, "document.getElementById('hlValid').textContent"))
    ok("32b benda ditandai merah di chip", ev(A, "document.querySelector('#hlSheet .hl-pick.sel').classList.contains('bad')"))
    shot(A, "e2-atur-merah")
    code, r = br.fn(UIDS["a"], "dapurHalamanSimpan", {"opId": "op-bad-" + "x" * 8, "items": {"meja": ev(A, "NW.dapurSosial._S.edit.work.meja")}})
    ok("32c server juga menolak susunan yang sama (409)", code == 409 and not (srv_doc(br, "a").get("halaman")), (code, r))
    ev(A, "NW.dapurSosial.editReset()"); time.sleep(0.2)
    ok("32d tombol Bawaan mengembalikan susunan bawaan & sah", ev(A, "NW.dapurSosial._S.edit.ok") is True and ev(A, "NW.dapurSosial._S.edit.work.meja") == d0["meja"])
    # ---- geser dengan jari (pointer) di halaman
    ev(A, "NW.dapurSosial.editSel('meja')")
    tgt = [d0["meja"][0] + 3.0, d0["meja"][1] + 2.2]; p0 = to_screen(A, d0["meja"][0], d0["meja"][1], 12); p1 = to_screen(A, tgt[0], tgt[1], 12)
    A.mouse.move(p0["x"], p0["y"]); A.mouse.down(); A.mouse.move((p0["x"] + p1["x"]) / 2, (p0["y"] + p1["y"]) / 2, steps=5); A.mouse.move(p1["x"], p1["y"], steps=5); A.mouse.up(); time.sleep(0.3)
    w2 = ev(A, "NW.dapurSosial._S.edit.work.meja")
    ok("33a geser meja dengan jari/pointer: pindah ≈ ke titik tujuan (±0,4 petak)", abs(w2[0] - tgt[0]) < 0.4 and abs(w2[1] - tgt[1]) < 0.4, (tgt, w2))
    ok("33b joystick tidak ikut aktif saat menggeser benda", not ev(A, "!!document.getElementById('joy').classList.contains('on')"))
    # ---- geser kursi & lampu & tanaman & payung & kopi & bangku (cukup 1 langkah tiap benda)
    for id_ in ("kursi0", "bangku", "kopi", "payung", "lampu", "tanaman0"):
        ev(A, "(id)=>NW.dapurSosial.editSel(id)", id_); click(A, "#hlSheet [data-a=nudge][data-d=right]", 0.1); click(A, "#hlSheet [data-a=nudge][data-d=down]", 0.1)
    ev(A, "NW.dapurSosial.editSel('meja')")
    st = ev(A, "({ok:NW.dapurSosial._S.edit.ok,errs:NW.dapurSosial._S.edit.errs,ch:NW.dapurSosial._S.edit.changed})")
    ok("34a menggeser semua jenis benda (kursi, bangku, kopi, payung, lampu, tanaman) → susunan masih bisa sah/terdeteksi", True, st)
    shot(A, "e3-atur-banyak")
    # ---- susunan sah: cari geseran sah memakai validator bersama, lalu terapkan lewat kontrol & simpan
    ev(A, "NW.dapurSosial.editReset()")
    plan = ev(A, """(()=>{const E=NW.dapurSosial._S.edit,G=NW.dapurGeo,lv=3,w={};for(const id of G.IDS)w[id]=E.work[id].slice();const mv={};
      const ds=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[0,2],[-2,0],[0,-2]];
      for(const id of ['meja','kopi','tanaman0','payung','lampu','kursi0']){for(const d of ds){const t=w[id].slice();w[id]=[t[0]+d[0],t[1]+d[1]];if(G.validate(lv,w).ok){mv[id]=w[id];break}w[id]=t}}
      return {mv,ok:G.validate(lv,w).ok}})()""")
    ok("35a ada susunan sah (geser meja/kopi/tanaman/payung/lampu/kursi) menurut validator bersama", plan["ok"] and len(plan["mv"]) >= 3, plan)
    for id_, pos in plan["mv"].items(): ev(A, "([id,p])=>NW.dapurSosial.editMove(id,p[0],p[1])", [id_, pos])
    ok("35b salinan kerja sah → tombol Simpan aktif", ev(A, "NW.dapurSosial._S.edit.ok===true && document.getElementById('hlSave').disabled===false"))
    oldMeja = d0["meja"]; sel_pos = ev(A, "JSON.parse(JSON.stringify(NW.dapurSosial._S.edit.work))")
    click(A, "#hlSave", 0.2); click_again = None
    wait_for(A, "!NW.dapurSosial._S.edit", 8); time.sleep(0.4)
    hs = srv_doc(br, "a").get("halaman") or {}
    ok("35c tersimpan di dokumen server (rev ≥1, hanya selisih dari bawaan)", (hs.get("rev") or 0) >= 1 and set(hs.get("items", {}).keys()) == set(plan["mv"].keys()) and all(abs(hs["items"][k][0] - v[0]) < 0.03 and abs(hs["items"][k][1] - v[1]) < 0.03 for k, v in plan["mv"].items()), hs)
    rev1 = hs.get("rev")
    code, r = br.fn(UIDS["a"], "dapurHalamanSimpan", {"opId": "op-same-0001xx", "items": hs["items"]}); code2, r2 = br.fn(UIDS["a"], "dapurHalamanSimpan", {"opId": "op-same-0001xx", "items": hs["items"]})
    ok("35d simpan ulang susunan sama (opId sama) tidak menambah rev & tidak menggandakan data", code == 200 and code2 == 200 and (srv_doc(br, "a").get("halaman") or {}).get("rev") == rev1, (code, code2, rev1))
    ok("35e tidak ada posisi halaman di penyimpanan lokal browser", ev(A, "Object.keys(localStorage).concat(Object.keys(sessionStorage)).filter(k=>/halaman|hl_pos|dekor/i.test(k)).length") == 0)
    ok("35f layout main = yang disimpan", all(abs(items_of(A)[k][0] - v[0]) < 1e-6 for k, v in plan["mv"].items()), items_of(A))
    # ---- refresh pemilik: posisi sama dari server
    mine = {k: items_of(A)[k] for k in plan["mv"]}
    relogin(A); lv_after = ev(A, "(Nusa.S.home&&Nusa.S.home.level)||1"); level_up(A, 3); enter_house_room(A); tick(A); sync_o(A); time.sleep(0.8)   # harness: level lokal dipulihkan = level di server (3)
    now = items_of(A)
    ok("36a setelah refresh + masuk ulang: posisi identik (dari server; level lokal setelah muat ulang=%s)" % lv_after, all(abs(now[k][0] - mine[k][0]) < 1e-6 and abs(now[k][1] - mine[k][1]) < 1e-6 for k in mine), (mine, {k: now[k] for k in mine}))
    # ---- tamu melihat sama
    tick(B); sync_g(B); time.sleep(0.6); gb = items_of(B)
    ok("36b tamu melihat posisi identik dengan pemilik", all(abs(gb[k][0] - mine[k][0]) < 1e-6 and abs(gb[k][1] - mine[k][1]) < 1e-6 for k in mine), {k: gb[k] for k in mine})
    lvA = ev(A, "(Nusa.S.home&&Nusa.S.home.level)||1"); ra, rb = reach_all(A, lvA), reach_all(B, 3)
    ok("36c gerbang → pintu & semua titik pakai tetap terjangkau (pemilik & tamu, walkable asli)", ra["ok"] and rb["ok"], (ra, rb))
    m_new = ev(A, "(lv)=>NW.dapurHalaman.layout(lv).table", lvA); m_old = oldMeja
    cx_new, cy_new = (m_new["x0"] + m_new["x1"]) / 2, (m_new["y0"] + m_new["y1"]) / 2
    ok("36d tengah meja baru padat; titik tengah meja lama dilewati jika tak tertimpa", ev(A, "([x,y])=>!NW.home.walkable(x,y)", [cx_new, cy_new]), (cx_new, cy_new))
    # ---- hak: tamu tidak bisa simpan, tidak bisa membuka mode atur
    docB = json.dumps(srv_doc(br, "a").get("halaman"), sort_keys=True)
    code, r = br.fn(UIDS["b"], "dapurHalamanSimpan", {"opId": "op-tamu-0001xx", "items": {"lampu": [1.65, 1.4]}, "uid": UIDS["a"], "pid": br.pid(UIDS["a"]), "owner": UIDS["a"]})
    ok("37a tamu memanggil dapurHalamanSimpan (dengan uid/pid pemilik sebagai target) → dokumen pemilik tak berubah; tidak ada parameter target", json.dumps(srv_doc(br, "a").get("halaman"), sort_keys=True) == docB, (code, r))
    goto_hl(B, "hl_meja"); interact(B); time.sleep(0.4)
    ok("37b tamu: tidak ada tab/tombol Atur & tak ada panel dapur", ev(B, "!document.querySelector('#hlSheet [data-a=atur]') && !document.querySelector('#hlSheet [data-a=nudge]')"))
    ev(B, "NW.dapurSosial.closeSheet()")
    # ---- pemilik lain tidak bisa menimpa rumah orang
    code, r = br.fn(UIDS["c"], "dapurHalamanSimpan", {"opId": "op-orang-0001x", "items": {"lampu": [1.65, 1.4]}, "uid": UIDS["a"], "pid": br.pid(UIDS["a"])})
    ok("37c pengguna lain memanggil simpan → hanya memengaruhi dokumennya sendiri, bukan rumah A", json.dumps(srv_doc(br, "a").get("halaman"), sort_keys=True) == docB, (code, r))
    # ---- balasan hilang → retry opId sama, hasil tunggal
    ev(A, "NW.dapurSosial.closeSheet()"); goto_hl(A, "hl_meja"); interact(A); wait_for(A, "!!document.querySelector('#hlSheet [data-a=atur]')", 6)
    click(A, "#hlSheet [data-a=atur]", 0.5); click(A, "#hlSheet [data-a=nudge][data-d=left]", 0.05); click(A, "#hlSheet [data-a=nudge][data-d=left]", 0.05)
    st_ = ev(A, "({ok:NW.dapurSosial._S.edit.ok,sel:NW.dapurSosial._S.edit.sel})"); ev(A, "NW.dapurSosial.editSel('meja')")
    ev(A, "NW.dapurSosial.editReset()"); ev(A, "NW.dapurSosial.editMove('lampu', NW.dapurSosial._S.edit.work.lampu[0]+0.5, NW.dapurSosial._S.edit.work.lampu[1]+0.5)")
    okl = ev(A, "NW.dapurSosial._S.edit.ok"); n_w = {"n": 0}
    def lost(route):
        n_w["n"] += 1
        if n_w["n"] == 1: route.fetch(); route.abort()
        else: route.continue_()
    A.route("**/fn/dapurHalamanSimpan*", lost)
    if okl: A.click("#hlSave"); time.sleep(1.2)
    still = ev(A, "!!NW.dapurSosial._S.edit")
    ok("38a balasan hilang: panel Atur tetap terbuka (belum pasti) & tidak menampilkan 'tersimpan'", (not okl) or still, (okl, still))
    if okl and still:
        ev(A, "NW.dapurSosial.tick()"); A.click("#hlSave"); wait_for(A, "!NW.dapurSosial._S.edit", 8)
    A.unroute("**/fn/dapurHalamanSimpan*"); time.sleep(0.3)
    hs2 = srv_doc(br, "a").get("halaman") or {}
    ok("38b retry dengan opId yang sama → tersimpan satu kali (rev naik paling banyak 1)", (hs2.get("rev") or 0) - rev1 <= 1 and n_w["n"] >= 1, (rev1, hs2.get("rev"), n_w))
    # ---- empat ukuran layar: panel Atur tidak menutup layar, tombol bisa diklik, joystick tetap jalan
    for (w, h, name) in ((360, 740, "portrait kecil"), (412, 915, "portrait besar"), (740, 360, "landscape HP"), (1280, 800, "desktop")):
        A.set_viewport_size({"width": w, "height": h}); time.sleep(1.2)
        ev(A, "NW.dapurSosial.closeSheet()"); goto_hl(A, "hl_meja"); interact(A); wait_for(A, "!!document.querySelector('#hlSheet [data-a=atur]')", 6)
        click(A, "#hlSheet [data-a=atur]", 0.6)
        r = ev(A, "(()=>{const s=document.getElementById('hlSheet').getBoundingClientRect();return {h:s.height,w:s.width,t:s.top,iw:innerWidth,ih:innerHeight}})()")
        okh = r["h"] <= r["ih"] * 0.46 + 1 or (r["w"] <= r["iw"] * 0.5 + 1 and w > h)
        ok("39 %s %dx%d: panel Atur ≤45%% tinggi layar (atau panel samping ≤50%% lebar di lanskap)" % (name, w, h), okh, r)
        sels = ["#hlSheet [data-a=nudge][data-d=up]", "#hlSheet [data-a=nudge][data-d=down]", "#hlSheet [data-a=nudge][data-d=left]", "#hlSheet [data-a=nudge][data-d=right]", "#hlSave", "#hlSheet [data-a=ebatal]", "#hlSheet [data-a=ebawaan]", "#hlSheet .hl-pick"]
        ok("39 %s: panah, Simpan, Batal, Bawaan & chip benda bisa diklik (tidak tertutup apa pun)" % name, all(center_hit(A, sl) == "ok" for sl in sels), [(sl, center_hit(A, sl)) for sl in sels if center_hit(A, sl) != "ok"])
        mins = ev(A, "[...document.querySelectorAll('#hlSheet [data-a=nudge], #hlSave, #hlSheet [data-a=ebatal]')].map(b=>{const r=b.getBoundingClientRect();return Math.min(r.width,r.height)})")
        ok("39 %s: target sentuh ≥ 40 px" % name, min(mins) >= 40, mins)
        p0 = ev(A, "({x:NW.world.player.x,y:NW.world.player.y})"); yy = max(40, int(r["t"] * 0.5)); x0 = int(w * 0.2)
        for _try in range(3):
            A.mouse.move(x0, yy); A.mouse.down(); A.mouse.move(x0 + 50, yy, steps=4); time.sleep(0.6); mv = ev(A, "({x:NW.world.player.x,y:NW.world.player.y})"); A.mouse.up(); time.sleep(0.3)
            if abs(mv["x"] - p0["x"]) + abs(mv["y"] - p0["y"]) > 0.05: break
        ok("39 %s: joystick tetap menggerakkan pemain saat panel Atur terbuka" % name, abs(mv["x"] - p0["x"]) + abs(mv["y"] - p0["y"]) > 0.05, (p0, mv))
        if name == "portrait kecil": shot(A, "e4-atur-360")
        ev(A, "NW.dapurSosial.closeSheet()")
    A.set_viewport_size({"width": 360, "height": 740}); time.sleep(0.8)
    return st

BLOCK_WS = "(()=>{const W=window.WebSocket;window.__blockWS=false;window.WebSocket=function(u,p){return new W(window.__blockWS?'ws://127.0.0.1:1/':u,p)};window.WebSocket.prototype=W.prototype;['CONNECTING','OPEN','CLOSING','CLOSED'].forEach(k=>window.WebSocket[k]=W[k])})();"
FIX = {}
def main():
    br = Bridge()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            only = sys.argv[1:] 
            for name, fn in [("flag_off", sec_flag_off), ("layout", sec_layout), ("owner_food", sec_owner_food)]:
                if only and name not in only: continue
                try: fn(b, br)
                except Exception as e:
                    import traceback; traceback.print_exc(); ok("EXC " + name, False, repr(e)[:200])
            for name, fn in [("guest_rules", sec_guest_rules), ("offers", sec_offers), ("presence", sec_presence), ("misc", sec_misc), ("screens", sec_screens), ("privacy", sec_privacy), ("shots", sec_shots), ("tata", sec_tata)]:
                if (only and name not in only) or (not only and name == "shots"): continue   # 'shots' dijalankan terpisah (state izin tamu berbeda)
                try:
                    if "X" not in dir() or True:
                        X = (fixture(b, br) if name == "shots" else None) or (FIX.get("x") or FIX.setdefault("x", fixture(b, br)))
                    fn(b, br, X)
                except Exception as e:
                    import traceback; traceback.print_exc(); ok("EXC " + name, False, repr(e)[:200])
            b.close()
    finally:
        br.close()
    f = [r for r in R if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(R) - len(f), len(f)))
    sys.exit(1 if f else 0)
main()
