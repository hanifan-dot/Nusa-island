"""Uji Nama Pemain Permanen (modal pendaftaran + penerapan nama resmi). Chromium 360x740, adapter demo (inti server SAMA dengan Worker)."""
import os, sys, time, json
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = os.environ.get("SHOTS", "/tmp/nusa-username/"); os.makedirs(OUT, exist_ok=True)
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:240] if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=10.0, step=0.1):
    t = time.time()
    while time.time() - t < tmo:
        try:
            if pg.evaluate(js): return True
        except Exception: pass
        time.sleep(step)
    return False
def save(name="Pemancing", money=100):
    return json.dumps({"v": 11, "money": money, "day": 1, "hour": 9, "loc": 0, "up": {"rod": 0, "bait": 0, "cooler": 0, "boat": 0}, "cooler": [], "dex": {}, "stats": {"casts": 0, "caught": 0, "earned": 0, "legends": 0}, "profile": {"v": 1, "name": name}})
def open_page(b, acc, current=None, login=True, extra_init="", ctx=None, wait_modal=True):
    ctx = ctx or b.new_context(viewport={"width": 360, "height": 740}, has_touch=True, device_scale_factor=2)
    ini = f"window.__demoAuto='{acc}';window.__demoAskName=true;" + (f"if(!localStorage.getItem('__seeded')){{localStorage.setItem('nusa-island-v1',{json.dumps(current)});localStorage.setItem('__seeded','1');}}" if current else "") + extra_init
    ctx.add_init_script(ini)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    if login: pg.click("#gateGoogle")
    else: pg.click("#gateGuest")
    if login and wait_modal: wait_for(pg, "NW.username && NW.username.isOpen()", 12)
    else: time.sleep(1.5)
    return ctx, pg, errs
def txt(pg): return ev(pg, "document.getElementById('unBody').innerText")
def msg(pg): return ev(pg, "document.getElementById('unMsg').innerText")
def typ(pg, v): pg.fill("#unIn", v); time.sleep(0.05)
def claimed_by_other(pg, acc, name): return ev(pg, "async ([a,n])=>{const c=window.__demoCloud;return await c.nameServer.nameClaim(c.tokenOf(a),{name:n})}", [acc, name])

with sync_playwright() as p:
    b = p.chromium.launch()
    # 1. Tamu: tidak ada modal (tidak ada akun)
    ctx, G, errs = open_page(b, "demo-a", save("Budi"), login=False)
    ok("1 tamu: modal nama TIDAK muncul (tanpa akun)", not ev(G, "NW.username.isOpen()")); ctx.close()

    # 2. Akun baru: modal muncul
    ctx, A, errs = open_page(b, "demo-a", save("Budi"))
    t = txt(A)
    ok("2a modal muncul setelah login", ev(A, "NW.username.isOpen()"))
    ok("2b judul & teks persis", "SELAMAT DATANG DI NUSA ISLAND!" in t and "Buat nama unikmu sebelum memulai petualangan. Nama ini akan menjadi identitas permanen akunmu." in t, t[:160])
    ok("2c kolom 'Masukkan Nama Pemain', tombol Periksa Nama & Konfirmasi Nama", "Masukkan Nama Pemain" in t and "🔍 Periksa Nama" in t and "✅ Konfirmasi Nama" in t)
    ok("2d Konfirmasi nonaktif sebelum diperiksa", ev(A, "document.getElementById('unOk').disabled"))
    ok("2e tidak meminta nama asli/info pribadi (ada peringatan)", "Jangan pakai nama asli" in t and not ev(A, "!!document.querySelector('#unOv input[type=email],#unOv input[type=tel]')"))
    ok("2f tidak bisa ditutup (tanpa tombol tutup; Escape & klik latar tak menutup)", not ev(A, "!!document.querySelector('#unOv [aria-label*=Tutup],#unOv .close')"))
    A.keyboard.press("Escape"); A.mouse.click(2, 2); time.sleep(0.2); ok("2g masih terbuka setelah Escape/klik latar", ev(A, "NW.username.isOpen()"))
    ok("2h muat di 360 px tanpa geser samping; tombol ≥48px; input ≥48px", ev(A, "(()=>{const s=document.querySelector('.un-sheet');const h=(id)=>document.getElementById(id).getBoundingClientRect().height;return s.scrollWidth<=s.clientWidth+1&&h('unCheck')>=48&&h('unOk')>=48&&h('unIn')>=48})()"))
    ok("2i input: tanpa kapital otomatis/koreksi, maxlength 16", ev(A, "(()=>{const i=document.getElementById('unIn');return i.maxLength===16&&i.autocapitalize==='none'&&i.spellcheck===false})()"))
    A.screenshot(path=OUT + "1-modal.png")

    # 3. Validasi instan
    for v, frag in [("ab", "terlalu pendek"), ("a b", "spasi"), ("Budi-1", "huruf A–Z"), ("admin", "dicadangkan"), ("kontol99", "tidak pantas"), ("123456", "huruf")]:
        typ(A, v); ok(f"3 validasi instan '{v}'", frag in msg(A).lower() or frag in msg(A), msg(A))
        ok(f"3 '{v}': Konfirmasi tetap nonaktif", ev(A, "document.getElementById('unOk').disabled"))
    A.screenshot(path=OUT + "2-error.png")
    A.evaluate("() => { window.__calls=[]; const a=__demoCloud.adapter; const o=a.call.bind(a); a.call=(n,p)=>{window.__calls.push(n);return o(n,p)}; }")
    typ(A, "admin"); A.click("#unCheck"); time.sleep(0.3); ok("3x nama terlarang tidak dikirim ke server", ev(A, "window.__calls").count("nameCheck") == 0)

    # 4. Nama tersedia → Konfirmasi aktif; ubah isian → nonaktif lagi
    typ(A, "Hanifan"); A.click("#unCheck"); wait_for(A, "document.getElementById('unOk') && !document.getElementById('unOk').disabled", 5)
    ok("4a '✅ Nama tersedia' + Konfirmasi aktif", "tersedia" in msg(A) and not ev(A, "document.getElementById('unOk').disabled"), msg(A))
    ok("4b periksa nama tidak menetapkan apa pun di server", ev(A, "(async()=>{const c=window.__demoCloud;return (await c.nameServer.nameGet(c.tokenOf('demo-a'))).has===false})()"))
    typ(A, "Hanifan2"); ok("4c mengubah isian membatalkan hasil periksa (Konfirmasi nonaktif)", ev(A, "document.getElementById('unOk').disabled"))
    typ(A, "Hanifan"); A.click("#unCheck"); wait_for(A, "!document.getElementById('unOk').disabled", 5)

    # 5. Nama sudah dipakai (milik akun lain) → pesan persis + saran; tidak otomatis memakai
    claimed_by_other(A, "demo-b", "Sari_Pancing")
    typ(A, "sari_pancing"); A.click("#unCheck"); wait_for(A, "document.querySelector('.un-chip')", 5)
    ok("5a pesan 'Nama sudah dipakai' persis", msg(A) == "❌ Nama sudah dipakai! Coba tambahkan nomor atau cari ide nama baru.", msg(A))
    chips = ev(A, "[...document.querySelectorAll('.un-chip')].map(c=>c.textContent)")
    ok("5b saran nama + nomor ditawarkan (bukan dipakai otomatis)", len(chips) >= 1 and all(c.lower().startswith("sari_pancing") for c in chips) and ev(A, "document.getElementById('unIn').value") == "sari_pancing" and ev(A, "document.getElementById('unOk').disabled"), chips)
    A.screenshot(path=OUT + "3-dipakai.png")
    A.click(".un-chip"); wait_for(A, "!document.getElementById('unOk').disabled", 5)
    ok("5c memilih saran = pemain yang memilih; lalu diperiksa & tersedia", ev(A, "document.getElementById('unIn').value") == chips[0] and not ev(A, "document.getElementById('unOk').disabled"), msg(A))

    # 6. Konfirmasi → langkah yakin → permanen
    typ(A, "Hanifan"); A.click("#unCheck"); wait_for(A, "!document.getElementById('unOk').disabled", 5)
    A.click("#unOk"); time.sleep(0.2); t = txt(A)
    ok("6a langkah konfirmasi menyebut permanen & tidak bisa diganti", "Hanifan" in t and "permanen" in t and "tidak bisa diganti" in t, t[:200])
    A.screenshot(path=OUT + "4-yakin.png")
    A.click("#unBack"); time.sleep(0.2); ok("6b 'Kembali' kembali ke form dengan nama terisi", ev(A, "document.getElementById('unIn').value") == "Hanifan")
    A.click("#unOk"); A.click("#unYes"); wait_for(A, "!!document.getElementById('unGo')", 8)
    ok("6c berhasil: sambutan dengan nama", "Selamat datang, Hanifan!" in txt(A), txt(A)[:120])
    ok("6d server menyimpan: usernames/hanifan milik akun ini", ev(A, "(async()=>{const c=window.__demoCloud;const g=await c.nameServer.nameGet(c.tokenOf('demo-a'));const d=await c.raw.get('usernames/hanifan');return g.has&&g.name==='Hanifan'&&d.uid==='demo-uid-a'})()"))
    A.screenshot(path=OUT + "5-selesai.png")
    A.click("#unGo"); time.sleep(0.3); ok("6e modal tertutup", not ev(A, "NW.username.isOpen()"))
    ok("6f nama karakter (playerName) = nama resmi, menggantikan nama lokal 'Budi'", ev(A, "NW.look.playerName()") == "Hanifan")
    if ev(A, "!document.getElementById('splash').classList.contains('hidden')"): A.click("#startBtn"); time.sleep(0.6)
    panel = ev(A, "NW.look.panelSection()")
    ok("6h panel profil menampilkan nama permanen terkunci (tanpa kolom ganti nama)", "Nama permanen" in panel and "pName" not in panel and "Hanifan" in panel)
    ev(A, "NW.look.act('saveName')"); ok("6i ganti nama via kode ditolak", ev(A, "Nusa.S.profile.name") == "Hanifan")
    ok("6k nama resmi tersimpan di simpanan lokal", json.loads(ev(A, "localStorage.getItem('nusa-island-v1')"))["profile"]["name"] == "Hanifan")

    # 7. Akun yang sudah punya nama tidak bisa ganti lewat server (klien nakal)
    r = ev(A, "(async()=>{try{await NW.cloud.call('nameClaim',{name:'Hanifan99'});return 'ok'}catch(e){return e.code+'|'+e.message}})()")
    ok("7 klaim kedua ditolak server (permanen)", "failed-precondition" in r and "tidak bisa diganti" in r, r)
    # 8. Muat ulang: tidak ada modal lagi; nama tetap
    time.sleep(2.5)   # beri waktu Chromium menyimpan localStorage (uji demo file:// kadang kehilangan tulisan terakhir bila reload seketika; terjadi juga tanpa fitur ini)
    A.reload(); wait_for(A, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.5)
    wait_for(A, "document.getElementById('gate') && !document.getElementById('gate').classList.contains('hidden')", 3)
    if ev(A, "!document.getElementById('gate').classList.contains('hidden')"): A.click("#gateGoogle")
    time.sleep(2.5)
    ok("8a muat ulang: modal tidak muncul lagi", not ev(A, "NW.username.isOpen()"))
    ok("8b nama resmi tetap", ev(A, "Nusa.S.profile.name") == "Hanifan" and ev(A, "NW.look.playerName()") == "Hanifan")
    ok("8c tanpa error JS", errs == [], errs); ctx.close()

    # 9. Server belum mendukung (not-found) → pemain TIDAK terkunci
    ctx = b.new_context(viewport={"width": 360, "height": 740}, has_touch=True)
    ctx.add_init_script("window.__demoAuto='demo-a';window.__demoAskName=true;")
    S = ctx.new_page(); S.goto(ROOT + "?cloud=demo"); wait_for(S, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8)
    S.evaluate("(()=>{const o=__demoCloud.adapter.call.bind(__demoCloud.adapter);__demoCloud.adapter.call=async(n,p)=>{if(/^name/.test(n))throw Object.assign(new Error('x'),{code:'not-found'});return o(n,p)}})()")
    S.click("#gateGoogle"); time.sleep(3)
    ok("9 endpoint nama belum ada di server → tidak ada modal, game tidak terkunci", not ev(S, "NW.username.isOpen()")); ctx.close()

    # 10. Offline saat memeriksa; lalu pulih
    ctx, O, errs = open_page(b, "demo-a", save("Budi"))
    typ(O, "Offline_Test"); ev(O, "__demoCloud.setOffline(true)"); O.click("#unCheck"); time.sleep(0.6)
    ok("10a offline: pesan koneksi jelas, modal tetap, tidak ada nama tertetapkan", "Koneksi bermasalah" in msg(O) and ev(O, "NW.username.isOpen()") and ev(O, "document.getElementById('unOk').disabled"), msg(O))
    ev(O, "__demoCloud.setOffline(false)"); O.click("#unCheck"); wait_for(O, "!document.getElementById('unOk').disabled", 5); ok("10b setelah online: bisa periksa lagi", not ev(O, "document.getElementById('unOk').disabled"), msg(O))
    # 11. Rebutan: nama diambil orang lain di antara 'periksa' dan 'konfirmasi'
    claimed_by_other(O, "demo-b", "offline_test")
    O.click("#unOk"); O.click("#unYes"); wait_for(O, "document.getElementById('unMsg') && document.getElementById('unMsg').innerText.includes('sudah dipakai')", 6)
    ok("11 nama keburu diambil: kembali ke form dengan pesan 'Nama sudah dipakai', akun belum punya nama", "Nama sudah dipakai" in msg(O) and ev(O, "(async()=>{const c=window.__demoCloud;return (await c.nameServer.nameGet(c.tokenOf('demo-a'))).has===false})()"), msg(O))
    ctx.close()

    # 12. Penanda resmi palsu di simpanan lokal tidak dipercaya (akun belum punya nama)
    forged = json.loads(save("Penyusup")); forged["profile"]["uname"] = "penyusup"
    ctx, F, errs = open_page(b, "demo-a", json.dumps(forged))
    ok("12 simpanan membawa penanda 'resmi' palsu → server menentukan: modal tetap muncul, penanda dibersihkan", ev(F, "NW.username.isOpen()") and not ev(F, "Nusa.S.profile.uname"), ev(F, "Nusa.S.profile.uname")); ctx.close()
    b.close()
fails = [x for x in R if x.startswith("FAIL")]
print(f"\nNama Pemain Permanen: {len(R) - len(fails)} lulus, {len(fails)} gagal"); sys.exit(1 if fails else 0)
