param(
    [switch]$Prod,
    [switch]$Dev
)

$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Nexus Flow - Running" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check .env
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] Arquivo .env nao encontrado!" -ForegroundColor Red
    Write-Host "Execute primeiro: .\scripts\setup.ps1" -ForegroundColor Yellow
    pause
    exit 1
}

# Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] node_modules nao encontrado. Executando setup..." -ForegroundColor Yellow
    & "$PSScriptRoot\setup.ps1"
}

if ($Prod) {
    Write-Host "[INFO] Modo PRODUCAO" -ForegroundColor Green

    # Build first
    Write-Host "[INFO] Compilando TypeScript..." -ForegroundColor Yellow
    npx tsc
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Falha na compilacao." -ForegroundColor Red
        pause
        exit 1
    }

    Write-Host "[INFO] Iniciando em producao..." -ForegroundColor Green
    node dist/index.js
} else {
    Write-Host "[INFO] Modo DESENVOLVIMENTO (hot-reload)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Pressione Ctrl+C para parar" -ForegroundColor Gray
    Write-Host ""

    if ($Dev) {
        npx tsx watch src/index.ts
    } else {
        npx tsx src/index.ts
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Nexus Flow encerrou com erro." -ForegroundColor Red
    pause
}
