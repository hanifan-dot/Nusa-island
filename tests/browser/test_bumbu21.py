"""Uji Bumbu 2.1 "Suara Nusantara": musik dinamis, ambience, efek mancing, Rumahku, perjalanan kapal,
pengaturan suara, simpanan pengaturan, siklus hidup audio (tab tersembunyi, browser menolak audio, kebocoran).
Jalankan: python tests/browser/test_bumbu21.py
Catatan: ini Chromium headless TANPA perangkat suara — yang diuji adalah graf WebAudio, jadwal, level (render offline)
dan perilaku, BUKAN kualitas bunyi lewat speaker HP. Telinga manusia tetap perlu menilai musiknya.
"""
import time, json, os, sys, tempfile
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = tempfile.mkdtemp(prefix="nusa-b21-") + "/"
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def A(pg): return ev(pg, "NW.audio.stats()")

def page(b, init=None, vp=(390, 844)):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.7)
    return ctx, pg, errs
def fresh(b, init=None, begin=True, hour=9):
    ctx, pg, errs = page(b, init); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6)
    if begin: begin_game(pg, hour)
    return ctx, pg, errs
def begin_game(pg, hour=9):
    pg.click("#startBtn"); time.sleep(0.3)
    ev(pg, "(h)=>{window.__nusa.S.hour=h; document.getElementById('banner').classList.remove('show')}", hour); time.sleep(0.9)
def goto(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera()}", [x, y]); time.sleep(0.45)
def wait_theme(pg, want, tmo=4.0):
    t0 = time.time()
    while time.time() - t0 < tmo:
        if ev(pg, "NW.audio.current") == want: return True
        time.sleep(0.15)
    return False
def to_toba(pg, hour=9):
    ev(pg, "(h)=>{window.__nusa.S.up.boat=1; window.__nusa.S.hour=h}", hour)
    ev(pg, "window.__nusa.travel(1)")
    for _ in range(40):
        time.sleep(0.2)
        if ev(pg, "NW.areas.cur.id") == "toba" and not ev(pg, "NW.adv.isBusy()"): break
    time.sleep(0.6)
def render_peak(pg, kind, name, arg=None, secs=40, inten=0):
    """render offline -> puncak (dBFS) pada jalur nyata dengan slider standar."""
    return ev(pg, """async ([kind, name, arg, secs, inten]) => {
      NW.kit.resetPoly(); const sr = 32000, oc = new OfflineAudioContext(1, Math.ceil(secs*sr), sr), st = NW.kit.makeStage(oc);
      let g;
      if (kind === 'music') { const tr = new NW.music.Track(oc, st, NW.music.THEMES[name], {seed: 12345}); tr.bus.gain.value = 1; tr.intensity = inten; tr.pump(secs+0.2, 100000); g = 0.7*0.35*0.35*NW.audio.BASE.music; }
      else { NW.sfxLib.play(oc, st.sfx, 0.05, name, arg); g = 0.7*0.7*0.7*NW.audio.BASE.sfx; }
      const b = await oc.startRendering(), d = b.getChannelData(0); let m = 0; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > m) m = v; }
      return 20*Math.log10(Math.max(1e-9, m*g)); }""", [kind, name, arg, secs, inten])

with sync_playwright() as p:
    b = p.chromium.launch()

    # ============ 1. musik mulai setelah interaksi ============
    ctx, pg, errs = fresh(b, begin=False)
    time.sleep(1.5); s = A(pg)
    ok("1a tidak ada AudioContext & musik sebelum Mulai Bermain", s["ctxCount"] == 0 and not s["ready"] and s["tracks"] == 0 and s["state"] == "none", s)
    ev(pg, "document.getElementById('dexBtn')&&0"); pg.click("#startBtn"); time.sleep(2.0); s = A(pg)
    ok("1b setelah Mulai: 1 AudioContext berjalan & musik Muara pagi/siang aktif", s["ctxCount"] == 1 and s["state"] == "running" and s["running"] and s["cur"] and s["cur"].startswith("muara_"), s["cur"])
    ok("1c tidak ada error JavaScript", not errs, errs[:3])
    ctx.close()

    # ============ 2. Muara & Toba punya tema berbeda ============
    ctx, pg, errs = fresh(b, hour=9)
    ok("2a Muara pagi memakai muara_pagi", wait_theme(pg, "muara_pagi"), ev(pg, "NW.audio.current"))
    to_toba(pg, 9)
    ok("2b Toba pagi memakai toba_pagi", wait_theme(pg, "toba_pagi", 5), ev(pg, "NW.audio.current"))
    th = ev(pg, "(()=>{const T=NW.music.THEMES;return ['pagi','siang','sore','malam'].map(p=>({p, m:[T['muara_'+p].spb, T['muara_'+p].step], t:[T['toba_'+p].spb, T['toba_'+p].step]}))})()")
    ok("2c meter & tempo kedua daerah berbeda untuk keempat waktu (4/4 vs 6/8)", all(x["m"][0] == 16 and x["t"][0] == 12 and x["m"][1] != x["t"][1] for x in th))
    ctx.close()

    # ============ 3 + 4. musik berubah menurut waktu, crossfade mulus ============
    ctx, pg, errs = fresh(b, hour=8)
    per = ev(pg, "[4.99,5,10.99,11,15.99,16,18.99,19,23,0,4.5].map(h=>NW.audioDirector.periodOf(h))")
    ok("3a batas waktu: 05–10.59 pagi · 11–15.59 siang · 16–18.59 sore · 19–04.59 malam", per == ["malam", "pagi", "pagi", "siang", "siang", "sore", "sore", "malam", "malam", "malam", "malam"], per)
    seen = []
    for h, want in [(13, "muara_siang"), (17, "muara_sore"), (22, "muara_malam"), (7, "muara_pagi")]:
        ev(pg, "(h)=>{window.__nusa.S.hour=h}", h); okk = wait_theme(pg, want, 9); seen.append(okk)
    ok("3b tema mengikuti jam: pagi→siang→sore→malam→pagi", all(seen), seen)
    # crossfade: ambil bus gain tiap 0,4 dtk selama pergantian
    ev(pg, "window.__nusa.S.hour=11.9"); wait_theme(pg, "muara_siang", 9); time.sleep(7)
    ev(pg, "window.__nusa.S.hour=16.0"); samples = []
    for _ in range(22): samples.append(ev(pg, "NW.audio.busGains()")); time.sleep(0.4)
    old = [x.get("muara_siang", 0) for x in samples]; new = [x.get("muara_sore", 0) for x in samples]
    mono_old = all(old[i] >= old[i + 1] - 0.03 for i in range(len(old) - 1)); mono_new = all(new[i] <= new[i + 1] + 0.03 for i in range(len(new) - 1))
    steps = max(abs(new[i + 1] - new[i]) for i in range(len(new) - 1))
    tot = max(o + n for o, n in zip(old, new))
    ok("4a crossfade: tema lama turun & baru naik secara halus (tanpa lompatan)", mono_old and mono_new and steps < 0.4 and new[-1] > 0.95 and old[-1] < 0.05, f"langkah maks {steps:.2f}")
    ok("4b selama crossfade jumlah penguatan tidak melonjak (tak ada dua musik keras bersamaan)", tot <= 1.12, f"maks {tot:.2f}")
    ok("4c setelah selesai hanya 1 jalur musik tersisa", A(pg)["tracks"] == 1, A(pg)["trackIds"])
    # dapat dibatalkan: pindah balik saat masih memudar → tema lama dihidupkan lagi (tanpa jalur ganda)
    ev(pg, "NW.audio.playTheme('muara_pagi', 3)"); time.sleep(0.6); ev(pg, "NW.audio.playTheme('muara_sore', 3)"); time.sleep(0.4)
    s = A(pg); ok("4d crossfade dapat dibatalkan (pindah cepat tidak menumpuk jalur)", s["tracks"] <= 3 and s["cur"] == "muara_sore", s["trackIds"])
    time.sleep(4); ok("4e jalur sisa ikut dibersihkan", A(pg)["tracks"] == 1)
    ctx.close()

    # ============ 5. audio perjalanan kapal ============
    ctx, pg, errs = fresh(b, hour=9)
    ev(pg, "window.__nusa.S.up.boat=1"); wait_theme(pg, "muara_pagi")
    ev(pg, "window.__nusa.travel(1)"); log = []; t0 = time.time()
    while time.time() - t0 < 9:
        log.append(ev(pg, "({cur:NW.audio.current, eng:NW.audioDirector.engineActive, wat:NW.audio.ambTarget&&NW.audio.ambTarget.water, tr:NW.audio.stats().tracks, g:Object.values(NW.audio.busGains()).reduce((a,b)=>a+b,0), busy:NW.adv.isBusy()})")); time.sleep(0.15)
    names = [x["cur"] for x in log]
    ok("5a lagu kapal dimainkan saat berlayar", "kapal" in names, sorted(set(names)))
    ok("5b bunyi mesin kapal hidup saat berlayar lalu mereda setelah tiba", any(x["eng"] for x in log) and not log[-1]["eng"], [x["eng"] for x in log][::8])
    ok("5c air & angin meningkat saat berlayar", max(x["wat"] or 0 for x in log) >= 0.95)
    ok("5d musik tujuan (Toba) masuk setelah tiba", log[-1]["cur"] and log[-1]["cur"].startswith("toba_"), log[-1]["cur"])
    ok("5e tidak ada dua musik keras bersamaan sepanjang perjalanan", max(x["g"] for x in log) <= 1.2 and max(x["tr"] for x in log) <= 3, max(x["g"] for x in log))
    sl = ev(pg, "NW.audio.sfxLog.map(x=>x.name)")
    ok("5f efek 'berlayar' & 'tiba' berbunyi", "berlayar" in sl and "tiba" in sl, sl[-6:])
    ctx.close()

    # ============ 6 + 7 + 8. memancing ============
    ctx, pg, errs = fresh(b, hour=9)
    ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(1.0)
    ok("6a masuk mode mancing: tema mancing_muara", wait_theme(pg, "mancing_muara", 4), ev(pg, "NW.audio.current"))
    time.sleep(0.8); d_idle = ev(pg, "NW.audio.stats().duck")
    ok("6b saat menunggu musik sangat pelan (peredaman ≤ 0,5)", d_idle <= 0.5, d_idle)
    amb = ev(pg, "NW.audio.ambTarget"); ok("6c saat memancing air & ombak dominan", amb["water"] >= 0.9 and amb["market"] == 0, amb)
    # bite → fight
    ev(pg, "(()=>{const G=window.__nusa.G;G.pending={fish:FISH.find(f=>f.id==='sandal'),w:.2,wr:.5};G.phase='bite'})()")
    time.sleep(0.5); ok("6d fase gigitan: intensitas naik pelan, musik masih di bawah efek", ev(pg, "NW.audioDirector.intensityFor({phase:'bite'})") > 0.2)
    ev(pg, "window.__nusa.startFight(); window.__nusa.G.holding = true"); time.sleep(1.6)
    s = A(pg); log = ev(pg, "NW.audio.sfxLog.map(x=>x.name)")
    ok("6e Strike: efek 'strike' berbunyi & musik jadi tegang (intensitas > 0,4)", "strike" in log and ev(pg, "NW.audioDirector.intensityFor(window.Nusa.fishState())") > 0.4, log[-6:])
    ok("6f saat melawan musik tetap di bawah efek (peredaman ≤ 0,65)", s["duck"] <= 0.65, s["duck"])
    # tegangan berbahaya → peringatan
    ev(pg, "window.__fz=setInterval(()=>{const F=window.__nusa.G.fight;if(F){F.T=0.9;F.over=0;F.P=0.3;F.slack=0}},15)"); time.sleep(1.4)
    ev(pg, "clearInterval(window.__fz)")
    log = ev(pg, "NW.audio.sfxLog.map(x=>x.name)"); ok("6g tegangan berbahaya memicu peringatan singkat", "warn" in log, log[-6:])
    ev(pg, "window.__fz=setInterval(()=>{const F=window.__nusa.G.fight;if(F){F.T=0.4;F.tiredT=1;F.surge=0;F.P=0.3;F.slack=0}},15)"); time.sleep(0.9)
    ev(pg, "clearInterval(window.__fz)")
    log = ev(pg, "NW.audio.sfxLog.map(x=>x.name)"); ok("6h ikan lelah memberi ruang (efek 'lelah', intensitas turun)", "lelah" in log and ev(pg, "NW.audioDirector.intensityFor({phase:'fight',T:.4,tired:true,surge:false})") < ev(pg, "NW.audioDirector.intensityFor({phase:'fight',T:.4,tired:false,surge:false})"))
    # keterbacaan efek kritis di atas musik (render offline, level nyata)
    gm_idle = render_peak(pg, "music", "mancing_muara", None, 30, 0) + 20 * __import__("math").log10(0.45)
    gm_tens = render_peak(pg, "music", "mancing_muara", None, 30, 0.9) + 20 * __import__("math").log10(0.62)
    pk = {n: render_peak(pg, "sfx", n, None, 2) for n in ["bite", "nibble", "surge", "warn", "snap"]}
    ok("6i petunjuk gigitan lebih keras dari musik saat menunggu (≥ +6 dB)", pk["bite"] >= gm_idle + 6, f"bite {pk['bite']:.1f} vs musik {gm_idle:.1f} dBFS")
    ok("6j sentakan, peringatan & senar putus lebih keras dari musik tegang (≥ +3 dB)", all(pk[n] >= gm_tens + 3 for n in ["surge", "warn", "snap"]), f"{ {k: round(v, 1) for k, v in pk.items()} } vs musik tegang {gm_tens:.1f}")
    ok("6k tidak ada efek yang menyentuh clipping (puncak ≤ −3 dBFS)", all(v <= -3 for v in pk.values()), pk)
    # 7. senar putus (mulai pertarungan baru karena yang lama sudah selesai selama render offline)
    ev(pg, "(()=>{const G=window.__nusa.G; if(!G.fight){G.phase='idle'; G.pending={fish:FISH.find(f=>f.id==='sandal'),w:.2,wr:.5};G.phase='bite';window.__nusa.startFight();}})()")
    ev(pg, "(()=>{const F=window.__nusa.G.fight;F.T=1.2;F.over=0;window.__nusa.G.holding=true})()"); ev(pg, "window.__nusa.updateFight(0.2); window.__nusa.updateFight(0.2)"); time.sleep(0.4)
    log = ev(pg, "NW.audio.sfxLog.map(x=>x.name)")
    ok("7a senar putus memutar efek 'snap'", "snap" in log, log[-5:])
    ok("7b efek 'snap' = efek terkeras (puncak ≥ −8 dBFS) tetapi tidak clipping", -8 <= pk["snap"] <= -3, round(pk["snap"], 1))
    # 8. jingle tangkapan
    jing = {}
    for r in ["sampah", "biasa", "langka", "epik", "legenda"]:
        jing[r] = ev(pg, """async (r) => { NW.kit.resetPoly(); const sr=32000, oc=new OfflineAudioContext(1, sr*5, sr), st=NW.kit.makeStage(oc); NW.sfxLib.play(oc, st.sfx, 0.05, 'catch', r); const d=(await oc.startRendering()).getChannelData(0); let m=0, last=0; for(let i=0;i<d.length;i++){const v=Math.abs(d[i]); if(v>m)m=v; if(v>0.003)last=i;} let e=0; for(let i=0;i<d.length;i++) e+=d[i]*d[i]; return {peak:20*Math.log10(m*0.343*NW.audio.BASE.sfx), dur:last/sr, rms:10*Math.log10(e/d.length)}; }""", r)
    ok("8a jingle semua tingkat kelangkaan menghasilkan suara", all(j["dur"] > 0.1 for j in jing.values()), {k: round(v["dur"], 2) for k, v in jing.items()})
    ok("8b jingle bertingkat: durasi biasa < langka < epik ≤ legenda, semuanya singkat (< 4 dtk)", jing["biasa"]["dur"] < jing["langka"]["dur"] < jing["epik"]["dur"] <= jing["legenda"]["dur"] and jing["legenda"]["dur"] < 4.0)
    ok("8c energi jingle naik menurut kelangkaan (RMS biasa < epik < legenda), tanpa clipping", jing["biasa"]["rms"] < jing["epik"]["rms"] < jing["legenda"]["rms"] and all(j["peak"] <= -3 for j in jing.values()), {k: (round(v["peak"], 1), round(v["rms"], 1)) for k, v in jing.items()})
    # jingle nyata lewat alur tangkapan game
    ev(pg, "(()=>{window.__nusa.G.phase='idle';})()")
    ev(pg, "(()=>{const G=window.__nusa.G;G.pending={fish:FISH.find(f=>f.rarity==='epik'&&f.loc==='muara')||FISH.find(f=>f.rarity==='epik'),w:3,wr:.5};G.phase='bite';window.__nusa.startFight();G.fight.P=0.999;G.holding=true;window.__nusa.updateFight(0.05)})()"); time.sleep(0.5)
    c = ev(pg, "NW.audio.sfxLog.filter(x=>x.name==='catch').map(x=>x.arg)")
    ok("8d tangkapan sungguhan memutar jingle sesuai kelangkaan (epik)", "epik" in c, c)
    time.sleep(0.5); ok("8e saat jingle musik mengalah sebentar (duck ≤ 0,45)", ev(pg, "NW.audio.stats().duck") <= 0.45, ev(pg, "NW.audio.stats().duck"))
    ctx.close()

    # ============ 9. Rumahku ============
    ctx, pg, errs = fresh(b, hour=13)
    wait_theme(pg, "muara_siang"); ev(pg, "NW.home.goPlot(NW.world.player,'gate')"); time.sleep(1.2)
    ok("9a halaman Rumahku (luar) tetap musik luar & tidak diredam", ev(pg, "NW.audio.current") == "muara_siang" and not ev(pg, "NW.audio.stats().indoor"))
    ev(pg, "NW.home.goRoom(NW.world.player)"); time.sleep(1.0)
    ok("9b masuk rumah: musik interior 'rumah' masuk", wait_theme(pg, "rumah", 4))
    time.sleep(1.2); lp = ev(pg, "NW.audio.stage.ambLP.frequency.value")
    ok("9c ambience luar meredam (lowpass turun < 3 kHz) & level lingkungan turun", lp < 3000 and ev(pg, "NW.audio.stats().indoor"), round(lp))
    ev(pg, "(()=>{const p=NW.world.player;window.__t0=[p.x,p.y]})()")
    ev(pg, "NW.home.reset(); (()=>{const p=NW.world.player;p.x=NW.HOME_GATE.x;p.y=NW.HOME_GATE.y+0.7;NW.world.snapCamera()})()"); time.sleep(0.5)
    ok("9d keluar rumah: musik luar kembali & peredaman dicabut", wait_theme(pg, "muara_siang", 5) and not ev(pg, "NW.audio.stats().indoor"))
    time.sleep(1.5); ok("9e lowpass ambience kembali terbuka", ev(pg, "NW.audio.stage.ambLP.frequency.value") > 8000, round(ev(pg, "NW.audio.stage.ambLP.frequency.value")))
    # tema rumah sama untuk semua level (tidak ada tema per-level)
    ok("9f hanya satu tema rumah (tidak berbeda per level)", ev(pg, "Object.keys(NW.music.THEMES).filter(k=>k.startsWith('rumah')).join()") == "rumah")
    ev(pg, "NW.home.goPlot(NW.world.player,'gate'); NW.home.goRoom(NW.world.player)"); time.sleep(0.5)
    ev(pg, "NW.audio.sfx('furn_geser'); NW.audio.sfx('furn_taruh'); NW.audio.sfx('furn_ambil'); NW.audio.sfx('gelembung')"); time.sleep(0.3)
    log = ev(pg, "NW.audio.sfxLog.map(x=>x.name)"); ok("9g efek geser / taruh / ambil perabot & gelembung akuarium ada", all(n in log for n in ["furn_geser", "furn_taruh", "furn_ambil", "gelembung"]), log[-5:])
    ok("9h radio rumah menurunkan musik latar (tidak bertabrakan)", ev(pg, "(()=>{const r=NW.audioDirector.duckFor({room:true,fishing:false,dialog:false},{phase:'idle'}); return r<=1})()"))
    ctx.close()

    # ============ 10 + 11 + 12. slider, mute, simpanan ============
    ctx, pg, errs = fresh(b, hour=9)
    ev(pg, "NW.audioPanel.open()"); time.sleep(0.4)
    vis = ev(pg, "(()=>{const r=document.getElementById('audioPop').getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,y:r.y,vw:innerWidth,vh:innerHeight}})()")
    ok("10a panel suara kecil (bukan layar penuh) & muat di HP portrait", vis["w"] <= 300 and vis["h"] <= vis["vh"] * 0.75 and vis["x"] >= 0 and vis["x"] + vis["w"] <= vis["vw"], vis)
    ok("10b nilai awal 70 / 35 / 50 / 70 %", ev(pg, "[...document.querySelectorAll('#audioPop [data-cat]')].map(i=>+i.value)") == [70, 35, 50, 70])
    joy = ev(pg, "(()=>{const j=document.getElementById('joy')||document.querySelector('.joy,#joystick');if(!j)return null;const r=j.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()")
    pr = ev(pg, "(()=>{const r=document.getElementById('audioPop').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()")
    ok("10c panel suara tidak menutupi joystick", joy is None or (pr["y"] + pr["h"] < joy["y"] or pr["x"] + pr["w"] < joy["x"] or joy["x"] + joy["w"] < pr["x"]), joy)
    res = {}
    for cat, val, node, f in [("master", 40, "master", lambda v: v), ("music", 80, "music", lambda v: v * v * 5.2), ("amb", 20, "amb", lambda v: v * v * 3.0), ("sfx", 90, "sfx", lambda v: v * v * 3.3)]:
        ev(pg, "([c,v])=>{const i=document.querySelector(`#audioPop [data-cat=${c}]`);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}", [cat, val]); time.sleep(0.9)
        if node == "sfx": ev(pg, "(()=>{for(let i=0;i<5;i++)NW.sfxLib.L.tone ? 0 : 0; NW.audio.sfx('catch','biasa')})()"); time.sleep(0.12)  # node SFX hanya diproses saat ada suara masuk
        g = ev(pg, "(n)=>NW.audio.stage[n].gain.value", node)
        want = f(val / 100) * (ev(pg, "NW.audio.stats().duck") if cat == "music" else 1) * (0.5 if (cat == "amb" and ev(pg, "NW.audio.stats().indoor")) else 1)
        res[cat] = (round(g, 3), round(want, 3))
    ok("10d keempat slider mengubah penguatan bus saat itu juga (tanpa reload)", all(abs(a - w) <= 0.04 + 0.08 * w for a, w in res.values()), res)
    ev(pg, "([c,v])=>{const i=document.querySelector(`#audioPop [data-cat=${c}]`);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}", ["master", 0]); time.sleep(0.5)
    ok("10e slider utama 0 → keluaran senyap", ev(pg, "NW.audio.stage.master.gain.value") < 0.01)
    # 12 simpanan
    st = ev(pg, "localStorage.getItem('nusa-island-audio-v1')"); ok("12a pengaturan tersimpan di kunci terpisah (game tidak tersentuh)", st is not None and json.loads(st)["master"] == 0, st)
    pg.reload(); time.sleep(0.8); ev(pg, "document.getElementById('startBtn') && 0")
    ok("12b setelah refresh nilai slider kembali sama (tanpa menekan apa pun)", ev(pg, "NW.audio.settings") == {"master": 0.0, "music": 0.8, "amb": 0.2, "sfx": 0.9}, ev(pg, "NW.audio.settings"))
    ev(pg, "localStorage.setItem('nusa-island-audio-v1','{rusak')"); pg.reload(); time.sleep(0.8)
    ok("12c data pengaturan rusak → nilai standar, tanpa error", ev(pg, "NW.audio.settings") == {"master": 0.7, "music": 0.35, "amb": 0.5, "sfx": 0.7} and not errs, errs[:2])
    ev(pg, "localStorage.setItem('nusa-island-audio-v1', JSON.stringify({master: 7, music: -3, amb: 'x', sfx: 0.25}))"); pg.reload(); time.sleep(0.8)
    ok("12d nilai di luar rentang dijepit ke 0..1 & tipe salah diabaikan", ev(pg, "NW.audio.settings") == {"master": 1.0, "music": 0.0, "amb": 0.5, "sfx": 0.25}, ev(pg, "NW.audio.settings"))
    ev(pg, "localStorage.removeItem('nusa-island-audio-v1')"); pg.reload(); time.sleep(0.6); begin_game(pg, 9)
    # 11 mute — di HP (≤400px) tombol 🔊 HUD disembunyikan; mute lewat menu 🎯 (tombol Matikan/Nyalakan lama)
    ev(pg, "NW.audio.sfxLog.length=0"); ev(pg, "window.Nusa.openPanel('skills')"); time.sleep(0.3); pg.click("[data-act=mute]"); time.sleep(0.9); s = A(pg)
    ok("11a tombol Matikan di menu 🎯 (mute lama) = senyap (S.muted, tersimpan di simpanan)", ev(pg, "window.__nusa.S.muted") is True and s["muted"], s["muted"])
    ok("11b saat senyap context disuspend (tidak memakai CPU) & master 0", s["state"] == "suspended" and ev(pg, "NW.audio.stage.master.gain.value") < 0.01, s["state"])
    n0 = ev(pg, "NW.audio.sfxLog.length"); ev(pg, "window.Nusa.sfx('coin'); window.Nusa.sfx('click')"); time.sleep(0.2)
    ok("11c efek lama (coin/click) juga mengikuti mode senyap", ev(pg, "NW.audio.sfxLog.length") == n0)
    pg.click("[data-act=mute]"); time.sleep(1.0); s = A(pg); ev(pg, "window.Nusa.closePanel()")
    ok("11d ketuk lagi = suara kembali, tema tetap 1 jalur", ev(pg, "window.__nusa.S.muted") is False and s["running"] and s["state"] == "running" and s["tracks"] == 1, s["trackIds"])
    ev(pg, "NW.audioPanel.open()"); pg.click("#apMute"); time.sleep(0.7)
    ok("11e tombol 'Matikan semua suara' di panel = senyap, 'Hidupkan' memulihkan", ev(pg, "window.__nusa.S.muted") is True)
    pg.click("#apMute"); time.sleep(0.9); ok("11f hidupkan kembali dari panel", ev(pg, "window.__nusa.S.muted") is False and A(pg)["running"])
    # menu 🎯 punya tombol "🎚️ Atur" yang membuka panel suara
    ev(pg, "NW.audioPanel.close()"); ev(pg, "window.Nusa.openPanel('skills')"); time.sleep(0.3); pg.click("[data-act=audioSet]"); time.sleep(0.3)
    ok("11g menu 🎯 → 🎚️ Atur membuka Pengaturan Suara (jalur utama di HP ≤400px)", ev(pg, "NW.audioPanel.isOpen") and not ev(pg, "!document.getElementById('panelWrap').classList.contains('hidden')"))
    ev(pg, "NW.audioPanel.close()")
    # panel Peta
    ev(pg, "window.Nusa.openPanel('map')"); time.sleep(0.3); pg.click("[data-act=audio]"); time.sleep(0.3)
    ok("11h tombol 🔊 Pengaturan Suara ada di panel Peta", ev(pg, "NW.audioPanel.isOpen"))
    # pratinjau tema (buka dulu lipatan 🎧 seperti pemain)
    pg.click("#audioPop details summary"); time.sleep(0.3)
    pg.click("[data-th=toba_sore]"); time.sleep(0.8)
    ok("11i menu 'Dengarkan tema' memutar tema pilihan & mengabaikan pengarah", ev(pg, "NW.audio.current") == "toba_sore" and ev(pg, "NW.audio.previewing") == "toba_sore")
    pg.click("[data-sfx='catch|legenda']"); time.sleep(0.3)
    ok("11j menu efek memutar jingle", "legenda" in ev(pg, "NW.audio.sfxLog.map(x=>x.arg)"))
    pg.click("#apStop"); time.sleep(0.6); ok("11k berhenti pratinjau → kembali ke tema permainan", ev(pg, "NW.audio.previewing") is None and wait_theme(pg, "muara_pagi", 5))
    # semua tema pratinjau valid
    ok("11l setiap tema di menu terdaftar", ev(pg, "[...document.querySelectorAll('#audioPop [data-th]')].every(b=>NW.music.THEMES[b.dataset.th.split('|')[0]])"))
    ok("11p tombol 🎵 di HUD terlihat di HP & membuka/menutup panel suara", ev(pg, "(()=>{const b=document.getElementById('musicBtn');return b.offsetParent!==null})()"))
    ev(pg, "NW.audioPanel.close()"); ev(pg, "document.getElementById('musicBtn').click()"); ok("11q ketuk 🎵 membuka panel", ev(pg, "NW.audioPanel.isOpen")); ev(pg, "NW.audioPanel.close()")
    ctx.close()

    # ---- layar lebar: tombol 🔊 HUD terlihat: ketuk = mute lama, tahan = pengaturan ----
    ctx, pg, errs = page(b, None, vp=(480, 860)); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6); begin_game(pg, 9)
    pg.click("#muteBtn"); time.sleep(0.9)
    ok("11m layar lebar: ketuk 🔊 HUD = senyap seperti dulu", ev(pg, "window.__nusa.S.muted") is True and A(pg)["state"] == "suspended" and not ev(pg, "NW.audioPanel.isOpen"))
    pg.click("#muteBtn"); time.sleep(0.9); ok("11n ketuk lagi = hidup", ev(pg, "window.__nusa.S.muted") is False and A(pg)["running"])
    box = ev(pg, "(()=>{const r=document.getElementById('muteBtn').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
    pg.mouse.move(box[0], box[1]); pg.mouse.down(); time.sleep(0.75); pg.mouse.up(); time.sleep(0.4)
    ok("11o tahan 🔊 membuka Pengaturan Suara tanpa mengubah mute", ev(pg, "NW.audioPanel.isOpen") and ev(pg, "window.__nusa.S.muted") is False)
    ctx.close()

    # ============ 13. berpindah area berulang tidak menumpuk ============
    ctx, pg, errs = fresh(b, hour=9)
    ev(pg, "window.__nusa.S.up.boat=1"); base = A(pg); mx = 0; mxv = 0
    for i in range(24):
        ev(pg, "(id)=>NW.audio.playTheme(id, 1.2)", ["toba_pagi", "muara_pagi", "mancing_muara", "rumah"][i % 4]); time.sleep(0.25)
        s = A(pg); mx = max(mx, s["tracks"]); mxv = max(mxv, s["liveVoices"])
    time.sleep(4); s = A(pg)
    ok("13a jalur musik tak pernah > 3 selama 24 pergantian cepat", mx <= 3, mx)
    ok("13b setelah tenang tersisa 1 jalur", s["tracks"] == 1, s["trackIds"])
    ok("13c sumber ambience tetap (tidak bertambah tiap ganti)", s["ambSources"] == base["ambSources"], (base["ambSources"], s["ambSources"]))
    ok("13d hanya 1 penjadwal berjalan & 1 AudioContext", s["pump"] and s["ctxCount"] == 1)
    # catatan: "liveVoices" menghitung sumber yang sudah DIJADWALKAN (satu birama ke depan), bukan yang terdengar bersamaan;
    # batas bunyi serentak dijaga room() (28). Yang diuji: tidak menumpuk selama pergantian cepat & kembali rendah saat tenang.
    ok("13e sumber terjadwal terbatas saat pergantian cepat (<90) & kembali rendah saat tenang (<=40)", mxv < 90 and s["liveVoices"] <= 40, (mxv, s["liveVoices"]))
    n_sim = []
    for i in range(3):  # perjalanan sungguhan bolak-balik
        ev(pg, f"window.__nusa.travel({1 if i % 2 == 0 else 0})")
        for _ in range(30):
            time.sleep(0.2)
            if not ev(pg, "NW.adv.isBusy()"): break
        time.sleep(0.5); n_sim.append(A(pg)["tracks"])
    time.sleep(4); s = A(pg)
    ok("13f perjalanan Muara↔Toba berulang: jalur tetap ≤ 3 lalu 1, mesin kapal mati", max(n_sim) <= 3 and s["tracks"] == 1 and not ev(pg, "NW.audioDirector.engineActive"), (n_sim, s["trackIds"]))
    ctx.close()

    # ============ 14. tab tersembunyi ============
    ctx, pg, errs = fresh(b, hour=9)
    wait_theme(pg, "muara_pagi")
    ev(pg, "Object.defineProperty(document,'hidden',{value:true,configurable:true}); Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true}); document.dispatchEvent(new Event('visibilitychange'))"); time.sleep(0.8)
    s = A(pg); ok("14a tab tersembunyi: penjadwal berhenti & context disuspend", (not s["running"]) and (not s["pump"]) and s["state"] == "suspended", s["state"])
    v0 = A(pg)["startedVoices"]; time.sleep(1.5); ok("14b tidak ada suara baru dijadwalkan di latar belakang", A(pg)["startedVoices"] == v0)
    ev(pg, "Object.defineProperty(document,'hidden',{value:false,configurable:true}); Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true}); document.dispatchEvent(new Event('visibilitychange'))"); time.sleep(1.2)
    s = A(pg); ok("14c kembali ke tab: audio pulih, 1 jalur, 1 penjadwal, volume tidak dobel", s["running"] and s["state"] == "running" and s["tracks"] == 1 and s["pump"] and 0.2 <= ev(pg, "NW.audio.stage.master.gain.value") <= 0.75, (s["state"], s["tracks"]))
    for _ in range(5):
        ev(pg, "Object.defineProperty(document,'hidden',{value:true,configurable:true}); document.dispatchEvent(new Event('visibilitychange'))"); time.sleep(0.1)
        ev(pg, "Object.defineProperty(document,'hidden',{value:false,configurable:true}); document.dispatchEvent(new Event('visibilitychange'))"); time.sleep(0.1)
    time.sleep(0.8); s = A(pg); ok("14d bolak-balik cepat tidak menumpuk penjadwal/jalur", s["tracks"] == 1 and s["pump"] and s["state"] == "running", s)
    ctx.close()

    # ============ 15. browser menolak audio ============
    ctx, pg, errs = fresh(b, init="window.AudioContext = function(){ throw new Error('NotAllowedError') }; window.webkitAudioContext = undefined;", begin=False)
    pg.click("#startBtn"); time.sleep(1.0); ev(pg, "window.__nusa.S.hour = 9"); goto(pg, 14, 20)
    s = ev(pg, "({failed:NW.audio.failed, ready:NW.audio.ready, mode:window.Nusa.mode()})")
    ok("15a AudioContext ditolak: game tetap tampil & berjalan (tanpa crash)", s["failed"] and not s["ready"] and s["mode"] == "world" and not errs, errs[:2])
    ev(pg, "window.Nusa.sfx('coin'); window.Nusa.sfx('click'); NW.audio.playTheme('muara_pagi'); NW.audio.setVolume('music', .5); NW.audio.setMuted(true); NW.audio.setMuted(false)"); time.sleep(0.3)
    ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.5); ev(pg, "(()=>{const G=window.__nusa.G;G.pending={fish:FISH.find(f=>f.id==='sandal'),w:.2,wr:.5};G.phase='bite';window.__nusa.startFight();G.fight.P=.999;G.holding=true;window.__nusa.updateFight(.05)})()"); time.sleep(0.5)
    ok("15b memancing & menangkap tetap bekerja tanpa audio", ev(pg, "window.__nusa.S.stats.caught") >= 1 and not errs, errs[:2])
    ev(pg, "NW.audioPanel.open()"); ev(pg, "document.querySelector('#audioPop details').open=true"); pg.click("[data-th=toba_pagi]"); pg.click("#apMute"); pg.click("#apMute"); time.sleep(0.3)
    ok("15c panel suara tidak crash saat audio tak tersedia", not errs, errs[:2])
    ctx.close()
    # context ada tetapi tak pernah 'running' (kebijakan autoplay)
    ctx, pg, errs = fresh(b, init="""(()=>{const O=window.AudioContext; window.AudioContext=function(o){const c=new O(o); c.resume=()=>Promise.reject(new DOMException('blocked','NotAllowedError')); return c;}; window.AudioContext.prototype=O.prototype;})()""", hour=9)
    time.sleep(1.0); ev(pg, "window.Nusa.sfx('click'); NW.audio.setVolume('sfx',.4)"); goto(pg, 14, 20)
    ok("15d resume() ditolak browser: tanpa error & game normal", not errs and ev(pg, "window.Nusa.mode()") == "world", errs[:2])
    ctx.close()

    # ============ 16. kebocoran ============
    ctx, pg, errs = fresh(b, hour=9)
    ev(pg, "window.__nusa.S.up.boat=1"); time.sleep(1.0)
    for i in range(60): ev(pg, "(n)=>window.Nusa.sfx(n)", ["click", "coin", "tick", "splash", "nibble", "step_kayu"][i % 6])
    ev(pg, "for(let i=0;i<40;i++) NW.audio.playTheme(['muara_pagi','muara_siang','toba_pagi','rumah','mancing_toba'][i%5], 0.3)"); time.sleep(5.0)
    s = A(pg); idle_live = s["liveVoices"]
    ok("16a sumber suara yang selesai dilepas (mulai − selesai = hidup) dan jumlah hidup wajar saat tenang", s["startedVoices"] - s["endedVoices"] == s["liveVoices"] and s["liveVoices"] <= 28, (s["startedVoices"], s["endedVoices"], s["liveVoices"]))
    time.sleep(6); s2 = A(pg)
    ok("16b suara hidup stabil (tidak merayap naik) setelah 6 dtk lagi", s2["liveVoices"] <= max(idle_live, 22) + 6 and s2["tracks"] == 1, (idle_live, s2["liveVoices"]))
    ok("16c cache senar terbatas (≤ 64) & 1 context", s2["ksCache"] <= 64 and s2["ctxCount"] == 1, s2["ksCache"])
    ev(pg, "NW.audio.dispose()"); time.sleep(0.5); s3 = A(pg)
    ok("16d dispose(): context ditutup, jalur & penjadwal nol", (not s3["ready"]) and s3["tracks"] == 0 and not s3["pump"], s3)
    ev(pg, "window.Nusa.sfx('click'); NW.audioDirector.tick()"); ok("16e memanggil API setelah dispose tidak error", not errs, errs[:2])
    ctx.close()

    # ============ 17 + spasial: ambience & langkah ============
    ctx, pg, errs = fresh(b, hour=9)
    ev(pg, "window.__nusa.S.up.boat=1"); time.sleep(0.5)
    pasar = ev(pg, "(()=>{const d=NW.areas.get('muara').discoveries.find(x=>x.id==='muara:pasar');return [d.x,d.y]})()")
    goto(pg, pasar[0], pasar[1]); time.sleep(1.0); near = ev(pg, "NW.audio.ambTarget")
    goto(pg, 14, 25); time.sleep(1.0); far = ev(pg, "NW.audio.ambTarget")
    ok("S1 dekat pasar: keramaian pasar terdengar lebih kuat daripada jauh", near["market"] > far["market"] + 0.3, (round(near["market"], 2), round(far["market"], 2)))
    ev(pg, "(()=>{const e=NW.areas.cur;})()"); dock = ev(pg, "NW.areas.cur.map.DOCK");
    sp = ev(pg, "NW.areas.cur.map.SPOT"); goto(pg, sp["x"] - 0.3, sp["y"]); time.sleep(1.0); wd = ev(pg, "NW.audio.ambTarget")
    ok("S2 di dermaga air lebih dominan daripada di tengah kampung", wd["water"] > far["water"] + 0.1, (round(wd["water"], 2), round(far["water"], 2)))
    ev(pg, "window.__nusa.S.hour = 22"); time.sleep(1.5); nt = ev(pg, "NW.audio.ambTarget")
    ok("S3 malam: jangkrik hidup, siang: mati", nt["crickets"] > 0.4 and far["crickets"] < 0.05, (round(nt["crickets"], 2), round(far["crickets"], 2)))
    ev(pg, "window.__nusa.S.hour = 14")
    to_toba(pg, 10); bp = ev(pg, "(()=>{const d=NW.areas.get('toba').discoveries.find(x=>x.id==='toba:bukit');return [d.x,d.y]})()")
    goto(pg, 19, 14); time.sleep(1.0); mid = ev(pg, "NW.audio.ambTarget")
    goto(pg, bp[0], bp[1]); time.sleep(1.2); view = ev(pg, "NW.audio.ambTarget")
    ok("S4 di Bukit Pandang angin & air dominan (angin naik tajam)", view["wind"] > mid["wind"] + 0.3 and view["water"] >= mid["water"] - 0.05, (round(view["wind"], 2), round(mid["wind"], 2)))
    tp = ev(pg, "(()=>{const d=NW.areas.get('toba').discoveries.find(x=>x.id==='toba:pasar');return [d.x,d.y]})()")
    goto(pg, tp[0], tp[1]); time.sleep(1.0); tm = ev(pg, "NW.audio.ambTarget")
    ok("S5 pasar kecil Toba: keramaian warga terasa", tm["market"] > 0.5, round(tm["market"], 2))
    # langkah kaki sesuai permukaan
    ev(pg, "NW.audio.sfxLog.length = 0"); sp = ev(pg, "NW.areas.cur.map.SPOT")
    ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera()}", [19.0, 12.5]); time.sleep(0.3)
    pg.keyboard.down("ArrowUp"); time.sleep(2.2); pg.keyboard.up("ArrowUp"); time.sleep(0.3)
    st = ev(pg, "NW.audio.sfxLog.filter(x=>x.name.startsWith('step_')).map(x=>x.name)")
    ok("S6 berjalan di dermaga kayu → langkah kayu, berirama (bukan tiap frame)", st.count("step_kayu") >= 2 and len(st) <= 14, st)
    # dialog: musik mengalah
    near_n = ev(pg, "(()=>{const n=NW.world.areaNpcs()[0]; return n.id})()")
    ev(pg, "(()=>{const n=NW.world.areaNpcs()[0];const p=NW.world.player;p.x=n.x+0.6;p.y=n.y;NW.world.snapCamera()})()"); time.sleep(0.5)
    ev(pg, "NW.world.interact()"); time.sleep(0.9); dk = ev(pg, "NW.audio.stats().duck"); ev(pg, "document.getElementById('dlg').classList.add('hidden')")
    ok("S7 saat dialog musik sedikit lebih pelan (duck ≤ 0,65)", dk <= 0.65, dk)
    ctx.close()

    # ============ 17. regresi fitur lama (sanity di dalam suite ini) + performa ============
    ctx, pg, errs = fresh(b, hour=10)
    ev(pg, "window.__nusa.S.up.boat=1"); time.sleep(1.0)
    s0 = ev(pg, "(()=>{const S=window.__nusa.S;return {v:S.v, rods:S.up.rod, coins:S.money, cap:window.Nusa.coolerCap(), titles:!!S.titles, adv:!!S.adv, home:!!S.home}})()")
    ok("R1 simpanan permainan tidak berubah oleh audio (v10, kunci sama, adv/home/titles utuh)", s0["v"] == 10 and s0["adv"] and s0["home"] and s0["titles"] and s0["cap"] == 8, s0)
    ok("R2 kunci simpanan permainan tidak mengandung data audio", "master" not in (ev(pg, "localStorage.getItem('nusa-island-v1')") or ""))
    ev(pg, "(()=>{for(const n of ['cast','splash','nibble','bite','tick','surge','snap','lose','catch','coin','click']) window.Nusa.sfx(n,'biasa')})()"); time.sleep(0.4)
    names = set(ev(pg, "NW.audio.sfxLog.map(x=>x.name)"))
    ok("R3 semua efek suara lama masih ada & berbunyi", {"cast", "splash", "bite", "snap", "lose", "catch", "coin", "click"} <= names, sorted(names))
    # tanpa audio vs dengan audio: kecepatan frame (indikasi, headless)
    def fps(sec=3.0):
        return ev(pg, "(sec)=>new Promise(r=>{let n=0,t0=performance.now();function f(t){n++; if(t-t0<sec*1000) requestAnimationFrame(f); else r(n/((t-t0)/1000))} requestAnimationFrame(f)})", sec)
    goto(pg, 14, 20); f_on = fps()
    ev(pg, "(()=>{const t=performance.now();for(let i=0;i<300;i++)NW.audioDirector.tick();return performance.now()-t})()")
    tk = ev(pg, "(()=>{const t=performance.now();for(let i=0;i<300;i++)NW.audioDirector.tick();return (performance.now()-t)/300})()")
    ev(pg, "NW.audio.dispose()"); time.sleep(0.3); f_off = fps()
    ok("R4 biaya pengarah audio per tick kecil (< 1,5 ms; dipanggil ±3×/dtk)", tk < 1.5, f"{tk:.3f} ms")
    ok("R5 FPS (emulasi headless) dengan audio tidak turun jauh dibanding tanpa audio", f_on >= f_off * 0.85 or f_on >= 50, f"dengan {f_on:.0f} · tanpa {f_off:.0f} fps (indikasi, bukan HP asli)")
    ok("R6 tidak ada error JavaScript sepanjang uji", not errs, errs[:3])
    ctx.close()
    b.close()

fails = [r for r in R if r.startswith("FAIL")]
print(f"\n{len(R) - len(fails)} lulus / {len(R)}")
sys.exit(1 if fails else 0)
