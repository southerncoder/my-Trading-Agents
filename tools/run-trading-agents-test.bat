@echo off
REM TradingAgents Docker CLI Test Batch Script
REM This script runs the TradingAgents CLI in Docker with a test configuration
REM Usage: run-trading-agents-test.bat [ticker] [config_file]

echo ==================================================
echo  TradingAgents Docker CLI Test
echo ==================================================

REM Default values
set TICKER=%1
if "%TICKER%"=="" set TICKER=AAPL

set CONFIG_FILE=%2
if "%CONFIG_FILE%"=="" set CONFIG_FILE=test-config.json

set ANALYSIS_DATE=2025-09-13

echo Config file: %CONFIG_FILE%
echo Ticker: %TICKER%
echo Date: %ANALYSIS_DATE%
echo.

echo Checking Docker services status...
docker compose ps

echo.
echo ==================================================
echo  Running TradingAgents CLI Test
echo ==================================================

echo Command: docker compose exec trading-agents node cli.js analyze --ticker %TICKER% --date %ANALYSIS_DATE% --config /app/%CONFIG_FILE%
echo.

docker compose exec trading-agents node cli.js analyze --ticker %TICKER% --date %ANALYSIS_DATE% --config /app/%CONFIG_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: TradingAgents CLI completed successfully!
) else (
    echo.
    echo ERROR: TradingAgents CLI failed with exit code %ERRORLEVEL%
)

echo.
echo ==================================================
echo  Test completed. Check logs and results above.
echo ==================================================