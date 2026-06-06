@echo off
title Nexus Flow - Setup
echo ============================================
echo   Nexus Flow - Setup
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js nao encontrado. Instale Node.js 18+ em: https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
node --version

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm nao encontrado.
    pause
    exit /b 1
)

echo [OK] npm encontrado
npm --version

REM Create .env if not exists
if not exist ".env" (
    echo.
    echo [INFO] Criando arquivo .env a partir de .env.example...
    copy .env.example .env >nul
    echo [INFO] Arquivo .env criado! Edite com suas chaves de API.
) else (
    echo [OK] .env ja existe
)

REM Install dependencies
echo.
echo [INFO] Instalando dependencias...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Falha ao instalar dependencias.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Setup concluido com sucesso!
echo.
echo   Proximos passos:
echo   1. Edite o arquivo .env com suas chaves
echo   2. Execute: scripts\run.bat
echo ============================================
pause
