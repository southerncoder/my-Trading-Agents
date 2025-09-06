#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Starts the Trading Agents services with secure Neo4j password generation
.DESCRIPTION
    This script generates a secure Neo4j password and starts all services via docker-compose.
    It's the secure way to start the entire stack.
#>

param(
    [switch]$Recreate,
    [switch]$Build,
    [switch]$Detached,
    [string]$Service = ""
)

# Set error action preference
$ErrorActionPreference = "Stop"

$BaseDir = $PSScriptRoot

Write-Host "🚀 Trading Agents Secure Startup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Step 1: Generate Neo4j password
Write-Host "Step 1: Generating secure Neo4j credentials..." -ForegroundColor Yellow
try {
    & "$BaseDir\generate-neo4j-password.ps1"
    Write-Host "✅ Credentials generated successfully" -ForegroundColor Green
} catch {
    Write-Error "❌ Failed to generate Neo4j credentials: $($_.Exception.Message)"
    exit 1
}

Write-Host "" -ForegroundColor White

# Step 2: Build docker-compose command
Write-Host "Step 2: Starting Docker services..." -ForegroundColor Yellow

$DockerCmd = @("docker-compose", "up")

if ($Recreate) {
    $DockerCmd += "--force-recreate"
    Write-Host "   🔄 Force recreating containers" -ForegroundColor Gray
}

if ($Build) {
    $DockerCmd += "--build"
    Write-Host "   🔨 Building images" -ForegroundColor Gray
}

if ($Detached) {
    $DockerCmd += "-d"
    Write-Host "   🔄 Running in detached mode" -ForegroundColor Gray
}

if ($Service) {
    $DockerCmd += $Service
    Write-Host "   🎯 Starting specific service: $Service" -ForegroundColor Gray
}

# Step 3: Start services
try {
    Write-Host "🐳 Executing: $($DockerCmd -join ' ')" -ForegroundColor Cyan
    & $DockerCmd[0] $DockerCmd[1..($DockerCmd.Length-1)]
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "" -ForegroundColor White
        Write-Host "🎉 Services started successfully!" -ForegroundColor Green
        Write-Host "" -ForegroundColor White
        Write-Host "📋 Available endpoints:" -ForegroundColor Cyan
        Write-Host "   • Neo4j Browser: http://localhost:7474" -ForegroundColor Gray
        Write-Host "   • Zep Graphiti API: http://localhost:8000" -ForegroundColor Gray
        Write-Host "   • API Documentation: http://localhost:8000/docs" -ForegroundColor Gray
        Write-Host "" -ForegroundColor White
    } else {
        Write-Error "❌ Docker compose failed with exit code: $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} catch {
    Write-Error "❌ Failed to start services: $($_.Exception.Message)"
    exit 1
}

# Step 4: Health check information
if (-not $Detached) {
    Write-Host "💡 Tip: Services include health checks. Wait for all to be healthy before testing." -ForegroundColor Yellow
    Write-Host "💡 Use 'docker-compose ps' to check service status." -ForegroundColor Yellow
}