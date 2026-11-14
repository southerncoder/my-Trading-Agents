# =====================================================================================
# Trading Agents - Docker Secrets Migration Script (PowerShell)
# =====================================================================================
# This script migrates environment variables from .env.local to Docker secrets files
# Run this script to populate Docker secrets from your environment configuration
#
# Usage:
#   .\docker\secrets\migrate-secrets.ps1
#   or
#   powershell .\docker\secrets\migrate-secrets.ps1
# =====================================================================================

param(
    [switch]$List,
    [switch]$Clean,
    [switch]$Help
)

# Colors for output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Cyan"
$NC = "White"

# Project root directory
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$ENV_FILE = Join-Path $PROJECT_ROOT ".env.local"
$SECRETS_DIR = Join-Path $PROJECT_ROOT "docker\secrets"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor $BLUE
}

function Write-Success {
    param([string]$Message)
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor $GREEN
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor $YELLOW
}

function Write-Error {
    param([string]$Message)
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor $RED
}

# Function to create secret file
function New-SecretFile {
    param(
        [string]$EnvVar,
        [string]$SecretFile,
        [string]$Description
    )

    try {
        # Check if environment variable exists in .env.local
        if (Test-Path $ENV_FILE) {
            $content = Get-Content $ENV_FILE -Raw
            $pattern = "(?m)^${EnvVar}=(.*)$"
            $match = [regex]::Match($content, $pattern)

            if ($match.Success) {
                $value = $match.Groups[1].Value.Trim('"')

                if ($value -and $value -notlike "your_*_here") {
                    # Use UTF-8 encoding without BOM and ensure no newlines
                    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
                    [System.IO.File]::WriteAllText($SecretFile, $value, $utf8NoBom)
                    Write-Success "Created $Description secret: $SecretFile"
                } else {
                    Write-Warning "Skipped $Description (empty or placeholder value)"
                }
            } else {
                Write-Warning "Environment variable $EnvVar not found in .env.local"
            }
        } else {
            Write-Error ".env.local file not found"
        }
    } catch {
        Write-Error "Error creating secret file for ${EnvVar}: $($_.Exception.Message)"
    }
}

# Main migration function
function Invoke-SecretsMigration {
    Write-Status "Starting Docker secrets migration..."
    Write-Status "Project root: $PROJECT_ROOT"
    Write-Status "Environment file: $ENV_FILE"
    Write-Status "Secrets directory: $SECRETS_DIR"

    # Check if .env.local exists
    if (-not (Test-Path $ENV_FILE)) {
        Write-Error ".env.local file not found at: $ENV_FILE"
        Write-Error "Please ensure .env.local exists with your configuration"
        exit 1
    }

    # Create secrets directory if it doesn't exist
    if (-not (Test-Path $SECRETS_DIR)) {
        New-Item -ItemType Directory -Path $SECRETS_DIR -Force | Out-Null
    }

    Write-Status "Migrating secrets from .env.local to Docker secrets files..."

    # AI Provider Secrets
    New-SecretFile "OPENAI_API_KEY" (Join-Path $SECRETS_DIR "openai_api_key.txt") "OpenAI API Key"
    New-SecretFile "ANTHROPIC_API_KEY" (Join-Path $SECRETS_DIR "anthropic_api_key.txt") "Anthropic API Key"
    New-SecretFile "GOOGLE_API_KEY" (Join-Path $SECRETS_DIR "google_api_key.txt") "Google API Key"
    New-SecretFile "EMBEDDER_API_KEY" (Join-Path $SECRETS_DIR "embedder_api_key.txt") "Embedder API Key"
    New-SecretFile "EMBEDDING_API_KEY" (Join-Path $SECRETS_DIR "embedder_api_key.txt") "Embedding API Key (fallback)"

    # News and Data Provider Secrets
    New-SecretFile "TAVILY_API_KEY" (Join-Path $SECRETS_DIR "tavily_api_key.txt") "Tavily API Key"
    New-SecretFile "BRAVE_NEWS_API_KEY" (Join-Path $SECRETS_DIR "brave_news_api_key.txt") "Brave News API Key"
    New-SecretFile "NEWS_API_KEY" (Join-Path $SECRETS_DIR "news_api_key.txt") "News API Key"
    New-SecretFile "YAHOO_FINANCE_API_KEY" (Join-Path $SECRETS_DIR "yahoo_finance_api_key.txt") "Yahoo Finance API Key"

    # Market Data Provider Secrets
    New-SecretFile "FINNHUB_API_KEY" (Join-Path $SECRETS_DIR "finnhub_api_key.txt") "Finnhub API Key"
    New-SecretFile "ALPHA_VANTAGE_API_KEY" (Join-Path $SECRETS_DIR "alpha_vantage_api_key.txt") "Alpha Vantage API Key"
    New-SecretFile "MARKETSTACK_API_KEY" (Join-Path $SECRETS_DIR "marketstack_api_key.txt") "Marketstack API Key"
    New-SecretFile "SIMFIN_API_KEY" (Join-Path $SECRETS_DIR "simfin_api_key.txt") "SimFin API Key"
    New-SecretFile "IEX_CLOUD_TOKEN" (Join-Path $SECRETS_DIR "iex_cloud_token.txt") "IEX Cloud Token"

    # Social Media API Secrets
    New-SecretFile "TWITTER_BEARER_TOKEN" (Join-Path $SECRETS_DIR "twitter_bearer_token.txt") "Twitter Bearer Token"

    # Reddit API Secrets
    New-SecretFile "REDDIT_CLIENT_ID" (Join-Path $SECRETS_DIR "reddit_client_id.txt") "Reddit Client ID"
    New-SecretFile "REDDIT_CLIENT_SECRET" (Join-Path $SECRETS_DIR "reddit_client_secret.txt") "Reddit Client Secret"
    New-SecretFile "REDDIT_REFRESH_TOKEN" (Join-Path $SECRETS_DIR "reddit_refresh_token.txt") "Reddit Refresh Token"
    New-SecretFile "REDDIT_USERNAME" (Join-Path $SECRETS_DIR "reddit_username.txt") "Reddit Username"
    New-SecretFile "REDDIT_PASSWORD" (Join-Path $SECRETS_DIR "reddit_password.txt") "Reddit Password"
    New-SecretFile "REDDIT_USER_AGENT" (Join-Path $SECRETS_DIR "reddit_user_agent.txt") "Reddit User Agent"
    New-SecretFile "REDDIT_SERVICE_API_KEY" (Join-Path $SECRETS_DIR "reddit_service_api_key.txt") "Reddit Service API Key"

    # Database Secrets
    New-SecretFile "NEO4J_USER" (Join-Path $SECRETS_DIR "neo4j_user.txt") "Neo4j Username"
    New-SecretFile "NEO4J_PASSWORD" (Join-Path $SECRETS_DIR "neo4j_password.txt") "Neo4j Password"
    New-SecretFile "REDIS_PASSWORD" (Join-Path $SECRETS_DIR "redis_password.txt") "Redis Password"
    New-SecretFile "POSTGRES_USER" (Join-Path $SECRETS_DIR "postgres_user.txt") "PostgreSQL Username"
    New-SecretFile "POSTGRES_PASSWORD" (Join-Path $SECRETS_DIR "postgres_password.txt") "PostgreSQL Password"
    New-SecretFile "POSTGRES_DB" (Join-Path $SECRETS_DIR "postgres_db.txt") "PostgreSQL Database"

    # Government Data API Keys
    New-SecretFile "FRED_API_KEY" (Join-Path $SECRETS_DIR "fred_api_key.txt") "FRED API Key"
    New-SecretFile "BLS_API_KEY" (Join-Path $SECRETS_DIR "bls_api_key.txt") "BLS API Key"

    # LM Studio Configuration
    New-SecretFile "LM_STUDIO_BASE_URL" (Join-Path $SECRETS_DIR "local_lmstudio_base_url.txt") "Local LM Studio Base URL"
    New-SecretFile "LOCAL_LM_STUDIO_BASE_URL" (Join-Path $SECRETS_DIR "local_lmstudio_base_url.txt") "Local LM Studio Base URL (alt)"
    New-SecretFile "REMOTE_LM_STUDIO_BASE_URL" (Join-Path $SECRETS_DIR "remote_lmstudio_base_url.txt") "Remote LM Studio Base URL"
    New-SecretFile "LOCAL_LM_STUDIO_API_KEY" (Join-Path $SECRETS_DIR "local_lmstudio_api_key.txt") "Local LM Studio API Key"
    New-SecretFile "REMOTE_LM_STUDIO_API_KEY" (Join-Path $SECRETS_DIR "remote_lmstudio_api_key.txt") "Remote LM Studio API Key"

    # Zep Service Configuration
    New-SecretFile "ZEP_API_KEY" (Join-Path $SECRETS_DIR "zep_api_key.txt") "Zep API Key"

    Write-Success "Docker secrets migration completed!"
    Write-Status "Created secrets files in: $SECRETS_DIR"
    Write-Status "You can now run: docker compose up"
}

# Function to show usage
function Show-Usage {
    Write-Host "Trading Agents - Docker Secrets Migration Script (PowerShell)" -ForegroundColor $GREEN
    Write-Host ""
    Write-Host "This script migrates environment variables from .env.local to Docker secrets files."
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\migrate-secrets.ps1                    # Run the migration"
    Write-Host "  .\migrate-secrets.ps1 -List             # List all secrets that will be created"
    Write-Host "  .\migrate-secrets.ps1 -Clean            # Remove all secrets files"
    Write-Host "  .\migrate-secrets.ps1 -Help             # Show this help"
    Write-Host ""
    Write-Host "Requirements:"
    Write-Host "  - .env.local file must exist in project root"
    Write-Host "  - Environment variables must be set in .env.local"
    Write-Host ""
}

# Function to list secrets
function Show-SecretsList {
    Write-Host "The following secrets will be created:"
    Write-Host ""
    Write-Host "AI Provider Secrets:" -ForegroundColor $YELLOW
    Write-Host "  - openai_api_key.txt"
    Write-Host "  - anthropic_api_key.txt"
    Write-Host "  - google_api_key.txt"
    Write-Host "  - embedder_api_key.txt"
    Write-Host ""
    Write-Host "News and Data Provider Secrets:" -ForegroundColor $YELLOW
    Write-Host "  - tavily_api_key.txt"
    Write-Host "  - brave_news_api_key.txt"
    Write-Host "  - news_api_key.txt"
    Write-Host "  - yahoo_finance_api_key.txt"
    Write-Host ""
    Write-Host "Market Data Provider Secrets:" -ForegroundColor $YELLOW
    Write-Host "  - finnhub_api_key.txt"
    Write-Host "  - alpha_vantage_api_key.txt"
    Write-Host "  - marketstack_api_key.txt"
    Write-Host "  - simfin_api_key.txt"
    Write-Host "  - iex_cloud_token.txt"
    Write-Host ""
    Write-Host "Social Media API Secrets:" -ForegroundColor $YELLOW
    Write-Host "  - twitter_bearer_token.txt"
    Write-Host ""
    Write-Host "Reddit API Secrets:" -ForegroundColor $YELLOW
    Write-Host "  - reddit_client_id.txt"
    Write-Host "  - reddit_client_secret.txt"
    Write-Host "  - reddit_refresh_token.txt"
    Write-Host "  - reddit_username.txt"
    Write-Host "  - reddit_password.txt"
    Write-Host "  - reddit_user_agent.txt"
    Write-Host "  - reddit_service_api_key.txt"
    Write-Host ""
    Write-Host "Database Secrets:" -ForegroundColor $YELLOW
    Write-Host "  - neo4j_user.txt"
    Write-Host "  - neo4j_password.txt"
    Write-Host "  - redis_password.txt"
    Write-Host "  - postgres_user.txt"
    Write-Host "  - postgres_password.txt"
    Write-Host "  - postgres_db.txt"
    Write-Host ""
    Write-Host "Government Data API Keys:" -ForegroundColor $YELLOW
    Write-Host "  - fred_api_key.txt"
    Write-Host "  - bls_api_key.txt"
    Write-Host ""
    Write-Host "LM Studio Configuration:" -ForegroundColor $YELLOW
    Write-Host "  - local_lmstudio_base_url.txt"
    Write-Host "  - local_lmstudio_api_key.txt"
    Write-Host "  - remote_lmstudio_base_url.txt"
    Write-Host "  - remote_lmstudio_api_key.txt"
    Write-Host ""
    Write-Host "Zep Service Configuration:" -ForegroundColor $YELLOW
    Write-Host "  - zep_api_key.txt"
    Write-Host ""
}

# Function to clean secrets
function Clear-Secrets {
    Write-Warning "This will remove all secrets files in $SECRETS_DIR"
    $response = Read-Host "Are you sure? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        if (Test-Path $SECRETS_DIR) {
            Remove-Item (Join-Path $SECRETS_DIR "*") -Force
            Write-Success "All secrets files removed"
        } else {
            Write-Warning "Secrets directory does not exist"
        }
    } else {
        Write-Status "Operation cancelled"
    }
}

# Main script logic
if ($Help) {
    Show-Usage
} elseif ($List) {
    Show-SecretsList
} elseif ($Clean) {
    Clear-Secrets
} else {
    Invoke-SecretsMigration
}