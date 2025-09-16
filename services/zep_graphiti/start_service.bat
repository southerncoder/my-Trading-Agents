@echo off
cd %~dp0
set PYTHONPATH=%CD%\src
echo Starting Zep Graphiti service...
uv run python src\zep_service\main.py
pause