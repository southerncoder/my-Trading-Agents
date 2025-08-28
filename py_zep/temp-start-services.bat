@echo off
title Zep Graphiti Services
cd /d "d:\Code\PersonalDev\my-Trading-Agents\py_zep"
echo Starting services with docker-compose...
docker-compose up --remove-orphans
echo Services stopped. Press any key to close...
pause
