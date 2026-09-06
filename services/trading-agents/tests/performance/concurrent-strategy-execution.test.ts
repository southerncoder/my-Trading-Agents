/**
 * Performance Tests for Concurrent Strategy Execution
 * 
 * Tests system behavior under concurrent strategy execution
 * Requirements: 7.4
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { StrategyEnsemble } from '../../src/strategies/strategy-ensemble';
import { EnhancedTradingGraph } from '../../src/utils/enhanced-trading-graph';
import { TradingAgentsConfig } from '../../src/config';
import {
  ITradingStrategy,
  TradingSignal,
  SignalType,
  MarketData,
  StrategyPerformance
} from '../../src/strategies/base-strategy';

// High-performance test strategies
class FastMomentumStrategy implements ITradingStrategy {
  id = 'fast-momentum';
  name = 'Fast Momentum Strategy';
  description = 'Optimized momentum strategy for performance testing';
  private priceHistory: number[] = [];
  private signalCache = new Map<string, TradingSignal>();

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    const cacheKey = `${marketData.symbol}-${marketData.timestamp.getTime()}`;
    if (this.signalCache.has(cacheKey)) {
      return this.signalCache.get(cacheKey)!;
    }

    this.priceHistory.push(marketData.close);
    if (this.priceHistory.length > 20) {
      this.priceHistory.shift(); // Keep only last 20 prices
    }

    const momentum = this.calculateMomentum();
    let signalType = SignalType.HOLD;
    let strength = 0.5;

    if (momentum > 0.02) {
      signalType = SignalType.BUY;
      strength = Math.min(0.9, 0.5 + momentum * 10);
    } else if (momentum < -0.02) {
      signalType = SignalType.SELL;
      strength = Math.min(0.9, 0.5 + Math.abs(momentum) * 10);
    }

    const signal: TradingSignal = {
      type: signalType,
      strength,
      confidence: 0.8,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: `Momentum: ${(momentum * 100).toFixed(2)}%`,
      metadata: { strategy: 'fast-momentum', momentum }
    };

    this.signalCache.set(cacheKey, signal);
    return signal;
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.4;
  }

  private calculateMomentum(): number {
    if (this.priceHistory.length < 2) return 0;
    const current = this.priceHistory[this.priceHistory.length - 1];
    const previous = this.priceHistory[this.priceHistory.length - 2];
    return (current - previous) / previous;
  }
}

class FastMeanReversionStrategy implements ITradingStrategy {
  id = 'fast-mean-reversion';
  name = 'Fast Mean Reversion Strategy';
  description = 'Optimized mean reversion strategy';
  private priceHistory: number[] = [];

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    this.priceHistory.push(marketData.close);
    if (this.priceHistory.length > 20) {
      this.priceHistory.shift();
    }

    const deviation = this.calculateDeviation();
    let signalType = SignalType.HOLD;
    let strength = 0.5;

    if (deviation < -0.05) { // Price below mean
      signalType = SignalType.BUY;
      strength = Math.min(0.9, 0.5 + Math.abs(deviation) * 5);
    } else if (deviation > 0.05) { // Price above mean
      signalType = SignalType.SELL;
      strength = Math.min(0.9, 0.5 + deviation * 5);
    }

    return {
      type: signalType,
      strength,
      confidence: 0.75,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: `Deviation: ${(deviation * 100).toFixed(2)}%`,
      metadata: { strategy: 'fast-mean-reversion', deviation }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.4;
  }

  private calculateDeviation(): number {
    if (this.priceHistory.length < 10) return 0;
    const mean = this.priceHistory.reduce((sum, price) => sum + price, 0) / this.priceHistory.length;
    const current = this.priceHistory[this.priceHistory.length - 1];
    return (current - mean) / mean;
  }
}

class FastBreakoutStrategy implements ITradingStrategy {
  id = 'fast-breakout';
  name = 'Fast Breakout Strategy';
  description = 'Optimized breakout strategy';
  private priceHistory: number[] = [];

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    this.priceHistory.push(marketData.close);
    if (this.priceHistory.length > 20) {
      this.priceHistory.shift();
    }

    const breakout = this.detectBreakout();
    let signalType = SignalType.HOLD;
    let strength = 0.5;

    if (breakout.type === 'upward') {
      signalType = SignalType.BUY;
      strength = Math.min(0.9, 0.5 + breakout.strength);
    } else if (breakout.type === 'downward') {
      signalType = SignalType.SELL;
      strength = Math.min(0.9, 0.5 + breakout.strength);
    }

    return {
      type: signalType,
      strength,
      confidence: 0.7,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: `Breakout: ${breakout.type}`,
      metadata: { strategy: 'fast-breakout', breakout }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.4;
  }

  private detectBreakout(): { type: string; strength: number } {
    if (this.priceHistory.length < 10) return { type: 'none', strength: 0 };
    
    const recent = this.priceHistory.slice(-5);
    const older = this.priceHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, price) => sum + price, 0) / recent.length;
    const olderAvg = older.reduce((sum, price) => sum + price, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.03) return { type: 'upward', strength: Math.min(0.4, change * 10) };
    if (change < -0.03) return { type: 'downward', strength: Math.min(0.4, Math.abs(change) * 10) };
    
    return { type: 'none', strength: 0 };
  }
}

describe('Concurrent Strategy Execution Performance Tests', () => {
  let ensemble: StrategyEnsemble;
  let tradingGraph: EnhancedTradingGraph;
  let strategies: ITradingStrategy[];

  const generateMarketData = (symbol: string, count: number): MarketData[] => {
    const data: MarketData[] = [];
    let price = 100 + Math.random() * 50;
    
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(Date.now() - (count - i) * 60000); // 1 minute intervals
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility;
      price *= (1 + change);
      
      data.push({
        symbol,
        timestamp,
        open: price * (0.999 + Math.random() * 0.002),
        high: price * (1 + Math.random() * 0.01),
        low: price * (0.99 + Math.random() * 0.01),
        close: price,
        volume: 1000000 + Math.random() * 5000000,
        adjustedClose: price
      });
    }
    
    return data;
  };

  const createMockConfig = (): TradingAgentsConfig => ({
    symbol: 'AAPL',
    analysisDepth: 'quick',
    riskTolerance: 'moderate',
    llmProvider: 'openai',
    llmModel: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    dataProviders: {
      primary: 'yahoo-finance',
      fallback: ['alpha-vantage'],
      newsProviders: ['google-news'],
      socialProviders: ['reddit']
    },
    memoryProvider: 'zep-graphiti',
    memoryConfig: {
      sessionId: 'perf-test',
      userId: 'perf-user'
    },
    strategyEnsemble: {
      enabled: true,
      strategies: ['fast-momentum', 'fast-mean-reversion', 'fast-breakout'],
      weightingMethod: 'performance-based'
    }
  });

  beforeAll(async () => {
    strategies = [
      new FastMomentumStrategy(),
      new FastMeanReversionStrategy(),
      new FastBreakoutStrategy()
    ];

    ensemble = new StrategyEnsemble();
    strategies.forEach((strategy, index) => {
      ensemble.addStrategy(strategy, 1 / strategies.length);
    });

    const config = createMockConfig();
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

  describe('Single Strategy Performance', () => {
    test('should execute single strategy efficiently with large dataset', async () => {
      const strategy = new FastMomentumStrategy();
      const marketData = generateMarketData('AAPL', 10000); // 10k data points
      
      const startTime = Date.now();
      const signals: TradingSignal[] = [];
      
      for (const data of marketData) {
        const signal = await strategy.generateSignal(data);
        signals.push(signal);
      }
      
      const duration = Date.now() - startTime;
      const signalsPerSecond = (signals.length / duration) * 1000;

      expect(signals).toHaveLength(10000);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(signalsPerSecond).toBeGreaterThan(200); // At least 200 signals per second
      
      console.log(`Single strategy (10k signals): ${duration}ms, ${signalsPerSecond.toFixed(1)} signals/sec`);
    });

    test('should handle concurrent signal generation for multiple symbols', async () => {
      const strategy = new FastMomentumStrategy();
      const symbols = Array.from({ length: 100 }, (_, i) => `STOCK${i.toString().padStart(3, '0')}`);
      const dataPerSymbol = 100;
      
      const startTime = Date.now();
      
      const symbolPromises = symbols.map(async (symbol) => {
        const marketData = generateMarketData(symbol, dataPerSymbol);
        const signals: TradingSignal[] = [];
        
        for (const data of marketData) {
          const signal = await strategy.generateSignal(data);
          signals.push(signal);
        }
        
        return signals;
      });
      
      const results = await Promise.all(symbolPromises);
      const duration = Date.now() - startTime;
      
      const totalSignals = results.reduce((sum, signals) => sum + signals.length, 0);
      const signalsPerSecond = (totalSignals / duration) * 1000;

      expect(totalSignals).toBe(symbols.length * dataPerSymbol);
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
      expect(signalsPerSecond).toBeGreaterThan(300); // At least 300 signals per second
      
      console.log(`Concurrent single strategy (${totalSignals} signals): ${duration}ms, ${signalsPerSecond.toFixed(1)} signals/sec`);
    });
  });

  describe('Strategy Ensemble Performance', () => {
    test('should execute ensemble efficiently with multiple strategies', async () => {
      const marketData = generateMarketData('AAPL', 1000);
      
      const startTime = Date.now();
      const ensembleSignals: TradingSignal[] = [];
      
      for (const data of marketData) {
        const signal = await ensemble.generateEnsembleSignal(data);
        ensembleSignals.push(signal);
      }
      
      const duration = Date.now() - startTime;
      const signalsPerSecond = (ensembleSignals.length / duration) * 1000;

      expect(ensembleSignals).toHaveLength(1000);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      expect(signalsPerSecond).toBeGreaterThan(50); // At least 50 ensemble signals per second
      
      // Verify ensemble quality
      ensembleSignals.forEach(signal => {
        expect(signal.contributingStrategies.length).toBeGreaterThan(0);
        expect(signal.consensusStrength).toBeGreaterThanOrEqual(0);
      });
      
      console.log(`Ensemble (1k signals): ${duration}ms, ${signalsPerSecond.toFixed(1)} signals/sec`);
    });

    test('should handle concurrent ensemble execution for multiple symbols', async () => {
      const symbols = Array.from({ length: 50 }, (_, i) => `ENSEMBLE${i.toString().padStart(2, '0')}`);
      const dataPerSymbol = 100;
      
      const startTime = Date.now();
      
      const symbolPromises = symbols.map(async (symbol) => {
        const marketData = generateMarketData(symbol, dataPerSymbol);
        const signals: TradingSignal[] = [];
        
        for (const data of marketData) {
          const signal = await ensemble.generateEnsembleSignal(data);
          signals.push(signal);
        }
        
        return signals;
      });
      
      const results = await Promise.all(symbolPromises);
      const duration = Date.now() - startTime;
      
      const totalSignals = results.reduce((sum, signals) => sum + signals.length, 0);
      const signalsPerSecond = (totalSignals / duration) * 1000;

      expect(totalSignals).toBe(symbols.length * dataPerSymbol);
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      expect(signalsPerSecond).toBeGreaterThan(30); // At least 30 ensemble signals per second
      
      console.log(`Concurrent ensemble (${totalSignals} signals): ${duration}ms, ${signalsPerSecond.toFixed(1)} signals/sec`);
    });

    test('should scale ensemble performance with strategy count', async () => {
      const strategyCounts = [1, 3, 5, 10, 20];
      const marketData = generateMarketData('SCALE_TEST', 200);
      const results: { count: number; duration: number; throughput: number }[] = [];

      for (const count of strategyCounts) {
        const testEnsemble = new StrategyEnsemble();
        
        // Add strategies
        for (let i = 0; i < count; i++) {
          const strategy = new FastMomentumStrategy();
          strategy.id = `momentum-${i}`;
          testEnsemble.addStrategy(strategy, 1 / count);
        }
        
        const startTime = Date.now();
        const signals: TradingSignal[] = [];
        
        for (const data of marketData) {
          const signal = await testEnsemble.generateEnsembleSignal(data);
          signals.push(signal);
        }
        
        const duration = Date.now() - startTime;
        const throughput = (signals.length / duration) * 1000;
        
        results.push({ count, duration, throughput });
        
        console.log(`${count} strategies: ${duration}ms, ${throughput.toFixed(1)} signals/sec`);
      }

      // Verify that performance degrades gracefully
      const firstThroughput = results[0].throughput;
      const lastThroughput = results[results.length - 1].throughput;
      const degradationRatio = lastThroughput / firstThroughput;
      
      expect(degradationRatio).toBeGreaterThan(0.1); // Should not degrade by more than 90%
    });
  });

  describe('Memory Usage Under Concurrent Execution', () => {
    test('should maintain reasonable memory usage during concurrent strategy execution', async () => {
      const symbols = Array.from({ length: 20 }, (_, i) => `MEM${i.toString().padStart(2, '0')}`);
      const dataPerSymbol = 500;
      
      const initialMemory = process.memoryUsage();
      
      const symbolPromises = symbols.map(async (symbol) => {
        const marketData = generateMarketData(symbol, dataPerSymbol);
        const signals: TradingSignal[] = [];
        
        for (const data of marketData) {
          const signal = await ensemble.generateEnsembleSignal(data);
          signals.push(signal);
        }
        
        return signals;
      });
      
      const results = await Promise.all(symbolPromises);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      const totalSignals = results.reduce((sum, signals) => sum + signals.length, 0);

      expect(totalSignals).toBe(symbols.length * dataPerSymbol);
      expect(memoryIncreaseMB).toBeLessThan(100); // Should not use more than 100MB additional memory
      
      console.log(`Memory usage for ${totalSignals} concurrent signals: ${memoryIncreaseMB.toFixed(2)}MB`);
    });

    test('should handle memory cleanup during long-running concurrent execution', async () => {
      const memorySnapshots: number[] = [];
      const batchSize = 10;
      const batchCount = 20;
      
      for (let batch = 0; batch < batchCount; batch++) {
        const symbols = Array.from({ length: batchSize }, (_, i) => `BATCH${batch}_${i}`);
        
        const batchPromises = symbols.map(async (symbol) => {
          const marketData = generateMarketData(symbol, 50);
          const signals: TradingSignal[] = [];
          
          for (const data of marketData) {
            const signal = await ensemble.generateEnsembleSignal(data);
            signals.push(signal);
          }
          
          return signals;
        });
        
        await Promise.all(batchPromises);
        
        // Force garbage collection periodically
        if (batch % 5 === 0 && global.gc) {
          global.gc();
        }
        
        const currentMemory = process.memoryUsage().heapUsed / (1024 * 1024);
        memorySnapshots.push(currentMemory);
      }
      
      // Check that memory doesn't grow unbounded
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = finalMemory - initialMemory;
      
      expect(memoryGrowth).toBeLessThan(50); // Should not grow by more than 50MB
      
      console.log(`Memory growth over ${batchCount} batches: ${memoryGrowth.toFixed(2)}MB`);
    });
  });

  describe('Strategy Weight Update Performance', () => {
    test('should handle frequent weight updates efficiently', async () => {
      const updateCount = 100;
      const performanceData: StrategyPerformance[] = strategies.map(strategy => ({
        strategyId: strategy.id,
        totalReturn: Math.random() * 0.4 - 0.2, // -20% to +20%
        sharpeRatio: Math.random() * 3 - 1, // -1 to 2
        maxDrawdown: Math.random() * 0.3, // 0% to 30%
        winRate: 0.3 + Math.random() * 0.4, // 30% to 70%
        volatility: 0.1 + Math.random() * 0.3, // 10% to 40%
        tradesCount: 50 + Math.floor(Math.random() * 100),
        avgWin: 0.01 + Math.random() * 0.03,
        avgLoss: -0.01 - Math.random() * 0.03,
        profitFactor: 0.5 + Math.random() * 2,
        timeframe: '1M'
      }));
      
      const startTime = Date.now();
      
      for (let i = 0; i < updateCount; i++) {
        // Slightly modify performance data for each update
        const modifiedData = performanceData.map(perf => ({
          ...perf,
          totalReturn: perf.totalReturn + (Math.random() - 0.5) * 0.02,
          sharpeRatio: perf.sharpeRatio + (Math.random() - 0.5) * 0.1
        }));
        
        await ensemble.updateWeights(modifiedData);
      }
      
      const duration = Date.now() - startTime;
      const updatesPerSecond = (updateCount / duration) * 1000;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(updatesPerSecond).toBeGreaterThan(5); // At least 5 updates per second
      
      console.log(`${updateCount} weight updates: ${duration}ms, ${updatesPerSecond.toFixed(1)} updates/sec`);
    });

    test('should handle concurrent weight updates and signal generation', async () => {
      const marketData = generateMarketData('CONCURRENT_WEIGHT', 500);
      const updateInterval = 50; // Update weights every 50 signals
      
      const performanceData: StrategyPerformance[] = strategies.map(strategy => ({
        strategyId: strategy.id,
        totalReturn: Math.random() * 0.2,
        sharpeRatio: Math.random() * 2,
        maxDrawdown: Math.random() * 0.2,
        winRate: 0.4 + Math.random() * 0.3,
        volatility: 0.15 + Math.random() * 0.2,
        tradesCount: 30 + Math.floor(Math.random() * 50),
        avgWin: 0.015 + Math.random() * 0.02,
        avgLoss: -0.015 - Math.random() * 0.02,
        profitFactor: 0.8 + Math.random() * 1.5,
        timeframe: '1M'
      }));
      
      const startTime = Date.now();
      const signals: TradingSignal[] = [];
      let updateCount = 0;
      
      for (let i = 0; i < marketData.length; i++) {
        const data = marketData[i];
        
        // Generate signal
        const signalPromise = ensemble.generateEnsembleSignal(data);
        
        // Update weights periodically
        let updatePromise: Promise<any> = Promise.resolve();
        if (i % updateInterval === 0 && i > 0) {
          updateCount++;
          // Modify performance data slightly
          const modifiedData = performanceData.map(perf => ({
            ...perf,
            totalReturn: perf.totalReturn + (Math.random() - 0.5) * 0.01
          }));
          updatePromise = ensemble.updateWeights(modifiedData);
        }
        
        const [signal] = await Promise.all([signalPromise, updatePromise]);
        signals.push(signal);
      }
      
      const duration = Date.now() - startTime;
      const signalsPerSecond = (signals.length / duration) * 1000;

      expect(signals).toHaveLength(marketData.length);
      expect(updateCount).toBeGreaterThan(5);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(signalsPerSecond).toBeGreaterThan(15); // At least 15 signals per second with concurrent updates
      
      console.log(`Concurrent signals + weight updates: ${duration}ms, ${signalsPerSecond.toFixed(1)} signals/sec, ${updateCount} updates`);
    });
  });

  describe('Full Workflow Performance', () => {
    test('should handle concurrent full workflow execution', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      
      // Mock data providers
      jest.spyOn(tradingGraph, 'getMarketData').mockImplementation(async (symbol: string) => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
        return generateMarketData(symbol, 1)[0];
      });
      
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue([]);
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue({
        symbol: 'TEST',
        sentiment: 0.5,
        confidence: 0.8,
        volume: 100,
        timestamp: new Date(),
        sources: ['test'],
        breakdown: { positive: 50, neutral: 30, negative: 20 }
      });
      
      const startTime = Date.now();
      
      const workflowPromises = symbols.map(symbol =>
        tradingGraph.executeWorkflow(symbol).catch(error => ({ error: error.message, symbol }))
      );
      
      const results = await Promise.all(workflowPromises);
      const duration = Date.now() - startTime;
      
      const successful = results.filter(r => !('error' in r)).length;
      const workflowsPerSecond = (successful / duration) * 1000;

      expect(successful).toBeGreaterThan(3); // At least 3 should succeed
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(workflowsPerSecond).toBeGreaterThan(0.1); // At least 0.1 workflows per second
      
      console.log(`${symbols.length} concurrent workflows: ${duration}ms, ${workflowsPerSecond.toFixed(3)} workflows/sec`);
    });

    test('should maintain performance under sustained concurrent load', async () => {
      const symbols = Array.from({ length: 20 }, (_, i) => `SUSTAINED${i.toString().padStart(2, '0')}`);
      const rounds = 5;
      const results: { round: number; duration: number; throughput: number }[] = [];
      
      // Mock fast data providers
      jest.spyOn(tradingGraph, 'getMarketData').mockImplementation(async (symbol: string) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Fast response
        return generateMarketData(symbol, 1)[0];
      });
      
      jest.spyOn(tradingGraph, 'getNewsData').mockResolvedValue([]);
      jest.spyOn(tradingGraph, 'getSocialData').mockResolvedValue({
        symbol: 'TEST',
        sentiment: 0.5,
        confidence: 0.8,
        volume: 100,
        timestamp: new Date(),
        sources: ['test'],
        breakdown: { positive: 50, neutral: 30, negative: 20 }
      });
      
      for (let round = 0; round < rounds; round++) {
        const startTime = Date.now();
        
        const workflowPromises = symbols.map(symbol =>
          tradingGraph.executeWorkflow(`${symbol}_R${round}`).catch(() => null)
        );
        
        const roundResults = await Promise.all(workflowPromises);
        const duration = Date.now() - startTime;
        const successful = roundResults.filter(r => r !== null).length;
        const throughput = (successful / duration) * 1000;
        
        results.push({ round, duration, throughput });
        
        console.log(`Round ${round + 1}: ${duration}ms, ${throughput.toFixed(3)} workflows/sec`);
        
        // Brief pause between rounds
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Verify sustained performance
      const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
      const firstThroughput = results[0].throughput;
      const lastThroughput = results[results.length - 1].throughput;
      const performanceDegradation = (firstThroughput - lastThroughput) / firstThroughput;
      
      expect(avgThroughput).toBeGreaterThan(0.5); // Average at least 0.5 workflows per second
      expect(performanceDegradation).toBeLessThan(0.3); // Performance should not degrade by more than 30%
      
      console.log(`Sustained load: Avg throughput ${avgThroughput.toFixed(3)} workflows/sec, Degradation ${(performanceDegradation * 100).toFixed(1)}%`);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet performance benchmarks for different concurrency levels', async () => {
      const benchmarks = [
        { concurrent: 1, maxTime: 5000, minThroughput: 100, description: '1 concurrent' },
        { concurrent: 5, maxTime: 8000, minThroughput: 300, description: '5 concurrent' },
        { concurrent: 10, maxTime: 12000, minThroughput: 500, description: '10 concurrent' },
        { concurrent: 20, maxTime: 20000, minThroughput: 800, description: '20 concurrent' }
      ];

      for (const benchmark of benchmarks) {
        const symbols = Array.from({ length: benchmark.concurrent }, (_, i) => 
          `BENCH${benchmark.concurrent}_${i}`
        );
        const signalsPerSymbol = 100;
        
        const startTime = Date.now();
        
        const symbolPromises = symbols.map(async (symbol) => {
          const marketData = generateMarketData(symbol, signalsPerSymbol);
          const signals: TradingSignal[] = [];
          
          for (const data of marketData) {
            const signal = await ensemble.generateEnsembleSignal(data);
            signals.push(signal);
          }
          
          return signals;
        });
        
        const results = await Promise.all(symbolPromises);
        const duration = Date.now() - startTime;
        
        const totalSignals = results.reduce((sum, signals) => sum + signals.length, 0);
        const signalsPerSecond = (totalSignals / duration) * 1000;
        
        expect(duration).toBeLessThan(benchmark.maxTime);
        expect(signalsPerSecond).toBeGreaterThan(benchmark.minThroughput);
        
        console.log(`${benchmark.description}: ${duration}ms (max ${benchmark.maxTime}ms), ${signalsPerSecond.toFixed(1)} signals/sec (min ${benchmark.minThroughput})`);
      }
    });
  });
});