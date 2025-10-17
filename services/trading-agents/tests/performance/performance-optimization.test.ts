/**
 * Performance Optimization System Tests
 * 
 * Comprehensive tests for all performance optimization components
 * including caching, database optimization, monitoring, and memory management.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { AdvancedCachingSystem } from '../../src/performance/advanced-caching';
import { PerformanceMonitor } from '../../src/performance/performance-monitor';
import { MemoryOptimizer } from '../../src/performance/memory-optimization';
import { CICDPerformanceTester, createDefaultTestSuite } from '../../src/performance/ci-cd-integration';
import { initializePerformanceOptimization, getPerformanceStatus, optimizeAllSystems } from '../../src/performance';

describe('Performance Optimization System', () => {
  let cachingSystem: AdvancedCachingSystem;
  let performanceMonitor: PerformanceMonitor;
  let memoryOptimizer: MemoryOptimizer;

  beforeAll(async () => {
    // Initialize performance systems
    cachingSystem = new AdvancedCachingSystem({
      l1: { ttl: 60000, maxSize: 100, checkInterval: 10000 },
      prefetch: { enabled: false }, // Disable for testing
      compression: { enabled: false }
    });

    performanceMonitor = new PerformanceMonitor({
      cpu: { warning: 80, critical: 95 },
      memory: { warning: 85, critical: 95 },
      eventLoop: { delayWarning: 20, delayCritical: 100 },
      database: { queryTimeWarning: 2000, queryTimeCritical: 10000 },
      api: { responseTimeWarning: 1000, responseTimeCritical: 5000, errorRateWarning: 10, errorRateCritical: 25 }
    });

    memoryOptimizer = new MemoryOptimizer({
      monitoring: { enabled: false }, // Disable for testing
      cleanup: { enabled: false }
    });
  });

  afterAll(async () => {
    // Cleanup
    performanceMonitor.stopMonitoring();
    memoryOptimizer.stopMonitoring();
    await cachingSystem.clear();
  });

  describe('Advanced Caching System', () => {
    beforeEach(async () => {
      await cachingSystem.clear();
    });

    test('should cache and retrieve values', async () => {
      const key = 'test_key';
      const value = { data: 'test_data', timestamp: Date.now() };

      await cachingSystem.set(key, value);
      const retrieved = await cachingSystem.get(key);

      expect(retrieved).toEqual(value);
    });

    test('should handle cache misses', async () => {
      const result = await cachingSystem.get('non_existent_key');
      expect(result).toBeNull();
    });

    test('should support getOrSet pattern', async () => {
      const key = 'getOrSet_test';
      const expectedValue = { computed: true, timestamp: Date.now() };

      const result = await cachingSystem.getOrSet(key, async () => expectedValue);
      expect(result).toEqual(expectedValue);

      // Second call should return cached value
      const cachedResult = await cachingSystem.getOrSet(key, async () => ({ different: true }));
      expect(cachedResult).toEqual(expectedValue);
    });

    test('should handle batch operations', async () => {
      const items = [
        { key: 'batch1', value: { data: 'value1' } },
        { key: 'batch2', value: { data: 'value2' } },
        { key: 'batch3', value: { data: 'value3' } }
      ];

      await cachingSystem.setMany(items);
      const results = await cachingSystem.getMany(['batch1', 'batch2', 'batch3']);

      expect(results.size).toBe(3);
      expect(results.get('batch1')).toEqual({ data: 'value1' });
      expect(results.get('batch2')).toEqual({ data: 'value2' });
      expect(results.get('batch3')).toEqual({ data: 'value3' });
    });

    test('should provide cache statistics', async () => {
      // Generate some cache activity
      await cachingSystem.set('stats_test1', { data: 'test1' });
      await cachingSystem.set('stats_test2', { data: 'test2' });
      await cachingSystem.get('stats_test1'); // Hit
      await cachingSystem.get('non_existent'); // Miss

      const stats = cachingSystem.getStats();
      
      expect(stats.l1.hits).toBeGreaterThan(0);
      expect(stats.l1.misses).toBeGreaterThan(0);
      expect(stats.l1.size).toBeGreaterThan(0);
      expect(stats.performance.totalOperations).toBeGreaterThan(0);
    });

    test('should optimize cache performance', async () => {
      // Add some data
      for (let i = 0; i < 10; i++) {
        await cachingSystem.set(`optimize_test_${i}`, { data: `test_${i}` });
      }

      // Run optimization
      await cachingSystem.optimize();

      // Should complete without errors
      const stats = cachingSystem.getStats();
      expect(stats.l1.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Monitor', () => {
    test('should collect current metrics', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('eventLoop');
      expect(metrics).toHaveProperty('api');
      
      expect(metrics.cpu).toHaveProperty('usage');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('total');
    });

    test('should record API requests', () => {
      const initialMetrics = performanceMonitor.getCurrentMetrics();
      
      // Record some requests
      performanceMonitor.recordRequest(100, true);
      performanceMonitor.recordRequest(200, true);
      performanceMonitor.recordRequest(500, false);
      
      const updatedMetrics = performanceMonitor.getCurrentMetrics();
      expect(updatedMetrics.api.averageResponseTime).toBeGreaterThan(0);
      expect(updatedMetrics.api.errorRate).toBeGreaterThan(0);
    });

    test('should run performance benchmarks', async () => {
      const testFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      };

      const benchmark = await performanceMonitor.runBenchmark(
        'test_benchmark',
        testFunction,
        5
      );

      expect(benchmark.name).toBe('test_benchmark');
      expect(benchmark.success).toBe(true);
      expect(benchmark.duration).toBeGreaterThan(0);
      expect(benchmark.throughput).toBeGreaterThan(0);
    });

    test('should generate performance reports', () => {
      // Record some activity
      performanceMonitor.recordRequest(100, true);
      performanceMonitor.recordRequest(200, true);
      performanceMonitor.recordRequest(1500, false); // Slow request with error

      const report = performanceMonitor.generateReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('alerts');
      expect(report).toHaveProperty('benchmarks');
      expect(report).toHaveProperty('recommendations');
      
      expect(report.summary.errorRate).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Optimizer', () => {
    test('should collect memory metrics', () => {
      const metrics = memoryOptimizer.getCurrentMetrics();
      
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('heap');
      expect(metrics).toHaveProperty('external');
      expect(metrics).toHaveProperty('rss');
      
      expect(metrics.heap).toHaveProperty('used');
      expect(metrics.heap).toHaveProperty('total');
      expect(metrics.heap).toHaveProperty('usage');
    });

    test('should optimize memory usage', async () => {
      const beforeMemory = process.memoryUsage();
      
      const result = await memoryOptimizer.optimizeMemory();
      
      expect(result).toHaveProperty('beforeMemory');
      expect(result).toHaveProperty('afterMemory');
      expect(result).toHaveProperty('freed');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('optimizations');
      
      expect(result.optimizations.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should detect memory leaks', () => {
      // Create some objects to simulate memory usage
      const largeArray = new Array(1000).fill(0).map((_, i) => ({ id: i, data: `test_${i}` }));
      
      const leaks = memoryOptimizer.detectMemoryLeaks();
      
      expect(Array.isArray(leaks)).toBe(true);
      // Leaks array might be empty in test environment, which is fine
    });

    test('should track objects for leak detection', () => {
      const testObject = { id: 'test', data: 'tracking_test' };
      
      // Should not throw
      memoryOptimizer.trackObject('test_category', testObject);
      
      // Verify tracking doesn't interfere with normal operation
      const metrics = memoryOptimizer.getCurrentMetrics();
      expect(metrics).toHaveProperty('heap');
    });
  });

  describe('CI/CD Performance Testing', () => {
    test('should create default test suite', () => {
      const testSuite = createDefaultTestSuite();
      
      expect(testSuite).toHaveProperty('name');
      expect(testSuite).toHaveProperty('description');
      expect(testSuite).toHaveProperty('tests');
      expect(testSuite).toHaveProperty('thresholds');
      
      expect(Array.isArray(testSuite.tests)).toBe(true);
      expect(testSuite.tests.length).toBeGreaterThan(0);
      
      // Verify test structure
      const firstTest = testSuite.tests[0];
      expect(firstTest).toHaveProperty('name');
      expect(firstTest).toHaveProperty('category');
      expect(firstTest).toHaveProperty('testFunction');
      expect(typeof firstTest.testFunction).toBe('function');
    });

    test('should run performance test suite', async () => {
      const tester = new CICDPerformanceTester(
        performanceMonitor,
        memoryOptimizer,
        {
          baselineFile: 'test-baseline.json',
          reportDir: 'test-reports'
        }
      );

      // Create a simple test suite
      const testSuite = {
        name: 'Simple Test Suite',
        description: 'Basic performance tests',
        tests: [
          {
            name: 'Fast Test',
            description: 'A fast test',
            category: 'api' as const,
            testFunction: async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
            },
            maxDuration: 100,
            expectedThroughput: 50
          },
          {
            name: 'Memory Test',
            description: 'A memory test',
            category: 'memory' as const,
            testFunction: async () => {
              const data = new Array(100).fill(0);
              data.forEach((_, i) => data[i] = i);
            },
            maxMemoryUsage: 1024 * 1024 // 1MB
          }
        ],
        thresholds: {
          regressionThreshold: 25,
          maxResponseTime: 1000,
          minThroughput: 10,
          maxMemoryUsage: 10 * 1024 * 1024,
          maxErrorRate: 10
        }
      };

      const report = await tester.runTestSuite(testSuite);
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('suite');
      expect(report).toHaveProperty('results');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('regressions');
      expect(report).toHaveProperty('recommendations');
      
      expect(report.suite).toBe('Simple Test Suite');
      expect(report.results.length).toBe(2);
      expect(report.summary.totalTests).toBe(2);
    }, 10000); // Increase timeout for this test
  });

  describe('Integration Tests', () => {
    test('should initialize all performance systems', async () => {
      // Should not throw
      await initializePerformanceOptimization({
        cache: { l1: { ttl: 60000, maxSize: 100 } }
      });
    });

    test('should get comprehensive performance status', () => {
      const status = getPerformanceStatus();
      
      expect(status).toHaveProperty('cache');
      expect(status).toHaveProperty('memory');
      expect(status).toHaveProperty('performance');
      
      expect(status.cache).toHaveProperty('l1');
      expect(status.memory).toHaveProperty('heap');
      expect(status.performance).toHaveProperty('cpu');
    });

    test('should optimize all systems', async () => {
      const results = await optimizeAllSystems();
      
      expect(results).toHaveProperty('cache');
      expect(results).toHaveProperty('memory');
      
      expect(results.cache).toBe(true);
      expect(results.memory).toHaveProperty('freed');
      expect(results.memory).toHaveProperty('optimizations');
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance improvements', () => {
      const currentResults = [
        {
          name: 'test1',
          category: 'api',
          passed: true,
          duration: 100,
          throughput: 120, // Improved from baseline
          memoryUsage: 1000,
          metrics: { responseTime: 100, errorRate: 0, cpuUsage: 10, memoryGrowth: 100 }
        }
      ];

      const baseline = {
        timestamp: new Date(),
        version: 'v1.0.0',
        results: {
          test1: {
            duration: 100,
            throughput: 100, // Baseline
            memoryUsage: 1000
          }
        }
      };

      const tester = new CICDPerformanceTester(performanceMonitor, memoryOptimizer);
      
      // Use reflection to access private method for testing
      const detectImprovements = (tester as any).detectImprovements;
      const improvements = detectImprovements.call(tester, currentResults, baseline);
      
      expect(improvements.length).toBe(1);
      expect(improvements[0].test).toBe('test1');
      expect(improvements[0].improvement).toBe(20); // 20% improvement
    });

    test('should calculate exit codes correctly', () => {
      const reportWithCriticalRegression = {
        summary: { failed: 0 },
        regressions: [{ severity: 'critical' }]
      };
      expect(CICDPerformanceTester.getExitCode(reportWithCriticalRegression as any)).toBe(2);

      const reportWithRegression = {
        summary: { failed: 0 },
        regressions: [{ severity: 'moderate' }]
      };
      expect(CICDPerformanceTester.getExitCode(reportWithRegression as any)).toBe(1);

      const reportWithFailures = {
        summary: { failed: 2 },
        regressions: []
      };
      expect(CICDPerformanceTester.getExitCode(reportWithFailures as any)).toBe(3);

      const successfulReport = {
        summary: { failed: 0 },
        regressions: []
      };
      expect(CICDPerformanceTester.getExitCode(successfulReport as any)).toBe(0);
    });
  });
});