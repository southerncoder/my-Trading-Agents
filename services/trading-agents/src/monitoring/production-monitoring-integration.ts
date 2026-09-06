/**
 * Production Monitoring Integration
 * 
 * Integrates all production monitoring components into a unified system:
 * - Production logging configuration
 * - Dashboard management
 * - Alerting templates
 * - Backup and recovery procedures
 * - Government data monitoring
 * - Health monitoring integration
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { DatabaseManager } from '../database/database-manager.js';
import { IntegratedMonitoringSystem } from './integrated-monitoring-system.js';
import { ProductionLogger, createProductionLogger, ProductionLoggingConfig } from './production-logging-config.js';
import { ProductionDashboardManager, createProductionDashboardManager, DashboardConfig } from './production-dashboards.js';
import { AlertTemplateManager, createAlertTemplateManager } from './production-alerting-templates.js';
import { BackupRecoveryManager, createBackupRecoveryManager, BackupConfig } from './backup-recovery-procedures.js';
import { GovernmentDataMonitor, createGovernmentDataMonitor, GovernmentDataConfig } from './government-data-monitoring.js';
import { healthMonitor } from '../utils/health-monitor.js';

const logger = createLogger('system', 'production-monitoring-integration');

export interface ProductionMonitoringConfig {
  // Core monitoring settings
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  
  // Component configurations
  logging: Partial<ProductionLoggingConfig>;
  dashboards: Partial<DashboardConfig>;
  backup: Partial<BackupConfig>;
  governmentData: Partial<GovernmentDataConfig>;
  
  // Integration settings
  integration: {
    enableHealthMonitoring: boolean;
    enablePerformanceTracking: boolean;
    enableAnomalyDetection: boolean;
    enableAutomatedBackups: boolean;
    enableGovernmentDataMonitoring: boolean;
  };
  
  // Notification settings
  notifications: {
    enabled: boolean;
    channels: string[];
    criticalOnly: boolean;
  };
  
  // Security settings
  security: {
    enableLogSanitization: boolean;
    enableSecretRedaction: boolean;
    enableAccessLogging: boolean;
  };
}

export interface ProductionMonitoringStatus {
  initialized: boolean;
  components: {
    logging: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
    dashboards: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
    alerting: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
    backup: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
    governmentData: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
  };
  metrics: {
    totalAlerts: number;
    criticalAlerts: number;
    backupsCompleted: number;
    systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  };
  lastUpdate: Date;
}

/**
 * Default production monitoring configuration
 */
export const DEFAULT_PRODUCTION_MONITORING_CONFIG: ProductionMonitoringConfig = {
  enabled: true,
  environment: (process.env.NODE_ENV as any) || 'production',
  
  logging: {
    level: 'info',
    format: 'json',
    enableConsole: true,
    enableFile: true,
    enableCloudLogging: process.env.NODE_ENV === 'production'
  },
  
  dashboards: {
    refreshInterval: 30000, // 30 seconds
    dataRetention: 30, // 30 days
    enableRealTime: true,
    enableAlerts: true
  },
  
  backup: {
    schedule: {
      database: '0 2 * * *', // Daily at 2 AM
      logs: '0 1 * * *', // Daily at 1 AM
      configuration: '0 3 * * 0', // Weekly on Sunday at 3 AM
      full: '0 4 * * 0' // Weekly on Sunday at 4 AM
    },
    retention: {
      daily: 7,
      weekly: 4,
      monthly: 12,
      yearly: 3
    }
  },
  
  governmentData: {
    monitoring: {
      enabled: true,
      interval: 60000, // 1 minute
      retentionDays: 30
    }
  },
  
  integration: {
    enableHealthMonitoring: true,
    enablePerformanceTracking: true,
    enableAnomalyDetection: true,
    enableAutomatedBackups: true,
    enableGovernmentDataMonitoring: true
  },
  
  notifications: {
    enabled: true,
    channels: ['console', 'email'],
    criticalOnly: false
  },
  
  security: {
    enableLogSanitization: true,
    enableSecretRedaction: true,
    enableAccessLogging: true
  }
};

/**
 * Production Monitoring System
 */
export class ProductionMonitoringSystem {
  private config: ProductionMonitoringConfig;
  private dbManager: DatabaseManager;
  private integratedMonitoring: IntegratedMonitoringSystem;
  
  // Component managers
  private productionLogger?: ProductionLogger;
  private dashboardManager?: ProductionDashboardManager;
  private alertTemplateManager?: AlertTemplateManager;
  private backupManager?: BackupRecoveryManager;
  private governmentDataMonitor?: GovernmentDataMonitor;
  
  private isInitialized = false;
  private statusCheckInterval?: NodeJS.Timeout;

  constructor(
    dbManager: DatabaseManager,
    integratedMonitoring: IntegratedMonitoringSystem,
    config: Partial<ProductionMonitoringConfig> = {}
  ) {
    this.dbManager = dbManager;
    this.integratedMonitoring = integratedMonitoring;
    this.config = { ...DEFAULT_PRODUCTION_MONITORING_CONFIG, ...config };
    
    logger.info('production-monitoring-integration', 'Production monitoring system created', {
      environment: this.config.environment,
      enabled: this.config.enabled
    });
  }

  /**
   * Initialize the production monitoring system
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('production-monitoring-integration', 'Production monitoring disabled');
      return;
    }

    try {
      logger.info('production-monitoring-integration', 'Initializing production monitoring system');

      // Initialize production logging
      await this.initializeProductionLogging();

      // Initialize dashboard management
      await this.initializeDashboardManagement();

      // Initialize alert template management
      await this.initializeAlertTemplateManagement();

      // Initialize backup and recovery
      if (this.config.integration.enableAutomatedBackups) {
        await this.initializeBackupRecovery();
      }

      // Initialize government data monitoring
      if (this.config.integration.enableGovernmentDataMonitoring) {
        await this.initializeGovernmentDataMonitoring();
      }

      // Start integrated monitoring
      await this.integratedMonitoring.initialize();

      // Start status monitoring
      this.startStatusMonitoring();

      this.isInitialized = true;

      logger.info('production-monitoring-integration', 'Production monitoring system initialized successfully');

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to initialize production monitoring system', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Start all monitoring components
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Production monitoring system not initialized');
    }

    try {
      logger.info('production-monitoring-integration', 'Starting production monitoring system');

      // Start dashboard management
      if (this.dashboardManager) {
        await this.dashboardManager.start();
      }

      // Start backup scheduling
      if (this.backupManager) {
        await this.backupManager.start();
      }

      // Start government data monitoring
      if (this.governmentDataMonitor) {
        await this.governmentDataMonitor.start();
      }

      // Start health monitoring
      if (this.config.integration.enableHealthMonitoring) {
        healthMonitor.start();
      }

      logger.info('production-monitoring-integration', 'Production monitoring system started');

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to start production monitoring system', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Stop all monitoring components
   */
  async stop(): Promise<void> {
    try {
      logger.info('production-monitoring-integration', 'Stopping production monitoring system');

      // Stop status monitoring
      if (this.statusCheckInterval) {
        clearInterval(this.statusCheckInterval);
        this.statusCheckInterval = undefined;
      }

      // Stop dashboard management
      if (this.dashboardManager) {
        this.dashboardManager.stop();
      }

      // Stop backup scheduling
      if (this.backupManager) {
        this.backupManager.stop();
      }

      // Stop government data monitoring
      if (this.governmentDataMonitor) {
        this.governmentDataMonitor.stop();
      }

      // Stop health monitoring
      healthMonitor.stop();

      // Shutdown integrated monitoring
      await this.integratedMonitoring.shutdown();

      // Shutdown production logger
      if (this.productionLogger) {
        await this.productionLogger.shutdown();
      }

      logger.info('production-monitoring-integration', 'Production monitoring system stopped');

    } catch (error) {
      logger.error('production-monitoring-integration', 'Error stopping production monitoring system', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<ProductionMonitoringStatus> {
    try {
      const now = new Date();
      
      // Check component health
      const components = {
        logging: await this.checkLoggingHealth(),
        dashboards: await this.checkDashboardHealth(),
        alerting: await this.checkAlertingHealth(),
        backup: await this.checkBackupHealth(),
        governmentData: await this.checkGovernmentDataHealth()
      };

      // Get system metrics
      const integratedStatus = await this.integratedMonitoring.getSystemStatus();
      const activeAlerts = this.alertTemplateManager?.getEnabledTemplates().length || 0;
      const criticalAlerts = 0; // Would need to implement alert counting

      const status: ProductionMonitoringStatus = {
        initialized: this.isInitialized,
        components,
        metrics: {
          totalAlerts: activeAlerts,
          criticalAlerts,
          backupsCompleted: 0, // Would need to track from backup manager
          systemHealth: integratedStatus.metrics.systemHealth
        },
        lastUpdate: now
      };

      return status;

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to get system status', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(): Promise<any> {
    if (!this.dashboardManager) {
      throw new Error('Dashboard manager not initialized');
    }

    try {
      const dashboardData = await this.dashboardManager.getDashboardData();
      const systemStatus = await this.getSystemStatus();
      const governmentDataStatus = this.governmentDataMonitor ? 
        await this.governmentDataMonitor.getServiceHealthStatus() : null;

      return {
        ...dashboardData,
        productionMonitoring: {
          status: systemStatus,
          governmentData: governmentDataStatus
        }
      };

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to get dashboard data', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Perform system backup
   */
  async performBackup(type: 'database' | 'logs' | 'configuration' | 'full' = 'full'): Promise<any> {
    if (!this.backupManager) {
      throw new Error('Backup manager not initialized');
    }

    try {
      logger.info('production-monitoring-integration', 'Performing system backup', { type });

      let result;
      switch (type) {
        case 'database':
          result = await this.backupManager.backupDatabase();
          break;
        case 'logs':
          result = await this.backupManager.backupLogs();
          break;
        case 'configuration':
          result = await this.backupManager.backupConfiguration();
          break;
        case 'full':
          result = await this.backupManager.fullBackup();
          break;
        default:
          throw new Error(`Unknown backup type: ${type}`);
      }

      logger.info('production-monitoring-integration', 'System backup completed', {
        type,
        backupId: Array.isArray(result) ? result.map(r => r.id) : result.id
      });

      return result;

    } catch (error) {
      logger.error('production-monitoring-integration', 'System backup failed', {
        type,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string, options: { dryRun?: boolean; force?: boolean } = {}): Promise<void> {
    if (!this.backupManager) {
      throw new Error('Backup manager not initialized');
    }

    try {
      logger.info('production-monitoring-integration', 'Restoring from backup', {
        backupId,
        dryRun: options.dryRun
      });

      await this.backupManager.restoreFromBackup(backupId, options);

      logger.info('production-monitoring-integration', 'Restore completed', { backupId });

    } catch (error) {
      logger.error('production-monitoring-integration', 'Restore failed', {
        backupId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get configuration
   */
  getConfiguration(): ProductionMonitoringConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  async updateConfiguration(updates: Partial<ProductionMonitoringConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...updates };

      // Update component configurations
      if (this.productionLogger && updates.logging) {
        this.productionLogger.updateConfig(updates.logging);
      }

      if (this.dashboardManager && updates.dashboards) {
        this.dashboardManager.updateConfig(updates.dashboards);
      }

      logger.info('production-monitoring-integration', 'Configuration updated', {
        updatedKeys: Object.keys(updates)
      });

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to update configuration', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Initialize production logging
   */
  private async initializeProductionLogging(): Promise<void> {
    try {
      this.productionLogger = createProductionLogger(this.config.logging);
      
      logger.info('production-monitoring-integration', 'Production logging initialized', {
        level: this.config.logging.level,
        format: this.config.logging.format
      });

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to initialize production logging', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize dashboard management
   */
  private async initializeDashboardManagement(): Promise<void> {
    try {
      this.dashboardManager = createProductionDashboardManager(
        this.dbManager,
        this.integratedMonitoring,
        this.config.dashboards
      );

      logger.info('production-monitoring-integration', 'Dashboard management initialized');

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to initialize dashboard management', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize alert template management
   */
  private async initializeAlertTemplateManagement(): Promise<void> {
    try {
      this.alertTemplateManager = createAlertTemplateManager();

      logger.info('production-monitoring-integration', 'Alert template management initialized', {
        templateCount: this.alertTemplateManager.getAllTemplates().length
      });

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to initialize alert template management', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize backup and recovery
   */
  private async initializeBackupRecovery(): Promise<void> {
    try {
      this.backupManager = createBackupRecoveryManager(this.dbManager, this.config.backup);

      logger.info('production-monitoring-integration', 'Backup and recovery initialized');

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to initialize backup and recovery', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize government data monitoring
   */
  private async initializeGovernmentDataMonitoring(): Promise<void> {
    try {
      this.governmentDataMonitor = createGovernmentDataMonitor(this.dbManager, this.config.governmentData);

      logger.info('production-monitoring-integration', 'Government data monitoring initialized');

    } catch (error) {
      logger.error('production-monitoring-integration', 'Failed to initialize government data monitoring', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Start status monitoring
   */
  private startStatusMonitoring(): void {
    this.statusCheckInterval = setInterval(async () => {
      try {
        const status = await this.getSystemStatus();
        
        // Log status if there are issues
        if (status.metrics.systemHealth !== 'healthy') {
          logger.warn('production-monitoring-integration', 'System health degraded', {
            systemHealth: status.metrics.systemHealth,
            criticalAlerts: status.metrics.criticalAlerts
          });
        }

      } catch (error) {
        logger.error('production-monitoring-integration', 'Status check failed', {
          error: (error as Error).message
        });
      }
    }, 60000); // Every minute
  }

  /**
   * Component health check methods
   */
  private async checkLoggingHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    if (!this.productionLogger) {
      return { status: 'unhealthy', lastCheck };
    }

    try {
      const stats = this.productionLogger.getStatistics();
      const status = stats.errorCount > 100 ? 'degraded' : 'healthy'; // Arbitrary threshold
      return { status, lastCheck };
    } catch {
      return { status: 'unhealthy', lastCheck };
    }
  }

  private async checkDashboardHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    if (!this.dashboardManager) {
      return { status: 'unhealthy', lastCheck };
    }

    try {
      const cachedData = this.dashboardManager.getCachedDashboardData();
      const status = cachedData ? 'healthy' : 'degraded';
      return { status, lastCheck };
    } catch {
      return { status: 'unhealthy', lastCheck };
    }
  }

  private async checkAlertingHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    if (!this.alertTemplateManager) {
      return { status: 'unhealthy', lastCheck };
    }

    try {
      const templates = this.alertTemplateManager.getEnabledTemplates();
      const status = templates.length > 0 ? 'healthy' : 'degraded';
      return { status, lastCheck };
    } catch {
      return { status: 'unhealthy', lastCheck };
    }
  }

  private async checkBackupHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    if (!this.backupManager) {
      return { status: 'unhealthy', lastCheck };
    }

    try {
      const backups = this.backupManager.listBackups();
      const recentBackups = backups.filter(b => 
        Date.now() - b.timestamp.getTime() < (24 * 60 * 60 * 1000) // Last 24 hours
      );
      const status = recentBackups.length > 0 ? 'healthy' : 'degraded';
      return { status, lastCheck };
    } catch {
      return { status: 'unhealthy', lastCheck };
    }
  }

  private async checkGovernmentDataHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    if (!this.governmentDataMonitor) {
      return { status: 'unhealthy', lastCheck };
    }

    try {
      const healthStatus = await this.governmentDataMonitor.getServiceHealthStatus();
      const healthyServices = Object.values(healthStatus).filter(s => s.status === 'healthy').length;
      const totalServices = Object.keys(healthStatus).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (healthyServices === 0) {
        status = 'unhealthy';
      } else if (healthyServices < totalServices) {
        status = 'degraded';
      }
      
      return { status, lastCheck };
    } catch {
      return { status: 'unhealthy', lastCheck };
    }
  }
}

/**
 * Create production monitoring system
 */
export function createProductionMonitoringSystem(
  dbManager: DatabaseManager,
  integratedMonitoring: IntegratedMonitoringSystem,
  config?: Partial<ProductionMonitoringConfig>
): ProductionMonitoringSystem {
  return new ProductionMonitoringSystem(dbManager, integratedMonitoring, config);
}

/**
 * Initialize production monitoring from environment
 */
export async function initializeProductionMonitoringFromEnvironment(
  dbManager: DatabaseManager,
  integratedMonitoring: IntegratedMonitoringSystem
): Promise<ProductionMonitoringSystem> {
  const config: Partial<ProductionMonitoringConfig> = {
    enabled: process.env.PRODUCTION_MONITORING_ENABLED !== 'false',
    environment: (process.env.NODE_ENV as any) || 'production'
  };

  // Load logging configuration from environment
  if (process.env.PRODUCTION_LOG_LEVEL) {
    config.logging = {
      level: process.env.PRODUCTION_LOG_LEVEL as any,
      format: (process.env.PRODUCTION_LOG_FORMAT as any) || 'json',
      enableConsole: process.env.PRODUCTION_LOG_CONSOLE !== 'false',
      enableFile: process.env.PRODUCTION_LOG_FILE !== 'false',
      enableCloudLogging: process.env.PRODUCTION_LOG_CLOUD === 'true'
    };
  }

  // Load backup configuration from environment
  if (process.env.BACKUP_ENABLED === 'true') {
    config.backup = {
      storage: {
        local: {
          enabled: true,
          path: process.env.BACKUP_LOCAL_PATH || './backups',
          maxSize: process.env.BACKUP_MAX_SIZE || '50GB'
        },
        s3: {
          enabled: process.env.BACKUP_S3_ENABLED === 'true',
          bucket: process.env.BACKUP_S3_BUCKET || '',
          region: process.env.BACKUP_S3_REGION || 'us-east-1',
          prefix: 'trading-agents-backups'
        }
      }
    };
  }

  const system = createProductionMonitoringSystem(dbManager, integratedMonitoring, config);
  
  await system.initialize();
  await system.start();
  
  logger.info('production-monitoring-integration', 'Production monitoring system initialized from environment', {
    environment: config.environment,
    enabled: config.enabled
  });
  
  return system;
}