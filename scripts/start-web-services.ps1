#!/usr/bin/env pwsh

# TradingAgents Web Services Startup Script
# Starts the web frontend and API backend in Docker containers

param(
    [switch]$Fresh,
    [switch]$Build,
    [switch]$Logs,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 TradingAgents Web Services Manager" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if ($Stop) {
    Write-Host "🛑 Stopping web services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.web.yml down
    Write-Host "✅ Web services stopped" -ForegroundColor Green
    exit 0
}

if ($Fresh) {
    Write-Host "🧹 Cleaning up existing containers and volumes..." -ForegroundColor Yellow
    docker-compose -f docker-compose.web.yml down -v --remove-orphans
    docker system prune -f
}

if ($Build) {
    Write-Host "🔨 Building web services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.web.yml build --no-cache
}

Write-Host "🚀 Starting TradingAgents web services..." -ForegroundColor Green

# Start services
docker-compose -f docker-compose.web.yml up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow

$maxWait = 120 # 2 minutes
$waited = 0
$interval = 5

do {
    Start-Sleep $interval
    $waited += $interval
    
    $apiHealth = docker-compose -f docker-compose.web.yml ps --services --filter "status=running" | Where-Object { $_ -eq "web-api" }
    $frontendHealth = docker-compose -f docker-compose.web.yml ps --services --filter "status=running" | Where-Object { $_ -eq "web-frontend" }
    
    if ($apiHealth -and $frontendHealth) {
        Write-Host "✅ All services are healthy!" -ForegroundColor Green
        break
    }
    
    Write-Host "⏳ Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Yellow
    
} while ($waited -lt $maxWait)

if ($waited -ge $maxWait) {
    Write-Host "❌ Services failed to start within $maxWait seconds" -ForegroundColor Red
    Write-Host "📋 Checking service status..." -ForegroundColor Yellow
    docker-compose -f docker-compose.web.yml ps
    exit 1
}

Write-Host ""
Write-Host "🎉 TradingAgents Web Services Started Successfully!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Web Frontend:  http://localhost" -ForegroundColor Cyan
Write-Host "🔌 API Backend:   http://localhost:38401" -ForegroundColor Cyan
Write-Host "📡 WebSocket:     ws://localhost:38401/ws" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Yellow
docker-compose -f docker-compose.web.yml ps

if ($Logs) {
    Write-Host ""
    Write-Host "📋 Following logs (Ctrl+C to exit)..." -ForegroundColor Yellow
    docker-compose -f docker-compose.web.yml logs -f
}

Write-Host ""
Write-Host "💡 Useful Commands:" -ForegroundColor Magenta
Write-Host "  View logs:     docker-compose -f docker-compose.web.yml logs -f" -ForegroundColor White
Write-Host "  Stop services: docker-compose -f docker-compose.web.yml down" -ForegroundColor White
Write-Host "  Restart:       .\scripts\start-web-services.ps1 -Fresh" -ForegroundColor White