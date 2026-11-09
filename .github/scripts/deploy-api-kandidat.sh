#!/usr/bin/env bash
# Nusa Island — deploy backend nusa-api dari commit yang DIPIN, tanpa menimpa variabel/secret produksi.
# Hanya untuk GitHub Actions rilis kandidat. Tidak menjalankan Hosting atau mengaktifkan fitur.
# D1: binding bertipe d1 (NUSA_DB) di Worker live DIPERTAHANKAN (config sementara wajib memuatnya dengan database_id sama) dan diverifikasi sesudah deploy.
# Rollback ke backend pra-D1 TIDAK lewat skrip ini (akan ditolak): pakai workflow D1 Fondasi Remote mode rollback-pre-d1.
set -euo pipefail
die(){ printf 'GAGAL RILIS API: %s\n' "$*" >&2; exit 1; }
for key in NUSA_GAME_DIR NUSA_BACKEND_DIR NUSA_GAME_SHA NUSA_BACKEND_SHA NUSA_API_BASE CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; do
  [ -n "$(printenv "$key" 2>/dev/null || true)" ] || die "Variabel $key belum tersedia."
done
[ "$NUSA_CONFIRM" = "ya" ] || die "Perlu konfirmasi deployment Owner."
[[ "$NUSA_API_BASE" =~ ^https://nusa-api\.[A-Za-z0-9-]+\.workers\.dev$ ]] || die "Alamat nusa-api tidak sesuai."
[ "$(git -C "$NUSA_GAME_DIR" rev-parse HEAD)" = "$NUSA_GAME_SHA" ] || die "Commit game berubah; hentikan."
[ "$(git -C "$NUSA_BACKEND_DIR" rev-parse HEAD)" = "$NUSA_BACKEND_SHA" ] || die "Commit backend berubah; hentikan."
[ -z "$(git -C "$NUSA_GAME_DIR" status --porcelain --untracked-files=no)" ] || die "Kode game tidak bersih."
[ -z "$(git -C "$NUSA_BACKEND_DIR" status --porcelain --untracked-files=no)" ] || die "Kode backend tidak bersih."
grep -Fxq 'name = "nusa-api"' "$NUSA_BACKEND_DIR/worker/wrangler.toml" || die "Target Worker bukan nusa-api."
grep -Fq 'name = "nusa-multiplayer"' "$NUSA_GAME_DIR/cf-multiplayer/wrangler.toml" || die "Target multiplayer berubah."
for pair in 'economy/core.js:economy-core.cjs' 'house/core.js:house-core.cjs' 'economy/sf-core.js:sf-core.cjs' 'economy/aurora-core.js:aurora-core.cjs' 'economy/sf2-core.js:sf2-core.cjs'; do
  IFS=: read -r src vendor <<< "$pair"
  cmp -s "$NUSA_GAME_DIR/$src" "$NUSA_BACKEND_DIR/server/vendor/$vendor" || die "Vendor $vendor tidak sama dengan sumber game $src."
done
[ -s "$NUSA_GAME_DIR/shop/qris.png" ] || die "QRIS produksi tidak ditemukan."
command -v curl >/dev/null && command -v node >/dev/null && command -v npx >/dev/null || die "Perlu curl, node dan npx."

# Autentikasi Cloudflare READ-ONLY lebih dulu (/user/tokens/verify atau token akun, lalu izin+akun). Membedakan token rusak/tidak valid/
# kedaluwarsa, izin kurang, Account ID salah, Worker tidak ada, jaringan. Token dibersihkan (spasi/baris-baru/awalan Bearer) dan diekspor bersih.
# shellcheck source=cf-auth-check.sh
. "$(dirname "${BASH_SOURCE[0]}")/cf-auth-check.sh" || die "Autentikasi Cloudflare gagal (lihat KATEGORI di atas). Belum menyentuh produksi."

# Baca konfigurasi produksi sebelum melakukan perubahan. Jangan cetak nilai atau token ke log.
TMP=$(mktemp -d)
chmod 700 "$TMP"
CONFIG="$NUSA_BACKEND_DIR/worker/.nusa-release-config-$$.toml"
cleanup(){ rm -rf "$TMP"; rm -f "$CONFIG"; }
trap cleanup EXIT
CF_URL="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/nusa-api/settings"
# Jangan menggunakan -f di sini: simpan respons error Cloudflare untuk diagnostik aman,
# tanpa mencetak bearer token, account ID, headers, atau konfigurasi produksi.
cf_read_settings(){
  local outfile="$1" label="$2" code
  code=$(curl -sS --retry 2 --max-time 30 -o "$outfile" -w '%{http_code}' \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$CF_URL") || die "$label: jaringan Cloudflare tidak dapat dihubungi. Belum aman deploy."
  if [ "$code" != "200" ]; then
    CF_HTTP_STATUS="$code" node --input-type=commonjs - "$outfile" <<'NODE'
const fs = require('node:fs');
try {
  const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const e = Array.isArray(r.errors) ? r.errors : [];
  const safe = e.slice(0, 4).map(x => {
    const code = Number.isInteger(x.code) ? x.code : 'unknown';
    const message = String(x.message || 'Tanpa detail').slice(0, 180)
      .replace(/https?:\/\/\S+/g, '[url]')
      .replace(/[A-Za-z0-9_\-]{24,}/g, '[dirahasiakan]');
    return code + ': ' + message;
  });
  console.error('Cloudflare API HTTP ' + process.env.CF_HTTP_STATUS +
    (safe.length ? ' — ' + safe.join('; ') : ' — respons tanpa rincian kesalahan'));
} catch {
  console.error('Cloudflare API HTTP ' + process.env.CF_HTTP_STATUS + ' — respons bukan JSON yang dapat dibaca.');
}
NODE
    die "$label: gagal membaca Worker nusa-api padahal pemeriksaan autentikasi lolos (lihat kode error di atas). Jangan ulang deploy sampai penyebab teridentifikasi."
  fi
}
cf_read_settings "$TMP/before.json" "Sebelum deploy"
node --input-type=commonjs - "$TMP/before.json" "$TMP/expected.json" "$TMP/d1_live_id" <<'NODE'
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!data.success || !Array.isArray(data.result?.bindings)) throw Error('Konfigurasi Worker tidak bisa divalidasi');
const bindings = data.result.bindings;
const byName = Object.fromEntries(bindings.map(b => [b.name, b]));
for (const name of ['FIREBASE_PROJECT_ID', 'NUSA_SHOP_LIVE', 'ENABLE_SHOP_PRODUCTION', 'NUSA_PUBLIC_OPEN', 'NUSA_ECO_INIT_CAP', 'ALLOWED_ORIGINS']) {
  if (byName[name]?.type !== 'plain_text') throw Error('Konfigurasi produksi hilang: ' + name);
}
if (byName.FIREBASE_PROJECT_ID.text !== 'nusa-island-d2023') throw Error('Firebase project salah');
for (const name of ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY']) {
  if (byName[name]?.type !== 'secret_text') throw Error('Secret produksi tidak tersedia: ' + name);
}
const allowed = new Set(['plain_text', 'secret_text', 'assets', 'd1']);
for (const b of bindings) if (!allowed.has(b.type)) throw Error('Binding memerlukan penanganan khusus: ' + b.type);
const d1 = bindings.filter(b => b.type === 'd1');
for (const b of d1) if (b.name !== 'NUSA_DB' || !/^[0-9a-f-]{36}$/.test(String(b.id || ''))) throw Error('Binding d1 tidak dikenal: ' + b.name);
fs.writeFileSync(process.argv[4], d1.length ? d1[0].id : '', {mode:0o600});
const snapshot = bindings.filter(b => ['plain_text', 'secret_text', 'd1'].includes(b.type)).map(b => ({name:b.name,type:b.type,text:b.type==='plain_text'?b.text:null,id:b.type==='d1'?b.id:null}));
fs.writeFileSync(process.argv[3], JSON.stringify(snapshot), {mode:0o600});
console.log('OK: konfigurasi pembayaran, Firebase, dan secret produksi terdeteksi.');
NODE
# Jangan pakai [vars] dari Git: nilai lokal lama bisa mereset pengaturan pembayaran LIVE.
# Pakai konfigurasi sementara yang bersumber dari file resmi, tetapi seluruh [vars] dihilangkan.
awk '
  /^\[vars\][[:space:]]*$/ {skip=1; next}
  /^\[+[^]]+\]+[[:space:]]*$/ {skip=0}
  !skip {print}
' "$NUSA_BACKEND_DIR/worker/wrangler.toml" > "$CONFIG"
grep -Fxq 'name = "nusa-api"' "$CONFIG" || die "Target konfigurasi sementara salah."
if grep -Fq '[vars]' "$CONFIG"; then die "Config sementara masih memiliki vars."; fi
# D1: bila Worker live sudah punya NUSA_DB, config sementara WAJIB memuat binding yang sama (kalau tidak, deploy akan MENGHAPUS binding).
if [ -s "$TMP/d1_live_id" ]; then
  D1_LIVE_ID=$(cat "$TMP/d1_live_id")
  grep -Fxq '[[d1_databases]]' "$CONFIG" && grep -Fxq 'binding = "NUSA_DB"' "$CONFIG" && grep -Fxq "database_id = \"$D1_LIVE_ID\"" "$CONFIG" \
    || die "Worker live memiliki binding D1 (NUSA_DB) tetapi backend ini tidak memuatnya (backend pra-D1 atau database_id lain). Deploy dibatalkan agar binding tidak terhapus. Rollback ke pra-D1: workflow D1 Fondasi Remote mode rollback-pre-d1."
  echo "OK: binding D1 NUSA_DB (live) ada di config deploy dan akan dipertahankan."
fi
echo "Build nusa-api (dry-run) dengan variabel live dipertahankan."
(cd "$NUSA_BACKEND_DIR/worker" && npx --yes wrangler@4 deploy --config "$CONFIG" --keep-vars --strict --dry-run >/dev/null) || die "Build Worker gagal. Belum menyentuh produksi."
echo "Deploy nusa-api dari backend yang sudah diverifikasi…"
(cd "$NUSA_BACKEND_DIR/worker" && npx --yes wrangler@4 deploy --config "$CONFIG" --keep-vars --strict) || die "Deploy Worker gagal; jangan deploy Hosting."
cf_read_settings "$TMP/after.json" "Sesudah deploy (STOP Hosting bila gagal)"
node --input-type=commonjs - "$TMP/after.json" "$TMP/expected.json" <<'NODE'
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!data.success || !Array.isArray(data.result?.bindings)) throw Error('Tidak dapat memeriksa konfigurasi setelah deploy');
const actual = Object.fromEntries(data.result.bindings.map(b => [b.name,b]));
for (const old of JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))) {
  const now = actual[old.name];
  if (!now || now.type !== old.type || (old.type === 'plain_text' && now.text !== old.text) || (old.type === 'd1' && now.id !== old.id)) {
    throw Error('PENTING: konfigurasi produksi berubah (' + old.name + '). STOP HOSTING! Periksa rollback nusa-api.');
  }
}
console.log('OK: semua variabel produksi, secret, dan binding D1 (bila ada) dipertahankan.');
NODE
STATUS=$(curl -sS -m 15 -o /dev/null -w '%{http_code}' "$NUSA_API_BASE/health" || true)
[ "$STATUS" != 000 ] && [ "$STATUS" != 500 ] && [ "$STATUS" != 502 ] && [ "$STATUS" != 503 ] || die "nusa-api health gagal ($STATUS). STOP HOSTING."
echo "OK: backend nusa-api ter-deploy dan status HTTP $STATUS; Hosting berikutnya boleh diproses."
