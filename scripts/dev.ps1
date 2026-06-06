$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Nexus Flow - Dev Mode (hot-reload)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env not found!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[INFO] Starting with hot-reload..." -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

npx tsx watch src/index.ts
