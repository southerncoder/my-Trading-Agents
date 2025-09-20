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
 * MACD (Moving Average Convergence Divergence) Strategy
 *
 * Uses MACD line crossovers, signal line crossovers, and histogram analysis
 * for momentum-based trading decisions.
 *
 * TODO: Add MACD divergence detection
 * TODO: Implement histogram pattern recognition
 * TODO: Add multi-timeframe MACD analysis
 */
export class MACDStrategy extends BaseTradingStrategy {
  private fastPeriod: number;
  private slowPeriod: number;
  private signalPeriod: number;
  private useHistogram: boolean;
  protected logger = createLogger('agent', 'MACD-strategy');

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'MACD',
      'MACD momentum strategy using signal line crossovers and histogram analysis',
      config,
      tradingConfig
    );

    this.fastPeriod = config.parameters.fastPeriod || 12;
    this.slowPeriod = config.parameters.slowPeriod || 26;
    this.signalPeriod = config.parameters.signalPeriod || 9;
    this.useHistogram = config.parameters.useHistogram !== false;
  }

  /**
   * Analyze market data for MACD signals
   *
   * TODO: Add MACD pattern recognition (bullish/bearish divergences)
   * TODO: Implement zero-line crossover analysis
   * TODO: Add histogram momentum analysis
   */
  async analyze(marketData: MarketData[], _currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.slowPeriod + this.signalPeriod + 5) {
      return signals;
    }

    try {
      const macdData = this.calculateMACD(marketData);

      if (macdData.macd.length < 3) {
        return signals;
      }

      const currentData = marketData[marketData.length - 1]!;
      const currentMACD = macdData.macd[macdData.macd.length - 1]!;
      const currentSignal = macdData.signal[macdData.signal.length - 1]!;
      const currentHistogram = macdData.histogram[macdData.histogram.length - 1]!;

      const prevMACD = macdData.macd[macdData.macd.length - 2]!;
      const prevSignal = macdData.signal[macdData.signal.length - 2]!;
      const _prevHistogram = macdData.histogram[macdData.histogram.length - 2]!;

      // Signal line crossover
      const bullishCrossover = prevMACD <= prevSignal && currentMACD > currentSignal;
      const bearishCrossover = prevMACD >= prevSignal && currentMACD < currentSignal;

      if (bullishCrossover) {
        const strength = this.calculateMACDStrength(macdData, 'BUY');
        const confidence = this.calculateMACDConfidence(macdData, currentData, 'BUY');

        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.BUY,
          strength,
          confidence,
          currentData.close,
          `MACD bullish crossover: MACD (${currentMACD.toFixed(4)}) crossed above Signal (${currentSignal.toFixed(4)}). Histogram: ${currentHistogram.toFixed(4)}`,
          {
            macd: currentMACD,
            signal: currentSignal,
            histogram: currentHistogram,
            crossoverType: 'bullish'
          }
        ));
      }

      if (bearishCrossover) {
        const strength = this.calculateMACDStrength(macdData, 'SELL');
        const confidence = this.calculateMACDConfidence(macdData, currentData, 'SELL');

        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.SELL,
          strength,
          confidence,
          currentData.close,
          `MACD bearish crossover: MACD (${currentMACD.toFixed(4)}) crossed below Signal (${currentSignal.toFixed(4)}). Histogram: ${currentHistogram.toFixed(4)}`,
          {
            macd: currentMACD,
            signal: currentSignal,
            histogram: currentHistogram,
            crossoverType: 'bearish'
          }
        ));
      }

      // TODO: Add zero-line crossover signals
      // TODO: Add histogram reversal signals
      // TODO: Add divergence detection

    } catch (error) {
      this.logger.error('analysis-error', 'Error in MACD analysis', {
        error: error instanceof Error ? error.message : String(error),
        fastPeriod: this.fastPeriod,
        slowPeriod: this.slowPeriod,
        signalPeriod: this.signalPeriod,
        dataPoints: marketData.length
      });
    }

    return signals;
  }

  /**
   * Calculate MACD components
   *
   * TODO: Add different EMA calculation methods
   * TODO: Optimize calculation performance
   */
  private calculateMACD(data: MarketData[]): { macd: number[], signal: number[], histogram: number[] } {
    // Calculate EMAs
    const fastEMA = this.calculateEMA(data, this.fastPeriod);
    const slowEMA = this.calculateEMA(data, this.slowPeriod);

    // Calculate MACD line
    const macd: number[] = [];
    const startIndex = Math.max(0, this.slowPeriod - this.fastPeriod);

    for (let i = startIndex; i < fastEMA.length; i++) {
      const slowIndex = i - startIndex;
      if (slowIndex < slowEMA.length) {
        macd.push(fastEMA[i]! - slowEMA[slowIndex]!);
      }
    }

    // Calculate Signal line (EMA of MACD)
    const signalLine = this.calculateEMAFromValues(macd, this.signalPeriod);

    // Calculate Histogram
    const histogram: number[] = [];
    for (let i = 0; i < Math.min(macd.length, signalLine.length); i++) {
      histogram.push(macd[i]! - signalLine[i]!);
    }

    return { macd, signal: signalLine, histogram };
  }

  /**
   * Calculate EMA from price data
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
   * Calculate EMA from array of values
   */
  private calculateEMAFromValues(values: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    if (values.length === 0) return ema;

    // First EMA value is SMA
    let sum = 0;
    for (let i = 0; i < Math.min(period, values.length); i++) {
      sum += values[i]!;
    }
    ema.push(sum / Math.min(period, values.length));

    // Calculate subsequent EMA values
    for (let i = period; i < values.length; i++) {
      const currentEMA = (values[i]! * multiplier) + (ema[ema.length - 1]! * (1 - multiplier));
      ema.push(currentEMA);
    }

    return ema;
  }

  /**
   * Calculate MACD signal strength
   *
   * TODO: Implement more sophisticated strength calculation
   */
  private calculateMACDStrength(macdData: { macd: number[], signal: number[], histogram: number[] }, _direction: 'BUY' | 'SELL'): SignalStrength {
    if (macdData.histogram.length < 2) return SignalStrength.MODERATE;

    const currentHist = macdData.histogram[macdData.histogram.length - 1]!;
    const prevHist = macdData.histogram[macdData.histogram.length - 2]!;

    const histogramMomentum = Math.abs(currentHist - prevHist);

    if (histogramMomentum > 0.1) return SignalStrength.VERY_STRONG;
    if (histogramMomentum > 0.05) return SignalStrength.STRONG;
    if (histogramMomentum > 0.02) return SignalStrength.MODERATE;
    if (histogramMomentum > 0.01) return SignalStrength.WEAK;
    return SignalStrength.VERY_WEAK;
  }

  /**
   * Calculate MACD confidence
   *
   * TODO: Add more factors to confidence calculation
   */
  private calculateMACDConfidence(macdData: { macd: number[], signal: number[], histogram: number[] }, currentData: MarketData, direction: 'BUY' | 'SELL'): number {
    let confidence = 50;

    // Add histogram momentum
    if (macdData.histogram.length >= 2) {
      const histChange = Math.abs(macdData.histogram[macdData.histogram.length - 1]! - macdData.histogram[macdData.histogram.length - 2]!);
      confidence += Math.min(25, histChange * 1000);
    }

    // Add zero-line consideration
    const currentMACD = macdData.macd[macdData.macd.length - 1]!;
    if ((direction === 'BUY' && currentMACD > 0) || (direction === 'SELL' && currentMACD < 0)) {
      confidence += 15;
    }

    return Math.max(0, Math.min(100, confidence));
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

    if (this.signalPeriod < 1) {
      this.logger.error('validation-error', 'Signal period must be positive', {
        signalPeriod: this.signalPeriod,
        strategy: this.name
      });
      return false;
    }

    return true;
  }
}