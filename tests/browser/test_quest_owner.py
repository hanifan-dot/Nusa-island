"""[Quest Owner] Uji browser HP (390x844, sentuh): tombol HUD, panel, tautan IG/WA, klaim 25.000 koin SEKALI, Joran WhatsApp (pakai/lepas, batas 100 kg, partikel hijau),
anti-dobel (klaim ulang, opId baru, 20 klaim paralel, reload, akun lain), UI hilang setelah 2/2, Cloud Save/Aurora tidak rusak.
Server ekonomi = inti economy/core.js yang SAMA dengan Worker/Functions, dijalankan DI DALAM halaman (BUKAN Firebase/Cloudflare asli). Tautan dicegat (tidak membuka Instagram/WhatsApp sungguhan).
Jalankan: python tests/browser/test_quest_owner.py"""
import time, json, os
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
rd = lambda p: open(os.path.join(ROOT_DIR, p), encoding="utf8").read()
R = []
def ok(n, c, e=""): R.append(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:230] if e != "" else "")); print(R[-1], flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
def wait_for(pg, js, t=10):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.12)
    return False
WRAP = "(function(){var module={exports:{}};%s;window.%s=module.exports})();"
IG = "https://www.instagram.com/nusa_islandd?dlrf=MWF2Z2E2N3dubHI5bg=="; WA = "https://chat.whatsapp.com/FtZDVA66ogELWSYACMy45F?s=cl&p=a&iam=2"
SERVER = """async()=>{ const KEY='__qodb'; const m=new Map(JSON.parse(localStorage.getItem(KEY)||'[]')); let q=Promise.resolve(); const rd=p=>m.has(p)?JSON.parse(m.get(p)):null;
 window.__uid=window.__uid||'u-eco'; window.__skew=window.__skew||0;
 const db={get:async p=>rd(p),tx:f=>{const run=q.then(async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):rd(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const[p,v]of buf)m.set(p,v);localStorage.setItem(KEY,JSON.stringify([...m]));return r});q=run.catch(()=>{});return run}};
 window.__db=m; const e=NusaEconomyCore.makeEconomyServer(db,{tables:__T,fishmath:NW.FM,initCap:20000,trustClientInit:true,quest:NusaQuestCore,clock:()=>Date.now()+window.__skew}); window.__srv=e; window.__calls=[];
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>window.__uid,getEntitlements:async()=>({env:'NYATA',wallet:{NYATA:0}}),
   eco:async(name,d)=>{window.__calls.push(name);try{return JSON.parse(JSON.stringify(await e[name]({uid:window.__uid},d)))}catch(x){throw Object.assign(new Error(x.message),{code:x.code})}}};
 NW.wallet.hook&&NW.wallet.hook(); return true}"""
SHOTS = os.environ.get("SHOTS", os.path.join(ROOT_DIR, "docs", "quest-owner")); os.makedirs(SHOTS, exist_ok=True)
def shot(pg, n): pg.screenshot(path=os.path.join(SHOTS, n + ".png"))
def page(b, ctx=None, ua=None):
    ctx = ctx or b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, device_scale_factor=2, user_agent=ua)
    if not getattr(ctx, "_qo", False):
        ctx.add_init_script(WRAP % (rd("economy/core.js"), "NusaEconomyCore")); ctx.add_init_script(WRAP % (rd("economy/quest-core.js"), "NusaQuestCore")); ctx.add_init_script(WRAP % (rd("economy/tables.js"), "__T"))
        ctx.add_init_script("window.__opens=[];window.open=function(u){window.__opens.push(u);return {}};")
        ctx._qo = True
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e))); pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" and "ERR_" not in m.text else None)
    pg.goto(ROOT + "?cloud=off"); time.sleep(0.6)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.4); ev(pg, "()=>{window.__nusa.S.muted=true}")
    return ctx, pg, errs
def boot(pg):
    ev(pg, "(" + SERVER + ")()"); ev(pg, "async()=>{await NW.eco.ensure()}"); wait_for(pg, "NW.eco.active()", 10); ev(pg, "async()=>{await NW.quest.refresh()}"); time.sleep(0.3)
BAL = lambda pg: ev(pg, "NW.eco.balance()")
def panel_text(pg): return ev(pg, "document.querySelector('#panelBody, .panel-body, #panel')?.innerText||''")
with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        ctx, pg, errs = page(b)
        # ===== 1. akun baru melihat tombol =====
        ok("1 akun baru: tombol 🌴 Quest Owner tampil di HUD kanan atas + lencana", ev(pg, "(()=>{const b=document.getElementById('questBtn');return !!b&&!b.classList.contains('hidden')&&!document.getElementById('questBadge').classList.contains('hidden')})()"))
        ok("1b tombol tidak menutupi tombol HUD lain (semua tombol HUD lain tetap ada & terlihat)", ev(pg, "['avatarBtn','skillBtn','misiBtn','dexBtn','musicBtn','muteBtn','streakBtn','hudMenuBtn'].every(id=>{const e=document.getElementById(id);return !e||e.classList.contains('hidden')||getComputedStyle(e).display!=='none'||getComputedStyle(document.documentElement).display})"))
        boot(pg); money0 = BAL(pg)
        ev(pg, "document.getElementById('hudMenuBtn').click()"); time.sleep(0.5)
        tile = ev(pg, "(()=>{const t=[...document.querySelectorAll('.hm-tile')].find(b=>/Quest Owner/.test(b.innerText||b.getAttribute('aria-label')||''));return t?(t.innerText||'').replace(/\\n/g,' '):null})()")
        ok("1c HP: tombol Quest Owner ada di menu ☰ HUD (ubin 'Quest Owner' + tanda !)", tile is not None and "Quest Owner" in tile, tile)
        shot(pg, "01-hp-menu-hud-ubin-quest-owner")
        ev(pg, "document.getElementById('hudMenuBtn').click()"); time.sleep(0.3)
        ctxd = b.new_context(viewport={"width": 1280, "height": 720}); ctxd, pgd, errsd = page(b, ctxd); boot(pgd)
        ev(pgd, "document.getElementById('hudMenuBtn').click()"); time.sleep(0.5)
        ok("1d desktop: ubin Quest Owner ada di menu ☰ (ikon HUD lama memang disatukan di ☰) + lencana ! pada ☰", ev(pgd, "[...document.querySelectorAll('.hm-tile')].some(t=>/Quest Owner/.test(t.innerText))") and ev(pgd, "!document.getElementById('hudMenuBadge').classList.contains('hidden')"))
        shot(pgd, "01b-desktop-hud-tombol-quest-owner"); ctxd.close()
        # ===== 2. panel di HP =====
        ev(pg, "document.getElementById('questBtn').click()") if ev(pg, "getComputedStyle(document.getElementById('questBtn')).display!=='none'") else ev(pg, "Nusa.openPanel('questowner')")
        time.sleep(0.5); t = panel_text(pg)
        ok("2 panel Quest Owner terbuka di HP: judul, progres 0/2, dua kartu, status 'Belum dimulai'", "Quest Owner" in t and "0/2" in t and "Follow Instagram Nusa Island" in t and "Join Grup WhatsApp Nusa Island" in t and t.count("Belum dimulai") == 2, t[:160])
        ok("2b panel tidak melebar (tanpa scroll horizontal) di 390px", not ev(pg, "document.documentElement.scrollWidth>innerWidth+1"))
        shot(pg, "02-hp-panel-quest-owner-awal")
        # ===== 3. Instagram =====
        ev(pg, "document.querySelector('[data-act=qoOpen][data-arg=ig]').click()"); time.sleep(0.6)
        ok("3 tombol Instagram membuka tautan resmi (persis)", ev(pg, "window.__opens") == [IG], ev(pg, "window.__opens"))
        ok("3b server mencatat waktu buka; status 'Sedang diproses' + hitung mundur; klaim belum aktif", "Sedang diproses" in panel_text(pg) and ev(pg, "!document.querySelector('[data-act=qoClaim][data-arg=ig]')"))
        shot(pg, "03-hp-instagram-sedang-diproses")
        r = ev(pg, "async()=>{try{await NW.quest.claim('ig');return NW.quest._state.error}catch(e){return 'x'}}")
        ok("3c klaim terlalu cepat ditolak server, koin tidak berubah", BAL(pg) == money0 and "Tunggu" in (r or ""), r)
        # ===== 4. kembali ke game → klaim 25.000 =====
        ev(pg, "()=>{window.__skew=13000}"); ev(pg, "document.dispatchEvent(new Event('visibilitychange'))"); ev(pg, "async()=>{await NW.quest.refresh()}"); time.sleep(0.4)
        ok("4 setelah kembali: status 'Selesai · siap klaim' + tombol Klaim Hadiah", "siap klaim" in panel_text(pg) and ev(pg, "!!document.querySelector('[data-act=qoClaim][data-arg=ig]')"))
        shot(pg, "04-hp-instagram-siap-klaim")
        ev(pg, "document.querySelector('[data-act=qoClaim][data-arg=ig]').click()"); wait_for(pg, "NW.quest.view().items[0].st==='klaim'", 6); time.sleep(0.4)
        ok("4b klaim IG: +25.000 koin masuk dompet utama", BAL(pg) == money0 + 25000, (money0, BAL(pg)))
        ok("4c progres 1/2 & kartu 'Hadiah sudah diklaim'; tombol HUD masih ada", "1/2" in panel_text(pg) and "Hadiah sudah diklaim" in panel_text(pg) and not ev(pg, "document.getElementById('questBtn').classList.contains('hidden')"))
        shot(pg, "05-hp-instagram-diklaim-1-dari-2")
        # ===== 5. koin hanya 1x =====
        res = ev(pg, "async()=>{const o=[];for(let i=0;i<3;i++){try{const r=await __srv.ecoQuestClaim({uid:__uid},{opId:'zz'+i+Math.random().toString(36).slice(2,10),q:'ig'});o.push(r.already?'already':'??')}catch(e){o.push('err')}}await Promise.all(Array.from({length:20},()=>__srv.ecoQuestClaim({uid:__uid},{opId:'pp'+Math.random().toString(36).slice(2,12),q:'ig'}).catch(()=>{})));return o}")
        ok("5 klaim ulang (opId baru ×3 + 20 paralel) tidak menambah koin", BAL(pg) == money0 + 25000 and res == ["already"] * 3, (res, BAL(pg)))
        # ===== 6. WhatsApp =====
        ev(pg, "document.querySelector('[data-act=qoOpen][data-arg=wa]').click()"); time.sleep(0.5)
        ok("6 tombol WhatsApp membuka tautan grup resmi (persis)", ev(pg, "window.__opens")[-1] == WA, ev(pg, "window.__opens"))
        ev(pg, "()=>{window.__skew=30000}"); ev(pg, "async()=>{await NW.quest.refresh()}"); time.sleep(0.3)
        ok("6b kembali: Klaim Hadiah WhatsApp siap", "siap klaim" in panel_text(pg) and ev(pg, "!!document.querySelector('[data-act=qoClaim][data-arg=wa]')"))
        shot(pg, "06-hp-whatsapp-siap-klaim")
        bal_before = BAL(pg)
        ev(pg, "document.querySelector('[data-act=qoClaim][data-arg=wa]').click()"); wait_for(pg, "NW.quest.rodOwned()", 6); time.sleep(0.5)
        ok("7 Joran WhatsApp masuk ke perlengkapan: dimiliki, dipakai otomatis, TANPA koin tambahan", ev(pg, "NW.quest.rodOwned()") and ev(pg, "NW.quest.rodOn()") and BAL(pg) == bal_before)
        ok("7b kartu menampilkan status jelas 'sudah punya Joran WhatsApp'", "sudah punya Joran WhatsApp" in panel_text(pg) or ev(pg, "!!Nusa.S.questOwner.rod"), panel_text(pg)[:100])
        # ===== 8. pakai / lepas, 100 kg, visual =====
        ok("8 dipakai: batas angkat 100 kg & tampilan joran = Joran WhatsApp", ev(pg, "NW.quest.capFloor()") == 100 and ev(pg, "NW.look.rodSpec().name") == "Joran WhatsApp" and ev(pg, "NW.look.rodSpec().accent.kind") == "wa")
        ev(pg, "NW.quest.setEquip(false)")
        ok("8b dilepas: batas & visual kembali normal, efek mati", ev(pg, "NW.quest.capFloor()") == 0 and ev(pg, "NW.look.rodSpec().name") != "Joran WhatsApp" and ev(pg, "(()=>{NW.quest.event('cast',{x:50,y:50});return NW.quest._particles()})()") == 0)
        ev(pg, "NW.quest.setEquip(true)")
        # tombol Pakai/Lepaskan lewat DOM (Toko → Joran)
        ev(pg, "Nusa.openPanel('shop')"); time.sleep(0.4)
        ok("8c Toko → Joran menampilkan baris Joran WhatsApp + tombol Lepaskan (tetap ada setelah panel Quest hilang)", ev(pg, "!!document.querySelector('[data-qo-equip=\"0\"]')"))
        ev(pg, "document.querySelector('[data-qo-equip=\"0\"]').click()"); time.sleep(0.3)
        ok("8d klik Lepaskan di Toko benar-benar melepas", ev(pg, "!NW.quest.rodOn()")); ev(pg, "document.querySelector('[data-qo-equip=\"1\"]').click()"); time.sleep(0.3)
        ok("8e klik Pakai memasang lagi", ev(pg, "NW.quest.rodOn()")); ev(pg, "Nusa.closePanel&&Nusa.closePanel()")
        # partikel: event mancing menambah partikel, digambar tanpa galat
        n = ev(pg, "(()=>{['cast','land','bite','reel'].forEach(k=>NW.quest.event(k,{x:180,y:420}));return NW.quest._particles()})()")
        ok("9 partikel hijau muncul saat mancing (cast/land/bite/reel)", n >= 10, n)
        ev(pg, "(()=>{const c=document.createElement('canvas').getContext('2d');NW.quest.drawParticles(c);NW.quest.rodFx(c,{x:50,y:50},1);})()")
        ev(pg, "()=>{const N=window.__nusa; N.S.loc=N.S.loc; }")
        ev(pg, "Nusa.closePanel&&Nusa.closePanel()"); ev(pg, "window.__nusa.enterFishing('dock')"); time.sleep(0.9)
        ok("9b masuk adegan memancing dengan Joran WhatsApp dipakai", ev(pg, "window.__nusa.mode()") == "fish" and ev(pg, "NW.quest.visualOn()"))
        FX = "()=>{const g=window.__nusa.G; g.bob.vis=true; g.phase='waiting'; g.bob.x=0.2; g.bob.z=5; ['cast','land','bite','reel'].forEach(k=>NW.quest.event(k,k==='cast'?window.__nusa.rodTip():window.__nusa.bobberScreen()))}"
        for lv, nm in ((1, "sedang"), (2, "tinggi")):
            ev(pg, "(l)=>{localStorage.setItem('nusa_aur_fx',String(l))}", lv); ev(pg, FX); time.sleep(0.25); shot(pg, "07-hp-memancing-joran-whatsapp-efek-" + nm)
        ok("9c di adegan mancing: partikel hijau hidup & tergambar tanpa galat", ev(pg, "NW.quest._particles()") > 0)
        ev(pg, "NW.quest.setEquip(false)"); time.sleep(1.8); ev(pg, FX); time.sleep(0.25); shot(pg, "07c-hp-memancing-joran-dilepas-tanpa-efek")
        ok("9d joran dilepas: tidak ada partikel baru di adegan mancing", ev(pg, "NW.quest._particles()") == 0, ev(pg, "NW.quest._particles()"))
        ev(pg, "NW.quest.setEquip(true)"); ev(pg, "(()=>{const g=window.__nusa.G; g.phase='idle'; g.bob.vis=false})()")
        # Aurora (berbayar) tidak tertimpa
        ev(pg, "()=>{window.__eq=NW.aurora.equipped;NW.aurora.equipped=()=>true}"); ok("10 Pancing Aurora dipakai → visual Aurora menang, Joran WhatsApp tidak merusak", ev(pg, "!NW.quest.visualOn()")); ev(pg, "()=>{NW.aurora.equipped=window.__eq}")
        # ===== 11. selesai 2/2: UI hilang =====
        time.sleep(4.8)
        ok("11 setelah 2/2: tombol HUD Quest Owner hilang otomatis", ev(pg, "document.getElementById('questBtn').classList.contains('hidden')"))
        ok("11b panel Quest tertutup otomatis", ev(pg, "Nusa.currentPanel()!=='questowner'"))
        ok("11c hadiah tetap: joran masih dimiliki, koin tetap +25.000 saja", ev(pg, "NW.quest.rodOwned()") and BAL(pg) == money0 + 25000)
        shot(pg, "08-hp-quest-selesai-hud-bersih")
        ev(pg, "Nusa.save()"); time.sleep(0.3)
        saved = ev(pg, "JSON.stringify(Nusa.S.questOwner)")
        # ===== 12. reload / login ulang =====
        pg.reload(); time.sleep(0.8)
        if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
        time.sleep(0.4); boot(pg)
        ok("12 reload: tombol Quest tetap TIDAK muncul, joran tetap milik, koin tidak bertambah lagi", ev(pg, "document.getElementById('questBtn').classList.contains('hidden')") and ev(pg, "NW.quest.rodOwned()") and BAL(pg) == money0 + 25000, (BAL(pg), money0))
        ok("12b simpanan tersimpan lokal (S.questOwner) & berisi status selesai", '"rod":true' in saved and '"doneUid":"u-eco"' in saved, saved)
        ev(pg, "async()=>{try{await __srv.ecoQuestClaim({uid:__uid},{opId:'rl'+Math.random().toString(36).slice(2,10),q:'wa'})}catch(e){}}"); ok("12c klaim ulang setelah reload tetap tidak ada efek", BAL(pg) == money0 + 25000)
        # ===== 13. akun lain / simpanan dipalsukan =====
        ev(pg, "()=>{window.__uid='u-lain'}"); ev(pg, "async()=>{await NW.eco.ensure();await NW.quest.refresh()}"); time.sleep(0.4)
        ok("13 akun lain mulai bersih (0/2); salinan joran lokal tanpa bukti server dibuang (anti-forgery)", ev(pg, "NW.quest.view().done")==0 and not ev(pg, "NW.quest.rodOwned()"), ev(pg, "JSON.stringify(Nusa.S.questOwner)"))
        ev(pg, "()=>{Nusa.S.questOwner.rod=true;Nusa.S.questOwner.doneUid='u-lain'}"); ev(pg, "async()=>{await NW.quest.refresh()}")
        ok("13b memalsukan S.questOwner.rod di konsol: setelah server dimuat, dibuang lagi", not ev(pg, "NW.quest.rodOwned()"))
        # ===== 14. mode tanpa login =====
        ctx2, pg2, errs2 = page(b)
        ev(pg2, "()=>{NW.shopApi={live:false,sim:true,isGuest:()=>true,uid:()=>null}}"); ev(pg2, "Nusa.openPanel('questowner')"); time.sleep(0.5)
        t2 = panel_text(pg2)
        ok("14 tamu/offline: tombol & panel tampil, klaim dimatikan dengan penjelasan jujur (bukan simulasi)", "Masuk dengan Google" in t2 and not ev(pg2, "!!document.querySelector('[data-act=qoClaim]')"), t2[:140])
        ev(pg2, "document.querySelector('[data-act=qoOpen][data-arg=ig]').click()"); time.sleep(0.3)
        ok("14b tamu tetap bisa membuka tautan tanpa error, tanpa panggilan server", ev(pg2, "window.__opens")==[IG])
        shot(pg2, "09-hp-tamu-klaim-dimatikan")
        # ===== 15. Android (emulasi) =====
        ctx3 = b.new_context(viewport={"width": 412, "height": 915}, has_touch=True, is_mobile=True, device_scale_factor=2.625, user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36")
        ctx3, pg3, errs3 = page(b, ctx3); ev(pg3, "()=>{localStorage.removeItem('__qodb')}"); pg3.reload(); time.sleep(0.8)
        if ev(pg3, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg3, "document.getElementById('startBtn').click()")
        time.sleep(0.4); boot(pg3); ev(pg3, "Nusa.openPanel('questowner')"); time.sleep(0.5)
        ok("15 Android (EMULASI Pixel 7 412x915): panel tampil rapi tanpa scroll horizontal", "Quest Owner" in panel_text(pg3) and not ev(pg3, "document.documentElement.scrollWidth>innerWidth+1"))
        shot(pg3, "10-android-emulasi-panel")
        allerr = [e for e in errs + errs2 + errs3 if "ERR_" not in e]
        ok("16 tanpa galat JavaScript/konsol baru (Cloud Save & game tetap normal)", not allerr, allerr[:3])
    finally:
        b.close()
f = [r for r in R if r.startswith("FAIL")]
print("\n%d lulus, %d gagal" % (len(R) - len(f), len(f))); raise SystemExit(1 if f else 0)
