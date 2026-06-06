@echo off
title Nexus Flow - Status
echo ============================================
echo   Nexus Flow - System Status
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Node.js: 
    node --version
) else (
    echo [FAIL] Node.js: nao encontrado
)

REM Check .env
if exist ".env" (
    echo [OK] .env: presente
) else (
    echo [WARN] .env: ausente (execute setup.bat)
)

REM Check node_modules
if exist "node_modules" (
    echo [OK] node_modules: presente
) else (
    echo [WARN] node_modules: ausente (execute setup.bat)
)

REM Check dist
if exist "dist" (
    echo [OK] dist/: presente
) else (
    echo [INFO] dist/: ausente (execute build.bat)
)

REM Check directories
if exist "data" (echo [OK] data/: presente) else (echo [INFO] data/: sera criado ao iniciar)
if exist "logs" (echo [OK] logs/: presente) else (echo [INFO] logs/: sera criado ao iniciar)
if exist "temp" (echo [OK] temp/: presente) else (echo [INFO] temp/: sera criado ao iniciar)
if exist "agents\skills" (echo [OK] agents/skills/: presente) else (echo [WARN] agents/skills/: ausente)

REM Check package size
echo.
echo [INFO] Tamanho do projeto:
powershell -Command "Get-ChildItem -Path '.' -Recurse -File | Measure-Object -Property Length -Sum | Select-Object @{N='TotalMB';E={[math]::Round($_.Sum/1MB,2)}} | Format-Table -AutoSize" 2>nul

echo.
pause
