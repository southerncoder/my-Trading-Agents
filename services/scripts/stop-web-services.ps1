# TradingAgents Web Services Stop Script (PowerShell)
# This script stops the web frontend and API services

param(
    [switch]$Remove = $false,
    [switch]$Volumes = $false
)

Write-Host "🛑 Stopping TradingAgents Web Services..." -ForegroundColor Yellow

# Change to services directory
Set-Location (Split-Path $PSScriptRoot -Parent)

# Stop services
if ($Remove) {
    if ($Volumes) {
        Write-Host "🗑️ Stopping and removing services with volumes..." -ForegroundColor Red
        docker-compose -f docker-compose.web.yml down -v --remove-orphans
    } else {
        Write-Host "🗑️ Stopping and removing services..." -ForegroundColor Red
        docker-compose -f docker-compose.web.yml down --remove-orphans
    }
} else {
    Write-Host "⏸️ Stopping services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.web.yml stop
}

Write-Host "✅ Web services stopped successfully!" -ForegroundColor Green

# Show remaining containers
$containers = docker ps -a --filter "name=trading-agents-web" --format "table {{.Names}}\t{{.Status}}"
if ($containers.Count -gt 1) {
    Write-Host ""
    Write-Host "📊 Remaining containers:" -ForegroundColor Cyan
    Write-Host $containers -ForegroundColor White
}