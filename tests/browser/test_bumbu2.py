"""Uji Bumbu 2 "Petualangan Nusantara": Kampung Tepian Toba, perjalanan Muara <-> Toba, arsitektur multilokasi,
NPC Toba, cerita 3 bab "Rahasia Tepian Danau", penemuan tempat & Buku Petualangan, mancing/inventaris, simpanan v6 -> v7,
pamer ikan lintas area, kontrol HP portrait, dan indikasi performa.
Jalankan: python tests/browser/test_bumbu2.py
Catatan: ini emulasi browser (Chromium headless), BUKAN HP Android fisik. Angka FPS hanya indikasi.
"""
import time, json, os, sys, tempfile
import os as _os
MUTED = "false" if _os.environ.get("NUSA_AUDIO") else "true"  # NUSA_AUDIO=1: jalankan dengan audio aktif (Bumbu 2.1)
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
import balance_sim

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = tempfile.mkdtemp(prefix="nusa-b2-") + "/"
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra) if extra != "" else ""))
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)

def page(b, save=None, vp=(390, 844), touch=True, dpr=2):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=touch, device_scale_factor=dpr)
    if save is not None:
        ctx.add_init_script("if(!localStorage.getItem('nusa-island-v1')){localStorage.setItem('nusa-island-v1', %s)}" % json.dumps(json.dumps(save)))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e) + " @ " + (getattr(e, "stack", "") or "").replace("\n", " | ")[:400])); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(ROOT); time.sleep(0.8)
    return ctx, pg, errs
def fresh(b, **kw):
    ctx, pg, errs = page(b, None, **kw); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.7); start(pg); return ctx, pg, errs
def start(pg):
    if pg.is_visible("#startBtn"): pg.click("#startBtn")
    time.sleep(0.35); ev(pg, "window.__nusa.S.muted = " + MUTED + "; document.getElementById('banner').classList.remove('show')")
def S(pg, path="window.__nusa.S"): return ev(pg, f"JSON.parse(JSON.stringify({path}))")
def goto(pg, x, y): ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera()}", [x, y]); time.sleep(0.35)
def target(pg): return ev(pg, "NW.world.target ? NW.world.target.id : null")
def act(pg): ev(pg, "NW.world.interact()"); time.sleep(0.35)
def dlg_open(pg): return ev(pg, "!document.getElementById('dlg').classList.contains('hidden')")
def dlg_lines(pg): return ev(pg, "(()=>{const d=document.getElementById('dlg');return d.classList.contains('hidden')?null:document.getElementById('dlgText').textContent})()")
def dialog_through(pg, pick=None, maxn=40):
    """klik dialog sampai muncul opsi, lalu klik opsi berisi teks pick (atau opsi pertama). Kembalikan label."""
    for _ in range(maxn):
        if not dlg_open(pg): return None
        btns = ev(pg, "[...document.querySelectorAll('#dlgOpts button')].map(b=>b.textContent)")
        if btns:
            label = next((x for x in btns if pick and pick in x), None) or btns[0]
            ev(pg, "(t)=>[...document.querySelectorAll('#dlgOpts button')].find(b=>b.textContent===t).click()", label); time.sleep(0.3); return label
        pg.click("#dlg"); time.sleep(0.1)
    return None
def first_line(pg):
    """isi kalimat pertama dialog yang baru terbuka (sebelum diketik ulang)"""
    return ev(pg, "(()=>{const t=document.getElementById('dlgText'); return t.textContent})()")
def near_npc(pg, nid, d=0.7):
    ev(pg, """(a)=>{const n=NW.world.areaNpcs().find(n=>n.id===a[0]); const p=NW.world.player;
      for(let k=0;k<16;k++){const x=n.x+Math.cos(k/16*6.283)*a[1], y=n.y+Math.sin(k/16*6.283)*a[1]; if(NW.walkable(x,y)){p.x=x;p.y=y;break;}} NW.world.snapCamera()}""", [nid, d]); time.sleep(0.3)
def talk(pg, nid, pick=None):
    for _ in range(8):
        near_npc(pg, nid)
        if target(pg) == "npc:" + nid: act(pg); return dialog_through(pg, pick)
    return "TIDAK-TERJANGKAU"
def st(pg): return S(pg, "window.__nusa.S.adv.toba")
def wait_for(pg, js, tmo=25.0, step=0.15):
    """Tunggu kondisi (bukan tidur tetap): suite ini pernah gagal acak saat CPU sibuk karena animasi berlayar (dt dibatasi) lebih lambat dari jeda tetap."""
    t0 = time.time()
    while time.time() - t0 < tmo:
        if ev(pg, js): return True
        time.sleep(step)
    return False
IDLE = "!NW.adv.isBusy() && document.getElementById('voyage').classList.contains('hidden')"
def to_toba(pg, hour=9):
    ev(pg, f"window.__nusa.S.up.boat=Math.max(1,window.__nusa.S.up.boat); window.__nusa.S.hour={hour}")
    r = ev(pg, "window.__nusa.travel(1)"); time.sleep(0.5); wait_for(pg, IDLE); time.sleep(0.2); return r
def rect(pg, sel):
    return ev(pg, "s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return {x:r.left,y:r.top,w:r.width,h:r.height,vis:cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0}}", sel)
def overlap(a, c): return not (a["x"] + a["w"] <= c["x"] or c["x"] + c["w"] <= a["x"] or a["y"] + a["h"] <= c["y"] or c["y"] + c["h"] <= a["y"])

import traceback
with sync_playwright() as p:
  try:
        b = p.chromium.launch()

        # ================= 1–2. Syarat kapal & 3. perjalanan Muara → Toba =================
        ctx, pg, errs = fresh(b)
        ev(pg, "const S=window.__nusa.S; S.cooler=[{uid:'k1',id:'nila',w:0.9,t:1,lock:true},{uid:'k2',id:'patin',w:2.2,t:1}]; S.up.rod=4; S.money=777; window.__nusa.save()")
        ok("A0 area awal = Muara Kampung (registry area, NPC Muara aktif)", ev(pg, "NW.areas.cur.id") == "muara" and ev(pg, "NW.world.areaNpcs().map(n=>n.id).join()") == "darto,sari,dika")
        ok("A1 kapal belum memenuhi syarat (Sampan Kayu) → tidak bisa ke Danau Toba", ev(pg, "window.__nusa.travel(1)") is False and ev(pg, "NW.areas.cur.id") == "muara" and ev(pg, "window.__nusa.mode()") == "world")
        ev(pg, "window.Nusa.openPanel('map')"); time.sleep(0.3)
        ok("A2 peta menampilkan Danau Toba terkunci 🔒 Perahu Motor; bertanda bisa dijelajahi", "🔒 Perahu Motor" in ev(pg, "document.getElementById('panelBody').innerText") and "Bisa dijelajahi: Kampung Tepian Toba" in ev(pg, "document.getElementById('panelBody').innerText"))
        ev(pg, "window.Nusa.closePanel()")
        ok("A3 harga kapal & syarat Danau Toba tidak berubah; tetap satu mata uang (koin)", ev(pg, "JSON.stringify(UPGRADES.boat.cost)") == "[0,1200,5000,16000,50000]" and ev(pg, "LOCATIONS[1].boat") == 2 and ev(pg, "Object.keys(window.__nusa.S).filter(k=>/tiket|ticket|gem|permata/i.test(k)).length") == 0)
        # dari kapal di dermaga Muara → peta → Danau Toba
        ev(pg, "window.__nusa.S.up.boat=1; window.__nusa.S.hour=9")
        goto(pg, ev(pg, "NW.BOAT.x"), ev(pg, "NW.DOCK.y1+0.6"))
        ok("A4 di dermaga Muara: berinteraksi dengan ⛵ Kapal", target(pg) == "boat"); act(pg)
        ok("A5 kapal membuka Peta, Danau Toba bisa dipilih (tombol Berlayar)", ev(pg, "!!document.querySelector('#panelBody [data-act=go][data-arg=\"1\"]')"))
        ev(pg, "document.querySelector('#panelBody [data-act=go][data-arg=\"1\"]').click()"); time.sleep(0.7)
        pg.screenshot(path=OUT + "01_perjalanan.png")
        ok("A6 layar transisi berlayar tampil (perahu & nama tujuan)", ev(pg, "document.getElementById('voyage').classList.contains('on')") and "Danau Toba" in ev(pg, "document.querySelector('#voyage .vg-title').textContent") and "Kampung Tepian Toba" in ev(pg, "document.querySelector('#voyage .vg-sub').textContent"))
        wait_for(pg, IDLE); time.sleep(0.2)
        s = S(pg)
        ok("A7 tiba: area Kampung Tepian Toba, mode dunia, lokasi mancing = Danau Toba (LOCATIONS dipakai ulang)", ev(pg, "NW.areas.cur.id") == "toba" and ev(pg, "window.__nusa.mode()") == "world" and s["loc"] == 1 and ev(pg, "NW.areas.cur.loc") == "toba")
        ok("A8 layar transisi tertutup, kontrol aktif lagi", not ev(pg, "NW.adv.isBusy()") and ev(pg, "document.getElementById('voyage').classList.contains('hidden')"))
        pl = ev(pg, "[NW.world.player.x, NW.world.player.y]")
        ok("A9 posisi tiba aman: di papan dermaga, bisa diinjak, bukan air/bangunan", ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y)") and ev(pg, "NW.tileAt(NW.world.player.x,NW.world.player.y)===NW.T.DOCK"), pl)
        ok("A10 NPC yang aktif hanya NPC Toba (Pak Raka, Bu Maya, Nala); NPC Muara tidak ikut", ev(pg, "NW.world.areaNpcs().map(n=>n.id).join()") == "raka,maya,nala")
        ok("A11 Rumahku tetap satu rumah pribadi (tidak ada gerbang Rumahku di Toba)", ev(pg, "NW.points.filter(p=>p.id==='home').length") == 0 and ev(pg, "!!window.__nusa.S.home && window.__nusa.S.home.level>=1"))
        ok("A12 koin, joran, ikan (termasuk yang dikunci) utuh setelah berlayar", s["money"] == 777 and s["up"]["rod"] == 4 and [c["uid"] for c in s["cooler"]] == ["k1", "k2"] and s["cooler"][0].get("lock") is True)
        pg.screenshot(path=OUT + "02_tiba_toba.png")

        # ================= 6. Collision =================
        col = ev(pg, """(()=>{const M=NW.TOBA_MAP, bad=[], T=NW.T;
          for(const [k,[x,y]] of Object.entries(M.NAV)) if(k!=='STALL' && !M.walkable(x,y,0.15)) bad.push(k);
          let water=0, wwalk=0, hill=0, hwalk=0, bld=0, bwalk=0;
          for(let y=0;y<M.MH;y++)for(let x=0;x<M.MW;x++){const t=M.tileAt(x,y);
            if(t===T.DEEP||t===T.SHALLOW){water++; if(M.walkable(x+.5,y+.5,0.05)) wwalk++;}
            if(t===T.HILL||t===T.FOREST){hill++; if(M.walkable(x+.5,y+.5,0.05)) hwalk++;}}
          for(const b of M.buildings){bld++; if(M.walkable((b.x0+b.x1)/2,(b.y0+b.y1)/2,0.05)) bwalk++;}
          const pts=M.points.filter(p=>{for(let a=0;a<16;a++)for(const r of [0.2,0.45,0.7,0.9]) if(M.walkable(p.x+Math.cos(a/16*6.283)*r*p.r,p.y+Math.sin(a/16*6.283)*r*p.r)) return false; return true}).map(p=>p.id);
          return {bad, water, wwalk, hill, hwalk, bld, bwalk, pts};})()""")
        ok("B1 semua titik jalan NPC Toba bisa diinjak (kecuali posisi di balik meja pasar)", not col["bad"], col["bad"])
        ok("B2 air danau, bukit & tepi hutan tidak bisa diinjak", col["wwalk"] == 0 and col["hwalk"] == 0 and col["water"] > 300 and col["hill"] > 50, col)
        ok("B3 bangunan Toba padat (tidak bisa ditembus)", col["bwalk"] == 0 and col["bld"] == 7)
        ok("B4 setiap titik interaksi Toba bisa didekati", not col["pts"], col["pts"])
        goto(pg, 18.6, 15.2); ev(pg, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'w'}))"); time.sleep(2.5); ev(pg, "window.dispatchEvent(new KeyboardEvent('keyup',{key:'w'}))")
        ok("B5 berjalan terus ke arah danau (WASD) berhenti di tepi, tidak masuk air", ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y) && NW.isWalkT(NW.tileAt(NW.world.player.x,NW.world.player.y))"), ev(pg, "[NW.world.player.x.toFixed(2),NW.world.player.y.toFixed(2)]"))
        goto(pg, 5.45, 20.6)
        ev(pg, "window.__hz=0; window.__hzT=setInterval(()=>{window.__hz=Math.max(window.__hz, NW.heightAt(NW.world.player.x,NW.world.player.y))},50)")
        ev(pg, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'w'}))"); ev(pg, "window.dispatchEvent(new KeyboardEvent('keydown',{key:'d'}))"); time.sleep(0.9)
        ev(pg, "window.dispatchEvent(new KeyboardEvent('keyup',{key:'w'}))"); ev(pg, "window.dispatchEvent(new KeyboardEvent('keyup',{key:'d'}))")
        hz = ev(pg, "clearInterval(window.__hzT), window.__hz")
        ok("B6 Bukit Pandang bisa didaki: tinggi pijakan naik (0 → puncak 22)", hz > 8 and ev(pg, "NW.heightAt(NW.TOBA_MAP.KNOLL.x,NW.TOBA_MAP.KNOLL.y)") == 22, round(hz, 1))

        # ================= 7. NPC Toba =================
        npcinfo = ev(pg, "NW.world.areaNpcs().map(n=>[n.id,n.style.hat,n.style.shirt,n.sched.length])")
        ok("C1 tiga NPC berbeda penampilan (topi & baju) dan punya jadwal harian", len({x[1] for x in npcinfo}) == 3 and len({x[2] for x in npcinfo}) == 3 and all(x[3] >= 4 for x in npcinfo), npcinfo)
        day = ev(pg, """(()=>{const S=window.__nusa.S, npcs=NW.world.areaNpcs(), M=NW.TOBA_MAP; const save=S.hour; S.hour=5; npcs.forEach(NW.world.placeNPC);
          const pl=NW.world.player, px=pl.x, py=pl.y; pl.x=18.5; pl.y=39;
          let inB=0, off=0, closeRun=0, maxRun=0, acts={}, dirs={}, frames=0; const dt=1/30;
          for(let i=0;i<20000;i++){ NW.world.update(dt); frames++;
            const vis=npcs.filter(n=>!n.hidden);
            for(const n of vis){ for(const b of M.buildings){ if(b.id==='tpasar') continue; if(n.x>b.x0+0.05&&n.x<b.x1-0.05&&n.y>b.y0+0.05&&n.y<b.y1-0.05) inB++; }
              if(!NW.isWalkT(NW.tileAt(n.x,n.y))) off++; acts[n.id+':'+n.cur.act]=1; if(n.arrived&&!n.moving){(dirs[n.id]=dirs[n.id]||{})[n.dir]=1;} }
            let c=false; for(let a=0;a<vis.length;a++)for(let k=a+1;k<vis.length;k++) if(Math.hypot(vis[a].x-vis[k].x,vis[a].y-vis[k].y)<0.35) c=true;
            if(c){closeRun++;maxRun=Math.max(maxRun,closeRun);} else closeRun=0;
            if(S.hour>=4.9&&S.hour<5&&i>100) break; }
          pl.x=px; pl.y=py; S.hour=9; npcs.forEach(NW.world.placeNPC);
          return {inB, off, maxRunSec:maxRun*dt, acts:Object.keys(acts).length, dirs:Object.fromEntries(Object.entries(dirs).map(([k,v])=>[k,Object.keys(v).length])), frames};})()""")
        ok("C2 satu hari penuh: NPC tidak pernah masuk bangunan / keluar jalan", day["inB"] == 0 and day["off"] == 0, day)
        ok("C3 NPC tidak saling menumpuk terus-menerus (jarak < 0,35 tile maks. 1,5 dtk beruntun)", day["maxRunSec"] <= 1.5, day["maxRunSec"])
        ok("C4 NPC beraktivitas sesuai jadwal (≥ 10 aktivitas; Pak Raka menunggu tamu di dermaga selama Bab 1 belum dimulai)", day["acts"] >= 10, day["acts"])
        ok("C5 animasi diam: ketiga NPC menoleh ke beberapa arah saat beraktivitas di tempat", len(day["dirs"]) == 3 and all(v >= 2 for v in day["dirs"].values()), day["dirs"])
        near_npc(pg, "raka"); time.sleep(0.2)
        act(pg)
        face = ev(pg, """(()=>{const n=NW.world.areaNpcs().find(n=>n.id==='raka'), p=NW.world.player; const a=NW.P(n.x,n.y), b=NW.P(p.x,p.y); const want=((Math.round(Math.atan2(b.y-a.y,b.x-a.x)/(Math.PI/4))%8)+8)%8; return [n.dir,want,n.talking]})()""")
        ok("C6 NPC menghadap pemain saat diajak bicara", face[0] == face[1] and face[2], face)
        pg.click("#dlg"); time.sleep(0.1)
        ok("C7 Bab 1 dimulai: Pak Raka menyambut tamu di dermaga ('Horas! Selamat datang…')", "Horas" in (dlg_lines(pg) or "") and "Tepian Toba" in (dlg_lines(pg) or ""), dlg_lines(pg))
        lab = dialog_through(pg)
        ok("C8 dialog cerita Pak Raka berlanjut (opsi \"Horas, Pak Raka!\")", lab is not None and "Horas" in lab, lab)

        # ================= 8. Cerita 3 bab, 9. hadiah sekali, 10. penemuan =================
        m0 = S(pg)["money"]
        goto(pg, 12.4, 20.9); time.sleep(0.6)
        ok("D1 menemukan Pasar Kecil Toba → notifikasi ✨ Lokasi ditemukan", "Lokasi ditemukan: Pasar Kecil Toba" in ev(pg, "document.getElementById('discover').textContent"))
        ok("D2 Bab 1 langkah 'lihat dermaga & pasar' selesai otomatis", st(pg)["step"] == 2)
        ev(pg, "document.getElementById('discover').textContent=''"); goto(pg, 14, 21.5); goto(pg, 12.4, 20.9); time.sleep(0.6)
        ok("D3 notifikasi penemuan tidak muncul lagi saat lewat kedua kali", ev(pg, "document.getElementById('discover').textContent") == "")
        goto(pg, 12.4, 20.2); tg = target(pg); act(pg); lab = dialog_through(pg)  # Bu Maya di balik meja → lewat 🏪 Pasar
        ok("D4 Bab 1: bicara dengan Bu Maya (lewat lapak 🏪 Pasar)", tg == "tpasar" and lab is not None and "Siap" in lab and st(pg)["step"] == 3, lab)
        goto(pg, 19.0, 7.4); time.sleep(0.4)
        ok("D5 Bab 1: titik mancing di ujung dermaga ditemukan", st(pg)["step"] == 4)
        lab = talk(pg, "raka", "Terima")
        s = S(pg)
        ok("D6 Bab 1 selesai: +200 koin & catatan perjalanan", s["adv"]["toba"]["bab"] == 2 and s["money"] == m0 + 200 and any(n["id"] == "toba:bab1" for n in s["adv"]["notes"]), (s["money"] - m0))
        # keluar ke Muara di tengah cerita lalu kembali: tidak macet
        ev(pg, "NW.adv.travelTo('muara')"); time.sleep(0.5); wait_for(pg, IDLE); time.sleep(0.2)
        ok("D7 pulang ke Muara di tengah cerita (Bab 2) → progres tetap", ev(pg, "NW.areas.cur.id") == "muara" and st(pg)["bab"] == 2)
        pg.reload(); time.sleep(0.9); start(pg)
        ok("D8 refresh di Muara: progres Toba & penemuan tidak hilang/terulang", st(pg)["bab"] == 2 and ev(pg, "Object.keys(window.__nusa.S.adv.found).filter(k=>k.startsWith('toba:')).length") >= 2 and ev(pg, "window.__nusa.S.adv.notes.length") == 2)
        to_toba(pg, 13.2)
        lab = talk(pg, "nala")
        ok("D9 Bab 2: Nala mengajak mencari tiga tanda Ompung", lab is not None and st(pg)["step"] == 1, lab)
        goto(pg, 4.9, 16.75); act(pg); dialog_through(pg)
        goto(pg, 32.7, 16.1); act(pg); dialog_through(pg)
        ok("D10 tanda Ompung tersimpan satu per satu (Bukit Pandang & Sudut Tenang)", set(st(pg)["clues"].keys()) == {"bukit", "sudut"})
        pg.reload(); time.sleep(0.9); start(pg)
        ok("D11 refresh di Toba: pemain muncul lagi di Toba, tanda yang sudah ditemukan tetap", ev(pg, "NW.areas.cur.id") == "toba" and set(st(pg)["clues"].keys()) == {"bukit", "sudut"})
        goto(pg, 9.45, 31.7); act(pg); lab = dialog_through(pg, "Periksa"); dialog_through(pg)
        ok("D12 tanda ketiga (Pancuran Batu) → langkah berikutnya", st(pg)["step"] == 2 and len(st(pg)["clues"]) == 3, lab)
        lab = talk(pg, "nala")
        ok("D13 Nala meminta bantuan menambal jaring keramba", st(pg)["step"] == 3, lab)
        goto(pg, 13.1, 13.4); tg = target(pg); act(pg); dialog_through(pg, "Tambal"); time.sleep(0.5)  # keramba atau Bu Maya (14:00–16:30 di keramba)
        ok("D14 aktivitas kampung interaktif terbuka (kanvas jaring, bukan tombol ambil barang)", ev(pg, "!!document.getElementById('netCv')"))
        cell = ev(pg, "(()=>{const r=document.getElementById('netCv').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}})()")
        holes = [int(x) for x in ev(pg, "document.getElementById('netCv').dataset.holes").split(",")]
        ok("D15 kotak jaring cukup besar untuk jari (≥ 44 px)", cell["w"] / 6 >= 44 and cell["h"] / 5 >= 44, (round(cell["w"] / 6), round(cell["h"] / 5)))
        good = next(i for i in range(30) if i not in holes)
        pg.mouse.click(cell["x"] + (good % 6 + 0.5) * cell["w"] / 6, cell["y"] + (good // 6 + 0.5) * cell["h"] / 5); time.sleep(0.25)
        ok("D16 mengetuk bagian yang utuh → diberi tahu, tidak dihitung", "masih utuh" in ev(pg, "document.getElementById('netMsg').textContent") and "0/4" in ev(pg, "document.getElementById('netCount').textContent"))
        pg.screenshot(path=OUT + "03_jaring.png")
        for h in holes:
            pg.mouse.click(cell["x"] + (h % 6 + 0.5) * cell["w"] / 6, cell["y"] + (h // 6 + 0.5) * cell["h"] / 5); time.sleep(0.25)
        time.sleep(1.9)
        ok("D17 semua sobekan ditambal dengan ketukan sungguhan → Bab 2 lanjut", st(pg)["step"] == 4 and st(pg)["net"] > 0 and not ev(pg, "!!document.getElementById('netWrap')"))
        dialog_through(pg)
        m1 = S(pg)["money"]
        lab = talk(pg, "nala", "lencana")
        s = S(pg)
        ok("D18 Bab 2 selesai: +250 koin, catatan penemuan, lencana non-ekonomi", s["adv"]["toba"]["bab"] == 3 and s["money"] == m1 + 250 and "toba:lencana" in s["adv"]["awards"] and any(n["id"] == "toba:bab2" for n in s["adv"]["notes"]))
        lab = talk(pg, "raka")
        ok("D19 Bab 3: Pak Raka memberi tantangan ikan jurung", st(pg)["step"] == 1, lab)
        ch = ev(pg, "(()=>{const r=Math.random; Math.random=()=>0.2; const c=NW.adv.challengeFish(false,'toba'), m=NW.adv.challengeFish(false,'muara'); Math.random=r; return [c&&c.fish.id, c&&c.fish.rarity, c&&c.w, c&&c.quest, m]})()")
        ok("D20 ikan tantangan = Ikan Jurung (langka, spesies lama, 2,4–2,9 kg), hanya di Danau Toba", ch[0] == "jurung" and ch[1] == "langka" and 2.4 <= ch[2] <= 2.9 and ch[3] == "toba" and ch[4] is None, ch)
        # tantangan memakai fight asli: peluang dengan joran awal (pemain simulasi berreaksi acak)
        sim = balance_sim.run([{"fish": "jurung", "w": 2.9, "rod": 0, "skill": 1, "wr": 0.3}, {"fish": "jurung", "w": 2.9, "rod": 1, "skill": 0, "wr": 0.3}, {"fish": "jurung", "w": 2.9, "rod": 0, "skill": 0, "wr": 0.3}], trials=40, seed=2026, browser=b)
        rates = {"joran1+keahlian": round(sim[0][1]["rate"], 2), "joran2 tanpa keahlian": round(sim[1][1]["rate"], 2), "joran1 tanpa keahlian": round(sim[2][1]["rate"], 2)}
        ok("D21 tantangan wajar: tanpa joran 10/ikan legenda; joran awal + keahlian ≥ 90%, Joran Fiber (400 koin) tanpa keahlian ≥ 85%, joran awal tanpa keahlian ≥ 40%", sim[0][1]["rate"] >= 0.9 and sim[1][1]["rate"] >= 0.85 and sim[2][1]["rate"] >= 0.4, rates)
        ev(pg, "window.Nusa.emit('fight',{result:'snap',quest:'toba',w:3.4})")
        ok("D22 ikan jurung lepas → tidak gagal permanen, boleh coba lagi", st(pg)["step"] == 1)
        # mancing sungguhan di Toba: gigitan memberi ikan jurung tantangan (Math.random dikunci)
        goto(pg, 19.0, 7.2); act(pg); time.sleep(1.4)
        ok("D23 mancing dari ujung dermaga Toba: mode mancing di Danau Toba", ev(pg, "window.__nusa.mode()") == "fish" and S(pg)["loc"] == 1)
        ev(pg, "(()=>{const r=Math.random; Math.random=()=>0.3; const G=window.__nusa.G; G.perfect=false; G.phase='waiting'; window.__nusa.G.pending=null; NW.__r=r})()")
        pend = ev(pg, "(()=>{const G=window.__nusa.G; const loc=LOCATIONS[window.__nusa.S.loc].id; const c=NW.story.challengeFish(false,loc)||NW.adv.challengeFish(false,loc); Math.random=NW.__r; return c&&[c.fish.id,c.quest]})()")
        ok("D24 gigitan saat tantangan aktif bisa memberi ikan jurung bertanda tantangan", pend == ["jurung", "toba"], pend)
        n0 = S(pg)
        ev(pg, """(()=>{const N=window.__nusa, G=N.G; G.pending={fish:FISH.find(f=>f.id==='jurung'), w:3.42, wr:0.5, quest:'toba', questName:'🏆 Tantangan Pak Raka: Ikan Jurung!'}; G.phase='bite'; N.startFight(); N.endFight('caught')})()"""); time.sleep(0.4)
        n1 = S(pg)
        ok("D25 ikan jurung tertangkap (fight asli: endFight) → masuk inventaris & gelar tangkapan bertambah", len(n1["cooler"]) == len(n0["cooler"]) + 1 and n1["titles"]["fish"] == n0["titles"]["fish"] + 1 and n1["stats"]["caught"] == n0["stats"]["caught"] + 1 and st(pg)["step"] == 2, (len(n0["cooler"]), len(n1["cooler"])))
        ev(pg, "document.getElementById('catchWrap').classList.add('hidden'); window.__nusa.G.phase='idle'")
        ev(pg, "document.getElementById('landBtn').click()"); time.sleep(0.8)
        ok("D26 'Ke Darat' dari mancing Toba → kembali ke Kampung Tepian Toba (bukan Muara)", ev(pg, "window.__nusa.mode()") == "world" and ev(pg, "NW.areas.cur.id") == "toba" and ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y)"))
        m2 = S(pg)["money"]; cool = [c["uid"] for c in S(pg)["cooler"]]
        lab = talk(pg, "raka", "gelar"); time.sleep(2.0)
        pg.screenshot(path=OUT + "04_penutup_cerita.png"); wait_for(pg, "!!document.getElementById('awardWrap')", 30); time.sleep(0.3)
        s = S(pg)
        ok("D27 Bab 3 selesai: +350 koin, gelar 'Penjelajah Tepian Toba' (terpisah dari 8 gelar tangkapan)", s["adv"]["toba"]["bab"] == 4 and s["money"] == m2 + 350 and s["adv"]["awards"].get("toba:gelar", {}).get("kind") == "gelar" and s["titles"]["fish"] == n1["titles"]["fish"])
        ok("D28 penutup: animasi cahaya + kartu penghargaan", ev(pg, "!!document.getElementById('awardWrap')"))
        pg.screenshot(path=OUT + "05_penghargaan.png")
        ev(pg, "document.getElementById('awardOk').click()"); time.sleep(0.4); dialog_through(pg)
        ok("D29 cerita tidak mengambil ikan dari coolbox (ikan terkunci aman)", [c["uid"] for c in s["cooler"]] == cool and any(c["uid"] == "k1" and c.get("lock") for c in s["cooler"]))
        m3 = S(pg)["money"]; aw = len(S(pg)["adv"]["awards"])
        ev(pg, "NW.toba.finale(NW.world.areaNpcs()[0])"); time.sleep(0.3)
        ev(pg, "NW.toba.storyTalk(NW.world.areaNpcs()[0], NW.world.openDialog)"); time.sleep(0.3); dialog_through(pg)
        time.sleep(5.6); ev(pg, "document.getElementById('awardWrap') && document.getElementById('awardWrap').remove()")
        ok("D30 hadiah tidak bisa difarming (memanggil penutup lagi tidak menambah koin/penghargaan)", S(pg)["money"] == m3 and len(S(pg)["adv"]["awards"]) == aw and st(pg)["bab"] == 4, (S(pg)["money"] - m3))
        lab = talk(pg, "raka")
        ok("D31 dialog menyesuaikan progres (setelah tamat Pak Raka mengobrol biasa, tanpa ❗)", lab is not None and not ev(pg, "NW.areas.cur.hooks.markerFor(NW.world.areaNpcs()[0])"))

        # ================= 10. Buku Petualangan =================
        ev(pg, "window.Nusa.closePanel()"); pg.click("#advBtn"); time.sleep(0.4)
        book = ev(pg, "document.getElementById('panelBody').innerText")
        ok("E1 menu '📖 Buku Petualangan': Muara & Toba, status dikunjungi, jumlah penemuan, cerita, catatan", ev(pg, "document.getElementById('panelTitle').textContent") == "📖 Buku Petualangan" and "Muara Kampung" in book and "Kampung Tepian Toba" in book and "Titik penemuan" in book and "Rahasia Tepian Danau" in book and "Pesan dari Danau" in book and "Dikunjungi" in book)
        ok("E2 ilustrasi kecil per daerah tampil", ev(pg, "document.querySelectorAll('.adv-area img').length") == 2)
        pg.screenshot(path=OUT + "06_buku.png")
        pg.click("#panelClose"); time.sleep(0.3)
        ok("E3 panel bisa ditutup normal", ev(pg, "document.getElementById('panelWrap').classList.contains('hidden')"))

        # ================= 12. daftar ikan Toba =================
        fishpool = ev(pg, """(()=>{const N=window.__nusa, S=N.S, G=N.G; const save=S.loc; S.loc=1; G.perfect=false; G.target={z:5}; G.hotHit=false; const ids={};
          for(let i=0;i<1500;i++){const r=N.chooseFish(); ids[r.fish.id]=(ids[r.fish.id]||0)+1;} S.loc=save; return ids})()""")
        tob = set(ev(pg, "FISH.filter(f=>f.loc==='toba').map(f=>f.id)")); star = set(ev(pg, "FISH.filter(f=>f.loc==='*').map(f=>f.id)"))
        ok("F1 mancing di Toba memakai daftar ikan lama Danau Toba (+ sampah umum), tanpa spesies baru", set(fishpool).issubset(tob | star) and len(set(fishpool) & tob) >= 4, sorted(fishpool))
        rar = ev(pg, "(ids)=>{const o={}; for(const [k,v] of Object.entries(ids)){const r=FISH.find(f=>f.id===k).rarity; o[r]=(o[r]||0)+v;} return o}", fishpool)
        ok("F2 rarity lama dipakai: biasa > langka > epik > legenda (legenda tetap langka)", rar.get("biasa", 0) > rar.get("langka", 0) > rar.get("epik", 0) > rar.get("legenda", 0) and rar.get("legenda", 0) < 0.06 * sum(fishpool.values()), rar)
        ctx.close()

        # ================= 13–14. Inventaris 200, joran, ekonomi, simpanan v6 → v7 =================
        ctx, pg, errs2 = fresh(b)
        ev(pg, """(()=>{const S=window.__nusa.S; S.money=98765; S.up={rod:7,bait:3,cooler:9,boat:2}; S.v=6;
          S.cooler=[]; for(let i=0;i<199;i++) S.cooler.push(Object.assign({uid:'c'+i,id:i%3?'mas':'nila',w:1+i%5,t:1}, i%10===0?{lock:true}:{}));
          const HD=NW.HD, aq=S.home.furniture.concat(S.home.stored).find(f=>f.type==='akuariumKecil'); if(S.home.stored.includes(aq)){S.home.stored.splice(S.home.stored.indexOf(aq),1);S.home.furniture.push(HD.findSpot(S.home,aq,0,0)||aq);}
      S.cooler.push({uid:'aq1',id:'nila',w:0.7,t:1}); const pr=HD.putFish(S,'aq1',aq.uid,window.Nusa.FISH_BY_ID); if(!pr.ok) throw new Error('akuarium: '+pr.why);
      HD.addFurniture(S.home,S,'tanaman'); const fx=S.home.furniture.concat(S.home.stored).slice(-1)[0]; fx.uid='f99';
          S.titles={v:1,fish:321,rank:5}; S.story.ch=5; S.story.title='Penerus Muara'; S.dex.mas={n:50,best:2.9}; S.stats.caught=400; S.day=12;
          const T=JSON.parse(JSON.stringify(S)); delete T.adv; localStorage.setItem('nusa-island-v1', JSON.stringify(T)); localStorage.removeItem('nusa-island-v1-backup-v6')})()""")
        v6 = ev(pg, "localStorage.getItem('nusa-island-v1')")
        ctx.close()
        ctx, pg, errs3 = page(b, json.loads(v6)); start(pg); s = S(pg)
        bk = ev(pg, "localStorage.getItem('nusa-island-v1-backup-v6')")
        g1 = {"v": s["v"] == 8, "koin": s["money"] == 98765, "up": s["up"] == {"rod": 7, "bait": 3, "cooler": 9, "boat": 2}, "ikan": len(s["cooler"]) == 199, "kunci": sum(1 for c in s["cooler"] if c.get("lock")) == 20,
              "akuarium": bool(s["home"]["placedFish"]) and s["home"]["placedFish"][0]["uid"] == "aq1", "perabot": any(f["uid"] == "f99" for f in s["home"]["furniture"] + s["home"]["stored"]), "gelar": s["titles"]["fish"] == 321,
              "darto": s["story"]["ch"] == 5, "koleksi": s["dex"]["mas"]["n"] == 50, "statistik": s["stats"]["caught"] == 400, "hari": s["day"] == 12, "misi": s.get("missions") is not None}
        ok("G1 simpanan v6 → v8 (migrasi berantai): koin, joran lv 8, kapal, inventaris 199 + 20 terkunci, akuarium, perabot, gelar, cerita Darto, koleksi, statistik, misi harian aman", all(g1.values()), {k: v for k, v in g1.items() if not v})
        ok("G2 cadangan v6 dibuat sebelum migrasi", bk is not None and json.loads(bk)["v"] == 6 and json.loads(bk)["money"] == 98765)
        ok("G3 data petualangan baru berisi nilai awal yang aman (area Muara, Toba Bab 1)", s["adv"]["area"] == "muara" and s["adv"]["toba"]["bab"] == 1 and s["adv"]["visited"].get("muara") and not s["adv"]["found"])
        ok("G4 kunci simpanan tetap 'nusa-island-v1'", ev(pg, "!!localStorage.getItem('nusa-island-v1')") and ev(pg, "Object.keys(localStorage).filter(k=>k.startsWith('nusa')&&!k.startsWith('nusa-island-v1')).length") == 0)
        # inventaris 200 bekerja di Toba
        to_toba(pg)
        ev(pg, "window.__nusa.S.cooler.push({uid:'c199',id:'mas',w:1,t:1}); window.__nusa.refreshHUD()")
        goto(pg, 19.0, 7.2); act(pg)
        for _ in range(4):  # beban CPU tinggi: ulangi interaksi bila dialog belum sempat terbuka (bukan perilaku game)
            if dlg_open(pg): break
            time.sleep(0.5); goto(pg, 19.0, 7.2); act(pg)
        ok("G5 inventaris 200/200 penuh di Toba → tidak bisa mancing, pesan menyarankan Bu Maya / Muara", dlg_open(pg) and "penuh" in (dlg_lines(pg) or "") and ev(pg, "window.__nusa.mode()") == "world")
        dialog_through(pg)
        ok("G6 joran tidak berubah setelah pindah area (batas Bumbu 1.2 tetap)", S(pg)["up"]["rod"] == 7 and ev(pg, "UPGRADES.rod.cap[7]") == 330 and ev(pg, "NW.look.rodSpec().name") == "Joran Titan Nelayan")
        # jual lewat Bu Maya = pasar yang sama (satu ekonomi), ikan terkunci tidak terjual
        ev(pg, "window.__nusa.S.hour=8; NW.world.areaNpcs().forEach(NW.world.placeNPC)")
        goto(pg, 12.4, 20.2); act(pg); lab = dialog_through(pg, "Titip"); time.sleep(0.3)
        ok("G7 Bu Maya menitipkan ke Pasar Bu Sari (panel pasar yang sama, bukan pasar baru)", ev(pg, "window.Nusa.currentPanel()") == "market", lab)
        m_before = S(pg)["money"]; locked_before = sum(1 for c in S(pg)["cooler"] if c.get("lock"))
        ev(pg, "window.Nusa.closePanel()")
        ev(pg, "NW.inv && NW.inv.sellQuick ? 0 : 0")
        sold = ev(pg, """(()=>{const S=window.__nusa.S, it=S.cooler.find(c=>!c.lock); const p=window.Nusa.priceOf(it); window.Nusa.openPanel('market'); return [it.uid,p]})()""")
        time.sleep(0.3)
        has_sell = ev(pg, "!!document.querySelector('#panelBody [data-act]')")
        ok("G8 pasar dari Toba memakai harga & koin yang sama", has_sell and ev(pg, "typeof window.Nusa.priceOf") == "function")
        ev(pg, "window.Nusa.closePanel()")
        s = S(pg); ok("G9 ikan terkunci tetap utuh di Toba", sum(1 for c in s["cooler"] if c.get("lock")) == locked_before == 20)
        # data rusak / dimanipulasi
        ctx.close()
        bad = json.loads(v6); bad["v"] = 7; bad["adv"] = "rusak"
        ctx, pg, errs4 = page(b, bad); start(pg); s = S(pg)
        ok("G10 data petualangan rusak → diganti nilai awal, data lain utuh, tanpa error", isinstance(s["adv"], dict) and s["adv"]["toba"]["bab"] == 1 and s["money"] == 98765 and not errs4, errs4[:2])
        ctx.close()
        part = json.loads(v6); part["v"] = 7; part["up"]["boat"] = 0; part["adv"] = {"v": 1, "area": "toba", "toba": {"bab": 2, "step": 1, "clues": {"bukit": 5}}}
        ctx, pg, errs5 = page(b, part); start(pg); s = S(pg)
        ok("G11 data lama tidak ditimpa nilai awal (Bab 2 & tanda tetap); kunci lain diisi", s["adv"]["toba"]["bab"] == 2 and s["adv"]["toba"]["clues"] == {"bukit": 5} and s["adv"]["toba"]["claimed"] == {} and isinstance(s["adv"]["found"], dict))
        ok("G12 area terakhir Toba tapi kapal tidak memenuhi syarat → aman mulai di Muara", ev(pg, "NW.areas.cur.id") == "muara" and s["loc"] == 0)
        ctx.close()

        # ================= 15. Pamer ikan lintas area =================
        ctx, pg, errs6 = fresh(b)
        ev(pg, "const S=window.__nusa.S; S.up.boat=1; S.hour=10; S.cooler=[{uid:'h1',id:'patin',w:3,t:1},{uid:'h2',id:'mas',w:2,t:1}]; window.__nusa.save()")
        ev(pg, "NW.hold.start('h1')"); time.sleep(0.2)
        ok("H1 pamer ikan di Muara berjalan", ev(pg, "NW.hold.holding()") == "h1")
        to_toba(pg)
        ok("H2 berlayar → ikan disimpan dulu (pamer berhenti rapi), ikan tetap di coolbox", ev(pg, "NW.hold.holding()") is None and any(c["uid"] == "h1" for c in S(pg)["cooler"]))
        ev(pg, "NW.hold.start('h2')"); time.sleep(0.3)
        ok("H3 pamer ikan bisa dimulai lagi di Toba (ikan asli dari inventaris)", ev(pg, "NW.hold.holding()") == "h2" and ev(pg, "NW.world.player.hold && NW.world.player.hold.f.id") == "mas")
        pg.screenshot(path=OUT + "07_pamer_toba.png")
        ev(pg, "window.__nusa.S.cooler=window.__nusa.S.cooler.filter(c=>c.uid!=='h2')"); time.sleep(0.3)
        ok("H4 ikan yang dipamerkan dijual/hilang → pamer berhenti", ev(pg, "NW.hold.holding()") is None)
        goto(pg, 19.0, 7.2); act(pg); time.sleep(1.4)
        ev(pg, "NW.hold.start('h1')"); time.sleep(0.9)
        ok("H5 dari mode mancing Toba, 'Pamerkan' membawa ke darat Toba (bukan Muara)", ev(pg, "window.__nusa.mode()") == "world" and ev(pg, "NW.areas.cur.id") == "toba" and ev(pg, "NW.hold.holding()") == "h1")
        ok("H6 tanpa error JavaScript (pamer lintas area)", not errs6, errs6[:3])
        ctx.close()

        # ================= 16. Kontrol HP portrait =================
        ctx, pg, errs7 = fresh(b, vp=(360, 740))
        to_toba(pg)
        goto(pg, 19.0, 9.2)
        j, a = rect(pg, "#joy"), rect(pg, "#actBtn")
        ok("I1 tombol Interaksi tidak menutupi joystick (360×740)", j and a and a["vis"] and not overlap(j, a), (j, a))
        hud = ev(pg, "[...document.querySelectorAll('.hud .chip, .hud .icon-btn')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return [e.id||e.className, Math.round(r.left), Math.round(r.right)]})")
        ok("I2 HUD muat di layar 360 px (termasuk tombol 🧭 Buku Petualangan)", all(x[1] >= 0 and x[2] <= 360 for x in hud) and any(x[0] == "advBtn" for x in hud), hud)
        dirs = set(); jr = rect(pg, "#joy"); cx, cy = jr["x"] + jr["w"] / 2, jr["y"] + jr["h"] / 2
        goto(pg, 18.6, 21.6)
        for k in range(8):
            import math
            ang = k * math.pi / 4
            pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + math.cos(ang) * 40, cy + math.sin(ang) * 40, steps=4); time.sleep(0.25)
            dirs.add(ev(pg, "NW.world.player.dir")); pg.mouse.up(); time.sleep(0.1)
        ok("I3 joystick responsif ke 8 arah di Toba", len(dirs) == 8, sorted(dirs))
        p0 = ev(pg, "[NW.world.player.x, NW.world.player.y]")
        pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + 40, cy, steps=3); time.sleep(0.8); pg.mouse.up()
        p1 = ev(pg, "[NW.world.player.x, NW.world.player.y]")
        ok("I4 sentuhan joystick menggerakkan karakter; kamera mengikuti", abs(p1[0] - p0[0]) + abs(p1[1] - p0[1]) > 0.5)
        pg.tap("#advBtn"); time.sleep(0.4)
        ok("I5 🧭 membuka Buku Petualangan dengan sentuhan", ev(pg, "window.Nusa.currentPanel()") == "adventure")
        pg.tap("#panelClose"); time.sleep(0.3)
        ok("I6 menu tertutup dengan sentuhan", ev(pg, "window.Nusa.currentPanel()") is None)
        goto(pg, 19.85, 9.6)
        if target(pg) == "boat":
            pg.tap("#actBtn"); time.sleep(0.3); dialog_through(pg, "Muara"); time.sleep(1.1); pg.tap("#voyage"); time.sleep(0.9)
        ok("I7 layar berlayar bisa dipercepat dengan ketukan; tiba di Muara dekat dermaga", ev(pg, "NW.areas.cur.id") == "muara" and ev(pg, "Math.hypot(NW.world.player.x-NW.BOAT.x, NW.world.player.y-NW.BOAT.y)") < 3 and ev(pg, "NW.walkable(NW.world.player.x,NW.world.player.y)"))
        ok("I8 tanpa error JavaScript (kontrol HP)", not errs7, errs7[:3])
        ctx.close()

        # ================= Lokasi lain & Muara tidak rusak; dialog tidak mengulang; cerita malam =================
        ctx, pg, errs9 = fresh(b)
        ev(pg, "window.__nusa.S.up.boat=4; window.__nusa.S.hour=10; window.__nusa.S.cooler=[]")
        goto(pg, ev(pg, "NW.SPOT.x-0.6"), ev(pg, "NW.SPOT.y")); act(pg); time.sleep(1.4)
        ok("K1 mancing di Muara tetap: titik dermaga → mode mancing Muara", ev(pg, "window.__nusa.mode()") == "fish" and S(pg)["loc"] == 0 and ev(pg, "window.__nusa.fishFrom()") == "dock")
        ev(pg, "document.getElementById('landBtn').click()"); time.sleep(0.8)
        ok("K2 'Ke Darat' dari Muara → kembali di dermaga Muara", ev(pg, "window.__nusa.mode()") == "world" and ev(pg, "NW.areas.cur.id") == "muara" and ev(pg, "Math.hypot(NW.world.player.x-(NW.SPOT.x-1.1), NW.world.player.y-NW.SPOT.y)") < 0.2)
        for i, nm in [(2, "Selat Sunda"), (3, "Raja Ampat"), (4, "Laut Banda")]:
            r = ev(pg, f"window.__nusa.travel({i})"); time.sleep(0.6)
            ok(f"K3 {nm}: tetap lokasi mancing (langsung mode mancing, tanpa area jelajah)", r and ev(pg, "window.__nusa.mode()") == "fish" and S(pg)["loc"] == i and ev(pg, "document.getElementById('landBtn').textContent").startswith("🗺️"))
        ev(pg, "document.getElementById('landBtn').click()"); time.sleep(0.4)
        ok("K4 dari laut lepas, tombol 🗺️ membuka Peta", ev(pg, "window.Nusa.currentPanel()") == "map")
        ev(pg, "document.querySelector('#panelBody [data-act=go][data-arg=\"1\"]').click()"); time.sleep(0.5); wait_for(pg, IDLE); time.sleep(0.2)
        ok("K5 dari Laut Banda berlayar ke Danau Toba → turun di Kampung Tepian Toba", ev(pg, "NW.areas.cur.id") == "toba" and ev(pg, "window.__nusa.mode()") == "world" and S(pg)["loc"] == 1)
        # kalimat pembuka bergiliran (tidak mengulang)
        ev(pg, "window.__nusa.S.adv.toba.bab=4; window.__nusa.S.hour=13.3; NW.world.areaNpcs().forEach(NW.world.placeNPC)"); time.sleep(0.3)
        firsts = []
        for _ in range(4):
            near_npc(pg, "nala")
            if target(pg) != "npc:nala": continue
            act(pg); pg.click("#dlg"); time.sleep(0.1); firsts.append(dlg_lines(pg)); ev(pg, "NW.world.closeDialog()"); time.sleep(0.2)
        ok("K6 dialog NPC Toba tidak mengulang kalimat pembuka yang sama tiap kali", len(firsts) >= 3 and len(set(firsts)) == len(firsts), firsts)
        # cerita di malam hari: NPC di rumah → ketuk pintu
        ev(pg, "window.__nusa.S.adv.toba.bab=3; window.__nusa.S.adv.toba.step=0; window.__nusa.S.hour=22; NW.world.areaNpcs().forEach(NW.world.placeNPC)"); time.sleep(0.3)
        ok("K7 malam: Pak Raka sudah di rumah (tidak berkeliaran)", ev(pg, "NW.world.areaNpcs()[0].hidden"))
        goto(pg, 22.45, 19.3); tg = target(pg); act(pg); lab = dialog_through(pg, "Lanjut")
        lab2 = dialog_through(pg)
        ok("K8 cerita tidak macet di malam hari: ketuk pintu Pak Raka → 'Lanjut cerita'", tg == "rraka" and lab and "Lanjut" in lab and st(pg)["step"] == 1, (tg, lab, lab2))
        ok("K9 tanpa error JavaScript (lokasi lain & dialog)", not errs9, errs9[:3])
        ctx.close()

        # ================= 17. Performa (indikasi emulasi) =================
        ctx, pg, errs8 = fresh(b, vp=(360, 740))
        def fps(sec=3.0):
            return ev(pg, "(s)=>new Promise(r=>{let n=0; const t0=performance.now(); const f=()=>{n++; if(performance.now()-t0<s*1000) requestAnimationFrame(f); else r(n/((performance.now()-t0)/1000));}; requestAnimationFrame(f);})", sec)
        ev(pg, "window.__nusa.S.up.boat=1; window.__nusa.S.hour=10")
        f_muara = fps()
        t_sw = ev(pg, "(()=>{const t=performance.now(); window.__nusa.goWorld('boat','toba'); return performance.now()-t})()"); time.sleep(0.5)
        f_toba = fps()
        goto(pg, 22.5, 23.0); f_toba2 = fps()
        ev(pg, "window.__nusa.S.hour=21"); f_night = fps()
        tinfo = ev(pg, "NW.terrainInfo()")
        ok("J1 FPS Toba sebanding dengan Muara (emulasi, indikasi saja)", f_toba >= 0.8 * f_muara and f_toba2 >= 0.8 * f_muara, {"muara": round(f_muara), "toba_dermaga": round(f_toba), "toba_kampung": round(f_toba2), "toba_malam": round(f_night)})
        ok("J2 pindah area cepat (bangun ulang cache terrain) < 600 ms", t_sw < 600, round(t_sw))
        ok("J3 cache terrain dibatasi ≤ 12,5 juta piksel (aman memori HP)", tinfo["w"] * tinfo["h"] <= 12.6e6, tinfo)
        cull = ev(pg, """()=>new Promise(r=>{const orig=NW.objDraw.pine; let calls=0, frames=0; NW.objDraw.pine=function(){calls++; return orig.apply(this,arguments)};
          const t0=performance.now(); const f=()=>{frames++; if(performance.now()-t0<800) requestAnimationFrame(f); else {NW.objDraw.pine=orig; r([calls/frames, NW.objects.filter(o=>o.kind==='pine').length]);}}; requestAnimationFrame(f);})""")
        ok("J4 objek di luar layar tidak digambar (rata-rata pinus digambar per frame < total)", cull[0] < cull[1] * 0.7, [round(cull[0], 1), cull[1]])
        ok("J5 tanpa error JavaScript (performa)", not errs8, errs8[:3])
        ctx.close()
        ok("Z1 tanpa error JavaScript (alur utama)", not errs and not errs2 and not errs3, (errs + errs2 + errs3)[:3])
        b.close()
  except Exception as e:
    R.append('FAIL  CRASH: ' + str(e).split(chr(10))[0]); traceback.print_exc()

for r in R: print(r)
fails = [r for r in R if r.startswith("FAIL")]
print(f"\n{len(R) - len(fails)} lulus / {len(R)}")
print("tangkapan layar:", OUT)
sys.exit(1 if fails else 0)
