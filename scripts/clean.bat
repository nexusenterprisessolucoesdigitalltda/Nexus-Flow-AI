@echo off
title Nexus Flow - Clean
echo ============================================
echo   Nexus Flow - Clean
echo ============================================
echo.

set /p confirm="Tem certeza? Isso vai apagar dist, node_modules, temp, logs e data. (s/N): "
if /i not "%confirm%"=="s" (
    echo Operacao cancelada.
    pause
    exit /b 0
)

echo [INFO] Removendo dist...
if exist "dist" rmdir /s /q dist

echo [INFO] Removendo node_modules...
if exist "node_modules" rmdir /s /q node_modules

echo [INFO] Removendo temp...
if exist "temp" rmdir /s /q temp

echo [INFO] Removendo logs...
if exist "logs" rmdir /s /q logs

echo [INFO] Removendo data...
if exist "data" rmdir /s /q data

echo [OK] Projeto limpo.
pause
