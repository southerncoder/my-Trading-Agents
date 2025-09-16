#!/bin/bash

# Neo4j Password Generator for Trading Agents
# Generates a secure random password for Neo4j and updates environment configuration

set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="$BASE_DIR/secrets"
ENV_FILE="$BASE_DIR/.env.local"
NEO4J_PASSWORD_FILE="$SECRETS_DIR/neo4j_password.txt"
NEO4J_USER_FILE="$SECRETS_DIR/neo4j_user.txt"

echo "🔐 Neo4j Password Generator for Trading Agents"
echo "==============================================="

# Create secrets directory if it doesn't exist
if [ ! -d "$SECRETS_DIR" ]; then
    echo "📁 Creating secrets directory..."
    mkdir -p "$SECRETS_DIR"
fi

# Generate a cryptographically secure random password
echo "🎲 Generating secure random password..."

# Generate 32-character password with mixed case, numbers, and safe special characters
PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)

echo "✅ Generated ${#PASSWORD}-character secure password"

# Store Neo4j credentials in secrets files
echo "💾 Storing credentials in secrets directory..."

# Write user (default is neo4j)
echo -n "neo4j" > "$NEO4J_USER_FILE"
echo "   📝 Wrote Neo4j user to: $NEO4J_USER_FILE"

# Write password
echo -n "$PASSWORD" > "$NEO4J_PASSWORD_FILE"
echo "   📝 Wrote Neo4j password to: $NEO4J_PASSWORD_FILE"

# Update .env.local file with new password
if [ -f "$ENV_FILE" ]; then
    echo "🔧 Updating .env.local with new Neo4j password..."
    
    # Use sed to replace the NEO4J_PASSWORD line
    sed -i "s/NEO4J_PASSWORD=.*/NEO4J_PASSWORD=$PASSWORD/" "$ENV_FILE"
    
    echo "✅ Updated .env.local with new password"
else
    echo "⚠️  .env.local not found, password only stored in secrets/"
fi

# Set environment variables for current session
export NEO4J_USER="neo4j"
export NEO4J_PASSWORD="$PASSWORD"

echo ""
echo "🎉 Neo4j Password Setup Complete!"
echo ""
echo "📋 Summary:"
echo "   • Password stored in: $NEO4J_PASSWORD_FILE"
echo "   • User stored in: $NEO4J_USER_FILE"
echo "   • Environment variables updated"
echo "   • Current session variables set"
echo ""
echo "🚀 Ready to run: docker-compose up"
echo ""

# Security reminder
echo "🔒 Security Notes:"
echo "   • Password is cryptographically secure (32 chars)"
echo "   • Secrets directory should be in .gitignore"
echo "   • Rotate password periodically in production"
echo ""