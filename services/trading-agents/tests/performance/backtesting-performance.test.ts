/**
 * Performance Tests for Backtesting Framework
 * 
 * Tests performance with large datasets and high-frequency processing
 * Requirements: 7.4
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { BacktestEngine } from '../../src/backtesting/backtest-engine';
import { TradeSimulator } from '../../src/backtesting/trade-simulator';
import { PerformanceMetricsCalculator } from '../../src/backtesting/performance-metrics';
import { BacktestingDataProvider } from '../../src/backtesting/data-provider-integration';
import {
  BacktestConfig,
  BacktestResult,
  MarketData,
  DateRange
} from '../../src/backtesting/types';
import { ITradingStrategy, TradingSignal, SignalType } from '../../src/strategies/base-strategy';

// High-performance test strategy
class HighFrequencyTestStrategy implements ITradingStrategy {
  id = 'high-frequency-test';
  name = 'High Frequency Test Strategy';
  description = 'Optimized strategy for performance testing';
  private signalCache = new Map<string, TradingSignal>();
  private lastPrice = 0;

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    // Use caching to improve performance
    const cacheKey = `${marketData.symbol}-${marketData.timestamp.getTime()}`;
    if (this.signalCache.has(cacheKey)) {
      return this.signalCache.get(cacheKey)!;
    }

    // Simple but fast signal generation
    const priceChange = this.lastPrice > 0 ? (marketData.close - this.lastPrice) / this.lastPrice : 0;
    this.lastPrice = marketData.close;

    let signalType = SignalType.HOLD;
    let strength = 0.5;

    if (priceChange > 0.005) { // 0.5% increase
      signalType = SignalType.BUY;
      strength = Math.min(0.9, 0.5 + priceChange * 50);
    } else if (priceChange < -0.005) { // 0.5% decrease
      signalType = SignalType.SELL;
      strength = Math.min(0.9, 0.5 + Math.abs(priceChange) * 50);
    }

    const signal: TradingSignal = {
      type: signalType,
      strength,
      confidence: 0.8,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: `Price change: ${(priceChange * 100).toFixed(2)}%`,
      metadata: { strategy: 'high-frequency', priceChange }
    };

    // Cache the signal
    this.signalCache.set(cacheKey, signal);
    
    // Limit cache size to prevent memory issues
    if (this.signalCache.size > 1000) {
      const firstKey = this.signalCache.keys().next().value;
      this.signalCache.delete(firstKey);
    }

    return signal;
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.4;
  }
}

describe('Backtesting Performance Tests', () => {
  let backtestEngine: BacktestEngine;
  let dataProvider: BacktestingDataProvider;
  let strategy: HighFrequencyTestStrategy;

  // Generate large datasets for performance testing
  const generateLargeDataset = (symbol: string, days: number, frequency: 'daily' | 'hourly' | 'minute' = 'daily'): MarketData[] => {
    const data: MarketData[] = [];
    let price = 100;
    const startDate = new Date('2020-01-01');
    
    let intervals: number;
    let intervalMs: number;
    
    switch (frequency) {
      case 'minute':
        intervals = days * 24 * 60; // Minutes in specified days
        intervalMs = 60 * 1000; // 1 minute
        break;
      case 'hourly':
        intervals = days * 24; // Hours in specified days
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      default:
        intervals = days;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
    }
    
    for (let i = 0; i < intervals; i++) {
      const timestamp = new Date(startDate.getTime() + i * intervalMs);
      
      // Generate realistic price movement
      const volatility = 0.02; // 2% daily volatility
      const drift = 0.0001; // Small upward drift
      const randomChange = (Math.random() - 0.5) * volatility + drift;
      price *= (1 + randomChange);
      
      const open = price * (0.999 + Math.random() * 0.002);
      const high = price * (1 + Math.random() * 0.01);
      const low = price * (0.99 + Math.random() * 0.01);
      const volume = Math.floor(1000000 + Math.random() * 5000000);

      data.push({
        symbol,
        timestamp,
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
    dataProvider = new BacktestingDataProvider();
    backtestEngine = new BacktestEngine(dataProvider);
    strategy = new HighFrequencyTestStrategy();
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

  describe('Large Dataset Performance', () => {
    test('should handle 1 year of daily data efficiently', async () => {
      const largeDataset = generateLargeDataset('AAPL', 365, 'daily');
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(largeDataset);

      const config: BacktestConfig = {
        strategy,
        symbols: ['AAPL'],
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const startTime = Date.now();
      const result = await backtestEngine.runBacktest(config);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.trades.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`1 year daily data (${largeDataset.length} points): ${duration}ms`);
    });

    test('should handle 5 years of daily data', async () => {
      const veryLargeDataset = generateLargeDataset('AAPL', 1825, 'daily'); // 5 years
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(veryLargeDataset);

      const config: BacktestConfig = {
        strategy,
        symbols: ['AAPL'],
        startDate: new Date('2018-01-01'),
        endDate: new Date('2022-12-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const startTime = Date.now();
      const result = await backtestEngine.runBacktest(config);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.trades.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`5 years daily data (${veryLargeDataset.length} points): ${duration}ms`);
    });

    test('should handle 1 month of hourly data', async () => {
      const hourlyDataset = generateLargeDataset('AAPL', 30, 'hourly');
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(hourlyDataset);

      const config: BacktestConfig = {
        strategy,
        symbols: ['AAPL'],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const startTime = Date.now();
      const result = await backtestEngine.runBacktest(config);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.trades.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      
      console.log(`1 month hourly data (${hourlyDataset.length} points): ${duration}ms`);
    });

    test('should handle 1 day of minute data', async () => {
      const minuteDataset = generateLargeDataset('AAPL', 1, 'minute');
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(minuteDataset);

      const config: BacktestConfig = {
        strategy,
        symbols: ['AAPL'],
        startDate: new Date('2023-06-15'),
        endDate: new Date('2023-06-15'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const startTime = Date.now();
      const result = await backtestEngine.runBacktest(config);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.trades.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`1 day minute data (${minuteDataset.length} points): ${duration}ms`);
    });
  });

  describe('Multi-Symbol Performance', () => {
    test('should handle 10 symbols with 1 year of data each', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX', 'CRM', 'ADBE'];
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockImplementation(async (symbol: string) => {
        return generateLargeDataset(symbol, 365, 'daily');
      });

      const config: BacktestConfig = {
        strategy,
        symbols,
        startDate: new Date('2022-01-01'),
        endDate: new Date('2022-12-31'),
        initialCapital: 1000000, // Larger capital for multiple symbols
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const startTime = Date.now();
      const result = await backtestEngine.runBacktest(config);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.trades.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      
      // Verify trades for multiple symbols
      const tradedSymbols = [...new Set(result.trades.map(t => t.symbol))];
      expect(tradedSymbols.length).toBeGreaterThan(5); // Should trade multiple symbols
      
      console.log(`10 symbols, 1 year each (${symbols.length * 365} total points): ${duration}ms`);
    });

    test('should handle 50 symbols with 6 months of data each', async () => {
      const symbols = Array.from({ length: 50 }, (_, i) => `STOCK${i.toString().padStart(2, '0')}`);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockImplementation(async (symbol: string) => {
        return generateLargeDataset(symbol, 180, 'daily'); // 6 months
      });

      const config: BacktestConfig = {
        strategy,
        symbols,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-06-30'),
        initialCapital: 5000000, // Large capital for many symbols
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const startTime = Date.now();
      const result = await backtestEngine.runBacktest(config);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.trades.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(120000); // Should complete within 2 minutes
      
      console.log(`50 symbols, 6 months each (${symbols.length * 180} total points): ${duration}ms`);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should maintain reasonable memory usage with large datasets', async () => {
      const largeDataset = generateLargeDataset('AAPL', 2000, 'daily'); // ~5.5 years
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(largeDataset);

      const config: BacktestConfig = {
        strategy,
        symbols: ['AAPL'],
        startDate: new Date('2018-01-01'),
        endDate: new Date('2023-06-30'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      // Monitor memory usage
      const initialMemory = process.memoryUsage();
      
      const result = await backtestEngine.runBacktest(config);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      expect(result).toBeDefined();
      expect(memoryIncreaseMB).toBeLessThan(500); // Should not use more than 500MB additional memory
      
      console.log(`Memory increase for ${largeDataset.length} data points: ${memoryIncreaseMB.toFixed(2)}MB`);
    });

    test('should handle memory cleanup properly', async () => {
      const datasets = Array.from({ length: 5 }, (_, i) => 
        generateLargeDataset(`STOCK${i}`, 365, 'daily')
      );

      for (let i = 0; i < datasets.length; i++) {
        jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(datasets[i]);

        const config: BacktestConfig = {
          strategy,
          symbols: [`STOCK${i}`],
          startDate: new Date('2022-01-01'),
          endDate: new Date('2022-12-31'),
          initialCapital: 100000,
          commission: 0.001,
          slippage: 0.0005,
          marketImpact: true
        };

        await backtestEngine.runBacktest(config);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryUsageMB = finalMemory.heapUsed / (1024 * 1024);
      
      expect(memoryUsageMB).toBeLessThan(200); // Should not accumulate excessive memory
      
      console.log(`Final memory usage after 5 backtests: ${memoryUsageMB.toFixed(2)}MB`);
    });
  });

  describe('Concurrent Backtesting Performance', () => {
    test('should handle 5 concurrent backtests efficiently', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockImplementation(async (symbol: string) => {
        return generateLargeDataset(symbol, 365, 'daily');
      });

      const configs = symbols.map(symbol => ({
        strategy,
        symbols: [symbol],
        startDate: new Date('2022-01-01'),
        endDate: new Date('2022-12-31'),
        initialCapital: 100000,
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
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      results.forEach((result, index) => {
        expect(result.trades.length).toBeGreaterThan(0);
        expect(result.performance.totalReturn).toBeDefined();
      });
      
      console.log(`5 concurrent backtests: ${duration}ms`);
    });

    test('should handle 10 concurrent backtests with smaller datasets', async () => {
      const symbols = Array.from({ length: 10 }, (_, i) => `STOCK${i}`);
      
      jest.spyOn(dataProvider, 'loadHistoricalData').mockImplementation(async (symbol: string) => {
        return generateLargeDataset(symbol, 180, 'daily'); // 6 months
      });

      const configs = symbols.map(symbol => ({
        strategy,
        symbols: [symbol],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-06-30'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        configs.map(config => backtestEngine.runBacktest(config))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(45000); // Should complete within 45 seconds
      
      console.log(`10 concurrent backtests (6 months each): ${duration}ms`);
    });
  });

  describe('Strategy Performance Optimization', () => {
    test('should demonstrate strategy caching benefits', async () => {
      const dataset = generateLargeDataset('AAPL', 1000, 'daily');
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(dataset);

      const config: BacktestConfig = {
        strategy,
        symbols: ['AAPL'],
        startDate: new Date('2020-01-01'),
        endDate: new Date('2022-09-27'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      // First run - cold cache
      const startTime1 = Date.now();
      const result1 = await backtestEngine.runBacktest(config);
      const duration1 = Date.now() - startTime1;

      // Second run - warm cache (same data)
      const startTime2 = Date.now();
      const result2 = await backtestEngine.runBacktest(config);
      const duration2 = Date.now() - startTime2;

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(duration2).toBeLessThanOrEqual(duration1); // Should be same or faster due to caching
      
      console.log(`Cold cache: ${duration1}ms, Warm cache: ${duration2}ms`);
    });

    test('should handle strategy with complex calculations efficiently', async () => {
      class ComplexStrategy implements ITradingStrategy {
        id = 'complex-strategy';
        name = 'Complex Strategy';
        description = 'Strategy with complex calculations';
        private priceHistory: number[] = [];

        async generateSignal(marketData: MarketData): Promise<TradingSignal> {
          this.priceHistory.push(marketData.close);
          
          // Complex calculations
          const sma20 = this.calculateSMA(20);
          const sma50 = this.calculateSMA(50);
          const rsi = this.calculateRSI(14);
          const volatility = this.calculateVolatility(20);
          const momentum = this.calculateMomentum(10);
          
          // Complex signal logic
          let signalType = SignalType.HOLD;
          let strength = 0.5;
          
          const bullishSignals = [
            sma20 > sma50,
            rsi < 30,
            momentum > 0.02,
            volatility < 0.3
          ].filter(Boolean).length;
          
          const bearishSignals = [
            sma20 < sma50,
            rsi > 70,
            momentum < -0.02,
            volatility > 0.5
          ].filter(Boolean).length;
          
          if (bullishSignals >= 3) {
            signalType = SignalType.BUY;
            strength = 0.6 + (bullishSignals * 0.1);
          } else if (bearishSignals >= 3) {
            signalType = SignalType.SELL;
            strength = 0.6 + (bearishSignals * 0.1);
          }

          return {
            type: signalType,
            strength,
            confidence: 0.8,
            timestamp: marketData.timestamp,
            symbol: marketData.symbol,
            price: marketData.close,
            reasoning: `Complex analysis: ${bullishSignals} bullish, ${bearishSignals} bearish signals`,
            metadata: { 
              strategy: 'complex',
              sma20, sma50, rsi, volatility, momentum,
              bullishSignals, bearishSignals
            }
          };
        }

        async validateSignal(signal: TradingSignal): Promise<boolean> {
          return signal.strength > 0.5;
        }

        private calculateSMA(period: number): number {
          if (this.priceHistory.length < period) return this.priceHistory[this.priceHistory.length - 1] || 0;
          const recent = this.priceHistory.slice(-period);
          return recent.reduce((sum, price) => sum + price, 0) / period;
        }

        private calculateRSI(period: number): number {
          if (this.priceHistory.length < period + 1) return 50;
          
          const gains: number[] = [];
          const losses: number[] = [];
          
          for (let i = this.priceHistory.length - period; i < this.priceHistory.length; i++) {
            const change = this.priceHistory[i] - this.priceHistory[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
          }
          
          const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
          const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;
          
          if (avgLoss === 0) return 100;
          const rs = avgGain / avgLoss;
          return 100 - (100 / (1 + rs));
        }

        private calculateVolatility(period: number): number {
          if (this.priceHistory.length < period) return 0.2;
          
          const recent = this.priceHistory.slice(-period);
          const returns = recent.slice(1).map((price, i) => Math.log(price / recent[i]));
          const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
          const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
          
          return Math.sqrt(variance * 252); // Annualized volatility
        }

        private calculateMomentum(period: number): number {
          if (this.priceHistory.length < period + 1) return 0;
          
          const current = this.priceHistory[this.priceHistory.length - 1];
          const past = this.priceHistory[this.priceHistory.length - 1 - period];
          
          return (current - past) / past;
        }
      }

      const complexStrategy = new ComplexStrategy();
      const dataset = generateLargeDataset('AAPL', 500, 'daily');
      jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(dataset);

      const config: BacktestConfig = {
        strategy: complexStrategy,
        symbols: ['AAPL'],
        startDate: new Date('2022-01-01'),
        endDate: new Date('2023-05-15'),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const startTime = Date.now();
      const result = await backtestEngine.runBacktest(config);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.trades.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds even with complex calculations
      
      console.log(`Complex strategy with ${dataset.length} data points: ${duration}ms`);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet performance benchmarks for different data sizes', async () => {
      const benchmarks = [
        { days: 100, expectedMaxTime: 3000, description: '100 days' },
        { days: 365, expectedMaxTime: 8000, description: '1 year' },
        { days: 1000, expectedMaxTime: 20000, description: '~3 years' },
        { days: 1825, expectedMaxTime: 35000, description: '5 years' }
      ];

      for (const benchmark of benchmarks) {
        const dataset = generateLargeDataset('AAPL', benchmark.days, 'daily');
        jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(dataset);

        const config: BacktestConfig = {
          strategy,
          symbols: ['AAPL'],
          startDate: new Date('2018-01-01'),
          endDate: new Date('2023-01-01'),
          initialCapital: 100000,
          commission: 0.001,
          slippage: 0.0005,
          marketImpact: true
        };

        const startTime = Date.now();
        const result = await backtestEngine.runBacktest(config);
        const duration = Date.now() - startTime;

        expect(result).toBeDefined();
        expect(duration).toBeLessThan(benchmark.expectedMaxTime);
        
        console.log(`${benchmark.description} (${dataset.length} points): ${duration}ms (max: ${benchmark.expectedMaxTime}ms)`);
      }
    });

    test('should demonstrate scalability with increasing data size', async () => {
      const dataSizes = [100, 250, 500, 1000, 2000];
      const results: { size: number; duration: number; throughput: number }[] = [];

      for (const size of dataSizes) {
        const dataset = generateLargeDataset('AAPL', size, 'daily');
        jest.spyOn(dataProvider, 'loadHistoricalData').mockResolvedValue(dataset);

        const config: BacktestConfig = {
          strategy,
          symbols: ['AAPL'],
          startDate: new Date('2018-01-01'),
          endDate: new Date('2023-01-01'),
          initialCapital: 100000,
          commission: 0.001,
          slippage: 0.0005,
          marketImpact: true
        };

        const startTime = Date.now();
        const result = await backtestEngine.runBacktest(config);
        const duration = Date.now() - startTime;
        const throughput = dataset.length / (duration / 1000); // data points per second

        results.push({ size, duration, throughput });
        
        expect(result).toBeDefined();
        expect(throughput).toBeGreaterThan(10); // Should process at least 10 data points per second
        
        console.log(`${size} days: ${duration}ms, ${throughput.toFixed(1)} points/sec`);
      }

      // Verify that throughput doesn't degrade significantly with larger datasets
      const firstThroughput = results[0].throughput;
      const lastThroughput = results[results.length - 1].throughput;
      const degradation = (firstThroughput - lastThroughput) / firstThroughput;
      
      expect(degradation).toBeLessThan(0.5); // Throughput should not degrade by more than 50%
    });
  });
});