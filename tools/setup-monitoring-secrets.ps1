# =====================================================================================
# Setup Monitoring Secrets (PowerShell)
# =====================================================================================
# This script sets up the required secrets for the monitoring system PostgreSQL database.
# It creates the docker secrets directory and generates a secure password if needed.
# =====================================================================================

param(
    [switch]$Force = $false
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"

Write-Host "Setting up monitoring secrets..." -ForegroundColor $Green

# Create secrets directory if it doesn't exist
$SecretsDir = "./docker/secrets"
if (-not (Test-Path $SecretsDir)) {
    Write-Host "Creating secrets directory: $SecretsDir" -ForegroundColor $Yellow
    New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null
}

# Check if PostgreSQL password secret exists
$PostgresSecret = "$SecretsDir/postgres_password.txt"
if (-not (Test-Path $PostgresSecret) -or $Force) {
    Write-Host "PostgreSQL password secret not found. Creating new secure password..." -ForegroundColor $Yellow
    
    # Generate a secure random password
    $Password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 25 | ForEach-Object {[char]$_})
    $Password | Out-File -FilePath $PostgresSecret -Encoding ASCII -NoNewline
    
    Write-Host "Created PostgreSQL password secret: $PostgresSecret" -ForegroundColor $Green
} else {
    Write-Host "PostgreSQL password secret already exists: $PostgresSecret" -ForegroundColor $Green
}

# Update .env.local if it exists
$EnvFile = ".env.local"
if (Test-Path $EnvFile) {
    Write-Host "Updating $EnvFile with PostgreSQL configuration..." -ForegroundColor $Yellow
    
    # Read the generated password
    $PostgresPassword = Get-Content $PostgresSecret -Raw
    $PostgresPassword = $PostgresPassword.Trim()
    
    # Read current .env.local content
    $EnvContent = Get-Content $EnvFile -Raw
    
    # Check if POSTGRES_PASSWORD is already set
    if ($EnvContent -match "^POSTGRES_PASSWORD=") {
        Write-Host "POSTGRES_PASSWORD already set in $EnvFile" -ForegroundColor $Yellow
    } else {
        Add-Content $EnvFile "`n# PostgreSQL Configuration for Monitoring"
        Add-Content $EnvFile "POSTGRES_PASSWORD=$PostgresPassword"
        Write-Host "Added POSTGRES_PASSWORD to $EnvFile" -ForegroundColor $Green
    }
    
    # Add other PostgreSQL settings if not present
    if ($EnvContent -notmatch "^POSTGRES_HOST=") {
        Add-Content $EnvFile "POSTGRES_HOST=postgresql"
    }
    if ($EnvContent -notmatch "^POSTGRES_PORT=") {
        Add-Content $EnvFile "POSTGRES_PORT=5432"
    }
    if ($EnvContent -notmatch "^POSTGRES_DB=") {
        Add-Content $EnvFile "POSTGRES_DB=trading_agents"
    }
    if ($EnvContent -notmatch "^POSTGRES_USER=") {
        Add-Content $EnvFile "POSTGRES_USER=postgres"
    }
} else {
    Write-Host "No .env.local file found. Please create one based on .env.monitoring.example" -ForegroundColor $Yellow
}

Write-Host "Monitoring secrets setup complete!" -ForegroundColor $Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $Yellow
Write-Host "1. Review your .env.local file"
Write-Host "2. Start the monitoring system with:"
Write-Host "   docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d"
Write-Host ""
Write-Host "Database Information:" -ForegroundColor $Yellow
Write-Host "- PostgreSQL will be available at localhost:5432"
Write-Host "- Database: trading_agents"
Write-Host "- Username: postgres"
Write-Host "- Password: (stored in $PostgresSecret)"