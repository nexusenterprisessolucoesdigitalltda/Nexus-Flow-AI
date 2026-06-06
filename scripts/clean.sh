#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

FORCE="${1:-}"

echo "============================================"
echo "  Nexus Flow - Clean"
echo "============================================"
echo ""

if [ "$FORCE" != "--force" ]; then
    read -p "Are you sure? This will delete dist, node_modules, temp, logs and data. (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

TARGETS=("dist" "node_modules" "temp" "logs" "data")

for target in "${TARGETS[@]}"; do
    if [ -d "$target" ] || [ -f "$target" ]; then
        echo "[CLEAN] Removing $target..."
        rm -rf "$target"
    fi
done

echo "[OK] Project cleaned."
