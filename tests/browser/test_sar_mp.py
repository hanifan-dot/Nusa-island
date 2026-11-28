"""Uji regresi multiplayer untuk SAR Laut (prototipe): dengan misi SAR aktif di klien A, server realtime uji (room-core ASLI) tetap menyinkronkan A↔B,
dan A TIDAK mengirim jenis pesan baru ke server (misi bersifat pribadi: korban/petugas hanya digambar di klien penerima).
Pembanding: sesi yang sama dengan flag SAR MATI. Data sintetis, server lokal. Jalankan: python3 tests/browser/test_sar_mp.py"""
import os, sys, time, json, subprocess, urllib.request
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__))
ROOT = "file://" + os.path.abspath(os.path.join(H, "..", "..", "index.html"))
SRV = os.path.abspath(os.path.join(H, "..", "dev", "mp-dev-server.js")); PORT = 8823
R = []
def ok(name, cond, extra=""): R.append(bool(cond)); print(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:240] if extra != "" else ""), flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=8.0, step=0.1):
    t0 = time.time()
    while time.time() - t0 < tmo:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(step)
    return False
def seed(name): return {"v": 11, "money": 500, "day": 1, "hour": 11, "loc": 0, "up": {"rod": 0, "bait": 0, "cooler": 0, "boat": 5}, "cooler": [], "dex": {}, "stats": {"casts": 0, "caught": 0, "earned": 0, "legends": 0}, "profile": {"v": 1, "name": name}}
def srv():
    p = subprocess.Popen(["node", SRV, str(PORT)], env=dict(os.environ, NUSA_DEV_NO_RATE="1"), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(50):
        try: urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health", timeout=0.3); return p
        except Exception: time.sleep(0.1)
    raise RuntimeError("server uji tidak naik")
SPY = "window.__types={};(()=>{const S=WebSocket.prototype.send;WebSocket.prototype.send=function(d){try{const m=JSON.parse(d);const k=m&&m.t;window.__types[k]=(window.__types[k]||0)+1}catch(e){}return S.apply(this,arguments)}})();"
def page(b, acc, name, sar):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
    init = f"window.__demoAuto='{acc}';window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{PORT}',token:(uid)=>'dev.'+uid}};window.NUSA_PHONE=true;" + ("window.NUSA_SAR=true;" if sar else "") + SPY
    init += "if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}));}" % json.dumps(json.dumps(seed(name)))
    ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.3)
    return ctx, pg, errs
def run(b, sar):
    s = srv()
    try:
        cA, A, eA = page(b, "demo-a", "Anda", sar); cB, Bp, eB = page(b, "demo-b", "Budi", False)
        on = wait_for(A, "NW.mp && NW.mp.view().online", 10) and wait_for(Bp, "NW.mp && NW.mp.view().online", 10)
        if sar:   # SAR aktif di A: NusaPhone dari server (ditiru), jam server = jam multiplayer ASLI (bukan suntikan), lalu terima misi
            ev(A, "(()=>{window.NusaApi={enabled:()=>true,call:async(n)=>{if(n==='gameFlags')return {nusaPhone:true};if(n==='phoneState')return {state:{owned:['dasar'],use:'dasar'}};throw Object.assign(new Error('x'),{code:'unavailable'})}}})()")
            ev(A, "NW.phone._gate()"); wait_for(A, "NW.phone.srvOn()", 6)
            ok("M0 jam tepercaya = jam server multiplayer asli (NW.mp._clock.have)", wait_for(A, "NW.mp._clock.have === true", 8) and ev(A, "Math.abs(NW.sar.trustedNow()-Date.now())<600000"), ev(A, "[NW.mp._clock.have, NW.sar.trustedNow()]"))
            ev(A, "NW.sar._ses.activeMs=9*60000"); ev(A, "NW.sar._tick()"); ev(A, "NW.sar.accept()")
            ok("M1 misi SAR aktif di A (tanpa memasukkan jam palsu)", ev(A, "Nusa.S.sar.m && Nusa.S.sar.m.phase") == "active", ev(A, "Nusa.S.sar"))
        ev(A, "window.__types={}")
        ev(A, "(()=>{const p=NW.world.player;window.__p0=[p.x,p.y];p.x+=3;p.y+=2})()"); time.sleep(2.5)
        seen = ev(Bp, "JSON.stringify(NW.mp.view())")
        ok(f"M2 [SAR={'ON' if sar else 'OFF'}] A & B saling terhubung di ruang yang sama (2 pemain)", on and wait_for(Bp, "NW.mp.view().others >= 1 || (NW.mp.view().n||0) >= 2 || NW.mp.view().count >= 2", 6), seen[:200])
        ok(f"M3 [SAR={'ON' if sar else 'OFF'}] tidak ada galat halaman", not eA and not eB, (eA + eB)[:2])
        types = ev(A, "window.__types")
        cA.close(); cB.close(); return types, on
    finally: s.terminate(); s.wait()
def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        off, on0 = run(b, False); on, on1 = run(b, True)
        print("  pesan A→server (SAR OFF):", off); print("  pesan A→server (SAR ON ):", on)
        ok("M4 jenis pesan A→server sama persis (SAR tidak menambah protokol/permintaan multiplayer)", set(off.keys()) == set(on.keys()) and on0 and on1, [sorted(off), sorted(on)])
        b.close()
    n = sum(R); print(f"\ntest_sar_mp: {n}/{len(R)} lulus"); sys.exit(0 if n == len(R) else 1)
main()
