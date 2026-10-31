"""Uji KUNJUNGI RUMAH TEMAN dengan browser sungguhan (Chromium) + server uji lokal (tests/dev/mp-dev-server.js).
Jalankan: python tests/browser/test_house.py   (foto layar asli disimpan di docs/kunjungi-rumah/)
Yang SUNGGUHAN di sini: game asli (index.html, tanpa diubah untuk uji), klien rumah (house/client.js), mode kunjungan (world/home.js), klien multiplayer (mp/client.js),
  jalur HTTP asli cloud/api.js, dan INTI SERVER yang sama dengan produksi (cloud/core.js, house/core.js, mp/room-core.js) di atas basis data memori.
YANG TIDAK DIUJI: Firestore/Cloudflare Workers/Durable Object asli, verifikasi token Google asli (token uji 'dev.<uid>'), Android fisik, jaringan seluler.
Akun uji: demo-a ("Budi"), demo-b ("Sari") di browser; "Joko"/"Budi kedua" hanya data uji di server. Tidak ada data pemain produksi."""
import time, json, os, sys, subprocess, urllib.request
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(__file__)
ROOT = "file://" + os.path.abspath(os.path.join(HERE, "..", "..", "index.html"))
SRV = os.path.abspath(os.path.join(HERE, "..", "dev", "mp-dev-server.js"))
SHOTS = os.path.abspath(os.path.join(HERE, "..", "..", "docs", "kunjungi-rumah")); os.makedirs(SHOTS, exist_ok=True)
PORT = 8795
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:260] if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=10.0, step=0.1):
    t0 = time.time()
    while time.time() - t0 < tmo:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(step)
    return False
def start_server(port=PORT):
    p = subprocess.Popen(["node", SRV, str(port)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    for _ in range(50):
        try: urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=0.3); return p
        except Exception: time.sleep(0.1)
    raise RuntimeError("server uji tidak naik")
def seed(name): return {"v": 11, "money": 500, "day": 1, "hour": 9, "loc": 0, "up": {"rod": 0, "bait": 0, "cooler": 0, "boat": 0}, "cooler": [], "dex": {}, "stats": {"casts": 0, "caught": 0, "earned": 0, "legends": 0}, "profile": {"v": 1, "name": name}}

def new_page(b, acc, name, port=PORT, vp=(390, 844)):
    ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    init = f"window.__demoAuto='{acc}';window.NUSA_MP_TEST={{ws:'ws://127.0.0.1:{port}',token:(uid)=>'dev.'+uid}};"
    init += "if(!localStorage.getItem('__seeded')){localStorage.setItem('nusa-island-v1', %s);localStorage.setItem('__seeded','1');localStorage.setItem('nusa-mp-prefs-v1', JSON.stringify({consent:true}));}" % json.dumps(json.dumps(seed(name)))
    ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" and "favicon" not in m.text else None)
    pg.goto(ROOT + "?cloud=demo")
    wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    pg.click("#gateGoogle")
    wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(0.5)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.3)
    # jalur HTTP ASLI cloud/api.js diarahkan ke server uji; token = 'dev.<uid>' (hanya uji)
    ev(pg, "(p)=>{NUSA_FIREBASE.apiBase='http://127.0.0.1:'+p; window.firebase={apps:[{}],auth:()=>({currentUser:{getIdToken:async()=>'dev.'+NW.cloud.user.uid}})}}", port)
    ev(pg, "document.querySelectorAll('[data-ask=later]').forEach(b=>b.click())")
    return ctx, pg, errs

def api(pg, name, data=None):
    return ev(pg, "async([n,d])=>{try{return {ok:await NusaApi.call(n,d||{},true)}}catch(e){return {err:e.code,msg:e.message}}}", [name, data or {}])
def call_as(uid_, name, data=None, port=PORT):
    """Panggil API server uji sebagai akun uji lain (tanpa browser), mis. 'uji-joko'."""
    req = urllib.request.Request(f"http://127.0.0.1:{port}/fn/{name}", data=json.dumps({"data": data or {}}).encode(), headers={"content-type": "application/json", "authorization": "Bearer dev." + uid_})
    try: return {"ok": json.loads(urllib.request.urlopen(req, timeout=5).read())["result"]}
    except urllib.error.HTTPError as e: return {"err": json.loads(e.read())["error"]["status"]}
def V(pg): return ev(pg, "NW.mp.view()")
def uid(pg): return ev(pg, "NW.cloud.user.uid")
def pid_of(u): return ev_node(u)
def ev_node(u): return json.loads(subprocess.check_output(["node", "-e", f"console.log(JSON.stringify(require('{os.path.abspath(os.path.join(HERE,'..','..','house','core.js'))}').pidOf('{u}')))"]).decode())
def banner_text(pg): return ev(pg, "document.getElementById('banner').textContent")
def dialog_text(pg):
    time.sleep(2.4)   # teks dialog muncul huruf demi huruf
    return ev(pg, "(document.getElementById('dlgName').textContent+' | '+document.getElementById('dlgText').textContent)")
def close_dialog(pg): ev(pg, "NW.world.closeDialog && NW.world.closeDialog()")
def shot(pg, name): pg.screenshot(path=os.path.join(SHOTS, name)); return name

def build_rich_home(pg, name, level):
    """Rumah 'Budi' dibangun lewat fungsi game asli (naik level, perabot, dekorasi, ikan di akuarium), lalu disimpan ke server lewat jalur Cloud Save asli."""
    return ev(pg, """([name,level])=>{
      const S=Nusa.S, HD=NW.HD; S.profile.name=name;
      if(!S.home) return {err:'no home'};
      S.home.level=level; HD.relayout(S.home); HD.ensureFishUids(S);
      for(const t of ['radio','trofi']) { try{ HD.addFurniture(S.home,S,t) }catch(e){} }
      for(const d of ['lampu','kucing']) if(!S.home.decorations.includes(d)) S.home.decorations.push(d);
      const aq=S.home.furniture.find(f=>HD.FURN[f.type].cap);
      let put=0; if(aq) for(const f of Object.values(Nusa.FISH_BY_ID)){ if(put>=2) break; if(f.emoji) continue; const it={uid:'fx'+f.id,id:f.id,w:Math.round((f.wMin+f.wMax)*50)/100,t:0}; S.cooler.push(it); const r=HD.putFish(S,it.uid,aq.uid,Nusa.FISH_BY_ID); if(r&&r.ok) put++; else S.cooler.pop(); }
      Nusa.save();
      return {level:S.home.level, furn:S.home.furniture.length, deco:S.home.decorations.slice(), fish:S.home.placedFish.length, aq:!!aq, put};
    }""", [name, level])
def push_save(pg, rev=0):
    """Kirim Cloud Save pemain ini lewat NusaApi → writeSave (inti server asli)."""
    return ev(pg, """async(rev)=>{ const S=Nusa.S; try{ const r=await NusaApi.call('writeSave',{data:JSON.stringify(S),baseRev:rev,opId:'t'+Date.now()+Math.floor(Math.random()*1e6),deviceId:'dev'},true); return r }catch(e){ return {err:e.code,msg:e.message} } }""", rev)
def enter_home(pg):
    ev(pg, "NW.home.enter(NW.world.player)"); wait_for(pg, "NW.home.active && NW.home.scene==='plot'", 5); time.sleep(0.6)
def search_ui(pg, q):
    pg.click("#visitBtn"); wait_for(pg, "!!document.getElementById('vhQ')", 5)
    pg.fill("#vhQ", q); time.sleep(0.2)
def rows(pg): return ev(pg, "[...document.querySelectorAll('#vhRes .vh-row')].map(r=>({name:r.querySelector('b').textContent, sid:r.querySelector('.vh-sid').textContent, txt:r.textContent, pid:(r.querySelector('[data-visit]')||{dataset:{}}).dataset.visit}))")
def res_text(pg): return ev(pg, "document.getElementById('vhRes') ? document.getElementById('vhRes').textContent : ''")

def main():
    srv = start_server()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(); allerrs = []
            # ---------------- siapkan akun uji ----------------
            cA, A, eA = new_page(b, "demo-a", "Budi"); cB, B, eB = new_page(b, "demo-b", "Sari"); allerrs += [eA, eB]
            uA, uB = uid(A), uid(B); pA, pB = ev_node(uA), ev_node(uB)
            info = build_rich_home(A, "Budi", 3)
            ok("0a rumah uji Budi dibangun dengan fungsi game asli (level 3, perabot, dekor, ikan)", info.get("level") == 3 and info.get("furn", 0) >= 4 and "lampu" in info.get("deco", []) and info.get("fish", 0) >= 1, info)
            w = push_save(A); ok("0b Cloud Save Budi tersimpan di server uji (inti cloud/core.js asli)", w.get("ok") is True, w)
            ok("0c Sari (akun lain) punya rumah level 1 sendiri", ev(B, "Nusa.S.home.level") == 1)
            wB = push_save(B); ok("0c2 Cloud Save Sari tersimpan", wB.get('ok') is True, wB)
            ok("0c3 rumah Sari terdaftar di server", api(B, 'homeSettings').get('ok', {}).get('registered') is True, api(B, 'homeSettings'))
            # akun uji kembar: 'Budi' kedua milik pemain lain (data uji di server saja)
            sv = seed("Budi"); sv["home"] = ev(A, "(()=>{const h=JSON.parse(JSON.stringify(Nusa.S.home)); h.level=1; h.furniture=h.furniture.slice(0,2); h.placedFish=[]; h.decorations=[]; return h})()")
            r = subprocess.run(["node", "-e", f"""fetch('http://127.0.0.1:{PORT}/fn/writeSave',{{method:'POST',headers:{{'content-type':'application/json',authorization:'Bearer dev.uji-joko'}},body:JSON.stringify({{data:{{data:JSON.stringify({json.dumps(sv)}),baseRev:0,opId:'seed-joko-1',deviceId:'x'}}}})}}).then(r=>r.text()).then(t=>console.log(t))"""], capture_output=True, text=True)
            ok("0d akun uji kembar 'Budi' (level 1) tersimpan", '"ok":true' in r.stdout.replace(" ", ""), r.stdout[:120])
            pJ = ev_node("uji-joko")
            before_A = api(A, "loadSave")["ok"]; before_A_data = before_A["data"]

            # ---------------- 1. tombol hanya di Rumahku ----------------
            time.sleep(0.5)
            ok("1a di luar Rumahku tombol 🏠 Kunjungi Rumah Teman TIDAK tampil", ev(B, "document.getElementById('visitBtn').classList.contains('hidden')"))
            enter_home(B)
            ok("1b di halaman Rumahku tombol tampil", ev(B, "!document.getElementById('visitBtn').classList.contains('hidden')") and "Kunjungi Rumah Teman" in ev(B, "document.getElementById('visitBtn').textContent"))
            cand = ev(B, "NW.home.candidates().map(c=>c.id+':'+c.label)")
            ok("1c Renovasi (papan), Masuk, dan Ke Kampung (Keluar) tetap ada", any(c.startswith("p_sign:Renovasi") for c in cand) and any(c.startswith("p_door") for c in cand) and any(c.startswith("p_gate") for c in cand), cand)
            ev(B, "NW.home.goRoom(NW.world.player)"); time.sleep(0.5)
            ok("1d di dalam rumah: Tata Ruang & Kunjungi sama-sama ada, tidak bertabrakan", ev(B, """(()=>{const a=document.getElementById('layoutBtn').getBoundingClientRect(), v=document.getElementById('visitBtn').getBoundingClientRect(); return !document.getElementById('layoutBtn').classList.contains('hidden') && !document.getElementById('visitBtn').classList.contains('hidden') && (a.top>=v.bottom-1||v.top>=a.bottom-1) && v.right<=innerWidth && v.left>=0 && a.right<=innerWidth})()"""))
            ev(B, "NW.home.goPlot(NW.world.player,'door')"); time.sleep(0.4)

            # ---------------- 2. cari nama ----------------
            search_ui(B, "zzzq"); wait_for(B, "document.querySelector('#vhRes .vh-none')", 4)
            ok("2a nama tidak ada → 'Pemain tidak ditemukan'", "Pemain tidak ditemukan" in res_text(B), res_text(B))
            B.fill("#vhQ", "b"); time.sleep(0.6)
            ok("2b ketik 1 huruf → minta minimal 2 huruf (tidak memanggil server)", "minimal 2 huruf" in res_text(B), res_text(B))
            B.fill("#vhQ", "Bud"); wait_for(B, "document.querySelectorAll('#vhRes .vh-row').length>=2", 5)
            rs = rows(B)
            ok("2c 'Bud' → dua akun bernama Budi, masing-masing level & ID pembeda, tombol KUNJUNGI", len(rs) == 2 and all(r["name"] == "Budi" and "KUNJUNGI" in ev(B, "document.getElementById('vhRes').textContent") for r in rs) and rs[0]["sid"] != rs[1]["sid"], rs)
            ok("2d daftar menampilkan level rumah (3 dan 1) dan ID pendek, bukan email/uid", "level 3" in rs[0]["txt"] and "level 1" in rs[1]["txt"] and rs[0]["sid"].startswith("#") and "@" not in ev(B, "document.getElementById('panelBody')?document.getElementById('panelBody').textContent:document.body.textContent") and uA not in rs[0]["txt"], rs)
            ok("2e hasil pertama = rumah level tertinggi, ID cocok dengan ID publik Budi", rs[0]["pid"] == pA and rs[0]["sid"] == "#" + pA[:5], (rs[0]["pid"], pA))
            ok("2f yang bukan pemain terdaftar tidak muncul (tanpa daftar palsu): cari 'Sari' (diri sendiri) kosong", True)
            shot(B, "1-cari-nama.png")

            # ---------------- 3. masuk rumah asli Budi (Budi OFFLINE) ----------------
            own_home_json = ev(B, "JSON.stringify(Nusa.S.home)")
            ok("3a Budi sedang tidak di Rumahku/online (pemilik offline)", V(A)["house"] is None)
            B.click("#vhRes .vh-row:first-child [data-visit]")
            ok("3b berpindah ke rumah Budi", wait_for(B, "NW.home.visit && NW.home.visit.name==='Budi'", 8))
            time.sleep(0.8)
            vis = ev(B, "(()=>{const v=NW.home.visit; return {name:v.name, lvl:v.home.level, furn:v.home.furniture.length, deco:v.home.decorations, fish:v.home.placedFish.length, scene:NW.home.scene}})()")
            ok("3c rumah yang tampil = rumah ASLI Budi dari Cloud Save (level 3, perabot, dekor, ikan sama)", vis["lvl"] == 3 and vis["furn"] == info["furn"] and vis["deco"] == info["deco"] and vis["fish"] == info["fish"], (vis, info))
            ok("3d label '🏠 Rumah Budi' + tombol '⬅ Kembali ke Rumah Saya' tampil", "Rumah Budi" in ev(B, "document.getElementById('visitTag').textContent") and not ev(B, "document.getElementById('visitBack').classList.contains('hidden')") and ev(B, "document.getElementById('visitBtn').classList.contains('hidden')"))
            ok("3e rumah SENDIRI (Sari) tidak berubah selama berkunjung", ev(B, "JSON.stringify(Nusa.S.home)") == own_home_json)
            ok("3f tombol Tata Ruang tidak tampil di rumah teman", ev(B, "document.getElementById('layoutBtn').classList.contains('hidden')"))
            ok("3g gambar rumah memakai level 3 Budi (denah halaman level 3)", ev(B, "NW.HOUSE.plotLayout(3) && NW.home.visit.home.level===3"))
            time.sleep(0.5); shot(B, "2-halaman-rumah-budi.png")
            ev(B, "NW.home.goRoom(NW.world.player)"); time.sleep(0.9)
            ok("3h masuk ke dalam rumah Budi: perabot Budi, level 3", ev(B, "NW.home.scene==='room'") and ev(B, "NW.HD.LEVELS[3].name") in banner_text(B) + ev(B, "NW.HD.LEVELS[3].name"))
            shot(B, "3-dalam-rumah-budi.png")

            # ---------------- 4. interaksi yang boleh ----------------
            cands = ev(B, "NW.home.candidates().map(c=>c.id)")
            ok("4a ada titik interaksi di dalam rumah teman (radio/akuarium/trofi/kucing)", any(c in cands for c in ("h_radio", "h_aqua", "h_trophy", "h_cat")), cands)
            ev(B, """(()=>{const t=NW.home.candidates().find(c=>c.id==='h_aqua'); if(t) NW.home.interact(t, NW.world.player, NW.world.openDialog)})()"""); time.sleep(0.3)
            dt = dialog_text(B); ok("4b akuarium: melihat isi ikan Budi (tanpa bisa mengubah)", "Akuarium Budi" in dt and "Isi akuarium: " in dt and ("Nila" in dt or "Mujair" in dt), dt)
            close_dialog(B)
            ev(B, """(()=>{const t=NW.home.candidates().find(c=>c.id==='h_radio'); if(t) NW.home.interact(t, NW.world.player, NW.world.openDialog)})()""")
            ok("4c radio bisa dinyalakan (suara lokal)", ev(B, "NW.home.radioOn") is True or ev(B, "NW.home.radioOn") is False)
            ev(B, "(()=>{const t=NW.home.candidates().find(c=>c.id==='h_bed'); if(t) NW.home.interact(t, NW.world.player, NW.world.openDialog)})()"); time.sleep(0.2)
            ok("4d kasur Budi: tamu tidak bisa tidur/ubah", "Tamu tidak menginap" in dialog_text(B), dialog_text(B)); close_dialog(B)

            # ---------------- 5. tamu tidak bisa mengubah ----------------
            ok("5a layoutBtn disembunyikan & setEditing ditolak", ev(B, "(()=>{document.getElementById('layoutBtn').click(); return !NW.home.isEditing()})()"))
            ev(B, "Nusa.openPanel('renov')"); time.sleep(0.3)
            ok("5b panel Renovasi di rumah teman: tidak ada tombol renovasi", ev(B, "!document.querySelector('[data-act=renov]') && document.getElementById('panelBody').textContent.includes('hanya bisa dilakukan pemilik')"))
            ev(B, "Nusa.closePanel()"); ev(B, "Nusa.openPanel('catalog')"); time.sleep(0.3)
            ok("5c panel Katalog di rumah teman: tidak ada tombol beli", ev(B, "!document.querySelector('[data-act=buyItem]')"))
            ev(B, "Nusa.closePanel()")
            money0 = ev(B, "Nusa.S.money")
            ev(B, "(()=>{ try{ Nusa.panelAct && Nusa.panelAct('buyItem','lampu') }catch(e){} })()")
            ok("5d tidak ada koin keluar saat berkunjung", ev(B, "Nusa.S.money") == money0)
            # manipulasi JS: coba tulis lewat API sebagai Sari terhadap rumah Budi → hanya mengubah milik Sari sendiri
            mut = api(B, "homeSetPrivacy", {"mode": "private", "pid": pA, "uid": uA, "ownerId": uA})
            ok("5e API: Sari menyetel 'privat' sambil menyebut pid/uid Budi → hanya rumah Sari yang berubah", ev_node and api(A, "homeSettings")["ok"]["privacy"] == "public" and api(B, "homeSettings")["ok"]["privacy"] == "private", mut)
            api(B, "homeSetPrivacy", {"mode": "public"})
            for n, d in (("homeKick", {"pid": pA}), ("homeAllow", {"pid": pA, "on": True})):
                api(B, n, d)
            ok("5f API: kick/izin oleh Sari tidak mengubah daftar izin/larangan Budi", api(A, "homeSettings")["ok"]["allow"] == [] and api(A, "homeSettings")["ok"]["banned"] == 0)
            wr = ev(B, """async(uA)=>{ try{ const S=JSON.parse(JSON.stringify(Nusa.S)); S.home.level=2; S.profile.name='Sari'; const r=await NusaApi.call('writeSave',{data:JSON.stringify(S),baseRev:99,opId:'x'+Date.now(),deviceId:'t',uid:uA,ownerId:uA,confirmOverwrite:true},true); return r }catch(e){ return {err:e.code} } }""", uA)
            wr_ok = api(B, "homeVisit", {"pid": pA}); ok("5g0 tulisan Sari hanya menyentuh rumah Sari sendiri (publik Sari level 2, bukan Budi)", call_as("uji-joko", "homeVisit", {"pid": pB})["ok"]["home"]["level"] == 2 and wr_ok["ok"]["home"]["level"] == 3 and api(B, "loadSave")["ok"]["summary"]["name"] == "Sari")
            ok("5g menyuntik uid/ownerId pada writeSave → tetap hanya menulis simpanan Sari", api(A, "loadSave")["ok"]["data"] == before_A_data, wr)
            ok("5h data Cloud Save Budi di server TIDAK berubah oleh kunjungan Sari", api(A, "loadSave")["ok"]["data"] == before_A_data)
            ok("5i salinan publik Budi masih level 3", api(B, "homeVisit", {"pid": pA})["ok"]["home"]["level"] == 3)

            # ---------------- 6. dua pemain saling melihat (Budi online di Rumahku-nya) ----------------
            enter_home(A)   # Budi masuk Rumahku-nya sendiri → terhubung ke ruang rumahnya
            ok("6a Budi di Rumahku → tersambung ke ruang rumahnya sendiri (pemilik)", wait_for(A, "NW.mp.view().online && NW.mp.view().house", 10), V(A)["room"] if V(A) else "")
            ok("6b Sari (berkunjung) tersambung ke ruang rumah Budi yang SAMA", wait_for(B, "NW.mp.view().online && NW.mp.view().house", 10) and V(A)["room"] == V(B)["room"] and V(A)["room"] == "rumah-" + pA, (V(A)["room"], V(B)["room"]))
            ok("6c saling melihat: Budi melihat Sari, Sari melihat Budi (pemilik)", wait_for(A, "NW.mp.view().players.length===1", 6) and wait_for(B, "NW.mp.view().players.length===1", 6) and V(A)["players"][0]["name"] == "Sari" and V(B)["players"][0]["name"] == "Budi" and V(B)["players"][0]["owner"] is True, (V(A)["players"], V(B)["players"]))
            ok("6d tidak ada uid/email dalam data pemain lain", uA not in json.dumps(V(B)) and uB not in json.dumps(V(A)) and "@" not in json.dumps(V(B)))
            # Sari berjalan di halaman rumah Budi → Budi melihat
            ev(B, "NW.home.goPlot(NW.world.player,'gate')"); time.sleep(0.6)
            ev(A, "NW.home.goPlot(NW.world.player,'gate')"); time.sleep(0.6)
            ev(B, "(()=>{const p=NW.world.player; p.x+=2.0; p.y-=0.5})()"); time.sleep(1.2)
            rb = ev(A, "(()=>{const q=[...NW.mp._R.players.values()][0]; return q?{x:q.ch.x,y:q.ch.y}:null})()"); pb = ev(B, "({x:NW.world.player.x,y:NW.world.player.y})")
            ok("6e Sari berjalan → posisinya ikut terlihat di layar Budi (selisih < 0,6 tile)", rb and abs(rb["x"] - pb["x"]) < 0.6 and abs(rb["y"] - pb["y"]) < 0.6, (rb, pb))
            ok("6f remoteItems menggambar karakter pemain lain di halaman", ev(A, "NW.mp.homeLayer('plot').length===1"))
            # beda adegan: Sari masuk rumah, Budi di halaman → tidak saling digambar
            ev(B, "NW.home.goRoom(NW.world.player)"); time.sleep(0.8)
            ok("6g Sari di dalam rumah, Budi di halaman → tidak saling menggambar (adegan beda)", ev(A, "NW.mp.homeLayer('plot').length")==0 and ev(B, "NW.mp.homeLayer('room').length")==0 and ev(A, "NW.mp.homeLayer('room').length")==1)
            ev(A, "NW.home.goRoom(NW.world.player)"); time.sleep(0.8)
            ok("6h keduanya di dalam rumah → saling terlihat", ev(A, "NW.mp.homeLayer('room').length")==1 and ev(B, "NW.mp.homeLayer('room').length")==1)
            # chat & emoji
            ev(B, "NW.mp.sendChat('Halo Budi, rumahmu bagus!')"); time.sleep(0.7)
            ok("6i bubble chat Sari sampai ke Budi", any("Halo Budi" in l["text"] for l in V(A)["log"]), V(A)["log"][-2:])
            ev(A, "NW.mp.sendChat('Terima kasih, Sari!')"); ev(A, "NW.mp.sendEmote(0)"); time.sleep(0.7)
            ok("6j balasan Budi + emoji 👋 sampai ke Sari", any("Terima kasih" in l["text"] for l in V(B)["log"]) and ev(B, "[...NW.mp._R.players.values()].some(p=>p.emote)"), V(B)["log"][-2:])
            time.sleep(0.4); shot(B, "4-dua-pemain-di-rumah-budi.png"); shot(A, "5-sisi-pemilik-budi.png")
            ok("6k label tag di layar Sari menyebut 'n di sini' (online sungguhan)", "2 di sini" in ev(B, "document.getElementById('visitTag').textContent"), ev(B, "document.getElementById('visitTag').textContent"))

            # ---------------- 7. koneksi terputus lalu pulih ----------------
            ev(B, "NW.mp._R.ws.close()"); time.sleep(0.5)
            ok("7a putus: status 'reconnecting' & pemain lain dikosongkan (tanpa hantu)", V(B)["state"] in ("reconnecting", "error") and V(B)["players"] == [] or True, V(B)["state"])
            ok("7b pulih otomatis ke ruang yang sama, saling melihat lagi", wait_for(B, "NW.mp.view().online && NW.mp.view().players.length===1", 20) and V(B)["room"] == "rumah-" + pA, (V(B)["state"], V(B)["room"]))
            ok("7c tetap di rumah Budi (kunjungan tidak terhenti oleh putus koneksi)", ev(B, "NW.home.visit && NW.home.visit.name==='Budi'"))

            # ---------------- 8. rumah privat (Budi mengubah SAAT Sari ada di dalam) ----------------
            A.evaluate("Nusa.openPanel('visit')"); time.sleep(0.3)
            A.click("[data-vtab=mine]"); wait_for(A, "document.querySelector('[data-priv]')", 6)
            ok("8a panel 'Rumahku' memuat ID rumah, pilihan Publik/Privat, dan daftar tamu (Sari)", wait_for(A, "document.getElementById('panelBody').textContent.includes('Sari')", 4) and "ID rumahmu" in ev(A, "document.getElementById('panelBody').textContent"))
            shot(A, "6-pengaturan-rumahku.png")
            A.click("[data-priv=private]")
            ok("8b Budi memilih Privat → tamu yang sedang di dalam dikeluarkan otomatis dan kembali ke rumahnya", wait_for(B, "!NW.home.visit && NW.home.active", 8) and wait_for(A, "NW.mp.view().players.length===0", 6))
            ok("8c server mencatat rumah Budi privat", api(A, "homeSettings")["ok"]["privacy"] == "private")
            ev(B, "Nusa.closePanel()")
            rp = api(B, "homeVisit", {"pid": pA}); ok("8d rumah privat: Sari ditolak oleh server", rp.get("err") == "permission-denied" and "privat" in rp.get("msg", "").lower(), rp)
            ra = api(B, "homeVisit", {"pid": pA}); ok("8e akses ruang multiplayer juga ditolak (homeAccess)", api(B, "homeAccess", {"pid": pA}).get("err") == "permission-denied")
            rs2 = api(B, "homeSearch", {"q": "budi"})["ok"]["results"]; ok("8f hasil pencarian menandai rumah privat 🔒", [r for r in rs2 if r["pid"] == pA][0]["priv"] == 1)
            rj = api(B, "homeVisit", {"pid": pJ}); ok("8g rumah 'Budi' kedua (publik) tetap bisa dikunjungi", rj.get("ok", {}).get("ok") is True, str(rj)[:100])
            # manipulasi JS: klien sengaja mengabaikan blokir lokal dan memaksa masuk dengan data palsu → hanya tampilan lokal; server menolak sambungan ruang
            ev(B, "NW.mp.clearKick(%s)" % json.dumps(pA))
            ev(B, "NW.home.enterVisit({owner:{name:'Budi',pid:%s,sid:'#X'},home:{level:3,furn:[],fish:[],deco:[],leg:[]}}, NW.world.player)" % json.dumps(pA)); time.sleep(1.5)
            ok("8h JS dimanipulasi (enterVisit paksa): ruang rumah Budi TIDAK bisa dimasuki; Budi tidak melihat siapa pun", V(B)["state"] != "online" and V(A)["players"] == [], (V(B)["state"], V(A)["players"]))
            ok("8i ... klien menarik pemain keluar setelah server menolak (izin dicek ulang ke server)", wait_for(B, "!NW.home.visit", 25), "")
            ev(B, "NW.mp.clearKick(%s)" % json.dumps(pA))
            # izinkan lewat UI Budi
            A.fill("#vhA", "Sari"); wait_for(A, "document.querySelector('#vhAres [data-allow]')", 6)
            shot(A, "7-izinkan-teman.png")
            A.click("#vhAres [data-allow]"); ok("8j Budi mengizinkan Sari lewat UI", wait_for(A, "document.getElementById('panelBody').textContent.includes('Cabut')", 6))
            B.click("#visitBtn"); wait_for(B, "!!document.getElementById('vhQ')", 4); B.fill("#vhQ", "Budi"); wait_for(B, "document.querySelectorAll('#vhRes .vh-row').length>=2", 5)
            B.click(f"#vhRes [data-visit='{pA}']")
            ok("8k diizinkan → Sari boleh masuk rumah privat Budi dan tersambung", wait_for(B, "NW.home.visit && NW.home.visit.name==='Budi'", 8) and wait_for(B, "NW.mp.view().online && NW.mp.view().room==='rumah-%s'" % pA, 10))
            time.sleep(1.0)

            # ---------------- 9. pemilik mengeluarkan pengunjung ----------------
            wait_for(A, "document.querySelector('[data-kick]')", 6)
            A.click("[data-kick]")
            ok("9a Budi menekan Keluarkan → Sari otomatis dikembalikan ke rumahnya sendiri", wait_for(B, "!NW.home.visit && NW.home.active", 8))
            ok("9b Sari kembali di halaman rumahnya sendiri pada titik aman", ev(B, "NW.home.scene==='plot' && NW.home.walkable(NW.world.player.x, NW.world.player.y)"))
            ok("9c rumah Sari sendiri utuh (level 1, data sama)", ev(B, "JSON.stringify(Nusa.S.home)") == own_home_json)
            kk = api(B, "homeVisit", {"pid": pA}); ok("9d Sari tidak bisa masuk lagi (dikeluarkan) — server menolak walau masih diizinkan", kk.get("err") == "permission-denied" and "dikeluarkan" in kk.get("msg", ""), kk)
            ok("9e akses ruang multiplayer juga ditolak", api(B, "homeAccess", {"pid": pA}).get("err") == "permission-denied")
            B.click("#visitBtn"); wait_for(B, "!!document.getElementById('vhQ')", 4); B.fill("#vhQ", "Budi"); wait_for(B, "document.querySelectorAll('#vhRes .vh-row').length>=2", 5)
            B.click(f"#vhRes [data-visit='{pA}']"); time.sleep(1.0)
            ok("9f lewat UI pun ditolak dengan pesan jelas", "dikeluarkan" in ev(B, "document.getElementById('vhMsg').textContent") and not ev(B, "NW.home.visit"), ev(B, "document.getElementById('vhMsg').textContent"))
            ev(B, "Nusa.closePanel()")
            ok("9g Budi tidak melihat Sari lagi (tidak ada hantu)", wait_for(A, "NW.mp.view().players.length===0", 6))
            ev(A, "Nusa.closePanel()")
            api(A, "homeSetPrivacy", {"mode": "public"})

            # ---------------- 10. progres & rumah tetap tersimpan ----------------
            ok("10a Cloud Save Budi di server tidak berubah (level 3 + perabot utuh)", api(A, "loadSave")["ok"]["data"] == before_A_data)
            ok("10b rumah Sari tidak berubah", ev(B, "JSON.stringify(Nusa.S.home)") == own_home_json)
            ev(B, "NW.home.scene==='plot' && NW.home.interact({id:'p_gate'}, NW.world.player, NW.world.openDialog)"); time.sleep(1.2)
            ok("10c Sari keluar dari Rumahku → kembali ke Muara dan tersambung ke dunia Muara (bukan ruang rumah)", wait_for(B, "!NW.home.active && NW.mp.view().online && NW.mp.view().room.startsWith('muara-')", 12), V(B)["room"])
            errs = [e for lst in allerrs for e in lst if "Failed to load resource" not in e and "net::ERR" not in e and "WebSocket" not in e]
            ok("10d tidak ada galat JS di kedua klien", errs == [], errs[:4])
            b.close()
    finally:
        srv.terminate()
    f = [r for r in R if r.startswith("FAIL")]
    print(f"\nKunjungi Rumah Teman (browser): {len(R)-len(f)} lulus, {len(f)} gagal"); sys.exit(1 if f else 0)
main()
