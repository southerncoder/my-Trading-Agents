@echo off
REM Start local registry + services stack using local images
cd /d %~dp0\..
echo Starting local registry and services...
docker compose -f docker-compose.local-stack.yml up -d
echo Stack started.
