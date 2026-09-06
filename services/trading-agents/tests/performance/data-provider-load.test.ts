/**
 * Load Tests for Data Provider System
 * 
 * Tests high-frequency data provider requests and system behavior under load
 * Requirements: 7.4
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { DataProviderFailover } from '../../src/resilience/data-provider-failover';
import { IntelligentCaching } from '../../src/resilience/intelligent-caching';
import { CircuitBreaker } from '../../src/utils/circuit-breaker';
import {
  DataProvider,
  NewsProvider,
  SocialProvider,
  HealthStatus,
  MarketData,
  NewsData,
  SentimentData
} from '../../src/types/data-providers';

// High-performance mock providers for load testing
class LoadTestMarketDataProvider implements DataProvider {
  name = 'load-test-provider';
  private requestCount = 0;
  private responseDelay: number;
  private failureRate: number;

  constructor(responseDelay: number = 50, failureRate: number = 0) {
    this.responseDelay = responseDelay;
    this.failureRate = failureRate;
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    this.requestCount++;
    
    // Simulate network delay
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }
    
    // Simulate failures
    if (Math.random() < this.failureRate) {
      throw new Error(`Provider failure for ${symbol}`);
    }

    return {
      symbol,
      timestamp: new Date(),
      open: 150 + Math.random() * 10,
      high: 155 + Math.random() * 10,
      low: 145 + Math.random() * 10,
      close: 150 + Math.random() * 10,
      volume: 1000000 + Math.random() * 5000000,
      adjustedClose: 150 + Math.random() * 10
    };
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      provider: this.name,
      status: this.failureRate > 0.5 ? 'failed' : 'healthy',
      responseTime: this.responseDelay,
      errorRate: this.failureRate,
      lastCheck: new Date()
    };
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  resetRequestCount(): void {
    this.requestCount = 0;
  }
}

class LoadTestNewsProvider implements NewsProvider {
  name = 'load-test-news';
  private requestCount = 0;
  private responseDelay: number;

  constructor(responseDelay: number = 100) {
    this.responseDelay = responseDelay;
  }

  async getNewsData(symbol: string): Promise<NewsData[]> {
    this.requestCount++;
    
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    return [
      {
        title: `${symbol} Market Update ${this.requestCount}`,
        content: `Latest news for ${symbol}...`,
        source: 'Test News',
        timestamp: new Date(),
        url: `https://example.com/news/${this.requestCount}`,
        sentiment: Math.random() * 2 - 1, // -1 to 1
        relevance: Math.random()
      }
    ];
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      provider: this.name,
      status: 'healthy',
      responseTime: this.responseDelay,
      errorRate: 0,
      lastCheck: new Date()
    };
  }

  getRequestCount(): number {
    return this.requestCount;
  }
}

describe('Data Provider Load Tests', () => {
  let dataProviderFailover: DataProviderFailover;
  let intelligentCaching: IntelligentCaching;
  let fastProvider: LoadTestMarketDataProvider;
  let slowProvider: LoadTestMarketDataProvider;
  let unreliableProvider: LoadTestMarketDataProvider;
  let newsProvider: LoadTestNewsProvider;

  beforeAll(async () => {
    intelligentCaching = new IntelligentCaching();
    dataProviderFailover = new DataProviderFailover(intelligentCaching);
    
    fastProvider = new LoadTestMarketDataProvider(10, 0); // 10ms delay, no failures
    slowProvider = new LoadTestMarketDataProvider(200, 0); // 200ms delay, no failures
    unreliableProvider = new LoadTestMarketDataProvider(50, 0.1); // 50ms delay, 10% failure rate
    newsProvider = new LoadTestNewsProvider(100);
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fastProvider.resetRequestCount();
    slowProvider.resetRequestCount();
    unreliableProvider.resetRequestCount();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('High-Frequency Request Load Tests', () => {
    test('should handle 1000 sequential requests efficiently', async () => {
      const symbols = Array.from({ length: 1000 }, (_, i) => `STOCK${i.toString().padStart(4, '0')}`);
      const providers = [fastProvider];

      const startTime = Date.now();
      
      const results = [];
      for (const symbol of symbols) {
        try {
          const data = await dataProviderFailover.getMarketData(symbol, providers);
          results.push(data);
        } catch (error) {
          results.push(null);
        }
      }
      
      const duration = Date.now() - startTime;
      const successfulRequests = results.filter(r => r !== null).length;
      const requestsPerSecond = (successfulRequests / duration) * 1000;

      expect(successfulRequests).toBeGreaterThan(950); // At least 95% success rate
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(requestsPerSecond).toBeGreaterThan(30); // At least 30 requests per second
      
      console.log(`1000 sequential requests: ${duration}ms, ${requestsPerSecond.toFixed(1)} req/sec`);
    });

    test('should handle 500 concurrent requests', async () => {
      const symbols = Array.from({ length: 500 }, (_, i) => `STOCK${i.toString().padStart(3, '0')}`);
      const providers = [fastProvider];

      const startTime = Date.now();
      
      const requests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers).catch(() => null)
      );
      
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      const successfulRequests = results.filter(r => r !== null).length;
      const requestsPerSecond = (successfulRequests / duration) * 1000;

      expect(successfulRequests).toBeGreaterThan(450); // At least 90% success rate
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      expect(requestsPerSecond).toBeGreaterThan(25); // At least 25 requests per second
      
      console.log(`500 concurrent requests: ${duration}ms, ${requestsPerSecond.toFixed(1)} req/sec`);
    });

    test('should handle 100 concurrent requests with mixed provider speeds', async () => {
      const symbols = Array.from({ length: 100 }, (_, i) => `MIXED${i.toString().padStart(3, '0')}`);
      const providers = [fastProvider, slowProvider]; // Fast provider should be preferred

      const startTime = Date.now();
      
      const requests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers).catch(() => null)
      );
      
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      const successfulRequests = results.filter(r => r !== null).length;

      expect(successfulRequests).toBeGreaterThan(95); // At least 95% success rate
      expect(duration).toBeLessThan(5000); // Should complete quickly using fast provider
      
      // Verify that fast provider was used more often
      expect(fastProvider.getRequestCount()).toBeGreaterThan(slowProvider.getRequestCount());
      
      console.log(`100 concurrent mixed-speed requests: ${duration}ms`);
    });
  });

  describe('Provider Failover Under Load', () => {
    test('should handle provider failures during high load', async () => {
      const symbols = Array.from({ length: 200 }, (_, i) => `FAIL${i.toString().padStart(3, '0')}`);
      const providers = [unreliableProvider, fastProvider]; // Unreliable primary, reliable fallback

      const startTime = Date.now();
      
      const requests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers).catch(() => null)
      );
      
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      const successfulRequests = results.filter(r => r !== null).length;

      expect(successfulRequests).toBeGreaterThan(180); // At least 90% success rate despite failures
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify that fallback provider was used
      expect(fastProvider.getRequestCount()).toBeGreaterThan(0);
      
      console.log(`200 requests with 10% primary failure rate: ${duration}ms, ${successfulRequests}/200 successful`);
    });

    test('should handle cascading provider failures', async () => {
      const highFailureProvider = new LoadTestMarketDataProvider(50, 0.8); // 80% failure rate
      const mediumFailureProvider = new LoadTestMarketDataProvider(75, 0.3); // 30% failure rate
      const providers = [highFailureProvider, mediumFailureProvider, fastProvider];

      const symbols = Array.from({ length: 100 }, (_, i) => `CASCADE${i.toString().padStart(3, '0')}`);

      const startTime = Date.now();
      
      const requests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers).catch(() => null)
      );
      
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      const successfulRequests = results.filter(r => r !== null).length;

      expect(successfulRequests).toBeGreaterThan(85); // Should still achieve high success rate
      expect(fastProvider.getRequestCount()).toBeGreaterThan(50); // Fallback should be heavily used
      
      console.log(`100 requests with cascading failures: ${duration}ms, ${successfulRequests}/100 successful`);
    });
  });

  describe('Caching Performance Under Load', () => {
    test('should demonstrate caching benefits under repeated requests', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']; // Limited set for cache hits
      const providers = [slowProvider]; // Slow provider to emphasize cache benefits
      const requestsPerSymbol = 20;

      // First round - populate cache
      const firstRoundStart = Date.now();
      const firstRoundRequests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers)
      );
      await Promise.all(firstRoundRequests);
      const firstRoundDuration = Date.now() - firstRoundStart;

      // Second round - should use cache
      const secondRoundStart = Date.now();
      const secondRoundRequests = [];
      for (let i = 0; i < requestsPerSymbol; i++) {
        for (const symbol of symbols) {
          secondRoundRequests.push(
            dataProviderFailover.getMarketData(symbol, providers)
          );
        }
      }
      const secondRoundResults = await Promise.all(secondRoundRequests);
      const secondRoundDuration = Date.now() - secondRoundStart;

      const totalRequests = symbols.length * requestsPerSymbol;
      const cacheHitRatio = (totalRequests - slowProvider.getRequestCount() + symbols.length) / totalRequests;

      expect(secondRoundResults).toHaveLength(totalRequests);
      expect(secondRoundDuration).toBeLessThan(firstRoundDuration * 2); // Should be much faster
      expect(cacheHitRatio).toBeGreaterThan(0.8); // At least 80% cache hit rate
      
      console.log(`Cache test: First ${symbols.length} requests: ${firstRoundDuration}ms`);
      console.log(`Cache test: Next ${totalRequests} requests: ${secondRoundDuration}ms`);
      console.log(`Cache hit ratio: ${(cacheHitRatio * 100).toFixed(1)}%`);
    });

    test('should handle cache invalidation under load', async () => {
      const symbols = Array.from({ length: 50 }, (_, i) => `CACHE${i.toString().padStart(2, '0')}`);
      const providers = [fastProvider];

      // Populate cache
      const populateRequests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers)
      );
      await Promise.all(populateRequests);

      const initialRequestCount = fastProvider.getRequestCount();
      fastProvider.resetRequestCount();

      // Request same data (should use cache)
      const cachedRequests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers)
      );
      await Promise.all(cachedRequests);

      const cachedRequestCount = fastProvider.getRequestCount();

      // Invalidate cache and request again
      await intelligentCaching.invalidateAll();
      
      const invalidatedRequests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers)
      );
      await Promise.all(invalidatedRequests);

      const finalRequestCount = fastProvider.getRequestCount();

      expect(cachedRequestCount).toBeLessThan(10); // Most should be cached
      expect(finalRequestCount - cachedRequestCount).toBeGreaterThan(40); // Most should hit provider after invalidation
      
      console.log(`Cache invalidation test: Cached requests: ${cachedRequestCount}, Post-invalidation: ${finalRequestCount - cachedRequestCount}`);
    });
  });

  describe('Circuit Breaker Performance', () => {
    test('should trip circuit breaker under high failure rate', async () => {
      const veryUnreliableProvider = new LoadTestMarketDataProvider(50, 0.9); // 90% failure rate
      const providers = [veryUnreliableProvider, fastProvider];

      // Enable circuit breaker
      dataProviderFailover.enableCircuitBreaker(veryUnreliableProvider, {
        failureThreshold: 5,
        recoveryTimeout: 1000,
        halfOpenRequests: 1
      });

      const symbols = Array.from({ length: 50 }, (_, i) => `CIRCUIT${i.toString().padStart(2, '0')}`);

      const startTime = Date.now();
      
      const requests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers).catch(() => null)
      );
      
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      const successfulRequests = results.filter(r => r !== null).length;

      expect(successfulRequests).toBeGreaterThan(40); // Should succeed via fallback
      expect(duration).toBeLessThan(5000); // Should be fast due to circuit breaker
      
      // Circuit breaker should have limited requests to unreliable provider
      expect(veryUnreliableProvider.getRequestCount()).toBeLessThan(15);
      expect(fastProvider.getRequestCount()).toBeGreaterThan(35);
      
      console.log(`Circuit breaker test: ${duration}ms, ${successfulRequests}/50 successful`);
      console.log(`Unreliable provider requests: ${veryUnreliableProvider.getRequestCount()}, Fast provider: ${fastProvider.getRequestCount()}`);
    });

    test('should recover from circuit breaker after timeout', async () => {
      const recoveringProvider = new LoadTestMarketDataProvider(50, 0.8); // Initially high failure rate
      const providers = [recoveringProvider, fastProvider];

      // Enable circuit breaker with short timeout
      dataProviderFailover.enableCircuitBreaker(recoveringProvider, {
        failureThreshold: 3,
        recoveryTimeout: 500, // Short timeout for testing
        halfOpenRequests: 2
      });

      // Trip the circuit breaker
      const initialRequests = Array.from({ length: 10 }, (_, i) => `TRIP${i}`);
      await Promise.all(
        initialRequests.map(symbol => 
          dataProviderFailover.getMarketData(symbol, providers).catch(() => null)
        )
      );

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 600));

      // Improve provider reliability
      recoveringProvider = new LoadTestMarketDataProvider(50, 0.1); // Much better reliability

      // Test recovery
      const recoveryRequests = Array.from({ length: 10 }, (_, i) => `RECOVER${i}`);
      const recoveryResults = await Promise.all(
        recoveryRequests.map(symbol => 
          dataProviderFailover.getMarketData(symbol, providers).catch(() => null)
        )
      );

      const successfulRecoveryRequests = recoveryResults.filter(r => r !== null).length;
      expect(successfulRecoveryRequests).toBeGreaterThan(8); // Should recover successfully
      
      console.log(`Circuit breaker recovery: ${successfulRecoveryRequests}/10 successful after recovery`);
    });
  });

  describe('Memory Usage Under Load', () => {
    test('should maintain reasonable memory usage during sustained load', async () => {
      const symbols = Array.from({ length: 1000 }, (_, i) => `MEM${i.toString().padStart(4, '0')}`);
      const providers = [fastProvider];

      const initialMemory = process.memoryUsage();
      
      // Sustained load test
      for (let batch = 0; batch < 10; batch++) {
        const batchSymbols = symbols.slice(batch * 100, (batch + 1) * 100);
        const requests = batchSymbols.map(symbol => 
          dataProviderFailover.getMarketData(symbol, providers)
        );
        await Promise.all(requests);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      expect(memoryIncreaseMB).toBeLessThan(100); // Should not use more than 100MB additional memory
      
      console.log(`Memory usage after 1000 requests: ${memoryIncreaseMB.toFixed(2)}MB increase`);
    });

    test('should handle memory cleanup during long-running operations', async () => {
      const providers = [fastProvider];
      const memorySnapshots: number[] = [];

      // Long-running test with memory monitoring
      for (let i = 0; i < 20; i++) {
        const batchSymbols = Array.from({ length: 50 }, (_, j) => `LONG${i}_${j}`);
        const requests = batchSymbols.map(symbol => 
          dataProviderFailover.getMarketData(symbol, providers)
        );
        await Promise.all(requests);
        
        const currentMemory = process.memoryUsage().heapUsed / (1024 * 1024);
        memorySnapshots.push(currentMemory);
        
        // Force garbage collection periodically
        if (i % 5 === 0 && global.gc) {
          global.gc();
        }
      }

      // Check that memory doesn't grow unbounded
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = finalMemory - initialMemory;

      expect(memoryGrowth).toBeLessThan(50); // Should not grow by more than 50MB
      
      console.log(`Memory growth over 1000 requests in 20 batches: ${memoryGrowth.toFixed(2)}MB`);
    });
  });

  describe('Stress Testing', () => {
    test('should handle extreme load with 2000 concurrent requests', async () => {
      const symbols = Array.from({ length: 2000 }, (_, i) => `STRESS${i.toString().padStart(4, '0')}`);
      const providers = [fastProvider, slowProvider]; // Multiple providers for load distribution

      const startTime = Date.now();
      
      const requests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers)
          .catch(error => ({ error: error.message, symbol }))
      );
      
      const results = await Promise.allSettled(requests);
      const duration = Date.now() - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled' && !('error' in r.value)).length;
      const failed = results.length - successful;
      const successRate = (successful / results.length) * 100;

      expect(successRate).toBeGreaterThan(80); // At least 80% success rate under extreme load
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      
      console.log(`Extreme load test (2000 requests): ${duration}ms, ${successRate.toFixed(1)}% success rate`);
      console.log(`Successful: ${successful}, Failed: ${failed}`);
    });

    test('should handle mixed provider types under load', async () => {
      const marketSymbols = Array.from({ length: 100 }, (_, i) => `MARKET${i}`);
      const newsSymbols = Array.from({ length: 50 }, (_, i) => `NEWS${i}`);
      
      const marketProviders = [fastProvider, slowProvider];
      const newsProviders = [newsProvider];

      const startTime = Date.now();
      
      const marketRequests = marketSymbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, marketProviders).catch(() => null)
      );
      
      const newsRequests = newsSymbols.map(symbol => 
        dataProviderFailover.getNewsData(symbol, newsProviders).catch(() => null)
      );
      
      const [marketResults, newsResults] = await Promise.all([
        Promise.all(marketRequests),
        Promise.all(newsRequests)
      ]);
      
      const duration = Date.now() - startTime;
      const marketSuccess = marketResults.filter(r => r !== null).length;
      const newsSuccess = newsResults.filter(r => r !== null).length;

      expect(marketSuccess).toBeGreaterThan(90); // At least 90% market data success
      expect(newsSuccess).toBeGreaterThan(45); // At least 90% news data success
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      
      console.log(`Mixed provider load test: ${duration}ms`);
      console.log(`Market data: ${marketSuccess}/100, News data: ${newsSuccess}/50`);
    });
  });

  describe('Performance Degradation Testing', () => {
    test('should maintain performance as provider latency increases', async () => {
      const latencies = [10, 50, 100, 200, 500]; // Increasing latencies
      const results: { latency: number; duration: number; throughput: number }[] = [];

      for (const latency of latencies) {
        const testProvider = new LoadTestMarketDataProvider(latency, 0);
        const symbols = Array.from({ length: 100 }, (_, i) => `LAT${latency}_${i}`);

        const startTime = Date.now();
        const requests = symbols.map(symbol => 
          dataProviderFailover.getMarketData(symbol, [testProvider])
        );
        await Promise.all(requests);
        const duration = Date.now() - startTime;
        const throughput = (symbols.length / duration) * 1000; // requests per second

        results.push({ latency, duration, throughput });
        
        console.log(`Latency ${latency}ms: ${duration}ms total, ${throughput.toFixed(1)} req/sec`);
      }

      // Verify that throughput degrades gracefully, not catastrophically
      const firstThroughput = results[0].throughput;
      const lastThroughput = results[results.length - 1].throughput;
      const degradationRatio = lastThroughput / firstThroughput;

      expect(degradationRatio).toBeGreaterThan(0.1); // Should not degrade by more than 90%
    });

    test('should handle provider timeout scenarios', async () => {
      const timeoutProvider = new LoadTestMarketDataProvider(5000, 0); // 5 second delay
      const fastFallback = new LoadTestMarketDataProvider(50, 0);
      const providers = [timeoutProvider, fastFallback];

      const symbols = Array.from({ length: 50 }, (_, i) => `TIMEOUT${i}`);

      const startTime = Date.now();
      const requests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers, { timeout: 1000 }) // 1 second timeout
      );
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r !== null).length;

      expect(successful).toBeGreaterThan(45); // Should succeed via fallback
      expect(duration).toBeLessThan(5000); // Should not wait for slow provider
      expect(fastFallback.getRequestCount()).toBeGreaterThan(40); // Should use fallback
      
      console.log(`Timeout test: ${duration}ms, ${successful}/50 successful via fallback`);
    });
  });
});