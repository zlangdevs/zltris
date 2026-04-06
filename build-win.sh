#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "Building text shim library..."
x86_64-w64-mingw32-gcc -c "bin/textshim.c" -I"vendor/raylib/include" -o "bin/textshim.o"
x86_64-w64-mingw32-ar rcs "bin/libtextshim.a" "bin/textshim.o"

echo "Building Windows executable..."
zlang . -optimize -arch x86_64-windows-gnu -o zltris.exe

echo "Build complete: $ROOT_DIR/zltris.exe"
