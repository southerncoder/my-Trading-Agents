# TradingAgents Web Services Startup Script (PowerShell)
# This script starts the web frontend and API services using Docker Compose

param(
    [switch]$Build = $false,
    [switch]$Logs = $false
)

Write-Host "🚀 Starting TradingAgents Web Services..." -ForegroundColor Cyan

# Change to services directory
Set-Location (Split-Path $PSScriptRoot -Parent)

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Build and start services
if ($Build) {
    Write-Host "📦 Building and starting web services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.web.yml up --build -d
} else {
    Write-Host "📦 Starting web services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.web.yml up -d
}

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
$timeout = 120
$counter = 0

while ($counter -lt $timeout) {
    $status = docker-compose -f docker-compose.web.yml ps --format json | ConvertFrom-Json
    $healthy = $status | Where-Object { $_.Health -eq "healthy" }
    
    if ($healthy.Count -eq 2) {
        Write-Host "✅ Services are ready!" -ForegroundColor Green
        break
    }
    
    if ($counter -ge $timeout) {
        Write-Host "❌ Timeout waiting for services to be ready" -ForegroundColor Red
        docker-compose -f docker-compose.web.yml logs
        exit 1
    }
    
    Start-Sleep 2
    $counter += 2
    Write-Host "   Waiting... ($counter/$timeout seconds)" -ForegroundColor Gray
}

# Show service status
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose -f docker-compose.web.yml ps

Write-Host ""
Write-Host "🌐 Web Services are now running:" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   API:      http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "📝 To view logs: docker-compose -f docker-compose.web.yml logs -f" -ForegroundColor Gray
Write-Host "🛑 To stop:      docker-compose -f docker-compose.web.yml down" -ForegroundColor Gray

if ($Logs) {
    Write-Host ""
    Write-Host "📝 Showing service logs..." -ForegroundColor Yellow
    docker-compose -f docker-compose.web.yml logs -f
}