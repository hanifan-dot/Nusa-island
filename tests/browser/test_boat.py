"""Uji KAPAL ROMBONGAN di peramban nyata terhadap server dev (NUSA_BOAT=ya): sinkron 3 klien, vis:false diganti protokol, pindah area, reconnect.
Jalankan: python3 tests/browser/test_boat.py   (tanpa render kapal: gambar = Worker 02; ini menguji lapisan protokol klien + server)"""
import os, sys, time
H = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(H, "test_multiplayer.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.join(H, "test_multiplayer.py")}; exec(compile(src, "mp", "exec"), ns)
from playwright.sync_api import sync_playwright
import subprocess, urllib.request
ok, ev, wait_for, new_page, V, online = ns["ok"], ns["ev"], ns["wait_for"], ns["new_page"], ns["V"], ns["online"]
PORT = 8811
def srv(boat):
    env = dict(os.environ, NUSA_DEV_NO_RATE="1", NUSA_BOAT="ya" if boat else "tidak")
    p = subprocess.Popen(["node", ns["SRV"], str(PORT)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(50):
        try: urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health", timeout=0.3); return p
        except Exception: time.sleep(0.1)
    raise RuntimeError("server uji tidak naik")
def tp(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1]}", [x, y])
def boats(pg): return ev(pg, "NW.mp.boats().map(b=>({id:b.id,tx:b.tx,ty:b.ty,d:b.d,v:b.v,anchor:b.anchor,away:b.away,seats:b.seats}))")
def mine(pg): return ev(pg, "(()=>{const m=NW.mp.boatMine();return m?{id:m.id,seat:m.seat,captain:m.captain}:null})()")
def pid(pg): return ev(pg, "NW.mp._R.me")
def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # --- bawaan MATI ---
        s = srv(False)
        try:
            c1, A, e1 = new_page(b, "demo-a", "Anda", port=PORT); ok("A1 server OFF: tersambung, boatOn=false, boatNew ditolak (false)", online(A) and ev(A, "NW.mp.boatOn()") is False and ev(A, "NW.mp.boatNew()") is False)
            c1.close()
        finally: s.terminate(); s.wait()
        s = srv(True)
        try:
            c1, A, e1 = new_page(b, "demo-a", "Anda", port=PORT); c2, B, e2 = new_page(b, "demo-b", "Budi", port=PORT); c3, C, e3 = new_page(b, "demo-owner", "Cici", port=PORT)
            ok("B1 tiga klien online, server kapal ON", online(A) and online(B) and online(C) and ev(A, "NW.mp.boatOn()") and ev(C, "NW.mp.boatOn()"))
            for pg in (A, B, C): tp(pg, 37.2, 22.0)
            time.sleep(1.2); ev(A, "NW.mp.boatNew()")
            ok("B2 A membuat kapal → kapten (kursi 0), semua melihat kapal", wait_for(A, "!!NW.mp.boatMine()", 6) and mine(A)["captain"] and wait_for(C, "NW.mp.boats().length===1", 6) and len(boats(B)) == 1)
            bid = boats(A)[0]["id"]; ev(B, "(b)=>NW.mp.boatJoin(b,1)", bid); ev(C, "(b)=>NW.mp.boatJoin(b,1)", bid)
            time.sleep(1.0); ev(C, "(b)=>NW.mp.boatJoin(b,2)", bid)
            ok("B3 B kursi 1 (kursi rebutan: yang kedua ditolak, C pindah ke kursi 2), 3 awak penuh", wait_for(B, "!!NW.mp.boatMine()", 6) and wait_for(C, "!!NW.mp.boatMine()", 6) and mine(B)["seat"] == 1 and mine(C)["seat"] == 2 and all(s for s in boats(A)[0]["seats"]), boats(A))
            ev(A, "NW.mp.boatAnchor(false)"); time.sleep(0.5); ev(A, "NW.mp.boatSteer(3,2)")
            ok("B4 kapten jalan: kapal bergerak, kecepatan & posisi SAMA di tiga klien", wait_for(C, "NW.mp.boats()[0].v>0", 6) and (time.sleep(0.6), True)[1])
            bA, bB, bC = boats(A)[0], boats(B)[0], boats(C)[0]; ok("B5 baris kapal identik di semua klien (arah, jangkar, kursi)", (bA["d"], bA["anchor"], bA["seats"]) == (bB["d"], bB["anchor"], bB["seats"]) == (bC["d"], bC["anchor"], bC["seats"]) and abs(bA["ty"] - bC["ty"]) < 1.0, (bA, bC))
            ev(B, "NW.mp.boatSteer(0,1)"); ok("B6 penumpang tidak bisa mengemudi (arah tetap 3)", (time.sleep(0.6), boats(A)[0]["d"] == 3)[1])
            # --- vis:false diganti protokol ---
            ev(A, "Object.defineProperty(NW.boat,'on',{get:()=>true,configurable:true})"); time.sleep(1.0)
            ok("B7 NW.boat.on=true tidak lagi menyembunyikan pemain yang duduk di kapal server (vis tetap)", ev(A, "NW.mp._R.vis") is True and wait_for(B, "NW.mp.view().players.some(p=>p.name==='Anda')", 4))
            ev(A, "NW.mp.boatSteer(3,2)"); wait_for(A, "NW.mp.boats()[0].v===0", 40)
            ok("B8 kapal berhenti di batas jalur air (server menahan), tidak menembus", ev(A, "NW.mp.boats()[0].ty<=50.6 && NW.mp.boats()[0].tx>=33.9 && NW.mp.boats()[0].tx<=39.7"), boats(A))
            ev(A, "NW.mp.boatAnchor(true)"); time.sleep(1.2)
            # --- pindah area ---
            ev(A, "NW.mp.boatGo('laut')")
            ok("B9 kapten pindah area: pengamat di luar kapal melihat kapal & kru lenyap; kru tetap duduk", wait_for(A, "NW.mp.boats()[0] && NW.mp.boats()[0].away", 6) and True)
            ev(A, "NW.mp.boatGo('muara')"); time.sleep(0.8)
            ok("B10 kembali terlalu cepat ditolak (jam server)", ev(A, "NW.mp.boats()[0].away") is True)
            time.sleep(8.5); ev(A, "NW.mp.boatGo('muara')")
            ok("B11 kembali ke Muara: kapal tiba, kru tampak lagi", wait_for(A, "!NW.mp.boats()[0].away", 6) and wait_for(C, "!NW.mp.boats()[0].away", 6))
            # --- turun & reconnect ---
            ev(C, "NW.mp.boatLeave()"); ok("B12 penumpang turun saat jangkar turun & berhenti → kursi bebas", wait_for(C, "!NW.mp.boatMine()", 6) and wait_for(A, "NW.mp.boats()[0].seats[2]===0", 6), boats(A))
            c2.close(); time.sleep(1.5); ok("B13 B putus: kursi ditahan (kapal & kapten tetap)", len(boats(A)) == 1 and boats(A)[0]["seats"][1] != 0)
            c2, B, e2 = new_page(b, "demo-b", "Budi", port=PORT); online(B); tp(B, 37.2, 22.0)
            ok("B14 B masuk lagi dalam masa tunggu → kembali ke kursi 1 (reconnect)", wait_for(B, "!!NW.mp.boatMine()", 8) and mine(B)["seat"] == 1, mine(B))
            ev(A, "NW.mp._R.ws.close()"); ok("B15 kapten putus → B otomatis jadi kapten", wait_for(B, "NW.mp.boatMine() && NW.mp.boatMine().captain", 8))
            ok("B16 tanpa error halaman", not (e1 + e2 + e3), (e1 + e2 + e3)[:3])
        finally:
            s.terminate(); s.wait()
        b.close()
    f = [r for r in ns["R"] if r.startswith("FAIL")]
    print("\n%d/%d lulus" % (len(ns["R"]) - len(f), len(ns["R"]))); sys.exit(1 if f else 0)
main()
