"""Uji klien mode Worker (cloud/api.js): token Bearer terkirim, galat server dipetakan, fungsi publik tanpa token, mode lama tetap bila apiBase kosong.
Jalankan: python tests/browser/test_worker_client.py"""
import os, json
from playwright.sync_api import sync_playwright
ROOT = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html"))
R = []
def ok(n, c, e=""): R.append(c); print(("PASS  " if c else "FAIL  ") + n + ("  " + str(e)[:200] if e != "" else ""), flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(); seen = []
    ctx.add_init_script("window.__cfg=1")
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    def handler(route):
        req = route.request; body = json.loads(req.post_data or "{}"); name = req.url.split("/fn/")[1]; seen.append((name, req.headers.get("authorization"), body))
        if name == "ecoBuy": route.fulfill(status=409, content_type="application/json", body=json.dumps({"error": {"status": "failed-precondition", "message": "Koin tidak cukup."}}), headers={"access-control-allow-origin": "*"})
        else: route.fulfill(status=200, content_type="application/json", body=json.dumps({"result": {"hello": name}}), headers={"access-control-allow-origin": "*"})
    pg.route("https://api.example.test/fn/**", handler)
    pg.goto(ROOT + "?cloud=off")
    pg.evaluate("()=>{window.NUSA_FIREBASE=Object.assign(window.NUSA_FIREBASE||{},{apiBase:'https://api.example.test/'});window.firebase={apps:[1],auth:()=>({currentUser:{getIdToken:async()=>'TOKEN-ABC.def.ghi'}})}}")
    ok("1 enabled() true bila apiBase terisi", pg.evaluate("NusaApi.enabled()") is True)
    r = pg.evaluate("NusaApi.call('ecoState',{},true)"); ok("2 hasil dikembalikan & token Bearer terkirim", r == {"hello": "ecoState"} and seen[-1][1] == "Bearer TOKEN-ABC.def.ghi", seen[-1])
    r = pg.evaluate("(async()=>{try{await NusaApi.call('ecoBuy',{},true);return 'BISA'}catch(e){return [e.code,e.message]}})()"); ok("3 galat server dipetakan (code + pesan)", r == ["failed-precondition", "Koin tidak cukup."], r)
    pg.evaluate("()=>{window.firebase={apps:[1],auth:()=>({currentUser:null})}}")
    r = pg.evaluate("(async()=>{try{await NusaApi.call('ecoState',{},true);return 'BISA'}catch(e){return e.code}})()"); ok("4 tanpa login: ditolak di klien sebelum mengirim", r == "unauthenticated" and len(seen) == 2, r)
    r = pg.evaluate("NusaApi.call('shop_getCatalog',{},false)"); ok("5 fungsi publik berjalan tanpa token", r == {"hello": "shop_getCatalog"} and seen[-1][1] is None, seen[-1])
    r = pg.evaluate("(async()=>{window.NUSA_FIREBASE.apiBase='';return NusaApi.enabled()})()"); ok("6 apiBase kosong → mode lama (callable) tetap dipakai", r is False)
    ok("7 tanpa error JS", errs == [], errs); b.close()
raise SystemExit(0 if all(R) else 1)
