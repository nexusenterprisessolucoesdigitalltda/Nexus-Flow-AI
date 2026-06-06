#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "============================================"
echo "  Nexus Flow - Setup"
echo "============================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo "[OK] Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm not found."
    exit 1
fi
echo "[OK] npm $(npm --version)"

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo ""
    echo "[INFO] Creating .env from .env.example..."
    cp .env.example .env
    echo "[INFO] .env created! Edit it with your API keys."
else
    echo "[OK] .env already exists"
fi

# Install dependencies
echo ""
echo "[INFO] Installing dependencies..."

FORCE="${1:-}"
if [ "$FORCE" = "--force" ]; then
    npm install --force
else
    npm install
fi

echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Edit .env with your API keys"
echo "  2. Run: bash scripts/run.sh"
echo "============================================"
