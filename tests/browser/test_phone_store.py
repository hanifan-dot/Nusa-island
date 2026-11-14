"""Uji NusaPhone (Ide 07) · TAHAP 5 — Toko NusaPhone fisik di Kota + etalase enam model. SERVER = Worker backend ASLI + Firestore TIRUAN + server realtime uji. BUKAN bukti produksi.
PT_ONLY=flag|toko|beli|pulih|premium|layout     Butuh NUSA_BACKEND. Gambar: docs/ide07/"""
import os, sys, time, json, re
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import phone_harness as X
import test_phone_ui as U
from playwright.sync_api import sync_playwright
ev, wait_for, ok = X.ev, X.wait_for, X.ok
KOTA = "window.NUSA_KOTA=true;"
DOOR = (64.2, 32.0)
def eco(br, uid): return br.read("shop_economy/" + uid)
def ph(br, uid): return br.read("shop_phone/" + uid) or {}
def go_door(pg):
    ev(pg, "NW.world.onEnter('start','selat')"); wait_for(pg, "NW.areas.cur.id==='selat'", 6); time.sleep(0.3)
    ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera&&NW.world.snapCamera()}", list(DOOR)); time.sleep(0.8)
def exterior_shot(pg, name):   # sudut pandang luar toko: mundur dari pintu, sembunyikan toast sambutan (hanya untuk tangkapan layar)
    ev(pg, "(()=>{const t=document.querySelector('.nph-toast');if(t)t.classList.add('hidden')})()")
    ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera&&NW.world.snapCamera()}", [DOOR[0] + 2.7, DOOR[1] + 2.2]); time.sleep(1.0); U.shot(pg, name)
    ev(pg, "(a)=>{const p=NW.world.player;p.x=a[0];p.y=a[1];NW.world.snapCamera&&NW.world.snapCamera()}", list(DOOR)); time.sleep(0.6)
def point(pg): return ev(pg, "(NW.kota.points.find(p=>p.id==='kota:nusaphone')||{}).label||null")
def store_open(pg): return ev(pg, "!!document.getElementById('nphStore')")
def enter(pg):
    ev(pg, "NW.world.interact()"); return wait_for(pg, "!!document.getElementById('nphStore')", 10)
def card_ready(pg): return wait_for(pg, "(()=>{const e=document.querySelector('#nphStore [data-r=price]');return !!e&&/\\d/.test(e.textContent)})()", 10)
def chip(pg, m): pg.click("#nphStore [data-m='%s']" % m); time.sleep(0.2)
def bal_txt(pg): return ev(pg, "document.querySelector('#nphStore [data-r=bal]').textContent")
def msg(pg): return ev(pg, "(document.querySelector('#nphStore [data-r=msg]')||{}).textContent||''")
def buy(pg):
    pg.click("#nphStore [data-a=buy]"); wait_for(pg, "!!document.querySelector('#nphStore [data-a=buy-yes]')", 5); pg.click("#nphStore [data-a=buy-yes]")
def settle_buy(pg, tmo=12): return wait_for(pg, "(()=>{const m=document.querySelector('#nphStore [data-r=msg]');return !!m&&!/Memproses|Melanjutkan/.test(m.textContent)})()", tmo)
def canvas_click(pg, cx, cy):
    r = ev(pg, "(()=>{const b=document.querySelector('#nphStore canvas').getBoundingClientRect();return {l:b.left,t:b.top,w:b.width,h:b.height}})()")
    pg.mouse.click(r["l"] + cx * r["w"] / 550, r["t"] + cy * r["h"] / 360)
def seat(br, uid, bal): br.post("/__eco", {"uid": uid, "set": {"bal": bal, "box": []}})
def phone_calls(pg, store): pg.on("request", lambda r: store.append((r.url.rsplit("/", 1)[-1], json.loads(r.post_data or "{}").get("data", {}))) if "/fn/phone" in r.url and r.method == "POST" else None)

def sec_flag(b, br):
    br.flag(phone=False, ocean=True, klippy=True)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA); time.sleep(1.5); go_door(A)
    ok("F0 server NusaPhone MATI: titik pintu tetap 'Lihat' dan dialog lama 'SEGERA HADIR' (toko tidak bisa dimasuki)", point(A) == "Lihat", point(A))
    ev(A, "NW.world.interact()"); time.sleep(0.5)
    txt = ev(A, "document.body.innerText"); ok("F0b dialog lama muncul; tidak ada toko; modul store.js tidak diunduh", "SEGERA" in txt and "Toko NusaPhone" in txt and not store_open(A) and ev(A, "typeof NW.phoneStore")  == "undefined", ev(A, "typeof NW.phoneStore"))
    exterior_shot(A, "st-412x915-luar-segera-hadir"); ctx.close()
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, phone=False, extra_init=KOTA); time.sleep(1.0); go_door(A)
    ev(A, "NW.world.interact()"); time.sleep(0.5)
    ok("F1 flag klien NUSA_PHONE=false: perilaku Kota lama persis (Lihat + SEGERA HADIR, tidak ada NW.phone)", point(A) == "Lihat" and "SEGERA" in ev(A, "document.body.innerText") and ev(A, "typeof NW.phone") == "undefined", point(A)); ctx.close()
    br.flag(phone=True, ocean=True, klippy=True)

def sec_toko(b, br):
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA); U.phone_ready(A); uid = X.uid(A); seat(br, uid, 3000); go_door(A)
    ok("T0 server ON: pintu bertanda 'Masuk toko'", point(A) == "Masuk toko", point(A)); exterior_shot(A, "st-412x915-luar-buka")
    reqs = []; phone_calls(A, reqs)
    ok("T1 interaksi di pintu membuka toko (modul dimuat malas)", enter(A) and ev(A, "typeof NW.phoneStore")  == "object" and card_ready(A))
    time.sleep(0.6); U.shot(A, "st-412x915-dalam")
    chips = ev(A, "[...document.querySelectorAll('#nphStore .nps-chip')].map(c=>({id:c.dataset.m,col:c.querySelector('i').style.background}))")
    ok("T2 enam model + ponsel dasar tersedia, minimal 3 tampilan berbeda", len(chips) == 7 and len({c['col'] for c in chips}) >= 6 and {c['id'] for c in chips} == {"dasar", "s1", "s2", "s3", "s4", "s5", "crown17"}, chips)
    ok("T3 hanya satu NPC penjaga ('Mbak Sari') berbicara; kasir, rak, poster digambar tanpa galat", "Mbak Sari" in ev(A, "document.querySelector('#nphStore .nps-say').textContent+getComputedStyle(document.querySelector('#nphStore .nps-say'),'::before').content") and not [e for e in errs if "PAGEERR" in e], errs)
    ok("T4 saldo koin bermain dari server tampil (3.000)", "3.000" in bal_txt(A), bal_txt(A))
    # harga dari backend: tidak ada konstanta harga di berkas klien
    src = open(os.path.join(H, "..", "..", "phone", "store.js")).read(); core = open(os.path.join(H, "..", "..", "phone", "core.js")).read()
    pat = re.compile(r"(?<![\w.])(2[.,]?000|6[.,]?000|5[.,]?000|10[.,]?000|15[.,]?000|25[.,]?000)(?![\w])")
    ok("T5 klien tidak memuat konstanta harga model (store.js/core.js)", not pat.search(re.sub(r"\b(24000|32000|48000|64000|96000|128000|16000)\b", "", src)) and "coins:" not in core and "idr:" not in core, pat.findall(src))
    chip(A, "s1"); ok("T6 harga s1 dari server: 2.000 koin + label 'menunggu Owner'", "2.000" in ev(A, "document.querySelector('#nphStore [data-r=price]').textContent") and "menunggu Owner" in ev(A, "document.querySelector('#nphStore [data-r=price]').textContent"))
    chip(A, "s3"); ok("T6b harga s3 premium dari server: Rp5.000", "Rp5.000" in ev(A, "document.querySelector('#nphStore [data-r=price]').textContent"))
    chip(A, "crown17"); t = ev(A, "document.querySelector('#nphStore .nps-card').textContent"); ok("T6c Nusa Crown 17: Rp25.000, penyimpanan 128 GB", "Rp25.000" in t and "128 GB" in t, t[:140])
    # klik ponsel di etalase memilih model (koordinat kanvas dihitung dari proyeksi yang sama)
    canvas_click(A, 225, 170); time.sleep(0.2)
    ok("T7 klik ponsel di meja etalase memilih modelnya (s2)", ev(A, "document.querySelector('#nphStore .nps-chip.on').dataset.m") == "s2", ev(A, "document.querySelector('#nphStore .nps-chip.on').dataset.m"))
    # coba tampilan: klien saja
    n0 = len(reqs); b0 = bal_txt(A); A.click("#nphStore [data-a=try]"); time.sleep(0.5); U.shot(A, "st-412x915-coba-tampilan")
    ok("T8 'Coba tampilan' = pratinjau klien: tombol berganti, tak ada permintaan jaringan, saldo & server tak berubah", ev(A, "!!document.querySelector('#nphStore [data-a=untry]')") and len(reqs) == n0 and bal_txt(A) == b0 and eco(br, uid)["bal"] == 3000 and "s2" not in ph(br, uid).get("owned", []), reqs[n0:])
    A.click("#nphStore [data-a=untry]"); time.sleep(0.2)
    A.keyboard.press("Escape"); time.sleep(0.4)
    ok("T9 Esc menutup toko; kontrol permainan kembali", not store_open(A) and not ev(A, "document.body.classList.contains('nps-open')"))
    ok("T10 tidak ada adapter uji di window; API publik toko hanya open/close/isOpen", sorted(ev(A, "Object.keys(NW.phoneStore)")) == ["close", "isOpen", "open"] and not ev(A, "Object.keys(window).filter(k=>/phoneTest|__phone|__store/i.test(k)).length"))
    ctx.close()

def sec_beli(b, br):
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA); U.phone_ready(A); uid = X.uid(A); seat(br, uid, 3000); go_door(A)
    reqs = []; phone_calls(A, reqs); enter(A); card_ready(A); chip(A, "s1")
    d0 = ph(br, uid); e0 = eco(br, uid)
    A.click("#nphStore [data-a=buy]"); time.sleep(0.3)
    ok("B1 Beli → konfirmasi dulu (belum ada permintaan beli)", ev(A, "!!document.querySelector('#nphStore [data-a=buy-yes]')") and not [r for r in reqs if r[0] == "phoneBuy"])
    A.click("#nphStore [data-a=buy-no]"); time.sleep(0.2); ok("B1b Batal: tidak ada yang berubah", eco(br, uid)["bal"] == 3000 and not [r for r in reqs if r[0] == "phoneBuy"])
    # klik ganda cepat pada 'Ya, beli'
    A.click("#nphStore [data-a=buy]"); wait_for(A, "!!document.querySelector('#nphStore [data-a=buy-yes]')", 5)
    ev(A, "(()=>{const b=document.querySelector('#nphStore [data-a=buy-yes]');b.click();b.click();b.click()})()"); settle_buy(A); time.sleep(0.4)
    bl = [r for r in reqs if r[0] == "phoneBuy"]; o = ph(br, uid).get("owned", [])
    ok("B2 klik ganda ×3: SATU permintaan beli, ponsel s1 dimiliki sekali, saldo 3.000 → 1.000", len(bl) == 1 and o.count("s1") == 1 and eco(br, uid)["bal"] == 1000, [len(bl), o, eco(br, uid)["bal"]])
    ok("B2b UI: pesan berhasil, saldo 1.000, kartu s1 'Sedang dipakai/Pakai', opId disimpan dibersihkan", "Berhasil" in msg(A) and "1.000" in bal_txt(A) and ev(A, "localStorage.getItem('nusa_phone_buy_v1')") is None, [msg(A), bal_txt(A)])
    U.shot(A, "st-412x915-beli-berhasil")
    ok("B2c opId pembelian memakai nilai unik dan tidak memuat harga/status bayar dari klien", all(set(r[1].keys()) <= {"opId", "model"} for r in bl), bl)
    # beli lagi model yang sudah dimiliki → tombol hilang (Pakai), server tidak dipotong lagi
    ok("B3 model yang dimiliki: tombol Beli diganti 'Pakai'; tidak bisa dibeli dua kali", ev(A, "!document.querySelector('#nphStore [data-a=buy]')&&!!document.querySelector('#nphStore [data-a=use]')"))
    st, r = br.fn(uid, "phoneBuy", {"opId": "t-st-again-0001", "model": "s1"}); ok("B3b server menolak beli s1 lagi; saldo tetap 1.000", st != 200 and eco(br, uid)["bal"] == 1000, [st])
    A.click("#nphStore [data-a=use]"); wait_for(A, "!!document.querySelector('#nphStore .nps-btn[disabled]')&&/dipakai/.test(document.querySelector('#nphStore .nps-act').textContent)", 8)
    ok("B4 'Pakai': server mencatat model terpakai; casing ponsel mengikuti", ph(br, uid).get("use") == "s1" and ev(A, "NW.phone.prefs().casing") == "s1" and ev(A, "NW.phone.owned()").count("s1") == 1, ph(br, uid))
    # saldo kurang (tombol nonaktif) & saldo berubah diam-diam di server (kalah balapan) → ditolak server, saldo tetap
    chip(A, "s2"); ok("B5 saldo 1.000 < 6.000: tombol Beli nonaktif + penjelasan, koin top-up tidak dipakai", ev(A, "document.querySelector('#nphStore [data-a=buy]').disabled") and "belum cukup" in ev(A, "document.querySelector('#nphStore .nps-note').textContent"))
    seat(br, uid, 7000); A.keyboard.press("Escape"); time.sleep(0.2); enter(A); card_ready(A); chip(A, "s2"); A.click("#nphStore [data-a=buy]"); wait_for(A, "!!document.querySelector('#nphStore [data-a=buy-yes]')", 5)
    seat(br, uid, 100); n0 = eco(br, uid); A.click("#nphStore [data-a=buy-yes]"); settle_buy(A); time.sleep(0.4)
    ok("B6 saldo di server berubah (100) sebelum 'Ya, beli': server menolak; saldo tetap 100; ponsel s2 tidak dimiliki; opId tertunda dibersihkan", "tidak cukup" in msg(A).lower() and eco(br, uid)["bal"] == 100 and "s2" not in ph(br, uid).get("owned", []) and ev(A, "localStorage.getItem('nusa_phone_buy_v1')") is None, [msg(A), eco(br, uid)["bal"]])
    ok("B6b tidak ada galat skrip", not [e for e in errs if "PAGEERR" in e], errs); ctx.close()
    # dua akun berbeda: masing-masing hanya terpotong miliknya
    c1, P1, e1 = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA); c2, P2, e2 = X.new_page(b, br, "demo-b", "Sari", vp=(412, 915), hour=12, extra_init=KOTA)
    U.phone_ready(P1); U.phone_ready(P2); ua, ub = X.uid(P1), X.uid(P2); ev(P1, "1"); seat(br, ua, 2500); seat(br, ub, 2200)
    br.post("/__eco", {"uid": ua, "set": {"bal": 2500, "box": []}}); st0, _ = br.fn(ua, "phoneState")
    # reset kepemilikan s1 untuk akun uji agar bisa membeli lagi
    br.post("/__phone", {"uid": ua, "set": {"owned": ["dasar"], "use": "dasar"}}); br.post("/__phone", {"uid": ub, "set": {"owned": ["dasar"], "use": "dasar"}})
    go_door(P1); go_door(P2); enter(P1); enter(P2); card_ready(P1); card_ready(P2); chip(P1, "s1"); chip(P2, "s1"); buy(P1); buy(P2); settle_buy(P1); settle_buy(P2); time.sleep(0.4)
    ok("B7 dua akun membeli bersamaan: A 2.500→500, B 2.200→200, masing-masing memiliki s1 tepat sekali", eco(br, ua)["bal"] == 500 and eco(br, ub)["bal"] == 200 and ph(br, ua)["owned"].count("s1") == 1 and ph(br, ub)["owned"].count("s1") == 1, [eco(br, ua)["bal"], eco(br, ub)["bal"]])
    c1.close(); c2.close()
    # dua perangkat, akun sama
    br.post("/__phone", {"uid": ua, "set": {"owned": ["dasar"], "use": "dasar"}}); seat(br, ua, 3000)
    c1, P1, _ = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA); c2, P2, _ = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA)
    U.phone_ready(P1); U.phone_ready(P2); go_door(P1); go_door(P2); enter(P1); enter(P2); card_ready(P1); card_ready(P2); chip(P1, "s1"); chip(P2, "s1")
    P1.click("#nphStore [data-a=buy]"); P2.click("#nphStore [data-a=buy]"); wait_for(P1, "!!document.querySelector('#nphStore [data-a=buy-yes]')", 5); wait_for(P2, "!!document.querySelector('#nphStore [data-a=buy-yes]')", 5)
    ev(P1, "document.querySelector('#nphStore [data-a=buy-yes]').click()"); ev(P2, "document.querySelector('#nphStore [data-a=buy-yes]').click()"); settle_buy(P1); settle_buy(P2); time.sleep(0.5)
    ok("B8 dua perangkat, akun sama, beli bersamaan: s1 dimiliki SEKALI; saldo 3.000 → 1.000 (tidak 2×)", eco(br, ua)["bal"] == 1000 and ph(br, ua)["owned"].count("s1") == 1, [eco(br, ua)["bal"], ph(br, ua)["owned"]])
    ok("B8b perangkat yang kalah menampilkan penjelasan (sudah dimiliki), bukan keberhasilan palsu & saldo benar", all(("1.000" in bal_txt(p)) for p in (P1, P2)) and sum("Berhasil" in msg(p) for p in (P1, P2)) == 1, [msg(P1), msg(P2)])
    c1.close(); c2.close()

def sec_pulih(b, br):
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA); U.phone_ready(A); uid = X.uid(A); go_door(A)
    # (a) permintaan gagal sebelum sampai server → 'Coba lagi' dengan opId SAMA
    br.post("/__phone", {"uid": uid, "set": {"owned": ["dasar"], "use": "dasar"}}); seat(br, uid, 3000); state = {"n": 0}
    def h1(route):
        state["n"] += 1
        if state["n"] == 1: return route.abort()
        route.continue_()
    A.route("**/fn/phoneBuy", h1); enter(A); card_ready(A); chip(A, "s1"); buy(A); wait_for(A, "!!document.querySelector('#nphStore [data-a=retry]')", 10)
    ok("P1 jaringan gagal: pesan jujur + tombol 'Coba lagi'; saldo & kepemilikan di server tidak berubah", eco(br, uid)["bal"] == 3000 and "s1" not in ph(br, uid).get("owned", []) and "belum pasti" in msg(A), msg(A))
    U.shot(A, "st-412x915-koneksi-putus")
    first = json.loads(ev(A, "localStorage.getItem('nusa_phone_buy_v1')") or "{}")
    A.click("#nphStore [data-a=retry]"); settle_buy(A); time.sleep(0.4)
    ok("P1b 'Coba lagi' memakai opId yang sama → berhasil sekali: 3.000 → 1.000", eco(br, uid)["bal"] == 1000 and ph(br, uid)["owned"].count("s1") == 1 and first.get("opId"), [first, eco(br, uid)["bal"]])
    # (b) server SUDAH memproses, tetapi jawabannya hilang
    br.post("/__phone", {"uid": uid, "set": {"owned": ["dasar"], "use": "dasar"}}); seat(br, uid, 3000); A.unroute("**/fn/phoneBuy"); state["n"] = 0
    def h2(route):
        state["n"] += 1
        if state["n"] == 1: route.fetch(); return route.abort()
        route.continue_()
    A.route("**/fn/phoneBuy", h2); chip(A, "s1"); A.keyboard.press("Escape"); time.sleep(0.2); enter(A); card_ready(A); chip(A, "s1"); buy(A); wait_for(A, "!!document.querySelector('#nphStore [data-a=retry]')", 10)
    ok("P2 jawaban hilang tapi server sudah memproses: saldo 1.000 SEKALI, s1 dimiliki", eco(br, uid)["bal"] == 1000 and ph(br, uid)["owned"].count("s1") == 1, eco(br, uid)["bal"])
    A.click("#nphStore [data-a=retry]"); settle_buy(A); time.sleep(0.4)
    ok("P2b 'Coba lagi' (opId sama) → hasil lama (duplicate): saldo TETAP 1.000, s1 tetap satu, UI sukses", eco(br, uid)["bal"] == 1000 and ph(br, uid)["owned"].count("s1") == 1 and "sudah tercatat" in msg(A) and "1.000" in bal_txt(A), [msg(A), eco(br, uid)["bal"]])
    A.unroute("**/fn/phoneBuy"); ctx.close()
    # (c) muat ulang dengan opId tertunda yang SUDAH diproses → pulih otomatis tanpa memotong lagi
    br.post("/__phone", {"uid": uid, "set": {"owned": ["dasar"], "use": "dasar"}}); seat(br, uid, 3000)
    st, r = br.fn(uid, "phoneBuy", {"opId": "t-st-pend-00001", "model": "s1"})
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA); U.phone_ready(A); go_door(A)
    ev(A, "(u)=>localStorage.setItem('nusa_phone_buy_v1', JSON.stringify({opId:'t-st-pend-00001', model:'s1', uid:NW.cloud.user.uid, at:Date.now()}))")
    enter(A); wait_for(A, "!localStorage.getItem('nusa_phone_buy_v1')", 12); time.sleep(0.6)
    ok("P3 muat ulang dengan pembelian tertunda yang sudah diproses: pulih, saldo tetap 1.000, s1 satu, pending dibersihkan", st == 200 and eco(br, uid)["bal"] == 1000 and ph(br, uid)["owned"].count("s1") == 1 and ev(A, "localStorage.getItem('nusa_phone_buy_v1')") is None, [eco(br, uid)["bal"], msg(A)])
    ok("P3b UI menampilkan kepemilikan dari server setelah pulih", "Milikmu" in ev(A, "document.querySelector('#nphStore .nps-chip[data-m=s1]').textContent") or "Dimiliki" in ev(A, "document.querySelector('#nphStore .nps-chip[data-m=s1]').textContent"))
    ctx.close()
    # (d) pending milik akun lain / kedaluwarsa tidak pernah dikirim
    br.post("/__phone", {"uid": uid, "set": {"owned": ["dasar"], "use": "dasar"}}); seat(br, uid, 3000)
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA); U.phone_ready(A); go_door(A); reqs = []; phone_calls(A, reqs)
    ev(A, "()=>localStorage.setItem('nusa_phone_buy_v1', JSON.stringify({opId:'t-st-other-0001', model:'s1', uid:'orang-lain', at:Date.now()}))"); enter(A); card_ready(A); time.sleep(1.0)
    ok("P4 opId tertunda milik akun lain TIDAK dikirim (tidak ada pembelian tak sengaja)", not [r for r in reqs if r[0] == "phoneBuy"] and eco(br, uid)["bal"] == 3000)
    A.keyboard.press("Escape"); ev(A, "()=>localStorage.setItem('nusa_phone_buy_v1', JSON.stringify({opId:'t-st-old-000001', model:'s1', uid:NW.cloud.user.uid, at:Date.now()-3600000}))"); enter(A); card_ready(A); time.sleep(1.0)
    ok("P4b opId tertunda kedaluwarsa (>15 menit) tidak dikirim", not [r for r in reqs if r[0] == "phoneBuy"] and eco(br, uid)["bal"] == 3000)
    # (e) koneksi putus total saat membuka toko: harga tidak dikarang
    A.keyboard.press("Escape"); time.sleep(0.2); ctx.set_offline(True); wait_for(A, "navigator.onLine===false", 5); time.sleep(0.3); enter(A); time.sleep(1.5)
    t = ev(A, "document.querySelector('#nphStore .nps-card').textContent")
    ok("P5 offline: toko tidak menampilkan harga/saldo karangan; tidak ada tombol beli; pesan 'terputus'", "terputus" in t.lower() and not re.search(r"\d\.\d{3}", t) and "Rp" not in t and not ev(A, "!!document.querySelector('#nphStore [data-a=buy]')") and bal_txt(A).endswith("–"), t[:120])
    U.shot(A, "st-412x915-offline")
    ctx.set_offline(False); ctx.close()

def sec_premium(b, br):
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, extra_init=KOTA); U.phone_ready(A); uid = X.uid(A); seat(br, uid, 3000); go_door(A); reqs = []; phone_calls(A, reqs)
    enter(A); card_ready(A); chip(A, "s3")
    ok("R1 pembayaran belum tersedia: tombol premium nonaktif bertuliskan 'Pembayaran belum tersedia'; 'Isi Koin' nonaktif", ev(A, "document.querySelector('#nphStore .nps-act .nps-btn:last-child').disabled") and "Pembayaran belum tersedia" in ev(A, "document.querySelector('#nphStore .nps-act').textContent") and ev(A, "document.querySelector('#nphStore .nps-topup').disabled"))
    A.click("#nphStore .nps-topup", force=True); A.click("#nphStore .nps-act .nps-btn:last-child", force=True); time.sleep(0.4)
    ok("R2 mengeklik tombol nonaktif tidak mengirim apa pun & tidak membuka Payment Center", not reqs[1:] and store_open(A) and not ev(A, "!!(NW.shopUI&&NW.shopUI.isOpen&&NW.shopUI.isOpen())"), reqs)
    for m in ("s3", "s4", "s5", "crown17"):
        st, r = br.fn(uid, "phoneBuy", {"opId": "t-st-prem-%s" % m.ljust(6, "0"), "model": m, "paid": True, "price": 0})
        ok("R3 server menolak premium %s walau klien mengaku sudah bayar (tak ada simulasi sukses)" % m, st == 409 and m not in ph(br, uid).get("owned", []) and eco(br, uid)["bal"] == 3000, st)
    # UI saat backend MENYATAKAN pembayaran tersedia (jawaban phoneState diubah di lapisan jaringan uji; keputusan nyata tetap di server)
    def h(route):
        r = route.fetch(); j = r.json(); res = j.get("result", j); st = res.get("state") or res
        if isinstance(st, dict) and "pay" in st:
            st["pay"] = {"available": True}
            for m in st["models"]:
                if m["kind"] == "premium" and not m["owned"]: m["buyable"] = True; m["reason"] = None
        route.fulfill(response=r, json=j)
    A.route("**/fn/phoneState", h); A.keyboard.press("Escape"); time.sleep(0.2); enter(A); card_ready(A); chip(A, "s4"); time.sleep(0.2)
    ok("R4 pembayaran tersedia: 'Isi Koin' aktif; premium berbunyi 'Beli di Payment Center' (bukan beli di toko)", not ev(A, "document.querySelector('#nphStore .nps-topup').disabled") and "Beli di Payment Center" in ev(A, "document.querySelector('#nphStore .nps-act').textContent"))
    n0 = len(reqs); A.click("#nphStore [data-a=paycenter]"); time.sleep(0.8)
    ok("R5 premium → menutup toko & membuka Payment Center LAMA; tidak ada phoneBuy; tidak ada kepemilikan", not store_open(A) and ev(A, "!!(NW.shopUI&&NW.shopUI.isOpen())") and not [r for r in reqs[n0:] if r[0] == "phoneBuy"] and "s4" not in ph(br, uid).get("owned", []))
    U.shot(A, "st-412x915-payment-center")
    ev(A, "NW.shopUI.close()"); time.sleep(0.8); go_door(A); opened = enter(A); card_ready(A); A.click("#nphStore .nps-topup", timeout=8000) if opened else None; time.sleep(0.8)
    ok("R6 'Isi Koin' hanya membuka Payment Center lama (toko tertutup, saldo tidak berubah)", not store_open(A) and ev(A, "!!(NW.shopUI&&NW.shopUI.isOpen())") and eco(br, uid)["bal"] == 3000)
    # Payment Center aktif, tetapi katalog lama belum menjual model premium: 'Isi Koin' aktif, model premium tetap nonaktif dengan alasan dari server
    A.unroute("**/fn/phoneState")
    def h2(route):
        r = route.fetch(); j = r.json(); res = j.get("result", j); st = res.get("state") or res
        if isinstance(st, dict) and "pay" in st:
            st["pay"] = {"available": True}
            for m in st["models"]:
                if m["kind"] == "premium" and not m["owned"]: m["buyable"] = False; m["reason"] = "Belum dijual di Payment Center"
        route.fulfill(response=r, json=j)
    A.route("**/fn/phoneState", h2); ev(A, "NW.shopUI.close()"); time.sleep(0.8); go_door(A); enter(A); card_ready(A); chip(A, "s5"); time.sleep(0.2)
    ok("R7 Payment Center aktif tapi model belum dijual: 'Isi Koin' aktif; tombol premium nonaktif bertuliskan 'Belum dijual di Payment Center'", not ev(A, "document.querySelector('#nphStore .nps-topup').disabled") and ev(A, "document.querySelector('#nphStore .nps-act .nps-btn:last-child').disabled") and "Belum dijual di Payment Center" in ev(A, "document.querySelector('#nphStore .nps-act').textContent") and not ev(A, "!!document.querySelector('#nphStore [data-a=paycenter]')"))
    A.unroute("**/fn/phoneState"); ctx.close()

def sec_layout(b, br):
    seat(br, "x", 0)
    for vp in ((360, 640), (412, 915), (768, 1024), (915, 412)):
        ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=vp, hour=12, extra_init=KOTA); U.phone_ready(A); seat(br, X.uid(A), 3000); go_door(A); enter(A); card_ready(A); chip(A, "s2"); time.sleep(0.5)
        m = ev(A, """(()=>{const r=e=>e.getBoundingClientRect();const root=document.getElementById('nphStore');const bt=[...root.querySelectorAll('button')].filter(b=>b.offsetParent);
          return {sw:document.documentElement.scrollWidth,iw:innerWidth,small:bt.filter(b=>r(b).height<38&&!b.closest('.nps-msg')).map(b=>b.textContent.trim().slice(0,12)),cv:r(root.querySelector('canvas')).width,top:r(root.querySelector('.nps-top')).bottom,
          off:bt.filter(b=>r(b).right>innerWidth+1||r(b).left<-1).map(b=>b.textContent.trim().slice(0,12)),card:r(root.querySelector('.nps-card')).width}})()""")
        ok("L %dx%d tidak ada luapan horizontal, tombol ≥38px, kanvas & kartu terlihat" % vp, m["sw"] <= m["iw"] and not m["small"] and not m["off"] and m["cv"] > 200 and m["card"] > 200, m)
        # tombol aksi dapat dijangkau (gulir di dalam toko)
        ev(A, "document.querySelector('#nphStore [data-a=try]').scrollIntoView({block:'center'})"); r = ev(A, "(()=>{const b=document.querySelector('#nphStore [data-a=try]').getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight})()")
        ok("L %dx%d tombol 'Coba tampilan' dapat dijangkau" % vp, r)
        U.shot(A, "st-%dx%d-dalam" % vp); ctx.close()
    ctx, A, errs = X.new_page(b, br, "demo-a", "Budi", vp=(412, 915), hour=12, reduced="reduce", extra_init=KOTA); U.phone_ready(A); go_door(A); enter(A); card_ready(A); time.sleep(0.4)
    ok("L-rm gerak berkurang: toko terbuka tanpa galat", store_open(A) and not [e for e in errs if "PAGEERR" in e], errs); ctx.close()

def main():
    br = U.PB()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(); only = os.environ.get("PT_ONLY", "")
            for name, fn in (("flag", sec_flag), ("toko", sec_toko), ("beli", sec_beli), ("pulih", sec_pulih), ("premium", sec_premium), ("layout", sec_layout)):
                if not only or only == name: br.flag(phone=True, ocean=True, klippy=True); fn(b, br)
            b.close()
    finally: br.close()
    f = [r for r in X.R if r.startswith("FAIL")]
    print("\nRINGKAS: %d PASS / %d FAIL" % (len(X.R) - len(f), len(f)))
    sys.exit(1 if f else 0)
if __name__ == "__main__": main()
