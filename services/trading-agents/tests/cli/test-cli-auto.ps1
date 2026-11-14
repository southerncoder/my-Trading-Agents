#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated CLI Test Runner - Runs LangGraph workflow test without user interaction

.DESCRIPTION
    This script runs the automated CLI test that exercises the full LangGraph workflow
    without requiring manual input. Perfect for debugging and iterative development.

.PARAMETER Watch
    Enable watch mode to automatically rerun tests when files change

.PARAMETER Verbose
    Enable verbose output with detailed logging

.EXAMPLE
    .\test-cli-auto.ps1
    Run the automated test once

.EXAMPLE
    .\test-cli-auto.ps1 -Watch
    Run in watch mode for continuous testing

.EXAMPLE
    .\test-cli-auto.ps1 -Verbose
    Run with verbose logging enabled
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [switch]$Watch,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Navigate to script directory
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Blue
Write-Host "     🤖 Automated CLI Test - LangGraph Workflow" -ForegroundColor Blue
Write-Host "=========================================================" -ForegroundColor Blue
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found. Running npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        exit 1
    }
}

# Determine which command to run
$command = if ($Watch) { "cli:test:watch" } else { "cli:test" }

Write-Host "🚀 Running automated test..." -ForegroundColor Cyan
if ($Watch) {
    Write-Host "   Watch mode enabled - tests will rerun on file changes" -ForegroundColor Gray
    Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
}
if ($Verbose) {
    Write-Host "   Verbose logging enabled" -ForegroundColor Gray
}
Write-Host ""

try {
    # Run the test
    if ($Verbose) {
        $env:LOG_LEVEL = "debug"
    }
    
    npm run $command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Test completed successfully!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Test failed with exit code $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Only pause if not in watch mode
if (-not $Watch) {
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
