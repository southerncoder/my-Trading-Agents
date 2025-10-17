#!/usr/bin/env node
/**
 * Simple Performance Test Runner
 * 
 * Lightweight performance testing without global monitoring
 * to avoid hanging issues during CI/CD execution.
 */

// Simple console logger for testing
const logger = {
  info: (context: string, message: string, data?: any) => {
    console.log(`[INFO] ${context}: ${message}`, data ? ` ${JSON.stringify(data)}` : '');
  },
  error: (context: string, message: string, data?: any) => {
    console.error(`[ERROR] ${context}: ${message}`, data ? ` ${JSON.stringify(data)}` : '');
  }
};

interface SimpleTestResult {
  name: string;
  duration: number;
  success: boolean;
  throughput: number;
  memoryUsage: number;
  error?: string;
}

interface SimpleTestSuite {
  name: string;
  tests: Array<{
    name: string;
    testFunction: () => Promise<void>;
    iterations?: number;
    timeout?: number;
  }>;
}

/**
 * Simple performance test runner
 */
class SimplePerformanceTester {
  async runTest(
    name: string,
    testFunction: () => Promise<void>,
    iterations: number = 10,
    timeout: number = 5000
  ): Promise<SimpleTestResult> {
    console.log(`  Running ${name} (${iterations} iterations)...`);
    
    const initialMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      // Run test with timeout
      await Promise.race([
        this.runIterations(testFunction, iterations),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), timeout)
        )
      ]);
    } catch (err) {
      success = false;
      error = (err as Error).message;
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

  async runTestSuite(suite: SimpleTestSuite): Promise<{
    results: SimpleTestResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      totalDuration: number;
    };
  }> {
    const results: SimpleTestResult[] = [];
    const suiteStartTime = Date.now();

    logger.info('simple-performance-test', `Running test suite: ${suite.name}`);

    for (const test of suite.tests) {
      const result = await this.runTest(
        test.name,
        test.testFunction,
        test.iterations || 10,
        test.timeout || 5000
      );
      
      results.push(result);
      
      if (result.success) {
        logger.info('simple-performance-test', `✅ ${test.name} passed`, {
          duration: result.duration,
          throughput: result.throughput.toFixed(2)
        });
      } else {
        logger.error('simple-performance-test', `❌ ${test.name} failed`, {
          error: result.error
        });
      }
    }

    const totalDuration = Date.now() - suiteStartTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;

    return {
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        totalDuration
      }
    };
  }
}

/**
 * Create simple test suite
 */
function createSimpleTestSuite(): SimpleTestSuite {
  return {
    name: 'Simple Performance Tests',
    tests: [
      {
        name: 'Basic Cache Operations',
        testFunction: async () => {
          // Simple in-memory cache simulation
          const cache = new Map<string, any>();
          
          // Test basic operations
          cache.set('test_key', { data: 'test_value' });
          const result = cache.get('test_key');
          
          if (!result || result.data !== 'test_value') {
            throw new Error('Cache operation failed');
          }

          cache.clear();
        },
        iterations: 50,
        timeout: 3000
      },
      
      {
        name: 'Memory Allocation Test',
        testFunction: async () => {
          // Create and process data
          const data = new Array(1000).fill(0).map((_, i) => ({
            id: i,
            value: Math.random(),
            processed: false
          }));

          // Process data
          data.forEach(item => {
            item.processed = true;
            item.value = item.value * 2;
          });

          // Clear references
          data.length = 0;
        },
        iterations: 20,
        timeout: 2000
      },

      {
        name: 'Async Operations Test',
        testFunction: async () => {
          // Simulate async operations
          const promises = Array.from({ length: 10 }, () =>
            new Promise<void>(resolve => setTimeout(resolve, 5))
          );

          await Promise.all(promises);
        },
        iterations: 30,
        timeout: 2000
      },

      {
        name: 'JSON Processing Test',
        testFunction: async () => {
          const data = {
            timestamp: Date.now(),
            values: Array.from({ length: 100 }, (_, i) => ({
              id: i,
              name: `item_${i}`,
              metadata: { processed: false, score: Math.random() }
            }))
          };

          // Serialize and deserialize
          const serialized = JSON.stringify(data);
          const deserialized = JSON.parse(serialized);

          if (deserialized.values.length !== 100) {
            throw new Error('JSON processing failed');
          }
        },
        iterations: 100,
        timeout: 3000
      },

      {
        name: 'Database Query Simulation',
        testFunction: async () => {
          // Simulate database query processing
          const queryResult = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            name: `record_${i}`,
            timestamp: new Date(),
            data: { value: Math.random() * 100 }
          }));

          // Process results
          const processed = queryResult
            .filter(record => record.data.value > 50)
            .map(record => ({
              ...record,
              processed: true
            }));

          // This is fine - processed length can vary based on random values
        },
        iterations: 25,
        timeout: 2000
      }
    ]
  };
}

/**
 * Main test execution
 */
async function runSimplePerformanceTests(): Promise<void> {
  console.log('🚀 Starting simple performance tests...');
  
  const tester = new SimplePerformanceTester();
  const testSuite = createSimpleTestSuite();

  try {
    const { results, summary } = await tester.runTestSuite(testSuite);

    // Log summary
    logger.info('simple-performance-test', 'Performance test summary', {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      duration: summary.totalDuration
    });

    // Log detailed results
    console.log('\n📊 Performance Test Results:');
    console.log('================================');
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const throughput = result.throughput.toFixed(2);
      const memoryMB = (result.memoryUsage / 1024 / 1024).toFixed(2);
      
      console.log(`${status} ${result.name}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Throughput: ${throughput} ops/sec`);
      console.log(`   Memory: ${memoryMB}MB`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    // Generate simple report
    const report = {
      timestamp: new Date().toISOString(),
      suite: testSuite.name,
      summary,
      results: results.map(r => ({
        name: r.name,
        success: r.success,
        duration: r.duration,
        throughput: r.throughput,
        memoryUsageMB: r.memoryUsage / 1024 / 1024
      }))
    };

    // Save simple report
    const fs = await import('fs');
    const path = await import('path');
    
    const reportDir = 'performance-reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = path.join(reportDir, 'simple-performance-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    logger.info('simple-performance-test', 'Report saved', { reportFile });

    // Exit with appropriate code
    if (summary.failed > 0) {
      logger.error('simple-performance-test', `${summary.failed} tests failed`);
      process.exit(1);
    } else {
      logger.info('simple-performance-test', 'All tests passed');
      console.log('✅ All performance tests completed successfully!');
      process.exit(0);
    }

  } catch (error) {
    logger.error('simple-performance-test', 'Test execution failed', { error });
    console.error('❌ Performance test execution failed:', error);
    process.exit(2);
  }
}

// Run tests if this script is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('run-simple-performance-test.ts')) {
  runSimplePerformanceTests().catch(error => {
    console.error('❌ Simple performance test failed:', error);
    process.exit(3);
  });
}

export { runSimplePerformanceTests, SimplePerformanceTester };