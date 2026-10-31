"""Uji Login Streak 7 Hari di browser (Chromium headless = emulasi, BUKAN Android fisik).
Jalankan: python tests/browser/test_streak.py

YANG DIUJI: tampilan Kalender Hadiah, alur klaim lewat UI, kredit hadiah ke simpanan, satu klaim per hari, reset streak, kapal (hari 7),
joran (hari 14), perabot acak tanpa duplikat yang benar-benar masuk Rumahku dan tergambar, ketahanan terhadap jam HP, reload/logout,
pemulihan hadiah, Cloud Save, tamu tidak bisa klaim.
YANG TIDAK DIUJI: Firebase ASLI. "Server" di sini adalah penyimpanan palsu yang memakai fungsi validasi YANG SAMA dengan Rules
(NW.StreakCore.validateTransition) di mode demo (?cloud=demo, ditandai SIMULASI di layar). Teks firestore.rules sendiri hanya diperiksa
statis (tests/unit-streak.js); belum dijalankan di emulator maupun Firestore sungguhan."""
import time, json, os, sys
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = "/tmp/nusa-streak-test/"; os.makedirs(OUT, exist_ok=True)
R = []
DAY = 86400000
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:240] if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=10.0, step=0.1):
    t0 = time.time()
    while time.time() - t0 < tmo:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(step)
    return False

# jam server awal: 1 Nov 2026 10:00 WIB (UTC+7) → 03:00 UTC
T0 = 1793502000000
FAKE = """
(function(){
  const K='__srvdoc', C=()=>window.NW&&NW.StreakCore;
  window.__srvNow = %d;
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(K)||'null'); }catch(e){ return null; } };
  const savedNow = localStorage.getItem('__srvnow'); if (savedNow) window.__srvNow = +savedNow;
  window.NUSA_STREAK_STORE = { simulated:true, ready:()=>true, uid:()=>'demo-uid-a', calls:0,
    async get(){ return load(); },
    async claim(next, prev){ this.calls++; const doc=load(); const v=C().validateTransition(doc,next,window.__srvNow);
      if(!v.ok){ const e=new Error('ditolak '+v.why); e.code='permission-denied'; e.why=v.why; throw e; }
      const d=JSON.parse(JSON.stringify(next)); d.at=window.__srvNow; localStorage.setItem(K, JSON.stringify(d)); return next; } };
  window.__STREAK_NOW = () => window.__srvNow;
  window.__setNow = (v) => { window.__srvNow = v; localStorage.setItem('__srvnow', String(v)); };
})();
""" % T0

def mk(money=50):
    return {"v": 11, "money": money, "day": 1, "hour": 8, "loc": 0, "up": {"rod": 0, "bait": 0, "cooler": 0, "boat": 0},
            "cooler": [], "dex": {}, "stats": {"casts": 0, "caught": 0, "earned": 0, "legends": 0}, "profile": {"v": 1, "name": "Uji"}}

def new_page(b, qs="?cloud=demo", seed=None, fake=True, vp=(390, 844), auto="demo-a"):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = ""
    if auto: init += f"window.__demoAuto='{auto}';"
    if fake: init += FAKE
    if seed is not None: init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');}" % json.dumps(json.dumps(seed))
    ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.goto(ROOT + qs)
    wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.4)
    return ctx, pg, errs
def start(pg):
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.3)
def login(pg):
    pg.click("#gateGoogle")
    wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5); start(pg)
    wait_for(pg, "NW.streak && NW.streak._state.loaded", 8)
def reload(pg):
    pg.reload(); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.5)
    start(pg); wait_for(pg, "NW.streak && (NW.streak._state.loaded || !NW.streak.access().ok)", 8)
def S(pg): return ev(pg, "window.__nusa.S")
def set_now(pg, ms): ev(pg, "(v)=>window.__setNow(v)", ms)
def open_panel(pg):
    if not ev(pg, "!document.getElementById('panelWrap').classList.contains('hidden') && Nusa.currentPanel()==='streak'"):
        ev(pg, "document.getElementById('streakBtn').click()"); time.sleep(0.25)
def close_panel(pg):
    if ev(pg, "!document.getElementById('panelWrap').classList.contains('hidden')"): ev(pg, "Nusa.closePanel()"); time.sleep(0.1)
def claim_ui(pg):
    open_panel(pg); ev(pg, "document.querySelector('[data-act=stkClaim]').click()")
    wait_for(pg, "!!document.querySelector('.stk-pop') || !!NW.streak._state.error", 6); time.sleep(0.3)
def dismiss(pg):
    if ev(pg, "!!document.querySelector('.stk-pop')"): ev(pg, "document.querySelector('.stk-pop [data-act=stkClose]').click()"); time.sleep(0.1)
def claim_api(pg): return ev(pg, "NW.streak.claim().then(r=>({ok:!!r.ok,already:!!r.already,error:r.error||null,pos:r.plan&&r.plan.pos,cycle:r.plan&&r.plan.cycle,fid:r.plan&&r.plan.fid}))")
def next_day(pg, n=1):
    now = ev(pg, "window.__srvNow"); set_now(pg, now + n * DAY)
    ev(pg, "NW.streak.refresh(true)"); time.sleep(0.15)
def doc(pg): return json.loads(ev(pg, "localStorage.getItem('__srvdoc')") or "null")

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()

        # ===== 1. Tamu: tombol klaim mati, penjelasan jujur =====
        ctx, pg, errs = new_page(b)
        pg.click("#gateGuest"); time.sleep(0.2); pg.click("#gwContinue")
        wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5); start(pg)
        ok("1a tombol 🎁 ada di HUD", ev(pg, "!!document.getElementById('streakBtn')"))
        open_panel(pg)
        body = ev(pg, "document.getElementById('panelBody').innerText")
        ok("1b tamu: tombol KLAIM mati + penjelasan login Google", ev(pg, "document.querySelector('.stk-claim').disabled") is True and "Masuk dengan Google" in body, body[:120])
        r = ev(pg, "NW.streak.claim().then(r=>r)")
        ok("1c tamu tidak bisa klaim lewat API juga, tidak ada hadiah", bool(r.get("error")) and S(pg)["money"] == 50 and ev(pg, "localStorage.getItem('__srvdoc')") is None)
        ctx.close()

        # ===== 2. Login + tampilan =====
        ctx, pg, errs = new_page(b, seed=mk(50)); login(pg)
        ok("2a login demo + data streak dimuat, belum ada klaim", ev(pg, "NW.streak.view().canClaimNow") is True and ev(pg, "NW.streak.view().claimPos") == 1)
        ok("2b lencana ! di tombol 🎁 saat hadiah siap", ev(pg, "!document.getElementById('streakBadge').classList.contains('hidden')"))
        open_panel(pg); time.sleep(0.2)
        ok("2c tujuh kotak hadiah (6 + Hari 7 spesial)", ev(pg, "document.querySelectorAll('.stk-cell').length") == 7 and ev(pg, "document.querySelectorAll('.stk-cell.big').length") == 1 and ev(pg, "document.querySelector('.stk-cell.big').dataset.pos") == "7")
        ok("2d Hari 1 berstatus 'Hari ini', sisanya terkunci", ev(pg, "document.querySelector('.stk-cell[data-pos=\"1\"]').classList.contains('today')") and ev(pg, "document.querySelectorAll('.stk-cell.lock').length") == 6)
        ok("2e tombol KLAIM HADIAH aktif", "KLAIM HADIAH" in ev(pg, "document.querySelector('.stk-claim').innerText") and ev(pg, "document.querySelector('.stk-claim').disabled") is False)
        ok("2f info streak & hadiah utama berikutnya tampil", "Kapal Perintis" in ev(pg, "document.querySelector('.stk-major').innerText") and "6 hari lagi" in ev(pg, "document.querySelector('.stk-major').innerText"), ev(pg, "document.querySelector('.stk-major').innerText"))
        ok("2g mode demo diberi label SIMULASI (tidak pura-pura online)", "MODE DEMO" in ev(pg, "document.querySelector('.stk').innerText"))
        pg.screenshot(path=OUT + "01_siap_klaim.png")

        # ===== 3. Klaim Hari 1 lewat UI =====
        m0 = S(pg)["money"]; claim_ui(pg)
        ok("3a klaim Hari 1: +20 koin", S(pg)["money"] == m0 + 20, S(pg)["money"])
        ok("3b animasi/popup klaim tampil", ev(pg, "!!document.querySelector('.stk-pop')") and "20 koin" in ev(pg, "document.querySelector('.stk-pop').innerText"))
        pg.screenshot(path=OUT + "02_popup_klaim.png")
        dismiss(pg)
        ok("3c Hari 1 'Sudah Diklaim', tombol mati, hitung mundur tampil", ev(pg, "document.querySelector('.stk-cell[data-pos=\"1\"]').classList.contains('done')") and "Sudah Diklaim" in ev(pg, "document.querySelector('.stk-claim').innerText") and ev(pg, "document.querySelector('.stk-claim').disabled") and ev(pg, "!!document.getElementById('stkCount')"))
        ok("3d hitung mundur ≈ 14 jam (10:00 → 00:00 WIB)", ev(pg, "document.getElementById('stkCount').innerText").startswith("13:5") or ev(pg, "document.getElementById('stkCount').innerText").startswith("14:0"), ev(pg, "document.getElementById('stkCount').innerText"))
        pg.screenshot(path=OUT + "03_sudah_diklaim.png")
        r = claim_api(pg)
        ok("3e klaim kedua di hari yang sama ditolak, koin tetap", r["already"] and S(pg)["money"] == m0 + 20)
        ok("3f buku server mencatat total 1, pos 1, hari = hari Jakarta", doc(pg)["total"] == 1 and doc(pg)["pos"] == 1 and doc(pg)["lastDay"] == (T0 + 7 * 3600000) // DAY)

        # ===== 4. Anti-duplikasi: reload, logout/login, jam HP =====
        reload(pg)
        ok("4a setelah reload: tetap Sudah Diklaim, koin tidak bertambah", ev(pg, "NW.streak.view().claimedToday") and S(pg)["money"] == m0 + 20 and S(pg)["streak"]["applied"] == 1)
        ev(pg, "Date.now = ((o)=>()=>o()+5*86400000)(Date.now)")      # jam HP dimajukan 5 hari
        r = claim_api(pg)
        ok("4b jam HP dimajukan: tetap tidak bisa klaim lagi (hari ditentukan server)", r["already"] and S(pg)["money"] == m0 + 20 and doc(pg)["total"] == 1)
        # klien dengan jam salah mencoba memaksa → server menolak
        ev(pg, "window.__STREAK_NOW = () => window.__srvNow + 2*86400000")
        ev(pg, "NW.streak._state.doc = null")
        ev(pg, "NW.streak.refresh(true)"); time.sleep(0.2)
        r = claim_api(pg)
        ok("4c klien berjam salah memaksa klaim → ditolak server, tidak ada hadiah", r["error"] is not None and not r["ok"] and S(pg)["money"] == m0 + 20 and doc(pg)["total"] == 1, r)
        ev(pg, "window.__STREAK_NOW = () => window.__srvNow"); ev(pg, "NW.streak.refresh(true)")
        pg.click("#acctBtn") if ev(pg, "!!document.getElementById('acctBtn')") else None
        ev(pg, "NW.cloud.logout && NW.cloud.logout()"); time.sleep(0.8)
        ok("4d logout tidak menghapus buku klaim server", doc(pg)["total"] == 1)
        ctx.close()

        # ===== 5. Siklus 1: Hari 2..7 berturut-turut, kapal di Hari 7 =====
        ctx, pg, errs = new_page(b, seed=mk(50)); login(pg)
        exp = [("coin", 20, 0), ("bait", 0, 3), ("coin", 35, 0), ("chest", 40, 2), ("bait", 0, 5), ("coin", 50, 0)]
        money, bait = 50, 0
        for i, (k, c, ba) in enumerate(exp):
            r = claim_api(pg); money += c; bait += ba
            ok(f"5.{i+1} Hari {i+1}: hadiah benar (koin {S(pg)['money']}, umpan {S(pg)['streak']['bait']})", r["ok"] and r["pos"] == i + 1 and S(pg)["money"] == money and S(pg)["streak"]["bait"] == bait)
            ok(f"5.{i+1}b kapal belum diberikan", S(pg)["streak"]["ship"] is False)
            next_day(pg)
        r = claim_api(pg)
        ok("5.7 Hari 7: Kapal Perintis Eksklusif permanen", r["ok"] and r["pos"] == 7 and S(pg)["streak"]["ship"] is True and doc(pg)["ship"] is True)
        ok("5.7b kapal dipakai: warna kapal pemain berubah", ev(pg, "NW.streak.shipStyle()") is not None and ev(pg, "NW.streak.shipStyle().hull") == "#14808c")
        ok("5.7c bonus kapal: hoki ×1,05 hanya saat memancing dari kapal", abs(ev(pg, "NW.streak.shipLuck()") - 1.05) < 1e-9)
        open_panel(pg); pg.screenshot(path=OUT + "04_hari7_kapal.png"); close_panel(pg)
        raw = ev(pg, "localStorage.getItem('nusa-island-v1')")
        ok("5.8 progres streak ikut tersimpan di simpanan (Cloud Save membawanya)", '"streak"' in raw and json.loads(raw)["streak"]["ship"] is True)

        # ===== 6. Putus streak: kembali ke Hari 1, barang aman =====
        next_day(pg)                      # siklus 2 hari 1
        claim_api(pg); next_day(pg); claim_api(pg); next_day(pg); claim_api(pg)   # hari 1,2,3 siklus 2
        next_day(pg, 3)                   # bolos 2 hari kalender
        v = ev(pg, "(()=>{const v=NW.streak.view(); return {lost:v.lost, brokenAt:v.brokenAt, pos:v.claimPos, cycle:v.claimCycle}})()")
        ok("6a status menandai streak putus di Hari 3 → Hari 1 siklus 2", v["lost"] and v["brokenAt"] == 3 and v["pos"] == 1 and v["cycle"] == 2, v)
        open_panel(pg); ok("6b banner streak terputus tampil, barang dinyatakan aman", "Streak terputus di Hari 3" in ev(pg, "document.querySelector('.stk').innerText")); pg.screenshot(path=OUT + "05_putus.png"); close_panel(pg)
        r = claim_api(pg)
        ok("6c klaim setelah putus = siklus 2 Hari 1, kapal tetap dimiliki", r["ok"] and r["cycle"] == 2 and r["pos"] == 1 and S(pg)["streak"]["ship"] is True)

        # ===== 7. Siklus 2 selesai → joran di Hari 14 =====
        for pos in range(2, 8):
            next_day(pg); r = claim_api(pg)
            ok(f"7.{pos} siklus 2 Hari {pos}", r["ok"] and r["cycle"] == 2 and r["pos"] == pos and S(pg)["streak"]["rod"] is (pos == 7))
        ok("7.8 Joran Pelaut Eksklusif: spesifikasi tampilan & bonus kekuatan aktif", ev(pg, "NW.look.rodSpec().name") == "Joran Pelaut Eksklusif" and ev(pg, "NW.streak.rodMul().str") == 1.12 and ev(pg, "NW.look.rodSpec(0).name") == "Joran Bambu Kampung")
        ev(pg, "NW.streak.setEquip('rod', false)")
        ok("7.9 joran bisa dilepas/dipakai lagi tanpa kehilangan kepemilikan", ev(pg, "NW.look.rodSpec().name") == "Joran Bambu Kampung" and S(pg)["streak"]["rod"] is True and ev(pg, "NW.streak.rodMul().cap") == 1)
        ev(pg, "NW.streak.setEquip('rod', true)")

        # ===== 8. Siklus 3+: perabot acak, tanpa duplikat, masuk Rumahku dan bisa dipasang =====
        got = []; viol = []
        for cyc in range(13):
            for pos in range(1, 8):
                next_day(pg); r = claim_api(pg)
                if not r["ok"]: viol.append((cyc, pos, r))
                if pos == 7: got.append(r["fid"])
        ok("8a 13 siklus berturut-turut berjalan tanpa penolakan", not viol, viol[:2])
        ok("8b 13 perabot hadiah semuanya berbeda (tanpa duplikat selama masih ada yang belum dimiliki)", len(set(got)) == 13 and None not in got, got)
        home = S(pg)["home"]; types = [f["type"] for f in home["furniture"] + home["stored"]]
        ok("8c semua perabot hadiah benar-benar ada di inventaris Rumahku (terpasang atau gudang)", all(t in types for t in got), len([t for t in got if t in types]))
        ev(pg, "(()=>{const h=window.__nusa.S.home; for(const f of h.stored.slice()){ const s=NW.HD.findSpot(h,f,2,2); if(s){h.furniture.push(s); h.stored.splice(h.stored.indexOf(f),1);} } })()")
        res = ev(pg, "(()=>{const h=window.__nusa.S.home, bad=[]; for(const f of h.furniture){ if(!NW.HD.FURN[f.type]){bad.push('tipe '+f.type);continue;} const t=h.furniture.filter(x=>x.uid!==f.uid); const c=NW.HD.canPlace(Object.assign({},h,{furniture:t}), f); if(!c.ok) bad.push(f.type+':'+c.why); } return {n:h.furniture.length, stored:h.stored.length, bad}})()")
        ok("8d perabot yang terpasang valid (tidak tabrakan/menutup jalan) & sisanya aman di gudang", not res["bad"], res)
        ok("8e uid perabot unik, tidak ada yang hilang/ganda", ev(pg, "(()=>{const h=window.__nusa.S.home; const u=h.furniture.concat(h.stored).map(f=>f.uid); return new Set(u).size===u.length})()"))
        # gambar: semua 13 jenis tergambar tanpa galat dan menaruh piksel
        draw = ev(pg, """(()=>{ const cv=document.createElement('canvas'); cv.width=240; cv.height=200; const c=cv.getContext('2d'); const out={};
          for(const id of NW.StreakCore.FURN_IDS){ c.clearRect(0,0,240,200); c.save(); c.translate(120,150);
            try{ const f={uid:'t',type:id,x:1,y:1,rot:0}; NW.HOUSE.drawFurniture(c,f,1.3,{replicas:()=>[],fishFor:()=>[],highlight:null}); out[id]=1; }catch(e){ out[id]='ERR '+e.message; }
            c.restore(); const d=c.getImageData(0,0,240,200).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; if(typeof out[id]==='number') out[id]=n; }
          return out; })()""")
        ok("8f ke-13 jenis perabot tergambar (piksel > 0, tanpa galat)", all(isinstance(v, int) and v > 40 for v in draw.values()), draw)
        # setelah semua dimiliki → duplikat sah
        for pos in range(1, 8):
            next_day(pg); r = claim_api(pg)
            if pos == 7: dupe = r
        n_after = len([f for f in S(pg)["home"]["furniture"] + S(pg)["home"]["stored"] if f["type"] == dupe["fid"]])
        ok("8g setelah 13 perabot lengkap, hadiah berikutnya boleh duplikat dan benar-benar menambah 1 salinan", dupe["ok"] and dupe["fid"] in got and n_after == 2, n_after)
        ok("8h tidak ada galat JS selama seluruh alur", not errs, errs[:3])
        ctx.close()

        # ===== 9. Pemulihan & anti-gandakan =====
        ctx, pg, errs = new_page(b, seed=mk(50)); login(pg)
        claim_api(pg); next_day(pg); claim_api(pg)             # hari 2: +3 umpan
        ev(pg, "(()=>{const s=window.__nusa.S; s.money=50; s.streak.bait=0; s.streak.applied=1; window.__nusa.save();})()")   # simpanan 'lebih lama' dimuat
        reload(pg)
        ok("9a simpanan lebih lama: hadiah terakhir (+3 umpan) dipulihkan SEKALI", S(pg)["streak"]["bait"] == 3 and S(pg)["streak"]["applied"] == 2, S(pg)["streak"])
        reload(pg); reload(pg)
        ok("9b reload berulang tidak menggandakan", S(pg)["streak"]["bait"] == 3 and S(pg)["money"] == 50)
        # barang eksklusif disinkronkan dari buku server walau simpanan lokal kehilangannya
        d = doc(pg); d["ship"] = True; ev(pg, "(d)=>localStorage.setItem('__srvdoc', JSON.stringify(d))", d); reload(pg)
        ok("9c kepemilikan kapal dipulihkan dari buku server (idempotent)", S(pg)["streak"]["ship"] is True)
        # umpan hadiah dipakai tiap lemparan
        ev(pg, "(()=>{const s=window.__nusa.S; s.streak.bait=2;})()")
        a = [ev(pg, "NW.streak.useBait()") for _ in range(3)]
        ok("9d umpan hadiah habis-pakai: 2 kali berhasil, ke-3 gagal", a == [True, True, False] and S(pg)["streak"]["bait"] == 0)
        ctx.close()

        # ===== 10. Pergantian hari tepat 00:00 WIB =====
        ctx, pg, errs = new_page(b, seed=mk(50)); login(pg)
        set_now(pg, 1793502000000 + 13 * 3600000 + 59 * 60000 + 59000)   # 23:59:59 WIB
        ev(pg, "NW.streak.refresh(true)"); time.sleep(0.1)
        claim_api(pg)
        set_now(pg, 1793502000000 + 14 * 3600000 + 1000)                  # 00:00:01 WIB hari berikutnya
        ev(pg, "NW.streak.refresh(true)"); time.sleep(0.1)
        r = claim_api(pg)
        ok("10a 23:59:59 klaim, 00:00:01 (WIB) boleh klaim lagi = hari kalender baru", r["ok"] and r["pos"] == 2 and doc(pg)["total"] == 2)
        ctx.close()

        # ===== 11. Cloud Save membawa streak, sinkron tanpa galat =====
        ctx, pg, errs = new_page(b, seed=mk(50)); login(pg)
        claim_api(pg); time.sleep(1.7); ev(pg, "NW.cloud.flush()"); wait_for(pg, "NW.cloud.status==='idle'", 6)
        ok("11a Cloud Save (demo) menerima simpanan berisi S.streak tanpa ditolak", ev(pg, "NW.cloud.status") == "idle" and ev(pg, "NW.cloud.lastError") == "", ev(pg, "NW.cloud.lastError"))
        ctx.close()

        # ===== 12. Layar HP kecil: tidak ada elemen terpotong =====
        ctx, pg, errs = new_page(b, seed=mk(50), vp=(360, 740)); login(pg)
        open_panel(pg); time.sleep(0.2)
        w = ev(pg, "(()=>{const p=document.getElementById('panelBody'); const r=p.getBoundingClientRect(); const over=[...document.querySelectorAll('.stk *')].filter(e=>{const b=e.getBoundingClientRect(); return b.width>0 && (b.right>r.right+1 || b.left<r.left-1) && !e.closest('.stk-pop') && !e.closest('.stk-conf') && !e.classList.contains('stk-shine');}).length; return {over, sw:p.scrollWidth, cw:p.clientWidth}})()")
        ok("12a 360px: tidak ada elemen melebihi lebar panel", w["over"] == 0 and w["sw"] <= w["cw"] + 1, w)
        pg.screenshot(path=OUT + "06_hp_360.png")
        ok("12b tidak ada galat JS", not errs, errs[:3])
        ctx.close()
        b.close()
    fails = [r for r in R if r.startswith("FAIL")]
    print(f"\nStreak browser: {len(R) - len(fails)} lulus, {len(fails)} gagal"); sys.exit(1 if fails else 0)

main()
