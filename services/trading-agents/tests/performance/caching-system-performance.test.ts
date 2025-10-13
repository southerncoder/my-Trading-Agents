/**
 * Performance Tests for Caching System
 * 
 * Tests memory usage optimization and caching system performance
 * Requirements: 7.4
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { IntelligentCaching } from '../../src/resilience/intelligent-caching';
import {
  CacheStatistics,
  CacheOptimizationResult,
  MarketData,
  NewsData,
  SentimentData
} from '../../src/types/data-providers';

// Mock Redis for testing
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
    keys: jest.fn(),
    memory: jest.fn(() => ({ usage: jest.fn(() => 1024 * 1024) })) // 1MB
  }))
}));

describe('Caching System Performance Tests', () => {
  let intelligentCaching: IntelligentCaching;

  const generateMarketData = (symbol: string, count: number): MarketData[] => {
    return Array.from({ length: count }, (_, i) => ({
      symbol,
      timestamp: new Date(Date.now() - i * 60000), // 1 minute intervals
      open: 150 + Math.random() * 10,
      high: 155 + Math.random() * 10,
      low: 145 + Math.random() * 10,
      close: 150 + Math.random() * 10,
      volume: 1000000 + Math.random() * 5000000,
      adjustedClose: 150 + Math.random() * 10
    }));
  };

  const generateNewsData = (symbol: string, count: number): NewsData[] => {
    return Array.from({ length: count }, (_, i) => ({
      title: `${symbol} News Article ${i}`,
      content: `This is news content for ${symbol} article number ${i}. `.repeat(50), // ~2KB per article
      source: `Source ${i % 10}`,
      timestamp: new Date(Date.now() - i * 3600000), // 1 hour intervals
      url: `https://example.com/news/${symbol}/${i}`,
      sentiment: Math.random() * 2 - 1,
      relevance: Math.random()
    }));
  };

  const generateSentimentData = (symbol: string): SentimentData => ({
    symbol,
    sentiment: Math.random() * 2 - 1,
    confidence: Math.random(),
    volume: Math.floor(Math.random() * 1000),
    timestamp: new Date(),
    sources: ['reddit', 'twitter', 'news'],
    breakdown: {
      positive: Math.floor(Math.random() * 100),
      neutral: Math.floor(Math.random() * 100),
      negative: Math.floor(Math.random() * 100)
    }
  });

  beforeAll(async () => {
    intelligentCaching = new IntelligentCaching();
    await intelligentCaching.initialize();
  });

  afterAll(async () => {
    await intelligentCaching.cleanup();
  });

  beforeEach(async () => {
    await intelligentCaching.clearAll();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Write Performance', () => {
    test('should handle high-volume cache writes efficiently', async () => {
      const symbols = Array.from({ length: 1000 }, (_, i) => `STOCK${i.toString().padStart(4, '0')}`);
      const marketDataSets = symbols.map(symbol => ({
        symbol,
        data: generateMarketData(symbol, 1)[0] // Single data point per symbol
      }));

      const startTime = Date.now();
      
      const writePromises = marketDataSets.map(({ symbol, data }) =>
        intelligentCaching.cacheMarketData(symbol, data, 300) // 5 minute TTL
      );
      
      await Promise.all(writePromises);
      const duration = Date.now() - startTime;
      const writesPerSecond = (symbols.length / duration) * 1000;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(writesPerSecond).toBeGreaterThan(50); // At least 50 writes per second
      
      console.log(`1000 cache writes: ${duration}ms, ${writesPerSecond.toFixed(1)} writes/sec`);
    });

    test('should handle large data objects efficiently', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      const largeDataSets = symbols.map(symbol => ({
        symbol,
        marketData: generateMarketData(symbol, 1000), // 1000 data points
        newsData: generateNewsData(symbol, 100), // 100 news articles
        sentimentData: generateSentimentData(symbol)
      }));

      const startTime = Date.now();
      
      for (const { symbol, marketData, newsData, sentimentData } of largeDataSets) {
        await Promise.all([
          intelligentCaching.cacheMarketData(symbol, marketData[0], 300),
          intelligentCaching.cacheNewsData(symbol, newsData, 600),
          intelligentCaching.cacheSentimentData(symbol, sentimentData, 180)
        ]);
      }
      
      const duration = Date.now() - startTime;
      const totalDataPoints = largeDataSets.length * (1000 + 100 + 1);
      const dataPointsPerSecond = (totalDataPoints / duration) * 1000;

      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      expect(dataPointsPerSecond).toBeGreaterThan(200); // At least 200 data points per second
      
      console.log(`Large data cache writes: ${duration}ms, ${dataPointsPerSecond.toFixed(1)} data points/sec`);
    });

    test('should handle concurrent writes without conflicts', async () => {
      const symbol = 'CONCURRENT_TEST';
      const concurrentWrites = 100;
      
      const startTime = Date.now();
      
      const writePromises = Array.from({ length: concurrentWrites }, (_, i) => {
        const data = generateMarketData(symbol, 1)[0];
        data.timestamp = new Date(Date.now() + i); // Unique timestamps
        return intelligentCaching.cacheMarketData(`${symbol}_${i}`, data, 300);
      });
      
      await Promise.all(writePromises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`${concurrentWrites} concurrent writes: ${duration}ms`);
    });
  });

  describe('Cache Read Performance', () => {
    test('should demonstrate cache hit performance benefits', async () => {
      const symbols = Array.from({ length: 100 }, (_, i) => `READ${i.toString().padStart(3, '0')}`);
      
      // Populate cache
      const populatePromises = symbols.map(symbol => {
        const data = generateMarketData(symbol, 1)[0];
        return intelligentCaching.cacheMarketData(symbol, data, 300);
      });
      await Promise.all(populatePromises);

      // Measure cache read performance
      const readStartTime = Date.now();
      
      const readPromises = symbols.map(symbol =>
        intelligentCaching.getCachedData(symbol, 300)
      );
      
      const results = await Promise.all(readPromises);
      const readDuration = Date.now() - readStartTime;
      const readsPerSecond = (symbols.length / readDuration) * 1000;

      const cacheHits = results.filter(r => r !== null).length;
      const hitRate = (cacheHits / symbols.length) * 100;

      expect(hitRate).toBeGreaterThan(95); // At least 95% hit rate
      expect(readsPerSecond).toBeGreaterThan(500); // At least 500 reads per second
      
      console.log(`100 cache reads: ${readDuration}ms, ${readsPerSecond.toFixed(1)} reads/sec, ${hitRate.toFixed(1)}% hit rate`);
    });

    test('should handle high-frequency read requests', async () => {
      const symbol = 'HIGH_FREQ';
      const data = generateMarketData(symbol, 1)[0];
      await intelligentCaching.cacheMarketData(symbol, data, 300);

      const readCount = 10000;
      const startTime = Date.now();
      
      const readPromises = Array.from({ length: readCount }, () =>
        intelligentCaching.getCachedData(symbol, 300)
      );
      
      const results = await Promise.all(readPromises);
      const duration = Date.now() - startTime;
      const readsPerSecond = (readCount / duration) * 1000;

      const successfulReads = results.filter(r => r !== null).length;
      expect(successfulReads).toBe(readCount); // All should be cache hits
      expect(readsPerSecond).toBeGreaterThan(1000); // At least 1000 reads per second
      
      console.log(`${readCount} high-frequency reads: ${duration}ms, ${readsPerSecond.toFixed(1)} reads/sec`);
    });

    test('should handle mixed read/write operations', async () => {
      const symbols = Array.from({ length: 200 }, (_, i) => `MIXED${i.toString().padStart(3, '0')}`);
      const operationsPerSymbol = 10;
      
      const startTime = Date.now();
      
      const operations = [];
      for (const symbol of symbols) {
        for (let i = 0; i < operationsPerSymbol; i++) {
          if (i % 3 === 0) {
            // Write operation
            const data = generateMarketData(symbol, 1)[0];
            operations.push(intelligentCaching.cacheMarketData(symbol, data, 300));
          } else {
            // Read operation
            operations.push(intelligentCaching.getCachedData(symbol, 300));
          }
        }
      }
      
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;
      const operationsPerSecond = (operations.length / duration) * 1000;

      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
      expect(operationsPerSecond).toBeGreaterThan(50); // At least 50 operations per second
      
      console.log(`${operations.length} mixed operations: ${duration}ms, ${operationsPerSecond.toFixed(1)} ops/sec`);
    });
  });

  describe('Memory Usage Optimization', () => {
    test('should maintain reasonable memory usage with large cache', async () => {
      const symbols = Array.from({ length: 1000 }, (_, i) => `MEM${i.toString().padStart(4, '0')}`);
      
      const initialMemory = process.memoryUsage();
      
      // Fill cache with data
      for (const symbol of symbols) {
        const marketData = generateMarketData(symbol, 10); // 10 data points per symbol
        const newsData = generateNewsData(symbol, 5); // 5 news articles per symbol
        const sentimentData = generateSentimentData(symbol);
        
        await Promise.all([
          intelligentCaching.cacheMarketData(symbol, marketData[0], 300),
          intelligentCaching.cacheNewsData(symbol, newsData, 600),
          intelligentCaching.cacheSentimentData(symbol, sentimentData, 180)
        ]);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      // Get cache statistics
      const stats = await intelligentCaching.getCacheStatistics();
      
      expect(memoryIncreaseMB).toBeLessThan(200); // Should not use more than 200MB
      expect(stats.totalItems).toBeGreaterThan(2000); // Should have cached many items
      
      console.log(`Cache memory usage: ${memoryIncreaseMB.toFixed(2)}MB for ${stats.totalItems} items`);
    });

    test('should handle cache size optimization', async () => {
      const symbols = Array.from({ length: 500 }, (_, i) => `OPT${i.toString().padStart(3, '0')}`);
      
      // Fill cache beyond optimal size
      for (const symbol of symbols) {
        const largeData = generateNewsData(symbol, 50); // Large news data
        await intelligentCaching.cacheNewsData(symbol, largeData, 600);
      }
      
      const beforeOptimization = await intelligentCaching.getCacheStatistics();
      
      // Optimize cache size
      const maxMemoryMB = 50; // 50MB limit
      const optimizationResult = await intelligentCaching.optimizeCacheSize(maxMemoryMB * 1024 * 1024);
      
      const afterOptimization = await intelligentCaching.getCacheStatistics();
      
      expect(optimizationResult.itemsRemoved).toBeGreaterThan(0);
      expect(afterOptimization.totalItems).toBeLessThan(beforeOptimization.totalItems);
      expect(afterOptimization.memoryUsageMB).toBeLessThan(beforeOptimization.memoryUsageMB);
      
      console.log(`Cache optimization: Removed ${optimizationResult.itemsRemoved} items`);
      console.log(`Memory usage: ${beforeOptimization.memoryUsageMB}MB -> ${afterOptimization.memoryUsageMB}MB`);
    });

    test('should handle automatic cleanup of expired items', async () => {
      const symbols = Array.from({ length: 100 }, (_, i) => `EXPIRE${i.toString().padStart(3, '0')}`);
      
      // Cache data with short TTL
      const shortTTL = 1; // 1 second
      for (const symbol of symbols) {
        const data = generateMarketData(symbol, 1)[0];
        await intelligentCaching.cacheMarketData(symbol, data, shortTTL);
      }
      
      const beforeExpiry = await intelligentCaching.getCacheStatistics();
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Trigger cleanup
      await intelligentCaching.cleanupExpiredItems();
      
      const afterExpiry = await intelligentCaching.getCacheStatistics();
      
      expect(afterExpiry.totalItems).toBeLessThan(beforeExpiry.totalItems);
      expect(afterExpiry.expiredItems).toBeGreaterThan(0);
      
      console.log(`Cleanup: ${beforeExpiry.totalItems} -> ${afterExpiry.totalItems} items`);
      console.log(`Expired items cleaned: ${afterExpiry.expiredItems}`);
    });
  });

  describe('Cache Prefetching Performance', () => {
    test('should demonstrate prefetching benefits', async () => {
      const frequentSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      const requestsPerSymbol = 20;
      
      // Simulate frequent access pattern
      for (let round = 0; round < 3; round++) {
        for (const symbol of frequentSymbols) {
          for (let i = 0; i < requestsPerSymbol; i++) {
            const data = generateMarketData(symbol, 1)[0];
            await intelligentCaching.cacheMarketData(symbol, data, 300);
            await intelligentCaching.getCachedData(symbol, 300);
          }
        }
      }
      
      // Trigger prefetching
      const prefetchStart = Date.now();
      await intelligentCaching.prefetchFrequentData();
      const prefetchDuration = Date.now() - prefetchStart;
      
      // Test access speed after prefetching
      const accessStart = Date.now();
      const accessPromises = frequentSymbols.map(symbol =>
        intelligentCaching.getCachedData(symbol, 300)
      );
      await Promise.all(accessPromises);
      const accessDuration = Date.now() - accessStart;
      
      const stats = await intelligentCaching.getCacheStatistics();
      
      expect(prefetchDuration).toBeLessThan(5000); // Prefetching should be fast
      expect(accessDuration).toBeLessThan(100); // Access should be very fast
      expect(stats.prefetchedItems).toBeGreaterThan(0);
      
      console.log(`Prefetching: ${prefetchDuration}ms, Access after prefetch: ${accessDuration}ms`);
      console.log(`Prefetched items: ${stats.prefetchedItems}`);
    });

    test('should handle intelligent prefetching based on access patterns', async () => {
      const symbols = Array.from({ length: 50 }, (_, i) => `PATTERN${i.toString().padStart(2, '0')}`);
      
      // Create access pattern - some symbols accessed more frequently
      const accessCounts = new Map<string, number>();
      
      for (let round = 0; round < 10; round++) {
        for (let i = 0; i < symbols.length; i++) {
          const symbol = symbols[i];
          const accessFrequency = i < 10 ? 5 : (i < 25 ? 2 : 1); // Top 10 accessed 5x, next 15 accessed 2x, rest 1x
          
          for (let j = 0; j < accessFrequency; j++) {
            const data = generateMarketData(symbol, 1)[0];
            await intelligentCaching.cacheMarketData(symbol, data, 300);
            await intelligentCaching.getCachedData(symbol, 300);
            
            accessCounts.set(symbol, (accessCounts.get(symbol) || 0) + 1);
          }
        }
      }
      
      // Trigger intelligent prefetching
      await intelligentCaching.prefetchFrequentData();
      
      const stats = await intelligentCaching.getCacheStatistics();
      
      expect(stats.prefetchedItems).toBeGreaterThan(5); // Should prefetch frequently accessed items
      expect(stats.prefetchedItems).toBeLessThan(20); // Should not prefetch everything
      
      console.log(`Intelligent prefetching: ${stats.prefetchedItems} items prefetched`);
    });
  });

  describe('Cache Invalidation Performance', () => {
    test('should handle selective cache invalidation efficiently', async () => {
      const symbols = Array.from({ length: 1000 }, (_, i) => `INV${i.toString().padStart(4, '0')}`);
      
      // Populate cache
      for (const symbol of symbols) {
        const data = generateMarketData(symbol, 1)[0];
        await intelligentCaching.cacheMarketData(symbol, data, 300);
      }
      
      const beforeInvalidation = await intelligentCaching.getCacheStatistics();
      
      // Invalidate subset of cache
      const symbolsToInvalidate = symbols.slice(0, 100); // First 100 symbols
      
      const invalidationStart = Date.now();
      const invalidationPromises = symbolsToInvalidate.map(symbol =>
        intelligentCaching.invalidateCache(symbol, 'data_update')
      );
      await Promise.all(invalidationPromises);
      const invalidationDuration = Date.now() - invalidationStart;
      
      const afterInvalidation = await intelligentCaching.getCacheStatistics();
      
      expect(invalidationDuration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(afterInvalidation.totalItems).toBeLessThan(beforeInvalidation.totalItems);
      
      console.log(`Selective invalidation: ${invalidationDuration}ms for ${symbolsToInvalidate.length} items`);
      console.log(`Cache items: ${beforeInvalidation.totalItems} -> ${afterInvalidation.totalItems}`);
    });

    test('should handle pattern-based cache invalidation', async () => {
      const sectors = ['TECH', 'FINANCE', 'HEALTHCARE', 'ENERGY'];
      const symbolsPerSector = 50;
      
      // Populate cache with sector-based symbols
      for (const sector of sectors) {
        for (let i = 0; i < symbolsPerSector; i++) {
          const symbol = `${sector}_${i.toString().padStart(2, '0')}`;
          const data = generateMarketData(symbol, 1)[0];
          await intelligentCaching.cacheMarketData(symbol, data, 300);
        }
      }
      
      const beforeInvalidation = await intelligentCaching.getCacheStatistics();
      
      // Invalidate entire sector
      const sectorToInvalidate = 'TECH';
      const invalidationStart = Date.now();
      await intelligentCaching.invalidateByPattern(`${sectorToInvalidate}_*`);
      const invalidationDuration = Date.now() - invalidationStart;
      
      const afterInvalidation = await intelligentCaching.getCacheStatistics();
      
      expect(invalidationDuration).toBeLessThan(1000); // Should complete within 1 second
      expect(afterInvalidation.totalItems).toBe(beforeInvalidation.totalItems - symbolsPerSector);
      
      console.log(`Pattern invalidation: ${invalidationDuration}ms for pattern ${sectorToInvalidate}_*`);
      console.log(`Invalidated ${symbolsPerSector} items`);
    });
  });

  describe('Concurrent Access Performance', () => {
    test('should handle concurrent read/write operations safely', async () => {
      const symbols = Array.from({ length: 100 }, (_, i) => `CONCURRENT${i.toString().padStart(3, '0')}`);
      const operationsPerSymbol = 20;
      
      const startTime = Date.now();
      
      const allOperations = [];
      
      for (const symbol of symbols) {
        for (let i = 0; i < operationsPerSymbol; i++) {
          if (Math.random() < 0.3) {
            // Write operation (30% of operations)
            const data = generateMarketData(symbol, 1)[0];
            allOperations.push(intelligentCaching.cacheMarketData(symbol, data, 300));
          } else if (Math.random() < 0.6) {
            // Read operation (40% of operations)
            allOperations.push(intelligentCaching.getCachedData(symbol, 300));
          } else {
            // Invalidation operation (30% of operations)
            allOperations.push(intelligentCaching.invalidateCache(symbol, 'concurrent_test'));
          }
        }
      }
      
      // Execute all operations concurrently
      const results = await Promise.allSettled(allOperations);
      const duration = Date.now() - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const successRate = (successful / results.length) * 100;
      const operationsPerSecond = (results.length / duration) * 1000;
      
      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
      expect(operationsPerSecond).toBeGreaterThan(50); // At least 50 operations per second
      
      console.log(`Concurrent operations: ${duration}ms, ${operationsPerSecond.toFixed(1)} ops/sec`);
      console.log(`Success rate: ${successRate.toFixed(1)}% (${successful}/${results.length})`);
    });

    test('should maintain data consistency under concurrent access', async () => {
      const symbol = 'CONSISTENCY_TEST';
      const concurrentWrites = 50;
      const concurrentReads = 100;
      
      // Concurrent writes with different data
      const writePromises = Array.from({ length: concurrentWrites }, (_, i) => {
        const data = generateMarketData(symbol, 1)[0];
        data.close = 100 + i; // Unique close price for each write
        return intelligentCaching.cacheMarketData(`${symbol}_${i}`, data, 300);
      });
      
      // Concurrent reads
      const readPromises = Array.from({ length: concurrentReads }, (_, i) =>
        intelligentCaching.getCachedData(`${symbol}_${i % concurrentWrites}`, 300)
      );
      
      const startTime = Date.now();
      const [writeResults, readResults] = await Promise.all([
        Promise.allSettled(writePromises),
        Promise.allSettled(readPromises)
      ]);
      const duration = Date.now() - startTime;
      
      const successfulWrites = writeResults.filter(r => r.status === 'fulfilled').length;
      const successfulReads = readResults.filter(r => r.status === 'fulfilled').length;
      
      expect(successfulWrites).toBe(concurrentWrites);
      expect(successfulReads).toBeGreaterThan(concurrentReads * 0.8); // At least 80% successful reads
      
      console.log(`Consistency test: ${duration}ms`);
      console.log(`Writes: ${successfulWrites}/${concurrentWrites}, Reads: ${successfulReads}/${concurrentReads}`);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet performance benchmarks for different cache sizes', async () => {
      const benchmarks = [
        { items: 100, maxWriteTime: 2000, maxReadTime: 500, description: '100 items' },
        { items: 1000, maxWriteTime: 10000, maxReadTime: 2000, description: '1K items' },
        { items: 5000, maxWriteTime: 30000, maxReadTime: 5000, description: '5K items' },
        { items: 10000, maxWriteTime: 60000, maxReadTime: 10000, description: '10K items' }
      ];

      for (const benchmark of benchmarks) {
        const symbols = Array.from({ length: benchmark.items }, (_, i) => 
          `BENCH${benchmark.items}_${i.toString().padStart(5, '0')}`
        );
        
        // Write benchmark
        const writeStart = Date.now();
        const writePromises = symbols.map(symbol => {
          const data = generateMarketData(symbol, 1)[0];
          return intelligentCaching.cacheMarketData(symbol, data, 300);
        });
        await Promise.all(writePromises);
        const writeDuration = Date.now() - writeStart;
        
        // Read benchmark
        const readStart = Date.now();
        const readPromises = symbols.map(symbol =>
          intelligentCaching.getCachedData(symbol, 300)
        );
        const readResults = await Promise.all(readPromises);
        const readDuration = Date.now() - readStart;
        
        const cacheHits = readResults.filter(r => r !== null).length;
        const hitRate = (cacheHits / symbols.length) * 100;
        
        expect(writeDuration).toBeLessThan(benchmark.maxWriteTime);
        expect(readDuration).toBeLessThan(benchmark.maxReadTime);
        expect(hitRate).toBeGreaterThan(95);
        
        console.log(`${benchmark.description}: Write ${writeDuration}ms (max ${benchmark.maxWriteTime}ms), Read ${readDuration}ms (max ${benchmark.maxReadTime}ms), Hit rate ${hitRate.toFixed(1)}%`);
      }
    });

    test('should demonstrate cache performance scaling', async () => {
      const sizes = [100, 500, 1000, 2000, 5000];
      const results: { size: number; writeTime: number; readTime: number; throughput: number }[] = [];

      for (const size of sizes) {
        const symbols = Array.from({ length: size }, (_, i) => `SCALE${size}_${i}`);
        
        // Write test
        const writeStart = Date.now();
        const writePromises = symbols.map(symbol => {
          const data = generateMarketData(symbol, 1)[0];
          return intelligentCaching.cacheMarketData(symbol, data, 300);
        });
        await Promise.all(writePromises);
        const writeTime = Date.now() - writeStart;
        
        // Read test
        const readStart = Date.now();
        const readPromises = symbols.map(symbol =>
          intelligentCaching.getCachedData(symbol, 300)
        );
        await Promise.all(readPromises);
        const readTime = Date.now() - readStart;
        
        const totalTime = writeTime + readTime;
        const throughput = (size * 2 / totalTime) * 1000; // operations per second
        
        results.push({ size, writeTime, readTime, throughput });
        
        console.log(`Size ${size}: Write ${writeTime}ms, Read ${readTime}ms, Throughput ${throughput.toFixed(1)} ops/sec`);
      }
      
      // Verify that performance scales reasonably
      const firstThroughput = results[0].throughput;
      const lastThroughput = results[results.length - 1].throughput;
      const scalingFactor = lastThroughput / firstThroughput;
      
      expect(scalingFactor).toBeGreaterThan(0.2); // Should not degrade by more than 80%
    });
  });
});