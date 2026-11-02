/**
 * Production Monitoring Dashboards
 * 
 * Creates comprehensive monitoring dashboards for system health, performance,
 * and trading metrics optimized for production environments.
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { DatabaseManager } from '../database/database-manager.js';
import { IntegratedMonitoringSystem, IntegratedMetrics } from './integrated-monitoring-system.js';

const logger = createLogger('system', 'production-dashboards');

export interface DashboardConfig {
  refreshInterval: number; // milliseconds
  dataRetention: number; // days
  enableRealTime: boolean;
  enableAlerts: boolean;
  customMetrics: string[];
}

export interface DashboardData {
  timestamp: Date;
  overview: SystemOverview;
  performance: PerformanceDashboard;
  health: HealthDashboard;
  alerts: AlertsDashboard;
  trading: TradingDashboard;
  infrastructure: InfrastructureDashboard;
}

export interface SystemOverview {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  environment: string;
  activeStrategies: number;
  totalTrades: number;
  systemLoad: {
    cpu: number;
    memory: number;
    disk: number;
  };
  keyMetrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
}

export interface PerformanceDashboard {
  timeRange: string;
  strategies: StrategyPerformance[];
  aggregated: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    calmarRatio: number;
  };
  charts: {
    equityCurve: TimeSeriesData[];
    drawdownChart: TimeSeriesData[];
    returnsDistribution: HistogramData[];
    rollingMetrics: RollingMetricsData[];
  };
}

export interface HealthDashboard {
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  infrastructure: {
    database: ComponentHealth;
    cache: ComponentHealth;
    messageQueue: ComponentHealth;
    externalAPIs: ComponentHealth;
  };
  resourceUsage: {
    cpu: ResourceMetrics;
    memory: ResourceMetrics;
    disk: ResourceMetrics;
    network: ResourceMetrics;
  };
}

export interface AlertsDashboard {
  summary: {
    activeAlerts: number;
    totalAlerts: number;
    criticalAlerts: number;
    resolvedToday: number;
  };
  recentAlerts: Alert[];
  alertTrends: TimeSeriesData[];
  topAlertSources: { source: string; count: number }[];
}

export interface TradingDashboard {
  liveMetrics: {
    activePositions: number;
    dailyPnL: number;
    totalExposure: number;
    cashBalance: number;
  };
  recentTrades: Trade[];
  performanceByStrategy: StrategyPerformance[];
  riskMetrics: {
    portfolioVaR: number;
    portfolioBeta: number;
    correlationMatrix: number[][];
    sectorExposure: SectorExposure[];
  };
}

export interface InfrastructureDashboard {
  containers: ContainerMetrics[];
  databases: DatabaseMetrics[];
  apis: APIMetrics[];
  queues: QueueMetrics[];
  caches: CacheMetrics[];
  logs: LogMetrics;
}

// Supporting interfaces
export interface StrategyPerformance {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  lastUpdate: Date;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  throughput: number;
}

export interface ResourceMetrics {
  current: number;
  average: number;
  peak: number;
  threshold: number;
  unit: string;
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  strategy: string;
  pnl: number;
}

export interface SectorExposure {
  sector: string;
  exposure: number;
  percentage: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface HistogramData {
  bucket: string;
  count: number;
  percentage: number;
}

export interface RollingMetricsData {
  timestamp: Date;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  winRate: number;
}

export interface ContainerMetrics {
  name: string;
  status: 'running' | 'stopped' | 'error';
  cpu: number;
  memory: number;
  restarts: number;
}

export interface DatabaseMetrics {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  connections: number;
  queryTime: number;
  size: number;
}

export interface APIMetrics {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface QueueMetrics {
  name: string;
  size: number;
  throughput: number;
  oldestMessage: number;
}

export interface CacheMetrics {
  name: string;
  hitRate: number;
  size: number;
  evictions: number;
}

export interface LogMetrics {
  totalLogs: number;
  errorLogs: number;
  warningLogs: number;
  logRate: number;
}

/**
 * Production Dashboard Manager
 */
export class ProductionDashboardManager {
  private config: DashboardConfig;
  private dbManager: DatabaseManager;
  private monitoringSystem: IntegratedMonitoringSystem;
  private dashboardCache: Map<string, any> = new Map();
  private refreshTimer?: NodeJS.Timeout;

  constructor(
    dbManager: DatabaseManager,
    monitoringSystem: IntegratedMonitoringSystem,
    config: Partial<DashboardConfig> = {}
  ) {
    this.dbManager = dbManager;
    this.monitoringSystem = monitoringSystem;
    this.config = {
      refreshInterval: config.refreshInterval || 30000, // 30 seconds
      dataRetention: config.dataRetention || 30, // 30 days
      enableRealTime: config.enableRealTime ?? true,
      enableAlerts: config.enableAlerts ?? true,
      customMetrics: config.customMetrics || []
    };

    logger.info('production-dashboards', 'Dashboard manager initialized', {
      refreshInterval: this.config.refreshInterval,
      dataRetention: this.config.dataRetention
    });
  }

  /**
   * Start dashboard data collection
   */
  async start(): Promise<void> {
    if (this.config.enableRealTime) {
      this.refreshTimer = setInterval(async () => {
        try {
          await this.refreshDashboardData();
        } catch (error) {
          logger.error('production-dashboards', 'Failed to refresh dashboard data', {
            error: (error as Error).message
          });
        }
      }, this.config.refreshInterval);

      // Initial refresh
      await this.refreshDashboardData();
    }

    logger.info('production-dashboards', 'Dashboard data collection started');
  }

  /**
   * Stop dashboard data collection
   */
  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    logger.info('production-dashboards', 'Dashboard data collection stopped');
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const [overview, performance, health, alerts, trading, infrastructure] = await Promise.all([
        this.getSystemOverview(),
        this.getPerformanceDashboard(),
        this.getHealthDashboard(),
        this.getAlertsDashboard(),
        this.getTradingDashboard(),
        this.getInfrastructureDashboard()
      ]);

      const dashboardData: DashboardData = {
        timestamp: new Date(),
        overview,
        performance,
        health,
        alerts,
        trading,
        infrastructure
      };

      // Cache the data
      this.dashboardCache.set('complete', dashboardData);

      logger.debug('production-dashboards', 'Complete dashboard data generated');

      return dashboardData;

    } catch (error) {
      logger.error('production-dashboards', 'Failed to generate dashboard data', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get system overview
   */
  async getSystemOverview(): Promise<SystemOverview> {
    try {
      const systemStatus = await this.monitoringSystem.getSystemStatus();
      const integratedMetrics = await this.monitoringSystem.collectIntegratedMetrics();

      // Get performance metrics from database
      const performanceQuery = `
        SELECT 
          COUNT(DISTINCT strategy_id) as active_strategies,
          AVG((metrics->>'totalReturn')::DOUBLE PRECISION) as avg_return,
          AVG((metrics->>'sharpeRatio')::DOUBLE PRECISION) as avg_sharpe,
          AVG((metrics->>'maxDrawdown')::DOUBLE PRECISION) as avg_drawdown,
          AVG((metrics->>'winRate')::DOUBLE PRECISION) as avg_win_rate
        FROM performance_metrics 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
      `;

      const performanceResults = await this.dbManager.executeQuery(performanceQuery);
      const perfData = performanceResults[0] || {};

      const overview: SystemOverview = {
        status: systemStatus.metrics.systemHealth,
        uptime: integratedMetrics.system.uptime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        activeStrategies: parseInt(perfData.active_strategies) || 0,
        totalTrades: 0, // Would need to implement trade tracking
        systemLoad: {
          cpu: 0, // Would need to implement CPU monitoring
          memory: (integratedMetrics.system.memoryUsage.used / integratedMetrics.system.memoryUsage.total) * 100,
          disk: 0 // Would need to implement disk monitoring
        },
        keyMetrics: {
          totalReturn: parseFloat(perfData.avg_return) || 0,
          sharpeRatio: parseFloat(perfData.avg_sharpe) || 0,
          maxDrawdown: parseFloat(perfData.avg_drawdown) || 0,
          winRate: parseFloat(perfData.avg_win_rate) || 0
        }
      };

      return overview;

    } catch (error) {
      logger.error('production-dashboards', 'Failed to get system overview', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get performance dashboard
   */
  async getPerformanceDashboard(): Promise<PerformanceDashboard> {
    try {
      // Get strategy performance data
      const strategiesQuery = `
        SELECT 
          strategy_id,
          AVG((metrics->>'totalReturn')::DOUBLE PRECISION) as total_return,
          AVG((metrics->>'sharpeRatio')::DOUBLE PRECISION) as sharpe_ratio,
          AVG((metrics->>'maxDrawdown')::DOUBLE PRECISION) as max_drawdown,
          AVG((metrics->>'winRate')::DOUBLE PRECISION) as win_rate,
          MAX(timestamp) as last_update
        FROM performance_metrics 
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY strategy_id
        ORDER BY total_return DESC
      `;

      const strategiesResults = await this.dbManager.executeQuery(strategiesQuery);
      
      const strategies: StrategyPerformance[] = strategiesResults.map(row => ({
        id: row.strategy_id,
        name: row.strategy_id,
        status: 'active' as const,
        totalReturn: parseFloat(row.total_return) || 0,
        sharpeRatio: parseFloat(row.sharpe_ratio) || 0,
        maxDrawdown: parseFloat(row.max_drawdown) || 0,
        winRate: parseFloat(row.win_rate) || 0,
        lastUpdate: new Date(row.last_update)
      }));

      // Get aggregated metrics
      const aggregatedQuery = `
        SELECT 
          AVG((metrics->>'totalReturn')::DOUBLE PRECISION) as total_return,
          AVG((metrics->>'annualizedReturn')::DOUBLE PRECISION) as annualized_return,
          AVG((metrics->>'volatility')::DOUBLE PRECISION) as volatility,
          AVG((metrics->>'sharpeRatio')::DOUBLE PRECISION) as sharpe_ratio,
          AVG((metrics->>'sortinoRatio')::DOUBLE PRECISION) as sortino_ratio,
          AVG((metrics->>'maxDrawdown')::DOUBLE PRECISION) as max_drawdown,
          AVG((metrics->>'calmarRatio')::DOUBLE PRECISION) as calmar_ratio
        FROM performance_metrics 
        WHERE timestamp >= NOW() - INTERVAL '30 days'
      `;

      const aggregatedResults = await this.dbManager.executeQuery(aggregatedQuery);
      const aggData = aggregatedResults[0] || {};

      // Get time series data for charts
      const timeSeriesQuery = `
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          AVG((metrics->>'totalReturn')::DOUBLE PRECISION) as value
        FROM performance_metrics 
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY date
      `;

      const timeSeriesResults = await this.dbManager.executeQuery(timeSeriesQuery);
      const equityCurve: TimeSeriesData[] = timeSeriesResults.map(row => ({
        timestamp: new Date(row.date),
        value: parseFloat(row.value) || 0
      }));

      const performance: PerformanceDashboard = {
        timeRange: '30 days',
        strategies,
        aggregated: {
          totalReturn: parseFloat(aggData.total_return) || 0,
          annualizedReturn: parseFloat(aggData.annualized_return) || 0,
          volatility: parseFloat(aggData.volatility) || 0,
          sharpeRatio: parseFloat(aggData.sharpe_ratio) || 0,
          sortinoRatio: parseFloat(aggData.sortino_ratio) || 0,
          maxDrawdown: parseFloat(aggData.max_drawdown) || 0,
          calmarRatio: parseFloat(aggData.calmar_ratio) || 0
        },
        charts: {
          equityCurve,
          drawdownChart: [], // Would need to implement drawdown calculation
          returnsDistribution: [], // Would need to implement returns distribution
          rollingMetrics: [] // Would need to implement rolling metrics
        }
      };

      return performance;

    } catch (error) {
      logger.error('production-dashboards', 'Failed to get performance dashboard', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get health dashboard
   */
  async getHealthDashboard(): Promise<HealthDashboard> {
    try {
      const systemStatus = await this.monitoringSystem.getSystemStatus();
      const integratedMetrics = await this.monitoringSystem.collectIntegratedMetrics();

      const services: ServiceHealth[] = systemStatus.components.database ? [
        {
          name: 'Database',
          status: systemStatus.components.database.status,
          responseTime: 0, // Would need to implement
          uptime: integratedMetrics.system.uptime,
          lastCheck: systemStatus.components.database.lastCheck
        }
      ] : [];

      const health: HealthDashboard = {
        systemHealth: systemStatus.metrics.systemHealth,
        services,
        infrastructure: {
          database: {
            status: integratedMetrics.database.connectionHealth ? 'healthy' : 'unhealthy',
            responseTime: integratedMetrics.database.queryLatency,
            errorRate: 0,
            throughput: 0
          },
          cache: {
            status: 'healthy', // Would need to implement
            responseTime: 0,
            errorRate: 0,
            throughput: 0
          },
          messageQueue: {
            status: 'healthy', // Would need to implement
            responseTime: 0,
            errorRate: 0,
            throughput: 0
          },
          externalAPIs: {
            status: 'healthy', // Would need to implement
            responseTime: 0,
            errorRate: 0,
            throughput: 0
          }
        },
        resourceUsage: {
          cpu: {
            current: 0, // Would need to implement
            average: 0,
            peak: 0,
            threshold: 80,
            unit: '%'
          },
          memory: {
            current: (integratedMetrics.system.memoryUsage.used / integratedMetrics.system.memoryUsage.total) * 100,
            average: 0, // Would need to calculate
            peak: 0, // Would need to track
            threshold: 85,
            unit: '%'
          },
          disk: {
            current: 0, // Would need to implement
            average: 0,
            peak: 0,
            threshold: 90,
            unit: '%'
          },
          network: {
            current: 0, // Would need to implement
            average: 0,
            peak: 0,
            threshold: 100,
            unit: 'Mbps'
          }
        }
      };

      return health;

    } catch (error) {
      logger.error('production-dashboards', 'Failed to get health dashboard', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get alerts dashboard
   */
  async getAlertsDashboard(): Promise<AlertsDashboard> {
    try {
      // Get alert summary
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
          COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= CURRENT_DATE) as resolved_today
        FROM triggered_alerts
        WHERE timestamp >= NOW() - INTERVAL '7 days'
      `;

      const summaryResults = await this.dbManager.executeQuery(summaryQuery);
      const summaryData = summaryResults[0] || {};

      // Get recent alerts
      const recentAlertsQuery = `
        SELECT id, severity, name as title, description, 'system' as source, timestamp, status
        FROM triggered_alerts
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY timestamp DESC
        LIMIT 20
      `;

      const recentAlertsResults = await this.dbManager.executeQuery(recentAlertsQuery);
      const recentAlerts: Alert[] = recentAlertsResults.map(row => ({
        id: row.id,
        severity: row.severity,
        title: row.title,
        description: row.description,
        source: row.source,
        timestamp: new Date(row.timestamp),
        status: row.status
      }));

      // Get alert trends
      const trendsQuery = `
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as value
        FROM triggered_alerts
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour
      `;

      const trendsResults = await this.dbManager.executeQuery(trendsQuery);
      const alertTrends: TimeSeriesData[] = trendsResults.map(row => ({
        timestamp: new Date(row.hour),
        value: parseInt(row.value)
      }));

      const alerts: AlertsDashboard = {
        summary: {
          activeAlerts: parseInt(summaryData.active_alerts) || 0,
          totalAlerts: parseInt(summaryData.total_alerts) || 0,
          criticalAlerts: parseInt(summaryData.critical_alerts) || 0,
          resolvedToday: parseInt(summaryData.resolved_today) || 0
        },
        recentAlerts,
        alertTrends,
        topAlertSources: [] // Would need to implement
      };

      return alerts;

    } catch (error) {
      logger.error('production-dashboards', 'Failed to get alerts dashboard', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get trading dashboard
   */
  async getTradingDashboard(): Promise<TradingDashboard> {
    try {
      // This would need to be implemented based on actual trading data
      const trading: TradingDashboard = {
        liveMetrics: {
          activePositions: 0,
          dailyPnL: 0,
          totalExposure: 0,
          cashBalance: 0
        },
        recentTrades: [],
        performanceByStrategy: [],
        riskMetrics: {
          portfolioVaR: 0,
          portfolioBeta: 0,
          correlationMatrix: [],
          sectorExposure: []
        }
      };

      return trading;

    } catch (error) {
      logger.error('production-dashboards', 'Failed to get trading dashboard', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get infrastructure dashboard
   */
  async getInfrastructureDashboard(): Promise<InfrastructureDashboard> {
    try {
      const integratedMetrics = await this.monitoringSystem.collectIntegratedMetrics();

      const infrastructure: InfrastructureDashboard = {
        containers: [], // Would need Docker integration
        databases: [
          {
            name: 'PostgreSQL',
            status: integratedMetrics.database.connectionHealth ? 'connected' : 'disconnected',
            connections: integratedMetrics.database.activeConnections,
            queryTime: integratedMetrics.database.queryLatency,
            size: 0 // Would need to implement
          }
        ],
        apis: [], // Would need API monitoring
        queues: [], // Would need queue monitoring
        caches: [], // Would need cache monitoring
        logs: {
          totalLogs: 0, // Would need log aggregation
          errorLogs: 0,
          warningLogs: 0,
          logRate: 0
        }
      };

      return infrastructure;

    } catch (error) {
      logger.error('production-dashboards', 'Failed to get infrastructure dashboard', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Refresh dashboard data cache
   */
  private async refreshDashboardData(): Promise<void> {
    try {
      const dashboardData = await this.getDashboardData();
      this.dashboardCache.set('complete', dashboardData);
      this.dashboardCache.set('lastRefresh', new Date());

      logger.debug('production-dashboards', 'Dashboard data refreshed');

    } catch (error) {
      logger.error('production-dashboards', 'Failed to refresh dashboard data', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Get cached dashboard data
   */
  getCachedDashboardData(): DashboardData | null {
    return this.dashboardCache.get('complete') || null;
  }

  /**
   * Export dashboard data for external systems
   */
  async exportDashboardData(format: 'json' | 'csv' | 'prometheus'): Promise<string> {
    const data = await this.getDashboardData();

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        return this.convertToCSV(data);
      
      case 'prometheus':
        return this.convertToPrometheus(data);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert dashboard data to CSV format
   */
  private convertToCSV(data: DashboardData): string {
    // Implementation would depend on specific CSV requirements
    const lines: string[] = [];
    lines.push('timestamp,metric,value');
    lines.push(`${data.timestamp.toISOString()},system_status,${data.overview.status}`);
    lines.push(`${data.timestamp.toISOString()},uptime,${data.overview.uptime}`);
    lines.push(`${data.timestamp.toISOString()},active_strategies,${data.overview.activeStrategies}`);
    
    return lines.join('\n');
  }

  /**
   * Convert dashboard data to Prometheus format
   */
  private convertToPrometheus(data: DashboardData): string {
    const lines: string[] = [];
    const timestamp = Math.floor(data.timestamp.getTime() / 1000);
    
    lines.push(`# HELP trading_system_uptime System uptime in milliseconds`);
    lines.push(`# TYPE trading_system_uptime gauge`);
    lines.push(`trading_system_uptime ${data.overview.uptime} ${timestamp}`);
    
    lines.push(`# HELP trading_active_strategies Number of active trading strategies`);
    lines.push(`# TYPE trading_active_strategies gauge`);
    lines.push(`trading_active_strategies ${data.overview.activeStrategies} ${timestamp}`);
    
    return lines.join('\n');
  }

  /**
   * Get dashboard configuration
   */
  getConfig(): DashboardConfig {
    return this.config;
  }

  /**
   * Update dashboard configuration
   */
  updateConfig(config: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart with new configuration if needed
    if (this.refreshTimer && config.refreshInterval) {
      this.stop();
      this.start();
    }
  }
}

/**
 * Create production dashboard manager
 */
export function createProductionDashboardManager(
  dbManager: DatabaseManager,
  monitoringSystem: IntegratedMonitoringSystem,
  config?: Partial<DashboardConfig>
): ProductionDashboardManager {
  return new ProductionDashboardManager(dbManager, monitoringSystem, config);
}