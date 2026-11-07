#!/usr/bin/env bash
# Deploy hanya portal pemain; nusa-api sudah live. Fail closed jika ada perubahan kode game.
set -euo pipefail
die(){ echo "STOP: $*" >&2; exit 1; }
[ "$#" -eq 1 ] && [ "$1" = "--saya-setuju" ] || die "Butuh --saya-setuju"
cd "$(dirname "$0")/.."
[ "$(git branch --show-current)" = "fitur/portal-pemulihan-20261103" ] || die "Branch salah"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "File terlacak berubah"
for x in node python3 git curl; do command -v "$x" >/dev/null || die "Perlu $x"; done
SITE="https://nusa-island-d2023.web.app"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git fetch -q origin hotfix/inspeksi-save-readonly-20261103 || die "Baseline tak bisa diambil"
git merge-base --is-ancestor origin/hotfix/inspeksi-save-readonly-20261103 HEAD || die "Baseline tidak cocok"
while IFS= read -r p; do
 [ -z "$p" ] && continue
 case "$p" in ajukan-pemulihan.html|firebase/scripts/build-hosting.sh|tests/unit-recovery-portal.js|scripts/rilis-portal-pemulihan-saja.sh|.github/workflows/guest-recovery-portal-tests.yml) ;;
 *) die "Perubahan tidak diizinkan: $p";;
 esac
done < <(git diff --name-only origin/hotfix/inspeksi-save-readonly-20261103...HEAD)
echo "== 1/5 Tes Cloud Save, portal dan manifest =="
node tests/unit-recovery-portal.js
node tests/unit-rescue-page.js
node tests/unit-cloud.js
node firebase/scripts/cek-rilis.js

echo "== 2/5 Backend LIVE harus siap (HTTP 307 halaman Owner boleh redirect) =="
API="$(curl -fsS --max-time 25 "$SITE/cloud/config.js" | sed -nE 's/.*apiBase: "(https:\/\/nusa-api\.[A-Za-z0-9-]+\.workers\.dev)".*/\1/p' | head -1)"
[[ "$API" =~ ^https://nusa-api\.[A-Za-z0-9-]+\.workers\.dev$ ]] || die "Alamat API tak valid"
MP="$(curl -fsS --max-time 25 "$SITE/mp/endpoint.json" | node -e 'let s="";process.stdin.on("data",x=>s+=x).on("end",()=>process.stdout.write(JSON.parse(s).ws||""))')"
[[ "$MP" =~ ^wss://nusa-multiplayer\.[A-Za-z0-9-]+\.workers\.dev$ ]] || die "Alamat multiplayer tak valid"
status(){ curl -sS --max-time 25 -o /dev/null -w '%{http_code}' "$@" || true; }
[ "$(status "$API/api/recovery/pending")" = "401" ] || die "Owner API tidak terlindungi"
[ "$(status -X POST -H 'content-type: application/json' -d '{"data":{}}' "$API/fn/recoveryRequest")" = "401" ] || die "Recovery tidak terlindungi"
[ "$(status "$API/api/dashboard/summary")" = "401" ] || die "Dashboard Owner tidak terlindungi"
[ "$(status -X POST -H 'content-type: application/json' -d '{"data":{}}' "$API/fn/shop_getCatalog")" = "200" ] || die "Toko gagal"
curl -fsSL --max-redirs 3 --proto-redir =https --max-time 30 -w '%{url_effective}' \
 -o "$TMP/owner.html" "$API/pemulihan.html" > "$TMP/owner-url" || die "Halaman Owner gagal dibuka"
case "$(cat "$TMP/owner-url")" in "$API"/*) ;; *) die "Redirect ke luar Worker resmi";; esac
grep -Fq 'Recovery Center' "$TMP/owner.html" || die "Panel Owner recovery tidak tersedia"
grep -Fq 'Setujui pemulihan' "$TMP/owner.html" || die "Panel Owner tidak lengkap"
echo "PASS: halaman Owner terbaca setelah redirect"
[ "$(status "$SITE/ajukan-pemulihan.html")" = "404" ] || die "Portal sudah LIVE atau situs tidak konsisten"

echo "== 3/5 Build PRODUKSI tanpa mengubah kode =="
NUSA_API_BASE="$API" NUSA_MP_WS="$MP" bash firebase/scripts/build-hosting.sh produksi
node firebase/scripts/cek-rilis.js --build firebase/public --live "$SITE" --require-live
[ -s firebase/public/shop/qris.png ] || die "QRIS hilang"
[ -s firebase/public/selamatkan-data.html ] || die "Alat cadangan lama hilang"
[ -s firebase/public/ajukan-pemulihan.html ] || die "Portal tidak ikut build"
grep -Fq 'backend: "cloud"' firebase/public/shop/config.js || die "Mode toko berubah"

echo "== 4/5 Cocokkan SELURUH file lama dengan LIVE =="
SITE="$SITE" python3 - <<'PY'
import concurrent.futures,os,pathlib,sys,time,urllib.request
root=pathlib.Path('firebase/public')
files=sorted(p for p in root.rglob('*') if p.is_file() and p.relative_to(root).as_posix()!='ajukan-pemulihan.html')
def check(p):
 name=p.relative_to(root).as_posix()
 req=urllib.request.Request(os.environ['SITE']+'/'+name,headers={'Cache-Control':'no-cache'})
 for i in range(3):
  try:
   with urllib.request.urlopen(req,timeout=25) as r: remote=r.read()
   return None if remote==p.read_bytes() else name+': BEDA'
  except Exception as e:
   if i==2:return name+': gagal baca '+str(e)[:60]
   time.sleep(i+1)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 bad=[r for r in pool.map(check,files) if r]
print('File lama:',len(files),'berbeda/gagal:',len(bad))
for x in bad[:15]:print(x,file=sys.stderr)
if bad:sys.exit(1)
PY

echo "== 5/5 DEPLOY FIREBASE HOSTING SAJA =="
if command -v firebase >/dev/null; then
 (cd firebase && firebase deploy --only hosting --project nusa-island-d2023 --non-interactive) || die "Hosting gagal"
else
 (cd firebase && npx --yes firebase-tools@14 deploy --only hosting --project nusa-island-d2023 --non-interactive) || die "Hosting gagal"
fi
curl -fsS --max-time 25 "$SITE/ajukan-pemulihan.html" | grep -Fq 'Kirim Permintaan Pemulihan' || die "Halaman belum muncul setelah deploy"
echo "SUKSES: portal pemulihan pemain LIVE; Worker TIDAK di-deploy ulang."
echo "$SITE/ajukan-pemulihan.html"
