/**
 * Integrated Monitoring System
 * 
 * Connects all monitoring components with existing infrastructure including:
 * - Winston logging system integration
 * - Health monitoring infrastructure
 * - PostgreSQL storage for time-series analysis
 * - Zep Graphiti memory for graph relationships
 * - Docker and environment compatibility
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { DatabaseManager, getDefaultDatabaseConfig } from '../database/database-manager.js';
import { PerformanceMonitor, createPerformanceMonitor } from './performance-monitor.js';
import { AlertManager } from './alert-manager.js';
import { AnomalyDetector } from './anomaly-detector.js';
import { healthMonitor, getSystemHealth, HealthAlert } from '../utils/health-monitor.js';
import { resilienceManager } from '../utils/enhanced-error-integration.js';

const logger = createLogger('system', 'integrated-monitoring');

export interface MonitoringConfig {
  // Database configuration
  database: {
    enabled: boolean;
    config: any; // Will use DatabaseConfig from database-manager
  };
  
  // Performance monitoring
  performance: {
    enabled: boolean;
    trackingInterval: number; // milliseconds
    rollingWindowSizes: number[]; // days
    alertThresholds: {
      sharpeRatio: number;
      maxDrawdown: number;
      volatility: number;
    };
  };
  
  // Anomaly detection
  anomalyDetection: {
    enabled: boolean;
    zScoreThreshold: number;
    percentileThreshold: number;
    rollingWindowSize: number;
    enableRealTimeAlerts: boolean;
  };
  
  // Alert management
  alerting: {
    enabled: boolean;
    channels: any[]; // NotificationChannel[]
    cooldownPeriod: number; // minutes
    maxAlertsPerHour: number;
  };
  
  // Health monitoring
  healthMonitoring: {
    enabled: boolean;
    checkInterval: number; // milliseconds
    alertOnFailure: boolean;
  };
  
  // Logging integration
  logging: {
    enableStructuredLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enablePerformanceLogs: boolean;
    enableHealthLogs: boolean;
  };
  
  // Storage strategy
  storage: {
    performanceMetrics: 'postgresql' | 'both';
    healthData: 'postgresql' | 'both';
    alertHistory: 'postgresql';
    graphRelationships: 'zep_graphiti';
  };
}

export interface MonitoringSystemStatus {
  initialized: boolean;
  components: {
    database: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
    performance: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
    alerting: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
    anomalyDetection: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
    healthMonitoring: { status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date };
  };
  metrics: {
    totalStrategiesTracked: number;
    activeAlerts: number;
    anomaliesDetected: number;
    systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  };
  lastUpdate: Date;
}

export interface IntegratedMetrics {
  timestamp: Date;
  system: {
    health: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    activeConnections: number;
  };
  performance: {
    strategiesTracked: number;
    averagePerformance: number;
    totalAlerts: number;
    criticalAlerts: number;
  };
  database: {
    connectionHealth: boolean;
    activeConnections: number;
    queryLatency: number;
  };
  resilience: {
    circuitBreakerStatus: Record<string, string>;
    cacheHitRate: number;
    failoverEvents: number;
  };
}

/**
 * Comprehensive Integrated Monitoring System
 */
export class IntegratedMonitoringSystem {
  private config: MonitoringConfig;
  private dbManager: DatabaseManager | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;
  private alertManager: AlertManager | null = null;
  private anomalyDetector: AnomalyDetector | null = null;
  private isInitialized = false;
  private monitoringInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCollectionInterval?: NodeJS.Timeout;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    logger.info('integrated-monitoring', 'Integrated monitoring system created', {
      databaseEnabled: this.config.database.enabled,
      performanceEnabled: this.config.performance.enabled,
      alertingEnabled: this.config.alerting.enabled
    });
  }

  /**
   * Initialize the integrated monitoring system
   */
  async initialize(): Promise<void> {
    try {
      logger.info('integrated-monitoring', 'Initializing integrated monitoring system');

      // Initialize database manager if enabled
      if (this.config.database.enabled) {
        await this.initializeDatabaseManager();
      }

      // Initialize performance monitoring if enabled
      if (this.config.performance.enabled) {
        await this.initializePerformanceMonitoring();
      }

      // Initialize alert management if enabled
      if (this.config.alerting.enabled) {
        await this.initializeAlertManagement();
      }

      // Initialize anomaly detection if enabled
      if (this.config.anomalyDetection.enabled) {
        await this.initializeAnomalyDetection();
      }

      // Start health monitoring if enabled
      if (this.config.healthMonitoring.enabled) {
        await this.startHealthMonitoring();
      }

      // Start monitoring intervals
      this.startMonitoringIntervals();

      // Initialize database schema for monitoring
      await this.initializeMonitoringSchema();

      this.isInitialized = true;

      logger.info('integrated-monitoring', 'Integrated monitoring system initialized successfully', {
        components: {
          database: !!this.dbManager,
          performance: !!this.performanceMonitor,
          alerting: !!this.alertManager,
          anomalyDetection: !!this.anomalyDetector
        }
      });

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to initialize integrated monitoring system', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<MonitoringSystemStatus> {
    this.ensureInitialized();

    try {
      const now = new Date();
      
      // Check component health
      const components = {
        database: await this.checkDatabaseHealth(),
        performance: await this.checkPerformanceMonitorHealth(),
        alerting: await this.checkAlertManagerHealth(),
        anomalyDetection: await this.checkAnomalyDetectorHealth(),
        healthMonitoring: await this.checkHealthMonitoringHealth()
      };

      // Get system metrics
      const systemHealth = getSystemHealth();
      const metrics = {
        totalStrategiesTracked: this.performanceMonitor ? 
          Object.keys(this.performanceMonitor.getCachedPerformance('all') || {}).length : 0,
        activeAlerts: this.alertManager ? 
          (await this.alertManager.getAlertDashboard()).summary.activeAlerts : 0,
        anomaliesDetected: 0, // Would need to track this
        systemHealth: systemHealth.overall
      };

      const status: MonitoringSystemStatus = {
        initialized: this.isInitialized,
        components,
        metrics,
        lastUpdate: now
      };

      logger.debug('integrated-monitoring', 'System status retrieved', {
        systemHealth: status.metrics.systemHealth,
        activeAlerts: status.metrics.activeAlerts
      });

      return status;

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to get system status', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Collect and store integrated metrics
   */
  async collectIntegratedMetrics(): Promise<IntegratedMetrics> {
    this.ensureInitialized();

    try {
      const timestamp = new Date();
      
      // System metrics
      const systemHealth = getSystemHealth();
      const system = {
        health: systemHealth.overall,
        uptime: systemHealth.uptime,
        memoryUsage: systemHealth.performance.memoryUsage,
        activeConnections: systemHealth.performance.activeConnections
      };

      // Performance metrics
      const performance = {
        strategiesTracked: 0,
        averagePerformance: 0,
        totalAlerts: 0,
        criticalAlerts: 0
      };

      if (this.alertManager) {
        const dashboard = await this.alertManager.getAlertDashboard();
        performance.totalAlerts = dashboard.summary.totalAlerts;
        performance.criticalAlerts = dashboard.summary.criticalAlerts;
      }

      // Database metrics
      const database = {
        connectionHealth: false,
        activeConnections: 0,
        queryLatency: 0
      };

      if (this.dbManager) {
        const dbHealth = await this.dbManager.checkConnectionHealth();
        database.connectionHealth = dbHealth.postgresql.connected;
        database.activeConnections = dbHealth.postgresql.activeConnections;
      }

      // Resilience metrics
      const resilienceHealth = await resilienceManager.getHealthStatus();
      const resilience = {
        circuitBreakerStatus: resilienceHealth.circuitBreakers || {},
        cacheHitRate: 0, // Would need to implement cache metrics
        failoverEvents: 0 // Would need to track this
      };

      const integratedMetrics: IntegratedMetrics = {
        timestamp,
        system,
        performance,
        database,
        resilience
      };

      // Store metrics in database if enabled
      if (this.dbManager && this.config.storage.performanceMetrics !== 'both') {
        await this.storeIntegratedMetrics(integratedMetrics);
      }

      // Store graph relationships in Zep Graphiti if configured
      if (this.config.storage.graphRelationships === 'zep_graphiti') {
        await this.storeGraphRelationships(integratedMetrics);
      }

      logger.debug('integrated-monitoring', 'Integrated metrics collected', {
        systemHealth: system.health,
        totalAlerts: performance.totalAlerts,
        dbConnected: database.connectionHealth
      });

      return integratedMetrics;

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to collect integrated metrics', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Process system alerts and notifications
   */
  async processSystemAlerts(): Promise<void> {
    this.ensureInitialized();

    try {
      // Get current system metrics
      const metrics = await this.collectIntegratedMetrics();
      
      // Check for system-level alerts
      const systemAlerts: HealthAlert[] = [];

      // Database connection alerts
      if (!metrics.database.connectionHealth) {
        systemAlerts.push({
          id: `db_alert_${Date.now()}`,
          severity: 'critical',
          service: 'database',
          message: 'Database connection lost',
          timestamp: new Date()
        });
      }

      // Memory usage alerts
      const memoryUsagePercent = (metrics.system.memoryUsage.used / metrics.system.memoryUsage.total) * 100;
      if (memoryUsagePercent > 90) {
        systemAlerts.push({
          id: `memory_alert_${Date.now()}`,
          severity: 'high',
          service: 'system',
          message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
          timestamp: new Date()
        });
      }

      // Process alerts through alert manager
      if (this.alertManager && systemAlerts.length > 0) {
        for (const alert of systemAlerts) {
          // Convert HealthAlert to SystemMetrics format for alert manager
          const systemMetrics = {
            timestamp: new Date(),
            performance: {},
            system: {
              memoryUsage: memoryUsagePercent,
              cpuUsage: 0,
              activeConnections: metrics.database.activeConnections,
              errorRate: 0,
              responseTime: metrics.database.queryLatency
            },
            market: {}
          };

          await this.alertManager.checkAlerts(systemMetrics);
        }
      }

      logger.debug('integrated-monitoring', 'System alerts processed', {
        alertCount: systemAlerts.length
      });

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to process system alerts', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Generate monitoring dashboard data
   */
  async generateDashboardData(): Promise<any> {
    this.ensureInitialized();

    try {
      const [systemStatus, integratedMetrics] = await Promise.all([
        this.getSystemStatus(),
        this.collectIntegratedMetrics()
      ]);

      const dashboard = {
        overview: {
          systemHealth: systemStatus.metrics.systemHealth,
          uptime: integratedMetrics.system.uptime,
          activeAlerts: systemStatus.metrics.activeAlerts,
          strategiesTracked: systemStatus.metrics.totalStrategiesTracked
        },
        performance: {
          memoryUsage: integratedMetrics.system.memoryUsage,
          databaseHealth: integratedMetrics.database.connectionHealth,
          activeConnections: integratedMetrics.database.activeConnections
        },
        alerts: this.alertManager ? await this.alertManager.getAlertDashboard() : null,
        components: systemStatus.components,
        lastUpdate: new Date()
      };

      logger.debug('integrated-monitoring', 'Dashboard data generated');

      return dashboard;

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to generate dashboard data', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Shutdown the monitoring system gracefully
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('integrated-monitoring', 'Shutting down integrated monitoring system');

      // Clear intervals
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = undefined;
      }

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = undefined;
      }

      if (this.metricsCollectionInterval) {
        clearInterval(this.metricsCollectionInterval);
        this.metricsCollectionInterval = undefined;
      }

      // Close database connections
      if (this.dbManager) {
        await this.dbManager.closeConnections();
      }

      this.isInitialized = false;

      logger.info('integrated-monitoring', 'Integrated monitoring system shutdown complete');

    } catch (error) {
      logger.error('integrated-monitoring', 'Error during monitoring system shutdown', {
        error: (error as Error).message
      });
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Initialize database manager
   */
  private async initializeDatabaseManager(): Promise<void> {
    try {
      const dbConfig = this.config.database.config || getDefaultDatabaseConfig();
      this.dbManager = new DatabaseManager(dbConfig);
      await this.dbManager.initializeConnections();

      logger.info('integrated-monitoring', 'Database manager initialized');

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to initialize database manager', {
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
      if (!this.dbManager) {
        throw new Error('Database manager required for performance monitoring');
      }

      this.performanceMonitor = createPerformanceMonitor(this.dbManager);
      await this.performanceMonitor.initialize();

      logger.info('integrated-monitoring', 'Performance monitoring initialized');

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to initialize performance monitoring', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Initialize alert management
   */
  private async initializeAlertManagement(): Promise<void> {
    try {
      if (!this.dbManager) {
        throw new Error('Database manager required for alert management');
      }

      this.alertManager = new AlertManager(this.dbManager);
      await this.alertManager.initialize();

      logger.info('integrated-monitoring', 'Alert management initialized');

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to initialize alert management', {
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
      if (!this.dbManager || !this.performanceMonitor) {
        throw new Error('Database manager and performance monitor required for anomaly detection');
      }

      const anomalyConfig = {
        zScoreThreshold: this.config.anomalyDetection.zScoreThreshold,
        percentileThreshold: this.config.anomalyDetection.percentileThreshold,
        rollingWindowSize: this.config.anomalyDetection.rollingWindowSize,
        maxDrawdownThreshold: this.config.performance.alertThresholds.maxDrawdown,
        sharpeRatioThreshold: this.config.performance.alertThresholds.sharpeRatio,
        volatilityThreshold: this.config.performance.alertThresholds.volatility,
        returnThreshold: 0.05, // 5% minimum return
        consecutiveNegativeReturns: 5,
        correlationBreakThreshold: 0.3,
        volumeAnomalyThreshold: 2.0,
        enableRealTimeAlerts: this.config.anomalyDetection.enableRealTimeAlerts,
        alertCooldownPeriod: this.config.alerting.cooldownPeriod,
        maxAlertsPerHour: this.config.alerting.maxAlertsPerHour
      };

      this.anomalyDetector = new AnomalyDetector(
        anomalyConfig,
        this.dbManager,
        this.performanceMonitor
      );
      await this.anomalyDetector.initialize();

      logger.info('integrated-monitoring', 'Anomaly detection initialized');

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to initialize anomaly detection', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Start health monitoring
   */
  private async startHealthMonitoring(): Promise<void> {
    try {
      // Health monitoring is already initialized globally
      // We just need to ensure it's running
      if (!healthMonitor) {
        throw new Error('Global health monitor not available');
      }

      logger.info('integrated-monitoring', 'Health monitoring started');

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to start health monitoring', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Start monitoring intervals
   */
  private startMonitoringIntervals(): void {
    // Performance tracking interval
    if (this.config.performance.enabled && this.config.performance.trackingInterval > 0) {
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.processSystemAlerts();
        } catch (error) {
          logger.error('integrated-monitoring', 'Error in monitoring interval', {
            error: (error as Error).message
          });
        }
      }, this.config.performance.trackingInterval);
    }

    // Health check interval
    if (this.config.healthMonitoring.enabled && this.config.healthMonitoring.checkInterval > 0) {
      this.healthCheckInterval = setInterval(async () => {
        try {
          const status = await this.getSystemStatus();
          if (status.metrics.systemHealth !== 'healthy' && this.config.healthMonitoring.alertOnFailure) {
            logger.warn('integrated-monitoring', 'System health degraded', {
              systemHealth: status.metrics.systemHealth,
              activeAlerts: status.metrics.activeAlerts
            });
          }
        } catch (error) {
          logger.error('integrated-monitoring', 'Error in health check interval', {
            error: (error as Error).message
          });
        }
      }, this.config.healthMonitoring.checkInterval);
    }

    // Metrics collection interval
    this.metricsCollectionInterval = setInterval(async () => {
      try {
        await this.collectIntegratedMetrics();
      } catch (error) {
        logger.error('integrated-monitoring', 'Error in metrics collection interval', {
          error: (error as Error).message
        });
      }
    }, 60000); // Every minute

    logger.info('integrated-monitoring', 'Monitoring intervals started');
  }

  /**
   * Initialize monitoring database schema
   */
  private async initializeMonitoringSchema(): Promise<void> {
    if (!this.dbManager) return;

    try {
      // Create monitoring-specific tables
      await this.dbManager.executeQuery(`
        CREATE TABLE IF NOT EXISTS integrated_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMPTZ NOT NULL,
          system_metrics JSONB NOT NULL,
          performance_metrics JSONB NOT NULL,
          database_metrics JSONB NOT NULL,
          resilience_metrics JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await this.dbManager.executeQuery(`
        CREATE TABLE IF NOT EXISTS alert_configs (
          id UUID PRIMARY KEY,
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

      await this.dbManager.executeQuery(`
        CREATE TABLE IF NOT EXISTS triggered_alerts (
          id UUID PRIMARY KEY,
          config_id UUID NOT NULL,
          strategy_id VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          severity VARCHAR(20) NOT NULL,
          condition JSONB NOT NULL,
          actual_value DOUBLE PRECISION NOT NULL,
          threshold DOUBLE PRECISION NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
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
        CREATE INDEX IF NOT EXISTS idx_integrated_metrics_timestamp 
        ON integrated_metrics(timestamp DESC)
      `);

      await this.dbManager.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_triggered_alerts_status_timestamp 
        ON triggered_alerts(status, timestamp DESC)
      `);

      logger.info('integrated-monitoring', 'Monitoring database schema initialized');

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to initialize monitoring schema', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Store integrated metrics in database
   */
  private async storeIntegratedMetrics(metrics: IntegratedMetrics): Promise<void> {
    if (!this.dbManager) return;

    try {
      await this.dbManager.executeQuery(`
        INSERT INTO integrated_metrics (timestamp, system_metrics, performance_metrics, database_metrics, resilience_metrics)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        metrics.timestamp,
        JSON.stringify(metrics.system),
        JSON.stringify(metrics.performance),
        JSON.stringify(metrics.database),
        JSON.stringify(metrics.resilience)
      ]);

      logger.debug('integrated-monitoring', 'Integrated metrics stored in database');

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to store integrated metrics', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Store graph relationships in Zep Graphiti
   */
  private async storeGraphRelationships(metrics: IntegratedMetrics): Promise<void> {
    try {
      // Create graph data representing monitoring relationships
      const graphData = {
        nodes: [
          {
            id: `system_${metrics.timestamp.getTime()}`,
            type: 'system_state',
            properties: {
              timestamp: metrics.timestamp.toISOString(),
              health: metrics.system.health,
              uptime: metrics.system.uptime,
              memoryUsage: metrics.system.memoryUsage.used
            }
          },
          {
            id: `performance_${metrics.timestamp.getTime()}`,
            type: 'performance_state',
            properties: {
              timestamp: metrics.timestamp.toISOString(),
              strategiesTracked: metrics.performance.strategiesTracked,
              totalAlerts: metrics.performance.totalAlerts
            }
          }
        ],
        relationships: [
          {
            from: `system_${metrics.timestamp.getTime()}`,
            to: `performance_${metrics.timestamp.getTime()}`,
            type: 'MONITORS',
            properties: {
              timestamp: metrics.timestamp.toISOString(),
              relationship_type: 'system_performance'
            }
          }
        ]
      };

      if (this.dbManager) {
        await this.dbManager.storeGraphData(graphData);
      }

      logger.debug('integrated-monitoring', 'Graph relationships stored');

    } catch (error) {
      logger.error('integrated-monitoring', 'Failed to store graph relationships', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Component health check methods
   */
  private async checkDatabaseHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    if (!this.dbManager) {
      return { status: 'unhealthy', lastCheck };
    }

    try {
      const health = await this.dbManager.checkConnectionHealth();
      const status = health.postgresql.connected ? 'healthy' : 'unhealthy';
      return { status, lastCheck };
    } catch {
      return { status: 'unhealthy', lastCheck };
    }
  }

  private async checkPerformanceMonitorHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    if (!this.performanceMonitor) {
      return { status: 'unhealthy', lastCheck };
    }

    try {
      // Simple health check - if we can call a method without error, it's healthy
      this.performanceMonitor.getCachedPerformance('test');
      return { status: 'healthy', lastCheck };
    } catch {
      return { status: 'unhealthy', lastCheck };
    }
  }

  private async checkAlertManagerHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    if (!this.alertManager) {
      return { status: 'unhealthy', lastCheck };
    }

    try {
      await this.alertManager.getAlertDashboard();
      return { status: 'healthy', lastCheck };
    } catch {
      return { status: 'unhealthy', lastCheck };
    }
  }

  private async checkAnomalyDetectorHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    if (!this.anomalyDetector) {
      return { status: 'unhealthy', lastCheck };
    }

    // Anomaly detector doesn't have a direct health check, assume healthy if initialized
    return { status: 'healthy', lastCheck };
  }

  private async checkHealthMonitoringHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: Date }> {
    const lastCheck = new Date();
    
    try {
      const systemHealth = getSystemHealth();
      const status = systemHealth.overall === 'unhealthy' ? 'unhealthy' : 'healthy';
      return { status, lastCheck };
    } catch {
      return { status: 'unhealthy', lastCheck };
    }
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: Partial<MonitoringConfig>): MonitoringConfig {
    return {
      database: {
        enabled: config.database?.enabled ?? true,
        config: config.database?.config ?? getDefaultDatabaseConfig()
      },
      performance: {
        enabled: config.performance?.enabled ?? true,
        trackingInterval: config.performance?.trackingInterval ?? 30000, // 30 seconds
        rollingWindowSizes: config.performance?.rollingWindowSizes ?? [30, 90, 365], // days
        alertThresholds: {
          sharpeRatio: config.performance?.alertThresholds?.sharpeRatio ?? 0.5,
          maxDrawdown: config.performance?.alertThresholds?.maxDrawdown ?? 0.2, // 20%
          volatility: config.performance?.alertThresholds?.volatility ?? 0.3 // 30%
        }
      },
      anomalyDetection: {
        enabled: config.anomalyDetection?.enabled ?? true,
        zScoreThreshold: config.anomalyDetection?.zScoreThreshold ?? 2.0,
        percentileThreshold: config.anomalyDetection?.percentileThreshold ?? 95,
        rollingWindowSize: config.anomalyDetection?.rollingWindowSize ?? 30, // days
        enableRealTimeAlerts: config.anomalyDetection?.enableRealTimeAlerts ?? true
      },
      alerting: {
        enabled: config.alerting?.enabled ?? true,
        channels: config.alerting?.channels ?? [],
        cooldownPeriod: config.alerting?.cooldownPeriod ?? 15, // minutes
        maxAlertsPerHour: config.alerting?.maxAlertsPerHour ?? 10
      },
      healthMonitoring: {
        enabled: config.healthMonitoring?.enabled ?? true,
        checkInterval: config.healthMonitoring?.checkInterval ?? 60000, // 1 minute
        alertOnFailure: config.healthMonitoring?.alertOnFailure ?? true
      },
      logging: {
        enableStructuredLogging: config.logging?.enableStructuredLogging ?? true,
        logLevel: config.logging?.logLevel ?? 'info',
        enablePerformanceLogs: config.logging?.enablePerformanceLogs ?? true,
        enableHealthLogs: config.logging?.enableHealthLogs ?? true
      },
      storage: {
        performanceMetrics: config.storage?.performanceMetrics ?? 'postgresql',
        healthData: config.storage?.healthData ?? 'postgresql',
        alertHistory: config.storage?.alertHistory ?? 'postgresql',
        graphRelationships: config.storage?.graphRelationships ?? 'zep_graphiti'
      }
    };
  }

  /**
   * Ensure the system is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Integrated monitoring system not initialized. Call initialize() first.');
    }
  }
}

/**
 * Create integrated monitoring system instance
 */
export function createIntegratedMonitoringSystem(config?: Partial<MonitoringConfig>): IntegratedMonitoringSystem {
  return new IntegratedMonitoringSystem(config);
}

/**
 * Global integrated monitoring system instance
 */
export const integratedMonitoringSystem = createIntegratedMonitoringSystem();

/**
 * Initialize global monitoring system
 */
export async function initializeGlobalMonitoring(config?: Partial<MonitoringConfig>): Promise<void> {
  if (config) {
    // Create new instance with custom config
    const customSystem = createIntegratedMonitoringSystem(config);
    await customSystem.initialize();
  } else {
    // Use global instance
    await integratedMonitoringSystem.initialize();
  }
}

/**
 * Get global monitoring system status
 */
export async function getGlobalMonitoringStatus(): Promise<MonitoringSystemStatus> {
  return await integratedMonitoringSystem.getSystemStatus();
}

/**
 * Shutdown global monitoring system
 */
export async function shutdownGlobalMonitoring(): Promise<void> {
  await integratedMonitoringSystem.shutdown();
}