@echo off
title Nexus Flow - Build
echo ============================================
echo   Nexus Flow - Build
echo ============================================
echo.

REM Check node_modules
if not exist "node_modules" (
    echo [INFO] node_modules nao encontrado. Executando setup...
    call scripts\setup.bat
)

echo [INFO] Limpando diretorio dist...
if exist "dist" rmdir /s /q dist

echo [INFO] Compilando TypeScript...
npx tsc
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Falha na compilacao.
    pause
    exit /b 1
)

echo [OK] Build concluido!
echo.
echo   Para iniciar em producao:
echo   node dist\index.js
echo.
pause