$ErrorActionPreference = "SilentlyContinue"

$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Nexus Flow - System Status" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Check($label, $condition, $okMessage, $failMessage) {
    if ($condition) {
        Write-Host "  [OK]    $label" -ForegroundColor Green
    } else {
        Write-Host "  [$($failMessage ? 'WARN' : 'INFO')]   $label" -ForegroundColor ($failMessage ? 'Yellow' : 'Gray')
    }
}

# Node.js
try {
    $nodeVer = node --version
    Check "Node.js $nodeVer" $true
} catch {
    Check "Node.js: not found" $false $true
}

# npm
try {
    $npmVer = npm --version
    Check "npm v$npmVer" $true
} catch {
    Check "npm: not found" $false $true
}

# .env
Check ".env present" (Test-Path ".env") $true $true

# node_modules
Check "node_modules" (Test-Path "node_modules") $true $true

# dist
Check "dist/ (build)" (Test-Path "dist") $false $false

# Directories
Check "data/" (Test-Path "data") $false $false
Check "logs/" (Test-Path "logs") $false $false
Check "temp/" (Test-Path "temp") $false $false
Check "agents/skills/" (Test-Path "agents/skills") $true $true

# Project size
$size = Get-ChildItem -Path "." -Recurse -File -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum
$totalMB = [math]::Round(($size.Sum / 1MB), 2)

Write-Host ""
Write-Host "  Project size: $totalMB MB" -ForegroundColor Gray

# File counts
$tsCount = (Get-ChildItem -Path "src" -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue).Count
$jsCount = (Get-ChildItem -Path "src" -Recurse -Filter "*.json" -ErrorAction SilentlyContinue).Count
Write-Host "  TypeScript files: $tsCount" -ForegroundColor Gray

Write-Host ""
pause
