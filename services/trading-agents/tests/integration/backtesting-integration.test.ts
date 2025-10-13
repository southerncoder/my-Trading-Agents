/**
 * Integration Tests for Backtesting Framework
 * 
 * Tests end-to-end backtesting with known historical scenarios
 * Requirements: 7.2, 7.5
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { BacktestEngine } from '../../src/backtesting/backtest-engine';
import { TradeSimulator } from '../../src/backtesting/trade-simulator';
import { PerformanceMetricsCalculator } from '../../src/backtesting/performance-metrics';
import { BacktestingDataProvider } from '../../src/backtesting/data-provider-integration';
import { WalkForwardAnalyzer } from '../../src/backtesting/walk-forward-analyzer';
import {
  BacktestConfig,
  BacktestResult,
  MarketData,
  DateRange,
  OrderSide,
  OrderStatus
} from '../../src/backtesting/types';
import { ITradingStrategy, TradingSignal, SignalType } from '../../src/strategies/base-strategy';

// Test strategy for known scenarios
class TestBuyAndHoldStrategy implements ITradingStrategy {
  id = 'buy-and-hold-test';
  name = 'Buy and Hold Test Strategy';
  description = 'Simple buy and hold for integration testing';
  private hasPosition = false;

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    if (!this.hasPosition) {
      this.hasPosition = true;
      return {
        type: SignalType.BUY,
        strength: 0.8,
        confidence: 0.9,
        timestamp: marketData.timestamp,
        symbol: marketData.symbol,
        price: marketData.close,
        reasoning: 'Initial buy for buy-and-hold strategy',
        metadata: { strategy: 'buy-and-hold' }
      };
    }

    return {
      type: SignalType.HOLD,
      strength: 0.5,
      confidence: 0.8,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: 'Hold position',
      metadata: { strategy: 'buy-and-hold' }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.3;
  }
}

class TestMomentumStrategy implements ITradingStrategy {
  id = 'momentum-test';
  name = 'Momentum Test Strategy';
  description = 'Simple momentum strategy for integration testing';
  private previousPrice = 0;

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    if (this.previousPrice === 0) {
      this.previousPrice = marketData.close;
      return {
        type: SignalType.HOLD,
        strength: 0.5,
        confidence: 0.5,
        timestamp: marketData.timestamp,
        symbol: marketData.symbol,
        price: marketData.close,
        reasoning: 'Initial observation',
        metadata: { strategy: 'momentum' }
      };
    }

    const priceChange = (marketData.close - this.previousPrice) / this.previousPrice;
    this.previousPrice = marketData.close;

    if (priceChange > 0.02) { // 2% increase
      return {
        type: SignalType.BUY,
        strength: Math.min(0.9, 0.5 + priceChange * 10),
        confidence: 0.8,
        timestamp: marketData.timestamp,
        symbol: marketData.symbol,
        price: marketData.close,
        reasoning: `Strong momentum: ${(priceChange * 100).toFixed(2)}% increase`,
        metadata: { strategy: 'momentum', priceChange }
      };
    } else if (priceChange < -0.02) { // 2% decrease
      return {
        type: SignalType.SELL,
        strength: Math.min(0.9, 0.5 + Math.abs(priceChange) * 10),
        confidence: 0.8,
        timestamp: marketData.timestamp,
        symbol: marketData.symbol,
        price: marketData.close,
        reasoning: `Negative momentum: ${(priceChange * 100).toFixed(2)}% decrease`,
        metadata: { strategy: 'momentum', priceChange }
      };
    }

    return {
      type: SignalType.HOLD,
      strength: 0.5,
      confidence: 0.6,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: 'No significant momentum',
      metadata: { strategy: 'momentum', priceChange }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.4;
  }
}

describe('Backtesting Integration Tests', () => {
  let backtestEngine: BacktestEngine;
  let dataProvider: BacktestingDataProvider;
  let walkForwardAnalyzer: WalkForwardAnalyzer;

  // Historical market data for known scenarios
  const createBullMarketData = (symbol: string, startDate: Date, days: number): MarketData[] => {
    const data: MarketData[] = [];
    let price = 100;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      // Simulate bull market with upward trend and some volatility
      const dailyReturn = 0.001 + Math.random() * 0.02; // 0.1% to 2.1% daily return
      price *= (1 + dailyReturn);
      
      const open = price * (0.995 + Math.random() * 0.01);
      const high = price * (1 + Math.random() * 0.02);
      const low = price * (0.98 + Math.random() * 0.01);
      const volume = 1000000 + Math.random() * 2000000;

      data.push({
        symbol,
        timestamp: date,
        open,
        high,
        low,
        close: price,
        volume,
        adjustedClose: price
      });
    }
    
    return data;
  };

  const createBearMarketData = (symbol: string, startDate: Date, days: number): MarketData[] => {
    const data: MarketData[] = [];
    let price = 100;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      // Simulate bear market with downward trend
      const dailyReturn = -0.002 - Math.random() * 0.015; // -0.2% to -1.7% daily return
      price *= (1 + dailyReturn);
      
      const open = price * (0.995 + Math.random() * 0.01);
      const high = price * (1 + Math.random() * 0.01);
      const low = price * (0.97 + Math.random() * 0.02);
      const volume = 1500000 + Math.random() * 2500000; // Higher volume in bear market

      data.push({
        symbol,
        timestamp: date,
        open,
        high,
        low,
        close: price,
        volume,
        adjustedClose: price
      });
    }
    
    return data;
  };

  const createSidewaysMarketData = (symbol: string, startDate: Date, days: number): MarketData[] => {
    const data: MarketData[] = [];
    let price = 100;
    const basePrice = 100;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      // Simulate sideways market with mean reversion
      const deviation = (price - basePrice) / basePrice;
      const meanReversionForce = -deviation * 0.1;
      const randomComponent = (Math.random() - 0.5) * 0.02;
      const dailyReturn = meanReversionForce + randomComponent;
      
      price *= (1 + dailyReturn);
      
      const open = price * (0.995 + Math.random() * 0.01);
      const high = price * (1 + Math.random() * 0.015);
      const low = price * (0.985 + Math.random() * 0.015);
      const volume = 800000 + Math.random() * 1200000;

      data.push({
        symbol,
        timestamp: date,
        open,
        high,
        low,
        close: price,
        volume,
        adjustedClose: price
      });
    }
    
    return data;
  };

  beforeAll(async () => {
    // Initialize components
    dataProvider = new BacktestingDataProvider();
    backtestEngine = new BacktestEngine(dataProvider);
    walkForwardAnalyzer = new WalkForwardAnalyzer();
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

  describe('Bull Market Scenarios', () => {
    test('should perform well with buy-and-hold in bull market', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createBullMarketData('AAPL', startDate, 252); // 1 year of trading days
      
      // Mock data provider to return our bull market data
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      const config: BacktestConfig = {
        strategy: new TestBuyAndHoldStrategy(),
        symbols: ['AAPL'],
        startDate,
        endDate: new Date('2023-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      expect(result).toBeDefined();
      expect(result.trades.length).toBeGreaterThan(0);
      expect(result.performance.totalReturn).toBeGreaterThan(0.15); // Expect positive returns in bull market
      expect(result.performance.sharpeRatio).toBeGreaterThan(0.5);
      expect(result.performance.maxDrawdown).toBeLessThan(0.15); // Limited drawdown in bull market
      expect(result.performance.winRate).toBeGreaterThan(0.6);
    });

    test('should capture momentum in bull market with momentum strategy', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createBullMarketData('AAPL', startDate, 252);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      const config: BacktestConfig = {
        strategy: new TestMomentumStrategy(),
        symbols: ['AAPL'],
        startDate,
        endDate: new Date('2023-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      expect(result.trades.length).toBeGreaterThan(10); // Should generate multiple trades
      expect(result.performance.totalReturn).toBeGreaterThan(0.10);
      
      // Check that buy trades outnumber sell trades in bull market
      const buyTrades = result.trades.filter(t => t.side === OrderSide.BUY);
      const sellTrades = result.trades.filter(t => t.side === OrderSide.SELL);
      expect(buyTrades.length).toBeGreaterThanOrEqual(sellTrades.length);
    });
  });

  describe('Bear Market Scenarios', () => {
    test('should limit losses with buy-and-hold in bear market', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createBearMarketData('AAPL', startDate, 252);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      const config: BacktestConfig = {
        strategy: new TestBuyAndHoldStrategy(),
        symbols: ['AAPL'],
        startDate,
        endDate: new Date('2023-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      expect(result.performance.totalReturn).toBeLessThan(0); // Expect negative returns
      expect(result.performance.maxDrawdown).toBeGreaterThan(0.20); // Significant drawdown
      expect(result.performance.sharpeRatio).toBeLessThan(0); // Negative risk-adjusted returns
    });

    test('should adapt to bear market with momentum strategy', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createBearMarketData('AAPL', startDate, 252);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      const config: BacktestConfig = {
        strategy: new TestMomentumStrategy(),
        symbols: ['AAPL'],
        startDate,
        endDate: new Date('2023-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      expect(result.trades.length).toBeGreaterThan(5);
      
      // Should generate more sell signals in bear market
      const sellTrades = result.trades.filter(t => t.side === OrderSide.SELL);
      expect(sellTrades.length).toBeGreaterThan(0);
      
      // Should perform better than buy-and-hold in bear market
      expect(result.performance.totalReturn).toBeGreaterThan(-0.40);
    });
  });

  describe('Sideways Market Scenarios', () => {
    test('should handle sideways market with limited trades', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createSidewaysMarketData('AAPL', startDate, 252);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      const config: BacktestConfig = {
        strategy: new TestMomentumStrategy(),
        symbols: ['AAPL'],
        startDate,
        endDate: new Date('2023-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      expect(result.performance.totalReturn).toBeGreaterThan(-0.10);
      expect(result.performance.totalReturn).toBeLessThan(0.10);
      expect(result.performance.maxDrawdown).toBeLessThan(0.15);
      
      // Should have balanced buy/sell trades
      const buyTrades = result.trades.filter(t => t.side === OrderSide.BUY);
      const sellTrades = result.trades.filter(t => t.side === OrderSide.SELL);
      const ratio = buyTrades.length / (sellTrades.length || 1);
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2.0);
    });
  });

  describe('Walk-Forward Analysis Integration', () => {
    test('should perform walk-forward analysis on bull market', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createBullMarketData('AAPL', startDate, 252);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      const walkForwardConfig = {
        strategy: new TestMomentumStrategy(),
        symbol: 'AAPL',
        startDate,
        endDate: new Date('2023-12-31'),
        inSamplePeriod: 60, // 60 days for training
        outOfSamplePeriod: 20, // 20 days for testing
        stepSize: 20, // Move forward 20 days each step
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005
      };

      const walkForwardResult = await walkForwardAnalyzer.performWalkForward(walkForwardConfig);

      expect(walkForwardResult).toBeDefined();
      expect(walkForwardResult.periods.length).toBeGreaterThan(5);
      expect(walkForwardResult.overallMetrics).toBeDefined();
      expect(walkForwardResult.overallMetrics.totalReturn).toBeDefined();
      expect(walkForwardResult.stabilityMetrics).toBeDefined();
      
      // Check for overfitting detection
      expect(walkForwardResult.overfittingAnalysis).toBeDefined();
      expect(walkForwardResult.overfittingAnalysis.inSampleVsOutOfSample).toBeDefined();
    });

    test('should detect overfitting in walk-forward analysis', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createSidewaysMarketData('AAPL', startDate, 252);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      // Create a strategy that might overfit to in-sample data
      class OverfittingStrategy extends TestMomentumStrategy {
        private inSampleOptimization = true;

        async generateSignal(marketData: MarketData): Promise<TradingSignal> {
          const baseSignal = await super.generateSignal(marketData);
          
          if (this.inSampleOptimization) {
            // Artificially boost signal strength during in-sample period
            return {
              ...baseSignal,
              strength: Math.min(0.95, baseSignal.strength * 1.5),
              confidence: Math.min(0.95, baseSignal.confidence * 1.2)
            };
          }
          
          return baseSignal;
        }
      }

      const walkForwardConfig = {
        strategy: new OverfittingStrategy(),
        symbol: 'AAPL',
        startDate,
        endDate: new Date('2023-12-31'),
        inSamplePeriod: 60,
        outOfSamplePeriod: 20,
        stepSize: 20,
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005
      };

      const walkForwardResult = await walkForwardAnalyzer.performWalkForward(walkForwardConfig);

      expect(walkForwardResult.overfittingAnalysis.isOverfitted).toBeDefined();
      expect(walkForwardResult.overfittingAnalysis.degradationScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multi-Symbol Integration', () => {
    test('should handle portfolio backtesting with multiple symbols', async () => {
      const startDate = new Date('2023-01-01');
      const aaplData = createBullMarketData('AAPL', startDate, 252);
      const googData = createSidewaysMarketData('GOOGL', startDate, 252);
      const msftData = createBullMarketData('MSFT', startDate, 252);

      jest.spyOn(dataProvider, 'loadHistoricalData')
        .mockImplementation(async (symbol: string) => {
          switch (symbol) {
            case 'AAPL': return aaplData;
            case 'GOOGL': return googData;
            case 'MSFT': return msftData;
            default: return [];
          }
        });

      const config: BacktestConfig = {
        strategy: new TestMomentumStrategy(),
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        startDate,
        endDate: new Date('2023-12-31'),
        initialCapital: 300000, // Larger capital for multiple symbols
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      expect(result.trades.length).toBeGreaterThan(10);
      
      // Should have trades for multiple symbols
      const symbols = [...new Set(result.trades.map(t => t.symbol))];
      expect(symbols.length).toBeGreaterThan(1);
      
      // Portfolio should benefit from diversification
      expect(result.performance.sharpeRatio).toBeGreaterThan(0.3);
    });
  });

  describe('Performance Metrics Integration', () => {
    test('should calculate comprehensive performance metrics', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createBullMarketData('AAPL', startDate, 252);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      const config: BacktestConfig = {
        strategy: new TestMomentumStrategy(),
        symbols: ['AAPL'],
        startDate,
        endDate: new Date('2023-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      // Verify all performance metrics are calculated
      expect(result.performance.totalReturn).toBeDefined();
      expect(result.performance.annualizedReturn).toBeDefined();
      expect(result.performance.volatility).toBeGreaterThan(0);
      expect(result.performance.sharpeRatio).toBeDefined();
      expect(result.performance.sortinoRatio).toBeDefined();
      expect(result.performance.calmarRatio).toBeDefined();
      expect(result.performance.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(result.performance.winRate).toBeGreaterThanOrEqual(0);
      expect(result.performance.winRate).toBeLessThanOrEqual(1);
      expect(result.performance.profitFactor).toBeGreaterThan(0);

      // Verify equity curve
      expect(result.equity).toBeDefined();
      expect(result.equity.length).toBeGreaterThan(0);
      expect(result.equity[0].value).toBe(100000); // Initial capital
      expect(result.equity[result.equity.length - 1].value).toBeGreaterThan(0);

      // Verify drawdown analysis
      expect(result.drawdowns).toBeDefined();
      expect(result.drawdowns.maxDrawdown).toBe(result.performance.maxDrawdown);
      expect(result.drawdowns.drawdownPeriods).toBeDefined();
    });

    test('should handle edge cases in performance calculation', async () => {
      const startDate = new Date('2023-01-01');
      // Create data with extreme volatility
      const volatileData: MarketData[] = [];
      let price = 100;
      
      for (let i = 0; i < 50; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        // Extreme daily moves
        const dailyReturn = (Math.random() - 0.5) * 0.2; // ±10% daily moves
        price *= (1 + dailyReturn);
        
        volatileData.push({
          symbol: 'VOLATILE',
          timestamp: date,
          open: price * 0.99,
          high: price * 1.05,
          low: price * 0.95,
          close: price,
          volume: 1000000,
          adjustedClose: price
        });
      }
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(volatileData);

      const config: BacktestConfig = {
        strategy: new TestMomentumStrategy(),
        symbols: ['VOLATILE'],
        startDate,
        endDate: new Date(startDate.getTime() + 49 * 24 * 60 * 60 * 1000),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      // Should handle extreme volatility without errors
      expect(result.performance.volatility).toBeGreaterThan(0.5);
      expect(isFinite(result.performance.sharpeRatio)).toBe(true);
      expect(isFinite(result.performance.maxDrawdown)).toBe(true);
      expect(result.performance.maxDrawdown).toBeGreaterThan(0.1);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle missing data gracefully', async () => {
      const startDate = new Date('2023-01-01');
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue([]);

      const config: BacktestConfig = {
        strategy: new TestBuyAndHoldStrategy(),
        symbols: ['MISSING'],
        startDate,
        endDate: new Date('2023-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      expect(result.trades).toHaveLength(0);
      expect(result.warnings).toContain('No market data available for backtesting');
      expect(result.performance.totalReturn).toBe(0);
    });

    test('should handle strategy failures during backtesting', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createBullMarketData('AAPL', startDate, 10);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      class FailingStrategy implements ITradingStrategy {
        id = 'failing-strategy';
        name = 'Failing Strategy';
        description = 'Strategy that fails';
        private callCount = 0;

        async generateSignal(marketData: MarketData): Promise<TradingSignal> {
          this.callCount++;
          if (this.callCount > 3) {
            throw new Error('Strategy failure');
          }
          
          return {
            type: SignalType.BUY,
            strength: 0.8,
            confidence: 0.8,
            timestamp: marketData.timestamp,
            symbol: marketData.symbol,
            price: marketData.close,
            reasoning: 'Test signal',
            metadata: {}
          };
        }

        async validateSignal(signal: TradingSignal): Promise<boolean> {
          return true;
        }
      }

      const config: BacktestConfig = {
        strategy: new FailingStrategy(),
        symbols: ['AAPL'],
        startDate,
        endDate: new Date('2023-01-10'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      expect(result.errors).toContain('Strategy execution failed: Strategy failure');
      expect(result.trades.length).toBeLessThan(10); // Should have some trades before failure
    });
  });

  describe('Performance Benchmarks', () => {
    test('should complete backtesting within reasonable time', async () => {
      const startDate = new Date('2023-01-01');
      const largeDataset = createBullMarketData('AAPL', startDate, 1000); // ~4 years of data
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(largeDataset);

      const config: BacktestConfig = {
        strategy: new TestMomentumStrategy(),
        symbols: ['AAPL'],
        startDate,
        endDate: new Date('2026-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const startTime = Date.now();
      const result = await backtestEngine.runBacktest(config);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.trades.length).toBeGreaterThan(0);
    });

    test('should handle concurrent backtests', async () => {
      const startDate = new Date('2023-01-01');
      const marketData = createBullMarketData('AAPL', startDate, 252);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(marketData);

      const configs = Array.from({ length: 5 }, (_, i) => ({
        strategy: new TestMomentumStrategy(),
        symbols: ['AAPL'],
        startDate,
        endDate: new Date('2023-12-31'),
        initialCapital: 100000 + i * 10000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        configs.map(config => backtestEngine.runBacktest(config))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      results.forEach(result => {
        expect(result.trades.length).toBeGreaterThan(0);
        expect(result.performance.totalReturn).toBeDefined();
      });
    });
  });
});