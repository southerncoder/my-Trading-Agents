#!/bin/bash
# =====================================================================================
# Trading Agents - Docker Secrets Migration Script
# =====================================================================================
# This script migrates environment variables from .env.local to Docker secrets files
# Run this script to populate Docker secrets from your environment configuration
#
# Usage:
#   ./docker/secrets/migrate-secrets.sh
#   or
#   bash docker/secrets/migrate-secrets.sh
# =====================================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"
SECRETS_DIR="$PROJECT_ROOT/docker/secrets"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create secret file
create_secret_file() {
    local env_var="$1"
    local secret_file="$2"
    local description="$3"

    # Check if environment variable exists in .env.local
    if grep -q "^${env_var}=" "$ENV_FILE" 2>/dev/null; then
        local value=$(grep "^${env_var}=" "$ENV_FILE" | cut -d '=' -f2- | sed 's/^"//' | sed 's/"$//')

        if [ -n "$value" ] && [ "$value" != "your_${env_var,,}_here" ]; then
            echo -n "$value" > "$secret_file"
            print_success "Created $description secret: $secret_file"
        else
            print_warning "Skipped $description (empty or placeholder value)"
        fi
    else
        print_warning "Environment variable $env_var not found in .env.local"
    fi
}

# Main migration function
migrate_secrets() {
    print_status "Starting Docker secrets migration..."
    print_status "Project root: $PROJECT_ROOT"
    print_status "Environment file: $ENV_FILE"
    print_status "Secrets directory: $SECRETS_DIR"

    # Check if .env.local exists
    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env.local file not found at: $ENV_FILE"
        print_error "Please ensure .env.local exists with your configuration"
        exit 1
    fi

    # Create secrets directory if it doesn't exist
    mkdir -p "$SECRETS_DIR"

    print_status "Migrating secrets from .env.local to Docker secrets files..."

    # AI Provider Secrets
    create_secret_file "OPENAI_API_KEY" "$SECRETS_DIR/openai_api_key.txt" "OpenAI API Key"
    create_secret_file "ANTHROPIC_API_KEY" "$SECRETS_DIR/anthropic_api_key.txt" "Anthropic API Key"
    create_secret_file "GOOGLE_API_KEY" "$SECRETS_DIR/google_api_key.txt" "Google API Key"
    create_secret_file "EMBEDDER_API_KEY" "$SECRETS_DIR/embedder_api_key.txt" "Embedder API Key"

    # News Provider Secrets
    create_secret_file "TAVILY_API_KEY" "$SECRETS_DIR/tavily_api_key.txt" "Tavily API Key"
    create_secret_file "BRAVE_NEWS_API_KEY" "$SECRETS_DIR/brave_news_api_key.txt" "Brave News API Key"
    create_secret_file "NEWS_API_KEY" "$SECRETS_DIR/news_api_key.txt" "News API Key"
    create_secret_file "YAHOO_FINANCE_API_KEY" "$SECRETS_DIR/yahoo_finance_api_key.txt" "Yahoo Finance API Key"

    # Market Data Provider Secrets
    create_secret_file "FINNHUB_API_KEY" "$SECRETS_DIR/finnhub_api_key.txt" "Finnhub API Key"
    create_secret_file "ALPHA_VANTAGE_API_KEY" "$SECRETS_DIR/alpha_vantage_api_key.txt" "Alpha Vantage API Key"
    create_secret_file "MARKETSTACK_API_KEY" "$SECRETS_DIR/marketstack_api_key.txt" "Marketstack API Key"

    # Reddit API Secrets
    create_secret_file "REDDIT_CLIENT_ID" "$SECRETS_DIR/reddit_client_id.txt" "Reddit Client ID"
    create_secret_file "REDDIT_CLIENT_SECRET" "$SECRETS_DIR/reddit_client_secret.txt" "Reddit Client Secret"
    create_secret_file "REDDIT_REFRESH_TOKEN" "$SECRETS_DIR/reddit_refresh_token.txt" "Reddit Refresh Token"
    create_secret_file "REDDIT_USERNAME" "$SECRETS_DIR/reddit_username.txt" "Reddit Username"
    create_secret_file "REDDIT_PASSWORD" "$SECRETS_DIR/reddit_password.txt" "Reddit Password"
    create_secret_file "REDDIT_USER_AGENT" "$SECRETS_DIR/reddit_user_agent.txt" "Reddit User Agent"
    create_secret_file "REDDIT_SERVICE_API_KEY" "$SECRETS_DIR/reddit_service_api_key.txt" "Reddit Service API Key"

    # Database Secrets
    create_secret_file "NEO4J_USER" "$SECRETS_DIR/neo4j_user.txt" "Neo4j Username"
    create_secret_file "NEO4J_PASSWORD" "$SECRETS_DIR/neo4j_password.txt" "Neo4j Password"

    # LM Studio Configuration
    create_secret_file "LM_STUDIO_BASE_URL" "$SECRETS_DIR/lm_studio_url.txt" "LM Studio Base URL"
    create_secret_file "REMOTE_LM_STUDIO_BASE_URL" "$SECRETS_DIR/lm_studio_remote_url.txt" "LM Studio Remote URL"

    print_success "Docker secrets migration completed!"
    print_status "Created secrets files in: $SECRETS_DIR"
    print_status "You can now run: docker-compose up"
}

# Function to show usage
show_usage() {
    echo "Trading Agents - Docker Secrets Migration Script"
    echo ""
    echo "This script migrates environment variables from .env.local to Docker secrets files."
    echo ""
    echo "Usage:"
    echo "  $0                    # Run the migration"
    echo "  $0 --help            # Show this help"
    echo "  $0 --list            # List all secrets that will be created"
    echo "  $0 --clean           # Remove all secrets files"
    echo ""
    echo "Requirements:"
    echo "  - .env.local file must exist in project root"
    echo "  - Environment variables must be set in .env.local"
    echo ""
}

# Function to list secrets
list_secrets() {
    echo "The following secrets will be created:"
    echo ""
    echo "AI Provider Secrets:"
    echo "  - openai_api_key.txt"
    echo "  - anthropic_api_key.txt"
    echo "  - google_api_key.txt"
    echo "  - embedder_api_key.txt"
    echo ""
    echo "News Provider Secrets:"
    echo "  - tavily_api_key.txt"
    echo "  - brave_news_api_key.txt"
    echo "  - news_api_key.txt"
    echo "  - yahoo_finance_api_key.txt"
    echo ""
    echo "Market Data Provider Secrets:"
    echo "  - finnhub_api_key.txt"
    echo "  - alpha_vantage_api_key.txt"
    echo "  - marketstack_api_key.txt"
    echo ""
    echo "Reddit API Secrets:"
    echo "  - reddit_client_id.txt"
    echo "  - reddit_client_secret.txt"
    echo "  - reddit_refresh_token.txt"
    echo "  - reddit_username.txt"
    echo "  - reddit_password.txt"
    echo "  - reddit_user_agent.txt"
    echo "  - reddit_service_api_key.txt"
    echo ""
    echo "Database Secrets:"
    echo "  - neo4j_user.txt"
    echo "  - neo4j_password.txt"
    echo ""
    echo "LM Studio Configuration:"
    echo "  - lm_studio_url.txt"
    echo "  - lm_studio_remote_url.txt"
    echo ""
}

# Function to clean secrets
clean_secrets() {
    print_warning "This will remove all secrets files in $SECRETS_DIR"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -d "$SECRETS_DIR" ]; then
            rm -rf "$SECRETS_DIR"/*
            print_success "All secrets files removed"
        else
            print_warning "Secrets directory does not exist"
        fi
    else
        print_status "Operation cancelled"
    fi
}

# Main script logic
case "${1:-}" in
    --help|-h)
        show_usage
        ;;
    --list|-l)
        list_secrets
        ;;
    --clean|-c)
        clean_secrets
        ;;
    "")
        migrate_secrets
        ;;
    *)
        print_error "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac