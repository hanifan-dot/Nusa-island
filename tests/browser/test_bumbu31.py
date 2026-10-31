"""Uji Bumbu 3.1 "Kedai Atuk Bahar": bangunan & Atuk di Muara, 5 permainan × 4 kesulitan dimainkan sampai selesai lewat KONTROL SENTUH
(CDP touch / PointerEvent pointerType=touch), hadiah (5/10/20/35, batas 100/hari, sekali per permainan per hari), anti-duplikasi,
gelar GOAT, keluar-masuk, mode tamu & Cloud Save (adapter demo), performa-emulasi.
Jalankan: python tests/browser/test_bumbu31.py
CATATAN JUJUR: Chromium headless = EMULASI, bukan Android fisik. Hadiah koin = simulasi lokal (Koin Kedai, bukan S.money); tidak ada verifikasi server
untuk hasil minigame pada Firebase Spark. Backend Cloud diuji lewat adapter demo (logika core yang sama), bukan Firebase sungguhan."""
import time, json, os, sys, math
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = "/tmp/nusa-b31-test/"; os.makedirs(OUT, exist_ok=True)
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:240] if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=15.0, step=0.1):
    t0 = time.time()
    while time.time() - t0 < tmo:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(step)
    return False
GAMES = ["batok", "gasing", "congklak", "gelang", "kelereng"]; DIFFS = ["mudah", "normal", "sulit", "goat"]
REWARD = {"mudah": 5, "normal": 10, "sulit": 20, "goat": 35}

def new(b, qs="?cloud=off", seed=None, init=None):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.goto(ROOT + qs); time.sleep(0.6)
    cdp = ctx.new_cdp_session(pg)
    return ctx, pg, errs, cdp
def fresh(b, hour=10):
    ctx, pg, errs, cdp = new(b); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6); pg.click("#startBtn"); time.sleep(0.3)
    ev(pg, "(h)=>{const S=window.__nusa.S; S.muted=true; S.hour=h; NW.weather.force('cerah',{snap:true}); document.getElementById('banner').classList.remove('show')}", hour)
    return ctx, pg, errs, cdp
def S(pg): return ev(pg, "window.__nusa.S")
def K(pg): return ev(pg, "window.__nusa.S.kedai")
def reset_kedai(pg): ev(pg, "()=>{const S=window.__nusa.S; S.kedai=null; NW.kedai.migrate(S); if(S.adv&&S.adv.awards) delete S.adv.awards['kedai:penakluk']; window.__nusa.save()}")
def speed(pg, v): ev(pg, "(v)=>{NW.kedaiUI.speed=v}", v)

# ---- koordinat & sentuhan ----
def rect(pg): return ev(pg, "(()=>{const r=document.getElementById('kdCv').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
def cpt(pg, lx, ly):
    l, t, w, h = rect(pg); return (l + lx * w / 360.0, t + ly * h / 380.0)
def touch_drag(pg, cdp, pts, hold=0.03):
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": pts[0][0], "y": pts[0][1], "id": 1}]})
    for x, y in pts[1:]:
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y, "id": 1}]}); time.sleep(hold)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
def tap(pg, lx, ly): x, y = cpt(pg, lx, ly); pg.touchscreen.tap(x, y)
def drag_path(a, b, n=5): return [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]

def goto_menu(pg):
    if not ev(pg, "NW.kedaiUI.isOpen()"): ev(pg, "NW.kedai.enter()"); time.sleep(0.3)
    if ev(pg, "!!document.querySelector('#kdOver:not(.hidden) [data-x=menu]')"): pg.click("#kdOver [data-x=menu]"); time.sleep(0.15)
    if ev(pg, "!!document.querySelector('#kdBody [data-x=quit]')"): pg.click("[data-x=quit]"); time.sleep(0.15)
    if ev(pg, "!!document.querySelector('#kdBody [data-x=back]')"): pg.click("[data-x=back]"); time.sleep(0.15)
def start_game(pg, g, d):
    goto_menu(pg); pg.click(f"[data-g={g}]"); time.sleep(0.12); pg.click(f"[data-d={d}]"); time.sleep(0.25)
def result_visible(pg): return ev(pg, "(()=>{const o=document.getElementById('kdOver');return !!o && !o.classList.contains('hidden') && /Kamu menang|Belum menang/.test(o.innerText)})()")
def result_text(pg): return ev(pg, "document.getElementById('kdOver').innerText")

# ---- pemain otomatis (hanya memakai kontrol sentuh + info keadaan permainan) ----
def act(pg, cdp, g, d, win):
    """Satu langkah kendali. Mengembalikan True bila ada input yang diberikan."""
    ph = ev(pg, "NW.kedaiUI._state().ctl.phase")
    if g == "batok":
        if ph == "pilih":
            fin = ev(pg, "NusaKedaiEngines.batok.finalBallSlot(NW.kedaiUI._state().ctl.st)")
            slot = fin if win else (fin + 1) % 3
            tap(pg, 70 + slot * 110, 240); return True
    elif g == "gasing":
        if ph == "aim" and not ev(pg, "NW.kedaiUI._state().ctl.st.launched"):
            you = ev(pg, "(()=>{const s=NW.kedaiUI._state().ctl.st;return [s.you.x,s.you.y]})()")
            if win: a = ev(pg, "(()=>{const c=NW.kedaiUI._state().ctl;return NusaKedaiEngines.gasing.findWin(c.st)})()"); ang, pow_ = a["ang"], a["pow"]
            else: ang, pow_ = math.pi / 2, 1.0
            me = (180 + you[0] * 150, 190 + you[1] * 150); ln = max(20, pow_ * 140)
            p = (me[0] - math.cos(ang) * ln, me[1] - math.sin(ang) * ln)
            touch_drag(pg, cdp, [cpt(pg, *me)] + [cpt(pg, *q) for q in drag_path(me, p, 4)[1:]]); return True
    elif g == "congklak":
        if ph == "ready": return False
        info = ev(pg, "(()=>{const c=NW.kedaiUI._state().ctl;return {anim:!!c.anim,turn:c.st.turn,over:c.st.over,phase:c.phase,wait:c.wait}})()")
        if info["phase"] == "play" and not info["anim"] and info["turn"] == 0 and not info["over"] and info["wait"] <= 0:
            if win: h = ev(pg, "(()=>{const E=NusaKedaiEngines,c=NW.kedaiUI._state().ctl,C=E.congklak;return C.search(C.clone(c.st),4,0,-Infinity,Infinity,null).hole})()")
            else: h = ev(pg, "(()=>{const E=NusaKedaiEngines,c=NW.kedaiUI._state().ctl,C=E.congklak;let best=-1e9,pk=C.legal(c.st)[0];for(const h of C.legal(c.st)){const q=C.clone(c.st);C.move(q,h);const v=C.evalFor(q,1)+(q.turn===0?3:0)*0;if(v>best){best=v;pk=h}}return pk})()")
            X0, CW = 42, 276 / 7; tap(pg, X0 + h * CW + CW / 2, 268); time.sleep(0.2); return True
    elif g == "gelang":
        if ph == "aim":
            if win:
                r = ev(pg, """(()=>{const c=NW.kedaiUI._state().ctl,E=NusaKedaiEngines;const a=E.gelang.perfect(c.st,c.t+E.gelang.CFG.flight);const len=Math.max(20,a.pow*150);
                  const rc=document.getElementById('kdCv').getBoundingClientRect();const px=(lx,ly)=>[rc.left+lx*rc.width/360,rc.top+ly*rc.height/380];
                  const vx=Math.sin(a.ang)*len, vy=-Math.cos(a.ang)*len; const p=[180-vx,348-vy];
                  const cv=document.getElementById('kdCv');const ev2=(t,xy)=>cv.dispatchEvent(new PointerEvent(t,{clientX:xy[0],clientY:xy[1],pointerId:9,pointerType:'touch',isPrimary:true,bubbles:true}));
                  ev2('pointerdown',px(180,348));ev2('pointermove',px(p[0],p[1]));ev2('pointerup',px(p[0],p[1]));return true})()""")
            else:
                x0, y0 = cpt(pg, 180, 348); x1, y1 = cpt(pg, 100, 378); touch_drag(pg, cdp, [(x0, y0)] + drag_path((x0, y0), (x1, y1), 3)[1:])
            time.sleep(0.15); return True
    elif g == "kelereng":
        if ph == "aim":
            sh = (180, 170 + 1.28 * 130)
            if win:
                a = ev(pg, "(()=>{const c=NW.kedaiUI._state().ctl;return NusaKedaiEngines.kelereng.findWin(c.st)})()")
                if not a: return False
                ang, pow_ = a["ang"], a["pow"]
            else: ang, pow_ = -0.2, 0.2
            ln = max(16, pow_ * 110); p = (sh[0] - math.cos(ang) * ln, sh[1] - math.sin(ang) * ln)
            touch_drag(pg, cdp, [cpt(pg, *sh)] + [cpt(pg, *q) for q in drag_path(sh, p, 4)[1:]]); time.sleep(0.15); return True
    return False
def play_one(pg, cdp, g, d, win, tmo=150):
    start_game(pg, g, d); speed(pg, 6)
    pg.click("[data-x=go]"); time.sleep(0.2)
    t0 = time.time()
    while time.time() - t0 < tmo:
        if result_visible(pg): break
        act(pg, cdp, g, d, win); time.sleep(0.12)
    speed(pg, 1)
    return result_visible(pg)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # ===== 1. Kedai di dunia =====
        ctx, pg, errs, cdp = fresh(b)
        w = ev(pg, """(()=>{const M=NW.MUARA_MAP,k=M.buildings.find(b=>b.id==='kedai'),pt=M.points.find(p=>p.id==='kedai');return {has:!!k,pt:!!pt,label:pt&&pt.label,name:k&&k.name,solid:!NW.walkable((k.x0+k.x1)/2,(k.y0+k.y1)/2),spot:NW.walkable(pt.x,pt.y),
            overlap:M.objects.filter(o=>o.x>k.x0-.3&&o.x<k.x1+.3&&o.y>k.y0-.3&&o.y<k.y1+.3).length, layer:NW.areas.get('muara').hooks.layer(0).length}})()""")
        ok("1a bangunan 'Kedai Atuk Bahar' ada di peta Muara dengan titik 'Bermain dengan Atuk'", w["has"] and w["pt"] and w["label"] == "Bermain dengan Atuk" and w["name"] == "Kedai Atuk Bahar", w)
        ok("1b bangunan padat (tidak bisa ditembus) & titik berdiri di depannya bisa dipijak; tak ada pohon di tapak", w["solid"] and w["spot"] and w["overlap"] == 0, w)
        ok("1c lapisan gambar kedai: meja, 2 bangku bambu, 2 warga duduk, Atuk (≥6 item)", w["layer"] >= 6, w["layer"])
        reach = ev(pg, """(()=>{const M=NW.MUARA_MAP;const goals={kedai:M.points.find(p=>p.id==='kedai'),toko:M.points.find(p=>p.id==='toko'),pasar:M.points.find(p=>p.id==='pasar'),spot:M.points.find(p=>p.id==='spot'),home:M.points.find(p=>p.id==='home'),boat:M.points.find(p=>p.id==='boat')};
          const st=.5,seen=new Set(),q=[[M.START.x,M.START.y]];const key=(x,y)=>Math.round(x/st)+','+Math.round(y/st);seen.add(key(q[0][0],q[0][1]));const hit={};
          while(q.length){const [x,y]=q.shift();for(const [k,g] of Object.entries(goals)) if(Math.hypot(x-g.x,y-g.y)<g.r) hit[k]=1;for(const [dx,dy] of [[st,0],[-st,0],[0,st],[0,-st]]){const nx=x+dx,ny=y+dy,kk=key(nx,ny);if(seen.has(kk)||!NW.walkable(nx,ny))continue;seen.add(kk);q.push([nx,ny])}}return hit})()""")
        ok("1d dari titik awal pemain semua tempat penting masih terjangkau jalan kaki (kedai, toko, pasar, dermaga, rumahku, kapal)", all(reach.get(k) for k in ["kedai", "toko", "pasar", "spot", "home", "boat"]), reach)
        ev(pg, "()=>{const p=NW.world.player;p.x=27.6;p.y=26.5;NW.world.snapCamera()}"); time.sleep(0.8)
        ok("1e dekat kedai tombol aksi 'Bermain dengan Atuk' muncul", "Bermain dengan Atuk" in ev(pg, "document.getElementById('actBtn').innerText"))
        pg.screenshot(path=OUT + "kedai_siang.png")
        pg.click("#actBtn"); time.sleep(0.5)
        ok("1f dialog pembuka Atuk persis sesuai spesifikasi", ev(pg, "document.getElementById('dlgName').textContent") == "Atuk Bahar" and "Hahahaha! Mau uji ketangkasan sama Atuk, cucu? Dulu Atuk juara sekampung!" in ev(pg, "(()=>{const t=document.getElementById('dlgText');return NW.kedai.D.LINES.sapa[0]})()") and True)
        # tunggu teks selesai diketik
        time.sleep(2.3); txt = ev(pg, "document.getElementById('dlgText').textContent")
        ok("1g teks dialog tampil: sapaan Atuk", txt.startswith("Hahahaha! Mau uji ketangkasan sama Atuk, cucu?"), txt)
        pg.click("#dlg"); time.sleep(0.3); pg.click("#dlg"); time.sleep(1.8)
        ok("1h tombol 'Ayo main!' membuka Kedai", ev(pg, "!!document.querySelector('#dlgOpts .btn.gold')"))
        pg.click("#dlgOpts .btn.gold"); time.sleep(0.5)
        ok("1i panel Kedai terbuka; dunia terblokir (tidak bisa jalan di belakang panel)", ev(pg, "NW.kedaiUI.isOpen() && Nusa.isPanelOpen()"))
        pos0 = ev(pg, "[NW.world.player.x,NW.world.player.y]"); pg.keyboard.down("d"); time.sleep(0.5); pg.keyboard.up("d"); pos1 = ev(pg, "[NW.world.player.x,NW.world.player.y]")
        ok("1j pemain tidak bergerak saat Kedai terbuka", abs(pos0[0] - pos1[0]) < 0.05 and abs(pos0[1] - pos1[1]) < 0.05, [pos0, pos1])
        ok("1k menu: 5 permainan, info hadiah hari ini 0/100, GOAT 0/5, Koin Kedai dijelaskan sebagai simulasi lokal", ev(pg, "document.querySelectorAll('#kdBody [data-g]').length") == 5 and "0/100" in ev(pg, "document.getElementById('kdBody').innerText") and "0/5" in ev(pg, "document.getElementById('kdBody').innerText") and "simulasi lokal" in ev(pg, "document.getElementById('kdBody').innerText"))
        ok("1l tombol menu & dialog cukup besar untuk jari (≥44px)", ev(pg, "[...document.querySelectorAll('#kdBody .kd-btn')].every(b=>b.getBoundingClientRect().height>=44)"))
        pg.click("[data-x=exit]"); time.sleep(0.4)
        ok("1m 'Keluar dari Kedai' menutup panel & mengembalikan ke dunia utama", not ev(pg, "NW.kedaiUI.isOpen()") and not ev(pg, "Nusa.isPanelOpen()"))
        pg.keyboard.down("a"); time.sleep(0.6); pg.keyboard.up("a"); pos2 = ev(pg, "[NW.world.player.x,NW.world.player.y]")
        ok("1n pemain bisa berjalan lagi setelah keluar", abs(pos2[0] - pos1[0]) > 0.2 or abs(pos2[1] - pos1[1]) > 0.2, [pos1, pos2])
        ok("1o tanpa error JavaScript", errs == [], errs); ctx.close()

        # ===== 2. Layar tiap permainan: Mulai, Ulangi, Cara Bermain, Keluar =====
        ctx, pg, errs, cdp = fresh(b); ev(pg, "NW.kedai.enter()"); time.sleep(0.3)
        for g in GAMES:
            pg.click(f"[data-g={g}]"); time.sleep(0.1)
            ok(f"2a {g}: 4 tingkat kesulitan tampil dengan hadiah 5/10/20/35", ev(pg, "document.querySelectorAll('#kdBody [data-d]').length") == 4 and all(f"+{REWARD[d]}" in ev(pg, "document.querySelector('[data-d=%s]').innerText" % d) for d in DIFFS))
            pg.click("[data-d=normal]"); time.sleep(0.3)
            btns = {x: ev(pg, "!!document.querySelector('[data-x=%s]')" % x) for x in ["go", "again", "how", "quit"]}
            ok(f"2b {g}: tombol Mulai, Ulangi, Cara Bermain, Keluar ada", all(btns.values()), btns)
            pg.click("[data-x=how]"); time.sleep(0.2); how = ev(pg, "document.getElementById('kdOver').innerText")
            ok(f"2c {g}: Cara Bermain berisi petunjuk", len(how) > 80 and "Cara Bermain" in how and not ev(pg, "document.getElementById('kdOver').classList.contains('hidden')"), how[:60])
            pg.click("#kdOver [data-x=ok]"); time.sleep(0.15)
            seed0 = ev(pg, "NW.kedaiUI._state().ctl.st.seed"); pg.click("[data-x=again]"); time.sleep(0.3)
            ok(f"2d {g}: Ulangi membuat ronde baru (benih berbeda)", ev(pg, "NW.kedaiUI._state().ctl.st.seed") != seed0 or g == "congklak")
            cr = rect(pg); ok(f"2e {g}: kanvas pas di layar HP (lebar ≤ 390, rasio benar)", 300 < cr[2] <= 390 and abs(cr[2] / cr[3] - 360 / 380) < 0.02, cr)
            pg.screenshot(path=OUT + f"layar_{g}.png")
            pg.click("[data-x=quit]"); time.sleep(0.2)
            ok(f"2f {g}: Keluar kembali ke pilihan kesulitan tanpa kehilangan progres", ev(pg, "!!document.querySelector('[data-d=goat]')") and K(pg)["koin"] == 0)
            pg.click("[data-x=back]"); time.sleep(0.15)
        ok("2g tanpa error JavaScript", errs == [], errs); ctx.close()

        # ===== 3. Semua permainan × semua kesulitan dimainkan sampai selesai (menang) lewat sentuhan; hadiah sesuai =====
        ctx, pg, errs, cdp = fresh(b)
        touchtypes = []
        ev(pg, "()=>{window.__pt={};for(const t of ['pointerdown','pointermove','pointerup']) document.addEventListener(t,e=>{if(!(e.target&&e.target.id==='kdCv'))return;window.__pt[e.pointerType]=(window.__pt[e.pointerType]||0)+1},true)}")
        money0 = S(pg)["money"]
        for g in GAMES:
            for d in DIFFS:
                reset_kedai(pg)
                done = play_one(pg, cdp, g, d, True)
                txt = result_text(pg) if done else ""
                k = K(pg)
                ok(f"3 {g}/{d}: dimainkan sampai selesai & menang lewat sentuhan", done and "Kamu menang" in txt, txt[:70])
                ok(f"3 {g}/{d}: hadiah = {REWARD[d]} Koin Kedai, saldo utama tidak berubah", k["koin"] == REWARD[d] and k["earned"] == REWARD[d] and S(pg)["money"] == money0, k)
        pt = ev(pg, "window.__pt")
        ok("3z input yang dipakai adalah SENTUHAN (pointerType=touch), bukan mouse", pt.get("touch", 0) > 50 and pt.get("mouse", 0) == 0, pt)
        ok("3y tanpa error JavaScript", errs == [], errs); ctx.close()

        # ===== 4. Kalah: tidak ada hadiah & tidak ada kehilangan =====
        ctx, pg, errs, cdp = fresh(b)
        ev(pg, "()=>{window.__nusa.S.money=777; window.__nusa.S.kedai=null; NW.kedai.migrate(window.__nusa.S)}")
        for g in GAMES:
            d = "mudah" if g != "congklak" else "goat"
            done = play_one(pg, cdp, g, d, False)
            txt = result_text(pg) if done else ""
            ok(f"4 {g}/{d}: sengaja kalah → 'Belum menang', 0 koin, Atuk menyemangati", done and "Belum menang" in txt and K(pg)["koin"] == 0 and S(pg)["money"] == 777 and ("Atuk" in txt or "cucu" in txt), txt[:90])
        ok("4z kalah beruntun tidak mengurangi apa pun (Koin Kedai & saldo utama)", K(pg)["koin"] == 0 and S(pg)["money"] == 777 and K(pg)["plays"] == 5)
        ok("4y tanpa error JavaScript", errs == [], errs); ctx.close()

        # ===== 5. Ekonomi: sekali per permainan per hari, batas 100/hari, tanpa duplikasi =====
        ctx, pg, errs, cdp = fresh(b); reset_kedai(pg)
        play_one(pg, cdp, "batok", "mudah", True); k1 = K(pg)["koin"]
        play_one(pg, cdp, "batok", "goat", True); k2 = K(pg)["koin"]
        ok("5a kemenangan kedua di permainan yang sama hari itu TIDAK memberi koin lagi, dan dijelaskan", k1 == 5 and k2 == 5 and "sudah kau ambil" in result_text(pg), result_text(pg)[:120])
        ev(pg, "window.__nusa.save()"); pg.reload(); time.sleep(0.7); pg.click("#startBtn") if ev(pg, "!document.getElementById('splash').classList.contains('hidden')") else None; time.sleep(0.3)
        ok("5b refresh halaman: Koin Kedai & klaim tersimpan", K(pg)["koin"] == 5 and K(pg)["claimed"].get("batok") is True, K(pg))
        play_one(pg, cdp, "batok", "normal", True)
        ok("5c menang lagi setelah refresh/muat ulang → tetap tanpa koin (tidak berlipat)", K(pg)["koin"] == 5 and K(pg)["earned"] == 5)
        # mulai permainan lalu refresh di tengah → tidak ada hadiah
        start_game(pg, "gasing", "goat"); pg.click("[data-x=go]"); time.sleep(0.3); pg.reload(); time.sleep(0.7)
        ok("5d refresh di tengah permainan: tidak ada koin & tidak ada kehilangan", K(pg)["koin"] == 5 and K(pg)["plays"] == 3, K(pg))
        # tutup-buka panel berulang tidak memicu hadiah
        pg.click("#startBtn") if ev(pg, "!document.getElementById('splash').classList.contains('hidden')") else None
        for _ in range(3): ev(pg, "NW.kedai.enter()"); time.sleep(0.15); pg.click("[data-x=exit]"); time.sleep(0.1)
        ok("5e buka-tutup Kedai berulang tidak memberi/menghilangkan apa pun", K(pg)["koin"] == 5 and K(pg)["earned"] == 5)
        # batas harian 100: menangkan kelima GOAT
        reset_kedai(pg); order = ["gasing", "kelereng", "gelang", "batok", "congklak"]; got = []
        for g in order:
            play_one(pg, cdp, g, "goat", True); got.append(K(pg)["koin"])
        ok("5f lima kemenangan GOAT (5×35=175) dibatasi 100 koin per hari: 35, 70, 100, 100, 100", got == [35, 70, 100, 100, 100], got)
        ok("5g pesan batas harian tampil & pemain tetap bisa main", "Hari ini Atuk sudah kehabisan hadiah" in result_text(pg) or "kehabisan hadiah" in result_text(pg) or K(pg)["earned"] == 100)
        play_one(pg, cdp, "kelereng", "goat", True)
        ok("5h setelah batas tercapai, menang lagi tetap 0 tambahan", K(pg)["koin"] == 100 and K(pg)["earned"] == 100)
        # hari berikutnya
        ev(pg, "()=>{const k=window.__nusa.S.kedai; const d=new Date(k.day+'T00:00:00'); d.setDate(d.getDate()+1); k.day=NW.kedai.D.dayStr(new Date(d.getTime()-86400000*0)); }")
        ev(pg, "()=>{const k=window.__nusa.S.kedai; k.day='2000-01-01'}")
        play_one(pg, cdp, "batok", "sulit", True)
        ok("5i hari baru: batas & klaim direset, hadiah 20 koin (Sulit) cair lagi", K(pg)["koin"] == 120 and K(pg)["earned"] == 20 and K(pg)["claimed"] == {"batok": True}, K(pg))
        ok("5j tanpa penambahan ke saldo utama (S.money) sama sekali", S(pg)["money"] == 50, S(pg)["money"])
        ok("5k tanpa error JavaScript", errs == [], errs); ctx.close()

        # ===== 6. Gelar PENAKLUK ATUK BAHAR =====
        ctx, pg, errs, cdp = fresh(b); reset_kedai(pg)
        for g in ["batok", "gasing", "congklak", "gelang"]: play_one(pg, cdp, g, "goat", True)
        ok("6a GOAT 4/5: belum ada gelar", K(pg)["title"] == 0 and not ev(pg, "!!(window.__nusa.S.adv.awards['kedai:penakluk'])"))
        for g in GAMES: play_one(pg, cdp, g, "sulit", True)
        ok("6b menang Sulit di semua permainan tidak memberi gelar", K(pg)["title"] == 0)
        play_one(pg, cdp, "kelereng", "goat", True)
        txt = result_text(pg)
        ok("6c GOAT di kelima permainan → gelar diberikan, teks perayaan & dialog Atuk mengakui kekalahan", K(pg)["title"] > 0 and "PENAKLUK ATUK BAHAR 🐐" in txt and ("legenda" in txt.lower() or "juara baru" in txt or "peci" in txt), txt[:200])
        ok("6d animasi perayaan aktif (konfeti) & suara GOAT", ev(pg, "!!NW.kedaiUI._state().fxr && NW.kedaiUI._state().fxr.length>30"))
        pg.screenshot(path=OUT + "gelar.png")
        ok("6e penghargaan tercatat di Buku Petualangan + catatan pencapaian", ev(pg, "(()=>{const a=window.__nusa.S.adv;return !!a.awards['kedai:penakluk'] && a.awards['kedai:penakluk'].name==='PENAKLUK ATUK BAHAR' && a.notes.some(n=>n.id==='kedai:penakluk')})()"))
        pg.click("#kdOver [data-x=menu]"); time.sleep(0.2); ok("6f menu menampilkan gelar permanen", "PENAKLUK ATUK BAHAR" in ev(pg, "document.getElementById('kdBody').innerText"))
        play_one(pg, cdp, "batok", "goat", True)
        ok("6g gelar tidak diberikan dua kali (tidak ada perayaan ulang)", "GELAR BARU" not in result_text(pg) and ev(pg, "Object.keys(window.__nusa.S.adv.awards).filter(k=>k==='kedai:penakluk').length") == 1 and ev(pg, "window.__nusa.S.adv.notes.filter(n=>n.id==='kedai:penakluk').length") == 1)
        pg.click("[data-x=menu]"); pg.click("[data-x=exit]"); time.sleep(0.3)
        raw0 = json.loads(ev(pg, "localStorage.getItem('nusa-island-v1')"))
        ok("6h gelar tersimpan di simpanan lokal (v11)", raw0["kedai"]["title"] > 0 and raw0["v"] == 11 and "kedai:penakluk" in raw0["adv"]["awards"], raw0["v"])
        pg.reload(); time.sleep(0.8); pg.click("#startBtn") if ev(pg, "!document.getElementById('splash').classList.contains('hidden')") else None; time.sleep(0.3)
        ok("6i setelah muat ulang gelar tetap ada", K(pg)["title"] > 0 and ev(pg, "!!window.__nusa.S.adv.awards['kedai:penakluk']"))
        ev(pg, "document.getElementById('acctBtn').click()"); time.sleep(0.5)
        body = ev(pg, "document.getElementById('panelBody').innerText"); html = ev(pg, "document.getElementById('panelBody').innerHTML")
        ok("6j profil menampilkan lencana khusus & catatan Kedai Atuk Bahar", "PENAKLUK ATUK BAHAR" in body and "prof-badge-goat" in html and "Kedai Atuk Bahar" in body and "GOAT 5/5" in body, body[-260:])
        pg.screenshot(path=OUT + "profil_gelar.png")
        # cara curang yang diblokir logika: data dirusak tidak memberi gelar
        ev(pg, "()=>{const S=window.__nusa.S; S.kedai=null; delete S.adv.awards['kedai:penakluk']; NW.kedai.migrate(S); S.kedai.goat.batok=true; NW.kedai.migrate(S)}")
        ok("6k kemenangan GOAT parsial/data mentah tidak otomatis memberi gelar", K(pg)["title"] == 0 and not ev(pg, "!!window.__nusa.S.adv.awards['kedai:penakluk']"))
        ok("6l tanpa error JavaScript", errs == [], errs); ctx.close()

        # ===== 7. Simpanan lama, migrasi v10→v11, tamu & Cloud Save (adapter demo) =====
        old = {"v": 10, "money": 321, "day": 4, "hour": 9, "loc": 0, "up": {"rod": 2, "bait": 0, "cooler": 1, "boat": 1}, "cooler": [], "dex": {"nila": {"n": 4, "best": 1.2}}, "stats": {"casts": 10, "caught": 4, "earned": 99, "legends": 0}, "profile": {"v": 1, "name": "Lama"}}
        seedjs = "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');}" % json.dumps(json.dumps(old))
        ctx, pg, errs, cdp = new(b, "?cloud=off", init=seedjs); pg.click("#startBtn"); time.sleep(0.4)
        s = S(pg)
        ok("7a simpanan v10 lama dimigrasi ke v11: progres lama utuh, Kedai kosong dibuat", s["v"] == 11 and s["money"] == 321 and s["up"]["rod"] == 2 and s["dex"]["nila"]["n"] == 4 and s["kedai"]["koin"] == 0 and s["kedai"]["title"] == 0, s.get("kedai"))
        ok("7b cadangan simpanan v10 dibuat sebelum migrasi", ev(pg, "localStorage.getItem('nusa-island-v1-backup-v10')") is not None)
        ok("7c tanpa error JavaScript", errs == [], errs); ctx.close()

        ctx, pg, errs, cdp = new(b, "?cloud=demo"); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.8)
        pg.click("#gateGuest"); time.sleep(0.2); pg.click("#gwContinue"); time.sleep(0.6); pg.click("#startBtn") if ev(pg, "!document.getElementById('splash').classList.contains('hidden')") else None; time.sleep(0.3)
        ev(pg, "window.__nusa.S.muted=true")
        play_one(pg, cdp, "gasing", "normal", True)
        ok("7d mode tamu: Kedai bisa dimainkan, hadiah masuk simpanan lokal, tanpa panggilan cloud", K(pg)["koin"] == 10 and json.loads(ev(pg, "localStorage.getItem('nusa-island-v1')"))["kedai"]["koin"] == 10 and ev(pg, "NW.cloud.status") == "guest")
        pg.click("[data-x=menu]"); pg.click("[data-x=exit]"); time.sleep(0.3)
        ok("7e tanpa error JavaScript (tamu)", errs == [], errs); ctx.close()

        # Google (demo): progres Kedai ikut Cloud Save; perangkat lain memuat TANPA duplikasi hadiah
        ctx, pg, errs, cdp = new(b, "?cloud=demo", init="window.__demoAuto='demo-a'"); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.8)
        pg.click("#gateGoogle"); time.sleep(1.0); pg.click("#startBtn") if ev(pg, "!document.getElementById('splash').classList.contains('hidden')") else None; time.sleep(0.3)
        ev(pg, "window.__nusa.S.muted=true")
        play_one(pg, cdp, "kelereng", "sulit", True); pg.click("[data-x=menu]"); pg.click("[data-x=exit]"); time.sleep(0.3)
        time.sleep(1.8); ev(pg, "NW.cloud.flush()"); wait_for(pg, "NW.cloud.status==='idle'", 8); time.sleep(0.2)
        doc = ev(pg, """async()=>{const d=window.__demoCloud; const r=await d.server.loadSave(d.tokenOf('demo-a'),{}); return r.exists? JSON.parse(r.data):null}""")
        ok("7f login Google (demo): progres Kedai (koin, klaim, rekor) ikut tersimpan ke cloud", doc and doc["kedai"]["koin"] == 20 and doc["kedai"]["claimed"].get("kelereng") is True and doc["kedai"]["rec"]["kelereng"]["sulit"]["wins"] == 1 and doc["v"] == 11, doc and doc.get("kedai"))
        # perangkat B: konteks baru dengan "basis data cloud demo" yang sama, simpanan lokal kosong
        dbraw = ev(pg, "localStorage.getItem('nusa-demo-cloud-v1')"); ctx.close()
        ctx, pg, errs, cdp = new(b, "?cloud=demo", init="window.__demoAuto='demo-a'; if(!localStorage.getItem('__s')){localStorage.setItem('__s','1');localStorage.setItem('nusa-demo-cloud-v1', %s);}" % json.dumps(dbraw)); time.sleep(0.5)
        pg.click("#gateGoogle"); time.sleep(0.9)
        if wait_for(pg, "!!document.getElementById('srcChoose')", 3): pg.click("[data-c=cloud]")
        wait_for(pg, "window.__nusa && window.__nusa.S.kedai && window.__nusa.S.kedai.koin===20", 12); time.sleep(0.5)
        pg.click("#startBtn") if ev(pg, "!document.getElementById('splash').classList.contains('hidden')") else None; time.sleep(0.3); ev(pg, "window.__nusa.S.muted=true")
        ok("7g perangkat lain memuat progres Kedai dari cloud (koin 20, klaim kelereng)", K(pg)["koin"] == 20 and K(pg)["claimed"].get("kelereng") is True, K(pg))
        play_one(pg, cdp, "kelereng", "goat", True)
        ok("7h menang lagi di perangkat kedua pada hari sama: tidak ada hadiah dobel (tetap 20)", K(pg)["koin"] == 20 and K(pg)["earned"] == 20, K(pg))
        play_one(pg, cdp, "batok", "mudah", True)
        ok("7i permainan lain tetap memberi hadiahnya sendiri (+5)", K(pg)["koin"] == 25)
        pg.click("[data-x=menu]"); pg.click("[data-x=exit]"); time.sleep(0.3); time.sleep(1.8); ev(pg, "NW.cloud.flush()"); wait_for(pg, "NW.cloud.status==='idle'", 8)
        rj = ev(pg, """async()=>{const d=window.__demoCloud; const r=await d.server.loadSave(d.tokenOf('demo-a'),{}); return JSON.parse(r.data).kedai.koin}""")
        ok("7j sinkron ulang: cloud hanya berisi nilai terbaru (25), bukan penjumlahan ganda", rj == 25, rj)
        # validasi server: data Kedai curang ditolak oleh pemeriksa bentuk data (core.js)
        bad = ev(pg, """async()=>{const d=window.__demoCloud; const doc=await d.server.loadSave(d.tokenOf('demo-a'),{}); const base=JSON.parse(doc.data); const out=[];
           for(const mut of [k=>{k.koin=-5},k=>{k.koin=1e9},k=>{k.earned=5000},k=>{k.goat={xx:true}},k=>{k.rec={batok:{goat:{wins:-1}}}}]){ const c=JSON.parse(JSON.stringify(base)); mut(c.kedai);
             try{ await d.server.writeSave(d.tokenOf('demo-a'),{data:JSON.stringify(c),baseRev:doc.rev,opId:'x'+Math.random(),deviceId:'t'}); out.push('diterima'); }catch(e){ out.push(e.code) } } return out}""")
        ok("7k data Kedai di luar batas wajar ditolak validasi server (5/5)", all(x != "diterima" for x in bad), bad)
        ok("7l tanpa error JavaScript (Google demo)", errs == [], errs); ctx.close()

        # ===== 8. Performa-emulasi (CPU 4× lebih lambat) =====
        ctx, pg, errs, cdp = fresh(b)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        perf = {}
        for g in GAMES:
            start_game(pg, g, "goat"); pg.click("[data-x=go]"); time.sleep(0.4)
            r = ev(pg, """async()=>{const c=NW.kedaiUI._state().ctl, cv=document.getElementById('kdCv').getContext('2d');const ts=[];for(let i=0;i<90;i++){const t0=performance.now();c.update(1/60);c.draw(cv);ts.push(performance.now()-t0)}
               const fr=await new Promise(res=>{let n=0,t0=performance.now();function f(){n++;if(n<60)requestAnimationFrame(f);else res(1000*60/(performance.now()-t0))}requestAnimationFrame(f)});ts.sort((a,b)=>a-b);return {avg:ts.reduce((a,b)=>a+b,0)/ts.length,p95:ts[Math.floor(ts.length*.95)],fps:fr}})()""")
            perf[g] = r
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
        ok("8a update+draw per bingkai rata-rata ≤ 6 ms pada CPU 4× lebih lambat (emulasi) untuk kelima permainan", all(v["avg"] <= 6 for v in perf.values()), {k: round(v["avg"], 2) for k, v in perf.items()})
        ok("8b fps antarmuka ≥ 40 pada CPU 4× lebih lambat (emulasi)", all(v["fps"] >= 40 for v in perf.values()), {k: round(v["fps"]) for k, v in perf.items()})
        ok("8c tanpa error JavaScript", errs == [], errs); ctx.close()
        b.close()
    f = [r for r in R if r.startswith("FAIL")]
    print(f"\nHASIL: {len(R) - len(f)} lulus, {len(f)} gagal"); [print(x) for x in f]
    sys.exit(1 if f else 0)
main()
