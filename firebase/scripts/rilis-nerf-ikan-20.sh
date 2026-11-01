#!/usr/bin/env bash
# Rilis khusus nerf jual ikan -20%. Hanya nusa-api + Firebase Hosting.
# TIDAK merilis nusa-multiplayer, mengubah rules, pesanan, saldo, ataupun jadwal event.
set -euo pipefail
die(){ printf '\nGAGAL: %s\n' "$*" >&2; exit 1; }
[ "${1:-}" = "--saya-setuju" ] || die "Butuh --saya-setuju untuk rilis produksi."
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
BR="balancing/nerf-jual-ikan-20-20261101"
[ "$(git branch --show-current)" = "$BR" ] || die "Bukan cabang nerf -20%."
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "Repo game punya perubahan lokal."
for cmd in node npm curl git cmp; do command -v "$cmd" >/dev/null || die "Perlu $cmd."; done
grep -Fq 'FISH_SALE_MULT = 0.8' fishmath.js || die "Rumus jual ikan -20% tidak ada."
grep -Fq 'FISH_SALE_MULT = 0.8' firebase/functions/lib/fishmath.js || die "Fallback Functions belum disinkron."
grep -Fq 'S.hour' game.js || die "Kode game tidak sesuai rilis yang diharapkan."
grep -Fq 'HouseRoom' cf-multiplayer/src/index.js || die "Fitur rumah multiplayer tidak ada."
grep -Fq '64' mp/lobby-core.js || die "Server otomatis 64 belum dibawa."
[ -s shop/qris.png ] || die "QRIS game hilang."
SITE="https://nusa-island-d2023.web.app"
PROJECT="nusa-island-d2023"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "== 1/6 Kode game + backend yang serasi =="
git clone -q --depth 1 --branch "$BR" https://github.com/hanifan-dot/nusa-island-control-center.git "$TMP/api" || die "Clone repo backend privat gagal. Login GitHub di Cloud Shell harus aktif."
API_REPO="$TMP/api"
grep -Fq 'FISH_SALE_MULT = 0.8' "$API_REPO/server/vendor/fishmath.cjs" || die "Worker belum memakai nerf -20%."
for pair in "fishmath.js:fishmath.cjs" "economy/core.js:economy-core.cjs" "economy/tables.js:economy-tables.cjs" "event/core.js:event-core.cjs" "cloud/core.js:cloud-core.cjs" "house/core.js:house-core.cjs"; do
  src="${pair%%:*}"; dst="${pair#*:}"
  cmp -s "$ROOT/$src" "$API_REPO/server/vendor/$dst" || die "Sumber game dan backend tidak identik: $src"
done
[ -f "$API_REPO/worker/dashboard.js" ] || die "Dashboard Owner tidak ada."
for route in "/api/dashboard/summary" "/api/dashboard/growth" "/api/dashboard/activity" "/api/system/status"; do
 grep -Fq "'$route'" "$API_REPO/worker/index.js" || die "Dashboard akan kehilangan $route"
done
grep -Fq 'homeSearch' "$API_REPO/worker/index.js" || die "API Kunjungi Rumah hilang."
grep -Fxq 'name = "nusa-api"' "$API_REPO/worker/wrangler.toml" || die "Worker target bukan nusa-api."
echo "== 2/6 Uji otomatis (stop bila ada kegagalan) =="
for f in unit-fishmath unit-economy unit-shop unit-event unit-cloud unit-house unit-mp unit-rilis; do
 node "$ROOT/tests/$f.js" >"$TMP/$f.log" 2>&1 || { tail -25 "$TMP/$f.log"; die "Tes $f gagal. Belum ada deploy."; }
 echo "OK $f: $(tail -1 "$TMP/$f.log")"
done
node firebase/scripts/cek-rilis.js || die "Kontrak fitur game tidak lengkap."
(cd "$API_REPO" && (npm ci --silent --no-audit --no-fund || npm install --silent --no-audit --no-fund) && npm test --silent && npm run -s scan:secrets) || die "Tes API/Payment Center tidak lulus."
echo "== 3/6 Pemeriksaan kondisi live dan build =="
API="$(curl -fsS -m 20 "$SITE/cloud/config.js" | sed -nE 's/.*apiBase: "(https:\/\/nusa-api\.[A-Za-z0-9.-]+)".*/\1/p' | head -1)"
[[ "$API" =~ ^https://nusa-api\.[A-Za-z0-9-]+\.workers\.dev$ ]] || die "Alamat nusa-api produksi tidak terbaca."
MPWS="$(curl -fsS -m 20 "$SITE/mp/endpoint.json" | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{try{console.log(JSON.parse(s).ws||"")}catch(e){process.exit(1)}})')"
[[ "$MPWS" =~ ^wss://nusa-multiplayer\.[A-Za-z0-9-]+\.workers\.dev$ ]] || die "Alamat multiplayer live tidak terbaca."
curl -fsS -m 20 "https://${MPWS#wss://}/health" | grep -Fq '"ok":true' || die "Multiplayer tidak sehat."
curl -fsS -m 20 "$SITE/shop/qris.png" -o "$TMP/qris-live.png"
cmp -s "$TMP/qris-live.png" shop/qris.png || die "QRIS repo berbeda dari QRIS yang LIVE. Tidak akan mengubahnya."
code(){ curl -sS -o /dev/null -w '%{http_code}' -m 20 "$@" || true; }
[ "$(code "$API/api/dashboard/summary")" = 401 ] || die "Dashboard live tidak aman/berbeda (summary bukan 401)."
[ "$(code -X POST -H 'content-type: application/json' -d '{"data":{"q":"bu"}}' "$API/fn/homeSearch")" = 401 ] || die "API rumah live tidak aman/berbeda."
[ "$(code -X POST -H 'content-type: application/json' -d '{"data":{}}' "$API/fn/eventInfo")" = 200 ] || die "Event server live tidak sehat."
NUSA_API_BASE="$API" NUSA_MP_WS="$MPWS" bash firebase/scripts/build-hosting.sh produksi
node firebase/scripts/cek-rilis.js --build firebase/public --live "$SITE" || die "Pemeriksaan build gagal."
cmp -s firebase/public/shop/qris.png "$TMP/qris-live.png" || die "QRIS build berubah."
grep -Fq 'FISH_SALE_MULT = 0.8' firebase/public/fishmath.js || die "Nerf tidak masuk build."
grep -Fq "apiBase: \"$API\"" firebase/public/cloud/config.js || die "Alamat API berubah."
grep -Fq "$MPWS" firebase/public/mp/endpoint.json || die "Alamat multiplayer berubah."
echo "OK preflight: QRIS tetap; Event, rumah, Dashboard, multiplayer tidak berubah."
echo "== 4/6 Verifikasi konfigurasi Cloudflare produksi =="
WR="npx --yes wrangler@4"
TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [ -z "$TOKEN" ]; then
 (cd "$API_REPO/worker" && $WR whoami >/dev/null 2>&1) || die "Belum login Cloudflare. Jalankan npx wrangler@4 login di Cloud Shell, lalu ulangi."
 for p in "${XDG_CONFIG_HOME:-$HOME/.config}/.wrangler/config/default.toml" "$HOME/.wrangler/config/default.toml"; do
  if [ -f "$p" ]; then TOKEN="$(sed -nE 's/^oauth_token *= *"([^"]+)".*/\1/p' "$p" | head -1)"; [ -n "$TOKEN" ] && break; fi
 done
fi
[ -n "$TOKEN" ] || die "Login Cloudflare ada, tapi token baca pengaturan tidak dapat ditemukan. Set CLOUDFLARE_API_TOKEN secara aman di lingkungan Cloud Shell; jangan tempel di chat."
ACC="${CLOUDFLARE_ACCOUNT_ID:-}"
if [ -z "$ACC" ]; then
 ACC="$(curl -fsS -m 20 -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/accounts" | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{const a=JSON.parse(s).result||[];if(a.length===1)console.log(a[0].id)})' || true)"
fi
[[ "$ACC" =~ ^[0-9a-f]{32}$ ]] || die "Tidak dapat menentukan Account ID Cloudflare tunggal; gunakan CLOUDFLARE_ACCOUNT_ID dari akun resmi."
cfget(){ curl -fsS -m 30 -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/accounts/$ACC/workers/scripts/nusa-api/settings" | node -e '
let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{
 const j=JSON.parse(s);if(!j.success)process.exit(1);
 const vars={},secrets=[];for(const b of (j.result.bindings||[])){if(b.type==="plain_text")vars[b.name]=b.text; if(b.type==="secret_text")secrets.push(b.name);}
 console.log(JSON.stringify({vars,secrets}));
});'; }
PRE="$(cfget)" || die "Tidak boleh deploy: gagal baca pengaturan live nusa-api."
node -e '
const x=JSON.parse(process.argv[1]);
for(const k of ["NUSA_SHOP_LIVE","ENABLE_SHOP_PRODUCTION","NUSA_PUBLIC_OPEN","NUSA_ECO_INIT_CAP","FIREBASE_PROJECT_ID","ALLOWED_ORIGINS"])if(!(k in x.vars))throw Error("Variabel live tidak ada: "+k);
for(const k of ["GOOGLE_PRIVATE_KEY","GOOGLE_CLIENT_EMAIL"])if(!x.secrets.includes(k))throw Error("Secret live tidak ada: "+k);
' "$PRE" || die "Pengaturan pembayaran/FireStore live tidak lengkap."
VARS=()
while IFS= read -r -d '' v; do VARS+=(--var "$v"); done < <(printf '%s' "$PRE" | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{for(const [k,v] of Object.entries(JSON.parse(s).vars)){if(/[\r\n\0]/.test(String(v)))process.exit(1);process.stdout.write(k+":"+v+"\0")}})')
[ "${#VARS[@]}" -gt 0 ] || die "Pengaturan Worker tidak terbaca."
echo "== 5/6 Deploy hanya nusa-api (multiplayer tidak disentuh) =="
(cd "$API_REPO/worker" && $WR deploy "${VARS[@]}") || die "Deploy nusa-api gagal; Hosting belum diubah."
echo "nusa-api selesai di-deploy, memeriksa semua variabel ..."
POST="$(cfget)" || die "API sudah deploy, tapi tidak bisa memverifikasi konfigurasi; periksa dan rollback nusa-api jika perlu."
node -e '
const a=JSON.parse(process.argv[1]), b=JSON.parse(process.argv[2]);
for(const [k,v] of Object.entries(a.vars))if(b.vars[k]!==v)throw Error("Variabel berubah: "+k);
for(const k of a.secrets)if(!b.secrets.includes(k))throw Error("Secret hilang: "+k);
console.log("OK semua variabel dan secret produksi dipertahankan.");
' "$PRE" "$POST" || die "API sudah deploy tetapi konfigurasi berubah! STOP. Rollback melalui Cloudflare Worker Versions."
[ "$(code "$API/api/dashboard/summary")" = 401 ] || die "API sudah deploy, Dashboard gagal: segera rollback Worker."
[ "$(code -X POST -H 'content-type: application/json' -d '{"data":{"q":"bu"}}' "$API/fn/homeSearch")" = 401 ] || die "API sudah deploy, endpoint rumah gagal: segera rollback Worker."
[ "$(code -X POST -H 'content-type: application/json' -d '{"data":{}}' "$API/fn/eventInfo")" = 200 ] || die "API sudah deploy, eventInfo gagal: segera rollback Worker."
[ "$(code -X POST -H 'content-type: application/json' -d '{"data":{}}' "$API/fn/shop_getCatalog")" = 200 ] || die "API sudah deploy, katalog gagal: segera rollback Worker."
echo "== 6/6 Deploy Firebase Hosting game (tanpa rules/Functions) =="
if command -v firebase >/dev/null; then FB=firebase; else FB="npx --yes firebase-tools"; fi
(cd firebase && $FB deploy --only hosting --project "$PROJECT") || die "Hosting gagal. Worker sudah diubah; rollback nusa-api di Cloudflare Versions."
sleep 3
curl -fsS -m 20 "$SITE/fishmath.js" | grep -Fq 'FISH_SALE_MULT = 0.8' || die "Hosting sudah deploy tapi file nerf belum terlihat. Periksa cache/rilis."
[ "$(curl -fsS -m 20 "$SITE/mp/endpoint.json" | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>console.log(JSON.parse(s).ws))')" = "$MPWS" ] || die "Endpoint multiplayer berbeda setelah Hosting."
cmp -s <(curl -fsS -m 20 "$SITE/shop/qris.png") "$TMP/qris-live.png" || die "QRIS live berubah setelah Hosting; rollback Hosting."
echo "SUKSES: nerf jual ikan -20% kini di nusa-api dan Hosting, QRIS sama, multiplayer tidak dideploy."
