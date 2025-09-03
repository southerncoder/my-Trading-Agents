# Development Environment Setup Script for Zep-Graphiti (PowerShell)
# Helps developers create their local .env.local file securely

param(
    [switch]$Force = $false
)

function New-Password {
    param([int]$Length = 16)
    
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    $password = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $password += $chars[(Get-Random -Minimum 0 -Maximum $chars.Length)]
    }
    return $password
}

function Read-WithDefault {
    param(
        [string]$Prompt,
        [string]$Default = ""
    )
    
    if ($Default) {
        $response = Read-Host "$Prompt [$Default]"
        if ($response) { 
            return $response 
        } else { 
            return $Default 
        }
    } else {
        return Read-Host $Prompt
    }
}

# Change to script directory
Set-Location $PSScriptRoot

Write-Host "Zep-Graphiti Development Environment Setup" -ForegroundColor Cyan
Write-Host "=" * 50

$envFile = ".env.local"

if ((Test-Path $envFile) -and -not $Force) {
    $overwrite = Read-Host "WARNING: $envFile already exists. Overwrite? (y/N)"
    if ($overwrite.ToLower() -ne 'y') {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        exit
    }
}

Write-Host "`nPlease provide the following configuration:" -ForegroundColor Green

# Neo4j Configuration
Write-Host "`nNeo4j Database Configuration:" -ForegroundColor Blue
$neo4jPassword = Read-WithDefault "Neo4j password (leave empty to generate)" ""
if (-not $neo4jPassword) {
    $neo4jPassword = New-Password
    Write-Host "   Generated Neo4j password: $neo4jPassword" -ForegroundColor Yellow
}

# API Keys
Write-Host "`nAPI Key Configuration:" -ForegroundColor Blue
$useOpenAI = (Read-Host "Use OpenAI API? (y/N)").ToLower() -eq 'y'

if ($useOpenAI) {
    $openAIKey = Read-WithDefault "OpenAI API key (sk-...)" ""
    $embedderKey = $openAIKey  # Use same key for embeddings
} else {
    $openAIKey = ""
    $embedderKey = ""
}

# Local LLM Configuration
Write-Host "`nLocal LLM Configuration:" -ForegroundColor Blue
$useLocalLLM = (Read-Host "Use local LLM (LM Studio)? (Y/n)").ToLower() -ne 'n'

if ($useLocalLLM) {
    $lmStudioPort = Read-WithDefault "LM Studio port" "1234"
    $lmStudioUrl = "http://localhost:$lmStudioPort"
    $openAIBaseUrl = "$lmStudioUrl/v1"
} else {
    $lmStudioUrl = ""
    $openAIBaseUrl = ""
}

# Generate .env.local content
$envContent = @"
# Generated Development Environment Configuration
# Created by setup script - DO NOT commit to version control

# =====================================
# Neo4j Database Configuration  
# =====================================
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=$neo4jPassword

# For Docker environment:
# NEO4J_URI=bolt://neo4j:7687

# =====================================
# API Configuration
# =====================================
"@

if ($openAIKey) {
    $envContent += @"

OPENAI_API_KEY=$openAIKey
EMBEDDER_API_KEY=$embedderKey
OPENAI_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
"@
} else {
    $envContent += @"

# OPENAI_API_KEY=sk-your_openai_api_key_here
# EMBEDDER_API_KEY=sk-your_embedder_api_key_here
# OPENAI_MODEL=gpt-4o-mini
# EMBEDDING_MODEL=text-embedding-3-small
"@
}

if ($lmStudioUrl) {
    $envContent += @"

# =====================================
# Local LLM Configuration (LM Studio)
# =====================================
LM_STUDIO_URL=$lmStudioUrl
OPENAI_BASE_URL=$openAIBaseUrl

# For Docker environment:
# LM_STUDIO_URL=http://host.docker.internal:$lmStudioPort
# OPENAI_BASE_URL=http://host.docker.internal:$lmStudioPort/v1
"@
} else {
    $envContent += @"

# =====================================
# Local LLM Configuration (LM Studio)
# =====================================
# LM_STUDIO_URL=http://localhost:1234
# OPENAI_BASE_URL=http://localhost:1234/v1

# For Docker environment:
# LM_STUDIO_URL=http://host.docker.internal:1234
# OPENAI_BASE_URL=http://host.docker.internal:1234/v1
"@
}

$envContent += @"

# =====================================
# Development Settings
# =====================================
ENVIRONMENT=development
LOG_LEVEL=INFO
EMBEDDER_PROVIDER=openai
LLM_TEMPERATURE=0.1
SEMAPHORE_LIMIT=5
ZEP_EMBEDDER_DEBUG=false
ZEP_EMBEDDER_LOG_RAW=false
GRAPHITI_TELEMETRY_ENABLED=false

# =====================================
# Service Configuration
# =====================================
ZEP_SERVICE_HOST=localhost
ZEP_SERVICE_PORT=8000
ZEP_SERVICE_DEBUG=false
"@

# Write the file
try {
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "`nSUCCESS: Created $envFile" -ForegroundColor Green
    
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Review and customize the generated .env.local file"
    if (-not $openAIKey -and -not $lmStudioUrl) {
        Write-Host "2. Add your API keys or configure LM Studio"
    }
    Write-Host "3. Start the services: docker-compose up -d"
    Write-Host "4. Check service health: docker-compose ps"
    
    Write-Host "`nSecurity Notes:" -ForegroundColor Yellow
    Write-Host "   - $envFile is excluded from version control"
    Write-Host "   - Generated Neo4j password: $neo4jPassword"
    Write-Host "   - Store API keys securely and rotate them regularly"
    
} catch {
    Write-Host "`nERROR: Failed to create $envFile - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`nSetup completed successfully!" -ForegroundColor Green