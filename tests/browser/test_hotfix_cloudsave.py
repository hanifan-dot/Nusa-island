"""HOTFIX Cloud Save "Data toko tidak valid": simpanan lama berisi S.shop.aurSeen terhadap validator Cloud Save ASLI (cloud/core.js via adapter demo).
Tidak menyentuh Firebase/produksi. Jalankan: python tests/browser/test_hotfix_cloudsave.py (screenshot → docs/hotfix-cloudsave/)"""
import time, os, json
from playwright.sync_api import sync_playwright
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ROOT = "file://" + os.path.join(ROOT_DIR, "index.html")
OUT = os.path.join(ROOT_DIR, "docs", "hotfix-cloudsave"); os.makedirs(OUT, exist_ok=True)
R = []
def ok(n, c, e=""): R.append(c); print(("PASS" if c else "FAIL") + "  " + n + ("  " + str(e)[:200] if e != "" else ""), flush=True)
def ev(pg, js, a=None): return pg.evaluate(js) if a is None else pg.evaluate(js, a)
def wf(pg, js, t=10):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if ev(pg, js): return True
        except Exception: pass
        time.sleep(0.15)
    return False
def boot(b, acc, legacy=None, mobile=False):
    ctx = b.new_context(viewport={"width": 390, "height": 780} if mobile else {"width": 1100, "height": 700}, has_touch=mobile)
    ctx.add_init_script(f"window.__demoAuto='{acc}';")
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(ROOT + "?cloud=demo"); time.sleep(0.8)
    return ctx, pg, errs
def start(pg):
    if ev(pg, "!document.getElementById('splash').classList.contains('hidden')"): ev(pg, "document.getElementById('startBtn').click()")
    time.sleep(0.5); ev(pg, "()=>{window.__nusa.S.muted=true; document.getElementById('banner')&&document.getElementById('banner').classList.remove('show')}")
with sync_playwright() as p:
    b = p.chromium.launch()
    # 1) AKUN LAMA: simpanan lokal dengan shop.aurSeen=1 (persis tulisan aurora.js produksi) + Aurora dimiliki
    ctx, pg, errs = boot(b, "demo-a"); start(pg)
    ev(pg, "async()=>{await NW.cloud.signInGoogle()}"); wf(pg, "NW.cloud.user", 8); time.sleep(0.8)
    ev(pg, "()=>{const S=window.__nusa.S; S.money=777; S.shop={v:1,equip:{joran:'pancing_aurora'},aurSeen:1}; window.__nusa.save()}")
    ev(pg, "NW.shop.setOwned({owned:{pancing_aurora:1}})")
    r = ev(pg, "async()=>{try{const r=await NW.cloud.syncNow(); return {st:NW.cloud.status, r:JSON.stringify(r).slice(0,200)}}catch(e){return {err:String(e)}}}")
    ok("akun lama (aurSeen) → Cloud Save berhasil, status bukan error", r.get("st") != "error" and "Data toko" not in json.dumps(r), r)
    srv = ev(pg, "(()=>{const d=JSON.parse(localStorage.getItem('nusa-demo-cloud-v1')||'{}'); return JSON.stringify(d).slice(0,6000)})()")
    ok("server menyimpan data (koin 777 tidak hilang)", "777" in srv)
    ok("tidak ada toast/pesan error 'Data toko tidak valid'", not ev(pg, "document.body.innerText.includes('Data toko tidak valid')"))
    time.sleep(2.2)   # tick aurora → migrasi penanda
    sh = ev(pg, "window.__nusa.S.shop")
    ok("migrasi: aurSeen dipindah ke perangkat, equip Aurora & koin TETAP", "aurSeen" not in sh and sh["equip"].get("joran") == "pancing_aurora" and ev(pg, "window.__nusa.S.money") == 777, sh)
    ok("cadangan lokal dibuat sebelum migrasi", ev(pg, "Object.keys(localStorage).some(k=>k.startsWith('nusa-island-v1-backup-pulih-aurseen-'))"))
    ok("migrasi idempoten (tick lagi tidak mengubah)", (time.sleep(1.8) or True) and ev(pg, "JSON.stringify(window.__nusa.S.shop)") == json.dumps(sh, separators=(",", ":")))
    r2 = ev(pg, "async()=>{window.__nusa.S.money=778;window.__nusa.save();const r=await NW.cloud.syncNow();return NW.cloud.status}")
    ok("simpan ulang setelah migrasi berhasil", r2 != "error", r2)
    ev(pg, "NW.cloud.status") ; pg.screenshot(path=os.path.join(OUT, "01-akun-lama-cloud-save-ok.png"))
    ok("tanpa galat halaman", not errs, errs)
    ctx.close()
    # 2) AKUN BARU
    ctx, pg, errs = boot(b, "demo-b", mobile=True); start(pg); ev(pg, "async()=>{await NW.cloud.signInGoogle()}"); wf(pg, "NW.cloud.user", 8); time.sleep(0.8)
    ev(pg, "()=>{const S=window.__nusa.S; S.money=321; window.__nusa.save()}")
    r = ev(pg, "async()=>{await NW.cloud.syncNow(); return NW.cloud.status}")
    ok("akun baru → Cloud Save berhasil", r != "error", r)
    pg.screenshot(path=os.path.join(OUT, "02-akun-baru-mobile.png")); ctx.close()
    # 3) SIMPANAN TIDAK VALID: ditolak server, data lokal TIDAK dihapus, status error (bukan 'tersimpan')
    ctx, pg, errs = boot(b, "demo-a"); start(pg); ev(pg, "async()=>{await NW.cloud.signInGoogle()}"); wf(pg, "NW.cloud.user", 8); time.sleep(0.8)
    ev(pg, "()=>{const S=window.__nusa.S; S.money=555; S.shop={v:1,equip:{joran:'BUKAN VALID!'}}; window.__nusa.save()}")
    r = ev(pg, "async()=>{await NW.cloud.syncNow(); return NW.cloud.status}")
    ok("simpanan tidak valid → status error (tidak 'tersimpan')", r == "error", r)
    ok("data lokal tidak dihapus (koin 555 & shop utuh)", ev(pg, "window.__nusa.S.money") == 555 and ev(pg, "!!window.__nusa.S.shop.equip.joran"))
    pg.screenshot(path=os.path.join(OUT, "03-simpanan-tidak-valid.png")); ctx.close()
    b.close()
print(f"{sum(R)} PASS, {len(R)-sum(R)} FAIL")
