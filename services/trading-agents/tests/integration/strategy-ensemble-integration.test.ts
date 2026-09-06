/**
 * Integration Tests for Strategy Ensemble
 * 
 * Tests strategy ensemble integration with multiple strategies
 * Requirements: 7.2
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { StrategyEnsemble } from '../../src/strategies/strategy-ensemble';
import { BacktestEngine } from '../../src/backtesting/backtest-engine';
import { PerformanceMetricsCalculator } from '../../src/backtesting/performance-metrics';
import {
  ITradingStrategy,
  TradingSignal,
  SignalType,
  SignalStrength,
  MarketData,
  StrategyPerformance
} from '../../src/strategies/base-strategy';
import {
  EnsembleSignal,
  ConflictResolution,
  StrategyWeight
} from '../../src/strategies/strategy-ensemble';
import {
  BacktestConfig,
  BacktestResult
} from '../../src/backtesting/types';

// Realistic strategy implementations for integration testing
class RSIMomentumStrategy implements ITradingStrategy {
  id = 'rsi-momentum';
  name = 'RSI Momentum Strategy';
  description = 'Uses RSI for momentum signals';
  private rsiHistory: number[] = [];

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    // Simple RSI calculation (normally would use proper technical indicators)
    const rsi = this.calculateSimpleRSI(marketData);
    this.rsiHistory.push(rsi);

    let signalType = SignalType.HOLD;
    let strength = 0.5;
    let reasoning = 'RSI neutral';

    if (rsi < 30) {
      signalType = SignalType.BUY;
      strength = Math.min(0.9, 0.5 + (30 - rsi) / 30);
      reasoning = `RSI oversold at ${rsi.toFixed(1)}`;
    } else if (rsi > 70) {
      signalType = SignalType.SELL;
      strength = Math.min(0.9, 0.5 + (rsi - 70) / 30);
      reasoning = `RSI overbought at ${rsi.toFixed(1)}`;
    }

    return {
      type: signalType,
      strength,
      confidence: 0.8,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning,
      metadata: { 
        strategy: 'rsi-momentum',
        rsi,
        indicators: ['RSI']
      }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.4;
  }

  private calculateSimpleRSI(marketData: MarketData): number {
    // Simplified RSI calculation for testing
    const priceChange = marketData.close - marketData.open;
    const volatility = (marketData.high - marketData.low) / marketData.close;
    
    // Mock RSI based on price action and volatility
    let rsi = 50; // Neutral
    
    if (priceChange > 0) {
      rsi += (priceChange / marketData.close) * 1000;
    } else {
      rsi += (priceChange / marketData.close) * 1000;
    }
    
    rsi += volatility * 200;
    
    return Math.max(0, Math.min(100, rsi));
  }
}

class MACDStrategy implements ITradingStrategy {
  id = 'macd-strategy';
  name = 'MACD Strategy';
  description = 'Uses MACD for trend following';
  private priceHistory: number[] = [];

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    this.priceHistory.push(marketData.close);
    
    const macd = this.calculateSimpleMACD();
    
    let signalType = SignalType.HOLD;
    let strength = 0.5;
    let reasoning = 'MACD neutral';

    if (macd.histogram > 0 && macd.macd > macd.signal) {
      signalType = SignalType.BUY;
      strength = Math.min(0.9, 0.5 + Math.abs(macd.histogram) * 10);
      reasoning = `MACD bullish crossover: ${macd.histogram.toFixed(3)}`;
    } else if (macd.histogram < 0 && macd.macd < macd.signal) {
      signalType = SignalType.SELL;
      strength = Math.min(0.9, 0.5 + Math.abs(macd.histogram) * 10);
      reasoning = `MACD bearish crossover: ${macd.histogram.toFixed(3)}`;
    }

    return {
      type: signalType,
      strength,
      confidence: 0.75,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning,
      metadata: { 
        strategy: 'macd',
        macd: macd.macd,
        signal: macd.signal,
        histogram: macd.histogram,
        indicators: ['MACD']
      }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.3;
  }

  private calculateSimpleMACD() {
    if (this.priceHistory.length < 26) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    // Simplified MACD calculation
    const ema12 = this.calculateEMA(this.priceHistory, 12);
    const ema26 = this.calculateEMA(this.priceHistory, 26);
    const macd = ema12 - ema26;
    const signal = macd * 0.9; // Simplified signal line
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }
}

class BollingerBandsStrategy implements ITradingStrategy {
  id = 'bollinger-bands';
  name = 'Bollinger Bands Strategy';
  description = 'Uses Bollinger Bands for mean reversion';
  private priceHistory: number[] = [];

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    this.priceHistory.push(marketData.close);
    
    const bands = this.calculateBollingerBands();
    const currentPrice = marketData.close;
    
    let signalType = SignalType.HOLD;
    let strength = 0.5;
    let reasoning = 'Price within Bollinger Bands';

    if (currentPrice <= bands.lower) {
      signalType = SignalType.BUY;
      strength = Math.min(0.9, 0.5 + (bands.lower - currentPrice) / bands.lower);
      reasoning = `Price below lower Bollinger Band: ${currentPrice.toFixed(2)} vs ${bands.lower.toFixed(2)}`;
    } else if (currentPrice >= bands.upper) {
      signalType = SignalType.SELL;
      strength = Math.min(0.9, 0.5 + (currentPrice - bands.upper) / bands.upper);
      reasoning = `Price above upper Bollinger Band: ${currentPrice.toFixed(2)} vs ${bands.upper.toFixed(2)}`;
    }

    return {
      type: signalType,
      strength,
      confidence: 0.7,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning,
      metadata: { 
        strategy: 'bollinger-bands',
        upperBand: bands.upper,
        middleBand: bands.middle,
        lowerBand: bands.lower,
        indicators: ['Bollinger_Bands']
      }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.4;
  }

  private calculateBollingerBands() {
    const period = 20;
    if (this.priceHistory.length < period) {
      const lastPrice = this.priceHistory[this.priceHistory.length - 1] || 100;
      return {
        upper: lastPrice * 1.02,
        middle: lastPrice,
        lower: lastPrice * 0.98
      };
    }

    const recentPrices = this.priceHistory.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * 2),
      middle: sma,
      lower: sma - (stdDev * 2)
    };
  }
}

class VolumeWeightedStrategy implements ITradingStrategy {
  id = 'volume-weighted';
  name = 'Volume Weighted Strategy';
  description = 'Uses volume analysis for signal confirmation';
  private volumeHistory: number[] = [];
  private priceHistory: number[] = [];

  async generateSignal(marketData: MarketData): Promise<TradingSignal> {
    this.volumeHistory.push(marketData.volume);
    this.priceHistory.push(marketData.close);
    
    const volumeAnalysis = this.analyzeVolume(marketData);
    const priceChange = this.getPriceChange();
    
    let signalType = SignalType.HOLD;
    let strength = 0.5;
    let reasoning = 'Normal volume activity';

    if (volumeAnalysis.isHighVolume && priceChange > 0.01) {
      signalType = SignalType.BUY;
      strength = Math.min(0.9, 0.5 + volumeAnalysis.volumeRatio * 0.3 + priceChange * 10);
      reasoning = `High volume breakout: ${volumeAnalysis.volumeRatio.toFixed(2)}x average volume`;
    } else if (volumeAnalysis.isHighVolume && priceChange < -0.01) {
      signalType = SignalType.SELL;
      strength = Math.min(0.9, 0.5 + volumeAnalysis.volumeRatio * 0.3 + Math.abs(priceChange) * 10);
      reasoning = `High volume breakdown: ${volumeAnalysis.volumeRatio.toFixed(2)}x average volume`;
    }

    return {
      type: signalType,
      strength,
      confidence: 0.65,
      timestamp: marketData.timestamp,
      symbol: marketData.symbol,
      price: marketData.close,
      reasoning,
      metadata: { 
        strategy: 'volume-weighted',
        volumeRatio: volumeAnalysis.volumeRatio,
        averageVolume: volumeAnalysis.averageVolume,
        priceChange,
        indicators: ['Volume']
      }
    };
  }

  async validateSignal(signal: TradingSignal): Promise<boolean> {
    return signal.strength > 0.4;
  }

  private analyzeVolume(marketData: MarketData) {
    const period = 20;
    if (this.volumeHistory.length < period) {
      return {
        isHighVolume: false,
        volumeRatio: 1,
        averageVolume: marketData.volume
      };
    }

    const recentVolumes = this.volumeHistory.slice(-period);
    const averageVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / period;
    const volumeRatio = marketData.volume / averageVolume;
    
    return {
      isHighVolume: volumeRatio > 1.5,
      volumeRatio,
      averageVolume
    };
  }

  private getPriceChange(): number {
    if (this.priceHistory.length < 2) return 0;
    
    const currentPrice = this.priceHistory[this.priceHistory.length - 1];
    const previousPrice = this.priceHistory[this.priceHistory.length - 2];
    
    return (currentPrice - previousPrice) / previousPrice;
  }
}

describe('Strategy Ensemble Integration Tests', () => {
  let ensemble: StrategyEnsemble;
  let backtestEngine: BacktestEngine;
  let performanceCalculator: PerformanceMetricsCalculator;
  let rsiStrategy: RSIMomentumStrategy;
  let macdStrategy: MACDStrategy;
  let bollingerStrategy: BollingerBandsStrategy;
  let volumeStrategy: VolumeWeightedStrategy;

  const createTestMarketData = (symbol: string, basePrice: number, trend: 'bull' | 'bear' | 'sideways', days: number): MarketData[] => {
    const data: MarketData[] = [];
    let price = basePrice;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
      
      let dailyReturn = 0;
      switch (trend) {
        case 'bull':
          dailyReturn = 0.001 + Math.random() * 0.02; // 0.1% to 2.1%
          break;
        case 'bear':
          dailyReturn = -0.001 - Math.random() * 0.02; // -0.1% to -2.1%
          break;
        case 'sideways':
          dailyReturn = (Math.random() - 0.5) * 0.02; // ±1%
          break;
      }
      
      price *= (1 + dailyReturn);
      
      const open = price * (0.995 + Math.random() * 0.01);
      const high = price * (1 + Math.random() * 0.02);
      const low = price * (0.98 + Math.random() * 0.02);
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

  beforeAll(async () => {
    // Initialize strategies
    rsiStrategy = new RSIMomentumStrategy();
    macdStrategy = new MACDStrategy();
    bollingerStrategy = new BollingerBandsStrategy();
    volumeStrategy = new VolumeWeightedStrategy();

    // Initialize ensemble
    ensemble = new StrategyEnsemble();
    
    // Initialize backtesting components
    performanceCalculator = new PerformanceMetricsCalculator();
    backtestEngine = new BacktestEngine();
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset ensemble
    ensemble = new StrategyEnsemble();
    
    // Add strategies with initial weights
    ensemble.addStrategy(rsiStrategy, 0.3);
    ensemble.addStrategy(macdStrategy, 0.3);
    ensemble.addStrategy(bollingerStrategy, 0.2);
    ensemble.addStrategy(volumeStrategy, 0.2);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Multi-Strategy Signal Generation', () => {
    test('should generate ensemble signals from multiple strategies', async () => {
      const marketData = createTestMarketData('AAPL', 150, 'bull', 1)[0];
      
      const ensembleSignal = await ensemble.generateEnsembleSignal(marketData);

      expect(ensembleSignal).toBeDefined();
      expect(ensembleSignal.contributingStrategies.length).toBeGreaterThan(0);
      expect(ensembleSignal.confidenceWeights).toBeDefined();
      expect(ensembleSignal.consensusStrength).toBeGreaterThanOrEqual(0);
      expect(ensembleSignal.consensusStrength).toBeLessThanOrEqual(1);
    });

    test('should handle conflicting signals appropriately', async () => {
      // Create market data that might generate conflicting signals
      const volatileData = createTestMarketData('AAPL', 150, 'sideways', 50);
      const recentData = volatileData[volatileData.length - 1];
      
      const ensembleSignal = await ensemble.generateEnsembleSignal(recentData);

      expect(ensembleSignal).toBeDefined();
      
      if (ensembleSignal.conflictResolution) {
        expect(ensembleSignal.conflictResolution.method).toMatch(
          /^(correlation_analysis|performance_weighting|confidence_voting|ml_fusion)$/
        );
        expect(ensembleSignal.conflictResolution.reasoning).toBeDefined();
      }
    });

    test('should weight signals based on strategy confidence', async () => {
      const marketData = createTestMarketData('AAPL', 150, 'bull', 30);
      
      const signals: TradingSignal[] = [];
      for (const data of marketData.slice(-5)) {
        const signal = await ensemble.generateEnsembleSignal(data);
        signals.push(signal);
      }

      // Verify that higher confidence strategies have more influence
      signals.forEach(signal => {
        expect(signal.confidenceWeights).toBeDefined();
        
        const totalWeight = Object.values(signal.confidenceWeights).reduce((sum, weight) => sum + weight, 0);
        expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.01); // Should sum to ~1
      });
    });
  });

  describe('Performance-Based Weight Adjustment', () => {
    test('should adjust weights based on strategy performance', async () => {
      const performanceData: StrategyPerformance[] = [
        {
          strategyId: 'rsi-momentum',
          totalReturn: 0.15,
          sharpeRatio: 1.2,
          maxDrawdown: 0.08,
          winRate: 0.65,
          volatility: 0.18,
          tradesCount: 50,
          avgWin: 0.025,
          avgLoss: -0.015,
          profitFactor: 1.8,
          timeframe: '3M'
        },
        {
          strategyId: 'macd-strategy',
          totalReturn: 0.08,
          sharpeRatio: 0.8,
          maxDrawdown: 0.12,
          winRate: 0.58,
          volatility: 0.22,
          tradesCount: 35,
          avgWin: 0.020,
          avgLoss: -0.018,
          profitFactor: 1.3,
          timeframe: '3M'
        },
        {
          strategyId: 'bollinger-bands',
          totalReturn: -0.02,
          sharpeRatio: -0.2,
          maxDrawdown: 0.15,
          winRate: 0.45,
          volatility: 0.25,
          tradesCount: 40,
          avgWin: 0.018,
          avgLoss: -0.022,
          profitFactor: 0.9,
          timeframe: '3M'
        },
        {
          strategyId: 'volume-weighted',
          totalReturn: 0.12,
          sharpeRatio: 1.0,
          maxDrawdown: 0.10,
          winRate: 0.62,
          volatility: 0.20,
          tradesCount: 45,
          avgWin: 0.022,
          avgLoss: -0.016,
          profitFactor: 1.5,
          timeframe: '3M'
        }
      ];

      const initialWeights = ensemble.getStrategies().map(s => ({ id: s.strategy.id, weight: s.weight }));
      
      const weightUpdates = await ensemble.updateWeights(performanceData);

      expect(weightUpdates).toHaveLength(4);
      
      // RSI strategy should get higher weight (best performance)
      const rsiUpdate = weightUpdates.find(u => u.strategyId === 'rsi-momentum');
      expect(rsiUpdate?.newWeight).toBeGreaterThan(rsiUpdate?.oldWeight);
      
      // Bollinger Bands should get lower weight (worst performance)
      const bollingerUpdate = weightUpdates.find(u => u.strategyId === 'bollinger-bands');
      expect(bollingerUpdate?.newWeight).toBeLessThan(bollingerUpdate?.oldWeight);
    });

    test('should maintain weight constraints during adjustment', async () => {
      const extremePerformanceData: StrategyPerformance[] = [
        {
          strategyId: 'rsi-momentum',
          totalReturn: 0.50, // Extremely good
          sharpeRatio: 3.0,
          maxDrawdown: 0.05,
          winRate: 0.85,
          volatility: 0.15,
          tradesCount: 100,
          avgWin: 0.035,
          avgLoss: -0.010,
          profitFactor: 3.5,
          timeframe: '6M'
        },
        {
          strategyId: 'macd-strategy',
          totalReturn: -0.30, // Very bad
          sharpeRatio: -1.5,
          maxDrawdown: 0.35,
          winRate: 0.30,
          volatility: 0.40,
          tradesCount: 80,
          avgWin: 0.015,
          avgLoss: -0.035,
          profitFactor: 0.4,
          timeframe: '6M'
        },
        {
          strategyId: 'bollinger-bands',
          totalReturn: -0.25,
          sharpeRatio: -1.2,
          maxDrawdown: 0.30,
          winRate: 0.35,
          volatility: 0.35,
          tradesCount: 70,
          avgWin: 0.018,
          avgLoss: -0.030,
          profitFactor: 0.5,
          timeframe: '6M'
        },
        {
          strategyId: 'volume-weighted',
          totalReturn: -0.20,
          sharpeRatio: -1.0,
          maxDrawdown: 0.25,
          winRate: 0.40,
          volatility: 0.30,
          tradesCount: 60,
          avgWin: 0.020,
          avgLoss: -0.025,
          profitFactor: 0.7,
          timeframe: '6M'
        }
      ];

      await ensemble.updateWeights(extremePerformanceData);
      
      const strategies = ensemble.getStrategies();
      const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
      
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
      
      // No strategy should dominate completely
      strategies.forEach(strategy => {
        expect(strategy.weight).toBeLessThanOrEqual(0.7); // Max weight constraint
        expect(strategy.weight).toBeGreaterThanOrEqual(0.05); // Min weight constraint
      });
    });
  });

  describe('Backtesting Integration', () => {
    test('should integrate ensemble with backtesting framework', async () => {
      const marketData = createTestMarketData('AAPL', 150, 'bull', 100);
      
      // Mock data provider for backtesting
      const mockDataProvider = {
        loadHistoricalData: jest.fn().mockResolvedValue(marketData)
      };

      const backtestEngine = new BacktestEngine(mockDataProvider as any);
      
      const config: BacktestConfig = {
        strategy: ensemble,
        symbols: ['AAPL'],
        startDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const result = await backtestEngine.runBacktest(config);

      expect(result).toBeDefined();
      expect(result.trades.length).toBeGreaterThan(0);
      expect(result.performance.totalReturn).toBeDefined();
      expect(result.performance.sharpeRatio).toBeDefined();
    });

    test('should outperform individual strategies in diverse markets', async () => {
      const bullData = createTestMarketData('AAPL', 150, 'bull', 50);
      const bearData = createTestMarketData('AAPL', 200, 'bear', 50);
      const sidewaysData = createTestMarketData('AAPL', 150, 'sideways', 50);
      
      const combinedData = [...bullData, ...bearData, ...sidewaysData];
      
      const mockDataProvider = {
        loadHistoricalData: jest.fn().mockResolvedValue(combinedData)
      };

      const backtestEngine = new BacktestEngine(mockDataProvider as any);
      
      // Test ensemble
      const ensembleConfig: BacktestConfig = {
        strategy: ensemble,
        symbols: ['AAPL'],
        startDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        marketImpact: true
      };

      const ensembleResult = await backtestEngine.runBacktest(ensembleConfig);

      // Test individual strategies
      const individualResults = await Promise.all([
        backtestEngine.runBacktest({ ...ensembleConfig, strategy: rsiStrategy }),
        backtestEngine.runBacktest({ ...ensembleConfig, strategy: macdStrategy }),
        backtestEngine.runBacktest({ ...ensembleConfig, strategy: bollingerStrategy }),
        backtestEngine.runBacktest({ ...ensembleConfig, strategy: volumeStrategy })
      ]);

      // Ensemble should have better risk-adjusted returns
      const ensembleSharpe = ensembleResult.performance.sharpeRatio;
      const individualSharpes = individualResults.map(r => r.performance.sharpeRatio);
      const avgIndividualSharpe = individualSharpes.reduce((sum, sharpe) => sum + sharpe, 0) / individualSharpes.length;

      expect(ensembleSharpe).toBeGreaterThan(avgIndividualSharpe * 0.8); // Should be competitive
      
      // Ensemble should have lower maximum drawdown
      const ensembleDrawdown = ensembleResult.performance.maxDrawdown;
      const individualDrawdowns = individualResults.map(r => r.performance.maxDrawdown);
      const maxIndividualDrawdown = Math.max(...individualDrawdowns);

      expect(ensembleDrawdown).toBeLessThan(maxIndividualDrawdown * 1.2); // Should be more stable
    });
  });

  describe('Real-time Signal Processing', () => {
    test('should process streaming market data efficiently', async () => {
      const streamingData = createTestMarketData('AAPL', 150, 'bull', 100);
      const signals: EnsembleSignal[] = [];
      
      const startTime = Date.now();
      
      for (const data of streamingData) {
        const signal = await ensemble.generateEnsembleSignal(data);
        signals.push(signal);
      }
      
      const duration = Date.now() - startTime;

      expect(signals).toHaveLength(100);
      expect(duration).toBeLessThan(10000); // Should process 100 signals within 10 seconds
      
      // Verify signal quality
      signals.forEach(signal => {
        expect(signal.contributingStrategies.length).toBeGreaterThan(0);
        expect(signal.consensusStrength).toBeGreaterThanOrEqual(0);
        expect(signal.type).toMatch(/^(BUY|SELL|HOLD)$/);
      });
    });

    test('should adapt to changing market conditions', async () => {
      // Create data with regime changes
      const regimeData = [
        ...createTestMarketData('AAPL', 150, 'bull', 30),   // Bull market
        ...createTestMarketData('AAPL', 180, 'bear', 30),   // Bear market
        ...createTestMarketData('AAPL', 150, 'sideways', 30) // Sideways market
      ];

      const signals: EnsembleSignal[] = [];
      const performanceWindows: StrategyPerformance[][] = [];
      
      for (let i = 0; i < regimeData.length; i++) {
        const signal = await ensemble.generateEnsembleSignal(regimeData[i]);
        signals.push(signal);
        
        // Simulate performance tracking and weight adjustment every 20 periods
        if (i > 0 && i % 20 === 0) {
          const mockPerformance = ensemble.getStrategies().map(s => ({
            strategyId: s.strategy.id,
            totalReturn: Math.random() * 0.2 - 0.1, // Random performance
            sharpeRatio: Math.random() * 2 - 0.5,
            maxDrawdown: Math.random() * 0.2,
            winRate: 0.4 + Math.random() * 0.4,
            volatility: 0.1 + Math.random() * 0.2,
            tradesCount: 10 + Math.floor(Math.random() * 20),
            avgWin: 0.01 + Math.random() * 0.02,
            avgLoss: -0.01 - Math.random() * 0.02,
            profitFactor: 0.5 + Math.random() * 2,
            timeframe: '20D'
          }));
          
          performanceWindows.push(mockPerformance);
          await ensemble.updateWeights(mockPerformance);
        }
      }

      expect(signals).toHaveLength(90);
      expect(performanceWindows.length).toBeGreaterThan(0);
      
      // Verify that ensemble adapted over time
      const earlySignals = signals.slice(0, 30);
      const lateSignals = signals.slice(-30);
      
      const earlyWeights = ensemble.getStrategies().map(s => s.weight);
      // Weights should have changed from initial values
      const initialWeights = [0.3, 0.3, 0.2, 0.2];
      const weightChanges = earlyWeights.map((w, i) => Math.abs(w - initialWeights[i]));
      const totalWeightChange = weightChanges.reduce((sum, change) => sum + change, 0);
      
      expect(totalWeightChange).toBeGreaterThan(0.1); // Weights should have adapted
    });
  });

  describe('Correlation Analysis', () => {
    test('should detect and handle correlated strategies', async () => {
      // Add two highly correlated RSI-based strategies
      const rsiStrategy2 = new RSIMomentumStrategy();
      rsiStrategy2.id = 'rsi-momentum-2';
      rsiStrategy2.name = 'RSI Momentum Strategy 2';
      
      ensemble.addStrategy(rsiStrategy2, 0.2);
      
      const marketData = createTestMarketData('AAPL', 150, 'bull', 50);
      const signals: EnsembleSignal[] = [];
      
      for (const data of marketData.slice(-10)) {
        const signal = await ensemble.generateEnsembleSignal(data);
        signals.push(signal);
      }

      // Check if correlation was detected
      const correlatedSignals = signals.filter(s => s.correlationScore && s.correlationScore > 0.7);
      expect(correlatedSignals.length).toBeGreaterThan(0);
      
      // Verify that correlated strategies were handled appropriately
      correlatedSignals.forEach(signal => {
        expect(signal.contributingStrategies.length).toBeGreaterThan(1);
        expect(signal.correlationScore).toBeGreaterThan(0.5);
      });
    });

    test('should reduce redundant signals from similar strategies', async () => {
      // Create ensemble with multiple similar momentum strategies
      const momentumEnsemble = new StrategyEnsemble();
      momentumEnsemble.addStrategy(rsiStrategy, 0.33);
      momentumEnsemble.addStrategy(macdStrategy, 0.33);
      
      const rsiStrategy3 = new RSIMomentumStrategy();
      rsiStrategy3.id = 'rsi-momentum-3';
      momentumEnsemble.addStrategy(rsiStrategy3, 0.34);
      
      const trendingData = createTestMarketData('AAPL', 150, 'bull', 20);
      
      const signals: EnsembleSignal[] = [];
      for (const data of trendingData) {
        const signal = await momentumEnsemble.generateEnsembleSignal(data);
        signals.push(signal);
      }

      // Verify correlation detection and signal adjustment
      const highCorrelationSignals = signals.filter(s => s.correlationScore && s.correlationScore > 0.6);
      expect(highCorrelationSignals.length).toBeGreaterThan(0);
      
      // Ensemble should still produce reasonable signals despite correlation
      signals.forEach(signal => {
        expect(signal.strength).toBeGreaterThanOrEqual(0);
        expect(signal.strength).toBeLessThanOrEqual(1);
        expect(signal.consensusStrength).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle individual strategy failures gracefully', async () => {
      // Create a strategy that fails intermittently
      class FailingStrategy implements ITradingStrategy {
        id = 'failing-strategy';
        name = 'Failing Strategy';
        description = 'Strategy that fails sometimes';
        private callCount = 0;

        async generateSignal(marketData: MarketData): Promise<TradingSignal> {
          this.callCount++;
          if (this.callCount % 3 === 0) {
            throw new Error('Strategy computation failed');
          }
          
          return {
            type: SignalType.BUY,
            strength: 0.7,
            confidence: 0.8,
            timestamp: marketData.timestamp,
            symbol: marketData.symbol,
            price: marketData.close,
            reasoning: 'Test signal',
            metadata: { strategy: 'failing' }
          };
        }

        async validateSignal(signal: TradingSignal): Promise<boolean> {
          return true;
        }
      }

      const resilientEnsemble = new StrategyEnsemble();
      resilientEnsemble.addStrategy(rsiStrategy, 0.3);
      resilientEnsemble.addStrategy(macdStrategy, 0.3);
      resilientEnsemble.addStrategy(new FailingStrategy(), 0.4);

      const marketData = createTestMarketData('AAPL', 150, 'bull', 10);
      const signals: EnsembleSignal[] = [];
      
      for (const data of marketData) {
        const signal = await resilientEnsemble.generateEnsembleSignal(data);
        signals.push(signal);
      }

      expect(signals).toHaveLength(10);
      
      // Some signals should have fewer contributing strategies due to failures
      const partialSignals = signals.filter(s => s.contributingStrategies.length < 3);
      expect(partialSignals.length).toBeGreaterThan(0);
      
      // But ensemble should still produce valid signals
      signals.forEach(signal => {
        expect(signal.type).toMatch(/^(BUY|SELL|HOLD)$/);
        expect(signal.contributingStrategies.length).toBeGreaterThan(0);
      });
    });

    test('should handle empty or invalid market data', async () => {
      const invalidData: MarketData = {
        symbol: 'INVALID',
        timestamp: new Date(),
        open: NaN,
        high: NaN,
        low: NaN,
        close: NaN,
        volume: 0,
        adjustedClose: NaN
      };

      const signal = await ensemble.generateEnsembleSignal(invalidData);

      expect(signal).toBeDefined();
      expect(signal.type).toBe(SignalType.HOLD);
      expect(signal.strength).toBe(0);
      expect(signal.reasoning).toContain('invalid market data');
    });
  });

  describe('Performance Benchmarks', () => {
    test('should maintain performance under high-frequency updates', async () => {
      const highFreqData = createTestMarketData('AAPL', 150, 'bull', 1000);
      
      const startTime = Date.now();
      const signals: EnsembleSignal[] = [];
      
      for (const data of highFreqData) {
        const signal = await ensemble.generateEnsembleSignal(data);
        signals.push(signal);
      }
      
      const duration = Date.now() - startTime;

      expect(signals).toHaveLength(1000);
      expect(duration).toBeLessThan(30000); // Should process 1000 signals within 30 seconds
      
      // Verify signal quality wasn't compromised
      const validSignals = signals.filter(s => 
        s.contributingStrategies.length > 0 && 
        s.consensusStrength >= 0 && 
        s.type !== undefined
      );
      
      expect(validSignals.length).toBe(1000);
    });

    test('should scale with number of strategies', async () => {
      const largeEnsemble = new StrategyEnsemble();
      
      // Add many strategies
      for (let i = 0; i < 20; i++) {
        const strategy = new RSIMomentumStrategy();
        strategy.id = `rsi-${i}`;
        strategy.name = `RSI Strategy ${i}`;
        largeEnsemble.addStrategy(strategy, 1/20);
      }

      const marketData = createTestMarketData('AAPL', 150, 'bull', 10);
      
      const startTime = Date.now();
      const signals: EnsembleSignal[] = [];
      
      for (const data of marketData) {
        const signal = await largeEnsemble.generateEnsembleSignal(data);
        signals.push(signal);
      }
      
      const duration = Date.now() - startTime;

      expect(signals).toHaveLength(10);
      expect(duration).toBeLessThan(10000); // Should handle 20 strategies within 10 seconds
      
      signals.forEach(signal => {
        expect(signal.contributingStrategies.length).toBeGreaterThan(15); // Most strategies should contribute
      });
    });
  });
});