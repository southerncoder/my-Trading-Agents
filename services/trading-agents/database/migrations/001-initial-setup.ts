/**
 * Database Migration: Initial Setup
 * Creates the complete database schema with async optimization
 */

import { Pool, PoolClient } from 'pg';
import { createLogger } from '../../src/utils/enhanced-logger';

const logger = createLogger('database', 'migration-001');

export interface MigrationContext {
  pool: Pool;
  client?: PoolClient;
}

export async function up(context: MigrationContext): Promise<void> {
  const { pool } = context;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    logger.info('up', 'Starting initial database setup migration');
    
    // Create extensions
    await createExtensions(client);
    
    // Create schema
    await createSchema(client);
    
    // Create indexes
    await createIndexes(client);
    
    // Create functions and triggers
    await createFunctionsAndTriggers(client);
    
    // Insert initial data if needed
    await insertInitialData(client);
    
    await client.query('COMMIT');
    logger.info('up', 'Initial database setup migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('up', 'Migration failed, rolling back', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function down(context: MigrationContext): Promise<void> {
  const { pool } = context;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    logger.info('down', 'Starting rollback of initial database setup');
    
    // Drop tables in reverse order (respecting foreign key constraints)
    const tables = [
      'alert_history',
      'system_health',
      'trade_history',
      'backtest_results',
      'performance_metrics',
      'procedural_memory',
      'working_memory',
      'semantic_memory',
      'episodic_memory'
    ];
    
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      logger.info('down', `Dropped table: ${table}`);
    }
    
    // Drop functions
    await client.query('DROP FUNCTION IF EXISTS cleanup_expired_working_memory() CASCADE');
    await client.query('DROP FUNCTION IF EXISTS archive_old_performance_metrics(INTEGER) CASCADE');
    await client.query('DROP FUNCTION IF EXISTS update_semantic_memory_timestamp() CASCADE');
    await client.query('DROP FUNCTION IF EXISTS increment_procedural_frequency(UUID) CASCADE');
    
    await client.query('COMMIT');
    logger.info('down', 'Database rollback completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('down', 'Rollback failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    client.release();
  }
}

async function createExtensions(client: PoolClient): Promise<void> {
  logger.info('createExtensions', 'Creating PostgreSQL extensions');
  
  const extensions = [
    'CREATE EXTENSION IF NOT EXISTS vector',
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
    'CREATE EXTENSION IF NOT EXISTS btree_gin',
    'CREATE EXTENSION IF NOT EXISTS btree_gist'
  ];
  
  for (const extension of extensions) {
    await client.query(extension);
  }
  
  logger.info('createExtensions', 'Extensions created successfully');
}

async function createSchema(client: PoolClient): Promise<void> {
  logger.info('createSchema', 'Creating database schema');
  
  // Episodic Memory
  await client.query(`
    CREATE TABLE IF NOT EXISTS episodic_memory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      agent_id VARCHAR(255) NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      interaction_type VARCHAR(50) NOT NULL,
      context JSONB NOT NULL DEFAULT '{}',
      input TEXT NOT NULL,
      output TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  // Semantic Memory
  await client.query(`
    CREATE TABLE IF NOT EXISTS semantic_memory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fact_type VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      embedding vector(1536),
      confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
      source VARCHAR(255) NOT NULL,
      tags TEXT[] DEFAULT '{}',
      related_entities TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  // Working Memory
  await client.query(`
    CREATE TABLE IF NOT EXISTS working_memory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id VARCHAR(255) NOT NULL,
      agent_id VARCHAR(255) NOT NULL,
      context_type VARCHAR(50) NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      priority INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  // Procedural Memory
  await client.query(`
    CREATE TABLE IF NOT EXISTS procedural_memory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL,
      pattern_type VARCHAR(50) NOT NULL,
      pattern JSONB NOT NULL DEFAULT '{}',
      frequency INTEGER NOT NULL DEFAULT 1,
      confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
      last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  // Performance Metrics
  await client.query(`
    CREATE TABLE IF NOT EXISTS performance_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      strategy_id VARCHAR(255) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      decision VARCHAR(10) NOT NULL CHECK (decision IN ('BUY', 'SELL', 'HOLD')),
      confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
      risk_score DECIMAL(5,3),
      position_size DECIMAL(10,4),
      actual_return DECIMAL(10,6),
      benchmark_return DECIMAL(10,6),
      execution_time_ms INTEGER,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  // Backtest Results
  await client.query(`
    CREATE TABLE IF NOT EXISTS backtest_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      backtest_id VARCHAR(255) NOT NULL,
      strategy_name VARCHAR(255) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      initial_capital DECIMAL(15,2) NOT NULL,
      final_capital DECIMAL(15,2) NOT NULL,
      total_return DECIMAL(10,6) NOT NULL,
      annualized_return DECIMAL(10,6) NOT NULL,
      volatility DECIMAL(10,6) NOT NULL,
      sharpe_ratio DECIMAL(10,6),
      max_drawdown DECIMAL(10,6),
      win_rate DECIMAL(5,4),
      total_trades INTEGER NOT NULL DEFAULT 0,
      profitable_trades INTEGER NOT NULL DEFAULT 0,
      configuration JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  // Trade History
  await client.query(`
    CREATE TABLE IF NOT EXISTS trade_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      backtest_id VARCHAR(255),
      strategy_id VARCHAR(255) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
      quantity DECIMAL(15,4) NOT NULL,
      price DECIMAL(15,4) NOT NULL,
      commission DECIMAL(10,4) DEFAULT 0,
      slippage DECIMAL(10,6) DEFAULT 0,
      market_impact DECIMAL(10,6) DEFAULT 0,
      execution_timestamp TIMESTAMPTZ NOT NULL,
      pnl DECIMAL(15,4),
      cumulative_pnl DECIMAL(15,4),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  // System Health
  await client.query(`
    CREATE TABLE IF NOT EXISTS system_health (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      component VARCHAR(100) NOT NULL,
      metric_name VARCHAR(100) NOT NULL,
      metric_value DECIMAL(15,6) NOT NULL,
      unit VARCHAR(20),
      status VARCHAR(20) NOT NULL CHECK (status IN ('HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN')),
      threshold_warning DECIMAL(15,6),
      threshold_critical DECIMAL(15,6),
      metadata JSONB DEFAULT '{}',
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  // Alert History
  await client.query(`
    CREATE TABLE IF NOT EXISTS alert_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      alert_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      component VARCHAR(100),
      acknowledged BOOLEAN DEFAULT FALSE,
      acknowledged_by VARCHAR(255),
      acknowledged_at TIMESTAMPTZ,
      resolved BOOLEAN DEFAULT FALSE,
      resolved_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  logger.info('createSchema', 'Database schema created successfully');
}

async function createIndexes(client: PoolClient): Promise<void> {
  logger.info('createIndexes', 'Creating optimized indexes');
  
  const indexes = [
    // Episodic memory indexes
    'CREATE INDEX IF NOT EXISTS idx_episodic_session_timestamp ON episodic_memory(session_id, timestamp DESC)',
    'CREATE INDEX IF NOT EXISTS idx_episodic_user_agent ON episodic_memory(user_id, agent_id)',
    'CREATE INDEX IF NOT EXISTS idx_episodic_interaction_type ON episodic_memory(interaction_type)',
    'CREATE INDEX IF NOT EXISTS idx_episodic_context_gin ON episodic_memory USING GIN(context)',
    
    // Semantic memory indexes
    'CREATE INDEX IF NOT EXISTS idx_semantic_embedding ON semantic_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)',
    'CREATE INDEX IF NOT EXISTS idx_semantic_fact_type ON semantic_memory(fact_type)',
    'CREATE INDEX IF NOT EXISTS idx_semantic_tags_gin ON semantic_memory USING GIN(tags)',
    
    // Working memory indexes
    'CREATE INDEX IF NOT EXISTS idx_working_session_agent ON working_memory(session_id, agent_id)',
    'CREATE INDEX IF NOT EXISTS idx_working_expires ON working_memory(expires_at)',
    
    // Performance metrics indexes
    'CREATE INDEX IF NOT EXISTS idx_performance_strategy_timestamp ON performance_metrics(strategy_id, timestamp DESC)',
    'CREATE INDEX IF NOT EXISTS idx_performance_symbol_timestamp ON performance_metrics(symbol, timestamp DESC)',
    
    // Backtest results indexes
    'CREATE INDEX IF NOT EXISTS idx_backtest_strategy_symbol ON backtest_results(strategy_name, symbol)',
    'CREATE INDEX IF NOT EXISTS idx_backtest_performance ON backtest_results(total_return DESC, sharpe_ratio DESC)',
    
    // Trade history indexes
    'CREATE INDEX IF NOT EXISTS idx_trade_strategy_symbol ON trade_history(strategy_id, symbol)',
    'CREATE INDEX IF NOT EXISTS idx_trade_execution_time ON trade_history(execution_timestamp DESC)',
    
    // System health indexes
    'CREATE INDEX IF NOT EXISTS idx_health_component_timestamp ON system_health(component, timestamp DESC)',
    'CREATE INDEX IF NOT EXISTS idx_health_status ON system_health(status)',
    
    // Alert history indexes
    'CREATE INDEX IF NOT EXISTS idx_alert_type_created ON alert_history(alert_type, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_alert_severity ON alert_history(severity)'
  ];
  
  for (const index of indexes) {
    await client.query(index);
  }
  
  logger.info('createIndexes', 'Indexes created successfully');
}

async function createFunctionsAndTriggers(client: PoolClient): Promise<void> {
  logger.info('createFunctionsAndTriggers', 'Creating database functions and triggers');
  
  // Cleanup function for expired working memory
  await client.query(`
    CREATE OR REPLACE FUNCTION cleanup_expired_working_memory()
    RETURNS INTEGER AS $$
    DECLARE
        deleted_count INTEGER;
    BEGIN
        DELETE FROM working_memory WHERE expires_at < NOW();
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Update timestamp trigger function
  await client.query(`
    CREATE OR REPLACE FUNCTION update_semantic_memory_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Create trigger
  await client.query(`
    CREATE TRIGGER trigger_semantic_memory_updated
        BEFORE UPDATE ON semantic_memory
        FOR EACH ROW
        EXECUTE FUNCTION update_semantic_memory_timestamp();
  `);
  
  // Increment frequency function
  await client.query(`
    CREATE OR REPLACE FUNCTION increment_procedural_frequency(memory_id UUID)
    RETURNS VOID AS $$
    BEGIN
        UPDATE procedural_memory 
        SET frequency = frequency + 1,
            last_used = NOW(),
            updated_at = NOW()
        WHERE id = memory_id;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  logger.info('createFunctionsAndTriggers', 'Functions and triggers created successfully');
}

async function insertInitialData(client: PoolClient): Promise<void> {
  logger.info('insertInitialData', 'Inserting initial data');
  
  // Insert initial system health record
  await client.query(`
    INSERT INTO system_health (component, metric_name, metric_value, unit, status)
    VALUES ('database', 'initialization', 1.0, 'boolean', 'HEALTHY')
    ON CONFLICT DO NOTHING
  `);
  
  logger.info('insertInitialData', 'Initial data inserted successfully');
}

export const migration = {
  version: '001',
  name: 'initial-setup',
  description: 'Create initial database schema with async optimization',
  up,
  down
};