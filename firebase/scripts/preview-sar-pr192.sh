#!/usr/bin/env bash
# NUSA ISLAND — PREVIEW SAR Laut (PR #192) di Firebase Hosting PREVIEW CHANNEL. BUKAN rilis.
#   Jalankan di Cloud Shell / terminal Owner (butuh login Firebase milik Owner). Cabang ini = PR #192 (e41373d) + skrip ini saja:
#     git clone https://github.com/hanifan-dot/Nusa-island.git && cd Nusa-island
#     git checkout ci/preview-sar-pr192-20261128
#     firebase login --no-localhost      # bila belum login (akun Owner)
#     bash firebase/scripts/preview-sar-pr192.sh            # tanya konfirmasi; ketik  preview
#     bash firebase/scripts/preview-sar-pr192.sh --dry-run  # tanpa jaringan live & tanpa deploy (uji lokal)
#
# Yang dilakukan: bangun build produksi dengan alamat API + multiplayer ASLI (dibaca dari situs live), ubah NUSA_SAR menjadi true
# HANYA di firebase/public/cloud/config.js (artefak build, gitignored, tidak pernah di-commit), lalu deploy ke channel "sar-pr192"
# dengan masa berlaku 7 hari. Setelah itu memeriksa bahwa situs live tidak berubah dan tidak memuat sar/*.
#
# Yang TIDAK dilakukan (dan dicegah oleh skrip): deploy ke channel live, merge, mengubah Firebase Auth/Firestore/Cloudflare Worker,
# menulis ke repo, mengubah ekonomi/QRIS/event/data pemain. Domain preview TIDAK ditambahkan ke Firebase Auth.
set -euo pipefail
cd "$(dirname "$0")/../.."

TESTED_SHA="e41373d44ea7977e33dbdec78741e56c95732351"   # SHA PR #192 yang diuji; satu-satunya selisih yang boleh: skrip ini
SRC_BRANCH="fitur/sar-laut-prototipe-20261128"   # cabang PR #192
PROJECT="${FIREBASE_PROJECT:-nusa-island-d2023}"; SITE="https://${PROJECT}.web.app"
CHANNEL="sar-pr192"; EXPIRES="7d"
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1
EVID="${TMPDIR:-/tmp}/sar-preview-evidence"; mkdir -p "$EVID"
say() { printf '\n== %s\n' "$*"; }
die() { printf '\nGAGAL: %s\n' "$*" >&2; exit 1; }
fetch() { curl -fsS -m 25 --retry 2 "$1"; }
code()  { curl -s -o /dev/null -w '%{http_code}' -m 20 "$1" 2>/dev/null || echo 000; }
sha()   { sha256sum | cut -c1-16; }

[ "$CHANNEL" != "live" ] || die "channel tidak boleh 'live'."
command -v node >/dev/null && command -v npm >/dev/null && command -v curl >/dev/null && command -v git >/dev/null || die "butuh node, npm, curl, git."

say "1/8 Pagar sumber (pohon kerja bersih, SHA yang diuji, flag sumber MATI)"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "ada perubahan lokal yang belum di-commit."
git cat-file -e "$TESTED_SHA^{commit}" 2>/dev/null || die "SHA $TESTED_SHA tidak ada di checkout ini. Ambil cabang $SRC_BRANCH lengkap."
git merge-base --is-ancestor "$TESTED_SHA" HEAD || die "HEAD tidak memuat SHA yang diuji ($TESTED_SHA)."
EXTRA="$(git diff --name-only "$TESTED_SHA" HEAD | grep -v '^firebase/scripts/preview-sar-pr192.sh$' || true)"
[ -z "$EXTRA" ] || die "HEAD berbeda dari SHA yang diuji selain skrip ini: $EXTRA"
grep -qF 'if (typeof window.NUSA_SAR !== "boolean") window.NUSA_SAR = false;' cloud/config.js || die "cloud/config.js sumber tidak memuat bawaan NUSA_SAR=false."
! grep -qE 'window\.NUSA_SAR *= *true' cloud/config.js || die "cloud/config.js sumber sudah memuat NUSA_SAR=true. Dibatalkan."
echo "SHA diuji: $TESTED_SHA  ·  HEAD: $(git rev-parse HEAD)  ·  sumber NUSA_SAR=false OK"

say "2/8 Tes lokal"
for t in sar phone mp; do node "tests/unit-$t.js" 2>&1 | tail -1; node "tests/unit-$t.js" >/dev/null 2>&1 || die "unit-$t gagal."; done

API="${NUSA_API_BASE:-}"; WS="${NUSA_MP_WS:-}"
if [ "$DRY" = 1 ]; then
  say "3/8 (dry-run) situs live TIDAK dibaca"
  [ -n "$API" ] && [ -n "$WS" ] || { API="https://nusa-api.dryrun.workers.dev"; WS="wss://nusa-multiplayer.dryrun.workers.dev"; echo "Memakai alamat uji dry-run (BUKAN alamat live)."; }
else
  say "3/8 Alamat API + multiplayer ASLI dari situs live, dan snapshot production sebelum preview"
  LIVE_CFG="$(fetch "$SITE/cloud/config.js")" || die "tidak bisa membaca $SITE/cloud/config.js."
  [ -n "$API" ] || API="$(printf '%s' "$LIVE_CFG" | grep -oE 'apiBase: "https://nusa-api\.[A-Za-z0-9-]+\.workers\.dev"' | head -1 | cut -d '"' -f 2)"
  [[ "$API" =~ ^https://nusa-api\.([A-Za-z0-9-]+)\.workers\.dev$ ]] || die "alamat nusa-api live tidak ditemukan."
  SUB="${BASH_REMATCH[1]}"
  if [ -z "$WS" ]; then WS="$(fetch "$SITE/mp/endpoint.json" 2>/dev/null | grep -oE 'wss://nusa-multiplayer\.[A-Za-z0-9.-]+' | head -1 || true)"; fi
  [ -n "$WS" ] || WS="wss://nusa-multiplayer.${SUB}.workers.dev"
  [[ "$WS" =~ ^wss://nusa-multiplayer\.[A-Za-z0-9.-]+$ ]] || die "alamat multiplayer tidak valid: $WS"
  printf '%s' "$LIVE_CFG" | grep -qE 'window\.NUSA_SAR *= *true' && die "situs live ternyata sudah NUSA_SAR=true. Berhenti; periksa."
  {
    echo "== production SEBELUM preview ($(date -u +%FT%TZ))"
    for p in index.html cloud/config.js sw.js manifest.webmanifest mp/endpoint.json; do echo "$p $(fetch "$SITE/$p" | sha) HTTP $(code "$SITE/$p")"; done
    for p in sar/core.js sar/client.js; do B="$(fetch "$SITE/$p" 2>/dev/null || true)"; echo "$p HTTP $(code "$SITE/$p") memuat_kode_SAR=$(printf '%s' "$B" | grep -c 'canOffer' || true)"; done
  } | tee "$EVID/prod-before.txt"
  grep -qE '^sar/core.js .*memuat_kode_SAR=0' "$EVID/prod-before.txt" || die "situs live ternyata sudah menyajikan kode SAR. Berhenti."
fi
echo "API: $API"; echo "Multiplayer: $WS"

say "4/8 Build PRODUKSI (sumber tidak diubah)"
NUSA_API_BASE="$API" NUSA_MP_WS="$WS" bash firebase/scripts/build-hosting.sh produksi
grep -q "apiBase: \"$API\"" firebase/public/cloud/config.js || die "build tidak membawa alamat API."
grep -q "$WS" firebase/public/mp/endpoint.json || die "build tidak membawa alamat multiplayer."
if [ "$DRY" = 1 ]; then node firebase/scripts/cek-rilis.js --src . --build firebase/public | tail -1
else node firebase/scripts/cek-rilis.js --src . --build firebase/public --live "$SITE" | tail -1; fi

say "5/8 NUSA_SAR=true HANYA di artefak build (firebase/public/cloud/config.js)"
CFG=firebase/public/cloud/config.js; cp "$CFG" "$EVID/config.before.js"
sed -i 's|^if (typeof window.NUSA_SAR !== "boolean") window.NUSA_SAR = false;.*$|window.NUSA_SAR = true;   // PREVIEW PR #192: HANYA artefak build ini; sumber di repo tetap false|' "$CFG"
[ "$(grep -cE '^window\.NUSA_SAR = true;' "$CFG")" = 1 ] || die "penggantian NUSA_SAR di artefak gagal."
[ "$(diff "$EVID/config.before.js" "$CFG" | grep -c '^>')" = 1 ] || die "lebih dari satu baris artefak berubah."
{ diff "$EVID/config.before.js" "$CFG" || true; } | tee "$EVID/config.diff.txt" | cut -c1-140
[ -s firebase/public/sar/core.js ] && [ -s firebase/public/sar/client.js ] || die "sar/* tidak ada di artefak."
git show HEAD:cloud/config.js | grep -qF 'if (typeof window.NUSA_SAR !== "boolean") window.NUSA_SAR = false;' || die "sumber di commit berubah?!"
[ -z "$(git status --porcelain --untracked-files=no)" ] && [ -z "$(git status --porcelain firebase/public 2>/dev/null)" ] || die "pohon kerja kotor setelah build; sumber tidak boleh berubah."
echo "OK: artefak NUSA_SAR=true, sumber di commit NUSA_SAR=false, pohon kerja bersih."

if [ "$DRY" = 1 ]; then say "(dry-run) selesai. Deploy dan pemeriksaan live DILEWATI."; echo "Bukti lokal: $EVID"; exit 0; fi

say "6/8 Konfirmasi deploy ke PREVIEW CHANNEL"
echo "Project: $PROJECT · channel: $CHANNEL (bukan live) · kedaluwarsa: $EXPIRES · SHA: $TESTED_SHA"
echo "Production $SITE tidak akan disentuh. Pembatalan preview:  firebase hosting:channel:delete $CHANNEL --project $PROJECT"
if [ "${NUSA_CONFIRM:-}" != "preview" ]; then printf 'Ketik  preview  untuk membuat preview (lainnya = batal): '; read -r A; [ "$A" = "preview" ] || { echo "Dibatalkan."; exit 0; }; fi
if command -v firebase >/dev/null; then FB=firebase; else FB="npx --yes firebase-tools"; fi

say "7/8 Deploy ke preview channel"
( cd firebase && $FB hosting:channel:deploy "$CHANNEL" --project "$PROJECT" --expires "$EXPIRES" --json ) | tee "$EVID/deploy.json" >/dev/null || die "deploy preview gagal; production tidak berubah."
URL="$(node -e 'const t=require("fs").readFileSync(process.argv[1],"utf8");const m=t.match(/https:\/\/[A-Za-z0-9.-]+--[A-Za-z0-9-]+\.web\.app/);const e=t.match(/"expireTime"\s*:\s*"([^"]+)"/);console.log((m?m[0]:"")+" "+(e?e[1]:""))' "$EVID/deploy.json")"
PURL="${URL%% *}"; PEXP="${URL#* }"; [ -n "$PURL" ] || die "URL preview tidak ditemukan di $EVID/deploy.json."
case "$PURL" in "$SITE"*) die "URL hasil sama dengan production?! Periksa.";; esac
echo "URL PREVIEW: $PURL"; echo "KEDALUWARSA: ${PEXP:-7 hari}"

say "8/8 Pemeriksaan sesudah deploy"
sleep 5
{
  echo "== PREVIEW $PURL"
  echo "cloud/config.js NUSA_SAR=true: $(fetch "$PURL/cloud/config.js" | grep -cE '^window\.NUSA_SAR = true;')"
  for p in sar/core.js sar/client.js sar/sar.css; do echo "$p HTTP $(code "$PURL/$p") bytes=$(fetch "$PURL/$p" | wc -c)"; done
  echo "apiBase live = preview: $(fetch "$PURL/cloud/config.js" | grep -c "apiBase: \"$API\"")"
  echo "== production SESUDAH preview ($(date -u +%FT%TZ))"
  for p in index.html cloud/config.js sw.js manifest.webmanifest mp/endpoint.json; do echo "$p $(fetch "$SITE/$p" | sha) HTTP $(code "$SITE/$p")"; done
  for p in sar/core.js sar/client.js; do B="$(fetch "$SITE/$p" 2>/dev/null || true)"; echo "$p HTTP $(code "$SITE/$p") memuat_kode_SAR=$(printf '%s' "$B" | grep -c 'canOffer' || true)"; done
} | tee "$EVID/after.txt"
echo "== production berubah? (hash sebelum vs sesudah)"
if diff <(sed -n '/^index.html/,/^mp\/endpoint.json/p' "$EVID/prod-before.txt" | sed 's/ HTTP.*//') <(sed -n '/production SESUDAH/,$p' "$EVID/after.txt" | sed -n '/^index.html/,/^mp\/endpoint.json/p' | sed 's/ HTTP.*//'); then echo "TIDAK BERUBAH (production sama persis)."; else echo "PERINGATAN: ada perbedaan production. Bisa jadi rilis lain; bandingkan $EVID."; fi

if python3 -c 'import playwright' 2>/dev/null; then
  say "Pemeriksaan console (Chromium headless, tamu)"
  PURL="$PURL" python3 - <<'PY' || echo "(pemeriksaan console gagal dijalankan; periksa manual lewat Chrome DevTools)"
import os
from playwright.sync_api import sync_playwright
errs, bad = [], []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 390, "height": 844})
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("response", lambda r: bad.append((r.status, r.url)) if r.status >= 400 else None)
    pg.goto(os.environ["PURL"], wait_until="load"); pg.wait_for_timeout(7000)
    print("sar dimuat:", pg.evaluate("typeof NW!=='undefined' && !!NW.sar"))
    b.close()
errs = [e for e in errs if "gstatic" not in e and "ERR_BLOCKED" not in e]
print("error console:", len(errs)); [print("  ", e[:200]) for e in errs[:10]]
print("respons >=400:", len(bad)); [print("  ", s, u[:140]) for s, u in bad[:10]]
PY
fi
echo; echo "SELESAI. Bukti: $EVID. Production tidak di-deploy. Hapus preview kapan saja: firebase hosting:channel:delete $CHANNEL --project $PROJECT"
