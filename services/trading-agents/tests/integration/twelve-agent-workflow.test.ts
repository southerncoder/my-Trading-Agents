/**
 * Integration Tests for Complete 12-Agent Workflow
 * 
 * Tests the complete trading workflow with all enhancements integrated
 * Requirements: 7.2, 7.5
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { EnhancedTradingGraph } from '../../src/utils/enhanced-trading-graph';
import { TradingAgentsConfig } from '../../src/config';
import { BacktestEngine } from '../../src/backtesting/backtest-engine';
import { StrategyEnsemble } from '../../src/strategies/strategy-ensemble';
import { DataProviderFailover } from '../../src/resilience/data-provider-failover';
import { PerformanceMonitor } from '../../src/monitoring/performance-monitor';
import { AgentMemoryManager } from '../../src/database/agent-memory-manager';
import {
  WorkflowResult,
  PhaseResult,
  AgentResult,
  TradingDecision,
  RiskAssessment,
  MarketAnalysis,
  ResearchSynthesis
} from '../../src/types/workflow';

// Mock implementations for testing
const createMockConfig = (): TradingAgentsConfig => ({
  // Core configuration
  symbol: 'AAPL',
  analysisDepth: 'comprehensive',
  riskTolerance: 'moderate',
  
  // LLM Configuration
  llmProvider: 'openai',
  llmModel: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 4000,
  
  // Data Provider Configuration
  dataProviders: {
    primary: 'yahoo-finance',
    fallback: ['alpha-vantage', 'marketstack'],
    newsProviders: ['google-news', 'newsapi'],
    socialProviders: ['reddit']
  },
  
  // Memory Configuration
  memoryProvider: 'zep-graphiti',
  memoryConfig: {
    sessionId: 'test-session',
    userId: 'test-user'
  },
  
  // Enhanced Features
  backtesting: {
    enabled: true,
    lookbackPeriod: 252,
    commission: 0.001,
    slippage: 0.0005
  },
  
  strategyEnsemble: {
    enabled: true,
    strategies: ['rsi-momentum', 'macd', 'bollinger-bands'],
    weightingMethod: 'performance-based'
  },
  
  riskManagement: {
    enhanced: true,
    varConfidence: 0.95,
    maxPositionSize: 0.25,
    correlationThreshold: 0.7
  },
  
  dataResilience: {
    enabled: true,
    circuitBreakerThreshold: 3,
    cacheEnabled: true,
    cacheTTL: 300
  },
  
  monitoring: {
    enabled: true,
    performanceTracking: true,
    alerting: true
  }
});

const createMockMarketData = () => ({
  symbol: 'AAPL',
  price: 150.25,
  change: 2.15,
  changePercent: 1.45,
  volume: 45678900,
  marketCap: 2450000000000,
  peRatio: 28.5,
  timestamp: new Date(),
  technicalIndicators: {
    rsi: 65.2,
    macd: { macd: 1.25, signal: 0.85, histogram: 0.40 },
    bollingerBands: { upper: 155.0, middle: 150.0, lower: 145.0 },
    sma20: 148.5,
    sma50: 145.2,
    volume: 45678900
  }
});

const createMockNewsData = () => [
  {
    title: 'Apple Reports Strong Q4 Earnings',
    content: 'Apple Inc. reported better-than-expected quarterly earnings...',
    source: 'Financial Times',
    timestamp: new Date(),
    sentiment: 0.8,
    relevance: 0.9,
    url: 'https://example.com/news1'
  },
  {
    title: 'iPhone Sales Exceed Expectations',
    content: 'Latest iPhone models show strong consumer demand...',
    source: 'Reuters',
    timestamp: new Date(),
    sentiment: 0.7,
    relevance: 0.85,
    url: 'https://example.com/news2'
  }
];

const createMockSocialData = () => ({
  symbol: 'AAPL',
  sentiment: 0.65,
  confidence: 0.8,
  volume: 1250,
  timestamp: new Date(),
  sources: ['r/investing', 'r/stocks', 'r/SecurityAnalysis'],
  breakdown: {
    positive: 65,
    neutral: 25,
    negative: 10
  },
  keyTopics: ['earnings', 'iPhone', 'innovation', 'growth']
});

describe('12-Agent Workflow Integration Tests', () => {
  let tradingGraph: EnhancedTradingGraph;
  let config: TradingAgentsConfig;
  let mockMemoryManager: jest.Mocked<AgentMemoryManager>;
  let mockPerformanceMonitor: jest.Mocked<PerformanceMonitor>;

  beforeAll(async () => {
    config = createMockConfig();
    
    // Initialize mock components
    mockMemoryManager = {
      initialize: jest.fn(),
      storeEpisodicMemory: jest.fn(),
      retrieveEpisodicMemory: jest.fn(),
      storeSemanticMemory: jest.fn(),
      retrieveSemanticMemory: jest.fn(),
      storeWorkingMemory: jest.fn(),
      retrieveWorkingMemory: jest.fn(),
      storeProceduralMemory: jest.fn(),
      retrieveProceduralMemory: jest.fn()
    } as any;

    mockPerformanceMonitor = {
      trackStrategyPerformance: jest.fn(),
      calculateRollingMetrics: jest.fn(),
      detectPerformanceAnomalies: jest.fn(),
      generatePerformanceAlerts: jest.fn()
    } as any;

    tradingGraph = new EnhancedTradingGraph(config);
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Workflow Execution', () => {
    test('should execute all 4 phases successfully', async () => {
      // Mock data providers
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('AAPL');
      expect(result.timestamp).toBeInstanceOf(Date);
      
      // Verify all phases completed
      expect(result.phase1).toBeDefined();
      expect(result.phase1.marketAnalysis).toBeDefined();
      expect(result.phase1.socialAnalysis).toBeDefined();
      expect(result.phase1.newsAnalysis).toBeDefined();
      expect(result.phase1.fundamentalsAnalysis).toBeDefined();
      
      expect(result.phase2).toBeDefined();
      expect(result.phase2.bullResearch).toBeDefined();
      expect(result.phase2.bearResearch).toBeDefined();
      expect(result.phase2.researchSynthesis).toBeDefined();
      
      expect(result.phase3).toBeDefined();
      expect(result.phase3.riskyAnalysis).toBeDefined();
      expect(result.phase3.safeAnalysis).toBeDefined();
      expect(result.phase3.neutralAnalysis).toBeDefined();
      expect(result.phase3.portfolioManagement).toBeDefined();
      expect(result.phase3.enhancedRiskMetrics).toBeDefined();
      
      expect(result.phase4).toBeDefined();
      expect(result.phase4.tradingDecision).toBeDefined();
      expect(result.phase4.ensembleSignal).toBeDefined();
      expect(result.phase4.positionSize).toBeDefined();
    });

    test('should integrate enhanced risk management', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result.phase3.enhancedRiskMetrics).toBeDefined();
      expect(result.phase3.enhancedRiskMetrics.technicalRisk).toBeDefined();
      expect(result.phase3.enhancedRiskMetrics.quantitativeRisk).toBeDefined();
      expect(result.phase3.enhancedRiskMetrics.sectorSentiment).toBeDefined();
      expect(result.phase3.enhancedRiskMetrics.volatilityAnalysis).toBeDefined();
      
      // Verify risk metrics are realistic
      expect(result.phase3.enhancedRiskMetrics.technicalRisk.score).toBeGreaterThanOrEqual(0);
      expect(result.phase3.enhancedRiskMetrics.technicalRisk.score).toBeLessThanOrEqual(1);
      expect(result.phase3.enhancedRiskMetrics.quantitativeRisk.valueAtRisk).toBeGreaterThan(0);
      expect(result.phase3.enhancedRiskMetrics.volatilityAnalysis.historicalVolatility).toBeGreaterThan(0);
    });

    test('should integrate strategy ensemble', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result.phase4.ensembleSignal).toBeDefined();
      expect(result.phase4.ensembleSignal.contributingStrategies).toBeDefined();
      expect(result.phase4.ensembleSignal.contributingStrategies.length).toBeGreaterThan(0);
      expect(result.phase4.ensembleSignal.consensusStrength).toBeGreaterThanOrEqual(0);
      expect(result.phase4.ensembleSignal.confidenceWeights).toBeDefined();
      
      // Verify ensemble signal quality
      expect(result.phase4.ensembleSignal.type).toMatch(/^(BUY|SELL|HOLD)$/);
      expect(result.phase4.ensembleSignal.strength).toBeGreaterThanOrEqual(0);
      expect(result.phase4.ensembleSignal.strength).toBeLessThanOrEqual(1);
    });

    test('should integrate position sizing', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result.phase4.positionSize).toBeDefined();
      expect(result.phase4.positionSize.shares).toBeGreaterThanOrEqual(0);
      expect(result.phase4.positionSize.dollarAmount).toBeGreaterThanOrEqual(0);
      expect(result.phase4.positionSize.portfolioPercentage).toBeGreaterThanOrEqual(0);
      expect(result.phase4.positionSize.portfolioPercentage).toBeLessThanOrEqual(1);
      expect(result.phase4.positionSize.reasoning).toBeDefined();
      
      // Verify position sizing methods
      expect(result.phase4.positionSize.kellyFraction).toBeDefined();
      expect(result.phase4.positionSize.riskAdjustment).toBeDefined();
    });

    test('should store agent interactions in memory', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      await tradingGraph.executeWorkflow('AAPL');

      // Verify memory storage calls
      expect(mockMemoryManager.storeEpisodicMemory).toHaveBeenCalled();
      expect(mockMemoryManager.storeWorkingMemory).toHaveBeenCalled();
      
      // Verify memory content
      const episodicCalls = mockMemoryManager.storeEpisodicMemory.mock.calls;
      expect(episodicCalls.length).toBeGreaterThan(0);
      
      episodicCalls.forEach(call => {
        const memory = call[0];
        expect(memory.sessionId).toBeDefined();
        expect(memory.agentId).toBeDefined();
        expect(memory.interactionType).toBeDefined();
        expect(memory.input).toBeDefined();
        expect(memory.output).toBeDefined();
      });
    });
  });

  describe('Data Provider Resilience Integration', () => {
    test('should handle primary data provider failure', async () => {
      // Mock primary provider failure
      jest.spyOn(tradingGraph, 'getMarketData')
        .mockRejectedValueOnce(new Error('Yahoo Finance unavailable'))
        .mockResolvedValue(createMockMarketData());
      
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.phase1.marketAnalysis).toBeDefined();
      expect(result.warnings).toContain('Primary data provider failed, using fallback');
    });

    test('should handle partial data provider failures', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData')
        .mockRejectedValueOnce(new Error('News API rate limit'))
        .mockResolvedValue([]);
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.phase1.newsAnalysis).toBeDefined();
      expect(result.phase1.newsAnalysis.degraded).toBe(true);
      expect(result.warnings).toContain('News data unavailable, using cached data');
    });

    test('should use cached data when all providers fail', async () => {
      // Mock all providers failing
      jest.spyOn(tradingGraph, 'getMarketData').mockRejectedValue(new Error('All market data providers failed'));
      jest.spyOn(tradingGraph, 'getNewsData').mockRejectedValue(new Error('All news providers failed'));
      jest.spyOn(tradingGraph, 'getSocialData').mockRejectedValue(new Error('Social data unavailable'));

      // Mock cache returning stale data
      jest.spyOn(tradingGraph, 'getCachedData').mockResolvedValue({
        marketData: { ...createMockMarketData(), cached: true, staleness: 300 },
        newsData: { data: [], cached: true, staleness: 600 },
        socialData: { ...createMockSocialData(), cached: true, staleness: 900 }
      });

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.degraded).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.phase1.marketAnalysis.cached).toBe(true);
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should track workflow performance metrics', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const startTime = Date.now();
      const result = await tradingGraph.executeWorkflow('AAPL');
      const duration = Date.now() - startTime;

      expect(result.performanceMetrics).toBeDefined();
      expect(result.performanceMetrics.executionTime).toBeGreaterThan(0);
      expect(result.performanceMetrics.executionTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.performanceMetrics.phaseTimings).toBeDefined();
      expect(result.performanceMetrics.phaseTimings.phase1).toBeGreaterThan(0);
      expect(result.performanceMetrics.phaseTimings.phase2).toBeGreaterThan(0);
      expect(result.performanceMetrics.phaseTimings.phase3).toBeGreaterThan(0);
      expect(result.performanceMetrics.phaseTimings.phase4).toBeGreaterThan(0);

      // Verify performance monitoring calls
      expect(mockPerformanceMonitor.trackStrategyPerformance).toHaveBeenCalled();
    });

    test('should detect performance anomalies', async () => {
      // Mock slow execution
      jest.spyOn(tradingGraph, 'getMarketData').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        return createMockMarketData();
      });
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      mockPerformanceMonitor.detectPerformanceAnomalies.mockResolvedValue([
        {
          type: 'slow_execution',
          severity: 'warning',
          message: 'Phase 1 execution time exceeded threshold',
          timestamp: new Date(),
          metrics: { executionTime: 5000, threshold: 2000 }
        }
      ]);

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result.performanceAnomalies).toBeDefined();
      expect(result.performanceAnomalies.length).toBeGreaterThan(0);
      expect(result.performanceAnomalies[0].type).toBe('slow_execution');
    });

    test('should generate alerts for critical issues', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      // Mock critical risk level
      const highRiskResult = await tradingGraph.executeWorkflow('AAPL');
      
      mockPerformanceMonitor.generatePerformanceAlerts.mockResolvedValue([
        {
          id: 'alert-1',
          type: 'high_risk',
          severity: 'critical',
          message: 'Risk metrics exceed acceptable thresholds',
          timestamp: new Date(),
          acknowledged: false,
          data: { riskScore: 0.95, threshold: 0.8 }
        }
      ]);

      expect(mockPerformanceMonitor.generatePerformanceAlerts).toHaveBeenCalled();
    });
  });

  describe('Backtesting Integration', () => {
    test('should integrate backtesting results with workflow', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      // Mock backtesting results
      const mockBacktestResult = {
        trades: [
          {
            id: 'trade-1',
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 100,
            price: 150,
            executedPrice: 150.05,
            timestamp: new Date(),
            commission: 0.15,
            slippage: 0.05,
            status: 'FILLED'
          }
        ],
        performance: {
          totalReturn: 0.12,
          sharpeRatio: 1.25,
          maxDrawdown: 0.08,
          winRate: 0.65,
          profitFactor: 1.8
        },
        equity: [
          { timestamp: new Date(), value: 100000 },
          { timestamp: new Date(), value: 112000 }
        ]
      };

      jest.spyOn(tradingGraph, 'runBacktest').mockResolvedValue(mockBacktestResult);

      const result = await tradingGraph.executeWorkflow('AAPL', { includeBacktest: true });

      expect(result.backtestResults).toBeDefined();
      expect(result.backtestResults.performance.totalReturn).toBe(0.12);
      expect(result.backtestResults.performance.sharpeRatio).toBe(1.25);
      expect(result.phase4.tradingDecision.backtestValidation).toBeDefined();
    });

    test('should adjust trading decision based on backtest results', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      // Mock poor backtesting results
      const poorBacktestResult = {
        trades: [],
        performance: {
          totalReturn: -0.15,
          sharpeRatio: -0.5,
          maxDrawdown: 0.25,
          winRate: 0.35,
          profitFactor: 0.6
        },
        equity: [
          { timestamp: new Date(), value: 100000 },
          { timestamp: new Date(), value: 85000 }
        ]
      };

      jest.spyOn(tradingGraph, 'runBacktest').mockResolvedValue(poorBacktestResult);

      const result = await tradingGraph.executeWorkflow('AAPL', { includeBacktest: true });

      expect(result.phase4.tradingDecision.action).toBe('HOLD'); // Should be conservative
      expect(result.phase4.tradingDecision.confidence).toBeLessThan(0.5);
      expect(result.phase4.tradingDecision.reasoning).toContain('backtest');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle agent failures gracefully', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      // Mock agent failure
      jest.spyOn(tradingGraph, 'executeAgent').mockImplementation(async (agentId: string) => {
        if (agentId === 'social-analyst') {
          throw new Error('Social analyst failed');
        }
        return { success: true, result: 'Mock result' };
      });

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Social analyst failed');
      expect(result.phase1.socialAnalysis.degraded).toBe(true);
    });

    test('should continue workflow with partial failures', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockRejectedValue(new Error('News service down'));
      jest.spyOn(tradingGraph, 'getSocialData').mockRejectedValue(new Error('Social service down'));

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.phase1.marketAnalysis).toBeDefined(); // Should still have market analysis
      expect(result.phase1.fundamentalsAnalysis).toBeDefined(); // Should still have fundamentals
      expect(result.phase2).toBeDefined(); // Should continue to phase 2
      expect(result.phase3).toBeDefined(); // Should continue to phase 3
      expect(result.phase4).toBeDefined(); // Should complete workflow
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.degraded).toBe(true);
    });

    test('should handle memory system failures', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      // Mock memory failures
      mockMemoryManager.storeEpisodicMemory.mockRejectedValue(new Error('Memory storage failed'));
      mockMemoryManager.retrieveSemanticMemory.mockRejectedValue(new Error('Memory retrieval failed'));

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.warnings).toContain('Memory system unavailable, using stateless mode');
      expect(result.memoryDegraded).toBe(true);
    });
  });

  describe('Concurrent Workflow Execution', () => {
    test('should handle multiple concurrent workflows', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      
      const startTime = Date.now();
      const results = await Promise.all(
        symbols.map(symbol => tradingGraph.executeWorkflow(symbol))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds

      results.forEach((result, index) => {
        expect(result.symbol).toBe(symbols[index]);
        expect(result.phase1).toBeDefined();
        expect(result.phase2).toBeDefined();
        expect(result.phase3).toBeDefined();
        expect(result.phase4).toBeDefined();
      });
    });

    test('should maintain performance under load', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        tradingGraph.executeWorkflow(`STOCK${i}`)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentRequests);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBeGreaterThan(8); // Most should succeed
      expect(failed.length).toBeLessThan(2); // Few should fail
      expect(duration).toBeLessThan(120000); // Should complete within 2 minutes
    });
  });

  describe('Configuration Flexibility', () => {
    test('should adapt to different risk tolerance settings', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      // Test conservative configuration
      const conservativeConfig = { ...config, riskTolerance: 'conservative' };
      const conservativeGraph = new EnhancedTradingGraph(conservativeConfig);
      const conservativeResult = await conservativeGraph.executeWorkflow('AAPL');

      // Test aggressive configuration
      const aggressiveConfig = { ...config, riskTolerance: 'aggressive' };
      const aggressiveGraph = new EnhancedTradingGraph(aggressiveConfig);
      const aggressiveResult = await aggressiveGraph.executeWorkflow('AAPL');

      // Conservative should have lower position sizes and higher risk thresholds
      expect(conservativeResult.phase4.positionSize.portfolioPercentage)
        .toBeLessThan(aggressiveResult.phase4.positionSize.portfolioPercentage);
      
      expect(conservativeResult.phase3.enhancedRiskMetrics.riskThreshold)
        .toBeLessThan(aggressiveResult.phase3.enhancedRiskMetrics.riskThreshold);
    });

    test('should work with different analysis depths', async () => {
      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(createMockMarketData());
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      // Test quick analysis
      const quickConfig = { ...config, analysisDepth: 'quick' };
      const quickGraph = new EnhancedTradingGraph(quickConfig);
      const quickStart = Date.now();
      const quickResult = await quickGraph.executeWorkflow('AAPL');
      const quickDuration = Date.now() - quickStart;

      // Test comprehensive analysis
      const comprehensiveConfig = { ...config, analysisDepth: 'comprehensive' };
      const comprehensiveGraph = new EnhancedTradingGraph(comprehensiveConfig);
      const comprehensiveStart = Date.now();
      const comprehensiveResult = await comprehensiveGraph.executeWorkflow('AAPL');
      const comprehensiveDuration = Date.now() - comprehensiveStart;

      expect(quickResult).toBeDefined();
      expect(comprehensiveResult).toBeDefined();
      expect(quickDuration).toBeLessThan(comprehensiveDuration);
      
      // Comprehensive should have more detailed analysis
      expect(comprehensiveResult.phase1.marketAnalysis.details.length)
        .toBeGreaterThan(quickResult.phase1.marketAnalysis.details.length);
    });
  });

  describe('Real-world Scenario Simulation', () => {
    test('should handle market volatility scenario', async () => {
      // Mock high volatility market data
      const volatileMarketData = {
        ...createMockMarketData(),
        change: -15.75,
        changePercent: -9.5,
        volume: 125000000, // High volume
        technicalIndicators: {
          ...createMockMarketData().technicalIndicators,
          rsi: 25, // Oversold
          volatility: 0.45 // High volatility
        }
      };

      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(volatileMarketData);
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue([
        {
          title: 'Market Crash: Tech Stocks Plummet',
          content: 'Major selloff in technology sector...',
          source: 'Bloomberg',
          timestamp: new Date(),
          sentiment: -0.8,
          relevance: 0.95,
          url: 'https://example.com/crash'
        }
      ]);
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue({
        ...createMockSocialData(),
        sentiment: -0.6,
        breakdown: { positive: 15, neutral: 25, negative: 60 }
      });

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.phase3.enhancedRiskMetrics.volatilityAnalysis.volatilityRegime).toBe('high');
      expect(result.phase4.positionSize.portfolioPercentage).toBeLessThan(0.1); // Should be very conservative
      expect(result.phase4.tradingDecision.action).toMatch(/^(HOLD|SELL)$/); // Should not buy in crash
    });

    test('should handle earnings announcement scenario', async () => {
      // Mock earnings announcement data
      const earningsMarketData = {
        ...createMockMarketData(),
        change: 8.25,
        changePercent: 5.8,
        volume: 85000000, // High volume
        technicalIndicators: {
          ...createMockMarketData().technicalIndicators,
          rsi: 75, // Overbought
        }
      };

      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(earningsMarketData);
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue([
        {
          title: 'Apple Beats Earnings Expectations',
          content: 'Strong quarterly results exceed analyst estimates...',
          source: 'CNBC',
          timestamp: new Date(),
          sentiment: 0.9,
          relevance: 0.98,
          url: 'https://example.com/earnings'
        }
      ]);

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.phase1.newsAnalysis.sentiment).toBeGreaterThan(0.8);
      expect(result.phase4.ensembleSignal.type).toMatch(/^(BUY|HOLD)$/);
      expect(result.phase4.tradingDecision.confidence).toBeGreaterThan(0.7);
    });

    test('should handle low liquidity scenario', async () => {
      // Mock low liquidity conditions
      const lowLiquidityData = {
        ...createMockMarketData(),
        volume: 5000000, // Very low volume
        technicalIndicators: {
          ...createMockMarketData().technicalIndicators,
          volume: 5000000
        }
      };

      jest.spyOn(tradingGraph, 'getMarketData').mockResolvedValue(lowLiquidityData);
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue(createMockNewsData());
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue(createMockSocialData());

      const result = await tradingGraph.executeWorkflow('AAPL');

      expect(result).toBeDefined();
      expect(result.phase3.enhancedRiskMetrics.liquidityRisk).toBeDefined();
      expect(result.phase3.enhancedRiskMetrics.liquidityRisk.score).toBeGreaterThan(0.6);
      expect(result.phase4.positionSize.liquidityAdjustment).toBeLessThan(1); // Should reduce position size
    });
  });
});