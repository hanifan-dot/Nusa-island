"""Uji INTEGRASI LINTAS FITUR (Multiplayer/Visual Kota + #146 + Ide 08): satu alur, empat pemain Chromium nyata.
SERVER = Worker backend ASLI (cabang integrasi: kotaNusa + dapurRumahku + pakDamar + kapalRombongan + socialHome) di balik `integrasi_bridge.mjs` (Firestore TIRUAN, jam bisa dimajukan, data sintetis)
        + server realtime uji `tests/dev/mp-dev-server.js` (room-core/lobi/house-core ASLI; NUSA_BOAT=ya, NUSA_KOTA=ya).
Alur: 4 pemain terhitung di angka server → pemilik + 2 tamu masuk Rumahku (pemain ke-4 tetap di Muara) → beli bahan (Kedai), masak, cuci, hidangkan, tawarkan, makan
      → keluar ke Muara → Kapal Rombongan (3 awak) → berlayar ke Kota (Pak Damar ASLI di Worker) → turun, antar 2 kotak → hadiah hanya pemilik
      → pemain lain tetap terlihat, angka server tidak berkurang/ganda; putus-sambung & muat ulang tidak menggandakan koin/bahan/ikan/porsi/hadiah/pemain.
Butuh NUSA_BACKEND=/jalur/ke/nusa-island-control-center (CABANG INTEGRASI). Semua saklar dinyalakan HANYA di Firestore tiruan. Produksi tidak disentuh.
Jalankan: NUSA_BACKEND=... python3 tests/browser/test_integrasi_final.py     Bukti visual: docs/ai-handoff/integrasi-final/ (env SHOTS)"""
import os, sys, time, json, subprocess, urllib.request
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
BACKEND = os.environ.get("NUSA_BACKEND", "")
if not (BACKEND and os.path.exists(os.path.join(BACKEND, "server/dapur-sosial.js")) and os.path.exists(os.path.join(BACKEND, "server/vendor/damar-core.cjs"))):
    print("DILEWATI: NUSA_BACKEND tidak diisi / bukan cabang integrasi."); sys.exit(0)
os.environ.setdefault("NUSA_SCRATCH", "/tmp/integrasi-final/")
SHOTS = os.environ.get("SHOTS", os.path.abspath(os.path.join(H, "..", "..", "docs", "ai-handoff", "integrasi-final")) + "/"); os.makedirs(SHOTS, exist_ok=True)
src = open(os.path.join(H, "test_ide08_e2e.py")).read(); src = src[: src.rindex("\nmain()")]
# tes E2E Ide 08 memanggil leaveVisit() TANPA argumen pemain (game memanggilnya dengan pemain) → galat skrip di halaman; di sini dipanggil seperti game
src = src.replace("NW.home.leaveVisit && NW.home.leaveVisit()", "NW.home.leaveVisit && NW.home.leaveVisit(NW.world.player)")
src = src.replace("NW.room.exit && NW.room.exit()", "NW.room.exit && NW.room.exit(NW.world.player)")      # idem NW.room.exit(pemain)
E = {"__file__": os.path.join(H, "test_ide08_e2e.py"), "__name__": "e2e"}; exec(compile(src, "e2e", "exec"), E)
E["OUT"] = os.environ.get("NUSA_SCRATCH") + "e2e-shots/"; os.makedirs(E["OUT"], exist_ok=True)      # gambar E2E lama jangan menimpa docs/ide08e
G, K, TD = E["G"], E["K"], E["TD"]; ok, ev, wait_for, UIDS = G["ok"], G["ev"], G["wait_for"], G["UIDS"]
import test_kota_damar as KD       # pembantu jalan/antar-kotak (modul yang sama dipakai tes Kota)
from playwright.sync_api import sync_playwright
rb = KD.ns

# ---------------- server uji gabungan: jembatan integrasi + realtime dengan kapal & kota
class FBridge(G["Bridge"]):
    def __init__(s):
        s.port = G["free_port"](); s.mport = G["free_port"]()
        s.p = subprocess.Popen(["node", os.path.join(H, "integrasi_bridge.mjs"), str(s.port)], env=dict(os.environ, NUSA_BACKEND=BACKEND), stdout=subprocess.PIPE, text=True)
        if "READY" not in s.p.stdout.readline(): raise RuntimeError("jembatan gagal")
        s.m = subprocess.Popen(["node", G["MPSRV"], str(s.mport)], env=dict(os.environ, NUSA_HOUSE_API="http://127.0.0.1:%d" % s.port, NUSA_DEV_NO_RATE="1", NUSA_BOAT="ya", NUSA_KOTA="ya"), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        for _ in range(60):
            try: urllib.request.urlopen("http://127.0.0.1:%d/health" % s.mport, timeout=0.3); break
            except Exception: time.sleep(0.1)
    def flags2(s, **kw): s.post("/__flags", kw)
    def rooms(s):
        for _ in range(12):      # lobi uji membatasi laju /rooms (429): tunggu sebentar lalu ulangi
            try:
                r = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/rooms" % s.mport, timeout=3).read()); rows = r.get("rooms", []) if isinstance(r, dict) else r
                return sum(x[1] for x in rows)
            except Exception: time.sleep(3.0)
        return -1
G["Bridge"] = FBridge
# semua klien memuat modul Kota/Kapal/Kemudi/Pengiriman (flag klien dinyalakan di halaman uji; bawaan produksi tetap MATI)
_np = G["new_page"]
def new_page2(b, br, acc, name, vp=(360, 740), dapur=True, dpr=2, hour=None):
    class B2:
        def __getattr__(self, k): return getattr(b, k)
        def new_context(self, **kw):
            c = b.new_context(**kw); c.add_init_script("window.NUSA_KOTA=true;window.NUSA_ROMBONGAN=true;window.NUSA_DELIVERY=true;window.NUSA_KEMUDI=true;"
                              "window.firebase={apps:[{}],auth:()=>({currentUser:{getIdToken:async()=>'dev.'+((window.NW&&NW.cloud&&NW.cloud.user&&NW.cloud.user.uid)||'')}})};")   # token uji SEJAK AWAL: kait Kota/Kapal/Pengiriman membaca gameFlags sekali saja
            return c
    return _np(B2(), br, acc, name, vp=vp, dapur=dapur, dpr=dpr, hour=hour)
G["new_page"] = new_page2

CHECKS = []     # (label, fungsi) hitungan server dicek di dalam alur E2E lama lewat pembungkus
def cnt(pg): return ev(pg, "NW.mp.view().serverCount")
def hud(pg): return ev(pg, "(()=>{const e=document.getElementById('mpN');return e?e.textContent.trim():null})()")
def wait_cnt(pgs, n, tmo=20):
    t0 = time.time()
    while time.time() - t0 < tmo:
        try:
            if all(cnt(x) == n for x in pgs): return True
        except Exception: pass
        time.sleep(0.5)
    return False
def names(pg): return sorted(p["name"] for p in ev(pg, "NW.mp.view().players"))
def snap(br, k="a"):
    s = E["srv"](br, k); d = G["srv_doc"](br, k) if k in "abc" else {}
    return {"coins": s["coins"], "ing": s["ing"], "fish": s["fish"], "dishes": s["dishes"], "dirty": s["dirty"]}
def bal(br, k): return (br.read("shop_economy/" + UIDS[k]) or {}).get("bal")
def shot(pg, name): pg.screenshot(path=os.path.join(SHOTS, name + ".png"))

def section_count(X, br, tag, who="abcd", lobby=False):
    pgs = [X[k][1] for k in who]; n = len(who)
    good = wait_cnt(pgs, n); lb = br.rooms() if lobby else None
    ok("%s angka server = %d di semua klien (HUD kiri atas: %s)%s" % (tag, n, [hud(p) for p in pgs], "" if lb is None else " · lobi /rooms=%d" % lb), good and (lb is None or lb == n), [cnt(p) for p in pgs])
    return good

def main():
    br = G["Bridge"]()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            X = G["fixture"](b, br, vp=(412, 760))
            X["d"] = G["new_page"](b, br, "demo-fake", "Aji", vp=(412, 760)); G["hook_log"](X["d"][1], "d")
            A, B, C, Dd = X["a"][1], X["b"][1], X["c"][1], X["d"][1]; PG = (A, B, C, Dd)
            for pg in PG: ev(pg, "window.NUSA_SOCIAL_HOME=true")
            STK = []
            for k in "abcd": X[k][1].on("pageerror", lambda e, k=k: STK.append((k, str(e)[:80], (getattr(e, "stack", "") or "")[:300])))
            # kait Kota membaca gameFlags SEKALI saat masuk; harness memasang token uji sesudah login → ulangi sekali bila percobaan pertama kalah cepat
            for pg in PG:
                if not ev(pg, "!!(NW.mpKota && NW.mpKota.enabled())"): ev(pg, "(()=>{if(NW.mpKota){NW.mpKota._st.tried=false;NW.mpKota._gate()}})()"); wait_for(pg, "NW.mpKota && NW.mpKota.enabled()", 8)
            ok("I0 empat klien online & modul Kota/Kapal/Pengiriman/Dapur termuat", all(wait_for(x, "NW.mp.view().online && NW.rombongan && NW.port && NW.dapurSosial", 20) for x in PG) and all(wait_for(x, "NW.mp.kotaLive()===true", 10) for x in PG), [ev(x, "[NW.mp.view().online,!!NW.rombongan,!!NW.port,!!NW.dapurSosial,NW.mp.kotaLive(),!!NW.kota,!!NW.kedaiIndah]") for x in PG])
            for pg in PG: E["reset_view"](pg)
            section_count(X, br, "I1", lobby=True)
            # ---- hitungan server dicek juga SAAT pemilik di Kedai & Dapur (pembungkus pada alur E2E lama) ----
            def wrap(tbl, key, tag):
                f0 = tbl[key]
                def f(pg, *a, **k):
                    r = f0(pg, *a, **k); time.sleep(1.2); section_count(X, br, tag); return r
                tbl[key] = f
            wrap(TD, "enter_kedai", "I2a (pemilik di Kedai Bu Indah)"); wrap(K, "kitchen", "I2b (pemilik di Dapur Rumahku)")
            if os.environ.get("INT_FAST") == "1":    # hanya untuk men-debug bagian Kota: lewati E2E Ide 08 lama (disiapkan seperlunya)
                G["enter_house_room"](A); br.homepub(UIDS["a"], name="Budi", level=3); G["let_in"](br, A, B, UIDS["a"], UIDS["b"]); br.adv(250000); G["let_in"](br, A, C, UIDS["a"], UIDS["c"]); G["see_guests"](A, 2, 15)
            else:
                try: E["sec_e2e"](b, br, X)
                except Exception as e:
                    import traceback; traceback.print_exc(); ok("EXC e2e", False, repr(e)[:240])
                try: E["sec_yard"](b, br, X)
                except Exception as e:
                    import traceback; traceback.print_exc(); ok("EXC yard", False, repr(e)[:240])
            # ---- Rumahku: pemilik + dua tamu di dalam, pemain ke-4 di Muara ----
            ok("I3a pemilik & dua tamu ada di ruang rumah, pemain ke-4 di Muara", all(ev(x, "NW.mp.inHouse()") for x in (A, B)) and ev(C, "NW.mp.inHouse()") and not ev(Dd, "NW.mp.inHouse()"), [ev(x, "NW.mp.inHouse()") for x in PG])
            section_count(X, br, "I3b (3 di Rumahku + 1 di Muara)", lobby=True); shot(A, "ii-01-rumahku-tiga-pemain-angka-4")
            # putus-sambung tamu di dalam Rumahku: porsi, bahan, koin tidak berubah; pemain tidak ganda
            s_pre = snap(br); left_pre = G["left_of"](br, 0); me0 = ev(B, "NW.mp._R.me"); ev(B, "NW.mp._R.ws.close()")
            ok("I4a tamu B putus lalu tersambung ulang ke ruang rumah (pid baru)", wait_for(B, "NW.mp.view().online && NW.mp.inHouse() && NW.mp._R.me!==%s" % json.dumps(me0), 30), [me0, ev(B, "NW.mp._R.me")])
            time.sleep(1.5); section_count(X, br, "I4b (B sambung ulang; satu akun tetap satu)")
            nA = names(A); ok("I4c pemilik melihat tiap tamu SEKALI (tak ganda) setelah sambung ulang", sorted(set(nA)) == nA and len(nA) == 2, nA)
            ok("I4d server: koin/bahan/ikan/nampan/porsi tak berubah oleh sambung ulang", snap(br) == s_pre and G["left_of"](br, 0) == left_pre, (s_pre, snap(br), left_pre))
            # ---- keluar ke Muara ----
            ev(B, "NW.home.leaveVisit(NW.world.player)"); ev(C, "NW.home.leaveVisit(NW.world.player)")
            wait_for(B, "!NW.home.visit", 8); wait_for(C, "!NW.home.visit", 8); time.sleep(1.0)    # tamu kembali dulu ke halaman rumahnya sendiri, lalu keluar lewat gerbang
            for x in (A, B, C): ev(x, "NW.home.interact({id:'p_gate'}, NW.world.player, ()=>{})"); time.sleep(0.6)
            ok("I5a ketiganya kembali ke Muara", all(wait_for(x, "!NW.home.active && !NW.mp.inHouse() && NW.mp.view().online", 15) for x in (A, B, C)), [ev(x, "[NW.home.active,NW.mp.inHouse(),NW.mp.view().online,!!NW.home.visit]") for x in (A, B, C)])
            time.sleep(2.0); section_count(X, br, "I5b (semua di Muara)")
            ok("I5c di Muara keempatnya saling melihat (tiap akun sekali)", all(len(names(x)) == 3 and len(set(names(x))) == 3 for x in PG), [names(x) for x in PG])
            # ---- Kapal Rombongan: A kapten, B & C penumpang; D tetap di darat (terlihat) ----
            for x in PG: ev(x, "(()=>{const o=document.querySelectorAll('.modal,.sheet');})()")
            for x in PG: wait_for(x, "NW.rombongan.state().srv && !document.getElementById('fade').classList.contains('on') && !NW.world.player.moving", 15)
            KD.tp(Dd, 34.0, 23.5); made = False
            for _ in range(3):
                KD.tp(A, 37.2, 21.3); time.sleep(1.5)
                if rb["act"](A, "rb:new", 8) and wait_for(A, "!!NW.mp.boatMine()", 8): made = True; break
            ok("I6a A membuat kapal rombongan (kapten)", made)
            bid = rb["boats"](A)[0]["id"]
            for x in (B, C): KD.tp(x, 37.2, 21.7)
            time.sleep(1.0); ev(B, "(b)=>NW.mp.boatJoin(b,1)", bid); time.sleep(0.8); KD.tp(C, 37.6, 21.7); time.sleep(0.8); ev(C, "(b)=>NW.mp.boatJoin(b,2)", bid)
            ok("I6b tiga awak duduk; D melihat kapal dengan tiga awak", wait_for(A, "NW.mp.boats()[0].seats.every(x=>x!==0)", 8) and all(wait_for(x, "!!NW.mp.boatMine()", 6) for x in (B, C)) and wait_for(Dd, "NW.mp.boats().length===1 && NW.mp.boats()[0].seats.every(x=>x!==0)", 8))
            section_count(X, br, "I6c (3 di kapal + 1 di darat)"); shot(A, "ii-02-kapal-tiga-awak")
            # ---- Pak Damar ASLI di Worker: 6 ikan sah → 2 kotak ----
            c, t = br.post("/__catch", {"uid": UIDS["a"], "n": 6}); fish = json.loads(t)
            st0, j0 = br.fn(UIDS["a"], "ecoDamarState", {})
            ok("I7a Pak Damar server ON (Worker asli) & 6 ikan sah ditangkap", st0 == 200 and len(fish) == 6, (st0, str(j0)[:120]))
            ids = [f["uid"] for f in fish]
            r1 = br.fn(UIDS["a"], "ecoDamarLoad", {"opId": "op-int-load-0001", "box": 0, "uids": ids[:3]}); r2 = br.fn(UIDS["a"], "ecoDamarLoad", {"opId": "op-int-load-0002", "box": 1, "uids": ids[3:]})
            ok("I7b kotak 0 & 1 dimuat di server (3+3 ikan)", r1[0] == 200 and r2[0] == 200, (str(r1)[:100], str(r2)[:100]))
            pre_bal = {k: bal(br, k) for k in "abc"}
            ev(A, "NW.delivery.open()"); wait_for(A, "!!document.getElementById('pkSail')", 10); time.sleep(0.5)
            A.click("#pkSail")
            if os.environ.get("INT_DEBUG"):
                mode = os.environ.get("INT_DEBUG")
                for x in (A, B, C):
                    if mode == "wrap": ev(x, "(()=>{window.__oe=[];const f=NW.world.onEnter;NW.world.onEnter=function(a,b){window.__oe.push(['enter',a,b,Date.now()%100000]);try{return f.apply(this,arguments)}catch(e){window.__oe.push(['ERR',String(e)]);throw e}};})()")
                    else: ev(x, "(()=>{window.__oe=[];let last='';window.__oeT=setInterval(()=>{const m=NW.mp.boatMine();const k=[NW.areas.cur.id,NW.mp.area(),!!m,document.getElementById('fade').classList.contains('on'),!!(NW.home&&NW.home.active),!!(NW.room&&NW.room.active),document.hidden,document.visibilityState].join();if(k!==last){last=k;window.__oe.push([Date.now()%100000,k])}},50)})()")
            t0 = time.time(); arr = {}
            while time.time() - t0 < 70 and len(arr) < 3:
                for k, x in (("A", A), ("B", B), ("C", C)):
                    if k not in arr and ev(x, "NW.areas.cur.id==='selat' && !!NW.mp.boatMine() && NW.mp.boatMine().boat.kota===true"): arr[k] = round(time.time() - t0, 1)
                time.sleep(0.5)
            if os.environ.get("INT_DEBUG") and len(arr) < 3: print("DEBUG-OE", [ev(x, "window.__oe") for x in (A, B, C)], ev(C, "(()=>{const m=NW.mp.boatMine();return JSON.stringify({m:m&&{id:m.id,seat:m.seat,away:m.boat.away,kota:m.boat.kota},areas:NW.areas.cur.id,home:NW.home.active,room:NW.room&&NW.room.active,sel:!!NW.areas.get('selat'),mode:window.__nusa&&window.__nusa.S&&window.__nusa.S.loc})})()"), flush=True)
            if len(arr) < 3:
                print("DIAG-VIS", [ev(x, "[document.hidden,document.visibilityState,document.hasFocus()]") for x in (A, B, C, Dd)], flush=True)
                print("DIAG-TIMER", [ev(x, "new Promise(r=>{const t=performance.now();setTimeout(()=>r(Math.round(performance.now()-t)),380)})") for x in (A, B, C, Dd)], flush=True)
                print("DIAG-C-AFTER", wait_for(C, "NW.areas.cur.id==='selat'", 10), ev(C, "[NW.areas.cur.id,NW.mp.area()]"), flush=True)
            ok("I8a berlayar: A, B, C tiba di Pelabuhan Kota sebagai kapal kota (detik sejak Berlayar: %s)" % arr, len(arr) == 3, [ev(x, "[NW.areas.cur.id, NW.mp.area(), NW.mp.view().online, (()=>{const m=NW.mp.boatMine();return m?[m.seat,!!m.boat.kota]:null})(), NW.mp._R.kota]") for x in (A, B, C)])
            time.sleep(2.0); ok("I8b D (di Muara) masih terhitung; angka server tetap 4 di semua klien", wait_cnt(PG, 4) and KD.areaid(Dd) == "muara", [cnt(x) for x in PG])
            shot(A, "ii-03-kota-angka-4")
            br.adv(50000)     # jam server uji: pelayaran minimal 45 dtk
            ok("I9a kapten turun lewat tombol pengiriman; B & C lewat leave", ev(A, "NW.rombongan.disembark(NW.port.positions.BOARD_SPOT)") and ev(B, "NW.rombongan.leave()") and ev(C, "NW.rombongan.leave()") and all(wait_for(x, "!NW.mp.boatMine()", 8) for x in (A, B, C)))
            time.sleep(1.5)
            ok("I9b di kota A, B, C saling terlihat (D di Muara tidak)", all(names(x) == sorted(n for n in ("Budi", "Rudi", "Cici") if n != nm) for x, nm in ((A, "Budi"), (B, "Rudi"), (C, "Cici"))), [names(x) for x in (A, B, C)])
            section_count(X, br, "I9c (3 di kota + 1 di Muara)", lobby=True)
            for i, x in enumerate((B, C)): KD.walkto(x, 24.0 + i, 25.4 + i * 0.5, 4.0, 40)
            def carry(pg, i):
                cr = ev(pg, "NW.port.positions.CRATE[%d]" % i); KD.walkto(pg, cr["x"] - 0.4, cr["y"]); got = KD.interact_id(pg, "pk:crate:%d" % i); wait_for(pg, "NW.port._st.carry", 4)
                lp = ev(pg, "NW.port.positions.LOAD_PT"); KD.walkto(pg, lp["x"], lp["y"], 4.0, 60); tr = KD.interact_id(pg, "pk:truck"); wait_for(pg, "!NW.port._st.load", 8); time.sleep(1.0); return got and tr
            ok("I10a kotak 1 diantar ke truk", carry(A, 0))
            ok("I10b kotak 2 diantar; panel hasil dengan hadiah dari server", carry(A, 1) and wait_for(A, "!document.getElementById('pkRes').classList.contains('hidden')", 40), ev(A, "document.getElementById('pkRes').innerText"))
            shot(A, "ii-04-hadiah-pemilik")
            post_bal = {k: bal(br, k) for k in "abc"}; gain = post_bal["a"] - pre_bal["a"]
            sd = br.fn(UIDS["a"], "ecoDamarState", {})[1]; res = (sd.get("result") or sd)
            ok("I10c hadiah hanya untuk pemilik: A +%s koin (server), B & C tak berubah, panel hasil tak muncul di B/C" % gain, gain > 0 and post_bal["b"] == pre_bal["b"] and post_bal["c"] == pre_bal["c"] and all(ev(x, "document.getElementById('pkRes').classList.contains('hidden')") for x in (B, C)), (pre_bal, post_bal))
            ok("I10d tiga pemain di kota dan D di Muara masih saling konsisten; angka server 4", wait_cnt(PG, 4), [cnt(x) for x in PG])
            # ---- putus-sambung & kirim ulang: tak ada hadiah/koin ganda, pemain tak ganda ----
            s_after = snap(br); me_a = ev(A, "NW.mp._R.me"); ev(A, "NW.mp._R.ws.close()")
            ok("I11a A putus di kota lalu tersambung ulang di area kota", wait_for(A, "NW.mp._R.me!==%s && NW.mp.view().online && NW.mp.area()==='selat'" % json.dumps(me_a), 30), [me_a, ev(A, "NW.mp._R.me"), KD.areaid(A), ev(A, "NW.mp.area()")])
            time.sleep(2.0); section_count(X, br, "I11b (A sambung ulang: tetap 4, tidak 5)")
            ok("I11c B & C melihat A sekali; A melihat B & C sekali", len(names(B)) == len(set(names(B))) and len(names(A)) == len(set(names(A))) == 2, (names(A), names(B)))
            rd = br.fn(UIDS["a"], "ecoDamarDeliver", {"opId": "op-int-ulang-0001", "box": 0}); rd2 = br.fn(UIDS["a"], "ecoDamarDeliver", {"opId": "op-int-ulang-0002", "box": 1})
            ok("I11d kirim ulang kotak yang sudah diantar: ditolak/tak berefek, koin tak bertambah (hadiah SEKALI)", bal(br, "a") == post_bal["a"] and snap(br)["fish"] == s_after["fish"], (rd[0], rd2[0], bal(br, "a"), post_bal["a"]))
            # ---- kembali ke Muara ----
            time.sleep(1.0)
            ok("I12a A kembali ke Muara lewat 'Kembali ke Muara'", ev(A, "(()=>{const h=document.getElementById('pkHome');if(h&&h.offsetParent){h.click();return true}return !!NW.port&&(NW.port.goHome(),true)})()") and wait_for(A, "NW.areas.cur.id==='muara'", 12), KD.areaid(A))
            bb = ev(B, "NW.mp.boats()[0] && NW.mp.boats()[0].id")
            for x in (B, C): KD.walkto(x, 13.2 + (0.4 if x is C else 0), 20.6, 4.0, 40)
            if bb: ev(B, "(b)=>NW.mp.boatJoin(b,1)", bb); time.sleep(0.8); ev(C, "(b)=>NW.mp.boatJoin(b,2)", bb); time.sleep(6.5); ev(B, "NW.rombongan.goHome()")
            ok("I12b B & C pulang dengan kapal; semua kembali di Muara", all(wait_for(x, "NW.areas.cur.id==='muara'", 20) for x in (B, C)), [KD.areaid(x) for x in PG])
            time.sleep(2.0); section_count(X, br, "I12c (semua di Muara lagi)")
            fin = snap(br)
            ok("I13 akhir: bahan, nampan, kotor, ikan di server sama dengan setelah Rumahku (tak ganda), koin = sebelum + hadiah sekali", fin["ing"] == s_after["ing"] and fin["dishes"] == s_after["dishes"] and fin["dirty"] == s_after["dirty"] and fin["fish"] == s_after["fish"] and fin["coins"] == s_after["coins"], (s_after, fin))
            errs = [e for x in ("a", "b", "c", "d") for e in X[x][2] if "PAGEERR" in e]
            ok("I14 tanpa galat skrip di keempat halaman", not errs, STK[:2])
            b.close()
    finally: br.close()
    f = [r for r in G["R"] if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(G["R"]) - len(f), len(f)))
    for r in f: print(r)
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
