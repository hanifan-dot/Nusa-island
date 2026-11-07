#!/usr/bin/env bash
# Nusa Island — pemeriksaan autentikasi Cloudflare READ-ONLY sebelum deploy.
# Tidak pernah mencetak token, Account ID, header, atau isi konfigurasi. Hanya KATEGORI + kode error Cloudflare yang disanitasi.
#
# Pemakaian:  CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… bash cf-auth-check.sh [--emit-env]
#   --emit-env : (GitHub Actions) tulis token/ID yang sudah dibersihkan ke $GITHUB_ENV (dengan ::add-mask::)
# Variabel uji (opsional): CF_API_BASE (default https://api.cloudflare.com/client/v4), CF_WORKER_NAME (default nusa-api)
#
# Kode keluar: 0 siap | 10 token RUSAK (bentuk/header) | 11 token TIDAK VALID/dicabut | 12 token KEDALUWARSA/nonaktif
#              13 IZIN KURANG atau Account ID tidak cocok | 14 Account ID SALAH (pasti) | 15 Worker tidak ditemukan
#              16 jaringan | 17 Account ID bentuk salah | 18 secret kosong | 19 kesalahan skrip/respons tak terduga
set -uo pipefail
API="${CF_API_BASE:-https://api.cloudflare.com/client/v4}"; WORKER="${CF_WORKER_NAME:-nusa-api}"
EMIT=0; [ "${1:-}" = "--emit-env" ] && EMIT=1
say(){ printf '%s\n' "$*"; }
fail(){ local code="$1" kat="$2"; shift 2; printf 'KATEGORI: %s\n' "$kat"; printf '%s\n' "$*"; [ -n "${GITHUB_ACTIONS:-}" ] && printf '::error title=Cloudflare %s::%s\n' "$kat" "$*"; exit "$code"; }

RAW_T="${CLOUDFLARE_API_TOKEN-}"; RAW_A="${CLOUDFLARE_ACCOUNT_ID-}"
[ -n "$RAW_T" ] && [ -n "$RAW_A" ] || fail 18 SECRET_KOSONG "Secret CLOUDFLARE_API_TOKEN atau CLOUDFLARE_ACCOUNT_ID kosong (nama secret di GitHub: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)."

# ---- 1. Bentuk token: laporkan CIRI saja (ya/tidak), bersihkan yang aman dibersihkan ----
has_ws=no; has_bearer=no; has_quote=no; has_prefix=no
case "$RAW_T" in *[$'\r\n\t ']*) has_ws=ya;; esac
tok="$RAW_T"
tok="${tok//$'\r'/}"; tok="${tok//$'\n'/}"; tok="${tok//$'\t'/}"; tok="${tok// /}"
case "$tok" in \"*\"|\'*\') has_quote=ya; tok="${tok:1:${#tok}-2}";; esac
case "$tok" in [Bb]earer*) has_bearer=ya; tok="${tok#[Bb]earer}";; esac
case "$tok" in CLOUDFLARE_API_TOKEN=*) has_prefix=ya; tok="${tok#CLOUDFLARE_API_TOKEN=}";; esac
acc="${RAW_A//$'\r'/}"; acc="${acc//$'\n'/}"; acc="${acc//$'\t'/}"; acc="${acc// /}"
len_ok=no; [[ "$tok" =~ ^[A-Za-z0-9_-]{40}$ ]] && len_ok=ya
chars_ok=no; [[ "$tok" =~ ^[A-Za-z0-9_-]+$ ]] && chars_ok=ya
say "Bentuk token (tanpa menampilkan nilai): spasi/baris-baru=$has_ws awalan-Bearer=$has_bearer tanda-kutip=$has_quote awalan-NAMA=$has_prefix karakter-valid=$chars_ok panjang-lazim-40=$len_ok"
[ "$has_ws$has_bearer$has_quote$has_prefix" != "nononono" ] && say "CATATAN: secret berisi karakter/awalan tambahan; skrip membersihkannya otomatis. Disarankan menyimpan ulang secret tanpa itu."
[[ "$acc" =~ ^[a-fA-F0-9]{32}$ ]] || fail 17 ACCOUNT_ID_FORMAT "CLOUDFLARE_ACCOUNT_ID bukan 32 karakter heksadesimal (setelah spasi/baris-baru dibuang)."
[ "$chars_ok" = ya ] || fail 10 TOKEN_FORMAT_RUSAK "Token mengandung karakter di luar A-Z a-z 0-9 _ - setelah dibersihkan, sehingga header Authorization pasti ditolak Cloudflare (HTTP 400, kode 9106). Salin ulang token apa adanya dari dasbor Cloudflare."

TMP=$(mktemp -d); chmod 700 "$TMP"; trap 'rm -rf "$TMP"' EXIT
# Header lewat berkas konfigurasi curl: token tidak muncul di daftar proses.
umask 077; printf 'header = "Authorization: Bearer %s"\n' "$tok" > "$TMP/h.cfg"
HTTP=000
cf_get(){ # $1=path $2=berkas keluaran → mengisi HTTP
  HTTP=$(curl -sS --max-time 30 --retry 2 -K "$TMP/h.cfg" -o "$2" -w '%{http_code}' "$API$1" 2>/dev/null) || HTTP=000
}
# Ringkas respons: success|kode-kode|status-token, TANPA rahasia (pesan dipotong & disamarkan).
summ(){ node --input-type=commonjs - "$1" <<'NODE'
const fs=require('node:fs');
try{const r=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const e=(Array.isArray(r.errors)?r.errors:[]).slice(0,4).map(x=>(Number.isInteger(x.code)?x.code:'?')+': '+String(x.message||'').slice(0,120).replace(/https?:\/\/\S+/g,'[url]').replace(/[A-Za-z0-9_\-]{24,}/g,'[dirahasiakan]'));
const st=r.result&&typeof r.result.status==='string'?r.result.status:'';
const codes=(Array.isArray(r.errors)?r.errors:[]).map(x=>x.code).join(',');
console.log([r.success===true?'ok':'gagal',codes,st,e.join('; ')].join('|'));}catch{console.log('bukan-json|||');}
NODE
}
field(){ printf '%s' "$1" | cut -d'|' -f"$2"; }

# ---- 2. Verifikasi token (endpoint resmi, read-only). Token pengguna lalu token akun. ----
cf_get /user/tokens/verify "$TMP/u.json"; HU=$HTTP; SU=$(summ "$TMP/u.json")
[ "$HU" = 000 ] && fail 16 JARINGAN "Cloudflare API tidak dapat dihubungi dari runner. Coba ulang; ini bukan masalah token."
tok_ok=no; status=""
if [ "$HU" = 200 ] && [ "$(field "$SU" 1)" = ok ]; then tok_ok=ya; status=$(field "$SU" 3); kind="pengguna"; else
  cf_get "/accounts/$acc/tokens/verify" "$TMP/a.json"; HA=$HTTP; SA=$(summ "$TMP/a.json")
  if [ "$HA" = 200 ] && [ "$(field "$SA" 1)" = ok ]; then tok_ok=ya; status=$(field "$SA" 3); kind="akun"; fi
fi
if [ "$tok_ok" = no ]; then
  codes="$(field "$SU" 2),$(field "${SA:-||}" 2)"
  say "Verifikasi token: /user/tokens/verify → HTTP $HU ($(field "$SU" 4)); /accounts/…/tokens/verify → HTTP ${HA:-—} ($(field "${SA:-||||}" 4))"
  case ",$codes," in
    *,9106,*|*,6003,*|*,6103,*|*,6111,*|*,9107,*) fail 10 TOKEN_FORMAT_RUSAK "Cloudflare menolak FORMAT header Authorization (kode $codes, HTTP $HU). Token di secret kemungkinan rusak (baris baru/spasi, awalan, terpotong) atau bukan API Token. Periksa ciri bentuk di atas lalu simpan ulang secret CLOUDFLARE_API_TOKEN persis seperti dari dasbor.";;
    *,1000,*|*,9109,*|*,9103,*|*,10000,*) fail 11 TOKEN_TIDAK_VALID "Cloudflare menjawab token tidak valid/dicabut/bukan token API (kode $codes). Buat token baru (template 'Edit Cloudflare Workers') hanya bila kategori ini muncul.";;
  esac
  [ "$HU" = 400 ] && fail 10 TOKEN_FORMAT_RUSAK "HTTP 400 dari verifikasi token = permintaan autentikasi cacat (bukan 'izin kurang'). Ciri bentuk token ada di atas."
  fail 11 TOKEN_TIDAK_VALID "Token tidak lolos verifikasi (HTTP $HU/${HA:-—}, kode $codes)."
fi
case "$status" in active|"") ;; expired) fail 12 TOKEN_KEDALUWARSA "Token berstatus expired.";; *) fail 12 TOKEN_KEDALUWARSA "Token berstatus '$status' (bukan active).";; esac
say "OK: token valid dan aktif (jenis token $kind)."

# ---- 3. Izin + Account ID: baca pengaturan Worker (read-only) ----
cf_get "/accounts/$acc/workers/scripts/$WORKER/settings" "$TMP/s.json"; HS=$HTTP; SS=$(summ "$TMP/s.json")
case "$HS" in
  200) [ "$(field "$SS" 1)" = ok ] || fail 19 SKRIP "HTTP 200 tetapi respons tidak sukses/terbaca."; say "OK: akun benar dan izin Workers Scripts dapat dibaca untuk Worker $WORKER.";;
  000) fail 16 JARINGAN "Gagal menghubungi Cloudflare pada pemeriksaan Worker.";;
  404) fail 15 WORKER_TIDAK_DITEMUKAN "Worker $WORKER tidak ada di akun ini ($(field "$SS" 4)). Account ID mungkin milik akun lain, atau Worker belum pernah dibuat.";;
  401|403)
    cf_get /accounts "$TMP/l.json"
    if [ "$HTTP" = 200 ]; then
      if node -e "const r=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.exit((r.result||[]).some(a=>a.id===process.argv[2])?0:1)" "$TMP/l.json" "$acc"; then
        fail 13 IZIN_KURANG "Token valid dan akunnya benar, tetapi tidak boleh membaca Worker (HTTP $HS, $(field "$SS" 4)). Tambahkan izin Account → Workers Scripts → Edit (atau Read) pada token."
      else fail 14 ACCOUNT_ID_SALAH "Token valid, tetapi Account ID di secret TIDAK ada di daftar akun yang dapat diakses token. Perbaiki secret CLOUDFLARE_ACCOUNT_ID."; fi
    fi
    fail 13 IZIN_KURANG_ATAU_ACCOUNT_SALAH "Token valid tetapi ditolak untuk akun/Worker ini (HTTP $HS, $(field "$SS" 4)). Penyebab: (a) izin Account → Workers Scripts belum ada, atau (b) Account ID tidak sama dengan akun pemilik nusa-api. Token tidak dapat membuka daftar akun sehingga tidak bisa dibedakan otomatis: cocokkan Account ID dengan akun nusa-api dahulu, lalu cek izin token.";;
  *) fail 19 SKRIP "Respons tak terduga HTTP $HS ($(field "$SS" 4))." ;;
esac

# ---- 4. Terbitkan nilai bersih untuk langkah berikutnya (Actions) ----
if [ "$EMIT" = 1 ] && [ -n "${GITHUB_ENV:-}" ]; then
  echo "::add-mask::$tok"; echo "::add-mask::$acc"
  { echo "CLOUDFLARE_API_TOKEN=$tok"; echo "CLOUDFLARE_ACCOUNT_ID=$acc"; } >> "$GITHUB_ENV"
fi
export CLOUDFLARE_API_TOKEN="$tok" CLOUDFLARE_ACCOUNT_ID="$acc" 2>/dev/null
rm -rf "$TMP"; trap - EXIT
say "KATEGORI: SIAP"
if (return 0 2>/dev/null); then return 0; else exit 0; fi
