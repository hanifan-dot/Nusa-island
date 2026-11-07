"""Uji Samudra Follower V2 di game yang berjalan (peramban nyata, viewport ponsel 390x844).
SUNGGUHAN: game asli, area pulau, perjalanan kapal, HUD, kartu tangkapan, Buku Koleksi, INTI EKONOMI SERVER asli (economy/core.js + sf2-core.js) berjalan di dalam halaman.
TIDAK DIUJI: Firestore/Cloudflare/pembayaran nyata (tidak terjangkau dari sandbox). Jalankan: python tests/browser/test_sf2.py   (gambar → docs/sf2/)"""
import time, os, json
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
OUT = os.path.join(ROOT_DIR, "docs", "sf2"); os.makedirs(OUT, exist_ok=True)
rd = lambda p: open(os.path.join(ROOT_DIR, p), encoding="utf8").read()
R = []
def ok(n, c, e=""): R.append(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:230] if e != "" else "")); print(R[-1], flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
def wait_for(pg, js, t=12):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.12)
    return False
WRAP = "(function(){var module={exports:{}};%s;window.%s=module.exports})();"
def shot(pg, name): pg.screenshot(path=os.path.join(OUT, name)); print("  gambar:", name, flush=True)
SERVER = """async(cfg)=>{ const m=new Map(); let q=Promise.resolve(); const rd=p=>m.has(p)?JSON.parse(m.get(p)):null;
 const db={get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const [k,v] of buf)m.set(k,v);return r});q=run.catch(()=>{});return run}};
 (cfg.seed||[]).forEach(([k,v])=>m.set(k,v));
 window.__srvNow=cfg.now||1793502000000; window.__db=m; window.__calls=[]; window.__SEQ=[]; window.__R=()=>window.__SEQ.length?window.__SEQ.shift():Math.random();
 const e=NusaEconomyCore.makeEconomyServer(db,{clock:()=>window.__srvNow,tables:__T,fishmath:NW.FM,sf2:NusaSF2Core,initCap:1e9,trustClientInit:true,rand:()=>window.__R()});
 window.__srv=e; const A={uid:cfg.uid};
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>cfg.uid,getEntitlements:async()=>({owned:{},products:{},wallet:{NYATA:0}}),
   eco:async(name,d)=>{window.__calls.push(name);try{return JSON.parse(JSON.stringify(await e[name](A,d)))}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.cloud.enabled=true; NW.cloud.demo=false; NW.cloud.user={uid:cfg.uid,name:'Uji'}; return true}"""
def new(ctx, uid="u-sf2", seed=None, now=None):
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + "?cloud=off"); time.sleep(0.7)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.4); ev(pg, "()=>{window.__nusa.S.muted=true; window.__nusa.S.hour=10; NW.weather.force('cerah',{snap:true})}")
    ev(pg, SERVER, {"uid": uid, "seed": seed or [], "now": now}); ev(pg, "(m)=>{Nusa.S.money=m}", 1000); ev(pg, "NW.eco.ensure()"); wait_for(pg, "NW.eco.active()")
    return pg, errs
def set_lbc(pg, uid, n):
    ev(pg, "([u,n])=>{const k='shop/economy/'+u;const e=JSON.parse(__db.get(k));e.lbc=n;__db.set(k,JSON.stringify(e))}", [uid, n])
def tick(pg, ms=2000): ev(pg, "(d)=>{window.__srvNow+=d}", ms)
def seq(pg, *v): ev(pg, "(v)=>{window.__SEQ=v.slice()}", list(v))
def srv_catch(pg, rand_seq, spot="dalam"):
    tick(pg, 60000); seq(pg, *rand_seq)
    return ev(pg, "async(s)=>{const r=await NW.eco.sf2Catch(s,'op'+Math.random().toString(36).slice(2,12)+Date.now());return {f:r.fish,pity:r.pity,m:r.mythic,g:r.guaranteed,first:r.first,dup:r.duplicate}}", spot)
def island_url_ready(pg): return wait_for(pg, "NW.areas.cur&&NW.areas.cur.id==='sf2'&&Nusa.mode()==='world'", 25)
def fish_here(pg, spot, rand_seq):
    """memancing sungguhan di spot: area → startFishing → gigitan alami → tarik → mendarat; acak SERVER diatur deterministik"""
    ev(pg, "(s)=>{NW.world.api.startFishing(s)}", spot); ok_fish = wait_for(pg, "Nusa.mode()==='fish'", 10)
    tick(pg); seq(pg, *rand_seq)
    ev(pg, "()=>{const G=window.__nusa.G;G.phase='waiting';G.biteTimer=0.05;G.nibbles=[];G.bob.vis=true}")
    bit = wait_for(pg, "window.__nusa.G.phase==='bite'&&!!window.__nusa.G.pending", 6)
    pend = ev(pg, "!!(window.__nusa.G.pending&&window.__nusa.G.pending.sf2)")
    ev(pg, "()=>{window.__nusa.startFight()}"); ev(pg, "()=>{window.__nusa.endFight('caught')}")
    done = wait_for(pg, "!document.getElementById('catchWrap').classList.contains('hidden')", 10)
    return ok_fish and bit and pend and done
def back_to_world(pg):
    ev(pg, "()=>{const b=document.getElementById('catchOk');if(b&&b.offsetParent)b.click()}"); time.sleep(0.3)
    ev(pg, "()=>{window.__nusa.goWorld('dock')}"); wait_for(pg, "Nusa.mode()==='world'&&NW.areas.cur&&NW.areas.cur.id==='sf2'", 10)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader"])
    try:
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
        ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
        U = "u-sf2"
        # ===== A. gerbang: terkunci < 100 =====
        pg, errs = new(ctx, U); set_lbc(pg, U, 73); ev(pg, "async()=>{await NW.sf2.refresh(true)}")
        ev(pg, "Nusa.openPanel('map')"); time.sleep(0.6)
        t = ev(pg, "(document.querySelector('.sf2-card')||{}).innerText||''")
        ok("A1 kartu Samudra Follower ada di Peta Nusantara", "Pulau Para Legenda" in t, t[:80])
        ok("A2 terkunci: pesan resmi + progres 73/100", "Samudra Follower terkunci. Tangkap 100 ikan untuk membuka perjalanan!" in t and "73/100" in t, t[:200])
        ok("A3 tidak ada tombol BERLAYAR saat terkunci", not ev(pg, "!!document.querySelector('.sf2-card [data-act=go]')"))
        idx = ev(pg, "Nusa && 0 || [...Array(12).keys()].find(i=>0)") if False else ev(pg, "(()=>{const l=document.querySelector('.sf2-card [data-arg]');return null})()")
        shot(pg, "01-terkunci-73.png")
        ev(pg, "()=>{Nusa.openPanel('map')}")
        r = ev(pg, "async()=>{try{await NW.eco.sf2Catch('dalam','opkunci0001xx');return 'LOLOS'}catch(e){return e.message}}")
        ok("A4 SERVER menolak memancing di pulau saat <100 (klien tidak bisa curang)", "terkunci" in str(r), r)
        # ===== B. buka dengan 100 → berlayar → pulau + HUD =====
        set_lbc(pg, U, 100); ev(pg, "async()=>{await NW.sf2.refresh(true)}"); ev(pg, "Nusa.openPanel('map')"); time.sleep(0.6)
        ok("B1 setelah 100 tangkapan sah: tombol BERLAYAR muncul", ev(pg, "!!document.querySelector('.sf2-card [data-act=go]')"))
        shot(pg, "02-peta-terbuka.png")
        ev(pg, "document.querySelector('.sf2-card [data-act=go]').click()")
        ok("B2 berlayar → tiba di Pulau Para Legenda (area sf2)", island_url_ready(pg), ev(pg, "NW.areas.cur&&NW.areas.cur.id"))
        wait_for(pg, "!NW.adv.isBusy()&&!document.getElementById('fade').classList.contains('on')", 20); time.sleep(2.0); ev(pg, "async()=>{await NW.sf2.refresh(true)}"); time.sleep(0.8)
        hud = ev(pg, "(document.getElementById('sf2Hud')||{}).innerText||''")
        ok("B3 HUD: SAMUDRA FOLLOWER / Pity Mythic 0/100 / Mythic 5,00%", "SAMUDRA FOLLOWER" in hud and "Pity Mythic 0/100" in hud and "Mythic 5,00%" in hud, hud)
        r = ev(pg, "(()=>{const h=document.getElementById('sf2Hud').getBoundingClientRect();return {x:h.x,y:h.y,w:h.width,h:h.height,vw:innerWidth,vh:innerHeight}})()")
        ok("B4 HUD kecil, di atas (tidak menutup joystick kiri-bawah)", r["h"] < 90 and r["w"] < 200 and r["y"] < 200, r)
        shot(pg, "03-pulau-hud.png")
        ok("B5 tanpa error halaman", not errs, errs[:2])
        # ===== C. empat spot memancing sungguhan =====
        res = {}
        plan = [("dalam", [0.97, 0.1, 0.5, 0.5], "mythic", "laut dalam"), ("karang", [0.1, 0.1, 0.5, 0.5], "common", ""), ("danau", [0.6, 0.1, 0.5, 0.5], "uncommon", ""), ("muara", [0.9, 0.0, 0.5, 0.5], "epic", "")]
        for spot, rs, rar, _ in plan:
            good = fish_here(pg, spot, rs)
            got = ev(pg, "(()=>{const c=window.__nusa.S.cooler;const it=c[c.length-1];return it?{id:it.id,w:it.w,sp:it.sp}:null})()")
            card = ev(pg, "document.getElementById('catchCard').innerText")
            sp = ev(pg, "(id)=>NusaSF2Core.BY_ID[id]&&NusaSF2Core.BY_ID[id].rarity", got["id"]) if got else None
            ok(f"C {spot}: tangkap sungguhan → ikan diundi SERVER, rarity {rar}", good and got and sp == rar, (got, sp))
            ok(f"C {spot}: kartu tangkapan memuat label rarity V2 + Pity", C_ok if (C_ok := (rar.capitalize() in card or rar.upper() in card.upper()) and "Pity" in card) else False, card[:160].replace("\n", " | "))
            if spot == "dalam": shot(pg, "04-tangkap-mythic.png")
            hud = ev(pg, "(document.getElementById('sf2Hud')||{}).innerText||''")
            res[spot] = hud
            back_to_world(pg)
        ok("C5 Mythic di spot pertama mereset Pity (0/100); lalu 3 tangkapan non-Mythic → Pity 3/100", "Pity Mythic 3/100" in ev(pg, "(document.getElementById('sf2Hud')||{}).innerText||''"), res)
        ok("C6 klien memanggil ecoSf2Catch (1 ditolak <100 + 4 sukses); TIDAK ada ecoCatch (undian lokal/umum) untuk ikan pulau", ev(pg, "[__calls.filter(n=>n==='ecoSf2Catch').length, __calls.filter(n=>n==='ecoCatch').length]") == [5, 0])
        # ===== D. Pity di server (peluang naik, reset, jaminan) =====
        info = ev(pg, "async()=>NW.eco.sf2Info()")
        base = info["pity"]
        for i in range(17): srv_catch(pg, [0.0, 0.0, 0.5, 0.5])        # common terus → Pity 20
        i20 = ev(pg, "async()=>NW.eco.sf2Info()")
        ok("D1 Pity 19→20: peluang Epic & Mythic naik dari 5,00% ke 5,20%", i20["pity"] == 20 and i20["odds"]["mythic"] == 5.2 and i20["odds"]["epic"] == 5.2 and i20["odds"]["common"] == 54.6, i20["odds"])
        for i in range(53): srv_catch(pg, [0.0, 0.0, 0.5, 0.5])
        ok("D2 Pity 73 sebelum Mythic", ev(pg, "async()=>(await NW.eco.sf2Info()).pity") == 73)
        r = srv_catch(pg, [0.99, 0.2, 0.5, 0.5])
        ok("D3 Mythic di Pity 73 → reset ke 0", r["m"] and r["pity"] == 0 and not r["g"], r)
        for i in range(99): srv_catch(pg, [0.0, 0.0, 0.5, 0.5])
        ok("D4 Pity 99 tanpa Mythic", ev(pg, "async()=>(await NW.eco.sf2Info()).pity") == 99)
        r = srv_catch(pg, [0.0, 0.0, 0.5, 0.5])
        ok("D5 tangkapan ke-100 tanpa Mythic: DIJAMIN Mythic (meski acak minta Common) lalu reset 0", r["m"] and r["g"] and r["pity"] == 0 and ev(pg, "(id)=>NusaSF2Core.BY_ID[id].rarity", r["f"]["id"]) == "mythic", r)
        # ===== E. idempoten =====
        tick(pg); seq(pg, 0.0, 0.0, 0.5, 0.5)
        d = ev(pg, "async()=>{const op='opdup'+Date.now();const a=await NW.eco.sf2Catch('karang',op);const n1=NW.eco.state().balance;const b=await NW.eco.sf2Catch('karang',op);const i=await NW.eco.sf2Info();return {same:a.fish.uid===b.fish.uid,dup:!!b.duplicate,pity:i.pity,caught:i.caught}}")
        i3 = ev(pg, "async()=>NW.eco.sf2Info()")
        ok("E1 klaim ganda (opId sama): ikan SAMA, bukan ikan baru; Pity tidak naik dua kali", d["same"] and d["dup"] and d["pity"] == 1, d)
        # ===== F. Pity per pemain & refresh =====
        seed = ev(pg, "()=>[...__db.entries()]"); now0 = ev(pg, "window.__srvNow")
        pg.close()
        pg2, errs2 = new(ctx, U, seed, now0 + 60000)
        ev(pg2, "async()=>{await NW.sf2.refresh(true)}")
        ok("F1 refresh browser: Pity dipulihkan dari server (1/100), progres tidak hilang", ev(pg2, "NW.sf2.info()&&NW.sf2.info().pity") == 1, ev(pg2, "NW.sf2.info()"))
        ev(pg2, "()=>{window.__srv.ecoInit({uid:'u-lain'},{})}"); wait_for(pg2, "true", 1); time.sleep(0.5)
        set_lbc(pg2, "u-lain", 100)
        r2 = ev(pg2, "async()=>{const i=await window.__srv.ecoSf2Info({uid:'u-lain'});return {pity:i.pity,unlocked:i.unlocked}}")
        ok("F2 pemain lain punya Pity terpisah (0) dan akses sendiri", r2["pity"] == 0 and r2["unlocked"], r2)
        # ===== G. Penemu Pertama atomik =====
        tick(pg2, 5000); seq(pg2, 0.97, 0.99, 0.5, 0.5)   # Mythic + spesies pertama (komunitas) untuk u-lain
        a = ev(pg2, "async()=>{const r=await window.__srv.ecoSf2Catch({uid:'u-lain'},{opId:'oplain00001xx',spot:'dalam'});return {id:r.fish.id,first:r.first}}")
        com = ev(pg2, "(id)=>NusaSF2Core.BY_ID[id].community", a["id"])
        ev(pg2, "()=>{window.__srvNow+=5000}"); seq(pg2, 0.97, 0.99, 0.5, 0.5)
        b2 = ev(pg2, "async()=>{try{const r=await window.__srv.ecoSf2Catch({uid:U0},{opId:'opsatu000001xx',spot:'dalam'});return {id:r.fish.id,first:r.first}}catch(e){return {err:e.message}}}".replace("U0", "'u-sf2'"))
        ok("G1 Penemu Pertama hanya SATU akun per spesies komunitas", (not com) or (a["first"] and b2.get("id") == a["id"] and not b2.get("first")) or (a["first"] and b2.get("id") != a["id"]), (a, b2, com))
        # ===== H. Buku Koleksi =====
        ev(pg2, "async()=>{await NW.sf2.refresh(true)}"); ev(pg2, "()=>{Nusa.setDexTab('samudra');Nusa.openPanel('dex')}"); time.sleep(0.7)
        bk = ev(pg2, "(document.querySelector('.sf2-book')||{}).innerText||''")
        ok("H1 Buku Koleksi: katalog komunitas 14/1.000 + tangkapan vs spesies ditemukan dibedakan", "14" in bk and "1.000" in bk and "Spesies ditemukan" in bk and "Tangkapan pulau" in bk, bk[:200].replace("\n", " | "))
        shot(pg2, "05-buku-koleksi.png")
        ev(pg2, "()=>{document.querySelector('[data-act=sf2o]').click()}"); time.sleep(0.4)
        ok("H2 panel peluang & Pity bisa dibuka", "Peluang Samudra Follower" in ev(pg2, "(document.getElementById('sf2Ov')||{}).innerText||''"))
        shot(pg2, "06-info-peluang.png")
        ok("H3 tanpa error halaman", not errs2, errs2[:2])
    finally:
        b.close()
print("\n".join(R)); fails = [r for r in R if r.startswith("FAIL")]
print("\nHASIL: %d lulus, %d gagal" % (len(R) - len(fails), len(fails))); raise SystemExit(1 if fails else 0)
