"""Regresi dengan NUSA_KOTA=true: menjalankan suite yang sudah ada (mis. test_port, test_port_rombongan, test_rombongan) apa adanya,
tetapi setiap konteks browser diberi `window.NUSA_KOTA=true` lebih dulu. Membuktikan dermaga Pak Damar & Kapal Rombongan tetap jalan saat modul kota dimuat.
Pakai: python3 tests/browser/test_kota_regresi.py test_port"""
import sys, os, runpy
H = os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import BrowserContext
_orig = BrowserContext.add_init_script
def _patched(self, script=None, **kw):
    return _orig(self, script=("window.NUSA_KOTA=true;" + script) if isinstance(script, str) else script, **kw)
BrowserContext.add_init_script = _patched
suite = sys.argv[1]
sys.argv = [os.path.join(H, suite + ".py")]
runpy.run_path(os.path.join(H, suite + ".py"), run_name="__main__")
