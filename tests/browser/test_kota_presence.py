"""Uji HITUNGAN PEMAIN SERVER (PR #146) + KOORDINASI KOTA NUSA + KOREKSI POSISI, 4 klien Chromium nyata + server dev (room-core ASLI, lobi ASLI, house/core ASLI untuk Rumahku).
- angka kiri atas = jumlah SELURUH pemain di server yang sama, di Muara, Rumahku, kapal, Pelabuhan Kota, dan pusat kota; satu akun dihitung sekali
- koreksi posisi: gerak ditahan batas kecepatan → karakter lokal disusulkan ke posisi server dengan halus
Jalankan: KDM_PORT=8835 python3 tests/browser/test_kota_presence.py   Bukti visual: /tmp/kota-presence-shots/"""
import os, sys, time, json, urllib.request
os.environ.setdefault("KDM_PORT", "8835"); os.environ.setdefault("SHOTS", "/tmp/kota-presence-shots/")
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import test_kota_damar as D
from playwright.sync_api import sync_playwright
ev, wait_for, ok, Srv = D.ev, D.wait_for, D.ok, D.pn["Srv"]
PORT = D.PORT; OUTF = dict(D.OUT, D="t:t_jaket:1|h:h_topi:0")
NAMES = {"A": "Budi", "B": "Rudi", "C": "Sari", "D": "Aji"}
def cnt(pg): return ev(pg, "NW.mp.view().serverCount")
def wait_cnt(pgs, n, tmo=18): 
    t0 = time.time()
    while time.time() - t0 < tmo:
        if all(cnt(x) == n for x in pgs): return True
        time.sleep(0.5)
    return False
def raw_rooms(): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/rooms", timeout=3).read())
def total(rr): rows = rr.get("rooms", []) if isinstance(rr, dict) else rr; return sum(r[1] for r in rows)
def pn(pg): return sorted(p["name"] for p in ev(pg, "NW.mp.view().players"))
def dist(a, b): return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5
def peer(pg, nm): return next((p for p in ev(pg, "NW.mp.view().players") if p["name"] == nm), None)
def in_house(pg): return ev(pg, "NW.mp.inHouse()")
def enter_home(pg): ev(pg, "NW.home.enter(NW.world.player)"); return wait_for(pg, "NW.home.active && NW.home.scene==='plot' && NW.mp.inHouse()", 12)
def exit_home(pg): ev(pg, "NW.home.interact({id:'p_gate'}, NW.world.player, ()=>{})"); return wait_for(pg, "!NW.home.active && !NW.mp.inHouse() && NW.mp.view().online", 12)
def spots(pg, cx, cy, n=4, rad=9, sep=1.9): return D.ns["__spots"](pg, cx, cy, n, rad, sep)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(); s = D.srv()
        try:
            S = [Srv(True) for _ in range(4)]
            cs = []
            for i, (acc, k) in enumerate((("demo-a", "A"), ("demo-b", "B"), ("demo-owner", "C"), ("demo-fake", "D"))):
                c, pg, e = D.page(b, acc, S[i], OUTF[k], home=True, name=NAMES[k]); cs.append((c, pg, e))
            A, B, C, Dd = [x[1] for x in cs]; ALL = (A, B, C, Dd); errs = sum((x[2] for x in cs), [])
            for pg in ALL: ev(pg, "window.NUSA_SOCIAL_HOME=true")
            ok("P1 empat klien online, Kota LIVE, empat outfit berbeda", all(D.ns["online"](x) for x in ALL) and all(wait_for(x, "NW.mp.kotaLive()===true", 8) for x in ALL))
            ok("P2 MUARA: angka server = 4 di keempat klien", wait_cnt(ALL, 4), [cnt(x) for x in ALL])
            # ---------- RUMAHKU ----------
            ok("P3 A masuk Rumahku (soket rumah)", enter_home(A))
            ok("P4 RUMAHKU: angka server tetap 4 (A dihitung SEKALI) di A dan di B, C, D", wait_cnt(ALL, 4), [cnt(x) for x in ALL])
            rr = raw_rooms(); tot = total(rr)
            ok("P5 lobi (HTTP /rooms): total pemain = 4, bukan 5", tot == 4, rr)
            ok("P6 B, C, D tidak melihat A (di dalam rumah) & A tidak terhitung dobel", all("Budi" not in pn(x) for x in (B, C, Dd)), [pn(x) for x in (B, C, Dd)])
            ok("P7 A keluar dari Rumahku: angka tetap 4", exit_home(A) and wait_cnt(ALL, 4), [cnt(x) for x in ALL])
            # ---------- KAPAL + PELABUHAN KOTA ----------
            for x in (B, C, Dd): D.tp(x, 37.2, 21.3 + (0.4 if x is C else 0))
            time.sleep(1.2); ev(B, "NW.rombongan.act&&0"); D.ns["act"](B, "rb:new"); wait_for(B, "!!NW.mp.boatMine()", 6)
            bid = D.ns["boats"](B)[0]["id"]; time.sleep(0.6)
            ev(C, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.8); D.tp(Dd, 37.6, 21.7); time.sleep(0.6); ev(Dd, "(b)=>NW.mp.boatJoin(b,2)", bid)
            ok("P8 KAPAL: B kapten, C & D penumpang; angka server 4", wait_for(Dd, "!!NW.mp.boatMine()", 6) and wait_for(C, "!!NW.mp.boatMine()", 6) and wait_cnt(ALL, 4), [cnt(x) for x in ALL])
            ev(B, "NW.rombongan.go('selat')")
            ok("P9 PELABUHAN KOTA: kapal berlabuh, tiga awak di selat; angka server 4 (A masih di Muara)", all(wait_for(x, "NW.areas.cur.id==='selat'", 14) for x in (B, C, Dd)) and D.areaid(A) == "muara" and wait_cnt(ALL, 4), ([D.areaid(x) for x in ALL], [cnt(x) for x in ALL]))
            time.sleep(1.5); D.shot(B, "kp-01-pelabuhan-kota-angka-4")
            ok("P10 B, C, D turun; A tidak terlihat dari kota (area beda)", all(ev(x, "NW.rombongan.leave()") for x in (B, C, Dd)) and all(wait_for(x, "!NW.mp.boatMine()", 6) for x in (B, C, Dd)) and all("Budi" not in pn(x) for x in (B, C, Dd)), [pn(x) for x in (B, C, Dd)])
            # ---------- PUSAT KOTA ----------
            SP = D.ns.get("spots") and None
            def spots_(pg, cx, cy, n=4, rad=9, sep=1.9):
                return ev(pg, """(a)=>{const M=NW.SELAT_MAP,out=[],c=[];for(let y=Math.floor(a[1]-a[3]);y<=a[1]+a[3];y++)for(let x=Math.floor(a[0]-a[3]);x<=a[0]+a[3];x++){let ok=true;for(let j=-1;j<=1&&ok;j++)for(let i=-1;i<=1;i++)if(!M.walkable(x+i+0.5,y+j+0.5)){ok=false;break}
                  if(ok)c.push([x+0.5,y+0.5,Math.hypot(x+0.5-a[0],y+0.5-a[1])])}c.sort((p,q)=>p[2]-q[2]);for(const p of c){if(out.every(o=>Math.hypot(o[0]-p[0],o[1]-p[1])>=a[4]))out.push([p[0],p[1]]);if(out.length>=a[2])break}return out}""", [cx, cy, n, rad, sep])
            SP = spots_(B, 60.0, 25.5, 3)
            for x, t in zip((B, C, Dd), SP): D.walkto(x, t[0], t[1], 4.0, 70)
            time.sleep(2.0)
            ok("P11 PUSAT KOTA: B, C, D saling terlihat; angka server 4", all(len(pn(x)) == 2 for x in (B, C, Dd)) and wait_cnt(ALL, 4), ([pn(x) for x in (B, C, Dd)], [cnt(x) for x in ALL]))
            # ---------- A masuk Rumahku saat tiga lainnya di kota ----------
            ok("P12 A (di Muara) masuk Rumahku saat B, C, D di pusat kota", enter_home(A))
            ok("P13 angka server TETAP 4 di pusat kota (dan di rumah A) — A dihitung sekali", wait_cnt(ALL, 4), [cnt(x) for x in ALL])
            Dd.bring_to_front(); ev(Dd, "NW.world.snapCamera&&NW.world.snapCamera()"); time.sleep(1.0); D.shot(Dd, "kp-02-pusat-kota-A-di-rumahku-angka-4")
            rr = raw_rooms(); tot = total(rr)
            ok("P14 lobi: total pemain tetap 4 (rumah + kota + Muara)", tot == 4, rr)
            ok("P15 A keluar rumah: angka tetap 4", exit_home(A) and wait_cnt(ALL, 4), [cnt(x) for x in ALL])
            # ---------- KOREKSI POSISI ----------
            cx = spots_(B, 62.0, 25.5, 1)[0]; D.tp(Dd, cx[0], cx[1]); time.sleep(1.2)
            c0 = ev(Dd, "[NW.world.player.x,NW.world.player.y]")
            # (a) lompatan 12 petak: server menahan (anggaran), pc → karakter lokal menyusul HALUS
            ev(Dd, """(a)=>{window.__tr=[];const p=NW.world.player;window.__t=setInterval(()=>window.__tr.push([p.x,p.y]),100);p.x=a[0]+12;p.y=a[1]}""", c0)
            time.sleep(0.4); far = ev(Dd, "NW.world.player.x") - c0[0]
            time.sleep(4.0); ev(Dd, "clearInterval(window.__t)")
            tr = ev(Dd, "window.__tr"); steps = [abs(tr[i + 1][0] - tr[i][0]) for i in range(len(tr) - 1)]
            sv = peer(C, NAMES["D"]); lp = ev(Dd, "[NW.world.player.x,NW.world.player.y]")
            ok("P16 lompatan 12 petak: karakter lokal ditarik MENDEKAT ke posisi server (bukan tertinggal jauh)", dist(lp, [sv["x"], sv["y"]]) < 1.6 and (lp[0] - c0[0]) < 8.5, (c0, lp, sv["x"], sv["y"], far))
            ok("P17 penyesuaian halus: tidak ada lonjakan > 1,4 petak per 100 ms (≤ 12 petak/dtk) setelah lompatan awal", max(steps[6:] or [0]) < 1.4, [round(x, 2) for x in steps[:40]])
            # (b) lari 2 detik pada 14 petak/dtk (di atas batas 8) menyusuri jalan terbuka: pemain lain melihatnya tertinggal → klien menyelaraskan
            seg = ev(Dd, """()=>{const M=NW.SELAT_MAP;let best=null;for(let y=8;y<44;y+=0.5){let run=0,start=0;for(let x=2;x<90;x+=0.5){const ok=M.walkable(x,y)&&M.walkable(x,y+0.3)&&M.walkable(x,y-0.3);if(ok){if(!run)start=x;run++}else{if(run&&(!best||run>best.n))best={y,x0:start,x1:x-0.5,n:run};run=0}}if(run&&(!best||run>best.n))best={y,x0:start,x1:88,n:run}}return best}""")
            ok("  ada jalan terbuka ≥ 30 petak untuk uji lari", seg and (seg["x1"] - seg["x0"]) >= 30, seg)
            ex = seg["x1"] - 1.0; D.tp(Dd, ex, seg["y"]); time.sleep(1.5); c1 = ev(Dd, "[NW.world.player.x,NW.world.player.y]")
            ev(C, """(nm)=>{window.__ob=[];window.__obt=setInterval(()=>{const q=NW.mp.view().players.find(p=>p.name===nm);if(q)window.__ob.push([performance.now(),q.x])},100)}""", NAMES["D"])
            ev(Dd, """(a)=>{const p=NW.world.player;let n=0;window.__run=setInterval(()=>{p.x-=14*0.05;n++;if(n>40)clearInterval(window.__run)},50)}""", c1)
            time.sleep(6.5); ev(C, "clearInterval(window.__obt)"); ob = ev(C, "window.__ob")
            lp = ev(Dd, "[NW.world.player.x,NW.world.player.y]"); sv = peer(C, NAMES["D"])
            ok("P18 lari 14 petak/dtk selama 2 dtk: posisi lokal ≈ posisi di mata pemain lain (selisih < 1.6)", dist(lp, [sv["x"], sv["y"]]) < 1.6, (lp, sv["x"], sv["y"]))
            vmax = max([abs(ob[i + 10][1] - ob[i][1]) / ((ob[i + 10][0] - ob[i][0]) / 1000) for i in range(0, len(ob) - 10)] or [0])   # kecepatan terlihat pemain lain, jendela ±1 dtk
            ok("P19 pemain lain TIDAK pernah melihat D bergerak melebihi anggaran server (SPEED 8 + BURST 5 = 13 petak/dtk; jendela 1 dtk), walau klien D berlari 14 petak/dtk", vmax <= 13.0, round(vmax, 2))
            D.shot(Dd, "kp-03-koreksi-posisi")
            # (c) jalan wajar tidak dikoreksi
            c2 = ev(Dd, "[NW.world.player.x,NW.world.player.y]"); tgt = [c2[0] + 3.0, c2[1]]
            ev(Dd, "window.__nc=0"); D.walkto(Dd, tgt[0], tgt[1], 4.0, 30); time.sleep(1.0)
            ok("P20 jalan wajar 4 petak/dtk: posisi lokal = posisi server (tanpa koreksi)", dist(ev(Dd, "[NW.world.player.x,NW.world.player.y]"), [peer(C, NAMES["D"])["x"], peer(C, NAMES["D"])["y"]]) < 0.8)
            ok("P21 tanpa error halaman", not errs, errs[:3])
        finally:
            s.terminate(); b.close()
    f = [r for r in D.R if r.startswith("FAIL")]; print(f"\n{len(D.R)-len(f)}/{len(D.R)} lulus")
    for r in f: print(r)
    sys.exit(1 if f else 0)
if __name__ == "__main__":
    main()
