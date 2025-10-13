/**
 * Unit Tests for StrategyEnsemble
 * 
 * Tests signal aggregation, conflict resolution, and ensemble management
 * Requirements: 7.1
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { StrategyEnsemble } from '../../../src/strategies/strategy-ensemble';
import {
  ITradingStrategy,
  TradingSignal,
  SignalType,
  SignalStrength,
  RiskLevel,
  MarketData,
  StrategyPerformance
} from '../../../src/strategies/base-strategy';
import {
  EnsembleSignal,
  ConflictResolution,
  StrategyWeight,
  WeightUpdate
} from '../../../src/strategies/strategy-ensemble';

jest.mock('../../../src/utils/enhanced-logger');

// Test strategy implementations
class TestMomentumStrategy implements ITradingStrategy {
  id = 'momentum-strategy';
  name = 'Momentum Strategy';
  description = 'Test momentum strategy';

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    return {
      type: SignalType.BUY,
      strength: SignalStrength.STRONG,
      confidence: 0.8,
      timestamp: new Date(),
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: 'Strong momentum detected',
      metadata: { strategy: 'momentum' }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.5;
  }
}

class TestMeanReversionStrategy implements ITradingStrategy {
  id = 'mean-reversion-strategy';
  name = 'Mean Reversion Strategy';
  description = 'Test mean reversion strategy';

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    return {
      type: SignalType.SELL,
      strength: SignalStrength.MODERATE,
      confidence: 0.7,
      timestamp: new Date(),
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: 'Mean reversion opportunity',
      metadata: { strategy: 'mean-reversion' }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.3;
  }
}

class TestBreakoutStrategy implements ITradingStrategy {
  id = 'breakout-strategy';
  name = 'Breakout Strategy';
  description = 'Test breakout strategy';

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    return {
      type: SignalType.BUY,
      strength: SignalStrength.WEAK,
      confidence: 0.6,
      timestamp: new Date(),
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: 'Breakout pattern forming',
      metadata: { strategy: 'breakout' }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.2;
  }
}

describe('StrategyEnsemble', () => {
  let ensemble: StrategyEnsemble;
  let momentumStrategy: TestMomentumStrategy;
  let meanReversionStrategy: TestMeanReversionStrategy;
  let breakoutStrategy: TestBreakoutStrategy;

  const createTestMarketData = (symbol: string, close: number): MarketData => ({
    symbol,
    timestamp: new Date(),
    open: close * 0.99,
    high: close * 1.02,
    low: close * 0.98,
    close,
    volume: 1000000,
    adjustedClose: close
  });

  const createTestPerformanceData = (strategyId: string, returns: number): StrategyPerformance => ({
    strategyId,
    totalReturn: returns,
    sharpeRatio: returns * 2,
    maxDrawdown: Math.abs(returns) * 0.3,
    winRate: returns > 0 ? 0.6 : 0.4,
    volatility: 0.15,
    tradesCount: 100,
    avgWin: returns > 0 ? 0.02 : 0,
    avgLoss: returns < 0 ? -0.015 : 0,
    profitFactor: returns > 0 ? 1.5 : 0.8,
    timeframe: '1Y'
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    ensemble = new StrategyEnsemble();
    momentumStrategy = new TestMomentumStrategy();
    meanReversionStrategy = new TestMeanReversionStrategy();
    breakoutStrategy = new TestBreakoutStrategy();

    // Add strategies to ensemble
    ensemble.addStrategy(momentumStrategy, 0.4);
    ensemble.addStrategy(meanReversionStrategy, 0.3);
    ensemble.addStrategy(breakoutStrategy, 0.3);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addStrategy and removeStrategy', () => {
    test('should add strategy with specified weight', () => {
      const newEnsemble = new StrategyEnsemble();
      newEnsemble.addStrategy(momentumStrategy, 0.5);

      const strategies = newEnsemble.getStrategies();
      expect(strategies).toHaveLength(1);
      expect(strategies[0].strategy.id).toBe('momentum-strategy');
      expect(strategies[0].weight).toBe(0.5);
    });

    test('should normalize weights when adding strategies', () => {
      const newEnsemble = new StrategyEnsemble();
      newEnsemble.addStrategy(momentumStrategy, 0.6);
      newEnsemble.addStrategy(meanReversionStrategy, 0.8);

      const strategies = newEnsemble.getStrategies();
      const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
    });

    test('should remove strategy by ID', () => {
      ensemble.removeStrategy('momentum-strategy');

      const strategies = ensemble.getStrategies();
      expect(strategies).toHaveLength(2);
      expect(strategies.find(s => s.strategy.id === 'momentum-strategy')).toBeUndefined();
    });

    test('should rebalance weights after removing strategy', () => {
      ensemble.removeStrategy('momentum-strategy');

      const strategies = ensemble.getStrategies();
      const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
    });
  });

  describe('aggregateSignals', () => {
    test('should aggregate signals with confidence weighting', async () => {
      const signals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.8,
          confidence: 0.9,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Strong buy signal',
          metadata: { strategy: 'momentum' }
        },
        {
          type: SignalType.BUY,
          strength: 0.6,
          confidence: 0.7,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Moderate buy signal',
          metadata: { strategy: 'breakout' }
        }
      ];

      const aggregated = await ensemble.aggregateSignals(signals);

      expect(aggregated.type).toBe(SignalType.BUY);
      expect(aggregated.contributingStrategies).toHaveLength(2);
      expect(aggregated.consensusStrength).toBeGreaterThan(0);
      expect(aggregated.confidenceWeights).toBeDefined();
    });

    test('should handle mixed signal types', async () => {
      const signals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.8,
          confidence: 0.8,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Buy signal',
          metadata: { strategy: 'momentum' }
        },
        {
          type: SignalType.SELL,
          strength: 0.6,
          confidence: 0.7,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Sell signal',
          metadata: { strategy: 'mean-reversion' }
        }
      ];

      const aggregated = await ensemble.aggregateSignals(signals);

      expect(aggregated.conflictResolution).toBeDefined();
      expect(aggregated.type).toMatch(/^(BUY|SELL|HOLD)$/);
    });

    test('should calculate consensus strength correctly', async () => {
      const strongConsensusSignals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.9,
          confidence: 0.9,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Strong buy',
          metadata: { strategy: 'momentum' }
        },
        {
          type: SignalType.BUY,
          strength: 0.8,
          confidence: 0.8,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Strong buy',
          metadata: { strategy: 'breakout' }
        }
      ];

      const aggregated = await ensemble.aggregateSignals(strongConsensusSignals);

      expect(aggregated.consensusStrength).toBeGreaterThan(0.7);
    });

    test('should handle empty signals array', async () => {
      const aggregated = await ensemble.aggregateSignals([]);

      expect(aggregated.type).toBe(SignalType.HOLD);
      expect(aggregated.strength).toBe(0);
      expect(aggregated.contributingStrategies).toHaveLength(0);
    });

    test('should remove redundant signals based on correlation', async () => {
      const correlatedSignals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.8,
          confidence: 0.8,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'RSI oversold',
          metadata: { strategy: 'rsi-momentum', indicators: ['RSI'] }
        },
        {
          type: SignalType.BUY,
          strength: 0.75,
          confidence: 0.75,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'RSI reversal',
          metadata: { strategy: 'rsi-reversal', indicators: ['RSI'] }
        }
      ];

      const aggregated = await ensemble.aggregateSignals(correlatedSignals);

      expect(aggregated.correlationScore).toBeDefined();
      expect(aggregated.correlationScore).toBeGreaterThan(0.5);
    });
  });

  describe('resolveConflicts', () => {
    test('should resolve conflicts using correlation analysis', async () => {
      const conflictingSignals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.8,
          confidence: 0.8,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Momentum buy',
          metadata: { strategy: 'momentum' }
        },
        {
          type: SignalType.SELL,
          strength: 0.7,
          confidence: 0.7,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Mean reversion sell',
          metadata: { strategy: 'mean-reversion' }
        }
      ];

      const resolved = await ensemble.resolveConflicts(conflictingSignals);

      expect(resolved.type).toMatch(/^(BUY|SELL|HOLD)$/);
      expect(resolved.metadata?.conflictResolution).toBeDefined();
      expect(resolved.metadata?.conflictResolution.method).toMatch(
        /^(correlation_analysis|performance_weighting|confidence_voting|ml_fusion)$/
      );
    });

    test('should use performance weighting for conflict resolution', async () => {
      // Set up performance data favoring momentum strategy
      const performanceData = [
        createTestPerformanceData('momentum-strategy', 0.15),
        createTestPerformanceData('mean-reversion-strategy', -0.05)
      ];

      await ensemble.updateWeights(performanceData);

      const conflictingSignals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.7,
          confidence: 0.7,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Momentum buy',
          metadata: { strategy: 'momentum-strategy' }
        },
        {
          type: SignalType.SELL,
          strength: 0.7,
          confidence: 0.7,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Mean reversion sell',
          metadata: { strategy: 'mean-reversion-strategy' }
        }
      ];

      const resolved = await ensemble.resolveConflicts(conflictingSignals);

      expect(resolved.type).toBe(SignalType.BUY); // Should favor better performing strategy
    });

    test('should use confidence voting when performance is similar', async () => {
      const conflictingSignals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.7,
          confidence: 0.9, // Higher confidence
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'High confidence buy',
          metadata: { strategy: 'momentum' }
        },
        {
          type: SignalType.SELL,
          strength: 0.7,
          confidence: 0.5, // Lower confidence
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Low confidence sell',
          metadata: { strategy: 'mean-reversion' }
        }
      ];

      const resolved = await ensemble.resolveConflicts(conflictingSignals);

      expect(resolved.type).toBe(SignalType.BUY); // Should favor higher confidence
    });

    test('should provide detailed reasoning for conflict resolution', async () => {
      const conflictingSignals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.8,
          confidence: 0.8,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Buy signal',
          metadata: { strategy: 'momentum' }
        },
        {
          type: SignalType.SELL,
          strength: 0.6,
          confidence: 0.6,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Sell signal',
          metadata: { strategy: 'mean-reversion' }
        }
      ];

      const resolved = await ensemble.resolveConflicts(conflictingSignals);

      expect(resolved.reasoning).toContain('conflict resolution');
      expect(resolved.metadata?.conflictResolution?.reasoning).toBeDefined();
      expect(resolved.metadata?.conflictResolution?.originalSignals).toHaveLength(2);
    });
  });

  describe('updateWeights', () => {
    test('should update weights based on performance data', async () => {
      const performanceData = [
        createTestPerformanceData('momentum-strategy', 0.20), // Best performer
        createTestPerformanceData('mean-reversion-strategy', 0.05),
        createTestPerformanceData('breakout-strategy', -0.10) // Worst performer
      ];

      const updates = await ensemble.updateWeights(performanceData);

      expect(updates).toHaveLength(3);
      
      const momentumUpdate = updates.find(u => u.strategyId === 'momentum-strategy');
      const breakoutUpdate = updates.find(u => u.strategyId === 'breakout-strategy');
      
      expect(momentumUpdate?.newWeight).toBeGreaterThan(momentumUpdate?.oldWeight);
      expect(breakoutUpdate?.newWeight).toBeLessThan(breakoutUpdate?.oldWeight);
    });

    test('should maintain weight constraints', async () => {
      const performanceData = [
        createTestPerformanceData('momentum-strategy', 0.50), // Extremely good
        createTestPerformanceData('mean-reversion-strategy', -0.30), // Very bad
        createTestPerformanceData('breakout-strategy', -0.20)
      ];

      await ensemble.updateWeights(performanceData);

      const strategies = ensemble.getStrategies();
      const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
      
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
      
      // No strategy should have more than max weight (e.g., 0.7)
      strategies.forEach(strategy => {
        expect(strategy.weight).toBeLessThanOrEqual(0.7);
        expect(strategy.weight).toBeGreaterThanOrEqual(0.05); // Minimum weight
      });
    });

    test('should handle missing performance data gracefully', async () => {
      const partialPerformanceData = [
        createTestPerformanceData('momentum-strategy', 0.15)
        // Missing data for other strategies
      ];

      const updates = await ensemble.updateWeights(partialPerformanceData);

      expect(updates).toHaveLength(3); // Should still update all strategies
      
      const missingDataUpdate = updates.find(u => u.strategyId === 'mean-reversion-strategy');
      expect(missingDataUpdate?.reasoning).toContain('no performance data');
    });
  });

  describe('rebalanceWeights', () => {
    test('should rebalance based on rolling performance window', async () => {
      const performanceWindow = 90; // 90 days

      const updates = await ensemble.rebalanceWeights(performanceWindow);

      expect(updates).toHaveLength(3);
      updates.forEach(update => {
        expect(update.strategyId).toBeDefined();
        expect(update.oldWeight).toBeDefined();
        expect(update.newWeight).toBeDefined();
        expect(update.reasoning).toBeDefined();
      });
    });

    test('should handle different performance windows', async () => {
      const shortWindow = await ensemble.rebalanceWeights(30);
      const longWindow = await ensemble.rebalanceWeights(365);

      expect(shortWindow).toHaveLength(3);
      expect(longWindow).toHaveLength(3);
      
      // Weights might be different due to different time horizons
      const shortMomentum = shortWindow.find(u => u.strategyId === 'momentum-strategy');
      const longMomentum = longWindow.find(u => u.strategyId === 'momentum-strategy');
      
      expect(shortMomentum?.newWeight).toBeDefined();
      expect(longMomentum?.newWeight).toBeDefined();
    });
  });

  describe('machine learning signal fusion', () => {
    test('should use ML-based signal fusion for complex conflicts', async () => {
      const complexSignals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.7,
          confidence: 0.8,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'ML buy signal',
          metadata: { 
            strategy: 'ml-momentum',
            features: { rsi: 30, macd: 0.5, volume: 1.2 }
          }
        },
        {
          type: SignalType.SELL,
          strength: 0.6,
          confidence: 0.7,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'ML sell signal',
          metadata: { 
            strategy: 'ml-reversion',
            features: { rsi: 70, macd: -0.3, volume: 0.8 }
          }
        },
        {
          type: SignalType.HOLD,
          strength: 0.5,
          confidence: 0.6,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'ML neutral signal',
          metadata: { 
            strategy: 'ml-neutral',
            features: { rsi: 50, macd: 0.1, volume: 1.0 }
          }
        }
      ];

      const aggregated = await ensemble.aggregateSignals(complexSignals);

      expect(aggregated.conflictResolution?.method).toBeDefined();
      expect(aggregated.metadata?.mlFusionScore).toBeDefined();
    });
  });

  describe('error handling', () => {
    test('should handle strategy execution failures', async () => {
      const faultyStrategy = {
        ...momentumStrategy,
        generateSignal: jest.fn().mockRejectedValue(new Error('Strategy failed'))
      };

      ensemble.addStrategy(faultyStrategy, 0.5);

      const marketData = createTestMarketData('AAPL', 150);
      
      // Should not throw but handle gracefully
      const signals = await ensemble.generateEnsembleSignal(marketData);
      
      expect(signals).toBeDefined();
      expect(signals.contributingStrategies.length).toBeLessThan(4); // One strategy failed
    });

    test('should handle invalid weight values', () => {
      expect(() => ensemble.addStrategy(momentumStrategy, -0.5)).toThrow('Invalid weight');
      expect(() => ensemble.addStrategy(momentumStrategy, 1.5)).toThrow('Invalid weight');
    });

    test('should handle empty strategy ensemble', async () => {
      const emptyEnsemble = new StrategyEnsemble();
      const marketData = createTestMarketData('AAPL', 150);

      const signal = await emptyEnsemble.generateEnsembleSignal(marketData);

      expect(signal.type).toBe(SignalType.HOLD);
      expect(signal.strength).toBe(0);
      expect(signal.contributingStrategies).toHaveLength(0);
    });
  });

  describe('performance optimization', () => {
    test('should handle large number of strategies efficiently', async () => {
      const largeEnsemble = new StrategyEnsemble();
      
      // Add many strategies
      for (let i = 0; i < 50; i++) {
        const strategy = {
          ...momentumStrategy,
          id: `strategy-${i}`,
          name: `Strategy ${i}`
        };
        largeEnsemble.addStrategy(strategy, 1/50);
      }

      const marketData = createTestMarketData('AAPL', 150);
      
      const startTime = Date.now();
      const signal = await largeEnsemble.generateEnsembleSignal(marketData);
      const duration = Date.now() - startTime;

      expect(signal).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should cache correlation calculations', async () => {
      const signals: TradingSignal[] = [
        {
          type: SignalType.BUY,
          strength: 0.8,
          confidence: 0.8,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Buy signal',
          metadata: { strategy: 'momentum' }
        },
        {
          type: SignalType.BUY,
          strength: 0.7,
          confidence: 0.7,
          timestamp: new Date(),
          symbol: 'AAPL',
          price: 150,
          reasoning: 'Buy signal',
          metadata: { strategy: 'breakout' }
        }
      ];

      // First aggregation
      const start1 = Date.now();
      await ensemble.aggregateSignals(signals);
      const duration1 = Date.now() - start1;

      // Second aggregation (should use cache)
      const start2 = Date.now();
      await ensemble.aggregateSignals(signals);
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});