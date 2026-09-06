/**
 * CI/CD Performance Regression Testing Integration
 * 
 * Automated performance testing pipeline integration with
 * regression detection, benchmarking, and reporting.
 * 
 * Requirements: 5.1, 5.3 - Performance optimization for web-based workloads
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/enhanced-logger';
import { PerformanceMonitor, PerformanceBenchmark } from './performance-monitor';
import { MemoryOptimizer } from './memory-optimization';
import { DatabaseOptimizer } from './database-optimization';
import { AdvancedCachingSystem } from './advanced-caching';

const logger = createLogger('system', 'ci-cd-performance');

export interface PerformanceTestSuite {
  name: string;
  description: string;
  tests: PerformanceTest[];
  thresholds: PerformanceThresholds;
}

export interface PerformanceTest {
  name: string;
  description: string;
  category: 'api' | 'database' | 'cache' | 'memory' | 'integration';
  testFunction: () => Promise<void>;
  expectedThroughput?: number;
  maxDuration?: number;
  maxMemoryUsage?: number;
}

export interface PerformanceThresholds {
  regressionThreshold: number; // percentage
  maxResponseTime: number; // milliseconds
  minThroughput: number; // operations per second
  maxMemoryUsage: number; // bytes
  maxErrorRate: number; // percentage
}

export interface PerformanceReport {
  timestamp: Date;
  suite: string;
  results: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    regressions: number;
    improvements: number;
  };
  regressions: RegressionResult[];
  recommendations: string[];
  baseline?: PerformanceBaseline;
}

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  throughput: number;
  memoryUsage: number;
  error?: string;
  metrics: {
    responseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryGrowth: number;
  };
}

export interface RegressionResult {
  test: string;
  current: number;
  baseline: number;
  regression: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface PerformanceBaseline {
  timestamp: Date;
  version: string;
  results: Record<string, {
    duration: number;
    throughput: number;
    memoryUsage: number;
  }>;
}

/**
 * CI/CD Performance Testing Integration
 */
export class CICDPerformanceTester {
  private performanceMonitor: PerformanceMonitor;
  private memoryOptimizer: MemoryOptimizer;
  private baselineFile: string;
  private reportDir: string;

  constructor(
    performanceMonitor: PerformanceMonitor,
    memoryOptimizer: MemoryOptimizer,
    options: {
      baselineFile?: string;
      reportDir?: string;
    } = {}
  ) {
    this.performanceMonitor = performanceMonitor;
    this.memoryOptimizer = memoryOptimizer;
    this.baselineFile = options.baselineFile || join(process.cwd(), 'performance-baseline.json');
    this.reportDir = options.reportDir || join(process.cwd(), 'performance-reports');

    logger.info('ci-cd-performance', 'CI/CD Performance Tester initialized', {
      baselineFile: this.baselineFile,
      reportDir: this.reportDir
    });
  }

  /**
   * Run complete performance test suite
   */
  async runTestSuite(suite: PerformanceTestSuite): Promise<PerformanceReport> {
    logger.info('ci-cd-performance', 'Starting performance test suite', {
      suite: suite.name,
      testCount: suite.tests.length
    });

    const startTime = Date.now();
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;

    // Load baseline for comparison
    const baseline = this.loadBaseline();

    // Run each test
    for (const test of suite.tests) {
      try {
        const result = await this.runSingleTest(test, suite.thresholds);
        results.push(result);
        
        if (result.passed) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error('ci-cd-performance', 'Test execution failed', {
          test: test.name,
          error
        });
        
        results.push({
          name: test.name,
          category: test.category,
          passed: false,
          duration: 0,
          throughput: 0,
          memoryUsage: 0,
          error: (error as Error).message,
          metrics: {
            responseTime: 0,
            errorRate: 100,
            cpuUsage: 0,
            memoryGrowth: 0
          }
        });
        failed++;
      }
    }

    // Detect regressions
    const regressions = this.detectRegressions(results, baseline, suite.thresholds);
    const improvements = this.detectImprovements(results, baseline);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, regressions);

    const report: PerformanceReport = {
      timestamp: new Date(),
      suite: suite.name,
      results,
      summary: {
        totalTests: suite.tests.length,
        passed,
        failed,
        regressions: regressions.length,
        improvements: improvements.length
      },
      regressions,
      recommendations,
      baseline
    };

    // Save report
    await this.saveReport(report);

    // Update baseline if all tests passed and no regressions
    if (failed === 0 && regressions.length === 0) {
      await this.updateBaseline(results);
    }

    const duration = Date.now() - startTime;
    logger.info('ci-cd-performance', 'Performance test suite completed', {
      suite: suite.name,
      duration,
      passed,
      failed,
      regressions: regressions.length
    });

    return report;
  }

  /**
   * Run single performance test
   */
  private async runSingleTest(test: PerformanceTest, thresholds: PerformanceThresholds): Promise<TestResult> {
    logger.debug('ci-cd-performance', 'Running performance test', { test: test.name });

    const initialMemory = process.memoryUsage();
    const initialMetrics = this.performanceMonitor.getCurrentMetrics();
    
    // Run the test with benchmarking
    const benchmark = await this.performanceMonitor.runBenchmark(
      test.name,
      test.testFunction,
      1 // Single iteration for detailed analysis
    );

    const finalMemory = process.memoryUsage();
    const finalMetrics = this.performanceMonitor.getCurrentMetrics();
    
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const responseTime = benchmark.duration;
    const throughput = benchmark.throughput;
    
    // Calculate pass/fail based on thresholds
    const passed = this.evaluateTestResult(benchmark, test, thresholds, memoryGrowth);

    return {
      name: test.name,
      category: test.category,
      passed,
      duration: benchmark.duration,
      throughput: benchmark.throughput,
      memoryUsage: finalMemory.heapUsed,
      metrics: {
        responseTime,
        errorRate: benchmark.success ? 0 : 100,
        cpuUsage: finalMetrics.cpu.usage - initialMetrics.cpu.usage,
        memoryGrowth
      }
    };
  }

  /**
   * Evaluate test result against thresholds
   */
  private evaluateTestResult(
    benchmark: PerformanceBenchmark,
    test: PerformanceTest,
    thresholds: PerformanceThresholds,
    memoryGrowth: number
  ): boolean {
    if (!benchmark.success) {
      return false;
    }

    // Check duration threshold
    if (test.maxDuration && benchmark.duration > test.maxDuration) {
      return false;
    }

    // Check throughput threshold
    if (test.expectedThroughput && benchmark.throughput < test.expectedThroughput) {
      return false;
    }

    // Check memory usage threshold
    if (test.maxMemoryUsage && memoryGrowth > test.maxMemoryUsage) {
      return false;
    }

    // Check global thresholds
    if (benchmark.duration > thresholds.maxResponseTime) {
      return false;
    }

    if (benchmark.throughput < thresholds.minThroughput) {
      return false;
    }

    if (memoryGrowth > thresholds.maxMemoryUsage) {
      return false;
    }

    return true;
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(
    results: TestResult[],
    baseline: PerformanceBaseline | null,
    thresholds: PerformanceThresholds
  ): RegressionResult[] {
    if (!baseline) {
      return [];
    }

    const regressions: RegressionResult[] = [];

    for (const result of results) {
      const baselineResult = baseline.results[result.name];
      if (!baselineResult) {
        continue;
      }

      // Check throughput regression
      const throughputChange = ((result.throughput - baselineResult.throughput) / baselineResult.throughput) * 100;
      if (throughputChange < -thresholds.regressionThreshold) {
        regressions.push({
          test: result.name,
          current: result.throughput,
          baseline: baselineResult.throughput,
          regression: Math.abs(throughputChange),
          severity: this.calculateRegressionSeverity(Math.abs(throughputChange))
        });
      }

      // Check duration regression
      const durationChange = ((result.duration - baselineResult.duration) / baselineResult.duration) * 100;
      if (durationChange > thresholds.regressionThreshold) {
        regressions.push({
          test: result.name,
          current: result.duration,
          baseline: baselineResult.duration,
          regression: durationChange,
          severity: this.calculateRegressionSeverity(durationChange)
        });
      }
    }

    return regressions;
  }

  /**
   * Detect performance improvements
   */
  private detectImprovements(
    results: TestResult[],
    baseline: PerformanceBaseline | null
  ): Array<{ test: string; improvement: number }> {
    if (!baseline) {
      return [];
    }

    const improvements: Array<{ test: string; improvement: number }> = [];

    for (const result of results) {
      const baselineResult = baseline.results[result.name];
      if (!baselineResult) {
        continue;
      }

      const throughputImprovement = ((result.throughput - baselineResult.throughput) / baselineResult.throughput) * 100;
      if (throughputImprovement > 10) { // 10% improvement threshold
        improvements.push({
          test: result.name,
          improvement: throughputImprovement
        });
      }
    }

    return improvements;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    results: TestResult[],
    regressions: RegressionResult[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze failed tests
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed - investigate and fix underlying issues`);
    }

    // Analyze high memory usage
    const highMemoryTests = results.filter(r => r.memoryUsage > 100 * 1024 * 1024); // 100MB
    if (highMemoryTests.length > 0) {
      recommendations.push('High memory usage detected - consider memory optimization');
    }

    // Analyze slow tests
    const slowTests = results.filter(r => r.duration > 5000); // 5 seconds
    if (slowTests.length > 0) {
      recommendations.push('Slow tests detected - optimize performance-critical paths');
    }

    // Analyze regressions
    if (regressions.length > 0) {
      const criticalRegressions = regressions.filter(r => r.severity === 'critical');
      if (criticalRegressions.length > 0) {
        recommendations.push('Critical performance regressions detected - immediate attention required');
      }
    }

    // Database-specific recommendations
    const dbTests = results.filter(r => r.category === 'database');
    const slowDbTests = dbTests.filter(r => r.duration > 1000);
    if (slowDbTests.length > 0) {
      recommendations.push('Slow database operations detected - optimize queries and connection pooling');
    }

    // Cache-specific recommendations
    const cacheTests = results.filter(r => r.category === 'cache');
    const slowCacheTests = cacheTests.filter(r => r.duration > 100);
    if (slowCacheTests.length > 0) {
      recommendations.push('Cache operations are slow - review cache configuration and hit rates');
    }

    return recommendations;
  }

  /**
   * Calculate regression severity
   */
  private calculateRegressionSeverity(percentage: number): 'minor' | 'moderate' | 'major' | 'critical' {
    if (percentage > 50) return 'critical';
    if (percentage > 25) return 'major';
    if (percentage > 10) return 'moderate';
    return 'minor';
  }

  /**
   * Load performance baseline
   */
  private loadBaseline(): PerformanceBaseline | null {
    try {
      if (existsSync(this.baselineFile)) {
        const data = readFileSync(this.baselineFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.warn('ci-cd-performance', 'Failed to load baseline', { error });
    }
    
    return null;
  }

  /**
   * Update performance baseline
   */
  private async updateBaseline(results: TestResult[]): Promise<void> {
    const baseline: PerformanceBaseline = {
      timestamp: new Date(),
      version: process.env.CI_COMMIT_SHA || process.env.BUILD_NUMBER || 'unknown',
      results: {}
    };

    for (const result of results) {
      baseline.results[result.name] = {
        duration: result.duration,
        throughput: result.throughput,
        memoryUsage: result.memoryUsage
      };
    }

    try {
      writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2));
      logger.info('ci-cd-performance', 'Performance baseline updated', {
        version: baseline.version,
        testCount: results.length
      });
    } catch (error) {
      logger.error('ci-cd-performance', 'Failed to update baseline', { error });
    }
  }

  /**
   * Save performance report
   */
  private async saveReport(report: PerformanceReport): Promise<void> {
    try {
      const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
      const filename = `performance-report-${timestamp}.json`;
      const filepath = join(this.reportDir, filename);

      // Ensure directory exists
      const fs = require('fs');
      if (!fs.existsSync(this.reportDir)) {
        fs.mkdirSync(this.reportDir, { recursive: true });
      }

      writeFileSync(filepath, JSON.stringify(report, null, 2));
      
      // Also save as latest report
      const latestPath = join(this.reportDir, 'latest-performance-report.json');
      writeFileSync(latestPath, JSON.stringify(report, null, 2));

      logger.info('ci-cd-performance', 'Performance report saved', {
        filepath,
        testCount: report.results.length,
        regressions: report.regressions.length
      });
    } catch (error) {
      logger.error('ci-cd-performance', 'Failed to save report', { error });
    }
  }

  /**
   * Generate CI/CD exit code based on results
   */
  static getExitCode(report: PerformanceReport): number {
    // Exit with error if there are critical regressions
    const criticalRegressions = report.regressions.filter(r => r.severity === 'critical');
    if (criticalRegressions.length > 0) {
      return 2; // Critical performance regression
    }

    // Exit with warning if there are any regressions
    if (report.regressions.length > 0) {
      return 1; // Performance regression detected
    }

    // Exit with error if tests failed
    if (report.summary.failed > 0) {
      return 3; // Test failures
    }

    return 0; // Success
  }
}

/**
 * Create default performance test suite
 */
export function createDefaultTestSuite(): PerformanceTestSuite {
  return {
    name: 'TradingAgents Performance Suite',
    description: 'Comprehensive performance tests for trading agents system',
    tests: [
      {
        name: 'API Response Time',
        description: 'Test API endpoint response times',
        category: 'api',
        testFunction: async () => {
          // Simulate API calls
          await new Promise(resolve => setTimeout(resolve, 100));
        },
        maxDuration: 500,
        expectedThroughput: 100
      },
      {
        name: 'Database Query Performance',
        description: 'Test database query execution times',
        category: 'database',
        testFunction: async () => {
          // Simulate database queries
          await new Promise(resolve => setTimeout(resolve, 50));
        },
        maxDuration: 200,
        expectedThroughput: 200
      },
      {
        name: 'Cache Operations',
        description: 'Test cache read/write performance',
        category: 'cache',
        testFunction: async () => {
          // Simulate cache operations
          await new Promise(resolve => setTimeout(resolve, 10));
        },
        maxDuration: 50,
        expectedThroughput: 1000
      },
      {
        name: 'Memory Usage',
        description: 'Test memory allocation and cleanup',
        category: 'memory',
        testFunction: async () => {
          // Simulate memory operations
          const data = new Array(1000).fill(0).map(() => ({ id: Math.random() }));
          await new Promise(resolve => setTimeout(resolve, 10));
        },
        maxMemoryUsage: 10 * 1024 * 1024 // 10MB
      }
    ],
    thresholds: {
      regressionThreshold: 15, // 15% regression threshold
      maxResponseTime: 1000,
      minThroughput: 50,
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      maxErrorRate: 5
    }
  };
}