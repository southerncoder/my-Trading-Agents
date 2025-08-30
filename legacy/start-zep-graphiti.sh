#!/bin/bash

# Zep Graphiti Memory Integration Startup Script
# This script starts the Neo4j database, Python Zep service, and runs tests

echo "🚀 Starting Zep Graphiti Memory Integration Setup..."

# Check if we're in the right directory
if [[ ! -d "py_zep" ]]; then
    echo "❌ Error: py_zep directory not found. Please run this script from the project root."
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Start Neo4j database
echo "📊 Starting Neo4j database..."
cd py_zep
if docker-compose up -d; then
    echo "✅ Neo4j database started"
else
    echo "❌ Failed to start Neo4j database"
    exit 1
fi

# Wait for Neo4j to be ready
echo "⏳ Waiting for Neo4j to be ready..."
sleep 10

# Start the Python Zep Graphiti service
echo "🐍 Starting Python Zep Graphiti service..."
if check_port 8080; then
    echo "⚠️  Port 8080 is already in use. Stopping existing service..."
    # Try to stop any existing service
    pkill -f "uvicorn.*zep_service.main"
    sleep 2
fi

# Start the service in the background
uv run uvicorn src.zep_service.main:app --host 0.0.0.0 --port 8080 --reload &
ZEP_PID=$!

# Wait for the service to start
echo "⏳ Waiting for Zep service to start..."
sleep 5

# Check if the service is running
if check_port 8080; then
    echo "✅ Python Zep Graphiti service started on port 8080"
else
    echo "❌ Failed to start Python Zep Graphiti service"
    exit 1
fi

# Test the service health
echo "🔍 Testing service health..."
cd ../js
if curl -s http://localhost:8080/health | grep -q '"status":"healthy"'; then
    echo "✅ Zep Graphiti service is healthy"
else
    echo "❌ Zep Graphiti service health check failed"
    exit 1
fi

# Run the TypeScript test
echo "🧪 Running Zep Graphiti memory tests..."
if npm run test:zep-graphiti 2>/dev/null || node --loader ts-node/esm tests/test-zep-graphiti-memory.ts; then
    echo "✅ All tests passed!"
else
    echo "❌ Tests failed"
fi

echo ""
echo "🎉 Zep Graphiti Memory Integration is ready!"
echo ""
echo "📋 Service Status:"
echo "   Neo4j Database: http://localhost:7474 (user: neo4j, password: [see .env])"
echo "   Zep API Service: http://localhost:8080"
echo "   Health Check: http://localhost:8080/health"
echo ""
echo "📝 To stop services:"
echo "   kill $ZEP_PID  # Stop Python service"
echo "   cd py_zep && docker-compose down  # Stop Neo4j"
echo ""
echo "🔧 To test manually:"
echo "   cd js && node --loader ts-node/esm tests/test-zep-graphiti-memory.ts"
echo ""