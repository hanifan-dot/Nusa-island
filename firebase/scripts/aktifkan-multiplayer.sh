#!/usr/bin/env bash
# NUSA ISLAND — Tahap 4: AKTIFKAN Dunia Bersama dengan SATU perintah (jalankan di Cloud Shell, SETELAH kamu menyetujui rilis).
#   bash firebase/scripts/aktifkan-multiplayer.sh
# Yang dilakukan: (1) deploy server multiplayer ke Cloudflare Workers (paket gratis), (2) cek kesehatannya, (3) menulis alamatnya ke
# mp/endpoint.json, (4) bila kamu jawab y: membangun & deploy game ke Firebase Hosting. Tidak menyentuh Firestore, Rules, pembayaran, atau Blaze.
# Satu-satunya hal yang perlu kamu siapkan: token API Cloudflare (lihat docs/MULTIPLAYER.md bagian "Aktifkan", 1 menit di dashboard).
set -euo pipefail
cd "$(dirname "$0")/../.."
say() { printf '\n== %s\n' "$*"; }
die() { printf '\nGAGAL: %s\n' "$*" >&2; exit 1; }
command -v node >/dev/null && command -v npm >/dev/null && command -v curl >/dev/null || die "butuh node, npm, dan curl (Cloud Shell sudah punya)."
[ -d cf-multiplayer ] && [ -f mp/proto.js ] || die "jalankan dari repo Nusa-island pada cabang yang berisi Tahap 4 (folder cf-multiplayer tidak ditemukan)."

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  printf 'Tempel token API Cloudflare (tidak ditampilkan), lalu Enter: '; read -rs CLOUDFLARE_API_TOKEN; echo
fi
[ -n "${CLOUDFLARE_API_TOKEN}" ] || die "token kosong."
export CLOUDFLARE_API_TOKEN
API=https://api.cloudflare.com/client/v4
cf() { curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" "$@"; }
jget() { python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
    for k in sys.argv[1].split('.'):
        d=d[int(k)] if k.isdigit() else d[k]
    print(d if d is not None else '')
except Exception:
    print('')" "$1"; }

say "1/4 Memeriksa akun Cloudflare"
ACC_JSON=$(cf "$API/accounts") ; [ "$(echo "$ACC_JSON" | jget success)" = "True" ] || die "token ditolak Cloudflare. Pastikan memakai template 'Edit Cloudflare Workers'."
ACCOUNT_ID=$(echo "$ACC_JSON" | jget result.0.id); [ -n "$ACCOUNT_ID" ] || die "akun Cloudflare tidak ditemukan untuk token ini."
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
SUB=$(cf "$API/accounts/$ACCOUNT_ID/workers/subdomain" | jget result.subdomain)
if [ -z "$SUB" ]; then
  SUB="nusaisland-$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  echo "Belum ada alamat workers.dev, membuat: $SUB"
  R=$(cf -X PUT "$API/accounts/$ACCOUNT_ID/workers/subdomain" --data "{\"subdomain\":\"$SUB\"}"); [ "$(echo "$R" | jget success)" = "True" ] || die "gagal membuat subdomain workers.dev: $R"
fi
URL="https://nusa-multiplayer.${SUB}.workers.dev"

say "2/4 Deploy server multiplayer (Cloudflare Workers, paket gratis)"
( cd cf-multiplayer && npm install --no-audit --no-fund --silent && npx --yes wrangler deploy ) || die "deploy Worker gagal (lihat pesan di atas)."

say "3/4 Cek kesehatan"
OK=""; for i in 1 2 3 4 5 6; do H=$(curl -sS -m 10 "$URL/health" || true); if [ "$(echo "$H" | jget ok)" = "True" ]; then OK=1; break; fi; sleep 3; done
[ -n "$OK" ] || die "server belum menjawab di $URL/health. Tunggu 1 menit lalu jalankan skrip ini lagi."
echo "Server aktif: $URL  ($H)"
printf '{ "ws": "wss://nusa-multiplayer.%s.workers.dev" }\n' "$SUB" > mp/endpoint.json
echo "Alamat ditulis ke mp/endpoint.json"

say "4/4 Game"
printf 'Deploy game ke Firebase Hosting sekarang? Ini menayangkan seluruh isi cabang ini. (y/N): '; read -r A
if [ "${A:-n}" = "y" ] || [ "${A:-n}" = "Y" ]; then
  bash firebase/scripts/build-hosting.sh
  ( cd firebase && npx --yes firebase-tools deploy --only hosting --project "${FIREBASE_PROJECT:-nusa-island-d2023}" ) || die "deploy hosting gagal."
  echo "Game sudah tayang. Buka dengan dua akun Google berbeda di Muara Kampung untuk melihat satu sama lain."
else
  echo "Dilewati. Alamat server sudah tersimpan di mp/endpoint.json; bangun & deploy game dengan cara biasa saat siap."
fi
echo; echo "Selesai. Matikan kapan saja tanpa deploy: Cloudflare dashboard → Workers → nusa-multiplayer → Settings → Variables → MP_ENABLED = 0."
