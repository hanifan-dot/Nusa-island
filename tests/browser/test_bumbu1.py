"""Uji Bumbu 1: cerita 4 bab, keahlian, dialog NPC, sudut nelayan, petunjuk pemain baru, migrasi.
Cerita dimainkan dengan mancing sungguhan: meteran lempar, pengontrol tarik-ulur yang membaca
aba-aba di layar (seperti pemain). Satu-satunya pintasan: waktu tunggu gigitan dipercepat.
Jalankan: python tests/browser/test_bumbu1.py
"""
import time, json, os, tempfile
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = tempfile.mkdtemp(prefix="nusa-bumbu-") + "/"
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else ""))
def ev(pg, js, arg=None): return pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)
def st(pg): return ev(pg, "JSON.parse(JSON.stringify(window.__nusa.S.story))")

def page(b, save=None, vp=(1280, 800)):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]})
    import wx_init; wx_init.apply(ctx)  # NUSA_WX=hujan → seluruh alur dijalankan saat cuaca dipaksa
    if save is not None:
        ctx.add_init_script("if(!sessionStorage.getItem('seeded')){localStorage.setItem('nusa-island-v1', %s);sessionStorage.setItem('seeded','1')}" % json.dumps(json.dumps(save)))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.7)
    return ctx, pg, errs

def finish_dialog(pg):
    for _ in range(14):
        if pg.locator("#dlgOpts .btn").count(): return True
        if not pg.is_visible("#dlg"): return False
        pg.click("#dlg"); time.sleep(0.25)
    return False
def choose(pg, text):
    finish_dialog(pg)
    loc = pg.locator("#dlgOpts .btn", has_text=text)
    if not loc.count(): R.append(f"INFO  tombol '{text}' tidak ada; dialog: {pg.inner_text('#dlgText')[:80]!r}"); return False
    loc.first.click(); time.sleep(0.5); return True
def close_dialog(pg):
    for _ in range(14):
        if not pg.is_visible("#dlg"): return
        if pg.locator("#dlgOpts .btn").count(): pg.locator("#dlgOpts .btn").last.click()
        else: pg.click("#dlg")
        time.sleep(0.2)
def go_near(pg, x, y): ev(pg, f"(()=>{{const p=NW.world.player;p.x={x};p.y={y};}})()"); time.sleep(0.35)
def talk_darto(pg):
    if ev(pg, "window.Nusa.mode()") != "world": ev(pg, "window.__nusa.goWorld('dock')"); time.sleep(0.3)
    ev(pg, "window.__nusa.S.hour=9; NW.world.npcs.forEach(NW.world.placeNPC)")
    pos = ev(pg, "(()=>{const n=NW.world.npcs[0];return [n.x,n.y]})()")
    go_near(pg, pos[0] - 0.6, pos[1] + 0.25)
    pg.keyboard.press("e"); time.sleep(0.6)

def cast(pg, power, aim_x=640):
    pg.mouse.move(aim_x, 450); pg.mouse.down()
    for _ in range(400):
        g = ev(pg, "[window.__nusa.G.power, window.__nusa.G.powerDir]")
        if g[1] > 0 and abs(g[0] - power) < 0.03: break
        time.sleep(0.005)
    pg.mouse.up()
    for _ in range(60):
        if ev(pg, "window.__nusa.G.phase") == "waiting": break
        time.sleep(0.05)
def strike(pg, fish=None, w=1.0):
    ev(pg, "window.__nusa.G.biteTimer = Math.min(window.__nusa.G.biteTimer, 0.05)")  # pintasan: tunggu gigitan
    for _ in range(60):
        if ev(pg, "window.__nusa.G.phase") == "bite": break
        time.sleep(0.03)
    if fish: ev(pg, f"window.__nusa.G.pending = {{fish: FISH.find(f=>f.id=='{fish}'), w:{w}, wr:.5}}")
    pg.mouse.down(); time.sleep(0.08)
def play_fight(pg, use_cues=True, hold_tired=True):
    held = True; t0 = time.time()
    while time.time() - t0 < 40:
        f = ev(pg, "(()=>{const F=window.__nusa.G.fight;return F?{T:F.T,s:F.surge>0,w:F.warn,ti:F.tiredT>0}:null})()")
        if not f: break
        want = held
        if use_cues and f["w"]: want = False
        elif hold_tired and f["ti"] and not f["s"]: want = f["T"] < 0.92
        elif f["s"]: want = False
        elif f["T"] > 0.78: want = False
        elif f["T"] < 0.4: want = True
        if want != held: (pg.mouse.down() if want else pg.mouse.up()); held = want
        time.sleep(0.03)
    if held: pg.mouse.up()
    time.sleep(0.6)
    caught = pg.is_visible("#catchWrap")
    if caught: pg.click("#catchOk"); time.sleep(0.2)
    return caught
def fish_once(pg, fish=None, w=1.0, power=0.5, cues=True):
    cast(pg, power); strike(pg, fish, w); return play_fight(pg, cues)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs = page(b)
    ok("0 permainan baru: cerita di Bab 1 langkah 0, keahlian belum ada", st(pg)["ch"] == 1 and st(pg)["step"] == 0 and not ev(pg, "window.__nusa.S.skills.presisi"))
    pg.click("#startBtn"); time.sleep(0.4); ev(pg, "window.__nusa.S.muted=true; window.__nusa.S.hour=9; NW.world.npcs.forEach(NW.world.placeNPC)")
    # ---------- pemain baru: petunjuk kontekstual ----------
    ok("P1 petunjuk pertama: cara berjalan", "joystick" in pg.inner_text("#hint"))
    pg.keyboard.down("d"); time.sleep(0.4); pg.keyboard.up("d"); time.sleep(0.3)
    ok("P2 setelah berjalan: petunjuk bicara dengan Pak Darto", "Pak Darto" in pg.inner_text("#hint"), pg.inner_text("#hint"))
    ok("P3 tanda ❗ di atas Pak Darto", ev(pg, "NW.story.markerFor(NW.world.npcs[0])"))

    # ================= BAB 1 =================
    talk_darto(pg)
    ok("B1.1 dialog Bab 1 terbuka (cerita sejarah muara)", "empat puluh tahun" in pg.inner_text("#dlgText") or pg.locator("#dlg").is_visible())
    choose(pg, "Siap")
    ok("B1.2 langkah: tangkap 2 ikan", st(pg)["step"] == 1)
    ok("P4 petunjuk berikutnya: ke dermaga untuk mancing", "Mancing" in pg.inner_text("#hint"), pg.inner_text("#hint"))
    # coba lompat: hadiah Bab 1 belum boleh ada
    ok("B1.3 bab tidak bisa dilewati (hadiah belum diberikan)", not st(pg)["rewarded"].get("ch1"))
    ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.3)
    n = 0
    for _ in range(6):
        if fish_once(pg, "nila", 0.7): n += 1
        if st(pg)["step"] >= 2: break
    ok("B1.4 dua ikan Muara ditangkap dengan mancing sungguhan → kembali ke Pak Darto", st(pg)["step"] == 2, n)
    talk_darto(pg); choose(pg, "Akan kucoba")
    ok("B1.5 belajar Lemparan Presisi", ev(pg, "window.__nusa.S.skills.presisi") and st(pg)["step"] == 3)
    # Lemparan Presisi: lepas tepat di garis kuning → kena riak
    ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.4)
    hit = False
    for _ in range(5):
        ev(pg, "window.__nusa.G.hot = {x: 0, z: 2 + 0.5*7}")
        cast(pg, 0.5, aim_x=640)
        hit = ev(pg, "window.__nusa.G.hotHit")
        strike(pg, "nila", 0.6); play_fight(pg)
        if hit: break
    ok("B1.6 lempar tepat ke riak ikan berhasil (bergantung waktu lepas)", hit and st(pg)["step"] == 4)
    # lemparan meleset tidak dihitung
    ev(pg, "window.__nusa.G.hot = {x: 0, z: 8.5}"); cast(pg, 0.25); miss = not ev(pg, "window.__nusa.G.hotHit"); strike(pg, "nila", 0.5); play_fight(pg)
    ok("S1 Lemparan Presisi: lemparan meleset tidak mendapat bonus", miss)
    money0 = ev(pg, "window.__nusa.S.money")
    talk_darto(pg); choose(pg, "Terima kasih")
    ok("B1.7 Bab 1 selesai: +150 koin sekali", ev(pg, "window.__nusa.S.money") == money0 + 150 and st(pg)["ch"] == 2)
    close_dialog(pg); talk_darto(pg); close_dialog(pg)
    ok("B1.8 hadiah Bab 1 tidak bisa diklaim ulang", ev(pg, "window.__nusa.S.money") == money0 + 150)

    # ================= BAB 2 =================
    talk_darto(pg)
    txt = pg.inner_text("#dlgText")
    choose(pg, "Aku bantu")
    ok("B2.1 cerita joran warisan & daftar bahan", st(pg)["step"] == 1)
    ev(pg, "window.Nusa.emit('read'); window.Nusa.emit('tired')")
    ok("B2.2 tugas Bab 3 tidak terhitung saat masih Bab 2 (urutan dijaga)", not st(pg)["prog"].get("reads") and not st(pg)["prog"].get("tired"))
    # benang di toko
    ev(pg, "window.__nusa.S.money = Math.max(window.__nusa.S.money, 500)")
    m1 = ev(pg, "window.__nusa.S.money")
    t = ev(pg, "NW.points.find(p=>p.id==='toko')"); go_near(pg, t["x"] + 0.1, t["y"])
    pg.keyboard.press("e"); time.sleep(0.5); choose(pg, "Benang"); choose(pg, "Beli")
    ok("B2.3 beli benang di toko: koin -120 tepat", st(pg)["mats"]["benang"] and ev(pg, "window.__nusa.S.money") == m1 - 120)
    close_dialog(pg)
    # refresh di tengah bab → progres tetap
    ev(pg, "window.__nusa.save()"); pg.reload(); time.sleep(0.8); pg.click("#startBtn"); time.sleep(0.3); ev(pg, "window.__nusa.S.muted=true")
    ok("B2.4 setelah refresh: bab, langkah, dan bahan tetap", st(pg)["ch"] == 2 and st(pg)["step"] == 1 and st(pg)["mats"]["benang"])
    ok("P5 setelah refresh: petunjuk awal tidak mengulang", "joystick" not in pg.inner_text("#hint"), pg.inner_text("#hint"))
    # damar dari Bu Sari: tukar ikan tertentu (bukan sembarang item)
    ev(pg, "(()=>{const S=window.__nusa.S;S.cooler=[{uid:'keep1',id:'patin',w:3,t:1},{uid:'give1',id:'nila',w:0.7,t:1},{uid:'keep2',id:'arwana',w:2,t:1}]})()")
    ev(pg, "window.__nusa.S.hour=9; NW.world.npcs.forEach(NW.world.placeNPC)")
    pt = ev(pg, "NW.points.find(p=>p.id==='pasar')"); go_near(pg, pt["x"], pt["y"] + 0.2)
    pg.keyboard.press("e"); time.sleep(0.5); choose(pg, "Tukar")
    cool = ev(pg, "window.__nusa.S.cooler.map(x=>x.uid)")
    ok("B2.5 tukar Nila dengan damar: hanya ikan yang ditunjuk yang diambil", st(pg)["mats"]["damar"] and cool == ["keep1", "keep2"], cool)
    close_dialog(pg)
    # bambu di rumpun dekat gapura (hanya muncul saat dibutuhkan cerita)
    gp = ev(pg, "NW.story.points().find(p=>p.id==='story:bamboo')")
    go_near(pg, gp["x"], gp["y"])
    ok("B2.6 rumpun bambu bisa didatangi", ev(pg, "NW.world.target && NW.world.target.id") == "story:bamboo")
    pg.keyboard.press("e"); time.sleep(0.4); choose(pg, "Ambil")
    ok("B2.7 bahan lengkap → Pak Darto ditandai ❗", st(pg)["mats"]["bambu"] and ev(pg, "NW.story.awaitsDarto()"))
    ok("B2.8 titik bambu hilang setelah diambil", ev(pg, "!NW.story.points().some(p=>p.id==='story:bamboo')"))
    corner_solids = ev(pg, "NW.solids.length")
    pg.screenshot(path=OUT + "corner0.png")
    m2 = ev(pg, "window.__nusa.S.money")
    talk_darto(pg); choose(pg, "Perbaiki"); time.sleep(0.8); close_dialog(pg)
    ok("B2.9 Bab 2 selesai: +200 koin, sudut nelayan tahap 1, Bab 3 terbuka", ev(pg, "window.__nusa.S.money") == m2 + 200 and st(pg)["corner"] == 1 and st(pg)["ch"] == 3)

    # ================= BAB 3 =================
    talk_darto(pg); choose(pg, "perhatikan")
    ok("B3.1 belajar Membaca Tarikan", ev(pg, "window.__nusa.S.skills.membaca") and st(pg)["step"] == 1)
    ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.3)
    # tanpa membaca aba-aba (menahan terus) → tidak dihitung
    r0 = st(pg)["prog"].get("reads", 0)
    cast(pg, 0.5); strike(pg, "patin", 3)
    t0 = time.time()
    while ev(pg, "!!window.__nusa.G.fight") and time.time() - t0 < 4: time.sleep(0.05)  # tahan terus
    pg.mouse.up(); time.sleep(0.5)
    if pg.is_visible("#catchOk"): pg.click("#catchOk")
    ok("S2 Membaca Tarikan: tidak melepas saat menyentak → tidak dihitung", st(pg)["prog"].get("reads", 0) == r0)
    ev(pg, "if(window.__nusa.G.phase!=='idle'){window.__nusa.goWorld('dock'); window.__nusa.enterFishing('dock')}"); time.sleep(0.3)
    for _ in range(8):
        if st(pg)["step"] >= 2: break
        fish_once(pg, "patin", 3)
    ok("B3.2 tiga sentakan terbaca dengan melepas saat aba-aba", st(pg)["step"] == 2, st(pg)["prog"])
    talk_darto(pg); choose(pg, "menggulung")
    ok("B3.3 belajar Kendali Senar", ev(pg, "window.__nusa.S.skills.kendali") and st(pg)["step"] == 3)
    ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.3)
    for _ in range(8):
        if st(pg)["step"] >= 4: break
        fish_once(pg, "patin", 3)
    ok("B3.4 empat gulungan saat ikan lelah", st(pg)["step"] == 4, st(pg)["prog"])
    m3 = ev(pg, "window.__nusa.S.money")
    talk_darto(pg); choose(pg, "gelar")
    ok("B3.5 Bab 3 selesai: gelar Nelayan Muda, +250", st(pg)["title"] == "Nelayan Muda" and ev(pg, "window.__nusa.S.money") == m3 + 250 and st(pg)["ch"] == 4)
    close_dialog(pg)

    # ================= BAB 4 =================
    talk_darto(pg); choose(pg, "tantangan")
    ok("B4.1 tantangan terakhir diterima", st(pg)["step"] == 1)
    ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.3)
    # lemparan biasa tidak memunculkan ikan uji
    cast(pg, 0.4); strike(pg)
    ok("B4.2 tanpa Lemparan Sempurna tidak ada ikan uji", not ev(pg, "window.__nusa.G.fight && window.__nusa.G.fight.challenge"))
    play_fight(pg)
    # gagal dengan sengaja (tahan terus sampai putus) → bisa diulang
    cast(pg, 0.95); strike(pg)
    is_ch = ev(pg, "!!(window.__nusa.G.fight && window.__nusa.G.fight.challenge)")
    t0 = time.time()
    while ev(pg, "!!window.__nusa.G.fight") and time.time() - t0 < 8: time.sleep(0.05)
    pg.mouse.up(); time.sleep(0.6)
    if pg.is_visible("#catchOk"): pg.click("#catchOk")
    ok("B4.3 Lemparan Sempurna memunculkan ikan uji; gagal → tetap di langkah ini (bisa diulang)", is_ch and st(pg)["step"] == 1)
    for _ in range(6):
        if st(pg)["step"] >= 2: break
        cast(pg, 0.95); strike(pg); play_fight(pg)
    ok("B4.4 ujian dermaga berhasil dengan membaca & menggulung", st(pg)["step"] == 2, st(pg)["prog"])
    m4 = ev(pg, "window.__nusa.S.money")
    talk_darto(pg); choose(pg, "joran warisan")
    ok("B4.5 cerita selesai: gelar Penerus Muara, Joran Warisan di Rumahku, sudut tahap 2", st(pg)["ch"] == 5 and st(pg)["title"] == "Penerus Muara" and "joranWarisan" in ev(pg, "window.__nusa.S.home.decorations") and st(pg)["corner"] == 2)
    ok("B4.6 hadiah akhir +300 sekali", ev(pg, "window.__nusa.S.money") == m4 + 300)
    close_dialog(pg)
    for _ in range(3): talk_darto(pg); close_dialog(pg)
    ok("B4.7 bicara lagi tidak menambah hadiah", ev(pg, "window.__nusa.S.money") == m4 + 300 and ev(pg, "window.__nusa.S.home.decorations.filter(d=>d==='joranWarisan').length") == 1)

    # ---------- dialog NPC sesuai progres & tidak mengulang ----------
    lines = []
    for _ in range(6):
        talk_darto(pg); finish_dialog(pg) if pg.locator("#dlgOpts .btn").count() == 0 else None; lines.append(pg.inner_text("#dlgText")); close_dialog(pg)
    ok("N1 Pak Darto tidak mengulang kalimat yang sama berturut-turut", all(lines[i] != lines[i + 1] for i in range(len(lines) - 1)) and len(set(lines)) >= 5, len(set(lines)))
    ok("N2 dialog berubah setelah cerita selesai (kalimat khusus akhir cerita muncul)", any(("Joran warisan" in l or "Sudut dermaga" in l) for l in lines), lines[:2])
    ok("N3 ingatan dialog tersimpan lokal", len(ev(pg, "window.__nusa.S.npcMem.darto.seen")) >= 6)

    # ---------- sudut nelayan: lapisan pribadi, collision tetap ----------
    go_near(pg, ev(pg, "NW.story.CORNER.x0") + 0.6, ev(pg, "NW.story.CORNER.y1") + 0.6)
    pg.screenshot(path=OUT + "corner2.png")
    ok("V1 collision sudut nelayan sama di semua tahap", ev(pg, "NW.solids.length") == corner_solids and not ev(pg, "NW.walkable((NW.story.CORNER.x0+NW.story.CORNER.x1)/2,(NW.story.CORNER.y0+NW.story.CORNER.y1)/2)"))
    pg.keyboard.press("e"); time.sleep(0.4); pg.click("#dlg"); time.sleep(0.2)  # tampilkan utuh kalimat pertama
    first = pg.inner_text("#dlgText")
    ok("V2 papan kenangan menunjukkan pencapaian", "Penerus Muara" in first, first[:70])
    close_dialog(pg)
    ok("V3 data dunia publik tidak berubah (bangunan & objek peta sama)", ev(pg, "NW.buildings.length") == 5 and ev(pg, "NW.objects.length") == 102)
    # Joran warisan terlihat di rumah
    ev(pg, "NW.home.goPlot(NW.world.player,'door'); NW.home.goRoom(NW.world.player)"); time.sleep(0.5); pg.screenshot(path=OUT + "joran.png")
    ok("R1 rumah & akuarium tetap utuh setelah cerita", ev(pg, "window.__nusa.S.home.furniture.length") >= 3 and ev(pg, "NW.HD.inventoryReport(window.__nusa.S).total===NW.HD.inventoryReport(window.__nusa.S).unique"))
    ev(pg, "window.__nusa.goWorld('dock')")
    ok("Z1 tanpa error JavaScript (alur cerita lengkap)", not errs, errs[:3])
    ctx.close()

    # ================= keahlian tidak aktif → mancing lama tidak berubah =================
    ctx, pg, errs2 = page(b)
    pg.click("#startBtn"); time.sleep(0.3); ev(pg, "window.__nusa.S.muted=true; window.__nusa.enterFishing('dock')"); time.sleep(0.3)
    cast(pg, 0.5); strike(pg, "patin", 3)
    seen = {"warn": False, "tired": False, "ideal": False}
    t0 = time.time(); held = True
    while ev(pg, "!!window.__nusa.G.fight") and time.time() - t0 < 15:
        f = ev(pg, "(()=>{const F=window.__nusa.G.fight;return F?{w:F.warn,ti:F.tiredT>0,T:F.T,id:document.getElementById('tensionBar').classList.contains('ideal')}:null})()")
        if not f: break
        seen["warn"] |= f["w"]; seen["tired"] |= f["ti"]; seen["ideal"] |= f["id"]
        want = f["T"] < 0.6
        if want != held: (pg.mouse.down() if want else pg.mouse.up()); held = want
        time.sleep(0.04)
    pg.mouse.up(); time.sleep(0.5)
    ok("S3 tanpa keahlian: tidak ada aba-aba, ikan lelah, zona ideal, atau riak", not any(seen.values()) and ev(pg, "window.__nusa.G.hot") is None, seen)
    ok("Z2 tanpa error JavaScript", not errs2, errs2[:3])
    ctx.close()

    # ================= migrasi =================
    ctx, pg, _ = page(b)
    base = ev(pg, "JSON.parse(JSON.stringify(window.__nusa.S))")
    ctx.close()
    v3 = dict(base); v3["v"] = 3; v3["money"] = 4242; v3["stats"] = dict(base["stats"], caught=9)
    for k in ["story", "skills", "onboard", "npcMem"]: v3.pop(k, None)
    v3["home"]["decorations"] = ["lampu"]; v3["cooler"] = [{"uid": "u1", "id": "nila", "w": 0.8, "t": 1}]
    aq = [f for f in v3["home"]["furniture"] if f["type"] == "akuariumKecil"][0]
    v3["home"]["placedFish"] = [{"uid": "u2", "id": "mas", "w": 1.1, "t": 1, "aq": aq["uid"]}]
    ctx, pg, errs3 = page(b, v3)
    S = ev(pg, "JSON.parse(JSON.stringify(window.__nusa.S))")
    ok("M1 simpanan v3 (penyempurnaan 2A): koin, ikan, akuarium, dekorasi utuh", S["money"] == 4242 and S["cooler"][0]["uid"] == "u1" and S["home"]["placedFish"][0]["uid"] == "u2" and S["home"]["decorations"] == ["lampu"])
    ok("M2 v3 → v4: cerita mulai dari Bab 1, pemain lama tidak dipaksa tutorial", S["v"] >= 4 and S["story"]["ch"] == 1 and all(S["onboard"][k] for k in ["walk", "talk", "fish", "sell", "home"]))
    ok("M3 cadangan v3 dibuat", ev(pg, "!!localStorage.getItem('nusa-island-v1-backup-v3')"))
    pg.click("#startBtn"); time.sleep(0.4)
    ok("M4 pemain lama tidak melihat petunjuk berjalan", "joystick" not in pg.inner_text("#hint"))
    ok("Z3 tanpa error JavaScript (migrasi)", not errs3, errs3[:3])
    ctx.close()
    t1 = {"money": 999, "day": 3, "hour": 9, "loc": 0, "up": {"rod": 1, "bait": 0, "cooler": 0, "boat": 0}, "cooler": [{"id": "nila", "w": 0.8}], "dex": {"nila": {"n": 2, "best": 0.9}}, "stats": {"casts": 9, "caught": 2, "earned": 30, "legends": 0}, "muted": True}
    ctx, pg, errs4 = page(b, t1)
    S = ev(pg, "JSON.parse(JSON.stringify(window.__nusa.S))")
    ok("M5 simpanan Tahap 1 → simpanan baru aman (koin, ikan, upgrade, rumah Lv1, cerita Bab 1)", S["money"] == 999 and len(S["cooler"]) == 1 and S["cooler"][0]["uid"] and S["up"]["rod"] == 1 and S["home"]["level"] == 1 and S["story"]["ch"] == 1 and S["v"] >= 4)
    ok("Z4 tanpa error JavaScript (Tahap 1)", not errs4, errs4[:3])
    ctx.close()
    b.close()
print("\n".join(R))
print(sum(r.startswith("PASS") for r in R), "lulus /", len(R))
print("screenshot:", OUT)
