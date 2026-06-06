#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "============================================"
echo "  Nexus Flow - Dev Mode (hot-reload)"
echo "============================================"
echo ""

if [ ! -f ".env" ]; then
    echo "[ERROR] .env not found!"
    exit 1
fi

echo "[INFO] Starting with hot-reload..."
echo "  Press Ctrl+C to stop"
echo ""

exec npx tsx watch src/index.ts
