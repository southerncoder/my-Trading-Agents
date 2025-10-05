# Trading Agents - Start All Services Script

param(
    [switch]$Build,
    [switch]$Fresh,
    [switch]$Detached,
    [string[]]$Services = @(),
    [switch]$Help
)

# Color functions
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }

if ($Help) {
    Write-Host @"

Trading Agents - Start All Services

Usage: .\start-all-services-simple.ps1 [options]

Options:
  -Build          Force rebuild of containers
  -Fresh          Clean start (remove volumes)
  -Detached       Run in background
  -Services       Start specific services only (comma-separated)
  -Help           Show this help

Examples:
  .\start-all-services-simple.ps1                    # Normal startup
  .\start-all-services-simple.ps1 -Build             # Rebuild containers
  .\start-all-services-simple.ps1 -Fresh             # Clean restart
  .\start-all-services-simple.ps1 -Detached          # Background mode

Services Available:
  * neo4j          - Graph database
  * zep-graphiti   - Memory service
  * reddit-service - Social sentiment analysis
  * trading-agents - Main application

"@
    exit 0
}

Write-Host "`nTrading Agents - Start All Services" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta

# Environment validation
try {
    $dockerVersion = docker --version 2>$null
    if (-not $dockerVersion) {
        Write-Error "Docker is not installed or not in PATH"
        Write-Host "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
        exit 1
    }
    Write-Info "Docker found: $($dockerVersion.Split(' ')[2])"
} catch {
    Write-Error "Failed to check Docker installation"
    exit 1
}

try {
    $composeVersion = docker compose version 2>$null
    if (-not $composeVersion) {
        Write-Error "Docker Compose is not available"
        Write-Host "Please ensure Docker Compose is installed and available"
        exit 1
    }
    Write-Info "Docker Compose found"
} catch {
    Write-Error "Failed to check Docker Compose installation"
    exit 1
}

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Error "docker-compose.yml not found in current directory"
    Write-Host "Please run this script from the project root directory"
    exit 1
}

# Fresh start warning
if ($Fresh) {
    Write-Warning "`nWARNING: Fresh flag detected!"
    Write-Warning "This will DELETE all Neo4j data, logs, and persistent storage!"
    
    $confirm = Read-Host "Are you sure? Type 'YES' to confirm"
    if ($confirm -ne "YES") {
        Write-Info "Operation cancelled"
        exit 0
    }
    
    Write-Info "Stopping and removing all containers and volumes..."
    docker compose down -v --remove-orphans 2>$null
    Write-Success "Clean slate prepared"
}

# Build if requested
if ($Build) {
    Write-Info "Building containers..."
    try {
        docker compose build --no-cache
        Write-Success "Build completed"
    } catch {
        Write-Error "Build failed: $_"
        exit 1
    }
}

# Prepare docker compose command
$composeArgs = @("up")

if ($Detached) {
    $composeArgs += "--detach"
}

if ($Services.Count -gt 0) {
    $composeArgs += $Services
    Write-Info "Starting specific services: $($Services -join ', ')"
} else {
    Write-Info "Starting all Trading Agents services..."
}

# Start services
try {
    Write-Info "Starting services (this may take a few moments)..."
    
    if ($Detached) {
        docker compose $composeArgs
        Start-Sleep 5  # Give services time to initialize
        
        Write-Success "`nServices started in background!"
        Write-Info "`nService Status:"
        docker compose ps
        
        Write-Info "`nAvailable Endpoints:"
        Write-Info "  * Neo4j Browser: http://localhost:7474"
        Write-Info "  * Neo4j Bolt: bolt://localhost:7687"
        Write-Info "  * Zep Graphiti API: http://localhost:8000"
        Write-Info "  * Reddit Service: http://localhost:3001"
        Write-Info "  * Trading Agents: Container running"
        
        Write-Info "`nUseful Commands:"
        Write-Info "  * View logs: docker compose logs -f [service-name]"
        Write-Info "  * Stop services: docker compose down"
        Write-Info "  * Service status: docker compose ps"
        Write-Info "  * Restart service: docker compose restart [service-name]"
    } else {
        Write-Info "Running in foreground mode. Press Ctrl+C to stop all services."
        docker compose $composeArgs
    }
    
} catch {
    Write-Error "Failed to start services: $_"
    Write-Error "Check the logs with: docker compose logs"
    exit 1
}

Write-Success "`nTrading Agents services startup completed!"