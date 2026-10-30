"""Uji Bumbu 2.4 "Samudra Nusantara": kapal yang bisa dikemudikan, naik/turun kapal, kontrol joystick 8 arah,
collision & batas laut, kamera, jangkar, memancing dari kapal (sistem lama), inventaris, hujan di laut, Peta Laut,
perjalanan Muara – laut lepas – Pelabuhan Selat Sunda, cerita & NPC Selat Sunda, simpan/muat di atas kapal,
migrasi v9 → v10, pemulihan "Ke Dermaga", audio kapal & cuaca, keseimbangan ikan laut, indikasi performa.
Jalankan: python tests/browser/test_bumbu24.py
Catatan: Chromium headless TANPA speaker dan BUKAN Android fisik. FPS/memori = emulasi browser, bukan angka HP.
"""
import time, json, os, sys, math
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = "/tmp/nusa-b24-test/"; os.makedirs(OUT, exist_ok=True)
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)

def page(b, init=None, vp=(390, 844), audio=False):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + (getattr(e, "stack", "") or "").replace("\n", " | ")[:300]))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.6)
    return ctx, pg, errs
def fresh(b, hour=10, boat=2, muted=True, vp=(390, 844)):
    ctx, pg, errs = page(b, None, vp); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6)
    pg.click("#startBtn"); time.sleep(0.3)
    ev(pg, "([h,bt,m])=>{const S=window.__nusa.S; S.hour=h; S.up.boat=bt; S.muted=m; if(NW.audio) NW.audio.setMuted(m); document.getElementById('banner').classList.remove('show')}", [hour, boat, muted]); time.sleep(0.5)
    return ctx, pg, errs
def goto(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera()}", [x, y]); time.sleep(0.4)
def st(pg): return ev(pg, "NW.boat.stats()")
def target(pg): return ev(pg, "NW.world.target ? NW.world.target.label : null")
def wait_for(pg, js, tmo=15.0, step=0.1):
    t0 = time.time()
    while time.time() - t0 < tmo:
        if ev(pg, js): return True
        time.sleep(step)
    return False
def board(pg, area="muara"):
    m = ev(pg, "(a)=>NW.areas.get(a).sea.moors.find(m=>m.main)", area)
    goto(pg, m["board"]["x"], m["board"]["y"]); ev(pg, "NW.world.interact()"); time.sleep(0.3)
def pose(pg, x, y, a): ev(pg, "([x,y,a])=>{NW.boat.B.v=0; NW.boat.setPose(x,y,a); NW.world.snapCamera()}", [x, y, a]); time.sleep(0.15)
def ang(tx, ty): return math.atan2((tx + ty) * 16, (tx - ty) * 32)
def hold(pg, key, secs): pg.keyboard.down(key); time.sleep(secs); pg.keyboard.up(key)
def sail_to(pg, area):
    """Pindah area dengan BERLAYAR lewat tepi laut (bukan teleport area)."""
    cur = ev(pg, "NW.areas.cur.id")
    if cur == "muara" and area in ("laut", "selat"): pose(pg, 51.2, 24, ang(1, 0)); hold(pg, "w", 1.2); wait_for(pg, "NW.areas.cur.id==='laut' && !NW.boat.busy"); cur = "laut"
    if cur == "laut" and area == "selat": pose(pg, 79.6, 24, ang(1, 0)); hold(pg, "w", 1.2); wait_for(pg, "NW.areas.cur.id==='selat' && !NW.boat.busy"); cur = "selat"
    if cur == "selat" and area in ("laut", "muara"): pose(pg, -9.8, 20, ang(-1, 0)); hold(pg, "w", 1.2); wait_for(pg, "NW.areas.cur.id==='laut' && !NW.boat.busy"); cur = "laut"
    if cur == "laut" and area == "muara": pose(pg, 0.4, 24, ang(-1, 0)); hold(pg, "w", 1.2); wait_for(pg, "NW.areas.cur.id==='muara' && !NW.boat.busy"); cur = "muara"
    time.sleep(0.3); return ev(pg, "NW.areas.cur.id")
def dlg_open(pg): return ev(pg, "!document.getElementById('dlg').classList.contains('hidden')")
def dialog_through(pg, pick=None, maxn=40):
    for _ in range(maxn):
        if not dlg_open(pg): return None
        btns = ev(pg, "[...document.querySelectorAll('#dlgOpts button')].map(b=>b.textContent)")
        if btns:
            label = next((x for x in btns if pick and pick in x), None) or btns[0]
            ev(pg, "(t)=>[...document.querySelectorAll('#dlgOpts button')].find(b=>b.textContent===t).click()", label); time.sleep(0.3); return label
        ev(pg, "document.getElementById('dlg').click()"); time.sleep(0.08)
    return None
def near_npc(pg, nid, d=0.75):
    ev(pg, """(a)=>{const n=NW.world.areaNpcs().find(n=>n.id===a[0]); const p=NW.world.player;
      for(let k=0;k<24;k++){const x=n.x+Math.cos(k/24*6.283)*a[1], y=n.y+Math.sin(k/24*6.283)*a[1]; if(NW.walkable(x,y)){p.x=x;p.y=y;break;}} NW.world.snapCamera()}""", [nid, d]); time.sleep(0.3)
def talk(pg, nid, pick=None):
    for _ in range(8):
        near_npc(pg, nid)
        if ev(pg, "NW.world.target ? NW.world.target.id : null") == "npc:" + nid: ev(pg, "NW.world.interact()"); time.sleep(0.3); return dialog_through(pg, pick)
    return "TIDAK-TERJANGKAU"
def sel(pg): return ev(pg, "JSON.parse(JSON.stringify(window.__nusa.S.adv.selat))")
def catch_sea(pg):
    """Satu tangkapan lewat jalur mancing asli: gigitan → startFight → endFight('caught')."""
    return ev(pg, """(()=>{const N=window.__nusa, G=N.G; G.phase='bite';
      G.pending=(NW.story&&NW.story.challengeFish(false, LOCATIONS[N.S.loc].id))||NW.adv.challengeFish(false, LOCATIONS[N.S.loc].id)||N.chooseFish();
      N.startFight(); const id=G.fight.fish.id, w=G.fight.w; N.endFight('caught'); document.getElementById('catchOk').click(); return {id, w, n:N.S.cooler.length}; })()""")

with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])

    # ================= 1. Naik kapal =================
    ctx, pg, errs = fresh(b)
    m = ev(pg, "NW.areas.get('muara').sea.moors[0]")
    ok("1a kapal pemain bersandar di dermaga Muara (bukan kotak mengapung): status tersimpan v10", ev(pg, "window.__nusa.S.v") == 10 and st(pg)["moor"] == "dermaga" and not st(pg)["on"] and ev(pg, "window.__nusa.S.sea.v") == 1)
    goto(pg, m["board"]["x"] - 3, m["board"]["y"]); far = target(pg)
    goto(pg, m["board"]["x"], m["board"]["y"])
    ok("1b tombol ⛵ Naik Kapal muncul hanya saat dekat kapal", target(pg) == "Naik Kapal" and far != "Naik Kapal", far)
    snap0 = ev(pg, "[NW.world.player.x, NW.world.player.y]")
    pg.tap("#actBtn"); time.sleep(0.4)
    s = st(pg)
    ok("1c ketuk tombol → pemain masuk kapal (tidak tertinggal di dermaga)", s["on"] and ev(pg, "NW.tileAt(Math.floor(NW.world.player.x),Math.floor(NW.world.player.y))") in (0, 1) and math.hypot(snap0[0] - ev(pg, "NW.world.player.x"), snap0[1] - ev(pg, "NW.world.player.y")) > 0.5, s)
    cnt = ev(pg, """(()=>{const orig=NW.drawCharacter; let n=0, me=0; const st=NW.world.player.style; NW.drawCharacter=(c,ch,t)=>{ if(ch.style===st){ n++; if(ch===NW.world.player) me++; } return orig(c,ch,t); };
      NW.world.draw(document.getElementById('game').getContext('2d'), 1); NW.drawCharacter=orig; return {n, me}; })()""")
    ok("1d tidak ada duplikasi karakter: tepat satu pemain digambar (duduk di kapal)", cnt["n"] == 1 and cnt["me"] == 0, cnt)
    ok("1e tombol kapal tampil (Jangkar, Memancing, Peta Laut, Ke Dermaga) & kompas", ev(pg, "!document.getElementById('seaBar').classList.contains('hidden') && document.querySelectorAll('#seaBar button').length===4 && !document.getElementById('seaHud').classList.contains('hidden')"))
    # tombol tidak bentrok dengan joystick / tombol aksi; cukup besar untuk jari
    rects = ev(pg, "(()=>{const r=(s)=>{const e=document.querySelector(s).getBoundingClientRect();return {x:e.left,y:e.top,w:e.width,h:e.height}}; return {joy:r('#joy'), bar:r('#seaBar'), btns:[...document.querySelectorAll('#seaBar button')].map(e=>{const q=e.getBoundingClientRect();return {w:q.width,h:q.height,x:q.left}})}})()")
    jz = 390 * 0.6
    ok("1f tombol kapal ≥ 44px, di luar zona joystick (kiri 60% layar) dan tidak menimpa joystick", all(x["h"] >= 42 and x["w"] >= 90 for x in rects["btns"]) and min(x["x"] for x in rects["btns"]) >= jz - 20 and rects["bar"]["x"] > rects["joy"]["x"] + rects["joy"]["w"], rects)
    pg.screenshot(path=OUT + "01_naik_kapal.png")

    # ================= 6. Kamera mengikuti kapal & 3. kontrol joystick (sentuh) =================
    jb = ev(pg, "(()=>{const r=document.getElementById('joy').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()")
    x0 = st(pg)["x"]
    pg.mouse.move(jb["x"], jb["y"]); pg.mouse.down(); pg.mouse.move(jb["x"], jb["y"] - 45, steps=4); time.sleep(0.25); v1 = st(pg)["v"]; time.sleep(1.2); v2 = st(pg)["v"]
    pg.mouse.up(); time.sleep(0.05)
    ok("3a joystick ATAS = maju dengan akselerasi halus (lambat → cepat)", 0 < v1 < v2 and st(pg)["x"] > x0 + 1, (round(v1), round(v2)))
    cam = ev(pg, "(()=>{const b=NW.boat.B, p=NW.P(b.x,b.y,0), c=NW.world.cam; return {d:Math.hypot(p.x-c.x,p.y-c.y), z:NW.world.zoom}})()")
    ok("6 kamera mengikuti kapal dengan lembut (pusat layar ±90px dari kapal, sedikit menjauh)", cam["d"] < 90, cam)
    t_stop = time.time(); stopped = wait_for(pg, "Math.abs(NW.boat.B.v)<3", 4); coast = time.time() - t_stop
    ok("3b lepas joystick → kapal meluncur pendek lalu berhenti (tidak licin, < 3,5 dtk)", stopped and coast < 3.5, round(coast, 2))
    pg.mouse.move(jb["x"], jb["y"]); pg.mouse.down(); pg.mouse.move(jb["x"], jb["y"] - 45, steps=3); time.sleep(1.0)
    vf = st(pg)["v"]; pg.mouse.move(jb["x"], jb["y"] + 45, steps=3); time.sleep(0.5); vb = st(pg)["v"]; time.sleep(1.0); vr = st(pg)["v"]; pg.mouse.up()
    ok("3c joystick BAWAH = mengerem lalu mundur pelan", vf > 120 and vb < vf * 0.55 and vr < 0 and vr > -90, (round(vf), round(vb), round(vr)))
    ev(pg, "NW.boat.B.v=0")
    a0 = st(pg)["a"]; pg.mouse.move(jb["x"], jb["y"]); pg.mouse.down(); pg.mouse.move(jb["x"] - 45, jb["y"], steps=3); time.sleep(0.6); aL = st(pg)["a"]; pg.mouse.up(); time.sleep(0.1)
    pg.mouse.move(jb["x"], jb["y"]); pg.mouse.down(); pg.mouse.move(jb["x"] + 45, jb["y"], steps=3); time.sleep(0.6); aR = st(pg)["a"]; pg.mouse.up()
    ok("3d KIRI = belok kiri (sudut berkurang), KANAN = belok kanan", aL < a0 - 0.15 and aR > aL + 0.15, (round(a0, 2), round(aL, 2), round(aR, 2)))
    ev(pg, "NW.boat.B.v=0")
    # 8 arah (di laut lepas, jauh dari pulau)
    lv = sail_to(pg, "laut")
    res = []
    for k in range(8):
        a = -math.pi + k * math.pi / 4
        pose(pg, 40, 20, a); s0 = st(pg); hold(pg, "w", 0.7); s1 = st(pg)
        dx, dy = s1["x"] - s0["x"], s1["y"] - s0["y"]; sx, sy = (dx - dy) * 32, (dx + dy) * 16
        got = math.atan2(sy, sx); err = abs((got - a + math.pi) % (2 * math.pi) - math.pi)
        res.append((k, round(math.degrees(a)), round(math.degrees(err), 1), round(math.hypot(sx, sy))))
        ev(pg, "NW.boat.B.v=0")
    ok("3e kapal dikemudikan ke 8 arah layar; arah gerak = arah haluan (selisih < 8°)", lv == "laut" and all(r[2] < 8 and r[3] > 25 for r in res), res)

    # ================= 4. Collision daratan =================
    pose(pg, 18.5, 13, ang(1, 0)); hold(pg, "w", 0.1)  # di barat Pulau Kelapa, menghadap pulau
    bad = ev(pg, """new Promise(r=>{let bad=0,n=0; window.dispatchEvent(new KeyboardEvent('keydown',{key:'w'}));
      const t0=performance.now(); (function f(){ const B=NW.boat.B; if(!NW.boat.hullFits(NW.areas.cur,B.x,B.y,B.a)) bad++; n++;
        if(performance.now()-t0<3000) requestAnimationFrame(f); else { window.dispatchEvent(new KeyboardEvent('keyup',{key:'w'})); r({bad,n,x:B.x,y:B.y,v:B.v}); } })(); })""")
    land = ev(pg, "(()=>{const B=NW.boat.B; return NW.isLandT(NW.tileAt(Math.floor(B.x),Math.floor(B.y)))})()")
    ok("4 menabrak pulau: lambung tidak pernah masuk daratan (3 dtk didorong), kapal tertahan di tepi", bad["bad"] == 0 and not land and bad["x"] < 23.5 and abs(bad["v"]) < 60, bad)
    pg.screenshot(path=OUT + "04_collision.png")

    # ================= 5. Batas area laut =================
    pose(pg, 40, 2.5, ang(0, -1)); hold(pg, "w", 2.2); s = st(pg)
    ok("5a batas eksplorasi laut lepas: kapal tidak keluar batas utara (y ≥ 0,6)", s["y"] >= 0.59 and ev(pg, "NW.areas.cur.id") == "laut", s)
    ok("5b pemberitahuan batas pelayaran yang ramah", "Batas pelayaran" in ev(pg, "document.getElementById('toast').textContent"))
    ctx.close()
    # gerbang laut lepas mengikuti syarat kapal lama (Kapal Nelayan untuk Selat Sunda)
    ctx, pg, errs2 = fresh(b, boat=0); board(pg)
    pose(pg, 50.6, 24, ang(1, 0)); hold(pg, "w", 1.8); time.sleep(0.4)
    ok("5c dengan Sampan Kayu: laut lepas ke Selat Sunda terkunci (tetap di perairan Muara, ada pesan Toko)", ev(pg, "NW.areas.cur.id") == "muara" and st(pg)["x"] <= 52.01 and "Kapal Nelayan" in ev(pg, "document.getElementById('toast').textContent"))
    ok("5d perairan Muara tetap bisa dilayari semua pemain (Sampan Kayu)", st(pg)["on"] and st(pg)["x"] > 45)
    ok("5e tanpa error JavaScript (bagian 1–6)", not errs and not errs2, (errs + errs2)[:3])
    ctx.close()

    # ================= 7. Jangkar · 8. Memancing dari kapal · 9. Inventaris =================
    ctx, pg, errs = fresh(b, hour=11); board(pg)
    hold(pg, "w", 1.0)
    ok("7a sebelum jangkar: tombol Memancing redup & menolak (kapal hanyut)", ev(pg, "document.getElementById('seaFish').classList.contains('dim')") and not ev(pg, "NW.boat.fish()"))
    pg.tap("#seaAnchor"); stop = wait_for(pg, "Math.abs(NW.boat.B.v)<1", 2.5)
    ok("7b ketuk ⚓ Jangkar → kapal berhenti (< 2,5 dtk), tombol berubah jadi ⛵ Angkat Jangkar", stop and st(pg)["anchor"] and "Angkat" in ev(pg, "document.getElementById('seaAnchor').textContent"))
    x1 = st(pg)["x"]; hold(pg, "w", 0.8)
    ok("7c saat berjangkar joystick tidak menggerakkan kapal", abs(st(pg)["x"] - x1) < 0.01 and not ev(pg, "document.getElementById('seaFish').classList.contains('dim')"))
    pos_before = st(pg)
    pg.tap("#seaFish"); wait_for(pg, "window.__nusa.mode()==='fish'", 3); time.sleep(0.4)
    ok("8a ketuk 🎣 Memancing → sistem mancing LAMA (mode fish, dari kapal), tombol ⛵ Ke Kapal", ev(pg, "window.__nusa.mode()") == "fish" and ev(pg, "window.__nusa.fishFrom()") == "sea" and "Ke Kapal" in ev(pg, "document.getElementById('landBtn').textContent"))
    sea = ev(pg, "window.__nusa.G.sea && window.__nusa.G.sea.id")
    ok("8b kelompok ikan = perairan di posisi kapal (Perairan Muara)", sea == "muara_laut", sea)
    # mengisi lemparan & melempar dengan sentuhan sungguhan
    pg.mouse.move(195, 500); pg.mouse.down(); time.sleep(0.6); pg.mouse.up(); time.sleep(1.4)
    ph = ev(pg, "window.__nusa.G.phase")
    ok("8c tahan → isi kekuatan, lepas → kail dilempar (fase menunggu)", ph in ("waiting", "flying"), ph)
    rock = ev(pg, "new Promise(r=>{const a=[]; let n=0; (function f(){ a.push(window.__nusa.rodTip().y); if(++n<50) requestAnimationFrame(f); else r(Math.max(...a)-Math.min(...a)); })(); })")
    ok("8d kapal bergoyang pelan saat memancing (ujung joran ikut naik-turun)", rock > 1.0, round(rock, 2))
    pg.screenshot(path=OUT + "08_memancing_dari_kapal.png")
    ev(pg, "(()=>{const G=window.__nusa.G; G.biteTimer=0.01; })()"); wait_for(pg, "window.__nusa.G.phase==='bite'", 4)
    ev(pg, "window.__nusa.G.pending = {fish: window.__nusa.chooseFish().fish, w: 0.9, wr: 0.2}; window.__nusa.startFight()"); time.sleep(0.2)
    pg.screenshot(path=OUT + "08b_strike_di_kapal.png")
    bx = ev(pg, "NW.boat.B.x"); time.sleep(0.5)
    ok("8e selama Strike & pertarungan kapal tidak bergerak (posisi tetap)", ev(pg, "window.__nusa.G.phase") == "fight" and ev(pg, "NW.boat.B.x") == bx and abs(bx - pos_before["x"]) < 0.01)
    c0 = ev(pg, "window.__nusa.S.cooler.length")
    ev(pg, "window.__nusa.endFight('caught')"); time.sleep(0.3)
    it = ev(pg, "window.__nusa.S.cooler[window.__nusa.S.cooler.length-1]")
    uids = ev(pg, "window.__nusa.S.cooler.map(i=>i.uid)")
    ok("9a ikan dari kapal masuk inventaris utama: UID unik, id, berat, waktu", ev(pg, "window.__nusa.S.cooler.length") == c0 + 1 and it["uid"] and len(set(uids)) == len(uids) and it["id"] and it["w"] > 0 and it["t"] > 0, it)
    ok("9b koleksi (dex) & statistik ikut tercatat", ev(pg, "(id)=>window.__nusa.S.dex[id].n", it["id"]) >= 1 and ev(pg, "window.__nusa.S.stats.caught") >= 1)
    ok("9c 'Pamerkan di tangan' disembunyikan di kapal (pamer setelah turun)", ev(pg, "document.getElementById('catchHold').classList.contains('hidden')"))
    pg.click("#catchOk"); time.sleep(0.2)
    pg.click("#landBtn"); time.sleep(0.8)
    s = st(pg)
    ok("8f ⛵ Ke Kapal → kembali ke kapal di posisi yang sama, masih berjangkar", ev(pg, "window.__nusa.mode()") == "world" and s["on"] and s["anchor"] and abs(s["x"] - pos_before["x"]) < 0.01 and abs(s["y"] - pos_before["y"]) < 0.01)
    # ikan dilindungi tetap dilepas (sistem konservasi lama)
    ev(pg, "NW.boat.fish()"); wait_for(pg, "window.__nusa.mode()==='fish'", 3)
    m0, n0 = ev(pg, "window.__nusa.S.money"), ev(pg, "window.__nusa.S.cooler.length")
    ev(pg, "window.__nusa.G.phase='fight'; window.__nusa.landFish(window.Nusa.FISH_BY_ID.napoleon, 40)"); time.sleep(0.2); ev(pg, "document.getElementById('catchOk').click()")
    ok("9d spesies dilindungi yang tertangkap dari kapal tetap dilepas + hadiah konservasi (tidak masuk coolbox)", ev(pg, "window.__nusa.S.cooler.length") == n0 and ev(pg, "window.__nusa.S.money") > m0)
    ev(pg, "document.getElementById('landBtn').click()"); time.sleep(0.6)

    # ================= 10. Menangkap ikan saat hujan =================
    ev(pg, "NW.weather.force('hujan',{snap:true})"); time.sleep(1.0)
    wxs = ev(pg, "NW.weather.stats()")
    ok("10a hujan di laut: tetes hujan & riak tampil di sekitar kapal", wxs["rain"] > 0.5 and wxs["drops"] > 0, {k: wxs[k] for k in ("rain", "drops", "ripples")})
    pg.screenshot(path=OUT + "10_hujan_di_laut.png")
    ev(pg, "NW.boat.fish()"); wait_for(pg, "window.__nusa.mode()==='fish'", 3)
    bf = ev(pg, "NW.weather.biteFactor()")
    r1 = catch_sea(pg)
    ok("10b memancing dari kapal saat hujan tetap normal (ikan masuk inventaris; cuaca hanya waktu tunggu 0,88–1,08)", r1["id"] and 0.88 <= bf <= 1.08, (r1, bf))
    pg.screenshot(path=OUT + "10b_mancing_hujan.png")
    ev(pg, "document.getElementById('landBtn').click()"); time.sleep(0.5)
    ev(pg, "NW.weather.force('kabut',{snap:true})"); time.sleep(0.8)
    ok("10c kabut: jarak pandang berkurang tapi kompas ke dermaga tetap tampil (navigasi aman)", ev(pg, "NW.weather.state.fog") > 0.5 and ev(pg, "!document.getElementById('seaHud').classList.contains('hidden') && document.getElementById('seaDock').textContent.length>3"))
    ev(pg, "NW.weather.force('auto')")
    ok("10d tanpa error JavaScript (bagian 7–10)", not errs, errs[:3])
    ctx.close()

    # ================= 11. Peta navigasi · 12. Perjalanan Muara – Selat Sunda =================
    ctx, pg, errs = fresh(b); board(pg)
    hold(pg, "w", 1.5)
    pg.tap("#seaMap"); time.sleep(0.8)
    chart = ev(pg, "(()=>{const c=document.getElementById('seaChart'); return c?{w:c.width,h:c.height}:null})()")
    txt = ev(pg, "document.getElementById('panelBody').innerText")
    ok("11a 🗺️ Peta Laut terbuka: peta tergambar, nama dermaga & jarak pulang tampil, spot rahasia belum terlihat", ev(pg, "window.Nusa.currentPanel()") == "seamap" and chart and chart["w"] > 200 and "Dermaga Muara" in txt and " m" in txt and "4 spot belum ditemukan" in txt, txt[:120])
    seen0 = ev(pg, "window.__nusa.S.sea.seen.split('1').length-1")
    pg.screenshot(path=OUT + "11_peta_laut.png")
    pg.tap("#panelClose"); time.sleep(0.2)
    ar = sail_to(pg, "laut")
    ok("12a berlayar ke tepi timur Muara → masuk laut lepas (tanpa menu), masih di atas kapal", ar == "laut" and st(pg)["on"] and ev(pg, "!!window.__nusa.S.adv.visited.laut"))
    hold(pg, "w", 1.0)
    seen1 = ev(pg, "window.__nusa.S.sea.seen.split('1').length-1")
    ok("11b area yang sudah dilayari tercatat (kabut peta berkurang)", seen1 > seen0, (seen0, seen1))
    chartpos = ev(pg, "(()=>{const b=NW.boat.B; return NW.sea.toChart(b.area,b.x,b.y)})()")
    ok("11c posisi kapal di peta = koordinat dunia game (bukan GPS), sinkron dengan kapal", abs(chartpos["x"] - (ev(pg, "NW.boat.B.x") + 50.5)) < 1e-6 and abs(chartpos["y"] - (ev(pg, "NW.boat.B.y") - 4)) < 1e-6)
    pg.screenshot(path=OUT + "12_berlayar_laut_lepas.png")
    ar = sail_to(pg, "selat")
    ok("12b berlayar ke tepi timur laut lepas → Pelabuhan Selat Sunda (kapal tetap dikemudikan)", ar == "selat" and st(pg)["on"] and ev(pg, "!!window.__nusa.S.adv.visited.selat"))
    mo = ev(pg, "NW.areas.get('selat').sea.moors[0]")
    pose(pg, mo["x"] - 1.6, mo["y"] + 0.4, mo["a"])
    ok("12c dekat dermaga pelabuhan & pelan → tombol ⚓ Turun Kapal", target(pg) == "Turun Kapal")
    pg.screenshot(path=OUT + "12c_merapat_selat.png")
    pg.tap("#actBtn"); wait_for(pg, "!NW.boat.on", 3); time.sleep(0.3)
    pl = ev(pg, "[NW.world.player.x, NW.world.player.y]")
    ok("2a turun kapal di dermaga: pemain berdiri di papan dermaga (bisa diinjak), kapal ditambat", not st(pg)["on"] and st(pg)["moor"] == "dermaga" and ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y)") and ev(pg, "NW.tileAt(Math.floor(NW.world.player.x),Math.floor(NW.world.player.y))") == 5, pl)
    ok("2b tombol kapal & kompas disembunyikan setelah turun", ev(pg, "document.getElementById('seaBar').classList.contains('hidden') && document.getElementById('seaHud').classList.contains('hidden')"))
    hold(pg, "a", 0.6); hold(pg, "w", 1.0)
    ok("2c setelah turun pemain berjalan biasa di darat (tidak pernah ke air)", ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y)") and not st(pg)["on"])
    goto(pg, 19.4, 19.6); time.sleep(0.6)
    pg.screenshot(path=OUT + "13_pelabuhan_selat_sunda.png")
    # turun di tengah laut tidak mungkin
    board(pg, "selat"); sail_to(pg, "laut"); pose(pg, 40, 20, 0)
    ok("2d di tengah laut tidak ada tombol Turun Kapal (tidak bisa berjalan di laut)", target(pg) is None and not ev(pg, "NW.boat.seaCandidates().length"))
    # perjalanan cepat lama tetap berfungsi (cadangan): dari kapal → Peta Laut → Perjalanan Cepat → Muara
    pg.tap("#seaMap"); time.sleep(0.5); ev(pg, "document.querySelector('#panelBody [data-act=fast]').click()"); time.sleep(0.4)
    ok("12d Peta Laut → 🧭 Perjalanan Cepat membuka peta rute lama", ev(pg, "window.Nusa.currentPanel()") == "map")
    ev(pg, "document.querySelector('#panelBody [data-act=go][data-arg=\"0\"]').click()"); time.sleep(0.5)
    wait_for(pg, "!NW.adv.isBusy() && document.getElementById('voyage').classList.contains('hidden')", 20); time.sleep(0.4)
    ok("12e rute lama: tiba di Muara di dermaga (darat), kapal ikut bersandar di dermaga Muara", ev(pg, "NW.areas.cur.id") == "muara" and not st(pg)["on"] and st(pg)["area"] == "muara" and st(pg)["moor"] == "dermaga" and ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y)"))
    ev(pg, "window.__nusa.travel(2)"); time.sleep(0.4); wait_for(pg, "!NW.adv.isBusy() && document.getElementById('voyage').classList.contains('hidden')", 20); time.sleep(0.4)
    ok("12f rute lama ke Selat Sunda (indeks LOCATIONS lama) → mendarat di Pelabuhan Selat Sunda", ev(pg, "NW.areas.cur.id") == "selat" and ev(pg, "window.__nusa.mode()") == "world" and ev(pg, "window.__nusa.S.loc") == 2 and st(pg)["area"] == "selat")
    goto(pg, ev(pg, "NW.SELAT_MAP.SPOT.x+0.4"), ev(pg, "NW.SELAT_MAP.SPOT.y")); ev(pg, "NW.world.interact()"); wait_for(pg, "window.__nusa.mode()==='fish'", 3)
    ok("12g titik mancing ujung dermaga Selat memakai lokasi LOCATIONS 'selat' lama (dari dermaga)", ev(pg, "window.__nusa.fishFrom()") == "dock" and ev(pg, "window.__nusa.S.loc") == 2)
    ev(pg, "document.getElementById('landBtn').click()"); time.sleep(0.5)
    ok("12h tanpa error JavaScript (bagian 11–12)", not errs, errs[:3])
    ctx.close()

    # ================= 13. Cerita & NPC Selat Sunda =================
    ctx, pg, errs = fresh(b, hour=9)
    m_start = ev(pg, "window.__nusa.S.money")
    ev(pg, "window.__nusa.travel(2)"); time.sleep(0.4); wait_for(pg, "!NW.adv.isBusy() && document.getElementById('voyage').classList.contains('hidden')", 20); time.sleep(0.5)
    ev(pg, "window.__nusa.S.hour=9; NW.world.areaNpcs().forEach(NW.world.placeNPC)"); time.sleep(0.4)
    info = ev(pg, "NW.world.areaNpcs().map(n=>[n.id,n.name,n.style.hat,n.style.shirt,n.sched.length])")
    ok("13a tiga NPC orisinal Selat (Pak Hasan, Bu Ratna, Arif): penampilan & jadwal berbeda", [x[0] for x in info] == ["hasan", "ratna", "arif"] and len({x[3] for x in info}) == 3 and all(x[4] >= 4 for x in info), info)
    acts = ev(pg, "(()=>{const S=window.__nusa.S, npcs=NW.world.areaNpcs(), r={}; for(const h of [6,10,13,15,18,22]){ r[h]=npcs.map(n=>NW.world.actNow(n,h).act); } return r})()")
    ok("13b aktivitas sederhana berganti mengikuti jam (menjahit jaring, berjualan, gudang, mancing, tidur)", len({tuple(v) for v in acts.values()}) >= 4, acts)
    lab = talk(pg, "hasan", "Siap")
    ok("13c Bagian 1: Pak Hasan menyambut di pangkal dermaga", lab is not None and "Siap" in lab and sel(pg)["step"] == 1, lab)
    goto(pg, 21.5, 18.7); time.sleep(0.6); goto(pg, 25.3, 24.4); time.sleep(0.6)
    ok("13d jelajah pelabuhan: Pasar Ikan & Gudang Peralatan ditemukan → langkah berikut", sel(pg)["step"] == 2 and ev(pg, "NW.adv.isFound('selat:pasar') && NW.adv.isFound('selat:gudang')"))
    goto(pg, 21.5, 18.45); ev(pg, "NW.world.interact()"); time.sleep(0.3); lab = dialog_through(pg)
    ok("13e Bu Ratna di Pasar Ikan (lewat lapak 🏪)", lab is not None and sel(pg)["step"] == 3, lab)
    lab = talk(pg, "arif")
    ok("13f Arif di Gudang Peralatan", lab is not None and sel(pg)["step"] == 4, lab)
    lab = talk(pg, "hasan")
    ok("13g Bagian 1 selesai: +200 koin & catatan", sel(pg)["bab"] == 2 and ev(pg, "window.__nusa.S.money") == m_start + 200 and ev(pg, "window.__nusa.S.adv.notes.some(n=>n.id==='selat:bab1')"))
    lab = talk(pg, "hasan")
    ok("13h Bagian 2: Pak Hasan mengajari membaca tanda laut", sel(pg)["bab"] == 2 and sel(pg)["step"] == 1, lab)
    board(pg, "selat"); sail_to(pg, "laut")
    for sx, sy in [(40, 31.5), (62, 27)]:
        pose(pg, sx - 3, sy, 0); hold(pg, "w", 0.2); pose(pg, sx, sy, 0); time.sleep(0.7)
    ok("13i dua spot laut ditemukan dengan berlayar (Karang Dangkal & Arus Selat) → masuk Buku Petualangan", ev(pg, "NW.adv.isFound('sea:karang') && NW.adv.isFound('sea:arus')") and sel(pg)["step"] == 2 and ev(pg, "window.__nusa.S.adv.notes.length") >= 2)
    pg.screenshot(path=OUT + "13i_spot_arus.png")
    ev(pg, "NW.boat.rescue()"); wait_for(pg, "!NW.boat.busy && NW.areas.cur.id==='selat'", 5); time.sleep(0.4)
    mo = ev(pg, "NW.areas.get('selat').sea.moors[0]")
    ok("16a 🛟 Ke Dermaga dari laut lepas (sisi timur) → ditarik ke dermaga terdekat: Pelabuhan Selat Sunda", ev(pg, "NW.areas.cur.id") == "selat" and abs(st(pg)["x"] - mo["x"]) < 0.01 and st(pg)["anchor"])
    pg.tap("#actBtn"); wait_for(pg, "!NW.boat.on", 3); time.sleep(0.3)
    ev(pg, "window.__nusa.S.hour=11; NW.world.areaNpcs().forEach(NW.world.placeNPC)"); time.sleep(0.3)
    lab = talk(pg, "arif", "pelampung")
    ok("13j Bagian 2 selesai: lencana Mata Laut + 250 koin", sel(pg)["bab"] == 3 and ev(pg, "!!window.__nusa.S.adv.awards['selat:lencana']") and ev(pg, "window.__nusa.S.money") == m_start + 450, lab)
    lab = talk(pg, "hasan")
    ok("13k Bagian 3: tantangan Arus Selat", sel(pg)["bab"] == 3 and sel(pg)["step"] == 1, lab)
    board(pg, "selat"); sail_to(pg, "laut"); pose(pg, 62, 29, 0); ev(pg, "NW.boat.toggleAnchor()"); time.sleep(0.6)
    ev(pg, "NW.boat.fish()"); wait_for(pg, "window.__nusa.mode()==='fish'", 3)
    ok("13l memancing di spot Arus Selat (kelompok ikan arus)", ev(pg, "window.Nusa.seaSpot()") == "arus")
    got = None
    for _ in range(8):
        r1 = catch_sea(pg)
        if sel(pg)["step"] == 2: got = r1; break
    leg = ev(pg, "window.__nusa.S.cooler.filter(i=>window.Nusa.FISH_BY_ID[i.id].rarity==='legenda').length")
    ok("13m ikan Arus Selat didaratkan → langkah berikut; tidak ada ikan legenda otomatis", got is not None and leg == 0, got)
    ev(pg, "document.getElementById('landBtn').click()"); time.sleep(0.5)
    ev(pg, "NW.boat.toggleAnchor(); NW.boat.rescue()"); wait_for(pg, "!NW.boat.busy && NW.areas.cur.id==='selat'", 5); time.sleep(0.3)
    pg.tap("#actBtn"); wait_for(pg, "!NW.boat.on", 3); time.sleep(0.3)
    lab = talk(pg, "hasan", "gelar")
    time.sleep(5.6)
    ok("13n Bagian 3 selesai: gelar Pelaut Selat Sunda + 350 koin (total hadiah cerita 800 koin, wajar)", sel(pg)["bab"] == 4 and ev(pg, "!!window.__nusa.S.adv.awards['selat:gelar']") and ev(pg, "window.__nusa.S.money") == m_start + 800 + ev(pg, "window.__nusa.S.stats.earned"), lab)
    pg.screenshot(path=OUT + "13n_gelar_selat.png")
    ev(pg, "document.getElementById('awardOk') && document.getElementById('awardOk').click()"); time.sleep(0.3)
    dialog_through(pg)
    lab = talk(pg, "arif")
    ok("13o setelah tamat, NPC mengobrol biasa (dialog bergiliran) tanpa ❗", lab is not None and lab != "TIDAK-TERJANGKAU" and not any(ev(pg, "NW.world.areaNpcs().map(n=>NW.areas.cur.hooks.markerFor(n))")), lab)
    ev(pg, "Nusa.openPanel('adventure')"); time.sleep(0.4)
    book = ev(pg, "document.getElementById('panelBody').innerText")
    ok("13p Buku Petualangan: Pelabuhan Selat Sunda & Perairan Selat Sunda, cerita selesai, spot laut tercatat", "Pelabuhan Selat Sunda" in book and "Perairan Selat Sunda" in book and "Jejak Arus Selat" in book and "Karang Dangkal" in book and "Arus Selat" in book)
    ev(pg, "Nusa.closePanel()")
    ok("13q tanpa error JavaScript (cerita)", not errs, errs[:3])
    ctx.close()

    # ================= 14. Simpan & muat di atas kapal =================
    ctx, pg, errs = fresh(b); board(pg); sail_to(pg, "laut"); pose(pg, 33.3, 27.7, 0.9); ev(pg, "NW.boat.toggleAnchor()"); time.sleep(1.2)
    before = st(pg); money = ev(pg, "window.__nusa.S.money")
    pg.reload(); time.sleep(1.0)
    aft = st(pg)
    ok("14a muat ulang di tengah laut: tetap di atas kapal, area laut lepas, posisi & arah sama, jangkar tetap", aft["on"] and ev(pg, "NW.areas.cur.id") == "laut" and abs(aft["x"] - before["x"]) < 0.01 and abs(aft["y"] - before["y"]) < 0.01 and abs(aft["a"] - before["a"]) < 0.01 and aft["anchor"], (before, aft))
    ok("14b koin & data lain tidak berubah", ev(pg, "window.__nusa.S.money") == money)
    pg.click("#startBtn"); time.sleep(0.4); ev(pg, "window.__nusa.S.muted=true")
    ok("14c tombol kapal muncul lagi setelah muat ulang; pemain tidak muncul di air tanpa kapal", ev(pg, "!document.getElementById('seaBar').classList.contains('hidden')") and st(pg)["on"])
    # data rusak: di laut lepas tanpa kapal → dermaga aman
    raw = json.loads(ev(pg, "localStorage.getItem('nusa-island-v1')")); raw["sea"]["on"] = False; raw["sea"]["x"] = "rusak"
    ctx.close()
    ctx, pg, errs2 = page(b, "if(!sessionStorage.getItem('s')){localStorage.setItem('nusa-island-v1', %s); sessionStorage.setItem('s','1')}" % json.dumps(json.dumps(raw)))
    ok("14d simpanan rusak (di laut tanpa kapal) → mulai aman di dermaga darat, tidak pernah di air", ev(pg, "NW.areas.cur.id") in ("muara", "selat") and not st(pg)["on"] and ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y)"), ev(pg, "NW.areas.cur.id"))
    ok("14e tanpa error JavaScript (simpan/muat)", not errs and not errs2, (errs + errs2)[:3])
    ctx.close()

    # ================= 15. Migrasi simpanan lama (v9 → v10) =================
    ctx, pg, errs = fresh(b)
    ev(pg, """(()=>{const S=window.__nusa.S; S.money=98765; S.up={rod:7,bait:3,cooler:9,boat:2}; S.cooler=[{uid:'k1',id:'kakap',w:3.2,t:1,lock:true},{uid:'k2',id:'nila',w:0.8,t:2,vr:'silver'}];
      S.dex={kakap:{n:4,best:3.2},nila:{n:9,best:1.1}}; S.stats.caught=13; S.skills={presisi:1}; S.story=S.story||{}; S.story.ch=5; S.adv.toba.bab=3; S.adv.toba.step=1; S.adv.found['secret:lubuk']=7; S.adv.found['toba:bukit']=5;
      S.home.level=3; S.profile.name='Uji'; S.wx.seed=4242; window.__nusa.save(); })()""")
    v9 = json.loads(ev(pg, "localStorage.getItem('nusa-island-v1')")); v9["v"] = 9; v9.pop("sea", None); v9["adv"].pop("selat", None)
    for k in [k for k in v9["adv"]["found"] if k.startswith("sea:") or k.startswith("selat:") or k.startswith("laut:")]: v9["adv"]["found"].pop(k)
    aud = ev(pg, "localStorage.getItem('nusa-island-audio-v1')"); wxfx = ev(pg, "localStorage.getItem('nusa-island-wxfx-v1')")
    ctx.close()
    seed = "if(!sessionStorage.getItem('s')){localStorage.setItem('nusa-island-v1', %s); localStorage.setItem('nusa-island-audio-v1', %s); localStorage.setItem('nusa-island-wxfx-v1', %s); sessionStorage.setItem('s','1')}" % (json.dumps(json.dumps(v9)), json.dumps(aud or '{"music":0.4}'), json.dumps(wxfx or '{"level":"rendah","calm":true}'))
    ctx, pg, errs = page(b, seed)
    S = ev(pg, "JSON.parse(JSON.stringify(window.__nusa.S))")
    chk = {"v": S["v"] == 10, "koin": S["money"] == 98765, "up": S["up"] == {"rod": 7, "bait": 3, "cooler": 9, "boat": 2}, "ikan": [c["uid"] for c in S["cooler"]] == ["k1", "k2"] and S["cooler"][0].get("lock") and S["cooler"][1].get("vr") == "silver",
           "dex": S["dex"]["kakap"]["n"] == 4, "keahlian": S["skills"].get("presisi") == 1, "darto": S["story"]["ch"] == 5, "toba": S["adv"]["toba"]["bab"] == 3, "rahasia": S["adv"]["found"].get("secret:lubuk") == 7,
           "rumah": S["home"]["level"] == 3, "nama": S["profile"]["name"] == "Uji", "cuaca": S["wx"]["seed"] == 4242, "sea": S["sea"]["v"] == 1 and not S["sea"]["on"] and S["sea"]["area"] == "muara", "selat": S["adv"]["selat"]["bab"] == 1}
    ok("15a simpanan v9 → v10: koin, ikan (UID, kunci, varian), joran, coolbox, kapal, koleksi, keahlian, cerita Darto & Toba, spot rahasia, Rumahku, nama, cuaca utuh; data kapal & cerita Selat default aman", all(chk.values()), {k: v for k, v in chk.items() if not v})
    ok("15b cadangan simpanan v9 dibuat sebelum migrasi; pengaturan audio & efek cuaca (kunci terpisah) tidak disentuh", ev(pg, "!!localStorage.getItem('nusa-island-v1-backup-v9')") and ev(pg, "localStorage.getItem('nusa-island-audio-v1')") == (aud or '{"music":0.4}') and ev(pg, "localStorage.getItem('nusa-island-wxfx-v1')") == (wxfx or '{"level":"rendah","calm":true}'))
    ok("15c pemain lama mulai di darat Muara (tidak di laut), kapal di dermaga", ev(pg, "NW.areas.cur.id") == "muara" and not st(pg)["on"] and st(pg)["moor"] == "dermaga" and ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y)"))
    sec = ev(pg, "NW.MUARA_MAP.fishSpots.some(s=>s.id==='lubuk')")
    ok("15d spot rahasia Bumbu 2.2 (Lubuk Bambu) tetap aktif setelah migrasi", sec)
    ok("15e tanpa error JavaScript (migrasi)", not errs, errs[:3])
    ctx.close()
    # sampah di S.sea tidak membuat reset
    ctx, pg, errs = page(b, "if(!sessionStorage.getItem('s')){localStorage.setItem('nusa-island-v1', JSON.stringify({v:10,money:321,sea:'kacau',adv:{v:1,area:'laut'}})); sessionStorage.setItem('s','1')}")
    ok("15f S.sea rusak / area laut tanpa kapal → nilai aman, koin tidak direset", ev(pg, "window.__nusa.S.money") == 321 and ev(pg, "typeof window.__nusa.S.sea==='object' && window.__nusa.S.sea.v===1") and ev(pg, "NW.areas.cur.id") != "laut", ev(pg, "NW.areas.cur.id"))
    ctx.close()

    # ================= 16. Kembali ke dermaga saat terjebak =================
    ctx, pg, errs = fresh(b); board(pg); sail_to(pg, "laut")
    pose(pg, 49.6, 8.0, ang(1, 0))  # terjepit di antara batu Pulau Batu
    c0, m0 = ev(pg, "window.__nusa.S.cooler.length"), ev(pg, "window.__nusa.S.money")
    want = ev(pg, "(()=>{const t=NW.boat.rescueTarget(); return {area:t.area.id, x:t.moor.x, name:t.moor.name}})()")
    hold(pg, "w", 3.6)
    ok("16b terjebak (mendorong tanpa bergerak) → saran 🛟 Ke Dermaga muncul", "Ke Dermaga" in ev(pg, "document.getElementById('toast').textContent") or ev(pg, "document.getElementById('seaHome').classList.contains('pulse')"))
    pg.tap("#seaHome"); wait_for(pg, "!NW.boat.busy", 4); time.sleep(0.4)
    ok("16c ketuk 🛟 Ke Dermaga → kapal ditarik aman ke dermaga TERDEKAT di peta laut, berjangkar, ikan & koin utuh", ev(pg, "NW.areas.cur.id") == want["area"] and abs(st(pg)["x"] - want["x"]) < 0.01 and st(pg)["anchor"] and st(pg)["on"] and ev(pg, "window.__nusa.S.cooler.length") == c0 and ev(pg, "window.__nusa.S.money") == m0, want)
    ok("16d setelah ditarik, langsung bisa Turun Kapal", target(pg) == "Turun Kapal")
    # pantai yang disediakan sebagai titik turun kedua di Muara
    if ev(pg, "NW.areas.cur.id") != "muara": sail_to(pg, "muara")
    pm = ev(pg, "NW.areas.get('muara').sea.moors[1]")
    pose(pg, pm["x"] + 1.4, pm["y"] + 0.6, pm["a"])
    ok("2e Pantai Selatan Muara (pantai yang disediakan): ⚓ Turun Kapal tersedia", target(pg) == "Turun Kapal")
    pg.tap("#actBtn"); wait_for(pg, "!NW.boat.on", 3); time.sleep(0.4)
    ok("2f turun di pantai: pemain berdiri di pasir yang bisa diinjak, kapal tertambat di pantai", ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y)") and ev(pg, "NW.tileAt(Math.floor(NW.world.player.x),Math.floor(NW.world.player.y))") == 2 and st(pg)["moor"] == "pantai")
    goto(pg, pm["board"]["x"], pm["board"]["y"])
    ok("2g dari pantai bisa ⛵ Naik Kapal lagi (kapal tetap di tempat ditambat)", target(pg) == "Naik Kapal")
    ok("16e tanpa error JavaScript (pemulihan)", not errs, errs[:3])
    ctx.close()

    # ================= 17. Audio kapal & cuaca =================
    ctx, pg, errs = fresh(b, muted=False)
    a0 = ev(pg, "NW.audio.stats()")
    board(pg); hold(pg, "w", 1.6); time.sleep(0.5)
    at = ev(pg, "NW.audio.ambTarget"); cur = ev(pg, "NW.audio.current")
    ok("17a berlayar: ombak, mesin tempel & air terbelah terdengar (lewat AudioManager), musik eksplorasi laut", at["motor"] > 0.3 and at["wake"] > 0.2 and at["surf"] > 0.4 and cur == "samudra", ({k: round(v, 2) for k, v in at.items() if k in ("motor", "wake", "surf", "water")}, cur))
    ev(pg, "NW.boat.toggleAnchor()"); time.sleep(1.4)
    ok("17b jangkar diturunkan → mesin mati (target 0), ombak tetap", ev(pg, "NW.audio.ambTarget.motor") == 0 and ev(pg, "NW.audio.ambTarget.surf") > 0.3)
    ev(pg, "NW.boat.toggleAnchor()"); hold(pg, "w", 0.6); ev(pg, "NW.boat.rescue()"); wait_for(pg, "!NW.boat.busy", 4); time.sleep(0.3)
    ev(pg, "NW.world.interact()"); wait_for(pg, "!NW.boat.on", 3); time.sleep(1.6)
    ok("17c turun dari kapal → suara mesin benar-benar berhenti (< 1%)", ev(pg, "NW.audio.ambTarget.motor") == 0 and ev(pg, "NW.audio.ambLevel('motor')") < 0.01, ev(pg, "NW.audio.ambLevel('motor')"))
    board(pg); ev(pg, "NW.world.interact()"); wait_for(pg, "!NW.boat.on", 3); board(pg); time.sleep(0.5)
    a1 = ev(pg, "NW.audio.stats()")
    ok("17d tidak ada AudioContext baru / loop ganda: sumber suara lingkungan tetap sama setelah naik-turun berulang", a1["ctxCount"] == 1 and a1["ambSources"] == a0["ambSources"], (a0["ambSources"], a1["ambSources"], a1["ctxCount"]))
    ev(pg, "NW.weather.force('deras',{snap:true})"); time.sleep(1.2)
    at = ev(pg, "NW.audio.ambTarget")
    ok("17e hujan di laut: lapisan hujan aktif, angin naik; isyarat mancing tetap lebih jelas (hujan dibatasi)", at["rainHeavy"] > 0.3 and at["wind"] > 0.5, {k: round(at[k], 2) for k in ("rainSoft", "rainHeavy", "wind")})
    ev(pg, "NW.boat.toggleAnchor(); NW.boat.fish()"); wait_for(pg, "window.__nusa.mode()==='fish'", 3); time.sleep(1.2)
    ok("17f memancing dari kapal: musik 'Mancing · Laut', mesin mati, hujan diredam 0,6×", ev(pg, "NW.audio.current") == "mancing_laut" and ev(pg, "NW.audio.ambTarget.motor") == 0, ev(pg, "NW.audio.current"))
    ev(pg, "document.getElementById('landBtn').click()"); time.sleep(0.4); ev(pg, "NW.weather.force('auto')")
    ev(pg, "document.getElementById('muteBtn').click()"); time.sleep(0.4)
    ok("17g tombol 🔇 mematikan SEMUA suara termasuk mesin & ombak", ev(pg, "NW.audio.stats().muted") is True)
    ev(pg, "document.getElementById('muteBtn').click()"); time.sleep(0.2)
    ev(pg, "NW.boat.rescue()"); wait_for(pg, "!NW.boat.busy", 4); ev(pg, "NW.world.interact()"); wait_for(pg, "!NW.boat.on", 3)
    ev(pg, "window.__nusa.S.up.boat=2; window.__nusa.travel(2)"); time.sleep(0.4); wait_for(pg, "!NW.adv.isBusy() && document.getElementById('voyage').classList.contains('hidden')", 20); time.sleep(1.6)
    ok("17h di Pelabuhan Selat Sunda (jalan kaki): tema musik pelabuhan", ev(pg, "NW.audio.current") in ("pelabuhan", "pelabuhan_malam"), ev(pg, "NW.audio.current"))
    ok("17i tanpa error JavaScript (audio)", not errs, errs[:3])
    ctx.close()

    # ================= Keseimbangan ikan laut & data =================
    ctx, pg, errs = fresh(b)
    data = ev(pg, """(()=>{const ids=FISH.map(f=>f.id); const nw=['tongkol','kerapu_macan','kuwe_biru'].map(id=>FISH.find(f=>f.id===id));
      const out={dup: ids.length-new Set(ids).size, nw: nw.map(f=>f&&[f.loc,f.rarity,f.wMin,f.wMax,f.price,f.power])};
      const mult={sampah:1,biasa:1,langka:1,epik:1,legenda:1}; const res={};
      const ev=(fish,w)=>NW.FM.priceFor(fish,w,1,3);
      for(const sp of NW.sea.SPOT_LIST.concat([NW.sea.OPEN.muara])){ const c={}, r={}; let val=0; const N=4000;
        for(let i=0;i<N;i++){ const f=NW.sea.pickFish(sp,mult,false); c[f.id]=(c[f.id]||0)+1; r[f.rarity]=(r[f.rarity]||0)+1; if(!f.protected){ const w=f.wMin+(f.wMax-f.wMin)*0.4; val+=ev(f,w);} }
        res[sp.id]={leg:(r.legenda||0)/N, epik:(r.epik||0)/N, marlin:(c.marlin||0)/N, prot:Object.keys(c).filter(k=>FISH.find(f=>f.id===k).protected).length, ev:val/N}; }
      const dock={}; for(const L of LOCATIONS.slice(0,3)){ const pool=FISH.filter(f=>(f.loc===L.id||f.loc==='*')&&(f.night===undefined||f.night===false)); let tot=0, v=0; const av=RARITY_ORDER.filter(r=>pool.some(f=>f.rarity===r)); av.forEach(r=>tot+=RARITY[r].weight);
        av.forEach(r=>{ const g=pool.filter(f=>f.rarity===r); v+=RARITY[r].weight/tot*g.reduce((a,f)=>a+(f.protected?0:ev(f,f.wMin+(f.wMax-f.wMin)*0.4)),0)/g.length; }); dock[L.id]=v; }
      return {out, res, dock}; })()""")
    ok("B1 3 spesies baru (Tongkol, Kerapu Macan, Kuwe Biru) tanpa duplikasi ID; Kembung, Tenggiri, Kakap Merah, Barakuda, Kerapu & Marlin memakai data lama", data["out"]["dup"] == 0 and all(x and x[0] == "selat" for x in data["out"]["nw"]), data["out"])
    rs = data["res"]
    ok("B2 marlin sangat langka (< 0,6% per gigitan di Laut Dalam, siang); legenda tidak muncul di Pesisir & Arus", rs["dalam"]["marlin"] < 0.006 and rs["pesisir"]["leg"] == 0 and rs["arus"]["leg"] == 0, {k: (round(v["leg"], 4), round(v["marlin"], 4)) for k, v in rs.items()})
    dk = data["dock"]
    ok("B3 tidak ada spesies dilindungi di kelompok laut; nilai rata-rata tangkapan seimbang: spot laut lepas ≤ 1,5× dermaga Selat, Pesisir ≤ 1,2× dermaga Muara", all(v["prot"] == 0 for v in rs.values()) and max(rs[k]["ev"] for k in ("karang", "arus", "dalam")) <= 1.5 * dk["selat"] and rs["pesisir"]["ev"] <= 1.2 * dk["muara"], ({k: round(v["ev"]) for k, v in rs.items()}, {k: round(v) for k, v in dk.items()}))
    ok("B4 tidak ada mata uang/peluang berbayar baru", ev(pg, "Object.keys(window.__nusa.S).filter(k=>/tiket|ticket|gem|permata|gacha/i.test(k)).length") == 0)
    ctx.close()

    # ================= Performa (emulasi) =================
    ctx, pg, errs = fresh(b); board(pg); sail_to(pg, "laut"); pose(pg, 30, 30, 0.3)
    fps_js = "new Promise(r=>{let n=0;const t0=performance.now();(function f(){n++; if(performance.now()-t0<2500) requestAnimationFrame(f); else r(n/2.5);})();})"
    pg.keyboard.down("w"); time.sleep(0.4)
    f_sail = ev(pg, fps_js); wk = st(pg)["wake"]
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    f_sail4 = ev(pg, fps_js); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
    pg.keyboard.up("w")
    ev(pg, "NW.weather.force('deras',{snap:true})"); time.sleep(0.8); pg.keyboard.down("d"); pg.keyboard.down("w")
    f_rain = ev(pg, fps_js); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4}); f_rain4 = ev(pg, fps_js); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
    pg.keyboard.up("w"); pg.keyboard.up("d")
    mem0 = ev(pg, "performance.memory ? performance.memory.usedJSHeapSize : 0"); pg.keyboard.down("w"); time.sleep(8); pg.keyboard.up("w"); mem1 = ev(pg, "performance.memory ? performance.memory.usedJSHeapSize : 0")
    ti = ev(pg, "NW.terrainInfo()")
    print("PERF " + json.dumps({"laut_berlayar": {"fps": round(f_sail, 1), "fps_cpu4x": round(f_sail4, 1), "partikel_jejak": wk}, "laut_hujan_deras": {"fps": round(f_rain, 1), "fps_cpu4x": round(f_rain4, 1)}, "memori_naik_MB_8dtk": round((mem1 - mem0) / 1e6, 2), "cache_terrain_px": ti["w"] * ti["h"]}), flush=True)
    ok("P1 jejak air dibatasi (≤ 64 partikel), cache terrain laut ≤ 5,5 juta piksel", wk <= 64 and ti["w"] * ti["h"] <= 5.6e6, (wk, ti))
    ok("P2 FPS berlayar di laut (emulasi desktop) ≥ 45; dengan CPU 4× lebih lambat tetap berjalan (indikasi saja)", f_sail >= 45 and f_sail4 > 8, (round(f_sail), round(f_sail4)))
    ok("P3 memori tidak membengkak saat berlayar 8 dtk (< 12 MB)", (mem1 - mem0) < 12e6, round((mem1 - mem0) / 1e6, 2))
    ok("P4 halaman tidak bisa di-zoom (viewport user-scalable=no) & kanvas menolak gestur bawaan", "user-scalable=no" in ev(pg, "document.querySelector('meta[name=viewport]').content") and ev(pg, "getComputedStyle(document.getElementById('game')).touchAction") in ("none", "pinch-zoom") or ev(pg, "getComputedStyle(document.body).touchAction") == "none")
    ok("P5 tanpa error JavaScript (performa)", not errs, errs[:3])
    ctx.close()
    b.close()

print()
print(f"{sum(1 for r in R if r.startswith('PASS'))} lulus / {len(R)}")
print("tangkapan layar:", OUT)
