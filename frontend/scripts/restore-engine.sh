#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules/aacalc2.bak ]; then
  echo "No backup found at node_modules/aacalc2.bak"
  exit 1
fi

rm node_modules/aacalc2
mv node_modules/aacalc2.bak node_modules/aacalc2
echo "node_modules/aacalc2 restored from backup"
