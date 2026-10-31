#!/usr/bin/env bash
# NUSA ISLAND — menyalin berkas GAME saja ke firebase/public untuk Firebase Hosting (pengujian). Tidak menyertakan tests/, firebase/, docs/.
set -euo pipefail
cd "$(dirname "$0")/../.."
rm -rf firebase/public && mkdir -p firebase/public
cp index.html style.css game.js data.js fishmath.js firebase/public/
cp -r audio cloud world streak firebase/public/
mkdir -p firebase/public/mp && cp mp/proto.js mp/client.js mp/ui.js mp/mp.css firebase/public/mp/
# alamat server Dunia Bersama (ditulis oleh firebase/scripts/aktifkan-multiplayer.sh; bila tak ada, Dunia Bersama tampil 'belum aktif')
[ -f mp/endpoint.json ] && cp mp/endpoint.json firebase/public/mp/endpoint.json || true
echo "Siap: $(find firebase/public -type f | wc -l) berkas di firebase/public"
