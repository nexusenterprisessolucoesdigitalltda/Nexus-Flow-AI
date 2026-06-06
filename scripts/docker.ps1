param(
    [ValidateSet('build', 'up', 'down', 'restart', 'logs', 'shell', 'status')]
    [string]$Command = 'help'
)

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

switch ($Command) {
    'build' {
        Write-Host "[BUILD] Building Docker image..." -ForegroundColor Cyan
        docker compose build
    }
    'up' {
        Write-Host "[UP] Starting container..." -ForegroundColor Cyan
        docker compose up -d
        Write-Host "[OK] Container started." -ForegroundColor Green
        Write-Host "     Use 'docker logs -f' to view logs" -ForegroundColor Gray
    }
    'down' {
        Write-Host "[DOWN] Stopping container..." -ForegroundColor Yellow
        docker compose down
        Write-Host "[OK] Container stopped." -ForegroundColor Green
    }
    'restart' {
        Write-Host "[RESTART] Restarting container..." -ForegroundColor Yellow
        docker compose restart
        Write-Host "[OK] Container restarted." -ForegroundColor Green
    }
    'logs' {
        docker compose logs -f
    }
    'shell' {
        docker compose exec sunday-claw sh
    }
    'status' {
        docker compose ps
        Write-Host ""
        docker compose stats --no-stream
    }
    default {
        Write-Host "Nexus Flow - Docker Commands" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage:" -ForegroundColor White
        Write-Host "  .\scripts\docker.ps1 build    - Build image" -ForegroundColor Gray
        Write-Host "  .\scripts\docker.ps1 up       - Start container" -ForegroundColor Gray
        Write-Host "  .\scripts\docker.ps1 down     - Stop container" -ForegroundColor Gray
        Write-Host "  .\scripts\docker.ps1 restart  - Restart container" -ForegroundColor Gray
        Write-Host "  .\scripts\docker.ps1 logs     - View logs" -ForegroundColor Gray
        Write-Host "  .\scripts\docker.ps1 shell    - Open shell" -ForegroundColor Gray
        Write-Host "  .\scripts\docker.ps1 status   - Container status" -ForegroundColor Gray
    }
}
