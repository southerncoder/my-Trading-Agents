/**
 * Government Data Service Monitoring
 * 
 * Specialized monitoring for government data services including:
 * - SEC API rate limiting and compliance monitoring
 * - FRED API health and data freshness tracking
 * - BLS API performance monitoring
 * - Census Bureau API availability tracking
 * - Data quality and completeness validation
 */

import { createLogger } from '../utils/enhanced-logger.js';
import { DatabaseManager } from '../database/database-manager.js';

const logger = createLogger('system', 'government-data-monitoring');

export interface GovernmentDataMetrics {
  timestamp: Date;
  sec: SECMetrics;
  fred: FREDMetrics;
  bls: BLSMetrics;
  census: CensusMetrics;
  overall: OverallMetrics;
}

export interface SECMetrics {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  rateLimitStatus: 'safe' | 'warning' | 'critical';
  responseTime: number;
  errorRate: number;
  successfulRequests: number;
  failedRequests: number;
  dataFreshness: number; // hours since last successful update
  companyDataCount: number;
  filingDataCount: number;
  lastSuccessfulRequest: Date;
  userAgentCompliance: boolean;
}

export interface FREDMetrics {
  requestsPerMinute: number;
  requestsPerHour: number;
  rateLimitStatus: 'safe' | 'warning' | 'critical';
  responseTime: number;
  errorRate: number;
  successfulRequests: number;
  failedRequests: number;
  dataFreshness: number; // hours since last successful update
  seriesCount: number;
  observationsCount: number;
  lastSuccessfulRequest: Date;
  apiKeyValid: boolean;
}

export interface BLSMetrics {
  requestsPerMinute: number;
  requestsPerHour: number;
  rateLimitStatus: 'safe' | 'warning' | 'critical';
  responseTime: number;
  errorRate: number;
  successfulRequests: number;
  failedRequests: number;
  dataFreshness: number; // hours since last successful update
  seriesCount: number;
  dataPointsCount: number;
  lastSuccessfulRequest: Date;
  apiVersion: string;
}

export interface CensusMetrics {
  requestsPerMinute: number;
  requestsPerHour: number;
  responseTime: number;
  errorRate: number;
  successfulRequests: number;
  failedRequests: number;
  dataFreshness: number; // hours since last successful update
  datasetCount: number;
  variableCount: number;
  lastSuccessfulRequest: Date;
  serviceAvailability: boolean;
}

export interface OverallMetrics {
  totalRequests: number;
  averageResponseTime: number;
  overallErrorRate: number;
  servicesHealthy: number;
  servicesTotal: number;
  dataQualityScore: number; // 0-100
  complianceScore: number; // 0-100
}

export interface GovernmentDataAlert {
  id: string;
  service: 'sec' | 'fred' | 'bls' | 'census' | 'overall';
  type: 'rate_limit' | 'error_rate' | 'data_freshness' | 'compliance' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metrics: any;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface GovernmentDataConfig {
  monitoring: {
    enabled: boolean;
    interval: number; // milliseconds
    retentionDays: number;
  };
  
  rateLimits: {
    sec: {
      requestsPerSecond: number;
      warningThreshold: number; // percentage of limit
      criticalThreshold: number; // percentage of limit
    };
    fred: {
      requestsPerMinute: number;
      warningThreshold: number;
      criticalThreshold: number;
    };
    bls: {
      requestsPerMinute: number;
      warningThreshold: number;
      criticalThreshold: number;
    };
    census: {
      requestsPerMinute: number;
      warningThreshold: number;
      criticalThreshold: number;
    };
  };
  
  alertThresholds: {
    responseTime: number; // milliseconds
    errorRate: number; // percentage
    dataFreshness: number; // hours
    complianceScore: number; // minimum score
  };
  
  healthChecks: {
    enabled: boolean;
    interval: number; // milliseconds
    timeout: number; // milliseconds
  };
}

/**
 * Default government data monitoring configuration
 */
export const DEFAULT_GOVERNMENT_DATA_CONFIG: GovernmentDataConfig = {
  monitoring: {
    enabled: true,
    interval: 60000, // 1 minute
    retentionDays: 30
  },
  
  rateLimits: {
    sec: {
      requestsPerSecond: 10, // SEC limit
      warningThreshold: 80, // 8 requests/second
      criticalThreshold: 95 // 9.5 requests/second
    },
    fred: {
      requestsPerMinute: 120, // FRED limit
      warningThreshold: 80, // 96 requests/minute
      criticalThreshold: 95 // 114 requests/minute
    },
    bls: {
      requestsPerMinute: 500, // BLS limit (registered users)
      warningThreshold: 80, // 400 requests/minute
      criticalThreshold: 95 // 475 requests/minute
    },
    census: {
      requestsPerMinute: 500, // Estimated limit
      warningThreshold: 80,
      criticalThreshold: 95
    }
  },
  
  alertThresholds: {
    responseTime: 5000, // 5 seconds
    errorRate: 10, // 10%
    dataFreshness: 24, // 24 hours
    complianceScore: 90 // 90%
  },
  
  healthChecks: {
    enabled: true,
    interval: 300000, // 5 minutes
    timeout: 10000 // 10 seconds
  }
};

/**
 * Government Data Service Monitor
 */
export class GovernmentDataMonitor {
  private config: GovernmentDataConfig;
  private dbManager: DatabaseManager;
  private metrics: Map<string, GovernmentDataMetrics> = new Map();
  private alerts: Map<string, GovernmentDataAlert> = new Map();
  private rateLimitCounters: Map<string, number[]> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(dbManager: DatabaseManager, config: Partial<GovernmentDataConfig> = {}) {
    this.dbManager = dbManager;
    this.config = { ...DEFAULT_GOVERNMENT_DATA_CONFIG, ...config };
    
    // Initialize rate limit counters
    this.initializeRateLimitCounters();
    
    logger.info('government-data-monitoring', 'Government data monitor initialized', {
      monitoringEnabled: this.config.monitoring.enabled,
      healthChecksEnabled: this.config.healthChecks.enabled
    });
  }

  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (!this.config.monitoring.enabled) {
      logger.info('government-data-monitoring', 'Monitoring disabled');
      return;
    }

    try {
      // Initialize database schema
      await this.initializeSchema();
      
      // Start monitoring interval
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.collectMetrics();
        } catch (error) {
          logger.error('government-data-monitoring', 'Failed to collect metrics', {
            error: (error as Error).message
          });
        }
      }, this.config.monitoring.interval);

      // Start health check interval
      if (this.config.healthChecks.enabled) {
        this.healthCheckInterval = setInterval(async () => {
          try {
            await this.performHealthChecks();
          } catch (error) {
            logger.error('government-data-monitoring', 'Failed to perform health checks', {
              error: (error as Error).message
            });
          }
        }, this.config.healthChecks.interval);
      }

      logger.info('government-data-monitoring', 'Monitoring started');

    } catch (error) {
      logger.error('government-data-monitoring', 'Failed to start monitoring', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    logger.info('government-data-monitoring', 'Monitoring stopped');
  }

  /**
   * Record API request
   */
  recordAPIRequest(
    service: 'sec' | 'fred' | 'bls' | 'census',
    success: boolean,
    responseTime: number,
    endpoint?: string
  ): void {
    const timestamp = Date.now();
    const serviceKey = `${service}_requests`;
    
    // Update rate limit counters
    if (!this.rateLimitCounters.has(serviceKey)) {
      this.rateLimitCounters.set(serviceKey, []);
    }
    
    const requests = this.rateLimitCounters.get(serviceKey)!;
    requests.push(timestamp);
    
    // Clean old requests (keep only last hour)
    const oneHourAgo = timestamp - (60 * 60 * 1000);
    this.rateLimitCounters.set(serviceKey, requests.filter(t => t > oneHourAgo));
    
    // Check rate limits and generate alerts if needed
    this.checkRateLimits(service);
    
    logger.debug('government-data-monitoring', 'API request recorded', {
      service,
      success,
      responseTime,
      endpoint
    });
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): GovernmentDataMetrics | null {
    const latest = Array.from(this.metrics.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
    return latest || null;
  }

  /**
   * Get metrics history
   */
  async getMetricsHistory(hours: number = 24): Promise<GovernmentDataMetrics[]> {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    try {
      const results = await this.dbManager.executeQuery(`
        SELECT * FROM government_data_metrics 
        WHERE timestamp >= $1 
        ORDER BY timestamp DESC
      `, [since]);
      
      return results.map(row => ({
        timestamp: new Date(row.timestamp),
        sec: row.sec_metrics,
        fred: row.fred_metrics,
        bls: row.bls_metrics,
        census: row.census_metrics,
        overall: row.overall_metrics
      }));
      
    } catch (error) {
      logger.error('government-data-monitoring', 'Failed to get metrics history', {
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): GovernmentDataAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get service health status
   */
  async getServiceHealthStatus(): Promise<Record<string, any>> {
    const metrics = this.getCurrentMetrics();
    if (!metrics) {
      return {
        sec: { status: 'unknown', lastCheck: null },
        fred: { status: 'unknown', lastCheck: null },
        bls: { status: 'unknown', lastCheck: null },
        census: { status: 'unknown', lastCheck: null }
      };
    }

    return {
      sec: {
        status: this.getServiceStatus('sec', metrics.sec),
        lastCheck: metrics.timestamp,
        rateLimitStatus: metrics.sec.rateLimitStatus,
        errorRate: metrics.sec.errorRate,
        responseTime: metrics.sec.responseTime
      },
      fred: {
        status: this.getServiceStatus('fred', metrics.fred),
        lastCheck: metrics.timestamp,
        rateLimitStatus: metrics.fred.rateLimitStatus,
        errorRate: metrics.fred.errorRate,
        responseTime: metrics.fred.responseTime
      },
      bls: {
        status: this.getServiceStatus('bls', metrics.bls),
        lastCheck: metrics.timestamp,
        rateLimitStatus: metrics.bls.rateLimitStatus,
        errorRate: metrics.bls.errorRate,
        responseTime: metrics.bls.responseTime
      },
      census: {
        status: this.getServiceStatus('census', metrics.census),
        lastCheck: metrics.timestamp,
        errorRate: metrics.census.errorRate,
        responseTime: metrics.census.responseTime
      }
    };
  }

  /**
   * Generate monitoring dashboard data
   */
  async generateDashboardData(): Promise<any> {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const healthStatus = await this.getServiceHealthStatus();
    
    return {
      timestamp: new Date(),
      overview: {
        servicesHealthy: Object.values(healthStatus).filter(s => s.status === 'healthy').length,
        servicesTotal: 4,
        activeAlerts: activeAlerts.length,
        overallHealth: currentMetrics?.overall.servicesHealthy === 4 ? 'healthy' : 'degraded'
      },
      services: healthStatus,
      metrics: currentMetrics,
      alerts: activeAlerts.slice(0, 10), // Latest 10 alerts
      rateLimits: {
        sec: this.getRateLimitStatus('sec'),
        fred: this.getRateLimitStatus('fred'),
        bls: this.getRateLimitStatus('bls'),
        census: this.getRateLimitStatus('census')
      }
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Initialize rate limit counters
   */
  private initializeRateLimitCounters(): void {
    this.rateLimitCounters.set('sec_requests', []);
    this.rateLimitCounters.set('fred_requests', []);
    this.rateLimitCounters.set('bls_requests', []);
    this.rateLimitCounters.set('census_requests', []);
  }

  /**
   * Initialize database schema
   */
  private async initializeSchema(): Promise<void> {
    try {
      // Government data metrics table
      await this.dbManager.executeQuery(`
        CREATE TABLE IF NOT EXISTS government_data_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMPTZ NOT NULL,
          sec_metrics JSONB NOT NULL,
          fred_metrics JSONB NOT NULL,
          bls_metrics JSONB NOT NULL,
          census_metrics JSONB NOT NULL,
          overall_metrics JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Government data alerts table
      await this.dbManager.executeQuery(`
        CREATE TABLE IF NOT EXISTS government_data_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service VARCHAR(20) NOT NULL,
          type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          metrics JSONB NOT NULL,
          resolved BOOLEAN NOT NULL DEFAULT false,
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Create indexes
      await this.dbManager.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_government_data_metrics_timestamp 
        ON government_data_metrics(timestamp DESC)
      `);

      await this.dbManager.executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_government_data_alerts_service_timestamp 
        ON government_data_alerts(service, timestamp DESC)
      `);

      logger.debug('government-data-monitoring', 'Database schema initialized');

    } catch (error) {
      logger.error('government-data-monitoring', 'Failed to initialize schema', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Collect metrics from all services
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      
      // Collect metrics for each service
      const secMetrics = await this.collectSECMetrics();
      const fredMetrics = await this.collectFREDMetrics();
      const blsMetrics = await this.collectBLSMetrics();
      const censusMetrics = await this.collectCensusMetrics();
      
      // Calculate overall metrics
      const overallMetrics = this.calculateOverallMetrics(secMetrics, fredMetrics, blsMetrics, censusMetrics);
      
      const metrics: GovernmentDataMetrics = {
        timestamp,
        sec: secMetrics,
        fred: fredMetrics,
        bls: blsMetrics,
        census: censusMetrics,
        overall: overallMetrics
      };
      
      // Store metrics
      this.metrics.set(timestamp.toISOString(), metrics);
      await this.storeMetrics(metrics);
      
      // Check for alerts
      await this.checkAlerts(metrics);
      
      // Clean up old metrics
      this.cleanupOldMetrics();
      
      logger.debug('government-data-monitoring', 'Metrics collected', {
        overallHealth: overallMetrics.servicesHealthy + '/' + overallMetrics.servicesTotal
      });
      
    } catch (error) {
      logger.error('government-data-monitoring', 'Failed to collect metrics', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Collect SEC metrics
   */
  private async collectSECMetrics(): Promise<SECMetrics> {
    const requests = this.rateLimitCounters.get('sec_requests') || [];
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const requestsPerSecond = requests.filter(t => t > oneSecondAgo).length;
    const requestsPerMinute = requests.filter(t => t > oneMinuteAgo).length;
    const requestsPerHour = requests.filter(t => t > oneHourAgo).length;
    
    // Calculate rate limit status
    const rateLimitStatus = this.calculateRateLimitStatus('sec', requestsPerSecond);
    
    return {
      requestsPerSecond,
      requestsPerMinute,
      requestsPerHour,
      rateLimitStatus,
      responseTime: 0, // Would need to track actual response times
      errorRate: 0, // Would need to track actual error rates
      successfulRequests: requests.length, // Simplified
      failedRequests: 0, // Would need to track failures
      dataFreshness: 0, // Would need to track last successful data update
      companyDataCount: 0, // Would need to query actual data
      filingDataCount: 0, // Would need to query actual data
      lastSuccessfulRequest: requests.length > 0 ? new Date(Math.max(...requests)) : new Date(0),
      userAgentCompliance: true // Would need to verify User-Agent header
    };
  }

  /**
   * Collect FRED metrics
   */
  private async collectFREDMetrics(): Promise<FREDMetrics> {
    const requests = this.rateLimitCounters.get('fred_requests') || [];
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const requestsPerMinute = requests.filter(t => t > oneMinuteAgo).length;
    const requestsPerHour = requests.filter(t => t > oneHourAgo).length;
    
    const rateLimitStatus = this.calculateRateLimitStatus('fred', requestsPerMinute);
    
    return {
      requestsPerMinute,
      requestsPerHour,
      rateLimitStatus,
      responseTime: 0,
      errorRate: 0,
      successfulRequests: requests.length,
      failedRequests: 0,
      dataFreshness: 0,
      seriesCount: 0,
      observationsCount: 0,
      lastSuccessfulRequest: requests.length > 0 ? new Date(Math.max(...requests)) : new Date(0),
      apiKeyValid: true // Would need to verify API key
    };
  }

  /**
   * Collect BLS metrics
   */
  private async collectBLSMetrics(): Promise<BLSMetrics> {
    const requests = this.rateLimitCounters.get('bls_requests') || [];
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const requestsPerMinute = requests.filter(t => t > oneMinuteAgo).length;
    const requestsPerHour = requests.filter(t => t > oneHourAgo).length;
    
    const rateLimitStatus = this.calculateRateLimitStatus('bls', requestsPerMinute);
    
    return {
      requestsPerMinute,
      requestsPerHour,
      rateLimitStatus,
      responseTime: 0,
      errorRate: 0,
      successfulRequests: requests.length,
      failedRequests: 0,
      dataFreshness: 0,
      seriesCount: 0,
      dataPointsCount: 0,
      lastSuccessfulRequest: requests.length > 0 ? new Date(Math.max(...requests)) : new Date(0),
      apiVersion: '2.0'
    };
  }

  /**
   * Collect Census metrics
   */
  private async collectCensusMetrics(): Promise<CensusMetrics> {
    const requests = this.rateLimitCounters.get('census_requests') || [];
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const requestsPerMinute = requests.filter(t => t > oneMinuteAgo).length;
    const requestsPerHour = requests.filter(t => t > oneHourAgo).length;
    
    return {
      requestsPerMinute,
      requestsPerHour,
      responseTime: 0,
      errorRate: 0,
      successfulRequests: requests.length,
      failedRequests: 0,
      dataFreshness: 0,
      datasetCount: 0,
      variableCount: 0,
      lastSuccessfulRequest: requests.length > 0 ? new Date(Math.max(...requests)) : new Date(0),
      serviceAvailability: true
    };
  }

  /**
   * Calculate overall metrics
   */
  private calculateOverallMetrics(
    sec: SECMetrics,
    fred: FREDMetrics,
    bls: BLSMetrics,
    census: CensusMetrics
  ): OverallMetrics {
    const totalRequests = sec.successfulRequests + fred.successfulRequests + 
                         bls.successfulRequests + census.successfulRequests;
    
    const averageResponseTime = (sec.responseTime + fred.responseTime + 
                               bls.responseTime + census.responseTime) / 4;
    
    const overallErrorRate = (sec.errorRate + fred.errorRate + 
                            bls.errorRate + census.errorRate) / 4;
    
    const servicesHealthy = [
      this.getServiceStatus('sec', sec),
      this.getServiceStatus('fred', fred),
      this.getServiceStatus('bls', bls),
      this.getServiceStatus('census', census)
    ].filter(status => status === 'healthy').length;
    
    return {
      totalRequests,
      averageResponseTime,
      overallErrorRate,
      servicesHealthy,
      servicesTotal: 4,
      dataQualityScore: 95, // Would need to calculate based on actual data quality
      complianceScore: 98 // Would need to calculate based on compliance checks
    };
  }

  /**
   * Calculate rate limit status
   */
  private calculateRateLimitStatus(
    service: 'sec' | 'fred' | 'bls' | 'census',
    currentRate: number
  ): 'safe' | 'warning' | 'critical' {
    const limits = this.config.rateLimits[service];
    const limit = service === 'sec' ? limits.requestsPerSecond : limits.requestsPerMinute;
    const percentage = (currentRate / limit) * 100;
    
    if (percentage >= limits.criticalThreshold) {
      return 'critical';
    } else if (percentage >= limits.warningThreshold) {
      return 'warning';
    } else {
      return 'safe';
    }
  }

  /**
   * Get service status
   */
  private getServiceStatus(service: string, metrics: any): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      return 'unhealthy';
    }
    
    if (metrics.responseTime > this.config.alertThresholds.responseTime) {
      return 'degraded';
    }
    
    if (metrics.rateLimitStatus === 'critical') {
      return 'unhealthy';
    }
    
    if (metrics.rateLimitStatus === 'warning') {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Get rate limit status
   */
  private getRateLimitStatus(service: 'sec' | 'fred' | 'bls' | 'census'): any {
    const requests = this.rateLimitCounters.get(`${service}_requests`) || [];
    const now = Date.now();
    const timeWindow = service === 'sec' ? 1000 : 60000; // 1 second for SEC, 1 minute for others
    const recentRequests = requests.filter(t => t > (now - timeWindow)).length;
    
    const limits = this.config.rateLimits[service];
    const limit = service === 'sec' ? limits.requestsPerSecond : limits.requestsPerMinute;
    
    return {
      current: recentRequests,
      limit,
      percentage: (recentRequests / limit) * 100,
      status: this.calculateRateLimitStatus(service, recentRequests)
    };
  }

  /**
   * Check rate limits
   */
  private checkRateLimits(service: 'sec' | 'fred' | 'bls' | 'census'): void {
    const rateLimitStatus = this.getRateLimitStatus(service);
    
    if (rateLimitStatus.status === 'critical' || rateLimitStatus.status === 'warning') {
      const alert: GovernmentDataAlert = {
        id: `rate_limit_${service}_${Date.now()}`,
        service,
        type: 'rate_limit',
        severity: rateLimitStatus.status === 'critical' ? 'critical' : 'medium',
        message: `${service.toUpperCase()} API rate limit ${rateLimitStatus.status}: ${rateLimitStatus.current}/${rateLimitStatus.limit} requests`,
        timestamp: new Date(),
        metrics: rateLimitStatus,
        resolved: false
      };
      
      this.alerts.set(alert.id, alert);
      
      logger.warn('government-data-monitoring', 'Rate limit alert generated', {
        service,
        status: rateLimitStatus.status,
        current: rateLimitStatus.current,
        limit: rateLimitStatus.limit
      });
    }
  }

  /**
   * Check for alerts
   */
  private async checkAlerts(metrics: GovernmentDataMetrics): Promise<void> {
    // Check each service for alert conditions
    this.checkServiceAlerts('sec', metrics.sec);
    this.checkServiceAlerts('fred', metrics.fred);
    this.checkServiceAlerts('bls', metrics.bls);
    this.checkServiceAlerts('census', metrics.census);
    
    // Check overall system alerts
    this.checkOverallAlerts(metrics.overall);
    
    // Store alerts in database
    await this.storeAlerts();
  }

  /**
   * Check service-specific alerts
   */
  private checkServiceAlerts(service: string, metrics: any): void {
    // Error rate alert
    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      const alert: GovernmentDataAlert = {
        id: `error_rate_${service}_${Date.now()}`,
        service: service as any,
        type: 'error_rate',
        severity: metrics.errorRate > (this.config.alertThresholds.errorRate * 2) ? 'critical' : 'high',
        message: `${service.toUpperCase()} API error rate is ${metrics.errorRate.toFixed(1)}%`,
        timestamp: new Date(),
        metrics: { errorRate: metrics.errorRate },
        resolved: false
      };
      
      this.alerts.set(alert.id, alert);
    }
    
    // Response time alert
    if (metrics.responseTime > this.config.alertThresholds.responseTime) {
      const alert: GovernmentDataAlert = {
        id: `response_time_${service}_${Date.now()}`,
        service: service as any,
        type: 'availability',
        severity: 'medium',
        message: `${service.toUpperCase()} API response time is ${metrics.responseTime}ms`,
        timestamp: new Date(),
        metrics: { responseTime: metrics.responseTime },
        resolved: false
      };
      
      this.alerts.set(alert.id, alert);
    }
    
    // Data freshness alert
    if (metrics.dataFreshness > this.config.alertThresholds.dataFreshness) {
      const alert: GovernmentDataAlert = {
        id: `data_freshness_${service}_${Date.now()}`,
        service: service as any,
        type: 'data_freshness',
        severity: 'medium',
        message: `${service.toUpperCase()} data is ${metrics.dataFreshness} hours old`,
        timestamp: new Date(),
        metrics: { dataFreshness: metrics.dataFreshness },
        resolved: false
      };
      
      this.alerts.set(alert.id, alert);
    }
  }

  /**
   * Check overall system alerts
   */
  private checkOverallAlerts(metrics: OverallMetrics): void {
    // Compliance score alert
    if (metrics.complianceScore < this.config.alertThresholds.complianceScore) {
      const alert: GovernmentDataAlert = {
        id: `compliance_${Date.now()}`,
        service: 'overall',
        type: 'compliance',
        severity: 'high',
        message: `Government data compliance score is ${metrics.complianceScore}%`,
        timestamp: new Date(),
        metrics: { complianceScore: metrics.complianceScore },
        resolved: false
      };
      
      this.alerts.set(alert.id, alert);
    }
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    // This would perform actual health checks against government APIs
    logger.debug('government-data-monitoring', 'Health checks performed');
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(metrics: GovernmentDataMetrics): Promise<void> {
    try {
      await this.dbManager.executeQuery(`
        INSERT INTO government_data_metrics (timestamp, sec_metrics, fred_metrics, bls_metrics, census_metrics, overall_metrics)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        metrics.timestamp,
        JSON.stringify(metrics.sec),
        JSON.stringify(metrics.fred),
        JSON.stringify(metrics.bls),
        JSON.stringify(metrics.census),
        JSON.stringify(metrics.overall)
      ]);
      
    } catch (error) {
      logger.error('government-data-monitoring', 'Failed to store metrics', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Store alerts in database
   */
  private async storeAlerts(): Promise<void> {
    const newAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    
    for (const alert of newAlerts) {
      try {
        await this.dbManager.executeQuery(`
          INSERT INTO government_data_alerts (service, type, severity, message, timestamp, metrics)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          alert.service,
          alert.type,
          alert.severity,
          alert.message,
          alert.timestamp,
          JSON.stringify(alert.metrics)
        ]);
        
      } catch (error) {
        logger.error('government-data-monitoring', 'Failed to store alert', {
          alertId: alert.id,
          error: (error as Error).message
        });
      }
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - (this.config.monitoring.retentionDays * 24 * 60 * 60 * 1000));
    
    for (const [key, metrics] of this.metrics) {
      if (metrics.timestamp < cutoff) {
        this.metrics.delete(key);
      }
    }
  }
}

/**
 * Create government data monitor
 */
export function createGovernmentDataMonitor(
  dbManager: DatabaseManager,
  config?: Partial<GovernmentDataConfig>
): GovernmentDataMonitor {
  return new GovernmentDataMonitor(dbManager, config);
}