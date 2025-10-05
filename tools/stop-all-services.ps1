#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Stop Trading Agents Docker Services

.DESCRIPTION
    Stops all Trading Agents services running via unified docker-compose.yml

.PARAMETER RemoveVolumes
    Remove all volumes (WARNING: This will delete all data)

.PARAMETER RemoveImages
    Remove all built images

.EXAMPLE
    .\stop-all-services.ps1
    Stop all services

.EXAMPLE
    .\stop-all-services.ps1 -RemoveVolumes
    Stop services and remove all data volumes
#>

param(
    [switch]$RemoveVolumes,
    [switch]$RemoveImages
)

function Write-ColorText {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Write-Success { param([string]$Text) Write-ColorText $Text "Green" }
function Write-Warning { param([string]$Text) Write-ColorText $Text "Yellow" }
function Write-Error { param([string]$Text) Write-ColorText $Text "Red" }
function Write-Info { param([string]$Text) Write-ColorText $Text "Cyan" }

Write-ColorText "`n🛑 Trading Agents - Stop All Services" "Magenta"
Write-ColorText "================================" "Magenta"

if ($RemoveVolumes) {
    Write-Warning "`n⚠️  WARNING: RemoveVolumes flag detected!"
    Write-Warning "This will DELETE all Neo4j data, logs, and persistent storage!"
    
    $confirm = Read-Host "Are you sure? Type 'YES' to confirm"
    if ($confirm -ne "YES") {
        Write-Info "Operation cancelled"
        exit 0
    }
}

Write-Info "`n🛑 Stopping Trading Agents services..."

try {
    if ($RemoveVolumes) {
        docker compose --env-file .env.local down -v --remove-orphans
        Write-Success "✅ Services stopped and volumes removed"
    } else {
        docker compose --env-file .env.local down --remove-orphans
        Write-Success "✅ Services stopped (data preserved)"
    }
    
    if ($RemoveImages) {
        Write-Info "🗑️  Removing built images..."
        docker image rm trading-agents:latest reddit-service:latest 2>$null
        Write-Success "✅ Built images removed"
    }
    
    Write-Success "`n🎉 All services stopped successfully!"
    
} catch {
    Write-Error "❌ Error stopping services: $_"
    exit 1
}