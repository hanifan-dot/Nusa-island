"""Uji Tahap 4.1: menu utama ☰, label nama/gelar, panel chat + bubble. Hanya UI yang terdampak (bukan tes lama).
Jalankan: python tests/browser/test_ui41.py   (Chromium headless = emulasi HP, BUKAN Android fisik)"""
import os, sys, time, json
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_multiplayer.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_multiplayer.py"))}; exec(compile(src, "mp", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, new_page, V, online, start_server, names = ns["ok"], ns["ev"], ns["wait_for"], ns["new_page"], ns["V"], ns["online"], ns["start_server"], ns["names"]
R = ns["R"]; OUT = "/tmp/nusa-ui41/"; os.makedirs(OUT, exist_ok=True)
T0 = 1793502000000
STREAK_FAKE = """
(function(){ const K='__srvdoc'; window.__srvNow=%d; const load=()=>{try{return JSON.parse(localStorage.getItem(K)||'null')}catch(e){return null}};
 window.NUSA_STREAK_STORE={simulated:true,ready:()=>true,uid:()=>'demo-uid-a',async get(){return load()},async claim(next){const v=NW.StreakCore.validateTransition(load(),next,window.__srvNow); if(!v.ok){const e=new Error('x');e.code='permission-denied';throw e;} const d=JSON.parse(JSON.stringify(next)); d.at=window.__srvNow; localStorage.setItem(K,JSON.stringify(d)); return next;}};
 window.__STREAK_NOW=()=>window.__srvNow; })();
""" % T0

def page(b, acc, name, vp=(390, 844), streak=False, port=ns["PORT"], consent=True):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = f"window.__demoAuto='{acc}';window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{port}',token:(uid)=>'dev.'+uid}};"
    if streak: init += STREAK_FAKE
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');%s}" % (json.dumps(json.dumps(ns["seed"](name))), "localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}));" if consent else "")
    ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e))); pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.goto(ns["ROOT"] + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.4)
    return ctx, pg, errs
def rect(pg, sel): return ev(pg, "(s)=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height,r:r.right,b:r.bottom}}", sel)
def vis(pg, sel): return ev(pg, "(s)=>{const e=document.querySelector(s); if(!e) return false; const c=getComputedStyle(e); const r=e.getBoundingClientRect(); return c.display!=='none' && c.visibility!=='hidden' && r.width>0 && r.height>0}", sel)

def main():
    srv = start_server()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            # ===== 1. HUD bersih =====
            ctxA, A, errs = page(b, "demo-a", "Budi", streak=True); wait_for(A, "NW.streak._state.loaded", 8); online(A)
            vis_icons = ev(A, "[...document.querySelectorAll('.hud-right > button')].filter(b=>{const c=getComputedStyle(b);return c.display!=='none'}).map(b=>b.id)")
            ok("1a hanya SATU tombol menu yang terlihat di kanan atas (☰)", vis_icons == ["hudMenuBtn"], vis_icons)
            ok("1b saldo, coolbox, dan waktu tetap di HUD", vis(A, "#money") and vis(A, "#cooler") and vis(A, "#clock"))
            hr = rect(A, ".hud-right"); mb = rect(A, "#hudMenuBtn")
            ok("1c HUD kanan satu baris & tombol ☰ ≥ 36 px (nyaman disentuh)", hr["h"] < 50 and mb["w"] >= 36 and mb["h"] >= 34, (hr["h"], mb["w"], mb["h"]))
            A.screenshot(path=OUT + "01_hud.png")
            # ===== 2. Isi menu & fungsi tiap item =====
            A.click("#hudMenuBtn"); time.sleep(0.25)
            labels = ev(A, "[...document.querySelectorAll('.hm-tile .hm-lb')].map(e=>e.textContent)")
            need = ["Misi Harian", "Hadiah Login 7 Hari", "Keahlian & Cerita", "Kompas & Petualangan", "Koleksi Ikan", "Profil & Akun", "Musik & Suara"]
            ok("2a menu memuat semua fitur lama (Misi, Hadiah Login 7 Hari, Cerita, Kompas, Koleksi, Profil, Musik)", all(n in labels for n in need), labels)
            hm = rect(A, "#hudMenu")
            ok("2b panel menu tidak menutupi seluruh layar (≤ 340 px lebar, ≤ 75% tinggi) & tetap dalam layar", hm["w"] <= 342 and hm["h"] <= 844 * 0.75 and hm["r"] <= 391 and hm["x"] >= 0, hm)
            tmin = ev(A, "Math.min(...[...document.querySelectorAll('.hm-tile')].map(e=>e.getBoundingClientRect().height))")
            ok("2c ubin menu cukup besar untuk jari (≥ 60 px)", tmin >= 60, tmin)
            A.screenshot(path=OUT + "02_menu.png")
            opened = {}
            for lab, panel in [("Misi Harian", "missions"), ("Keahlian & Cerita", None), ("Kompas & Petualangan", None), ("Koleksi Ikan", "dex"), ("Profil & Akun", "profil"), ("Hadiah Login 7 Hari", "streak"), ("Nusa Premium", None)]:
                if not ev(A, "!document.getElementById('hudMenu').classList.contains('hidden')"): A.click("#hudMenuBtn"); time.sleep(0.2)
                ev(A, "(l)=>{[...document.querySelectorAll('.hm-tile')].find(t=>t.querySelector('.hm-lb').textContent===l).click()}", lab); time.sleep(0.35)
                cur = ev(A, "Nusa.currentPanel()"); wrapOpen = ev(A, "!document.getElementById('panelWrap').classList.contains('hidden')")
                sp = ev(A, "(()=>{const e=document.getElementById('spWrap'); return !!e && getComputedStyle(e).display!=='none' && e.getBoundingClientRect().width>0})()")
                if lab == "Nusa Premium": wrapOpen = sp
                opened[lab] = (cur, wrapOpen, ev(A, "document.getElementById('hudMenu').classList.contains('hidden')"))
                if lab == "Nusa Premium" and sp: ev(A, "document.getElementById('spClose').click()"); time.sleep(0.2)
                elif wrapOpen: ev(A, "Nusa.closePanel()"); time.sleep(0.15)
                else: ev(A, "[...document.querySelectorAll('.dlg,.adv-wrap,.book')].forEach(e=>e)")
            ok("2d setiap item (termasuk Nusa Premium) membuka fitur aslinya & menu menutup otomatis", all(v[1] and v[2] for k, v in opened.items() if k in ("Misi Harian", "Koleksi Ikan", "Profil & Akun", "Hadiah Login 7 Hari", "Nusa Premium")) and opened["Hadiah Login 7 Hari"][0] == "streak", opened)
            # item lain (cerita, kompas) memanggil tombol aslinya
            ev(A, "(()=>{window.__clicks=[]; for (const id of ['skillBtn','advBtn','musicBtn','muteBtn']) { const b=document.getElementById(id); if(b) b.addEventListener('click',()=>window.__clicks.push(id)); } return 1})()")
            for lab in ["Keahlian & Cerita", "Kompas & Petualangan", "Musik & Suara"]:
                if not ev(A, "!document.getElementById('hudMenu').classList.contains('hidden')"): A.click("#hudMenuBtn"); time.sleep(0.2)
                ev(A, "(l)=>{[...document.querySelectorAll('.hm-tile')].find(t=>t.querySelector('.hm-lb').textContent===l).click()}", lab); time.sleep(0.3)
                if ev(A, "!document.getElementById('panelWrap').classList.contains('hidden')"): ev(A, "Nusa.closePanel()")
                ev(A, "document.getElementById('audPanel') && document.getElementById('audPanel').classList.add('hidden')")
            ok("2e Keahlian, Kompas, Musik memicu tombol aslinya", set(["skillBtn", "advBtn", "musicBtn"]) <= set(ev(A, "window.__clicks")), ev(A, "window.__clicks"))
            m0 = ev(A, "window.__nusa.S.muted")
            if not ev(A, "!document.getElementById('hudMenu').classList.contains('hidden')"): A.click("#hudMenuBtn"); time.sleep(0.2)
            ev(A, "(()=>{[...document.querySelectorAll('.hm-tile')].find(t=>t.querySelector('.hm-lb').textContent.startsWith('Suara')).click()})()"); time.sleep(0.3)
            ok("2f tombol Suara di menu mengubah mute", ev(A, "window.__nusa.S.muted") != m0)
            # ===== 3. Menutup menu =====
            A.click("#hudMenuBtn"); time.sleep(0.2); A.click("#hmClose"); time.sleep(0.2)
            ok("3a tombol ✕ menutup menu", ev(A, "document.getElementById('hudMenu').classList.contains('hidden')"))
            A.click("#hudMenuBtn"); time.sleep(0.2); p0 = ev(A, "[NW.world.player.x,NW.world.player.y]"); A.mouse.click(60, 700); time.sleep(0.3)
            ok("3b ketuk di luar menu menutupnya dan tidak menggerakkan karakter", ev(A, "document.getElementById('hudMenu').classList.contains('hidden')") and ev(A, "[NW.world.player.x,NW.world.player.y]") == p0)
            A.click("#hudMenuBtn"); time.sleep(0.2); A.keyboard.press("Escape"); time.sleep(0.2)
            ok("3c tombol Esc menutup menu", ev(A, "document.getElementById('hudMenu').classList.contains('hidden')"))

            # ===== 4. Tanda seru jujur =====
            def badge_state():
                return ev(A, "(()=>{const real=[...document.querySelectorAll('.hud-right > button.icon-btn:not(#hudMenuBtn) .badge')].filter(e=>!e.classList.contains('hidden')&&!e.classList.contains('acct-dot')&&e.textContent.trim()!=='0'&&e.textContent.trim()!=='').length; return {real, menu:!document.getElementById('hudMenuBadge').classList.contains('hidden')}})()")
            st = badge_state(); ok("4a tanda seru di ☰ = ada lencana asli yang aktif (tidak palsu)", (st["real"] > 0) == st["menu"], st)
            ev(A, "(()=>{document.querySelectorAll('.hud-right > button .badge').forEach(e=>e.classList.add('hidden')); NW.hudMenu.sync(); return 1})()"); time.sleep(0.3)
            ok("4b semua lencana asli padam → ☰ bersih (tidak ada tanda seru terus-menerus)", badge_state() == {"real": 0, "menu": False}, badge_state())
            # klaim login 7 hari yang nyata (buku server simulasi) → lencana muncul lewat modulnya sendiri
            ev(A, "NW.streak.refresh(true)"); time.sleep(0.5)
            st = badge_state()
            ok("4c hadiah login siap → lencana ☰ muncul dan ubin 'Hadiah Login 7 Hari' bertanda", st["menu"] and ev(A, "[...document.querySelectorAll('.hm-tile')].find(t=>t.querySelector('.hm-lb').textContent==='Hadiah Login 7 Hari').classList.contains('alert')"), st)
            A.screenshot(path=OUT + "03_menu_badge.png")
            A.click("#hudMenuBtn"); time.sleep(0.2); m0 = ev(A, "window.__nusa.S.money")
            ev(A, "[...document.querySelectorAll('.hm-tile')].find(t=>t.querySelector('.hm-lb').textContent==='Hadiah Login 7 Hari').click()"); time.sleep(0.4)
            ev(A, "document.querySelector('[data-act=stkClaim]').click()"); wait_for(A, "!!document.querySelector('.stk-pop')", 6); time.sleep(0.3)
            ok("4d klaim Login 7 Hari lewat menu tetap lewat buku klaim server: +20 koin", ev(A, "window.__nusa.S.money") == m0 + 20 and json.loads(ev(A, "localStorage.getItem('__srvdoc')"))["total"] == 1)
            ev(A, "Nusa.closePanel()"); time.sleep(0.4)
            ok("4e setelah diklaim lencana ☰ padam sendiri (modul streak yang memadamkan)", badge_state()["menu"] is False, badge_state())

            # ===== 5. Label nama & gelar =====
            lab = ev(A, """(()=>{ const out={}; for (const [k,info] of Object.entries({dua:{name:'Budi',title:'Anak Muara'}, satu:{name:'Budi',title:null}, panjang:{name:'WWWWWWWWWWWWWW',title:'Pencari Tangkapan'}})) {
        const cv=document.createElement('canvas'); cv.width=300; cv.height=140; const c=cv.getContext('2d'); NW.look.drawLabel(c,info,150,110,1,0);
        const d=c.getImageData(0,0,300,140).data; let x0=999,x1=-1,y0=999,y1=-1; for(let y=0;y<140;y++)for(let x=0;x<300;x++){ if(d[(y*300+x)*4+3]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
        out[k]={w:x1-x0+1,h:y1-y0+1,bottomGap:110-y1,top:y0}; } return out; })()""")
            ok("5a label dengan gelar: ringkas (≤ 30 px tinggi, ≤ 100 px lebar)", lab["dua"]["h"] <= 30 and lab["dua"]["w"] <= 100, lab["dua"])
            ok("5b label tanpa gelar lebih pendek dari yang bergelar (hierarki dua baris)", lab["satu"]["h"] < lab["dua"]["h"] - 6, (lab["satu"]["h"], lab["dua"]["h"]))
            ok("5c nama sangat panjang & gelar panjang dipotong: lebar tetap ≤ 100 px", lab["panjang"]["w"] <= 100, lab["panjang"])
            ok("5d label berhenti ≥ 3 px di atas kepala (kepala ±56 px dari kaki)", lab["dua"]["bottomGap"] >= 56 + 3, lab["dua"])
            A.screenshot(path=OUT + "04_label.png")
            ctxA.close()

            # ===== 6. Chat bergaya sosial =====
            ctxA, A, errsA = page(b, "demo-a", "Budi"); online(A)
            ctxB, B, errsB = page(b, "demo-b", "Sari"); online(B); time.sleep(0.8)
            ok("6a 💬 tampil hanya saat tersambung; panel awalnya tertutup", vis(A, "#mpChatBtn") and not vis(A, "#mpChat"))
            ev(B, "NW.mp.sendChat('Halo Budi, mancing yuk')"); time.sleep(0.6)
            ok("6b pesan masuk saat panel tertutup → lencana belum dibaca = 1 (nyata)", ev(A, "document.getElementById('mpUnread').textContent") == "1" and vis(A, "#mpUnread"))
            A.click("#mpChatBtn"); time.sleep(0.4)
            pr = rect(A, "#mpChat"); jy = rect(A, "#joy")
            ok("6c panel chat terbuka di kiri atas: dalam layar, tidak menutupi joystick, ≤ 46% tinggi layar", pr and pr["x"] >= 0 and pr["r"] <= 391 and pr["b"] < jy["y"] and pr["h"] <= 844 * 0.46, (pr, jy))
            ok("6d panel semi-transparan (tidak menutupi dunia sepenuhnya)", ev(A, "(()=>{const c=getComputedStyle(document.getElementById('mpChat')).backgroundColor.match(/[\\d.]+/g); return +c[3]<0.9})()"))
            ok("6e riwayat menampilkan nama pengirim + pesan; lencana hilang saat dibuka", "Sari" in ev(A, "document.getElementById('mpHist').innerText") and "Halo Budi" in ev(A, "document.getElementById('mpHist').innerText") and not vis(A, "#mpUnread"))
            ok("6f kolom ketik & tombol Kirim ≥ 44 px", rect(A, "#mpInput")["h"] >= 44 and rect(A, "#mpChat .mp-send")["h"] >= 44)
            A.screenshot(path=OUT + "05_chat_panel.png")
            # keyboard Android: viewport menyusut saat input fokus → dunia tidak ditata ulang; setelah tutup → rapi
            c0 = ev(A, "[document.getElementById('game').width, document.getElementById('game').height]")
            A.click("#mpInput"); time.sleep(0.2); A.set_viewport_size({"width": 390, "height": 500}); time.sleep(0.5)
            c1 = ev(A, "[document.getElementById('game').width, document.getElementById('game').height]")
            ok("6g keyboard muncul (tinggi layar menyusut): kanvas game TIDAK diubah ukurannya & panel chat tetap terlihat", c1 == c0 and rect(A, "#mpChat")["b"] <= 500, (c0, c1))
            A.fill("#mpInput", "Hai"); A.press("#mpInput", "Enter"); time.sleep(0.3)
            A.set_viewport_size({"width": 390, "height": 844}); time.sleep(0.6)
            c2 = ev(A, "[document.getElementById('game').width, document.getElementById('game').height]")
            ok("6h keyboard menutup: kanvas rapi kembali, joystick tidak macet, typing=false", c2 == c0 and ev(A, "NW.mp.typing") is False and not ev(A, "document.body.classList.contains('mp-typing')"), (c0, c2))
            # bubble
            ok("6i 'Hai' tampil sebagai bubble di atas karakter pengirim (di layar A dan B)", ev(A, "!!NW.mp._R.self.bubble") and ev(B, "[...NW.mp._R.players.values()].some(p=>p.bubble && p.bubble.text==='Hai')"))
            ev(B, "(()=>{window.__ft=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t,x,y){ if(t==='Hai') window.__ft.push([x,y]); return o.apply(this,arguments)}; return 1})()")
            A.keyboard.down("ArrowRight"); time.sleep(0.9); A.keyboard.up("ArrowRight"); time.sleep(0.2)
            ft = ev(B, "window.__ft"); xs = [f[0] for f in ft]
            ok("6j bubble mengikuti pergerakan karakter (posisi layar berubah saat A berjalan)", len(xs) > 5 and max(xs) - min(xs) > 8, (len(xs), (max(xs) - min(xs)) if xs else 0))
            B.screenshot(path=OUT + "06_bubble_B.png")
            time.sleep(4.5)
            ok("6k bubble hilang otomatis setelah beberapa detik; riwayat tetap ada", ev(B, "[...NW.mp._R.players.values()].every(p=>!p.bubble)") and any(l["text"] == "Hai" for l in V(B)["log"]))
            long = "Ini pesan yang sangat panjang sekali untuk menguji pemotongan bubble tetapi tetap lengkap di panel obrolan ya"
            ev(A, "(t)=>NW.mp.sendChat(t)", long); time.sleep(0.6)
            bt = ev(B, "[...NW.mp._R.players.values()].map(p=>p.bubble&&p.bubble.text)[0]"); full = V(B)["log"][-1]["text"]
            lines_drawn = ev(B, "1")
            ok("6l pesan panjang: panel menyimpan utuh (≤ 80 huruf, disaring server)", full.startswith("Ini pesan yang sangat panjang") and len(full) > 56, len(full))
            ev(B, "(()=>{window.__bl=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t,x,y){ if(typeof t==='string' && t.length>2 && /pesan|menguji|…/.test(t)) window.__bl.push(t); return o.apply(this,arguments)}; return 1})()"); time.sleep(0.5)
            drawn = " ".join(set(ev(B, "window.__bl")))
            ok("6m bubble memotong pesan panjang dengan '…' (maks ~56 huruf) tanpa memenuhi layar", "…" in drawn and len(drawn) < 70, drawn)
            B.screenshot(path=OUT + "07_bubble_panjang.png")
            # filter & spam tetap
            ev(A, "NW.mp.sendChat('dasar anjing')"); time.sleep(0.5)
            ok("6n filter kata kasar tetap bekerja di panel", "anjing" not in " ".join(l["text"] for l in V(B)["log"][-3:]))
            for i in range(8): ev(A, "NW.mp.sendChat('s%d')" % i)
            time.sleep(0.5)
            ok("6o pembatasan spam server tetap bekerja (pesan sistem muncul di panel A)", any(l["name"] == "Sistem" for l in V(A)["log"]))
            # emoji + dua bubble berdekatan tidak menumpuk
            ev(A, "NW.mp.sendEmote(0)"); time.sleep(0.3)
            ok("6p emoji cepat berfungsi dari panel", ev(B, "[...NW.mp._R.players.values()].some(p=>p.emote&&p.emote.i===0)"))
            ok("6q tidak ada galat JS", not (errs or errsA or errsB), (errs + errsA + errsB)[:3])
            # layar sempit 360
            ctxC, C, errsC = page(b, "demo-owner", "Dika", vp=(360, 640)); online(C)
            C.click("#mpChatBtn"); time.sleep(0.3); pr = rect(C, "#mpChat"); jy = rect(C, "#joy")
            ok("6r layar 360×640: panel chat tidak menutupi joystick & tetap dalam layar", pr["r"] <= 361 and pr["b"] < jy["y"] and pr["b"] < 640, (pr, jy))
            C.click("#hudMenuBtn"); time.sleep(0.2); hm = rect(C, "#hudMenu")
            ok("6s layar 360×640: menu utama muat tanpa melebihi layar", hm["r"] <= 361 and hm["b"] <= 640, hm)
            C.screenshot(path=OUT + "08_360.png")
            b.close()
    finally:
        try: srv.terminate()
        except Exception: pass
    fails = [r for r in R if r.startswith("FAIL")]
    print(f"\nUI 4.1: {len(R) - len(fails)} lulus, {len(fails)} gagal"); sys.exit(1 if fails else 0)
main()
