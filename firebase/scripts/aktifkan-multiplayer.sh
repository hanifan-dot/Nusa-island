#!/usr/bin/env bash
# Dipertahankan untuk kompatibilitas: sama dengan rilis.sh (skrip tunggal). Cara utama sekarang: tombol "Deploy Nusa Island" di GitHub (docs/RILIS-GITHUB.md).
exec bash "$(dirname "$0")/rilis.sh" "$@"
