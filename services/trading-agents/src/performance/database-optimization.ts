/**
 * Database Connection Pooling and Query Optimization
 * 
 * Advanced PostgreSQL connection management with intelligent pooling,
 * query optimization, and performance monitoring.
 * 
 * Requirements: 5.1, 5.3 - Performance optimization for web-based workloads
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { createLogger } from '../utils/enhanced-logger';
import { getMeter, ENABLE_OTEL } from '../observability/opentelemetry-setup';

const logger = createLogger('system', 'database-optimization');

export interface DatabaseConfig extends PoolConfig {
  // Connection pool settings
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  maxLifetimeSeconds?: number;
  
  // Query optimization
  queryTimeout?: number;
  statementTimeout?: number;
  
  // Performance monitoring
  slowQueryThreshold?: number;
  enableQueryLogging?: boolean;
  
  // Health monitoring
  healthCheckInterval?: number;
  maxRetries?: number;
}

export interface ConnectionStats {
  total: number;
  idle: number;
  active: number;
  waiting: number;
  maxLifetime: number;
  totalConnections: number;
  totalQueries: number;
  slowQueries: number;
  errors: number;
  averageQueryTime: number;
  connectionErrors: number;
}

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  rowCount?: number;
}

/**
 * Optimized database connection manager with advanced pooling
 */
export class DatabaseOptimizer {
  private pool: Pool;
  private config: DatabaseConfig;
  private stats: ConnectionStats;
  private queryMetrics: QueryMetrics[] = [];
  private healthCheckTimer?: NodeJS.Timeout;
  
  // OpenTelemetry metrics
  private connectionGauge?: any;
  private queryDurationHistogram?: any;
  private queryCounter?: any;
  private errorCounter?: any;

  constructor(config: DatabaseConfig) {
    this.config = {
      // Default connection pool settings
      min: config.min || 2,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      maxLifetimeSeconds: config.maxLifetimeSeconds || 3600, // 1 hour
      
      // Query settings
      queryTimeout: config.queryTimeout || 30000,
      statementTimeout: config.statementTimeout || 60000,
      
      // Performance monitoring
      slowQueryThreshold: config.slowQueryThreshold || 1000, // 1 second
      enableQueryLogging: config.enableQueryLogging ?? true,
      
      // Health monitoring
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      maxRetries: config.maxRetries || 3,
      
      // PostgreSQL connection settings
      ...config
    };

    this.initializePool();
    this.initializeStats();
    this.initializeMetrics();
    this.startHealthMonitoring();

    logger.info('database-optimization', 'Database optimizer initialized', {
      poolConfig: {
        min: this.config.min,
        max: this.config.max,
        idleTimeout: this.config.idleTimeoutMillis,
        connectionTimeout: this.config.connectionTimeoutMillis
      }
    });
  }

  private initializePool(): void {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      min: this.config.min,
      max: this.config.max,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      query_timeout: this.config.queryTimeout,
      statement_timeout: this.config.statementTimeout,
      ssl: this.config.ssl
    };

    this.pool = new Pool(poolConfig);

    // Pool event handlers
    this.pool.on('connect', (client: PoolClient) => {
      this.stats.totalConnections++;
      logger.debug('database-optimization', 'New client connected', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount
      });
    });

    this.pool.on('acquire', (client: PoolClient) => {
      logger.debug('database-optimization', 'Client acquired from pool');
    });

    this.pool.on('remove', (client: PoolClient) => {
      logger.debug('database-optimization', 'Client removed from pool');
    });

    this.pool.on('error', (err: Error) => {
      this.stats.connectionErrors++;
      logger.error('database-optimization', 'Pool error occurred', { error: err.message });
      
      if (this.errorCounter) {
        this.errorCounter.add(1, { type: 'connection' });
      }
    });
  }

  private initializeStats(): void {
    this.stats = {
      total: 0,
      idle: 0,
      active: 0,
      waiting: 0,
      maxLifetime: this.config.maxLifetimeSeconds || 3600,
      totalConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      errors: 0,
      averageQueryTime: 0,
      connectionErrors: 0
    };
  }

  private initializeMetrics(): void {
    if (ENABLE_OTEL) {
      try {
        const meter = getMeter('trading-agents-database');
        
        this.connectionGauge = meter.createUpDownCounter('db_connections_active', {
          description: 'Number of active database connections'
        });
        
        this.queryDurationHistogram = meter.createHistogram('db_query_duration_ms', {
          description: 'Database query duration in milliseconds'
        });
        
        this.queryCounter = meter.createCounter('db_queries_total', {
          description: 'Total number of database queries'
        });
        
        this.errorCounter = meter.createCounter('db_errors_total', {
          description: 'Total number of database errors'
        });
      } catch (error) {
        logger.warn('database-optimization', 'Failed to initialize OpenTelemetry metrics', { error });
      }
    }
  }

  /**
   * Execute optimized query with performance monitoring
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number; duration: number }> {
    const startTime = Date.now();
    let client: PoolClient | null = null;
    
    try {
      client = await this.pool.connect();
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.recordQueryMetrics(text, duration, true, result.rowCount);
      
      // Log slow queries
      if (duration > this.config.slowQueryThreshold!) {
        this.stats.slowQueries++;
        logger.warn('database-optimization', 'Slow query detected', {
          query: text.substring(0, 100),
          duration,
          rowCount: result.rowCount
        });
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(text, duration, false, 0, error as Error);
      this.stats.errors++;
      
      logger.error('database-optimization', 'Query execution failed', {
        query: text.substring(0, 100),
        error: (error as Error).message,
        duration
      });
      
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute transaction with optimized connection handling
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute batch queries with connection reuse
   */
  async batchQuery<T = any>(queries: Array<{ text: string; params?: any[] }>): Promise<Array<{ rows: T[]; rowCount: number }>> {
    const client = await this.pool.connect();
    const results: Array<{ rows: T[]; rowCount: number }> = [];
    
    try {
      for (const { text, params } of queries) {
        const startTime = Date.now();
        try {
          const result = await client.query(text, params);
          const duration = Date.now() - startTime;
          
          this.recordQueryMetrics(text, duration, true, result.rowCount);
          results.push({
            rows: result.rows,
            rowCount: result.rowCount || 0
          });
        } catch (error) {
          const duration = Date.now() - startTime;
          this.recordQueryMetrics(text, duration, false, 0, error as Error);
          throw error;
        }
      }
      
      return results;
    } finally {
      client.release();
    }
  }

  /**
   * Get connection pool statistics
   */
  getStats(): ConnectionStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get recent query metrics
   */
  getQueryMetrics(limit: number = 100): QueryMetrics[] {
    return this.queryMetrics.slice(-limit);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 50): QueryMetrics[] {
    return this.queryMetrics
      .filter(metric => metric.duration > this.config.slowQueryThreshold!)
      .slice(-limit);
  }

  /**
   * Optimize database connections
   */
  async optimize(): Promise<void> {
    try {
      // Update connection statistics
      this.updateStats();
      
      // Clean old query metrics (keep last 1000)
      if (this.queryMetrics.length > 1000) {
        this.queryMetrics = this.queryMetrics.slice(-1000);
      }
      
      // Log optimization results
      logger.debug('database-optimization', 'Database optimization completed', {
        stats: this.stats,
        queryMetricsCount: this.queryMetrics.length
      });
    } catch (error) {
      logger.error('database-optimization', 'Database optimization failed', { error });
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.query('SELECT 1');
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  /**
   * Close all connections gracefully
   */
  async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    await this.pool.end();
    logger.info('database-optimization', 'Database connections closed');
  }

  private recordQueryMetrics(
    query: string,
    duration: number,
    success: boolean,
    rowCount: number,
    error?: Error
  ): void {
    const metric: QueryMetrics = {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: new Date(),
      success,
      rowCount,
      error: error?.message
    };

    this.queryMetrics.push(metric);
    this.stats.totalQueries++;
    
    // Update average query time
    this.stats.averageQueryTime = (this.stats.averageQueryTime + duration) / 2;

    // Record OpenTelemetry metrics
    if (this.queryCounter) {
      this.queryCounter.add(1, { success: success.toString() });
    }
    
    if (this.queryDurationHistogram) {
      this.queryDurationHistogram.record(duration);
    }
    
    if (!success && this.errorCounter) {
      this.errorCounter.add(1, { type: 'query' });
    }
  }

  private updateStats(): void {
    this.stats.total = this.pool.totalCount;
    this.stats.idle = this.pool.idleCount;
    this.stats.active = this.pool.totalCount - this.pool.idleCount;
    this.stats.waiting = this.pool.waitingCount;

    // Update OpenTelemetry metrics
    if (this.connectionGauge) {
      this.connectionGauge.add(this.stats.active, { state: 'active' });
      this.connectionGauge.add(this.stats.idle, { state: 'idle' });
      this.connectionGauge.add(this.stats.waiting, { state: 'waiting' });
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        if (!health.healthy) {
          logger.warn('database-optimization', 'Database health check failed', {
            latency: health.latency,
            error: health.error
          });
        }
      } catch (error) {
        logger.error('database-optimization', 'Health check error', { error });
      }
    }, this.config.healthCheckInterval);
  }
}

/**
 * Query builder for optimized database operations
 */
export class OptimizedQueryBuilder {
  private query: string = '';
  private params: any[] = [];
  private paramIndex: number = 1;

  select(columns: string | string[]): this {
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    this.query += `SELECT ${cols}`;
    return this;
  }

  from(table: string): this {
    this.query += ` FROM ${table}`;
    return this;
  }

  where(condition: string, value?: any): this {
    if (this.query.includes('WHERE')) {
      this.query += ` AND ${condition}`;
    } else {
      this.query += ` WHERE ${condition}`;
    }
    
    if (value !== undefined) {
      this.query = this.query.replace('?', `$${this.paramIndex++}`);
      this.params.push(value);
    }
    
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query += ` ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.query += ` LIMIT $${this.paramIndex++}`;
    this.params.push(count);
    return this;
  }

  offset(count: number): this {
    this.query += ` OFFSET $${this.paramIndex++}`;
    this.params.push(count);
    return this;
  }

  build(): { text: string; params: any[] } {
    return {
      text: this.query,
      params: this.params
    };
  }
}

// Global database optimizer instance
let globalDatabaseOptimizer: DatabaseOptimizer | null = null;

export function initializeDatabaseOptimizer(config: DatabaseConfig): DatabaseOptimizer {
  if (globalDatabaseOptimizer) {
    throw new Error('Database optimizer already initialized');
  }
  
  globalDatabaseOptimizer = new DatabaseOptimizer(config);
  return globalDatabaseOptimizer;
}

export function getDatabaseOptimizer(): DatabaseOptimizer {
  if (!globalDatabaseOptimizer) {
    throw new Error('Database optimizer not initialized');
  }
  
  return globalDatabaseOptimizer;
}