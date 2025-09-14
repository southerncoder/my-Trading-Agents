@echo off
title Zep Graphiti Services
echo Starting Zep Graphiti Services...
cd /d "%~dp0"

REM Check if Docker is running
docker version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo Starting services with docker-compose...
docker-compose up --remove-orphans

echo Services stopped. Press any key to close...
pause