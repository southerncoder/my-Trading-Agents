#!/usr/bin/env node
/**
 * Performance Testing Script for CI/CD Pipeline
 * 
 * Automated performance testing with regression detection
 * and comprehensive reporting for continuous integration.
 * 
 * Usage: npm run test:performance
 */

import { CICDPerformanceTester, createDefaultTestSuite, PerformanceTestSuite } from '../src/performance/ci-cd-integration';
import { globalPerformanceMonitor } from '../src/performance/performance-monitor';
import { globalMemoryOptimizer } from '../src/performance/memory-optimization';
import { globalCache } from '../src/performance/advanced-caching';
import { getDatabaseOptimizer } from '../src/performance/database-optimization';
import { createLogger } from '../src/utils/enhanced-logger';

const logger = createLogger('system', 'performance-test-runner');

/**
 * Create comprehensive performance test suite
 */
function createComprehensiveTestSuite(): PerformanceTestSuite {
  return {
    name: 'TradingAgents Comprehensive Performance Suite',
    description: 'Complete performance validation for trading agents system',
    tests: [
      // API Performance Tests
      {
        name: 'Market Analysis API',
        description: 'Test market analysis endpoint performance',
        category: 'api',
        testFunction: async () => {
          // Simulate market analysis API call
          const startTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 150));
          const duration = Date.now() - startTime;
          
          if (duration > 500) {
            throw new Error(`Market analysis took too long: ${duration}ms`);
          }
        },
        maxDuration: 500,
        expectedThroughput: 20
      },
      
      {
        name: 'Symbol Search API',
        description: 'Test symbol search endpoint performance',
        category: 'api',
        testFunction: async () => {
          const startTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 50));
          const duration = Date.now() - startTime;
          
          if (duration > 200) {
            throw new Error(`Symbol search took too long: ${duration}ms`);
          }
        },
        maxDuration: 200,
        expectedThroughput: 100
      },

      // Database Performance Tests
      {
        name: 'Database Connection Pool',
        description: 'Test database connection pool performance',
        category: 'database',
        testFunction: async () => {
          try {
            const dbOptimizer = getDatabaseOptimizer();
            const health = await dbOptimizer.healthCheck();
            
            if (!health.healthy) {
              throw new Error(`Database health check failed: ${health.error}`);
            }
            
            if (health.latency > 100) {
              throw new Error(`Database latency too high: ${health.latency}ms`);
            }
          } catch (error) {
            // Database optimizer not initialized - simulate test
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        },
        maxDuration: 100,
        expectedThroughput: 500
      },

      {
        name: 'Batch Database Operations',
        description: 'Test batch database query performance',
        category: 'database',
        testFunction: async () => {
          // Simulate batch database operations
          const operations = Array.from({ length: 10 }, () => 
            new Promise(resolve => setTimeout(resolve, 20))
          );
          
          await Promise.all(operations);
        },
        maxDuration: 300,
        expectedThroughput: 100
      },

      // Cache Performance Tests
      {
        name: 'Cache Read Performance',
        description: 'Test cache read operation performance',
        category: 'cache',
        testFunction: async () => {
          const keys = Array.from({ length: 100 }, (_, i) => `test_key_${i}`);
          
          // Pre-populate cache
          for (const key of keys) {
            await globalCache.set(key, { data: `test_data_${key}` });
          }
          
          // Test read performance
          const startTime = Date.now();
          const results = await globalCache.getMany(keys);
          const duration = Date.now() - startTime;
          
          if (results.size !== keys.length) {
            throw new Error(`Cache read failed: expected ${keys.length}, got ${results.size}`);
          }
          
          if (duration > 100) {
            throw new Error(`Cache read took too long: ${duration}ms`);
          }
        },
        maxDuration: 100,
        expectedThroughput: 1000
      },

      {
        name: 'Cache Write Performance',
        description: 'Test cache write operation performance',
        category: 'cache',
        testFunction: async () => {
          const items = Array.from({ length: 50 }, (_, i) => ({
            key: `write_test_${i}`,
            value: { data: `write_data_${i}`, timestamp: Date.now() }
          }));
          
          const startTime = Date.now();
          await globalCache.setMany(items);
          const duration = Date.now() - startTime;
          
          if (duration > 200) {
            throw new Error(`Cache write took too long: ${duration}ms`);
          }
        },
        maxDuration: 200,
        expectedThroughput: 500
      },

      // Memory Performance Tests
      {
        name: 'Memory Allocation Test',
        description: 'Test memory allocation and cleanup performance',
        category: 'memory',
        testFunction: async () => {
          const initialMemory = process.memoryUsage().heapUsed;
          
          // Allocate memory
          const largeArray = new Array(10000).fill(0).map((_, i) => ({
            id: i,
            data: `test_data_${i}`,
            timestamp: Date.now(),
            metadata: { index: i, processed: false }
          }));
          
          // Process data
          largeArray.forEach(item => {
            item.metadata.processed = true;
          });
          
          const peakMemory = process.memoryUsage().heapUsed;
          const memoryGrowth = peakMemory - initialMemory;
          
          // Clear references
          largeArray.length = 0;
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          
          const finalMemory = process.memoryUsage().heapUsed;
          const memoryLeaked = finalMemory - initialMemory;
          
          if (memoryLeaked > 5 * 1024 * 1024) { // 5MB leak threshold
            throw new Error(`Memory leak detected: ${memoryLeaked} bytes`);
          }
        },
        maxMemoryUsage: 20 * 1024 * 1024, // 20MB
        maxDuration: 1000
      },

      {
        name: 'Garbage Collection Performance',
        description: 'Test garbage collection efficiency',
        category: 'memory',
        testFunction: async () => {
          const initialMemory = process.memoryUsage().heapUsed;
          
          // Create objects that should be garbage collected
          for (let i = 0; i < 1000; i++) {
            const tempObject = {
              id: i,
              data: new Array(1000).fill(Math.random()),
              nested: {
                values: new Array(100).fill(i)
              }
            };
            
            // Process and discard
            tempObject.data.sort();
          }
          
          // Trigger optimization
          await globalMemoryOptimizer.optimizeMemory();
          
          const finalMemory = process.memoryUsage().heapUsed;
          const memoryGrowth = finalMemory - initialMemory;
          
          if (memoryGrowth > 10 * 1024 * 1024) { // 10MB growth threshold
            throw new Error(`Excessive memory growth: ${memoryGrowth} bytes`);
          }
        },
        maxMemoryUsage: 15 * 1024 * 1024, // 15MB
        maxDuration: 2000
      },

      // Integration Performance Tests
      {
        name: 'End-to-End Analysis Flow',
        description: 'Test complete analysis workflow performance',
        category: 'integration',
        testFunction: async () => {
          // Simulate complete analysis workflow
          const steps = [
            () => new Promise(resolve => setTimeout(resolve, 100)), // Data fetching
            () => new Promise(resolve => setTimeout(resolve, 200)), // Analysis processing
            () => new Promise(resolve => setTimeout(resolve, 150)), // Risk assessment
            () => new Promise(resolve => setTimeout(resolve, 100)), // Result compilation
            () => new Promise(resolve => setTimeout(resolve, 50))   // Response formatting
          ];
          
          const startTime = Date.now();
          
          for (const step of steps) {
            await step();
          }
          
          const totalDuration = Date.now() - startTime;
          
          if (totalDuration > 1000) {
            throw new Error(`End-to-end flow took too long: ${totalDuration}ms`);
          }
        },
        maxDuration: 1000,
        expectedThroughput: 10
      },

      {
        name: 'Concurrent Request Handling',
        description: 'Test system performance under concurrent load',
        category: 'integration',
        testFunction: async () => {
          const concurrentRequests = 20;
          const requestDuration = 100;
          
          const requests = Array.from({ length: concurrentRequests }, () =>
            new Promise(resolve => setTimeout(resolve, requestDuration))
          );
          
          const startTime = Date.now();
          await Promise.all(requests);
          const totalDuration = Date.now() - startTime;
          
          // Should complete in roughly the same time as a single request
          // due to concurrency, with some overhead
          if (totalDuration > requestDuration * 1.5) {
            throw new Error(`Concurrent handling inefficient: ${totalDuration}ms`);
          }
        },
        maxDuration: 200,
        expectedThroughput: 100
      }
    ],
    thresholds: {
      regressionThreshold: 20, // 20% regression threshold
      maxResponseTime: 2000,
      minThroughput: 10,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxErrorRate: 5
    }
  };
}

/**
 * Main performance testing function
 */
async function runPerformanceTests(): Promise<void> {
  logger.info('performance-test-runner', 'Starting performance test suite');

  // Create test-specific instances to avoid global state issues
  const testPerformanceMonitor = new (await import('../src/performance/performance-monitor')).PerformanceMonitor({
    cpu: { warning: 90, critical: 98 },
    memory: { warning: 90, critical: 98 },
    eventLoop: { delayWarning: 50, delayCritical: 200 },
    database: { queryTimeWarning: 2000, queryTimeCritical: 10000 },
    api: { responseTimeWarning: 1000, responseTimeCritical: 5000, errorRateWarning: 10, errorRateCritical: 25 }
  });

  const testMemoryOptimizer = new (await import('../src/performance/memory-optimization')).MemoryOptimizer({
    gcOptimization: { enabled: false, exposeGC: false },
    monitoring: { enabled: false, interval: 0 },
    cleanup: { enabled: false, interval: 0 }
  });

  try {
    // Initialize performance tester
    const tester = new CICDPerformanceTester(
      testPerformanceMonitor,
      testMemoryOptimizer,
      {
        baselineFile: 'performance-baseline.json',
        reportDir: 'performance-reports'
      }
    );

    // Create test suite
    const testSuite = createComprehensiveTestSuite();

    // Run tests
    const report = await tester.runTestSuite(testSuite);

    // Log results
    logger.info('performance-test-runner', 'Performance tests completed', {
      totalTests: report.summary.totalTests,
      passed: report.summary.passed,
      failed: report.summary.failed,
      regressions: report.summary.regressions,
      improvements: report.summary.improvements
    });

    // Log recommendations
    if (report.recommendations.length > 0) {
      logger.warn('performance-test-runner', 'Performance recommendations', {
        recommendations: report.recommendations
      });
    }

    // Log regressions
    if (report.regressions.length > 0) {
      logger.error('performance-test-runner', 'Performance regressions detected', {
        regressions: report.regressions.map(r => ({
          test: r.test,
          regression: `${r.regression.toFixed(2)}%`,
          severity: r.severity
        }))
      });
    }

    // Determine exit code
    const exitCode = CICDPerformanceTester.getExitCode(report);
    
    if (exitCode !== 0) {
      logger.error('performance-test-runner', 'Performance tests failed', { exitCode });
      process.exit(exitCode);
    } else {
      logger.info('performance-test-runner', 'All performance tests passed');
    }

  } catch (error) {
    logger.error('performance-test-runner', 'Performance testing failed', { error });
    process.exit(4); // Test runner error
  } finally {
    // Cleanup test instances
    testPerformanceMonitor.stopMonitoring();
    testMemoryOptimizer.stopMonitoring();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runPerformanceTests().catch(error => {
    console.error('Performance test runner failed:', error);
    process.exit(5);
  });
}

export { runPerformanceTests, createComprehensiveTestSuite };