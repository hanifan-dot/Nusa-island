#!/usr/bin/env bash
# Rilis aman: MAIN SEKARANG + tetap pertahankan Megalodon Owner dan seluruh aset LIVE.
# HANYA deploy Firebase Hosting. Tidak merge main, tidak deploy Cloudflare, rules, atau Firestore.
set -euo pipefail
fail(){ echo "GAGAL (belum deploy): $*" >&2; exit 1; }
[ "$1" = "--saya-setuju" ] || fail "Perlu --saya-setuju dari Owner."
cd "$(dirname "$0")/.."
[ "$(git branch --show-current)" = "fitur/rilis-login-cepat-owner-20261101" ] || fail "Branch rilis salah."
[ -z "$(git status --porcelain --untracked-files=no)" ] || fail "Working tree berubah."
for c in git node python3 curl cmp grep; do command -v "$c" >/dev/null || fail "Perlu $c"; done
BASE="fitur/owner-megalodon-pajangan-20261101"
git fetch -q origin "$BASE" || fail "Gagal cek branch Megalodon Owner."
git merge-base --is-ancestor "origin/$BASE" HEAD || fail "Branch Owner berubah/lebih baru. Review gabungan lagi."
CHANGED="$(git diff --name-only "origin/$BASE"...HEAD)"
while IFS= read -r path; do
  [ -z "$path" ] && continue
  case "$path" in
    cloud/cloud.js|cloud/cloud.css|cloud/ui.js|tests/unit-guest-entry.js|scripts/rilis-login-cepat-aman.sh) ;;
    *) fail "Perubahan di luar ruang lingkup login: $path" ;;
  esac
done <<< "$CHANGED"
[ -f world/owner-showcase.js ] && [ -f world/owner-showcase.css ] || fail "Aset Megalodon Owner hilang."
grep -Fq "NW.ownerShowcase.hook()" game.js || fail "Hook Megalodon Owner hilang."
grep -Fq "MAIN SEKARANG" cloud/ui.js || fail "Tombol baru tidak ada."
grep -Fq "guestReminderOnce()" cloud/cloud.js || fail "Pengingat login tidak ada."
[ -s shop/qris.png ] || fail "QRIS asli hilang."

echo "== 1/5 Tes game dan perlindungan aset =="
for f in cloud/cloud.js cloud/ui.js game.js world/owner-showcase.js; do node --check "$f" || fail "Syntax: $f"; done
for t in unit-guest-entry unit-owner-showcase unit-cloud unit-economy unit-shop unit-event unit-mp unit-home; do
  [ -f "tests/$t.js" ] || fail "Tes wajib hilang: $t"
  node "tests/$t.js" >/tmp/nusa-guest-test.log 2>&1 || { tail -25 /tmp/nusa-guest-test.log; fail "Tes $t gagal"; }
  echo "PASS $t"
done
node firebase/scripts/cek-rilis.js || fail "Manifest fitur gagal."

echo "== 2/5 Baca URL konfigurasi LIVE, tidak mengubah backend =="
SITE="https://nusa-island-d2023.web.app"
API="$(curl -fsS --max-time 25 "$SITE/cloud/config.js" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=s.match(/apiBase:\s*"(https:\/\/nusa-api\.[A-Za-z0-9-]+\.workers\.dev)"/);if(m)process.stdout.write(m[1]);})')"
[[ "$API" =~ ^https://nusa-api\.[A-Za-z0-9-]+\.workers\.dev$ ]] || fail "nusa-api LIVE tidak dapat diverifikasi."
MP="$(curl -fsS --max-time 25 "$SITE/mp/endpoint.json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).ws||""))')"
[[ "$MP" =~ ^wss://nusa-multiplayer\.[A-Za-z0-9-]+\.workers\.dev$ ]] || fail "Alamat multiplayer LIVE tidak dapat diverifikasi."
curl -fsS --max-time 25 "$SITE/world/owner-showcase.js" | grep -Fq "megalodon_20261101" || fail "Megalodon Owner belum terlihat LIVE: tidak akan mengganti versi produksi."
echo "OK: URL Worker produksi dan aset Megalodon Owner ditemukan."

echo "== 3/5 Periksa 3 file login LIVE belum diganti update lain =="
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for p in cloud/cloud.js cloud/cloud.css cloud/ui.js; do
  git show "origin/$BASE:$p" > "$TMP/before" || fail "Baseline $p hilang."
  curl -fsS --max-time 25 "$SITE/$p" > "$TMP/live" || fail "Tidak bisa membaca LIVE $p."
  cmp -s "$TMP/before" "$TMP/live" || fail "LIVE $p berbeda dari baseline Owner. Perlu rebase, agar perbaikan lain tidak tertimpa."
done

echo "== 4/5 Build PRODUKSI, verifikasi semua aset terhadap situs LIVE =="
NUSA_API_BASE="$API" NUSA_MP_WS="$MP" bash firebase/scripts/build-hosting.sh produksi || fail "Build gagal."
node firebase/scripts/cek-rilis.js --build firebase/public --live "$SITE" --require-live || fail "Pemeriksaan rilis gagal."
grep -Fq 'backend: "cloud"' firebase/public/shop/config.js || fail "Pembayaran produksi berubah."
grep -Fq 'release: "publik"' firebase/public/shop/config.js || fail "Mode uji toko terdeteksi."
grep -Fq 'owner-showcase.js' firebase/public/index.html || fail "Megalodon Owner tidak masuk build."
[ -s firebase/public/shop/qris.png ] || fail "QRIS produksi hilang."

# Full byte comparison, bukan cuma daftar script index: menolak overwrite asset live
# yang berbeda, termasuk kode ekonomi/rumah/event, gambar QRIS, dan file multiplayer.
SITE="$SITE" python3 - <<'PY'
import concurrent.futures, os, pathlib, sys, urllib.request, urllib.parse
root = pathlib.Path("firebase/public")
allowed = {"cloud/cloud.js", "cloud/cloud.css", "cloud/ui.js"}
files = sorted(x for x in root.rglob("*") if x.is_file() and x.relative_to(root).as_posix() not in allowed)
site = os.environ["SITE"].rstrip("/")
def check(p):
    rel = p.relative_to(root).as_posix()
    req = urllib.request.Request(site + "/" + urllib.parse.quote(rel, safe="/"),
        headers={"Cache-Control": "no-cache", "Pragma": "no-cache"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                remote = response.read()
            if remote != p.read_bytes():
                return rel + " (isi beda / LIVE diperbarui)"
            return None
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if attempt == 3:
                return rel + " (gagal akses setelah 4 kali: " + str(e)[:130] + ")"
            time.sleep(2 * (attempt + 1))
        except Exception as e:
            return rel + " (" + str(e)[:130] + ")"
    return rel + " (gagal tanpa hasil)"
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    mismatches = [v for v in pool.map(check, files) if v]
print(f"Dibandingkan {len(files)} aset. Berbeda/gagal: {len(mismatches)}")
for x in mismatches[:15]: print(" - " + x, file=sys.stderr)
if mismatches:
    sys.exit("STOP: tidak deploy agar versi LIVE lain tidak tertimpa.")
PY

echo "== 5/5 DEPLOY HANYA FIREBASE HOSTING =="
echo "Project: nusa-island-d2023 | Backend, QRIS, event, dan multiplayer tetap."
if command -v firebase >/dev/null; then
  (cd firebase && firebase deploy --only hosting --project nusa-island-d2023 --non-interactive)
else
  (cd firebase && npx --yes firebase-tools@14 deploy --only hosting --project nusa-island-d2023 --non-interactive)
fi
echo "Deploy Firebase selesai, memeriksa UI LIVE..."
curl -fsS --max-time 25 "$SITE/cloud/ui.js" | grep -Fq "MAIN SEKARANG" || { echo "PERINGATAN: tombol belum terlihat via CDN; periksa rilis Firebase Hosting / cache."; exit 1; }
curl -fsS --max-time 25 "$SITE/world/owner-showcase.js" | grep -Fq "megalodon_20261101" || { echo "PERINGATAN: Megalodon Owner tidak terlihat! Periksa/rollback Hosting."; exit 1; }
echo "SUKSES: MAIN SEKARANG tayang dan Megalodon Owner tetap tersedia di Hosting."
