#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TESTS_DIR="$ROOT_DIR/tests"
cd "$ROOT_DIR"

OUT="$(mktemp -d)/zltris_tests"

restore() {
    for f in "$TESTS_DIR"/*.zl; do
        [ -e "$f" ] || continue
        mv "$f" "${f%.zl}.zlt"
    done
}
trap restore EXIT

for f in "$TESTS_DIR"/*.zlt; do
    [ -e "$f" ] || continue
    mv "$f" "${f%.zlt}.zl"
done

echo "Building tests..."
zlang tests src/ai -o "$OUT"

echo "Running tests..."
"$OUT"
