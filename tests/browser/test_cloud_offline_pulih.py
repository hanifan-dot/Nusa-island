"""Cloud Save OFFLINE -> PULIH (tanpa Firebase/produksi): adaptor demo + validator ASLI + pemutus jaringan buatan.
Memastikan setelah optimasi bacaan (metaOnly tanpa overlay, cek-versi saat kembali ke tab dibatasi 60 dtk):
 1) offline: progres lokal TIDAK hilang, status 'offline', server tidak berubah; 2) online: tersinkron tanpa menimpa;
 3) perangkat lain menulis saat ini offline: kembali online -> terdeteksi (remoteNewer/konflik), progres lokal TIDAK ditimpa diam-diam;
 4) cek-versi saat kembali ke tab dibatasi tetapi pemulihan online tetap lewat retry/flush/syncNow."""
import os, time, json
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
R = []
def ok(n, c, e=""): R.append(bool(c)); print(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:200] if e != "" else ""), flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
INIT = "window.__NUSA_FORCE_DEMO = true; window.__demoAuto = 'demo-a';"
def wf(pg, js, t=8):
    t0 = time.time()
    while time.time() - t0 < t:
        if ev(pg, js): return True
        time.sleep(0.1)
    return False
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 390, "height": 780}, has_touch=True); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(ROOT); pg.wait_for_function("window.NW && NW.cloud && NW.cloud._test", timeout=20000)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "()=>{document.getElementById('startBtn').click();return 1}")
    time.sleep(0.5)
    ev(pg, "async()=>{await NW.cloud.signInGoogle()}"); wf(pg, "NW.cloud.user", 8); time.sleep(1.0)
    ok("sinkron aktif", ev(pg, "NW.cloud._test.state().syncActive"))
    # progres awal tersinkron (rev1)
    ev(pg, "()=>{Nusa.S.money=500;Nusa.S.stats.caught=7;Nusa.S.stats.casts=9;Nusa.save&&Nusa.save();NW.cloud.onLocalSave();return 1}")
    r = ev(pg, "(async()=>{const x=await NW.cloud.flush();return x&&x.ok?1:JSON.stringify(x)})()"); ok("rev1 tersinkron", r == 1, r)
    # 1) OFFLINE: progres bertambah, push gagal
    ev(pg, "window.__demoCloud.setOffline(true)")
    ev(pg, "()=>{Nusa.S.money=900;Nusa.S.stats.caught=12;Nusa.S.stats.casts=15;Nusa.save&&Nusa.save();NW.cloud.onLocalSave();return 1}")
    ev(pg, "(async()=>{await NW.cloud.flush()})()")
    ok("offline: status 'offline' dan progres lokal utuh", ev(pg, "NW.cloud.status") == "offline" and ev(pg, "JSON.parse(localStorage.getItem('nusa-island-v1')).money") == 900, ev(pg, "NW.cloud.status"))
    srv = lambda: ev(pg, "(async()=>{const l=await window.__demoCloud.server.loadSave(window.__demoCloud.tokenOf('demo-a'));return [l.rev, JSON.parse(l.data).money]})()")
    ok("offline: server tidak berubah (rev1, koin 500)", srv() == [1, 500], srv())
    # kembali ke tab berulang saat offline tidak merusak apa pun
    for _ in range(3): ev(pg, "()=>{document.dispatchEvent(new Event('visibilitychange'));return 1}")
    ok("offline: tetap offline, data lokal utuh", ev(pg, "JSON.parse(localStorage.getItem('nusa-island-v1')).stats.caught") == 12)
    # 2) PULIH: online -> tersinkron tanpa konflik
    ev(pg, "window.__demoCloud.setOffline(false)")
    time.sleep(1.8); r = ev(pg, "(async()=>{const x=await NW.cloud.flush();return x&&x.ok?1:JSON.stringify(x).slice(0,100)})()"); ok("pulih: push berhasil", r == 1, r)
    ok("pulih: server menerima progres offline (rev2, koin 900), status idle", srv() == [2, 900] and ev(pg, "NW.cloud.status") == "idle", [srv(), ev(pg, "NW.cloud.status")])
    # 3) perangkat lain menulis saat ini offline
    ev(pg, "window.__demoCloud.setOffline(true)")
    ev(pg, "()=>{Nusa.S.money=1000;Nusa.S.stats.caught=13;Nusa.save&&Nusa.save();NW.cloud.onLocalSave();return 1}")
    ev(pg, "(async()=>{await NW.cloud.flush()})()")
    other = json.loads(ev(pg, "localStorage.getItem('nusa-island-v1')")); other['money'] = 7777; other['stats']['caught'] = 30
    time.sleep(1.8)   # jeda minimum antar tulis server (WRITE_GAP_MS 1500)
    w = ev(pg, "async(d)=>{return await window.__demoCloud.server.writeSave(window.__demoCloud.tokenOf('demo-a'),{data:JSON.stringify(d),baseRev:2,opId:'other-dev-op-1',deviceId:'tablet'})}", other)
    ok("(siapkan) perangkat lain menulis rev3", w.get("ok") and w.get("rev") == 3, w)
    ev(pg, "window.__demoCloud.setOffline(false)")
    ev(pg, "(async()=>{await NW.cloud._test.checkRemote()})()")
    st = ev(pg, "[NW.cloud.status, NW.cloud.remoteNewer]")
    ok("online lagi: perubahan perangkat lain terdeteksi (konflik/remoteNewer), tidak diam-diam", st[0] == "conflict" or st[1] is True, st)
    ok("progres lokal TIDAK tertimpa data perangkat lain", ev(pg, "JSON.parse(localStorage.getItem('nusa-island-v1')).money") == 1000)
    ok("server tidak ditimpa oleh push lokal basi (tetap rev3 koin 7777)", srv() == [3, 7777], srv())
    real = [e for e in errs if "ResizeObserver" not in e]; ok("tanpa galat JS", not real, real)
    b.close()
n = sum(R); print(f"Cloud Save offline->pulih: {n} lulus, {len(R) - n} gagal"); raise SystemExit(0 if n == len(R) else 1)
