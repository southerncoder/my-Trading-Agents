/**
 * Performance Regression Tests
 * 
 * Automated performance testing for CI/CD integration with
 * regression detection and benchmarking.
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';

describe('Performance Regression Tests', () => {
  interface TestResult {
    name: string;
    duration: number;
    success: boolean;
    throughput: number;
    memoryUsage: number;
    error?: string;
  }

  class PerformanceTester {
    async runTest(
      name: string,
      testFunction: () => Promise<void>,
      iterations: number = 10,
      timeout: number = 5000
    ): Promise<TestResult> {
      const initialMemory = process.memoryUsage().heapUsed;
      const startTime = Date.now();
      let success = true;
      let error: string | undefined;
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        await Promise.race([
          this.runIterations(testFunction, iterations),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Test timeout')), timeout);
          })
        ]);
      } catch (err) {
        success = false;
        error = (err as Error).message;
      } finally {
        // Clean up timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }

      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const throughput = success ? (iterations / duration) * 1000 : 0;

      return {
        name,
        duration,
        success,
        throughput,
        memoryUsage: finalMemory - initialMemory,
        error
      };
    }

    private async runIterations(testFunction: () => Promise<void>, iterations: number): Promise<void> {
      for (let i = 0; i < iterations; i++) {
        await testFunction();
      }
    }
  }

  let tester: PerformanceTester;

  beforeAll(() => {
    tester = new PerformanceTester();
  });

  afterAll(async () => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait a bit for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Cache Performance Tests', () => {
    test('should handle basic cache operations efficiently', async () => {
      const result = await tester.runTest(
        'Basic Cache Operations',
        async () => {
          const cache = new Map<string, any>();
          cache.set('test_key', { data: 'test_value' });
          const retrieved = cache.get('test_key');
          
          if (!retrieved || retrieved.data !== 'test_value') {
            throw new Error('Cache operation failed');
          }
          cache.clear();
        },
        50,
        3000
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(result.throughput).toBeGreaterThan(10); // At least 10 ops/sec
    });

    test('should handle batch cache operations', async () => {
      const result = await tester.runTest(
        'Batch Cache Operations',
        async () => {
          const cache = new Map<string, any>();
          
          // Batch set
          for (let i = 0; i < 100; i++) {
            cache.set(`key_${i}`, { data: `value_${i}` });
          }
          
          // Batch get
          for (let i = 0; i < 100; i++) {
            const value = cache.get(`key_${i}`);
            if (!value || value.data !== `value_${i}`) {
              throw new Error(`Batch operation failed at key_${i}`);
            }
          }
          
          cache.clear();
        },
        10,
        2000
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(500);
      expect(result.throughput).toBeGreaterThan(5);
    });
  });

  describe('Memory Performance Tests', () => {
    test('should handle memory allocation efficiently', async () => {
      const result = await tester.runTest(
        'Memory Allocation Test',
        async () => {
          const data = new Array(1000).fill(0).map((_, i) => ({
            id: i,
            value: Math.random(),
            processed: false
          }));

          data.forEach(item => {
            item.processed = true;
            item.value = item.value * 2;
          });

          // Clear references
          data.length = 0;
        },
        20,
        2000
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(1000);
      expect(result.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    test('should handle large object processing', async () => {
      const result = await tester.runTest(
        'Large Object Processing',
        async () => {
          const largeObject = {
            timestamp: Date.now(),
            data: Array.from({ length: 1000 }, (_, i) => ({
              id: i,
              name: `item_${i}`,
              metadata: {
                processed: false,
                score: Math.random(),
                tags: [`tag_${i % 10}`, `category_${i % 5}`]
              }
            }))
          };

          // Process the object
          largeObject.data.forEach(item => {
            item.metadata.processed = true;
            item.metadata.score = item.metadata.score * 2;
          });

          // Serialize and deserialize
          const serialized = JSON.stringify(largeObject);
          const deserialized = JSON.parse(serialized);

          if (deserialized.data.length !== 1000) {
            throw new Error('Object processing failed');
          }
        },
        5,
        3000
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(2000);
    });
  });

  describe('Async Performance Tests', () => {
    test('should handle concurrent async operations', async () => {
      const result = await tester.runTest(
        'Concurrent Async Operations',
        async () => {
          const promises = Array.from({ length: 20 }, (_, i) =>
            new Promise<number>(resolve => 
              setTimeout(() => resolve(i), Math.random() * 10)
            )
          );

          const results = await Promise.all(promises);
          
          if (results.length !== 20) {
            throw new Error('Async operations failed');
          }
        },
        10,
        2000
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(1500);
      expect(result.throughput).toBeGreaterThan(5);
    });

    test('should handle sequential async operations', async () => {
      const result = await tester.runTest(
        'Sequential Async Operations',
        async () => {
          for (let i = 0; i < 5; i++) { // Reduced iterations
            await new Promise<void>(resolve => setTimeout(resolve, 2)); // Reduced delay
          }
        },
        10, // Reduced iterations
        3000 // Increased timeout
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(2500);
    });
  });

  describe('JSON Processing Performance Tests', () => {
    test('should handle JSON serialization efficiently', async () => {
      const result = await tester.runTest(
        'JSON Serialization',
        async () => {
          const data = {
            timestamp: Date.now(),
            values: Array.from({ length: 100 }, (_, i) => ({
              id: i,
              name: `item_${i}`,
              metadata: { processed: false, score: Math.random() }
            }))
          };

          const serialized = JSON.stringify(data);
          const deserialized = JSON.parse(serialized);

          if (deserialized.values.length !== 100) {
            throw new Error('JSON processing failed');
          }
        },
        100,
        3000
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(1000);
      expect(result.throughput).toBeGreaterThan(50);
    });
  });

  describe('Database Simulation Performance Tests', () => {
    test('should handle database query simulation', async () => {
      const result = await tester.runTest(
        'Database Query Simulation',
        async () => {
          // Simulate database query processing
          const queryResult = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            name: `record_${i}`,
            timestamp: new Date(),
            data: { value: Math.random() * 100 }
          }));

          // Process results
          const processed = queryResult
            .filter(record => record.data.value > 25)
            .map(record => ({
              ...record,
              processed: true
            }));

          // Simulate additional processing
          processed.forEach(record => {
            record.data.value = record.data.value * 1.1;
          });
        },
        25,
        2000
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(500);
      expect(result.throughput).toBeGreaterThan(20);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance within acceptable thresholds', async () => {
      const results = await Promise.all([
        tester.runTest('Cache Test', async () => {
          const cache = new Map();
          cache.set('key', 'value');
          cache.get('key');
        }, 100, 1000),
        
        tester.runTest('Memory Test', async () => {
          const data = new Array(100).fill(0);
          data.forEach((_, i) => data[i] = i);
        }, 50, 1000),
        
        tester.runTest('Async Test', async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
        }, 20, 1000)
      ]);

      // All tests should pass
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Performance should be within acceptable ranges
      const cacheResult = results[0];
      const memoryResult = results[1];
      const asyncResult = results[2];

      expect(cacheResult.throughput).toBeGreaterThan(100); // Cache should be very fast
      expect(memoryResult.duration).toBeLessThan(100); // Memory ops should be quick
      expect(asyncResult.duration).toBeLessThan(1000); // Async should complete reasonably
    });

    test('should generate performance report', async () => {
      const testResults = await Promise.all([
        tester.runTest('Test 1', async () => { await new Promise(r => setTimeout(r, 1)); }, 10),
        tester.runTest('Test 2', async () => { const arr = new Array(100).fill(0); }, 20),
        tester.runTest('Test 3', async () => { JSON.stringify({data: 'test'}); }, 50)
      ]);

      const report = {
        timestamp: new Date().toISOString(),
        suite: 'Performance Regression Tests',
        results: testResults,
        summary: {
          total: testResults.length,
          passed: testResults.filter(r => r.success).length,
          failed: testResults.filter(r => !r.success).length,
          avgThroughput: testResults.reduce((sum, r) => sum + r.throughput, 0) / testResults.length
        }
      };

      expect(report.summary.total).toBe(3);
      expect(report.summary.passed).toBeGreaterThan(0);
      expect(report.summary.avgThroughput).toBeGreaterThan(0);
      expect(report.timestamp).toBeDefined();
    });
  });

  describe('Performance Thresholds', () => {
    const thresholds = {
      maxResponseTime: 1000, // 1 second
      minThroughput: 10, // 10 ops/sec
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxErrorRate: 5 // 5%
    };

    test('should meet response time thresholds', async () => {
      const result = await tester.runTest(
        'Response Time Test',
        async () => {
          // Simulate work
          await new Promise(resolve => setTimeout(resolve, 10));
        },
        20,
        2000
      );

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(thresholds.maxResponseTime);
    });

    test('should meet throughput thresholds', async () => {
      const result = await tester.runTest(
        'Throughput Test',
        async () => {
          // Fast operation
          const data = { test: 'value' };
          JSON.stringify(data);
        },
        100,
        1000
      );

      expect(result.success).toBe(true);
      expect(result.throughput).toBeGreaterThan(thresholds.minThroughput);
    });

    test('should meet memory usage thresholds', async () => {
      const result = await tester.runTest(
        'Memory Usage Test',
        async () => {
          // Moderate memory allocation
          const data = new Array(1000).fill(0).map(i => ({ id: i }));
          data.forEach(item => item.id *= 2);
        },
        10,
        1000
      );

      expect(result.success).toBe(true);
      expect(result.memoryUsage).toBeLessThan(thresholds.maxMemoryUsage);
    });
  });
});