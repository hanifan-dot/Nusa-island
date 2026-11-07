"""Uji saklar Owner (gameFlags) untuk Rumahku Sosial: flag statis MATI; server MENYALA -> tombol 👥 tampil; server MATI -> tetap tersembunyi.
Server uji lokal; BUKAN Cloudflare/Firestore asli."""
import os, sys, time, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import test_rumahku_sosial as T
from playwright.sync_api import sync_playwright

def run(flag):
    env = dict(os.environ, DEV_FLAG_SOCIAL=flag)
    port = 8799
    p = subprocess.Popen(["node", T.SRV, str(port)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    time.sleep(1.0)
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            ctx, pg, errs = T.new_page(b, "demo-a", "Budi", port=port)
            T.push_save(pg)
            T.ev(pg, "NW.social && NW.social.boot && NW.social.boot()")
            time.sleep(2.5)
            vis = not T.ev(pg, "document.getElementById('friendsBtn').classList.contains('hidden')")
            if flag == "1": pg.screenshot(path=os.path.join(T.SHOTS, "flag-server-on.png"))
            else: pg.screenshot(path=os.path.join(T.SHOTS, "flag-server-off.png"))
            b.close(); return vis
    finally: p.terminate()

on = run("1"); off = run("0")
T.ok("server ON -> tombol 👥 tampil", on is True)
T.ok("server OFF -> tombol 👥 tersembunyi", off is False)
sys.exit(0 if on and not off else 1)
