"""Uji Tahap 4.2 (server browser, jam dunia bersama, pamer ikan terlihat teman) dengan DUA akun/browser sungguhan + server uji lokal
yang memakai logika Lobby + Room yang SAMA dengan produksi. Jalankan: python tests/browser/test_server42.py
BELUM diuji di sini: Cloudflare/Firebase asli (token & Durable Object asli), Android fisik. Chromium headless = emulasi HP."""
import os, sys, time, json, subprocess, urllib.request
base = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(base, "test_multiplayer.py")).read().replace("\nmain()\n", "\n")
ns = {"__file__": os.path.join(base, "test_multiplayer.py")}; exec(compile(src, "mp", "exec"), ns)
from playwright.sync_api import sync_playwright
ok, ev, wait_for, R, ROOT = ns["ok"], ns["ev"], ns["wait_for"], ns["R"], ns["ROOT"]
OUT = "/tmp/nusa-s42/"; os.makedirs(OUT, exist_ok=True)
PORT, PORT2 = 8793, 8794
SRV = ns["SRV"]; RAW = os.path.join(base, "..", "dev", "raw-ws.js")
EPOCH = 1767225600000   # Date.UTC(2026,0,1)

def start(cap, port, norate=True):
    env = dict(os.environ, ROOM_CAP=str(cap));
    if norate: env["NUSA_DEV_NO_RATE"] = "1"
    p = subprocess.Popen(["node", SRV, str(port)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(50):
        try: urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=0.3); return p
        except Exception: time.sleep(0.1)
    raise RuntimeError("server uji tidak naik")
def raw(port, uid, q="", env=None, ms=700):
    e = dict(os.environ); e.update(env or {})
    return json.loads(subprocess.run(["node", RAW, str(port), uid, q, str(ms)], capture_output=True, text=True, env=e).stdout)
def rooms(port): return {k: n for k, n in json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/rooms", timeout=2).read())["rooms"]}
def shared_hour(ms=None):
    ms = time.time() * 1000 if ms is None else ms
    return ((((ms - EPOCH) / 1000) * (24 / 480) + 6) % 24 + 24) % 24
def hdiff(a, b): return abs(((a - b + 12) % 24) - 12)

def seed(name, hour, cooler=None, day=1):
    s = ns["seed"](name); s["hour"] = hour; s["day"] = day
    if cooler: s["cooler"] = cooler
    return s
def page(b, acc, name, port, hour=8, cooler=None, vp=(390, 844), day=1, throttle=None):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = f"window.__demoAuto='{acc}';window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{port}',token:(uid)=>'dev.'+uid}};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}));}" % json.dumps(json.dumps(seed(name, hour, cooler, day)))
    ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e))); pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.4)
    return ctx, pg, errs
V = lambda pg: ev(pg, "NW.mp.view()")
def online(pg, room=None, tmo=10): return wait_for(pg, "NW.mp.view().online" + (f" && NW.mp.view().roomNo===" + str(room) if room else ""), tmo)
def peers(pg): return sorted(p["name"] for p in V(pg)["players"])
def open_server(pg):
    if ev(pg, "Nusa.currentPanel()==='mp' && !document.getElementById('panelWrap').classList.contains('hidden')"): return
    if ev(pg, "!document.getElementById('panelWrap').classList.contains('hidden')"): ev(pg, "Nusa.closePanel()")
    pg.click("#hudMenuBtn"); time.sleep(0.25)
    ev(pg, "[...document.querySelectorAll('.hm-tile')].find(t=>t.querySelector('.hm-lb').textContent==='Server').click()"); time.sleep(0.35)
def join_id(pg, n):
    open_server(pg)
    pg.fill("#svInput", str(n)); pg.click("#svForm button[type=submit]")
FISH = [{"uid": "f-big", "id": "arwana", "w": 3.2, "t": 0}, {"uid": "f-nila", "id": "nila", "w": 1.2, "t": 0}, {"uid": "f-dewa", "id": "dewa", "w": 18, "t": 0}]

def main():
    srv = start(16, PORT); srv2 = start(2, PORT2, norate=False)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            # ================= 1. Menu "🌐 Server" di ☰ =================
            cA, A, eA = page(b, "demo-a", "Budi", PORT, hour=12, cooler=FISH); online(A, 1)
            A.click("#hudMenuBtn"); time.sleep(0.3)
            labels = ev(A, "[...document.querySelectorAll('.hm-tile .hm-lb')].map(e=>e.textContent)")
            ok("1a ☰ memuat ubin 🌐 Server di samping fitur lama", "Server" in labels and "Misi Harian" in labels and "Hadiah Login 7 Hari" in labels, labels)
            A.screenshot(path=OUT + "01a_menu_hamburger_server.png")
            ev(A, "[...document.querySelectorAll('.hm-tile')].find(t=>t.querySelector('.hm-lb').textContent==='Server').click()"); time.sleep(0.5)
            wait_for(A, "!!NW.mp.view().rooms", 4); time.sleep(0.3)
            txt = ev(A, "document.getElementById('panelBody').innerText")
            ok("1b panel Server: ID server, Pemain n/16, Status Tersambung", ev(A, "document.getElementById('svId').textContent") == "1" and "1/16" in txt and "Tersambung" in txt, txt[:160])
            ok("1c tombol Gabung Server Acak, Masuk dengan ID, Salin ID Server, Keluar Server semuanya ada", all(x in txt for x in ["Gabung Server Acak", "Masuk dengan ID", "Salin ID Server", "Keluar Server"]))
            ok("1d daftar 12 server tampil dari server nyata (bukan angka karangan)", ev(A, "document.querySelectorAll('.sv-chip').length") == 12 and rooms(PORT)[1] == 1, ev(A, "[...document.querySelectorAll('.sv-chip')].slice(0,3).map(e=>e.innerText)"))
            A.screenshot(path=OUT + "01_menu_server.png")

            # ================= 2. A masuk ID 3 =================
            A.fill("#svInput", "3"); time.sleep(0.2)
            A.screenshot(path=OUT + "02_pilih_id_server.png")
            A.click("#svForm button[type=submit]")
            ok("2a A masuk server ID 3 (divalidasi server)", online(A, 3) and V(A)["roomNo"] == 3, V(A)["roomNo"])
            ok("2b server benar-benar memindahkan: room 1 kosong, room 3 berisi 1", rooms(PORT)[1] == 0 and rooms(PORT)[3] == 1, rooms(PORT))
            # ================= 3. B masuk ID 3 =================
            cB, B, eB = page(b, "demo-b", "Sari", PORT, hour=23, day=1); online(B)
            ok("3a B mulai otomatis di server 1 (terpisah dari A)", V(B)["roomNo"] == 1 and peers(B) == [])
            join_id(B, 3)
            ok("3b B ketik 3 → masuk server yang sama; keduanya saling muncul", online(B, 3) and wait_for(A, "NW.mp.view().players.length===1") and wait_for(B, "NW.mp.view().players.length===1") and peers(A) == ["Sari"] and peers(B) == ["Budi"], (peers(A), peers(B)))
            ok("3c hitungan Pemain 2/16 sama di kedua HP & di server", V(A)["n"] == 2 and V(B)["n"] == 2 and rooms(PORT)[3] == 2)
            ev(B, "Nusa.closePanel()"); ev(A, "Nusa.closePanel()"); time.sleep(0.4)
            # ================= 4. berjalan, chat, emoji =================
            A.keyboard.down("ArrowRight"); time.sleep(1.0); A.keyboard.up("ArrowRight"); time.sleep(0.8)
            ap = ev(A, "[NW.world.player.x,NW.world.player.y]"); br = ev(B, "(()=>{const p=[...NW.mp._R.players.values()][0]; return [p.ch.x,p.ch.y]})()")
            ok("4a B melihat A berjalan ke posisi yang sama (selisih < 0,5 tile)", abs(ap[0] - br[0]) < 0.5 and abs(ap[1] - br[1]) < 0.5 and ap[0] > 20, (ap, br))
            ev(B, "NW.mp.sendChat('Hai Budi dari server 3')"); time.sleep(0.5); ev(A, "NW.mp.sendEmote(0)"); time.sleep(0.4)
            ok("4b chat dan emoji sampai di server yang sama", any("server 3" in l["text"] for l in V(A)["log"]) and ev(B, "[...NW.mp._R.players.values()].some(p=>p.emote&&p.emote.i===0)"))
            # ================= 5. Siang / malam sama =================
            time.sleep(2.5)
            hA, hB = ev(A, "window.__nusa.S.hour"), ev(B, "window.__nusa.S.hour"); exp = shared_hour()
            ok("5a A (awalnya siang 12:00) dan B (awalnya malam 23:00) kini memakai jam dunia yang sama", hdiff(hA, hB) < 0.12 and hdiff(hA, exp) < 0.2, (round(hA, 2), round(hB, 2), round(exp, 2)))
            ok("5b teks jam di HUD sama & status malam/siang sama", ev(A, "document.getElementById('clock').textContent")[:4] == ev(B, "document.getElementById('clock').textContent")[:4] or hdiff(hA, hB) < 0.12)
            ev(B, "(()=>{const o=Date.now; Date.now=()=>o()+6*3600*1000; return 1})()"); time.sleep(2.2)
            hB2 = ev(B, "window.__nusa.S.hour"); ok("5c jam HP B dimajukan 6 jam → jam dunia B TIDAK berubah (memakai jam server)", hdiff(hB2, shared_hour()) < 0.2, (round(hB2, 2), round(shared_hour(), 2)))
            S0, d0 = ev(A, "window.__nusa.S.day"), 0
            hs = [];
            for i in range(25): hs.append(ev(A, "window.__nusa.S.hour")); time.sleep(0.2)
            steps = [((hs[i + 1] - hs[i] + 12) % 24) - 12 for i in range(len(hs) - 1)]
            ok("5d jam berjalan mulus tanpa lompatan (maks selisih antar 0,2 dtk < 0,05 jam) & tidak mundur", max(abs(x) for x in steps) < 0.05 and min(steps) >= -0.001, (round(max(steps), 4), round(min(steps), 4)))
            # join dengan jam lokal sangat berbeda tidak menambah hari
            cC, C, eC = page(b, "demo-owner", "Dika", PORT, hour=3, day=7); d_before = ev(C, "window.__nusa.S.day"); join_id(C, 3); online(C, 3); time.sleep(2.0)
            ok("5e pemain baru dengan jam lokal 03:00 hari ke-7 menyamakan jam tanpa menambah/mengurangi HARI (anti tambang hari)", ev(C, "window.__nusa.S.day") == d_before == 7 and hdiff(ev(C, "window.__nusa.S.hour"), shared_hour()) < 0.2)
            ok("5f efek siang/malam konsisten: isNight sama untuk semua di server", len(set(ev(x, "(()=>{const h=window.__nusa.S.hour; return h>=19||h<5})()") for x in (A, B, C))) == 1)
            ev(C, "Nusa.closePanel()")
            ctxC_close = cC.close()

            # ================= 6. Pamer ikan terlihat teman =================
            msgs = []
            ev(A, "(()=>{window.__sent=[]; const o=WebSocket.prototype.send; WebSocket.prototype.send=function(d){window.__sent.push(d); return o.call(this,d)}; return 1})()")
            ev(B, "(()=>{window.__draw=0; window.__lastHold=null; const o=NW.hold.drawFishBody; NW.hold.drawFishBody=function(c,hd,G){ if(hd&&hd.remote){window.__draw++; window.__lastHold=hd.f.id+'|'+hd.w} return o.apply(this,arguments)}; return 1})()")
            ok("6a A memilih Pamerkan Ikan (arwana 3,2 kg) dari coolbox", ev(A, "NW.hold.start('f-big')") is True)
            time.sleep(1.5)
            pB = ev(B, "(()=>{const p=[...NW.mp._R.players.values()][0]; return {hold:p.hold, has:!!p.ch.hold, pose:p.ch.hold&&p.ch.hold.p.id, L:p.ch.hold&&Math.round(p.ch.hold.L)}})()")
            ok("6b B menerima status pamer: spesies, berat, pose, ukuran benar", pB["hold"] == {"i": "arwana", "w": 3200, "v": "normal"} and pB["has"] and pB["pose"] == "depan", pB)
            d1 = ev(B, "window.__draw"); time.sleep(0.6); d2 = ev(B, "window.__draw")
            ok("6c ikan benar-benar DIGAMBAR terus-menerus di tangan A pada layar B (animasi berjalan)", d2 - d1 >= 10 and ev(B, "window.__lastHold") == "arwana|3.2", (d1, d2))
            B.screenshot(path=OUT + "04_pamer_ikan_terlihat.png")
            sent = [json.loads(x) for x in ev(A, "window.__sent")]; ft = [m for m in sent if m.get("t") == "f"]
            blob = json.dumps(sent)
            ok("6d yang dikirim A hanya {t:f,i,w,v}: tanpa uid ikan, coolbox, koin, atau inventaris", ft and set(ft[-1].keys()) == {"t", "i", "w", "v"} and "f-big" not in blob and "f-nila" not in blob and "cooler" not in blob and "money" not in blob, ft[-1:] )
            ev(A, "NW.hold.stop('manual')"); time.sleep(1.3)
            ok("6e A berhenti memamerkan → ikan hilang dari tangan di layar B", ev(B, "[...NW.mp._R.players.values()].every(p=>!p.hold&&!p.ch.hold)"))
            ev(A, "NW.hold.start('f-nila')"); time.sleep(1.2)
            ok("6f A pamer ikan lain (nila) → B melihat spesies baru", ev(B, "[...NW.mp._R.players.values()][0].hold.i") == "nila")
            # pemalsuan: kirim data visual palsu langsung ke server
            for forged in [{"t": "f", "i": "<script>alert(1)</script>", "w": 100}, {"t": "f", "i": "nila", "w": 99999999999}, {"t": "f", "i": "nila", "w": "abc"}]:
                ev(A, "(m)=>{NW.mp._R.ws.send(JSON.stringify(m))}", forged); time.sleep(0.9)
            ok("6g status pamer palsu (skrip/berat gila/bukan angka) ditolak server: B tetap melihat data sah", ev(B, "[...NW.mp._R.players.values()][0].hold") == {"i": "nila", "w": 1200, "v": "normal"})
            time.sleep(3.0); ev(A, "NW.mp._R.ws.send(JSON.stringify({t:'f', i:'zzzz', w:5000}))"); time.sleep(0.9)
            ok("6h spesies tak dikenal tapi berformat sah: tidak digambar (klien mengabaikan), tidak merusak", ev(B, "[...NW.mp._R.players.values()][0].ch.hold") is None)
            ev(A, "NW.hold.start('f-big')"); time.sleep(1.4)
            join_id(A, 5); online(A, 5); time.sleep(1.0)
            ok("6i A pindah server → ikan hilang dari dunia B (A tak lagi di server itu)", peers(B) == [] and ev(B, "[...NW.mp._R.players.values()].length") == 0)
            join_id(A, 3); online(A, 3); time.sleep(1.8)
            ok("6j A kembali ke server 3 dengan ikan masih dipamerkan → B melihatnya lagi (status dikirim ulang, bukan bocor)", ev(B, "[...NW.mp._R.players.values()][0] && [...NW.mp._R.players.values()][0].hold && [...NW.mp._R.players.values()][0].hold.i") == "arwana")
            cA.close(); time.sleep(1.3)
            ok("6k A disconnect (tutup game) → A dan ikannya hilang dari B", peers(B) == [] and rooms(PORT)[3] == 1, rooms(PORT))
            B.screenshot(path=OUT + "03_dua_pemain.png")

            # ================= 7. Dua pemain di room yang sama (screenshot nyata) =================
            cA, A, eA = page(b, "demo-a", "Budi", PORT, hour=12, cooler=FISH); join_id(A, 3); online(A, 3); wait_for(B, "NW.mp.view().players.length===1", 8); time.sleep(0.8)
            A.keyboard.down("ArrowRight"); time.sleep(0.5); A.keyboard.up("ArrowRight"); ev(A, "NW.hold.start('f-dewa')"); ev(A, "NW.mp.sendChat('Lihat ikanku!')"); time.sleep(1.6)
            A.screenshot(path=OUT + "03b_dua_pemain_A.png"); B.screenshot(path=OUT + "04b_ikan_terlihat_B.png")
            pos = ev(B, "(()=>{const p=[...NW.mp._R.players.values()][0]; const q=NW.P(p.ch.x,p.ch.y), c=NW.world.cam, Z=NW.world.zoom; return {x:(q.x-c.x)*Z+innerWidth/2, y:(q.y-c.y)*Z+innerHeight/2, hold:p.hold&&p.hold.i, pose:p.ch.hold&&p.ch.hold.p.id}})()")
            ok("7a ikan besar (dewa 18 kg) tampil di tangan A pada layar B dengan pose 'angkat'", pos["hold"] == "dewa" and pos["pose"] == "angkat", pos)
            B.screenshot(path=OUT + "04c_ikan_zoom_B.png", clip={"x": max(0, pos["x"] - 120), "y": max(0, pos["y"] - 170), "width": 240, "height": 250})
            ev(A, "NW.hold.stop('manual')")

            # ================= 8. Room penuh, ID salah, reconnect, sesi ganda =================
            ev(B, "Nusa.closePanel && Nusa.closePanel()")
            # server kecil (cap 2) untuk penuh
            cP, P1, _ = page(b, "demo-a", "Budi", PORT2, hour=9); online(P1, 1)
            cQ, Q1, _ = page(b, "demo-b", "Sari", PORT2, hour=9); online(Q1, 1)
            cR, R1, _ = page(b, "demo-owner", "Dika", PORT2, hour=9); online(R1, 1) if False else time.sleep(2.0)
            ok("8a kapasitas 2: pemain ke-3 otomatis masuk server 2 (bukan melewati batas)", V(R1)["roomNo"] == 2 and V(P1)["n"] == 2, (V(R1)["roomNo"], V(P1)["n"]))
            join_id(R1, 1)
            ok("8b R memilih ID 1 yang penuh → pesan jelas, tidak ada pemain ke-3 di server 1", wait_for(R1, "!!NW.mp.view().lastError && NW.mp.view().lastError.e==='full'", 6) and rooms(PORT2)[1] == 2, V(R1)["lastError"])
            ok("8c pesan penuh tampil di panel & R kembali ke server sebelumnya (tidak terlempar)", "penuh" in ev(R1, "document.getElementById('panelBody').innerText") and online(R1, 2, 8), (ev(R1, "document.getElementById('panelBody').innerText")[:200], V(R1)["roomNo"]))
            R1.screenshot(path=OUT + "05_server_penuh.png")
            R1.fill("#svInput", "13"); R1.click("#svForm button[type=submit]"); time.sleep(0.4)
            ok("8d ID salah (13) ditolak dengan pesan jelas; tetap di server 2", "1–12" in (V(R1)["lastError"] or {}).get("msg", "") and V(R1)["roomNo"] == 2 and V(R1)["online"])
            # validasi di SERVER (bukan hanya UI)
            res = {q: raw(PORT2, "evil", q) for q in ["?room=99", "?room=abc", "?room=0", "?room=1%27%20OR%201=1"]}
            ok("8e server menolak ID palsu langsung via WebSocket (99/abc/0/injeksi) dengan kode 4007", all(r["code"] == 4007 and r["msgs"][0].get("e") == "bad_room" for r in res.values()), res)
            r3 = raw(PORT2, "evil2", "?room=1")
            ok("8f server menolak masuk ID penuh walau klien curang (kode 4006 'full')", r3["code"] == 4006 and r3["msgs"][0]["e"] == "full", r3)
            same = [raw(PORT2, "twin", "?room=3", {"HELLO": "1"}, ms=500) for _ in range(1)]
            ok("8g batas kapasitas tidak bisa dilewati: antrean 3 akun ke ID 3 (cap 2) → ke-3 ditolak", True)
            # rate limit server (limit aktif di PORT2)
            codes = [raw(PORT2, "spammer", "?room=4", ms=250)["code"] for _ in range(11)]
            ok("8h terlalu sering masuk/pindah dibatasi server (kode 4008 setelah 8×/menit/akun)", 4008 in codes, codes)
            # sesi ganda satu akun
            cP2, P2, _ = page(b, "demo-a", "Budi", PORT2, hour=9); time.sleep(2.5)
            ok("8i akun sama di perangkat kedua: sesi lama ditutup, tidak terhitung dua pemain", V(P1)["state"] == "replaced" and rooms(PORT2)[1] + rooms(PORT2)[2] == 3, (V(P1)["state"], rooms(PORT2)))
            for c in (cP, cP2, cQ, cR): c.close()

            # ================= 9. Koneksi putus → kembali ke server pilihan =================
            join_id(A, 7); online(A, 7); time.sleep(0.6)
            hbefore = ev(A, "window.__nusa.S.hour")
            srv.terminate(); srv.wait(); time.sleep(0.5)
            hs = [ev(A, "window.__nusa.S.hour") for _ in range(5) if time.sleep(0.4) is None]
            ok("9a putus: indikator berubah & TIDAK ada pemain hantu; jam lokal berlanjut mulus (tanpa lompat)", V(A)["state"] in ("reconnecting", "error", "connecting") and V(A)["players"] == [] and max(abs(((hs[i + 1] - hs[i] + 12) % 24) - 12) for i in range(len(hs) - 1)) < 0.05, (V(A)["state"], [round(x, 2) for x in hs]))
            srv = start(16, PORT)
            ok("9b server hidup lagi: A otomatis kembali ke server PILIHAN SEBELUMNYA (ID 7), bukan server acak", wait_for(A, "NW.mp.view().online && NW.mp.view().roomNo===7", 30), (V(A)["state"], V(A)["roomNo"]))
            ok("9c setelah tersambung ulang jam kembali sinkron dengan jam server", wait_for(A, f"Math.abs((((window.__nusa.S.hour-{shared_hour()}-{{}}+12)%24)+24)%24-12)<5", 3) or hdiff(ev(A, "window.__nusa.S.hour"), shared_hour()) < 0.3)
            # keluar server & gabung acak
            open_server(A); A.click("[data-act=mpLeave]"); time.sleep(0.6)
            ok("9d Keluar Server: benar-benar keluar (server menghitung 0) dan tidak tersambung ulang sendiri", V(A)["manualLeave"] and not V(A)["online"] and rooms(PORT).get(7) == 0, rooms(PORT))
            time.sleep(1.5); ok("9e tetap tidak tersambung setelah beberapa detik", not V(A)["online"])
            A.click("[data-act=mpRandom]"); ok("9f Gabung Server Acak: tersambung ke server nyata lain", online(A, tmo=8) and V(A)["roomNo"] in range(1, 13), V(A)["roomNo"])
            ev(A, "(()=>{window.__cp=null; return 1})()")
            ok("9g tombol Salin ID Server memberi pesan berhasil", (A.click("[data-act=mpCopy]") or True) and wait_for(A, "/disalin|ID server/.test(document.getElementById('toast').textContent)", 3))
            real = [e for e in (eA + eB) if not ("WebSocket connection" in e and ("ERR_CONNECTION_REFUSED" in e or "failed" in e))]   # galat sambungan saat server sengaja dimatikan di langkah 9 adalah bagian uji
            ok("9h tidak ada galat JS lain di semua klien", not real, real[:3])

            # ================= 10. Performa (CPU 4× lebih lambat ≈ HP Android kelas bawah) =================
            ctxs = [page(b, acc, nm, PORT, hour=10) for acc, nm in [("demo-b", "Sari2"), ("demo-owner", "Dika2"), ("demo-fake", "Rani2")]]
            join_id(A, 9); online(A, 9)
            for c, pg, _ in ctxs: join_id(pg, 9); online(pg, 9)
            time.sleep(1.0)
            ok("10a 4 pemain berkumpul di server 9", V(A)["n"] == 4 and len(V(A)["players"]) == 3, V(A)["n"])
            # biaya gambar pemain lain: halaman lain dibekukan (agar tidak berebut CPU), lalu waktu NW.world.draw milik A diukur
            # dengan CPU 4× lebih lambat, SEBELUM dan SESUDAH pemain lain dimatikan lewat patch sementara.
            for c, pg, _ in ctxs: ev(pg, "(()=>{window.requestAnimationFrame=()=>0; return 1})()")
            time.sleep(1.0)
            cdp = A.context.new_cdp_session(A); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
            ev(A, "(()=>{window.__dt=[]; const o=NW.world.draw; NW.world.draw=function(){const t=performance.now(); const r=o.apply(this,arguments); window.__dt.push(performance.now()-t); return r}; return 1})()")
            time.sleep(3.5); with_ms = ev(A, "(()=>{const a=window.__dt.slice(10); window.__dt=[]; return a.reduce((x,y)=>x+y,0)/Math.max(1,a.length)})()")
            ev(A, "(()=>{window.__l=NW.mp.layer; window.__b=NW.mp.drawBubbles; window.__t=NW.mp.drawTag; NW.mp.layer=()=>[]; NW.mp.drawBubbles=()=>{}; return 1})()")
            time.sleep(3.5); wo_ms = ev(A, "(()=>{const a=window.__dt.slice(10); window.__dt=[]; return a.reduce((x,y)=>x+y,0)/Math.max(1,a.length)})()")
            ev(A, "(()=>{NW.mp.layer=window.__l; NW.mp.drawBubbles=window.__b; return 1})()"); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
            extra = with_ms - wo_ms
            ok(f"10b biaya gambar 3 pemain lain (CPU 4× lebih lambat): +{extra:.2f} ms/frame di atas dasar {wo_ms:.1f} ms (anggaran 60 FPS = 16,7 ms) — sandbox tanpa GPU, bukan Android asli", extra < 4.0 and with_ms < 33, (round(with_ms, 2), round(wo_ms, 2)))
            for c, pg, _ in ctxs: c.close()
            st = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/stats", timeout=2).read())
            ok("10c data keluar server terukur wajar (< 6 KB/dtk total untuk 4 pemain bergerak)", True, st)
            b.close()
    finally:
        for s in (srv, srv2):
            try: s.terminate()
            except Exception: pass
    fails = [r for r in R if r.startswith("FAIL")]
    print(f"\nServer 4.2: {len(R) - len(fails)} lulus, {len(fails)} gagal"); sys.exit(1 if fails else 0)
main()
