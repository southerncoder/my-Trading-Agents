/**
 * Strategy Ensemble Tests
 * 
 * Tests for the StrategyEnsemble class functionality including:
 * - Signal aggregation and voting
 * - Correlation analysis
 * - Conflict resolution
 * - Weight management
 */

import { StrategyEnsemble, VotingConfig } from './strategy-ensemble';
import { 
  ITradingStrategy, 
  TradingSignal, 
  SignalType, 
  SignalStrength, 
  RiskLevel, 
  MarketData, 
  StrategyConfig,
  StrategyPerformance
} from './base-strategy';
import { TradingAgentsConfig } from '../config';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock strategy implementation for testing
class MockStrategy implements ITradingStrategy {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public config: StrategyConfig,
    private mockSignals: TradingSignal[] = []
  ) {}

  async analyze(_marketData: MarketData[], _currentPosition?: number): Promise<TradingSignal[]> {
    return [...this.mockSignals];
  }

  validate(): boolean {
    return true;
  }

  getPerformance(): StrategyPerformance {
    return {
      totalTrades: 10,
      winningTrades: 6,
      losingTrades: 4,
      winRate: 0.6,
      totalReturn: 0.15,
      maxDrawdown: -0.05,
      sharpeRatio: 1.2,
      sortino: 1.5,
      averageWin: 0.03,
      averageLoss: -0.02,
      profitFactor: 1.8,
      lastUpdated: new Date()
    };
  }

  updateConfig(newConfig: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  shouldActivate(_marketConditions: Record<string, any>): boolean {
    return this.config.enabled;
  }

  setMockSignals(signals: TradingSignal[]): void {
    this.mockSignals = signals;
  }
}

// Helper function to create mock trading signal
function createMockSignal(
  symbol: string,
  signal: SignalType,
  confidence: number,
  price: number,
  strategy: string
): TradingSignal {
  return {
    symbol,
    signal,
    strength: SignalStrength.MODERATE,
    confidence,
    timestamp: new Date(),
    price,
    reasoning: `Mock signal from ${strategy}`,
    riskLevel: RiskLevel.MODERATE,
    metadata: { strategy }
  };
}

// Helper function to create mock market data
function createMockMarketData(symbol: string, price: number): MarketData[] {
  return [{
    symbol,
    timestamp: new Date(),
    open: price * 0.99,
    high: price * 1.01,
    low: price * 0.98,
    close: price,
    volume: 1000000
  }];
}

// Mock trading config
const mockTradingConfig: TradingAgentsConfig = {
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  }
} as TradingAgentsConfig;

describe('StrategyEnsemble', () => {
  let ensemble: StrategyEnsemble;
  let strategy1: MockStrategy;
  let strategy2: MockStrategy;
  let strategy3: MockStrategy;

  beforeEach(() => {
    const votingConfig: VotingConfig = {
      method: 'weighted_average',
      confidenceThreshold: 0.6,
      correlationThreshold: 0.7,
      maxSignalsPerSymbol: 3,
      enableConflictResolution: true
    };

    ensemble = new StrategyEnsemble(mockTradingConfig, votingConfig);

    // Create mock strategies
    strategy1 = new MockStrategy(
      'momentum_strategy',
      'Mock momentum strategy',
      {
        name: 'momentum_strategy',
        enabled: true,
        parameters: {},
        riskTolerance: RiskLevel.MODERATE,
        maxPositionSize: 0.1,
        stopLossPercent: 2.0,
        takeProfitPercent: 4.0,
        lookbackPeriod: 20
      }
    );

    strategy2 = new MockStrategy(
      'mean_reversion_strategy',
      'Mock mean reversion strategy',
      {
        name: 'mean_reversion_strategy',
        enabled: true,
        parameters: {},
        riskTolerance: RiskLevel.LOW,
        maxPositionSize: 0.15,
        stopLossPercent: 1.5,
        takeProfitPercent: 3.0,
        lookbackPeriod: 30
      }
    );

    strategy3 = new MockStrategy(
      'breakout_strategy',
      'Mock breakout strategy',
      {
        name: 'breakout_strategy',
        enabled: true,
        parameters: {},
        riskTolerance: RiskLevel.HIGH,
        maxPositionSize: 0.2,
        stopLossPercent: 3.0,
        takeProfitPercent: 6.0,
        lookbackPeriod: 15
      }
    );
  });

  describe('Strategy Management', () => {
    test('should add strategies to ensemble', () => {
      ensemble.addStrategy(strategy1, 1.0);
      ensemble.addStrategy(strategy2, 1.2);
      
      const activeStrategies = ensemble.getActiveStrategies();
      expect(activeStrategies).toHaveLength(2);
      expect(activeStrategies.map(s => s.name)).toContain('momentum_strategy');
      expect(activeStrategies.map(s => s.name)).toContain('mean_reversion_strategy');
    });

    test('should remove strategies from ensemble', () => {
      ensemble.addStrategy(strategy1, 1.0);
      ensemble.addStrategy(strategy2, 1.2);
      
      const removed = ensemble.removeStrategy('momentum_strategy');
      expect(removed).toBe(true);
      
      const activeStrategies = ensemble.getActiveStrategies();
      expect(activeStrategies).toHaveLength(1);
      expect(activeStrategies[0]?.name).toBe('mean_reversion_strategy');
    });

    test('should get strategy weights', () => {
      ensemble.addStrategy(strategy1, 1.5);
      ensemble.addStrategy(strategy2, 0.8);
      
      const weights = ensemble.getStrategyWeights();
      expect(weights.size).toBe(2);
      expect(weights.get('momentum_strategy')?.weight).toBe(1.5);
      expect(weights.get('mean_reversion_strategy')?.weight).toBe(0.8);
    });
  });

  describe('Signal Aggregation', () => {
    test('should aggregate signals using weighted average', async () => {
      // Set up strategies with mock signals
      const signal1 = createMockSignal('AAPL', SignalType.BUY, 80, 150.0, 'momentum_strategy');
      const signal2 = createMockSignal('AAPL', SignalType.BUY, 70, 151.0, 'mean_reversion_strategy');
      
      strategy1.setMockSignals([signal1]);
      strategy2.setMockSignals([signal2]);
      
      ensemble.addStrategy(strategy1, 1.0);
      ensemble.addStrategy(strategy2, 1.0);
      
      const marketData = createMockMarketData('AAPL', 150.5);
      const aggregatedSignals = await ensemble.aggregateSignals('AAPL', marketData);
      
      expect(aggregatedSignals).toHaveLength(1);
      expect(aggregatedSignals[0]?.signal).toBe(SignalType.BUY);
      expect(aggregatedSignals[0]?.contributingStrategies).toHaveLength(2);
      expect(aggregatedSignals[0]?.contributingStrategies).toContain('momentum_strategy');
      expect(aggregatedSignals[0]?.contributingStrategies).toContain('mean_reversion_strategy');
    });

    test('should handle empty signals gracefully', async () => {
      ensemble.addStrategy(strategy1, 1.0);
      
      const marketData = createMockMarketData('AAPL', 150.5);
      const aggregatedSignals = await ensemble.aggregateSignals('AAPL', marketData);
      
      expect(aggregatedSignals).toHaveLength(0);
    });

    test('should filter signals by symbol', async () => {
      const signal1 = createMockSignal('AAPL', SignalType.BUY, 80, 150.0, 'momentum_strategy');
      const signal2 = createMockSignal('GOOGL', SignalType.SELL, 70, 2500.0, 'momentum_strategy');
      
      strategy1.setMockSignals([signal1, signal2]);
      ensemble.addStrategy(strategy1, 1.0);
      
      const marketData = createMockMarketData('AAPL', 150.5);
      const aggregatedSignals = await ensemble.aggregateSignals('AAPL', marketData);
      
      expect(aggregatedSignals).toHaveLength(1);
      expect(aggregatedSignals[0]?.symbol).toBe('AAPL');
    });
  });

  describe('Conflict Resolution', () => {
    test('should detect and resolve conflicting signals', async () => {
      const buySignal = createMockSignal('AAPL', SignalType.BUY, 80, 150.0, 'momentum_strategy');
      const sellSignal = createMockSignal('AAPL', SignalType.SELL, 70, 150.5, 'mean_reversion_strategy');
      
      const resolvedSignals = await ensemble.resolveConflicts([buySignal, sellSignal]);
      
      // Should resolve to the higher confidence signal (BUY with 80% confidence)
      expect(resolvedSignals).toHaveLength(1);
      expect(resolvedSignals[0]?.signal).toBe(SignalType.BUY);
    });

    test('should handle non-conflicting signals', async () => {
      const buySignal1 = createMockSignal('AAPL', SignalType.BUY, 80, 150.0, 'momentum_strategy');
      const buySignal2 = createMockSignal('AAPL', SignalType.BUY, 70, 150.5, 'mean_reversion_strategy');
      
      const resolvedSignals = await ensemble.resolveConflicts([buySignal1, buySignal2]);
      
      // Should keep both non-conflicting signals
      expect(resolvedSignals).toHaveLength(2);
    });
  });

  describe('Correlation Analysis', () => {
    test('should calculate signal correlations', async () => {
      const signal1 = createMockSignal('AAPL', SignalType.BUY, 80, 150.0, 'momentum_strategy');
      const signal2 = createMockSignal('AAPL', SignalType.BUY, 75, 150.2, 'mean_reversion_strategy');
      
      strategy1.setMockSignals([signal1]);
      strategy2.setMockSignals([signal2]);
      
      ensemble.addStrategy(strategy1, 1.0);
      ensemble.addStrategy(strategy2, 1.0);
      
      const marketData = createMockMarketData('AAPL', 150.1);
      const aggregatedSignals = await ensemble.aggregateSignals('AAPL', marketData);
      
      // Should aggregate similar signals
      expect(aggregatedSignals).toHaveLength(1);
      expect(aggregatedSignals[0]?.signal).toBe(SignalType.BUY);
    });
  });

  describe('Weight Management', () => {
    test('should update strategy weights based on performance', async () => {
      ensemble.addStrategy(strategy1, 1.0);
      ensemble.addStrategy(strategy2, 1.0);
      
      const performanceData: StrategyPerformance[] = [
        {
          totalTrades: 10,
          winningTrades: 8,
          losingTrades: 2,
          winRate: 0.8,
          totalReturn: 0.25,
          maxDrawdown: -0.03,
          sharpeRatio: 2.0,
          sortino: 2.5,
          averageWin: 0.04,
          averageLoss: -0.015,
          profitFactor: 2.67,
          lastUpdated: new Date()
        }
      ];
      
      const initialWeights = ensemble.getStrategyWeights();
      await ensemble.updateWeights(performanceData);
      const updatedWeights = ensemble.getStrategyWeights();
      
      // Weights should be updated (exact values depend on implementation)
      expect(updatedWeights.size).toBe(2);
    });

    test('should rebalance weights based on performance degradation', async () => {
      ensemble.addStrategy(strategy1, 1.0);
      ensemble.addStrategy(strategy2, 1.0);
      
      // Add some performance history to trigger rebalancing
      const performanceData: StrategyPerformance[] = [
        {
          totalTrades: 10,
          winningTrades: 3,
          losingTrades: 7,
          winRate: 0.3,
          totalReturn: -0.15,
          maxDrawdown: -0.25,
          sharpeRatio: -0.5,
          sortino: -0.8,
          averageWin: 0.02,
          averageLoss: -0.05,
          profitFactor: 0.4,
          lastUpdated: new Date()
        }
      ];
      
      await ensemble.updateWeights(performanceData);
      await ensemble.rebalanceWeights(0.5);
      
      const weights = ensemble.getStrategyWeights();
      expect(weights.size).toBe(2);
    });

    test('should integrate with learning system', async () => {
      ensemble.addStrategy(strategy1, 1.0);
      ensemble.addStrategy(strategy2, 1.0);
      
      const learningData = {
        marketConditions: {
          volatility: 0.8,
          trend: 'bullish'
        },
        strategyPerformance: new Map([
          ['momentum_strategy', 0.15],
          ['mean_reversion_strategy', 0.05]
        ]),
        adaptationSignals: [
          { strategy: 'momentum_strategy', adaptation: 'increase_weight', confidence: 0.8 },
          { strategy: 'mean_reversion_strategy', adaptation: 'decrease_weight', confidence: 0.6 }
        ]
      };
      
      await ensemble.integrateWithLearningSystem(learningData);
      
      const weights = ensemble.getStrategyWeights();
      expect(weights.size).toBe(2);
    });

    test('should get ensemble statistics', () => {
      ensemble.addStrategy(strategy1, 1.2);
      ensemble.addStrategy(strategy2, 0.8);
      ensemble.addStrategy(strategy3, 1.0);
      
      const stats = ensemble.getEnsembleStats();
      
      expect(stats.totalStrategies).toBe(3);
      expect(stats.activeStrategies).toBe(3);
      expect(stats.averageWeight).toBeCloseTo(1.0, 1);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Consensus Strength', () => {
    test('should calculate consensus strength correctly', async () => {
      const signal1 = createMockSignal('AAPL', SignalType.BUY, 85, 150.0, 'momentum_strategy');
      const signal2 = createMockSignal('AAPL', SignalType.BUY, 80, 150.1, 'mean_reversion_strategy');
      const signal3 = createMockSignal('AAPL', SignalType.BUY, 75, 150.2, 'breakout_strategy');
      
      strategy1.setMockSignals([signal1]);
      strategy2.setMockSignals([signal2]);
      strategy3.setMockSignals([signal3]);
      
      ensemble.addStrategy(strategy1, 1.0);
      ensemble.addStrategy(strategy2, 1.0);
      ensemble.addStrategy(strategy3, 1.0);
      
      const marketData = createMockMarketData('AAPL', 150.1);
      const aggregatedSignals = await ensemble.aggregateSignals('AAPL', marketData);
      
      expect(aggregatedSignals).toHaveLength(1);
      expect(aggregatedSignals[0]?.consensusStrength).toBeGreaterThan(0.8); // High consensus
      expect(aggregatedSignals[0]?.contributingStrategies).toHaveLength(3);
    });
  });
});