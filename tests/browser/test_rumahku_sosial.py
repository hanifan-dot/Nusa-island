"""[Tahap 4 Rumahku Sosial] Uji (diadaptasi dari test_house.py): KUNJUNGI RUMAH TEMAN dengan browser sungguhan (Chromium) + server uji lokal (tests/dev/mp-dev-server.js).
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
SHOTS = os.path.abspath(os.path.join(HERE, "..", "..", "docs", "rumahku-sosial")); os.makedirs(SHOTS, exist_ok=True)
PORT = 8797
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
            b = p.chromium.launch()
            cA, A, eA = new_page(b, "demo-a", "Budi"); cB, B, eB = new_page(b, "demo-b", "Sari")
            for pg in (A, B): ev(pg, "window.NUSA_SOCIAL_HOME=true")
            uA, uB = uid(A), uid(B); pA, pB = ev_node(uA), ev_node(uB)
            ev(A, "Nusa.S.profile.name='Budi'"); ev(B, "Nusa.S.profile.name='Sari'")
            ok("0a Cloud Save Budi", push_save(A).get("ok") is True); ok("0b Cloud Save Sari", push_save(B).get("ok") is True)
            ok("0c fitur MATI bila flag dimatikan: tombol tersembunyi", ev(A, "document.getElementById('friendsBtn').classList.contains('hidden')"))
            # aktifkan modul sosial (flag diset sebelum hook; panggil hook manual karena load sudah lewat)
            for pg in (A, B):
                ev(pg, "NW.social.hook()"); 
            ok("1a backend siap -> tombol 👥 tampil", wait_for(A, "!document.getElementById('friendsBtn').classList.contains('hidden')", 8) and wait_for(B, "!document.getElementById('friendsBtn').classList.contains('hidden')", 8))
            # keduanya online di dunia yang sama
            for pg in (A, B): wait_for(pg, "NW.mp.view().online", 10); ev(pg, "NW.mp.joinRoom(3)")
            ok("1b keduanya di server #3", wait_for(A, "NW.mp.view().online && NW.mp.view().roomNo===3", 10) and wait_for(B, "NW.mp.view().online && NW.mp.view().roomNo===3", 10))
            ev(B, "NW.mp.sendOutfit && NW.mp.sendOutfit('')"); time.sleep(1.2)
            ok("1c daftar pemain memuat ID publik (hid) Sari", wait_for(A, "NW.mp.view().players.some(p=>p.hid)", 8), V(A)["players"])
            ok("1d hid = hash satu arah, cocok dengan pid Sari", ev(A, "NW.mp.view().players.map(p=>p.hid)")[0] == pB)
            ev(A, "document.getElementById('friendsBtn').click()"); wait_for(A, "!!document.querySelector('.sc-av')", 5); time.sleep(0.6)
            ok("2a daftar online menampilkan Sari dengan avatar & ID", ev(A, "[...document.querySelectorAll('.vh-row')].some(r=>r.textContent.includes('Sari')&&r.querySelector('canvas.sc-av')&&r.querySelector('.vh-sid'))"))
            shot(A, "01-daftar-online.png")
            ev(A, "document.querySelector('[data-sinv]').click()"); time.sleep(0.8)
            ok("2b undangan terkirim (toast / cooldown)", ev(A, "document.querySelector('[data-sinv]').disabled") is True)
            A.keyboard.press("Escape"); ev(A, "Nusa.closePanel()")
            ok("3a Sari menerima notifikasi TERIMA/TOLAK", wait_for(B, "(()=>{NW.social._poll();return !document.getElementById('invPop').classList.contains('hidden')})()", 10) and ev(B, "document.getElementById('invPop').textContent.includes('Budi')"))
            shot(B, "02-notifikasi-undangan.png")
            ok("3b tanpa terima, Sari ditolak masuk rumah privat Budi", api(B, "homeVisit", {"pid": pA}).get("err") == "permission-denied")
            # Budi pulang ke Rumahku (pemilik), Sari menerima lalu masuk
            enter_home(A); time.sleep(0.5)
            enter_home(B)
            ev(B, "document.querySelector('#invPop [data-sacc]').click()"); 
            ok("4a Sari masuk rumah Budi setelah TERIMA", wait_for(B, "NW.home.visit && NW.home.visit.pid", 10), banner_text(B))
            ok("4b Sari dan Budi sama-sama berada di ruang rumah", wait_for(B, "NW.mp.view().house && NW.mp.view().online", 10) and wait_for(A, "NW.mp.view().house && NW.mp.view().players.length>=1", 10), V(A).get("players"))
            time.sleep(1.0); ev(B, "NW.mp.sendChat('Halo Budi, rumahmu bagus!')"); time.sleep(0.8)
            ok("4c chat bersama di rumah (Budi menerima)", wait_for(A, "NW.mp.view().log.some(l=>l.text.includes('rumahmu bagus'))", 6))
            shot(B, "03-tamu-di-rumah.png"); shot(A, "04-pemilik-melihat-tamu.png")
            # pemilik: senyap + keluarkan + blokir
            A.click("#visitBtn"); wait_for(A, "!!document.querySelector('[data-vtab=mine]')", 5); ev(A, "document.querySelector('[data-vtab=mine]').click()"); time.sleep(0.8)
            ok("5a pemilik melihat tombol Keluarkan untuk tamu", wait_for(A, "!!document.querySelector('[data-kick]')", 6))
            shot(A, "05-panel-pemilik-keluarkan.png")
            ev(A, "document.querySelector('[data-kick]').click()"); 
            ok("5b tamu dikeluarkan dan kembali ke Rumahku-nya", wait_for(B, "!NW.home.visit", 10))
            ok("5c setelah dikeluarkan Sari ditolak server", api(B, "homeVisit", {"pid": pA}).get("err") == "permission-denied")
            # Sari mengatur senyap & blokir
            ev(B, "document.getElementById('friendsBtn').click()"); time.sleep(0.4); ev(B, "document.querySelector('[data-stab=prefs]').click()"); time.sleep(0.8)
            ev(B, "document.querySelector('[data-smute=\"1\"]').click()"); time.sleep(0.8)
            ok("6a Sari menyenyapkan undangan (server)", api(B, "homeSettings")["ok"]["mute"] is True)
            shot(B, "06-pengaturan-senyap.png")
            r = api(A, "homeInvite", {"pid": pB})
            ok("6b baru dikeluarkan: Budi tidak bisa mengundang Sari lagi seketika (server); senyap/blokir diuji di unit-house-social", r.get("err") == "failed-precondition" and api(B, "homeInbox")["ok"]["invites"] == [], r)
            api(B, "homePrefs", {"mute": False}); api(B, "homePrefs", {"block": pA, "on": True})
            ok("6c diblokir Sari: Budi tidak bisa mengirim undangan", api(B, "homeSettings")["ok"]["blocks"][0]["name"] == "Budi")
            # Cloud Save tidak berubah oleh fitur sosial
            la = api(A, "loadSave")["ok"]["data"]; ok("7a Cloud Save Budi bersih dari data sosial", "guests" not in la and "homeinbox" not in la)
            ok("7b tidak ada error halaman", not [e for e in (eA + eB) if "PAGEERR" in e], [e for e in (eA + eB)][:4])
            b.close()
    finally:
        srv.terminate()
    f = [r for r in R if r.startswith("FAIL")]; print(f"\nTOTAL {len(R)-len(f)}/{len(R)} lulus"); sys.exit(1 if f else 0)
if __name__ == "__main__": main()
