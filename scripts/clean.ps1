param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Nexus Flow - Clean" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "Tem certeza? Isso vai apagar dist, node_modules, temp, logs e data. (s/N)"
    if ($confirm -ne 's' -and $confirm -ne 'S') {
        Write-Host "Operacao cancelada." -ForegroundColor Yellow
        return
    }
}

$targets = @{
    'dist'          = 'dist'
    'node_modules'  = 'node_modules'
    'temp'          = 'temp'
    'logs'          = 'logs'
    'data'          = 'data'
}

foreach ($name in $targets.Keys) {
    $path = $targets[$name]
    if (Test-Path $path) {
        Write-Host "[CLEAN] Removing $name..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
    }
}

Write-Host "[OK] Project cleaned." -ForegroundColor Green
pause
