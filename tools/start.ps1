# Start Trading Agents Services
# Starts all supporting services (databases, APIs) but not the CLI container
# The CLI runs locally for faster development

param(
    [switch]$Fresh,  # Clean start (remove all data)
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Start Trading Agents Services

Usage: .\start-services-no-cli.ps1 [-Fresh] [-Help]

  -Fresh    Clean start (removes all data)
  -Help     Show this help

After services start:
  cd services/trading-agents
  npm run cli

"@
    exit 0
}

Write-Host "Starting Trading Agents Services..." -ForegroundColor Green

if ($Fresh) {
    Write-Host "WARNING: This will delete all data!" -ForegroundColor Red
    $confirm = Read-Host "Type 'YES' to confirm"
    if ($confirm -ne "YES") {
        Write-Host "Cancelled"
        exit 0
    }
    docker compose down -v --remove-orphans
}

# Start services (excluding CLI container)
$services = @(
    "postgresql", "redis", "neo4j", "zep-graphiti", 
    "news-aggregator", "government-data", "web-api", "web-frontend"
)

docker compose up -d $services

Write-Host "`nServices started! Available at:" -ForegroundColor Green
Write-Host "  Web Frontend: http://localhost:3000"
Write-Host "  Neo4j Browser: http://localhost:7474"
Write-Host "`nTo run CLI:" -ForegroundColor Yellow
Write-Host "  cd services/trading-agents"
Write-Host "  npm run cli"