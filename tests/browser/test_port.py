"""Uji PR-A4: Pelabuhan Kota + penyelesaian Pengiriman Segar (Sail/Deliver/Abort) — mode SOLO.
Server ditiru lewat route Playwright mengikuti kontrak (docs/ai-handoff/CONTRACTS.md); TIDAK menyentuh Worker/Firestore nyata."""
import os, sys, time, json
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, "test_delivery.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.join(here, "test_delivery.py")}; exec(compile(src, "dl", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, page, to_station, fill, Srv0 = ns["ok"], ns["ev"], ns["wait_for"], ns["page"], ns["to_station"], ns["fill"], ns["Srv"]
OUT = os.environ.get("SHOTS", "/tmp/nusa-port/"); os.makedirs(OUT, exist_ok=True)
class Srv(Srv0):
    """Tambah Sail/Abort/Deliver. fail[nama]=N → N panggilan berikutnya gagal (kind: 'net' hasil tak pasti / 'rej' ditolak). minTrip detik."""
    def __init__(s, flag=True, min_trip=0.0):
        super().__init__(flag); s.st = ["idle", "idle"]; s.sail_t = [0, 0]; s.fail = {}; s.min_trip = min_trip; s.delivered = 0; s.reward = None; s.counted = []; s.coins = 0
    def view(s):
        v = super().view(); v["delivered"] = s.delivered; v["reward"] = s.reward; v["paid"] = s.reward is not None
        for k, b in enumerate(v["boxes"]): b["st"] = s.st[k]; b["sailMs"] = int((time.time() - s.sail_t[k]) * 1000) if s.st[k] == "sailing" else 0
        v["minTripMs"] = int(s.min_trip * 1000)
        return v
    def handle(s, name, body):
        if name in ("ecoDamarSail", "ecoDamarAbort", "ecoDamarDeliver"):
            s.calls.append((name, body)); f = s.fail.get(name)
            if f and f[0] > 0:
                f[0] -= 1
                if f[1] == "net": return 503, {"error": {"status": "unavailable", "message": "net"}}
                if f[1] == "auth": return 401, {"error": {"status": "auth_unavailable", "message": "auth"}}
                return 409, {"error": {"status": "failed-precondition", "message": "Server menolak."}}
            op = body.get("opId"); b = body.get("box")
            if op in s.ops: return 200, {"result": dict(s.ops[op], duplicate=True)}
            if b not in (0, 1): return 400, {"error": {"status": "invalid-argument", "message": "box"}}
            if name == "ecoDamarSail":
                if s.st[b] == "sailing" or not s.boxes[b]: return 409, {"error": {"status": "failed-precondition", "message": "Kotak kosong atau sudah berlayar."}}
                s.st[b] = "sailing"; s.sail_t[b] = time.time(); r = s.eco()
            elif name == "ecoDamarAbort":
                s.st[b] = "idle"; r = s.eco()
            else:
                if s.st[b] != "sailing": return 409, {"error": {"status": "failed-precondition", "message": "Kotak tidak sedang berlayar."}}
                if time.time() - s.sail_t[b] < s.min_trip: return 409, {"error": {"status": "failed-precondition", "message": "Permintaan ditolak (409)."}}
                n = len(s.boxes[b]); s.boxes[b] = []; s.st[b] = "idle"; s.delivered += n; s.counted.append(op)
                if s.delivered >= 6 and s.reward is None: s.reward = 777; s.coins += 777
                r = s.eco(); r["moved"] = n; r["fresh"] = True; r["reward"] = (s.reward if s.reward and s.delivered >= 6 and n else 0)
            s.ops[op] = r; return 200, {"result": r}
        return super().handle(name, body)
def goto_port_solo(pg):
    ev(pg, "NW.port && NW.port.startTrip()")
def at_port(pg): return ev(pg, "NW.world.area && NW.world.area.id==='selat' || (NW.areas && NW.areas.current && NW.areas.cur.id==='selat')")
def where(pg): return ev(pg, "NW.areas.cur&&NW.areas.cur.id")
def wait_port(pg, t=8): return wait_for(pg, "NW.areas.cur.id==='selat' && NW.port && NW.port.ready", t)
def walk(pg, x, y): ev(pg, "(()=>{const p=NW.world.player;p.x=%s;p.y=%s;NW.world.snapCamera&&NW.world.snapCamera()})()" % (x, y)); time.sleep(0.4)
def tap_target(pg, tid):
    return ev(pg, "(()=>{const t=NW.world.candidatesFor?NW.world.candidatesFor():null;return null})()")
def interact_id(pg, tid):
    return ev(pg, "(()=>{const l=NW.port.candidates(NW.world.player);const t=l.find(c=>c.id==='%s');if(!t)return false;NW.port.interact(t);return true})()" % tid)
def setup_trip(b, srv, n=(3, 3)):
    ctx, A, e = page(b, True, srv, kemudi=True); wait_for(A, "NW.port && NW.port.ready", 10); time.sleep(0.4)
    to_station(A); ev(A, "NW.delivery.open()"); wait_for(A, "document.querySelectorAll('.dl-bag .dl-fish').length>0", 8); time.sleep(0.3)
    for box, k in enumerate(n):
        for _ in range(k): A.click(".dl-bag .dl-fish"); A.click(".dl-box[data-box='%d'] h4" % box)
    if sum(n): A.click("#dlSend"); wait_for(A, "document.querySelector('.dl-un')", 8)
    time.sleep(0.4); return ctx, A, e
def to_port(A): A.click("#pkSail"); wait_port(A, 10); time.sleep(0.6)
def crate_truck(A, i, wait=True):
    c = ev(A, "NW.port.positions.CRATE[%d]" % i); walk(A, c["x"] - 0.4, c["y"]); interact_id(A, "pk:crate:%d" % i); wait_for(A, "NW.port._st.carry", 4)
    lp = ev(A, "NW.port.positions.LOAD_PT"); walk(A, lp["x"], lp["y"]); interact_id(A, "pk:truck")
    if wait: wait_for(A, "!NW.port._st.load", 8); time.sleep(0.8)
def crate_ok(A, i):
    """Antar kotak i dan TUNGGU sampai server benar-benar menerimanya (kejadian, bukan waktu tetap)."""
    crate_truck(A, i, wait=False); wait_for(A, "NW.delivery._st.view.boxes[%d].st==='idle'" % i, 40); time.sleep(0.2)
def failures(b):
    # C. Sail gagal (jaringan): ikan aman, tetap di Muara, opId SAMA saat coba lagi
    srv = Srv(True); srv.fail["ecoDamarSail"] = [1, "net"]; ctx, A, e = setup_trip(b, srv)
    A.click("#pkSail"); wait_for(A, "!!document.getElementById('pkRetry')", 15); time.sleep(0.3)
    ok("C1 Sail gagal jaringan: tetap di Muara, ikan di kotak, ada tombol coba lagi", where(A) != "selat" and ev(A, "NW.delivery._st.view.boxes.every(b=>b.n===3)") and ev(A, "!!document.getElementById('pkRetry')"), [where(A), ev(A, "document.getElementById('pkStatus').innerText")])
    op1 = [c[1]["opId"] for c in srv.calls if c[0] == "ecoDamarSail"][0]
    ev(A, "document.getElementById('pkRetry')&&document.getElementById('pkRetry').click()"); wait_port(A, 10)
    ops = [c[1]["opId"] for c in srv.calls if c[0] == "ecoDamarSail"]
    ok("C2 coba lagi memakai opId yang sama (tanpa kirim ganda) lalu berlayar", ops[1] == op1 and where(A) == "selat", [ops, where(A)]); ctx.close()
    # D. Sail ditolak server (409): ikan aman, tak berlayar
    srv = Srv(True); srv.fail["ecoDamarSail"] = [1, "rej"]; ctx, A, e = setup_trip(b, srv); A.click("#pkSail"); time.sleep(1.2)
    ok("D1 Sail ditolak: tetap di Muara, pesan dari server, kotak utuh", where(A) != "selat" and ev(A, "NW.delivery._st.view.boxes.every(b=>b.n===3&&b.st==='idle')"), where(A)); ctx.close()
    # E. kotak kosong: tak ada tombol Berlayar, nol Sail
    srv = Srv(True); ctx, A, e = setup_trip(b, srv, n=(0, 0))
    ok("E1 kotak kosong: tombol Berlayar tidak ada & nol panggilan Sail", ev(A, "!document.getElementById('pkSail')") and not [c for c in srv.calls if c[0] == "ecoDamarSail"]); ctx.close()
    # F. satu kotak saja
    srv = Srv(True); srv.boxes[0] = ["i4", "i5", "i6"]; srv.box = [u for u in srv.box if u not in srv.boxes[0]]; ctx, A, e = setup_trip(b, srv, n=(0, 0)); to_port(A)
    ok("F1 satu kotak: Sail sekali, hanya satu kotak di dermaga", len([c for c in srv.calls if c[0] == "ecoDamarSail"]) == 1 and ev(A, "NW.port.candidates(NW.world.player).filter(c=>c.id.startsWith('pk:crate')).length===1"))
    crate_truck(A, 0); wait_for(A, "!document.getElementById('pkRes').classList.contains('hidden')", 40); txt = ev(A, "document.getElementById('pkRes').innerText")
    ok("F2 satu kotak: hasil dari server, tanpa hadiah (belum pesanan ke-6), tanpa 900/300", "Hadiah dari server" not in txt and "900" not in txt and "3/6" in txt, txt); ctx.close()
    # G. Deliver gagal (jaringan) lalu retry opId sama; tak ada hadiah ganda
    srv = Srv(True); srv.fail["ecoDamarDeliver"] = [1, "net"]; ctx, A, e = setup_trip(b, srv); to_port(A); crate_truck(A, 0); wait_for(A, "!!document.getElementById('pkRetry')", 20); time.sleep(0.3)
    ok("G1 Deliver gagal: ada tombol Coba lagi, kotak tetap berlayar di server (ikan aman)", ev(A, "!!document.getElementById('pkRetry')") and srv.st[0] == "sailing" and srv.boxes[0], [srv.st, ev(A, "document.getElementById('pkStatus').innerText")])
    ev(A, "document.getElementById('pkRetry').click()"); wait_for(A, "NW.delivery._st.view.boxes[0].st==='idle'", 20); time.sleep(0.3)
    dl = [c[1]["opId"] for c in srv.calls if c[0] == "ecoDamarDeliver"]
    ok("G2 retry memakai opId sama; terhitung sekali", len(dl) == 2 and dl[0] == dl[1] and srv.delivered == 3 and len(srv.counted) == 1, [dl, srv.delivered]); ctx.close()
    # H. Deliver kotak 2 gagal setelah kotak 1 diterima → UI selaras server, lanjut dari posisi nyata
    srv = Srv(True); ctx, A, e = setup_trip(b, srv); to_port(A); crate_ok(A, 0); srv.fail["ecoDamarDeliver"] = [1, "rej"]; crate_truck(A, 1); wait_for(A, "!!document.getElementById('pkRetry')", 20); time.sleep(0.3)
    ok("H1 kotak 1 diterima, kotak 2 ditolak: server masih 1 kotak berlayar, kotak 2 tampak lagi di dermaga", srv.delivered == 3 and srv.st == ["idle", "sailing"] and ev(A, "NW.port.candidates(NW.world.player).some(c=>c.id==='pk:crate:1')"), [srv.delivered, srv.st])
    ev(A, "document.getElementById('pkRetry')&&(NW.port._st.retry=null)"); crate_truck(A, 1); wait_for(A, "!document.getElementById('pkRes').classList.contains('hidden')", 40)
    ok("H2 kotak 2 diulang → selesai, hadiah server 777 sekali", srv.coins == 777 and srv.delivered == 6); ctx.close()
    # I. klik ganda Sail: hanya satu rangkaian Sail
    srv = Srv(True); ctx, A, e = setup_trip(b, srv); ev(A, "(()=>{const b=document.getElementById('pkSail');b.click();b.click();b.click()})()"); wait_port(A, 15); time.sleep(0.5)
    ok("I1 klik berulang Berlayar: tepat 2 Sail (satu per kotak)", len([c for c in srv.calls if c[0] == "ecoDamarSail"]) == 2, [c[0] for c in srv.calls]); ctx.close()
    # J. 'belum sampai' (<45 dtk): mobil menunggu lalu berhasil tanpa kehilangan ikan
    srv = Srv(True, min_trip=3.0); ctx, A, e = setup_trip(b, srv); to_port(A); crate_truck(A, 0, wait=False); time.sleep(1.8)
    ok("J1 'belum sampai': tidak ada ralat merah, ikan aman, menunggu otomatis", srv.delivered == 0 and srv.st[0] == "sailing" and ev(A, "!document.getElementById('pkRetry')"))
    wait_for(A, "NW.delivery._st.view.boxes[0].st==='idle'", 14); ok("J2 coba otomatis berhasil setelah kapal 'sampai'", srv.delivered == 3, srv.delivered); ctx.close()
    # K. Batalkan pelayaran: Abort, ikan tetap di kotak
    srv = Srv(True); ctx, A, e = setup_trip(b, srv); to_port(A); ev(A, "document.getElementById('pkStatus')&&NW.port.abortTrip()"); time.sleep(1.5)
    ok("K1 Abort: 2 panggilan Abort, kotak idle & ikan tetap 3/3, nol Deliver", len([c for c in srv.calls if c[0] == "ecoDamarAbort"]) == 2 and srv.st == ["idle", "idle"] and [len(x) for x in srv.boxes] == [3, 3] and not [c for c in srv.calls if c[0] == "ecoDamarDeliver"]); ctx.close()
    # L. server pakDamar OFF
    srv = Srv(False); ctx, A, e = page(b, True, srv, kemudi=True); time.sleep(2)
    ok("L1 server OFF: dunia selat tanpa objek pk_*, tanpa Sail/Deliver", ev(A, "!NW.SELAT_MAP.objects.some(o=>/^pk_/.test(o.kind))") and not [c for c in srv.calls if c[0] in ("ecoDamarSail", "ecoDamarDeliver")]); ctx.close()
    # M. flag klien OFF: port.js tak diunduh
    rq = []; ctx, A, e = page(b, True, Srv(True), delivery=False, reqs=rq); time.sleep(1.5)
    ok("M1 klien OFF: tak ada unduhan delivery/ (port.js ikut), tanpa NW.port", not [u for u in rq if u.startswith("URL:")] and ev(A, "!NW.port && !NW.SELAT_MAP.objects.some(o=>/^pk_/.test(o.kind))")); ctx.close()
VPS = [(360, 740), (412, 915), (740, 360), (1280, 800)] if not os.environ.get('ONLY_VP') else [tuple(map(int, os.environ['ONLY_VP'].split('x')))]
def viewports(b):
    for vp in VPS:
        srv = Srv(True); ctx, A, e = page(b, True, srv, vp=vp, kemudi=True); wait_for(A, "NW.port && NW.port.ready", 10); time.sleep(0.4)
        to_station(A); ev(A, "NW.delivery.open()"); wait_for(A, "document.querySelectorAll('.dl-bag .dl-fish').length>0", 8); time.sleep(0.3); fill(A); A.click("#dlSend"); wait_for(A, "document.querySelector('.dl-un')", 8); time.sleep(0.4)
        fit = lambda sel: ev(A, "(()=>{const e=document.querySelector('%s');if(!e)return null;const r=e.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&r.width>40})()" % sel)
        ok("V%dx%d panel: tombol Berlayar terlihat penuh di layar" % vp, fit("#pkSail"), vp)
        A.screenshot(path=OUT + "v_%dx%d_panel.png" % vp); A.click("#pkSail"); wait_port(A, 10); time.sleep(0.6)
        crate_truck(A, 0); wait_for(A, "NW.delivery._st.view.boxes[0].st==='idle'", 10); crate_truck(A, 1); wait_for(A, "!document.getElementById('pkRes').classList.contains('hidden')", 40); time.sleep(0.4)
        ok("V%dx%d panel hasil muat di layar & tombol Oke terjangkau" % vp, fit(".pk-card") and fit("#pkOk"), vp); A.screenshot(path=OUT + "v_%dx%d_hasil.png" % vp)
        ok("V%dx%d tanpa error halaman" % vp, not e, e); ctx.close()
def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        srv = Srv(True); ctx, A, eA = page(b, True, srv, kemudi=True)
        wait_for(A, "NW.port && NW.port.ready", 10); time.sleep(0.5)
        ok("A0 modul port siap (NW.port, solid & objek di selat)", ev(A, "!!NW.port && NW.SELAT_MAP.objects.some(o=>o.kind==='pk_truck')"), ev(A, "typeof NW.port"))
        to_station(A); ev(A, "NW.delivery.open()"); wait_for(A, "document.querySelectorAll('.dl-bag .dl-fish').length>0", 8); time.sleep(0.3); fill(A); A.click("#dlSend"); wait_for(A, "document.querySelector('.dl-un')", 8); time.sleep(0.4)
        ok("A1 dua kotak termuat → tombol Berlayar", ev(A, "!!document.getElementById('pkSail')"), ev(A, "document.getElementById('dlTrip')&&document.getElementById('dlTrip').innerHTML"))
        A.screenshot(path=OUT + "a1_panel.png")
        A.click("#pkSail"); wait_port(A, 10); time.sleep(0.8)
        ok("A2 Sail dipanggil untuk kedua kotak lalu pindah ke area selat", [c[0] for c in srv.calls].count("ecoDamarSail") == 2 and where(A) == "selat", [srv.calls[-3:], where(A)])
        A.screenshot(path=OUT + "a2_port.png")
        ok("A3 stage=port & dua tanda kotak di dermaga", ev(A, "NW.port.candidates(NW.world.player).filter(c=>c.id.startsWith('pk:crate')).length===2"))
        def carry_one(pg, i):
            c = ev(pg, "NW.port.positions.CRATE[%d]" % i); walk(pg, c["x"] - 0.4, c["y"])
            ev(pg, "NW.world.player.dir=0"); got = interact_id(pg, "pk:crate:%d" % i); wait_for(pg, "NW.port._st.carry", 4)
            hud = ev(pg, "NW.port._st.carry&&NW.port._st.carry.i"); lp = ev(pg, "NW.port.positions.LOAD_PT"); walk(pg, lp["x"], lp["y"])
            return got, hud
        got, c0 = carry_one(A, 0); A.screenshot(path=OUT + "a3_carry.png")
        ok("B1 ambil kotak 1: membawa (animasi dua tangan), jalan melambat", got and c0 == 0 and ev(A, "NW.port.speedK()<1 && NW.port.carrying()"), [got, c0])
        ok("B2 selama membawa tombol ambil kotak lain tidak ada, mobil tersedia", ev(A, "(()=>{const l=NW.port.candidates(NW.world.player).map(c=>c.id);return !l.some(x=>x.startsWith('pk:crate'))&&l.includes('pk:truck')})()"))
        interact_id(A, "pk:truck"); B3 = wait_for(A, "NW.port._st.door>0.3", 6); A.screenshot(path=OUT + "a4_truck.png")
        ok("B3 pintu belakang mobil terbuka saat memasukkan", B3, ev(A, "NW.port._st.door"))
        wait_for(A, "!NW.port._st.lock && !NW.port._st.load && !NW.port._st.carry && NW.delivery._st.view.boxes.some(b=>b.st==='sailing')", 8); time.sleep(0.3)
        dl = [c for c in srv.calls if c[0] == "ecoDamarDeliver"]
        ok("B4 kotak 1 → tepat satu Deliver {opId, box:0}; kotak 2 masih berlayar", len(dl) == 1 and dl[0][1]["box"] == 0 and sorted(dl[0][1]) == ["box", "opId"], dl)
        ok("B5 belum ada panel hasil (hadiah belum dari server)", ev(A, "document.getElementById('pkRes').classList.contains('hidden')"))
        got, c1 = carry_one(A, 1); interact_id(A, "pk:truck"); wait_for(A, "!document.getElementById('pkRes').classList.contains('hidden')", 40); time.sleep(0.5)
        A.screenshot(path=OUT + "a5_result.png")
        txt = ev(A, "document.getElementById('pkRes').innerText")
        ok("B6 panel hasil dari server: hadiah 777 (angka tiruan server), bukan 900+300", "777" in txt and "900" not in txt and "300" not in txt, txt)
        ok("B7 klien tidak mengubah koin (Nusa.S.money tetap)", ev(A, "Nusa.S.money===50"), ev(A, "Nusa.S.money"))
        ok("B8 dua Deliver total, opId berbeda", len([c for c in srv.calls if c[0] == "ecoDamarDeliver"]) == 2 and len(set(srv.counted)) == 2)
        ok("A4 tanpa error halaman", not eA, eA); ctx.close()
        if os.environ.get('ONLY_VP'): viewports(b); b.close(); return
        failures(b); viewports(b); b.close()
if __name__ == "__main__":
    main()
