#!/bin/bash

# Trading Agents Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is required but not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is required but not installed"
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is required but not installed"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is required but not installed"
    fi
    
    success "All prerequisites are installed"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        if [ -f ".env.template" ]; then
            log "Creating .env file from template..."
            cp .env.template .env
            warning "Please edit .env file with your API keys before continuing"
            warning "Run: nano .env or your preferred editor"
            read -p "Press Enter after you've configured your .env file..."
        else
            error ".env.template not found. Cannot create environment configuration."
        fi
    fi
    
    # Create necessary directories
    mkdir -p data logs config
    
    success "Environment setup completed"
}

# Build application
build_application() {
    log "Building application..."
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --only=production
    
    # Build TypeScript
    log "Building TypeScript..."
    npm run build
    
    # Run tests
    log "Running tests..."
    npm test
    
    success "Application built successfully"
}

# Build Docker image
build_docker_image() {
    log "Building Docker image..."
    
    # Build the image
    docker build -t trading-agents:latest .
    
    # Tag with version if provided
    if [ ! -z "$VERSION" ]; then
        docker tag trading-agents:latest trading-agents:$VERSION
        log "Tagged image with version: $VERSION"
    fi
    
    success "Docker image built successfully"
}

# Deploy with Docker Compose
deploy_application() {
    log "Deploying application..."
    
    # Stop existing containers
    docker-compose down
    
    # Deploy new version
    docker-compose up -d
    
    # Wait for health check
    log "Waiting for application to be healthy..."
    sleep 10
    
    # Check container status
    if docker-compose ps | grep -q "Up"; then
        success "Application deployed successfully"
    else
        error "Application deployment failed"
    fi
}

# Backup current deployment
backup_deployment() {
    if [ -d "backup" ]; then
        BACKUP_DIR="backup/$(date +'%Y%m%d_%H%M%S')"
        mkdir -p "$BACKUP_DIR"
        
        # Backup data and logs
        if [ -d "data" ]; then
            cp -r data "$BACKUP_DIR/"
        fi
        
        if [ -d "logs" ]; then
            cp -r logs "$BACKUP_DIR/"
        fi
        
        # Backup configuration
        if [ -f ".env" ]; then
            cp .env "$BACKUP_DIR/"
        fi
        
        log "Backup created at: $BACKUP_DIR"
    fi
}

# Cleanup old backups
cleanup_backups() {
    if [ -d "backup" ]; then
        # Keep only last 5 backups
        ls -t backup/ | tail -n +6 | xargs -I {} rm -rf backup/{}
        log "Cleaned up old backups"
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check if container is running
    if docker-compose ps | grep -q "Up"; then
        success "Container is running"
    else
        error "Container is not running"
    fi
    
    # Additional health checks can be added here
    # For example: API endpoint checks, database connectivity, etc.
}

# Main deployment function
main() {
    log "Starting Trading Agents deployment..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --version)
                VERSION="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --backup)
                BACKUP=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --version VERSION    Tag image with specific version"
                echo "  --skip-tests         Skip running tests"
                echo "  --backup            Create backup before deployment"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    # Execute deployment steps
    check_prerequisites
    setup_environment
    
    if [ "$BACKUP" = true ]; then
        backup_deployment
    fi
    
    build_application
    build_docker_image
    deploy_application
    health_check
    cleanup_backups
    
    success "Deployment completed successfully!"
    log "You can now use the trading agents CLI with: docker exec -it trading-agents-cli node cli.js"
}

# Run main function
main "$@"