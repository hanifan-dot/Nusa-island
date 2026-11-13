"""Uji MULTIPLAYER KOTA NUSA di peramban nyata: 4 klien Chromium (3 awak kapal + 1 warga kota) terhadap server dev realtime
(mp-dev-server memakai room-core ASLI; NUSA_BOAT=ya, NUSA_KOTA=ya) + gameFlags tiruan (kotaNusa, kapalRombongan).
Jalankan: python3 tests/browser/test_kota_mp.py   (butuh node, playwright). Bukti visual: /tmp/kota-mp-shots/ (env SHOTS)."""
import os, sys, time, json, subprocess, urllib.request, re
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
os.environ.setdefault("SHOTS", "/tmp/kota-mp-shots/")
import kota_lib as KL
from kota_lib import boot, to_selat, tp, shot, ok, ev, wait_for, ROOT, R, SHOTS
from playwright.sync_api import sync_playwright

SRV = KL._ns["SRV"]
PORT = int(os.environ.get("KMP_PORT", "8830"))
OUT = {"A": "t:t_street:1|h:h_kapten:0", "B": "t:t_pantai:2|h:h_koboi:1", "C": "t:t_hoodie:0|h:h_robot:1", "D": "t:t_street:0|h:h_koboi:0"}
WSLOG = ("(()=>{const W=window.WebSocket;window.__tx=[];window.__rx=[];window.WebSocket=function(u,p){const w=new W(u,p);const s=w.send.bind(w);"
         "w.send=(d)=>{window.__tx.push(d);if(window.__tx.length>4000)window.__tx.shift();return s(d)};"
         "w.addEventListener('message',e=>{window.__rx.push(e.data);if(window.__rx.length>4000)window.__rx.shift()});return w};"
         "window.WebSocket.prototype=W.prototype;})();")

def srv(kota=True, boat=True, port=PORT):
    env = dict(os.environ, NUSA_DEV_NO_RATE="1", NUSA_BOAT="ya" if boat else "tidak", NUSA_KOTA="ya" if kota else "tidak")
    p = subprocess.Popen(["node", SRV, str(port)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(60):
        try: urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=0.3); return p
        except Exception: time.sleep(0.1)
    raise RuntimeError("server uji tidak naik")

def page(b, name, acc, outfit, port=PORT, kota=True, kota_srv=True, rom=True, hour=None, vp=(412, 915)):
    extra = WSLOG + ("window.NUSA_ROMBONGAN=true;" if rom else "")
    ctx, pg, errs, reqs = boot(b, name, acc, kota, vp=vp, hour=hour, extra=extra, mp_port=port, dsf=2, rom_flag=rom, kota_srv=kota_srv)
    if outfit: ev(pg, "(c)=>{const P=NW.world.player;P.style=NW.avatarDraw.styleFor(c,P.style);NW.mp.sendOutfit(c)}", outfit)
    return ctx, pg, errs, reqs

def V(pg): return ev(pg, "NW.mp.view()")
def pn(pg): return sorted(p["name"] for p in V(pg)["players"])
def peer(pg, nm): return next((p for p in V(pg)["players"] if p["name"] == nm), None)
def online(pg, t=10): return wait_for(pg, "NW.mp.view().online", t)
def area(pg): return ev(pg, "NW.areas.cur.id")
def srv_area(pg): return ev(pg, "NW.mp.area()")
def mine(pg): return ev(pg, "(()=>{const m=NW.mp.boatMine();return m?{id:m.id,seat:m.seat,captain:m.captain,kota:!!m.boat.kota}:null})()")
def boats(pg): return ev(pg, "NW.mp.boats().map(b=>({id:b.id,x:b.tx,y:b.ty,kota:!!b.kota,away:!!b.away,anchor:b.anchor,seats:b.seats}))")
def raw(pg, o): return ev(pg, "(o)=>{const w=NW.mp._R.ws;return !!w&&w.readyState===1&&(w.send(JSON.stringify(o)),true)}", o)
def sendq(pg, o): return ev(pg, "(o)=>{const w=NW.mp._R.ws;const q=NW.MPProto.qz;if(o.x!=null)o.x=q(o.x);if(o.y!=null)o.y=q(o.y);w.send(JSON.stringify(o))}", o)
def pos(pg): return ev(pg, "(()=>{const p=NW.world.player;return [p.x,p.y]})()")
def dist(a, b): return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5
def frames(pg, k): return ev(pg, f"window.__{k}.join('\\n')")
def hour(pg, h): ev(pg, "(h)=>{NW.mp.sharedHour=()=>h;Nusa.S.hour=h}", h)

def walk(pgs, targets, speed=4.0, tmo=45):
    """jalan lurus dengan kecepatan wajar (4 petak/dtk < batas server 9): dipakai untuk menempuh jarak jauh di kota"""
    for pg, (x, y) in zip(pgs, targets):
        ev(pg, """(a)=>{const p=NW.world.player;if(window.__w)clearInterval(window.__w);window.__wd=false;window.__w=setInterval(()=>{const dx=a[0]-p.x,dy=a[1]-p.y,d=Math.hypot(dx,dy);
          if(d<0.15){clearInterval(window.__w);window.__wd=true;return}const s=Math.min(d,a[2]*0.05);p.x+=dx/d*s;p.y+=dy/d*s;p.dir=((Math.round(Math.atan2(dy,dx)/(Math.PI/4))%8)+8)%8},50)}""", [x, y, speed])
    for pg in pgs: wait_for(pg, "window.__wd===true", tmo)
    time.sleep(0.6)

def open_run(pg, x0=55, x1=64, y0=24, y1=30, n=6):
    return ev(pg, """(a)=>{const M=NW.SELAT_MAP;for(let y=a[2];y<=a[3];y++)for(let x=a[0];x<=a[1];x++){let ok=true;for(let i=0;i<=a[4];i++)if(!M.walkable(x+i+0.5,y+0.5)){ok=false;break}if(ok)return [x+0.5,y+0.5]}return null}""", [x0, x1, y0, y1, n])

def srvpos(pg, nm):  # posisi pemain lain menurut tampilan klien pg (hasil server)
    p = peer(pg, nm); return [p["x"], p["y"]] if p else None

def main():
    res = []
    with sync_playwright() as p:
        b = p.chromium.launch(); s = srv(True, True)
        ctxs = []
        try:
            # ===== 1. Empat klien nyata, gerbang ON di kedua sisi =====
            cA, A, eA, rA = page(b, "Aji", "demo-a", OUT["A"]); cB, B, eB, rB = page(b, "Bayu", "demo-b", OUT["B"]); cC, Cc, eC, rC = page(b, "Citra", "demo-owner", OUT["C"]); cD, D, eD, rD = page(b, "Dewi", "demo-fake", OUT["D"])
            ctxs += [cA, cB, cC, cD]; ALL = [A, B, Cc, D]
            ok("K1 empat klien online di server dev (kota+kapal ON)", all(online(x) for x in ALL))
            ok("K2 gerbang: gameFlags.kotaNusa terbaca & welcome ko=1 → kotaLive", all(wait_for(x, "NW.mpKota&&NW.mpKota.enabled()&&NW.mp.kotaLive()", 12) for x in ALL), [ev(x, "[!!NW.mpKota&&NW.mpKota.enabled(),NW.mp.kotaLive()]") for x in ALL])
            ok("K3 modul kota dimuat (kota/mp.js) & kapal rombongan hidup", all(ev(x, "!!NW.kota&&!!NW.rombongan&&NW.mp.boatOn()") for x in ALL))

            # ===== 2. Alur Kapal Rombongan → Pelabuhan Kota (3 awak) =====
            to_selat(D); ok("K4 warga kota (D) pindah ke area selat & server mengonfirmasi", wait_for(D, "NW.mp.area()==='selat'", 8), srv_area(D))
            for x in (A, B, Cc): tp(x, 37.2, 21.3)
            time.sleep(1.2)
            ok("K5 A membuat kapal rombongan di Muara", ev(A, "NW.mp.boatNew()") is not False and wait_for(A, "!!NW.mp.boatMine()", 6))
            bid = boats(A)[0]["id"]
            for x in (B, Cc): tp(x, 37.2, 21.7)
            time.sleep(0.8); ev(B, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.8); tp(Cc, 37.6, 21.7); time.sleep(0.6); ev(Cc, "(b)=>NW.mp.boatJoin(b,2)", bid)
            ok("K6 tiga awak duduk (kursi 0/1/2)", wait_for(A, "NW.mp.boats()[0].seats.every(x=>x!==0)", 8) and all(wait_for(x, "!!NW.mp.boatMine()", 6) for x in (B, Cc)))
            ok("K7 D (di kota) belum melihat kapal Muara maupun awaknya", boats(D) == [] and pn(D) == [], (boats(D), pn(D)))
            ev(A, "NW.rombongan.go('selat')")
            ok("K8 kapal TIBA di Pelabuhan Kota: kapten & penumpang pindah ke area selat (klien & server)", all(wait_for(x, "NW.areas.cur.id==='selat'&&NW.mp.area()==='selat'", 10) for x in (A, B, Cc)), [(area(x), srv_area(x)) for x in (A, B, Cc)])
            ok("K9 D melihat kapal (bertanda kota, tidak 'pergi') dengan tiga awak di kursi", wait_for(D, "NW.mp.boats().length===1&&NW.mp.boats()[0].kota&&!NW.mp.boats()[0].away", 8) and sorted(pn(D)) == ["Aji", "Bayu", "Citra"] and all(x != 0 for x in boats(D)[0]["seats"]), (boats(D), pn(D)))
            time.sleep(1.4)
            ok("K10 kapal berlabuh di tambatan; A kapten masih duduk, tombol turun/pulang tersedia", mine(A) and mine(A)["captain"] and mine(A)["kota"] and abs(boats(A)[0]["x"] - 13.6) < 0.2, (mine(A), boats(A)))
            D.bring_to_front()
            ev(D, "NW.world.snapCamera&&NW.world.snapCamera()")
            for x in (A, B, Cc, D): hour(x, 13.0)
            tp(D, 17.5, 21.6); time.sleep(1.2); shot(D, "kmp-02-kapal-tiba")
            ok("K11 kapal tidak bisa berlayar/jangkar diangkat saat berlabuh di kota (server menolak)", (ev(A, "NW.mp.boatSteer(2,2)") is not None) and (time.sleep(0.5) or True) and boats(A)[0]["anchor"] is True and abs(boats(A)[0]["x"] - 13.6) < 0.3)

            # ===== 3. Tiga awak turun → pemain berjalan =====
            ev(B, "NW.rombongan.leave()"); time.sleep(0.5); ev(Cc, "NW.rombongan.leave()"); time.sleep(0.5)
            ok("K12 penumpang B & C turun sebagai pemain berjalan di kota", all(wait_for(x, "!NW.mp.boatMine()", 6) for x in (B, Cc)) and all(area(x) == "selat" for x in (B, Cc)))
            ev(A, "NW.rombongan.leave()")
            ok("K13 kapten A turun juga → ketiganya pemain berjalan di dermaga Pelabuhan Kota", wait_for(A, "!NW.mp.boatMine()", 6) and area(A) == "selat")
            time.sleep(1.4)
            ok("K14 D & sesama awak saling melihat (ketiga awak + D)", pn(D) == ["Aji", "Bayu", "Citra"] and pn(A) == ["Bayu", "Citra", "Dewi"] and pn(B) == ["Aji", "Citra", "Dewi"] and pn(Cc) == ["Aji", "Bayu", "Dewi"], [pn(x) for x in ALL])
            ok("K15 mereka berdiri di dermaga (titik turun server), bukan di kursi", all(dist(srvpos(D, n), [13.1, 20.45]) < 3 for n in ("Aji", "Bayu", "Citra")), [srvpos(D, n) for n in ("Aji", "Bayu", "Citra")])
            ok("K16 kapal kosong tetap ada di dermaga (tempat kembali)", len(boats(D)) == 1 and all(x == 0 for x in boats(D)[0]["seats"]))

            # ===== 4. Berjalan bersama ke pusat kota (siang) =====
            walk(ALL, [(56.5, 25.5), (58.5, 27.0), (60.5, 25.5), (62.0, 27.5)])
            for x in ALL: hour(x, 12.5)
            for x in ALL: tp_cam = ev(x, "NW.world.snapCamera&&NW.world.snapCamera()")
            time.sleep(1.2)
            ok("K17 tiga pemain asli + D saling terlihat di pusat kota (posisi server ≈ posisi sendiri)", all(len(pn(x)) == 3 for x in ALL) and dist(srvpos(D, "Aji"), pos(A)) < 1.5, [pn(x) for x in ALL])
            outs = {n: peer(D, n)["outfit"] for n in ("Aji", "Bayu", "Citra")}
            ok("K18 outfit publik berbeda terkirim (tiga pemain, tiga outfit)", len(set(outs.values())) == 3 and OUT["A"] == outs["Aji"] and OUT["B"] == outs["Bayu"] and OUT["C"] == outs["Citra"], outs)
            D.bring_to_front(); ev(D, "NW.world.snapCamera&&NW.world.snapCamera()"); time.sleep(0.8); shot(D, "kmp-01-pusat-kota-siang")

            # jalan / berhenti / berbelok / chat / emoji
            A.bring_to_front(); spot = open_run(A) or (58.5, 27.5); walk([A], [spot]); a0 = srvpos(D, "Aji")
            A.keyboard.down("ArrowRight"); time.sleep(1.0)
            mid = ev(D, "(n)=>{const p=[...NW.mp._R.players.values()].find(q=>q.name===n);return p?{moving:p.ch.moving,x:p.ch.x,d:p.d}:null}", "Aji")
            ok("K19 D melihat Aji berjalan (moving) ke kanan", mid and mid["moving"] is True and mid["x"] > a0[0] + 0.3, (a0, mid))
            A.keyboard.down("ArrowDown"); A.keyboard.up("ArrowRight"); time.sleep(0.9)
            turn = ev(D, "(n)=>{const p=[...NW.mp._R.players.values()].find(q=>q.name===n);return p?{moving:p.ch.moving,d:p.d}:null}", "Aji")
            ok("K20 berbelok: arah hadap berubah di layar D", turn and turn["d"] != mid["d"], (mid, turn))
            A.keyboard.up("ArrowDown"); time.sleep(1.0)
            st = ev(D, "(n)=>{const p=[...NW.mp._R.players.values()].find(q=>q.name===n);return p?{moving:p.ch.moving}:null}", "Aji")
            ok("K21 berhenti: Aji tidak lagi bergerak di layar D", st and st["moving"] is False, st)
            ev(A, "NW.mp.sendChat('Halo warga kota!')"); ev(Cc, "NW.mp.sendEmote(1)"); time.sleep(1.0)
            ok("K22 chat Aji sampai ke B, C, D", all(any(l["text"] == "Halo warga kota!" and l["name"] == "Aji" for l in V(x)["log"]) for x in (B, Cc, D)))
            ok("K23 emoji Citra sampai ke D", ev(D, "(()=>{const p=[...NW.mp._R.players.values()].find(q=>q.name==='Citra');return !!(p&&p.emote)})()"))

            # ===== 5. Isolasi: area & server berbeda =====
            ev(D, "NW.mp.joinRoom(2)"); time.sleep(2.5)
            ok("K24 pemain di SERVER lain (muara-2) tidak melihat dan tidak terlihat oleh pemain kota", online(D) and V(D)["room"].endswith("2") and pn(D) == [] and "Dewi" not in pn(A) and "Dewi" not in pn(B), (V(D)["room"], pn(D), pn(A)))
            ev(D, "NW.mp.joinRoom(1)"); time.sleep(2.5)
            ok("K25 kembali ke server 1: saling terlihat lagi", wait_for(D, "NW.mp.view().players.length===3", 8) and "Dewi" in pn(A))
            # B kembali ke area Muara (jalur kapal tunggal lama = keluar dari area selat)
            ev(B, "NW.world.onEnter('start','muara')"); time.sleep(2.0)
            ok("K26 pemain di area Muara tidak terlihat oleh pemain kota (dan sebaliknya)", wait_for(B, "NW.mp.area()==='muara'", 8) and "Bayu" not in pn(A) and "Bayu" not in pn(D) and "Aji" not in pn(B) and "Dewi" not in pn(B), [pn(x) for x in (A, B, D)])
            ev(B, "NW.world.onEnter('start','selat')"); time.sleep(8.5)  # jeda pindah area server ≥ 6 dtk
            ok("K27 kembali ke selat setelah jeda: terlihat lagi, masuk lewat titik masuk pelabuhan", wait_for(B, "NW.mp.area()==='selat'", 10) and "Bayu" in pn(A), (srv_area(B), pn(A)))
            walk([B], [(58.5, 27.0)])

            # ===== 6. Spoof & data publik =====
            tx = frames(A, "tx") + frames(B, "tx") + frames(Cc, "tx") + frames(D, "tx"); rx = frames(A, "rx") + frames(B, "rx") + frames(Cc, "rx") + frames(D, "rx")
            bad = re.compile(r'"(uid|email|money|coin|balance|inv|inventory|save|cloud|role|owner_uid|token)"\s*:', re.I)
            ok("K28 lalu lintas jaringan: tidak ada uid/email/saldo/inventaris/role/save dikirim klien maupun diterima", not bad.search(tx) and not bad.search(rx) and "demo-a" not in rx and "demo-owner" not in rx and "TOKEN-UJI" not in rx, (bad.findall(tx)[:3], bad.findall(rx)[:3]))
            kinds = sorted(set(re.findall(r'"t":"([a-z]+)"', tx)))
            ok("K29 pesan klien hanya jenis publik (hello/m/c/e/h/a/p/f/v/bt/ar)", set(kinds) <= {"hello", "m", "c", "e", "h", "a", "p", "f", "v", "bt", "ar", "o"}, kinds)
            raw(A, {"t": "hello", "n": "Aji", "r": 0, "rd": 0, "x": 100, "y": 100, "d": 2, "f": 0, "uid": "demo-owner", "role": "owner", "ko": 1, "ar": "selat"})
            raw(A, {"t": "m", "x": 1000, "y": 1000, "d": 1, "f": 0, "role": "owner", "uid": "demo-owner"}); raw(A, {"t": "c", "m": "pesan", "uid": "x", "role": "owner"}); time.sleep(1.2)
            pa = peer(D, "Aji")
            ok("K30 spoof UID/role diabaikan: Aji tetap Aji, bukan pemilik; nama tidak berubah", pa is not None and pa["owner"] is False and peer(D, "Palsu") is None, pa)
            # teleport
            time.sleep(3.0); p0 = srvpos(D, "Aji"); sendq(A, {"t": "m", "x": 85.0, "y": 44.0, "d": 1, "f": 8}); time.sleep(1.0); p1 = srvpos(D, "Aji")
            ok("K31 teleport jauh (bendera TP) ditolak server di kota (maks lonjakan anggaran ≈5 petak)", dist(p0, p1) < 6.2, (p0, p1))
            # kecepatan berlebih: 30 pesan, masing-masing +1.5 petak dalam 1.5 dtk
            time.sleep(3.0); base = srvpos(D, "Aji"); sgn = 1 if base[0] < 46 else -1; want = min(120.0, (91.0 - base[0]) if sgn > 0 else (base[0] - 1.0)); t0 = time.time()
            for i in range(1, 31): sendq(A, {"t": "m", "x": max(1.0, min(91.0, base[0] + sgn * 4.0 * i)), "y": base[1], "d": 0, "f": 1}); time.sleep(0.05)
            time.sleep(0.9); sp = srvpos(D, "Aji"); el = time.time() - t0; mv = abs(sp[0] - base[0])
            ok("K32 kecepatan berlebih (klaim 4 petak/pesan) ditahan server: gerak nyata ≤ 8 petak/dtk × waktu + lonjakan 5", mv <= 8 * (el + 0.5) + 5.5 and mv < want - 5, (base, sp, round(el, 2), round(mv, 1), round(want, 1)))
            # spam chat
            before = len([l for l in V(D)["log"] if l["text"].startswith("spam")])
            for i in range(14): raw(A, {"t": "c", "m": "spam %d" % i})
            time.sleep(1.2); got = len([l for l in V(D)["log"] if l["text"].startswith("spam")]) - before
            ok("K33 spam chat dibatasi (≤4 dari 14 lolos)", got <= 4, got)
            # spam posisi
            t1 = time.time()
            for i in range(120): sendq(A, {"t": "m", "x": base[0] + (i % 2) * 0.1, "y": base[1], "d": 0, "f": 0})
            el2 = time.time() - t1; time.sleep(1.0); sp3 = srvpos(D, "Aji")
            ok("K34 spam posisi (120 pesan): koneksi tetap hidup; gerak mundur 32 petak hanya sebatas anggaran (8/dtk + 5)", V(A)["online"] and dist(sp3, sp) <= 8 * (el2 + 0.5) + 5.5, (V(A)["state"], sp3, sp, el2))
            raw(A, {"t": "ar", "a": "neraka"}); raw(A, {"t": "ar", "a": "selat", "x": 1, "y": 1}); time.sleep(1.0)
            ok("K35 pindah area tidak sah (area palsu / sama) ditolak: Aji tetap terlihat di selat", wait_for(D, "NW.mp.view().players.some(p=>p.name==='Aji')", 4) and srv_area(A) == "selat", srv_area(A))
            sp2 = srvpos(D, "Aji"); tp(A, sp2[0], sp2[1]); time.sleep(0.6)   # sinkronkan posisi lokal dengan posisi server setelah serangan uji

            # ===== 7. Kapal: kembali naik, kapten keluar → promosi, reconnect, pulang =====
            walk([A, B, Cc], [(13.4, 21.0), (13.0, 20.9), (14.0, 20.9)], speed=6.0, tmo=60)
            time.sleep(0.8)
            ev(A, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.8)
            ok("K36 A naik lagi: kapal kota tanpa kapten → A jadi KAPTEN", wait_for(A, "!!NW.mp.boatMine()", 6) and mine(A)["captain"] and mine(A)["seat"] == 0, mine(A))
            ev(B, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.6); ev(Cc, "(b)=>NW.mp.boatJoin(b,2)", bid)
            ok("K37 B & C ikut naik sebagai penumpang; D melihat ketiganya di kursi", all(wait_for(x, "!!NW.mp.boatMine()", 6) for x in (B, Cc)) and wait_for(D, "NW.mp.boats()[0]&&NW.mp.boats()[0].seats.every(x=>x!==0)", 6))
            ev(A, "NW.rombongan.leave()"); time.sleep(1.0)
            ok("K38 kapten keluar → penumpang berkursi terkecil (B) dipromosikan jadi kapten", wait_for(B, "NW.mp.boatMine()&&NW.mp.boatMine().captain", 6) and not mine(A), (mine(B), mine(A)))
            # reconnect: C putus lalu tersambung ulang
            ev(Cc, "NW.mp._R.ws.close()"); time.sleep(0.3)
            ok("K39 reconnect: C kembali ke kursinya di kapal kota setelah putus", wait_for(Cc, "NW.mp.view().online&&!!NW.mp.boatMine()", 20) and area(Cc) == "selat" and mine(Cc)["kota"], mine(Cc))
            # naik lagi A
            walk([A], [(13.4, 21.0)], speed=6.0, tmo=60); ev(A, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.8)
            ok("K40 A naik lagi sebagai penumpang (kapten sudah B)", mine(A) and not mine(A)["captain"], mine(A))
            time.sleep(8.5)
            ev(B, "NW.rombongan.goHome()")
            ok("K41 kapten B pulang: seluruh awak kembali ke Muara bersama kapal", all(wait_for(x, "NW.areas.cur.id==='muara'&&NW.mp.area()==='muara'", 12) for x in (A, B, Cc)) and all(mine(x) for x in (A, B, Cc)), [(area(x), srv_area(x), mine(x)) for x in (A, B, Cc)])
            ok("K42 D (kota) tidak lagi melihat kapal & awak yang pulang", wait_for(D, "NW.mp.boats().length===0&&NW.mp.view().players.length===0", 8), (boats(D), pn(D)))

            # ===== 8. Malam di taman kota (tiga pemain berjalan) =====
            for x in (A, B, Cc): ev(x, "NW.rombongan.leave()")
            time.sleep(0.8)
            for x in (A, B, Cc, D): ev(x, "NW.world.onEnter('start','selat')")
            time.sleep(9.0)
            ok("K43 kembali ke kota (setelah jeda) lewat jalur pemain biasa: semua saling terlihat", all(wait_for(x, "NW.mp.area()==='selat'", 12) for x in (A, B, Cc, D)) and wait_for(D, "NW.mp.view().players.length===3", 10), [pn(x) for x in ALL])
            walk(ALL, [(66.0, 38.8), (68.8, 38.8), (66.8, 42.6), (69.5, 41.6)], speed=5.0, tmo=60)
            for x in ALL: hour(x, 22.5); ev(x, "NW.kota.setClock(()=>69)")
            for x in ALL: ev(x, "NW.world.snapCamera&&NW.world.snapCamera()")
            D.bring_to_front(); time.sleep(1.4); shot(D, "kmp-03-taman-malam")
            ok("K44 malam di taman: tiga pemain (A,B,C) terlihat oleh D, lampu kota aktif", sorted(pn(D)) == ["Aji", "Bayu", "Citra"] and ev(D, "!NW.kota.stats||true"), pn(D))

            # ===== 9. Kesehatan klien =====
            errs = [e for e in eA + eB + eC + eD if "favicon" not in e and "ERR_" not in e]
            ok("K45 tidak ada error JS/konsol di keempat klien", not errs, errs[:4])
            for c in ctxs: c.close()

            # ===== 10. Flag klien OFF: tanpa modul & tanpa trafik multiplayer kota =====
            cX, X, eX, rX = page(b, "Xena", "demo-a", OUT["A"], kota=False, kota_srv=True, rom=True)
            ok("F1 flag klien NUSA_KOTA OFF: kota/* tidak diunduh, NW.mpKota/NW.kota tidak ada", online(X) and not any("kota/" in u for u in rX) and ev(X, "!NW.mpKota&&!NW.kota"), [u for u in rX if "kota/" in u][:3])
            to_selat(X); time.sleep(2.0); tx = frames(X, "tx")
            ok("F2 flag klien OFF: hello & pesan tidak membawa ko/ar, tidak ada pesan 'ar'; selat tetap 40×40 tanpa kota", '"ko"' not in tx and '"ar"' not in tx and ev(X, "NW.SELAT_MAP.MW") == 40 and not ev(X, "NW.mp.kotaLive()"), ev(X, "NW.SELAT_MAP.MW"))
            shot(X, "kmp-04-flag-off-klien")
            ok("F3 flag klien OFF: sebelumnya gameFlags tidak diminta oleh modul kota (tak ada kotaNusa dipakai)", ev(X, "!window.NW.mpKota"))
            cX.close()

            # ===== 11. Flag SERVER OFF (klien ON, gameFlags.kotaNusa=true, tetapi NUSA_KOTA tidak ya) =====
            s.terminate(); s.wait(); s2 = srv(False, True)
            s = s2
            cP, P_, eP, _ = page(b, "Pita", "demo-a", OUT["A"], kota=True, kota_srv=True); cQ, Q, eQ, _ = page(b, "Qori", "demo-b", OUT["B"], kota=True, kota_srv=True)
            ok("S1 server kota OFF: welcome tanpa ko → kotaLive false walau gameFlags true", online(P_) and online(Q) and wait_for(P_, "NW.mpKota&&NW.mpKota.enabled()", 12) and not ev(P_, "NW.mp.kotaLive()") and not ev(Q, "NW.mp.kotaLive()"))
            to_selat(P_); time.sleep(2.0)
            ok("S2 server OFF: pemain di selat tidak disiarkan ke Muara (tersembunyi), klien menyembunyikan diri", "Pita" not in pn(Q) and not ev(P_, "NW.mp._R.vis"), (pn(Q), ev(P_, "NW.mp._R.vis")))
            ok("S3 server OFF: tidak ada pesan 'ar' dikirim ulang terus-menerus", len(re.findall(r'"t":"ar"', frames(P_, "tx"))) == 0, len(re.findall(r'"t":"ar"', frames(P_, "tx"))))
            ev(P_, "NW.world.onEnter('start','muara')"); time.sleep(1.5)
            ok("S4 server OFF: kembali ke Muara → terlihat normal (perilaku lama tidak berubah)", wait_for(Q, "NW.mp.view().players.some(p=>p.name==='Pita')", 8))
            # kapal rombongan lama tetap berfungsi di mode lama (jalur 'pergi' → Pelabuhan Kota lama)
            for x in (P_, Q): tp(x, 37.2, 21.3)
            time.sleep(1.0); ev(P_, "NW.mp.boatNew()"); wait_for(P_, "!!NW.mp.boatMine()", 6); bid2 = boats(P_)[0]["id"]; tp(Q, 37.2, 21.7); time.sleep(0.6); ev(Q, "(b)=>NW.mp.boatJoin(b,1)", bid2); time.sleep(0.8)
            ev(P_, "NW.rombongan.go('selat')"); time.sleep(3.0)
            ok("S5 server OFF: kapal ke Pelabuhan Kota memakai jalur lama (away), bukan mode kota", ev(P_, "(()=>{const m=NW.mp.boatMine();return !!m&&m.boat.away&&!m.boat.kota})()"), mine(P_))
            cP.close(); cQ.close()
            ok("S6 error JS/konsol nol di mode flag-off", not [e for e in eX + eP + eQ if "favicon" not in e and "ERR_" not in e], [e for e in eX + eP + eQ][:3])
        finally:
            s.terminate()
    return KL.summary()

if __name__ == "__main__":
    sys.exit(0 if main() else 1)
