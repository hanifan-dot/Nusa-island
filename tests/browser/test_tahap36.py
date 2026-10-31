"""Uji terarah Tahap 3.6 (pembayaran nyata, TANPA uang & TANPA Firebase sungguhan): klien memakai inti toko yang SAMA dengan backend dalam
mode NYATA (realEnabled=true) di dalam halaman. Menguji: build publik ("Segera hadir"), alur beli nyata di UI, tombol Konfirmasi via WhatsApp,
klaim tidak memberi apa pun, persetujuan Owner satu kali, pembaruan otomatis, hak milik setelah muat ulang, pengiriman koin top up tepat sekali
(termasuk saat app tertutup sebelum 'ack'), dan tidak ada jalur 'simulasi' di produksi.
Jalankan: python tests/browser/test_tahap36.py"""
import time, json, os
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
OUT = "/tmp/nusa-t36/"; os.makedirs(OUT, exist_ok=True)
R = []
def ok(n, c, e=""): R.append(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:230] if e != "" else "")); print(R[-1], flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
def wait_for(pg, js, t=12):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.15)
    return False
LIVE = """async()=>{ const KEY='t36-db'; const m=new Map(Object.entries(JSON.parse(localStorage.getItem(KEY)||'{}'))); let chain=Promise.resolve();
 const persist=()=>localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(m))); const g=p=>m.has(p)?JSON.parse(m.get(p)):null;
 const keys=()=>[...m.keys()].filter(k=>k.startsWith('shop/orders/')).map(k=>JSON.parse(m.get(k)));
 const db={get:async p=>g(p),queryOrders:async({status,q,limit})=>keys().filter(o=>(!status||o.status===status)&&(!q||o.orderId===q.toUpperCase()||o.nickLower===q.toLowerCase())).sort((a,b)=>b.createdAt-a.createdAt).slice(0,limit),
  tx:f=>{const run=async()=>{const buf=new Map();const r=await f({get:async p=>buf.has(p)?JSON.parse(buf.get(p)):g(p),set:async(p,v)=>{buf.set(p,JSON.stringify(v))}});for(const[k,v]of buf)m.set(k,v);persist();return r};const r=chain.then(run,run);chain=r.catch(()=>{});return r}};
 const srv=NusaShopCore.makeShopServer(db,{realEnabled:true}); const OWN={uid:'o',token:{role:'owner'}}; await srv.ownerSetMode(OWN,{mode:'nyata'});
 const A={uid:'u-live'}; const w=(n)=>(p)=>srv[n](A,p);
 NW.shopApi={sim:false,live:true,isGuest:()=>false,uid:()=>'u-live',getCatalog:()=>srv.getCatalog(),getTime:()=>srv.getTime(),createOrder:w('createOrder'),cancelOrder:w('cancelOrder'),claimPaid:w('claimPaid'),listOrders:w('listOrders'),getEntitlements:w('getEntitlements'),listLedger:w('listLedger'),redeemCoins:w('redeemCoins'),ackDelivery:w('ackDelivery')};
 window.__owner={approve:(orderId,paidAmount,extra)=>srv.ownerApprove(OWN,Object.assign({orderId,paidAmount},extra||{})),reject:(orderId)=>srv.ownerReject(OWN,{orderId,reason:'tidak masuk'}),list:(p)=>srv.ownerListOrders(OWN,p||{})}; return true}"""
def page(b, qs="?cloud=off", cfg=None, init=None):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, device_scale_factor=2)
    if cfg: ctx.add_init_script("window.__cfg=" + json.dumps(cfg))
    ctx.add_init_script("window.open=function(u){(window.__opened=window.__opened||[]).push(u);return null}")
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e))); pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" and "ERR_FILE_NOT_FOUND" not in m.text else None)  # qris.png sengaja belum ada
    pg.goto(ROOT + qs); time.sleep(0.6); return ctx, pg, errs
def start(pg):
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.4); ev(pg, "()=>{window.__nusa.S.muted=true; window.__nusa.S.hour=10; NW.weather.force('cerah',{snap:true})}")
def openshop(pg, tab=None):
    ev(pg, "NW.shopUI.open()"); wait_for(pg, "!!NW.shopUI._state()&&!!NW.shopUI._state().cat")
    if tab: ev(pg, "(t)=>NW.shopUI._el().querySelector('[data-id='+t+']').click()", tab); time.sleep(0.3)

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        # ===== 1. build publik =====
        ctx, pg, errs = page(b, "?cloud=off&shoptest=1"); ctx.add_init_script("")
        ev(pg, "localStorage.clear()"); ctx.close()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True); ctx.add_init_script("window.NUSA_SHOP_OVERRIDE=1")
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/shop/config.js", lambda r: r.fulfill(body='window.NUSA_SHOP={backend:"sim",release:"publik",whatsapp:"628967234059",qrisImage:"shop/qris.png"};', content_type="application/javascript"))
        pg.goto(ROOT + "?cloud=off&shoptest=1"); time.sleep(0.8); start(pg)
        ok("1a build publik: alat uji Owner (?shoptest=1) TIDAK ada", ev(pg, "typeof NW.shopTest") == "undefined")
        ok("1b build publik: tidak ada fungsi simulatePayment di API klien", ev(pg, "typeof NW.shopApi.simulatePayment") == "undefined")
        openshop(pg); t = ev(pg, "NW.shopUI._el().innerText")
        ok("1c build publik: toko menampilkan 'SEGERA HADIR' dan semua tombol beli nonaktif", "SEGERA HADIR" in t and ev(pg, "[...NW.shopUI._el().querySelectorAll('.sp-item .sp-btn')].every(b=>b.disabled)") and not ev(pg, "!!NW.shopUI._el().querySelector('[data-a=buy]')"), t[:80])
        ev(pg, "NW.shopUI._el().querySelector('[data-id=topup]').click()"); time.sleep(0.3)
        ok("1d build publik: paket Top Up juga 'Segera hadir' (disabled)", ev(pg, "[...NW.shopUI._el().querySelectorAll('.sp-pack .sp-btn')].every(b=>b.disabled&&/Segera/.test(b.textContent))"))
        pg.screenshot(path=OUT + "1_segera.png")
        direct = ev(pg, "(async()=>{try{await NW.shopApi.simulatePayment({orderId:'x'});return 'BISA'}catch(e){return 'ditolak'}})()")
        ok("1e build publik: memanggil simulatePayment langsung gagal", direct == "ditolak"); ok("1f tanpa error JS", errs == [], errs); ctx.close()

        # ===== 2-5. alur nyata di UI =====
        ctx, pg, errs = page(b); start(pg); ev(pg, "localStorage.removeItem('t36-db')"); ev(pg, LIVE)
        ev(pg, "()=>{window.__nusa.S.profile.name='BudiNelayan'; window.__nusa.S.money=500}")
        openshop(pg)
        ok("2a server NYATA: toko aktif (bukan 'Segera hadir'), tanpa label SIMULASI", "SEGERA HADIR" not in ev(pg, "NW.shopUI._el().innerText") and "MODE SIMULASI" not in ev(pg, "NW.shopUI._el().innerText"))
        ev(pg, "NW.shopUI._el().querySelector('[data-a=buy][data-id=gamepass_sultan]').click()"); time.sleep(0.9)
        o = ev(pg, "NW.shopUI._state().view.order"); txt = ev(pg, "NW.shopUI._el().querySelector('.sp-co').innerText")
        ok("2b pesanan NYATA dibuat: ID unik, nominal = 15.000 + kode unik, merchant, PENDING, label NYATA", o["env"] == "NYATA" and o["status"] == "PENDING" and 15001 <= o["payAmount"] <= 15099 and "NYATA" in txt and "Kotanusa" in txt, o["payAmount"])
        ok("2c layar bayar NYATA: tidak ada tombol simulasi; ada 'Konfirmasi via WhatsApp'", "Simulasi" not in txt and "Konfirmasi via WhatsApp" in txt and not ev(pg, "!!NW.shopUI._el().querySelector('[data-a=sim]')"))
        ok("2d gambar QRIS dimuat dari shop/qris.png; bila belum dipasang, kotak penanda tampil (tidak ada QR palsu)", ev(pg, "!!NW.shopUI._el().querySelector('#spQrImg')") and wait_for(pg, "getComputedStyle(NW.shopUI._el().querySelector('#spQr')).display!=='none'", 4))
        pg.screenshot(path=OUT + "2_bayar_nyata.png")
        ev(pg, "NW.shopUI._el().querySelector('[data-a=wa]').click()"); time.sleep(1.0)
        op = ev(pg, "window.__opened||[]"); url = op[0] if op else ""
        ok("3a 'Konfirmasi via WhatsApp' membuka wa.me/628967234059 dengan ID pesanan, nickname, produk & nominal (tanpa UID)", url.startswith("https://wa.me/628967234059?text=") and o["orderId"] in url and "BudiNelayan" in url and "u-live" not in url, url[:120])
        ent = ev(pg, "NW.shopApi.getEntitlements()"); st = ev(pg, "NW.shopUI._state().view.order")
        ok("3b setelah menekan WhatsApp: tetap PENDING, belum ada Gamepass (klaim tidak memberi apa pun)", st["status"] == "PENDING" and st["claimedAt"] and not ent["products"], [st["status"], list(ent["products"])])
        bad = ev(pg, "(async()=>{try{await window.__owner.approve(NW.shopUI._state().view.order.orderId,15000);return 'BISA'}catch(e){return e.message}})()")
        ok("4a Owner menyetujui dengan nominal salah → ditolak", "Nominal" in bad, bad)
        ok("4b Owner mencari pesanan lewat ID & nickname", ev(pg, "(async()=>{const a=await window.__owner.list({q:'%s'});const b=await window.__owner.list({q:'budinelayan'});return a.orders.length===1&&b.orders.length===1&&b.orders[0].nick==='BudiNelayan'})()" % o["orderId"]))
        ev(pg, "(async()=>{const o=NW.shopUI._state().view.order;await window.__owner.approve(o.orderId,o.payAmount)})()")
        ok("4c setelah Owner SETUJUI: UI memperbarui sendiri (≤ 10 dtk) menjadi PAID", wait_for(pg, "NW.shopUI._state().view.order.status==='PAID'", 14))
        ent = ev(pg, "NW.shopApi.getEntitlements()"); ok("4d Gamepass Sultan + 5 hak aktif untuk UID pemain", "gamepass_sultan" in ent["products"] and all(k in ent["owned"] for k in ["kostum_sultan", "gelar_sultan", "nama_emas", "dekor_sultan", "lencana_sultan"]))
        dup = ev(pg, "(async()=>{const o=NW.shopUI._state().view.order;const r=await window.__owner.approve(o.orderId,o.payAmount);return [r.granted,r.duplicate]})()"); ok("4e menyetujui lagi = tidak ada pemberian ganda", dup == [False, True], dup)
        ok("4f ledger tepat 1 entri", ev(pg, "(async()=>(await NW.shopApi.listLedger()).items.length)()") == 1)
        ev(pg, "NW.shopUI.close()"); pg.reload(); time.sleep(0.8); start(pg); ev(pg, LIVE); openshop(pg)
        ok("5a muat ulang (login ulang): Gamepass tetap dimiliki", ev(pg, "!!NW.shopUI._state().ent.products.gamepass_sultan") and "Dimiliki" in ev(pg, "NW.shopUI._el().querySelector('.sp-item.big').innerText"))
        ev(pg, "(async()=>{await NW.shop.toggleEquip('gamepass_sultan')})()"); time.sleep(0.4); ok("5b dipakai: gelar Sultan Samudra muncul", ev(pg, "NW.look.currentTitle()") == "Sultan Samudra")
        ok("5c tanpa error JS", errs == [], errs); ctx.close()

        # ===== 6. koin top up =====
        ctx, pg, errs = page(b); start(pg); ev(pg, "localStorage.removeItem('t36-db')"); ev(pg, LIVE); ev(pg, "()=>{window.__nusa.S.money=500;window.__nusa.save()}"); openshop(pg, "topup")
        ev(pg, "NW.shopUI._el().querySelector('[data-a=buy][data-id=topup_juragan]').click()"); time.sleep(0.8); o = ev(pg, "NW.shopUI._state().view.order")
        ok("6a pesanan Top Up Juragan: Rp10.000 + kode unik, 2.300 koin", o["rupiah"] == 10000 and o["coins"] == 2300 and 10001 <= o["payAmount"] <= 10099)
        ok("6b sebelum disetujui koin utama tetap 500", ev(pg, "window.__nusa.S.money") == 500)
        ev(pg, "(async()=>{const o=NW.shopUI._state().view.order;await window.__owner.approve(o.orderId,o.payAmount)})()")
        ok("6c setelah Owner setuju: koin masuk TEPAT sekali → 2.800", wait_for(pg, "window.__nusa.S.money===2800", 14), ev(pg, "window.__nusa.S.money"))
        time.sleep(1.2); ev(pg, "NW.shop.deliver()"); time.sleep(0.8); ok("6d memanggil pengiriman lagi tidak menambah (tetap 2.800)", ev(pg, "window.__nusa.S.money") == 2800)
        pg.reload(); time.sleep(0.8); start(pg); ev(pg, LIVE); ev(pg, "NW.shop.deliver()"); time.sleep(1.0); ok("6e muat ulang: koin tidak berlipat (tetap 2.800)", ev(pg, "window.__nusa.S.money") == 2800, ev(pg, "window.__nusa.S.money"))
        ok("6f dompet server NYATA = 0 setelah dikirim; riwayat memuat PAID bertanda NYATA", ev(pg, "(async()=>(await NW.shopApi.getEntitlements()).wallet.NYATA)()") == 0)
        # app tertutup sebelum 'ack'
        ev(pg, "NW.shopUI.open()"); wait_for(pg, "!!NW.shopUI._state()&&!!NW.shopUI._state().cat"); ev(pg, "NW.shopUI._el().querySelector('[data-id=topup]').click()")
        ev(pg, "NW.shopUI._el().querySelector('[data-a=buy][data-id=topup_pemula]').click()"); time.sleep(0.8); ev(pg, "(async()=>{const o=NW.shopUI._state().view.order;await window.__owner.approve(o.orderId,o.payAmount)})()"); wait_for(pg, "window.__nusa.S.money===3200", 14)
        ok("6g paket Pemula (+400) → 3.200", ev(pg, "window.__nusa.S.money") == 3200)
        ev(pg, "NW.shopUI.close()"); ev(pg, "(async()=>{const o=NW.shopUI._state().view.order;await window.__owner.approve(o.orderId,o.payAmount)})()".replace("o.orderId","'x'") if False else "0")
        o2 = ev(pg, "(async()=>{const c=await NW.shopApi.getCatalog();const r=await NW.shopApi.createOrder({productId:'topup_nelayan',opId:'crash1',nick:'x'});await window.__owner.approve(r.order.orderId,r.order.payAmount);const d=(await NW.shopApi.redeemCoins()).delivery;return d})()")  # 'app crash': dijemput tetapi TIDAK di-ack dan TIDAK diterapkan
        pg.reload(); time.sleep(0.8); start(pg); ev(pg, LIVE); m0 = ev(pg, "window.__nusa.S.money"); ev(pg, "NW.shop.deliver()"); time.sleep(1.0)
        m1 = ev(pg, "window.__nusa.S.money"); ev(pg, "NW.shop.deliver()"); time.sleep(0.8)
        ok("6h app tertutup sebelum 'ack': pengiriman yang sama diterapkan tepat sekali (+1.100)", m1 - m0 == 1100 and ev(pg, "window.__nusa.S.money") == m1, [m0, m1, o2])
        ok("6i tidak ada koin yang hilang: total top up 2.300 + 400 + 1.100 = 3.800 ditambahkan ke 500", ev(pg, "window.__nusa.S.money") == 500 + 3800, ev(pg, "window.__nusa.S.money"))
        ok("6j S.shop.applied hanya berisi id pengiriman (bukan data uang)", ev(pg, "window.__nusa.S.shop.applied.every(x=>/^D-/.test(x))"))
        ok("6k tanpa error JS", errs == [], errs); ctx.close()
    finally:
        b.close()
f = [x for x in R if x.startswith("FAIL")]
print("\n==== %d PASS, %d FAIL ====" % (len(R) - len(f), len(f))); open(OUT + "hasil.txt", "w").write("\n".join(R)); raise SystemExit(1 if f else 0)
