#!/usr/bin/env bash
# Tes lokal tanpa jaringan/Cloudflare: curl, npx dan cf-auth-check ditiru. Menguji bahwa deploy-api-kandidat.sh
# (1) mempertahankan binding D1 yang sudah ada di Worker live, (2) menolak backend yang akan menghapusnya,
# (3) mendeteksi binding D1 hilang/berubah sesudah deploy, (4) tetap bekerja tanpa D1 (pra-D1), (5) tidak mencetak token.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
D1ID=7061d250-a90e-4d42-8374-2a58b5041424
mkrepo(){ git -C "$1" init -q && git -C "$1" -c user.name=t -c user.email=t@t add -A && git -C "$1" -c user.name=t -c user.email=t@t commit -qm t && git -C "$1" rev-parse HEAD; }
mkdir -p "$W/game/cf-multiplayer" "$W/game/shop" "$W/game/economy" "$W/game/house" "$W/b/worker" "$W/b/server/vendor" "$W/bin" "$W/s"
echo 'name = "nusa-multiplayer"' > "$W/game/cf-multiplayer/wrangler.toml"; echo x > "$W/game/shop/qris.png"
for p in economy/core.js:economy-core.cjs house/core.js:house-core.cjs economy/sf-core.js:sf-core.cjs economy/aurora-core.js:aurora-core.cjs economy/sf2-core.js:sf2-core.cjs; do echo "// $p" > "$W/game/${p%%:*}"; cp "$W/game/${p%%:*}" "$W/b/server/vendor/${p##*:}"; done
G=$(mkrepo "$W/game")
cat > "$W/pre.toml" <<'T'
name = "nusa-api"
main = "index.js"
[assets]
directory = "../public"
binding = "ASSETS"
[vars]
FIREBASE_PROJECT_ID = "nusa-island-d2023"
T
{ cat "$W/pre.toml"; printf '[[d1_databases]]\nbinding = "NUSA_DB"\ndatabase_name = "nusa-player-data"\ndatabase_id = "%s"\n' "$D1ID"; } > "$W/d1.toml"
cp "$HERE/deploy-api-kandidat.sh" "$W/s/"; printf '#!/usr/bin/env bash\nreturn 0 2>/dev/null || exit 0\n' > "$W/s/cf-auth-check.sh"
# curl tiruan: settings live dari $LIVE (sebelum) / $AFTER (sesudah, bila ada); /health 200
cat > "$W/bin/curl" <<'C'
#!/usr/bin/env bash
out=""; url=""; fmt=""; while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift;; -w) fmt="$2"; shift;; http*) url="$1";; esac; shift; done
case "$url" in
  */settings) f="$LIVE"; [ -f "$W/deployed" ] && [ -n "${AFTER:-}" ] && f="$AFTER"; cat "$f" > "$out"; printf 200;;
  *) [ -n "$out" ] && [ "$out" != /dev/null ] && echo ok > "$out"; printf 200;;
esac
C
# npx tiruan: mencatat config deploy yang dipakai; deploy nyata menandai $W/deployed
cat > "$W/bin/npx" <<'N'
#!/usr/bin/env bash
cfg=""; dry=0; while [ $# -gt 0 ]; do case "$1" in --config) cfg="$2"; shift;; --dry-run) dry=1;; esac; shift; done
cp "$cfg" "$W/last-config.toml"; [ "$dry" = 1 ] || touch "$W/deployed"
N
chmod +x "$W/bin/curl" "$W/bin/npx"
live(){ # $1=tanpa|ada(d1) $2=file keluaran
  node -e 'const b=[{type:"assets",name:"ASSETS"}];for(const n of ["FIREBASE_PROJECT_ID","NUSA_SHOP_LIVE","ENABLE_SHOP_PRODUCTION","NUSA_PUBLIC_OPEN","NUSA_ECO_INIT_CAP","ALLOWED_ORIGINS"])b.push({type:"plain_text",name:n,text:n==="FIREBASE_PROJECT_ID"?"nusa-island-d2023":"x"});b.push({type:"secret_text",name:"GOOGLE_CLIENT_EMAIL"},{type:"secret_text",name:"GOOGLE_PRIVATE_KEY"});if(process.argv[1]==="ada"){b.push({type:"plain_text",name:"NUSA_D1_MODE",text:"off"},{type:"d1",name:"NUSA_DB",id:process.argv[3]})}require("fs").writeFileSync(process.argv[2],JSON.stringify({success:true,result:{bindings:b}}))' "$1" "$2" "$D1ID"; }
live ada "$W/live_d1.json"; live tanpa "$W/live_pre.json"
# sesudah deploy yang BURUK: binding d1 hilang
live tanpa "$W/after_nod1.json"
run(){ # $1=toml backend $2=live json $3=after json(opsional)
  rm -f "$W/deployed" "$W/last-config.toml"; cp "$1" "$W/b/worker/wrangler.toml"; B=$(mkrepo "$W/b" 2>/dev/null || git -C "$W/b" rev-parse HEAD)
  git -C "$W/b" -c user.name=t -c user.email=t@t commit -qam t --allow-empty; B=$(git -C "$W/b" rev-parse HEAD)
  W="$W" LIVE="$2" AFTER="${3:-}" PATH="$W/bin:$PATH" NUSA_GAME_DIR="$W/game" NUSA_BACKEND_DIR="$W/b" NUSA_GAME_SHA="$G" NUSA_BACKEND_SHA="$B" \
  NUSA_API_BASE=https://nusa-api.x.workers.dev CLOUDFLARE_API_TOKEN=TOKENRAHASIA123456 CLOUDFLARE_ACCOUNT_ID=acc NUSA_CONFIRM=ya bash "$W/s/deploy-api-kandidat.sh" > "$W/out.txt" 2>&1; echo $?
}
fail=0; ok(){ echo "PASS: $1"; }; bad(){ echo "FAIL: $1"; sed 's/^/   | /' "$W/out.txt" | tail -8; fail=1; }
# 1) live punya D1, backend D1 sama -> sukses; config deploy memuat [[d1_databases]] dan tanpa [vars]
rc=$(run "$W/d1.toml" "$W/live_d1.json")
if [ "$rc" = 0 ] && grep -Fxq '[[d1_databases]]' "$W/last-config.toml" && ! grep -Fq '[vars]' "$W/last-config.toml" && grep -q "binding D1 NUSA_DB (live) ada" "$W/out.txt" && grep -q "binding D1 (bila ada) dipertahankan" "$W/out.txt"; then ok "binding D1 dipertahankan"; else bad "binding D1 dipertahankan (rc=$rc)"; fi
# 2) live punya D1, backend pra-D1 -> ditolak SEBELUM deploy
rc=$(run "$W/pre.toml" "$W/live_d1.json")
if [ "$rc" != 0 ] && [ ! -f "$W/deployed" ] && grep -q "rollback-pre-d1" "$W/out.txt"; then ok "backend pra-D1 ditolak saat live ber-D1 (tanpa deploy)"; else bad "penolakan backend pra-D1 (rc=$rc)"; fi
# 3) sesudah deploy binding d1 hilang -> gagal keras
rc=$(run "$W/d1.toml" "$W/live_d1.json" "$W/after_nod1.json")
if [ "$rc" != 0 ] && grep -q "STOP HOSTING" "$W/out.txt"; then ok "binding D1 hilang sesudah deploy terdeteksi"; else bad "deteksi binding hilang (rc=$rc)"; fi
# 4) live pra-D1 + backend pra-D1 -> tetap sukses (perilaku lama utuh)
rc=$(run "$W/pre.toml" "$W/live_pre.json")
if [ "$rc" = 0 ] && ! grep -Fq 'd1_databases' "$W/last-config.toml"; then ok "jalur pra-D1 tidak berubah"; else bad "jalur pra-D1 (rc=$rc)"; fi
# 5) token tidak pernah tercetak
if ! grep -rq TOKENRAHASIA123456 "$W/out.txt"; then ok "token tidak tercetak"; else bad "token bocor"; fi
exit $fail
