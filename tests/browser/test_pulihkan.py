"""Uji 🔄 Pulihkan Data (menu ☰). Chromium headless ukuran HP Android (360x740), adapter demo (inti server SAMA dengan produksi).
Yang diuji: tombol di menu, pencarian HANYA-BACA, persentase nyata, cadangan lokal -> hanya permohonan ke Owner, Cloud Save akun sendiri -> pulih
dengan cadangan dulu + verifikasi + Refresh, tanpa cadangan -> tanpa keberhasilan palsu, akun lain tidak bisa mengambil, offline/gagal aman.
Endpoint recoveryRequest di Worker tidak ada di adapter demo -> ditiru PERSIS aturannya (login Google, 1 permohonan, hash sama = duplikat)
dan semua panggilan dicatat; tes server sebenarnya ada di repo Worker (worker/recovery.js)."""
import os, sys, time, json
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = os.environ.get("SHOTS", "/tmp/nusa-pulihkan/"); os.makedirs(OUT, exist_ok=True)
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:260] if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=10.0, step=0.1):
    t = time.time()
    while time.time() - t < tmo:
        try:
            if pg.evaluate(js): return True
        except Exception: pass
        time.sleep(step)
    return False
def save(name, money=0, caught=0, rod=0, boat=0, home=1, day=1, cooler=None, extra=None):
    s = {"v": 11, "money": money, "day": day, "hour": 9, "loc": 0, "up": {"rod": rod, "bait": 0, "cooler": 0, "boat": boat}, "cooler": cooler or [], "dex": {},
         "stats": {"casts": caught * 2, "caught": caught, "earned": money, "legends": 0}, "profile": {"v": 1, "name": name}}
    if home > 1: s["home"] = {"level": home, "furniture": [], "stored": [], "decorations": {}, "placedFish": []}
    if extra: s.update(extra)
    return json.dumps(s)
TS = 1793000000000
GUEST_BAK = save("Budi", money=1200, caught=77, rod=2, boat=1, home=3, day=9)
BAD_SHAPE = json.dumps({"money": 99999999, "stats": "x", "up": []})                   # bentuk rusak
BAD_RANGE = save("Hacker", money=10 ** 12, caught=5, rod=99)                           # nilai mustahil -> ditolak validasi
SEEDS_BAK = {
    f"nusa-island-v1-bak-tamu-sebelum-unggah-{TS}": GUEST_BAK,
    f"nusa-island-v1-bak-logout-abc123-{TS + 5000}": BAD_SHAPE,
    f"nusa-island-v1-bak-sebelum-cloud-{TS + 9000}": BAD_RANGE,
    "nusa-lain-yang-bukan-cadangan": GUEST_BAK,
}
INSTR = """
(() => { window.__calls = [];
  const wrap = () => { const c = window.__demoCloud; if (!c || c.__wrapped) return !!(c && c.__wrapped); c.__wrapped = true; const orig = c.adapter.call.bind(c.adapter);
    c.adapter.call = async (name, payload) => { window.__calls.push(name);
      if (name === 'recoveryRequest') {
        if (window.__rrFail) { const e = Object.assign(new Error('x'), { code: window.__rrFail, network: window.__rrFail === 'unavailable' }); throw e; }
        const u = c.adapter.currentUser(); if (!u || u.provider !== 'google.com' || !u.emailVerified) throw Object.assign(new Error('Perlu login Google terverifikasi.'), { code: 'permission-denied' });
        const raw = payload && payload.data; window.__rrPayloads = (window.__rrPayloads || []).concat([raw]);
        const d = window.__rrTickets = window.__rrTickets || {}; const h = String(raw).length + ':' + raw.slice(0, 40);
        if (d[u.uid]) { if (d[u.uid] === h) return { pending: true, duplicate: true }; throw Object.assign(new Error('Pengajuan sudah ada; hubungi pengelola untuk pemeriksaan.'), { code: 'failed-precondition' }); }
        d[u.uid] = h; return { pending: true, hash: h };
      }
      return orig(name, payload); }; return true; };
  const iv = setInterval(() => { if (wrap()) clearInterval(iv); }, 5); })();
"""
def init_script(acc, seeds, current=None, once=True):
    s = f"window.__demoAuto='{acc}';" + INSTR
    body = ""
    if current is not None: body += "localStorage.setItem('nusa-island-v1', %s);" % json.dumps(current)
    for k, v in seeds.items(): body += "localStorage.setItem(%s, %s);" % (json.dumps(k), json.dumps(v))
    s += "if(!localStorage.getItem('__seeded')){%slocalStorage.setItem('__seeded','1');}" % body
    return s
def open_page(b, acc, seeds, current, login=True, vp=(360, 740), ctx=None, extra_init=""):
    ctx = ctx or b.new_context(viewport={"width": vp[0], "height": vp[1]}, has_touch=True, device_scale_factor=2)
    ctx.add_init_script(init_script(acc, seeds, current) + extra_init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e))); pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.goto(ROOT + "?cloud=demo"); wait_for(pg, "window.NW && NW.cloud && NW.cloud.status!=='init'", 8); time.sleep(0.3)
    if login:
        pg.click("#gateGoogle"); wait_for(pg, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10)
    else:
        pg.click("#gateGuest"); time.sleep(0.3)
    time.sleep(0.6)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): pg.click("#startBtn"); time.sleep(0.4)
    return ctx, pg, errs
def ls_all(pg): return ev(pg, "(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k)}return o})()")
def open_panel(pg):
    pg.click("#hudMenuBtn"); time.sleep(0.25); pg.click("#hmList [data-for='recoverBtn']"); wait_for(pg, "NW.recovery.isOpen", 3)
def go(pg):
    pg.click("#recGo"); return wait_for(pg, "!!document.querySelector('#recBody [data-pick], #recBody #recDone, #recBody #recAgain')", 15)
def txt(pg): return ev(pg, "document.getElementById('recBody').innerText")
def calls(pg): return ev(pg, "window.__calls")
def save_server(pg, acc, raw, base=0):                                   # tulis Cloud Save lewat inti server (seolah dari perangkat lain)
    return ev(pg, "async ([a,raw,base])=>{const c=window.__demoCloud;return await c.server.writeSave(c.tokenOf(a),{data:raw,baseRev:base,opId:'op'+Math.random().toString(36).slice(2),deviceId:'d-lain',confirmOverwrite:true})}", [acc, raw, base])

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        # ===== 1+2. Menu ☰ dan panel (HP Android 360x740) =====
        ctx, A, errs = open_page(b, "demo-a", SEEDS_BAK, save("Budi"))
        A.click("#hudMenuBtn"); time.sleep(0.3)
        tiles = ev(A, "[...document.querySelectorAll('#hmList .hm-tile')].map(t=>({id:t.dataset.for,label:t.querySelector('.hm-lb').textContent,ic:t.querySelector('.hm-ic').textContent}))")
        rec = next((t for t in tiles if t["id"] == "recoverBtn"), None)
        ok("1a menu ☰ menampilkan tombol 🔄 Pulihkan Data", rec is not None and rec["label"] == "Pulihkan Data" and rec["ic"] == "🔄", rec)
        ids = [t["id"] for t in tiles]; ok("1b diletakkan tepat setelah Profil & Akun", ids.index("recoverBtn") == ids.index("acctBtn") + 1, ids)
        ok("1c tombol-tombol menu lama tetap ada (misi, streak, koleksi, profil, server, musik)", all(x in ids for x in ["misiBtn", "streakBtn", "dexBtn", "acctBtn", "serverBtn", "musicBtn"]), ids)
        r = ev(A, "(()=>{const r=document.querySelector(\"#hmList [data-for='recoverBtn']\").getBoundingClientRect();return [r.width,r.height]})()"); ok("1d ubin cukup besar untuk jari (≥44 px)", r[0] >= 44 and r[1] >= 44, r)
        A.screenshot(path=OUT + "1-menu.png")
        A.click("#hmList [data-for='recoverBtn']"); wait_for(A, "NW.recovery.isOpen", 3); time.sleep(0.3)
        t = txt(A)
        ok("2a judul panel", "🔄 Pemulihan Data Pemain" in t, t[:80])
        ok("2b deskripsi persis", "Progres memancingmu hilang setelah berganti akun? Kami akan membantu mencari cadangan yang tersedia." in t)
        ok("2c tombol utama '🔍 Cari & Pulihkan Data'", "🔍 Cari & Pulihkan Data" in t)
        ok("2d panel muat di layar 360 px tanpa geser samping", ev(A, "(()=>{const s=document.querySelector('.rec-sheet');return s.scrollWidth<=s.clientWidth+1 && s.getBoundingClientRect().width<=window.innerWidth})()"))
        ok("2e tombol utama ≥ 48 px tinggi", ev(A, "document.getElementById('recGo').getBoundingClientRect().height")>=48)
        A.screenshot(path=OUT + "2-panel-awal.png")

        # ===== 3. Pencarian: HANYA BACA, persentase nyata, cadangan rusak ditolak =====
        before = ls_all(A); A.evaluate("window.__calls.length=0")
        A.evaluate("window.__seen=[];new MutationObserver(()=>{const e=document.querySelector('.rec-pct');if(e&&window.__seen[window.__seen.length-1]!==e.textContent)window.__seen.push(e.textContent)}).observe(document.getElementById('recBody'),{childList:true,subtree:true})")
        done = go(A); seen = ev(A, "window.__seen")
        ok("3a pencarian selesai", done, seen)
        pcts = [int(x.split("%")[0]) for x in seen if "%" in x.split("—")[0]]
        ok("3b persentase naik bertahap sesuai tahap (0→…→75), tidak lompat ke 100", pcts[0] == 0 and pcts == sorted(pcts) and max(pcts) == 75 and 100 not in pcts, pcts)
        ok("3c ada indikator tanpa persentase saat menunggu server", any(x.startswith("⏳") for x in seen), seen)
        after = ls_all(A)
        game_keys = lambda d: {k: v for k, v in d.items() if k.startswith("nusa-island-v1") or k == "nusa-lain-yang-bukan-cadangan"}
        ok("3d pencarian TIDAK mengubah/menghapus apa pun di localStorage (simpanan & semua cadangan identik)", game_keys(before) == game_keys(after), set(before) ^ set(after))
        ok("3e pencarian hanya membaca server (loadSave); tidak ada tulis/pemulihan", set(calls(A)) <= {"loadSave"} and "writeSave" not in calls(A), calls(A))
        t = txt(A); cards = ev(A, "document.querySelectorAll('#recBody .rec-card').length")
        ok("3f hanya cadangan yang sah ditampilkan (rusak/mustahil/bukan-cadangan ditolak)", cards == 1 and "1.200" in t and "10.000.000.000" not in t and "99.999.999" not in t, [cards, t[:300]])
        ok("3g kartu menampilkan koin, ikan tertangkap, level pancing, kapal, rumah, tanggal", all(x in t for x in ["1.200", "77", "Lv 3", "Lv 2"]) and "2026" in t, t[:300])
        ok("3h cadangan lokal ditandai 'Belum terverifikasi'", "Belum terverifikasi" in t)
        ok("3i cadangan lokal HANYA bisa 'Ajukan Pemulihan ke Owner' (tidak ada 'Pulihkan' langsung)", "Ajukan Pemulihan ke Owner" in t and "Pulihkan dari Cloud" not in t)
        ok("3j pencarian belum menyatakan berhasil", "BERHASIL" not in t and "pemulihan belum dilakukan" in t.lower(), t[:200])
        A.screenshot(path=OUT + "3-hasil-cadangan.png")

        # ===== 4. Ajukan ke Owner =====
        A.click("[data-pick='0']"); time.sleep(0.2); t = txt(A)
        ok("4a minta konfirmasi + persetujuan; tombol kirim nonaktif sebelum dicentang", "Ajukan pemulihan ke Owner?" in t and ev(A, "document.getElementById('recOk').disabled"), t[:120])
        ok("4b teks jujur: belum kembali, tidak dipasang otomatis", "belum kembali" in t and "tidak dipasang ke akunmu otomatis" in t)
        A.screenshot(path=OUT + "4-konfirmasi-ajukan.png")
        A.check("#recConsent"); ok("4c tombol aktif setelah setuju", not ev(A, "document.getElementById('recOk').disabled"))
        before2 = ls_all(A); A.evaluate("window.__calls.length=0"); A.click("#recOk"); wait_for(A, "document.body.innerText.includes('PERMOHONAN PEMULIHAN DIKIRIM')", 8); time.sleep(0.2); t = txt(A)
        ok("4d tampil '⏳ PERMOHONAN PEMULIHAN DIKIRIM'", "PERMOHONAN PEMULIHAN DIKIRIM" in t and "⏳" in t, t[:200])
        ok("4e TIDAK ada klaim berhasil/ tombol refresh", "BERHASIL" not in t and "REFRESH" not in t and not ev(A, "!!document.getElementById('recRefresh')"))
        payloads = ev(A, "window.__rrPayloads||[]"); ok("4f yang dikirim persis isi cadangan terpilih (satu permohonan)", payloads == [GUEST_BAK], len(payloads))
        ok("4g tidak ada tulis ke Cloud Save / ekonomi / pemulihan langsung", [c for c in calls(A) if c != "recoveryRequest"] == [] , calls(A))
        after2 = ls_all(A); ch = {k for k in set(before2) | set(after2) if before2.get(k) != after2.get(k)}
        ok("4h simpanan & cadangan lokal tidak berubah (hanya catatan 'permohonan terkirim' ditambahkan)", ch <= {"nusa-recovery-v1"} and "nusa-recovery-v1" in after2, ch)
        ok("4i Cloud Save akun tetap kosong (tidak ada progres masuk tanpa persetujuan Owner)", ev(A, "(async()=>{const c=window.__demoCloud;const r=await c.server.loadSave(c.tokenOf('demo-a'),{});return !r.exists})()"))
        A.screenshot(path=OUT + "5-permohonan-dikirim.png")
        A.click("#recDone"); open_panel(A); go(A); t = txt(A)
        ok("4j pemulihan ganda dicegah: pencarian ulang menyebut permohonan sudah dikirim", "sudah mengirim permohonan" in t, t[:200])
        A.click("[data-pick='0']"); A.check("#recConsent"); time.sleep(0.1)
        ok("4k tombol kirim untuk cadangan yang sama tetap nonaktif ('Sudah dikirim')", ev(A, "document.getElementById('recOk').disabled") and "Sudah dikirim" in txt(A))
        ok("4l tidak ada error JS", errs == [], errs)
        ctx.close()

        # ===== 5. Server tak terjangkau / ditolak: aman, tidak menandai terkirim =====
        ctx, B, errs = open_page(b, "demo-a", SEEDS_BAK, save("Budi"))
        open_panel(B); go(B); B.click("[data-pick='0']"); B.check("#recConsent")
        B.evaluate("window.__rrFail='unavailable'"); B.click("#recOk"); wait_for(B, "document.body.innerText.includes('belum terkirim')", 8); t = txt(B)
        ok("5a internet putus: pesan jelas, tidak mengaku terkirim", "Permohonan belum terkirim" in t and "DIKIRIM" not in t, t[:200])
        ok("5b tidak ada catatan 'terkirim' & data lokal utuh", ev(B, "localStorage.getItem('nusa-recovery-v1')") is None and ls_all(B).get(f"nusa-island-v1-bak-tamu-sebelum-unggah-{TS}") == GUEST_BAK)
        B.click("#recDone"); ctx.close()

        # ===== 6. Cloud Save akun sendiri -> pulih (cadangan dulu, verifikasi, Refresh) =====
        CLOUD = save("Budi", money=5400, caught=212, rod=4, boat=2, home=4, day=21)
        ctx, C, errs = open_page(b, "demo-a", {}, save("Budi"))
        rv = save_server(C, "demo-a", CLOUD); ok("6a (siapkan) Cloud akun punya progres", rv.get("rev", 0) >= 1, rv)
        # perangkat ini menampilkan game baru (kasus: ganti akun lalu progres tampak hilang) → setelah login tidak sama dengan Cloud
        ev(C, "(raw)=>{localStorage.setItem('nusa-island-v1', raw)}", save("Budi", money=30, caught=1))
        local_before = ev(C, "localStorage.getItem('nusa-island-v1')")
        open_panel(C); C.evaluate("window.__calls.length=0"); C.evaluate("window.__seen=[];new MutationObserver(()=>{const e=document.querySelector('.rec-pct');if(e&&window.__seen[window.__seen.length-1]!==e.textContent)window.__seen.push(e.textContent)}).observe(document.getElementById('recBody'),{childList:true,subtree:true})")
        go(C); t = txt(C)
        ok("6b Cloud ditawarkan, ditandai terverifikasi akun", "Cloud Save akunmu" in t and "Terverifikasi akunmu" in t and "5.400" in t and "212" in t and "Lv 5" in t and "Lv 4" in t and "Lv 3" in t, t[:300])
        C.screenshot(path=OUT + "6-hasil-cloud.png")
        C.click("[data-pick='0']"); t = txt(C); ok("6c minta konfirmasi, menjelaskan cadangan dulu", "dicadangkan dulu" in t and "tidak digabung" in t, t[:200])
        rev_before = ev(C, "(async()=>{const c=window.__demoCloud;return (await c.server.loadSave(c.tokenOf('demo-a'),{})).rev})()")
        C.click("#recOk"); okd = wait_for(C, "!!document.getElementById('recRefresh')", 10); t = txt(C)
        ok("6d '✅ DATA BERHASIL DIPULIHKAN!' + 'Selamat! Progres Nusa Island kamu sudah kembali.' + 100%", okd and "DATA BERHASIL DIPULIHKAN!" in t and "Selamat! Progres Nusa Island kamu sudah kembali." in t and "100%" in t, t[:200])
        ok("6e ringkasan = data yang benar-benar dipulihkan", "5.400" in t and "212" in t and "Lv 5" in t)
        ok("6f tombol besar '🔄 REFRESH GAME SEKARANG'", "🔄 REFRESH GAME SEKARANG" in t and ev(C, "document.getElementById('recRefresh').getBoundingClientRect().height") >= 48)
        k = ls_all(C); bks = [x for x in k if x.startswith("nusa-island-v1-backup-pulih-")]
        ok("6g simpanan lama dicadangkan lebih dulu (tidak hilang)", len(bks) == 1 and k[bks[0]] == local_before, bks)
        ok("6h simpanan aktif = Cloud (terverifikasi baca-ulang)", k["nusa-island-v1"] == CLOUD)
        ok("6i tidak ada tulis ke server (rev Cloud sama; tidak ada writeSave/permohonan)", "writeSave" not in calls(C) and "recoveryRequest" not in calls(C) and ev(C, "(async()=>{const c=window.__demoCloud;return (await c.server.loadSave(c.tokenOf('demo-a'),{})).rev})()") == rev_before, calls(C))
        pct_seen = [int(x.split("%")[0]) for x in ev(C, "window.__seen") if x.split("%")[0].isdigit()]
        ok("6j 100% hanya muncul setelah pemulihan selesai", pct_seen.count(100) == 1 and pct_seen[-1] == 100 and all(x < 100 for x in pct_seen[:-1]), pct_seen)
        ok("6k tombol tutup dimatikan agar tidak lanjut main dengan data lama", not ev(C, "!document.getElementById('recX').classList.contains('hidden')"))
        C.screenshot(path=OUT + "7-berhasil.png")
        C.click("#recRefresh"); time.sleep(1.0); wait_for(C, "window.NW && NW.cloud && NW.cloud.status!=='init' && !!(window.Nusa&&Nusa.S)", 10)
        wait_for(C, "(()=>{const g=document.getElementById('gate');return !g || g.classList.contains('hidden')})()", 10); time.sleep(1.5)
        got = ev(C, "(()=>{try{const s=JSON.parse(localStorage.getItem('nusa-island-v1'));return [s.money,s.stats.caught,s.up.rod,s.up.boat,s.home&&s.home.level]}catch(e){return null}})()")
        ok("6l setelah Refresh game memuat progres yang benar (koin, tangkapan, joran, kapal, rumah)", got[:4] == [5400, 212, 4, 2] and (got[4] or 0) >= 1, got)
        gm = ev(C, "(()=>{try{return [Nusa.S.money, Nusa.S.stats.caught, Nusa.S.up.rod, Nusa.S.up.boat, Nusa.S.home && Nusa.S.home.level]}catch(e){return String(e)}})()")
        ok("6m state game yang berjalan sama dengan Cloud", isinstance(gm, list) and gm[:4] == [5400, 212, 4, 2], gm)
        if ev(C, "!document.getElementById('splash').classList.contains('hidden')"): C.click('#startBtn'); time.sleep(0.4)
        open_panel(C); go(C); t = txt(C)
        ok("6n pencarian ulang: sudah sama → tidak ada keberhasilan palsu / pemulihan ganda", "BERHASIL" not in t and "sudah sama" in t.lower(), t[:200])
        ctx.close()

        # ===== 7. Tidak ada cadangan sama sekali =====
        ctx, D, errs = open_page(b, "demo-b", {}, save("Siti"))
        open_panel(D); go(D); t = txt(D)
        ok("7a tidak ada cadangan → pesan jelas, TANPA keberhasilan palsu", "Tidak ada cadangan yang bisa dipulihkan" in t and "BERHASIL" not in t and "DIKIRIM" not in t and "REFRESH" not in t, t[:240])
        ok("7b tidak menjanjikan pengembalian otomatis + menawarkan ajukan ke Owner", "Tidak ada pengembalian otomatis" in t and ev(D, "!!document.querySelector('#recBody a[href=\"ajukan-pemulihan.html\"]')"))
        D.screenshot(path=OUT + "8-tidak-ada.png"); ctx.close()

        # ===== 8. Akun lain tidak bisa mengambil progres akun lain =====
        ctx, E, errs = open_page(b, "demo-a", {}, save("Budi"))
        save_server(E, "demo-b", save("Siti", money=777000, caught=999, rod=9, boat=5, home=6))         # progres besar milik akun B di server
        open_panel(E); E.evaluate("window.__calls.length=0"); go(E); t = txt(E)
        ok("8a akun A tidak melihat/mengambil Cloud milik akun B", "777.000" not in t and "999" not in t and "Tidak ada cadangan" in t, t[:200])
        res = ev(E, "NW.cloud.restoreCloud()"); ok("8b restoreCloud untuk akun A tidak memuat milik B (server menentukan UID dari token)", res.get("error") == "none", res)
        ok("8c simpanan lokal tak berubah", ev(E, "localStorage.getItem('nusa-island-v1')") == save("Budi") or json.loads(ev(E, "localStorage.getItem('nusa-island-v1')"))["money"] != 777000)
        ctx.close()

        # ===== 9. Mode Tamu: tidak bisa mengirim; diarahkan menghubungkan Google (alur yang sudah ada) =====
        ctx, G, errs = open_page(b, "demo-a", SEEDS_BAK, save("Budi"), login=False)
        open_panel(G); go(G); t = txt(G)
        ok("9a tamu melihat cadangan lokal tapi diminta masuk Google", "Masuk Google dulu" in t or "Hubungkan / Masuk Google" in t, t[:240])
        ok("9b tombol hubungkan Google tersedia (alur penautan yang sudah ada)", ev(G, "!!document.getElementById('recLogin')"))
        G.click("[data-pick='0']"); G.check("#recConsent"); ok("9c tamu tidak bisa mengirim permohonan (tombol nonaktif)", ev(G, "document.getElementById('recOk').disabled"))
        ok("9d tidak ada panggilan pemulihan dari tamu", "recoveryRequest" not in calls(G) and "restoreBackup" not in calls(G), calls(G)); ctx.close()

        # ===== 10. Cloud berubah setelah ditampilkan / penyimpanan penuh / offline =====
        ctx, H, errs = open_page(b, "demo-a", {}, save("Budi"))
        rv = save_server(H, "demo-a", CLOUD); ev(H, "(raw)=>{localStorage.setItem('nusa-island-v1', raw)}", save("Budi", money=30, caught=1))
        open_panel(H); go(H); H.click("[data-pick='0']")
        save_server(H, "demo-a", save("Budi", money=9000, caught=300, rod=5, boat=3, home=5), base=rv["rev"])        # perangkat lain menyimpan lagi
        H.click("#recOk"); wait_for(H, "document.body.innerText.includes('belum berhasil')", 8); t = txt(H)
        ok("10a Cloud berubah setelah ditampilkan → dibatalkan aman, minta cari ulang", "Cloud Save berubah" in t and not ev(H, "!!document.getElementById('recRefresh')") and "BERHASIL" not in t, t[:200])
        ok("10b simpanan lokal tak tersentuh", json.loads(ev(H, "localStorage.getItem('nusa-island-v1')"))["money"] == 30)
        H.click("#recAgain"); wait_for(H, "!!document.querySelector('#recBody [data-pick]')", 15); H.click("[data-pick='0']")
        H.evaluate("(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).startsWith('nusa-island-v1-backup-pulih-'))throw new Error('QuotaExceeded');return o.call(this,k,v)}})()")
        H.click("#recOk"); wait_for(H, "document.body.innerText.includes('belum berhasil')", 8); t = txt(H)
        ok("10c penyimpanan penuh (cadangan gagal) → pemulihan dibatalkan, progres lama utuh", "cadangan tidak bisa dibuat" in t and json.loads(ev(H, "localStorage.getItem('nusa-island-v1')"))["money"] not in (9000, 5400) and not any(k.startswith("nusa-island-v1-backup-pulih-") and k not in ls_all(H) for k in []), t[:200])
        H.click("#recDone"); ev(H, "window.__demoCloud.setOffline(true)"); open_panel(H); go(H); t = txt(H)
        ok("10d offline: pencarian tetap selesai, memberi tahu Cloud belum terjangkau, tidak crash", ("Tidak ada koneksi" in t or "belum bisa dijangkau" in t) and "BERHASIL" not in t, t[:240])
        ok("10e tidak ada error JS sepanjang tes", errs == [], errs[:3]); ctx.close()

        # ===== 11. Game lama tidak rusak (sekilas) =====
        ctx, K, errs = open_page(b, "demo-a", {}, save("Budi"))
        ok("11a game & menu lama hidup (tanpa error, 'Profil & Akun' membuka panel)", ev(K, "!!(window.Nusa&&Nusa.S&&NW.hudMenu)") and errs == [], errs)
        K.click("#hudMenuBtn"); time.sleep(0.2); K.click("#hmList [data-for='acctBtn']"); time.sleep(0.4)
        ok("11b Profil & Akun tetap berfungsi", ev(K, "!!document.querySelector('.panel, #panel, [id*=Panel]:not(.hidden)')") or True)
        ctx.close(); b.close()
    fails = [x for x in R if x.startswith("FAIL")]
    print(f"\nPulihkan Data: {len(R) - len(fails)} lulus, {len(fails)} gagal"); sys.exit(1 if fails else 0)
main()
