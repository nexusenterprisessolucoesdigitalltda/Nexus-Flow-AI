@echo off
title Nexus Flow - Running
echo ============================================
echo   Nexus Flow - Running
echo ============================================
echo.

REM Check .env
if not exist ".env" (
    echo [ERROR] Arquivo .env nao encontrado!
    echo Execute primeiro: scripts\setup.bat
    pause
    exit /b 1
)

REM Check node_modules
if not exist "node_modules" (
    echo [INFO] node_modules nao encontrado. Executando setup...
    call scripts\setup.bat
    if %ERRORLEVEL% neq 0 exit /b 1
)

echo [INFO] Iniciando Nexus Flow...
echo.
echo   Pressione Ctrl+C para parar
echo.

npx tsx src\index.ts
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Nexus Flow encerrou com erro.
    pause
    exit /b 1
)
