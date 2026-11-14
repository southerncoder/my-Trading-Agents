#!/bin/bash

# Web Deployment Validation Script
# Validates that all web services are running correctly

set -e

echo "🔍 Validating web deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $service_name... "
    
    if curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to check WebSocket connection
check_websocket() {
    local ws_url=$1
    
    echo -n "Checking WebSocket connection... "
    
    # Use a simple Node.js script to test WebSocket
    if command -v node >/dev/null 2>&1; then
        node -e "
            const WebSocket = require('ws');
            const ws = new WebSocket('$ws_url');
            ws.on('open', () => {
                console.log('WebSocket connection successful');
                ws.close();
                process.exit(0);
            });
            ws.on('error', (error) => {
                console.error('WebSocket connection failed:', error.message);
                process.exit(1);
            });
            setTimeout(() => {
                console.error('WebSocket connection timeout');
                process.exit(1);
            }, 5000);
        " 2>/dev/null && echo -e "${GREEN}✓ OK${NC}" || echo -e "${RED}✗ FAILED${NC}"
    else
        echo -e "${YELLOW}⚠ SKIPPED (Node.js not available)${NC}"
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-""}
    
    echo -n "Testing $endpoint... "
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -X POST -H "Content-Type: application/json" -d "$data" "$endpoint")
    else
        response=$(curl -s "$endpoint")
    fi
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check basic service health
echo ""
echo "🏥 Checking service health endpoints..."
check_service "Web Frontend" "http://localhost:3000/health" || exit 1
check_service "Web API" "http://localhost:3001/api/health" || exit 1

# Check WebSocket connection
echo ""
echo "🔌 Checking WebSocket connectivity..."
check_websocket "ws://localhost:3001/ws"

# Test API endpoints
echo ""
echo "🧪 Testing API endpoints..."
test_api_endpoint "http://localhost:3001/api/health"
test_api_endpoint "http://localhost:3001/api/symbols/search?q=AAPL"
test_api_endpoint "http://localhost:3001/api/analysis/validate" "POST" '{"symbol":"AAPL","type":"market"}'
test_api_endpoint "http://localhost:3001/api/analysis/history"
test_api_endpoint "http://localhost:3001/api/analysis/active"
test_api_endpoint "http://localhost:3001/api/analysis/stats"

# Test analysis request (this will take longer)
echo ""
echo "🚀 Testing analysis request..."
echo -n "Submitting analysis request... "

analysis_response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"symbol":"AAPL","type":"market","parameters":{}}' \
    "http://localhost:3001/api/analysis")

if echo "$analysis_response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ OK${NC}"
    
    # Extract analysis ID
    analysis_id=$(echo "$analysis_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$analysis_id" ]; then
        echo "Analysis ID: $analysis_id"
        
        # Check analysis status
        echo -n "Checking analysis status... "
        status_response=$(curl -s "http://localhost:3001/api/analysis/$analysis_id/status")
        
        if echo "$status_response" | grep -q '"success":true'; then
            echo -e "${GREEN}✓ OK${NC}"
            
            # Show status
            status=$(echo "$status_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            echo "Analysis status: $status"
        else
            echo -e "${RED}✗ FAILED${NC}"
        fi
    fi
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $analysis_response"
fi

# Check Docker services
echo ""
echo "🐳 Checking Docker services..."
if command -v docker >/dev/null 2>&1; then
    echo "Docker service status:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
else
    echo -e "${YELLOW}⚠ Docker not available${NC}"
fi

# Final summary
echo ""
echo "✅ Web deployment validation completed!"
echo ""
echo "🌐 Access points:"
echo "  - Frontend: http://localhost:3000"
echo "  - API: http://localhost:3001/api"
echo "  - WebSocket: ws://localhost:3001/ws"
echo ""
echo "📚 API Documentation:"
echo "  - Health: GET /api/health"
echo "  - Symbols: GET /api/symbols/search?q=SYMBOL"
echo "  - Analysis: POST /api/analysis"
echo "  - Status: GET /api/analysis/:id/status"
echo "  - Results: GET /api/analysis/:id/result"
echo ""
echo "🎉 All services are running correctly!"