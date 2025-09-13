/**
 * Testing Service for Enhanced Trading Graph
 *
 * Handles test instance creation and integration testing.
 */

import { TradingAgentsConfig } from '../../types/config';
import { createLogger } from '../../utils/enhanced-logger';

export interface TestingServiceConfig {
  enableTesting: boolean;
}

/**
 * Service for managing testing operations and test instances
 */
export class TestingService {
  private logger: any;
  private enableTesting: boolean;

  constructor(config: TestingServiceConfig) {
    this.logger = createLogger('graph', 'testing-service');
    this.enableTesting = config.enableTesting;
  }

  /**
   * Create a test instance with LM Studio configuration
   */
  createTestInstance(): any {
    if (!this.enableTesting) {
      throw new Error('Testing is not enabled');
    }

    try {
      const config: TradingAgentsConfig = {
        projectDir: process.env.TRADINGAGENTS_PROJECT_DIR || './project',
        resultsDir: process.env.TRADINGAGENTS_RESULTS_DIR || './results',
        dataDir: process.env.TRADINGAGENTS_DATA_DIR || './data',
        dataCacheDir: process.env.TRADINGAGENTS_CACHE_DIR || './cache',
        exportsDir: process.env.TRADINGAGENTS_EXPORTS_DIR || './exports',
        logsDir: process.env.TRADINGAGENTS_LOGS_DIR || './logs',
        llmProvider: 'lm_studio',
        deepThinkLlm: 'microsoft/phi-4-mini-reasoning',
        quickThinkLlm: 'microsoft/phi-4-mini-reasoning',
        backendUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
        maxDebateRounds: 3,
        maxRiskDiscussRounds: 3,
        maxRecurLimit: 5,
        onlineTools: false
      };

      // Import the main graph class dynamically to avoid circular dependencies
      const { EnhancedTradingAgentsGraph } = require('../enhanced-trading-graph');

      const testInstance = new EnhancedTradingAgentsGraph({
        config,
        selectedAnalysts: ['market', 'social'],
        enableLangGraph: true,
        enableLazyLoading: true,
        enableStateOptimization: true
      });

      this.logger.info('createTestInstance', 'Test instance created successfully');
      return testInstance;
    } catch (error) {
      this.logger.error('createTestInstance', 'Failed to create test instance', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Run a complete integration test
   */
  async runIntegrationTest(): Promise<boolean> {
    if (!this.enableTesting) {
      this.logger.warn('runIntegrationTest', 'Testing is not enabled');
      return false;
    }

    try {
      this.logger.info('runIntegrationTest', '🚀 Running Enhanced Trading Agents Graph Integration Test...');

      // Create test instance
      const graph = this.createTestInstance();

      // Test configuration
      const configInfo = graph.getConfigInfo();
      this.logger.info('runIntegrationTest', 'Configuration loaded successfully', { config: configInfo });

      // Test workflow initialization
      await graph.initializeWorkflow();
      this.logger.info('runIntegrationTest', 'Workflow initialized successfully');

      // Test workflow connectivity
      const testResult = await graph.testWorkflow();
      if (testResult.success) {
        this.logger.info('runIntegrationTest', 'Workflow connectivity test passed');
      } else {
        this.logger.error('runIntegrationTest', 'Workflow connectivity test failed', { error: testResult.error });
        return false;
      }

      // Test full analysis
      const analysisResult = await graph.analyzeAndDecide('AAPL', '2025-08-24');
      this.logger.info('runIntegrationTest', 'Full analysis test completed successfully', {
        decision: analysisResult.decision,
        confidence: analysisResult.confidence,
        reasoningCount: analysisResult.reasoning.length
      });

      this.logger.info('runIntegrationTest', '🎉 All Enhanced Trading Agents Graph tests passed!');
      return true;
    } catch (error) {
      this.logger.error('runIntegrationTest', 'Enhanced Trading Agents Graph test failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Run performance test
   */
  async runPerformanceTest(iterations: number = 5): Promise<any> {
    if (!this.enableTesting) {
      this.logger.warn('runPerformanceTest', 'Testing is not enabled');
      return { error: 'Testing not enabled' };
    }

    try {
      this.logger.info('runPerformanceTest', `Running performance test with ${iterations} iterations...`);

      const results: any[] = [];
      const graph = this.createTestInstance();

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        try {
          const result = await graph.analyzeAndDecide('AAPL', '2025-08-24');
          const endTime = Date.now();
          const duration = endTime - startTime;

          results.push({
            iteration: i + 1,
            success: true,
            duration,
            decision: result.decision,
            confidence: result.confidence
          });

          this.logger.info('runPerformanceTest', `Iteration ${i + 1} completed`, {
            duration,
            decision: result.decision,
            confidence: result.confidence
          });
        } catch (error) {
          const endTime = Date.now();
          const duration = endTime - startTime;

          results.push({
            iteration: i + 1,
            success: false,
            duration,
            error: error instanceof Error ? error.message : String(error)
          });

          this.logger.warn('runPerformanceTest', `Iteration ${i + 1} failed`, {
            duration,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Calculate statistics
      const successfulRuns = results.filter(r => r.success);
      const avgDuration = successfulRuns.reduce((sum, r) => sum + r.duration, 0) / successfulRuns.length;
      const minDuration = Math.min(...successfulRuns.map(r => r.duration));
      const maxDuration = Math.max(...successfulRuns.map(r => r.duration));

      const performanceStats = {
        totalIterations: iterations,
        successfulRuns: successfulRuns.length,
        failedRuns: iterations - successfulRuns.length,
        successRate: (successfulRuns.length / iterations) * 100,
        averageDuration: avgDuration,
        minDuration,
        maxDuration,
        results
      };

      this.logger.info('runPerformanceTest', 'Performance test completed', {
        successRate: performanceStats.successRate,
        averageDuration: performanceStats.averageDuration
      });

      return performanceStats;
    } catch (error) {
      this.logger.error('runPerformanceTest', 'Performance test failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { error: 'Performance test failed' };
    }
  }

  /**
   * Check if testing is available
   */
  isTestingAvailable(): boolean {
    return this.enableTesting;
  }
}

/**
 * Factory function to create TestingService instance
 */
export function createTestingService(config: TestingServiceConfig): TestingService {
  return new TestingService(config);
}