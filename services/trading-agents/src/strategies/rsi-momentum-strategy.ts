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
 * RSI (Relative Strength Index) Momentum Strategy
 *
 * Uses RSI overbought/oversold levels and RSI divergences for trading signals.
 *
 * TODO: Add RSI divergence detection
 * TODO: Implement RSI pattern recognition
 * TODO: Add multi-timeframe RSI analysis
 */
export class RSIMomentumStrategy extends BaseTradingStrategy {
  private rsiPeriod: number;
  private oversoldLevel: number;
  private overboughtLevel: number;
  private useDivergence: boolean;
  protected logger = createLogger('agent', 'RSI-momentum-strategy');

  constructor(config: StrategyConfig, tradingConfig: TradingAgentsConfig) {
    super(
      'RSI_Momentum',
      'RSI momentum strategy using overbought/oversold levels and divergence analysis',
      config,
      tradingConfig
    );

    this.rsiPeriod = config.parameters.rsiPeriod || 14;
    this.oversoldLevel = config.parameters.oversoldLevel || 30;
    this.overboughtLevel = config.parameters.overboughtLevel || 70;
    this.useDivergence = config.parameters.useDivergence !== false;
  }

  /**
   * Analyze market data for RSI signals
   *
   * TODO: Implement RSI divergence detection
   * TODO: Add RSI trend line break analysis
   * TODO: Add multi-timeframe RSI confirmation
   */
  async analyze(marketData: MarketData[], _currentPosition?: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    if (marketData.length < this.rsiPeriod + 5) {
      return signals;
    }

    try {
      const rsiValues = this.calculateRSI(marketData);

      if (rsiValues.length < 3) {
        return signals;
      }

      const currentData = marketData[marketData.length - 1]!;
      const currentRSI = rsiValues[rsiValues.length - 1]!;
      const prevRSI = rsiValues[rsiValues.length - 2]!;

      // Oversold to normal (potential buy)
      if (prevRSI <= this.oversoldLevel && currentRSI > this.oversoldLevel) {
        const strength = this.calculateRSIStrength(currentRSI, 'BUY');
        const confidence = this.calculateRSIConfidence(rsiValues, currentData, 'BUY');

        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.BUY,
          strength,
          confidence,
          currentData.close,
          `RSI oversold recovery: RSI moved from ${prevRSI.toFixed(2)} to ${currentRSI.toFixed(2)}, crossing above oversold level of ${this.oversoldLevel}`,
          {
            rsi: currentRSI,
            prevRSI,
            level: 'oversold_recovery',
            threshold: this.oversoldLevel
          }
        ));
      }

      // Overbought to normal (potential sell)
      if (prevRSI >= this.overboughtLevel && currentRSI < this.overboughtLevel) {
        const strength = this.calculateRSIStrength(currentRSI, 'SELL');
        const confidence = this.calculateRSIConfidence(rsiValues, currentData, 'SELL');

        signals.push(this.createSignal(
          currentData.symbol,
          SignalType.SELL,
          strength,
          confidence,
          currentData.close,
          `RSI overbought decline: RSI moved from ${prevRSI.toFixed(2)} to ${currentRSI.toFixed(2)}, crossing below overbought level of ${this.overboughtLevel}`,
          {
            rsi: currentRSI,
            prevRSI,
            level: 'overbought_decline',
            threshold: this.overboughtLevel
          }
        ));
      }

      // TODO: Add divergence detection
      // TODO: Add RSI failure swings

    } catch (error) {
      this.logger.error('analysis-error', 'Error in RSI analysis', {
        error: error instanceof Error ? error.message : String(error),
        rsiPeriod: this.rsiPeriod,
        oversoldLevel: this.oversoldLevel,
        overboughtLevel: this.overboughtLevel,
        dataPoints: marketData.length
      });
    }

    return signals;
  }

  /**
   * Calculate RSI values
   *
   * TODO: Add different RSI calculation methods (Cutler's RSI, etc.)
   */
  private calculateRSI(data: MarketData[]): number[] {
    const rsi: number[] = [];

    if (data.length < this.rsiPeriod + 1) return rsi;

    // Calculate price changes
    const changes: number[] = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i]!.close - data[i - 1]!.close);
    }

    // Calculate RSI
    for (let i = this.rsiPeriod - 1; i < changes.length; i++) {
      let avgGain = 0;
      let avgLoss = 0;

      // Calculate average gains and losses
      for (let j = i - this.rsiPeriod + 1; j <= i; j++) {
        const change = changes[j]!;
        if (change > 0) {
          avgGain += change;
        } else {
          avgLoss += Math.abs(change);
        }
      }

      avgGain /= this.rsiPeriod;
      avgLoss /= this.rsiPeriod;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push(rsiValue);
    }

    return rsi;
  }

  /**
   * Calculate RSI signal strength
   */
  private calculateRSIStrength(rsi: number, direction: 'BUY' | 'SELL'): SignalStrength {
    if (direction === 'BUY') {
      if (rsi < 20) return SignalStrength.VERY_STRONG;
      if (rsi < 25) return SignalStrength.STRONG;
      if (rsi < 30) return SignalStrength.MODERATE;
      if (rsi < 35) return SignalStrength.WEAK;
      return SignalStrength.VERY_WEAK;
    } else {
      if (rsi > 80) return SignalStrength.VERY_STRONG;
      if (rsi > 75) return SignalStrength.STRONG;
      if (rsi > 70) return SignalStrength.MODERATE;
      if (rsi > 65) return SignalStrength.WEAK;
      return SignalStrength.VERY_WEAK;
    }
  }

  /**
   * Calculate RSI confidence
   */
  private calculateRSIConfidence(rsiValues: number[], currentData: MarketData, direction: 'BUY' | 'SELL'): number {
    let confidence = 50;

    const currentRSI = rsiValues[rsiValues.length - 1]!;

    // Add RSI level confidence
    if (direction === 'BUY') {
      confidence += Math.max(0, (35 - currentRSI) * 1.5);
    } else {
      confidence += Math.max(0, (currentRSI - 65) * 1.5);
    }

    // Add momentum consideration
    if (rsiValues.length >= 3) {
      const rsiMomentum = Math.abs(currentRSI - rsiValues[rsiValues.length - 3]!);
      confidence += Math.min(15, rsiMomentum * 0.5);
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Strategy-specific validation
   */
  protected validateStrategySpecific(): boolean {
    if (this.oversoldLevel >= this.overboughtLevel) {
      this.logger.error('validation-error', 'Oversold level must be less than overbought level', {
        oversoldLevel: this.oversoldLevel,
        overboughtLevel: this.overboughtLevel,
        strategy: this.name
      });
      return false;
    }

    if (this.oversoldLevel < 0 || this.overboughtLevel > 100) {
      this.logger.error('validation-error', 'RSI levels must be between 0 and 100', {
        oversoldLevel: this.oversoldLevel,
        overboughtLevel: this.overboughtLevel,
        strategy: this.name
      });
      return false;
    }

    return true;
  }
}