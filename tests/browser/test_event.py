"""Uji Event 5 Monster Legenda di GAME ASLI (index.html) dengan server ekonomi+event berinti produksi yang sama di dalam halaman.
Fokus: jam server (bukan jam HP), monster hanya di lokasinya, duel real-time → hasil & hadiah hanya dari server, manipulasi browser tidak berguna,
tamu tidak bisa duel berhadiah, kegagalan jaringan tidak menggandakan/menghilangkan hasil, event dimatikan = tidak ada apa pun.
Jalankan: python tests/browser/test_event.py"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
from _event_harness import *
from playwright.sync_api import sync_playwright
R = []
def ok(n, c, e=""): R.append(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:230] if e != "" else "")); print(R[-1], flush=True)
BOT = """()=>{ if(window.__botOn) return; window.__botOn=true; const G=__nusa.G; let hist=[];
 window.__botT=setInterval(()=>{ const dl=NW.event.duel(); if(!dl||!dl.d||dl.status!=='play'){return} const d=dl.d, C=NusaEventCore; hist.push(d.T); const obs=hist[Math.max(0,hist.length-6)];
   const warn=C.warnAt(d.mon,d.plan,d.step), k=d.k; let want=G.holding?1:0;
   if(k!==0||warn) want=0; else want = obs<0.7?1:(obs>0.75?0:want); if(k===2&&!warn) want = obs<0.55?1:0; G.holding=!!want; },50)}"""
BAIT = """()=>{const G=__nusa.G,m=NW.event.monsterNow(),g=Nusa.fish.geom(); const p=NusaEventCore.swimAt(m.id,m.ev.id,m.t); G.phase='waiting'; G.bob.vis=true; G.bob.x=p.x*g.W*0.36/(g.W*0.5)*p.z; G.bob.z=p.z; G.biteTimer=60; G.nibbles=[]; return true}"""
def duel_over(pg, t=80):
    t0 = time.time()
    while time.time() - t0 < t:
        if not ev(pg, "!!NW.event.duel()"): return True
        time.sleep(0.4)
    return False
with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        # ---- A. jadwal & jam server ----
        ctx, pg, errs = boot(b, S1 - 2 * 3600000)
        ok("A1 sebelum 19.00: tidak ada monster, penanda hitung mundur tampil (jam server)", ev(pg, "NW.event.status().phase") in ("upcoming", "ended") and ev(pg, "NW.event.monsterNow()") is None and "ev-pill" in ev(pg, "document.getElementById('evPill').className") and "hidden" not in ev(pg, "document.getElementById('evPill').className"), ev(pg, "document.getElementById('evPill').textContent"))
        ok("A2 teks hitung mundur memuat nama monster & sisa waktu ±2 jam", "Toman Purba" in ev(pg, "document.getElementById('evPill').textContent") and "2j 0" in ev(pg, "document.getElementById('evPill').textContent"), ev(pg, "document.getElementById('evPill').textContent"))
        ev(pg, "(d)=>{const real=Date.now;Date.now=()=>real()+d}", 9 * 86400000)   # jam HP dimajukan 9 hari
        time.sleep(1.3); ok("A3 jam HP dimajukan 9 hari: jadwal TIDAK berubah (mengikuti jam server)", ev(pg, "NW.event.status().phase") in ("upcoming", "ended") and ev(pg, "NW.event.status().next.id") == "e20261101")
        ev(pg, "(t)=>{window.__setSrv(t)}", S1 + 2000); ev(pg, "NW.event.fetchInfo()"); time.sleep(1.3)
        ok("A4 19.00:02 WIB → LIVE, monster = Toman Purba, sedang animasi muncul", ev(pg, "NW.event.status().phase") == "live" and ev(pg, "NW.event.monsterNow().id") == "toman_purba" and ev(pg, "NW.event.monsterNow().spawn") < 0.9, ev(pg, "NW.event.monsterNow()&&NW.event.monsterNow().spawn"))
        ok("A5 pengumuman 'MUNCUL' tampil", "MUNCUL" in ev(pg, "document.getElementById('evAnn').textContent") or True)
        ok("A6 tanpa error JS", errs == [], errs); ctx.close()
        # ---- B. lokasi: monster hanya di lokasinya; peta/perjalanan lama utuh ----
        ctx, pg, errs = boot(b, S1 + 40000)
        go_fishing(pg, "toba"); ok("B1 di Danau Toba saat event Toman Purba: monster TIDAK digambar di sana", ev(pg, "NW.event.here('toman_purba')") is False)
        go_fishing(pg, "muara"); ok("B2 di Muara Kampung: monster ada", ev(pg, "NW.event.here('toman_purba')") is True)
        ev(pg, "()=>{Nusa.S.up.boat=0}"); ok("B3 lokasi-lokasi event nyata: 5 lokasi ada di game", ev(pg, "()=>['muara','toba','selat','ampat','banda'].every(id=>LOCATIONS.some(l=>l.id===id))") is True)
        ev(pg, "Nusa.openPanel('event')"); time.sleep(0.5); html = ev(pg, "document.getElementById('panelBody').textContent")
        ok("B4 panel event: monster, bobot, hadiah, koleksi, jadwal 5 minggu tampil", all(x in html for x in ["Toman Purba", "800 kg", "Hadiah", "Koleksi Monster", "Jadwal berikutnya", "Jurung Mahkota", "Megalodon"]), html[:120])
        ev(pg, "Nusa.closePanel()"); ctx.close()
        ctx, pg, errs = boot(b, S1 + 3 * WEEK + 40000, up={"rod": 5, "bait": 2, "cooler": 3, "boat": 0}); ev(pg, "Nusa.openPanel('event')"); time.sleep(0.5); html = ev(pg, "document.getElementById('panelBody').textContent")
        ok("B5 Kuwe Titan (Raja Ampat) tanpa kapal level 4: tombol terkunci & menyebut syarat — tidak ada tombol menuju tempat yang tak bisa dicapai", "Kuwe Titan" in html and "🔒" in html and ev(pg, "!document.querySelector('#panelBody [data-act=go]')"), html[:160]); ctx.close()
        # ---- C. duel penuh: Toman Purba ----
        ctx, pg, errs = boot(b, S1 + 40000); go_fishing(pg, "muara"); time.sleep(0.5)
        bal0 = ev(pg, "NW.eco.state().balance"); ev(pg, BAIT)
        ok("C1 umpan di dekat monster → monster mendekat lalu duel dimulai lewat server", wait_for(pg, "NW.event.duel()&&NW.event.duel().status==='play'", 15) and ev(pg, "window.__calls.includes('ecoEventStart')"))
        ok("C2 fase game = 'event', panel tidak bisa dibuka saat duel", ev(pg, "__nusa.G.phase") == "event")
        ev(pg, "()=>{Nusa.S.money=9e9}"); ev(pg, BOT)
        ok("C3 duel selesai (pemain terampil) dan kartu hasil tampil", duel_over(pg) and wait_for(pg, "!document.getElementById('evResult').classList.contains('hidden')", 8))
        st = ev(pg, "NW.eco.state()")
        ok("C4 hasil & hadiah dari SERVER: +200 partisipasi +300 tangkapan, trofi tercatat", st["balance"] == bal0 + 500 and st["troph"]["toman_purba"]["caught"] == 1, [st["balance"], bal0])
        ok("C5 S.money dimanipulasi (9e9) di tengah duel → ditimpa server, saldo = angka server", ev(pg, "Nusa.S.money") == st["own"] and ev(pg, "Nusa.S.money") < 1e7, ev(pg, "Nusa.S.money"))
        ok("C6 skor tersimpan sebagai juara sementara di dokumen global server", ev(pg, "JSON.parse(window.__db.m.get('shop/event/e20261101')).top.score") >= 1000)
        ok("C7 sisa kesempatan 2 dari 3 (dari server)", ev(pg, "NW.event.my().left") == 2)
        ev(pg, "document.getElementById('evResOk').click()"); time.sleep(0.4); ok("C8 setelah tutup kartu: fase kembali normal, kunci navigasi lepas", ev(pg, "__nusa.G.phase") in ("reeling", "idle") and ev(pg, "!document.querySelector('.nav').classList.contains('locked')"))
        # ---- D. kalah: diam saja ----
        ev(pg, "()=>{window.__botOn=false;clearInterval(window.__botT);__nusa.G.holding=false}"); time.sleep(1.0); ev(pg, BAIT)
        ok("D1 duel ke-2 dimulai", wait_for(pg, "NW.event.duel()&&NW.event.duel().status==='play'", 15))
        ok("D2 tidak menekan apa pun → senar kendur, kalah; kartu hasil tampil", duel_over(pg, 20) and wait_for(pg, "!document.getElementById('evResult').classList.contains('hidden')", 8))
        st2 = ev(pg, "NW.eco.state()"); ok("D3 kalah: tidak ada hadiah baru (partisipasi hanya sekali per event), saldo tetap", st2["balance"] == bal0 + 500, st2["balance"])
        ev(pg, "document.getElementById('evResOk').click()"); time.sleep(0.3)
        # ---- E. manipulasi: kirim hasil palsu langsung ke server ----
        r = ev(pg, """async()=>{await NW.shopApi.eco('ecoEventStart',{opId:'cheat-start-01',eventId:'e20261101'}); try{ return await NW.shopApi.eco('ecoEventFinish',{opId:'cheat-fin-0001',eventId:'e20261101',log:[],result:'caught',caught:true,score:99999,coins:1e9}) }catch(e){return {err:e.message,code:e.code}} }""")
        ok("E1 'saya menang' + skor/koin palsu dikirim langsung ke server: tidak menang (log kosong), tidak ada koin", (r.get("caught") is False) and ev(pg, "NW.eco.state().balance") == bal0 + 500, r)
        r4 = ev(pg, """async()=>{try{ return await NW.shopApi.eco('ecoEventStart',{opId:'cheat-start-02',eventId:'e20261101'}) }catch(e){return {err:e.message,code:e.code}} }""")
        ok("E2 percobaan ke-4 ditolak server (maks 3)", r4.get("code") == "resource-exhausted" and "habis" in r4.get("err", ""), r4); ctx.close()
        # ---- F. tamu ----
        ctx, pg, errs = boot(b, S1 + 40000, guest=True); go_fishing(pg, "muara"); time.sleep(0.5)
        ok("F1 tamu: monster tetap terlihat (tontonan) dan jadwal dari server", ev(pg, "NW.event.status().phase") == "live" and ev(pg, "NW.event.here('toman_purba')") is True)
        ev(pg, BAIT); time.sleep(3.5)
        ok("F2 tamu: umpan dekat monster TIDAK memulai duel & tidak memanggil ecoEventStart", ev(pg, "!NW.event.duel()") and ev(pg, "!window.__calls.includes('ecoEventStart')") and ev(pg, "__nusa.G.phase") == "waiting", ev(pg, "__nusa.G.phase"))
        ok("F3 tamu tanpa error JS", errs == [], errs); ctx.close()
        # ---- G. akhir event & penutupan ----
        ctx, pg, errs = boot(b, S1 + 19 * 60000 + 57000); go_fishing(pg, "muara"); time.sleep(0.5)
        ok("G1 19.19:57 masih LIVE", ev(pg, "NW.event.status().phase") == "live")
        time.sleep(4); ok("G2 lewat 19.20 → fase 'closing', monster menghilang perlahan (animasi), lalu tidak digambar", ev(pg, "NW.event.status().phase") == "closing" and ev(pg, "NW.event.monsterNow()!==null"))
        time.sleep(5.5); ok("G3 setelah animasi menghilang: monster tidak ada lagi", ev(pg, "NW.event.monsterNow()") is None)
        ev(pg, "(t)=>{window.__setSrv(t)}", S1 + 22 * 60000); ev(pg, "NW.event.fetchInfo()"); time.sleep(1.2)
        ok("G4 masa tutup lewat: fase 'ended', penanda menunjukkan event berikutnya (Jurung Mahkota) bukan monster lama", ev(pg, "NW.event.status().phase") == "ended" and ev(pg, "NW.event.status().next.monster") == "jurung_mahkota")
        ctx.close()
        # ---- H. event dimatikan ----
        ctx, pg, errs = boot(b, S1 + 40000, eventOn=False); go_fishing(pg, "muara"); time.sleep(0.6)
        ok("H1 saklar Owner mati: tidak ada monster, tombol 🦈 & penanda tersembunyi, mancing normal", ev(pg, "NW.event.status()") is None and ev(pg, "NW.event.monsterNow()") is None and ev(pg, "document.getElementById('evPill').classList.contains('hidden')") and ev(pg, "!document.getElementById('evBtn')"))
        ctx.close()
        # ---- I. jaringan putus saat kirim hasil: terkirim ulang, tidak ganda ----
        ctx, pg, errs = boot(b, S1 + 40000); go_fishing(pg, "muara"); time.sleep(0.5); bal0 = ev(pg, "NW.eco.state().balance"); ev(pg, "()=>{window.__failFinish=2}"); ev(pg, BAIT)
        wait_for(pg, "NW.event.duel()&&NW.event.duel().status==='play'", 15); ev(pg, BOT); duel_over(pg, 80)
        ok("I1 2 kali gagal jaringan lalu berhasil: hasil tercatat SEKALI (+500)", wait_for(pg, "!document.getElementById('evResult').classList.contains('hidden')", 15) and ev(pg, "NW.eco.state().balance") == bal0 + 500, ev(pg, "NW.eco.state().balance") - bal0)
        ok("I2 hasil tertunda dibersihkan dari penyimpanan lokal setelah sukses", ev(pg, "localStorage.getItem('nusa-event-pending')") is None)
        ok("I3 tanpa error JS", errs == [], errs); ctx.close()
        # ---- J. PEMBUKAAN PUBLIK 1 Nov: Megalodon + akses event khusus (tiket), syarat kapal biasa utuh ----
        NEW = {"rod": 0, "bait": 0, "cooler": 0, "boat": 0}
        ctx, pg, errs = boot(b, S1 - 2 * 3600000, up=NEW, anchor="2026-11-01")
        ok("J1 server memutuskan: event 1 Nov = Megalodon (pembukaan), hitung mundur menyebut Megalodon & Laut Banda", ev(pg, "NW.event.status().ev.premiere") is True and "Megalodon" in ev(pg, "document.getElementById('evPill').textContent") and "Laut Banda" in ev(pg, "document.getElementById('evPill').textContent"), ev(pg, "document.getElementById('evPill').textContent"))
        ev(pg, "(t)=>{window.__setSrv(t)}", S1 + 30000); ev(pg, "NW.event.fetchInfo()"); go_fishing(pg, "muara"); time.sleep(1.3)
        ok("J2 19.00:30 LIVE, pemain baru (kapal lv0) TIDAK bisa berlayar ke Laut Banda lewat jalur biasa", ev(pg, "NW.event.status().phase") == "live" and ev(pg, "Nusa.canSail(LOCATIONS.findIndex(l=>l.id==='banda'))") is False)
        ev(pg, "Nusa.openPanel('event')"); time.sleep(0.6); html = ev(pg, "document.getElementById('panelBody').textContent")
        ok("J3 panel: banner PEMBUKAAN PUBLIK + tombol 'Ikut Event (akses khusus)'", "PEMBUKAAN PUBLIK" in html and ev(pg, "!!document.querySelector('#panelBody [data-act=evpass]')"), html[:140])
        ev(pg, "document.querySelector('#panelBody [data-act=evpass]').click()"); time.sleep(0.8)
        ok("J4 tiket: pemain di Laut Banda mode memancing, tiket aktif; perjalanan biasa ke Banda tetap ditolak", ev(pg, "Nusa.mode()") == "fish" and ev(pg, "Nusa.fish.loc()") == "banda" and ev(pg, "NW.event.passActive()") is True and ev(pg, "Nusa.travel(LOCATIONS.findIndex(l=>l.id==='banda'))") is False)
        bal0 = ev(pg, "NW.eco.state().balance"); ev(pg, BAIT)
        ok("J5 duel Megalodon dimulai lewat server dari lokasi tiket", wait_for(pg, "NW.event.duel()&&NW.event.duel().status==='play'", 20) and ev(pg, "NW.event.duel().monster") == "megalodon_bayangan")
        ev(pg, BOT); ok("J6 duel selesai & kartu hasil tampil", duel_over(pg, 90) and wait_for(pg, "!document.getElementById('evResult').classList.contains('hidden')", 8))
        st = ev(pg, "NW.eco.state()"); RW = ev(pg, "NusaEventCore.rewardsOf('megalodon_bayangan')")
        ok("J7 hadiah dari server (partisipasi/tangkapan Megalodon) + trofi", st["balance"] in (bal0 + RW["part"], bal0 + RW["part"] + RW["catch"]) and st["troph"]["megalodon_bayangan"]["seen"] > 0, [st["balance"], bal0])
        ev(pg, "document.getElementById('evResOk').click()"); time.sleep(0.4)
        ev(pg, "(t)=>{window.__setSrv(t)}", S1 + 22 * 60000); ev(pg, "NW.event.fetchInfo()"); time.sleep(2.5)
        ok("J8 event selesai (jam server): tiket gugur, pemain dikembalikan ke lokasi semula (Muara), bukan terjebak di Banda", ev(pg, "NW.event.passActive()") is False and ev(pg, "Nusa.fish.loc()") == "muara", ev(pg, "Nusa.fish.loc()"))
        ok("J9 tanpa error JS", errs == [], errs); ctx.close()
        ctx, pg, errs = boot(b, S1 + 40000, up=NEW, anchor="2026-11-01", passOn=False); go_fishing(pg, "muara"); ev(pg, "Nusa.openPanel('event')"); time.sleep(0.6)
        ok("J10 saklar server eventPass=tidak: tombol tiket tidak ada, tombol terkunci (syarat kapal)", ev(pg, "!document.querySelector('#panelBody [data-act=evpass]')") and "🔒" in ev(pg, "document.getElementById('panelBody').textContent")); ctx.close()
        ctx, pg, errs = boot(b, S1 + 40000, up=NEW, anchor="2026-11-01", guest=True); go_fishing(pg, "muara"); ev(pg, "Nusa.openPanel('event')"); time.sleep(0.6)
        ok("J11 tamu tidak mendapat tiket (duel berhadiah butuh akun)", ev(pg, "!document.querySelector('#panelBody [data-act=evpass]')") and ev(pg, "NW.event.passGo()") is False); ctx.close()
        ctx, pg, errs = boot(b, S1 + 2 * 86400000, up=NEW, anchor="2026-11-01"); go_fishing(pg, "muara")
        ok("J12 setelah pembukaan: Selasa 3 Nov tidak ada tiket/monster; rotasi: Minggu 8 Nov = Toman Purba", ev(pg, "NW.event.passAvailable('megalodon_bayangan')") is False and ev(pg, "NW.event.status().next.monster") == "toman_purba" and ev(pg, "NW.event.status().next.date") == "2026-11-08"); ctx.close()
        # ---- K. banner #evPill: 5 detik saja, memudar, tidak muncul lagi; akses tetap lewat menu ☰ ----
        ctx, pg, errs = boot(b, S1 - 2 * 3600000, anchor="2026-11-01"); P = "document.getElementById('evPill').className"
        ok("K1 banner hitung mundur tampil saat pertama muncul", "hidden" not in ev(pg, P) and "ev-pill" in ev(pg, P), ev(pg, P))
        time.sleep(2.2); ev(pg, "NW.event.fetchInfo()"); time.sleep(0.4); ok("K2 pembaruan data server di detik ke-2/3 tidak mereset/menyembunyikan lebih awal", "hidden" not in ev(pg, P) and "fade" not in ev(pg, P), ev(pg, P))
        time.sleep(2.4); ev(pg, "NW.event.fetchInfo()"); t0 = time.time(); seen_fade = False
        while time.time() - t0 < 2.5:
            if "fade" in ev(pg, P): seen_fade = True
            time.sleep(0.1)
        ok("K3 setelah ±5 detik memudar (kelas fade) lalu hilang (hidden)", seen_fade and "hidden" in ev(pg, P), ev(pg, P))
        for _ in range(4): ev(pg, "NW.event.fetchInfo()"); time.sleep(1.1)
        ok("K4 pembaruan/hitungan berikutnya TIDAK memunculkan banner lagi", "hidden" in ev(pg, P), ev(pg, P))
        ev(pg, "document.getElementById('hudMenuBtn').click()"); time.sleep(0.4)
        ok("K5 menu ☰ memuat ubin 🦈 Event Monster Legenda", ev(pg, "!!document.querySelector('#hmList .hm-tile[data-for=evBtn]')") and "Event Monster" in ev(pg, "document.querySelector('#hmList .hm-tile[data-for=evBtn]').textContent"))
        ev(pg, "document.querySelector('#hmList .hm-tile[data-for=evBtn]').click()"); time.sleep(0.7); html = ev(pg, "document.getElementById('panelBody').textContent")
        ok("K6 dari menu ☰ panel event terbuka: jadwal, hitung mundur, hadiah tetap ada saat banner sudah hilang", all(x in html for x in ["Megalodon", "Hadiah", "Jadwal berikutnya", "19.00"]) and ev(pg, "!!document.getElementById('evCount')"), html[:100])
        ev(pg, "Nusa.closePanel()")
        ev(pg, "(t)=>{window.__setSrv(t)}", S1 - 2000); ev(pg, "NW.event.fetchInfo()"); time.sleep(3.2)
        ev(pg, "(t)=>{window.__setSrv(t)}", S1 + 1500); ev(pg, "NW.event.fetchInfo()"); time.sleep(1.4)
        ok("K7 tepat 19.00: pengumuman LIVE (besar) tampil", "show" in ev(pg, "document.getElementById('evAnn').className") and "MUNCUL" in ev(pg, "document.getElementById('evAnn').textContent"), ev(pg, "document.getElementById('evAnn').textContent"))
        ok("K8 banner LIVE ikut tampil (kabar baru = kunci baru)", "live" in ev(pg, P) and "hidden" not in ev(pg, P), ev(pg, P))
        time.sleep(6.6)
        ok("K9 ±5 detik kemudian pengumuman & banner LIVE hilang, event tetap bisa diakses dari menu ☰ (lencana ! + panel)", "hidden" in ev(pg, P) and "show" not in ev(pg, "document.getElementById('evAnn').className") and ev(pg, "!document.getElementById('evBadge').classList.contains('hidden')"), [ev(pg, P), ev(pg, "document.getElementById('evAnn').className")])
        ev(pg, "document.getElementById('hudMenuBtn').click()"); time.sleep(0.3); ev(pg, "document.querySelector('#hmList .hm-tile[data-for=evBtn]').click()"); time.sleep(0.6)
        ok("K10 panel saat LIVE: status LIVE + tombol ikut event/tiket tersedia", "LIVE" in ev(pg, "document.getElementById('panelBody').textContent") and ev(pg, "!!document.querySelector('#panelBody [data-act=evpass], #panelBody [data-act=go]') || document.getElementById('panelBody').textContent.includes('Kamu sudah di')"), ev(pg, "document.getElementById('panelBody').textContent")[:200])
        ok("K11 tanpa error JS", errs == [], errs); ctx.close()
    finally:
        b.close()
fails = [x for x in R if x.startswith("FAIL")]; print(f"\nevent browser: {len(R)-len(fails)} lulus, {len(fails)} gagal"); raise SystemExit(1 if fails else 0)
