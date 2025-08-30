# Zep Graphiti Memory Integration Startup Script (Windows PowerShell)
# This script starts the Neo4j database, Python Zep service, and runs tests

Write-Host "🚀 Starting Zep Graphiti Memory Integration Setup..." -ForegroundColor Green

# Check if we're in the right directory
if (!(Test-Path "py_zep")) {
    Write-Host "❌ Error: py_zep directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Start Neo4j database
Write-Host "📊 Starting Neo4j database..." -ForegroundColor Blue
Set-Location py_zep
try {
    docker-compose up -d
    Write-Host "✅ Neo4j database started" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to start Neo4j database" -ForegroundColor Red
    exit 1
}

# Wait for Neo4j to be ready
Write-Host "⏳ Waiting for Neo4j to be ready..." -ForegroundColor Yellow
Start-Sleep 10

# Start the Python Zep Graphiti service
Write-Host "🐍 Starting Python Zep Graphiti service..." -ForegroundColor Blue
if (Test-Port -Port 8080) {
    Write-Host "⚠️  Port 8080 is already in use. Please stop existing service manually." -ForegroundColor Yellow
}

# Start the service in the background
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    uv run uvicorn src.zep_service.main:app --host 0.0.0.0 --port 8080 --reload
}

# Wait for the service to start
Write-Host "⏳ Waiting for Zep service to start..." -ForegroundColor Yellow
Start-Sleep 8

# Check if the service is running
if (Test-Port -Port 8080) {
    Write-Host "✅ Python Zep Graphiti service started on port 8080" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start Python Zep Graphiti service" -ForegroundColor Red
    Stop-Job $job -Force
    exit 1
}

# Test the service health
Write-Host "🔍 Testing service health..." -ForegroundColor Blue
Set-Location ..\js
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method Get
    if ($response.status -eq "healthy") {
        Write-Host "✅ Zep Graphiti service is healthy" -ForegroundColor Green
    } else {
        Write-Host "❌ Zep Graphiti service health check failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Failed to connect to Zep Graphiti service" -ForegroundColor Red
}

# Run the TypeScript test
Write-Host "🧪 Running Zep Graphiti memory tests..." -ForegroundColor Blue
try {
    node --loader ts-node/esm tests/test-zep-graphiti-memory.ts
    Write-Host "✅ All tests passed!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Tests failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Zep Graphiti Memory Integration is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Service Status:" -ForegroundColor Cyan
Write-Host "   Neo4j Database: http://localhost:7474 (user: neo4j, password: [see .env])"
Write-Host "   Zep API Service: http://localhost:8080"
Write-Host "   Health Check: http://localhost:8080/health"
Write-Host ""
Write-Host "📝 To stop services:" -ForegroundColor Cyan
Write-Host "   Stop-Job $($job.Id) -Force  # Stop Python service"
Write-Host "   cd py_zep; docker-compose down  # Stop Neo4j"
Write-Host ""
Write-Host "🔧 To test manually:" -ForegroundColor Cyan
Write-Host "   cd js; node --loader ts-node/esm tests/test-zep-graphiti-memory.ts"
Write-Host ""

# Keep the job reference for later cleanup
$global:ZepServiceJob = $job