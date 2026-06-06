param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Nexus Flow - Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js nao encontrado. Instale Node.js 18+ em: https://nodejs.org" -ForegroundColor Red
    pause
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm nao encontrado." -ForegroundColor Red
    pause
    exit 1
}

# Create .env if not exists
$envPath = Join-Path (Get-Location) ".env"
if (-not (Test-Path $envPath)) {
    Write-Host ""
    Write-Host "[INFO] Criando arquivo .env a partir de .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[INFO] .env criado! Edite com suas chaves de API." -ForegroundColor Yellow
} else {
    Write-Host "[OK] .env ja existe" -ForegroundColor Green
}

# Install dependencies
Write-Host ""
Write-Host "[INFO] Instalando dependencias..." -ForegroundColor Yellow

if ($Force) {
    npm install --force
} else {
    npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Falha ao instalar dependencias." -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup concluido com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "  Proximos passos:" -ForegroundColor White
Write-Host "  1. Edite o arquivo .env com suas chaves" -ForegroundColor White
Write-Host "  2. Execute: scripts\run.ps1" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan

pause
