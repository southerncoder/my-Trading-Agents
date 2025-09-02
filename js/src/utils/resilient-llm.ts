/**
 * Resilient LLM Wrapper
 * 
 * This module provides resilient wrappers for LLM API calls following
 * the same patterns as resilient-dataflow.ts. It wraps LangChain LLM calls
 * with retry logic, circuit breaker, timeout handling, and comprehensive monitoring.
 * 
 * Key features:
 * - Circuit breaker pattern for LLM API resilience
 * - Retry logic with exponential backoff
 * - Timeout handling with AbortController
 * - Token usage tracking and cost monitoring
 * - Performance metrics collection
 * - Health check endpoints
 * - Structured logging integration
 */

import pRetry from 'p-retry';
import CircuitBreaker from 'opossum';
import { createLogger } from './enhanced-logger';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage } from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { getMeter, ENABLE_OTEL } from '../observability/opentelemetry-setup';

// Types for resilient LLM
export interface LLMConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  circuitBreakerConfig?: LLMCircuitBreakerConfig;
}

export interface LLMCircuitBreakerConfig {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
}

export interface LLMMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  retriedCalls: number;
  circuitBreakerOpens: number;
  circuitBreakerCloses: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  estimatedCost: number;
  lastError?: string;
  lastSuccess: Date | null;
  lastFailure: Date | null;
}

export interface LLMHealth {
  isHealthy: boolean;
  circuitBreakerState: string;
  metrics: LLMMetrics;
  lastChecked: Date;
}

/**
 * Metrics collector for LLM operations
 */
export class LLMMetricsCollector {
  private metrics: LLMMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    retriedCalls: 0,
    circuitBreakerOpens: 0,
    circuitBreakerCloses: 0,
    averageResponseTime: 0,
    totalTokensUsed: 0,
    estimatedCost: 0,
    lastSuccess: null,
    lastFailure: null
  };

  private responseTimes: number[] = [];
  private readonly maxResponseTimesSamples = 100;

  // Optional OpenTelemetry instruments
  private callCounter?: any;
  private successCounter?: any;
  private failureCounter?: any;

  constructor() {
    if (ENABLE_OTEL) {
      try {
        const meter = getMeter('resilient-llm');
        this.callCounter = meter.createCounter('llm_calls_total', { description: 'Total LLM calls' } as any);
        this.successCounter = meter.createCounter('llm_success_total', { description: 'Successful LLM calls' } as any);
        this.failureCounter = meter.createCounter('llm_failure_total', { description: 'Failed LLM calls' } as any);
      } catch (err) {
        // If OpenTelemetry not available at runtime, continue with in-memory metrics
      }
    }
  }

  recordCall(): void {
    this.metrics.totalCalls++;
    try { this.callCounter?.add(1); } catch (err) { /* ignore */ }
  }

  recordSuccess(responseTime: number, tokensUsed?: number, cost?: number): void {
    this.metrics.successfulCalls++;
    this.metrics.lastSuccess = new Date();
    this.updateResponseTime(responseTime);
    
    if (tokensUsed) {
      this.metrics.totalTokensUsed += tokensUsed;
    }
    
    if (cost) {
      this.metrics.estimatedCost += cost;
    }
    try { this.successCounter?.add(1, { response_time_ms: responseTime }); } catch (err) { /* ignore */ }
  }

  recordFailure(error: string): void {
    this.metrics.failedCalls++;
    this.metrics.lastError = error;
    this.metrics.lastFailure = new Date();
    try { this.failureCounter?.add(1, { error: error }); } catch (err) { /* ignore */ }
  }

  recordRetry(): void {
    this.metrics.retriedCalls++;
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

  getMetrics(): LLMMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      retriedCalls: 0,
      circuitBreakerOpens: 0,
      circuitBreakerCloses: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      estimatedCost: 0,
      lastSuccess: null,
      lastFailure: null
    };
    this.responseTimes = [];
  }
}

/**
 * Create an LLM-specific error with context
 */
export function createLLMError(
  operation: string,
  originalError: unknown,
  context: Record<string, any> = {}
): Error {
  const errorMessage = originalError instanceof Error ? originalError.message : String(originalError);
  const error = new Error(`LLM ${operation} failed: ${errorMessage}`);
  
  // Add context properties
  Object.assign(error, {
    operation,
    originalError,
    context,
    timestamp: new Date().toISOString(),
    isLLMError: true
  });
  
  return error;
}

/**
 * Default configuration for LLM resilience
 */
const defaultLLMConfig: Required<LLMConfig> = {
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 60000, // 60 seconds for LLM calls
  circuitBreakerConfig: {
    timeout: 60000,
    errorThresholdPercentage: 60,
    resetTimeout: 120000, // 2 minutes
    rollingCountTimeout: 30000,
    rollingCountBuckets: 10,
    name: 'llm-circuit-breaker'
  }
};

/**
 * Main resilient LLM function
 */
export async function withLLMResilience<T>(
  operation: string,
  fn: () => Promise<T>,
  config: LLMConfig = {},
  signal?: AbortSignal
): Promise<T> {
  const finalConfig = { ...defaultLLMConfig, ...config };
  const logger = createLogger('agent', 'ResilientLLM');
  const metrics = new LLMMetricsCollector();
  
  logger.info('operation-start', `Starting LLM ${operation}`, {
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
    logger.warn('circuit-breaker-open', `LLM circuit breaker opened for ${operation}`, {
      state: 'open',
      metrics: metrics.getMetrics()
    });
    metrics.recordCircuitBreakerOpen();
  });

  circuitBreaker.on('halfOpen', () => {
    logger.info('circuit-breaker-half-open', `LLM circuit breaker half-open for ${operation}`, {
      state: 'half-open'
    });
  });

  circuitBreaker.on('close', () => {
    logger.info('circuit-breaker-close', `LLM circuit breaker closed for ${operation}`, {
      state: 'closed'
    });
    metrics.recordCircuitBreakerClose();
  });

  circuitBreaker.on('failure', (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    metrics.recordFailure(errorMessage);
    logger.error('circuit-breaker-failure', `LLM circuit breaker failure for ${operation}`, {
      error: errorMessage,
      circuitBreakerMetrics: circuitBreaker.stats
    });
  });

  circuitBreaker.on('success', (result) => {
    logger.debug('circuit-breaker-success', `LLM circuit breaker success for ${operation}`, {
      circuitBreakerMetrics: circuitBreaker.stats,
      hasResult: !!result
    });
  });

  // Wrap with retry logic
  const resilientOperation = async (): Promise<T> => {
    metrics.recordCall();
    const startTime = Date.now();

    try {
      const result = await pRetry(
        async (attemptNumber) => {
          if (signal?.aborted) {
            throw new Error('LLM operation aborted by signal');
          }

          if (attemptNumber > 1) {
            metrics.recordRetry();
            logger.info('retry-attempt', `LLM retry attempt for ${operation}`, {
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
            logger.warn('retry-failed-attempt', `Failed LLM attempt for ${operation}`, {
              attempt: error.attemptNumber,
              retriesLeft: error.retriesLeft
            });
          },
          ...(signal && { signal })
        }
      );

      const responseTime = Date.now() - startTime;
      
      // Extract token usage if available
      let tokensUsed = 0;
      let estimatedCost = 0;
      
      if (result && typeof result === 'object' && 'response_metadata' in result) {
        const metadata = (result as any).response_metadata;
        if (metadata && metadata.tokenUsage) {
          tokensUsed = metadata.tokenUsage.totalTokens || 0;
          // Rough cost estimation (adjust based on model)
          estimatedCost = tokensUsed * 0.0001; // $0.0001 per token rough estimate
        }
      }
      
      metrics.recordSuccess(responseTime, tokensUsed, estimatedCost);
      
      logger.info('operation-success', `LLM operation ${operation} completed successfully`, {
        responseTime,
        tokensUsed,
        estimatedCost,
        metrics: metrics.getMetrics()
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const llmError = createLLMError(operation, error, {
        responseTime,
        circuitBreakerStats: circuitBreaker.stats,
        metrics: metrics.getMetrics()
      });

      logger.error('operation-failed', `LLM operation ${operation} failed`, {
        error: llmError.message,
        responseTime,
        circuitBreakerStats: circuitBreaker.stats,
        metrics: metrics.getMetrics()
      });

      throw llmError;
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
 * Get health status for LLM operations
 */
export function getLLMHealth(
  circuitBreaker: CircuitBreaker<any[], any>,
  metrics: LLMMetricsCollector
): LLMHealth {
  const currentMetrics = metrics.getMetrics();
  
  // Circuit breaker health check
  const isCircuitBreakerOpen = circuitBreaker.opened;
  const isHealthy = !isCircuitBreakerOpen && 
                   (currentMetrics.totalCalls === 0 || 
                    (currentMetrics.successfulCalls / currentMetrics.totalCalls) > 0.4);

  return {
    isHealthy,
    circuitBreakerState: isCircuitBreakerOpen ? 'open' : 'closed',
    metrics: currentMetrics,
    lastChecked: new Date()
  };
}

/**
 * Create a resilient wrapper for LLM instances
 */
export function createResilientLLM<T extends BaseChatModel>(
  llm: T,
  config: LLMConfig = {}
): T {
  const metrics = new LLMMetricsCollector();
  const logger = createLogger('agent', llm.constructor.name);

  return new Proxy(llm, {
    get(target, prop, receiver) {
      const originalValue = Reflect.get(target, prop, receiver);
      
      // Wrap the invoke method and other async LLM methods
      if (typeof originalValue === 'function' && 
          typeof prop === 'string' &&
          ['invoke', 'call', 'generate', 'batch'].includes(prop)) {
        
        return async function (this: T, ...args: any[]) {
          const operation = `${llm.constructor.name}.${prop}`;
          
          return withLLMResilience(
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
 * Specialized resilient configurations for different LLM types
 */

export const OPENAI_LLM_CONFIG: LLMConfig = {
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 60000,
  circuitBreakerConfig: {
    timeout: 60000,
    errorThresholdPercentage: 50,
    resetTimeout: 120000,
    name: 'openai-llm'
  }
};

export const ANTHROPIC_LLM_CONFIG: LLMConfig = {
  maxRetries: 2,
  retryDelay: 3000,
  timeout: 90000,
  circuitBreakerConfig: {
    timeout: 90000,
    errorThresholdPercentage: 60,
    resetTimeout: 180000,
    name: 'anthropic-llm'
  }
};

export const GOOGLE_LLM_CONFIG: LLMConfig = {
  maxRetries: 3,
  retryDelay: 2500,
  timeout: 75000,
  circuitBreakerConfig: {
    timeout: 75000,
    errorThresholdPercentage: 55,
    resetTimeout: 150000,
    name: 'google-llm'
  }
};

export const LOCAL_LLM_CONFIG: LLMConfig = {
  maxRetries: 2,
  retryDelay: 1000,
  timeout: 120000, // Local models might be slower
  circuitBreakerConfig: {
    timeout: 120000,
    errorThresholdPercentage: 70,
    resetTimeout: 60000,
    name: 'local-llm'
  }
};