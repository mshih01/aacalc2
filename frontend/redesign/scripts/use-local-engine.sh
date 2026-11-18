#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -L node_modules/aacalc2 ]; then
  mv node_modules/aacalc2 node_modules/aacalc2.bak
  ln -s ../.. node_modules/aacalc2
  echo "node_modules/aacalc2 -> $(readlink -f node_modules/aacalc2)"
else
  echo "node_modules/aacalc2 is already a symlink, nothing to do"
fi
