/**
 * Database Migration Runner
 * Handles async database migrations with proper connection management
 */

import { Pool } from 'pg';
import { createLogger } from '../src/utils/enhanced-logger';
import { TradingAgentsConfig } from '../src/types/config';
import { migration as initialSetup } from './migrations/001-initial-setup';

const logger = createLogger('database', 'migrate');

export interface Migration {
  version: string;
  name: string;
  description: string;
  up: (context: MigrationContext) => Promise<void>;
  down: (context: MigrationContext) => Promise<void>;
}

export interface MigrationContext {
  pool: Pool;
}

export interface MigrationRecord {
  version: string;
  name: string;
  applied_at: Date;
}

export class DatabaseMigrator {
  private pool: Pool;
  private migrations: Migration[] = [];

  constructor(config: TradingAgentsConfig) {
    if (!config.database?.postgresql) {
      throw new Error('PostgreSQL configuration is required for migrations');
    }

    const dbConfig = config.database.postgresql;
    this.pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.username,
      password: dbConfig.password,
      ssl: dbConfig.ssl,
      max: Math.min(dbConfig.poolSize, 5), // Limit connections for migrations
      idleTimeoutMillis: dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    });

    // Register migrations
    this.registerMigrations();
  }

  private registerMigrations(): void {
    this.migrations = [
      initialSetup
    ];
  }

  /**
   * Initialize migration tracking table
   */
  async initializeMigrationTable(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      
      logger.info('initializeMigrationTable', 'Migration tracking table initialized');
    } catch (error) {
      logger.error('initializeMigrationTable', 'Failed to initialize migration table', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT version, name, applied_at 
        FROM schema_migrations 
        ORDER BY version
      `);
      
      return result.rows.map(row => ({
        version: row.version,
        name: row.name,
        applied_at: row.applied_at
      }));
    } catch (error) {
      logger.error('getAppliedMigrations', 'Failed to get applied migrations', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    
    return this.migrations.filter(migration => !appliedVersions.has(migration.version));
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    await this.initializeMigrationTable();
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      logger.info('migrate', 'No pending migrations');
      return;
    }

    logger.info('migrate', `Running ${pendingMigrations.length} pending migrations`, {
      migrations: pendingMigrations.map(m => `${m.version}: ${m.name}`)
    });

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    logger.info('migrate', 'All migrations completed successfully');
  }

  /**
   * Run a specific migration
   */
  async runMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info('runMigration', `Running migration ${migration.version}: ${migration.name}`);
      
      // Run the migration
      await migration.up({ pool: this.pool });
      
      // Record the migration
      await client.query(`
        INSERT INTO schema_migrations (version, name, description, applied_at)
        VALUES ($1, $2, $3, NOW())
      `, [migration.version, migration.name, migration.description]);
      
      await client.query('COMMIT');
      
      logger.info('runMigration', `Migration ${migration.version} completed successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('runMigration', `Migration ${migration.version} failed`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      logger.info('rollback', 'No migrations to rollback');
      return;
    }

    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    const migration = this.migrations.find(m => m.version === lastMigration.version);
    
    if (!migration) {
      throw new Error(`Migration ${lastMigration.version} not found in registered migrations`);
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info('rollback', `Rolling back migration ${migration.version}: ${migration.name}`);
      
      // Run the rollback
      await migration.down({ pool: this.pool });
      
      // Remove the migration record
      await client.query(`
        DELETE FROM schema_migrations WHERE version = $1
      `, [migration.version]);
      
      await client.query('COMMIT');
      
      logger.info('rollback', `Migration ${migration.version} rolled back successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('rollback', `Rollback of migration ${migration.version} failed`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database connection
   */
  async checkConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error('checkConnection', 'Database connection failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    connected: boolean;
    appliedMigrations: MigrationRecord[];
    pendingMigrations: Migration[];
  }> {
    const connected = await this.checkConnection();
    
    if (!connected) {
      return {
        connected: false,
        appliedMigrations: [],
        pendingMigrations: []
      };
    }

    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = await this.getPendingMigrations();

    return {
      connected: true,
      appliedMigrations,
      pendingMigrations
    };
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('close', 'Database connections closed');
  }
}

/**
 * CLI function to run migrations
 */
export async function runMigrations(config: TradingAgentsConfig): Promise<void> {
  const migrator = new DatabaseMigrator(config);
  
  try {
    await migrator.migrate();
  } finally {
    await migrator.close();
  }
}

/**
 * CLI function to check migration status
 */
export async function checkMigrationStatus(config: TradingAgentsConfig): Promise<void> {
  const migrator = new DatabaseMigrator(config);
  
  try {
    const status = await migrator.getStatus();
    
    console.log('Database Migration Status:');
    console.log(`Connected: ${status.connected}`);
    console.log(`Applied Migrations: ${status.appliedMigrations.length}`);
    console.log(`Pending Migrations: ${status.pendingMigrations.length}`);
    
    if (status.appliedMigrations.length > 0) {
      console.log('\nApplied Migrations:');
      status.appliedMigrations.forEach(m => {
        console.log(`  ${m.version}: ${m.name} (${m.applied_at.toISOString()})`);
      });
    }
    
    if (status.pendingMigrations.length > 0) {
      console.log('\nPending Migrations:');
      status.pendingMigrations.forEach(m => {
        console.log(`  ${m.version}: ${m.name}`);
      });
    }
  } finally {
    await migrator.close();
  }
}