#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

MODE="${1:-dev}"

echo "============================================"
echo "  Nexus Flow - Running"
echo "============================================"
echo ""

# Check .env
if [ ! -f ".env" ]; then
    echo "[ERROR] .env not found!"
    echo "Run first: bash scripts/setup.sh"
    exit 1
fi

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules not found. Running setup..."
    bash scripts/setup.sh
fi

case "$MODE" in
    prod|production)
        echo "[INFO] Mode: PRODUCTION"
        echo "[INFO] Compiling TypeScript..."
        npx tsc
        echo "[INFO] Starting production server..."
        exec node dist/index.js
        ;;
    watch|dev)
        echo "[INFO] Mode: DEVELOPMENT (hot-reload)"
        echo ""
        echo "  Press Ctrl+C to stop"
        echo ""
        exec npx tsx watch src/index.ts
        ;;
    *)
        echo "[INFO] Mode: DEVELOPMENT"
        echo ""
        echo "  Press Ctrl+C to stop"
        echo ""
        exec npx tsx src/index.ts
        ;;
esac
