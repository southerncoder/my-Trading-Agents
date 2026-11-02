/**
 * Monitoring System Initialization
 * 
 * Initializes the integrated monitoring system with existing infrastructure including:
 * - Winston logging integration
 * - Health monitoring setup
 * - PostgreSQL schema initialization
 * - Zep Graphiti memory integration
 * - Docker environment compatibility
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { createLogger } from '../utils/enhanced-logger.js';
import { DatabaseManager } from '../database/database-manager.js';
import { IntegratedMonitoringSystem, createIntegratedMonitoringSystem } from './integrated-monitoring-system.js';
import { loadEnvironmentAwareConfig, validateMonitoringConfig } from './monitoring-config-integration.js';
import { healthMonitor, startHealthMonitoring } from '../utils/health-monitor.js';
import { initializeResilienceIntegration } from '../utils/enhanced-error-integration.js';

const logger = createLogger('system', 'monitoring-init');

export interface MonitoringInitializationOptions {
  // Environment configuration
  environment?: 'development' | 'staging' | 'production';
  configOverrides?: any;
  
  // Database options
  skipSchemaInit?: boolean;
  skipDataMigration?: boolean;
  
  // Component options
  enablePerformanceMonitoring?: boolean;
  enableAnomalyDetection?: boolean;
  enableAlerting?: boolean;
  enableHealthMonitoring?: boolean;
  
  // Integration options
  integrateWithExistingLogger?: boolean;
  integrateWithHealthMonitor?: boolean;
  integrateWithResilience?: boolean;
  
  // Startup options
  waitForDependencies?: boolean;
  dependencyTimeout?: number; // milliseconds
}

export interface MonitoringInitializationResult {
  success: boolean;
  monitoringSystem: IntegratedMonitoringSystem | null;
  errors: string[];
  warnings: string[];
  componentsInitialized: {
    database: boolean;
    performanceMonitoring: boolean;
    alerting: boolean;
    anomalyDetection: boolean;
    healthMonitoring: boolean;
    logging: boolean;
    resilience: boolean;
  };
  initializationTime: number; // milliseconds
}

/**
 * Initialize the complete monitoring system
 */
export async function initializeMonitoringSystem(
  options: MonitoringInitializationOptions = {}
): Promise<MonitoringInitializationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let monitoringSystem: IntegratedMonitoringSystem | null = null;

  const componentsInitialized = {
    database: false,
    performanceMonitoring: false,
    alerting: false,
    anomalyDetection: false,
    healthMonitoring: false,
    logging: false,
    resilience: false
  };

  try {
    logger.info('monitoring-init', 'Starting monitoring system initialization', {
      environment: options.environment || process.env.NODE_ENV || 'development',
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableAlerting: options.enableAlerting !== false,
      enableAnomalyDetection: options.enableAnomalyDetection !== false
    });

    // Step 1: Load and validate configuration
    const config = loadEnvironmentAwareConfig(options.environment);
    
    // Apply configuration overrides
    if (options.configOverrides) {
      Object.assign(config, options.configOverrides);
    }

    // Apply component-specific options
    if (options.enablePerformanceMonitoring !== undefined) {
      config.performance.enabled = options.enablePerformanceMonitoring;
    }
    if (options.enableAnomalyDetection !== undefined) {
      config.anomalyDetection.enabled = options.enableAnomalyDetection;
    }
    if (options.enableAlerting !== undefined) {
      config.alerting.enabled = options.enableAlerting;
    }
    if (options.enableHealthMonitoring !== undefined) {
      config.healthMonitoring.enabled = options.enableHealthMonitoring;
    }

    // Validate configuration
    const validation = validateMonitoringConfig(config);
    if (!validation.valid) {
      errors.push(...validation.errors);
      logger.error('monitoring-init', 'Configuration validation failed', {
        errors: validation.errors
      });
      
      return {
        success: false,
        monitoringSystem: null,
        errors,
        warnings,
        componentsInitialized,
        initializationTime: Date.now() - startTime
      };
    }

    logger.info('monitoring-init', 'Configuration validated successfully');

    // Step 2: Wait for dependencies if requested
    if (options.waitForDependencies) {
      await waitForDependencies(options.dependencyTimeout || 60000);
    }

    // Step 3: Initialize database schema
    if (config.database.enabled && !options.skipSchemaInit) {
      try {
        await initializeDatabaseSchema(config.database.config);
        componentsInitialized.database = true;
        logger.info('monitoring-init', 'Database schema initialized');
      } catch (error) {
        const errorMsg = `Failed to initialize database schema: ${(error as Error).message}`;
        errors.push(errorMsg);
        logger.error('monitoring-init', errorMsg);
      }
    }

    // Step 4: Integrate with existing logging system
    if (options.integrateWithExistingLogger !== false) {
      try {
        await integrateWithLoggingSystem(config);
        componentsInitialized.logging = true;
        logger.info('monitoring-init', 'Logging system integration completed');
      } catch (error) {
        const errorMsg = `Failed to integrate with logging system: ${(error as Error).message}`;
        warnings.push(errorMsg);
        logger.warn('monitoring-init', errorMsg);
      }
    }

    // Step 5: Integrate with health monitoring
    if (options.integrateWithHealthMonitor !== false && config.healthMonitoring.enabled) {
      try {
        await integrateWithHealthMonitoring();
        componentsInitialized.healthMonitoring = true;
        logger.info('monitoring-init', 'Health monitoring integration completed');
      } catch (error) {
        const errorMsg = `Failed to integrate with health monitoring: ${(error as Error).message}`;
        warnings.push(errorMsg);
        logger.warn('monitoring-init', errorMsg);
      }
    }

    // Step 6: Integrate with resilience system
    if (options.integrateWithResilience !== false) {
      try {
        await initializeResilienceIntegration();
        componentsInitialized.resilience = true;
        logger.info('monitoring-init', 'Resilience system integration completed');
      } catch (error) {
        const errorMsg = `Failed to integrate with resilience system: ${(error as Error).message}`;
        warnings.push(errorMsg);
        logger.warn('monitoring-init', errorMsg);
      }
    }

    // Step 7: Create and initialize monitoring system
    try {
      monitoringSystem = createIntegratedMonitoringSystem(config);
      await monitoringSystem.initialize();

      // Check which components were successfully initialized
      const systemStatus = await monitoringSystem.getSystemStatus();
      componentsInitialized.performanceMonitoring = systemStatus.components.performance.status === 'healthy';
      componentsInitialized.alerting = systemStatus.components.alerting.status === 'healthy';
      componentsInitialized.anomalyDetection = systemStatus.components.anomalyDetection.status === 'healthy';

      logger.info('monitoring-init', 'Integrated monitoring system initialized successfully', {
        componentsInitialized
      });

    } catch (error) {
      const errorMsg = `Failed to initialize monitoring system: ${(error as Error).message}`;
      errors.push(errorMsg);
      logger.error('monitoring-init', errorMsg);
    }

    // Step 8: Perform data migration if needed
    if (!options.skipDataMigration && monitoringSystem) {
      try {
        await performDataMigration(monitoringSystem);
        logger.info('monitoring-init', 'Data migration completed');
      } catch (error) {
        const errorMsg = `Data migration failed: ${(error as Error).message}`;
        warnings.push(errorMsg);
        logger.warn('monitoring-init', errorMsg);
      }
    }

    // Step 9: Start monitoring intervals
    if (monitoringSystem) {
      try {
        // The monitoring system starts its own intervals during initialization
        logger.info('monitoring-init', 'Monitoring intervals started');
      } catch (error) {
        const errorMsg = `Failed to start monitoring intervals: ${(error as Error).message}`;
        warnings.push(errorMsg);
        logger.warn('monitoring-init', errorMsg);
      }
    }

    const initializationTime = Date.now() - startTime;
    const success = errors.length === 0 && monitoringSystem !== null;

    logger.info('monitoring-init', 'Monitoring system initialization completed', {
      success,
      initializationTime,
      errorCount: errors.length,
      warningCount: warnings.length,
      componentsInitialized
    });

    return {
      success,
      monitoringSystem,
      errors,
      warnings,
      componentsInitialized,
      initializationTime
    };

  } catch (error) {
    const errorMsg = `Monitoring system initialization failed: ${(error as Error).message}`;
    errors.push(errorMsg);
    logger.error('monitoring-init', errorMsg);

    return {
      success: false,
      monitoringSystem: null,
      errors,
      warnings,
      componentsInitialized,
      initializationTime: Date.now() - startTime
    };
  }
}

/**
 * Wait for required dependencies to be available
 */
async function waitForDependencies(timeout: number): Promise<void> {
  logger.info('monitoring-init', 'Waiting for dependencies', { timeout });

  const startTime = Date.now();
  const checkInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeout) {
    try {
      // Check PostgreSQL availability
      if (process.env.POSTGRES_HOST) {
        const dbConfig = {
          postgresql: {
            host: process.env.POSTGRES_HOST,
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            database: process.env.POSTGRES_DB || 'trading_agents',
            username: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'password',
            ssl: process.env.POSTGRES_SSL === 'true',
            poolSize: 1, // Minimal for health check
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 5000,
            maxUses: 1,
            allowExitOnIdle: true
          },
          storageStrategy: {} as any,
          pgvector: { enabled: false, embeddingDimensions: 1536, similarityThreshold: 0.8 }
        };

        const testDb = new DatabaseManager(dbConfig);
        await testDb.initializeConnections();
        await testDb.closeConnections();
      }

      // Check Zep Graphiti availability
      if (process.env.ZEP_GRAPHITI_URL) {
        const response = await fetch(`${process.env.ZEP_GRAPHITI_URL}/health`, {
          signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) {
          throw new Error(`Zep Graphiti health check failed: ${response.status}`);
        }
      }

      // Check Redis availability if configured
      if (process.env.REDIS_HOST) {
        // Simple TCP connection check would go here
        // For now, we'll assume it's available if the env var is set
      }

      logger.info('monitoring-init', 'All dependencies are available');
      return;

    } catch (error) {
      logger.debug('monitoring-init', 'Dependencies not yet available, retrying', {
        error: (error as Error).message,
        elapsed: Date.now() - startTime
      });

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  throw new Error(`Dependencies not available within ${timeout}ms timeout`);
}

/**
 * Initialize database schema for monitoring
 */
async function initializeDatabaseSchema(dbConfig: any): Promise<void> {
  logger.info('monitoring-init', 'Initializing database schema');

  const dbManager = new DatabaseManager(dbConfig);
  
  try {
    await dbManager.initializeConnections();

    // Read and execute the monitoring schema SQL
    const schemaPath = join(__dirname, 'monitoring-schema.sql');
    const schemaSql = await readFile(schemaPath, 'utf-8');

    // Split SQL into individual statements and execute them
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await dbManager.executeQuery(statement);
      }
    }

    logger.info('monitoring-init', 'Database schema initialized successfully', {
      statementCount: statements.length
    });

  } finally {
    await dbManager.closeConnections();
  }
}

/**
 * Integrate with existing logging system
 */
async function integrateWithLoggingSystem(config: any): Promise<void> {
  logger.info('monitoring-init', 'Integrating with logging system');

  // The logging integration is already handled by the enhanced logger
  // We just need to ensure monitoring-specific log contexts are set up

  // Set log level based on monitoring configuration
  if (config.logging.logLevel) {
    const { setGlobalLogLevel } = await import('../utils/enhanced-logger.js');
    setGlobalLogLevel(config.logging.logLevel);
  }

  // Enable performance logging if configured
  if (config.logging.enablePerformanceLogs) {
    logger.info('monitoring-init', 'Performance logging enabled');
  }

  // Enable health logging if configured
  if (config.logging.enableHealthLogs) {
    logger.info('monitoring-init', 'Health logging enabled');
  }

  logger.info('monitoring-init', 'Logging system integration completed');
}

/**
 * Integrate with existing health monitoring
 */
async function integrateWithHealthMonitoring(): Promise<void> {
  logger.info('monitoring-init', 'Integrating with health monitoring');

  try {
    // Start the global health monitor if not already running
    startHealthMonitoring();

    // The health monitor is already initialized globally
    // We just need to ensure it's running and accessible
    const systemHealth = await healthMonitor.performHealthCheck();
    
    logger.info('monitoring-init', 'Health monitoring integration completed', {
      systemHealth: systemHealth.overall,
      serviceCount: systemHealth.services.length
    });

  } catch (error) {
    logger.error('monitoring-init', 'Failed to integrate with health monitoring', {
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Perform data migration for monitoring system
 */
async function performDataMigration(monitoringSystem: IntegratedMonitoringSystem): Promise<void> {
  logger.info('monitoring-init', 'Starting data migration');

  try {
    // Check if this is a fresh installation or an upgrade
    const systemStatus = await monitoringSystem.getSystemStatus();
    
    if (systemStatus.initialized) {
      // Collect initial metrics to populate the system
      await monitoringSystem.collectIntegratedMetrics();
      
      // Process any pending alerts
      await monitoringSystem.processSystemAlerts();
      
      logger.info('monitoring-init', 'Initial data collection completed');
    }

  } catch (error) {
    logger.error('monitoring-init', 'Data migration failed', {
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Shutdown monitoring system gracefully
 */
export async function shutdownMonitoringSystem(monitoringSystem: IntegratedMonitoringSystem): Promise<void> {
  logger.info('monitoring-init', 'Shutting down monitoring system');

  try {
    await monitoringSystem.shutdown();
    logger.info('monitoring-init', 'Monitoring system shutdown completed');
  } catch (error) {
    logger.error('monitoring-init', 'Error during monitoring system shutdown', {
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Health check for monitoring system
 */
export async function checkMonitoringSystemHealth(
  monitoringSystem: IntegratedMonitoringSystem
): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    const systemStatus = await monitoringSystem.getSystemStatus();
    
    // Check if system is initialized
    if (!systemStatus.initialized) {
      issues.push('Monitoring system not initialized');
    }

    // Check component health
    Object.entries(systemStatus.components).forEach(([component, health]) => {
      if (health.status !== 'healthy') {
        issues.push(`${component} is ${health.status}`);
      }
    });

    // Check system metrics
    if (systemStatus.metrics.systemHealth !== 'healthy') {
      issues.push(`System health is ${systemStatus.metrics.systemHealth}`);
    }

    const healthy = issues.length === 0;

    logger.debug('monitoring-init', 'Monitoring system health check completed', {
      healthy,
      issueCount: issues.length
    });

    return { healthy, issues };

  } catch (error) {
    issues.push(`Health check failed: ${(error as Error).message}`);
    return { healthy: false, issues };
  }
}

/**
 * Get monitoring system status for external monitoring
 */
export async function getMonitoringSystemStatus(
  monitoringSystem: IntegratedMonitoringSystem
): Promise<any> {
  try {
    const [systemStatus, dashboardData] = await Promise.all([
      monitoringSystem.getSystemStatus(),
      monitoringSystem.generateDashboardData()
    ]);

    return {
      status: systemStatus,
      dashboard: dashboardData,
      timestamp: new Date()
    };

  } catch (error) {
    logger.error('monitoring-init', 'Failed to get monitoring system status', {
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Create monitoring system with Docker environment integration
 */
export async function createDockerIntegratedMonitoringSystem(): Promise<IntegratedMonitoringSystem> {
  logger.info('monitoring-init', 'Creating Docker-integrated monitoring system');

  // Load configuration from Docker environment
  const config = loadEnvironmentAwareConfig();

  // Create monitoring system
  const monitoringSystem = createIntegratedMonitoringSystem(config);

  logger.info('monitoring-init', 'Docker-integrated monitoring system created');

  return monitoringSystem;
}

/**
 * Initialize monitoring for CLI usage
 */
export async function initializeCliMonitoring(): Promise<IntegratedMonitoringSystem> {
  logger.info('monitoring-init', 'Initializing monitoring for CLI usage');

  const options: MonitoringInitializationOptions = {
    environment: 'development',
    enablePerformanceMonitoring: true,
    enableAnomalyDetection: false, // Disable for CLI to reduce overhead
    enableAlerting: false, // Disable for CLI
    enableHealthMonitoring: true,
    integrateWithExistingLogger: true,
    integrateWithHealthMonitor: true,
    integrateWithResilience: false, // Disable for CLI
    waitForDependencies: false, // Don't wait for dependencies in CLI
    skipDataMigration: true // Skip migration for CLI
  };

  const result = await initializeMonitoringSystem(options);

  if (!result.success || !result.monitoringSystem) {
    throw new Error(`Failed to initialize CLI monitoring: ${result.errors.join(', ')}`);
  }

  logger.info('monitoring-init', 'CLI monitoring initialized successfully');

  return result.monitoringSystem;
}

/**
 * Initialize monitoring for production deployment
 */
export async function initializeProductionMonitoring(): Promise<IntegratedMonitoringSystem> {
  logger.info('monitoring-init', 'Initializing monitoring for production deployment');

  const options: MonitoringInitializationOptions = {
    environment: 'production',
    enablePerformanceMonitoring: true,
    enableAnomalyDetection: true,
    enableAlerting: true,
    enableHealthMonitoring: true,
    integrateWithExistingLogger: true,
    integrateWithHealthMonitor: true,
    integrateWithResilience: true,
    waitForDependencies: true,
    dependencyTimeout: 120000, // 2 minutes
    skipDataMigration: false
  };

  const result = await initializeMonitoringSystem(options);

  if (!result.success || !result.monitoringSystem) {
    throw new Error(`Failed to initialize production monitoring: ${result.errors.join(', ')}`);
  }

  logger.info('monitoring-init', 'Production monitoring initialized successfully', {
    initializationTime: result.initializationTime,
    componentsInitialized: result.componentsInitialized
  });

  return result.monitoringSystem;
}