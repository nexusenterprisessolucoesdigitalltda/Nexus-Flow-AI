@echo off
title Nexus Flow - Docker

if "%1"=="" (
    echo Nexus Flow - Docker Commands
    echo.
    echo Usage:
    echo   scripts\docker build    - Build container
    echo   scripts\docker up       - Start container (background)
    echo   scripts\docker down     - Stop container
    echo   scripts\docker restart  - Restart container
    echo   scripts\docker logs     - View logs
    echo   scripts\docker shell    - Open shell in container
    goto :eof
)

if "%1"=="build" (
    docker compose build
    goto :eof
)

if "%1"=="up" (
    docker compose up -d
    echo Container started. Use 'scripts\docker logs' para ver logs.
    goto :eof
)

if "%1"=="down" (
    docker compose down
    goto :eof
)

if "%1"=="restart" (
    docker compose restart
    goto :eof
)

if "%1"=="logs" (
    docker compose logs -f
    goto :eof
)

if "%1"=="shell" (
    docker compose exec sunday-claw sh
    goto :eof
)

echo Comando desconhecido: %1
exit /b 1
