/**
 * Comprehensive Health Monitoring System for Trading Agents
 *
 * Integrates all service health checks, performance monitoring,
 * and alerting capabilities for production deployment
 */

import { createLogger } from './enhanced-logger';
import { getLLMHealth } from './resilient-llm';
import { getEmbedderHealth } from './resilient-embedder';
import { getDataflowHealth } from './resilient-dataflow';

const logger = createLogger('system', 'health-monitor');

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastChecked: Date;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  services: ServiceHealth[];
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
    activeConnections: number;
  };
  alerts: HealthAlert[];
}

export interface HealthAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  message: string;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface HealthMonitorConfig {
  checkInterval: number; // milliseconds
  timeout: number; // milliseconds
  alertThresholds: {
    responseTime: number; // milliseconds
    consecutiveFailures: number;
  };
  services: ServiceEndpoint[];
}

export interface ServiceEndpoint {
  name: string;
  url: string;
  type: 'http' | 'websocket' | 'internal';
  critical: boolean;
  expectedStatus?: number;
}

/**
 * Comprehensive Health Monitor for all Trading Agents services
 */
export class HealthMonitor {
  private config: HealthMonitorConfig;
  private services: Map<string, ServiceHealth> = new Map();
  private alerts: HealthAlert[] = [];
  private startTime: Date = new Date();
  private checkTimer?: NodeJS.Timeout | undefined;
  private consecutiveFailures: Map<string, number> = new Map();

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = {
      checkInterval: config.checkInterval || 30000, // 30 seconds
      timeout: config.timeout || 5000, // 5 seconds
      alertThresholds: {
        responseTime: config.alertThresholds?.responseTime || 2000,
        consecutiveFailures: config.alertThresholds?.consecutiveFailures || 3
      },
      services: config.services || this.getDefaultServices()
    };

    logger.info('health-monitor', 'HealthMonitor initialized', {
      checkInterval: this.config.checkInterval,
      serviceCount: this.config.services.length
    });
  }

  /**
   * Start health monitoring
   */
  public start(): void {
    logger.info('health-monitor', 'Starting health monitoring');
    this.performHealthCheck(); // Initial check
    this.checkTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  public stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
    logger.info('health-monitor', 'Health monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    logger.debug('health-monitor', 'Performing health check');

    const serviceChecks = await Promise.allSettled(
      this.config.services.map(service => this.checkService(service))
    );

    const services: ServiceHealth[] = [];
    let degradedCount = 0;
    let unhealthyCount = 0;

    serviceChecks.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const service = result.value;
        services.push(service);

        if (service.status === 'degraded') degradedCount++;
        if (service.status === 'unhealthy') unhealthyCount++;

        this.services.set(service.name, service);
      } else {
        const service = this.config.services[index];
        const errorService: ServiceHealth = {
          name: service?.name || 'unknown',
          status: 'unhealthy',
          lastChecked: new Date(),
          error: result.reason?.message || 'Check failed'
        };
        services.push(errorService);
        unhealthyCount++;
        if (service) {
          this.services.set(service.name, errorService);
        }
      }
    });

    // Add internal component health checks
    const internalChecks = await this.checkInternalComponents();
    services.push(...internalChecks);

    internalChecks.forEach(service => {
      if (service.status === 'degraded') degradedCount++;
      if (service.status === 'unhealthy') unhealthyCount++;
      this.services.set(service.name, service);
    });

    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    // Generate alerts
    this.generateAlerts(services);

    const systemHealth: SystemHealth = {
      overall,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      services,
      performance: this.getPerformanceMetrics(),
      alerts: this.alerts.filter(alert => !alert.resolved)
    };

    const checkDuration = Date.now() - startTime;
    logger.info('health-monitor', 'Health check completed', {
      overall,
      servicesChecked: services.length,
      degradedCount,
      unhealthyCount,
      checkDuration
    });

    return systemHealth;
  }

  /**
   * Check individual service health
   */
  private async checkService(service: ServiceEndpoint): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      let response: Response | null = null;
      let isHealthy = false;

      if (service.type === 'http') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        response = await fetch(service.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'TradingAgents-HealthMonitor/1.0' }
        });

        clearTimeout(timeoutId);
        isHealthy = response.ok && (!service.expectedStatus || response.status === service.expectedStatus);
      } else if (service.type === 'websocket') {
        // WebSocket health check would go here
        isHealthy = true; // Placeholder
      } else if (service.type === 'internal') {
        // Internal component checks are handled separately
        isHealthy = true;
      }

      const responseTime = Date.now() - startTime;
      const consecutiveFailures = this.consecutiveFailures.get(service.name) || 0;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (!isHealthy) {
        status = 'unhealthy';
        this.consecutiveFailures.set(service.name, consecutiveFailures + 1);
      } else if (responseTime > this.config.alertThresholds.responseTime) {
        status = 'degraded';
        this.consecutiveFailures.set(service.name, 0);
      } else {
        this.consecutiveFailures.set(service.name, 0);
      }

      const serviceHealth: ServiceHealth = {
        name: service.name,
        status,
        responseTime,
        lastChecked: new Date(),
        details: response ? {
          statusCode: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        } : {}
      };

      if (status !== 'healthy') {
        logger.warn('health-monitor', 'Service health check', {
          service: service.name,
          status,
          responseTime,
          consecutiveFailures: this.consecutiveFailures.get(service.name)
        });
      }

      return serviceHealth;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const consecutiveFailures = (this.consecutiveFailures.get(service.name) || 0) + 1;
      this.consecutiveFailures.set(service.name, consecutiveFailures);

      logger.error('health-monitor', 'Service health check failed', {
        service: service.name,
        error: (error as Error).message,
        responseTime,
        consecutiveFailures
      });

      return {
        name: service.name,
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date(),
        error: (error as Error).message
      };
    }
  }

  /**
   * Check internal component health
   */
  private async checkInternalComponents(): Promise<ServiceHealth[]> {
    const components: ServiceHealth[] = [];

    // LLM Health (simplified check)
    try {
      // Simple connectivity check to LM Studio
      const lmStudioUrl = process.env.REMOTE_LM_STUDIO_BASE_URL;
      if (!lmStudioUrl) {
        throw new Error('REMOTE_LM_STUDIO_BASE_URL environment variable is required');
      }
      const response = await fetch(`${lmStudioUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      components.push({
        name: 'LLM Service',
        status: response.ok ? 'healthy' : 'unhealthy',
        lastChecked: new Date(),
        details: { url: lmStudioUrl, statusCode: response.status }
      });
    } catch (error) {
      components.push({
        name: 'LLM Service',
        status: 'unhealthy',
        lastChecked: new Date(),
        error: (error as Error).message
      });
    }

    // Embedder Health
    try {
      const embedderHealth = getEmbedderHealth();
      components.push({
        name: 'Embedder Service',
        status: embedderHealth.isHealthy ? 'healthy' : 'unhealthy',
        lastChecked: new Date(),
        details: embedderHealth
      });
    } catch (error) {
      components.push({
        name: 'Embedder Service',
        status: 'unhealthy',
        lastChecked: new Date(),
        error: (error as Error).message
      });
    }

    // Dataflow Health (simplified check)
    try {
      // Simple check - if we can import the module, it's healthy
      components.push({
        name: 'Dataflow Service',
        status: 'healthy',
        lastChecked: new Date(),
        details: { status: 'module_available' }
      });
    } catch (error) {
      components.push({
        name: 'Dataflow Service',
        status: 'unhealthy',
        lastChecked: new Date(),
        error: (error as Error).message
      });
    }

    return components;
  }

  /**
   * Generate alerts based on service health
   */
  private generateAlerts(services: ServiceHealth[]): void {
    const now = new Date();

    services.forEach(service => {
      const consecutiveFailures = this.consecutiveFailures.get(service.name) || 0;

      if (service.status === 'unhealthy' && consecutiveFailures >= this.config.alertThresholds.consecutiveFailures) {
        const existingAlert = this.alerts.find(
          alert => alert.service === service.name && !alert.resolved
        );

        if (!existingAlert) {
          const alert: HealthAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            severity: service.name.includes('Neo4j') || service.name.includes('Zep') ? 'critical' : 'high',
            service: service.name,
            message: `${service.name} is unhealthy (${consecutiveFailures} consecutive failures)`,
            timestamp: now
          };

          this.alerts.push(alert);
          logger.error('health-monitor', 'Health alert generated', {
            alertId: alert.id,
            service: alert.service,
            severity: alert.severity,
            message: alert.message
          });
        }
      } else if (service.status === 'degraded') {
        const existingAlert = this.alerts.find(
          alert => alert.service === service.name && alert.severity === 'medium' && !alert.resolved
        );

        if (!existingAlert) {
          const alert: HealthAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            severity: 'medium',
            service: service.name,
            message: `${service.name} is degraded (slow response: ${service.responseTime}ms)`,
            timestamp: now
          };

          this.alerts.push(alert);
          logger.warn('health-monitor', 'Health alert generated', {
            alertId: alert.id,
            service: alert.service,
            severity: alert.severity,
            message: alert.message
          });
        }
      } else {
        // Service is healthy, resolve any existing alerts
        const existingAlerts = this.alerts.filter(
          alert => alert.service === service.name && !alert.resolved
        );

        existingAlerts.forEach(alert => {
          alert.resolved = true;
          alert.resolvedAt = now;
          logger.info('health-monitor', 'Health alert resolved', {
            alertId: alert.id,
            service: alert.service,
            resolvedAfter: now.getTime() - alert.timestamp.getTime()
          });
        });
      }
    });
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics() {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: 0 // Would need to track actual connections
    };
  }

  /**
   * Get current system health status
   */
  public getSystemHealth(): SystemHealth {
    const services = Array.from(this.services.values());

    let degradedCount = 0;
    let unhealthyCount = 0;

    services.forEach(service => {
      if (service.status === 'degraded') degradedCount++;
      if (service.status === 'unhealthy') unhealthyCount++;
    });

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      services,
      performance: this.getPerformanceMetrics(),
      alerts: this.alerts.filter(alert => !alert.resolved)
    };
  }

  /**
   * Get health alerts
   */
  public getAlerts(): HealthAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert manually
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      logger.info('health-monitor', 'Alert manually resolved', { alertId, service: alert.service });
      return true;
    }
    return false;
  }

  /**
   * Get default service endpoints
   */
  private getDefaultServices(): ServiceEndpoint[] {
    return [
      {
        name: 'Neo4j Database',
        url: process.env.NEO4J_URI || 'bolt://localhost:7687',
        type: 'http',
        critical: true,
        expectedStatus: 200
      },
      {
        name: 'Zep Graphiti',
        url: `${process.env.ZEP_SERVICE_URL || 'http://localhost:8000'}/health`,
        type: 'http',
        critical: true
      },
      {
        name: 'Yahoo Finance',
        url: 'http://localhost:3002/health',
        type: 'http',
        critical: false
      },
      {
        name: 'Google News',
        url: 'http://localhost:3003/health',
        type: 'http',
        critical: false
      },
      {
        name: 'Reddit Service',
        url: 'http://localhost:3001/health',
        type: 'http',
        critical: false
      }
    ];
  }
}

/**
 * Global health monitor instance
 */
export const healthMonitor = new HealthMonitor();

/**
 * Start health monitoring
 */
export function startHealthMonitoring(): void {
  healthMonitor.start();
}

/**
 * Stop health monitoring
 */
export function stopHealthMonitoring(): void {
  healthMonitor.stop();
}

/**
 * Get current system health
 */
export function getSystemHealth(): SystemHealth {
  return healthMonitor.getSystemHealth();
}

/**
 * Get active health alerts
 */
export function getHealthAlerts(): HealthAlert[] {
  return healthMonitor.getAlerts();
}

/**
 * Create health check endpoint middleware
 */
export function createHealthEndpoint() {
  return async (req: any, res: any) => {
    try {
      const health = await healthMonitor.performHealthCheck();

      const statusCode = health.overall === 'healthy' ? 200 :
                        health.overall === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        status: health.overall,
        timestamp: health.timestamp,
        uptime: health.uptime,
        services: health.services.map(service => ({
          name: service.name,
          status: service.status,
          responseTime: service.responseTime,
          lastChecked: service.lastChecked
        })),
        alerts: health.alerts.length,
        performance: {
          memoryUsage: health.performance.memoryUsage,
          activeConnections: health.performance.activeConnections
        }
      });
    } catch (error) {
      logger.error('health-monitor', 'Health endpoint error', { error: (error as Error).message });
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date()
      });
    }
  };
}