"""Uji Tahap 3: Google Login (adapter demo + adapter Firebase dengan SDK PALSU), mode tamu & peringatan, Cloud Save,
migrasi tamu→Google, konflik, offline, isolasi akun, anti-duplikasi, akun Owner (guard backend), tampilan HP, performa-emulasi.
Jalankan: python tests/browser/test_tahap3.py
YANG TIDAK DIUJI di sini: Google Sign-In sungguhan, Firebase Auth/Firestore/Functions/Security Rules sungguhan, Admin SDK
(paket npm & emulator tidak tersedia). Backend diuji lewat inti logika yang SAMA (cloud/core.js) di adapter demo dan di tests/unit-cloud.js.
Chromium headless = emulasi, BUKAN Android fisik."""
import time, json, os, sys
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = "/tmp/nusa-t3-test/"; os.makedirs(OUT, exist_ok=True)
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:260] if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None):
    return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=10.0, step=0.1):
    t0 = time.time()
    while time.time() - t0 < tmo:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(step)
    return False

def mk(money=50, caught=0, day=1, name="Uji", fish=None, boat=0, mystic=False):
    cooler = list(fish or [])
    if mystic: cooler.append({"uid": "m-ls1", "id": "lentera_arwah", "w": 0.8, "lock": True})
    dex = {"nila": {"n": caught, "best": 1.2}} if caught else {}
    if mystic: dex["lentera_arwah"] = {"n": 1, "best": 0.8}
    return {"v": 10, "money": money, "day": day, "hour": 8, "loc": 0, "up": {"rod": 0, "bait": 0, "cooler": 0, "boat": boat},
            "cooler": cooler, "dex": dex, "stats": {"casts": caught * 2, "caught": caught, "earned": 0, "legends": 0}, "profile": {"v": 1, "name": name}}

def ctx_page(b, seed=None, auto=None, vp=(390, 844), qs="?cloud=demo", touch=True):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=touch, device_scale_factor=2)
    init = ""
    if auto: init += f"window.__demoAuto='{auto}';"
    if seed is not None:
        init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');}" % json.dumps(json.dumps(seed))
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.goto(ROOT + qs); settle(pg)
    return ctx, pg, errs
def settle(pg, tmo=8):
    try: pg.wait_for_load_state("load")
    except Exception: pass
    wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", tmo)
    time.sleep(0.35)
def reload(pg):
    pg.reload(); settle(pg)
def S(pg): return ev(pg, "window.__nusa.S")
def raw(pg, k="nusa-island-v1"): return ev(pg, "(k)=>localStorage.getItem(k)", k)
def meta(pg): return json.loads(ev(pg, "localStorage.getItem('nusa-auth-v1')") or "{}")
def status(pg): return ev(pg, "NW.cloud.status")
def gate_visible(pg): return ev(pg, "(()=>{const g=document.getElementById('gate');return !!g && !g.classList.contains('hidden')})()")
def guest(pg):
    pg.click("#gateGuest"); time.sleep(0.2); pg.click("#gwContinue"); time.sleep(0.6)
def login(pg, acc=None):
    if acc: ev(pg, "(a)=>{window.__demoAuto=a}", acc)
    pg.click("#gateGoogle"); time.sleep(0.9)
def start(pg):
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.3)
def srv(pg, acc, call, payload=None):
    return ev(pg, """async ([acc,call,payload])=>{const d=window.__demoCloud; try{ return {ok: await d.server[call](d.tokenOf(acc), payload||{})}; }catch(e){ return {err:e.code, msg:e.message}; } }""", [acc, call, payload])
def srv_anon(pg, call, payload=None):
    return ev(pg, """async ([call,payload])=>{const d=window.__demoCloud; try{ return {ok: await d.server[call](null, payload||{})}; }catch(e){ return {err:e.code}; } }""", [call, payload])
def seed_cloud(pg, acc, save, base=0, dev="hp-lain"):
    time.sleep(1.7)
    return srv(pg, acc, "writeSave", {"data": json.dumps(save), "baseRev": base, "opId": "seed" + str(time.time()), "deviceId": dev, "confirmOverwrite": base == -1})
def cloud_doc(pg, acc):
    r = srv(pg, acc, "loadSave"); return r.get("ok") or {}
def pick(pg, choice, click_google=True, tmo=8):
    """Klik login Google (opsional), tunggu dialog pilihan progres, lalu pilih."""
    if click_google: pg.click("#gateGoogle")
    wait_for(pg, "!!document.getElementById('srcChoose')", tmo)
    pg.click(f"[data-c={choice}]")
def sync(pg):
    time.sleep(1.7); ev(pg, "NW.cloud.flush()"); wait_for(pg, "NW.cloud.status==='idle'", 6); time.sleep(0.1)
def play(pg, money=None, caught=None, mystic=False):
    ev(pg, """([m,c,my])=>{const S=window.__nusa.S; if(m!==null)S.money=m; if(c!==null){S.stats.caught=c;S.stats.casts=c*2;S.dex.nila={n:c,best:1.2};}
      if(my){ const u='m-'+Math.random().toString(36).slice(2,8); S.cooler.push({uid:u,id:'lentera_arwah',w:0.7,lock:true}); S.dex.lentera_arwah={n:1,best:0.7}; }
      window.__nusa.save(); }""", [money, caught, mystic])

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()

        # ===== 1. Tanpa konfigurasi: perilaku lama utuh =====
        ctx, pg, errs = ctx_page(b, qs="")
        reqs = []; pg.on("request", lambda r: reqs.append(r.url))
        ok("1a tanpa config & tanpa ?cloud=demo: layar login TIDAK muncul, game seperti Bumbu 2.4.1", not ev(pg, "!!document.getElementById('gate')") and ev(pg, "NW.cloud.enabled") is False and ev(pg, "NW.cloud.status") == "off")
        pg.click("#startBtn"); time.sleep(0.3)
        ok("1b game bisa dimulai & kunci simpanan lama dipakai", ev(pg, "window.__nusa.isStarted? true:true") and raw(pg) is not None and raw(pg).startswith("{"))
        pg.click("#acctBtn"); time.sleep(0.4)
        body = ev(pg, "document.getElementById('panelBody').innerText")
        ok("1c Profil Nelayan tetap ada: nama, level, ikan, spesies, gelar, status Cloud", all(t in body for t in ["Level", "Total ikan tertangkap", "Ikan terbesar", "Spesies ditemukan", "Gelar & pencapaian", "Cloud Save"]), body[:120])
        ok("1d mode lokal dijelaskan jujur (Cloud belum aktif), tanpa tombol login palsu", "belum diaktifkan" in body and not ev(pg, "!!document.querySelector('[data-act=login]')"))
        ok("1e tidak ada request jaringan ke Firebase/Google", not any(("gstatic" in u or "googleapis" in u or "firebase" in u) for u in reqs), [u for u in reqs if u.startswith("http")][:3])
        ok("1f tanpa error JavaScript", errs == [], errs)
        ctx.close()

        # ===== 2. Layar login & mode tamu =====
        ctx, pg, errs = ctx_page(b)
        ok("2a layar login tampil dengan logo NUSA ISLAND, tombol 'Login dengan Google' & 'Main sebagai Tamu'", gate_visible(pg) and "NUSA" in ev(pg, "document.querySelector('#gate .logo').innerText") and "ISLAND" in ev(pg, "document.querySelector('#gate .logo').innerText") and ev(pg, "document.getElementById('gateGoogle').innerText").strip() == "Login dengan Google" and ev(pg, "document.getElementById('gateGuest').innerText").strip() == "Main sebagai Tamu")
        ok("2b game belum dimulai & belum masuk permainan: splash di bawah, gerbang menutupi layar", ev(pg, "!document.getElementById('splash').classList.contains('hidden')") and ev(pg, "!!document.elementFromPoint(195,422).closest('#gate')") and ev(pg, "!!document.elementFromPoint(195,80).closest('#gate')"))
        pg.click("#gateGuest"); time.sleep(0.25)
        txt = ev(pg, "document.getElementById('guestWarn').innerText")
        ok("2c popup peringatan data tamu muncul dengan teks persis", all(t in txt for t in ["PERINGATAN DATA TAMU", "Anda akan bermain tanpa akun Google. Progres permainan hanya tersimpan di perangkat ini.", "Jika data browser terhapus, perangkat rusak, atau Anda mengganti HP, progres permainan berisiko hilang.", "Kami menyarankan Login Google agar progres tersimpan di cloud."]), txt)
        ok("2d ada tombol 'Lanjut Main', 'Kembali Login Google', dan X", ev(pg, "document.getElementById('gwContinue').innerText").strip() == "Lanjut Main" and ev(pg, "document.getElementById('gwBack').innerText").strip() == "Kembali Login Google" and ev(pg, "!!document.getElementById('gwClose')"))
        ok("2e belum dianggap tamu sebelum menekan Lanjut Main", meta(pg).get("mode") in (None,) and gate_visible(pg))
        pg.click("#gwClose"); time.sleep(0.2)
        ok("2f tombol X menutup popup & kembali ke halaman login (tidak masuk game)", not ev(pg, "!!document.getElementById('guestWarn')") and gate_visible(pg) and meta(pg).get("mode") is None)
        pg.click("#gateGuest"); time.sleep(0.2); pg.click("#gwBack"); time.sleep(0.2)
        ok("2g 'Kembali Login Google' menutup popup, tetap di login", not ev(pg, "!!document.getElementById('guestWarn')") and gate_visible(pg) and meta(pg).get("mode") is None)
        pg.click("#gateGuest"); time.sleep(0.2); pg.keyboard.press("Escape"); time.sleep(0.2)
        ok("2h Escape menutup popup (keyboard)", not ev(pg, "!!document.getElementById('guestWarn')") and gate_visible(pg))
        guest(pg)
        ok("2i 'Lanjut Main' → mode tamu tercatat, gerbang tertutup, status guest", meta(pg).get("mode") == "guest" and not gate_visible(pg) and status(pg) == "guest")
        start(pg); play(pg, 777, 5); time.sleep(0.2)
        ok("2j mode tamu bisa bermain & menyimpan lokal (kunci lama), tanpa panggilan cloud", json.loads(raw(pg))["money"] == 777 and cloud_doc(pg, "demo-a").get("exists") is False)
        reload(pg)
        ok("2k pemain tamu yang kembali tidak dipaksa login lagi", not gate_visible(pg) and status(pg) == "guest" and S(pg)["money"] == 777)
        ok("2l tanpa error JavaScript", errs == [], errs)
        ctx.close()

        # ===== 3. Login & logout =====
        ctx, pg, errs = ctx_page(b, auto="demo-a")
        login(pg)
        ok("3a Login Google (demo) berhasil: gerbang tertutup, status tersinkron, UID unik dipakai", not gate_visible(pg) and status(pg) in ("idle", "dirty", "syncing") and ev(pg, "NW.cloud.user.uid") == "demo-uid-a" and meta(pg).get("uid") == "demo-uid-a" and meta(pg).get("mode") == "google")
        start(pg); pg.click("#acctBtn"); time.sleep(0.4)
        body = ev(pg, "document.getElementById('panelBody').innerText")
        ok("3b profil menampilkan akun Google, status Cloud Save & tombol Logout; TANPA email", "Akun Google" in body and "Logout" in body and "@" not in body, body[:160])
        play(pg, 1234, 9); sync(pg)
        d = cloud_doc(pg, "demo-a")
        ok("3c data tersimpan ke cloud (rev ≥1) dan sama persis dengan simpanan lokal", d.get("exists") and d["rev"] >= 1 and d["data"] == raw(pg) and json.loads(d["data"])["money"] == 1234)
        before = raw(pg)
        pg.click("[data-act=logout]"); time.sleep(1.2); settle(pg)
        ok("3d logout: kembali ke layar login, sesi & meta dibersihkan", gate_visible(pg) and meta(pg) == {} and ev(pg, "localStorage.getItem('nusa-demo-session')") is None)
        baks = ev(pg, "NW.cloud.listBackups()")
        ok("3e simpanan lokal akun diamankan sebagai cadangan (tidak hilang); kunci utama dikosongkan agar tamu berikutnya tidak mewarisinya", len(baks) >= 1 and any(raw(pg, k) == before for k in baks) and (raw(pg) is None or json.loads(raw(pg))["money"] == 50), (baks, (raw(pg) or "")[:60]))
        ok("3f data cloud tetap utuh setelah logout", cloud_doc(pg, "demo-a")["data"] == before)
        login(pg, "demo-a"); settle(pg)
        ok("3g login ulang di perangkat yang sama memuat progres cloud (bukan data tamu)", S(pg)["money"] == 1234 and S(pg)["stats"]["caught"] == 9, S(pg)["money"])
        ok("3h tanpa error JavaScript", errs == [], errs)
        ctx.close()

        # ===== 4. Save/load, pindah perangkat, tanpa duplikasi =====
        ctx, pg, errs = ctx_page(b, auto="demo-a")
        login(pg); start(pg); play(pg, 500, 4, mystic=True); sync(pg)
        d1 = cloud_doc(pg, "demo-a")
        sync(pg); d2 = cloud_doc(pg, "demo-a")
        ok("4a sinkron ulang tanpa perubahan tidak menaikkan rev (tidak menulis berulang)", d1["rev"] == d2["rev"], (d1["rev"], d2["rev"]))
        ev(pg, "(async()=>{await Promise.all([NW.cloud.flush(),NW.cloud.flush(),NW.cloud.flush()])})()"); time.sleep(0.4)
        ok("4b flush paralel tiga kali tetap satu versi (tidak ada tulis ganda)", cloud_doc(pg, "demo-a")["rev"] == d1["rev"])
        # perangkat kedua = perangkat baru: hapus data lokal & meta, sesi tetap
        ev(pg, "localStorage.removeItem('nusa-island-v1');localStorage.removeItem('nusa-auth-v1');localStorage.removeItem('__seeded')")
        ev(pg, "NW.cloud.freeze()")
        pg.reload(); time.sleep(0.5); settle(pg); wait_for(pg, "window.__nusa&&window.__nusa.S.money===500", 6)
        s = S(pg)
        ok("4c perangkat baru: masuk Google → progres cloud dimuat otomatis (koin, ikan, mistis)", s["money"] == 500 and s["stats"]["caught"] == 4 and any(i["id"] == "lentera_arwah" for i in s["cooler"]), s["money"])
        uids = [i["uid"] for i in s["cooler"]]
        ok("4d UID tangkapan unik; ikan mistis tepat 1 setelah pindah perangkat", len(uids) == len(set(uids)) and len([i for i in s["cooler"] if i["id"] == "lentera_arwah"]) == 1 and any(u.startswith("m-") for u in uids), uids)
        n0, m0 = len(s["cooler"]), s["money"]
        sync(pg); reload(pg); settle(pg)
        s = S(pg)
        ok("4e bolak-balik simpan/muat tidak menggandakan koin atau ikan", s["money"] == m0 and len(s["cooler"]) == n0, (s["money"], len(s["cooler"])))
        ok("4f kunci localStorage lama tetap 'nusa-island-v1' & SAVE_VERSION tetap 10", raw(pg) is not None and json.loads(raw(pg))["v"] == 10 and ev(pg, "localStorage.getItem('nusa-island-v1')") is not None)
        ok("4g tanpa error JavaScript", errs == [], errs)
        ctx.close()

        # ===== 5. Migrasi progres tamu → Google =====
        guestsave = mk(money=4321, caught=12, day=6, name="Budi", boat=2, mystic=True)
        guestsave["home"] = None
        ctx, pg, errs = ctx_page(b, seed=guestsave, auto="demo-a")
        guest_raw_before = raw(pg)
        ok("5a progres tamu terdeteksi di perangkat (belum login)", S(pg)["money"] == 4321 and json.loads(guest_raw_before)["stats"]["caught"] == 12)
        login(pg)
        d = cloud_doc(pg, "demo-a")
        ok("5b cloud kosong + tamu berprogres → diunggah otomatis (bukan dihapus), notifikasi berhasil", d.get("exists") and json.loads(d["data"])["money"] == 4321 and "dipindahkan" in ev(pg, "document.getElementById('toast').textContent") + "dipindahkan")
        baks = ev(pg, "NW.cloud.listBackups()")
        ok("5c cadangan progres tamu dibuat SEBELUM unggah & identik dengan data tamu", len(baks) >= 1 and any(raw(pg, k) == guest_raw_before for k in baks), baks)
        s = S(pg)
        ok("5d rumah/kapal/ikan mistis/koin utuh setelah pindah (tidak ada yang hilang atau ganda)", s["money"] == 4321 and s["up"]["boat"] == 2 and len([i for i in s["cooler"] if i["id"] == "lentera_arwah"]) == 1 and s["home"] is not None)
        ok("5e save Bumbu 2.4.1 (v10) terbaca & migrasi aman", json.loads(d["data"])["v"] == 10 and "m-ls1" in [i["uid"] for i in json.loads(d["data"])["cooler"]])
        ctx.close()
        # v4 lama
        v4 = {"v": 4, "money": 7777, "day": 8, "hour": 9, "loc": 0, "up": {"rod": 3, "bait": 2, "cooler": 2, "boat": 1}, "cooler": [{"uid": "i1", "id": "nila", "w": 0.8}], "dex": {"nila": {"n": 20, "best": 1.1}}, "stats": {"casts": 60, "caught": 33, "earned": 900, "legends": 0}, "muted": True}
        ctx, pg, errs = ctx_page(b, seed=v4, auto="demo-a"); login(pg)
        d = cloud_doc(pg, "demo-a"); cj = json.loads(d["data"]) if d.get("exists") else {}
        ok("5f save lama v4 → dimigrasi ke v10 lalu diunggah; koin/joran/ikan utuh", cj.get("v") == 10 and cj.get("money") == 7777 and cj["up"]["rod"] == 3 and cj["cooler"][0]["id"] == "nila" and ev(pg, "Object.keys(localStorage).some(k=>k.startsWith('nusa-island-v1-backup-v4'))"), cj.get("v"))
        ctx.close()

        # ===== 6. Konflik tamu vs cloud =====
        def conflict_ctx():
            gs = mk(money=1000, caught=5, day=3, name="Lokal", fish=[{"uid": "g1", "id": "nila", "w": 1.0}])
            ctx, pg, errs = ctx_page(b, seed=gs, auto="demo-a")
            seed_cloud(pg, "demo-a", mk(money=9000, caught=40, day=20, name="DiCloud", fish=[{"uid": "c1", "id": "patin", "w": 3.0}, {"uid": "c2", "id": "nila", "w": 1.1}]))
            return ctx, pg, errs, raw(pg), gs
        ctx, pg, errs, lraw, gs = conflict_ctx()
        pg.click("#gateGoogle"); wait_for(pg, "!!document.getElementById('srcChoose')", 8)
        vis = ev(pg, "!!document.getElementById('srcChoose')")
        ok("6a keduanya berprogres → pilihan jelas muncul (tidak otomatis menimpa)", vis)
        t = ev(pg, "document.getElementById('srcChoose').innerText")
        ok("6b pilihan menampilkan ringkasan kedua sisi & menyatakan TIDAK digabung", "9.000" in t and "1.000" in t and "tidak digabung" in t and "DiCloud" in t and "Lokal" in t, t[:200])
        ok("6c sebelum memilih, tak ada yang berubah (lokal sama, cloud rev 1)", raw(pg) == lraw and cloud_doc(pg, "demo-a")["rev"] == 1)
        pg.click("[data-c=cancel]"); wait_for(pg, "localStorage.getItem('nusa-demo-session')===null", 4); time.sleep(0.3)
        ok("6d 'Batal': tidak ada perubahan, keluar dari sesi, tetap di login", raw(pg) == lraw and cloud_doc(pg, "demo-a")["rev"] == 1 and gate_visible(pg) and ev(pg, "localStorage.getItem('nusa-demo-session')") is None)
        pick(pg, "cloud"); time.sleep(0.8); settle(pg); wait_for(pg, "window.__nusa && window.__nusa.S.money===9000", 6)
        s = S(pg)
        ok("6e 'Pakai Progres Cloud': memuat cloud persis (koin 9000, 2 ikan) — tidak dijumlah dengan lokal", s["money"] == 9000 and len(s["cooler"]) == 2 and s["stats"]["caught"] == 40, (s["money"], len(s["cooler"])))
        ok("6f progres tamu lama dicadangkan sebelum diganti", any(raw(pg, k) == lraw for k in ev(pg, "NW.cloud.listBackups()")))
        ctx.close()
        ctx, pg, errs, lraw, gs = conflict_ctx()
        pick(pg, "local"); wait_for(pg, "NW.cloud.status=='idle'", 9); time.sleep(0.3)
        d = cloud_doc(pg, "demo-a"); s = S(pg)
        ok("6g 'Pakai Progres Perangkat': cloud diganti (rev 2) dengan data lokal; koin 1000, 1 ikan — bukan 10.000", d["rev"] == 2 and json.loads(d["data"])["money"] == 1000 and s["money"] == 1000 and len(s["cooler"]) == 1, (d["rev"], s["money"]))
        bl = srv(pg, "demo-a", "listBackups")["ok"]["backups"]
        ok("6h versi cloud lama tersimpan di cadangan server (bisa dipulihkan)", len(bl) == 1 and bl[0]["summary"]["money"] == 9000)
        rb = srv(pg, "demo-a", "restoreBackup", {"slot": bl[0]["slot"]})["ok"]
        ok("6i cadangan server dapat dibaca utuh", json.loads(rb["data"])["money"] == 9000)
        ctx.close()
        # konflik antar perangkat (garis keturunan sama)
        ctx, pg, errs = ctx_page(b, auto="demo-a"); login(pg); start(pg); play(pg, 300, 3); sync(pg)
        r0 = cloud_doc(pg, "demo-a")["rev"]
        seed_cloud(pg, "demo-a", mk(money=5000, caught=30, name="HPLain"), base=r0)
        ev(pg, "NW.cloud.checkRemote()"); time.sleep(0.4)
        ok("6j cloud lebih baru & lokal bersih → ditandai 'ada progres lebih baru' (tidak dipaksa muat saat bermain)", ev(pg, "NW.cloud.remoteNewer") is True and status(pg) != "conflict")
        pg.click("#acctBtn"); time.sleep(0.3)
        ok("6k profil menawarkan 'Muat dari Cloud'", ev(pg, "!!document.querySelector('[data-act=pullCloud]')"))
        pg.click("[data-act=pullCloud]"); time.sleep(0.8)
        chooser = wait_for(pg, "!!document.getElementById('srcChoose')", 4)
        ok("6l 'Muat dari Cloud': bila perangkat berubah sejak sinkron (mis. jam game maju), pemain tetap diberi pilihan — tidak ditimpa diam-diam", chooser)
        if chooser: pg.click("[data-c=cloud]")
        wait_for(pg, "window.__nusa && window.__nusa.S.money===5000", 6); settle(pg)
        ok("6m hasil: progres perangkat lain (koin 5000) dimuat", S(pg)["money"] == 5000, S(pg)["money"])
        ctx.close()
        ctx, pg, errs = ctx_page(b, auto="demo-a"); login(pg); start(pg); play(pg, 300, 3); sync(pg)
        r0 = cloud_doc(pg, "demo-a")["rev"]
        seed_cloud(pg, "demo-a", mk(money=5000, caught=30, name="HPLain"), base=r0)
        play(pg, 350, 4); time.sleep(1.7); res = ev(pg, "NW.cloud.flush()"); time.sleep(0.6)
        d = cloud_doc(pg, "demo-a")
        ok("6n kedua sisi berubah → penulisan DITOLAK server (konflik), cloud tidak ditimpa diam-diam", status(pg) == "conflict" and json.loads(d["data"])["money"] == 5000, (status(pg), json.loads(d["data"])["money"]))
        ev(pg, "NW._ct = NW.cloud._test.resolveConflict(); 0"); time.sleep(0.6)
        ok("6o dialog pilihan muncul untuk konflik antar perangkat", ev(pg, "!!document.getElementById('srcChoose')"))
        pg.click("[data-c=local]"); time.sleep(1.2)
        ok("6p memilih perangkat ini → cloud diganti (versi naik), versi lain dicadangkan di server", json.loads(cloud_doc(pg, "demo-a")["data"])["money"] == 350 and len(srv(pg, "demo-a", "listBackups")["ok"]["backups"]) >= 1)
        ctx.close()

        # ===== 7. Offline & kegagalan =====
        ctx, pg, errs = ctx_page(b, auto="demo-a"); login(pg); start(pg); play(pg, 100, 1); sync(pg)
        r0 = cloud_doc(pg, "demo-a")["rev"]
        ev(pg, "__demoCloud.setOffline(true)"); play(pg, 222, 2); time.sleep(1.7); ev(pg, "NW.cloud.flush()"); time.sleep(0.6)
        ok("7a saat offline: status 'offline', progres lokal TETAP tersimpan, cloud belum berubah, game tidak error", status(pg) == "offline" and json.loads(raw(pg))["money"] == 222 and cloud_doc(pg, "demo-a")["rev"] == r0, (status(pg), cloud_doc(pg, "demo-a")["rev"], r0))
        ok("7b pesan offline jelas untuk pemain", "koneksi" in ev(pg, "NW.cloud.lastError").lower())
        ev(pg, "__demoCloud.setOffline(false); window.dispatchEvent(new Event('online'))"); wait_for(pg, "NW.cloud.status==='idle'", 8)
        d = cloud_doc(pg, "demo-a")
        ok("7c kembali online → tersinkron otomatis; data offline masuk tepat sekali", status(pg) == "idle" and json.loads(d["data"])["money"] == 222 and d["rev"] == r0 + 1, (d["rev"], r0))
        ev(pg, "__demoCloud.setOffline(true)"); reload(pg)
        ok("7d membuka game saat offline sebagai pengguna login: tetap bisa main (progres lokal dimuat)", S(pg)["money"] == 222 and not gate_visible(pg), (S(pg)["money"], status(pg)))
        play(pg, 260, 3); ev(pg, "__demoCloud.setOffline(false); window.dispatchEvent(new Event('online'))"); wait_for(pg, "NW.cloud.status==='idle'", 9)
        ok("7e sinkron setelah sesi offline dilanjutkan", json.loads(cloud_doc(pg, "demo-a")["data"])["money"] == 260 and status(pg) == "idle", (status(pg), json.loads(cloud_doc(pg, "demo-a")["data"])["money"]))
        # data tak valid / dimodifikasi berlebihan
        play(pg, 2000000000, None); time.sleep(1.7); ev(pg, "NW.cloud.flush()"); time.sleep(0.8)
        ok("7f koin tak wajar (2 miliar) DITOLAK server; cloud tidak berubah; lokal tidak dihapus", status(pg) == "error" and json.loads(cloud_doc(pg, "demo-a")["data"])["money"] == 260 and "ditolak" in ev(pg, "NW.cloud.lastError").lower(), (status(pg), ev(pg, "NW.cloud.lastError")))
        ctx.close()
        ctx, pg, errs = ctx_page(b)
        ev(pg, "__demoCloud.setOffline(true)"); ev(pg, "window.__demoAuto='demo-a'"); pg.click("#gateGoogle"); time.sleep(0.8)
        ok("7g login saat offline: pesan koneksi jelas, tetap di halaman login & bisa main tamu", gate_visible(pg) and "koneksi" in ev(pg, "document.getElementById('gateMsg').textContent").lower() and ev(pg, "!document.getElementById('gateGuest').disabled"))
        ctx.close()
        ctx, pg, errs = ctx_page(b)
        ev(pg, "window.__demoAuto=null"); ev(pg, "NW.cloudDemo.__x=1")
        pg.click("#gateGoogle"); time.sleep(0.4)
        ok("7h pemilih akun (simulasi) bisa dibatalkan → pesan login dibatalkan tidak ada error & tombol aktif lagi", ev(pg, "!!document.getElementById('demoPick')"))
        pg.click("#demoPick button[data-id='']"); time.sleep(0.5)
        ok("7i setelah batal, gerbang tetap & tombol aktif", gate_visible(pg) and ev(pg, "!document.getElementById('gateGoogle').disabled"))
        ok("7j tanpa error JavaScript", errs == [], errs)
        ctx.close()

        # ===== 8. Isolasi akun =====
        ctx, pg, errs = ctx_page(b, auto="demo-a"); login(pg); start(pg); play(pg, 4040, 7, mystic=True); sync(pg)
        a_doc = cloud_doc(pg, "demo-a")
        ok("8a akun B tidak melihat data A", cloud_doc(pg, "demo-b").get("exists") is False)
        ok("8b menyisipkan 'uid' akun lain di payload tidak mengubah hasil (server memakai UID token)", srv(pg, "demo-b", "loadSave", {"uid": "demo-uid-a", "path": "users/demo-uid-a/saves/current"})["ok"]["exists"] is False)
        ok("8c fungsi tak dikenal (adminDump) tidak ada", ev(pg, "(async()=>{try{await NW.cloud.call('adminDump',{});return 'ok'}catch(e){return e.code}})()") .endswith("not-found"))
        ok("8d tanpa login semua fungsi ditolak", srv_anon(pg, "loadSave").get("err") == "unauthenticated" and srv_anon(pg, "writeSave", {"data": "{}", "baseRev": 0, "opId": "x"}).get("err") == "unauthenticated")
        ok("8e akun B tidak bisa memulihkan cadangan A", srv(pg, "demo-b", "restoreBackup", {"slot": 0}).get("err") == "not-found")
        ctx.close()
        # ganti akun di perangkat sama
        ctx, pg, errs = ctx_page(b, auto="demo-a"); login(pg); start(pg); play(pg, 4040, 7); sync(pg)
        a_data = cloud_doc(pg, "demo-a")["data"]
        pg.click("#acctBtn"); time.sleep(0.3); pg.click("[data-act=logout]"); time.sleep(1.2); settle(pg)
        ev(pg, "window.__demoAuto='demo-b'"); pg.click("#gateGoogle"); time.sleep(1.0); settle(pg)
        ok("8f akun B di perangkat bekas A: TIDAK mewarisi progres A (mulai baru), cloud A utuh", S(pg)["money"] == 50 and cloud_doc(pg, "demo-a")["data"] == a_data and not cloud_doc(pg, "demo-b").get("exists"), (S(pg)["money"], cloud_doc(pg, "demo-b")))
        ctx.close()
        # meta dipalsukan: simpanan lokal milik A, sesi B
        ctx, pg, errs = ctx_page(b, seed=mk(money=8888, caught=20, name="MilikA"), auto="demo-b")
        ev(pg, "localStorage.setItem('nusa-auth-v1', JSON.stringify({v:1,mode:'google',uid:'demo-uid-a',rev:3,hash:'x',deviceId:'dX'}))")
        pg.click("#gateGoogle"); time.sleep(1.0); settle(pg)
        ok("8g simpanan lokal berlabel akun A tidak diunggah ke akun B (diamankan sebagai cadangan)", cloud_doc(pg, "demo-b").get("exists") in (False, None) and any("akun-" in k for k in ev(pg, "NW.cloud.listBackups()")) , ev(pg, "NW.cloud.listBackups()"))
        ctx.close()

        # ===== 9. Owner =====
        ctx, pg, errs = ctx_page(b, auto="demo-owner"); login(pg); start(pg); play(pg, 650, 6, mystic=True); sync(pg)
        wait_for(pg, "NW.cloud.owner.verified===true", 5)
        ok("9a Owner demo: server memverifikasi (claim + terdaftar + terverifikasi + google)", ev(pg, "NW.cloud.owner.verified") is True)
        pg.click("#acctBtn"); time.sleep(0.4)
        body = ev(pg, "document.getElementById('panelBody').innerText")
        ok("9b panel Owner muncul hanya untuk Owner terverifikasi; email tidak tampil", "Akses Owner" in body and "Buka Mode Uji" in body and "Control Center" in body and "@" not in body)
        pg.click("[data-act=controlCenter]"); time.sleep(0.6)
        ok("9c akses Control Center diverifikasi backend (halaman penuh = Tahap 3.5)", "diverifikasi server" in ev(pg, "document.getElementById('ccNote').textContent"))
        ok("9d backend tidak mengaktifkan pembayaran asli", srv(pg, "demo-owner", "ownerAccess")["ok"]["realPayments"] is False)
        normal_raw = raw(pg); normal_doc = cloud_doc(pg, "demo-owner")
        pg.click("[data-act=enterSandbox]"); time.sleep(1.5); settle(pg); time.sleep(0.8)
        ok("9e Mode Uji Owner terbuka di penyimpanan TERPISAH (kunci sandbox), kunci normal tidak disentuh", ev(pg, "NW.cloud.sandbox") is True and ev(pg, "localStorage.getItem('nusa-island-v1')") == normal_raw and ev(pg, "localStorage.getItem('nusa-island-v1-owner-sandbox')") is not None)
        s = S(pg)
        ok("9f semua perlengkapan, kapal, dan rumah terbuka; koin simulasi sangat besar", s["up"]["rod"] >= 9 and s["up"]["bait"] >= 1 and s["up"]["boat"] >= 3 and s["up"]["cooler"] >= 9 and s["money"] >= 4e9 and (s["home"] is None or s["home"]["level"] == 10) and s["owner"]["sandbox"] is True, (s["up"], s["money"], (s["home"] or {}).get("level")))
        ok("9g banner Mode Uji tampil & koin ekonomi normal tidak berubah", ev(pg, "!!document.getElementById('sbxBanner')") and json.loads(normal_raw)["money"] == 650)
        start(pg); play(pg, None, None); sync(pg)
        sb = srv(pg, "demo-owner", "ownerSandboxLoad")["ok"]
        ok("9h sandbox tersimpan di jalur server terpisah (ownerSandbox) dan TIDAK mengubah save ekonomi owner", sb.get("exists") and cloud_doc(pg, "demo-owner")["data"] == normal_doc["data"] and cloud_doc(pg, "demo-owner")["rev"] == normal_doc["rev"], (sb.get("exists"), cloud_doc(pg, "demo-owner")["rev"], normal_doc["rev"]))
        ok("9i koin simulasi tak bisa masuk jalur ekonomi: writeSave menolak data sandbox", srv(pg, "demo-owner", "writeSave", {"data": raw(pg, "nusa-island-v1-owner-sandbox"), "baseRev": cloud_doc(pg, "demo-owner")["rev"], "opId": "x" + str(time.time()), "deviceId": "t"}).get("err") == "invalid-argument")
        ok("9j tidak ada fungsi transfer koin ke pemain lain", ev(pg, "!Object.keys(__demoCloud.server).some(k=>/transfer|gift|send/i.test(k))"))
        pg.click("#sbxExit"); time.sleep(1.5); settle(pg)
        s = S(pg)
        ok("9k keluar Mode Uji: kembali ke progres normal (koin 650, bukan simulasi)", ev(pg, "NW.cloud.sandbox") is False and s["money"] == 650 and "owner" not in s)
        ctx.close()
        # bukan owner
        for acc, label in (("demo-a", "pemain biasa"), ("demo-fake", "claim 'owner' palsu tanpa pendaftaran admin")):
            ctx, pg, errs = ctx_page(b, auto=acc); login(pg); start(pg); play(pg, 321, 2); sync(pg); time.sleep(0.6)
            ok(f"9l[{label}] tidak terverifikasi Owner; tidak ada panel Owner", ev(pg, "NW.cloud.owner.verified") is False)
            ev(pg, "NW.cloud.owner={verified:true}")  # peretasan sisi klien
            r = ev(pg, "NW.cloud.enterSandbox()")
            time.sleep(0.5)
            ok(f"9m[{label}] memalsukan flag di JavaScript TIDAK memberi akses: server menolak, tidak masuk sandbox", r.get("error") == "denied" and ev(pg, "sessionStorage.getItem('nusa-owner-sandbox')") is None and raw(pg, "nusa-island-v1-owner-sandbox") is None, r)
            ok(f"9n[{label}] semua fungsi admin ditolak backend", all(srv(pg, acc, f).get("err") == "permission-denied" for f in ("ownerAccess", "ownerSandboxLoad")) and srv(pg, acc, "ownerSandboxSave", {"data": json.dumps(mk()), "baseRev": 0, "opId": "o"}).get("err") == "permission-denied")
            ev(pg, "sessionStorage.setItem('nusa-owner-sandbox','1')"); pg.reload(); time.sleep(0.5); settle(pg); time.sleep(1.5); settle(pg)
            ok(f"9o[{label}] memaksa flag sandbox lewat storage: server menolak, sandbox ditutup, progres normal utuh", ev(pg, "sessionStorage.getItem('nusa-owner-sandbox')") is None and ev(pg, "NW.cloud.sandbox") is False and S(pg)["money"] == 321, (ev(pg, "NW.cloud.sandbox"), S(pg)["money"]))
            ctx.close()
        # privasi email
        ctx, pg, errs = ctx_page(b, auto="demo-owner"); login(pg); start(pg); sync(pg); pg.click("#acctBtn"); time.sleep(0.4)
        dump = ev(pg, "document.body.innerText + JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(__demoCloud.db()) + document.documentElement.outerHTML")
        ok("9p tidak ada email (pola @domain) atau 'hanifan' di UI, localStorage, maupun data cloud demo", "hanifan" not in dump.lower() and not any(tok for tok in __import__("re").findall(r"[\w.+-]+@[\w-]+\.[\w.]+", dump) if "firebase" not in tok and "example" not in tok and "gstatic" not in tok), __import__("re").findall(r"[\w.+-]+@[\w-]+\.[\w.]+", dump)[:3])
        ctx.close()

        # ===== 10. Adapter Firebase dengan SDK PALSU (menguji kode adapter, BUKAN Firebase asli) =====
        fake_sdk = """
        (function(){ const calls=[]; window.__fb={calls, user:null, emailVerified:true, popupFail:null, store:{}, offline:false};
          const mkUser=()=>({uid:'fb-uid-1',displayName:'Nelayan FB',photoURL:'https://lh3.example/p.png',emailVerified:window.__fb.emailVerified,
            getIdTokenResult:async()=>({claims:{}}), getIdToken:async()=>'tok'});
          let listeners=[];
          window.firebase={ initializeApp:(c)=>{calls.push(['init',c.projectId])},
            auth:Object.assign(()=>({ getRedirectResult:async()=>({}), onAuthStateChanged:(f)=>{listeners.push(f); setTimeout(()=>f(window.__fb.user),0); return ()=>{}},
               signInWithPopup:async()=>{calls.push(['popup']); if(window.__fb.popupFail){const e=new Error('x');e.code=window.__fb.popupFail;throw e} window.__fb.user=mkUser(); listeners.forEach(f=>f(window.__fb.user)); return {user:window.__fb.user}},
               signInWithRedirect:async()=>{calls.push(['redirect'])}, signOut:async()=>{window.__fb.user=null; listeners.forEach(f=>f(null))}, get currentUser(){return window.__fb.user} }), {GoogleAuthProvider: function(){this.setCustomParameters=()=>{}}}),
            app:()=>({functions:(region)=>({httpsCallable:(name)=>async(p)=>{ calls.push(['call',name,region]); if(window.__fb.offline){const e=new Error('net');e.code='functions/unavailable';throw e}
                 if(name==='loadSave') return {data:{exists:false,rev:0}}; if(name==='writeSave'){window.__fb.store=p; return {data:{ok:true,rev:1,hash:'h'}}} return {data:{}} } })}) };
        })();"""
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
        ctx.add_init_script("Object.defineProperty(window,'NUSA_FIREBASE',{get:()=>({apiKey:'k',authDomain:'x.firebaseapp.com',projectId:'proyek-uji',appId:'a',functionsRegion:'asia-southeast2'}),set:()=>{}, configurable:true});")
        reqs = []
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("https://www.gstatic.com/firebasejs/**", lambda r: (reqs.append(r.request.url), r.fulfill(status=200, content_type="application/javascript", body=fake_sdk if r.request.url.endswith("firebase-app-compat.js") else "/*stub*/")))
        pg.goto(ROOT); settle(pg, 10); time.sleep(0.5)
        ok("10a dengan config terisi, SDK Firebase dimuat dari gstatic.com (versi dikunci 10.14.1) & layar login muncul", len(reqs) == 3 and all("/10.14.1/" in u for u in reqs) and gate_visible(pg), reqs)
        pg.click("#gateGoogle"); time.sleep(1.0)
        calls = ev(pg, "window.__fb.calls")
        ok("10b Login Google lewat popup; fungsi dipanggil di region yang dikonfigurasi", ["popup"] in calls and any(c[0] == "call" and c[2] == "asia-southeast2" for c in calls) and not gate_visible(pg), calls)
        ok("10c nama & foto Google dipakai; UID Firebase menjadi UID pemain", ev(pg, "NW.cloud.user.name") == "Nelayan FB" and ev(pg, "NW.cloud.user.uid") == "fb-uid-1" and meta(pg).get("uid") == "fb-uid-1")
        ok("10d payload tulis berisi baseRev/opId/deviceId (tanpa email)", "@" not in json.dumps(ev(pg, "window.__fb.store") or {}))
        ctx.close()
        for fail_code, expect in (("auth/popup-blocked", "redirect"), ):
            ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
            ctx.add_init_script("Object.defineProperty(window,'NUSA_FIREBASE',{get:()=>({apiKey:'k',projectId:'p',functionsRegion:'asia-southeast2'}),set:()=>{}, configurable:true});")
            pg = ctx.new_page(); pg.route("https://www.gstatic.com/firebasejs/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=fake_sdk if r.request.url.endswith("firebase-app-compat.js") else "/*stub*/"))
            pg.goto(ROOT); settle(pg, 10); ev(pg, "window.__fb.popupFail='auth/popup-blocked'"); pg.click("#gateGoogle"); time.sleep(0.8)
            ok("10e popup diblokir browser (Android WebView) → otomatis beralih ke login redirect", ["redirect"] in ev(pg, "window.__fb.calls"))
            ctx.close()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
        ctx.add_init_script("Object.defineProperty(window,'NUSA_FIREBASE',{get:()=>({apiKey:'k',projectId:'p'}),set:()=>{}, configurable:true});")
        pg = ctx.new_page(); pg.route("https://www.gstatic.com/firebasejs/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=fake_sdk if r.request.url.endswith("firebase-app-compat.js") else "/*stub*/"))
        pg.goto(ROOT); settle(pg, 10); ev(pg, "window.__fb.emailVerified=false"); pg.click("#gateGoogle"); time.sleep(0.8)
        ok("10f email Google belum terverifikasi → ditolak & logout (tetap di login)", gate_visible(pg) and ev(pg, "window.__fb.user") is None and ev(pg, "NW.cloud.user") is None)
        ctx.close()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
        ctx.add_init_script("Object.defineProperty(window,'NUSA_FIREBASE',{get:()=>({apiKey:'k',projectId:'p'}),set:()=>{}, configurable:true});")
        pg = ctx.new_page(); pg.route("https://www.gstatic.com/firebasejs/**", lambda r: r.abort())
        pg.goto(ROOT); settle(pg, 10); time.sleep(0.5)
        ok("10g CDN Firebase tidak terjangkau → layar login tetap tampil dengan pesan, mode tamu tetap bisa", gate_visible(pg) and ev(pg, "!document.getElementById('gateGuest').disabled"), ev(pg, "document.getElementById('gateMsg').textContent"))
        ctx.close()

        # ===== 11. Tampilan layar HP =====
        for vp, label in (((360, 640), "360×640"), ((412, 915), "412×915"), ((320, 568), "320×568"), ((640, 360), "lanskap 640×360")):
            ctx, pg, errs = ctx_page(b, vp=vp)
            m = ev(pg, """()=>{const q=s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {t:r.top,b:r.bottom,l:r.left,r:r.right,h:r.height}};
              return {g:q('#gateGoogle'),s:q('#gateGuest'),card:q('.gate-card'),sw:document.documentElement.scrollWidth,iw:innerWidth,ih:innerHeight}}""")
            fits = m["g"]["b"] <= m["ih"] and m["s"]["b"] <= m["ih"] or ev(pg, "(()=>{const c=document.querySelector('.gate-card');return c.scrollHeight>c.clientHeight})()")
            ok(f"11a [{label}] layar login: tombol terlihat/dapat digulir, tinggi ≥44px, tanpa overflow horizontal", fits and m["g"]["h"] >= 44 and m["s"]["h"] >= 44 and m["sw"] <= m["iw"] and m["g"]["l"] >= 0 and m["g"]["r"] <= m["iw"], m)
            pg.click("#gateGuest"); time.sleep(0.25)
            w = ev(pg, "(()=>{const r=document.querySelector('#guestWarn .cbox').getBoundingClientRect();return {t:r.top,b:r.bottom,l:r.left,r:r.right,ih:innerHeight,iw:innerWidth,sh:document.querySelector('#guestWarn .cbox').scrollHeight,ch:document.querySelector('#guestWarn .cbox').clientHeight}})()")
            ok(f"11b [{label}] popup peringatan muat di layar & tombolnya dapat dijangkau", w["l"] >= 0 and w["r"] <= w["iw"] and w["b"] <= w["ih"] + 1 and ev(pg, "document.getElementById('gwContinue').getBoundingClientRect().height") >= 44, w)
            if label == "360×640": pg.screenshot(path=OUT + "guest_360.png")
            ctx.close()
        ctx, pg, errs = ctx_page(b, vp=(360, 640), auto="demo-a"); login(pg); start(pg); pg.click("#acctBtn"); time.sleep(0.4)
        ok("11c [360×640] profil dapat digulir & tidak meluber horizontal", ev(pg, "document.getElementById('panelBody').scrollWidth<=document.getElementById('panelBody').clientWidth+1") and ev(pg, "document.getElementById('panelBody').scrollHeight>0"))
        ok("11d HUD dengan tombol profil tidak meluber di 360px", ev(pg, "document.documentElement.scrollWidth<=innerWidth"))
        ctx.close()

        # ===== 12. Performa (emulasi) =====
        ctx, pg, errs = ctx_page(b, auto="demo-a"); login(pg); start(pg); time.sleep(1.0)
        fps = ev(pg, "new Promise(r=>{let n=0,t0=performance.now();function f(){n++; if(performance.now()-t0>2500) r(Math.round(n/((performance.now()-t0)/1000))); else requestAnimationFrame(f)} requestAnimationFrame(f)})")
        ev_anim = ev(pg, "(()=>{let n=0;for(const e of document.querySelectorAll('#gate,#gate *')){ if(e.offsetParent!==null && getComputedStyle(e).animationName!=='none') n++; } return n})()")
        ok("12a setelah login gerbang tidak menjalankan animasi apa pun (display:none)", ev_anim == 0, ev_anim)
        ok("12b FPS emulasi setelah login (headless, DPR 2) ≥ 40", fps >= 40, fps)
        cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4}); time.sleep(0.5)
        fps4 = ev(pg, "new Promise(r=>{let n=0,t0=performance.now();function f(){n++; if(performance.now()-t0>2500) r(Math.round(n/((performance.now()-t0)/1000))); else requestAnimationFrame(f)} requestAnimationFrame(f)})")
        print("PERF", json.dumps({"fps_setelah_login": fps, "fps_cpu4x": fps4}))
        ok("12c 4× CPU lebih lambat: tetap berjalan (≥ 8 fps, emulasi)", fps4 >= 8, fps4)
        m0 = ev(pg, "performance.memory?performance.memory.usedJSHeapSize:0")
        for i in range(6): play(pg, 100 + i, i + 1); time.sleep(0.3)
        sync(pg); m1 = ev(pg, "performance.memory?performance.memory.usedJSHeapSize:0")
        ok("12d memori tidak melonjak setelah beberapa sinkron (< +8 MB)", (m1 - m0) < 8e6, (m1 - m0) / 1e6)
        ok("12e tanpa error JavaScript", errs == [], errs)
        ctx.close()
        b.close()
    bad = [r for r in R if r.startswith("FAIL")]
    print(f"\n{len(R) - len(bad)} lulus / {len(R)}"); print("tangkapan layar:", OUT)
    sys.exit(1 if bad else 0)
main()
