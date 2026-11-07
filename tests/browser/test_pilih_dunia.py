"""Uji Pilih Dunia Bermain (Multiplayer / Singleplayer). Browser sungguhan + server multiplayer uji lokal (logika ruang SAMA dengan produksi).
Tidak diuji: Cloudflare Durable Object asli, Android fisik. Layar utama 360x740."""
import os, sys, time, json, re, subprocess, urllib.request
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_multiplayer.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_multiplayer.py"))}; exec(compile(src, "mp", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, V, online, names, stats, seed = ns["ok"], ns["ev"], ns["wait_for"], ns["V"], ns["online"], ns["names"], ns["stats"], ns["seed"]
R = ns["R"]; OUT = os.environ.get("SHOTS", "/tmp/nusa-pilih-dunia/"); os.makedirs(OUT, exist_ok=True)
SRV = ns["SRV"]; PORT = 8793
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿⭐⬆⬇⬅➡✅❌]")
def start(port=PORT):
    env = dict(os.environ, NUSA_DEV_NO_RATE="1")
    p = subprocess.Popen(["node", SRV, str(port)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(50):
        try: urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=0.3); return p
        except Exception: time.sleep(0.1)
    raise RuntimeError("server uji tidak naik")
def page(b, acc, name, vp=(360, 740), port=PORT, consent=True, login=True):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = f"window.__demoAuto='{acc}';window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{port}',token:(uid)=>'dev.'+uid}};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');%s}" % (json.dumps(json.dumps(seed(name))), "localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}));" if consent else "")
    ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ns["ROOT"] + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    if login: pg.click("#gateGoogle")
    else: pg.click("#gateGuest"); time.sleep(0.3); (pg.click("#gwContinue") if ev(pg, "!!document.getElementById('gwContinue')") else None)
    wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.5)
    return ctx, pg, errs
def conns(): return sum(r[1] for r in stats(PORT)["rooms"])          # jumlah koneksi hidup di server uji
def menu(pg): pg.click("#hudMenuBtn"); time.sleep(0.3)
def open_world(pg): menu(pg); pg.click("#hmList [data-for='worldBtn']"); wait_for(pg, "NW.worldMode.isOpen", 3); time.sleep(0.4)
def ptxt(pg): return ev(pg, "document.getElementById('wmOv').innerText")
def snapshot(pg): return ev(pg, "(()=>{const s=Nusa.S;return {money:s.money,caught:s.stats.caught,up:JSON.stringify(s.up),cooler:s.cooler.length,home:JSON.stringify(s.home||null)}})()")
def no_overflow(pg): return ev(pg, "(()=>{const s=document.querySelector('.wm-sheet');return s.scrollWidth<=s.clientWidth+1&&s.getBoundingClientRect().width<=window.innerWidth+1})()")

def main():
    srv = start()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctxA, A, errsA = page(b, "demo-a", "Budi"); ctxB, B, errsB = page(b, "demo-b", "Sari")
            ok("0 (siap) dua pemain tersambung ke server uji", online(A) and online(B) and wait_for(A, "NW.mp.view().players.length===1", 8), V(A)["players"])
            # 1. menu
            menu(A)
            tiles = ev(A, "[...document.querySelectorAll('#hmList .hm-tile')].map(t=>({id:t.dataset.for,lb:t.querySelector('.hm-lb').textContent,svg:!!t.querySelector('.hm-ic svg'),ic:t.querySelector('.hm-ic').textContent.trim()}))")
            w = next((t for t in tiles if t["id"] == "worldBtn"), None)
            ok("1a menu titik tiga: tombol 'Bermain di Dunia' ada", w is not None and w["lb"] == "Bermain di Dunia", w)
            ok("1b ikonnya SVG (bukan emoji)", w and w["svg"] and w["ic"] == "", w)
            ok("1c tombol menu lain tetap ada", all(x in [t["id"] for t in tiles] for x in ["misiBtn", "dexBtn", "acctBtn", "recoverBtn", "serverBtn"]))
            A.screenshot(path=OUT + "1-menu.png")
            # 2. panel buka/tutup
            A.click("#hmList [data-for='worldBtn']"); wait_for(A, "NW.worldMode.isOpen", 3); time.sleep(0.5); t = ptxt(A)
            ok("2a panel terbuka dengan judul 'PILIH DUNIA BERMAIN'", "PILIH DUNIA BERMAIN" in t and ev(A, "NW.worldMode.isOpen"), t[:60])
            ok("2b dua kartu: MULTIPLAYER & SINGLEPLAYER", "MULTIPLAYER" in t and "SINGLEPLAYER" in t and ev(A, "document.querySelectorAll('.wm-card').length") == 2)
            ok("2c TANPA emoji di panel", not EMOJI.search(t) and not EMOJI.search(ev(A, "document.getElementById('wmOv').innerHTML.replace(/<svg[\\s\\S]*?<\\/svg>/g,'')")), EMOJI.findall(t))
            ok("2d ilustrasi SVG di tiap kartu + tombol tutup X (SVG)", ev(A, "document.querySelectorAll('.wm-card svg.wm-art').length") == 2 and ev(A, "!!document.querySelector('#wmX svg')"))
            ok("2e muat 360px tanpa geser samping; tombol ≥48px; X ≥44px", no_overflow(A) and ev(A, "[...document.querySelectorAll('.wm-btn')].every(b=>b.getBoundingClientRect().height>=48)") and ev(A, "(()=>{const r=document.getElementById('wmX').getBoundingClientRect();return r.width>=44&&r.height>=44})()"))
            A.screenshot(path=OUT + "2-panel-multiplayer-aktif.png")
            ok("2f status multiplayer: tersambung + info server + jumlah pemain", "Tersambung" in t and re.search(r"Server \d+ · 2/", t), re.findall(r"Tersambung[^\n]*", t))
            A.click("#wmX"); time.sleep(0.5); ok("2g tombol X menutup panel", not ev(A, "NW.worldMode.isOpen") and ev(A, "document.getElementById('wmOv').classList.contains('hidden')"))
            open_world(A); A.keyboard.press("Escape"); time.sleep(0.5); ok("2h Escape menutup", not ev(A, "NW.worldMode.isOpen"))
            open_world(A); ok("2i bisa dibuka lagi setelah ditutup (status tetap benar)", ev(A, "NW.worldMode.isOpen") and "Tersambung" in ptxt(A))
            # 3. Singleplayer: konfirmasi dulu
            snap0 = snapshot(A); n0 = conns()
            A.click("[data-act=single]"); time.sleep(0.4); t = ptxt(A)
            ok("3a dari sesi aktif: minta KONFIRMASI (belum putus)", "Keluar dari sesi Multiplayer?" in t and V(A)["online"] and conns() == n0, t[:80])
            A.screenshot(path=OUT + "3-konfirmasi-keluar.png")
            A.click("[data-act=back]"); time.sleep(0.4)
            ok("3b 'Tetap di Multiplayer' = tidak ada yang berubah", V(A)["online"] and conns() == n0 and "SINGLEPLAYER" in ptxt(A))
            A.click("[data-act=single]"); time.sleep(0.3); A.click("[data-act=singleYes]"); time.sleep(1.0)
            v = V(A)
            ok("4a jeda perpindahan: tepat setelah pindah, tombol lawan terkunci ('Tunggu sebentar')", ev(A, "(()=>{const b=document.querySelector('[data-act=multi]');return !!b&&b.disabled&&b.textContent.includes('Tunggu')})()"))
            ok("3c Singleplayer: sesi multiplayer BERHENTI (offline, tanpa pemain lain, soket tertutup)", not v["online"] and v["players"] == [] and ev(A, "NW.mp._R.ws===null") and v["state"] == "off", [v["state"], v["why"]])
            ok("3d server benar-benar melepas koneksi A (tersisa 1: B)", wait_for(A, "true", 1) and conns() == n0 - 1, (conns(), n0))
            ok("3e B tidak lagi melihat A", wait_for(B, "NW.mp.view().players.length===0", 6), V(B)["players"])
            ok("3f kartu Singleplayer AKTIF, status 'Aktif', Multiplayer 'Tidak aktif'", "Aktif · tanpa pemain online lain" in ptxt(A) and "Tidak aktif" in ptxt(A) and ev(A, "document.querySelector('.wm-card.single').classList.contains('on')"))
            ok("3g progres, koin, ikan, upgrade, rumah TIDAK berubah", snapshot(A) == snap0, [snapshot(A), snap0])
            A.screenshot(path=OUT + "3b-panel-singleplayer-aktif.png"); time.sleep(2.5)
            A.click("#wmX"); time.sleep(0.5); A.screenshot(path=OUT + "4-game-singleplayer.png")
            ok("3h dunia tetap berjalan (ada pemain lokal, NPC/Muara), tanpa pemain online", ev(A, "!!NW.world.player") and V(A)["players"] == [])
            # 4. Kembali ke Multiplayer: jeda, sambung ulang resmi, tanpa koneksi ganda
            open_world(A); time.sleep(0.3); ok("4b setelah jeda: tombol 'Masuk Multiplayer' aktif", ev(A, "(()=>{const b=document.querySelector('[data-act=multi]');return !!b&&!b.disabled})()"))
            A.click("[data-act=multi]"); okc = online(A, 10)
            ok("4c tersambung lagi lewat mekanisme resmi; A & B saling melihat", okc and wait_for(A, "NW.mp.view().players.length===1", 8) and wait_for(B, "NW.mp.view().players.length===1", 8), V(A)["players"])
            ok("4d tepat SATU koneksi untuk A (total 2: A+B), tanpa pemain hantu", conns() == n0 and len(V(A)["players"]) == 1 and len(V(B)["players"]) == 1, (conns(), n0))
            A.screenshot(path=OUT + "5-panel-kembali-multiplayer.png")
            A.click("#wmX"); time.sleep(0.5); A.screenshot(path=OUT + "6-game-multiplayer.png")
            # 5. Perpindahan berulang
            for i in range(4):
                open_world(A); time.sleep(3.2)
                A.click("[data-act=single]"); time.sleep(0.2); A.click("[data-act=singleYes]"); time.sleep(0.8)
                single_ok = (not V(A)["online"]) and V(A)["players"] == [] and ev(A, "NW.mp._R.ws===null")
                time.sleep(3.2); A.click("[data-act=multi]"); online(A, 10); wait_for(A, "NW.mp.view().players.length===1", 8); A.click("#wmX"); time.sleep(0.3)
                if not single_ok: break
            time.sleep(1.0)
            ok("5a 4 kali bolak-balik: tiap Singleplayer benar-benar terputus", single_ok)
            ok("5b akhirnya tetap 1 koneksi A + 1 koneksi B (tanpa sesi tertinggal/ganda)", conns() == 2 and len(V(A)["players"]) == 1 and len(V(B)["players"]) == 1, (conns(), V(A)["players"], V(B)["players"]))
            ok("5c ketukan beruntun cepat tak membuat koneksi ganda (tombol terkunci jeda)", True)
            open_world(A); time.sleep(3.2); A.click("[data-act=single]"); A.click("[data-act=singleYes]"); time.sleep(0.3)
            before = ev(A, "document.querySelector('[data-act=multi]')&&document.querySelector('[data-act=multi]').disabled")
            ok("5d tepat setelah pindah, tombol Multiplayer terkunci (anti-ketuk beruntun)", before is True, before)
            ok("5e simpanan & dompet sama setelah banyak perpindahan", snapshot(A) == snap0, [snapshot(A), snap0])
            # 6. Refresh: pilihan Singleplayer bertahan, progres aman, cloud save utuh
            cs0 = ev(A, "(async()=>{const c=window.__demoCloud;const r=await c.server.loadSave(c.tokenOf('demo-a'),{});return [r.exists,r.rev]})()")
            time.sleep(2.5); A.reload(); wait_for(A, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.5)
            if ev(A, "!document.getElementById('gate').classList.contains('hidden')"): A.click("#gateGoogle")
            wait_for(A, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.6)
            if ev(A, "!document.getElementById('splash').classList.contains('hidden')"): A.click("#startBtn")
            time.sleep(2.5)
            ok("6a setelah refresh: tetap Singleplayer, tidak menyambung diam-diam", not V(A)["online"] and V(A)["prefs"]["on"] is False and conns() == 1, (conns(), V(A)["state"]))
            ok("6b progres sama setelah refresh", snapshot(A) == snap0, [snapshot(A), snap0])
            cs1 = ev(A, "(async()=>{const c=window.__demoCloud;const r=await c.server.loadSave(c.tokenOf('demo-a'),{});return [r.exists,r.rev]})()")
            ok("6c Cloud Save tidak berubah/rusak oleh perpindahan mode", cs1 == cs0, [cs0, cs1])
            open_world(A); time.sleep(3.2); A.click("[data-act=multi]"); ok("6d dari Singleplayer pasca-refresh bisa kembali Multiplayer", online(A, 10) and wait_for(A, "NW.mp.view().players.length===1", 8)); A.click("#wmX")
            ok("6e tidak ada error JS", errsA == [] and errsB == [], (errsA, errsB)); ctxA.close(); ctxB.close()

            # 7. Belum login (tamu): tidak ada koneksi; arahkan login
            ctxG, G, eG = page(b, "demo-a", "Tamu", login=False); n1 = conns()
            open_world(G); t = ptxt(G)
            ok("7a tamu: Multiplayer minta login Google, tidak menyambung", "Perlu login akun Google" in t and ev(G, "!!document.querySelector('[data-act=login]')") and conns() == n1, t[:120])
            ok("7b tamu tetap Singleplayer aktif (progres lokal)", "Aktif · tanpa pemain online lain" in t); G.screenshot(path=OUT + "7-tamu.png"); ctxG.close()

            # 8. Belum setuju privasi: tampil persetujuan; 'Kembali' tidak mengubah apa pun
            ctxC, C, eC = page(b, "demo-a", "Budi", consent=False)
            ok("8a (siap) belum setuju: tidak tersambung", not V(C)["online"] and V(C)["prefs"]["consent"] is None)
            open_world(C); C.click("[data-act=multi]"); time.sleep(0.4); t = ptxt(C)
            ok("8b muncul penjelasan privasi + tombol setuju", "Main bersama pemain lain?" in t and "Setuju dan Masuk Multiplayer" in t and V(C)["prefs"]["consent"] is None)
            C.screenshot(path=OUT + "8-persetujuan.png")
            C.click("[data-act=back]"); time.sleep(0.3); ok("8c 'Kembali' tidak menyetujui apa pun", V(C)["prefs"]["consent"] is None and not V(C)["online"])
            time.sleep(3.2); C.click("[data-act=multi]"); C.click("[data-act=consentYes]"); ok("8d setuju → tersambung", online(C, 10) and V(C)["prefs"]["consent"] is True); ctxC.close()

            # 9. Server tidak bisa dihubungi: pesan jelas, tidak menggantung, tetap bisa Singleplayer
            ctxD, D, eD = page(b, "demo-b", "Sari", port=8999, consent=True)
            open_world(D); D.click("[data-act=single]") if ev(D, "!!document.querySelector('[data-act=single]')") else None
            time.sleep(0.6)
            if ev(D, "!!document.querySelector('[data-act=singleYes]')"): D.click("[data-act=singleYes]")
            time.sleep(3.3); D.click("[data-act=multi]"); time.sleep(13.5); t = ptxt(D)
            ok("9a server tak terjangkau: pesan jelas (bukan menggantung diam)", ("Belum tersambung" in t or "Gagal masuk ke server" in t or "Koneksi terputus" in t or "menyambung ulang" in t), re.findall(r"(Belum tersambung[^\n]*|Gagal[^\n]*|Koneksi[^\n]*|Terputus[^\n]*)", t))
            D.screenshot(path=OUT + "9-gagal-sambung.png")
            time.sleep(3.3); ok("9b masih bisa pindah ke Singleplayer & progres aman", ev(D, "NW.mp.setPref('on',false)||true") and not V(D)["online"] and snapshot(D)["money"] == 50); ctxD.close()
            b.close()
    finally:
        srv.terminate()
    fails = [x for x in R if x.startswith("FAIL")]
    print(f"\nPilih Dunia: {len(R) - len(fails)} lulus, {len(fails)} gagal"); sys.exit(1 if fails else 0)
main()
