#!/usr/bin/env bash
# Rilis halaman pemulihan read-only. Tidak menyentuh backend atau kode game.
set -euo pipefail
die(){ echo "STOP — tidak deploy: $*" >&2; exit 1; }
[ "$#" -eq 1 ] && [ "$1" = "--saya-setuju" ] || die "Perlu --saya-setuju"
cd "$(dirname "$0")/.."
B="fitur/rilis-login-cepat-owner-20261101"
SITE="https://nusa-island-d2023.web.app"
[ "$(git branch --show-current)" = "hotfix/inspeksi-save-readonly-20261103" ] || die "Branch salah"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "Ada perubahan lokal"
for x in node curl python3 git; do command -v "$x" >/dev/null || die "Perlu $x"; done
git fetch -q origin "$B" || die "Tidak bisa mengecek baseline"
git merge-base --is-ancestor "origin/$B" HEAD || die "Baseline telah berubah"
while IFS= read -r p; do
  [ -z "$p" ] && continue
  case "$p" in selamatkan-data.html|scripts/rilis-inspeksi-data.sh) ;; *) die "Perubahan selain halaman diagnosis: $p";; esac
done < <(git diff --name-only "origin/$B"...HEAD)

echo "[1/5] Uji dan syntax"
node -e '
const fs=require("fs"),vm=require("vm"),s=fs.readFileSync("selamatkan-data.html","utf8");
const m=s.match(/<script>([\s\S]*?)<\/script>/);
if(!m || !s.includes("connect-src") || !s.includes("nusa-island-v1")) process.exit(2);
new vm.Script(m[1]); console.log("Halaman dapat diparsing.");
' || die "Syntax HTML/JS gagal"
node tests/unit-cloud.js > /tmp/nusa-rescue.log 2>&1 || { tail -15 /tmp/nusa-rescue.log; die "Uji Cloud Save gagal"; }
node tests/unit-owner-showcase.js > /tmp/nusa-rescue.log 2>&1 || { tail -15 /tmp/nusa-rescue.log; die "Uji Owner gagal"; }
node firebase/scripts/cek-rilis.js || die "Manifest gagal"

echo "[2/5] Konfigurasi LIVE"
API="$(curl -fsS --max-time 25 "$SITE/cloud/config.js" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let m=s.match(/apiBase:\s*"(https:\/\/nusa-api\.[A-Za-z0-9-]+\.workers\.dev)"/);if(m)process.stdout.write(m[1]);})')"
[[ "$API" =~ ^https://nusa-api\.[A-Za-z0-9-]+\.workers\.dev$ ]] || die "Alamat ekonomi tak terverifikasi"
MP="$(curl -fsS --max-time 25 "$SITE/mp/endpoint.json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).ws||""))')"
[[ "$MP" =~ ^wss://nusa-multiplayer\.[A-Za-z0-9-]+\.workers\.dev$ ]] || die "Alamat multiplayer tak terverifikasi"
HTTP="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$SITE/selamatkan-data.html" || true)"
[ "$HTTP" = 404 ] || die "Halaman sebelumnya sudah ada / pemeriksaan gagal (HTTP $HTTP)"

echo "[3/5] Build hosting produksi"
NUSA_API_BASE="$API" NUSA_MP_WS="$MP" bash firebase/scripts/build-hosting.sh produksi
cp selamatkan-data.html firebase/public/selamatkan-data.html
node firebase/scripts/cek-rilis.js --build firebase/public --live "$SITE" --require-live || die "Build tidak cocok manifest"
grep -Fq 'backend: "cloud"' firebase/public/shop/config.js || die "Pembayaran produksi tidak aktif"
[ -s firebase/public/shop/qris.png ] || die "QRIS hilang"
[ -s firebase/public/world/owner-showcase.js ] || die "Megalodon Owner hilang"

echo "[4/5] Seluruh file game harus IDENTIK dengan LIVE (kecuali halaman baru)"
SITE="$SITE" python3 - <<'PY'
import concurrent.futures, os, pathlib, sys, time, urllib.error, urllib.request
site = os.environ["SITE"].rstrip("/")
root = pathlib.Path("firebase/public")
files = sorted(p for p in root.rglob("*") if p.is_file() and p.relative_to(root).as_posix() != "selamatkan-data.html")
def check(p):
    name = p.relative_to(root).as_posix()
    req = urllib.request.Request(site + "/" + name, headers={"Cache-Control":"no-cache"})
    for k in range(4):
        try:
            with urllib.request.urlopen(req,timeout=25) as r: remote=r.read()
            return None if remote == p.read_bytes() else name + ": BEDA"
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if k == 3: return name + ": NETWORK " + str(e)[:85]
            time.sleep(2*(k+1))
        except Exception as e: return name + ": " + str(e)[:85]
    return name + ": gagal"
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    problems = [e for e in pool.map(check,files) if e]
print("File dibandingkan:",len(files),"berbeda/gagal:",len(problems))
for p in problems[:15]: print(p,file=sys.stderr)
if problems: sys.exit("STOP: versi LIVE berbeda / belum dapat diverifikasi.")
PY

echo "[5/5] Deploy Hosting SAJA"
if command -v firebase >/dev/null; then FB=firebase; else FB="npx --yes firebase-tools@14"; fi
(cd firebase && $FB deploy --only hosting --project nusa-island-d2023 --non-interactive) || die "Deploy gagal"
echo "Hosting selesai. Cek: $SITE/selamatkan-data.html"
