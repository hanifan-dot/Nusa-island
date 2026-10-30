"""Uji Bumbu 1.1: panel Strike ringkas, joran di punggung, 8 gelar tangkapan, label nama, migrasi v4 → v5.
Jalankan: python tests/browser/test_bumbu11.py
Catatan: ini emulasi browser (Chromium headless), bukan HP Android fisik.
"""
import time, json, os, tempfile
import os as _os
MUTED = "false" if _os.environ.get("NUSA_AUDIO") else "true"  # NUSA_AUDIO=1: jalankan dengan audio aktif (Bumbu 2.1)
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = tempfile.mkdtemp(prefix="nusa-b11-") + "/"
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else ""))
def ev(pg, js): return pg.evaluate(js)

def page(b, save=None, vp=(1280, 800), touch=False, dpr=1):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=touch, device_scale_factor=dpr)
    if save is not None:
        ctx.add_init_script("if(!localStorage.getItem('nusa-island-v1')){localStorage.setItem('nusa-island-v1', %s)}" % json.dumps(json.dumps(save)))  # hanya menanam bila kosong → reload tidak menimpa
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.7)
    return ctx, pg, errs
def start(pg):
    if pg.is_visible("#startBtn"): pg.click("#startBtn")
    time.sleep(0.4); ev(pg, "window.__nusa.S.muted = " + MUTED)
def S(pg, path="window.__nusa.S"): return ev(pg, f"JSON.parse(JSON.stringify({path}))")

def cast(pg, power, vp_w):
    pg.mouse.move(vp_w // 2, 400); pg.mouse.down()
    for _ in range(400):
        g = ev(pg, "[window.__nusa.G.power, window.__nusa.G.powerDir]")
        if g[1] > 0 and abs(g[0] - power) < 0.03: break
        time.sleep(0.005)
    pg.mouse.up()
    for _ in range(60):
        if ev(pg, "window.__nusa.G.phase") == "waiting": break
        time.sleep(0.05)
def strike(pg, fish, w):
    ev(pg, "window.__nusa.G.biteTimer = Math.min(window.__nusa.G.biteTimer, 0.05)")
    for _ in range(60):
        if ev(pg, "window.__nusa.G.phase") == "bite": break
        time.sleep(0.03)
    ev(pg, f"window.__nusa.G.pending = {{fish: FISH.find(f=>f.id=='{fish}'), w:{w}, wr:.5}}")
    pg.mouse.down(); time.sleep(0.08)
def play_fight(pg):
    held = True; t0 = time.time()
    while time.time() - t0 < 40:
        f = ev(pg, "(()=>{const F=window.__nusa.G.fight;return F?{T:F.T}:null})()")
        if not f: break
        want = held
        if f["T"] > 0.78: want = False
        elif f["T"] < 0.4: want = True
        if want != held: (pg.mouse.down() if want else pg.mouse.up()); held = want
        time.sleep(0.03)
    if held: pg.mouse.up()
    time.sleep(0.8)
def to_fishing(pg):
    ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.3)
    ev(pg, "(()=>{const p=NW.world.player;p.x=NW.SPOT.x-0.7;p.y=NW.SPOT.y})()"); time.sleep(0.4)
    pg.keyboard.press("e"); time.sleep(1.5)
def catch_one(pg, vp_w, fish, w):
    cast(pg, 0.6, vp_w); strike(pg, fish, w); play_fight(pg)
    for _ in range(8):  # tutup kartu tangkapan
        if pg.is_visible("#catchOk"): pg.click("#catchOk"); time.sleep(0.4); break
        time.sleep(0.25)

with sync_playwright() as p:
    b = p.chromium.launch()

    # ================= 1. Panel Strike =================
    for label, vp, touch, dpr in (("HP 390×844", (390, 844), True, 2), ("desktop 1280×800", (1280, 800), False, 1)):
        ctx, pg, errs = page(b, None, vp, touch, dpr); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6)
        start(pg); to_fishing(pg)
        cast(pg, 0.85, vp[0]); strike(pg, "gabus", 2.0); time.sleep(1.0)
        r = ev(pg, "(()=>{const r=document.getElementById('fightUI').getBoundingClientRect();const cs=getComputedStyle(document.getElementById('fightUI'));return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,r:r.right,bg:cs.backgroundColor}})()")
        bob = ev(pg, "(()=>{const b=window.__nusa.bobberScreen(), t=window.__nusa.rodTip();return {bx:b.x,by:b.y,tx:t.x,ty:t.y}})()")
        inside = lambda x, y: r["x"] <= x <= r["r"] and r["y"] <= y <= r["b"]
        ok(f"P1 [{label}] panel ringkas (tinggi ≤ 96px, lama 139px)", r["h"] <= 96, f"{r['h']:.0f}px")
        ok(f"P2 [{label}] panel di dalam layar & tidak melebihi lebar", r["x"] >= 8 and r["r"] <= vp[0] - 8 and r["b"] <= vp[1], r)
        ok(f"P3 [{label}] panel di area bawah layar (puncak ≥ 70% tinggi)", r["y"] >= vp[1] * 0.70, f"{r['y']:.0f}/{vp[1]}")
        ok(f"P4 [{label}] pelampung dan ujung joran tidak tertutup panel", not inside(bob["bx"], bob["by"]) and not inside(bob["tx"], bob["ty"]), bob)
        ok(f"P5 [{label}] latar semi-transparan", "rgba" in r["bg"] and float(r["bg"].split(",")[3].strip(" )")) < 0.8, r["bg"])
        txt = ev(pg, "document.getElementById('fightUI').innerText")
        ok(f"P6 [{label}] indikator Tegangan & Jarak + petunjuk situasional tetap ada", "Tegangan" in txt and "Jarak" in txt and len(ev(pg, "document.getElementById('fightTip').textContent")) > 3, txt.replace("\n", " | ")[:90])
        # petunjuk situasional: tegangan tinggi, menyentak, lelah, kendur
        tips = {}
        ev(pg, "window.__nusa.S.skills.membaca=true; window.__nusa.S.skills.kendali=true")
        for name, js in (("tinggi", "window.__nusa.G.fight.T=0.9"), ("kendur", "window.__nusa.G.fight.T=0.05; window.__nusa.G.fight.slack=1")):
            ev(pg, js); time.sleep(0.15); tips[name] = ev(pg, "document.getElementById('fightTip').textContent")
        ok(f"P7 [{label}] petunjuk senar hampir putus muncul", "putus" in tips["tinggi"].lower(), tips)
        ok(f"P8 [{label}] panel tidak menyedot sentuhan (pointer-events: none)", ev(pg, "getComputedStyle(document.getElementById('fightUI')).pointerEvents") == "none")
        ev(pg, "document.getElementById('fightUI').classList.contains('hidden')")
        pg.screenshot(path=OUT + f"strike_{'hp' if touch else 'dt'}.png")
        pg.mouse.up(); time.sleep(0.2)
        ok(f"P9 [{label}] tanpa error JavaScript", not errs, errs[:3]); ctx.close()

    # ================= 2. Mekanik mancing lama + gelar dari tangkapan sungguhan =================
    ctx, pg, errs = page(b, None, (390, 844), True, 2); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6)
    start(pg); to_fishing(pg)
    c0 = len(S(pg, "window.__nusa.S.cooler")); caught0 = S(pg)["stats"]["caught"]
    catch_one(pg, 390, "nila", 0.6)
    s1 = S(pg)
    ok("F1 mancing lama: ikan masuk coolbox, statistik dan koleksi naik", len(s1["cooler"]) == c0 + 1 and s1["stats"]["caught"] == caught0 + 1 and s1["dex"]["nila"]["n"] == 1)
    ok("F2 ikan sungguhan pertama → gelar Pemancing Baru, hitung 1", s1["titles"]["fish"] == 1 and s1["titles"]["rank"] == 1)
    catch_one(pg, 390, "sandal", 0.2)
    s2 = S(pg)
    ok("F3 sampah (sandal) masuk coolbox & statistik lama, tapi TIDAK menambah hitungan gelar", s2["stats"]["caught"] == caught0 + 2 and s2["titles"]["fish"] == 1 and s2["dex"]["sandal"]["n"] == 1)
    ok("F4 tanpa error JavaScript (mancing)", not errs, errs[:3])
    ctx.close()

    # ================= 3. Batas 8 gelar =================
    ctx, pg, errs = page(b, None); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6); start(pg)
    ev(pg, "window.__toasts = []; const _t = window.Nusa.toast; (new MutationObserver(m=>{})); document.getElementById('toast') && 0")
    res = ev(pg, """(()=>{
      const fish = FISH_BY_ID_TMP = window.Nusa.FISH_BY_ID.nila, out = {}, seen = [], orig = window.Nusa.toast;
      const L = NW.look, S = window.__nusa.S; let toasts = 0;
      const real = document.getElementById('toasts') || document.body;
      for (let n = 1; n <= 300; n++) {
        const before = S.titles.rank;
        window.Nusa.emit('catch', {fish, w: 1, night: false, loc: 'muara'});
        if (S.titles.rank !== before) seen.push([n, L.titleName(S.titles.rank)]);
        out[n] = L.currentTitle();
      }
      return {seen, out: {1: out[1], 9: out[9], 10: out[10], 29: out[29], 30: out[30], 49: out[49], 50: out[50], 99: out[99], 100: out[100], 149: out[149], 150: out[150], 199: out[199], 200: out[200], 299: out[299], 300: out[300]}};
    })()""")
    exp = [[1, "Pemancing Baru"], [10, "Anak Muara"], [30, "Pencari Tangkapan"], [50, "Nelayan Muda"], [100, "Pemburu Muara"], [150, "Ahli Pancing"], [200, "Juragan Kail"], [300, "Legenda Muara"]]
    ok("G1 gelar berubah tepat di 1, 10, 30, 50, 100, 150, 200, 300 (nama resmi)", res["seen"] == exp, res["seen"])
    o = res["out"]
    ok("G2 sebelum batas gelar lama masih berlaku (9, 29, 49, 99, 149, 199, 299)", o["9"] == "Pemancing Baru" and o["29"] == "Anak Muara" and o["49"] == "Pencari Tangkapan" and o["99"] == "Nelayan Muda" and o["149"] == "Pemburu Muara" and o["199"] == "Ahli Pancing" and o["299"] == "Juragan Kail", o)
    ok("G3 0 ikan = belum bergelar", ev(pg, "(()=>{window.__nusa.S.titles.fish=0;window.__nusa.S.titles.rank=0;return NW.look.currentTitle()})()") is None)
    ev(pg, "window.__nusa.S.titles.fish=9; window.__nusa.S.titles.rank=1; window.__nusa.S.stats.caught=9")
    ev(pg, "window.Nusa.emit('catch', {fish: window.Nusa.FISH_BY_ID.sandal, w: .2, loc: 'muara'}); window.Nusa.emit('catch', {fish: window.Nusa.FISH_BY_ID.kaleng, w: .2, loc: 'muara'})")
    ok("G4 sampah (sandal, kaleng) tidak menaikkan gelar di batas 10", S(pg)["titles"]["fish"] == 9 and ev(pg, "NW.look.currentTitle()") == "Pemancing Baru")
    ok("G5 batas rentang tidak tumpang tindih", ev(pg, "NW.look.TITLES.every((t,i,a)=>i===0||t.min>a[i-1].min)") and ev(pg, "NW.look.TITLES.length") == 8)
    # notifikasi naik gelar: tepat satu kali, bukan berulang
    ev(pg, "window.__nusa.S.titles.fish=9; window.__nusa.S.titles.rank=1")
    ev(pg, "document.getElementById('toast') && (document.getElementById('toast').textContent='')")
    pg.evaluate("window.Nusa.emit('catch', {fish: window.Nusa.FISH_BY_ID.nila, w:1, loc:'muara'})"); time.sleep(0.2)
    toast1 = ev(pg, "document.getElementById('toast') ? document.getElementById('toast').innerText : ''")
    ok("G6 notifikasi singkat saat naik gelar", "Anak Muara" in toast1, toast1)
    ev(pg, "window.__nusa.save()")
    pg.reload(); time.sleep(0.9)
    toast2 = ev(pg, "document.getElementById('toast') ? document.getElementById('toast').innerText : ''")
    s = S(pg)
    ok("G7 setelah refresh: gelar & hitungan bertahan, tanpa notifikasi ulang", s["titles"]["fish"] == 10 and s["titles"]["rank"] == 2 and "Gelar baru" not in toast2, (s["titles"], toast2))
    ok("G8 tanpa error JavaScript (gelar)", not errs, errs[:3]); ctx.close()

    # ================= 4. Menjual / akuarium / pamer tidak menambah statistik =================
    ctx, pg, errs = page(b, None); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6); start(pg)
    ev(pg, """(()=>{const S=window.__nusa.S;S.cooler=[{uid:'i_a',id:'nila',w:0.8},{uid:'i_b',id:'mujair',w:0.6}];S.titles.fish=12;S.titles.rank=2;S.stats.caught=12;})()""")
    ev(pg, "window.Nusa.openPanel('market')"); time.sleep(0.3)
    btn = pg.locator("#panelBody [data-act='sell']").first
    if btn.count(): btn.click(); time.sleep(0.2)
    n1 = ev(pg, "window.__nusa.S.cooler.length")
    r = ev(pg, "(()=>{const S=window.__nusa.S;const x=NW.HD.putFish(S, S.cooler[0] && S.cooler[0].uid, (S.home.furniture.find(f=>f.type==='akuariumKecil')||{}).uid, window.Nusa.FISH_BY_ID);const y=S.home.placedFish.length?NW.HD.takeFish(S,S.home.placedFish[0].uid,99):null;return [x&&x.ok,y&&y.ok]})()")
    s = S(pg)
    ok("S1 jual satuan, pajang & ambil dari akuarium tidak mengubah hitungan gelar maupun statistik tangkapan", n1 == 1 and s["titles"]["fish"] == 12 and s["stats"]["caught"] == 12, (n1, r, s["titles"]))
    ok("S2 tanpa error JavaScript (jual/akuarium)", not errs, errs[:3]); ctx.close()

    # ================= 5. Joran di punggung =================
    ctx, pg, errs = page(b, None, (390, 844), True, 2); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6); start(pg)
    ev(pg, "window.__nusa.S.hour=11; window.__nusa.S.up.rod=0; (()=>{const p=NW.world.player;p.x=NW.START.x;p.y=NW.START.y})()")
    ev(pg, """window.__rodCalls = []; const _o = NW.look.drawBackRod; NW.look.drawBackRod = function(c, spec, fx, y0, sway, front){ window.__rodCalls.push({name: spec.name, front}); return _o.apply(this, arguments); }; 0""")
    seen = {}
    for d in range(8):
        ev(pg, f"NW.world.player.dir={d}; NW.world.player.moving=false; NW.world.player.rod=0; window.__rodCalls=[]"); time.sleep(0.25)
        calls = ev(pg, "window.__rodCalls")
        per_frame = len(calls)
        seen[d] = (per_frame, calls[0]["front"] if calls else None, len(set(c["front"] for c in calls)))
    frames_ok = all(seen[d][0] >= 1 for d in seen)
    ok("R1 joran digambar pada kedelapan arah hadap", frames_ok, seen)
    ok("R2 lapisan benar: di depan badan hanya saat membelakangi kamera (arah 5, 6, 7), selain itu di belakang badan", all(seen[d][1] == (d in (5, 6, 7)) and seen[d][2] == 1 for d in range(8)), seen)
    # tidak ganda: saat joran di tangan (memancing), joran punggung tidak digambar
    ev(pg, "NW.world.player.dir=2; NW.world.player.rod=1; window.__rodCalls=[]"); time.sleep(0.25)
    held = ev(pg, "window.__rodCalls.length")
    ev(pg, "NW.world.player.rod=0; window.__rodCalls=[]"); time.sleep(0.25)
    back = ev(pg, "window.__rodCalls.length")
    ok("R3 tidak ada joran ganda: hilang di punggung saat joran dipegang, muncul lagi setelah kembali", held == 0 and back >= 1, (held, back))
    # mengikuti level upgrade
    names, imgs = [], []
    for lvl in range(5):
        ev(pg, f"window.__nusa.S.up.rod={lvl}; NW.world.player.dir=6; NW.world.player.moving=false; NW.world.player.rod=0; window.__rodCalls=[]"); time.sleep(0.3)
        names.append(ev(pg, "window.__rodCalls.length ? window.__rodCalls[window.__rodCalls.length-1].name : null"))
        pg.screenshot(path=OUT + f"rod_l{lvl}.png", clip={"x": 195 - 40, "y": 422 - 70, "width": 80, "height": 90})
        imgs.append(open(OUT + f"rod_l{lvl}.png", "rb").read())
    ok("R4 tampilan joran mengikuti level upgrade (5 nama berbeda, 5 gambar berbeda)", names == ["Joran Bambu Kampung", "Joran Fiber Muara", "Joran Karbon Sungai", "Joran Titanium Pesisir", "Joran Legenda Nusa"] and len(set(imgs)) == 5, names)
    ok("R5 data joran: kini 10 spesifikasi (Bumbu 1.2) dengan warna batang berbeda; renderer berbasis data", ev(pg, "NW.look.RODS.length") == 10 and ev(pg, "new Set(NW.look.RODS.map(r=>r.blank)).size") >= 9 and ev(pg, "typeof NW.look.drawBackRod") == "function")
    ok("R6 joran awal tampak seperti bambu sederhana (ruas, tanpa reel)", ev(pg, "NW.look.RODS[0].node === true && NW.look.RODS[0].reel === null") and ev(pg, "NW.look.RODS[4].reel !== null && NW.look.RODS[4].accent !== null"))
    # Joran Warisan (dekorasi cerita) bukan joran aktif
    ev(pg, "window.__nusa.S.up.rod=1; window.__nusa.S.home.decorations = (window.__nusa.S.home.decorations||[]).concat(['joranWarisan'])")
    ok("R7 Joran Warisan (dekorasi cerita) tidak dianggap joran aktif", ev(pg, "NW.look.rodSpec().name") == "Joran Fiber Muara")
    # ikut bergerak: ayunan berubah saat berjalan
    ev(pg, "NW.world.player.dir=2; window.__sw=[]; const _o2=NW.look.drawBackRod; NW.look.drawBackRod=function(c,s,fx,y0,sway,f){window.__sw.push(sway);return _o2.apply(this,arguments)}; 0")
    pg.keyboard.down('d'); time.sleep(0.9); pg.keyboard.up('d'); sw = ev(pg, "window.__sw")
    ok("R8 joran ikut bergerak saat berjalan (ayunan berubah)", len(sw) > 5 and (max(sw) - min(sw)) > 0.2, (len(sw), min(sw) if sw else None, max(sw) if sw else None))
    ok("R9 tanpa error JavaScript (joran)", not errs, errs[:3]); ctx.close()

    # ================= 6. Label nama + gelar =================
    ctx, pg, errs = page(b, None, (390, 844), True, 2); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6); start(pg)
    ev(pg, "window.__nusa.S.hour=11; window.__lab=[]; const _l=NW.look.drawPlayerLabel; NW.look.drawPlayerLabel=function(c,b,s){window.__lab.push([NW.look.playerName(),NW.look.currentTitle(),s]);return _l.apply(this,arguments)}; 0")
    time.sleep(0.4)
    lab0 = ev(pg, "window.__lab.slice(-1)[0]")
    ok("L1 label di atas kepala: nama lokal bawaan, belum bergelar → hanya satu baris", lab0 and lab0[0] == "Pemancing" and lab0[1] is None and ev(pg, "(()=>{const k=document.createElement('canvas');return 1})()") and ev(pg, "NW.look.rank()") == 0, lab0)
    ev(pg, "window.__nusa.S.titles.fish=120; window.__nusa.S.titles.rank=5; window.__nusa.S.profile.name='Hanifan'"); time.sleep(0.4)
    lab1 = ev(pg, "window.__lab.slice(-1)[0]")
    ok("L2 label memakai nama pemain + gelar tangkapan (dua baris)", lab1 and lab1[0] == "Hanifan" and lab1[1] == "Pemburu Muara", lab1)
    ok("L3 skala label mengimbangi zoom kamera (ukuran di layar terbaca di HP)", 0.6 < lab1[2] < 1.2, lab1[2])
    dims = ev(pg, "(()=>{const a=NW.look.drawLabel;return 0})()")
    ok("L4 label digambar dalam urutan kedalaman (tertutup bangunan di depannya), bukan di lapisan atas", 'drawPlayerLabel' in open(os.path.join(os.path.dirname(ROOT.replace("file://", "")), "world", "world.js")).read().split("it.ch === player")[1][:400])
    # nama aman
    names = ev(pg, "[NW.look.cleanName('  <b>Nusa</b>  &\" '), NW.look.cleanName('A'.repeat(40)).length, NW.look.cleanName('')]")
    ok("L5 nama dibersihkan (tanpa <>&\"', maks 14 huruf)", names[0] == "bNusa/b" and names[1] == 14 and names[2] == "", names)
    # ganti nama dari menu 🎯
    pg.click("#skillBtn"); time.sleep(0.4)
    pg.fill("#pName", "Budi Nelayan"); pg.click("[data-act='saveName']"); time.sleep(0.4)
    ok("L6 nama bisa diganti di menu 🎯 dan tersimpan", S(pg)["profile"]["name"] == "Budi Nelayan" and "Pemburu Muara" in ev(pg, "document.getElementById('panelBody').innerText"))
    pg.click("#panelClose"); time.sleep(0.2)
    ev(pg, "window.__nusa.save()"); pg.reload(); time.sleep(0.8)
    ok("L7 nama & gelar bertahan setelah refresh", S(pg)["profile"]["name"] == "Budi Nelayan" and S(pg)["titles"]["rank"] == 5)
    fps = ev(pg, "new Promise(r=>{let n=0,t0=performance.now();function f(){n++;if(performance.now()-t0>1500)r(n/((performance.now()-t0)/1000));else requestAnimationFrame(f)}requestAnimationFrame(f)})")
    ok("L8 FPS emulasi HP (headless, DPR 2) dengan joran + label", fps > 40, f"{fps:.0f}")
    pg.screenshot(path=OUT + "label_hp.png")
    ok("L9 tanpa error JavaScript (label)", not errs, errs[:3]); ctx.close()

    # ================= 7. Migrasi v4 → v5 dan simpanan lama =================
    v4 = {"v": 4, "money": 7777, "day": 8, "hour": 9, "loc": 0, "up": {"rod": 3, "bait": 2, "cooler": 2, "boat": 1},
          "cooler": [{"uid": "i1", "id": "nila", "w": 0.8}, {"uid": "i2", "id": "patin", "w": 3.1}],
          "dex": {"nila": {"n": 20, "best": 1.1}, "patin": {"n": 5, "best": 3.1}, "sandal": {"n": 5, "best": .3}, "kaleng": {"n": 3, "best": .2}},
          "stats": {"casts": 60, "caught": 33, "earned": 900, "legends": 0}, "muted": True,
          "story": {"v": 1, "ch": 3, "step": 1, "prog": {"reads": 1}, "mats": {"benang": True, "bambu": True, "damar": True}, "rewarded": {"ch1": 1, "ch2": 1}, "title": None, "corner": 1, "doneAt": {}},
          "skills": {"v": 1, "presisi": True, "membaca": True, "kendali": False, "stats": {"hot": 4, "reads": 3, "tired": 0}},
          "onboard": {"v": 1, "walk": True, "talk": True, "fish": True, "sell": True, "home": True}}
    ctx, pg, errs = page(b, v4); s = S(pg)
    ok("M1 v4 → v7 (Bumbu 2): ikan sungguhan dihitung dari koleksi (20+5=25), sampah (5+3) tidak; gelar Anak Muara", s["titles"]["fish"] == 25 and s["titles"]["rank"] == 2 and s["v"] == 7, s.get("titles"))
    ok("M2 statistik lama tidak berubah (caught tetap 33)", s["stats"]["caught"] == 33 and s["stats"]["casts"] == 60)
    ok("M3 koin, joran, ikan, cerita, keahlian, petunjuk tetap utuh", s["money"] == 7777 and s["up"]["rod"] == 3 and len(s["cooler"]) == 2 and s["story"]["ch"] == 3 and s["story"]["rewarded"] == {"ch1": 1, "ch2": 1} and s["skills"]["membaca"] and s["onboard"]["home"])
    ok("M4 cadangan simpanan v4 dibuat sebelum migrasi", ev(pg, "localStorage.getItem('nusa-island-v1-backup-v4')") is not None and json.loads(ev(pg, "localStorage.getItem('nusa-island-v1-backup-v4')"))["money"] == 7777)
    ok("M5 nama lokal bawaan dibuat; joran aktif sesuai data (Titanium Pesisir)", s["profile"]["name"] == "Pemancing" and ev(pg, "NW.look.rodSpec().name") == "Joran Titanium Pesisir")
    time.sleep(0.5); toast = ev(pg, "document.getElementById('toast') ? document.getElementById('toast').innerText : ''")
    ok("M6 migrasi tidak memunculkan notifikasi naik gelar", "Gelar baru" not in toast, toast)
    ev(pg, "window.Nusa.emit('catch',{fish:window.Nusa.FISH_BY_ID.nila,w:1,loc:'muara'}); window.__nusa.save()")
    pg.reload(); time.sleep(0.8)
    ok("M7 muat ulang tidak menghitung ulang (26 setelah 1 tangkapan baru, bukan 25+25)", S(pg)["titles"]["fish"] == 26, S(pg)["titles"])
    ok("M8 tanpa error JavaScript (migrasi v4)", not errs, errs[:3]); ctx.close()

    t1 = {"money": 999, "day": 3, "hour": 9, "loc": 0, "up": {"rod": 1, "bait": 0, "cooler": 0, "boat": 0}, "cooler": [{"id": "nila", "w": 0.8}], "dex": {"nila": {"n": 2, "best": 0.9}}, "stats": {"casts": 9, "caught": 2, "earned": 30, "legends": 0}, "muted": True}
    ctx, pg, errs = page(b, t1); s = S(pg)
    ok("M9 simpanan Tahap 1 → v7 aman (koin, ikan, joran, rumah, cerita, gelar Pemancing Baru)", s["money"] == 999 and len(s["cooler"]) == 1 and s["up"]["rod"] == 1 and s["home"]["level"] == 1 and s["story"]["ch"] == 1 and s["titles"]["fish"] == 2 and s["titles"]["rank"] == 1 and s["v"] == 7, s.get("titles"))
    ok("M10 tanpa error JavaScript (migrasi Tahap 1)", not errs, errs[:3]); ctx.close()
    b.close()

print("\n".join(R))
print(f"\n{sum(r.startswith('PASS') for r in R)} lulus / {sum(r[:4] in ('PASS','FAIL') for r in R)}")
print("tangkapan layar:", OUT)
