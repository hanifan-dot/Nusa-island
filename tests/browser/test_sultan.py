"""Uji Sultan Samudra / Mercusuar Emas (objek fisik 2.5D di Muara). Browser sungguhan, mode demo. Server Sultan BELUM aktif di produksi → jawaban server disuntik lewat
window.__demoSultan (hanya jalur uji). Tidak diuji: server sungguhan, Android fisik, pembayaran."""
import os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_multiplayer.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_multiplayer.py"))}; exec(compile(src, "mp", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed, R = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"], ns["R"]
OUT = os.environ.get("SHOTS", "/tmp/nusa-sultan/"); os.makedirs(OUT, exist_ok=True)
CAN = ["UID-CANARY-777", "canary@mail.test", "TOKEN-CANARY-888", "PAYID-CANARY-999", "CANARY-RP-15000", "TX-CANARY-123"]
def top(entries): return {"status": "ok", "entries": entries}
GOOD = top([{"rank": 1, "name": "Raka Bahari", "points": 60, "title": "Sultan Samudra"}, {"rank": 2, "name": "Sari Karang", "points": 40, "title": "Saudagar Laut"}, {"rank": 3, "name": "Sultan Anonim", "points": 30, "title": "Saudagar Laut"}])
ME = {"status": "ok", "points": 40, "title": "Saudagar Laut", "anon": False}
DIRTY = top([dict(e, uid=CAN[0], email=CAN[1], token=CAN[2], paymentId=CAN[3], amount=CAN[4], spend=15000, transaction={"id": CAN[5]}) for e in GOOD["entries"]])
# jawaban server dibaca dari window.__sd (bisa diubah di tengah uji); setiap panggilan dicatat di window.__sc
STUB = """window.__sc=[];window.__sd=%s;window.__dn=0;const __n=Date.now;Date.now=()=>__n.call(Date)+window.__dn;
window.__demoSultan=(name,p)=>{window.__sc.push([name,p]);const d=window.__sd;if(d.__throw)throw Object.assign(new Error('x'),{code:'functions/not-found'});
 if(name==='sultanPrefs'){window.__sd.me=Object.assign({},window.__sd.me,{anon:!!p.anon});return {status:'ok',anon:!!p.anon}}
 return name==='sultanTop'?d.top:d.me};"""
def page(b, sd=None, login=True, vp=(360, 740), stub=True):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = "window.__demoAuto='demo-a';" + ((STUB % json.dumps(sd)) if stub else "")
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1')}" % json.dumps(json.dumps(seed("Budi")))
    ctx.add_init_script(init); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(ns["ROOT"] + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle" if login else "#gateGuest")
    if not login and ev(pg, "!!document.getElementById('gwContinue')"): pg.click("#gwContinue")
    wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    return ctx, pg, errs
def goto(pg, x, y):
    ev(pg, "(([x,y])=>{const p=NW.world.player;p.x=x;p.y=y;NW.world.snapCamera&&NW.world.snapCamera()})", [x, y]); time.sleep(0.8)
def goto_sultan(pg): goto(pg, *ev(pg, "[NW.sultan.POINT.x,NW.sultan.POINT.y]"))
def calls(pg): return ev(pg, "(window.__sc||[]).map(c=>c[0])")
def panel(pg): return ev(pg, "document.getElementById('suOv')?document.getElementById('suOv').innerText:''")
def has_map(pg): return ev(pg, "(()=>{const m=NW.MUARA_MAP;return {obj:m.objects.some(o=>o.kind==='sultan'),pt:m.points.some(p=>p.id==='sultan'),sol:m.solids.filter(s=>NW.sultan.SOLIDS.includes(s)).length}})()")
def sd(**k): return dict({"top": GOOD, "me": ME}, **k)
def seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy; t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L)); return ((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2) ** 0.5

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # A. server MATI/inactive/galat/belum login → objek, titik, tombol TIDAK ADA; peta Muara seperti semula
        for label, kw in [("tanpa stub (saklar OFF seperti produksi)", dict(stub=False)), ("status inactive", dict(sd={"top": {"status": "inactive", "entries": []}, "me": {"status": "inactive"}})),
                          ("server galat/not-found", dict(sd={"__throw": 1, "top": None, "me": None})), ("belum login (tamu)", dict(sd=sd(), login=False))]:
            ctx, A, e = page(b, **kw); time.sleep(1.0); m = has_map(A)
            ok(f"A1 [{label}] objek, titik interaksi, solid TIDAK ada", not m["obj"] and not m["pt"] and m["sol"] == 0, m)
            goto(A, 22.6, 10.8); vis = ev(A, "(()=>{const h=document.getElementById('actBtn');return !h.classList.contains('hidden')&&/Mercusuar/.test(h.innerText)})()")
            ok(f"A2 [{label}] tombol 'Mercusuar Sultan' tidak muncul di lokasinya", not vis)
            ok(f"A3 [{label}] tanaman asli tetap ada (tidak ada yang dipindahkan)", ev(A, "NW.MUARA_MAP.objects.some(o=>o.kind==='palm'&&Math.abs(o.x-22.5)<.2&&Math.abs(o.y-6.2)<.2)") and ev(A, "NW.sultan._st.removed.length")==0)
            ok(f"A4 [{label}] Podium Juara tetap ada", ev(A, "NW.MUARA_MAP.objects.some(o=>o.kind==='podium')&&NW.MUARA_MAP.points.some(p=>p.id==='podium')"))
            if "tamu" in label: ok("A5 [tamu] tidak ada panggilan server Sultan", calls(A) == [], calls(A))
            if label.startswith("tanpa stub"): A.screenshot(path=OUT + "0-inactive-tanpa-objek.png")
            ok(f"A6 [{label}] tidak ada error JS", not e, e); ctx.close()
        # B. live: objek fisik + tombol + panel; tanpa polling; cache 5 menit
        ctx, B, e = page(b, sd()); time.sleep(1.2); m = has_map(B)
        ok("B1 live: objek 2.5D + titik + 3 solid terpasang", m["obj"] and m["pt"] and m["sol"] == 3, m)
        ok("B2 satu pemeriksaan saat masuk: sultanTop lalu sultanMe", calls(B) == ["sultanTop", "sultanMe"], calls(B))
        time.sleep(3.0); ok("B3 TANPA polling (3 dtk diam → tidak ada panggilan baru)", len(calls(B)) == 2, calls(B))
        goto_sultan(B); B.screenshot(path=OUT + "1-mercusuar-di-dunia.png")
        ok("B4 mendekat: tombol interaksi 'Mercusuar Sultan' muncul", ev(B, "(()=>{const h=document.getElementById('actBtn');return !h.classList.contains('hidden')&&/Mercusuar Sultan/.test(h.innerText)})()"))
        B.click("#actBtn"); time.sleep(0.9); t = panel(B)
        ok("B5 menekan tombol membuka panel: Top 3 + poin + gelar", all(s in t for s in ["Raka Bahari", "Sari Karang", "Sultan Anonim", "60", "40", "30", "Sultan Samudra", "Saudagar Laut", "Poin Koleksi"]), t[:160])
        ok("B6 panel memakai data yang masih segar: TIDAK ada panggilan baru", len(calls(B)) == 2, calls(B))
        B.screenshot(path=OUT + "2-panel-top3.png")
        B.click("#suX"); time.sleep(0.5); goto_sultan(B); ev(B, "NW.sultan.open()"); time.sleep(0.6)
        ok("B7 tutup lalu buka lagi → tetap 0 panggilan baru", len(calls(B)) == 2, calls(B))
        ok("B8 tombol Muat Ulang nonaktif + keterangan menit (batas 5 menit)", ev(B, "(()=>{const r=document.getElementById('suRef');return !!r&&r.disabled&&/menit/.test(r.innerText)})()"))
        ev(B, "document.getElementById('suRef').disabled=false;document.getElementById('suRef').click()"); time.sleep(0.5)
        ok("B9 memaksa klik Muat Ulang di dalam 5 menit tetap tidak memanggil server", len(calls(B)) == 2, calls(B))
        ev(B, "window.__dn=301000"); ev(B, "NW.sultan.close()"); time.sleep(0.4); ev(B, "NW.sultan.open()"); time.sleep(0.9)
        ok("B10 setelah >5 menit, membuka panel mengambil ulang (sultanTop + sultanMe)", calls(B)[2:] == ["sultanTop", "sultanMe"], calls(B))
        ok("B11 tidak ada error JS", not e, e); ctx.close()
        # C. privasi: bidang liar dari server tidak boleh sampai ke model, DOM, maupun state klien
        ctx, C, e = page(b, {"top": DIRTY, "me": dict(ME, uid=CAN[0], email=CAN[1], token=CAN[2], paymentId=CAN[3], amount=CAN[4])}); time.sleep(1.2); goto_sultan(C); C.click("#actBtn"); time.sleep(0.9)
        blob = ev(C, "JSON.stringify(NW.sultan._st)") + ev(C, "document.documentElement.outerHTML") + panel(C)
        ok("C1 uid/email/token/payment id/nominal/transaksi TIDAK ada di state klien, HTML, maupun teks panel", not any(c in blob for c in CAN), [c for c in CAN if c in blob])
        ok("C2 model hanya {rank,name,points,title}", ev(C, "NW.sultan._st.data.entries.every(e=>Object.keys(e).sort().join()==='name,points,rank,title')") and ev(C, "Object.keys(NW.sultan._st.me).sort().join()")=="anon,points,title")
        ok("C3 panel tidak menampilkan nominal belanja", "15000" not in blob and "Rp" not in panel(C))
        ctx.close()
        ctx, C2, e = page(b, {"top": top([{"rank": 1, "name": CAN[1], "points": 60, "title": "Sultan Samudra"}, {"rank": 2, "name": "pay_8f3a9c21", "points": 40, "title": CAN[1]}, {"rank": 3, "name": "<img src=x onerror=window.__xss=1>", "points": 30, "title": "Saudagar Laut"}]), "me": ME}); time.sleep(1.2); goto_sultan(C2); C2.click("#actBtn"); time.sleep(0.9)
        ok("C4 nama menyerupai email/id pembayaran → 'Sultan Anonim'; gelar asing diganti gelar resmi", ev(C2, "NW.sultan._st.data.entries.slice(0,2).every(e=>e.name==='Sultan Anonim')") and CAN[1] not in panel(C2), panel(C2)[:200])
        ok("C5 nama berisi HTML tidak dieksekusi dan tidak jadi elemen", ev(C2, "!window.__xss && !document.querySelector('#suOv img')"))
        ctx.close()
        # D. pilihan Sultan Anonim
        ctx, D, e = page(b, sd()); time.sleep(1.2); goto_sultan(D); D.click("#actBtn"); time.sleep(0.9)
        ok("D1 tombol 'Tampil sebagai Sultan Anonim' ada", "Tampil sebagai Sultan Anonim" in panel(D))
        D.click("#suAnon"); time.sleep(1.0); pr = [c for c in ev(D, "window.__sc") if c[0] == "sultanPrefs"]
        ok("D2 memanggil sultanPrefs HANYA dengan {anon:true}", pr == [["sultanPrefs", {"anon": True}]], pr)
        ok("D3 sesudah memilih, tombol berganti & data diambil ulang", "Tampilkan namaku" in panel(D) and calls(D)[-2:] == ["sultanTop", "sultanMe"], (panel(D)[-120:], calls(D)))
        D.screenshot(path=OUT + "3-panel-anonim.png"); ok("D4 tidak ada error JS", not e, e); ctx.close()
        # E. server beralih ke inactive → objek & tombol hilang, tanaman kembali, panel tertutup
        ctx, E, e = page(b, sd()); time.sleep(1.2); ok("E0 awal: objek ada", has_map(E)["obj"])
        goto_sultan(E); ev(E, "NW.sultan.open()"); time.sleep(0.5)
        ev(E, "window.__sd.top={status:'inactive',entries:[]};window.__dn=301000"); ev(E, "NW.sultan.load(false)"); time.sleep(0.8); m = has_map(E)
        ok("E1 inactive: objek, titik, solid dicabut", not m["obj"] and not m["pt"] and m["sol"] == 0, m)
        ok("E2 panel tertutup otomatis & tanaman dikembalikan", ev(E, "document.getElementById('suOv').classList.contains('hidden')||!document.getElementById('suOv').classList.contains('show')") and ev(E, "NW.MUARA_MAP.objects.some(o=>o.kind==='palm'&&Math.abs(o.x-22.5)<.2&&Math.abs(o.y-6.2)<.2)"))
        ok("E3 tombol tidak muncul lagi", ev(E, "(()=>{const h=document.getElementById('actBtn');return h.classList.contains('hidden')||!/Mercusuar/.test(h.innerText)})()"))
        ok("E4 tidak ada error JS", not e, e); ctx.close()
        # F. tata letak peta: tidak menutup jalan, NPC, bangunan, titik lain, Podium Juara; titik interaksi bisa dijangkau
        ctx, F, e = page(b, sd()); time.sleep(1.2)
        g = ev(F, """(()=>{const m=NW.MUARA_MAP,C=NW.sultan.C,pt=NW.sultan.POINT;
          const edges=m.NAV_EDGES.map(([a,b])=>[...m.NAV[a],...m.NAV[b]]);
          const rect=(x,y,b)=>Math.hypot(Math.max(b.x0-x,0,x-b.x1),Math.max(b.y0-y,0,y-b.y1));
          const reach=(()=>{const seen=new Set(),q=[[Math.round(m.START.x*2),Math.round(m.START.y*2)]],key=(a,b)=>a+','+b;seen.add(key(...q[0]));let ok=false;
            while(q.length){const [a,b]=q.shift();const x=a/2,y=b/2;if(Math.hypot(x-pt.x,y-pt.y)<=pt.r){ok=true;break}for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=key(a+da,b+db);if(seen.has(k))continue;seen.add(k);if(a+da<0||b+db<0||a+da>80||b+db>100)continue;if(m.walkable((a+da)/2,(b+db)/2))q.push([a+da,b+db])}}return ok})();
          return {edge:Math.min(...edges.map(e=>Math.hypot(0,0)+0*e[0]+0)),edges,C,pt,
            bld:m.buildings.map(b=>({id:b.id,d:rect(C.x,C.y,b)})),pts:m.points.filter(p=>p.id!=='sultan').map(p=>({id:p.id,d:Math.hypot(p.x-C.x,p.y-C.y)})),
            npcs:NW.areas.cur.npcs.map(n=>({id:n.id,d:Math.hypot(n.x-C.x,n.y-C.y)})),nav:Object.entries(m.NAV).map(([k,v])=>({k,d:Math.hypot(v[0]-C.x,v[1]-C.y)})),
            podium:Math.hypot(NW.podium.C.x-C.x,NW.podium.C.y-C.y),walk:m.walkable(pt.x,pt.y),reach,
            drumsWalkableBefore:NW.sultan.SOLIDS.length,start:Math.hypot(m.START.x-C.x,m.START.y-C.y)}})()""")
        dmin = min(seg(g["C"]["x"], g["C"]["y"], *ed) for ed in g["edges"])
        ok("F1 jarak ke jalan setapak/jaringan NPC ≥ 3 tile (tidak menutup jalan)", dmin >= 3 and min(n["d"] for n in g["nav"]) >= 3, (round(dmin, 2), min(n["d"] for n in g["nav"])))
        ok("F2 jarak ke semua bangunan ≥ 2.5 tile", min(x["d"] for x in g["bld"]) >= 2.5, [x for x in g["bld"] if x["d"] < 4])
        ok("F3 jarak ke titik interaksi lain (toko, pasar, papan, rumah, spot mancing…) ≥ 3 tile", min(x["d"] for x in g["pts"]) >= 3, sorted(g["pts"], key=lambda x: x["d"])[:2])
        ok("F4 jarak ke NPC (Darto, Sari, Dika) ≥ 3 tile", min(x["d"] for x in g["npcs"]) >= 3, g["npcs"])
        ok("F5 jarak ke Podium Pemancing (Podium Juara) ≥ 5 tile", g["podium"] >= 5, round(g["podium"], 2))
        ok("F6 titik interaksi bisa diinjak dan dijangkau dari titik awal pemain", g["walk"] and g["reach"], (g["walk"], g["reach"]))
        ok("F7 pemain bisa menempuh jalan utama tanpa terhalang (solid hanya di sekitar objek)", ev(F, "(()=>{const m=NW.MUARA_MAP;return [[18.5,20.5],[18.5,12.5],[18.5,17.6],[20.3,20.3]].every(([x,y])=>m.walkable(x,y))})()"))
        ctx.close()
        # G. tidak menutup joystick/HUD/tombol aksi (layar HP) & tidak bertabrakan dengan Podium Juara di layar
        for vp in [(360, 740), (390, 844), (412, 915), (740, 360)]:
            ctx, G, e = page(b, sd(), vp=vp); time.sleep(1.1); goto_sultan(G)
            r = ev(G, """(()=>{const Z=NW.world.zoom,cam=NW.world.cam,cv=document.getElementById('game').getBoundingClientRect(),W=cv.width,H=cv.height;
              const HW=NW.TW/2,HH=NW.TH/2,K={rx:Math.SQRT2*HW,ry:Math.SQRT2*HH};
              const sc=(x,y,z)=>{const p=NW.P(x,y,z);return {x:(p.x-cam.x)*Z+W/2+cv.left,y:(p.y-cam.y)*Z+H/2+cv.top}};
              const bb=(C,hw,top,bot)=>{const g=sc(C.x,C.y,6);return {l:g.x-hw*K.rx*Z,r:g.x+hw*K.rx*Z,t:g.y-top*Z,b:g.y+bot*Z}};
              const S=bb(NW.sultan.C,2.1,127,K.ry*2.1+16), PD=bb(NW.podium.C,2.1,140,K.ry*2.1+30);
              const R=(el)=>{const q=el&&el.getBoundingClientRect();return q&&q.width?{l:q.left,r:q.right,t:q.top,b:q.bottom}:null};
              const hit=(a,b)=>!!a&&!!b&&a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t;
              const hud=[...document.querySelectorAll('.hud-left>*,.hud-right>*')].map(R).filter(Boolean);
              return {S,joy:R(document.getElementById('joy')),act:R(document.getElementById('actBtn')),hudHit:hud.some(h=>hit(Object.assign({},S,{t:S.t-4}),h)),joyHit:hit(S,R(document.getElementById('joy'))),actHit:hit(S,R(document.getElementById('actBtn'))),podHit:hit(S,PD),
                inView:S.l>=0&&S.r<=innerWidth&&S.b<=innerHeight+0&&S.t>=-60,W:innerWidth,H:innerHeight,joyVisible:!!R(document.getElementById('joy'))}})()""")
            tag = f"{vp[0]}x{vp[1]}"
            ok(f"G1 [{tag}] objek tidak menutup joystick", not r["joyHit"], r["joy"]); ok(f"G2 [{tag}] objek tidak menutup HUD atas (koin/jam/tas/misi/menu, semua ukuran layar termasuk landscape 740x360)", not r["hudHit"], r["S"])
            ok(f"G3 [{tag}] objek tidak menutup tombol aksi", not r["actHit"], r["act"]); ok(f"G4 [{tag}] objek tidak bertumpuk dengan Podium Pemancing di layar", not r["podHit"], r["S"])
            ok(f"G5 [{tag}] objek utuh di dalam layar saat pemain di titik interaksi", r["inView"], r["S"])
            G.click("#actBtn"); time.sleep(0.8)
            pn = ev(G, "(()=>{const s=document.querySelector('.su-sheet').getBoundingClientRect(),x=document.getElementById('suX').getBoundingClientRect();return {w:s.width,l:s.left,r:s.right,t:s.top,b:s.bottom,sw:document.querySelector('.su-sheet').scrollWidth,cw:document.querySelector('.su-sheet').clientWidth,xw:x.width,xh:x.height,xr:x.right,xl:x.left,vw:innerWidth,vh:innerHeight}})()")
            ok(f"G6 [{tag}] panel muat layar tanpa geser samping; tombol X ≥ 44px dan di dalam layar", pn["sw"] <= pn["cw"] + 1 and pn["r"] <= pn["vw"] + 1 and pn["l"] >= -1 and pn["xw"] >= 44 and pn["xh"] >= 44 and pn["xr"] <= pn["vw"] and pn["t"] >= 0, pn)
            if vp == (360, 740): G.screenshot(path=OUT + "4-panel-hp-360.png")
            ok(f"G7 [{tag}] tidak ada error JS", not e, e); ctx.close()
        # H. regresi: Podium Pemancing & ekonomi/save tidak tersentuh
        ctx, H, e = page(b, sd()); time.sleep(1.2); before = ev(H, "JSON.stringify([Nusa.S.money,Nusa.S.stats,Nusa.S.cooler,Nusa.S.up,Nusa.S.profile])"); store = ev(H, "localStorage.getItem('nusa-island-v1')")
        goto_sultan(H); H.click("#actBtn"); time.sleep(0.8); H.click("#suAnon"); time.sleep(0.8); H.click("#suX"); time.sleep(0.4)
        ok("H1 membuka panel / memilih Sultan Anonim tidak mengubah uang, statistik, perlengkapan, profil", ev(H, "JSON.stringify([Nusa.S.money,Nusa.S.stats,Nusa.S.cooler,Nusa.S.up,Nusa.S.profile])") == before)
        ok("H2 hanya memanggil 3 fungsi Sultan (tidak ada panggilan toko/pembayaran/simpan)", set(calls(H)) <= {"sultanTop", "sultanMe", "sultanPrefs"}, set(calls(H)))
        ok("H3 Podium Pemancing tetap utuh dan bisa dibuka", ev(H, "NW.MUARA_MAP.objects.filter(o=>o.kind==='podium').length===1&&NW.MUARA_MAP.points.filter(p=>p.id==='podium').length===1"))
        goto(H, ev(H, "NW.podium.C.x+0.2"), ev(H, "NW.podium.C.y+1.2")); ev(H, "NW.podium.open()"); time.sleep(0.8)
        ok("H4 panel Podium Juara terbuka normal & Sultan tidak ikut terbuka", ev(H, "!document.getElementById('lbOv').classList.contains('hidden')") and ev(H, "document.getElementById('suOv').classList.contains('hidden')"))
        ok("H5 tidak ada error JS", not e, e); ctx.close(); b.close()
    f = [r for r in R if r.startswith("FAIL")]; print(f"\n{len(R)-len(f)}/{len(R)} lulus"); sys.exit(1 if f else 0)
main()
