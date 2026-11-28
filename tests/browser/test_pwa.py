"""PWA Nusa Island: manifest, service worker, instal, pembaruan, dan batas cache (Chromium ukuran HP).
Server uji lokal meniru Firebase Hosting (header no-cache, .webmanifest) dan menulis versi build ke sw.js seperti build-hosting.sh.
Tidak menyentuh Firebase/produksi. Jalankan: python tests/browser/test_pwa.py   (butuh playwright + chromium)"""
import os, re, json, time, threading, mimetypes
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
R = []
def ok(n, c, e=""): R.append(bool(c)); print(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:220] if e != "" else ""), flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
def wf(pg, js, t=10):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.15)
    return False

STATE = {"build": "v1", "hits": {}}
class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT_DIR, **k)
    def log_message(self, *a): pass
    def end_headers(self):
        p = self.path.split("?")[0]
        if re.search(r"\.(js|css|html)$", p) or p == "/": self.send_header("Cache-Control", "no-cache")
        super().end_headers()
    def do_GET(self):
        p = self.path.split("?")[0]; STATE["hits"][p] = STATE["hits"].get(p, 0) + 1
        if p.startswith("/api/") or p.startswith("/__/"):
            b = json.dumps({"n": STATE["hits"][p], "t": time.time()}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        if p == "/sw.js":
            b = open(os.path.join(ROOT_DIR, "sw.js"), "rb").read().replace(b"__NUSA_BUILD__", STATE["build"].encode())
            self.send_response(200); self.send_header("Content-Type", "text/javascript"); self.send_header("Content-Length", str(len(b))); self.send_header("Cache-Control", "no-cache, max-age=0"); self.end_headers(); self.wfile.write(b); return
        if p.endswith(".webmanifest"):
            b = open(os.path.join(ROOT_DIR, p.lstrip("/")), "rb").read()
            self.send_response(200); self.send_header("Content-Type", "application/manifest+json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        return super().do_GET()

srv = ThreadingHTTPServer(("127.0.0.1", 0), H); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://localhost:{PORT}/"
FIRE = json.load(open(os.path.join(ROOT_DIR, "firebase", "firebase.json")))

def boot(b, standalone=False, no_install_api=False):
    ctx = b.new_context(viewport={"width": 844, "height": 390}, is_mobile=True, has_touch=True, device_scale_factor=2,
                        user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36")
    ctx.add_init_script("window.__demoAuto='demo-a';")
    if no_install_api: ctx.add_init_script("try{delete window.onbeforeinstallprompt}catch(e){} try{delete Window.prototype.onbeforeinstallprompt}catch(e){}")
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg)
    if standalone:  # Chromium headless tidak bisa memasang app: meniru display-mode lewat matchMedia (menguji logika kita saja)
        ctx.add_init_script("(()=>{const o=window.matchMedia.bind(window);window.matchMedia=q=>/display-mode:\\s*standalone/.test(q)?({matches:true,media:q,onchange:null,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){},dispatchEvent(){return false}}):o(q)})()")
    return ctx, pg, errs, cdp

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- 1) manifest + ikon
    ctx, pg, errs, cdp = boot(b)
    pg.goto(BASE + "?cloud=demo"); time.sleep(1.0)
    man = ev(pg, "fetch('manifest.webmanifest').then(async r=>({ct:r.headers.get('content-type'),j:await r.json()}))")
    j = man["j"]
    ok("M1 manifest: name/short_name/display/orientation/start_url/warna", j["name"] == "Nusa Island" and j["short_name"] == "Nusa Island" and j["display"] == "standalone" and j["orientation"] == "landscape"
       and j["start_url"].startswith("./") and j["scope"] == "./" and re.match(r"^#[0-9a-f]{6}$", j["background_color"]) and re.match(r"^#[0-9a-f]{6}$", j["theme_color"]), j)
    ics = {(i["sizes"], i.get("purpose")): i for i in j["icons"]}
    ok("M2 ikon 192, 512, dan maskable 512 ada di manifest", ("192x192", "any") in ics and ("512x512", "any") in ics and ("512x512", "maskable") in ics)
    from PIL import Image
    sizes_ok = all(Image.open(os.path.join(ROOT_DIR, i["src"])).size == tuple(int(x) for x in i["sizes"].split("x")) for i in j["icons"])
    ok("M3 berkas ikon ada dan ukuran pikselnya sama dengan yang diumumkan", sizes_ok)
    ok("M4 manifest ditautkan di index.html + apple-touch-icon + header Firebase manifest/sw", ev(pg, "document.querySelector('link[rel=manifest]').getAttribute('href')") == "manifest.webmanifest"
       and ev(pg, "!!document.querySelector('link[rel=apple-touch-icon]')") and any("webmanifest" in h["source"] for h in FIRE["hosting"]["headers"]) and any(h["source"] == "/sw.js" for h in FIRE["hosting"]["headers"]))
    app = cdp.send("Page.getAppManifest")
    ok("M5 Chromium membaca manifest tanpa galat (nama, ikon)", not app.get("errors") and '"Nusa Island"' in app["data"] and "icon-512.png" in app["data"], app.get("errors"))
    # ---- 2) service worker terdaftar & mengendalikan halaman
    ok("S1 service worker terdaftar", wf(pg, "navigator.serviceWorker.controller!==null||NusaPWA.state().sw==='registered'", 8) and ev(pg, "NusaPWA.state().sw") == "registered")
    wf(pg, "navigator.serviceWorker.controller!==null", 8)
    reg = ev(pg, "navigator.serviceWorker.getRegistration().then(r=>({scope:r.scope,active:!!r.active,url:(r.active||{}).scriptURL}))")
    ok("S2 SW aktif, scope seluruh situs, skrip /sw.js", reg["active"] and reg["scope"] == BASE and reg["url"].endswith("/sw.js"), reg)
    pg.reload(); time.sleep(1.2)
    ok("S3 setelah muat ulang halaman dikendalikan SW (controller ada)", ev(pg, "!!navigator.serviceWorker.controller"))
    inst = cdp.send("Page.getInstallabilityErrors")
    ok("I1 Chromium: tidak ada galat instalasi (installable)", inst["installabilityErrors"] == [], inst)
    # ---- 3) batas cache: API, Auth, QRIS, dompet tidak ter-cache dan selalu ke server
    h0 = dict(STATE["hits"])
    n = ev(pg, """async()=>{const out=[];for(const u of ['/api/ping','/__/auth/handler','/shop/qris.png','/mp/endpoint.json']){for(let i=0;i<2;i++){await fetch(u+'?x='+i).catch(()=>0)}}return true}""")
    d = {k: STATE["hits"].get(k, 0) - h0.get(k, 0) for k in ('/api/ping', '/__/auth/handler', '/shop/qris.png', '/mp/endpoint.json')}
    ok("C1 /api, /__/auth, QRIS, endpoint multiplayer: tiap permintaan sampai ke server (tidak dilayani cache)", all(v == 2 for v in d.values()), d)
    # permintaan POST dan lintas-origin tidak disentuh
    ev(pg, "fetch('/api/ping',{method:'POST',body:'{}'}).catch(()=>0)"); time.sleep(0.3)
    names = ev(pg, "caches.keys()")
    keys = ev(pg, "async()=>{const o=[];for(const k of await caches.keys()){const c=await caches.open(k);for(const r of await c.keys())o.push(r.url)}return o}")
    bad = [u for u in keys if re.search(r"/api/|/__/|qris|wallet|endpoint\.json|googleapis|workers\.dev|firebaseio|identitytoolkit", u)]
    ok("C2 isi Cache Storage tidak memuat API/Auth/Firestore/QRIS/dompet/multiplayer", not bad and len(keys) > 3, {"n": len(keys), "bad": bad})
    ok("C3 cache memakai nama berversi", names == ["nusa-island-v1"], names)
    # kode: jaringan dulu (perubahan di server langsung terlihat), media: cache dulu
    h1 = STATE["hits"].get("/pwa/pwa.js", 0); ev(pg, "fetch('pwa/pwa.js').then(r=>r.text())"); ev(pg, "fetch('pwa/pwa.js').then(r=>r.text())"); time.sleep(0.2)
    ok("C4 kode (js) diambil dari jaringan tiap kali (network-first)", STATE["hits"].get("/pwa/pwa.js", 0) - h1 == 2)
    h2 = STATE["hits"].get("/pwa/icons/icon-192.png", 0); ev(pg, "fetch('pwa/icons/icon-192.png').then(r=>r.blob())"); ev(pg, "fetch('pwa/icons/icon-192.png').then(r=>r.blob())"); time.sleep(0.2)
    ok("C5 media (png) dilayani cache setelah muatan pertama (maks. 1 hit server)", STATE["hits"].get("/pwa/icons/icon-192.png", 0) - h2 <= 1)
    # offline: kode jatuh ke cache hanya bila jaringan gagal
    ctx.set_offline(True); time.sleep(0.2)
    off = ev(pg, "fetch('pwa/pwa.js').then(r=>r.status).catch(e=>'gagal')")
    api_off = ev(pg, "fetch('/api/ping').then(r=>r.status).catch(e=>'gagal')"); ctx.set_offline(False)
    ok("C6 offline: kode statis dari cache; API tetap gagal (tidak dipalsukan dari cache)", off == 200 and api_off == "gagal", {"kode": off, "api": api_off})
    # ---- 4) tombol instal
    st = ev(pg, "NusaPWA.state()")
    ok("T1 tanpa event instal dari browser: tidak ada tombol palsu", st["pill"] is None and not ev(pg, "!!document.getElementById('pwaInstallBtn')"), st)
    ev(pg, """()=>{window.__pc=0;const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{window.__pc++;return Promise.resolve()};e.userChoice=Promise.resolve({outcome:'accepted',platform:'web'});window.__bip=e;window.dispatchEvent(e);}""")
    time.sleep(0.2)
    ok("T2 event instal ditangkap (preventDefault) dan tombol 'Instal Nusa Island' muncul", ev(pg, "window.__bip.defaultPrevented") and ev(pg, "document.getElementById('pwaInstallBtn').textContent.includes('Instal Nusa Island')"))
    pg.screenshot(path="/tmp/pwa-pill.png")
    ev(pg, "document.getElementById('pwaInstallBtn').click()"); time.sleep(0.3)
    ok("T3 klik memanggil prompt() sekali dan tombol disembunyikan", ev(pg, "window.__pc") == 1 and not ev(pg, "!!document.getElementById('pwaInstallBtn')"))
    ev(pg, "window.dispatchEvent(new Event('appinstalled'))"); ok("T4 appinstalled: state terpasang, tombol tetap tidak ada", ev(pg, "NusaPWA.state().installed") and not ev(pg, "!!document.getElementById('pwaInstallPill')"))
    ctx.close()
    # ---- 4b) goyang, tombol ✕ (30 menit), tanya setelah 5 penolakan, baris Pengaturan
    BIP = "()=>{window.__pc=0;const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{window.__pc++;return Promise.resolve()};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e)}"
    ctx, pg, errs, cdp = boot(b); pg.clock.install(); pg.goto(BASE + "?cloud=demo"); pg.clock.run_for(1500); ev(pg, BIP); pg.clock.run_for(300)
    ok("X1 tombol instal bergoyang (animasi pwa-wiggle aktif)", ev(pg, "getComputedStyle(document.getElementById('pwaInstallPill')).animationName") == "pwa-wiggle")
    vis = "!!document.getElementById('pwaInstallPill')"
    ev(pg, "document.getElementById('pwaInstallX').click()"); pg.clock.run_for(100)
    ok("X2 ✕ menyembunyikan tombol dan mencatat 1 penolakan", not ev(pg, vis) and ev(pg, "NusaPWA.state().rej.n") == 1)
    pg.clock.fast_forward(29 * 60 * 1000); ok("X3a belum muncul setelah 29 menit", not ev(pg, vis))
    pg.clock.fast_forward(2 * 60 * 1000); ok("X3b muncul lagi setelah 30 menit", ev(pg, vis))
    for i in range(3):  # penolakan ke-2..4: tanpa pertanyaan
        ev(pg, "document.getElementById('pwaInstallX').click()"); pg.clock.fast_forward(31 * 60 * 1000)
    ok("X4 penolakan ke-2..4 tanpa pertanyaan, tombol kembali tiap 30 menit", ev(pg, vis) and ev(pg, "NusaPWA.state().rej.n") == 4 and not ev(pg, "!!document.getElementById('pwaOptYes')"))
    ev(pg, "document.getElementById('pwaInstallX').click()"); pg.clock.run_for(100)
    ok("X5 penolakan ke-5: muncul 'Anda tidak ingin mengunduh Nusa Island?' dengan Ya / Tidak", "Anda tidak ingin mengunduh Nusa Island?" in ev(pg, "(document.querySelector('.pwa-card h2')||{}).textContent||''") and ev(pg, "!!document.getElementById('pwaOptYes')&&!!document.getElementById('pwaOptNo')"))
    ev(pg, "document.getElementById('pwaOptNo').click()"); pg.clock.run_for(200)
    ok("X6 'Tidak, saya mau instal': prompt instal dipanggil", ev(pg, "window.__pc") == 1)
    ctx.close()
    ctx, pg, errs, cdp = boot(b); pg.clock.install(); pg.goto(BASE + "?cloud=demo"); pg.clock.run_for(1500)
    ev(pg, "(document.getElementById('gateGuest')||{click(){}}).click()"); pg.clock.run_for(1500)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    pg.clock.run_for(1500); ev(pg, BIP); pg.clock.run_for(300)
    for i in range(5):
        ev(pg, "document.getElementById('pwaInstallX').click()"); pg.clock.fast_forward(31 * 60 * 1000 if i < 4 else 100)
    ev(pg, "document.getElementById('pwaOptYes').click()"); pg.clock.fast_forward(31 * 60 * 1000)
    ok("X7 'Ya, tidak mau': tombol tidak muncul lagi (juga setelah 30 menit)", not ev(pg, vis) and ev(pg, "NusaPWA.state().optout"))
    ev(pg, "document.getElementById('musicBtn').click()"); pg.clock.run_for(500)
    ok("X8 tetap ada 'Instal Nusa Island' di Pengaturan (panel 🎵) selama belum terpasang", ev(pg, "!!document.getElementById('pwaSettingsBtn')") and ev(pg, "document.getElementById('pwaSettingsBtn').textContent") == "Instal Nusa Island")
    pg.screenshot(path="/tmp/pwa-settings.png")
    ev(pg, "document.getElementById('pwaSettingsBtn').click()"); pg.clock.run_for(200)
    ok("X9 tombol Pengaturan memanggil prompt instal bila tersedia", ev(pg, "window.__pc") == 1)
    ev(pg, "window.dispatchEvent(new Event('appinstalled'))"); pg.clock.run_for(200)
    ok("X10 setelah terpasang baris Pengaturan hilang dan tombol tidak kembali", not ev(pg, "!!document.getElementById('pwaSettingsRow')") and not ev(pg, vis))
    ok("X11 tanpa galat halaman", errs == [], errs[:2])
    ctx.close()
    # mode standalone: tombol tidak muncul walau event datang
    ctx, pg, errs, cdp = boot(b, standalone=True); pg.goto(BASE + "?cloud=demo"); time.sleep(1.0)
    ev(pg, "()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>Promise.resolve();e.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(e)}"); time.sleep(0.2)
    ok("T5 mode standalone: tombol instal tidak ditampilkan", ev(pg, "NusaPWA.state().standalone") and not ev(pg, "!!document.getElementById('pwaInstallPill')"), ev(pg, "[matchMedia('(display-mode: standalone)').matches, NusaPWA.state()]"))
    # ---- 5) standalone: game terbuka, login demo dan Cloud Save tetap jalan
    ev(pg, "(document.getElementById('gateGuest')||{click(){}}).click()"); time.sleep(1.0)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.8)
    ok("G1 standalone: game dimulai (kanvas + HUD)", ev(pg, "!!document.querySelector('canvas')&&!!document.getElementById('dexBtn')&&!!window.__nusa"))
    ev(pg, "async()=>{await NW.cloud.signInGoogle()}"); okl = wf(pg, "NW.cloud.user", 8); time.sleep(0.8)
    ev(pg, "()=>{window.__nusa.S.money=777; window.__nusa.save()}")
    r = ev(pg, "async()=>{try{await NW.cloud.syncNow();return NW.cloud.status}catch(e){return 'err:'+e}}")
    saved = ev(pg, "(()=>{const r=localStorage.getItem('nusa-demo-cloud-v1');return !!r&&r.length>2&&NW.cloud.status!=='error'})()")
    ok("G2 standalone: login (adapter demo) + Cloud Save berhasil (sama seperti tanpa SW)", okl and saved and not str(r).startswith("err"), {"login": okl, "saved": saved, "status": r})
    ok("G3 tanpa galat halaman pada game + PWA", errs == [], errs[:2])
    ctx.close()
    # ---- 6) fallback instruksi (browser tanpa prompt otomatis)
    ctx, pg, errs, cdp = boot(b, no_install_api=True); pg.goto(BASE + "?cloud=demo"); time.sleep(5.0)
    st = ev(pg, "NusaPWA.state()")
    if st["pill"] == "howto":
        ev(pg, "document.getElementById('pwaInstallBtn').click()")
        ok("F1 fallback: 'Cara pasang' membuka petunjuk 'Buka menu browser lalu pilih Tambahkan ke layar utama.'", "Buka menu browser lalu pilih Tambahkan ke layar utama." in ev(pg, "document.querySelector('.pwa-card').innerText"))
    else:
        ok("F1 fallback (lewati: Chromium ini tetap punya onbeforeinstallprompt; logika diuji lewat kode)", ev(pg, "'onbeforeinstallprompt' in window"), st)
    ctx.close()
    # ---- 6b) event instal yang datang SEBELUM pwa.js dimuat (skrip game banyak) tetap dipakai
    ctx, pg, errs, cdp = boot(b)
    FAKE = "window.dispatchEvent(Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt(){window.__prompted=1;return Promise.resolve()},userChoice:Promise.resolve({outcome:'dismissed'})}));\n"
    def early(route):
        body = FAKE + open(os.path.join(ROOT_DIR, "pwa", "pwa.js"), encoding="utf-8").read()
        route.fulfill(status=200, content_type="text/javascript", body=body)
    pg.route("**/pwa/pwa.js", early); pg.goto(BASE + "?cloud=demo"); time.sleep(1.2)
    st = ev(pg, "NusaPWA.state()")
    ok("E1 event instal yang terjadi sebelum pwa.js dimuat tetap menampilkan tombol 'Instal Nusa Island'", st["pill"] == "install" and st["installable"], st)
    ev(pg, "document.getElementById('pwaInstallBtn').click()"); time.sleep(0.4)
    ok("E2 menekan tombol itu memanggil prompt() instal asli sekali", ev(pg, "window.__prompted") == 1)
    ctx.close()
    # ---- 6c) Chrome HP yang tidak pernah mengirim event: tetap ada jalan lewat petunjuk (bukan tombol instal palsu)
    ctx, pg, errs, cdp = boot(b); pg.goto(BASE + "?cloud=demo"); time.sleep(1.0)
    ok("E3 sebelum jeda tunggu tidak ada tombol palsu", ev(pg, "NusaPWA.state().pill") in (None, "install"))
    time.sleep(6.5); st = ev(pg, "NusaPWA.state()")
    if st["installable"]:
        ok("E4 (lewati: Chromium ini mengirim event instal sungguhan)", True, st)
    else:
        ok("E4 tanpa event instal: setelah jeda muncul 'Cara pasang' (bukan tombol instal palsu)", st["pill"] == "howto", st)
        ev(pg, "document.getElementById('pwaInstallBtn').click()")
        ok("E5 petunjuk menyebut menu Chrome", "Instal aplikasi" in ev(pg, "document.querySelector('.pwa-card').innerText"))
    ctx.close()
    # ---- 7) pembaruan: versi baru -> modal -> Nanti -> Perbarui Sekarang -> satu reload
    STATE["build"] = "v1"; ctx, pg, errs, cdp = boot(b); pg.goto(BASE + "?cloud=demo"); time.sleep(1.0); wf(pg, "!!navigator.serviceWorker.controller", 8)
    ev(pg, "window.__marker='lama'")
    ok("U1 awal: tanpa modal pembaruan", not ev(pg, "!!document.querySelector('.pwa-modal')"))
    STATE["build"] = "v2"; ev(pg, "NusaPWA._checkForUpdate()")
    ok("U2 SW versi baru terdeteksi: modal 'Pembaruan Nusa Island tersedia.' dengan tombol Perbarui Sekarang / Nanti", wf(pg, "!!document.getElementById('pwaUpdateNow')", 10)
       and "Pembaruan Nusa Island tersedia." in ev(pg, "document.querySelector('.pwa-card h2').textContent") and ev(pg, "document.getElementById('pwaUpdateLater').textContent") == "Nanti")
    pg.screenshot(path="/tmp/pwa-update.png")
    ok("U3 SW baru menunggu (belum mengambil alih) dan halaman belum dimuat ulang", ev(pg, "navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)") and ev(pg, "window.__marker") == "lama")
    ev(pg, "document.getElementById('pwaUpdateLater').click()"); time.sleep(0.3)
    ok("U4 'Nanti': modal hilang, game tetap bisa dipakai", not ev(pg, "!!document.querySelector('.pwa-modal')") and ev(pg, "!!window.__nusa&&window.__marker") == "lama")
    ev(pg, "document.dispatchEvent(new Event('visibilitychange'))"); time.sleep(0.3)
    ok("U5 tidak mengganggu lagi sebelum jeda pengingat", not ev(pg, "!!document.querySelector('.pwa-modal')"))
    ev(pg, "NusaPWA._remind()"); ok("U6 setelah jeda pengingat modal muncul kembali", wf(pg, "!!document.getElementById('pwaUpdateNow')", 3))
    n_idx = STATE["hits"].get("/", 0) + STATE["hits"].get("/index.html", 0)
    ev(pg, "document.getElementById('pwaUpdateNow').click()")
    ok("U7 'Perbarui Sekarang': halaman dimuat ulang tepat satu kali (penanda lama hilang)", wf(pg, "window.__marker===undefined && !!navigator.serviceWorker.controller", 12))
    time.sleep(3.0)
    n_after = STATE["hits"].get("/", 0) + STATE["hits"].get("/index.html", 0)
    ok("U8 tidak ada reload berulang (maks. 1 muat ulang halaman)", n_after - n_idx <= 2 and not ev(pg, "!!document.querySelector('.pwa-modal')"), {"muat": n_after - n_idx})
    names = ev(pg, "caches.keys()")
    ok("U9 versi baru aktif; cache versi lama dibersihkan", names == ["nusa-island-v2"], names)
    ok("U10 skrip aktif = versi baru, tanpa SW menunggu", ev(pg, "navigator.serviceWorker.getRegistration().then(r=>!r.waiting&&!!r.active)"))
    ctx.close(); b.close()
srv.shutdown()
print(f"\nTOTAL {sum(R)}/{len(R)} lulus"); raise SystemExit(0 if all(R) else 1)
