param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Nexus Flow - Build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] node_modules not found. Running setup..." -ForegroundColor Yellow
    & "$PSScriptRoot\setup.ps1"
}

# Clean dist
if ($Clean -and (Test-Path "dist")) {
    Write-Host "[INFO] Cleaning dist directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "dist"
}

# Ensure dist directory
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" -Force | Out-Null
}

# Compile
Write-Host "[INFO] Compiling TypeScript..." -ForegroundColor Yellow
npx tsc

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[OK] Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Output: dist/" -ForegroundColor Gray
Write-Host "  To run: node dist/index.js" -ForegroundColor Gray

pause
