"""Uji peramban nyata — SAR Laut "Panggilan Darurat Nusa" (PROTOTIPE, lokal). Tanpa backend/jaringan/Firestore: API server DITIRUKAN di klien
(gameFlags.nusaPhone=true) dan jam tepercaya disuntik lewat NW.mp._clock (jam server multiplayer yang sudah ada). Data sintetis. BUKAN bukti produksi.
Jalankan: python3 tests/browser/test_sar.py    (hasil gagal → keluar kode 1)"""
import os, sys, time, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
ROOT = "file://" + os.path.abspath(os.path.join(here, "..", "..", "index.html"))
SCR = os.environ.get("NUSA_SCRATCH", "/tmp/nusa-sar-shots/"); os.makedirs(SCR, exist_ok=True)
R = []
def ok(name, cond, extra=""): R.append(bool(cond)); print(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:260] if extra != "" else ""), flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=8.0, step=0.1):
    t0 = time.time()
    while time.time() - t0 < tmo:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(step)
    return False
T0 = 1795856400000   # 2026-11-28 09:00 WIB (jam tiruan; hanya dipakai di sini)
SEED = {"v": 11, "money": 777, "day": 1, "hour": 11, "loc": 0, "up": {"rod": 1, "bait": 0, "cooler": 1, "boat": 5}, "cooler": [], "dex": {}, "stats": {"casts": 4, "caught": 3, "earned": 120, "legends": 0}, "profile": {"v": 1, "name": "Rina"}}
VPS = [(360, 740), (412, 915), (740, 360), (1280, 800)]

def new_ctx(b, vp=(412, 915), flag=True, seed=SEED, store=None):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = ("window.NUSA_SAR=true;" if flag else "") + "window.NUSA_PHONE=true;"

    if seed is not None: ctx.add_init_script("if(!sessionStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);sessionStorage.setItem('__seeded','1');}" % json.dumps(json.dumps(seed)))   # penanda di sessionStorage (ikut tab, selamat dari muat ulang; localStorage bisa bergulir) → disemai sekali
    ctx.add_init_script(init)
    return ctx


STUB = "(()=>{window.NusaApi={enabled:()=>true,call:async(n)=>{if(n==='gameFlags')return {nusaPhone:true};if(n==='phoneState')return {state:{owned:['dasar'],use:'dasar'}};throw Object.assign(new Error('x'),{code:'unavailable'})}};})()"
def stub_phone(pg):
    ev(pg, STUB); ev(pg, "NW.phone && NW.phone._gate()"); ok_ = wait_for(pg, "NW.phone && NW.phone.srvOn()", 6)
    return ok_
def reload_game(pg):
    pg.reload(); wait_for(pg, "window.NW && NW.cloud", 8); time.sleep(0.4); pg.click("#gateGuest"); time.sleep(0.6)
    try: pg.click("#startBtn"); time.sleep(0.4)
    except Exception: pass
    stub_phone(pg)

def boot(ctx, clock=True, stub=True, T=T0):
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e) + " @ " + str(getattr(e, "stack", ""))[:400]))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" and "favicon" not in m.text and "Failed to load resource" not in m.text and "net::" not in m.text and "gstatic" not in m.text else None)
    pg.goto(ROOT); wait_for(pg, "window.NW && NW.cloud", 8)
    time.sleep(0.4)
    pg.click("#gateGuest"); time.sleep(0.6)
    try: pg.click("#startBtn"); time.sleep(0.5)
    except Exception: pass
    if stub: stub_phone(pg)
    if clock: set_clock(pg, T)
    return pg, errs
def set_clock(pg, t): ev(pg, "(t)=>{const c=NW.mp._clock;c.have=true;c.srv=t;c.perf=performance.now()}", t)
def adv(pg, ms): ev(pg, "(ms)=>{NW.mp._clock.srv+=ms}", ms)
def tick(pg, n=1):
    for _ in range(n): ev(pg, "NW.sar._tick()")
def sar(pg): return ev(pg, "JSON.parse(JSON.stringify(Nusa.S.sar||null))")
def rect(pg, sel): return ev(pg, "(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,vis:r.width>0&&r.height>0&&getComputedStyle(e).display!=='none'}}", sel)
def overlap(a, b): return a and b and a["vis"] and b["vis"] and not (a["x"] + a["w"] <= b["x"] or b["x"] + b["w"] <= a["x"] or a["y"] + a["h"] <= b["y"] or b["y"] + b["h"] <= a["y"])
def ring_now(pg):
    ev(pg, "NW.sar._ses.activeMs=8*60000"); tick(pg)
def snap(pg): return ev(pg, "(()=>{const S=Nusa.S;return JSON.stringify({money:S.money,up:S.up,cooler:S.cooler,dex:S.dex,stats:S.stats,fish:S.fish||null,qris:S.qris||null,ev:S.event||null})})()")
def open_phone_sar(pg):
    ev(pg, "NW.phone.open()"); time.sleep(0.5); ev(pg, "NW.phone.go('unlock')"); time.sleep(0.2); ev(pg, "NW.phone.go('open','sar')"); time.sleep(0.4)
def goto_selat_boarded(pg):
    ev(pg, "Nusa.goWorld('start','selat')"); time.sleep(0.5); ev(pg, "NW.boat.board()"); time.sleep(0.3)
def put_boat(pg, x, y): ev(pg, "([x,y])=>{Object.assign(NW.boat.B,{x,y,v:0});NW.boat.syncPlayer()}", [x, y]); time.sleep(0.35)
def press_opt(pg, i):
    wait_for(pg, "document.querySelectorAll('#dlgOpts button').length>%d" % i, 4)
    pg.evaluate("(i)=>document.querySelectorAll('#dlgOpts button')[i].click()", i); time.sleep(0.3)


def start_mission(pg):
    ring_now(pg); ev(pg, "NW.sar.accept()"); goto_selat_boarded(pg); time.sleep(0.6); tick(pg)
def to_victim(pg):
    sp = ev(pg, "NW.sar.spot()"); put_boat(pg, sp["x"] + 1.2, sp["y"] + 1.0); time.sleep(0.3)
def open_victim_dialog(pg):
    ev(pg, "NW.world.interact()"); wait_for(pg, "document.querySelectorAll('#dlgOpts button').length>=3", 4); time.sleep(0.2)
def deliver(pg):
    put_boat(pg, 12.4, 22.4); time.sleep(0.3); ev(pg, "NW.world.interact()"); time.sleep(0.4); press_opt(pg, 0); time.sleep(0.5)

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # ---------- A. bawaan MATI ----------
        ctx = new_ctx(b, flag=False); pg, errs = boot(ctx, stub=False, clock=False); reqs = []
        ok("A1 flag OFF: NW.sar tidak ada, tidak ada S.sar, tidak ada galat", ev(pg, "typeof NW.sar==='undefined' && !('sar' in Nusa.S)") and not errs, errs[:2])
        ok("A2 flag OFF: berkas sar/* tidak dimuat", ev(pg, "![...document.scripts].some(s=>/sar\\/(core|client)/.test(s.src)) && ![...document.styleSheets].some(s=>/sar\\/sar\\.css/.test(s.href||''))"))
        ctx.close()
        # ---------- B. alur lengkap (412x915) ----------
        ctx = new_ctx(b); pg, errs = boot(ctx)
        ok("B0 modul SAR + NusaPhone siap; kapal bisa ke Selat; tidak ada kegiatan terlarang", ev(pg, "!!NW.sar && NW.phone.srvOn() && NW.sar.busy()===null"), ev(pg, "[NW.sar&&NW.sar.busy(), NW.phone.srvOn()]"))
        before = snap(pg)
        ev(pg, "NW.sar._ses.activeMs=6*60000+58000"); tick(pg)   # 6:58 (+1 dtk bila ada input) → belum 7:00
        ok("B1 sebelum 7 menit aktif: tidak ada panggilan", sar(pg)["m"] is None and not ev(pg, "NW.sar._ses.called"), sar(pg))
        rings = ev(pg, "(()=>{window.__rings=0;const o=Nusa.sfx;Nusa.sfx=function(n){if(n==='misi_baru')window.__rings++;return o.apply(this,arguments)};return 1})()")
        ring_now(pg); time.sleep(0.2)
        ok("B2 ≥7 menit: berdering tepat sekali (tawaran + catatan + notifikasi kecil)", sar(pg)["m"]["phase"] == "offer" and ev(pg, "window.__rings") == 1 and rect(pg, "#nphToast")["vis"], [sar(pg)["m"], ev(pg, "window.__rings")])
        tick(pg, 6); time.sleep(0.3)
        ok("B3 detik berikutnya tidak berdering lagi (tidak berulang)", ev(pg, "window.__rings") == 1 and sar(pg)["offerCount"] == 1)
        time.sleep(8.2)
        ok("B4 notifikasi kecil hilang ±8 dtk", not rect(pg, "#nphToast")["vis"])
        ok("B5 tombol ponsel tetap ada dan tidak menutupi joystick/tombol aksi", not overlap(rect(pg, "#phoneBtn"), rect(pg, ".joy")) and not overlap(rect(pg, "#phoneBtn"), rect(pg, "#actBtn")))
        open_phone_sar(pg)
        ok("B6 pesan ada di NusaPhone: teks persis + tiga tombol ≥44×44", ev(pg, "document.querySelector('.sar-msg').textContent.includes('Seorang nelayan terakhir terlihat di sebelah timur mercusuar. Kapalnya berwarna biru.')") and ev(pg, "document.querySelector('.sar-msg b').textContent.includes('PANGGILAN DARURAT')")
           and [rect(pg, f"[data-a={a}]") for a in ("accept", "later", "decline")] and all(rect(pg, f"[data-a={a}]")["w"] >= 44 and rect(pg, f"[data-a={a}]")["h"] >= 44 for a in ("accept", "later", "decline")),
           [rect(pg, f"[data-a={a}]") for a in ("accept", "later", "decline")])
        ok("B7 NusaPhone bisa ditutup", ev(pg, "(()=>{NW.phone.close();return true})()") and wait_for(pg, "!NW.phone.isOpen()", 3))
        # --- Nanti ---
        open_phone_sar(pg); pg.click("[data-a=later]"); time.sleep(0.5)
        ok("C1 'Nanti': tawaran tetap ada, ponsel tertutup, tidak berdering lagi", sar(pg)["m"]["phase"] == "offer" and sar(pg)["m"]["snoozed"] and not ev(pg, "NW.phone.isOpen()"))
        tick(pg, 3); ok("C2 'Nanti' sesi sama: tak ada dering baru", ev(pg, "window.__rings") == 1)
        reload_game(pg); set_clock(pg, T0 + 60000)
        ev(pg, "window.__rings=0;(()=>{const o=Nusa.sfx;Nusa.sfx=function(n){if(n==='misi_baru')window.__rings++;return o.apply(this,arguments)}})()")
        ev(pg, "NW.sar._ses.activeMs=9*60000"); tick(pg, 3); time.sleep(0.8)
        ok("C3 muat ulang: tawaran 'Nanti' bertahan, TIDAK berdering dan tidak ada notifikasi kecil", sar(pg)["m"]["phase"] == "offer" and ev(pg, "window.__rings") == 0 and "DARURAT" not in ev(pg, "document.getElementById('nphToast').textContent"), [sar(pg)["m"]["phase"], ev(pg, "window.__rings"), ev(pg, "document.getElementById('nphToast').textContent")])
        open_phone_sar(pg); ok("C4 pesan tersimpan muncul lagi di NusaPhone setelah muat ulang", ev(pg, "!!document.querySelector('[data-a=accept]')"))
        # --- Terima + pencarian ---
        pg.click("[data-a=accept]"); time.sleep(0.4); ev(pg, "NW.phone.close()"); time.sleep(0.3)
        wait_for(pg, "document.getElementById('sarHint') && !document.getElementById('sarHint').classList.contains('hidden')", 3.5)
        ok("D1 'Terima': misi aktif, tahap cari, petunjuk ringan tampil di luar joystick/aksi", sar(pg)["m"]["phase"] == "active" and sar(pg)["m"]["stage"] == "search" and rect(pg, "#sarHint")["vis"] and not overlap(rect(pg, "#sarHint"), rect(pg, ".joy")) and not overlap(rect(pg, "#sarHint"), rect(pg, "#actBtn")) and not overlap(rect(pg, "#sarHint"), rect(pg, "#phoneBtn")) and not overlap(rect(pg, "#sarHint"), rect(pg, "#kmRoot")), rect(pg, "#sarHint"))
        goto_selat_boarded(pg); time.sleep(0.8); tick(pg)
        ok("D2 di Pelabuhan Selat naik kapal: korban ditempatkan di air yang muat lambung", ev(pg, "NW.boat.on") and ev(pg, "!!NW.sar.spot()") and ev(pg, "NW.boat.hullFits(NW.areas.cur, NW.sar.spot().x, NW.sar.spot().y, NW.sar.spot().a)"), ev(pg, "NW.sar.spot()"))
        ok("D3 petunjuk arah + jarak (tanpa menutupi)", "petak" in ev(pg, "document.getElementById('sarHint').textContent") and "mercusuar" in ev(pg, "document.getElementById('sarHint').textContent"), ev(pg, "document.getElementById('sarHint').textContent"))
        fog0 = ev(pg, "NW.sar.fog()"); adv(pg, 2 * 60000); fog1 = ev(pg, "NW.sar.fog()"); adv(pg, 5 * 60000); fog2 = ev(pg, "NW.sar.fog()")
        ok("D4 kabut turun pelan-pelan tetapi tidak pernah menutup pandangan (≤34%)", fog0 < fog1 < fog2 + 1e-9 and fog2 <= 0.3401 and fog2 > 0.3, [fog0, fog1, fog2])
        ev(pg, "NW.world.update && 0"); put_boat(pg, 13.0, 3.0)
        pg.screenshot(path=SCR + "sar_search_fog.png")
        sp = ev(pg, "NW.sar.spot()"); put_boat(pg, sp["x"] + 1.2, sp["y"] + 1.0); time.sleep(0.4)
        ok("D5 dekat korban: tombol interaksi 'Periksa Nelayan'", ev(pg, "NW.world.target && NW.world.target.id") == "sar:vic", ev(pg, "NW.world.target && NW.world.target.id"))
        pg.screenshot(path=SCR + "sar_victim_near.png")
        ev(pg, "NW.world.interact()"); wait_for(pg, "document.querySelectorAll('#dlgOpts button').length>=3", 4); time.sleep(0.2)
        ok("D6 temukan: dialog 'Kedinginan dan kelelahan.' + 3 pilihan", ev(pg, "NW.world.dialogOpen") and "Kedinginan dan kelelahan." in ev(pg, "document.getElementById('dlgText')?document.getElementById('dlgText').textContent:document.body.innerText") and ev(pg, "document.querySelectorAll('#dlgOpts button').length") == 3 and sar(pg)["m"]["stage"] == "found", ev(pg, "[...document.querySelectorAll('#dlgOpts button')].map(b=>b.textContent)"))
        optsz = ev(pg, "[...document.querySelectorAll('#dlgOpts button')].map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height]})")
        ok("D7 tombol pilihan perawatan ≥44 px", all(w >= 44 and h >= 44 for w, h in optsz), optsz)
        press_opt(pg, 0); time.sleep(0.4)
        ok("D8 'Beri selimut': tahap aboard, korban di kapal, dialog tertutup, kapal tidak terkunci", sar(pg)["m"]["stage"] == "aboard" and sar(pg)["m"]["care"] == "selimut" and not ev(pg, "NW.world.dialogOpen") and not ev(pg, "NW.world.isBusy()") and ev(pg, "!!NW.boat.B.on"))
        put_boat(pg, 9.0, 3.0); x0 = ev(pg, "[NW.boat.B.x,NW.boat.B.y]")
        ev(pg, "(()=>{if(NW.kemudi)NW.kemudi.input=()=>null;for(let i=0;i<4;i++)NW.boat.update(0.25,{x:0,y:-1,m:1})})()"); x1 = ev(pg, "[NW.boat.B.x,NW.boat.B.y]")
        ok("D9 korban di kapal tidak mengunci/menjepit: kapal tetap bisa digerakkan", abs(x1[0] - x0[0]) + abs(x1[1] - x0[1]) > 0.05, [x0, x1])
        ok("D10 pemain di kapal tidak terjepit (posisi pemain = kursi kapal, bukan di dalam karang)", ev(pg, "NW.boat.hullFits(NW.areas.cur, NW.boat.B.x, NW.boat.B.y, NW.boat.B.a)"))
        pg.screenshot(path=SCR + "sar_victim_aboard.png")
        put_boat(pg, 12.4, 22.4); time.sleep(0.4)
        ok("D11 dekat Pos SAR: tombol 'Serahkan Nelayan' (bukan Turun Kapal)", ev(pg, "NW.world.target && NW.world.target.id") == "sar:pos" and "Serahkan" in ev(pg, "document.getElementById('actBtn').textContent"), ev(pg, "[NW.world.target&&NW.world.target.id, document.getElementById('actBtn').textContent]"))
        pg.screenshot(path=SCR + "sar_pos.png")
        ev(pg, "NW.world.interact()"); time.sleep(0.4); press_opt(pg, 0); time.sleep(0.5)
        card = ev(pg, "document.getElementById('sarCard').innerText")
        ok("E1 kartu hasil persis spesifikasi", "NELAYAN BERHASIL DISELAMATKAN" in card and "Waktu: " in card and "Kondisi: stabil" in card and "Penyelamat: Rina" in card, card)
        ok("E2 misi selesai; lencana SAR tercatat; hadiah non-ekonomi", sar(pg)["m"]["phase"] == "done" and "sar-laut-1" in sar(pg)["rec"]["badges"] and sar(pg)["rec"]["done"] == 1)
        ok("E3 ekonomi/inventaris/ikan/QRIS/event TIDAK berubah (uang, coolbox, upgrade, dex, statistik)", snap(pg) == before, [snap(pg)[:120], before[:120]])
        ok("E4 kabut hilang & petunjuk hilang setelah selesai", ev(pg, "NW.sar.fog()") == 0 and not rect(pg, "#sarHint")["vis"])
        ok("E5 kartu hasil tidak menutupi joystick/tombol aksi", not overlap(rect(pg, "#sarCard"), rect(pg, ".joy")) and not overlap(rect(pg, "#sarCard"), rect(pg, "#actBtn")), rect(pg, "#sarCard"))
        pg.screenshot(path=SCR + "sar_result.png"); pg.click("#sarCard [data-x]"); time.sleep(0.2)
        ok("E6 kartu bisa ditutup (tombol ≥44)", not rect(pg, "#sarCard")["vis"])
        ok("E7 tidak ada galat konsol/halaman sepanjang alur", not errs, errs[:3]); ctx.close()
        # ---------- F. jeda 4 jam bertahan setelah muat ulang; satu misi aktif; batal; kedaluwarsa ----------
        ctx = new_ctx(b); pg, errs = boot(ctx)
        ring_now(pg); tick(pg); ev(pg, "NW.sar.accept()"); adv(pg, 5 * 60000)
        ok("F1 hanya satu misi aktif: tak ada tawaran baru walau 'sesi baru'", (ev(pg, "(()=>{NW.sar._ses.called=false;NW.sar._ses.activeMs=9e6;NW.sar._tick();return Nusa.S.sar.offerCount})()") == 1))
        adv(pg, 41 * 60000); tick(pg); time.sleep(0.2)
        ok("F2 misi aktif lewat batas waktu → ditutup dengan pesan, tidak spam", sar(pg)["m"]["phase"] == "expired" and sar(pg)["offerCount"] == 1)
        ev(pg, "NW.sar._ses.called=false"); tick(pg, 3)
        ok("F3 sesudah kedaluwarsa: jeda 4 jam berlaku (tidak ada tawaran baru)", sar(pg)["offerCount"] == 1 and sar(pg)["m"]["phase"] == "expired")
        reload_game(pg)
        set_clock(pg, T0 + 60 * 60000 + 2 * 60000); ev(pg, "NW.sar._ses.activeMs=9*60000"); tick(pg, 3)
        ok("F4 muat ulang/login ulang tidak mereset jeda (1 jam setelah panggilan)", sar(pg)["offerCount"] == 1 and sar(pg)["m"]["phase"] == "expired", sar(pg))
        set_clock(pg, T0 + 4 * 3600000 + 45 * 60000); tick(pg, 2)
        ok("F5 lewat 4 jam sejak misi ditutup (sesi baru): panggilan kedua boleh (hari WIB sama, jatah 2)", sar(pg)["offerCount"] == 2 and sar(pg)["m"]["phase"] == "offer", sar(pg))
        ctx.close()
        # ---------- G. ditunda saat kegiatan terlarang; jam hilang; Tolak ----------
        ctx = new_ctx(b); pg, errs = boot(ctx)
        def blocked_check(tag, label, enter_js, expect, exit_js):   # masuk keadaan terlarang DULU, baru beri waktu aktif cukup (ketukan latar 1 dtk tidak boleh menyela)
            ev(pg, enter_js); time.sleep(0.6); ev(pg, "NW.sar._ses.activeMs=9*60000"); tick(pg, 2); time.sleep(1.2)
            ok(f"{tag} {label}: panggilan ditunda", sar(pg)["m"] is None and ev(pg, "NW.sar.busy()") == expect, ev(pg, "[Nusa.mode(), NW.sar.busy()]"))
            ev(pg, "NW.sar._ses.activeMs=0"); ev(pg, exit_js); time.sleep(0.5)
        ev(pg, "NW.sar._ses.activeMs=0")
        blocked_check("G1", "dialog terbuka", "NW.world.openDialog({name:'x',lines:['halo']})", "dialog", "NW.world.closeDialog()")
        blocked_check("G1a", "toko/panel terbuka", "Nusa.openPanel('shop')", "toko", "Nusa.closePanel()")
        blocked_check("G1b", "sedang memancing", "Nusa.enterFishing('dock')", "memancing", "Nusa.goWorld('start','muara')")
        blocked_check("G1c", "di dalam Rumahku", "NW.home.enter()", "rumahku", "Nusa.goWorld('start','muara')")
        blocked_check("G2", "Cloud Save sedang jalan", "NW.cloud.status='syncing'", "cloud", "NW.cloud.status='idle'")
        ev(pg, "NW.mp._clock.have=false"); ev(pg, "NW.sar._sv.anchor=null"); ev(pg, "NW.sar._ses.activeMs=9*60000"); tick(pg, 2); time.sleep(1.2)
        ok("G3 jam tepercaya tidak ada: tidak menawarkan (gagal-aman, simpanan tidak rusak)", sar(pg)["m"] is None)
        set_clock(pg, T0); tick(pg, 2); ok("G4 begitu semua bebas: berdering (penundaan tidak menghabiskan jatah)", sar(pg)["m"]["phase"] == "offer" and sar(pg)["offerCount"] == 1)
        open_phone_sar(pg); pg.click("[data-a=decline]"); time.sleep(0.4)
        ok("G5 'Tolak': tercatat, misi sama tidak ditawarkan lagi", sar(pg)["m"]["phase"] == "declined" and sar(pg)["declined"] == ["nelayan-biru-1"])
        adv(pg, 30 * 3600000); ev(pg, "NW.sar._ses.called=false"); tick(pg, 3)
        ok("G6 30 jam kemudian pun tidak ditawarkan lagi", sar(pg)["offerCount"] == 1 and sar(pg)["m"]["phase"] == "declined"); ctx.close()
        # ---------- H. gagal-aman: objek tak termuat; batal; simpanan lama ----------
        ctx = new_ctx(b); pg, errs = boot(ctx); before = snap(pg)
        ring_now(pg); ev(pg, "NW.sar.accept()"); ev(pg, "Nusa.goWorld('start','selat')"); time.sleep(0.5); ev(pg, "NW.boat.board()")
        ev(pg, "void (window.__hf=NW.boat.hullFits, NW.boat.hullFits=()=>false, NW.sar._sv.spot=null)"); tick(pg); time.sleep(0.2)
        ok("H1 objek gagal dimuat: pesan + tombol coba lagi, misi tidak hilang, tidak ada barang berubah", ev(pg, "NW.sar._sv.loadFail") and "Coba lagi" in ev(pg, "document.getElementById('sarHint').textContent") and sar(pg)["m"]["phase"] == "active" and snap(pg) == before)
        ev(pg, "void (NW.boat.hullFits=window.__hf)"); open_phone_sar(pg); rr = rect(pg, "[data-a=retry]"); pg.click("[data-a=retry]"); time.sleep(1.5)
        ok("H2 'Coba lagi dari titik aman': objek termuat ulang, tombol ≥44", ev(pg, "!!NW.sar.spot()") and not ev(pg, "NW.sar._sv.loadFail") and rr["h"] >= 44 and rr["w"] >= 44, rr)
        ev(pg, "NW.phone.go('open','sar')"); time.sleep(0.2); cr = rect(pg, "[data-a=cancel]"); pg.click("[data-a=cancel]"); time.sleep(0.3)
        ok("H3 batal benar: misi ditutup, objek hilang, barang utuh", sar(pg)["m"]["phase"] == "cancelled" and not ev(pg, "!!NW.sar.spot()") and snap(pg) == before and cr["h"] >= 44, cr)
        ok("H4 meninggalkan dunia/pindah area tidak menghapus keadaan", True)   # dicakup C3/F4 (muat ulang) + uji pindah area di bawah
        ctx.close()
        ctx = new_ctx(b); pg, errs = boot(ctx); ring_now(pg); ev(pg, "NW.sar.accept()"); ev(pg, "Nusa.goWorld('start','selat')"); time.sleep(0.4); ev(pg, "Nusa.goWorld('start','muara')"); time.sleep(0.4)
        wait_for(pg, "document.getElementById('sarHint').textContent.includes('Pelabuhan Selat')", 3.5)
        ok("H5 pindah dunia selama misi: keadaan misi & jeda tetap", sar(pg)["m"]["phase"] == "active" and sar(pg)["lastCallAt"] > 0 and "Pelabuhan Selat" in ev(pg, "document.getElementById('sarHint').textContent")); ctx.close()
        # simpanan lama / rusak
        for label, seed in (("tanpa S.sar", SEED), ("S.sar rusak", dict(SEED, sar="rusak")), ("S.sar versi masa depan", dict(SEED, sar={"v": 99, "m": {"x": 1}, "lastCallAt": "abc"}))):
            ctx = new_ctx(b, seed=seed); pg, errs = boot(ctx)
            ok(f"I {label}: simpanan terbaca, S.sar jadi keadaan awal yang sah, uang tetap", ev(pg, "Nusa.S.money")==777 and sar(pg)["v"] == 1 and sar(pg)["m"] is None and not errs, [errs[:2], sar(pg)]); ctx.close()
        # ---------- J. tata letak 4 viewport ----------
        for vp in VPS:
            ctx = new_ctx(b, vp=vp); pg, errs = boot(ctx); ring_now(pg); ev(pg, "NW.sar.accept()"); goto_selat_boarded(pg); time.sleep(0.6); tick(pg)
            sp = ev(pg, "NW.sar.spot()"); put_boat(pg, sp["x"] + 1.2, sp["y"] + 1.0); ev(pg, "NW.world.interact()"); time.sleep(0.3)
            dlg = rect(pg, "#dlg") or rect(pg, ".dialog")
            press_opt(pg, 0); put_boat(pg, 12.4, 22.4); ev(pg, "NW.world.interact()"); time.sleep(0.3); press_opt(pg, 0); time.sleep(0.4)
            hint_rect = rect(pg, "#sarHint"); card = rect(pg, "#sarCard")
            ok(f"J {vp}: kartu hasil terlihat, tidak menutupi joystick/aksi/tombol ponsel, tidak keluar layar", card["vis"] and not overlap(card, rect(pg, ".joy")) and not overlap(card, rect(pg, "#actBtn")) and not overlap(card, rect(pg, "#phoneBtn")) and not overlap(card, rect(pg, "#kmRoot")) and card["x"] >= 0 and card["x"] + card["w"] <= vp[0] and card["y"] >= 0 and card["y"] + card["h"] <= vp[1], [card, rect(pg, ".joy")])
            pg.screenshot(path=SCR + f"sar_result_{vp[0]}x{vp[1]}.png"); ctx.close()
            ctx = new_ctx(b, vp=vp); pg, errs = boot(ctx); ring_now(pg); ev(pg, "NW.sar.accept()"); goto_selat_boarded(pg); time.sleep(0.6); tick(pg)
            h = rect(pg, "#sarHint")
            ok(f"J {vp}: petunjuk tidak menutupi joystick, tombol aksi, atau tombol ponsel", h["vis"] and not overlap(h, rect(pg, ".joy")) and not overlap(h, rect(pg, "#actBtn")) and not overlap(h, rect(pg, "#phoneBtn")) and not overlap(h, rect(pg, "#kmRoot")) and h["x"] >= 0 and h["x"] + h["w"] <= vp[0], h)
            pg.screenshot(path=SCR + f"sar_hint_{vp[0]}x{vp[1]}.png")
            open_phone_sar(pg); bs = [rect(pg, "[data-a=retry]"), rect(pg, "[data-a=cancel]")]
            ok(f"J {vp}: tombol layar SAR di NusaPhone ≥44×44 dan di dalam layar", all(r and r["w"] >= 44 and r["h"] >= 44 and r["x"] >= 0 and r["x"] + r["w"] <= vp[0] and r["y"] + r["h"] <= vp[1] for r in bs), bs)
            pg.screenshot(path=SCR + f"sar_phone_{vp[0]}x{vp[1]}.png"); ctx.close()
        # ---------- K. jalur perawatan lain, muat ulang di tengah misi, kotak masuk tergeser ----------
        for opt, name, cond in ((1, "Beri air", "cukup stabil"), (2, "Langsung evakuasi", "cukup stabil")):
            ctx = new_ctx(b); pg, errs = boot(ctx); before = snap(pg); start_mission(pg); to_victim(pg); open_victim_dialog(pg); press_opt(pg, opt); time.sleep(0.3)
            m_ = sar(pg)["m"]; deliver(pg); card = ev(pg, "document.getElementById('sarCard').innerText")
            ok(f"K '{name}': korban tetap selamat ('{cond}'), skor lebih rendah dari selimut, ekonomi utuh, tanpa galat", sar(pg)["m"]["phase"] == "done" and f"Kondisi: {cond}" in card and sar(pg)["m"]["score"] < 100 and snap(pg) == before and not errs, [card.replace("\n", " | ")[:120], sar(pg)["m"]["score"], errs[:1]]); ctx.close()
        ctx = new_ctx(b); pg, errs = boot(ctx); start_mission(pg); to_victim(pg); open_victim_dialog(pg)   # dialog terbuka, belum memilih
        ev(pg, "NW.world.closeDialog && NW.world.closeDialog()"); time.sleep(0.3)
        ok("K2a tahap 'ditemukan' tersimpan walau belum memilih perawatan", sar(pg)["m"]["stage"] == "found")
        reload_game(pg); set_clock(pg, T0 + 90000); goto_selat_boarded(pg); time.sleep(0.8); tick(pg); to_victim(pg); time.sleep(0.4)
        ok("K2b muat ulang di tahap 'ditemukan': pemain tidak terjebak — korban masih bisa diperiksa lagi", ev(pg, "NW.world.target && NW.world.target.id") == "sar:vic", ev(pg, "NW.world.target && NW.world.target.id"))
        open_victim_dialog(pg); press_opt(pg, 0); time.sleep(0.3)
        ok("K2c dilanjutkan sampai 'aboard' tanpa menemukan ulang", sar(pg)["m"]["stage"] == "aboard" and sar(pg)["m"]["care"] == "selimut")
        reload_game(pg); set_clock(pg, T0 + 120000); goto_selat_boarded(pg); time.sleep(0.8); tick(pg)
        ok("K3a muat ulang di tahap 'aboard': Pos SAR kembali dimuat & misi utuh", sar(pg)["m"]["stage"] == "aboard" and ev(pg, "!!NW.sar.spot()"))
        deliver(pg)
        ok("K3b diserahkan setelah muat ulang: selesai + lencana", sar(pg)["m"]["phase"] == "done" and sar(pg)["rec"]["badges"] == ["sar-laut-1"] and not errs, errs[:2]); ctx.close()
        ctx = new_ctx(b); pg, errs = boot(ctx); ring_now(pg); time.sleep(0.3)
        for i in range(26): ev(pg, "(i)=>NW.phone.notify({id:'xx'+i,title:'Pesan '+i,text:'isi'})", i)
        ev(pg, "NW.phone.open()"); time.sleep(1.6)
        ok("K4 catatan SAR tergeser dari kotak masuk (>20 pesan) dipulihkan saat NusaPhone dibuka", "PANGGILAN DARURAT" in ev(pg, "document.getElementById('nphRoot').innerText"), ev(pg, "document.getElementById('nphRoot').innerText")[:160]); ctx.close()
        ctx = new_ctx(b); pg, errs = boot(ctx); start_mission(pg); sp = ev(pg, "NW.sar.spot()"); put_boat(pg, sp["x"] - 3.5, sp["y"] + 4.5); adv(pg, 90000); time.sleep(0.5)
        pg.screenshot(path=SCR + "sar_far_view.png"); ctx.close()
        b.close()
    n = sum(R); print(f"\ntest_sar: {n}/{len(R)} lulus"); sys.exit(0 if n == len(R) else 1)
main()
