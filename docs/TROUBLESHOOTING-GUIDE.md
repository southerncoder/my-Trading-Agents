# Trading System Enhancement - Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for the enhanced Trading Agents system. It covers common issues, diagnostic procedures, and solutions for all system components.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Dependency and Compatibility Issues](#dependency-and-compatibility-issues)
3. [Database Issues](#database-issues)
4. [Memory Management Issues](#memory-management-issues)
5. [Performance Issues](#performance-issues)
6. [API and Data Provider Issues](#api-and-data-provider-issues)
7. [Docker and Container Issues](#docker-and-container-issues)
8. [Configuration Issues](#configuration-issues)
9. [Logging and Monitoring](#logging-and-monitoring)
10. [Emergency Procedures](#emergency-procedures)

---

## Dependency and Compatibility Issues

### Recent Dependency Updates (December 2024)

The system has been updated with the latest stable versions of all major dependencies. If you encounter issues after updating, refer to the [Dependency Update Migration Guide](DEPENDENCY-UPDATE-MIGRATION-GUIDE.md).

#### Common Issues After Dependency Updates

**Winston Logging Errors**
```
Error: Argument of type '{ symbol: string; ... }' is not assignable to parameter of type 'string'
```

**Solution**: This is a known compatibility issue with Winston v3.18.3. The logging calls need to be updated to match the new API. See the migration guide for details.

**Express v5 Compatibility**
```
Error: Cannot read property 'use' of undefined
```

**Solution**: Express was updated from v4 to v5. Review middleware setup and update according to Express v5 migration guide.

**Zep.js v2 API Changes**
```
Error: Method 'addMemory' does not exist
```

**Solution**: Zep.js was updated from v0.10.0 to v2.0.2. Review the new API and update memory system integration code.

#### Dependency Rollback

If you need to rollback dependencies:

```bash
# Backup current package.json
cp package.json package.json.backup

# Restore previous versions (example)
npm install winston@3.17.0 @getzep/zep-js@0.10.0 express@4.21.1

# Or restore from git
git checkout HEAD~1 -- package.json
npm install
```

#### Checking Dependency Versions

```bash
# Check current versions
npm list --depth=0

# Check for outdated packages
npm outdated

# Security audit
npm audit
```

---

## Quick Diagnostics

### System Health Check

Run the comprehensive system health check:

```bash
# Check overall system status
docker-compose exec trading-agents npm run health-check

# Check individual components
docker-compose exec trading-agents npm run health-check:database
docker-compose exec trading-agents npm run health-check:memory
docker-compose exec trading-agents npm run health-check:apis
```

### Service Status Check

```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs -f trading-agents
docker-compose logs -f postgresql
docker-compose logs -f government-data
docker-compose logs -f redis
docker-compose logs -f neo4j
```

### Quick Fix Commands

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart trading-agents

# Rebuild and restart
docker-compose up --build -d

# Clean restart (removes volumes)
docker-compose down -v && docker-compose up -d
```

---

## Database Issues

### PostgreSQL Connection Issues

#### Symptoms
- "Connection refused" errors
- "Too many connections" errors
- Slow database queries
- Migration failures

#### Diagnostics

```bash
# Check PostgreSQL status
docker-compose exec postgresql pg_isready -U postgres

# Check connection count
docker-compose exec postgresql psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
docker-compose exec postgresql psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('trading_agents'));"

# Check active queries
docker-compose exec postgresql psql -U postgres -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"
```

#### Solutions

1. **Connection Pool Exhaustion**
```bash
# Increase pool size in .env.local
POSTGRES_POOL_SIZE=50

# Restart services
docker-compose restart trading-agents
```

2. **Database Lock Issues**
```sql
-- Connect to database
docker-compose exec postgresql psql -U postgres trading_agents

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Kill blocking queries (use with caution)
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND pid != pg_backend_pid();
```

3. **Migration Issues**
```bash
# Check migration status
docker-compose exec trading-agents npm run db:migration:status

# Rollback last migration
docker-compose exec trading-agents npm run db:migration:rollback

# Re-run migrations
docker-compose exec trading-agents npm run db:migration:run
```

### pgvector Issues

#### Symptoms
- Vector similarity search failures
- "Extension not found" errors
- Slow embedding operations

#### Solutions

```sql
-- Verify pgvector extension
docker-compose exec postgresql psql -U postgres trading_agents -c "\dx"

-- Recreate extension if missing
docker-compose exec postgresql psql -U postgres trading_agents -c "CREATE EXTENSION IF NOT EXISTS vector;"

-- Check vector indexes
docker-compose exec postgresql psql -U postgres trading_agents -c "SELECT indexname FROM pg_indexes WHERE tablename = 'semantic_memory';"
```

---

## Memory Management Issues

### Agent Memory Issues

#### Symptoms
- Memory operations timing out
- "Out of memory" errors
- Slow memory retrieval
- Inconsistent memory states

#### Diagnostics

```bash
# Check memory usage
docker stats trading-agents

# Check database memory tables
docker-compose exec postgresql psql -U postgres trading_agents -c "SELECT COUNT(*) FROM episodic_memory;"
docker-compose exec postgresql psql -U postgres trading_agents -c "SELECT COUNT(*) FROM semantic_memory;"
docker-compose exec postgresql psql -U postgres trading_agents -c "SELECT COUNT(*) FROM working_memory;"
```

#### Solutions

1. **Memory Cleanup**
```bash
# Run database cleanup
docker-compose exec trading-agents npm run db:cleanup

# Clear expired working memory
docker-compose exec postgresql psql -U postgres trading_agents -c "SELECT cleanup_expired_working_memory();"
```

2. **Memory Optimization**
```bash
# Optimize memory tables
docker-compose exec postgresql psql -U postgres trading_agents -c "VACUUM ANALYZE episodic_memory;"
docker-compose exec postgresql psql -U postgres trading_agents -c "VACUUM ANALYZE semantic_memory;"
```

### Zep Graphiti Issues

#### Symptoms
- Graph memory operations failing
- Neo4j connection errors
- Temporal reasoning issues

#### Solutions

```bash
# Check Neo4j status
docker-compose exec neo4j cypher-shell -u neo4j -p $NEO4J_PASSWORD "MATCH (n) RETURN count(n);"

# Restart Zep Graphiti service
docker-compose restart zep-graphiti

# Check Zep Graphiti logs
docker-compose logs -f zep-graphiti
```

---

## Performance Issues

### Slow Analysis Performance

#### Symptoms
- Analysis taking > 5 minutes
- High CPU usage
- Memory leaks
- Timeout errors

#### Diagnostics

```bash
# Check system resources
docker stats

# Check analysis performance
docker-compose exec trading-agents npm run performance:analyze AAPL

# Profile memory usage
docker-compose exec trading-agents npm run performance:memory-profile
```

#### Solutions

1. **Optimize LLM Configuration**
```json
// In config.json
{
  "flow": {
    "parallelism": 2,
    "timeout": 180000,
    "maxTokens": 2000,
    "temperature": 0.5
  }
}
```

2. **Enable Caching**
```bash
# Enable intelligent caching
ENABLE_INTELLIGENT_CACHING=true
CACHE_TTL=3600

# Clear and rebuild cache
docker-compose exec redis redis-cli FLUSHALL
```

3. **Database Optimization**
```bash
# Run database optimization
docker-compose exec trading-agents npm run db:optimize

# Update table statistics
docker-compose exec postgresql psql -U postgres trading_agents -c "ANALYZE;"
```

### Backtesting Performance Issues

#### Symptoms
- Backtests taking hours to complete
- Memory exhaustion during backtests
- Incomplete backtest results

#### Solutions

1. **Optimize Backtest Configuration**
```typescript
const backtestConfig = {
  // Reduce data granularity
  dataGranularity: 'daily', // instead of 'hourly'
  
  // Limit date range
  maxBacktestDays: 365,
  
  // Enable parallel processing
  enableParallelProcessing: true,
  maxWorkers: 4
};
```

2. **Memory Management**
```bash
# Increase container memory
# In docker-compose.yml
services:
  trading-agents:
    deploy:
      resources:
        limits:
          memory: 4G
```

---

## API and Data Provider Issues

### Government Data Service Issues

#### Symptoms
- Government data requests failing
- SEC filing retrieval errors
- FRED/BLS API errors

#### Diagnostics

```bash
# Check government data service
curl http://localhost:3005/health

# Test specific endpoints
curl http://localhost:3005/api/company/AAPL
curl http://localhost:3005/api/fred/GDP

# Check API key configuration
docker-compose exec government-data printenv | grep API_KEY
```

#### Solutions

1. **API Key Issues**
```bash
# Verify API keys are set
echo $FRED_API_KEY
echo $BLS_API_KEY

# Update Docker secrets
echo "new_fred_api_key" > docker/secrets/fred_api_key.txt
docker-compose restart government-data
```

2. **Rate Limiting**
```bash
# Check rate limit status
docker-compose logs government-data | grep "rate limit"

# Implement exponential backoff (already built-in)
# Reduce request frequency in configuration
```

### Market Data Provider Issues

#### Symptoms
- Yahoo Finance data missing
- Alpha Vantage API errors
- MarketStack connection failures

#### Solutions

1. **Provider Failover**
```typescript
// The system automatically fails over between providers
// Check failover status
const status = await dataProviderFailover.getProviderStatus();
console.log('Provider Status:', status);
```

2. **Manual Provider Testing**
```bash
# Test individual providers
docker-compose exec trading-agents npm run test:yahoo-finance
docker-compose exec trading-agents npm run test:alpha-vantage
docker-compose exec trading-agents npm run test:marketstack
```

---

## Docker and Container Issues

### Container Startup Issues

#### Symptoms
- Services failing to start
- "Port already in use" errors
- Volume mount issues
- Network connectivity problems

#### Solutions

1. **Port Conflicts**
```bash
# Check port usage
netstat -tulpn | grep :5432
netstat -tulpn | grep :6379

# Change ports in docker-compose.yml if needed
ports:
  - "5433:5432"  # Use different external port
```

2. **Volume Issues**
```bash
# Remove and recreate volumes
docker-compose down -v
docker volume prune
docker-compose up -d
```

3. **Network Issues**
```bash
# Recreate networks
docker-compose down
docker network prune
docker-compose up -d
```

### Resource Constraints

#### Symptoms
- Out of memory errors
- CPU throttling
- Disk space issues

#### Solutions

1. **Increase Resource Limits**
```yaml
# In docker-compose.yml
services:
  trading-agents:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

2. **Clean Up Resources**
```bash
# Clean up Docker resources
docker system prune -a
docker volume prune
docker network prune
```

---

## Configuration Issues

### Environment Variable Issues

#### Symptoms
- "Configuration not found" errors
- Default values being used
- Service connection failures

#### Solutions

1. **Verify Environment Variables**
```bash
# Check environment variables
docker-compose exec trading-agents printenv | grep -E "(POSTGRES|REDIS|NEO4J|API_KEY)"

# Validate configuration
docker-compose exec trading-agents npm run config:validate
```

2. **Reload Configuration**
```bash
# Restart services to reload config
docker-compose restart

# Force rebuild with new config
docker-compose up --build -d
```

### LLM Provider Configuration Issues

#### Symptoms
- "Provider not found" errors
- Model loading failures
- Authentication errors

#### Solutions

1. **Check Provider Configuration**
```bash
# Test LLM providers
docker-compose exec trading-agents npm run test:llm-providers

# Check API keys
docker-compose exec trading-agents npm run config:check-api-keys
```

2. **Provider Fallback**
```json
// Configure fallback providers in config.json
{
  "analysis": {
    "models": {
      "quickThinking": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "fallback": {
          "provider": "anthropic",
          "model": "claude-3-haiku-20240307"
        }
      }
    }
  }
}
```

---

## Logging and Monitoring

### Log Analysis

#### Common Log Patterns

1. **Database Connection Issues**
```bash
# Search for database errors
docker-compose logs trading-agents | grep -i "database\|postgres\|connection"
```

2. **Memory Issues**
```bash
# Search for memory-related errors
docker-compose logs trading-agents | grep -i "memory\|heap\|oom"
```

3. **API Errors**
```bash
# Search for API errors
docker-compose logs trading-agents | grep -i "api\|rate limit\|timeout"
```

### Monitoring Setup

#### Enable Debug Logging

```bash
# Set debug level
LOG_LEVEL=debug
DEBUG=trading-agents:*

# Restart with debug logging
docker-compose restart trading-agents
```

#### Performance Monitoring

```bash
# Enable performance monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_METRICS_INTERVAL=60000

# Check performance metrics
docker-compose exec trading-agents npm run performance:report
```

---

## Emergency Procedures

### System Recovery

#### Complete System Reset

```bash
# Stop all services
docker-compose down -v

# Clean up Docker resources
docker system prune -a -f

# Remove all data (WARNING: This deletes all data)
sudo rm -rf data/ logs/ exports/

# Restart from scratch
docker-compose up -d

# Run migrations
docker-compose exec trading-agents npm run db:migrate
```

#### Database Recovery

```bash
# Restore from backup
docker-compose exec -T postgresql psql -U postgres trading_agents < backup.sql

# Rebuild indexes
docker-compose exec postgresql psql -U postgres trading_agents -c "REINDEX DATABASE trading_agents;"
```

### Data Backup

#### Create Emergency Backup

```bash
# Database backup
docker-compose exec postgresql pg_dump -U postgres trading_agents > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz .env.local docker/secrets/

# Logs backup
tar -czf logs_backup_$(date +%Y%m%d_%H%M%S).tar.gz logs/
```

### Contact Information

For critical issues that cannot be resolved:

1. Check the GitHub issues page
2. Review the deployment guide
3. Consult the API documentation
4. Contact system administrators

---

## Preventive Measures

### Regular Maintenance

1. **Daily Checks**
   - Monitor system health
   - Check error logs
   - Verify service status

2. **Weekly Tasks**
   - Run database cleanup
   - Update performance metrics
   - Review resource usage

3. **Monthly Tasks**
   - Update dependencies
   - Optimize database
   - Review and rotate logs

### Monitoring Alerts

Set up alerts for:
- High memory usage (>80%)
- Database connection failures
- API rate limit exceeded
- Long-running queries (>5 minutes)
- Service downtime

---

*This troubleshooting guide is regularly updated based on common issues and user feedback.*