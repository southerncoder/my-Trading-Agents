# Web Deployment Validation Script (PowerShell)
# Validates that all web services are running correctly

param(
    [switch]$SkipWebSocket = $false,
    [switch]$SkipAnalysis = $false,
    [int]$Timeout = 30
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"

Write-Host "🔍 Validating web deployment..." -ForegroundColor Cyan

# Function to check service health
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Checking $ServiceName... " -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $Timeout -UseBasicParsing
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "✓ OK" -ForegroundColor $Green
            return $true
        } else {
            Write-Host "✗ FAILED (Status: $($response.StatusCode))" -ForegroundColor $Red
            return $false
        }
    } catch {
        Write-Host "✗ FAILED ($($_.Exception.Message))" -ForegroundColor $Red
        return $false
    }
}

# Function to test API endpoint
function Test-ApiEndpoint {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [string]$Data = ""
    )
    
    Write-Host "Testing $Endpoint... " -NoNewline
    
    try {
        if ($Method -eq "POST" -and $Data) {
            $headers = @{ "Content-Type" = "application/json" }
            $response = Invoke-RestMethod -Uri $Endpoint -Method $Method -Body $Data -Headers $headers -TimeoutSec $Timeout
        } else {
            $response = Invoke-RestMethod -Uri $Endpoint -Method $Method -TimeoutSec $Timeout
        }
        
        if ($response.success -eq $true) {
            Write-Host "✓ OK" -ForegroundColor $Green
            return $response
        } else {
            Write-Host "✗ FAILED (success: false)" -ForegroundColor $Red
            Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor $Red
            return $null
        }
    } catch {
        Write-Host "✗ FAILED ($($_.Exception.Message))" -ForegroundColor $Red
        return $null
    }
}

# Function to check WebSocket connection (simplified)
function Test-WebSocketConnection {
    param([string]$WsUrl)
    
    Write-Host "Checking WebSocket connection... " -NoNewline
    
    if ($SkipWebSocket) {
        Write-Host "⚠ SKIPPED" -ForegroundColor $Yellow
        return
    }
    
    # For PowerShell, we'll just check if the HTTP endpoint is available
    # A full WebSocket test would require additional modules
    $httpUrl = $WsUrl -replace "ws://", "http://" -replace "/ws", "/api/health"
    
    try {
        $response = Invoke-WebRequest -Uri $httpUrl -Method Get -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ OK (HTTP endpoint reachable)" -ForegroundColor $Green
        } else {
            Write-Host "✗ FAILED" -ForegroundColor $Red
        }
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor $Red
    }
}

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..."
Start-Sleep -Seconds 10

# Check basic service health
Write-Host ""
Write-Host "🏥 Checking service health endpoints..." -ForegroundColor Cyan

$frontendHealthy = Test-ServiceHealth -ServiceName "Web Frontend" -Url "http://localhost:3000/health"
$apiHealthy = Test-ServiceHealth -ServiceName "Web API" -Url "http://localhost:3001/api/health"

if (-not $frontendHealthy -or -not $apiHealthy) {
    Write-Host "❌ Critical services are not healthy. Exiting." -ForegroundColor $Red
    exit 1
}

# Check WebSocket connection
Write-Host ""
Write-Host "🔌 Checking WebSocket connectivity..." -ForegroundColor Cyan
Test-WebSocketConnection -WsUrl "ws://localhost:3001/ws"

# Test API endpoints
Write-Host ""
Write-Host "🧪 Testing API endpoints..." -ForegroundColor Cyan

$endpoints = @(
    @{ Url = "http://localhost:3001/api/health"; Method = "GET" },
    @{ Url = "http://localhost:3001/api/symbols/search?q=AAPL"; Method = "GET" },
    @{ Url = "http://localhost:3001/api/analysis/validate"; Method = "POST"; Data = '{"symbol":"AAPL","type":"market"}' },
    @{ Url = "http://localhost:3001/api/analysis/history"; Method = "GET" },
    @{ Url = "http://localhost:3001/api/analysis/active"; Method = "GET" },
    @{ Url = "http://localhost:3001/api/analysis/stats"; Method = "GET" }
)

$allEndpointsHealthy = $true
foreach ($endpoint in $endpoints) {
    $result = Test-ApiEndpoint -Endpoint $endpoint.Url -Method $endpoint.Method -Data $endpoint.Data
    if (-not $result) {
        $allEndpointsHealthy = $false
    }
}

# Test analysis request (this will take longer)
if (-not $SkipAnalysis) {
    Write-Host ""
    Write-Host "🚀 Testing analysis request..." -ForegroundColor Cyan
    
    $analysisData = '{"symbol":"AAPL","type":"market","parameters":{}}'
    $analysisResponse = Test-ApiEndpoint -Endpoint "http://localhost:3001/api/analysis" -Method "POST" -Data $analysisData
    
    if ($analysisResponse -and $analysisResponse.data.id) {
        $analysisId = $analysisResponse.data.id
        Write-Host "Analysis ID: $analysisId" -ForegroundColor Cyan
        
        # Check analysis status
        $statusResponse = Test-ApiEndpoint -Endpoint "http://localhost:3001/api/analysis/$analysisId/status" -Method "GET"
        
        if ($statusResponse -and $statusResponse.data.status) {
            Write-Host "Analysis status: $($statusResponse.data.status)" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host ""
    Write-Host "🚀 Analysis test skipped" -ForegroundColor $Yellow
}

# Check Docker services
Write-Host ""
Write-Host "🐳 Checking Docker services..." -ForegroundColor Cyan

try {
    $dockerServices = docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>$null
    if ($dockerServices) {
        Write-Host "Docker service status:"
        Write-Host $dockerServices
    } else {
        Write-Host "⚠ No Docker services found or Docker not available" -ForegroundColor $Yellow
    }
} catch {
    Write-Host "⚠ Docker not available" -ForegroundColor $Yellow
}

# Final summary
Write-Host ""
Write-Host "✅ Web deployment validation completed!" -ForegroundColor $Green
Write-Host ""
Write-Host "🌐 Access points:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:3000"
Write-Host "  - API: http://localhost:3001/api"
Write-Host "  - WebSocket: ws://localhost:3001/ws"
Write-Host ""
Write-Host "📚 API Documentation:" -ForegroundColor Cyan
Write-Host "  - Health: GET /api/health"
Write-Host "  - Symbols: GET /api/symbols/search?q=SYMBOL"
Write-Host "  - Analysis: POST /api/analysis"
Write-Host "  - Status: GET /api/analysis/:id/status"
Write-Host "  - Results: GET /api/analysis/:id/result"
Write-Host ""

if ($allEndpointsHealthy) {
    Write-Host "🎉 All services are running correctly!" -ForegroundColor $Green
    exit 0
} else {
    Write-Host "⚠ Some services have issues. Check the output above." -ForegroundColor $Yellow
    exit 1
}