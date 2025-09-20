import {
  BaseTradingStrategy,
  MarketData,
  TradingSignal,
  SignalType,
  SignalStrength,
  StrategyConfig
} from './base-strategy';
import { TradingAgentsConfig } from '../config';
import { createLogger } from '../utils/enhanced-logger.js';

/**
 * Moving Average Crossover Strategy
 *
 * Generates signals based on crossovers between fast and slow moving averages.
 * Classic momentum strategy that works well in trending markets.
 *
 * TODO: Add multiple MA types (SMA, EMA, WMA, DEMA, TEMA)
 * TODO: Implement adaptive period selection based on volatility
 * TODO: Add volume confirmation and divergence detection
 */
export class MovingAverageCrossoverStrategy extends BaseTradingStrategy {
  private fastPeriod: number;
  private slowPeriod: number;
  private maType: 'SMA' | 'EMA';
  private volumeConfirmation: boolean;
  protected logger = createLogger('agent', 'MA-crossover-strategy');

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'MA_Crossover',
      'Moving Average Crossover momentum strategy using fast/slow MA signals',
      config,
      tradingConfig
    );

    // Extract strategy-specific parameters
    this.fastPeriod = config.parameters.fastPeriod || 10;
    this.slowPeriod = config.parameters.slowPeriod || 20;
    this.maType = config.parameters.maType || 'EMA';
    this.volumeConfirmation = config.parameters.volumeConfirmation || false;
  }

  /**
   * Analyze market data for MA crossover signals
   *
   * TODO: Add signal filtering based on trend strength
   * TODO: Implement multi-timeframe confirmation
   * TODO: Add adaptive thresholds based on market volatility
   */
  async analyze(marketData: MarketData[], _currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.slowPeriod + 5) {
      return signals; // Insufficient data
    }

    try {
      // Calculate moving averages
      const fastMA = this.calculateMA(marketData, this.fastPeriod);
      const slowMA = this.calculateMA(marketData, this.slowPeriod);

      if (fastMA.length < 3 || slowMA.length < 3) {
        return signals;
      }

      const currentData = marketData[marketData.length - 1]!;
      const currentFastMA = fastMA[fastMA.length - 1]!;
      const currentSlowMA = slowMA[slowMA.length - 1]!;
      const prevFastMA = fastMA[fastMA.length - 2]!;
      const prevSlowMA = slowMA[slowMA.length - 2]!;

      // Detect crossovers
      const bullishCrossover = prevFastMA <= prevSlowMA && currentFastMA > currentSlowMA;
      const bearishCrossover = prevFastMA >= prevSlowMA && currentFastMA < currentSlowMA;

      if (bullishCrossover) {
        const trendStrength = this.calculateTrendStrength(marketData, fastMA, slowMA);
        const volumeConfirmed = this.confirmWithVolume(marketData, 'BUY');

        if (!this.volumeConfirmation || volumeConfirmed) {
          const confidence = this.calculateConfidence(trendStrength, volumeConfirmed, currentData);
          const strength = confidence > 70 ? SignalStrength.STRONG : SignalStrength.MODERATE;

          signals.push(this.createSignal(
            currentData.symbol,
            SignalType.BUY,
            strength,
            confidence,
            currentData.close,
            `Bullish MA crossover: Fast MA (${currentFastMA.toFixed(2)}) crossed above Slow MA (${currentSlowMA.toFixed(2)}). Trend strength: ${trendStrength.toFixed(2)}`,
            {
              fastMA: currentFastMA,
              slowMA: currentSlowMA,
              trendStrength,
              volumeConfirmed,
              crossoverType: 'golden_cross'
            }
          ));
        }
      }

      if (bearishCrossover) {
        const trendStrength = this.calculateTrendStrength(marketData, fastMA, slowMA);
        const volumeConfirmed = this.confirmWithVolume(marketData, 'SELL');

        if (!this.volumeConfirmation || volumeConfirmed) {
          const confidence = this.calculateConfidence(trendStrength, volumeConfirmed, currentData);
          const strength = confidence > 70 ? SignalStrength.STRONG : SignalStrength.MODERATE;

          signals.push(this.createSignal(
            currentData.symbol,
            SignalType.SELL,
            strength,
            confidence,
            currentData.close,
            `Bearish MA crossover: Fast MA (${currentFastMA.toFixed(2)}) crossed below Slow MA (${currentSlowMA.toFixed(2)}). Trend strength: ${trendStrength.toFixed(2)}`,
            {
              fastMA: currentFastMA,
              slowMA: currentSlowMA,
              trendStrength,
              volumeConfirmed,
              crossoverType: 'death_cross'
            }
          ));
        }
      }

    } catch (error) {
      this.logger.error('analysis-error', 'Error in MA Crossover analysis', {
        error: error instanceof Error ? error.message : String(error),
        fastPeriod: this.fastPeriod,
        slowPeriod: this.slowPeriod,
        maType: this.maType,
        dataPoints: marketData.length
      });
    }

    return signals;
  }

  /**
   * Calculate moving average based on type
   *
   * TODO: Implement more MA types (DEMA, TEMA, Hull MA, etc.)
   */
  private calculateMA(data: MarketData[], period: number): number[] {
    if (this.maType === 'EMA') {
      return this.calculateEMA(data, period);
    } else {
      return this.calculateSMA(data, period);
    }
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(data: MarketData[], period: number): number[] {
    const sma: number[] = [];

    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j]!.close;
      }
      sma.push(sum / period);
    }

    return sma;
  }

  /**
   * Calculate Exponential Moving Average
   *
   * TODO: Add different EMA calculation methods
   */
  private calculateEMA(data: MarketData[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    if (data.length === 0) return ema;

    // First EMA value is SMA
    let sum = 0;
    for (let i = 0; i < Math.min(period, data.length); i++) {
      sum += data[i]!.close;
    }
    ema.push(sum / Math.min(period, data.length));

    // Calculate subsequent EMA values
    for (let i = period; i < data.length; i++) {
      const currentEMA = (data[i]!.close * multiplier) + (ema[ema.length - 1]! * (1 - multiplier));
      ema.push(currentEMA);
    }

    return ema;
  }

  /**
   * Calculate trend strength based on MA separation
   *
   * TODO: Add volatility-adjusted trend strength
   * TODO: Implement trend acceleration measurement
   */
  private calculateTrendStrength(data: MarketData[], fastMA: number[], slowMA: number[]): number {
    if (fastMA.length === 0 || slowMA.length === 0) return 0;

    const currentFast = fastMA[fastMA.length - 1]!;
    const currentSlow = slowMA[slowMA.length - 1]!;
    const currentPrice = data[data.length - 1]!.close;

    const separation = Math.abs(currentFast - currentSlow) / currentPrice;
    const pricePosition = Math.abs(currentPrice - currentSlow) / currentPrice;

    return Math.min(100, (separation + pricePosition) * 500);
  }

  /**
   * Confirm signal with volume analysis
   *
   * TODO: Implement sophisticated volume analysis
   * TODO: Add volume-price trend (VPT) confirmation
   */
  private confirmWithVolume(data: MarketData[], _direction: 'BUY' | 'SELL'): boolean {
    if (data.length < 5) return true; // Default to confirmed if insufficient data

    // Simple volume confirmation: current volume > average volume
    const recentData = data.slice(-5);
    const avgVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / recentData.length;
    const currentVolume = data[data.length - 1]!.volume;

    return currentVolume > avgVolume * 1.2; // 20% above average
  }

  /**
   * Calculate signal confidence
   *
   * TODO: Add more sophisticated confidence scoring
   * TODO: Implement machine learning-based confidence
   */
  private calculateConfidence(trendStrength: number, volumeConfirmed: boolean, currentData: MarketData): number {
    let confidence = 50; // Base confidence

    // Add trend strength component
    confidence += Math.min(30, trendStrength * 0.3);

    // Add volume confirmation
    if (volumeConfirmed) {
      confidence += 15;
    }

    // Add volatility consideration (lower volatility = higher confidence)
    const volatility = this.calculateVolatility(currentData);
    confidence += Math.max(-10, (0.02 - volatility) * 500);

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate price volatility
   *
   * TODO: Use proper volatility calculations (ATR, historical vol, etc.)
   */
  private calculateVolatility(data: MarketData): number {
    // Simplified volatility calculation
    const range = data.high - data.low;
    return range / data.close;
  }

  /**
   * Strategy-specific validation
   */
  protected validateStrategySpecific(): boolean {
    if (this.fastPeriod >= this.slowPeriod) {
      this.logger.error('validation-error', 'Fast period must be less than slow period', {
        fastPeriod: this.fastPeriod,
        slowPeriod: this.slowPeriod,
        strategy: this.name
      });
      return false;
    }

    if (this.fastPeriod < 1 || this.slowPeriod < 1) {
      this.logger.error('validation-error', 'MA periods must be positive', {
        fastPeriod: this.fastPeriod,
        slowPeriod: this.slowPeriod,
        strategy: this.name
      });
      return false;
    }

    return true;
  }
}