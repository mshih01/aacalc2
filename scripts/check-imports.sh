#!/bin/bash
# Check that every .ts file in src/ (except tests, index) is imported by at least one other file
errors=0
for f in src/*.ts; do
  base=$(basename "$f" .ts)
  # Skip test files, index, and generated files
  [[ "$base" =~ \.test$ ]] && continue
  [[ "$base" == "index" ]] && continue
  [[ "$base" =~ ^solveone[0-9]+$ ]] && continue
  # Count files that import this module (excluding itself)
  count=$(grep -Pl "'\./${base}(\.js)?'" src/*.ts 2>/dev/null | grep -cv "${base}.ts" || true)
  if (( count == 0 )); then
    echo "UNREFERENCED: $f"
    ((errors++))
  fi
done
if (( errors > 0 )); then
  echo "FAILED: $errors files are never imported"
  exit 1
fi
echo "OK: all source files are referenced"
