"""Uji NusaPhone (Ide 07) · TAHAP 2 — PlayGame (toko aplikasi) + TEPAT lima game + Ocean Spin (klien).
SERVER = Worker backend ASLI (cabang NusaPhone) di balik phone_bridge.mjs (Firestore TIRUAN, data sintetis). BUKAN bukti produksi. Butuh NUSA_BACKEND.
PG_ONLY=store|games|ocean|offline    Gambar: docs/ide07/"""
import os, sys, time, json
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import phone_harness as X
import test_phone_ui as U
from playwright.sync_api import sync_playwright
ev, wait_for, ok = X.ev, X.wait_for, X.ok
FIVE = [("oceanspin", "Ocean Spin", 800), ("balapperahu", "Balap Perahu", 1200), ("nusarush", "Nusa Rush", 1400), ("karangblast", "Karang Blast", 350), ("penjagalaut", "Penjaga Laut", 1800)]
def open_app(pg, app):
    U.open_phone(pg); U.unlock(pg); ev(pg, "(a)=>NW.phone.go('open',a)", app); U.settle(pg, 0.6)
def rows(pg): return ev(pg, "[...document.querySelectorAll('.pg-row')].map(r=>({id:r.dataset.g,name:r.querySelector('b').textContent,txt:r.textContent}))")
def eco(br, uid): return br.read("shop_economy/" + uid)
def sec_store(b, br):
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); uid = X.uid(A)
    br.post("/__eco", {"uid": uid, "set": {"bal": 5000}}); e0 = eco(br, uid)
    open_app(A, "playgame"); wait_for(A, "document.querySelectorAll('.pg-row').length>0", 10)
    r = rows(A); ok("S1 PlayGame menampilkan TEPAT lima game dengan nama & ukuran resmi", [(x["id"], x["name"]) for x in r] == [(i, n) for i, n, _ in FIVE] and len(r) == 5, [x["txt"][:40] for x in r])
    ok("S1b ukuran tampil benar (0,8 / 1,2 / 1,4 / 0,35 / 1,8 GB)", all(t in " ".join(x["txt"] for x in r) for t in ("0,8 GB", "1,2 GB", "1,4 GB", "0,35 GB", "1,8 GB")))
    ok("S2 tidak ada slot 'Segera Hadir' dan tidak ada 'Tangkap Ikan Kilat'", ev(A, "!/segera hadir|tangkap ikan kilat/i.test(document.getElementById('nphAppB').textContent)"))
    ok("S3 bilah penyimpanan: inti 3 GB dari 16 GB (ponsel dasar); semua belum terpasang", "3 GB dari 16 GB" in ev(A, "document.querySelector('.pg-stor small').textContent") and ev(A, "document.querySelectorAll('[data-get]').length") == 5, ev(A, "document.querySelector('.pg-stor small').textContent"))
    U.shot(A, "pg-412x915-toko-kosong")
    A.click("[data-get=karangblast]"); time.sleep(0.5)
    ok("S4 tekan Pasang → progres unduhan tampil (progressbar + persen) dan tombol Batal", ev(A, "!!document.querySelector('[data-g=karangblast] .pg-prog') && /Mengunduh/.test(document.querySelector('[data-g=karangblast]').textContent)") and ev(A, "!!document.querySelector('[data-cancel=karangblast]')"))
    U.shot(A, "pg-412x915-toko-unduh")
    ok("S5 selesai: tombol Main + Hapus; server mencatat terpasang; penyimpanan 3,35 GB", wait_for(A, "!!document.querySelector('[data-play=karangblast]')", 8) and br.read("shop_phone/" + uid)["inst"].get("karangblast", 0) > 0 and "3,35 GB" in ev(A, "document.querySelector('.pg-stor small').textContent"), ev(A, "document.querySelector('.pg-stor small').textContent"))
    A.click("[data-get=balapperahu]"); A.click("[data-cancel=balapperahu]") if wait_for(A, "!!document.querySelector('[data-cancel=balapperahu]')", 3) else None; time.sleep(0.4)
    ok("S6 Batal saat mengunduh: tidak terpasang & server tidak mencatat", "balapperahu" not in br.read("shop_phone/" + uid)["inst"] and ev(A, "!!document.querySelector('[data-get=balapperahu]')"))
    for g, _, _ in FIVE:
        if g == "karangblast": continue
        A.click("[data-get=%s]" % g); wait_for(A, "!!document.querySelector('[data-play=%s]')" % g, 12)
    inst = br.read("shop_phone/" + uid)["inst"]; ok("S7 kelima game terpasang bersamaan (8,55 GB dari 16 GB)", sorted(inst) == sorted(i for i, _, _ in FIVE) and "8,55 GB" in ev(A, "document.querySelector('.pg-stor small').textContent"), ev(A, "document.querySelector('.pg-stor small').textContent"))
    U.shot(A, "pg-412x915-toko-penuh")
    A.click("[data-del=penjagalaut]"); A.click("[data-del=penjagalaut]"); time.sleep(0.6)
    ok("S8 Hapus (konfirmasi dua ketukan): server menghapus, ruang kembali 1,8 GB", "penjagalaut" not in br.read("shop_phone/" + uid)["inst"] and "6,75 GB" in ev(A, "document.querySelector('.pg-stor small').textContent"), ev(A, "document.querySelector('.pg-stor small').textContent"))
    e1 = eco(br, uid); ok("S9 PlayGame tidak mengubah koin/inventaris/ekonomi", all(e1.get(k) == e0.get(k) for k in ("bal", "box", "spent", "earned", "up")), [e0.get("bal"), e1.get("bal")])
    # perangkat kedua, akun sama: status sama dari server
    ctx2, B2, errs2 = X.new_page(b, br, "demo-a", "Budi", vp=(360, 740)); U.phone_ready(B2); open_app(B2, "playgame"); wait_for(B2, "document.querySelectorAll('[data-play]').length>=4", 10)
    ok("S10 perangkat kedua (akun sama) melihat game terpasang yang sama (empat Main, satu Pasang)", ev(B2, "document.querySelectorAll('[data-play]').length") == 4 and ev(B2, "!!document.querySelector('[data-get=penjagalaut]')"))
    U.shot(B2, "pg-360x740-toko")
    ok("S11 tanpa galat skrip", not [e for e in errs + errs2 if "PAGEERR" in e], (errs + errs2)[:2]); ctx.close(); ctx2.close()

def setup_installed(br, uid, ids):
    for g in ids: br.fn(uid, "phoneInstall", {"opId": "t-inst-%s-%s" % (uid[-4:], g) + "x" * 3, "game": g})
def vis(pg, sel): return ev(pg, "(s)=>{const e=document.querySelector(s);return !!e&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'}", sel)
def canvas_ink(pg):   # kanvas tidak kosong: ada beragam warna
    return ev(pg, "(()=>{const c=document.querySelector('.pg-game canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,s=new Set();for(let i=0;i<d.length;i+=4*97)s.add(d[i]+','+d[i+1]+','+d[i+2]);return s.size})()")
def play_card(pg, gid):
    ev(pg, "(g)=>document.querySelector('[data-play='+g+']').click()", gid); wait_for(pg, "!!document.querySelector('.pg-game')", 10); time.sleep(0.4)
def karang_play(pg):
    for k in range(400):
        if vis(pg, ".pg-over"): return True
        r = rect(pg)
        for i in range(3):
            pg.mouse.click(r["l"] + (10 + i * 85 + 40) * r["s"], r["t"] + (8 + 8 * 30 + 14 + 30) * r["s"])
            if vis(pg, ".pg-over"): return True
            cx, cy = (k * 3 + i * 5) % 8, ((k * 3 + i * 5) // 8 + k) % 8
            pg.mouse.click(r["l"] + (15 + cx * 30 + 15) * r["s"], r["t"] + (8 + cy * 30 + 15) * r["s"])
    return vis(pg, ".pg-over")
def rect(pg): return ev(pg, "(()=>{const r=document.querySelector('.pg-game canvas').getBoundingClientRect();return {l:r.left,t:r.top,s:r.width/270}})()")
def sec_games(b, br):
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), extra_init="window.__ac=0;(function(){var AC=window.AudioContext||window.webkitAudioContext;if(AC){window.AudioContext=function(){window.__ac++;return new AC()}}})();"); U.phone_ready(A); uid = X.uid(A)
    br.post("/__eco", {"uid": uid, "set": {"bal": 5000}}); setup_installed(br, uid, ["balapperahu", "nusarush", "karangblast", "penjagalaut"]); e0 = eco(br, uid)
    open_app(A, "playgame"); wait_for(A, "document.querySelectorAll('[data-play]').length>=4", 10)
    shots = {"balapperahu": "pg-412x915-balap-perahu", "nusarush": "pg-412x915-nusa-rush", "karangblast": "pg-412x915-karang-blast", "penjagalaut": "pg-412x915-penjaga-laut"}
    for gid, name, _ in FIVE[1:]:
        t = name + ": "
        play_card(A, gid)
        ok("G-%s tutorial tampil sebelum main (judul + cara main + tombol Mulai)" % gid, vis(A, ".pg-tut") and "Mulai" in ev(A, "document.querySelector('.pg-tut').textContent") and name in ev(A, "document.querySelector('.pg-tut h4').textContent"))
        ac0 = ev(A, "window.__ac"); ok("G-%s audio MATI bawaan (tombol tidak aktif)" % gid, ev(A, "document.querySelector('[data-a=audio]').getAttribute('aria-pressed')") == "false")
        A.click("[data-a=start]"); time.sleep(1.2)
        ok("G-%s mulai: kanvas menggambar & skor tampil" % gid, canvas_ink(A) >= 4 and ev(A, "document.querySelector('.pg-sc').textContent") != "")
        if gid == "karangblast":
            r = rect(A); A.mouse.click(r["l"] + 55 * r["s"], r["t"] + 284 * r["s"]); A.mouse.click(r["l"] + 60 * r["s"], r["t"] + 60 * r["s"]); time.sleep(0.3)
            ok("G-%s kontrol sentuh: pilih potongan lalu ketuk papan menaruh blok (skor naik)" % gid, int(ev(A, "document.querySelector('.pg-sc').textContent")) > 0)
        else:
            keys = ev(A, "[...document.querySelectorAll('.pg-key')].map(k=>k.textContent)"); ok("G-%s tombol sentuh HP tampil: %s" % (gid, keys), len(keys) >= 1)
            for kk in ev(A, "[...document.querySelectorAll('.pg-key')].map(k=>k.dataset.k)"): A.dispatch_event("[data-k=%s]" % kk, "pointerdown"); A.dispatch_event("[data-k=%s]" % kk, "pointerup")
            A.mouse.click(*[v for v in (ev(A, "(()=>{const r=document.querySelector('.pg-game canvas').getBoundingClientRect();return [r.left+r.width*0.8,r.top+r.height*0.5]})()"))])
        time.sleep(0.5); U.shot(A, shots[gid])
        A.click("[data-a=pause]"); time.sleep(0.3); s0 = ev(A, "document.querySelector('.pg-sc').textContent")
        ok("G-%s jeda: panel Jeda tampil; skor tidak berubah saat dijeda" % gid, vis(A, ".pg-pause")); time.sleep(0.8); s1 = ev(A, "document.querySelector('.pg-sc').textContent")
        ok("G-%s skor beku saat jeda" % gid, s0 == s1, [s0, s1])
        ok("G-%s audio mati: tidak ada AudioContext baru selama main" % gid, ev(A, "window.__ac") == ac0)
        A.click("[data-a=resume]"); time.sleep(0.3); ok("G-%s lanjut dari jeda" % gid, not vis(A, ".pg-pause") and ev(A, "document.querySelector('.pg-game')!==null"))
        A.click("[data-a=audio]"); ok("G-%s tombol audio menyalakan/mematikan" % gid, ev(A, "document.querySelector('[data-a=audio]').getAttribute('aria-pressed')") == "true"); A.click("[data-a=audio]")
        if gid == "karangblast": done = karang_play(A)
        else: done = wait_for(A, "!document.querySelector('.pg-over').classList.contains('hidden')", 90, 0.5)
        ok("G-%s game over tercapai: panel Game over + skor + Main lagi" % gid, done and "Game over" in ev(A, "document.querySelector('.pg-over').textContent") and vis(A, "[data-a=restart]"))
        U.shot(A, shots[gid] + "-selesai") if gid == "penjagalaut" else None
        A.click(".pg-over [data-a=restart]"); time.sleep(0.6); ok("G-%s main ulang: game baru (skor mulai dari awal, tanpa panel)" % gid, not vis(A, ".pg-over") and int(ev(A, "document.querySelector('.pg-sc').textContent")) <= 15, ev(A, "document.querySelector('.pg-sc').textContent"))
        A.click("#nphBack"); time.sleep(0.5)
        ok("G-%s Kembali ke toko: game berhenti & kanvas dibuang" % gid, ev(A, "document.querySelector('.pg-game')") is None and vis(A, ".pg-store"))
    e1 = eco(br, uid); ok("G-eco empat game offline tidak memberi/mengambil koin, ikan, inventaris, kuota (ekonomi identik)", all(e1.get(k) == e0.get(k) for k in ("bal", "box", "spent", "earned", "up", "homeLv")) , [e0.get("bal"), e1.get("bal")])
    ok("G-err tanpa galat skrip", not [e for e in errs if "PAGEERR" in e], errs[:2]); ctx.close()
    # reduced motion sistem
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), reduced="reduce"); U.phone_ready(A); open_app(A, "playgame"); wait_for(A, "document.querySelectorAll('[data-play]').length>=4", 10)
    for gid, name, _ in FIVE[1:]:
        play_card(A, gid); A.click("[data-a=start]"); time.sleep(1.0); ok("G-rm-%s reduced motion: jalan tanpa galat, kanvas menggambar" % gid, canvas_ink(A) >= 3 and ev(A, "document.getElementById('nphRoot').classList.contains('rm')"))
        A.click("#nphBack"); time.sleep(0.4)
    ok("G-rm tanpa galat skrip", not [e for e in errs if "PAGEERR" in e], errs[:2]); ctx.close()

def os_wait_done(pg, tmo=60):
    t0 = time.time()
    while time.time() - t0 < tmo:
        if ev(pg, "(()=>{const k=document.querySelector('[data-r=skip]');if(k&&!k.classList.contains('hidden'))k.click();const m=document.querySelector('[data-r=msg]').textContent;const sp=document.querySelector('[data-r=spin]');return /Selesai|zonk|Gelembung|kosong|arisan|selfie|Laut|Ubur|cumi|kepiting|tidur|gagal|tidak/i.test(m)&&!sp.disabled||(/Selesai/.test(m))})()"): return True
        time.sleep(0.4)
    return False
def os_open(pg):
    open_app(pg, "playgame"); wait_for(pg, "document.querySelectorAll('[data-play]').length>=1", 10); play_card(pg, "oceanspin"); wait_for(pg, "!!document.querySelector('.os-odds table')", 10); time.sleep(0.3)
def os_bal(pg): return ev(pg, "document.querySelector('[data-r=bal]').textContent")
def sec_ocean(b, br):
    br.flag(phone=True, ocean=True)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); uid = X.uid(A)
    reqs = []; A.on("request", lambda r: reqs.append(r.url) if "/fn/oceanSpin" in r.url else None)
    br.post("/__eco", {"uid": uid, "set": {"bal": 20000, "box": [], "spent": 0}}); br.fn(uid, "phoneInstall", {"opId": "t-inst-os-0001", "game": "oceanspin"})
    os_open(A)
    odds = ev(A, "document.querySelector('.os-odds').textContent")
    ok("O1 tabel peluang & hadiah tampil SEBELUM SPIN (Zeus 0.05%, 100 kg, zonk, kombo ×5)", "Ikan Zeus Petir" in odds and "0.05%" in odds and "100 kg" in odds and "Zonk" in odds and "×5" in odds and not reqs, odds[:120])
    ok("O2 biaya 500 koin/spin tampil; aturan: tanpa pencairan/transfer, koin top-up tidak bisa dipakai", "500" in ev(A, "document.querySelector('.os-spin').textContent") and "top-up" in ev(A, "document.querySelector('.os-hint').textContent") and "tidak ada pencairan" in ev(A, "document.querySelector('.os-odds').textContent"))
    for _ in range(3): A.click('[data-d="1"]')
    ok("O3 pencacah 1–10: 4 spin → biaya 2.000 koin", ev(A, "document.querySelector('[data-r=n]').textContent") == "4" and ev(A, "document.querySelector('[data-r=cost]').textContent") == "2.000")
    A.click('[data-q=\"10\"]'); A.click('[data-d="1"]'); ok("O3b maksimum 10 spin = 5.000 koin", ev(A, "document.querySelector('[data-r=n]').textContent") == "10" and ev(A, "document.querySelector('[data-r=cost]').textContent") == "5.000")
    U.shot(A, "pg-412x915-oceanspin")
    e0 = eco(br, uid)["bal"]; A.click('[data-q=\"3\"]'); A.click("[data-r=spin]"); time.sleep(0.5)
    ok("O4 SPIN 3×: server memotong tepat 1.500 koin SEBELUM animasi selesai", eco(br, uid)["bal"] == e0 - 1500, [e0, eco(br, uid)["bal"]])
    ok("O4b tombol terkunci selama spin berjalan (tidak bisa klik ganda)", ev(A, "document.querySelector('[data-r=spin]').disabled"))
    done = os_wait_done(A); ok("O5 spin selesai; papan 5×3 (15 sel) tampil", done and ev(A, "document.querySelectorAll('.os-c').length") == 15)
    ok("O5b klik ganda cepat = HANYA satu permintaan oceanSpin (3 spin = satu opId)", len(reqs) == 1, reqs)
    # menang: ulangi batch 10 spin sampai ada hadiah (peluang menang ~20%/spin)
    held = 0
    for k in range(6):
        A.click('[data-q=\"10\"]'); A.click("[data-r=spin]"); os_wait_done(A, 90); time.sleep(0.4)
        st, info = br.fn(uid, "oceanInfo"); held = len(info["result"]["held"])
        if held >= 1: break
    ok("O6 hadiah masuk Koleksi hadiah (server) dan tampil di daftar dengan tombol Lepas", held >= 1 and ev(A, "document.querySelectorAll('[data-rel]').length") >= 1, held)
    U.shot(A, "pg-412x915-oceanspin-hadiah")
    cnt = ev(A, "document.querySelectorAll('[data-rel]').length"); A.click("[data-rel]"); time.sleep(0.2); ok("O6b Lepas minta konfirmasi (Yakin?)", "Yakin" in ev(A, "document.querySelector('[data-rel]').textContent")); A.click("[data-rel]"); time.sleep(1.2)
    ok("O6c Lepas: ikan hadiah berkurang satu di server (dan tidak ada uang/koin masuk)", len(br.fn(uid, "oceanInfo")[1]["result"]["held"]) == held - 1, held)
    # saldo tidak cukup
    br.post("/__eco", {"uid": uid, "set": {"bal": 400}}); n_req = len(reqs); os_open(A)
    ok("O7 saldo kurang: tombol SPIN nonaktif & tidak ada permintaan", ev(A, "document.querySelector('[data-r=spin]').disabled") and len(reqs) == n_req)
    st, r = br.fn(uid, "oceanSpin", {"opId": "t-os-poor-0001", "n": 1}); ok("O7b server menolak spin saat saldo kurang; saldo tetap 400, tidak ada hadiah", st != 200 and eco(br, uid)["bal"] == 400, [st, r])
    # coba ulang opId sama
    br.post("/__eco", {"uid": uid, "set": {"bal": 5000, "box": []}})
    st1, r1 = br.fn(uid, "oceanSpin", {"opId": "t-os-retry-0001", "n": 2}); st2, r2 = br.fn(uid, "oceanSpin", {"opId": "t-os-retry-0001", "n": 2})
    ok("O8 ulang opId yang sama: hasil identik, dipotong SEKALI (1.000)", st1 == 200 and st2 == 200 and r1["result"]["spins"] == r2["result"]["spins"] and r2["result"].get("duplicate") is True and eco(br, uid)["bal"] == 4000, [st1, st2, eco(br, uid)["bal"]])
    # pulih setelah putus: opId tertunda di penyimpanan lokal
    br.post("/__eco", {"uid": uid, "set": {"bal": 5000, "box": []}}); st, rr = br.fn(uid, "oceanSpin", {"opId": "t-os-pend-0001", "n": 2}); b1 = eco(br, uid)["bal"]
    ev(A, "()=>localStorage.setItem('nusa_os_pending_v1', JSON.stringify({opId:'t-os-pend-0001', n:2}))"); os_open(A); time.sleep(1.0); os_wait_done(A, 60)
    ok("O9 muat ulang saat spin tertunda: klien mengirim opId SAMA → pulih tanpa potong dua kali", eco(br, uid)["bal"] == b1 == 4000 and ev(A, "localStorage.getItem('nusa_os_pending_v1')") is None, [b1, eco(br, uid)["bal"]])
    # batas pembayaran
    ent = br.read("shop_entitlements/" + uid) or {}; w = dict(ent.get("wallet") or {}); w["NYATA"] = 99000; ent["wallet"] = w
    br.post("/__eco", {"uid": uid, "set": {"bal": 0, "box": []}, "ent": ent}); os_open(A)
    ok("O10 koin top-up (NYATA 99.000) TIDAK dapat dipakai: saldo bermain 0 → SPIN nonaktif", os_bal(A) == "0" and ev(A, "document.querySelector('[data-r=spin]').disabled"))
    st, r = br.fn(uid, "oceanSpin", {"opId": "t-os-topup-0001", "n": 1}); ent2 = br.read("shop_entitlements/" + uid)
    ok("O10b server menolak; koin top-up tetap 99.000 dan tidak terpakai", st != 200 and ent2["wallet"]["NYATA"] == 99000 and eco(br, uid)["bal"] == 0, [st, r])
    ctx.close()
    # dua perangkat / akun yang sama
    ctx1, P1, e1 = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); ctx2, P2, e2 = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(P1); U.phone_ready(P2)
    br.post("/__eco", {"uid": uid, "set": {"bal": 3000, "box": []}}); os_open(P1); os_open(P2)
    P1.click("[data-r=spin]"); time.sleep(0.4); P2.click("[data-r=spin]"); os_wait_done(P1, 40); os_wait_done(P2, 40)
    ok("O11 dua perangkat, akun sama: masing-masing 500 koin, total tepat 1.000 (tidak ganda/negatif)", eco(br, uid)["bal"] == 2000, eco(br, uid)["bal"])
    br.post("/__eco", {"uid": uid, "set": {"bal": 500, "box": []}}); P1.click("[data-r=spin]"); P2.click("[data-r=spin]"); os_wait_done(P1, 40); os_wait_done(P2, 40)
    ok("O11b saldo hanya cukup 1 spin: satu perangkat berhasil, satunya ditolak; saldo tidak negatif", eco(br, uid)["bal"] == 0, eco(br, uid)["bal"]); ctx1.close(); ctx2.close()
    # animasi BOOM + Zeus (peluang Zeus 0,05% — hasil dipaksa HANYA di lapisan jaringan uji untuk memeriksa animasi klien; keputusan tetap di server pada uji backend)
    for rm in ("no-preference", "reduce"):
        ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), reduced=rm); U.phone_ready(A); br.post("/__eco", {"uid": uid, "set": {"bal": 5000, "box": []}})
        def hook(route):
            r = route.fetch(); j = r.json(); res = j.get("result", j); bd = [0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0]
            res["spins"] = [{"board": [6, 6, 6, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0], "steps": [{"clear": [0, 1, 2], "sym": 6, "mult": 1, "after": bd}], "prize": {"name": "Ikan Zeus Petir", "w": 100, "fx": "petir", "u": "x", "id": "os_zeus"}, "mult": 1, "tease": 0}]
            route.fulfill(response=r, json=j)
        A.route("**/fn/oceanSpin", hook); os_open(A); A.click("[data-r=spin]")
        seen = wait_for(A, "document.querySelector('[data-r=fx]').textContent==='BOOM!'&&!document.querySelector('[data-r=fx]').classList.contains('hidden')", 15, 0.05)
        shake = ev(A, "document.querySelector('[data-r=board]').classList.contains('shake')")
        ok("O12-%s tiga Megalodon → teks BOOM! tampil%s" % (rm, "; layar bergetar ringan" if rm != "reduce" else "; reduced motion: TANPA getar"), seen and (shake if rm != "reduce" else not shake))
        if rm != "reduce": U.shot(A, "pg-412x915-oceanspin-boom")
        zeus = wait_for(A, ".os-card.zeus" and "!!document.querySelector('.os-card.zeus')", 20, 0.1); ok("O13-%s kartu hadiah Ikan Zeus Petir (petir) tampil" % rm, zeus and "100 kg" in ev(A, "document.querySelector('[data-r=msg]').textContent"))
        if rm != "reduce": U.shot(A, "pg-412x915-oceanspin-zeus")
        ctx.close()
    import glob; fs = sorted(os.path.basename(f) for f in glob.glob(os.path.join(H, "..", "..", "phone", "g-*.js"))) + ["oceanspin.js"] if os.path.exists(os.path.join(H, "..", "..", "phone", "oceanspin.js")) else []
    ok("O14 tepat LIMA modul game (Ocean Spin + 4) — tidak ada game keenam/slot 'segera hadir'", len(fs) == 5, fs)
def sec_offline(b, br):
    br.flag(phone=True, ocean=True)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915)); U.phone_ready(A); uid = X.uid(A)
    br.post("/__eco", {"uid": uid, "set": {"bal": 5000}}); setup_installed(br, uid, ["oceanspin", "karangblast"]); open_app(A, "playgame"); wait_for(A, "document.querySelectorAll('[data-play]').length>=2", 10)
    ctx.set_offline(True); time.sleep(0.5); ev(A, "()=>window.dispatchEvent(new Event('offline'))"); time.sleep(1.5); U.settle(A, 0.5)
    ok("F1 offline: peringatan koneksi terputus tampil di PlayGame", wait_for(A, "/Koneksi terputus/.test(document.getElementById('nphAppB').textContent)", 15))
    ok("F2 offline: tombol Pasang/Hapus tidak aktif", ev(A, "[...document.querySelectorAll('[data-get],[data-del]')].every(b=>b.disabled)"))
    ev(A, "document.querySelector('[data-play=oceanspin]').click()"); time.sleep(0.8)
    ok("F3 offline: Ocean Spin terkunci (panel butuh koneksi), tidak ada papan spin", ev(A, "!document.querySelector('.os-board')"))
    A.click("#nphBack") if ev(A, "!!document.querySelector('.pg-store')") is False else None
    ctx.set_offline(False); ctx.close()

def main():
    br = U.PB()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(); only = os.environ.get("PG_ONLY", "")
            for name, fn in (("store", sec_store), ("games", sec_games), ("ocean", sec_ocean), ("offline", sec_offline)):
                if not only or only == name: fn(b, br)
            b.close()
    finally: br.close()
    f = [r for r in X.R if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(X.R) - len(f), len(f)))
    sys.exit(1 if f else 0)
if __name__ == "__main__": main()
