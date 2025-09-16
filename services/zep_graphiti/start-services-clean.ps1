param(
    [switch]$Build = $false,
    [switch]$Fresh = $false
)

$ErrorActionPreference = "Stop"
$ZepDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Zep Graphiti Services..." -ForegroundColor Green

# Check if Docker is running
try {
    docker version | Out-Null
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Change to correct directory
Set-Location $ZepDir

# Stop any existing containers if Fresh start requested
if ($Fresh) {
    Write-Host "Cleaning up existing containers..." -ForegroundColor Yellow
    docker-compose down -v 2>$null
}

# Build containers if requested
if ($Build) {
    Write-Host "Building Zep service container..." -ForegroundColor Yellow
    docker-compose build --no-cache zep-service
}

# Start services in a new terminal window
Write-Host "Opening new terminal window for services..." -ForegroundColor Cyan

# Create a simple batch file to run the services
$batchContent = @"
@echo off
title Zep Graphiti Services
cd /d "$ZepDir"
echo Starting services with docker-compose...
docker-compose up --remove-orphans
echo Services stopped. Press any key to close...
pause
"@

$batchFile = "$ZepDir\temp-start-services.bat"
$batchContent | Out-File -FilePath $batchFile -Encoding ASCII

# Start the batch file in a new window
Start-Process -FilePath "cmd" -ArgumentList "/c", "start", "`"Zep Services`"", $batchFile

Write-Host "Services starting in new terminal window!" -ForegroundColor Green
Write-Host "Monitor the services in the new terminal window" -ForegroundColor Yellow
Write-Host "Services will be available at:" -ForegroundColor Cyan
Write-Host "  - Neo4j Browser: http://localhost:7474"
Write-Host "  - Zep API Health: http://localhost:8080/health"

Write-Host "Waiting 30 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test service availability
Write-Host "Testing service connectivity..." -ForegroundColor Cyan

$maxAttempts = 6
$attempt = 1

while ($attempt -le $maxAttempts) {
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 5
        Write-Host "Services are running!" -ForegroundColor Green
        Write-Host "Status: $($healthResponse.status)"
        break
    } catch {
        Write-Host "Attempt $attempt/$maxAttempts - Services not ready yet..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        $attempt++
    }
}

if ($attempt -gt $maxAttempts) {
    Write-Host "Services may still be starting. Check the service terminal window." -ForegroundColor Yellow
}

Write-Host "Setup complete!" -ForegroundColor Green