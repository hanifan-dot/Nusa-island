#!/usr/bin/env bash
# NUSA ISLAND — menyalin berkas GAME ke firebase/public untuk Firebase Hosting. Tidak menyertakan tests/, firebase/, docs/.
#   bash firebase/scripts/build-hosting.sh            → situs UJI (konfigurasi bawaan repo: toko simulasi)
#   NUSA_API_BASE=https://nusa-api.<akun>.workers.dev  bash firebase/scripts/build-hosting.sh produksi
#       → build PUBLIK: toko memakai Worker (pesanan Firebase nyata), tanpa tombol/alat simulasi, QRIS resmi dari shop/qris.png.
#         Build ini TIDAK membuka pembayaran sendiri: toko baru "nyata" bila Owner menyalakan mode di Payment Center + kunci ganda Worker.
set -euo pipefail
cd "$(dirname "$0")/../.."
MODE="${1:-uji}"
rm -rf firebase/public && mkdir -p firebase/public
cp index.html style.css game.js data.js fishmath.js firebase/public/
cp -r audio cloud world shop economy streak firebase/public/
# Tahap 4 (Dunia Bersama): klien multiplayer. Alamat server (Worker TERPISAH "nusa-multiplayer") hanya ditulis bila NUSA_MP_WS diisi,
# mis. NUSA_MP_WS=wss://nusa-multiplayer.<akun>.workers.dev ; tanpa itu game tetap normal dan Dunia Bersama tampil "belum aktif".
mkdir -p firebase/public/mp && cp mp/proto.js mp/client.js mp/ui.js mp/mp.css firebase/public/mp/
if [ -n "${NUSA_MP_WS:-}" ]; then
  [[ "$NUSA_MP_WS" =~ ^wss://nusa-multiplayer\.[A-Za-z0-9.-]+$ ]] || { echo "GAGAL: NUSA_MP_WS harus wss://nusa-multiplayer.<akun>.workers.dev (Worker multiplayer terpisah, BUKAN nusa-api)"; exit 1; }
  printf '{ "ws": "%s" }\n' "$NUSA_MP_WS" > firebase/public/mp/endpoint.json
  echo "Dunia Bersama → $NUSA_MP_WS"
fi
if [ "$MODE" = "produksi" ]; then
  API="${NUSA_API_BASE:-}"
  [[ "$API" =~ ^https://[A-Za-z0-9.-]+$ ]] || { echo "GAGAL: isi NUSA_API_BASE=https://nusa-api.<akun>.workers.dev (https, tanpa garis miring akhir)"; exit 1; }
  [ -s shop/qris.png ] || { echo "GAGAL: shop/qris.png (gambar QRIS resmi Owner) belum ada."; exit 1; }
  P=firebase/public
  sed -i -E "s#apiBase: \"[^\"]*\"#apiBase: \"$API\"#" $P/cloud/config.js
  sed -i -E 's#backend: "sim"#backend: "cloud"#; s#release: "uji"#release: "publik"#' $P/shop/config.js
  grep -q "apiBase: \"$API\"" $P/cloud/config.js && grep -q 'backend: "cloud"' $P/shop/config.js && grep -q 'release: "publik"' $P/shop/config.js || { echo "GAGAL: konfigurasi produksi tidak terpasang."; exit 1; }
  # build publik tidak boleh membawa alat uji/demo
  echo "Build PRODUKSI siap → Worker: $API"
fi
echo "Siap: $(find firebase/public -type f | wc -l) berkas di firebase/public (mode $MODE)"
