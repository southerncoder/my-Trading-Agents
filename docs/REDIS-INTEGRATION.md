# Redis Integration for Trading Agents

This document describes the Redis integration for the intelligent caching system in the Trading Agents project.

## Overview

Redis is integrated as the L2 (distributed) cache layer in the multi-level caching system:

- **L1 Cache**: In-memory LRU cache (fastest, per-process)
- **L2 Cache**: Redis distributed cache (shared across instances)
- **L3 Cache**: Database cache (persistent, future implementation)

## Configuration

### Environment Variables

Add these variables to your `.env.local` file:

```bash
# Redis Configuration
REDIS_HOST=localhost          # Redis host (use 'redis' for Docker)
REDIS_PORT=6379              # Redis port
REDIS_PASSWORD=your_password  # Redis password (optional)
REDIS_DB=0                   # Redis database number
```

### Docker Configuration

Redis is automatically included in the Docker Compose setup:

```yaml
# docker-compose.yml includes Redis service
services:
  redis:
    image: redis:7.4-alpine
    ports:
      - "6379:6379"
    # ... additional configuration
```

## Usage

### Automatic Integration

The intelligent caching system automatically uses Redis when configured:

```typescript
import { createIntelligentCache } from '../resilience/intelligent-caching.js';

// Creates cache with Redis L2 layer if REDIS_HOST is set
const cache = createIntelligentCache('fundamentals');

// Multi-level caching automatically handles Redis
await cache.set('key', data, 300); // 5 minutes TTL
const result = await cache.get('key');
```

### Manual Redis Client

For direct Redis operations:

```typescript
import { createClient } from 'redis';

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  password: process.env.REDIS_PASSWORD,
  database: parseInt(process.env.REDIS_DB || '0')
});

await client.connect();
```

## Testing

### Test Redis Connection

```bash
# Test Redis connectivity
npm run test:manual:redis

# Or run directly
cd services/trading-agents
npx vite-node scripts/test-redis-connection.ts
```

### Docker Testing

```bash
# Start Redis only
docker-compose up redis

# Start full stack with Redis
docker-compose up

# Check Redis logs
docker-compose logs redis

# Connect to Redis CLI
docker-compose exec redis redis-cli
```

## Cache Keys Structure

The caching system uses structured keys:

```
trading-agents:cache:{provider-type}:{operation}:{params-hash}
```

Examples:
- `trading-agents:cache:news:getNews:AAPL-2024-01-15`
- `trading-agents:cache:fundamentals:getData:MSFT-2024-01-15`
- `trading-agents:cache:social:analyzeSentiment:TSLA`

## Performance Considerations

### Memory Usage

- **L1 Cache**: 1000 entries max per provider type
- **Redis**: Configurable memory limit (default: 256MB in Docker)
- **TTL**: Automatic expiration (5-30 minutes depending on data type)

### Network Optimization

- **Connection Pooling**: Redis client uses connection pooling
- **Compression**: Large values (>1KB) are automatically compressed
- **Batch Operations**: Multiple cache operations are batched when possible

## Monitoring

### Health Checks

Redis health is monitored through:

1. **Docker Health Check**: `redis-cli ping`
2. **Application Health**: Connection status in health monitor
3. **Cache Metrics**: Hit rates, response times, error rates

### Metrics

The intelligent cache provides comprehensive metrics:

```typescript
const cache = createIntelligentCache('fundamentals');
const metrics = cache.getMetrics();

console.log({
  l2HitRate: metrics.l2.hitRate,
  l2ConnectionStatus: metrics.l2.connectionStatus,
  overallHitRate: metrics.overall.overallHitRate
});
```

## Troubleshooting

### Common Issues

**Redis Connection Failed**
```bash
# Check if Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test connection manually
docker-compose exec redis redis-cli ping
```

**Authentication Errors**
```bash
# Check password configuration
echo $REDIS_PASSWORD

# Verify Docker secret
cat docker/secrets/redis_password.txt
```

**Memory Issues**
```bash
# Check Redis memory usage
docker-compose exec redis redis-cli info memory

# Monitor cache size
docker-compose exec redis redis-cli dbsize
```

### Performance Issues

**High Memory Usage**
- Reduce L1 cache size in configuration
- Lower TTL values for cached data
- Enable compression for large values

**Slow Response Times**
- Check network latency to Redis
- Monitor Redis CPU usage
- Consider Redis clustering for high load

## Security

### Production Security

1. **Password Protection**: Always use strong passwords in production
2. **Network Isolation**: Use Docker networks to isolate Redis
3. **TLS Encryption**: Enable TLS for Redis connections in production
4. **Access Control**: Use Redis ACLs to limit access

### Development Security

- Development uses no password for convenience
- Redis is isolated in Docker network
- Data is not persistent across container restarts

## Backup and Recovery

### Data Persistence

Redis is configured with AOF (Append Only File) persistence:

```bash
# Manual backup
docker-compose exec redis redis-cli bgsave

# Check persistence status
docker-compose exec redis redis-cli lastsave
```

### Cache Warming

The system supports cache warming on startup:

```typescript
// Warm cache with frequently accessed data
await cache.prefetch({
  keys: ['AAPL', 'MSFT', 'GOOGL'],
  priority: 'high',
  generator: async (symbol) => await fetchMarketData(symbol)
});
```

## Migration

### From No Cache to Redis

1. Update `.env.local` with Redis configuration
2. Run migration script: `./docker/secrets/migrate-secrets.sh`
3. Start Redis: `docker-compose up redis`
4. Restart trading agents: `docker-compose restart trading-agents`

### Redis Version Upgrades

1. Stop services: `docker-compose down`
2. Update Redis image version in `docker-compose.yml`
3. Start services: `docker-compose up`
4. Verify compatibility: `npm run test:manual:redis`

## Related Documentation

- [Intelligent Caching System](../services/trading-agents/src/resilience/intelligent-caching.ts)
- [Docker Compose Configuration](../docker-compose.yml)
- [Environment Configuration](../.env.example)
- [Health Monitoring](../services/trading-agents/src/utils/health-monitor.ts)