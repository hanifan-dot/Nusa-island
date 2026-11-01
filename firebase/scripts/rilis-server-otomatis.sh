#!/usr/bin/env bash
# Rilis terkontrol: server otomatis + UI, tanpa menyentuh Worker pembayaran/dashboard nusa-api.
# Jalankan dari root repo: bash firebase/scripts/rilis-server-otomatis.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
die() { printf "GAGAL: %s\n" "$*" >&2; exit 1; }
command -v node >/dev/null && command -v curl >/dev/null || die "Perlu node dan curl."
[ "$(git rev-parse --abbrev-ref HEAD)" = "fitur/server-otomatis-64" ] || die "Harus pada branch fitur/server-otomatis-64; tidak akan menerbitkan cabang lama."

echo "== Tes sebelum produksi =="
for test in tests/unit-mp.js tests/unit-rilis.js tests/unit-house.js tests/unit-mp-house.js tests/unit-event.js; do
  [ -f "$test" ] || die "Berkas tes hilang: $test"
  node "$test" || die "Tes gagal, tidak ada deploy: $test"
done
node firebase/scripts/cek-rilis.js || die "Pemeriksaan fitur dan kontrak rilis gagal."

SITE="https://nusa-island-d2023.web.app"
API="$(curl -fsS --max-time 20 "$SITE/cloud/config.js" | grep -oE 'apiBase: "https://[A-Za-z0-9.-]+"' | head -1 | sed -E 's/.*"(https:[^"]+)"/\1/' || true)"
[[ "$API" =~ ^https://nusa-api\.[A-Za-z0-9-]+\.workers\.dev$ ]] || die "Alamat nusa-api tidak cocok, rilis dibatalkan."

# Cabang ini memuat Kunjungi Rumah dan Dashboard terbaru. Keduanya HARUS sudah ada
# pada Worker nusa-api LIVE sebelum game diubah, sebab skrip 4.2 tidak men-deploy nusa-api.
status() { curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$@"; }
DASH="$(status "$API/api/dashboard/summary" || true)"
[ "$DASH" = 401 ] || die "Dashboard Owner belum menjawab 401 bagi tamu (HTTP $DASH). Tidak mengubah produksi."
HOUSE="$(status -X POST -H 'content-type: application/json' -d '{"data":{"q":"bu"}}' "$API/fn/homeSearch" || true)"
[ "$HOUSE" = 401 ] || die "API rumah belum aktif / tidak memeriksa login (HTTP $HOUSE). Tidak mengubah produksi."
EVENT="$(status -X POST -H 'content-type: application/json' -d '{"data":{}}' "$API/fn/eventInfo" || true)"
[ "$EVENT" = 200 ] || die "Event Megalodon belum dijawab Worker nusa-api (HTTP $EVENT). Tidak mengubah produksi."

echo "OK: semua tes lulus; Dashboard, Rumah, Event terpasang di nusa-api live."
echo "Selanjutnya hanya Worker nusa-multiplayer + Firebase Hosting yang akan dirilis."
echo "Skrip induk masih mewajibkan ketik 'ya' untuk menayangkan."
exec bash firebase/scripts/rilis.sh --target semua
