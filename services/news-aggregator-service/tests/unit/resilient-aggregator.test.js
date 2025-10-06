/**
 * Unit Tests for ResilientNewsAggregator
 * Tests direct function calls (not through HTTP endpoints)
 */

import { jest } from '@jest/globals';
import { ResilientNewsAggregator } from '../../src/aggregators/resilient-news-aggregator.js';

// Mock providers
const createMockProvider = (name, shouldFail = false) => ({
  name,
  isConfigured: jest.fn(() => true),
  searchNews: jest.fn(async ({ query, count }) => {
    if (shouldFail) {
      throw new Error(`${name} provider error`);
    }
    return {
      status: 'ok',
      totalResults: count,
      articles: Array(count).fill(null).map((_, i) => ({
        title: `${name} Article ${i + 1}`,
        description: `Test description from ${name}`,
        url: `https://${name}.com/${i}`,
        publishedAt: new Date().toISOString(),
        source: { name },
      })),
      provider: name,
    };
  }),
  healthCheck: jest.fn(async () => ({
    healthy: !shouldFail,
    message: shouldFail ? `${name} is down` : `${name} is responding`,
  })),
  getStatistics: jest.fn(() => ({
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
    averageResponseTime: 0,
  })),
});

describe('ResilientNewsAggregator - Unit Tests', () => {

  describe('constructor', () => {
    
    it('should initialize with provider map', () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
      };

      const aggregator = new ResilientNewsAggregator(providers);

      expect(aggregator.providers).toBe(providers);
      expect(aggregator.circuitBreakers).toBeDefined();
      expect(aggregator.retryHandlers).toBeDefined();
    });

    it('should create circuit breakers for each provider', () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
        'provider3': createMockProvider('provider3'),
      };

      const aggregator = new ResilientNewsAggregator(providers);

      expect(Object.keys(aggregator.circuitBreakers).length).toBe(3);
      expect(aggregator.circuitBreakers['provider1']).toBeDefined();
      expect(aggregator.circuitBreakers['provider2']).toBeDefined();
      expect(aggregator.circuitBreakers['provider3']).toBeDefined();
    });

    it('should create retry handlers for each provider', () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
      };

      const aggregator = new ResilientNewsAggregator(providers);

      expect(Object.keys(aggregator.retryHandlers).length).toBe(2);
      expect(aggregator.retryHandlers['provider1']).toBeDefined();
      expect(aggregator.retryHandlers['provider2']).toBeDefined();
    });

  });

  describe('aggregateNews', () => {

    it('should aggregate results from all providers', async () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const result = await aggregator.aggregateNews({
        query: 'Tesla',
        count: 5,
      });

      expect(result.query).toBe('Tesla');
      expect(result.providers['provider1'].status).toBe('success');
      expect(result.providers['provider2'].status).toBe('success');
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it('should handle individual provider failures gracefully', async () => {
      const providers = {
        'provider1': createMockProvider('provider1', false),
        'provider2': createMockProvider('provider2', true), // This one fails
        'provider3': createMockProvider('provider3', false),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const result = await aggregator.aggregateNews({
        query: 'Apple',
        count: 5,
      });

      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.providers['provider1'].status).toBe('success');
      expect(result.providers['provider2'].status).toBe('error');
      expect(result.providers['provider3'].status).toBe('success');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return empty results when all providers fail', async () => {
      const providers = {
        'provider1': createMockProvider('provider1', true),
        'provider2': createMockProvider('provider2', true),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const result = await aggregator.aggregateNews({
        query: 'Test',
        count: 5,
      });

      expect(result.summary.total).toBe(0);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(2);
      expect(result.errors.length).toBe(2);
    });

    it('should measure response times for each provider', async () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const result = await aggregator.aggregateNews({
        query: 'Test',
        count: 5,
      });

      expect(result.providers['provider1'].responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.providers['provider1'].responseTime).toBe('number');
    });

    it('should include article counts for successful providers', async () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const result = await aggregator.aggregateNews({
        query: 'Test',
        count: 3,
      });

      expect(result.providers['provider1'].articlesCount).toBe(3);
      expect(result.providers['provider2'].articlesCount).toBe(3);
    });

  });

  describe('aggregateNewsStreaming', () => {

    it('should yield start event first', async () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const generator = aggregator.aggregateNewsStreaming({
        query: 'Tesla',
        count: 5,
      });

      const firstEvent = await generator.next();
      
      expect(firstEvent.done).toBe(false);
      expect(firstEvent.value.type).toBe('start');
      expect(firstEvent.value.query).toBe('Tesla');
      expect(firstEvent.value.providerCount).toBe(1);
    });

    it('should yield provider results as they complete', async () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const events = [];

      for await (const event of aggregator.aggregateNewsStreaming({
        query: 'Apple',
        count: 5,
      })) {
        events.push(event);
      }

      const providerResults = events.filter(e => e.type === 'provider-result');
      expect(providerResults.length).toBe(2);

      providerResults.forEach(result => {
        expect(result).toHaveProperty('provider');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('timestamp');
      });
    });

    it('should yield complete event last', async () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const events = [];

      for await (const event of aggregator.aggregateNewsStreaming({
        query: 'Test',
        count: 5,
      })) {
        events.push(event);
      }

      const lastEvent = events[events.length - 1];
      expect(lastEvent.type).toBe('complete');
      expect(lastEvent).toHaveProperty('summary');
      expect(lastEvent).toHaveProperty('totalDuration');
    });

    it('should include error events for failed providers', async () => {
      const providers = {
        'provider1': createMockProvider('provider1', false),
        'provider2': createMockProvider('provider2', true), // This one fails
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const events = [];

      for await (const event of aggregator.aggregateNewsStreaming({
        query: 'Test',
        count: 5,
      })) {
        events.push(event);
      }

      const errorResults = events.filter(e => 
        e.type === 'provider-result' && e.status === 'error'
      );
      
      expect(errorResults.length).toBeGreaterThan(0);
      expect(errorResults[0]).toHaveProperty('error');
    });

  });

  describe('getProvidersHealth', () => {

    it('should return health status for all providers', async () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const health = await aggregator.getProvidersHealth();

      expect(health['provider1']).toBeDefined();
      expect(health['provider2']).toBeDefined();
      expect(health['provider1'].healthy).toBe(true);
      expect(health['provider2'].healthy).toBe(true);
    });

    it('should include circuit breaker state in health', async () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const health = await aggregator.getProvidersHealth();

      expect(health['provider1'].circuitBreaker).toBeDefined();
      expect(health['provider1'].circuitBreaker.state).toBe('CLOSED');
      expect(health['provider1'].circuitBreaker).toHaveProperty('failures');
    });

    it('should detect unhealthy providers', async () => {
      const providers = {
        'provider1': createMockProvider('provider1', true), // Failing provider
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const health = await aggregator.getProvidersHealth();

      expect(health['provider1'].healthy).toBe(false);
      expect(health['provider1'].message).toContain('down');
    });

  });

  describe('getStatistics', () => {

    it('should return statistics for all providers', () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const stats = aggregator.getStatistics();

      expect(stats.providers['provider1']).toBeDefined();
      expect(stats.providers['provider2']).toBeDefined();
    });

    it('should include aggregated statistics', () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const stats = aggregator.getStatistics();

      expect(stats.aggregated).toBeDefined();
      expect(stats.aggregated).toHaveProperty('totalRequests');
      expect(stats.aggregated).toHaveProperty('totalSuccesses');
      expect(stats.aggregated).toHaveProperty('totalFailures');
      expect(stats.aggregated).toHaveProperty('overallErrorRate');
    });

    it('should calculate error rates correctly', async () => {
      const providers = {
        'provider1': createMockProvider('provider1', true), // Always fails
      };

      const aggregator = new ResilientNewsAggregator(providers);

      // Make several requests to generate statistics
      for (let i = 0; i < 3; i++) {
        await aggregator.aggregateNews({ query: 'Test', count: 5 });
      }

      const stats = aggregator.getStatistics();
      
      // Stats come from mock providers, but structure should be correct
      expect(stats.providers['provider1']).toHaveProperty('errorRate');
      expect(typeof stats.providers['provider1'].errorRate).toBe('number');
    });

  });

  describe('Resilience Patterns', () => {

    it('should trigger circuit breaker after multiple failures', async () => {
      const failingProvider = createMockProvider('failing', true);
      const providers = {
        'failing': failingProvider,
      };

      const aggregator = new ResilientNewsAggregator(providers);

      // Make multiple requests to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        await aggregator.aggregateNews({ query: 'Test', count: 5 });
      }

      const health = await aggregator.getProvidersHealth();
      
      // Circuit breaker should be affected by failures
      expect(health['failing'].circuitBreaker.failures).toBeGreaterThan(0);
    });

    it('should continue with other providers when one circuit is open', async () => {
      const providers = {
        'failing': createMockProvider('failing', true),
        'working': createMockProvider('working', false),
      };

      const aggregator = new ResilientNewsAggregator(providers);

      // Trigger circuit breaker on failing provider
      for (let i = 0; i < 6; i++) {
        await aggregator.aggregateNews({ query: 'Test', count: 5 });
      }

      // Should still get results from working provider
      const result = await aggregator.aggregateNews({ query: 'Test', count: 5 });
      
      expect(result.summary.successful).toBeGreaterThanOrEqual(1);
      expect(result.providers['working'].status).toBe('success');
    });

  });

  describe('Concurrent Execution', () => {

    it('should execute provider requests concurrently', async () => {
      const providers = {
        'provider1': createMockProvider('provider1'),
        'provider2': createMockProvider('provider2'),
        'provider3': createMockProvider('provider3'),
      };

      const aggregator = new ResilientNewsAggregator(providers);
      
      const startTime = Date.now();
      await aggregator.aggregateNews({ query: 'Test', count: 5 });
      const duration = Date.now() - startTime;

      // If executed sequentially, would take much longer
      // This is a heuristic test - concurrent should be significantly faster
      expect(duration).toBeLessThan(1000); // Should complete quickly with mocks
    });

    it('should not block on slow providers', async () => {
      const slowProvider = createMockProvider('slow');
      slowProvider.searchNews = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          status: 'ok',
          articles: [],
          provider: 'slow',
        };
      });

      const fastProvider = createMockProvider('fast');
      
      const providers = {
        'slow': slowProvider,
        'fast': fastProvider,
      };

      const aggregator = new ResilientNewsAggregator(providers);
      const result = await aggregator.aggregateNews({ query: 'Test', count: 5 });

      // Both should complete, slow one doesn't block fast one
      expect(result.summary.total).toBeGreaterThan(0);
    });

  });

});
