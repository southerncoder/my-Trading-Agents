# TradingAgents Docker CLI Test Script
# This script runs the TradingAgents CLI in Docker with a test configuration
# Usage: .\run-trading-agents-test.ps1

param(
    [string]$ConfigFile = "test-config.json",
    [string]$Ticker = "AAPL",
    [string]$AnalysisDate = "2025-09-13",
    [switch]$Verbose,
    [switch]$Interactive
)

# Configuration
$DOCKER_COMPOSE_FILE = "docker-compose.yml"
$TRADING_AGENTS_SERVICE = "trading-agents"
$CONFIG_MOUNT_PATH = "/app/config"
$RESULTS_MOUNT_PATH = "/app/results"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"
$White = "White"

function Write-ColoredOutput {
    param(
        [string]$Message,
        [string]$Color = $White
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Header {
    param([string]$Title)
    Write-ColoredOutput "`n==================================================" $Cyan
    Write-ColoredOutput " $Title" $Cyan
    Write-ColoredOutput "==================================================" $Cyan
}

function Test-DockerServices {
    Write-ColoredOutput "`nChecking Docker services status..." $Yellow

    try {
        $services = docker compose ps --format json | ConvertFrom-Json
        $allHealthy = $true

        foreach ($service in $services) {
            $status = $service.Status
            $name = $service.Name

            if ($status -like "*healthy*") {
                Write-ColoredOutput "  ✓ $name - $status" $Green
            } elseif ($status -like "*running*") {
                Write-ColoredOutput "  ⚠ $name - $status" $Yellow
            } else {
                Write-ColoredOutput "  ✗ $name - $status" $Red
                $allHealthy = $false
            }
        }

        return $allHealthy
    } catch {
        Write-ColoredOutput "  ✗ Failed to check Docker services: $($_.Exception.Message)" $Red
        return $false
    }
}

function Run-TradingAgentsCLI {
    param(
        [string]$ConfigPath,
        [string]$Ticker,
        [string]$Date,
        [bool]$Verbose,
        [bool]$Interactive
    )

    Write-Header "Running TradingAgents CLI Test"

    # Build the command
    $command = "node cli.js"

    if ($Interactive) {
        $command += " --interactive"
    } else {
        $command += " analyze --ticker $Ticker --date $Date --config $ConfigPath"
    }

    if ($Verbose) {
        $command += " --verbose"
    }

    Write-ColoredOutput "Command: $command" $Cyan
    Write-ColoredOutput "Config file: $ConfigPath" $Cyan
    Write-ColoredOutput "Ticker: $Ticker" $Cyan
    Write-ColoredOutput "Date: $Date" $Cyan

    # Execute the command in Docker
    try {
        Write-ColoredOutput "`nExecuting TradingAgents CLI..." $Yellow

        if ($Interactive) {
            # For interactive mode, we need to allocate a pseudo-TTY
            docker compose exec -T $TRADING_AGENTS_SERVICE bash -c "cd /app && $command"
        } else {
            # For non-interactive mode
            docker compose exec $TRADING_AGENTS_SERVICE bash -c "cd /app && $command"
        }

        if ($LASTEXITCODE -eq 0) {
            Write-ColoredOutput "`n✓ TradingAgents CLI completed successfully!" $Green
        } else {
            Write-ColoredOutput "`n✗ TradingAgents CLI failed with exit code: $LASTEXITCODE" $Red
        }
    } catch {
        Write-ColoredOutput "`n✗ Failed to execute TradingAgents CLI: $($_.Exception.Message)" $Red
    }
}

function Show-Usage {
    Write-Header "TradingAgents Docker Test Script Usage"
    Write-ColoredOutput "This script runs the TradingAgents CLI in Docker with various options.`n" $White

    Write-ColoredOutput "USAGE:" $Yellow
    Write-ColoredOutput "  .\run-trading-agents-test.ps1 [options]`n" $White

    Write-ColoredOutput "OPTIONS:" $Yellow
    Write-ColoredOutput "  -ConfigFile <file>    Path to config file (default: test-config.json)" $White
    Write-ColoredOutput "  -Ticker <symbol>      Stock ticker symbol (default: AAPL)" $White
    Write-ColoredOutput "  -AnalysisDate <date>  Analysis date in YYYY-MM-DD format (default: 2025-09-13)" $White
    Write-ColoredOutput "  -Verbose              Enable verbose logging" $White
    Write-ColoredOutput "  -Interactive          Run in interactive mode (shows CLI menu)" $White
    Write-ColoredOutput "  -Help                 Show this help message`n" $White

    Write-ColoredOutput "EXAMPLES:" $Yellow
    Write-ColoredOutput "  .\run-trading-agents-test.ps1" $White
    Write-ColoredOutput "  .\run-trading-agents-test.ps1 -Ticker NVDA -AnalysisDate 2025-09-12" $White
    Write-ColoredOutput "  .\run-trading-agents-test.ps1 -ConfigFile custom-config.json -Verbose" $White
    Write-ColoredOutput "  .\run-trading-agents-test.ps1 -Interactive`n" $White

    Write-ColoredOutput "NOTES:" $Yellow
    Write-ColoredOutput "  - Make sure Docker services are running: docker compose up -d" $White
    Write-ColoredOutput "  - Config file should be in the services/trading-agents/ directory" $White
    Write-ColoredOutput "  - Results will be saved to the data/exports/ directory" $White
}

# Main script execution
try {
    # Check if help was requested
    if ($args -contains "-Help" -or $args -contains "--help" -or $args -contains "-h") {
        Show-Usage
        exit 0
    }

    Write-Header "TradingAgents Docker CLI Test"

    # Check if config file exists
    $configFullPath = Join-Path $PSScriptRoot "services\trading-agents\$ConfigFile"
    if (-not (Test-Path $configFullPath)) {
        Write-ColoredOutput "✗ Config file not found: $configFullPath" $Red
        Write-ColoredOutput "Please ensure the config file exists in the services/trading-agents/ directory." $Yellow
        exit 1
    }

    # Test Docker services
    if (-not (Test-DockerServices)) {
        Write-ColoredOutput "`n✗ Some Docker services are not healthy. Please run 'docker compose up -d' first." $Red
        exit 1
    }

    # Run the CLI
    Run-TradingAgentsCLI -ConfigPath "/app/$ConfigFile" -Ticker $Ticker -Date $AnalysisDate -Verbose $Verbose -Interactive $Interactive

} catch {
    Write-ColoredOutput "`n✗ Script execution failed: $($_.Exception.Message)" $Red
    Write-ColoredOutput "Stack trace: $($_.Exception.StackTrace)" $Red
    exit 1
}

Write-ColoredOutput "`n==================================================" $Cyan
Write-ColoredOutput " Test completed. Check logs and results above." $Cyan
Write-ColoredOutput "==================================================" $Cyan