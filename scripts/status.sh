#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "============================================"
echo "  Nexus Flow - System Status"
echo "============================================"
echo ""

check_ok()   { echo "  [OK]    $1"; }
check_warn() { echo "  [WARN]   $1"; }
check_info() { echo "  [INFO]  $1"; }

# Node.js
if command -v node &> /dev/null; then
    check_ok "Node.js $(node --version)"
else
    check_warn "Node.js: not found"
fi

# npm
if command -v npm &> /dev/null; then
    check_ok "npm $(npm --version)"
else
    check_warn "npm: not found"
fi

# .env
[ -f ".env" ] && check_ok ".env present" || check_warn ".env: missing (run setup.sh)"

# node_modules
[ -d "node_modules" ] && check_ok "node_modules" || check_warn "node_modules: missing (run setup.sh)"

# dist
[ -d "dist" ] && check_ok "dist/ (build)" || check_info "dist/: missing (run build.sh)"

# dirs
[ -d "data" ] && check_ok "data/" || check_info "data/: will be created on start"
[ -d "logs" ] && check_ok "logs/" || check_info "logs/: will be created on start"
[ -d "temp" ] && check_ok "temp/" || check_info "temp/: will be created on start"
[ -d "agents/skills" ] && check_ok "agents/skills/" || check_warn "agents/skills/: missing"

# Size
echo ""
echo "  Project size: $(du -sh . 2>/dev/null | cut -f1)"

# File count
TS_COUNT=$(find src -name '*.ts' 2>/dev/null | wc -l)
echo "  TypeScript files: $TS_COUNT"
echo ""
