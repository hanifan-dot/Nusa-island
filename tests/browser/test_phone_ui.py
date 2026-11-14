"""Uji NusaPhone (Ide 07) · TAHAP 1 — perangkat (UI): HUD, animasi karakter, layar kunci, gestur buka kunci, home, navigasi, tema siang/malam, casing,
gerak berkurang, koneksi putus (kunci aplikasi jaringan), flag klien/server OFF, tiga pemain (animasi terlihat tanpa mengubah hitungan server),
dan EMPAT ukuran layar (360×740, 412×915, 740×360, 1280×800): tidak menutup obrolan, joystick, indikator pemain.
SERVER = Worker backend ASLI (cabang NusaPhone) di balik `phone_bridge.mjs` (Firestore TIRUAN) + server realtime uji (room-core ASLI, NUSA_PHONE=ya). BUKAN bukti produksi.
Butuh NUSA_BACKEND. Jalankan: NUSA_BACKEND=... python3 tests/browser/test_phone_ui.py     Gambar: docs/ide07/ (env SHOTS)"""
import os, sys, time, json
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import phone_harness as X
from playwright.sync_api import sync_playwright
ev, wait_for, ok = X.ev, X.wait_for, X.ok
SHOTS = os.environ.get("SHOTS", os.path.abspath(os.path.join(H, "..", "..", "docs", "ide07")) + "/"); os.makedirs(SHOTS, exist_ok=True)
VPS = ((360, 740), (412, 915), (740, 360), (1280, 800))
MEASURE = """([subj, others])=>{
 const vis=e=>{for(let n=e;n&&n!==document.body;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false}return true};
 const R=e=>{const r=e.getBoundingClientRect();return r.width>1&&r.height>1?{l:r.left,t:r.top,r:r.right,b:r.bottom,id:(e.id||e.className||e.tagName).toString().slice(0,26)}:null};
 const leaf=e=>e.children.length===0||e.tagName==='BUTTON';
 const pick=(sels,leafOnly)=>sels.flatMap(q=>[...document.querySelectorAll(q)]).filter(e=>vis(e)&&(!leafOnly||leaf(e))).map(R).filter(Boolean);
 const S=pick(subj,false), O=pick(others,true), hit=[];
 for(const p of S)for(const o of O){if(p.id===o.id)continue;const w=Math.min(p.r,o.r)-Math.max(p.l,o.l),h=Math.min(p.b,o.b)-Math.max(p.t,o.t);if(w>2&&h>2)hit.push(p.id+' x '+o.id)}
 const out=S.filter(p=>p.l<-1||p.t<-1||p.r>innerWidth+1||p.b>innerHeight+1).map(p=>p.id);
 return {n:S.length,hit,out}}"""
def measure(pg, subj, others): return ev(pg, MEASURE, [subj, others])
PSCREEN = """(()=>{const pl=NW.world.player,p=NW.P(pl.x,pl.y,NW.groundZ?NW.groundZ(pl.x,pl.y):0),c=NW.world.cam,z=NW.world.zoom;return {x:innerWidth/2+(p.x-c.x)*z,y:innerHeight/2+(p.y-22-c.y)*z}})()"""
class PB(X.Bridge):
    def flag(s, **kw): s.post("/__flags", kw); s.adv(25000)      # cache saklar server: majukan jam tiruan agar perubahan terbaca
def shot(pg, name): pg.screenshot(path=SHOTS + name + ".png")
def phone_ready(pg, tmo=25): return wait_for(pg, "NW.phone && NW.phone.srvOn()", tmo)
def btn_visible(pg): return ev(pg, "(()=>{const b=document.getElementById('phoneBtn');return !!b&&!b.classList.contains('hidden')&&getComputedStyle(b).display!=='none'})()")
def is_open(pg): return ev(pg, "NW.phone.isOpen()")
def screen(pg): return ev(pg, "document.getElementById('nphDev').dataset.screen")
def theme(pg): return ev(pg, "document.getElementById('nphRoot').dataset.theme")
def settle(pg, s=0.5): time.sleep(s)
def unlock(pg): pg.evaluate("NW.phone.go('unlock')"); settle(pg, 0.3)
def open_phone(pg):
    if not is_open(pg): pg.click("#phoneBtn"); settle(pg, 0.45)
def close_phone(pg):
    if is_open(pg): pg.click("#nphClose"); settle(pg, 0.4)
def link_text(pg): return ev(pg, "document.getElementById('nphLinkTx').textContent")
def rect(pg, sel): return ev(pg, "(s)=>{const r=document.querySelector(s).getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}}", sel)
def set_hour(pg, h):   # jam dunia dipegang jam bersama multiplayer; yang diuji adalah bagaimana ponsel membaca Nusa.isNight() (sumber yang sama dengan HUD)
    ev(pg, "(h)=>{if(!window.__isNight0)window.__isNight0=Nusa.isNight;Nusa.isNight=()=>(h>=19||h<5)}", h)

def sec_flags(b, br):
    # --- flag klien OFF: modul tidak diunduh sama sekali ---
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", phone=False); time.sleep(2.0)
    res = ev(A, "performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/\\/phone\\//.test(n))")
    ok("F1 flag klien OFF: tidak ada berkas phone/* diunduh, tidak ada <script> phone, NW.phone tidak ada", not res and ev(A, "document.querySelectorAll('script[src*=\"phone/\"],link[href*=\"phone/\"]').length") == 0 and ev(A, "typeof NW.phone") == "undefined", res)
    ok("F2 flag klien OFF: tidak ada tombol/panel NusaPhone di halaman", ev(A, "!document.getElementById('phoneBtn') && !document.getElementById('nphRoot')"))
    ok("F3 bawaan produksi: window.NUSA_PHONE === false di cloud/config.js", "NUSA_PHONE !== true) window.NUSA_PHONE = false" in open(os.path.join(H, "..", "..", "cloud", "config.js")).read())
    ctx.close()
    # --- flag klien ON, server OFF: tidak ada UI, tidak bisa dibuka ---
    br.flag(phone=False)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi"); res = ev(A, "performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/\\/phone\\//.test(n))")
    ok("F4 flag klien ON: modul dimuat (phone/core.js, phone/client.js, phone/phone.css)", ev(A, "document.querySelectorAll('script[src*=\"phone/\"]').length") == 2 and ev(A, "document.querySelectorAll('link[href*=\"phone/\"]').length") == 1 and ev(A, "typeof NW.phone") == "object", res)
    time.sleep(7.0)
    ok("F5 flag server OFF: tombol tidak muncul, ponsel tidak bisa dibuka, tidak ada broadcast", not btn_visible(A) and ev(A, "NW.phone.srvOn()") is False and ev(A, "NW.phone.open()") is False and ev(A, "NW.phone.broadcast()") is False and ev(A, "!document.getElementById('nphRoot')"), [btn_visible(A), ev(A, "NW.phone.srvOn()")])
    ctx.close()
    br.flag(phone=True)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi")
    ok("F7 server ON: tombol NusaPhone muncul di HUD", phone_ready(A) and btn_visible(A))
    ok("F8 tombol bukan duplikat & berlabel aksesibel", ev(A, "document.querySelectorAll('#phoneBtn').length") == 1 and "NusaPhone" in (ev(A, "document.getElementById('phoneBtn').getAttribute('aria-label')") or ""))
    return ctx, A, errs

def sec_flaky_gate(b, br):
    br.flag(phone=True)
    ctx = b.new_context(viewport={"width": 360, "height": 740}, has_touch=True, device_scale_factor=2)
    sd = X.seed("Budi"); n = {"fail": 0, "ok": 0}
    def route(r):
        if n["fail"] < 3: n["fail"] += 1; return r.abort()
        n["ok"] += 1; r.continue_()
    ctx.route("**/fn/gameFlags", route)
    init = "window.__demoAuto='demo-a';window.NUSA_MP_TEST={ws:'ws://127.0.0.1:%d',token:(uid)=>'dev.'+uid};window.NUSA_PHONE=true;" % br.mport
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}));}" % json.dumps(json.dumps(sd))
    ctx.add_init_script(init)
    cfg = open(os.path.join(H, "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "http://127.0.0.1:%d"' % br.port)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
    pg = ctx.new_page(); pg.goto(X.ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn")
    ev(pg, "window.firebase={apps:[{}],auth:()=>({currentUser:{getIdToken:async()=>'dev.'+NW.cloud.user.uid}})}")
    t0 = time.time(); early = btn_visible(pg) if ev(pg, "!!NW.phone") else False
    got = phone_ready(pg, 40)
    ok("F9 gerbang server gagal 3× lalu pulih: tombol muncul setelah percobaan ulang (gagal-tertutup, TIDAK menempel)", got and not early and n["fail"] >= 3, {"fail": n["fail"], "detik": round(time.time() - t0, 1)})
    ctx.close()

def sec_basic(A, errs, vp):
    tag = "%dx%d" % vp; pre = "U-%s " % tag
    ev(A, "NW.phone.close()"); settle(A, 0.3)
    pl0 = ev(A, "({x:NW.world.player.x,y:NW.world.player.y})")
    B0 = rect(A, "#phoneBtn")
    m = measure(A, ["#phoneBtn"], ["#hud *", "#mpDock *", "#joy"])
    ok(pre + "tombol NusaPhone tidak menimpa HUD atas, indikator pemain, tombol obrolan, joystick; di dalam layar", m["n"] == 1 and not m["hit"] and not m["out"], m)
    open_phone(A)
    ok(pre + "tombol → ponsel terbuka di layar kunci, aria-hidden=false, kelas body nph-open", is_open(A) and screen(A) == "lock" and ev(A, "document.getElementById('nphRoot').getAttribute('aria-hidden')") == "false" and ev(A, "document.body.classList.contains('nph-open')"))
    txt = ev(A, "document.getElementById('nphLock').innerText")
    ok(pre + "layar kunci: jam HH:MM, tanggal Indonesia, 'Hari N di Nusa', notifikasi, petunjuk buka kunci", __import__("re").search(r"\d\d:\d\d", txt) and any(d in txt for d in ("Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu")) and "di Nusa" in txt and "Selamat datang di NusaPhone" in txt and "Geser ke atas" in txt, txt[:140])
    ok(pre + "wallpaper Nusa Island (SVG pulau, laut, perahu) ada di layar kunci", ev(A, "!!document.querySelector('#nphLock svg.nph-wall') && document.querySelectorAll('#nphLock svg.nph-wall path').length>=4"))
    mm = measure(A, ["#nphDev"], ["#mpDock *", "#joy", "#phoneBtn"])
    ok(pre + "ponsel TIDAK menutup tombol obrolan, indikator pemain, joystick, tombol ponsel; seluruhnya di dalam layar", mm["n"] == 1 and not mm["hit"] and not mm["out"], mm)
    # karakter berdiri di luar perangkat (animasi memegang ponsel terlihat)
    time.sleep(1.0); ps = ev(A, PSCREEN); d = rect(A, "#nphDev")
    inside = d["l"] - 6 <= ps["x"] <= d["r"] + 6 and d["t"] - 6 <= ps["y"] <= d["b"] + 6
    ok(pre + "karakter bergeser ke area layar yang tidak tertutup ponsel, tetap di dalam layar", (not inside) and 0 <= ps["x"] <= vp[0] and 0 <= ps["y"] <= vp[1], {"ps": ps, "dev": d})
    # tidak berjalan tanpa sengaja
    pl1 = ev(A, "({x:NW.world.player.x,y:NW.world.player.y})")
    A.keyboard.down("ArrowRight"); A.keyboard.down("d"); time.sleep(0.8); A.keyboard.up("ArrowRight"); A.keyboard.up("d")
    fx = min(vp[0] - 40, d["r"] + 60) if d["r"] + 60 < vp[0] else 40
    A.mouse.move(fx, vp[1] / 2); A.mouse.down(); A.mouse.move(fx + 60, vp[1] / 2 + 10, steps=4); time.sleep(0.4); A.mouse.up()
    pl2 = ev(A, "({x:NW.world.player.x,y:NW.world.player.y,mv:NW.world.player.moving})")
    ok(pre + "saat ponsel terbuka pemain TIDAK berjalan (papan tombol & seret layar diabaikan)", abs(pl2["x"] - pl1["x"]) < 0.01 and abs(pl2["y"] - pl1["y"]) < 0.01 and not pl2["mv"], [pl1, pl2])
    ok(pre + "joystick redup (tidak aktif) dan tombol aksi tersembunyi saat ponsel terbuka", ev(A, "+getComputedStyle(document.getElementById('joy')).opacity") < 0.5)
    shot(A, "ph-%s-kunci" % tag)
    # gestur membuka kunci: seret ke atas
    g = rect(A, "#nphGrab"); lk = rect(A, "#nphLock")
    A.mouse.move(g["l"] + g["w"] / 2, g["t"] + g["h"] / 2); A.mouse.down()
    A.mouse.move(g["l"] + g["w"] / 2, g["t"] + g["h"] / 2 - 15, steps=3); A.mouse.move(g["l"] + g["w"] / 2, g["t"] + g["h"] / 2 - 40, steps=3)
    ok(pre + "gestur: saat diseret, layar kunci ikut naik (ada umpan balik visual)", "translateY" in (ev(A, "document.getElementById('nphLock').style.transform") or ""))
    A.mouse.move(g["l"] + g["w"] / 2, lk["t"] + 5, steps=6); A.mouse.up(); settle(A, 0.3)
    ok(pre + "gestur geser ke atas membuka kunci → layar utama", screen(A) == "home")
    ev(A, "NW.phone.go('lock')"); settle(A, 0.2)
    g = rect(A, "#nphGrab"); A.mouse.move(g["l"] + g["w"] / 2, g["t"] + g["h"] / 2); A.mouse.down(); A.mouse.move(g["l"] + g["w"] / 2, g["t"] + g["h"] / 2 - 8, steps=2); A.mouse.up(); settle(A, 0.3)
    ok(pre + "geseran terlalu pendek TIDAK membuka kunci (kunci kembali ke tempat)", screen(A) == "lock" and (ev(A, "document.getElementById('nphLock').style.transform") or "") == "")
    A.focus("#nphGrab"); A.keyboard.press("Enter"); settle(A, 0.3)
    ok(pre + "keyboard: Enter pada pegangan membuka kunci (aksesibel)", screen(A) == "home")
    # layar utama
    names = ev(A, "[...document.querySelectorAll('#nphGrid .nph-ic-n')].map(e=>e.textContent)")
    ok(pre + "home: enam ikon orisinal: Klippy, NusaChat, PlayGame, Dompet Nusa, Peta, Pengaturan", names == ["Klippy", "NusaChat", "PlayGame", "Dompet Nusa", "Peta", "Pengaturan"] and ev(A, "document.querySelectorAll('#nphGrid .nph-ic-i svg').length") == 6, names)
    mi = measure(A, ["#nphGrid .nph-ic"], ["#mpDock *", "#joy"])
    ok(pre + "home: ikon tidak saling menimpa tombol obrolan/joystick dan di dalam layar", not mi["hit"] and not mi["out"], mi)
    sizes = ev(A, "[...document.querySelectorAll('#nphGrid .nph-ic-i')].map(e=>Math.round(e.getBoundingClientRect().width))")
    ok(pre + "home: target sentuh ikon cukup besar (≥ 32 px)", min(sizes) >= 32, sizes)
    shot(A, "ph-%s-home" % tag)
    # navigasi
    ev(A, "NW.phone.go('open','pengaturan')"); settle(A, 0.3)
    ok(pre + "buka Pengaturan: judul benar; tombol Kembali aktif", screen(A) == "app" and ev(A, "document.getElementById('nphAppT').textContent") == "Pengaturan" and not ev(A, "document.getElementById('nphBack').disabled"))
    shot(A, "ph-%s-pengaturan" % tag)
    A.click("#nphBack"); settle(A, 0.25)
    ok(pre + "Kembali dari aplikasi → home", screen(A) == "home" and ev(A, "document.getElementById('nphBack').disabled"))
    ev(A, "NW.phone.go('open','peta')"); settle(A, 0.25); A.click("#nphHome2"); settle(A, 0.25)
    ok(pre + "Home dari dalam aplikasi → home", screen(A) == "home")
    ev(A, "NW.phone.go('lock')"); settle(A, 0.2)
    ok(pre + "di layar kunci tombol Kembali & Home nonaktif; Tutup aktif", ev(A, "document.getElementById('nphBack').disabled && document.getElementById('nphHome2').disabled && !document.getElementById('nphClose').disabled"))
    A.click("#nphClose"); settle(A, 0.5)
    ok(pre + "Tutup menutup ponsel; kelas body kembali; panel tersembunyi", not is_open(A) and not ev(A, "document.body.classList.contains('nph-open')") and ev(A, "document.getElementById('nphRoot').classList.contains('hidden')"))
    time.sleep(1.2); pl3 = ev(A, "({x:NW.world.player.x,y:NW.world.player.y})")
    A.keyboard.down("ArrowRight"); time.sleep(0.6); A.keyboard.up("ArrowRight"); pl4 = ev(A, "({x:NW.world.player.x,y:NW.world.player.y})")
    ok(pre + "setelah ditutup pemain bisa berjalan lagi", abs(pl4["x"] - pl3["x"]) + abs(pl4["y"] - pl3["y"]) > 0.3, [pl3, pl4])
    open_phone(A); A.keyboard.press("Escape"); settle(A, 0.4)
    ok(pre + "Escape menutup ponsel", not is_open(A))

def sec_theme(A, vp):
    pre = "T-%dx%d " % vp
    close_phone(A); set_hour(A, 12); open_phone(A); settle(A, 0.3)
    ok(pre + "siang (jam 12): tema siang", theme(A) == "day", theme(A)); shot(A, "ph-%dx%d-kunci-siang" % vp)
    close_phone(A); set_hour(A, 23); open_phone(A); settle(A, 0.3)
    ok(pre + "malam (jam 23): tema malam", theme(A) == "night", theme(A)); shot(A, "ph-%dx%d-kunci-malam" % vp)
    unlock(A); ev(A, "NW.phone.go('open','pengaturan')"); settle(A, 0.3)
    A.click("#nphAppB [data-k=theme] [data-v=day]"); settle(A, 0.3)
    ok(pre + "Pengaturan: paksa 'Siang' saat malam → tema siang", theme(A) == "day" and json.loads(ev(A, "localStorage.getItem('nusa_phone_prefs_v1')"))["theme"] == "day")
    A.click("#nphAppB [data-k=theme] [data-v=auto]"); settle(A, 0.3)
    ok(pre + "Pengaturan: 'Otomatis' kembali mengikuti jam dunia (malam)", theme(A) == "night")
    # casing
    ok(pre + "casing bawaan = dasar (dimiliki semua pemain); model toko terkunci bila belum dimiliki", ev(A, "document.getElementById('nphDev').dataset.model") == "dasar" and ev(A, "[...document.querySelectorAll('#nphAppB [data-k=casing] button')].map(b=>b.disabled)") == [False, True, True, True, True, True, True])
    A.click("#nphAppB [data-k=casing] [data-v=s3]", force=True); settle(A, 0.2)
    ok(pre + "memilih casing yang belum dimiliki tidak mengubah apa pun", ev(A, "document.getElementById('nphDev').dataset.model") == "dasar")
    ev(A, "NW.phone.go('home')"); close_phone(A); set_hour(A, 9)

def sec_reduced(b, br):
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", reduced="reduce"); phone_ready(A); settle(A, 0.5)
    open_phone(A); settle(A, 0.1)
    ok("R1 reduced-motion sistem: kelas rm aktif, buka/tutup tanpa transisi", ev(A, "document.getElementById('nphRoot').classList.contains('rm')") and ev(A, "getComputedStyle(document.getElementById('nphDev')).transitionDuration") in ("0s", "0s, 0s") and ev(A, "document.getElementById('nphRoot').classList.contains('on')"))
    ok("R2 reduced-motion: animasi 'geser ke atas' dimatikan", ev(A, "getComputedStyle(document.getElementById('nphGrab')).animationName") == "none")
    ok("R3 reduced-motion: ponsel muncul di tangan karakter seketika", ev(A, "(()=>{const p=NW.world.player;return p.phoneOn===true})()"))
    close_phone(A); settle(A, 0.1)
    ok("R4 reduced-motion: tutup seketika (panel langsung tersembunyi)", ev(A, "document.getElementById('nphRoot').classList.contains('hidden')"))
    ctx.close()
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi"); phone_ready(A); open_phone(A); unlock(A); ev(A, "NW.phone.go('open','pengaturan')"); settle(A, 0.3)
    ok("R5 tanpa reduced-motion sistem: animasi aktif", not ev(A, "document.getElementById('nphRoot').classList.contains('rm')"))
    A.click("#nphAppB [data-k=motion] [data-v=off]"); settle(A, 0.3)
    ok("R6 Pengaturan 'Animasi: Mati' → kelas rm aktif (mengalahkan sistem)", ev(A, "document.getElementById('nphRoot').classList.contains('rm')") and ev(A, "getComputedStyle(document.getElementById('nphDev')).transitionDuration") in ("0s", "0s, 0s"))
    A.click("#nphAppB [data-k=motion] [data-v=on]"); settle(A, 0.3)
    ok("R7 'Animasi: Hidup' → kelas rm padam", not ev(A, "document.getElementById('nphRoot').classList.contains('rm')"))
    A.click("#nphAppB [data-k=motion] [data-v=auto]"); ctx.close()

def sec_offline(b, br):
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); phone_ready(A); settle(A, 0.5)
    reqs = []; A.on("request", lambda r: reqs.append(r.url) if "/fn/" in r.url else None)
    open_phone(A); unlock(A)
    ok("O1 tersambung: status 'Terhubung', tidak ada ikon terkunci", link_text(A) == "Terhubung" and ev(A, "document.querySelectorAll('#nphGrid .nph-ic.locked').length") == 0)
    ctx.set_offline(True); wait_for(A, "document.getElementById('nphLinkTx').textContent==='Koneksi terputus'", 4); settle(A, 0.3)
    ok("O2 koneksi putus: tertulis 'Koneksi terputus' di bilah status", link_text(A) == "Koneksi terputus" and ev(A, "document.getElementById('nphLink').classList.contains('off')"))
    ok("O3 tiga aplikasi jaringan (Klippy, NusaChat, Dompet) terkunci; Peta, PlayGame, Pengaturan tetap bisa", ev(A, "[...document.querySelectorAll('#nphGrid .nph-ic.locked')].map(b=>b.dataset.app)") == ["klippy", "nusachat", "dompet"])
    n0 = len(reqs)
    for app in ("klippy", "nusachat", "dompet"):
        ev(A, "(a)=>NW.phone.go('open',a)", app); settle(A, 0.25)
        t = ev(A, "document.getElementById('nphAppB').innerText")
        ok("O4-%s buka %s saat putus: tampil 'Koneksi terputus', tanpa konten palsu/offline" % (app, app), "Koneksi terputus" in t and "tidak ada mode offline" in t.lower() and ev(A, "!!document.querySelector('#nphAppB .nph-lockpane[role=alert]')"), t[:100])
        ev(A, "NW.phone.go('home')")
    r = ev(A, "async()=>{try{await NW.phone.call('gameFlags',{});return 'lolos'}catch(e){return e.code+':'+e.message}}")
    ok("O5 panggilan jaringan lewat adaptor ponsel DITOLAK saat putus tanpa menyentuh server", r.startswith("unavailable") and len(reqs) == n0, [r, len(reqs) - n0])
    ev(A, "NW.phone.go('open','pengaturan')"); settle(A, 0.2); ok("O6 Pengaturan (lokal) tetap bisa dibuka saat putus", "Tema" in ev(A, "document.getElementById('nphAppB').innerText")); ev(A, "NW.phone.go('home')")
    shot(A, "ph-412x915-home-putus"); ev(A, "NW.phone.go('open','klippy')"); settle(A, 0.3); shot(A, "ph-412x915-klippy-putus"); ev(A, "NW.phone.go('home')")
    ctx.set_offline(False); ok("O7 koneksi pulih: kembali 'Terhubung', kunci aplikasi terlepas", wait_for(A, "document.getElementById('nphLinkTx').textContent==='Terhubung'", 8) and ev(A, "document.querySelectorAll('#nphGrid .nph-ic.locked').length") == 0, link_text(A))
    # server gagal padahal perangkat daring: tetap TERPUTUS (tidak berpura-pura)
    ctx.route("**/fn/gameFlags", lambda r: r.abort()); close_phone(A); open_phone(A); wait_for(A, "document.getElementById('nphLinkTx').textContent==='Koneksi terputus'", 6)
    ok("O8 server tak terjangkau padahal perangkat daring → tetap 'Koneksi terputus' (bukan mode offline palsu)", link_text(A) == "Koneksi terputus" and ev(A, "navigator.onLine"), link_text(A))
    ctx.unroute("**/fn/gameFlags"); close_phone(A); open_phone(A); ok("O9 server pulih → 'Terhubung' lagi", wait_for(A, "document.getElementById('nphLinkTx').textContent==='Terhubung'", 8), link_text(A))
    ok("O10 pulih tanpa muat ulang; sesi game tetap berjalan (tidak ada galat skrip)", not [e for e in errs if "PAGEERR" in e], errs[:2])
    ctx.close()

def sec_chat(b, br):
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(360, 740)); phone_ready(A); wait_for(A, "NW.mp.view().online", 20); settle(A, 0.5)
    open_phone(A)
    ok("C1 tombol obrolan tetap terlihat & bisa diklik saat ponsel terbuka", ev(A, "(()=>{const b=document.getElementById('mpChatBtn');if(!b)return false;const r=b.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e===b||b.contains(e)})()"))
    A.click("#mpChatBtn"); settle(A, 0.6)
    ok("C2 membuka obrolan menutup ponsel (obrolan tidak tertutup), pemain bisa mengetik", not is_open(A) and ev(A, "document.body.classList.contains('mp-chat-open')"))
    m = measure(A, [".mp-chat"], ["#joy", "#nphDev", "#phoneBtn"]); ok("C3 panel obrolan tidak menimpa joystick; ponsel tidak terbuka bersamaan", not m["hit"], m)
    ok("C4 selama obrolan terbuka ponsel tidak bisa dibuka dari tombol (tidak menumpuk)", ev(A, "NW.phone.open()") is False and not is_open(A))
    ev(A, "document.querySelector('.mp-chat header button')&&document.querySelector('.mp-chat header button').click()"); settle(A, 0.4)
    ctx.close()

def sec_players(b, br):
    ctxA, A, eA = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); ctxB, B, eB = X.new_page(b, br, "demo-b", "Sari", vp=(412, 915)); ctxC, Cc, eC = X.new_page(b, br, "demo-owner", "Dewi", vp=(412, 915), phone=False)
    for pg in (A, B, Cc): wait_for(pg, "NW.mp.view().online", 25)
    for pg in (A, B): phone_ready(pg)
    for pg in (A, B, Cc): ev(pg, "(()=>{const p=NW.world.player;p.x=19.5;p.y=20.6})()")
    wait_for(A, "NW.mp.view().players.length>=2", 15); time.sleep(2.0)
    cnt = lambda: [ev(x, "NW.mp.view().serverCount") for x in (A, B, Cc)]
    for pg in (A, B, Cc): wait_for(pg, "NW.mp.view().serverCount===3", 20)
    time.sleep(1.0); n0 = cnt(); sees = lambda pg, who: ev(pg, "(n)=>{const v=NW.mp._R.players;for(const p of v.values())if(p.name===n)return p.f;return -1}", who)
    ok("P0 tiga pemain terhitung di angka server (A, B pakai modul ponsel; C tanpa modul)", n0 == [3, 3, 3], n0)
    f0 = [sees(B, "Budi"), sees(Cc, "Budi")]; open_phone(A); time.sleep(2.5)
    fB, fC = sees(B, "Budi"), sees(Cc, "Budi")
    ok("P1 A membuka ponsel → B melihat bendera 'memegang ponsel' (bit 32) lewat server realtime", (fB & 32) == 32 and (f0[0] & 32) == 0, [f0, fB])
    ok("P2 pemain tanpa modul ponsel (C) hanya menerima bendera & tidak error/tidak menggambar apa pun", (fC & 32) == 32 and not [e for e in eC if "PAGEERR" in e] and ev(Cc, "typeof NW.phone") == "undefined", [fC, eC[:2]])
    ok("P3 hitungan server tidak berubah selama animasi (3 klien)", cnt() == n0, cnt())
    time.sleep(1.0); shot(B, "ph-412x915-pemain-lain-melihat-ponsel")
    wait_for(B, "(()=>{for(const p of NW.mp._R.players.values())if(p.name==='Budi')return !!p.ch.phoneOn&&p.ch._ph>0.75;return false})()", 30)
    ok("P4 di layar B karakter A tergambar memegang ponsel (ch.phoneOn menyala, kemajuan animasi penuh)", ev(B, "(()=>{for(const p of NW.mp._R.players.values())if(p.name==='Budi')return !!p.ch.phoneOn&&p.ch._ph>0.75;return false})()"), ev(B, "(()=>{for(const p of NW.mp._R.players.values())if(p.name==='Budi')return [p.ch.phoneOn,p.ch._ph];return null})()"))
    close_phone(A); time.sleep(2.5)
    ok("P5 A menutup ponsel → bendera padam di B & C; animasi karakter turun", (sees(B, "Budi") & 32) == 0 and (sees(Cc, "Budi") & 32) == 0 and cnt() == n0, [sees(B, "Budi"), sees(Cc, "Budi"), cnt()])
    open_phone(A); open_phone(B); time.sleep(2.5)
    ok("P6 dua pemain membuka ponsel bersamaan: saling melihat, hitungan tetap", (sees(A, "Sari") & 32) == 32 and (sees(B, "Budi") & 32) == 32 and cnt() == n0, [sees(A, "Sari"), sees(B, "Budi"), cnt()])
    # putus-sambung: bendera tidak 'tersangkut'
    ev(A, "NW.mp._R.ws.close()"); wait_for(A, "NW.mp.view().online", 30)
    for pg in (A, B, Cc): wait_for(pg, "NW.mp.view().serverCount===3", 25)
    time.sleep(3.0)
    t7 = time.time()
    while time.time() - t7 < 25 and not (cnt() == n0 and (sees(B, "Budi") & 32) == 32): time.sleep(0.5)
    ok("P7 putus-sambung saat ponsel terbuka: pemain tetap SATU, hitungan tetap, bendera terkirim ulang", cnt() == n0 and (sees(B, "Budi") & 32) == 32 and len([p for p in ev(B, "NW.mp.view().players") if p['name'] == 'Budi']) == 1, [cnt(), sees(B, "Budi")])
    close_phone(A); close_phone(B); time.sleep(1.0)
    errs = [e for e in eA + eB if "PAGEERR" in e]; ok("P8 tanpa galat skrip di semua klien", not errs, errs[:2])
    for c in (ctxA, ctxB, ctxC): c.close()

def sec_layout(b, br):
    for vp in VPS:
        tag = "%dx%d" % vp
        ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=vp); phone_ready(A); wait_for(A, "NW.mp.view().online", 20); settle(A, 0.8)
        sec_basic(A, errs, vp)
        sec_theme(A, vp)
        ok("L-%s tanpa galat skrip" % tag, not [e for e in errs if "PAGEERR" in e], errs[:2])
        ctx.close()

def main():
    br = PB()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            only = os.environ.get("PH_ONLY", "")
            if not only or only == "flags":
                ctx, A, errs = sec_flags(b, br); ctx.close(); sec_flaky_gate(b, br)
            if not only or only == "layout": sec_layout(b, br)
            if not only or only == "reduced": sec_reduced(b, br)
            if not only or only == "offline": sec_offline(b, br)
            if not only or only == "chat": sec_chat(b, br)
            if not only or only == "players": sec_players(b, br)
            b.close()
    finally: br.close()
    f = [r for r in X.R if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(X.R) - len(f), len(f)))
    sys.exit(1 if f else 0)
if __name__ == "__main__": main()
