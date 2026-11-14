/**
 * Database Cleanup and Maintenance Jobs
 * Handles async cleanup procedures with scheduled jobs
 */

import { Pool } from 'pg';
import { createLogger } from '../src/utils/enhanced-logger';
import { TradingAgentsConfig } from '../src/types/config';

const logger = createLogger('database', 'cleanup');

export interface CleanupStats {
  expiredWorkingMemory: number;
  oldPerformanceMetrics: number;
  resolvedAlerts: number;
  totalCleaned: number;
  executionTime: number;
}

export class DatabaseCleanupService {
  private pool: Pool;
  private cleanupInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: TradingAgentsConfig) {
    if (!config.database?.postgresql) {
      throw new Error('PostgreSQL configuration is required for cleanup service');
    }

    const dbConfig = config.database.postgresql;
    this.pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.username,
      password: dbConfig.password,
      ssl: dbConfig.ssl,
      max: Math.min(dbConfig.poolSize, 3), // Limit connections for cleanup
      idleTimeoutMillis: dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    });
  }

  /**
   * Start scheduled cleanup jobs
   */
  startScheduledCleanup(intervalMinutes: number = 60): void {
    if (this.cleanupInterval) {
      logger.warn('startScheduledCleanup', 'Cleanup already scheduled');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.runCleanup();
      } catch (error) {
        logger.error('startScheduledCleanup', 'Scheduled cleanup failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, intervalMs);

    logger.info('startScheduledCleanup', `Cleanup scheduled every ${intervalMinutes} minutes`);
  }

  /**
   * Stop scheduled cleanup jobs
   */
  stopScheduledCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      logger.info('stopScheduledCleanup', 'Scheduled cleanup stopped');
    }
  }

  /**
   * Run comprehensive cleanup
   */
  async runCleanup(): Promise<CleanupStats> {
    if (this.isRunning) {
      logger.warn('runCleanup', 'Cleanup already in progress');
      throw new Error('Cleanup already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('runCleanup', 'Starting database cleanup');

      const stats: CleanupStats = {
        expiredWorkingMemory: 0,
        oldPerformanceMetrics: 0,
        resolvedAlerts: 0,
        totalCleaned: 0,
        executionTime: 0
      };

      // Clean expired working memory
      stats.expiredWorkingMemory = await this.cleanupExpiredWorkingMemory();

      // Archive old performance metrics (older than 1 year)
      stats.oldPerformanceMetrics = await this.archiveOldPerformanceMetrics(365);

      // Clean resolved alerts (older than 30 days)
      stats.resolvedAlerts = await this.cleanupResolvedAlerts(30);

      // Update statistics
      await this.updateTableStatistics();

      // Calculate totals
      stats.totalCleaned = stats.expiredWorkingMemory + stats.oldPerformanceMetrics + stats.resolvedAlerts;
      stats.executionTime = Date.now() - startTime;

      logger.info('runCleanup', 'Database cleanup completed', {
        stats,
        duration: stats.executionTime
      });

      return stats;

    } catch (error) {
      logger.error('runCleanup', 'Database cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up expired working memory entries
   */
  async cleanupExpiredWorkingMemory(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT cleanup_expired_working_memory()');
      const deletedCount = result.rows[0].cleanup_expired_working_memory;
      
      logger.info('cleanupExpiredWorkingMemory', `Cleaned ${deletedCount} expired working memory entries`);
      return deletedCount;
      
    } catch (error) {
      logger.error('cleanupExpiredWorkingMemory', 'Failed to cleanup expired working memory', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Archive old performance metrics
   */
  async archiveOldPerformanceMetrics(daysToKeep: number): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      // For now, we'll just delete old records
      // In a production system, you might want to move them to an archive table
      const result = await client.query(`
        DELETE FROM performance_metrics 
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `);
      
      const deletedCount = result.rowCount || 0;
      
      logger.info('archiveOldPerformanceMetrics', `Archived ${deletedCount} old performance metrics`);
      return deletedCount;
      
    } catch (error) {
      logger.error('archiveOldPerformanceMetrics', 'Failed to archive old performance metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clean up resolved alerts
   */
  async cleanupResolvedAlerts(daysToKeep: number): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        DELETE FROM alert_history 
        WHERE resolved = TRUE 
        AND resolved_at < NOW() - INTERVAL '${daysToKeep} days'
      `);
      
      const deletedCount = result.rowCount || 0;
      
      logger.info('cleanupResolvedAlerts', `Cleaned ${deletedCount} resolved alerts`);
      return deletedCount;
      
    } catch (error) {
      logger.error('cleanupResolvedAlerts', 'Failed to cleanup resolved alerts', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update table statistics for better query planning
   */
  async updateTableStatistics(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const tables = [
        'episodic_memory',
        'semantic_memory',
        'working_memory',
        'procedural_memory',
        'performance_metrics',
        'backtest_results',
        'trade_history',
        'system_health',
        'alert_history'
      ];

      for (const table of tables) {
        await client.query(`ANALYZE ${table}`);
      }
      
      logger.info('updateTableStatistics', 'Table statistics updated');
      
    } catch (error) {
      logger.error('updateTableStatistics', 'Failed to update table statistics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get database size information
   */
  async getDatabaseSize(): Promise<{
    totalSize: string;
    tablesSizes: Array<{ table: string; size: string; rows: number }>;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get total database size
      const totalSizeResult = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      
      // Get individual table sizes
      const tableSizesResult = await client.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations,
          n_live_tup as live_rows
        FROM pg_stat_user_tables 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      return {
        totalSize: totalSizeResult.rows[0].size,
        tablesSizes: tableSizesResult.rows.map(row => ({
          table: row.tablename,
          size: row.size,
          rows: parseInt(row.live_rows) || 0
        }))
      };
      
    } catch (error) {
      logger.error('getDatabaseSize', 'Failed to get database size', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Vacuum and reindex tables for optimal performance
   */
  async optimizeTables(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      logger.info('optimizeTables', 'Starting table optimization');
      
      const tables = [
        'episodic_memory',
        'semantic_memory',
        'working_memory',
        'procedural_memory',
        'performance_metrics',
        'backtest_results',
        'trade_history',
        'system_health',
        'alert_history'
      ];

      for (const table of tables) {
        // Vacuum analyze for each table
        await client.query(`VACUUM ANALYZE ${table}`);
        logger.info('optimizeTables', `Optimized table: ${table}`);
      }
      
      logger.info('optimizeTables', 'Table optimization completed');
      
    } catch (error) {
      logger.error('optimizeTables', 'Failed to optimize tables', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    connected: boolean;
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    lastError?: string;
  }> {
    try {
      const client = await this.pool.connect();
      
      const result = await client.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      client.release();
      
      const stats = result.rows[0];
      
      return {
        connected: true,
        activeConnections: parseInt(stats.active_connections) || 0,
        idleConnections: parseInt(stats.idle_connections) || 0,
        totalConnections: parseInt(stats.total_connections) || 0
      };
      
    } catch (error) {
      return {
        connected: false,
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        lastError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    this.stopScheduledCleanup();
    await this.pool.end();
    logger.info('close', 'Database cleanup service closed');
  }
}

/**
 * CLI function to run database cleanup
 */
export async function runDatabaseCleanup(config: TradingAgentsConfig): Promise<CleanupStats> {
  const cleanupService = new DatabaseCleanupService(config);
  
  try {
    return await cleanupService.runCleanup();
  } finally {
    await cleanupService.close();
  }
}