@echo off
cd C:\code\PersonalDev\my-Trading-Agents\py_zep
set PYTHONPATH=%CD%\src
echo Starting Zep Graphiti service...
uv run python src\zep_service\main.py
pause