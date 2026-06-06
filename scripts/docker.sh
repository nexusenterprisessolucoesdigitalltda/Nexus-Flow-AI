#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

COMMAND="${1:-help}"

case "$COMMAND" in
    build)
        echo "[BUILD] Building Docker image..."
        docker compose build
        ;;
    up)
        echo "[UP] Starting container..."
        docker compose up -d
        echo "[OK] Container started."
        echo "     Use 'bash scripts/docker.sh logs' to view logs"
        ;;
    down)
        echo "[DOWN] Stopping container..."
        docker compose down
        echo "[OK] Container stopped."
        ;;
    restart)
        echo "[RESTART] Restarting container..."
        docker compose restart
        echo "[OK] Container restarted."
        ;;
    logs)
        docker compose logs -f
        ;;
    shell)
        docker compose exec sunday-claw sh
        ;;
    status)
        docker compose ps
        echo ""
        docker compose stats --no-stream
        ;;
    *)
        echo "Nexus Flow - Docker Commands"
        echo ""
        echo "Usage:"
        echo "  bash scripts/docker.sh build    - Build image"
        echo "  bash scripts/docker.sh up       - Start container"
        echo "  bash scripts/docker.sh down     - Stop container"
        echo "  bash scripts/docker.sh restart  - Restart container"
        echo "  bash scripts/docker.sh logs     - View logs"
        echo "  bash scripts/docker.sh shell    - Open shell"
        echo "  bash scripts/docker.sh status   - Container status"
        ;;
esac
