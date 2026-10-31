#!/usr/bin/env bash
# NUSA ISLAND — Tahap 4: AKTIFKAN Dunia Bersama pada game yang SUDAH LIVE, dengan SATU perintah (Cloud Shell), setelah kamu menyetujui rilis.
#   bash firebase/scripts/aktifkan-multiplayer.sh
#
# Yang dilakukan, berurutan, dan berhenti di masalah pertama:
#   1. Pagar pengaman: cabang ini HARUS memuat seluruh cabang produksi terbaru (uji/gabungan-kedai-ekonomi) dan pohon kerja harus bersih.
#   2. Membaca alamat Worker ekonomi (nusa-api) dari situs live (atau NUSA_API_BASE) → dipakai ulang agar build produksi tetap persis sama.
#   3. Memakai login Wrangler/Cloudflare yang SUDAH ADA di Cloud Shell. Token baru hanya diminta bila memang belum ada login sama sekali.
#   4. Deploy Worker TERPISAH "nusa-multiplayer" (tidak menyentuh nusa-api; status nusa-api dicek sebelum & sesudah).
#   5. Cek kesehatan, lalu bangun game dengan MODE PRODUKSI (toko QRIS, Worker ekonomi, Login 7 Hari, Cloud Save, Kedai tetap) + Dunia Bersama.
#   6. Menayangkan ke Firebase Hosting HANYA setelah kamu mengetik "ya". Opsi: --worker-saja (hanya server, game tidak disentuh).
set -euo pipefail
cd "$(dirname "$0")/../.."
WORKER_ONLY=0; [ "${1:-}" = "--worker-saja" ] && WORKER_ONLY=1
PROJECT="${FIREBASE_PROJECT:-nusa-island-d2023}"
SITE="${NUSA_SITE:-https://${PROJECT}.web.app}"
PROD_BRANCH="${NUSA_PROD_BRANCH:-uji/gabungan-kedai-ekonomi}"
say() { printf '\n== %s\n' "$*"; }
die() { printf '\nGAGAL: %s\n' "$*" >&2; exit 1; }
code() { curl -s -o /dev/null -w '%{http_code}' -m 12 "$1" 2>/dev/null || echo 000; }
command -v node >/dev/null && command -v npm >/dev/null && command -v curl >/dev/null && command -v git >/dev/null || die "butuh node, npm, curl, git (Cloud Shell sudah punya)."

say "1/6 Pagar pengaman (jangan menayangkan cabang lama)"
[ -d cf-multiplayer ] && [ -f mp/proto.js ] && [ -d hud ] && [ -d shop ] && [ -d economy ] && [ -d streak ] || die "folder cf-multiplayer, mp, shop, economy, atau streak tidak ada: ini bukan cabang produksi + Tahap 4."
git fetch -q origin "$PROD_BRANCH" || die "tidak bisa mengambil origin/$PROD_BRANCH."
git merge-base --is-ancestor "origin/$PROD_BRANCH" HEAD || die "cabang ini TIDAK memuat origin/$PROD_BRANCH terbaru. Jalankan: git merge origin/$PROD_BRANCH (atau pakai cabang multiplayer produksi yang sudah diperbarui) lalu ulangi."
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "ada perubahan lokal yang belum di-commit; build mengambil dari pohon kerja. Commit atau buang dulu."
[ -s shop/qris.png ] || die "shop/qris.png (QRIS resmi) tidak ada; build produksi akan menolak."
grep -q '^name = "nusa-multiplayer"$' cf-multiplayer/wrangler.toml || die "wrangler.toml tidak bernama nusa-multiplayer: dibatalkan agar Worker lain tidak tertimpa."
HEAD_DESC="$(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"
echo "Cabang: $HEAD_DESC (memuat produksi $(git rev-parse --short "origin/$PROD_BRANCH"))"

say "2/6 Alamat Worker ekonomi (nusa-api) dari situs live"
API="${NUSA_API_BASE:-}"
if [ -z "$API" ]; then API=$(curl -fsS -m 15 "$SITE/cloud/config.js" 2>/dev/null | grep -oE 'apiBase: "https://[A-Za-z0-9.-]+"' | head -1 | sed -E 's/.*"(https:[^"]+)"/\1/' || true); fi
[[ "$API" =~ ^https://nusa-api\.([A-Za-z0-9-]+)\.workers\.dev$ ]] || die "tidak menemukan alamat nusa-api di $SITE/cloud/config.js. Jalankan: NUSA_API_BASE=https://nusa-api.<akun>.workers.dev bash $0"
SUB="${BASH_REMATCH[1]}"; MP_HOST="nusa-multiplayer.${SUB}.workers.dev"
echo "nusa-api: $API  →  multiplayer akan di: https://$MP_HOST"
API_BEFORE=$(code "$API/health"); [ "$API_BEFORE" != 000 ] || API_BEFORE=$(code "$API/")
echo "Status nusa-api sebelum: HTTP $API_BEFORE"

say "3/6 Login Cloudflare"
WR="npx --yes wrangler@4"
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then echo "Memakai CLOUDFLARE_API_TOKEN yang sudah ada."
else
  WHO=$( (cd cf-multiplayer && $WR whoami 2>&1) || true )
  if echo "$WHO" | grep -qiE "logged in|associated with"; then echo "Memakai login Wrangler yang sudah ada."
  else
    echo "Belum ada login Cloudflare di Cloud Shell. Pilih salah satu:"
    echo "  a) jalankan sekali:  npx wrangler login   lalu ulangi skrip ini; atau"
    echo "  b) tempel token API (template 'Edit Cloudflare Workers') di bawah."
    printf 'Token (kosong = batal): '; read -rs CLOUDFLARE_API_TOKEN; echo
    [ -n "$CLOUDFLARE_API_TOKEN" ] || die "dibatalkan: tidak ada login Cloudflare."
    export CLOUDFLARE_API_TOKEN
  fi
fi
if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  WHO=$( (cd cf-multiplayer && $WR whoami 2>&1) || true )
  IDS=$(echo "$WHO" | grep -oE '[0-9a-f]{32}' | sort -u || true); N=$(echo "$IDS" | grep -c . || true)
  if [ "$N" = 1 ]; then export CLOUDFLARE_ACCOUNT_ID="$IDS"
  elif [ "$N" -gt 1 ]; then echo "$WHO" | sed -n '1,40p'; printf 'Ada beberapa akun. Tempel Account ID yang memiliki nusa-api: '; read -r CLOUDFLARE_ACCOUNT_ID; [[ "$CLOUDFLARE_ACCOUNT_ID" =~ ^[0-9a-f]{32}$ ]] || die "Account ID tidak valid."; export CLOUDFLARE_ACCOUNT_ID; fi
fi

say "4/6 Deploy Worker TERPISAH nusa-multiplayer (nusa-api tidak disentuh)"
OUTF=$(mktemp); trap 'rm -f "$OUTF"' EXIT
( cd cf-multiplayer && npm install --no-audit --no-fund --silent && $WR deploy ) 2>&1 | tee "$OUTF" || die "deploy Worker gagal (pesan di atas)."
REAL=$(grep -oE 'https://nusa-multiplayer\.[A-Za-z0-9.-]+\.workers\.dev' "$OUTF" | head -1 || true)
[ -n "$REAL" ] && MP_HOST="${REAL#https://}"
OK=""; for i in 1 2 3 4 5 6 7 8; do H=$(curl -sS -m 10 "https://$MP_HOST/health" 2>/dev/null || true); if echo "$H" | grep -q '"ok":true'; then OK=1; break; fi; sleep 3; done
[ -n "$OK" ] || die "server belum menjawab di https://$MP_HOST/health. Tunggu 1 menit lalu jalankan skrip lagi (aman diulang)."
echo "Server aktif: https://$MP_HOST  $H"
API_AFTER=$(code "$API/health"); [ "$API_BEFORE" = 000 ] || [ "$API_AFTER" = "$API_BEFORE" ] || echo "PERINGATAN: status nusa-api berubah ($API_BEFORE → $API_AFTER). Periksa dashboard Cloudflare; skrip ini tidak mengubah nusa-api."
[ "$API_BEFORE" = 000 ] || echo "Status nusa-api sesudah: HTTP $API_AFTER (tidak berubah)."

if [ "$WORKER_ONLY" = 1 ]; then
  echo; echo "Selesai (--worker-saja): server multiplayer aktif; game live TIDAK diubah. Jalankan lagi tanpa opsi untuk menayangkan klien."; exit 0
fi

say "5/6 Build PRODUKSI (toko QRIS + Worker ekonomi + Dunia Bersama)"
NUSA_API_BASE="$API" NUSA_MP_WS="wss://$MP_HOST" bash firebase/scripts/build-hosting.sh produksi
grep -q "apiBase: \"$API\"" firebase/public/cloud/config.js || die "build tidak membawa alamat nusa-api: dibatalkan."
for d in shop economy streak world cloud audio mp hud; do [ -d "firebase/public/$d" ] || die "folder $d hilang dari build: dibatalkan."; done

say "6/6 Tayangkan"
echo "Akan menayangkan ke $SITE:"
echo "  • cabang       : $HEAD_DESC"
echo "  • Worker ekonomi: $API (tetap)"
echo "  • multiplayer   : wss://$MP_HOST (baru)"
echo "  • Pembatalan    : Firebase Console → Hosting → Riwayat rilis → Kembalikan (rollback) ke rilis sebelumnya, instan."
printf 'Ketik  ya  untuk menayangkan sekarang (lainnya = batal): '; read -r A
if [ "$A" != "ya" ]; then echo "Dibatalkan. Server multiplayer sudah aktif tetapi game live tidak berubah."; exit 0; fi
if command -v firebase >/dev/null; then FB=firebase; else FB="npx --yes firebase-tools"; fi
( cd firebase && $FB deploy --only hosting --project "$PROJECT" ) || die "deploy hosting gagal; game live tidak berubah."
echo; echo "Pemeriksaan akhir situs live…"; sleep 3
L1=$(curl -fsS -m 15 "$SITE/mp/endpoint.json" 2>/dev/null || true); L2=$(curl -fsS -m 15 "$SITE/cloud/config.js" 2>/dev/null | grep -c "apiBase: \"$API\"" || true)
echo "$L1" | grep -q "wss://$MP_HOST" && echo "OK  Dunia Bersama terpasang di situs live." || echo "PERINGATAN: endpoint multiplayer belum terlihat di situs live (cache CDN? coba lagi 1 menit)."
[ "$L2" -ge 1 ] && echo "OK  Konfigurasi toko/ekonomi live tidak berubah ($API)." || echo "PERINGATAN: apiBase di situs live tidak cocok. SEGERA rollback lewat Firebase Console → Hosting."
echo; echo "Selesai. Uji: login dengan dua akun Google berbeda → Muara Kampung → ketuk 'Ikut' pada kartu 👥."
echo "Matikan darurat tanpa deploy: Cloudflare dashboard → Workers → nusa-multiplayer → Settings → Variables → MP_ENABLED = 0."
