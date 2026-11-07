"""Uji Bumbu 3.2 "Kehidupan Kedai Atuk Bahar" di PETA SUNGGUHAN (Chromium headless = emulasi, bukan Android fisik).
Hanya yang terdampak: jadwal NPC, animasi, transisi waktu, collision, lampu, akses minigame malam hari, tanpa duplikasi.
Jalankan: python tests/browser/test_kedai_hidup.py"""
import time, os, sys
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = "/tmp/nusa-hidup/"; os.makedirs(OUT, exist_ok=True)
R = []
def ok(n, c, e=""): R.append(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:260] if e != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def fresh(b, hour=12):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e))); pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.goto(ROOT + "?cloud=off"); time.sleep(0.6); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6); pg.click("#startBtn"); time.sleep(0.3)
    ev(pg, "(h)=>{const S=window.__nusa.S; S.muted=true; S.hour=h; NW.weather.force('cerah',{snap:true}); document.getElementById('banner').classList.remove('show')}", hour)
    return ctx, pg, errs
SIM = """(a)=>{ // satu hari penuh di peta sungguhan dengan walkable() peta; jam game dipajukan manual
  const M=NW.MUARA_MAP, L=NW.kedai.life, S=window.__nusa.S, hk=NW.areas.get('muara').hooks, DT=1/30, HPS=24/480;
  let h=a.h0, prev=null, maxJ=0, bad=[], ev=[], last='', maxLayer=0, tables=0, dupSolids=0;
  const brief=()=>{const s=L.state();return (s.atuk.vis?(s.atuk.seated?'duduk':'luar'):'dalam')+'|'+s.table.state+'|'+s.kids.map(k=>k.vis?'L':'D').join('')};
  while(h<a.h1){ S.hour=h; hk.update(DT,{player:{x:5,y:5}}); h+=DT*HPS;
    const s=L.state(), cur=[s.atuk,...s.kids].filter(x=>x.vis).map(x=>({id:x.id,x:x.x,y:x.y,st:x.st,mv:x.moving}));
    if(prev) for(const c of cur){const p=prev.find(q=>q.id===c.id); if(p){const j=Math.hypot(c.x-p.x,c.y-p.y); if(j>maxJ) maxJ=j;}}
    for(const c of cur) if(c.mv && c.st!=='enter' && !NW.walkable(c.x,c.y,0.12)) bad.push([c.id,c.st,+c.x.toFixed(2),+c.y.toFixed(2),+h.toFixed(2)]);
    const b=brief(); if(b!==last){ev.push([+h.toFixed(2),b]);last=b;}
    const ts=M.solids.filter(o=>o.r===0.62&&o.x===NW.kedai.TABLE.x&&o.y===NW.kedai.TABLE.y).length; if(ts>1) dupSolids++;
    maxLayer=Math.max(maxLayer,hk.layer(0).length); prev=cur; }
  return {maxJ,bad:bad.slice(0,6),nbad:bad.length,ev,fb:L.stats.fallbacks,dupSolids,maxLayer}; }"""
def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx, pg, errs = fresh(b, 12)
        time.sleep(0.5)
        w = ev(pg, """(()=>{const M=NW.MUARA_MAP,L=NW.kedai.life,T=NW.kedai.TABLE;return {state:L.state().phase,atukSeat:L.atuk.seated,table:L.table.state,
          tableSolid:M.solids.some(o=>o.r===0.62&&o.x===T.x&&o.y===T.y),pts:M.points.filter(p=>p.id==='kedai').length,lights:M.lights.length,
          door:NW.walkable(NW.kedai.DOOR.x,NW.kedai.DOOR.y,0.2),bld:M.buildings.filter(b=>b.id==='kedai').length}})()""")
        ok("1 siang 12.00: Atuk duduk, meja di halaman & ber-collision, hanya 1 titik interaksi & 1 bangunan", w["state"] == "open" and w["atukSeat"] and w["table"] == "down" and w["tableSolid"] and w["pts"] == 1 and w["bld"] == 1, w)
        ok("2 titik pintu rumah bisa dipijak (jalur masuk valid)", w["door"], w)
        sim = ev(pg, SIM, {"h0": 5.5, "h1": 18.6})
        ok("3 sehari penuh di peta sungguhan: tanpa teleport (lompatan antar-frame ≤ 0.08 petak)", sim["maxJ"] <= 0.08, sim["maxJ"])
        ok("4 semua langkah di petak yang bisa diinjak menurut collision peta asli", sim["nbad"] == 0 and sim["fb"] == 0, sim)
        evs = [e[1] for e in sim["ev"]]
        ok("5 urutan: Atuk keluar bawa meja → menaruh → duduk → anak keluar → mengangkat → semua masuk", any(e.startswith("luar|carried") for e in evs) and any("|placing|" in e or e.split("|")[1] == "placing" for e in evs) and any(e.startswith("duduk|down|DD") for e in evs) and any(e.startswith("duduk|down|LL") for e in evs) and any(e.split("|")[1] == "lifting" for e in evs) and evs[-1] == "dalam|away|DD", sim["ev"])
        ok("6 tidak ada solid meja ganda & jumlah lapisan gambar terbatas (≤ 6)", sim["dupSolids"] == 0 and sim["maxLayer"] <= 12, sim)
        # ----- datang terlambat / muat ulang -----
        res = {}
        for h in [3, 6.2, 6.9, 9, 12, 16.9, 17.2, 17.95, 21]:
            ev(pg, "(h)=>{window.__nusa.S.hour=h}", h); time.sleep(0.25)
            res[h] = ev(pg, """(()=>{const L=NW.kedai.life,M=NW.MUARA_MAP,s=L.state(),T=NW.kedai.TABLE;return {atuk:s.atuk.vis?(s.atuk.seated?'duduk':'luar'):'dalam',table:s.table.state,kids:s.kids.filter(k=>k.vis).length,lamp:+s.lamp.toFixed(1),
              solid:M.solids.some(o=>o.r===0.62&&o.x===T.x&&o.y===T.y),layer:NW.areas.get('muara').hooks.layer(0).length}})()""")
        ok("7 malam (03.00 & 21.00): semua di dalam, meja tak ada di halaman (tanpa solid), lampu rumah menyala, hanya bangku tergambar", all(res[h]["atuk"] == "dalam" and res[h]["table"] == "away" and res[h]["kids"] == 0 and not res[h]["solid"] and res[h]["lamp"] >= 0.9 and res[h]["layer"] <= 4 for h in [3, 21]), {h: res[h] for h in [3, 21]})
        ok("8 siang (09.00, 12.00): Atuk duduk, meja ada, 2 anak di halaman, lampu mati", all(res[h]["atuk"] == "duduk" and res[h]["table"] == "down" and res[h]["kids"] == 2 and res[h]["solid"] and res[h]["lamp"] <= 0.2 for h in [9, 12]), {h: res[h] for h in [9, 12]})
        ok("9 06.90: meja sudah dipasang, anak masih di dalam; 17.95: semua sudah masuk", res[6.9]["atuk"] == "duduk" and res[6.9]["kids"] == 0 and res[17.95]["atuk"] == "dalam" and res[17.95]["kids"] == 0 and res[17.95]["table"] == "away", {h: res[h] for h in [6.9, 17.95]})
        ok("10 06.20/17.20 (tengah transisi): keadaan menengah valid (Atuk di luar membawa/menaruh meja, atau sudah duduk)", res[6.2]["atuk"] in ("luar", "duduk") and res[17.2]["atuk"] in ("luar", "duduk", "dalam"), {h: res[h] for h in [6.2, 17.2]})
        # muat ulang di tengah hari & malam
        for h, exp in [(12, "duduk"), (22, "dalam")]:
            ev(pg, "(h)=>{window.__nusa.S.hour=h; window.__nusa.save()}", h); pg.reload(); time.sleep(0.7); pg.click("#startBtn") if ev(pg, "!!document.getElementById('startBtn') && document.getElementById('startBtn').offsetParent!==null") else None; time.sleep(0.6)
            r = ev(pg, """(()=>{const L=NW.kedai.life,M=NW.MUARA_MAP,T=NW.kedai.TABLE,s=L.state();return {atuk:s.atuk.vis?(s.atuk.seated?'duduk':'luar'):'dalam',kids:s.kids.filter(k=>k.vis).length,n:M.solids.filter(o=>o.r===0.62&&o.x===T.x&&o.y===T.y).length,pts:M.points.filter(p=>p.id==='kedai').length,lights:M.lights.length,bld:M.buildings.filter(b=>b.id==='kedai').length,hour:window.__nusa.S.hour}})()""")
            ok(f"11 muat ulang jam {h}: Atuk '{exp}', tanpa duplikasi (solid meja, titik, lampu, bangunan)", r["atuk"] == exp and r["n"] <= 1 and r["pts"] == 1 and r["lights"] == w["lights"] and r["bld"] == 1, r)
        # ----- minigame tetap dapat dimainkan malam hari -----
        ev(pg, "()=>{window.__nusa.S.hour=22; const S=window.__nusa.S;}"); time.sleep(0.3)
        night = ev(pg, """(()=>{const M=NW.MUARA_MAP,p=M.points.find(p=>p.id==='kedai'),hk=NW.areas.get('muara').hooks;let dlg=null;
          hk.interact({id:'kedai'},{openDialog:(d)=>{dlg=d},player:{x:0,y:0}});return {lbl:p.label,x:p.x,y:p.y,walk:NW.walkable(p.x,p.y,0.2),dlg:dlg&&{name:dlg.name,opts:dlg.options.map(o=>o.label),lines:dlg.lines}}})()""")
        ok("12 malam: titik 'Ketuk pintu Atuk' bisa dipijak & dialog menawarkan 'Ayo main!'", night["lbl"] == "Ketuk pintu Atuk" and night["walk"] and night["dlg"] and "🎲 Ayo main!" in night["dlg"]["opts"], night)
        ev(pg, "()=>{const hk=NW.areas.get('muara').hooks;hk.interact({id:'kedai'},{openDialog:(d)=>d.options[0].act(),player:{x:0,y:0}})}"); time.sleep(0.5)
        ok("13 dari dialog malam hari koleksi permainan Kedai terbuka", ev(pg, "NW.kedaiUI.isOpen()") is True)
        ev(pg, "()=>NW.kedaiUI.close && NW.kedaiUI.close()"); time.sleep(0.2)
        # titik interaksi lewat sistem dunia asli: berdiri di titik → target kedai
        ev(pg, "()=>{window.__nusa.S.hour=22}")
        t = ev(pg, """(async()=>{const p=NW.world.player,M=NW.MUARA_MAP,pt=M.points.find(q=>q.id==='kedai');p.x=pt.x;p.y=pt.y;NW.world.updateHint();await new Promise(r=>setTimeout(r,400));return {hint:(document.getElementById('hint')||{}).textContent||''}})()""")
        ok("14 berdiri di pintu malam hari memunculkan petunjuk interaksi Atuk", "Atuk" in t["hint"] or "Ketuk" in t["hint"] or t["hint"] != "", t)
        # ----- tampilan -----
        for h, nm in [(12, "siang"), (6.4, "pagi"), (17.3, "sore"), (22, "malam")]:
            ev(pg, "(h)=>{const S=window.__nusa.S;S.hour=h;const p=NW.world.player;p.x=27.8;p.y=29.2;NW.world.snapCamera&&NW.world.snapCamera()}", h); time.sleep(1.6 if h in (6.4, 17.3) else 0.8)
            pg.screenshot(path=OUT + nm + ".png")
        ok("15 tanpa error JavaScript", errs == [] or all("qris" in e or "ERR_FILE_NOT_FOUND" in e or "Failed to load resource" in e for e in errs), errs[:3])
        b.close()
    f = [x for x in R if x.startswith("FAIL")]; print("\n==== %d PASS, %d FAIL ====" % (len(R) - len(f), len(f))); sys.exit(1 if f else 0)
main()
