#!/usr/bin/env python3
"""Tes tanpa jaringan untuk d1-tahap-config.py: pembayaran/QRIS, Firebase, Cloud Save/ekonomi, SF, Podium, secret dan binding D1 tidak boleh hilang."""
import json, os, re, subprocess, sys, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__)); TOOL = os.path.join(HERE, "d1-tahap-config.py"); D1 = "7061d250-a90e-4d42-8374-2a58b5041424"
VARS = {  # nilai contoh (bukan nilai produksi) dengan karakter yang menyulitkan TOML
    "FIREBASE_PROJECT_ID": "nusa-island-d2023", "FIREBASE_WEB_CONFIG": '{"apiKey":"AIza-contoh","projectId":"nusa-island-d2023"}',
    "ALLOWED_ORIGINS": "https://nusa-island-d2023.web.app,https://nusa-island-d2023.firebaseapp.com",
    "NUSA_SHOP_LIVE": "1", "ENABLE_SHOP_PRODUCTION": "ya", "NUSA_PUBLIC_OPEN": "ya", "WHATSAPP": "+62 896-7234-4059",   # pembayaran / QRIS
    "NUSA_ECO_INIT_CAP": "20000", "NUSA_CONFIG_CACHE_MS": "15000", "NUSA_FS_BREAKER_MS": "60000",                      # Cloud Save / ekonomi / kuota
    "NUSA_LEADERBOARD": "ya",                                                                                          # Podium
    "NUSA_D1_MODE": "off", "NUSA_D1_MIGRATE": "ya", "CATATAN": 'a "kutip" \\ garis\tmiring',
}
def wr(p, t):
    with open(p, "w") as fh: fh.write(t)
def rd(p):
    with open(p) as fh: return fh.read()
SECRETS = ["GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY", "QRIS_SECRET"]
BASE = 'name = "nusa-api"\nmain = "index.js"\ncompatibility_date = "2026-10-01"\n\n[assets]\ndirectory = "../public"\nbinding = "ASSETS"\nrun_worker_first = true\n\n[[d1_databases]]\nbinding = "NUSA_DB"\ndatabase_name = "nusa-player-data"\ndatabase_id = "%s"\nmigrations_dir = "../migrations"\n' % D1

def live(vars_=VARS, secrets=SECRETS, d1=True, extra=()):
    b = [{"type": "assets", "name": "ASSETS"}] + [{"type": "plain_text", "name": k, "text": v} for k, v in vars_.items()] + [{"type": "secret_text", "name": s} for s in secrets]
    if d1: b.append({"type": "d1", "name": "NUSA_DB", "id": D1})
    return {"success": True, "result": {"bindings": b + list(extra)}}

class T(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(); self.p = lambda n: os.path.join(self.d, n)
        wr(self.p("base.toml"), BASE)
    def run_(self, *a):
        r = subprocess.run([sys.executable, TOOL, *a], capture_output=True, text=True); return r.returncode, r.stdout + r.stderr
    def put(self, o, n="live.json"): wr(self.p(n), json.dumps(o)); return self.p(n)
    def build(self, lv=None, mode="shadow"):
        s = self.put(lv or live()); rc, out = self.run_("build", s, self.p("base.toml"), self.p("out.toml"), mode); return s, rc, out

    def test_semua_dipertahankan_dan_hanya_mode_berubah(self):
        s, rc, out = self.build(); self.assertEqual(rc, 0, out)
        import tomllib
        with open(self.p("out.toml"), "rb") as fh: cfg = tomllib.load(fh)
        v = cfg["vars"]
        for k, val in VARS.items():
            self.assertEqual(v[k], "shadow" if k == "NUSA_D1_MODE" else val, k)
        for grup, ks in {"pembayaran/QRIS": ["NUSA_SHOP_LIVE", "ENABLE_SHOP_PRODUCTION", "NUSA_PUBLIC_OPEN", "WHATSAPP"], "Firebase": ["FIREBASE_PROJECT_ID", "FIREBASE_WEB_CONFIG", "ALLOWED_ORIGINS"], "Cloud Save/ekonomi": ["NUSA_ECO_INIT_CAP", "NUSA_CONFIG_CACHE_MS", "NUSA_FS_BREAKER_MS"], "SF/Podium": ["NUSA_LEADERBOARD"], "kunci salin tidak disentuh": ["NUSA_D1_MIGRATE"]}.items():
            for k in ks: self.assertEqual(v[k], VARS[k], grup + ":" + k)
        self.assertEqual(cfg["d1_databases"][0]["database_id"], D1); self.assertEqual(cfg["assets"]["binding"], "ASSETS")
        for sct in SECRETS: self.assertNotIn(sct, v, "secret tidak boleh jadi variable")
        rc, out = self.run_("verify", s, self.p("out.toml"), "shadow", D1); self.assertEqual(rc, 0, out); self.assertIn("BUKTI pra-deploy OK", out)
        self.assertNotIn("AIza-contoh", out); self.assertNotIn("896-7234", out)   # nilai tidak dicetak
    def test_mode_off_juga_utuh(self):
        s, rc, out = self.build(mode="off"); self.assertEqual(rc, 0, out); self.assertEqual(self.run_("verify", s, self.p("out.toml"), "off", D1)[0], 0)
    def test_mode_on_atau_asing_ditolak(self):
        for m in ("on", "ON", "", "shadow2"): self.assertNotEqual(self.build(mode=m)[1], 0, m)
    def _tamper(self, fn, pesan):
        s, rc, _ = self.build(); self.assertEqual(rc, 0); t = rd(self.p("out.toml")); wr(self.p("out.toml"), fn(t))
        rc, out = self.run_("verify", s, self.p("out.toml"), "shadow", D1); self.assertEqual(rc, 1, out); self.assertIn(pesan, out)
    def test_variabel_pembayaran_hilang_terdeteksi(self): self._tamper(lambda t: re.sub(r"^NUSA_SHOP_LIVE = .*\n", "", t, flags=re.M), "HILANG")
    def test_variabel_firebase_hilang_terdeteksi(self): self._tamper(lambda t: re.sub(r"^FIREBASE_PROJECT_ID = .*\n", "", t, flags=re.M), "HILANG")
    def test_variabel_cloudsave_hilang_terdeteksi(self): self._tamper(lambda t: re.sub(r"^NUSA_ECO_INIT_CAP = .*\n", "", t, flags=re.M), "HILANG")
    def test_variabel_podium_hilang_terdeteksi(self): self._tamper(lambda t: re.sub(r"^NUSA_LEADERBOARD = .*\n", "", t, flags=re.M), "HILANG")
    def test_nilai_pembayaran_berubah_terdeteksi(self): self._tamper(lambda t: t.replace('ENABLE_SHOP_PRODUCTION = "ya"', 'ENABLE_SHOP_PRODUCTION = "tidak"'), "berbeda")
    def test_variabel_asing_terdeteksi(self): self._tamper(lambda t: t + 'NUSA_BARU = "1"\n', "ASING")
    def test_secret_jadi_variabel_terdeteksi(self): self._tamper(lambda t: t + 'GOOGLE_PRIVATE_KEY = "x"\n', "ASING")   # nama asing sekaligus bentrok secret
    def test_binding_d1_hilang_terdeteksi(self): self._tamper(lambda t: t.split("[[d1_databases]]")[0] + "[vars]" + t.split("[vars]")[1], "D1 NUSA_DB")
    def test_binding_d1_id_salah_terdeteksi(self): self._tamper(lambda t: t.replace(D1, "00000000-0000-0000-0000-000000000000"), "D1 NUSA_DB")
    def test_assets_hilang_terdeteksi(self): self._tamper(lambda t: t.replace('binding = "ASSETS"\n', ""), "assets")
    def test_worker_salah_terdeteksi(self): self._tamper(lambda t: t.replace('name = "nusa-api"', 'name = "lain"'), "bukan nusa-api")
    def test_binding_live_tak_dikenal_menghentikan_sebelum_deploy(self):
        rc, out = self.build(live(extra=[{"type": "kv_namespace", "name": "KV1"}]))[1:]; self.assertEqual(rc, 1); self.assertIn("belum bisa dijamin utuh", out)
    def test_tanpa_d1_live_ditolak_pada_verifikasi(self):
        s = self.put(live(d1=False)); self.assertEqual(self.run_("build", s, self.p("base.toml"), self.p("out.toml"), "off")[0], 0)
        rc, out = self.run_("verify", s, self.p("out.toml"), "off", D1); self.assertEqual(rc, 1); self.assertIn("D1 live", out)
    def test_config_dasar_dengan_vars_ditolak(self):
        wr(self.p("base.toml"), BASE + '[vars]\nA = "1"\n'); rc, out = self.build()[1:]; self.assertEqual(rc, 1)
    def test_dryrun_log(self):
        s, rc, _ = self.build(); self.assertEqual(rc, 0)
        rows = ["env.NUSA_DB (nusa-player-data)".ljust(76) + "D1 Database", "env.ASSETS".ljust(76) + "Assets"] + ['env.%s ("%s")' % (k, "x") + " " * 40 + "Environment Variable" for k in VARS]
        ok = "\n".join(["Your Worker has access to the following bindings:", "Binding  Resource"] + rows + ["--dry-run: exiting now."])
        wr(self.p("dry.log"), ok); rc, out = self.run_("dryrun", s, self.p("dry.log"), "shadow", D1); self.assertEqual(rc, 0, out); self.assertIn("BUKTI dry-run OK", out)
        for hilang, pesan in (("env.WHATSAPP", "Hilang"), ("env.NUSA_DB", "D1"), ("env.ASSETS", "assets")):
            wr(self.p("dry.log"), "\n".join(l for l in ok.split("\n") if not l.startswith(hilang)))
            rc, out = self.run_("dryrun", s, self.p("dry.log"), "shadow", D1); self.assertEqual(rc, 1, hilang); self.assertIn(pesan, out)
if __name__ == "__main__": unittest.main(verbosity=2)
