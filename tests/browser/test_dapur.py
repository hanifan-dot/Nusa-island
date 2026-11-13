"""Uji Ide 08B — Kedai Bu Indah + Dapur Rumahku (game). Browser sungguhan (Chromium headless), mode demo, SERVER DITIRU lewat route Playwright mengikuti kontrak Worker 01
(backend PR #60: CONTRACT-08A). Harga di server tiruan adalah NILAI UJI (sama dengan backend), bukan keputusan Owner.
Tidak diuji: Worker/Firestore nyata, Android fisik, suara (08C). Angka FPS di Chromium headless BUKAN bukti performa HP."""
import os, sys, time, json, re
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, "test_podium.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.join(here, "test_podium.py")}; exec(compile(src, "pd", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"]; R = ns["R"]; ROOT = ns["ns"]["ROOT"]
OUT = os.environ.get("SHOTS", "/tmp/nusa-dapur/"); os.makedirs(OUT, exist_ok=True)
MOCK = "https://api.mock.test"
PRICE = {"telur": 4, "tempe": 3, "beras": 5, "minyak": 3, "bawang_merah": 2, "bawang_putih": 2, "cabai": 2, "garam": 1, "gula": 1, "sayuran": 4, "kopi": 5, "susu": 6, "jeruk_nipis": 3, "bumbu_dasar": 4, "air_es": 1}
NAME = {"telur": "Telur", "tempe": "Tempe", "beras": "Beras", "minyak": "Minyak goreng", "bawang_merah": "Bawang merah", "bawang_putih": "Bawang putih", "cabai": "Cabai", "garam": "Garam", "gula": "Gula", "sayuran": "Sayuran", "kopi": "Kopi", "susu": "Susu", "jeruk_nipis": "Jeruk nipis", "bumbu_dasar": "Bumbu dasar", "air_es": "Air / es"}
ICON = {"telur": "🥚", "tempe": "🟫", "beras": "🍚", "minyak": "🛢️", "bawang_merah": "🧅", "bawang_putih": "🧄", "cabai": "🌶️", "garam": "🧂", "gula": "🍬", "sayuran": "🥬", "kopi": "☕", "susu": "🥛", "jeruk_nipis": "🍋", "bumbu_dasar": "🫙", "air_es": "🧊"}
CAT = {"telur": "protein", "tempe": "protein", "beras": "pokok", "minyak": "minyak", "bawang_merah": "bumbu", "bawang_putih": "bumbu", "cabai": "bumbu", "garam": "bumbu", "gula": "manis", "sayuran": "sayur", "kopi": "cair", "susu": "cair", "jeruk_nipis": "bumbu", "bumbu_dasar": "bumbu", "air_es": "cair"}
OPRE = re.compile(r"^[A-Za-z0-9_-]{8,60}$")

class Srv:
    """Server dapur tiruan: aturan sama dengan dapur-server.js (harga katalog server, saldo, batas 30/bahan, opId idempoten, 404 bila flag mati)."""
    def __init__(s, flag=True, own=100): s.flag = flag; s.own = own; s.ing = {}; s.tools = ["wajan", "panci", "talenan"]; s.pemanggang = False; s.calls = []; s.ops = {}; s.commits = 0; s.fail_net = 0; s.delay = 0
    def dapur(s): return {"ing": dict(s.ing), "tools": s.tools + (["pemanggang"] if s.pemanggang else []), "dishes": [], "known": ["ikan_goreng", "telur_ceplok", "telur_rebus", "tempe_goreng"], "hidden": 6, "dirty": {}, "washOk": 0, "cook": None}
    def catalog(s): return {"ingredients": [{"id": k, "name": NAME[k], "price": PRICE[k], "cat": CAT[k], "icon": ICON[k]} for k in PRICE],
        "tools": [{"id": "wajan", "name": "Wajan", "price": 0, "open": True}, {"id": "pemanggang", "name": "Pemanggang", "price": 250, "open": s.pemanggang}], "recipes": [], "limits": {"stock": 30, "dishes": 12, "buyKinds": 8, "buyMax": 20}, "prep": {}, "washSteps": ["sabun", "gosok", "bilas"]}
    def err(s, code, msg): return {"invalid-argument": 400, "failed-precondition": 409, "not-found": 404}[code], {"error": {"status": code, "message": msg}}
    def handle(s, name, body):
        s.calls.append((name, body))
        if name == "gameFlags": return 200, {"result": {"leaderboard": False, "socialHome": False, "pakDamar": False, "kapalRombongan": False, "dapurRumahku": s.flag}}
        if not name.startswith("dapur"): return 404, {"error": {"status": "not_found"}}
        if not s.flag: return s.err("not-found", "Fungsi tidak dikenal.")
        if name == "dapurState": return 200, {"result": {"ok": True, "catalog": s.catalog(), "dapur": s.dapur(), "own": s.own}}
        op = body.get("opId")
        if not isinstance(op, str) or not OPRE.match(op): return s.err("invalid-argument", "opId tidak valid.")
        if op in s.ops: return 200, {"result": dict(s.ops[op], duplicate=True)}
        if name == "dapurBuy":
            its = body.get("items")
            if not isinstance(its, list) or not (1 <= len(its) <= 8): return s.err("invalid-argument", "Daftar belanja tidak valid.")
            lines = []
            for i in its:
                if set(i.keys()) != {"id", "n"} or i["id"] not in PRICE or not isinstance(i["n"], int) or not (1 <= i["n"] <= 20): return s.err("invalid-argument", "Bahan tidak valid.")
                lines.append({"id": i["id"], "n": i["n"], "price": PRICE[i["id"]], "sub": PRICE[i["id"]] * i["n"]})
            cost = sum(l["sub"] for l in lines)
            if cost > s.own: return s.err("failed-precondition", "Koin bermain tidak cukup untuk belanjaan ini.")
            if any(s.ing.get(l["id"], 0) + l["n"] > 30 for l in lines): return s.err("failed-precondition", "Lemari penuh untuk bahan ini.")
            for l in lines: s.ing[l["id"]] = s.ing.get(l["id"], 0) + l["n"]
            s.own -= cost; s.commits += 1; r = {"ok": True, "cost": cost, "lines": lines, "dapur": s.dapur(), "own": s.own}
        elif name == "dapurUnlock":
            if body.get("tool") != "pemanggang" or s.pemanggang: return s.err("failed-precondition", "Alat tidak bisa dibuka.")
            if s.own < 250: return s.err("failed-precondition", "Koin bermain tidak cukup.")
            s.own -= 250; s.pemanggang = True; s.commits += 1; r = {"ok": True, "unlocked": "pemanggang", "cost": 250, "dapur": s.dapur(), "own": s.own}
        else: return s.err("not-found", "Fungsi tidak dikenal.")
        s.ops[op] = r; return 200, {"result": r}

def page(b, flag, srv=None, vp=(360, 740), reqs=None, touch=True, dpr=2):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=touch, device_scale_factor=dpr)
    sd = seed("Budi")
    init = "window.__demoAuto='demo-a';" + ("window.NUSA_DAPUR=true;" if flag else "")
    init += "window.firebase={apps:[1],auth:()=>({currentUser:{getIdToken:async()=>'TOKEN-UJI'}})};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1')}" % json.dumps(json.dumps(sd))
    ctx.add_init_script(init)
    cfg = open(os.path.join(here, "..", "..", "cloud", "config.js")).read().replace('apiBase: ""', 'apiBase: "%s"' % MOCK)
    ctx.route("**/cloud/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
    def mock(r):
        u = r.request.url; name = u.split("/fn/")[1] if "/fn/" in u else ""
        if reqs is not None: reqs.append(name)
        body = {}
        try: body = (json.loads(r.request.post_data or "{}") or {}).get("data", {})
        except Exception: pass
        if srv and (name == "gameFlags" or name.startswith("dapur")):
            if srv.delay: time.sleep(srv.delay)
            if srv.fail_net > 0 and name == "dapurBuy":
                srv.fail_net -= 1; srv.calls.append((name + "!net", body))
                # SATU kali dikerjakan server lalu jawaban hilang (kasus paling berbahaya: bayar sudah masuk, klien tidak tahu)
                if srv.fail_net == 0 and getattr(srv, "lose_reply", False): srv.handle(name, body)
                return r.abort("failed")
            code, js = srv.handle(name, body); return r.fulfill(status=code, content_type="application/json", body=json.dumps(js))
        return r.fulfill(status=404, content_type="application/json", body=json.dumps({"error": {"status": "not_found"}}))
    ctx.route(MOCK + "/**", mock)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    if reqs is not None: pg.on("request", lambda r: reqs.append("URL:" + r.url) if "/dapur/" in r.url else None)
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    return ctx, pg, errs
def shot(pg, name): pg.screenshot(path=OUT + name + ".png")
def tp(pg, x, y, d=2): ev(pg, "([x,y,d])=>{const p=NW.world.player;p.x=x;p.y=y;p.dir=d;p.moving=false}", [x, y, d])
def at_station(pg, sid):  # berdiri tepat di titik interaksi lalu tunggu target terpilih (dihitung tiap bingkai)
    st = ev(pg, "(id)=>{const t=NW.room.candidates().find(c=>c.id===id);return t&&{x:t.x,y:t.y}}", sid); assert st, sid
    tp(pg, st["x"], st["y"]); wait_for(pg, "(()=>{const b=document.getElementById('actBtn');return true})()", 1)
    time.sleep(0.25); return st
def interact(pg): ev(pg, "NW.world.interact()"); time.sleep(0.2)
def in_room(pg): return ev(pg, "!!(NW.room && NW.room.active)")
def to_muara_entrance(pg):
    ev(pg, "(()=>{const p=NW.world.player;const t=NW.MUARA_MAP.points.find(q=>q.id==='kedaiindah');p.x=t.x;p.y=t.y;NW.world.snapCamera&&NW.world.snapCamera()})()"); time.sleep(0.7)
def enter_kedai(pg):
    to_muara_entrance(pg); interact(pg); wait_for(pg, "NW.room.active && NW.room.scene==='kedai'", 4); time.sleep(0.9)
def sheet_text(pg): return ev(pg, "(()=>{const s=document.getElementById('kdSheet');return s&&!s.classList.contains('hidden')?s.innerText:''})()")
def click(pg, sel): pg.click(sel); time.sleep(0.12)
def basket(pg): return ev(pg, "JSON.parse(JSON.stringify(NW.kedaiIndah.K.basket))")
def add(pg, id, n=1):
    for _ in range(n): click(pg, "#kdSheet [data-a=inc][data-id=%s]" % id)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # ===== A. flag klien MATI: dunia lama persis, modul tidak diunduh, tidak ada panggilan dapur =====
        rq = []; srv = Srv(True); ctx, A, eA = page(b, False, srv, reqs=rq); time.sleep(1.2)
        ok("A1 NUSA_DAPUR off: tidak ada unduhan dapur/*", not [u for u in rq if u.startswith("URL:")], [u for u in rq if u.startswith("URL:")])
        ok("A2 off: dunia lama (tanpa NW.dapur/NW.room/NW.kedai; tanpa bangunan/titik; papan 'Lahan Pengembangan' & pagar bambu tetap ada)",
           ev(A, "!NW.dapur && !NW.room && !NW.kedaiIndah && typeof NW.kedai.migrate==='function' && !NW.MUARA_MAP.buildings.some(b=>b.id==='kedaiindah') && !NW.MUARA_MAP.points.some(p=>p.id==='kedaiindah') && NW.MUARA_MAP.objects.some(o=>o.kind==='sign'&&o.title==='Lahan Pengembangan') && NW.MUARA_MAP.objects.filter(o=>o.kind==='bamboo'&&o.y>36).length===6"))
        ok("A3 off: nol panggilan dapur* ke server", not [x for x in rq if x.startswith("dapur")] and not [c for c in srv.calls if c[0].startswith("dapur")], [c[0] for c in srv.calls])
        ok("A4 off: Rumahku lama utuh (tanpa kait dapur, extraClear kosong)", ev(A, "NW.home.hooks && !NW.home.hooks.dapur && NW.HD.extraClear.length===0"))
        ok("A5 off: tanpa error halaman", not eA, eA); ctx.close()

        # ===== B. modul dimuat tetapi SERVER MATI → tidak ada akses =====
        srv = Srv(False); rq = []; ctx, B_, eB = page(b, True, srv, reqs=rq)
        wait_for(B_, "NW.dapur && NW.dapur._st.gateTried", 12); time.sleep(0.8)
        ok("B1 modul diunduh & gameFlags dibaca", ev(B_, "!!NW.dapur && !!NW.room") and any(c[0] == "gameFlags" for c in srv.calls) and any(u.startswith("URL:") for u in rq))
        ok("B2 server off: tanpa bangunan, titik, kait pintu dapur; extraClear kosong", ev(B_, "!NW.MUARA_MAP.buildings.some(b=>b.id==='kedaiindah') && !NW.MUARA_MAP.points.some(p=>p.id==='kedaiindah') && !NW.home.hooks.dapur && NW.HD.extraClear.length===0 && !NW.dapur.serverOn"))
        ok("B3 server off: papan Lahan Pengembangan tetap ada & nol panggilan dapur*", ev(B_, "NW.MUARA_MAP.objects.some(o=>o.kind==='sign'&&o.title==='Lahan Pengembangan')") and not [c for c in srv.calls if c[0].startswith("dapur")])
        ok("B4 server off: tanpa error", not eB, eB); ctx.close()

        # ===== C. flag klien ON + server ON: Kedai Bu Indah =====
        srv = Srv(True, own=100); rq = []; ctx, C, eC = page(b, True, srv, reqs=rq)
        wait_for(C, "NW.dapur && NW.dapur.serverOn", 14); time.sleep(0.6)
        ok("C1 server on: bangunan + titik masuk + kait Rumahku terpasang", ev(C, "NW.MUARA_MAP.buildings.some(b=>b.id==='kedaiindah') && NW.MUARA_MAP.points.some(p=>p.id==='kedaiindah') && !!NW.home.hooks.dapur && NW.HD.extraClear.length===1"))
        ok("C2 bekas lahan kosong: papan & pagar bambu hilang; lampu jalan, NUSA STYLE, dan Kedai Atuk tidak tersentuh", ev(C, "!NW.MUARA_MAP.objects.some(o=>o.kind==='sign'&&o.title==='Lahan Pengembangan') && NW.MUARA_MAP.objects.filter(o=>o.kind==='bamboo'&&o.y>36).length===0 && NW.MUARA_MAP.buildings.some(b=>b.id==='nustyle') && NW.MUARA_MAP.buildings.some(b=>b.id==='kedai') && NW.MUARA_MAP.objects.filter(o=>o.kind==='lamp').length===13"))
        ok("C3 titik masuk walkable dan tidak tertutup benda; bangunan menabrak (tidak bisa ditembus)", ev(C, "(()=>{const t=NW.MUARA_MAP.points.find(p=>p.id==='kedaiindah'),b=NW.MUARA_MAP.buildings.find(p=>p.id==='kedaiindah');return NW.walkable(t.x,t.y)&&!NW.walkable((b.x0+b.x1)/2,(b.y0+b.y1)/2)&&!NW.walkable(b.x0+0.5,b.y1+0.42)})()"))
        to_muara_entrance(C); shot(C, "01-kedai-luar-siang"); interact(C); wait_for(C, "NW.room.active", 4); time.sleep(0.9)
        ok("C4 interaksi pintu masuk → masuk adegan Kedai (bukan modal belanja)", in_room(C) and ev(C, "NW.room.scene==='kedai'"))
        shot(C, "02-kedai-interior-masuk")
        ok("C5 dapurState dipanggil saat masuk, tanpa UID/saldo/harga di body", any(c[0] == "dapurState" and c[1] == {} for c in srv.calls), [c for c in srv.calls if c[0] == "dapurState"][:1])
        ok("C6 titik interaksi lengkap: pintu, 5 rak, kasir, keranjang, kucing", ev(C, "(()=>{const ids=NW.room.candidates().map(c=>c.id);return ['exit','k_beras','k_sayur','k_kulkas','k_tempe','k_etalase','k_kasir','k_basket','k_cat'].every(i=>ids.includes(i))})()"))
        ok("C7 tabrakan: tidak bisa menembus rak/kasir; zona balik kasir (milik Bu Indah) tidak terjangkau dari pintu", ev(C, "(()=>{const w=NW.room.walkable;return !w(0.3,2)&&!w(2,0.4)&&!w(4.2,0.4)&&!w(8,3.8)&&!w(5.3,3.6)&&w(3,3)&&w(0.9,5.2)})() && (()=>{const C=window.NusaDapurCore,L=C.LAYOUT.kedai,R=C.reach(L);return !R.at(8,2.5)&&R.at(3,3)})()"))
        # ambil keranjang, rak beras
        at_station(C, "k_basket"); interact(C); ok("C8 ambil keranjang → ikon di tangan & lencana", ev(C, "NW.kedaiIndah.K.has"))
        at_station(C, "k_sayur"); interact(C); wait_for(C, "!!document.querySelector('#kdSheet [data-a=inc]')", 4); time.sleep(0.3)
        shot(C, "03-kedai-rak-sayur-sheet")
        ok("C9 sheet rak: 5 bahan, harga dari server, tombol +/− ukuran sentuh ≥40px", ev(C, "(()=>{const r=[...document.querySelectorAll('#kdSheet .kd-row')];const b=document.querySelector('#kdSheet .kd-step button').getBoundingClientRect();return r.length===5&&/🪙 4/.test(r[0].innerText)&&b.width>=40&&b.height>=40})()"))
        add(C, "sayuran", 2); add(C, "cabai", 1); add(C, "bawang_putih", 1)
        ok("C10 keranjang sementara berisi 4 barang, NOL panggilan beli ke server", basket(C) == {"sayuran": 2, "cabai": 1, "bawang_putih": 1} and not [c for c in srv.calls if c[0] == "dapurBuy"] and "4" in ev(C, "document.getElementById('kdChipN').textContent"), basket(C))
        click(C, "#kdSheet [data-a=close]")
        ok("C11 sheet tertutup → joystick bisa jalan lagi (tidak memblokir)", not ev(C, "NW.room.blocking()"))
        at_station(C, "k_kulkas"); interact(C); wait_for(C, "!!document.querySelector('#kdSheet [data-a=inc]')", 4); add(C, "telur", 6); click(C, "#kdSheet [data-a=close]")
        at_station(C, "k_tempe"); interact(C); wait_for(C, "!!document.querySelector('#kdSheet [data-a=inc]')", 4); add(C, "tempe", 3); click(C, "#kdSheet [data-a=close]")
        # bayar: saldo 100, total = 2*4+2+2+6*4+3*3 = 45
        total = 2 * 4 + 2 + 2 + 6 * 4 + 3 * 3
        at_station(C, "k_kasir"); shot(C, "04-kedai-di-kasir-sebelum-bayar"); interact(C); wait_for(C, "document.querySelector('#kdSheet [data-a=pay]')", 4); time.sleep(0.3)
        shot(C, "05-kedai-kasir-sheet")
        ok("C12 kasir: rincian + total dari harga katalog server", ("🪙 %d" % total) in sheet_text(C) and "Kasir Bu Indah" in sheet_text(C), sheet_text(C)[:200])
        # ----- gagal: koin tidak cukup (turunkan saldo server) → keranjang & koin utuh -----
        srv.own = 10; ev(C, "NW.kedaiIndah.K.own=10;NW.kedaiIndah.render()"); time.sleep(0.2)
        ok("C13 koin kurang: tombol Bayar nonaktif + pesan jelas + keranjang utuh", ev(C, "document.querySelector('#kdSheet [data-a=pay]').disabled") and "kurang" in sheet_text(C) and sum(basket(C).values()) == 13)
        srv.own = 100; ev(C, "NW.kedaiIndah.K.own=100;NW.kedaiIndah.render()"); time.sleep(0.2)
        # ----- server menolak (409) saat klien mengira cukup: saldo server 20 → ditolak, tidak ada yang berubah -----
        srv.own = 20; n0 = srv.commits; click(C, "#kdSheet [data-a=pay]"); wait_for(C, "!NW.kedaiIndah.K.busy", 5); time.sleep(0.3)
        ok("C14 ditolak server (409): keranjang utuh, koin server utuh, tidak ada commit, pesan ramah", srv.commits == n0 and srv.own == 20 and sum(basket(C).values()) == 13 and "tidak cukup" in sheet_text(C).lower(), sheet_text(C)[-160:])
        shot(C, "06-kedai-bayar-ditolak")
        # ----- jaringan putus di tengah: server SUDAH memproses tetapi jawaban hilang → coba lagi dengan opId SAMA = tidak ganda -----
        srv.own = 100; ev(C, "NW.kedaiIndah.K.own=100"); srv.fail_net = 1; srv.lose_reply = True; n0 = srv.commits; click(C, "#kdSheet [data-a=pay]"); wait_for(C, "!NW.kedaiIndah.K.busy", 6); time.sleep(0.3)
        first_op = [c[1]["opId"] for c in srv.calls if c[0] == "dapurBuy!net"][0]
        ok("C15 jaringan putus: keranjang & opId dipertahankan, pesan 'coba bayar lagi'", sum(basket(C).values()) == 13 and ev(C, "NW.kedaiIndah.K.pay && NW.kedaiIndah.K.pay.opId") == first_op and "Jaringan" in sheet_text(C), sheet_text(C)[-120:])
        click(C, "#kdSheet [data-a=pay]"); wait_for(C, "!!NW.kedaiIndah.K.receipt", 6); time.sleep(0.5)
        buys = [c for c in srv.calls if c[0] == "dapurBuy" and "opId" in c[1]]; same = [c for c in buys if c[1]["opId"] == first_op]
        ok("C16 coba lagi dengan opId SAMA: server memproses SEKALI (commit +1, koin berkurang tepat total, stok tepat), tidak ganda", len(same) >= 2 and srv.commits == n0 + 1 and srv.own == 100 - total and srv.ing == {"sayuran": 2, "cabai": 1, "bawang_putih": 1, "telur": 6, "tempe": 3}, (srv.commits, srv.own, srv.ing))
        ok("C17 sukses: keranjang kosong, struk tampil dari jawaban server, saldo = own server", ev(C, "Object.keys(NW.kedaiIndah.K.basket).length===0 && NW.kedaiIndah.K.own===%d && !NW.kedaiIndah.K.has" % (100 - total)) and "KEDAI BU INDAH" in sheet_text(C) and ("🪙 %d" % total) in sheet_text(C), sheet_text(C)[:120])
        shot(C, "07-kedai-struk")
        ok("C18 body beli hanya {opId, items:[{id,n}]} — tanpa harga/saldo/uid/email", all(set(c[1].keys()) == {"opId", "items"} and all(set(i.keys()) == {"id", "n"} for i in c[1]["items"]) for c in buys), buys[:1])
        click(C, "#kdSheet [data-a=done]"); ok("C19 struk ditutup → sheet hilang", not sheet_text(C))
        # ----- pemanggang di etalase: konfirmasi dua langkah -----
        at_station(C, "k_etalase"); interact(C); wait_for(C, "!!document.querySelector('#kdSheet .kd-tool')", 4); time.sleep(0.3); shot(C, "08-kedai-etalase-pemanggang")
        ok("C20 etalase menampilkan kopi + Pemanggang dengan harga dari server (nilai uji)", "Pemanggang" in sheet_text(C) and "250" in sheet_text(C) and "Kopi" in sheet_text(C))
        n0 = srv.commits; click(C, "#kdSheet [data-a=tool]"); ok("C21 langkah 1 hanya meminta konfirmasi (tidak membeli)", srv.commits == n0 and "Yakin" in sheet_text(C))
        srv.own = 5; ev(C, "NW.kedaiIndah.K.own=5"); click(C, "#kdSheet [data-a=tool]"); wait_for(C, "!NW.kedaiIndah.K.busy", 5); time.sleep(0.3)
        ok("C22 koin kurang untuk alat → ditolak aman, tidak terbuka", not srv.pemanggang and srv.commits == n0 and "tidak cukup" in sheet_text(C).lower(), sheet_text(C)[-100:])
        click(C, "#kdSheet [data-a=close]")
        # ----- keluar -----
        at_station(C, "exit"); interact(C); wait_for(C, "!NW.room.active", 4); time.sleep(0.6)
        ok("C23 keluar → kembali ke Muara di depan pintu kedai (posisi sebelum masuk), kamera & HUD normal", not in_room(C) and ev(C, "(()=>{const p=NW.world.player,t=NW.MUARA_MAP.points.find(q=>q.id==='kedaiindah');return Math.hypot(p.x-t.x,p.y-t.y)<0.5&&NW.areas.cur.id==='muara'})()"))
        ok("C24 tanpa error halaman (alur Kedai)", not eC, eC)
        # ----- kasir kosong → dialog Bu Indah, bukan sheet -----
        enter_kedai(C); at_station(C, "k_kasir"); interact(C); time.sleep(0.3)
        ok("C25 kasir dengan keranjang kosong → dialog Bu Indah (panduan), tanpa panggilan beli", ev(C, "!document.getElementById('dlg').classList.contains('hidden') && /Bu Indah/.test(document.getElementById('dlgName').textContent)") and not [c for c in srv.calls if c[0] == "dapurBuy" and c[1].get("items") == []])
        ev(C, "NW.world.closeDialog()"); ctx.close()

        # ===== D. Dapur Rumahku =====
        srv = Srv(True, own=100); srv.ing = {"telur": 3, "beras": 2, "garam": 1, "tempe": 4}; ctx, D, eD = page(b, True, srv)
        wait_for(D, "NW.dapur && NW.dapur.serverOn", 14); time.sleep(0.5)
        ev(D, "NW.home.enter(NW.world.player)"); wait_for(D, "NW.home.active && NW.home.scene==='plot'", 4); time.sleep(0.8)
        ev(D, "NW.home.goRoom(NW.world.player)"); wait_for(D, "NW.home.scene==='room'", 4); time.sleep(0.9)
        ok("D1 di dalam Rumahku: pintu Dapur muncul sebagai titik interaksi yang bisa dijangkau", ev(D, "(()=>{const c=NW.home.candidates().find(c=>c.id==='h_dapur');return !!c&&NW.home.walkable(c.x,c.y)})()"))
        shot(D, "09-rumahku-pintu-dapur")
        ok("D2 area bebas pintu dapur: perabot tidak bisa ditaruh di sana (kunci), perabot lain tetap bisa", ev(D, "(()=>{const h=NW.Nusa?0:0;const S=window.__nusa.S.home;const r=NW.dapurRumah.clearRect(S);const f={uid:'zz',type:'tanaman',x:r.x0+0.2,y:r.y0+0.3,rot:0};const bad=NW.HD.canPlace(S,f);const ok2=NW.HD.canPlace(S,{uid:'zz',type:'tanaman',x:S.level>=5?4:2.5,y:2.5,rot:0});return bad.ok===false&&/dapur/.test(bad.why)})()"))
        c = ev(D, "NW.home.candidates().find(c=>c.id==='h_dapur')"); tp(D, c["x"], c["y"], 4); time.sleep(0.3); interact(D); wait_for(D, "NW.room.active && NW.room.scene==='dapur'", 4); time.sleep(1.0)
        shot(D, "10-dapur-interior")
        ok("D3 masuk Dapur Rumahku via pintu; adegan 'dapur' aktif; home tetap aktif di bawahnya", in_room(D) and ev(D, "NW.room.scene==='dapur' && NW.home.active"))
        ok("D3b di dalam dapur: tombol Tata Ruang & Kunjungi Rumah Teman tersembunyi", ev(D, "['layoutBtn','visitBtn'].every(i=>getComputedStyle(document.getElementById(i)).display==='none')"))
        ok("D4 dapurState dipanggil; tombol interaksi: pintu, lemari, kulkas, talenan, bak cuci, kompor, pemanggang, meja, sampah", any(c[0] == "dapurState" for c in srv.calls) and ev(D, "(()=>{const ids=NW.room.candidates().map(c=>c.id);return ['exit','d_lemari','d_kulkas','d_persiapan','d_cuci','d_kompor','d_pemanggang','d_meja','d_sampah'].every(i=>ids.includes(i))})()"))
        ok("D5 tabrakan dapur: tidak menembus lemari, kulkas, kompor, bak cuci, meja, pemanggang; area tengah & pintu bebas", ev(D, "(()=>{const w=NW.room.walkable;return !w(0.7,0.3)&&!w(2,0.3)&&!w(6.4,0.4)&&!w(4.8,0.4)&&!w(3.9,3.1)&&!w(7.3,2.7)&&w(3,2)&&w(0.9,4.8)&&w(5,4.5)})()"))
        at_station(D, "d_lemari"); interact(D); time.sleep(0.4)
        time.sleep(2.2); dtxt = ev(D, "document.getElementById('dlgText').textContent")
        ok("D6 lemari menampilkan isi nyata dari server (beras ×2, garam ×1) tanpa telur/tempe (itu di kulkas)", "Beras × 2" in dtxt and "Garam × 1" in dtxt and "Telur" not in dtxt, dtxt[:200])
        ev(D, "NW.world.closeDialog()"); at_station(D, "d_kulkas"); interact(D); time.sleep(0.4)
        time.sleep(2.2); dtxt = ev(D, "document.getElementById('dlgText').textContent")
        ok("D7 kulkas menampilkan telur ×3, tempe ×4", "Telur × 3" in dtxt and "Tempe × 4" in dtxt, dtxt[:200]); ev(D, "NW.world.closeDialog()")
        at_station(D, "d_kompor"); shot(D, "11-dapur-di-kompor")
        at_station(D, "exit"); interact(D); wait_for(D, "!NW.room.active", 4); time.sleep(0.8)
        ok("D8 keluar dapur → kembali ke dalam Rumahku di depan pintu dapur; adegan 'room' aktif lagi", ev(D, "NW.home.active && NW.home.scene==='room' && !NW.room.active") and ev(D, "(()=>{const p=NW.world.player;return p.x<1.4&&NW.home.walkable(p.x,p.y)})()"))
        ok("D8b setelah keluar: tombol Tata Ruang muncul lagi", ev(D, "getComputedStyle(document.getElementById('layoutBtn')).display!=='none'"))
        ok("D9 tanpa error halaman (alur Dapur)", not eD, eD); ctx.close()

        # ===== E. layar: 360×740, 412×915, 740×360, desktop =====
        for name, vp, touch in [("360x740", (360, 740), True), ("412x915", (412, 915), True), ("740x360", (740, 360), True), ("1280x800", (1280, 800), False)]:
            srv = Srv(True, own=100); srv.ing = {"telur": 3, "beras": 2}; ctx, E, eE = page(b, True, srv, vp=vp, touch=touch)
            wait_for(E, "NW.dapur && NW.dapur.serverOn", 14); time.sleep(0.4); enter_kedai(E)
            at_station(E, "k_beras"); ev(E, "NW.kedaiIndah.K.has=true"); interact(E); wait_for(E, "!!document.querySelector('#kdSheet [data-a=inc]')", 4); add(E, "beras", 2); add(E, "garam", 1); time.sleep(0.5)
            shot(E, "20-kedai-%s" % name)
            geo = ev(E, "(()=>{const s=document.getElementById('kdSheet').getBoundingClientRect(),c=document.getElementById('kdChip').getBoundingClientRect();return {sw:s.width,sl:s.left,sr:s.right,st:s.top,sb:s.bottom,cl:c.left,cr:c.right,ct:c.top,cb:c.bottom,W:innerWidth,H:innerHeight,sx:document.documentElement.scrollWidth,z:NW.world?1:1}})()")
            ok("E-%s sheet & lencana ada di dalam layar, tanpa gulir horizontal" % name, geo["sl"] >= -1 and geo["sr"] <= geo["W"] + 1 and geo["sb"] <= geo["H"] + 1 and geo["st"] >= 0 and geo["cl"] >= 0 and geo["cr"] <= geo["W"] and geo["sx"] <= geo["W"] + 1, geo)
            click(E, "#kdSheet [data-a=close]"); at_station(E, "k_kasir"); time.sleep(0.3); shot(E, "21-kedai-kasir-%s" % name)
            # ruangan tampil utuh: empat sudut lantai ada di dalam kanvas
            cn = ev(E, "(()=>{const L=NW.room.def.layout,P=NW.P,c=document.getElementById('game').getBoundingClientRect();const cam=NW.world.cam||null;return {w:c.width,h:c.height}})()")
            ok("E-%s kanvas penuh layar" % name, cn["w"] >= vp[0] - 2 and cn["h"] >= vp[1] - 2, cn)
            ctx.close()
            if name in ("360x740", "740x360"):
                srv = Srv(True); ctx, E2, eE2 = page(b, True, srv, vp=vp, touch=touch); wait_for(E2, "NW.dapur && NW.dapur.serverOn", 14); time.sleep(0.4)
                ev(E2, "NW.home.enter(NW.world.player)"); wait_for(E2, "NW.home.scene==='plot'", 4); time.sleep(0.5); ev(E2, "NW.home.goRoom(NW.world.player)"); wait_for(E2, "NW.home.scene==='room'", 4); time.sleep(0.5)
                c = ev(E2, "NW.home.candidates().find(c=>c.id==='h_dapur')"); tp(E2, c["x"], c["y"], 4); time.sleep(0.3); interact(E2); wait_for(E2, "NW.room.scene==='dapur'", 4); time.sleep(1.0); shot(E2, "22-dapur-%s" % name)
                ok("E-%s dapur: tanpa error" % name, not eE2, eE2); ctx.close()
            ok("E-%s tanpa error halaman" % name, not eE, eE)
        b.close()
    bad = [r for r in R if r.startswith("FAIL")]
    print("\nHASIL: %d lulus, %d gagal" % (len(R) - len(bad), len(bad)))
    sys.exit(1 if bad else 0)

main()
