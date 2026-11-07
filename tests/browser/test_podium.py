"""Uji Podium Juara (leaderboard fisik). Browser sungguhan, mode demo. Server peringkat BELUM ada → data uji disuntik lewat window.__demoLeaderboard
(hanya jalur uji; normalisasi/validasi dijalankan inti produksi). Tidak diuji: server peringkat asli, Android fisik."""
import os, sys, time, json
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_multiplayer.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_multiplayer.py"))}; exec(compile(src, "mp", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, seed, R = ns["ok"], ns["ev"], ns["wait_for"], ns["seed"], ns["R"]
OUT = os.environ.get("SHOTS", "/tmp/nusa-podium/"); os.makedirs(OUT, exist_ok=True)
NOW = int(time.time() * 1000)
LIVE = {"ok": True, "v": 1, "status": "live", "category": "catch", "updatedAt": NOW - 120000,
        "entries": [{"rank": 1, "name": "Budi_Nelayan", "score": 1840}, {"rank": 2, "name": "SariLaut", "score": 1522}, {"rank": 3, "name": "Dika99", "score": 1203},
                    {"rank": 4, "name": "Pak_Darto", "score": 990}, {"rank": 5, "name": "Mawar", "score": 640}], "me": {"rank": 12, "score": 88}}
def page(b, lb=None, login=True, vp=(360, 740)):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = "window.__demoAuto='demo-a';"
    if lb is not None: init += "window.__demoLeaderboard=%s;" % json.dumps(lb)
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1')}" % json.dumps(json.dumps(seed("Budi")))
    ctx.add_init_script(init); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(ns["ROOT"] + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle" if login else "#gateGuest")
    if not login and ev(pg, "!!document.getElementById('gwContinue')"): pg.click("#gwContinue")
    wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    return ctx, pg, errs
def goto_podium(pg):
    ev(pg, "[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Nanti'&&b.offsetParent).forEach(b=>b.click())")
    ev(pg, "(()=>{const p=NW.world.player;p.x=NW.podium.C.x+0.2;p.y=NW.podium.C.y+1.2;NW.world.snapCamera&&NW.world.snapCamera()})()"); time.sleep(0.9)
def txt(pg): return ev(pg, "document.getElementById('lbOv')?document.getElementById('lbOv').innerText:''")

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # A. backend belum ada (demo tanpa route) → placeholder aman, tidak ada peringkat palsu
        ctx, A, e1 = page(b)
        ok("A0 modul podium terpasang di dunia", ev(A, "!!NW.podium && NW.MUARA_MAP.objects.some(o=>o.kind==='podium') && NW.MUARA_MAP.points.some(p=>p.id==='podium')"))
        goto_podium(A); time.sleep(1.2)
        ev(A, "NW.podium.load('catch',true)"); time.sleep(0.6)
        ok("A1 tanpa server: status inactive, 3 slot kosong", ev(A, "(()=>{const d=NW.podium._st.data.catch;return d&&d.status==='inactive'&&d.podium.every(x=>x===null)})()"))
        A.screenshot(path=OUT + "1-podium-belum-aktif.png")
        ev(A, "NW.podium.open()"); time.sleep(0.8); t = txt(A)
        ok("A2 panel: 'Belum ada Juara 1/2/3', tanpa nama palsu", all(f"Belum ada Juara {i}" in t for i in (1, 2, 3)) and "Budi_Nelayan" not in t, t[:120])
        ok("A3 panel muat 360px tanpa geser samping; X ≥44px", ev(A, "(()=>{const s=document.querySelector('.lb-sheet'),x=document.getElementById('lbX').getBoundingClientRect();return s.scrollWidth<=s.clientWidth+1&&x.width>=44&&x.height>=44})()"))
        A.screenshot(path=OUT + "3-panel-belum-aktif.png")
        A.click("#lbX"); time.sleep(0.5); ok("A4 tombol X menutup panel", ev(A, "!NW.podium.isOpen||document.getElementById('lbOv').classList.contains('hidden')"))
        ok("A5 tidak ada error JS", not e1, e1); ctx.close()
        # B. data live dari server → podium berisi 3 teratas
        ctx, B, e2 = page(b, LIVE)
        goto_podium(B); ev(B, "NW.podium.load('catch',true)"); time.sleep(1.0)
        d = ev(B, "NW.podium._st.data.catch")
        ok("B1 live: podium = Juara 1 Budi_Nelayan, 2 SariLaut, 3 Dika99", d["status"] == "live" and [x["name"] for x in d["podium"]] == ["Budi_Nelayan", "SariLaut", "Dika99"], d.get("reason"))
        ok("B2 gelar default terpasang (bisa diubah dari data)", d["podium"][0]["title"] == "Raja Pancing", d["podium"][0].get("title"))
        time.sleep(0.4); B.screenshot(path=OUT + "2-podium-live.png")
        near = ev(B, "(()=>{const h=document.getElementById('actBtn');return h&&!h.classList.contains('hidden')})()")
        ok("B3 dekat podium: tombol interaksi muncul", near)
        if near: B.click("#actBtn"); time.sleep(0.8)
        t = txt(B); ok("B4 tombol interaksi membuka panel peringkat lengkap (top 5 + peringkatku)", "Budi_Nelayan" in t and "Mawar" in t and "#12" in t, t[:100])
        B.screenshot(path=OUT + "4-panel-live.png")
        B.click("[data-tab='species']"); time.sleep(0.6)
        ok("B5 tab Koleksi: respons berkategori lain ditolak (tidak dipakai untuk papan ini)", ev(B, "NW.podium._st.data.species.status")=='inactive', ev(B, "NW.podium._st.data.species.reason"))
        ok("B6 tidak ada error JS", not e2, e2); ctx.close()
        # C. data tidak valid / dimanipulasi → ditolak, tampil placeholder
        bad = [dict(LIVE, entries=[dict(LIVE["entries"][0], name="<b>x</b>")] + LIVE["entries"][1:]),                 # nama invalid
               dict(LIVE, entries=[dict(LIVE["entries"][0], score=-5)] + LIVE["entries"][1:]),                      # skor negatif
               dict(LIVE, entries=[LIVE["entries"][1], LIVE["entries"][0]] + LIVE["entries"][2:]),                  # urutan salah
               dict(LIVE, status="inactive")]
        for i, bd in enumerate(bad):
            ctx, C, ec = page(b, bd); goto_podium(C); ev(C, "NW.podium.load('catch',true)"); time.sleep(0.8)
            ok(f"C{i+1} data tidak valid ditolak → placeholder, bukan peringkat", ev(C, "NW.podium._st.data.catch.status")=="inactive" and ev(C, "NW.podium._st.data.catch.podium.every(x=>x===null)"))
            ctx.close()
        # D. tamu (tanpa login): tidak memanggil server, tampil placeholder
        ctx, D, ed = page(b, LIVE, login=False); goto_podium(D); ev(D, "NW.podium.load('catch',true)"); time.sleep(0.6)
        ok("D1 tamu: tidak ada peringkat, placeholder", ev(D, "NW.podium._st.data.catch.status")=="inactive")
        ev(D, "NW.podium.open()"); time.sleep(0.7); ok("D2 tamu: pesan masuk akun", "Masuk dengan akun Google" in txt(D), txt(D)[:80]); ctx.close()
        # F. kostum asli di podium (butuh PR #40 / NW.avatarDraw; bila belum tergabung, bagian ini DILEWATI — bukan lulus palsu)
        ctx, F, ef = page(b)
        if ev(F, "!!(window.NW && NW.avatarDraw && NW.avatarDraw.F)"):
            codes = ev(F, """(()=>{const F=NW.avatarDraw.F, by=(slot)=>F.ITEMS.filter(i=>i.slot===slot);const one=(slot,k)=>{const it=by(slot)[k];return it?slot+':'+it.id+':0':null};
              const c1=['t','p','c'].map(s=>one(s,0)).filter(Boolean).concat(['s:x:0','r:x:0']).join('|'), c2=[one('t',1),one('p',1),one('h',0),'s:x:1','r:x:1'].filter(Boolean).join('|');return [c1,c2]})()""")
            lb = json.loads(json.dumps(LIVE)); lb["entries"][0]["outfit"] = codes[0]; lb["entries"][1]["outfit"] = codes[1]
            ctx.close(); ctx, F, ef = page(b, lb); goto_podium(F); ev(F, "NW.podium.load('catch',true)"); time.sleep(1.2)
            ok("F1 server mengirim outfit sah → diterima inti klien", ev(F, "NW.podium._st.data.catch.podium[0].outfit") == codes[0], codes)
            ch = ev(F, "(()=>{const c=NW.podium._chars;return {r1:c[1]&&{top:c[1].ch.style.topId,costume:!!c[1].ch.style.costume,code:c[1].ch.style.code},r2:c[2]&&{top:c[2].ch.style.topId,code:c[2].ch.style.code},r3:c[3]&&{code:c[3].ch.style.code||null}}})()")
            ok("F2 Juara 1 memakai kostum asli, Juara 2 memakai baju/celana asli, Juara 3 gaya bawaan", ch["r1"] and ch["r1"]["costume"] and ch["r1"]["code"] == codes[0] and ch["r2"] and ch["r2"]["code"] == codes[1] and ch["r3"] and not ch["r3"]["code"], ch)
            same = ev(F, "(()=>{const a=NW.podium._chars[1].ch;return new Promise(r=>setTimeout(()=>r(a===NW.podium._chars[1].ch),600))})()")
            ok("F3 karakter dibuat sekali (tidak dibuat ulang tiap frame → hemat CPU, animasi kostum jalan)", same)
            F.screenshot(path=OUT + "5-podium-kostum-asli.png"); ok("F4 tidak ada error JS", not ef, ef)
        else: print("SKIP  F kostum asli: NW.avatarDraw (PR #40) belum ada di basis ini")
        ctx.close()
        # E. regresi: ekonomi/save tidak disentuh
        ctx, E, ee = page(b, LIVE); before = ev(E, "JSON.stringify([Nusa.S.money,Nusa.S.stats.caught])"); goto_podium(E); ev(E, "NW.podium.load('catch',true)"); ev(E, "NW.podium.open()"); time.sleep(1)
        ok("E1 membuka podium tidak mengubah uang/statistik", ev(E, "JSON.stringify([Nusa.S.money,Nusa.S.stats.caught])") == before)
        ok("E2 tidak ada error JS", not ee, ee); ctx.close(); b.close()
    f = [r for r in R if r.startswith("FAIL")]; print(f"\n{len(R)-len(f)}/{len(R)} lulus"); sys.exit(1 if f else 0)
main()
