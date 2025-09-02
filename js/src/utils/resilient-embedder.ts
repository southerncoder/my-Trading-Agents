/**
 * Resilient Embedder Utility
 * 
 * Provides robust embedder API calls with:
 * - Circuit breaker pattern (Opossum) for cascade failure protection
 * - Intelligent retry logic (p-retry) with exponential backoff
 * - Comprehensive timeout handling
 * - Detailed monitoring and observability
 * 
 * @module ResilientEmbedder
 */

import pRetry, { AbortError } from 'p-retry';
import CircuitBreaker from 'opossum';
import { logger } from './enhanced-logger.js';
import { getMeter, ENABLE_OTEL } from '../observability/opentelemetry-setup';
import { OpenAIEmbeddings } from '@langchain/openai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
const ALLOW_STUB_EMBEDDER = (process.env.EMBEDDER_ALLOW_STUB || '').toLowerCase() === 'true';
const ALLOW_LOCAL_EMBEDDING = (process.env.ALLOW_LOCAL_EMBEDDING || '').toLowerCase() === 'true';
const NODE_ENV = (process.env.NODE_ENV || '').toLowerCase();

// Types and Interfaces
export interface EmbedderRequest {
  text: string;
  model?: string;
  maxTokens?: number;
}

export interface EmbedderResponse {
  embedding: number[];
  tokens?: number;
  model: string;
  timestamp: number;
}

export interface EmbedderMetrics {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  currentThroughput: number;
  lastResetTime: number;
  circuitBreakerState: string;
  responseTimes: number[];
}

export interface EmbedderError extends Error {
  statusCode?: number;
  retryable: boolean;
  category: 'auth' | 'network' | 'rate_limit' | 'server' | 'timeout' | 'circuit_open' | 'unknown';
  timestamp: number;
  requestId?: string;
}

// Metrics Collection Class
class EmbedderMetricsCollector {
  private metrics: EmbedderMetrics;
  private responseTimes: number[] = [];
  private readonly maxResponseTimeHistory = 1000; // Keep last 1000 response times
  private callCounter?: any;
  private successCounter?: any;
  private failureCounter?: any;
  
  constructor() {
    this.metrics = {
      totalCalls: 0,
      successCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      currentThroughput: 0,
      lastResetTime: Date.now(),
      circuitBreakerState: 'CLOSED',
      responseTimes: []
    };
    if (ENABLE_OTEL) {
      try {
        const meter = getMeter('resilient-embedder');
        this.callCounter = meter.createCounter('embedder_calls_total', { description: 'Total embedder calls' } as any);
        this.successCounter = meter.createCounter('embedder_success_total', { description: 'Successful embedder calls' } as any);
        this.failureCounter = meter.createCounter('embedder_failure_total', { description: 'Failed embedder calls' } as any);
      } catch (err) {}
    }
  }

  recordCall(responseTime: number, success: boolean, circuitState: string): void {
    this.metrics.totalCalls++;
    this.metrics.circuitBreakerState = circuitState;
    
    if (success) {
      this.metrics.successCount++;
      this.recordResponseTime(responseTime);
    } else {
      this.metrics.failureCount++;
    }

    // Calculate current throughput (calls per minute)
    const now = Date.now();
    const timeSinceReset = now - this.metrics.lastResetTime;
    this.metrics.currentThroughput = (this.metrics.totalCalls / timeSinceReset) * 60000;

    logger.debug('system', 'embedder-metrics', 'update', 'Embedder metrics updated', {
      totalCalls: this.metrics.totalCalls,
      successRate: this.getSuccessRate(),
      avgResponseTime: this.metrics.avgResponseTime,
      throughput: this.metrics.currentThroughput,
      circuitState
    });
    try { this.callCounter?.add(1); } catch (err) {}
    if (success) { try { this.successCounter?.add(1); } catch (err) {} }
    if (!success) { try { this.failureCounter?.add(1); } catch (err) {} }
  }

  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only recent response times
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimeHistory);
    }

    // Calculate percentiles
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const len = sorted.length;
    
    this.metrics.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / len;
    this.metrics.p95ResponseTime = sorted[Math.floor(len * 0.95)] || 0;
    this.metrics.p99ResponseTime = sorted[Math.floor(len * 0.99)] || 0;
    this.metrics.responseTimes = sorted;
  }

  getSuccessRate(): number {
    if (this.metrics.totalCalls === 0) return 100;
    return (this.metrics.successCount / this.metrics.totalCalls) * 100;
  }

  getMetrics(): EmbedderMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalCalls: 0,
      successCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      currentThroughput: 0,
      lastResetTime: Date.now(),
      circuitBreakerState: this.metrics.circuitBreakerState,
      responseTimes: []
    };
    this.responseTimes = [];
    logger.info('system', 'embedder-metrics', 'reset', 'Embedder metrics reset');
  }
}

// Global metrics collector instance
const metricsCollector = new EmbedderMetricsCollector();

/**
 * Creates an appropriate EmbedderError based on the original error
 */
function createEmbedderError(error: any, context: string): EmbedderError {
  const embedderError = new Error(`${context}: ${error.message}`) as EmbedderError;
  embedderError.timestamp = Date.now();
  embedderError.name = 'EmbedderError';

  // Categorize the error and determine if it's retryable
  if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('Unauthorized')) {
    embedderError.category = 'auth';
    embedderError.retryable = false;
    embedderError.statusCode = 401;
  } else if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
    embedderError.category = 'rate_limit';
    embedderError.retryable = true;
    embedderError.statusCode = 429;
  } else if (error.message?.includes('timeout') || error.message?.includes('ECONNRESET') || error.message?.includes('ETIMEDOUT')) {
    embedderError.category = 'timeout';
    embedderError.retryable = true;
  } else if (error.message?.includes('Circuit open')) {
    embedderError.category = 'circuit_open';
    embedderError.retryable = false;
  } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND') || error.message?.includes('network')) {
    embedderError.category = 'network';
    embedderError.retryable = true;
  } else if (error.statusCode >= 500) {
    embedderError.category = 'server';
    embedderError.retryable = true;
    embedderError.statusCode = error.statusCode;
  } else {
    embedderError.category = 'unknown';
    embedderError.retryable = true;
  }

  return embedderError;
}

/**
 * Core embedder function that makes the actual API call
 * This integrates with the existing memory provider system
 */
async function coreEmbedderCall(request: EmbedderRequest): Promise<EmbedderResponse> {
  const startTime = Date.now();
  const requestId = `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.debug('system', 'embedder-api', 'call-start', 'Embedder API call starting', {
    requestId,
    textLength: request.text.length,
    model: request.model,
    maxTokens: request.maxTokens
  });

  try {
    // Real provider integration via LangChain embeddings
    let embedding: number[];
    let model: string = request.model || '';
  const tokens: number = Math.ceil(request.text.length / 4);

    const lowerModel = (request.model || '').toLowerCase();
    const useOpenAI = lowerModel.includes('text-embedding') || lowerModel.includes('openai') || !!process.env.OPENAI_API_KEY;
    const useGoogle = lowerModel.includes('embedding-001') || lowerModel.includes('text-embedding-004') || lowerModel.includes('google') || !!process.env.GOOGLE_API_KEY;

    const baseURL = process.env.OPENAI_BASE_URL || process.env.LM_STUDIO_BASE_URL || process.env.LLM_BACKEND_URL;
    const haveKey = !!process.env.OPENAI_API_KEY;
    if (useOpenAI && (haveKey || baseURL)) {
      const openai = new OpenAIEmbeddings({
        openAIApiKey: haveKey ? process.env.OPENAI_API_KEY! : 'lm-studio',
        modelName: request.model || 'text-embedding-3-small',
        batchSize: 1,
        ...(baseURL ? { baseURL } as any : {})
      } as any);
      embedding = await openai.embedQuery(request.text);
      model = request.model || 'text-embedding-3-small';
    } else if (useGoogle && process.env.GOOGLE_API_KEY) {
      const google = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY!,
        model: request.model || 'embedding-001'
      } as any);
      embedding = await google.embedQuery(request.text);
      model = request.model || 'embedding-001';
    } else {
      if (!(ALLOW_LOCAL_EMBEDDING || NODE_ENV === 'test' || NODE_ENV === 'development')) {
        const err = new Error('No embedding provider configured and local fallback disabled.');
        (err as any).statusCode = 500;
        throw err;
      }
      embedding = createSimpleEmbedding(request.text);
      model = request.model || 'local-simple';
    }

    const result: EmbedderResponse = {
      embedding,
      tokens,
      model,
      timestamp: Date.now()
    };

    const responseTime = Date.now() - startTime;
    logger.debug('system', 'embedder-api', 'call-success', 'Embedder API call successful', {
      requestId,
      responseTime,
      embeddingLength: result.embedding.length,
      tokens: result.tokens,
      model: result.model
    });

    return result;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('system', 'embedder-api', 'call-failed', 'Embedder API call failed', {
      requestId,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
      textLength: request.text.length
    });
    throw error;
  }
}

/**
 * Simple embedding function for local/fallback providers
 */
function createSimpleEmbedding(text: string): number[] {
  const embedding = new Array(384).fill(0); // Standard embedding size
  
  // Normalize text
  const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Character frequency features
  for (let i = 0; i < normalizedText.length && i < 100; i++) {
    const charCode = normalizedText.charCodeAt(i);
    embedding[charCode % 384] += 1;
  }
  
  // Text length features
  embedding[0] = text.length / 1000; // Normalize length
  embedding[1] = text.split(' ').length / 100; // Word count
  embedding[2] = text.split('.').length / 10; // Sentence count
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
}

// Circuit breaker configuration
const circuitBreakerOptions = {
  timeout: 30000,                    // 30 second timeout per call
  errorThresholdPercentage: 60,      // Open circuit when 60% of calls fail
  resetTimeout: 45000,               // Try again after 45 seconds
  rollingCountTimeout: 60000,        // 1 minute rolling window
  rollingCountBuckets: 6,            // 6 buckets of 10 seconds each
  volumeThreshold: 5,                // Need at least 5 calls before calculating percentage
  name: 'EmbedderCircuitBreaker'
};

// Create circuit breaker instance
const embedderCircuit = new CircuitBreaker(coreEmbedderCall, circuitBreakerOptions);

// Circuit breaker event monitoring
embedderCircuit.on('open', () => {
  logger.warn('system', 'circuit-breaker', 'opened', 'Circuit breaker opened - embedder calls will be rejected', {
    errorThreshold: circuitBreakerOptions.errorThresholdPercentage,
    resetTimeout: circuitBreakerOptions.resetTimeout
  });
});

embedderCircuit.on('halfOpen', () => {
  logger.info('system', 'circuit-breaker', 'half-open', 'Circuit breaker half-open - testing embedder availability');
});

embedderCircuit.on('close', () => {
  logger.info('system', 'circuit-breaker', 'closed', 'Circuit breaker closed - embedder calls resumed normally');
});

embedderCircuit.on('fallback', (data) => {
  logger.warn('system', 'circuit-breaker', 'fallback', 'Circuit breaker fallback triggered', { data });
});

embedderCircuit.on('timeout', () => {
  logger.warn('system', 'circuit-breaker', 'timeout', 'Circuit breaker timeout occurred', {
    timeout: circuitBreakerOptions.timeout
  });
});

embedderCircuit.on('reject', () => {
  logger.warn('system', 'circuit-breaker', 'rejected', 'Circuit breaker rejected call - circuit is open');
});

embedderCircuit.on('success', (data) => {
  logger.debug('system', 'circuit-breaker', 'success', 'Circuit breaker success', {
    embeddingLength: data?.embedding?.length,
    responseTime: data?.timestamp ? Date.now() - data.timestamp : undefined
  });
});

embedderCircuit.on('failure', (error) => {
  logger.warn('system', 'circuit-breaker', 'failure', 'Circuit breaker recorded failure', {
    error: error instanceof Error ? error.message : String(error)
  });
});

/**
 * Main resilient embedder function with retry logic and circuit breaker protection
 */
export async function embedWithResilience(
  request: EmbedderRequest,
  options: {
    signal?: AbortSignal;
    retries?: number;
    minTimeout?: number;
    maxTimeout?: number;
    retryFactor?: number;
  } = {}
): Promise<EmbedderResponse> {
  const {
    signal,
    retries = 3,
    minTimeout = 1000,
    maxTimeout = 10000,
    retryFactor = 2
  } = options;

  const startTime = Date.now();
  const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  logger.info('system', 'resilient-embedder', 'start', 'Starting resilient embedder call', {
    callId,
    textLength: request.text.length,
    model: request.model,
    retries,
    minTimeout,
    maxTimeout
  });

  try {
    const retryFunction = async (attemptNumber: number) => {
      const attemptStart = Date.now();
      logger.debug('system', 'retry-logic', 'attempt-start', 'Embedder retry attempt starting', {
        callId,
        attemptNumber,
        textLength: request.text.length
      });

      try {
        const response = await embedderCircuit.fire(request);
        const attemptTime = Date.now() - attemptStart;
        
        logger.debug('system', 'retry-logic', 'attempt-success', 'Embedder attempt successful', {
          callId,
          attemptNumber,
          attemptTime,
          embeddingLength: response.embedding.length
        });

        return response;

      } catch (error) {
        const attemptTime = Date.now() - attemptStart;
        const embedderError = createEmbedderError(error, `Attempt ${attemptNumber}`);
        
        logger.warn('system', 'retry-logic', 'attempt-failed', 'Embedder attempt failed', {
          callId,
          attemptNumber,
          attemptTime,
          error: embedderError.message,
          category: embedderError.category,
          retryable: embedderError.retryable,
          statusCode: embedderError.statusCode
        });

        // Don't retry non-retryable errors
        if (!embedderError.retryable) {
          logger.info('system', 'retry-logic', 'abort', 'Aborting retries due to non-retryable error', {
            callId,
            category: embedderError.category,
            error: embedderError.message
          });
          throw new AbortError(embedderError.message);
        }

        throw embedderError;
      }
    };

    const options: any = {
      retries,
      factor: retryFactor,
      minTimeout,
      maxTimeout,
      randomize: true,  // Add jitter to prevent thundering herd
      onFailedAttempt: ({ error, attemptNumber, retriesLeft }: any) => {
        const nextDelay = Math.min(minTimeout * Math.pow(retryFactor, attemptNumber - 1), maxTimeout);
        
        logger.warn('system', 'retry-logic', 'retry-attempt', 'Embedder retry attempt failed', {
          callId,
          attemptNumber,
          retriesLeft,
          nextDelayMs: retriesLeft > 0 ? nextDelay : 0,
          error: error.message,
          category: (error as EmbedderError).category || 'unknown'
        });
      }
    };
    
    if (signal) {
      options.signal = signal;
    }

    const result = await pRetry(retryFunction, options) as EmbedderResponse;

    const totalTime = Date.now() - startTime;
    // Record successful call metrics
    const circuitState = (embedderCircuit as any).state || 'UNKNOWN';
    metricsCollector.recordCall(totalTime, true, circuitState);
    
    logger.info('system', 'resilient-embedder', 'success', 'Resilient embedder call completed successfully', {
      callId,
      totalTime,
      embeddingLength: result.embedding.length,
      tokens: result.tokens,
      model: result.model,
      circuitState
    });

    return result;

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const circuitState = (embedderCircuit as any).state || 'UNKNOWN';
    const embedderError = createEmbedderError(error, 'Final failure');
    
    // Record failed call metrics
    metricsCollector.recordCall(totalTime, false, circuitState);
    
    logger.error('system', 'resilient-embedder', 'final-failure', 'Resilient embedder call failed after all retries', {
      callId,
      totalTime,
      error: embedderError.message,
      category: embedderError.category,
      statusCode: embedderError.statusCode,
      circuitState,
      textLength: request.text.length
    });

    throw embedderError;
  }
}

/**
 * Get current embedder metrics
 */
export function getEmbedderMetrics(): EmbedderMetrics {
  return metricsCollector.getMetrics();
}

/**
 * Get circuit breaker health status
 */
export function getEmbedderHealth(): {
  circuitState: string;
  isHealthy: boolean;
  stats: any;
  metrics: EmbedderMetrics;
} {
  const stats = embedderCircuit.stats;
  const metrics = metricsCollector.getMetrics();
  const circuitState = (embedderCircuit as any).state || 'UNKNOWN';
  const isHealthy = circuitState === 'CLOSED' && metrics.successCount > 0;

  return {
    circuitState,
    isHealthy,
    stats: {
      failures: stats.failures,
      fallbacks: stats.fallbacks,
      successes: stats.successes,
      rejects: stats.rejects,
      timeouts: stats.timeouts,
      latencyMean: stats.latencyMean
    },
    metrics
  };
}

/**
 * Reset embedder metrics and circuit breaker
 */
export function resetEmbedderMetrics(): void {
  metricsCollector.reset();
  embedderCircuit.clearCache?.();
  logger.info('system', 'resilient-embedder', 'reset', 'Embedder metrics and circuit breaker reset');
}

/**
 * Gracefully shutdown the embedder circuit breaker
 */
export async function shutdownEmbedder(): Promise<void> {
  logger.info('system', 'resilient-embedder', 'shutdown', 'Shutting down embedder circuit breaker');
  try {
    await embedderCircuit.shutdown();
    logger.info('system', 'resilient-embedder', 'shutdown-complete', 'Embedder circuit breaker shutdown complete');
  } catch (error) {
    logger.error('system', 'resilient-embedder', 'shutdown-error', 'Error during embedder shutdown', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}