#!/bin/bash

# Trading Agents Secure Startup Script
# Generates secure Neo4j password and starts all services via docker-compose

set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse command line arguments
RECREATE=false
BUILD=false
DETACHED=false
SERVICE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --recreate)
            RECREATE=true
            shift
            ;;
        --build)
            BUILD=true
            shift
            ;;
        --detached|-d)
            DETACHED=true
            shift
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--recreate] [--build] [--detached|-d] [--service SERVICE_NAME]"
            exit 1
            ;;
    esac
done

echo "🚀 Trading Agents Secure Startup"
echo "================================"

# Step 1: Generate Neo4j password
echo "Step 1: Generating secure Neo4j credentials..."
if "$BASE_DIR/generate-neo4j-password.sh"; then
    echo "✅ Credentials generated successfully"
else
    echo "❌ Failed to generate Neo4j credentials"
    exit 1
fi

echo ""

# Step 2: Build docker-compose command
echo "Step 2: Starting Docker services..."

DOCKER_CMD=("docker-compose" "up")

if [ "$RECREATE" = true ]; then
    DOCKER_CMD+=("--force-recreate")
    echo "   🔄 Force recreating containers"
fi

if [ "$BUILD" = true ]; then
    DOCKER_CMD+=("--build")
    echo "   🔨 Building images"
fi

if [ "$DETACHED" = true ]; then
    DOCKER_CMD+=("-d")
    echo "   🔄 Running in detached mode"
fi

if [ -n "$SERVICE" ]; then
    DOCKER_CMD+=("$SERVICE")
    echo "   🎯 Starting specific service: $SERVICE"
fi

# Step 3: Start services
echo "🐳 Executing: ${DOCKER_CMD[*]}"
if "${DOCKER_CMD[@]}"; then
    echo ""
    echo "🎉 Services started successfully!"
    echo ""
    echo "📋 Available endpoints:"
    echo "   • Neo4j Browser: http://localhost:7474"
    echo "   • Zep Graphiti API: http://localhost:8000"
    echo "   • API Documentation: http://localhost:8000/docs"
    echo ""
else
    echo "❌ Docker compose failed"
    exit 1
fi

# Step 4: Health check information
if [ "$DETACHED" != true ]; then
    echo "💡 Tip: Services include health checks. Wait for all to be healthy before testing."
    echo "💡 Use 'docker-compose ps' to check service status."
fi