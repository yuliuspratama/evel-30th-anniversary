#!/usr/bin/env bash
# =====================================================================
# run-tests.sh — jalankan seluruh rangkaian uji proyek ini
# ---------------------------------------------------------------------
#   1. build  : bangun index.html dari content.config.json
#   2. ui     : struktur, tautan, konsol, keyboard, kontras,
#               responsif, reduced motion, tanpa-JS, registry
#   3. filled : config berisi nilai nyata end-to-end
#   4. shots  : tangkapan layar untuk pemeriksaan visual
#
# Keluar bukan 0 bila ada yang gagal.
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

step "1/4  BUILD — index.html dari content.config.json"
node tools/build-content.mjs || FAILED=1

step "2/4  UI TEST — browser sungguhan"
node tests/ui.test.mjs || FAILED=1

step "3/4  FILLED TEST — konfigurasi terpusat end-to-end"
node tests/filled.test.mjs || FAILED=1

step "4/4  SCREENSHOTS — bukti visual"
node tests/shots.mjs || FAILED=1

echo ""
echo "============================================================"
if [ "$FAILED" -eq 0 ]; then
  echo "SEMUA RANGKAIAN LOLOS"
else
  echo "ADA YANG GAGAL"
fi
echo "============================================================"
exit "$FAILED"
