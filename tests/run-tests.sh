#!/usr/bin/env bash
# =====================================================================
# run-tests.sh — jalankan seluruh rangkaian uji proyek ini
# ---------------------------------------------------------------------
#   1. build  : bangun index.html dari content.config.json
#   2. lint   : karakter asing & kebocoran istilah teknis
#   3. og     : kartu OG (Chromium) + regenerate assets/img/og-cover.png
#   4. ui     : struktur, tautan, konsol, keyboard, kontras,
#               responsif, reduced motion, tanpa-JS, registry
#   5. filled : config berisi nilai nyata end-to-end
#   6. shots  : tangkapan layar untuk pemeriksaan visual
#
# Keluar bukan 0 bila ada yang gagal.
#
# Rangkaian "live" (tests/live-check.mjs) TIDAK dijalankan di sini: ia
# menguji URL github.io/<repo>/ yang sudah daring. Jalankan sendiri
# setelah publish — catatannya ada di DEPLOY.md bagian Verifikasi.
# =====================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAILED=0
step() {
  echo ""
  echo "############################################################"
  echo "# $1"
  echo "############################################################"
}

step "1/6  BUILD — index.html dari content.config.json"
node tools/build-content.mjs || FAILED=1

step "2/6  LINT — karakter asing & kebocoran istilah teknis"
node tools/lint-text.mjs || FAILED=1

step "3/6  OG CARD — kartu berbagi (Chromium) + regenerate og-cover.png"
node tests/og-preview.mjs --write || FAILED=1

step "4/6  UI TEST — browser sungguhan"
node tests/ui.test.mjs || FAILED=1

step "5/6  FILLED TEST — konfigurasi terpusat end-to-end"
node tests/filled.test.mjs || FAILED=1

step "6/6  SCREENSHOTS — bukti visual"
node tests/shots.mjs || FAILED=1

echo ""
echo "============================================================"
if [ "$FAILED" -eq 0 ]; then
  echo "SEMUA RANGKAIAN LOLOS"
  echo "Verifikasi tambahan setelah publish: node tests/live-check.mjs"
else
  echo "ADA YANG GAGAL"
fi
echo "============================================================"
exit "$FAILED"
