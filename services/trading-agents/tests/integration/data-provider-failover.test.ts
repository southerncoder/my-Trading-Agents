/**
 * Integration Tests for Data Provider Failover
 * 
 * Tests data provider resilience with simulated failures
 * Requirements: 7.2
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { DataProviderFailover } from '../../src/resilience/data-provider-failover';
import { CircuitBreaker } from '../../src/utils/circuit-breaker';
import { IntelligentCaching } from '../../src/resilience/intelligent-caching';
import {
  DataProvider,
  NewsProvider,
  SocialProvider,
  HealthStatus,
  CircuitBreakerConfig,
  MarketData,
  NewsData,
  SentimentData
} from '../../src/types/data-providers';

// Mock data providers for testing
class MockYahooFinanceProvider implements DataProvider {
  name = 'yahoo-finance';
  private shouldFail = false;
  private responseDelay = 0;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  setResponseDelay(delay: number) {
    this.responseDelay = delay;
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    if (this.shouldFail) {
      throw new Error('Yahoo Finance API unavailable');
    }

    return {
      symbol,
      timestamp: new Date(),
      open: 150,
      high: 155,
      low: 148,
      close: 152,
      volume: 1000000,
      adjustedClose: 152
    };
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      provider: this.name,
      status: this.shouldFail ? 'failed' : 'healthy',
      responseTime: this.responseDelay,
      errorRate: this.shouldFail ? 1.0 : 0.0,
      lastCheck: new Date()
    };
  }
}

class MockAlphaVantageProvider implements DataProvider {
  name = 'alpha-vantage';
  private shouldFail = false;
  private responseDelay = 0;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  setResponseDelay(delay: number) {
    this.responseDelay = delay;
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    if (this.shouldFail) {
      throw new Error('Alpha Vantage rate limit exceeded');
    }

    return {
      symbol,
      timestamp: new Date(),
      open: 149,
      high: 154,
      low: 147,
      close: 151,
      volume: 950000,
      adjustedClose: 151
    };
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      provider: this.name,
      status: this.shouldFail ? 'failed' : 'healthy',
      responseTime: this.responseDelay,
      errorRate: this.shouldFail ? 1.0 : 0.0,
      lastCheck: new Date()
    };
  }
}

class MockMarketStackProvider implements DataProvider {
  name = 'marketstack';
  private shouldFail = false;
  private responseDelay = 0;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  setResponseDelay(delay: number) {
    this.responseDelay = delay;
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    if (this.shouldFail) {
      throw new Error('MarketStack service unavailable');
    }

    return {
      symbol,
      timestamp: new Date(),
      open: 148,
      high: 153,
      low: 146,
      close: 150,
      volume: 900000,
      adjustedClose: 150
    };
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      provider: this.name,
      status: this.shouldFail ? 'failed' : 'healthy',
      responseTime: this.responseDelay,
      errorRate: this.shouldFail ? 1.0 : 0.0,
      lastCheck: new Date()
    };
  }
}

class MockGoogleNewsProvider implements NewsProvider {
  name = 'google-news';
  private shouldFail = false;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async getNewsData(symbol: string): Promise<NewsData[]> {
    if (this.shouldFail) {
      throw new Error('Google News API unavailable');
    }

    return [
      {
        title: `${symbol} shows strong performance`,
        content: 'Market analysis indicates positive trends',
        source: 'Financial Times',
        timestamp: new Date(),
        url: 'https://example.com/news1',
        sentiment: 0.7,
        relevance: 0.9
      }
    ];
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      provider: this.name,
      status: this.shouldFail ? 'failed' : 'healthy',
      responseTime: 100,
      errorRate: this.shouldFail ? 1.0 : 0.0,
      lastCheck: new Date()
    };
  }
}

class MockNewsAPIProvider implements NewsProvider {
  name = 'newsapi';
  private shouldFail = false;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async getNewsData(symbol: string): Promise<NewsData[]> {
    if (this.shouldFail) {
      throw new Error('NewsAPI rate limit exceeded');
    }

    return [
      {
        title: `${symbol} market update`,
        content: 'Latest market developments and analysis',
        source: 'Reuters',
        timestamp: new Date(),
        url: 'https://example.com/news2',
        sentiment: 0.5,
        relevance: 0.8
      }
    ];
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      provider: this.name,
      status: this.shouldFail ? 'failed' : 'healthy',
      responseTime: 150,
      errorRate: this.shouldFail ? 1.0 : 0.0,
      lastCheck: new Date()
    };
  }
}

class MockRedditProvider implements SocialProvider {
  name = 'reddit';
  private shouldFail = false;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async getSocialSentiment(symbol: string): Promise<SentimentData> {
    if (this.shouldFail) {
      throw new Error('Reddit API authentication failed');
    }

    return {
      symbol,
      sentiment: 0.6,
      confidence: 0.8,
      volume: 150,
      timestamp: new Date(),
      sources: ['r/investing', 'r/stocks'],
      breakdown: {
        positive: 60,
        neutral: 25,
        negative: 15
      }
    };
  }

  async checkHealth(): Promise<HealthStatus> {
    return {
      provider: this.name,
      status: this.shouldFail ? 'failed' : 'healthy',
      responseTime: 200,
      errorRate: this.shouldFail ? 1.0 : 0.0,
      lastCheck: new Date()
    };
  }
}

describe('Data Provider Failover Integration Tests', () => {
  let dataProviderFailover: DataProviderFailover;
  let yahooProvider: MockYahooFinanceProvider;
  let alphaVantageProvider: MockAlphaVantageProvider;
  let marketStackProvider: MockMarketStackProvider;
  let googleNewsProvider: MockGoogleNewsProvider;
  let newsAPIProvider: MockNewsAPIProvider;
  let redditProvider: MockRedditProvider;
  let intelligentCaching: IntelligentCaching;

  beforeAll(async () => {
    // Initialize mock providers
    yahooProvider = new MockYahooFinanceProvider();
    alphaVantageProvider = new MockAlphaVantageProvider();
    marketStackProvider = new MockMarketStackProvider();
    googleNewsProvider = new MockGoogleNewsProvider();
    newsAPIProvider = new MockNewsAPIProvider();
    redditProvider = new MockRedditProvider();

    // Initialize caching and failover system
    intelligentCaching = new IntelligentCaching();
    dataProviderFailover = new DataProviderFailover(intelligentCaching);
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all providers to healthy state
    yahooProvider.setShouldFail(false);
    yahooProvider.setResponseDelay(0);
    alphaVantageProvider.setShouldFail(false);
    alphaVantageProvider.setResponseDelay(0);
    marketStackProvider.setShouldFail(false);
    marketStackProvider.setResponseDelay(0);
    googleNewsProvider.setShouldFail(false);
    newsAPIProvider.setShouldFail(false);
    redditProvider.setShouldFail(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Market Data Provider Failover', () => {
    test('should use primary provider when healthy', async () => {
      const providers = [yahooProvider, alphaVantageProvider, marketStackProvider];
      
      const marketData = await dataProviderFailover.getMarketData('AAPL', providers);

      expect(marketData).toBeDefined();
      expect(marketData.symbol).toBe('AAPL');
      expect(marketData.close).toBe(152); // Yahoo Finance mock data
    });

    test('should failover to secondary provider when primary fails', async () => {
      yahooProvider.setShouldFail(true);
      const providers = [yahooProvider, alphaVantageProvider, marketStackProvider];
      
      const marketData = await dataProviderFailover.getMarketData('AAPL', providers);

      expect(marketData).toBeDefined();
      expect(marketData.symbol).toBe('AAPL');
      expect(marketData.close).toBe(151); // Alpha Vantage mock data
    });

    test('should cascade through all providers until success', async () => {
      yahooProvider.setShouldFail(true);
      alphaVantageProvider.setShouldFail(true);
      const providers = [yahooProvider, alphaVantageProvider, marketStackProvider];
      
      const marketData = await dataProviderFailover.getMarketData('AAPL', providers);

      expect(marketData).toBeDefined();
      expect(marketData.symbol).toBe('AAPL');
      expect(marketData.close).toBe(150); // MarketStack mock data
    });

    test('should throw error when all providers fail', async () => {
      yahooProvider.setShouldFail(true);
      alphaVantageProvider.setShouldFail(true);
      marketStackProvider.setShouldFail(true);
      const providers = [yahooProvider, alphaVantageProvider, marketStackProvider];
      
      await expect(dataProviderFailover.getMarketData('AAPL', providers))
        .rejects.toThrow('All market data providers failed');
    });

    test('should handle provider timeout and failover', async () => {
      yahooProvider.setResponseDelay(10000); // 10 second delay
      const providers = [yahooProvider, alphaVantageProvider, marketStackProvider];
      
      const startTime = Date.now();
      const marketData = await dataProviderFailover.getMarketData('AAPL', providers, { timeout: 1000 });
      const duration = Date.now() - startTime;

      expect(marketData).toBeDefined();
      expect(marketData.close).toBe(151); // Should use Alpha Vantage
      expect(duration).toBeLessThan(5000); // Should not wait for Yahoo timeout
    });
  });

  describe('News Data Provider Failover', () => {
    test('should failover news providers correctly', async () => {
      googleNewsProvider.setShouldFail(true);
      const providers = [googleNewsProvider, newsAPIProvider];
      
      const newsData = await dataProviderFailover.getNewsData('AAPL', providers);

      expect(newsData).toBeDefined();
      expect(newsData.length).toBeGreaterThan(0);
      expect(newsData[0].source).toBe('Reuters'); // NewsAPI mock data
    });

    test('should aggregate news from multiple providers when available', async () => {
      const providers = [googleNewsProvider, newsAPIProvider];
      
      const newsData = await dataProviderFailover.getNewsData('AAPL', providers, { aggregateAll: true });

      expect(newsData).toBeDefined();
      expect(newsData.length).toBe(2); // Both providers should contribute
      expect(newsData.some(n => n.source === 'Financial Times')).toBe(true);
      expect(newsData.some(n => n.source === 'Reuters')).toBe(true);
    });

    test('should handle partial news provider failures', async () => {
      googleNewsProvider.setShouldFail(true);
      const providers = [googleNewsProvider, newsAPIProvider];
      
      const newsData = await dataProviderFailover.getNewsData('AAPL', providers, { aggregateAll: true });

      expect(newsData).toBeDefined();
      expect(newsData.length).toBe(1); // Only NewsAPI should contribute
      expect(newsData[0].source).toBe('Reuters');
    });
  });

  describe('Social Sentiment Provider Failover', () => {
    test('should use cached sentiment when provider fails', async () => {
      // First, get sentiment to populate cache
      const initialSentiment = await dataProviderFailover.getSocialSentiment('AAPL', [redditProvider]);
      expect(initialSentiment).toBeDefined();

      // Then simulate provider failure
      redditProvider.setShouldFail(true);
      
      const cachedSentiment = await dataProviderFailover.getSocialSentiment('AAPL', [redditProvider]);

      expect(cachedSentiment).toBeDefined();
      expect(cachedSentiment.symbol).toBe('AAPL');
      expect(cachedSentiment.cached).toBe(true);
    });

    test('should provide degraded sentiment when no cache available', async () => {
      redditProvider.setShouldFail(true);
      
      const degradedSentiment = await dataProviderFailover.getSocialSentiment('AAPL', [redditProvider]);

      expect(degradedSentiment).toBeDefined();
      expect(degradedSentiment.symbol).toBe('AAPL');
      expect(degradedSentiment.sentiment).toBe(0); // Neutral when no data
      expect(degradedSentiment.confidence).toBeLessThan(0.5);
      expect(degradedSentiment.degraded).toBe(true);
    });
  });

  describe('Circuit Breaker Integration', () => {
    test('should enable circuit breaker for failing provider', async () => {
      const circuitBreakerConfig: CircuitBreakerConfig = {
        failureThreshold: 3,
        recoveryTimeout: 5000,
        halfOpenRequests: 1
      };

      dataProviderFailover.enableCircuitBreaker(yahooProvider, circuitBreakerConfig);
      
      // Simulate multiple failures to trip circuit breaker
      yahooProvider.setShouldFail(true);
      const providers = [yahooProvider, alphaVantageProvider];

      for (let i = 0; i < 4; i++) {
        try {
          await dataProviderFailover.getMarketData('AAPL', [yahooProvider]);
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit breaker should now be open, should use fallback immediately
      const startTime = Date.now();
      const marketData = await dataProviderFailover.getMarketData('AAPL', providers);
      const duration = Date.now() - startTime;

      expect(marketData).toBeDefined();
      expect(marketData.close).toBe(151); // Alpha Vantage data
      expect(duration).toBeLessThan(100); // Should be immediate due to circuit breaker
    });

    test('should recover from circuit breaker after timeout', async () => {
      const circuitBreakerConfig: CircuitBreakerConfig = {
        failureThreshold: 2,
        recoveryTimeout: 1000, // 1 second
        halfOpenRequests: 1
      };

      dataProviderFailover.enableCircuitBreaker(yahooProvider, circuitBreakerConfig);
      
      // Trip circuit breaker
      yahooProvider.setShouldFail(true);
      for (let i = 0; i < 3; i++) {
        try {
          await dataProviderFailover.getMarketData('AAPL', [yahooProvider]);
        } catch (error) {
          // Expected to fail
        }
      }

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Fix provider and test recovery
      yahooProvider.setShouldFail(false);
      
      const marketData = await dataProviderFailover.getMarketData('AAPL', [yahooProvider]);

      expect(marketData).toBeDefined();
      expect(marketData.close).toBe(152); // Yahoo Finance data - circuit breaker recovered
    });
  });

  describe('Health Monitoring Integration', () => {
    test('should monitor provider health continuously', async () => {
      const providers = [yahooProvider, alphaVantageProvider, marketStackProvider];
      
      const healthStatuses = await Promise.all(
        providers.map(provider => dataProviderFailover.checkProviderHealth(provider))
      );

      expect(healthStatuses).toHaveLength(3);
      healthStatuses.forEach(status => {
        expect(status.provider).toBeDefined();
        expect(status.status).toMatch(/^(healthy|degraded|failed)$/);
        expect(status.responseTime).toBeGreaterThanOrEqual(0);
        expect(status.errorRate).toBeGreaterThanOrEqual(0);
        expect(status.errorRate).toBeLessThanOrEqual(1);
        expect(status.lastCheck).toBeInstanceOf(Date);
      });
    });

    test('should detect degraded provider performance', async () => {
      yahooProvider.setResponseDelay(5000); // Slow response
      
      const healthStatus = await dataProviderFailover.checkProviderHealth(yahooProvider);

      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.responseTime).toBeGreaterThan(1000);
    });

    test('should automatically handle provider failure', async () => {
      const providers = [yahooProvider, alphaVantageProvider];
      
      // Simulate provider failure during operation
      setTimeout(() => {
        yahooProvider.setShouldFail(true);
      }, 100);

      const marketDataPromises = Array.from({ length: 10 }, (_, i) => 
        new Promise(resolve => {
          setTimeout(async () => {
            try {
              const data = await dataProviderFailover.getMarketData('AAPL', providers);
              resolve(data);
            } catch (error) {
              resolve(null);
            }
          }, i * 50);
        })
      );

      const results = await Promise.all(marketDataPromises);
      const successfulResults = results.filter(r => r !== null);

      expect(successfulResults.length).toBeGreaterThan(5); // Should have some successful results
    });
  });

  describe('Intelligent Caching Integration', () => {
    test('should cache successful responses', async () => {
      const providers = [yahooProvider];
      
      // First request - should hit provider
      const startTime1 = Date.now();
      const marketData1 = await dataProviderFailover.getMarketData('AAPL', providers);
      const duration1 = Date.now() - startTime1;

      // Second request - should use cache
      const startTime2 = Date.now();
      const marketData2 = await dataProviderFailover.getMarketData('AAPL', providers);
      const duration2 = Date.now() - startTime2;

      expect(marketData1).toEqual(marketData2);
      expect(duration2).toBeLessThan(duration1); // Cache should be faster
    });

    test('should invalidate cache on provider failure', async () => {
      const providers = [yahooProvider, alphaVantageProvider];
      
      // Get initial data and cache it
      const initialData = await dataProviderFailover.getMarketData('AAPL', providers);
      expect(initialData.close).toBe(152);

      // Fail primary provider
      yahooProvider.setShouldFail(true);
      
      // Should get fresh data from secondary provider
      const failoverData = await dataProviderFailover.getMarketData('AAPL', providers);
      expect(failoverData.close).toBe(151); // Alpha Vantage data
    });

    test('should prefetch data for frequently requested symbols', async () => {
      const providers = [yahooProvider];
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      
      // Request data multiple times to establish pattern
      for (const symbol of symbols) {
        for (let i = 0; i < 3; i++) {
          await dataProviderFailover.getMarketData(symbol, providers);
        }
      }

      // Trigger prefetch
      await dataProviderFailover.prefetchFrequentData();

      // Verify prefetch worked by checking cache statistics
      const cacheStats = await intelligentCaching.getCacheStatistics();
      expect(cacheStats.hitRate).toBeGreaterThan(0.5);
      expect(cacheStats.prefetchedItems).toBeGreaterThan(0);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle concurrent requests efficiently', async () => {
      const providers = [yahooProvider, alphaVantageProvider];
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      
      const startTime = Date.now();
      
      const requests = symbols.map(symbol => 
        dataProviderFailover.getMarketData(symbol, providers)
      );
      
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      results.forEach((result, index) => {
        expect(result.symbol).toBe(symbols[index]);
        expect(result.close).toBeGreaterThan(0);
      });
    });

    test('should handle mixed success/failure scenarios', async () => {
      const providers = [yahooProvider, alphaVantageProvider, marketStackProvider];
      
      // Simulate intermittent failures
      let requestCount = 0;
      const originalGetMarketData = yahooProvider.getMarketData.bind(yahooProvider);
      yahooProvider.getMarketData = async (symbol: string) => {
        requestCount++;
        if (requestCount % 3 === 0) {
          throw new Error('Intermittent failure');
        }
        return originalGetMarketData(symbol);
      };

      const requests = Array.from({ length: 20 }, (_, i) => 
        dataProviderFailover.getMarketData(`STOCK${i}`, providers)
      );

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBeGreaterThan(15); // Most should succeed via failover
      expect(failed.length).toBeLessThan(5); // Few should fail completely
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should recover from network partitions', async () => {
      const providers = [yahooProvider, alphaVantageProvider];
      
      // Simulate network partition - all providers fail
      yahooProvider.setShouldFail(true);
      alphaVantageProvider.setShouldFail(true);

      // Should use cached data or return degraded service
      const degradedData = await dataProviderFailover.getMarketData('AAPL', providers);
      expect(degradedData).toBeDefined();
      expect(degradedData.degraded || degradedData.cached).toBe(true);

      // Simulate network recovery
      yahooProvider.setShouldFail(false);
      alphaVantageProvider.setShouldFail(false);

      // Should return to normal operation
      const recoveredData = await dataProviderFailover.getMarketData('AAPL', providers);
      expect(recoveredData.degraded).toBeFalsy();
      expect(recoveredData.cached).toBeFalsy();
    });

    test('should handle provider rate limiting gracefully', async () => {
      const providers = [yahooProvider, alphaVantageProvider];
      
      // Simulate rate limiting on primary provider
      let requestCount = 0;
      const originalGetMarketData = yahooProvider.getMarketData.bind(yahooProvider);
      yahooProvider.getMarketData = async (symbol: string) => {
        requestCount++;
        if (requestCount > 5) {
          throw new Error('Rate limit exceeded');
        }
        return originalGetMarketData(symbol);
      };

      // Make many requests
      const requests = Array.from({ length: 10 }, (_, i) => 
        dataProviderFailover.getMarketData(`STOCK${i}`, providers)
      );

      const results = await Promise.all(requests);

      // Should successfully get all data via failover
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.close).toBeGreaterThan(0);
      });

      // Later requests should use Alpha Vantage due to Yahoo rate limiting
      const laterResults = results.slice(5);
      laterResults.forEach(result => {
        expect(result.close).toBe(151); // Alpha Vantage data
      });
    });
  });
});