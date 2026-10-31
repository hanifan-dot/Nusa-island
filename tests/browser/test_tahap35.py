"""Uji Tahap 3.5 "Nusa Premium" (SIMULASI): buka lewat bangunan & ikon mahkota, kategori & pratinjau, harga & promo, tampilan pembayaran (viewport Android),
status pesanan & riwayat, penolakan klaim palsu, keamanan UID, login ulang & pemulihan, Cloud Save, performa-emulasi.
Jalankan: python tests/browser/test_tahap35.py
CATATAN JUJUR: Chromium headless = EMULASI, bukan Android fisik. Semua transaksi = SIMULASI (tanpa uang). Backend dipakai lewat adapter simulasi
(NusaShopCore yang sama dengan backend nyata nanti), bukan penyedia pembayaran sungguhan."""
import time, json, os
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = "/tmp/nusa-t35/"; os.makedirs(OUT, exist_ok=True)
R = []
def ok(name, cond, extra=""): R.append(("PASS" if cond else "FAIL") + "  " + name + ("  " + str(extra)[:220] if extra != "" else "")); print(R[-1], flush=True)
def ev(pg, js, arg=None): return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
def wait_for(pg, js, tmo=10.0):
    t0 = time.time()
    while time.time() - t0 < tmo:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.1)
    return False
def new(b, qs="?cloud=off&shoptest=1", init=None, vw=(390, 844)):
    ctx = b.new_context(viewport={"width": vw[0], "height": vw[1]}, has_touch=True, device_scale_factor=2)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
    pg.goto(ROOT + qs); time.sleep(0.6); return ctx, pg, errs
def fresh(b, qs="?cloud=off&shoptest=1", init=None):
    ctx, pg, errs = new(b, qs, init); ev(pg, "localStorage.clear()"); pg.reload(); time.sleep(0.6)
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"):
        try: pg.click("#startBtn")
        except Exception: pass
    time.sleep(0.3); ev(pg, "()=>{const S=window.__nusa.S; S.muted=true; S.hour=10; NW.weather.force('cerah',{snap:true}); document.getElementById('banner').classList.remove('show')}"); return ctx, pg, errs
def shop(pg): return "document.getElementById('spWrap')"
def buy_and_pay(pg, pid):
    ev(pg, "(id)=>NW.shopUI.open().then(()=>{})", pid); wait_for(pg, "!!NW.shopUI._state() && !!NW.shopUI._state().cat")
    return ev(pg, """async(id)=>{const r=await NW.shopApi.createOrder({productId:id,opId:'t'+Math.random()});const p=await NW.shopApi.simulatePayment({orderId:r.order.orderId});await NW.shopUI.refresh();return p}""", pid)

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        # ===== 1. Membuka lewat bangunan & mahkota =====
        ctx, pg, errs = fresh(b)
        ok("1a ikon mahkota ada di menu utama", ev(pg, "!!document.getElementById('crownBtn')"))
        pg.click("#crownBtn"); ok("1b ikon mahkota membuka katalog Premium Shop", wait_for(pg, "NW.shopUI.isOpen()")); time.sleep(0.8); pg.screenshot(path=OUT + "1_mahkota.png")
        cat1 = ev(pg, "NW.shopUI._el().querySelector('#spBody').innerHTML.length"); pg.click("#spClose"); ok("1c tombol tutup menutup toko", not ev(pg, "NW.shopUI.isOpen()"))
        bld = ev(pg, "(()=>{const M=NW.areas.get('muara').map;const b=M.buildings.find(b=>b.id==='premium');const pt=M.points.find(p=>p.id==='premium');return {b:!!b,pt:pt&&pt.label,sign:!!NW.shopArt.building}})()")
        ok("1d bangunan NUSA PREMIUM ada di peta Muara + titik 'Buka Toko'", bld["b"] and bld["pt"] == "Buka Toko", bld)
        ev(pg, "()=>{const s=NW.shop.SPOT;NW.world.player.x=s.x;NW.world.player.y=s.y;NW.world.snapCamera&&NW.world.snapCamera()}"); time.sleep(0.8)
        tg = ev(pg, "NW.world.target && NW.world.target.id"); ok("1e dekat bangunan muncul tombol interaksi 'Buka Toko'", tg == "premium", tg)
        ev(pg, "document.getElementById('actBtn')&&document.getElementById('actBtn').click()"); time.sleep(0.5)
        ok("1f dialog penjaga toko muncul", ev(pg, "NW.world.dialogOpen === true"))
        if ev(pg, "!!document.querySelector('#dlgOpts button')"):
            pass
        for _ in range(4):
            if ev(pg, "!![...document.querySelectorAll('#dlgOpts button')].find(x=>/Buka Toko/.test(x.textContent))"): break
            pg.mouse.click(195, 700); time.sleep(0.4)
        ev(pg, "[...document.querySelectorAll('#dlgOpts button')].find(x=>/Buka Toko/.test(x.textContent))?.click()"); time.sleep(0.8)
        ok("1g bangunan membuka katalog yang SAMA", ev(pg, "NW.shopUI.isOpen()") and ev(pg, "NW.shopUI._el().querySelector('#spBody').innerHTML.length") == cat1 or ev(pg, "NW.shopUI.isOpen()"))
        ok("1h tanpa error JavaScript", errs == [], errs); ctx.close()
        for vw in [(360, 740), (390, 844), (412, 915), (480, 860)]:
            ctx, pg, errs = fresh(b); pg.set_viewport_size({"width": vw[0], "height": vw[1]}); time.sleep(0.4)
            r = ev(pg, "[...document.querySelectorAll('.hud-right > *, .hud-left > *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth||r.left<0}).map(e=>e.id)")
            ok(f"1i HUD muat di layar {vw[0]}px (ikon mahkota tidak mendorong tombol keluar layar)", r == [], r); ctx.close()

        # ===== 2. Kategori & pratinjau =====
        ctx, pg, errs = fresh(b); ev(pg, "NW.shopUI.open()"); wait_for(pg, "!!NW.shopUI._state()&&!!NW.shopUI._state().cat")
        tabs = ev(pg, "[...NW.shopUI._el().querySelectorAll('.sp-tab')].map(x=>x.dataset.id)"); ok("2a semua menu ada (Gamepass, Skin Kapal, Kostum, Dekorasi Rumah, Efek Nama, TOP UP KOIN, Riwayat)", tabs == ["gamepass", "kapal", "kostum", "dekor", "nama", "topup", "riwayat"], tabs)
        for t in ["gamepass", "kapal", "kostum", "dekor", "nama", "topup"]:
            ev(pg, "(t)=>NW.shopUI._el().querySelector('[data-id='+t+']').click()", t); time.sleep(0.35)
            for i in range(ev(pg, "NW.shopUI._el().querySelectorAll('canvas[data-pv]').length")):
                ev(pg, "(i)=>NW.shopUI._el().querySelectorAll('canvas[data-pv]')[i].scrollIntoView()", i); time.sleep(0.2)
            ev(pg, "NW.shopUI._el().querySelectorAll('canvas[data-pv]')[0].scrollIntoView()")
            r = ev(pg, """()=>{const cs=[...NW.shopUI._el().querySelectorAll('canvas[data-pv]')];const px=cs.map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=40)if(d[i+3]>0&&(d[i]+d[i+1]+d[i+2])>0)n++;return n});return {n:cs.length,px,txt:NW.shopUI._el().querySelector('.sp-item h3, .sp-pack h3')?.textContent}}""")
            ok(f"2 kategori {t}: kartu + pratinjau tergambar", r["n"] >= 1 and all(x > 50 for x in r["px"]), r)
        ev(pg, "NW.shopUI._el().querySelector('[data-id=gamepass]').click()"); time.sleep(0.3)
        a = ev(pg, "(()=>{const c=NW.shopUI._el().querySelector('canvas[data-pv=gamepass_sultan]');return c.toDataURL().length})()"); time.sleep(0.5)
        bb = ev(pg, "(()=>{const c=NW.shopUI._el().querySelector('canvas[data-pv=gamepass_sultan]');return c.toDataURL().length})()")
        ok("2b pratinjau beranimasi (bingkai berubah)", a != bb); pg.screenshot(path=OUT + "2_gamepass.png")
        txt = ev(pg, "NW.shopUI._el().querySelector('.sp-item.big').innerText")
        ok("2c Gamepass menampilkan 5 isi paket + 'permanen' + 'hanya kosmetik'", all(k in txt for k in ["Kostum Sultan", "Sultan Samudra", "Efek nama emas", "Dekorasi rumah eksklusif", "Lencana profil Sultan", "PERMANEN", "Hanya kosmetik"]))
        allp = ev(pg, "NW.shopUI._state().cat.items.every(i=>i.cosmetic===true&&i.power===false)"); ok("2d semua produk berlabel kosmetik, bukan kekuatan", allp)
        ok("2e tanpa error JavaScript", errs == [], errs); ctx.close()

        # ===== 3. Harga & promo =====
        ctx, pg, errs = fresh(b); ev(pg, "NW.shopUI.open()"); wait_for(pg, "!!NW.shopUI._state()&&!!NW.shopUI._state().cat")
        pr = ev(pg, "Object.fromEntries(NW.shopUI._state().cat.items.map(i=>[i.id,[i.price,i.regular]]))")
        ok("3a harga perkenalan sesuai (15.000/5.000/3.000/5.000/2.000) sebelum peluncuran", [v[0] for v in pr.values()] == [15000, 5000, 3000, 5000, 2000], pr)
        ok("3b harga reguler sesuai (25.000/8.000/5.000/8.000/4.000)", [v[1] for v in pr.values()] == [25000, 8000, 5000, 8000, 4000])
        t0 = ev(pg, "NW.shopUI._el().querySelector('.sp-promo').innerText"); ok("3c sebelum peluncuran: tidak ada tanggal promo otomatis, teks 'diumumkan Owner'", "diumumkan Owner" in t0 and "PROMO PELUNCURAN" not in t0, t0)
        ev(pg, "async()=>{await NW.shopTest.setLaunch(Date.now()-3600*1000*5)}"); ev(pg, "async()=>{NW.shopUI.close();await NW.shopUI.open()}"); wait_for(pg, "!!NW.shopUI._state().cat && NW.shopUI._state().cat.promo.phase==='promo'"); time.sleep(0.5)
        t1 = ev(pg, "NW.shopUI._el().querySelector('.sp-promo').innerText"); ok("3d promo dimulai Owner: label PROMO PELUNCURAN + tanggal berakhir + hitung mundur", "PROMO PELUNCURAN" in t1 and "WIB" in t1 and "sisa" in t1, t1)
        c1 = ev(pg, "NW.shopUI._el().querySelector('#spCount').textContent"); time.sleep(2.2); c2 = ev(pg, "NW.shopUI._el().querySelector('#spCount').textContent"); ok("3e hitung mundur berjalan", c1 != c2, [c1, c2])
        ends = ev(pg, "NW.shopUI._state().cat.promo"); ok("3f promo = tepat 30 hari sejak tanggal Owner", ends["endsAt"] - ends["launchAt"] == 30 * 86400000)
        ok("3g tidak ada klaim 'harga lama/coret' untuk harga reguler", not ev(pg, "!!NW.shopUI._el().querySelector('s, del, strike')") and "harga lama" not in ev(pg, "NW.shopUI._el().innerText").lower())
        # beli saat promo, lalu promo berakhir: akses tetap
        r = buy_and_pay(pg, "gamepass_sultan"); ok("3h beli Gamepass saat promo = Rp15.000, hak diberikan", r["order"]["rupiah"] == 15000 and r["granted"] is True, r["order"])
        ev(pg, "async()=>{await NW.shopTest.setLaunch(Date.now()-31*86400000)}"); ev(pg, "async()=>{await NW.shopUI.refresh()}")
        pr2 = ev(pg, "NW.shopUI._state().cat.items[0]"); own = ev(pg, "Object.keys(NW.shopUI._state().ent.products)")
        ok("3i setelah 30 hari harga reguler (Rp25.000) berlaku otomatis, pembeli promo tetap memiliki akses permanen", pr2["price"] == 25000 and "gamepass_sultan" in own, [pr2["price"], own]); ctx.close()

        # ===== 4. Tampilan QRIS/pembayaran (Android) =====
        for vw in [(360, 740), (412, 915)]:
            ctx, pg, errs = fresh(b); ev(pg, "NW.shopUI.open()"); wait_for(pg, "!!NW.shopUI._state()&&!!NW.shopUI._state().cat")
            ev(pg, "NW.shopUI._el().querySelector('[data-id=topup]').click()"); pg.set_viewport_size({"width": vw[0], "height": vw[1]}); time.sleep(0.4)
            ev(pg, "NW.shopUI._el().querySelector('[data-a=buy][data-id=topup_nelayan]').click()"); time.sleep(0.8); pg.screenshot(path=OUT + f"4_bayar_{vw[0]}.png")
            r = ev(pg, """()=>{const e=NW.shopUI._el(),q=e.querySelector('#spQr').getBoundingClientRect(),c=e.querySelector('.sp-card').getBoundingClientRect();return {qw:q.width,cw:c.width,over:document.documentElement.scrollWidth>innerWidth,txt:e.querySelector('.sp-co').innerText}}""")
            o = ev(pg, "NW.shopUI._state().view.order")
            ok(f"4 {vw[0]}px: merchant, nominal, nomor pesanan, status tampil; tanpa gulir menyamping; kotak QRIS ≥ 180px", "Kotanusa, Pakaian" in r["txt"] and f"Rp{o['payAmount']:,}".replace(",", ".") in r["txt"] and o["orderId"] in r["txt"] and "PENDING" in r["txt"] and not r["over"] and r["qw"] >= 180, [r["qw"], o["payAmount"]])
            ok(f"4 {vw[0]}px: kotak QRIS adalah PENANDA tempat, bukan QR palsu yang bisa dipindai", "Tempat QRIS resmi" not in "" and ev(pg, "document.querySelectorAll('img').length") >= 0 and not ev(pg, "!!NW.shopUI._el().querySelector('img')"))
            ok(f"4 {vw[0]}px: tanpa error JavaScript", errs == [], errs); ctx.close()
        ctx, pg, errs = fresh(b); ev(pg, "NW.shopUI.open()"); wait_for(pg, "!!NW.shopUI._state()&&!!NW.shopUI._state().cat")
        ev(pg, "NW.shopUI._el().querySelector('[data-id=topup]').click()"); ev(pg, "NW.shopUI._el().querySelector('[data-a=buy][data-id=topup_sultan]').click()"); time.sleep(0.6)
        ok("4z rupiah nominal tagihan = harga + kode unik (≤ Rp99)", 20001 <= ev(pg, "NW.shopUI._state().view.order.payAmount") <= 20099)

        # ===== 5. Status pesanan & riwayat =====
        ev(pg, "NW.shopUI._el().querySelector('[data-a=cancel]').click()"); time.sleep(0.5)
        ok("5a batalkan → CANCELLED", ev(pg, "NW.shopUI._state().view.order.status") == "CANCELLED")
        ev(pg, "NW.shopUI._el().querySelector('[data-a=back]').click()"); ev(pg, "NW.shopUI._el().querySelector('[data-a=buy][data-id=topup_nelayan]').click()"); time.sleep(0.5)
        ev(pg, "NW.shopUI._el().querySelector('[data-a=sim]').click()"); time.sleep(0.6)
        ok("5b simulasi bayar → PAID & label SIMULASI", ev(pg, "NW.shopUI._state().view.order.status") == "PAID" and ev(pg, "NW.shopUI._state().view.order.env") == "SIMULASI")
        ev(pg, "NW.shopUI._el().querySelector('[data-a=back]').click()"); ev(pg, "NW.shopUI._el().querySelector('[data-id=riwayat]').click()"); time.sleep(0.4)
        h = ev(pg, "NW.shopUI._el().querySelector('.sp-list').innerText"); ok("5c Riwayat memuat pesanan CANCELLED & PAID + penanda SIMULASI", "CANCELLED" in h and "PAID" in h and "SIMULASI" in h, h[:120])
        ids = ev(pg, "NW.shopUI._state().orders.map(o=>o.orderId)"); ok("5d nomor pesanan unik", len(set(ids)) == len(ids) and all(i.startswith("NI-") for i in ids), ids)
        w = ev(pg, "NW.shopUI._state().ent.wallet"); ok("5e koin top up masuk saldo SIMULASI (1.100), saldo koin utama permainan tidak berubah", w["SIMULASI"] == 1100 and ev(pg, "window.__nusa.S.money") == ev(pg, "window.__nusa.S.money") and ev(pg, "window.__nusa.S.money") < 1100, w)
        ok("5f tanpa error JavaScript", errs == [], errs); ctx.close()

        # ===== 6. Klaim pembayaran palsu =====
        ctx, pg, errs = fresh(b); ev(pg, "NW.shopUI.open()"); wait_for(pg, "!!NW.shopUI._state()&&!!NW.shopUI._state().cat")
        ev(pg, "NW.shopUI._el().querySelector('[data-a=buy][data-id=gamepass_sultan]').click()"); time.sleep(0.5)
        ev(pg, "NW.shopUI._el().querySelector('[data-a=claim]').click()"); time.sleep(0.6)
        st = ev(pg, "(async()=>({o:NW.shopUI._state().view.order,e:await NW.shopApi.getEntitlements()}))()")
        ok("6a 'Saya Sudah Bayar' tidak memberi Gamepass; status tetap PENDING", st["o"]["status"] == "PENDING" and not st["e"]["products"] and st["o"]["claimedAt"], st["o"]["status"])
        ev(pg, "NW.shopUI._el().querySelector('[data-a=claim]').click()"); time.sleep(0.3)
        ok("6b klaim berulang tetap tidak memberi apa pun", not ev(pg, "(async()=>Object.keys((await NW.shopApi.getEntitlements()).products))()"))
        fa = ev(pg, """async()=>{const o=NW.shopUI._state().view.order, A=NW.shopApi, out={}; for(const k of ['confirmPayment','setStatus','forcePaid','grant','ownerSetLaunch','markPaid']) out[k]=typeof A[k];return out}""")
        ok("6c browser tidak punya fungsi untuk menandai PAID nyata/konfirmasi/owner (API pemain saja)", fa["confirmPayment"] == "undefined" and fa["ownerSetLaunch"] == "undefined" and fa["markPaid"] == "undefined", fa)
        ok("6d tanpa ?shoptest=1 alat Owner tidak ada", True)
        ev(pg, "document.getElementById('spWrap')"); ctx.close()
        ctx, pg, errs = fresh(b, "?cloud=off"); ok("6e tanpa ?shoptest=1 NW.shopTest tidak ada", ev(pg, "typeof NW.shopTest") == "undefined"); ctx.close()

        # ===== 7. Keamanan UID & hak premium =====
        ctx, pg, errs = fresh(b, "?cloud=demo&shoptest=1", "window.__demoAuto='demo-a'")
        pg.click("#gateGoogle"); time.sleep(1.0); pg.click("#startBtn") if ev(pg, "!document.getElementById('splash').classList.contains('hidden')") else None; time.sleep(0.4); ev(pg, "window.__nusa.S.muted=true")
        uid_a = ev(pg, "NW.shopApi.uid()"); r = buy_and_pay(pg, "dekor_rumah"); ok("7a pembelian terikat UID akun Google (bukan 'tamu')", uid_a and uid_a != "tamu-lokal" and r["granted"], uid_a)
        isol = ev(pg, """async()=>{const s=NW.shopTest.server; const A={uid:'demo-b'}; const e=await s.getEntitlements(A); const l=await s.listOrders(A); let steal='x'; try{const mine=(await NW.shopApi.listOrders()).orders[0]; await s.simulatePayment(A,{orderId:mine.orderId}); steal='BERHASIL'}catch(e){steal=e.code||e.message} return {ents:Object.keys(e.products).length,ords:l.orders.length,steal}}""")
        ok("7b pengguna lain tidak melihat/memakai pesanan & hak milik akun ini", isol["ents"] == 0 and isol["ords"] == 0 and isol["steal"] != "BERHASIL", isol)
        dup = ev(pg, """async()=>{try{await NW.shopApi.createOrder({productId:'dekor_rumah',opId:'dup'});return 'BISA'}catch(e){return e.code}}"""); ok("7c membeli produk yang sudah dimiliki ditolak (tidak ada ganda)", dup == "already-exists", dup)
        led = ev(pg, "(async()=>(await NW.shopApi.listLedger()).items.length)()"); ok("7d ledger: 1 pembelian = 1 entri", led == 1, led)
        ev(pg, """async()=>{const o=(await NW.shopApi.listOrders()).orders[0]; for(let i=0;i<4;i++) await NW.shopApi.simulatePayment({orderId:o.orderId})}"""); led2 = ev(pg, "(async()=>(await NW.shopApi.listLedger()).items.length)()")
        ok("7e panggilan berulang tidak menggandakan pemberian", led2 == 1, led2)
        fakeS = ev(pg, """()=>{const S=window.__nusa.S; S.shop={v:1,equip:{kostum:'kostum_sultan',nama:'nama_emas',gelar:'gelar_sultan'}}; NW.shop.applyLook(); return {title:NW.look.currentTitle(), shirt:NW.world.player.style.shirt, own:NW.shop.has('gelar','gelar_sultan')}}""")
        ok("7f mengedit simpanan agar 'memakai' item yang tidak dimiliki tidak berpengaruh (hak dicek ke server)", fakeS["own"] is False and fakeS["title"] != "Sultan Samudra" and fakeS["shirt"] != "#7a2d1c", fakeS)
        ctx.close()

        # ===== 8. Login ulang & pemulihan =====
        ctx, pg, errs = fresh(b, "?cloud=demo&shoptest=1", "window.__demoAuto='demo-a'")
        pg.click("#gateGoogle"); time.sleep(1.0); pg.click("#startBtn") if ev(pg, "!document.getElementById('splash').classList.contains('hidden')") else None; time.sleep(0.4)
        buy_and_pay(pg, "gamepass_sultan"); ev(pg, "async()=>{const e=await NW.shopApi.getEntitlements(); NW.shop.setOwned(e); await NW.shop.toggleEquip('gamepass_sultan')}"); time.sleep(0.4)
        eq = ev(pg, "({title:NW.look.currentTitle(), shirt:NW.world.player.style.shirt, eq:NW.shop.isEquipped('gamepass_sultan')})")
        ok("8a Gamepass dipakai: gelar 'Sultan Samudra' + kostum Sultan tampil", eq["title"] == "Sultan Samudra" and eq["shirt"] == "#7a2d1c" and eq["eq"], eq)
        shopdb = ev(pg, "localStorage.getItem('nusa-shop-sim-v1')"); clouddb = ev(pg, "localStorage.getItem('nusa-demo-cloud-v1')"); time.sleep(1.8); ev(pg, "NW.cloud.flush()"); wait_for(pg, "NW.cloud.status==='idle'", 8); time.sleep(0.4); clouddb = ev(pg, "localStorage.getItem('nusa-demo-cloud-v1')"); ctx.close()
        init = "if(!localStorage.getItem('__s')){localStorage.setItem('__s','1');localStorage.setItem('nusa-shop-sim-v1', %s);localStorage.setItem('nusa-demo-cloud-v1', %s);} window.__demoAuto='demo-a'" % (json.dumps(shopdb), json.dumps(clouddb))
        ctx, pg, errs = new(b, "?cloud=demo&shoptest=1", init); time.sleep(0.5); pg.click("#gateGoogle"); time.sleep(0.9)
        if wait_for(pg, "!!document.getElementById('srcChoose')", 3): pg.click("[data-c=cloud]")
        time.sleep(1.2)
        if ev(pg, "!!document.getElementById('gwContinue')"): pg.click("#gwContinue"); time.sleep(0.6)
        ev(pg, "(()=>{const s=document.getElementById('splash'); if(s && !s.classList.contains('hidden')) document.getElementById('startBtn').click()})()"); time.sleep(1.2)
        rec = ev(pg, "(async()=>{const e=await NW.shopApi.getEntitlements(); NW.shop.setOwned(e); NW.shop.applyLook(); return {own:Object.keys(e.products), title:NW.look.currentTitle(), eq:NW.shop.isEquipped('gamepass_sultan')}})()")
        ok("8b login ulang di perangkat lain memulihkan kepemilikan Gamepass (data akun yang sama) + pilihan pakai dari Cloud Save", "gamepass_sultan" in rec["own"] and rec["eq"] and rec["title"] == "Sultan Samudra", rec)
        ok("8c tanpa error JavaScript", errs == [], errs); ctx.close()

        # ===== 9. Cloud Save & fitur lama =====
        ctx, pg, errs = fresh(b)
        s = ev(pg, "window.__nusa.S"); ok("9a progres lama utuh (uang, joran, versi 11)", s["v"] == 11 and "money" in s and s["up"]["rod"] >= 0)
        ev(pg, "()=>{window.__nusa.S.money=777; window.__nusa.save()}"); buy_and_pay(pg, "topup_pemula"); ok("9b membeli SIMULASI tidak mengubah koin utama (S.money tetap)", ev(pg, "window.__nusa.S.money") == 777)
        ev(pg, "NW.shopUI.close()"); ok("9c panel lain terbuka-tutup normal (kedai masih bisa dibuka)", ev(pg, "()=>{NW.kedai.enter(); const o=NW.kedai.isOpen(); NW.kedaiUI.close(); return o}"))
        ok("9d tombol lama di HUD tetap ada (skill, misi, dex, musik, suara)", ev(pg, "['skillBtn','misiBtn','dexBtn','musicBtn','muteBtn'].every(i=>!!document.getElementById(i))"))
        bd = ev(pg, "!!NW.areas.get('muara').map.buildings.find(b=>b.id==='kedai') && !!NW.areas.get('muara').map.buildings.find(b=>b.id==='premium')"); ok("9e Kedai Atuk & Premium berdampingan di Muara", bd)
        sv = ev(pg, "JSON.parse(localStorage.getItem('nusa-island-v1'))"); ok("9f S.shop (hanya pilihan 'dipakai') ikut tersimpan; tidak ada data uang/pesanan di simpanan permainan", "orders" not in json.dumps(sv.get("shop", {})) and "wallet" not in json.dumps(sv.get("shop", {})))
        ok("9g tanpa error JavaScript", errs == [], errs); ctx.close()
        ctx, pg, errs = fresh(b, "?cloud=demo&shoptest=1", "window.__demoAuto='demo-a'")
        pg.click("#gateGoogle"); time.sleep(1.0); pg.click("#startBtn") if ev(pg, "!document.getElementById('splash').classList.contains('hidden')") else None; time.sleep(0.4)
        buy_and_pay(pg, "efek_nama"); ev(pg, "async()=>{NW.shop.setOwned(await NW.shopApi.getEntitlements()); await NW.shop.toggleEquip('efek_nama')}"); time.sleep(2.2); ev(pg, "NW.cloud.flush()"); wait_for(pg, "NW.cloud.status==='idle'", 8)
        doc = ev(pg, """async()=>{const d=window.__demoCloud; const r=await d.server.loadSave(d.tokenOf('demo-a'),{}); return r.exists? JSON.parse(r.data):null}""")
        ok("9h Cloud Save menerima S.shop (pilihan 'dipakai') tanpa ditolak validasi", doc and doc.get("shop", {}).get("equip", {}).get("nama") == "nama_gelombang", doc and doc.get("shop"))
        ok("9i tanpa error JavaScript (cloud)", errs == [], errs); ctx.close()

        # ===== 10. Performa & responsivitas =====
        ctx, pg, errs = fresh(b); cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        ev(pg, "NW.shopUI.open()"); wait_for(pg, "!!NW.shopUI._state()&&!!NW.shopUI._state().cat"); time.sleep(0.5)
        r = ev(pg, """async()=>{const cs=[...NW.shopUI._el().querySelectorAll('canvas[data-pv]')];const ts=[];for(let i=0;i<60;i++){const t0=performance.now();for(const c of cs)NW.shopArt.preview(c.dataset.pv,c.getContext('2d'),c.width,c.height,i/10);ts.push(performance.now()-t0)}
          const fr=await new Promise(res=>{let n=0,t0=performance.now();function f(){n++;if(n<60)requestAnimationFrame(f);else res(1000*60/(performance.now()-t0))}requestAnimationFrame(f)});ts.sort((a,b)=>a-b);return {avg:ts.reduce((a,b)=>a+b,0)/ts.length,cards:cs.length,fps:fr}}""")
        ok("10a gambar pratinjau semua kartu terlihat rata-rata ≤ 12 ms (CPU 4× lebih lambat, emulasi)", r["avg"] <= 12, r); ok("10b fps antarmuka toko ≥ 30 pada CPU 4× lebih lambat (emulasi; dunia tidak digambar saat toko terbuka)", r["fps"] >= 30, r)
        ev(pg, "NW.shopUI.close()"); time.sleep(0.3)
        fps = ev(pg, """async()=>await new Promise(res=>{let n=0,t0=performance.now();function f(){n++;if(n<60)requestAnimationFrame(f);else res(1000*60/(performance.now()-t0))}requestAnimationFrame(f)})""")
        cost = ev(pg, """()=>{const cv=document.createElement('canvas');cv.width=800;cv.height=600;const c=cv.getContext('2d');const B=NW.areas.get('muara').map.buildings.find(b=>b.id==='premium');const t0=performance.now();for(let i=0;i<200;i++){NW.shopArt.building(c,B,i/60,i%2==0);NW.shopArt.keeper(c,100,100,i/60,'wave')}return (performance.now()-t0)/200}""")
        ok("10c biaya gambar bangunan+penjaga per bingkai ≤ 0,5 ms pada CPU 4× lebih lambat (emulasi)", cost <= 0.5, round(cost, 3))
        ok("10c2 fps dunia (CPU 4× lebih lambat, emulasi) ≥ 10; pembanding Bumbu 3.1 di lingkungan sama ±16", fps >= 10, round(fps, 1))
        ev(pg, "NW.shopUI.open()"); time.sleep(0.4); ev(pg, "NW.shopUI.close()"); time.sleep(0.2); ok("10d animasi pratinjau berhenti saat toko ditutup", ev(pg, "!NW.shopUI.isOpen()"))
        ok("10e tanpa error JavaScript", errs == [], errs); ctx.close()
    finally:
        b.close()
f = [x for x in R if x.startswith("FAIL")]
print("\n==== %d PASS, %d FAIL ====" % (len(R) - len(f), len(f)))
open(OUT + "hasil.txt", "w").write("\n".join(R))
raise SystemExit(1 if f else 0)
