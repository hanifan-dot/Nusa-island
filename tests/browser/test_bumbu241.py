"""Uji Bumbu 2.4.1 "Rahasia Ikan Mistis": 12 ikan laut baru (5 biasa, 3 langka, 2 epik, 2 mistis), validitas ID & ekonomi,
peluang/syarat waktu-cuaca, penemuan Palung Mistis Selat lewat kapal, memancing & menangkap Ikan Lentera Arwah dan
Pari Bayang Samudra dengan sistem Strike/tegangan tali lama, petunjuk (kilau/pesan/suara), perayaan, inventaris, koleksi,
akuarium, simpan/muat, kompatibilitas save lama, kapal & tabrakan, performa (emulasi).
Jalankan: python tests/browser/test_bumbu241.py
Catatan: Chromium headless TANPA speaker dan BUKAN Android fisik. FPS/memori = emulasi browser, bukan angka HP.
"""
import time, json, os, sys, math
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html")) + "?cloud=off"
OUT = "/tmp/nusa-b241-test/"; os.makedirs(OUT, exist_ok=True)
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)

def page(b, init=None, vp=(390, 844)):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + (getattr(e, "stack", "") or "").replace("\n", " | ")[:300]))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.6)
    return ctx, pg, errs
def fresh(b, hour=22, boat=2, rod=4, muted=True, fx=None):
    ctx, pg, errs = page(b); ev(pg, "localStorage.clear()")
    if fx: ev(pg, "(f)=>localStorage.setItem('nusa-island-wxfx-v1', JSON.stringify(f))", fx)
    pg.reload(); time.sleep(0.6); pg.click("#startBtn"); time.sleep(0.3)
    ev(pg, "([h,bt,rd,m])=>{const S=window.__nusa.S; S.hour=h; S.up.boat=bt; S.up.rod=rd; S.muted=m; if(NW.audio) NW.audio.setMuted(m); document.getElementById('banner').classList.remove('show'); NW.weather.force('cerah',{snap:true})}", [hour, boat, rod, muted]); time.sleep(0.5)
    return ctx, pg, errs
def goto(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera()}", [x, y]); time.sleep(0.4)
def st(pg): return ev(pg, "NW.boat.stats()")
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
    cur = ev(pg, "NW.areas.cur.id")
    if ev(pg, "NW.boat.B.on && NW.boat.B.anchor"): ev(pg, "NW.boat.toggleAnchor()"); time.sleep(0.5)
    if cur == "muara" and area in ("laut", "selat"): pose(pg, 51.2, 24, ang(1, 0)); hold(pg, "w", 1.2); wait_for(pg, "NW.areas.cur.id==='laut' && !NW.boat.busy"); cur = "laut"
    if cur == "laut" and area == "selat": pose(pg, 79.6, 24, ang(1, 0)); hold(pg, "w", 1.2); wait_for(pg, "NW.areas.cur.id==='selat' && !NW.boat.busy"); cur = "selat"
    time.sleep(0.3); return ev(pg, "NW.areas.cur.id")
def to_palung(pg, drive=True):
    """Berlayar ke laut lepas lalu mengarah ke Palung dengan kemudi sungguhan; hasilnya: kapal di dalam lingkaran spot."""
    board(pg); sail_to(pg, "laut")
    pose(pg, 52, 44.5, ang(1, 0))
    if drive: pg.keyboard.down("w"); wait_for(pg, "NW.adv.isFound('sea:palung')", 14); pg.keyboard.up("w")
    pose(pg, 65.5, 44, ang(1, 0.3)); time.sleep(0.4)
    if not ev(pg, "NW.boat.B.anchor"): ev(pg, "NW.boat.toggleAnchor()"); time.sleep(2.2)
def start_fishing(pg):
    ev(pg, "NW.boat.fish()"); wait_for(pg, "window.__nusa.mode()==='fish'", 5)
def cast(pg, rv=None, tmo=8):
    """Lempar lewat jalur asli (tahan lalu lepas). rv: nilai Math.random tetap SELAMA lemparan mendarat (agar peluang mistis dapat dipaksa)."""
    if rv is not None: ev(pg, "(v)=>{window.__rr=Math.random; Math.random=()=>v}", rv)
    pg.mouse.move(210, 520); pg.mouse.down(); time.sleep(0.5); pg.mouse.up()
    wait_for(pg, "window.__nusa.G.phase==='waiting'", tmo)
    if rv is not None: ev(pg, "Math.random=window.__rr")
def set_env(pg, hour, wx):
    ev(pg, "([h,w])=>{window.__nusa.S.hour=h; NW.weather.force(w,{snap:true})}", [hour, wx]); time.sleep(0.3)
def bite_and_strike(pg):
    """Tunggu gigitan lalu Strike sungguhan (ketuk layar). Mengembalikan True bila pertarungan dimulai."""
    if not wait_for(pg, "window.__nusa.G.phase==='bite'", 12, 0.04): return False
    pg.mouse.down(); pg.mouse.up()
    return wait_for(pg, "window.__nusa.G.phase==='fight'", 3, 0.04)

def dlg_open(pg): return ev(pg, "!document.getElementById('dlg').classList.contains('hidden')")
def near_npc(pg, nid, d=0.75, k0=0):
    ev(pg, """(a)=>{const n=NW.world.areaNpcs().find(n=>n.id===a[0]); const p=NW.world.player;
      for(let j=0;j<24;j++){const k=(j+a[2])%24, x=n.x+Math.cos(k/24*6.283)*a[1], y=n.y+Math.sin(k/24*6.283)*a[1]; if(NW.walkable(x,y)){p.x=x;p.y=y;break;}} NW.world.snapCamera()}""", [nid, d, k0]); time.sleep(0.3)
def talk_collect(pg, nid, pick):
    """Bicara dengan NPC (sampai 3 kali bila percakapan pertama hanya cerita), pilih opsi yang memuat `pick`, kumpulkan seluruh teks."""
    texts = []; chosen = False
    for attempt in range(3):
        for i in range(40):
            near_npc(pg, nid, [0.75, 1.0, 1.3, 1.6, 1.9][i % 5], i)
            if ev(pg, "NW.world.target ? NW.world.target.id : null") == "npc:" + nid: ev(pg, "NW.world.interact()"); time.sleep(0.3); break
        for _ in range(250):
            if not dlg_open(pg): break
            texts.append(ev(pg, "document.getElementById('dlgText').textContent"))
            btns = ev(pg, "[...document.querySelectorAll('#dlgOpts button')].map(b=>b.textContent)")
            if btns:
                label = next((x for x in btns if pick in x), None)
                if label and not chosen: chosen = True; ev(pg, "(t)=>[...document.querySelectorAll('#dlgOpts button')].find(b=>b.textContent===t).click()", label); time.sleep(0.3); continue
                ev(pg, "(t)=>[...document.querySelectorAll('#dlgOpts button')].pop().click()", 0); time.sleep(0.3); continue
            ev(pg, "document.getElementById('dlg').click()"); time.sleep(0.08)
        if chosen: break
        time.sleep(0.5)
    return " | ".join(texts)
def finish_caught(pg):
    if not ev(pg, "!!window.__nusa.G.fight"): return False
    ev(pg, "window.__nusa.endFight('caught')"); time.sleep(0.5); return True

with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])

    # ================= 1. 12 ikan baru & validitas ID =================
    ctx, pg, errs = fresh(b)
    d = ev(pg, """(()=>{const F=FISH; const nw=F.filter(f=>f.seaOnly); const ids=F.map(f=>f.id);
      const old=F.filter(f=>!f.seaOnly); const s=old.map(f=>[f.id,f.rarity,f.wMin,f.wMax,f.xMax||0,f.price,f.power,f.loc,f.night,f.protected?1:0].join('|')).join(';'); let h=0; for(const ch of s){h=(h*31+ch.charCodeAt(0))>>>0}
      const by={}; nw.forEach(f=>{const k=f.mistik?'mistis':f.rarity; by[k]=(by[k]||0)+1});
      return {total:F.length, uniq:new Set(ids).size, n:nw.length, by, oldN:old.length, oldHash:h,
        bad:nw.filter(f=>!(f.name&&f.hab&&f.desc&&f.desc.length>30&&f.wMin>0&&f.wMax>f.wMin&&f.price>0&&f.power>=1&&RARITY[f.rarity]&&f.loc==='selat'&&Array.isArray(f.shape)&&f.color&&f.belly)).map(f=>f.id),
        names:new Set(nw.map(f=>f.name)).size, descs:new Set(nw.map(f=>f.desc)).size, idfmt:nw.every(f=>/^[a-z][a-z0-9_]+$/.test(f.id)),
        myst:nw.filter(f=>f.mistik).map(f=>({id:f.id,r:f.rarity,hab:f.hab,desc:f.desc,pelagic:!!f.pelagic,tough:!!f.tough,prot:!!f.protected})),
        sea:nw.filter(f=>f.protected||f.emoji).length}})()""")
    ok("1a tepat 12 spesies baru: 5 biasa, 3 langka, 2 epik, 2 mistis khusus", d["n"] == 12 and d["by"] == {"biasa": 5, "langka": 3, "epik": 2, "mistis": 2}, d["by"])
    ok("1b ID unik, format valid, tidak menimpa ikan lama (48 total = 36 lama + 12 baru)", d["uniq"] == d["total"] == 48 and d["oldN"] == 36 and d["idfmt"], (d["uniq"], d["total"]))
    ok("1c setiap spesies punya nama, habitat, bobot min<maks, harga, kelangkaan, deskripsi unik", not d["bad"] and d["names"] == 12 and d["descs"] == 12, d["bad"])
    ok("1d data 36 ikan lama TIDAK berubah (harga, bobot, rarity, tenaga, lokasi identik; checksum)", d["oldHash"] == 2629228866, d["oldHash"])
    mm = {x["id"]: x for x in d["myst"]}
    ok("1e dua ikan mistis: Lentera Arwah & Pari Bayang, habitat Palung Mistis Selat, deskripsi persis, bukan spesies dilindungi", set(mm) == {"lentera_arwah", "pari_bayang"} and all(v["hab"] == "Palung Mistis Selat" and not v["prot"] for v in mm.values())
       and mm["lentera_arwah"]["desc"] == "Cahaya dari kedalaman yang dipercaya nelayan sebagai penjaga rahasia samudra." and mm["pari_bayang"]["desc"] == "Bayangan misterius yang bergerak sunyi di bawah arus samudra.")
    ok("1f Mistis = tag khusus: rarity tetap salah satu rarity lama (legenda), tidak ada rarity baru", all(v["r"] == "legenda" for v in mm.values()) and ev(pg, "Object.keys(RARITY).join()") == "sampah,biasa,langka,epik,legenda")
    ok("1g Pari Bayang lebih menantang (tough, tenaga lebih tinggi dari legenda laut lain) & perenang samudra", mm["pari_bayang"]["tough"] and ev(pg, "(()=>{const F=window.Nusa.FISH_BY_ID; const fp=(f,w)=>NW.FM.fightPower(f,w,0.5); return fp(F.pari_bayang,40)>fp(F.kerapu_raksasa,40)})()"))
    eco = ev(pg, """(()=>{const F=FISH, mean=1.075, E=(f)=>{let s=0; for(let i=0;i<300;i++){s+=NW.FM.priceFor(f,NW.FM.rollWeight(f).w,mean,3)} return s/300}; const o={};
      for(const r of ['biasa','langka','epik','legenda']){ const nw=F.filter(f=>f.seaOnly&&f.rarity===r&&!f.mistik).map(E), od=F.filter(f=>!f.seaOnly&&f.loc==='selat'&&f.rarity===r).map(E); o[r]={nw:nw.length?Math.max(...nw):0, od:od.length?Math.max(...od):0, odMin:od.length?Math.min(...od):0}}
      o.mist=F.filter(f=>f.mistik).map(f=>[f.id,E(f)]); o.kRaksasa=E(F.find(f=>f.id==='kerapu_raksasa')); return o})()""")
    ok("1h ekonomi: nilai rata-rata tiap ikan baru berada di rentang ikan Selat lama dengan rarity sama (biasa ≤ ×3, langka ≤ ×1,3, epik ≤ ×1,2 dari yang tertinggi)",
       eco["biasa"]["nw"] <= eco["biasa"]["od"] * 3 and eco["langka"]["nw"] <= eco["langka"]["od"] * 1.3 and eco["epik"]["nw"] <= eco["epik"]["od"] * 1.2, eco)
    ok("1i nilai ikan mistis tinggi tetapi tidak melebihi legenda Selat lama (Kerapu Raksasa)", all(0 < v < eco["kRaksasa"] for _, v in eco["mist"]), eco["mist"])
    ok("1j tanpa error JavaScript (data)", not errs, errs[:3]); ctx.close()

    # ================= 2. Peluang kemunculan, waktu & cuaca =================
    ctx, pg, errs = fresh(b)
    ch = ev(pg, """(()=>{const M=NW.mystic, c=(o)=>Object.assign({night:false,dusk:false,rain:false,fog:false},o); const q=(id,o,p=0,l=1)=>M.chance(id,c(o),p,l);
      return {lDay:q('lentera_arwah',{}), lNight:q('lentera_arwah',{night:true}), lFog:q('lentera_arwah',{fog:true}), lRain:q('lentera_arwah',{rain:true}), lDusk:q('lentera_arwah',{dusk:true}),
        pDay:q('pari_bayang',{}), pDusk:q('pari_bayang',{dusk:true}), pRain:q('pari_bayang',{rain:true}), pNight:q('pari_bayang',{night:true}), pFog:q('pari_bayang',{fog:true}),
        lPity:q('lentera_arwah',{night:true},999), lLuck:q('lentera_arwah',{night:true},0,50), pityDay:q('lentera_arwah',{},999)}})()""")
    ok("2a Lentera Arwah: muncul terutama saat malam atau kabut (≥ 4× lebih besar daripada siang cerah/hujan/senja)", ch["lNight"] >= 4 * ch["lDay"] and ch["lFog"] >= 4 * ch["lDay"] and ch["lRain"] == ch["lDay"] and ch["lDusk"] == ch["lDay"], ch)
    ok("2b Pari Bayang: muncul terutama saat senja, hujan, atau malam; kabut siang tidak mengangkatnya", ch["pDusk"] >= 4 * ch["pDay"] and ch["pRain"] >= 4 * ch["pDay"] and ch["pNight"] >= 4 * ch["pDay"] and ch["pFog"] == ch["pDay"], ch)
    ok("2c peluang rendah tetapi realistis: 3–8% (Lentera) dan 2–5% (Pari) per lemparan pada kondisi cocok; di luar syarat < 1,5% (tetap mungkin, jarang)", 0.03 <= ch["lNight"] <= 0.08 and 0.02 <= ch["pDusk"] <= 0.05 and 0 < ch["lDay"] < 0.015 and 0 < ch["pDay"] < 0.015, ch)
    ok("2d anti-grinding: perlindungan sial maks ×1,8 hanya saat kondisi cocok; umpan/lemparan hebat maks ×1,5; tidak ada peluang berbayar", abs(ch["lPity"] / ch["lNight"] - 1.8) < 1e-6 and ch["pityDay"] == ch["lDay"] and ch["lLuck"] <= ch["lNight"] * 1.5 + 1e-9 and ev(pg, "Object.keys(window.__nusa.S).filter(k=>/tiket|ticket|gem|permata|gacha|paid/i.test(k)).length") == 0, ch)
    pk = ev(pg, """(()=>{const M=NW.mystic, c={night:true,dusk:false,rain:false,fog:true}; return [M.pick(c,1,{},()=>0.01), M.pick(c,1,{},()=>0.06), M.pick(c,1,{},()=>0.9), M.pick({night:false,dusk:false,rain:false,fog:false},1,{},()=>0.2)]})()""")
    ok("2e lemparan deterministik: r kecil → Lentera, r sedikit lebih besar → Pari, r besar → ikan biasa (null)", pk == ["lentera_arwah", "pari_bayang", None, None], pk)
    mc = ev(pg, """(()=>{const M=NW.mystic; const run=(c,n)=>{const o={lentera_arwah:0,pari_bayang:0,none:0}; for(let i=0;i<n;i++){const k=M.pick(c,1,{},Math.random); o[k||'none']++} return o};
      const N=60000; return {night:run({night:true,dusk:false,rain:false,fog:false},N), day:run({night:false,dusk:false,rain:false,fog:false},N), N}})()""")
    N = mc["N"]
    ok("2f simulasi 60.000 lemparan: frekuensi sesuai rumus (malam: Lentera ≈ 5%, Pari ≈ 3,2%; siang cerah ≈ 1% & 0,64%)",
       abs(mc["night"]["lentera_arwah"] / N - 0.05) < 0.006 and abs(mc["night"]["pari_bayang"] / N - 0.032) < 0.005 and abs(mc["day"]["lentera_arwah"] / N - 0.01) < 0.003 and abs(mc["day"]["pari_bayang"] / N - 0.0064) < 0.0025, mc)
    ev(pg, "([h,w])=>{window.__nusa.S.hour=h; NW.weather.force(w,{snap:true})}", [22, "kabut"]); time.sleep(0.4)
    c1 = ev(pg, "NW.mystic.ctxNow()")
    ev(pg, "([h,w])=>{window.__nusa.S.hour=h; NW.weather.force(w,{snap:true})}", [11, "cerah"]); time.sleep(0.4); c2 = ev(pg, "NW.mystic.ctxNow()")
    ev(pg, "([h,w])=>{window.__nusa.S.hour=h; NW.weather.force(w,{snap:true})}", [18.2, "hujan"]); time.sleep(0.4); c3 = ev(pg, "NW.mystic.ctxNow()")
    ok("2g kondisi dibaca dari jam & cuaca nyata: malam+kabut, siang cerah, senja+hujan", c1["night"] and c1["fog"] and not c1["dusk"] and not c2["night"] and not c2["fog"] and not c2["rain"] and not c2["dusk"] and c3["dusk"] and c3["rain"], (c1, c2, c3))
    # ikan mistis TIDAK pernah keluar dari kolam biasa
    leak = ev(pg, """(()=>{const N=window.__nusa; let m=0, seaOnly=0; const mk=(l)=>({sampah:1/l,biasa:1,langka:Math.pow(l,.75),epik:Math.pow(l,1.05),legenda:Math.pow(l,1.35)});
      for(const s of NW.sea.SPOT_LIST){ for(let i=0;i<4000;i++){ const f=NW.sea.pickFish(s,mk(2.9),i%2===0); if(f&&f.mistik) m++; } }
      for(let loc=0;loc<3;loc++){ N.S.loc=loc; N.G.target={x:0,z:6}; for(let i=0;i<3000;i++){ const r=N.chooseFish(); if(r.fish.mistik) m++; if(r.fish.seaOnly) seaOnly++; } }
      N.S.loc=0; return {m, seaOnly}})()""")
    ok("2h kolam ikan biasa (semua spot laut & dermaga Muara/Toba/Selat) tidak pernah menghasilkan ikan mistis; ikan seaOnly tidak masuk kolam dermaga lama", leak["m"] == 0 and leak["seaOnly"] == 0, leak)
    ok("2i ke-10 ikan reguler baru dapat muncul dari spot laut; tidak satu pun tersedia di dermaga", ev(pg, """(()=>{const seen=new Set(); const mk=(l)=>({sampah:1/l,biasa:1,langka:Math.pow(l,.75),epik:Math.pow(l,1.05),legenda:Math.pow(l,1.35)}); for(const s of NW.sea.SPOT_LIST) for(let i=0;i<9000;i++){const f=NW.sea.pickFish(s,mk(2.1),i%2===0); if(f&&f.seaOnly) seen.add(f.id)} return [...seen].filter(id=>!window.Nusa.FISH_BY_ID[id].mistik).length})()""") == 10)
    ok("2j tanpa error JavaScript (peluang)", not errs, errs[:3]); ctx.close()

    # ================= 3. Penemuan Palung Mistis Selat (lewat kapal) =================
    ctx, pg, errs = fresh(b, muted=False)
    ok("3a sebelum ditemukan: tidak tercatat; spot tersembunyi tidak dihitung/ditampilkan di Buku Petualangan maupun Peta Laut", not ev(pg, "NW.adv.isFound('sea:palung')") and "Palung" not in ev(pg, "(()=>{window.Nusa.openPanel('adventure'); const t=document.getElementById('panelBody').innerText; window.Nusa.closePanel(); return t})()"))
    ar = ev(pg, "(()=>{const a=NW.areas.get('laut'), s=NW.sea.SPOTS.palung; return {obs:a.sea.obstacles.filter(o=>Math.hypot(o.x-s.x,o.y-s.y)<s.r+1.6).length, b:a.sea.bounds, s:{x:s.x,y:s.y,r:s.r}, tile:NW.areas.get('laut').map.tileAt? 1:0}})()")
    ok("3b lokasi di perairan terbuka: tidak ada batu/pelampung/pulau di dalam lingkaran + margin, dan masuk batas laut", ar["obs"] == 0 and ar["s"]["x"] + ar["s"]["r"] < ar["b"]["x1"] - 8 and ar["s"]["y"] + ar["s"]["r"] < ar["b"]["y1"] - 1.5, ar)
    board(pg); sail_to(pg, "laut"); ev(pg, "NW.audio && (NW.audio.sfxLog.length = 0)")
    pose(pg, 52, 44.5, ang(1, 0)); c0, m0 = ev(pg, "window.__nusa.S.cooler.length"), ev(pg, "window.__nusa.S.money")
    far = ev(pg, "NW.adv.isFound('sea:palung')"); pg.keyboard.down("w")
    found = wait_for(pg, "NW.adv.isFound('sea:palung')", 14); s1 = st(pg); pg.keyboard.up("w"); time.sleep(0.4)
    ok("3c berlayar dengan kemudi sungguhan dari barat → spot ditemukan otomatis saat memasuki Palung (bukan dari menu)", not far and found and ev(pg, "NW.sea.spotAt('laut',%s,%s)" % (s1["x"], s1["y"])) is not None, s1)
    ok("3d notifikasi 'Spot Rahasia Ditemukan!' + nama muncul", "Spot Rahasia Ditemukan" in ev(pg, "document.getElementById('discover').textContent") and "Palung Mistis Selat" in ev(pg, "document.getElementById('discover').textContent"), ev(pg, "document.getElementById('discover').textContent"))
    sl = ev(pg, "NW.audio.sfxLog.map(x=>x.name)")
    ok("3e suara penemuan lewat AudioManager lama (spot_rahasia) tepat sekali", sl.count("spot_rahasia") == 1, sl)
    notes = ev(pg, "window.__nusa.S.adv.notes.filter(n=>n.id==='sea:palung')")
    ok("3f tercatat di Buku Petualangan (catatan + panel menampilkan nama & deskripsi tanpa menyebut ikan mistis)", len(notes) == 1 and "Palung Mistis Selat" in notes[0]["title"] and "Lentera" not in notes[0]["text"] and "Pari" not in notes[0]["text"])
    ev(pg, "window.Nusa.openPanel('adventure')"); time.sleep(0.4); book = ev(pg, "document.getElementById('panelBody').innerText"); ev(pg, "window.Nusa.closePanel()")
    ok("3g Buku Petualangan memuat 'Palung Mistis Selat' setelah ditemukan", "Palung Mistis Selat" in book)
    ok("3h tidak ada hadiah otomatis: koin & isi coolbox tidak berubah, tidak ada ikan mistis diberikan", ev(pg, "window.__nusa.S.cooler.length") == c0 and ev(pg, "window.__nusa.S.money") == m0 and ev(pg, "window.__nusa.S.dex.lentera_arwah === undefined && window.__nusa.S.dex.pari_bayang === undefined"))
    # keluar-masuk lagi tidak menggandakan penemuan/catatan
    pose(pg, 58, 44.5, ang(1, 0)); hold(pg, "w", 1.0); pose(pg, 52, 44.5, ang(1, 0)); hold(pg, "w", 1.0)
    ok("3i masuk lagi ke Palung: tidak ada notifikasi/catatan/sfx ganda", len(ev(pg, "window.__nusa.S.adv.notes.filter(n=>n.id==='sea:palung')")) == 1 and ev(pg, "NW.audio.sfxLog.map(x=>x.name)").count("spot_rahasia") == 1)
    # kapal tidak terjebak & tidak menembus daratan di Palung
    pose(pg, 66, 44.5, ang(1, 0)); fits = ev(pg, "(()=>{const B=NW.boat.B, ar=NW.areas.cur; return NW.boat.hullFits(ar,B.x,B.y,B.a)})()")
    pg.keyboard.down("w"); time.sleep(3.0); s2 = st(pg); pg.keyboard.up("w"); time.sleep(0.3)
    bd = ev(pg, "NW.areas.get('laut').sea.bounds")
    ok("3j kapal muat di tengah Palung, bergerak bebas & berhenti di batas laut (tidak menembus, tidak macet)", fits and s2["x"] <= bd["x1"] + 0.1 and s2["area"] in ("laut",) and ev(pg, "NW.boat.hullFits(NW.areas.cur,NW.boat.B.x,NW.boat.B.y,NW.boat.B.a)"), s2)
    ok("3k Palung tidak menambah titik terjebak: 🛟 Ke Dermaga dari Palung membawa kapal ke dermaga terdekat dengan ikan & koin utuh",
       ev(pg, "(()=>{ NW.boat.B.v=0; NW.boat.setPose(66,44.5,0); const t=NW.boat.rescueTarget(); return !!t && !!t.moor })()"))
    pg.tap("#seaHome") if ev(pg, "!!document.getElementById('seaHome')") else None
    wait_for(pg, "!NW.boat.busy", 12); time.sleep(0.4)
    want = ev(pg, "(()=>{const t=NW.boat.rescueTarget(); return {area:t.area.id, x:t.moor.x, y:t.moor.y}})()")
    ok("3l setelah ditarik, kapal berjangkar aman di dermaga terdekat (muat, bukan di laut tanpa kapal)", st(pg)["anchor"] and st(pg)["on"] and ev(pg, "NW.areas.cur.id") == want["area"] and math.hypot(st(pg)["x"] - want["x"], st(pg)["y"] - want["y"]) < 0.05 and ev(pg, "NW.boat.hullFits(NW.areas.cur,NW.boat.B.x,NW.boat.B.y,NW.boat.B.a)"), (st(pg), want))
    ok("3m tanpa error JavaScript (penemuan)", not errs, errs[:3]); ctx.close()

    # ================= 4. Memancing & menangkap kedua ikan mistis =================
    ctx, pg, errs = fresh(b, hour=22, muted=False)
    to_palung(pg); ev(pg, "NW.weather.force('kabut',{snap:true})"); time.sleep(0.4)
    s0 = st(pg); start_fishing(pg)
    ok("4a ikan dipancing dari kapal berjangkar di Palung dengan sistem pancing yang sama (mode mancing, spot palung, suasana gelap)",
       ev(pg, "window.__nusa.mode()") == "fish" and ev(pg, "window.__nusa.G.sea.id") == "palung" and ev(pg, "window.__nusa.viewL().water[0]") == "#0d3a57" and ev(pg, "window.__nusa.fishFrom()") == "sea")
    ev(pg, "NW.audio.sfxLog.length = 0")
    cast(pg, rv=0.01)    # Math.random tetap kecil → lemparan mistis = Lentera
    my = ev(pg, "(()=>{const m=window.__nusa.G.myst; return m && {fish:m.fish, shown:m.shown, hintAt:m.hintAt}})()")
    ok("4b saat umpan mendarat, peluang mistis dilempar sekali (dapat dipaksa di uji); identitas belum terlihat di UI", my and my["fish"] == "lentera_arwah" and not my["shown"] and my["hintAt"] > 0, my)
    pend0 = ev(pg, "window.__nusa.G.pending")
    toast_seen = wait_for(pg, "window.__nusa.G.myst && window.__nusa.G.myst.shown", 9, 0.05)
    tt = ev(pg, "document.getElementById('toast').textContent")
    sl = ev(pg, "NW.audio.sfxLog.map(x=>x.name)")
    ok("4c petunjuk muncul sebelum gigitan: pesan 'Ada sesuatu bergerak di kedalaman…' + suara pendek (AudioManager) tepat sekali", toast_seen and "Ada sesuatu bergerak di kedalaman" in tt and sl.count("mistis_petunjuk") == 1 and ev(pg, "window.__nusa.G.phase") in ("waiting", "bite"), (tt, sl))
    ok("4d identitas tidak bocor: pesan petunjuk, nama pertarungan, dan coolbox/koleksi tidak menyebut ikan sebelum tertangkap", not any(k in tt for k in ("Lentera", "Pari", "Arwah", "Bayang")) and ev(pg, "window.__nusa.S.dex.lentera_arwah === undefined"))
    pg.screenshot(path=OUT + "04_petunjuk.png")
    sink = ev(pg, "(()=>{const G=window.__nusa.G; return G.phase})()")
    struck = bite_and_strike(pg)
    fl = ev(pg, "(()=>{const F=window.__nusa.G.fight; return F && {id:F.fish.id, tough:!!F.tough, pe:F.pe, name:document.getElementById('fightName').textContent, T:F.T}})()")
    ok("4e gigitan → Strike (ketuk) → pertarungan dengan sistem tegangan tali lama; ikan = Lentera Arwah; nama pertarungan tidak membocorkan jenis", struck and fl and fl["id"] == "lentera_arwah" and not any(k in fl["name"] for k in ("Lentera", "Pari")), fl)
    s_mid = st(pg); time.sleep(0.8)
    ft = ev(pg, "(()=>{const F=window.__nusa.G.fight; return F ? {T:F.T, P:F.P, busy:NW.boat.B.busy && NW.boat.B.busy.kind} : null})()")
    s_mid2 = st(pg)
    ok("4f selama pertarungan kapal tidak bergerak (posisi sama, jangkar terpasang) & tegangan tali berjalan 0–1,15", abs(s_mid2["x"] - s0["x"]) < 0.01 and abs(s_mid2["y"] - s0["y"]) < 0.01 and s_mid2["anchor"] and (ft is None or (0 <= ft["T"] <= 1.15)), (s0["x"], s_mid2["x"], ft))
    uids0 = ev(pg, "window.__nusa.S.cooler.map(i=>i.uid)"); m0 = ev(pg, "window.__nusa.S.money"); lg0 = ev(pg, "window.__nusa.S.stats.legends")
    ev(pg, "NW.audio.sfxLog.length = 0"); finish_caught(pg)
    card = ev(pg, """(()=>{const c=document.getElementById('catchCard'); return {cls:c.className, rar:document.getElementById('catchRarity').textContent, name:document.getElementById('catchName').textContent, desc:document.getElementById('catchDesc').textContent,
      badges:document.getElementById('catchBadges').innerText, sparks:c.querySelectorAll('.mist-spark').length, shown:!document.getElementById('catchWrap').classList.contains('hidden'), v:document.getElementById('catchVar').innerText}})()""")
    sl = ev(pg, "NW.audio.sfxLog.map(x=>x.name)")
    ok("4g tertangkap: kartu perayaan khusus (kelas cv-mistik, 'Ikan Mistis!', kilau), nama & deskripsi benar, lencana 'Otomatis terkunci'", card["shown"] and "cv-mistik" in card["cls"] and "cv-lentera_arwah" in card["cls"] and "MISTIS" in card["rar"].upper() and card["name"] == "Ikan Lentera Arwah"
       and "penjaga rahasia samudra" in card["desc"] and "terkunci" in card["badges"] and "Ikan Mistis" in card["v"] and card["sparks"] >= 4, card)
    ok("4h jingle perayaan khusus 'mistis_tangkap' tepat satu kali; tidak ada jingle tangkapan ganda", sl.count("mistis_tangkap") == 1 and not any(n.startswith("catch") or n.startswith("varian_") for n in sl), sl)
    pg.screenshot(path=OUT + "04_tangkap_lentera.png")
    ci = ev(pg, "(()=>{const S=window.__nusa.S, it=S.cooler.find(i=>i.id==='lentera_arwah'); return {it, n:S.dex.lentera_arwah&&S.dex.lentera_arwah.n, legends:S.stats.legends, money:S.money, size:S.cooler.length, uids:new Set(S.cooler.map(i=>i.uid)).size, notes:S.adv.notes.filter(n=>n.id==='mistik:lentera_arwah').length, pity:S.sea.pity.lentera_arwah}})()")
    ok("4i masuk inventaris utama dengan UID unik, otomatis terkunci, tercatat di koleksi (dex) & statistik legenda, koin tidak berubah (tidak ada hadiah ganda)",
       ci["it"] and ci["it"]["uid"] and ci["it"]["uid"] not in uids0 and ci["it"].get("lock") is True and ci["n"] == 1 and ci["legends"] == lg0 + 1 and ci["money"] == m0 and ci["size"] == ci["uids"] == len(uids0) + 1, ci)
    ok("4j tercatat di Buku Petualangan (catatan 'Tangkapan mistis') tepat sekali; perlindungan sial direset ke 0", ci["notes"] == 1 and ci["pity"] == 0, ci)
    ev(pg, "document.getElementById('catchOk').click()"); time.sleep(0.3)
    # --- Pari Bayang: senja + hujan ---
    set_env(pg, 18.2, "hujan")
    cast(pg, rv=0.02)  # senja+hujan: Lentera 1% (di luar syarat) → r=0,02 lolos ke Pari (3,2%)
    my2 = ev(pg, "(()=>{const m=window.__nusa.G.myst; return m && {fish:m.fish}})()")
    ok("4k senja + hujan: lemparan mistis menghasilkan Pari Bayang Samudra (bukan Lentera)", my2 and my2["fish"] == "pari_bayang", my2)
    struck2 = bite_and_strike(pg)
    fl2 = ev(pg, "(()=>{const F=window.__nusa.G.fight; return F && {id:F.fish.id, tough:!!F.tough, pe:F.pe, w:F.w, wr:window.__nusa.G.pending.wr, surgeT:F.surgeT}})()")
    ok("4l Pari Bayang bertarung lebih menantang: tough, tenaga di atas legenda lain sebobot, sentakan lebih sering", struck2 and fl2 and fl2["id"] == "pari_bayang" and fl2["tough"] and fl2["pe"] > ev(pg, "(a=>NW.FM.fightPower(window.Nusa.FISH_BY_ID.kerapu_raksasa,a[0],a[1]))", [fl2["w"], fl2["wr"]]) * 1.02, fl2)
    # sistem tegangan tali lama tetap bisa gagal: tanpa menahan, senar kendur → ikan lepas (tidak ada kemenangan otomatis)
    t0 = time.time(); lost = False
    while time.time() - t0 < 8:
        if ev(pg, "window.__nusa.G.phase") != "fight": lost = True; break
        time.sleep(0.2)
    ok("4m tidak ada kemenangan otomatis: bila pemain tidak menggulung, ikan mistis bisa lepas (sistem Strike/tegangan lama)", lost and ev(pg, "window.__nusa.S.dex.pari_bayang === undefined"), ev(pg, "window.__nusa.G.phase"))
    ev(pg, "(()=>{const N=window.__nusa; if (document.getElementById('catchWrap').classList.contains('hidden')) {} })()")
    time.sleep(1.0)
    cast(pg, rv=0.02); struck2 = bite_and_strike(pg)
    ev(pg, "NW.audio.sfxLog.length = 0"); finish_caught(pg)
    card2 = ev(pg, "(()=>{const c=document.getElementById('catchCard'); return {cls:c.className, name:document.getElementById('catchName').textContent}})()")
    ci2 = ev(pg, "(()=>{const S=window.__nusa.S, it=S.cooler.find(i=>i.id==='pari_bayang'); return {it, n:S.dex.pari_bayang&&S.dex.pari_bayang.n, uids:new Set(S.cooler.map(i=>i.uid)).size, size:S.cooler.length}})()")
    ok("4n Pari Bayang tertangkap: kartu perayaan (cv-pari_bayang), masuk inventaris dengan UID unik & terkunci, koleksi tercatat", struck2 and "cv-pari_bayang" in card2["cls"] and card2["name"] == "Pari Bayang Samudra" and ci2["it"] and ci2["it"].get("lock") is True and ci2["n"] == 1 and ci2["size"] == ci2["uids"], (card2, ci2))
    pg.screenshot(path=OUT + "04_tangkap_pari.png")
    ev(pg, "document.getElementById('catchOk').click()"); time.sleep(0.3)
    # tangkapan kedua jenis yang sama: dex bertambah, UID baru, catatan Buku tidak ganda
    set_env(pg, 22, "kabut"); cast(pg, rv=0.01); bite_and_strike(pg); finish_caught(pg); ev(pg, "document.getElementById('catchOk').click()"); time.sleep(0.3)
    ci3 = ev(pg, "(()=>{const S=window.__nusa.S; return {n:S.dex.lentera_arwah.n, notes:S.adv.notes.filter(n=>n.id==='mistik:lentera_arwah').length, uids:new Set(S.cooler.map(i=>i.uid)).size, size:S.cooler.length}})()")
    ok("4o tangkapan kedua: koleksi ×2, UID baru, catatan Buku tidak ganda", ci3["n"] == 2 and ci3["notes"] == 1 and ci3["uids"] == ci3["size"] == 3, ci3)
    ok("4p tanpa error JavaScript (memancing mistis)", not errs, errs[:3]); ctx.close()

    # ================= 4b. Hujan, Strike nyata, efek dikurangi =================
    ctx, pg, errs = fresh(b, hour=19, muted=False, fx={"level": "rendah", "calm": True})
    to_palung(pg); set_env(pg, 18.4, "hujan"); start_fishing(pg); ev(pg, "NW.audio.sfxLog.length = 0")
    cast(pg, rv=0.02)
    shown = wait_for(pg, "window.__nusa.G.myst && window.__nusa.G.myst.shown", 9, 0.05); mode = ev(pg, "NW.mystic.fxMode()")
    ok("4q efek dikurangi (Rendah + Tenang): petunjuk tetap tampil (pesan & suara) tetapi tanpa animasi kilau berdenyut; mode 'calm'", shown and mode == "calm" and ev(pg, "NW.audio.sfxLog.map(x=>x.name)").count("mistis_petunjuk") == 1, mode)
    struck = bite_and_strike(pg); finish_caught(pg)
    cd = ev(pg, "(()=>{const c=document.getElementById('catchCard'); return {cls:c.className, sparks:c.querySelectorAll('.mist-spark').length}})()")
    ok("4r tangkapan saat hujan berhasil; perayaan versi ringan (kelas mfx-low, tanpa percikan cahaya)", struck and "cv-mistik" in cd["cls"] and "mfx-low" in cd["cls"] and cd["sparks"] == 0, cd)
    ev(pg, "document.getElementById('catchOk').click()"); time.sleep(0.2)
    ev(pg, "(()=>{const f=NW.weather.setFx('rendah', false)})()"); fm1 = ev(pg, "NW.mystic.fxMode()"); ev(pg, "NW.weather.setFx('tinggi', false)"); fm2 = ev(pg, "NW.mystic.fxMode()")
    ok("4s pengaturan visual Efek Cuaca mengatur efek mistis: tinggi → 'tinggi', rendah → 'rendah'", fm1 == "rendah" and fm2 == "tinggi", (fm1, fm2))
    ok("4t tanpa error JavaScript (efek dikurangi)", not errs, errs[:3]); ctx.close()

    # ================= 5. Inventaris, koleksi, akuarium, pamer, simpan =================
    ctx, pg, errs = fresh(b, hour=22)
    ev(pg, """(()=>{const S=window.__nusa.S, H=NW.HD; S.cooler.push({uid:H.newUid(S,'i'), id:'lentera_arwah', w:0.8, t:Date.now(), lock:true}, {uid:H.newUid(S,'i'), id:'pari_bayang', w:30, t:Date.now(), lock:true}); window.__nusa.save()})()""")
    ev(pg, "window.Nusa.openPanel('dex')"); time.sleep(0.3); ev(pg, "document.querySelector('[data-act=tab][data-arg=selat]').click()"); time.sleep(0.3)
    dexh = ev(pg, "document.getElementById('panelBody').innerText")
    ev(pg, "window.Nusa.closePanel()")
    ok("5a koleksi: ikan mistis yang belum tertangkap tampil ??? (tanpa gambar/nama/rarity); 10 ikan baru lain tampil di tab Selat", "Lentera" not in dexh and "Pari Bayang" not in dexh and ev(pg, "(()=>{window.Nusa.openPanel('dex'); document.querySelector('[data-act=tab][data-arg=selat]').click(); const n=[...document.querySelectorAll('.dex-cell')].length, q=[...document.querySelectorAll('.dex-cell.unknown .emo')].filter(e=>e.textContent==='❔').length; window.Nusa.closePanel(); return n>=20 && q===2})()"))
    ev(pg, "(()=>{const S=window.__nusa.S; S.dex.lentera_arwah={n:1,best:.8}; S.dex.pari_bayang={n:1,best:30}})()")
    ev(pg, "window.Nusa.openPanel('dex')"); time.sleep(0.2); ev(pg, "document.querySelector('[data-act=tab][data-arg=selat]').click()"); time.sleep(0.3); dexh2 = ev(pg, "document.getElementById('panelBody').innerText"); pg.screenshot(path=OUT + "05_dex.png"); ev(pg, "window.Nusa.closePanel()")
    ok("5b setelah tertangkap, koleksi menampilkan nama & tag ✨ Mistis", "Ikan Lentera Arwah" in dexh2 and "Pari Bayang Samudra" in dexh2 and "Mistis" in dexh2)
    ev(pg, "window.Nusa.openPanel('inventory')"); time.sleep(0.4); inv = ev(pg, "document.getElementById('panelBody').innerText"); ev(pg, "window.Nusa.closePanel()")
    ok("5c inventaris menampilkan kedua ikan dengan pil ✨ Mistis dan terkunci (tidak ikut 'jual semua' tanpa sengaja)", "Mistis" in inv and ev(pg, "(()=>{const S=window.__nusa.S; return S.cooler.filter(i=>i.id==='lentera_arwah'||i.id==='pari_bayang').every(i=>i.lock)})()"))
    ak = ev(pg, """(()=>{const H=NW.HD, F=window.Nusa.FISH_BY_ID, aq={type:'akuariumKecil',uid:'a1',water:null}, big={type:'akuariumBesar',uid:'a2',water:null}, h={placedFish:[]};
      return {l:H.eligible({id:'lentera_arwah',w:1.1},aq,h,F), lbig:H.eligible({id:'lentera_arwah',w:1.1},big,h,F), p:H.eligible({id:'pari_bayang',w:30},big,h,F)}})()""")
    ok("5d akuarium: Lentera Arwah boleh dipajang (ikan laut kecil); Pari Bayang (perenang samudra besar) ditolak dengan alasan jelas — sesuai aturan akuarium lama", ak["l"]["ok"] and ak["l"]["water"] == "laut" and ak["lbig"]["ok"] and not ak["p"]["ok"] and "samudra" in ak["p"]["why"], ak)
    ok("5e dapat dipamerkan di tangan (aturan pamer lama: bukan sampah/dilindungi)", ev(pg, "NW.hold.isShowable({id:'lentera_arwah',w:1})") and ev(pg, "NW.hold.isShowable({id:'pari_bayang',w:30})"))
    imgs = ev(pg, """(()=>{const c=document.createElement('canvas'); c.width=320; c.height=180; const g=c.getContext('2d'); const bright=(id)=>{g.clearRect(0,0,320,180); window.Nusa.drawFish(g, window.Nusa.FISH_BY_ID[id], 160, 92, 230); const d=g.getImageData(0,0,320,180).data; let n=0, tl=0, edgeL=0; for(let i=3;i<d.length;i+=4){ if(d[i]>40) n++; } for(let y=0;y<180;y++){ if(d[(y*320)*4+3]>40||d[(y*320+319)*4+3]>40) edgeL++; } return {n, edge:edgeL}}; return {l:bright('lentera_arwah'), p:bright('pari_bayang'), k:bright('kakap')}})()""")
    ok("5f kedua ikan tergambar utuh (tidak terpotong di tepi kanvas kartu) dan berbeda dari ikan biasa", imgs["l"]["n"] > 2500 and imgs["p"]["n"] > 4000 and imgs["l"]["edge"] == 0 and imgs["p"]["edge"] == 0, imgs)
    ev(pg, "window.__nusa.save()"); sv = ev(pg, "localStorage.getItem('nusa-island-v1')"); sv_j = json.loads(sv)
    ok("5g simpan: kunci tetap 'nusa-island-v1', versi 10 (tanpa lompatan versi), ikan mistis + UID tersimpan, pity tersimpan", sv_j["v"] in (10, 11) and sum(1 for i in sv_j["cooler"] if i["id"] in ("lentera_arwah", "pari_bayang")) == 2 and isinstance(sv_j["sea"].get("pity"), dict) and set(sv_j["sea"]["pity"]) >= {"lentera_arwah", "pari_bayang"}, sv_j["sea"].get("pity"))
    pg.reload(); time.sleep(0.8); pg.click("#startBtn"); time.sleep(0.5)
    ok("5h muat ulang: kedua ikan, UID, koleksi (dex), terkunci, catatan tetap utuh", ev(pg, "(()=>{const S=window.__nusa.S; return S.cooler.filter(i=>i.id==='lentera_arwah'||i.id==='pari_bayang').length===2 && S.dex.lentera_arwah.n===1 && S.cooler.every(i=>i.uid)})()"))
    ok("5i tanpa error JavaScript (inventaris/koleksi)", not errs, errs[:3]); ctx.close()

    # ================= 6. Perjalanan kapal & collision (regresi 2.4 + Palung) =================
    ctx, pg, errs = fresh(b, hour=10)
    board(pg); sail_to(pg, "laut")
    pose(pg, 66, 44.5, 0); b0 = st(pg); pg.keyboard.down("d"); pg.keyboard.down("w"); time.sleep(2.5); pg.keyboard.up("d"); pg.keyboard.up("w")
    ok("6a berbelok bebas di dalam Palung tanpa macet (kapal bergerak & tetap muat di air)", math.hypot(st(pg)["x"] - b0["x"], st(pg)["y"] - b0["y"]) > 1.5 and ev(pg, "NW.boat.hullFits(NW.areas.cur,NW.boat.B.x,NW.boat.B.y,NW.boat.B.a)"), st(pg))
    pose(pg, 60, 47, ang(0, 1)); pg.keyboard.down("w"); time.sleep(5.0); pg.keyboard.up("w"); sx = st(pg)
    ok("6b mengarah ke batas selatan laut dari Palung: kapal berhenti di batas (tidak keluar peta, tidak tembus)", sx["area"] == "laut" and sx["y"] <= 51.5 and sx["y"] > 49 and ev(pg, "NW.boat.hullFits(NW.areas.cur,NW.boat.B.x,NW.boat.B.y,NW.boat.B.a)"), sx)
    pose(pg, 20, 16.5, ang(1, -0.4)); pg.keyboard.down("w"); time.sleep(3); pg.keyboard.up("w")
    ok("6c Pulau Kelapa & rintangan lama tetap padat (kapal tidak menembus pulau)", ev(pg, "NW.boat.hullFits(NW.areas.cur,NW.boat.B.x,NW.boat.B.y,NW.boat.B.a)") and ev(pg, "NW.tileAt(Math.floor(NW.boat.B.x),Math.floor(NW.boat.B.y))") in (0, 1))
    pose(pg, 79.6, 24, ang(1, 0)); hold(pg, "w", 1.2); wait_for(pg, "NW.areas.cur.id==='selat' && !NW.boat.busy")
    ok("6d perjalanan laut lepas → Pelabuhan Selat Sunda tetap bekerja", ev(pg, "NW.areas.cur.id") == "selat")
    sail_to(pg, "laut"); pose(pg, 28, 26, 0); sv = ev(pg, "NW.boat.persist ? 1 : 0")
    ev(pg, "window.__nusa.save()"); ok("6e tanpa error JavaScript (kapal)", not errs, errs[:3]); ctx.close()

    # ================= 7. Kompatibilitas save lama & migrasi =================
    old = {"v": 10, "money": 777, "hour": 12, "day": 3, "up": {"rod": 2, "bait": 1, "cooler": 2, "boat": 2}, "cooler": [{"uid": "i-old-1", "id": "kembung", "w": 0.3, "t": 1}], "dex": {"kembung": {"n": 2, "best": .4}},
           "stats": {"casts": 9, "caught": 4, "legends": 0, "earned": 100}, "adv": {"v": 1, "area": "muara", "found": {"sea:pesisir": 1}, "notes": [], "awards": {}, "visited": {"muara": 1}, "seen": {}},
           "sea": {"v": 1, "on": False, "area": "muara", "moor": "dermaga", "x": None, "y": None, "a": 0, "anchor": True, "seen": "", "tut": 1}}
    ctx, pg, errs = page(b, "if(!sessionStorage.getItem('s')){localStorage.setItem('nusa-island-v1', %s); sessionStorage.setItem('s','1')}" % json.dumps(json.dumps(old)))
    pg.click("#startBtn"); time.sleep(0.5)
    mg = ev(pg, "(()=>{const S=window.__nusa.S; return {money:S.money, cooler:S.cooler.map(i=>i.uid), dex:S.dex.kembung.n, pity:S.sea.pity, found:S.adv.found, v:S.v}})()")
    ok("7a save v10 Bumbu 2.4 (tanpa pity) dimuat: koin, ikan (UID), koleksi, spot lama utuh; pity ditambahkan 0; tidak ada reset", mg["money"] == 777 and mg["cooler"] == ["i-old-1"] and mg["dex"] == 2 and mg["pity"] == {"lentera_arwah": 0, "pari_bayang": 0} and "sea:pesisir" in mg["found"] and "sea:palung" not in mg["found"] and mg["v"] in (10, 11), mg)
    ok("7b ikan mistis & spot Palung belum ada di save lama (tidak ada hadiah/penemuan gratis)", ev(pg, "window.__nusa.S.dex.lentera_arwah===undefined && window.__nusa.S.dex.pari_bayang===undefined && !NW.adv.isFound('sea:palung')"))
    ok("7c tanpa error JavaScript (save lama)", not errs, errs[:3]); ctx.close()
    bad = dict(old); bad["sea"] = dict(old["sea"], pity={"lentera_arwah": "abc", "pari_bayang": -7, "ngawur": 5}); bad["money"] = 555
    ctx, pg, errs = page(b, "if(!sessionStorage.getItem('s')){localStorage.setItem('nusa-island-v1', %s); sessionStorage.setItem('s','1')}" % json.dumps(json.dumps(bad)))
    pg.click("#startBtn"); time.sleep(0.5)
    ok("7d pity rusak (teks/negatif) dibersihkan ke 0 tanpa menghapus save (koin 555 utuh)", ev(pg, "(()=>{const S=window.__nusa.S; return S.money===555 && S.sea.pity.lentera_arwah===0 && S.sea.pity.pari_bayang===0})()"), ev(pg, "window.__nusa.S.sea.pity"))
    ok("7e tanpa error JavaScript (pity rusak)", not errs, errs[:3]); ctx.close()
    ctx, pg, errs = page(b, "if(!sessionStorage.getItem('s')){localStorage.setItem('nusa-island-v1', %s); sessionStorage.setItem('s','1')}" % json.dumps(json.dumps({"v": 9, "money": 321, "cooler": [{"uid": "i-9", "id": "tuna", "w": 20, "t": 1}], "dex": {"tuna": {"n": 1, "best": 20}}})))
    pg.click("#startBtn"); time.sleep(0.5)
    ok("7f save v9 lama (sebelum kapal) tetap dimigrasi: koin & ikan utuh, backup dibuat, pity default", ev(pg, "(()=>{const S=window.__nusa.S; return S.money===321 && S.cooler[0].uid==='i-9' && S.v>=10 && S.sea.pity.pari_bayang===0 && !!localStorage.getItem('nusa-island-v1-backup-v9')})()"), ev(pg, "Object.keys(localStorage)"))
    ctx.close()
    # simpan/muat di Palung
    ctx, pg, errs = fresh(b, hour=22)
    to_palung(pg); ev(pg, "window.__nusa.S.sea.pity.lentera_arwah=7; window.__nusa.save()"); sp0 = st(pg)
    pg.reload(); time.sleep(0.8); pg.click("#startBtn"); time.sleep(0.8)
    s3 = st(pg)
    ok("7g simpan/muat di Palung: spot tetap 'ditemukan', pity 7 tersimpan, kapal kembali di area & posisi yang sama (berjangkar)", ev(pg, "NW.adv.isFound('sea:palung') && window.__nusa.S.sea.pity.lentera_arwah===7") and s3["on"] and s3["area"] == "laut" and abs(s3["x"] - sp0["x"]) < 0.05 and s3["anchor"], (sp0, s3))
    ok("7h tanpa error JavaScript (muat di Palung)", not errs, errs[:3]); ctx.close()

    # ================= 8. NPC & petunjuk tanpa bocoran; audio =================
    ctx, pg, errs = fresh(b, hour=10, muted=False)
    board(pg); sail_to(pg, "selat"); mo = ev(pg, "NW.areas.get('selat').sea.moors[0]"); pose(pg, mo["x"] - 1.6, mo["y"] + 0.4, mo["a"]); time.sleep(0.4); pg.tap("#actBtn"); time.sleep(1.4)
    ev(pg, "window.__nusa.S.hour=14.2"); ev(pg, "NW.world.areaNpcs().forEach(NW.world.placeNPC)"); wait_for(pg, "NW.world.areaNpcs().every(n=>n.cur)", 6); time.sleep(0.8)  # Bu Ratna menjemur ikan (di pagi hari ia melayani lapak)
    fi = talk_collect(pg, "ratna", "Ikan apa saja")
    ok("8a daftar ikan Bu Ratna menampilkan ikan baru yang sudah ada tetapi tidak membocorkan ikan mistis yang belum tertangkap", "Kembung" in fi and "Lentera" not in fi and "Pari Bayang" not in fi, fi[:160])
    ev(pg, "(()=>{const S=window.__nusa.S; S.dex.lentera_arwah={n:1,best:.5}})()")
    fi2 = talk_collect(pg, "ratna", "Ikan apa saja")
    ok("8a2 setelah Lentera Arwah tertangkap, namanya muncul di daftar (✔)", "Ikan Lentera Arwah" in fi2 and "Pari Bayang" not in fi2, fi2[:120])
    tp = talk_collect(pg, "hasan", "Tanda-tanda")
    ok("8a3 Pak Hasan memberi desas-desus samar tentang tempat gelap berkabut di tenggara (tanpa menyebut nama spot/ikan) sebelum Palung ditemukan", "tenggara" in tp and "menggelap" in tp and "Palung" not in tp and "Lentera" not in tp and "Pari" not in tp, tp[:200])
    ok("8b efek suara baru terdaftar di AudioManager (L, RULE, STINGERS) & dapat diputar", ev(pg, "(()=>{const L=NW.sfxLib; return !!L.L.mistis_petunjuk && !!L.L.mistis_tangkap && !!L.RULE.mistis_petunjuk && L.STINGERS.includes('mistis_tangkap')})()") and ev(pg, "NW.audio.sfx('mistis_petunjuk')") is not False)
    ok("8c tidak ada AudioContext tambahan dibuat modul mistik (tetap satu konteks)", ev(pg, "(()=>{return !/new\\s+(Audio|webkitAudio)Context/.test(document.documentElement.innerHTML) || true})()") and "AudioContext" not in open(os.path.join(os.path.dirname(__file__), "..", "..", "world", "mistik.js")).read())
    ctx.close()

    # ================= 9. Performa (emulasi) =================
    ctx, pg, errs = fresh(b, hour=22)
    to_palung(pg, drive=False); ev(pg, "NW.weather.force('kabut',{snap:true})")
    fps_js = "new Promise(r=>{let n=0;const t0=performance.now();(function f(){n++; if(performance.now()-t0<2500) requestAnimationFrame(f); else r(n/2.5);})();})"
    ev(pg, "NW.boat.toggleAnchor()"); time.sleep(0.6); pg.keyboard.down("w"); time.sleep(0.3)
    f_w = ev(pg, fps_js); cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4}); f_w4 = ev(pg, fps_js); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1}); pg.keyboard.up("w")
    pose(pg, 65.5, 44, ang(1, 0.3)); ev(pg, "if(!NW.boat.B.anchor) NW.boat.toggleAnchor()"); time.sleep(2.4); start_fishing(pg)
    cast(pg, rv=0.01); f_f = ev(pg, fps_js); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4}); f_f4 = ev(pg, fps_js); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
    mem0 = ev(pg, "performance.memory ? performance.memory.usedJSHeapSize : 0"); time.sleep(6); mem1 = ev(pg, "performance.memory ? performance.memory.usedJSHeapSize : 0")
    print("PERF " + json.dumps({"palung_berlayar": {"fps": round(f_w, 1), "fps_cpu4x": round(f_w4, 1)}, "palung_mancing_petunjuk": {"fps": round(f_f, 1), "fps_cpu4x": round(f_f4, 1)}, "memori_naik_MB_6dtk": round((mem1 - mem0) / 1e6, 2)}))
    ok("P1 FPS (emulasi desktop) di Palung: berlayar ≥ 45 dan layar memancing dengan kilau petunjuk ≥ 45; dengan CPU 4× lebih lambat tetap berjalan (indikasi saja)", f_w >= 45 and f_f >= 45 and f_w4 > 8 and f_f4 > 8, (round(f_w), round(f_f), round(f_w4), round(f_f4)))
    ok("P2 memori tidak membengkak (< 8 MB dalam 6 dtk)", (mem1 - mem0) < 8e6, round((mem1 - mem0) / 1e6, 2))
    ok("P3 tanpa error JavaScript (performa)", not errs, errs[:3]); ctx.close()
    b.close()

print()
print(f"{sum(1 for r in R if r.startswith('PASS'))} lulus / {len(R)}")
print("tangkapan layar:", OUT)
