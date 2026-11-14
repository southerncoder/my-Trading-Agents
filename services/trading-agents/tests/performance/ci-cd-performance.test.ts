/**
 * CI/CD Performance Integration Tests
 * 
 * Tests for CI/CD pipeline integration with performance monitoring
 * and regression detection capabilities.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('CI/CD Performance Integration', () => {
  const reportDir = 'performance-reports';
  const baselineFile = 'performance-baseline.json';

  beforeAll(() => {
    // Ensure report directory exists
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }
  });

  describe('Performance Baseline Management', () => {
    test('should create performance baseline', async () => {
      const baseline = {
        timestamp: new Date().toISOString(),
        version: process.env.CI_COMMIT_SHA || 'test-version',
        results: {
          'cache_operations': {
            duration: 100,
            throughput: 1000,
            memoryUsage: 1024 * 1024
          },
          'memory_allocation': {
            duration: 200,
            throughput: 500,
            memoryUsage: 2 * 1024 * 1024
          },
          'async_operations': {
            duration: 500,
            throughput: 100,
            memoryUsage: 512 * 1024
          }
        }
      };

      writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
      
      expect(existsSync(baselineFile)).toBe(true);
      
      const savedBaseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
      expect(savedBaseline.version).toBe(baseline.version);
      expect(Object.keys(savedBaseline.results)).toHaveLength(3);
    });

    test('should load existing baseline', () => {
      if (existsSync(baselineFile)) {
        const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
        
        expect(baseline).toHaveProperty('timestamp');
        expect(baseline).toHaveProperty('version');
        expect(baseline).toHaveProperty('results');
        expect(typeof baseline.results).toBe('object');
      } else {
        // If no baseline exists, that's also valid for first run
        expect(true).toBe(true);
      }
    });
  });

  describe('Performance Report Generation', () => {
    test('should generate CI/CD compatible report', async () => {
      // Simulate running performance tests
      const testResults = [
        {
          name: 'cache_operations',
          duration: 95,
          throughput: 1050,
          memoryUsage: 1024 * 1024,
          success: true
        },
        {
          name: 'memory_allocation',
          duration: 180,
          throughput: 550,
          memoryUsage: 1.8 * 1024 * 1024,
          success: true
        },
        {
          name: 'async_operations',
          duration: 480,
          throughput: 105,
          memoryUsage: 500 * 1024,
          success: true
        }
      ];

      const report = {
        timestamp: new Date().toISOString(),
        suite: 'CI/CD Performance Tests',
        results: testResults,
        summary: {
          total: testResults.length,
          passed: testResults.filter(r => r.success).length,
          failed: testResults.filter(r => !r.success).length,
          regressions: 0,
          improvements: 0
        },
        regressions: [],
        recommendations: []
      };

      // Save report
      const reportFile = join(reportDir, 'ci-cd-performance-report.json');
      writeFileSync(reportFile, JSON.stringify(report, null, 2));

      expect(existsSync(reportFile)).toBe(true);
      
      const savedReport = JSON.parse(readFileSync(reportFile, 'utf8'));
      expect(savedReport.summary.total).toBe(3);
      expect(savedReport.summary.passed).toBe(3);
      expect(savedReport.summary.failed).toBe(0);
    });

    test('should detect performance regressions', () => {
      const baseline = {
        cache_operations: { duration: 100, throughput: 1000 },
        memory_allocation: { duration: 200, throughput: 500 }
      };

      const current = {
        cache_operations: { duration: 150, throughput: 800 }, // Regression
        memory_allocation: { duration: 180, throughput: 550 }  // Improvement
      };

      const regressions = [];
      const improvements = [];
      const regressionThreshold = 20; // 20%

      for (const [testName, currentResult] of Object.entries(current)) {
        const baselineResult = baseline[testName as keyof typeof baseline];
        if (baselineResult) {
          // Check throughput regression
          const throughputChange = ((currentResult.throughput - baselineResult.throughput) / baselineResult.throughput) * 100;
          
          if (throughputChange < -regressionThreshold) {
            regressions.push({
              test: testName,
              metric: 'throughput',
              current: currentResult.throughput,
              baseline: baselineResult.throughput,
              regression: Math.abs(throughputChange)
            });
          } else if (throughputChange > 10) {
            improvements.push({
              test: testName,
              metric: 'throughput',
              improvement: throughputChange
            });
          }

          // Check duration regression
          const durationChange = ((currentResult.duration - baselineResult.duration) / baselineResult.duration) * 100;
          
          if (durationChange > regressionThreshold) {
            regressions.push({
              test: testName,
              metric: 'duration',
              current: currentResult.duration,
              baseline: baselineResult.duration,
              regression: durationChange
            });
          }
        }
      }

      expect(regressions.length).toBe(1); // Should detect cache operations regression
      expect(improvements.length).toBe(1); // Should detect memory allocation improvement
      expect(regressions[0].test).toBe('cache_operations');
      expect(improvements[0].test).toBe('memory_allocation');
    });
  });

  describe('CI/CD Exit Codes', () => {
    function getExitCode(report: any): number {
      // Critical regressions
      const criticalRegressions = report.regressions?.filter((r: any) => r.regression > 50) || [];
      if (criticalRegressions.length > 0) {
        return 2; // Critical performance regression
      }

      // Any regressions
      if (report.regressions?.length > 0) {
        return 1; // Performance regression detected
      }

      // Test failures
      if (report.summary.failed > 0) {
        return 3; // Test failures
      }

      return 0; // Success
    }

    test('should return success exit code for passing tests', () => {
      const report = {
        summary: { failed: 0 },
        regressions: []
      };

      expect(getExitCode(report)).toBe(0);
    });

    test('should return regression exit code for performance regressions', () => {
      const report = {
        summary: { failed: 0 },
        regressions: [{ regression: 25 }]
      };

      expect(getExitCode(report)).toBe(1);
    });

    test('should return critical exit code for critical regressions', () => {
      const report = {
        summary: { failed: 0 },
        regressions: [{ regression: 75 }]
      };

      expect(getExitCode(report)).toBe(2);
    });

    test('should return failure exit code for test failures', () => {
      const report = {
        summary: { failed: 2 },
        regressions: []
      };

      expect(getExitCode(report)).toBe(3);
    });
  });

  describe('Performance Thresholds', () => {
    const thresholds = {
      regressionThreshold: 20, // 20%
      maxResponseTime: 1000,   // 1 second
      minThroughput: 50,       // 50 ops/sec
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxErrorRate: 5          // 5%
    };

    test('should validate performance against thresholds', () => {
      const testResults = [
        { name: 'fast_test', duration: 500, throughput: 100, memoryUsage: 10 * 1024 * 1024, success: true },
        { name: 'slow_test', duration: 1500, throughput: 25, memoryUsage: 150 * 1024 * 1024, success: true }
      ];

      const violations = [];

      testResults.forEach(result => {
        if (result.duration > thresholds.maxResponseTime) {
          violations.push({ test: result.name, metric: 'duration', value: result.duration, threshold: thresholds.maxResponseTime });
        }
        if (result.throughput < thresholds.minThroughput) {
          violations.push({ test: result.name, metric: 'throughput', value: result.throughput, threshold: thresholds.minThroughput });
        }
        if (result.memoryUsage > thresholds.maxMemoryUsage) {
          violations.push({ test: result.name, metric: 'memory', value: result.memoryUsage, threshold: thresholds.maxMemoryUsage });
        }
      });

      expect(violations.length).toBe(3); // Should detect 3 threshold violations
      expect(violations.some(v => v.metric === 'duration')).toBe(true);
      expect(violations.some(v => v.metric === 'throughput')).toBe(true);
      expect(violations.some(v => v.metric === 'memory')).toBe(true);
    });

    test('should generate recommendations based on violations', () => {
      const violations = [
        { test: 'slow_api', metric: 'duration', value: 2000 },
        { test: 'memory_heavy', metric: 'memory', value: 200 * 1024 * 1024 },
        { test: 'low_throughput', metric: 'throughput', value: 10 }
      ];

      const recommendations = [];

      violations.forEach(violation => {
        switch (violation.metric) {
          case 'duration':
            recommendations.push(`Optimize ${violation.test} - response time is too high (${violation.value}ms)`);
            break;
          case 'memory':
            recommendations.push(`Reduce memory usage in ${violation.test} - using ${(violation.value / 1024 / 1024).toFixed(2)}MB`);
            break;
          case 'throughput':
            recommendations.push(`Improve throughput for ${violation.test} - only ${violation.value} ops/sec`);
            break;
        }
      });

      expect(recommendations.length).toBe(3);
      expect(recommendations[0]).toContain('response time is too high');
      expect(recommendations[1]).toContain('Reduce memory usage');
      expect(recommendations[2]).toContain('Improve throughput');
    });
  });

  afterAll(() => {
    // Cleanup test files
    try {
      if (existsSync(baselineFile)) {
        // Keep baseline for actual CI/CD use
      }
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });
});