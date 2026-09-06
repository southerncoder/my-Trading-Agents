/**
 * Enterprise-Ready News Aggregator with Resilience
 * 
 * Features:
 * - Circuit breakers for each provider
 * - Retry with exponential backoff
 * - Concurrent provider execution with graceful degradation
 * - Streaming and bulk response modes
 * - Comprehensive logging at all levels (debug, info, warn, error)
 * - Provider health tracking and automatic failover
 */

import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { RetryHandler } from '../resilience/retry-handler.js';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'resilient-news-aggregator' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

/**
 * Resilient News Aggregator
 * Aggregates news from multiple providers with comprehensive error handling
 */
export class ResilientNewsAggregator {
  constructor(providers = {}) {
    this.providers = providers;
    this.circuitBreakers = new Map();
    this.retryHandler = new RetryHandler();
    this.providerStats = new Map();

    // Initialize circuit breakers for each provider
    Object.keys(providers).forEach(providerName => {
      const breaker = new CircuitBreaker(providerName, {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringWindow: 300000,
        minimumRequests: 3,
      });

      // Log circuit breaker events
      breaker.on('opened', (data) => {
        logger.error('Provider circuit breaker opened', {
          provider: data.name,
          failures: data.failures,
          error: data.error,
        });
      });

      breaker.on('recovered', (data) => {
        logger.info('Provider circuit breaker recovered', {
          provider: data.name,
        });
      });

      this.circuitBreakers.set(providerName, breaker);
      this.providerStats.set(providerName, {
        successCount: 0,
        failureCount: 0,
        totalRequests: 0,
        lastSuccess: null,
        lastFailure: null,
      });
    });

    logger.info('Resilient News Aggregator initialized', {
      providers: Object.keys(providers),
      circuitBreakersCount: this.circuitBreakers.size,
    });
  }

  /**
   * Aggregate news from all healthy providers concurrently
   * Returns bulk JSON response with results from each provider
   */
  async aggregateNews(searchParams) {
    const startTime = Date.now();
    const { query } = searchParams;

    logger.info('Starting news aggregation', {
      query,
      providers: Object.keys(this.providers),
    });

    const results = {
      query,
      timestamp: new Date().toISOString(),
      providers: {},
      summary: {
        total: 0,
        successful: 0,
        failed: 0,
        cached: 0,
      },
      errors: [],
    };

    // Execute all provider searches concurrently
    const providerPromises = Object.entries(this.providers).map(
      async ([providerName, provider]) => {
        return this.fetchFromProvider(providerName, provider, searchParams);
      },
    );

    const settled = await Promise.allSettled(providerPromises);

    // Process results
    settled.forEach((result, index) => {
      const providerName = Object.keys(this.providers)[index];

      if (result.status === 'fulfilled' && result.value) {
        results.providers[providerName] = {
          status: 'success',
          data: result.value.data,
          responseTime: result.value.responseTime,
          articlesCount: result.value.data?.articles?.length || 0,
        };
        results.summary.successful++;
        results.summary.total += result.value.data?.articles?.length || 0;

      } else {
        const error = result.reason || new Error('Unknown error');
        results.providers[providerName] = {
          status: 'failed',
          error: error.message,
          circuitOpen: error.circuitBreakerOpen || false,
        };
        results.summary.failed++;
        results.errors.push({
          provider: providerName,
          message: error.message,
          recoverable: !error.circuitBreakerOpen,
        });
      }
    });

    const duration = Date.now() - startTime;
    results.responseTime = duration;

    logger.info('News aggregation completed', {
      query,
      duration,
      successful: results.summary.successful,
      failed: results.summary.failed,
      totalArticles: results.summary.total,
    });

    return results;
  }

  /**
   * Aggregate news with streaming support
   * Sends results as they arrive from each provider
   */
  async *aggregateNewsStreaming(searchParams) {
    const startTime = Date.now();
    const { query } = searchParams;

    logger.info('Starting streaming news aggregation', {
      query,
      providers: Object.keys(this.providers),
    });

    // Yield header
    yield {
      type: 'start',
      query,
      timestamp: new Date().toISOString(),
      providers: Object.keys(this.providers),
    };

    // Execute all provider searches concurrently, yielding as they complete
    const providerPromises = Object.entries(this.providers).map(
      async ([providerName, provider]) => {
        try {
          const result = await this.fetchFromProvider(providerName, provider, searchParams);
          return { providerName, status: 'success', ...result };
        } catch (error) {
          return {
            providerName,
            status: 'failed',
            error: error.message,
            circuitOpen: error.circuitBreakerOpen || false,
          };
        }
      },
    );

    // Yield results as they complete
    for (const promise of providerPromises) {
      const result = await promise;
      
      yield {
        type: 'provider-result',
        provider: result.providerName,
        status: result.status,
        data: result.data,
        responseTime: result.responseTime,
        articlesCount: result.data?.articles?.length || 0,
        error: result.error,
        timestamp: new Date().toISOString(),
      };
    }

    // Yield completion summary
    const duration = Date.now() - startTime;
    
    yield {
      type: 'complete',
      totalDuration: duration,
      timestamp: new Date().toISOString(),
    };

    logger.info('Streaming news aggregation completed', {
      query,
      duration,
    });
  }

  /**
   * Fetch news from a single provider with resilience
   */
  async fetchFromProvider(providerName, provider, searchParams) {
    const stats = this.providerStats.get(providerName);
    stats.totalRequests++;

    const startTime = Date.now();

    try {
      if (!provider.isConfigured()) {
        throw new Error(`Provider ${providerName} is not configured`);
      }

      const circuitBreaker = this.circuitBreakers.get(providerName);

      // Execute with circuit breaker and retry logic
      const result = await circuitBreaker.execute(async () => {
        return await this.retryHandler.execute(
          async () => provider.searchNews(searchParams),
          {
            provider: providerName,
            query: searchParams.query,
          },
        );
      });

      const duration = Date.now() - startTime;

      // Update stats
      stats.successCount++;
      stats.lastSuccess = new Date().toISOString();

      logger.debug('Provider fetch successful', {
        provider: providerName,
        query: searchParams.query,
        articlesCount: result.articles?.length || 0,
        duration,
      });

      return {
        data: result,
        responseTime: duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Update stats
      stats.failureCount++;
      stats.lastFailure = new Date().toISOString();

      logger.error('Provider fetch failed', {
        provider: providerName,
        query: searchParams.query,
        error: error.message,
        duration,
        stats: {
          successCount: stats.successCount,
          failureCount: stats.failureCount,
          errorRate: ((stats.failureCount / stats.totalRequests) * 100).toFixed(2) + '%',
        },
      });

      throw error;
    }
  }

  /**
   * Get health status of all providers
   */
  async getProvidersHealth() {
    const health = {};

    for (const [providerName, provider] of Object.entries(this.providers)) {
      const circuitBreaker = this.circuitBreakers.get(providerName);
      const stats = this.providerStats.get(providerName);

      try {
        const healthCheck = await provider.healthCheck();
        
        health[providerName] = {
          ...healthCheck,
          circuitBreaker: circuitBreaker.getStats(),
          stats: {
            ...stats,
            errorRate: stats.totalRequests > 0
              ? ((stats.failureCount / stats.totalRequests) * 100).toFixed(2) + '%'
              : '0%',
          },
        };
      } catch (error) {
        health[providerName] = {
          healthy: false,
          error: error.message,
          circuitBreaker: circuitBreaker.getStats(),
          stats,
        };
      }
    }

    return health;
  }

  /**
   * Get aggregated statistics
   */
  getStatistics() {
    const stats = {
      providers: {},
      aggregated: {
        totalRequests: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        overallErrorRate: '0%',
      },
    };

    for (const [providerName, providerStats] of this.providerStats.entries()) {
      const circuitBreaker = this.circuitBreakers.get(providerName);
      
      stats.providers[providerName] = {
        ...providerStats,
        circuitBreaker: circuitBreaker.getStats(),
        errorRate: providerStats.totalRequests > 0
          ? ((providerStats.failureCount / providerStats.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
      };

      stats.aggregated.totalRequests += providerStats.totalRequests;
      stats.aggregated.totalSuccesses += providerStats.successCount;
      stats.aggregated.totalFailures += providerStats.failureCount;
    }

    if (stats.aggregated.totalRequests > 0) {
      stats.aggregated.overallErrorRate =
        ((stats.aggregated.totalFailures / stats.aggregated.totalRequests) * 100).toFixed(2) + '%';
    }

    return stats;
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStatistics() {
    for (const [providerName, circuitBreaker] of this.circuitBreakers.entries()) {
      circuitBreaker.reset();
      
      const stats = this.providerStats.get(providerName);
      stats.successCount = 0;
      stats.failureCount = 0;
      stats.totalRequests = 0;
      stats.lastSuccess = null;
      stats.lastFailure = null;
    }

    logger.info('Statistics reset for all providers');
  }
}
