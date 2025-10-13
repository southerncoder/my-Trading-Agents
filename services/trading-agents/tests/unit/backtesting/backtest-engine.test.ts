/**
 * Unit Tests for BacktestEngine
 * 
 * Tests all BacktestEngine methods and trade simulation functionality
 * Requirements: 7.1
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BacktestEngine } from '../../../src/backtesting/backtest-engine';
import { TradeSimulator } from '../../../src/backtesting/trade-simulator';
import { PerformanceMetricsCalculator } from '../../../src/backtesting/performance-metrics';
import { BacktestingDataProvider } from '../../../src/backtesting/data-provider-integration';
import {
  BacktestConfig,
  BacktestResult,
  ValidationResult,
  ExecutedTrade,
  Portfolio,
  Position,
  Order,
  OrderType,
  OrderSide,
  OrderStatus,
  MarketData,
  DateRange
} from '../../../src/backtesting/types';
import { ITradingStrategy, TradingSignal, SignalType } from '../../../src/strategies/base-strategy';

// Mock dependencies
jest.mock('../../../src/backtesting/trade-simulator');
jest.mock('../../../src/backtesting/performance-metrics');
jest.mock('../../../src/backtesting/data-provider-integration');
jest.mock('../../../src/utils/enhanced-logger');

// Test strategy implementation
class TestStrategy implements ITradingStrategy {
  id = 'test-strategy';
  name = 'Test Strategy';
  description = 'Test strategy for unit testing';

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    return {
      type: SignalType.BUY,
      strength: 0.8,
      confidence: 0.9,
      timestamp: new Date(),
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning: 'Test signal generation',
      metadata: {}
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.5;
  }
}

describe('BacktestEngine', () => {
  let backtestEngine: BacktestEngine;
  let mockDataProvider: jest.Mocked<BacktestingDataProvider>;
  let mockTradeSimulator: jest.Mocked<TradeSimulator>;
  let mockPerformanceCalculator: jest.Mocked<PerformanceMetricsCalculator>;

  const createTestMarketData = (symbol: string, close: number, timestamp: Date): MarketData => ({
    symbol,
    timestamp,
    open: close * 0.99,
    high: close * 1.02,
    low: close * 0.98,
    close,
    volume: 1000000,
    adjustedClose: close
  });

  const createTestBacktestConfig = (): BacktestConfig => ({
    strategy: new TestStrategy(),
    symbols: ['AAPL'],
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31'),
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.0005,
    marketImpact: true
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDataProvider = new BacktestingDataProvider() as jest.Mocked<BacktestingDataProvider>;
    mockTradeSimulator = new TradeSimulator() as jest.Mocked<TradeSimulator>;
    mockPerformanceCalculator = new PerformanceMetricsCalculator() as jest.Mocked<PerformanceMetricsCalculator>;
    
    backtestEngine = new BacktestEngine(mockDataProvider);
    
    // Setup default mocks
    mockDataProvider.loadHistoricalData = jest.fn().mockResolvedValue([
      createTestMarketData('AAPL', 150, new Date('2023-01-01')),
      createTestMarketData('AAPL', 155, new Date('2023-01-02')),
      createTestMarketData('AAPL', 160, new Date('2023-01-03'))
    ]);

    mockTradeSimulator.simulateTrade = jest.fn().mockResolvedValue({
      id: 'trade-1',
      symbol: 'AAPL',
      side: OrderSide.BUY,
      quantity: 100,
      price: 150,
      executedPrice: 150.05,
      timestamp: new Date('2023-01-01'),
      commission: 0.15,
      slippage: 0.05,
      marketImpact: 0.02,
      status: OrderStatus.FILLED
    } as ExecutedTrade);

    mockPerformanceCalculator.calculateMetrics = jest.fn().mockResolvedValue({
      totalReturn: 0.15,
      annualizedReturn: 0.15,
      volatility: 0.20,
      sharpeRatio: 0.75,
      maxDrawdown: 0.05,
      winRate: 0.60,
      profitFactor: 1.5
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('runBacktest', () => {
    test('should execute complete backtest workflow', async () => {
      const config = createTestBacktestConfig();
      
      const result = await backtestEngine.runBacktest(config);
      
      expect(result).toBeDefined();
      expect(result.trades).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.equity).toBeDefined();
      expect(mockDataProvider.loadHistoricalData).toHaveBeenCalledWith('AAPL', {
        startDate: config.startDate,
        endDate: config.endDate
      });
    });

    test('should handle empty market data gracefully', async () => {
      const config = createTestBacktestConfig();
      mockDataProvider.loadHistoricalData = jest.fn().mockResolvedValue([]);
      
      const result = await backtestEngine.runBacktest(config);
      
      expect(result.trades).toHaveLength(0);
      expect(result.warnings).toContain('No market data available for backtesting');
    });

    test('should validate strategy before execution', async () => {
      const config = createTestBacktestConfig();
      const validateSpy = jest.spyOn(config.strategy, 'validateSignal');
      
      await backtestEngine.runBacktest(config);
      
      expect(validateSpy).toHaveBeenCalled();
    });

    test('should handle strategy execution errors', async () => {
      const config = createTestBacktestConfig();
      jest.spyOn(config.strategy, 'generateSignal').mockRejectedValue(new Error('Strategy error'));
      
      const result = await backtestEngine.runBacktest(config);
      
      expect(result.errors).toContain('Strategy execution failed: Strategy error');
    });

    test('should apply commission and slippage correctly', async () => {
      const config = createTestBacktestConfig();
      config.commission = 0.002;
      config.slippage = 0.001;
      
      await backtestEngine.runBacktest(config);
      
      expect(mockTradeSimulator.simulateTrade).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({
          commission: 0.002,
          slippage: 0.001
        })
      );
    });
  });

  describe('validateStrategy', () => {
    test('should validate strategy interface compliance', async () => {
      const strategy = new TestStrategy();
      
      const result = await backtestEngine.validateStrategy(strategy);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required methods', async () => {
      const invalidStrategy = {} as ITradingStrategy;
      
      const result = await backtestEngine.validateStrategy(invalidStrategy);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Strategy missing required generateSignal method');
    });

    test('should validate strategy signal generation', async () => {
      const strategy = new TestStrategy();
      const testData = createTestMarketData('AAPL', 150, new Date());
      
      const result = await backtestEngine.validateStrategy(strategy);
      
      expect(result.isValid).toBe(true);
      expect(result.signalValidation).toBeDefined();
    });
  });

  describe('loadHistoricalData', () => {
    test('should load data for specified date range', async () => {
      const symbol = 'AAPL';
      const dateRange: DateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };
      
      const data = await backtestEngine.loadHistoricalData(symbol, dateRange);
      
      expect(mockDataProvider.loadHistoricalData).toHaveBeenCalledWith(symbol, dateRange);
      expect(data).toHaveLength(3);
      expect(data[0].symbol).toBe(symbol);
    });

    test('should handle data provider failures', async () => {
      const symbol = 'INVALID';
      const dateRange: DateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };
      
      mockDataProvider.loadHistoricalData = jest.fn().mockRejectedValue(new Error('Data not found'));
      
      await expect(backtestEngine.loadHistoricalData(symbol, dateRange))
        .rejects.toThrow('Data not found');
    });
  });

  describe('executeStrategy', () => {
    test('should execute strategy against market data', async () => {
      const strategy = new TestStrategy();
      const marketData = [
        createTestMarketData('AAPL', 150, new Date('2023-01-01')),
        createTestMarketData('AAPL', 155, new Date('2023-01-02'))
      ];
      
      const trades = await backtestEngine.executeStrategy(strategy, marketData);
      
      expect(trades).toBeDefined();
      expect(Array.isArray(trades)).toBe(true);
    });

    test('should handle strategy signal validation', async () => {
      const strategy = new TestStrategy();
      jest.spyOn(strategy, 'validateSignal').mockResolvedValue(false);
      
      const marketData = [createTestMarketData('AAPL', 150, new Date('2023-01-01'))];
      
      const trades = await backtestEngine.executeStrategy(strategy, marketData);
      
      expect(trades).toHaveLength(0);
    });

    test('should track portfolio state during execution', async () => {
      const strategy = new TestStrategy();
      const marketData = [
        createTestMarketData('AAPL', 150, new Date('2023-01-01')),
        createTestMarketData('AAPL', 155, new Date('2023-01-02'))
      ];
      
      const trades = await backtestEngine.executeStrategy(strategy, marketData);
      
      // Verify portfolio tracking
      expect(mockTradeSimulator.simulateTrade).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle data provider initialization failure', () => {
      expect(() => new BacktestEngine()).not.toThrow();
    });

    test('should handle invalid backtest configuration', async () => {
      const invalidConfig = {
        ...createTestBacktestConfig(),
        initialCapital: -1000
      };
      
      await expect(backtestEngine.runBacktest(invalidConfig))
        .rejects.toThrow('Invalid initial capital');
    });

    test('should handle missing strategy', async () => {
      const invalidConfig = {
        ...createTestBacktestConfig(),
        strategy: null as any
      };
      
      await expect(backtestEngine.runBacktest(invalidConfig))
        .rejects.toThrow('Strategy is required');
    });
  });

  describe('performance optimization', () => {
    test('should handle large datasets efficiently', async () => {
      const config = createTestBacktestConfig();
      const largeDataset = Array.from({ length: 10000 }, (_, i) => 
        createTestMarketData('AAPL', 150 + i * 0.01, new Date(2023, 0, 1 + i))
      );
      
      mockDataProvider.loadHistoricalData = jest.fn().mockResolvedValue(largeDataset);
      
      const startTime = Date.now();
      const result = await backtestEngine.runBacktest(config);
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should batch process trades for performance', async () => {
      const config = createTestBacktestConfig();
      const marketData = Array.from({ length: 1000 }, (_, i) => 
        createTestMarketData('AAPL', 150 + i * 0.01, new Date(2023, 0, 1 + i))
      );
      
      mockDataProvider.loadHistoricalData = jest.fn().mockResolvedValue(marketData);
      
      await backtestEngine.runBacktest(config);
      
      // Verify batching behavior
      expect(mockTradeSimulator.simulateTrade).toHaveBeenCalled();
    });
  });
});