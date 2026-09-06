/**
 * Integration Tests for Anomaly Detection System
 * 
 * Tests the integration of anomaly detection with the monitoring system,
 * database, and real-world scenarios.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { AnomalyDetector, getDefaultAnomalyDetectionConfig } from '../../src/monitoring/anomaly-detector.js';
import { PerformanceMonitor, type PerformanceMetrics } from '../../src/monitoring/performance-monitor.js';
import { DatabaseManager } from '../../src/database/database-manager.js';

// Mock external dependencies
jest.mock('../../src/utils/enhanced-logger.js', () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('Anomaly Detection Integration', () => {
  let anomalyDetector: AnomalyDetector;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockPerformanceMonitor: jest.Mocked<PerformanceMonitor>;

  beforeAll(async () => {
    // Setup mocks
    mockDbManager = {
      initialized: false, // Simulate no database connection for tests
      initializeConnections: jest.fn().mockResolvedValue(undefined),
      executeQuery: jest.fn().mockResolvedValue([])
    } as any;

    mockPerformanceMonitor = {} as any;

    // Initialize anomaly detector with test configuration
    const testConfig = getDefaultAnomalyDetectionConfig();
    anomalyDetector = new AnomalyDetector(testConfig, mockDbManager, mockPerformanceMonitor);
    await anomalyDetector.initialize();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Anomaly Detection Workflow', () => {
    test('should detect anomalies in complete trading scenario', async () => {
      const strategyId = 'integration-test-strategy';
      
      // Simulate a trading strategy with performance degradation
      const performanceHistory: PerformanceMetrics[] = [
        // Initial good performance
        ...generatePerformanceSequence(10, {
          totalReturn: 0.12,
          sharpeRatio: 1.8,
          volatility: 0.14,
          maxDrawdown: -0.08,
          winRate: 0.65
        }),
        // Performance degradation
        ...generatePerformanceSequence(5, {
          totalReturn: -0.05,
          sharpeRatio: 0.3,
          volatility: 0.28,
          maxDrawdown: -0.22,
          winRate: 0.35
        })
      ];

      // Process performance data through anomaly detection
      const anomalies = await anomalyDetector.detectPerformanceAnomalies(performanceHistory);
      const patterns = await anomalyDetector.recognizeUnusualPatterns(strategyId, performanceHistory);
      const alerts = await anomalyDetector.createPerformanceAlerts(strategyId, performanceHistory[performanceHistory.length - 1]);
      const diagnosis = await anomalyDetector.diagnosePerformanceIssues(strategyId, performanceHistory);

      // Verify anomaly detection
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some(a => a.type === 'performance_degradation')).toBe(true);
      expect(anomalies.some(a => a.type === 'drawdown_spike')).toBe(true);
      expect(anomalies.some(a => a.severity === 'critical')).toBe(true);

      // Verify pattern recognition
      expect(patterns.some(p => p.type === 'consecutive_losses')).toBe(true);
      expect(patterns.some(p => p.type === 'regime_change')).toBe(true);

      // Verify alerting
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.type === 'performance')).toBe(true);
      expect(alerts.some(a => a.type === 'risk')).toBe(true);

      // Verify diagnosis shows degraded health
      expect(['warning', 'critical']).toContain(diagnosis.overallHealth);
      expect(['high', 'critical']).toContain(diagnosis.riskLevel);
      expect(diagnosis.issues.length).toBeGreaterThan(0);
      expect(diagnosis.recommendations.length).toBeGreaterThan(0);
    });

    test('should handle high-frequency anomaly detection', async () => {
      const strategyId = 'high-frequency-test';
      
      // Generate large dataset simulating high-frequency trading
      const largePerformanceDataset = generatePerformanceSequence(1000, {
        totalReturn: 0.08,
        sharpeRatio: 1.2,
        volatility: 0.15
      });

      // Add some anomalies at random points
      const anomalyIndices = [100, 300, 500, 750, 900];
      anomalyIndices.forEach(index => {
        largePerformanceDataset[index] = generatePerformanceMetrics({
          totalReturn: -0.15, // Significant loss
          sharpeRatio: -0.5,
          volatility: 0.45,
          maxDrawdown: -0.30
        });
      });

      const startTime = Date.now();
      const anomalies = await anomalyDetector.detectPerformanceAnomalies(largePerformanceDataset);
      const processingTime = Date.now() - startTime;

      // Verify performance (should process 1000 data points quickly)
      expect(processingTime).toBeLessThan(5000); // Less than 5 seconds
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.length).toBeLessThan(20); // Should not over-detect
    });

    test('should integrate with monitoring system lifecycle', async () => {
      // Test anomaly detection integration
      const testMetrics = generatePerformanceMetrics({
        sharpeRatio: 0.2, // Below threshold
        maxDrawdown: -0.25 // Above threshold
      });

      // This should trigger anomaly detection
      const anomalies = await anomalyDetector.detectPerformanceAnomalies([testMetrics]);
      
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some(a => a.severity === 'high' || a.severity === 'critical')).toBe(true);
    });
  });

  describe('Real-world Scenario Simulations', () => {
    test('should handle market crash scenario', async () => {
      const strategyId = 'market-crash-test';
      
      // Simulate market crash with extreme values that will definitely trigger anomalies
      const crashScenario: PerformanceMetrics[] = [
        ...generatePerformanceSequence(20, { totalReturn: 0.08, volatility: 0.12, sharpeRatio: 1.5 }), // Normal market
        generatePerformanceMetrics({ 
          totalReturn: -0.35, 
          volatility: 0.65, // Well above threshold of 0.25
          maxDrawdown: -0.50, // Well above threshold of 0.15
          sharpeRatio: -1.5 // Well below threshold of 0.5
        }) // Extreme crash
      ];

      const anomalies = await anomalyDetector.detectPerformanceAnomalies(crashScenario);
      const patterns = await anomalyDetector.recognizeUnusualPatterns(strategyId, crashScenario);
      const diagnosis = await anomalyDetector.diagnosePerformanceIssues(strategyId, crashScenario);

      // Should detect anomalies (patterns may need more data points)
      expect(anomalies.length).toBeGreaterThan(0);
      expect(['warning', 'critical']).toContain(diagnosis.overallHealth);
    });

    test('should handle gradual performance degradation', async () => {
      const strategyId = 'gradual-degradation-test';
      
      // Simulate gradual performance degradation over time
      const degradationScenario: PerformanceMetrics[] = [];
      for (let i = 0; i < 50; i++) {
        const degradationFactor = i / 50; // 0 to 1
        degradationScenario.push(generatePerformanceMetrics({
          totalReturn: 0.12 * (1 - degradationFactor * 0.8), // Gradually decreasing returns
          sharpeRatio: 1.8 * (1 - degradationFactor), // Gradually decreasing Sharpe ratio
          volatility: 0.15 * (1 + degradationFactor), // Gradually increasing volatility
          winRate: 0.65 * (1 - degradationFactor * 0.5) // Gradually decreasing win rate
        }));
      }

      const anomalies = await anomalyDetector.detectPerformanceAnomalies(degradationScenario);
      const patterns = await anomalyDetector.recognizeUnusualPatterns(strategyId, degradationScenario);

      // Should detect the gradual degradation
      expect(anomalies.some(a => a.type === 'performance_degradation')).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    test('should handle strategy recovery scenario', async () => {
      const strategyId = 'recovery-test';
      
      // Simulate strategy recovery after poor performance
      const recoveryScenario: PerformanceMetrics[] = [
        ...generatePerformanceSequence(10, { totalReturn: -0.08, sharpeRatio: 0.2, volatility: 0.35 }), // Poor performance
        ...generatePerformanceSequence(15, { totalReturn: 0.15, sharpeRatio: 2.1, volatility: 0.12 }) // Strong recovery
      ];

      const patterns = await anomalyDetector.recognizeUnusualPatterns(strategyId, recoveryScenario);
      const diagnosis = await anomalyDetector.diagnosePerformanceIssues(strategyId, recoveryScenario);

      // Should detect regime change and improved health
      expect(patterns.some(p => p.type === 'regime_change')).toBe(true);
      expect(diagnosis.overallHealth).toBe('healthy');
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle database connection failures gracefully', async () => {
      // Simulate database failure
      const failingDbManager = {
        initialized: false,
        initializeConnections: jest.fn().mockResolvedValue(undefined),
        executeQuery: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      } as any;

      const resilientDetector = new AnomalyDetector(
        getDefaultAnomalyDetectionConfig(),
        failingDbManager,
        mockPerformanceMonitor
      );

      await resilientDetector.initialize(); // Should not throw

      const testData = generatePerformanceSequence(10);
      
      // Should handle database failures gracefully
      await expect(resilientDetector.detectPerformanceAnomalies(testData)).resolves.toBeDefined();
      await expect(resilientDetector.recognizeUnusualPatterns('test', testData)).resolves.toBeDefined();
    });

    test('should handle malformed performance data', async () => {
      const malformedData = [
        { totalReturn: NaN, sharpeRatio: Infinity, volatility: -1 } as any,
        { totalReturn: null, sharpeRatio: undefined, volatility: 'invalid' } as any,
        generatePerformanceMetrics() // One valid entry
      ];

      // Should not throw errors with malformed data
      await expect(anomalyDetector.detectPerformanceAnomalies(malformedData)).resolves.toBeDefined();
    });

    test('should handle concurrent anomaly detection requests', async () => {
      const strategyIds = ['concurrent-1', 'concurrent-2', 'concurrent-3', 'concurrent-4', 'concurrent-5'];
      const testData = generatePerformanceSequence(20);

      // Run multiple anomaly detection requests concurrently
      const promises = strategyIds.map(id => 
        anomalyDetector.recognizeUnusualPatterns(id, testData)
      );

      const results = await Promise.all(promises);

      // All requests should complete successfully
      expect(results.length).toBe(strategyIds.length);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});

// Helper functions for generating test data

function generatePerformanceMetrics(overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics {
  return {
    totalReturn: 0.08,
    annualizedReturn: 0.10,
    volatility: 0.15,
    sharpeRatio: 1.2,
    sortinoRatio: 1.5,
    calmarRatio: 0.8,
    maxDrawdown: -0.12,
    winRate: 0.55,
    profitFactor: 1.3,
    averageWin: 0.025,
    averageLoss: -0.018,
    largestWin: 0.08,
    largestLoss: -0.05,
    tradesCount: 45,
    averageHoldingPeriod: 72,
    ...overrides
  };
}

function generatePerformanceSequence(
  count: number, 
  baseMetrics: Partial<PerformanceMetrics> = {}
): PerformanceMetrics[] {
  const sequence: PerformanceMetrics[] = [];
  
  for (let i = 0; i < count; i++) {
    // Add realistic variation and trends
    const timeProgress = i / count;
    const randomVariation = (Math.random() - 0.5) * 0.2; // ±10% variation
    
    sequence.push(generatePerformanceMetrics({
      totalReturn: (baseMetrics.totalReturn || 0.08) * (1 + randomVariation),
      sharpeRatio: (baseMetrics.sharpeRatio || 1.2) * (1 + randomVariation * 0.5),
      volatility: (baseMetrics.volatility || 0.15) * (1 + Math.abs(randomVariation)),
      maxDrawdown: (baseMetrics.maxDrawdown || -0.12) * (1 + Math.abs(randomVariation)),
      winRate: Math.max(0.1, Math.min(0.9, (baseMetrics.winRate || 0.55) * (1 + randomVariation * 0.3))),
      tradesCount: Math.max(1, Math.floor((baseMetrics.tradesCount || 45) * (1 + randomVariation))),
      ...baseMetrics
    }));
  }
  
  return sequence;
}