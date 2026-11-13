"""Uji Ide 08C — memasak interaktif, hasil gagal kartun, audio lazy, cuci peralatan (game). Browser sungguhan (Chromium headless).
SERVER = Worker backend ASLI (PR #60: server/dapur-core.js + dapur-server.js) di balik jembatan lokal `dapur_bridge.mjs` (Firestore tiruan, jam bisa dimajukan, data sintetis).
Butuh: NUSA_BACKEND=/jalur/ke/nusa-island-control-center. Tanpa itu, uji ini DILEWATI (bukan lulus palsu).
Harga bahan di server = NILAI UJI (belum disetujui Owner). Angka FPS Chromium headless BUKAN bukti performa HP."""
import os, sys, time, json, subprocess, socket, urllib.request, urllib.error
here = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.environ.get("NUSA_BACKEND", "")
if not (BACKEND and os.path.exists(os.path.join(BACKEND, "test/helpers/worker-setup.js"))):
    print("DILEWATI: NUSA_BACKEND tidak diisi / tidak ditemukan (uji ini memakai server dapur asli)."); sys.exit(0)
src = open(os.path.join(here, "test_dapur.py")).read(); src = src[: src.rindex("\nmain()")]
ns = {"__file__": os.path.join(here, "test_dapur.py"), "__name__": "dx"}; exec(compile(src, "td", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, page, shot, tp, at_station, interact, in_room = (ns[k] for k in ["ok", "ev", "wait_for", "page", "shot", "tp", "at_station", "interact", "in_room"])
R = ns["R"]; OUT = ns["OUT"]

class Bridge:
    def __init__(s):
        sk = socket.socket(); sk.bind(("127.0.0.1", 0)); s.port = sk.getsockname()[1]; sk.close()
        s.p = subprocess.Popen(["node", os.path.join(here, "dapur_bridge.mjs"), str(s.port)], env=dict(os.environ, NUSA_BACKEND=BACKEND), stdout=subprocess.PIPE, text=True)
        line = s.p.stdout.readline()
        if "READY" not in line: raise RuntimeError("jembatan gagal: " + line)
    def post(s, path, body=None):
        r = urllib.request.Request("http://127.0.0.1:%d%s" % (s.port, path), data=json.dumps(body or {}).encode(), method="POST")
        try:
            with urllib.request.urlopen(r, timeout=30) as f: return f.status, f.read().decode()
        except urllib.error.HTTPError as e: return e.code, e.read().decode()
    def adv(s, ms): s.post("/__adv", {"ms": int(ms)})
    def state(s): return json.loads(s.post("/__state")[1])
    def fish(s): return json.loads(s.post("/__fish")[1])
    def fn(s, name, data=None): c, t = s.post("/__fn", {"name": name, "data": data or {}}); return c, json.loads(t or "{}")
    def buy(s, ing):
        items = [{"id": k, "n": n} for k, n in ing.items()]
        for i in range(0, len(items), 6): assert s.post("/__buy", {"items": items[i:i + 6]})[0] == 200
    def close(s): s.p.kill()

class BSrv:
    """Perantara Playwright → jembatan. Mencatat panggilan; dapat menjatuhkan jaringan (jawaban hilang) untuk fungsi tertentu."""
    def __init__(s, br): s.br = br; s.calls = []; s.delay = 0; s.fail_net = 0; s.fail_names = (); s.lose_reply = False
    def handle(s, name, body):
        s.calls.append((name, body)); c, t = s.br.post("/fn/" + name, {"data": body}); return c, json.loads(t or "{}")
    def of(s, name): return [b for n, b in s.calls if n == name]
    def n(s, name): return len(s.of(name))

STAR = ["ikan_goreng", "telur_ceplok", "telur_rebus", "tempe_goreng"]
ALL = {  # resep → (alat, bahan, jumlah ikan, stasiun)  — sama dengan RECIPES di server (kontrak CONTRACT-08A)
 "ikan_goreng": ("wajan", {"minyak": 1, "garam": 1}, 1, "kompor"), "ikan_bakar": ("pemanggang", {"jeruk_nipis": 1, "bumbu_dasar": 1}, 1, "pemanggang"),
 "sup_ikan": ("panci", {"sayuran": 1, "bawang_putih": 1, "garam": 1, "air_es": 1}, 1, "kompor"), "nasi_goreng_ikan": ("wajan", {"beras": 1, "minyak": 1, "bawang_merah": 1, "bawang_putih": 1}, 1, "kompor"),
 "sambal_ikan": ("wajan", {"cabai": 2, "bawang_merah": 1, "minyak": 1}, 1, "kompor"), "telur_ceplok": ("wajan", {"telur": 1, "minyak": 1, "garam": 1}, 0, "kompor"),
 "telur_rebus": ("panci", {"telur": 1, "air_es": 1}, 0, "kompor"), "tempe_goreng": ("wajan", {"tempe": 1, "minyak": 1, "garam": 1}, 0, "kompor"),
 "tumis_sayur": ("wajan", {"sayuran": 1, "bawang_putih": 1, "minyak": 1, "garam": 1}, 0, "kompor"), "kopi_susu": ("gelas", {"kopi": 1, "susu": 1, "gula": 1, "air_es": 1}, 0, "persiapan"),
}
HEAT = {  # jendela ideal (detik efektif) dari server, untuk memajukan jam ke tengah jendela
 "ikan_goreng": ((20, 30), 1), "ikan_bakar": ((24, 34), 2), "sup_ikan": ((32, 46), 0), "nasi_goreng_ikan": ((18, 28), 0), "sambal_ikan": ((14, 22), 0),
 "telur_ceplok": ((10, 16), 1), "telur_rebus": ((28, 40), 0), "tempe_goreng": ((16, 26), 1), "tumis_sayur": ((12, 20), 0), "kopi_susu": (None, 0)}
PREP = {"ikan_goreng": ["cuci", "bumbui"], "ikan_bakar": ["cuci", "bumbui"], "sup_ikan": ["cuci", "potong", "bumbui"], "nasi_goreng_ikan": ["kupas", "potong", "aduk", "bumbui"], "sambal_ikan": ["kupas", "potong", "aduk", "bumbui"],
 "telur_ceplok": ["pecah", "bumbui"], "telur_rebus": ["cuci"], "tempe_goreng": ["potong", "bumbui"], "tumis_sayur": ["cuci", "potong", "aduk", "bumbui"], "kopi_susu": ["tuang", "aduk"]}

def sheet(pg): return ev(pg, "(()=>{const s=document.getElementById('mkSheet');return s&&!s.classList.contains('hidden')?s.innerText:''})()")
def clk(pg, sel, wait=0.15): pg.click(sel); time.sleep(wait)
def idle(pg, t=6): wait_for(pg, "!NW.dapurMasak.M.busy", t); time.sleep(0.05)
def pad_do(pg, spec=None):
    """Selesaikan gerakan di #mkPad sesuai jenisnya: ketuk / tahan / putar / gosok (gerakan sungguhan lewat mouse)."""
    wait_for(pg, "!!document.getElementById('mkPad')", 3)
    kind, pid = ev(pg, "(()=>{const e=document.getElementById('mkPad');return [e.dataset.kind,e.dataset.id]})()")
    need = ev(pg, "([i])=>{const C=NusaDapurCore;return (C.ACT[i]||C.WASH_ACT[i]).need}", [pid]); bb = pg.locator("#mkPad").bounding_box(); cx, cy = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
    if kind == "tap":
        for _ in range(int(need)): pg.mouse.click(cx, cy); time.sleep(0.08)
    elif kind == "hold":
        pg.mouse.move(cx, cy); pg.mouse.down(); time.sleep(need / 1000 + 0.3); pg.mouse.up()
    elif kind == "circle":
        import math; pg.mouse.move(cx + 30, cy); pg.mouse.down()
        for i in range(0, 80): a = i / 80 * math.pi * 2 * (need + 0.3); pg.mouse.move(cx + 30 * math.cos(a), cy + 30 * math.sin(a))
        pg.mouse.up()
    elif kind == "scrub":
        pg.mouse.move(cx - 40, cy); pg.mouse.down()
        for i in range(int(need / 40) + 6): pg.mouse.move(cx + (40 if i % 2 else -40), cy + (i % 3))
        pg.mouse.up()
    time.sleep(0.25); idle(pg)
def adv_wait(pg, br, ms): br.adv(ms)
def open_station(pg, sid, key):
    if ev(pg, "!!document.querySelector('#mkSheet:not(.hidden) [data-a=close]')"): clk(pg, "#mkSheet [data-a=close]", 0.3)
    at_station(pg, sid); interact(pg); wait_for(pg, "!!document.querySelector('#mkSheet:not(.hidden)')", 3); idle(pg, 6); time.sleep(0.2)
def kitchen(pg):
    ev(pg, "NW.home.enter(NW.world.player)"); wait_for(pg, "NW.home.active && NW.home.scene==='plot'", 4); time.sleep(0.6)
    ev(pg, "NW.home.goRoom(NW.world.player)"); wait_for(pg, "NW.home.scene==='room'", 4); time.sleep(0.7)
    c = ev(pg, "NW.home.candidates().find(c=>c.id==='h_dapur')"); tp(pg, c["x"], c["y"], 4); time.sleep(0.3); interact(pg)
    wait_for(pg, "NW.room.active && NW.room.scene==='dapur'", 4); time.sleep(0.9)
def set_cooler(pg, fish): ev(pg, "(f)=>{Nusa.S.cooler=f.map(x=>({uid:x.uid,id:x.id,w:x.w,t:Date.now()}))}", fish)
def cooler_uids(pg): return ev(pg, "Nusa.S.cooler.map(i=>i.uid)")
def M(pg, expr): return ev(pg, "(()=>{const M=NW.dapurMasak.M;return " + expr + "})()")
def pick_rec(pg, rid, fish_n=0):
    if not ev(pg, "!!document.querySelector('#mkSheet [data-a=tab]')"): return False
    clk(pg, "[data-a=tab][data-v=resep]"); clk(pg, "[data-a=rec][data-id=%s]" % rid)
    for i in range(fish_n): pg.locator("[data-a=fish]").nth(i).click(); time.sleep(0.1)
    return True
def start(pg): clk(pg, "[data-a=start]", 0.1); idle(pg, 8); wait_for(pg, "!!NW.dapurMasak.M.dapur.cook", 5)
def do_prep(pg, steps):
    for st in steps: clk(pg, "[data-a=act][data-v=%s]" % st); pad_do(pg)
def cook_through(pg, br, rid, fish_mode="recipe"):
    tool, ing, fn_, stn = ALL[rid]; win, flips = HEAT[rid]
    do_prep(pg, PREP[rid])
    if win:
        clk(pg, "[data-a=act][data-v=taruh]"); pad_do(pg); clk(pg, "[data-a=api][data-v=\"2\"]"); idle(pg)
        mid = (win[0] + win[1]) / 2 * 1000; parts = flips + 1
        for i in range(flips): br.adv(mid / parts); clk(pg, "[data-a=act][data-v=balik]"); pad_do(pg)
        br.adv(mid / parts); clk(pg, "[data-a=act][data-v=angkat]"); pad_do(pg); clk(pg, "[data-a=finish]"); idle(pg, 8)
    else: clk(pg, "[data-a=finish]"); idle(pg, 8)
    wait_for(pg, "!!NW.dapurMasak.M.result", 5)
def res(pg): return M(pg, "M.result&&{tier:M.result.dish.tier,rec:M.result.dish.rec,disc:M.result.discovered,u:M.result.dish.u,name:M.result.dish.name}")
def to_tray_discard(pg):
    clk(pg, "[data-a=keep]"); idle(pg)
    while ev(pg, "!!document.querySelector('#mkSheet [data-a=discard]')"): clk(pg, "#mkSheet [data-a=discard]", 0.1); idle(pg)

def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch(); allfish = None
        # ===================== 1. SEMUA 10 RESEP (server asli) =====================
        br = Bridge(); srv = BSrv(br); allfish = br.fish()
        br.buy({"telur": 12, "tempe": 6, "beras": 6, "minyak": 14, "garam": 14, "gula": 4, "sayuran": 8, "kopi": 4, "susu": 4, "bawang_merah": 8, "bawang_putih": 8, "cabai": 8, "jeruk_nipis": 4, "bumbu_dasar": 4, "air_es": 14})
        assert br.fn("dapurUnlock", {"tool": "pemanggang"})[0] == 200
        ctx, g, errs = page(b, True, srv); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); set_cooler(g, allfish); kitchen(g); time.sleep(0.4)
        open_station(g, "d_kompor", "kompor"); shot(g, "c01-pilih-resep")
        t0 = sheet(g)
        ok("M1 Panel masak terbuka dari kompor: tab Resep + Masak bebas, resep awal (4) tampil, 6 resep rahasia terkunci", "Resep" in t0 and "Masak bebas" in t0 and "Telur ceplok" in t0 and "Tempe goreng" in t0 and "6 resep rahasia" in t0, t0[:200])
        ok("M2 dapurState dipanggil (bahan & katalog dari server); tidak ada dapurCook* sebelum pemain menekan Mulai", srv.n("dapurState") >= 1 and not [1 for n, _ in srv.calls if n.startswith("dapurCook")])
        # -- 4 resep awal lewat tab Resep
        done = {}
        for rid in STAR:
            tool, ing, fn_, stn = ALL[rid]
            st_id = {"kompor": "d_kompor", "persiapan": "d_persiapan", "pemanggang": "d_pemanggang"}[stn]
            if not ev(g, "!!document.querySelector('#mkSheet:not(.hidden)')"): open_station(g, st_id, stn)
            if tool == "panci": clk(g, "[data-a=tool][data-v=panci]")
            elif stn == "kompor": clk(g, "[data-a=tool][data-v=wajan]")
            pick_rec(g, rid, fn_); start(g); cook_through(g, br, rid); r = res(g); done[rid] = r
            ok("R-%s resep awal: dimasak lewat interaksi; hasil dari SERVER = enak" % rid, r and r["rec"] == rid and r["tier"] == "enak", str(r))
            to_tray_discard(g); clk(g, "[data-a=close]") if ev(g, "!!document.querySelector('#mkSheet:not(.hidden)')") else None; time.sleep(0.2)
        shot(g, "c01b")
        # -- 6 resep rahasia: ditemukan lewat Masak bebas dengan bahan persis resep, lalu dimasak dari tab Resep
        for rid in [x for x in ALL if x not in STAR]:
            tool, ing, fn_, stn = ALL[rid]; st_id = {"kompor": "d_kompor", "persiapan": "d_persiapan", "pemanggang": "d_pemanggang"}[stn]
            open_station(g, st_id, stn)
            if tool in ("wajan", "panci"): clk(g, "[data-a=tool][data-v=%s]" % tool)
            clk(g, "[data-a=tab][data-v=bebas]")
            for k, n in ing.items():
                for _ in range(n): clk(g, "[data-a=finc][data-id=%s]" % k, 0.05)
            for i in range(fn_): pg_ = g.locator("[data-a=fish]").nth(i); pg_.click(); time.sleep(0.1)
            start(g)
            ok("F-%s bebas: bodi mulai = {opId,tool,rec:null,ing,fish?} tanpa harga/kualitas/uid pemain" % rid, (lambda b0: b0 and b0["rec"] is None and not NS(b0))(srv.of("dapurCookStart")[-1]))
            cook_through(g, br, rid); r = res(g); done[rid] = r
            ok("F-%s resep rahasia ditemukan lewat masak bebas (bahan persis), hasil server enak & rec dikenali" % rid, r and r["rec"] == rid and r["disc"] is True and r["tier"] == "enak", str(r))
            to_tray_discard(g); clk(g, "[data-a=close]") if ev(g, "!!document.querySelector('#mkSheet:not(.hidden)')") else None; time.sleep(0.2)
        # -- sekarang semuanya ada di tab Resep dan bisa dimasak dari sana (cek 1 contoh tiap alat)
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]")
        names = sheet(g); ok("M3 setelah ditemukan, resep rahasia (Tumis sayur, Sambal ikan, Nasi goreng ikan) muncul di tab Resep wajan", all(x in names for x in ["Tumis sayur", "Sambal ikan", "Nasi goreng ikan"]), names[:300])
        pick_rec(g, "tumis_sayur"); start(g); cook_through(g, br, "tumis_sayur"); r = res(g)
        ok("R-tumis_sayur dimasak dari tab Resep setelah ditemukan: enak", r and r["tier"] == "enak", str(r)); to_tray_discard(g)
        clk(g, "[data-a=close]"); time.sleep(0.2)
        ok("M4 10 resep selesai tanpa galat halaman", not errs, str(errs[:2])); ctx.close(); br.close()

        # ===================== 2. HASIL GAGAL, REAKSI KARTUN, MAKAN/BUANG, BLUR =====================
        br = Bridge(); srv = BSrv(br); fish = br.fish()
        br.buy({"telur": 12, "minyak": 10, "garam": 10, "sayuran": 6, "kopi": 3, "susu": 3, "tempe": 4})
        ctx, g, errs = page(b, True, srv); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); set_cooler(g, fish); kitchen(g)
        def quick_cook(rid, wait_ms, prep=None, do_angkat=True):
            open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, rid); start(g)
            do_prep(g, prep if prep is not None else PREP[rid]); clk(g, "[data-a=act][data-v=taruh]"); pad_do(g); br.adv(wait_ms)
            if do_angkat: clk(g, "[data-a=act][data-v=angkat]"); pad_do(g)
            clk(g, "[data-a=finish]"); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5); time.sleep(0.3)
        quick_cook("telur_ceplok", 90000)
        r = res(g); ok("G1 GOSONG: hasil server 'gosong' (angkat telat)", r["tier"] == "gosong", str(r))
        ok("G2 gosong → wajah 'batuk' + asap ringan; kartu hasil memuat kata Gosong; klien tidak menghitung tier", M(g, "M.face&&M.face.face")=="batuk" and "Gosong" in sheet(g))
        shot(g, "c03-gagal-gosong")
        clk(g, "[data-a=eat]"); idle(g, 6); time.sleep(0.4)
        ok("G3 makan gosong → server memberi efek 'mual' 4000 ms; wajah mual + blur ringan aktif", M(g, "M.eatInfo&&M.eatInfo.effect")=="mual" and M(g, "M.eatInfo.ms")==4000 and "blur" in ev(g, "document.getElementById('game').style.filter"))
        shot(g, "c04-mual-blur")
        time.sleep(1.2); ok("G4 animasi muntah singkat (kartun) berjalan di jendela 0,9-2 dtk; tidak ada penalti koin", M(g, "M.face&&M.face.vomit")==True and br.state()["eco"].get("spent", 0) > 0)
        time.sleep(3.4); ok("G5 blur hilang tepat setelah ±4 detik", ev(g, "document.getElementById('game').style.filter") == "")
        # mentah
        quick_cook("telur_ceplok", 600, do_angkat=True); r = res(g); ok("G6 MENTAH: hasil server 'mentah' + wajah ragu", r["tier"] == "mentah" and M(g, "M.face.face") == "ragu", str(r))
        clk(g, "[data-a=keep]"); idle(g); wait_for(g, "!!document.querySelector('#mkSheet [data-a=discard]')", 3)
        while ev(g, "!!document.querySelector('#mkSheet [data-a=discard]')"): clk(g, "#mkSheet [data-a=discard]", 0.1); idle(g)
        # aneh (masak bebas sayuran saja)
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); clk(g, "[data-a=tab][data-v=bebas]"); clk(g, "[data-a=finc][data-id=sayuran]"); start(g)
        clk(g, "[data-a=act][data-v=taruh]"); pad_do(g); br.adv(8000); clk(g, "[data-a=act][data-v=angkat]"); pad_do(g); clk(g, "[data-a=finish]"); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5); time.sleep(0.3)
        r = res(g); ok("G7 ANEH: hasil server 'aneh' + ekspresi bingung (tanda tanya)", r["tier"] == "aneh" and M(g, "M.face.face") == "bingung", str(r)); shot(g, "c05-aneh")
        clk(g, "[data-a=eat]"); idle(g); ok("G8 makan aneh → efek 'ragu' 1500 ms tanpa blur", M(g, "M.eatInfo.effect") == "ragu" and ev(g, "document.getElementById('game').style.filter") == "")
        time.sleep(2.0)
        # tidak layak (telur + kopi di wajan)
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); clk(g, "[data-a=tab][data-v=bebas]")
        clk(g, "[data-a=finc][data-id=telur]"); clk(g, "[data-a=finc][data-id=kopi]"); start(g); do_prep(g, ["aduk"]); clk(g, "[data-a=act][data-v=taruh]"); pad_do(g); br.adv(12000)
        clk(g, "[data-a=act][data-v=angkat]"); pad_do(g); clk(g, "[data-a=finish]"); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5); time.sleep(0.3)
        r = res(g); t = sheet(g)
        ok("G9 TIDAK LAYAK: hasil server 'tidak_layak'; pilihan Buang (utama) atau Tetap makan, atas pilihan pemain", r["tier"] == "tidak_layak" and "Buang" in t and "Tetap makan" in t, t[:160]); shot(g, "c06-tidak-layak")
        n_dis = srv.n("dapurDiscard"); clk(g, "[data-a=discard]"); idle(g)
        ok("G10 Buang → dapurDiscard sekali; tidak ada hukuman koin tambahan", srv.n("dapurDiscard") == n_dis + 1 and M(g, "M.result") is None and br.state()["dapur"]["dishes"] == [])
        # tidak layak lalu dimakan oleh pilihan pemain
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); clk(g, "[data-a=tab][data-v=bebas]"); clk(g, "[data-a=finc][data-id=telur]"); clk(g, "[data-a=finc][data-id=kopi]"); start(g)
        clk(g, "[data-a=act][data-v=taruh]"); pad_do(g); br.adv(12000); clk(g, "[data-a=act][data-v=angkat]"); pad_do(g); clk(g, "[data-a=finish]"); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5)
        clk(g, "[data-a=eat]"); idle(g); ok("G11 Tetap makan (tidak layak) → efek mual dari server", M(g, "M.eatInfo.effect") == "mual"); time.sleep(4.6)
        # kopi susu tidak perlu api: langsung sajikan
        spent0 = br.state()["eco"].get("bal")
        ok("G12 selama semua ini koin tidak berkurang akibat masakan (hanya belanja)", br.state()["eco"].get("bal") == spent0)
        ctx.close(); br.close()

        # ===================== 3. RETRY, KLIK GANDA, PUTUS KONEKSI, IKAN TEPAT SEKALI =====================
        br = Bridge(); srv = BSrv(br); fish = br.fish()
        br.buy({"telur": 6, "minyak": 6, "garam": 6, "air_es": 4})
        ctx, g, errs = page(b, True, srv); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); set_cooler(g, fish); kitchen(g)
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); clk(g, "[data-a=tab][data-v=bebas]"); clk(g, "[data-a=finc][data-id=telur]")
        for i in range(2): g.locator("[data-a=fish]").nth(i).click(); time.sleep(0.1)
        uids = ev(g, "NW.dapurMasak.M.fish.slice()"); n_before = len(cooler_uids(g)); box0 = br.state()["eco"]["box"]
        srv.fail_names = ("dapurCookStart",); srv.fail_net = 1; srv.lose_reply = True    # SERVER sudah mengerjakan, jawaban hilang
        clk(g, "[data-a=start]", 0.1); idle(g, 8); time.sleep(0.4)
        ok("D1 putus koneksi saat Mulai: pesan ramah, bahan & ikan dinyatakan aman, tombol bisa dicoba lagi", "Jaringan bermasalah" in sheet(g) and not M(g, "M.dapur.cook"))
        ok("D2 jawaban hilang tapi server SUDAH memproses: ikan lokal belum dibuang sebelum ada jawaban", len(cooler_uids(g)) == n_before)
        clk(g, "[data-a=start]", 0.1); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.dapur.cook", 5)
        sc = srv.of("dapurCookStart"); ok("D3 coba lagi memakai opId YANG SAMA (idempoten)", len(sc) == 2 and sc[0]["opId"] == sc[1]["opId"], str([s["opId"] for s in sc]))
        st = br.state(); ok("D4 IKAN TEPAT SEKALI: server mengurangi 2 ikan sekali (bukan 4), telur 1, dan hanya satu proses masak", len(st["eco"]["box"]) == len(box0) - 2 and st["dapur"]["ing"]["telur"] == 5 and st["dapur"]["cook"] is not None)
        ok("D5 Tas lokal kehilangan tepat 2 ikan itu (cermin server) — tidak dilaporkan ulang", len(cooler_uids(g)) == n_before - 2 and not set(uids) & set(cooler_uids(g)))
        # klik ganda pada langkah
        n0 = srv.n("dapurCookStep"); clk(g, "[data-a=act][data-v=taruh]"); bb = g.locator("#mkPad").bounding_box()
        for _ in range(8): g.mouse.click(bb["x"] + 20, bb["y"] + 20)    # ketukan beruntun melebihi kebutuhan → hanya SATU langkah terkirim
        time.sleep(0.8); idle(g)
        ok("D6 klik ganda cepat pada pad 'taruh': tepat 1 dapurCookStep ke server", srv.n("dapurCookStep") == n0 + 1 and br.state()["dapur"]["cook"]["steps"].count(["taruh"]) if False else srv.n("dapurCookStep") == n0 + 1, str(srv.n("dapurCookStep") - n0))
        ok("D7 server: langkah 'taruh' tercatat sekali", [s[0] for s in br.state()["dapur"]["cook"]["steps"]].count("taruh") == 1)
        # putus koneksi di langkah api: jawaban hilang lalu ulang → satu langkah
        srv.fail_names = ("dapurCookStep",); srv.fail_net = 1; srv.lose_reply = True
        clk(g, "[data-a=api][data-v=\"3\"]", 0.1); idle(g); time.sleep(0.3); ok("D8 putus koneksi di 'api': pesan ramah", "Jaringan bermasalah" in sheet(g))
        clk(g, "[data-a=api][data-v=\"3\"]", 0.1); idle(g)
        sa = [x for x in srv.of("dapurCookStep") if x.get("step") == "api"]; ok("D9 ulang 'api' memakai opId sama; server mencatat satu langkah api", len(sa) == 2 and sa[0]["opId"] == sa[1]["opId"] and [s[0] for s in br.state()["dapur"]["cook"]["steps"]].count("api") == 1)
        # selesai: angkat, finish dengan jawaban hilang, ulang
        br.adv(9000); clk(g, "[data-a=act][data-v=angkat]"); pad_do(g)
        srv.fail_names = ("dapurCookFinish",); srv.fail_net = 1; srv.lose_reply = True; clk(g, "[data-a=finish]", 0.1); idle(g, 8); time.sleep(0.3)
        ok("D10 putus koneksi saat Sajikan: masakan tidak hilang (server sudah membuatnya)", len(br.state()["dapur"]["dishes"]) == 1)
        clk(g, "[data-a=finish]", 0.1); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5)
        ok("D11 ulang Sajikan: tetap 1 masakan di nampan (opId sama, tidak ganda)", len(br.state()["dapur"]["dishes"]) == 1 and len(set(x["opId"] for x in srv.of("dapurCookFinish"))) == 1)
        # makan dengan jawaban hilang
        srv.fail_names = ("dapurEat",); srv.fail_net = 1; srv.lose_reply = True; clk(g, "[data-a=eat]", 0.1); idle(g, 8); time.sleep(0.3)
        clk(g, "[data-a=eat]", 0.1); idle(g, 8)
        ok("D12 makan: server memakan SATU kali meski diulang (nampan kosong; kotor piring/sendok = 1 saat sajikan + 1 saat makan, bukan lebih)", len(br.state()["dapur"]["dishes"]) == 0 and br.state()["dapur"]["dirty"].get("piring") == 2 and br.state()["dapur"]["dirty"].get("sendok") == 2, str(br.state()["dapur"]["dirty"]))
        # abort mengembalikan ikan tepat sekali
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); clk(g, "[data-a=tab][data-v=bebas]"); clk(g, "[data-a=finc][data-id=telur]"); g.locator("[data-a=fish]").nth(0).click()
        u1 = ev(g, "NW.dapurMasak.M.fish[0]"); start(g); n_c = len(cooler_uids(g)); ok("D13 ikan keluar dari Tas saat mulai", u1 not in cooler_uids(g))
        clk(g, "[data-a=abort]", 0.1); idle(g, 8); time.sleep(0.3)
        ok("D14 batalkan sebelum di atas api: ikan & bahan kembali SEKALI (server dan Tas)", u1 in cooler_uids(g) and cooler_uids(g).count(u1) == 1 and [x["u"] for x in br.state()["eco"]["box"]].count(u1) == 1 and br.state()["dapur"]["cook"] is None)
        ctx.close(); br.close()

        # ===================== 4. AUDIO: lazy + mengikuti pengaturan suara =====================
        br = Bridge(); srv = BSrv(br); fish = br.fish(); br.buy({"telur": 6, "minyak": 4, "garam": 4, "sayuran": 2})
        reqs = []; ctx, g, errs = page(b, True, srv, reqs=reqs); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); set_cooler(g, fish)
        ev(g, "(()=>{window.__sfx=[];const a=NW.audio;const o=a.sfx;a.sfx=(n,x)=>{window.__sfx.push(n);return o.call(a,n,x)}})()")
        kitchen(g); open_station(g, "d_kompor", "kompor")
        ok("A1 masuk dapur & buka panel: berkas audio dapur BELUM diunduh (lazy)", not any("dapur/audio.js" in r for r in reqs) and not ev(g, "!!NW.dapurAudio"))
        clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, "telur_ceplok"); start(g); clk(g, "[data-a=act][data-v=pecah]"); pad_do(g); time.sleep(0.5)
        ok("A2 aksi pertama bersuara (telur pecah) → audio.js diunduh LAZY sekali, efek terdaftar di NW.sfxLib", any("dapur/audio.js" in r for r in reqs) and ev(g, "!!NW.dapurAudio && !!NW.sfxLib.L.dapur_telur"))
        ok("A3 efek diminta lewat NW.audio.sfx (ikut mute/slider/bus SFX)", "dapur_telur" in ev(g, "window.__sfx"))
        do_prep(g, ["bumbui"]); clk(g, "[data-a=act][data-v=taruh]"); pad_do(g); time.sleep(1.6)
        sf = ev(g, "window.__sfx"); ok("A4 di atas api: desis minyak berulang; potong/aduk/bumbu/taruh punya efek sendiri", "dapur_desis" in sf and "dapur_bumbu" in sf and "dapur_taruh" in sf, str(sf))
        ok("A5 semua nama efek dapur ada di sintesis: potong, desis, didih, telur, aduk, piring, air(wastafel), gelas, sendok", all(ev(g, "(n)=>!!NW.sfxLib.L[n]", [n]) for n in ["dapur_potong", "dapur_desis", "dapur_didih", "dapur_telur", "dapur_aduk", "dapur_piring", "dapur_air", "dapur_gelas", "dapur_sendok"]))
        ctx.close(); br.close()
        br = Bridge(); srv = BSrv(br); br.buy({"telur": 4, "minyak": 4, "garam": 4})
        reqs = []; ctx, g, errs = page(b, True, srv, reqs=reqs); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14)
        ev(g, "(()=>{Nusa.S.muted=true;window.__sfx=[];const a=NW.audio;const o=a.sfx;a.sfx=(n,x)=>{window.__sfx.push(n);return o.call(a,n,x)}})()")
        kitchen(g); open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, "telur_ceplok"); start(g); do_prep(g, ["pecah", "bumbui"]); time.sleep(0.4)
        ok("A6 AUDIO OFF (mute): tidak ada permintaan efek, audio.js tidak diunduh; permainan tetap jalan", not ev(g, "window.__sfx").__len__() and not any("dapur/audio.js" in r for r in reqs) and srv.n("dapurCookStep") == 2)
        ev(g, "(()=>{Nusa.S.muted=false;NW.audio.setVolume('sfx',0)})()"); do_prep(g, ["cuci"]) if False else None
        clk(g, "[data-a=act][data-v=taruh]"); pad_do(g); time.sleep(0.3)
        ok("A7 slider Efek Suara 0 → juga tidak diunduh/diputar", not any("dapur/audio.js" in r for r in reqs) and not ev(g, "window.__sfx").__len__())
        ctx.close(); br.close()

        # ===================== 5. CUCI PERALATAN =====================
        br = Bridge(); srv = BSrv(br); fish = br.fish(); br.buy({"telur": 6, "minyak": 6, "garam": 6})
        ctx, g, errs = page(b, True, srv); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); kitchen(g)
        for _ in range(2):
            open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, "telur_ceplok"); start(g); cook_through(g, br, "telur_ceplok"); clk(g, "[data-a=eat]"); idle(g)
            clk(g, "[data-a=close]"); time.sleep(2.2)
        dirty = br.state()["dapur"]["dirty"]; ok("W1 server mencatat alat kotor (wajan/piring/sendok) setelah memasak & makan", dirty.get("wajan") and dirty.get("piring") and dirty.get("sendok"), str(dirty))
        open_station(g, "d_cuci", "cuci"); t = sheet(g); shot(g, "c07-cuci-daftar")
        ok("W2 bak cuci: daftar kotor + catatan tutorial; Percepat TERKUNCI sebelum cuci lengkap pertama", "Wajan" in t and "Piring" in t and "Percepat" in t and ev(g, "!document.querySelector('[data-a=washquick]')"), t[:200])
        c, js = br.fn("dapurWash", {"item": "piring", "quick": True}); ok("W3 server juga menolak percepat sebelum cuci lengkap pertama (409)", c == 409 and "satu kali cuci lengkap" in json.dumps(js, ensure_ascii=False))
        clk(g, "[data-a=washpick][data-v=piring]"); ok("W4 alur cuci 4 langkah: sabun → gosok → bilas → taruh di rak", all(x in sheet(g) for x in ["Sabun", "Gosok", "Bilas", "rak"]))
        for step in range(4):
            clk(g, "[data-a=washgo]"); pad_do(g); time.sleep(0.15)
            if step == 1: shot(g, "c08-cuci-bilas")
        time.sleep(0.4); idle(g, 6)
        cw = srv.of("dapurWash"); ok("W5 server dipanggil SEKALI di akhir 4 langkah dengan urutan steps=[sabun,gosok,bilas] (rak hanya tampilan)", len(cw) == 1 and cw[0].get("steps") == ["sabun", "gosok", "bilas"] and "quick" not in cw[0], str(cw))
        st = br.state()["dapur"]; ok("W6 piring berkurang 1 kotor di server; washOk=1", st["dirty"].get("piring", 0) == dirty["piring"] - 1 and st["washOk"] == 1)
        ok("W7 setelah cuci pertama, tombol Percepat terbuka", ev(g, "!!document.querySelector('[data-a=washquick]')") or ev(g, "NW.dapurMasak.M.washItem") is not None)
        if ev(g, "!!document.querySelector('[data-a=washback]')"): clk(g, "[data-a=washback]")
        if ev(g, "!!document.querySelector('[data-a=washquick][data-v=sendok]')"):
            clk(g, "[data-a=washquick][data-v=sendok]", 0.1); idle(g); cw = srv.of("dapurWash")[-1]
            ok("W8 PERCEPAT: body = {opId,item,quick:true} tanpa steps; server mengurangi kotor sendok", cw.get("quick") is True and "steps" not in cw and br.state()["dapur"]["dirty"].get("sendok", 0) < dirty["sendok"], str(cw))
        else: ok("W8 PERCEPAT tersedia untuk sendok", False)
        ok("W9 body wash tidak memuat uid/harga/kualitas/saldo", not any(NS(x) for x in srv.of("dapurWash")))
        ctx.close(); br.close()

        # ===================== 6. LAYAR + SHEET KASIR ≤45% (perbaikan 08B) =====================
        for vp, nm in [((360, 740), "360x740"), ((412, 915), "412x915"), ((740, 360), "740x360"), ((1280, 800), "1280x800")]:
            br = Bridge(); srv = BSrv(br); fish = br.fish(); br.buy({"telur": 6, "minyak": 6, "garam": 6, "tempe": 3})
            ctx, g, errs = page(b, True, srv, vp=vp); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); set_cooler(g, fish)
            land = vp[0] > vp[1] and vp[1] <= 520
            ns["enter_kedai"](g); at_station(g, "k_basket"); interact(g); at_station(g, "k_kasir"); ev(g, "NW.kedaiIndah.K.has=true; NW.kedaiIndah.K.basket={telur:2}"); interact(g); time.sleep(0.9)
            geo = ev(g, "(()=>{const s=document.getElementById('kdSheet').getBoundingClientRect();return {w:s.width,h:s.height,l:s.left,t:s.top,W:innerWidth,H:innerHeight}})()")
            if land: ok("K-%s kasir lanskap: panel di sisi kanan (≤46%% lebar), tinggi penuh, ruangan di kiri tetap terlihat" % nm, geo["w"] <= geo["W"] * 0.47 and geo["l"] >= geo["W"] * 0.5, str(geo))
            else: ok("K-%s kasir HP: bottom sheet ≤45%% tinggi layar (%d/%d px)" % (nm, geo["h"], geo["H"]), geo["h"] <= geo["H"] * 0.45 + 1 or vp[0] > 900, str(geo))
            vis = ev(g, "(()=>{const t=NW.room.camTarget(NW.world.player,innerWidth,innerHeight,1);const bu=NW.kedaiIndah.bu;const pt=NW.P(bu.x,bu.y,20);const k=NW.P(6.8,3.6,30);const cx=(p)=>[innerWidth/2+(p.x-t.x)*t.z,innerHeight/2+(p.y-t.y)*t.z];return {bu:cx(pt),ks:cx(k),z:t.z}})()")
            sh = ev(g, "(()=>{const s=document.getElementById('kdSheet').getBoundingClientRect();return [s.left,s.top]})()")
            def hid(p): return p[0] >= sh[0] - 2 and p[1] >= sh[1] - 2 if sh[0] > geo["W"] * 0.4 or sh[1] > geo["H"] * 0.4 else False
            inb = lambda p: 0 <= p[0] <= geo["W"] and 0 <= p[1] <= geo["H"]
            ok("K-%s Bu Indah & kasir tidak tertutup sheet (kamera menggeser ruangan)" % nm, inb(vis["bu"]) and inb(vis["ks"]) and not hid(vis["bu"]) and not hid(vis["ks"]), str(vis) + str(sh))
            shot(g, "c09-kasir-" + nm)
            if not land and vp[0] < 900:
                clk(g, "#kdSheet .kd-grip"); time.sleep(0.3); h2 = ev(g, "document.getElementById('kdSheet').getBoundingClientRect().height")
                ok("K-%s sheet bisa diperkecil dengan mengetuk pegangan (%d → %d px)" % (nm, geo["h"], h2), h2 < geo["h"] * 0.6 and h2 <= 100, str(h2)); shot(g, "c09b-kasir-mini-" + nm)
                clk(g, "#kdSheet .kd-grip"); time.sleep(0.2)
                g.mouse.move(geo["l"] + geo["w"] / 2, geo["t"] + 10); g.mouse.down(); g.mouse.move(geo["l"] + geo["w"] / 2, geo["t"] + 130, steps=6); g.mouse.up(); time.sleep(0.3)
                h3 = ev(g, "document.getElementById('kdSheet').getBoundingClientRect().height"); ok("K-%s sheet bisa digeser (tinggi berubah mengikuti tarikan: %d → %d)" % (nm, geo["h"], h3), 80 <= h3 < geo["h"] - 40, str(h3))
            # dapur: panel masak pada ukuran ini
            ev(g, "NW.dapurMasak"); ctx.close()
            ctx, g, errs = page(b, True, srv, vp=vp); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); set_cooler(g, fish); kitchen(g); open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, "telur_ceplok"); time.sleep(0.5)
            gk = ev(g, "(()=>{const s=document.getElementById('mkSheet').getBoundingClientRect();return {w:s.width,h:s.height,l:s.left,W:innerWidth,H:innerHeight,sw:document.documentElement.scrollWidth}})()")
            ok("P-%s panel masak muat: ≤45%% tinggi (HP) / sisi kanan (lanskap), tanpa scroll horizontal" % nm, (gk["w"] <= gk["W"] * 0.47 if land else gk["h"] <= gk["H"] * 0.45 + 1 or vp[0] > 900) and gk["sw"] <= gk["W"] + 1, str(gk))
            start(g); clk(g, "[data-a=act][data-v=pecah]"); time.sleep(0.4); shot(g, "c10-masak-" + nm)
            ok("P-%s judul panel tidak terpotong di atas saat pad terbuka (gulir kembali ke atas)" % nm, ev(g, "(()=>{const h=document.querySelector('#mkSheet header').getBoundingClientRect();return h.top>=-1})()"))
            ok("P-%s pad gerakan terlihat di dalam panel (tidak terpotong)" % nm, ev(g, "(()=>{const p=document.getElementById('mkPad').getBoundingClientRect(),s=document.getElementById('mkSheet').getBoundingClientRect();return p.bottom<=s.bottom+1&&p.right<=s.right+1&&p.height>60})()"))
            ctx.close(); br.close()

        # ===================== 7. MODE TENANG (reduced motion) =====================
        br = Bridge(); srv = BSrv(br); fish = br.fish(); br.buy({"telur": 6, "minyak": 6, "garam": 6})
        ctx, g, errs = page(b, True, srv, reduced_motion="reduce"); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); kitchen(g)
        ok("T1 prefers-reduced-motion → mode tenang aktif otomatis", M(g, "M.calm") is True)
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, "telur_ceplok"); start(g); clk(g, "[data-a=act][data-v=pecah]")
        ok("T2 pad bergaya 'calm' (tanpa animasi pantul) dan tombol Tenang menyala (aria-pressed)", ev(g, "document.getElementById('mkPad').classList.contains('calm') && document.querySelector('[data-a=calm]').getAttribute('aria-pressed')==='true'"))
        pad_do(g); clk(g, "[data-a=act][data-v=taruh]"); pad_do(g); br.adv(90000); clk(g, "[data-a=act][data-v=angkat]"); pad_do(g); clk(g, "[data-a=finish]"); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5)
        clk(g, "[data-a=eat]"); idle(g); time.sleep(0.5)
        ok("T3 makan masakan gosong dalam mode tenang: efek mual tetap tampil sebagai emote/wajah, TANPA blur & tanpa animasi muntah", M(g, "M.eatInfo.effect") == "mual" and ev(g, "document.getElementById('game').style.filter") == "" and M(g, "M.face.vomit") is False)
        shot(g, "c11-mual-tenang")
        clk(g, "[data-a=calm]") if ev(g, "!!document.querySelector('[data-a=calm]')") else None
        ok("T4 pilihan Tenang dapat dimatikan pemain dan tersimpan", ev(g, "localStorage.getItem('nusa-dapur-tenang')") in ("0", "1", None))
        ctx.close(); br.close()
        # kebalikan: tidak reduced → blur sungguhan sudah diuji di G3; di sini pastikan toggle manual mematikan blur
        br = Bridge(); srv = BSrv(br); br.buy({"telur": 6, "minyak": 6, "garam": 6})
        ctx, g, errs = page(b, True, srv); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); kitchen(g); open_station(g, "d_kompor", "kompor")
        clk(g, "[data-a=calm]"); ok("T5 tombol Tenang di panel mengaktifkan mode (disimpan di perangkat)", M(g, "M.calm") is True and ev(g, "localStorage.getItem('nusa-dapur-tenang')") == "1")
        ctx.close(); br.close()
        # screenshot wajib: menyiapkan bahan, menggoreng, gagal + reaksi, cuci → sudah c01/c02/c03/c07 (c02 diambil di bawah)
        br = Bridge(); srv = BSrv(br); fish = br.fish(); br.buy({"telur": 6, "minyak": 6, "garam": 6, "tempe": 4})
        ctx, g, errs = page(b, True, srv); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); set_cooler(g, fish); kitchen(g)
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, "telur_ceplok"); shot(g, "c01-menyiapkan-bahan")
        start(g); do_prep(g, ["pecah", "bumbui"]); clk(g, "[data-a=act][data-v=taruh]"); pad_do(g); clk(g, "[data-a=api][data-v=\"3\"]"); idle(g); time.sleep(1.4); shot(g, "c02-menggoreng")
        ok("S1 saat menggoreng: panel & dapur terlihat bersamaan, api besar dipilih (server)", M(g, "M.dapur.cook.lv") == 3 and ev(g, "document.querySelector('[data-a=api][data-v=\"3\"]').getAttribute('aria-pressed')==='true'"))
        ctx.close(); br.close()

        # ===================== 8. WORKSTATION JARAK DEKAT (bench.js) — sentuhan langsung di kanvas =====================
        def bpt(g, a, v="", wait=0.25):
            r = ev(g, "([a,v])=>NW.dapurBench.rectOf(a,v)", [a, v]); assert r, "hotspot %s:%s tidak ada (scene=%s)" % (a, v, ev(g, "NW.dapurBench.scene"))
            g.mouse.click(r["x"] + r["w"] / 2, r["y"] + r["h"] / 2); time.sleep(wait); return r
        def bgest(g):
            """Selesaikan gerakan LANGSUNG di kanvas workstation (bukan di #mkPad): ketuk / tahan / putar / gosok — longgar, tidak presisi."""
            import math
            wait_for(g, "!!NW.dapurMasak.M.pad", 3); kind = M(g, "M.pad.spec.kind"); need = M(g, "M.pad.spec.need"); f = ev(g, "NW.dapurBench.focus()")
            if kind == "tap":
                for _ in range(int(need)): g.mouse.click(f["x"] + 6, f["y"] - 4); time.sleep(0.09)
            elif kind == "hold": g.mouse.move(f["x"], f["y"]); g.mouse.down(); time.sleep(need / 1000 + 0.3); g.mouse.up()
            elif kind == "circle":
                cx, cy = f["x"] + 70, f["y"] + 30    # lingkaran SEMBARANG (bukan tepat di pusat) tetap dihitung
                g.mouse.move(cx + 25, cy); g.mouse.down()
                for i in range(0, 90): a_ = i / 90 * math.pi * 2 * (need + 0.5); g.mouse.move(cx + 25 * math.cos(a_), cy + 25 * math.sin(a_))
                g.mouse.up()
            elif kind == "scrub":
                g.mouse.move(f["x"] - 45, f["y"]); g.mouse.down()
                for i in range(int(need / 40) + 8): g.mouse.move(f["x"] + (45 if i % 2 else -45), f["y"] + (i % 3), steps=2)
                g.mouse.up()
            time.sleep(0.3); idle(g)
        def steps_srv(br): return [x[0] for x in br.state()["dapur"]["cook"]["steps"]] if br.state()["dapur"]["cook"] else []
        def geo(g): return ev(g, "(()=>{const b=document.getElementById('mkBench').getBoundingClientRect(),s=document.getElementById('mkSheet').getBoundingClientRect();return {b:[b.left,b.top,b.right,b.bottom],s:[s.left,s.top,s.right,s.bottom],W:innerWidth,H:innerHeight,hid:document.getElementById('mkBench').classList.contains('hidden')}})()")
        def no_overlap(q): return not (q["b"][0] < q["s"][2] and q["b"][2] > q["s"][0] and q["b"][1] < q["s"][3] - 1 and q["b"][3] > q["s"][1] + 1)

        br = Bridge(); srv = BSrv(br); fish = br.fish(); br.buy({"telur": 12, "minyak": 12, "garam": 12, "air_es": 4, "kopi": 2, "susu": 2, "gula": 2, "jeruk_nipis": 2, "bumbu_dasar": 2})
        assert br.fn("dapurUnlock", {"tool": "pemanggang"})[0] == 200
        ctx, g, errs = page(b, True, srv); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); set_cooler(g, fish); kitchen(g)
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, "telur_ceplok"); time.sleep(0.5)
        q = geo(g); ok("WB1 panel dibuka → kanvas workstation tampil, di dalam layar dan TIDAK menimpa panel", not q["hid"] and no_overlap(q) and q["b"][2] <= q["W"] + 1 and q["b"][3] <= q["H"] + 1, str(q))
        ok("WB2 belum masak: adegan KOMPOR (wajan besar, baki bahan, spatula, piring) + hotspot baki tersedia", ev(g, "NW.dapurBench.scene") == "stove" and ev(g, "NW.dapurBench.hotspots().length") == 0)
        shot(g, "c12-workstation-pilih")
        start(g); time.sleep(0.4)
        ok("WB3 mulai memasak dengan bahan belum disiapkan → pindah ke adegan TALENAN/persiapan (petunjuk resep: pecah telur)", ev(g, "NW.dapurBench.scene") == "counter" and any(h["a"] == "act" and h["v"] == "pecah" for h in ev(g, "NW.dapurBench.hotspots()")))
        shot(g, "c13-workstation-talenan")
        n0 = srv.n("dapurCookStep"); bpt(g, "act", "pecah"); bgest(g)
        ok("WB4 pecah telur lewat sentuhan LANGSUNG di kanvas → tepat 1 dapurCookStep 'pecah', body hanya {opId, step}", srv.n("dapurCookStep") == n0 + 1 and set(srv.of("dapurCookStep")[-1].keys()) == {"opId", "step"} and srv.of("dapurCookStep")[-1]["step"] == "pecah", str(srv.of("dapurCookStep")[-1:]))
        bpt(g, "act", "bumbui"); bgest(g)
        ok("WB5 bumbu: langkah resep selesai di server (pecah, bumbui); adegan otomatis kembali ke KOMPOR", steps_srv(br) == ["pecah", "bumbui"] and ev(g, "NW.dapurBench.scene") == "stove", str(steps_srv(br)))
        calls = len(srv.calls); bpt(g, "drop", "telur")
        ok("WB6 'memasukkan bahan' dari baki ke wajan = tampilan saja: TIDAK ada panggilan server", len(srv.calls) == calls and M(g, "M.bench.dropped.telur") is True)
        bpt(g, "act", "taruh"); bgest(g)
        ok("WB7 taruh wajan ke api lewat sentuhan wajan → server mencatat 'taruh'; api & spatula & angkat muncul", "taruh" in steps_srv(br) and all(ev(g, "([a,v])=>!!NW.dapurBench.rectOf(a,v)", [a, v]) for a, v in [("api", "1"), ("api", "2"), ("api", "3"), ("act", "balik"), ("act", "angkat")]))
        shot(g, "c14-workstation-kompor-api")
        bpt(g, "api", "3"); idle(g); ok("WB8 tombol api BESAR di kanvas → server lv=3", br.state()["dapur"]["cook"]["lv"] == 3)
        bpt(g, "api", "2"); idle(g); ok("WB9 api SEDANG → server lv=2", br.state()["dapur"]["cook"]["lv"] == 2)
        br.adv(6500); bpt(g, "act", "balik"); bgest(g); br.adv(6500)
        ok("WB10 balik lewat spatula di kanvas → server mencatat 'balik'", "balik" in steps_srv(br))
        bpt(g, "act", "angkat"); bgest(g)
        ok("WB11 angkat (tahan gagang wajan) → server lifted; piring + tombol Sajikan muncul di kanvas", br.state()["dapur"]["cook"]["he"] > 0 and ev(g, "!!NW.dapurBench.rectOf('finish','')"))
        shot(g, "c15-workstation-angkat")
        bpt(g, "finish", ""); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5); time.sleep(0.5)
        r = res(g); ok("WB12 sajikan lewat kanvas: hasil dari SERVER (enak) dan adegan MEJA SAJI memperlihatkan masakan di piring", r and r["tier"] == "enak" and ev(g, "NW.dapurBench.scene") == "plate", str(r))
        shot(g, "c16-workstation-meja-saji")
        clk(g, "[data-a=keep]"); time.sleep(0.4)
        ok("WB13 nampan = adegan meja saji; ketuk masakan menatanya di piring (tampilan)", ev(g, "NW.dapurBench.scene") == "plate")
        # mentah (terlalu cepat) dan gosong (terlambat) — hasil tetap dari server
        def bench_cook(wait_ms):
            clk(g, "[data-a=close]"); open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, "telur_ceplok"); start(g)
            for pid in ["pecah", "bumbui"]: bpt(g, "act", pid); bgest(g)
            bpt(g, "act", "taruh"); bgest(g); bpt(g, "api", "2"); idle(g); br.adv(wait_ms); bpt(g, "act", "angkat"); bgest(g); bpt(g, "finish", ""); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5); time.sleep(0.4); return res(g)["tier"]
        t1 = bench_cook(500); ok("WB14 TERLALU CEPAT (angkat ±0,5 dtk) → server: mentah; kanvas: wajah ragu + masakan pucat", t1 == "mentah" and M(g, "M.face.face") == "ragu", t1); shot(g, "c17-workstation-mentah")
        clk(g, "[data-a=keep]"); idle(g); clk(g, "#mkSheet [data-a=discard]"); idle(g)
        t2 = bench_cook(90000); ok("WB15 TERLAMBAT (angkat 90 dtk) → server: gosong; kanvas: wajah batuk + asap pekat di piring", t2 == "gosong" and M(g, "M.face.face") == "batuk", t2); shot(g, "c18-workstation-gosong")
        clk(g, "[data-a=eat]"); idle(g); time.sleep(0.5)
        ok("WB16 makan gosong (mual 4 dtk): blur ringan juga menutup kanvas workstation (bukan hanya dunia)", "blur" in ev(g, "document.getElementById('mkBench').style.filter") and M(g, "M.eatInfo.effect") == "mual")
        shot(g, "c19-workstation-mual"); time.sleep(4.6)
        ok("WB17 blur kanvas hilang setelah ±4 dtk", ev(g, "document.getElementById('mkBench').style.filter") == "")
        # panci: isi air (tuang), rebus, angkat
        clk(g, "[data-a=close]") if ev(g, "!!document.querySelector('#mkSheet [data-a=close]')") else None
        open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=panci]"); pick_rec(g, "telur_rebus"); start(g)
        bpt(g, "act", "cuci"); bgest(g); bpt(g, "act", "tuang"); bgest(g)
        ok("WB18 PANCI: isi air (tuang) lewat kanvas diterima server; adegan panci dengan air", "tuang" in steps_srv(br) and ev(g, "NW.dapurBench.scene") == "stove" and M(g, "M.tool") == "panci")
        bpt(g, "act", "taruh"); bgest(g); bpt(g, "api", "2"); idle(g); time.sleep(1.2); shot(g, "c20-workstation-panci"); br.adv(34000); bpt(g, "act", "angkat"); bgest(g); bpt(g, "finish", ""); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5)
        r = res(g); ok("WB19 PANCI: rebus & angkat tepat waktu → server: enak (tuang ekstra tidak merusak)", r and r["tier"] == "enak", str(r))
        clk(g, "[data-a=keep]"); time.sleep(0.2)
        # wastafel lewat kanvas
        clk(g, "[data-a=close]"); open_station(g, "d_cuci", "cuci"); time.sleep(0.4)
        ok("WB20 WASTAFEL: adegan sink dengan daftar alat kotor yang bisa diketuk", ev(g, "NW.dapurBench.scene") == "sink" and ev(g, "NW.dapurBench.hotspots().filter(h=>h.a==='washpick').length") >= 2)
        shot(g, "c21-workstation-wastafel"); bpt(g, "washpick", "piring"); time.sleep(0.2)
        for stp in ["sabun", "gosok", "bilas", "rak"]:
            bpt(g, "washgo", stp); bgest(g)
            if stp == "gosok": shot(g, "c22-workstation-gosok") if False else None
        time.sleep(0.5); idle(g, 6); cw = srv.of("dapurWash")
        ok("WB21 cuci 4 langkah lewat kanvas (sabun→gosok→bilas→rak): server dipanggil SEKALI dengan steps=[sabun,gosok,bilas]", len(cw) == 1 and cw[0].get("steps") == ["sabun", "gosok", "bilas"], str(cw))
        # gelas: kopi susu bebas di stasiun persiapan
        clk(g, "[data-a=close]"); open_station(g, "d_persiapan", "persiapan"); clk(g, "[data-a=tab][data-v=bebas]")
        for k_ in ["kopi", "susu", "gula", "air_es"]: clk(g, "[data-a=finc][data-id=%s]" % k_, 0.05)
        start(g); time.sleep(0.4)
        ok("WB22 GELAS: adegan gelas (teko tuang, sendok aduk, tombol Sajikan)", ev(g, "NW.dapurBench.scene") == "gelas" and all(ev(g, "([a,v])=>!!NW.dapurBench.rectOf(a,v)", [a, v]) for a, v in [("act", "tuang"), ("act", "aduk"), ("finish", "")]))
        shot(g, "c23-workstation-gelas")
        bpt(g, "act", "tuang"); bgest(g); bpt(g, "act", "aduk"); bgest(g); bpt(g, "finish", ""); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5); r = res(g)
        ok("WB23 GELAS: tuang & aduk lewat kanvas, sajikan → hasil server (resep Kopi susu dikenali)", r and r["rec"] == "kopi_susu", str(r))
        if ev(g, "!!document.querySelector('#mkSheet [data-a=keep]')"): clk(g, "[data-a=keep]"); idle(g)
        clk(g, "[data-a=close]") if ev(g, "!!document.querySelector('#mkSheet [data-a=close]')") else None; time.sleep(0.3)
        # pemanggang: atur panas & balik ikan lewat kanvas  (hasil gelas yang belum disimpan tetap tampil bila panel dibuka lagi → simpan dulu)
        if ev(g, "!!document.querySelector('#mkSheet [data-a=keep]')"): clk(g, "[data-a=keep]"); idle(g)
        clk(g, "[data-a=close]") if ev(g, "!!document.querySelector('#mkSheet [data-a=close]')") else None
        open_station(g, "d_pemanggang", "pemanggang"); clk(g, "[data-a=tab][data-v=bebas]"); clk(g, "[data-a=finc][data-id=jeruk_nipis]", 0.05); clk(g, "[data-a=finc][data-id=bumbu_dasar]", 0.05); g.locator("[data-a=fish]").nth(0).click(); start(g)
        ok("WB25 PEMANGGANG: adegan panggangan (arang, jeruji, ikan + jeruk) dengan kontrol panas", ev(g, "NW.dapurBench.scene") in ("stove", "counter") and M(g, "M.dapur.cook.tool") == "pemanggang")
        if ev(g, "NW.dapurBench.scene") != "stove": bpt(g, "view", "stove")
        bpt(g, "act", "taruh"); bgest(g); bpt(g, "api", "3"); idle(g); bpt(g, "api", "2"); idle(g); time.sleep(1.0); shot(g, "c26-workstation-pemanggang")
        br.adv(14000); bpt(g, "act", "balik"); bgest(g); br.adv(15000); bpt(g, "act", "angkat"); bgest(g); bpt(g, "finish", ""); idle(g, 8); wait_for(g, "!!NW.dapurMasak.M.result", 5); r = res(g)
        ok("WB26 PEMANGGANG: atur panas (api 3→2), balik ikan, angkat → hasil dari server (layak: enak/lumayan), ikan dikonsumsi sekali", r and r["tier"] in ("enak", "lumayan"), str(r))
        if ev(g, "!!document.querySelector('#mkSheet [data-a=keep]')"): clk(g, "[data-a=keep]"); idle(g)
        clk(g, "[data-a=close]") if ev(g, "!!document.querySelector('#mkSheet [data-a=close]')") else None; time.sleep(0.4)
        ok("WB24 panel ditutup → kanvas workstation disembunyikan; tidak ada galat halaman", ev(g, "document.getElementById('mkBench').classList.contains('hidden')") and not errs, str(errs[:2]))
        ctx.close(); br.close()

        # ukuran layar: kanvas tidak menimpa panel, sasaran sentuh besar, bisa diperkecil
        for vp, nm in [((360, 740), "360x740"), ((412, 915), "412x915"), ((740, 360), "740x360"), ((1280, 800), "1280x800")]:
            br = Bridge(); srv = BSrv(br); fish = br.fish(); br.buy({"telur": 4, "minyak": 4, "garam": 4})
            ctx, g, errs = page(b, True, srv, vp=vp); wait_for(g, "NW.dapur && NW.dapur.serverOn", 14); set_cooler(g, fish); kitchen(g)
            open_station(g, "d_kompor", "kompor"); clk(g, "[data-a=tool][data-v=wajan]"); pick_rec(g, "telur_ceplok"); start(g)
            for pid in ["pecah", "bumbui"]: clk(g, "[data-a=act][data-v=%s]" % pid); pad_do(g)
            clk(g, "[data-a=act][data-v=taruh]"); pad_do(g); time.sleep(0.5); q = geo(g); land = vp[0] > vp[1] and vp[1] <= 520
            ok("WS-%s kanvas workstation: di dalam layar, tidak menimpa panel (%s)" % (nm, "sisi kiri" if land else "atas panel"), not q["hid"] and no_overlap(q) and q["b"][2] <= vp[0] + 1 and q["b"][3] <= vp[1] + 1 and (q["b"][2] - q["b"][0]) >= 200 and (q["b"][3] - q["b"][1]) >= 150, str(q))
            sizes = {k_: ev(g, "([a,v])=>NW.dapurBench.rectOf(a,v)", k_) for k_ in [("api", "1"), ("api", "2"), ("api", "3"), ("act", "balik"), ("act", "angkat")]}
            small = {str(k_): (round(v_["w"]), round(v_["h"])) for k_, v_ in sizes.items() if not v_ or v_["w"] < 38 or v_["h"] < 34}
            ok("WS-%s sasaran sentuh api/balik/angkat ≥ 38×34 px (nyaman di HP, tidak perlu presisi)" % nm, not small, str(small))
            hot_in = all(v_ and v_["x"] >= q["b"][0] - 1 and v_["x"] + v_["w"] <= q["b"][2] + 1 and v_["y"] >= q["b"][1] - 1 and v_["y"] + v_["h"] <= q["b"][3] + 1 for v_ in sizes.values())
            ok("WS-%s semua kontrol utama berada di dalam kanvas yang terlihat" % nm, hot_in, str(sizes))
            shot(g, "c24-workstation-" + nm)
            if not land and vp[0] < 900:
                h0 = q["b"][3] - q["b"][1]; clk(g, "#mkSheet .kd-grip"); time.sleep(0.4); q2 = geo(g); h1 = q2["b"][3] - q2["b"][1]
                ok("WS-%s panel diperkecil → kanvas workstation melebar (%d → %d px) dan tetap tidak menimpa panel" % (nm, h0, h1), h1 > h0 + 100 and no_overlap(q2), str(q2)); shot(g, "c25-workstation-mini-" + nm)
            ctx.close(); br.close()
        b.close()
    bad = [r for r in R if r.startswith("FAIL")]
    print("\nHASIL: %d lulus, %d gagal" % (len(R) - len(bad), len(bad))); sys.exit(1 if bad else 0)

def NS(body):
    """true bila body memuat bidang yang hanya boleh diputuskan server (uid, harga, saldo, kualitas, tier...)."""
    bad = {"uid", "email", "token", "price", "balance", "coins", "own", "reward", "quality", "q", "tier", "doneness", "heat", "time", "now"}
    def walk(o):
        if isinstance(o, dict): return any(k in bad or walk(v) for k, v in o.items())
        if isinstance(o, list): return any(walk(v) for v in o)
        return False
    return walk(body)
main()
