#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start Zep Graphiti services using official Docker images in a new terminal window
.DESCRIPTION
    This script starts the Neo4j database and official Zep Graphiti service containers
    in a new Windows Terminal window for easy monitoring and management.
#>
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start Zep Graphiti services (detached) for automated tests.
.DESCRIPTION
    This script starts Neo4j and Zep Graphiti using docker-compose in detached mode.
    It is intentionally simple and avoids interactive terminal launches so automated
    test runners can call it reliably.
#>

param(
    [switch]$Fresh = $false
)

$ZepDir = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Definition) ''

Write-Host "Starting Zep Graphiti services (detached)..."

if ($Fresh) {
    Write-Host "Performing fresh cleanup (docker-compose down -v)..."
    Push-Location $ZepDir
    docker-compose down -v
    Pop-Location
}

Push-Location $ZepDir
try {
    docker-compose pull
    docker-compose up -d --remove-orphans
    Write-Host "docker-compose up -d completed. Waiting 30 seconds for services to initialize..."
    Start-Sleep -Seconds 30
    try {
        $resp = Invoke-RestMethod -Uri 'http://localhost:8000/docs' -Method GET -TimeoutSec 10 -ErrorAction Stop
        Write-Host "Zep Graphiti is responding at /docs"
    } catch {
        Write-Host "Warning: Zep Graphiti /docs not reachable yet: $($_.Exception.Message)"
    }
} catch {
    Write-Host "Error while starting services: $($_.Exception.Message)"
    Pop-Location
    exit 1
}
Pop-Location

Write-Host "Services started (detached). Use 'docker-compose -f docker-compose.yml ps' to check status." 