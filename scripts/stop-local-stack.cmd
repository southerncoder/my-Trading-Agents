@echo off
REM Stop local registry + services stack
cd /d %~dp0\..
echo Stopping local registry and services...
docker compose -f docker-compose.local-stack.yml down
echo Stack stopped.
