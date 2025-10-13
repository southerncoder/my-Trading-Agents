/**
 * Enhanced Circuit Breaker Implementation
 * 
 * Builds upon the existing circuit breaker implementation with additional features:
 * - Configurable thresholds per provider type
 * - Exponential backoff for failed provider retry attempts
 * - Provider health status tracking and reporting
 * - Integration with existing resilience infrastructure
 * - Advanced failure detection patterns
 * - Automatic recovery mechanisms
 */

import { EventEmitter } from 'events';
import { CircuitBreaker as BaseCircuitBreaker, CircuitState, CircuitBreakerConfig } from '../utils/circuit-breaker.js';
import { createLogger } from '../utils/enhanced-logger.js';
import { TradingAgentError, ErrorType, ErrorSeverity, ErrorContext } from '../utils/trading-agent-error.js';
import { backOff } from 'exponential-backoff';

const logger = createLogger('system', 'enhanced-circuit-breaker');

// ========================================
// Enhanced Configuration Types
// ========================================

export interface EnhancedCircuitBreakerConfig extends CircuitBreakerConfig {
  // Exponential backoff configuration
  exponentialBackoff: {
    enabled: boolean;
    initialDelay: number;
    maxDelay: number;
    multiplier: number;
    jitter: boolean;
  };
  
  // Health tracking configuration
  healthTracking: {
    enabled: boolean;
    healthCheckInterval: number;
    degradationThreshold: number;
    recoveryThreshold: number;
  };
  
  // Provider-specific configuration
  providerType: 'news' | 'social' | 'fundamentals' | 'market_data';
  
  // Advanced failure detection
  failureDetection: {
    errorTypes: string[];
    timeoutThreshold: number;
    consecutiveFailureLimit: number;
  };
}

// ========================================
// Default Enhanced Configurations
// ========================================

export const DEFAULT_ENHANCED_CONFIG: EnhancedCircuitBreakerConfig = {
  // Base circuit breaker config
  failureThreshold: 3,
  recoveryTimeout: 60000,
  monitoringWindow: 300000,
  minimumRequests: 2,
  
  // Exponential backoff config
  exponentialBackoff: {
    enabled: true,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true
  },
  
  // Health tracking config
  healthTracking: {
    enabled: true,
    healthCheckInterval: 30000,
    degradationThreshold: 0.7,
    recoveryThreshold: 0.9
  },
  
  // Default provider type
  providerType: 'fundamentals',
  
  // Failure detection config
  failureDetection: {
    errorTypes: ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
    timeoutThreshold: 10000,
    consecutiveFailureLimit: 5
  }
};

// Provider-specific configurations
export const PROVIDER_CONFIGS: Record<string, Partial<EnhancedCircuitBreakerConfig>> = {
  news: {
    failureThreshold: 2,
    recoveryTimeout: 30000,
    exponentialBackoff: {
      enabled: true,
      initialDelay: 500,
      maxDelay: 15000,
      multiplier: 1.5,
      jitter: true
    }
  },
  social: {
    failureThreshold: 2,
    recoveryTimeout: 45000,
    exponentialBackoff: {
      enabled: true,
      initialDelay: 1000,
      maxDelay: 20000,
      multiplier: 2,
      jitter: true
    }
  },
  fundamentals: {
    failureThreshold: 4,
    recoveryTimeout: 90000,
    exponentialBackoff: {
      enabled: true,
      initialDelay: 2000,
      maxDelay: 60000,
      multiplier: 2.5,
      jitter: true
    }
  },
  market_data: {
    failureThreshold: 4,
    recoveryTimeout: 90000,
    exponentialBackoff: {
      enabled: true,
      initialDelay: 2000,
      maxDelay: 60000,
      multiplier: 2.5,
      jitter: true
    }
  }
};

// ========================================
// Health Status Types
// ========================================

export interface ProviderHealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  successRate: number;
  lastCheck: Date;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalRequests: number;
  totalFailures: number;
  averageResponseTime: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  lastFailureTime: Date | undefined;
  lastSuccessTime: Date | undefined;
  nextAttemptTime: Date | undefined;
  backoffDelay: number;
  healthStatus: ProviderHealthStatus;
}

// ========================================
// Enhanced Circuit Breaker Implementation
// ========================================

export class EnhancedCircuitBreaker extends EventEmitter {
  private baseCircuitBreaker: BaseCircuitBreaker;
  private config: EnhancedCircuitBreakerConfig;
  private healthStatus: ProviderHealthStatus;
  private metrics: {
    requests: Array<{ timestamp: Date; success: boolean; responseTime: number; error?: string }>;
    backoffDelay: number;
  };
  private healthCheckInterval: NodeJS.Timeout | undefined;

  constructor(
    config: Partial<EnhancedCircuitBreakerConfig> = {},
    private name: string = 'enhanced-circuit-breaker'
  ) {
    super();
    
    // Merge configuration with defaults and provider-specific settings
    this.config = this.mergeConfigurations(config);
    
    // Initialize base circuit breaker
    this.baseCircuitBreaker = new BaseCircuitBreaker(this.config, this.name);
    
    // Initialize health status
    this.healthStatus = {
      name: this.name,
      status: 'healthy',
      responseTime: 0,
      errorRate: 0,
      successRate: 1,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalRequests: 0,
      totalFailures: 0,
      averageResponseTime: 0
    };
    
    // Initialize metrics
    this.metrics = {
      requests: [],
      backoffDelay: this.config.exponentialBackoff.initialDelay
    };
    
    // Set up event forwarding from base circuit breaker
    this.setupEventForwarding();
    
    // Start health monitoring if enabled
    if (this.config.healthTracking.enabled) {
      this.startHealthMonitoring();
    }
    
    logger.info('enhanced-circuit-breaker-initialized', `Enhanced circuit breaker initialized: ${this.name}`, {
      name: this.name,
      config: this.sanitizeConfig(this.config)
    });
  }

  /**
   * Execute operation with enhanced circuit breaker protection
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Check if exponential backoff is enabled and we need to wait
      if (this.config.exponentialBackoff.enabled && this.shouldApplyBackoff()) {
        await this.applyExponentialBackoff();
      }
      
      // Execute through base circuit breaker
      const result = await this.baseCircuitBreaker.execute(operation);
      
      // Record successful execution
      const responseTime = Date.now() - startTime;
      this.recordExecution(true, responseTime);
      
      return result;
      
    } catch (error) {
      // Record failed execution
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.recordExecution(false, responseTime, errorMessage);
      
      // Update backoff delay for next attempt
      this.updateBackoffDelay();
      
      throw error;
    }
  }

  /**
   * Execute operation with retry logic using exponential backoff
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    if (!this.config.exponentialBackoff.enabled) {
      return this.execute(operation);
    }

    return backOff(
      () => this.execute(operation),
      {
        numOfAttempts: maxAttempts,
        startingDelay: this.config.exponentialBackoff.initialDelay,
        timeMultiple: this.config.exponentialBackoff.multiplier,
        maxDelay: this.config.exponentialBackoff.maxDelay,
        jitter: this.config.exponentialBackoff.jitter ? 'full' : 'none',
        retry: (error: any, attemptNumber: number) => {
          logger.warn('circuit-breaker-retry', `Retrying operation attempt ${attemptNumber}`, {
            name: this.name,
            attempt: attemptNumber,
            error: error instanceof Error ? error.message : String(error)
          });
          
          // Don't retry if circuit is open
          return this.baseCircuitBreaker.getState() !== CircuitState.OPEN;
        }
      }
    );
  }

  /**
   * Get current circuit breaker metrics
   */
  public getMetrics(): CircuitBreakerMetrics {
    const baseStats = this.baseCircuitBreaker.getStats();
    const recentRequests = this.getRecentRequests();
    
    const totalRequests = recentRequests.length;
    const failures = recentRequests.filter(r => !r.success).length;
    const successes = totalRequests - failures;
    const errorRate = totalRequests > 0 ? failures / totalRequests : 0;
    const avgResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests 
      : 0;

    return {
      state: baseStats.state,
      failures,
      successes,
      totalRequests,
      errorRate,
      averageResponseTime: avgResponseTime,
      lastFailureTime: baseStats.lastFailureTime ? new Date(baseStats.lastFailureTime) : undefined,
      lastSuccessTime: this.getLastSuccessTime(),
      nextAttemptTime: baseStats.nextAttemptTime ? new Date(baseStats.nextAttemptTime) : undefined,
      backoffDelay: this.metrics.backoffDelay,
      healthStatus: { ...this.healthStatus }
    };
  }

  /**
   * Get current health status
   */
  public getHealthStatus(): ProviderHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Force health check
   */
  public async performHealthCheck(): Promise<ProviderHealthStatus> {
    const recentRequests = this.getRecentRequests();
    const now = new Date();
    
    // Calculate metrics
    const totalRequests = recentRequests.length;
    const failures = recentRequests.filter(r => !r.success).length;
    const successes = totalRequests - failures;
    const errorRate = totalRequests > 0 ? failures / totalRequests : 0;
    const successRate = totalRequests > 0 ? successes / totalRequests : 1;
    const avgResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests 
      : 0;

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (errorRate > (1 - this.config.healthTracking.degradationThreshold)) {
      status = 'unhealthy';
    } else if (errorRate > (1 - this.config.healthTracking.recoveryThreshold)) {
      status = 'degraded';
    }
    
    // Update health status
    this.healthStatus = {
      ...this.healthStatus,
      status,
      responseTime: avgResponseTime,
      errorRate,
      successRate,
      lastCheck: now,
      totalRequests: this.healthStatus.totalRequests + (totalRequests - this.healthStatus.totalRequests),
      totalFailures: this.healthStatus.totalFailures + failures,
      averageResponseTime: avgResponseTime
    };
    
    // Emit health status change event
    this.emit('healthStatusChange', {
      name: this.name,
      previousStatus: this.healthStatus.status,
      currentStatus: status,
      metrics: this.getMetrics()
    });
    
    logger.debug('health-check-performed', `Health check performed for ${this.name}`, {
      name: this.name,
      status,
      errorRate,
      successRate,
      avgResponseTime
    });
    
    return { ...this.healthStatus };
  }

  /**
   * Reset circuit breaker state
   */
  public reset(): void {
    // Reset metrics
    this.metrics.requests = [];
    this.metrics.backoffDelay = this.config.exponentialBackoff.initialDelay;
    
    // Reset health status
    this.healthStatus.consecutiveFailures = 0;
    this.healthStatus.consecutiveSuccesses = 0;
    this.healthStatus.status = 'healthy';
    
    logger.info('circuit-breaker-reset', `Circuit breaker reset: ${this.name}`, {
      name: this.name
    });
    
    this.emit('reset', { name: this.name });
  }

  /**
   * Destroy circuit breaker and cleanup resources
   */
  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    this.removeAllListeners();
    
    logger.info('circuit-breaker-destroyed', `Circuit breaker destroyed: ${this.name}`, {
      name: this.name
    });
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * Merge configurations with defaults and provider-specific settings
   */
  private mergeConfigurations(config: Partial<EnhancedCircuitBreakerConfig>): EnhancedCircuitBreakerConfig {
    const providerConfig = config.providerType ? PROVIDER_CONFIGS[config.providerType] || {} : {};
    
    return {
      ...DEFAULT_ENHANCED_CONFIG,
      ...providerConfig,
      ...config,
      exponentialBackoff: {
        ...DEFAULT_ENHANCED_CONFIG.exponentialBackoff,
        ...providerConfig.exponentialBackoff,
        ...config.exponentialBackoff
      },
      healthTracking: {
        ...DEFAULT_ENHANCED_CONFIG.healthTracking,
        ...providerConfig.healthTracking,
        ...config.healthTracking
      },
      failureDetection: {
        ...DEFAULT_ENHANCED_CONFIG.failureDetection,
        ...providerConfig.failureDetection,
        ...config.failureDetection
      }
    };
  }

  /**
   * Set up event forwarding from base circuit breaker
   */
  private setupEventForwarding(): void {
    this.baseCircuitBreaker.on('stateChange', (event) => {
      logger.info('circuit-state-change', `Circuit breaker state changed: ${this.name}`, {
        name: this.name,
        from: event.from,
        to: event.to
      });
      
      this.emit('stateChange', { ...event, name: this.name });
    });
    
    this.baseCircuitBreaker.on('opened', (event) => {
      logger.warn('circuit-opened', `Circuit breaker opened: ${this.name}`, {
        name: this.name,
        failures: event.failures
      });
      
      this.emit('opened', { ...event, name: this.name });
    });
    
    this.baseCircuitBreaker.on('recovered', (event) => {
      logger.info('circuit-recovered', `Circuit breaker recovered: ${this.name}`, {
        name: this.name
      });
      
      // Reset backoff delay on recovery
      this.metrics.backoffDelay = this.config.exponentialBackoff.initialDelay;
      
      this.emit('recovered', { ...event, name: this.name });
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('health-check-error', `Health check failed for ${this.name}`, {
          name: this.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.healthTracking.healthCheckInterval);
    
    logger.debug('health-monitoring-started', `Health monitoring started for ${this.name}`, {
      name: this.name,
      interval: this.config.healthTracking.healthCheckInterval
    });
  }

  /**
   * Record execution result
   */
  private recordExecution(success: boolean, responseTime: number, error?: string): void {
    const request = {
      timestamp: new Date(),
      success,
      responseTime,
      ...(error ? { error } : {})
    };
    
    this.metrics.requests.push(request);
    
    // Keep only recent requests (last 1000 or within monitoring window)
    const cutoffTime = Date.now() - this.config.monitoringWindow;
    this.metrics.requests = this.metrics.requests
      .filter(r => r.timestamp.getTime() > cutoffTime)
      .slice(-1000);
    
    // Update consecutive counters
    if (success) {
      this.healthStatus.consecutiveSuccesses++;
      this.healthStatus.consecutiveFailures = 0;
    } else {
      this.healthStatus.consecutiveFailures++;
      this.healthStatus.consecutiveSuccesses = 0;
    }
  }

  /**
   * Check if exponential backoff should be applied
   */
  private shouldApplyBackoff(): boolean {
    return this.healthStatus.consecutiveFailures > 0 && 
           this.baseCircuitBreaker.getState() !== CircuitState.OPEN;
  }

  /**
   * Apply exponential backoff delay
   */
  private async applyExponentialBackoff(): Promise<void> {
    const delay = this.metrics.backoffDelay;
    
    logger.debug('applying-backoff', `Applying exponential backoff: ${this.name}`, {
      name: this.name,
      delay,
      consecutiveFailures: this.healthStatus.consecutiveFailures
    });
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Update backoff delay for next attempt
   */
  private updateBackoffDelay(): void {
    if (this.config.exponentialBackoff.enabled) {
      this.metrics.backoffDelay = Math.min(
        this.metrics.backoffDelay * this.config.exponentialBackoff.multiplier,
        this.config.exponentialBackoff.maxDelay
      );
      
      // Apply jitter if enabled
      if (this.config.exponentialBackoff.jitter) {
        const jitter = Math.random() * 0.1; // 10% jitter
        this.metrics.backoffDelay *= (1 + jitter);
      }
    }
  }

  /**
   * Get recent requests within monitoring window
   */
  private getRecentRequests() {
    const cutoffTime = Date.now() - this.config.monitoringWindow;
    return this.metrics.requests.filter(r => r.timestamp.getTime() > cutoffTime);
  }

  /**
   * Get last success time
   */
  private getLastSuccessTime(): Date | undefined {
    const successfulRequests = this.metrics.requests.filter(r => r.success);
    if (successfulRequests.length === 0) return undefined;
    
    const lastSuccess = successfulRequests[successfulRequests.length - 1];
    return lastSuccess ? lastSuccess.timestamp : undefined;
  }

  /**
   * Sanitize configuration for logging
   */
  private sanitizeConfig(config: EnhancedCircuitBreakerConfig): any {
    return {
      failureThreshold: config.failureThreshold,
      recoveryTimeout: config.recoveryTimeout,
      monitoringWindow: config.monitoringWindow,
      providerType: config.providerType,
      exponentialBackoffEnabled: config.exponentialBackoff.enabled,
      healthTrackingEnabled: config.healthTracking.enabled
    };
  }
}

// ========================================
// Factory Functions
// ========================================

/**
 * Create enhanced circuit breaker for specific provider type
 */
export function createEnhancedCircuitBreaker(
  providerType: 'news' | 'social' | 'fundamentals' | 'market_data',
  name: string,
  customConfig?: Partial<EnhancedCircuitBreakerConfig>
): EnhancedCircuitBreaker {
  const config: Partial<EnhancedCircuitBreakerConfig> = {
    providerType,
    ...customConfig
  };
  
  return new EnhancedCircuitBreaker(config, name);
}

/**
 * Create circuit breaker manager for multiple providers
 */
export class CircuitBreakerManager {
  private circuitBreakers: Map<string, EnhancedCircuitBreaker> = new Map();

  /**
   * Register a circuit breaker
   */
  public register(name: string, circuitBreaker: EnhancedCircuitBreaker): void {
    this.circuitBreakers.set(name, circuitBreaker);
    
    // Forward events with provider name
    circuitBreaker.on('stateChange', (event) => {
      this.emit('providerStateChange', { provider: name, ...event });
    });
    
    circuitBreaker.on('healthStatusChange', (event) => {
      this.emit('providerHealthChange', { provider: name, ...event });
    });
  }

  /**
   * Get circuit breaker by name
   */
  public get(name: string): EnhancedCircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Get all circuit breaker metrics
   */
  public getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name, breaker] of this.circuitBreakers) {
      metrics[name] = breaker.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Get all health statuses
   */
  public getAllHealthStatuses(): Record<string, ProviderHealthStatus> {
    const statuses: Record<string, ProviderHealthStatus> = {};
    
    for (const [name, breaker] of this.circuitBreakers) {
      statuses[name] = breaker.getHealthStatus();
    }
    
    return statuses;
  }

  /**
   * Reset all circuit breakers
   */
  public resetAll(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Destroy all circuit breakers
   */
  public destroyAll(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.destroy();
    }
    this.circuitBreakers.clear();
  }

  private emit(event: string, data: any): void {
    // EventEmitter functionality would be implemented here
    logger.debug('circuit-breaker-manager-event', `Circuit breaker manager event: ${event}`, data);
  }
}