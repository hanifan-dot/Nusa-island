#!/usr/bin/env bash
# NUSA ISLAND — SATU skrip rilis (dipakai tombol GitHub "Deploy Nusa Island" DAN, bila perlu, Cloud Shell).
#   bash firebase/scripts/rilis.sh [--target semua|server|game] [--ci]
# Pagar pengaman (berhenti di masalah pertama):
#   1. cabang HARUS memuat seluruh cabang produksi terbaru dan pohon kerja bersih (tidak menayangkan cabang lama);
#   2. alamat Worker ekonomi (nusa-api) dibaca dari situs live, dipakai ulang agar build produksi persis sama; nusa-api TIDAK di-deploy;
#   3. hanya Worker "nusa-multiplayer" yang di-deploy; status nusa-api dicek sebelum & sesudah;
#   4. build memakai mode `produksi` (toko QRIS, Worker ekonomi, Login 7 Hari, Cloud Save, Kedai, Event, Menu ☰ tetap);
#   5. menayangkan game hanya dengan konfirmasi eksplisit: ketik "ya" (Cloud Shell) atau NUSA_CONFIRM=ya (tombol GitHub, setelah persetujuan).
# Rahasia hanya dibaca dari lingkungan: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, GOOGLE_APPLICATION_CREDENTIALS (JSON akun layanan Firebase).
set -euo pipefail
cd "$(dirname "$0")/../.."
TARGET="${NUSA_TARGET:-semua}"; CI="${NUSA_CI:-0}"
while [ $# -gt 0 ]; do case "$1" in --target) TARGET="$2"; shift 2;; --ci) CI=1; shift;; --worker-saja) TARGET=server; shift;; *) shift;; esac; done
case "$TARGET" in semua|server|game) ;; *) echo "GAGAL: --target harus semua, server, atau game"; exit 1;; esac
PROJECT="${FIREBASE_PROJECT:-nusa-island-d2023}"; SITE="${NUSA_SITE:-https://${PROJECT}.web.app}"; PROD_BRANCH="${NUSA_PROD_BRANCH:-uji/gabungan-kedai-ekonomi}"
say() { printf '\n== %s\n' "$*"; }
die() { printf '\nGAGAL: %s\n' "$*" >&2; exit 1; }
code() { curl -s -o /dev/null -w '%{http_code}' -m 12 "$1" 2>/dev/null || echo 000; }
command -v node >/dev/null && command -v npm >/dev/null && command -v curl >/dev/null && command -v git >/dev/null || die "butuh node, npm, curl, git."
DO_SERVER=0; DO_GAME=0; [ "$TARGET" != game ] && DO_SERVER=1; [ "$TARGET" != server ] && DO_GAME=1

say "1/6 Pagar pengaman (jangan menayangkan cabang lama)"
[ -d cf-multiplayer ] && [ -f mp/proto.js ] && [ -d hud ] && [ -d shop ] && [ -d economy ] && [ -d streak ] || die "folder cf-multiplayer, mp, hud, shop, economy, atau streak tidak ada: ini bukan cabang produksi + multiplayer."
git fetch -q origin "$PROD_BRANCH" || die "tidak bisa mengambil origin/$PROD_BRANCH."
git merge-base --is-ancestor "origin/$PROD_BRANCH" HEAD || die "cabang ini TIDAK memuat origin/$PROD_BRANCH terbaru. Gabungkan dulu: git merge origin/$PROD_BRANCH"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "ada perubahan lokal yang belum di-commit; build mengambil dari pohon kerja."
[ -s shop/qris.png ] || die "shop/qris.png (QRIS resmi) tidak ada; build produksi akan menolak."
grep -q '^name = "nusa-multiplayer"$' cf-multiplayer/wrangler.toml || die "wrangler.toml tidak bernama nusa-multiplayer: dibatalkan agar Worker lain tidak tertimpa."
node tests/unit-mp.js >/tmp/unit-mp.log 2>&1 || { tail -5 /tmp/unit-mp.log; die "tes logika multiplayer gagal: tidak menayangkan."; }
tail -1 /tmp/unit-mp.log
HEAD_DESC="$(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"; echo "Cabang: $HEAD_DESC (memuat produksi $(git rev-parse --short "origin/$PROD_BRANCH")) · target: $TARGET"

say "2/6 Alamat Worker ekonomi (nusa-api) dari situs live"
API="${NUSA_API_BASE:-}"
if [ -z "$API" ]; then API=$(curl -fsS -m 15 "$SITE/cloud/config.js" 2>/dev/null | grep -oE 'apiBase: "https://[A-Za-z0-9.-]+"' | head -1 | sed -E 's/.*"(https:[^"]+)"/\1/' || true); fi
[[ "$API" =~ ^https://nusa-api\.([A-Za-z0-9-]+)\.workers\.dev$ ]] || die "tidak menemukan alamat nusa-api di $SITE/cloud/config.js. Isi NUSA_API_BASE=https://nusa-api.<akun>.workers.dev"
SUB="${BASH_REMATCH[1]}"; MP_HOST="nusa-multiplayer.${SUB}.workers.dev"
echo "nusa-api: $API  →  multiplayer: https://$MP_HOST"
API_BEFORE=$(code "$API/health"); [ "$API_BEFORE" != 000 ] || API_BEFORE=$(code "$API/"); echo "Status nusa-api sebelum: HTTP $API_BEFORE"

WR="npx --yes wrangler@4"
if [ "$DO_SERVER" = 1 ]; then
  say "3/6 Login Cloudflare"
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then echo "Memakai CLOUDFLARE_API_TOKEN dari lingkungan."
  elif [ "$CI" = 1 ]; then die "CLOUDFLARE_API_TOKEN belum diisi di GitHub Secrets (lihat docs/RILIS-GITHUB.md)."
  else
    WHO=$( (cd cf-multiplayer && $WR whoami 2>&1) || true )
    if echo "$WHO" | grep -qiE "logged in|associated with"; then echo "Memakai login Wrangler yang sudah ada."
    else
      echo "Belum ada login Cloudflare: jalankan  npx wrangler login  lalu ulangi, atau tempel token API (template 'Edit Cloudflare Workers'):"
      printf 'Token (kosong = batal): '; read -rs CLOUDFLARE_API_TOKEN; echo; [ -n "$CLOUDFLARE_API_TOKEN" ] || die "dibatalkan."; export CLOUDFLARE_API_TOKEN
    fi
  fi
  if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ] && [ "$CI" != 1 ]; then
    WHO=$( (cd cf-multiplayer && $WR whoami 2>&1) || true ); IDS=$(echo "$WHO" | grep -oE '[0-9a-f]{32}' | sort -u || true); N=$(echo "$IDS" | grep -c . || true)
    if [ "$N" = 1 ]; then export CLOUDFLARE_ACCOUNT_ID="$IDS"; elif [ "$N" -gt 1 ]; then echo "$WHO" | sed -n '1,40p'; printf 'Beberapa akun. Tempel Account ID pemilik nusa-api: '; read -r CLOUDFLARE_ACCOUNT_ID; [[ "$CLOUDFLARE_ACCOUNT_ID" =~ ^[0-9a-f]{32}$ ]] || die "Account ID tidak valid."; export CLOUDFLARE_ACCOUNT_ID; fi
  fi
  say "4/6 Deploy Worker TERPISAH nusa-multiplayer (nusa-api tidak disentuh)"
  OUTF=$(mktemp); trap 'rm -f "$OUTF"' EXIT
  ( cd cf-multiplayer && npm install --no-audit --no-fund --silent && $WR deploy ) 2>&1 | tee "$OUTF" || die "deploy Worker gagal (pesan di atas)."
  REAL=$(grep -oE 'https://nusa-multiplayer\.[A-Za-z0-9.-]+\.workers\.dev' "$OUTF" | head -1 || true); [ -n "$REAL" ] && MP_HOST="${REAL#https://}"
else say "3-4/6 Server dilewati (target=$TARGET)"; fi
OK=""; for i in 1 2 3 4 5 6 7 8; do H=$(curl -sS -m 10 "https://$MP_HOST/health" 2>/dev/null || true); if echo "$H" | grep -q '"ok":true'; then OK=1; break; fi; sleep 3; done
[ -n "$OK" ] || die "server multiplayer belum menjawab di https://$MP_HOST/health. Jalankan lagi dengan target semua/server."
echo "Server multiplayer aktif: https://$MP_HOST  $H"
API_AFTER=$(code "$API/health"); [ "$API_BEFORE" = 000 ] || { [ "$API_AFTER" = "$API_BEFORE" ] && echo "Status nusa-api sesudah: HTTP $API_AFTER (tidak berubah)." || echo "PERINGATAN: status nusa-api berubah ($API_BEFORE → $API_AFTER). Periksa dashboard Cloudflare; skrip ini tidak mengubah nusa-api."; }
[ "$DO_GAME" = 1 ] || { echo; echo "Selesai (target=server): game live TIDAK diubah."; exit 0; }

say "5/6 Build PRODUKSI (toko QRIS + Worker ekonomi + Dunia Bersama)"
NUSA_API_BASE="$API" NUSA_MP_WS="wss://$MP_HOST" bash firebase/scripts/build-hosting.sh produksi
grep -q "apiBase: \"$API\"" firebase/public/cloud/config.js || die "build tidak membawa alamat nusa-api: dibatalkan."
for d in shop economy streak world cloud audio mp hud; do [ -d "firebase/public/$d" ] || die "folder $d hilang dari build: dibatalkan."; done

say "6/6 Tayangkan"
echo "Akan menayangkan ke $SITE:  cabang $HEAD_DESC  ·  Worker ekonomi $API (tetap)  ·  multiplayer wss://$MP_HOST"
echo "Pembatalan: Firebase Console → Hosting → Riwayat rilis → Kembalikan (rollback) ke rilis sebelumnya, instan."
if [ "$CI" = 1 ]; then [ "${NUSA_CONFIRM:-}" = "ya" ] || die "NUSA_CONFIRM bukan 'ya': tidak menayangkan."
else printf 'Ketik  ya  untuk menayangkan sekarang (lainnya = batal): '; read -r A; [ "$A" = "ya" ] || { echo "Dibatalkan. Server multiplayer sudah aktif tetapi game live tidak berubah."; exit 0; }; fi
if [ "$CI" = 1 ]; then [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] && [ -s "$GOOGLE_APPLICATION_CREDENTIALS" ] || die "kredensial Firebase (FIREBASE_SERVICE_ACCOUNT) belum diisi (lihat docs/RILIS-GITHUB.md)."; fi
if command -v firebase >/dev/null; then FB=firebase; else FB="npx --yes firebase-tools"; fi
( cd firebase && $FB deploy --only hosting --project "$PROJECT" ) || die "deploy hosting gagal; game live tidak berubah."
echo; echo "Pemeriksaan akhir situs live…"; sleep 4
L1=$(curl -fsS -m 15 "$SITE/mp/endpoint.json" 2>/dev/null || true); L2=$(curl -fsS -m 15 "$SITE/cloud/config.js" 2>/dev/null | grep -c "apiBase: \"$API\"" || true)
echo "$L1" | grep -q "wss://$MP_HOST" && echo "OK  Dunia Bersama terpasang di situs live." || echo "PERINGATAN: endpoint multiplayer belum terlihat di situs live (cache CDN? coba lagi 1 menit)."
[ "$L2" -ge 1 ] && echo "OK  Konfigurasi toko/ekonomi live tidak berubah ($API)." || { echo "PERINGATAN: apiBase di situs live tidak cocok. SEGERA rollback lewat Firebase Console → Hosting."; [ "$CI" = 1 ] && exit 1; }
echo; echo "Selesai. Matikan darurat tanpa deploy: Cloudflare dashboard → Workers → nusa-multiplayer → Settings → Variables → MP_ENABLED = 0."
