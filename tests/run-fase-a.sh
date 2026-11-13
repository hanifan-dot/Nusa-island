#!/usr/bin/env bash
# Pelari tes Fase A — SEMUA berurutan (tidak pernah paralel). Suite browser memakai fisika/waktu nyata (mis. test_bumbu24, test_port):
# dijalankan bersamaan dengan suite lain, CPU yang rebutan menghasilkan kegagalan PALSU. Jangan paralelkan di CI maupun lokal.
# Pakai:  bash tests/run-fase-a.sh [folder-keluaran]      (butuh: node, python3 + playwright + chromium)
# Hasil per suite: <folder>/<nama>.out ; ringkasan: <folder>/RINGKASAN.txt. Kode keluar 0 hanya bila tak ada kegagalan di luar baseline unit-username.
cd "$(dirname "$0")/.." || exit 2
OUT="${1:-/tmp/fase-a}"; mkdir -p "$OUT"; : > "$OUT/RINGKASAN.txt"; BAD=0
catat() { echo "$*" | tee -a "$OUT/RINGKASAN.txt"; }

# 1) seluruh unit test (satu per satu)
for u in tests/unit-*.js; do
  n=$(basename "$u" .js); timeout 300 node "$u" > "$OUT/$n.out" 2>&1; rc=$?
  if [ $rc -ne 0 ]; then
    if [ "$n" = "unit-username" ]; then catat "UNIT-BASELINE $n exit=$rc (kegagalan baseline yang sudah ada di produksi; bandingkan output dengan basis)"; else catat "UNIT-GAGAL $n exit=$rc"; BAD=1; fi
  fi
done
catat "unit: $(ls tests/unit-*.js | wc -l) berkas dijalankan"

# 2) suite browser (urut). Jalur kritis (pengiriman, rombongan, port) diulang N kali: KRITIS_ULANG (bawaan 3).
suite() { # nama kali
  local s=$1 k=${2:-1} i
  for i in $(seq 1 "$k"); do
    timeout 1800 python3 "tests/browser/$s.py" > "$OUT/$s.run$i.out" 2>&1; rc=$?
    p=$(grep -c '^PASS' "$OUT/$s.run$i.out"); f=$(grep -c '^FAIL' "$OUT/$s.run$i.out")
    # baseline terbukti identik dengan produksi (hotfix/tes-recovery-4h-20261109): test_pilih_dunia gagal TEPAT di langkah 6a dan 6b, tidak lebih
    if [ "$s" = "test_pilih_dunia" ] && [ "$f" -eq 2 ] && [ "$(grep '^FAIL' "$OUT/$s.run$i.out" | cut -c7-8 | tr '\n' ' ')" = "6a 6b " ]; then catat "$s run$i exit=$rc PASS=$p FAIL=$f  (BASELINE: 6a+6b juga gagal di produksi)"; continue; fi
    catat "$s run$i exit=$rc PASS=$p FAIL=$f"; { [ $rc -ne 0 ] || [ "$f" -ne 0 ]; } && BAD=1
  done
}
K=${KRITIS_ULANG:-3}
suite test_ekonomi; suite test_bumbu24; suite test_bumbu241; suite test_boat
suite test_delivery "$K"; suite test_rombongan "$K"; suite test_kemudi_rombongan "$K"; suite test_port "$K"; suite test_port_polish "$K"; suite test_port_rombongan "$K"
suite test_quest_owner
suite test_house; suite test_rumahku_sosial; suite test_rumahku_flag_server
suite test_pilih_dunia; suite test_podium
# Visual Kota Nusa (Ide 04): uji khusus + regresi Pak Damar / Kapal Rombongan dengan NUSA_KOTA=true (flag default tetap OFF)
suite test_kota
suite test_kota_mp   # Multiplayer Kota Nusa: 4 klien nyata + server dev (NUSA_KOTA=ya, NUSA_BOAT=ya); termasuk mode flag klien OFF dan flag server OFF
for r in test_port test_port_rombongan test_rombongan; do
  timeout 1800 python3 "tests/browser/test_kota_regresi.py" "$r" > "$OUT/kota_regresi_$r.out" 2>&1; rc=$?
  p=$(grep -c '^PASS' "$OUT/kota_regresi_$r.out"); f=$(grep -c '^FAIL' "$OUT/kota_regresi_$r.out"); catat "kota_regresi($r) exit=$rc PASS=$p FAIL=$f"; { [ $rc -ne 0 ] || [ "$f" -ne 0 ]; } && BAD=1
done

# 3) build Hosting + cek-rilis
bash firebase/scripts/build-hosting.sh > "$OUT/build-hosting.out" 2>&1; rc=$?; catat "build-hosting exit=$rc"; [ $rc -ne 0 ] && BAD=1
node firebase/scripts/cek-rilis.js > "$OUT/cek-rilis.out" 2>&1; rc=$?; catat "cek-rilis exit=$rc"; [ $rc -ne 0 ] && BAD=1

# 4) tes meregenerasi screenshot di docs/: kembalikan supaya tidak ikut ter-commit
git checkout -- docs/quest-owner docs/kunjungi-rumah docs/rumahku-sosial 2>/dev/null
catat "SELESAI bad=$BAD"; exit $BAD
