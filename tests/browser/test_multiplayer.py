"""Uji Multiplayer (Tahap 4) dengan BEBERAPA browser sungguhan + server uji lokal (tests/dev/mp-dev-server.js).
Jalankan: python tests/browser/test_multiplayer.py
Yang diuji: persetujuan, koneksi WebSocket nyata, pemain lain terlihat berjalan, nama, bubble chat (disaring), memancing & duduk bersama,
menghilang saat keluar, instance (kapasitas), tersembunyi saat di luar Muara, sambung ulang, hemat data, penggunaan data.
YANG TIDAK DIUJI: Cloudflare Workers/Durable Object asli, verifikasi token Firebase asli (token diuji terpisah di tests/unit-mp.js dengan kunci
RSA buatan), Android fisik, jaringan seluler. Server uji memakai logika instance YANG SAMA (mp/room-core.js) tetapi token 'dev.<uid>'."""
import time, json, os, sys, subprocess, urllib.request
from playwright.sync_api import sync_playwright

ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
SRV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dev", "mp-dev-server.js"))
OUT = "/tmp/nusa-mp-test/"; os.makedirs(OUT, exist_ok=True)
PORT = 8791
R = []
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
def start_server(cap=16, port=PORT):
    env = dict(os.environ, ROOM_CAP=str(cap))
    p = subprocess.Popen(["node", SRV, str(port)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(50):
        try: urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=0.3); return p
        except Exception: time.sleep(0.1)
    raise RuntimeError("server uji tidak naik")
def stats(port=PORT): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/stats", timeout=2).read())

def seed(name, money=50):
    return {"v": 11, "money": money, "day": 1, "hour": 9, "loc": 0, "up": {"rod": 0, "bait": 0, "cooler": 0, "boat": 0}, "cooler": [], "dex": {}, "stats": {"casts": 0, "caught": 0, "earned": 0, "legends": 0}, "profile": {"v": 1, "name": name}}

def new_page(b, acc, name, consent=True, port=PORT, vp=(390, 844), mp=True):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = f"window.__demoAuto='{acc}';"
    if mp: init += f"window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{port}',token:(uid)=>'dev.'+uid}};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');%s}" % (json.dumps(json.dumps(seed(name))), "localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}));" if consent else "")
    ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.goto(ROOT + "?cloud=demo")
    wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle")
    wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.3)
    return ctx, pg, errs
def V(pg): return ev(pg, "NW.mp.view()")
def online(pg, tmo=8): return wait_for(pg, "NW.mp.view().online", tmo)
def names(pg): return sorted(p["name"] for p in V(pg)["players"])
def me_pos(pg): return ev(pg, "(()=>{const p=NW.world.player; return {x:p.x,y:p.y,moving:p.moving}})()")
def peer(pg, nm): return next((p for p in V(pg)["players"] if p["name"] == nm), None)
def remote_ch(pg, nm): return ev(pg, "(n)=>{const p=[...NW.mp._R.players.values()].find(q=>q.name===n); return p? {x:p.ch.x,y:p.ch.y,moving:p.ch.moving,rod:p.ch.rod,sit:p.ch.sit,dir:p.ch.dir}:null}", nm)

def main():
    srv = start_server()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()

            # ===== 1. Persetujuan & tanpa koneksi sebelum setuju =====
            ctxA, A, errsA = new_page(b, "demo-a", "Budi", consent=False)
            time.sleep(1.5)
            ok("1a belum setuju: tidak ada koneksi ke server", stats()["joins"] == 0 and V(A)["state"] == "off")
            ok("1b kartu ajakan tampil dengan penjelasan privasi, dock 👥 ada", ev(A, "!document.getElementById('mpAsk').classList.contains('hidden')") and "nama panggilan" in ev(A, "document.getElementById('mpAsk').innerText").lower() and ev(A, "!document.getElementById('mpDock').classList.contains('hidden')"))
            A.screenshot(path=OUT + "01_ajakan.png")
            A.click("#mpAsk [data-ask=yes]")
            ok("1c setelah setuju: tersambung ke server nyata", online(A) and V(A)["room"] == "muara-1", V(A))
            ok("1d sendirian: tidak ada pemain palsu/bot", V(A)["players"] == [] and V(A)["n"] == 1, V(A)["players"])

            # ===== 2. Tamu / tanpa login tidak tersambung =====
            ctxG = b.new_context(viewport={"width": 390, "height": 844}); G = ctxG.new_page()
            G.add_init_script(f"window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{PORT}',token:(u)=>'dev.'+u}};localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({{consent:true}}));")
            G.goto(ROOT + "?cloud=demo"); wait_for(G, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
            G.click("#gateGuest"); time.sleep(0.2); G.click("#gwContinue"); time.sleep(1.0)
            if ev(G, "!document.getElementById('splash').classList.contains('hidden')"): G.click("#startBtn"); time.sleep(1.2)
            ok("2a tamu: tidak tersambung & dock tersembunyi", V(G)["state"] == "off" and ev(G, "document.getElementById('mpDock').classList.contains('hidden')") and stats()["joins"] == 1)
            ctxG.close()

            # ===== 3. Dua pemain bertemu =====
            ctxB, B, errsB = new_page(b, "demo-b", "Sari")
            ok("3a B tersambung ke instance yang sama", online(B) and V(B)["room"] == "muara-1")
            ok("3b A melihat Sari, B melihat Budi (nama panggilan, bukan akun)", wait_for(A, "NW.mp.view().players.length===1") and names(A) == ["Sari"] and names(B) == ["Budi"], (names(A), names(B)))
            ok("3c hitungan online 2/16 di kedua sisi", V(A)["n"] == 2 and V(B)["n"] == 2 and V(A)["cap"] == 16)
            raw = json.dumps(V(A))
            ok("3d tidak ada uid/email/koin di data pemain lain", "demo-uid" not in raw and "@" not in raw and "money" not in raw)

            # ===== 4. Berjalan real-time =====
            x0 = remote_ch(B, "Budi")["x"]
            A.keyboard.down("ArrowRight"); time.sleep(0.9)
            mid = remote_ch(B, "Budi")
            ok("4a B melihat Budi sedang berjalan (moving) saat A menekan tombol", mid["moving"] is True, mid)
            time.sleep(0.8); A.keyboard.up("ArrowRight"); time.sleep(0.9)
            ap = me_pos(A); br = remote_ch(B, "Budi")
            ok("4b posisi Budi di layar B ≈ posisi asli di A (selisih < 0,5 tile)", abs(br["x"] - ap["x"]) < 0.5 and abs(br["y"] - ap["y"]) < 0.5 and ap["x"] - x0 > 1.0, (ap, br, x0))
            ok("4c setelah A berhenti, Budi berhenti di layar B", br["moving"] is False)
            # B menggambar nama Budi
            ev(B, "(()=>{window.__labels=[]; const o=NW.look.drawLabel; NW.look.drawLabel=function(c,i,x,y,s,l){window.__labels.push(i.name); return o.apply(this,arguments)}; return 1})()")
            time.sleep(0.8)
            ok("4d B menggambar label nama 'Budi' di atas karakternya", "Budi" in ev(B, "window.__labels"), ev(B, "window.__labels.slice(0,5)"))
            B.screenshot(path=OUT + "02_dua_pemain.png")

            # ===== 5. Chat =====
            A.click("#mpChatBtn"); time.sleep(0.2)
            ok("5a panel obrolan terbuka & joystick diblokir saat mengetik", ev(A, "!document.getElementById('mpChat').classList.contains('hidden')") and ev(A, "NW.mp.typing") is True)
            A.fill("#mpInput", "Halo   Sari! kontol http://x.com ayo mancing"); A.press("#mpInput", "Enter"); time.sleep(0.6)
            lg = V(B)["log"]; lastB = lg[-1]["text"] if lg else ""
            ok("5b B menerima chat, disaring (kata kasar & tautan disamarkan)", "Halo Sari!" in lastB and "kontol" not in lastB and "x.com" not in lastB, lastB)
            ok("5c A melihat gema chat yang sama persis seperti yang dilihat B", V(A)["log"][-1]["text"] == lastB)
            ok("5d bubble chat muncul di atas Budi di layar B", ev(B, "[...NW.mp._R.players.values()].some(p=>p.bubble && p.bubble.text.includes('Halo'))"))
            ok("5e keyboard menutup setelah kirim (typing=false), panel tetap terbuka", ev(A, "NW.mp.typing") is False and ev(A, "!document.getElementById('mpChat').classList.contains('hidden')"))
            B.screenshot(path=OUT + "03_chat.png")
            for i in range(8): ev(A, "NW.mp.sendChat('spam %d')" % i)
            time.sleep(0.6)
            ok("5f spam dibatasi server (≤3 pesan tambahan lolos)", len([l for l in V(B)["log"] if l["text"].startswith("spam")]) <= 3 and any(l["name"] == "Sistem" for l in V(A)["log"]))
            ev(A, "NW.mp.sendEmote(3)"); time.sleep(0.4)
            ok("5g emoji 🎣 terlihat di B", ev(B, "[...NW.mp._R.players.values()].some(p=>p.emote && p.emote.i===3)"))

            # ===== 6. Nongkrong & memancing bersama =====
            ev(A, "NW.world.sitAt({x:NW.world.player.x,y:NW.world.player.y,dir:2})"); time.sleep(0.8)
            ok("6a A duduk santai → B melihat Budi duduk", remote_ch(B, "Budi")["sit"] is True and peer(B, "Budi")["f"] & 2)
            ev(A, "NW.world.standUp()")
            ev(B, "window.__nusa.enterFishing('dock')"); time.sleep(0.8)
            ok("6b B memancing di dermaga → A melihat Sari memegang joran (rod=1)", remote_ch(A, "Sari")["rod"] == 1 and peer(A, "Sari")["f"] & 4, remote_ch(A, "Sari"))
            ok("6c B di mode memancing tetap tersambung & bisa chat", V(B)["online"] and (ev(B, "NW.mp.sendChat('dapat nila!')") is True))
            time.sleep(0.5)
            ok("6d A menerima chat dari pemain yang sedang memancing", "dapat nila!" in V(A)["log"][-1]["text"])
            A.screenshot(path=OUT + "04_memancing_bersama.png")
            ev(B, "window.__nusa.goWorld('dock','muara')"); time.sleep(0.8)
            ok("6e B kembali ke dunia → tidak lagi memancing", remote_ch(A, "Sari")["rod"] == 0)

            # ===== 7. Tersembunyi saat di luar Muara =====
            ev(A, "NW.world.switchArea('toba')"); time.sleep(0.9)
            ok("7a A pindah ke area lain → menghilang dari dunia B", peer(B, "Budi") is None and V(B)["n"] <= 1, V(B)["players"])
            ev(A, "NW.world.switchArea('muara')"); time.sleep(1.0)
            ok("7b A kembali ke Muara → muncul lagi", peer(B, "Budi") is not None)

            # ===== 8. Keluar → menghilang =====
            ctxA.close(); time.sleep(1.2)
            ok("8a A menutup game → Budi menghilang dari B (tidak ada hantu)", peer(B, "Budi") is None and V(B)["n"] == 1, V(B)["players"])
            ctxA, A, errsA = new_page(b, "demo-a", "Budi"); online(A); time.sleep(0.6)
            ok("8b A masuk lagi → bertemu B lagi", names(A) == ["Sari"])

            # ===== 9. Sesi ganda satu akun =====
            ctxA2, A2, errsA2 = new_page(b, "demo-a", "Budi"); time.sleep(2.0)
            ok("9a akun sama dari perangkat kedua: sesi lama ditutup server", V(A)["state"] == "replaced" and online(A2), (V(A)["state"], V(A2)["state"]))
            ctxA2.close(); ctxA.close()

            # ===== 10. Hemat data & penggunaan data =====
            time.sleep(0.5)
            ctxA, A, _ = new_page(b, "demo-a", "Budi"); online(A)
            B_rx0 = V(B)["rx"]; s0 = stats()["msgsIn"]
            A.keyboard.down("ArrowLeft"); time.sleep(3.0); A.keyboard.up("ArrowLeft"); time.sleep(0.6)
            rx_norm = V(B)["rx"] - B_rx0; msgs_in = stats()["msgsIn"] - s0
            ok("10a A berjalan 3 dtk: pengiriman posisi A ≤ 5/dtk (hemat baterai)", msgs_in <= 20, msgs_in)
            ok("10b data diterima B selama itu kecil (< 4 KB)", rx_norm < 4096, rx_norm)
            ev(B, "NW.mp.setPref('low', true)"); time.sleep(0.4); B_rx1 = V(B)["rx"]
            A.keyboard.down("ArrowRight"); time.sleep(3.0); A.keyboard.up("ArrowRight"); time.sleep(0.9)
            rx_low = V(B)["rx"] - B_rx1
            ok("10c mode hemat data: B menerima lebih sedikit dari mode normal", rx_low < rx_norm * 0.75, (rx_low, rx_norm))
            lb = remote_ch(B, "Budi"); ap = me_pos(A)
            ok("10d posisi akhir tetap benar di mode hemat data", abs(lb["x"] - ap["x"]) < 0.6 and abs(lb["y"] - ap["y"]) < 0.6, (lb, ap))
            ev(B, "NW.mp.setPref('low', false)")

            # ===== 11. Server mati → sambung ulang otomatis =====
            srv.terminate(); srv.wait(); time.sleep(1.0)
            ok("11a server mati: klien menampilkan terputus & mengosongkan dunia (tidak menampilkan hantu)", V(B)["state"] in ("reconnecting", "error", "connecting") and V(B)["players"] == [], (V(B)["state"], V(B)["players"]))
            srv = start_server()
            ok("11b server hidup lagi: A dan B tersambung ulang otomatis dan saling melihat", wait_for(A, "NW.mp.view().online && NW.mp.view().players.length===1", 25) and wait_for(B, "NW.mp.view().online && NW.mp.view().players.length===1", 25), (V(A)["state"], V(B)["state"]))

            # ===== 12. Pengaturan & logout =====
            ev(B, "NW.mp.setPref('on', false)"); time.sleep(0.7)
            ok("12a B menonaktifkan Dunia Bersama → keluar & A tidak melihat B", V(B)["state"] == "off" and peer(A, "Sari") is None)
            ev(B, "document.getElementById('mpCount').click()"); time.sleep(0.3)
            body = ev(B, "document.getElementById('panelBody').innerText")
            ok("12b panel Dunia Bersama menjelaskan status dengan jujur", "Dunia Bersama" in ev(B, "document.getElementById('panelTitle').innerText") and "Aktifkan Dunia Bersama" in body, body[:120])
            B.screenshot(path=OUT + "05_panel.png")
            ok("12c tidak ada galat JS di semua klien", not (errsA or errsB), (errsA + errsB)[:3])
            b.close()

            # ===== 13. Instance: kapasitas 2 =====
            srv.terminate(); srv.wait(); srv = start_server(cap=2)
            b = p.chromium.launch()
            ps = []
            for acc, nm in [("demo-a", "Budi"), ("demo-b", "Sari"), ("demo-owner", "Dika"), ("demo-fake", "Rani")]:
                ps.append(new_page(b, acc, nm)); online(ps[-1][1]); time.sleep(0.4)
            rooms = [V(x[1])["room"] for x in ps]
            ok("13a kapasitas 2/instance: pemain 1–2 di muara-1, 3–4 di muara-2", rooms == ["muara-1", "muara-1", "muara-2", "muara-2"], rooms)
            ok("13b pemain beda instance tidak saling melihat", names(ps[0][1]) == ["Sari"] and names(ps[2][1]) == ["Rani"], (names(ps[0][1]), names(ps[2][1])))
            ps[1][0].close(); time.sleep(0.8)
            ctx5, P5, _ = new_page(b, "demo-b", "Sari"); online(P5)
            ok("13c setelah ada slot kosong, pemain baru mengisi instance terkecil lagi", V(P5)["room"] == "muara-1", V(P5)["room"])
            b.close()
    finally:
        try: srv.terminate()
        except Exception: pass
    fails = [r for r in R if r.startswith("FAIL")]
    print(f"\nMultiplayer browser: {len(R) - len(fails)} lulus, {len(fails)} gagal"); sys.exit(1 if fails else 0)

main()
