/**
 * Resilient Data Flow Wrapper
 * 
 * This module provides resilient wrappers for external data services following
 * the same patterns as resilient-embedder.ts. It wraps external API calls
 * (Yahoo Finance, Reddit, News APIs, etc.) with retry logic, circuit breaker,
 * timeout handling, and comprehensive monitoring.
 * 
 * Key features:
 * - Circuit breaker pattern for external API resilience
 * - Retry logic with exponential backoff
 * - Timeout handling with AbortController
 * - Comprehensive metrics collection
 * - Health check endpoints
 * - Structured logging integration
 */

import pRetry from 'p-retry';
import CircuitBreaker from 'opossum';
import { createLogger } from './enhanced-logger';
import { getMeter, ENABLE_OTEL } from '../observability/opentelemetry-setup';

// Types for resilient dataflow
export interface DataflowConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  circuitBreakerConfig?: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
}

export interface DataflowMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retriedRequests: number;
  circuitBreakerOpens: number;
  circuitBreakerCloses: number;
  averageResponseTime: number;
  lastError?: string;
  lastSuccess: Date | null;
  lastFailure: Date | null;
}

export interface DataflowHealth {
  isHealthy: boolean;
  circuitBreakerState: string;
  metrics: DataflowMetrics;
  lastChecked: Date;
}

/**
 * Metrics collector for dataflow operations
 */
export class DataflowMetricsCollector {
  private metrics: DataflowMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retriedRequests: 0,
    circuitBreakerOpens: 0,
    circuitBreakerCloses: 0,
    averageResponseTime: 0,
    lastSuccess: null,
    lastFailure: null
  };

  private responseTimes: number[] = [];
  private readonly maxResponseTimesSamples = 100;
  private requestCounter?: any;
  private successCounter?: any;
  private failureCounter?: any;

  constructor() {
    if (ENABLE_OTEL) {
      try {
        const meter = getMeter('resilient-dataflow');
        this.requestCounter = meter.createCounter('dataflow_requests_total', { description: 'Total dataflow requests' } as any);
        this.successCounter = meter.createCounter('dataflow_success_total', { description: 'Successful dataflow requests' } as any);
        this.failureCounter = meter.createCounter('dataflow_failure_total', { description: 'Failed dataflow requests' } as any);
      } catch (err) {}
    }
  }

  recordRequest(): void {
    this.metrics.totalRequests++;
    try { this.requestCounter?.add(1); } catch (err) {}
  }

  recordSuccess(responseTime: number): void {
    this.metrics.successfulRequests++;
    this.metrics.lastSuccess = new Date();
    this.updateResponseTime(responseTime);
    try { this.successCounter?.add(1, { response_time_ms: responseTime }); } catch (err) {}
  }

  recordFailure(error: string): void {
    this.metrics.failedRequests++;
    this.metrics.lastError = error;
    this.metrics.lastFailure = new Date();
    try { this.failureCounter?.add(1, { error: error }); } catch (err) {}
  }

  recordRetry(): void {
    this.metrics.retriedRequests++;
  }

  recordCircuitBreakerOpen(): void {
    this.metrics.circuitBreakerOpens++;
  }

  recordCircuitBreakerClose(): void {
    this.metrics.circuitBreakerCloses++;
  }

  private updateResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only recent response times
    if (this.responseTimes.length > this.maxResponseTimesSamples) {
      this.responseTimes.shift();
    }
    
    // Calculate average
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  getMetrics(): DataflowMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      circuitBreakerOpens: 0,
      circuitBreakerCloses: 0,
      averageResponseTime: 0,
      lastSuccess: null,
      lastFailure: null
    };
    this.responseTimes = [];
  }
}

/**
 * Create a dataflow-specific error with context
 */
export function createDataflowError(
  operation: string,
  originalError: unknown,
  context: Record<string, any> = {}
): Error {
  const errorMessage = originalError instanceof Error ? originalError.message : String(originalError);
  const error = new Error(`Dataflow ${operation} failed: ${errorMessage}`);
  
  // Add context properties
  Object.assign(error, {
    operation,
    originalError,
    context,
    timestamp: new Date().toISOString(),
    isDataflowError: true
  });
  
  return error;
}

/**
 * Default configuration for dataflow resilience
 */
const defaultDataflowConfig: Required<DataflowConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000, // 30 seconds
  circuitBreakerConfig: {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    name: 'dataflow-circuit-breaker'
  }
};

/**
 * Main resilient dataflow function
 */
export async function withDataflowResilience<T>(
  operation: string,
  fn: () => Promise<T>,
  config: DataflowConfig = {},
  signal?: AbortSignal
): Promise<T> {
  const finalConfig = { ...defaultDataflowConfig, ...config };
  const logger = createLogger('dataflow', 'resilient');
  const metrics = new DataflowMetricsCollector();
  
  logger.info('operation-start', `Starting ${operation}`, {
    maxRetries: finalConfig.maxRetries,
    timeout: finalConfig.timeout,
    hasSignal: !!signal
  });

  // Create circuit breaker
  const circuitBreakerOptions = {
    timeout: finalConfig.circuitBreakerConfig.timeout,
    errorThresholdPercentage: finalConfig.circuitBreakerConfig.errorThresholdPercentage,
    resetTimeout: finalConfig.circuitBreakerConfig.resetTimeout,
    rollingCountTimeout: finalConfig.circuitBreakerConfig.rollingCountTimeout,
    rollingCountBuckets: finalConfig.circuitBreakerConfig.rollingCountBuckets,
    name: `${finalConfig.circuitBreakerConfig.name}-${operation}`
  };

  const circuitBreaker = new CircuitBreaker(fn, circuitBreakerOptions);

  // Circuit breaker event handlers
  circuitBreaker.on('open', () => {
    logger.warn('circuit-breaker-open', `Circuit breaker opened for ${operation}`, {
      state: 'open',
      metrics: metrics.getMetrics()
    });
    metrics.recordCircuitBreakerOpen();
  });

  circuitBreaker.on('halfOpen', () => {
    logger.info('circuit-breaker-half-open', `Circuit breaker half-open for ${operation}`, {
      state: 'half-open'
    });
  });

  circuitBreaker.on('close', () => {
    logger.info('circuit-breaker-close', `Circuit breaker closed for ${operation}`, {
      state: 'closed'
    });
    metrics.recordCircuitBreakerClose();
  });

  circuitBreaker.on('failure', (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    metrics.recordFailure(errorMessage);
    logger.error('circuit-breaker-failure', `Circuit breaker failure for ${operation}`, {
      error: errorMessage,
      circuitBreakerMetrics: circuitBreaker.stats
    });
  });

  circuitBreaker.on('success', (result) => {
    logger.debug('circuit-breaker-success', `Circuit breaker success for ${operation}`, {
      circuitBreakerMetrics: circuitBreaker.stats,
      hasResult: !!result
    });
  });

  // Wrap with retry logic
  const resilientOperation = async (): Promise<T> => {
    metrics.recordRequest();
    const startTime = Date.now();

    try {
      const result = await pRetry(
        async (attemptNumber) => {
          if (signal?.aborted) {
            throw new Error('Operation aborted by signal');
          }

          if (attemptNumber > 1) {
            metrics.recordRetry();
            logger.info('retry-attempt', `Retry attempt for ${operation}`, {
              attempt: attemptNumber,
              maxRetries: finalConfig.maxRetries
            });
          }

          // Use circuit breaker for the actual operation
          const operationResult = await circuitBreaker.fire();
          return operationResult;
        },
        {
          retries: finalConfig.maxRetries,
          minTimeout: finalConfig.retryDelay,
          maxTimeout: finalConfig.retryDelay * 4,
          factor: 2,
          onFailedAttempt: (error) => {
            logger.warn('retry-failed-attempt', `Failed attempt for ${operation}`, {
              attempt: error.attemptNumber,
              retriesLeft: error.retriesLeft
            });
          },
          ...(signal && { signal })
        }
      );

      const responseTime = Date.now() - startTime;
      metrics.recordSuccess(responseTime);
      
      logger.info('operation-success', `Operation ${operation} completed successfully`, {
        responseTime,
        metrics: metrics.getMetrics()
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const dataflowError = createDataflowError(operation, error, {
        responseTime,
        circuitBreakerStats: circuitBreaker.stats,
        metrics: metrics.getMetrics()
      });

      logger.error('operation-failed', `Operation ${operation} failed`, {
        error: dataflowError.message,
        responseTime,
        circuitBreakerStats: circuitBreaker.stats,
        metrics: metrics.getMetrics()
      });

      throw dataflowError;
    }
  };

  // Handle timeout with AbortController
  if (finalConfig.timeout && !signal) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, finalConfig.timeout);

    try {
      return await resilientOperation();
    } finally {
      clearTimeout(timeoutId);
    }
  } else {
    return await resilientOperation();
  }
}

/**
 * Get health status for dataflow operations
 */
export function getDataflowHealth(
  circuitBreaker: CircuitBreaker<any[], any>,
  metrics: DataflowMetricsCollector
): DataflowHealth {
  const stats = circuitBreaker.stats;
  const currentMetrics = metrics.getMetrics();
  
  // Circuit breaker stats don't expose state directly, use isOpen method
  const isCircuitBreakerOpen = circuitBreaker.opened;
  const isHealthy = !isCircuitBreakerOpen && 
                   (currentMetrics.totalRequests === 0 || 
                    (currentMetrics.successfulRequests / currentMetrics.totalRequests) > 0.5);

  return {
    isHealthy,
    circuitBreakerState: isCircuitBreakerOpen ? 'open' : 'closed',
    metrics: currentMetrics,
    lastChecked: new Date()
  };
}

/**
 * Create a resilient wrapper for dataflow class methods
 */
export function createResilientDataflowWrapper<T extends object>(
  instance: T,
  serviceName: string,
  config: DataflowConfig = {}
): T {
  const metrics = new DataflowMetricsCollector();
  const logger = createLogger('dataflow', serviceName);

  return new Proxy(instance, {
    get(target, prop, receiver) {
      const originalValue = Reflect.get(target, prop, receiver);
      
      // Only wrap async methods that might make external calls
      if (typeof originalValue === 'function' && 
          typeof prop === 'string' &&
          !prop.startsWith('_') &&
          !['constructor', 'toString', 'valueOf'].includes(prop)) {
        
        return async function (this: T, ...args: any[]) {
          const operation = `${serviceName}.${prop}`;
          
          return withDataflowResilience(
            operation,
            () => originalValue.apply(this, args),
            config
          );
        };
      }
      
      return originalValue;
    }
  });
}

/**
 * Specialized resilient wrappers for different dataflow types
 */

export const YAHOO_FINANCE_CONFIG: DataflowConfig = {
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 15000,
  circuitBreakerConfig: {
    timeout: 15000,
    errorThresholdPercentage: 40,
    resetTimeout: 30000,
    name: 'yahoo-finance'
  }
};

export const REDDIT_API_CONFIG: DataflowConfig = {
  maxRetries: 2,
  retryDelay: 3000,
  timeout: 20000,
  circuitBreakerConfig: {
    timeout: 20000,
    errorThresholdPercentage: 60,
    resetTimeout: 60000,
    name: 'reddit-api'
  }
};

export const NEWS_API_CONFIG: DataflowConfig = {
  maxRetries: 3,
  retryDelay: 1500,
  timeout: 12000,
  circuitBreakerConfig: {
    timeout: 12000,
    errorThresholdPercentage: 50,
    resetTimeout: 45000,
    name: 'news-api'
  }
};

export const FINNHUB_API_CONFIG: DataflowConfig = {
  maxRetries: 4,
  retryDelay: 1000,
  timeout: 10000,
  circuitBreakerConfig: {
    timeout: 10000,
    errorThresholdPercentage: 45,
    resetTimeout: 30000,
    name: 'finnhub-api'
  }
};