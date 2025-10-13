/**
 * Async Database Management Layer for Trading Agents
 * 
 * Provides comprehensive PostgreSQL support with connection pooling,
 * transaction management, and health monitoring for the trading system.
 */

import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';
import { createLogger } from '../utils/enhanced-logger.js';

const logger = createLogger('system', 'database-manager');

export interface DatabaseConfig {
  postgresql: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    poolSize: number;
    connectionTimeoutMillis: number;
    idleTimeoutMillis: number;
    maxUses: number;
    allowExitOnIdle: boolean;
  };
  storageStrategy: {
    performanceMetrics: 'postgresql' | 'both';
    backtestResults: 'postgresql' | 'both';
    timeSeriesData: 'postgresql';
    graphRelationships: 'zep_graphiti';
    agentMemory: 'zep_graphiti' | 'postgresql' | 'both';
    episodicMemory: 'postgresql';
    semanticMemory: 'postgresql';
    workingMemory: 'postgresql';
    proceduralMemory: 'postgresql';
  };
  pgvector: {
    enabled: boolean;
    embeddingDimensions: number;
    similarityThreshold: number;
  };
}

export interface TransactionQuery {
  query: string;
  params?: any[];
}

export interface DatabaseHealthStatus {
  postgresql: {
    connected: boolean;
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    lastError?: string;
  };
  zepGraphiti: {
    connected: boolean;
    lastPing?: Date;
    lastError?: string;
  };
}

export interface GraphData {
  nodes: Array<{
    id: string;
    type: string;
    properties: Record<string, any>;
  }>;
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    properties?: Record<string, any>;
  }>;
}

export interface StructuredData {
  table: string;
  data: Record<string, any>;
  upsert?: boolean;
}

export interface TimeSeriesData {
  timestamp: Date;
  metric: string;
  value: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface MetricsQuery {
  metrics: string[];
  startTime?: Date;
  endTime?: Date;
  tags?: Record<string, string>;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  interval?: string;
}

export interface BacktestQuery {
  strategyId?: string;
  startDate?: Date;
  endDate?: Date;
  symbols?: string[];
  limit?: number;
  offset?: number;
}

export interface TimeSeriesQuery {
  metric: string;
  startTime: Date;
  endTime: Date;
  tags?: Record<string, string>;
  interval?: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface PerformanceData {
  id: string;
  strategyId: string;
  timestamp: Date;
  metrics: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  symbol: string;
  startDate: Date;
  endDate: Date;
  performance: Record<string, number>;
  trades: any[];
  metadata: Record<string, any>;
}

/**
 * Comprehensive Database Manager with async PostgreSQL support
 */
export class DatabaseManager {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.setupErrorHandlers();
  }

  /**
   * Initialize database connections with async support
   */
  async initializeConnections(): Promise<void> {
    try {
      logger.info('database-manager', 'Initializing database connections');

      // Create PostgreSQL connection pool
      const poolConfig: PoolConfig = {
        host: this.config.postgresql.host,
        port: this.config.postgresql.port,
        database: this.config.postgresql.database,
        user: this.config.postgresql.username,
        password: this.config.postgresql.password,
        ssl: this.config.postgresql.ssl,
        max: this.config.postgresql.poolSize,
        connectionTimeoutMillis: this.config.postgresql.connectionTimeoutMillis,
        idleTimeoutMillis: this.config.postgresql.idleTimeoutMillis,
        maxUses: this.config.postgresql.maxUses,
        allowExitOnIdle: this.config.postgresql.allowExitOnIdle,
      };

      this.pool = new Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Initialize database schema
      await this.initializeSchema();

      this.isInitialized = true;
      this.connectionAttempts = 0;

      logger.info('database-manager', 'Database connections initialized successfully', {
        poolSize: this.config.postgresql.poolSize,
        database: this.config.postgresql.database
      });

    } catch (error) {
      this.connectionAttempts++;
      logger.error('database-manager', 'Failed to initialize database connections', {
        error: (error as Error).message,
        attempt: this.connectionAttempts,
        maxAttempts: this.maxConnectionAttempts
      });

      if (this.connectionAttempts < this.maxConnectionAttempts) {
        logger.info('database-manager', `Retrying connection in ${this.reconnectDelay}ms`);
        setTimeout(() => this.initializeConnections(), this.reconnectDelay);
      } else {
        throw new Error(`Failed to connect to database after ${this.maxConnectionAttempts} attempts: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get PostgreSQL connection pool
   */
  getPostgreSQLPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initializeConnections() first.');
    }
    return this.pool;
  }

  /**
   * Execute a query with parameters
   */
  async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
      const result: QueryResult = await client.query(query, params);
      
      const duration = Date.now() - startTime;
      logger.debug('database-manager', 'Query executed successfully', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        duration,
        rowCount: result.rowCount
      });

      return result.rows as T[];

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('database-manager', 'Query execution failed', {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
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
   * Execute multiple queries in a transaction
   */
  async executeTransaction<T = any>(queries: TransactionQuery[]): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
      await client.query('BEGIN');

      const results: any[] = [];
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result.rows);
      }

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      logger.info('database-manager', 'Transaction completed successfully', {
        queryCount: queries.length,
        duration
      });

      return results as T;

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
          logger.info('database-manager', 'Transaction rolled back due to error');
        } catch (rollbackError) {
          logger.error('database-manager', 'Failed to rollback transaction', {
            error: (rollbackError as Error).message
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.error('database-manager', 'Transaction failed', {
        error: (error as Error).message,
        queryCount: queries.length,
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
   * Store graph data (routes to Zep Graphiti)
   */
  async storeGraphData(data: GraphData): Promise<void> {
    try {
      // This would integrate with Zep Graphiti client
      // For now, we'll log the operation
      logger.info('database-manager', 'Storing graph data', {
        nodeCount: data.nodes.length,
        relationshipCount: data.relationships.length
      });

      // TODO: Implement Zep Graphiti integration
      // const zepClient = await this.getZepClient();
      // await zepClient.addNodes(data.nodes);
      // await zepClient.addRelationships(data.relationships);

    } catch (error) {
      logger.error('database-manager', 'Failed to store graph data', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Store structured data in PostgreSQL
   */
  async storeStructuredData(data: StructuredData): Promise<void> {
    try {
      const columns = Object.keys(data.data);
      const values = Object.values(data.data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      let query: string;
      if (data.upsert) {
        const updateClause = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
        query = `
          INSERT INTO ${data.table} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET ${updateClause}
        `;
      } else {
        query = `INSERT INTO ${data.table} (${columns.join(', ')}) VALUES (${placeholders})`;
      }

      await this.executeQuery(query, values);

      logger.debug('database-manager', 'Structured data stored', {
        table: data.table,
        upsert: data.upsert
      });

    } catch (error) {
      logger.error('database-manager', 'Failed to store structured data', {
        table: data.table,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Store time series data
   */
  async storeTimeSeriesData(data: TimeSeriesData): Promise<void> {
    try {
      const query = `
        INSERT INTO time_series_data (timestamp, metric, value, tags, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `;

      await this.executeQuery(query, [
        data.timestamp,
        data.metric,
        data.value,
        JSON.stringify(data.tags || {}),
        JSON.stringify(data.metadata || {})
      ]);

      logger.debug('database-manager', 'Time series data stored', {
        metric: data.metric,
        timestamp: data.timestamp
      });

    } catch (error) {
      logger.error('database-manager', 'Failed to store time series data', {
        metric: data.metric,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Query performance metrics
   */
  async queryPerformanceMetrics(query: MetricsQuery): Promise<PerformanceData[]> {
    try {
      let sql = `
        SELECT id, strategy_id, timestamp, metrics, metadata
        FROM performance_metrics
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (query.startTime) {
        sql += ` AND timestamp >= $${paramIndex}`;
        params.push(query.startTime);
        paramIndex++;
      }

      if (query.endTime) {
        sql += ` AND timestamp <= $${paramIndex}`;
        params.push(query.endTime);
        paramIndex++;
      }

      sql += ` ORDER BY timestamp DESC`;

      const results = await this.executeQuery<any>(sql, params);

      return results.map(row => ({
        id: row.id,
        strategyId: row.strategy_id,
        timestamp: row.timestamp,
        metrics: row.metrics,
        metadata: row.metadata
      }));

    } catch (error) {
      logger.error('database-manager', 'Failed to query performance metrics', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Query backtest results
   */
  async queryBacktestResults(query: BacktestQuery): Promise<BacktestResult[]> {
    try {
      let sql = `
        SELECT id, strategy_id, symbol, start_date, end_date, performance, trades, metadata
        FROM backtest_results
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (query.strategyId) {
        sql += ` AND strategy_id = $${paramIndex}`;
        params.push(query.strategyId);
        paramIndex++;
      }

      if (query.startDate) {
        sql += ` AND start_date >= $${paramIndex}`;
        params.push(query.startDate);
        paramIndex++;
      }

      if (query.endDate) {
        sql += ` AND end_date <= $${paramIndex}`;
        params.push(query.endDate);
        paramIndex++;
      }

      if (query.symbols && query.symbols.length > 0) {
        sql += ` AND symbol = ANY($${paramIndex})`;
        params.push(query.symbols);
        paramIndex++;
      }

      sql += ` ORDER BY created_at DESC`;

      if (query.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(query.limit);
        paramIndex++;
      }

      if (query.offset) {
        sql += ` OFFSET $${paramIndex}`;
        params.push(query.offset);
      }

      const results = await this.executeQuery<any>(sql, params);

      return results.map(row => ({
        id: row.id,
        strategyId: row.strategy_id,
        symbol: row.symbol,
        startDate: row.start_date,
        endDate: row.end_date,
        performance: row.performance,
        trades: row.trades,
        metadata: row.metadata
      }));

    } catch (error) {
      logger.error('database-manager', 'Failed to query backtest results', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Query time series data
   */
  async queryTimeSeriesData(query: TimeSeriesQuery): Promise<TimeSeriesData[]> {
    try {
      let sql = `
        SELECT timestamp, metric, value, tags, metadata
        FROM time_series_data
        WHERE metric = $1 AND timestamp BETWEEN $2 AND $3
      `;
      const params: any[] = [query.metric, query.startTime, query.endTime];
      let paramIndex = 4;

      if (query.tags && Object.keys(query.tags).length > 0) {
        sql += ` AND tags @> $${paramIndex}`;
        params.push(JSON.stringify(query.tags));
        paramIndex++;
      }

      if (query.interval && query.aggregation) {
        sql = `
          SELECT 
            date_trunc('${query.interval}', timestamp) as timestamp,
            '${query.metric}' as metric,
            ${query.aggregation}(value) as value,
            tags,
            jsonb_build_object() as metadata
          FROM time_series_data
          WHERE metric = $1 AND timestamp BETWEEN $2 AND $3
        `;
        
        if (query.tags && Object.keys(query.tags).length > 0) {
          sql += ` AND tags @> $${paramIndex}`;
        }
        
        sql += ` GROUP BY date_trunc('${query.interval}', timestamp), tags`;
      }

      sql += ` ORDER BY timestamp`;

      const results = await this.executeQuery<any>(sql, params);

      return results.map(row => ({
        timestamp: row.timestamp,
        metric: row.metric,
        value: row.value,
        tags: row.tags,
        metadata: row.metadata
      }));

    } catch (error) {
      logger.error('database-manager', 'Failed to query time series data', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth(): Promise<DatabaseHealthStatus> {
    const health: DatabaseHealthStatus = {
      postgresql: {
        connected: false,
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0
      },
      zepGraphiti: {
        connected: false
      }
    };

    try {
      if (this.pool) {
        // Test PostgreSQL connection
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();

        health.postgresql.connected = true;
        health.postgresql.totalConnections = this.pool.totalCount;
        health.postgresql.idleConnections = this.pool.idleCount;
        health.postgresql.activeConnections = this.pool.totalCount - this.pool.idleCount;
      }
    } catch (error) {
      health.postgresql.lastError = (error as Error).message;
      logger.error('database-manager', 'PostgreSQL health check failed', {
        error: (error as Error).message
      });
    }

    try {
      // TODO: Implement Zep Graphiti health check
      health.zepGraphiti.connected = true;
      health.zepGraphiti.lastPing = new Date();
    } catch (error) {
      health.zepGraphiti.lastError = (error as Error).message;
      logger.error('database-manager', 'Zep Graphiti health check failed', {
        error: (error as Error).message
      });
    }

    return health;
  }

  /**
   * Close all connections
   */
  async closeConnections(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      this.isInitialized = false;
      logger.info('database-manager', 'Database connections closed');

    } catch (error) {
      logger.error('database-manager', 'Error closing database connections', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize database schema
   */
  private async initializeSchema(): Promise<void> {
    if (!this.pool) return;

    try {
      logger.info('database-manager', 'Initializing database schema');

      // Enable pgvector extension if configured
      if (this.config.pgvector.enabled) {
        await this.executeQuery('CREATE EXTENSION IF NOT EXISTS vector');
      }

      // Create performance metrics table
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          strategy_id VARCHAR(255) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          metrics JSONB NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Create backtest results table
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS backtest_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          strategy_id VARCHAR(255) NOT NULL,
          symbol VARCHAR(20) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          performance JSONB NOT NULL,
          trades JSONB NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Create time series data table
      await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS time_series_data (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMPTZ NOT NULL,
          metric VARCHAR(255) NOT NULL,
          value DOUBLE PRECISION NOT NULL,
          tags JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Create indexes for performance
      await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_strategy_timestamp 
        ON performance_metrics(strategy_id, timestamp DESC)
      `);

      await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_backtest_results_strategy 
        ON backtest_results(strategy_id)
      `);

      await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_time_series_metric_timestamp 
        ON time_series_data(metric, timestamp DESC)
      `);

      await this.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_time_series_tags_gin 
        ON time_series_data USING GIN(tags)
      `);

      logger.info('database-manager', 'Database schema initialized successfully');

    } catch (error) {
      logger.error('database-manager', 'Failed to initialize database schema', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Setup error handlers for the connection pool
   */
  private setupErrorHandlers(): void {
    // Pool error handler will be set up when pool is created
  }

  /**
   * Get initialization status
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * Create database manager instance from configuration
 */
export function createDatabaseManager(config: DatabaseConfig): DatabaseManager {
  return new DatabaseManager(config);
}

/**
 * Default database configuration
 */
export function getDefaultDatabaseConfig(): DatabaseConfig {
  return {
    postgresql: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'trading_agents',
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      ssl: process.env.POSTGRES_SSL === 'true',
      poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '10'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '60000'),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
      maxUses: parseInt(process.env.POSTGRES_MAX_USES || '7500'),
      allowExitOnIdle: process.env.POSTGRES_ALLOW_EXIT_ON_IDLE === 'true'
    },
    storageStrategy: {
      performanceMetrics: 'postgresql',
      backtestResults: 'postgresql',
      timeSeriesData: 'postgresql',
      graphRelationships: 'zep_graphiti',
      agentMemory: 'postgresql',
      episodicMemory: 'postgresql',
      semanticMemory: 'postgresql',
      workingMemory: 'postgresql',
      proceduralMemory: 'postgresql'
    },
    pgvector: {
      enabled: process.env.PGVECTOR_ENABLED === 'true',
      embeddingDimensions: parseInt(process.env.PGVECTOR_DIMENSIONS || '1536'),
      similarityThreshold: parseFloat(process.env.PGVECTOR_SIMILARITY_THRESHOLD || '0.8')
    }
  };
}