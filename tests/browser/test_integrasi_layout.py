"""Uji TATA LETAK lintas fitur (empat ukuran layar: 360×740, 412×915, 740×360, 1280×800), semua flag klien ON, Worker backend ASLI (cabang integrasi).
Tidak boleh saling menimpa: panel Kemudi (judul, tombol, setir, tuas), obrolan (tombol + panel terbuka), indikator pemain (angka server), HUD atas, petunjuk, joystick,
tombol aksi, serta lembar Kedai Bu Indah / panel dapur (Kedai: kasir; Dapur: kompor). Gambar tiap ukuran disimpan di SHOTS.
Butuh NUSA_BACKEND. Jalankan: NUSA_BACKEND=... python3 tests/browser/test_integrasi_layout.py"""
import os, sys, time, json
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import test_integrasi_final as I
from playwright.sync_api import sync_playwright
G, K, TD, KD, ok, ev, wait_for = I.G, I.K, I.TD, I.KD, I.ok, I.ev, I.wait_for
SHOTS = os.environ.get("SHOTS", "/tmp/integrasi-layout/"); os.makedirs(SHOTS, exist_ok=True)
VPS = ((360, 740), (412, 915), (740, 360), (1280, 800))
MEASURE = """([subj, others])=>{
 const vis=e=>{for(let n=e;n&&n!==document.body;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false}return true};
 const R=e=>{const r=e.getBoundingClientRect();return r.width>1&&r.height>1?{l:r.left,t:r.top,r:r.right,b:r.bottom,id:(e.id||e.className||e.tagName).toString().slice(0,26)}:null};
 const leaf=e=>e.children.length===0||e.tagName==='BUTTON';
 const pick=(sels,leafOnly)=>sels.flatMap(q=>[...document.querySelectorAll(q)]).filter(e=>vis(e)&&(!leafOnly||leaf(e))).map(R).filter(Boolean);
 const S=pick(subj,false), O=pick(others,true), hit=[];
 for(const p of S)for(const o of O){if(p.id===o.id)continue;const w=Math.min(p.r,o.r)-Math.max(p.l,o.l),h=Math.min(p.b,o.b)-Math.max(p.t,o.t);if(w>3&&h>3)hit.push(p.id+' x '+o.id)}
 const out=S.filter(p=>p.l<-1||p.t<-1||p.r>innerWidth+1||p.b>innerHeight+1).map(p=>p.id);
 return {n:S.length,hit,out}}"""
def measure(pg, subj, others): return ev(pg, MEASURE, [subj, others])
DOCK = ["#mpDock *"]
HUDS = ["#hud *", "#hint", "#joy", "#actBtn"]

def main():
    br = G["Bridge"]()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            for vp in [v for v in VPS if not os.environ.get('LY_ONLY') or str(v[0]) == os.environ['LY_ONLY']]:
                tag = "%dx%d" % vp
                ctx, A, errs = G["new_page"](b, br, "demo-a", "Budi", vp=vp)
                wait_for(A, "NW.mp.view().online && NW.rombongan && NW.dapurSosial", 20)
                if not ev(A, "!!(NW.mpKota && NW.mpKota.enabled())"): ev(A, "(()=>{if(NW.mpKota){NW.mpKota._st.tried=false;NW.mpKota._gate()}})()"); wait_for(A, "NW.mpKota && NW.mpKota.enabled()", 8)
                I.E["reset_view"](A); G["level_up"](A, 3)       # dapur Rumahku butuh rumah level 3
                # ---- A. kapten Kapal Rombongan: Kemudi + obrolan terbuka + indikator pemain + HUD + joystick
                made = False
                for _ in range(3):
                    KD.tp(A, 37.2, 21.3); time.sleep(1.5)
                    if I.rb["act"](A, "rb:new", 8) and wait_for(A, "!!NW.mp.boatMine()", 8): made = True; break
                wait_for(A, "document.getElementById('kmWheel') && document.getElementById('kmWheel').getBoundingClientRect().width>1", 10); time.sleep(0.8)
                m0 = measure(A, ["#kmTop", ".km-btns", "#kmWheel", "#kmLever"], DOCK + HUDS)
                ok("LY-%s Kemudi (4 bagian, obrolan tertutup) tidak menimpa indikator pemain, tombol obrolan, HUD atas, petunjuk, joystick; di dalam layar" % tag, made and m0["n"] == 4 and not m0["hit"] and not m0["out"], m0)
                ev(A, "document.getElementById('mpChatBtn') && document.getElementById('mpChatBtn').offsetParent && document.getElementById('mpChatBtn').click()"); time.sleep(0.6)
                chat_open = ev(A, "!!document.querySelector('.mp-chat:not(.hidden)')")
                m = measure(A, ["#kmTop", ".km-btns", "#kmWheel", "#kmLever"], DOCK + HUDS + [".mp-chat:not(.hidden) *"])
                A.screenshot(path=SHOTS + "kemudi-chat-%s.png" % tag)
                ok("LY-%s obrolan TERBUKA saat jadi kapten: panel obrolan, Kemudi yang masih tampil, indikator pemain, HUD, joystick tidak saling menimpa" % tag, made and chat_open and m["n"] >= 2 and not m["hit"] and not m["out"], m)
                ev(A, "document.querySelector('.mp-chat:not(.hidden)') && document.getElementById('mpChatBtn').click()"); time.sleep(0.3)
                lv = ev(A, "NW.rombongan.leave()"); wait_for(A, "!NW.mp.boatMine()", 8) or ev(A, "NW.mp.boatLeave()"); wait_for(A, "!NW.mp.boatMine()", 8)
                print("DIAG-LEAVE", lv, ev(A, "[!!NW.mp.boatMine(), NW.rombongan.mine()]"), flush=True)
                # ---- B. Kedai Bu Indah: kasir terbuka + dock
                try:
                    time.sleep(2.0)
                    for _ in range(3):
                        TD["enter_kedai"](A)
                        if ev(A, "!!(NW.room&&NW.room.active)"): break
                        time.sleep(1.5)
                    wait_for(A, "NW.room.active && NW.room.candidates().some(c=>c.id==='k_kasir')", 10); time.sleep(0.6)
                    TD["at_station"](A, "k_kasir"); G["interact"](A); wait_for(A, "!!document.querySelector('#kdSheet')&&!document.getElementById('kdSheet').classList.contains('hidden')", 6); time.sleep(0.6)
                    m2 = measure(A, ["#kdSheet", "#kdChip"], DOCK + ["#hud *"])
                    A.screenshot(path=SHOTS + "kedai-kasir-%s.png" % tag)
                    ok("LY-%s Kedai: lembar kasir tidak menimpa indikator pemain/obrolan/HUD atas dan muat di layar" % tag, m2["n"] >= 1 and not m2["hit"] and not m2["out"], m2)
                    ev(A, "document.querySelector('#kdSheet [data-a=close]') && document.querySelector('#kdSheet [data-a=close]').click()"); time.sleep(0.3)
                    ev(A, "NW.room.exit(NW.world.player)"); wait_for(A, "!NW.room.active", 6); time.sleep(0.8)
                    # ---- C. Dapur Rumahku: panel kompor + workstation
                    ev(A, "NW.home.reset && NW.home.reset()"); time.sleep(0.6)
                    for _ in range(3):
                        try: K["kitchen"](A)
                        except Exception as e0: print("KITCHEN-TRY", repr(e0)[:120], ev(A, "[NW.home.active, NW.home.scene, NW.room.active, NW.room.scene, NW.home.candidates().map(c=>c.id).join(',')]"), flush=True)
                        print("KITCHEN-STATE", ev(A, "[NW.home.active, NW.home.scene, NW.room.active, NW.room.scene, NW.home.candidates().map(c=>c.id).join(','), NW.home.visit&&1]"), flush=True)
                        if ev(A, "!!(NW.room&&NW.room.active)"): break
                        print("KITCHEN-FALLBACK", ev(A, "[!!NW.home.hooks.dapur, document.getElementById('fade').className, !!(NW.dapur&&NW.dapur.serverOn)]"), flush=True)
                        ev(A, "NW.home.hooks.dapur && NW.home.hooks.dapur.enter(NW.world.player)"); time.sleep(1.5)
                        if ev(A, "!!(NW.room&&NW.room.active)"): break
                        ev(A, "NW.home.reset()"); time.sleep(1.5)
                    wait_for(A, "NW.room.active && NW.room.candidates().some(c=>c.id==='d_kompor')", 10); time.sleep(0.6); K["open_station"](A, "d_kompor", "kompor"); time.sleep(0.8)
                    if not ev(A, "!!document.querySelector('#mkSheet:not(.hidden)')"):
                        for _ in range(4):
                            K["at_station"](A, "d_kompor"); time.sleep(0.5); G["interact"](A); time.sleep(1.2)
                            if ev(A, "!!document.querySelector('#mkSheet:not(.hidden)')"): break
                        if not ev(A, "!!document.querySelector('#mkSheet:not(.hidden)')"): ev(A, "NW.dapurMasak && NW.dapurMasak.open('kompor')"); time.sleep(1.0)   # cadangan: interaksi tombol tak memilih target (kemungkinan karena bingkai belum dihitung)
                        print("STATION-STATE", ev(A, "[NW.room.active, NW.room.scene, !!document.getElementById('mkSheet'), (NW.room.candidates().find(c=>c.id==='d_kompor')||{}).x, NW.world.player.x, NW.world.player.y]"), flush=True)
                    m3 = measure(A, ["#mkSheet", "#mkChip"], DOCK + ["#hud *"])
                    A.screenshot(path=SHOTS + "dapur-kompor-%s.png" % tag)
                    ok("LY-%s Dapur: panel memasak tidak menimpa indikator pemain/obrolan/HUD atas dan muat di layar" % tag, m3["n"] >= 1 and not m3["hit"] and not m3["out"], m3)
                    ev(A, "NW.room.active && NW.room.exit && NW.room.exit()")
                except Exception as e:
                    import traceback; traceback.print_exc(); ok("LY-%s EXC kedai/dapur" % tag, False, repr(e)[:200])
                    print("DIAG", ev(A, "[!!NW.room, NW.room&&NW.room.active, NW.room&&NW.room.scene, NW.room&&NW.room.active?NW.room.candidates().map(c=>c.id):null, !!NW.kedaiIndah, NW.home&&NW.home.active, NW.areas.cur.id, !!NW.mp.boatMine(), document.getElementById('fade').className]"), flush=True)
                ok("LY-%s tanpa galat skrip" % tag, not [e for e in errs if "PAGEERR" in e], errs[:2])
                ctx.close()
            b.close()
    finally: br.close()
    f = [r for r in G["R"] if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(G["R"]) - len(f), len(f)))
    for r in f: print(r)
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
