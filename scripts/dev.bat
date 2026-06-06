@echo off
title Nexus Flow - Dev Mode
echo ============================================
echo   Nexus Flow - Modo Desenvolvimento
echo   Hot-reload ativado
echo ============================================
echo.

REM Check .env
if not exist ".env" (
    echo [ERROR] Arquivo .env nao encontrado!
    pause
    exit /b 1
)

echo [INFO] Iniciando com hot-reload...
echo   Pressione Ctrl+C para parar
echo.

npx tsx watch src\index.ts