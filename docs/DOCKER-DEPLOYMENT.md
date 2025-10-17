# Docker Deployment Guide

## Consolidated Architecture

All services are now managed through a single `docker-compose.yml` file in the project root.

## Quick Start

```bash
# Start all core services
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

## Service Profiles

### Core Services (Default)
- PostgreSQL database
- Redis cache
- Neo4j knowledge graph
- Zep Graphiti memory service
- News aggregator
- Government data service
- Web API and frontend
- Trading agents CLI

### Optional Profiles

```bash
# Include Reddit service
docker compose --profile reddit up -d

# Include local Docker registry
docker compose --profile registry up -d
```

## Individual Services

```bash
# Start specific services
docker compose up postgresql redis neo4j -d

# Web interface only
docker compose up web-frontend web-api -d

# Trading agents only (requires databases)
docker compose up trading-agents -d
```

## Configuration

- Main config: `.env.local` (copy from `.env.example`) - for non-sensitive settings
- Docker secrets: `./docker/secrets/` directory - for API keys and passwords
- Development overrides: `docker-compose.override.yml`

### Setting up Secrets

**Option 1: Migration Script (Recommended)**
```bash
# Migrate from existing .env.local
./docker/secrets/migrate-secrets.sh

# Or on Windows
.\docker\secrets\migrate-secrets.ps1
```

**Option 2: Manual Setup**
```bash
# Edit each secret file with your actual API keys
# See docker/secrets/.env.example for complete list
nano docker/secrets/openai_api_key.txt
nano docker/secrets/postgres_password.txt
# ... etc
```

## Monitoring

```bash
# Service health
docker compose ps

# Resource usage
docker stats

# Service logs
docker compose logs [service-name]
```

## Troubleshooting

```bash
# Rebuild services
docker compose build --no-cache

# Reset volumes
docker compose down -v
docker compose up -d

# Clean restart
docker compose down
docker system prune -f
docker compose up -d
```