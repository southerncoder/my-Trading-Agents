/**
 * Risk Management Performance Benchmark Tests
 * 
 * Comprehensive performance testing suite for risk management functions:
 * - Speed benchmarks for all risk calculation functions
 * - Load testing with concurrent requests
 * - Memory usage monitoring
 * - Scalability testing with large datasets
 * - Performance regression detection
 * - Optimization validation
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  assessMarketRisk,
  assessSentimentRisk,
  assessNewsRisk,
  assessFundamentalRisk,
  assessExecutionRisk,
  assessSectorSpecificRisk,
  assessRealtimeVolatilityRisk,
  performComprehensiveRiskAssessment
} from '../../src/utils/risk-management-utils.js';
import { RiskManagementEngine } from '../../src/utils/risk-management-engine-simple.js';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  INDIVIDUAL_ASSESSMENT: 500,    // Individual risk assessments should complete within 500ms
  COMPREHENSIVE_ASSESSMENT: 2000, // Comprehensive assessment should complete within 2s
  CONCURRENT_BATCH: 5000,        // Batch of 10 concurrent assessments within 5s
  HIGH_FREQUENCY: 10000,         // 50 assessments within 10s
  MEMORY_LIMIT: 100 * 1024 * 1024 // 100MB memory limit
};

interface PerformanceMetric {
  operation: string;
  duration: number;
  memoryUsage: number;
  timestamp: number;
}

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  throughput: number; // operations per second
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
}

describe('Risk Management Performance Benchmarks', () => {
  let performanceMetrics: PerformanceMetric[] = [];
  let engine: RiskManagementEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    performanceMetrics = [];
    
    const mockConfig = {
      llm: { provider: 'openai', model: 'gpt-4' },
      dataProviders: {},
      agents: {}
    };
    
    engine = new RiskManagementEngine(mockConfig);

    // Mock fetch for consistent performance testing
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'success',
        results: {
          'google-news': {
            articles: [
              {
                title: 'Market Update',
                description: 'Standard market conditions with normal activity',
                publishedAt: new Date().toISOString(),
                source: { name: 'Reuters' }
              }
            ]
          }
        }
      })
    });
  });

  afterEach(() => {
    // Log performance summary
    if (performanceMetrics.length > 0) {
      const avgDuration = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length;
      const maxDuration = Math.max(...performanceMetrics.map(m => m.duration));
      const minDuration = Math.min(...performanceMetrics.map(m => m.duration));
      
      console.log(`Performance Summary:
        Operations: ${performanceMetrics.length}
        Average: ${avgDuration.toFixed(2)}ms
        Min: ${minDuration.toFixed(2)}ms
        Max: ${maxDuration.toFixed(2)}ms`);
    }
  });

  /**
   * Measure performance and memory usage of an operation
   */
  const measurePerformance = async <T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; metric: PerformanceMetric }> => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();
    
    const result = await fn();
    
    const endTime = performance.now();
    const finalMemory = process.memoryUsage().heapUsed;
    const duration = endTime - startTime;

    const metric: PerformanceMetric = {
      operation,
      duration,
      memoryUsage: finalMemory - initialMemory,
      timestamp: Date.now()
    };

    performanceMetrics.push(metric);
    return { result, metric };
  };

  /**
   * Run benchmark with multiple iterations
   */
  const runBenchmark = async <T>(
    operation: string,
    fn: () => Promise<T>,
    iterations: number = 10
  ): Promise<BenchmarkResult> => {
    const durations: number[] = [];
    const memoryUsages: number[] = [];
    let initialMemory = 0;
    let peakMemory = 0;
    let finalMemory = 0;

    // Warm up
    await fn();

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    initialMemory = process.memoryUsage().heapUsed;

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      await fn();
      const iterationEnd = performance.now();
      
      durations.push(iterationEnd - iterationStart);
      
      const currentMemory = process.memoryUsage().heapUsed;
      memoryUsages.push(currentMemory);
      peakMemory = Math.max(peakMemory, currentMemory);
    }

    const totalTime = performance.now() - startTime;
    finalMemory = process.memoryUsage().heapUsed;

    const averageTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minTime = Math.min(...durations);
    const maxTime = Math.max(...durations);
    
    // Calculate standard deviation
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - averageTime, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(variance);
    
    const throughput = (iterations / totalTime) * 1000; // operations per second

    return {
      operation,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      throughput,
      memoryUsage: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory
      }
    };
  };

  describe('Individual Risk Assessment Performance', () => {
    test('should benchmark market risk assessment speed', async () => {
      const benchmark = await runBenchmark(
        'assessMarketRisk',
        () => assessMarketRisk('Market showing moderate volatility with mixed signals', 'AAPL'),
        20
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);
      expect(benchmark.maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT * 2);
      expect(benchmark.throughput).toBeGreaterThan(2); // At least 2 ops/sec

      console.log(`Market Risk Assessment Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec
        Memory: ${(benchmark.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB peak`);
    });

    test('should benchmark sentiment risk assessment speed', async () => {
      const benchmark = await runBenchmark(
        'assessSentimentRisk',
        () => assessSentimentRisk('Overall sentiment is positive with bullish outlook', 'MSFT'),
        20
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);
      expect(benchmark.throughput).toBeGreaterThan(2);

      console.log(`Sentiment Risk Assessment Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });

    test('should benchmark news risk assessment speed', async () => {
      const benchmark = await runBenchmark(
        'assessNewsRisk',
        () => assessNewsRisk('Company reports strong quarterly earnings with positive guidance', 'GOOGL'),
        20
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);
      expect(benchmark.throughput).toBeGreaterThan(2);

      console.log(`News Risk Assessment Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });

    test('should benchmark fundamental risk assessment speed', async () => {
      const benchmark = await runBenchmark(
        'assessFundamentalRisk',
        () => assessFundamentalRisk('Strong balance sheet with healthy profit margins', 'AMZN'),
        20
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);
      expect(benchmark.throughput).toBeGreaterThan(2);

      console.log(`Fundamental Risk Assessment Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });

    test('should benchmark execution risk assessment speed', async () => {
      const benchmark = await runBenchmark(
        'assessExecutionRisk',
        () => assessExecutionRisk('Conservative position sizing with proper risk management'),
        50 // Execution risk is synchronous, so more iterations
      );

      expect(benchmark.averageTime).toBeLessThan(50); // Should be very fast (synchronous)
      expect(benchmark.throughput).toBeGreaterThan(100); // Very high throughput

      console.log(`Execution Risk Assessment Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });

    test('should benchmark sector-specific risk assessment speed', async () => {
      const benchmark = await runBenchmark(
        'assessSectorSpecificRisk',
        () => assessSectorSpecificRisk('AAPL'),
        20
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);
      expect(benchmark.throughput).toBeGreaterThan(2);

      console.log(`Sector Risk Assessment Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });

    test('should benchmark real-time volatility risk assessment speed', async () => {
      const benchmark = await runBenchmark(
        'assessRealtimeVolatilityRisk',
        () => assessRealtimeVolatilityRisk('TSLA'),
        20
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);
      expect(benchmark.throughput).toBeGreaterThan(2);

      console.log(`Volatility Risk Assessment Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });
  });

  describe('Comprehensive Risk Assessment Performance', () => {
    test('should benchmark comprehensive risk assessment speed', async () => {
      const benchmark = await runBenchmark(
        'performComprehensiveRiskAssessment',
        () => performComprehensiveRiskAssessment(
          'Market showing mixed signals with moderate volatility',
          'Neutral sentiment with balanced investor outlook',
          'Standard corporate updates with no major developments',
          'Solid fundamentals with steady growth metrics',
          'Balanced approach with moderate position sizing',
          'SPY'
        ),
        10
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPREHENSIVE_ASSESSMENT);
      expect(benchmark.maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPREHENSIVE_ASSESSMENT * 1.5);
      expect(benchmark.throughput).toBeGreaterThan(0.5); // At least 0.5 ops/sec

      console.log(`Comprehensive Risk Assessment Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Max: ${benchmark.maxTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec
        Memory: ${(benchmark.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB peak`);
    });

    test('should handle comprehensive assessment with varying complexity', async () => {
      const scenarios = [
        {
          name: 'Simple',
          reports: ['Basic market', 'Neutral sentiment', 'No news', 'Standard fundamentals', 'Conservative plan']
        },
        {
          name: 'Complex',
          reports: [
            'Complex market analysis with multiple technical indicators showing mixed signals and high volatility',
            'Detailed sentiment analysis with conflicting social media trends and analyst opinions',
            'Breaking news with regulatory investigations and earnings surprises',
            'Comprehensive fundamental analysis with debt concerns and growth prospects',
            'Advanced trading plan with leverage and complex derivatives'
          ]
        }
      ];

      for (const scenario of scenarios) {
        const benchmark = await runBenchmark(
          `comprehensiveRisk_${scenario.name}`,
          () => performComprehensiveRiskAssessment(
            scenario.reports[0],
            scenario.reports[1],
            scenario.reports[2],
            scenario.reports[3],
            scenario.reports[4],
            `TEST_${scenario.name}`
          ),
          5
        );

        expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPREHENSIVE_ASSESSMENT);
        
        console.log(`${scenario.name} Scenario Benchmark:
          Average: ${benchmark.averageTime.toFixed(2)}ms
          Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
      }
    });
  });

  describe('Risk Management Engine Performance', () => {
    test('should benchmark technical indicator risk assessment', async () => {
      const benchmark = await runBenchmark(
        'engine_assessTechnicalIndicatorRisk',
        () => engine.assessTechnicalIndicatorRisk('AAPL'),
        20
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);
      expect(benchmark.throughput).toBeGreaterThan(2);

      console.log(`Engine Technical Risk Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });

    test('should benchmark quantitative risk models', async () => {
      const benchmark = await runBenchmark(
        'engine_applyQuantitativeFundamentalRiskModels',
        () => engine.applyQuantitativeFundamentalRiskModels('MSFT'),
        20
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);
      expect(benchmark.throughput).toBeGreaterThan(2);

      console.log(`Engine Quantitative Risk Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });

    test('should benchmark sector sentiment analysis', async () => {
      const benchmark = await runBenchmark(
        'engine_getSectorSentiment',
        () => engine.getSectorSentiment('GOOGL'),
        15 // Fewer iterations due to network calls
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPREHENSIVE_ASSESSMENT);
      expect(benchmark.throughput).toBeGreaterThan(0.5);

      console.log(`Engine Sector Sentiment Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });

    test('should benchmark volatility analysis', async () => {
      const benchmark = await runBenchmark(
        'engine_analyzeVolatility',
        () => engine.analyzeVolatility('AMZN'),
        20
      );

      expect(benchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);
      expect(benchmark.throughput).toBeGreaterThan(2);

      console.log(`Engine Volatility Analysis Benchmark:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
    });
  });

  describe('Concurrent Load Testing', () => {
    test('should handle concurrent individual assessments efficiently', async () => {
      const concurrency = 10;
      const symbols = Array.from({ length: concurrency }, (_, i) => `CONCURRENT_${i}`);

      const startTime = performance.now();
      
      const promises = symbols.map(symbol => 
        assessMarketRisk('Concurrent market analysis test', symbol)
      );

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_BATCH);
      expect(results.length).toBe(concurrency);
      
      const avgTimePerRequest = totalTime / concurrency;
      expect(avgTimePerRequest).toBeLessThan(PERFORMANCE_THRESHOLDS.INDIVIDUAL_ASSESSMENT);

      console.log(`Concurrent Load Test (${concurrency} requests):
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Request: ${avgTimePerRequest.toFixed(2)}ms
        Throughput: ${(concurrency / totalTime * 1000).toFixed(2)} ops/sec`);
    });

    test('should handle concurrent comprehensive assessments', async () => {
      const concurrency = 5;
      const symbols = Array.from({ length: concurrency }, (_, i) => `COMP_CONCURRENT_${i}`);

      const startTime = performance.now();
      
      const promises = symbols.map(symbol => 
        performComprehensiveRiskAssessment(
          'Concurrent comprehensive test',
          'Neutral sentiment',
          'Standard news',
          'Basic fundamentals',
          'Conservative plan',
          symbol
        )
      );

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_BATCH);
      expect(results.length).toBe(concurrency);

      console.log(`Concurrent Comprehensive Test (${concurrency} requests):
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Request: ${(totalTime / concurrency).toFixed(2)}ms`);
    });

    test('should handle high-frequency requests', async () => {
      const requestCount = 50;
      const symbols = Array.from({ length: requestCount }, (_, i) => `HF_${i}`);

      const startTime = performance.now();
      
      // Process in batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        batches.push(batch);
      }

      let totalResults = 0;
      for (const batch of batches) {
        const promises = batch.map(symbol => 
          assessMarketRisk('High frequency test', symbol)
        );
        const results = await Promise.all(promises);
        totalResults += results.length;
      }

      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.HIGH_FREQUENCY);
      expect(totalResults).toBe(requestCount);

      const throughput = (requestCount / totalTime) * 1000;
      expect(throughput).toBeGreaterThan(5); // At least 5 ops/sec

      console.log(`High-Frequency Test (${requestCount} requests):
        Total Time: ${totalTime.toFixed(2)}ms
        Throughput: ${throughput.toFixed(2)} ops/sec`);
    });
  });

  describe('Memory Usage Testing', () => {
    test('should maintain reasonable memory usage during operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      let peakMemory = initialMemory;

      // Perform multiple operations and monitor memory
      for (let i = 0; i < 20; i++) {
        await assessMarketRisk('Memory test iteration', `MEMORY_TEST_${i}`);
        
        const currentMemory = process.memoryUsage().heapUsed;
        peakMemory = Math.max(peakMemory, currentMemory);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const peakIncrease = peakMemory - initialMemory;

      expect(peakIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT);
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT / 2); // Final should be less than peak

      console.log(`Memory Usage Test:
        Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB
        Peak: ${(peakMemory / 1024 / 1024).toFixed(2)}MB
        Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB
        Peak Increase: ${(peakIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should handle memory efficiently with caching', async () => {
      const symbol = 'CACHE_MEMORY_TEST';
      const iterations = 10;

      // First run without cache
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < iterations; i++) {
        await engine.assessTechnicalIndicatorRisk(`${symbol}_${i}`);
      }

      const memoryAfterFirstRun = process.memoryUsage().heapUsed;

      // Second run with cache hits
      for (let i = 0; i < iterations; i++) {
        await engine.assessTechnicalIndicatorRisk(`${symbol}_${i}`);
      }

      const memoryAfterSecondRun = process.memoryUsage().heapUsed;

      const firstRunIncrease = memoryAfterFirstRun - initialMemory;
      const secondRunIncrease = memoryAfterSecondRun - memoryAfterFirstRun;

      // Second run should use less additional memory due to caching
      expect(secondRunIncrease).toBeLessThan(firstRunIncrease);

      console.log(`Cache Memory Efficiency Test:
        First Run Increase: ${(firstRunIncrease / 1024 / 1024).toFixed(2)}MB
        Second Run Increase: ${(secondRunIncrease / 1024 / 1024).toFixed(2)}MB
        Cache Efficiency: ${((1 - secondRunIncrease / firstRunIncrease) * 100).toFixed(1)}%`);
    });
  });

  describe('Scalability Testing', () => {
    test('should scale linearly with input size', async () => {
      const inputSizes = [1, 5, 10, 20];
      const results: { size: number; avgTime: number; throughput: number }[] = [];

      for (const size of inputSizes) {
        const symbols = Array.from({ length: size }, (_, i) => `SCALE_TEST_${i}`);
        
        const startTime = performance.now();
        
        const promises = symbols.map(symbol => 
          assessMarketRisk('Scalability test', symbol)
        );
        
        await Promise.all(promises);
        
        const totalTime = performance.now() - startTime;
        const avgTime = totalTime / size;
        const throughput = (size / totalTime) * 1000;

        results.push({ size, avgTime, throughput });

        console.log(`Scale Test (${size} requests):
          Total: ${totalTime.toFixed(2)}ms
          Average: ${avgTime.toFixed(2)}ms
          Throughput: ${throughput.toFixed(2)} ops/sec`);
      }

      // Verify that average time doesn't increase dramatically with size
      const firstAvgTime = results[0].avgTime;
      const lastAvgTime = results[results.length - 1].avgTime;
      
      // Average time shouldn't increase by more than 50% due to concurrency overhead
      expect(lastAvgTime).toBeLessThan(firstAvgTime * 1.5);
    });

    test('should handle varying report complexity efficiently', async () => {
      const complexities = [
        { name: 'Simple', length: 50 },
        { name: 'Medium', length: 200 },
        { name: 'Complex', length: 500 },
        { name: 'VeryComplex', length: 1000 }
      ];

      const results: { complexity: string; avgTime: number }[] = [];

      for (const complexity of complexities) {
        const report = 'Market analysis '.repeat(complexity.length / 15);
        
        const benchmark = await runBenchmark(
          `complexity_${complexity.name}`,
          () => assessMarketRisk(report, `COMPLEXITY_${complexity.name}`),
          10
        );

        results.push({ 
          complexity: complexity.name, 
          avgTime: benchmark.averageTime 
        });

        console.log(`Complexity Test (${complexity.name}):
          Report Length: ${report.length} chars
          Average Time: ${benchmark.averageTime.toFixed(2)}ms`);
      }

      // Verify that processing time scales reasonably with complexity
      const simpleTime = results[0].avgTime;
      const complexTime = results[results.length - 1].avgTime;
      
      // Complex reports shouldn't take more than 3x longer than simple ones
      expect(complexTime).toBeLessThan(simpleTime * 3);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should maintain consistent performance across multiple runs', async () => {
      const runs = 5;
      const iterationsPerRun = 10;
      const runResults: number[] = [];

      for (let run = 0; run < runs; run++) {
        const benchmark = await runBenchmark(
          `regression_run_${run}`,
          () => assessMarketRisk('Regression test', `REGRESSION_${run}`),
          iterationsPerRun
        );

        runResults.push(benchmark.averageTime);
      }

      const overallAverage = runResults.reduce((sum, time) => sum + time, 0) / runResults.length;
      const standardDeviation = Math.sqrt(
        runResults.reduce((sum, time) => sum + Math.pow(time - overallAverage, 2), 0) / runResults.length
      );

      // Standard deviation should be less than 20% of the average
      const coefficientOfVariation = standardDeviation / overallAverage;
      expect(coefficientOfVariation).toBeLessThan(0.2);

      console.log(`Performance Consistency Test:
        Runs: ${runs}
        Average: ${overallAverage.toFixed(2)}ms
        Std Dev: ${standardDeviation.toFixed(2)}ms
        CV: ${(coefficientOfVariation * 100).toFixed(1)}%`);
    });

    test('should detect performance improvements from caching', async () => {
      const symbol = 'CACHE_IMPROVEMENT_TEST';
      const iterations = 5;

      // Measure performance without cache (first calls)
      const uncachedTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await engine.assessTechnicalIndicatorRisk(`${symbol}_UNCACHED_${i}`);
        uncachedTimes.push(performance.now() - start);
      }

      // Measure performance with cache (repeated calls)
      const cachedTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await engine.assessTechnicalIndicatorRisk(`${symbol}_UNCACHED_${i}`); // Same symbols as above
        cachedTimes.push(performance.now() - start);
      }

      const avgUncachedTime = uncachedTimes.reduce((sum, t) => sum + t, 0) / uncachedTimes.length;
      const avgCachedTime = cachedTimes.reduce((sum, t) => sum + t, 0) / cachedTimes.length;

      // Cached calls should be significantly faster
      expect(avgCachedTime).toBeLessThan(avgUncachedTime * 0.5);

      const improvement = ((avgUncachedTime - avgCachedTime) / avgUncachedTime) * 100;

      console.log(`Cache Performance Improvement:
        Uncached Average: ${avgUncachedTime.toFixed(2)}ms
        Cached Average: ${avgCachedTime.toFixed(2)}ms
        Improvement: ${improvement.toFixed(1)}%`);
    });
  });
});