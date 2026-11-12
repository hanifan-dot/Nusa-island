"""Uji polesan PR #136: atap area selat, mobil boks pendingin, mobil berangkat setelah respons server sukses, teks Pak Damar, parkiran kosong."""
import os, sys, time, json
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, "test_port.py")).read().split("def main")[0]
ns = {"__file__": os.path.join(here, "test_port.py")}; exec(compile(src, "tp", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, page, Srv, setup_trip, to_port, crate_truck, walk, where, wait_port, OUT = (ns[k] for k in ["ok", "ev", "wait_for", "page", "Srv", "setup_trip", "to_port", "crate_truck", "walk", "where", "wait_port", "OUT"])
VPS = [(360, 740), (412, 915), (740, 360), (1280, 800)]
ROOF_JS = """(()=>{window.__d={};const cnt=(b)=>{if(b&&b.id)window.__d[b.id]=(window.__d[b.id]||0)+1};
 for(const n of ['drawHouse','drawShop','drawMarketBack','drawMarketFront']){const f=NW[n];if(!f||f.__w)continue;const w=function(c,b){cnt(b);return f.apply(this,arguments)};w.__w=1;NW[n]=w}
 for(const b of NW.SELAT_MAP.buildings){if(b.draw&&!b.draw.__w){const f=b.draw;const w=function(c,bb){cnt(bb);return f.apply(this,arguments)};w.__w=1;b.draw=w}}return 1})()"""
def roofs(A, tag):
    ev(A, ROOF_JS); res = {}
    for b in ev(A, "NW.SELAT_MAP.buildings.map(b=>({id:b.id,x:(b.x0+b.x1)/2,y:(b.y1+0.8)}))"):
        ev(A, "window.__d={}"); walk(A, b["x"], b["y"]); time.sleep(0.45); res[b["id"]] = ev(A, "window.__d[%s]||0" % json.dumps(b["id"]))
    ok("%s semua 6 atap/bangunan selat terdaftar & digambar saat kamera menuju tiap bangunan" % tag, len(res) == 6 and all(v > 0 for v in res.values()), res)
ORDER_JS = """(()=>{const M=NW.SELAT_MAP,bad=[];const dB=(b)=>(b.x0+b.x1)/2+(b.y0+b.y1)/2;
 const front=(f,b)=>f.x0>=b.x1-0.01||f.y0>=b.y1-0.01, behind=(f,b)=>f.x1<=b.x0+0.01||f.y1<=b.y0+0.01;
 const foot=[];const T=NW.port.pose(0);
 for(const s of [0,1,2,3,4,6,9,14,19]){const p=NW.port.pose(s);foot.push({n:'truck@'+s,d:p.x+p.y,x0:p.x-1.6,x1:p.x+1.6,y0:p.y-1.6,y1:p.y+1.6})}
 for(const o of M.objects){if(!/^pk_/.test(o.kind)||o.kind==='pk_truck')continue;const r={pk_shed:[1.8,1.3],pk_damar:[.3,.3],pk_board:[.3,.3],pk_ice:[.3,.3],pk_quay:[2.7,1],pk_cargo:[.3,.3]}[o.kind]||[.3,.3];foot.push({n:o.kind,d:(o.x+(o.dz||0))+o.y,x0:o.x-r[0],x1:o.x+r[0],y0:o.y-r[1],y1:o.y+r[1]})}
 const rel=(f,b)=>{const xo=f.x0<b.x1&&f.x1>b.x0,yo=f.y0<b.y1&&f.y1>b.y0;if(xo&&yo)return 0;if(yo)return f.x0>=b.x1-0.01?1:-1;if(xo)return f.y0>=b.y1-0.01?1:-1;return 0};
 for(const f of foot)for(const b of M.buildings){if(b.kind==='market'){const dbk=(b.x0+b.x1)/2+b.y0+0.2,dfr=(b.x0+b.x1)/2+b.y1+0.05,r=rel(f,b);if(r<0&&!(f.d<dbk))bad.push(f.n+'>mback');if(r>0&&!(f.d>dfr))bad.push(f.n+'<mfront');continue}
  const r=rel(f,b);if(r>0&&!(f.d>dB(b)))bad.push(f.n+'<'+b.id);if(r<0&&!(f.d<dB(b)))bad.push(f.n+'>'+b.id)}
 return bad})()"""
def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # --- teks & kode ---
        mods = "".join(open(os.path.join(here, "..", "..", "delivery", f)).read() for f in ("port.js", "client.js", "core.js"))
        ok("T1 tidak ada teks 'Pak Hasan' di modul pengiriman (delivery/*, tes pengiriman)", "Pak Hasan" not in mods and "Hasan" not in mods and "Pak Hasan" not in open(os.path.join(here, "test_port.py")).read() + open(os.path.join(here, "test_delivery.py")).read())
        # --- alur lengkap: 2 kotak, mobil berangkat ---
        srv = Srv(True); ctx, A, e = setup_trip(b, srv); to_port(A)
        ok("P1 kalimat arah: 'Temui Pak Damar di area mobil pendingin.' (HUD cerita selat memakai ini saat pengiriman berjalan)", ev(A, "NW.port.goalHint()") == "🚚 Temui Pak Damar di area mobil pendingin." and "Pak Hasan" not in ev(A, "NW.port.goalHint()"), ev(A, "NW.port.goalHint()"))
        ok("P2 mobil parkir di petak (terlihat) sebelum ada kotak diterima", ev(A, "NW.port.truckState().show && !NW.port.truckState().leaving"))
        ok("P3 urutan render: tak ada objek pelabuhan/mobil yang menutupi atap bangunan di belakangnya (atau tertutup bangunan di depannya)", ev(A, ORDER_JS) == [], ev(A, ORDER_JS))
        roofs(A, "R1 solo 360x740")
        crate_truck(A, 0); time.sleep(0.5)
        ok("P4 kotak 1 diterima server → mobil TETAP parkir (belum kotak terakhir)", ev(A, "NW.port.truckState().show && !NW.port.truckState().leaving && NW.port.truckState().count===0"))
        door = []; srv.fail["ecoDamarDeliver"] = [1, "rej"]
        c = ev(A, "NW.port.positions.CRATE[1]"); walk(A, c["x"] - 0.4, c["y"]); ns["interact_id"](A, "pk:crate:1"); wait_for(A, "NW.port._st.carry", 4); lp = ev(A, "NW.port.positions.LOAD_PT"); walk(A, lp["x"], lp["y"]); ns["interact_id"](A, "pk:truck")
        time.sleep(1.2); door.append(ev(A, "NW.port._st.door")); wait_for(A, "NW.port._st.inTruck>=2", 6); time.sleep(1.6); door.append(ev(A, "NW.port._st.door"))
        wait_for(A, "!!document.getElementById('pkRetry')", 15); time.sleep(0.8)
        ok("P5 pintu belakang: terbuka saat memasukkan (≥0.8) lalu menutup saat kiriman diproses", door[0] > 0.8 and door[1] < 0.3, door)
        ok("P6 Deliver gagal (ditolak): mobil tetap diam & parkir, pintu tidak menutup permanen (terbuka lagi), tak ada pesan berangkat", ev(A, "(()=>{const s=NW.port.truckState();return s.show&&!s.leaving&&!s.gone&&s.count===0&&s.door>0.8})()"), ev(A, "JSON.stringify(NW.port.truckState())"))
        ok("P7 gagal: panel hasil tidak muncul & koin klien tetap", ev(A, "document.getElementById('pkRes').classList.contains('hidden') && Nusa.S.money===50"))
        A.screenshot(path=OUT + "p_door_open.png")
        ev(A, "document.getElementById('pkRetry').click()"); wait_for(A, "NW.port.truckState().leaving", 12)
        ok("P8 retry sukses → mobil berangkat TEPAT sekali (count=1) setelah respons server", ev(A, "NW.port.truckState().count") == 1 and srv.delivered == 6 and [c[0] for c in srv.calls].count("ecoDamarDeliver") == 3, [ev(A, "NW.port.truckState().count"), srv.delivered])
        ops = [c[1]["opId"] for c in srv.calls if c[0] == "ecoDamarDeliver"]; ok("P8b ditolak server → opId baru; hadiah server dibayar tepat sekali", ops[1] != ops[2] and srv.coins == 777 and len(srv.counted) == 2, ops)
        time.sleep(1.0); A.screenshot(path=OUT + "p_leave1.png"); wait_for(A, "NW.port._st.leave&&NW.port._st.leave.told", 8); time.sleep(1.2); A.screenshot(path=OUT + "p_leave2.png")
        ok("P9 pesan 'Kiriman segar berangkat menuju Kota Nusa!' tampil saat mobil mulai jalan", "Kiriman segar berangkat menuju Kota Nusa!" in ev(A, "document.getElementById('toast').innerText") or ev(A, "NW.port._st.leave&&NW.port._st.leave.told"))
        ok("P10 tombol memasukkan kotak ke mobil hilang saat/ setelah berangkat", ev(A, "NW.port.candidates(NW.world.player).every(c=>c.id!=='pk:truck')"))
        wait_for(A, "NW.port.truckState().gone", 30); time.sleep(0.5)
        ok("P11 mobil keluar layar → petak kosong, papan 'Pengiriman hari ini selesai', hanya sekali berangkat", ev(A, "(()=>{const s=NW.port.truckState();return s.gone&&!s.show&&s.count===1&&NW.port.questDone()})()"), ev(A, "JSON.stringify(NW.port.truckState())"))
        ok("P12 panel hasil dari server (777) tampil tepat sekali setelah mobil jalan", "777" in ev(A, "document.getElementById('pkRes').innerText"))
        walk(A, 27.4, 25.4); time.sleep(0.6); A.screenshot(path=OUT + "p_lot_empty.png")
        ev(A, "document.getElementById('pkOk').click()"); time.sleep(0.4)
        ok("P13 tombol 'Kembali ke Muara' tetap tersedia & bekerja", ev(A, "!!document.getElementById('pkHomeHud')"))
        A.click("#pkHomeHud"); wait_for(A, "NW.areas.cur.id==='muara'", 8); ok("P13b kembali ke Muara", where(A) == "muara", where(A))
        ok("P14 tanpa error halaman", not e, e); ctx.close()
        # --- gagal jaringan pada kotak terakhir: mobil diam; retry opId SAMA → berangkat sekali ---
        srv4 = Srv(True); ctx, A, e = setup_trip(b, srv4); to_port(A); crate_truck(A, 0); srv4.fail["ecoDamarDeliver"] = [1, "net"]; crate_truck(A, 1); wait_for(A, "!!document.getElementById('pkRetry')", 25); time.sleep(0.6)
        ok("Q1 status tak pasti (jaringan): mobil tetap parkir, belum berangkat, pintu terbuka", ev(A, "(()=>{const s=NW.port.truckState();return s.show&&!s.leaving&&s.count===0&&s.door>0.8})()"), ev(A, "JSON.stringify(NW.port.truckState())"))
        ev(A, "document.getElementById('pkRetry').click()"); wait_for(A, "NW.port.truckState().leaving", 15); dl = [c[1]["opId"] for c in srv4.calls if c[0] == "ecoDamarDeliver"]
        ok("Q2 retry opId SAMA: terhitung sekali di server, mobil berangkat tepat sekali, tanpa hadiah ganda", dl[1] == dl[2] and len(srv4.counted) == 2 and srv4.coins == 777 and ev(A, "NW.port.truckState().count") == 1, [dl, srv4.counted]); time.sleep(3.0)
        ok("Q3 selama animasi tidak ada panggilan Deliver tambahan / tidak berangkat dua kali", len([c for c in srv4.calls if c[0] == "ecoDamarDeliver"]) == 3 and ev(A, "NW.port.truckState().count") == 1); ctx.close()
        # --- auth_unavailable = hasil tak pasti → opId sama (Sail & Deliver) ---
        srv5 = Srv(True); srv5.fail["ecoDamarSail"] = [1, "auth"]; ctx, A, e = setup_trip(b, srv5); A.click("#pkSail"); wait_for(A, "!!document.getElementById('pkRetry')", 15)
        ev(A, "document.getElementById('pkRetry').click()"); wait_port(A, 15); sl = [c[1]["opId"] for c in srv5.calls if c[0] == "ecoDamarSail"]
        ok("A1 Sail auth_unavailable: tombol coba lagi, opId SAMA dipakai ulang, lalu berlayar", sl[0] == sl[1] and where(A) == "selat", sl)
        crate_truck(A, 0); srv5.fail["ecoDamarDeliver"] = [1, "auth"]; crate_truck(A, 1); wait_for(A, "!!document.getElementById('pkRetry')", 20); time.sleep(0.5)
        ok("A2 Deliver auth_unavailable: mobil tetap parkir, belum berangkat", ev(A, "(()=>{const s=NW.port.truckState();return s.show&&!s.leaving&&s.count===0})()"))
        ev(A, "document.getElementById('pkRetry').click()"); wait_for(A, "NW.port.truckState().leaving", 15); dl = [c[1]["opId"] for c in srv5.calls if c[0] == "ecoDamarDeliver"]
        ok("A3 retry opId SAMA; terhitung sekali; mobil berangkat sekali", dl[1] == dl[2] and len(srv5.counted) == 2 and ev(A, "NW.port.truckState().count") == 1, dl); ctx.close()
        # --- 409 terlalu cepat: diputuskan dari state sailMs/minTripMs (pesan galat tak dibaca) ---
        srv6 = Srv(True, min_trip=3.0); ctx, A, e = setup_trip(b, srv6); to_port(A); crate_truck(A, 0, wait=False); time.sleep(1.6)
        ok("E1 409 terlalu cepat: menunggu otomatis (state sailMs<minTripMs), tanpa tombol galat, ikan aman", srv6.delivered == 0 and ev(A, "!document.getElementById('pkRetry')") and ev(A, "NW.delivery._st.view.boxes[0].st==='sailing'"))
        wait_for(A, "NW.delivery._st.view.boxes[0].st==='idle'", 14); ok("E2 setelah waktu minimum lewat, Deliver otomatis berhasil", srv6.delivered == 3, srv6.delivered); ctx.close()
        # --- dua pemilik quest bersamaan: mobil & UI lokal masing-masing ---
        sA, sB = Srv(True), Srv(True); sB.fail["ecoDamarDeliver"] = [1, "rej"]
        cA, A, eA = setup_trip(b, sA); cB, B, eB = setup_trip(b, sB); to_port(A); to_port(B)
        for pg_, i in ((A, 0), (B, 0)): crate_truck(pg_, i, wait=False)
        time.sleep(0.3); ok("D1 dua pemilik di Pelabuhan Kota bersamaan; masing-masing mobil parkir di klien sendiri", all(ev(x, "NW.port.truckState().show && !NW.port.truckState().leaving") for x in (A, B)))
        wait_for(A, "!NW.port._st.load && !NW.port._st.lock", 12); wait_for(B, "!!document.getElementById('pkRetry')", 25)
        crate_truck(A, 1, wait=False)
        wait_for(A, "NW.port.truckState().leaving", 25); time.sleep(0.5)
        ok("D2 A selesai dan mobil A berangkat; mobil B tetap parkir (B ditolak server / belum selesai)", ev(A, "NW.port.truckState().count") == 1 and ev(B, "NW.port.truckState().count") == 0 and ev(B, "NW.port.truckState().show"), [ev(A, "NW.port.truckState().count"), ev(B, "JSON.stringify(NW.port.truckState())")])
        ok("D3 server hanya menghitung deliver milik A (A dua kotak); hadiah A tidak mengalir ke B", len(sA.counted) == 2 and sA.coins == 777 and sB.coins == 0 and ev(B, "Nusa.S.money===50") and ev(A, "Nusa.S.money===50"))
        ev(B, "document.getElementById('pkRetry').click()"); wait_for(B, "NW.delivery._st.view.boxes[0].st==='idle'", 20); crate_truck(B, 1, wait=False); wait_for(B, "NW.port.truckState().leaving", 25); wait_for(A, "NW.port.truckState().gone", 30)
        ok("D4 B menyelesaikan sendiri: mobil B berangkat sekali, A tetap sekali; UI hasil masing-masing", ev(B, "NW.port.truckState().count") == 1 and ev(A, "NW.port.truckState().count") == 1 and sB.coins == 777 and ev(A, "!document.getElementById('pkRes').classList.contains('hidden')"), [sB.coins])
        ok("D5 tanpa error halaman di kedua klien", not (eA + eB), (eA + eB)[:2]); cA.close(); cB.close()
        # --- muat ulang setelah quest selesai: parkiran kosong, tanpa hadiah ulang ---
        srv2 = Srv(True); srv2.delivered = 6; srv2.reward = 777; ctx, A, e = page(b, True, srv2, kemudi=True); wait_for(A, "NW.port&&NW.port.ready", 10); time.sleep(0.5)
        ev(A, "NW.delivery.open()"); time.sleep(0.8); ev(A, "NW.delivery.close()"); ev(A, "Nusa.goWorld('boat','selat')"); time.sleep(2.2)
        ok("L1 reload quest selesai: parkiran kosong + papan, tanpa mobil, tanpa panel hasil/hadiah", ev(A, "(()=>{const s=NW.port.truckState();return !s.show&&NW.port.questDone()&&document.getElementById('pkRes').classList.contains('hidden')})()") and srv2.coins == 0, ev(A, "JSON.stringify(NW.port.truckState())"))
        walk(A, 27.4, 25.4); time.sleep(0.6); A.screenshot(path=OUT + "p_reload_done.png")
        srv2.delivered = 0; srv2.reward = None; ev(A, "NW.delivery.api.state()"); time.sleep(1.2)
        ok("L2 quest baru (state server): mobil kembali ke petak", ev(A, "NW.port.truckState().show && !NW.port.questDone()"), ev(A, "JSON.stringify(NW.port.truckState())")); ctx.close()
        # --- atap di semua ukuran layar, saat membawa kotak, saat panel dibuka ---
        for vp in VPS:
            srv3 = Srv(True); ctx, A, e = setup_trip(b, srv3, ) if False else (None, None, None)
            srv3 = Srv(True); srv3.boxes = [["i0", "i1", "i2"], ["i3", "i4", "i5"]]; srv3.box = ["i6", "i7"]; ctx, A, e = page(b, True, srv3, vp=vp, kemudi=True); wait_for(A, "NW.port&&NW.port.ready", 10); time.sleep(0.4)
            ev(A, "NW.delivery.open()"); time.sleep(0.6); ev(A, "NW.delivery.close()"); ev(A, "Nusa.goWorld('boat','selat')"); time.sleep(2.0)
            roofs(A, "R2 %dx%d" % vp)
            ev(A, "NW.port._st.carry={i:0}"); roofs(A, "R3 %dx%d membawa kotak" % vp); ev(A, "NW.port._st.carry=null")
            ev(A, "NW.delivery.open()"); time.sleep(0.4); ev(A, ROOF_JS); ev(A, "window.__d={}"); walk(A, 22, 21); time.sleep(0.5)
            ok("R4 %dx%d panel pengiriman dibuka: bangunan tetap digambar" % vp, ev(A, "Object.values(window.__d).some(v=>v>0)"))
            ok("R5 %dx%d urutan render aman" % vp, ev(A, ORDER_JS) == [], ev(A, ORDER_JS)); ctx.close()
        b.close()
if __name__ == "__main__":
    main()
