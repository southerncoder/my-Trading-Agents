/**
 * Performance Benchmarking Utilities
 * 
 * Provides utilities for measuring and comparing performance across tests
 * Requirements: 7.1, 7.2, 7.3
 */

export interface BenchmarkResult {
  name: string;
  duration: number;
  throughput: number;
  memoryUsage: {
    initial: number;
    final: number;
    peak: number;
    increase: number;
  };
  operations: number;
  errors: number;
  successRate: number;
  metadata?: Record<string, any>;
}

export interface BenchmarkConfig {
  name: string;
  warmupRuns?: number;
  measurementRuns?: number;
  maxDuration?: number;
  memoryTracking?: boolean;
  errorThreshold?: number;
}

/**
 * Performance benchmark runner
 */
export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private memorySnapshots: number[] = [];

  /**
   * Run a benchmark test
   */
  async runBenchmark<T>(
    config: BenchmarkConfig,
    testFunction: () => Promise<T>
  ): Promise<BenchmarkResult> {
    const warmupRuns = config.warmupRuns || 0;
    const measurementRuns = config.measurementRuns || 1;
    
    // Warmup runs
    for (let i = 0; i < warmupRuns; i++) {
      try {
        await testFunction();
      } catch (error) {
        // Ignore warmup errors
      }
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = process.memoryUsage().heapUsed;
    let peakMemory = initialMemory;
    let totalDuration = 0;
    let totalOperations = 0;
    let totalErrors = 0;
    
    // Start memory tracking
    let memoryTracker: NodeJS.Timeout | undefined;
    if (config.memoryTracking) {
      memoryTracker = setInterval(() => {
        const currentMemory = process.memoryUsage().heapUsed;
        this.memorySnapshots.push(currentMemory);
        peakMemory = Math.max(peakMemory, currentMemory);
      }, 100);
    }
    
    // Measurement runs
    for (let i = 0; i < measurementRuns; i++) {
      const startTime = Date.now();
      
      try {
        const result = await testFunction();
        totalOperations += this.extractOperationCount(result);
      } catch (error) {
        totalErrors++;
      }
      
      const duration = Date.now() - startTime;
      totalDuration += duration;
      
      // Check max duration
      if (config.maxDuration && totalDuration > config.maxDuration) {
        break;
      }
    }
    
    // Stop memory tracking
    if (memoryTracker) {
      clearInterval(memoryTracker);
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const avgDuration = totalDuration / measurementRuns;
    const throughput = totalOperations > 0 ? (totalOperations / totalDuration) * 1000 : 0;
    const successRate = ((measurementRuns - totalErrors) / measurementRuns) * 100;
    
    const result: BenchmarkResult = {
      name: config.name,
      duration: avgDuration,
      throughput,
      memoryUsage: {
        initial: initialMemory,
        final: finalMemory,
        peak: peakMemory,
        increase: finalMemory - initialMemory
      },
      operations: totalOperations,
      errors: totalErrors,
      successRate
    };
    
    this.results.push(result);
    return result;
  }

  /**
   * Compare benchmark results
   */
  compareBenchmarks(baseline: BenchmarkResult, comparison: BenchmarkResult): {
    durationChange: number;
    throughputChange: number;
    memoryChange: number;
    successRateChange: number;
    summary: string;
  } {
    const durationChange = ((comparison.duration - baseline.duration) / baseline.duration) * 100;
    const throughputChange = baseline.throughput > 0 ? 
      ((comparison.throughput - baseline.throughput) / baseline.throughput) * 100 : 0;
    const memoryChange = baseline.memoryUsage.increase > 0 ? 
      ((comparison.memoryUsage.increase - baseline.memoryUsage.increase) / baseline.memoryUsage.increase) * 100 : 0;
    const successRateChange = comparison.successRate - baseline.successRate;
    
    let summary = `Performance comparison: ${baseline.name} vs ${comparison.name}\n`;
    summary += `Duration: ${durationChange > 0 ? '+' : ''}${durationChange.toFixed(1)}%\n`;
    summary += `Throughput: ${throughputChange > 0 ? '+' : ''}${throughputChange.toFixed(1)}%\n`;
    summary += `Memory: ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(1)}%\n`;
    summary += `Success Rate: ${successRateChange > 0 ? '+' : ''}${successRateChange.toFixed(1)}%`;
    
    return {
      durationChange,
      throughputChange,
      memoryChange,
      successRateChange,
      summary
    };
  }

  /**
   * Get all benchmark results
   */
  getAllResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Clear benchmark results
   */
  clearResults(): void {
    this.results = [];
    this.memorySnapshots = [];
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No benchmark results available.';
    }
    
    let report = 'Performance Benchmark Report\n';
    report += '================================\n\n';
    
    this.results.forEach((result, index) => {
      report += `${index + 1}. ${result.name}\n`;
      report += `   Duration: ${result.duration.toFixed(2)}ms\n`;
      report += `   Throughput: ${result.throughput.toFixed(2)} ops/sec\n`;
      report += `   Memory Increase: ${(result.memoryUsage.increase / 1024 / 1024).toFixed(2)}MB\n`;
      report += `   Success Rate: ${result.successRate.toFixed(1)}%\n`;
      report += `   Operations: ${result.operations}\n`;
      report += `   Errors: ${result.errors}\n\n`;
    });
    
    return report;
  }

  private extractOperationCount(result: any): number {
    if (typeof result === 'number') return result;
    if (Array.isArray(result)) return result.length;
    if (result && typeof result === 'object' && 'length' in result) return result.length;
    return 1; // Default to 1 operation
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private snapshots: Array<{ timestamp: number; memory: number }> = [];
  private tracking = false;
  private interval?: NodeJS.Timeout;

  /**
   * Start memory tracking
   */
  startTracking(intervalMs: number = 100): void {
    if (this.tracking) return;
    
    this.tracking = true;
    this.snapshots = [];
    
    this.interval = setInterval(() => {
      this.snapshots.push({
        timestamp: Date.now(),
        memory: process.memoryUsage().heapUsed
      });
    }, intervalMs);
  }

  /**
   * Stop memory tracking
   */
  stopTracking(): void {
    if (!this.tracking) return;
    
    this.tracking = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  /**
   * Get memory statistics
   */
  getStatistics(): {
    initial: number;
    final: number;
    peak: number;
    average: number;
    increase: number;
    samples: number;
  } {
    if (this.snapshots.length === 0) {
      return {
        initial: 0,
        final: 0,
        peak: 0,
        average: 0,
        increase: 0,
        samples: 0
      };
    }
    
    const memories = this.snapshots.map(s => s.memory);
    const initial = memories[0];
    const final = memories[memories.length - 1];
    const peak = Math.max(...memories);
    const average = memories.reduce((sum, mem) => sum + mem, 0) / memories.length;
    
    return {
      initial,
      final,
      peak,
      average,
      increase: final - initial,
      samples: this.snapshots.length
    };
  }

  /**
   * Clear snapshots
   */
  clear(): void {
    this.snapshots = [];
  }
}

/**
 * Throughput calculator
 */
export class ThroughputCalculator {
  private startTime: number = 0;
  private operationCount: number = 0;

  /**
   * Start measuring throughput
   */
  start(): void {
    this.startTime = Date.now();
    this.operationCount = 0;
  }

  /**
   * Record an operation
   */
  recordOperation(count: number = 1): void {
    this.operationCount += count;
  }

  /**
   * Get current throughput
   */
  getCurrentThroughput(): number {
    if (this.startTime === 0) return 0;
    
    const duration = Date.now() - this.startTime;
    return duration > 0 ? (this.operationCount / duration) * 1000 : 0;
  }

  /**
   * Get final throughput and reset
   */
  getFinalThroughput(): number {
    const throughput = this.getCurrentThroughput();
    this.reset();
    return throughput;
  }

  /**
   * Reset the calculator
   */
  reset(): void {
    this.startTime = 0;
    this.operationCount = 0;
  }
}

/**
 * Performance assertion utilities
 */
export class PerformanceAssertions {
  /**
   * Assert that duration is within acceptable range
   */
  static assertDuration(actual: number, maxExpected: number, testName: string): void {
    if (actual > maxExpected) {
      throw new Error(`${testName}: Duration ${actual}ms exceeds maximum expected ${maxExpected}ms`);
    }
  }

  /**
   * Assert that throughput meets minimum requirement
   */
  static assertThroughput(actual: number, minExpected: number, testName: string): void {
    if (actual < minExpected) {
      throw new Error(`${testName}: Throughput ${actual.toFixed(2)} ops/sec below minimum expected ${minExpected} ops/sec`);
    }
  }

  /**
   * Assert that memory usage is within acceptable range
   */
  static assertMemoryUsage(actual: number, maxExpected: number, testName: string): void {
    const actualMB = actual / (1024 * 1024);
    const maxExpectedMB = maxExpected / (1024 * 1024);
    
    if (actualMB > maxExpectedMB) {
      throw new Error(`${testName}: Memory usage ${actualMB.toFixed(2)}MB exceeds maximum expected ${maxExpectedMB.toFixed(2)}MB`);
    }
  }

  /**
   * Assert that success rate meets minimum requirement
   */
  static assertSuccessRate(actual: number, minExpected: number, testName: string): void {
    if (actual < minExpected) {
      throw new Error(`${testName}: Success rate ${actual.toFixed(1)}% below minimum expected ${minExpected}%`);
    }
  }

  /**
   * Assert that performance hasn't degraded significantly
   */
  static assertPerformanceRegression(
    baseline: BenchmarkResult,
    current: BenchmarkResult,
    maxDegradation: number = 20
  ): void {
    const durationIncrease = ((current.duration - baseline.duration) / baseline.duration) * 100;
    const throughputDecrease = baseline.throughput > 0 ? 
      ((baseline.throughput - current.throughput) / baseline.throughput) * 100 : 0;
    
    if (durationIncrease > maxDegradation) {
      throw new Error(`Performance regression: Duration increased by ${durationIncrease.toFixed(1)}% (max allowed: ${maxDegradation}%)`);
    }
    
    if (throughputDecrease > maxDegradation) {
      throw new Error(`Performance regression: Throughput decreased by ${throughputDecrease.toFixed(1)}% (max allowed: ${maxDegradation}%)`);
    }
  }
}

/**
 * Load testing utilities
 */
export class LoadTestRunner {
  /**
   * Run a load test with increasing concurrency
   */
  static async runConcurrencyTest<T>(
    testFunction: () => Promise<T>,
    concurrencyLevels: number[],
    operationsPerLevel: number = 100
  ): Promise<Array<{ concurrency: number; result: BenchmarkResult }>> {
    const results: Array<{ concurrency: number; result: BenchmarkResult }> = [];
    
    for (const concurrency of concurrencyLevels) {
      const benchmark = new PerformanceBenchmark();
      
      const result = await benchmark.runBenchmark(
        {
          name: `Concurrency-${concurrency}`,
          measurementRuns: 1,
          memoryTracking: true
        },
        async () => {
          const promises = Array.from({ length: concurrency }, () => 
            Array.from({ length: operationsPerLevel / concurrency }, () => testFunction())
          ).flat();
          
          return await Promise.all(promises);
        }
      );
      
      results.push({ concurrency, result });
    }
    
    return results;
  }

  /**
   * Run a sustained load test
   */
  static async runSustainedLoadTest<T>(
    testFunction: () => Promise<T>,
    durationMs: number,
    targetThroughput: number
  ): Promise<BenchmarkResult> {
    const benchmark = new PerformanceBenchmark();
    const intervalMs = 1000 / targetThroughput;
    
    return await benchmark.runBenchmark(
      {
        name: `SustainedLoad-${targetThroughput}ops`,
        measurementRuns: 1,
        maxDuration: durationMs,
        memoryTracking: true
      },
      async () => {
        const startTime = Date.now();
        const results: T[] = [];
        
        while (Date.now() - startTime < durationMs) {
          const operationStart = Date.now();
          
          try {
            const result = await testFunction();
            results.push(result);
          } catch (error) {
            // Continue on errors
          }
          
          const operationDuration = Date.now() - operationStart;
          const waitTime = Math.max(0, intervalMs - operationDuration);
          
          if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
        return results;
      }
    );
  }
}