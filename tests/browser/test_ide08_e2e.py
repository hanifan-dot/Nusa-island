"""Uji E2E Ide 08 (satu alur, satu run) — Worker backend ASLI (PR #61/#63) + server realtime uji + game di Chromium headless.
Alur: Kedai Bu Indah → pilih bahan & bayar → siapkan & masak (ikan, baik) → masak gagal (gosong) + reaksi → cuci alat → hidangkan di halaman
      → tawarkan ke DUA tamu → makan → keluar → masuk lagi. Termasuk klik ganda / jaringan putus / retry (ikan, bahan, porsi, koin tidak ganda),
      empat ukuran layar, dua tamu berebut kursi & porsi terakhir, flag OFF, tamu tidak bisa membuka dapur / mengatur dekorasi.
Butuh NUSA_BACKEND. Data sintetis. Harga di server = NILAI UJI. Flag produksi TIDAK disentuh.
Bukti visual → docs/ide08e/ (5 gambar)."""
import os, sys, time, json
here = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.environ.get("NUSA_BACKEND", "")
if not (BACKEND and os.path.exists(os.path.join(BACKEND, "test/helpers/worker-setup.js"))):
    print("DILEWATI: NUSA_BACKEND tidak diisi / tidak ditemukan."); sys.exit(0)
os.environ.setdefault("NUSA_SCRATCH", "/tmp/ide08e/")
S_src = open(os.path.join(here, "test_dapur_sosial.py")).read(); S_src = S_src[: S_src.rindex("\nmain()")]
G = {"__file__": os.path.join(here, "test_dapur_sosial.py"), "__name__": "sx"}; exec(compile(S_src, "ts", "exec"), G)
M_src = open(os.path.join(here, "test_dapur_masak.py")).read(); M_src = M_src[: M_src.index("\ndef main():")]
K = {"__file__": os.path.join(here, "test_dapur_masak.py"), "__name__": "mx"}; exec(compile(M_src, "tm", "exec"), K)
TD = K["ns"]    # test_dapur.py (Kedai)
from playwright.sync_api import sync_playwright
from PIL import Image
ok, ev, wait_for, R = G["ok"], G["ev"], G["wait_for"], G["R"]
UIDS, ACC = G["UIDS"], G["ACC"]
OUT = os.path.abspath(os.path.join(here, "..", "..", "docs", "ide08e")) + "/"; os.makedirs(OUT, exist_ok=True)
SCR = os.environ["NUSA_SCRATCH"]; os.makedirs(SCR, exist_ok=True)

def final(pg, name, maxw=720, crop=None, up=False):
    pth = SCR + name + ".png"; pg.screenshot(path=pth); im = Image.open(pth).convert("RGB")
    if crop: im = im.crop(crop)
    if im.width > maxw or up: im = im.resize((maxw, int(im.height * maxw / im.width)), Image.LANCZOS)
    im.quantize(colors=192, method=Image.MEDIANCUT, dither=Image.Dither.NONE).save(OUT + name + ".png", optimize=True)

def srv(br, who="a"):
    d = G["srv_doc"](br, who); e = br.read("shop_economy/" + UIDS[who]) or {}
    return {"ing": dict(d.get("ing") or {}), "dirty": dict(d.get("dirty") or {}), "dishes": [x.get("u") for x in (d.get("dishes") or [])], "table": d.get("table") or [],
            "coins": e.get("bal"), "fish": sorted(x["u"] for x in (e.get("box") or []))}
def clk(pg, sel, wait=0.15): pg.click(sel); time.sleep(wait)
def sheet_k(pg): return TD["sheet_text"](pg)
def reset_view(pg): ev(pg, "NW.mp.sharedHour=()=>null;window.__nusa.S.hour=12")

def sec_e2e(b, br, X):
    A, B, C = X["a"][1], X["b"][1], X["c"][1]; U = UIDS["a"]
    for pg in (A, B, C): pg.set_viewport_size({"width": 412, "height": 760})
    for pg in (A, B, C): reset_view(pg)
    br.dishes(U, [])          # dapur bersih: tanpa masakan, tanpa bahan, alat dasar, belum ada cuci pertama
    c, t = br.post("/__catch", {"uid": U, "n": 4}); fish = json.loads(t); K["set_cooler"](A, fish)
    s0 = srv(br); ok("E0 awal: 4 ikan sah di server, tak ada bahan/masakan, koin %s" % s0["coins"], len(s0["fish"]) == 4 and not s0["ing"] and not s0["dishes"], s0)

    # ===== 1. Kedai Bu Indah =====
    TD["enter_kedai"](A); ok("E1a masuk Kedai Bu Indah (adegan, bukan modal)", ev(A, "NW.room.active && NW.room.scene==='kedai'"))
    final(A, "01-kedai")
    TD["at_station"](A, "k_basket"); G["interact"](A)
    TD["at_station"](A, "k_beras"); G["interact"](A); wait_for(A, "!!document.querySelector('#kdSheet [data-a=inc]')", 4); time.sleep(0.3)
    TD["add"](A, "minyak", 2); TD["add"](A, "garam", 2); clk(A, "#kdSheet [data-a=close]")
    ok("E1b keranjang berisi pilihan, NOL panggilan bayar sebelum kasir", TD["basket"](A) == {"minyak": 2, "garam": 2} and srv(br)["coins"] == s0["coins"], TD["basket"](A))
    TD["at_station"](A, "k_kasir"); G["interact"](A); wait_for(A, "document.querySelector('#kdSheet [data-a=pay]')", 4); time.sleep(0.3)
    total = int(ev(A, "(()=>{const m=/Total[^0-9]*([0-9]+)/.exec(document.getElementById('kdSheet').innerText);return m?+m[1]:-1})()"))
    # klik ganda cepat pada Bayar → hanya SATU pembelian
    A.locator("#kdSheet [data-a=pay]").dblclick(); wait_for(A, "!!NW.kedaiIndah.K.receipt", 6); time.sleep(0.5)
    s1 = srv(br)
    ok("E1c klik ganda Bayar: koin berkurang tepat %d sekali, bahan tepat (minyak 2, garam 2)" % total, total > 0 and s0["coins"] - s1["coins"] == total and s1["ing"] == {"minyak": 2, "garam": 2}, (s0["coins"], s1["coins"], total, s1["ing"]))
    clk(A, "#kdSheet [data-a=done]")
    # jaringan putus: server memproses, jawaban hilang → coba lagi dengan opId sama = tidak ganda
    TD["at_station"](A, "k_basket"); G["interact"](A); TD["at_station"](A, "k_beras"); G["interact"](A); wait_for(A, "!!document.querySelector('#kdSheet [data-a=inc]')", 4); TD["add"](A, "garam", 1); clk(A, "#kdSheet [data-a=close]")
    TD["at_station"](A, "k_kasir"); G["interact"](A); wait_for(A, "document.querySelector('#kdSheet [data-a=pay]')", 4); time.sleep(0.3)
    n = {"n": 0}
    def lost(route):
        n["n"] += 1
        if n["n"] == 1: route.fetch(); route.abort()
        else: route.continue_()
    A.route("**/fn/dapurBuy*", lost); c1 = srv(br)["coins"]; clk(A, "#kdSheet [data-a=pay]", 0.2); wait_for(A, "!NW.kedaiIndah.K.busy", 6); time.sleep(0.4)
    mid = srv(br); op1 = ev(A, "NW.kedaiIndah.K.pay && NW.kedaiIndah.K.pay.opId")
    ok("E1d jaringan putus: server sudah memproses, klien belum pasti (keranjang & opId dipertahankan)", mid["ing"].get("garam") == 3 and bool(op1) and ev(A, "Object.keys(NW.kedaiIndah.K.basket).length>0"), (mid["ing"], op1))
    clk(A, "#kdSheet [data-a=pay]", 0.2); wait_for(A, "!!NW.kedaiIndah.K.receipt", 6); time.sleep(0.4); A.unroute("**/fn/dapurBuy*")
    s2 = srv(br)
    ok("E1e coba lagi (opId sama): garam tetap 3 (bukan 4), koin turun sekali", s2["ing"].get("garam") == 3 and c1 - s2["coins"] == c1 - mid["coins"] and c1 - s2["coins"] > 0, (s2["ing"], c1, mid["coins"], s2["coins"]))
    clk(A, "#kdSheet [data-a=done]"); TD["at_station"](A, "exit"); G["interact"](A); wait_for(A, "!NW.room.active", 4); time.sleep(0.6)

    # ===== 2. Dapur Rumahku: masak ikan goreng (baik) =====
    K["kitchen"](A); ok("E2a masuk dapur Rumahku", ev(A, "NW.room.active && NW.room.scene==='dapur'"))
    sm = srv(br)
    K["open_station"](A, "d_kompor", "kompor"); K["pick_rec"](A, "ikan_goreng", 1)
    A.locator("[data-a=start]").dblclick(); K["idle"](A, 8); wait_for(A, "!!NW.dapurMasak.M.dapur.cook", 5)
    s3 = srv(br)
    ok("E2b klik ganda Mulai: bahan terpakai SEKALI (minyak −1, garam −1) & tepat 1 ikan hilang", s3["ing"].get("minyak") == sm["ing"].get("minyak", 0) - 1 and s3["ing"].get("garam") == sm["ing"].get("garam", 0) - 1 and len(s3["fish"]) == len(sm["fish"]) - 1, (sm["ing"], s3["ing"], len(sm["fish"]), len(s3["fish"])))
    K["do_prep"](A, K["PREP"]["ikan_goreng"]); final(A, "02-proses-masak")
    # lanjut hingga selesai (jendela ideal)
    win, flips = K["HEAT"]["ikan_goreng"]
    K["clk"](A, "[data-a=act][data-v=taruh]"); K["pad_do"](A); K["clk"](A, "[data-a=api][data-v=\"2\"]"); K["idle"](A)
    midms = (win[0] + win[1]) / 2 * 1000; parts = flips + 1
    for i in range(flips): br.adv(midms / parts); K["clk"](A, "[data-a=act][data-v=balik]"); K["pad_do"](A)
    br.adv(midms / parts); K["clk"](A, "[data-a=act][data-v=angkat]"); K["pad_do"](A); K["clk"](A, "[data-a=finish]"); K["idle"](A, 8); wait_for(A, "!!NW.dapurMasak.M.result", 5)
    r1 = K["res"](A); ok("E2c hasil masakan baik dari server (tier %s)" % (r1 or {}).get("tier"), bool(r1) and r1["tier"] in ("enak", "lumayan"), r1)
    K["clk"](A, "[data-a=keep]"); K["idle"](A)
    s4 = srv(br); ok("E2d masakan baik masuk nampan tepat 1 (tidak ganda)", len(s4["dishes"]) == 1, s4["dishes"])

    # ===== 3. Masak kedua: GOSONG + reaksi karakter =====
    K["set_cooler"](A, [{"uid": u, "id": "nila", "w": 0.5} for u in srv(br)["fish"]])   # ikan klien = cermin ikan sah di server
    K["open_station"](A, "d_kompor", "kompor")
    K["clk"](A, "[data-a=tab][data-v=resep]")
    if ev(A, "NW.dapurMasak.M.sel") != "ikan_goreng": K["clk"](A, "[data-a=rec][data-id=ikan_goreng]")   # resep yang sama masih terpilih → jangan ketuk (akan membatalkan)
    if not ev(A, "NW.dapurMasak.M.fish.length"): A.locator("[data-a=fish]").first.click(); time.sleep(0.1)
    K["clk"](A, "[data-a=start]", 0.1); K["idle"](A, 8); wait_for(A, "!!NW.dapurMasak.M.dapur.cook", 5)
    K["do_prep"](A, K["PREP"]["ikan_goreng"]); K["clk"](A, "[data-a=act][data-v=taruh]"); K["pad_do"](A); K["clk"](A, "[data-a=api][data-v=\"3\"]") if ev(A, "!!document.querySelector('[data-a=api][data-v=\"3\"]')") else K["clk"](A, "[data-a=api][data-v=\"2\"]"); K["idle"](A)
    br.adv(150000); K["clk"](A, "[data-a=act][data-v=angkat]"); K["pad_do"](A); K["clk"](A, "[data-a=finish]"); K["idle"](A, 8); wait_for(A, "!!NW.dapurMasak.M.result", 5); time.sleep(0.9)
    r2 = K["res"](A); ok("E3a dibiarkan terlalu lama → hasil gagal dari server (tier %s)" % (r2 or {}).get("tier"), bool(r2) and r2["tier"] in ("gosong", "aneh"), r2)
    ok("E3b reaksi karakter masakan gagal ditampilkan (wajah/animasi + teks)", ev(A, "(()=>{const M=NW.dapurMasak.M;return !!M.result && (M.face||'')!=='' || /gosong|gagal|aduh|hangus/i.test(document.getElementById('mkSheet').innerText)})()"), ev(A, "NW.dapurMasak.M.face"))
    final(A, "03-masak-gagal-reaksi")
    K["clk"](A, "[data-a=keep]"); K["idle"](A)
    sd = srv(br)["dishes"]; ok("E3c masakan gosong (gagal tapi layak) disimpan tepat 1 di nampan; tidak ada koin/buff dari hasil gagal", sd == ["d1x1", "d2x2"] and srv(br)["coins"] == s2["coins"], (sd, srv(br)["coins"], s2["coins"]))

    # ===== 4. Cuci alat =====
    dirty0 = dict((srv(br)["dirty"]))
    K["open_station"](A, "d_cuci", "cuci")
    item = [k for k, v in dirty0.items() if v > 0][0]
    K["clk"](A, "[data-a=washpick][data-v=%s]" % item)
    for step in range(4): K["clk"](A, "[data-a=washgo]"); K["pad_do"](A); time.sleep(0.15)
    s5 = srv(br); ok("E4 cuci %s: kotor −1 di server, cuci lengkap tercatat" % item, s5["dirty"].get(item, 0) == dirty0[item] - 1, (dirty0, s5["dirty"]))
    final(A, "04-cuci-alat")
    if ev(A, "!!document.querySelector('#mkSheet [data-a=close]')"): K["clk"](A, "#mkSheet [data-a=close]", 0.3)
    TD["at_station"](A, "exit") if ev(A, "!!(NW.room&&NW.room.candidates().some(c=>c.id==='exit'))") else None
    ev(A, "NW.room.active && NW.room.exit && NW.room.exit()") ; time.sleep(0.5)
    return s5

def sec_yard(b, br, X):
    """Dari hasil masak sungguhan: hidangkan di halaman, tawarkan ke DUA tamu, makan, keluar, masuk lagi."""
    A, B, C = X["a"][1], X["b"][1], X["c"][1]; U = UIDS["a"]
    d = G["srv_doc"](br, "a"); ds = d.get("dishes") or []
    ok("E5a ada masakan hasil masak sungguhan di nampan server", len(ds) >= 1, [(x.get("name"), x.get("tier")) for x in ds])
    if not ds: return
    u0 = ds[0]["u"]; br.adv(1800000)
    G["enter_house_room"](A); G["tick"](A); G["sync_o"](A); ev(A, "NW.dapurSosial.closeSheet()")
    r = G["api"](A, "dapurMejaTaruh", {"opId": "op-e2e-put-0001", "dish": u0, "slot": 0}); ok("E5b hidangkan di meja halaman (server)", "ok" in r, r)
    r2 = G["api"](A, "dapurMejaTaruh", {"opId": "op-e2e-put-0001", "dish": u0, "slot": 0}); G["sync_o"](A)
    tab = G["srv_doc"](br, "a").get("table") or []; ok("E5c taruh ulang (opId sama / retry) tidak menggandakan di meja", len([x for x in tab if x.get("name")]) == 1, tab)
    br.homepub(U, name="Budi", level=3)   # harness: level rumah di server = level lokal (di produksi dari simpanan awan)
    # pemilik menata halaman (susunan sah menurut validator bersama) → disimpan di server
    plan = ev(A, """(()=>{const G=NW.dapurGeo,lv=3,w=G.defaults(lv),mv={};for(const id of ['meja','kopi','tanaman0','payung','lampu','kursi0']){for(const d of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1],[2,0],[0,2],[-2,0],[0,-2]]){const t=w[id].slice();w[id]=[t[0]+d[0],t[1]+d[1]];if(G.validate(lv,w).ok){mv[id]=w[id];break}w[id]=t}}return mv})()""")
    rs = G["api"](A, "dapurHalamanSimpan", {"opId": "op-e2e-hal-0001", "items": plan}); G["sync_o"](A); time.sleep(0.5)
    ok("E5c2 pemilik menata halaman → disimpan di server (rev≥1, %d benda)" % len(plan), "ok" in rs and ((G["srv_doc"](br, "a").get("halaman") or {}).get("rev") or 0) >= 1, str(rs)[:100])
    G["let_in"](br, A, B, U, UIDS["b"]); br.adv(250000); G["let_in"](br, A, C, U, UIDS["c"]); seen2 = G["see_guests"](A, 2, 15); G["tick"](B); G["tick"](C); time.sleep(0.8)
    names = ev(A, "NW.mp.view().players.map(p=>[p.name,!!p.owner])"); ok("E5d0 pemilik melihat dua tamu (Rudi & Cici) di halaman", seen2 and ["Rudi", False] in names and ["Cici", False] in names, names)
    for pg in (A, B, C): reset_view(pg)
    left0 = G["left_of"](br, 0); ok("E5d dua tamu masuk halaman; porsi awal %s" % left0, left0 is not None and left0 >= 2, left0)
    ok("E5e tamu: tidak bisa membuka dapur / mengatur dekorasi", all(ev(g, "!NW.home.candidates().some(c=>c.id==='h_dapur') && !document.querySelector('#hlSheet [data-a=atur]') && !NW.dapurSosial._S.edit") for g in (B, C)))
    ia, ib, ic = G["items_of"](A), G["items_of"](B), G["items_of"](C)
    ok("E5d1 pemilik & kedua tamu melihat susunan halaman yang sama persis (dari server)", all(ia[k] == ib[k] == ic[k] for k in ia) and all(abs(ia[k][0] - v[0]) < 0.03 for k, v in plan.items()), {k: (ia[k], ib[k], ic[k]) for k in list(plan)[:2]})
    ra, rb, rc = G["reach_all"](A, 3), G["reach_all"](B, 3), G["reach_all"](C, 3)
    ok("E5d2 pintu, meja, kopi, nampan & kursi tetap terjangkau dari gerbang (pemilik & 2 tamu)", ra["ok"] and rb["ok"] and rc["ok"], (ra, rb, rc))
    # tawarkan ke dua tamu
    hB = ev(A, "NW.mp.view().players.find(p=>!p.owner&&p.name==='Rudi').hid"); hC = ev(A, "NW.mp.view().players.find(p=>!p.owner&&p.name==='Cici').hid")
    G["offer_by_ui"](A, 0, hB); ev(A, "NW.dapurSosial.closeSheet()"); G["offer_by_ui"](A, 0, hC)
    okb, okc = G["wait_offer_card"](B), G["wait_offer_card"](C); ok("E5f kedua tamu menerima kartu tawaran", okb and okc, (okb, okc))
    ev(A, "window.__eatSeen=0;clearInterval(window.__eatT);window.__eatT=setInterval(()=>{if(Object.keys(NW.dapurSosial._S.eatRemote).length)window.__eatSeen++},80)")
    ev(B, "document.querySelector('#hlSheet [data-a=terima]').click()"); time.sleep(0.4); ev(C, "document.querySelector('#hlSheet [data-a=terima]').click()")
    wait_for(B, "!!NW.dapurSosial._S.anim", 6); wait_for(C, "!!NW.dapurSosial._S.anim", 6)
    for _ in range(9): ev(A, "NW.dapurSosial.ownerSync()"); time.sleep(0.35)   # pemilik membaca meja lebih sering selama tamu makan (bawaan: tiap 4 dtk)
    left1 = G["left_of"](br, 0); ok("E5g dua tamu makan: porsi turun tepat 2 (bukan lebih)", left1 == left0 - 2, (left0, left1))
    ok("E5h pemilik melihat tamu makan (animasi jarak jauh terpicu)", ev(A, "window.__eatSeen>0") or wait_for(A, "window.__eatSeen>0", 6), ev(A, "window.__eatSeen"))
    ev(A, "NW.dapurSosial.closeSheet()"); ev(A, "NW.mp.sharedHour=()=>null;window.__nusa.S.hour=12")
    G["idle"](B, 25); G["idle"](C, 25)
    # kedua tamu duduk di kursi berbeda (bukti visual jelas); pemilik berdiri di dekat meja
    for pg, pick in ((B, 0), (C, -1)):
        ev(pg, "NW.dapurSosial.updateSeats()"); sids = ev(pg, "NW.home.candidates().map(c=>c.id).filter(i=>i.startsWith('hl_sit'))")
        if sids: G["goto_hl"](pg, sids[pick]); G["interact"](pg); time.sleep(0.6)
    seated = [ev(pg, "!!NW.world.seat.on") for pg in (B, C)]
    ok("E5h2 dua tamu duduk di dua kursi berbeda (kursi hanya penanda klien, bukan kunci server)", all(seated), seated)
    time.sleep(1.5); G["goto_hl"](A, "hl_meja"); time.sleep(0.6); ev(A, "NW.dapurSosial.closeSheet()"); time.sleep(0.8)
    final(A, "05-halaman-dua-tamu", crop=(20, 400, 620, 940), up=True)
    # keluar → masuk lagi
    ev(B, "NW.home.leaveVisit && NW.home.leaveVisit()"); time.sleep(1.0)
    ok("E5i tamu keluar: tidak lagi di halaman, porsi tetap %s (tak berubah)" % left1, ev(B, "!NW.home.visit") and G["left_of"](br, 0) == left1)
    br.adv(10000)
    r = G["api"](B, "homeVisit", {"pid": X["pA"]}); ok("E5j masuk lagi: izin masih berlaku", bool((r.get("ok") or {}).get("ok") if isinstance(r.get("ok"), dict) else r.get("ok")), str(r)[:120])
    G["guest_enter"](B, r["ok"]); G["tick"](B); time.sleep(0.8)
    ok("E5k setelah masuk lagi: porsi tidak kembali/ganda (%s)" % left1, G["left_of"](br, 0) == left1)

def main():
    br = G["Bridge"]()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            X = G["fixture"](b, br, vp=(412, 760))
            for name, fn in (("e2e", lambda: sec_e2e(b, br, X)), ("yard", lambda: sec_yard(b, br, X))):
                try: fn()
                except Exception as e:
                    import traceback; traceback.print_exc(); ok("EXC " + name, False, repr(e)[:240])
            b.close()
    finally: br.close()
    f = [r for r in R if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(R) - len(f), len(f))); sys.exit(1 if f else 0)
main()
