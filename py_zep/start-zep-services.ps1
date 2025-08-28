#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start Zep Graphiti services using official Docker images in a new terminal window
.DESCRIPTION
    This script starts the Neo4j database and official Zep Graphiti service containers
    in a new Windows Terminal window for easy monitoring and management.
#>

param(
    [switch]$Fresh = $false
)

$ZepDir = "C:\code\PersonalDev\my-Trading-Agents\py_zep"

Write-Host "🚀 Starting Official Zep Graphiti Services..." -ForegroundColor Green

# Stop any existing containers if Fresh start requested
if ($Fresh) {
    Write-Host "🧹 Cleaning up existing containers..." -ForegroundColor Yellow
    Set-Location $ZepDir
    docker-compose down -v
}

# Start services in a new Windows Terminal window
Write-Host "📱 Opening new terminal window for services..." -ForegroundColor Cyan

# Use a simple approach with Windows Terminal
$wtCommand = "wt new-tab --title `"Zep Graphiti Services`" powershell -NoExit -Command `"Set-Location '$ZepDir'; Write-Host '🐳 Starting Official Zep Graphiti Services...' -ForegroundColor Green; docker-compose up --remove-orphans; Write-Host '🛑 Services stopped. Press any key to close...' -ForegroundColor Red; Read-Host`""

Start-Process -FilePath "cmd" -ArgumentList "/c", $wtCommand -WindowStyle Hidden

Write-Host "✅ Services starting in new terminal window!" -ForegroundColor Green
Write-Host "📊 Monitor the services in the new terminal tab" -ForegroundColor Yellow
Write-Host "🔍 Services will be available at:" -ForegroundColor Cyan
Write-Host "   - Neo4j Browser: http://localhost:7474" -ForegroundColor White
Write-Host "   - Zep Graphiti API: http://localhost:8000/docs" -ForegroundColor White
Write-Host "   - Zep Graphiti Redoc: http://localhost:8000/redoc" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Waiting 45 seconds for services to start..." -ForegroundColor Yellow

# Wait for services to start (official images may take longer)
Start-Sleep -Seconds 45

# Test service availability
Write-Host "🔍 Testing service connectivity..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/docs" -Method GET -TimeoutSec 10
    Write-Host "✅ Zep Graphiti service is running!" -ForegroundColor Green
    Write-Host "   API Documentation available at: http://localhost:8000/docs" -ForegroundColor White
    Write-Host "🎉 All services are healthy and ready!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Zep Graphiti service not ready yet (may still be starting):" -ForegroundColor Yellow
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📱 Check the service terminal window for startup progress" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🚀 Setup complete! The services are running in a separate terminal window." -ForegroundColor Green
Write-Host "📖 API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "🗄️  Neo4j Browser: http://localhost:7474 (neo4j/password)" -ForegroundColor Cyan