# Trading System Enhancement - Performance Tuning Guide

## Overview

This guide provides comprehensive performance optimization recommendations for the enhanced Trading Agents system. It covers database optimization, application tuning, caching strategies, and system-level optimizations.

## Table of Contents

1. [Performance Baseline](#performance-baseline)
2. [Database Optimization](#database-optimization)
3. [Application Performance](#application-performance)
4. [Memory Management](#memory-management)
5. [Caching Strategies](#caching-strategies)
6. [Network Optimization](#network-optimization)
7. [Monitoring and Metrics](#monitoring-and-metrics)
8. [Scaling Considerations](#scaling-considerations)

---

## Performance Baseline

### Expected Performance Metrics

**Single Analysis (AAPL):**
- Standard Analysis: 30-60 seconds
- Deep Analysis: 60-120 seconds
- Backtesting (1 year): 2-5 minutes
- Risk Assessment: 5-15 seconds

**System Resources:**
- Memory Usage: 1-2 GB under normal load
- CPU Usage: 20-40% during analysis
- Database Connections: 5-15 active connections
- Network I/O: 10-50 MB per analysis

### Performance Testing

```bash
# Run performance benchmarks
docker-compose exec trading-agents npm run performance:benchmark

# Test specific components
docker-compose exec trading-agents npm run performance:test-analysis
docker-compose exec trading-agents npm run performance:test-backtesting
docker-compose exec trading-agents npm run performance:test-database
```

---

## Database Optimization

### PostgreSQL Configuration

#### 1. Memory Settings

```sql
-- Connect to PostgreSQL
docker-compose exec postgresql psql -U postgres

-- Optimize memory settings (adjust based on available RAM)
ALTER SYSTEM SET shared_buffers = '512MB';           -- 25% of RAM
ALTER SYSTEM SET effective_cache_size = '2GB';       -- 75% of RAM
ALTER SYSTEM SET maintenance_work_mem = '128MB';     -- For maintenance operations
ALTER SYSTEM SET work_mem = '16MB';                  -- Per connection work memory
ALTER SYSTEM SET wal_buffers = '16MB';               -- WAL buffer size

-- Reload configuration
SELECT pg_reload_conf();
```

#### 2. Query Optimization

```sql
-- Enable query optimization
ALTER SYSTEM SET random_page_cost = 1.1;            -- For SSD storage
ALTER SYSTEM SET effective_io_concurrency = 200;    -- For SSD storage
ALTER SYSTEM SET default_statistics_target = 100;   -- Better query planning

-- Checkpoint optimization
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET checkpoint_timeout = '10min';
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET min_wal_size = '512MB';

SELECT pg_reload_conf();
```

#### 3. Connection Optimization

```sql
-- Connection settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Index Optimization

#### 1. Monitor Index Usage

```sql
-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

#### 2. Optimize Slow Queries

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;

-- Find slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Database Maintenance

#### 1. Automated Maintenance

```bash
# Create maintenance script
cat > scripts/db-maintenance.sh << 'EOF'
#!/bin/bash

# Vacuum and analyze all tables
docker-compose exec postgresql psql -U postgres trading_agents -c "VACUUM ANALYZE;"

# Update table statistics
docker-compose exec postgresql psql -U postgres trading_agents -c "
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ANALYZE ' || r.tablename;
    END LOOP;
END
\$\$;
"

# Cleanup expired data
docker-compose exec trading-agents npm run db:cleanup

echo "Database maintenance completed at $(date)"
EOF

chmod +x scripts/db-maintenance.sh

# Schedule in crontab
# 0 2 * * * /path/to/scripts/db-maintenance.sh >> /var/log/db-maintenance.log 2>&1
```

#### 2. Index Maintenance

```sql
-- Rebuild indexes periodically
REINDEX INDEX CONCURRENTLY idx_episodic_session_timestamp;
REINDEX INDEX CONCURRENTLY idx_semantic_embedding;
REINDEX INDEX CONCURRENTLY idx_performance_strategy_timestamp;

-- Check index bloat
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Application Performance

### Node.js Optimization

#### 1. Runtime Configuration

```bash
# Optimize Node.js runtime
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
UV_THREADPOOL_SIZE=16

# Enable clustering for production
ENABLE_CLUSTERING=true
CLUSTER_WORKERS=4
```

#### 2. Memory Management

```typescript
// In your application startup
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.warn('Memory leak detected:', warning);
  }
});

// Garbage collection optimization
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    if (global.gc) {
      global.gc();
    }
  }, 30000); // Force GC every 30 seconds
}
```

### LLM Provider Optimization

#### 1. Request Optimization

```typescript
// Optimize LLM requests
const optimizedConfig = {
  temperature: 0.7,        // Balance creativity and consistency
  maxTokens: 2000,         // Limit response length
  timeout: 60000,          // 60 second timeout
  retries: 3,              // Retry failed requests
  parallelism: 4,          // Parallel requests
  
  // Use streaming for long responses
  stream: true,
  
  // Cache frequently used prompts
  enablePromptCaching: true,
  cacheTimeout: 3600
};
```

#### 2. Provider Selection

```typescript
// Optimize provider selection based on task
const providerOptimization = {
  quickAnalysis: {
    provider: 'openai',
    model: 'gpt-4o-mini',    // Faster, cheaper
    maxTokens: 1000
  },
  deepAnalysis: {
    provider: 'openai',
    model: 'gpt-4o',         // More capable
    maxTokens: 4000
  },
  backtesting: {
    provider: 'local_lmstudio', // Cost-effective for batch processing
    model: 'llama-3.2-3b-instruct'
  }
};
```

### Async Operations Optimization

#### 1. Connection Pooling

```typescript
// Optimize database connection pooling
const poolConfig = {
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  acquireTimeoutMillis: 60000, // Connection timeout
  idleTimeoutMillis: 30000,   // Idle timeout
  reapIntervalMillis: 1000,   // Cleanup interval
  createRetryIntervalMillis: 200,
  propagateCreateError: false
};
```

#### 2. Batch Operations

```typescript
// Optimize memory operations with batching
class OptimizedMemoryManager {
  async batchStoreEpisodicMemory(memories: EpisodicMemory[]): Promise<void> {
    const batchSize = 100;
    const batches = this.chunkArray(memories, batchSize);
    
    await Promise.all(
      batches.map(batch => this.storeBatch(batch))
    );
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

---

## Memory Management

### Application Memory

#### 1. Memory Monitoring

```typescript
// Memory monitoring utility
class MemoryMonitor {
  private static instance: MemoryMonitor;
  private memoryUsage: NodeJS.MemoryUsage[] = [];
  
  startMonitoring(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      this.memoryUsage.push(usage);
      
      // Keep only last 100 measurements
      if (this.memoryUsage.length > 100) {
        this.memoryUsage.shift();
      }
      
      // Alert on high memory usage
      if (usage.heapUsed > 1024 * 1024 * 1024) { // 1GB
        console.warn('High memory usage detected:', usage);
      }
    }, 10000); // Check every 10 seconds
  }
  
  getMemoryStats(): any {
    const current = process.memoryUsage();
    const average = this.calculateAverage();
    
    return {
      current,
      average,
      trend: this.calculateTrend()
    };
  }
}
```

#### 2. Memory Leak Prevention

```typescript
// Prevent memory leaks in event listeners
class EventManager {
  private listeners = new Map<string, Function[]>();
  
  addListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  removeAllListeners(): void {
    this.listeners.clear();
  }
  
  // Call this during cleanup
  cleanup(): void {
    this.removeAllListeners();
  }
}
```

### Database Memory

#### 1. Query Result Optimization

```typescript
// Stream large result sets
async function streamLargeQuery(query: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    const queryStream = new QueryStream(query);
    const stream = client.query(queryStream);
    
    stream.on('data', (row) => {
      // Process row immediately
      processRow(row);
    });
    
    stream.on('end', () => {
      console.log('Query completed');
    });
    
  } finally {
    client.release();
  }
}
```

#### 2. Memory-Efficient Backtesting

```typescript
// Process backtesting data in chunks
class MemoryEfficientBacktester {
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const chunkSize = 1000; // Process 1000 data points at a time
    const totalData = await this.getDataCount(config);
    const chunks = Math.ceil(totalData / chunkSize);
    
    let results: Partial<BacktestResult> = {};
    
    for (let i = 0; i < chunks; i++) {
      const chunkData = await this.getDataChunk(config, i * chunkSize, chunkSize);
      const chunkResult = await this.processChunk(chunkData);
      
      results = this.mergeResults(results, chunkResult);
      
      // Force garbage collection after each chunk
      if (global.gc) global.gc();
    }
    
    return results as BacktestResult;
  }
}
```

---

## Caching Strategies

### Multi-Level Caching

#### 1. Application-Level Caching

```typescript
// LRU Cache for frequently accessed data
import LRU from 'lru-cache';

class CacheManager {
  private l1Cache = new LRU<string, any>({
    max: 1000,
    ttl: 1000 * 60 * 15 // 15 minutes
  });
  
  private l2Cache: Redis; // Redis cache
  
  async get(key: string): Promise<any> {
    // L1 Cache (Memory)
    let value = this.l1Cache.get(key);
    if (value) return value;
    
    // L2 Cache (Redis)
    value = await this.l2Cache.get(key);
    if (value) {
      this.l1Cache.set(key, JSON.parse(value));
      return JSON.parse(value);
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Store in both caches
    this.l1Cache.set(key, value);
    await this.l2Cache.setex(key, ttl, JSON.stringify(value));
  }
}
```

#### 2. Database Query Caching

```typescript
// Cache expensive database queries
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  async cachedQuery<T>(
    query: string, 
    params: any[], 
    ttl: number = 300000 // 5 minutes
  ): Promise<T[]> {
    const cacheKey = this.generateCacheKey(query, params);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    const result = await pool.query(query, params);
    this.cache.set(cacheKey, {
      data: result.rows,
      timestamp: Date.now(),
      ttl
    });
    
    return result.rows;
  }
  
  private generateCacheKey(query: string, params: any[]): string {
    return `${query}:${JSON.stringify(params)}`;
  }
}
```

### Redis Optimization

#### 1. Redis Configuration

```bash
# Redis optimization settings
REDIS_MAXMEMORY=1gb
REDIS_MAXMEMORY_POLICY=allkeys-lru
REDIS_SAVE=""  # Disable persistence for cache-only usage
REDIS_APPENDONLY=no
REDIS_TCP_KEEPALIVE=60
REDIS_TIMEOUT=300
```

#### 2. Cache Warming

```typescript
// Pre-warm cache with frequently accessed data
class CacheWarmer {
  async warmCache(): Promise<void> {
    const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
    
    await Promise.all(
      popularSymbols.map(async (symbol) => {
        // Pre-load market data
        await this.preloadMarketData(symbol);
        
        // Pre-load news data
        await this.preloadNewsData(symbol);
        
        // Pre-load analysis results
        await this.preloadAnalysisResults(symbol);
      })
    );
  }
  
  private async preloadMarketData(symbol: string): Promise<void> {
    const data = await this.marketDataProvider.getMarketData(symbol);
    await this.cacheManager.set(`market:${symbol}`, data, 900); // 15 minutes
  }
}
```

---

## Network Optimization

### API Request Optimization

#### 1. Request Batching

```typescript
// Batch API requests to reduce network overhead
class BatchRequestManager {
  private pendingRequests = new Map<string, Promise<any>>();
  private batchQueue: Array<{ url: string; resolve: Function; reject: Function }> = [];
  
  async batchRequest(url: string): Promise<any> {
    // Deduplicate identical requests
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url);
    }
    
    const promise = new Promise((resolve, reject) => {
      this.batchQueue.push({ url, resolve, reject });
      
      // Process batch when queue reaches threshold or after timeout
      if (this.batchQueue.length >= 10) {
        this.processBatch();
      } else {
        setTimeout(() => this.processBatch(), 100);
      }
    });
    
    this.pendingRequests.set(url, promise);
    return promise;
  }
  
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    const batch = this.batchQueue.splice(0, 10);
    
    try {
      const results = await Promise.all(
        batch.map(({ url }) => fetch(url))
      );
      
      results.forEach((result, index) => {
        batch[index].resolve(result);
      });
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
  }
}
```

#### 2. Connection Pooling

```typescript
// HTTP connection pooling
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

// Use with axios
const axiosConfig = {
  httpsAgent,
  timeout: 30000,
  maxRedirects: 3
};
```

---

## Monitoring and Metrics

### Performance Metrics Collection

#### 1. Application Metrics

```typescript
// Performance metrics collector
class PerformanceCollector {
  private metrics = new Map<string, number[]>();
  
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 1000 measurements
    if (values.length > 1000) {
      values.shift();
    }
  }
  
  getMetricStats(name: string): any {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
}
```

#### 2. Database Performance Monitoring

```sql
-- Create performance monitoring views
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables;

-- Monitor query performance
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_time DESC;
```

### Alerting

#### 1. Performance Alerts

```typescript
// Performance alerting system
class PerformanceAlerter {
  private thresholds = {
    analysisTime: 120000,      // 2 minutes
    memoryUsage: 0.8,          // 80% of available memory
    dbConnections: 0.9,        // 90% of max connections
    errorRate: 0.05            // 5% error rate
  };
  
  checkPerformance(): void {
    const metrics = this.collectMetrics();
    
    if (metrics.analysisTime > this.thresholds.analysisTime) {
      this.sendAlert('HIGH_ANALYSIS_TIME', metrics.analysisTime);
    }
    
    if (metrics.memoryUsage > this.thresholds.memoryUsage) {
      this.sendAlert('HIGH_MEMORY_USAGE', metrics.memoryUsage);
    }
    
    if (metrics.dbConnectionUsage > this.thresholds.dbConnections) {
      this.sendAlert('HIGH_DB_CONNECTION_USAGE', metrics.dbConnectionUsage);
    }
  }
  
  private sendAlert(type: string, value: number): void {
    console.warn(`PERFORMANCE ALERT: ${type} = ${value}`);
    // Send to monitoring system
  }
}
```

---

## Scaling Considerations

### Horizontal Scaling

#### 1. Load Balancing

```yaml
# nginx.conf for load balancing
upstream trading_agents {
    least_conn;
    server trading-agents-1:8080 weight=1;
    server trading-agents-2:8080 weight=1;
    server trading-agents-3:8080 weight=1;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://trading_agents;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

#### 2. Database Scaling

```yaml
# PostgreSQL read replicas
version: '3.8'
services:
  postgresql-primary:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_REPLICATION_MODE=master
      - POSTGRES_REPLICATION_USER=replicator
      - POSTGRES_REPLICATION_PASSWORD=replicator_password
  
  postgresql-replica:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_REPLICATION_MODE=slave
      - POSTGRES_REPLICATION_USER=replicator
      - POSTGRES_REPLICATION_PASSWORD=replicator_password
      - POSTGRES_MASTER_HOST=postgresql-primary
```

### Vertical Scaling

#### 1. Resource Allocation

```yaml
# docker-compose.yml resource limits
services:
  trading-agents:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'
  
  postgresql:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

#### 2. Auto-scaling

```typescript
// Auto-scaling based on performance metrics
class AutoScaler {
  async checkScalingNeeds(): Promise<void> {
    const metrics = await this.getSystemMetrics();
    
    if (metrics.cpuUsage > 0.8 && metrics.queueLength > 100) {
      await this.scaleUp();
    } else if (metrics.cpuUsage < 0.3 && metrics.queueLength < 10) {
      await this.scaleDown();
    }
  }
  
  private async scaleUp(): Promise<void> {
    // Increase container resources or spawn new instances
    console.log('Scaling up due to high load');
  }
  
  private async scaleDown(): Promise<void> {
    // Reduce container resources or terminate instances
    console.log('Scaling down due to low load');
  }
}
```

---

## Performance Testing

### Load Testing

```bash
# Install load testing tools
npm install -g artillery

# Create load test configuration
cat > load-test.yml << 'EOF'
config:
  target: 'http://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 20
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "Analysis Load Test"
    requests:
      - post:
          url: "/api/analyze"
          json:
            symbol: "AAPL"
            date: "2024-01-15"
EOF

# Run load test
artillery run load-test.yml
```

### Benchmarking

```typescript
// Performance benchmarking utility
class PerformanceBenchmark {
  async benchmarkAnalysis(iterations: number = 100): Promise<any> {
    const results: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await this.runAnalysis('AAPL');
      const duration = Date.now() - start;
      results.push(duration);
    }
    
    return this.calculateStats(results);
  }
  
  private calculateStats(values: number[]): any {
    const sorted = values.sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
}
```

---

*This performance tuning guide is regularly updated based on system performance analysis and optimization discoveries.*