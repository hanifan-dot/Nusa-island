#!/usr/bin/env python3
"""Pengaman deploy D1 Tahap: membangun config deploy dari konfigurasi LIVE dan MEMBUKTIKAN, sebelum deploy, bahwa variable,
binding (termasuk NUSA_DB) dan secret tidak hilang. Tidak mencetak nilai variable/secret (hanya nama).
  build   SET_BEFORE BASE_TOML OUT MODE   : OUT = BASE_TOML (tanpa [vars]) + [vars] berisi SEMUA plain_text live, NUSA_D1_MODE=MODE (nilai lain persis live, termasuk NUSA_D1_MIGRATE)
  verify  SET_BEFORE OUT MODE D1_ID       : parse OUT (TOML) dan buktikan: vars == live (kecuali NUSA_D1_MODE=MODE), tidak ada nama secret di vars, d1 NUSA_DB id benar, assets ASSETS, name nusa-api
  dryrun  SET_BEFORE DRYLOG MODE D1_ID    : buktikan daftar binding hasil `wrangler deploy --dry-run` = live plain_text (+NUSA_D1_MODE) + NUSA_DB (D1) + ASSETS; nilai tidak dibaca/dicetak
Setiap kegagalan = exit 1 SEBELUM deploy."""
import json, re, sys, tomllib

ALLOWED = {"plain_text", "secret_text", "assets", "d1"}
NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

def die(msg):
    print("::error::" + msg); sys.exit(1)

def live(path):
    d = json.load(open(path))
    b = (d.get("result") or {}).get("bindings")
    if not d.get("success") or not isinstance(b, list): die("Konfigurasi live tidak bisa divalidasi.")
    for x in b:
        if x.get("type") not in ALLOWED: die("Binding live bertipe %r belum bisa dijamin utuh (%s). Berhenti sebelum deploy." % (x.get("type"), x.get("name")))
        if not NAME_RE.match(str(x.get("name", ""))): die("Nama binding live tidak aman.")
    plain = {x["name"]: x["text"] for x in b if x["type"] == "plain_text"}
    for k, v in plain.items():
        if not isinstance(v, str): die("Variable %s bukan teks; tidak bisa dijamin utuh." % k)
    secrets = sorted(x["name"] for x in b if x["type"] == "secret_text")
    d1 = [x for x in b if x["type"] == "d1"]; assets = [x["name"] for x in b if x["type"] == "assets"]
    return plain, secrets, d1, assets

def expected_vars(plain, mode):
    e = dict(plain); e["NUSA_D1_MODE"] = mode; return e

def build(set_before, base, out, mode):
    plain, _, _, _ = live(set_before)
    if mode not in ("off", "shadow"): die("Mode tidak diizinkan.")
    text = open(base).read()
    if re.search(r"^\[vars\]", text, re.M): die("Config dasar masih memuat [vars].")
    ev = expected_vars(plain, mode)
    lines = ["", "[vars]"] + ["%s = %s" % (k, json.dumps(v, ensure_ascii=False)) for k, v in ev.items()]
    open(out, "w").write(text.rstrip("\n") + "\n" + "\n".join(lines) + "\n")
    print("Config deploy disusun: %d variable (nama saja): %s" % (len(ev), ", ".join(sorted(ev))))

def verify(set_before, out, mode, d1_id):
    plain, secrets, d1, assets = live(set_before)
    cfg = tomllib.load(open(out, "rb"))
    if cfg.get("name") != "nusa-api": die("Target Worker bukan nusa-api.")
    want = expected_vars(plain, mode); got = cfg.get("vars") or {}
    miss = sorted(set(want) - set(got)); extra = sorted(set(got) - set(want))
    if miss: die("Variable live HILANG di config deploy: " + ", ".join(miss))
    if extra: die("Variable ASING di config deploy: " + ", ".join(extra))
    bad = sorted(k for k in want if got[k] != want[k])
    if bad: die("Nilai variable berbeda dari live: " + ", ".join(bad))
    clash = sorted(set(secrets) & set(got))
    if clash: die("Nama secret muncul sebagai variable (akan menimpa secret): " + ", ".join(clash))
    dbs = cfg.get("d1_databases") or []
    if len(dbs) != 1 or dbs[0].get("binding") != "NUSA_DB" or dbs[0].get("database_id") != d1_id: die("Binding D1 NUSA_DB di config deploy tidak benar/hilang.")
    if len(d1) != 1 or d1[0].get("name") != "NUSA_DB" or d1[0].get("id") != d1_id: die("Binding D1 live tidak sama dengan yang diharapkan.")
    a = cfg.get("assets") or {}
    if assets and a.get("binding") != assets[0]: die("Binding assets live (%s) tidak ada di config deploy." % assets[0])
    for k in cfg:
        if k not in ("name", "main", "compatibility_date", "assets", "vars", "d1_databases", "compatibility_flags", "observability", "workers_dev", "route", "routes", "triggers", "limits", "placement", "upload_source_maps", "send_metrics", "$schema"):
            die("Seksi config tak dikenal (tidak dijamin aman): " + k)
    print("BUKTI pra-deploy OK: %d variable live utuh (+NUSA_D1_MODE=%s); %d secret tidak disentuh (%s); binding D1 NUSA_DB dan assets ada." % (len(plain), mode, len(secrets), ", ".join(secrets) or "-"))

def dryrun(set_before, log, mode, d1_id):
    plain, _, _, assets = live(set_before)
    txt = re.sub(r"\x1b\[[0-9;]*m", "", open(log, errors="replace").read())
    vars_, d1s, ass = set(), set(), set()
    for m in re.finditer(r"^env\.([A-Za-z_][A-Za-z0-9_]*)\b.*?\s{2,}(Environment Variable|D1 Database|Assets)\s*$", txt, re.M):
        {"Environment Variable": vars_, "D1 Database": d1s, "Assets": ass}[m.group(2)].add(m.group(1))
    want = set(expected_vars(plain, mode))
    if vars_ != want: die("Daftar variable hasil dry-run tidak sama dengan live. Hilang: %s; asing: %s" % (sorted(want - vars_), sorted(vars_ - want)))
    if d1s != {"NUSA_DB"}: die("Dry-run: binding D1 harus tepat NUSA_DB, dapat %s" % sorted(d1s))
    if set(assets) != ass: die("Dry-run: binding assets tidak sama dengan live.")
    print("BUKTI dry-run OK: wrangler melihat %d variable (sama dengan live), D1 NUSA_DB, assets %s." % (len(vars_), ", ".join(sorted(ass)) or "-"))

if __name__ == "__main__":
    c, a = (sys.argv[1] if len(sys.argv) > 1 else ""), sys.argv[2:]
    if c == "build" and len(a) == 4: build(*a)
    elif c in ("verify", "dryrun") and len(a) == 4: (verify if c == "verify" else dryrun)(*a)
    else: print(__doc__); sys.exit(2)
