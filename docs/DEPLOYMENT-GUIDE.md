# Trading System Enhancement - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the enhanced Trading Agents system in production environments. The system includes backtesting, risk management, strategy ensemble, position sizing, data resilience, performance monitoring, and government data integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Service Configuration](#service-configuration)
5. [Docker Deployment](#docker-deployment)
6. [Production Deployment](#production-deployment)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)

---

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 4 cores, 2.4 GHz
- RAM: 8 GB
- Storage: 50 GB SSD
- Network: 100 Mbps

**Recommended Requirements:**
- CPU: 8 cores, 3.0 GHz
- RAM: 16 GB
- Storage: 200 GB NVMe SSD
- Network: 1 Gbps

### Software Dependencies

- **Node.js**: 22.0.0 or higher
- **Docker**: 24.0.0 or higher
- **Docker Compose**: 2.20.0 or higher
- **PostgreSQL**: 16.0 or higher (with pgvector extension)
- **Redis**: 7.4 or higher
- **Neo4j**: 5.26.0 or higher

### API Keys and Credentials

Obtain the following API keys before deployment:

- **OpenAI API Key** (required for LLM operations)
- **Anthropic API Key** (optional, for Claude models)
- **Google API Key** (optional, for Gemini models)
- **FRED API Key** (required for economic data)
- **BLS API Key** (optional, for labor statistics)
- **Alpha Vantage API Key** (optional, for market data)
- **MarketStack API Key** (optional, for market data)
- **NewsAPI Key** (optional, for news data)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/trading-agents.git
cd trading-agents
```

### 2. Environment Configuration

Create the main environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Core Configuration
NODE_ENV=production
LOG_LEVEL=info

# Database Configuration
POSTGRES_HOST=postgresql
POSTGRES_PORT=5432
POSTGRES_DB=trading_agents
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_SSL=true
POSTGRES_POOL_SIZE=20
POSTGRES_CONNECTION_TIMEOUT=30000
POSTGRES_IDLE_TIMEOUT=10000

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Neo4j Configuration
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password

# LLM Provider Configuration
DEFAULT_LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key

# Government Data APIs
FRED_API_KEY=your_fred_api_key
BLS_API_KEY=your_bls_api_key

# Market Data APIs
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
MARKETSTACK_API_KEY=your_marketstack_key

# News APIs
NEWS_API_KEY=your_news_api_key
BRAVE_NEWS_API_KEY=your_brave_news_key

# Enhanced Features
PGVECTOR_ENABLED=true
PGVECTOR_EMBEDDING_DIMENSIONS=1536
PGVECTOR_SIMILARITY_THRESHOLD=0.8

# Storage Strategy
STORAGE_PERFORMANCE_METRICS=postgresql
STORAGE_BACKTEST_RESULTS=postgresql
STORAGE_AGENT_MEMORY=postgresql

# Government Data Service
GOVERNMENT_DATA_URL=http://government-data:3005
GOVERNMENT_DATA_ENABLED=true
```

### 3. Docker Secrets Setup

Create Docker secrets directory and files:

```bash
mkdir -p docker/secrets

# Create secret files (replace with your actual values)
echo "your_openai_api_key" > docker/secrets/openai_api_key.txt
echo "your_anthropic_api_key" > docker/secrets/anthropic_api_key.txt
echo "your_postgres_password" > docker/secrets/postgres_password.txt
echo "your_redis_password" > docker/secrets/redis_password.txt
echo "your_neo4j_password" > docker/secrets/neo4j_password.txt
echo "your_fred_api_key" > docker/secrets/fred_api_key.txt
echo "your_bls_api_key" > docker/secrets/bls_api_key.txt

# Set appropriate permissions
chmod 600 docker/secrets/*.txt
```

---

## Database Setup

### 1. PostgreSQL with pgvector

The system automatically sets up PostgreSQL with pgvector extension through Docker Compose. The database schema is created through migrations.

### 2. Run Database Migrations

After starting the services, run the database migrations:

```bash
# Using Docker Compose
docker-compose exec trading-agents npm run db:migrate

# Or using the CLI directly
npm run db:migrate
```

### 3. Verify Database Setup

Check that all tables and indexes are created:

```bash
# Connect to PostgreSQL
docker-compose exec postgresql psql -U postgres -d trading_agents

# List tables
\dt

# Check extensions
\dx

# Exit
\q
```

Expected tables:
- `episodic_memory`
- `semantic_memory`
- `working_memory`
- `procedural_memory`
- `performance_metrics`
- `backtest_results`
- `trade_history`
- `system_health`
- `alert_history`
- `schema_migrations`

---

## Service Configuration

### 1. Trading Agents Configuration

Create or update `services/trading-agents/config.json`:

```json
{
  "version": "2.0.0",
  "analysis": {
    "defaultTicker": "AAPL",
    "defaultAnalysts": ["market", "social", "news", "fundamentals"],
    "models": {
      "quickThinking": {
        "provider": "openai",
        "model": "gpt-4o-mini"
      },
      "deepThinking": {
        "provider": "openai",
        "model": "gpt-4o"
      }
    }
  },
  "flow": {
    "maxDebateRounds": 2,
    "maxRiskDiscussRounds": 2,
    "maxRecursionLimit": 100,
    "enableOnlineTools": true,
    "enableAdvancedMemory": true,
    "enableLearningSystem": true,
    "runMode": "standard",
    "timeout": 300000,
    "parallelism": 4,
    "maxTokens": 4000,
    "temperature": 0.7
  },
  "logging": {
    "defaultLogLevel": "info",
    "enableFileLogging": true,
    "enableConsoleLogging": true,
    "enableVerboseLogging": false
  },
  "dataSources": {
    "yahooFinance": {
      "enabled": true,
      "cacheTimeout": 15
    },
    "reddit": {
      "enabled": false,
      "cacheTimeout": 30
    },
    "googleNews": {
      "enabled": true,
      "cacheTimeout": 10
    }
  },
  "performance": {
    "connectionPool": {
      "maxConnections": 20,
      "idleTimeout": 30000,
      "acquireTimeout": 60000
    },
    "cache": {
      "maxSize": 1000,
      "ttl": 3600,
      "strategy": "lru"
    }
  }
}
```

### 2. Government Data Service Configuration

The government data service is automatically configured through environment variables and Docker secrets.

---

## Docker Deployment

### 1. Build and Start Services

```bash
# Build all services
docker-compose build

# Start core services (without Reddit)
docker-compose up -d

# Or start with Reddit service
docker-compose --profile reddit up -d
```

### 2. Verify Service Health

Check that all services are running:

```bash
# Check service status
docker-compose ps

# Check service logs
docker-compose logs -f trading-agents
docker-compose logs -f postgresql
docker-compose logs -f government-data
```

### 3. Run Health Checks

```bash
# Check database connectivity
docker-compose exec trading-agents npm run db:health

# Check government data service
curl http://localhost:3005/health

# Check main application
docker-compose exec trading-agents npm run health-check
```

---

## Production Deployment

### 1. Production Environment Setup

For production deployment, consider using:

- **Container Orchestration**: Kubernetes or Docker Swarm
- **Load Balancer**: NGINX or HAProxy
- **SSL/TLS**: Let's Encrypt or commercial certificates
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack or similar

### 2. Kubernetes Deployment (Optional)

Create Kubernetes manifests:

```yaml
# postgresql-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgresql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgresql
        image: pgvector/pgvector:pg16
        env:
        - name: POSTGRES_DB
          value: "trading_agents"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
```

### 3. Production Configuration

Update production-specific settings:

```bash
# Production environment variables
NODE_ENV=production
LOG_LEVEL=warn
POSTGRES_SSL=true
POSTGRES_POOL_SIZE=50
REDIS_PASSWORD=strong_redis_password

# Enable production optimizations
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ADVANCED_CACHING=true
ENABLE_CONNECTION_POOLING=true
```

---

## Monitoring and Maintenance

### 1. Performance Monitoring

The system includes built-in performance monitoring:

```typescript
// Access performance metrics
const graph = new EnhancedTradingAgentsGraph(config);
const status = graph.getSystemStatus();
console.log('System Status:', status);
```

### 2. Database Maintenance

Set up automated database maintenance:

```bash
# Add to crontab for daily cleanup
0 2 * * * docker-compose exec trading-agents npm run db:cleanup

# Weekly optimization
0 3 * * 0 docker-compose exec trading-agents npm run db:optimize

# Monthly backup
0 1 1 * * docker-compose exec postgresql pg_dump -U postgres trading_agents > backup_$(date +%Y%m%d).sql
```

### 3. Log Management

Configure log rotation:

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/trading-agents << EOF
/path/to/trading-agents/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        docker-compose restart trading-agents
    endscript
}
EOF
```

### 4. Health Monitoring

Set up health check endpoints:

```bash
# System health check
curl http://localhost:8080/health

# Database health check
curl http://localhost:8080/health/database

# Service dependencies health
curl http://localhost:8080/health/dependencies
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgresql

# Verify connection settings
docker-compose exec trading-agents npm run db:test-connection

# Check network connectivity
docker-compose exec trading-agents ping postgresql
```

#### 2. Memory Issues

```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  trading-agents:
    deploy:
      resources:
        limits:
          memory: 2G
```

#### 3. API Rate Limits

```bash
# Check API usage
docker-compose logs trading-agents | grep "rate limit"

# Implement exponential backoff
# (Already implemented in the system)
```

#### 4. Performance Issues

```bash
# Check system performance
docker-compose exec trading-agents npm run performance:check

# Optimize database
docker-compose exec trading-agents npm run db:optimize

# Clear caches
docker-compose exec redis redis-cli FLUSHALL
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Set debug environment
LOG_LEVEL=debug
DEBUG=trading-agents:*

# Restart services
docker-compose restart trading-agents
```

---

## Security Considerations

### 1. Network Security

- Use Docker networks to isolate services
- Implement firewall rules for external access
- Use SSL/TLS for all external communications

### 2. Data Security

- Encrypt sensitive data at rest
- Use strong passwords and API keys
- Implement proper access controls

### 3. API Security

- Implement rate limiting
- Use API key authentication
- Validate all input data

### 4. Container Security

```bash
# Scan images for vulnerabilities
docker scan trading-agents:latest

# Use non-root users in containers
# (Already implemented in Dockerfiles)

# Keep base images updated
docker-compose pull
docker-compose build --no-cache
```

### 5. Backup and Recovery

```bash
# Database backup
docker-compose exec postgresql pg_dump -U postgres trading_agents > backup.sql

# Configuration backup
tar -czf config-backup.tar.gz .env.local docker/secrets/

# Restore database
docker-compose exec -T postgresql psql -U postgres trading_agents < backup.sql
```

---

## Performance Tuning

### 1. Database Optimization

```sql
-- Optimize PostgreSQL settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

### 2. Application Optimization

```bash
# Enable production optimizations
NODE_ENV=production
ENABLE_CLUSTERING=true
CLUSTER_WORKERS=4

# Optimize memory usage
NODE_OPTIONS="--max-old-space-size=4096"
```

### 3. Caching Strategy

```bash
# Redis optimization
REDIS_MAXMEMORY=512mb
REDIS_MAXMEMORY_POLICY=allkeys-lru

# Application caching
ENABLE_INTELLIGENT_CACHING=true
CACHE_TTL=3600
CACHE_MAX_SIZE=1000
```

---

## Scaling Considerations

### 1. Horizontal Scaling

- Use multiple trading-agents instances behind a load balancer
- Implement session affinity for stateful operations
- Use Redis for shared caching across instances

### 2. Database Scaling

- Implement read replicas for PostgreSQL
- Use connection pooling (PgBouncer)
- Consider database sharding for large datasets

### 3. Monitoring at Scale

- Implement distributed tracing
- Use centralized logging
- Set up automated alerting

---

## Support and Maintenance

### Regular Maintenance Tasks

1. **Daily**: Check system health and logs
2. **Weekly**: Review performance metrics and optimize
3. **Monthly**: Update dependencies and security patches
4. **Quarterly**: Review and update configuration

### Getting Help

- Check the troubleshooting section
- Review system logs for error patterns
- Use the built-in health check endpoints
- Monitor performance metrics dashboard

---

*This deployment guide is maintained and updated with each system release.*