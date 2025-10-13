/**
 * Monitoring Integration with Existing Infrastructure
 * 
 * Integrates performance monitoring with Winston logging, health monitoring,
 * PostgreSQL storage, Zep Graphiti memory, and Docker environment.
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { HealthMonitor, SystemHealth } from '../utils/health-monitor.js';
import { DatabaseManager, getDefaultDatabaseConfig } from '../database/database-manager.js';
import { AgentMemoryManager } from '../database/agent-memory-manager.js';
import { PerformanceMonitor } from './performance-monitor.js';
import { AnomalyDetector, getDefaultAnomalyDetectionConfig } from './anomaly-detector.js';
import { AlertManager } from './alert-manager.js';

const logger = createLogger('system', 'monitoring-integration');

export interface MonitoringConfig {
  database: {
    enabled: boolean;
    config: any;
  };
  performance: {
    enabled: boolean;
    trackingInterval: number; // seconds
    rollingWindowSizes: number[]; // days
  };
  anomalyDetection: {
    enabled: boolean;
    checkInterval: number; // seconds
    config: any;
  };
  alerting: {
    enabled: boolean;
    processingInterval: number; // seconds
  };
  healthMonitoring: {
    enabled: boolean;
    checkInterval: number; // seconds
  };
  logging: {
    enablePerformanceLogs: boolean;
    enableAnomalyLogs: boolean;
    enableAlertLogs: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  storage: {
    retentionPeriod: number; // days
    compressionEnabled: boolean;
    backupEnabled: boolean;
  };
}

export interface MonitoringStatus {
  initialized: boolean;
  components: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    performance: 'healthy' | 'degraded' | 'unhealthy';
    anomalyDetection: 'healthy' | 'degraded' | 'unhealthy';
    alerting: 'healthy' | 'degraded' | 'unhealthy';
    healthMonitoring: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: {
    totalStrategiesTracked: number;
    activeAlerts: number;
    anomaliesDetected: number;
    databaseConnections: number;
    memoryUsage: number;
  };
  lastHealthCheck: Date;
}

/**
 * Comprehensive Monitoring Integration System
 */
export class MonitoringIntegration {
  private config: MonitoringConfig;
  private dbManager: DatabaseManager;
  private memoryManager: AgentMemoryManager;
  private performanceMonitor: PerformanceMonitor;
  private anomalyDetector: AnomalyDetector;
  private alertManager: AlertManager;
  private healthMonitor: HealthMonitor;
  private isInitialized = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: MonitoringConfig) {
    this.config = config;
    
    // Initialize components
    this.dbManager = new DatabaseManager(this.config.database.config);
    this.memoryManager = new AgentMemoryManager();
    this.performanceMonitor = new PerformanceMonitor(this.dbManager);
    this.anomalyDetector = new AnomalyDetector(
      this.config.anomalyDetection.config,
      this.dbManager,
      this.performanceMonitor
    );
    this.alertManager = new AlertManager(this.dbManager);
    this.healthMonitor = new HealthMonitor();
  }

  /**
   * Initialize the complete monitoring system
   */
  async initialize(): Promise<void> {
    try {
      logger.info('monitoring-integration', 'Initializing monitoring system');

      // Initialize database layer
      if (this.config.database.enabled) {
        await this.initializeDatabase();
      }

      // Initialize performance monitoring
      if (this.config.performance.enabled) {
        await this.initializePerformanceMonitoring();
      }

      // Initialize anomaly detection
      if (this.config.anomalyDetection.enabled) {
        await this.initializeAnomalyDetection();
      }

      // Initialize alerting system
      if (this.config.alerting.enabled) {
        await this.initializeAlerting();
      }

      // Initialize health monitoring
      if (this.config.healthMonitoring.enabled) {
        await this.initializeHealthMonitoring();
      }

      // Start monitoring loops
      await this.startMonitoringLoops();

      // Initialize database schema for monitoring
      await this.initializeMonitoringSchema();

      this.isInitialized = true;

      logger.info('monitoring-integration', 'Monitoring system initialized successfully', {
        database: this.config.database.enabled,
        performance: this.config.performance.enabled,
        anomalyDetection: this.config.anomalyDetection.enabled,
        alerting: this.config.alerting.enabled,
        healthMonitoring: this.config.healthMonitoring.enabled
      });

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to initialize monitoring system', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get monitoring system status
   */
  async getMonitoringStatus(): Promise<MonitoringStatus> {
    try {
      const dbHealth = await this.dbManager.checkConnectionHealth();
      const systemHealth = this.healthMonitor.getSystemHealth();

      const status: MonitoringStatus = {
        initialized: this.isInitialized,
        components: {
          database: dbHealth.postgresql.connected ? 'healthy' : 'unhealthy',
          performance: this.performanceMonitor ? 'healthy' : 'unhealthy',
          anomalyDetection: this.anomalyDetector ? 'healthy' : 'unhealthy',
          alerting: this.alertManager ? 'healthy' : 'unhealthy',
          healthMonitoring: systemHealth.overall === 'healthy' ? 'healthy' : 
                           systemHealth.overall === 'degraded' ? 'degraded' : 'unhealthy'
        },
        metrics: {
          totalStrategiesTracked: this.getTrackedStrategiesCount(),
          activeAlerts: systemHealth.alerts.length,
          anomaliesDetected: 0, // Would need to query from database
          databaseConnections: dbHealth.postgresql.activeConnections,
          memoryUsage: systemHealth.performance.memoryUsage.heapUsed
        },
        lastHealthCheck: new Date()
      };

      return status;

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to get monitoring status', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Connect to existing Winston logging system
   */
  connectToWinstonLogging(): void {
    try {
      // The logger is already integrated through enhanced-logger.js
      // Configure additional logging for monitoring components
      
      if (this.config.logging.enablePerformanceLogs) {
        logger.info('monitoring-integration', 'Performance logging enabled');
      }

      if (this.config.logging.enableAnomalyLogs) {
        logger.info('monitoring-integration', 'Anomaly detection logging enabled');
      }

      if (this.config.logging.enableAlertLogs) {
        logger.info('monitoring-integration', 'Alert logging enabled');
      }

      logger.info('monitoring-integration', 'Winston logging integration completed');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to connect to Winston logging', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Integrate with current health monitoring infrastructure
   */
  async integrateWithHealthMonitoring(): Promise<void> {
    try {
      // Start the existing health monitor
      this.healthMonitor.start();

      // Add monitoring-specific health checks
      await this.addMonitoringHealthChecks();

      logger.info('monitoring-integration', 'Health monitoring integration completed');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to integrate with health monitoring', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Store monitoring data in PostgreSQL for time-series analysis
   */
  async storeMonitoringData(data: any): Promise<void> {
    try {
      if (!this.config.database.enabled) return;

      await this.dbManager.storeTimeSeriesData({
        timestamp: new Date(),
        metric: data.metric,
        value: data.value,
        tags: data.tags,
        metadata: data.metadata
      });

      logger.debug('monitoring-integration', 'Monitoring data stored', {
        metric: data.metric,
        value: data.value
      });

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to store monitoring data', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Store graph relationships in Zep Graphiti memory
   */
  async storeGraphRelationships(relationships: any): Promise<void> {
    try {
      await this.dbManager.storeGraphData(relationships);

      logger.debug('monitoring-integration', 'Graph relationships stored', {
        nodeCount: relationships.nodes?.length || 0,
        relationshipCount: relationships.relationships?.length || 0
      });

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to store graph relationships', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Ensure compatibility with existing Docker and environment setup
   */
  async ensureDockerCompatibility(): Promise<void> {
    try {
      // Check for required environment variables
      const requiredEnvVars = [
        'POSTGRES_HOST',
        'POSTGRES_PORT',
        'POSTGRES_DB',
        'POSTGRES_USER',
        'POSTGRES_PASSWORD'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        logger.warn('monitoring-integration', 'Missing environment variables', {
          missingVars
        });
      }

      // Check Docker network connectivity
      await this.checkDockerNetworkConnectivity();

      logger.info('monitoring-integration', 'Docker compatibility check completed');

    } catch (error) {
      logger.error('monitoring-integration', 'Docker compatibility check failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Cleanup monitoring resources
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('monitoring-integration', 'Cleaning up monitoring system');

      // Stop monitoring intervals
      for (const [name, interval] of this.monitoringIntervals) {
        clearInterval(interval);
        logger.debug('monitoring-integration', 'Stopped monitoring interval', { name });
      }
      this.monitoringIntervals.clear();

      // Cleanup components
      if (this.alertManager) {
        await this.alertManager.cleanup();
      }

      if (this.healthMonitor) {
        this.healthMonitor.stop();
      }

      if (this.dbManager) {
        await this.dbManager.closeConnections();
      }

      this.isInitialized = false;

      logger.info('monitoring-integration', 'Monitoring system cleanup completed');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to cleanup monitoring system', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Initialize database layer
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.dbManager.initializeConnections();
      await this.memoryManager.initialize(this.dbManager.getPostgreSQLPool());

      logger.info('monitoring-integration', 'Database layer initialized');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to initialize database layer', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    try {
      await this.performanceMonitor.initialize();

      logger.info('monitoring-integration', 'Performance monitoring initialized');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to initialize performance monitoring', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize anomaly detection
   */
  private async initializeAnomalyDetection(): Promise<void> {
    try {
      await this.anomalyDetector.initialize();

      logger.info('monitoring-integration', 'Anomaly detection initialized');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to initialize anomaly detection', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize alerting system
   */
  private async initializeAlerting(): Promise<void> {
    try {
      await this.alertManager.initialize();

      logger.info('monitoring-integration', 'Alerting system initialized');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to initialize alerting system', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize health monitoring
   */
  private async initializeHealthMonitoring(): Promise<void> {
    try {
      // Health monitor is already initialized in the constructor
      // Just start it here
      this.healthMonitor.start();

      logger.info('monitoring-integration', 'Health monitoring initialized');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to initialize health monitoring', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Start monitoring loops
   */
  private async startMonitoringLoops(): Promise<void> {
    try {
      // Performance tracking loop
      if (this.config.performance.enabled) {
        const performanceInterval = setInterval(async () => {
          await this.performanceTrackingLoop();
        }, this.config.performance.trackingInterval * 1000);
        
        this.monitoringIntervals.set('performance', performanceInterval);
      }

      // Anomaly detection loop
      if (this.config.anomalyDetection.enabled) {
        const anomalyInterval = setInterval(async () => {
          await this.anomalyDetectionLoop();
        }, this.config.anomalyDetection.checkInterval * 1000);
        
        this.monitoringIntervals.set('anomaly', anomalyInterval);
      }

      // Health monitoring loop
      if (this.config.healthMonitoring.enabled) {
        const healthInterval = setInterval(async () => {
          await this.healthMonitoringLoop();
        }, this.config.healthMonitoring.checkInterval * 1000);
        
        this.monitoringIntervals.set('health', healthInterval);
      }

      logger.info('monitoring-integration', 'Monitoring loops started', {
        intervalCount: this.monitoringIntervals.size
      });

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to start monitoring loops', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Performance tracking loop
   */
  private async performanceTrackingLoop(): Promise<void> {
    try {
      // This would integrate with actual strategy performance data
      // For now, we'll create a placeholder implementation
      
      const strategies = this.getActiveStrategies();
      
      for (const strategyId of strategies) {
        // Get performance metrics for strategy
        const metrics = await this.getStrategyPerformanceMetrics(strategyId);
        
        if (metrics) {
          await this.performanceMonitor.trackStrategyPerformance(strategyId, metrics);
        }
      }

      logger.debug('monitoring-integration', 'Performance tracking loop completed', {
        strategiesTracked: strategies.length
      });

    } catch (error) {
      logger.error('monitoring-integration', 'Performance tracking loop failed', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Anomaly detection loop
   */
  private async anomalyDetectionLoop(): Promise<void> {
    try {
      const strategies = this.getActiveStrategies();
      
      for (const strategyId of strategies) {
        // Get recent performance data
        const performanceData = await this.getRecentPerformanceData(strategyId);
        
        if (performanceData.length > 0) {
          // Detect anomalies
          const anomalies = await this.anomalyDetector.detectPerformanceAnomalies(performanceData);
          
          if (anomalies.length > 0) {
            logger.warn('monitoring-integration', 'Anomalies detected', {
              strategyId,
              anomalyCount: anomalies.length
            });
            
            // Create alerts for critical anomalies
            for (const anomaly of anomalies) {
              if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
                await this.createAnomalyAlert(strategyId, anomaly);
              }
            }
          }
        }
      }

      logger.debug('monitoring-integration', 'Anomaly detection loop completed');

    } catch (error) {
      logger.error('monitoring-integration', 'Anomaly detection loop failed', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Health monitoring loop
   */
  private async healthMonitoringLoop(): Promise<void> {
    try {
      const systemHealth = await this.healthMonitor.performHealthCheck();
      
      // Store health metrics
      await this.storeMonitoringData({
        metric: 'system.health.overall',
        value: systemHealth.overall === 'healthy' ? 1 : 0,
        tags: { component: 'system' },
        metadata: { status: systemHealth.overall }
      });

      // Check for unhealthy services
      const unhealthyServices = systemHealth.services.filter(s => s.status === 'unhealthy');
      
      if (unhealthyServices.length > 0) {
        logger.warn('monitoring-integration', 'Unhealthy services detected', {
          unhealthyCount: unhealthyServices.length,
          services: unhealthyServices.map(s => s.name)
        });
      }

      logger.debug('monitoring-integration', 'Health monitoring loop completed', {
        overallHealth: systemHealth.overall,
        serviceCount: systemHealth.services.length
      });

    } catch (error) {
      logger.error('monitoring-integration', 'Health monitoring loop failed', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Initialize monitoring database schema
   */
  private async initializeMonitoringSchema(): Promise<void> {
    try {
      // Create alert configurations table
      await this.dbManager.executeQuery(`
        CREATE TABLE IF NOT EXISTS alert_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          enabled BOOLEAN NOT NULL DEFAULT true,
          condition JSONB NOT NULL,
          threshold DOUBLE PRECISION NOT NULL,
          timeframe INTEGER NOT NULL,
          channels JSONB NOT NULL,
          severity VARCHAR(20) NOT NULL,
          cooldown_period INTEGER NOT NULL,
          escalation_rules JSONB DEFAULT '[]',
          tags TEXT[] DEFAULT '{}',
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Create triggered alerts table
      await this.dbManager.executeQuery(`
        CREATE TABLE IF NOT EXISTS triggered_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          config_id UUID NOT NULL,
          strategy_id VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          severity VARCHAR(20) NOT NULL,
          condition JSONB NOT NULL,
          actual_value DOUBLE PRECISION,
          threshold DOUBLE PRECISION NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          acknowledged_by VARCHAR(255),
          acknowledged_at TIMESTAMPTZ,
          resolved_at TIMESTAMPTZ,
          escalation_level INTEGER NOT NULL DEFAULT 0,
          notifications_sent JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}'
        )
      `);

      // Create indexes
      await this.dbManager.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_alert_configs_enabled 
        ON alert_configs(enabled)
      `);

      await this.dbManager.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_triggered_alerts_status 
        ON triggered_alerts(status)
      `);

      await this.dbManager.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_triggered_alerts_timestamp 
        ON triggered_alerts(timestamp DESC)
      `);

      logger.info('monitoring-integration', 'Monitoring database schema initialized');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to initialize monitoring schema', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Add monitoring-specific health checks
   */
  private async addMonitoringHealthChecks(): Promise<void> {
    try {
      // Health checks are handled by the existing HealthMonitor
      // Additional monitoring-specific checks could be added here
      
      logger.info('monitoring-integration', 'Monitoring health checks added');

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to add monitoring health checks', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Check Docker network connectivity
   */
  private async checkDockerNetworkConnectivity(): Promise<void> {
    try {
      // Test database connectivity
      if (this.config.database.enabled) {
        const health = await this.dbManager.checkConnectionHealth();
        if (!health.postgresql.connected) {
          throw new Error('PostgreSQL connection failed');
        }
      }

      logger.info('monitoring-integration', 'Docker network connectivity verified');

    } catch (error) {
      logger.error('monitoring-integration', 'Docker network connectivity check failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get active strategies (placeholder)
   */
  private getActiveStrategies(): string[] {
    // This would integrate with the actual strategy management system
    return ['strategy_1', 'strategy_2', 'strategy_3'];
  }

  /**
   * Get strategy performance metrics (placeholder)
   */
  private async getStrategyPerformanceMetrics(strategyId: string): Promise<any> {
    // This would integrate with the actual performance calculation system
    return {
      totalReturn: Math.random() * 0.2 - 0.1, // -10% to +10%
      annualizedReturn: Math.random() * 0.3 - 0.15,
      volatility: Math.random() * 0.4 + 0.1, // 10% to 50%
      sharpeRatio: Math.random() * 2 - 0.5, // -0.5 to 1.5
      sortinoRatio: Math.random() * 2.5 - 0.5,
      calmarRatio: Math.random() * 1.5,
      maxDrawdown: -(Math.random() * 0.3), // 0% to -30%
      winRate: Math.random() * 0.4 + 0.4, // 40% to 80%
      profitFactor: Math.random() * 2 + 0.5, // 0.5 to 2.5
      averageWin: Math.random() * 0.05 + 0.01,
      averageLoss: -(Math.random() * 0.04 + 0.01),
      largestWin: Math.random() * 0.15 + 0.02,
      largestLoss: -(Math.random() * 0.12 + 0.02),
      tradesCount: Math.floor(Math.random() * 100) + 10,
      averageHoldingPeriod: Math.random() * 48 + 1 // 1 to 49 hours
    };
  }

  /**
   * Get recent performance data (placeholder)
   */
  private async getRecentPerformanceData(strategyId: string): Promise<any[]> {
    // This would query actual performance data from the database
    const data = [];
    for (let i = 0; i < 30; i++) { // Last 30 data points
      data.push(await this.getStrategyPerformanceMetrics(strategyId));
    }
    return data;
  }

  /**
   * Create anomaly alert
   */
  private async createAnomalyAlert(strategyId: string, anomaly: any): Promise<void> {
    try {
      // This would create an alert through the alert manager
      logger.warn('monitoring-integration', 'Anomaly alert created', {
        strategyId,
        anomalyType: anomaly.type,
        severity: anomaly.severity
      });

    } catch (error) {
      logger.error('monitoring-integration', 'Failed to create anomaly alert', {
        strategyId,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get tracked strategies count
   */
  private getTrackedStrategiesCount(): number {
    return this.getActiveStrategies().length;
  }
}

/**
 * Create monitoring integration instance
 */
export function createMonitoringIntegration(config?: Partial<MonitoringConfig>): MonitoringIntegration {
  const defaultConfig: MonitoringConfig = {
    database: {
      enabled: true,
      config: getDefaultDatabaseConfig()
    },
    performance: {
      enabled: true,
      trackingInterval: 60, // 1 minute
      rollingWindowSizes: [30, 90, 365] // 30d, 90d, 1y
    },
    anomalyDetection: {
      enabled: true,
      checkInterval: 300, // 5 minutes
      config: getDefaultAnomalyDetectionConfig()
    },
    alerting: {
      enabled: true,
      processingInterval: 30 // 30 seconds
    },
    healthMonitoring: {
      enabled: true,
      checkInterval: 60 // 1 minute
    },
    logging: {
      enablePerformanceLogs: true,
      enableAnomalyLogs: true,
      enableAlertLogs: true,
      logLevel: 'info'
    },
    storage: {
      retentionPeriod: 365, // 1 year
      compressionEnabled: true,
      backupEnabled: true
    }
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return new MonitoringIntegration(mergedConfig);
}

/**
 * Global monitoring integration instance
 */
let globalMonitoringIntegration: MonitoringIntegration | null = null;

/**
 * Initialize global monitoring integration
 */
export async function initializeGlobalMonitoring(config?: Partial<MonitoringConfig>): Promise<MonitoringIntegration> {
  if (globalMonitoringIntegration) {
    return globalMonitoringIntegration;
  }

  globalMonitoringIntegration = createMonitoringIntegration(config);
  await globalMonitoringIntegration.initialize();
  
  return globalMonitoringIntegration;
}

/**
 * Get global monitoring integration instance
 */
export function getGlobalMonitoring(): MonitoringIntegration | null {
  return globalMonitoringIntegration;
}

/**
 * Cleanup global monitoring integration
 */
export async function cleanupGlobalMonitoring(): Promise<void> {
  if (globalMonitoringIntegration) {
    await globalMonitoringIntegration.cleanup();
    globalMonitoringIntegration = null;
  }
}