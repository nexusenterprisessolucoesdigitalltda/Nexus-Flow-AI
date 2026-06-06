#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

CLEAN="${1:-}"

echo "============================================"
echo "  Nexus Flow - Build"
echo "============================================"
echo ""

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules not found. Running setup..."
    bash scripts/setup.sh
fi

# Clean dist
if [ "$CLEAN" = "--clean" ] && [ -d "dist" ]; then
    echo "[INFO] Cleaning dist directory..."
    rm -rf dist
fi

# Ensure dist exists
mkdir -p dist

# Compile
echo "[INFO] Compiling TypeScript..."
npx tsc

echo "[OK] Build complete!"
echo ""
echo "  Output: dist/"
echo "  To run: node dist/index.js"
